"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const follow_entity_1 = require("./entities/follow.entity");
const wishlist_entity_1 = require("./entities/wishlist.entity");
const notifications_service_1 = require("../notifications/notifications.service");
let SocialService = class SocialService {
    constructor(followRepository, wishlistRepository, notificationsService) {
        this.followRepository = followRepository;
        this.wishlistRepository = wishlistRepository;
        this.notificationsService = notificationsService;
    }
    async followUser(followerId, followingId) {
        if (followerId === followingId) {
            throw new common_1.BadRequestException('You cannot follow yourself');
        }
        const existing = await this.followRepository.findOne({
            where: { followerId, followingId },
        });
        if (existing) {
            return { message: 'Already following this user' };
        }
        const follow = this.followRepository.create({ followerId, followingId });
        await this.followRepository.save(follow);
        await this.notificationsService.notifyNewFollow(followingId, followerId);
        return { message: 'Successfully followed user' };
    }
    async unfollowUser(followerId, followingId) {
        const follow = await this.followRepository.findOne({
            where: { followerId, followingId },
        });
        if (!follow) {
            throw new common_1.BadRequestException('You are not following this user');
        }
        await this.followRepository.remove(follow);
        return { message: 'Successfully unfollowed user' };
    }
    async getFollowers(userId) {
        const followers = await this.followRepository.find({
            where: { followingId: userId },
            relations: ['follower'],
        });
        return {
            count: followers.length,
            followers: followers.map(f => ({
                id: f.follower.id,
                username: f.follower.username,
                profilePhoto: f.follower.profilePhoto,
                followedAt: f.createdAt,
            })),
        };
    }
    async getFollowing(userId) {
        const following = await this.followRepository.find({
            where: { followerId: userId },
            relations: ['following'],
        });
        return {
            count: following.length,
            following: following.map(f => ({
                id: f.following.id,
                username: f.following.username,
                profilePhoto: f.following.profilePhoto,
                followedAt: f.createdAt,
            })),
        };
    }
    async isFollowing(followerId, followingId) {
        const follow = await this.followRepository.findOne({
            where: { followerId, followingId },
        });
        return { isFollowing: !!follow };
    }
    async addToWishlist(userId, adId) {
        const existing = await this.wishlistRepository.findOne({
            where: { userId, adId },
        });
        if (existing) {
            return { message: 'Ad already in wishlist' };
        }
        const wishlistItem = this.wishlistRepository.create({ userId, adId });
        await this.wishlistRepository.save(wishlistItem);
        return { message: 'Ad added to wishlist' };
    }
    async removeFromWishlist(userId, adId) {
        const item = await this.wishlistRepository.findOne({
            where: { userId, adId },
        });
        if (!item) {
            throw new common_1.BadRequestException('Ad not in wishlist');
        }
        await this.wishlistRepository.remove(item);
        return { message: 'Ad removed from wishlist' };
    }
    async getWishlist(userId) {
        const items = await this.wishlistRepository.find({
            where: { userId },
            relations: ['ad', 'ad.author'],
            order: { createdAt: 'DESC' },
        });
        return {
            count: items.length,
            items: items.map(item => ({
                id: item.id,
                ad: item.ad,
                addedAt: item.createdAt,
            })),
        };
    }
    async isInWishlist(userId, adId) {
        const item = await this.wishlistRepository.findOne({
            where: { userId, adId },
        });
        return { inWishlist: !!item };
    }
};
exports.SocialService = SocialService;
exports.SocialService = SocialService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(follow_entity_1.Follow)),
    __param(1, (0, typeorm_1.InjectRepository)(wishlist_entity_1.Wishlist)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        notifications_service_1.NotificationsService])
], SocialService);
//# sourceMappingURL=social.service.js.map