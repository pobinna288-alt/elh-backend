import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Ad } from '../../ads/entities/ad.entity';
import { Comment } from '../../comments/entities/comment.entity';
import { Message } from '../../messages/entities/message.entity';
import { Transaction } from '../../wallet/entities/transaction.entity';

export enum UserRole {
  USER = 'user',
  PREMIUM = 'premium',
  PRO = 'pro',
  HOT = 'hot',
  ADMIN = 'admin',
}

export enum SubscriptionPlan {
  FREE = 'free',
  PREMIUM = 'premium',
  PRO_BUSINESS = 'pro_business',
  HOT_BUSINESS = 'hot_business',
  ENTERPRISE = 'enterprise',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column()
  fullName: string;

  @Column({ unique: true })
  username: string;

  @Column({ nullable: true })
  age: number;

  @Column({ nullable: true })
  location: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ default: 0 })
  coins: number;

  @Column({ default: 0 })
  streakDays: number;

  @Column({ type: 'timestamp', nullable: true })
  lastStreakDate: Date;

  @Column({ default: 0 })
  trustScore: number;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  profilePhoto: string;

  @Column({ unique: true })
  referralCode: string;

  @Column({ nullable: true })
  referredBy: string;

  @Column({ default: 0 })
  referralCount: number;

  @Column({ default: 0 })
  referralEarnings: number;

  @Column({ type: 'timestamp', nullable: true })
  premiumExpiresAt: Date;

  @Column({ nullable: true })
  premiumPaymentMethod: string;

  @Column({ default: true })
  emailNotifications: boolean;

  @Column({ default: true })
  pushNotifications: boolean;

  @Column({ default: false })
  privacyMode: boolean;

  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  @Exclude()
  resetToken: string;

  @Column({ type: 'timestamp', nullable: true })
  resetTokenExpiry: Date;

  // ========================================
  // SUBSCRIPTION & NEGOTIATION AI FIELDS
  // ========================================

  @Column({
    type: 'enum',
    enum: SubscriptionPlan,
    default: SubscriptionPlan.FREE,
  })
  plan: SubscriptionPlan;

  @Column({ default: false })
  subscriptionActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  subscriptionExpiry: Date;

  @Column({ default: false })
  negotiationAiEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Ad, (ad) => ad.author)
  ads: Ad[];

  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];

  @OneToMany(() => Message, (message) => message.sender)
  sentMessages: Message[];

  @OneToMany(() => Message, (message) => message.receiver)
  receivedMessages: Message[];

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions: Transaction[];
}
