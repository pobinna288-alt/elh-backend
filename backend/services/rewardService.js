/**
 * Reward Service — SQLite persistence layer
 * ──────────────────────────────────────────
 * Replaces in-memory Maps: publishedAds, viewerAdRewards,
 * dailyCoinEarnings, watchSessions, pendingVideos
 * from coinRewardService.js
 */

"use strict";

const db = require("../appDb");

// ─── Prepared Statements ─────────────────────────────────────────────────────

const stmt = {
  // Published Ads
  getAd:         db.prepare("SELECT data FROM published_ads WHERE ad_id = ?"),
  upsertAd:      db.prepare("INSERT OR REPLACE INTO published_ads (ad_id, user_id, data) VALUES (?, ?, ?)"),
  allActiveAds:  db.prepare("SELECT data FROM published_ads"),
  adsByUser:     db.prepare("SELECT data FROM published_ads WHERE user_id = ?"),

  // Viewer Ad Rewards
  getReward:     db.prepare("SELECT data FROM viewer_ad_rewards WHERE key = ?"),
  hasReward:     db.prepare("SELECT 1 FROM viewer_ad_rewards WHERE key = ? LIMIT 1"),
  insertReward:  db.prepare("INSERT OR REPLACE INTO viewer_ad_rewards (key, viewer_id, ad_id, data) VALUES (?, ?, ?, ?)"),

  // Daily Coin Earnings
  getDailyEarnings: db.prepare("SELECT total FROM daily_coin_earnings WHERE key = ?"),
  upsertDailyEarnings: db.prepare("INSERT OR REPLACE INTO daily_coin_earnings (key, viewer_id, date, total) VALUES (?, ?, ?, ?)"),

  // Watch Sessions
  getSession:    db.prepare("SELECT data FROM watch_sessions WHERE session_id = ?"),
  upsertSession: db.prepare("INSERT OR REPLACE INTO watch_sessions (session_id, viewer_id, ad_id, status, data) VALUES (?, ?, ?, ?, ?)"),
  sessionsByViewer: db.prepare("SELECT data FROM watch_sessions WHERE viewer_id = ?"),
  allSessions:   db.prepare("SELECT data FROM watch_sessions"),

  // Pending Videos
  getVideo:      db.prepare("SELECT data FROM pending_videos WHERE video_id = ?"),
  upsertVideo:   db.prepare("INSERT OR REPLACE INTO pending_videos (video_id, user_id, status, data) VALUES (?, ?, ?, ?)"),
};

// ─── Published Ads ───────────────────────────────────────────────────────────

const publishedAds = {
  get(adId) {
    const row = stmt.getAd.get(adId);
    return row ? JSON.parse(row.data) : undefined;
  },

  set(adId, value) {
    const userId = value.user_id || "";
    stmt.upsertAd.run(adId, userId, JSON.stringify(value));
  },

  has(adId) {
    return !!stmt.getAd.get(adId);
  },

  values() {
    return stmt.allActiveAds.all().map((r) => JSON.parse(r.data));
  },

  getByUser(userId) {
    return stmt.adsByUser.all(userId).map((r) => JSON.parse(r.data));
  },
};

// ─── Viewer Ad Rewards ───────────────────────────────────────────────────────

const viewerAdRewards = {
  has(key) {
    return !!stmt.hasReward.get(key);
  },

  get(key) {
    const row = stmt.getReward.get(key);
    return row ? JSON.parse(row.data) : undefined;
  },

  set(key, value) {
    const parts = key.split(":");
    const viewerId = parts[0] || "";
    const adId = parts[1] || "";
    stmt.insertReward.run(key, viewerId, adId, JSON.stringify(value));
  },
};

// ─── Daily Coin Earnings ─────────────────────────────────────────────────────

const dailyCoinEarnings = {
  get(key) {
    const row = stmt.getDailyEarnings.get(key);
    return row ? row.total : 0;
  },

  set(key, total) {
    const parts = key.split(":");
    const viewerId = parts[0] || "";
    const date = parts[1] || "";
    stmt.upsertDailyEarnings.run(key, viewerId, date, total);
  },

  has(key) {
    return !!stmt.getDailyEarnings.get(key);
  },
};

// ─── Watch Sessions ──────────────────────────────────────────────────────────

const watchSessions = {
  get(sessionId) {
    const row = stmt.getSession.get(sessionId);
    if (!row) return undefined;
    const obj = JSON.parse(row.data);
    // Restore Date objects
    if (obj.watch_start) obj.watch_start = new Date(obj.watch_start);
    if (obj.watch_end) obj.watch_end = new Date(obj.watch_end);
    if (obj.last_heartbeat) obj.last_heartbeat = new Date(obj.last_heartbeat);
    return obj;
  },

  set(sessionId, value) {
    const viewerId = value.viewer_id || "";
    const adId = value.ad_id || "";
    const status = value.status || "active";
    stmt.upsertSession.run(sessionId, viewerId, adId, status, JSON.stringify(value));
  },

  has(sessionId) {
    return !!stmt.getSession.get(sessionId);
  },

  values() {
    return stmt.allSessions.all().map((r) => {
      const obj = JSON.parse(r.data);
      if (obj.watch_start) obj.watch_start = new Date(obj.watch_start);
      if (obj.watch_end) obj.watch_end = new Date(obj.watch_end);
      if (obj.last_heartbeat) obj.last_heartbeat = new Date(obj.last_heartbeat);
      return obj;
    });
  },

  getByViewer(viewerId) {
    return stmt.sessionsByViewer.all(viewerId).map((r) => {
      const obj = JSON.parse(r.data);
      if (obj.watch_start) obj.watch_start = new Date(obj.watch_start);
      if (obj.watch_end) obj.watch_end = new Date(obj.watch_end);
      if (obj.last_heartbeat) obj.last_heartbeat = new Date(obj.last_heartbeat);
      return obj;
    });
  },
};

// ─── Pending Videos ──────────────────────────────────────────────────────────

const pendingVideos = {
  get(videoId) {
    const row = stmt.getVideo.get(videoId);
    return row ? JSON.parse(row.data) : undefined;
  },

  set(videoId, value) {
    const userId = value.user_id || "";
    const status = value.status || "pending";
    stmt.upsertVideo.run(videoId, userId, status, JSON.stringify(value));
  },

  has(videoId) {
    return !!stmt.getVideo.get(videoId);
  },
};

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  publishedAds,
  viewerAdRewards,
  dailyCoinEarnings,
  watchSessions,
  pendingVideos,
};
