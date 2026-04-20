import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { WalletService } from '../wallet/wallet.service';
import { PremiumActivationResponseDto, UnlockPremiumDto } from './dto/premium.dto';
import { PaymentsService } from '../payments/payments.service';
import { getSubscriptionBilling } from '../../config/subscription-pricing.config';

@Injectable()
export class PremiumService {
  private readonly logger = new Logger(PremiumService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly walletService: WalletService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Unlock premium access
   * Backend enforces ALL rules - frontend cannot bypass.
   * Premium benefits remain unchanged; only the price inputs are configurable.
   */
  async unlockPremium(userId: string, unlockPremiumDto: UnlockPremiumDto): Promise<PremiumActivationResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const paymentMethod = unlockPremiumDto.paymentMethod;
    const premiumBilling = getSubscriptionBilling('premium');

    if (!premiumBilling) {
      throw new BadRequestException('Premium billing configuration is missing');
    }

    if (paymentMethod !== 'coins' && paymentMethod !== 'card') {
      throw new BadRequestException('Invalid payment method');
    }

    let remainingCoins = user.coins;
    let expirationDate: Date;

    if (paymentMethod === 'coins') {
      if (user.coins < premiumBilling.coins) {
        this.logger.warn(
          `Premium unlock failed for user ${userId}: Insufficient coins (has ${user.coins}, needs ${premiumBilling.coins})`,
        );

        throw new BadRequestException('Insufficient coins');
      }

      await this.walletService.deductCoins(
        userId,
        premiumBilling.coins,
        `Premium unlock via coins (${premiumBilling.coins} coins)`,
      );

      remainingCoins = await this.walletService.getBalance(userId);
      const activation = await this.paymentsService.activateSubscription(userId, 'premium', 'coins');
      expirationDate = activation.expiryDate;
    } else {
      const reference = unlockPremiumDto.paystackReference;

      if (!reference) {
        throw new BadRequestException('Paystack reference is required for card payment');
      }

      const verification = await this.paymentsService.verifyPaystackPayment(reference);

      if (!verification?.success) {
        throw new BadRequestException('Payment verification failed');
      }

      if (verification.amount !== premiumBilling.paystackAmountNgn) {
        throw new BadRequestException(`Payment amount mismatch. Required: ₦${premiumBilling.paystackAmountNgn}`);
      }

      const metadataUserId = verification.metadata?.userId || verification.metadata?.user_id;
      const metadataPlan = verification.metadata?.plan;

      if (metadataUserId && metadataUserId !== userId) {
        throw new BadRequestException('Payment reference does not belong to this user');
      }

      if (metadataPlan && metadataPlan.toLowerCase() !== 'premium') {
        throw new BadRequestException('Payment is not for premium plan');
      }

      remainingCoins = await this.walletService.getBalance(userId);
      expirationDate = verification.expiresAt ? new Date(verification.expiresAt) : new Date();
    }

    this.logger.log(
      `Premium activated for user ${userId} via ${paymentMethod}. Expires: ${expirationDate.toISOString()}`,
    );

    return {
      subscription_status: 'active',
      plan: 'premium',
      payment_method: paymentMethod,
      expiry_date: expirationDate,
      remaining_coins: remainingCoins,
    };
  }

  /**
   * Check if user has active premium
   */
  private isUserPremium(user: User): boolean {
    if (!user.premiumExpiresAt) {
      return false;
    }
    return new Date(user.premiumExpiresAt) > new Date();
  }

  /**
   * Check premium status
   */
  async checkPremiumStatus(userId: string): Promise<{ isPremium: boolean; expiresAt?: Date }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['premiumExpiresAt'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPremium = this.isUserPremium(user);

    return {
      isPremium,
      expiresAt: isPremium ? user.premiumExpiresAt : undefined,
    };
  }
}
