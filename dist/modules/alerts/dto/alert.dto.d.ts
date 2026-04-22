import { AdCategory } from '../../ads/entities/ad.entity';
export declare class CreateSavedSearchDto {
    searchName: string;
    keyword?: string;
    category?: AdCategory;
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    notificationFrequency?: string;
}
export declare class CreatePriceAlertDto {
    adId: string;
    targetPrice: number;
    alertFrequency?: string;
}
