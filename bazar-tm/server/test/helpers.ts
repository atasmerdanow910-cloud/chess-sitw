import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { hash } from '@node-rs/argon2';
import { createLocalJWKSet, exportJWK, generateKeyPair, JWK, SignJWT } from 'jose';
import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { JoseGoogleVerifier } from '../src/auth/google-verifier';
import { MemoryRateLimitStore } from '../src/common/rate-limit';
import { AppConfig, loadConfig } from '../src/config/env';
import { runMigrations } from '../src/db/migrate';

/**
 * Every test file gets its own fresh PostgreSQL database (created from TEST_DATABASE_URL and dropped
 * afterwards), so tests never share data and never touch a real database.
 */
export interface TestDatabase {
  url: string;
  pool: Pool;
  drop(): Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const adminUrl = process.env.TEST_DATABASE_URL;
  if (!adminUrl) {
    throw new Error('TEST_DATABASE_URL is not set, e.g. postgres://postgres@127.0.0.1:5432/postgres (see server/README in bazar-tm/README.md)');
  }
  const name = `bazar_test_${randomBytes(6).toString('hex')}`;
  const admin = new Pool({ connectionString: adminUrl, max: 1 });
  await admin.query(`CREATE DATABASE ${name}`);
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const pool = new Pool({ connectionString: url.toString(), max: 4 });
  pool.on('error', () => undefined);
  await runMigrations(pool);
  return {
    url: url.toString(),
    pool,
    async drop() {
      await pool.end();
      await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      await admin.end();
    },
  };
}

/** Plays Google's role in tests: our own RSA key signs ID tokens that the server checks like real ones. */
export class FakeGoogle {
  static readonly clientId = 'bazar-test-client.apps.googleusercontent.com';

  private constructor(
    private readonly privateKey: Awaited<ReturnType<typeof generateKeyPair>>['privateKey'],
    readonly jwk: JWK,
  ) {}

  static async create(): Promise<FakeGoogle> {
    const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });
    const jwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };
    return new FakeGoogle(privateKey, jwk);
  }

  verifier(clientIds: string[]): JoseGoogleVerifier {
    return new JoseGoogleVerifier(clientIds, createLocalJWKSet({ keys: [this.jwk] }));
  }

  token(claims: { sub: string; email?: string; email_verified?: boolean; name?: string }, opts: { aud?: string; iss?: string; expiresIn?: string } = {}): Promise<string> {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer(opts.iss ?? 'https://accounts.google.com')
      .setAudience(opts.aud ?? FakeGoogle.clientId)
      .setIssuedAt()
      .setExpirationTime(opts.expiresIn ?? '10m')
      .sign(this.privateKey);
  }
}

export interface TestContext {
  app: INestApplication;
  api: () => ReturnType<typeof request>;
  db: TestDatabase;
  config: AppConfig;
  google: FakeGoogle;
  close(): Promise<void>;
}

export async function createTestApp(env: Record<string, string> = {}): Promise<TestContext> {
  const db = await createTestDatabase();
  const google = await FakeGoogle.create();
  const config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: db.url,
    // A fresh random signing key per run: no test secret is stored in git.
    JWT_SECRET: randomBytes(32).toString('base64url'),
    GOOGLE_CLIENT_IDS: FakeGoogle.clientId,
    CORS_ORIGINS: 'https://bazar.example.com',
    ...env,
  });
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.forRoot(config, { googleVerifier: google.verifier(config.auth.googleClientIds), rateLimitStore: new MemoryRateLimitStore() })],
  }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app, config);
  await app.init();
  return {
    app,
    api: () => request(app.getHttpServer()),
    db,
    config,
    google,
    async close() {
      await app.close();
      await db.drop();
    },
  };
}

let phoneCounter = 0;
/** A unique valid Turkmen number for each call. */
export function nextPhone(): string {
  phoneCounter += 1;
  return `+993 65 ${String(100000 + phoneCounter).slice(-6)}`;
}

export const GOOD_PASSWORD = 'Bazar-test-2026';

export interface Signed {
  user: { id: string; role: string; [key: string]: unknown };
  tokens: { accessToken: string; refreshToken: string; [key: string]: unknown };
  phone: string;
}

/**
 * A different client address for each call. nginx passes the real address in X-Forwarded-For,
 * and per-address limits would otherwise count every test request as one phone.
 */
export function clientIp(): string {
  return `10.${randomBytes(1)[0]}.${randomBytes(1)[0]}.${1 + (randomBytes(1)[0] % 250)}`;
}

export async function registerBuyer(ctx: TestContext, name = 'Aýna', phone = nextPhone(), password = GOOD_PASSWORD): Promise<Signed> {
  const res = await ctx.api().post('/api/v1/auth/register').set('X-Forwarded-For', clientIp()).send({ name, phone, password }).expect(201);
  return { ...res.body, phone } as Signed;
}

/** Owners are created on the server console (npm run owner:create); tests insert one the same way. */
export async function signInOwner(ctx: TestContext): Promise<Signed> {
  const phone = nextPhone();
  const stored = `+993${phone.replace(/\D/g, '').slice(3)}`;
  await ctx.db.pool.query("INSERT INTO users (name, phone, password_hash, role) VALUES ('Owner', $1, $2, 'owner')", [stored, await hash(GOOD_PASSWORD)]);
  const res = await ctx.api().post('/api/v1/auth/login').set('X-Forwarded-For', clientIp()).send({ phone, password: GOOD_PASSWORD }).expect(200);
  return { ...res.body, phone } as Signed;
}

/** Owner creates an invite and the buyer redeems it: returns the new seller with fresh tokens. */
export async function makeSeller(ctx: TestContext, owner: Signed, shopName = 'Ak Ýol Trade'): Promise<Signed & { shopId: string }> {
  const buyer = await registerBuyer(ctx, 'Seller');
  const invite = await ctx
    .api()
    .post('/api/v1/admin/invites')
    .set('Authorization', `Bearer ${owner.tokens.accessToken}`)
    .send({ sellerName: 'Seller', shopName })
    .expect(201);
  const redeemed = await ctx
    .api()
    .post('/api/v1/invites/redeem')
    .set('Authorization', `Bearer ${buyer.tokens.accessToken}`)
    .send({ code: invite.body.code })
    .expect(200);
  return { ...buyer, user: redeemed.body, shopId: redeemed.body.shop.id };
}

export const bearer = (s: Signed) => `Bearer ${s.tokens.accessToken}`;
