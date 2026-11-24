import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';

import { AuthUser, CurrentUser, Public } from '../common/auth-context.js';
import { zText, ZodPipe } from '../common/zod.js';
import { AuthService } from './auth.service.js';
import { TokenService } from './tokens.js';

const zPassword = z.string().min(8).max(128);
const zLocale = z.enum(['ru', 'tk']);
const zPhone = z.string().trim().min(6).max(32);
const zName = zText(80).pipe(z.string().min(1));

const registerSchema = z
  .object({ name: zName, phone: zPhone, password: zPassword, locale: zLocale.optional() })
  .strict();
const loginSchema = z.object({ phone: zPhone, password: z.string().min(1).max(128) }).strict();
const googleSchema = z.object({ idToken: z.string().min(10).max(4096), locale: zLocale.optional() }).strict();
const refreshSchema = z.object({ refreshToken: z.string().min(10).max(200) }).strict();
const updateMeSchema = z
  .object({ name: zName.optional(), locale: zLocale.optional(), phone: zPhone.optional() })
  .strict();
const passwordSchema = z
  .object({ currentPassword: z.string().max(128).optional(), newPassword: zPassword })
  .strict();
const inviteSchema = z.object({ code: z.string().trim().min(4).max(20) }).strict();

const strict = { default: { limit: 10, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
  ) {}

  @Public()
  @Throttle(strict)
  @Post('register')
  register(@Body(new ZodPipe(registerSchema)) body: z.infer<typeof registerSchema>) {
    return this.auth.register(body);
  }

  @Public()
  @Throttle(strict)
  @HttpCode(200)
  @Post('login')
  login(@Body(new ZodPipe(loginSchema)) body: z.infer<typeof loginSchema>) {
    return this.auth.login(body);
  }

  @Public()
  @Throttle(strict)
  @HttpCode(200)
  @Post('google')
  google(@Body(new ZodPipe(googleSchema)) body: z.infer<typeof googleSchema>) {
    return this.auth.loginWithGoogle(body.idToken, body.locale);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(200)
  @Post('refresh')
  refresh(@Body(new ZodPipe(refreshSchema)) body: z.infer<typeof refreshSchema>) {
    return this.tokens.rotate(body.refreshToken);
  }

  @Public()
  @HttpCode(204)
  @Post('logout')
  async logout(@Body(new ZodPipe(refreshSchema)) body: z.infer<typeof refreshSchema>) {
    await this.tokens.revoke(body.refreshToken);
  }

  @HttpCode(204)
  @Post('logout-all')
  async logoutAll(@CurrentUser() user: AuthUser) {
    await this.tokens.revokeAll(user.id);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body(new ZodPipe(updateMeSchema)) body: z.infer<typeof updateMeSchema>) {
    return this.auth.updateMe(user.id, body);
  }

  @Throttle(strict)
  @HttpCode(204)
  @Post('password')
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(passwordSchema)) body: z.infer<typeof passwordSchema>,
  ) {
    await this.auth.changePassword(user.id, user.sessionId, body);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('invite')
  claimInvite(@CurrentUser() user: AuthUser, @Body(new ZodPipe(inviteSchema)) body: z.infer<typeof inviteSchema>) {
    return this.auth.claimInvite(user, body.code);
  }
}
