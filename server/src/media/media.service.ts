import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

import { badRequest } from '../common/errors.js';
import { Db, InjectDb } from '../db/db.js';
import { media } from '../db/schema.js';
import { detectMime } from './mime.js';
import { MediaStorage } from './storage.js';

export type UploadPurpose = 'product' | 'logo' | 'banner' | 'chat_photo' | 'chat_video' | 'voice';

const MB = 1024 * 1024;

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
      kind = 'audio';
      if (mime === 'video/webm') mime = 'audio/webm';
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
}
