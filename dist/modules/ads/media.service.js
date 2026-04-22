"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = require("fs");
const path = require("path");
const util = require("util");
const child_process_1 = require("child_process");
const uuid_1 = require("uuid");
const media_upload_dto_1 = require("./dto/media-upload.dto");
const execPromise = util.promisify(child_process_1.exec);
let MediaService = class MediaService {
    constructor(configService) {
        this.configService = configService;
        this.allowedVideoFormats = [
            'video/mp4',
            'video/mpeg',
            'video/quicktime',
            'video/x-msvideo',
            'video/webm',
        ];
        this.uploadDir = path.join(process.cwd(), 'uploads', 'original');
        this.processedDir = path.join(process.cwd(), 'uploads', 'processed');
        this.thumbnailDir = path.join(process.cwd(), 'uploads', 'thumbnails');
        [this.uploadDir, this.processedDir, this.thumbnailDir].forEach((dir) => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
    async uploadVideo(file, plan) {
        if (!this.allowedVideoFormats.includes(file.mimetype)) {
            throw new common_1.UnsupportedMediaTypeException(`Invalid video format. Allowed formats: ${this.allowedVideoFormats.join(', ')}`);
        }
        const planLimits = media_upload_dto_1.PLAN_LIMITS[plan];
        if (file.size > planLimits.maxFileSize) {
            throw new common_1.PayloadTooLargeException(`File size ${this.formatBytes(file.size)} exceeds plan limit of ${this.formatBytes(planLimits.maxFileSize)}`);
        }
        const tempFilePath = path.join(this.uploadDir, `temp_${(0, uuid_1.v4)()}.mp4`);
        fs.writeFileSync(tempFilePath, file.buffer);
        try {
            const metadata = await this.getVideoMetadata(tempFilePath);
            if (metadata.duration > planLimits.maxDuration) {
                if (plan === media_upload_dto_1.UploadPlan.NORMAL) {
                    throw new common_1.BadRequestException('Normal users can upload videos up to 2 minutes only.');
                }
                throw new common_1.BadRequestException(`Video duration ${this.formatDuration(metadata.duration)} exceeds plan limit of ${this.formatDuration(planLimits.maxDuration)}`);
            }
            const fileId = (0, uuid_1.v4)();
            const originalFilename = `${fileId}_original.mp4`;
            const processedFilename = `${fileId}_processed.mp4`;
            const thumbnailFilename = `${fileId}_thumb.jpg`;
            const originalPath = path.join(this.uploadDir, originalFilename);
            const processedPath = path.join(this.processedDir, processedFilename);
            const thumbnailPath = path.join(this.thumbnailDir, thumbnailFilename);
            fs.renameSync(tempFilePath, originalPath);
            await this.compressVideo(originalPath, processedPath, planLimits, metadata);
            await this.generateThumbnail(processedPath, thumbnailPath);
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
        }
        catch (error) {
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
            throw error;
        }
    }
    async getVideoMetadata(filePath) {
        try {
            const { stdout } = await execPromise(`ffprobe -v error -select_streams v:0 -show_entries stream=duration,width,height,codec_name,bit_rate -of json "${filePath}"`);
            const data = JSON.parse(stdout);
            const stream = data.streams[0];
            if (!stream) {
                throw new common_1.BadRequestException('Invalid video file: no video stream found');
            }
            return {
                duration: parseFloat(stream.duration) || 0,
                width: stream.width || 0,
                height: stream.height || 0,
                codec: stream.codec_name || 'unknown',
                bitrate: parseInt(stream.bit_rate) || 0,
            };
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to read video metadata. File may be corrupted.');
        }
    }
    async compressVideo(inputPath, outputPath, planLimits, metadata) {
        const compressionSettings = this.getCompressionSettings(planLimits.compressionLevel);
        let ffmpegCommand = `ffmpeg -i "${inputPath}" ${compressionSettings.videoCodec} ${compressionSettings.audioCodec}`;
        if (!compressionSettings.passthrough) {
            ffmpegCommand += ` -preset ${compressionSettings.preset} -crf ${compressionSettings.crf}`;
        }
        if (planLimits.applyWatermark) {
            ffmpegCommand += ` -vf "drawtext=text='Sample':fontsize=48:fontcolor=white@0.5:x=(w-text_w)/2:y=(h-text_h)/2"`;
        }
        ffmpegCommand += ` "${outputPath}"`;
        try {
            await execPromise(ffmpegCommand);
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to process video');
        }
    }
    async generateThumbnail(videoPath, thumbnailPath) {
        try {
            await execPromise(`ffmpeg -i "${videoPath}" -ss 00:00:02 -vframes 1 -q:v 2 "${thumbnailPath}"`);
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to generate thumbnail');
        }
    }
    getCompressionSettings(level) {
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
    formatBytes(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}m ${secs}s`;
    }
    async deleteVideo(fileId) {
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
    validatePlanAccess(userRole, requestedPlan) {
        const planMapping = {
            user: [media_upload_dto_1.UploadPlan.NORMAL],
            premium: [media_upload_dto_1.UploadPlan.NORMAL, media_upload_dto_1.UploadPlan.PREMIUM],
            pro: [media_upload_dto_1.UploadPlan.NORMAL, media_upload_dto_1.UploadPlan.PREMIUM, media_upload_dto_1.UploadPlan.PRO],
            hot: [
                media_upload_dto_1.UploadPlan.NORMAL,
                media_upload_dto_1.UploadPlan.PREMIUM,
                media_upload_dto_1.UploadPlan.PRO,
                media_upload_dto_1.UploadPlan.HOT,
            ],
        };
        return planMapping[userRole.toLowerCase()]?.includes(requestedPlan) || false;
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MediaService);
//# sourceMappingURL=media.service.js.map