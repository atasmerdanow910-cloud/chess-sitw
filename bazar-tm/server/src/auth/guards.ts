import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { and, eq } from 'drizzle-orm';
import type { Request } from 'express';
import { AuthUser, IS_PUBLIC_KEY, ROLES_KEY } from '../common/auth-user';
import { errors } from '../common/api-error';
import { DB, Db } from '../db/db.module';
import { Role, sessions, users } from '../db/schema';
import { TokensService } from './tokens.service';

/**
 * Runs before every route. Checks the access token, then the database: the session must still
 * be active and the user not blocked. The role is read from the database on every request,
 * so a block or a new role works at once, without waiting for the token to expire.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokensService,
    @Inject(DB) private readonly db: Db,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) throw errors.unauthorized();
    const claims = await this.tokens.verifyAccess(header.slice(7).trim());

    const [row] = await this.db
      .select({ role: users.role, isBlocked: users.isBlocked, revokedAt: sessions.revokedAt, expiresAt: sessions.expiresAt })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.id, claims.sessionId), eq(sessions.userId, claims.userId)))
      .limit(1);
    if (!row || row.revokedAt || row.expiresAt <= new Date()) throw errors.sessionExpired();
    if (row.isBlocked) throw errors.blocked();

    req.user = { id: claims.userId, role: row.role, sessionId: claims.sessionId };
    return true;
  }
}

/** Checks @Roles(...) after AuthGuard. Routes without @Roles are open to every signed-in user. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!roles || roles.length === 0) return true;
    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (!user || !roles.includes(user.role)) throw errors.forbidden();
    return true;
  }
}
