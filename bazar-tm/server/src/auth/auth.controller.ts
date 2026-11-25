import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthUser, CurrentUser, Public } from '../common/auth-user';
import { RateLimit } from '../common/rate-limit';
import { UsersService } from '../users/users.service';
import { GoogleLoginDto, LoginDto, RefreshDto, RegisterDto } from './auth.dto';
import { AuthResult, AuthService } from './auth.service';
import { TokenPair, TokensService } from './tokens.service';

const MINUTE = 60_000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokensService,
    private readonly users: UsersService,
  ) {}

  @Public()
  @Post('register')
  @RateLimit({ name: 'register', limit: 10, windowMs: 60 * MINUTE })
  register(@Body() dto: RegisterDto, @Headers('user-agent') userAgent?: string): Promise<AuthResult> {
    return this.auth.register(dto, userAgent);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ name: 'login', limit: 30, windowMs: 10 * MINUTE })
  login(@Body() dto: LoginDto, @Headers('user-agent') userAgent?: string): Promise<AuthResult> {
    return this.auth.login(dto, userAgent);
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ name: 'login', limit: 30, windowMs: 10 * MINUTE })
  google(@Body() dto: GoogleLoginDto, @Headers('user-agent') userAgent?: string): Promise<AuthResult> {
    return this.auth.loginWithGoogle(dto, userAgent);
  }

  /** New token pair for a refresh token; the old refresh token stops working. */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ name: 'refresh', limit: 120, windowMs: 10 * MINUTE })
  async refresh(@Body() dto: RefreshDto): Promise<{ tokens: TokenPair }> {
    const { tokens } = await this.tokens.rotate(dto.refreshToken);
    return { tokens };
  }

  /** Signs out this device. Works with an expired access token too. */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit({ name: 'refresh', limit: 120, windowMs: 10 * MINUTE })
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.tokens.revokeByRefresh(dto.refreshToken);
  }

  /** Signs out every device, including this one. */
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(@CurrentUser() user: AuthUser): Promise<void> {
    await this.tokens.revokeAll(user.id);
  }
}
