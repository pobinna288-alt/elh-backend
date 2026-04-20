import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  WELCOME = 'welcome',
  STREAK = 'streak',
  AD_LIKE = 'ad_like',
  AD_COMMENT = 'ad_comment',
  MESSAGE = 'message',
  FOLLOW = 'follow',
  REVIEW = 'review',
  SYSTEM = 'system',
  COIN_EARNED = 'coin_earned',
  PREMIUM_EXPIRING = 'premium_expiring',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column({ nullable: true })
  link: string;

  @Column({ default: false })
  isRead: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column({ nullable: true })
  relatedUserId: string;

  @Column({ nullable: true })
  relatedAdId: string;

  @CreateDateColumn()
  createdAt: Date;
}
