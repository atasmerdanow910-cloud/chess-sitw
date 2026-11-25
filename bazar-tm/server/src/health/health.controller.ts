import { Controller, Get, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { Public } from '../common/auth-user';
import { APP_VERSION } from '../config/env';
import { PG_POOL } from '../db/db.module';

/** Liveness and readiness checks for monitoring and the app's "is the server reachable" probe. */
@Public()
@Controller('health')
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get()
  check(): { status: 'ok'; service: string; version: string; time: string } {
    return { status: 'ok', service: 'bazar-tm', version: APP_VERSION, time: new Date().toISOString() };
  }

  /** 200 when the database answers, 503 otherwise. */
  @Get('ready')
  async ready(): Promise<{ status: 'ok'; database: 'ok' }> {
    try {
      await this.pool.query('SELECT 1');
      return { status: 'ok', database: 'ok' };
    } catch {
      throw new HttpException({ statusCode: 503, error: 'not_ready', message: 'Database is not reachable' }, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
