import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { and, eq, gt, lt, sql, sum } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

import { ApiError, badRequest } from '../common/errors.js';
import { Db, InjectDb } from '../db/db.js';
import { banners, media, messages, productMedia, shops } from '../db/schema.js';
import { detectMime } from './mime.js';
import { MediaStorage } from './storage.js';

export type UploadPurpose = 'product' | 'logo' | 'banner' | 'chat_photo' | 'chat_video' | 'voice';

const MB = 1024 * 1024;

/** Max total upload size per user per 24 hours (protects the server disk). */
export const DAILY_UPLOAD_QUOTA = 300 * MB;

/** Size limits per purpose (raw upload). Phones compress before sending. */
export const UPLOAD_LIMITS: Record<UploadPurpose, number> = {
  product: 12 * MB,
  logo: 8 * MB,
  banner: 12 * MB,
  chat_photo: 12 * MB,
  chat_video: 30 * MB,
  voice: 5 * MB,
};

const ALLOWED: Record<UploadPurpose, Array<'image' | 'video' | 'audio'>> = {
  product: ['image', 'video'],
  logo: ['image'],
  banner: ['image'],
  chat_photo: ['image'],
  chat_video: ['video'],
  voice: ['audio', 'video'], // webm voice notes are detected as "video/webm"
};

export interface StoredMedia {
  id: string;
  kind: 'image' | 'video' | 'audio';
  mime: string;
  width: number | null;
  height: number | null;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @InjectDb() private readonly db: Db,
    private readonly storage: MediaStorage,
  ) {}

  /**
   * Checks the real type, re-encodes images to WebP (max 1280 px, metadata incl. GPS removed),
   * stores under a random name and records it.
   */
  async upload(ownerId: string, purpose: UploadPurpose, data: Buffer): Promise<StoredMedia> {
    if (data.length === 0) throw badRequest('file_empty');
    if (data.length > UPLOAD_LIMITS[purpose]) throw badRequest('file_too_large');
    const [{ used }] = await this.db
      .select({ used: sum(media.sizeBytes) })
      .from(media)
      .where(and(eq(media.ownerId, ownerId), gt(media.createdAt, new Date(Date.now() - 86_400_000))));
    if (Number(used ?? 0) + data.length > DAILY_UPLOAD_QUOTA) {
      throw new ApiError(HttpStatus.TOO_MANY_REQUESTS, 'upload_quota_exceeded');
    }
    const detected = detectMime(data);
    if (!detected) throw badRequest('file_type_not_allowed');
    let kind: 'image' | 'video' | 'audio' = detected.kind;
    if (!ALLOWED[purpose].includes(kind)) throw badRequest('file_type_not_allowed');

    let body = data;
    let mime: string = detected.mime;
    let width: number | null = null;
    let height: number | null = null;
    let ext = mime.split('/')[1].replace('quicktime', 'mov').replace('mpeg', 'mp3').replace('3gpp', '3gp');

    if (kind === 'image') {
      const maxSide = purpose === 'logo' ? 512 : 1280;
      try {
        const out = await sharp(data, { limitInputPixels: 40_000_000 })
          .rotate()
          .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer({ resolveWithObject: true });
        body = out.data;
        width = out.info.width;
        height = out.info.height;
        mime = 'image/webp';
        ext = 'webp';
      } catch {
        throw badRequest('image_invalid');
      }
    }
    if (purpose === 'voice') {
      // Phones record voice as AAC in an MP4/3GP/WebM container; store it as audio.
      kind = 'audio';
      mime = mime.replace(/^video\//, 'audio/');
    }

    const id = randomUUID();
    const d = new Date();
    const key = `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${id}.${ext}`;
    await this.storage.put(key, body);
    await this.db.insert(media).values({
      id,
      ownerId,
      kind,
      mime,
      sizeBytes: body.length,
      storageKey: key,
      width,
      height,
    });
    return { id, kind, mime, width, height };
  }

  /**
   * Deletes files that were uploaded but never attached to a product, message,
   * shop logo or banner within 3 days (abandoned uploads).
   */
  async cleanupOrphans(): Promise<number> {
    const cutoff = new Date(Date.now() - 3 * 86_400_000);
    const orphans = await this.db
      .select({ id: media.id, key: media.storageKey })
      .from(media)
      .where(
        and(
          lt(media.createdAt, cutoff),
          sql`not exists (select 1 from ${productMedia} pm where pm.media_id = ${media.id})`,
          sql`not exists (select 1 from ${messages} m where m.media_id = ${media.id})`,
          sql`not exists (select 1 from ${shops} s where s.logo_media_id = ${media.id})`,
          sql`not exists (select 1 from ${banners} b where b.media_id = ${media.id})`,
        ),
      )
      .limit(1000);
    for (const o of orphans) {
      await this.storage.remove(o.key).catch(() => this.logger.warn('could not delete file'));
      await this.db.delete(media).where(eq(media.id, o.id));
    }
    return orphans.length;
  }
}
