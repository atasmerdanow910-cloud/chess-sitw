import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';

import { AuthUser } from '../common/auth-context.js';
import { badRequest, notFound } from '../common/errors.js';
import { Db, InjectDb } from '../db/db.js';
import { deviceTokens, favorites, notifications, products, reports, shops, users } from '../db/schema.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { productVisible } from '../catalog/visibility.js';
import { ChatService } from '../chat/chat.service.js';

@Injectable()
export class MeService {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly catalog: CatalogService,
    private readonly chat: ChatService,
  ) {}

  async favorites(user: AuthUser) {
    const rows = await this.db
      .select({ product: products, shop: shops })
      .from(favorites)
      .innerJoin(products, eq(products.id, favorites.productId))
      .innerJoin(shops, eq(shops.id, products.shopId))
      .where(and(eq(favorites.userId, user.id), productVisible()))
      .orderBy(desc(favorites.createdAt))
      .limit(200);
    return this.catalog.toCards(rows, user.id);
  }

  async addFavorite(user: AuthUser, productId: string) {
    const [p] = await this.db
      .select({ id: products.id })
      .from(products)
      .innerJoin(shops, eq(shops.id, products.shopId))
      .where(and(eq(products.id, productId), productVisible()));
    if (!p) throw notFound('product_not_found');
    await this.db.insert(favorites).values({ userId: user.id, productId }).onConflictDoNothing();
  }

  async removeFavorite(user: AuthUser, productId: string) {
    await this.db.delete(favorites).where(and(eq(favorites.userId, user.id), eq(favorites.productId, productId)));
  }

  async notifications(user: AuthUser, limit: number, offset: number) {
    const [items, [unread]] = await Promise.all([
      this.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ n: count() })
        .from(notifications)
        .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt))),
    ]);
    return { items, unreadCount: Number(unread.n) };
  }

  async readNotifications(user: AuthUser, ids: string[] | undefined) {
    const conditions = [eq(notifications.userId, user.id), isNull(notifications.readAt)];
    if (ids && ids.length > 0) conditions.push(inArray(notifications.id, ids));
    await this.db.update(notifications).set({ readAt: new Date() }).where(and(...conditions));
  }

  async registerDevice(user: AuthUser, token: string, platform: string) {
    await this.db
      .insert(deviceTokens)
      .values({ token, userId: user.id, platform })
      .onConflictDoUpdate({ target: deviceTokens.token, set: { userId: user.id, platform } });
  }

  async removeDevice(user: AuthUser, token: string) {
    await this.db.delete(deviceTokens).where(and(eq(deviceTokens.token, token), eq(deviceTokens.userId, user.id)));
  }

  /** Complaint about a product, shop, user or chat message. */
  async report(
    user: AuthUser,
    input: { targetType: 'product' | 'shop' | 'user' | 'message'; targetId: string; reason: string },
  ) {
    let snapshot = '';
    switch (input.targetType) {
      case 'product': {
        const [p] = await this.db.select({ title: products.title }).from(products).where(eq(products.id, input.targetId));
        if (!p) throw notFound();
        snapshot = p.title;
        break;
      }
      case 'shop': {
        const [s] = await this.db.select({ name: shops.name }).from(shops).where(eq(shops.id, input.targetId));
        if (!s) throw notFound();
        snapshot = s.name;
        break;
      }
      case 'user': {
        const [u] = await this.db.select({ name: users.name }).from(users).where(eq(users.id, input.targetId));
        if (!u) throw notFound();
        if (input.targetId === user.id) throw badRequest('report_self');
        snapshot = u.name;
        break;
      }
      case 'message': {
        const text = await this.chat.messageForReport(user, input.targetId);
        if (text === null) throw notFound();
        snapshot = text.slice(0, 2000);
        break;
      }
    }
    const [row] = await this.db
      .insert(reports)
      .values({ reporterId: user.id, targetType: input.targetType, targetId: input.targetId, reason: input.reason, snapshot })
      .returning({ id: reports.id });
    return row;
  }
}
