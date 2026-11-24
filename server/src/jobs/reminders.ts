import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { AdminService } from '../admin/admin.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { formatDate } from '../notifications/texts.js';

/** Every hour: remind sellers whose subscription ends within 5 days (once a day). */
@Injectable()
export class SubscriptionReminderJob {
  private readonly logger = new Logger(SubscriptionReminderJob.name);

  constructor(
    private readonly admin: AdminService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async run(): Promise<number> {
    const shops = await this.admin.shopsEndingSoon();
    for (const shop of shops) {
      if (!shop.ownerUserId) continue;
      await this.notifications
        .notifyText(shop.ownerUserId, 'subscription.ends_soon', { date: formatDate(shop.until) }, { shopId: shop.id })
        .catch(() => this.logger.warn('reminder failed'));
    }
    await this.admin.markReminded(shops.map((s) => s.id));
    return shops.length;
  }
}
