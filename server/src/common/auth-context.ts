import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export type Role = 'buyer' | 'seller' | 'owner';

export interface AuthUser {
  id: string;
  role: Role;
  name: string;
  /** Shop of a seller (null for buyers/owner or if not linked yet). */
  shopId: string | null;
  /** Login session (device) of the current access token. */
  sessionId: string;
}

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';

/** Endpoint works without login (token is still read if present). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Only these roles may call the endpoint. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
  return req.user;
});
