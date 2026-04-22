import { User } from '../../users/entities/user.entity';
import { Ad } from '../../ads/entities/ad.entity';
export declare class Review {
    id: string;
    rating: number;
    title: string;
    reviewText: string;
    helpfulCount: number;
    user: User;
    userId: string;
    ad: Ad;
    adId: string;
    seller: User;
    sellerId: string;
    createdAt: Date;
    updatedAt: Date;
}
