import { StreakService } from './streak.service';
export declare class StreakController {
    private readonly streakService;
    constructor(streakService: StreakService);
    getStreak(req: any): Promise<import("./entities/streak.entity").Streak>;
    checkIn(req: any): Promise<{
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
}
