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

@Entity('seller_profiles')
@Index(['category', 'availability'])
@Index(['location', 'availability'])
@Index(['attentionScore'])
@Index(['pricePerAttention'])
export class SellerProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // ── Seller metrics ──
  @Column()
  category: string;

  @Column({ nullable: true })
  location: string;

  @Column({ default: true })
  availability: boolean;

  @Column('decimal', { precision: 5, scale: 2, default: 0, name: 'attention_score' })
  attentionScore: number; // 0-100

  @Column('decimal', { precision: 10, scale: 2, default: 0, name: 'price_per_attention' })
  pricePerAttention: number;

  @Column('decimal', { precision: 5, scale: 4, default: 0, name: 'deal_success_rate' })
  dealSuccessRate: number; // 0-1

  @Column('decimal', { precision: 5, scale: 2, default: 0, name: 'response_speed' })
  responseSpeed: number; // avg response time in hours (lower = better)

  @Column({ type: 'int', default: 0, name: 'total_deals' })
  totalDeals: number;

  @Column({ type: 'int', default: 0, name: 'successful_deals' })
  successfulDeals: number;

  @Column({ type: 'int', default: 0, name: 'failed_deals' })
  failedDeals: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0, name: 'avg_rating' })
  avgRating: number;

  @Column({ default: false, name: 'is_blocked' })
  isBlocked: boolean;

  @Column({ type: 'simple-array', nullable: true, name: 'blocked_by_user_ids' })
  blockedByUserIds: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
