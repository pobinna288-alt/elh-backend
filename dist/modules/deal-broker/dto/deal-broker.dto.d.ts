export declare class CreateDealDto {
    sellerId: string;
    adId?: string;
    category: string;
    originalPrice: number;
    offeredPrice: number;
    currency?: string;
    targetLocation?: string;
    requiredAttention?: number;
    campaignDuration?: number;
    budget?: number;
    negotiationDeadline?: Date;
    notes?: string;
}
export declare class UpdateDealStatusDto {
    status: 'accepted' | 'rejected' | 'counter_offered' | 'cancelled';
    counterPrice?: number;
    rejectionReason?: string;
}
export declare class TriggerAlternativeSearchDto {
    dealId: string;
}
export declare class SelectAlternativeSellerDto {
    searchId: string;
    sellerId: string;
}
export declare class MatchedSellerDto {
    sellerId: string;
    expectedPrice: number;
    attentionScore: number;
    matchScore: number;
    dealSuccessRate: number;
    responseSpeed: number;
}
export declare class AlternativeSearchResultDto {
    status: 'alternative_found' | 'no_alternatives' | 'error';
    sellers: MatchedSellerDto[];
    searchId?: string;
    totalCandidates?: number;
    message?: string;
}
export declare class DealBrokerUsageDto {
    dailyUsed: number;
    dailyLimit: number | 'unlimited';
    remaining: number | 'unlimited';
    featureName: string;
}
export declare class DealBrokerAccessResult {
    allowed: boolean;
    status: 'allowed' | 'limit_reached' | 'no_subscription' | 'expired' | 'not_enabled' | 'access_denied';
    message: string;
    dailyUsed?: number;
    dailyLimit?: number | 'unlimited';
    remaining?: number | 'unlimited';
}
