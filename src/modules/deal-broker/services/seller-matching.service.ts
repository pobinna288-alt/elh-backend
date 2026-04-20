import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { SellerProfile } from '../entities/seller-profile.entity';

/**
 * SellerMatchingService
 *
 * Handles marketplace seller search, match scoring, and ranking.
 * Uses weighted multi-factor scoring to find the best alternative sellers.
 */
@Injectable()
export class SellerMatchingService {
  private readonly logger = new Logger(SellerMatchingService.name);

  // ── Scoring weights ──
  private readonly SCORE_WEIGHTS = {
    attentionScore: 0.35,
    dealSuccessRate: 0.25,
    responseSpeed: 0.15,
    priceEfficiency: 0.25,
  };

  private readonly MAX_CANDIDATES = 10;
  private readonly TOP_RESULTS = 3;
  private readonly MIN_ATTENTION_THRESHOLD = 10; // minimum attention score

  constructor(
    @InjectRepository(SellerProfile)
    private readonly sellerProfileRepository: Repository<SellerProfile>,
  ) {}

  // ════════════════════════════════════════════
  // SELLER MARKETPLACE SEARCH
  // ════════════════════════════════════════════

  /**
   * Query the seller marketplace for candidates matching buyer requirements.
   *
   * Filters:
   * - availability = true
   * - category MATCH
   * - location MATCH (if specified)
   * - price_per_attention <= budget range
   * - attention_score >= minimum threshold
   * - Excludes rejected & blocked sellers
   */
  async findCandidateSellers(buyerRequirements: {
    buyerId: string;
    budget: number;
    requiredAttention: number;
    category: string;
    targetLocation?: string;
    campaignDuration: number;
    excludeSellerIds: string[];
  }): Promise<SellerProfile[]> {
    const {
      buyerId,
      budget,
      requiredAttention,
      category,
      targetLocation,
      excludeSellerIds,
    } = buyerRequirements;

    this.logger.log(
      `Searching sellers: category=${category}, budget=${budget}, location=${targetLocation || 'any'}`,
    );

    // Build the query
    const qb = this.sellerProfileRepository
      .createQueryBuilder('sp')
      .where('sp.availability = :available', { available: true })
      .andWhere('sp.is_blocked = :blocked', { blocked: false })
      .andWhere('sp.category = :category', { category })
      .andWhere('sp.attention_score >= :minAttention', {
        minAttention: this.MIN_ATTENTION_THRESHOLD,
      });

    // Exclude the buyer themselves
    qb.andWhere('sp.user_id != :buyerId', { buyerId });

    // Price filter: seller's price_per_attention should be affordable
    if (budget > 0 && requiredAttention > 0) {
      const maxPricePerAttention = budget / requiredAttention;
      qb.andWhere('sp.price_per_attention <= :maxPrice', {
        maxPrice: maxPricePerAttention,
      });
    }

    // Location match (if specified)
    if (targetLocation) {
      qb.andWhere('LOWER(sp.location) = LOWER(:location)', {
        location: targetLocation,
      });
    }

    // Exclude previously rejected and blocked sellers
    if (excludeSellerIds.length > 0) {
      qb.andWhere('sp.user_id NOT IN (:...excludeIds)', {
        excludeIds: excludeSellerIds,
      });
    }

    // Order by attention score descending, limit to top candidates
    qb.orderBy('sp.attention_score', 'DESC')
      .addOrderBy('sp.deal_success_rate', 'DESC')
      .take(this.MAX_CANDIDATES);

    const candidates = await qb.getMany();

    this.logger.log(`Found ${candidates.length} candidate sellers`);
    return candidates;
  }

  // ════════════════════════════════════════════
  // MATCH SCORING ENGINE
  // ════════════════════════════════════════════

  /**
   * Calculate match_score for each seller:
   *
   * match_score =
   *   (attention_score * 0.35) +
   *   (deal_success_rate * 0.25) +
   *   (response_speed * 0.15) +
   *   (price_efficiency * 0.25)
   *
   * Returns the top 3 sellers sorted DESC by match_score.
   */
  scoreAndRankSellers(
    candidates: SellerProfile[],
    buyerBudget: number,
    requiredAttention: number,
  ): {
    sellerId: string;
    expectedPrice: number;
    attentionScore: number;
    matchScore: number;
    dealSuccessRate: number;
    responseSpeed: number;
  }[] {
    if (candidates.length === 0) {
      return [];
    }

    // Normalize values for scoring
    const maxAttention = Math.max(...candidates.map((c) => Number(c.attentionScore) || 1));
    const maxResponseSpeed = Math.max(...candidates.map((c) => Number(c.responseSpeed) || 1));

    const scored = candidates.map((seller) => {
      const attentionNorm = Number(seller.attentionScore) / maxAttention;
      const successRateNorm = Number(seller.dealSuccessRate); // already 0-1
      // Lower response speed is better → invert
      const responseSpeedNorm =
        maxResponseSpeed > 0
          ? 1 - Number(seller.responseSpeed) / maxResponseSpeed
          : 1;

      // Price efficiency: how much budget the seller saves
      const expectedPrice = Number(seller.pricePerAttention) * requiredAttention;
      const priceEfficiencyNorm =
        buyerBudget > 0 ? Math.max(0, 1 - expectedPrice / buyerBudget) : 0.5;

      const matchScore =
        attentionNorm * this.SCORE_WEIGHTS.attentionScore +
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

    // Sort DESC by matchScore and return top 3
    scored.sort((a, b) => b.matchScore - a.matchScore);

    return scored.slice(0, this.TOP_RESULTS);
  }

  // ════════════════════════════════════════════
  // UTILITY
  // ════════════════════════════════════════════

  async getSellerProfile(userId: string): Promise<SellerProfile | null> {
    return this.sellerProfileRepository.findOne({
      where: { userId },
    });
  }

  async updateSellerMetrics(
    userId: string,
    update: Partial<SellerProfile>,
  ): Promise<void> {
    await this.sellerProfileRepository.update({ userId }, update);
  }

  /**
   * Recalculate seller's deal success rate after a deal outcome.
   */
  async recalculateDealStats(
    userId: string,
    outcome: 'success' | 'failure',
  ): Promise<void> {
    const profile = await this.sellerProfileRepository.findOne({
      where: { userId },
    });

    if (!profile) return;

    profile.totalDeals += 1;
    if (outcome === 'success') {
      profile.successfulDeals += 1;
    } else {
      profile.failedDeals += 1;
    }

    profile.dealSuccessRate =
      profile.totalDeals > 0
        ? profile.successfulDeals / profile.totalDeals
        : 0;

    await this.sellerProfileRepository.save(profile);
  }
}
