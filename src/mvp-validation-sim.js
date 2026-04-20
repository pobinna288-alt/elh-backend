/* MVP validation harness: runs required idempotency/billing/replay tests using
 * actual middleware/controller logic with a shared in-process Redis emulator.
 */
const crypto = require("crypto");
const Module = require("module");

class SharedRedisStore {
  constructor() {
    this.kv = new Map();
    this.hashes = new Map();
    this.expiresAt = new Map();
  }

  now() {
    return Date.now();
  }

  cleanupKey(key) {
    const exp = this.expiresAt.get(key);
    if (typeof exp === "number" && exp <= this.now()) {
      this.kv.delete(key);
      this.hashes.delete(key);
      this.expiresAt.delete(key);
    }
  }

  cleanupAll() {
    for (const key of new Set([...this.kv.keys(), ...this.hashes.keys(), ...this.expiresAt.keys()])) {
      this.cleanupKey(key);
    }
  }

  reset() {
    this.kv.clear();
    this.hashes.clear();
    this.expiresAt.clear();
  }
}

const SHARED = new SharedRedisStore();

function toStr(v) {
  return `${v}`;
}

class FakeRedis {
  constructor() {
    this.store = SHARED;
  }

  async ping() {
    return "PONG";
  }

  async quit() {
    return "OK";
  }

  async get(key) {
    this.store.cleanupKey(key);
    const val = this.store.kv.get(key);
    return val === undefined ? null : val;
  }

  async set(key, value, ...args) {
    this.store.cleanupKey(key);
    const str = toStr(value);

    let mode = null;
    let ttl = null;
    let onlyIfNotExists = false;

    for (let i = 0; i < args.length; i += 1) {
      const part = `${args[i]}`.toUpperCase();
      if (part === "PX") {
        mode = "PX";
        ttl = Number(args[i + 1]);
        i += 1;
      } else if (part === "EX") {
        mode = "EX";
        ttl = Number(args[i + 1]) * 1000;
        i += 1;
      } else if (part === "NX") {
        onlyIfNotExists = true;
      }
    }

    const exists = this.store.kv.has(key) || this.store.hashes.has(key);
    if (onlyIfNotExists && exists) {
      return null;
    }

    this.store.kv.set(key, str);
    if (mode && Number.isFinite(ttl)) {
      this.store.expiresAt.set(key, this.store.now() + ttl);
    } else {
      this.store.expiresAt.delete(key);
    }

    return "OK";
  }

  async del(...keys) {
    let count = 0;
    for (const key of keys) {
      this.store.cleanupKey(key);
      const had = this.store.kv.delete(key) || this.store.hashes.delete(key) || this.store.expiresAt.delete(key);
      if (had) {
        count += 1;
      }
    }
    return count;
  }

  async exists(key) {
    this.store.cleanupKey(key);
    return this.store.kv.has(key) || this.store.hashes.has(key) ? 1 : 0;
  }

  async expire(key, seconds) {
    this.store.cleanupKey(key);
    if (!(this.store.kv.has(key) || this.store.hashes.has(key))) {
      return 0;
    }
    this.store.expiresAt.set(key, this.store.now() + (Number(seconds) * 1000));
    return 1;
  }

  async pexpire(key, ttlMs) {
    this.store.cleanupKey(key);
    if (!(this.store.kv.has(key) || this.store.hashes.has(key))) {
      return 0;
    }
    this.store.expiresAt.set(key, this.store.now() + Number(ttlMs));
    return 1;
  }

  async hset(key, ...args) {
    this.store.cleanupKey(key);
    if (!this.store.hashes.has(key)) {
      this.store.hashes.set(key, new Map());
    }
    const hash = this.store.hashes.get(key);
    for (let i = 0; i < args.length; i += 2) {
      hash.set(`${args[i]}`, toStr(args[i + 1]));
    }
    return 1;
  }

  async hget(key, field) {
    this.store.cleanupKey(key);
    const hash = this.store.hashes.get(key);
    if (!hash) {
      return null;
    }
    return hash.has(`${field}`) ? hash.get(`${field}`) : null;
  }

  async hgetall(key) {
    this.store.cleanupKey(key);
    const hash = this.store.hashes.get(key);
    if (!hash) {
      return {};
    }
    const out = {};
    for (const [k, v] of hash.entries()) {
      out[k] = v;
    }
    return out;
  }

  async hmget(key, ...fields) {
    this.store.cleanupKey(key);
    const hash = this.store.hashes.get(key);
    return fields.map((field) => {
      if (!hash) {
        return null;
      }
      return hash.has(`${field}`) ? hash.get(`${field}`) : null;
    });
  }

  async hincrby(key, field, inc) {
    this.store.cleanupKey(key);
    if (!this.store.hashes.has(key)) {
      this.store.hashes.set(key, new Map());
    }
    const hash = this.store.hashes.get(key);
    const current = Number(hash.get(`${field}`) || "0");
    const next = current + Number(inc);
    hash.set(`${field}`, `${next}`);
    return next;
  }

  async eval(script, numKeys, ...rest) {
    const keys = rest.slice(0, numKeys);
    const argv = rest.slice(numKeys);

    if (script.includes("status ~= 'EXECUTING'") && script.includes("YEARLY_LIMIT_REACHED")) {
      return this.evalCommitUsageLua(keys, argv);
    }

    if (script.includes("GET") && script.includes("DEL") && script.includes("lockKey") && argv.length >= 1) {
      const lockKey = keys[0];
      const token = `${argv[0]}`;
      const current = await this.get(lockKey);
      if (current === token) {
        await this.del(lockKey);
        return 1;
      }
      return 0;
    }

    if (script.includes("PEXPIRE") && script.includes("lockKey") && argv.length >= 2) {
      const lockKey = keys[0];
      const token = `${argv[0]}`;
      const ttlMs = Number(argv[1]);
      const current = await this.get(lockKey);
      if (current === token) {
        await this.pexpire(lockKey, ttlMs);
        return 1;
      }
      return 0;
    }

    throw new Error("Unsupported Lua script in FakeRedis eval");
  }

  async evalCommitUsageLua(keys, argv) {
    const usageKey = keys[0];
    const requestKey = keys[1];

    const quotaModel = `${argv[0]}`;
    const dailyField = `${argv[1]}`;
    const monthlyField = `${argv[2]}`;
    const yearlyField = `${argv[3]}`;
    const dailyLimit = Number(argv[4]);
    const monthlyLimit = Number(argv[5]);
    const yearlyLimit = Number(argv[6]);
    const hardThrottle = Number(argv[7]);
    const marketDailyField = `${argv[8]}`;
    const marketMonthlyField = `${argv[9]}`;
    const marketYearlyField = `${argv[10]}`;
    const marketInc = Number(argv[11]);
    const responseBody = `${argv[12]}`;
    const responseStatus = `${argv[13]}`;
    const requestTtlSec = Number(argv[14]);

    const status = await this.hget(requestKey, "status");
    if (!status) {
      return [-4, 0, 0, 0];
    }

    if (status === "SUCCESS") {
      const d = Number((await this.hget(usageKey, dailyField)) || "0");
      const m = Number((await this.hget(usageKey, monthlyField)) || "0");
      const y = Number((await this.hget(usageKey, yearlyField)) || "0");
      return [2, d, m, y];
    }

    if (status !== "EXECUTING") {
      return [-3, 0, 0, 0];
    }

    const currentDaily = Number((await this.hget(usageKey, dailyField)) || "0");
    const currentMonthly = Number((await this.hget(usageKey, monthlyField)) || "0");
    const currentYearly = Number((await this.hget(usageKey, yearlyField)) || "0");

    if (quotaModel === "dual_cap") {
      if (dailyLimit && (currentDaily + 1) > dailyLimit) {
        await this.hset(requestKey, "status", "FAILED", "error", "DAILY_LIMIT_REACHED");
        await this.expire(requestKey, requestTtlSec);
        return [-1, currentDaily, currentMonthly, currentYearly];
      }
      if (monthlyLimit && (currentMonthly + 1) > monthlyLimit) {
        await this.hset(requestKey, "status", "FAILED", "error", "MONTHLY_LIMIT_REACHED");
        await this.expire(requestKey, requestTtlSec);
        return [-2, currentDaily, currentMonthly, currentYearly];
      }
    }

    if (quotaModel === "yearly_contract" && hardThrottle === 1) {
      if (yearlyLimit && (currentYearly + 1) > yearlyLimit) {
        await this.hset(requestKey, "status", "FAILED", "error", "YEARLY_LIMIT_REACHED");
        await this.expire(requestKey, requestTtlSec);
        return [-5, currentDaily, currentMonthly, currentYearly];
      }
    }

    let newDaily = currentDaily;
    let newMonthly = currentMonthly;
    let newYearly = currentYearly;

    if (quotaModel === "dual_cap") {
      newDaily = await this.hincrby(usageKey, dailyField, 1);
      newMonthly = await this.hincrby(usageKey, monthlyField, 1);
    } else {
      newYearly = await this.hincrby(usageKey, yearlyField, 1);
    }

    if (marketInc > 0) {
      if (quotaModel === "dual_cap") {
        await this.hincrby(usageKey, marketDailyField, marketInc);
        await this.hincrby(usageKey, marketMonthlyField, marketInc);
      } else {
        await this.hincrby(usageKey, marketYearlyField, marketInc);
      }
    }

    await this.hset(
      requestKey,
      "status", "SUCCESS",
      "response", responseBody,
      "responseStatus", responseStatus,
      "dailyUsed", `${newDaily}`,
      "monthlyUsed", `${newMonthly}`,
      "yearlyUsed", `${newYearly}`,
    );
    await this.expire(requestKey, requestTtlSec);

    return [1, newDaily, newMonthly, newYearly];
  }
}

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "ioredis") {
    return FakeRedis;
  }
  return originalLoad(request, parent, isMain);
};

process.env.AI_IDEMPOTENCY_SECRET = process.env.AI_IDEMPOTENCY_SECRET || crypto.randomBytes(32).toString("hex");
process.env.PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || process.env.TEST_PAYSTACK_SECRET_KEY || "";
process.env.REDIS_HOST = process.env.REDIS_HOST || "redis";
process.env.REDIS_PORT = "6379";

require("ts-node/register/transpile-only");

const { createAiUsageGuard } = require("../backend/middleware/aiUsageGuardMiddleware");
const { PaymentsController } = require("./modules/payments/controllers/payments-optimized.controller.ts");

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

function sha256(value) {
  return crypto.createHash("sha256").update(`${value}`).digest("hex");
}

function computeRequestId({ userId, path, feature, body }) {
  const bucket = Math.floor(Date.now() / 300000);
  const payloadHash = sha256(stableStringify(body || {}));
  return sha256(`${userId}|${path}|${feature}|${payloadHash}|${bucket}`);
}

function makeReq({ userId, tier = "pro", path = "/ai/copywriter", body = {}, headers = {} }) {
  return {
    path,
    body,
    headers,
    currentUser: {
      id: userId,
      subscriptionLevel: tier,
      subscriptionStartedAt: "2026-01-01T00:00:00.000Z",
    },
  };
}

function makeRes() {
  const handlers = new Map();
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return payload;
    },
    once(event, cb) {
      handlers.set(event, cb);
    },
    emit(event) {
      const cb = handlers.get(event);
      if (typeof cb === "function") {
        cb();
      }
    },
  };
  return res;
}

async function invokeGuard(middleware, req, onExecute) {
  return new Promise((resolve, reject) => {
    const res = makeRes();
    const originalJson = res.json.bind(res);

    res.json = (payload) => {
      originalJson(payload);
      res.emit("finish");
      resolve({ statusCode: res.statusCode, body: payload });
      return payload;
    };

    middleware(req, res, async () => {
      try {
        await onExecute(req, res);
      } catch (error) {
        reject(error);
      }
    }).catch(reject);
  });
}

async function run() {
  const redis = new FakeRedis();
  SHARED.reset();

  const results = [];

  // Test 1: Duplicate request test (100)
  {
    const userId = "mvp-user-dup";
    await redis.set(`ai:subscription:${userId}:tier`, "pro", "EX", 86400);
    const guard = createAiUsageGuard({ feature: "copywriter" });
    let aiExecutions = 0;

    const reqBody = { product: "Phone", price: 100 };
    const calls = Array.from({ length: 100 }, () => invokeGuard(
      guard,
      makeReq({ userId, body: reqBody }),
      async (_req, res) => {
        aiExecutions += 1;
        await new Promise((r) => setTimeout(r, 5));
        res.json({ success: true, feature: "copywriter", result: { market_api_calls_consumed: 0 } });
      },
    ));

    const responses = await Promise.all(calls);
    const usage = await redis.hgetall(`ai:guard:usage:${userId}:pro`);
    const aiFields = Object.entries(usage).filter(([k]) => k.endsWith(":ai")).map(([, v]) => Number(v));
    const dailyAndMonthlyAtMostOne = aiFields.every((v) => v <= 1);

    results.push({
      name: "Test 1 Duplicate request x100",
      pass: aiExecutions === 1 && dailyAndMonthlyAtMostOne,
      details: `executions=${aiExecutions}, responses=${responses.length}, aiFields=${JSON.stringify(usage)}`,
    });
  }

  // Test 2: Paystack replay test
  {
    const paystackCalls = { verify: 0 };
    const mockPaystackService = {
      verifyPaymentSync: async () => {
        paystackCalls.verify += 1;
        return {
          status: "success",
          reference: "pay_ref_1",
          paid_at: new Date().toISOString(),
          metadata: { tier: "elite", userId: "pay-user-1" },
          customer: { email: "pay-user-1@example.com" },
        };
      },
      initializePayment: async () => ({}),
      verifyPaymentAsync: async () => ({}),
      getPaymentStatus: async () => ({}),
    };

    const mockLogger = {
      logError: () => undefined,
      logInfo: () => undefined,
    };

    const controller = new PaymentsController(mockPaystackService, mockLogger);

    const payloadObject = {
      event: "charge.success",
      data: {
        id: "evt_1",
        reference: "pay_ref_1",
        amount: 450000,
      },
    };

    const payload = JSON.stringify(payloadObject);
    const signature = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(payload)
      .digest("hex");

    const webhookCalls = Array.from({ length: 50 }, () => controller.handleWebhook(
      { rawBody: payload },
      signature,
      payloadObject,
    ));

    const webhookResponses = await Promise.all(webhookCalls);
    const eventState = await redis.hgetall("paystack:webhook:event:evt_1:state");
    const tier = await redis.get("ai:subscription:pay-user-1:tier");

    results.push({
      name: "Test 2 Paystack replay x50",
      pass: paystackCalls.verify === 1 && eventState.status === "SUCCESS" && tier === "elite",
      details: `verifyCalls=${paystackCalls.verify}, eventStatus=${eventState.status}, tier=${tier}, responses=${webhookResponses.length}`,
    });
  }

  // Test 3: Concurrency test across multi-instance guards
  {
    const userId = "mvp-user-multi";
    await redis.set(`ai:subscription:${userId}:tier`, "pro", "EX", 86400);

    const guardA = createAiUsageGuard({ feature: "copywriter" });
    const guardB = createAiUsageGuard({ feature: "copywriter" });

    let aiExecutions = 0;
    const reqBody = { product: "Laptop", price: 500 };

    const calls = Array.from({ length: 200 }, (_, i) => {
      const guard = i % 2 === 0 ? guardA : guardB;
      return invokeGuard(
        guard,
        makeReq({ userId, body: reqBody }),
        async (_req, res) => {
          aiExecutions += 1;
          await new Promise((r) => setTimeout(r, 6));
          res.json({ success: true, feature: "copywriter", result: { market_api_calls_consumed: 0 } });
        },
      );
    });

    await Promise.all(calls);
    const usage = await redis.hgetall(`ai:guard:usage:${userId}:pro`);

    results.push({
      name: "Test 3 Multi-instance concurrency x200",
      pass: aiExecutions === 1,
      details: `executions=${aiExecutions}, usage=${JSON.stringify(usage)}`,
    });
  }

  // Test 4: Crash recovery test (stale EXECUTING, lock absent)
  {
    const userId = "mvp-user-crash";
    const tier = "pro";
    await redis.set(`ai:subscription:${userId}:tier`, tier, "EX", 86400);

    const feature = "copywriter";
    const reqBody = { product: "Tablet", price: 200 };
    const path = "/ai/copywriter";
    const requestId = computeRequestId({ userId, path, feature, body: reqBody });

    const requestKey = `ai:guard:${userId}:${tier}:${feature}:req:${requestId}`;
    await redis.hset(
      requestKey,
      "status", "EXECUTING",
      "startedAt", `${Date.now() - (10 * 60 * 1000)}`,
      "tier", tier,
      "feature", feature,
    );
    await redis.expire(requestKey, 3600);

    // Intentionally no lock key to simulate crashed instance after lock loss.
    const guard = createAiUsageGuard({ feature });
    let aiExecutions = 0;

    await invokeGuard(
      guard,
      makeReq({ userId, tier, body: reqBody, path }),
      async (_req, res) => {
        aiExecutions += 1;
        res.json({ success: true, feature: "copywriter", result: { market_api_calls_consumed: 0 } });
      },
    );

    const usage = await redis.hgetall(`ai:guard:usage:${userId}:${tier}`);
    const requestState = await redis.hgetall(requestKey);

    results.push({
      name: "Test 4 Crash recovery",
      pass: aiExecutions === 1 && requestState.status === "SUCCESS",
      details: `executions=${aiExecutions}, requestStatus=${requestState.status}, usage=${JSON.stringify(usage)}`,
    });
  }

  const passed = results.filter((r) => r.pass).length;
  for (const result of results) {
    console.log(`${result.pass ? "PASS" : "FAIL"} - ${result.name}`);
    console.log(`  ${result.details}`);
  }

  console.log(`SUMMARY: ${passed}/${results.length} tests passed`);
  if (passed !== results.length) {
    process.exitCode = 2;
  }
}

run().catch((error) => {
  console.error("MVP validation simulation failed:", error);
  process.exit(1);
});
