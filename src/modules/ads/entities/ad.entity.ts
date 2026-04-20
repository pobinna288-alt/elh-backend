import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Comment } from '../../comments/entities/comment.entity';

// Primary categories for the marketplace (per specification)
export enum AdCategory {
  ELECTRONICS = 'Electronics',
  VEHICLES = 'Vehicles',
  REAL_ESTATE = 'Real Estate',
  FASHION = 'Fashion',
  PHONES = 'Phones',
  COMPUTERS = 'Computers',
  HOME_FURNITURE = 'Home & Furniture',
  SERVICES = 'Services',
}

// Ad condition - only new or used allowed
export enum AdCondition {
  NEW = 'new',
  USED = 'used',
}

export enum AdVideoLength {
  SHORT = 'short',
  NORMAL = 'normal',
  LONG = 'long',
  PREMIUM = 'premium',
}

@Index('IDX_ADS_ACTIVE_CREATED', ['isActive', 'createdAt'])
@Index('IDX_ADS_CATEGORY_ACTIVE_CREATED', ['category', 'isActive', 'createdAt'])
@Index('IDX_ADS_AUTHOR_CREATED', ['authorId', 'createdAt'])
@Index('IDX_ADS_STATUS_VIEWS', ['status', 'views'])
@Entity('ads')
export class Ad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Title: max 80 characters (validated in service)
  @Column({ length: 80 })
  title: string;

  // Description: max 500 characters (validated in service)
  @Column({ length: 500, nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: AdCategory,
  })
  category: AdCategory;

  // Item condition: must be 'new' or 'used'
  @Column({
    type: 'enum',
    enum: AdCondition,
    default: AdCondition.USED,
  })
  condition: AdCondition;

  @Column('decimal', { precision: 15, scale: 2 })
  price: number;

  @Column({ default: 'USD' })
  currency: string;

  // Price in USD (converted from local currency)
  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  priceUsd: number;

  @Column({ nullable: true })
  location: string;

  @Column('simple-array', { nullable: true })
  mediaUrls: string[];

  @Column({ nullable: true })
  videoUrl: string;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'float', nullable: true })
  videoDuration: number;

  @Column({ nullable: true })
  videoFileSize: number;

  @Column({ nullable: true })
  videoFormat: string;

  @Column({ default: false })
  hasImage: boolean;

  @Column({ default: false })
  isVideoAd: boolean;

  // Quality score: images = +1 each, video = +3, max = 10
  @Column({ default: 0 })
  qualityScore: number;

  @Column({
    type: 'enum',
    enum: AdVideoLength,
    default: AdVideoLength.NORMAL,
  })
  videoLength: AdVideoLength;

  @Column({ default: 0 })
  views: number;

  @Column({ default: 0 })
  clicks: number;

  @Column({ default: 0 })
  likes: number;

  @Column({ default: 0 })
  dislikes: number;

  @Column({ default: 0 })
  shares: number;

  @Column({ default: 4000 })
  maxViews: number;

  @Column({ default: 0 })
  commentsCount: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 'active' })
  status: string;

  @Column({ default: false })
  isPremium: boolean;

  @Column({ default: false })
  isFeatured: boolean;

  @ManyToOne(() => User, (user) => user.ads, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column()
  authorId: string;

  @OneToMany(() => Comment, (comment) => comment.ad)
  comments: Comment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
