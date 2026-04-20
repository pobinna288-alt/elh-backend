import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionService } from './services/subscription.service';

/**
 * NegotiationAiScheduler
 *
 * Cron-based scheduler for:
 * 1. Subscription expiry handling (midnight daily)
 * 2. Daily usage reset is automatic — new day = new usage_date record
 *
 * History is preserved (never deleted).
 */
@Injectable()
export class NegotiationAiScheduler {
  private readonly logger = new Logger(NegotiationAiScheduler.name);

  constructor(
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * Runs every midnight server time.
   * Checks for expired subscriptions and downgrades them to free.
   *
   * Daily usage reset is handled automatically:
   * - When a new day starts, `getOrCreateTodayUsage()` creates a fresh record
   *   with usage_count = 0 for the new date.
   * - Old records are preserved for history/analytics.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyTasks() {
    this.logger.log('Running midnight cron: checking expired subscriptions...');

    try {
      const expiredCount =
        await this.subscriptionService.handleExpiredSubscriptions();

      this.logger.log(
        `Midnight cron complete. Expired subscriptions processed: ${expiredCount}`,
      );
    } catch (error) {
      this.logger.error(
        `Midnight cron failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Optional: Run every 6 hours as a safety net to catch
   * any subscriptions that may have been missed at midnight.
   */
  @Cron('0 */6 * * *')
  async handleExpiryCheck() {
    this.logger.debug('Running 6-hour expiry safety check...');

    try {
      const expiredCount =
        await this.subscriptionService.handleExpiredSubscriptions();

      if (expiredCount > 0) {
        this.logger.warn(
          `Safety check found ${expiredCount} expired subscriptions (missed by midnight cron)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Expiry safety check failed: ${error.message}`,
        error.stack,
      );
    }
  }
}
