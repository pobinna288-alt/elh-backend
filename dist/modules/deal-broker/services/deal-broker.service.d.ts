import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Deal } from '../entities/deal.entity';
import { AlternativeSellerSearch } from '../entities/alternative-seller-search.entity';
import { SellerMatchingService } from './seller-matching.service';
import { DealBrokerUsageLimiterService } from './deal-broker-usage-limiter.service';
import { NegotiationRecoveryService } from './negotiation-recovery.service';
import { AlternativeSearchResultDto, DealBrokerAccessResult } from '../dto/deal-broker.dto';
export declare class DealBrokerService {
    private readonly userRepository;
    private readonly dealRepository;
    private readonly searchRepository;
    private readonly sellerMatchingService;
    private readonly usageLimiterService;
    private readonly recoveryService;
    private readonly logger;
    private readonly ALLOWED_PLANS;
    private readonly PRICE_DIFFERENCE_THRESHOLD;
    constructor(userRepository: Repository<User>, dealRepository: Repository<Deal>, searchRepository: Repository<AlternativeSellerSearch>, sellerMatchingService: SellerMatchingService, usageLimiterService: DealBrokerUsageLimiterService, recoveryService: NegotiationRecoveryService);
    checkAccess(userId: string): Promise<DealBrokerAccessResult>;
    onNegotiationFailed(dealId: string, userId: string): Promise<AlternativeSearchResultDto>;
    private extractBuyerRequirements;
    private determineTriggerReason;
    selectAlternativeSeller(userId: string, searchId: string, sellerId: string): Promise<{
        chatId: string;
        message: string;
        negotiationAiActive: boolean;
    }>;
    getSearchHistory(userId: string, limit?: number): Promise<AlternativeSellerSearch[]>;
    getDealById(dealId: string, userId: string): Promise<Deal>;
}
