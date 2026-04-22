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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreakService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const streak_entity_1 = require("./entities/streak.entity");
const notifications_service_1 = require("../notifications/notifications.service");
let StreakService = class StreakService {
    constructor(streakRepository, notificationsService) {
        this.streakRepository = streakRepository;
        this.notificationsService = notificationsService;
    }
    async getStreak(userId) {
        let streak = await this.streakRepository.findOne({
            where: { userId },
        });
        if (!streak) {
            streak = await this.createStreak(userId);
        }
        return streak;
    }
    async checkIn(userId) {
        let streak = await this.streakRepository.findOne({
            where: { userId },
        });
        if (!streak) {
            streak = await this.createStreak(userId);
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastVisit = new Date(streak.lastVisitDate);
        lastVisit.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff === 0) {
            return {
                ...streak,
                message: 'Already checked in today',
                coinsEarned: 0,
            };
        }
        else if (daysDiff === 1) {
            streak.currentStreak += 1;
            streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
        }
        else {
            streak.currentStreak = 1;
        }
        const baseCoins = 10;
        const streakBonus = Math.min(streak.currentStreak * 2, 100);
        const coinsEarned = baseCoins + streakBonus;
        streak.lastVisitDate = today;
        streak.totalCoinsEarned += coinsEarned;
        streak.dailyCoinsToday = coinsEarned;
        await this.streakRepository.save(streak);
        if (streak.currentStreak >= 7) {
            await this.notificationsService.notifyStreak(userId, streak.currentStreak);
        }
        await this.notificationsService.notifyCoinEarned(userId, coinsEarned, `Daily check-in: ${streak.currentStreak} day streak!`);
        return {
            ...streak,
            message: 'Check-in successful!',
            coinsEarned,
        };
    }
    async getLeaderboard() {
        const topStreaks = await this.streakRepository.find({
            relations: ['user'],
            order: { currentStreak: 'DESC' },
            take: 50,
        });
        return topStreaks.map((streak, index) => ({
            rank: index + 1,
            userId: streak.userId,
            username: streak.user?.username || 'Unknown',
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak,
            totalCoinsEarned: streak.totalCoinsEarned,
        }));
    }
    async createStreak(userId) {
        const streak = this.streakRepository.create({
            userId,
            currentStreak: 0,
            longestStreak: 0,
            lastVisitDate: new Date('2000-01-01'),
            totalCoinsEarned: 0,
            dailyCoinsToday: 0,
        });
        return this.streakRepository.save(streak);
    }
};
exports.StreakService = StreakService;
exports.StreakService = StreakService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(streak_entity_1.Streak)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        notifications_service_1.NotificationsService])
], StreakService);
//# sourceMappingURL=streak.service.js.map