import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { AddressInfo } from 'node:net';
import { io, Socket } from 'socket.io-client';

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

describe('chat', () => {
  let ctx: TestContext;
  let seller: Session;
  let shopId: string;
  let buyer: Session;
  let url: string;

  before(async () => {
    ctx = await startApp();
    const owner = await createOwner(ctx);
    ({ seller, shopId } = await createSeller(ctx, owner));
    buyer = await registerBuyer(ctx);
    const port = (ctx.app.getHttpServer().address() as AddressInfo).port;
    url = `http://127.0.0.1:${port}`;
  });
  after(async () => ctx.close());

  const connect = (s: Session): Promise<Socket> =>
    new Promise((resolve, reject) => {
      const socket = io(url, { auth: { token: s.token }, transports: ['websocket'], reconnection: false });
      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', reject);
    });

  it('buyer writes, seller receives live, statuses update', async () => {
    const product = await createProduct(ctx, seller);
    const conv = await ctx.http.post('/api/v1/chats').set(auth(buyer)).send({ shopId, productId: product.id }).expect(201);
    assert.equal(conv.body.side, 'buyer');

    const sellerSocket = await connect(seller);
    const received = new Promise<{ text: string }>((resolve) => sellerSocket.once('chat:message', resolve));
    const sent = await ctx.http
      .post(`/api/v1/chats/${conv.body.id}/messages`)
      .set(auth(buyer))
      .send({ clientId: 'client-msg-0001', type: 'text', text: 'Salam! Bar mы?' })
      .expect(201);
    assert.equal((await received).text, 'Salam! Bar mы?');

    // Same clientId again (resend after bad network) = same message, no duplicate.
    const again = await ctx.http
      .post(`/api/v1/chats/${conv.body.id}/messages`)
      .set(auth(buyer))
      .send({ clientId: 'client-msg-0001', type: 'text', text: 'Salam! Bar mы?' })
      .expect(201);
    assert.equal(again.body.id, sent.body.id);

    const list = await ctx.http.get('/api/v1/chats').set(auth(seller)).expect(200);
    assert.equal(list.body[0].unreadCount, 1);
    assert.equal(list.body[0].side, 'seller');
    assert.equal(list.body[0].peerName, 'Buyer Test');

    const history = await ctx.http.get(`/api/v1/chats/${conv.body.id}/messages`).set(auth(seller)).expect(200);
    assert.equal(history.body.length, 1);
    await ctx.http.post(`/api/v1/chats/${conv.body.id}/read`).set(auth(seller)).expect(200);
    const after = await ctx.http.get('/api/v1/chats').set(auth(seller)).expect(200);
    assert.equal(after.body[0].unreadCount, 0);
    const buyerHistory = await ctx.http.get(`/api/v1/chats/${conv.body.id}/messages`).set(auth(buyer)).expect(200);
    assert.ok(buyerHistory.body[0].readAt, 'buyer sees "read"');
    sellerSocket.disconnect();
  });

  it('typing indicator reaches the other side', async () => {
    const conv = await ctx.http.post('/api/v1/chats').set(auth(buyer)).send({ shopId }).expect(201);
    const sellerSocket = await connect(seller);
    const buyerSocket = await connect(buyer);
    const typing = new Promise<{ conversationId: string }>((resolve) => sellerSocket.once('chat:typing', resolve));
    buyerSocket.emit('chat:typing', { conversationId: conv.body.id });
    assert.equal((await typing).conversationId, conv.body.id);
    sellerSocket.disconnect();
    buyerSocket.disconnect();
  });

  it('strangers cannot read or write a chat (IDOR)', async () => {
    const conv = await ctx.http.post('/api/v1/chats').set(auth(buyer)).send({ shopId }).expect(201);
    const stranger = await registerBuyer(ctx);
    await ctx.http.get(`/api/v1/chats/${conv.body.id}/messages`).set(auth(stranger)).expect(404);
    await ctx.http
      .post(`/api/v1/chats/${conv.body.id}/messages`)
      .set(auth(stranger))
      .send({ clientId: 'stranger-0001', type: 'text', text: 'hi' })
      .expect(404);
    await ctx.http.post(`/api/v1/chats/${conv.body.id}/read`).set(auth(stranger)).expect(404);
    const strangerChats = await ctx.http.get('/api/v1/chats').set(auth(stranger)).expect(200);
    assert.equal(strangerChats.body.length, 0);
  });

  it('photo messages use the sender\'s own uploads and private links', async () => {
    const conv = await ctx.http.post('/api/v1/chats').set(auth(buyer)).send({ shopId }).expect(201);
    const photo = await uploadImage(ctx, buyer, 'chat_photo');
    const msg = await ctx.http
      .post(`/api/v1/chats/${conv.body.id}/messages`)
      .set(auth(buyer))
      .send({ clientId: 'photo-msg-0001', type: 'photo', mediaId: photo })
      .expect(201);
    assert.ok(msg.body.mediaUrl);
    const sellerPhoto = await uploadImage(ctx, seller, 'chat_photo');
    await ctx.http
      .post(`/api/v1/chats/${conv.body.id}/messages`)
      .set(auth(buyer))
      .send({ clientId: 'photo-msg-0002', type: 'photo', mediaId: sellerPhoto })
      .expect(400);
  });

  it('sockets without a valid token are refused', async () => {
    await assert.rejects(connect({ token: 'garbage', refresh: '', phone: '', userId: '' }));
  });

  it('reporting a message stores what was said; outsiders cannot report it', async () => {
    const conv = await ctx.http.post('/api/v1/chats').set(auth(buyer)).send({ shopId }).expect(201);
    const msg = await ctx.http
      .post(`/api/v1/chats/${conv.body.id}/messages`)
      .set(auth(seller))
      .send({ clientId: 'rude-msg-0001', type: 'text', text: 'Rude words' })
      .expect(201);
    await ctx.http
      .post('/api/v1/reports')
      .set(auth(buyer))
      .send({ targetType: 'message', targetId: msg.body.id, reason: 'Spam message' })
      .expect(201);
    const stranger = await registerBuyer(ctx);
    await ctx.http
      .post('/api/v1/reports')
      .set(auth(stranger))
      .send({ targetType: 'message', targetId: msg.body.id, reason: 'curious' })
      .expect(404);
  });
});

describe('owner panel', () => {
  let ctx: TestContext;
  let owner: Session;

  before(async () => {
    ctx = await startApp();
    owner = await createOwner(ctx);
  });
  after(async () => ctx.close());

  it('creates a shop with an invite and extends the subscription by payment', async () => {
    const { shopId, seller } = await createSeller(ctx, owner, 'Paid shop');
    const before = await ctx.http.get(`/api/v1/admin/shops/${shopId}`).set(auth(owner)).expect(200);
    const pay = await ctx.http
      .post(`/api/v1/admin/shops/${shopId}/payments`)
      .set(auth(owner))
      .send({ planId: 'business', amountTenge: 20_000, months: 1, method: 'cash', note: 'Nagt' })
      .expect(201);
    assert.ok(new Date(pay.body.paidUntil) > new Date(before.body.subscriptionUntil));
    const after = await ctx.http.get(`/api/v1/admin/shops/${shopId}`).set(auth(owner)).expect(200);
    assert.equal(after.body.planId, 'business');
    assert.equal(after.body.payments.length, 1);
    const stats = await ctx.http.get('/api/v1/admin/stats').set(auth(owner)).expect(200);
    assert.equal(stats.body.revenueTenge.total, 20_000);
    const audit = await ctx.http.get('/api/v1/admin/audit').set(auth(owner)).expect(200);
    assert.ok(audit.body.some((a: { action: string }) => a.action === 'subscription.extend'));
    await new Promise((r) => setTimeout(r, 100));
    const notes = await ctx.http.get('/api/v1/me/notifications').set(auth(seller)).expect(200);
    assert.ok(notes.body.items.some((n: { type: string }) => n.type === 'subscription.extended'));
  });

  it('blocking a shop hides it; moderation hides a product', async () => {
    const { shopId, seller } = await createSeller(ctx, owner, 'Bad shop');
    const product = await createProduct(ctx, seller, { title: 'Bad product' });
    await ctx.http.patch(`/api/v1/admin/products/${product.id}`).set(auth(owner)).send({ status: 'blocked' }).expect(200);
    await ctx.http.get(`/api/v1/products/${product.id}`).expect(404);
    // The seller cannot simply re-publish a blocked product.
    await ctx.http.patch(`/api/v1/seller/products/${product.id}`).set(auth(seller)).send({ status: 'active' }).expect(403);
    await ctx.http.patch(`/api/v1/admin/shops/${shopId}`).set(auth(owner)).send({ status: 'blocked' }).expect(200);
    await ctx.http.get(`/api/v1/shops/${shopId}`).expect(404);
    await ctx.http.post('/api/v1/seller/products').set(auth(seller)).send({ title: 'More', priceTenge: 1, stock: 1 }).expect(403);
  });

  it('regenerates invite codes; old one stops working', async () => {
    const created = await ctx.http
      .post('/api/v1/admin/shops')
      .set(auth(owner))
      .send({ shopName: 'New one', sellerName: 'Someone', sellerPhone: '+99365000001' })
      .expect(201);
    const fresh = await ctx.http.post(`/api/v1/admin/shops/${created.body.shop.id}/invite`).set(auth(owner)).expect(201);
    assert.notEqual(fresh.body.code, created.body.invite.code);
    const buyer = await registerBuyer(ctx);
    await ctx.http.post('/api/v1/auth/invite').set(auth(buyer)).send({ code: created.body.invite.code }).expect(400);
    await ctx.http.post('/api/v1/auth/invite').set(auth(buyer)).send({ code: fresh.body.code }).expect(200);
  });

  it('categories, banners, broadcasts, reports', async () => {
    const cat = await ctx.http
      .post('/api/v1/admin/categories')
      .set(auth(owner))
      .send({ nameRu: 'Спорт', nameTk: 'Sport', icon: 'sports' })
      .expect(201);
    const cats = await ctx.http.get('/api/v1/categories').expect(200);
    assert.ok(cats.body.some((c: { id: string }) => c.id === cat.body.id));
    await ctx.http.post('/api/v1/admin/banners').set(auth(owner)).send({ titleRu: 'Акция', titleTk: 'Aksiýa' }).expect(201);
    const buyer = await registerBuyer(ctx);
    const sent = await ctx.http
      .post('/api/v1/admin/broadcasts')
      .set(auth(owner))
      .send({ title: 'Täzelik', body: 'Hello', audience: 'buyers' })
      .expect(201);
    assert.ok(sent.body.recipients >= 1);
    const notes = await ctx.http.get('/api/v1/me/notifications').set(auth(buyer)).expect(200);
    assert.equal(notes.body.items[0].type, 'broadcast');
    const reports = await ctx.http.get('/api/v1/admin/reports?status=open').set(auth(owner)).expect(200);
    assert.ok(Array.isArray(reports.body));
  });

  it('subscription reminder job notifies sellers once a day', async () => {
    const { shopId, seller } = await createSeller(ctx, owner, 'Reminder shop');
    const { shops } = await import('../src/db/schema.js');
    const { eq } = await import('drizzle-orm');
    await ctx.db.update(shops).set({ subscriptionUntil: new Date(Date.now() + 2 * 86_400_000) }).where(eq(shops.id, shopId));
    const { SubscriptionReminderJob } = await import('../src/jobs/reminders.js');
    const job = ctx.app.get(SubscriptionReminderJob);
    assert.ok((await job.run()) >= 1);
    assert.equal(await job.run(), 0, 'second run the same day sends nothing');
    await new Promise((r) => setTimeout(r, 100));
    const notes = await ctx.http.get('/api/v1/me/notifications').set(auth(seller)).expect(200);
    assert.ok(notes.body.items.some((n: { type: string }) => n.type === 'subscription.ends_soon'));
  });
});
