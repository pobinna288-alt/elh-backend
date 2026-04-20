import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Streak } from './entities/streak.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class StreakService {
  constructor(
    @InjectRepository(Streak)
    private streakRepository: Repository<Streak>,
    private notificationsService: NotificationsService,
  ) {}

  async getStreak(userId: string) {
    let streak = await this.streakRepository.findOne({
      where: { userId },
    });

    if (!streak) {
      streak = await this.createStreak(userId);
    }

    return streak;
  }

  async checkIn(userId: string) {
    let streak = await this.streakRepository.findOne({
      where: { userId },
    });

    if (!streak) {
      streak = await this.createStreak(userId);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastVisit = new Date(streak.lastVisitDate);
    lastVisit.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      // Already checked in today
      return {
        ...streak,
        message: 'Already checked in today',
        coinsEarned: 0,
      };
    } else if (daysDiff === 1) {
      // Consecutive day - increase streak
      streak.currentStreak += 1;
      streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
    } else {
      // Streak broken - reset
      streak.currentStreak = 1;
    }

    // Calculate coins earned (bonus for longer streaks)
    const baseCoins = 10;
    const streakBonus = Math.min(streak.currentStreak * 2, 100); // Max 100 bonus
    const coinsEarned = baseCoins + streakBonus;

    streak.lastVisitDate = today;
    streak.totalCoinsEarned += coinsEarned;
    streak.dailyCoinsToday = coinsEarned;

    await this.streakRepository.save(streak);

    // Send notification
    if (streak.currentStreak >= 7) {
      await this.notificationsService.notifyStreak(userId, streak.currentStreak);
    }

    await this.notificationsService.notifyCoinEarned(
      userId,
      coinsEarned,
      `Daily check-in: ${streak.currentStreak} day streak!`,
    );

    return {
      ...streak,
      message: 'Check-in successful!',
      coinsEarned,
    };
  }

  async getLeaderboard() {
    const topStreaks = await this.streakRepository.find({
      relations: ['user'],
      order: { currentStreak: 'DESC' },
      take: 50,
    });

    return topStreaks.map((streak, index) => ({
      rank: index + 1,
      userId: streak.userId,
      username: streak.user?.username || 'Unknown',
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      totalCoinsEarned: streak.totalCoinsEarned,
    }));
  }

  private async createStreak(userId: string) {
    const streak = this.streakRepository.create({
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastVisitDate: new Date('2000-01-01'),
      totalCoinsEarned: 0,
      dailyCoinsToday: 0,
    });

    return this.streakRepository.save(streak);
  }
}
