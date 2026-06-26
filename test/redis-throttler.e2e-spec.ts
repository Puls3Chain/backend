import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { Request } from 'express';
import request from 'supertest';

import { RedisThrottlerStorage } from '../src/config/redis-throttler.storage';

@Controller('redis-rate-limit-test')
class RedisRateLimitTestController {
  @Get()
  get(): { ok: boolean } {
    return { ok: true };
  }
}

async function createTestApp(redisUrl: string): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ThrottlerModule.forRoot({
        throttlers: [{ ttl: 60000, limit: 2 }],
        storage: new RedisThrottlerStorage(redisUrl),
        generateKey: (context, tracker: string): string => {
          const request = context.switchToHttp().getRequest<Request>();
          return `rl:${tracker}:${request.method}:${request.url}`;
        },
      }),
    ],
    controllers: [RedisRateLimitTestController],
    providers: [
      {
        provide: APP_GUARD,
        useClass: ThrottlerGuard,
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe('Redis-backed rate limiting (e2e)', () => {
  const redisUrl = process.env.REDIS_URL_TEST ?? process.env.REDIS_URL;
  const describeIfRedis = redisUrl ? describe : describe.skip;

  describeIfRedis('shared Redis storage', () => {
    let firstApp: INestApplication;
    let secondApp: INestApplication;

    beforeAll(async () => {
      firstApp = await createTestApp(redisUrl as string);
      secondApp = await createTestApp(redisUrl as string);
    });

    afterAll(async () => {
      await firstApp?.close();
      await secondApp?.close();
    });

    it('enforces one limit across two Nest/Express instances', async () => {
      const firstServer = firstApp.getHttpServer() as unknown as Parameters<
        typeof request
      >[0];
      const secondServer = secondApp.getHttpServer() as unknown as Parameters<
        typeof request
      >[0];

      await request(firstServer).get('/redis-rate-limit-test').expect(200);
      await request(secondServer).get('/redis-rate-limit-test').expect(200);
      await request(secondServer).get('/redis-rate-limit-test').expect(429);
    });
  });
});
