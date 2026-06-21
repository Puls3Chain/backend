import { Injectable, NestMiddleware, RequestMethod } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to handle backward compatibility for API versioning.
 * 
 * This middleware redirects requests without a version prefix to the v1 version.
 * For example, GET /auth/login redirects to GET /v1/auth/login
 * 
 * This ensures backward compatibility for existing clients while encouraging
 * migration to the versioned endpoints.
 */
@Injectable()
export class VersionRedirectMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Skip if the path already starts with /v1 or /api
    if (req.path.startsWith('/v1') || req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }

    // Skip for static files and other non-API routes
    if (req.path.includes('.')) {
      return next();
    }

    // Redirect to v1 version for API routes
    // Only redirect for common API paths to avoid affecting other routes
    const apiPaths = ['/auth', '/profiles', '/tips', '/stellar', '/notifications', '/app'];
    const shouldRedirect = apiPaths.some(path => req.path.startsWith(path));

    if (shouldRedirect) {
      // Return 301 permanent redirect to encourage clients to update
      // Or use 307 for temporary redirect if you want to maintain current behavior
      return res.redirect(301, `/v1${req.path}`);
    }

    next();
  }
}
