import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Referral } from './entities/referral.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReferralService {
  constructor(
    @InjectRepository(Referral)
    private referralRepository: Repository<Referral>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationsService: NotificationsService,
  ) {}

  async getReferralCode(userId: string) {
    let referral = await this.referralRepository.findOne({
      where: { referrerId: userId, referredUserId: null as any },
    });

    if (!referral) {
      // Generate unique referral code
      const code = this.generateReferralCode(userId);
      referral = this.referralRepository.create({
        referrerId: userId,
        referralCode: code,
      });
      await this.referralRepository.save(referral);
    }

    return {
      referralCode: referral.referralCode,
      referralLink: `https://yourapp.com/register?ref=${referral.referralCode}`,
    };
  }

  async applyReferralCode(userId: string, referralCode: string) {
    // Check if user already used a referral code
    const existingReferral = await this.referralRepository.findOne({
      where: { referredUserId: userId },
    });

    if (existingReferral) {
      throw new BadRequestException('You have already used a referral code');
    }

    // Find the referral code
    const referral = await this.referralRepository.findOne({
      where: { referralCode, referredUserId: null as any },
    });

    if (!referral) {
      throw new BadRequestException('Invalid referral code');
    }

    if (referral.referrerId === userId) {
      throw new BadRequestException('You cannot use your own referral code');
    }

    // Create new referral entry for the referred user
    const newReferral = this.referralRepository.create({
      referrerId: referral.referrerId,
      referralCode: referral.referralCode,
      referredUserId: userId,
      rewardClaimed: true,
      coinsEarned: 500, // Reward for both referrer and referred
    });

    await this.referralRepository.save(newReferral);

    // Award coins to both users
    const referrer = await this.userRepository.findOne({
      where: { id: referral.referrerId },
    });
    const referredUser = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (referrer) {
      referrer.coins = (referrer.coins || 0) + 500;
      await this.userRepository.save(referrer);

      // Notify referrer
      await this.notificationsService.notifyCoinEarned(
        referrer.id,
        500,
        'A friend joined using your referral code!',
      );
    }

    if (referredUser) {
      referredUser.coins = (referredUser.coins || 0) + 500;
      await this.userRepository.save(referredUser);

      // Notify referred user
      await this.notificationsService.notifyCoinEarned(
        referredUser.id,
        500,
        'Welcome bonus for using a referral code!',
      );
    }

    return {
      message: 'Referral code applied successfully',
      coinsEarned: 500,
    };
  }

  async getStats(userId: string) {
    const referrals = await this.referralRepository.find({
      where: { referrerId: userId },
    });

    const referredUsers = referrals.filter(r => r.referredUserId !== null);
    const totalCoinsEarned = referredUsers.reduce((sum, r) => sum + r.coinsEarned, 0);

    return {
      friendsReferred: referredUsers.length,
      totalCoinsEarned,
      pendingReferrals: referrals.length - referredUsers.length,
    };
  }

  async getReferredUsers(userId: string) {
    const referrals = await this.referralRepository.find({
      where: { referrerId: userId },
      relations: ['referredUser'],
    });

    const referred = referrals.filter(r => r.referredUserId !== null);

    return {
      count: referred.length,
      users: referred.map(r => ({
        userId: r.referredUserId,
        username: r.referredUser?.username || 'Unknown',
        joinedAt: r.createdAt,
        coinsEarned: r.coinsEarned,
      })),
    };
  }

  private generateReferralCode(userId: string): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${timestamp}${randomStr}`.toUpperCase();
  }
}
