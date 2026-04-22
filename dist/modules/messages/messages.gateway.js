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
exports.MessagesGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const messages_service_1 = require("./messages.service");
const message_entity_1 = require("./entities/message.entity");
let MessagesGateway = class MessagesGateway {
    constructor(messagesService) {
        this.messagesService = messagesService;
        this.logger = new common_1.Logger('MessagesGateway');
        this.connectedUsers = new Map();
        this.typingUsers = new Map();
        this.TYPING_TIMEOUT = 3000;
    }
    afterInit(server) {
        this.logger.log('Messages WebSocket Gateway initialized');
    }
    handleConnection(client) {
        const userId = this.extractUserId(client);
        if (userId) {
            if (!this.connectedUsers.has(userId)) {
                this.connectedUsers.set(userId, new Set());
            }
            this.connectedUsers.get(userId).add(client.id);
            client.join(`user:${userId}`);
            this.logger.log(`User ${userId} connected (socket: ${client.id})`);
            this.server.emit('user_online', { userId });
        }
    }
    handleDisconnect(client) {
        const userId = this.extractUserId(client);
        if (userId) {
            const userSockets = this.connectedUsers.get(userId);
            if (userSockets) {
                userSockets.delete(client.id);
                if (userSockets.size === 0) {
                    this.connectedUsers.delete(userId);
                    this.server.emit('user_offline', { userId });
                }
            }
            this.logger.log(`User ${userId} disconnected (socket: ${client.id})`);
        }
    }
    handleJoinConversation(client, data) {
        const room = `conversation:${data.conversationId}`;
        client.join(room);
        this.logger.log(`Socket ${client.id} joined room ${room}`);
        return { event: 'joined_conversation', data: { conversationId: data.conversationId } };
    }
    handleLeaveConversation(client, data) {
        const room = `conversation:${data.conversationId}`;
        client.leave(room);
        return { event: 'left_conversation', data: { conversationId: data.conversationId } };
    }
    async handleSendMessage(client, data) {
        const userId = this.extractUserId(client);
        if (!userId) {
            return { error: 'Unauthorized' };
        }
        try {
            const message = await this.messagesService.create({
                content: data.content,
                receiverId: data.receiverId,
                conversationId: data.conversationId,
                adId: data.adId,
            }, userId);
            this.server
                .to(`conversation:${data.conversationId}`)
                .emit('new_message', {
                message,
                conversationId: data.conversationId,
            });
            this.server
                .to(`user:${data.receiverId}`)
                .emit('new_message_notification', {
                messageId: message.id,
                conversationId: data.conversationId,
                senderId: userId,
                preview: data.content.substring(0, 50),
            });
            this.clearTyping(data.conversationId, userId);
            return { event: 'message_sent', data: message };
        }
        catch (error) {
            this.logger.error(`Error sending message: ${error.message}`);
            return { error: error.message };
        }
    }
    emitNewMessage(conversationId, message, receiverId) {
        this.server
            .to(`conversation:${conversationId}`)
            .emit('new_message', {
            message,
            conversationId,
        });
        this.server
            .to(`user:${receiverId}`)
            .emit('new_message_notification', {
            messageId: message.id,
            conversationId,
            senderId: message.senderId,
            preview: message.content?.substring(0, 50) || '',
        });
    }
    handleTyping(client, data) {
        const userId = this.extractUserId(client);
        if (!userId)
            return;
        const room = `conversation:${data.conversationId}`;
        this.clearTyping(data.conversationId, userId);
        if (!this.typingUsers.has(data.conversationId)) {
            this.typingUsers.set(data.conversationId, new Map());
        }
        client.to(room).emit('user_typing', {
            conversationId: data.conversationId,
            userId,
            typing: true,
        });
        const timeout = setTimeout(() => {
            this.emitTypingStopped(data.conversationId, userId);
        }, this.TYPING_TIMEOUT);
        this.typingUsers.get(data.conversationId).set(userId, timeout);
        return { event: 'typing_acknowledged' };
    }
    handleStoppedTyping(client, data) {
        const userId = this.extractUserId(client);
        if (!userId)
            return;
        this.clearTyping(data.conversationId, userId);
        this.emitTypingStopped(data.conversationId, userId);
        return { event: 'typing_stopped_acknowledged' };
    }
    clearTyping(conversationId, userId) {
        const convTyping = this.typingUsers.get(conversationId);
        if (convTyping) {
            const timeout = convTyping.get(userId);
            if (timeout) {
                clearTimeout(timeout);
                convTyping.delete(userId);
            }
        }
    }
    emitTypingStopped(conversationId, userId) {
        this.server
            .to(`conversation:${conversationId}`)
            .emit('user_typing', {
            conversationId,
            userId,
            typing: false,
        });
    }
    async handleMessageDelivered(client, data) {
        const userId = this.extractUserId(client);
        if (!userId)
            return;
        try {
            const message = await this.messagesService.updateMessageStatus(data.messageId, message_entity_1.MessageStatus.DELIVERED, userId);
            this.server
                .to(`conversation:${data.conversationId}`)
                .emit('message_delivered', {
                messageId: data.messageId,
                conversationId: data.conversationId,
                deliveredAt: message.deliveredAt,
            });
            return { event: 'delivery_acknowledged' };
        }
        catch (error) {
            return { error: error.message };
        }
    }
    async handleMessageRead(client, data) {
        const userId = this.extractUserId(client);
        if (!userId)
            return;
        try {
            const message = await this.messagesService.updateMessageStatus(data.messageId, message_entity_1.MessageStatus.READ, userId);
            this.server
                .to(`conversation:${data.conversationId}`)
                .emit('message_read', {
                messageId: data.messageId,
                conversationId: data.conversationId,
                readAt: message.readAt,
            });
            return { event: 'read_acknowledged' };
        }
        catch (error) {
            return { error: error.message };
        }
    }
    async handleMarkConversationRead(client, data) {
        const userId = this.extractUserId(client);
        if (!userId)
            return;
        try {
            await this.messagesService.markConversationAsRead(data.conversationId, userId);
            this.server
                .to(`conversation:${data.conversationId}`)
                .emit('conversation_read', {
                conversationId: data.conversationId,
                readBy: userId,
                readAt: new Date(),
            });
            return { event: 'conversation_marked_read' };
        }
        catch (error) {
            return { error: error.message };
        }
    }
    emitMessageStatusUpdate(conversationId, messageId, status, timestamp) {
        const eventName = status === message_entity_1.MessageStatus.READ ? 'message_read' : 'message_delivered';
        this.server
            .to(`conversation:${conversationId}`)
            .emit(eventName, {
            messageId,
            conversationId,
            [status === message_entity_1.MessageStatus.READ ? 'readAt' : 'deliveredAt']: timestamp,
        });
    }
    handleCheckOnline(data) {
        const isOnline = this.connectedUsers.has(data.userId);
        return {
            event: 'online_status',
            data: { userId: data.userId, isOnline },
        };
    }
    handleGetOnlineUsers(data) {
        const onlineUsers = data.userIds.filter(id => this.connectedUsers.has(id));
        return {
            event: 'online_users',
            data: { onlineUsers },
        };
    }
    isUserOnline(userId) {
        return this.connectedUsers.has(userId);
    }
    extractUserId(client) {
        const userId = client.handshake.auth?.userId ||
            client.handshake.query?.userId ||
            client.handshake.headers?.['x-user-id'];
        return userId || null;
    }
    sendToUser(userId, event, data) {
        this.server.to(`user:${userId}`).emit(event, data);
    }
};
exports.MessagesGateway = MessagesGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], MessagesGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_conversation'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], MessagesGateway.prototype, "handleJoinConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave_conversation'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], MessagesGateway.prototype, "handleLeaveConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('send_message'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], MessagesGateway.prototype, "handleSendMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('user_typing'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], MessagesGateway.prototype, "handleTyping", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('user_stopped_typing'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], MessagesGateway.prototype, "handleStoppedTyping", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('message_delivered'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], MessagesGateway.prototype, "handleMessageDelivered", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('message_read'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], MessagesGateway.prototype, "handleMessageRead", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('mark_conversation_read'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], MessagesGateway.prototype, "handleMarkConversationRead", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('check_online'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MessagesGateway.prototype, "handleCheckOnline", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('get_online_users'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MessagesGateway.prototype, "handleGetOnlineUsers", null);
exports.MessagesGateway = MessagesGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/chat',
        cors: {
            origin: '*',
            credentials: true,
        },
    }),
    __metadata("design:paramtypes", [messages_service_1.MessagesService])
], MessagesGateway);
//# sourceMappingURL=messages.gateway.js.map