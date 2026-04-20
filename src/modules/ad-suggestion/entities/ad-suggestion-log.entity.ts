import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * Logs every AI ad-suggestion request for analytics.
 *
 * Table: ad_suggestion_logs
 */
@Entity('ad_suggestion_logs')
export class AdSuggestionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  userPlan: string;

  @Column({ type: 'text', nullable: true })
  originalTitle: string;

  @Column({ type: 'text', nullable: true })
  originalDescription: string;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'int', default: 0 })
  suggestionsReturned: number;

  @Column({ nullable: true })
  ipAddress: string;

  @CreateDateColumn()
  createdAt: Date;
}
