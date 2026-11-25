import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Pool } from 'pg';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { ConfigError, loadConfig } from './config/env';
import { runMigrations } from './db/migrate';

async function bootstrap(): Promise<void> {
  const log = new Logger('Bootstrap');
  const config = loadConfig(process.env);
  if (!config.databaseUrl) {
    throw new ConfigError('DATABASE_URL is not set. Start PostgreSQL (docker compose up -d postgres) and put its URL into .env');
  }
  if (config.nodeEnv !== 'production' && !process.env.JWT_SECRET) {
    log.warn('JWT_SECRET is not set: using a random one, sign-ins will reset after a restart');
  }

  // Bring the database up to date before taking requests (safe with several servers: advisory lock).
  if (process.env.MIGRATE_ON_START !== 'false') {
    const pool = new Pool({ connectionString: config.databaseUrl, max: 1 });
    try {
      const applied = await runMigrations(pool);
      if (applied.length) log.log(`Applied migrations: ${applied.join(', ')}`);
    } finally {
      await pool.end();
    }
  }

  // Request logging with personal data is deliberately absent: logs keep only errors and startup info.
  const app = await NestFactory.create(AppModule.forRoot(config), { logger: ['error', 'warn', 'log'] });
  configureApp(app, config);
  app.enableShutdownHooks();
  await app.listen(config.port, config.host);
  log.log(`Bazar TM API ${config.version} on http://${config.host}:${config.port}/api/v1 (${config.nodeEnv})`);
}

bootstrap().catch((error: Error) => {
  new Logger('Bootstrap').error(error.message);
  process.exit(1);
});
