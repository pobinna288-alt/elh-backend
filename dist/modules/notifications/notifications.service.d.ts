import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
export declare class NotificationsService {
    private notificationRepository;
    constructor(notificationRepository: Repository<Notification>);
    create(createNotificationDto: CreateNotificationDto): Promise<Notification>;
    findByUser(userId: string, unreadOnly?: boolean): Promise<Notification[]>;
    getUnreadCount(userId: string): Promise<{
        count: number;
    }>;
    markAsRead(id: string, userId: string): Promise<Notification>;
    markAllAsRead(userId: string): Promise<{
        message: string;
    }>;
    remove(id: string, userId: string): Promise<{
        message: string;
    }>;
    clearAll(userId: string): Promise<{
        message: string;
    }>;
    notifyWelcome(userId: string): Promise<Notification>;
    notifyStreak(userId: string, days: number): Promise<Notification>;
    notifyAdLike(userId: string, adId: string, likerUserId: string): Promise<Notification>;
    notifyAdComment(userId: string, adId: string, commenterUserId: string): Promise<Notification>;
    notifyNewMessage(userId: string, senderId: string): Promise<Notification>;
    notifyNewFollow(userId: string, followerId: string): Promise<Notification>;
    notifyCoinEarned(userId: string, amount: number, reason: string): Promise<Notification>;
}
