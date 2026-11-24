import { Injectable } from '@nestjs/common';

import { Db, InjectDb, Tx } from '../db/db.js';
import { auditLog } from '../db/schema.js';

/** Records who did what in admin/seller areas. Never store passwords or tokens here. */
@Injectable()
export class AuditService {
  constructor(@InjectDb() private readonly db: Db) {}

  async log(
    actorId: string | null,
    action: string,
    targetType: string,
    targetId: string,
    details: Record<string, unknown> = {},
    tx?: Tx,
  ): Promise<void> {
    await (tx ?? this.db).insert(auditLog).values({ actorId, action, targetType, targetId, details });
  }
}
