const crypto = require("crypto");
const Redis = require("ioredis");
const { getTierPolicy, createQuotaEngine } = require("../config/aiTierPolicy");

const REQUEST_LOCK_TTL_MS = Number.parseInt(process.env.AI_REQUEST_LOCK_TTL_MS || "60000", 10);
const REQUEST_STATE_TTL_SECONDS = Number.parseInt(process.env.AI_REQUEST_STATE_TTL_SECONDS || "172800", 10);
const REQUEST_ID_WINDOW_MS = Number.parseInt(process.env.AI_REQUEST_ID_WINDOW_MS || "300000", 10);
const IDEMPOTENCY_SECRET = process.env.AI_IDEMPOTENCY_SECRET || "";
const LOCK_HEARTBEAT_INTERVAL_MS = Math.max(1000, Math.floor(REQUEST_LOCK_TTL_MS / 3));
const REQUEST_STALE_RECOVERY_MS = Number.parseInt(
  process.env.AI_REQUEST_STALE_RECOVERY_MS || `${Math.max(REQUEST_LOCK_TTL_MS * 2, 120000)}`,
  10,
);

let redisClient = null;
let redisErrorLogged = false;

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
      console.warn(`[AI Guard] Redis unavailable (${label}) - running in degraded mode:`, error.message);
      redisErrorLogged = true;
    }
  });
  return client;
}

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

function sanitizeText(value, fallback = "") {
  const normalized = `${value ?? fallback}`.replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
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

function hashHex(value) {
  return crypto.createHash("sha256").update(`${value ?? ""}`).digest("hex");
}

function hmacHex(secret, value) {
  return crypto.createHmac("sha256", secret).update(`${value ?? ""}`).digest("hex");
}

function randomLockToken() {
  return crypto.randomBytes(16).toString("hex");
}

function getUtcDateKey(date = new Date()) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getBillingAnchorDate(req) {
  const user = req.currentUser || req.user || {};
  const raw = user.subscriptionStartedAt || user.subscription_start_date || user.billingCycleAnchor || user.createdAt || user.created_at;
  const parsed = raw ? new Date(raw) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function computeMonthlyCycleWindow(anchorDate, now = new Date()) {
  const anchorDay = Math.min(Math.max(anchorDate.getUTCDate(), 1), 28);
  const nowYear = now.getUTCFullYear();
  const nowMonth = now.getUTCMonth();

  let cycleStart = new Date(Date.UTC(nowYear, nowMonth, anchorDay, 0, 0, 0, 0));
  if (now < cycleStart) {
    cycleStart = new Date(Date.UTC(nowYear, nowMonth - 1, anchorDay, 0, 0, 0, 0));
  }

  const cycleEnd = new Date(Date.UTC(cycleStart.getUTCFullYear(), cycleStart.getUTCMonth() + 1, anchorDay, 0, 0, 0, 0));
  return {
    cycleStartIso: cycleStart.toISOString(),
    cycleEndIso: cycleEnd.toISOString(),
  };
}

function computeYearlyCycleWindow(anchorDate, now = new Date()) {
  const anchorMonth = anchorDate.getUTCMonth();
  const anchorDay = Math.min(Math.max(anchorDate.getUTCDate(), 1), 28);

  let cycleStart = new Date(Date.UTC(now.getUTCFullYear(), anchorMonth, anchorDay, 0, 0, 0, 0));
  if (now < cycleStart) {
    cycleStart = new Date(Date.UTC(now.getUTCFullYear() - 1, anchorMonth, anchorDay, 0, 0, 0, 0));
  }

  const cycleEnd = new Date(Date.UTC(cycleStart.getUTCFullYear() + 1, anchorMonth, anchorDay, 0, 0, 0, 0));
  return {
    cycleStartIso: cycleStart.toISOString(),
    cycleEndIso: cycleEnd.toISOString(),
  };
}

function resolveUserId(req) {
  return sanitizeText(
    req?.currentUser?.id ||
      req?.user?.id ||
      req?.user?.userId ||
      req?.user?.sub,
    "anonymous",
  );
}

function resolveTier(req) {
  const currentUser = req.currentUser || req.user || {};
  const rawPlan = `${
    req.subscriptionLevel ||
    currentUser.subscriptionLevel ||
    currentUser.subscriptionPlan ||
    currentUser.plan ||
    (currentUser.isPremium ? "pro" : "")
  }`.trim().toLowerCase();

  if (currentUser.is_admin === true || `${currentUser.role || ""}`.toLowerCase() === "admin") {
    return "enterprise";
  }

  if (rawPlan === "elite" || rawPlan === "hot") {
    return "elite";
  }

  if (rawPlan === "starter" || rawPlan === "premium") {
    return "starter";
  }

  if (rawPlan === "vip") {
    return "vip";
  }

  return rawPlan || "normal";
}

function toEpochMs(value) {
  const parsed = Number.parseInt(`${value ?? ""}`, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function resolveTierFromRedis(redis, req, userId) {
  const redisTier = sanitizeText(await redis.get(`ai:subscription:${userId}:tier`), "").toLowerCase();
  if (["starter", "pro", "elite", "enterprise", "vip"].includes(redisTier)) {
    return redisTier;
  }

  const serialized = await redis.get(`ai:subscription:${userId}:state`);
  const parsed = safeJsonParse(serialized, null);
  const parsedTier = sanitizeText(parsed?.tier || parsed?.subscriptionLevel, "").toLowerCase();
  if (["starter", "pro", "elite", "enterprise", "vip"].includes(parsedTier)) {
    return parsedTier;
  }

  return resolveTier(req);
}

function hasClientRequestId(req) {
  return Boolean(
    req.headers?.["x-request-id"] ||
      req.headers?.["x-correlation-id"] ||
      req.body?.request_id ||
      req.body?.requestId ||
      req.body?.request_cycle_id ||
      req.body?.requestCycleId,
  );
}

function buildServerRequestIdentity(req, userId, feature) {
  if (!IDEMPOTENCY_SECRET) {
    return { ok: false, reason: "AI_IDEMPOTENCY_SECRET_NOT_CONFIGURED" };
  }

  const now = Date.now();
  const timeBucket = Math.floor(now / REQUEST_ID_WINDOW_MS);
  const payloadHash = hashHex(stableStringify(req.body || {}));
  const endpoint = sanitizeText(req.path, "/");

  const seed = `${userId}|${endpoint}|${feature}|${payloadHash}|${timeBucket}`;
  const requestId = hashHex(seed);
  const signature = hmacHex(IDEMPOTENCY_SECRET, `${requestId}|${userId}|${endpoint}|${feature}|${payloadHash}|${timeBucket}`);

  return {
    ok: true,
    requestId,
    signature,
    payloadHash,
    timeBucket,
    endpoint,
  };
}

function buildKeys({ userId, tier, feature, requestId, dayKey, cycleStartIso }) {
  const base = `ai:guard:${userId}:${tier}:${feature}`;
  return {
    requestKey: `${base}:req:${requestId}`,
    lockKey: `${base}:lock:${requestId}`,
    usageKey: `ai:guard:usage:${userId}:${tier}`,
    usageDailyField: `d:${dayKey}:ai`,
    usageMonthlyField: `m:${cycleStartIso}:ai`,
    usageYearlyField: `y:${cycleStartIso}:ai`,
    marketDailyField: `d:${dayKey}:market`,
    marketMonthlyField: `m:${cycleStartIso}:market`,
    marketYearlyField: `y:${cycleStartIso}:market`,
  };
}

function getMarketAccessMode(tier, usageRecord, policy) {
  if (tier === "starter") {
    return "cache_only";
  }

  if (tier === "pro") {
    const marketDailyBlocked = usageRecord.dailyMarketUsed >= (policy.dailyMarketLimit || 0);
    const marketMonthlyBlocked = usageRecord.monthlyMarketUsed >= (policy.monthlyMarketLimit || 0);
    return (marketDailyBlocked || marketMonthlyBlocked) ? "ai_only" : "single_source";
  }

  return policy.marketMode || "cache_only";
}

function normalizeSuccessResponse(req, payload, usageRecord) {
  const feature = sanitizeText(payload?.feature || req.aiFeature || "", req.aiFeature || "");
  const tier = sanitizeText(req.subscriptionLevel || "normal", "normal");
  const result = payload && typeof payload.result === "object" ? payload.result : {};

  const response = {
    success: true,
    request_id: req.aiRequestId,
    tier,
    feature,
    result,
    usage: {
      daily_used: usageRecord.dailyAiUsed,
      monthly_used: usageRecord.monthlyAiUsed,
      yearly_used: usageRecord.yearlyAiUsed,
    },
  };

  if (req.enterpriseQuotaAlert) {
    response.usage.alert = req.enterpriseQuotaAlert;
  }

  return response;
}

const COMMIT_USAGE_LUA = `
local usageKey = KEYS[1]
local requestKey = KEYS[2]

local quotaModel = ARGV[1]
local dailyField = ARGV[2]
local monthlyField = ARGV[3]
local yearlyField = ARGV[4]
local dailyLimit = tonumber(ARGV[5])
local monthlyLimit = tonumber(ARGV[6])
local yearlyLimit = tonumber(ARGV[7])
local hardThrottle = tonumber(ARGV[8])
local marketDailyField = ARGV[9]
local marketMonthlyField = ARGV[10]
local marketYearlyField = ARGV[11]
local marketInc = tonumber(ARGV[12])
local responseBody = ARGV[13]
local responseStatus = ARGV[14]
local requestTtlSec = tonumber(ARGV[15])

local status = redis.call('HGET', requestKey, 'status')
if not status then
  return {-4, 0, 0, 0}
end

if status == 'SUCCESS' then
  local d = tonumber(redis.call('HGET', usageKey, dailyField) or '0')
  local m = tonumber(redis.call('HGET', usageKey, monthlyField) or '0')
  local y = tonumber(redis.call('HGET', usageKey, yearlyField) or '0')
  return {2, d, m, y}
end

if status ~= 'EXECUTING' then
  return {-3, 0, 0, 0}
end

local currentDaily = tonumber(redis.call('HGET', usageKey, dailyField) or '0')
local currentMonthly = tonumber(redis.call('HGET', usageKey, monthlyField) or '0')
local currentYearly = tonumber(redis.call('HGET', usageKey, yearlyField) or '0')

if quotaModel == 'dual_cap' then
  if dailyLimit and (currentDaily + 1) > dailyLimit then
    redis.call('HSET', requestKey, 'status', 'FAILED', 'error', 'DAILY_LIMIT_REACHED')
    redis.call('EXPIRE', requestKey, requestTtlSec)
    return {-1, currentDaily, currentMonthly, currentYearly}
  end

  if monthlyLimit and (currentMonthly + 1) > monthlyLimit then
    redis.call('HSET', requestKey, 'status', 'FAILED', 'error', 'MONTHLY_LIMIT_REACHED')
    redis.call('EXPIRE', requestKey, requestTtlSec)
    return {-2, currentDaily, currentMonthly, currentYearly}
  end
end

if quotaModel == 'yearly_contract' and hardThrottle == 1 then
  if yearlyLimit and (currentYearly + 1) > yearlyLimit then
    redis.call('HSET', requestKey, 'status', 'FAILED', 'error', 'YEARLY_LIMIT_REACHED')
    redis.call('EXPIRE', requestKey, requestTtlSec)
    return {-5, currentDaily, currentMonthly, currentYearly}
  end
end

local newDaily = currentDaily
local newMonthly = currentMonthly
local newYearly = currentYearly

if quotaModel == 'dual_cap' then
  newDaily = redis.call('HINCRBY', usageKey, dailyField, 1)
  newMonthly = redis.call('HINCRBY', usageKey, monthlyField, 1)
else
  newYearly = redis.call('HINCRBY', usageKey, yearlyField, 1)
end

if marketInc > 0 then
  if quotaModel == 'dual_cap' then
    redis.call('HINCRBY', usageKey, marketDailyField, marketInc)
    redis.call('HINCRBY', usageKey, marketMonthlyField, marketInc)
  else
    redis.call('HINCRBY', usageKey, marketYearlyField, marketInc)
  end
end

redis.call('HSET', requestKey, 'status', 'SUCCESS', 'response', responseBody, 'responseStatus', responseStatus, 'dailyUsed', newDaily, 'monthlyUsed', newMonthly, 'yearlyUsed', newYearly)
redis.call('EXPIRE', requestKey, requestTtlSec)
return {1, newDaily, newMonthly, newYearly}
`;

const RELEASE_LOCK_IF_OWNER_LUA = `
local lockKey = KEYS[1]
local token = ARGV[1]
if redis.call('GET', lockKey) == token then
  return redis.call('DEL', lockKey)
end
return 0
`;

const REFRESH_LOCK_IF_OWNER_LUA = `
local lockKey = KEYS[1]
local token = ARGV[1]
local ttlMs = tonumber(ARGV[2])
if redis.call('GET', lockKey) == token then
  return redis.call('PEXPIRE', lockKey, ttlMs)
end
return 0
`;

function createAiUsageGuard(options = {}) {
  const feature = sanitizeText(options.feature, "");

  return async (req, res, next) => {
    let redis;
    try {
      redis = getRedisClient();
    } catch (err) {
      console.warn(`[AI Guard] Redis client initialisation failed — degraded mode (feature: ${feature}):`, err.message);
      return next();
    }

    if (!redis) {
      return next();
    }

    // Verify Redis is reachable before running any quota logic.
    // If the connection is down, allow the request in degraded mode.
    try {
      await redis.ping();
    } catch (pingErr) {
      console.warn(`[AI Guard] Redis unavailable — allowing request in degraded mode (feature: ${feature}):`, pingErr.message);
      return next();
    }

    if (!feature) {
      return res.status(500).json({ success: false, error: "AI_USAGE_GUARD_CONFIG_ERROR", message: "Missing feature key for usage guard." });
    }

    const userId = resolveUserId(req);
    if (!userId || userId === "anonymous") {
      return res.status(401).json({ success: false, error: "AUTH_REQUIRED", message: "Authentication is required for AI requests." });
    }

    if (hasClientRequestId(req)) {
      return res.status(400).json({
        success: false,
        error: "CLIENT_REQUEST_ID_NOT_ALLOWED",
        message: "Client-supplied request_id is not accepted for this endpoint.",
      });
    }

    const tier = await resolveTierFromRedis(redis, req, userId);
    const policy = getTierPolicy(tier);
    const quotaEngine = createQuotaEngine(tier);
    if (!policy) {
      return res.status(403).json({ success: false, error: "INVALID_TIER", message: "Your subscription tier is not allowed for AI execution." });
    }
    if (!quotaEngine) {
      return res.status(403).json({ success: false, error: "QUOTA_ENGINE_UNAVAILABLE", message: "Quota engine unavailable for this tier." });
    }

    if (!policy.features.includes(feature)) {
      return res.status(403).json({ success: false, error: "FEATURE_NOT_ALLOWED", message: "This feature is not available on your current plan." });
    }

    const identity = buildServerRequestIdentity(req, userId, feature);
    if (!identity.ok) {
      return res.status(500).json({ success: false, error: identity.reason, message: "Unable to establish idempotent request identity." });
    }

    const anchorDate = getBillingAnchorDate(req);
    const cycleWindow = policy.quotaModel === "yearly_contract"
      ? computeYearlyCycleWindow(anchorDate, new Date())
      : computeMonthlyCycleWindow(anchorDate, new Date());

    const dayKey = getUtcDateKey(new Date());
    const keys = buildKeys({
      userId,
      tier,
      feature,
      requestId: identity.requestId,
      dayKey,
      cycleStartIso: cycleWindow.cycleStartIso,
    });

    const existingRequestState = await redis.hgetall(keys.requestKey);
    if (existingRequestState?.status === "SUCCESS") {
      const cachedStatus = Number.parseInt(existingRequestState.responseStatus || "200", 10) || 200;
      const parsedBody = safeJsonParse(existingRequestState.response, {
        success: false,
        error: "IDEMPOTENT_RESPONSE_CORRUPT",
      });
      return res.status(cachedStatus).json(parsedBody);
    }

    if (existingRequestState?.status === "IN_PROGRESS" || existingRequestState?.status === "EXECUTING") {
      const activeLockPresent = (await redis.exists(keys.lockKey)) === 1;
      if (activeLockPresent) {
        return res.status(409).json({
          success: false,
          error: "REQUEST_IN_PROGRESS",
          message: "An equivalent request is already in progress.",
        });
      }

      const nowMs = Date.now();
      const startedAtMs = Math.max(
        toEpochMs(existingRequestState.executingAt),
        toEpochMs(existingRequestState.startedAt),
      );
      const ageMs = startedAtMs > 0 ? (nowMs - startedAtMs) : Number.MAX_SAFE_INTEGER;
      if (ageMs < REQUEST_STALE_RECOVERY_MS) {
        return res.status(409).json({
          success: false,
          error: "REQUEST_IN_PROGRESS",
          message: "An equivalent request is already in progress.",
        });
      }

      await redis.hset(keys.requestKey, "status", "FAILED", "error", "STALE_IN_PROGRESS_RECOVERED", "finishedAt", `${Date.now()}`);
      await redis.expire(keys.requestKey, REQUEST_STATE_TTL_SECONDS);
    }

    const lockToken = randomLockToken();
    const lockAcquired = await redis.set(keys.lockKey, lockToken, "PX", REQUEST_LOCK_TTL_MS, "NX");
    if (lockAcquired !== "OK") {
      return res.status(409).json({
        success: false,
        error: "REQUEST_IN_PROGRESS",
        message: "An equivalent request is already being processed.",
      });
    }

    await redis.hset(
      keys.requestKey,
      "status", "IN_PROGRESS",
      "userId", userId,
      "tier", tier,
      "feature", feature,
      "path", identity.endpoint,
      "payloadHash", identity.payloadHash,
      "requestSignature", identity.signature,
      "startedAt", `${Date.now()}`,
    );
    await redis.expire(keys.requestKey, REQUEST_STATE_TTL_SECONDS);

    const releaseInitialLock = async () => {
      await redis.eval(RELEASE_LOCK_IF_OWNER_LUA, 1, keys.lockKey, lockToken);
    };

    await redis.hset(keys.requestKey, "status", "EXECUTING", "executingAt", `${Date.now()}`);

    const usageSnapshot = await redis.hmget(
      keys.usageKey,
      keys.usageDailyField,
      keys.usageMonthlyField,
      keys.usageYearlyField,
      keys.marketDailyField,
      keys.marketMonthlyField,
      keys.marketYearlyField,
    );

    const usageRecord = {
      dailyAiUsed: Number.parseInt(usageSnapshot?.[0] || "0", 10) || 0,
      monthlyAiUsed: Number.parseInt(usageSnapshot?.[1] || "0", 10) || 0,
      yearlyAiUsed: Number.parseInt(usageSnapshot?.[2] || "0", 10) || 0,
      dailyMarketUsed: Number.parseInt(usageSnapshot?.[3] || "0", 10) || 0,
      monthlyMarketUsed: Number.parseInt(usageSnapshot?.[4] || "0", 10) || 0,
      yearlyMarketUsed: Number.parseInt(usageSnapshot?.[5] || "0", 10) || 0,
    };

    if (policy.quotaModel === "yearly_contract" && !policy.hardThrottle && usageRecord.yearlyAiUsed >= (policy.yearlyLimit || 0)) {
      req.enterpriseQuotaAlert = "YEARLY_CONTRACT_SOFT_LIMIT_EXCEEDED";
    }

    if (policy.quotaModel === "dual_cap") {
      if (usageRecord.dailyAiUsed >= (policy.dailyLimit || 0)) {
        await redis.hset(keys.requestKey, "status", "FAILED", "error", "DAILY_LIMIT_REACHED", "finishedAt", `${Date.now()}`);
        await releaseInitialLock();
        return res.status(429).json({ success: false, error: "DAILY_LIMIT_REACHED", message: "You have reached your daily limit. Try again tomorrow." });
      }

      if (usageRecord.monthlyAiUsed >= (policy.monthlyLimit || 0)) {
        await redis.hset(keys.requestKey, "status", "FAILED", "error", "MONTHLY_LIMIT_REACHED", "finishedAt", `${Date.now()}`);
        await releaseInitialLock();
        return res.status(429).json({ success: false, error: "MONTHLY_LIMIT_REACHED", message: "You have reached your monthly plan limit. Please upgrade your plan." });
      }
    }

    if (policy.quotaModel === "yearly_contract" && policy.hardThrottle && usageRecord.yearlyAiUsed >= (policy.yearlyLimit || 0)) {
      await redis.hset(keys.requestKey, "status", "FAILED", "error", "YEARLY_LIMIT_REACHED", "finishedAt", `${Date.now()}`);
      await releaseInitialLock();
      return res.status(429).json({ success: false, error: "YEARLY_LIMIT_REACHED", message: "You have reached your yearly enterprise contract limit." });
    }

    req.subscriptionLevel = tier;
    req.aiFeature = feature;
    req.aiRequestId = identity.requestId;
    req.aiRequestSignature = identity.signature;
    req.aiRequestState = "EXECUTING";
    req.aiQuotaEngine = quotaEngine.name;
    req.marketAccessMode = getMarketAccessMode(tier, usageRecord, policy);

    const originalJson = res.json.bind(res);
    let finalized = false;
    let heartbeatTimer = null;

    const startLockHeartbeat = () => {
      heartbeatTimer = setInterval(async () => {
        try {
          await redis.eval(
            REFRESH_LOCK_IF_OWNER_LUA,
            1,
            keys.lockKey,
            lockToken,
            `${REQUEST_LOCK_TTL_MS}`,
          );
        } catch (_error) {
          // Best effort heartbeat; request finalization still enforces state-safe commit.
        }
      }, LOCK_HEARTBEAT_INTERVAL_MS);

      if (heartbeatTimer && typeof heartbeatTimer.unref === "function") {
        heartbeatTimer.unref();
      }
    };

    startLockHeartbeat();

    const releaseLock = async () => {
      if (finalized) {
        return;
      }
      finalized = true;
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      await redis.eval(RELEASE_LOCK_IF_OWNER_LUA, 1, keys.lockKey, lockToken);
    };

    res.once("finish", () => {
      void releaseLock();
    });
    res.once("close", () => {
      void releaseLock();
    });

    res.json = async (body) => {
      try {
        if (body && body.success === true) {
          const marketConsumed = Number(body?.result?.market_api_calls_consumed || 0);
          const marketIncrement = Number.isFinite(marketConsumed)
            ? Math.max(0, Math.min(1, Math.floor(marketConsumed)))
            : 0;

          const engineLimits = quotaEngine.getLimits();
          const commitResult = await redis.eval(
            COMMIT_USAGE_LUA,
            2,
            keys.usageKey,
            keys.requestKey,
            quotaEngine.getQuotaModel(),
            keys.usageDailyField,
            keys.usageMonthlyField,
            keys.usageYearlyField,
            `${engineLimits.dailyLimit || 0}`,
            `${engineLimits.monthlyLimit || 0}`,
            `${engineLimits.yearlyLimit || 0}`,
            `${engineLimits.hardThrottle ? 1 : 0}`,
            keys.marketDailyField,
            keys.marketMonthlyField,
            keys.marketYearlyField,
            `${marketIncrement}`,
            JSON.stringify(body),
            `${res.statusCode || 200}`,
            `${REQUEST_STATE_TTL_SECONDS}`,
          );

          const statusCode = Number(commitResult?.[0] ?? -4);
          if (statusCode === -1) {
            await releaseLock();
            return originalJson({ success: false, error: "DAILY_LIMIT_REACHED", message: "You have reached your daily limit. Try again tomorrow." });
          }
          if (statusCode === -2) {
            await releaseLock();
            return originalJson({ success: false, error: "MONTHLY_LIMIT_REACHED", message: "You have reached your monthly plan limit. Please upgrade your plan." });
          }
          if (statusCode === -5) {
            await releaseLock();
            return originalJson({ success: false, error: "YEARLY_LIMIT_REACHED", message: "You have reached your yearly enterprise contract limit." });
          }
          if (statusCode < 0) {
            await redis.hset(keys.requestKey, "status", "FAILED", "error", "REQUEST_STATE_INVALID", "finishedAt", `${Date.now()}`);
            await releaseLock();
            return originalJson({ success: false, error: "REQUEST_STATE_INVALID", message: "Unable to finalize request safely." });
          }

          usageRecord.dailyAiUsed = Number(commitResult?.[1] ?? usageRecord.dailyAiUsed);
          usageRecord.monthlyAiUsed = Number(commitResult?.[2] ?? usageRecord.monthlyAiUsed);
          usageRecord.yearlyAiUsed = Number(commitResult?.[3] ?? usageRecord.yearlyAiUsed);

          const normalizedBody = normalizeSuccessResponse(req, body, usageRecord);
          await redis.hset(
            keys.requestKey,
            "status", "SUCCESS",
            "response", JSON.stringify(normalizedBody),
            "responseStatus", `${res.statusCode || 200}`,
            "finishedAt", `${Date.now()}`,
            "dailyUsed", `${usageRecord.dailyAiUsed}`,
            "monthlyUsed", `${usageRecord.monthlyAiUsed}`,
            "yearlyUsed", `${usageRecord.yearlyAiUsed}`,
          );
          await redis.expire(keys.requestKey, REQUEST_STATE_TTL_SECONDS);

          await releaseLock();
          return originalJson(normalizedBody);
        }

        await redis.hset(keys.requestKey, "status", "FAILED", "error", `${body?.error || "REQUEST_FAILED"}`, "finishedAt", `${Date.now()}`);
        await redis.expire(keys.requestKey, REQUEST_STATE_TTL_SECONDS);
        await releaseLock();
        return originalJson(body);
      } catch (error) {
        await redis.hset(keys.requestKey, "status", "FAILED", "error", "RESPONSE_NORMALIZATION_FAILED", "finishedAt", `${Date.now()}`);
        await redis.expire(keys.requestKey, REQUEST_STATE_TTL_SECONDS);
        await releaseLock();
        return originalJson({ success: false, error: "RESPONSE_NORMALIZATION_FAILED", message: error.message });
      }
    };

    return next();
  };
}

module.exports = {
  createAiUsageGuard,
};
