/**
 * Centralized seller dispatch state store (single-instance MVP).
 * All seller state reads/writes and reservation locks must go through this module.
 */

const { randomUUID } = require("crypto");

const SELLER_STATES = {
  AVAILABLE: "AVAILABLE",
  RESERVED: "RESERVED",
  BUSY: "BUSY",
  OFFLINE: "OFFLINE",
};

const VALID_TRANSITIONS = new Map([
  [SELLER_STATES.AVAILABLE, new Set([SELLER_STATES.RESERVED])],
  [SELLER_STATES.RESERVED, new Set([SELLER_STATES.BUSY, SELLER_STATES.AVAILABLE])],
  [SELLER_STATES.BUSY, new Set([SELLER_STATES.AVAILABLE])],
  [SELLER_STATES.OFFLINE, new Set([SELLER_STATES.AVAILABLE])],
]);

const STORE_BY_DATABASE = new WeakMap();

function nowIso() {
  return new Date().toISOString();
}

function logInfo(message, payload = {}) {
  console.info(`[Dispatch] ${message}`, payload);
}

function logWarn(message, payload = {}) {
  console.warn(`[Dispatch] ${message}`, payload);
}

function getStore(database) {
  if (!database || typeof database !== "object") {
    throw new Error("A valid database object is required for dispatch state operations");
  }

  let store = STORE_BY_DATABASE.get(database);
  if (!store) {
    store = {
      sellerStates: new Map(),
      operations: [],
    };
    STORE_BY_DATABASE.set(database, store);
  }
  return store;
}

function getDefaultState() {
  return {
    state: SELLER_STATES.AVAILABLE,
    reserved_connection_id: null,
    reserved_until_ms: null,
    busy_connection_id: null,
    updated_at: nowIso(),
    revision: 1,
  };
}

function getSellerState(database, sellerId) {
  const store = getStore(database);
  if (!store.sellerStates.has(sellerId)) {
    store.sellerStates.set(sellerId, getDefaultState());
  }
  return store.sellerStates.get(sellerId);
}

function snapshotSellerState(database, sellerId) {
  const state = getSellerState(database, sellerId);
  return { ...state };
}

function appendOperation(database, type, payload) {
  const store = getStore(database);
  store.operations.push({
    id: randomUUID(),
    type,
    payload,
    created_at: nowIso(),
  });

  if (store.operations.length > 5000) {
    store.operations.splice(0, store.operations.length - 5000);
  }
}

function canTransition(from, to) {
  const next = VALID_TRANSITIONS.get(from);
  return Boolean(next && next.has(to));
}

function transitionSellerState(database, params) {
  const {
    sellerId,
    to,
    connectionId = null,
    reason = "system",
  } = params;

  const state = getSellerState(database, sellerId);
  const from = state.state;

  if (!canTransition(from, to)) {
    logWarn("Invalid seller state transition rejected", { sellerId, from, to, reason, connectionId });
    appendOperation(database, "transition_rejected", { sellerId, from, to, reason, connectionId });
    return {
      ok: false,
      code: "INVALID_TRANSITION",
      state: { ...state },
    };
  }

  if (from === SELLER_STATES.RESERVED && to === SELLER_STATES.BUSY) {
    if (!connectionId || state.reserved_connection_id !== connectionId) {
      logWarn("Reserved to busy transition rejected due to connection mismatch", { sellerId, connectionId });
      appendOperation(database, "transition_rejected", {
        sellerId,
        from,
        to,
        reason: "connection_mismatch",
        connectionId,
      });
      return {
        ok: false,
        code: "CONNECTION_MISMATCH",
        state: { ...state },
      };
    }
  }

  if (from === SELLER_STATES.RESERVED && to === SELLER_STATES.AVAILABLE) {
    if (connectionId && state.reserved_connection_id && state.reserved_connection_id !== connectionId) {
      logWarn("Reserved to available transition rejected due to connection mismatch", { sellerId, connectionId });
      appendOperation(database, "transition_rejected", {
        sellerId,
        from,
        to,
        reason: "connection_mismatch",
        connectionId,
      });
      return {
        ok: false,
        code: "CONNECTION_MISMATCH",
        state: { ...state },
      };
    }
  }

  if (from === SELLER_STATES.BUSY && to === SELLER_STATES.AVAILABLE) {
    if (connectionId && state.busy_connection_id && state.busy_connection_id !== connectionId) {
      logWarn("Busy to available transition rejected due to connection mismatch", { sellerId, connectionId });
      appendOperation(database, "transition_rejected", {
        sellerId,
        from,
        to,
        reason: "connection_mismatch",
        connectionId,
      });
      return {
        ok: false,
        code: "CONNECTION_MISMATCH",
        state: { ...state },
      };
    }
  }

  if (from === SELLER_STATES.OFFLINE && to === SELLER_STATES.AVAILABLE) {
    const allowedReasons = new Set(["admin", "system_recovery"]);
    if (!allowedReasons.has(reason)) {
      logWarn("Offline to available transition rejected due to invalid reason", { sellerId, reason });
      appendOperation(database, "transition_rejected", {
        sellerId,
        from,
        to,
        reason,
        connectionId,
      });
      return {
        ok: false,
        code: "INVALID_REASON",
        state: { ...state },
      };
    }
  }

  state.state = to;
  state.updated_at = nowIso();
  state.revision = (state.revision || 0) + 1;

  if (to === SELLER_STATES.RESERVED) {
    state.reserved_connection_id = connectionId;
    state.busy_connection_id = null;
    if (!Number.isFinite(state.reserved_until_ms)) {
      state.reserved_until_ms = null;
    }
  } else if (to === SELLER_STATES.BUSY) {
    state.busy_connection_id = connectionId;
    state.reserved_connection_id = null;
    state.reserved_until_ms = null;
  } else {
    state.busy_connection_id = null;
    state.reserved_connection_id = null;
    state.reserved_until_ms = null;
  }

  appendOperation(database, "transition_applied", { sellerId, from, to, reason, connectionId });
  return {
    ok: true,
    state: { ...state },
  };
}

function atomicReserveSeller(database, params) {
  const {
    sellerId,
    connectionId,
    ttlMs,
    maxReservedPerSeller = 1,
  } = params;

  const state = getSellerState(database, sellerId);
  const now = Date.now();

  if (state.state === SELLER_STATES.RESERVED && Number.isFinite(state.reserved_until_ms) && now >= state.reserved_until_ms) {
    // Expired reservation cleanup in-place before attempting reserve.
    transitionSellerState(database, {
      sellerId,
      to: SELLER_STATES.AVAILABLE,
      connectionId: state.reserved_connection_id,
      reason: "system",
    });
  }

  const refreshed = getSellerState(database, sellerId);

  const isAlreadyReserved = refreshed.state === SELLER_STATES.RESERVED;
  const isBusy = refreshed.state === SELLER_STATES.BUSY;
  const isOffline = refreshed.state === SELLER_STATES.OFFLINE;

  if (isAlreadyReserved || isBusy || isOffline) {
    appendOperation(database, "reserve_rejected", {
      sellerId,
      connectionId,
      reason: isAlreadyReserved ? "seller_reserved" : isBusy ? "seller_busy" : "seller_offline",
      current_state: refreshed.state,
    });
    logWarn("Reservation rejected", {
      sellerId,
      connectionId,
      currentState: refreshed.state,
    });
    return {
      ok: false,
      code: isAlreadyReserved ? "SELLER_RESERVED" : isBusy ? "SELLER_BUSY" : "SELLER_OFFLINE",
      state: { ...refreshed },
    };
  }

  const activeReservations = refreshed.state === SELLER_STATES.RESERVED ? 1 : 0;
  if (activeReservations >= maxReservedPerSeller) {
    appendOperation(database, "reserve_rejected", {
      sellerId,
      connectionId,
      reason: "seller_overloaded",
    });
    return {
      ok: false,
      code: "SELLER_OVERLOADED",
      state: { ...refreshed },
    };
  }

  const transitioned = transitionSellerState(database, {
    sellerId,
    to: SELLER_STATES.RESERVED,
    connectionId,
    reason: "system",
  });

  if (!transitioned.ok) {
    return transitioned;
  }

  const next = getSellerState(database, sellerId);
  next.reserved_until_ms = Date.now() + Math.max(1, Number(ttlMs) || 1);
  next.updated_at = nowIso();
  next.revision = (next.revision || 0) + 1;

  appendOperation(database, "reserve_applied", {
    sellerId,
    connectionId,
    reserved_until_ms: next.reserved_until_ms,
  });
  logInfo("Reservation success", {
    sellerId,
    connectionId,
    reservedUntilMs: next.reserved_until_ms,
  });

  return {
    ok: true,
    state: { ...next },
  };
}

function releaseExpiredReservations(database, nowMs = Date.now()) {
  const store = getStore(database);

  for (const [sellerId, state] of store.sellerStates.entries()) {
    if (state.state !== SELLER_STATES.RESERVED) continue;
    if (!Number.isFinite(state.reserved_until_ms)) continue;
    if (nowMs < state.reserved_until_ms) continue;

    const previousConnectionId = state.reserved_connection_id;
    const released = transitionSellerState(database, {
      sellerId,
      to: SELLER_STATES.AVAILABLE,
      connectionId: previousConnectionId,
      reason: "system",
    });

    if (released.ok) {
      appendOperation(database, "reservation_expired", {
        sellerId,
        connectionId: previousConnectionId,
      });
      logInfo("Reservation expired and released", {
        sellerId,
        connectionId: previousConnectionId,
      });
    }
  }
}

function getOperations(database) {
  const store = getStore(database);
  return [...store.operations];
}

module.exports = {
  SELLER_STATES,
  getSellerState,
  snapshotSellerState,
  transitionSellerState,
  atomicReserveSeller,
  releaseExpiredReservations,
  getOperations,
};
