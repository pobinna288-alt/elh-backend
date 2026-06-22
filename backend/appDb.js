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

  -- ── Enterprise Leads ──────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS enterprise_leads (
    id   TEXT PRIMARY KEY,
    user_id TEXT,
    data TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_enterprise_leads_user ON enterprise_leads(user_id);

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

  -- ── Referrals ────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS referrals (
    id   TEXT PRIMARY KEY,
    referrer_id TEXT,
    referee_id TEXT,
    data TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
  CREATE INDEX IF NOT EXISTS idx_referrals_referee  ON referrals(referee_id);

  -- ══════════════════════════════════════════════════════════════════════════
  -- PHASE 2: Follow / Engagement / Bookmarks
  -- ══════════════════════════════════════════════════════════════════════════

  -- ── Followers ─────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS followers (
    key          TEXT PRIMARY KEY,
    follower_id  TEXT NOT NULL,
    seller_id    TEXT NOT NULL,
    data         TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_followers_follower ON followers(follower_id);
  CREATE INDEX IF NOT EXISTS idx_followers_seller   ON followers(seller_id);

  -- ── Seller Stats ──────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS seller_stats (
    seller_id TEXT PRIMARY KEY,
    data      TEXT NOT NULL DEFAULT '{}'
  );

  -- ── Engagement Events ─────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS engagement_events (
    key        TEXT PRIMARY KEY,
    ad_id      TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    seller_id  TEXT,
    event_type TEXT NOT NULL,
    event_date TEXT,
    data       TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_engagement_ad      ON engagement_events(ad_id);
  CREATE INDEX IF NOT EXISTS idx_engagement_user    ON engagement_events(user_id);
  CREATE INDEX IF NOT EXISTS idx_engagement_seller  ON engagement_events(seller_id);

  -- ── Trust Score Log ───────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS trust_score_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL,
    created_at TEXT NOT NULL,
    data       TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_trust_log_user ON trust_score_log(user_id, created_at DESC);

  -- ── Ad Bookmarks ──────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS ad_bookmarks (
    key     TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    ad_id   TEXT NOT NULL,
    data    TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON ad_bookmarks(user_id);
  CREATE INDEX IF NOT EXISTS idx_bookmarks_ad   ON ad_bookmarks(ad_id);

  -- ══════════════════════════════════════════════════════════════════════════
  -- PHASE 3: Attention Score / Coin Rewards
  -- ══════════════════════════════════════════════════════════════════════════

  -- ── Attention Events ──────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS attention_events (
    id         TEXT PRIMARY KEY,
    ad_id      TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    session_id TEXT,
    event_type TEXT NOT NULL,
    data       TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_attn_events_ad      ON attention_events(ad_id);
  CREATE INDEX IF NOT EXISTS idx_attn_events_user    ON attention_events(user_id);
  CREATE INDEX IF NOT EXISTS idx_attn_events_session ON attention_events(session_id);

  -- ── Session Event Tracker ─────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS session_event_tracker (
    session_key TEXT PRIMARY KEY,
    events      TEXT NOT NULL DEFAULT '[]'
  );

  -- ── Published Ads (Coin System) ───────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS published_ads (
    ad_id   TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    data    TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_published_ads_user ON published_ads(user_id);

  -- ── Viewer Ad Rewards ─────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS viewer_ad_rewards (
    key       TEXT PRIMARY KEY,
    viewer_id TEXT NOT NULL,
    ad_id     TEXT NOT NULL,
    data      TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_viewer_rewards_viewer ON viewer_ad_rewards(viewer_id);

  -- ── Daily Coin Earnings ───────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS daily_coin_earnings (
    key     TEXT PRIMARY KEY,
    viewer_id TEXT NOT NULL,
    date    TEXT NOT NULL,
    total   INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_daily_coins_viewer ON daily_coin_earnings(viewer_id);

  -- ── Watch Sessions ────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS watch_sessions (
    session_id TEXT PRIMARY KEY,
    viewer_id  TEXT NOT NULL,
    ad_id      TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'active',
    data       TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_watch_sessions_viewer ON watch_sessions(viewer_id);
  CREATE INDEX IF NOT EXISTS idx_watch_sessions_ad     ON watch_sessions(ad_id);

  -- ── Pending Videos ────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS pending_videos (
    video_id TEXT PRIMARY KEY,
    user_id  TEXT NOT NULL,
    status   TEXT NOT NULL DEFAULT 'pending',
    data     TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_pending_videos_user ON pending_videos(user_id);
`);

module.exports = db;
