import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, SubscriptionPlan } from '../../users/entities/user.entity';
import { Deal, DealStatus } from '../entities/deal.entity';
import { AlternativeSellerSearch } from '../entities/alternative-seller-search.entity';
import { SellerMatchingService } from './seller-matching.service';
import { DealBrokerUsageLimiterService } from './deal-broker-usage-limiter.service';
import { NegotiationRecoveryService } from './negotiation-recovery.service';
import {
  AlternativeSearchResultDto,
  DealBrokerAccessResult,
} from '../dto/deal-broker.dto';

/**
 * DealBrokerService
 *
 * Core orchestrator for the AI Deal Broker system.
 * Handles negotiation failure detection, buyer requirement extraction,
 * alternative seller search triggering, and access control.
 */
@Injectable()
export class DealBrokerService {
  private readonly logger = new Logger(DealBrokerService.name);

  // Plans allowed to use the alternative seller finder
  private readonly ALLOWED_PLANS: SubscriptionPlan[] = [
    SubscriptionPlan.PREMIUM,
    SubscriptionPlan.PRO_BUSINESS,
    SubscriptionPlan.HOT_BUSINESS,
    SubscriptionPlan.ENTERPRISE,
  ];

  // Price difference threshold to auto-trigger (as a percentage)
  private readonly PRICE_DIFFERENCE_THRESHOLD = 0.30; // 30%

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Deal)
    private readonly dealRepository: Repository<Deal>,
    @InjectRepository(AlternativeSellerSearch)
    private readonly searchRepository: Repository<AlternativeSellerSearch>,
    private readonly sellerMatchingService: SellerMatchingService,
    private readonly usageLimiterService: DealBrokerUsageLimiterService,
    private readonly recoveryService: NegotiationRecoveryService,
  ) {}

  // ════════════════════════════════════════════
  // 1. ACCESS CONTROL
  // ════════════════════════════════════════════

  /**
   * Verify user can use the Alternative Seller Finder.
   * Checks: subscription active, plan in allowed list, daily limits.
   */
  async checkAccess(userId: string): Promise<DealBrokerAccessResult> {
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
      throw new NotFoundException('User not found');
    }

    // ── Subscription expiry check (Requirement #10) ──
    if (
      user.subscriptionExpiry &&
      new Date(user.subscriptionExpiry) < new Date()
    ) {
      // Auto-disable on expired subscription
      await this.userRepository.update(userId, {
        subscriptionActive: false,
        negotiationAiEnabled: false,
        plan: SubscriptionPlan.FREE,
      });

      return {
        allowed: false,
        status: 'expired',
        message:
          'Subscription has expired. Renew to access Alternative Seller Finder.',
      };
    }

    // ── Active subscription check ──
    if (!user.subscriptionActive) {
      return {
        allowed: false,
        status: 'no_subscription',
        message:
          'No active subscription. Subscribe to a paid plan to use Alternative Seller Finder.',
      };
    }

    // ── Plan check ──
    if (!this.ALLOWED_PLANS.includes(user.plan)) {
      return {
        allowed: false,
        status: 'access_denied',
        message: `Plan "${user.plan}" does not include Alternative Seller Finder. Upgrade to premium or higher.`,
      };
    }

    // ── Daily usage limit check (Requirement #8) ──
    const limitCheck = await this.usageLimiterService.checkLimit(
      userId,
      user.plan,
    );

    if (!limitCheck.allowed) {
      return {
        allowed: false,
        status: 'limit_reached',
        message:
          'Daily Alternative Seller Finder limit reached. Try again tomorrow or upgrade your plan.',
        dailyUsed: limitCheck.usageCount,
        dailyLimit:
          limitCheck.dailyLimit === -1 ? 'unlimited' : limitCheck.dailyLimit,
        remaining: 0,
      };
    }

    return {
      allowed: true,
      status: 'allowed',
      message: 'Alternative Seller Finder access granted.',
      dailyUsed: limitCheck.usageCount,
      dailyLimit:
        limitCheck.dailyLimit === -1 ? 'unlimited' : limitCheck.dailyLimit,
      remaining: limitCheck.remaining,
    };
  }

  // ════════════════════════════════════════════
  // 2. NEGOTIATION FAILURE DETECTION
  // ════════════════════════════════════════════

  /**
   * Called when a negotiation fails. Determines the trigger reason
   * and initiates the alternative seller search.
   *
   * Triggers when:
   * - deal.status == "rejected"
   * - seller_declined == true
   * - negotiation_timeout reached
   * - price_difference exceeds threshold
   */
  async onNegotiationFailed(
    dealId: string,
    userId: string,
  ): Promise<AlternativeSearchResultDto> {
    // ── Validate deal exists and user owns it ──
    const deal = await this.dealRepository.findOne({
      where: { id: dealId },
    });

    if (!deal) {
      throw new NotFoundException(`Deal ${dealId} not found`);
    }

    // Security: validate buyer ownership (Requirement #11)
    if (deal.buyerId !== userId) {
      throw new ForbiddenException(
        'You can only search alternatives for your own deals.',
      );
    }

    // ── Determine trigger reason ──
    const triggerReason = this.determineTriggerReason(deal);

    if (!triggerReason) {
      throw new BadRequestException(
        'Deal does not meet failure criteria for alternative seller search.',
      );
    }

    this.logger.log(
      `Negotiation failed for deal ${dealId}: reason=${triggerReason}`,
    );

    // ── Check access ──
    const access = await this.checkAccess(userId);
    if (!access.allowed) {
      throw new ForbiddenException({
        status: access.status,
        message: access.message,
        dailyUsed: access.dailyUsed,
        dailyLimit: access.dailyLimit,
        remaining: access.remaining,
      });
    }

    // ── Extract buyer requirements (Requirement #3) ──
    const buyerRequirements = this.extractBuyerRequirements(deal);

    // ── Build exclusion list ──
    const excludeSellerIds = [
      deal.sellerId,
      ...(deal.rejectedSellerIds || []),
    ];

    // ── Search marketplace (Requirement #4) ──
    const candidates =
      await this.sellerMatchingService.findCandidateSellers({
        buyerId: deal.buyerId,
        budget: buyerRequirements.budget,
        requiredAttention: buyerRequirements.requiredAttention,
        category: buyerRequirements.category,
        targetLocation: buyerRequirements.targetLocation,
        campaignDuration: buyerRequirements.campaignDuration,
        excludeSellerIds,
      });

    // ── Score & rank (Requirement #5) ──
    const rankedSellers = this.sellerMatchingService.scoreAndRankSellers(
      candidates,
      buyerRequirements.budget,
      buyerRequirements.requiredAttention,
    );

    // ── Save search record ──
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

    // ── Mark deal as having triggered alternative search ──
    deal.alternativeSearchTriggered = true;
    if (!deal.rejectedSellerIds) deal.rejectedSellerIds = [];
    deal.rejectedSellerIds.push(deal.sellerId);
    await this.dealRepository.save(deal);

    // ── Increment usage (Requirement #9) ──
    await this.usageLimiterService.incrementUsage(
      userId,
      'alternative_seller_finder',
    );

    // ── Build response (Requirement #6) ──
    if (rankedSellers.length === 0) {
      return {
        status: 'no_alternatives',
        sellers: [],
        searchId: savedSearch.id,
        totalCandidates: 0,
        message:
          'No alternative sellers found matching your requirements. Try adjusting your budget or criteria.',
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

  // ════════════════════════════════════════════
  // 3. BUYER REQUIREMENT EXTRACTION
  // ════════════════════════════════════════════

  private extractBuyerRequirements(deal: Deal): {
    buyerId: string;
    budget: number;
    requiredAttention: number;
    category: string;
    targetLocation: string;
    campaignDuration: number;
  } {
    return {
      buyerId: deal.buyerId,
      budget: Number(deal.budget) || Number(deal.offeredPrice) || 0,
      requiredAttention: deal.requiredAttention || 0,
      category: deal.category,
      targetLocation: deal.targetLocation || '',
      campaignDuration: deal.campaignDuration || 30,
    };
  }

  // ════════════════════════════════════════════
  // TRIGGER REASON DETECTION
  // ════════════════════════════════════════════

  private determineTriggerReason(
    deal: Deal,
  ): string | null {
    // Check for explicit rejection
    if (deal.status === DealStatus.REJECTED) {
      return 'rejected';
    }

    // Check if seller explicitly declined
    if (deal.sellerDeclined) {
      return 'declined';
    }

    // Check for negotiation timeout
    if (
      deal.negotiationDeadline &&
      new Date(deal.negotiationDeadline) < new Date() &&
      deal.status === DealStatus.PENDING
    ) {
      return 'timeout';
    }

    // Check for excessive price gap
    if (deal.originalPrice && deal.offeredPrice) {
      const priceDiff =
        Math.abs(Number(deal.originalPrice) - Number(deal.offeredPrice)) /
        Number(deal.originalPrice);

      if (priceDiff >= this.PRICE_DIFFERENCE_THRESHOLD) {
        return 'price_gap';
      }
    }

    return null;
  }

  // ════════════════════════════════════════════
  // 7. SELECT ALTERNATIVE SELLER → AUTO CHAT
  // ════════════════════════════════════════════

  /**
   * When a buyer selects a recommended seller, create a negotiation chat
   * and attach all relevant context.
   */
  async selectAlternativeSeller(
    userId: string,
    searchId: string,
    sellerId: string,
  ): Promise<{
    chatId: string;
    message: string;
    negotiationAiActive: boolean;
  }> {
    // Validate the search record
    const search = await this.searchRepository.findOne({
      where: { id: searchId },
    });

    if (!search) {
      throw new NotFoundException('Search record not found');
    }

    if (search.buyerId !== userId) {
      throw new ForbiddenException(
        'You can only select sellers from your own search results.',
      );
    }

    // Verify the seller was in the matched results
    const matchedSeller = search.matchedSellers?.find(
      (s) => s.sellerId === sellerId,
    );

    if (!matchedSeller) {
      throw new BadRequestException(
        'Selected seller was not in the search results.',
      );
    }

    // Fetch original deal for context
    const originalDeal = await this.dealRepository.findOne({
      where: { id: search.dealId },
    });

    // Create negotiation chat via recovery service (Requirement #7)
    const chat = await this.recoveryService.createNegotiationChat(
      userId,
      sellerId,
      {
        dealId: search.dealId,
        category: search.category,
        budget: Number(search.budget),
        requiredAttention: search.requiredAttention,
        campaignDuration: search.campaignDuration,
        targetLocation: search.targetLocation,
        previousPrice: originalDeal ? Number(originalDeal.offeredPrice) : 0,
        rejectionReason: originalDeal?.rejectionReason || '',
        matchScore: matchedSeller.matchScore,
      },
    );

    // Update search record
    search.selectedSellerId = sellerId;
    search.chatCreated = true;
    await this.searchRepository.save(search);

    return {
      chatId: chat.id,
      message: 'Negotiation chat created with recommended seller. AI assistant is active.',
      negotiationAiActive: true,
    };
  }

  // ════════════════════════════════════════════
  // STATUS & HISTORY
  // ════════════════════════════════════════════

  async getSearchHistory(
    userId: string,
    limit = 20,
  ): Promise<AlternativeSellerSearch[]> {
    return this.searchRepository.find({
      where: { buyerId: userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getDealById(dealId: string, userId: string): Promise<Deal> {
    const deal = await this.dealRepository.findOne({
      where: { id: dealId },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    // Only buyer or seller can view
    if (deal.buyerId !== userId && deal.sellerId !== userId) {
      throw new ForbiddenException('Access denied to this deal.');
    }

    return deal;
  }
}
