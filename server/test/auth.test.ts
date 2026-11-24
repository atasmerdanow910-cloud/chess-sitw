import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { resetEnvCache } from '../src/config/env.js';
import { auth, createOwner, createSeller, nextPhone, registerBuyer, startApp, TestContext } from './helpers.js';

describe('auth', () => {
  let ctx: TestContext;
  before(async () => {
    ctx = await startApp();
  });
  after(async () => ctx.close());

  it('registers, normalizes the phone and logs in', async () => {
    const res = await ctx.http
      .post('/api/v1/auth/register')
      .send({ name: 'Aýna', phone: '8 65 777777', password: 'password123', locale: 'tk' })
      .expect(201);
    assert.ok(res.body.accessToken && res.body.refreshToken);
    const me = await ctx.http.get('/api/v1/auth/me').set(auth({ token: res.body.accessToken })).expect(200);
    assert.equal(me.body.phone, '+99365777777');
    assert.equal(me.body.role, 'buyer');
    assert.equal(me.body.locale, 'tk');
    assert.equal(me.body.passwordHash, undefined, 'password hash must never be returned');
    await ctx.http.post('/api/v1/auth/login').send({ phone: '+993 65 77 77 77', password: 'password123' }).expect(200);
  });

  it('rejects a duplicate phone, bad phone, short password and unknown fields', async () => {
    const phone = nextPhone();
    await ctx.http.post('/api/v1/auth/register').send({ name: 'A', phone, password: 'password123' }).expect(201);
    const dup = await ctx.http.post('/api/v1/auth/register').send({ name: 'B', phone, password: 'password123' }).expect(409);
    assert.equal(dup.body.code, 'phone_taken');
    const bad = await ctx.http.post('/api/v1/auth/register').send({ name: 'C', phone: '123456789', password: 'password123' }).expect(400);
    assert.equal(bad.body.code, 'invalid_phone');
    await ctx.http.post('/api/v1/auth/register').send({ name: 'D', phone: nextPhone(), password: 'short' }).expect(400);
    // Nobody can make themselves an owner by sending "role".
    await ctx.http
      .post('/api/v1/auth/register')
      .send({ name: 'E', phone: nextPhone(), password: 'password123', role: 'owner' })
      .expect(400);
  });

  it('locks the account after 5 wrong passwords', async () => {
    const buyer = await registerBuyer(ctx);
    for (let i = 0; i < 5; i++) {
      await ctx.http.post('/api/v1/auth/login').send({ phone: buyer.phone, password: 'wrong-pass' }).expect(401);
    }
    const locked = await ctx.http.post('/api/v1/auth/login').send({ phone: buyer.phone, password: 'password123' }).expect(429);
    assert.equal(locked.body.code, 'account_locked');
  });

  it('does not reveal whether a phone exists', async () => {
    const res = await ctx.http.post('/api/v1/auth/login').send({ phone: nextPhone(), password: 'whatever1' }).expect(401);
    assert.equal(res.body.code, 'invalid_credentials');
  });

  it('rotates refresh tokens and kills the session when an old one is reused', async () => {
    const buyer = await registerBuyer(ctx);
    const first = await ctx.http.post('/api/v1/auth/refresh').send({ refreshToken: buyer.refresh }).expect(200);
    assert.notEqual(first.body.refreshToken, buyer.refresh);
    const reused = await ctx.http.post('/api/v1/auth/refresh').send({ refreshToken: buyer.refresh }).expect(401);
    assert.equal(reused.body.code, 'refresh_token_reused');
    // The new token is now dead too: the whole session was revoked.
    await ctx.http.post('/api/v1/auth/refresh').send({ refreshToken: first.body.refreshToken }).expect(401);
    await ctx.http.get('/api/v1/auth/me').set(auth({ token: first.body.accessToken })).expect(401);
  });

  it('logout and logout-all revoke access', async () => {
    const buyer = await registerBuyer(ctx);
    await ctx.http.post('/api/v1/auth/logout').send({ refreshToken: buyer.refresh }).expect(204);
    await ctx.http.get('/api/v1/auth/me').set(auth(buyer)).expect(401);

    const other = await registerBuyer(ctx);
    const second = await ctx.http.post('/api/v1/auth/login').send({ phone: other.phone, password: 'password123' }).expect(200);
    await ctx.http.post('/api/v1/auth/logout-all').set(auth(other)).expect(204);
    await ctx.http.get('/api/v1/auth/me').set(auth({ token: second.body.accessToken })).expect(401);
  });

  it('rejects forged or garbage tokens', async () => {
    await ctx.http.get('/api/v1/auth/me').set({ Authorization: 'Bearer abc.def.ghi' }).expect(401);
    await ctx.http.get('/api/v1/auth/me').expect(401);
  });

  it('enforces roles: buyers cannot use seller or owner areas', async () => {
    const buyer = await registerBuyer(ctx);
    await ctx.http.get('/api/v1/seller/shop').set(auth(buyer)).expect(403);
    await ctx.http.get('/api/v1/admin/stats').set(auth(buyer)).expect(403);
    const owner = await createOwner(ctx);
    const { seller } = await createSeller(ctx, owner);
    await ctx.http.get('/api/v1/admin/stats').set(auth(seller)).expect(403);
    await ctx.http.get('/api/v1/admin/stats').set(auth(owner)).expect(200);
  });

  it('invite codes work once and only for buyers', async () => {
    const owner = await createOwner(ctx);
    const { seller, inviteCode } = await createSeller(ctx, owner);
    const me = await ctx.http.get('/api/v1/auth/me').set(auth(seller)).expect(200);
    assert.equal(me.body.role, 'seller');
    assert.ok(me.body.shopId);
    const other = await registerBuyer(ctx);
    const reused = await ctx.http.post('/api/v1/auth/invite').set(auth(other)).send({ code: inviteCode }).expect(400);
    assert.equal(reused.body.code, 'invite_invalid');
    await ctx.http.post('/api/v1/auth/invite').set(auth(other)).send({ code: 'WRONGCODE1' }).expect(400);
  });

  it('blocked users are cut off immediately', async () => {
    const owner = await createOwner(ctx);
    const buyer = await registerBuyer(ctx);
    await ctx.http.patch(`/api/v1/admin/users/${buyer.userId}`).set(auth(owner)).send({ isBlocked: true }).expect(200);
    await ctx.http.get('/api/v1/auth/me').set(auth(buyer)).expect(401);
    const login = await ctx.http.post('/api/v1/auth/login').send({ phone: buyer.phone, password: 'password123' }).expect(403);
    assert.equal(login.body.code, 'user_blocked');
  });

  it('Google login answers clearly when it is not configured', async () => {
    const res = await ctx.http.post('/api/v1/auth/google').send({ idToken: 'x'.repeat(50) }).expect(400);
    assert.equal(res.body.code, 'google_disabled');
  });

  it('rate-limits login attempts', async () => {
    process.env.RATE_LIMIT_DISABLED = 'false';
    resetEnvCache();
    try {
      const statuses: number[] = [];
      for (let i = 0; i < 12; i++) {
        const res = await ctx.http.post('/api/v1/auth/login').send({ phone: nextPhone(), password: 'whatever1' });
        statuses.push(res.status);
      }
      assert.ok(statuses.includes(429), `expected a 429, got ${statuses.join(',')}`);
    } finally {
      process.env.RATE_LIMIT_DISABLED = 'true';
      resetEnvCache();
    }
  });
});
