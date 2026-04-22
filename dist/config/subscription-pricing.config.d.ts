export declare const PREMIUM_PRICE_USD: number;
export declare const PREMIUM_PRICE_NGN: number;
export declare const PREMIUM_COINS: number;
export declare const PREMIUM_DURATION_DAYS: number;
export declare const SUBSCRIPTION_BILLING: {
    readonly premium: {
        readonly priceUsd: number;
        readonly stripeAmountCents: number;
        readonly paystackAmountNgn: number;
        readonly coins: number;
        readonly durationDays: number;
    };
    readonly pro: {
        readonly priceUsd: number;
        readonly stripeAmountCents: number;
        readonly paystackAmountNgn: number;
        readonly coins: number;
        readonly durationDays: number;
    };
    readonly hot: {
        readonly priceUsd: number;
        readonly stripeAmountCents: number;
        readonly paystackAmountNgn: number;
        readonly coins: number;
        readonly durationDays: number;
    };
};
export type SupportedSubscriptionPlan = keyof typeof SUBSCRIPTION_BILLING;
export declare function getSubscriptionBilling(plan?: string | null): {
    readonly priceUsd: number;
    readonly stripeAmountCents: number;
    readonly paystackAmountNgn: number;
    readonly coins: number;
    readonly durationDays: number;
};
export declare function isSupportedSubscriptionPlan(plan?: string | null): plan is SupportedSubscriptionPlan;
export declare function getSupportedSubscriptionPlans(): SupportedSubscriptionPlan[];
