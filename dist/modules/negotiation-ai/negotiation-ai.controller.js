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
exports.NegotiationAiController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const negotiation_ai_service_1 = require("./services/negotiation-ai.service");
const subscription_service_1 = require("./services/subscription.service");
const usage_limiter_service_1 = require("./services/usage-limiter.service");
const negotiation_ai_dto_1 = require("./dto/negotiation-ai.dto");
let NegotiationAiController = class NegotiationAiController {
    constructor(negotiationAIService, subscriptionService, usageLimiterService) {
        this.negotiationAIService = negotiationAIService;
        this.subscriptionService = subscriptionService;
        this.usageLimiterService = usageLimiterService;
    }
    async getNegotiationReply(dto, req) {
        const userId = req.user.userId || req.user.sub;
        const response = await this.negotiationAIService.useNegotiationAI(userId, {
            originalPrice: dto.originalPrice,
            offeredPrice: dto.offeredPrice,
            productCategory: dto.productCategory,
            context: dto.context,
        });
        return {
            success: true,
            tool_used: 'Negotiation AI',
            ...response,
        };
    }
    async checkAccess(req) {
        const userId = req.user.userId || req.user.sub;
        const result = await this.negotiationAIService.canUseNegotiationAI(userId);
        return result;
    }
    async getStatus(req) {
        const userId = req.user.userId || req.user.sub;
        return this.negotiationAIService.getNegotiationAIStatus(userId);
    }
    async getUsageHistory(req) {
        const userId = req.user.userId || req.user.sub;
        const history = await this.usageLimiterService.getUsageHistory(userId, 30);
        return { usage_history: history };
    }
    async activateSubscription(dto, req) {
        const userId = req.user.userId || req.user.sub;
        const plan = dto.plan;
        const result = await this.subscriptionService.onSubscriptionActivated(userId, plan);
        return {
            success: true,
            message: 'Subscription activated successfully. Negotiation AI is now available.',
            subscription_status: 'active',
            plan: result.user.plan,
            subscription_expiry: result.subscriptionExpiry,
            negotiation_ai_enabled: result.negotiationAiEnabled,
        };
    }
    async getSubscriptionStatus(req) {
        const userId = req.user.userId || req.user.sub;
        return this.subscriptionService.getSubscriptionStatus(userId);
    }
};
exports.NegotiationAiController = NegotiationAiController;
__decorate([
    (0, common_1.Post)('reply'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Get AI negotiation reply',
        description: 'Generates an AI-powered negotiation response. Requires active subscription with Negotiation AI access. Enforces daily usage limits per plan.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'AI negotiation reply generated' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied or daily limit reached' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized - valid token required' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [negotiation_ai_dto_1.NegotiationAiRequestDto, Object]),
    __metadata("design:returntype", Promise)
], NegotiationAiController.prototype, "getNegotiationReply", null);
__decorate([
    (0, common_1.Get)('access-check'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Check Negotiation AI access',
        description: 'Returns whether the user can currently use Negotiation AI, including plan, limits, and remaining uses.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Access check result' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NegotiationAiController.prototype, "checkAccess", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get Negotiation AI status',
        description: 'Returns the user plan, subscription status, AI enabled state, daily usage, and limits.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Negotiation AI status' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NegotiationAiController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('usage-history'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get Negotiation AI usage history',
        description: 'Returns the last 30 days of Negotiation AI usage logs.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Usage history' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NegotiationAiController.prototype, "getUsageHistory", null);
__decorate([
    (0, common_1.Post)('subscription/activate'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Activate subscription after payment',
        description: 'Triggers subscription activation: updates plan, enables Negotiation AI, sets expiry. Called after successful payment (money or coins).',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Subscription activated' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid plan' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [negotiation_ai_dto_1.ActivateSubscriptionDto, Object]),
    __metadata("design:returntype", Promise)
], NegotiationAiController.prototype, "activateSubscription", null);
__decorate([
    (0, common_1.Get)('subscription/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get subscription status',
        description: 'Returns the current subscription plan, active status, and expiry date.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Subscription status' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NegotiationAiController.prototype, "getSubscriptionStatus", null);
exports.NegotiationAiController = NegotiationAiController = __decorate([
    (0, swagger_1.ApiTags)('negotiation-ai'),
    (0, common_1.Controller)('negotiation-ai'),
    __metadata("design:paramtypes", [negotiation_ai_service_1.NegotiationAIService,
        subscription_service_1.SubscriptionService,
        usage_limiter_service_1.UsageLimiterService])
], NegotiationAiController);
//# sourceMappingURL=negotiation-ai.controller.js.map