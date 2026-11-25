import { HttpStatus, INestApplication, ValidationError, ValidationPipe } from '@nestjs/common';
import type { Express } from 'express';
import helmet from 'helmet';
import { ApiError } from './common/api-error';
import { AppConfig } from './config/env';

/** Field names only: values (passwords, phones) never go back into an error. */
function fieldNames(errors: ValidationError[], parent = ''): string[] {
  return errors.flatMap((e) => {
    const path = parent ? `${parent}.${e.property}` : e.property;
    return e.children?.length ? fieldNames(e.children, path) : [path];
  });
}

/**
 * Security and API settings shared by the real server and the tests,
 * so the tests check exactly what runs in production.
 */
export function configureApp(app: INestApplication, config: AppConfig): void {
  app.setGlobalPrefix('api/v1');

  // Behind nginx: trust the proxy on the same machine only, so client IPs (rate limits, audit) are real.
  (app.getHttpAdapter().getInstance() as Express).set('trust proxy', 'loopback');

  // Security headers: nosniff, frame-deny, HSTS (when served over HTTPS), no X-Powered-By.
  app.use(helmet());

  // Browsers only: the mobile app does not use CORS. Unknown origins get no CORS headers.
  app.enableCors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: false,
    maxAge: 600,
  });

  // Every request body is validated against its DTO; unknown fields (for example a forged
  // "role" or "shopId") are rejected, not silently ignored.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new ApiError('validation_failed', HttpStatus.BAD_REQUEST, 'Request has invalid or unknown fields', { fields: fieldNames(errors) }),
    }),
  );
}
