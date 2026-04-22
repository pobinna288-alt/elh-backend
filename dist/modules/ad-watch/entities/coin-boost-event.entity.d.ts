export declare class CoinBoostEvent {
    id: string;
    name: string;
    description: string;
    eventType: string;
    multiplier: number;
    startTime: Date;
    endTime: Date;
    isActive: boolean;
    eligibleTiers: string[];
    maxTotalCoins: number;
    coinsDistributed: number;
    createdAt: Date;
    updatedAt: Date;
}
