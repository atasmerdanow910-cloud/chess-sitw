import { Controller, Get, Inject } from '@nestjs/common';
import pg from 'pg';

import { Public } from './common/auth-context.js';
import { PG_POOL } from './db/db.js';

@Public()
@Controller('health')
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  @Get()
  async health() {
    await this.pool.query('select 1');
    return { status: 'ok', time: new Date().toISOString() };
  }
}
