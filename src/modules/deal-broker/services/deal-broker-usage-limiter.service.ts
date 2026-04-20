import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from '../../users/entities/user.entity';
import { AiUsageLog } from '../../negotiation-ai/entities/ai-usage-log.entity';

/**
 * DealBrokerUsageLimiterService
 *
 * Enforces daily usage limits for the Alternative Seller Finder
 * feature, separate from the Negotiation AI limits.
 *
 * Plan limits (Requirement #8):
 *   premium      → 5 searches/day
 *   pro_business  → 10 searches/day
 *   hot_business  → 20 searches/day
 *   enterprise    → unlimited
 *   free          → 0 (blocked)
 */
@Injectable()
export class DealBrokerUsageLimiterService {
  private readonly logger = new Logger(DealBrokerUsageLimiterService.name);

  private readonly FEATURE_NAME = 'alternative_seller_finder';

  private readonly DAILY_LIMITS: Record<string, number> = {
    [SubscriptionPlan.PREMIUM]: 5,
    [SubscriptionPlan.PRO_BUSINESS]: 10,
    [SubscriptionPlan.HOT_BUSINESS]: 20,
    [SubscriptionPlan.ENTERPRISE]: -1, // unlimited
    [SubscriptionPlan.FREE]: 0,
  };

  constructor(
    @InjectRepository(AiUsageLog)
    private readonly usageLogRepository: Repository<AiUsageLog>,
  ) {}

  // ════════════════════════════════════════════
  // DAILY LIMIT LOGIC
  // ════════════════════════════════════════════

  getDailyLimit(plan: SubscriptionPlan): number {
    return this.DAILY_LIMITS[plan] ?? 0;
  }

  getTodayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ════════════════════════════════════════════
  // USAGE RECORD MANAGEMENT
  // ════════════════════════════════════════════

  /**
   * Get or create today's usage record for alternative_seller_finder.
   * Creates a daily record automatically if missing.
   */
  async getOrCreateTodayUsage(
    userId: string,
    featureName: string = this.FEATURE_NAME,
  ): Promise<AiUsageLog> {
    const today = this.getTodayDateString();

    let record = await this.usageLogRepository.findOne({
      where: {
        userId,
        featureName,
        usageDate: today,
      },
    });

    if (!record) {
      record = this.usageLogRepository.create({
        userId,
        featureName,
        usageCount: 0,
        usageDate: today,
      });
      record = await this.usageLogRepository.save(record);
      this.logger.debug(
        `Created new usage record for user ${userId}, feature=${featureName}, date=${today}`,
      );
    }

    return record;
  }

  async getTodayUsageCount(userId: string): Promise<number> {
    const record = await this.getOrCreateTodayUsage(userId);
    return record.usageCount;
  }

  // ════════════════════════════════════════════
  // CHECK LIMIT (Requirement #8)
  // ════════════════════════════════════════════

  async checkLimit(
    userId: string,
    plan: SubscriptionPlan,
  ): Promise<{
    allowed: boolean;
    usageCount: number;
    dailyLimit: number;
    remaining: number | 'unlimited';
  }> {
    const dailyLimit = this.getDailyLimit(plan);
    const usageCount = await this.getTodayUsageCount(userId);

    // Unlimited for enterprise
    if (dailyLimit === -1) {
      return {
        allowed: true,
        usageCount,
        dailyLimit: -1,
        remaining: 'unlimited',
      };
    }

    // Blocked for free
    if (dailyLimit === 0) {
      return { allowed: false, usageCount, dailyLimit: 0, remaining: 0 };
    }

    const remaining = Math.max(0, dailyLimit - usageCount);

    return {
      allowed: usageCount < dailyLimit,
      usageCount,
      dailyLimit,
      remaining,
    };
  }

  // ════════════════════════════════════════════
  // INCREMENT USAGE (Requirement #9)
  // ════════════════════════════════════════════

  /**
   * incrementUsage(user_id, "alternative_seller_finder")
   *
   * After a successful alternative search, increment the daily counter.
   */
  async incrementUsage(
    userId: string,
    featureName: string = this.FEATURE_NAME,
  ): Promise<AiUsageLog> {
    const record = await this.getOrCreateTodayUsage(userId, featureName);
    record.usageCount += 1;
    const saved = await this.usageLogRepository.save(record);

    this.logger.debug(
      `User ${userId} ${featureName} usage incremented to ${saved.usageCount}`,
    );

    return saved;
  }

  // ════════════════════════════════════════════
  // USAGE HISTORY
  // ════════════════════════════════════════════

  async getUsageHistory(
    userId: string,
    days = 30,
  ): Promise<AiUsageLog[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];

    return this.usageLogRepository
      .createQueryBuilder('log')
      .where('log.userId = :userId', { userId })
      .andWhere('log.featureName = :feature', { feature: this.FEATURE_NAME })
      .andWhere('log.usageDate >= :since', { since: sinceStr })
      .orderBy('log.usageDate', 'DESC')
      .getMany();
  }
}
