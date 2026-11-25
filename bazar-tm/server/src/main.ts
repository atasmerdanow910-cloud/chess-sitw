import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { loadConfig } from './config/env';

async function bootstrap(): Promise<void> {
  const config = loadConfig(process.env);
  // Request logging with personal data is deliberately absent: logs keep only errors and startup info.
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
  configureApp(app, config);
  app.enableShutdownHooks();
  await app.listen(config.port, config.host);
  new Logger('Bootstrap').log(`Bazar TM API ${config.version} on http://${config.host}:${config.port}/api/v1 (${config.nodeEnv})`);
}

void bootstrap();
