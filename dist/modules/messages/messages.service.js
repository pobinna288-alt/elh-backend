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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const message_entity_1 = require("./entities/message.entity");
const conversation_entity_1 = require("./entities/conversation.entity");
const ad_entity_1 = require("../ads/entities/ad.entity");
const user_entity_1 = require("../users/entities/user.entity");
const notifications_service_1 = require("../notifications/notifications.service");
const DEFAULT_QUICK_REPLIES = [
    'Is this still available?',
    "What's the final price?",
    'Where are you located?',
    'Do you offer delivery?',
];
const PRE_FILLED_MESSAGE_TEMPLATE = "Hi, I'm interested in the [Product Name] listed on your ad.\nIs it still available?";
let MessagesService = class MessagesService {
    constructor(messageRepository, conversationRepository, adRepository, userRepository, notificationsService) {
        this.messageRepository = messageRepository;
        this.conversationRepository = conversationRepository;
        this.adRepository = adRepository;
        this.userRepository = userRepository;
        this.notificationsService = notificationsService;
    }
    async startConversation(startDto, buyerId) {
        const ad = await this.adRepository.findOne({
            where: { id: startDto.adId },
            relations: ['author'],
        });
        if (!ad) {
            throw new common_1.NotFoundException('Product not found');
        }
        const sellerId = ad.authorId;
        if (sellerId === buyerId) {
            throw new common_1.BadRequestException('You cannot message yourself');
        }
        let conversation = await this.conversationRepository.findOne({
            where: {
                buyerId,
                sellerId,
                adId: startDto.adId,
            },
            relations: ['buyer', 'seller', 'ad', 'messages'],
        });
        const sellerResponseStats = await this.calculateSellerResponseStats(sellerId);
        if (!conversation) {
            conversation = this.conversationRepository.create({
                buyerId,
                sellerId,
                adId: startDto.adId,
                productName: ad.title,
                productPrice: ad.price,
                productCurrency: ad.currency || 'USD',
                productThumbnail: ad.thumbnailUrl || ad.mediaUrls?.[0] || null,
                isActive: true,
                averageResponseTime: sellerResponseStats.averageResponseTime,
            });
            conversation = await this.conversationRepository.save(conversation);
            conversation = await this.conversationRepository.findOne({
                where: { id: conversation.id },
                relations: ['buyer', 'seller', 'ad', 'messages'],
            });
        }
        const preFilledMessage = this.generatePreFilledMessage(ad.title);
        const seller = await this.userRepository.findOne({ where: { id: sellerId } });
        const productCard = {
            productName: ad.title,
            productPrice: ad.price,
            productCurrency: ad.currency || 'USD',
            productThumbnail: ad.thumbnailUrl || ad.mediaUrls?.[0] || null,
            sellerName: seller?.username || seller?.fullName || 'Seller',
            sellerId,
        };
        const sellerResponseIndicator = this.getSellerResponseIndicatorText(sellerResponseStats.averageResponseTime);
        const response = {
            conversationId: conversation.id,
            productCard,
            preFilledMessage,
            quickReplies: DEFAULT_QUICK_REPLIES,
            sellerResponseIndicator,
            sellerAverageResponseTime: sellerResponseStats.averageResponseTime,
            messageSent: false,
            messages: conversation.messages || [],
        };
        if (startDto.autoSend) {
            const messageContent = startDto.initialMessage || preFilledMessage;
            const message = await this.createMessageInConversation({
                content: messageContent,
                receiverId: sellerId,
                conversationId: conversation.id,
                adId: startDto.adId,
                messageType: message_entity_1.MessageType.PRE_FILLED,
            }, buyerId);
            response.messageSent = true;
            response.messageId = message.id;
            response.messages = [...(conversation.messages || []), message];
        }
        return response;
    }
    generatePreFilledMessage(productName) {
        return PRE_FILLED_MESSAGE_TEMPLATE.replace('[Product Name]', productName);
    }
    async calculateSellerResponseStats(sellerId) {
        const conversations = await this.conversationRepository.find({
            where: { sellerId },
        });
        if (conversations.length === 0) {
            return { averageResponseTime: 0, totalResponses: 0 };
        }
        let totalResponseTime = 0;
        let totalResponses = 0;
        for (const conv of conversations) {
            if (conv.sellerMessageCount > 0) {
                totalResponseTime += conv.totalResponseTime;
                totalResponses += conv.sellerMessageCount;
            }
        }
        const averageResponseTime = totalResponses > 0
            ? totalResponseTime / totalResponses
            : 0;
        return { averageResponseTime, totalResponses };
    }
    getSellerResponseIndicatorText(avgSeconds) {
        if (avgSeconds === 0) {
            return 'New seller - no response history yet';
        }
        if (avgSeconds <= 300) {
            return 'Seller usually replies within 5 minutes';
        }
        else if (avgSeconds <= 600) {
            return 'Seller usually replies within 10 minutes';
        }
        else if (avgSeconds <= 3600) {
            return 'Seller usually replies within 1 hour';
        }
        else {
            return 'Seller usually replies within a few hours';
        }
    }
    async create(createMessageDto, senderId) {
        if (createMessageDto.conversationId) {
            return this.createMessageInConversation(createMessageDto, senderId);
        }
        const existingConversation = await this.findOrCreateConversation(senderId, createMessageDto.receiverId, createMessageDto.adId);
        return this.createMessageInConversation({
            ...createMessageDto,
            conversationId: existingConversation.id,
        }, senderId);
    }
    async createMessageInConversation(createMessageDto, senderId) {
        const conversation = await this.conversationRepository.findOne({
            where: { id: createMessageDto.conversationId },
            relations: ['buyer', 'seller'],
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        if (conversation.buyerId !== senderId && conversation.sellerId !== senderId) {
            throw new common_1.ForbiddenException('You are not part of this conversation');
        }
        const isBuyer = conversation.buyerId === senderId;
        if ((isBuyer && conversation.isBlockedBySeller) ||
            (!isBuyer && conversation.isBlockedByBuyer)) {
            throw new common_1.ForbiddenException('You cannot send messages to this user');
        }
        const message = this.messageRepository.create({
            content: createMessageDto.content,
            senderId,
            receiverId: createMessageDto.receiverId,
            conversationId: conversation.id,
            adId: createMessageDto.adId || conversation.adId,
            messageType: createMessageDto.messageType || message_entity_1.MessageType.TEXT,
            mediaUrl: createMessageDto.mediaUrl,
            status: message_entity_1.MessageStatus.SENT,
        });
        const savedMessage = await this.messageRepository.save(message);
        conversation.lastMessageContent = createMessageDto.content;
        conversation.lastMessageAt = new Date();
        conversation.lastMessageSenderId = senderId;
        conversation.isActive = true;
        if (isBuyer) {
            conversation.sellerUnreadCount += 1;
        }
        else {
            conversation.buyerUnreadCount += 1;
        }
        if (!isBuyer && conversation.lastMessageSenderId !== senderId) {
            await this.updateSellerResponseTime(conversation, savedMessage.createdAt);
        }
        await this.conversationRepository.save(conversation);
        await this.notificationsService.notifyNewMessage(createMessageDto.receiverId, senderId);
        return savedMessage;
    }
    async findOrCreateConversation(userId, otherUserId, adId) {
        let conversation = await this.conversationRepository.findOne({
            where: [
                { buyerId: userId, sellerId: otherUserId, adId: adId || (0, typeorm_2.IsNull)() },
                { buyerId: otherUserId, sellerId: userId, adId: adId || (0, typeorm_2.IsNull)() },
            ],
        });
        if (!conversation) {
            let buyerId = userId;
            let sellerId = otherUserId;
            let productName = null;
            let productPrice = null;
            let productCurrency = 'USD';
            let productThumbnail = null;
            if (adId) {
                const ad = await this.adRepository.findOne({ where: { id: adId } });
                if (ad) {
                    sellerId = ad.authorId;
                    buyerId = sellerId === userId ? otherUserId : userId;
                    productName = ad.title;
                    productPrice = ad.price;
                    productCurrency = ad.currency || 'USD';
                    productThumbnail = ad.thumbnailUrl || ad.mediaUrls?.[0] || null;
                }
            }
            conversation = this.conversationRepository.create({
                buyerId,
                sellerId,
                adId,
                productName,
                productPrice,
                productCurrency,
                productThumbnail,
                isActive: true,
            });
            conversation = await this.conversationRepository.save(conversation);
        }
        return conversation;
    }
    async updateSellerResponseTime(conversation, responseTime) {
        const lastBuyerMessage = await this.messageRepository.findOne({
            where: {
                conversationId: conversation.id,
                senderId: conversation.buyerId,
            },
            order: { createdAt: 'DESC' },
        });
        if (lastBuyerMessage) {
            const responseSeconds = (responseTime.getTime() - lastBuyerMessage.createdAt.getTime()) / 1000;
            conversation.sellerMessageCount += 1;
            conversation.totalResponseTime += responseSeconds;
            conversation.averageResponseTime =
                conversation.totalResponseTime / conversation.sellerMessageCount;
        }
    }
    async sendQuickReply(dto, senderId) {
        const conversation = await this.conversationRepository.findOne({
            where: { id: dto.conversationId },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        const receiverId = dto.receiverId ||
            (conversation.buyerId === senderId ? conversation.sellerId : conversation.buyerId);
        return this.createMessageInConversation({
            content: dto.quickReplyContent,
            receiverId,
            conversationId: dto.conversationId,
            messageType: message_entity_1.MessageType.QUICK_REPLY,
        }, senderId);
    }
    getQuickReplies() {
        return DEFAULT_QUICK_REPLIES;
    }
    async getConversations(userId) {
        const conversations = await this.conversationRepository.find({
            where: [
                { buyerId: userId, isArchivedByBuyer: false },
                { sellerId: userId, isArchivedBySeller: false },
            ],
            relations: ['buyer', 'seller', 'ad'],
            order: { lastMessageAt: 'DESC' },
        });
        return {
            count: conversations.length,
            conversations: conversations.map(conv => ({
                id: conv.id,
                otherUser: conv.buyerId === userId ? {
                    id: conv.seller?.id,
                    username: conv.seller?.username,
                    fullName: conv.seller?.fullName,
                    profilePhoto: conv.seller?.profilePhoto,
                } : {
                    id: conv.buyer?.id,
                    username: conv.buyer?.username,
                    fullName: conv.buyer?.fullName,
                    profilePhoto: conv.buyer?.profilePhoto,
                },
                productCard: {
                    productName: conv.productName,
                    productPrice: conv.productPrice,
                    productCurrency: conv.productCurrency,
                    productThumbnail: conv.productThumbnail,
                    adId: conv.adId,
                    adActive: !!conv.ad,
                },
                lastMessage: conv.lastMessageContent,
                lastMessageAt: conv.lastMessageAt,
                unreadCount: conv.buyerId === userId
                    ? conv.buyerUnreadCount
                    : conv.sellerUnreadCount,
                sellerResponseIndicator: this.getSellerResponseIndicatorText(conv.averageResponseTime),
                isBuyer: conv.buyerId === userId,
            })),
        };
    }
    async getConversationById(conversationId, userId) {
        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId },
            relations: ['buyer', 'seller', 'ad', 'messages'],
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
            throw new common_1.ForbiddenException('You are not part of this conversation');
        }
        const messages = await this.messageRepository.find({
            where: { conversationId },
            relations: ['sender', 'receiver'],
            order: { createdAt: 'ASC' },
        });
        return {
            conversation: {
                id: conversation.id,
                productCard: {
                    productName: conversation.productName,
                    productPrice: conversation.productPrice,
                    productCurrency: conversation.productCurrency,
                    productThumbnail: conversation.productThumbnail,
                    adId: conversation.adId,
                    adActive: !!conversation.ad,
                },
                buyer: {
                    id: conversation.buyer?.id,
                    username: conversation.buyer?.username,
                    profilePhoto: conversation.buyer?.profilePhoto,
                },
                seller: {
                    id: conversation.seller?.id,
                    username: conversation.seller?.username,
                    profilePhoto: conversation.seller?.profilePhoto,
                },
                sellerResponseIndicator: this.getSellerResponseIndicatorText(conversation.averageResponseTime),
                isBuyer: conversation.buyerId === userId,
            },
            messages: messages.map(msg => ({
                id: msg.id,
                content: msg.content,
                senderId: msg.senderId,
                senderUsername: msg.sender?.username,
                status: msg.status,
                statusIndicator: msg.getStatusIndicator(),
                messageType: msg.messageType,
                mediaUrl: msg.mediaUrl,
                createdAt: msg.createdAt,
                isOwn: msg.senderId === userId,
            })),
            quickReplies: DEFAULT_QUICK_REPLIES,
        };
    }
    async getConversation(userId, otherUserId) {
        const messages = await this.messageRepository.find({
            where: [
                { senderId: userId, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: userId },
            ],
            relations: ['sender', 'receiver'],
            order: { createdAt: 'ASC' },
        });
        return {
            count: messages.length,
            messages,
        };
    }
    async updateMessageStatus(messageId, status, userId) {
        const message = await this.messageRepository.findOne({
            where: { id: messageId },
        });
        if (!message) {
            throw new common_1.NotFoundException('Message not found');
        }
        if (message.receiverId !== userId) {
            throw new common_1.ForbiddenException('You can only update status of messages sent to you');
        }
        message.status = status;
        if (status === message_entity_1.MessageStatus.DELIVERED && !message.deliveredAt) {
            message.deliveredAt = new Date();
        }
        if (status === message_entity_1.MessageStatus.READ) {
            message.isRead = true;
            message.readAt = new Date();
            if (!message.deliveredAt) {
                message.deliveredAt = new Date();
            }
        }
        return this.messageRepository.save(message);
    }
    async markAsRead(id, userId) {
        return this.updateMessageStatus(id, message_entity_1.MessageStatus.READ, userId);
    }
    async markMessagesAsRead(dto, userId) {
        const messages = await this.messageRepository.find({
            where: {
                id: (0, typeorm_2.In)(dto.messageIds),
                receiverId: userId,
            },
        });
        const updates = messages.map(msg => {
            msg.status = message_entity_1.MessageStatus.READ;
            msg.isRead = true;
            msg.readAt = new Date();
            if (!msg.deliveredAt) {
                msg.deliveredAt = new Date();
            }
            return msg;
        });
        await this.messageRepository.save(updates);
        const conversationIds = [...new Set(messages.map(m => m.conversationId))];
        for (const convId of conversationIds) {
            if (convId) {
                await this.updateConversationUnreadCount(convId, userId);
            }
        }
        return {
            message: `${updates.length} messages marked as read`,
            count: updates.length,
        };
    }
    async markConversationAsRead(conversationId, userId) {
        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        await this.messageRepository.update({
            conversationId,
            receiverId: userId,
            status: (0, typeorm_2.Not)(message_entity_1.MessageStatus.READ),
        }, {
            status: message_entity_1.MessageStatus.READ,
            isRead: true,
            readAt: new Date(),
        });
        await this.updateConversationUnreadCount(conversationId, userId);
        return { message: 'Conversation marked as read' };
    }
    async updateConversationUnreadCount(conversationId, userId) {
        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId },
        });
        if (!conversation)
            return;
        const unreadCount = await this.messageRepository.count({
            where: {
                conversationId,
                receiverId: userId,
                status: (0, typeorm_2.Not)(message_entity_1.MessageStatus.READ),
            },
        });
        if (conversation.buyerId === userId) {
            conversation.buyerUnreadCount = unreadCount;
        }
        else {
            conversation.sellerUnreadCount = unreadCount;
        }
        await this.conversationRepository.save(conversation);
    }
    async getUnreadCount(userId) {
        const count = await this.messageRepository.count({
            where: {
                receiverId: userId,
                status: (0, typeorm_2.Not)(message_entity_1.MessageStatus.READ),
            },
        });
        return { count };
    }
    async getUnreadCountsByConversation(userId) {
        const conversations = await this.conversationRepository.find({
            where: [
                { buyerId: userId },
                { sellerId: userId },
            ],
        });
        const counts = {};
        let total = 0;
        for (const conv of conversations) {
            const count = conv.buyerId === userId
                ? conv.buyerUnreadCount
                : conv.sellerUnreadCount;
            if (count > 0) {
                counts[conv.id] = count;
                total += count;
            }
        }
        return {
            total,
            byConversation: counts,
        };
    }
    async getSellerResponseIndicator(sellerId) {
        const stats = await this.calculateSellerResponseStats(sellerId);
        return {
            averageResponseTime: stats.averageResponseTime,
            totalResponses: stats.totalResponses,
            indicator: this.getSellerResponseIndicatorText(stats.averageResponseTime),
        };
    }
    async archiveConversation(conversationId, userId, archive) {
        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        if (conversation.buyerId === userId) {
            conversation.isArchivedByBuyer = archive;
        }
        else if (conversation.sellerId === userId) {
            conversation.isArchivedBySeller = archive;
        }
        else {
            throw new common_1.ForbiddenException('You are not part of this conversation');
        }
        await this.conversationRepository.save(conversation);
        return { message: archive ? 'Conversation archived' : 'Conversation unarchived' };
    }
    async blockUser(conversationId, userId, block) {
        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        if (conversation.buyerId === userId) {
            conversation.isBlockedByBuyer = block;
        }
        else if (conversation.sellerId === userId) {
            conversation.isBlockedBySeller = block;
        }
        else {
            throw new common_1.ForbiddenException('You are not part of this conversation');
        }
        await this.conversationRepository.save(conversation);
        return { message: block ? 'User blocked' : 'User unblocked' };
    }
    async remove(id, userId) {
        const message = await this.messageRepository.findOne({ where: { id } });
        if (!message) {
            throw new common_1.NotFoundException('Message not found');
        }
        if (message.senderId !== userId && message.receiverId !== userId) {
            throw new common_1.ForbiddenException('You can only delete your own messages');
        }
        await this.messageRepository.remove(message);
        return { message: 'Message deleted successfully' };
    }
};
exports.MessagesService = MessagesService;
exports.MessagesService = MessagesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(message_entity_1.Message)),
    __param(1, (0, typeorm_1.InjectRepository)(conversation_entity_1.Conversation)),
    __param(2, (0, typeorm_1.InjectRepository)(ad_entity_1.Ad)),
    __param(3, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        notifications_service_1.NotificationsService])
], MessagesService);
//# sourceMappingURL=messages.service.js.map