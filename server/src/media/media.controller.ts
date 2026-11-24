import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { eq } from 'drizzle-orm';
import type { Response } from 'express';
import { z } from 'zod';

import { AuthUser, CurrentUser, Public } from '../common/auth-context.js';
import { badRequest, notFound } from '../common/errors.js';
import { ZodPipe } from '../common/zod.js';
import { Db, InjectDb } from '../db/db.js';
import { media } from '../db/schema.js';
import { MediaService, UPLOAD_LIMITS, UploadPurpose } from './media.service.js';
import { signedMediaUrl, verifyMediaSignature } from './signing.js';
import { MediaStorage } from './storage.js';

const purposeSchema = z
  .object({ purpose: z.enum(['product', 'logo', 'banner', 'chat_photo', 'chat_video', 'voice']) })
  .strict();
// eslint-disable-next-line no-useless-assignment -- used in a decorator below
const fetchSchema = z.object({ e: z.coerce.number().int(), s: z.string().min(10).max(64) }).strict();

const MAX_UPLOAD = Math.max(...Object.values(UPLOAD_LIMITS));

@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly storage: MediaStorage,
    @InjectDb() private readonly db: Db,
  ) {}

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD, files: 1, fields: 2 } }))
  async upload(
    @CurrentUser() user: AuthUser,
    @Query(new ZodPipe(purposeSchema)) query: { purpose: UploadPurpose },
    @UploadedFile() file: { buffer: Buffer } | undefined,
  ) {
    if (!file?.buffer) throw badRequest('file_missing');
    if (query.purpose === 'banner' && user.role !== 'owner') throw badRequest('file_type_not_allowed');
    const stored = await this.mediaService.upload(user.id, query.purpose, file.buffer);
    const scope = query.purpose.startsWith('chat') || query.purpose === 'voice' ? 'private' : 'public';
    return { ...stored, url: signedMediaUrl(stored.id, scope) };
  }

  /** Serves a file only with a valid, unexpired signature. */
  @Public()
  @Throttle({ default: { limit: 600, ttl: 60_000 } })
  @Get(':id')
  async get(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query(new ZodPipe(fetchSchema)) query: { e: number; s: string },
    @Res() res: Response,
  ) {
    if (!verifyMediaSignature(id, query.e, query.s)) throw notFound();
    const [row] = await this.db.select().from(media).where(eq(media.id, id));
    if (!row) throw notFound();
    const file = await this.storage.open(row.storageKey);
    if (!file) throw notFound();
    res.setHeader('Content-Type', row.mime);
    res.setHeader('Content-Length', String(file.size));
    res.setHeader('Cache-Control', 'private, max-age=86400, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');
    file.stream.pipe(res);
  }
}
