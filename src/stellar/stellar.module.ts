import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StellarService } from './stellar.service';
import { StellarController } from './stellar.controller';
import { Tip } from '../entities/tip.entity';
import { User } from '../entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Tip, User]),
    NotificationsModule,
  ],
  providers: [StellarService],
  controllers: [StellarController],
  exports: [StellarService],
})
export class StellarModule {}
