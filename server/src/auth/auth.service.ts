import { HttpStatus, Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import { and, eq, isNull } from 'drizzle-orm';

import { getEnv } from '../config/env.js';
import { AuthUser } from '../common/auth-context.js';
import { AuditService } from '../common/audit.js';
import { ApiError, badRequest, conflict, forbidden, unauthorized } from '../common/errors.js';
import { normalizePhone } from '../common/phone.js';
import { Db, InjectDb } from '../db/db.js';
import { invites, shops, users } from '../db/schema.js';
import { GoogleVerifier } from './google.js';
import { TokenPair, TokenService } from './tokens.js';

// argon2id with OWASP-recommended parameters (19 MiB, 2 iterations).
const ARGON = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;
let dummyHash: Promise<string> | undefined;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON);
}

export type PublicUser = {
  id: string;
  role: string;
  name: string;
  phone: string | null;
  email: string | null;
  locale: string;
  hasPassword: boolean;
  hasGoogle: boolean;
  shopId: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly tokens: TokenService,
    private readonly google: GoogleVerifier,
    private readonly audit: AuditService,
  ) {}

  private phoneOrThrow(phone: string): string {
    const normalized = normalizePhone(phone);
    if (!normalized) throw badRequest('invalid_phone');
    return normalized;
  }

  async register(input: { name: string; phone: string; password: string; locale?: string }): Promise<TokenPair> {
    const phone = this.phoneOrThrow(input.phone);
    const [existing] = await this.db.select({ id: users.id }).from(users).where(eq(users.phone, phone));
    if (existing) throw conflict('phone_taken');
    const [user] = await this.db
      .insert(users)
      .values({
        name: input.name,
        phone,
        passwordHash: await hashPassword(input.password),
        locale: input.locale ?? 'ru',
        role: 'buyer',
      })
      .returning({ id: users.id });
    return this.tokens.issue(user.id);
  }

  async login(input: { phone: string; password: string }): Promise<TokenPair> {
    const env = getEnv();
    const phone = normalizePhone(input.phone);
    const [user] = phone ? await this.db.select().from(users).where(eq(users.phone, phone)) : [];
    if (!user || !user.passwordHash) {
      // Same work as a real check, so attackers can't tell which phones exist.
      dummyHash ??= hashPassword('dummy-password-for-timing');
      await verify(await dummyHash, input.password).catch(() => false);
      throw unauthorized('invalid_credentials');
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const retryAfter = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
      throw new ApiError(HttpStatus.TOO_MANY_REQUESTS, 'account_locked', { retryAfter });
    }
    const ok = await verify(user.passwordHash, input.password).catch(() => false);
    if (!ok) {
      const failed = user.failedLoginCount + 1;
      const lock = failed >= env.LOGIN_MAX_ATTEMPTS;
      await this.db
        .update(users)
        .set({
          failedLoginCount: lock ? 0 : failed,
          lockedUntil: lock ? new Date(Date.now() + env.LOGIN_LOCK_MINUTES * 60_000) : user.lockedUntil,
        })
        .where(eq(users.id, user.id));
      throw unauthorized('invalid_credentials');
    }
    if (user.isBlocked) throw forbidden('user_blocked');
    if (user.failedLoginCount > 0 || user.lockedUntil) {
      await this.db.update(users).set({ failedLoginCount: 0, lockedUntil: null }).where(eq(users.id, user.id));
    }
    return this.tokens.issue(user.id);
  }

  async loginWithGoogle(idToken: string, locale?: string): Promise<TokenPair> {
    const profile = await this.google.verify(idToken);
    let [user] = await this.db.select().from(users).where(eq(users.googleId, profile.googleId));
    if (!user) {
      [user] = await this.db
        .insert(users)
        .values({
          name: profile.name,
          email: profile.email,
          googleId: profile.googleId,
          locale: locale ?? 'ru',
          role: 'buyer',
        })
        .returning();
    }
    if (user.isBlocked) throw forbidden('user_blocked');
    return this.tokens.issue(user.id);
  }

  async me(userId: string): Promise<PublicUser> {
    const [row] = await this.db
      .select({ user: users, shopId: shops.id })
      .from(users)
      .leftJoin(shops, eq(shops.ownerUserId, users.id))
      .where(eq(users.id, userId));
    if (!row) throw unauthorized();
    const u = row.user;
    return {
      id: u.id,
      role: u.role,
      name: u.name,
      phone: u.phone,
      email: u.email,
      locale: u.locale,
      hasPassword: Boolean(u.passwordHash),
      hasGoogle: Boolean(u.googleId),
      shopId: row.shopId ?? null,
    };
  }

  async updateMe(userId: string, input: { name?: string; locale?: string; phone?: string }): Promise<PublicUser> {
    const patch: Partial<typeof users.$inferInsert> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.locale !== undefined) patch.locale = input.locale;
    if (input.phone !== undefined) {
      const phone = this.phoneOrThrow(input.phone);
      const [other] = await this.db.select({ id: users.id }).from(users).where(eq(users.phone, phone));
      if (other && other.id !== userId) throw conflict('phone_taken');
      patch.phone = phone;
    }
    if (Object.keys(patch).length > 0) await this.db.update(users).set(patch).where(eq(users.id, userId));
    return this.me(userId);
  }

  /** Changes or sets (for Google accounts) the password. Logs out all other devices. */
  async changePassword(
    userId: string,
    sessionId: string | null,
    input: { currentPassword?: string; newPassword: string },
  ): Promise<void> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!user) throw unauthorized();
    if (user.passwordHash) {
      const ok = input.currentPassword
        ? await verify(user.passwordHash, input.currentPassword).catch(() => false)
        : false;
      if (!ok) throw badRequest('wrong_password');
    }
    if (!user.phone) throw badRequest('phone_required');
    await this.db
      .update(users)
      .set({ passwordHash: await hashPassword(input.newPassword) })
      .where(eq(users.id, userId));
    await this.tokens.revokeAll(userId, sessionId ?? undefined);
  }

  /** A buyer account becomes the seller of the shop the owner prepared. */
  async claimInvite(user: AuthUser, rawCode: string): Promise<{ shopId: string }> {
    const code = rawCode.trim().toUpperCase();
    if (user.role !== 'buyer') throw conflict('already_seller');
    return this.db.transaction(async (tx) => {
      const [invite] = await tx.select().from(invites).where(eq(invites.code, code)).for('update');
      if (!invite || invite.usedAt || invite.expiresAt < new Date()) throw badRequest('invite_invalid');
      const updated = await tx
        .update(shops)
        .set({ ownerUserId: user.id })
        .where(and(eq(shops.id, invite.shopId), isNull(shops.ownerUserId)))
        .returning({ id: shops.id });
      if (updated.length === 0) throw badRequest('invite_invalid');
      await tx.update(users).set({ role: 'seller' }).where(eq(users.id, user.id));
      await tx.update(invites).set({ usedAt: new Date(), usedBy: user.id }).where(eq(invites.id, invite.id));
      await this.audit.log(user.id, 'invite.claim', 'shop', invite.shopId, {}, tx);
      return { shopId: invite.shopId };
    });
  }
}
