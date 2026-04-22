import { WalletService } from './wallet.service';
import { AddCoinsDto, CoinsResponseDto } from './dto/coins.dto';
export declare class WalletController {
    private readonly walletService;
    constructor(walletService: WalletService);
    addCoins(addCoinsDto: AddCoinsDto, req: any): Promise<CoinsResponseDto>;
}
