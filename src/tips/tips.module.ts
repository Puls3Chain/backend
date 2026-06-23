import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TipsService } from './tips.service';
import { TipsController } from './tips.controller';
import { Tip } from '../entities/tip.entity';
import { User } from '../entities/user.entity';
import { StellarModule } from '../stellar/stellar.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tip, User]),
    ConfigModule,
    StellarModule,
    NotificationsModule,
  ],
  controllers: [TipsController],
  providers: [TipsService],
  exports: [TipsService],
})
export class TipsModule {}
