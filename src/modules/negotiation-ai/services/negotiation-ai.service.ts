import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, SubscriptionPlan } from '../../users/entities/user.entity';
import { UsageLimiterService } from './usage-limiter.service';
import { SubscriptionService } from './subscription.service';
import { NegotiationAiAccessResult } from '../dto/negotiation-ai.dto';

/**
 * NegotiationAIService
 *
 * Core service for Negotiation AI access control.
 * Validates subscription, checks limits, tracks usage, and generates AI responses.
 */
@Injectable()
export class NegotiationAIService {
  private readonly logger = new Logger(NegotiationAIService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly usageLimiterService: UsageLimiterService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * canUseNegotiationAI(user_id)
   *
   * Steps:
   * 1. Fetch user plan
   * 2. Verify subscription_active == true
   * 3. Verify negotiation_ai_enabled == true
   * 4. Fetch today's usage_count
   * 5. Apply plan-specific limits
   *
   * Returns: ALLOW or specific denial reason
   */
  async canUseNegotiationAI(userId: string): Promise<NegotiationAiAccessResult> {
    // Step 1: Fetch user
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: [
        'id', 'plan', 'subscriptionActive',
        'subscriptionExpiry', 'negotiationAiEnabled',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Step 2: Verify subscription_active
    if (!user.subscriptionActive) {
      // Check if it expired
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

    // Step 3: Verify negotiation_ai_enabled
    if (!user.negotiationAiEnabled) {
      return {
        allowed: false,
        status: 'not_enabled',
        message: 'Negotiation AI is not enabled for your current plan.',
      };
    }

    // Live expiry check
    if (user.subscriptionExpiry && new Date(user.subscriptionExpiry) < new Date()) {
      // Auto-handle: expire the subscription
      await this.subscriptionService.getSubscriptionStatus(userId);
      return {
        allowed: false,
        status: 'expired',
        message: 'Subscription has expired. Please renew to access Negotiation AI.',
      };
    }

    // Step 4 & 5: Check daily limit
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

  /**
   * Use Negotiation AI - performs access check, generates reply, and increments usage.
   */
  async useNegotiationAI(
    userId: string,
    data: { originalPrice: number; offeredPrice: number; productCategory: string; context?: string },
  ): Promise<{
    result: any;
    usage: { dailyUsed: number; dailyLimit: number | 'unlimited'; remaining: number | 'unlimited' };
  }> {
    // Access check
    const access = await this.canUseNegotiationAI(userId);

    if (!access.allowed) {
      throw new ForbiddenException({
        status: access.status,
        message: access.message,
        dailyUsed: access.dailyUsed,
        dailyLimit: access.dailyLimit,
        remaining: access.remaining,
      });
    }

    // Generate AI reply
    const aiResult = this.generateNegotiationResponse(data);

    // Increment usage after successful response
    await this.usageLimiterService.incrementUsage(userId);

    // Get updated counts
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

  /**
   * Get user's Negotiation AI status (plan, limits, usage).
   */
  async getNegotiationAIStatus(userId: string): Promise<{
    plan: string;
    subscriptionActive: boolean;
    negotiationAiEnabled: boolean;
    dailyUsed: number;
    dailyLimit: number | 'unlimited';
    remaining: number | 'unlimited';
    subscriptionExpiry?: Date;
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'plan', 'subscriptionActive', 'subscriptionExpiry', 'negotiationAiEnabled'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
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

  /**
   * Generate negotiation AI response.
   * In production, integrate with OpenAI or similar LLM.
   */
  private generateNegotiationResponse(data: {
    originalPrice: number;
    offeredPrice: number;
    productCategory: string;
    context?: string;
  }) {
    const { originalPrice, offeredPrice, productCategory, context } = data;
    const difference = originalPrice - offeredPrice;
    const percentOff = (difference / originalPrice) * 100;

    let strategy: string;
    let counterOffer: number;
    let reasoning: string;
    let confidence: string;

    if (percentOff > 30) {
      strategy = 'firm_decline';
      counterOffer = Math.round(originalPrice * 0.85 * 100) / 100;
      reasoning =
        'The offer is significantly below market value. Counter with a modest 15% discount to maintain item value while showing willingness to negotiate.';
      confidence = 'high';
    } else if (percentOff > 15) {
      strategy = 'negotiate';
      counterOffer = Math.round(originalPrice * 0.9 * 100) / 100;
      reasoning =
        'A reasonable starting offer. Counter with a 10% discount to find middle ground and secure the deal.';
      confidence = 'medium';
    } else {
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

  private getResponseTemplates(strategy: string, counterOffer: number): string[] {
    const templates: Record<string, string[]> = {
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
}
