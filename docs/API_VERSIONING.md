# API Versioning Strategy

## Overview

The StellarTip API implements URI-based versioning to ensure backward compatibility and enable future API evolution without breaking existing clients.

## Versioning Scheme

### URI-Based Versioning

All API endpoints are prefixed with a version identifier in the URL path:

```
https://api.stellartip.com/v1/{endpoint}
```

**Example:**
- Versioned endpoint: `GET /v1/auth/login`
- Unversioned (backward compatible): `GET /auth/login` → defaults to v1

### Current Version: v1.0.0

The current stable version is `v1.0.0`. All business logic endpoints are versioned under `/v1`.

## Implementation Details

### NestJS Configuration

API versioning is configured in `src/main.ts` using NestJS's built-in versioning support:

```typescript
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
});
```

The `defaultVersion: '1'` setting ensures backward compatibility - requests without a version prefix automatically default to v1.

### Controller Versioning

Business logic controllers are decorated with `@Version('1')` to specify their API version:

```typescript
@ApiTags('auth')
@Controller('auth')
@Version('1')
export class AuthController {
  // ...
}
```

### Infrastructure Endpoints (Not Versioned)

The following endpoints are NOT versioned as they are infrastructure-related:
- **Health endpoints**: `/health/*` - Health checks and monitoring
- **Root endpoint**: `/` - API welcome message
- **Swagger docs**: `/api/docs` - API documentation

These remain accessible without version prefix and are excluded from versioning.

## Backward Compatibility

### Default Version Behavior

The API uses `defaultVersion: '1'` which provides seamless backward compatibility:

- **Versioned requests**: `GET /v1/auth/login` → Works as expected
- **Unversioned requests**: `GET /auth/login` → Automatically treated as v1 (no redirect needed)

This approach is simpler and more efficient than using redirects, as it avoids the overhead of HTTP redirects while maintaining full backward compatibility.

## Migration Guide for Clients

### Recommended Approach

1. **Update your base URL:**
   ```javascript
   // Old (still works due to backward compatibility)
   const BASE_URL = 'https://api.stellartip.com';
   
   // New (recommended)
   const BASE_URL = 'https://api.stellartip.com/v1';
   ```

2. **Test your application:** Both versioned and unversioned endpoints should work identically.

3. **Monitor usage:** Track which version your clients are using to plan future deprecations.

### Timeline

- **Phase 1 (Current):** Both versioned (`/v1/*`) and unversioned endpoints work. Unversioned requests automatically default to v1.
- **Phase 2 (Future):** Unversioned endpoints will be deprecated. Clients will receive deprecation warnings.
- **Phase 3 (Future):** Unversioned endpoints will be removed. Only `/v1` endpoints will be supported.

## Versioning Best Practices

### When to Create a New Version

Create a new API version when:

1. **Breaking Changes:** Any change that breaks existing client functionality
   - Removing or renaming fields
   - Changing data types
   - Modifying required parameters
   - Changing authentication mechanisms

2. **Major Behavioral Changes:** Significant changes in how endpoints work
   - Different response formats
   - Changed business logic
   - Altered error handling

### Non-Breaking Changes (No New Version Needed)

These changes can be made within the current version:

- Adding new optional fields
- Adding new endpoints
- Bug fixes that don't change behavior
- Performance improvements
- Documentation updates

### Future Versioning

When v2 is needed:

1. Create new controller classes or methods with `@Version('2')`
2. Maintain v1 controllers for backward compatibility
3. Update documentation to highlight differences
4. Set a deprecation timeline for v1

## Testing Versioned Endpoints

### Using cURL

```bash
# Versioned endpoint (recommended)
curl https://api.stellartip.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Unversioned (backward compatible, defaults to v1)
curl https://api.stellartip.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Infrastructure endpoint (not versioned)
curl https://api.stellartip.com/health
```

### Using Swagger Documentation

The Swagger UI is available at `/api/docs` and automatically reflects the versioned endpoints. All examples in the documentation use the `/v1` prefix for business logic endpoints.

## Monitoring and Logging

### Version Metrics

The API should track:
- Request counts per version (v1 vs unversioned)
- Error rates per version
- Response times per version

This data helps determine when to deprecate older versions.

### Deprecation Warnings

When a version is deprecated, responses will include:

```http
HTTP/1.1 200 OK
X-API-Deprecation: true
X-API-Sunset-Date: 2025-12-31
X-API-Recommended-Version: v2
```

## Support and Questions

For questions about API versioning or migration assistance:
- Check the Swagger documentation at `/api/docs`
- Review this document for common scenarios
- Contact the development team for specific concerns

## Changelog

### v1.0.0 (Current)
- Initial API versioning implementation
- All business logic endpoints moved to `/v1` prefix
- Infrastructure endpoints (health, root, docs) remain unversioned
- Backward compatibility maintained through defaultVersion setting
- Swagger documentation updated with versioning information
