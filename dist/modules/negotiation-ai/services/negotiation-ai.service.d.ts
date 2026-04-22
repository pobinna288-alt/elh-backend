import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UsageLimiterService } from './usage-limiter.service';
import { SubscriptionService } from './subscription.service';
import { NegotiationAiAccessResult } from '../dto/negotiation-ai.dto';
export declare class NegotiationAIService {
    private readonly userRepository;
    private readonly usageLimiterService;
    private readonly subscriptionService;
    private readonly logger;
    constructor(userRepository: Repository<User>, usageLimiterService: UsageLimiterService, subscriptionService: SubscriptionService);
    canUseNegotiationAI(userId: string): Promise<NegotiationAiAccessResult>;
    useNegotiationAI(userId: string, data: {
        originalPrice: number;
        offeredPrice: number;
        productCategory: string;
        context?: string;
    }): Promise<{
        result: any;
        usage: {
            dailyUsed: number;
            dailyLimit: number | 'unlimited';
            remaining: number | 'unlimited';
        };
    }>;
    getNegotiationAIStatus(userId: string): Promise<{
        plan: string;
        subscriptionActive: boolean;
        negotiationAiEnabled: boolean;
        dailyUsed: number;
        dailyLimit: number | 'unlimited';
        remaining: number | 'unlimited';
        subscriptionExpiry?: Date;
    }>;
    private generateNegotiationResponse;
    private getResponseTemplates;
}
