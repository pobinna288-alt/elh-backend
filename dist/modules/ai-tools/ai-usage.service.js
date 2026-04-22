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
exports.AiUsageService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../users/entities/user.entity");
const redis_service_1 = require("../redis/redis.service");
let AiUsageService = class AiUsageService {
    constructor(userRepository, redisService) {
        this.userRepository = userRepository;
        this.redisService = redisService;
        this.TOTAL_DAILY_LIMIT = 45;
        this.TOOL_LIMITS = {
            smart_copywriter: 10,
            negotiation_ai: 15,
            competitor_analyzer: 5,
            ad_improver: 10,
            market_suggestion: 5,
        };
    }
    async consume(userId, tool) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (!this.isPremiumRole(user.role)) {
            throw new common_1.ForbiddenException('This feature requires a Premium subscription');
        }
        if (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) <= new Date()) {
            throw new common_1.ForbiddenException('Premium subscription expired or inactive');
        }
        const todayKey = this.getTodayKey();
        const perToolKey = this.buildToolKey(userId, tool, todayKey);
        const totalKey = this.buildTotalKey(userId, todayKey);
        const [currentToolCount, currentTotalCount] = await Promise.all([
            this.redisService.getCounter(perToolKey),
            this.redisService.getCounter(totalKey),
        ]);
        const nextToolCount = currentToolCount + 1;
        const nextTotalCount = currentTotalCount + 1;
        const toolLimit = this.TOOL_LIMITS[tool];
        if (nextToolCount > toolLimit || nextTotalCount > this.TOTAL_DAILY_LIMIT) {
            throw new common_1.ForbiddenException({
                error: 'Daily AI usage limit reached',
                message: 'Upgrade plan for higher AI capacity',
            });
        }
        await Promise.all([
            this.redisService.incr(perToolKey),
            this.redisService.incr(totalKey),
            this.redisService.expire(perToolKey, 24 * 60 * 60),
            this.redisService.expire(totalKey, 24 * 60 * 60),
        ]);
        const remainingDailyUsage = this.TOTAL_DAILY_LIMIT - nextTotalCount;
        return { remainingDailyUsage };
    }
    isPremiumRole(role) {
        return [user_entity_1.UserRole.PREMIUM, user_entity_1.UserRole.PRO, user_entity_1.UserRole.HOT, user_entity_1.UserRole.ADMIN].includes(role);
    }
    getTodayKey() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    buildToolKey(userId, tool, dateKey) {
        return `ai-usage:${userId}:${tool}:${dateKey}`;
    }
    buildTotalKey(userId, dateKey) {
        return `ai-usage:${userId}:total:${dateKey}`;
    }
};
exports.AiUsageService = AiUsageService;
exports.AiUsageService = AiUsageService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        redis_service_1.RedisService])
], AiUsageService);
//# sourceMappingURL=ai-usage.service.js.map