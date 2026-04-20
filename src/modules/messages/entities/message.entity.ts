import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Conversation } from './conversation.entity';

/**
 * Message Status Enum
 * Tracks delivery and read status of messages
 */
export enum MessageStatus {
  SENT = 'sent',           // Message left sender
  DELIVERED = 'delivered', // Message received by recipient device
  READ = 'read',           // Recipient opened/viewed the message
}

/**
 * Message Type Enum
 * Categorizes different types of messages
 */
export enum MessageType {
  TEXT = 'text',
  QUICK_REPLY = 'quick_reply',
  PRE_FILLED = 'pre_filled',
  SYSTEM = 'system',
  IMAGE = 'image',
  OFFER = 'offer',
}

@Entity('messages')
@Index(['conversationId', 'createdAt'])
@Index(['senderId', 'receiverId'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ========================================
  // MESSAGE CONTENT
  // ========================================

  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  messageType: MessageType;

  // Optional media attachment
  @Column({ nullable: true })
  mediaUrl: string;

  // ========================================
  // MESSAGE STATUS (Read Receipts)
  // ========================================

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.SENT,
  })
  status: MessageStatus;

  // Legacy field - kept for backward compatibility
  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  // ========================================
  // CONVERSATION RELATIONSHIP
  // ========================================

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column({ nullable: true })
  conversationId: string;

  // ========================================
  // SENDER & RECEIVER
  // ========================================

  @ManyToOne(() => User, (user) => user.sentMessages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column()
  senderId: string;

  @ManyToOne(() => User, (user) => user.receivedMessages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'receiverId' })
  receiver: User;

  @Column()
  receiverId: string;

  // ========================================
  // PRODUCT CONTEXT
  // ========================================

  @Column({ nullable: true })
  adId: string;

  // ========================================
  // TIMESTAMPS
  // ========================================

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * Get status indicator string for UI display
   * ✓ Sent | ✓✓ Delivered | ✓✓ Read (blue)
   */
  getStatusIndicator(): { text: string; icon: string } {
    switch (this.status) {
      case MessageStatus.SENT:
        return { text: 'Sent', icon: '✓' };
      case MessageStatus.DELIVERED:
        return { text: 'Delivered', icon: '✓✓' };
      case MessageStatus.READ:
        return { text: 'Read', icon: '✓✓' };
      default:
        return { text: 'Sending', icon: '○' };
    }
  }
}
