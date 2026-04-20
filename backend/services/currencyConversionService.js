const axios = require("axios");

const FALLBACK_USD_RATES = Object.freeze({
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
});

let cachedUsdRates = { ...FALLBACK_USD_RATES };
let lastRefreshAt = 0;
let refreshPromise = null;

function getExchangeRateApiUrl() {
  return process.env.EXCHANGE_RATE_API_URL || "https://open.er-api.com/v6/latest/USD";
}

function getExchangeRateCacheTtlMs() {
  const parsedValue = Number.parseInt(process.env.EXCHANGE_RATE_CACHE_TTL_MS || "3600000", 10);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : 3600000;
}

function getExchangeRateTimeoutMs() {
  const parsedValue = Number.parseInt(process.env.EXCHANGE_RATE_TIMEOUT_MS || "5000", 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 5000;
}

function normalizeCurrencyCode(currency) {
  const normalized = `${currency || "USD"}`.trim().toUpperCase();
  return normalized || "USD";
}

async function refreshExchangeRates() {
  const response = await axios.get(getExchangeRateApiUrl(), {
    timeout: getExchangeRateTimeoutMs(),
    headers: { Accept: "application/json" },
  });

  const providerRates = response.data?.rates;
  if (!providerRates || typeof providerRates !== "object") {
    throw new Error("Exchange rate response did not include rates");
  }

  const normalizedRates = Object.entries(providerRates).reduce((accumulator, [currency, rate]) => {
    if (typeof rate === "number" && rate > 0) {
      const upperCurrency = currency.toUpperCase();
      accumulator[upperCurrency] = upperCurrency === "USD" ? 1 : 1 / rate;
    }
    return accumulator;
  }, { USD: 1 });

  cachedUsdRates = {
    ...FALLBACK_USD_RATES,
    ...normalizedRates,
  };
  lastRefreshAt = Date.now();

  return cachedUsdRates;
}

async function ensureFreshExchangeRates() {
  const cacheAge = Date.now() - lastRefreshAt;
  if (lastRefreshAt > 0 && cacheAge <= getExchangeRateCacheTtlMs()) {
    return cachedUsdRates;
  }

  if (!refreshPromise) {
    refreshPromise = refreshExchangeRates()
      .catch((error) => {
        lastRefreshAt = Date.now();
        console.warn(`[Currency Conversion] Using cached/fallback exchange rates: ${error.message}`);
        return cachedUsdRates;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function convertToUsd(price, currency) {
  const parsedPrice = Number(price);
  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    return null;
  }

  const normalizedCurrency = normalizeCurrencyCode(currency);
  if (normalizedCurrency === "USD") {
    return Math.round(parsedPrice * 100) / 100;
  }

  await ensureFreshExchangeRates();

  const usdRate = cachedUsdRates[normalizedCurrency];
  if (!usdRate) {
    return null;
  }

  return Math.round(parsedPrice * usdRate * 100) / 100;
}

function getCurrentUsdRate(currency) {
  const normalizedCurrency = normalizeCurrencyCode(currency);
  return cachedUsdRates[normalizedCurrency] || null;
}

module.exports = {
  FALLBACK_USD_RATES,
  normalizeCurrencyCode,
  ensureFreshExchangeRates,
  convertToUsd,
  getCurrentUsdRate,
};
