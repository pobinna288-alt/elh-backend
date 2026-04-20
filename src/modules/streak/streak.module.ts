import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StreakController } from './streak.controller';
import { StreakService } from './streak.service';
import { Streak } from './entities/streak.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Streak]),
    NotificationsModule,
  ],
  controllers: [StreakController],
  providers: [StreakService],
  exports: [StreakService],
})
export class StreakModule {}
