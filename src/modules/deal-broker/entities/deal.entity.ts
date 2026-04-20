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

export enum DealStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  COUNTER_OFFERED = 'counter_offered',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Entity('deals')
@Index(['buyerId', 'status'])
@Index(['sellerId', 'status'])
@Index(['status', 'createdAt'])
export class Deal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── Buyer info ──
  @Column({ name: 'buyer_id' })
  buyerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  // ── Seller info ──
  @Column({ name: 'seller_id' })
  sellerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  // ── Deal details ──
  @Column({ nullable: true, name: 'ad_id' })
  adId: string;

  @Column()
  category: string;

  @Column('decimal', { precision: 10, scale: 2, name: 'original_price' })
  originalPrice: number;

  @Column('decimal', { precision: 10, scale: 2, name: 'offered_price' })
  offeredPrice: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true, name: 'counter_price' })
  counterPrice: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true, name: 'final_price' })
  finalPrice: number;

  @Column({ default: 'USD' })
  currency: string;

  // ── Campaign / Attention fields ──
  @Column({ nullable: true, name: 'target_location' })
  targetLocation: string;

  @Column({ type: 'int', default: 0, name: 'required_attention' })
  requiredAttention: number;

  @Column({ type: 'int', default: 0, name: 'campaign_duration' })
  campaignDuration: number; // in days

  @Column('decimal', { precision: 10, scale: 2, default: 0, name: 'budget' })
  budget: number;

  // ── Status ──
  @Column({
    type: 'varchar',
    default: DealStatus.PENDING,
  })
  status: DealStatus;

  @Column({ default: false, name: 'seller_declined' })
  sellerDeclined: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'negotiation_deadline' })
  negotiationDeadline: Date;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // ── Alternative seller tracking ──
  @Column({ default: false, name: 'alternative_search_triggered' })
  alternativeSearchTriggered: boolean;

  @Column({ type: 'simple-array', nullable: true, name: 'rejected_seller_ids' })
  rejectedSellerIds: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
