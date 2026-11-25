import { Global, Inject, Injectable, Module } from '@nestjs/common';
import { DB, Db } from '../db/db.module';
import { auditLog } from '../db/schema';

/** Records owner and security actions: who, what, on which object. Ids only, no personal data. */
@Injectable()
export class AuditService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async log(actorUserId: string | null, action: string, targetType?: string, targetId?: string, meta: Record<string, unknown> = {}): Promise<void> {
    await this.db.insert(auditLog).values({ actorUserId, action, targetType: targetType ?? null, targetId: targetId ?? null, meta });
  }
}

@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
