import { createHmac, timingSafeEqual } from 'node:crypto';

import { getEnv } from '../config/env.js';

const HOUR = 3600;
const DAY = 24 * HOUR;

export type UrlScope = 'public' | 'private';

/**
 * Builds a temporary link to a file: /api/v1/media/<id>?e=<expires>&s=<signature>.
 * Catalog photos: valid ~7 days. Chat files: valid ~1 hour.
 * Expiry is rounded so the same link is reused for a while (phone cache works).
 */
export function signedMediaUrl(mediaId: string, scope: UrlScope = 'public', now = Date.now()): string {
  const nowSec = Math.floor(now / 1000);
  const exp =
    scope === 'public'
      ? Math.ceil(nowSec / DAY) * DAY + 7 * DAY
      : Math.ceil(nowSec / HOUR) * HOUR + HOUR;
  return `/api/v1/media/${mediaId}?e=${exp}&s=${sign(mediaId, exp)}`;
}

export function verifyMediaSignature(mediaId: string, exp: number, sig: string, now = Date.now()): boolean {
  if (!Number.isInteger(exp) || exp * 1000 < now) return false;
  const expected = Buffer.from(sign(mediaId, exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function sign(mediaId: string, exp: number): string {
  return createHmac('sha256', getEnv().MEDIA_SIGNING_SECRET)
    .update(`${mediaId}.${exp}`)
    .digest('base64url')
    .slice(0, 32);
}

/** Helper for DTOs: null-safe signed URL. */
export function mediaUrl(mediaId: string | null | undefined, scope: UrlScope = 'public'): string | null {
  return mediaId ? signedMediaUrl(mediaId, scope) : null;
}
