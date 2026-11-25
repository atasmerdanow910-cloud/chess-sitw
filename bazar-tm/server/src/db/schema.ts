import { bigint, boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Database tables as TypeScript, used for type-safe, parameterized queries.
 * The SQL that creates them lives in migrations/; a test checks both stay in sync.
 */

export const userRole = pgEnum('user_role', ['owner', 'seller', 'buyer']);
export const shopStatus = pgEnum('shop_status', ['pending', 'active', 'blocked']);

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  role: userRole('role').notNull().default('buyer'),
  name: text('name').notNull(),
  /** E.164 without spaces: +99365123456. */
  phone: text('phone').unique(),
  email: text('email'),
  googleId: text('google_id').unique(),
  passwordHash: text('password_hash'),
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  locale: text('locale').notNull().default('ru'),
  isBlocked: boolean('is_blocked').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const shops = pgTable('shops', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerUserId: uuid('owner_user_id')
    .unique()
    .references(() => users.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  logo: text('logo'),
  description: text('description'),
  address: text('address'),
  phone: text('phone'),
  status: shopStatus('status').notNull().default('pending'),
  subscriptionUntil: timestamp('subscription_until', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** SHA-256 of the code: a database leak does not reveal codes that still work. */
  codeHash: text('code_hash').notNull().unique(),
  shopId: uuid('shop_id')
    .notNull()
    .references(() => shops.id, { onDelete: 'cascade' }),
  sellerName: text('seller_name').notNull(),
  sellerPhone: text('seller_phone'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  usedBy: uuid('used_by').references(() => users.id),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: createdAt(),
});

/** One row per signed-in device. The refresh token is stored only as a hash. */
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  refreshHash: text('refresh_hash').notNull(),
  /** The previous refresh token, to recognise a stolen token being reused. */
  prevRefreshHash: text('prev_refresh_hash'),
  rotatedAt: timestamp('rotated_at', { withTimezone: true }),
  userAgent: text('user_agent'),
  createdAt: createdAt(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

/** Who did what in the owner and security area. Only ids, no personal data. */
export const auditLog = pgTable('audit_log', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: text('target_id'),
  meta: jsonb('meta').notNull().default({}),
  createdAt: createdAt(),
});

export const schema = { userRole, shopStatus, users, shops, invites, sessions, auditLog };

export type UserRow = typeof users.$inferSelect;
export type ShopRow = typeof shops.$inferSelect;
export type InviteRow = typeof invites.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type Role = UserRow['role'];
