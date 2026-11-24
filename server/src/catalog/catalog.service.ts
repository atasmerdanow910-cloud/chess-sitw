import { Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, gte, ilike, inArray, lte, sql, SQL } from 'drizzle-orm';

import { notFound } from '../common/errors.js';
import { Db, InjectDb } from '../db/db.js';
import {
  banners,
  categories,
  favorites,
  media,
  orders,
  productMedia,
  products,
  productVariants,
  reviews,
  shops,
  users,
} from '../db/schema.js';
import { mediaUrl } from '../media/signing.js';
import { productCardDto, shopDto } from './dto.js';
import { likePattern, productVisible, shopVisible } from './visibility.js';

export interface ProductQuery {
  q?: string;
  categoryId?: string;
  shopId?: string;
  minPrice?: number;
  maxPrice?: number;
  sort: 'new' | 'price_asc' | 'price_desc' | 'popular';
  limit: number;
  offset: number;
}

@Injectable()
export class CatalogService {
  constructor(@InjectDb() private readonly db: Db) {}

  async categories() {
    return this.db
      .select({
        id: categories.id,
        parentId: categories.parentId,
        nameRu: categories.nameRu,
        nameTk: categories.nameTk,
        icon: categories.icon,
      })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sort), asc(categories.nameRu));
  }

  async banners() {
    const rows = await this.db
      .select()
      .from(banners)
      .where(eq(banners.isActive, true))
      .orderBy(asc(banners.sort));
    return rows.map((b) => ({
      id: b.id,
      titleRu: b.titleRu,
      titleTk: b.titleTk,
      subtitleRu: b.subtitleRu,
      subtitleTk: b.subtitleTk,
      color: b.color,
      imageUrl: mediaUrl(b.mediaId),
      shopId: b.shopId,
    }));
  }

  /** Everything for the home screen in ONE request (slow internet). */
  async home(userId: string | null) {
    const [bannerList, categoryList, popularShops, newProducts] = await Promise.all([
      this.banners(),
      this.categories(),
      this.shops({ limit: 10, offset: 0 }),
      this.products({ sort: 'new', limit: 20, offset: 0 }, userId),
    ]);
    return { banners: bannerList, categories: categoryList, popularShops, newProducts };
  }

  async shops(query: { q?: string; categoryId?: string; limit: number; offset: number }) {
    const conditions: SQL[] = [shopVisible()];
    if (query.q) conditions.push(ilike(shops.name, likePattern(query.q)));
    if (query.categoryId) {
      conditions.push(
        sql`exists (select 1 from ${products} p where p.shop_id = ${shops.id} and p.category_id = ${query.categoryId} and p.status = 'active')`,
      );
    }
    const rows = await this.db
      .select()
      .from(shops)
      .where(and(...conditions))
      .orderBy(desc(shops.ratingAvg), desc(shops.reviewsCount), desc(shops.createdAt))
      .limit(query.limit)
      .offset(query.offset);
    const counts = await this.productCounts(rows.map((r) => r.id));
    return rows.map((s) => shopDto(s, counts.get(s.id) ?? 0));
  }

  async shop(id: string) {
    const [row] = await this.db.select().from(shops).where(and(eq(shops.id, id), shopVisible()));
    if (!row) throw notFound('shop_not_found');
    await this.db.update(shops).set({ views: sql`${shops.views} + 1` }).where(eq(shops.id, id));
    const counts = await this.productCounts([id]);
    return shopDto(row, counts.get(id) ?? 0);
  }

  private async productCounts(shopIds: string[]): Promise<Map<string, number>> {
    if (shopIds.length === 0) return new Map();
    const rows = await this.db
      .select({ shopId: products.shopId, n: count() })
      .from(products)
      .where(and(inArray(products.shopId, shopIds), eq(products.status, 'active')))
      .groupBy(products.shopId);
    return new Map(rows.map((r) => [r.shopId, Number(r.n)]));
  }

  async products(query: ProductQuery, userId: string | null) {
    const conditions: SQL[] = [productVisible()];
    if (query.q) conditions.push(ilike(products.title, likePattern(query.q)));
    if (query.categoryId) conditions.push(eq(products.categoryId, query.categoryId));
    if (query.shopId) conditions.push(eq(products.shopId, query.shopId));
    if (query.minPrice !== undefined) conditions.push(gte(products.priceTenge, query.minPrice));
    if (query.maxPrice !== undefined) conditions.push(lte(products.priceTenge, query.maxPrice));
    const order = {
      new: [desc(products.createdAt)],
      price_asc: [asc(products.priceTenge), desc(products.createdAt)],
      price_desc: [desc(products.priceTenge), desc(products.createdAt)],
      popular: [desc(products.ordersCount), desc(products.views)],
    }[query.sort];

    const rows = await this.db
      .select({ product: products, shop: shops })
      .from(products)
      .innerJoin(shops, eq(shops.id, products.shopId))
      .where(and(...conditions))
      .orderBy(...order)
      .limit(query.limit)
      .offset(query.offset);
    return this.toCards(rows, userId);
  }

  async toCards(
    rows: Array<{ product: typeof products.$inferSelect; shop: typeof shops.$inferSelect }>,
    userId: string | null,
  ) {
    const ids = rows.map((r) => r.product.id);
    const [firstMedia, favs] = await Promise.all([this.firstMedia(ids), this.favoriteSet(userId, ids)]);
    return rows.map((r) =>
      productCardDto(r.product, r.shop, firstMedia.get(r.product.id) ?? null, favs.has(r.product.id)),
    );
  }

  async firstMedia(productIds: string[]): Promise<Map<string, string>> {
    if (productIds.length === 0) return new Map();
    const rows = await this.db
      .select({ productId: productMedia.productId, mediaId: productMedia.mediaId, sort: productMedia.sort })
      .from(productMedia)
      .innerJoin(media, eq(media.id, productMedia.mediaId))
      .where(and(inArray(productMedia.productId, productIds), eq(media.kind, 'image')))
      .orderBy(asc(productMedia.sort));
    const map = new Map<string, string>();
    for (const r of rows) if (!map.has(r.productId)) map.set(r.productId, r.mediaId);
    return map;
  }

  async favoriteSet(userId: string | null, productIds: string[]): Promise<Set<string>> {
    if (!userId || productIds.length === 0) return new Set();
    const rows = await this.db
      .select({ productId: favorites.productId })
      .from(favorites)
      .where(and(eq(favorites.userId, userId), inArray(favorites.productId, productIds)));
    return new Set(rows.map((r) => r.productId));
  }

  async product(id: string, userId: string | null) {
    const [row] = await this.db
      .select({ product: products, shop: shops })
      .from(products)
      .innerJoin(shops, eq(shops.id, products.shopId))
      .where(and(eq(products.id, id), productVisible()));
    if (!row) throw notFound('product_not_found');
    await this.db.update(products).set({ views: sql`${products.views} + 1` }).where(eq(products.id, id));
    return this.productDetails(row.product, row.shop, userId);
  }

  async productDetails(
    product: typeof products.$inferSelect,
    shop: typeof shops.$inferSelect,
    userId: string | null,
  ) {
    const [mediaRows, variants, favs, counts] = await Promise.all([
      this.db
        .select({ id: media.id, kind: media.kind, width: media.width, height: media.height })
        .from(productMedia)
        .innerJoin(media, eq(media.id, productMedia.mediaId))
        .where(eq(productMedia.productId, product.id))
        .orderBy(asc(productMedia.sort)),
      this.db
        .select({
          id: productVariants.id,
          kind: productVariants.kind,
          value: productVariants.value,
          priceDeltaTenge: productVariants.priceDeltaTenge,
        })
        .from(productVariants)
        .where(eq(productVariants.productId, product.id))
        .orderBy(asc(productVariants.kind), asc(productVariants.value)),
      this.favoriteSet(userId, [product.id]),
      this.productCounts([shop.id]),
    ]);
    return {
      id: product.id,
      title: product.title,
      description: product.description,
      priceTenge: product.priceTenge,
      stock: product.stock,
      status: product.status,
      categoryId: product.categoryId,
      views: product.views,
      createdAt: product.createdAt,
      media: mediaRows.map((m) => ({ id: m.id, kind: m.kind, url: mediaUrl(m.id), width: m.width, height: m.height })),
      variants,
      isFavorite: favs.has(product.id),
      shop: shopDto(shop, counts.get(shop.id) ?? 0),
    };
  }

  async shopReviews(shopId: string, limit: number, offset: number) {
    const rows = await this.db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        text: reviews.text,
        createdAt: reviews.createdAt,
        buyerName: users.name,
      })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.buyerId))
      .innerJoin(orders, eq(orders.id, reviews.orderId))
      .where(eq(reviews.shopId, shopId))
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);
    // Show only the first name and an initial: "Merdan G."
    return rows.map((r) => ({ ...r, buyerName: shortName(r.buyerName) }));
  }
}

export function shortName(name: string): string {
  const [first, second] = name.trim().split(/\s+/);
  return second ? `${first} ${second[0]}.` : first;
}
