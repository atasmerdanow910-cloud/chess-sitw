import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

import { getEnv } from '../config/env.js';
import { AuthUser, IS_PUBLIC, Role, ROLES } from '../common/auth-context.js';
import { forbidden, unauthorized } from '../common/errors.js';
import { AccessResolver, bearerToken } from './access.js';

/** Global guard: login required unless @Public(); checks @Roles(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: AccessResolver,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== 'http') return true;
    const targets = [ctx.getHandler(), ctx.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets) ?? false;
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, unknown>; user?: AuthUser }>();

    const token = bearerToken(req.headers.authorization);
    if (token) {
      const user = await this.access.resolve(token);
      if (user) req.user = user;
      else if (!isPublic) throw unauthorized('invalid_token');
    }
    if (isPublic) return true;
    if (!req.user) throw unauthorized();

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, targets);
    if (roles && !roles.includes(req.user.role)) throw forbidden();
    return true;
  }
}

/** Rate limits per logged-in user, or per IP for guests. */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.user as AuthUser | undefined;
    return user ? `u:${user.id}` : `ip:${String(req.ip)}`;
  }

  protected override async shouldSkip(ctx: ExecutionContext): Promise<boolean> {
    if (getEnv().RATE_LIMIT_DISABLED) return true;
    return super.shouldSkip(ctx);
  }
}
