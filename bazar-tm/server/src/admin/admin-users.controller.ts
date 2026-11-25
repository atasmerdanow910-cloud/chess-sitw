import { Controller, Get, HttpCode, HttpStatus, Inject, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { and, count, desc, eq, ilike, or, SQL } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from '../auth/password.service';
import { TokensService } from '../auth/tokens.service';
import { ApiError, errors } from '../common/api-error';
import { AuthUser, CurrentUser, Roles } from '../common/auth-user';
import { DB, Db } from '../db/db.module';
import { Role, users } from '../db/schema';

export class ListUsersQuery {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  search?: string;

  @IsOptional()
  @IsIn(['owner', 'seller', 'buyer'])
  role?: Role;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset = 0;
}

export interface AdminUserView {
  id: string;
  role: Role;
  name: string;
  phone: string | null;
  isBlocked: boolean;
  createdAt: string;
}

/** Turns user input into a literal LIKE pattern: % and _ typed by the owner match themselves. */
const likePattern = (text: string) => `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** Owner only: find users, block or unblock them, reset a forgotten password. Every action is audited. */
@Controller('admin/users')
@Roles('owner')
export class AdminUsersController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly tokens: TokensService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Query() query: ListUsersQuery): Promise<{ items: AdminUserView[]; total: number }> {
    const conditions: SQL[] = [];
    if (query.role) conditions.push(eq(users.role, query.role));
    const search = query.search?.trim();
    if (search) {
      const digits = search.replace(/\D/g, '');
      const byName = ilike(users.name, likePattern(search));
      conditions.push(digits.length >= 3 ? (or(byName, ilike(users.phone, likePattern(digits))) as SQL) : byName);
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const rows = await this.db
      .select({ id: users.id, role: users.role, name: users.name, phone: users.phone, isBlocked: users.isBlocked, createdAt: users.createdAt })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(query.limit)
      .offset(query.offset);
    const [{ total }] = await this.db.select({ total: count() }).from(users).where(where);
    return { items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })), total };
  }

  @Post(':id/block')
  @HttpCode(HttpStatus.NO_CONTENT)
  async block(@CurrentUser() owner: AuthUser, @Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.target(id);
    await this.db.update(users).set({ isBlocked: true, updatedAt: new Date() }).where(eq(users.id, id));
    await this.tokens.revokeAll(id);
    await this.audit.log(owner.id, 'user.block', 'user', id);
  }

  @Post(':id/unblock')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unblock(@CurrentUser() owner: AuthUser, @Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.target(id);
    await this.db.update(users).set({ isBlocked: false, updatedAt: new Date() }).where(eq(users.id, id));
    await this.audit.log(owner.id, 'user.unblock', 'user', id);
  }

  /** Forgotten password: the owner gives the user a temporary one; the app then asks for a new password. */
  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@CurrentUser() owner: AuthUser, @Param('id', new ParseUUIDPipe()) id: string): Promise<{ temporaryPassword: string }> {
    const user = await this.target(id);
    if (!user.phone) throw new ApiError('validation_failed', HttpStatus.BAD_REQUEST, 'This user signs in with Google only');
    const temporaryPassword = this.passwords.temporary();
    await this.db
      .update(users)
      .set({ passwordHash: await this.passwords.hash(temporaryPassword), mustChangePassword: true, updatedAt: new Date() })
      .where(eq(users.id, id));
    await this.tokens.revokeAll(id);
    await this.audit.log(owner.id, 'user.reset_password', 'user', id);
    return { temporaryPassword };
  }

  /** Owners can't be blocked or reset from the app (also protects the owner from locking themselves out). */
  private async target(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) throw errors.notFound('User');
    if (user.role === 'owner') throw new ApiError('cannot_change_owner', HttpStatus.FORBIDDEN, 'Owner accounts are managed from the server console');
    return user;
  }
}
