"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var NegotiationRecoveryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NegotiationRecoveryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const negotiation_chat_entity_1 = require("../entities/negotiation-chat.entity");
const message_entity_1 = require("../../messages/entities/message.entity");
let NegotiationRecoveryService = NegotiationRecoveryService_1 = class NegotiationRecoveryService {
    constructor(chatRepository, messageRepository) {
        this.chatRepository = chatRepository;
        this.messageRepository = messageRepository;
        this.logger = new common_1.Logger(NegotiationRecoveryService_1.name);
    }
    async createNegotiationChat(buyerId, sellerId, context) {
        this.logger.log(`Creating negotiation chat: buyer=${buyerId}, seller=${sellerId}, deal=${context.dealId}`);
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
        await this.sendInitialMessage(buyerId, sellerId, context);
        this.logger.log(`Negotiation chat created: chatId=${savedChat.id}, AI active=true`);
        return savedChat;
    }
    async sendInitialMessage(buyerId, sellerId, context) {
        const introMessage = this.generateIntroMessage(context);
        const message = this.messageRepository.create({
            senderId: buyerId,
            receiverId: sellerId,
            content: introMessage,
            isRead: false,
        });
        await this.messageRepository.save(message);
        this.logger.debug(`Initial negotiation message sent from ${buyerId} to ${sellerId}`);
    }
    generateIntroMessage(context) {
        const parts = [
            `Hi! I'm interested in a ${context.category} campaign opportunity.`,
        ];
        if (context.budget > 0) {
            parts.push(`My budget is around $${context.budget}.`);
        }
        if (context.requiredAttention > 0) {
            parts.push(`I'm looking for approximately ${context.requiredAttention} attention/views.`);
        }
        if (context.campaignDuration > 0) {
            parts.push(`Campaign duration: ${context.campaignDuration} days.`);
        }
        if (context.targetLocation) {
            parts.push(`Target location: ${context.targetLocation}.`);
        }
        parts.push("You were recommended as a great match for my needs. Let's discuss the details!");
        return parts.join(' ');
    }
    async getChatById(chatId) {
        return this.chatRepository.findOne({
            where: { id: chatId },
        });
    }
    async getChatsByBuyer(buyerId) {
        return this.chatRepository.find({
            where: { buyerId },
            order: { createdAt: 'DESC' },
        });
    }
    async deactivateNegotiationAi(chatId) {
        await this.chatRepository.update(chatId, {
            negotiationAiActive: false,
        });
    }
    async closeChat(chatId) {
        await this.chatRepository.update(chatId, {
            status: 'completed',
            negotiationAiActive: false,
        });
    }
};
exports.NegotiationRecoveryService = NegotiationRecoveryService;
exports.NegotiationRecoveryService = NegotiationRecoveryService = NegotiationRecoveryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(negotiation_chat_entity_1.NegotiationChat)),
    __param(1, (0, typeorm_1.InjectRepository)(message_entity_1.Message)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], NegotiationRecoveryService);
//# sourceMappingURL=negotiation-recovery.service.js.map