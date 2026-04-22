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
var DealBrokerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DealBrokerService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const deal_entity_1 = require("../entities/deal.entity");
const alternative_seller_search_entity_1 = require("../entities/alternative-seller-search.entity");
const seller_matching_service_1 = require("./seller-matching.service");
const deal_broker_usage_limiter_service_1 = require("./deal-broker-usage-limiter.service");
const negotiation_recovery_service_1 = require("./negotiation-recovery.service");
let DealBrokerService = DealBrokerService_1 = class DealBrokerService {
    constructor(userRepository, dealRepository, searchRepository, sellerMatchingService, usageLimiterService, recoveryService) {
        this.userRepository = userRepository;
        this.dealRepository = dealRepository;
        this.searchRepository = searchRepository;
        this.sellerMatchingService = sellerMatchingService;
        this.usageLimiterService = usageLimiterService;
        this.recoveryService = recoveryService;
        this.logger = new common_1.Logger(DealBrokerService_1.name);
        this.ALLOWED_PLANS = [
            user_entity_1.SubscriptionPlan.PREMIUM,
            user_entity_1.SubscriptionPlan.PRO_BUSINESS,
            user_entity_1.SubscriptionPlan.HOT_BUSINESS,
            user_entity_1.SubscriptionPlan.ENTERPRISE,
        ];
        this.PRICE_DIFFERENCE_THRESHOLD = 0.30;
    }
    async checkAccess(userId) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            select: [
                'id',
                'plan',
                'subscriptionActive',
                'subscriptionExpiry',
                'negotiationAiEnabled',
            ],
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.subscriptionExpiry &&
            new Date(user.subscriptionExpiry) < new Date()) {
            await this.userRepository.update(userId, {
                subscriptionActive: false,
                negotiationAiEnabled: false,
                plan: user_entity_1.SubscriptionPlan.FREE,
            });
            return {
                allowed: false,
                status: 'expired',
                message: 'Subscription has expired. Renew to access Alternative Seller Finder.',
            };
        }
        if (!user.subscriptionActive) {
            return {
                allowed: false,
                status: 'no_subscription',
                message: 'No active subscription. Subscribe to a paid plan to use Alternative Seller Finder.',
            };
        }
        if (!this.ALLOWED_PLANS.includes(user.plan)) {
            return {
                allowed: false,
                status: 'access_denied',
                message: `Plan "${user.plan}" does not include Alternative Seller Finder. Upgrade to premium or higher.`,
            };
        }
        const limitCheck = await this.usageLimiterService.checkLimit(userId, user.plan);
        if (!limitCheck.allowed) {
            return {
                allowed: false,
                status: 'limit_reached',
                message: 'Daily Alternative Seller Finder limit reached. Try again tomorrow or upgrade your plan.',
                dailyUsed: limitCheck.usageCount,
                dailyLimit: limitCheck.dailyLimit === -1 ? 'unlimited' : limitCheck.dailyLimit,
                remaining: 0,
            };
        }
        return {
            allowed: true,
            status: 'allowed',
            message: 'Alternative Seller Finder access granted.',
            dailyUsed: limitCheck.usageCount,
            dailyLimit: limitCheck.dailyLimit === -1 ? 'unlimited' : limitCheck.dailyLimit,
            remaining: limitCheck.remaining,
        };
    }
    async onNegotiationFailed(dealId, userId) {
        const deal = await this.dealRepository.findOne({
            where: { id: dealId },
        });
        if (!deal) {
            throw new common_1.NotFoundException(`Deal ${dealId} not found`);
        }
        if (deal.buyerId !== userId) {
            throw new common_1.ForbiddenException('You can only search alternatives for your own deals.');
        }
        const triggerReason = this.determineTriggerReason(deal);
        if (!triggerReason) {
            throw new common_1.BadRequestException('Deal does not meet failure criteria for alternative seller search.');
        }
        this.logger.log(`Negotiation failed for deal ${dealId}: reason=${triggerReason}`);
        const access = await this.checkAccess(userId);
        if (!access.allowed) {
            throw new common_1.ForbiddenException({
                status: access.status,
                message: access.message,
                dailyUsed: access.dailyUsed,
                dailyLimit: access.dailyLimit,
                remaining: access.remaining,
            });
        }
        const buyerRequirements = this.extractBuyerRequirements(deal);
        const excludeSellerIds = [
            deal.sellerId,
            ...(deal.rejectedSellerIds || []),
        ];
        const candidates = await this.sellerMatchingService.findCandidateSellers({
            buyerId: deal.buyerId,
            budget: buyerRequirements.budget,
            requiredAttention: buyerRequirements.requiredAttention,
            category: buyerRequirements.category,
            targetLocation: buyerRequirements.targetLocation,
            campaignDuration: buyerRequirements.campaignDuration,
            excludeSellerIds,
        });
        const rankedSellers = this.sellerMatchingService.scoreAndRankSellers(candidates, buyerRequirements.budget, buyerRequirements.requiredAttention);
        const searchRecord = this.searchRepository.create({
            dealId: deal.id,
            buyerId: deal.buyerId,
            originalSellerId: deal.sellerId,
            budget: buyerRequirements.budget,
            category: buyerRequirements.category,
            targetLocation: buyerRequirements.targetLocation,
            requiredAttention: buyerRequirements.requiredAttention,
            campaignDuration: buyerRequirements.campaignDuration,
            matchedSellers: rankedSellers,
            totalCandidates: candidates.length,
            returnedCount: rankedSellers.length,
            triggerReason,
        });
        const savedSearch = await this.searchRepository.save(searchRecord);
        deal.alternativeSearchTriggered = true;
        if (!deal.rejectedSellerIds)
            deal.rejectedSellerIds = [];
        deal.rejectedSellerIds.push(deal.sellerId);
        await this.dealRepository.save(deal);
        await this.usageLimiterService.incrementUsage(userId, 'alternative_seller_finder');
        if (rankedSellers.length === 0) {
            return {
                status: 'no_alternatives',
                sellers: [],
                searchId: savedSearch.id,
                totalCandidates: 0,
                message: 'No alternative sellers found matching your requirements. Try adjusting your budget or criteria.',
            };
        }
        return {
            status: 'alternative_found',
            sellers: rankedSellers,
            searchId: savedSearch.id,
            totalCandidates: candidates.length,
            message: `Found ${rankedSellers.length} recommended alternative seller(s).`,
        };
    }
    extractBuyerRequirements(deal) {
        return {
            buyerId: deal.buyerId,
            budget: Number(deal.budget) || Number(deal.offeredPrice) || 0,
            requiredAttention: deal.requiredAttention || 0,
            category: deal.category,
            targetLocation: deal.targetLocation || '',
            campaignDuration: deal.campaignDuration || 30,
        };
    }
    determineTriggerReason(deal) {
        if (deal.status === deal_entity_1.DealStatus.REJECTED) {
            return 'rejected';
        }
        if (deal.sellerDeclined) {
            return 'declined';
        }
        if (deal.negotiationDeadline &&
            new Date(deal.negotiationDeadline) < new Date() &&
            deal.status === deal_entity_1.DealStatus.PENDING) {
            return 'timeout';
        }
        if (deal.originalPrice && deal.offeredPrice) {
            const priceDiff = Math.abs(Number(deal.originalPrice) - Number(deal.offeredPrice)) /
                Number(deal.originalPrice);
            if (priceDiff >= this.PRICE_DIFFERENCE_THRESHOLD) {
                return 'price_gap';
            }
        }
        return null;
    }
    async selectAlternativeSeller(userId, searchId, sellerId) {
        const search = await this.searchRepository.findOne({
            where: { id: searchId },
        });
        if (!search) {
            throw new common_1.NotFoundException('Search record not found');
        }
        if (search.buyerId !== userId) {
            throw new common_1.ForbiddenException('You can only select sellers from your own search results.');
        }
        const matchedSeller = search.matchedSellers?.find((s) => s.sellerId === sellerId);
        if (!matchedSeller) {
            throw new common_1.BadRequestException('Selected seller was not in the search results.');
        }
        const originalDeal = await this.dealRepository.findOne({
            where: { id: search.dealId },
        });
        const chat = await this.recoveryService.createNegotiationChat(userId, sellerId, {
            dealId: search.dealId,
            category: search.category,
            budget: Number(search.budget),
            requiredAttention: search.requiredAttention,
            campaignDuration: search.campaignDuration,
            targetLocation: search.targetLocation,
            previousPrice: originalDeal ? Number(originalDeal.offeredPrice) : 0,
            rejectionReason: originalDeal?.rejectionReason || '',
            matchScore: matchedSeller.matchScore,
        });
        search.selectedSellerId = sellerId;
        search.chatCreated = true;
        await this.searchRepository.save(search);
        return {
            chatId: chat.id,
            message: 'Negotiation chat created with recommended seller. AI assistant is active.',
            negotiationAiActive: true,
        };
    }
    async getSearchHistory(userId, limit = 20) {
        return this.searchRepository.find({
            where: { buyerId: userId },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
    async getDealById(dealId, userId) {
        const deal = await this.dealRepository.findOne({
            where: { id: dealId },
        });
        if (!deal) {
            throw new common_1.NotFoundException('Deal not found');
        }
        if (deal.buyerId !== userId && deal.sellerId !== userId) {
            throw new common_1.ForbiddenException('Access denied to this deal.');
        }
        return deal;
    }
};
exports.DealBrokerService = DealBrokerService;
exports.DealBrokerService = DealBrokerService = DealBrokerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(deal_entity_1.Deal)),
    __param(2, (0, typeorm_1.InjectRepository)(alternative_seller_search_entity_1.AlternativeSellerSearch)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        seller_matching_service_1.SellerMatchingService,
        deal_broker_usage_limiter_service_1.DealBrokerUsageLimiterService,
        negotiation_recovery_service_1.NegotiationRecoveryService])
], DealBrokerService);
//# sourceMappingURL=deal-broker.service.js.map