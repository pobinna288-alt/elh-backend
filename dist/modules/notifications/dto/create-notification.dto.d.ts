import { NotificationType } from '../entities/notification.entity';
export declare class CreateNotificationDto {
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    userId: string;
    relatedUserId?: string;
    relatedAdId?: string;
}
