import { User } from '../../users/entities/user.entity';
export declare enum TransactionType {
    EARN_VIDEO = "earn_video",
    EARN_STREAK = "earn_streak",
    EARN_REFERRAL = "earn_referral",
    SPEND_PREMIUM = "spend_premium",
    SPEND_BOOST = "spend_boost",
    PAYMENT_STRIPE = "payment_stripe",
    PAYMENT_PAYSTACK = "payment_paystack"
}
export declare enum TransactionStatus {
    PENDING = "pending",
    COMPLETED = "completed",
    FAILED = "failed"
}
export declare class Transaction {
    id: string;
    type: TransactionType;
    amount: number;
    currency: string;
    status: TransactionStatus;
    description: string;
    referenceId: string;
    user: User;
    userId: string;
    createdAt: Date;
}
