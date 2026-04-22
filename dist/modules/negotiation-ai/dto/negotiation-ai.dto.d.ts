export declare class NegotiationAiRequestDto {
    originalPrice: number;
    offeredPrice: number;
    productCategory: string;
    context?: string;
}
export declare class ActivateSubscriptionDto {
    plan: 'premium' | 'pro_business' | 'hot_business' | 'enterprise';
    paymentMethod: 'coins' | 'card';
    paystackReference?: string;
}
export declare class NegotiationAiStatusResponseDto {
    plan: string;
    subscriptionActive: boolean;
    negotiationAiEnabled: boolean;
    dailyUsed: number;
    dailyLimit: number | 'unlimited';
    remaining: number | 'unlimited';
    subscriptionExpiry?: Date;
}
export declare class NegotiationAiAccessResult {
    allowed: boolean;
    status: 'allowed' | 'limit_reached' | 'no_subscription' | 'expired' | 'not_enabled';
    message: string;
    dailyUsed?: number;
    dailyLimit?: number | 'unlimited';
    remaining?: number | 'unlimited';
}
