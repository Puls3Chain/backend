import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import {
  configureSecurity,
  createCorsOptions,
  PERMISSIONS_POLICY_HEADER,
} from './security.config';

@Controller()
class SecurityHeadersController {
  @Get('/headers')
  headers(): string {
    return 'ok';
  }
}

describe('security configuration', () => {
  const originalCorsOrigin = process.env.CORS_ORIGIN;

  afterEach(() => {
    process.env.CORS_ORIGIN = originalCorsOrigin;
  });

  it('refuses credentials when wildcard CORS is configured', () => {
    expect(createCorsOptions('*')).toMatchObject({
      origin: '*',
      credentials: false,
    });
  });

  it('allows credentials for specific CORS origins', () => {
    expect(
      createCorsOptions(
        'https://app.stellartip.dev, https://admin.stellartip.dev',
      ),
    ).toMatchObject({
      origin: ['https://app.stellartip.dev', 'https://admin.stellartip.dev'],
      credentials: true,
    });
  });

  it('sets the required security headers on responses', async () => {
    process.env.CORS_ORIGIN = 'https://app.stellartip.dev';

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [SecurityHeadersController],
    }).compile();
    const app: INestApplication<App> = moduleRef.createNestApplication();
    configureSecurity(app);
    await app.init();

    try {
      const response = await request(app.getHttpServer())
        .get('/headers')
        .set('Origin', 'https://app.stellartip.dev')
        .expect(200);

      expect(response.headers['content-security-policy']).toContain(
        "default-src 'self'",
      );
      expect(response.headers['content-security-policy']).toContain(
        "script-src 'self' 'unsafe-inline'",
      );
      expect(response.headers['strict-transport-security']).toBe(
        'max-age=31536000; includeSubDomains; preload',
      );
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-permitted-cross-domain-policies']).toBe(
        'none',
      );
      expect(response.headers['referrer-policy']).toBe(
        'strict-origin-when-cross-origin',
      );
      expect(response.headers['permissions-policy']).toBe(
        PERMISSIONS_POLICY_HEADER,
      );
      expect(response.headers['access-control-allow-origin']).toBe(
        'https://app.stellartip.dev',
      );
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    } finally {
      await app.close();
    }
  });
});
