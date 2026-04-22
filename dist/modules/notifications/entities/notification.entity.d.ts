import { User } from '../../users/entities/user.entity';
export declare enum NotificationType {
    WELCOME = "welcome",
    STREAK = "streak",
    AD_LIKE = "ad_like",
    AD_COMMENT = "ad_comment",
    MESSAGE = "message",
    FOLLOW = "follow",
    REVIEW = "review",
    SYSTEM = "system",
    COIN_EARNED = "coin_earned",
    PREMIUM_EXPIRING = "premium_expiring"
}
export declare class Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    link: string;
    isRead: boolean;
    user: User;
    userId: string;
    relatedUserId: string;
    relatedAdId: string;
    createdAt: Date;
}
