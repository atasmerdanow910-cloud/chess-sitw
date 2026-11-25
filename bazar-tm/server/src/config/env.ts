import { randomBytes } from 'node:crypto';

/**
 * Reads and validates environment variables once at startup.
 * The server refuses to start with an invalid configuration instead of failing later at runtime.
 */
export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  host: string;
  port: number;
  corsOrigins: string[];
  version: string;
  databaseUrl: string;
  /** Optional: rate-limit counters live in Redis when set, otherwise in memory (one server only). */
  redisUrl: string | null;
  auth: {
    /** HMAC key for access tokens, at least 32 characters. */
    jwtSecret: string;
    accessTtlSeconds: number;
    refreshTtlDays: number;
    /** OAuth client IDs whose Google ID tokens we accept (Android, iOS, web). Empty: Google sign-in is off. */
    googleClientIds: string[];
  };
}

export const APP_VERSION = '0.2.0';

export class ConfigError extends Error {}

function intFrom(env: NodeJS.ProcessEnv, name: string, fallback: number, min: number, max: number): number {
  const raw = env[name];
  const value = raw === undefined || raw === '' ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ConfigError(`${name} must be an integer between ${min} and ${max}, got "${raw}"`);
  }
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const nodeEnv = (env.NODE_ENV ?? 'development') as AppConfig['nodeEnv'];
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new ConfigError(`NODE_ENV must be development, production or test, got "${nodeEnv}"`);
  }
  const production = nodeEnv === 'production';

  const port = intFrom(env, 'PORT', 3000, 1, 65535);

  const corsOrigins = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  for (const origin of corsOrigins) {
    if (!/^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(origin)) {
      throw new ConfigError(`CORS_ORIGINS has an invalid origin "${origin}"`);
    }
    if (production && origin.startsWith('http://')) {
      throw new ConfigError(`CORS origin "${origin}" must use https in production`);
    }
  }

  const databaseUrl = env.DATABASE_URL ?? '';
  if (production && !databaseUrl) throw new ConfigError('DATABASE_URL is required in production');
  if (databaseUrl && !/^postgres(ql)?:\/\//.test(databaseUrl)) {
    throw new ConfigError('DATABASE_URL must start with postgres:// or postgresql://');
  }

  let jwtSecret = env.JWT_SECRET ?? '';
  if (!jwtSecret) {
    if (production) throw new ConfigError('JWT_SECRET is required in production (at least 32 characters)');
    // Development without a secret: a random one per start, so sign-ins reset after a restart.
    jwtSecret = randomBytes(32).toString('base64url');
  }
  if (jwtSecret.length < 32) throw new ConfigError('JWT_SECRET must be at least 32 characters');

  const redisUrl = env.REDIS_URL?.trim() || null;
  if (redisUrl && !/^rediss?:\/\//.test(redisUrl)) throw new ConfigError('REDIS_URL must start with redis:// or rediss://');

  const googleClientIds = (env.GOOGLE_CLIENT_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  for (const id of googleClientIds) {
    if (!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(id)) {
      throw new ConfigError(`GOOGLE_CLIENT_IDS has an invalid client ID "${id}"`);
    }
  }

  return {
    nodeEnv,
    // Bind to localhost by default: in production nginx is the only way in.
    host: env.HOST ?? '127.0.0.1',
    port,
    corsOrigins,
    version: APP_VERSION,
    databaseUrl,
    redisUrl,
    auth: {
      jwtSecret,
      accessTtlSeconds: intFrom(env, 'ACCESS_TOKEN_TTL_SECONDS', 900, 60, 3600),
      refreshTtlDays: intFrom(env, 'REFRESH_TOKEN_TTL_DAYS', 30, 1, 180),
      googleClientIds,
    },
  };
}
