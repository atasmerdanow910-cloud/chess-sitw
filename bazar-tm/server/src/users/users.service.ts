import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB, Db } from '../db/db.module';
import { Role, ShopRow, shops, UserRow, users } from '../db/schema';

/** What the app receives about the signed-in user. Never the password hash or Google id. */
export interface PublicUser {
  id: string;
  role: Role;
  name: string;
  phone: string | null;
  email: string | null;
  locale: 'ru' | 'tk';
  hasPassword: boolean;
  googleLinked: boolean;
  mustChangePassword: boolean;
  shop: PublicShop | null;
  createdAt: string;
}

export interface PublicShop {
  id: string;
  name: string;
  status: ShopRow['status'];
  subscriptionUntil: string | null;
}

export function toPublicShop(shop: ShopRow): PublicShop {
  return { id: shop.id, name: shop.name, status: shop.status, subscriptionUntil: shop.subscriptionUntil?.toISOString() ?? null };
}

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async byId(id: string): Promise<UserRow | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  }

  async byPhone(phone: string): Promise<UserRow | null> {
    const [row] = await this.db.select().from(users).where(eq(users.phone, phone)).limit(1);
    return row ?? null;
  }

  async byGoogleId(googleId: string): Promise<UserRow | null> {
    const [row] = await this.db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
    return row ?? null;
  }

  async shopOf(userId: string): Promise<ShopRow | null> {
    const [row] = await this.db.select().from(shops).where(eq(shops.ownerUserId, userId)).limit(1);
    return row ?? null;
  }

  async toPublic(user: UserRow): Promise<PublicUser> {
    const shop = user.role === 'seller' ? await this.shopOf(user.id) : null;
    return {
      id: user.id,
      role: user.role,
      name: user.name,
      phone: user.phone,
      email: user.email,
      locale: user.locale === 'tk' ? 'tk' : 'ru',
      hasPassword: user.passwordHash !== null,
      googleLinked: user.googleId !== null,
      mustChangePassword: user.mustChangePassword,
      shop: shop ? toPublicShop(shop) : null,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
