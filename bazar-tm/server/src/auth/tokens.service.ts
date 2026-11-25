import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, ne } from 'drizzle-orm';
import { errors as joseErrors, jwtVerify, SignJWT } from 'jose';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { ApiError, errors } from '../common/api-error';
import { CONFIG } from '../config/config.module';
import { AppConfig } from '../config/env';
import { DB, Db } from '../db/db.module';
import { Role, sessions, users } from '../db/schema';

export interface TokenPair {
  accessToken: string;
  /** Seconds until the access token expires. */
  accessExpiresIn: number;
  refreshToken: string;
  refreshExpiresAt: string;
}

export interface AccessClaims {
  userId: string;
  sessionId: string;
}

const ISSUER = 'bazar-tm';
const AUDIENCE = 'bazar-tm-app';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Two requests refreshing at the same moment are normal; an old token coming back later is not. */
const REUSE_GRACE_MS = 30_000;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Short access token (JWT, 15 min) + long refresh token (30 days) bound to a session row.
 * Every refresh replaces the refresh token; an old one used again revokes the session (stolen token).
 */
@Injectable()
export class TokensService {
  private readonly key: Uint8Array;

  constructor(
    @Inject(CONFIG) private readonly config: AppConfig,
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
  ) {
    this.key = new TextEncoder().encode(config.auth.jwtSecret);
  }

  async issue(userId: string, role: Role, userAgent?: string): Promise<TokenPair> {
    const secret = randomBytes(32).toString('base64url');
    const expiresAt = this.refreshExpiry();
    const [session] = await this.db
      .insert(sessions)
      .values({ userId, refreshHash: sha256(secret), userAgent: userAgent?.slice(0, 200) ?? null, expiresAt })
      .returning({ id: sessions.id });
    return this.pair(userId, role, session.id, secret, expiresAt);
  }

  async rotate(refreshToken: string): Promise<{ userId: string; tokens: TokenPair }> {
    const parsed = this.parseRefresh(refreshToken);
    if (!parsed) throw this.invalidRefresh();
    const presented = sha256(parsed.secret);
    const now = new Date();

    const outcome = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .select({ session: sessions, role: users.role, isBlocked: users.isBlocked })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .where(eq(sessions.id, parsed.sessionId))
        .for('update', { of: sessions });
      if (!row || row.session.revokedAt || row.session.expiresAt <= now) return { kind: 'invalid' as const };
      if (!sameHash(row.session.refreshHash, presented)) {
        const reused = row.session.prevRefreshHash !== null && sameHash(row.session.prevRefreshHash, presented);
        const withinGrace = row.session.rotatedAt !== null && now.getTime() - row.session.rotatedAt.getTime() < REUSE_GRACE_MS;
        if (reused && !withinGrace) {
          await tx.update(sessions).set({ revokedAt: now }).where(eq(sessions.id, row.session.id));
          return { kind: 'reused' as const, userId: row.session.userId, sessionId: row.session.id };
        }
        return { kind: 'invalid' as const };
      }
      if (row.isBlocked) return { kind: 'blocked' as const };
      const secret = randomBytes(32).toString('base64url');
      const expiresAt = this.refreshExpiry();
      await tx
        .update(sessions)
        .set({ refreshHash: sha256(secret), prevRefreshHash: row.session.refreshHash, rotatedAt: now, lastUsedAt: now, expiresAt })
        .where(eq(sessions.id, row.session.id));
      return { kind: 'ok' as const, userId: row.session.userId, role: row.role, sessionId: row.session.id, secret, expiresAt };
    });

    switch (outcome.kind) {
      case 'ok':
        return { userId: outcome.userId, tokens: await this.pair(outcome.userId, outcome.role, outcome.sessionId, outcome.secret, outcome.expiresAt) };
      case 'reused':
        await this.audit.log(outcome.userId, 'session.refresh_reused', 'session', outcome.sessionId);
        throw this.invalidRefresh();
      case 'blocked':
        throw errors.blocked();
      default:
        throw this.invalidRefresh();
    }
  }

  async verifyAccess(token: string): Promise<AccessClaims> {
    try {
      const { payload } = await jwtVerify(token, this.key, { issuer: ISSUER, audience: AUDIENCE, algorithms: ['HS256'] });
      if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') throw errors.unauthorized();
      return { userId: payload.sub, sessionId: payload.sid };
    } catch (error) {
      if (error instanceof joseErrors.JWTExpired) throw errors.sessionExpired();
      if (error instanceof ApiError) throw error;
      throw errors.unauthorized();
    }
  }

  /** Signs out one device. Needs the refresh token itself, so a session id alone is not enough. */
  async revokeByRefresh(refreshToken: string): Promise<void> {
    const parsed = this.parseRefresh(refreshToken);
    if (!parsed) return;
    const [row] = await this.db
      .select({ refreshHash: sessions.refreshHash })
      .from(sessions)
      .where(and(eq(sessions.id, parsed.sessionId), isNull(sessions.revokedAt)));
    if (row && sameHash(row.refreshHash, sha256(parsed.secret))) {
      await this.db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, parsed.sessionId));
    }
  }

  /** Signs out every device of the user, optionally keeping the current one. */
  async revokeAll(userId: string, exceptSessionId?: string): Promise<void> {
    const conditions = [eq(sessions.userId, userId), isNull(sessions.revokedAt)];
    if (exceptSessionId) conditions.push(ne(sessions.id, exceptSessionId));
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(...conditions));
  }

  private async pair(userId: string, role: Role, sessionId: string, secret: string, refreshExpiresAt: Date): Promise<TokenPair> {
    const ttl = this.config.auth.accessTtlSeconds;
    const accessToken = await new SignJWT({ sid: sessionId, role })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(userId)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${ttl}s`)
      .sign(this.key);
    return { accessToken, accessExpiresIn: ttl, refreshToken: `${sessionId}.${secret}`, refreshExpiresAt: refreshExpiresAt.toISOString() };
  }

  private parseRefresh(token: string): { sessionId: string; secret: string } | null {
    if (typeof token !== 'string' || token.length > 200) return null;
    const dot = token.indexOf('.');
    const sessionId = token.slice(0, dot);
    const secret = token.slice(dot + 1);
    if (dot < 0 || !UUID.test(sessionId) || !/^[\w-]{40,64}$/.test(secret)) return null;
    return { sessionId, secret };
  }

  private refreshExpiry(): Date {
    return new Date(Date.now() + this.config.auth.refreshTtlDays * 24 * 3600 * 1000);
  }

  private invalidRefresh(): ApiError {
    return new ApiError('invalid_refresh', HttpStatus.UNAUTHORIZED, 'Refresh token is invalid, expired or revoked');
  }
}
