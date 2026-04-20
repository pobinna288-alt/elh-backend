import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Ad } from './ad.entity';

// Media type: image or video
export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
}

// Allowed image formats
export const ALLOWED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];

// Allowed video formats
export const ALLOWED_VIDEO_FORMATS = ['mp4'];

@Entity('ad_media')
export class AdMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Ad, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ad_id' })
  ad: Ad;

  @Column({ name: 'ad_id' })
  adId: string;

  @Column({
    type: 'enum',
    enum: MediaType,
    name: 'media_type',
  })
  mediaType: MediaType;

  @Column({ name: 'media_url' })
  mediaUrl: string;

  // File size in MB
  @Column('decimal', { precision: 10, scale: 2, nullable: true, name: 'file_size_mb' })
  fileSizeMb: number;

  // Duration in seconds (for videos only)
  @Column({ nullable: true, name: 'duration_seconds' })
  durationSeconds: number;

  // File format (jpg, png, webp, mp4, etc.)
  @Column({ nullable: true })
  format: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
