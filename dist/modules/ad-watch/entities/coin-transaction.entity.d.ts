import { User } from '../../users/entities/user.entity';
import { Ad } from '../../ads/entities/ad.entity';
export declare enum CoinTransactionType {
    AD_WATCH_REWARD = "ad_watch_reward",
    STREAK_BONUS = "streak_bonus",
    BOOST_EVENT_REWARD = "boost_event_reward",
    REFERRAL_BONUS = "referral_bonus",
    MILESTONE_BONUS = "milestone_bonus"
}
export declare class CoinTransaction {
    id: string;
    user: User;
    userId: string;
    ad: Ad;
    adId: string;
    coins: number;
    type: CoinTransactionType;
    description: string;
    milestone: number;
    multiplier: number;
    boostEventId: string;
    createdAt: Date;
}
