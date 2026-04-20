import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, SubscriptionPlan } from '../users/entities/user.entity';
import { RedisService } from '../redis/redis.service';

export type AiToolName =
  | 'smart_copywriter'
  | 'negotiation_ai'
  | 'competitor_analyzer'
  | 'ad_improver'
  | 'market_suggestion';

interface UsageCheckResult {
  remainingDailyUsage: number;
}

interface PlanUsagePolicy {
  publicPlan: 'free' | 'starter' | 'pro' | 'elite' | 'enterprise';
  allowedTools: AiToolName[];
  perToolDailyLimit: number;
  totalDailyLimit: number;
}

@Injectable()
export class AiUsageService {
  private readonly ADVANCED_TOOLS: AiToolName[] = ['ad_improver', 'market_suggestion'];

  private readonly PLAN_POLICIES: Record<string, PlanUsagePolicy> = {
    [SubscriptionPlan.FREE]: {
      publicPlan: 'free',
      allowedTools: [],
      perToolDailyLimit: 0,
      totalDailyLimit: 0,
    },
    [SubscriptionPlan.PREMIUM]: {
      publicPlan: 'starter',
      allowedTools: ['smart_copywriter', 'negotiation_ai', 'competitor_analyzer'],
      perToolDailyLimit: 10,
      totalDailyLimit: 30,
    },
    [SubscriptionPlan.PRO_BUSINESS]: {
      publicPlan: 'pro',
      allowedTools: ['smart_copywriter', 'negotiation_ai', 'competitor_analyzer', 'ad_improver', 'market_suggestion'],
      perToolDailyLimit: 25,
      totalDailyLimit: 125,
    },
    [SubscriptionPlan.HOT_BUSINESS]: {
      publicPlan: 'elite',
      allowedTools: ['smart_copywriter', 'negotiation_ai', 'competitor_analyzer', 'ad_improver', 'market_suggestion'],
      perToolDailyLimit: 30,
      totalDailyLimit: 150,
    },
    [SubscriptionPlan.ENTERPRISE]: {
      publicPlan: 'enterprise',
      allowedTools: ['smart_copywriter', 'negotiation_ai', 'competitor_analyzer', 'ad_improver', 'market_suggestion'],
      perToolDailyLimit: -1,
      totalDailyLimit: -1,
    },
  };

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Validate subscription access (including expiration) and consume one AI request
   * for the specified tool. Throws if not allowed or limit exceeded.
   */
  async consume(userId: string, tool: AiToolName): Promise<UsageCheckResult> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const policy = this.getPlanPolicy(user);

    if (policy.totalDailyLimit === 0) {
      throw new ForbiddenException('This feature requires an active Starter, Pro, or Elite subscription');
    }

    if (!policy.allowedTools.includes(tool)) {
      const upgradeMessage = this.ADVANCED_TOOLS.includes(tool)
        ? 'This tool requires a Pro or Elite subscription'
        : 'This tool is not available for your current plan';
      throw new ForbiddenException(upgradeMessage);
    }

    if (policy.publicPlan !== 'enterprise') {
      if (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) <= new Date()) {
        throw new ForbiddenException('Subscription expired or inactive');
      }
    }

    const todayKey = this.getTodayKey();
    const perToolKey = this.buildToolKey(userId, tool, todayKey);
    const totalKey = this.buildTotalKey(userId, todayKey);

    const [currentToolCount, currentTotalCount] = await Promise.all([
      this.redisService.getCounter(perToolKey),
      this.redisService.getCounter(totalKey),
    ]);

    const nextToolCount = currentToolCount + 1;
    const nextTotalCount = currentTotalCount + 1;

    if (
      policy.perToolDailyLimit !== -1 && nextToolCount > policy.perToolDailyLimit ||
      policy.totalDailyLimit !== -1 && nextTotalCount > policy.totalDailyLimit
    ) {
      throw new ForbiddenException({
        error: 'Daily AI usage limit reached',
        message: `Your ${policy.publicPlan} plan has reached its daily AI allowance for this tool`,
      });
    }

    await Promise.all([
      this.redisService.incr(perToolKey),
      this.redisService.incr(totalKey),
      this.redisService.expire(perToolKey, 24 * 60 * 60),
      this.redisService.expire(totalKey, 24 * 60 * 60),
    ]);

    const remainingDailyUsage = policy.totalDailyLimit === -1
      ? -1
      : Math.max(policy.totalDailyLimit - nextTotalCount, 0);

    return { remainingDailyUsage };
  }

  private getPlanPolicy(user: User): PlanUsagePolicy {
    const explicitPlan = user.plan ? this.PLAN_POLICIES[user.plan] : undefined;
    if (explicitPlan && user.plan !== SubscriptionPlan.FREE) {
      return explicitPlan;
    }

    switch (user.role) {
      case UserRole.ADMIN:
        return this.PLAN_POLICIES[SubscriptionPlan.ENTERPRISE];
      case UserRole.HOT:
        return this.PLAN_POLICIES[SubscriptionPlan.HOT_BUSINESS];
      case UserRole.PRO:
        return this.PLAN_POLICIES[SubscriptionPlan.PRO_BUSINESS];
      case UserRole.PREMIUM:
        return this.PLAN_POLICIES[SubscriptionPlan.PREMIUM];
      default:
        return this.PLAN_POLICIES[SubscriptionPlan.FREE];
    }
  }

  private getTodayKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private buildToolKey(userId: string, tool: AiToolName, dateKey: string): string {
    return `ai-usage:${userId}:${tool}:${dateKey}`;
  }

  private buildTotalKey(userId: string, dateKey: string): string {
    return `ai-usage:${userId}:total:${dateKey}`;
  }
}
