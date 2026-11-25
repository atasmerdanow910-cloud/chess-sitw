import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';

/** Root module. Feature modules (auth, shops, products, orders, chat) are added day by day. */
@Module({
  imports: [HealthModule],
})
export class AppModule {}
