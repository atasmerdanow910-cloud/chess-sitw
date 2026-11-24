import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, ne, sql, sum } from 'drizzle-orm';

import { AuditService } from '../common/audit.js';
import { AuthUser } from '../common/auth-context.js';
import { badRequest, forbidden, notFound } from '../common/errors.js';
import { Db, InjectDb, Tx } from '../db/db.js';
import { categories, media, orders, plans, productMedia, products, productVariants, shops } from '../db/schema.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { mediaUrl } from '../media/signing.js';

export interface ProductInput {
  title: string;
  description: string;
  priceTenge: number;
  stock: number;
  categoryId: string | null;
  status: 'active' | 'hidden';
  mediaIds: string[];
  variants: Array<{ kind: 'color' | 'size'; value: string; priceDeltaTenge: number }>;
}

export interface ShopInput {
  name?: string;
  description?: string;
  address?: string;
  phone?: string;
  workingHours?: string;
  logoMediaId?: string | null;
  legalName?: string;
  returnPolicy?: string;
}

const DAY = 86_400_000;

/**
 * Everything a seller does. The shop is ALWAYS taken from the logged-in user,
 * never from the request body (protection from accessing other shops).
 */
@Injectable()
export class SellerService {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly catalog: CatalogService,
    private readonly audit: AuditService,
  ) {}

  private async shopOf(user: AuthUser, forWrite = false) {
    if (!user.shopId) throw forbidden('no_shop');
    const [shop] = await this.db.select().from(shops).where(eq(shops.id, user.shopId));
    if (!shop) throw forbidden('no_shop');
    if (forWrite && shop.status === 'blocked') throw forbidden('shop_blocked');
    return shop;
  }

  async getShop(user: AuthUser) {
    const shop = await this.shopOf(user);
    const [plan] = await this.db.select().from(plans).where(eq(plans.id, shop.planId));
    return {
      id: shop.id,
      name: shop.name,
      description: shop.description,
      address: shop.address,
      phone: shop.phone,
      workingHours: shop.workingHours,
      logoMediaId: shop.logoMediaId,
      logoUrl: mediaUrl(shop.logoMediaId),
      legalName: shop.legalName,
      returnPolicy: shop.returnPolicy,
      status: shop.status,
      isVerified: shop.isVerified,
      rating: Number(shop.ratingAvg),
      reviewsCount: shop.reviewsCount,
      subscription: subscriptionInfo(shop.subscriptionUntil),
      plan: plan ?? null,
    };
  }

  async updateShop(user: AuthUser, input: ShopInput) {
    const shop = await this.shopOf(user, true);
    if (input.logoMediaId) await this.assertOwnMedia(user.id, [input.logoMediaId], ['image']);
    await this.db.update(shops).set(input).where(eq(shops.id, shop.id));
    return this.getShop(user);
  }

  async dashboard(user: AuthUser) {
    const shop = await this.shopOf(user);
    const [[productStats], [orderStats], [pending], popular] = await Promise.all([
      this.db
        .select({ n: count(), views: sum(products.views) })
        .from(products)
        .where(and(eq(products.shopId, shop.id), ne(products.status, 'deleted'))),
      this.db.select({ n: count() }).from(orders).where(eq(orders.shopId, shop.id)),
      this.db
        .select({ n: count() })
        .from(orders)
        .where(and(eq(orders.shopId, shop.id), eq(orders.status, 'pending'))),
      this.db
        .select({ id: products.id, title: products.title, views: products.views, ordersCount: products.ordersCount })
        .from(products)
        .where(and(eq(products.shopId, shop.id), ne(products.status, 'deleted')))
        .orderBy(desc(products.views))
        .limit(5),
    ]);
    return {
      subscription: subscriptionInfo(shop.subscriptionUntil),
      shopStatus: shop.status,
      stats: {
        views: shop.views + Number(productStats.views ?? 0),
        orders: Number(orderStats.n),
        pendingOrders: Number(pending.n),
        products: Number(productStats.n),
      },
      popularProducts: popular,
    };
  }

  async listProducts(user: AuthUser, query: { q?: string; limit: number; offset: number }) {
    const shop = await this.shopOf(user);
    const conditions = [eq(products.shopId, shop.id), ne(products.status, 'deleted')];
    if (query.q) conditions.push(sql`${products.title} ilike ${'%' + query.q.replace(/[\\%_]/g, '\\$&') + '%'}`);
    const rows = await this.db
      .select({ product: products, shop: shops })
      .from(products)
      .innerJoin(shops, eq(shops.id, products.shopId))
      .where(and(...conditions))
      .orderBy(desc(products.createdAt))
      .limit(query.limit)
      .offset(query.offset);
    const cards = await this.catalog.toCards(rows, null);
    return cards.map((c, i) => ({ ...c, views: rows[i].product.views, ordersCount: rows[i].product.ordersCount }));
  }

  private async ownProduct(user: AuthUser, productId: string, forWrite = false) {
    const shop = await this.shopOf(user, forWrite);
    const [product] = await this.db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.shopId, shop.id), ne(products.status, 'deleted')));
    // Someone else's product looks exactly like a missing one.
    if (!product) throw notFound('product_not_found');
    return { shop, product };
  }

  async getProduct(user: AuthUser, productId: string) {
    const { shop, product } = await this.ownProduct(user, productId);
    return this.catalog.productDetails(product, shop, null);
  }

  async createProduct(user: AuthUser, input: ProductInput) {
    const shop = await this.shopOf(user, true);
    await this.assertProductLimit(shop.id, shop.planId);
    await this.validateRefs(user.id, input);
    const id = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(products)
        .values({
          shopId: shop.id,
          title: input.title,
          description: input.description,
          priceTenge: input.priceTenge,
          stock: input.stock,
          categoryId: input.categoryId,
          status: input.status,
        })
        .returning({ id: products.id });
      await this.replaceChildren(tx, row.id, input.mediaIds, input.variants);
      return row.id;
    });
    return this.getProduct(user, id);
  }

  async updateProduct(user: AuthUser, productId: string, input: Partial<ProductInput>) {
    const { product } = await this.ownProduct(user, productId, true);
    if (product.status === 'blocked' && input.status !== undefined) throw forbidden('product_blocked');
    await this.validateRefs(user.id, input);
    await this.db.transaction(async (tx) => {
      const { mediaIds, variants, ...fields } = input;
      if (Object.keys(fields).length > 0) {
        await tx
          .update(products)
          .set({ ...fields, updatedAt: new Date() })
          .where(eq(products.id, product.id));
      }
      if (mediaIds !== undefined || variants !== undefined) {
        await this.replaceChildren(tx, product.id, mediaIds, variants);
      }
    });
    return this.getProduct(user, product.id);
  }

  async deleteProduct(user: AuthUser, productId: string) {
    const { product, shop } = await this.ownProduct(user, productId, true);
    await this.db.update(products).set({ status: 'deleted', updatedAt: new Date() }).where(eq(products.id, product.id));
    await this.audit.log(user.id, 'product.delete', 'product', product.id, { shopId: shop.id });
  }

  private async assertProductLimit(shopId: string, planId: string) {
    const [plan] = await this.db.select().from(plans).where(eq(plans.id, planId));
    if (!plan || plan.productLimit === null) return;
    const [{ n }] = await this.db
      .select({ n: count() })
      .from(products)
      .where(and(eq(products.shopId, shopId), ne(products.status, 'deleted')));
    if (Number(n) >= plan.productLimit) throw badRequest('product_limit_reached', { limit: plan.productLimit });
  }

  private async validateRefs(userId: string, input: Partial<ProductInput>) {
    if (input.categoryId) {
      const [cat] = await this.db.select({ id: categories.id }).from(categories).where(eq(categories.id, input.categoryId));
      if (!cat) throw badRequest('category_not_found');
    }
    if (input.mediaIds && input.mediaIds.length > 0) {
      await this.assertOwnMedia(userId, input.mediaIds, ['image', 'video']);
    }
  }

  /** Files can only be attached by the user who uploaded them. */
  async assertOwnMedia(userId: string, ids: string[], kinds: Array<'image' | 'video' | 'audio'>) {
    const unique = [...new Set(ids)];
    const rows = await this.db
      .select({ id: media.id, kind: media.kind })
      .from(media)
      .where(and(inArray(media.id, unique), eq(media.ownerId, userId)));
    if (rows.length !== unique.length || rows.some((r) => !kinds.includes(r.kind))) {
      throw badRequest('media_invalid');
    }
  }

  private async replaceChildren(
    tx: Tx,
    productId: string,
    mediaIds?: string[],
    variants?: ProductInput['variants'],
  ) {
    if (mediaIds !== undefined) {
      await tx.delete(productMedia).where(eq(productMedia.productId, productId));
      const unique = [...new Set(mediaIds)];
      if (unique.length > 0) {
        await tx.insert(productMedia).values(unique.map((mediaId, sort) => ({ productId, mediaId, sort })));
      }
    }
    if (variants !== undefined) {
      await tx.delete(productVariants).where(eq(productVariants.productId, productId));
      if (variants.length > 0) {
        await tx.insert(productVariants).values(variants.map((v) => ({ ...v, productId })));
      }
    }
  }
}

export function subscriptionInfo(until: Date, now = new Date()) {
  const msLeft = until.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(msLeft / DAY));
  return {
    until,
    daysLeft,
    expired: msLeft <= 0,
    /** Reminder 5 days before the end. */
    endsSoon: msLeft > 0 && daysLeft <= 5,
  };
}
