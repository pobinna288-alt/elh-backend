import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Get user profile with coins and premium status
   * Backend is the single source of truth - never trust frontend values
   */
  async getUserProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'username', 'email', 'fullName', 'coins', 'role', 'premiumExpiresAt', 'profilePhoto'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Calculate if user is premium based on backend data
    const isPremium = this.isPremiumUser(user);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      coins: user.coins, // Backend source of truth
      isPremium, // Backend calculated
      role: user.role,
      premiumExpiresAt: user.premiumExpiresAt,
      profilePhoto: user.profilePhoto,
    };
  }

  /**
   * Check if user has active premium
   */
  isPremiumUser(user: User): boolean {
    if (!user.premiumExpiresAt) {
      return false;
    }
    return new Date(user.premiumExpiresAt) > new Date();
  }

  /**
   * Find user by ID
   */
  async findById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update user coins (backend only)
   */
  async updateCoins(userId: string, coins: number): Promise<User> {
    const user = await this.findById(userId);
    user.coins = coins;
    return this.userRepository.save(user);
  }

  /**
   * Add coins to user balance (backend only)
   */
  async addCoins(userId: string, amount: number): Promise<User> {
    const user = await this.findById(userId);
    user.coins += amount;
    return this.userRepository.save(user);
  }

  /**
   * Deduct coins from user balance (backend only)
   */
  async deductCoins(userId: string, amount: number): Promise<User> {
    const user = await this.findById(userId);
    
    if (user.coins < amount) {
      throw new Error('Insufficient coins');
    }
    
    user.coins -= amount;
    return this.userRepository.save(user);
  }
}
