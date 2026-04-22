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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AdWatchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdWatchService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ad_view_entity_1 = require("./entities/ad-view.entity");
const coin_transaction_entity_1 = require("./entities/coin-transaction.entity");
const coin_boost_event_entity_1 = require("./entities/coin-boost-event.entity");
const user_entity_1 = require("../users/entities/user.entity");
const ad_entity_1 = require("../ads/entities/ad.entity");
const uuid_1 = require("uuid");
const TIER_CONFIG = {
    NORMAL: {
        maxVideoLength: 120,
        maxCoins: 10,
    },
    PREMIUM: {
        maxVideoLength: 180,
        maxCoins: 40,
    },
    PRO: {
        maxVideoLength: 300,
        maxCoins: 100,
    },
    HOT: {
        maxVideoLength: 600,
        maxCoins: 200,
    },
};
const MILESTONE_PERCENTAGES = {
    25: 0.2,
    50: 0.5,
    75: 0.7,
    100: 1.0,
};
const ANTI_CHEAT_CONFIG = {
    MIN_WATCH_TIME_RATIO: 0.8,
    MAX_PROGRESS_JUMP: 30,
    MIN_UPDATE_INTERVAL: 2,
    DAILY_COIN_LIMIT: 500,
    MAX_AD_VIEWS_PER_DAY: 100,
};
let AdWatchService = AdWatchService_1 = class AdWatchService {
    constructor(adViewRepository, coinTransactionRepository, boostEventRepository, userRepository, adRepository, dataSource) {
        this.adViewRepository = adViewRepository;
        this.coinTransactionRepository = coinTransactionRepository;
        this.boostEventRepository = boostEventRepository;
        this.userRepository = userRepository;
        this.adRepository = adRepository;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(AdWatchService_1.name);
    }
    async startWatchSession(userId, adId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const ad = await this.adRepository.findOne({
            where: { id: adId, isActive: true },
            relations: ['author'],
        });
        if (!ad) {
            throw new common_1.NotFoundException('Ad not found or inactive');
        }
        if (ad.authorId === userId) {
            throw new common_1.ForbiddenException('Cannot earn coins from your own ads');
        }
        const tier = this.getAdTier(ad);
        const tierConfig = TIER_CONFIG[tier];
        const existingView = await this.adViewRepository.findOne({
            where: { userId, adId },
        });
        if (existingView?.completed) {
            throw new common_1.BadRequestException('You have already completed watching this ad');
        }
        if (!existingView) {
            const newView = this.adViewRepository.create({
                userId,
                adId,
                watchPercent: 0,
                sessionStartTime: new Date(),
            });
            await this.adViewRepository.save(newView);
        }
        else {
            existingView.sessionStartTime = new Date();
            await this.adViewRepository.save(existingView);
        }
        const boostEvent = await this.getActiveBoostEvent(tier);
        const milestoneRewards = this.calculateMilestoneRewards(tierConfig.maxCoins);
        return {
            success: true,
            sessionId: (0, uuid_1.v4)(),
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
    async processAdProgress(userId, dto) {
        const { adId, watchPercent, watchTimeSeconds } = dto;
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const ad = await this.adRepository.findOne({
            where: { id: adId },
            relations: ['author'],
        });
        if (!ad) {
            throw new common_1.NotFoundException('Ad not found');
        }
        if (ad.authorId === userId) {
            throw new common_1.ForbiddenException('Cannot earn coins from your own ads');
        }
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
        await this.validateWatchProgress(view, watchPercent, watchTimeSeconds, ad);
        const tier = this.getAdTier(ad);
        const tierConfig = TIER_CONFIG[tier];
        const maxCoins = tierConfig.maxCoins;
        const boostEvent = await this.getActiveBoostEvent(tier);
        const multiplier = boostEvent ? Number(boostEvent.multiplier) : 1.0;
        const { coinsEarned, milestonesReached } = await this.processMilestones(view, watchPercent, maxCoins, multiplier);
        view.watchPercent = watchPercent;
        view.lastProgressTime = new Date();
        if (watchTimeSeconds) {
            view.watchTimeSeconds = watchTimeSeconds;
        }
        const isCompleted = watchPercent >= 100;
        if (isCompleted) {
            view.completed = true;
        }
        let newBalance = user.coins;
        if (coinsEarned > 0) {
            newBalance = await this.grantCoins(userId, adId, coinsEarned, milestonesReached, multiplier, boostEvent?.id);
        }
        await this.adViewRepository.save(view);
        if (isCompleted) {
            await this.updateWatchStreak(userId);
        }
        this.logger.log(`User ${userId} progress on ad ${adId}: ${watchPercent}% - Earned ${coinsEarned} coins`);
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
    async getWatchStats(userId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const totalAdsWatched = await this.adViewRepository.count({
            where: { userId },
        });
        const adsCompleted = await this.adViewRepository.count({
            where: { userId, completed: true },
        });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const coinsEarnedToday = await this.coinTransactionRepository
            .createQueryBuilder('tx')
            .select('SUM(tx.coins)', 'total')
            .where('tx.userId = :userId', { userId })
            .andWhere('tx.createdAt >= :today', { today })
            .getRawOne();
        const boostEvent = await this.getActiveBoostEvent();
        return {
            userId,
            coinBalance: user.coins,
            totalAdsWatched,
            adsCompleted,
            watchStreak: user.streakDays,
            coinsEarnedToday: Number(coinsEarnedToday?.total || 0),
            dailyCoinLimit: ANTI_CHEAT_CONFIG.DAILY_COIN_LIMIT,
            activeBoostEvent: boostEvent
                ? {
                    name: boostEvent.name,
                    multiplier: Number(boostEvent.multiplier),
                    endsAt: boostEvent.endTime,
                }
                : undefined,
        };
    }
    async getAdCompletionStatus(userId, adId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
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
    getAdTier(ad) {
        if (ad.isPremium) {
            const duration = ad.videoDuration || 0;
            if (duration <= 120)
                return 'NORMAL';
            if (duration <= 180)
                return 'PREMIUM';
            if (duration <= 300)
                return 'PRO';
            return 'HOT';
        }
        return 'NORMAL';
    }
    calculateMilestoneRewards(maxCoins) {
        return {
            '25': Math.floor(maxCoins * 0.2),
            '50': Math.floor(maxCoins * 0.5) - Math.floor(maxCoins * 0.2),
            '75': Math.floor(maxCoins * 0.7) - Math.floor(maxCoins * 0.5),
            '100': maxCoins - Math.floor(maxCoins * 0.7),
        };
    }
    async processMilestones(view, watchPercent, maxCoins, multiplier) {
        let totalCoins = 0;
        const milestonesReached = [];
        const milestone25Coins = Math.floor(maxCoins * 0.2);
        const milestone50Coins = Math.floor(maxCoins * 0.5);
        const milestone75Coins = Math.floor(maxCoins * 0.7);
        const milestone100Coins = maxCoins;
        if (watchPercent >= 25 && !view.milestone25) {
            const coins = Math.floor(milestone25Coins * multiplier);
            totalCoins += coins;
            view.milestone25 = true;
            milestonesReached.push(25);
        }
        if (watchPercent >= 50 && !view.milestone50) {
            const coins = Math.floor((milestone50Coins - milestone25Coins) * multiplier);
            totalCoins += coins;
            view.milestone50 = true;
            milestonesReached.push(50);
        }
        if (watchPercent >= 75 && !view.milestone75) {
            const coins = Math.floor((milestone75Coins - milestone50Coins) * multiplier);
            totalCoins += coins;
            view.milestone75 = true;
            milestonesReached.push(75);
        }
        if (watchPercent >= 100 && !view.milestone100) {
            const coins = Math.floor((milestone100Coins - milestone75Coins) * multiplier);
            totalCoins += coins;
            view.milestone100 = true;
            milestonesReached.push(100);
        }
        return { coinsEarned: totalCoins, milestonesReached };
    }
    async grantCoins(userId, adId, coins, milestones, multiplier, boostEventId) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dailyEarnings = await queryRunner.manager
                .createQueryBuilder(coin_transaction_entity_1.CoinTransaction, 'tx')
                .select('COALESCE(SUM(tx.coins), 0)', 'total')
                .where('tx.userId = :userId', { userId })
                .andWhere('tx.createdAt >= :today', { today })
                .getRawOne();
            const currentDailyTotal = Number(dailyEarnings?.total || 0);
            const remainingDailyLimit = ANTI_CHEAT_CONFIG.DAILY_COIN_LIMIT - currentDailyTotal;
            if (remainingDailyLimit <= 0) {
                await queryRunner.rollbackTransaction();
                throw new common_1.ForbiddenException('Daily coin limit reached');
            }
            const actualCoins = Math.min(coins, remainingDailyLimit);
            await queryRunner.manager
                .createQueryBuilder()
                .update(user_entity_1.User)
                .set({ coins: () => `coins + ${actualCoins}` })
                .where('id = :userId', { userId })
                .execute();
            await queryRunner.manager
                .createQueryBuilder()
                .update(ad_view_entity_1.AdView)
                .set({ totalCoinsEarned: () => `"totalCoinsEarned" + ${actualCoins}` })
                .where('userId = :userId AND adId = :adId', { userId, adId })
                .execute();
            for (const milestone of milestones) {
                const milestoneCoins = this.getMilestoneCoins(milestone, coins, milestones);
                const transaction = queryRunner.manager.create(coin_transaction_entity_1.CoinTransaction, {
                    userId,
                    adId,
                    coins: milestoneCoins,
                    type: boostEventId
                        ? coin_transaction_entity_1.CoinTransactionType.BOOST_EVENT_REWARD
                        : coin_transaction_entity_1.CoinTransactionType.AD_WATCH_REWARD,
                    description: `Ad watch milestone ${milestone}% reward${multiplier > 1 ? ` (${multiplier}x boost)` : ''}`,
                    milestone,
                    multiplier,
                    boostEventId,
                });
                await queryRunner.manager.save(transaction);
            }
            if (boostEventId) {
                await queryRunner.manager
                    .createQueryBuilder()
                    .update(coin_boost_event_entity_1.CoinBoostEvent)
                    .set({ coinsDistributed: () => `"coinsDistributed" + ${actualCoins}` })
                    .where('id = :id', { id: boostEventId })
                    .execute();
            }
            await queryRunner.commitTransaction();
            const updatedUser = await this.userRepository.findOne({
                where: { id: userId },
                select: ['coins'],
            });
            return updatedUser?.coins || 0;
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    getMilestoneCoins(milestone, totalCoins, allMilestones) {
        return Math.floor(totalCoins / allMilestones.length);
    }
    async validateWatchProgress(view, newPercent, watchTimeSeconds, ad) {
        const now = new Date();
        if (newPercent < view.watchPercent) {
            throw new common_1.BadRequestException('Watch progress cannot decrease');
        }
        const progressJump = newPercent - view.watchPercent;
        if (progressJump > ANTI_CHEAT_CONFIG.MAX_PROGRESS_JUMP) {
            this.logger.warn(`Suspicious progress jump detected: ${progressJump}% for user ${view.userId}`);
            throw new common_1.BadRequestException('Suspicious watch pattern detected');
        }
        if (view.lastProgressTime) {
            const timeSinceLastUpdate = (now.getTime() - view.lastProgressTime.getTime()) / 1000;
            if (timeSinceLastUpdate < ANTI_CHEAT_CONFIG.MIN_UPDATE_INTERVAL) {
                throw new common_1.BadRequestException('Progress updates too frequent');
            }
        }
        if (watchTimeSeconds && ad.videoDuration) {
            const expectedTime = (newPercent / 100) * ad.videoDuration;
            const timeRatio = watchTimeSeconds / expectedTime;
            if (timeRatio < ANTI_CHEAT_CONFIG.MIN_WATCH_TIME_RATIO) {
                this.logger.warn(`Watch time mismatch for user ${view.userId}: expected ~${expectedTime}s, got ${watchTimeSeconds}s`);
                throw new common_1.BadRequestException('Watch time does not match video progress');
            }
        }
        if (view.sessionStartTime) {
            const sessionDuration = (now.getTime() - view.sessionStartTime.getTime()) / 1000;
            if (ad.videoDuration && newPercent >= 100) {
                const minExpectedDuration = ad.videoDuration * ANTI_CHEAT_CONFIG.MIN_WATCH_TIME_RATIO;
                if (sessionDuration < minExpectedDuration) {
                    this.logger.warn(`Session too short for completion: ${sessionDuration}s < ${minExpectedDuration}s`);
                    throw new common_1.BadRequestException('Video completed too quickly');
                }
            }
        }
    }
    async updateWatchStreak(userId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user)
            return;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastWatch = user.lastStreakDate
            ? new Date(user.lastStreakDate)
            : null;
        if (lastWatch) {
            lastWatch.setHours(0, 0, 0, 0);
            const daysDiff = Math.floor((today.getTime() - lastWatch.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff === 0) {
                return;
            }
            else if (daysDiff === 1) {
                user.streakDays += 1;
            }
            else {
                user.streakDays = 1;
            }
        }
        else {
            user.streakDays = 1;
        }
        user.lastStreakDate = today;
        await this.userRepository.save(user);
        if (user.streakDays > 0 && user.streakDays % 7 === 0) {
            await this.grantStreakBonus(userId, user.streakDays);
        }
    }
    async grantStreakBonus(userId, streakDays) {
        const bonusCoins = Math.min(Math.floor(streakDays / 7) * 10, 100);
        await this.dataSource.transaction(async (manager) => {
            await manager
                .createQueryBuilder()
                .update(user_entity_1.User)
                .set({ coins: () => `coins + ${bonusCoins}` })
                .where('id = :userId', { userId })
                .execute();
            const transaction = manager.create(coin_transaction_entity_1.CoinTransaction, {
                userId,
                coins: bonusCoins,
                type: coin_transaction_entity_1.CoinTransactionType.STREAK_BONUS,
                description: `${streakDays}-day watch streak bonus`,
            });
            await manager.save(transaction);
        });
        this.logger.log(`Granted ${bonusCoins} streak bonus to user ${userId} for ${streakDays}-day streak`);
    }
    async getActiveBoostEvent(tier) {
        const now = new Date();
        const queryBuilder = this.boostEventRepository
            .createQueryBuilder('event')
            .where('event.isActive = :isActive', { isActive: true })
            .andWhere('event.startTime <= :now', { now })
            .andWhere('event.endTime >= :now', { now });
        queryBuilder.andWhere('(event.maxTotalCoins IS NULL OR event.coinsDistributed < event.maxTotalCoins)');
        if (tier) {
            queryBuilder.andWhere('(event.eligibleTiers IS NULL OR event.eligibleTiers LIKE :tier)', { tier: `%${tier}%` });
        }
        return queryBuilder.getOne();
    }
    async createBoostEvent(data) {
        const event = this.boostEventRepository.create({
            ...data,
            isActive: true,
            coinsDistributed: 0,
        });
        return this.boostEventRepository.save(event);
    }
    async deactivateBoostEvent(eventId) {
        await this.boostEventRepository.update(eventId, { isActive: false });
    }
    async getAllBoostEvents() {
        return this.boostEventRepository.find({
            order: { startTime: 'DESC' },
        });
    }
};
exports.AdWatchService = AdWatchService;
exports.AdWatchService = AdWatchService = AdWatchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ad_view_entity_1.AdView)),
    __param(1, (0, typeorm_1.InjectRepository)(coin_transaction_entity_1.CoinTransaction)),
    __param(2, (0, typeorm_1.InjectRepository)(coin_boost_event_entity_1.CoinBoostEvent)),
    __param(3, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(4, (0, typeorm_1.InjectRepository)(ad_entity_1.Ad)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], AdWatchService);
//# sourceMappingURL=ad-watch.service.js.map