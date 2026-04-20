import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Patch,
  Query,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { 
  CreateMessageDto,
  StartConversationDto,
  MarkMessagesReadDto,
  SendQuickReplyDto,
  UpdateMessageStatusDto,
  ArchiveConversationDto,
  BlockUserDto,
} from './dto';
import { MessageStatus } from './entities/message.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

@ApiTags('messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // ========================================
  // CONVERSATION INITIALIZATION
  // ========================================

  /**
   * Start a new conversation from a product listing
   * Called when buyer clicks "Message Seller"
   * 
   * Returns:
   * - Pre-filled message template
   * - Product preview card
   * - Quick reply suggestions
   * - Seller response indicator
   */
  @Post('start-conversation')
  @ApiOperation({ 
    summary: 'Start conversation from product',
    description: 'Initializes a chat when buyer clicks "Message Seller" on a product ad'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Conversation initialized with pre-filled message and product context' 
  })
  startConversation(
    @Body() startDto: StartConversationDto,
    @Request() req,
  ) {
    return this.messagesService.startConversation(startDto, req.user.id);
  }

  // ========================================
  // MESSAGE CREATION
  // ========================================

  @Post()
  @ApiOperation({ summary: 'Send a message' })
  create(@Body() createMessageDto: CreateMessageDto, @Request() req) {
    return this.messagesService.create(createMessageDto, req.user.id);
  }

  /**
   * Send a quick reply message
   */
  @Post('quick-reply')
  @ApiOperation({ 
    summary: 'Send quick reply',
    description: 'Send one of the predefined quick reply messages'
  })
  sendQuickReply(@Body() dto: SendQuickReplyDto, @Request() req) {
    return this.messagesService.sendQuickReply(dto, req.user.id);
  }

  /**
   * Get available quick replies
   */
  @Get('quick-replies')
  @ApiOperation({ summary: 'Get available quick reply options' })
  getQuickReplies() {
    return {
      quickReplies: this.messagesService.getQuickReplies(),
    };
  }

  // ========================================
  // CONVERSATIONS
  // ========================================

  @Get('conversations')
  @ApiOperation({ 
    summary: 'Get user conversations',
    description: 'Returns all conversations with product context and unread counts'
  })
  getConversations(@Request() req) {
    return this.messagesService.getConversations(req.user.id);
  }

  /**
   * Get a specific conversation by ID
   */
  @Get('conversation/:conversationId')
  @ApiOperation({ 
    summary: 'Get conversation by ID',
    description: 'Returns conversation with all messages, product card, and quick replies'
  })
  getConversationById(
    @Param('conversationId') conversationId: string,
    @Request() req,
  ) {
    return this.messagesService.getConversationById(conversationId, req.user.id);
  }

  /**
   * Get conversation with a specific user (legacy)
   */
  @Get('conversation/user/:userId')
  @ApiOperation({ summary: 'Get conversation with a specific user' })
  getConversationByUser(@Param('userId') otherUserId: string, @Request() req) {
    return this.messagesService.getConversation(req.user.id, otherUserId);
  }

  // ========================================
  // MESSAGE STATUS & READ RECEIPTS
  // ========================================

  /**
   * Update message status (sent -> delivered -> read)
   */
  @Patch(':id/status')
  @ApiOperation({ 
    summary: 'Update message status',
    description: 'Update message status for read receipts (sent → delivered → read)'
  })
  updateMessageStatus(
    @Param('id') id: string,
    @Body() dto: UpdateMessageStatusDto,
    @Request() req,
  ) {
    return this.messagesService.updateMessageStatus(id, dto.status, req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark message as read' })
  markAsRead(@Param('id') id: string, @Request() req) {
    return this.messagesService.markAsRead(id, req.user.id);
  }

  /**
   * Mark multiple messages as read
   */
  @Patch('mark-read')
  @ApiOperation({ summary: 'Mark multiple messages as read' })
  markMessagesAsRead(@Body() dto: MarkMessagesReadDto, @Request() req) {
    return this.messagesService.markMessagesAsRead(dto, req.user.id);
  }

  /**
   * Mark all messages in a conversation as read
   */
  @Patch('conversation/:conversationId/read')
  @ApiOperation({ summary: 'Mark all messages in conversation as read' })
  markConversationAsRead(
    @Param('conversationId') conversationId: string,
    @Request() req,
  ) {
    return this.messagesService.markConversationAsRead(conversationId, req.user.id);
  }

  // ========================================
  // UNREAD COUNTS & NOTIFICATIONS
  // ========================================

  @Get('unread-count')
  @ApiOperation({ 
    summary: 'Get total unread message count',
    description: 'Returns total unread messages for notification badge'
  })
  getUnreadCount(@Request() req) {
    return this.messagesService.getUnreadCount(req.user.id);
  }

  /**
   * Get unread counts per conversation
   */
  @Get('unread-counts')
  @ApiOperation({ 
    summary: 'Get unread counts by conversation',
    description: 'Returns unread counts for each conversation'
  })
  getUnreadCountsByConversation(@Request() req) {
    return this.messagesService.getUnreadCountsByConversation(req.user.id);
  }

  // ========================================
  // SELLER RESPONSE METRICS
  // ========================================

  /**
   * Get seller response indicator for a user
   */
  @Get('seller-response/:sellerId')
  @ApiOperation({ 
    summary: 'Get seller response indicator',
    description: 'Returns average response time and indicator text for a seller'
  })
  getSellerResponseIndicator(@Param('sellerId') sellerId: string) {
    return this.messagesService.getSellerResponseIndicator(sellerId);
  }

  // ========================================
  // CONVERSATION MANAGEMENT
  // ========================================

  /**
   * Archive/unarchive a conversation
   */
  @Patch('conversation/:conversationId/archive')
  @ApiOperation({ summary: 'Archive or unarchive a conversation' })
  archiveConversation(
    @Param('conversationId') conversationId: string,
    @Body() dto: { archive: boolean },
    @Request() req,
  ) {
    return this.messagesService.archiveConversation(
      conversationId,
      req.user.id,
      dto.archive,
    );
  }

  /**
   * Block/unblock a user in conversation
   */
  @Patch('conversation/:conversationId/block')
  @ApiOperation({ summary: 'Block or unblock user in conversation' })
  blockUser(
    @Param('conversationId') conversationId: string,
    @Body() dto: { block: boolean },
    @Request() req,
  ) {
    return this.messagesService.blockUser(
      conversationId,
      req.user.id,
      dto.block,
    );
  }

  // ========================================
  // MESSAGE DELETION
  // ========================================

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a message' })
  remove(@Param('id') id: string, @Request() req) {
    return this.messagesService.remove(id, req.user.id);
  }
}
