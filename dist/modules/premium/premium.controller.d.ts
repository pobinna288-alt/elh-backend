import { PremiumService } from './premium.service';
import { PremiumActivationResponseDto, UnlockPremiumDto } from './dto/premium.dto';
export declare class PremiumController {
    private readonly premiumService;
    constructor(premiumService: PremiumService);
    unlockPremium(unlockPremiumDto: UnlockPremiumDto, req: any): Promise<PremiumActivationResponseDto>;
}
