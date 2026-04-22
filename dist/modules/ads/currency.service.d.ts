import { ConfigService } from '@nestjs/config';
export declare class CurrencyService {
    private configService;
    private readonly logger;
    private readonly fallbackExchangeRates;
    private exchangeRates;
    private lastUpdatedAt;
    private refreshPromise;
    constructor(configService: ConfigService);
    convertToUsd(price: number, currency: string): Promise<number | null>;
    getExchangeRate(currency: string): number | null;
    isSupportedCurrency(currency: string): boolean;
    getSupportedCurrencies(): string[];
    canShowUsdPrice(tier: string): boolean;
    private ensureExchangeRatesAreFresh;
    private refreshExchangeRates;
    private getCacheTtlMs;
    private getTimeoutMs;
}
