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
exports.ReferralService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const referral_entity_1 = require("./entities/referral.entity");
const user_entity_1 = require("../users/entities/user.entity");
const notifications_service_1 = require("../notifications/notifications.service");
let ReferralService = class ReferralService {
    constructor(referralRepository, userRepository, notificationsService) {
        this.referralRepository = referralRepository;
        this.userRepository = userRepository;
        this.notificationsService = notificationsService;
    }
    async getReferralCode(userId) {
        let referral = await this.referralRepository.findOne({
            where: { referrerId: userId, referredUserId: null },
        });
        if (!referral) {
            const code = this.generateReferralCode(userId);
            referral = this.referralRepository.create({
                referrerId: userId,
                referralCode: code,
            });
            await this.referralRepository.save(referral);
        }
        return {
            referralCode: referral.referralCode,
            referralLink: `https://yourapp.com/register?ref=${referral.referralCode}`,
        };
    }
    async applyReferralCode(userId, referralCode) {
        const existingReferral = await this.referralRepository.findOne({
            where: { referredUserId: userId },
        });
        if (existingReferral) {
            throw new common_1.BadRequestException('You have already used a referral code');
        }
        const referral = await this.referralRepository.findOne({
            where: { referralCode, referredUserId: null },
        });
        if (!referral) {
            throw new common_1.BadRequestException('Invalid referral code');
        }
        if (referral.referrerId === userId) {
            throw new common_1.BadRequestException('You cannot use your own referral code');
        }
        const newReferral = this.referralRepository.create({
            referrerId: referral.referrerId,
            referralCode: referral.referralCode,
            referredUserId: userId,
            rewardClaimed: true,
            coinsEarned: 500,
        });
        await this.referralRepository.save(newReferral);
        const referrer = await this.userRepository.findOne({
            where: { id: referral.referrerId },
        });
        const referredUser = await this.userRepository.findOne({
            where: { id: userId },
        });
        if (referrer) {
            referrer.coins = (referrer.coins || 0) + 500;
            await this.userRepository.save(referrer);
            await this.notificationsService.notifyCoinEarned(referrer.id, 500, 'A friend joined using your referral code!');
        }
        if (referredUser) {
            referredUser.coins = (referredUser.coins || 0) + 500;
            await this.userRepository.save(referredUser);
            await this.notificationsService.notifyCoinEarned(referredUser.id, 500, 'Welcome bonus for using a referral code!');
        }
        return {
            message: 'Referral code applied successfully',
            coinsEarned: 500,
        };
    }
    async getStats(userId) {
        const referrals = await this.referralRepository.find({
            where: { referrerId: userId },
        });
        const referredUsers = referrals.filter(r => r.referredUserId !== null);
        const totalCoinsEarned = referredUsers.reduce((sum, r) => sum + r.coinsEarned, 0);
        return {
            friendsReferred: referredUsers.length,
            totalCoinsEarned,
            pendingReferrals: referrals.length - referredUsers.length,
        };
    }
    async getReferredUsers(userId) {
        const referrals = await this.referralRepository.find({
            where: { referrerId: userId },
            relations: ['referredUser'],
        });
        const referred = referrals.filter(r => r.referredUserId !== null);
        return {
            count: referred.length,
            users: referred.map(r => ({
                userId: r.referredUserId,
                username: r.referredUser?.username || 'Unknown',
                joinedAt: r.createdAt,
                coinsEarned: r.coinsEarned,
            })),
        };
    }
    generateReferralCode(userId) {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 8);
        return `${timestamp}${randomStr}`.toUpperCase();
    }
};
exports.ReferralService = ReferralService;
exports.ReferralService = ReferralService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(referral_entity_1.Referral)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        notifications_service_1.NotificationsService])
], ReferralService);
//# sourceMappingURL=referral.service.js.map