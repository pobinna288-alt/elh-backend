/**
 * Centralized subscription billing and plan rules configuration.
 *
 * Internal plan keys remain `premium`, `pro`, and `hot` for database/payment
 * compatibility. Public tier labels exposed to clients are Starter, Pro, and Elite.
 *
 * Update these environment variables to change pricing without touching
 * payment or feature-access logic:
 * - PREMIUM_PRICE_USD / PREMIUM_PRICE_NGN / PREMIUM_COINS / PREMIUM_DURATION_DAYS
 * - PRO_PRICE_USD / PRO_PRICE_NGN / PRO_COINS / PRO_DURATION_DAYS
 * - HOT_PRICE_USD / HOT_PRICE_NGN / HOT_COINS / HOT_DURATION_DAYS
 */

const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(`${value ?? ''}`, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export type ProcessingPriority = 'medium' | 'high' | 'highest';
export type PublicSubscriptionPlan = 'starter' | 'pro' | 'elite';

export interface SubscriptionPlanRules {
  publicName: PublicSubscriptionPlan;
  displayName: 'Starter' | 'Pro' | 'Elite';
  priceUsd: number;
  stripeAmountCents: number;
  paystackAmountNgn: number;
  coins: number;
  durationDays: number;
  maxVideoDurationSeconds: number;
  maxFileSizeMb: number;
  maxAdReach: number;
  processingPriority: ProcessingPriority;
  dailyUploads: number;
  aiRequestsPerToolPerDay: number;
  videoWatchRewardLimit: number;
  coinsPerVideo: number;
  maxCoinsPerDay: number;
}

export const PREMIUM_PRICE_USD = parsePositiveInteger(process.env.PREMIUM_PRICE_USD, 20);
export const PREMIUM_PRICE_NGN = parsePositiveInteger(process.env.PREMIUM_PRICE_NGN, 15000);
export const PREMIUM_COINS = parsePositiveInteger(process.env.PREMIUM_COINS, 20000);
export const PREMIUM_DURATION_DAYS = parsePositiveInteger(process.env.PREMIUM_DURATION_DAYS, 30);

const PRO_PRICE_USD = parsePositiveInteger(process.env.PRO_PRICE_USD, 60);
const PRO_PRICE_NGN = parsePositiveInteger(process.env.PRO_PRICE_NGN, 45000);
const PRO_COINS = parsePositiveInteger(process.env.PRO_COINS, 60000);
const PRO_DURATION_DAYS = parsePositiveInteger(process.env.PRO_DURATION_DAYS, 30);

const HOT_PRICE_USD = parsePositiveInteger(process.env.HOT_PRICE_USD, 120);
const HOT_PRICE_NGN = parsePositiveInteger(process.env.HOT_PRICE_NGN, 90000);
const HOT_COINS = parsePositiveInteger(process.env.HOT_COINS, 120000);
const HOT_DURATION_DAYS = parsePositiveInteger(process.env.HOT_DURATION_DAYS, 30);

export const SUBSCRIPTION_BILLING = {
  premium: {
    priceUsd: PREMIUM_PRICE_USD,
    stripeAmountCents: PREMIUM_PRICE_USD * 100,
    paystackAmountNgn: PREMIUM_PRICE_NGN,
    coins: PREMIUM_COINS,
    durationDays: PREMIUM_DURATION_DAYS,
  },
  pro: {
    priceUsd: PRO_PRICE_USD,
    stripeAmountCents: PRO_PRICE_USD * 100,
    paystackAmountNgn: PRO_PRICE_NGN,
    coins: PRO_COINS,
    durationDays: PRO_DURATION_DAYS,
  },
  hot: {
    priceUsd: HOT_PRICE_USD,
    stripeAmountCents: HOT_PRICE_USD * 100,
    paystackAmountNgn: HOT_PRICE_NGN,
    coins: HOT_COINS,
    durationDays: HOT_DURATION_DAYS,
  },
} as const;

export type SupportedSubscriptionPlan = keyof typeof SUBSCRIPTION_BILLING;

export const SUBSCRIPTION_PLAN_RULES: Record<SupportedSubscriptionPlan, SubscriptionPlanRules> = {
  premium: {
    publicName: 'starter',
    displayName: 'Starter',
    ...SUBSCRIPTION_BILLING.premium,
    maxVideoDurationSeconds: 180,
    maxFileSizeMb: 20,
    maxAdReach: 10000,
    processingPriority: 'medium',
    dailyUploads: 5,
    aiRequestsPerToolPerDay: 10,
    videoWatchRewardLimit: 25,
    coinsPerVideo: 2,
    maxCoinsPerDay: 50,
  },
  pro: {
    publicName: 'pro',
    displayName: 'Pro',
    ...SUBSCRIPTION_BILLING.pro,
    maxVideoDurationSeconds: 300,
    maxFileSizeMb: 30,
    maxAdReach: 500000,
    processingPriority: 'high',
    dailyUploads: 7,
    aiRequestsPerToolPerDay: 25,
    videoWatchRewardLimit: 40,
    coinsPerVideo: 3,
    maxCoinsPerDay: 120,
  },
  hot: {
    publicName: 'elite',
    displayName: 'Elite',
    ...SUBSCRIPTION_BILLING.hot,
    maxVideoDurationSeconds: 600,
    maxFileSizeMb: 50,
    maxAdReach: 1000000,
    processingPriority: 'highest',
    dailyUploads: 8,
    aiRequestsPerToolPerDay: 30,
    videoWatchRewardLimit: 45,
    coinsPerVideo: 5,
    maxCoinsPerDay: 225,
  },
} as const;

export function getSubscriptionBilling(plan?: string | null) {
  if (!plan) {
    return null;
  }

  const normalizedPlan = plan.toLowerCase().trim() as SupportedSubscriptionPlan;
  return SUBSCRIPTION_BILLING[normalizedPlan] || null;
}

export function getSubscriptionPlanRules(plan?: string | null): SubscriptionPlanRules | null {
  if (!plan) {
    return null;
  }

  const normalizedPlan = plan.toLowerCase().trim();

  if (normalizedPlan === 'starter') {
    return SUBSCRIPTION_PLAN_RULES.premium;
  }

  if (normalizedPlan === 'elite') {
    return SUBSCRIPTION_PLAN_RULES.hot;
  }

  if (normalizedPlan === 'pro') {
    return SUBSCRIPTION_PLAN_RULES.pro;
  }

  return SUBSCRIPTION_PLAN_RULES[normalizedPlan as SupportedSubscriptionPlan] || null;
}

export function isSupportedSubscriptionPlan(plan?: string | null): plan is SupportedSubscriptionPlan {
  return Boolean(getSubscriptionBilling(plan));
}

export function getSupportedSubscriptionPlans(): SupportedSubscriptionPlan[] {
  return Object.keys(SUBSCRIPTION_BILLING) as SupportedSubscriptionPlan[];
}
