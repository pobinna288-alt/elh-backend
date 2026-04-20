import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessageStatus } from './entities/message.entity';

/**
 * Real-Time Messaging Gateway
 * 
 * Supports WebSocket events for:
 * - new_message: New message received
 * - user_typing: User is typing indicator
 * - message_read: Message has been read
 * - message_delivered: Message has been delivered
 * 
 * The gateway manages:
 * - User connection tracking
 * - Room-based conversations
 * - Typing indicators with auto-timeout
 * - Real-time status updates
 */
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class MessagesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('MessagesGateway');
  
  // Track connected users: userId -> socketId[]
  private connectedUsers = new Map<string, Set<string>>();
  
  // Track typing status: conversationId -> { userId, timeout }
  private typingUsers = new Map<string, Map<string, NodeJS.Timeout>>();

  // Typing indicator timeout (3 seconds)
  private readonly TYPING_TIMEOUT = 3000;

  constructor(private readonly messagesService: MessagesService) {}

  // ========================================
  // LIFECYCLE HOOKS
  // ========================================

  afterInit(server: Server) {
    this.logger.log('Messages WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    const userId = this.extractUserId(client);
    
    if (userId) {
      // Track user connection
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId).add(client.id);
      
      // Join user's personal room for direct notifications
      client.join(`user:${userId}`);
      
      this.logger.log(`User ${userId} connected (socket: ${client.id})`);
      
      // Notify online status
      this.server.emit('user_online', { userId });
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.extractUserId(client);
    
    if (userId) {
      // Remove socket from user's connections
      const userSockets = this.connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(userId);
          // Notify offline status
          this.server.emit('user_offline', { userId });
        }
      }
      
      this.logger.log(`User ${userId} disconnected (socket: ${client.id})`);
    }
  }

  // ========================================
  // ROOM MANAGEMENT
  // ========================================

  /**
   * Join a conversation room
   */
  @SubscribeMessage('join_conversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const room = `conversation:${data.conversationId}`;
    client.join(room);
    
    this.logger.log(`Socket ${client.id} joined room ${room}`);
    
    return { event: 'joined_conversation', data: { conversationId: data.conversationId } };
  }

  /**
   * Leave a conversation room
   */
  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const room = `conversation:${data.conversationId}`;
    client.leave(room);
    
    return { event: 'left_conversation', data: { conversationId: data.conversationId } };
  }

  // ========================================
  // MESSAGE EVENTS
  // ========================================

  /**
   * Handle new message sent via WebSocket
   */
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      content: string;
      receiverId: string;
      conversationId: string;
      adId?: string;
    },
  ) {
    const userId = this.extractUserId(client);
    
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      // Create message via service
      const message = await this.messagesService.create({
        content: data.content,
        receiverId: data.receiverId,
        conversationId: data.conversationId,
        adId: data.adId,
      }, userId);

      // Emit to conversation room
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('new_message', {
          message,
          conversationId: data.conversationId,
        });

      // Also emit to receiver's personal room (for notification badge)
      this.server
        .to(`user:${data.receiverId}`)
        .emit('new_message_notification', {
          messageId: message.id,
          conversationId: data.conversationId,
          senderId: userId,
          preview: data.content.substring(0, 50),
        });

      // Clear typing indicator
      this.clearTyping(data.conversationId, userId);

      return { event: 'message_sent', data: message };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Broadcast new message to relevant parties
   * Called from HTTP controller after message creation
   */
  emitNewMessage(
    conversationId: string,
    message: any,
    receiverId: string,
  ) {
    // Emit to conversation room
    this.server
      .to(`conversation:${conversationId}`)
      .emit('new_message', {
        message,
        conversationId,
      });

    // Emit notification to receiver
    this.server
      .to(`user:${receiverId}`)
      .emit('new_message_notification', {
        messageId: message.id,
        conversationId,
        senderId: message.senderId,
        preview: message.content?.substring(0, 50) || '',
      });
  }

  // ========================================
  // TYPING INDICATORS
  // ========================================

  /**
   * Handle typing indicator
   * Auto-clears after 3 seconds of inactivity
   */
  @SubscribeMessage('user_typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = this.extractUserId(client);
    
    if (!userId) return;

    const room = `conversation:${data.conversationId}`;

    // Clear existing timeout
    this.clearTyping(data.conversationId, userId);

    // Initialize typing map for conversation if needed
    if (!this.typingUsers.has(data.conversationId)) {
      this.typingUsers.set(data.conversationId, new Map());
    }

    // Emit typing event to conversation room (excluding sender)
    client.to(room).emit('user_typing', {
      conversationId: data.conversationId,
      userId,
      typing: true,
    });

    // Set timeout to auto-clear typing
    const timeout = setTimeout(() => {
      this.emitTypingStopped(data.conversationId, userId);
    }, this.TYPING_TIMEOUT);

    this.typingUsers.get(data.conversationId).set(userId, timeout);

    return { event: 'typing_acknowledged' };
  }

  /**
   * Handle typing stopped
   */
  @SubscribeMessage('user_stopped_typing')
  handleStoppedTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = this.extractUserId(client);
    
    if (!userId) return;

    this.clearTyping(data.conversationId, userId);
    this.emitTypingStopped(data.conversationId, userId);

    return { event: 'typing_stopped_acknowledged' };
  }

  /**
   * Clear typing timeout for a user
   */
  private clearTyping(conversationId: string, userId: string) {
    const convTyping = this.typingUsers.get(conversationId);
    if (convTyping) {
      const timeout = convTyping.get(userId);
      if (timeout) {
        clearTimeout(timeout);
        convTyping.delete(userId);
      }
    }
  }

  /**
   * Emit typing stopped event
   */
  private emitTypingStopped(conversationId: string, userId: string) {
    this.server
      .to(`conversation:${conversationId}`)
      .emit('user_typing', {
        conversationId,
        userId,
        typing: false,
      });
  }

  // ========================================
  // MESSAGE STATUS (READ RECEIPTS)
  // ========================================

  /**
   * Handle message delivered
   */
  @SubscribeMessage('message_delivered')
  async handleMessageDelivered(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; conversationId: string },
  ) {
    const userId = this.extractUserId(client);
    
    if (!userId) return;

    try {
      const message = await this.messagesService.updateMessageStatus(
        data.messageId,
        MessageStatus.DELIVERED,
        userId,
      );

      // Emit to conversation room
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('message_delivered', {
          messageId: data.messageId,
          conversationId: data.conversationId,
          deliveredAt: message.deliveredAt,
        });

      return { event: 'delivery_acknowledged' };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Handle message read
   */
  @SubscribeMessage('message_read')
  async handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; conversationId: string },
  ) {
    const userId = this.extractUserId(client);
    
    if (!userId) return;

    try {
      const message = await this.messagesService.updateMessageStatus(
        data.messageId,
        MessageStatus.READ,
        userId,
      );

      // Emit to conversation room
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('message_read', {
          messageId: data.messageId,
          conversationId: data.conversationId,
          readAt: message.readAt,
        });

      return { event: 'read_acknowledged' };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Mark all messages in conversation as read
   */
  @SubscribeMessage('mark_conversation_read')
  async handleMarkConversationRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = this.extractUserId(client);
    
    if (!userId) return;

    try {
      await this.messagesService.markConversationAsRead(
        data.conversationId,
        userId,
      );

      // Emit to conversation room
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('conversation_read', {
          conversationId: data.conversationId,
          readBy: userId,
          readAt: new Date(),
        });

      return { event: 'conversation_marked_read' };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Broadcast message status update
   * Called from HTTP controller after status update
   */
  emitMessageStatusUpdate(
    conversationId: string,
    messageId: string,
    status: MessageStatus,
    timestamp: Date,
  ) {
    const eventName = status === MessageStatus.READ ? 'message_read' : 'message_delivered';
    
    this.server
      .to(`conversation:${conversationId}`)
      .emit(eventName, {
        messageId,
        conversationId,
        [status === MessageStatus.READ ? 'readAt' : 'deliveredAt']: timestamp,
      });
  }

  // ========================================
  // ONLINE STATUS
  // ========================================

  /**
   * Check if a user is online
   */
  @SubscribeMessage('check_online')
  handleCheckOnline(
    @MessageBody() data: { userId: string },
  ) {
    const isOnline = this.connectedUsers.has(data.userId);
    return { 
      event: 'online_status',
      data: { userId: data.userId, isOnline },
    };
  }

  /**
   * Get online users from a list
   */
  @SubscribeMessage('get_online_users')
  handleGetOnlineUsers(
    @MessageBody() data: { userIds: string[] },
  ) {
    const onlineUsers = data.userIds.filter(id => this.connectedUsers.has(id));
    return {
      event: 'online_users',
      data: { onlineUsers },
    };
  }

  /**
   * Check if a user is online (public method)
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  // ========================================
  // HELPERS
  // ========================================

  /**
   * Extract user ID from socket handshake
   * In production, this should validate JWT token
   */
  private extractUserId(client: Socket): string | null {
    // Try different auth methods
    const userId = 
      client.handshake.auth?.userId ||
      client.handshake.query?.userId as string ||
      client.handshake.headers?.['x-user-id'] as string;

    return userId || null;
  }

  /**
   * Send notification to user's all connected devices
   */
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
