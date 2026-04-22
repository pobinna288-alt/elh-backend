import { User } from '../../users/entities/user.entity';
import { Ad } from '../../ads/entities/ad.entity';
export declare class PriceAlert {
    id: string;
    user: User;
    userId: string;
    ad: Ad;
    adId: string;
    targetPrice: number;
    alertFrequency: string;
    triggered: boolean;
    triggeredAt: Date;
    active: boolean;
    createdAt: Date;
}
