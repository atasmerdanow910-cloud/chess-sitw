import { ConfigError, loadConfig } from './env';

describe('loadConfig', () => {
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
    expect(() => loadConfig({ NODE_ENV: 'production', CORS_ORIGINS: 'http://a.example.com' })).toThrow(ConfigError);
  });
});
