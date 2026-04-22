import { User } from '../../users/entities/user.entity';
import { AdCategory } from '../../ads/entities/ad.entity';
export declare class SavedSearch {
    id: string;
    user: User;
    userId: string;
    searchName: string;
    keyword: string;
    category: AdCategory;
    location: string;
    minPrice: number;
    maxPrice: number;
    notificationFrequency: string;
    notificationsEnabled: boolean;
    createdAt: Date;
}
