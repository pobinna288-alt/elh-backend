import { Repository } from 'typeorm';
import { SubscriptionPlan } from '../../users/entities/user.entity';
import { AiUsageLog } from '../../negotiation-ai/entities/ai-usage-log.entity';
export declare class DealBrokerUsageLimiterService {
    private readonly usageLogRepository;
    private readonly logger;
    private readonly FEATURE_NAME;
    private readonly DAILY_LIMITS;
    constructor(usageLogRepository: Repository<AiUsageLog>);
    getDailyLimit(plan: SubscriptionPlan): number;
    getTodayDateString(): string;
    getOrCreateTodayUsage(userId: string, featureName?: string): Promise<AiUsageLog>;
    getTodayUsageCount(userId: string): Promise<number>;
    checkLimit(userId: string, plan: SubscriptionPlan): Promise<{
        allowed: boolean;
        usageCount: number;
        dailyLimit: number;
        remaining: number | 'unlimited';
    }>;
    incrementUsage(userId: string, featureName?: string): Promise<AiUsageLog>;
    getUsageHistory(userId: string, days?: number): Promise<AiUsageLog[]>;
}
