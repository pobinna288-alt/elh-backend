import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, And, DataSource } from 'typeorm';
import { AdView } from './entities/ad-view.entity';
import { CoinTransaction, CoinTransactionType } from './entities/coin-transaction.entity';
import { CoinBoostEvent } from './entities/coin-boost-event.entity';
import { User } from '../users/entities/user.entity';
import { Ad } from '../ads/entities/ad.entity';
import {
  AdProgressDto,
  AdProgressResponseDto,
  WatchSessionResponseDto,
  AdCompletionResponseDto,
  WatchStatsResponseDto,
} from './dto/ad-watch.dto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Tier configuration for coin rewards
 * Backend enforces these limits strictly - frontend values are never trusted
 */
const TIER_CONFIG = {
  NORMAL: {
    maxVideoLength: 120, // 2 minutes
    maxCoins: 10,
  },
  PREMIUM: {
    maxVideoLength: 180, // 3 minutes
    maxCoins: 50,
  },
  PRO: {
    maxVideoLength: 300, // 5 minutes
    maxCoins: 120,
  },
  HOT: {
    maxVideoLength: 600, // 10 minutes
    maxCoins: 225,
  },
};

const DAILY_COIN_LIMIT_BY_TIER = {
  NORMAL: 50,
  PREMIUM: 50,
  PRO: 120,
  HOT: 225,
};

/**
 * Milestone reward percentages
 * Coins unlock progressively as the video plays
 */
const MILESTONE_PERCENTAGES = {
  25: 0.2,  // 20% of max coins at 25%
  50: 0.5,  // 50% of max coins at 50%
  75: 0.7,  // 70% of max coins at 75%
  100: 1.0, // 100% of max coins at 100%
};

/**
 * Anti-cheat configuration
 */
const ANTI_CHEAT_CONFIG = {
  // Minimum time ratio required (actual time / expected time)
  MIN_WATCH_TIME_RATIO: 0.8,
  // Maximum progress jump allowed per update (percentage points)
  MAX_PROGRESS_JUMP: 30,
  // Minimum interval between progress updates (seconds)
  MIN_UPDATE_INTERVAL: 2,
  // Fallback daily coin limit per user (tier-specific limits are enforced below)
  DAILY_COIN_LIMIT: 50,
  // Maximum views per ad per day (to prevent farming)
  MAX_AD_VIEWS_PER_DAY: 100,
};

@Injectable()
export class AdWatchService {
  private readonly logger = new Logger(AdWatchService.name);

  constructor(
    @InjectRepository(AdView)
    private readonly adViewRepository: Repository<AdView>,
    @InjectRepository(CoinTransaction)
    private readonly coinTransactionRepository: Repository<CoinTransaction>,
    @InjectRepository(CoinBoostEvent)
    private readonly boostEventRepository: Repository<CoinBoostEvent>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Ad)
    private readonly adRepository: Repository<Ad>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Start a new watch session for an ad
   */
  async startWatchSession(
    userId: string,
    adId: string,
  ): Promise<WatchSessionResponseDto> {
    // Validate user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate ad exists and get details
    const ad = await this.adRepository.findOne({
      where: { id: adId, isActive: true },
      relations: ['author'],
    });
    if (!ad) {
      throw new NotFoundException('Ad not found or inactive');
    }

    // Prevent users from watching their own ads
    if (ad.authorId === userId) {
      throw new ForbiddenException('Cannot earn coins from your own ads');
    }

    // Get ad owner's tier
    const tier = this.getAdTier(ad);
    const tierConfig = TIER_CONFIG[tier];

    // Check if user already completed this ad
    const existingView = await this.adViewRepository.findOne({
      where: { userId, adId },
    });

    if (existingView?.completed) {
      throw new BadRequestException('You have already completed watching this ad');
    }

    // Create or update view record
    if (!existingView) {
      const newView = this.adViewRepository.create({
        userId,
        adId,
        watchPercent: 0,
        sessionStartTime: new Date(),
      });
      await this.adViewRepository.save(newView);
    } else {
      existingView.sessionStartTime = new Date();
      await this.adViewRepository.save(existingView);
    }

    // Check for active boost events
    const boostEvent = await this.getActiveBoostEvent(tier);

    // Calculate milestone rewards
    const milestoneRewards = this.calculateMilestoneRewards(tierConfig.maxCoins);

    return {
      success: true,
      sessionId: uuidv4(),
      adId,
      tier,
      videoDuration: ad.videoDuration || tierConfig.maxVideoLength,
      maxCoins: tierConfig.maxCoins,
      milestoneRewards,
      boostEvent: boostEvent
        ? {
            name: boostEvent.name,
            multiplier: Number(boostEvent.multiplier),
            endsAt: boostEvent.endTime,
          }
        : undefined,
    };
  }

  /**
   * Process ad watch progress and grant milestone rewards
   */
  async processAdProgress(
    userId: string,
    dto: AdProgressDto,
  ): Promise<AdProgressResponseDto> {
    const { adId, watchPercent, watchTimeSeconds } = dto;

    // Validate user
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate ad
    const ad = await this.adRepository.findOne({
      where: { id: adId },
      relations: ['author'],
    });
    if (!ad) {
      throw new NotFoundException('Ad not found');
    }

    // Prevent self-watching
    if (ad.authorId === userId) {
      throw new ForbiddenException('Cannot earn coins from your own ads');
    }

    // Get or create view record
    let view = await this.adViewRepository.findOne({
      where: { userId, adId },
    });

    if (!view) {
      view = this.adViewRepository.create({
        userId,
        adId,
        watchPercent: 0,
        sessionStartTime: new Date(),
      });
    }

    // Check if already completed
    if (view.completed) {
      return {
        success: true,
        watchPercent: 100,
        coinsEarned: 0,
        totalCoinsFromAd: view.totalCoinsEarned,
        newBalance: user.coins,
        completed: true,
        milestonesReached: [25, 50, 75, 100],
        message: 'Ad already completed',
      };
    }

    // Anti-cheat validation
    await this.validateWatchProgress(view, watchPercent, watchTimeSeconds, ad);

    // Get tier configuration
    const tier = this.getAdTier(ad);
    const tierConfig = TIER_CONFIG[tier];
    const maxCoins = tierConfig.maxCoins;

    // Check for active boost
    const boostEvent = await this.getActiveBoostEvent(tier);
    const multiplier = boostEvent ? Number(boostEvent.multiplier) : 1.0;

    // Process milestones and calculate rewards
    const { coinsEarned, milestonesReached } = await this.processMilestones(
      view,
      watchPercent,
      maxCoins,
      multiplier,
    );

    // Update view record
    view.watchPercent = watchPercent;
    view.lastProgressTime = new Date();
    if (watchTimeSeconds) {
      view.watchTimeSeconds = watchTimeSeconds;
    }

    // Check if completed
    const isCompleted = watchPercent >= 100;
    if (isCompleted) {
      view.completed = true;
    }

    // Use transaction for atomic coin updates
    let newBalance = user.coins;
    if (coinsEarned > 0) {
      newBalance = await this.grantCoins(
        userId,
        adId,
        coinsEarned,
        milestonesReached,
        multiplier,
        boostEvent?.id,
      );
    }

    // Save view progress
    await this.adViewRepository.save(view);

    // Update daily streak if completed
    if (isCompleted) {
      await this.updateWatchStreak(userId);
    }

    this.logger.log(
      `User ${userId} progress on ad ${adId}: ${watchPercent}% - Earned ${coinsEarned} coins`,
    );

    return {
      success: true,
      watchPercent,
      coinsEarned,
      totalCoinsFromAd: view.totalCoinsEarned + coinsEarned,
      newBalance,
      completed: isCompleted,
      milestonesReached,
      boostMultiplier: multiplier > 1 ? multiplier : undefined,
      message: isCompleted
        ? 'Congratulations! Ad completed!'
        : milestonesReached.length > 0
        ? `Milestone${milestonesReached.length > 1 ? 's' : ''} reached: ${milestonesReached.join(', ')}%`
        : 'Progress saved',
    };
  }

  /**
   * Get user's watch statistics
   */
  async getWatchStats(userId: string): Promise<WatchStatsResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Count total ads watched
    const totalAdsWatched = await this.adViewRepository.count({
      where: { userId },
    });

    // Count completed ads
    const adsCompleted = await this.adViewRepository.count({
      where: { userId, completed: true },
    });

    // Calculate coins earned today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const coinsEarnedToday = await this.coinTransactionRepository
      .createQueryBuilder('tx')
      .select('SUM(tx.coins)', 'total')
      .where('tx.userId = :userId', { userId })
      .andWhere('tx.createdAt >= :today', { today })
      .getRawOne();

    // Get active boost event
    const boostEvent = await this.getActiveBoostEvent();
    const userTier = this.getUserWatchTier(user);
    const dailyLimit = DAILY_COIN_LIMIT_BY_TIER[userTier] || ANTI_CHEAT_CONFIG.DAILY_COIN_LIMIT;

    return {
      userId,
      coinBalance: user.coins,
      totalAdsWatched,
      adsCompleted,
      watchStreak: user.streakDays,
      coinsEarnedToday: Number(coinsEarnedToday?.total || 0),
      dailyCoinLimit: dailyLimit,
      activeBoostEvent: boostEvent
        ? {
            name: boostEvent.name,
            multiplier: Number(boostEvent.multiplier),
            endsAt: boostEvent.endTime,
          }
        : undefined,
    };
  }

  /**
   * Get ad completion status
   */
  async getAdCompletionStatus(
    userId: string,
    adId: string,
  ): Promise<AdCompletionResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const view = await this.adViewRepository.findOne({
      where: { userId, adId },
    });

    if (!view) {
      return {
        status: 'in_progress',
        coinsEarned: 0,
        newBalance: user.coins,
        watchStreak: user.streakDays,
      };
    }

    return {
      status: view.completed ? 'completed' : 'in_progress',
      coinsEarned: view.totalCoinsEarned,
      newBalance: user.coins,
      watchStreak: user.streakDays,
    };
  }

  // ==========================================
  // PRIVATE HELPER METHODS
  // ==========================================

  /**
   * Determine ad tier based on ad owner's subscription
   */
  private getAdTier(ad: Ad): keyof typeof TIER_CONFIG {
    // Determine tier from ad's premium status or owner's plan
    if (ad.isPremium) {
      // Check video duration to determine tier
      const duration = ad.videoDuration || 0;
      if (duration <= 120) return 'NORMAL';
      if (duration <= 180) return 'PREMIUM';
      if (duration <= 300) return 'PRO';
      return 'HOT';
    }
    return 'NORMAL';
  }

  private getUserWatchTier(user: User): keyof typeof TIER_CONFIG {
    const plan = `${user.plan || ''}`.toLowerCase();
    const role = `${user.role || ''}`.toLowerCase();

    if (plan === 'hot_business' || plan === 'hot' || role === 'hot') {
      return 'HOT';
    }

    if (plan === 'pro_business' || plan === 'pro' || role === 'pro') {
      return 'PRO';
    }

    if (plan === 'premium' || role === 'premium') {
      return 'PREMIUM';
    }

    return 'NORMAL';
  }

  /**
   * Calculate milestone rewards for a given max coin amount
   */
  private calculateMilestoneRewards(maxCoins: number): {
    '25': number;
    '50': number;
    '75': number;
    '100': number;
  } {
    return {
      '25': Math.floor(maxCoins * 0.2),
      '50': Math.floor(maxCoins * 0.5) - Math.floor(maxCoins * 0.2),
      '75': Math.floor(maxCoins * 0.7) - Math.floor(maxCoins * 0.5),
      '100': maxCoins - Math.floor(maxCoins * 0.7),
    };
  }

  /**
   * Process reached milestones and calculate coins earned
   */
  private async processMilestones(
    view: AdView,
    watchPercent: number,
    maxCoins: number,
    multiplier: number,
  ): Promise<{ coinsEarned: number; milestonesReached: number[] }> {
    let totalCoins = 0;
    const milestonesReached: number[] = [];

    // Calculate cumulative coin values at each milestone
    const milestone25Coins = Math.floor(maxCoins * 0.2);
    const milestone50Coins = Math.floor(maxCoins * 0.5);
    const milestone75Coins = Math.floor(maxCoins * 0.7);
    const milestone100Coins = maxCoins;

    // Check 25% milestone
    if (watchPercent >= 25 && !view.milestone25) {
      const coins = Math.floor(milestone25Coins * multiplier);
      totalCoins += coins;
      view.milestone25 = true;
      milestonesReached.push(25);
    }

    // Check 50% milestone
    if (watchPercent >= 50 && !view.milestone50) {
      const coins = Math.floor((milestone50Coins - milestone25Coins) * multiplier);
      totalCoins += coins;
      view.milestone50 = true;
      milestonesReached.push(50);
    }

    // Check 75% milestone
    if (watchPercent >= 75 && !view.milestone75) {
      const coins = Math.floor((milestone75Coins - milestone50Coins) * multiplier);
      totalCoins += coins;
      view.milestone75 = true;
      milestonesReached.push(75);
    }

    // Check 100% milestone
    if (watchPercent >= 100 && !view.milestone100) {
      const coins = Math.floor((milestone100Coins - milestone75Coins) * multiplier);
      totalCoins += coins;
      view.milestone100 = true;
      milestonesReached.push(100);
    }

    return { coinsEarned: totalCoins, milestonesReached };
  }

  /**
   * Grant coins to user atomically with transaction logging
   */
  private async grantCoins(
    userId: string,
    adId: string,
    coins: number,
    milestones: number[],
    multiplier: number,
    boostEventId?: string,
  ): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check daily coin limit
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dailyEarnings = await queryRunner.manager
        .createQueryBuilder(CoinTransaction, 'tx')
        .select('COALESCE(SUM(tx.coins), 0)', 'total')
        .where('tx.userId = :userId', { userId })
        .andWhere('tx.createdAt >= :today', { today })
        .getRawOne();

      const currentDailyTotal = Number(dailyEarnings?.total || 0);
      const ad = await queryRunner.manager.findOne(Ad, { where: { id: adId } });
      const tier = ad ? this.getAdTier(ad) : 'NORMAL';
      const tierDailyLimit = DAILY_COIN_LIMIT_BY_TIER[tier] || ANTI_CHEAT_CONFIG.DAILY_COIN_LIMIT;
      const remainingDailyLimit = tierDailyLimit - currentDailyTotal;

      if (remainingDailyLimit <= 0) {
        await queryRunner.rollbackTransaction();
        throw new ForbiddenException('Daily coin limit reached');
      }

      // Cap coins at remaining daily limit
      const actualCoins = Math.min(coins, remainingDailyLimit);

      // Update user balance atomically
      await queryRunner.manager
        .createQueryBuilder()
        .update(User)
        .set({ coins: () => `coins + ${actualCoins}` })
        .where('id = :userId', { userId })
        .execute();

      // Update ad view total
      await queryRunner.manager
        .createQueryBuilder()
        .update(AdView)
        .set({ totalCoinsEarned: () => `"totalCoinsEarned" + ${actualCoins}` })
        .where('userId = :userId AND adId = :adId', { userId, adId })
        .execute();

      // Log transaction for each milestone
      for (const milestone of milestones) {
        const milestoneCoins = this.getMilestoneCoins(milestone, coins, milestones);
        const transaction = queryRunner.manager.create(CoinTransaction, {
          userId,
          adId,
          coins: milestoneCoins,
          type: boostEventId
            ? CoinTransactionType.BOOST_EVENT_REWARD
            : CoinTransactionType.AD_WATCH_REWARD,
          description: `Ad watch milestone ${milestone}% reward${
            multiplier > 1 ? ` (${multiplier}x boost)` : ''
          }`,
          milestone,
          multiplier,
          boostEventId,
        });
        await queryRunner.manager.save(transaction);
      }

      // Update boost event stats if applicable
      if (boostEventId) {
        await queryRunner.manager
          .createQueryBuilder()
          .update(CoinBoostEvent)
          .set({ coinsDistributed: () => `"coinsDistributed" + ${actualCoins}` })
          .where('id = :id', { id: boostEventId })
          .execute();
      }

      await queryRunner.commitTransaction();

      // Get updated balance
      const updatedUser = await this.userRepository.findOne({
        where: { id: userId },
        select: ['coins'],
      });

      return updatedUser?.coins || 0;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Calculate coins for a specific milestone
   */
  private getMilestoneCoins(
    milestone: number,
    totalCoins: number,
    allMilestones: number[],
  ): number {
    // Distribute coins proportionally among reached milestones
    return Math.floor(totalCoins / allMilestones.length);
  }

  /**
   * Validate watch progress for anti-cheat
   */
  private async validateWatchProgress(
    view: AdView,
    newPercent: number,
    watchTimeSeconds: number | undefined,
    ad: Ad,
  ): Promise<void> {
    const now = new Date();

    // Rule 1: Progress must not decrease
    if (newPercent < view.watchPercent) {
      throw new BadRequestException('Watch progress cannot decrease');
    }

    // Rule 2: Check progress jump limit
    const progressJump = newPercent - view.watchPercent;
    if (progressJump > ANTI_CHEAT_CONFIG.MAX_PROGRESS_JUMP) {
      this.logger.warn(
        `Suspicious progress jump detected: ${progressJump}% for user ${view.userId}`,
      );
      throw new BadRequestException('Suspicious watch pattern detected');
    }

    // Rule 3: Check update interval
    if (view.lastProgressTime) {
      const timeSinceLastUpdate =
        (now.getTime() - view.lastProgressTime.getTime()) / 1000;
      if (timeSinceLastUpdate < ANTI_CHEAT_CONFIG.MIN_UPDATE_INTERVAL) {
        throw new BadRequestException('Progress updates too frequent');
      }
    }

    // Rule 4: Validate watch time against video duration
    if (watchTimeSeconds && ad.videoDuration) {
      const expectedTime = (newPercent / 100) * ad.videoDuration;
      const timeRatio = watchTimeSeconds / expectedTime;

      if (timeRatio < ANTI_CHEAT_CONFIG.MIN_WATCH_TIME_RATIO) {
        this.logger.warn(
          `Watch time mismatch for user ${view.userId}: expected ~${expectedTime}s, got ${watchTimeSeconds}s`,
        );
        throw new BadRequestException(
          'Watch time does not match video progress',
        );
      }
    }

    // Rule 5: Check for session validity
    if (view.sessionStartTime) {
      const sessionDuration = (now.getTime() - view.sessionStartTime.getTime()) / 1000;
      if (ad.videoDuration && newPercent >= 100) {
        const minExpectedDuration = ad.videoDuration * ANTI_CHEAT_CONFIG.MIN_WATCH_TIME_RATIO;
        if (sessionDuration < minExpectedDuration) {
          this.logger.warn(
            `Session too short for completion: ${sessionDuration}s < ${minExpectedDuration}s`,
          );
          throw new BadRequestException('Video completed too quickly');
        }
      }
    }
  }

  /**
   * Update user's daily watch streak
   */
  private async updateWatchStreak(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastWatch = user.lastStreakDate
      ? new Date(user.lastStreakDate)
      : null;

    if (lastWatch) {
      lastWatch.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor(
        (today.getTime() - lastWatch.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysDiff === 0) {
        // Already watched today, no streak update needed
        return;
      } else if (daysDiff === 1) {
        // Consecutive day - increase streak
        user.streakDays += 1;
      } else {
        // Streak broken - reset
        user.streakDays = 1;
      }
    } else {
      // First watch ever
      user.streakDays = 1;
    }

    user.lastStreakDate = today;
    await this.userRepository.save(user);

    // Grant streak bonus if applicable
    if (user.streakDays > 0 && user.streakDays % 7 === 0) {
      await this.grantStreakBonus(userId, user.streakDays);
    }
  }

  /**
   * Grant bonus coins for maintaining a streak
   */
  private async grantStreakBonus(
    userId: string,
    streakDays: number,
  ): Promise<void> {
    // Bonus: 10 coins per 7 days of streak (capped at 100)
    const bonusCoins = Math.min(Math.floor(streakDays / 7) * 10, 100);

    await this.dataSource.transaction(async (manager) => {
      // Update user balance
      await manager
        .createQueryBuilder()
        .update(User)
        .set({ coins: () => `coins + ${bonusCoins}` })
        .where('id = :userId', { userId })
        .execute();

      // Log transaction
      const transaction = manager.create(CoinTransaction, {
        userId,
        coins: bonusCoins,
        type: CoinTransactionType.STREAK_BONUS,
        description: `${streakDays}-day watch streak bonus`,
      });
      await manager.save(transaction);
    });

    this.logger.log(
      `Granted ${bonusCoins} streak bonus to user ${userId} for ${streakDays}-day streak`,
    );
  }

  /**
   * Get currently active boost event
   */
  private async getActiveBoostEvent(
    tier?: string,
  ): Promise<CoinBoostEvent | null> {
    const now = new Date();

    const queryBuilder = this.boostEventRepository
      .createQueryBuilder('event')
      .where('event.isActive = :isActive', { isActive: true })
      .andWhere('event.startTime <= :now', { now })
      .andWhere('event.endTime >= :now', { now });

    // Check if event has capacity remaining
    queryBuilder.andWhere(
      '(event.maxTotalCoins IS NULL OR event.coinsDistributed < event.maxTotalCoins)',
    );

    // Filter by tier if specified
    if (tier) {
      queryBuilder.andWhere(
        '(event.eligibleTiers IS NULL OR event.eligibleTiers LIKE :tier)',
        { tier: `%${tier}%` },
      );
    }

    return queryBuilder.getOne();
  }

  // ==========================================
  // ADMIN METHODS FOR BOOST EVENTS
  // ==========================================

  /**
   * Create a new coin boost event (Admin only)
   */
  async createBoostEvent(data: {
    name: string;
    description?: string;
    multiplier: number;
    startTime: Date;
    endTime: Date;
    eligibleTiers?: string[];
    maxTotalCoins?: number;
  }): Promise<CoinBoostEvent> {
    const event = this.boostEventRepository.create({
      ...data,
      isActive: true,
      coinsDistributed: 0,
    });
    return this.boostEventRepository.save(event);
  }

  /**
   * Deactivate a boost event (Admin only)
   */
  async deactivateBoostEvent(eventId: string): Promise<void> {
    await this.boostEventRepository.update(eventId, { isActive: false });
  }

  /**
   * Get all boost events
   */
  async getAllBoostEvents(): Promise<CoinBoostEvent[]> {
    return this.boostEventRepository.find({
      order: { startTime: 'DESC' },
    });
  }
}
