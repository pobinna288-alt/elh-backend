import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { RedisService } from '../redis/redis.service';
export type AiToolName = 'smart_copywriter' | 'negotiation_ai' | 'competitor_analyzer' | 'ad_improver' | 'market_suggestion';
interface UsageCheckResult {
    remainingDailyUsage: number;
}
export declare class AiUsageService {
    private readonly userRepository;
    private readonly redisService;
    private readonly TOTAL_DAILY_LIMIT;
    private readonly TOOL_LIMITS;
    constructor(userRepository: Repository<User>, redisService: RedisService);
    consume(userId: string, tool: AiToolName): Promise<UsageCheckResult>;
    private isPremiumRole;
    private getTodayKey;
    private buildToolKey;
    private buildTotalKey;
}
export {};
