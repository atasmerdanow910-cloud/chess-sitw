import { Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';

import { AuthUser } from '../common/auth-context.js';
import { forbidden } from '../common/errors.js';
import { Db, InjectDb } from '../db/db.js';
import { sessions, shops, users } from '../db/schema.js';
import { TokenService } from './tokens.js';

/**
 * Turns an access token into the current user.
 * Checks the DB every time, so blocking a user or revoking a session works instantly.
 */
@Injectable()
export class AccessResolver {
  constructor(
    private readonly tokens: TokenService,
    @InjectDb() private readonly db: Db,
  ) {}

  async resolve(accessToken: string): Promise<AuthUser | null> {
    const payload = this.tokens.verifyAccess(accessToken);
    if (!payload) return null;
    const [row] = await this.db
      .select({
        id: users.id,
        role: users.role,
        name: users.name,
        isBlocked: users.isBlocked,
        shopId: shops.id,
      })
      .from(users)
      .innerJoin(
        sessions,
        and(
          eq(sessions.id, payload.sid),
          eq(sessions.userId, users.id),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .leftJoin(shops, eq(shops.ownerUserId, users.id))
      .where(eq(users.id, payload.sub));
    if (!row) return null;
    if (row.isBlocked) throw forbidden('user_blocked');
    return {
      id: row.id,
      role: row.role,
      name: row.name,
      shopId: row.shopId ?? null,
      sessionId: payload.sid,
    };
  }
}

export function bearerToken(header: unknown): string | null {
  if (typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}
