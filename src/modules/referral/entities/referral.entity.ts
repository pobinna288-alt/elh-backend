import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('referrals')
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referrerId' })
  referrer: User;

  @Column()
  referrerId: string;

  @Column({ unique: true })
  referralCode: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'referredUserId' })
  referredUser: User;

  @Column({ nullable: true })
  referredUserId: string;

  @Column({ default: false })
  rewardClaimed: boolean;

  @Column({ default: 0 })
  coinsEarned: number;

  @CreateDateColumn()
  createdAt: Date;
}
