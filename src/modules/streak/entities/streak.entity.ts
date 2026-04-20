import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('streaks')
export class Streak {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column({ default: 0 })
  currentStreak: number;

  @Column({ default: 0 })
  longestStreak: number;

  @Column({ type: 'date' })
  lastVisitDate: Date;

  @Column({ default: 0 })
  totalCoinsEarned: number;

  @Column({ default: 0 })
  dailyCoinsToday: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
