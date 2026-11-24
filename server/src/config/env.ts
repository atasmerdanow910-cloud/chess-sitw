import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  ACCESS_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  MEDIA_SIGNING_SECRET: z.string().min(32, 'MEDIA_SIGNING_SECRET must be at least 32 characters'),
  MEDIA_DIR: z.string().default('./data/media'),
  /** Comma separated OAuth client IDs (Android, iOS, Web). Empty = Google login disabled. */
  GOOGLE_CLIENT_IDS: z.string().default(''),
  TRUST_PROXY: bool.default(false),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().positive().default(15),
  /** Path to a Firebase service account JSON. Empty = push disabled (WebSocket + polling still work). */
  FCM_SERVICE_ACCOUNT_FILE: z.string().default(''),
  /** Disable rate limits (tests only). */
  RATE_LIMIT_DISABLED: bool.default(false),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Reads and validates environment variables once. Fails fast on bad config. */
export function getEnv(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
    }
    cached = parsed.data;
  }
  return cached;
}

/** For tests that change env between runs. */
export function resetEnvCache(): void {
  cached = undefined;
}

export function googleClientIds(env: Env = getEnv()): string[] {
  return env.GOOGLE_CLIENT_IDS.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
