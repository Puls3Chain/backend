import type { INestApplication } from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import type { RequestHandler } from 'express';
import helmet from 'helmet';
import type { HelmetOptions } from 'helmet';

const SELF = "'self'";
const INLINE = "'unsafe-inline'";
const CORS_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

export const PERMISSIONS_POLICY_HEADER =
  'geolocation=(), camera=(), microphone=()';

export function createHelmetOptions(): HelmetOptions {
  return {
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': [SELF],
        'base-uri': [SELF],
        'font-src': [SELF, 'data:'],
        'form-action': [SELF],
        'frame-ancestors': ["'none'"],
        'img-src': [SELF, 'data:', 'validator.swagger.io'],
        'object-src': ["'none'"],
        'script-src': [SELF, INLINE],
        'style-src': [SELF, INLINE],
        'connect-src': [SELF],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    frameguard: {
      action: 'deny',
    },
    permittedCrossDomainPolicies: {
      permittedPolicies: 'none',
    },
  };
}

export function createCorsOptions(
  rawOrigin = process.env.CORS_ORIGIN,
): CorsOptions {
  const origin = parseCorsOrigin(rawOrigin);

  return {
    origin,
    methods: CORS_METHODS,
    credentials: origin !== '*',
  };
}

export function parseCorsOrigin(
  rawOrigin: string | undefined,
): string | string[] {
  if (!rawOrigin || rawOrigin.trim() === '') {
    return '*';
  }

  const origins = rawOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0 || origins.includes('*')) {
    return '*';
  }

  return origins.length === 1 ? origins[0] : origins;
}

export function permissionsPolicy(): RequestHandler {
  return (_req, res, next) => {
    res.setHeader('Permissions-Policy', PERMISSIONS_POLICY_HEADER);
    next();
  };
}

export function configureSecurity(app: INestApplication): void {
  app.use(helmet(createHelmetOptions()));
  app.use(permissionsPolicy());
  app.enableCors(createCorsOptions());
}
