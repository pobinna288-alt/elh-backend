import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AdCategory } from '../../ads/entities/ad.entity';

@Entity('saved_searches')
export class SavedSearch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column()
  searchName: string;

  @Column({ nullable: true })
  keyword: string;

  @Column({ type: 'enum', enum: AdCategory, nullable: true })
  category: AdCategory;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxPrice: number;

  @Column({ default: 'daily' })
  notificationFrequency: string; // daily, weekly, instant

  @Column({ default: true })
  notificationsEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
