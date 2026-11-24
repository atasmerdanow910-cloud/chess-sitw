import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { auth, createOwner, createProduct, createSeller, registerBuyer, Session, startApp, TestContext } from './helpers.js';

describe('orders', () => {
  let ctx: TestContext;
  let seller: Session;
  let shopId: string;
  let buyer: Session;

  before(async () => {
    ctx = await startApp();
    const owner = await createOwner(ctx);
    ({ seller, shopId } = await createSeller(ctx, owner));
    buyer = await registerBuyer(ctx);
  });
  after(async () => ctx.close());

  const order = (s: Session, body: Record<string, unknown>) =>
    ctx.http.post('/api/v1/orders').set(auth(s)).send({ shopId, contactPhone: '+99365111111', ...body });

  it('uses server prices and reserves stock', async () => {
    const product = await createProduct(ctx, seller, {
      priceTenge: 10_000,
      stock: 5,
      variants: [{ kind: 'color', value: 'Red', priceDeltaTenge: 500 }],
    });
    const variantId = product.variants[0].id;
    const res = await order(buyer, { items: [{ productId: product.id, variantIds: [variantId], qty: 2 }] }).expect(201);
    assert.equal(res.body.totalTenge, 21_000);
    assert.equal(res.body.status, 'pending');
    assert.equal(res.body.items[0].variantLabel, 'Red');
    const after = await ctx.http.get(`/api/v1/products/${product.id}`).expect(200);
    assert.equal(after.body.stock, 3);
  });

  it('rejects a price sent by the phone', async () => {
    const product = await createProduct(ctx, seller);
    await order(buyer, { items: [{ productId: product.id, qty: 1, priceTenge: 1 }] }).expect(400);
  });

  it('refuses more than in stock', async () => {
    const product = await createProduct(ctx, seller, { stock: 1 });
    const res = await order(buyer, { items: [{ productId: product.id, qty: 2 }] }).expect(409);
    assert.equal(res.body.code, 'out_of_stock');
  });

  it('one shop per order: products of another shop are refused', async () => {
    const owner = await createOwner(ctx);
    const { seller: other } = await createSeller(ctx, owner, 'Other shop');
    const foreign = await createProduct(ctx, other);
    const res = await order(buyer, { items: [{ productId: foreign.id, qty: 1 }] }).expect(400);
    assert.equal(res.body.code, 'product_unavailable');
  });

  it('a seller cannot order from their own shop', async () => {
    const product = await createProduct(ctx, seller);
    const res = await order(seller, { items: [{ productId: product.id, qty: 1 }] }).expect(400);
    assert.equal(res.body.code, 'own_shop');
  });

  it('IDOR: other buyers and other sellers cannot see an order', async () => {
    const product = await createProduct(ctx, seller);
    const res = await order(buyer, { items: [{ productId: product.id, qty: 1 }] }).expect(201);
    const stranger = await registerBuyer(ctx);
    await ctx.http.get(`/api/v1/orders/${res.body.id}`).set(auth(stranger)).expect(404);
    await ctx.http.post(`/api/v1/orders/${res.body.id}/cancel`).set(auth(stranger)).expect(404);
    const owner = await createOwner(ctx);
    const { seller: otherSeller } = await createSeller(ctx, owner, 'Nosy shop');
    await ctx.http.get(`/api/v1/orders/${res.body.id}`).set(auth(otherSeller)).expect(404);
    await ctx.http
      .patch(`/api/v1/seller/orders/${res.body.id}/status`)
      .set(auth(otherSeller))
      .send({ status: 'confirmed' })
      .expect(404);
    const sellerView = await ctx.http.get(`/api/v1/orders/${res.body.id}`).set(auth(seller)).expect(200);
    assert.equal(sellerView.body.buyer.name, 'Buyer Test');
    assert.equal(sellerView.body.contactPhone, '+99365111111');
  });

  it('status flow, notifications, review and rating', async () => {
    const product = await createProduct(ctx, seller);
    const created = await order(buyer, { items: [{ productId: product.id, qty: 1 }] }).expect(201);
    const id = created.body.id;
    await ctx.http.patch(`/api/v1/seller/orders/${id}/status`).set(auth(seller)).send({ status: 'delivered' }).expect(409);
    await ctx.http.post(`/api/v1/orders/${id}/review`).set(auth(buyer)).send({ rating: 5 }).expect(409);
    for (const status of ['confirmed', 'shipping', 'delivered']) {
      await ctx.http.patch(`/api/v1/seller/orders/${id}/status`).set(auth(seller)).send({ status }).expect(200);
    }
    await ctx.http.post(`/api/v1/orders/${id}/cancel`).set(auth(buyer)).expect(409);
    await ctx.http.post(`/api/v1/orders/${id}/review`).set(auth(buyer)).send({ rating: 4, text: 'Gowy' }).expect(201);
    await ctx.http.post(`/api/v1/orders/${id}/review`).set(auth(buyer)).send({ rating: 1 }).expect(409);
    const shop = await ctx.http.get(`/api/v1/shops/${shopId}`).expect(200);
    assert.equal(shop.body.rating, 4);
    assert.equal(shop.body.reviewsCount, 1);
    await new Promise((r) => setTimeout(r, 100));
    const notes = await ctx.http.get('/api/v1/me/notifications').set(auth(seller)).expect(200);
    assert.ok(notes.body.items.some((n: { type: string }) => n.type === 'order.new'));
  });

  it('buyer cancel puts items back in stock', async () => {
    const product = await createProduct(ctx, seller, { stock: 3 });
    const created = await order(buyer, { items: [{ productId: product.id, qty: 3 }] }).expect(201);
    assert.equal((await ctx.http.get(`/api/v1/products/${product.id}`)).body.stock, 0);
    await ctx.http.post(`/api/v1/orders/${created.body.id}/cancel`).set(auth(buyer)).expect(200);
    assert.equal((await ctx.http.get(`/api/v1/products/${product.id}`)).body.stock, 3);
  });

  it('two buyers racing for the last item: only one wins', async () => {
    const product = await createProduct(ctx, seller, { stock: 1 });
    const other = await registerBuyer(ctx);
    const results = await Promise.all([
      order(buyer, { items: [{ productId: product.id, qty: 1 }] }),
      order(other, { items: [{ productId: product.id, qty: 1 }] }),
    ]);
    const statuses = results.map((r) => r.status).sort();
    assert.deepEqual(statuses, [201, 409]);
  });
});
