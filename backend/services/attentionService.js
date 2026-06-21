/**
 * Attention Service — SQLite persistence layer
 * ─────────────────────────────────────────────
 * Replaces in-memory Maps: attentionEvents, attentionScores, sessionEventTracker
 * from attentionScoreService.js
 */

"use strict";

const db = require("../appDb");

// ─── Prepared Statements ─────────────────────────────────────────────────────

const stmt = {
  // Attention Events
  insertEvent:       db.prepare("INSERT OR REPLACE INTO attention_events (id, ad_id, user_id, session_id, event_type, data) VALUES (?, ?, ?, ?, ?, ?)"),
  getEventById:      db.prepare("SELECT data FROM attention_events WHERE id = ?"),
  getEventsByAd:     db.prepare("SELECT data FROM attention_events WHERE ad_id = ?"),
  getEventsByAdAndType: db.prepare("SELECT data FROM attention_events WHERE ad_id = ? AND event_type = ?"),
  getEventsByAdAndUser: db.prepare("SELECT data FROM attention_events WHERE ad_id = ? AND user_id = ?"),
  getEventsByAdUserSession: db.prepare("SELECT data FROM attention_events WHERE ad_id = ? AND user_id = ? AND session_id != ?"),
  allEvents:         db.prepare("SELECT id, data FROM attention_events"),
  countEvents:       db.prepare("SELECT COUNT(*) AS cnt FROM attention_events"),

  // Session Event Tracker
  getSession:        db.prepare("SELECT events FROM session_event_tracker WHERE session_key = ?"),
  upsertSession:     db.prepare("INSERT OR REPLACE INTO session_event_tracker (session_key, events) VALUES (?, ?)"),
};

// ─── Attention Events (replaces Map<eventId, event>) ─────────────────────────

const attentionEvents = {
  set(id, event) {
    stmt.insertEvent.run(
      id,
      event.ad_id || "",
      event.user_id || "",
      event.session_id || "",
      event.event_type || "",
      JSON.stringify(event)
    );
  },

  get(id) {
    const row = stmt.getEventById.get(id);
    return row ? JSON.parse(row.data) : undefined;
  },

  values() {
    const rows = stmt.allEvents.all();
    return rows.map((r) => JSON.parse(r.data));
  },

  get size() {
    return stmt.countEvents.get().cnt;
  },

  getByAd(adId) {
    return stmt.getEventsByAd.all(adId).map((r) => JSON.parse(r.data));
  },

  getByAdAndType(adId, eventType) {
    return stmt.getEventsByAdAndType.all(adId, eventType).map((r) => JSON.parse(r.data));
  },

  getByAdAndUser(adId, userId) {
    return stmt.getEventsByAdAndUser.all(adId, userId).map((r) => JSON.parse(r.data));
  },

  hasPreviousView(adId, userId, currentSessionId) {
    const rows = stmt.getEventsByAdUserSession.all(adId, userId, currentSessionId);
    return rows.some((r) => {
      const ev = JSON.parse(r.data);
      return ev.event_type === "ad_seen";
    });
  },
};

// ─── Attention Scores (computed on-the-fly from events, no separate Map) ─────
// attentionScores were just a cache. We compute from events instead.

// ─── Session Event Tracker (replaces Map<sessionKey, Set<eventType>>) ────────

const sessionEventTracker = {
  get(sessionKey) {
    const row = stmt.getSession.get(sessionKey);
    if (!row) return null;
    const arr = JSON.parse(row.events);
    return new Set(arr);
  },

  has(sessionKey) {
    return !!stmt.getSession.get(sessionKey);
  },

  set(sessionKey, eventSet) {
    const arr = Array.from(eventSet);
    stmt.upsertSession.run(sessionKey, JSON.stringify(arr));
  },

  addEvent(sessionKey, eventType) {
    const existing = this.get(sessionKey) || new Set();
    existing.add(eventType);
    this.set(sessionKey, existing);
  },
};

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  attentionEvents,
  sessionEventTracker,
};
