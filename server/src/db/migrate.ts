import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

import { getEnv } from '../config/env.js';

const here = path.dirname(fileURLToPath(import.meta.url));
/** SQL migrations folder (this file runs compiled from dist/src/db). */
export const migrationsFolder = path.resolve(here, '../../../drizzle');

export async function runMigrations(url = getEnv().DATABASE_URL): Promise<void> {
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder });
  } finally {
    await pool.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => console.warn('Migrations applied'))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
