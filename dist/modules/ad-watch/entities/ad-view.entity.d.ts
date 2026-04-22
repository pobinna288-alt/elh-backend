import { User } from '../../users/entities/user.entity';
import { Ad } from '../../ads/entities/ad.entity';
export declare class AdView {
    id: string;
    user: User;
    userId: string;
    ad: Ad;
    adId: string;
    watchPercent: number;
    watchTimeSeconds: number;
    milestone25: boolean;
    milestone50: boolean;
    milestone75: boolean;
    milestone100: boolean;
    totalCoinsEarned: number;
    completed: boolean;
    lastProgressTime: Date;
    sessionStartTime: Date;
    createdAt: Date;
    updatedAt: Date;
}
