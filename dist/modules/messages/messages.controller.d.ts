import { MessagesService } from './messages.service';
import { CreateMessageDto, StartConversationDto, MarkMessagesReadDto, SendQuickReplyDto, UpdateMessageStatusDto } from './dto';
import { MessageStatus } from './entities/message.entity';
export declare class MessagesController {
    private readonly messagesService;
    constructor(messagesService: MessagesService);
    startConversation(startDto: StartConversationDto, req: any): Promise<import("./dto").ConversationInitResponse>;
    create(createMessageDto: CreateMessageDto, req: any): Promise<import("./entities/message.entity").Message>;
    sendQuickReply(dto: SendQuickReplyDto, req: any): Promise<import("./entities/message.entity").Message>;
    getQuickReplies(): {
        quickReplies: string[];
    };
    getConversations(req: any): Promise<{
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
    getConversationById(conversationId: string, req: any): Promise<{
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
            messageType: import("./entities/message.entity").MessageType;
            mediaUrl: string;
            createdAt: Date;
            isOwn: boolean;
        }[];
        quickReplies: string[];
    }>;
    getConversationByUser(otherUserId: string, req: any): Promise<{
        count: number;
        messages: import("./entities/message.entity").Message[];
    }>;
    updateMessageStatus(id: string, dto: UpdateMessageStatusDto, req: any): Promise<import("./entities/message.entity").Message>;
    markAsRead(id: string, req: any): Promise<import("./entities/message.entity").Message>;
    markMessagesAsRead(dto: MarkMessagesReadDto, req: any): Promise<{
        message: string;
        count: number;
    }>;
    markConversationAsRead(conversationId: string, req: any): Promise<{
        message: string;
    }>;
    getUnreadCount(req: any): Promise<{
        count: number;
    }>;
    getUnreadCountsByConversation(req: any): Promise<{
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
    archiveConversation(conversationId: string, dto: {
        archive: boolean;
    }, req: any): Promise<{
        message: string;
    }>;
    blockUser(conversationId: string, dto: {
        block: boolean;
    }, req: any): Promise<{
        message: string;
    }>;
    remove(id: string, req: any): Promise<{
        message: string;
    }>;
}
