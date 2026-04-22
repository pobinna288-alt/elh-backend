import { User } from '../../users/entities/user.entity';
import { Ad } from '../../ads/entities/ad.entity';
export declare class Wishlist {
    id: string;
    user: User;
    userId: string;
    ad: Ad;
    adId: string;
    createdAt: Date;
}
