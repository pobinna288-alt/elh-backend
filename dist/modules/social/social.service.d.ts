import { Repository } from 'typeorm';
import { Follow } from './entities/follow.entity';
import { Wishlist } from './entities/wishlist.entity';
import { NotificationsService } from '../notifications/notifications.service';
export declare class SocialService {
    private followRepository;
    private wishlistRepository;
    private notificationsService;
    constructor(followRepository: Repository<Follow>, wishlistRepository: Repository<Wishlist>, notificationsService: NotificationsService);
    followUser(followerId: string, followingId: string): Promise<{
        message: string;
    }>;
    unfollowUser(followerId: string, followingId: string): Promise<{
        message: string;
    }>;
    getFollowers(userId: string): Promise<{
        count: number;
        followers: {
            id: string;
            username: string;
            profilePhoto: string;
            followedAt: Date;
        }[];
    }>;
    getFollowing(userId: string): Promise<{
        count: number;
        following: {
            id: string;
            username: string;
            profilePhoto: string;
            followedAt: Date;
        }[];
    }>;
    isFollowing(followerId: string, followingId: string): Promise<{
        isFollowing: boolean;
    }>;
    addToWishlist(userId: string, adId: string): Promise<{
        message: string;
    }>;
    removeFromWishlist(userId: string, adId: string): Promise<{
        message: string;
    }>;
    getWishlist(userId: string): Promise<{
        count: number;
        items: {
            id: string;
            ad: import("../ads/entities/ad.entity").Ad;
            addedAt: Date;
        }[];
    }>;
    isInWishlist(userId: string, adId: string): Promise<{
        inWishlist: boolean;
    }>;
}
