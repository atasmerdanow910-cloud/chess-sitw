import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

import { googleClientIds } from '../config/env.js';
import { ApiError, badRequest, unauthorized } from '../common/errors.js';

export interface GoogleProfile {
  googleId: string;
  email: string | null;
  name: string;
}

/**
 * Verifies Google ID tokens on the server.
 * Google can be unreachable from Turkmenistan: then we answer "google_unavailable"
 * and the app offers phone + password login instead.
 */
@Injectable()
export class GoogleVerifier {
  private readonly client = new OAuth2Client();

  async verify(idToken: string): Promise<GoogleProfile> {
    const audience = googleClientIds();
    if (audience.length === 0) throw badRequest('google_disabled');
    let payload;
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience });
      payload = ticket.getPayload();
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|network|fetch failed/i.test(message)) {
        throw new ApiError(HttpStatus.SERVICE_UNAVAILABLE, 'google_unavailable');
      }
      throw unauthorized('google_token_invalid');
    }
    if (!payload?.sub) throw unauthorized('google_token_invalid');
    return {
      googleId: payload.sub,
      email: payload.email_verified ? (payload.email ?? null) : null,
      name: (payload.name ?? payload.email ?? 'Google').slice(0, 80),
    };
  }
}
