import { and, eq, gt, isNotNull, sql, SQL } from 'drizzle-orm';

import { products, shops } from '../db/schema.js';

/**
 * A shop is visible to buyers only if it is active, has a seller and a paid subscription.
 * An expired subscription hides the shop but keeps all its data.
 */
export function shopVisible(): SQL {
  return and(
    eq(shops.status, 'active'),
    isNotNull(shops.ownerUserId),
    gt(shops.subscriptionUntil, sql`now()`),
  ) as SQL;
}

export function productVisible(): SQL {
  return and(eq(products.status, 'active'), shopVisible()) as SQL;
}

/** Escapes % and _ for ILIKE. The value is still sent as a query parameter. */
export function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
}
