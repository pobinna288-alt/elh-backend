# El Hannora - Attention Score System

## Overview

The **Attention Score** measures how much attention users give to an ad, based on user engagement signals. Ads with higher attention scores rank higher in feeds and search results.

## Core Signals

| Signal | Event Type | Trigger Condition | Attention Weight |
|--------|------------|-------------------|------------------|
| **Ad Seen** | `ad_seen` | Ad becomes visible in viewport | 1 (low) |
| **Scroll Stop** | `scroll_stop` | User stops scrolling on ad for 2+ seconds | 3 (medium) |
| **Repeated View** | `repeated_view` | User views same ad in different session | 5 (high) |

## Attention Score Formula

```
attention_score = (seen_count × 1) + (scroll_stop_count × 3) + (repeated_view_count × 5)
```

### Example Calculation

| Metric | Count | Weight | Contribution |
|--------|-------|--------|--------------|
| seen_count | 200 | ×1 | 200 |
| scroll_stop_count | 40 | ×3 | 120 |
| repeated_view_count | 10 | ×5 | 50 |
| **Total** | | | **370** |

---

## Database Schema

### ad_attention_events

Stores individual attention events.

```sql
CREATE TABLE ad_attention_events (
    id UUID PRIMARY KEY,
    ad_id UUID NOT NULL,
    user_id UUID NOT NULL,
    event_type VARCHAR(20) NOT NULL,  -- ad_seen, scroll_stop, repeated_view
    session_id VARCHAR(100) NOT NULL,
    device_type VARCHAR(20),          -- mobile, tablet, desktop
    viewport_time_ms INTEGER,
    created_at TIMESTAMP
);
```

### ad_attention_scores

Stores aggregated attention metrics per ad.

```sql
CREATE TABLE ad_attention_scores (
    ad_id UUID PRIMARY KEY,
    seen_count INTEGER DEFAULT 0,
    scroll_stop_count INTEGER DEFAULT 0,
    repeated_view_count INTEGER DEFAULT 0,
    attention_score INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,
    total_viewport_time_ms BIGINT DEFAULT 0,
    last_updated TIMESTAMP
);
```

---

## API Endpoints

### Log Attention Event

**POST** `/api/ads/attention-event`

Log a single attention event.

**Request:**
```json
{
  "ad_id": "ad_1920",
  "user_id": "user_103",
  "event_type": "scroll_stop",
  "session_id": "sess_821",
  "device_type": "mobile",
  "viewport_time_ms": 3500
}
```

**Response (201):**
```json
{
  "success": true,
  "event_id": "evt_1234567890_abc123",
  "event_type": "scroll_stop",
  "ad_id": "ad_1920",
  "message": "Event logged successfully"
}
```

**Response (ignored due to spam prevention):**
```json
{
  "success": true,
  "ignored": true,
  "reason": "scroll_stop already recorded for this session"
}
```

---

### Batch Log Events

**POST** `/api/ads/attention-event/batch`

Log multiple attention events at once (max 100).

**Request:**
```json
{
  "events": [
    { "ad_id": "ad_1", "user_id": "user_1", "event_type": "ad_seen", "session_id": "sess_1" },
    { "ad_id": "ad_2", "user_id": "user_1", "event_type": "ad_seen", "session_id": "sess_1" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "total": 2,
    "successful": 2,
    "ignored": 0,
    "failed": 0
  },
  "results": [...]
}
```

---

### Get Attention Score

**GET** `/api/ads/:adId/attention-score`

Get attention score and metrics for an ad.

**Response:**
```json
{
  "success": true,
  "ad_id": "ad_1920",
  "seen_count": 200,
  "scroll_stop_count": 40,
  "repeated_view_count": 10,
  "attention_score": 370,
  "unique_viewers": 180,
  "total_viewport_time_ms": 850000,
  "last_updated": "2026-03-05T10:30:00.000Z"
}
```

---

### Get Score Breakdown

**GET** `/api/ads/:adId/attention-breakdown`

Get detailed breakdown of attention score components.

**Response:**
```json
{
  "success": true,
  "ad_id": "ad_1920",
  "metrics": {
    "seen": {
      "count": 200,
      "weight": 1,
      "contribution": 200,
      "percentage": 54
    },
    "scroll_stop": {
      "count": 40,
      "weight": 3,
      "contribution": 120,
      "percentage": 32
    },
    "repeated_view": {
      "count": 10,
      "weight": 5,
      "contribution": 50,
      "percentage": 14
    }
  },
  "total_score": 370,
  "unique_viewers": 180,
  "engagement_rate": 25
}
```

---

### Batch Get Scores

**POST** `/api/ads/attention-scores/batch`

Get attention scores for multiple ads (max 100).

**Request:**
```json
{
  "ad_ids": ["ad_1", "ad_2", "ad_3"]
}
```

---

### Get Ad Events

**GET** `/api/ads/:adId/attention-events`

Get recent attention events for an ad.

**Query Parameters:**
- `limit` - Max results (default: 100, max: 500)
- `event_type` - Filter by event type
- `user_id` - Filter by user

---

### Get Leaderboard

**GET** `/api/ads/attention/leaderboard`

Get top ads by attention score.

**Query Parameters:**
- `limit` - Number of ads (default: 50, max: 100)

**Response:**
```json
{
  "success": true,
  "generated_at": "2026-03-05T10:30:00.000Z",
  "total_tracked_ads": 1500,
  "total_events": 25000,
  "leaderboard": [
    {
      "rank": 1,
      "ad_id": "ad_1920",
      "attention_score": 570,
      "seen_count": 300,
      "scroll_stop_count": 60,
      "repeated_view_count": 24
    }
  ]
}
```

---

### Seller Analytics

**POST** `/api/ads/attention/seller-analytics`

Get attention analytics for a seller's ads.

**Request:**
```json
{
  "seller_id": "seller_123",
  "ad_ids": ["ad_1", "ad_2", "ad_3"]
}
```

**Response:**
```json
{
  "success": true,
  "seller_id": "seller_123",
  "summary": {
    "total_ads": 3,
    "total_attention_score": 890,
    "average_attention_score": 297,
    "total_impressions": 540,
    "total_scroll_stops": 85,
    "total_repeated_views": 23,
    "total_unique_viewers": 420,
    "engagement_rate": 20
  },
  "best_performing_ad": {...},
  "ad_scores": [...]
}
```

---

### System Info

**GET** `/api/ads/attention/info`

Get information about the attention score system.

---

## Spam Prevention Rules

To prevent fake engagement:

| Rule | Description |
|------|-------------|
| **1 ad_seen per session** | Only one `ad_seen` event allowed per session per ad |
| **1 scroll_stop per session** | Only one `scroll_stop` event allowed per session per ad |
| **Different session for repeated_view** | `repeated_view` must occur in a different session than original view |

### Implementation Logic

```javascript
if (event_type === 'ad_seen' && alreadySeenInSession) {
    // Ignore event
}

if (event_type === 'scroll_stop' && alreadyScrollStoppedInSession) {
    // Ignore event
}

if (event_type === 'repeated_view' && !hasPreviousViewInDifferentSession) {
    // Ignore event
}
```

---

## Performance Indexes

```sql
CREATE INDEX idx_attention_event_ad ON ad_attention_events(ad_id);
CREATE INDEX idx_attention_event_user ON ad_attention_events(user_id);
CREATE INDEX idx_attention_event_session ON ad_attention_events(session_id);
CREATE INDEX idx_attention_score_value ON ad_attention_scores(attention_score DESC);
```

---

## Integration with Ad Ranking

Ads with higher attention scores should rank higher in:
- Feed listings
- Search results
- Category browsing
- Recommended ads

### Example Usage in Search

```javascript
const ads = await getAds(query);

// Sort by combined score
ads.sort((a, b) => {
  const scoreA = (a.trust_score * 0.4) + (a.attention_score * 0.6);
  const scoreB = (b.trust_score * 0.4) + (b.attention_score * 0.6);
  return scoreB - scoreA;
});
```

---

## Future Upgrades

The system is designed to support additional signals:

| Signal | Description | Weight (planned) |
|--------|-------------|------------------|
| `watch_time` | Time spent watching video ads | TBD |
| `click` | User clicks on ad | TBD |
| `share` | User shares ad | TBD |
| `save` | User saves/bookmarks ad | TBD |

These can be added without redesigning the system.

---

## Files

| File | Description |
|------|-------------|
| [attention-score.sql](database/schema/attention-score.sql) | Database schema |
| [attentionScoreService.js](backend/services/attentionScoreService.js) | Business logic |
| [attentionScoreRoutes.js](backend/routes/attentionScoreRoutes.js) | API routes |

---

## Quick Reference

```
POST /api/ads/attention-event          → Log event
POST /api/ads/attention-event/batch    → Log multiple events
GET  /api/ads/:adId/attention-score    → Get ad score
GET  /api/ads/:adId/attention-breakdown → Get score breakdown
GET  /api/ads/:adId/attention-events   → Get ad events
POST /api/ads/attention-scores/batch   → Get multiple scores
GET  /api/ads/attention/leaderboard    → Get top ads
POST /api/ads/attention/seller-analytics → Get seller stats
GET  /api/ads/attention/info           → System info
```
