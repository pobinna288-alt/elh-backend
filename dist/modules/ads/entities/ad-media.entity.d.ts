import { Ad } from './ad.entity';
export declare enum MediaType {
    IMAGE = "image",
    VIDEO = "video"
}
export declare const ALLOWED_IMAGE_FORMATS: string[];
export declare const ALLOWED_VIDEO_FORMATS: string[];
export declare class AdMedia {
    id: string;
    ad: Ad;
    adId: string;
    mediaType: MediaType;
    mediaUrl: string;
    fileSizeMb: number;
    durationSeconds: number;
    format: string;
    createdAt: Date;
}
