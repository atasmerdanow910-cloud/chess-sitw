import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import { getEnv } from '../config/env.js';
import * as schema from './schema.js';

export type Db = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export const DB = Symbol('DB');
export const PG_POOL = Symbol('PG_POOL');

/** Injects the Drizzle database. */
export const InjectDb = () => Inject(DB);

export function createPool(url = getEnv().DATABASE_URL): pg.Pool {
  return new pg.Pool({ connectionString: url, max: 10 });
}

class PoolCloser implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

@Global()
@Module({
  providers: [
    { provide: PG_POOL, useFactory: () => createPool() },
    { provide: DB, inject: [PG_POOL], useFactory: (pool: pg.Pool) => drizzle(pool, { schema }) },
    PoolCloser,
  ],
  exports: [DB, PG_POOL],
})
export class DbModule {}
