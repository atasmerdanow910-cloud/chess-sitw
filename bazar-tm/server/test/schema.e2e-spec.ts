import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';
import { runMigrations } from '../src/db/migrate';
import { auditLog, invites, sessions, shops, users } from '../src/db/schema';
import { createTestDatabase, TestDatabase } from './helpers';

/** The TypeScript schema (used by queries) and the SQL migrations (used by the database) must match. */
describe('Database schema (e2e)', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await db.drop();
  });

  it.each([users, shops, invites, sessions, auditLog].map((t) => [getTableConfig(t as PgTable).name, t]))(
    'table %s has the same columns and nullability as the code',
    async (name, table) => {
      const config = getTableConfig(table as PgTable);
      const res = await db.pool.query<{ column_name: string; is_nullable: 'YES' | 'NO' }>(
        'SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1',
        [name],
      );
      const inDb = Object.fromEntries(res.rows.map((r) => [r.column_name, r.is_nullable === 'NO']));
      const inCode = Object.fromEntries(config.columns.map((c) => [c.name, c.notNull]));
      expect(inDb).toEqual(inCode);
    },
  );

  it('applies migrations only once, also when started twice at the same time', async () => {
    const pool = new Pool({ connectionString: db.url, max: 4 });
    try {
      const results = await Promise.all([runMigrations(pool), runMigrations(pool)]);
      expect(results).toEqual([[], []]);
      const rows = await pool.query('SELECT count(*)::int AS n FROM schema_migrations');
      expect(rows.rows[0].n).toBe(1);
    } finally {
      await pool.end();
    }
  });

  it('refuses phone numbers that are not stored in the +993XXXXXXXX form', async () => {
    await expect(db.pool.query("INSERT INTO users (name, phone) VALUES ('X', '65123456')")).rejects.toThrow(/check constraint/);
  });
});
