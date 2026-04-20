import { IsString, IsUUID, IsEnum, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageStatus } from '../entities/message.entity';

/**
 * DTO for updating message status (read receipts)
 */
export class UpdateMessageStatusDto {
  @ApiProperty({ 
    description: 'New status for the message',
    enum: MessageStatus,
  })
  @IsEnum(MessageStatus)
  status: MessageStatus;
}

/**
 * DTO for marking multiple messages as read
 */
export class MarkMessagesReadDto {
  @ApiProperty({ description: 'Array of message IDs to mark as read', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  messageIds: string[];
}

/**
 * DTO for marking all messages in a conversation as read
 */
export class MarkConversationReadDto {
  @ApiProperty({ description: 'Conversation ID to mark as read' })
  @IsString()
  @IsUUID()
  conversationId: string;
}

/**
 * DTO for sending a quick reply
 */
export class SendQuickReplyDto {
  @ApiProperty({ description: 'Conversation ID' })
  @IsString()
  @IsUUID()
  conversationId: string;

  @ApiProperty({ description: 'Quick reply index (0-3) or custom message' })
  @IsString()
  quickReplyContent: string;

  @ApiPropertyOptional({ description: 'Receiver ID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  receiverId?: string;
}

/**
 * DTO for archiving/unarchiving a conversation
 */
export class ArchiveConversationDto {
  @ApiProperty({ description: 'Conversation ID to archive/unarchive' })
  @IsString()
  @IsUUID()
  conversationId: string;

  @ApiProperty({ description: 'Whether to archive (true) or unarchive (false)' })
  archive: boolean;
}

/**
 * DTO for blocking/unblocking a user in conversation
 */
export class BlockUserDto {
  @ApiProperty({ description: 'Conversation ID' })
  @IsString()
  @IsUUID()
  conversationId: string;

  @ApiProperty({ description: 'Whether to block (true) or unblock (false)' })
  block: boolean;
}
