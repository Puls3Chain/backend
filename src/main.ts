import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import helmet from 'helmet';
import * as compression from 'compression';
import { StructuredLogger } from './shared/logging/logging.config';

async function bootstrap(): Promise<void> {
  const appLogger = new StructuredLogger();

  try {
    const app = await NestFactory.create(AppModule, {
      logger: appLogger,
    });

    // Security headers
    app.use(helmet());

    // Response compression
    app.use(compression());

    // CORS
    app.enableCors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    });

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
    let changelogNote = '';
    try {
      const changelogPath = join(__dirname, '..', 'docs', 'API_CHANGELOG.md');
      if (existsSync(changelogPath)) {
        const changelog = readFileSync(changelogPath, 'utf8');
        const m = changelog.match(/^##\s*v?(\d+\.\d+\.\d+)/m);
        const latest = m ? m[1] : null;
        const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
        const version = pkg.version;
        if (latest && version !== latest) {
          changelogNote = `\n\n**Note:** This instance is running v${version} — a newer API version (v${latest}) exists. See /docs/API_CHANGELOG.md for details.`;
        }
      }
    } catch (err) {
      // swallow any errors reading changelog/package
    }

    const baseDescription =
      'Decentralized micro-tipping platform on the Stellar blockchain. ' +
      'Tip creators with XLM or USDC — no intermediaries, just Stellar.';

    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
    const config = new DocumentBuilder()
      .setTitle('StellarTip API')
      .setDescription(baseDescription + changelogNote)
      .setVersion(pkg.version || '0.0.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('profiles', 'Creator profile management')
      .addTag('tips', 'Tip transactions and history')
      .addTag('stellar', 'Stellar blockchain interaction')
      .addTag('notifications', 'In-app notifications')
      .addTag('health', 'Health check and monitoring')
      .addServer('http://localhost:3000', 'Local development')
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
