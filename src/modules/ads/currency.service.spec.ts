/// <reference types="jest" />

import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CurrencyService } from './currency.service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

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
    } as any);

    const service = new CurrencyService(
      new ConfigService({
        EXCHANGE_RATE_API_URL: 'https://example.test/latest/USD',
        EXCHANGE_RATE_CACHE_TTL_MS: '0',
        EXCHANGE_RATE_TIMEOUT_MS: '1000',
      }),
    );

    const usdPrice = await service.convertToUsd(160000, 'NGN');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://example.test/latest/USD',
      expect.objectContaining({ timeout: 1000 }),
    );
    expect(usdPrice).toBe(100);
  });

  it('falls back to bundled rates when the live refresh is unavailable', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('network down'));

    const service = new CurrencyService(
      new ConfigService({
        EXCHANGE_RATE_API_URL: 'https://example.test/latest/USD',
        EXCHANGE_RATE_CACHE_TTL_MS: '0',
      }),
    );

    const usdPrice = await service.convertToUsd(100, 'GBP');

    expect(usdPrice).toBe(127);
  });
});
