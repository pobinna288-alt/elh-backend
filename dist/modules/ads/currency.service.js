"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CurrencyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrencyService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
let CurrencyService = CurrencyService_1 = class CurrencyService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(CurrencyService_1.name);
        this.fallbackExchangeRates = {
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
        this.exchangeRates = { ...this.fallbackExchangeRates };
        this.lastUpdatedAt = 0;
        this.refreshPromise = null;
    }
    async convertToUsd(price, currency) {
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
    getExchangeRate(currency) {
        const normalizedCurrency = `${currency || ''}`.trim().toUpperCase();
        return this.exchangeRates[normalizedCurrency] || this.fallbackExchangeRates[normalizedCurrency] || null;
    }
    isSupportedCurrency(currency) {
        return this.getExchangeRate(currency) !== null;
    }
    getSupportedCurrencies() {
        return Object.keys(this.exchangeRates);
    }
    canShowUsdPrice(tier) {
        const allowedTiers = ['premium', 'pro', 'hot', 'enterprise'];
        return allowedTiers.includes(tier?.toLowerCase());
    }
    async ensureExchangeRatesAreFresh() {
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
    async refreshExchangeRates() {
        const apiUrl = this.configService.get('EXCHANGE_RATE_API_URL') || 'https://open.er-api.com/v6/latest/USD';
        try {
            const response = await axios_1.default.get(apiUrl, {
                timeout: this.getTimeoutMs(),
                headers: { Accept: 'application/json' },
            });
            const providerRates = response.data?.rates;
            if (!providerRates || typeof providerRates !== 'object') {
                throw new Error('Exchange rate response did not include rates');
            }
            const normalizedRates = Object.entries(providerRates).reduce((accumulator, [currency, rate]) => {
                if (typeof rate === 'number' && rate > 0) {
                    const upperCurrency = currency.toUpperCase();
                    accumulator[upperCurrency] = upperCurrency === 'USD' ? 1 : 1 / rate;
                }
                return accumulator;
            }, { USD: 1 });
            this.exchangeRates = {
                ...this.fallbackExchangeRates,
                ...normalizedRates,
            };
            this.lastUpdatedAt = Date.now();
        }
        catch (error) {
            this.lastUpdatedAt = Date.now();
            const message = error instanceof Error ? error.message : 'Unknown exchange rate error';
            this.logger.warn(`Using cached/fallback exchange rates: ${message}`);
        }
    }
    getCacheTtlMs() {
        const configuredValue = Number(this.configService.get('EXCHANGE_RATE_CACHE_TTL_MS') ?? 3600000);
        return Number.isFinite(configuredValue) && configuredValue >= 0 ? configuredValue : 3600000;
    }
    getTimeoutMs() {
        const configuredValue = Number(this.configService.get('EXCHANGE_RATE_TIMEOUT_MS') ?? 5000);
        return Number.isFinite(configuredValue) && configuredValue > 0 ? configuredValue : 5000;
    }
};
exports.CurrencyService = CurrencyService;
exports.CurrencyService = CurrencyService = CurrencyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CurrencyService);
//# sourceMappingURL=currency.service.js.map