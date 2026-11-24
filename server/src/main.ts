import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { fileURLToPath } from 'node:url';

import { AppModule } from './app.module.js';
import { getEnv } from './config/env.js';
import { requestLogger } from './common/request-logger.js';

export async function createApp(): Promise<NestExpressApplication> {
  const env = getEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    logger: env.NODE_ENV === 'test' ? ['error'] : ['log', 'warn', 'error'],
  });
  // Behind Caddy (HTTPS proxy) the real client IP comes in X-Forwarded-For.
  if (env.TRUST_PROXY) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(
    helmet({
      // API only: no HTML pages, so a strict policy is fine.
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-site' },
      hsts: { maxAge: 31_536_000, includeSubDomains: true },
    }),
  );
  app.use(json({ limit: '100kb' }));
  app.use(urlencoded({ extended: false, limit: '20kb' }));
  if (env.NODE_ENV !== 'test') app.use(requestLogger());
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.enableShutdownHooks();
  return app;
}

async function bootstrap(): Promise<void> {
  const env = getEnv();
  const app = await createApp();
  await app.listen(env.PORT, '0.0.0.0');
  new Logger('Bootstrap').log(`Kerwen Market API on port ${env.PORT} (${env.NODE_ENV})`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  bootstrap().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
