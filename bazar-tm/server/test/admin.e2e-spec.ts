import { bearer, clientIp, createTestApp, GOOD_PASSWORD, registerBuyer, signInOwner, Signed, TestContext } from './helpers';

describe('Owner: users (e2e)', () => {
  let ctx: TestContext;
  let owner: Signed;

  beforeAll(async () => {
    ctx = await createTestApp();
    owner = await signInOwner(ctx);
  });

  afterAll(async () => {
    await ctx.close();
  });

  const login = (phone: string, password = GOOD_PASSWORD) => ctx.api().post('/api/v1/auth/login').set('X-Forwarded-For', clientIp()).send({ phone, password });

  it('finds users by name or by part of the phone', async () => {
    const jeren = await registerBuyer(ctx, 'Jeren Annaýewa');
    const byName = await ctx.api().get('/api/v1/admin/users?search=annaý').set('Authorization', bearer(owner)).expect(200);
    expect(byName.body.items.map((u: { id: string }) => u.id)).toEqual([jeren.user.id]);
    const digits = jeren.phone.replace(/\D/g, '').slice(-6);
    const byPhone = await ctx.api().get(`/api/v1/admin/users?search=${digits}`).set('Authorization', bearer(owner)).expect(200);
    expect(byPhone.body.items[0].id).toBe(jeren.user.id);
    expect(byPhone.body.items[0]).not.toHaveProperty('passwordHash');
  });

  it('treats % and _ in the search as plain characters', async () => {
    await registerBuyer(ctx, 'Someone');
    const res = await ctx.api().get('/api/v1/admin/users?search=%25').set('Authorization', bearer(owner)).expect(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it('pages through the list', async () => {
    const res = await ctx.api().get('/api/v1/admin/users?limit=1&offset=0&role=buyer').set('Authorization', bearer(owner)).expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.total).toBeGreaterThan(1);
    await ctx.api().get('/api/v1/admin/users?limit=1000').set('Authorization', bearer(owner)).expect(400);
  });

  it('blocking signs the user out everywhere and stops sign-in until unblocked', async () => {
    const user = await registerBuyer(ctx);
    await ctx.api().post(`/api/v1/admin/users/${user.user.id}/block`).set('Authorization', bearer(owner)).expect(204);
    await ctx.api().get('/api/v1/me').set('Authorization', bearer(user)).expect(401);
    await ctx.api().post('/api/v1/auth/refresh').send({ refreshToken: user.tokens.refreshToken }).expect(401);
    expect((await login(user.phone)).body.error).toBe('account_blocked');
    await ctx.api().post(`/api/v1/admin/users/${user.user.id}/unblock`).set('Authorization', bearer(owner)).expect(204);
    expect((await login(user.phone)).status).toBe(200);
  });

  it('resets a forgotten password: temporary password, then the user must change it', async () => {
    const user = await registerBuyer(ctx);
    const reset = await ctx.api().post(`/api/v1/admin/users/${user.user.id}/reset-password`).set('Authorization', bearer(owner)).expect(200);
    const temporary: string = reset.body.temporaryPassword;
    expect(temporary).toMatch(/^[a-z2-9]{10}$/);
    await ctx.api().get('/api/v1/me').set('Authorization', bearer(user)).expect(401);
    expect((await login(user.phone)).status).toBe(401);

    const signed = await login(user.phone, temporary);
    expect(signed.status).toBe(200);
    expect(signed.body.user.mustChangePassword).toBe(true);
    const token = `Bearer ${signed.body.tokens.accessToken}`;
    await ctx.api().post('/api/v1/me/password').set('Authorization', token).send({ currentPassword: temporary, newPassword: 'Fresh-pass-2026' }).expect(204);
    const me = await ctx.api().get('/api/v1/me').set('Authorization', token).expect(200);
    expect(me.body.mustChangePassword).toBe(false);
  });

  it('audits every owner action', async () => {
    const rows = await ctx.db.pool.query("SELECT DISTINCT action FROM audit_log WHERE action LIKE 'user.%' AND actor_user_id = $1", [owner.user.id]);
    expect(rows.rows.map((r) => r.action).sort()).toEqual(['user.block', 'user.reset_password', 'user.unblock']);
  });

  it('cannot reset or block a missing user', async () => {
    await ctx.api().post('/api/v1/admin/users/00000000-0000-4000-8000-000000000000/block').set('Authorization', bearer(owner)).expect(404);
  });
});
