import {
  Injectable,
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import {
  UploadPlan,
  PLAN_LIMITS,
  PlanLimits,
  MediaUploadResponseDto,
} from './dto/media-upload.dto';

const execPromise = util.promisify(exec);

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  codec: string;
  bitrate: number;
}

@Injectable()
export class MediaService {
  private readonly uploadDir: string;
  private readonly processedDir: string;
  private readonly thumbnailDir: string;
  private readonly allowedVideoFormats = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
  ];

  constructor(private configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'uploads', 'original');
    this.processedDir = path.join(process.cwd(), 'uploads', 'processed');
    this.thumbnailDir = path.join(process.cwd(), 'uploads', 'thumbnails');

    // Ensure directories exist
    [this.uploadDir, this.processedDir, this.thumbnailDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Upload and process video according to plan limits
   */
  async uploadVideo(
    file: Express.Multer.File,
    plan: UploadPlan,
  ): Promise<MediaUploadResponseDto> {
    // Validate file type
    if (!this.allowedVideoFormats.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        `Invalid video format. Allowed formats: ${this.allowedVideoFormats.join(', ')}`,
      );
    }

    const planLimits = PLAN_LIMITS[plan];

    // Validate file size
    if (file.size > planLimits.maxFileSize) {
      throw new PayloadTooLargeException(
        `File size ${this.formatBytes(file.size)} exceeds plan limit of ${this.formatBytes(planLimits.maxFileSize)}`,
      );
    }

    // Save original file temporarily
    const tempFilePath = path.join(this.uploadDir, `temp_${uuidv4()}.mp4`);
    fs.writeFileSync(tempFilePath, file.buffer);

    try {
      // Get video metadata
      const metadata = await this.getVideoMetadata(tempFilePath);

      // Validate duration
      if (metadata.duration > planLimits.maxDuration) {
        // NORMAL plan: custom error message for free/normal users
        if (plan === UploadPlan.NORMAL) {
          throw new BadRequestException(
            'Normal users can upload videos up to 2 minutes only.',
          );
        }

        throw new BadRequestException(
          `Video duration ${this.formatDuration(metadata.duration)} exceeds plan limit of ${this.formatDuration(planLimits.maxDuration)}`,
        );
      }

      // Generate unique filename
      const fileId = uuidv4();
      const originalFilename = `${fileId}_original.mp4`;
      const processedFilename = `${fileId}_processed.mp4`;
      const thumbnailFilename = `${fileId}_thumb.jpg`;

      const originalPath = path.join(this.uploadDir, originalFilename);
      const processedPath = path.join(this.processedDir, processedFilename);
      const thumbnailPath = path.join(this.thumbnailDir, thumbnailFilename);

      // Move temp file to original
      fs.renameSync(tempFilePath, originalPath);

      // Process video based on plan
      await this.compressVideo(
        originalPath,
        processedPath,
        planLimits,
        metadata,
      );

      // Generate thumbnail
      await this.generateThumbnail(processedPath, thumbnailPath);

      // Get processed file size
      const processedSize = fs.statSync(processedPath).size;

      return {
        originalUrl: `/uploads/original/${originalFilename}`,
        processedUrl: `/uploads/processed/${processedFilename}`,
        thumbnailUrl: `/uploads/thumbnails/${thumbnailFilename}`,
        duration: metadata.duration,
        fileSize: processedSize,
        compressed: true,
        watermarked: planLimits.applyWatermark,
        plan,
      };
    } catch (error) {
      // Clean up temp file if it exists
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      throw error;
    }
  }

  /**
   * Get video metadata using ffprobe
   */
  private async getVideoMetadata(filePath: string): Promise<VideoMetadata> {
    try {
      const { stdout } = await execPromise(
        `ffprobe -v error -select_streams v:0 -show_entries stream=duration,width,height,codec_name,bit_rate -of json "${filePath}"`,
      );

      const data = JSON.parse(stdout);
      const stream = data.streams[0];

      if (!stream) {
        throw new BadRequestException('Invalid video file: no video stream found');
      }

      return {
        duration: parseFloat(stream.duration) || 0,
        width: stream.width || 0,
        height: stream.height || 0,
        codec: stream.codec_name || 'unknown',
        bitrate: parseInt(stream.bit_rate) || 0,
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to read video metadata. File may be corrupted.',
      );
    }
  }

  /**
   * Compress video based on plan limits
   */
  private async compressVideo(
    inputPath: string,
    outputPath: string,
    planLimits: PlanLimits,
    metadata: VideoMetadata,
  ): Promise<void> {
    const compressionSettings = this.getCompressionSettings(
      planLimits.compressionLevel,
    );

    let ffmpegCommand = `ffmpeg -i "${inputPath}" ${compressionSettings.videoCodec} ${compressionSettings.audioCodec}`;

    if (!compressionSettings.passthrough) {
      ffmpegCommand += ` -preset ${compressionSettings.preset} -crf ${compressionSettings.crf}`;
    }

    // Apply watermark if required
    if (planLimits.applyWatermark) {
      ffmpegCommand += ` -vf "drawtext=text='Sample':fontsize=48:fontcolor=white@0.5:x=(w-text_w)/2:y=(h-text_h)/2"`;
    }

    ffmpegCommand += ` "${outputPath}"`;

    try {
      await execPromise(ffmpegCommand);
    } catch (error) {
      throw new BadRequestException('Failed to process video');
    }
  }

  /**
   * Generate video thumbnail
   */
  private async generateThumbnail(
    videoPath: string,
    thumbnailPath: string,
  ): Promise<void> {
    try {
      // Extract frame at 2 seconds or 10% of video duration
      await execPromise(
        `ffmpeg -i "${videoPath}" -ss 00:00:02 -vframes 1 -q:v 2 "${thumbnailPath}"`,
      );
    } catch (error) {
      throw new BadRequestException('Failed to generate thumbnail');
    }
  }

  /**
   * Get compression settings based on level
   */
  private getCompressionSettings(
    level: 'high' | 'medium' | 'low' | 'minimal' | 'none',
  ): {
    videoCodec: string;
    audioCodec: string;
    preset: string;
    crf: number;
    passthrough?: boolean;
  } {
    const settings = {
      high: {
        videoCodec: '-c:v libx264',
        audioCodec: '-c:a aac -b:a 96k',
        preset: 'faster',
        crf: 28,
      },
      medium: {
        videoCodec: '-c:v libx264',
        audioCodec: '-c:a aac -b:a 128k',
        preset: 'medium',
        crf: 23,
      },
      low: {
        videoCodec: '-c:v libx264',
        audioCodec: '-c:a aac -b:a 192k',
        preset: 'slow',
        crf: 20,
      },
      minimal: {
        videoCodec: '-c:v libx264',
        audioCodec: '-c:a aac -b:a 256k',
        preset: 'veryslow',
        crf: 18,
      },
      none: {
        videoCodec: '-c:v copy',
        audioCodec: '-c:a copy',
        preset: 'medium',
        crf: 18,
        passthrough: true,
      },
    };

    return settings[level];
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format duration to human readable
   */
  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}m ${secs}s`;
  }

  /**
   * Delete video files
   */
  async deleteVideo(fileId: string): Promise<void> {
    const files = [
      path.join(this.uploadDir, `${fileId}_original.mp4`),
      path.join(this.processedDir, `${fileId}_processed.mp4`),
      path.join(this.thumbnailDir, `${fileId}_thumb.jpg`),
    ];

    files.forEach((file) => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  }

  /**
   * Validate user's plan permissions
   */
  validatePlanAccess(userRole: string, requestedPlan: UploadPlan): boolean {
    const planMapping = {
      user: [UploadPlan.NORMAL],
      premium: [UploadPlan.NORMAL, UploadPlan.PREMIUM],
      pro: [UploadPlan.NORMAL, UploadPlan.PREMIUM, UploadPlan.PRO],
      hot: [
        UploadPlan.NORMAL,
        UploadPlan.PREMIUM,
        UploadPlan.PRO,
        UploadPlan.HOT,
      ],
    };

    return planMapping[userRole.toLowerCase()]?.includes(requestedPlan) || false;
  }
}
