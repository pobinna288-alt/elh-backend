/**
 * Persistent Storage Service
 * ──────────────────────────
 * Drop-in replacement for createRuntimeStore().
 *
 * Returns an object whose collection properties (users, ads, …) behave
 * exactly like plain JS arrays —  .push(), .find(), .filter(), .map(),
 * .findIndex(), bracket-index read/write, .length, Array.isArray(),
 * .splice(), .some(), spread, for…of — but every mutation is
 * transparently persisted to SQLite.
 *
 * HOW IT WORKS
 * ────────────
 * Each collection is a real Array wrapped in a Proxy.
 *   • On first access the array is hydrated from SQLite (lazy load).
 *   • .push()  → INSERT
 *   • bracket write  (arr[i] = obj)  → UPDATE
 *   • .splice() → DELETE + INSERT
 *   • Full-array reassignment (database.users = [...]) → REPLACE ALL
 *   • Property mutation on an element (arr[i].status = 'x') → UPDATE
 *     via a second-level Proxy on each row object.
 *
 * The approach guarantees zero changes needed in route / service files.
 */

"use strict";

const db = require("./appDb");

// ─── ID resolution ───────────────────────────────────────────────────────────

/**
 * Table config: maps collection name → { table, idField, indexCols }
 */
const TABLE_CONFIG = {
  users:                { table: "users",               idField: "id",    indexCols: { email: "email", phone: "phone" } },
  ads:                  { table: "ads",                 idField: "id",    indexCols: { user_id: "user_id" } },
  transactions:         { table: "transactions",        idField: "id",    indexCols: { user_id: "user_id" } },
  workspaces:           { table: "workspaces",          idField: "id",    indexCols: {} },
  notifications:        { table: "notifications",       idField: "id",    indexCols: { user_id: "user_id" } },
  enterprise_leads:    { table: "enterprise_leads",    idField: "id",    indexCols: { user_id: "user_id" } },
  enterprise_chats:     { table: "enterprise_chats",    idField: "id",    indexCols: { user_id: "user_id" } },
  enterprise_messages:  { table: "enterprise_messages",  idField: "id",    indexCols: { chat_id: "chat_id" } },
  tokenBlacklist:       { table: "token_blacklist",     idField: "token", indexCols: { user_id: "user_id" } },
  trustedDevices:       { table: "trusted_devices",     idField: "id",    indexCols: { user_id: "user_id", device_id: "device_id" } },
  otpRequests:          { table: "otp_requests",        idField: "id",    indexCols: {} },
  authBlocks:           { table: "auth_blocks",         idField: "id",    indexCols: {} },
  deviceFingerprints:   { table: "device_fingerprints", idField: "id",    indexCols: {} },
  authFraudSignals:     { table: "auth_fraud_signals",  idField: "id",    indexCols: {} },
  referrals:            { table: "referrals",           idField: "id",    indexCols: { referrer_id: "referrer_id", referee_id: "referee_id" } },
};

// ─── CamelCase → snake_case aliases (enterprise chat routes use camelCase) ───

const ALIAS_MAP = {
  enterpriseLeads:    "enterprise_leads",
  enterpriseChats:    "enterprise_chats",
  enterpriseMessages: "enterprise_messages",
};

// ─── Prepared statement cache ────────────────────────────────────────────────

const stmtCache = {};

function getStmts(collName) {
  if (stmtCache[collName]) return stmtCache[collName];

  const cfg = TABLE_CONFIG[collName];
  if (!cfg) return null;

  const { table, idField } = cfg;
  const indexColNames = Object.keys(cfg.indexCols);

  // Build column list for upsert (id + index cols + data)
  const allCols = [idField, ...indexColNames, "data"];
  const placeholders = allCols.map(() => "?").join(", ");

  stmtCache[collName] = {
    cfg,
    selectAll:  db.prepare(`SELECT data FROM ${table}`),
    upsert:     db.prepare(`INSERT OR REPLACE INTO ${table} (${allCols.join(", ")}) VALUES (${placeholders})`),
    deleteById: db.prepare(`DELETE FROM ${table} WHERE ${idField} = ?`),
    deleteAll:  db.prepare(`DELETE FROM ${table}`),
    count:      db.prepare(`SELECT COUNT(*) AS cnt FROM ${table}`),
  };

  return stmtCache[collName];
}

// ─── Row helpers ─────────────────────────────────────────────────────────────

function resolveId(obj, idField) {
  if (idField === "token") return obj.token || obj.id || null;
  return obj.id || obj._id || obj.user_id || null;
}

function upsertRow(collName, obj) {
  const s = getStmts(collName);
  if (!s) return;

  const { cfg } = s;
  const id = resolveId(obj, cfg.idField);
  if (id == null) return; // Can't persist without an ID

  const indexValues = Object.keys(cfg.indexCols).map((prop) => {
    const val = obj[prop];
    return val !== undefined && val !== null ? String(val) : null;
  });

  s.upsert.run(String(id), ...indexValues, JSON.stringify(obj));
}

function deleteRow(collName, obj) {
  const s = getStmts(collName);
  if (!s) return;

  const id = resolveId(obj, s.cfg.idField);
  if (id == null) return;
  s.deleteById.run(String(id));
}

function loadAll(collName) {
  const s = getStmts(collName);
  if (!s) return [];

  const rows = s.selectAll.all();
  return rows.map((r) => JSON.parse(r.data));
}

// ─── Row-level Proxy (detects property mutations on individual objects) ──────

function wrapRowProxy(obj, collName) {
  if (obj == null || typeof obj !== "object" || obj.__isRowProxy) return obj;

  return new Proxy(obj, {
    set(target, prop, value) {
      target[prop] = value;
      // Persist the updated object
      upsertRow(collName, target);
      return true;
    },
    get(target, prop) {
      if (prop === "__isRowProxy") return true;
      if (prop === "__rawTarget") return target;
      return target[prop];
    },
  });
}

// ─── Collection Proxy (array-level interception) ─────────────────────────────

function createCollectionProxy(collName) {
  // Hydrate from DB on creation
  const rawItems = loadAll(collName);
  const arr = rawItems.map((item) => wrapRowProxy(item, collName));

  const handler = {
    get(target, prop, receiver) {
      // Make Array.isArray() return true
      if (prop === Symbol.iterator) return target[Symbol.iterator].bind(target);

      // Intercept mutating methods
      if (prop === "push") {
        return function (...items) {
          const result = target.push(...items.map((item) => {
            upsertRow(collName, item);
            return wrapRowProxy(item, collName);
          }));
          return result;
        };
      }

      if (prop === "splice") {
        return function (start, deleteCount, ...newItems) {
          // Delete removed elements from DB
          const toRemove = target.slice(start, start + deleteCount);
          toRemove.forEach((item) => {
            const raw = item?.__rawTarget || item;
            deleteRow(collName, raw);
          });

          // Insert new elements
          const wrapped = newItems.map((item) => {
            upsertRow(collName, item);
            return wrapRowProxy(item, collName);
          });

          return target.splice(start, deleteCount, ...wrapped);
        };
      }

      if (prop === "pop") {
        return function () {
          const item = target.pop();
          if (item) {
            const raw = item?.__rawTarget || item;
            deleteRow(collName, raw);
          }
          return item;
        };
      }

      if (prop === "shift") {
        return function () {
          const item = target.shift();
          if (item) {
            const raw = item?.__rawTarget || item;
            deleteRow(collName, raw);
          }
          return item;
        };
      }

      if (prop === "unshift") {
        return function (...items) {
          const wrapped = items.map((item) => {
            upsertRow(collName, item);
            return wrapRowProxy(item, collName);
          });
          return target.unshift(...wrapped);
        };
      }

      // Return value from underlying array
      const value = Reflect.get(target, prop, receiver);

      // Wrap returned row objects so property mutations persist
      if (typeof prop === "string" && /^\d+$/.test(prop) && value && typeof value === "object") {
        if (!value.__isRowProxy) {
          const wrapped = wrapRowProxy(value, collName);
          target[prop] = wrapped;
          return wrapped;
        }
      }

      return value;
    },

    set(target, prop, value) {
      if (typeof prop === "string" && /^\d+$/.test(prop)) {
        // arr[i] = newObj  → UPDATE in DB
        const wrapped = wrapRowProxy(value, collName);
        target[prop] = wrapped;
        upsertRow(collName, value);
        return true;
      }

      // length or other properties
      target[prop] = value;
      return true;
    },
  };

  return new Proxy(arr, handler);
}

// ─── Store-level Proxy (intercepts full-array reassignment) ──────────────────

/**
 * Create the persistent store.
 * Usage:  const store = createPersistentStore();
 *         app.set("database", store);
 *
 * Then `database.users`, `database.ads`, etc. all work exactly like before
 * but are backed by SQLite.
 */
function createPersistentStore() {
  const collections = {};

  // Eagerly create known collections
  for (const collName of Object.keys(TABLE_CONFIG)) {
    collections[collName] = createCollectionProxy(collName);
  }

  return new Proxy(collections, {
    get(target, prop) {
      // Resolve camelCase alias to snake_case collection
      const resolved = ALIAS_MAP[prop] || prop;
      if (resolved in target) return target[resolved];

      // Fall back to regular property access
      return target[prop];
    },

    set(target, prop, value) {
      // Resolve camelCase alias
      const resolved = ALIAS_MAP[prop] || prop;

      // Handle full-array reassignment:  database.users = filteredArray
      if (resolved in TABLE_CONFIG && Array.isArray(value)) {
        const s = getStmts(resolved);
        if (s) {
          // Wrap in transaction for atomicity
          const replaceAll = db.transaction(() => {
            s.deleteAll.run();
            for (const item of value) {
              upsertRow(resolved, item);
            }
          });
          replaceAll();

          // Rebuild proxy
          target[resolved] = createCollectionProxy(resolved);
          return true;
        }
      }

      // For unknown properties or non-array assignments, just set normally
      target[resolved] = value;
      return true;
    },
  });
}

module.exports = { createPersistentStore };
