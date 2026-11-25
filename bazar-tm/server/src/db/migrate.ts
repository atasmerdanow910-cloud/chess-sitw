import { Pool, PoolClient } from 'pg';
import { Migration, migrations as allMigrations } from './migrations';

/** Applies pending migrations. Safe to run from several processes: an advisory lock serializes them. */
export async function runMigrations(pool: Pool, migrations: Migration[] = allMigrations): Promise<string[]> {
  const client: PoolClient = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('bazar-tm-migrations'))");
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    const done = new Set((await client.query<{ id: string }>('SELECT id FROM schema_migrations')).rows.map((r) => r.id));
    for (const migration of migrations) {
      if (done.has(migration.id)) continue;
      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [migration.id]);
        await client.query('COMMIT');
        applied.push(migration.id);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${migration.id} failed: ${(error as Error).message}`, { cause: error });
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext('bazar-tm-migrations'))").catch(() => undefined);
    client.release();
  }
  return applied;
}
