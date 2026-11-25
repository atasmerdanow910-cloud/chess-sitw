import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { AuthUser, CurrentUser, Roles } from '../common/auth-user';
import { RateLimit } from '../common/rate-limit';
import { PRINTABLE, Trim } from '../common/validation';
import { PublicUser } from '../users/users.service';
import { InvitesService, InviteView } from './invites.service';

export class RedeemInviteDto {
  @IsString()
  @MaxLength(32)
  code!: string;
}

export class CreateInviteDto {
  @Trim()
  @IsString()
  @Length(1, 80)
  @Matches(PRINTABLE)
  sellerName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  sellerPhone?: string;

  @Trim()
  @IsString()
  @Length(1, 80)
  @Matches(PRINTABLE)
  shopName!: string;
}

@Controller('invites')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  /** A buyer turns into a seller with the code the owner gave in person. Few tries per hour: codes can't be guessed. */
  @Post('redeem')
  @HttpCode(HttpStatus.OK)
  @Roles('buyer')
  @RateLimit({ name: 'invite', limit: 10, windowMs: 60 * 60_000 })
  redeem(@CurrentUser() user: AuthUser, @Body() dto: RedeemInviteDto): Promise<PublicUser> {
    return this.invites.redeem(user.id, dto.code);
  }
}

/** Owner only: create, list and revoke seller invites. */
@Controller('admin/invites')
@Roles('owner')
export class AdminInvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Post()
  create(@CurrentUser() owner: AuthUser, @Body() dto: CreateInviteDto): Promise<{ code: string; invite: InviteView }> {
    return this.invites.create(owner.id, dto);
  }

  @Get()
  async list(): Promise<{ items: InviteView[] }> {
    return { items: await this.invites.list() };
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(@CurrentUser() owner: AuthUser, @Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.invites.revoke(owner.id, id);
  }
}
