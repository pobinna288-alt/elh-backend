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
var SubscriptionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const usage_limiter_service_1 = require("./usage-limiter.service");
let SubscriptionService = SubscriptionService_1 = class SubscriptionService {
    constructor(userRepository, usageLimiterService) {
        this.userRepository = userRepository;
        this.usageLimiterService = usageLimiterService;
        this.logger = new common_1.Logger(SubscriptionService_1.name);
        this.AI_ENABLED_PLANS = [
            user_entity_1.SubscriptionPlan.PREMIUM,
            user_entity_1.SubscriptionPlan.PRO_BUSINESS,
            user_entity_1.SubscriptionPlan.HOT_BUSINESS,
            user_entity_1.SubscriptionPlan.ENTERPRISE,
        ];
        this.PLAN_ROLE_MAP = {
            [user_entity_1.SubscriptionPlan.FREE]: user_entity_1.UserRole.USER,
            [user_entity_1.SubscriptionPlan.PREMIUM]: user_entity_1.UserRole.PREMIUM,
            [user_entity_1.SubscriptionPlan.PRO_BUSINESS]: user_entity_1.UserRole.PRO,
            [user_entity_1.SubscriptionPlan.HOT_BUSINESS]: user_entity_1.UserRole.HOT,
            [user_entity_1.SubscriptionPlan.ENTERPRISE]: user_entity_1.UserRole.ADMIN,
        };
        this.SUBSCRIPTION_DURATION_DAYS = 30;
    }
    async onSubscriptionActivated(userId, plan) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (!this.isValidPaidPlan(plan)) {
            throw new common_1.BadRequestException(`Invalid plan: ${plan}. Must be one of: premium, pro_business, hot_business, enterprise`);
        }
        const now = new Date();
        const baseDate = user.subscriptionActive && user.subscriptionExpiry && new Date(user.subscriptionExpiry) > now
            ? new Date(user.subscriptionExpiry)
            : now;
        const expiryDate = new Date(baseDate);
        expiryDate.setDate(expiryDate.getDate() + this.SUBSCRIPTION_DURATION_DAYS);
        user.plan = plan;
        user.subscriptionActive = true;
        user.subscriptionExpiry = expiryDate;
        user.negotiationAiEnabled = this.AI_ENABLED_PLANS.includes(plan);
        const newRole = this.PLAN_ROLE_MAP[plan];
        if (newRole) {
            user.role = newRole;
        }
        user.premiumExpiresAt = expiryDate;
        await this.userRepository.save(user);
        await this.usageLimiterService.getOrCreateTodayUsage(userId);
        this.logger.log(`Subscription activated: user=${userId}, plan=${plan}, expires=${expiryDate.toISOString()}, ai_enabled=${user.negotiationAiEnabled}`);
        return {
            user,
            subscriptionExpiry: expiryDate,
            negotiationAiEnabled: user.negotiationAiEnabled,
        };
    }
    planHasNegotiationAi(plan) {
        return this.AI_ENABLED_PLANS.includes(plan);
    }
    isValidPaidPlan(plan) {
        return this.AI_ENABLED_PLANS.includes(plan);
    }
    async handleExpiredSubscriptions() {
        const now = new Date();
        const expiredUsers = await this.userRepository.find({
            where: {
                subscriptionActive: true,
                subscriptionExpiry: (0, typeorm_2.LessThan)(now),
            },
        });
        if (expiredUsers.length === 0) {
            this.logger.debug('No expired subscriptions found');
            return 0;
        }
        for (const user of expiredUsers) {
            user.subscriptionActive = false;
            user.negotiationAiEnabled = false;
            user.plan = user_entity_1.SubscriptionPlan.FREE;
            user.role = user_entity_1.UserRole.USER;
            this.logger.warn(`Subscription expired for user ${user.id} (${user.email}). Downgraded to free.`);
        }
        await this.userRepository.save(expiredUsers);
        this.logger.log(`Processed ${expiredUsers.length} expired subscriptions`);
        return expiredUsers.length;
    }
    async getSubscriptionStatus(userId) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            select: ['id', 'plan', 'subscriptionActive', 'subscriptionExpiry', 'negotiationAiEnabled'],
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const isExpired = user.subscriptionExpiry
            ? new Date(user.subscriptionExpiry) < new Date()
            : false;
        if (isExpired && user.subscriptionActive) {
            user.subscriptionActive = false;
            user.negotiationAiEnabled = false;
            user.plan = user_entity_1.SubscriptionPlan.FREE;
            user.role = user_entity_1.UserRole.USER;
            await this.userRepository.save(user);
            this.logger.warn(`User ${userId} subscription expired during status check. Downgraded.`);
        }
        return {
            plan: user.plan,
            subscriptionActive: user.subscriptionActive,
            subscriptionExpiry: user.subscriptionExpiry,
            negotiationAiEnabled: user.negotiationAiEnabled,
            isExpired,
        };
    }
};
exports.SubscriptionService = SubscriptionService;
exports.SubscriptionService = SubscriptionService = SubscriptionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        usage_limiter_service_1.UsageLimiterService])
], SubscriptionService);
//# sourceMappingURL=subscription.service.js.map