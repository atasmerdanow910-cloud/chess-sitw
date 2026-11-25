import { hash } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as readline from 'node:readline';
import { Writable } from 'node:stream';
import { normalizePhone } from '../common/phone';
import { runMigrations } from '../db/migrate';
import { schema, users } from '../db/schema';
import { PasswordService } from '../auth/password.service';

/**
 * `npm run owner:create` on the server: creates the platform owner account.
 * The password is typed without echo and never passed on the command line (it would stay in shell history).
 */
// One readline for all questions, read through its line queue, so answers piped in at once are not lost.
let muted = false;
const output = new Writable({
  write(chunk, _encoding, done) {
    if (!muted) process.stdout.write(chunk);
    done();
  },
});
const rl = readline.createInterface({ input: process.stdin, output, terminal: Boolean(process.stdin.isTTY) });
const lines = rl[Symbol.asyncIterator]();

async function ask(question: string, hidden = false): Promise<string> {
  process.stdout.write(question);
  // While a password is typed, the terminal does not echo it.
  muted = hidden;
  const next = await lines.next();
  muted = false;
  if (hidden) process.stdout.write('\n');
  if (next.done) throw new Error('Input ended before all answers were given');
  return String(next.value).trim();
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const name = await ask('Owner name: ');
  if (!name || name.length > 80) throw new Error('Name must be 1–80 characters');
  const phone = normalizePhone(await ask('Phone (+993 XX XXXXXX): '));
  if (!phone) throw new Error('Phone must be a Turkmen number');
  const password = await ask('Password (not shown): ', true);
  const weakness = new PasswordService().weakness(password, phone);
  if (weakness) throw new Error(`Password is too weak: ${weakness}`);
  if ((await ask('Repeat password: ', true)) !== password) throw new Error('Passwords do not match');

  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await runMigrations(pool);
    const db = drizzle(pool, { schema });
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone));
    if (existing) throw new Error('A user with this phone already exists');
    await db.insert(users).values({ name, phone, passwordHash: await hash(password), role: 'owner' });
    process.stdout.write('Owner account created. Sign in to the app with this phone and password.\n');
  } finally {
    await pool.end();
  }
}

main()
  .catch((error: Error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
