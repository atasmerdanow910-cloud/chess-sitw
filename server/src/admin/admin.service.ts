import { Injectable, Logger } from '@nestjs/common';
import { and, asc, count, desc, eq, gt, gte, ilike, inArray, isNull, lte, or, sql, sum, SQL } from 'drizzle-orm';
import { randomInt } from 'node:crypto';

import { AuditService } from '../common/audit.js';
import { AuthUser } from '../common/auth-context.js';
import { badRequest, conflict, notFound } from '../common/errors.js';
import { normalizePhone } from '../common/phone.js';
import { Db, InjectDb } from '../db/db.js';
import {
  auditLog,
  banners,
  categories,
  invites,
  notifications,
  orders,
  plans,
  products,
  reports,
  shops,
  subscriptionPayments,
  users,
} from '../db/schema.js';
import { TokenService } from '../auth/tokens.js';
import { likePattern } from '../catalog/visibility.js';
import { mediaUrl } from '../media/signing.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { RealtimeService } from '../notifications/realtime.js';
import { formatDate } from '../notifications/texts.js';

const DAY = 86_400_000;
const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I

export function newInviteCode(length = 10): string {
  let code = '';
  for (let i = 0; i < length; i++) code += INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)];
  return code;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

export type ShopFilter = 'all' | 'active' | 'expired' | 'blocked' | 'unclaimed' | 'ending';

/** Owner (super-admin) actions. Every change is written to the audit log. */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectDb() private readonly db: Db,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeService,
    private readonly tokens: TokenService,
  ) {}

  async stats() {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const [roles, shopRows, orderRows, [revenueAll], [revenueMonth], [newUsers], [openReports]] = await Promise.all([
      this.db.select({ role: users.role, n: count() }).from(users).groupBy(users.role),
      this.db
        .select({
          total: count(),
          active: sql<number>`count(*) filter (where ${shops.status} = 'active' and ${shops.subscriptionUntil} > now() and ${shops.ownerUserId} is not null)::int`,
          expired: sql<number>`count(*) filter (where ${shops.subscriptionUntil} <= now())::int`,
          blocked: sql<number>`count(*) filter (where ${shops.status} = 'blocked')::int`,
          unclaimed: sql<number>`count(*) filter (where ${shops.ownerUserId} is null)::int`,
        })
        .from(shops),
      this.db.select({ status: orders.status, n: count() }).from(orders).groupBy(orders.status),
      this.db.select({ total: sum(subscriptionPayments.amountTenge) }).from(subscriptionPayments),
      this.db
        .select({ total: sum(subscriptionPayments.amountTenge) })
        .from(subscriptionPayments)
        .where(gte(subscriptionPayments.createdAt, monthStart)),
      this.db.select({ n: count() }).from(users).where(gte(users.createdAt, new Date(Date.now() - 7 * DAY))),
      this.db.select({ n: count() }).from(reports).where(eq(reports.status, 'open')),
    ]);
    return {
      users: Object.fromEntries(roles.map((r) => [r.role, Number(r.n)])),
      newUsersLast7Days: Number(newUsers.n),
      shops: shopRows[0],
      orders: Object.fromEntries(orderRows.map((o) => [o.status, Number(o.n)])),
      revenueTenge: { total: Number(revenueAll.total ?? 0), thisMonth: Number(revenueMonth.total ?? 0) },
      openReports: Number(openReports.n),
    };
  }

  async listShops(query: { q?: string; filter: ShopFilter; limit: number; offset: number }) {
    const conditions: SQL[] = [];
    if (query.q) conditions.push(ilike(shops.name, likePattern(query.q)));
    const now = sql`now()`;
    switch (query.filter) {
      case 'active':
        conditions.push(eq(shops.status, 'active'), gt(shops.subscriptionUntil, now));
        break;
      case 'expired':
        conditions.push(lte(shops.subscriptionUntil, now));
        break;
      case 'blocked':
        conditions.push(eq(shops.status, 'blocked'));
        break;
      case 'unclaimed':
        conditions.push(isNull(shops.ownerUserId));
        break;
      case 'ending':
        conditions.push(gt(shops.subscriptionUntil, now), lte(shops.subscriptionUntil, sql`now() + interval '5 days'`));
        break;
    }
    const rows = await this.db
      .select({ shop: shops, ownerName: users.name, ownerPhone: users.phone })
      .from(shops)
      .leftJoin(users, eq(users.id, shops.ownerUserId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(shops.subscriptionUntil))
      .limit(query.limit)
      .offset(query.offset);
    return rows.map((r) => this.shopRow(r.shop, r.ownerName, r.ownerPhone));
  }

  private shopRow(shop: typeof shops.$inferSelect, ownerName: string | null, ownerPhone: string | null) {
    return {
      id: shop.id,
      name: shop.name,
      status: shop.status,
      isVerified: shop.isVerified,
      planId: shop.planId,
      subscriptionUntil: shop.subscriptionUntil,
      logoUrl: mediaUrl(shop.logoMediaId),
      claimed: shop.ownerUserId !== null,
      owner: shop.ownerUserId ? { id: shop.ownerUserId, name: ownerName, phone: ownerPhone } : null,
      rating: Number(shop.ratingAvg),
      createdAt: shop.createdAt,
    };
  }

  async getShop(id: string) {
    const [row] = await this.db
      .select({ shop: shops, ownerName: users.name, ownerPhone: users.phone })
      .from(shops)
      .leftJoin(users, eq(users.id, shops.ownerUserId))
      .where(eq(shops.id, id));
    if (!row) throw notFound('shop_not_found');
    const [payments, inviteRows, [productCount]] = await Promise.all([
      this.payments(id),
      this.db.select().from(invites).where(eq(invites.shopId, id)).orderBy(desc(invites.createdAt)).limit(5),
      this.db.select({ n: count() }).from(products).where(and(eq(products.shopId, id), sql`${products.status} <> 'deleted'`)),
    ]);
    return {
      ...this.shopRow(row.shop, row.ownerName, row.ownerPhone),
      address: row.shop.address,
      phone: row.shop.phone,
      productsCount: Number(productCount.n),
      payments,
      invites: inviteRows.map((i) => ({
        code: i.code,
        sellerName: i.sellerName,
        sellerPhone: i.sellerPhone,
        expiresAt: i.expiresAt,
        usedAt: i.usedAt,
      })),
    };
  }

  /** Owner met the seller in person: create the shop + an invite code for the seller. */
  async createShop(
    actor: AuthUser,
    input: { shopName: string; sellerName: string; sellerPhone: string; planId: string; trialDays: number },
  ) {
    const phone = normalizePhone(input.sellerPhone);
    if (!phone) throw badRequest('invalid_phone');
    const [plan] = await this.db.select().from(plans).where(eq(plans.id, input.planId));
    if (!plan) throw badRequest('plan_not_found');
    const result = await this.db.transaction(async (tx) => {
      const [shop] = await tx
        .insert(shops)
        .values({
          name: input.shopName,
          phone,
          planId: plan.id,
          subscriptionUntil: new Date(Date.now() + input.trialDays * DAY),
        })
        .returning();
      const [invite] = await tx
        .insert(invites)
        .values({
          code: newInviteCode(),
          shopId: shop.id,
          sellerName: input.sellerName,
          sellerPhone: phone,
          expiresAt: new Date(Date.now() + 14 * DAY),
          createdBy: actor.id,
        })
        .returning();
      await this.audit.log(actor.id, 'shop.create', 'shop', shop.id, { name: shop.name, planId: plan.id }, tx);
      return { shopId: shop.id, invite: { code: invite.code, expiresAt: invite.expiresAt } };
    });
    return { shop: await this.getShop(result.shopId), invite: result.invite };
  }

  async regenerateInvite(actor: AuthUser, shopId: string) {
    const [shop] = await this.db.select().from(shops).where(eq(shops.id, shopId));
    if (!shop) throw notFound('shop_not_found');
    if (shop.ownerUserId) throw conflict('shop_already_claimed');
    const [last] = await this.db.select().from(invites).where(eq(invites.shopId, shopId)).orderBy(desc(invites.createdAt)).limit(1);
    const invite = await this.db.transaction(async (tx) => {
      // Old unused codes stop working.
      await tx
        .update(invites)
        .set({ expiresAt: new Date() })
        .where(and(eq(invites.shopId, shopId), isNull(invites.usedAt)));
      const [row] = await tx
        .insert(invites)
        .values({
          code: newInviteCode(),
          shopId,
          sellerName: last?.sellerName ?? shop.name,
          sellerPhone: last?.sellerPhone ?? shop.phone,
          expiresAt: new Date(Date.now() + 14 * DAY),
          createdBy: actor.id,
        })
        .returning();
      await this.audit.log(actor.id, 'invite.regenerate', 'shop', shopId, {}, tx);
      return row;
    });
    return { code: invite.code, expiresAt: invite.expiresAt };
  }

  async updateShop(
    actor: AuthUser,
    id: string,
    input: { status?: 'active' | 'blocked'; isVerified?: boolean; planId?: string; name?: string },
  ) {
    const [shop] = await this.db.select().from(shops).where(eq(shops.id, id));
    if (!shop) throw notFound('shop_not_found');
    if (input.planId) {
      const [plan] = await this.db.select({ id: plans.id }).from(plans).where(eq(plans.id, input.planId));
      if (!plan) throw badRequest('plan_not_found');
    }
    await this.db.update(shops).set(input).where(eq(shops.id, id));
    await this.audit.log(actor.id, 'shop.update', 'shop', id, { ...input });
    if (input.status && input.status !== shop.status && shop.ownerUserId) {
      const key = input.status === 'blocked' ? 'shop.blocked' : 'shop.unblocked';
      await this.notifications.notifyText(shop.ownerUserId, key, {}).catch(() => undefined);
    }
    return this.getShop(id);
  }

  /** Records a manual payment (cash/transfer) and extends the subscription. */
  async addPayment(
    actor: AuthUser,
    shopId: string,
    input: { planId: string; amountTenge: number; months: number; method: string; note: string },
  ) {
    const [plan] = await this.db.select().from(plans).where(eq(plans.id, input.planId));
    if (!plan) throw badRequest('plan_not_found');
    const result = await this.db.transaction(async (tx) => {
      const [shop] = await tx.select().from(shops).where(eq(shops.id, shopId)).for('update');
      if (!shop) throw notFound('shop_not_found');
      const now = new Date();
      // Paying early adds time after the current end date; paying late starts from today.
      const paidFrom = shop.subscriptionUntil > now ? shop.subscriptionUntil : now;
      const paidUntil = addMonths(paidFrom, input.months);
      const [payment] = await tx
        .insert(subscriptionPayments)
        .values({
          shopId,
          planId: plan.id,
          amountTenge: input.amountTenge,
          paidFrom,
          paidUntil,
          method: input.method,
          note: input.note,
          createdBy: actor.id,
        })
        .returning();
      await tx
        .update(shops)
        .set({ subscriptionUntil: paidUntil, planId: plan.id, lastReminderAt: null })
        .where(eq(shops.id, shopId));
      await this.audit.log(
        actor.id,
        'subscription.extend',
        'shop',
        shopId,
        { amountTenge: input.amountTenge, months: input.months, paidUntil: paidUntil.toISOString(), planId: plan.id },
        tx,
      );
      return { payment, ownerUserId: shop.ownerUserId, paidUntil };
    });
    if (result.ownerUserId) {
      await this.notifications
        .notifyText(result.ownerUserId, 'subscription.extended', { date: formatDate(result.paidUntil) })
        .catch(() => undefined);
    }
    return result.payment;
  }

  async payments(shopId?: string, limit = 100) {
    const rows = await this.db
      .select({ p: subscriptionPayments, shopName: shops.name, createdByName: users.name })
      .from(subscriptionPayments)
      .innerJoin(shops, eq(shops.id, subscriptionPayments.shopId))
      .leftJoin(users, eq(users.id, subscriptionPayments.createdBy))
      .where(shopId ? eq(subscriptionPayments.shopId, shopId) : undefined)
      .orderBy(desc(subscriptionPayments.createdAt))
      .limit(limit);
    return rows.map((r) => ({ ...r.p, shopName: r.shopName, createdByName: r.createdByName }));
  }

  async listUsers(query: { q?: string; role?: 'buyer' | 'seller' | 'owner'; limit: number; offset: number }) {
    const conditions: SQL[] = [];
    if (query.q) {
      conditions.push(or(ilike(users.name, likePattern(query.q)), ilike(users.phone, likePattern(query.q))) as SQL);
    }
    if (query.role) conditions.push(eq(users.role, query.role));
    return this.db
      .select({
        id: users.id,
        name: users.name,
        phone: users.phone,
        email: users.email,
        role: users.role,
        isBlocked: users.isBlocked,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(users.createdAt))
      .limit(query.limit)
      .offset(query.offset);
  }

  async setUserBlocked(actor: AuthUser, userId: string, isBlocked: boolean) {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!user) throw notFound('user_not_found');
    if (user.role === 'owner') throw badRequest('cannot_block_owner');
    await this.db.update(users).set({ isBlocked }).where(eq(users.id, userId));
    if (isBlocked) {
      await this.tokens.revokeAll(userId);
      this.realtime.disconnectUser(userId);
    }
    await this.audit.log(actor.id, isBlocked ? 'user.block' : 'user.unblock', 'user', userId);
    return { id: userId, isBlocked };
  }

  async listReports(status: 'open' | 'resolved' | 'rejected' | undefined, limit: number, offset: number) {
    return this.db
      .select({
        id: reports.id,
        targetType: reports.targetType,
        targetId: reports.targetId,
        reason: reports.reason,
        snapshot: reports.snapshot,
        status: reports.status,
        createdAt: reports.createdAt,
        reporterName: users.name,
      })
      .from(reports)
      .innerJoin(users, eq(users.id, reports.reporterId))
      .where(status ? eq(reports.status, status) : undefined)
      .orderBy(desc(reports.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async resolveReport(actor: AuthUser, id: string, status: 'resolved' | 'rejected') {
    const updated = await this.db
      .update(reports)
      .set({ status, resolvedBy: actor.id, resolvedAt: new Date() })
      .where(eq(reports.id, id))
      .returning({ id: reports.id });
    if (updated.length === 0) throw notFound();
    await this.audit.log(actor.id, `report.${status}`, 'report', id);
    return { id, status };
  }

  async listProducts(query: { q?: string; status?: 'active' | 'hidden' | 'blocked'; limit: number; offset: number }) {
    const conditions: SQL[] = [sql`${products.status} <> 'deleted'`];
    if (query.q) conditions.push(ilike(products.title, likePattern(query.q)));
    if (query.status) conditions.push(eq(products.status, query.status));
    return this.db
      .select({
        id: products.id,
        title: products.title,
        priceTenge: products.priceTenge,
        status: products.status,
        shopId: shops.id,
        shopName: shops.name,
        createdAt: products.createdAt,
      })
      .from(products)
      .innerJoin(shops, eq(shops.id, products.shopId))
      .where(and(...conditions))
      .orderBy(desc(products.createdAt))
      .limit(query.limit)
      .offset(query.offset);
  }

  /** Moderation: hide (block) or restore a product. */
  async setProductStatus(actor: AuthUser, id: string, status: 'blocked' | 'active') {
    const [row] = await this.db
      .select({ p: products, ownerUserId: shops.ownerUserId })
      .from(products)
      .innerJoin(shops, eq(shops.id, products.shopId))
      .where(eq(products.id, id));
    if (!row || row.p.status === 'deleted') throw notFound('product_not_found');
    await this.db.update(products).set({ status, updatedAt: new Date() }).where(eq(products.id, id));
    await this.audit.log(actor.id, `product.${status === 'blocked' ? 'block' : 'unblock'}`, 'product', id);
    if (status === 'blocked' && row.ownerUserId) {
      await this.notifications.notifyText(row.ownerUserId, 'product.blocked', { title: row.p.title }).catch(() => undefined);
    }
    return { id, status };
  }

  allCategories() {
    return this.db.select().from(categories).orderBy(asc(categories.sort), asc(categories.nameRu));
  }

  async createCategory(actor: AuthUser, input: typeof categories.$inferInsert) {
    const [row] = await this.db.insert(categories).values(input).returning();
    await this.audit.log(actor.id, 'category.create', 'category', row.id, { nameRu: row.nameRu });
    return row;
  }

  async updateCategory(actor: AuthUser, id: string, input: Partial<typeof categories.$inferInsert>) {
    const [row] = await this.db.update(categories).set(input).where(eq(categories.id, id)).returning();
    if (!row) throw notFound();
    await this.audit.log(actor.id, 'category.update', 'category', id, { ...input });
    return row;
  }

  allBanners() {
    return this.db.select().from(banners).orderBy(asc(banners.sort));
  }

  async createBanner(actor: AuthUser, input: typeof banners.$inferInsert) {
    const [row] = await this.db.insert(banners).values(input).returning();
    await this.audit.log(actor.id, 'banner.create', 'banner', row.id);
    return row;
  }

  async updateBanner(actor: AuthUser, id: string, input: Partial<typeof banners.$inferInsert>) {
    const [row] = await this.db.update(banners).set(input).where(eq(banners.id, id)).returning();
    if (!row) throw notFound();
    await this.audit.log(actor.id, 'banner.update', 'banner', id);
    return row;
  }

  async deleteBanner(actor: AuthUser, id: string) {
    await this.db.delete(banners).where(eq(banners.id, id));
    await this.audit.log(actor.id, 'banner.delete', 'banner', id);
  }

  allPlans() {
    return this.db.select().from(plans).orderBy(asc(plans.sort));
  }

  async updatePlan(actor: AuthUser, id: string, input: Partial<typeof plans.$inferInsert>) {
    const [row] = await this.db.update(plans).set(input).where(eq(plans.id, id)).returning();
    if (!row) throw notFound();
    await this.audit.log(actor.id, 'plan.update', 'plan', id, { ...input });
    return row;
  }

  /** Message to everyone / all buyers / all sellers. Shows in the app's notifications. */
  async broadcast(actor: AuthUser, input: { title: string; body: string; audience: 'all' | 'buyers' | 'sellers' }) {
    const roleFilter =
      input.audience === 'buyers' ? eq(users.role, 'buyer') : input.audience === 'sellers' ? eq(users.role, 'seller') : undefined;
    const recipients = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.isBlocked, false), roleFilter));
    for (let i = 0; i < recipients.length; i += 1000) {
      const chunk = recipients.slice(i, i + 1000);
      await this.db.insert(notifications).values(
        chunk.map((u) => ({ userId: u.id, type: 'broadcast', title: input.title, body: input.body })),
      );
    }
    for (const u of recipients) {
      this.realtime.emitToUser(u.id, 'notification', { type: 'broadcast', title: input.title, body: input.body });
    }
    await this.audit.log(actor.id, 'broadcast.send', 'broadcast', input.audience, {
      title: input.title,
      recipients: recipients.length,
    });
    return { recipients: recipients.length };
  }

  auditLog(limit: number, offset: number) {
    return this.db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        targetType: auditLog.targetType,
        targetId: auditLog.targetId,
        details: auditLog.details,
        createdAt: auditLog.createdAt,
        actorName: users.name,
      })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.actorId))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /** Used by the daily reminder job. */
  async shopsEndingSoon() {
    return this.db
      .select({ id: shops.id, ownerUserId: shops.ownerUserId, until: shops.subscriptionUntil })
      .from(shops)
      .where(
        and(
          sql`${shops.ownerUserId} is not null`,
          gt(shops.subscriptionUntil, sql`now()`),
          lte(shops.subscriptionUntil, sql`now() + interval '5 days'`),
          or(isNull(shops.lastReminderAt), lte(shops.lastReminderAt, sql`now() - interval '23 hours'`)),
        ),
      );
  }

  async markReminded(ids: string[]) {
    if (ids.length) await this.db.update(shops).set({ lastReminderAt: new Date() }).where(inArray(shops.id, ids));
  }
}
