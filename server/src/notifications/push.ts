import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { GoogleAuth } from 'google-auth-library';
import { eq, inArray } from 'drizzle-orm';

import { getEnv } from '../config/env.js';
import { Db, InjectDb } from '../db/db.js';
import { deviceTokens } from '../db/schema.js';

/**
 * Firebase Cloud Messaging (HTTP v1). Optional: works only if FCM_SERVICE_ACCOUNT_FILE is set.
 * Google may be blocked in Turkmenistan, so the app also gets events over WebSocket
 * and loads notifications when it opens. Push failures never break the request.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private auth: GoogleAuth | null = null;
  private projectId: string | null = null;
  private initialized = false;

  constructor(@InjectDb() private readonly db: Db) {}

  private async init(): Promise<boolean> {
    if (this.initialized) return this.auth !== null;
    this.initialized = true;
    const file = getEnv().FCM_SERVICE_ACCOUNT_FILE;
    if (!file) return false;
    try {
      const json = JSON.parse(await readFile(file, 'utf8')) as { project_id?: string };
      this.projectId = json.project_id ?? null;
      this.auth = new GoogleAuth({
        keyFile: file,
        scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
      });
      return this.projectId !== null;
    } catch {
      this.logger.warn('FCM disabled: cannot read service account file');
      this.auth = null;
      return false;
    }
  }

  async sendToUser(userId: string, title: string, body: string, data: Record<string, string>): Promise<void> {
    if (!(await this.init()) || !this.auth || !this.projectId) return;
    const tokens = await this.db.select().from(deviceTokens).where(eq(deviceTokens.userId, userId));
    if (tokens.length === 0) return;
    const dead: string[] = [];
    try {
      const client = await this.auth.getClient();
      const url = `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`;
      for (const t of tokens) {
        const res = await client
          .request({
            url,
            method: 'POST',
            data: { message: { token: t.token, notification: { title, body }, data } },
            timeout: 5000,
          })
          .catch((err: { response?: { status?: number } }) => err.response ?? { status: 0 });
        if (res.status === 404 || res.status === 400) dead.push(t.token);
      }
    } catch {
      this.logger.warn('FCM send failed (network?)');
    }
    if (dead.length > 0) await this.db.delete(deviceTokens).where(inArray(deviceTokens.token, dead));
  }
}
