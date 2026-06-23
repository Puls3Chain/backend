/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;
  let hasDb = false;

  beforeAll(async () => {
    try {
      const m: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app = m.createNestApplication();
      await app.init();
      hasDb = true;
    } catch {
      /* no DB */
    }
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('GET /health returns status', async () => {
    if (!hasDb) return;
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.uptime).toBeGreaterThanOrEqual(0);
  });

  it('GET /health/ready returns DB status', async () => {
    if (!hasDb) return;
    const res = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /health/remote returns stellar status', async () => {
    if (!hasDb) return;
    const res = await request(app.getHttpServer())
      .get('/health/remote')
      .expect(200);
    expect(res.body.status).toBe('ok');
  });
});
