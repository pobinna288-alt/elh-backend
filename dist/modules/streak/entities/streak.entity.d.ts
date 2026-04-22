import { User } from '../../users/entities/user.entity';
export declare class Streak {
    id: string;
    user: User;
    userId: string;
    currentStreak: number;
    longestStreak: number;
    lastVisitDate: Date;
    totalCoinsEarned: number;
    dailyCoinsToday: number;
    createdAt: Date;
    updatedAt: Date;
}
