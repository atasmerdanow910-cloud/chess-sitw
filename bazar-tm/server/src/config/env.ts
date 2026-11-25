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
}

export const APP_VERSION = '0.1.0';

export class ConfigError extends Error {}

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const nodeEnv = (env.NODE_ENV ?? 'development') as AppConfig['nodeEnv'];
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new ConfigError(`NODE_ENV must be development, production or test, got "${nodeEnv}"`);
  }

  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigError(`PORT must be an integer between 1 and 65535, got "${env.PORT}"`);
  }

  const corsOrigins = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  for (const origin of corsOrigins) {
    if (!/^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(origin)) {
      throw new ConfigError(`CORS_ORIGINS has an invalid origin "${origin}"`);
    }
    if (nodeEnv === 'production' && origin.startsWith('http://')) {
      throw new ConfigError(`CORS origin "${origin}" must use https in production`);
    }
  }

  return {
    nodeEnv,
    // Bind to localhost by default: in production nginx is the only way in.
    host: env.HOST ?? '127.0.0.1',
    port,
    corsOrigins,
    version: APP_VERSION,
  };
}
