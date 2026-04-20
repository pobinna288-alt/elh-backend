import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Deal } from './deal.entity';

@Entity('alternative_seller_searches')
@Index(['buyerId', 'createdAt'])
@Index(['dealId'])
export class AlternativeSellerSearch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'deal_id' })
  dealId: string;

  @ManyToOne(() => Deal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deal_id' })
  deal: Deal;

  @Column({ name: 'buyer_id' })
  buyerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @Column({ name: 'original_seller_id' })
  originalSellerId: string;

  // ── Search criteria snapshot ──
  @Column('decimal', { precision: 10, scale: 2 })
  budget: number;

  @Column()
  category: string;

  @Column({ nullable: true, name: 'target_location' })
  targetLocation: string;

  @Column({ type: 'int', default: 0, name: 'required_attention' })
  requiredAttention: number;

  @Column({ type: 'int', default: 0, name: 'campaign_duration' })
  campaignDuration: number;

  // ── Results ──
  @Column({ type: 'jsonb', nullable: true, name: 'matched_sellers' })
  matchedSellers: {
    sellerId: string;
    expectedPrice: number;
    attentionScore: number;
    matchScore: number;
    dealSuccessRate: number;
    responseSpeed: number;
  }[];

  @Column({ type: 'int', default: 0, name: 'total_candidates' })
  totalCandidates: number;

  @Column({ type: 'int', default: 0, name: 'returned_count' })
  returnedCount: number;

  @Column({ name: 'trigger_reason' })
  triggerReason: string; // 'rejected' | 'declined' | 'timeout' | 'price_gap'

  @Column({ type: 'varchar', nullable: true, name: 'selected_seller_id' })
  selectedSellerId: string;

  @Column({ default: false, name: 'chat_created' })
  chatCreated: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
