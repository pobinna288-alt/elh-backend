import { NegotiationAIService } from './services/negotiation-ai.service';
import { SubscriptionService } from './services/subscription.service';
import { UsageLimiterService } from './services/usage-limiter.service';
import { NegotiationAiRequestDto, ActivateSubscriptionDto } from './dto/negotiation-ai.dto';
import { SubscriptionPlan } from '../users/entities/user.entity';
export declare class NegotiationAiController {
    private readonly negotiationAIService;
    private readonly subscriptionService;
    private readonly usageLimiterService;
    constructor(negotiationAIService: NegotiationAIService, subscriptionService: SubscriptionService, usageLimiterService: UsageLimiterService);
    getNegotiationReply(dto: NegotiationAiRequestDto, req: any): Promise<{
        result: any;
        usage: {
            dailyUsed: number;
            dailyLimit: number | "unlimited";
            remaining: number | "unlimited";
        };
        success: boolean;
        tool_used: string;
    }>;
    checkAccess(req: any): Promise<import("./dto/negotiation-ai.dto").NegotiationAiAccessResult>;
    getStatus(req: any): Promise<{
        plan: string;
        subscriptionActive: boolean;
        negotiationAiEnabled: boolean;
        dailyUsed: number;
        dailyLimit: number | "unlimited";
        remaining: number | "unlimited";
        subscriptionExpiry?: Date;
    }>;
    getUsageHistory(req: any): Promise<{
        usage_history: import(".").AiUsageLog[];
    }>;
    activateSubscription(dto: ActivateSubscriptionDto, req: any): Promise<{
        success: boolean;
        message: string;
        subscription_status: string;
        plan: SubscriptionPlan;
        subscription_expiry: Date;
        negotiation_ai_enabled: boolean;
    }>;
    getSubscriptionStatus(req: any): Promise<{
        plan: SubscriptionPlan;
        subscriptionActive: boolean;
        subscriptionExpiry: Date | null;
        negotiationAiEnabled: boolean;
        isExpired: boolean;
    }>;
}
