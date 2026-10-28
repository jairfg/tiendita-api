import { type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { API_PREFIX, configureApp } from './../src/app.setup.js';
import type { EnvironmentVariables } from './../src/config/env.schema.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let allowedOrigin: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);

    const configService = app.get(ConfigService<EnvironmentVariables, true>);

    const [configuredOrigin] = configService.get('CORS_ORIGINS', {
      infer: true,
    });

    if (!configuredOrigin) {
      throw new Error('At least one CORS origin must be configured');
    }

    allowedOrigin = configuredOrigin;
    await app.init();
  });

  it('serves the application under the global API prefix', async () => {
    await request(app.getHttpServer()).get('/').expect(404);

    await request(app.getHttpServer())
      .get(`/${API_PREFIX}`)
      .expect(200)
      .expect('Hello World!');
  });

  it('adds HTTP security headers', async () => {
    await request(app.getHttpServer())
      .get(`/${API_PREFIX}`)
      .expect('x-content-type-options', 'nosniff');
  });

  it('allows a configured CORS origin with credentials', async () => {
    await request(app.getHttpServer())
      .get(`/${API_PREFIX}`)
      .set('Origin', allowedOrigin)
      .expect('access-control-allow-origin', allowedOrigin)
      .expect('access-control-allow-credentials', 'true');
  });

  it('does not allow an unconfigured CORS origin', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${API_PREFIX}`)
      .set('Origin', 'https://untrusted.invalid')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  afterAll(async () => {
    await app.close();
  });
});
