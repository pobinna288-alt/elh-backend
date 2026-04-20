const {
  PREMIUM_COINS,
  PREMIUM_PRICE,
  PREMIUM_DURATION_DAYS,
} = require("../../config/subscriptionPlans");
const { v4: uuidv4 } = require("uuid");

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

        const newBalance = balance - coinCost;
        user.coins = newBalance;
        user.coin_balance = newBalance;
      } else if (paymentMethod === "card") {
        const normalizedAmountPaid = Number(amountPaid);
        if (!Number.isFinite(normalizedAmountPaid) || normalizedAmountPaid !== cardCost) {
          return {
            status: 400,
            body: {
              success: false,
              error: `Payment amount mismatch. Required: $${cardCost}`,
              required: cardCost,
              received: Number.isFinite(normalizedAmountPaid) ? normalizedAmountPaid : null,
            },
          };
        }
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
