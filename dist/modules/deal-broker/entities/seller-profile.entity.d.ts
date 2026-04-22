import { User } from '../../users/entities/user.entity';
export declare class SellerProfile {
    id: string;
    userId: string;
    user: User;
    category: string;
    location: string;
    availability: boolean;
    attentionScore: number;
    pricePerAttention: number;
    dealSuccessRate: number;
    responseSpeed: number;
    totalDeals: number;
    successfulDeals: number;
    failedDeals: number;
    avgRating: number;
    isBlocked: boolean;
    blockedByUserIds: string[];
    createdAt: Date;
}
