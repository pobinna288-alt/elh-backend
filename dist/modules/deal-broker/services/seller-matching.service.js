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
var SellerMatchingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SellerMatchingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const seller_profile_entity_1 = require("../entities/seller-profile.entity");
let SellerMatchingService = SellerMatchingService_1 = class SellerMatchingService {
    constructor(sellerProfileRepository) {
        this.sellerProfileRepository = sellerProfileRepository;
        this.logger = new common_1.Logger(SellerMatchingService_1.name);
        this.SCORE_WEIGHTS = {
            attentionScore: 0.35,
            dealSuccessRate: 0.25,
            responseSpeed: 0.15,
            priceEfficiency: 0.25,
        };
        this.MAX_CANDIDATES = 10;
        this.TOP_RESULTS = 3;
        this.MIN_ATTENTION_THRESHOLD = 10;
    }
    async findCandidateSellers(buyerRequirements) {
        const { buyerId, budget, requiredAttention, category, targetLocation, excludeSellerIds, } = buyerRequirements;
        this.logger.log(`Searching sellers: category=${category}, budget=${budget}, location=${targetLocation || 'any'}`);
        const qb = this.sellerProfileRepository
            .createQueryBuilder('sp')
            .where('sp.availability = :available', { available: true })
            .andWhere('sp.is_blocked = :blocked', { blocked: false })
            .andWhere('sp.category = :category', { category })
            .andWhere('sp.attention_score >= :minAttention', {
            minAttention: this.MIN_ATTENTION_THRESHOLD,
        });
        qb.andWhere('sp.user_id != :buyerId', { buyerId });
        if (budget > 0 && requiredAttention > 0) {
            const maxPricePerAttention = budget / requiredAttention;
            qb.andWhere('sp.price_per_attention <= :maxPrice', {
                maxPrice: maxPricePerAttention,
            });
        }
        if (targetLocation) {
            qb.andWhere('LOWER(sp.location) = LOWER(:location)', {
                location: targetLocation,
            });
        }
        if (excludeSellerIds.length > 0) {
            qb.andWhere('sp.user_id NOT IN (:...excludeIds)', {
                excludeIds: excludeSellerIds,
            });
        }
        qb.orderBy('sp.attention_score', 'DESC')
            .addOrderBy('sp.deal_success_rate', 'DESC')
            .take(this.MAX_CANDIDATES);
        const candidates = await qb.getMany();
        this.logger.log(`Found ${candidates.length} candidate sellers`);
        return candidates;
    }
    scoreAndRankSellers(candidates, buyerBudget, requiredAttention) {
        if (candidates.length === 0) {
            return [];
        }
        const maxAttention = Math.max(...candidates.map((c) => Number(c.attentionScore) || 1));
        const maxResponseSpeed = Math.max(...candidates.map((c) => Number(c.responseSpeed) || 1));
        const scored = candidates.map((seller) => {
            const attentionNorm = Number(seller.attentionScore) / maxAttention;
            const successRateNorm = Number(seller.dealSuccessRate);
            const responseSpeedNorm = maxResponseSpeed > 0
                ? 1 - Number(seller.responseSpeed) / maxResponseSpeed
                : 1;
            const expectedPrice = Number(seller.pricePerAttention) * requiredAttention;
            const priceEfficiencyNorm = buyerBudget > 0 ? Math.max(0, 1 - expectedPrice / buyerBudget) : 0.5;
            const matchScore = attentionNorm * this.SCORE_WEIGHTS.attentionScore +
                successRateNorm * this.SCORE_WEIGHTS.dealSuccessRate +
                responseSpeedNorm * this.SCORE_WEIGHTS.responseSpeed +
                priceEfficiencyNorm * this.SCORE_WEIGHTS.priceEfficiency;
            return {
                sellerId: seller.userId,
                expectedPrice: Math.round(expectedPrice * 100) / 100,
                attentionScore: Number(seller.attentionScore),
                matchScore: Math.round(matchScore * 10000) / 10000,
                dealSuccessRate: Number(seller.dealSuccessRate),
                responseSpeed: Number(seller.responseSpeed),
            };
        });
        scored.sort((a, b) => b.matchScore - a.matchScore);
        return scored.slice(0, this.TOP_RESULTS);
    }
    async getSellerProfile(userId) {
        return this.sellerProfileRepository.findOne({
            where: { userId },
        });
    }
    async updateSellerMetrics(userId, update) {
        await this.sellerProfileRepository.update({ userId }, update);
    }
    async recalculateDealStats(userId, outcome) {
        const profile = await this.sellerProfileRepository.findOne({
            where: { userId },
        });
        if (!profile)
            return;
        profile.totalDeals += 1;
        if (outcome === 'success') {
            profile.successfulDeals += 1;
        }
        else {
            profile.failedDeals += 1;
        }
        profile.dealSuccessRate =
            profile.totalDeals > 0
                ? profile.successfulDeals / profile.totalDeals
                : 0;
        await this.sellerProfileRepository.save(profile);
    }
};
exports.SellerMatchingService = SellerMatchingService;
exports.SellerMatchingService = SellerMatchingService = SellerMatchingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(seller_profile_entity_1.SellerProfile)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SellerMatchingService);
//# sourceMappingURL=seller-matching.service.js.map