/**
 * Follow Service — SQLite persistence layer
 * ──────────────────────────────────────────
 * Replaces in-memory Maps: followers, sellerStats, engagementEvents,
 * trustScoreLog, adBookmarks
 *
 * Every function uses explicit better-sqlite3 queries.
 * Function names match existing usage in followSellerService.js.
 */

"use strict";

const db = require("../appDb");

// ─── Prepared Statements ─────────────────────────────────────────────────────

const stmt = {
  // Followers
  getFollower:       db.prepare("SELECT data FROM followers WHERE key = ?"),
  hasFollower:       db.prepare("SELECT 1 FROM followers WHERE key = ? LIMIT 1"),
  insertFollower:    db.prepare("INSERT OR REPLACE INTO followers (key, follower_id, seller_id, data) VALUES (?, ?, ?, ?)"),
  deleteFollower:    db.prepare("DELETE FROM followers WHERE key = ?"),
  allFollowers:      db.prepare("SELECT data FROM followers"),
  followersByUser:   db.prepare("SELECT data FROM followers WHERE follower_id = ?"),
  followersBySeller: db.prepare("SELECT data FROM followers WHERE seller_id = ?"),

  // Seller Stats
  getSellerStats:    db.prepare("SELECT data FROM seller_stats WHERE seller_id = ?"),
  upsertSellerStats: db.prepare("INSERT OR REPLACE INTO seller_stats (seller_id, data) VALUES (?, ?)"),

  // Engagement Events
  getEngagement:       db.prepare("SELECT data FROM engagement_events WHERE key = ?"),
  hasEngagement:       db.prepare("SELECT 1 FROM engagement_events WHERE key = ? LIMIT 1"),
  insertEngagement:    db.prepare("INSERT OR REPLACE INTO engagement_events (key, ad_id, user_id, seller_id, event_type, event_date, data) VALUES (?, ?, ?, ?, ?, ?, ?)"),
  engagementsByAd:     db.prepare("SELECT data FROM engagement_events WHERE ad_id = ?"),
  engagementsByUser:   db.prepare("SELECT data FROM engagement_events WHERE user_id = ? AND seller_id = ?"),
  engagementsByUserSince: db.prepare("SELECT data FROM engagement_events WHERE user_id = ? AND seller_id = ? AND event_date >= ?"),
  allEngagements:      db.prepare("SELECT key, data FROM engagement_events"),

  // Trust Score Log
  insertTrustLog:    db.prepare("INSERT INTO trust_score_log (user_id, created_at, data) VALUES (?, ?, ?)"),
  trustLogByUser:    db.prepare("SELECT data FROM trust_score_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"),
  trustLogCount:     db.prepare("SELECT COUNT(*) AS cnt FROM trust_score_log"),

  // Ad Bookmarks
  getBookmark:       db.prepare("SELECT data FROM ad_bookmarks WHERE key = ?"),
  hasBookmark:       db.prepare("SELECT 1 FROM ad_bookmarks WHERE key = ? LIMIT 1"),
  insertBookmark:    db.prepare("INSERT OR REPLACE INTO ad_bookmarks (key, user_id, ad_id, data) VALUES (?, ?, ?, ?)"),
  deleteBookmark:    db.prepare("DELETE FROM ad_bookmarks WHERE key = ?"),
  bookmarksByUser:   db.prepare("SELECT data FROM ad_bookmarks WHERE user_id = ?"),
};

// ─── Followers ───────────────────────────────────────────────────────────────

const followers = {
  has(key) {
    return !!stmt.hasFollower.get(key);
  },

  get(key) {
    const row = stmt.getFollower.get(key);
    return row ? JSON.parse(row.data) : undefined;
  },

  set(key, value) {
    const followerId = value.follower_id || "";
    const sellerId = value.seller_id || "";
    stmt.insertFollower.run(key, followerId, sellerId, JSON.stringify(value));
  },

  delete(key) {
    stmt.deleteFollower.run(key);
  },

  entries() {
    const rows = stmt.allFollowers.all();
    return rows.map((r) => {
      const obj = JSON.parse(r.data);
      const key = `${obj.follower_id}:${obj.seller_id}`;
      return [key, obj];
    });
  },

  values() {
    const rows = stmt.allFollowers.all();
    return rows.map((r) => JSON.parse(r.data));
  },

  getByFollower(userId) {
    return stmt.followersByUser.all(userId).map((r) => JSON.parse(r.data));
  },

  getBySeller(sellerId) {
    return stmt.followersBySeller.all(sellerId).map((r) => JSON.parse(r.data));
  },
};

// ─── Seller Stats ────────────────────────────────────────────────────────────

const sellerStats = {
  has(sellerId) {
    return !!stmt.getSellerStats.get(sellerId);
  },

  get(sellerId) {
    const row = stmt.getSellerStats.get(sellerId);
    return row ? JSON.parse(row.data) : undefined;
  },

  set(sellerId, value) {
    stmt.upsertSellerStats.run(sellerId, JSON.stringify(value));
  },
};

// ─── Engagement Events ───────────────────────────────────────────────────────

const engagementEvents = {
  has(key) {
    return !!stmt.hasEngagement.get(key);
  },

  get(key) {
    const row = stmt.getEngagement.get(key);
    return row ? JSON.parse(row.data) : undefined;
  },

  set(key, value) {
    const adId = value.ad_id || "";
    const userId = value.user_id || "";
    const sellerId = value.seller_id || "";
    const eventType = value.event_type || "";
    const eventDate = value.event_date || "";
    stmt.insertEngagement.run(key, adId, userId, sellerId, eventType, eventDate, JSON.stringify(value));
  },

  entries() {
    const rows = stmt.allEngagements.all();
    return rows.map((r) => [r.key, JSON.parse(r.data)]);
  },

  getByAdId(adId) {
    return stmt.engagementsByAd.all(adId).map((r) => JSON.parse(r.data));
  },

  getByUserAndSeller(userId, sellerId) {
    return stmt.engagementsByUser.all(userId, sellerId).map((r) => JSON.parse(r.data));
  },

  getByUserAndSellerSince(userId, sellerId, sinceDate) {
    return stmt.engagementsByUserSince.all(userId, sellerId, sinceDate).map((r) => JSON.parse(r.data));
  },
};

// ─── Trust Score Log ─────────────────────────────────────────────────────────

const trustScoreLog = {
  push(entry) {
    const createdAt = entry.created_at || new Date().toISOString();
    const result = stmt.insertTrustLog.run(entry.user_id, createdAt, JSON.stringify(entry));
    entry.id = result.lastInsertRowid;
    return entry;
  },

  getByUser(userId, limit = 50) {
    return stmt.trustLogByUser.all(userId, limit).map((r) => JSON.parse(r.data));
  },

  get length() {
    return stmt.trustLogCount.get().cnt;
  },
};

// ─── Ad Bookmarks ────────────────────────────────────────────────────────────

const adBookmarks = {
  has(key) {
    return !!stmt.hasBookmark.get(key);
  },

  get(key) {
    const row = stmt.getBookmark.get(key);
    return row ? JSON.parse(row.data) : undefined;
  },

  set(key, value) {
    const userId = value.user_id || "";
    const adId = value.ad_id || "";
    stmt.insertBookmark.run(key, userId, adId, JSON.stringify(value));
  },

  delete(key) {
    stmt.deleteBookmark.run(key);
  },

  getByUser(userId) {
    return stmt.bookmarksByUser.all(userId).map((r) => JSON.parse(r.data));
  },
};

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  followers,
  sellerStats,
  engagementEvents,
  trustScoreLog,
  adBookmarks,
};
