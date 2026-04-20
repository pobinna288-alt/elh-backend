# Platform Tiers and System Rules

## Complete Tier Comparison

| Feature | Normal | Premium | Pro | Hot |
|---------|--------|---------|-----|-----|
| **Subscription Cost** | Free | $20 or 20,000 coins/month | $200 or 200,000 coins/month | $400 or 400,000 coins/month |
| **Video Duration** | 2 min (120 sec) | 3 min (180 sec) | 5 min (300 sec) | 10 min (600 sec) |
| **File Size** | 20 MB | 40 MB | 80 MB | 100 MB |
| **Daily Uploads** | 2-3 | 3-5 | 5-10 | 10 |
| **Monthly Uploads** | - | 120 | - | - |
| **Concurrent Uploads** | 1 | 2 | - | - |
| **Max Ad Reach** | 4,000 views | 10,000 views | 500,000 views | 1,000,000 views |
| **Coins per View** | 10 | 30 | 100 | 200 |
| **Max Coins per Ad** | 100 | 300 | 3,000 | 5,000 |
| **Viewer Daily Cap** | 50 coins | 300 coins | 500 coins | 1,000 coins |
| **Viewer Monthly Cap** | - | - | - | - |
| **AI Tools** | None | 3 tools | 5 tools | 5 tools |
| **AI Requests/Day** | 0 | 20 per tool | 50 per tool | 50 per tool |
| **Priority** | Low | Medium | High | Highest |

> **Enterprise AI Suite (4 features only):** `Smart Copywriter`, `Negotiation AI`, `AI Auto Post Generator`, and `AI AdGuardian`.

---

## Backend Logic by Tier

### 1. NORMAL USER

#### Payment Options
- Free / normal plan
- No subscription required
- No coin payment needed to access basic features

#### Video Upload Validation
```
IF video_length > 120 seconds OR 
   file_size > 20 MB OR 
   daily_uploads >= 3
THEN
  REJECT: "Upload failed: Exceeded daily limit, max size, or max length"
ELSE
  ACCEPT upload
  INCREMENT daily_upload_counter
```

#### Ad Reach & Coin Rewards
```
ON ad_view:
  IF ad.coins_distributed < 100 AND
     ad.views < 4000 AND
     viewer.daily_earned_coins + 10 <= 50
  THEN
    - Credit 10 coins to viewer
    - Increment ad.coins_distributed by 10
    - Increment ad.views
    - Increment viewer.daily_earned_coins by 10
  ELSE IF viewer.daily_earned_coins >= 50
    - Show ad, no coins
    - Message: "Daily coin limit reached"
  ELSE IF ad.coins_distributed >= 100 OR ad.views >= 4000
    - Show ad, no coins
    - Message: "Ad coin budget exhausted" or "Ad reach limit reached"
```

#### Ad Lifecycle
```
IF ad.coins_distributed >= 100 OR ad.views >= 4000
  SET ad.status = "inactive"
  STOP coin rewards (ad still visible but no earnings)
  REQUIRE upgrade or boost to reactivate
```

#### Features
- No AI tools available
- Low priority ad placement
- Max 10 rewarded viewers per ad (100 coins total)

---

### 2. PREMIUM USER

#### Video Upload Validation
```
IF video_length > 180 seconds OR 
   file_size > 40 MB OR 
   daily_uploads >= 5
THEN
  REJECT: "Upload failed: Exceeded daily limit, max size, or max length"
ELSE
  ACCEPT upload
  INCREMENT daily_upload_counter
```

#### Ad Reach & Coin Rewards
```
ON ad_view:
  IF ad.coins_distributed < 300 AND
     ad.views < 10000 AND
     viewer.daily_earned_coins + 30 <= 300
  THEN
    - Credit 30 coins to viewer
    - Increment ad.coins_distributed by 30
    - Increment ad.views
    - Increment viewer.daily_earned_coins by 30
  ELSE IF viewer.daily_earned_coins >= 300
    - Show ad, no coins
    - Message: "Daily coin limit reached"
  ELSE IF ad.coins_distributed >= 300 OR ad.views >= 10000
    - Show ad, no coins
    - Message: "Ad coin budget exhausted" or "Ad reach limit reached"
```

#### AI Tools Usage (3 Tools)
- **Tools Available:**
  - Smart Copywriter (max 100 words output)
  - Negotiation AI (max 50 words output)
  - Competitor Analyzer

```
ON ai_request:
  IF user.plan != "premium"
    REJECT: "Premium plan required"
  ELSE IF tool_usage_today >= 20
    REJECT: "Daily AI usage limit reached"
  ELSE
    PROCESS request
    INCREMENT tool_usage_counter
```

#### Subscription Management
```
Cost: $20 or 20,000 coins/month (30 days)

Activation:
1. Verify coin_balance >= 20000
2. Verify no active premium (premium_expires_at < current_date)
3. Begin transaction
4. Deduct 20,000 coins
5. Set plan = "premium"
6. Set premium_expires_at = current_date + 30 days
7. Log transaction
8. Commit
```

---

### 3. PRO USER

#### Video Upload Validation
```
IF video_length > 300 seconds OR 
   file_size > 80 MB OR 
   daily_uploads >= 10
THEN
  REJECT: "Upload failed: Exceeded daily limit, max size, or max length"
ELSE
  ACCEPT upload
  INCREMENT daily_upload_counter
```

#### Ad Reach & Coin Rewards
```
ON ad_view:
  IF ad.coins_distributed < 3000 AND
     ad.views < 500000 AND
     viewer.daily_earned_coins + 100 <= 500
  THEN
    - Credit 100 coins to viewer
    - Increment ad.coins_distributed by 100
    - Increment ad.views
    - Increment viewer.daily_earned_coins by 100
  ELSE IF viewer.daily_earned_coins >= 500
    - Show ad, no coins
    - Message: "Daily coin limit reached"
  ELSE IF ad.coins_distributed >= 3000 OR ad.views >= 500000
    - Show ad, no coins
    - Message: "Ad coin budget exhausted" or "Ad reach limit reached"
```

#### AI Tools Usage (3 Tools)
- **Tools Available:**
  - Smart Copywriter (max 100 words output)
  - Negotiation AI (max 50 words output)
  - Competitor Analyzer

```
ON ai_request:
  IF user.plan != "pro"
    REJECT: "Pro plan required"
  ELSE IF tool_usage_today >= 50
    REJECT: "Daily AI usage limit reached"
  ELSE
    PROCESS request
    INCREMENT tool_usage_counter
```

#### Ad Lifecycle
```
IF ad.coins_distributed >= 3000 OR ad.views >= 500000
  SET ad.status = "inactive"
  STOP coin rewards (ad still visible but no earnings)
```

#### Subscription
- Cost: $200/month OR 200,000 coins/month
- 30-day subscription period

---

### 4. HOT USER

#### Payment Options
- Cost: $400/month OR 400,000 coins/month
- Partial payment: coins + cash allowed
- High coin cost intentionally discourages coin-only payment

#### Video Upload Validation
```
IF video_length > 600 seconds OR 
   file_size > 100 MB OR 
   daily_uploads >= 10
THEN
  REJECT: "Upload failed: Exceeded daily limit, max size, or max length"
ELSE
  ACCEPT upload
  INCREMENT daily_upload_counter
```

#### Ad Reach & Coin Rewards
```
ON ad_view:
  IF ad.coins_distributed < 5000 AND
     ad.views < 1000000 AND
     viewer.daily_earned_coins + 200 <= 1000
  THEN
    - Credit 200 coins to viewer
    - Increment ad.coins_distributed by 200
    - Increment ad.views
    - Increment viewer.daily_earned_coins by 200
  ELSE IF viewer.daily_earned_coins >= 1000
    - Show ad, no coins
    - Message: "Daily coin limit reached"
  ELSE IF ad.coins_distributed >= 5000 OR ad.views >= 1000000
    - Show ad, no coins
    - Message: "Ad coin budget exhausted" or "Ad reach limit reached"
```

#### AI Tools Usage (5 Tools)
- Same 5 tools as Pro
- Daily limit: 50 requests per tool

```
ON ai_request:
  IF user.plan != "hot"
    REJECT: "Hot plan required"
  ELSE IF tool_usage_today >= 50
    REJECT: "Daily AI usage limit reached"
  ELSE
    PROCESS request
    INCREMENT tool_usage_counter
```

#### Ad Lifecycle
```
IF ad.coins_distributed >= 5000 OR ad.views >= 1000000
  SET ad.status = "inactive"
  STOP coin rewards (ad still visible but no earnings)
```

---

### 5. ENTERPRISE USER (AI SUITE ONLY)

Enterprise keeps only these **4 AI features**:

- **Smart Copywriter** — writes and improves your ad text
- **Negotiation AI** — helps you reply to buyers and close deals
- **AI Auto Post Generator** — automatically generates premium ad content when you upload images
- **AI AdGuardian** — analyzes your ad, predicts performance, and provides deeper reasoning for success

```
ON enterprise_ai_request:
  ALLOW only these tools:
    - smart_copywriter
    - negotiation_ai
    - ai_auto_post_generator
    - ai_adguardian
  REJECT any other enterprise AI feature
```

---

## Content Moderation System

### AI Content Safety Analysis

#### Detection Categories

**CRITICAL - Immediate Block:**
- Sexualized minors (any level) → Report to authorities
- Explicit nudity or sexual acts
- Child exploitation material (CSAM)
- Graphic violence or gore
- Drug manufacturing or distribution

**HIGH RISK - Block:**
- Full nudity
- Sexual content
- Weapons promotion
- Blood or injury depictions
- Hate symbols

**MEDIUM RISK - Review:**
- Partial nudity or suggestive poses
- Revealing clothing
- Alcohol or tobacco prominent display
- Mild violence references
- Questionable compliance

**LOW RISK - Allow:**
- Standard product images
- Professional content
- Family-friendly material
- No policy violations

### Enforcement Actions

#### High Severity (sexual_content, CSAM, illegal_activity)
1. Delete ad immediately from database (status = "deleted")
2. Remove all associated media from storage (video, images)
3. Deduct trust score: -50 points
4. Send in-app notification to user
5. Create violation record
6. Suspend repeat offenders (3 violations = account suspension)

#### Medium Severity (suspicious_content, policy_borderline)
1. Set ad status = "under_review"
2. Keep media in quarantine
3. Deduct trust score: -10 points
4. Notify user for clarification
5. Manual review required within 24 hours

#### Low Severity (minor_policy_issues)
1. Add warning flag
2. Deduct trust score: -2 points
3. Send educational notification

### Violation Record Structure
```json
{
  "ad_id": "AD778",
  "status": "deleted",
  "violation_type": "sexual_content",
  "severity": "high",
  "detected_by": "ai_moderation",
  "action_taken": "auto_delete",
  "timestamp": "2026-01-13",
  "confidence": 0.98,
  "requires_report": false
}
```

---

## Scheduled Jobs

### Premium Expiration Job
**Schedule:** Daily at 00:00 UTC

```sql
SELECT user_id, plan, premium_expires_at 
FROM users 
WHERE plan IN ('premium', 'pro', 'hot')
AND premium_expires_at < CURRENT_DATE
```

**Actions per User:**
1. Set `plan` = "normal"
2. Keep `premium_expires_at` (for history)
3. Preserve `coin_balance` (no refund)
4. Reset AI usage counters to 0
5. Preserve all user content
6. Log downgrade event

---

## Error Messages Reference

| Error Code | Message | Triggered When |
|------------|---------|----------------|
| VIDEO_TOO_LONG | "Video too long / too large" | video_length or file_size exceeded |
| DAILY_UPLOAD_LIMIT | "Daily upload limit reached" | daily_uploads >= limit |
| AI_LIMIT_REACHED | "AI tool usage limit reached" | tool_usage_today >= limit |
| AD_BUDGET_EXHAUSTED | "Ad coin budget exhausted" | coins_distributed >= max_coins_per_ad |
| DAILY_COIN_LIMIT | "Daily coin limit reached" | viewer daily coin cap reached |
| INSUFFICIENT_COINS | "Insufficient coins. You need X but have Y coins." | coin_balance < required |
| ACTIVE_SUBSCRIPTION | "Active premium subscription already exists. Expires on X." | Attempting to buy when active |

---

## Database Schemas

### User Profile
```json
{
  "user_id": "U123",
  "plan": "premium|pro|hot|normal",
  "coin_balance": 4200,
  "premium_expires_at": "2026-02-13",
  "trust_score": 500,
  "violation_count": 0
}
```

### AI Usage Tracking
```json
{
  "user_id": "123",
  "plan": "premium",
  "ai_usage": {
    "copywriter_today": 6,
    "negotiation_today": 11,
    "competitor_today": 2
  },
  "last_reset": "2026-01-13"
}
```

### Ad Structure
```json
{
  "ad_id": "AD555",
  "user_id": "P123",
  "plan": "pro",
  "ad_type": "video",
  "max_coins_per_view": 100,
  "total_coin_budget": 3000,
  "coins_distributed": 0,
  "views": 0,
  "ad_reach_limit": 500000,
  "status": "active|paused|completed|deleted|inactive"
}
```

### Transaction Record
```json
{
  "transaction_id": "TX9981",
  "user_id": "U123",
  "type": "premium_subscription|coin_earn|coin_spend",
  "payment_method": "coins|cash|mixed",
  "amount": 20000,
  "date": "2026-01-13",
  "status": "success|pending|failed"
}
```

### Watch & Earn Transaction
```json
{
  "user_id": "U456",
  "ad_id": "AD555",
  "coins_earned": 100,
  "watch_percentage": 85,
  "timestamp": "2026-01-13T14:30:00Z"
}
```

---

## Watch & Earn Requirements

### Validation Rules
- Watch time must be ≥ 80% of video duration
- User must not have reached daily coin cap
- Ad must have available coin budget
- Ad must not have reached view limit

### Processing Flow
```
1. User watches video ad
2. Track watch time
3. IF watch_time >= (video_duration * 0.80)
   THEN validate coin eligibility
4. Check ad coin budget available
5. Check user daily coin cap not exceeded
6. IF all checks pass
   THEN credit coins
   ELSE show appropriate message
```

---

## AI Assistant Rules

### Role
AI assistant for premium advertising platform

### System Rules (Immutable)
- Maximum video duration varies by tier
- Maximum file size varies by tier
- Maximum ad reach varies by tier
- Watch & Earn rewards vary by tier
- Coins earned only if watch time ≥ 80%

### Responsibilities
- Explain features clearly to users
- Generate ad descriptions or tips within platform limits
- Never suggest bypassing limits
- Never invent new limits or rewards

### Tone
Clear, professional, trustworthy

### Output Rules
- Follow all system rules strictly
- Do not mention internal policies
- Adapt responses based on user tier
- Respect word limits for AI tools

---

## AI Tool Specifications

### Smart Copywriter
- **Premium:** Max 100 words, 20 requests/day
- **Pro:** Max 100 words, 50 requests/day
- **Hot:** Max 100 words, 50 requests/day
- **Purpose:** Rewrite ad descriptions professionally

### Negotiation AI
- **Premium:** Max 50 words, 20 requests/day
- **Pro:** Max 50 words, 50 requests/day
- **Hot:** Max 50 words, 50 requests/day
- **Purpose:** Suggest professional buyer replies

### Competitor Analyzer
- **Premium:** 20 requests/day
- **Pro:** 50 requests/day
- **Hot:** 50 requests/day
- **Purpose:** Analyze similar ads, pricing, demand trends

### Audience Expansion
- **Enterprise:** 50 requests/day
- **Purpose:** Recommend targeting strategies and new markets

---

## Implementation Notes

1. All coin rewards require 80% watch time validation
2. Daily counters reset at 00:00 UTC
3. Subscription expiration checked daily via cron job
4. Content moderation runs on upload and periodically
5. AI usage counters are per-tool per-day
6. Transaction logs must be atomic (use database transactions)
7. Video files stored with ad_id as filename
8. Deleted content must be removed from storage within 24 hours
9. Trust scores affect ad visibility and priority
10. Repeat violators (3+ violations) face account suspension
