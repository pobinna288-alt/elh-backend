import { Repository } from 'typeorm';
import { Streak } from './entities/streak.entity';
import { NotificationsService } from '../notifications/notifications.service';
export declare class StreakService {
    private streakRepository;
    private notificationsService;
    constructor(streakRepository: Repository<Streak>, notificationsService: NotificationsService);
    getStreak(userId: string): Promise<Streak>;
    checkIn(userId: string): Promise<{
        message: string;
        coinsEarned: number;
        id: string;
        user: import("../users/entities/user.entity").User;
        userId: string;
        currentStreak: number;
        longestStreak: number;
        lastVisitDate: Date;
        totalCoinsEarned: number;
        dailyCoinsToday: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getLeaderboard(): Promise<{
        rank: number;
        userId: string;
        username: string;
        currentStreak: number;
        longestStreak: number;
        totalCoinsEarned: number;
    }[]>;
    private createStreak;
}
