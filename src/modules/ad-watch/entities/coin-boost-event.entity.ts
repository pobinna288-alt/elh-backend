import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * CoinBoostEvent Entity
 * 
 * Defines temporary coin reward multiplier events.
 * During active events, all coin rewards are multiplied.
 */
@Entity('coin_boost_events')
@Index(['startTime', 'endTime']) // Active event queries
@Index(['isActive']) // Filter active events
export class CoinBoostEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Event name displayed to users
   */
  @Column()
  name: string;

  /**
   * Event description
   */
  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * Event type identifier
   */
  @Column({ default: 'coin_boost' })
  eventType: string;

  /**
   * Reward multiplier (e.g., 2.0 = 2x coins)
   */
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 2.0 })
  multiplier: number;

  /**
   * Event start time
   */
  @Column({ type: 'timestamp' })
  startTime: Date;

  /**
   * Event end time
   */
  @Column({ type: 'timestamp' })
  endTime: Date;

  /**
   * Whether the event is currently active (administrative toggle)
   */
  @Column({ default: true })
  isActive: boolean;

  /**
   * Tiers eligible for this boost (null = all tiers)
   */
  @Column('simple-array', { nullable: true })
  eligibleTiers: string[];

  /**
   * Maximum total coins that can be distributed during this event
   */
  @Column({ type: 'int', nullable: true })
  maxTotalCoins: number;

  /**
   * Total coins distributed during this event
   */
  @Column({ type: 'int', default: 0 })
  coinsDistributed: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
