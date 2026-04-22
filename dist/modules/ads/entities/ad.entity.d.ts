import { User } from '../../users/entities/user.entity';
import { Comment } from '../../comments/entities/comment.entity';
export declare enum AdCategory {
    ELECTRONICS = "Electronics",
    VEHICLES = "Vehicles",
    REAL_ESTATE = "Real Estate",
    FASHION = "Fashion",
    PHONES = "Phones",
    COMPUTERS = "Computers",
    HOME_FURNITURE = "Home & Furniture",
    SERVICES = "Services"
}
export declare enum AdCondition {
    NEW = "new",
    USED = "used"
}
export declare enum AdVideoLength {
    SHORT = "short",
    NORMAL = "normal",
    LONG = "long",
    PREMIUM = "premium"
}
export declare class Ad {
    id: string;
    title: string;
    description: string;
    category: AdCategory;
    condition: AdCondition;
    price: number;
    currency: string;
    priceUsd: number;
    location: string;
    mediaUrls: string[];
    videoUrl: string;
    thumbnailUrl: string;
    videoDuration: number;
    videoFileSize: number;
    videoFormat: string;
    hasImage: boolean;
    isVideoAd: boolean;
    qualityScore: number;
    videoLength: AdVideoLength;
    views: number;
    clicks: number;
    likes: number;
    dislikes: number;
    shares: number;
    maxViews: number;
    commentsCount: number;
    isActive: boolean;
    status: string;
    isPremium: boolean;
    isFeatured: boolean;
    author: User;
    authorId: string;
    comments: Comment[];
    createdAt: Date;
    updatedAt: Date;
}
