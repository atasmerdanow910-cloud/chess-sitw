import { DynamicModule, Global, Inject, Module, OnApplicationShutdown, Provider } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import Redis from 'ioredis';
import { AdminUsersController } from './admin/admin-users.controller';
import { AuditModule } from './audit/audit.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { GOOGLE_VERIFIER, GoogleVerifier, JoseGoogleVerifier } from './auth/google-verifier';
import { AuthGuard, RolesGuard } from './auth/guards';
import { PasswordService } from './auth/password.service';
import { TokensService } from './auth/tokens.service';
import { MemoryRateLimitStore, RATE_LIMIT_STORE, RateLimitGuard, RateLimitStore, RedisRateLimitStore } from './common/rate-limit';
import { CONFIG, ConfigModule } from './config/config.module';
import { AppConfig } from './config/env';
import { DbModule } from './db/db.module';
import { HealthController } from './health/health.controller';
import { AdminInvitesController, InvitesController } from './invites/invites.controller';
import { InvitesService } from './invites/invites.service';
import { SellerController } from './seller/seller.controller';
import { MeController } from './users/me.controller';
import { UsersService } from './users/users.service';

export interface AppModuleOptions {
  /** Tests replace Google's key server with local keys. */
  googleVerifier?: GoogleVerifier;
  rateLimitStore?: RateLimitStore;
}

@Global()
@Module({})
class RateLimitModule implements OnApplicationShutdown {
  constructor(@Inject(RATE_LIMIT_STORE) private readonly store: RateLimitStore) {}

  async onApplicationShutdown(): Promise<void> {
    await this.store.close?.();
  }
}

/** Root module. Feature modules (shops, products, orders, chat) are added day by day. */
@Module({})
export class AppModule {
  static forRoot(config: AppConfig, options: AppModuleOptions = {}): DynamicModule {
    const rateLimitStore: Provider = {
      provide: RATE_LIMIT_STORE,
      useFactory: (): RateLimitStore =>
        options.rateLimitStore ??
        (config.redisUrl ? new RedisRateLimitStore(new Redis(config.redisUrl, { maxRetriesPerRequest: 2 })) : new MemoryRateLimitStore()),
    };
    const googleVerifier: Provider = {
      provide: GOOGLE_VERIFIER,
      inject: [CONFIG],
      useFactory: (cfg: AppConfig): GoogleVerifier => options.googleVerifier ?? new JoseGoogleVerifier(cfg.auth.googleClientIds),
    };

    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot(config),
        DbModule,
        AuditModule,
        { module: RateLimitModule, providers: [rateLimitStore], exports: [RATE_LIMIT_STORE] },
      ],
      controllers: [
        HealthController,
        AuthController,
        MeController,
        InvitesController,
        AdminInvitesController,
        AdminUsersController,
        SellerController,
      ],
      providers: [
        googleVerifier,
        PasswordService,
        TokensService,
        AuthService,
        UsersService,
        InvitesService,
        // Order matters: who is it → may this role do it → not too often.
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_GUARD, useClass: RateLimitGuard },
      ],
    };
  }
}
