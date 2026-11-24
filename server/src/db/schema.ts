import { sql } from 'drizzle-orm';
import {
  bigserial,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// Money is stored in tenge (1 TMT = 100 tenge) as integers.

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const userRole = pgEnum('user_role', ['buyer', 'seller', 'owner']);
export const shopStatus = pgEnum('shop_status', ['active', 'blocked']);
export const productStatus = pgEnum('product_status', ['active', 'hidden', 'blocked', 'deleted']);
export const variantKind = pgEnum('variant_kind', ['color', 'size']);
export const orderStatus = pgEnum('order_status', [
  'pending',
  'confirmed',
  'shipping',
  'delivered',
  'cancelled',
]);
export const mediaKind = pgEnum('media_kind', ['image', 'video', 'audio']);
export const messageType = pgEnum('message_type', ['text', 'photo', 'video', 'voice']);
export const reportTarget = pgEnum('report_target', ['product', 'shop', 'user', 'message']);
export const reportStatus = pgEnum('report_status', ['open', 'resolved', 'rejected']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    role: userRole('role').notNull().default('buyer'),
    name: text('name').notNull(),
    phone: text('phone'),
    email: text('email'),
    googleId: text('google_id'),
    passwordHash: text('password_hash'),
    locale: text('locale').notNull().default('ru'),
    isBlocked: boolean('is_blocked').notNull().default(false),
    failedLoginCount: integer('failed_login_count').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('users_phone_uq').on(t.phone),
    uniqueIndex('users_google_id_uq').on(t.googleId),
  ],
);

/** One row per logged-in device. Refresh token = "<id>.<secret>"; only sha256(secret) is stored. */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

export const media = pgTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  kind: mediaKind('kind').notNull(),
  mime: text('mime').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  storageKey: text('storage_key').notNull(),
  width: integer('width'),
  height: integer('height'),
  createdAt: createdAt(),
});

export const plans = pgTable('plans', {
  id: text('id').primaryKey(),
  nameRu: text('name_ru').notNull(),
  nameTk: text('name_tk').notNull(),
  priceTenge: integer('price_tenge').notNull(),
  /** null = unlimited */
  productLimit: integer('product_limit'),
  sort: integer('sort').notNull().default(0),
});

export const shops = pgTable(
  'shops',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** null until the seller claims the invite code */
    ownerUserId: uuid('owner_user_id').references(() => users.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    address: text('address').notNull().default(''),
    phone: text('phone').notNull().default(''),
    workingHours: text('working_hours').notNull().default(''),
    logoMediaId: uuid('logo_media_id').references(() => media.id, { onDelete: 'set null' }),
    legalName: text('legal_name').notNull().default(''),
    returnPolicy: text('return_policy').notNull().default(''),
    status: shopStatus('status').notNull().default('active'),
    isVerified: boolean('is_verified').notNull().default(false),
    planId: text('plan_id')
      .notNull()
      .default('trial')
      .references(() => plans.id),
    subscriptionUntil: timestamp('subscription_until', { withTimezone: true }).notNull(),
    ratingAvg: numeric('rating_avg', { precision: 3, scale: 2, mode: 'number' }).notNull().default(0),
    reviewsCount: integer('reviews_count').notNull().default(0),
    views: integer('views').notNull().default(0),
    lastReminderAt: timestamp('last_reminder_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('shops_owner_uq').on(t.ownerUserId)],
);

export const subscriptionPayments = pgTable(
  'subscription_payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id, { onDelete: 'cascade' }),
    planId: text('plan_id')
      .notNull()
      .references(() => plans.id),
    amountTenge: integer('amount_tenge').notNull(),
    paidFrom: timestamp('paid_from', { withTimezone: true }).notNull(),
    paidUntil: timestamp('paid_until', { withTimezone: true }).notNull(),
    method: text('method').notNull(),
    note: text('note').notNull().default(''),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('subscription_payments_shop_idx').on(t.shopId)],
);

export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  shopId: uuid('shop_id')
    .notNull()
    .references(() => shops.id, { onDelete: 'cascade' }),
  sellerName: text('seller_name').notNull(),
  sellerPhone: text('seller_phone').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  usedBy: uuid('used_by').references(() => users.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
});

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id'),
  nameRu: text('name_ru').notNull(),
  nameTk: text('name_tk').notNull(),
  icon: text('icon').notNull().default('category'),
  sort: integer('sort').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    priceTenge: integer('price_tenge').notNull(),
    stock: integer('stock').notNull().default(0),
    status: productStatus('status').notNull().default('active'),
    views: integer('views').notNull().default(0),
    ordersCount: integer('orders_count').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('products_shop_idx').on(t.shopId),
    index('products_category_idx').on(t.categoryId),
    index('products_created_idx').on(t.createdAt),
    check('products_price_nonneg', sql`${t.priceTenge} >= 0`),
    check('products_stock_nonneg', sql`${t.stock} >= 0`),
  ],
);

export const productMedia = pgTable(
  'product_media',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.productId, t.mediaId] })],
);

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    kind: variantKind('kind').notNull(),
    value: text('value').notNull(),
    priceDeltaTenge: integer('price_delta_tenge').notNull().default(0),
  },
  (t) => [index('product_variants_product_idx').on(t.productId)],
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    number: bigserial('number', { mode: 'number' }).notNull().unique(),
    buyerId: uuid('buyer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id, { onDelete: 'restrict' }),
    status: orderStatus('status').notNull().default('pending'),
    totalTenge: integer('total_tenge').notNull(),
    contactPhone: text('contact_phone').notNull(),
    address: text('address').notNull().default(''),
    comment: text('comment').notNull().default(''),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('orders_buyer_idx').on(t.buyerId), index('orders_shop_idx').on(t.shopId)],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    variantLabel: text('variant_label').notNull().default(''),
    title: text('title').notNull(),
    qty: integer('qty').notNull(),
    priceTenge: integer('price_tenge').notNull(),
  },
  (t) => [index('order_items_order_idx').on(t.orderId)],
);

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    buyerId: uuid('buyer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull().defaultNow(),
    buyerReadAt: timestamp('buyer_read_at', { withTimezone: true }),
    sellerReadAt: timestamp('seller_read_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('conversations_pair_uq').on(t.buyerId, t.shopId)],
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Generated on the phone: lets the app resend safely after a network error. */
    clientId: text('client_id').notNull(),
    type: messageType('type').notNull(),
    text: text('text'),
    mediaId: uuid('media_id').references(() => media.id, { onDelete: 'set null' }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index('messages_conversation_idx').on(t.conversationId, t.createdAt),
    uniqueIndex('messages_client_uq').on(t.conversationId, t.senderId, t.clientId),
  ],
);

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .unique()
    .references(() => orders.id, { onDelete: 'cascade' }),
  shopId: uuid('shop_id')
    .notNull()
    .references(() => shops.id, { onDelete: 'cascade' }),
  buyerId: uuid('buyer_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  text: text('text').notNull().default(''),
  createdAt: createdAt(),
});

export const favorites = pgTable(
  'favorites',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] })],
);

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  reporterId: uuid('reporter_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  targetType: reportTarget('target_type').notNull(),
  targetId: uuid('target_id').notNull(),
  reason: text('reason').notNull(),
  /** Copy of the reported text (e.g. a chat message) so moderation sees what was reported. */
  snapshot: text('snapshot').notNull().default(''),
  status: reportStatus('status').notNull().default('open'),
  resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: createdAt(),
});

export const banners = pgTable('banners', {
  id: uuid('id').primaryKey().defaultRandom(),
  titleRu: text('title_ru').notNull(),
  titleTk: text('title_tk').notNull(),
  subtitleRu: text('subtitle_ru').notNull().default(''),
  subtitleTk: text('subtitle_tk').notNull().default(''),
  color: text('color').notNull().default('#0F4A23'),
  mediaId: uuid('media_id').references(() => media.id, { onDelete: 'set null' }),
  shopId: uuid('shop_id').references(() => shops.id, { onDelete: 'set null' }),
  sort: integer('sort').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
});

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    data: jsonb('data').$type<Record<string, string>>().notNull().default({}),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('notifications_user_idx').on(t.userId, t.createdAt)],
);

export const deviceTokens = pgTable(
  'device_tokens',
  {
    token: text('token').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('device_tokens_user_idx').on(t.userId)],
);

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
});
