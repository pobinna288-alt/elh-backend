import { Repository } from 'typeorm';
import { SubscriptionPlan } from '../../users/entities/user.entity';
import { AiUsageLog } from '../entities/ai-usage-log.entity';
export declare class UsageLimiterService {
    private readonly usageLogRepository;
    private readonly logger;
    private readonly DAILY_LIMITS;
    private readonly FEATURE_NAME;
    constructor(usageLogRepository: Repository<AiUsageLog>);
    getDailyLimit(plan: SubscriptionPlan): number;
    getTodayDateString(): string;
    getOrCreateTodayUsage(userId: string): Promise<AiUsageLog>;
    getTodayUsageCount(userId: string): Promise<number>;
    checkLimit(userId: string, plan: SubscriptionPlan): Promise<{
        allowed: boolean;
        usageCount: number;
        dailyLimit: number;
        remaining: number | 'unlimited';
    }>;
    incrementUsage(userId: string): Promise<AiUsageLog>;
    getUsageHistory(userId: string, days?: number): Promise<AiUsageLog[]>;
}
