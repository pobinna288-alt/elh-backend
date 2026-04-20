# Watch Ad & Earn Coins System

## Overview

The Watch Ad & Earn Coins system allows users to earn coins by watching advertisements. Coins are rewarded progressively based on watch milestones (25%, 50%, 75%, 100%).

## Key Features

- ✅ **Progressive coin rewards** - Coins unlock as video plays
- ✅ **Tier-based limits** - Max coins based on ad owner's tier
- ✅ **Anti-cheat protection** - Server-side validation
- ✅ **Daily coin limits** - Prevent farming (500 coins/day)
- ✅ **Watch streak tracking** - Bonus for consecutive days
- ✅ **Coin boost events** - Temporary multiplier events

## Coin Reward Rules by Tier

| Tier    | Max Video Length | Max Coins |
|---------|------------------|-----------|
| Normal  | 2 minutes        | 10 coins  |
| Premium | 3 minutes        | 40 coins  |
| Pro     | 5 minutes        | 100 coins |
| Hot     | 10 minutes       | 200 coins |

> ⚠️ **Important**: Normal ads return 10 coins max, not 20.

## Progressive Coin Unlock

Coins unlock progressively at milestones:

| Milestone | Cumulative % | Example (Normal = 10 coins) |
|-----------|--------------|----------------------------|
| 25%       | 20%          | 2 coins                    |
| 50%       | 50%          | 5 coins                    |
| 75%       | 70%          | 7 coins                    |
| 100%      | 100%         | 10 coins                   |

## API Endpoints

### POST `/api/ad-progress`

Report watch progress and earn coins.

**Payload:**
```json
{
  "user_id": "uuid",
  "ad_id": "uuid",
  "watch_percent": 50,
  "watch_time_seconds": 60
}
```

**Response:**
```json
{
  "success": true,
  "watch_percent": 50,
  "coins_earned": 3,
  "total_from_ad": 5,
  "new_balance": 1240,
  "completed": false,
  "milestones_reached": [50],
  "message": "Milestone reached: 50%"
}
```

### POST `/api/ad-watch/start`

Start a new watch session.

**Payload:**
```json
{
  "user_id": "uuid",
  "ad_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "session_id": "uuid",
  "ad_id": "uuid",
  "tier": "NORMAL",
  "video_duration": 120,
  "max_coins": 10,
  "milestone_rewards": {
    "25": 2,
    "50": 3,
    "75": 2,
    "100": 3
  },
  "boost_event": null
}
```

### GET `/api/ad-watch/stats`

Get user's watch statistics.

**Query:** `?user_id=uuid`

**Response:**
```json
{
  "success": true,
  "user_id": "uuid",
  "coin_balance": 1240,
  "total_ads_watched": 50,
  "ads_completed": 45,
  "watch_streak": 7,
  "coins_earned_today": 120,
  "daily_coin_limit": 500,
  "active_boost_event": null
}
```

### GET `/api/ad-watch/status/:adId`

Get completion status for a specific ad.

**Query:** `?user_id=uuid`

**Response:**
```json
{
  "success": true,
  "status": "completed",
  "watch_percent": 100,
  "coins_earned": 10,
  "completed": true
}
```

## Anti-Cheat Rules

| Rule | Description |
|------|-------------|
| One view per ad | User can only earn coins once per ad |
| Milestone once | Each milestone rewards only once |
| Watch time validation | Progress must match actual video duration |
| Progress jump limit | Max 30% jump per update |
| Update interval | Min 2 seconds between updates |
| Daily limit | 500 coins max per day |

## Database Tables

### ad_views
Tracks user viewing progress.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| userId | UUID | Foreign key to users |
| adId | UUID | Foreign key to ads |
| watchPercent | INTEGER | Current progress (0-100) |
| milestone_25 | BOOLEAN | 25% milestone completed |
| milestone_50 | BOOLEAN | 50% milestone completed |
| milestone_75 | BOOLEAN | 75% milestone completed |
| milestone_100 | BOOLEAN | 100% milestone completed |
| totalCoinsEarned | INTEGER | Coins earned from this ad |
| completed | BOOLEAN | Whether ad is fully watched |

### coin_transactions
Audit trail for all rewards.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| userId | UUID | Foreign key to users |
| adId | UUID | Foreign key to ads (nullable) |
| coins | INTEGER | Coins earned |
| type | ENUM | ad_watch_reward, streak_bonus, boost_event_reward |
| milestone | INTEGER | 25, 50, 75, or 100 |
| multiplier | DECIMAL | Boost multiplier applied |

### coin_boost_events
Temporary reward multiplier events.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR | Event name |
| multiplier | DECIMAL | Coin multiplier (e.g., 2.0) |
| startTime | TIMESTAMP | Event start |
| endTime | TIMESTAMP | Event end |
| isActive | BOOLEAN | Administrative toggle |

## Daily Watch Streak

- Watch at least one ad per day to maintain streak
- Streak resets if a day is skipped
- Bonus coins every 7 days (10 coins per week, max 100)

## Coin Boost Events

Admins can create temporary events with multiplied rewards:

```json
{
  "name": "Weekend Bonus!",
  "multiplier": 2.0,
  "start_time": "2026-03-07T00:00:00Z",
  "end_time": "2026-03-09T00:00:00Z"
}
```

## Security Considerations

1. **All calculations server-side** - Frontend values are NEVER trusted
2. **Atomic transactions** - Coin updates use database transactions
3. **Audit trail** - Every reward is logged
4. **Rate limiting** - Progress updates throttled
5. **User isolation** - Users cannot watch their own ads

## Performance Indexes

Critical indexes for scalability:

```sql
-- User + ad lookup (most common query)
INDEX ad_views_user_ad (userId, adId)

-- Daily limit calculation
INDEX coin_transactions_user_date (userId, createdAt)
```

## Quick Start

1. Run migration: `database/migrations/watch_ad_earn_coins.sql`
2. Create indexes: `database/indexes/ad_watch_indexes.sql`
3. Start server
4. Test with `/api/ad-watch/start` and `/api/ad-progress`
