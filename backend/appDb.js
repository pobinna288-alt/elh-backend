/**
 * Unified SQLite Database — Core Tables
 * ──────────────────────────────────────
 * Single app.db file for persistent storage of:
 *   users, ads, transactions, workspaces, notifications,
 *   enterprise_chats, enterprise_messages, token_blacklist,
 *   trusted_devices, otp_requests, auth_blocks,
 *   device_fingerprints, auth_fraud_signals
 *
 * Every row stores its full object as a JSON blob so existing
 * code that treats records as plain JS objects keeps working.
 * Indexed columns are extracted for fast lookups.
 */

"use strict";

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DB_DIR, "app.db");

// Ensure data directory exists
fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);

// Performance pragmas
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");
db.pragma("foreign_keys = ON");
db.pragma("synchronous = NORMAL");

// ─── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
  -- ── Users ─────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS users (
    id   TEXT PRIMARY KEY,
    email TEXT,
    phone TEXT,
    data TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

  -- ── Ads ───────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS ads (
    id   TEXT PRIMARY KEY,
    user_id TEXT,
    data TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_ads_user_id ON ads(user_id);

  -- ── Transactions ──────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS transactions (
    id   TEXT PRIMARY KEY,
    user_id TEXT,
    data TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

  -- ── Workspaces ────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS workspaces (
    id   TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}'
  );

  -- ── Notifications ─────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS notifications (
    id   TEXT PRIMARY KEY,
    user_id TEXT,
    data TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

  -- ── Enterprise Chats ──────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS enterprise_chats (
    id   TEXT PRIMARY KEY,
    user_id TEXT,
    data TEXT NOT NULL DEFAULT '{}'
  );

  -- ── Enterprise Messages ───────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS enterprise_messages (
    id   TEXT PRIMARY KEY,
    chat_id TEXT,
    data TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_enterprise_messages_chat ON enterprise_messages(chat_id);

  -- ── Token Blacklist ───────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS token_blacklist (
    token TEXT PRIMARY KEY,
    user_id TEXT,
    data TEXT NOT NULL DEFAULT '{}'
  );

  -- ── Trusted Devices ───────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS trusted_devices (
    id   TEXT PRIMARY KEY,
    user_id TEXT,
    device_id TEXT,
    data TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id);
  CREATE INDEX IF NOT EXISTS idx_trusted_devices_device ON trusted_devices(device_id);

  -- ── OTP Requests ──────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS otp_requests (
    id   TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}'
  );

  -- ── Auth Blocks ───────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS auth_blocks (
    id   TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}'
  );

  -- ── Device Fingerprints ───────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS device_fingerprints (
    id   TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}'
  );

  -- ── Auth Fraud Signals ────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS auth_fraud_signals (
    id   TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}'
  );
`);

module.exports = db;
