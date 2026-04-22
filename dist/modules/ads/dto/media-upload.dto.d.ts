export declare enum UploadPlan {
    NORMAL = "normal",
    PREMIUM = "premium",
    PRO = "pro",
    HOT = "hot",
    ENTERPRISE = "enterprise"
}
export declare class UploadVideoDto {
    plan: UploadPlan;
    adId?: string;
}
export declare class MediaUploadResponseDto {
    originalUrl: string;
    processedUrl: string;
    thumbnailUrl: string;
    duration: number;
    fileSize: number;
    compressed: boolean;
    watermarked: boolean;
    plan: UploadPlan;
}
export declare class NormalVideoUploadResponseDto {
    upload_status: string;
    video_duration: number;
    coins_earned: number;
    total_user_coins: number;
    max_views: number;
    status: string;
}
export interface PlanLimits {
    maxDuration: number;
    maxFileSize: number;
    compressionLevel: 'high' | 'medium' | 'low' | 'minimal' | 'none';
    applyWatermark: boolean;
    requiresPayment: boolean;
}
export declare const PLAN_LIMITS: Record<UploadPlan, PlanLimits>;
