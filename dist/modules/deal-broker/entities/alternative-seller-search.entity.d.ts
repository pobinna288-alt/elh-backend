import { User } from '../../users/entities/user.entity';
import { Deal } from './deal.entity';
export declare class AlternativeSellerSearch {
    id: string;
    dealId: string;
    deal: Deal;
    buyerId: string;
    buyer: User;
    originalSellerId: string;
    budget: number;
    category: string;
    targetLocation: string;
    requiredAttention: number;
    campaignDuration: number;
    matchedSellers: {
        sellerId: string;
        expectedPrice: number;
        attentionScore: number;
        matchScore: number;
        dealSuccessRate: number;
        responseSpeed: number;
    }[];
    totalCandidates: number;
    returnedCount: number;
    triggerReason: string;
    selectedSellerId: string;
    chatCreated: boolean;
    createdAt: Date;
}
