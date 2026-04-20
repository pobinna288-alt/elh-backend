import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('ai_usage_logs')
@Unique(['userId', 'featureName', 'usageDate'])
@Index(['userId', 'featureName', 'usageDate'])
export class AiUsageLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'feature_name', default: 'negotiation_ai' })
  featureName: string;

  @Column({ name: 'usage_count', default: 0 })
  usageCount: number;

  @Column({ name: 'usage_date', type: 'date' })
  usageDate: string; // YYYY-MM-DD

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
