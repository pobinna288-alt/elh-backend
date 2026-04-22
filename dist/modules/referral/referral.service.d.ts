import { Repository } from 'typeorm';
import { Referral } from './entities/referral.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
export declare class ReferralService {
    private referralRepository;
    private userRepository;
    private notificationsService;
    constructor(referralRepository: Repository<Referral>, userRepository: Repository<User>, notificationsService: NotificationsService);
    getReferralCode(userId: string): Promise<{
        referralCode: string;
        referralLink: string;
    }>;
    applyReferralCode(userId: string, referralCode: string): Promise<{
        message: string;
        coinsEarned: number;
    }>;
    getStats(userId: string): Promise<{
        friendsReferred: number;
        totalCoinsEarned: number;
        pendingReferrals: number;
    }>;
    getReferredUsers(userId: string): Promise<{
        count: number;
        users: {
            userId: string;
            username: string;
            joinedAt: Date;
            coinsEarned: number;
        }[];
    }>;
    private generateReferralCode;
}
