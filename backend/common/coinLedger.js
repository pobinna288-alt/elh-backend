const { v4: uuidv4 } = require("uuid");

function ensureTransactionStore(database) {
  if (!database) {
    throw new Error("Database reference is required for coin ledger operations");
  }

  if (!Array.isArray(database.transactions)) {
    database.transactions = [];
  }

  return database.transactions;
}

function normalizeAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function getUserTransactions(database, userId) {
  const transactions = ensureTransactionStore(database);
  return transactions.filter((entry) => entry?.userId === userId);
}

function getUserLedgerBalance(database, userId) {
  return getUserTransactions(database, userId).reduce((total, entry) => total + normalizeAmount(entry.amount), 0);
}

function ensureUserLedger(database, user = {}) {
  if (!user?.id) {
    return [];
  }

  const transactions = ensureTransactionStore(database);
  const hasTransactions = transactions.some((entry) => entry?.userId === user.id);

  if (!hasTransactions) {
    const openingBalance = normalizeAmount(user.coin_balance ?? user.coins);
    const openingEntry = Object.freeze({
      id: uuidv4(),
      userId: user.id,
      amount: openingBalance,
      type: "opening_balance",
      reason: "ledger_initialization",
      description: "Opening coin balance",
      idempotencyKey: `opening_balance:${user.id}`,
      createdAt: new Date().toISOString(),
      metadata: {
        source: "coin_ledger",
      },
      immutable: true,
      balanceAfter: openingBalance,
    });

    transactions.push(openingEntry);
  }

  const balance = getUserLedgerBalance(database, user.id);
  user.coins = balance;
  user.coin_balance = balance;

  return getUserTransactions(database, user.id);
}

function findTransactionByIdempotencyKey(database, userId, idempotencyKey) {
  if (!idempotencyKey) {
    return null;
  }

  return ensureTransactionStore(database).find(
    (entry) => entry?.userId === userId && entry?.idempotencyKey === idempotencyKey,
  ) || null;
}

function appendLedgerTransaction(database, {
  userId,
  amount,
  type,
  reason,
  description,
  idempotencyKey,
  metadata = {},
}) {
  if (!userId) {
    return {
      success: false,
      error: "User ID is required",
    };
  }

  const normalizedAmount = normalizeAmount(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount === 0) {
    return {
      success: false,
      error: "Transaction amount must be a non-zero number",
    };
  }

  const existingTransaction = findTransactionByIdempotencyKey(database, userId, idempotencyKey);
  if (existingTransaction) {
    return {
      success: false,
      duplicate: true,
      error: "This request has already been processed",
      transaction: existingTransaction,
      balance: getUserLedgerBalance(database, userId),
    };
  }

  const currentBalance = getUserLedgerBalance(database, userId);
  const nextBalance = currentBalance + normalizedAmount;

  if (nextBalance < 0) {
    return {
      success: false,
      error: "Insufficient coins",
      balance: currentBalance,
      attemptedAmount: normalizedAmount,
    };
  }

  const transaction = Object.freeze({
    id: uuidv4(),
    userId,
    amount: normalizedAmount,
    type: type || (normalizedAmount > 0 ? "credit" : "debit"),
    reason: reason || "coin_update",
    description: description || "Coin balance update",
    idempotencyKey: idempotencyKey || `ledger:${userId}:${uuidv4()}`,
    createdAt: new Date().toISOString(),
    metadata: { ...metadata },
    immutable: true,
    balanceAfter: nextBalance,
  });

  ensureTransactionStore(database).push(transaction);

  return {
    success: true,
    transaction,
    balance: nextBalance,
  };
}

function syncUserBalanceFromLedger(database, user = {}) {
  if (!user?.id) {
    return 0;
  }

  ensureUserLedger(database, user);
  const balance = getUserLedgerBalance(database, user.id);
  user.coins = balance;
  user.coin_balance = balance;
  return balance;
}

module.exports = {
  appendLedgerTransaction,
  ensureTransactionStore,
  ensureUserLedger,
  findTransactionByIdempotencyKey,
  getUserLedgerBalance,
  getUserTransactions,
  syncUserBalanceFromLedger,
};
