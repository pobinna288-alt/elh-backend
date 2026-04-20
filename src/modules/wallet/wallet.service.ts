import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Transaction } from './entities/transaction.entity';
import { AddCoinsDto, CoinsResponseDto } from './dto/coins.dto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  /**
   * Add coins to user account
   * Backend is the SINGLE source of truth - validates and updates database
   * NEVER trust frontend coin values
   */
  async addCoins(userId: string, addCoinsDto: AddCoinsDto): Promise<CoinsResponseDto> {
    const { amount, reason } = addCoinsDto;

    // Validate amount
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // Find user in database
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Calculate new balance (backend calculation)
    const previousBalance = user.coins;
    const newBalance = previousBalance + amount;

    // Update user coins in database
    user.coins = newBalance;
    await this.userRepository.save(user);

    // Log transaction for audit trail
    await this.logTransaction(userId, amount, 'ADD_COINS', reason || 'Manual addition');

    this.logger.log(`Added ${amount} coins to user ${userId}. New balance: ${newBalance}`);

    return {
      success: true,
      message: 'Coins added successfully',
      coins: newBalance, // Return backend-calculated balance
      userId,
    };
  }

  /**
   * Get user coin balance from database
   */
  async getBalance(userId: string): Promise<number> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['coins'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.coins;
  }

  /**
   * Deduct coins from user account
   * Used for premium unlock, ad features, etc.
   */
  async deductCoins(userId: string, amount: number, reason: string): Promise<CoinsResponseDto> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Backend validation - check sufficient balance
    if (user.coins < amount) {
      throw new BadRequestException('INSUFFICIENT_COINS');
    }

    // Deduct coins
    const previousBalance = user.coins;
    user.coins -= amount;
    await this.userRepository.save(user);

    // Log transaction
    await this.logTransaction(userId, -amount, 'DEDUCT_COINS', reason);

    this.logger.log(`Deducted ${amount} coins from user ${userId}. New balance: ${user.coins}`);

    return {
      success: true,
      message: 'Coins deducted successfully',
      coins: user.coins,
      userId,
    };
  }

  /**
   * Log transaction for audit trail
   */
  private async logTransaction(
    userId: string,
    amount: number,
    type: string,
    description: string,
  ): Promise<void> {
    try {
      const transaction = this.transactionRepository.create({
        userId,
        amount,
        type: type as any,
        description,
        status: 'completed' as any,
      });
      await this.transactionRepository.save(transaction);
    } catch (error) {
      this.logger.error(`Failed to log transaction: ${error.message}`);
      // Don't fail the operation if logging fails
    }
  }
}
