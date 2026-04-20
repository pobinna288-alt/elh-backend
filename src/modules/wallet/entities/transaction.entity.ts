import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum TransactionType {
  EARN_VIDEO = 'earn_video',
  EARN_STREAK = 'earn_streak',
  EARN_REFERRAL = 'earn_referral',
  SPEND_PREMIUM = 'spend_premium',
  SPEND_BOOST = 'spend_boost',
  PAYMENT_STRIPE = 'payment_stripe',
  PAYMENT_PAYSTACK = 'payment_paystack',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'coins' })
  currency: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.COMPLETED,
  })
  status: TransactionStatus;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  referenceId: string;

  @ManyToOne(() => User, (user) => user.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
