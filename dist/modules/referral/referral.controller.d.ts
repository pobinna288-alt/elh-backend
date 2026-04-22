import { ReferralService } from './referral.service';
export declare class ReferralController {
    private readonly referralService;
    constructor(referralService: ReferralService);
    getReferralCode(req: any): Promise<{
        referralCode: string;
        referralLink: string;
    }>;
    applyReferralCode(referralCode: string, req: any): Promise<{
        message: string;
        coinsEarned: number;
    }>;
    getStats(req: any): Promise<{
        friendsReferred: number;
        totalCoinsEarned: number;
        pendingReferrals: number;
    }>;
    getReferredUsers(req: any): Promise<{
        count: number;
        users: {
            userId: string;
            username: string;
            joinedAt: Date;
            coinsEarned: number;
        }[];
    }>;
}
