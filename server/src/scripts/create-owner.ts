import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createInterface } from 'node:readline';
import pg from 'pg';

import { hashPassword } from '../auth/auth.service.js';
import { normalizePhone } from '../common/phone.js';
import { getEnv } from '../config/env.js';
import { users } from '../db/schema.js';

/**
 * Creates (or promotes) the platform owner account.
 * Usage on the server:  docker compose exec api npm run create-owner
 * Asks for name, phone and password (password is not shown on screen).
 */
function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput;
      (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
        if (s.startsWith(question)) write.call(rl, s);
        else write.call(rl, '*');
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

async function main() {
  const name = process.env.OWNER_NAME || (await ask('Имя владельца / Eýesiniň ady: '));
  const phone = normalizePhone(process.env.OWNER_PHONE || (await ask('Телефон (+993...): ')));
  if (!phone) throw new Error('Неверный номер телефона');
  const password = process.env.OWNER_PASSWORD || (await ask('Пароль (мин. 10 символов): ', true));
  if (password.length < 10) throw new Error('Пароль слишком короткий (нужно 10+ символов)');

  const pool = new pg.Pool({ connectionString: getEnv().DATABASE_URL, max: 1 });
  const db = drizzle(pool);
  const passwordHash = await hashPassword(password);
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone));
  if (existing) {
    await db.update(users).set({ role: 'owner', name, passwordHash, isBlocked: false }).where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({ name, phone, passwordHash, role: 'owner' });
  }
  await pool.end();
  console.warn(`Готово: владелец ${name} (${phone}) может войти в приложение.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
