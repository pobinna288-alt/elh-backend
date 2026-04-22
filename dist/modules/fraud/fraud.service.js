"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FraudService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const config_1 = require("@nestjs/config");
const redis_service_1 = require("../redis/redis.service");
const better_sqlite3_1 = require("better-sqlite3");
const axios_1 = require("axios");
const crypto = require("crypto");
let FraudService = class FraudService {
    constructor(redis, config, db) {
        this.redis = redis;
        this.config = config;
        this.db = db;
        this.logger = new common_1.Logger('FraudService');
        this.REWARD_AMOUNT = 10;
        this.MAX_ADS_PER_HOUR = 5;
        this.MAX_ADS_PER_DAY = 30;
        this.MAX_DAILY_EARNINGS = 100;
        this.MAX_WITHDRAWAL_PER_DAY = 50;
        this.MIN_ACCOUNT_AGE_DAYS = 7;
        this.HOLDING_PERIOD_MS = 24 * 60 * 60 * 1000;
        this.initializeDatabase();
    }
    initializeDatabase() {
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
    async startAdSession(userId, adId) {
        const sessionId = crypto.randomUUID();
        const session = {
            sessionId,
            userId,
            adId,
            startTime: Date.now(),
            requiredDuration: 30000,
            rewardAmount: this.REWARD_AMOUNT,
            status: 'active',
            lastCheckpoint: 0,
            lastCheckpointTime: Date.now(),
        };
        await this.redis.setex(`video-session:${sessionId}`, 600, JSON.stringify(session));
        const stmt = this.db.prepare(`
      INSERT INTO video_sessions (session_id, user_id, ad_id, reward_amount)
      VALUES (?, ?, ?, ?)
    `);
        stmt.run(sessionId, userId, adId, this.REWARD_AMOUNT);
        const temporaryToken = this.generateTemporaryToken(sessionId, userId);
        return { sessionId, temporaryToken };
    }
    async saveCheckpoint(sessionId, progress) {
        const sessionData = await this.redis.get(`video-session:${sessionId}`);
        if (sessionData) {
            const session = JSON.parse(sessionData);
            session.lastCheckpoint = progress;
            session.lastCheckpointTime = Date.now();
            await this.redis.setex(`video-session:${sessionId}`, 600, JSON.stringify(session));
        }
        const stmt = this.db.prepare(`
      UPDATE video_sessions 
      SET last_checkpoint = ?, last_checkpoint_time = CURRENT_TIMESTAMP
      WHERE session_id = ?
    `);
        stmt.run(progress, sessionId);
    }
    async completeAd(sessionId, userId, data, ip, userAgent) {
        await this.checkCircuitBreaker();
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
        const failures = validationResults
            .map((result, index) => (result.status === 'rejected' ? result.reason : null))
            .filter((err) => err !== null);
        if (failures.length > 0) {
            await this.logFraudEvent(userId, 'validation-failed', 'HIGH', failures.map(f => f.message).join('; '), ip, userAgent);
            if (failures.some(f => f.message.includes('device-banned') || f.message.includes('ip-banned'))) {
                await this.immediatelyBanUser(userId, 'fraud-detected', ip);
                throw new common_1.ForbiddenException('Account suspended');
            }
            throw new common_1.BadRequestException('Reward validation failed');
        }
        const recovery = await this.checkRecoveryEligible(sessionId);
        if (recovery && recovery.eligible) {
            return await this.grantRewardWithRecovery(recovery.session, userId);
        }
        return await this.grantPendingReward(sessionId, userId, ip, userAgent);
    }
    async grantPendingReward(sessionId, userId, ip, userAgent) {
        const lockKey = `ad-lock:${sessionId}`;
        const completedKey = `ad-completed:${sessionId}`;
        const alreadyCompleted = await this.redis.get(completedKey);
        if (alreadyCompleted) {
            const result = JSON.parse(alreadyCompleted);
            return { ...result, duplicate: true, message: 'Reward already granted' };
        }
        const lock = await this.redis.setnx(`${lockKey}`, '1');
        if (!lock) {
            await this.waitForCompletion(completedKey, 5000);
            const result = await this.redis.get(completedKey);
            return result ? JSON.parse(result) : { success: false, message: 'Timeout' };
        }
        try {
            await this.redis.expire(lockKey, 10);
            const sessionData = await this.redis.get(`video-session:${sessionId}`);
            if (!sessionData) {
                throw new common_1.BadRequestException('Session not found');
            }
            const session = JSON.parse(sessionData);
            const rewardId = crypto.randomUUID();
            const clearableAt = new Date(Date.now() + this.HOLDING_PERIOD_MS);
            const stmt = this.db.prepare(`
        INSERT INTO ad_rewards (id, session_id, user_id, amount, state, clearable_at)
        VALUES (?, ?, ?, ?, 'pending', ?)
      `);
            stmt.run(rewardId, sessionId, userId, this.REWARD_AMOUNT, clearableAt.toISOString());
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
            await this.redis.setex(completedKey, 3600, JSON.stringify(result));
            await this.redis.del(`video-session:${sessionId}`);
            await this.redis.del(lockKey);
            await this.logFraudEvent(userId, 'ad-completed', 'LOW', 'Normal completion', ip, userAgent);
            return result;
        }
        catch (error) {
            await this.redis.del(lockKey);
            throw error;
        }
    }
    async grantRewardWithRecovery(session, userId) {
        const recoveryId = crypto.randomUUID();
        const stmt = this.db.prepare(`
      INSERT INTO reward_recoveries (id, user_id, session_id, checkpoint, reason)
      VALUES (?, ?, ?, ?, 'network-drop')
    `);
        stmt.run(recoveryId, userId, session.session_id, session.last_checkpoint);
        const rewardId = crypto.randomUUID();
        const rewardStmt = this.db.prepare(`
      INSERT INTO ad_rewards (id, session_id, user_id, amount, state, clearable_at)
      VALUES (?, ?, ?, ?, 'cleared', CURRENT_TIMESTAMP)
    `);
        rewardStmt.run(rewardId, session.session_id, userId, this.REWARD_AMOUNT);
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
    async validateSession(sessionId, userId) {
        let sessionData = await this.redis.get(`video-session:${sessionId}`);
        let session;
        if (!sessionData) {
            const stmt = this.db.prepare('SELECT * FROM video_sessions WHERE session_id = ? LIMIT 1');
            const dbSession = stmt.get(sessionId);
            if (!dbSession) {
                throw new Error('session-not-found');
            }
            session = dbSession;
        }
        else {
            session = JSON.parse(sessionData);
        }
        if (session.user_id !== userId) {
            throw new Error('session-user-mismatch');
        }
    }
    async validateTiming(sessionId) {
        const sessionData = await this.redis.get(`video-session:${sessionId}`);
        if (!sessionData) {
            const stmt = this.db.prepare('SELECT * FROM video_sessions WHERE session_id = ? LIMIT 1');
            const session = stmt.get(sessionId);
            if (!session)
                throw new Error('session-not-found');
            return;
        }
        const session = JSON.parse(sessionData);
        const watchDuration = Date.now() - session.startTime;
        if (watchDuration < session.requiredDuration * 0.95) {
            throw new Error('insufficient-watch-duration');
        }
    }
    async validateDeviceReputation(deviceFingerprint) {
        if (!deviceFingerprint)
            return;
        const blocked = await this.redis.get(`device-blocked:${deviceFingerprint}`);
        if (blocked) {
            throw new Error('device-banned');
        }
        const stmt = this.db.prepare('SELECT * FROM device_blocks WHERE fingerprint = ? LIMIT 1');
        const deviceBlock = stmt.get(deviceFingerprint);
        if (deviceBlock) {
            throw new Error('device-banned');
        }
    }
    async validateIPReputation(ip) {
        const blocked = await this.redis.get(`ip-blocked:${ip}`);
        if (blocked) {
            throw new Error('ip-banned');
        }
        const stmt = this.db.prepare('SELECT * FROM ip_blocks WHERE ip_address = ? LIMIT 1');
        const ipBlock = stmt.get(ip);
        if (ipBlock) {
            throw new Error('ip-banned');
        }
        const today = new Date().toISOString().split('T')[0];
        const ipKey = `rate:ip:${ip}:${today}`;
        const count = await this.redis.incr(ipKey);
        await this.redis.expire(ipKey, 86400);
        if (count > 100) {
            throw new Error('ip-rate-limit-exceeded');
        }
    }
    async validateUserHistory(userId) {
        const userStmt = this.db.prepare('SELECT banned FROM users WHERE id = ? LIMIT 1');
        const user = userStmt.get(userId);
        if (user?.banned) {
            throw new Error('user-banned');
        }
        const flagStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM user_flags 
      WHERE user_id = ? AND severity = 'HIGH' AND resolved_at IS NULL
    `);
        const flags = flagStmt.get(userId);
        if (flags.count > 0) {
            throw new Error('user-flagged-for-fraud');
        }
    }
    async checkDailyLimits(userId) {
        const today = new Date().toISOString().split('T')[0];
        const stmt = this.db.prepare(`
      SELECT COUNT(*) as ads_count, SUM(amount) as total_earned
      FROM ad_rewards
      WHERE user_id = ? AND DATE(earned_at) = ? AND state IN ('pending', 'cleared')
    `);
        const stats = stmt.get(userId, today);
        if ((stats.ads_count || 0) >= this.MAX_ADS_PER_DAY) {
            throw new Error('daily-ad-limit-exceeded');
        }
        if ((stats.total_earned || 0) >= this.MAX_DAILY_EARNINGS) {
            throw new Error('daily-earning-limit-exceeded');
        }
        const userStmt = this.db.prepare('SELECT created_at FROM users WHERE id = ? LIMIT 1');
        const user = userStmt.get(userId);
        if (user) {
            const accountAge = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24);
            if (accountAge < 1 && (stats.ads_count || 0) > 5) {
                throw new Error('new-account-limit');
            }
        }
    }
    async checkVelocityLimits(userId) {
        const hourAgo = new Date(Date.now() - 3600000).toISOString();
        const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM video_sessions
      WHERE user_id = ? AND start_time > ?
    `);
        const result = stmt.get(userId, hourAgo);
        if (result.count >= this.MAX_ADS_PER_HOUR) {
            throw new Error('velocity-limit-exceeded');
        }
        const recentStmt = this.db.prepare(`
      SELECT start_time FROM video_sessions
      WHERE user_id = ? 
      ORDER BY start_time DESC
      LIMIT 10
    `);
        const sessions = recentStmt.all(userId);
        if (sessions.length >= 5) {
            const intervals = [];
            for (let i = 1; i < sessions.length; i++) {
                intervals.push(new Date(sessions[i - 1].start_time).getTime() - new Date(sessions[i].start_time).getTime());
            }
            const variance = this.calculateVariance(intervals);
            if (variance < 10000) {
                throw new Error('bot-like-behavior');
            }
        }
    }
    async validateAdProvider(adId, sessionId) {
        try {
            const response = await axios_1.default.post(`${this.config.get('AD_PROVIDER_API')}/verify`, {
                adId,
                sessionId,
                apiKey: this.config.get('AD_PROVIDER_API_KEY'),
            }, { timeout: 5000 });
            if (!response.data.verified) {
                throw new Error('ad-verification-failed');
            }
            if (response.data.rewardClaimed) {
                throw new Error('reward-already-claimed');
            }
            const watchDuration = response.data.watchDuration || 0;
            const requiredDuration = response.data.requiredDuration || 30000;
            if (watchDuration < requiredDuration * 0.95) {
                throw new Error('insufficient-watch-duration');
            }
        }
        catch (error) {
            this.logger.warn(`Ad provider verification failed: ${error.message}`);
            throw new Error('ad-verification-failed');
        }
    }
    async checkRecoveryEligible(sessionId) {
        const stmt = this.db.prepare(`
      SELECT * FROM video_sessions 
      WHERE session_id = ? AND last_checkpoint >= 90 
      AND datetime(last_checkpoint_time) > datetime('now', '-5 minutes')
      LIMIT 1
    `);
        const session = stmt.get(sessionId);
        return {
            eligible: !!session,
            session: session,
        };
    }
    async calculateRiskScore(userId) {
        let score = 0;
        const userStmt = this.db.prepare('SELECT created_at FROM users WHERE id = ? LIMIT 1');
        const user = userStmt.get(userId);
        if (user) {
            const accountAge = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24);
            if (accountAge < 1)
                score += 40;
            else if (accountAge < 7)
                score += 20;
            else if (accountAge < 30)
                score += 10;
        }
        const deviceStmt = this.db.prepare(`
      SELECT COUNT(DISTINCT device_fingerprint) as device_count 
      FROM user_sessions WHERE user_id = ?
    `);
        const deviceResult = deviceStmt.get(userId);
        if (deviceResult?.device_count > 3)
            score += 15;
        const ipStmt = this.db.prepare(`
      SELECT COUNT(DISTINCT ip_address) as ip_count 
      FROM user_sessions WHERE user_id = ?
    `);
        const ipResult = ipStmt.get(userId);
        if (ipResult?.ip_count > 10)
            score += 20;
        const watchStmt = this.db.prepare(`
      SELECT start_time FROM video_sessions 
      WHERE user_id = ? 
      ORDER BY start_time DESC 
      LIMIT 20
    `);
        const recentWatches = watchStmt.all(userId);
        if (recentWatches.length >= 5) {
            const intervals = [];
            for (let i = 1; i < recentWatches.length; i++) {
                intervals.push(new Date(recentWatches[i - 1].start_time).getTime() - new Date(recentWatches[i].start_time).getTime());
            }
            const variance = this.calculateVariance(intervals);
            if (variance < 10000)
                score += 25;
        }
        const velocityStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM video_sessions
      WHERE user_id = ? AND start_time > datetime('now', '-1 day')
    `);
        const velocity = velocityStmt.get(userId);
        if (velocity.count > 25)
            score += 15;
        const flagStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM user_flags
      WHERE user_id = ? AND resolved_at IS NULL
    `);
        const flagCount = flagStmt.get(userId);
        score += (flagCount.count || 0) * 10;
        const withdrawalStmt = this.db.prepare(`
      SELECT SUM(amount) as total FROM ad_rewards
      WHERE user_id = ? AND state = 'cleared'
    `);
        const withdrawn = withdrawalStmt.get(userId);
        if (withdrawn?.total && withdrawn.total > this.MAX_DAILY_EARNINGS * 3) {
            score += 20;
        }
        return Math.min(score, 100);
    }
    async reviewPendingRewards() {
        const stmt = this.db.prepare(`
      SELECT * FROM ad_rewards 
      WHERE state = 'pending' AND clearable_at < CURRENT_TIMESTAMP
    `);
        const rewards = stmt.all();
        for (const reward of rewards) {
            const riskScore = await this.calculateRiskScore(reward.userId);
            if (riskScore < 30) {
                await this.clearReward(reward.id);
            }
            else if (riskScore < 70) {
                await this.extendHoldingPeriod(reward.id, 48 * 60 * 60 * 1000);
            }
            else {
                await this.flagForManualReview(reward.userId, `High risk score: ${riskScore}`);
            }
        }
    }
    async clearReward(rewardId) {
        const stmt = this.db.prepare('SELECT * FROM ad_rewards WHERE id = ? LIMIT 1');
        const reward = stmt.get(rewardId);
        if (!reward)
            return;
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
    async extendHoldingPeriod(rewardId, additionalMs) {
        const stmt = this.db.prepare('SELECT * FROM ad_rewards WHERE id = ? LIMIT 1');
        const reward = stmt.get(rewardId);
        if (!reward)
            return;
        const newClearableAt = new Date(new Date(reward.clearable_at).getTime() + additionalMs);
        const updateStmt = this.db.prepare(`
      UPDATE ad_rewards SET clearable_at = ? WHERE id = ?
    `);
        updateStmt.run(newClearableAt.toISOString(), rewardId);
        this.logger.log(`Extended holding period for reward ${rewardId}`);
    }
    async flagForManualReview(userId, reason) {
        const flagId = crypto.randomUUID();
        const stmt = this.db.prepare(`
      INSERT INTO user_flags (id, user_id, flag_type, reason, severity)
      VALUES (?, ?, 'manual-review', ?, 'HIGH')
    `);
        stmt.run(flagId, userId, reason);
        this.logger.warn(`Flagged user ${userId} for manual review: ${reason}`);
    }
    async immediatelyBanUser(userId, reason, ip) {
        await this.db.transaction(() => {
            const userStmt = this.db.prepare('UPDATE users SET banned = true WHERE id = ?');
            userStmt.run(userId);
            const rewardStmt = this.db.prepare(`
        UPDATE ad_rewards SET state = 'reversed', reversal_reason = ? 
        WHERE user_id = ? AND state = 'pending'
      `);
            rewardStmt.run(reason, userId);
            const balanceStmt = this.db.prepare(`
        UPDATE users SET pending_coins = 0 WHERE id = ?
      `);
            balanceStmt.run(userId);
            this.logFraudEvent(userId, 'account-banned', 'CRITICAL', reason, ip);
        })();
        this.logger.error(`Banned user ${userId}: ${reason}`);
    }
    async logFraudEvent(userId, eventType, severity, description, ip, userAgent) {
        const eventId = crypto.randomUUID();
        const stmt = this.db.prepare(`
      INSERT INTO fraud_events (id, user_id, event_type, severity, description, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(eventId, userId, eventType, severity, description, ip, userAgent);
    }
    async checkCircuitBreaker() {
        const state = await this.redis.get('circuit-breaker:ads');
        if (state === 'open') {
            throw new common_1.ServiceUnavailableException('Reward system temporarily unavailable');
        }
    }
    async reconcileDailyFinances() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];
        const stmt = this.db.prepare(`
      SELECT SUM(amount) as total FROM ad_rewards 
      WHERE DATE(earned_at) = ? AND state IN ('cleared', 'pending')
    `);
        const result = stmt.get(dateStr);
        const coinsGranted = result?.total || 0;
        const expectedCoins = 300;
        const discrepancy = Math.abs(expectedCoins - coinsGranted);
        const discrepancyPercent = (discrepancy / expectedCoins) * 100;
        const reconStmt = this.db.prepare(`
      INSERT INTO daily_reconciliation (id, date, expected_coins, actual_coins, discrepancy, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        reconStmt.run(crypto.randomUUID(), dateStr, expectedCoins, coinsGranted, discrepancy, discrepancyPercent > 5 ? 'ALERT' : 'OK');
        if (discrepancyPercent > 5) {
            this.logger.error(`Financial discrepancy detected: ${discrepancyPercent}%`);
        }
    }
    async getWithdrawableBalance(userId) {
        const stmt = this.db.prepare('SELECT withdrawable_coins FROM users WHERE id = ? LIMIT 1');
        const result = stmt.get(userId);
        return result?.withdrawable_coins || 0;
    }
    async waitForCompletion(key, timeout) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const result = await this.redis.get(key);
            if (result)
                return;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    generateTemporaryToken(sessionId, userId) {
        return crypto.randomBytes(32).toString('hex');
    }
    calculateVariance(values) {
        if (values.length === 0)
            return 0;
        const mean = values.reduce((a, b) => a + b) / values.length;
        const squareDiffs = values.map(x => Math.pow(x - mean, 2));
        return squareDiffs.reduce((a, b) => a + b) / values.length;
    }
};
exports.FraudService = FraudService;
__decorate([
    (0, schedule_1.Cron)('0 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FraudService.prototype, "reviewPendingRewards", null);
__decorate([
    (0, schedule_1.Cron)('0 2 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FraudService.prototype, "reconcileDailyFinances", null);
exports.FraudService = FraudService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService,
        config_1.ConfigService, typeof (_a = typeof better_sqlite3_1.Database !== "undefined" && better_sqlite3_1.Database) === "function" ? _a : Object])
], FraudService);
//# sourceMappingURL=fraud.service.js.map