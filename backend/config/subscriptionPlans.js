/**
 * El Hannora - Subscription Plan Configuration
 * Coin Reward Engine
 * 
 * This configuration defines the subscription plans and their
 * associated video duration limits and coin reward caps.
 * 
 * SECURITY: These values are server-side only.
 * Frontend cannot override these configurations.
 */

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(`${value ?? ''}`, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const PREMIUM_PRICE = parsePositiveInteger(process.env.PREMIUM_PRICE_USD, 20);
const PREMIUM_COINS = parsePositiveInteger(process.env.PREMIUM_COINS, 20000);
const PREMIUM_DURATION_DAYS = parsePositiveInteger(process.env.PREMIUM_DURATION_DAYS, 30);

const SUBSCRIPTION_BILLING = {
  premium: {
    price: PREMIUM_PRICE,
    coins: PREMIUM_COINS,
    paystackAmount: parsePositiveInteger(process.env.PREMIUM_PRICE_NGN, 15000),
    duration: PREMIUM_DURATION_DAYS,
  },
  pro: {
    price: parsePositiveInteger(process.env.PRO_PRICE_USD, 60),
    coins: parsePositiveInteger(process.env.PRO_COINS, 60000),
    paystackAmount: parsePositiveInteger(process.env.PRO_PRICE_NGN, 45000),
    duration: parsePositiveInteger(process.env.PRO_DURATION_DAYS, 30),
  },
  hot: {
    price: parsePositiveInteger(process.env.HOT_PRICE_USD, 120),
    coins: parsePositiveInteger(process.env.HOT_COINS, 120000),
    paystackAmount: parsePositiveInteger(process.env.HOT_PRICE_NGN, 90000),
    duration: parsePositiveInteger(process.env.HOT_DURATION_DAYS, 30),
  },
  enterprise: {
    price: parsePositiveInteger(process.env.ENTERPRISE_PRICE_USD, 499),
    coins: parsePositiveInteger(process.env.ENTERPRISE_COINS, 500000),
    paystackAmount: parsePositiveInteger(process.env.ENTERPRISE_PRICE_NGN, 350000),
    duration: parsePositiveInteger(process.env.ENTERPRISE_DURATION_DAYS, 30),
  },
};

const SUBSCRIPTION_PLANS = {
  NORMAL: {
    id: 'NORMAL',
    name: 'Normal',
    max_video_duration: 120, // seconds (2 minutes)
    max_coin_reward: 10, // Updated: Normal ads return 10 coins max, not 20
    daily_coin_limit: 50,
    features: ['basic_ads', 'standard_reach'],
    description: 'Basic plan for casual advertisers'
  },
  PREMIUM: {
    id: 'PREMIUM',
    name: 'Starter',
    max_video_duration: 180, // seconds (3 minutes)
    max_coin_reward: 50,
    daily_coin_limit: 50,
    features: ['smart_copywriter', 'negotiation_ai', 'competitor_analyzer', 'starter_tier'],
    description: 'Starter plan with medium priority processing'
  },
  PRO: {
    id: 'PRO',
    name: 'Pro',
    max_video_duration: 300, // seconds (5 minutes)
    max_coin_reward: 120,
    daily_coin_limit: 120,
    features: ['smart_copywriter', 'negotiation_ai', 'competitor_analyzer', 'ad_improvement', 'ad_targeting', 'competitor_analysis_pro'],
    description: 'Pro plan with high priority processing'
  },
  HOT: {
    id: 'HOT',
    name: 'Elite',
    max_video_duration: 420, // seconds (7 minutes)
    max_coin_reward: 225,
    daily_coin_limit: 225,
    ai_features: ['smart_copywriter', 'negotiation_ai', 'competitor_analyzer', 'ad_improvement', 'ad_targeting', 'competitor_analysis_pro'],
    features: ['smart_copywriter', 'negotiation_ai', 'competitor_analyzer', 'ad_improvement', 'ad_targeting', 'competitor_analysis_pro', 'premium_support_priority'],
    description: 'Elite plan with highest priority processing'
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    max_video_duration: 3600, // seconds (up to 1 hour default)
    max_coin_reward: 500,
    daily_coin_limit: 500,
    features: ['smart_copywriter', 'negotiation_ai', 'ai_auto_post_generator', 'ai_adguardian'],
    description: 'Enterprise AI plan with Smart Copywriter, Negotiation AI, AI Auto Post Generator, and AI AdGuardian only'
  }
};

// Default plan for new users
const DEFAULT_PLAN = 'NORMAL';

// Daily coin cap for viewers (anti-farming protection)
const VIEWER_DAILY_COIN_CAP = 50;

// Plan-specific daily coin limits for viewers
const PLAN_DAILY_COIN_CAP = {
  PREMIUM: SUBSCRIPTION_PLANS.PREMIUM.daily_coin_limit,
  PRO: SUBSCRIPTION_PLANS.PRO.daily_coin_limit,
  HOT: SUBSCRIPTION_PLANS.HOT.daily_coin_limit,
  ENTERPRISE: SUBSCRIPTION_PLANS.ENTERPRISE.daily_coin_limit,
};

// Watch completion threshold required to earn coins (90%)
const WATCH_COMPLETION_THRESHOLD = 0.90;

// Minimum watch duration to be considered valid (prevents instant skips)
const MINIMUM_WATCH_DURATION_SECONDS = 5;

// Maximum playback speed allowed (anti-cheat)
const MAX_ALLOWED_PLAYBACK_SPEED = 1.5;

// Session timeout for watch tracking (5 minutes of inactivity)
const WATCH_SESSION_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Get plan configuration by plan type
 * @param {string} planType - Plan type (NORMAL, PREMIUM, PRO, HOT)
 * @returns {Object|null} Plan configuration or null if invalid
 */
function getPlanConfig(planType) {
  const normalizedPlan = planType?.toUpperCase();
  return SUBSCRIPTION_PLANS[normalizedPlan] || null;
}

/**
 * Validate if a plan type exists
 * @param {string} planType - Plan type to validate
 * @returns {boolean} True if valid plan
 */
function isValidPlan(planType) {
  const normalizedPlan = planType?.toUpperCase();
  return Object.hasOwn(SUBSCRIPTION_PLANS, normalizedPlan);
}

/**
 * Get all available plans
 * @returns {Object} All subscription plans
 */
function getAllPlans() {
  return { ...SUBSCRIPTION_PLANS };
}

/**
 * Get plan names as array
 * @returns {string[]} Array of plan names
 */
function getPlanNames() {
  return Object.keys(SUBSCRIPTION_PLANS);
}

function getBillingConfig(planType) {
  const normalizedPlan = planType?.toLowerCase();
  return SUBSCRIPTION_BILLING[normalizedPlan] || null;
}

module.exports = {
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_BILLING,
  PREMIUM_PRICE,
  PREMIUM_COINS,
  PREMIUM_DURATION_DAYS,
  DEFAULT_PLAN,
  VIEWER_DAILY_COIN_CAP,
  PLAN_DAILY_COIN_CAP,
  WATCH_COMPLETION_THRESHOLD,
  MINIMUM_WATCH_DURATION_SECONDS,
  MAX_ALLOWED_PLAYBACK_SPEED,
  WATCH_SESSION_TIMEOUT_MS,
  getPlanConfig,
  getBillingConfig,
  isValidPlan,
  getAllPlans,
  getPlanNames
};
