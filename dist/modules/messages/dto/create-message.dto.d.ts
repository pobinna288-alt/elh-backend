import { MessageType } from '../entities/message.entity';
export declare class CreateMessageDto {
    content: string;
    receiverId: string;
    conversationId?: string;
    adId?: string;
    messageType?: MessageType;
    mediaUrl?: string;
}
