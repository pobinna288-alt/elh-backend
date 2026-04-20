import { Injectable, Logger, BadRequestException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { Database } from 'better-sqlite3';
import axios from 'axios';
import * as crypto from 'crypto';

interface VideoSession {
  sessionId: string;
  userId: string;
  adId: string;
  startTime: number;
  requiredDuration: number;
  rewardAmount: number;
  status: 'active' | 'completed' | 'expired';
  lastCheckpoint: number;
  lastCheckpointTime: number;
}

interface RewardRecord {
  id: string;
  sessionId: string;
  userId: string;
  amount: number;
  state: 'pending' | 'cleared' | 'suspicious' | 'reversed';
  earningReason: string;
  createdAt: Date;
  clearableAt: Date;
  clearedAt?: Date;
}

@Injectable()
export class FraudService {
  private readonly logger = new Logger('FraudService');
  private readonly REWARD_AMOUNT = 10;
  private readonly MAX_ADS_PER_HOUR = 5;
  private readonly MAX_ADS_PER_DAY = 30;
  private readonly MAX_DAILY_EARNINGS = 100;
  private readonly MAX_WITHDRAWAL_PER_DAY = 50;
  private readonly MIN_ACCOUNT_AGE_DAYS = 7;
  private readonly HOLDING_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private redis: RedisService,
    private config: ConfigService,
    private db: Database,
  ) {
    this.initializeDatabase();
  }

  private initializeDatabase() {
    // Create tables if they don't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ad_rewards (
        id TEXT PRIMARY KEY,
        session_id TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        amount REAL NOT NULL,
        state TEXT NOT NULL DEFAULT 'pending',
        earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        clearable_at DATETIME,
        cleared_at DATETIME,
        reversal_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_ad_rewards_user_id ON ad_rewards(user_id);
      CREATE INDEX IF NOT EXISTS idx_ad_rewards_state ON ad_rewards(state);
      CREATE INDEX IF NOT EXISTS idx_ad_rewards_earned_at ON ad_rewards(earned_at);

      CREATE TABLE IF NOT EXISTS reward_recoveries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        checkpoint INTEGER NOT NULL,
        reason TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS video_sessions (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        ad_id TEXT NOT NULL,
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'active',
        reward_amount REAL NOT NULL,
        last_checkpoint INTEGER DEFAULT 0,
        last_checkpoint_time DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_video_sessions_user_id ON video_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_video_sessions_status ON video_sessions(status);

      CREATE TABLE IF NOT EXISTS fraud_events (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT,
        metadata TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_fraud_events_user_id ON fraud_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_fraud_events_created_at ON fraud_events(created_at);

      CREATE TABLE IF NOT EXISTS daily_reconciliation (
        id TEXT PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        expected_coins REAL NOT NULL,
        actual_coins REAL NOT NULL,
        discrepancy REAL,
        status TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_flags (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        flag_type TEXT NOT NULL,
        reason TEXT,
        severity TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_user_flags_user_id ON user_flags(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_flags_resolved_at ON user_flags(resolved_at);

      CREATE TABLE IF NOT EXISTS device_blocks (
        fingerprint TEXT PRIMARY KEY,
        reason TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ip_blocks (
        ip_address TEXT PRIMARY KEY,
        reason TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  /**
   * Start a video ad session
   */
  async startAdSession(userId: string, adId: string): Promise<{ sessionId: string; temporaryToken: string }> {
    const sessionId = crypto.randomUUID();

    const session: VideoSession = {
      sessionId,
      userId,
      adId,
      startTime: Date.now(),
      requiredDuration: 30000, // 30 seconds
      rewardAmount: this.REWARD_AMOUNT,
      status: 'active',
      lastCheckpoint: 0,
      lastCheckpointTime: Date.now(),
    };

    // Store in Redis for fast access
    await this.redis.setex(`video-session:${sessionId}`, 600, JSON.stringify(session));

    // Persist to database
    const stmt = this.db.prepare(`
      INSERT INTO video_sessions (session_id, user_id, ad_id, reward_amount)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(sessionId, userId, adId, this.REWARD_AMOUNT);

    // Generate temporary token for session
    const temporaryToken = this.generateTemporaryToken(sessionId, userId);

    return { sessionId, temporaryToken };
  }

  /**
   * Save ad watch checkpoint
   */
  async saveCheckpoint(sessionId: string, progress: number): Promise<void> {
    // Update Redis
    const sessionData = await this.redis.get(`video-session:${sessionId}`);
    if (sessionData) {
      const session = JSON.parse(sessionData) as VideoSession;
      session.lastCheckpoint = progress;
      session.lastCheckpointTime = Date.now();
      await this.redis.setex(`video-session:${sessionId}`, 600, JSON.stringify(session));
    }

    // Update database
    const stmt = this.db.prepare(`
      UPDATE video_sessions 
      SET last_checkpoint = ?, last_checkpoint_time = CURRENT_TIMESTAMP
      WHERE session_id = ?
    `);
    stmt.run(progress, sessionId);
  }

  /**
   * Complete ad watch and request reward
   */
  async completeAd(
    sessionId: string,
    userId: string,
    data: any,
    ip: string,
    userAgent: string,
  ): Promise<{
    success: boolean;
    coinsEarned?: number;
    message: string;
    recovered?: boolean;
    withdrawableBalance?: number;
  }> {
    // Check circuit breaker first
    await this.checkCircuitBreaker();

    // Run all validations in parallel
    const validationResults = await Promise.allSettled([
      this.validateSession(sessionId, userId),
      this.validateTiming(sessionId),
      this.validateDeviceReputation(data.deviceFingerprint),
      this.validateIPReputation(ip),
      this.validateUserHistory(userId),
      this.checkDailyLimits(userId),
      this.checkVelocityLimits(userId),
      this.validateAdProvider(data.adId, sessionId),
    ]);

    // Collect failures
    const failures = validationResults
      .map((result, index) => (result.status === 'rejected' ? result.reason : null))
      .filter((err): err is Error => err !== null);

    if (failures.length > 0) {
      await this.logFraudEvent(userId, 'validation-failed', 'HIGH', failures.map(f => f.message).join('; '), ip, userAgent);

      // Critical failures = immediate ban
      if (failures.some(f => f.message.includes('device-banned') || f.message.includes('ip-banned'))) {
        await this.immediatelyBanUser(userId, 'fraud-detected', ip);
        throw new ForbiddenException('Account suspended');
      }

      throw new BadRequestException('Reward validation failed');
    }

    // Check for recovery scenario
    const recovery = await this.checkRecoveryEligible(sessionId);
    if (recovery && recovery.eligible) {
      return await this.grantRewardWithRecovery(recovery.session, userId);
    }

    // Normal completion flow
    return await this.grantPendingReward(sessionId, userId, ip, userAgent);
  }

  /**
   * Grant reward with holding period
   */
  private async grantPendingReward(sessionId: string, userId: string, ip: string, userAgent: string): Promise<any> {
    const lockKey = `ad-lock:${sessionId}`;
    const completedKey = `ad-completed:${sessionId}`;

    // Check if already completed
    const alreadyCompleted = await this.redis.get(completedKey);
    if (alreadyCompleted) {
      const result = JSON.parse(alreadyCompleted);
      return { ...result, duplicate: true, message: 'Reward already granted' };
    }

    // Distributed lock
    const lock = await this.redis.setnx(`${lockKey}`, '1');
    if (!lock) {
      // Wait for concurrent request to finish
      await this.waitForCompletion(completedKey, 5000);
      const result = await this.redis.get(completedKey);
      return result ? JSON.parse(result) : { success: false, message: 'Timeout' };
    }

    try {
      await this.redis.expire(lockKey, 10);

      const sessionData = await this.redis.get(`video-session:${sessionId}`);
      if (!sessionData) {
        throw new BadRequestException('Session not found');
      }

      const session = JSON.parse(sessionData) as VideoSession;

      // Create pending reward with transaction
      const rewardId = crypto.randomUUID();
      const clearableAt = new Date(Date.now() + this.HOLDING_PERIOD_MS);

      const stmt = this.db.prepare(`
        INSERT INTO ad_rewards (id, session_id, user_id, amount, state, clearable_at)
        VALUES (?, ?, ?, ?, 'pending', ?)
      `);
      stmt.run(rewardId, sessionId, userId, this.REWARD_AMOUNT, clearableAt.toISOString());

      // Update pending balance (not withdrawable yet)
      const updateStmt = this.db.prepare(`
        UPDATE users SET pending_coins = pending_coins + ? WHERE id = ?
      `);
      updateStmt.run(this.REWARD_AMOUNT, userId);

      const result = {
        success: true,
        coinsEarned: this.REWARD_AMOUNT,
        state: 'pending',
        message: 'Coins will be available for withdrawal in 24 hours',
        withdrawableBalance: await this.getWithdrawableBalance(userId),
      };

      // Cache result
      await this.redis.setex(completedKey, 3600, JSON.stringify(result));

      // Clean up
      await this.redis.del(`video-session:${sessionId}`);
      await this.redis.del(lockKey);

      // Log success
      await this.logFraudEvent(userId, 'ad-completed', 'LOW', 'Normal completion', ip, userAgent);

      return result;
    } catch (error) {
      await this.redis.del(lockKey);
      throw error;
    }
  }

  /**
   * Grant reward with recovery (session was mostly complete)
   */
  private async grantRewardWithRecovery(session: any, userId: string): Promise<any> {
    const recoveryId = crypto.randomUUID();

    const stmt = this.db.prepare(`
      INSERT INTO reward_recoveries (id, user_id, session_id, checkpoint, reason)
      VALUES (?, ?, ?, ?, 'network-drop')
    `);
    stmt.run(recoveryId, userId, session.session_id, session.last_checkpoint);

    // Grant immediately
    const rewardId = crypto.randomUUID();
    const rewardStmt = this.db.prepare(`
      INSERT INTO ad_rewards (id, session_id, user_id, amount, state, clearable_at)
      VALUES (?, ?, ?, ?, 'cleared', CURRENT_TIMESTAMP)
    `);
    rewardStmt.run(rewardId, session.session_id, userId, this.REWARD_AMOUNT);

    // Update withdrawable balance directly
    const updateStmt = this.db.prepare(`
      UPDATE users SET withdrawable_coins = withdrawable_coins + ? WHERE id = ?
    `);
    updateStmt.run(this.REWARD_AMOUNT, userId);

    this.logger.log(`Recovered reward for user ${userId} - checkpoint: ${session.last_checkpoint}`);

    return {
      success: true,
      recovered: true,
      coinsEarned: this.REWARD_AMOUNT,
      message: 'We detected you completed the video. Reward granted!',
      withdrawableBalance: await this.getWithdrawableBalance(userId),
    };
  }

  /**
   * Validate session exists and belongs to user
   */
  private async validateSession(sessionId: string, userId: string): Promise<void> {
    let sessionData = await this.redis.get(`video-session:${sessionId}`);
    let session: any;

    if (!sessionData) {
      const stmt = this.db.prepare('SELECT * FROM video_sessions WHERE session_id = ? LIMIT 1');
      const dbSession = stmt.get(sessionId) as any;

      if (!dbSession) {
        throw new Error('session-not-found');
      }

      session = dbSession;
    } else {
      session = JSON.parse(sessionData);
    }

    if (session.user_id !== userId) {
      throw new Error('session-user-mismatch');
    }
  }

  /**
   * Validate watch duration
   */
  private async validateTiming(sessionId: string): Promise<void> {
    const sessionData = await this.redis.get(`video-session:${sessionId}`);
    if (!sessionData) {
      const stmt = this.db.prepare('SELECT * FROM video_sessions WHERE session_id = ? LIMIT 1');
      const session = stmt.get(sessionId) as any;
      if (!session) throw new Error('session-not-found');
      return;
    }

    const session = JSON.parse(sessionData) as VideoSession;
    const watchDuration = Date.now() - session.startTime;

    if (watchDuration < session.requiredDuration * 0.95) {
      throw new Error('insufficient-watch-duration');
    }
  }

  /**
   * Check device reputation
   */
  private async validateDeviceReputation(deviceFingerprint: string): Promise<void> {
    if (!deviceFingerprint) return;

    // Check if device is blacklisted
    const blocked = await this.redis.get(`device-blocked:${deviceFingerprint}`);
    if (blocked) {
      throw new Error('device-banned');
    }

    // Check database
    const stmt = this.db.prepare('SELECT * FROM device_blocks WHERE fingerprint = ? LIMIT 1');
    const deviceBlock = stmt.get(deviceFingerprint);
    if (deviceBlock) {
      throw new Error('device-banned');
    }
  }

  /**
   * Check IP reputation
   */
  private async validateIPReputation(ip: string): Promise<void> {
    // Check blacklist
    const blocked = await this.redis.get(`ip-blocked:${ip}`);
    if (blocked) {
      throw new Error('ip-banned');
    }

    const stmt = this.db.prepare('SELECT * FROM ip_blocks WHERE ip_address = ? LIMIT 1');
    const ipBlock = stmt.get(ip);
    if (ipBlock) {
      throw new Error('ip-banned');
    }

    // Check rate limits per IP
    const today = new Date().toISOString().split('T')[0];
    const ipKey = `rate:ip:${ip}:${today}`;
    const count = await this.redis.incr(ipKey);
    await this.redis.expire(ipKey, 86400);

    if (count > 100) { // Max 100 ads from single IP per day
      throw new Error('ip-rate-limit-exceeded');
    }
  }

  /**
   * Check user history for fraud patterns
   */
  private async validateUserHistory(userId: string): Promise<void> {
    // Check if user is banned
    const userStmt = this.db.prepare('SELECT banned FROM users WHERE id = ? LIMIT 1');
    const user = userStmt.get(userId) as any;

    if (user?.banned) {
      throw new Error('user-banned');
    }

    // Check recent fraud flags
    const flagStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM user_flags 
      WHERE user_id = ? AND severity = 'HIGH' AND resolved_at IS NULL
    `);
    const flags = flagStmt.get(userId) as any;

    if (flags.count > 0) {
      throw new Error('user-flagged-for-fraud');
    }
  }

  /**
   * Check daily earning limits
   */
  private async checkDailyLimits(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Get today's stats
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as ads_count, SUM(amount) as total_earned
      FROM ad_rewards
      WHERE user_id = ? AND DATE(earned_at) = ? AND state IN ('pending', 'cleared')
    `);
    const stats = stmt.get(userId, today) as any;

    if ((stats.ads_count || 0) >= this.MAX_ADS_PER_DAY) {
      throw new Error('daily-ad-limit-exceeded');
    }

    if ((stats.total_earned || 0) >= this.MAX_DAILY_EARNINGS) {
      throw new Error('daily-earning-limit-exceeded');
    }

    // Check account age
    const userStmt = this.db.prepare('SELECT created_at FROM users WHERE id = ? LIMIT 1');
    const user = userStmt.get(userId) as any;

    if (user) {
      const accountAge = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24);

      if (accountAge < 1 && (stats.ads_count || 0) > 5) {
        throw new Error('new-account-limit');
      }
    }
  }

  /**
   * Detect bot-like velocity patterns
   */
  private async checkVelocityLimits(userId: string): Promise<void> {
    const hourAgo = new Date(Date.now() - 3600000).toISOString();

    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM video_sessions
      WHERE user_id = ? AND start_time > ?
    `);
    const result = stmt.get(userId, hourAgo) as any;

    if (result.count >= this.MAX_ADS_PER_HOUR) {
      throw new Error('velocity-limit-exceeded');
    }

    // Check interval consistency
    const recentStmt = this.db.prepare(`
      SELECT start_time FROM video_sessions
      WHERE user_id = ? 
      ORDER BY start_time DESC
      LIMIT 10
    `);
    const sessions = recentStmt.all(userId) as any[];

    if (sessions.length >= 5) {
      const intervals = [];
      for (let i = 1; i < sessions.length; i++) {
        intervals.push(new Date(sessions[i - 1].start_time).getTime() - new Date(sessions[i].start_time).getTime());
      }

      const variance = this.calculateVariance(intervals);
      if (variance < 10000) { // Very consistent = bot
        throw new Error('bot-like-behavior');
      }
    }
  }

  /**
   * Verify with ad provider
   */
  private async validateAdProvider(adId: string, sessionId: string): Promise<void> {
    try {
      const response = await axios.post(
        `${this.config.get('AD_PROVIDER_API')}/verify`,
        {
          adId,
          sessionId,
          apiKey: this.config.get('AD_PROVIDER_API_KEY'),
        },
        { timeout: 5000 },
      );

      if (!response.data.verified) {
        throw new Error('ad-verification-failed');
      }

      if (response.data.rewardClaimed) {
        throw new Error('reward-already-claimed');
      }

      // Verify timing
      const watchDuration = response.data.watchDuration || 0;
      const requiredDuration = response.data.requiredDuration || 30000;

      if (watchDuration < requiredDuration * 0.95) {
        throw new Error('insufficient-watch-duration');
      }
    } catch (error) {
      this.logger.warn(`Ad provider verification failed: ${error.message}`);
      throw new Error('ad-verification-failed');
    }
  }

  /**
   * Check if session is eligible for recovery
   */
  private async checkRecoveryEligible(sessionId: string): Promise<{ eligible: boolean; session?: any }> {
    const stmt = this.db.prepare(`
      SELECT * FROM video_sessions 
      WHERE session_id = ? AND last_checkpoint >= 90 
      AND datetime(last_checkpoint_time) > datetime('now', '-5 minutes')
      LIMIT 1
    `);
    const session = stmt.get(sessionId);

    return {
      eligible: !!session,
      session: session as any,
    };
  }

  /**
   * Calculate risk score for user
   */
  async calculateRiskScore(userId: string): Promise<number> {
    let score = 0;

    // Account age
    const userStmt = this.db.prepare('SELECT created_at FROM users WHERE id = ? LIMIT 1');
    const user = userStmt.get(userId) as any;

    if (user) {
      const accountAge = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24);

      if (accountAge < 1) score += 40;
      else if (accountAge < 7) score += 20;
      else if (accountAge < 30) score += 10;
    }

    // Device count
    const deviceStmt = this.db.prepare(`
      SELECT COUNT(DISTINCT device_fingerprint) as device_count 
      FROM user_sessions WHERE user_id = ?
    `);
    const deviceResult = deviceStmt.get(userId) as any;
    if (deviceResult?.device_count > 3) score += 15;

    // IP count
    const ipStmt = this.db.prepare(`
      SELECT COUNT(DISTINCT ip_address) as ip_count 
      FROM user_sessions WHERE user_id = ?
    `);
    const ipResult = ipStmt.get(userId) as any;
    if (ipResult?.ip_count > 10) score += 20;

    // Watch patterns
    const watchStmt = this.db.prepare(`
      SELECT start_time FROM video_sessions 
      WHERE user_id = ? 
      ORDER BY start_time DESC 
      LIMIT 20
    `);
    const recentWatches = watchStmt.all(userId) as any[];

    if (recentWatches.length >= 5) {
      const intervals = [];
      for (let i = 1; i < recentWatches.length; i++) {
        intervals.push(new Date(recentWatches[i - 1].start_time).getTime() - new Date(recentWatches[i].start_time).getTime());
      }

      const variance = this.calculateVariance(intervals);
      if (variance < 10000) score += 25; // Too consistent
    }

    // Velocity in last 24 hours
    const velocityStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM video_sessions
      WHERE user_id = ? AND start_time > datetime('now', '-1 day')
    `);
    const velocity = velocityStmt.get(userId) as any;
    if (velocity.count > 25) score += 15;

    // Previous flags
    const flagStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM user_flags
      WHERE user_id = ? AND resolved_at IS NULL
    `);
    const flagCount = flagStmt.get(userId) as any;
    score += (flagCount.count || 0) * 10;

    // Withdrawal intent
    const withdrawalStmt = this.db.prepare(`
      SELECT SUM(amount) as total FROM ad_rewards
      WHERE user_id = ? AND state = 'cleared'
    `);
    const withdrawn = withdrawalStmt.get(userId) as any;

    if (withdrawn?.total && withdrawn.total > this.MAX_DAILY_EARNINGS * 3) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  /**
   * Automatically review pending rewards
   */
  @Cron('0 * * * *') // Every hour
  async reviewPendingRewards() {
    const stmt = this.db.prepare(`
      SELECT * FROM ad_rewards 
      WHERE state = 'pending' AND clearable_at < CURRENT_TIMESTAMP
    `);
    const rewards = stmt.all() as RewardRecord[];

    for (const reward of rewards) {
      const riskScore = await this.calculateRiskScore(reward.userId);

      if (riskScore < 30) {
        await this.clearReward(reward.id);
      } else if (riskScore < 70) {
        await this.extendHoldingPeriod(reward.id, 48 * 60 * 60 * 1000);
      } else {
        await this.flagForManualReview(reward.userId, `High risk score: ${riskScore}`);
      }
    }
  }

  /**
   * Clear reward for withdrawal
   */
  private async clearReward(rewardId: string): Promise<void> {
    const stmt = this.db.prepare('SELECT * FROM ad_rewards WHERE id = ? LIMIT 1');
    const reward = stmt.get(rewardId) as RewardRecord;

    if (!reward) return;

    const updateStmt = this.db.prepare(`
      UPDATE users 
      SET pending_coins = pending_coins - ?, withdrawable_coins = withdrawable_coins + ?
      WHERE id = ?
    `);
    updateStmt.run(reward.amount, reward.amount, reward.userId);

    const rewardStmt = this.db.prepare(`
      UPDATE ad_rewards SET state = 'cleared', cleared_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    rewardStmt.run(rewardId);

    this.logger.log(`Cleared reward ${rewardId} for user ${reward.userId}`);
  }

  /**
   * Extend holding period for suspicious rewards
   */
  private async extendHoldingPeriod(rewardId: string, additionalMs: number): Promise<void> {
    const stmt = this.db.prepare('SELECT * FROM ad_rewards WHERE id = ? LIMIT 1');
    const reward = stmt.get(rewardId) as any;

    if (!reward) return;

    const newClearableAt = new Date(new Date(reward.clearable_at).getTime() + additionalMs);

    const updateStmt = this.db.prepare(`
      UPDATE ad_rewards SET clearable_at = ? WHERE id = ?
    `);
    updateStmt.run(newClearableAt.toISOString(), rewardId);

    this.logger.log(`Extended holding period for reward ${rewardId}`);
  }

  /**
   * Flag for manual review
   */
  private async flagForManualReview(userId: string, reason: string): Promise<void> {
    const flagId = crypto.randomUUID();

    const stmt = this.db.prepare(`
      INSERT INTO user_flags (id, user_id, flag_type, reason, severity)
      VALUES (?, ?, 'manual-review', ?, 'HIGH')
    `);
    stmt.run(flagId, userId, reason);

    this.logger.warn(`Flagged user ${userId} for manual review: ${reason}`);
  }

  /**
   * Immediately ban user for clear fraud
   */
  async immediatelyBanUser(userId: string, reason: string, ip?: string): Promise<void> {
    await this.db.transaction(() => {
      // Ban user
      const userStmt = this.db.prepare('UPDATE users SET banned = true WHERE id = ?');
      userStmt.run(userId);

      // Reverse all pending rewards
      const rewardStmt = this.db.prepare(`
        UPDATE ad_rewards SET state = 'reversed', reversal_reason = ? 
        WHERE user_id = ? AND state = 'pending'
      `);
      rewardStmt.run(reason, userId);

      // Reset balances
      const balanceStmt = this.db.prepare(`
        UPDATE users SET pending_coins = 0 WHERE id = ?
      `);
      balanceStmt.run(userId);

      // Log fraud event
      this.logFraudEvent(userId, 'account-banned', 'CRITICAL', reason, ip);
    })();

    this.logger.error(`Banned user ${userId}: ${reason}`);
  }

  /**
   * Log fraud event
   */
  private async logFraudEvent(
    userId: string | null,
    eventType: string,
    severity: string,
    description: string,
    ip?: string,
    userAgent?: string,
  ): Promise<void> {
    const eventId = crypto.randomUUID();

    const stmt = this.db.prepare(`
      INSERT INTO fraud_events (id, user_id, event_type, severity, description, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(eventId, userId, eventType, severity, description, ip, userAgent);
  }

  /**
   * Check circuit breaker
   */
  private async checkCircuitBreaker(): Promise<void> {
    const state = await this.redis.get('circuit-breaker:ads');
    if (state === 'open') {
      throw new ServiceUnavailableException('Reward system temporarily unavailable');
    }
  }

  /**
   * Daily reconciliation
   */
  @Cron('0 2 * * *') // 2 AM daily
  async reconcileDailyFinances() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const stmt = this.db.prepare(`
      SELECT SUM(amount) as total FROM ad_rewards 
      WHERE DATE(earned_at) = ? AND state IN ('cleared', 'pending')
    `);
    const result = stmt.get(dateStr) as any;

    const coinsGranted = result?.total || 0;

    // Compare with provider
    const expectedCoins = 300; // Should come from provider API

    const discrepancy = Math.abs(expectedCoins - coinsGranted);
    const discrepancyPercent = (discrepancy / expectedCoins) * 100;

    const reconStmt = this.db.prepare(`
      INSERT INTO daily_reconciliation (id, date, expected_coins, actual_coins, discrepancy, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    reconStmt.run(
      crypto.randomUUID(),
      dateStr,
      expectedCoins,
      coinsGranted,
      discrepancy,
      discrepancyPercent > 5 ? 'ALERT' : 'OK',
    );

    if (discrepancyPercent > 5) {
      this.logger.error(`Financial discrepancy detected: ${discrepancyPercent}%`);
    }
  }

  /**
   * Get withdrawable balance
   */
  async getWithdrawableBalance(userId: string): Promise<number> {
    const stmt = this.db.prepare('SELECT withdrawable_coins FROM users WHERE id = ? LIMIT 1');
    const result = stmt.get(userId) as any;
    return result?.withdrawable_coins || 0;
  }

  /**
   * Helper: Wait for completion
   */
  private async waitForCompletion(key: string, timeout: number): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const result = await this.redis.get(key);
      if (result) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Helper: Generate temporary token
   */
  private generateTemporaryToken(sessionId: string, userId: string): string {
    // In real implementation, use JWT
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Helper: Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((a, b) => a + b) / values.length;
    const squareDiffs = values.map(x => Math.pow(x - mean, 2));
    return squareDiffs.reduce((a, b) => a + b) / values.length;
  }
}
