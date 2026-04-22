import { User } from '../../users/entities/user.entity';
export declare class NegotiationChat {
    id: string;
    dealId: string;
    buyerId: string;
    buyer: User;
    sellerId: string;
    seller: User;
    campaignDetails: {
        category: string;
        budget: number;
        requiredAttention: number;
        campaignDuration: number;
        targetLocation: string;
    };
    negotiationContext: {
        originalDealId: string;
        previousPrice: number;
        rejectionReason: string;
        buyerBudget: number;
        matchScore: number;
    };
    negotiationAiActive: boolean;
    status: string;
    createdAt: Date;
}
