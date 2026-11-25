import { SignJWT } from 'jose';
import { bearer, clientIp, createTestApp, GOOD_PASSWORD, nextPhone, registerBuyer, TestContext } from './helpers';

describe('Sign-up, sign-in and sessions (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  describe('registration', () => {
    it('creates a buyer and returns tokens, never the password hash', async () => {
      const res = await ctx.api().post('/api/v1/auth/register').send({ name: '  Merdan ', phone: '+993 61 23-45-67', password: GOOD_PASSWORD, locale: 'tk' }).expect(201);
      expect(res.body.user).toMatchObject({ role: 'buyer', name: 'Merdan', phone: '+99361234567', locale: 'tk', hasPassword: true, googleLinked: false });
      expect(res.body.tokens.accessToken).toEqual(expect.any(String));
      expect(res.body.tokens.refreshToken).toMatch(/^[0-9a-f-]{36}\./);
      expect(JSON.stringify(res.body)).not.toMatch(/argon2|password_?hash/i);
      const row = await ctx.db.pool.query('SELECT password_hash FROM users WHERE phone = $1', ['+99361234567']);
      expect(row.rows[0].password_hash).toMatch(/^\$argon2id\$/);
    });

    it('rejects a phone that is not Turkmen', async () => {
      const res = await ctx.api().post('/api/v1/auth/register').send({ name: 'A', phone: '+7 999 123 45 67', password: GOOD_PASSWORD }).expect(400);
      expect(res.body).toMatchObject({ error: 'validation_failed', fields: ['phone'] });
    });

    it.each([['1234567'], ['12345678'], ['aaaaaaaaaa'], ['password']])('rejects the weak password %s', async (password) => {
      const res = await ctx.api().post('/api/v1/auth/register').send({ name: 'A', phone: nextPhone(), password }).expect(400);
      expect(res.body.error).toBe('weak_password');
    });

    it('rejects a forged role in the request', async () => {
      const res = await ctx.api().post('/api/v1/auth/register').send({ name: 'A', phone: nextPhone(), password: GOOD_PASSWORD, role: 'owner' }).expect(400);
      expect(res.body).toMatchObject({ error: 'validation_failed', fields: ['role'] });
    });

    it('limits sign-ups from one address to 10 an hour', async () => {
      const ip = clientIp();
      for (let i = 0; i < 10; i++) {
        await ctx.api().post('/api/v1/auth/register').set('X-Forwarded-For', ip).send({ name: 'A', phone: nextPhone(), password: GOOD_PASSWORD }).expect(201);
      }
      const res = await ctx.api().post('/api/v1/auth/register').set('X-Forwarded-For', ip).send({ name: 'A', phone: nextPhone(), password: GOOD_PASSWORD }).expect(429);
      expect(res.body).toMatchObject({ error: 'too_many_requests', retryAfterSeconds: 3600 });
      // Another address still can.
      await registerBuyer(ctx);
    });

    it('does not register the same number twice, whatever the spelling', async () => {
      const phone = nextPhone();
      await registerBuyer(ctx, 'A', phone);
      const res = await ctx.api().post('/api/v1/auth/register').send({ name: 'B', phone: phone.replace('+993 ', ''), password: GOOD_PASSWORD }).expect(409);
      expect(res.body.error).toBe('phone_taken');
    });
  });

  describe('sign-in', () => {
    it('works with any spelling of the number', async () => {
      const { phone } = await registerBuyer(ctx);
      const local = phone.replace('+993', '').replace(/\D/g, '');
      const res = await ctx.api().post('/api/v1/auth/login').send({ phone: local, password: GOOD_PASSWORD }).expect(200);
      expect(res.body.user.role).toBe('buyer');
    });

    it('gives the same answer for a wrong password and an unknown phone', async () => {
      const { phone } = await registerBuyer(ctx);
      const wrong = await ctx.api().post('/api/v1/auth/login').send({ phone, password: 'not-the-password' }).expect(401);
      const unknown = await ctx.api().post('/api/v1/auth/login').send({ phone: '+993 71 999999', password: 'not-the-password' }).expect(401);
      expect(wrong.body).toEqual(unknown.body);
      expect(wrong.body.error).toBe('invalid_credentials');
    });

    it('pauses a phone after 5 wrong passwords, even for the right one', async () => {
      const { phone } = await registerBuyer(ctx);
      for (let i = 0; i < 5; i++) await ctx.api().post('/api/v1/auth/login').send({ phone, password: `wrong-${i}` }).expect(401);
      const res = await ctx.api().post('/api/v1/auth/login').send({ phone, password: GOOD_PASSWORD }).expect(429);
      expect(res.body.error).toBe('too_many_attempts');
      // Another person is not affected.
      const other = await registerBuyer(ctx);
      await ctx.api().post('/api/v1/auth/login').send({ phone: other.phone, password: GOOD_PASSWORD }).expect(200);
    });

    it('refuses a blocked account', async () => {
      const { phone, user } = await registerBuyer(ctx);
      await ctx.db.pool.query('UPDATE users SET is_blocked = true WHERE id = $1', [user.id]);
      const res = await ctx.api().post('/api/v1/auth/login').send({ phone, password: GOOD_PASSWORD }).expect(403);
      expect(res.body.error).toBe('account_blocked');
    });
  });

  describe('access tokens', () => {
    it('opens /me with a valid token', async () => {
      const buyer = await registerBuyer(ctx, 'Gülşat');
      const res = await ctx.api().get('/api/v1/me').set('Authorization', bearer(buyer)).expect(200);
      expect(res.body).toMatchObject({ id: buyer.user.id, name: 'Gülşat', role: 'buyer' });
    });

    it('rejects a forged or foreign token', async () => {
      const buyer = await registerBuyer(ctx);
      const forged = await new SignJWT({ sid: '00000000-0000-0000-0000-000000000000', role: 'owner' })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(buyer.user.id)
        .setIssuer('bazar-tm')
        .setAudience('bazar-tm-app')
        .setExpirationTime('5m')
        .sign(new TextEncoder().encode('another-secret-another-secret-123456'));
      await ctx.api().get('/api/v1/me').set('Authorization', `Bearer ${forged}`).expect(401);
      await ctx.api().get('/api/v1/me').set('Authorization', 'Bearer not-a-token').expect(401);
    });

    it('answers session_expired for an expired token, so the app refreshes', async () => {
      const buyer = await registerBuyer(ctx);
      const sessionId = buyer.tokens.refreshToken.split('.')[0];
      const expired = await new SignJWT({ sid: sessionId, role: 'buyer' })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(buyer.user.id)
        .setIssuer('bazar-tm')
        .setAudience('bazar-tm-app')
        .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
        .sign(new TextEncoder().encode(ctx.config.auth.jwtSecret));
      const res = await ctx.api().get('/api/v1/me').set('Authorization', `Bearer ${expired}`).expect(401);
      expect(res.body.error).toBe('session_expired');
    });

    it('takes the role from the database, not from the token', async () => {
      const buyer = await registerBuyer(ctx);
      await ctx.api().get('/api/v1/admin/users').set('Authorization', bearer(buyer)).expect(403);
    });
  });

  describe('refresh and sign-out', () => {
    it('replaces the refresh token on every refresh', async () => {
      const buyer = await registerBuyer(ctx);
      const first = await ctx.api().post('/api/v1/auth/refresh').send({ refreshToken: buyer.tokens.refreshToken }).expect(200);
      expect(first.body.tokens.refreshToken).not.toBe(buyer.tokens.refreshToken);
      await ctx.api().get('/api/v1/me').set('Authorization', `Bearer ${first.body.tokens.accessToken}`).expect(200);
      const second = await ctx.api().post('/api/v1/auth/refresh').send({ refreshToken: first.body.tokens.refreshToken }).expect(200);
      expect(second.body.tokens.refreshToken).not.toBe(first.body.tokens.refreshToken);
    });

    it('treats an old refresh token used right after a refresh as a race, not an attack', async () => {
      const buyer = await registerBuyer(ctx);
      const next = await ctx.api().post('/api/v1/auth/refresh').send({ refreshToken: buyer.tokens.refreshToken }).expect(200);
      const res = await ctx.api().post('/api/v1/auth/refresh').send({ refreshToken: buyer.tokens.refreshToken }).expect(401);
      expect(res.body.error).toBe('invalid_refresh');
      await ctx.api().post('/api/v1/auth/refresh').send({ refreshToken: next.body.tokens.refreshToken }).expect(200);
    });

    it('signs the device out when a stolen old refresh token comes back later', async () => {
      const buyer = await registerBuyer(ctx);
      const next = await ctx.api().post('/api/v1/auth/refresh').send({ refreshToken: buyer.tokens.refreshToken }).expect(200);
      const sessionId = buyer.tokens.refreshToken.split('.')[0];
      await ctx.db.pool.query("UPDATE sessions SET rotated_at = now() - interval '5 minutes' WHERE id = $1", [sessionId]);
      await ctx.api().post('/api/v1/auth/refresh').send({ refreshToken: buyer.tokens.refreshToken }).expect(401);
      // Both the thief and the owner of the session are signed out; the owner signs in again.
      await ctx.api().post('/api/v1/auth/refresh').send({ refreshToken: next.body.tokens.refreshToken }).expect(401);
      const me = await ctx.api().get('/api/v1/me').set('Authorization', `Bearer ${next.body.tokens.accessToken}`).expect(401);
      expect(me.body.error).toBe('session_expired');
      const audit = await ctx.db.pool.query("SELECT count(*)::int AS n FROM audit_log WHERE action = 'session.refresh_reused' AND target_id = $1", [sessionId]);
      expect(audit.rows[0].n).toBe(1);
    });

    it('rejects garbage refresh tokens', async () => {
      for (const refreshToken of ['', 'abc', '00000000-0000-0000-0000-000000000000.' + 'x'.repeat(43)]) {
        await ctx.api().post('/api/v1/auth/refresh').send({ refreshToken }).expect(401);
      }
    });

    it('signs out one device with logout', async () => {
      const buyer = await registerBuyer(ctx);
      await ctx.api().post('/api/v1/auth/logout').send({ refreshToken: buyer.tokens.refreshToken }).expect(204);
      await ctx.api().get('/api/v1/me').set('Authorization', bearer(buyer)).expect(401);
      await ctx.api().post('/api/v1/auth/refresh').send({ refreshToken: buyer.tokens.refreshToken }).expect(401);
    });

    it('signs out every device with logout-all', async () => {
      const buyer = await registerBuyer(ctx);
      const phone2 = await ctx.api().post('/api/v1/auth/login').send({ phone: buyer.phone, password: GOOD_PASSWORD }).expect(200);
      await ctx.api().post('/api/v1/auth/logout-all').set('Authorization', bearer(buyer)).expect(204);
      await ctx.api().get('/api/v1/me').set('Authorization', bearer(buyer)).expect(401);
      await ctx.api().get('/api/v1/me').set('Authorization', `Bearer ${phone2.body.tokens.accessToken}`).expect(401);
    });
  });

  describe('profile and password', () => {
    it('updates name and language, but not the role', async () => {
      const buyer = await registerBuyer(ctx);
      const res = await ctx.api().patch('/api/v1/me').set('Authorization', bearer(buyer)).send({ name: 'Jeren', locale: 'tk' }).expect(200);
      expect(res.body).toMatchObject({ name: 'Jeren', locale: 'tk', role: 'buyer' });
      await ctx.api().patch('/api/v1/me').set('Authorization', bearer(buyer)).send({ role: 'owner' }).expect(400);
    });

    it('changes the password and signs out the other devices', async () => {
      const buyer = await registerBuyer(ctx);
      const other = await ctx.api().post('/api/v1/auth/login').send({ phone: buyer.phone, password: GOOD_PASSWORD }).expect(200);
      const wrong = await ctx.api().post('/api/v1/me/password').set('Authorization', bearer(buyer)).send({ currentPassword: 'nope-nope', newPassword: 'New-pass-2026' }).expect(400);
      expect(wrong.body.error).toBe('wrong_password');
      await ctx.api().post('/api/v1/me/password').set('Authorization', bearer(buyer)).send({ currentPassword: GOOD_PASSWORD, newPassword: 'New-pass-2026' }).expect(204);
      await ctx.api().get('/api/v1/me').set('Authorization', bearer(buyer)).expect(200);
      await ctx.api().get('/api/v1/me').set('Authorization', `Bearer ${other.body.tokens.accessToken}`).expect(401);
      await ctx.api().post('/api/v1/auth/login').send({ phone: buyer.phone, password: 'New-pass-2026' }).expect(200);
    });
  });

  describe('Google sign-in', () => {
    it('creates a buyer on the first sign-in and finds the same account next time', async () => {
      const idToken = await ctx.google.token({ sub: 'google-1', email: 'maral@example.com', email_verified: true, name: 'Maral' });
      const first = await ctx.api().post('/api/v1/auth/google').send({ idToken, locale: 'tk' }).expect(200);
      expect(first.body.user).toMatchObject({ role: 'buyer', name: 'Maral', email: 'maral@example.com', googleLinked: true, hasPassword: false, phone: null });
      const again = await ctx.api().post('/api/v1/auth/google').send({ idToken: await ctx.google.token({ sub: 'google-1' }) }).expect(200);
      expect(again.body.user.id).toBe(first.body.user.id);
    });

    it('keeps an e-mail only when Google confirmed it', async () => {
      const idToken = await ctx.google.token({ sub: 'google-2', email: 'x@example.com', email_verified: false });
      const res = await ctx.api().post('/api/v1/auth/google').send({ idToken }).expect(200);
      expect(res.body.user.email).toBeNull();
    });

    it.each([
      ['another app', { aud: 'other.apps.googleusercontent.com' }],
      ['another issuer', { iss: 'https://evil.example.com' }],
      ['an expired token', { expiresIn: '-1m' }],
    ])('rejects a token for %s', async (_name, opts) => {
      const idToken = await ctx.google.token({ sub: 'google-3' }, opts);
      const res = await ctx.api().post('/api/v1/auth/google').send({ idToken }).expect(401);
      expect(res.body.error).toBe('invalid_google_token');
    });

    it('rejects a token signed by someone else', async () => {
      const { FakeGoogle } = await import('./helpers');
      const stranger = await FakeGoogle.create();
      const idToken = await stranger.token({ sub: 'google-4' });
      await ctx.api().post('/api/v1/auth/google').send({ idToken }).expect(401);
    });
  });
});

describe('Google sign-in switched off (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp({ GOOGLE_CLIENT_IDS: '' });
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('answers google_unavailable so the app shows phone sign-in', async () => {
    const res = await ctx.api().post('/api/v1/auth/google').send({ idToken: 'x'.repeat(40) }).expect(503);
    expect(res.body.error).toBe('google_unavailable');
  });
});
