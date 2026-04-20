import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { User, SubscriptionPlan, UserRole } from '../../users/entities/user.entity';
import { UsageLimiterService } from './usage-limiter.service';

/**
 * SubscriptionService
 *
 * Handles subscription activation, expiry checks, and plan management.
 * Automatically unlocks Negotiation AI when a qualifying plan is activated.
 */
@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  /** Plans that have Negotiation AI access */
  private readonly AI_ENABLED_PLANS: SubscriptionPlan[] = [
    SubscriptionPlan.PREMIUM,
    SubscriptionPlan.PRO_BUSINESS,
    SubscriptionPlan.HOT_BUSINESS,
    SubscriptionPlan.ENTERPRISE,
  ];

  /** Map plan to user role */
  private readonly PLAN_ROLE_MAP: Record<string, UserRole> = {
    [SubscriptionPlan.FREE]: UserRole.USER,
    [SubscriptionPlan.PREMIUM]: UserRole.PREMIUM,
    [SubscriptionPlan.PRO_BUSINESS]: UserRole.PRO,
    [SubscriptionPlan.HOT_BUSINESS]: UserRole.HOT,
    [SubscriptionPlan.ENTERPRISE]: UserRole.ADMIN,
  };

  /** Default subscription duration in days */
  private readonly SUBSCRIPTION_DURATION_DAYS = 30;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly usageLimiterService: UsageLimiterService,
  ) {}

  /**
   * Activate subscription after successful payment (money OR coins).
   * Called by payment webhook/handler.
   *
   * - Updates user.plan
   * - Sets subscription_active = true
   * - Sets negotiation_ai_enabled = true (for qualifying plans)
   * - Sets subscription_expiry = now + 30 days
   * - Initializes today's AI usage record
   * - Available immediately (no logout/refresh needed)
   */
  async onSubscriptionActivated(
    userId: string,
    plan: SubscriptionPlan,
  ): Promise<{
    user: User;
    subscriptionExpiry: Date;
    negotiationAiEnabled: boolean;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!this.isValidPaidPlan(plan)) {
      throw new BadRequestException(
        `Invalid plan: ${plan}. Must be one of: premium, pro_business, hot_business, enterprise`,
      );
    }

    // Calculate expiry: extend if currently active, otherwise from now
    const now = new Date();
    const baseDate =
      user.subscriptionActive && user.subscriptionExpiry && new Date(user.subscriptionExpiry) > now
        ? new Date(user.subscriptionExpiry)
        : now;

    const expiryDate = new Date(baseDate);
    expiryDate.setDate(expiryDate.getDate() + this.SUBSCRIPTION_DURATION_DAYS);

    // Update user fields
    user.plan = plan;
    user.subscriptionActive = true;
    user.subscriptionExpiry = expiryDate;
    user.negotiationAiEnabled = this.AI_ENABLED_PLANS.includes(plan);

    // Also update the role to match the plan
    const newRole = this.PLAN_ROLE_MAP[plan];
    if (newRole) {
      user.role = newRole;
    }

    // Update premiumExpiresAt for backward compatibility
    user.premiumExpiresAt = expiryDate;

    await this.userRepository.save(user);

    // Initialize today's usage record so it's ready immediately
    await this.usageLimiterService.getOrCreateTodayUsage(userId);

    this.logger.log(
      `Subscription activated: user=${userId}, plan=${plan}, expires=${expiryDate.toISOString()}, ai_enabled=${user.negotiationAiEnabled}`,
    );

    return {
      user,
      subscriptionExpiry: expiryDate,
      negotiationAiEnabled: user.negotiationAiEnabled,
    };
  }

  /**
   * Check if a plan qualifies for Negotiation AI.
   */
  planHasNegotiationAi(plan: SubscriptionPlan): boolean {
    return this.AI_ENABLED_PLANS.includes(plan);
  }

  /**
   * Validate that a plan is a paid subscription plan.
   */
  isValidPaidPlan(plan: SubscriptionPlan): boolean {
    return this.AI_ENABLED_PLANS.includes(plan);
  }

  /**
   * Handle expired subscriptions.
   * Called by the cron job at midnight.
   *
   * When subscription_expiry < current_date:
   *   - subscription_active = false
   *   - negotiation_ai_enabled = false
   *   - downgrade plan to "free"
   *   - role to USER
   */
  async handleExpiredSubscriptions(): Promise<number> {
    const now = new Date();

    const expiredUsers = await this.userRepository.find({
      where: {
        subscriptionActive: true,
        subscriptionExpiry: LessThan(now),
      },
    });

    if (expiredUsers.length === 0) {
      this.logger.debug('No expired subscriptions found');
      return 0;
    }

    for (const user of expiredUsers) {
      user.subscriptionActive = false;
      user.negotiationAiEnabled = false;
      user.plan = SubscriptionPlan.FREE;
      user.role = UserRole.USER;

      this.logger.warn(
        `Subscription expired for user ${user.id} (${user.email}). Downgraded to free.`,
      );
    }

    await this.userRepository.save(expiredUsers);

    this.logger.log(`Processed ${expiredUsers.length} expired subscriptions`);
    return expiredUsers.length;
  }

  /**
   * Get subscription status for a user.
   */
  async getSubscriptionStatus(userId: string): Promise<{
    plan: SubscriptionPlan;
    subscriptionActive: boolean;
    subscriptionExpiry: Date | null;
    negotiationAiEnabled: boolean;
    isExpired: boolean;
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'plan', 'subscriptionActive', 'subscriptionExpiry', 'negotiationAiEnabled'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isExpired = user.subscriptionExpiry
      ? new Date(user.subscriptionExpiry) < new Date()
      : false;

    // Auto-handle expiry if discovered during status check
    if (isExpired && user.subscriptionActive) {
      user.subscriptionActive = false;
      user.negotiationAiEnabled = false;
      user.plan = SubscriptionPlan.FREE;
      user.role = UserRole.USER;
      await this.userRepository.save(user);

      this.logger.warn(`User ${userId} subscription expired during status check. Downgraded.`);
    }

    return {
      plan: user.plan,
      subscriptionActive: user.subscriptionActive,
      subscriptionExpiry: user.subscriptionExpiry,
      negotiationAiEnabled: user.negotiationAiEnabled,
      isExpired,
    };
  }
}
