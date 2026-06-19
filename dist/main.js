"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const swagger_1 = require("@nestjs/swagger");
const helmet_1 = require("helmet");
const compression = require("compression");
const logging_config_1 = require("./shared/logging/logging.config");
async function bootstrap() {
    const appLogger = new logging_config_1.StructuredLogger();
    try {
        const app = await core_1.NestFactory.create(app_module_1.AppModule, {
            logger: appLogger,
        });
        app.use((0, helmet_1.default)());
        app.use(compression());
        app.enableCors({
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            credentials: true,
        });
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }));
        const config = new swagger_1.DocumentBuilder()
            .setTitle('StellarTip API')
            .setDescription('Decentralized micro-tipping platform on the Stellar blockchain. ' +
            'Tip creators with XLM or USDC — no intermediaries, just Stellar.')
            .setVersion('0.1.0')
            .addBearerAuth()
            .addTag('auth', 'Authentication endpoints')
            .addTag('profiles', 'Creator profile management')
            .addTag('tips', 'Tip transactions and history')
            .addTag('stellar', 'Stellar blockchain interaction')
            .addTag('notifications', 'In-app notifications')
            .addTag('health', 'Health check and monitoring')
            .addServer('http://localhost:3000', 'Local development')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, config);
        swagger_1.SwaggerModule.setup('api/docs', app, document, {
            swaggerOptions: {
                persistAuthorization: true,
            },
        });
        const port = process.env.PORT || 3000;
        await app.listen(port);
        function shutdown(signal) {
            appLogger.log(`Received ${signal}, shutting down gracefully...`, 'Bootstrap');
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
        const dataSource = app.get(typeorm_1.DataSource);
        if (dataSource.isInitialized) {
            appLogger.log('📦 Database connection established', 'Database');
        }
        appLogger.log(`⚡ Application running on http://localhost:${port}`, 'Bootstrap');
        appLogger.log(`📘 API Docs available at http://localhost:${port}/api/docs`, 'Bootstrap');
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        appLogger.error('Failed to start application: ' + msg, error instanceof Error ? error.stack : undefined, 'Fatal');
        process.exit(1);
    }
}
void bootstrap();
//# sourceMappingURL=main.js.map