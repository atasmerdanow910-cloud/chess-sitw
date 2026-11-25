import { Controller, Get } from '@nestjs/common';
import { APP_VERSION } from '../config/env';

/** Liveness check for monitoring and the mobile app's "is the server reachable" probe. */
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok'; service: string; version: string; time: string } {
    return { status: 'ok', service: 'bazar-tm', version: APP_VERSION, time: new Date().toISOString() };
  }
}
