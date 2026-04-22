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
exports.AiToolsController = void 0;
const common_1 = require("@nestjs/common");
const ai_tools_service_1 = require("./ai-tools.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const swagger_1 = require("@nestjs/swagger");
const ai_tools_dto_1 = require("./dto/ai-tools.dto");
const ai_usage_service_1 = require("./ai-usage.service");
const negotiation_ai_service_1 = require("../negotiation-ai/services/negotiation-ai.service");
let AiToolsController = class AiToolsController {
    constructor(aiToolsService, aiUsageService, negotiationAIService) {
        this.aiToolsService = aiToolsService;
        this.aiUsageService = aiUsageService;
        this.negotiationAIService = negotiationAIService;
    }
    async smartCopywriter(dto, req) {
        const userId = req.user.userId;
        const { remainingDailyUsage } = await this.aiUsageService.consume(userId, 'smart_copywriter');
        const aiResult = await this.aiToolsService.smartCopywriter(dto);
        return {
            result: aiResult,
            tool_used: 'Smart Copywriter',
            remaining_daily_usage: remainingDailyUsage,
        };
    }
    async negotiationAi(dto, req) {
        const userId = req.user.userId || req.user.sub;
        const response = await this.negotiationAIService.useNegotiationAI(userId, {
            originalPrice: dto.originalPrice,
            offeredPrice: dto.offeredPrice,
            productCategory: dto.productCategory,
        });
        return {
            result: response.result,
            tool_used: 'Negotiation AI',
            remaining_daily_usage: response.usage.remaining,
            daily_used: response.usage.dailyUsed,
            daily_limit: response.usage.dailyLimit,
        };
    }
    async competitorAnalyzer(dto, req) {
        const userId = req.user.userId;
        const { remainingDailyUsage } = await this.aiUsageService.consume(userId, 'competitor_analyzer');
        const aiResult = await this.aiToolsService.competitorAnalyzer(dto);
        return {
            result: aiResult,
            tool_used: 'Competitor Analyzer',
            remaining_daily_usage: remainingDailyUsage,
        };
    }
    async audienceExpansion(dto, req) {
        const role = String(req.user?.role || '').toLowerCase();
        const plan = String(req.user?.plan || '').toLowerCase();
        const hasAudienceExpansionAccess = role === 'admin' || plan === 'enterprise';
        if (!hasAudienceExpansionAccess) {
            throw new common_1.ForbiddenException('This feature requires an Enterprise subscription');
        }
        const userId = req.user.userId;
        const { remainingDailyUsage } = await this.aiUsageService.consume(userId, 'market_suggestion');
        const aiResult = await this.aiToolsService.audienceExpansion(dto);
        return {
            result: aiResult,
            tool_used: 'Audience Expansion',
            remaining_daily_usage: remainingDailyUsage,
        };
    }
    async adImprover(dto, req) {
        const userId = req.user.userId;
        const { remainingDailyUsage } = await this.aiUsageService.consume(userId, 'ad_improver');
        const aiResult = await this.aiToolsService.adImprover(dto);
        return {
            result: aiResult,
            tool_used: 'Ad Improver',
            remaining_daily_usage: remainingDailyUsage,
        };
    }
    async marketSuggestion(dto, req) {
        const userId = req.user.userId;
        const { remainingDailyUsage } = await this.aiUsageService.consume(userId, 'market_suggestion');
        const aiResult = await this.aiToolsService.marketSuggestion(dto);
        return {
            result: aiResult,
            tool_used: 'Market Suggestion AI',
            remaining_daily_usage: remainingDailyUsage,
        };
    }
};
exports.AiToolsController = AiToolsController;
__decorate([
    (0, common_1.Post)('smart-copywriter'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate ad copy with AI (Premium)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ai_tools_dto_1.SmartCopywriterDto, Object]),
    __metadata("design:returntype", Promise)
], AiToolsController.prototype, "smartCopywriter", null);
__decorate([
    (0, common_1.Post)('negotiation-ai'),
    (0, swagger_1.ApiOperation)({ summary: 'Get AI negotiation suggestions (Premium) — uses Negotiation AI access control' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ai_tools_dto_1.NegotiationAiDto, Object]),
    __metadata("design:returntype", Promise)
], AiToolsController.prototype, "negotiationAi", null);
__decorate([
    (0, common_1.Post)('competitor-analyzer'),
    (0, swagger_1.ApiOperation)({ summary: 'Analyze competitor ads (Premium)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ai_tools_dto_1.CompetitorAnalyzerDto, Object]),
    __metadata("design:returntype", Promise)
], AiToolsController.prototype, "competitorAnalyzer", null);
__decorate([
    (0, common_1.Post)('audience-expansion'),
    (0, swagger_1.ApiOperation)({ summary: 'Get audience expansion suggestions (Enterprise only)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ai_tools_dto_1.AudienceExpansionDto, Object]),
    __metadata("design:returntype", Promise)
], AiToolsController.prototype, "audienceExpansion", null);
__decorate([
    (0, common_1.Post)('ad-improver'),
    (0, swagger_1.ApiOperation)({ summary: 'Improve existing ad text (Premium)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ai_tools_dto_1.AdImproverDto, Object]),
    __metadata("design:returntype", Promise)
], AiToolsController.prototype, "adImprover", null);
__decorate([
    (0, common_1.Post)('market-suggestion'),
    (0, swagger_1.ApiOperation)({ summary: 'Market suggestion AI (Premium)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ai_tools_dto_1.MarketSuggestionDto, Object]),
    __metadata("design:returntype", Promise)
], AiToolsController.prototype, "marketSuggestion", null);
exports.AiToolsController = AiToolsController = __decorate([
    (0, swagger_1.ApiTags)('ai-tools'),
    (0, common_1.Controller)('ai-tools'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [ai_tools_service_1.AiToolsService,
        ai_usage_service_1.AiUsageService,
        negotiation_ai_service_1.NegotiationAIService])
], AiToolsController);
//# sourceMappingURL=ai-tools.controller.js.map