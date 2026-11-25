import { createTestApp, TestContext } from './helpers';

describe('API basics (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('GET /api/v1/health answers ok without signing in', async () => {
    const res = await ctx.api().get('/api/v1/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', service: 'bazar-tm', version: '0.2.0' });
    expect(new Date(res.body.time).getTime()).not.toBeNaN();
  });

  it('GET /api/v1/health/ready checks the database', async () => {
    await ctx.api().get('/api/v1/health/ready').expect(200, { status: 'ok', database: 'ok' });
  });

  it('sends security headers and hides the framework', async () => {
    const res = await ctx.api().get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('allows CORS only for configured origins', async () => {
    const allowed = await ctx.api().get('/api/v1/health').set('Origin', 'https://bazar.example.com');
    expect(allowed.headers['access-control-allow-origin']).toBe('https://bazar.example.com');
    const denied = await ctx.api().get('/api/v1/health').set('Origin', 'https://evil.example.com');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers unknown routes with JSON 404 and no stack trace', async () => {
    const res = await ctx.api().get('/api/v1/nope').expect(404);
    expect(res.body.statusCode).toBe(404);
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.ts/);
  });

  it('requires sign-in on every route by default', async () => {
    const res = await ctx.api().get('/api/v1/me').expect(401);
    expect(res.body).toMatchObject({ statusCode: 401, error: 'unauthorized' });
  });

  it('serves the API only under /api/v1', async () => {
    await ctx.api().get('/health').expect(404);
  });
});
