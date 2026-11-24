import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { AdminService } from '../admin/admin.service.js';
import { MediaService } from '../media/media.service.js';
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

/** Every night: remove abandoned uploads to keep the disk clean. */
@Injectable()
export class MediaCleanupJob {
  private readonly logger = new Logger(MediaCleanupJob.name);

  constructor(private readonly mediaService: MediaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async run(): Promise<number> {
    const removed = await this.mediaService.cleanupOrphans();
    if (removed > 0) this.logger.log(`Removed ${removed} unused files`);
    return removed;
  }
}
