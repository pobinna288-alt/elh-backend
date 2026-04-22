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
exports.DealBrokerController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const deal_broker_service_1 = require("./services/deal-broker.service");
const deal_broker_usage_limiter_service_1 = require("./services/deal-broker-usage-limiter.service");
const negotiation_recovery_service_1 = require("./services/negotiation-recovery.service");
const deal_broker_dto_1 = require("./dto/deal-broker.dto");
let DealBrokerController = class DealBrokerController {
    constructor(dealBrokerService, usageLimiterService, recoveryService) {
        this.dealBrokerService = dealBrokerService;
        this.usageLimiterService = usageLimiterService;
        this.recoveryService = recoveryService;
    }
    async findAlternativeSellers(dto, req) {
        const userId = req.user.userId || req.user.sub;
        const result = await this.dealBrokerService.onNegotiationFailed(dto.dealId, userId);
        return {
            success: true,
            tool_used: 'AI Alternative Seller Finder',
            ...result,
        };
    }
    async selectAlternativeSeller(dto, req) {
        const userId = req.user.userId || req.user.sub;
        const result = await this.dealBrokerService.selectAlternativeSeller(userId, dto.searchId, dto.sellerId);
        return {
            success: true,
            tool_used: 'AI Deal Broker',
            ...result,
        };
    }
    async checkAccess(req) {
        const userId = req.user.userId || req.user.sub;
        const result = await this.dealBrokerService.checkAccess(userId);
        return {
            success: true,
            feature: 'alternative_seller_finder',
            ...result,
        };
    }
    async getUsageHistory(req) {
        const userId = req.user.userId || req.user.sub;
        const history = await this.usageLimiterService.getUsageHistory(userId, 30);
        return {
            success: true,
            feature: 'alternative_seller_finder',
            usage_history: history,
        };
    }
    async getSearchHistory(req, limit) {
        const userId = req.user.userId || req.user.sub;
        const searches = await this.dealBrokerService.getSearchHistory(userId, limit || 20);
        return {
            success: true,
            count: searches.length,
            searches,
        };
    }
    async getDeal(dealId, req) {
        const userId = req.user.userId || req.user.sub;
        const deal = await this.dealBrokerService.getDealById(dealId, userId);
        return {
            success: true,
            deal,
        };
    }
    async getNegotiationChats(req) {
        const userId = req.user.userId || req.user.sub;
        const chats = await this.recoveryService.getChatsByBuyer(userId);
        return {
            success: true,
            count: chats.length,
            chats,
        };
    }
    async getNegotiationChat(chatId) {
        const chat = await this.recoveryService.getChatById(chatId);
        return {
            success: true,
            chat,
        };
    }
};
exports.DealBrokerController = DealBrokerController;
__decorate([
    (0, common_1.Post)('alternative-search'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Find alternative sellers after negotiation failure',
        description: 'Triggers the AI Alternative Seller Finder when a deal negotiation fails. ' +
            'Requires active subscription (premium/pro_business/hot_business/enterprise). ' +
            'Enforces daily usage limits per plan.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Alternative sellers found or no matches' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied, limit reached, or subscription expired' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Deal not found' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Deal does not meet failure criteria' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [deal_broker_dto_1.TriggerAlternativeSearchDto, Object]),
    __metadata("design:returntype", Promise)
], DealBrokerController.prototype, "findAlternativeSellers", null);
__decorate([
    (0, common_1.Post)('select-seller'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Select a recommended alternative seller',
        description: 'When buyer selects a recommended seller, automatically creates a negotiation chat ' +
            'with campaign details and activates Negotiation AI.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Negotiation chat created' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Search record not found' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [deal_broker_dto_1.SelectAlternativeSellerDto, Object]),
    __metadata("design:returntype", Promise)
], DealBrokerController.prototype, "selectAlternativeSeller", null);
__decorate([
    (0, common_1.Get)('access-check'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Check Alternative Seller Finder access',
        description: 'Returns whether the user can use the Alternative Seller Finder, ' +
            'including plan info, daily limits, and remaining uses.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Access check result' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DealBrokerController.prototype, "checkAccess", null);
__decorate([
    (0, common_1.Get)('usage-history'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get Alternative Seller Finder usage history',
        description: 'Returns daily usage logs for the last 30 days.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Usage history' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DealBrokerController.prototype, "getUsageHistory", null);
__decorate([
    (0, common_1.Get)('search-history'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get alternative seller search history',
        description: 'Returns past alternative seller searches for the user.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Search history' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], DealBrokerController.prototype, "getSearchHistory", null);
__decorate([
    (0, common_1.Get)('deal/:dealId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get deal by ID',
        description: 'Returns deal details. Only the buyer or seller can view.',
    }),
    (0, swagger_1.ApiParam)({ name: 'dealId', type: String }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Deal details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Deal not found' }),
    __param(0, (0, common_1.Param)('dealId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DealBrokerController.prototype, "getDeal", null);
__decorate([
    (0, common_1.Get)('chats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get negotiation chats',
        description: 'Returns all negotiation chats created via the Deal Broker.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Negotiation chats list' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DealBrokerController.prototype, "getNegotiationChats", null);
__decorate([
    (0, common_1.Get)('chat/:chatId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get negotiation chat by ID',
    }),
    (0, swagger_1.ApiParam)({ name: 'chatId', type: String }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Chat details' }),
    __param(0, (0, common_1.Param)('chatId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DealBrokerController.prototype, "getNegotiationChat", null);
exports.DealBrokerController = DealBrokerController = __decorate([
    (0, swagger_1.ApiTags)('deal-broker'),
    (0, common_1.Controller)('deal-broker'),
    __metadata("design:paramtypes", [deal_broker_service_1.DealBrokerService,
        deal_broker_usage_limiter_service_1.DealBrokerUsageLimiterService,
        negotiation_recovery_service_1.NegotiationRecoveryService])
], DealBrokerController);
//# sourceMappingURL=deal-broker.controller.js.map