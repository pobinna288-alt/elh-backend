import { User } from '../../users/entities/user.entity';
export declare enum DealStatus {
    PENDING = "pending",
    ACCEPTED = "accepted",
    REJECTED = "rejected",
    COUNTER_OFFERED = "counter_offered",
    EXPIRED = "expired",
    CANCELLED = "cancelled",
    COMPLETED = "completed"
}
export declare class Deal {
    id: string;
    buyerId: string;
    buyer: User;
    sellerId: string;
    seller: User;
    adId: string;
    category: string;
    originalPrice: number;
    offeredPrice: number;
    counterPrice: number;
    finalPrice: number;
    currency: string;
    targetLocation: string;
    requiredAttention: number;
    campaignDuration: number;
    budget: number;
    status: DealStatus;
    sellerDeclined: boolean;
    negotiationDeadline: Date;
    rejectionReason: string;
    notes: string;
    alternativeSearchTriggered: boolean;
    rejectedSellerIds: string[];
    createdAt: Date;
    updatedAt: Date;
}
