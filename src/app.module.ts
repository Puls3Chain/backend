import { ExecutionContext, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { Request } from 'express';
import { APP_GUARD } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import typeormConfig from './config/typeorm.config';
import { AuthModule } from './auth/auth.module';
import { TipsModule } from './tips/tips.module';
import { ProfilesModule } from './profiles/profiles.module';
import { StellarModule } from './stellar/stellar.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthModule } from './health/health.module';
import { SharedModule } from './shared/shared.module';
import { RedisThrottlerStorage } from './config/redis-throttler.storage';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(typeormConfig),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: { index: false },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const throttlerOptions = {
          ttl: configService.get<number>('THROTTLE_TTL') ?? 60000,
          limit: configService.get<number>('THROTTLE_LIMIT') ?? 100,
          generateKey: (context: ExecutionContext, tracker: string): string => {
            const request = context.switchToHttp().getRequest<Request>();
            const endpoint = `${request.method ?? 'UNKNOWN'}:${request.url ?? 'unknown'}`;
            return `rl:${tracker}:${endpoint}`;
          },
        };

        return redisUrl
          ? {
              throttlers: [throttlerOptions],
              storage: new RedisThrottlerStorage(redisUrl),
            }
          : [throttlerOptions];
      },
    }),
    AuthModule,
    TipsModule,
    ProfilesModule,
    StellarModule,
    NotificationsModule,
    HealthModule,
    SharedModule,
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => ({
        ttl: 300000, // 5 minutes (ms)
        max: 100,
      }),
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
