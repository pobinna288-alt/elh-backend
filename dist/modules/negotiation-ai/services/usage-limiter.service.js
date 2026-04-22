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
var UsageLimiterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageLimiterService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const ai_usage_log_entity_1 = require("../entities/ai-usage-log.entity");
let UsageLimiterService = UsageLimiterService_1 = class UsageLimiterService {
    constructor(usageLogRepository) {
        this.usageLogRepository = usageLogRepository;
        this.logger = new common_1.Logger(UsageLimiterService_1.name);
        this.DAILY_LIMITS = {
            [user_entity_1.SubscriptionPlan.PREMIUM]: 15,
            [user_entity_1.SubscriptionPlan.PRO_BUSINESS]: 20,
            [user_entity_1.SubscriptionPlan.HOT_BUSINESS]: 40,
            [user_entity_1.SubscriptionPlan.ENTERPRISE]: -1,
            [user_entity_1.SubscriptionPlan.FREE]: 0,
        };
        this.FEATURE_NAME = 'negotiation_ai';
    }
    getDailyLimit(plan) {
        return this.DAILY_LIMITS[plan] ?? 0;
    }
    getTodayDateString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    async getOrCreateTodayUsage(userId) {
        const today = this.getTodayDateString();
        let record = await this.usageLogRepository.findOne({
            where: {
                userId,
                featureName: this.FEATURE_NAME,
                usageDate: today,
            },
        });
        if (!record) {
            record = this.usageLogRepository.create({
                userId,
                featureName: this.FEATURE_NAME,
                usageCount: 0,
                usageDate: today,
            });
            record = await this.usageLogRepository.save(record);
            this.logger.debug(`Created new usage record for user ${userId} on ${today}`);
        }
        return record;
    }
    async getTodayUsageCount(userId) {
        const record = await this.getOrCreateTodayUsage(userId);
        return record.usageCount;
    }
    async checkLimit(userId, plan) {
        const dailyLimit = this.getDailyLimit(plan);
        const usageCount = await this.getTodayUsageCount(userId);
        if (dailyLimit === -1) {
            return {
                allowed: true,
                usageCount,
                dailyLimit: -1,
                remaining: 'unlimited',
            };
        }
        if (dailyLimit === 0) {
            return {
                allowed: false,
                usageCount,
                dailyLimit: 0,
                remaining: 0,
            };
        }
        const remaining = Math.max(0, dailyLimit - usageCount);
        return {
            allowed: usageCount < dailyLimit,
            usageCount,
            dailyLimit,
            remaining,
        };
    }
    async incrementUsage(userId) {
        const record = await this.getOrCreateTodayUsage(userId);
        record.usageCount += 1;
        const saved = await this.usageLogRepository.save(record);
        this.logger.debug(`User ${userId} negotiation AI usage incremented to ${saved.usageCount}`);
        return saved;
    }
    async getUsageHistory(userId, days = 30) {
        const since = new Date();
        since.setDate(since.getDate() - days);
        const sinceStr = since.toISOString().split('T')[0];
        return this.usageLogRepository
            .createQueryBuilder('log')
            .where('log.userId = :userId', { userId })
            .andWhere('log.featureName = :feature', { feature: this.FEATURE_NAME })
            .andWhere('log.usageDate >= :since', { since: sinceStr })
            .orderBy('log.usageDate', 'DESC')
            .getMany();
    }
};
exports.UsageLimiterService = UsageLimiterService;
exports.UsageLimiterService = UsageLimiterService = UsageLimiterService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ai_usage_log_entity_1.AiUsageLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UsageLimiterService);
//# sourceMappingURL=usage-limiter.service.js.map