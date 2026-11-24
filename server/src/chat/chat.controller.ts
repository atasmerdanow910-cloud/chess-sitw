import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';

import { AuthUser, CurrentUser } from '../common/auth-context.js';
import { zText, ZodPipe } from '../common/zod.js';
import { ChatService } from './chat.service.js';

const openSchema = z
  .object({ shopId: z.uuid(), productId: z.uuid().optional(), orderId: z.uuid().optional() })
  .strict();
const historySchema = z
  .object({
    before: z.iso.datetime({ offset: true }).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  })
  .strict();
const sendSchema = z
  .object({
    clientId: z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/),
    type: z.enum(['text', 'photo', 'video', 'voice']),
    text: zText(4000).optional(),
    mediaId: z.uuid().optional(),
  })
  .strict();

@Controller('chats')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.chat.list(user);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post()
  open(@CurrentUser() user: AuthUser, @Body(new ZodPipe(openSchema)) body: z.infer<typeof openSchema>) {
    return this.chat.open(user, body);
  }

  @Get(':id/messages')
  history(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query(new ZodPipe(historySchema)) q: z.infer<typeof historySchema>,
  ) {
    return this.chat.history(user, id, q.before ? new Date(q.before) : undefined, q.limit);
  }

  /** Anti-spam: at most 40 messages per minute per user. */
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @Post(':id/messages')
  send(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodPipe(sendSchema)) body: z.infer<typeof sendSchema>,
  ) {
    return this.chat.send(user, id, body);
  }

  @HttpCode(200)
  @Post(':id/read')
  read(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.chat.markRead(user, id);
  }
}
