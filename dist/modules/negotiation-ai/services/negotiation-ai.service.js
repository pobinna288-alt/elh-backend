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
var NegotiationAIService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NegotiationAIService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const usage_limiter_service_1 = require("./usage-limiter.service");
const subscription_service_1 = require("./subscription.service");
let NegotiationAIService = NegotiationAIService_1 = class NegotiationAIService {
    constructor(userRepository, usageLimiterService, subscriptionService) {
        this.userRepository = userRepository;
        this.usageLimiterService = usageLimiterService;
        this.subscriptionService = subscriptionService;
        this.logger = new common_1.Logger(NegotiationAIService_1.name);
    }
    async canUseNegotiationAI(userId) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            select: [
                'id', 'plan', 'subscriptionActive',
                'subscriptionExpiry', 'negotiationAiEnabled',
            ],
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (!user.subscriptionActive) {
            if (user.subscriptionExpiry && new Date(user.subscriptionExpiry) < new Date()) {
                return {
                    allowed: false,
                    status: 'expired',
                    message: 'Subscription has expired. Please renew to access Negotiation AI.',
                };
            }
            return {
                allowed: false,
                status: 'no_subscription',
                message: 'No active subscription. Subscribe to a paid plan to access Negotiation AI.',
            };
        }
        if (!user.negotiationAiEnabled) {
            return {
                allowed: false,
                status: 'not_enabled',
                message: 'Negotiation AI is not enabled for your current plan.',
            };
        }
        if (user.subscriptionExpiry && new Date(user.subscriptionExpiry) < new Date()) {
            await this.subscriptionService.getSubscriptionStatus(userId);
            return {
                allowed: false,
                status: 'expired',
                message: 'Subscription has expired. Please renew to access Negotiation AI.',
            };
        }
        const limitCheck = await this.usageLimiterService.checkLimit(userId, user.plan);
        if (!limitCheck.allowed) {
            return {
                allowed: false,
                status: 'limit_reached',
                message: 'Daily Negotiation AI limit reached. Upgrade plan or wait for reset.',
                dailyUsed: limitCheck.usageCount,
                dailyLimit: limitCheck.dailyLimit === -1 ? 'unlimited' : limitCheck.dailyLimit,
                remaining: 0,
            };
        }
        return {
            allowed: true,
            status: 'allowed',
            message: 'Negotiation AI access granted.',
            dailyUsed: limitCheck.usageCount,
            dailyLimit: limitCheck.dailyLimit === -1 ? 'unlimited' : limitCheck.dailyLimit,
            remaining: limitCheck.remaining,
        };
    }
    async useNegotiationAI(userId, data) {
        const access = await this.canUseNegotiationAI(userId);
        if (!access.allowed) {
            throw new common_1.ForbiddenException({
                status: access.status,
                message: access.message,
                dailyUsed: access.dailyUsed,
                dailyLimit: access.dailyLimit,
                remaining: access.remaining,
            });
        }
        const aiResult = this.generateNegotiationResponse(data);
        await this.usageLimiterService.incrementUsage(userId);
        const user = await this.userRepository.findOne({
            where: { id: userId },
            select: ['plan'],
        });
        const dailyLimit = this.usageLimiterService.getDailyLimit(user.plan);
        const newUsageCount = await this.usageLimiterService.getTodayUsageCount(userId);
        return {
            result: aiResult,
            usage: {
                dailyUsed: newUsageCount,
                dailyLimit: dailyLimit === -1 ? 'unlimited' : dailyLimit,
                remaining: dailyLimit === -1 ? 'unlimited' : Math.max(0, dailyLimit - newUsageCount),
            },
        };
    }
    async getNegotiationAIStatus(userId) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            select: ['id', 'plan', 'subscriptionActive', 'subscriptionExpiry', 'negotiationAiEnabled'],
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const usageCount = await this.usageLimiterService.getTodayUsageCount(userId);
        const dailyLimit = this.usageLimiterService.getDailyLimit(user.plan);
        return {
            plan: user.plan,
            subscriptionActive: user.subscriptionActive,
            negotiationAiEnabled: user.negotiationAiEnabled,
            dailyUsed: usageCount,
            dailyLimit: dailyLimit === -1 ? 'unlimited' : dailyLimit,
            remaining: dailyLimit === -1 ? 'unlimited' : Math.max(0, dailyLimit - usageCount),
            subscriptionExpiry: user.subscriptionExpiry || undefined,
        };
    }
    generateNegotiationResponse(data) {
        const { originalPrice, offeredPrice, productCategory, context } = data;
        const difference = originalPrice - offeredPrice;
        const percentOff = (difference / originalPrice) * 100;
        let strategy;
        let counterOffer;
        let reasoning;
        let confidence;
        if (percentOff > 30) {
            strategy = 'firm_decline';
            counterOffer = Math.round(originalPrice * 0.85 * 100) / 100;
            reasoning =
                'The offer is significantly below market value. Counter with a modest 15% discount to maintain item value while showing willingness to negotiate.';
            confidence = 'high';
        }
        else if (percentOff > 15) {
            strategy = 'negotiate';
            counterOffer = Math.round(originalPrice * 0.9 * 100) / 100;
            reasoning =
                'A reasonable starting offer. Counter with a 10% discount to find middle ground and secure the deal.';
            confidence = 'medium';
        }
        else {
            strategy = 'accept';
            counterOffer = offeredPrice;
            reasoning =
                'The offer is close to asking price. Consider accepting to close the deal quickly.';
            confidence = 'high';
        }
        const responseTemplates = this.getResponseTemplates(strategy, counterOffer);
        const marketInsight = `Similar ${productCategory} items typically sell at ${Math.round(originalPrice * 0.92)} on average.`;
        return {
            strategy,
            counterOffer,
            reasoning,
            confidence,
            marketInsight,
            responseTemplates,
            negotiationTips: [
                'Always remain polite and professional in negotiations.',
                'Highlight unique features or condition of your item.',
                'Set a firm minimum price before negotiating.',
                percentOff > 20
                    ? 'Consider offering a small bonus (free shipping, accessory) instead of a deeper discount.'
                    : 'This is a strong offer - quick acceptance builds buyer trust.',
            ],
        };
    }
    getResponseTemplates(strategy, counterOffer) {
        const templates = {
            firm_decline: [
                `Thank you for your interest! My asking price reflects the quality and market value. I can offer it at $${counterOffer} — that's my best offer.`,
                `I appreciate the offer, but I believe the item is worth more. Would you consider $${counterOffer}? That's a fair deal for both of us.`,
                `Thanks for reaching out! The lowest I can go is $${counterOffer}. Let me know if that works for you.`,
            ],
            negotiate: [
                `Thanks for your offer! How about we meet in the middle at $${counterOffer}?`,
                `I can work with you on the price. Would $${counterOffer} work? That's a solid deal.`,
                `Great interest! I can do $${counterOffer} — that's my best price for a quick sale.`,
            ],
            accept: [
                `Deal! Let's proceed at $${counterOffer}. When works for you?`,
                `That's a fair offer. I accept! When can we arrange the exchange?`,
                `Sounds good to me! Let's finalize at $${counterOffer}.`,
            ],
        };
        return templates[strategy] || templates.negotiate;
    }
};
exports.NegotiationAIService = NegotiationAIService;
exports.NegotiationAIService = NegotiationAIService = NegotiationAIService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        usage_limiter_service_1.UsageLimiterService,
        subscription_service_1.SubscriptionService])
], NegotiationAIService);
//# sourceMappingURL=negotiation-ai.service.js.map