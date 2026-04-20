import { 
  Injectable, 
  NotFoundException, 
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull } from 'typeorm';
import { Message, MessageStatus, MessageType } from './entities/message.entity';
import { Conversation } from './entities/conversation.entity';
import { Ad } from '../ads/entities/ad.entity';
import { User } from '../users/entities/user.entity';
import { 
  CreateMessageDto,
  StartConversationDto,
  ConversationInitResponse,
  MarkMessagesReadDto,
  SendQuickReplyDto,
} from './dto';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Default Quick Reply Suggestions
 * These appear when a buyer opens a chat
 */
const DEFAULT_QUICK_REPLIES = [
  'Is this still available?',
  "What's the final price?",
  'Where are you located?',
  'Do you offer delivery?',
];

/**
 * Pre-filled Message Template
 * Replaces [Product Name] with actual product title
 */
const PRE_FILLED_MESSAGE_TEMPLATE = 
  "Hi, I'm interested in the [Product Name] listed on your ad.\nIs it still available?";

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Ad)
    private adRepository: Repository<Ad>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationsService: NotificationsService,
  ) {}

  // ========================================
  // CONVERSATION INITIALIZATION
  // ========================================

  /**
   * Start a new conversation from a product listing
   * Called when buyer clicks "Message Seller"
   * 
   * Features:
   * - Generates pre-filled message with product name
   * - Creates product preview card
   * - Provides quick reply suggestions
   * - Shows seller response indicator
   */
  async startConversation(
    startDto: StartConversationDto,
    buyerId: string,
  ): Promise<ConversationInitResponse> {
    // Get the ad/product details
    const ad = await this.adRepository.findOne({
      where: { id: startDto.adId },
      relations: ['author'],
    });

    if (!ad) {
      throw new NotFoundException('Product not found');
    }

    const sellerId = ad.authorId;

    // Prevent messaging yourself
    if (sellerId === buyerId) {
      throw new BadRequestException('You cannot message yourself');
    }

    // Check for existing conversation
    let conversation = await this.conversationRepository.findOne({
      where: {
        buyerId,
        sellerId,
        adId: startDto.adId,
      },
      relations: ['buyer', 'seller', 'ad', 'messages'],
    });

    // Calculate seller's overall average response time
    const sellerResponseStats = await this.calculateSellerResponseStats(sellerId);

    if (!conversation) {
      // Create new conversation
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

      // Reload with relations
      conversation = await this.conversationRepository.findOne({
        where: { id: conversation.id },
        relations: ['buyer', 'seller', 'ad', 'messages'],
      });
    }

    // Generate pre-filled message
    const preFilledMessage = this.generatePreFilledMessage(ad.title);

    // Get seller user for response indicator
    const seller = await this.userRepository.findOne({ where: { id: sellerId } });

    // Build product card
    const productCard = {
      productName: ad.title,
      productPrice: ad.price,
      productCurrency: ad.currency || 'USD',
      productThumbnail: ad.thumbnailUrl || ad.mediaUrls?.[0] || null,
      sellerName: seller?.username || seller?.fullName || 'Seller',
      sellerId,
    };

    // Generate response indicator text
    const sellerResponseIndicator = this.getSellerResponseIndicatorText(
      sellerResponseStats.averageResponseTime
    );

    // Build response
    const response: ConversationInitResponse = {
      conversationId: conversation.id,
      productCard,
      preFilledMessage,
      quickReplies: DEFAULT_QUICK_REPLIES,
      sellerResponseIndicator,
      sellerAverageResponseTime: sellerResponseStats.averageResponseTime,
      messageSent: false,
      messages: conversation.messages || [],
    };

    // Auto-send initial message if requested
    if (startDto.autoSend) {
      const messageContent = startDto.initialMessage || preFilledMessage;
      const message = await this.createMessageInConversation({
        content: messageContent,
        receiverId: sellerId,
        conversationId: conversation.id,
        adId: startDto.adId,
        messageType: MessageType.PRE_FILLED,
      }, buyerId);

      response.messageSent = true;
      response.messageId = message.id;
      response.messages = [...(conversation.messages || []), message];
    }

    return response;
  }

  /**
   * Generate pre-filled message with product name
   */
  private generatePreFilledMessage(productName: string): string {
    return PRE_FILLED_MESSAGE_TEMPLATE.replace('[Product Name]', productName);
  }

  /**
   * Calculate seller's overall response statistics
   */
  private async calculateSellerResponseStats(sellerId: string): Promise<{
    averageResponseTime: number;
    totalResponses: number;
  }> {
    // Get all conversations where this user is the seller
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

  /**
   * Get human-readable response indicator text
   */
  private getSellerResponseIndicatorText(avgSeconds: number): string {
    if (avgSeconds === 0) {
      return 'New seller - no response history yet';
    }
    
    if (avgSeconds <= 300) { // 5 minutes
      return 'Seller usually replies within 5 minutes';
    } else if (avgSeconds <= 600) { // 10 minutes
      return 'Seller usually replies within 10 minutes';
    } else if (avgSeconds <= 3600) { // 1 hour
      return 'Seller usually replies within 1 hour';
    } else {
      return 'Seller usually replies within a few hours';
    }
  }

  // ========================================
  // MESSAGE CREATION
  // ========================================

  /**
   * Create a new message (legacy compatibility + new features)
   */
  async create(createMessageDto: CreateMessageDto, senderId: string) {
    // If conversationId is provided, use the new method
    if (createMessageDto.conversationId) {
      return this.createMessageInConversation(createMessageDto, senderId);
    }

    // Legacy: find or create conversation based on ad
    const existingConversation = await this.findOrCreateConversation(
      senderId,
      createMessageDto.receiverId,
      createMessageDto.adId,
    );

    return this.createMessageInConversation({
      ...createMessageDto,
      conversationId: existingConversation.id,
    }, senderId);
  }

  /**
   * Create message within a conversation context
   */
  async createMessageInConversation(
    createMessageDto: CreateMessageDto,
    senderId: string,
  ): Promise<Message> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: createMessageDto.conversationId },
      relations: ['buyer', 'seller'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Verify sender is part of this conversation
    if (conversation.buyerId !== senderId && conversation.sellerId !== senderId) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    // Check if blocked
    const isBuyer = conversation.buyerId === senderId;
    if ((isBuyer && conversation.isBlockedBySeller) || 
        (!isBuyer && conversation.isBlockedByBuyer)) {
      throw new ForbiddenException('You cannot send messages to this user');
    }

    // Create message
    const message = this.messageRepository.create({
      content: createMessageDto.content,
      senderId,
      receiverId: createMessageDto.receiverId,
      conversationId: conversation.id,
      adId: createMessageDto.adId || conversation.adId,
      messageType: createMessageDto.messageType || MessageType.TEXT,
      mediaUrl: createMessageDto.mediaUrl,
      status: MessageStatus.SENT,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Update conversation
    conversation.lastMessageContent = createMessageDto.content;
    conversation.lastMessageAt = new Date();
    conversation.lastMessageSenderId = senderId;
    conversation.isActive = true;

    // Update unread counts
    if (isBuyer) {
      conversation.sellerUnreadCount += 1;
    } else {
      conversation.buyerUnreadCount += 1;
    }

    // Calculate response time if seller is responding
    if (!isBuyer && conversation.lastMessageSenderId !== senderId) {
      await this.updateSellerResponseTime(conversation, savedMessage.createdAt);
    }

    await this.conversationRepository.save(conversation);

    // Send notification to receiver
    await this.notificationsService.notifyNewMessage(
      createMessageDto.receiverId,
      senderId,
    );

    return savedMessage;
  }

  /**
   * Find or create a conversation
   */
  private async findOrCreateConversation(
    userId: string,
    otherUserId: string,
    adId?: string,
  ): Promise<Conversation> {
    // Try to find existing conversation
    let conversation = await this.conversationRepository.findOne({
      where: [
        { buyerId: userId, sellerId: otherUserId, adId: adId || IsNull() },
        { buyerId: otherUserId, sellerId: userId, adId: adId || IsNull() },
      ],
    });

    if (!conversation) {
      // Determine buyer/seller based on ad ownership
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

  /**
   * Update seller response time metrics
   */
  private async updateSellerResponseTime(
    conversation: Conversation,
    responseTime: Date,
  ): Promise<void> {
    // Get the last buyer message
    const lastBuyerMessage = await this.messageRepository.findOne({
      where: {
        conversationId: conversation.id,
        senderId: conversation.buyerId,
      },
      order: { createdAt: 'DESC' },
    });

    if (lastBuyerMessage) {
      const responseSeconds = 
        (responseTime.getTime() - lastBuyerMessage.createdAt.getTime()) / 1000;

      conversation.sellerMessageCount += 1;
      conversation.totalResponseTime += responseSeconds;
      conversation.averageResponseTime = 
        conversation.totalResponseTime / conversation.sellerMessageCount;
    }
  }

  // ========================================
  // QUICK REPLIES
  // ========================================

  /**
   * Send a quick reply message
   */
  async sendQuickReply(dto: SendQuickReplyDto, senderId: string): Promise<Message> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: dto.conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Determine receiver
    const receiverId = dto.receiverId || 
      (conversation.buyerId === senderId ? conversation.sellerId : conversation.buyerId);

    return this.createMessageInConversation({
      content: dto.quickReplyContent,
      receiverId,
      conversationId: dto.conversationId,
      messageType: MessageType.QUICK_REPLY,
    }, senderId);
  }

  /**
   * Get available quick replies for a conversation
   */
  getQuickReplies(): string[] {
    return DEFAULT_QUICK_REPLIES;
  }

  // ========================================
  // CONVERSATIONS
  // ========================================

  /**
   * Get user's conversations with product context
   */
  async getConversations(userId: string) {
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
        sellerResponseIndicator: this.getSellerResponseIndicatorText(
          conv.averageResponseTime
        ),
        isBuyer: conv.buyerId === userId,
      })),
    };
  }

  /**
   * Get conversation by ID with messages
   */
  async getConversationById(conversationId: string, userId: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['buyer', 'seller', 'ad', 'messages'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Verify user is part of conversation
    if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    // Get messages with sender/receiver info
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
        sellerResponseIndicator: this.getSellerResponseIndicatorText(
          conversation.averageResponseTime
        ),
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

  /**
   * Get conversation with a specific user (legacy compatibility)
   */
  async getConversation(userId: string, otherUserId: string) {
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

  // ========================================
  // MESSAGE STATUS & READ RECEIPTS
  // ========================================

  /**
   * Update message status (sent -> delivered -> read)
   */
  async updateMessageStatus(
    messageId: string,
    status: MessageStatus,
    userId: string,
  ): Promise<Message> {
    const message = await this.messageRepository.findOne({ 
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Only receiver can update status to delivered/read
    if (message.receiverId !== userId) {
      throw new ForbiddenException('You can only update status of messages sent to you');
    }

    message.status = status;

    if (status === MessageStatus.DELIVERED && !message.deliveredAt) {
      message.deliveredAt = new Date();
    }

    if (status === MessageStatus.READ) {
      message.isRead = true;
      message.readAt = new Date();
      if (!message.deliveredAt) {
        message.deliveredAt = new Date();
      }
    }

    return this.messageRepository.save(message);
  }

  /**
   * Mark message as read (legacy compatibility)
   */
  async markAsRead(id: string, userId: string) {
    return this.updateMessageStatus(id, MessageStatus.READ, userId);
  }

  /**
   * Mark multiple messages as read
   */
  async markMessagesAsRead(dto: MarkMessagesReadDto, userId: string) {
    const messages = await this.messageRepository.find({
      where: {
        id: In(dto.messageIds),
        receiverId: userId,
      },
    });

    const updates = messages.map(msg => {
      msg.status = MessageStatus.READ;
      msg.isRead = true;
      msg.readAt = new Date();
      if (!msg.deliveredAt) {
        msg.deliveredAt = new Date();
      }
      return msg;
    });

    await this.messageRepository.save(updates);

    // Update conversation unread counts
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

  /**
   * Mark all messages in a conversation as read
   */
  async markConversationAsRead(conversationId: string, userId: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Update all unread messages in this conversation
    await this.messageRepository.update(
      {
        conversationId,
        receiverId: userId,
        status: Not(MessageStatus.READ),
      },
      {
        status: MessageStatus.READ,
        isRead: true,
        readAt: new Date(),
      },
    );

    // Update conversation unread count
    await this.updateConversationUnreadCount(conversationId, userId);

    return { message: 'Conversation marked as read' };
  }

  /**
   * Update conversation unread count
   */
  private async updateConversationUnreadCount(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) return;

    const unreadCount = await this.messageRepository.count({
      where: {
        conversationId,
        receiverId: userId,
        status: Not(MessageStatus.READ),
      },
    });

    if (conversation.buyerId === userId) {
      conversation.buyerUnreadCount = unreadCount;
    } else {
      conversation.sellerUnreadCount = unreadCount;
    }

    await this.conversationRepository.save(conversation);
  }

  // ========================================
  // UNREAD COUNTS & NOTIFICATIONS
  // ========================================

  /**
   * Get total unread message count for user
   */
  async getUnreadCount(userId: string) {
    const count = await this.messageRepository.count({
      where: { 
        receiverId: userId, 
        status: Not(MessageStatus.READ),
      },
    });

    return { count };
  }

  /**
   * Get unread counts per conversation
   */
  async getUnreadCountsByConversation(userId: string) {
    const conversations = await this.conversationRepository.find({
      where: [
        { buyerId: userId },
        { sellerId: userId },
      ],
    });

    const counts: { [key: string]: number } = {};
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

  // ========================================
  // SELLER RESPONSE METRICS
  // ========================================

  /**
   * Get seller response indicator for a user
   */
  async getSellerResponseIndicator(sellerId: string) {
    const stats = await this.calculateSellerResponseStats(sellerId);

    return {
      averageResponseTime: stats.averageResponseTime,
      totalResponses: stats.totalResponses,
      indicator: this.getSellerResponseIndicatorText(stats.averageResponseTime),
    };
  }

  // ========================================
  // CONVERSATION MANAGEMENT
  // ========================================

  /**
   * Archive a conversation
   */
  async archiveConversation(conversationId: string, userId: string, archive: boolean) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.buyerId === userId) {
      conversation.isArchivedByBuyer = archive;
    } else if (conversation.sellerId === userId) {
      conversation.isArchivedBySeller = archive;
    } else {
      throw new ForbiddenException('You are not part of this conversation');
    }

    await this.conversationRepository.save(conversation);

    return { message: archive ? 'Conversation archived' : 'Conversation unarchived' };
  }

  /**
   * Block/unblock a user in conversation
   */
  async blockUser(conversationId: string, userId: string, block: boolean) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.buyerId === userId) {
      conversation.isBlockedByBuyer = block;
    } else if (conversation.sellerId === userId) {
      conversation.isBlockedBySeller = block;
    } else {
      throw new ForbiddenException('You are not part of this conversation');
    }

    await this.conversationRepository.save(conversation);

    return { message: block ? 'User blocked' : 'User unblocked' };
  }

  // ========================================
  // MESSAGE DELETION
  // ========================================

  /**
   * Delete a message
   */
  async remove(id: string, userId: string) {
    const message = await this.messageRepository.findOne({ where: { id } });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId && message.receiverId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.messageRepository.remove(message);
    return { message: 'Message deleted successfully' };
  }
}
