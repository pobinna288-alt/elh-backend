import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Ad } from '../../ads/entities/ad.entity';

/**
 * AdView Entity
 * 
 * Tracks user viewing progress for each ad.
 * Each user can only have one view record per ad.
 * Milestones are tracked to prevent duplicate coin rewards.
 */
@Entity('ad_views')
@Unique(['userId', 'adId']) // One view record per user per ad
@Index(['userId', 'adId']) // Optimized queries for user-ad lookups
@Index(['userId']) // Queries by user
@Index(['adId']) // Queries by ad
export class AdView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Ad, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'adId' })
  ad: Ad;

  @Column()
  adId: string;

  /**
   * Current watch progress percentage (0-100)
   */
  @Column({ type: 'int', default: 0 })
  watchPercent: number;

  /**
   * Watch time in seconds
   */
  @Column({ type: 'int', default: 0 })
  watchTimeSeconds: number;

  /**
   * Milestone tracking - prevents duplicate rewards
   */
  @Column({ default: false })
  milestone25: boolean;

  @Column({ default: false })
  milestone50: boolean;

  @Column({ default: false })
  milestone75: boolean;

  @Column({ default: false })
  milestone100: boolean;

  /**
   * Total coins earned from this ad view
   */
  @Column({ type: 'int', default: 0 })
  totalCoinsEarned: number;

  /**
   * Whether the ad has been fully watched (100%)
   */
  @Column({ default: false })
  completed: boolean;

  /**
   * Last watch progress timestamp - for anti-cheat validation
   */
  @Column({ type: 'timestamp', nullable: true })
  lastProgressTime: Date;

  /**
   * Session start time - for watch speed validation
   */
  @Column({ type: 'timestamp', nullable: true })
  sessionStartTime: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
