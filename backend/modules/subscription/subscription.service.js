const {
  PREMIUM_COINS,
  PREMIUM_PRICE,
  PREMIUM_DURATION_DAYS,
} = require("../../config/subscriptionPlans");
const { v4: uuidv4 } = require("uuid");
const { checkActiveSubscription, buildActiveSubscriptionResponse } = require("../../common/subscriptionGuard");
const { appendLedgerTransaction, syncUserBalanceFromLedger } = require("../../common/coinLedger");

function createSubscriptionService({ database, createNotification, sanitizeUser }) {
  return {
    unlockPremium({ userId, paymentMethod, duration, amountPaid }) {
      const durationDays = Number.isFinite(Number(duration)) && Number(duration) > 0
        ? Number(duration)
        : PREMIUM_DURATION_DAYS;

      const userIndex = database.users.findIndex((entry) => entry.id === userId);
      if (userIndex === -1) {
        return {
          status: 404,
          body: {
            success: false,
            error: "User not found",
          },
        };
      }

      const user = database.users[userIndex];

      const subStatus = checkActiveSubscription(user);
      if (subStatus.active) {
        console.log("Subscription blocked: active plan exists for user:", userId);
        return {
          status: 409,
          body: buildActiveSubscriptionResponse(subStatus),
        };
      }

      const billingCycles = Math.max(1, Math.ceil(durationDays / PREMIUM_DURATION_DAYS));
      const coinCost = PREMIUM_COINS * billingCycles;
      const cardCost = PREMIUM_PRICE * billingCycles;

      if (paymentMethod === "coins") {
        const balance = user.coin_balance != null ? user.coin_balance : user.coins;
        if (balance < coinCost) {
          return {
            status: 400,
            body: {
              success: false,
              error: `Insufficient coins. Required: ${coinCost}, Available: ${balance}`,
            },
          };
        }

        // Deduct via ledger (single source of truth for coin mutations)
        const ledgerResult = appendLedgerTransaction(database, {
          userId: user.id,
          amount: -coinCost,
          type: "debit",
          reason: "premium_purchase",
          description: `Premium subscription coin payment (${durationDays} days)`,
          idempotencyKey: `premium_purchase:${user.id}:${Date.now()}`,
        });
        if (!ledgerResult.success && !ledgerResult.duplicate) {
          return {
            status: 400,
            body: {
              success: false,
              error: ledgerResult.error || "Coin deduction failed",
            },
          };
        }
        syncUserBalanceFromLedger(database, user);
      } else if (paymentMethod === "card") {
        // Card payments must go through Paystack verification.
        // Use POST /api/payments/initialize to start a Paystack checkout.
        return {
          status: 400,
          body: {
            success: false,
            error: "Card payments must be processed through Paystack. Use the /api/payments/initialize endpoint to start checkout.",
            code: "USE_PAYSTACK_CHECKOUT",
          },
        };
      }

      const now = new Date();
      const baseDate = user.premiumExpiresAt && new Date(user.premiumExpiresAt) > now
        ? new Date(user.premiumExpiresAt)
        : now;

      user.isPremium = true;
      if (!user.subscriptionPlan || user.subscriptionPlan === "free") {
        user.subscriptionPlan = "premium";
      }
      user.premiumExpiresAt = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
      user.updatedAt = new Date();

      database.users[userIndex] = user;

      createNotification({
        userId: user.id,
        type: "system",
        title: "Premium Activated!",
        message: `You are now a premium member for ${durationDays} days!`,
        metadata: {
          event: "premium_activation",
          screen: "updates",
        },
      });

      database.transactions.push({
        id: uuidv4(),
        userId: user.id,
        type: "premium_purchase",
        amount: paymentMethod === "coins" ? coinCost : cardCost,
        currency: paymentMethod === "coins" ? "coins" : "USD",
        status: "completed",
        createdAt: new Date(),
      });

      return {
        status: 200,
        body: {
          success: true,
          message: "Premium activated successfully",
          user: sanitizeUser(user),
        },
      };
    },

    getPremiumStatus(userId) {
      const user = database.users.find((entry) => entry.id === userId);
      if (!user) {
        return {
          status: 404,
          body: {
            success: false,
            error: "User not found",
          },
        };
      }

      const isPremiumActive = user.isPremium && user.premiumExpiresAt && new Date(user.premiumExpiresAt) > new Date();

      return {
        status: 200,
        body: {
          success: true,
          isPremium: isPremiumActive,
          expiresAt: user.premiumExpiresAt,
          daysRemaining: isPremiumActive
            ? Math.ceil((new Date(user.premiumExpiresAt) - new Date()) / (1000 * 60 * 60 * 24))
            : 0,
        },
      };
    },
  };
}

module.exports = {
  createSubscriptionService,
};
