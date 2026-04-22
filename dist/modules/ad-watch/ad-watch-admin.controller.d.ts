import { AdWatchService } from './ad-watch.service';
import { CoinBoostEvent } from './entities/coin-boost-event.entity';
export declare class CreateBoostEventDto {
    name: string;
    description?: string;
    multiplier: number;
    startTime: Date;
    endTime: Date;
    eligibleTiers?: string[];
    maxTotalCoins?: number;
}
export declare class AdWatchAdminController {
    private readonly adWatchService;
    constructor(adWatchService: AdWatchService);
    createBoostEvent(dto: CreateBoostEventDto): Promise<CoinBoostEvent>;
    getAllBoostEvents(): Promise<CoinBoostEvent[]>;
    deactivateBoostEvent(id: string): Promise<{
        success: boolean;
    }>;
}
