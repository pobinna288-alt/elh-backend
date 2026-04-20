import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Follow } from './entities/follow.entity';
import { Wishlist } from './entities/wishlist.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SocialService {
  constructor(
    @InjectRepository(Follow)
    private followRepository: Repository<Follow>,
    @InjectRepository(Wishlist)
    private wishlistRepository: Repository<Wishlist>,
    private notificationsService: NotificationsService,
  ) {}

  // Follow System
  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const existing = await this.followRepository.findOne({
      where: { followerId, followingId },
    });

    if (existing) {
      return { message: 'Already following this user' };
    }

    const follow = this.followRepository.create({ followerId, followingId });
    await this.followRepository.save(follow);

    // Send notification
    await this.notificationsService.notifyNewFollow(followingId, followerId);

    return { message: 'Successfully followed user' };
  }

  async unfollowUser(followerId: string, followingId: string) {
    const follow = await this.followRepository.findOne({
      where: { followerId, followingId },
    });

    if (!follow) {
      throw new BadRequestException('You are not following this user');
    }

    await this.followRepository.remove(follow);
    return { message: 'Successfully unfollowed user' };
  }

  async getFollowers(userId: string) {
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

  async getFollowing(userId: string) {
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

  async isFollowing(followerId: string, followingId: string) {
    const follow = await this.followRepository.findOne({
      where: { followerId, followingId },
    });

    return { isFollowing: !!follow };
  }

  // Wishlist System
  async addToWishlist(userId: string, adId: string) {
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

  async removeFromWishlist(userId: string, adId: string) {
    const item = await this.wishlistRepository.findOne({
      where: { userId, adId },
    });

    if (!item) {
      throw new BadRequestException('Ad not in wishlist');
    }

    await this.wishlistRepository.remove(item);
    return { message: 'Ad removed from wishlist' };
  }

  async getWishlist(userId: string) {
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

  async isInWishlist(userId: string, adId: string) {
    const item = await this.wishlistRepository.findOne({
      where: { userId, adId },
    });

    return { inWishlist: !!item };
  }
}
