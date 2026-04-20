import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '../entities/message.entity';

/**
 * DTO for creating a new message in an existing conversation
 */
export class CreateMessageDto {
  @ApiProperty({ description: 'Message content text' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'ID of the message receiver' })
  @IsString()
  @IsUUID()
  receiverId: string;

  @ApiPropertyOptional({ description: 'ID of the conversation (optional - will create if not exists)' })
  @IsOptional()
  @IsString()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({ description: 'ID of the product/ad this message relates to' })
  @IsOptional()
  @IsString()
  @IsUUID()
  adId?: string;

  @ApiPropertyOptional({ 
    description: 'Type of message',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;

  @ApiPropertyOptional({ description: 'URL of attached media (image/file)' })
  @IsOptional()
  @IsString()
  mediaUrl?: string;
}
