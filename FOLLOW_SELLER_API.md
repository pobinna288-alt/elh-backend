# Follow Seller Feature - API Documentation

## Overview

The Follow Seller feature allows users to follow sellers and receive personalized feeds of their ads. It includes engagement tracking, trust score boosting from high-trust followers, and automatic "new" badges on recent ads.

## Base URL
```
/api/follow
```

## Features

### Core Features
- **Follow/Unfollow Sellers** - Track follower relationships
- **Personalized Feed** - Mini feed of followed sellers' ads
- **New Ad Badges** - Highlight ads from last 24 hours
- **Trust Boost** - High-trust followers boost seller trust scores
- **Engagement Tracking** - Track views, clicks, saves per ad per day
- **Daily Limits** - Prevent abuse with one event per type per day

### Business Rules
- Only users with `trust_score >= 50` can influence seller trust
- Trust boost per follow: 1-3 points based on follower trust level
- Maximum total trust boost from followers: 10 points
- Self-following is not allowed
- Trust boost is NOT reversed on unfollow (anti-gaming measure)

---

## Endpoints

### 1. Follow a Seller

**POST** `/api/follow/seller`

Follow a seller with optional trust boost.

#### Request Headers
```
x-user-id: <user-uuid>
x-user-trust-score: <0-100>
```

#### Request Body
```json
{
  "seller_id": "seller-uuid-here",
  "seller_trust_score": 60,
  "notifications_enabled": true,
  "auto_bookmark_new_ads": false
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "follow": {
      "id": 1,
      "follower_id": "user-uuid",
      "seller_id": "seller-uuid",
      "notifications_enabled": true,
      "auto_bookmark_new_ads": false,
      "engagement_streak": 0,
      "trust_boost_applied": true,
      "trust_boost_amount": 2,
      "created_at": "2026-03-05T10:30:00Z"
    },
    "seller_stats": {
      "follower_count": 15,
      "trust_boost_received": 8,
      "trust_boost_cap_reached": false
    },
    "trust_boost": {
      "applied": true,
      "amount": 2,
      "reason": "High-trust follower (75) added 2 points"
    }
  }
}
```

#### Error Responses
- `400` - Self-follow attempted or already following
- `401` - User ID not provided

---

### 2. Unfollow a Seller

**DELETE** `/api/follow/seller/:sellerId`

Unfollow a seller. Note: Trust boost is NOT reversed.

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "unfollowed": true,
    "seller_stats": {
      "follower_count": 14
    }
  }
}
```

---

### 3. Check Follow Status

**GET** `/api/follow/check/:sellerId`

Check if the current user is following a specific seller.

#### Response
```json
{
  "success": true,
  "data": {
    "is_following": true,
    "follow_details": {
      "id": 1,
      "follower_id": "user-uuid",
      "seller_id": "seller-uuid",
      "engagement_streak": 5,
      "total_interactions": 23,
      "created_at": "2026-02-15T10:30:00Z"
    }
  }
}
```

---

### 4. Get Followed Feed

**GET** `/api/follow/feed`

Get personalized feed of ads from followed sellers.

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 20 | Max ads to return |
| offset | number | 0 | Pagination offset |
| sort_by | string | created_at | Sort field |
| sort_order | string | DESC | ASC or DESC |
| only_new | boolean | false | Only show ads < 24h old |
| seller_id | string | null | Filter by specific seller |

#### Response
```json
{
  "success": true,
  "data": {
    "ads": [
      {
        "id": "ad-uuid",
        "title": "iPhone 15 Pro Max",
        "description": "Brand new, sealed",
        "price": 1199.99,
        "seller_id": "seller-uuid",
        "created_at": "2026-03-05T08:00:00Z",
        "is_new": true,
        "is_very_new": true,
        "followed_at": "2026-02-15T10:30:00Z",
        "from_followed_seller": true
      }
    ],
    "total": 45,
    "limit": 20,
    "offset": 0,
    "has_more": true,
    "following_count": 5,
    "new_ads_count": 3
  }
}
```

#### New Badge Logic
- `is_new = true` → Created within last 24 hours
- `is_very_new = true` → Created within last 1 hour

---

### 5. Track Engagement Event

**POST** `/api/follow/engagement`

Track user engagement with a followed seller's ad. Limited to one event per type per day per ad per user.

#### Request Body
```json
{
  "ad_id": "ad-uuid",
  "seller_id": "seller-uuid",
  "event_type": "scroll_stop",
  "session_id": "session-123",
  "device_type": "mobile",
  "viewport_time_ms": 3500
}
```

#### Event Types and Weights
| Event Type | Weight | Description |
|------------|--------|-------------|
| ad_seen | 1 | Ad became visible in viewport |
| scroll_stop | 3 | User paused on ad for 2+ seconds |
| repeated_view | 5 | User viewed ad in different session |
| click | 4 | User clicked on ad |
| save | 6 | User saved/bookmarked ad |
| share | 8 | User shared ad |

#### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "event": {
      "id": 1,
      "ad_id": "ad-uuid",
      "user_id": "user-uuid",
      "seller_id": "seller-uuid",
      "event_type": "scroll_stop",
      "event_date": "2026-03-05",
      "created_at": "2026-03-05T10:45:00Z"
    },
    "engagement_streak": 3,
    "total_interactions": 12
  }
}
```

#### Duplicate Event Response (200 OK)
```json
{
  "success": true,
  "ignored": true,
  "reason": "Event already recorded for today",
  "code": "DUPLICATE_DAILY_EVENT"
}
```

---

### 6. Get Engagement Statistics

**GET** `/api/follow/engagement/stats/:sellerId`

Get engagement statistics for user's interactions with a seller.

#### Response
```json
{
  "success": true,
  "data": {
    "follower_id": "user-uuid",
    "seller_id": "seller-uuid",
    "engagement_streak": 5,
    "total_interactions": 23,
    "last_engagement_date": "2026-03-05",
    "weekly_stats": {
      "ad_seen": 8,
      "scroll_stop": 5,
      "repeated_view": 3,
      "click": 4,
      "save": 2,
      "share": 1
    },
    "weekly_summary": "You've viewed 11 ads from this seller this week.",
    "follow_date": "2026-02-15T10:30:00Z"
  }
}
```

---

### 7. Get Attention Score

**GET** `/api/follow/ad/:adId/attention-score`

Calculate attention score for an ad based on all engagement events.

#### Response
```json
{
  "success": true,
  "data": {
    "ad_id": "ad-uuid",
    "raw_score": 156,
    "capped_score": 156,
    "event_counts": {
      "ad_seen": 45,
      "scroll_stop": 23,
      "repeated_view": 8,
      "click": 15,
      "save": 5,
      "share": 2
    },
    "unique_engagers": 98
  }
}
```

#### Attention Score Formula
```
score = (ad_seen × 1) + (scroll_stop × 3) + (repeated_view × 5) + 
        (click × 4) + (save × 6) + (share × 8)
```
Maximum capped at 1000 to prevent abuse.

---

### 8. Bookmark an Ad

**POST** `/api/follow/bookmark`

Bookmark an ad manually (auto-bookmark is handled when following with `auto_bookmark_new_ads: true`).

#### Request Body
```json
{
  "ad_id": "ad-uuid",
  "from_followed_seller": true
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": "user-uuid",
    "ad_id": "ad-uuid",
    "auto_bookmarked": false,
    "from_followed_seller": true,
    "created_at": "2026-03-05T11:00:00Z"
  }
}
```

---

### 9. Get User's Bookmarks

**GET** `/api/follow/bookmarks`

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| only_auto | boolean | false | Only show auto-bookmarked ads |
| limit | number | 50 | Max bookmarks to return |
| offset | number | 0 | Pagination offset |

---

### 10. List Followed Sellers

**GET** `/api/follow/following`

Get list of sellers the current user follows.

#### Response
```json
{
  "success": true,
  "data": {
    "sellers": [
      {
        "seller_id": "seller-uuid",
        "followed_at": "2026-02-15T10:30:00Z",
        "engagement_streak": 5,
        "total_interactions": 23,
        "notifications_enabled": true
      }
    ],
    "total": 5,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

---

### 11. List Seller's Followers

**GET** `/api/follow/followers/:sellerId`

Get list of followers for a seller (public endpoint).

#### Response
```json
{
  "success": true,
  "data": {
    "followers": [
      {
        "follower_id": "user-uuid",
        "followed_at": "2026-02-15T10:30:00Z",
        "trust_boost_applied": true,
        "trust_boost_amount": 2,
        "engagement_streak": 5
      }
    ],
    "total": 15,
    "limit": 50,
    "offset": 0,
    "has_more": false,
    "stats": {
      "follower_count": 15,
      "high_trust_followers": 8,
      "total_trust_boost": 12,
      "trust_boost_cap_reached": true
    }
  }
}
```

---

### 12. Get Seller Stats

**GET** `/api/follow/seller/:sellerId/stats`

Get follower statistics for a seller.

#### Response
```json
{
  "success": true,
  "data": {
    "seller_id": "seller-uuid",
    "follower_count": 15,
    "high_trust_follower_count": 8,
    "total_follower_engagements": 234,
    "avg_engagement_per_follower": 15.6,
    "total_trust_boost_received": 10,
    "trust_boost_cap_reached": true,
    "created_at": "2025-06-01T00:00:00Z",
    "updated_at": "2026-03-05T12:00:00Z"
  }
}
```

---

### 13. Get Trust Score Log

**GET** `/api/follow/trust-log/:userId`

Get trust score change history for transparency.

#### Response
```json
{
  "success": true,
  "data": {
    "user_id": "user-uuid",
    "history": [
      {
        "id": 1,
        "user_id": "user-uuid",
        "previous_score": 60,
        "new_score": 62,
        "change_amount": 2,
        "reason": "Followed by high-trust user",
        "reason_detail": "Follower trust score: 75",
        "source_type": "follower_boost",
        "source_user_id": "follower-uuid",
        "created_at": "2026-03-05T10:30:00Z"
      }
    ],
    "total": 5
  }
}
```

---

### 14. Health Check

**GET** `/api/follow/health`

#### Response
```json
{
  "success": true,
  "service": "follow-seller",
  "version": "1.0.0",
  "status": "healthy",
  "timestamp": "2026-03-05T12:00:00Z",
  "features": {
    "follow_unfollow": true,
    "followed_feed": true,
    "new_badge": true,
    "engagement_tracking": true,
    "trust_boost": true,
    "daily_limit_enforcement": true,
    "bookmarks": true
  }
}
```

---

## Database Schema

### Tables Created

1. **followers** - Track who follows whom
2. **follower_engagement_events** - Track daily engagement events
3. **trust_score_log** - Audit trail for trust changes
4. **seller_follower_stats** - Aggregated seller statistics
5. **ad_bookmarks** - User bookmarks including auto-bookmarks

See `database/schema/follow-seller.sql` for complete schema.

---

## Trust Boost Rules

| Follower Trust Score | Boost Given |
|---------------------|-------------|
| 0-49 | 0 (no influence) |
| 50-69 | +1 |
| 70-89 | +2 |
| 90-100 | +3 |

**Cap**: Maximum +10 total from all followers combined.

---

## Example Usage

### Follow a Seller (cURL)
```bash
curl -X POST http://localhost:5000/api/follow/seller \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -H "x-user-trust-score: 75" \
  -d '{
    "seller_id": "seller-456",
    "seller_trust_score": 60,
    "notifications_enabled": true
  }'
```

### Get Followed Feed (cURL)
```bash
curl http://localhost:5000/api/follow/feed?limit=10&only_new=true \
  -H "x-user-id: user-123"
```

### Track Engagement (cURL)
```bash
curl -X POST http://localhost:5000/api/follow/engagement \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "ad_id": "ad-789",
    "seller_id": "seller-456",
    "event_type": "scroll_stop",
    "session_id": "sess-001"
  }'
```

---

## Error Codes

| Code | Description |
|------|-------------|
| SELF_FOLLOW_NOT_ALLOWED | Cannot follow yourself |
| ALREADY_FOLLOWING | Already following this seller |
| NOT_FOLLOWING | Not following this seller |
| INVALID_EVENT_TYPE | Invalid engagement event type |
| DUPLICATE_DAILY_EVENT | Event already recorded today |
| ALREADY_BOOKMARKED | Ad already bookmarked |
| NOT_BOOKMARKED | Bookmark not found |
| UNAUTHORIZED | User ID not provided |

---

## Version History

- **v1.0.0** (2026-03-05) - Initial release
  - Follow/unfollow sellers
  - Personalized followed feed
  - New ad badges (24h and 1h)
  - Daily engagement tracking with abuse prevention
  - Trust boost from high-trust followers
  - Bookmark system with auto-bookmark option
  - Complete trust score audit log
