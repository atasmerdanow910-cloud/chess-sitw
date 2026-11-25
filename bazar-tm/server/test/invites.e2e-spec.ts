import { bearer, createTestApp, registerBuyer, signInOwner, Signed, TestContext } from './helpers';

describe('Seller invites (e2e)', () => {
  let ctx: TestContext;
  let owner: Signed;

  beforeAll(async () => {
    ctx = await createTestApp();
    owner = await signInOwner(ctx);
  });

  afterAll(async () => {
    await ctx.close();
  });

  const createInvite = async (shopName = 'Merjen Moda', sellerPhone?: string) =>
    (
      await ctx
        .api()
        .post('/api/v1/admin/invites')
        .set('Authorization', bearer(owner))
        .send({ sellerName: 'Merjen', shopName, ...(sellerPhone && { sellerPhone }) })
        .expect(201)
    ).body as { code: string; invite: { id: string; shopId: string; status: string } };

  it('shows the code once, in an easy-to-dictate form', async () => {
    const { code, invite } = await createInvite('Shop 1', '+993 62 112233');
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{2}$/);
    expect(invite).toMatchObject({ status: 'active', shopName: 'Shop 1', sellerPhone: '+99362112233' });
    const list = await ctx.api().get('/api/v1/admin/invites').set('Authorization', bearer(owner)).expect(200);
    expect(JSON.stringify(list.body)).not.toContain(code.replace(/-/g, ''));
    expect(JSON.stringify(list.body)).not.toContain(code);
    const stored = await ctx.db.pool.query('SELECT code_hash FROM invites WHERE id = $1', [invite.id]);
    expect(stored.rows[0].code_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('turns a buyer into a seller with an open shop and a free month', async () => {
    const { code, invite } = await createInvite('Öý Dünýä');
    const buyer = await registerBuyer(ctx);
    // Typed in lower case and without dashes: still accepted.
    const res = await ctx.api().post('/api/v1/invites/redeem').set('Authorization', bearer(buyer)).send({ code: code.toLowerCase().replace(/-/g, ' ') }).expect(200);
    expect(res.body).toMatchObject({ role: 'seller', shop: { id: invite.shopId, name: 'Öý Dünýä', status: 'active' } });
    const daysLeft = (new Date(res.body.shop.subscriptionUntil).getTime() - Date.now()) / 86_400_000;
    expect(daysLeft).toBeGreaterThan(29.9);
    expect(daysLeft).toBeLessThanOrEqual(30);
    // The same access token works for the seller panel at once (role is read from the database).
    await ctx.api().get('/api/v1/seller/shop').set('Authorization', bearer(buyer)).expect(200);
  });

  it('works only once', async () => {
    const { code } = await createInvite();
    const first = await registerBuyer(ctx);
    const second = await registerBuyer(ctx);
    await ctx.api().post('/api/v1/invites/redeem').set('Authorization', bearer(first)).send({ code }).expect(200);
    const res = await ctx.api().post('/api/v1/invites/redeem').set('Authorization', bearer(second)).send({ code }).expect(400);
    expect(res.body.error).toBe('invite_invalid');
  });

  it('does not work after the owner revokes it', async () => {
    const { code, invite } = await createInvite();
    await ctx.api().post(`/api/v1/admin/invites/${invite.id}/revoke`).set('Authorization', bearer(owner)).expect(204);
    const buyer = await registerBuyer(ctx);
    await ctx.api().post('/api/v1/invites/redeem').set('Authorization', bearer(buyer)).send({ code }).expect(400);
    const list = await ctx.api().get('/api/v1/admin/invites').set('Authorization', bearer(owner)).expect(200);
    expect(list.body.items.find((i: { id: string }) => i.id === invite.id).status).toBe('revoked');
    // Revoking twice is "not found": nothing left to revoke.
    await ctx.api().post(`/api/v1/admin/invites/${invite.id}/revoke`).set('Authorization', bearer(owner)).expect(404);
  });

  it('does not work after 7 days', async () => {
    const { code, invite } = await createInvite();
    await ctx.db.pool.query("UPDATE invites SET expires_at = now() - interval '1 minute' WHERE id = $1", [invite.id]);
    const buyer = await registerBuyer(ctx);
    await ctx.api().post('/api/v1/invites/redeem').set('Authorization', bearer(buyer)).send({ code }).expect(400);
  });

  it('stops guessing after 10 tries an hour', async () => {
    const buyer = await registerBuyer(ctx);
    for (let i = 0; i < 10; i++) {
      await ctx.api().post('/api/v1/invites/redeem').set('Authorization', bearer(buyer)).send({ code: `ABCD-EFGH-${i}${i}` }).expect(400);
    }
    const res = await ctx.api().post('/api/v1/invites/redeem').set('Authorization', bearer(buyer)).send({ code: 'ABCD-EFGH-JK' }).expect(429);
    expect(res.body.error).toBe('too_many_requests');
  });

  it('writes the owner’s actions to the audit log without personal data', async () => {
    const rows = await ctx.db.pool.query("SELECT action, meta::text FROM audit_log WHERE action LIKE 'invite.%'");
    expect(rows.rows.map((r) => r.action)).toEqual(expect.arrayContaining(['invite.create', 'invite.redeem', 'invite.revoke']));
    for (const row of rows.rows) expect(row.meta).not.toMatch(/\+993|Merjen/);
  });
});
