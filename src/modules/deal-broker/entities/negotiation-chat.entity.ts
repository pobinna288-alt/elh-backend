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

@Entity('negotiation_chats')
@Index(['buyerId', 'sellerId'])
@Index(['dealId'])
export class NegotiationChat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'deal_id' })
  dealId: string;

  @Column({ name: 'buyer_id' })
  buyerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  // ── Campaign context attached ──
  @Column({ type: 'jsonb', nullable: true, name: 'campaign_details' })
  campaignDetails: {
    category: string;
    budget: number;
    requiredAttention: number;
    campaignDuration: number;
    targetLocation: string;
  };

  @Column({ type: 'jsonb', nullable: true, name: 'negotiation_context' })
  negotiationContext: {
    originalDealId: string;
    previousPrice: number;
    rejectionReason: string;
    buyerBudget: number;
    matchScore: number;
  };

  @Column({ default: true, name: 'negotiation_ai_active' })
  negotiationAiActive: boolean;

  @Column({ default: 'active' })
  status: string; // 'active' | 'completed' | 'cancelled'

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
