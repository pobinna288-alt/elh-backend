function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(`${value ?? ""}`, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = `${value ?? ""}`.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

const TIER_POLICY_VERSION = "2026-04-stable";

const TIER_POLICY = Object.freeze({
  starter: Object.freeze({
    quotaModel: "dual_cap",
    dailyLimit: parsePositiveInt(process.env.STARTER_DAILY_AI_LIMIT, 10),
    monthlyLimit: parsePositiveInt(process.env.STARTER_MONTHLY_AI_LIMIT, 200),
    dailyMarketLimit: 0,
    monthlyMarketLimit: 0,
    yearlyLimit: null,
    marketMode: "cache_only",
    hardThrottle: true,
    features: Object.freeze(["copywriter", "negotiation", "demandpulse"]),
  }),
  pro: Object.freeze({
    quotaModel: "dual_cap",
    dailyLimit: parsePositiveInt(process.env.PRO_DAILY_AI_LIMIT, 15),
    monthlyLimit: parsePositiveInt(process.env.PRO_MONTHLY_AI_LIMIT, 400),
    dailyMarketLimit: parsePositiveInt(process.env.PRO_DAILY_MARKET_LIMIT || process.env.PRO_DAILY_AI_LIMIT, 15),
    monthlyMarketLimit: parsePositiveInt(process.env.PRO_MONTHLY_MARKET_LIMIT, 400),
    yearlyLimit: null,
    marketMode: "single_source",
    hardThrottle: true,
    features: Object.freeze(["copywriter", "negotiation", "demandpulse", "ad-improvement", "guardian"]),
  }),
  elite: Object.freeze({
    quotaModel: "dual_cap",
    dailyLimit: parsePositiveInt(process.env.ELITE_DAILY_AI_LIMIT, 60),
    monthlyLimit: parsePositiveInt(process.env.ELITE_MONTHLY_AI_LIMIT, 1800),
    dailyMarketLimit: parsePositiveInt(process.env.ELITE_DAILY_MARKET_LIMIT, 60),
    monthlyMarketLimit: parsePositiveInt(process.env.ELITE_MONTHLY_MARKET_LIMIT, 1800),
    yearlyLimit: null,
    marketMode: "multi_source",
    hardThrottle: true,
    features: Object.freeze(["copywriter", "negotiation", "demandpulse", "ad-improvement", "guardian"]),
  }),
  enterprise: Object.freeze({
    quotaModel: "yearly_contract",
    dailyLimit: null,
    monthlyLimit: null,
    dailyMarketLimit: null,
    monthlyMarketLimit: null,
    yearlyLimit: parsePositiveInt(process.env.ENTERPRISE_YEARLY_AI_LIMIT, 72000),
    marketMode: "full_market",
    hardThrottle: parseBoolean(process.env.ENTERPRISE_HARD_THROTTLE, false),
    features: Object.freeze(["copywriter", "negotiation", "demandpulse", "ad-improvement", "guardian"]),
  }),
  vip: Object.freeze({
    quotaModel: "yearly_contract",
    dailyLimit: null,
    monthlyLimit: null,
    dailyMarketLimit: null,
    monthlyMarketLimit: null,
    yearlyLimit: parsePositiveInt(process.env.VIP_YEARLY_AI_LIMIT, 120000),
    marketMode: "precision_only",
    hardThrottle: parseBoolean(process.env.VIP_HARD_THROTTLE, false),
    features: Object.freeze(["copywriter", "negotiation", "demandpulse", "ad-improvement", "guardian"]),
  }),
});

class DualCapQuotaEngine {
  constructor(policy) {
    this.policy = policy;
    this.name = "DualCapQuotaEngine";
  }

  getQuotaModel() {
    return "dual_cap";
  }

  getLimits() {
    return {
      dailyLimit: this.policy.dailyLimit,
      monthlyLimit: this.policy.monthlyLimit,
      yearlyLimit: 0,
      hardThrottle: true,
    };
  }
}

class EnterpriseYearlyQuotaEngine {
  constructor(policy) {
    this.policy = policy;
    this.name = "EnterpriseYearlyQuotaEngine";
  }

  getQuotaModel() {
    return "yearly_contract";
  }

  getLimits() {
    return {
      dailyLimit: 0,
      monthlyLimit: 0,
      yearlyLimit: this.policy.yearlyLimit,
      hardThrottle: Boolean(this.policy.hardThrottle),
    };
  }
}

function getTierPolicy(tier) {
  const normalized = `${tier || ""}`.trim().toLowerCase();
  return TIER_POLICY[normalized] || null;
}

function createQuotaEngine(tier) {
  const policy = getTierPolicy(tier);
  if (!policy) {
    return null;
  }

  if (policy.quotaModel === "yearly_contract") {
    return new EnterpriseYearlyQuotaEngine(policy);
  }

  return new DualCapQuotaEngine(policy);
}

module.exports = {
  TIER_POLICY_VERSION,
  TIER_POLICY,
  DualCapQuotaEngine,
  EnterpriseYearlyQuotaEngine,
  getTierPolicy,
  createQuotaEngine,
};
