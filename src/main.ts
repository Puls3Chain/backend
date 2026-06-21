import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';
import { StructuredLogger } from './shared/logging/logging.config';
import { configureSecurity } from './config/security.config';

async function bootstrap(): Promise<void> {
  const appLogger = new StructuredLogger();

  try {
    const app = await NestFactory.create(AppModule, {
      logger: appLogger,
    });

    // Security headers and CORS
    configureSecurity(app);

    // API Versioning with URI prefix (e.g., /v1/auth/login)
    // defaultVersion: '1' provides backward compatibility for unversioned requests
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    // Response compression
    app.use(compression());

    // Global validation pipes
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Swagger / OpenAPI documentation
    const config = new DocumentBuilder()
      .setTitle('StellarTip API')
      .setDescription(
        'Decentralized micro-tipping platform on the Stellar blockchain. ' +
          'Tip creators with XLM or USDC — no intermediaries, just Stellar.\n\n' +
          '## API Versioning\n' +
          'This API uses URI-based versioning. All endpoints are prefixed with `/v1`.\n' +
          'Example: `GET /v1/auth/login`\n\n' +
          '## Backward Compatibility\n' +
          'For backward compatibility, requests without a version prefix will default to v1.',
      )
      .setVersion('1.0.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('profiles', 'Creator profile management')
      .addTag('tips', 'Tip transactions and history')
      .addTag('stellar', 'Stellar blockchain interaction')
      .addTag('notifications', 'In-app notifications')
      .addTag('health', 'Health check and monitoring')
      .addServer('http://localhost:3000/v1', 'Local development (v1)')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    const port = process.env.PORT || 3000;
    await app.listen(port);

    // Graceful shutdown
    function shutdown(signal: string): void {
      appLogger.log(
        `Received ${signal}, shutting down gracefully...`,
        'Bootstrap',
      );
      app
        .close()
        .then(() => {
          appLogger.log('HTTP server closed', 'Bootstrap');
          process.exit(0);
        })
        .catch(() => process.exit(1));
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Check and log database connection status
    const dataSource = app.get(DataSource);
    if (dataSource.isInitialized) {
      appLogger.log('📦 Database connection established', 'Database');
    }
    appLogger.log(
      `⚡ Application running on http://localhost:${port}`,
      'Bootstrap',
    );
    appLogger.log(
      `📘 API Docs available at http://localhost:${port}/api/docs`,
      'Bootstrap',
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    appLogger.error(
      'Failed to start application: ' + msg,
      error instanceof Error ? error.stack : undefined,
      'Fatal',
    );
    process.exit(1);
  }
}

void bootstrap();
