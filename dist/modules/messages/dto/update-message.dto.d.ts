import { MessageStatus } from '../entities/message.entity';
export declare class UpdateMessageStatusDto {
    status: MessageStatus;
}
export declare class MarkMessagesReadDto {
    messageIds: string[];
}
export declare class MarkConversationReadDto {
    conversationId: string;
}
export declare class SendQuickReplyDto {
    conversationId: string;
    quickReplyContent: string;
    receiverId?: string;
}
export declare class ArchiveConversationDto {
    conversationId: string;
    archive: boolean;
}
export declare class BlockUserDto {
    conversationId: string;
    block: boolean;
}
