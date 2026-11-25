import { Pool } from 'pg';
import { runMigrations } from '../db/migrate';

/** `npm run migrate`: brings the database in DATABASE_URL up to date. */
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const applied = await runMigrations(pool);
    process.stdout.write(applied.length ? `Applied: ${applied.join(', ')}\n` : 'Database is up to date\n');
  } finally {
    await pool.end();
  }
}

main().catch((error: Error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
