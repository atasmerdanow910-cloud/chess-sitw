import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger('HTTP');

/**
 * Logs method, path (without query string), status and time.
 * No bodies, no tokens, no phone numbers, no IPs — logs stay free of personal data.
 */
export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      const path = req.originalUrl.split('?')[0].replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, ':id');
      logger.log(`${req.method} ${path} ${res.statusCode} ${ms.toFixed(0)}ms`);
    });
    next();
  };
}
