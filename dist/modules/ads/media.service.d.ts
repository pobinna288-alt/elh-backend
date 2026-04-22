import { ConfigService } from '@nestjs/config';
import { UploadPlan, MediaUploadResponseDto } from './dto/media-upload.dto';
export declare class MediaService {
    private configService;
    private readonly uploadDir;
    private readonly processedDir;
    private readonly thumbnailDir;
    private readonly allowedVideoFormats;
    constructor(configService: ConfigService);
    uploadVideo(file: Express.Multer.File, plan: UploadPlan): Promise<MediaUploadResponseDto>;
    private getVideoMetadata;
    private compressVideo;
    private generateThumbnail;
    private getCompressionSettings;
    private formatBytes;
    private formatDuration;
    deleteVideo(fileId: string): Promise<void>;
    validatePlanAccess(userRole: string, requestedPlan: UploadPlan): boolean;
}
