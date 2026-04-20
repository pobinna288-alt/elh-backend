import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Currency Conversion Service
 *
 * Allows every ad tier to submit a local currency price while the backend
 * stores the latest USD equivalent for global pricing and reach calculations.
 */
@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  private readonly fallbackExchangeRates: Record<string, number> = {
    USD: 1.0,
    EUR: 1.08,
    GBP: 1.27,
    NGN: 0.00065,
    KES: 0.0078,
    GHS: 0.082,
    ZAR: 0.055,
    EGP: 0.032,
    MAD: 0.1,
    INR: 0.012,
    AED: 0.27,
    SAR: 0.27,
    JPY: 0.0067,
    CNY: 0.14,
    BRL: 0.2,
    CAD: 0.74,
    AUD: 0.65,
  };

  private exchangeRates: Record<string, number> = { ...this.fallbackExchangeRates };
  private lastUpdatedAt = 0;
  private refreshPromise: Promise<void> | null = null;

  constructor(private configService: ConfigService) {}

  /**
   * Convert price from local currency to USD using the latest available rate.
   */
  async convertToUsd(price: number, currency: string): Promise<number | null> {
    if (!price || price <= 0) {
      return null;
    }

    const upperCurrency = `${currency || 'USD'}`.trim().toUpperCase();

    if (upperCurrency === 'USD') {
      return Math.round(price * 100) / 100;
    }

    await this.ensureExchangeRatesAreFresh();

    const rate = this.exchangeRates[upperCurrency];
    if (!rate) {
      this.logger.warn(`Unknown currency: ${currency}, cannot convert to USD`);
      return null;
    }

    return Math.round(price * rate * 100) / 100;
  }

  /**
   * Get the most recently cached USD conversion rate for a currency.
   */
  getExchangeRate(currency: string): number | null {
    const normalizedCurrency = `${currency || ''}`.trim().toUpperCase();
    return this.exchangeRates[normalizedCurrency] || this.fallbackExchangeRates[normalizedCurrency] || null;
  }

  isSupportedCurrency(currency: string): boolean {
    return this.getExchangeRate(currency) !== null;
  }

  getSupportedCurrencies(): string[] {
    return Object.keys(this.exchangeRates);
  }

  /**
   * Premium and above can see USD prices for global reach campaigns.
   */
  canShowUsdPrice(tier: string): boolean {
    const allowedTiers = ['premium', 'pro', 'hot', 'enterprise'];
    return allowedTiers.includes(tier?.toLowerCase());
  }

  private async ensureExchangeRatesAreFresh(): Promise<void> {
    const cacheAge = Date.now() - this.lastUpdatedAt;
    if (this.lastUpdatedAt > 0 && cacheAge <= this.getCacheTtlMs()) {
      return;
    }

    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshExchangeRates().finally(() => {
        this.refreshPromise = null;
      });
    }

    await this.refreshPromise;
  }

  private async refreshExchangeRates(): Promise<void> {
    const apiUrl = this.configService.get<string>('EXCHANGE_RATE_API_URL') || 'https://open.er-api.com/v6/latest/USD';

    try {
      const response = await axios.get(apiUrl, {
        timeout: this.getTimeoutMs(),
        headers: { Accept: 'application/json' },
      });

      const providerRates = response.data?.rates;
      if (!providerRates || typeof providerRates !== 'object') {
        throw new Error('Exchange rate response did not include rates');
      }

      const normalizedRates = Object.entries(providerRates).reduce<Record<string, number>>(
        (accumulator, [currency, rate]) => {
          if (typeof rate === 'number' && rate > 0) {
            const upperCurrency = currency.toUpperCase();
            accumulator[upperCurrency] = upperCurrency === 'USD' ? 1 : 1 / rate;
          }
          return accumulator;
        },
        { USD: 1 },
      );

      this.exchangeRates = {
        ...this.fallbackExchangeRates,
        ...normalizedRates,
      };
      this.lastUpdatedAt = Date.now();
    } catch (error) {
      this.lastUpdatedAt = Date.now();
      const message = error instanceof Error ? error.message : 'Unknown exchange rate error';
      this.logger.warn(`Using cached/fallback exchange rates: ${message}`);
    }
  }

  private getCacheTtlMs(): number {
    const configuredValue = Number(this.configService.get('EXCHANGE_RATE_CACHE_TTL_MS') ?? 3600000);
    return Number.isFinite(configuredValue) && configuredValue >= 0 ? configuredValue : 3600000;
  }

  private getTimeoutMs(): number {
    const configuredValue = Number(this.configService.get('EXCHANGE_RATE_TIMEOUT_MS') ?? 5000);
    return Number.isFinite(configuredValue) && configuredValue > 0 ? configuredValue : 5000;
  }
}
