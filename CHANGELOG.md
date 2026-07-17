# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1](https://github.com/StellarTips/StellarTip-Backend/compare/backend-v0.1.0...backend-v0.1.1) (2026-07-17)


### Features

* add 5-minute caching layer to analytics endpoint with @nestjs/cache-manager ([7a7be55](https://github.com/StellarTips/StellarTip-Backend/commit/7a7be556920e380cb9baef2dfbbfc435513e11bc))
* add database seed script for demo data ([#99](https://github.com/StellarTips/StellarTip-Backend/issues/99)) ([7c335e1](https://github.com/StellarTips/StellarTip-Backend/commit/7c335e18efa914ebd67e50111e645e3ce5dbe37a))
* add GET /profiles/me/analytics endpoint for creator dashboard ([f39a494](https://github.com/StellarTips/StellarTip-Backend/commit/f39a494314c6cee1d07d1639767896bb2283d8f4))
* add global exception filter for consistent error responses ([eb39650](https://github.com/StellarTips/StellarTip-Backend/commit/eb396503b7ebc5bcb067f0f5cc01333db296a493))
* add HTTP request logging middleware with response time ([8c68178](https://github.com/StellarTips/StellarTip-Backend/commit/8c6817827a70fd7435661def709dd6c4fdd595aa))
* add k6 load/performance tests and CI workflow ([#71](https://github.com/StellarTips/StellarTip-Backend/issues/71)) ([#85](https://github.com/StellarTips/StellarTip-Backend/issues/85)) ([622d696](https://github.com/StellarTips/StellarTip-Backend/commit/622d696731798d405b522159583c8388fe44c862))
* add release workflow with semantic versioning and auto-generated CHANGELOG ([#118](https://github.com/StellarTips/StellarTip-Backend/issues/118)) ([8ede929](https://github.com/StellarTips/StellarTip-Backend/commit/8ede929de30ab379810fa230872d41de32c3a133)), closes [#76](https://github.com/StellarTips/StellarTip-Backend/issues/76)
* add requestId field to response interceptor for request tracing ([f69c6d5](https://github.com/StellarTips/StellarTip-Backend/commit/f69c6d5227fa37ca5e5931cc8c8c9855170f8c2d))
* add requestId to error response for consistent request tracing ([4e344be](https://github.com/StellarTips/StellarTip-Backend/commit/4e344be28d64be494f4b5c599c1ed5e3b88b6abd))
* add response interceptor and SharedModule with global providers ([873438d](https://github.com/StellarTips/StellarTip-Backend/commit/873438d5c393504a7fef1259f0e1690563bb30f8))
* add reusable PaginationDto for consistent API pagination ([79c1ba7](https://github.com/StellarTips/StellarTip-Backend/commit/79c1ba7d86cc19664ea496c2ba75330e01f59c09))
* add status-based log levels and requestId to HTTP logging middleware ([5e3a0e7](https://github.com/StellarTips/StellarTip-Backend/commit/5e3a0e7a0af14f73107ecb49e26d4406e63510d4))
* add Swagger API documentation decorators to auth controller ([f6a8c7e](https://github.com/StellarTips/StellarTip-Backend/commit/f6a8c7ea2e6b9fb069f9769e6f14f8dad1325dda))
* add Swagger tags to all remaining controllers ([c6a5053](https://github.com/StellarTips/StellarTip-Backend/commit/c6a50538a10462c3dd2330f84ba63465f3d7722b))
* **auth:** implement JWT authentication and RBAC ([2026925](https://github.com/StellarTips/StellarTip-Backend/commit/2026925a63c0cd89e9579070900e02da56c9bd9d))
* **auth:** implement JWT authentication and RBAC ([10e2fc1](https://github.com/StellarTips/StellarTip-Backend/commit/10e2fc1f18f23562df92e309532f8d24ecbaa25e))
* **auth:** implement StarkNet wallet authentication ([f4de068](https://github.com/StellarTips/StellarTip-Backend/commit/f4de0689e62c3f5f617e0341920eb0e271e699bf))
* **auth:** implement StarkNet wallet authentication ([a221e69](https://github.com/StellarTips/StellarTip-Backend/commit/a221e693a5d55b9ff99ce30a36bbdb88304b579c))
* Create Blog Post Module (CRUD API) [#8](https://github.com/StellarTips/StellarTip-Backend/issues/8) ([391cda9](https://github.com/StellarTips/StellarTip-Backend/commit/391cda994575a6ff107689bf20a3caef00d7c93b))
* create GitHub Actions CI/CD pipeline with lint, typecheck, test, build ([c8f9c17](https://github.com/StellarTips/StellarTip-Backend/commit/c8f9c17a5f81076cd4fd9ee0cd67c373d3366dfe))
* create Winston structured logger with sensitive data redaction ([c597907](https://github.com/StellarTips/StellarTip-Backend/commit/c5979071eb03ae5bc4de509366e35c3a06b7f5d1))
* dependency vulnerability scanning ([#62](https://github.com/StellarTips/StellarTip-Backend/issues/62)) and Postman dev experience ([#61](https://github.com/StellarTips/StellarTip-Backend/issues/61)) ([#124](https://github.com/StellarTips/StellarTip-Backend/issues/124)) ([35f8be2](https://github.com/StellarTips/StellarTip-Backend/commit/35f8be22219421f1147d805aae9d21d6beab9116))
* implement creator analytics dashboard with daily time-series breakdown ([7a60028](https://github.com/StellarTips/StellarTip-Backend/commit/7a6002881cc1a908c0fa2a3d86fc2955a59ae470))
* Implement Guessing Game Logic Engine (API-Only) [#7](https://github.com/StellarTips/StellarTip-Backend/issues/7) ([ffb89cd](https://github.com/StellarTips/StellarTip-Backend/commit/ffb89cdd0e4a81849533b2c64b5fb45ad1388e0b))
* implement reading progress module ([50069d8](https://github.com/StellarTips/StellarTip-Backend/commit/50069d8dece1ddb7314f64e28ee9d2dafa56ed5e))
* implement reading progress module ([3fd84f0](https://github.com/StellarTips/StellarTip-Backend/commit/3fd84f04e04e661d9fb3c2204b9f5eabe69b7c19))
* import SharedModule in AppModule for global filters and middleware ([ca4d90f](https://github.com/StellarTips/StellarTip-Backend/commit/ca4d90fb16b865999bbd3c81495e6e95f0ebb585))
* integrate Swagger, Winston logger, helmet, compression, and graceful shutdown ([2c1219b](https://github.com/StellarTips/StellarTip-Backend/commit/2c1219b72ed9ad556776f03d6ece4324e36f09ae))
* **ops:** add database backup/restore scripts and runbook ([#91](https://github.com/StellarTips/StellarTip-Backend/issues/91)) ([df0abba](https://github.com/StellarTips/StellarTip-Backend/commit/df0abba971a035d5de3a893ebe7fb2a075b38f78)), closes [#58](https://github.com/StellarTips/StellarTip-Backend/issues/58)
* resolve Issues [#12](https://github.com/StellarTips/StellarTip-Backend/issues/12) (Health Check), [#13](https://github.com/StellarTips/StellarTip-Backend/issues/13) (Docker), [#20](https://github.com/StellarTips/StellarTip-Backend/issues/20) (ESLint strict rules) ([c30f411](https://github.com/StellarTips/StellarTip-Backend/commit/c30f41101b147ec4b7db9b2f97794b0abcde001c))


### Bug Fixes

* add explicit return types to TipsController methods to resolve ESLint warnings ([353a435](https://github.com/StellarTips/StellarTip-Backend/commit/353a4359728a974738b0083866510a40ab20bca1))
* add return type annotations to mock helper functions in stellar.service.spec.ts ([cb7083c](https://github.com/StellarTips/StellarTip-Backend/commit/cb7083ca4cffada9dee024d24edbdbe711ba7bbb))
* configure postgres pool limits ([#126](https://github.com/StellarTips/StellarTip-Backend/issues/126)) ([6d0b691](https://github.com/StellarTips/StellarTip-Backend/commit/6d0b691d547c9580886d395bf4b5d98ec24a6746))
* operator precedence bug in requestId extraction causing TS2345 ([447711a](https://github.com/StellarTips/StellarTip-Backend/commit/447711aa4168e79185e33d974b6c4c77b6b2888a))
* pass error stack trace to StructuredLogger in StellarStrategy for better debugging ([09f7db9](https://github.com/StellarTips/StellarTip-Backend/commit/09f7db9a1914a627e97525072207cf9664ec1abd))
* replace console.error with StructuredLogger in StellarStrategy for consistent logging ([a1eff99](https://github.com/StellarTips/StellarTip-Backend/commit/a1eff99acfe1c2af4b9aacee722c7bc779e7d541))
* **security:** harden HTTP headers ([#83](https://github.com/StellarTips/StellarTip-Backend/issues/83)) ([871791a](https://github.com/StellarTips/StellarTip-Backend/commit/871791ac409eea7c6c06d76280cd1b526c9344ee))
* **starknet:** update provider config to use nodeUrl ([845b6d9](https://github.com/StellarTips/StellarTip-Backend/commit/845b6d936c770e4e933e82b2176736bda55e6ce4))
* use StructuredLogger in HealthService for consistent logging across the application ([d335e92](https://github.com/StellarTips/StellarTip-Backend/commit/d335e9230e87f1ccab4dda7e6e09d6a2a70fdf72))


### Performance Improvements

* **db:** add composite indexes for hot-path query performance ([#94](https://github.com/StellarTips/StellarTip-Backend/issues/94)) ([3dd3144](https://github.com/StellarTips/StellarTip-Backend/commit/3dd31447e8f5acdff067e77c9af4edba9638ba37))


### Documentation

* add @ApiOperation and @ApiBearerAuth decorators to ProfilesController ([6a0b50c](https://github.com/StellarTips/StellarTip-Backend/commit/6a0b50c47c0e2b7b6a3e2356e3cd157ba9e3a4be))
* add @ApiOperation decorators and return types to NotificationsController ([2844f42](https://github.com/StellarTips/StellarTip-Backend/commit/2844f42eaa10c4eed34e561e22137608e580b33c))
* add @ApiOperation decorators to HealthController endpoints ([0a8691f](https://github.com/StellarTips/StellarTip-Backend/commit/0a8691fc7b32d9cfd3b7e451e1c4410695465e49))
* add @ApiOperation decorators to StellarController endpoints ([46ef445](https://github.com/StellarTips/StellarTip-Backend/commit/46ef445066ea3baa01820905a3c140fb6bf6be7c))
* add @ApiProperty decorators to CreateTipDto for Swagger documentation ([4904fda](https://github.com/StellarTips/StellarTip-Backend/commit/4904fdad2219e3c5cfc142429aed8b7f18330d4f))
* add @ApiProperty decorators to profile DTOs for Swagger documentation ([832f4d8](https://github.com/StellarTips/StellarTip-Backend/commit/832f4d827795bdbf9f8ceaea2dea1c4004897332))
* add Architecture Decision Records (ADRs) system ([#89](https://github.com/StellarTips/StellarTip-Backend/issues/89)) ([113c8fc](https://github.com/StellarTips/StellarTip-Backend/commit/113c8fc9cdf877a544e725ea20ef240b3951bcde))
* add CORS_ORIGIN to environment variables table in README ([530a17e](https://github.com/StellarTips/StellarTip-Backend/commit/530a17eb42f43ef5923f02226d77d24a2f60634a))
* add incident runbooks and postmortem template ([#88](https://github.com/StellarTips/StellarTip-Backend/issues/88)) ([86991ba](https://github.com/StellarTips/StellarTip-Backend/commit/86991ba75c7f3a7ed26e36d059eda1266df9638a))
* add public status page link to README and create operations guide for Better Uptime configuration ([#82](https://github.com/StellarTips/StellarTip-Backend/issues/82)) ([de4204b](https://github.com/StellarTips/StellarTip-Backend/commit/de4204bf79d430fcd44220d35c0767ef0096b51a))
* replace stale Dependabot section with manual-update guidance ([6dcd2c1](https://github.com/StellarTips/StellarTip-Backend/commit/6dcd2c158ec6fc531ccd1155fa0dc81ec4b4446e))
* update README with all new features, endpoints, Swagger docs, and CI badge ([2e23642](https://github.com/StellarTips/StellarTip-Backend/commit/2e23642d49ebc0755a1cfd4871ab18fa731a0715))


### Miscellaneous Chores

* add CORS_ORIGIN to .env.example and update secret placeholder ([399efdb](https://github.com/StellarTips/StellarTip-Backend/commit/399efdbfde6651de031dba465ce4616a849d7ffc))
* add Docker HEALTHCHECK directive and create avatars subdirectory ([b3892c2](https://github.com/StellarTips/StellarTip-Backend/commit/b3892c2543ea14be4e0d91f857c577ef0a9d3293))
* add restart policy to docker-compose API service ([053cc51](https://github.com/StellarTips/StellarTip-Backend/commit/053cc5197b8d48aec0c10063ad780963c0941568))
* add uploads directory to .gitignore to prevent user content from being tracked ([91dd4e4](https://github.com/StellarTips/StellarTip-Backend/commit/91dd4e4dc5696c3e616ed3731438e890e3a7f1d7))
* disable Dependabot and remove auto-merge workflow ([a460c89](https://github.com/StellarTips/StellarTip-Backend/commit/a460c8990c23e27784ceedba515aa290ae93c278))
* update dependencies with winston, swagger, helmet, compression, husky, lint-staged ([d0d7071](https://github.com/StellarTips/StellarTip-Backend/commit/d0d7071577061e62c01aa46e9c207a32cb4f1aba))


### Code Refactoring

* add API version constant to AppService and update test assertion ([097011c](https://github.com/StellarTips/StellarTip-Backend/commit/097011cdb13491ec4dd699337efe174bf0fa360f))

## [0.1.0](https://github.com/StellarTips/StellarTip-Backend/compare/v0.1.0...v0.1.0) (2026-06-19)

### Features

- initial StellarTip backend API release
