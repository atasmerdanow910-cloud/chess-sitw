import { bearer, createTestApp, makeSeller, registerBuyer, signInOwner, Signed, TestContext } from './helpers';

/**
 * Roles and "someone else's data is not reachable" (IDOR), spec section 8.2.
 * Every protected route is called by every kind of user.
 */
describe('Roles and access to other people’s data (e2e)', () => {
  let ctx: TestContext;
  let owner: Signed;
  let buyer: Signed;
  let sellerA: Signed & { shopId: string };
  let sellerB: Signed & { shopId: string };

  beforeAll(async () => {
    ctx = await createTestApp();
    owner = await signInOwner(ctx);
    buyer = await registerBuyer(ctx, 'Buyer');
    sellerA = await makeSeller(ctx, owner, 'Shop A');
    sellerB = await makeSeller(ctx, owner, 'Shop B');
  });

  afterAll(async () => {
    await ctx.close();
  });

  // Every row has a body (possibly null): a missing third value would make Jest wait for a done() callback.
  const ownerRoutes: Array<['get' | 'post', string, object | null]> = [
    ['get', '/api/v1/admin/users', null],
    ['get', '/api/v1/admin/invites', null],
    ['post', '/api/v1/admin/invites', { sellerName: 'X', shopName: 'X' }],
    ['post', '/api/v1/admin/invites/00000000-0000-4000-8000-000000000000/revoke', null],
    ['post', '/api/v1/admin/users/00000000-0000-4000-8000-000000000000/block', null],
    ['post', '/api/v1/admin/users/00000000-0000-4000-8000-000000000000/unblock', null],
    ['post', '/api/v1/admin/users/00000000-0000-4000-8000-000000000000/reset-password', null],
  ];

  it.each(ownerRoutes)('%s %s: only the owner', async (method, path, body) => {
    await ctx.api()[method](path).send(body ?? {}).expect(401);
    for (const who of [buyer, sellerA]) {
      const res = await ctx.api()[method](path).set('Authorization', bearer(who)).send(body ?? {}).expect(403);
      expect(res.body.error).toBe('forbidden');
    }
    const asOwner = await ctx.api()[method](path).set('Authorization', bearer(owner)).send(body ?? {});
    expect([200, 201, 204, 404]).toContain(asOwner.status);
  });

  it('a seller sees only their own shop', async () => {
    const a = await ctx.api().get('/api/v1/seller/shop').set('Authorization', bearer(sellerA)).expect(200);
    const b = await ctx.api().get('/api/v1/seller/shop').set('Authorization', bearer(sellerB)).expect(200);
    expect(a.body).toMatchObject({ id: sellerA.shopId, name: 'Shop A', status: 'active' });
    expect(b.body).toMatchObject({ id: sellerB.shopId, name: 'Shop B' });
  });

  it('a seller cannot ask for another shop by id', async () => {
    const res = await ctx.api().get(`/api/v1/seller/shop?shopId=${sellerB.shopId}`).set('Authorization', bearer(sellerA)).expect(200);
    expect(res.body.id).toBe(sellerA.shopId);
    await ctx.api().get(`/api/v1/seller/shop/${sellerB.shopId}`).set('Authorization', bearer(sellerA)).expect(404);
  });

  it('buyers and the owner are not sellers', async () => {
    await ctx.api().get('/api/v1/seller/shop').expect(401);
    await ctx.api().get('/api/v1/seller/shop').set('Authorization', bearer(buyer)).expect(403);
    await ctx.api().get('/api/v1/seller/shop').set('Authorization', bearer(owner)).expect(403);
  });

  it('nobody can pass a shop or user id when redeeming an invite', async () => {
    const res = await ctx.api().post('/api/v1/invites/redeem').set('Authorization', bearer(buyer)).send({ code: 'AAAA-BBBB-CC', shopId: sellerA.shopId }).expect(400);
    expect(res.body.fields).toEqual(['shopId']);
  });

  it('a seller cannot redeem another invite to grab a second shop', async () => {
    await ctx.api().post('/api/v1/invites/redeem').set('Authorization', bearer(sellerA)).send({ code: 'AAAA-BBBB-CC' }).expect(403);
  });

  it('/me always answers about the caller only', async () => {
    const res = await ctx.api().get('/api/v1/me').set('Authorization', bearer(sellerA)).expect(200);
    expect(res.body.id).toBe(sellerA.user.id);
    expect(res.body.shop.id).toBe(sellerA.shopId);
  });

  it('the owner cannot be blocked or reset from the app', async () => {
    const res = await ctx.api().post(`/api/v1/admin/users/${owner.user.id}/block`).set('Authorization', bearer(owner)).expect(403);
    expect(res.body.error).toBe('cannot_change_owner');
  });

  it('broken ids are rejected before reaching the database', async () => {
    await ctx.api().post('/api/v1/admin/users/1%27%20OR%201=1/block').set('Authorization', bearer(owner)).expect(400);
  });
});
