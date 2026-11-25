import { createRemoteJWKSet, jwtVerify, JWTVerifyGetKey } from 'jose';

/** What we take from a Google ID token: the stable account id and, if confirmed, the e-mail. */
export interface GoogleIdentity {
  sub: string;
  email: string | null;
  name: string | null;
}

export interface GoogleVerifier {
  /** False when no client IDs are configured: Google sign-in is switched off. */
  readonly enabled: boolean;
  verify(idToken: string): Promise<GoogleIdentity>;
}

export const GOOGLE_VERIFIER = Symbol('GOOGLE_VERIFIER');

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

/**
 * Checks a Google ID token on the server: Google's signature, issuer, our client id as audience, expiry.
 * The app's word is never trusted on its own.
 */
export class JoseGoogleVerifier implements GoogleVerifier {
  private keys: JWTVerifyGetKey | null;

  constructor(
    private readonly clientIds: string[],
    keys?: JWTVerifyGetKey,
  ) {
    this.keys = keys ?? null;
  }

  get enabled(): boolean {
    return this.clientIds.length > 0;
  }

  async verify(idToken: string): Promise<GoogleIdentity> {
    // Google's public keys are fetched on first use and cached; a slow network fails fast.
    this.keys ??= createRemoteJWKSet(new URL(GOOGLE_JWKS_URL), { timeoutDuration: 5000, cooldownDuration: 30_000 });
    const { payload } = await jwtVerify(idToken, this.keys, {
      issuer: GOOGLE_ISSUERS,
      audience: this.clientIds,
      algorithms: ['RS256'],
      clockTolerance: 30,
    });
    if (typeof payload.sub !== 'string' || payload.sub.length === 0 || payload.sub.length > 255) {
      throw new Error('Google token has no subject');
    }
    const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
    return {
      sub: payload.sub,
      email: emailVerified && typeof payload.email === 'string' ? payload.email.slice(0, 254) : null,
      name: typeof payload.name === 'string' ? payload.name : null,
    };
  }
}
