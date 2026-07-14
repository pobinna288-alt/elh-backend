const {
  appendLedgerTransaction,
  ensureTransactionStore,
  ensureUserLedger,
  getUserLedgerBalance,
  syncUserBalanceFromLedger,
} = require("../../common/coinLedger");
const { resolveUserById } = require("../../common/resolveUser");

const SERVER_REWARD_RULES = Object.freeze({
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
    getCoinBalance(userId) {
      const user = resolveUserById(database, userId);
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
      const user = resolveUserById(database, userId);
      console.log("[IDENTITY] /coins/earn - requested userId:", userId);
      console.log("[IDENTITY] /coins/earn - resolved record id:", user?.id ?? "NOT_FOUND");
      console.log("[IDENTITY] /coins/earn - resolved record email:", user?.email ?? "NOT_FOUND");
      if (!user) {
        return {
          status: 404,
          body: {
            success: false,
            error: "User not found",
          },
        };
      }

      const userIndex = database.users.findIndex((entry) => String(entry?.id ?? "") === String(user.id ?? ""));

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

      ensureUserLedger(database, user);

      const canonicalUserId = String(user?.id ?? userId ?? "");
      const rewardCountToday = countRewardTransactionsForToday(database, canonicalUserId, normalizedAction);
      if (rewardCountToday >= rewardRule.maxPerDay) {
        return {
          status: 429,
          body: {
            success: false,
            error: `Daily limit reached for ${normalizedAction}`,
            coin_balance: getUserLedgerBalance(database, canonicalUserId),
          },
        };
      }

      const ledgerResult = appendLedgerTransaction(database, {
        userId: canonicalUserId,
        amount: rewardRule.amount,
        type: "reward",
        reason: normalizedAction,
        description: rewardRule.description,
        idempotencyKey: `coins:${canonicalUserId}:${normalizedAction}:${requestId}`,
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
      const user = resolveUserById(database, userId);
      console.log("[IDENTITY] /coins/deduct - requested userId:", userId);
      console.log("[IDENTITY] /coins/deduct - resolved record id:", user?.id ?? "NOT_FOUND");
      console.log("[IDENTITY] /coins/deduct - resolved record email:", user?.email ?? "NOT_FOUND");
      if (!user) {
        return {
          status: 404,
          body: {
            success: false,
            error: "User not found",
          },
        };
      }

      const userIndex = database.users.findIndex((entry) => String(entry?.id ?? "") === String(user.id ?? ""));

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

      ensureUserLedger(database, user);

      const ledgerResult = appendLedgerTransaction(database, {
        userId: user.id,
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
      const user = resolveUserById(database, userId);
      if (!user) {
        return {
          success: false,
          error: "User not found",
        };
      }

      ensureUserLedger(database, user);
      const canonicalUserId = String(user?.id ?? userId ?? "");
      const balance = getUserLedgerBalance(database, canonicalUserId);
      return {
        success: balance >= requiredAmount,
        coin_balance: balance,
        required: requiredAmount,
      };
    },

    claimDailyStreakReward(userId) {
      const user = resolveUserById(database, userId);
      console.log("[IDENTITY] /coins/claim-daily-streak - requested userId:", userId);
      console.log("[IDENTITY] /coins/claim-daily-streak - resolved record id:", user?.id ?? "NOT_FOUND");
      console.log("[IDENTITY] /coins/claim-daily-streak - resolved record email:", user?.email ?? "NOT_FOUND");
      if (!user) {
        return {
          status: 404,
          body: {
            success: false,
            error: "User not found",
          },
        };
      }

      // Check if user has an active streak
      const dailyStreak = Number(user.daily_streak) || 0;
      if (dailyStreak === 0) {
        return {
          status: 400,
          body: {
            success: false,
            error: "No active streak to claim",
            daily_streak: dailyStreak,
          },
        };
      }

      // Check if already claimed today
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const lastClaimedAt = user.last_streak_claimed_at ? new Date(user.last_streak_claimed_at).toISOString().split("T")[0] : null;
      
      if (lastClaimedAt === today) {
        return {
          status: 429,
          body: {
            success: false,
            error: "Daily streak reward already claimed today",
            daily_streak: dailyStreak,
            coin_balance: Number(user.coin_balance) || 0,
          },
        };
      }

      // Calculate reward based on streak day
      let reward;
      if (dailyStreak === 1) reward = 10;
      else if (dailyStreak === 2) reward = 15;
      else if (dailyStreak === 3) reward = 20;
      else if (dailyStreak === 4) reward = 25;
      else if (dailyStreak === 5) reward = 30;
      else if (dailyStreak === 6) reward = 35;
      else reward = 50; // Day 7 and beyond

      console.log("[CLAIM:1] reward amount:", reward, "| daily_streak:", dailyStreak);
      console.log("[CLAIM:1] coin_balance BEFORE ledger:", user.coin_balance, "| coins:", user.coins);

      // Record the reward in the ledger so it survives any future
      // syncUserBalanceFromLedger / ensureUserLedger call.
      const canonicalUserId = String(user?.id ?? userId ?? "");
      ensureUserLedger(database, user);
      console.log("[CLAIM:2] ensureUserLedger() called — coin_balance after init:", user.coin_balance);

      const ledgerResult = appendLedgerTransaction(database, {
        userId: canonicalUserId,
        amount: reward,
        type: "reward",
        reason: "daily_streak_reward",
        description: `Daily streak reward (day ${dailyStreak})`,
        idempotencyKey: `daily_streak:${canonicalUserId}:${today}`,
        metadata: { daily_streak: dailyStreak, reward },
      });

      console.log("[CLAIM:3] appendLedgerTransaction() called — success:", ledgerResult.success, "| ledger balance after:", ledgerResult.balance ?? "N/A", "| error:", ledgerResult.error ?? "none");

      if (!ledgerResult.success) {
        return {
          status: ledgerResult.duplicate ? 409 : 400,
          body: {
            success: false,
            error: ledgerResult.error,
            coin_balance: Number(user.coin_balance) || 0,
          },
        };
      }

      // Derive authoritative balance from ledger
      const balanceBeforeSync = user.coin_balance;
      const newBalance = syncUserBalanceFromLedger(database, user);
      console.log("[CLAIM:4] syncUserBalanceFromLedger() called — coin_balance before:", balanceBeforeSync, "| coin_balance after:", user.coin_balance, "| returned:", newBalance);

      user.last_streak_claimed_at = now.toISOString();
      user.updatedAt = now;

      // Persist the updated user row to app.db
      const userIndex = database.users.findIndex((entry) => String(entry?.id ?? "") === canonicalUserId);
      console.log("[CLAIM:5] writing back to database.users[", userIndex, "] — object:", JSON.stringify({ id: user.id, coin_balance: user.coin_balance, coins: user.coins, last_streak_claimed_at: user.last_streak_claimed_at }));
      if (userIndex !== -1) {
        database.users[userIndex] = user;
        console.log("[CLAIM:6] database.users[userIndex] = user done — upsertRow to SQLite triggered");
      } else {
        console.log("[CLAIM:6] WARNING: userIndex === -1, row NOT written to SQLite");
      }

      return {
        status: 200,
        body: {
          success: true,
          message: `Daily streak reward claimed: ${reward} coins`,
          reward: reward,
          daily_streak: dailyStreak,
          coin_balance: newBalance,
          coins: newBalance,
        },
      };
    },
  };
}

module.exports = {
  createCoinService,
};
