import { User } from '../../users/entities/user.entity';
import { Conversation } from './conversation.entity';
export declare enum MessageStatus {
    SENT = "sent",
    DELIVERED = "delivered",
    READ = "read"
}
export declare enum MessageType {
    TEXT = "text",
    QUICK_REPLY = "quick_reply",
    PRE_FILLED = "pre_filled",
    SYSTEM = "system",
    IMAGE = "image",
    OFFER = "offer"
}
export declare class Message {
    id: string;
    content: string;
    messageType: MessageType;
    mediaUrl: string;
    status: MessageStatus;
    isRead: boolean;
    deliveredAt: Date;
    readAt: Date;
    conversation: Conversation;
    conversationId: string;
    sender: User;
    senderId: string;
    receiver: User;
    receiverId: string;
    adId: string;
    createdAt: Date;
    updatedAt: Date;
    getStatusIndicator(): {
        text: string;
        icon: string;
    };
}
