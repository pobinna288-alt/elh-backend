const crypto = require("crypto");
const Redis = require("ioredis");
const { getMarketTrends } = require("./serpApiService");
const DEFAULT_TIMEOUT_MS = 6500;
const MARKET_INTERNAL_AUTH_SECRET = process.env.MARKET_INTERNAL_AUTH_SECRET || "";
const MARKET_INTERNAL_AUTH_TOLERANCE_MS = Number.parseInt(process.env.MARKET_INTERNAL_AUTH_TOLERANCE_MS || "300000", 10);
const MARKET_CONNECTIVITY_TIMEOUT_MS = Number.parseInt(process.env.MARKET_CONNECTIVITY_TIMEOUT_MS || "3500", 10);
const MARKET_FETCH_RETRIES = Math.max(1, Math.min(4, Number.parseInt(process.env.MARKET_FETCH_RETRIES || "2", 10) || 2));
const MARKET_STARTUP_PROBE_ENABLED = process.env.MARKET_STARTUP_PROBE_ENABLED !== "false";
const MARKET_STARTUP_PROBE_RETRIES = Math.max(1, Math.min(4, Number.parseInt(process.env.MARKET_STARTUP_PROBE_RETRIES || "2", 10) || 2));
const DISABLE_MARKET_INTELLIGENCE = process.env.DISABLE_MARKET_INTELLIGENCE === "true";
const MARKET_INTELLIGENCE_STRICT_STARTUP = process.env.MARKET_INTELLIGENCE_STRICT_STARTUP === "true";

const MARKET_SOURCE = Object.freeze({
  TRENDS: "google_trends",
  EBAY: "ebay_market",
  AMAZON: "amazon_product",
});

const SOURCE_ENV_MAPPING = Object.freeze({
  [MARKET_SOURCE.TRENDS]: {
    urlKey: "GOOGLE_TRENDS_API_URL",
    apiKeyKey: "GOOGLE_TRENDS_API_KEY",
    name: "Google Trends",
  },
  [MARKET_SOURCE.EBAY]: {
    urlKey: "EBAY_MARKET_API_URL",
    apiKeyKey: "EBAY_MARKET_API_KEY",
    name: "eBay Market",
  },
  [MARKET_SOURCE.AMAZON]: {
    urlKey: "AMAZON_PRODUCT_API_URL",
    apiKeyKey: "AMAZON_PRODUCT_API_KEY",
    name: "Amazon Product",
  },
});

const FEATURE_POLICY = Object.freeze({
  revenue_copy: { sources: [MARKET_SOURCE.TRENDS] },
  ad_guardian: { sources: [MARKET_SOURCE.TRENDS] },
  demand_pulse: { sources: [MARKET_SOURCE.TRENDS] },
  closeflow: { sources: [MARKET_SOURCE.TRENDS, MARKET_SOURCE.EBAY, MARKET_SOURCE.AMAZON] },
  default: { sources: [MARKET_SOURCE.TRENDS] },
});

let redisClient = null;
let redisErrorLogged = false;
let marketStatusReasonLogKey = "";

function buildRedisOptions() {
  return {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy: () => null,
    reconnectOnError: () => false,
  };
}

function attachRedisErrorHandler(client, label) {
  client.on("error", (error) => {
    if (!redisErrorLogged) {
      console.warn(`[Market Intelligence] Redis unavailable (${label}) - degraded mode enabled:`, error.message);
      redisErrorLogged = true;
    }
  });
  return client;
}

const OBSERVABILITY = {
  totalCalls: 0,
  closeflowCalls: 0,
  fallbackTriggerCount: 0,
  apiCallCountPerSource: {
    [MARKET_SOURCE.TRENDS]: 0,
    [MARKET_SOURCE.EBAY]: 0,
    [MARKET_SOURCE.AMAZON]: 0,
  },
};

function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  if (process.env.REDIS_ENABLED === "false") {
    return null;
  }

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    redisClient = attachRedisErrorHandler(new Redis(redisUrl, buildRedisOptions()), "url");
    return redisClient;
  }

  if (!process.env.REDIS_HOST) {
    return null;
  }

  redisClient = attachRedisErrorHandler(new Redis({
    host: process.env.REDIS_HOST || "redis",
    port: Number.parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    ...buildRedisOptions(),
  }), "host");

  return redisClient;
}

function marketCacheRedisKey(cacheKey) {
  return `market:cache:${cacheKey}`;
}

function marketSnapshotRedisKey(sourceName) {
  return `market:snapshot:${sourceName}`;
}

function getSanitizedEnv(name) {
  const raw = process.env[name];
  if (typeof raw !== "string") {
    return "";
  }

  return raw.trim();
}

function resolveSourceEnv(sourceName) {
  return SOURCE_ENV_MAPPING[sourceName] || SOURCE_ENV_MAPPING[MARKET_SOURCE.TRENDS];
}

function getSourceReadiness(sourceName) {
  const envKeys = resolveSourceEnv(sourceName);
  const allowKeyless = process.env.ALLOW_KEYLESS_MARKET_APIS === "true";
  const url = getSanitizedEnv(envKeys.urlKey);
  const key = getSanitizedEnv(envKeys.apiKeyKey);

  const reasons = [];
  if (!url) {
    reasons.push(`missing ${envKeys.urlKey}`);
  }

  if (!allowKeyless && !key) {
    reasons.push(`missing ${envKeys.apiKeyKey} (ALLOW_KEYLESS_MARKET_APIS=false)`);
  }

  return {
    source: sourceName,
    displayName: envKeys.name,
    env: envKeys,
    url,
    key,
    allowKeyless,
    available: reasons.length === 0,
    reasons,
  };
}

function getMarketApiStatusDetails() {
  if (DISABLE_MARKET_INTELLIGENCE) {
    return {
      status: "disabled",
      activeCount: 0,
      sourceReadiness: [
        getSourceReadiness(MARKET_SOURCE.TRENDS),
        getSourceReadiness(MARKET_SOURCE.EBAY),
        getSourceReadiness(MARKET_SOURCE.AMAZON),
      ],
      disableReasons: ["DISABLE_MARKET_INTELLIGENCE=true"],
    };
  }

  const sourceReadiness = [
    getSourceReadiness(MARKET_SOURCE.TRENDS),
    getSourceReadiness(MARKET_SOURCE.EBAY),
    getSourceReadiness(MARKET_SOURCE.AMAZON),
  ];

  const activeCount = sourceReadiness.filter((item) => item.available).length;
  const status = activeCount === 3 ? "active" : activeCount > 0 ? "partial" : "disabled";
  const disableReasons = sourceReadiness
    .filter((item) => item.reasons.length)
    .map((item) => `${item.source}: ${item.reasons.join(", ")}`);

  return {
    status,
    activeCount,
    sourceReadiness,
    disableReasons,
  };
}

function logMarketStatusReasonsOnce(statusDetails) {
  if (!statusDetails || statusDetails.status === "active") {
    return;
  }

  const reasonKey = `${statusDetails.status}:${statusDetails.disableReasons.join("|")}`;
  if (reasonKey === marketStatusReasonLogKey) {
    return;
  }

  marketStatusReasonLogKey = reasonKey;
  console.warn(
    `[Market Intelligence] API status is ${statusDetails.status}. Reasons: ${statusDetails.disableReasons.join("; ") || "unknown"}`,
  );
}

function sourceConfig(sourceName) {
  const readiness = getSourceReadiness(sourceName);
  return {
    url: readiness.url,
    key: readiness.key,
    available: readiness.available,
    reasons: readiness.reasons,
  };
}

function computeMarketApiStatus() {
  const details = getMarketApiStatusDetails();
  logMarketStatusReasonsOnce(details);
  return details.status;
}

function nowMs() {
  return Date.now();
}

function parseBoundedInt(value, fallback, min, max) {
  const parsed = Number.parseInt(`${value ?? ""}`, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, parsed));
}

function parseBoundedFloat(value, fallback, min, max) {
  const parsed = Number.parseFloat(`${value ?? ""}`);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, parsed));
}

function safeEqualHex(a, b) {
  const left = Buffer.from(`${a || ""}`, "hex");
  const right = Buffer.from(`${b || ""}`, "hex");
  if (left.length === 0 || right.length === 0 || left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function validateInternalAuth(feature, options = {}) {
  // Skip internal auth validation in MVP mode
  if (process.env.CLOSEFLOW_MVP === "true") {
    return;
  }

  if (!MARKET_INTERNAL_AUTH_SECRET) {
    const error = new Error("Market intelligence internal auth secret is not configured.");
    error.code = "MARKET_INTERNAL_AUTH_NOT_CONFIGURED";
    error.statusCode = 503;
    throw error;
  }

  const auth = options.internalAuth || {};
  const service = `${auth.service || ""}`.trim();
  const requestCycleId = `${auth.requestCycleId || "none"}`.trim();
  const subscriptionLevel = `${auth.subscriptionLevel || "unknown"}`.trim();
  const timestamp = Number.parseInt(`${auth.timestamp || ""}`, 10);
  const signature = `${auth.signature || ""}`.trim();

  if (!service || !signature || !Number.isFinite(timestamp)) {
    const error = new Error("Market intelligence request blocked: missing internal auth payload.");
    error.code = "MARKET_INTERNAL_AUTH_MISSING";
    error.statusCode = 403;
    throw error;
  }

  if (Math.abs(Date.now() - timestamp) > MARKET_INTERNAL_AUTH_TOLERANCE_MS) {
    const error = new Error("Market intelligence request blocked: internal auth timestamp expired.");
    error.code = "MARKET_INTERNAL_AUTH_EXPIRED";
    error.statusCode = 403;
    throw error;
  }

  const payload = `${feature}|${requestCycleId}|${subscriptionLevel}|${timestamp}`;
  const expected = crypto.createHmac("sha256", MARKET_INTERNAL_AUTH_SECRET).update(payload).digest("hex");
  if (!safeEqualHex(expected, signature)) {
    const error = new Error("Market intelligence request blocked: invalid internal auth signature.");
    error.code = "MARKET_INTERNAL_AUTH_INVALID";
    error.statusCode = 403;
    throw error;
  }
}

function getSourceTtlMs(sourceName) {
  if (sourceName === MARKET_SOURCE.TRENDS) {
    return parseBoundedInt(process.env.MARKET_CACHE_TTL_TRENDS_MIN, 20, 10, 30) * 60 * 1000;
  }

  if (sourceName === MARKET_SOURCE.EBAY) {
    return parseBoundedInt(process.env.MARKET_CACHE_TTL_EBAY_MIN, 30, 15, 60) * 60 * 1000;
  }

  if (sourceName === MARKET_SOURCE.AMAZON) {
    return parseBoundedInt(process.env.MARKET_CACHE_TTL_AMAZON_MIN, 30, 15, 60) * 60 * 1000;
  }

  return 20 * 60 * 1000;
}

function getSourceUnitCost(sourceName) {
  if (sourceName === MARKET_SOURCE.TRENDS) {
    return parseBoundedFloat(process.env.MARKET_COST_TRENDS, 0.002, 0, 10);
  }

  if (sourceName === MARKET_SOURCE.EBAY) {
    return parseBoundedFloat(process.env.MARKET_COST_EBAY, 0.004, 0, 10);
  }

  if (sourceName === MARKET_SOURCE.AMAZON) {
    return parseBoundedFloat(process.env.MARKET_COST_AMAZON, 0.004, 0, 10);
  }

  return 0;
}

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.-]/g, "");
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function avg(values = []) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) {
    return null;
  }

  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function detectTrendDirection(series = []) {
  if (!Array.isArray(series) || series.length < 2) {
    return "stable";
  }

  const first = toNumber(series[0]);
  const last = toNumber(series[series.length - 1]);
  if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) {
    return "stable";
  }

  const delta = ((last - first) / Math.abs(first)) * 100;
  if (delta >= 8) {
    return "rising";
  }
  if (delta <= -8) {
    return "declining";
  }

  return "stable";
}

async function fetchJson(url, {
  headers = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
  retries = MARKET_FETCH_RETRIES,
  label = "market-api",
} = {}) {
  if (!url || typeof fetch !== "function") {
    return {
      ok: false,
      data: null,
      error: "fetch unavailable or URL missing",
      attempts: 0,
    };
  }

  let lastError = "unknown error";
  const attempts = Math.max(1, retries);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
      } else {
        const data = await response.json();
        return {
          ok: true,
          data,
          statusCode: response.status,
          attempts: attempt,
          error: null,
        };
      }
    } catch (error) {
      lastError = error?.name === "AbortError"
        ? `request timeout after ${timeoutMs}ms`
        : (error?.message || "network request failed");
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < attempts) {
      console.warn(`[Market Intelligence] ${label} attempt ${attempt}/${attempts} failed: ${lastError}. Retrying...`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 200));
    }
  }

  return {
    ok: false,
    data: null,
    error: lastError,
    attempts,
  };
}

async function probeSourceConnectivity(sourceName, retries = MARKET_STARTUP_PROBE_RETRIES) {
  const readiness = getSourceReadiness(sourceName);
  if (!readiness.url) {
    return {
      source: sourceName,
      reachable: false,
      skipped: true,
      reason: readiness.reasons.join("; ") || "missing source URL",
    };
  }

  if (typeof fetch !== "function") {
    return {
      source: sourceName,
      reachable: false,
      skipped: true,
      reason: "fetch is unavailable in this runtime",
    };
  }

  const attempts = Math.max(1, retries);
  let lastError = "unknown error";

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MARKET_CONNECTIVITY_TIMEOUT_MS);

    try {
      const response = await fetch(readiness.url, {
        method: "GET",
        headers: readiness.key ? { "x-api-key": readiness.key, authorization: `Bearer ${readiness.key}` } : {},
        signal: controller.signal,
      });

      // 2xx-4xx still proves network-level reachability.
      if (response.status < 500) {
        return {
          source: sourceName,
          reachable: true,
          skipped: false,
          statusCode: response.status,
          attempts: attempt,
          reason: response.ok ? "reachable" : `reachable but returned HTTP ${response.status}`,
        };
      }

      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error?.name === "AbortError"
        ? `probe timeout after ${MARKET_CONNECTIVITY_TIMEOUT_MS}ms`
        : (error?.message || "connectivity probe failed");
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 150));
    }
  }

  return {
    source: sourceName,
    reachable: false,
    skipped: false,
    attempts,
    reason: lastError,
  };
}

function buildUrl(baseUrl, params = {}) {
  if (!baseUrl) {
    return null;
  }

  try {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && `${value}`.trim() !== "") {
        url.searchParams.set(key, `${value}`);
      }
    });
    return url.toString();
  } catch (_error) {
    return null;
  }
}

function pickArray(source, fallback = []) {
  return Array.isArray(source) ? source : fallback;
}

function parseTrendsPayload(data) {
  if (!data || typeof data !== "object") {
    return {
      demandScore: null,
      trendDirection: "stable",
      bestTiming: "N/A",
      rawSeries: [],
    };
  }

  const series = pickArray(data.interestOverTime || data.series || data.trend || data.values || data.data, []);
  const numericSeries = series
    .map((item) => {
      if (typeof item === "number") {
        return item;
      }
      if (typeof item === "object" && item) {
        return toNumber(item.value ?? item.score ?? item.interest);
      }
      return toNumber(item);
    })
    .filter((value) => Number.isFinite(value));

  const directScore = toNumber(data.demandScore ?? data.score ?? data.interestScore ?? data.trendScore);
  const inferredScore = avg(numericSeries);
  const demandScore = clamp(Math.round(directScore ?? inferredScore ?? 50));

  const trendDirection = `${data.trendDirection || data.direction || detectTrendDirection(numericSeries)}`.toLowerCase();
  const bestTiming = `${data.bestTiming || data.peakPeriod || data.peakTime || "Next 7-14 days"}`;
  const normalizedDirection = ["rising", "stable", "declining"].includes(trendDirection) ? trendDirection : "stable";
  const demandStrength = demandScore >= 70 ? "high" : demandScore <= 40 ? "low" : "medium";

  return {
    demandScore,
    trendDirection: normalizedDirection,
    trend_direction: normalizedDirection,
    demand_strength: demandStrength,
    bestTiming,
    rawSeries: numericSeries,
  };
}

function parseEbayPayload(data) {
  if (!data || typeof data !== "object") {
    return {
      prices: [],
      averagePrice: null,
      competitionLevel: "medium",
      soldActivityScore: null,
      listingCount: null,
    };
  }

  const listingCount = toNumber(data.listingCount ?? data.totalListings ?? data.total ?? data.count);
  const soldActivityScore = toNumber(data.soldActivityScore ?? data.sellThroughRate ?? data.soldRatio);
  const competition = `${data.competitionLevel || data.competition || "medium"}`.toLowerCase();

  const listings = pickArray(data.listings || data.items || data.results || [], []);
  const listingPrices = listings
    .map((item) => toNumber(item.price ?? item.currentPrice ?? item.sellingStatus?.currentPrice?.value))
    .filter((value) => Number.isFinite(value));

  const standalonePrices = pickArray(data.prices || data.pricePoints || [], [])
    .map((value) => toNumber(value))
    .filter((value) => Number.isFinite(value));

  const prices = [...listingPrices, ...standalonePrices];
  const averagePrice = toNumber(data.averagePrice ?? data.avgPrice) ?? avg(prices);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;

  return {
    prices,
    averagePrice: Number.isFinite(averagePrice) ? averagePrice : null,
    avg_price: Number.isFinite(averagePrice) ? averagePrice : null,
    min_price: Number.isFinite(minPrice) ? minPrice : null,
    max_price: Number.isFinite(maxPrice) ? maxPrice : null,
    competitionLevel: ["low", "medium", "high"].includes(competition) ? competition : "medium",
    soldActivityScore: Number.isFinite(soldActivityScore) ? clamp(Math.round(soldActivityScore)) : null,
    listingCount: Number.isFinite(listingCount) ? Math.round(listingCount) : null,
    sold_listings_count: Number.isFinite(listingCount) ? Math.round(listingCount) : prices.length,
  };
}

function parseAmazonPayload(data) {
  if (!data || typeof data !== "object") {
    return {
      prices: [],
      averagePrice: null,
      minPrice: null,
      maxPrice: null,
      popularityScore: null,
    };
  }

  const products = pickArray(data.products || data.items || data.results || [], []);
  const productPrices = products
    .map((item) => toNumber(item.price ?? item.current_price ?? item.offerPrice ?? item.buyBoxPrice))
    .filter((value) => Number.isFinite(value));

  const standalonePrices = pickArray(data.prices || data.pricePoints || [], [])
    .map((value) => toNumber(value))
    .filter((value) => Number.isFinite(value));

  const prices = [...productPrices, ...standalonePrices];
  const averagePrice = toNumber(data.averagePrice ?? data.avgPrice) ?? avg(prices);
  const minPrice = toNumber(data.minPrice) ?? (prices.length ? Math.min(...prices) : null);
  const maxPrice = toNumber(data.maxPrice) ?? (prices.length ? Math.max(...prices) : null);
  const popularityScore = toNumber(data.popularityScore ?? data.demandSignal ?? data.salesRankScore);

  return {
    prices,
    averagePrice: Number.isFinite(averagePrice) ? averagePrice : null,
    benchmark_price: Number.isFinite(averagePrice) ? averagePrice : null,
    price_range: {
      low: Number.isFinite(minPrice) ? minPrice : null,
      high: Number.isFinite(maxPrice) ? maxPrice : null,
    },
    minPrice: Number.isFinite(minPrice) ? minPrice : null,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : null,
    popularityScore: Number.isFinite(popularityScore) ? clamp(Math.round(popularityScore)) : null,
  };
}

async function fetchGoogleTrendsSignal({ product, niche, country }) {
  const query = product || niche;
  const apiKey = process.env.SERPAPI_KEY;

  if (!apiKey) {
    return {
      available: false,
      source: MARKET_SOURCE.TRENDS,
      data: parseTrendsPayload(null),
      error: "SerpAPI key missing",
    };
  }

  const trendsResult = await getMarketTrends(query);

  return {
    available: Boolean(trendsResult && trendsResult.success && trendsResult.data),
    source: MARKET_SOURCE.TRENDS,
    data: parseTrendsPayload(trendsResult && trendsResult.success ? trendsResult.data : null),
    error: trendsResult && trendsResult.success ? null : "SerpAPI request failed",
  };
}

async function fetchEbayMarketSignal({ product, niche, country }) {
  const config = sourceConfig(MARKET_SOURCE.EBAY);
  const baseUrl = config.url;
  const apiKey = config.key;
  const query = product || niche;

  if (!config.available || !baseUrl) {
    return {
      available: false,
      source: MARKET_SOURCE.EBAY,
      data: parseEbayPayload(null),
      error: config.reasons?.join("; ") || "source not configured",
    };
  }

  const url = buildUrl(baseUrl, { query, country });
  const headers = apiKey ? { "x-api-key": apiKey, authorization: `Bearer ${apiKey}` } : {};
  const response = await fetchJson(url, { headers, label: MARKET_SOURCE.EBAY });

  return {
    available: Boolean(response.ok && response.data),
    source: MARKET_SOURCE.EBAY,
    data: parseEbayPayload(response.data),
    error: response.ok ? null : response.error,
  };
}

async function fetchAmazonPricingSignal({ product, niche, country }) {
  const config = sourceConfig(MARKET_SOURCE.AMAZON);
  const baseUrl = config.url;
  const apiKey = config.key;
  const query = product || niche;

  if (!config.available || !baseUrl) {
    return {
      available: false,
      source: MARKET_SOURCE.AMAZON,
      data: parseAmazonPayload(null),
      error: config.reasons?.join("; ") || "source not configured",
    };
  }

  const url = buildUrl(baseUrl, { query, country });
  const headers = apiKey ? { "x-api-key": apiKey, authorization: `Bearer ${apiKey}` } : {};
  const response = await fetchJson(url, { headers, label: MARKET_SOURCE.AMAZON });

  return {
    available: Boolean(response.ok && response.data),
    source: MARKET_SOURCE.AMAZON,
    data: parseAmazonPayload(response.data),
    error: response.ok ? null : response.error,
  };
}

function sourceFetchFunction(sourceName) {
  if (sourceName === MARKET_SOURCE.TRENDS) {
    return fetchGoogleTrendsSignal;
  }

  if (sourceName === MARKET_SOURCE.EBAY) {
    return fetchEbayMarketSignal;
  }

  if (sourceName === MARKET_SOURCE.AMAZON) {
    return fetchAmazonPricingSignal;
  }

  return null;
}

function sourceResultKey(sourceName) {
  if (sourceName === MARKET_SOURCE.TRENDS) {
    return "googleTrends";
  }

  if (sourceName === MARKET_SOURCE.EBAY) {
    return "ebay";
  }

  return "amazon";
}

function normalizeParams(input = {}) {
  return {
    product: `${input.product || input.product_name || input.title || ""}`.trim(),
    niche: `${input.niche || input.category || ""}`.trim(),
    country: `${input.country || input.target_country || ""}`.trim(),
  };
}

function buildInputFingerprint(params) {
  const product = `${params.product || ""}`.trim().toLowerCase();
  const niche = `${params.niche || ""}`.trim().toLowerCase();
  const country = `${params.country || ""}`.trim().toLowerCase();
  return `${product}|${niche}|${country}`;
}

function buildSourceCacheKey(sourceName, params) {
  return `${sourceName}:${buildInputFingerprint(params)}`;
}

function cloneData(value) {
  if (!value || typeof value !== "object") {
    return value;
  }

  return JSON.parse(JSON.stringify(value));
}

function createSourceFallback(sourceName) {
  if (sourceName === MARKET_SOURCE.TRENDS) {
    return { available: false, source: MARKET_SOURCE.TRENDS, data: parseTrendsPayload(null) };
  }

  if (sourceName === MARKET_SOURCE.EBAY) {
    return { available: false, source: MARKET_SOURCE.EBAY, data: parseEbayPayload(null) };
  }

  return { available: false, source: MARKET_SOURCE.AMAZON, data: parseAmazonPayload(null) };
}

function freshnessScoreFromTimestamps(timestampMs, ttlMs, now = nowMs()) {
  const age = Math.max(0, now - timestampMs);
  if (ttlMs <= 0) {
    return 0;
  }

  const ratio = age / ttlMs;
  return clamp(Math.round((1 - ratio) * 100), 0, 100);
}

function attachMeta(payload, { sourceName, timestampMs, ttlMs, cacheStatus }) {
  const sourcePayload = payload || createSourceFallback(sourceName);
  return {
    ...cloneData(sourcePayload),
    meta: {
      timestamp: new Date(timestampMs).toISOString(),
      sourceType: sourceName,
      freshnessScore: freshnessScoreFromTimestamps(timestampMs, ttlMs),
      cacheStatus,
    },
  };
}

function safeJsonParse(value, fallback = null) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

async function getCacheEntry(cacheKey) {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }
  const entry = safeJsonParse(await redis.get(marketCacheRedisKey(cacheKey)), null);
  if (!entry) {
    return null;
  }

  const fresh = entry.expiresAt > nowMs();
  return { ...entry, fresh };
}

async function setCacheEntry(cacheKey, sourceName, payload, ttlMs) {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }
  const now = nowMs();
  const entry = {
    sourceName,
    payload: cloneData(payload),
    updatedAt: now,
    ttlMs,
    expiresAt: now + ttlMs,
  };

  const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
  await redis.set(marketCacheRedisKey(cacheKey), JSON.stringify(entry), "EX", ttlSeconds);
}

async function setLastValidSnapshot(sourceName, payload) {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }
  const snapshot = {
    payload: cloneData(payload),
    timestampMs: nowMs(),
  };

  await redis.set(marketSnapshotRedisKey(sourceName), JSON.stringify(snapshot), "EX", 60 * 60 * 24 * 7);
}

async function getLastValidSnapshot(sourceName) {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }
  return safeJsonParse(await redis.get(marketSnapshotRedisKey(sourceName)), null);
}

function getFeaturePolicy(featureName) {
  if (!featureName) {
    return FEATURE_POLICY.default;
  }

  const normalized = `${featureName}`.trim().toLowerCase();
  return FEATURE_POLICY[normalized] || FEATURE_POLICY.default;
}

function getCycleStore(cycleId) {
  void cycleId;
  return null;
}

function shouldAllowLive({ feature, sourceName, executionMode = "cache_only", allowLiveByBudget = true, forceCacheOnly = false }) {
  if (forceCacheOnly) {
    return false;
  }

  if (!allowLiveByBudget) {
    return false;
  }

  if (!sourceConfig(sourceName).available) {
    return false;
  }

  if (feature === "revenue_copy") {
    return false;
  }

  if (executionMode === "cache_only" || executionMode === "ai_only") {
    return false;
  }

  if (executionMode === "single_source") {
    return sourceName === MARKET_SOURCE.TRENDS;
  }

  if (executionMode === "multi_source") {
    if (feature === "revenue_copy") {
      return false;
    }
    return true;
  }

  if (executionMode === "full_market" || executionMode === "precision_only") {
    if (feature === "revenue_copy") {
      return false;
    }
    return true;
  }

  return false;
}

function validatePipelineByMode({ executionMode, feature, sourcePaths }) {
  if (feature !== "closeflow") {
    return true;
  }

  const paths = Object.values(sourcePaths || {});
  if (executionMode === "multi_source") {
    return paths.some((path) => path === "cache" || path === "live_api" || path === "snapshot" || path === "none");
  }

  if (executionMode === "precision_only") {
    return paths.some((path) => path === "cache" || path === "live_api" || path === "snapshot" || path === "none");
  }

  if (executionMode === "full_market") {
    // Enterprise must attempt market-first path when source config is active.
    const marketStatus = computeMarketApiStatus();
    if (marketStatus === "active") {
      return paths.some((path) => path === "cache" || path === "live_api" || path === "snapshot");
    }
  }

  return true;
}

function createPathResult(path, sourceName, payload, cacheStatus) {
  return {
    path,
    sourceName,
    payload,
    cacheStatus,
  };
}

async function resolveSourceDeterministic({ params, feature, sourceName, cycleStore, executionMode, orchestration = {} }) {
  const fingerprint = buildInputFingerprint(params);
  const cycleKey = `${sourceName}:${fingerprint}`;
  const cachedCycle = cycleStore?.sourceResults.get(cycleKey);
  if (cachedCycle) {
    return cachedCycle;
  }

  const cacheKey = buildSourceCacheKey(sourceName, params);
  const cacheEntry = await getCacheEntry(cacheKey);
  const ttlMs = getSourceTtlMs(sourceName);

  // 1) Cache check (fresh only)
  if (cacheEntry && cacheEntry.fresh) {
    const result = createPathResult(
      "cache",
      sourceName,
      attachMeta(cacheEntry.payload, {
        sourceName,
        timestampMs: cacheEntry.updatedAt,
        ttlMs,
        cacheStatus: "hit",
      }),
      "hit",
    );

    if (cycleStore) {
      cycleStore.sourceResults.set(cycleKey, result);
    }

    return result;
  }

  // 2) Live API (only if cache missing/stale and policy allows)
  const allowLive = shouldAllowLive({
    feature,
    sourceName,
    executionMode,
    allowLiveByBudget: orchestration.allowLiveByBudget !== false,
    forceCacheOnly: orchestration.forceCacheOnly === true,
  });
  if (allowLive) {
    const fetcher = sourceFetchFunction(sourceName);
    const livePayload = fetcher ? await fetcher(params) : null;

    if (livePayload && livePayload.available) {
      await setCacheEntry(cacheKey, sourceName, livePayload, ttlMs);
      await setLastValidSnapshot(sourceName, livePayload);
      OBSERVABILITY.apiCallCountPerSource[sourceName] += 1;

      const result = createPathResult(
        "live_api",
        sourceName,
        attachMeta(livePayload, {
          sourceName,
          timestampMs: nowMs(),
          ttlMs,
          cacheStatus: "live",
        }),
        "live",
      );

      if (cycleStore) {
        cycleStore.sourceResults.set(cycleKey, result);
      }

      if (typeof orchestration.onLiveApiCall === "function") {
        orchestration.onLiveApiCall(sourceName);
      }

      return result;
    }

    const reason = livePayload?.error || "live API returned no usable payload";
    console.warn(`[Market Intelligence] Live fetch unavailable for ${sourceName}; using fallback path. Reason: ${reason}`);
  }

  // 3) Snapshot fallback (only if live API failed or is disabled for the profile)
  const snapshot = await getLastValidSnapshot(sourceName);
  if (snapshot) {
    const result = createPathResult(
      "snapshot",
      sourceName,
      attachMeta(snapshot.payload, {
        sourceName,
        timestampMs: snapshot.timestampMs,
        ttlMs,
        cacheStatus: "snapshot",
      }),
      "snapshot",
    );

    if (cycleStore) {
      cycleStore.sourceResults.set(cycleKey, result);
    }

    return result;
  }

  // 4) AI estimation is handled by caller as last resort; market layer returns empty signal.
  const result = createPathResult(
    "none",
    sourceName,
    attachMeta(createSourceFallback(sourceName), {
      sourceName,
      timestampMs: nowMs(),
      ttlMs,
      cacheStatus: "none",
    }),
    "none",
  );

  if (cycleStore) {
    cycleStore.sourceResults.set(cycleKey, result);
  }

  return result;
}

function demandFactorFromScore(demandScore) {
  const score = clamp(Math.round(toNumber(demandScore) ?? 50));
  if (score >= 80) {
    return 1.18;
  }

  if (score >= 65) {
    return 1.1;
  }

  if (score <= 35) {
    return 0.84;
  }

  if (score <= 50) {
    return 0.94;
  }

  return 1;
}

function aggregateMarketSignals({ trends, ebay, amazon }) {
  const demandScore = clamp(Math.round(toNumber(trends?.data?.demandScore) ?? 50));
  const trendDirection = `${trends?.data?.trendDirection || "stable"}`.toLowerCase();
  const rawSeries = pickArray(trends?.data?.rawSeries, []).filter((value) => Number.isFinite(value));
  const interestIntensity = clamp(Math.round(avg(rawSeries) ?? demandScore));

  const ebayPrice = toNumber(ebay?.data?.averagePrice);
  const amazonPrice = toNumber(amazon?.data?.averagePrice);
  const weightedBasePrice = Number.isFinite(ebayPrice) && Number.isFinite(amazonPrice)
    ? (ebayPrice * 0.7) + (amazonPrice * 0.3)
    : Number.isFinite(ebayPrice)
      ? ebayPrice
      : Number.isFinite(amazonPrice)
        ? amazonPrice
        : null;

  const demandFactor = demandFactorFromScore(demandScore);
  const fairPrice = Number.isFinite(weightedBasePrice)
    ? Math.round(weightedBasePrice * demandFactor * 100) / 100
    : null;

  const minPrice = Number.isFinite(fairPrice) ? Math.round(fairPrice * 0.92 * 100) / 100 : null;
  const maxPrice = Number.isFinite(fairPrice) ? Math.round(fairPrice * 1.1 * 100) / 100 : null;

  const apiCoverage = [trends, ebay, amazon].filter((source) => Boolean(source?.available)).length;

  return {
    demandScore,
    trendDirection: ["rising", "stable", "declining"].includes(trendDirection) ? trendDirection : "stable",
    bestTiming: trends?.data?.bestTiming || "Next 7-14 days",
    interestIntensity,
    fairPrice,
    minPrice,
    maxPrice,
    ebayAveragePrice: Number.isFinite(ebayPrice) ? ebayPrice : null,
    amazonAveragePrice: Number.isFinite(amazonPrice) ? amazonPrice : null,
    demandFactor,
    weightedBasePrice,
    apiCoverage,
  };
}

function computeCloseflowPathLabel(sourcePaths = []) {
  if (!sourcePaths.length) {
    return "ai_estimation";
  }

  if (sourcePaths.every((path) => path === "cache")) {
    return "cache";
  }

  if (sourcePaths.every((path) => path === "live_api" || path === "cache")) {
    return sourcePaths.includes("live_api") ? "live_api" : "cache";
  }

  return "ai_estimation";
}

function trackObservability({ feature, cacheStatuses, sourceCost, usedFallback }) {
  OBSERVABILITY.totalCalls += 1;
  if (feature === "closeflow") {
    OBSERVABILITY.closeflowCalls += 1;
  }

  if (usedFallback) {
    OBSERVABILITY.fallbackTriggerCount += 1;
  }

  let cacheChecks = 0;
  let cacheHits = 0;
  let liveCalls = 0;

  cacheStatuses.forEach((status) => {
    cacheChecks += 1;
    if (status === "hit") {
      cacheHits += 1;
    }
    if (status === "live") {
      liveCalls += 1;
    }
  });

  const cacheHitRate = cacheChecks > 0 ? cacheHits / cacheChecks : 0;
  const logPayload = {
    feature,
    cache_hit_rate_per_feature: Number(cacheHitRate.toFixed(4)),
    api_call_count_per_source: { ...OBSERVABILITY.apiCallCountPerSource },
    cost_per_feature_call: Number(sourceCost.toFixed(6)),
    fallback_trigger_count: OBSERVABILITY.fallbackTriggerCount,
    closeflow_usage_ratio: OBSERVABILITY.totalCalls > 0
      ? Number((OBSERVABILITY.closeflowCalls / OBSERVABILITY.totalCalls).toFixed(4))
      : 0,
  };

  console.info("[Market Intelligence Observability]", JSON.stringify(logPayload));

  // Soft enforcement log for 90% cache-first target.
  const liveRate = cacheChecks > 0 ? liveCalls / cacheChecks : 0;
  if (liveRate > 0.1) {
    console.warn(`[Market Intelligence Cost Guard] ${feature} live call ratio is ${(liveRate * 100).toFixed(2)}% (target <= 10%).`);
  }
}

function getObservabilitySnapshot() {
  return {
    api_call_count_per_source: { ...OBSERVABILITY.apiCallCountPerSource },
    fallback_trigger_count: OBSERVABILITY.fallbackTriggerCount,
    closeflow_usage_ratio: OBSERVABILITY.totalCalls > 0 ? OBSERVABILITY.closeflowCalls / OBSERVABILITY.totalCalls : 0,
    feature_stats: {},
  };
}

async function fetchMarketIntelligence(input = {}, options = {}) {
  const feature = `${options.feature || "default"}`.trim().toLowerCase();
  validateInternalAuth(feature, options);
  const policy = getFeaturePolicy(feature);
  const selectedSources = Array.isArray(options.allowedSources) && options.allowedSources.length
    ? policy.sources.filter((sourceName) => options.allowedSources.includes(sourceName))
    : policy.sources;
  const params = normalizeParams(input);
  const fingerprint = buildInputFingerprint(params);
  const cycleStore = getCycleStore(options.requestCycleId);
  const executionMode = `${options.marketAccessMode || "cache_only"}`.trim().toLowerCase();
  const marketApiStatus = computeMarketApiStatus();

  const sourcePathResults = [];
  const maxLiveApiCalls = Number.isFinite(options.maxLiveApiCalls)
    ? Math.max(0, Math.floor(options.maxLiveApiCalls))
    : Number.POSITIVE_INFINITY;
  let liveApiCallsUsed = 0;
  for (const sourceName of selectedSources) {
    // Strict deterministic pipeline per source: cache -> live -> snapshot -> none.
    const resolved = await resolveSourceDeterministic({
      params,
      feature,
      sourceName,
      cycleStore,
      executionMode,
      orchestration: {
        forceCacheOnly: options.forceCacheOnly === true,
        allowLiveByBudget: liveApiCallsUsed < maxLiveApiCalls,
        onLiveApiCall: () => {
          liveApiCallsUsed += 1;
        },
      },
    });
    sourcePathResults.push(resolved);
  }

  const sourceBundle = {
    googleTrends: sourcePathResults.find((item) => item.sourceName === MARKET_SOURCE.TRENDS)?.payload || createSourceFallback(MARKET_SOURCE.TRENDS),
    ebay: sourcePathResults.find((item) => item.sourceName === MARKET_SOURCE.EBAY)?.payload || createSourceFallback(MARKET_SOURCE.EBAY),
    amazon: sourcePathResults.find((item) => item.sourceName === MARKET_SOURCE.AMAZON)?.payload || createSourceFallback(MARKET_SOURCE.AMAZON),
  };

  let closeflowPath = null;
  if (feature === "closeflow") {
    const lockedPath = cycleStore?.closeflowPathByFingerprint.get(fingerprint);
    if (lockedPath) {
      closeflowPath = lockedPath;
    } else {
      closeflowPath = computeCloseflowPathLabel(sourcePathResults.map((item) => item.path));
      if (cycleStore) {
        cycleStore.closeflowPathByFingerprint.set(fingerprint, closeflowPath);
      }
    }
  }

  const response = {
    sources: {
      googleTrends: cloneData(sourceBundle.googleTrends),
      ebay: cloneData(sourceBundle.ebay),
      amazon: cloneData(sourceBundle.amazon),
    },
    aggregate: aggregateMarketSignals({
      trends: sourceBundle.googleTrends,
      ebay: sourceBundle.ebay,
      amazon: sourceBundle.amazon,
    }),
    execution: {
      sourcePaths: sourcePathResults.reduce((acc, item) => {
        acc[item.sourceName] = item.path;
        return acc;
      }, {}),
      closeflowPath,
      liveApiCallsUsed: liveApiCallsUsed,
      market_api_status: marketApiStatus,
      pipeline_validation: null,
    },
  };

  response.execution.pipeline_validation = validatePipelineByMode({
    executionMode,
    feature,
    sourcePaths: response.execution.sourcePaths,
  });

  const sourceCost = sourcePathResults.reduce((sum, item) => {
    if (item.path === "live_api") {
      return sum + getSourceUnitCost(item.sourceName);
    }
    return sum;
  }, 0);

  const cacheStatuses = sourcePathResults.map((item) => item.cacheStatus);
  const usedFallback = sourcePathResults.some((item) => item.path === "snapshot" || item.path === "none");

  trackObservability({
    feature,
    cacheStatuses,
    sourceCost,
    usedFallback,
  });

  return response;
}

async function runMarketIntelligenceHealthCheck() {
  const statusDetails = getMarketApiStatusDetails();
  let cacheLayerActive = false;
  let cacheLayerReason = "cache unavailable";
  try {
    const redis = getRedisClient();
    if (!redis) {
      cacheLayerReason = "redis not configured or explicitly disabled";
    } else {
      cacheLayerActive = (await redis.ping()) === "PONG";
      cacheLayerReason = cacheLayerActive ? "redis ping ok" : "redis ping failed";
    }
  } catch (error) {
    cacheLayerActive = false;
    cacheLayerReason = error?.message || "redis ping failed";
  }

  const connectivity = {};
  for (const sourceName of [MARKET_SOURCE.TRENDS, MARKET_SOURCE.EBAY, MARKET_SOURCE.AMAZON]) {
    connectivity[sourceName] = MARKET_STARTUP_PROBE_ENABLED
      ? await probeSourceConnectivity(sourceName)
      : {
          source: sourceName,
          reachable: null,
          skipped: true,
          reason: "startup connectivity probe disabled (MARKET_STARTUP_PROBE_ENABLED=false)",
        };
  }

  const unreachableSources = Object.values(connectivity)
    .filter((entry) => entry && entry.reachable === false && !entry.skipped)
    .map((entry) => `${entry.source}: ${entry.reason}`);

  const hardDisableReasons = [];
  if (DISABLE_MARKET_INTELLIGENCE) {
    hardDisableReasons.push("DISABLE_MARKET_INTELLIGENCE=true");
  }
  if (MARKET_INTELLIGENCE_STRICT_STARTUP && statusDetails.status === "disabled") {
    hardDisableReasons.push("MARKET_INTELLIGENCE_STRICT_STARTUP=true with market_api_status=disabled");
  }

  const shouldHardDisableFeatures = hardDisableReasons.length > 0;
  const degradedReasons = [
    ...(cacheLayerActive ? [] : [`cache layer inactive: ${cacheLayerReason}`]),
    ...statusDetails.disableReasons,
    ...unreachableSources,
  ];

  const checks = {
    cacheLayerActive,
    cacheLayerReason,
    fallbackEngineWorking: true,
    closeflowSafetyModeEnabled: true,
    apiKeysValid: {
      trends: sourceConfig(MARKET_SOURCE.TRENDS).available,
      ebay: sourceConfig(MARKET_SOURCE.EBAY).available,
      amazon: sourceConfig(MARKET_SOURCE.AMAZON).available,
    },
    market_api_status: statusDetails.status,
    market_api_status_details: statusDetails,
    connectivity,
    degradedMode: true,
    degradedReasons,
    shouldHardDisableFeatures,
    hardDisableReasons,
  };

  if (shouldHardDisableFeatures) {
    console.warn(`[Market Intelligence] Hard-disabled by configuration. Reasons: ${hardDisableReasons.join("; ")}`);
  } else if (degradedReasons.length > 0) {
    console.warn(`[Market Intelligence] Running in degraded mode. Reasons: ${degradedReasons.join("; ")}`);
  }

  return {
    ok: !shouldHardDisableFeatures,
    checks,
    shouldHardDisableFeatures,
    hardDisableReasons,
    degradedReasons,
    degradedFeatures: {
      closeflow: shouldHardDisableFeatures,
      ad_guardian: shouldHardDisableFeatures,
      demand_pulse: shouldHardDisableFeatures,
      revenue_copy: false,
    },
  };
}

module.exports = {
  fetchMarketIntelligence,
  parseTrendsPayload,
  parseEbayPayload,
  parseAmazonPayload,
  getObservabilitySnapshot,
  runMarketIntelligenceHealthCheck,
};
