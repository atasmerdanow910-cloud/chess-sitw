import { Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import { AuthUser } from '../common/auth-context.js';
import { badRequest, conflict, forbidden, notFound } from '../common/errors.js';
import { normalizePhone } from '../common/phone.js';
import { Db, InjectDb, Tx } from '../db/db.js';
import { orderItems, orders, products, productVariants, reviews, shops, users } from '../db/schema.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { shopSummary } from '../catalog/dto.js';
import { shopVisible } from '../catalog/visibility.js';
import { mediaUrl } from '../media/signing.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { formatTmt } from '../notifications/texts.js';

export type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled';

export interface CreateOrderInput {
  shopId: string;
  items: Array<{ productId: string; variantIds: string[]; qty: number }>;
  contactPhone: string;
  address: string;
  comment: string;
}

/** Allowed status changes by the seller. */
const SELLER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectDb() private readonly db: Db,
    private readonly catalog: CatalogService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Creates an order in ONE shop. Prices and stock come from the database,
   * never from the phone. Stock is reserved in the same transaction.
   */
  async create(user: AuthUser, input: CreateOrderInput) {
    const contactPhone = normalizePhone(input.contactPhone);
    if (!contactPhone) throw badRequest('invalid_phone');
    if (user.shopId === input.shopId) throw badRequest('own_shop');

    const orderId = await this.db.transaction(async (tx) => {
      const [shop] = await tx.select().from(shops).where(and(eq(shops.id, input.shopId), shopVisible()));
      if (!shop) throw badRequest('shop_unavailable');

      const productIds = [...new Set(input.items.map((i) => i.productId))];
      // Lock rows so two buyers can't take the last item at the same time.
      const productRows = await tx
        .select()
        .from(products)
        .where(and(inArray(products.id, productIds), eq(products.shopId, shop.id)))
        .for('update');
      const byId = new Map(productRows.map((p) => [p.id, p]));
      const variantIds = [...new Set(input.items.flatMap((i) => i.variantIds))];
      const variantRows = variantIds.length
        ? await tx.select().from(productVariants).where(inArray(productVariants.id, variantIds))
        : [];
      const variantById = new Map(variantRows.map((v) => [v.id, v]));

      const needed = new Map<string, number>();
      const lines = input.items.map((item) => {
        const product = byId.get(item.productId);
        if (!product || product.status !== 'active') {
          throw badRequest('product_unavailable', { productId: item.productId });
        }
        const variants = item.variantIds.map((id) => {
          const v = variantById.get(id);
          if (!v || v.productId !== product.id) throw badRequest('variant_invalid', { productId: product.id });
          return v;
        });
        needed.set(product.id, (needed.get(product.id) ?? 0) + item.qty);
        const unit = product.priceTenge + variants.reduce((s, v) => s + v.priceDeltaTenge, 0);
        return {
          productId: product.id,
          title: product.title,
          variantLabel: variants.map((v) => v.value).join(' · '),
          qty: item.qty,
          priceTenge: Math.max(0, unit),
        };
      });
      for (const [productId, qty] of needed) {
        const product = byId.get(productId)!;
        if (product.stock < qty) throw conflict('out_of_stock');
      }

      const total = lines.reduce((s, l) => s + l.priceTenge * l.qty, 0);
      const [order] = await tx
        .insert(orders)
        .values({
          buyerId: user.id,
          shopId: shop.id,
          totalTenge: total,
          contactPhone,
          address: input.address,
          comment: input.comment,
        })
        .returning();
      await tx.insert(orderItems).values(lines.map((l) => ({ ...l, orderId: order.id })));
      for (const [productId, qty] of needed) {
        await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${qty}`, ordersCount: sql`${products.ordersCount} + 1` })
          .where(eq(products.id, productId));
      }
      if (shop.ownerUserId) {
        const sellerId = shop.ownerUserId;
        const number = String(order.number);
        // Notify after commit.
        setImmediate(() => {
          this.notifications
            .notifyText(sellerId, 'order.new', { number, total: formatTmt(total) }, { orderId: order.id })
            .catch(() => this.logger.warn('order notification failed'));
        });
      }
      return order.id;
    });
    return this.get(user, orderId);
  }

  async listForBuyer(user: AuthUser, limit: number, offset: number) {
    const rows = await this.db
      .select({ order: orders, shop: shops })
      .from(orders)
      .innerJoin(shops, eq(shops.id, orders.shopId))
      .where(eq(orders.buyerId, user.id))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);
    return this.toDtos(rows, 'buyer');
  }

  async listForSeller(user: AuthUser, status: OrderStatus | undefined, limit: number, offset: number) {
    if (!user.shopId) throw forbidden('no_shop');
    const conditions = [eq(orders.shopId, user.shopId)];
    if (status) conditions.push(eq(orders.status, status));
    const rows = await this.db
      .select({ order: orders, shop: shops })
      .from(orders)
      .innerJoin(shops, eq(shops.id, orders.shopId))
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);
    return this.toDtos(rows, 'seller');
  }

  /** Buyer of the order or seller of its shop. Anyone else gets "not found". */
  async get(user: AuthUser, orderId: string) {
    const [row] = await this.db
      .select({ order: orders, shop: shops })
      .from(orders)
      .innerJoin(shops, eq(shops.id, orders.shopId))
      .where(eq(orders.id, orderId));
    if (!row) throw notFound('order_not_found');
    const side = row.order.buyerId === user.id ? 'buyer' : row.shop.ownerUserId === user.id ? 'seller' : null;
    if (!side) throw notFound('order_not_found');
    const [dto] = await this.toDtos([row], side);
    return dto;
  }

  async cancelByBuyer(user: AuthUser, orderId: string) {
    return this.db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.buyerId, user.id)))
        .for('update');
      if (!order) throw notFound('order_not_found');
      if (order.status !== 'pending') throw conflict('order_cannot_cancel');
      await this.applyStatus(tx, order, 'cancelled');
      return order.id;
    }).then((id) => this.get(user, id));
  }

  async setStatusBySeller(user: AuthUser, orderId: string, next: OrderStatus) {
    if (!user.shopId) throw forbidden('no_shop');
    const shopId = user.shopId;
    const id = await this.db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.shopId, shopId)))
        .for('update');
      if (!order) throw notFound('order_not_found');
      if (!SELLER_TRANSITIONS[order.status].includes(next)) throw conflict('status_transition_invalid');
      await this.applyStatus(tx, order, next);
      return order.id;
    });
    return this.get(user, id);
  }

  private async applyStatus(tx: Tx, order: typeof orders.$inferSelect, next: OrderStatus) {
    await tx.update(orders).set({ status: next, updatedAt: new Date() }).where(eq(orders.id, order.id));
    if (next === 'cancelled') {
      // Put reserved items back on the shelf.
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      for (const item of items) {
        if (!item.productId) continue;
        await tx
          .update(products)
          .set({ stock: sql`${products.stock} + ${item.qty}` })
          .where(eq(products.id, item.productId));
      }
    }
    const [shop] = await tx.select({ ownerUserId: shops.ownerUserId }).from(shops).where(eq(shops.id, order.shopId));
    const recipients = [order.buyerId, shop?.ownerUserId].filter((id): id is string => Boolean(id));
    setImmediate(() => {
      for (const userId of recipients) {
        this.notifications
          .notifyText(userId, 'order.status', { number: String(order.number), status: next }, { orderId: order.id })
          .catch(() => this.logger.warn('status notification failed'));
      }
    });
  }

  /** Review after a delivered order. Updates the shop rating. */
  async review(user: AuthUser, orderId: string, input: { rating: number; text: string }) {
    await this.db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.buyerId, user.id)));
      if (!order) throw notFound('order_not_found');
      if (order.status !== 'delivered') throw conflict('review_not_allowed');
      const inserted = await tx
        .insert(reviews)
        .values({ orderId: order.id, shopId: order.shopId, buyerId: user.id, rating: input.rating, text: input.text })
        .onConflictDoNothing()
        .returning({ id: reviews.id });
      if (inserted.length === 0) throw conflict('review_exists');
      await tx
        .update(shops)
        .set({
          ratingAvg: sql`(select coalesce(avg(rating), 0) from ${reviews} where shop_id = ${order.shopId})`,
          reviewsCount: sql`(select count(*) from ${reviews} where shop_id = ${order.shopId})`,
        })
        .where(eq(shops.id, order.shopId));
    });
    return this.get(user, orderId);
  }

  private async toDtos(
    rows: Array<{ order: typeof orders.$inferSelect; shop: typeof shops.$inferSelect }>,
    side: 'buyer' | 'seller',
  ) {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.order.id);
    const [items, buyers, reviewRows] = await Promise.all([
      this.db.select().from(orderItems).where(inArray(orderItems.orderId, ids)),
      side === 'seller'
        ? this.db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(inArray(users.id, rows.map((r) => r.order.buyerId)))
        : Promise.resolve([]),
      this.db.select({ orderId: reviews.orderId }).from(reviews).where(inArray(reviews.orderId, ids)),
    ]);
    const productIds = items.map((i) => i.productId).filter((id): id is string => Boolean(id));
    const firstMedia = await this.catalog.firstMedia(productIds);
    const buyerNames = new Map(buyers.map((b) => [b.id, b.name]));
    const reviewed = new Set(reviewRows.map((r) => r.orderId));
    return rows.map(({ order, shop }) => ({
      id: order.id,
      number: order.number,
      status: order.status,
      totalTenge: order.totalTenge,
      contactPhone: order.contactPhone,
      address: order.address,
      comment: order.comment,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      shop: shopSummary(shop),
      // The seller sees only what is needed for the order: name + contact phone.
      buyer: side === 'seller' ? { name: buyerNames.get(order.buyerId) ?? '' } : null,
      items: items
        .filter((i) => i.orderId === order.id)
        .map((i) => ({
          productId: i.productId,
          title: i.title,
          variantLabel: i.variantLabel,
          qty: i.qty,
          priceTenge: i.priceTenge,
          imageUrl: mediaUrl(i.productId ? (firstMedia.get(i.productId) ?? null) : null),
        })),
      hasReview: reviewed.has(order.id),
      canCancel: side === 'buyer' && order.status === 'pending',
      nextStatuses: side === 'seller' ? SELLER_TRANSITIONS[order.status] : [],
    }));
  }
}
