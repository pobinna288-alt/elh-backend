import { Repository } from 'typeorm';
import { NegotiationChat } from '../entities/negotiation-chat.entity';
import { Message } from '../../messages/entities/message.entity';
export declare class NegotiationRecoveryService {
    private readonly chatRepository;
    private readonly messageRepository;
    private readonly logger;
    constructor(chatRepository: Repository<NegotiationChat>, messageRepository: Repository<Message>);
    createNegotiationChat(buyerId: string, sellerId: string, context: {
        dealId: string;
        category: string;
        budget: number;
        requiredAttention: number;
        campaignDuration: number;
        targetLocation: string;
        previousPrice: number;
        rejectionReason: string;
        matchScore: number;
    }): Promise<NegotiationChat>;
    private sendInitialMessage;
    private generateIntroMessage;
    getChatById(chatId: string): Promise<NegotiationChat | null>;
    getChatsByBuyer(buyerId: string): Promise<NegotiationChat[]>;
    deactivateNegotiationAi(chatId: string): Promise<void>;
    closeChat(chatId: string): Promise<void>;
}
