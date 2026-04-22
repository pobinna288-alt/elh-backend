const {
  convertToUsd,
  normalizeCurrencyCode,
} = require("../services/currencyConversionService");

const PAID_PLANS = new Set(["starter", "pro", "elite", "enterprise"]);

const COUNTRY_CURRENCY_MAP = Object.freeze({
  NG: "NGN",
  KE: "KES",
  GH: "GHS",
  ZA: "ZAR",
  EG: "EGP",
  US: "USD",
  GB: "GBP",
  EU: "EUR",
  IN: "INR",
  AE: "AED",
  SA: "SAR",
  JP: "JPY",
  CN: "CNY",
  BR: "BRL",
  CA: "CAD",
  AU: "AUD",
});

const DIAL_CODE_CURRENCY_MAP = Object.freeze({
  "234": "NGN",
  "233": "GHS",
  "254": "KES",
  "27": "ZAR",
  "20": "EGP",
  "1": "USD",
  "44": "GBP",
  "91": "INR",
  "971": "AED",
  "966": "SAR",
});

function normalizePlan(user = {}) {
  const rawPlan = `${
    user.plan ||
    user.subscriptionLevel ||
    user.subscriptionPlan ||
    "free"
  }`.trim().toLowerCase();

  if (rawPlan === "premium") {
    return "starter";
  }

  if (rawPlan === "normal" || rawPlan === "basic") {
    return "free";
  }

  return rawPlan;
}

function normalizeCountryCode(country) {
  const normalized = `${country || ""}`.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(normalized)) {
    return normalized;
  }
  return "";
}

function normalizeDialCode(value) {
  return `${value || ""}`.replace(/[^\d]/g, "");
}

function inferLocalCurrency(user = {}, fallbackCurrency = "USD") {
  const explicitCurrency = `${user.currency || user.localCurrency || ""}`.trim();
  if (explicitCurrency) {
    return normalizeCurrencyCode(explicitCurrency);
  }

  const countryCode = normalizeCountryCode(
    user.country || user.countryCode || user.country_code || user.regionCode,
  );
  if (countryCode && COUNTRY_CURRENCY_MAP[countryCode]) {
    return COUNTRY_CURRENCY_MAP[countryCode];
  }

  const dialCode = normalizeDialCode(
    user.countryDialCode || user.phoneCountryCode || user.countryCode || user.country_code,
  );
  if (dialCode && DIAL_CODE_CURRENCY_MAP[dialCode]) {
    return DIAL_CODE_CURRENCY_MAP[dialCode];
  }

  return normalizeCurrencyCode(fallbackCurrency || "USD");
}

function resolveSourceCurrency(aiResponse = {}) {
  const candidates = [
    aiResponse.currency,
    aiResponse.original_currency,
  ];

  for (const value of candidates) {
    const normalized = `${value || ""}`.trim();
    if (normalized) {
      return normalizeCurrencyCode(normalized);
    }
  }

  return "USD";
}

async function normalizeCloseFlowCurrency(user, amount, sourceCurrency) {
  const parsedAmount = Number(amount);
  const normalizedSourceCurrency = normalizeCurrencyCode(sourceCurrency || "USD");
  const plan = normalizePlan(user);

  if (!PAID_PLANS.has(plan)) {
    const localCurrency = inferLocalCurrency(user, normalizedSourceCurrency);
    return {
      deal_price: Number.isFinite(parsedAmount) ? parsedAmount : null,
      currency: localCurrency,
      original_currency: normalizedSourceCurrency !== localCurrency ? normalizedSourceCurrency : undefined,
      converted: false,
    };
  }

  if (!Number.isFinite(parsedAmount)) {
    return {
      deal_price: null,
      currency: "USD",
      original_currency: normalizedSourceCurrency !== "USD" ? normalizedSourceCurrency : undefined,
      converted: false,
    };
  }

  try {
    const convertedAmount = await convertToUsd(parsedAmount, normalizedSourceCurrency);
    if (Number.isFinite(convertedAmount)) {
      return {
        deal_price: convertedAmount,
        currency: "USD",
        original_currency: normalizedSourceCurrency !== "USD" ? normalizedSourceCurrency : undefined,
        converted: normalizedSourceCurrency !== "USD",
      };
    }
  } catch (_error) {
    // Never block CloseFlow response delivery on conversion failures.
  }

  return {
    deal_price: parsedAmount,
    currency: normalizedSourceCurrency,
    original_currency: normalizedSourceCurrency !== "USD" ? normalizedSourceCurrency : undefined,
    converted: false,
  };
}

function applyCurrencyMeta(target, normalizedCurrencyResult) {
  target.currency = normalizedCurrencyResult.currency;
  target.converted = normalizedCurrencyResult.converted;

  if (
    normalizedCurrencyResult.original_currency &&
    normalizedCurrencyResult.original_currency !== normalizedCurrencyResult.currency
  ) {
    target.original_currency = normalizedCurrencyResult.original_currency;
  } else {
    delete target.original_currency;
  }
}

async function formatCloseFlowCurrencyResponse(user, aiResponse = {}) {
  if (!aiResponse || typeof aiResponse !== "object") {
    return aiResponse;
  }

  const formattedResponse = { ...aiResponse };
  const sourceCurrency = resolveSourceCurrency(aiResponse);

  const normalizeField = async (fieldPath, value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return;
    }

    const normalized = await normalizeCloseFlowCurrency(user, numericValue, sourceCurrency);

    if (Number.isFinite(normalized.deal_price)) {
      if (fieldPath.length === 1) {
        formattedResponse[fieldPath[0]] = normalized.deal_price;
      }

      if (
        fieldPath.length === 2 &&
        formattedResponse[fieldPath[0]] &&
        typeof formattedResponse[fieldPath[0]] === "object"
      ) {
        formattedResponse[fieldPath[0]][fieldPath[1]] = normalized.deal_price;
      }
    }

    applyCurrencyMeta(formattedResponse, normalized);
  };

  try {
    if (Number.isFinite(Number(formattedResponse.recommended_price))) {
      await normalizeField(["recommended_price"], formattedResponse.recommended_price);
    }

    if (formattedResponse.price_range && typeof formattedResponse.price_range === "object") {
      await normalizeField(["price_range", "low"], formattedResponse.price_range.low);
      await normalizeField(["price_range", "fair"], formattedResponse.price_range.fair);
      await normalizeField(["price_range", "high"], formattedResponse.price_range.high);
    }

    if (formattedResponse.broad_price_range && typeof formattedResponse.broad_price_range === "object") {
      await normalizeField(["broad_price_range", "low"], formattedResponse.broad_price_range.low);
      await normalizeField(["broad_price_range", "fair"], formattedResponse.broad_price_range.fair);
      await normalizeField(["broad_price_range", "high"], formattedResponse.broad_price_range.high);
    }

    if (Number.isFinite(Number(formattedResponse.recommended_price))) {
      formattedResponse.deal_price = Number(formattedResponse.recommended_price);
    }

    if (!formattedResponse.currency) {
      const fallback = await normalizeCloseFlowCurrency(
        user,
        formattedResponse.deal_price,
        sourceCurrency,
      );
      applyCurrencyMeta(formattedResponse, fallback);
    }

    return formattedResponse;
  } catch (_error) {
    return formattedResponse;
  }
}

module.exports = {
  formatCloseFlowCurrencyResponse,
};
