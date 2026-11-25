import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { loadConfig } from '../src/config/env';

describe('API basics (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app, loadConfig({ NODE_ENV: 'test', CORS_ORIGINS: 'https://bazar.example.com' }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health answers ok', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', service: 'bazar-tm', version: '0.1.0' });
    expect(new Date(res.body.time).getTime()).not.toBeNaN();
  });

  it('sends security headers and hides the framework', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('allows CORS only for configured origins', async () => {
    const allowed = await request(app.getHttpServer()).get('/api/v1/health').set('Origin', 'https://bazar.example.com');
    expect(allowed.headers['access-control-allow-origin']).toBe('https://bazar.example.com');
    const denied = await request(app.getHttpServer()).get('/api/v1/health').set('Origin', 'https://evil.example.com');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers unknown routes with JSON 404 and no stack trace', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/nope').expect(404);
    expect(res.body.statusCode).toBe(404);
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.ts/);
  });

  it('serves the API only under /api/v1', async () => {
    await request(app.getHttpServer()).get('/health').expect(404);
  });
});
