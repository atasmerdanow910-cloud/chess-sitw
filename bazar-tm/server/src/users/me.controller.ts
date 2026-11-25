import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Patch, Post } from '@nestjs/common';
import { IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { eq } from 'drizzle-orm';
import { weakPassword } from '../auth/auth.service';
import { PasswordService } from '../auth/password.service';
import { TokensService } from '../auth/tokens.service';
import { ApiError, errors } from '../common/api-error';
import { AuthUser, CurrentUser } from '../common/auth-user';
import { RateLimit } from '../common/rate-limit';
import { PRINTABLE, Trim } from '../common/validation';
import { DB, Db } from '../db/db.module';
import { users } from '../db/schema';
import { PublicUser, UsersService } from './users.service';

export class UpdateMeDto {
  @IsOptional()
  @Trim()
  @IsString()
  @Length(1, 80)
  @Matches(PRINTABLE)
  name?: string;

  @IsOptional()
  @IsIn(['ru', 'tk'])
  locale?: 'ru' | 'tk';
}

export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  currentPassword?: string;

  @IsString()
  @MaxLength(128)
  newPassword!: string;
}

/** The signed-in user's own profile. There is no route to read another user's profile. */
@Controller('me')
export class MeController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokensService,
  ) {}

  @Get()
  async me(@CurrentUser() auth: AuthUser): Promise<PublicUser> {
    const user = await this.users.byId(auth.id);
    if (!user) throw errors.sessionExpired();
    return this.users.toPublic(user);
  }

  @Patch()
  async update(@CurrentUser() auth: AuthUser, @Body() dto: UpdateMeDto): Promise<PublicUser> {
    const [user] = await this.db
      .update(users)
      .set({ ...(dto.name !== undefined && { name: dto.name }), ...(dto.locale !== undefined && { locale: dto.locale }), updatedAt: new Date() })
      .where(eq(users.id, auth.id))
      .returning();
    return this.users.toPublic(user);
  }

  /** Changes the password and signs out all other devices. */
  @Post('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit({ name: 'password', limit: 10, windowMs: 60 * 60_000 })
  async changePassword(@CurrentUser() auth: AuthUser, @Body() dto: ChangePasswordDto): Promise<void> {
    const user = await this.users.byId(auth.id);
    if (!user) throw errors.sessionExpired();
    if (user.passwordHash) {
      const ok = dto.currentPassword ? await this.passwords.verify(user.passwordHash, dto.currentPassword) : false;
      if (!ok) throw new ApiError('wrong_password', HttpStatus.BAD_REQUEST, 'Current password is wrong');
    }
    const weakness = this.passwords.weakness(dto.newPassword, user.phone);
    if (weakness) throw weakPassword(weakness);
    await this.db
      .update(users)
      .set({ passwordHash: await this.passwords.hash(dto.newPassword), mustChangePassword: false, updatedAt: new Date() })
      .where(eq(users.id, auth.id));
    await this.tokens.revokeAll(auth.id, auth.sessionId);
  }
}
