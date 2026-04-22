const coinRewardService = require("../../services/coinRewardService");
const {
  appendLedgerTransaction,
  ensureTransactionStore,
  ensureUserLedger,
  getUserLedgerBalance,
  syncUserBalanceFromLedger,
} = require("../../common/coinLedger");

const SERVER_REWARD_RULES = Object.freeze({
  daily_bonus: {
    amount: 10,
    maxPerDay: 1,
    description: "Daily bonus reward",
  },
  engagement_reward: {
    amount: 5,
    maxPerDay: 5,
    description: "Validated engagement reward",
  },
});

function normalizeAction(action) {
  return `${action || ""}`.trim().toLowerCase();
}

function countRewardTransactionsForToday(database, userId, action) {
  const today = new Date().toISOString().split("T")[0];
  return ensureTransactionStore(database).filter((entry) => {
    if (entry?.userId !== userId) {
      return false;
    }

    if ((entry?.metadata?.action || "") !== action) {
      return false;
    }

    return `${entry.createdAt || ""}`.startsWith(today);
  }).length;
}

function createCoinService({ database, createNotification }) {
  return {
    coinRewardService,

    getCoinBalance(userId) {
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

      ensureUserLedger(database, user);
      const balance = syncUserBalanceFromLedger(database, user);

      return {
        status: 200,
        body: {
          success: true,
          coin_balance: balance,
          ledger_total: balance,
        },
      };
    },

    earnCoins({ userId, action, requestId, metadata = {} }) {
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

      const normalizedAction = normalizeAction(action);
      const rewardRule = SERVER_REWARD_RULES[normalizedAction];
      if (!rewardRule) {
        return {
          status: 400,
          body: {
            success: false,
            error: "Unsupported reward action. Rewards must be determined server-side.",
          },
        };
      }

      if (!requestId) {
        return {
          status: 400,
          body: {
            success: false,
            error: "request_id is required for idempotent reward processing",
          },
        };
      }

      const user = database.users[userIndex];
      ensureUserLedger(database, user);

      const rewardCountToday = countRewardTransactionsForToday(database, userId, normalizedAction);
      if (rewardCountToday >= rewardRule.maxPerDay) {
        return {
          status: 429,
          body: {
            success: false,
            error: `Daily limit reached for ${normalizedAction}`,
            coin_balance: getUserLedgerBalance(database, userId),
          },
        };
      }

      const ledgerResult = appendLedgerTransaction(database, {
        userId,
        amount: rewardRule.amount,
        type: "reward",
        reason: normalizedAction,
        description: rewardRule.description,
        idempotencyKey: `coins:${userId}:${normalizedAction}:${requestId}`,
        metadata: {
          action: normalizedAction,
          requestId,
          ...metadata,
        },
      });

      if (!ledgerResult.success) {
        return {
          status: ledgerResult.duplicate ? 409 : 400,
          body: {
            success: false,
            error: ledgerResult.error,
            coin_balance: ledgerResult.balance,
          },
        };
      }

      user.updatedAt = new Date();
      const newBalance = syncUserBalanceFromLedger(database, user);
      database.users[userIndex] = user;

      createNotification({
        userId: user.id,
        type: "system",
        title: `You earned ${rewardRule.amount} coins`,
        message: `Reward for ${normalizedAction.replace(/_/g, " ")}`,
        metadata: {
          event: "coins_earned",
          action: normalizedAction,
          request_id: requestId,
          screen: "updates",
        },
      });

      return {
        status: 200,
        body: {
          success: true,
          message: `Earned ${rewardRule.amount} coins for ${normalizedAction}`,
          coin_balance: newBalance,
          ledger_transaction_id: ledgerResult.transaction.id,
        },
      };
    },

    deductCoins({ userId, amount, reason = "coin action", requestId, metadata = {} }) {
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

      const normalizedAmount = Number(amount) || 0;
      if (normalizedAmount <= 0) {
        return {
          status: 400,
          body: {
            success: false,
            error: "Amount must be greater than zero",
          },
        };
      }

      const user = database.users[userIndex];
      ensureUserLedger(database, user);

      const ledgerResult = appendLedgerTransaction(database, {
        userId,
        amount: -normalizedAmount,
        type: "debit",
        reason,
        description: `Coin deduction for ${reason}`,
        idempotencyKey: requestId ? `spend:${userId}:${reason}:${requestId}` : undefined,
        metadata,
      });

      if (!ledgerResult.success) {
        return {
          status: ledgerResult.duplicate ? 409 : 400,
          body: {
            success: false,
            error: ledgerResult.error,
            coin_balance: ledgerResult.balance,
            required: normalizedAmount,
            available: ledgerResult.balance,
          },
        };
      }

      user.updatedAt = new Date();
      const newBalance = syncUserBalanceFromLedger(database, user);
      database.users[userIndex] = user;

      return {
        status: 200,
        body: {
          success: true,
          message: `Spent ${normalizedAmount} coins for ${reason}`,
          coin_balance: newBalance,
          ledger_transaction_id: ledgerResult.transaction.id,
        },
      };
    },

    validateCoinAction({ userId, requiredAmount = 0 }) {
      const user = database.users.find((entry) => entry.id === userId);
      if (!user) {
        return {
          success: false,
          error: "User not found",
        };
      }

      ensureUserLedger(database, user);
      const balance = getUserLedgerBalance(database, userId);
      return {
        success: balance >= requiredAmount,
        coin_balance: balance,
        required: requiredAmount,
      };
    },

    getDailyCoinStats(viewerId) {
      return coinRewardService.getViewerDailyStats(viewerId);
    },
  };
}

module.exports = {
  coinRewardService,
  createCoinService,
};
