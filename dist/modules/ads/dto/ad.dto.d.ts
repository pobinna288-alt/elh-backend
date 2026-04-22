import { SearchDto } from '../../../common/dto/pagination.dto';
import { AdCategory, AdCondition, AdVideoLength } from '../entities/ad.entity';
export declare class CreateAdDto {
    title: string;
    description?: string;
    category: AdCategory;
    condition?: AdCondition;
    price: number;
    currency: string;
    location?: string;
    mediaUrls?: string[];
    videoUrl?: string;
    videoDuration?: number;
    videoFileSize?: number;
    hasImage?: boolean;
    isVideoAd?: boolean;
    videoLength?: AdVideoLength;
}
export declare class UpdateAdDto {
    title?: string;
    description?: string;
    category?: AdCategory;
    condition?: AdCondition;
    price?: number;
    currency?: string;
    location?: string;
    isActive?: boolean;
}
export declare enum AdSortBy {
    NEWEST = "newest",
    OLDEST = "oldest",
    HIGH_PRICE = "highPrice",
    LOW_PRICE = "lowPrice",
    POPULAR = "popular"
}
export declare class FilterAdsDto extends SearchDto {
    category?: AdCategory;
    minPrice?: number;
    maxPrice?: number;
    location?: string;
    sortBy?: AdSortBy;
}
