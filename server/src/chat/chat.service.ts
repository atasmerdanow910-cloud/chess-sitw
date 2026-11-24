import { Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, gt, inArray, isNull, lt, ne, or, sql } from 'drizzle-orm';

import { AuthUser } from '../common/auth-context.js';
import { badRequest, notFound } from '../common/errors.js';
import { Db, InjectDb } from '../db/db.js';
import { conversations, media, messages, orders, products, shops, users } from '../db/schema.js';
import { shopSummary } from '../catalog/dto.js';
import { shopVisible } from '../catalog/visibility.js';
import { mediaUrl } from '../media/signing.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { RealtimeService } from '../notifications/realtime.js';

type MessageRow = typeof messages.$inferSelect;
type ConversationRow = typeof conversations.$inferSelect;

export interface SendInput {
  clientId: string;
  type: 'text' | 'photo' | 'video' | 'voice';
  text?: string;
  mediaId?: string;
}

interface Participants {
  conversation: ConversationRow;
  buyerId: string;
  sellerId: string | null;
  shopName: string;
  /** The current user's side. */
  side: 'buyer' | 'seller';
}

const MEDIA_KIND: Record<SendInput['type'], 'image' | 'video' | 'audio' | null> = {
  text: null,
  photo: 'image',
  video: 'video',
  voice: 'audio',
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectDb() private readonly db: Db,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Checks on EVERY call that the user is one of the two participants.
   * Strangers get "not found" (we don't reveal that the chat exists).
   */
  async participants(user: Pick<AuthUser, 'id'>, conversationId: string): Promise<Participants> {
    const [row] = await this.db
      .select({ conversation: conversations, sellerId: shops.ownerUserId, shopName: shops.name })
      .from(conversations)
      .innerJoin(shops, eq(shops.id, conversations.shopId))
      .where(eq(conversations.id, conversationId));
    if (!row) throw notFound('chat_not_found');
    const side = row.conversation.buyerId === user.id ? 'buyer' : row.sellerId === user.id ? 'seller' : null;
    if (!side) throw notFound('chat_not_found');
    return {
      conversation: row.conversation,
      buyerId: row.conversation.buyerId,
      sellerId: row.sellerId,
      shopName: row.shopName,
      side,
    };
  }

  /** Buyer opens (or reopens) the chat with a shop, optionally about a product/order. */
  async open(user: AuthUser, input: { shopId: string; productId?: string; orderId?: string }) {
    if (user.shopId === input.shopId) throw badRequest('own_shop');
    const [shop] = await this.db.select({ id: shops.id }).from(shops).where(and(eq(shops.id, input.shopId), shopVisible()));
    if (!shop) {
      // Allow chatting about an existing order even if the shop is now hidden.
      const [order] = input.orderId
        ? await this.db
            .select({ id: orders.id })
            .from(orders)
            .where(and(eq(orders.id, input.orderId), eq(orders.buyerId, user.id), eq(orders.shopId, input.shopId)))
        : [];
      if (!order) throw badRequest('shop_unavailable');
    }
    if (input.productId) {
      const [p] = await this.db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, input.productId), eq(products.shopId, input.shopId)));
      if (!p) throw badRequest('product_unavailable');
    }
    if (input.orderId) {
      const [o] = await this.db
        .select({ id: orders.id })
        .from(orders)
        .where(and(eq(orders.id, input.orderId), eq(orders.buyerId, user.id), eq(orders.shopId, input.shopId)));
      if (!o) throw badRequest('order_not_found');
    }
    const [conversation] = await this.db
      .insert(conversations)
      .values({ buyerId: user.id, shopId: input.shopId, productId: input.productId, orderId: input.orderId })
      .onConflictDoUpdate({
        target: [conversations.buyerId, conversations.shopId],
        set: {
          productId: input.productId ? input.productId : sql`${conversations.productId}`,
          orderId: input.orderId ? input.orderId : sql`${conversations.orderId}`,
        },
      })
      .returning();
    const [dto] = await this.listDtos(user, [conversation.id]);
    return dto;
  }

  /** All chats of the user: as a buyer and, for sellers, chats of their shop. */
  async list(user: AuthUser) {
    const rows = await this.db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        user.shopId
          ? or(eq(conversations.buyerId, user.id), eq(conversations.shopId, user.shopId))
          : eq(conversations.buyerId, user.id),
      )
      .orderBy(desc(conversations.lastMessageAt))
      .limit(200);
    return this.listDtos(user, rows.map((r) => r.id));
  }

  private async listDtos(user: AuthUser, ids: string[]) {
    if (ids.length === 0) return [];
    const rows = await this.db
      .select({ c: conversations, shop: shops, buyerName: users.name, productTitle: products.title })
      .from(conversations)
      .innerJoin(shops, eq(shops.id, conversations.shopId))
      .innerJoin(users, eq(users.id, conversations.buyerId))
      .leftJoin(products, eq(products.id, conversations.productId))
      .where(inArray(conversations.id, ids))
      .orderBy(desc(conversations.lastMessageAt));

    const lastMessages = await this.db
      .selectDistinctOn([messages.conversationId])
      .from(messages)
      .where(inArray(messages.conversationId, ids))
      .orderBy(messages.conversationId, desc(messages.createdAt));
    const lastBy = new Map(lastMessages.map((m) => [m.conversationId, m]));

    const unread = await this.db
      .select({ conversationId: messages.conversationId, n: sql<number>`count(*)::int` })
      .from(messages)
      .innerJoin(conversations, eq(conversations.id, messages.conversationId))
      .where(
        and(
          inArray(messages.conversationId, ids),
          ne(messages.senderId, user.id),
          or(
            and(
              eq(conversations.buyerId, user.id),
              or(isNull(conversations.buyerReadAt), gt(messages.createdAt, conversations.buyerReadAt)),
            ),
            and(
              ne(conversations.buyerId, user.id),
              or(isNull(conversations.sellerReadAt), gt(messages.createdAt, conversations.sellerReadAt)),
            ),
          ),
        ),
      )
      .groupBy(messages.conversationId);
    const unreadBy = new Map(unread.map((u) => [u.conversationId, Number(u.n)]));

    return rows.map(({ c, shop, buyerName, productTitle }) => {
      const side = c.buyerId === user.id ? 'buyer' : 'seller';
      const last = lastBy.get(c.id);
      return {
        id: c.id,
        side,
        shop: shopSummary(shop),
        // The seller sees the buyer's name; the buyer sees the shop.
        peerName: side === 'buyer' ? shop.name : buyerName,
        productId: c.productId,
        productTitle: productTitle ?? null,
        orderId: c.orderId,
        lastMessageAt: c.lastMessageAt,
        lastMessage: last ? this.preview(last) : null,
        unreadCount: unreadBy.get(c.id) ?? 0,
      };
    });
  }

  private preview(m: MessageRow) {
    return { type: m.type, text: m.type === 'text' ? (m.text ?? '').slice(0, 120) : null, senderId: m.senderId, createdAt: m.createdAt };
  }

  async history(user: AuthUser, conversationId: string, before: Date | undefined, limit: number) {
    const p = await this.participants(user, conversationId);
    const conditions = [eq(messages.conversationId, conversationId)];
    if (before) conditions.push(lt(messages.createdAt, before));
    const rows = await this.db
      .select({ m: messages, kind: media.kind })
      .from(messages)
      .leftJoin(media, eq(media.id, messages.mediaId))
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
    // Opening the chat = messages from the other side are delivered.
    const undelivered = rows.filter((r) => r.m.senderId !== user.id && !r.m.deliveredAt).map((r) => r.m.id);
    if (undelivered.length > 0) {
      const now = new Date();
      await this.db.update(messages).set({ deliveredAt: now }).where(inArray(messages.id, undelivered));
      const peer = p.side === 'buyer' ? p.sellerId : p.buyerId;
      if (peer) {
        this.realtime.emitToUser(peer, 'chat:status', { conversationId, messageIds: undelivered, deliveredAt: now });
      }
    }
    return rows.reverse().map((r) => this.messageDto(r.m));
  }

  messageDto(m: MessageRow) {
    return {
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      clientId: m.clientId,
      type: m.type,
      text: m.text,
      // Chat files: short-lived link (~1 hour), only participants get it.
      mediaUrl: mediaUrl(m.mediaId, 'private'),
      createdAt: m.createdAt,
      deliveredAt: m.deliveredAt,
      readAt: m.readAt,
    };
  }

  async send(user: AuthUser, conversationId: string, input: SendInput) {
    const p = await this.participants(user, conversationId);
    const needKind = MEDIA_KIND[input.type];
    if (input.type === 'text' && !input.text?.trim()) throw badRequest('message_empty');
    if (needKind) {
      if (!input.mediaId) throw badRequest('media_required');
      const [file] = await this.db
        .select({ kind: media.kind })
        .from(media)
        .where(and(eq(media.id, input.mediaId), eq(media.ownerId, user.id)));
      if (!file || file.kind !== needKind) throw badRequest('media_invalid');
    }

    // Same clientId again (resend after a network error) returns the first message.
    const inserted = await this.db
      .insert(messages)
      .values({
        conversationId,
        senderId: user.id,
        clientId: input.clientId,
        type: input.type,
        text: input.text?.trim() || null,
        mediaId: needKind ? input.mediaId : null,
      })
      .onConflictDoNothing()
      .returning();
    if (inserted.length === 0) {
      const [existing] = await this.db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversationId),
            eq(messages.senderId, user.id),
            eq(messages.clientId, input.clientId),
          ),
        );
      return this.messageDto(existing);
    }
    const message = inserted[0];
    const readField = p.side === 'buyer' ? { buyerReadAt: message.createdAt } : { sellerReadAt: message.createdAt };
    await this.db
      .update(conversations)
      .set({ lastMessageAt: message.createdAt, ...readField })
      .where(eq(conversations.id, conversationId));

    const dto = this.messageDto(message);
    const peer = p.side === 'buyer' ? p.sellerId : p.buyerId;
    this.realtime.emitToUser(user.id, 'chat:message', dto);
    if (peer) {
      this.realtime.emitToUser(peer, 'chat:message', dto);
      const online = await this.realtime.isOnline(peer);
      if (!online) {
        const title = p.side === 'buyer' ? user.name : p.shopName;
        const body = input.type === 'text' ? (input.text ?? '').slice(0, 100) : `[${input.type}]`;
        this.notifications.pushOnly(peer, title, body, { type: 'chat', conversationId });
      }
    }
    return dto;
  }

  async markRead(user: AuthUser, conversationId: string) {
    const p = await this.participants(user, conversationId);
    const now = new Date();
    const field = p.side === 'buyer' ? { buyerReadAt: now } : { sellerReadAt: now };
    await this.db.update(conversations).set(field).where(eq(conversations.id, conversationId));
    await this.db
      .update(messages)
      .set({ readAt: now, deliveredAt: sql`coalesce(${messages.deliveredAt}, ${now})` })
      .where(and(eq(messages.conversationId, conversationId), ne(messages.senderId, user.id), isNull(messages.readAt)));
    const peer = p.side === 'buyer' ? p.sellerId : p.buyerId;
    if (peer) this.realtime.emitToUser(peer, 'chat:read', { conversationId, readAt: now });
    return { readAt: now };
  }

  /** For the "typing…" indicator. Returns the other participant or null. */
  async peerOf(user: Pick<AuthUser, 'id'>, conversationId: string): Promise<string | null> {
    try {
      const p = await this.participants(user, conversationId);
      return p.side === 'buyer' ? p.sellerId : p.buyerId;
    } catch {
      return null;
    }
  }

  /** Text of a message for a report (only if the reporter can see it). */
  async messageForReport(user: AuthUser, messageId: string): Promise<string | null> {
    const [m] = await this.db.select().from(messages).where(eq(messages.id, messageId));
    if (!m) return null;
    try {
      await this.participants(user, m.conversationId);
    } catch {
      return null;
    }
    this.logger.debug('message reported');
    return m.text ?? `[${m.type}]`;
  }
}
