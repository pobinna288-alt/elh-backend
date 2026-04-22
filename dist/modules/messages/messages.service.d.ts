import { Repository } from 'typeorm';
import { Message, MessageStatus, MessageType } from './entities/message.entity';
import { Conversation } from './entities/conversation.entity';
import { Ad } from '../ads/entities/ad.entity';
import { User } from '../users/entities/user.entity';
import { CreateMessageDto, StartConversationDto, ConversationInitResponse, MarkMessagesReadDto, SendQuickReplyDto } from './dto';
import { NotificationsService } from '../notifications/notifications.service';
export declare class MessagesService {
    private messageRepository;
    private conversationRepository;
    private adRepository;
    private userRepository;
    private notificationsService;
    constructor(messageRepository: Repository<Message>, conversationRepository: Repository<Conversation>, adRepository: Repository<Ad>, userRepository: Repository<User>, notificationsService: NotificationsService);
    startConversation(startDto: StartConversationDto, buyerId: string): Promise<ConversationInitResponse>;
    private generatePreFilledMessage;
    private calculateSellerResponseStats;
    private getSellerResponseIndicatorText;
    create(createMessageDto: CreateMessageDto, senderId: string): Promise<Message>;
    createMessageInConversation(createMessageDto: CreateMessageDto, senderId: string): Promise<Message>;
    private findOrCreateConversation;
    private updateSellerResponseTime;
    sendQuickReply(dto: SendQuickReplyDto, senderId: string): Promise<Message>;
    getQuickReplies(): string[];
    getConversations(userId: string): Promise<{
        count: number;
        conversations: {
            id: string;
            otherUser: {
                id: string;
                username: string;
                fullName: string;
                profilePhoto: string;
            };
            productCard: {
                productName: string;
                productPrice: number;
                productCurrency: string;
                productThumbnail: string;
                adId: string;
                adActive: boolean;
            };
            lastMessage: string;
            lastMessageAt: Date;
            unreadCount: number;
            sellerResponseIndicator: string;
            isBuyer: boolean;
        }[];
    }>;
    getConversationById(conversationId: string, userId: string): Promise<{
        conversation: {
            id: string;
            productCard: {
                productName: string;
                productPrice: number;
                productCurrency: string;
                productThumbnail: string;
                adId: string;
                adActive: boolean;
            };
            buyer: {
                id: string;
                username: string;
                profilePhoto: string;
            };
            seller: {
                id: string;
                username: string;
                profilePhoto: string;
            };
            sellerResponseIndicator: string;
            isBuyer: boolean;
        };
        messages: {
            id: string;
            content: string;
            senderId: string;
            senderUsername: string;
            status: MessageStatus;
            statusIndicator: {
                text: string;
                icon: string;
            };
            messageType: MessageType;
            mediaUrl: string;
            createdAt: Date;
            isOwn: boolean;
        }[];
        quickReplies: string[];
    }>;
    getConversation(userId: string, otherUserId: string): Promise<{
        count: number;
        messages: Message[];
    }>;
    updateMessageStatus(messageId: string, status: MessageStatus, userId: string): Promise<Message>;
    markAsRead(id: string, userId: string): Promise<Message>;
    markMessagesAsRead(dto: MarkMessagesReadDto, userId: string): Promise<{
        message: string;
        count: number;
    }>;
    markConversationAsRead(conversationId: string, userId: string): Promise<{
        message: string;
    }>;
    private updateConversationUnreadCount;
    getUnreadCount(userId: string): Promise<{
        count: number;
    }>;
    getUnreadCountsByConversation(userId: string): Promise<{
        total: number;
        byConversation: {
            [key: string]: number;
        };
    }>;
    getSellerResponseIndicator(sellerId: string): Promise<{
        averageResponseTime: number;
        totalResponses: number;
        indicator: string;
    }>;
    archiveConversation(conversationId: string, userId: string, archive: boolean): Promise<{
        message: string;
    }>;
    blockUser(conversationId: string, userId: string, block: boolean): Promise<{
        message: string;
    }>;
    remove(id: string, userId: string): Promise<{
        message: string;
    }>;
}
