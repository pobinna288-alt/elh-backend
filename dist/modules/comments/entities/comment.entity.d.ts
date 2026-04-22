import { User } from '../../users/entities/user.entity';
import { Ad } from '../../ads/entities/ad.entity';
export declare class Comment {
    id: string;
    text: string;
    likes: number;
    dislikes: number;
    user: User;
    userId: string;
    ad: Ad;
    adId: string;
    createdAt: Date;
}
