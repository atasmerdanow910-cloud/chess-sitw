import { NestExpressApplication } from '@nestjs/platform-express';
import { drizzle } from 'drizzle-orm/node-postgres';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import pg from 'pg';
import sharp from 'sharp';
import request from 'supertest';

import { hashPassword } from '../src/auth/auth.service.js';
import { resetEnvCache } from '../src/config/env.js';
import * as schema from '../src/db/schema.js';
import { seedBase } from '../src/db/seed.js';

export const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://kerwen:kerwen_dev@127.0.0.1:5432/kerwen_test';

export function setTestEnv(): void {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: TEST_DB_URL,
    JWT_ACCESS_SECRET: 'test_access_secret_test_access_secret_123',
    MEDIA_SIGNING_SECRET: 'test_media_secret_test_media_secret_12345',
    MEDIA_DIR: mkdtempSync(path.join(tmpdir(), 'kerwen-media-')),
    RATE_LIMIT_DISABLED: 'true',
    LOGIN_MAX_ATTEMPTS: '5',
    GOOGLE_CLIENT_IDS: '',
  });
  resetEnvCache();
}

/** Fresh empty database with migrations + base seed. */
export async function resetDatabase(): Promise<void> {
  const pool = new pg.Pool({ connectionString: TEST_DB_URL, max: 1 });
  await pool.query('drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;');
  await pool.end();
  const { runMigrations } = await import('../src/db/migrate.js');
  await runMigrations(TEST_DB_URL);
  const seedPool = new pg.Pool({ connectionString: TEST_DB_URL, max: 1 });
  await seedBase(drizzle(seedPool, { schema }));
  await seedPool.end();
}

export interface TestContext {
  app: NestExpressApplication;
  http: ReturnType<typeof request>;
  db: ReturnType<typeof drizzle<typeof schema>>;
  pool: pg.Pool;
  close: () => Promise<void>;
}

export async function startApp(): Promise<TestContext> {
  setTestEnv();
  await resetDatabase();
  const { createApp } = await import('../src/main.js');
  const app = await createApp();
  await app.listen(0, '127.0.0.1');
  const pool = new pg.Pool({ connectionString: TEST_DB_URL, max: 2 });
  return {
    app,
    http: request(app.getHttpServer()),
    db: drizzle(pool, { schema }),
    pool,
    close: async () => {
      await app.close();
      await pool.end();
    },
  };
}

let phoneCounter = 10_000_000;
export function nextPhone(): string {
  phoneCounter += 1;
  return `+9936${String(phoneCounter).slice(1)}`;
}

export interface Session {
  token: string;
  refresh: string;
  phone: string;
  userId: string;
}

export async function registerBuyer(ctx: TestContext, name = 'Buyer Test'): Promise<Session> {
  const phone = nextPhone();
  const res = await ctx.http.post('/api/v1/auth/register').send({ name, phone, password: 'password123' }).expect(201);
  const me = await ctx.http.get('/api/v1/auth/me').set('Authorization', `Bearer ${res.body.accessToken}`).expect(200);
  return { token: res.body.accessToken, refresh: res.body.refreshToken, phone, userId: me.body.id };
}

export async function createOwner(ctx: TestContext): Promise<Session> {
  const phone = nextPhone();
  await ctx.db.insert(schema.users).values({
    name: 'Owner',
    phone,
    passwordHash: await hashPassword('owner-password-1'),
    role: 'owner',
  });
  const res = await ctx.http.post('/api/v1/auth/login').send({ phone, password: 'owner-password-1' }).expect(200);
  const me = await ctx.http.get('/api/v1/auth/me').set('Authorization', `Bearer ${res.body.accessToken}`).expect(200);
  return { token: res.body.accessToken, refresh: res.body.refreshToken, phone, userId: me.body.id };
}

/** Owner creates a shop, a new user claims the invite and becomes its seller. */
export async function createSeller(ctx: TestContext, owner: Session, shopName = 'Test Shop') {
  const created = await ctx.http
    .post('/api/v1/admin/shops')
    .set(auth(owner))
    .send({ shopName, sellerName: 'Seller', sellerPhone: nextPhone() })
    .expect(201);
  const seller = await registerBuyer(ctx, 'Seller Person');
  await ctx.http.post('/api/v1/auth/invite').set(auth(seller)).send({ code: created.body.invite.code }).expect(200);
  return { seller, shopId: created.body.shop.id as string, inviteCode: created.body.invite.code as string };
}

export function auth(s: Pick<Session, 'token'>): Record<string, string> {
  return { Authorization: `Bearer ${s.token}` };
}

export async function pngImage(): Promise<Buffer> {
  return sharp({ create: { width: 64, height: 64, channels: 3, background: '#22c55e' } }).png().toBuffer();
}

export async function uploadImage(ctx: TestContext, s: Session, purpose = 'product'): Promise<string> {
  const res = await ctx.http
    .post(`/api/v1/media?purpose=${purpose}`)
    .set(auth(s))
    .attach('file', await pngImage(), { filename: 'photo.png', contentType: 'image/png' })
    .expect(201);
  return res.body.id;
}

export async function createProduct(
  ctx: TestContext,
  seller: Session,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; variants: Array<{ id: string; value: string }> }> {
  const res = await ctx.http
    .post('/api/v1/seller/products')
    .set(auth(seller))
    .send({ title: 'Test product', priceTenge: 10_000, stock: 5, ...overrides })
    .expect(201);
  return res.body;
}
