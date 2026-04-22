import { User } from '../../users/entities/user.entity';
export declare class Referral {
    id: string;
    referrer: User;
    referrerId: string;
    referralCode: string;
    referredUser: User;
    referredUserId: string;
    rewardClaimed: boolean;
    coinsEarned: number;
    createdAt: Date;
}
