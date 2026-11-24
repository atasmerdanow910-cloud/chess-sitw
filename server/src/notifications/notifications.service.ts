import { Injectable, Logger } from '@nestjs/common';

import { eq } from 'drizzle-orm';

import { Db, InjectDb } from '../db/db.js';
import { notifications, users } from '../db/schema.js';
import { notificationText, TextKey } from './texts.js';
import { PushService } from './push.js';
import { RealtimeService } from './realtime.js';

export interface NotifyInput {
  type: string;
  title: string;
  body?: string;
  data?: Record<string, string>;
}

/** Saves a notification, sends it live over WebSocket and (if configured) as a push. */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectDb() private readonly db: Db,
    private readonly realtime: RealtimeService,
    private readonly push: PushService,
  ) {}

  async notify(userId: string, input: NotifyInput): Promise<void> {
    const [row] = await this.db
      .insert(notifications)
      .values({ userId, type: input.type, title: input.title, body: input.body ?? '', data: input.data ?? {} })
      .returning();
    this.realtime.emitToUser(userId, 'notification', row);
    this.push
      .sendToUser(userId, input.title, input.body ?? '', { type: input.type, ...(input.data ?? {}) })
      .catch(() => this.logger.warn('push failed'));
  }

  /** Notification with a standard text, translated to the user's language. */
  async notifyText(userId: string, key: TextKey, params: Record<string, string>, data: Record<string, string> = {}) {
    const [user] = await this.db.select({ locale: users.locale }).from(users).where(eq(users.id, userId));
    if (!user) return;
    const [title, body] = notificationText(key, user.locale, params);
    await this.notify(userId, { type: key, title, body, data });
  }

  /** Push only (no stored notification) — used for chat messages. */
  pushOnly(userId: string, title: string, body: string, data: Record<string, string>): void {
    this.push.sendToUser(userId, title, body, data).catch(() => this.logger.warn('push failed'));
  }
}
