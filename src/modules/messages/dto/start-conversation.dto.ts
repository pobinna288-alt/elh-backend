import { IsString, IsUUID, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for starting a new conversation from a product listing
 * 
 * When a buyer clicks "Message Seller" on a product ad:
 * 1. Backend generates pre-filled message
 * 2. Creates conversation with product context
 * 3. Returns quick reply suggestions
 */
export class StartConversationDto {
  @ApiProperty({ description: 'ID of the product/ad to start conversation about' })
  @IsString()
  @IsUUID()
  adId: string;

  @ApiPropertyOptional({ description: 'Optional custom initial message (otherwise pre-filled message is used)' })
  @IsOptional()
  @IsString()
  initialMessage?: string;

  @ApiPropertyOptional({ description: 'Whether to auto-send the pre-filled message or just return it' })
  @IsOptional()
  @IsBoolean()
  autoSend?: boolean;
}

/**
 * Response DTO for conversation initialization
 */
export class ConversationInitResponse {
  @ApiProperty({ description: 'Conversation ID' })
  conversationId: string;

  @ApiProperty({ description: 'Product preview card data' })
  productCard: {
    productName: string;
    productPrice: number;
    productCurrency: string;
    productThumbnail: string;
    sellerName: string;
    sellerId: string;
  };

  @ApiProperty({ description: 'Pre-filled message template' })
  preFilledMessage: string;

  @ApiProperty({ description: 'Quick reply suggestions', type: [String] })
  quickReplies: string[];

  @ApiProperty({ description: 'Seller response indicator text' })
  sellerResponseIndicator: string;

  @ApiProperty({ description: 'Seller average response time in seconds' })
  sellerAverageResponseTime: number;

  @ApiProperty({ description: 'Whether message was auto-sent' })
  messageSent: boolean;

  @ApiProperty({ description: 'Initial message ID (if sent)' })
  messageId?: string;

  @ApiProperty({ description: 'Conversation message history' })
  messages: any[];
}
