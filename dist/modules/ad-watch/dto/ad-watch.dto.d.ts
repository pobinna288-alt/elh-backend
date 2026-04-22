export declare class AdProgressDto {
    adId: string;
    watchPercent: number;
    watchTimeSeconds?: number;
}
export declare class StartWatchSessionDto {
    adId: string;
}
export declare class AdProgressResponseDto {
    success: boolean;
    watchPercent: number;
    coinsEarned: number;
    totalCoinsFromAd: number;
    newBalance: number;
    completed: boolean;
    milestonesReached: number[];
    boostMultiplier?: number;
    message?: string;
}
export declare class WatchSessionResponseDto {
    success: boolean;
    sessionId: string;
    adId: string;
    tier: string;
    videoDuration: number;
    maxCoins: number;
    milestoneRewards: {
        '25': number;
        '50': number;
        '75': number;
        '100': number;
    };
    boostEvent?: {
        name: string;
        multiplier: number;
        endsAt: Date;
    };
}
export declare class AdCompletionResponseDto {
    status: 'completed' | 'already_completed' | 'in_progress';
    coinsEarned: number;
    newBalance: number;
    watchStreak: number;
    streakBonus?: number;
}
export declare class WatchStatsResponseDto {
    userId: string;
    coinBalance: number;
    totalAdsWatched: number;
    adsCompleted: number;
    watchStreak: number;
    coinsEarnedToday: number;
    dailyCoinLimit: number;
    activeBoostEvent?: {
        name: string;
        multiplier: number;
        endsAt: Date;
    };
}
