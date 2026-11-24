import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

import { AdminController } from './admin/admin.controller.js';
import { AdminService } from './admin/admin.service.js';
import { AccessResolver } from './auth/access.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { GoogleVerifier } from './auth/google.js';
import { AppThrottlerGuard, AuthGuard } from './auth/guards.js';
import { TokenService } from './auth/tokens.js';
import { CatalogController } from './catalog/catalog.controller.js';
import { CatalogService } from './catalog/catalog.service.js';
import { ChatController } from './chat/chat.controller.js';
import { ChatGateway } from './chat/chat.gateway.js';
import { ChatService } from './chat/chat.service.js';
import { AuditService } from './common/audit.js';
import { getEnv } from './config/env.js';
import { DbModule } from './db/db.js';
import { HealthController } from './health.controller.js';
import { MediaCleanupJob, SubscriptionReminderJob } from './jobs/reminders.js';
import { MeController } from './me/me.controller.js';
import { MeService } from './me/me.service.js';
import { MediaController } from './media/media.controller.js';
import { MediaService } from './media/media.service.js';
import { LocalMediaStorage, MediaStorage } from './media/storage.js';
import { NotificationsService } from './notifications/notifications.service.js';
import { PushService } from './notifications/push.js';
import { RealtimeService } from './notifications/realtime.js';
import { OrdersController } from './orders/orders.controller.js';
import { OrdersService } from './orders/orders.service.js';
import { SellerController } from './seller/seller.controller.js';
import { SellerService } from './seller/seller.service.js';

@Module({
  imports: [
    DbModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: getEnv().JWT_ACCESS_SECRET,
        signOptions: { algorithm: 'HS256', issuer: 'kerwen-market' },
        verifyOptions: { algorithms: ['HS256'], issuer: 'kerwen-market' },
      }),
    }),
    // Default limit for every endpoint; stricter limits are set per route.
    ThrottlerModule.forRoot({ throttlers: [{ name: 'default', ttl: 60_000, limit: 180 }] }),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    HealthController,
    AuthController,
    CatalogController,
    SellerController,
    MediaController,
    OrdersController,
    ChatController,
    MeController,
    AdminController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: MediaStorage, useClass: LocalMediaStorage },
    AccessResolver,
    TokenService,
    GoogleVerifier,
    AuthService,
    AuditService,
    CatalogService,
    SellerService,
    MediaService,
    RealtimeService,
    PushService,
    NotificationsService,
    OrdersService,
    ChatService,
    ChatGateway,
    MeService,
    AdminService,
    SubscriptionReminderJob,
    MediaCleanupJob,
  ],
})
export class AppModule {}
