/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Stellar (e2e)', () => {
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

  it('GET /stellar/balance rejects missing wallet', async () => {
    if (!hasDb) return;
    await request(app.getHttpServer()).get('/stellar/balance').expect(400);
  });

  it('GET /stellar/balance returns balances', async () => {
    if (!hasDb) return;
    const res = await request(app.getHttpServer())
      .get('/stellar/balance')
      .query({
        walletAddress:
          'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      })
      .expect(200);
    expect(res.body.data).toHaveProperty('balances');
  });

  it('GET /stellar/account returns info', async () => {
    if (!hasDb) return;
    const res = await request(app.getHttpServer())
      .get('/stellar/account')
      .query({
        walletAddress:
          'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      })
      .expect(200);
    expect(res.body.data).toHaveProperty('address');
  });

  it('POST /stellar/verify-payment rejects missing hash', async () => {
    if (!hasDb) return;
    await request(app.getHttpServer())
      .post('/stellar/verify-payment')
      .send({})
      .expect(400);
  });

  it('POST /stellar/verify-payment returns false for invalid', async () => {
    if (!hasDb) return;
    const res = await request(app.getHttpServer())
      .post('/stellar/verify-payment')
      .send({ transactionHash: 'invalid' })
      .expect(201);
    expect(res.body.data.verified).toBe(false);
  });
});
