import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { and, eq, isNull } from 'drizzle-orm';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { getEnv } from '../config/env.js';
import { unauthorized } from '../common/errors.js';
import { Db, InjectDb } from '../db/db.js';
import { sessions } from '../db/schema.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** Access token lifetime in seconds. */
  expiresIn: number;
}

export interface AccessPayload {
  sub: string;
  sid: string;
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/**
 * Short-lived access JWT + long-lived refresh token with rotation.
 * Refresh token format: "<sessionId>.<random secret>". Only a hash of the secret is stored.
 * Using an old (already rotated) refresh token revokes the whole session.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    @InjectDb() private readonly db: Db,
  ) {}

  private accessFor(userId: string, sessionId: string): Pick<TokenPair, 'accessToken' | 'expiresIn'> {
    const minutes = getEnv().ACCESS_TTL_MINUTES;
    const payload: AccessPayload = { sub: userId, sid: sessionId };
    return {
      accessToken: this.jwt.sign(payload, { expiresIn: minutes * 60 }),
      expiresIn: minutes * 60,
    };
  }

  async issue(userId: string): Promise<TokenPair> {
    const secret = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + getEnv().REFRESH_TTL_DAYS * 86_400_000);
    const [session] = await this.db
      .insert(sessions)
      .values({ userId, tokenHash: sha256(secret), expiresAt })
      .returning({ id: sessions.id });
    return { ...this.accessFor(userId, session.id), refreshToken: `${session.id}.${secret}` };
  }

  async rotate(refreshToken: string): Promise<TokenPair> {
    const parsed = parseRefresh(refreshToken);
    if (!parsed) throw unauthorized('invalid_refresh_token');
    const [session] = await this.db.select().from(sessions).where(eq(sessions.id, parsed.id));
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw unauthorized('invalid_refresh_token');
    }
    if (!safeEqualHex(session.tokenHash, sha256(parsed.secret))) {
      // Reuse of an old token: someone may have stolen it. Kill the session.
      await this.db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, session.id));
      throw unauthorized('refresh_token_reused');
    }
    const secret = randomBytes(32).toString('base64url');
    await this.db
      .update(sessions)
      .set({ tokenHash: sha256(secret), lastUsedAt: new Date() })
      .where(eq(sessions.id, session.id));
    return { ...this.accessFor(session.userId, session.id), refreshToken: `${session.id}.${secret}` };
  }

  async revoke(refreshToken: string): Promise<void> {
    const parsed = parseRefresh(refreshToken);
    if (!parsed) return;
    const [session] = await this.db.select().from(sessions).where(eq(sessions.id, parsed.id));
    if (session && safeEqualHex(session.tokenHash, sha256(parsed.secret))) {
      await this.db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, session.id));
    }
  }

  async revokeAll(userId: string, exceptSessionId?: string): Promise<void> {
    const rows = await this.db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
    for (const row of rows) {
      if (row.id === exceptSessionId) continue;
      await this.db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, row.id));
    }
  }

  verifyAccess(token: string): AccessPayload | null {
    try {
      const payload = this.jwt.verify<AccessPayload>(token);
      return typeof payload.sub === 'string' && typeof payload.sid === 'string' ? payload : null;
    } catch {
      return null;
    }
  }
}

function parseRefresh(token: string): { id: string; secret: string } | null {
  if (typeof token !== 'string' || token.length > 200) return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const id = token.slice(0, dot);
  const secret = token.slice(dot + 1);
  if (!/^[0-9a-f-]{36}$/.test(id) || secret.length < 20) return null;
  return { id, secret };
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
