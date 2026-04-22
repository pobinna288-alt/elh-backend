import { Repository } from 'typeorm';
import { User, SubscriptionPlan } from '../../users/entities/user.entity';
import { UsageLimiterService } from './usage-limiter.service';
export declare class SubscriptionService {
    private readonly userRepository;
    private readonly usageLimiterService;
    private readonly logger;
    private readonly AI_ENABLED_PLANS;
    private readonly PLAN_ROLE_MAP;
    private readonly SUBSCRIPTION_DURATION_DAYS;
    constructor(userRepository: Repository<User>, usageLimiterService: UsageLimiterService);
    onSubscriptionActivated(userId: string, plan: SubscriptionPlan): Promise<{
        user: User;
        subscriptionExpiry: Date;
        negotiationAiEnabled: boolean;
    }>;
    planHasNegotiationAi(plan: SubscriptionPlan): boolean;
    isValidPaidPlan(plan: SubscriptionPlan): boolean;
    handleExpiredSubscriptions(): Promise<number>;
    getSubscriptionStatus(userId: string): Promise<{
        plan: SubscriptionPlan;
        subscriptionActive: boolean;
        subscriptionExpiry: Date | null;
        negotiationAiEnabled: boolean;
        isExpired: boolean;
    }>;
}
