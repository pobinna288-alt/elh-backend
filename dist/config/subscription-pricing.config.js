"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUBSCRIPTION_BILLING = exports.PREMIUM_DURATION_DAYS = exports.PREMIUM_COINS = exports.PREMIUM_PRICE_NGN = exports.PREMIUM_PRICE_USD = void 0;
exports.getSubscriptionBilling = getSubscriptionBilling;
exports.isSupportedSubscriptionPlan = isSupportedSubscriptionPlan;
exports.getSupportedSubscriptionPlans = getSupportedSubscriptionPlans;
const parsePositiveInteger = (value, fallback) => {
    const parsed = Number.parseInt(`${value ?? ''}`, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
exports.PREMIUM_PRICE_USD = parsePositiveInteger(process.env.PREMIUM_PRICE_USD, 20);
exports.PREMIUM_PRICE_NGN = parsePositiveInteger(process.env.PREMIUM_PRICE_NGN, 15000);
exports.PREMIUM_COINS = parsePositiveInteger(process.env.PREMIUM_COINS, 20000);
exports.PREMIUM_DURATION_DAYS = parsePositiveInteger(process.env.PREMIUM_DURATION_DAYS, 30);
const PRO_PRICE_USD = parsePositiveInteger(process.env.PRO_PRICE_USD, 200);
const PRO_PRICE_NGN = parsePositiveInteger(process.env.PRO_PRICE_NGN, 200000);
const PRO_COINS = parsePositiveInteger(process.env.PRO_COINS, 200000);
const PRO_DURATION_DAYS = parsePositiveInteger(process.env.PRO_DURATION_DAYS, 30);
const HOT_PRICE_USD = parsePositiveInteger(process.env.HOT_PRICE_USD, 1000);
const HOT_PRICE_NGN = parsePositiveInteger(process.env.HOT_PRICE_NGN, 1000000);
const HOT_COINS = parsePositiveInteger(process.env.HOT_COINS, 400000);
const HOT_DURATION_DAYS = parsePositiveInteger(process.env.HOT_DURATION_DAYS, 30);
exports.SUBSCRIPTION_BILLING = {
    premium: {
        priceUsd: exports.PREMIUM_PRICE_USD,
        stripeAmountCents: exports.PREMIUM_PRICE_USD * 100,
        paystackAmountNgn: exports.PREMIUM_PRICE_NGN,
        coins: exports.PREMIUM_COINS,
        durationDays: exports.PREMIUM_DURATION_DAYS,
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
};
function getSubscriptionBilling(plan) {
    if (!plan) {
        return null;
    }
    const normalizedPlan = plan.toLowerCase().trim();
    return exports.SUBSCRIPTION_BILLING[normalizedPlan] || null;
}
function isSupportedSubscriptionPlan(plan) {
    return Boolean(getSubscriptionBilling(plan));
}
function getSupportedSubscriptionPlans() {
    return Object.keys(exports.SUBSCRIPTION_BILLING);
}
//# sourceMappingURL=subscription-pricing.config.js.map