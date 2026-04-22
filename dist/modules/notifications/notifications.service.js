"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notification_entity_1 = require("./entities/notification.entity");
let NotificationsService = class NotificationsService {
    constructor(notificationRepository) {
        this.notificationRepository = notificationRepository;
    }
    async create(createNotificationDto) {
        const notification = this.notificationRepository.create(createNotificationDto);
        return this.notificationRepository.save(notification);
    }
    async findByUser(userId, unreadOnly = false) {
        const where = { userId };
        if (unreadOnly) {
            where.isRead = false;
        }
        return this.notificationRepository.find({
            where,
            order: { createdAt: 'DESC' },
            take: 50,
        });
    }
    async getUnreadCount(userId) {
        const count = await this.notificationRepository.count({
            where: { userId, isRead: false },
        });
        return { count };
    }
    async markAsRead(id, userId) {
        const notification = await this.notificationRepository.findOne({
            where: { id, userId },
        });
        if (!notification) {
            throw new common_1.NotFoundException('Notification not found');
        }
        notification.isRead = true;
        return this.notificationRepository.save(notification);
    }
    async markAllAsRead(userId) {
        await this.notificationRepository.update({ userId, isRead: false }, { isRead: true });
        return { message: 'All notifications marked as read' };
    }
    async remove(id, userId) {
        const notification = await this.notificationRepository.findOne({
            where: { id, userId },
        });
        if (!notification) {
            throw new common_1.NotFoundException('Notification not found');
        }
        await this.notificationRepository.remove(notification);
        return { message: 'Notification deleted' };
    }
    async clearAll(userId) {
        await this.notificationRepository.delete({ userId });
        return { message: 'All notifications cleared' };
    }
    async notifyWelcome(userId) {
        return this.create({
            type: notification_entity_1.NotificationType.WELCOME,
            title: 'Welcome to EL HANNORA! 🎉',
            message: 'Start exploring amazing ads and earn coins by watching videos!',
            userId,
        });
    }
    async notifyStreak(userId, days) {
        return this.create({
            type: notification_entity_1.NotificationType.STREAK,
            title: `🔥 ${days} Day Streak!`,
            message: `Keep your streak alive! Come back tomorrow to continue earning bonus coins.`,
            userId,
        });
    }
    async notifyAdLike(userId, adId, likerUserId) {
        return this.create({
            type: notification_entity_1.NotificationType.AD_LIKE,
            title: '❤️ Someone liked your ad!',
            message: 'Your ad is getting attention!',
            link: `/ads/${adId}`,
            userId,
            relatedUserId: likerUserId,
            relatedAdId: adId,
        });
    }
    async notifyAdComment(userId, adId, commenterUserId) {
        return this.create({
            type: notification_entity_1.NotificationType.AD_COMMENT,
            title: '💬 New comment on your ad',
            message: 'Someone commented on your ad',
            link: `/ads/${adId}`,
            userId,
            relatedUserId: commenterUserId,
            relatedAdId: adId,
        });
    }
    async notifyNewMessage(userId, senderId) {
        return this.create({
            type: notification_entity_1.NotificationType.MESSAGE,
            title: '✉️ New message',
            message: 'You have a new message',
            link: '/messages',
            userId,
            relatedUserId: senderId,
        });
    }
    async notifyNewFollow(userId, followerId) {
        return this.create({
            type: notification_entity_1.NotificationType.FOLLOW,
            title: '👤 New follower',
            message: 'Someone started following you',
            userId,
            relatedUserId: followerId,
        });
    }
    async notifyCoinEarned(userId, amount, reason) {
        return this.create({
            type: notification_entity_1.NotificationType.COIN_EARNED,
            title: `🪙 Earned ${amount} coins!`,
            message: reason,
            userId,
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map