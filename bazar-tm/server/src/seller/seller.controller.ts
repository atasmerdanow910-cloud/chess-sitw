import { Controller, Get } from '@nestjs/common';
import { errors } from '../common/api-error';
import { AuthUser, CurrentUser, Roles } from '../common/auth-user';
import { PublicShop, toPublicShop, UsersService } from '../users/users.service';

/**
 * Seller panel API. The shop is always found from the signed-in seller, never from an id
 * in the request, so one seller can't reach another seller's shop (spec, section 7).
 */
@Controller('seller')
@Roles('seller')
export class SellerController {
  constructor(private readonly users: UsersService) {}

  @Get('shop')
  async shop(@CurrentUser() user: AuthUser): Promise<PublicShop> {
    const shop = await this.users.shopOf(user.id);
    if (!shop) throw errors.notFound('Shop');
    return toPublicShop(shop);
  }
}
