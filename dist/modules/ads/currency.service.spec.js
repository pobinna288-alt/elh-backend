"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
const currency_service_1 = require("./currency.service");
jest.mock('axios');
const mockedAxios = axios_1.default;
describe('CurrencyService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('uses the latest exchange rate data when converting local currency to USD', async () => {
        mockedAxios.get.mockResolvedValue({
            data: {
                rates: {
                    USD: 1,
                    NGN: 1600,
                    EUR: 0.92,
                },
            },
        });
        const service = new currency_service_1.CurrencyService(new config_1.ConfigService({
            EXCHANGE_RATE_API_URL: 'https://example.test/latest/USD',
            EXCHANGE_RATE_CACHE_TTL_MS: '0',
            EXCHANGE_RATE_TIMEOUT_MS: '1000',
        }));
        const usdPrice = await service.convertToUsd(160000, 'NGN');
        expect(mockedAxios.get).toHaveBeenCalledWith('https://example.test/latest/USD', expect.objectContaining({ timeout: 1000 }));
        expect(usdPrice).toBe(100);
    });
    it('falls back to bundled rates when the live refresh is unavailable', async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error('network down'));
        const service = new currency_service_1.CurrencyService(new config_1.ConfigService({
            EXCHANGE_RATE_API_URL: 'https://example.test/latest/USD',
            EXCHANGE_RATE_CACHE_TTL_MS: '0',
        }));
        const usdPrice = await service.convertToUsd(100, 'GBP');
        expect(usdPrice).toBe(127);
    });
});
//# sourceMappingURL=currency.service.spec.js.map