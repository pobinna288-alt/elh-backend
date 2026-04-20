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
import { Ad } from '../../ads/entities/ad.entity';

/**
 * Transaction types for coin rewards
 */
export enum CoinTransactionType {
  AD_WATCH_REWARD = 'ad_watch_reward',
  STREAK_BONUS = 'streak_bonus',
  BOOST_EVENT_REWARD = 'boost_event_reward',
  REFERRAL_BONUS = 'referral_bonus',
  MILESTONE_BONUS = 'milestone_bonus',
}

/**
 * CoinTransaction Entity
 * 
 * Records every coin reward for audit and tracking.
 * Every coin earned or spent must be logged here.
 */
@Entity('coin_transactions')
@Index(['userId']) // Queries by user
@Index(['userId', 'createdAt']) // User history queries
@Index(['adId']) // Queries by ad
@Index(['type']) // Queries by transaction type
export class CoinTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Ad, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'adId' })
  ad: Ad;

  @Column({ nullable: true })
  adId: string;

  /**
   * Number of coins earned (positive) or spent (negative)
   */
  @Column({ type: 'int' })
  coins: number;

  /**
   * Transaction type
   */
  @Column({
    type: 'enum',
    enum: CoinTransactionType,
    default: CoinTransactionType.AD_WATCH_REWARD,
  })
  type: CoinTransactionType;

  /**
   * Description of the transaction
   */
  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * Milestone that triggered this reward (25, 50, 75, 100)
   */
  @Column({ type: 'int', nullable: true })
  milestone: number;

  /**
   * Multiplier applied (for boost events)
   */
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1.0 })
  multiplier: number;

  /**
   * Reference to boost event if applicable
   */
  @Column({ nullable: true })
  boostEventId: string;

  @CreateDateColumn()
  createdAt: Date;
}
