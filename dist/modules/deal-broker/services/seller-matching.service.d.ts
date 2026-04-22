import { Repository } from 'typeorm';
import { SellerProfile } from '../entities/seller-profile.entity';
export declare class SellerMatchingService {
    private readonly sellerProfileRepository;
    private readonly logger;
    private readonly SCORE_WEIGHTS;
    private readonly MAX_CANDIDATES;
    private readonly TOP_RESULTS;
    private readonly MIN_ATTENTION_THRESHOLD;
    constructor(sellerProfileRepository: Repository<SellerProfile>);
    findCandidateSellers(buyerRequirements: {
        buyerId: string;
        budget: number;
        requiredAttention: number;
        category: string;
        targetLocation?: string;
        campaignDuration: number;
        excludeSellerIds: string[];
    }): Promise<SellerProfile[]>;
    scoreAndRankSellers(candidates: SellerProfile[], buyerBudget: number, requiredAttention: number): {
        sellerId: string;
        expectedPrice: number;
        attentionScore: number;
        matchScore: number;
        dealSuccessRate: number;
        responseSpeed: number;
    }[];
    getSellerProfile(userId: string): Promise<SellerProfile | null>;
    updateSellerMetrics(userId: string, update: Partial<SellerProfile>): Promise<void>;
    recalculateDealStats(userId: string, outcome: 'success' | 'failure'): Promise<void>;
}
