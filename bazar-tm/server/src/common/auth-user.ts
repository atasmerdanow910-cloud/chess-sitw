import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role } from '../db/schema';

/** The signed-in user, attached to the request by AuthGuard. Role comes from the database, not the token. */
export interface AuthUser {
  id: string;
  role: Role;
  sessionId: string;
}

export const IS_PUBLIC_KEY = 'bazar:public';
export const ROLES_KEY = 'bazar:roles';

/** Opens a route to everyone. Every other route requires a signed-in user (secure by default). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Only these roles may call the route. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUser => {
  return context.switchToHttp().getRequest<{ user: AuthUser }>().user;
});
