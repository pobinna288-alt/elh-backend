import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { WalletService } from '../wallet/wallet.service';
import { PremiumActivationResponseDto, UnlockPremiumDto } from './dto/premium.dto';
import { PaymentsService } from '../payments/payments.service';
export declare class PremiumService {
    private readonly userRepository;
    private readonly walletService;
    private readonly paymentsService;
    private readonly logger;
    constructor(userRepository: Repository<User>, walletService: WalletService, paymentsService: PaymentsService);
    unlockPremium(userId: string, unlockPremiumDto: UnlockPremiumDto): Promise<PremiumActivationResponseDto>;
    private isUserPremium;
    checkPremiumStatus(userId: string): Promise<{
        isPremium: boolean;
        expiresAt?: Date;
    }>;
}
