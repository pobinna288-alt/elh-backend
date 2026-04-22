import { SocialService } from './social.service';
export declare class SocialController {
    private readonly socialService;
    constructor(socialService: SocialService);
    followUser(userId: string, req: any): Promise<{
        message: string;
    }>;
    unfollowUser(userId: string, req: any): Promise<{
        message: string;
    }>;
    getFollowers(req: any): Promise<{
        count: number;
        followers: {
            id: string;
            username: string;
            profilePhoto: string;
            followedAt: Date;
        }[];
    }>;
    getFollowing(req: any): Promise<{
        count: number;
        following: {
            id: string;
            username: string;
            profilePhoto: string;
            followedAt: Date;
        }[];
    }>;
    isFollowing(userId: string, req: any): Promise<{
        isFollowing: boolean;
    }>;
    addToWishlist(adId: string, req: any): Promise<{
        message: string;
    }>;
    removeFromWishlist(adId: string, req: any): Promise<{
        message: string;
    }>;
    getWishlist(req: any): Promise<{
        count: number;
        items: {
            id: string;
            ad: import("../ads/entities/ad.entity").Ad;
            addedAt: Date;
        }[];
    }>;
    isInWishlist(adId: string, req: any): Promise<{
        inWishlist: boolean;
    }>;
}
