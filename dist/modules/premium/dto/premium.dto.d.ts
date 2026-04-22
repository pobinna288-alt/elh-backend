export declare class UnlockPremiumDto {
    paymentMethod: 'card' | 'coins';
    paystackReference?: string;
    durationDays?: number;
}
export declare class PremiumActivationResponseDto {
    subscription_status: string;
    plan: string;
    payment_method: string;
    expiry_date: Date;
    remaining_coins: number;
}
