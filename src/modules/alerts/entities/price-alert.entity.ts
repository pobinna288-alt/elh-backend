import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Ad } from '../../ads/entities/ad.entity';

@Entity('price_alerts')
export class PriceAlert {
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

  @Column('decimal', { precision: 10, scale: 2 })
  targetPrice: number;

  @Column({ default: 'daily' })
  alertFrequency: string; // daily, weekly, instant

  @Column({ default: false })
  triggered: boolean;

  @Column({ type: 'timestamp', nullable: true })
  triggeredAt: Date;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
