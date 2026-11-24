import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { eq } from 'drizzle-orm';

import { shops } from '../src/db/schema.js';
import {
  auth,
  createOwner,
  createProduct,
  createSeller,
  registerBuyer,
  Session,
  startApp,
  TestContext,
  uploadImage,
} from './helpers.js';

describe('seller panel, catalog and media', () => {
  let ctx: TestContext;
  let owner: Session;
  let sellerA: Session;
  let sellerB: Session;
  let shopA: string;

  before(async () => {
    ctx = await startApp();
    owner = await createOwner(ctx);
    ({ seller: sellerA, shopId: shopA } = await createSeller(ctx, owner, 'Shop A'));
    ({ seller: sellerB } = await createSeller(ctx, owner, 'Shop B'));
  });
  after(async () => ctx.close());

  it('seller creates a product with photo and variants; buyers see it', async () => {
    const mediaId = await uploadImage(ctx, sellerA);
    const product = await createProduct(ctx, sellerA, {
      title: 'Наушники',
      mediaIds: [mediaId],
      variants: [
        { kind: 'color', value: 'Белый' },
        { kind: 'color', value: 'Чёрный', priceDeltaTenge: 500 },
      ],
    });
    const list = await ctx.http.get('/api/v1/products?q=Наушн').expect(200);
    assert.equal(list.body.length, 1);
    assert.ok(list.body[0].imageUrl.startsWith('/api/v1/media/'));
    const details = await ctx.http.get(`/api/v1/products/${product.id}`).expect(200);
    assert.equal(details.body.variants.length, 2);
    assert.equal(details.body.shop.name, 'Shop A');
    const home = await ctx.http.get('/api/v1/home').expect(200);
    assert.ok(home.body.newProducts.some((p: { id: string }) => p.id === product.id));
    assert.ok(home.body.categories.length >= 8);
  });

  it('IDOR: a seller cannot see or change another shop\'s product', async () => {
    const product = await createProduct(ctx, sellerA, { title: 'Private stuff' });
    await ctx.http.get(`/api/v1/seller/products/${product.id}`).set(auth(sellerB)).expect(404);
    await ctx.http.patch(`/api/v1/seller/products/${product.id}`).set(auth(sellerB)).send({ priceTenge: 1 }).expect(404);
    await ctx.http.delete(`/api/v1/seller/products/${product.id}`).set(auth(sellerB)).expect(404);
    const own = await ctx.http.get('/api/v1/seller/products').set(auth(sellerB)).expect(200);
    assert.ok(own.body.every((p: { shop: { id: string } }) => p.shop.id !== shopA));
  });

  it('a seller cannot attach files uploaded by someone else', async () => {
    const foreignMedia = await uploadImage(ctx, sellerB);
    const res = await ctx.http
      .post('/api/v1/seller/products')
      .set(auth(sellerA))
      .send({ title: 'Steal photo', priceTenge: 100, stock: 1, mediaIds: [foreignMedia] })
      .expect(400);
    assert.equal(res.body.code, 'media_invalid');
  });

  it('shop_id in the body is ignored/rejected (the shop comes from the token)', async () => {
    await ctx.http
      .post('/api/v1/seller/products')
      .set(auth(sellerB))
      .send({ title: 'Sneaky', priceTenge: 100, stock: 1, shopId: shopA })
      .expect(400);
  });

  it('hidden products are not shown to buyers', async () => {
    const product = await createProduct(ctx, sellerA, { title: 'Hidden thing', status: 'hidden' });
    await ctx.http.get(`/api/v1/products/${product.id}`).expect(404);
    const seller = await ctx.http.get(`/api/v1/seller/products/${product.id}`).set(auth(sellerA)).expect(200);
    assert.equal(seller.body.status, 'hidden');
  });

  it('expired subscription hides the shop, data stays', async () => {
    const { seller, shopId } = await createSeller(ctx, owner, 'Expiring');
    const product = await createProduct(ctx, seller, { title: 'Soon hidden' });
    await ctx.http.get(`/api/v1/shops/${shopId}`).expect(200);
    await ctx.db.update(shops).set({ subscriptionUntil: new Date(Date.now() - 1000) }).where(eq(shops.id, shopId));
    await ctx.http.get(`/api/v1/shops/${shopId}`).expect(404);
    await ctx.http.get(`/api/v1/products/${product.id}`).expect(404);
    const dash = await ctx.http.get('/api/v1/seller/dashboard').set(auth(seller)).expect(200);
    assert.equal(dash.body.subscription.expired, true);
    await ctx.http.get(`/api/v1/seller/products/${product.id}`).set(auth(seller)).expect(200);
  });

  it('dashboard warns 5 days before the end', async () => {
    const { seller, shopId } = await createSeller(ctx, owner, 'Ending');
    await ctx.db.update(shops).set({ subscriptionUntil: new Date(Date.now() + 3 * 86_400_000) }).where(eq(shops.id, shopId));
    const dash = await ctx.http.get('/api/v1/seller/dashboard').set(auth(seller)).expect(200);
    assert.equal(dash.body.subscription.endsSoon, true);
    assert.equal(dash.body.subscription.daysLeft, 3);
  });

  it('plan limit stops new products', async () => {
    const { seller } = await createSeller(ctx, owner, 'Limited');
    await ctx.http.patch('/api/v1/admin/plans/trial').set(auth(owner)).send({ productLimit: 2 }).expect(200);
    try {
      await createProduct(ctx, seller, { title: 'One' });
      await createProduct(ctx, seller, { title: 'Two' });
      const res = await ctx.http
        .post('/api/v1/seller/products')
        .set(auth(seller))
        .send({ title: 'Three', priceTenge: 1, stock: 1 })
        .expect(400);
      assert.equal(res.body.code, 'product_limit_reached');
    } finally {
      await ctx.http.patch('/api/v1/admin/plans/trial').set(auth(owner)).send({ productLimit: 50 }).expect(200);
    }
  });

  it('uploads: checks real file type, requires a valid signature to download', async () => {
    const fake = await ctx.http
      .post('/api/v1/media?purpose=product')
      .set(auth(sellerA))
      .attach('file', Buffer.from('<script>alert(1)</script> this is not an image'), {
        filename: 'evil.png',
        contentType: 'image/png',
      })
      .expect(400);
    assert.equal(fake.body.code, 'file_type_not_allowed');

    const buyer = await registerBuyer(ctx);
    const voiceAsLogo = await ctx.http
      .post('/api/v1/media?purpose=banner')
      .set(auth(buyer))
      .attach('file', Buffer.from('x'), { filename: 'a.png' })
      .expect(400);
    assert.ok(voiceAsLogo.body.code);

    const up = await ctx.http
      .post('/api/v1/media?purpose=product')
      .set(auth(sellerA))
      .attach('file', await (await import('./helpers.js')).pngImage(), { filename: 'p.png' })
      .expect(201);
    assert.equal(up.body.mime, 'image/webp', 'images are re-encoded to WebP');
    const ok = await ctx.http.get(up.body.url).expect(200);
    assert.equal(ok.headers['content-type'], 'image/webp');
    await ctx.http.get(`/api/v1/media/${up.body.id}`).expect(400);
    await ctx.http.get(`/api/v1/media/${up.body.id}?e=9999999999&s=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`).expect(404);
    const expired = up.body.url.replace(/e=\d+/, 'e=1000');
    await ctx.http.get(expired).expect(404);
  });

  it('abandoned uploads are cleaned up, attached ones are kept', async () => {
    const { media: mediaTable } = await import('../src/db/schema.js');
    const attached = await uploadImage(ctx, sellerA);
    await createProduct(ctx, sellerA, { title: 'Keeps photo', mediaIds: [attached] });
    const orphan = await uploadImage(ctx, sellerA);
    const old = new Date(Date.now() - 4 * 86_400_000);
    await ctx.db.update(mediaTable).set({ createdAt: old });
    const { MediaService } = await import('../src/media/media.service.js');
    const removed = await ctx.app.get(MediaService).cleanupOrphans();
    assert.ok(removed >= 1);
    const left = await ctx.db.select({ id: mediaTable.id }).from(mediaTable);
    assert.ok(left.some((m) => m.id === attached));
    assert.ok(!left.some((m) => m.id === orphan));
  });

  it('favorites work per user', async () => {
    const product = await createProduct(ctx, sellerA, { title: 'Favorite me' });
    const buyer = await registerBuyer(ctx);
    await ctx.http.put(`/api/v1/me/favorites/${product.id}`).set(auth(buyer)).expect(204);
    const favs = await ctx.http.get('/api/v1/me/favorites').set(auth(buyer)).expect(200);
    assert.equal(favs.body.length, 1);
    assert.equal(favs.body[0].isFavorite, true);
    const other = await registerBuyer(ctx);
    const otherFavs = await ctx.http.get('/api/v1/me/favorites').set(auth(other)).expect(200);
    assert.equal(otherFavs.body.length, 0);
  });

  it('search input with SQL/LIKE characters is safe', async () => {
    await ctx.http.get(`/api/v1/products?q=${encodeURIComponent("'; drop table users; --")}`).expect(200);
    const res = await ctx.http.get(`/api/v1/products?q=${encodeURIComponent('%')}`).expect(200);
    assert.equal(res.body.length, 0, '% is matched literally, not as a wildcard');
  });
});
