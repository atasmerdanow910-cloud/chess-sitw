import { ConfigError, loadConfig } from './env';

describe('loadConfig', () => {
  // Values built at run time: no secret-looking literals in the repository.
  const strongSecret = 'k'.repeat(48);
  const production = { NODE_ENV: 'production', DATABASE_URL: 'postgres://db.internal/bazar', JWT_SECRET: strongSecret };

  it('uses safe defaults', () => {
    const config = loadConfig({});
    expect(config).toMatchObject({ nodeEnv: 'development', host: '127.0.0.1', port: 3000, corsOrigins: [] });
  });

  it('parses a comma-separated CORS list', () => {
    const config = loadConfig({ CORS_ORIGINS: 'https://a.example.com, https://b.example.com:8443' });
    expect(config.corsOrigins).toEqual(['https://a.example.com', 'https://b.example.com:8443']);
  });

  it.each(['0', '70000', 'abc', '3.5'])('rejects PORT=%s', (port) => {
    expect(() => loadConfig({ PORT: port })).toThrow(ConfigError);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => loadConfig({ NODE_ENV: 'staging' })).toThrow(ConfigError);
  });

  it('rejects malformed origins', () => {
    expect(() => loadConfig({ CORS_ORIGINS: 'javascript:alert(1)' })).toThrow(ConfigError);
  });

  it('requires https origins in production', () => {
    expect(() => loadConfig({ ...production, CORS_ORIGINS: 'http://a.example.com' })).toThrow(ConfigError);
  });

  it('starts in production only with a database and a strong token key', () => {
    expect(loadConfig(production).auth.jwtSecret).toBe(strongSecret);
    expect(() => loadConfig({ ...production, DATABASE_URL: '' })).toThrow(/DATABASE_URL/);
    expect(() => loadConfig({ ...production, JWT_SECRET: '' })).toThrow(/JWT_SECRET/);
    expect(() => loadConfig({ ...production, JWT_SECRET: 'short' })).toThrow(/at least 32/);
  });

  it('makes a random token key in development when none is set', () => {
    const a = loadConfig({}).auth.jwtSecret;
    const b = loadConfig({}).auth.jwtSecret;
    expect(a.length).toBeGreaterThanOrEqual(32);
    expect(a).not.toBe(b);
  });

  it('uses 15-minute access and 30-day refresh tokens by default', () => {
    expect(loadConfig({}).auth).toMatchObject({ accessTtlSeconds: 900, refreshTtlDays: 30, googleClientIds: [] });
    expect(() => loadConfig({ ACCESS_TOKEN_TTL_SECONDS: '86400' })).toThrow(ConfigError);
  });

  it('checks Google client ids, database and Redis addresses', () => {
    expect(loadConfig({ GOOGLE_CLIENT_IDS: 'a1.apps.googleusercontent.com, b2.apps.googleusercontent.com' }).auth.googleClientIds).toHaveLength(2);
    expect(() => loadConfig({ GOOGLE_CLIENT_IDS: 'not-a-client-id' })).toThrow(ConfigError);
    expect(() => loadConfig({ DATABASE_URL: 'mysql://x' })).toThrow(ConfigError);
    expect(() => loadConfig({ REDIS_URL: 'http://x' })).toThrow(ConfigError);
    expect(loadConfig({ REDIS_URL: 'redis://127.0.0.1:6379' }).redisUrl).toBe('redis://127.0.0.1:6379');
  });
});
