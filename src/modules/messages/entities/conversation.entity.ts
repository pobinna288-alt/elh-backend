import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Ad } from '../../ads/entities/ad.entity';
import { Message } from './message.entity';

/**
 * Conversation Entity
 * 
 * Tracks messaging conversations between buyers and sellers
 * Each conversation is linked to a specific product listing
 * 
 * Features:
 * - Product context tracking (product_id, buyer_id, seller_id)
 * - Seller response time calculation
 * - Unread message count tracking
 * - Last message preview
 */
@Entity('conversations')
@Index(['buyerId', 'sellerId', 'adId'], { unique: true })
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ========================================
  // PARTICIPANTS
  // ========================================

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyerId' })
  buyer: User;

  @Column()
  buyerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @Column()
  sellerId: string;

  // ========================================
  // PRODUCT CONTEXT
  // ========================================

  @ManyToOne(() => Ad, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'adId' })
  ad: Ad;

  @Column({ nullable: true })
  adId: string;

  // Cached product info for deleted ads
  @Column({ nullable: true })
  productName: string;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  productPrice: number;

  @Column({ nullable: true })
  productCurrency: string;

  @Column({ nullable: true })
  productThumbnail: string;

  // ========================================
  // CONVERSATION STATE
  // ========================================

  @Column({ nullable: true, type: 'text' })
  lastMessageContent: string;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt: Date;

  @Column({ nullable: true })
  lastMessageSenderId: string;

  @Column({ default: 0 })
  buyerUnreadCount: number;

  @Column({ default: 0 })
  sellerUnreadCount: number;

  @Column({ default: false })
  isActive: boolean;

  @Column({ default: false })
  isArchivedByBuyer: boolean;

  @Column({ default: false })
  isArchivedBySeller: boolean;

  @Column({ default: false })
  isBlockedByBuyer: boolean;

  @Column({ default: false })
  isBlockedBySeller: boolean;

  // ========================================
  // SELLER RESPONSE METRICS
  // ========================================

  // Average response time in seconds
  @Column({ type: 'float', default: 0 })
  averageResponseTime: number;

  // Total messages from seller
  @Column({ default: 0 })
  sellerMessageCount: number;

  // Total response time (for calculating average)
  @Column({ type: 'float', default: 0 })
  totalResponseTime: number;

  // ========================================
  // MESSAGES RELATION
  // ========================================

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

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
   * Get the seller response indicator text
   */
  getSellerResponseIndicator(): string {
    if (this.sellerMessageCount === 0) {
      return 'New seller - no response history yet';
    }

    const avgSeconds = this.averageResponseTime;
    
    if (avgSeconds <= 300) { // 5 minutes
      return 'Seller usually replies within 5 minutes';
    } else if (avgSeconds <= 600) { // 10 minutes
      return 'Seller usually replies within 10 minutes';
    } else if (avgSeconds <= 3600) { // 1 hour
      return 'Seller usually replies within 1 hour';
    } else {
      return 'Seller usually replies within a few hours';
    }
  }

  /**
   * Get product preview card data
   */
  getProductCard(): {
    productName: string;
    productPrice: number;
    productCurrency: string;
    productThumbnail: string;
    sellerName: string;
    sellerId: string;
  } {
    return {
      productName: this.productName || this.ad?.title || 'Unknown Product',
      productPrice: this.productPrice || this.ad?.price || 0,
      productCurrency: this.productCurrency || this.ad?.currency || 'USD',
      productThumbnail: this.productThumbnail || this.ad?.thumbnailUrl || this.ad?.mediaUrls?.[0] || null,
      sellerName: this.seller?.username || this.seller?.fullName || 'Unknown Seller',
      sellerId: this.sellerId,
    };
  }
}
