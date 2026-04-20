import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { Follow } from './entities/follow.entity';
import { Wishlist } from './entities/wishlist.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Follow, Wishlist]),
    NotificationsModule,
  ],
  controllers: [SocialController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
