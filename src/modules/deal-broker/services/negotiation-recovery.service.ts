import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NegotiationChat } from '../entities/negotiation-chat.entity';
import { Message } from '../../messages/entities/message.entity';

/**
 * NegotiationRecoveryService
 *
 * Handles auto-chat creation when a buyer selects a recommended
 * alternative seller. Attaches campaign details and negotiation
 * context, and activates the Negotiation AI for the new conversation.
 *
 * Future-ready for:
 * - multi-seller negotiation
 * - campaign splitting
 * - automatic deal acceptance
 * - AI autonomous negotiation
 */
@Injectable()
export class NegotiationRecoveryService {
  private readonly logger = new Logger(NegotiationRecoveryService.name);

  constructor(
    @InjectRepository(NegotiationChat)
    private readonly chatRepository: Repository<NegotiationChat>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  // ════════════════════════════════════════════
  // AUTO CHAT CREATION (Requirement #7)
  // ════════════════════════════════════════════

  /**
   * createNegotiationChat(buyer_id, seller_id)
   *
   * Automatically:
   * - Creates new conversation
   * - Attaches campaign details
   * - Attaches negotiation context
   * - Activates Negotiation AI
   */
  async createNegotiationChat(
    buyerId: string,
    sellerId: string,
    context: {
      dealId: string;
      category: string;
      budget: number;
      requiredAttention: number;
      campaignDuration: number;
      targetLocation: string;
      previousPrice: number;
      rejectionReason: string;
      matchScore: number;
    },
  ): Promise<NegotiationChat> {
    this.logger.log(
      `Creating negotiation chat: buyer=${buyerId}, seller=${sellerId}, deal=${context.dealId}`,
    );

    // Create the negotiation chat record
    const chat = this.chatRepository.create({
      dealId: context.dealId,
      buyerId,
      sellerId,
      campaignDetails: {
        category: context.category,
        budget: context.budget,
        requiredAttention: context.requiredAttention,
        campaignDuration: context.campaignDuration,
        targetLocation: context.targetLocation,
      },
      negotiationContext: {
        originalDealId: context.dealId,
        previousPrice: context.previousPrice,
        rejectionReason: context.rejectionReason,
        buyerBudget: context.budget,
        matchScore: context.matchScore,
      },
      negotiationAiActive: true,
      status: 'active',
    });

    const savedChat = await this.chatRepository.save(chat);

    // Send an initial system message to start the conversation
    await this.sendInitialMessage(buyerId, sellerId, context);

    this.logger.log(
      `Negotiation chat created: chatId=${savedChat.id}, AI active=true`,
    );

    return savedChat;
  }

  // ════════════════════════════════════════════
  // INITIAL MESSAGE
  // ════════════════════════════════════════════

  /**
   * Send an introduction message from the buyer to the new seller,
   * bridging context from the previous failed negotiation.
   */
  private async sendInitialMessage(
    buyerId: string,
    sellerId: string,
    context: {
      category: string;
      budget: number;
      requiredAttention: number;
      campaignDuration: number;
      targetLocation: string;
    },
  ): Promise<void> {
    const introMessage = this.generateIntroMessage(context);

    const message = this.messageRepository.create({
      senderId: buyerId,
      receiverId: sellerId,
      content: introMessage,
      isRead: false,
    });

    await this.messageRepository.save(message);

    this.logger.debug(
      `Initial negotiation message sent from ${buyerId} to ${sellerId}`,
    );
  }

  private generateIntroMessage(context: {
    category: string;
    budget: number;
    requiredAttention: number;
    campaignDuration: number;
    targetLocation: string;
  }): string {
    const parts = [
      `Hi! I'm interested in a ${context.category} campaign opportunity.`,
    ];

    if (context.budget > 0) {
      parts.push(`My budget is around $${context.budget}.`);
    }

    if (context.requiredAttention > 0) {
      parts.push(
        `I'm looking for approximately ${context.requiredAttention} attention/views.`,
      );
    }

    if (context.campaignDuration > 0) {
      parts.push(`Campaign duration: ${context.campaignDuration} days.`);
    }

    if (context.targetLocation) {
      parts.push(`Target location: ${context.targetLocation}.`);
    }

    parts.push(
      "You were recommended as a great match for my needs. Let's discuss the details!",
    );

    return parts.join(' ');
  }

  // ════════════════════════════════════════════
  // CHAT MANAGEMENT
  // ════════════════════════════════════════════

  async getChatById(chatId: string): Promise<NegotiationChat | null> {
    return this.chatRepository.findOne({
      where: { id: chatId },
    });
  }

  async getChatsByBuyer(buyerId: string): Promise<NegotiationChat[]> {
    return this.chatRepository.find({
      where: { buyerId },
      order: { createdAt: 'DESC' },
    });
  }

  async deactivateNegotiationAi(chatId: string): Promise<void> {
    await this.chatRepository.update(chatId, {
      negotiationAiActive: false,
    });
  }

  async closeChat(chatId: string): Promise<void> {
    await this.chatRepository.update(chatId, {
      status: 'completed',
      negotiationAiActive: false,
    });
  }
}
