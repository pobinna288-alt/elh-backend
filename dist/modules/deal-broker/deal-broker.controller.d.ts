import { DealBrokerService } from './services/deal-broker.service';
import { DealBrokerUsageLimiterService } from './services/deal-broker-usage-limiter.service';
import { NegotiationRecoveryService } from './services/negotiation-recovery.service';
import { TriggerAlternativeSearchDto, SelectAlternativeSellerDto } from './dto/deal-broker.dto';
export declare class DealBrokerController {
    private readonly dealBrokerService;
    private readonly usageLimiterService;
    private readonly recoveryService;
    constructor(dealBrokerService: DealBrokerService, usageLimiterService: DealBrokerUsageLimiterService, recoveryService: NegotiationRecoveryService);
    findAlternativeSellers(dto: TriggerAlternativeSearchDto, req: any): Promise<{
        status: "alternative_found" | "no_alternatives" | "error";
        sellers: import("./dto/deal-broker.dto").MatchedSellerDto[];
        searchId?: string;
        totalCandidates?: number;
        message?: string;
        success: boolean;
        tool_used: string;
    }>;
    selectAlternativeSeller(dto: SelectAlternativeSellerDto, req: any): Promise<{
        chatId: string;
        message: string;
        negotiationAiActive: boolean;
        success: boolean;
        tool_used: string;
    }>;
    checkAccess(req: any): Promise<{
        allowed: boolean;
        status: "allowed" | "limit_reached" | "no_subscription" | "expired" | "not_enabled" | "access_denied";
        message: string;
        dailyUsed?: number;
        dailyLimit?: number | "unlimited";
        remaining?: number | "unlimited";
        success: boolean;
        feature: string;
    }>;
    getUsageHistory(req: any): Promise<{
        success: boolean;
        feature: string;
        usage_history: import("../negotiation-ai").AiUsageLog[];
    }>;
    getSearchHistory(req: any, limit?: number): Promise<{
        success: boolean;
        count: number;
        searches: import(".").AlternativeSellerSearch[];
    }>;
    getDeal(dealId: string, req: any): Promise<{
        success: boolean;
        deal: import(".").Deal;
    }>;
    getNegotiationChats(req: any): Promise<{
        success: boolean;
        count: number;
        chats: import(".").NegotiationChat[];
    }>;
    getNegotiationChat(chatId: string): Promise<{
        success: boolean;
        chat: import(".").NegotiationChat;
    }>;
}
