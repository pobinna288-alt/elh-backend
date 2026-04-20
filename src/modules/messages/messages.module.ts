import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { Conversation } from './entities/conversation.entity';
import { Ad } from '../ads/entities/ad.entity';
import { User } from '../users/entities/user.entity';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages.gateway';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Messages Module
 * 
 * Comprehensive messaging system for marketplace buyer-seller communication
 * 
 * Features:
 * - Pre-filled message templates
 * - Product preview cards in chat
 * - Quick reply suggestions
 * - Seller response indicators
 * - Unread message notifications
 * - Real-time WebSocket messaging
 * - Message read receipts (sent/delivered/read)
 * - Typing indicators
 * - Conversation context tracking
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Message,
      Conversation,
      Ad,
      User,
    ]),
    NotificationsModule,
  ],
  controllers: [MessagesController],
  providers: [
    MessagesService,
    MessagesGateway,
  ],
  exports: [
    TypeOrmModule,
    MessagesService,
    MessagesGateway,
  ],
})
export class MessagesModule {}
