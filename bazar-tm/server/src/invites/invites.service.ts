import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { createHash, randomInt } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { invalidPhone } from '../auth/auth.service';
import { ApiError, errors } from '../common/api-error';
import { normalizePhone } from '../common/phone';
import { DB, Db } from '../db/db.module';
import { invites, shops, users } from '../db/schema';
import { PublicUser, UsersService } from '../users/users.service';

/** Codes have no look-alike characters (0/O, 1/I/L) so they can be dictated by phone. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 10;
export const INVITE_TTL_DAYS = 7;
/** New sellers get a free first month (spec, section 9). */
export const TRIAL_DAYS = 30;

const DAY_MS = 24 * 3600 * 1000;

export type InviteStatus = 'active' | 'used' | 'expired' | 'revoked';

export interface InviteView {
  id: string;
  sellerName: string;
  sellerPhone: string | null;
  shopId: string;
  shopName: string;
  status: InviteStatus;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

const hashCode = (code: string) => createHash('sha256').update(normalizeCode(code)).digest('hex');

@Injectable()
export class InvitesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
    private readonly users: UsersService,
  ) {}

  /** Owner meets a trader, then creates the shop and a one-time code. The code is shown only once. */
  async create(ownerId: string, input: { sellerName: string; sellerPhone?: string; shopName: string }): Promise<{ code: string; invite: InviteView }> {
    let sellerPhone: string | null = null;
    if (input.sellerPhone) {
      sellerPhone = normalizePhone(input.sellerPhone);
      if (!sellerPhone) throw invalidPhone();
    }
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)];
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * DAY_MS);

    const invite = await this.db.transaction(async (tx) => {
      const [shop] = await tx.insert(shops).values({ name: input.shopName, status: 'pending' }).returning();
      const [row] = await tx
        .insert(invites)
        .values({ codeHash: hashCode(code), shopId: shop.id, sellerName: input.sellerName, sellerPhone, createdBy: ownerId, expiresAt })
        .returning();
      return { row, shop };
    });
    await this.audit.log(ownerId, 'invite.create', 'invite', invite.row.id, { shopId: invite.shop.id });
    return { code: `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`, invite: this.view(invite.row, invite.shop.name) };
  }

  async list(): Promise<InviteView[]> {
    const rows = await this.db
      .select({ invite: invites, shopName: shops.name })
      .from(invites)
      .innerJoin(shops, eq(shops.id, invites.shopId))
      .orderBy(desc(invites.createdAt))
      .limit(200);
    return rows.map((r) => this.view(r.invite, r.shopName));
  }

  async revoke(ownerId: string, inviteId: string): Promise<void> {
    const [row] = await this.db
      .update(invites)
      .set({ revokedAt: new Date() })
      .where(and(eq(invites.id, inviteId), isNull(invites.usedAt), isNull(invites.revokedAt)))
      .returning({ id: invites.id });
    if (!row) throw errors.notFound('Active invite');
    await this.audit.log(ownerId, 'invite.revoke', 'invite', inviteId);
  }

  /** A buyer enters the code: the account becomes a seller and the shop opens with a trial month. */
  async redeem(userId: string, code: string): Promise<PublicUser> {
    const normalized = normalizeCode(code);
    if (normalized.length !== CODE_LENGTH) throw this.invalid();
    const now = new Date();

    const outcome = await this.db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.id, userId)).for('update');
      if (!user) return { kind: 'invalid' as const };
      if (user.role !== 'buyer') return { kind: 'already' as const };
      const [invite] = await tx
        .select()
        .from(invites)
        .where(and(eq(invites.codeHash, hashCode(normalized)), isNull(invites.usedAt), isNull(invites.revokedAt), gt(invites.expiresAt, now)))
        .for('update');
      if (!invite) return { kind: 'invalid' as const };
      await tx.update(invites).set({ usedAt: now, usedBy: userId }).where(eq(invites.id, invite.id));
      await tx
        .update(shops)
        .set({ ownerUserId: userId, status: 'active', subscriptionUntil: new Date(now.getTime() + TRIAL_DAYS * DAY_MS), updatedAt: now })
        .where(eq(shops.id, invite.shopId));
      const [updated] = await tx.update(users).set({ role: 'seller', updatedAt: now }).where(eq(users.id, userId)).returning();
      return { kind: 'ok' as const, user: updated, inviteId: invite.id, shopId: invite.shopId };
    });

    if (outcome.kind === 'already') throw new ApiError('already_seller', HttpStatus.CONFLICT, 'This account already has a seller or owner role');
    if (outcome.kind !== 'ok') throw this.invalid();
    await this.audit.log(userId, 'invite.redeem', 'invite', outcome.inviteId, { shopId: outcome.shopId });
    return this.users.toPublic(outcome.user);
  }

  private invalid(): ApiError {
    return new ApiError('invite_invalid', HttpStatus.BAD_REQUEST, 'Invite code is wrong, used, revoked or expired');
  }

  private view(row: typeof invites.$inferSelect, shopName: string): InviteView {
    const status: InviteStatus = row.usedAt ? 'used' : row.revokedAt ? 'revoked' : row.expiresAt <= new Date() ? 'expired' : 'active';
    return {
      id: row.id,
      sellerName: row.sellerName,
      sellerPhone: row.sellerPhone,
      shopId: row.shopId,
      shopName,
      status,
      expiresAt: row.expiresAt.toISOString(),
      usedAt: row.usedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
