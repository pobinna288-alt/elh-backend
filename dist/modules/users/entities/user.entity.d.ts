import { Ad } from '../../ads/entities/ad.entity';
import { Comment } from '../../comments/entities/comment.entity';
import { Message } from '../../messages/entities/message.entity';
import { Transaction } from '../../wallet/entities/transaction.entity';
export declare enum UserRole {
    USER = "user",
    PREMIUM = "premium",
    PRO = "pro",
    HOT = "hot",
    ADMIN = "admin"
}
export declare enum SubscriptionPlan {
    FREE = "free",
    PREMIUM = "premium",
    PRO_BUSINESS = "pro_business",
    HOT_BUSINESS = "hot_business",
    ENTERPRISE = "enterprise"
}
export declare class User {
    id: string;
    email: string;
    password: string;
    fullName: string;
    username: string;
    age: number;
    location: string;
    role: UserRole;
    coins: number;
    streakDays: number;
    lastStreakDate: Date;
    trustScore: number;
    isVerified: boolean;
    isEmailVerified: boolean;
    profilePhoto: string;
    referralCode: string;
    referredBy: string;
    referralCount: number;
    referralEarnings: number;
    premiumExpiresAt: Date;
    premiumPaymentMethod: string;
    emailNotifications: boolean;
    pushNotifications: boolean;
    privacyMode: boolean;
    failedLoginAttempts: number;
    lockedUntil: Date;
    lastLoginAt: Date;
    resetToken: string;
    resetTokenExpiry: Date;
    plan: SubscriptionPlan;
    subscriptionActive: boolean;
    subscriptionExpiry: Date;
    negotiationAiEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    ads: Ad[];
    comments: Comment[];
    sentMessages: Message[];
    receivedMessages: Message[];
    transactions: Transaction[];
}
