/**
 * Email OTP Store
 * SQLite-backed persistence for email-based OTP authentication.
 *
 * Tables
 * ──────
 *   email_auth_users  – one row per email address, UNIQUE constraint enforced
 *   email_otp_records – hashed OTP codes with expiry and attempt tracking
 *   email_auth_blocks – temporary rate-limit / abuse blocks
 *
 * OTPs are NEVER stored in plain text. Callers must hash before insert.
 */

"use strict";

const fs       = require("fs");
const path     = require("path");
const crypto   = require("crypto");
const Database = require("better-sqlite3");
const { v4: uuidv4 } = require("uuid");

const DEFAULT_DB_PATH =
  process.env.EMAIL_OTP_DB_PATH ||
  path.join(process.cwd(), "data", "email-otp.sqlite");

let singleton = null;

// ─── helpers ──────────────────────────────────────────────────────────────────

const toIso = (value = Date.now()) => {
  const d =
    value instanceof Date
      ? value
      : new Date(typeof value === "number" ? value : Date.parse(value));
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

// ─── factory ──────────────────────────────────────────────────────────────────

const createEmailOtpStore = () => {
  const dbPath = path.resolve(DEFAULT_DB_PATH);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");

  db.exec(`
    -- ── Users ──────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS email_auth_users (
      id        TEXT PRIMARY KEY,
      email     TEXT NOT NULL,
      phone     TEXT,
      plan      TEXT NOT NULL DEFAULT 'FREE',
      status    TEXT NOT NULL DEFAULT 'PENDING',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS ux_email_auth_users_email
      ON email_auth_users (email);

    -- ── OTP records ────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS email_otp_records (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL,
      otpHash       TEXT NOT NULL,
      expiresAt     TEXT NOT NULL,
      attempts      INTEGER NOT NULL DEFAULT 0,
      usedAt        TEXT,
      invalidatedAt TEXT,
      ipAddress     TEXT,
      createdAt     TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_email_otp_email_created
      ON email_otp_records (email, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_email_otp_ip_created
      ON email_otp_records (ipAddress, createdAt DESC);

    -- ── Temporary blocks ───────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS email_auth_blocks (
      id           TEXT PRIMARY KEY,
      scope        TEXT NOT NULL,
      blockKey     TEXT NOT NULL,
      reason       TEXT NOT NULL,
      blockedUntil TEXT NOT NULL,
      createdAt    TEXT NOT NULL,
      UNIQUE (scope, blockKey)
    );
  `);

  // ── Prepared statements ──────────────────────────────────────────────────

  const s = {
    // Users
    findByEmail: db.prepare(
      "SELECT * FROM email_auth_users WHERE email = ? LIMIT 1"
    ),
    findById: db.prepare(
      "SELECT * FROM email_auth_users WHERE id = ? LIMIT 1"
    ),
    insertUserIfAbsent: db.prepare(`
      INSERT OR IGNORE INTO email_auth_users
        (id, email, phone, plan, status, createdAt, updatedAt)
      VALUES
        (@id, @email, @phone, @plan, @status, @createdAt, @updatedAt)
    `),
    activateUser: db.prepare(`
      UPDATE email_auth_users
      SET    status = 'ACTIVE', updatedAt = @updatedAt
      WHERE  email  = @email
    `),

    // OTP records
    invalidatePriorOtps: db.prepare(`
      UPDATE email_otp_records
      SET    invalidatedAt = COALESCE(invalidatedAt, @invalidatedAt)
      WHERE  email         = @email
        AND  usedAt        IS NULL
        AND  invalidatedAt IS NULL
    `),
    insertOtp: db.prepare(`
      INSERT INTO email_otp_records
        (id, email, otpHash, expiresAt, attempts, ipAddress, createdAt)
      VALUES
        (@id, @email, @otpHash, @expiresAt, 0, @ipAddress, @createdAt)
    `),
    findActiveOtpByEmail: db.prepare(`
      SELECT * FROM email_otp_records
      WHERE  email         = ?
        AND  usedAt        IS NULL
        AND  invalidatedAt IS NULL
      ORDER BY createdAt DESC
      LIMIT  1
    `),
    findOtpById: db.prepare(
      "SELECT * FROM email_otp_records WHERE id = ? LIMIT 1"
    ),
    incrementAttempts: db.prepare(
      "UPDATE email_otp_records SET attempts = attempts + 1 WHERE id = ?"
    ),
    markOtpUsed: db.prepare(`
      UPDATE email_otp_records
      SET    usedAt = @usedAt
      WHERE  id            = @id
        AND  usedAt        IS NULL
        AND  invalidatedAt IS NULL
        AND  expiresAt     > @now
    `),
    deleteOtp: db.prepare(
      "DELETE FROM email_otp_records WHERE id = ?"
    ),

    invalidateOtpById: db.prepare(`
      UPDATE email_otp_records
      SET    invalidatedAt = COALESCE(invalidatedAt, @invalidatedAt)
      WHERE  id = @id
    `),

    // Rate-limit counters
    countEmailOtpsSince: db.prepare(`
      SELECT COUNT(*) AS total
      FROM   email_otp_records
      WHERE  email     = @email
        AND  createdAt >= @cutoff
    `),
    countIpOtpsSince: db.prepare(`
      SELECT COUNT(*) AS total
      FROM   email_otp_records
      WHERE  ipAddress = @ipAddress
        AND  createdAt >= @cutoff
    `),

    // Blocks
    upsertBlock: db.prepare(`
      INSERT INTO email_auth_blocks
        (id, scope, blockKey, reason, blockedUntil, createdAt)
      VALUES
        (@id, @scope, @blockKey, @reason, @blockedUntil, @createdAt)
      ON CONFLICT(scope, blockKey) DO UPDATE SET
        reason       = excluded.reason,
        blockedUntil = excluded.blockedUntil,
        createdAt    = excluded.createdAt
    `),
    findActiveBlock: db.prepare(`
      SELECT * FROM email_auth_blocks
      WHERE  scope    = @scope
        AND  blockKey = @blockKey
        AND  blockedUntil > @now
      LIMIT  1
    `),

    // Cleanup
    purgeExpiredBlocks: db.prepare(
      "DELETE FROM email_auth_blocks WHERE blockedUntil <= @now"
    ),
    purgeStaleOtps: db.prepare(`
      DELETE FROM email_otp_records
      WHERE  expiresAt < @cutoff
        AND  (usedAt IS NOT NULL OR invalidatedAt IS NOT NULL)
    `),
  };

  // ── Transactions ─────────────────────────────────────────────────────────

  /** Atomically invalidate prior active OTPs then insert the new one. */
  const createOtpTx = db.transaction(({ id, email, otpHash, expiresAt, ipAddress }) => {
    const now = toIso();
    s.invalidatePriorOtps.run({ email, invalidatedAt: now });
    s.insertOtp.run({ id, email, otpHash, expiresAt, ipAddress: ipAddress || null, createdAt: now });
  });

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    enabled: true,
    dbPath,

    // ── User management ────────────────────────────────────────────────────

    findUserByEmail(email) {
      return s.findByEmail.get(email) || null;
    },

    findUserById(id) {
      return s.findById.get(id) || null;
    },

    /**
     * Insert a PENDING user row keyed by email.
     * INSERT OR IGNORE: if the email already exists the existing row is returned.
     * Returns { inserted: bool, user: row }.
     */
    createPendingUser({ id, email, phone = null }) {
      const now = toIso();
      const result = s.insertUserIfAbsent.run({
        id,
        email,
        phone,
        plan: "FREE",
        status: "PENDING",
        createdAt: now,
        updatedAt: now,
      });
      return {
        inserted: result.changes === 1,
        user: s.findByEmail.get(email),
      };
    },

    /**
     * Promote a user's status to ACTIVE.
     * Returns { updated: bool, user: row }.
     */
    activateUser(email) {
      const result = s.activateUser.run({ email, updatedAt: toIso() });
      return {
        updated: result.changes > 0,
        user: s.findByEmail.get(email),
      };
    },

    // ── OTP management ─────────────────────────────────────────────────────

    /**
     * Persist a new OTP record.
     * All pre-existing active OTPs for the same email are invalidated first.
     * `otpHash` must already be SHA-256 HMAC hex – plain OTPs are never accepted here.
     */
    createOtpRecord({ id, email, otpHash, expiresAt, ipAddress }) {
      createOtpTx({ id, email, otpHash, expiresAt, ipAddress });
      return s.findOtpById.get(id) || null;
    },

    findActiveOtpByEmail(email) {
      return s.findActiveOtpByEmail.get(email) || null;
    },

    findOtpById(id) {
      return s.findOtpById.get(id) || null;
    },

    /**
     * Increment the attempt counter on an OTP record.
     * Returns the updated record.
     */
    incrementAttempts(id) {
      s.incrementAttempts.run(id);
      return s.findOtpById.get(id) || null;
    },

    /**
     * Atomically mark an OTP as used.
     * Fails (returns { updated: false }) if it was already used, invalidated,
     * or has expired.
     */
    markOtpUsed(id) {
      const now = toIso();
      const result = s.markOtpUsed.run({ id, usedAt: now, now });
      return { updated: result.changes === 1 };
    },

    /** Hard-delete an OTP record (called after successful verification). */
    deleteOtpRecord(id) {
      s.deleteOtp.run(id);
    },

    /**
     * Invalidate a specific OTP record without deleting it.
     * Used when email delivery fails so the record still counts toward
     * rate limits but cannot be submitted for verification.
     */
    invalidateOtpById(id) {
      s.invalidateOtpById.run({ id, invalidatedAt: toIso() });
    },

    // ── Rate-limit helpers ──────────────────────────────────────────────────

    countEmailOtpsSince(email, cutoffMs) {
      const row = s.countEmailOtpsSince.get({ email, cutoff: toIso(cutoffMs) });
      return Number(row?.total || 0);
    },

    countIpOtpsSince(ipAddress, cutoffMs) {
      if (!ipAddress) return 0;
      const row = s.countIpOtpsSince.get({ ipAddress, cutoff: toIso(cutoffMs) });
      return Number(row?.total || 0);
    },

    // ── Block management ───────────────────────────────────────────────────

    /**
     * Create or renew a temporary block.
     * @param {string} scope   – "email" | "ip"
     * @param {string} key     – email address or IP string
     * @param {string} reason  – human-readable reason slug
     * @param {number} minutes – block duration
     */
    createBlock({ scope, key, reason, minutes }) {
      const blockedUntil = toIso(Date.now() + minutes * 60 * 1000);
      s.upsertBlock.run({
        id: uuidv4(),
        scope,
        blockKey: key,
        reason,
        blockedUntil,
        createdAt: toIso(),
      });
      return { blockedUntil };
    },

    /** Returns the active block row or null. */
    findActiveBlock(scope, key) {
      return s.findActiveBlock.get({ scope, blockKey: key, now: toIso() }) || null;
    },

    // ── Maintenance ────────────────────────────────────────────────────────

    /** Purge expired blocks and stale OTP records older than 24 h. */
    cleanup() {
      s.purgeExpiredBlocks.run({ now: toIso() });
      s.purgeStaleOtps.run({ cutoff: toIso(Date.now() - 24 * 60 * 60 * 1000) });
    },
  };
};

// ─── singleton ────────────────────────────────────────────────────────────────

const getEmailOtpStore = () => {
  if (!singleton) singleton = createEmailOtpStore();
  return singleton;
};

module.exports = { getEmailOtpStore };
