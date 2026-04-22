import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from './messages.service';
import { MessageStatus } from './entities/message.entity';
export declare class MessagesGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly messagesService;
    server: Server;
    private logger;
    private connectedUsers;
    private typingUsers;
    private readonly TYPING_TIMEOUT;
    constructor(messagesService: MessagesService);
    afterInit(server: Server): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinConversation(client: Socket, data: {
        conversationId: string;
    }): {
        event: string;
        data: {
            conversationId: string;
        };
    };
    handleLeaveConversation(client: Socket, data: {
        conversationId: string;
    }): {
        event: string;
        data: {
            conversationId: string;
        };
    };
    handleSendMessage(client: Socket, data: {
        content: string;
        receiverId: string;
        conversationId: string;
        adId?: string;
    }): Promise<{
        event: string;
        data: import("./entities/message.entity").Message;
        error?: undefined;
    } | {
        error: any;
        event?: undefined;
        data?: undefined;
    }>;
    emitNewMessage(conversationId: string, message: any, receiverId: string): void;
    handleTyping(client: Socket, data: {
        conversationId: string;
    }): {
        event: string;
    };
    handleStoppedTyping(client: Socket, data: {
        conversationId: string;
    }): {
        event: string;
    };
    private clearTyping;
    private emitTypingStopped;
    handleMessageDelivered(client: Socket, data: {
        messageId: string;
        conversationId: string;
    }): Promise<{
        event: string;
        error?: undefined;
    } | {
        error: any;
        event?: undefined;
    }>;
    handleMessageRead(client: Socket, data: {
        messageId: string;
        conversationId: string;
    }): Promise<{
        event: string;
        error?: undefined;
    } | {
        error: any;
        event?: undefined;
    }>;
    handleMarkConversationRead(client: Socket, data: {
        conversationId: string;
    }): Promise<{
        event: string;
        error?: undefined;
    } | {
        error: any;
        event?: undefined;
    }>;
    emitMessageStatusUpdate(conversationId: string, messageId: string, status: MessageStatus, timestamp: Date): void;
    handleCheckOnline(data: {
        userId: string;
    }): {
        event: string;
        data: {
            userId: string;
            isOnline: boolean;
        };
    };
    handleGetOnlineUsers(data: {
        userIds: string[];
    }): {
        event: string;
        data: {
            onlineUsers: string[];
        };
    };
    isUserOnline(userId: string): boolean;
    private extractUserId;
    sendToUser(userId: string, event: string, data: any): void;
}
