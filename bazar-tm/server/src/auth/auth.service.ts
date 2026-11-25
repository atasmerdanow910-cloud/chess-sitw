import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ApiError, errors } from '../common/api-error';
import { normalizePhone } from '../common/phone';
import { RATE_LIMIT_STORE, RateLimitStore } from '../common/rate-limit';
import { DB, Db } from '../db/db.module';
import { users } from '../db/schema';
import { PublicUser, UsersService } from '../users/users.service';
import { GoogleLoginDto, LoginDto, RegisterDto } from './auth.dto';
import { GOOGLE_VERIFIER, GoogleVerifier } from './google-verifier';
import { PasswordService } from './password.service';
import { TokenPair, TokensService } from './tokens.service';

export interface AuthResult {
  user: PublicUser;
  tokens: TokenPair;
}

/** Wrong passwords per phone before a 15-minute pause. Counted for unknown phones too. */
export const LOGIN_FAILURES_LIMIT = 5;
export const LOGIN_FAILURES_WINDOW_MS = 15 * 60 * 1000;

export const invalidPhone = () =>
  new ApiError('validation_failed', HttpStatus.BAD_REQUEST, 'Phone must be a Turkmen number +993 XX XXXXXX', { fields: ['phone'] });

export const weakPassword = (reason: string) =>
  new ApiError('weak_password', HttpStatus.BAD_REQUEST, `Password is too weak: ${reason}`, { reason });

function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === '23505' || e?.cause?.code === '23505';
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(RATE_LIMIT_STORE) private readonly limits: RateLimitStore,
    @Inject(GOOGLE_VERIFIER) private readonly google: GoogleVerifier,
    private readonly passwords: PasswordService,
    private readonly tokens: TokensService,
    private readonly usersService: UsersService,
  ) {}

  /** Buyers register themselves. Sellers become sellers only through an owner's invite. */
  async register(dto: RegisterDto, userAgent?: string): Promise<AuthResult> {
    const phone = normalizePhone(dto.phone);
    if (!phone) throw invalidPhone();
    const weakness = this.passwords.weakness(dto.password, phone);
    if (weakness) throw weakPassword(weakness);
    const passwordHash = await this.passwords.hash(dto.password);
    try {
      const [user] = await this.db
        .insert(users)
        .values({ name: dto.name, phone, passwordHash, locale: dto.locale ?? 'ru', role: 'buyer' })
        .returning();
      return { user: await this.usersService.toPublic(user), tokens: await this.tokens.issue(user.id, user.role, userAgent) };
    } catch (error) {
      if (isUniqueViolation(error)) throw new ApiError('phone_taken', HttpStatus.CONFLICT, 'This phone is already registered');
      throw error;
    }
  }

  async login(dto: LoginDto, userAgent?: string): Promise<AuthResult> {
    const phone = normalizePhone(dto.phone);
    if (!phone) throw invalidPhone();
    const failKey = `login-fail:${phone}`;
    if ((await this.limits.peek(failKey)) >= LOGIN_FAILURES_LIMIT) {
      throw new ApiError('too_many_attempts', HttpStatus.TOO_MANY_REQUESTS, 'Too many wrong passwords, try again in 15 minutes', {
        retryAfterSeconds: LOGIN_FAILURES_WINDOW_MS / 1000,
      });
    }
    const user = await this.usersService.byPhone(phone);
    const ok = user?.passwordHash ? await this.passwords.verify(user.passwordHash, dto.password) : await this.passwords.verifyDummy(dto.password);
    if (!user || !ok) {
      await this.limits.hit(failKey, LOGIN_FAILURES_WINDOW_MS);
      throw new ApiError('invalid_credentials', HttpStatus.UNAUTHORIZED, 'Wrong phone or password');
    }
    if (user.isBlocked) throw errors.blocked();
    await this.limits.reset(failKey);
    return { user: await this.usersService.toPublic(user), tokens: await this.tokens.issue(user.id, user.role, userAgent) };
  }

  /** Google sign-in. If Google is switched off or unreachable, the app falls back to phone + password. */
  async loginWithGoogle(dto: GoogleLoginDto, userAgent?: string): Promise<AuthResult> {
    if (!this.google.enabled) throw new ApiError('google_unavailable', HttpStatus.SERVICE_UNAVAILABLE, 'Google sign-in is not configured');
    let identity;
    try {
      identity = await this.google.verify(dto.idToken);
    } catch {
      throw new ApiError('invalid_google_token', HttpStatus.UNAUTHORIZED, 'Google token is invalid or expired');
    }
    let user = await this.usersService.byGoogleId(identity.sub);
    if (!user) {
      try {
        [user] = await this.db
          .insert(users)
          .values({
            name: (identity.name?.trim() || 'Google').slice(0, 80),
            googleId: identity.sub,
            email: identity.email,
            locale: dto.locale ?? 'ru',
            role: 'buyer',
          })
          .returning();
      } catch (error) {
        // Two first sign-ins at the same moment: the other request created the account.
        if (!isUniqueViolation(error)) throw error;
        user = await this.usersService.byGoogleId(identity.sub);
        if (!user) throw error;
      }
    }
    if (user.isBlocked) throw errors.blocked();
    return { user: await this.usersService.toPublic(user), tokens: await this.tokens.issue(user.id, user.role, userAgent) };
  }
}
