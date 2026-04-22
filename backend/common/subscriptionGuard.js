/**
 * Subscription Guard Utility
 *
 * Provides a reusable check to prevent duplicate active subscriptions.
 * Use this before creating or activating any new subscription.
 */

/**
 * Check whether a user already has an active subscription.
 *
 * A subscription is considered active when:
 *   - user.isPremium === true
 *   - user.premiumExpiresAt exists and is a future date
 *
 * @param {object} user - User object from database
 * @returns {{ active: boolean, expiresAt: string|null, daysRemaining: number }}
 */
function checkActiveSubscription(user) {
  if (!user) {
    return { active: false, expiresAt: null, daysRemaining: 0 };
  }

  const expiry = user.premiumExpiresAt ? new Date(user.premiumExpiresAt) : null;
  const now = new Date();
  const active = Boolean(user.isPremium && expiry && expiry > now);
  const daysRemaining = active
    ? Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    active,
    expiresAt: expiry ? expiry.toISOString() : null,
    daysRemaining,
  };
}

/**
 * Build the standard blocked response body used across all routes.
 *
 * @param {{ expiresAt: string|null, daysRemaining: number }} subStatus
 * @returns {{ success: false, message: string, code: string, data: object }}
 */
function buildActiveSubscriptionResponse(subStatus) {
  return {
    success: false,
    message: "You already have an active subscription",
    code: "ACTIVE_SUBSCRIPTION_EXISTS",
    data: {
      expiresAt: subStatus.expiresAt,
      daysRemaining: subStatus.daysRemaining,
    },
  };
}

module.exports = {
  checkActiveSubscription,
  buildActiveSubscriptionResponse,
};
