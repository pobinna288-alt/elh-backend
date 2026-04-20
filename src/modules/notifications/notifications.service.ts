import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async create(createNotificationDto: CreateNotificationDto) {
    const notification = this.notificationRepository.create(createNotificationDto);
    return this.notificationRepository.save(notification);
  }

  async findByUser(userId: string, unreadOnly: boolean = false) {
    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    return this.notificationRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
    return { message: 'All notifications marked as read' };
  }

  async remove(id: string, userId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.notificationRepository.remove(notification);
    return { message: 'Notification deleted' };
  }

  async clearAll(userId: string) {
    await this.notificationRepository.delete({ userId });
    return { message: 'All notifications cleared' };
  }

  // Helper methods for creating specific notification types
  async notifyWelcome(userId: string) {
    return this.create({
      type: NotificationType.WELCOME,
      title: 'Welcome to EL HANNORA! 🎉',
      message: 'Start exploring amazing ads and earn coins by watching videos!',
      userId,
    });
  }

  async notifyStreak(userId: string, days: number) {
    return this.create({
      type: NotificationType.STREAK,
      title: `🔥 ${days} Day Streak!`,
      message: `Keep your streak alive! Come back tomorrow to continue earning bonus coins.`,
      userId,
    });
  }

  async notifyAdLike(userId: string, adId: string, likerUserId: string) {
    return this.create({
      type: NotificationType.AD_LIKE,
      title: '❤️ Someone liked your ad!',
      message: 'Your ad is getting attention!',
      link: `/ads/${adId}`,
      userId,
      relatedUserId: likerUserId,
      relatedAdId: adId,
    });
  }

  async notifyAdComment(userId: string, adId: string, commenterUserId: string) {
    return this.create({
      type: NotificationType.AD_COMMENT,
      title: '💬 New comment on your ad',
      message: 'Someone commented on your ad',
      link: `/ads/${adId}`,
      userId,
      relatedUserId: commenterUserId,
      relatedAdId: adId,
    });
  }

  async notifyNewMessage(userId: string, senderId: string) {
    return this.create({
      type: NotificationType.MESSAGE,
      title: '✉️ New message',
      message: 'You have a new message',
      link: '/messages',
      userId,
      relatedUserId: senderId,
    });
  }

  async notifyNewFollow(userId: string, followerId: string) {
    return this.create({
      type: NotificationType.FOLLOW,
      title: '👤 New follower',
      message: 'Someone started following you',
      userId,
      relatedUserId: followerId,
    });
  }

  async notifyCoinEarned(userId: string, amount: number, reason: string) {
    return this.create({
      type: NotificationType.COIN_EARNED,
      title: `🪙 Earned ${amount} coins!`,
      message: reason,
      userId,
    });
  }
}
