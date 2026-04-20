import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, SubscriptionPlan } from '../../users/entities/user.entity';
import { AiUsageLog } from '../entities/ai-usage-log.entity';

/**
 * UsageLimiterService
 *
 * Enforces daily Negotiation AI usage limits per subscription plan.
 * Tracks usage in the ai_usage_logs table with per-day records.
 * Designed for future extension: monthly limits, pay-per-use, bonus credits.
 */
@Injectable()
export class UsageLimiterService {
  private readonly logger = new Logger(UsageLimiterService.name);

  /**
   * Daily negotiation AI reply limits per plan.
   * Starter = 10/day, Pro = 25/day, Elite = 30/day.
   * Enterprise remains unlimited.
   */
  private readonly DAILY_LIMITS: Record<string, number> = {
    [SubscriptionPlan.PREMIUM]: 10,
    [SubscriptionPlan.PRO_BUSINESS]: 25,
    [SubscriptionPlan.HOT_BUSINESS]: 30,
    [SubscriptionPlan.ENTERPRISE]: -1, // unlimited
    [SubscriptionPlan.FREE]: 0,
  };

  private readonly FEATURE_NAME = 'negotiation_ai';

  constructor(
    @InjectRepository(AiUsageLog)
    private readonly usageLogRepository: Repository<AiUsageLog>,
  ) {}

  /**
   * Get the daily limit for a given plan.
   * Returns -1 for unlimited.
   */
  getDailyLimit(plan: SubscriptionPlan): number {
    return this.DAILY_LIMITS[plan] ?? 0;
  }

  /**
   * Get today's date string in YYYY-MM-DD format.
   */
  getTodayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get or create today's usage record for a user.
   */
  async getOrCreateTodayUsage(userId: string): Promise<AiUsageLog> {
    const today = this.getTodayDateString();

    let record = await this.usageLogRepository.findOne({
      where: {
        userId,
        featureName: this.FEATURE_NAME,
        usageDate: today,
      },
    });

    if (!record) {
      record = this.usageLogRepository.create({
        userId,
        featureName: this.FEATURE_NAME,
        usageCount: 0,
        usageDate: today,
      });
      record = await this.usageLogRepository.save(record);
      this.logger.debug(`Created new usage record for user ${userId} on ${today}`);
    }

    return record;
  }

  /**
   * Get today's usage count for a user.
   */
  async getTodayUsageCount(userId: string): Promise<number> {
    const record = await this.getOrCreateTodayUsage(userId);
    return record.usageCount;
  }

  /**
   * Check if user can still use Negotiation AI today.
   */
  async checkLimit(userId: string, plan: SubscriptionPlan): Promise<{
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

    // Free plan has no access
    if (dailyLimit === 0) {
      return {
        allowed: false,
        usageCount,
        dailyLimit: 0,
        remaining: 0,
      };
    }

    const remaining = Math.max(0, dailyLimit - usageCount);

    return {
      allowed: usageCount < dailyLimit,
      usageCount,
      dailyLimit,
      remaining,
    };
  }

  /**
   * Increment today's usage count by 1.
   * Creates the record if it doesn't exist.
   */
  async incrementUsage(userId: string): Promise<AiUsageLog> {
    const record = await this.getOrCreateTodayUsage(userId);
    record.usageCount += 1;
    const saved = await this.usageLogRepository.save(record);

    this.logger.debug(
      `User ${userId} negotiation AI usage incremented to ${saved.usageCount}`,
    );

    return saved;
  }

  /**
   * Get usage history for a user (for analytics / future features).
   */
  async getUsageHistory(
    userId: string,
    days: number = 30,
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
