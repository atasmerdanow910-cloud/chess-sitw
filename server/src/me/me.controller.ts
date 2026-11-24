import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';

import { AuthUser, CurrentUser } from '../common/auth-context.js';
import { zPage, zText, ZodPipe } from '../common/zod.js';
import { MeService } from './me.service.js';

const readSchema = z.object({ ids: z.array(z.uuid()).max(200).optional() }).strict();
const deviceSchema = z
  .object({ token: z.string().min(20).max(4096), platform: z.enum(['android', 'ios']) })
  .strict();
const removeDeviceSchema = z.object({ token: z.string().min(20).max(4096) }).strict();
const reportSchema = z
  .object({
    targetType: z.enum(['product', 'shop', 'user', 'message']),
    targetId: z.uuid(),
    reason: zText(1000).pipe(z.string().min(3)),
  })
  .strict();

@Controller()
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get('me/favorites')
  favorites(@CurrentUser() user: AuthUser) {
    return this.me.favorites(user);
  }

  @HttpCode(204)
  @Put('me/favorites/:productId')
  async addFavorite(@CurrentUser() user: AuthUser, @Param('productId', new ParseUUIDPipe()) id: string) {
    await this.me.addFavorite(user, id);
  }

  @HttpCode(204)
  @Delete('me/favorites/:productId')
  async removeFavorite(@CurrentUser() user: AuthUser, @Param('productId', new ParseUUIDPipe()) id: string) {
    await this.me.removeFavorite(user, id);
  }

  @Get('me/notifications')
  notifications(@CurrentUser() user: AuthUser, @Query(new ZodPipe(zPage)) page: z.infer<typeof zPage>) {
    return this.me.notifications(user, page.limit, page.offset);
  }

  @HttpCode(204)
  @Post('me/notifications/read')
  async read(@CurrentUser() user: AuthUser, @Body(new ZodPipe(readSchema)) body: z.infer<typeof readSchema>) {
    await this.me.readNotifications(user, body.ids);
  }

  @HttpCode(204)
  @Post('me/devices')
  async device(@CurrentUser() user: AuthUser, @Body(new ZodPipe(deviceSchema)) body: z.infer<typeof deviceSchema>) {
    await this.me.registerDevice(user, body.token, body.platform);
  }

  @HttpCode(204)
  @Post('me/devices/remove')
  async removeDevice(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(removeDeviceSchema)) body: z.infer<typeof removeDeviceSchema>,
  ) {
    await this.me.removeDevice(user, body.token);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('reports')
  report(@CurrentUser() user: AuthUser, @Body(new ZodPipe(reportSchema)) body: z.infer<typeof reportSchema>) {
    return this.me.report(user, body);
  }
}
