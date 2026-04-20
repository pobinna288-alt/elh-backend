# Marketplace Fraud Detection System
## Complete Technical Architecture & Implementation Guide

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Principles](#core-principles)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [Fraud Scoring Engine](#fraud-scoring-engine)
6. [Decision Engine](#decision-engine)
7. [Event Tracking](#event-tracking)
8. [Admin Tools](#admin-tools)
9. [Background Jobs](#background-jobs)
10. [API Reference](#api-reference)
11. [Deployment Guide](#deployment-guide)
12. [Scaling Considerations](#scaling-considerations)

---

## System Overview

This is a **backend-only** fraud detection and prevention system for a classified ads/marketplace platform. It detects suspicious behavior, scores fraud risk, warns buyers, and enforces restrictions on risky sellers while minimizing false positives.

### Key Features

✅ **Risk Scoring (0-100)**: Combines multiple signals with weighted scoring  
✅ **3-Level Enforcement**: Progressive discipline (soft → temp → permanent)  
✅ **No Auto-Bans**: Permanent bans require human approval  
✅ **Audit Trail**: Immutable logs for compliance and appeals  
✅ **Score Decay**: Good behavior reduces scores over time  
✅ **Pattern Detection**: Identifies fraud rings and duplicate content  
✅ **Admin Dashboard**: Review queue, enforcement, and analytics  

### Design Philosophy

- **Backend-only logic**: Frontend just sends events
- **Multiple signals**: Never rely on single indicator
- **Human oversight**: AI suggests, humans decide
- **Privacy-first**: No message content storage
- **Appeal-friendly**: Full audit trail for transparency
- **Scalable**: Designed for millions of users

---

## Core Principles

### 1. Never Permanently Ban Based on Single Signal

❌ **BAD**: `if (reports > 3) permanentBan()`  
✅ **GOOD**: `if (score > 85 && reports > 3 && previousBans > 2 && manualReview) consider()`

### 2. Use Risk Scoring, Not Binary Decisions

| Risk Level | Score Range | Action |
|------------|-------------|--------|
| Low | 0-30 | Monitor only |
| Medium | 31-60 | Show buyer warnings |
| High | 61-80 | Reduce visibility + review queue |
| Critical | 81-100 | Temp ban + mandatory review |

### 3. Combine Rules + Behavior + Reports

```
Fraud Score = Weighted Average of:
- Account age & verification (15%)
- Posting velocity (20%)
- Content duplication (25%)
- Price outliers (15%)
- Community reports (30%)
- Enforcement history (40%)
```

### 4. Log Everything for Audit

- All scores stored in `fraud_score_history`
- All decisions in `fraud_enforcement_actions`
- Immutable audit trail in `fraud_audit_logs`
- Full appeal system with evidence

### 5. Protect Legitimate Users

- **Score decay**: 2 points/day after 7 days good behavior
- **Appeal system**: Users can contest decisions
- **Manual review**: Humans validate critical actions
- **False positive tracking**: Learn from mistakes

---

## Architecture

### High-Level System Design

```
┌────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React/Mobile)                     │
│                                                                 │
│  • Creates ads                                                  │
│  • Sends messages                                               │
│  • Views fraud warnings (buyer side)                            │
│  • NO FRAUD LOGIC                                               │
└──────────────────────┬─────────────────────────────────────────┘
                       │ HTTPS/REST
                       ↓
┌────────────────────────────────────────────────────────────────┐
│                   NESTJS BACKEND (Node.js)                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │            FRAUD DETECTION PIPELINE                     │  │
│  │                                                          │  │
│  │  1. Event Tracking Service                              │  │
│  │     • Captures user/ad/messaging events                 │  │
│  │     • Logs to fraud_*_events tables                     │  │
│  │     • Detects patterns (device, IP, content)            │  │
│  │                                                          │  │
│  │  2. Fraud Scoring Engine                                │  │
│  │     • Calculates 0-100 risk score                       │  │
│  │     • Weighted signal combination                       │  │
│  │     • Real-time score updates                           │  │
│  │                                                          │  │
│  │  3. Decision Engine                                     │  │
│  │     • Level 1: Soft restrictions                        │  │
│  │     • Level 2: Temporary bans (24-72h)                  │  │
│  │     • Level 3: Perm ban candidate (manual review)       │  │
│  │                                                          │  │
│  │  4. Enforcement Executor                                │  │
│  │     • Applies restrictions                              │  │
│  │     • Queues for admin review                           │  │
│  │     • Logs to audit trail                               │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │            ADMIN TOOLS & REVIEW QUEUE                   │  │
│  │                                                          │  │
│  │  • Review queue (prioritized)                           │  │
│  │  • Evidence viewer (scores, events, reports)            │  │
│  │  • Manual enforcement actions                           │  │
│  │  • Appeal management                                    │  │
│  │  • Analytics & monitoring                               │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │            BACKGROUND JOBS (Cron)                       │  │
│  │                                                          │  │
│  │  • Score recalculation (6h)                             │  │
│  │  • Score decay (daily)                                  │  │
│  │  • Pattern detection (8-12h)                            │  │
│  │  • Temp ban expiry (15min)                              │  │
│  │  • Event archival (daily)                               │  │
│  │  • Health monitoring (5min)                             │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────┬─────────────────────────────────────────┘
                       │
                       ↓
┌────────────────────────────────────────────────────────────────┐
│                   POSTGRESQL DATABASE                           │
│                                                                 │
│  Event Tables:                                                  │
│  • fraud_user_events (logins, verifications, IP changes)       │
│  • fraud_ad_events (ads, edits, price changes)                 │
│  • fraud_messaging_events (metadata only, no content)          │
│  • fraud_feedback_events (reports, blocks)                     │
│                                                                 │
│  Scoring Tables:                                                │
│  • fraud_user_scores (current 0-100 score per user)            │
│  • fraud_score_history (historical trend)                      │
│  • fraud_ad_scores (per-ad risk scores)                        │
│                                                                 │
│  Enforcement Tables:                                            │
│  • fraud_enforcement_actions (warnings, bans, restrictions)    │
│  • fraud_review_queue (manual review needed)                   │
│  • fraud_appeals (user appeals)                                │
│  • fraud_audit_logs (IMMUTABLE compliance trail)               │
│                                                                 │
│  Pattern Detection:                                             │
│  • fraud_device_fingerprints (multi-account detection)         │
│  • fraud_ip_reputation (VPN, proxy tracking)                   │
│  • fraud_content_patterns (duplicate text/images)              │
│                                                                 │
│  Configuration:                                                 │
│  • fraud_config (dynamic thresholds, weights)                  │
└────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Purpose | Key Files |
|-----------|---------|-----------|
| **Event Service** | Tracks all user/ad activity | `marketplace-fraud-event.service.ts` |
| **Scoring Engine** | Calculates 0-100 fraud scores | `marketplace-fraud-scoring.service.ts` |
| **Decision Engine** | Determines enforcement actions | `marketplace-fraud-decision.service.ts` |
| **Admin Controller** | Admin review and management | `marketplace-fraud-admin.controller.ts` |
| **Background Jobs** | Scheduled processing | `marketplace-fraud-jobs.service.ts` |
| **Database Schema** | All tables and indexes | `marketplace-fraud-detection.sql` |

---

## Database Schema

### Event Tracking Tables

#### `fraud_user_events`
Tracks account-level behavior:
- Account creation, verification
- Logins, IP changes, device changes
- Profile updates

**Key Fields**:
- `user_id`: User being tracked
- `event_type`: Type of event
- `ip_address`: IP address (for pattern detection)
- `device_fingerprint_hash`: SHA-256 hash of device
- `event_data`: JSONB for flexible data

**Indexes**: `user_id`, `event_type`, `created_at`, `device_fingerprint_hash`, `ip_address`

#### `fraud_ad_events`
Tracks ad listing behavior:
- Ad creation, editing, deletion
- Price changes
- Image uploads
- Description changes

**Key Fields**:
- `ad_id`: Ad being tracked
- `user_id`: Ad owner
- `price_amount`: Current price
- `price_change_delta`: Change from previous
- `image_perceptual_hashes`: Array of image hashes
- `description_hash`: SHA-256 of normalized text

**Fraud Detection Uses**:
- Detect rapid posting (velocity)
- Identify duplicate content
- Flag price manipulation
- Track image theft

#### `fraud_messaging_events`
Tracks messaging patterns (metadata only):
- Message frequency
- Off-platform contact attempts
- Rapid messaging

**CRITICAL**: **NO message content stored**. Only metadata:
- Timestamps
- Sender/recipient IDs
- Pattern flags (detected via regex)

**Pattern Flags**:
- `phone_number`: Detected phone number pattern
- `email`: Detected email pattern
- `whatsapp_mention`: WhatsApp/wa.me mention
- `telegram_mention`: Telegram/t.me mention
- `external_contact_request`: Generic off-platform request

#### `fraud_feedback_events`
Community reports and feedback:
- User reports
- Ad reports
- User blocks

**Key Fields**:
- `reporter_id`: Who reported
- `reported_user_id`: Who was reported
- `report_reason`: Categorized reason
- `evidence_urls`: Screenshots, links

### Scoring Tables

#### `fraud_user_scores`
Current fraud score per user (0-100):

```sql
CREATE TABLE fraud_user_scores (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL,
  score SMALLINT CHECK (score >= 0 AND score <= 100),
  risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  signal_breakdown JSONB, -- What contributed to score
  last_calculated_at TIMESTAMP,
  previous_score SMALLINT,
  score_trend VARCHAR(20) CHECK (score_trend IN ('improving', 'stable', 'worsening'))
);
```

**Risk Levels**:
- **Low (0-30)**: No action needed
- **Medium (31-60)**: Show buyer warnings
- **High (61-80)**: Soft restrictions + review
- **Critical (81-100)**: Temp ban + mandatory review

#### `fraud_score_history`
Historical score tracking for trend analysis.

#### `fraud_ad_scores`
Per-ad fraud scores with actions taken.

### Enforcement Tables

#### `fraud_enforcement_actions`
All enforcement actions (warnings, bans, restrictions):

```sql
CREATE TABLE fraud_enforcement_actions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type VARCHAR(50), -- 'warning', 'soft_restriction', 'temp_ban', 'permanent_ban'
  action_level SMALLINT CHECK (action_level IN (1, 2, 3)),
  reason TEXT NOT NULL,
  fraud_score_at_action SMALLINT,
  evidence JSONB,
  restrictions JSONB, -- Specific restrictions applied
  
  -- Duration
  starts_at TIMESTAMP,
  expires_at TIMESTAMP, -- NULL for permanent bans
  lifted_at TIMESTAMP,
  
  -- Admin accountability
  applied_by UUID, -- Admin ID or NULL for automated
  applied_by_system BOOLEAN,
  lifted_by UUID,
  lift_reason TEXT,
  
  status VARCHAR(20) CHECK (status IN ('active', 'expired', 'lifted', 'superseded'))
);
```

**3 Enforcement Levels**:

| Level | Type | Duration | Requires Review |
|-------|------|----------|-----------------|
| 1 | Soft restriction | Indefinite until improved | Yes |
| 2 | Temporary ban | 24-72 hours | Yes |
| 3 | Permanent ban candidate | Suspended until review | **MANDATORY** |

#### `fraud_review_queue`
Queue for manual admin review:

```sql
CREATE TABLE fraud_review_queue (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  priority VARCHAR(20), -- 'low', 'medium', 'high', 'urgent'
  review_reason VARCHAR(100),
  fraud_score SMALLINT,
  report_count INT,
  evidence JSONB,
  
  -- Review tracking
  status VARCHAR(20), -- 'pending', 'in_review', 'completed'
  assigned_to UUID, -- Admin assigned
  reviewed_at TIMESTAMP,
  review_decision VARCHAR(50),
  review_notes TEXT
);
```

**Priority Escalation**:
- **Urgent**: Perm ban candidates, high score + multiple reports
- **High**: Critical score (81+), repeat offenders
- **Medium**: High score (61-80), needs verification
- **Low**: General monitoring

#### `fraud_appeals`
User appeals against enforcement actions:

```sql
CREATE TABLE fraud_appeals (
  id UUID PRIMARY KEY,
  enforcement_action_id UUID NOT NULL,
  user_id UUID NOT NULL,
  appeal_text TEXT NOT NULL,
  evidence_urls TEXT[],
  
  status VARCHAR(20), -- 'pending', 'under_review', 'approved', 'rejected'
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  review_decision TEXT
);
```

#### `fraud_audit_logs` (IMMUTABLE)
Comprehensive audit trail for compliance:

```sql
CREATE TABLE fraud_audit_logs (
  id UUID PRIMARY KEY,
  action_type VARCHAR(100),
  user_id UUID,
  admin_id UUID,
  before_state JSONB,
  after_state JSONB,
  reason TEXT NOT NULL,
  metadata JSONB,
  ip_address INET,
  created_at TIMESTAMP
);
```

**CRITICAL**: This table is **IMMUTABLE** (no updates/deletes). Required for:
- Compliance audits
- Appeal evidence
- Admin accountability
- Legal protection

### Pattern Detection Tables

#### `fraud_device_fingerprints`
Tracks devices for multi-account detection:
- Device hash (SHA-256)
- Associated user IDs (array)
- User count per device
- Flag if suspicious (> 5 users)

#### `fraud_ip_reputation`
IP address reputation tracking:
- VPN/proxy/datacenter detection
- Associated users
- Country code
- Flagged status

#### `fraud_content_patterns`
Duplicate content detection:
- Description text hashes
- Image perceptual hashes
- Associated ads/users
- Occurrence count

---

## Fraud Scoring Engine

### How It Works

The scoring engine combines multiple weighted signals to produce a 0-100 fraud risk score:

```typescript
finalScore = Σ(signal.score × signal.weight) / Σ(signal.weight)
```

### Signal Categories

#### 1. Account Signals (15-25 points)

```typescript
// New account (< 7 days)
if (accountAgeHours < 168) {
  score = max(0, 15 - (accountAgeHours / 168 * 15))
  signals.push({ name: 'new_account', score, weight: 15 })
}

// Unverified email
if (!emailVerified) {
  signals.push({ name: 'unverified_email', score: 10, weight: 10 })
}

// Unverified phone
if (!phoneVerified) {
  signals.push({ name: 'unverified_phone', score: 10, weight: 10 })
}
```

#### 2. Behavior Signals (20-40 points)

```typescript
// Rapid posting (24 hours)
if (adsCreatedLast24h > 10) {
  score = min(100, (adsCreatedLast24h / 30) * 100)
  signals.push({ name: 'rapid_posting_24h', score, weight: 20 })
}

// Rapid messaging
if (messagesLast1h > 20) {
  score = min(100, (messagesLast1h / 50) * 100)
  signals.push({ name: 'rapid_messaging', score, weight: 15 })
}
```

#### 3. Community Feedback (30 points)

```typescript
// User reports
if (reportsReceived > 0) {
  score = min(100, (reportsReceived / 10) * 100)
  signals.push({ name: 'user_reports', score, weight: 30 })
}
```

#### 4. Enforcement History (20-40 points)

```typescript
// Previous warnings
if (previousWarnings > 0) {
  score = min(100, previousWarnings * 25)
  signals.push({ name: 'previous_warnings', score, weight: 20 })
}

// Previous temp bans
if (previousTempBans > 0) {
  score = min(100, previousTempBans * 40)
  signals.push({ name: 'previous_temp_bans', score, weight: 40 })
}

// Ban evasion (previous permanent bans)
if (previousPermanentBans > 0) {
  signals.push({ name: 'ban_evasion', score: 100, weight: 100 })
}
```

#### 5. Device & Network Signals (15-25 points)

```typescript
// Device sharing (> 5 users per device)
if (deviceCount > 5) {
  score = min(100, (deviceCount / 10) * 100)
  signals.push({ name: 'device_sharing', score, weight: 20 })
}

// Country hopping (VPN abuse)
if (countryChangesLast7d > 3) {
  score = min(100, (countryChangesLast7d / 5) * 100)
  signals.push({ name: 'country_hopping', score, weight: 25 })
}
```

#### 6. Content Signals (20-25 points)

```typescript
// Duplicate description
if (duplicateDescriptionCount > 1) {
  score = min(100, (duplicateDescriptionCount / 10) * 100)
  signals.push({ name: 'duplicate_description', score, weight: 25 })
}

// Duplicate images (stolen product photos)
if (duplicateImageCount > 0) {
  score = min(100, (duplicateImageCount / 5) * 100)
  signals.push({ name: 'duplicate_images', score, weight: 20 })
}
```

#### 7. Price Signals (15 points)

```typescript
// Price too low (< 30% of category average)
if (priceRatio < 0.3) {
  score = min(100, (0.3 - priceRatio) / 0.3 * 100)
  signals.push({ name: 'price_too_low', score, weight: 15 })
}
```

### Score Decay (Good Behavior Rewards)

Users with good behavior see their scores decrease over time:

```typescript
// After 7 days of good behavior, decay 2 points/day
if (daysSinceLastViolation >= 7) {
  decayAmount = (daysSinceLastViolation - 7) * 2
  newScore = max(0, currentScore - decayAmount)
}
```

**Example**:
- Day 0: Score 75 (high risk)
- Day 7: Score 75 (monitoring period)
- Day 14: Score 61 (decayed 14 points)
- Day 30: Score 29 (back to low risk)

### Ad-Specific Scoring

Ads inherit user's fraud score plus their own signals:

```typescript
adScore = adSignals + (userScore * 0.6)  // Max 60 points from user
```

**Ad Signals**:
- Price outliers (15 points)
- Duplicate content (25 points)
- Duplicate images (20 points)

---

## Decision Engine

The decision engine translates fraud scores into enforcement actions using a 3-level progressive system.

### Decision Flow

```
┌─────────────────────────────────────────────────────────────┐
│               FRAUD SCORE CALCULATED                         │
│                    (0-100 scale)                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    0-30 │        31-60 │        61-80 │     81-100
         ↓             ↓             ↓          ↓
   ┌─────────┐   ┌──────────┐  ┌─────────┐  ┌───────────┐
   │   LOW   │   │  MEDIUM  │  │  HIGH   │  │ CRITICAL  │
   │ No      │   │  Show    │  │ Level 1 │  │ Level 2/3 │
   │ Action  │   │  Buyer   │  │ Soft    │  │ Temp Ban  │
   │         │   │ Warnings │  │Restrict │  │ + Review  │
   └─────────┘   └──────────┘  └────┬────┘  └─────┬─────┘
                                     │             │
                                     ↓             ↓
                              ┌──────────────────────────┐
                              │   REVIEW QUEUE           │
                              │   (Manual Admin Review)  │
                              └──────────────────────────┘
```

### Risk Level Actions

#### Low Risk (0-30)
```typescript
return {
  action: 'none',
  reason: 'Low fraud risk. Continue monitoring.',
  requiresManualReview: false,
  notifyUser: false
}
```

**No user impact**. Silent monitoring continues.

#### Medium Risk (31-60)
```typescript
return {
  action: 'none', // No seller punishment
  restrictions: {
    buyerWarningEnabled: true // Show safety tips to buyers
  },
  requiresManualReview: false,
  notifyUser: false // Don't tip off seller
}
```

**Buyer sees**: "⚠️ Safety Tip: Always meet in public, inspect items before payment."

**Seller sees**: Nothing (they don't know they're flagged)

**Escalation**: If 2+ previous warnings → Level 1

#### High Risk (61-80) → Level 1: Soft Restriction
```typescript
return {
  action: 'soft_restriction',
  level: 1,
  restrictions: {
    canPost: true,
    canMessage: true,
    reducedVisibility: true, // Ads show lower in search
    requireVerification: true // May need phone/ID verification
  },
  requiresManualReview: true, // Queue for admin
  notifyUser: true // Warn user
}
```

**User Impact**:
- Ads appear lower in search results
- May be asked to verify phone/email
- Receives warning notification

**Admin Queue**: Added for review (medium priority)

**Escalation**: If previous temp bans → Level 2

#### Critical Risk (81-100) → Level 2: Temporary Ban
```typescript
return {
  action: 'temp_ban',
  level: 2,
  durationHours: calculateDuration(context), // 24-72 hours
  restrictions: {
    canPost: false,
    canMessage: false,
    adsHidden: true
  },
  requiresManualReview: true, // MANDATORY
  notifyUser: true
}
```

**Ban Duration**:
- First offense: 24 hours
- Second offense: 48 hours
- Third+ offense: 72 hours (max)

**User Impact**:
- Cannot post new ads
- Cannot send messages
- Existing ads hidden
- Receives email/notification explaining ban

**Admin Queue**: Added for review (high priority)

**Escalation**: If 2+ previous temp bans → Level 3

### Level 3: Permanent Ban Candidate

**CRITICAL**: System NEVER makes permanent ban decision alone.

#### Permanent Ban Criteria (ALL must be true)

```typescript
function checkPermanentBanCriteria(context) {
  return (
    context.currentScore >= 85 &&
    context.reportsReceived >= 3 &&
    context.previousWarnings >= 2 &&
    context.previousTempBans >= 2 &&
    context.daysSinceLastViolation <= 30 // Still actively offending
  )
}
```

If ALL criteria met:

```typescript
return {
  action: 'review_required',
  level: 3,
  reason: 'User meets permanent ban criteria. URGENT manual review required.',
  restrictions: {
    canPost: false,
    canMessage: false,
    adsHidden: true
  },
  durationHours: 72, // Suspended while under review
  requiresManualReview: true, // MANDATORY HUMAN DECISION
  permanentBanCandidate: true
}
```

**Admin Process**:
1. Review queue shows "PERMANENT BAN CANDIDATE" (urgent priority)
2. Admin reviews all evidence:
   - Fraud score history
   - All events (ads, messages, reports)
   - Previous enforcement actions
   - User's appeal (if any)
3. Admin makes final decision:
   - **Approve permanent ban**: Requires detailed reason (min 50 chars)
   - **Reject (false positive)**: Lift restrictions, clear score
   - **Downgrade to temp ban**: More time to investigate

**Audit**: All permanent bans logged to immutable `fraud_audit_logs`

### Ad Enforcement Decisions

```typescript
async makeAdEnforcementDecision(adScore, userScore) {
  if (adScore >= 80) {
    return { action: 'hide', requiresReview: true }
  }
  
  if (adScore >= 60) {
    return { action: 'reduce_visibility', requiresReview: true }
  }
  
  if (adScore >= 35 || userScore >= 50) {
    return { action: 'publish_with_warning', requiresReview: false }
  }
  
  return { action: 'publish', requiresReview: false }
}
```

---

## Event Tracking

### User Events

#### Account Creation
```typescript
await trackAccountCreation(userId, ipAddress, deviceFingerprint, userAgent)
```

**Captured**:
- IP address (fraud_ip_reputation)
- Device fingerprint hash (fraud_device_fingerprints)
- Country code (GeoIP lookup)
- User agent

**Fraud Use**: New account detection, device/IP pattern analysis

#### Login
```typescript
await trackLogin(userId, ipAddress, deviceFingerprint, countryCode, userAgent)
```

**Checks**:
- IP change detection
- Country change detection (VPN hopping)
- Device fingerprint tracking

**Triggers**:
- `ip_change` event if IP different from last login
- `country_change` event if country different

#### Email/Phone Verification
```typescript
await trackEmailVerification(userId)
await trackPhoneVerification(userId)
```

**Fraud Use**: Verified accounts get lower fraud scores

### Ad Events

#### Ad Creation
```typescript
await trackAdCreation(
  adId,
  userId,
  categoryId,
  price,
  description,
  imageHashes,
  ipAddress
)
```

**Captured**:
- Price amount
- Category ID
- Description hash (SHA-256 of normalized text)
- Image perceptual hashes (for duplicate detection)
- Description length
- IP address

**Pattern Detection**:
- Add to `fraud_content_patterns` (description + images)
- Check for duplicates across users
- Flag if content reused

**Velocity Tracking**:
- Increment user's 24h ad count
- Increment user's 7d ad count
- Flag if exceeds thresholds

#### Price Change
```typescript
await trackPriceChange(adId, userId, oldPrice, newPrice)
```

**Captured**:
- Price delta (absolute change)
- Percent change

**Fraud Signals**:
- Frequent price changes (manipulation)
- Dramatic price drops (bait-and-switch)

### Messaging Events (Privacy-Safe)

#### Message Sent
```typescript
// Detect patterns WITHOUT storing content
const patterns = detectOffPlatformPatterns(messageText)

await trackMessageSent(
  senderId,
  recipientId,
  conversationId,
  adId,
  patterns // ONLY patterns, not content
)
```

**Pattern Detection** (server-side regex):

```typescript
function detectOffPlatformPatterns(text: string): string[] {
  const patterns = []
  
  // Phone numbers
  if (/\b\d{10,15}\b/.test(text)) {
    patterns.push('phone_number')
  }
  
  // Email addresses
  if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text)) {
    patterns.push('email')
  }
  
  // WhatsApp
  if (/whatsapp|wa\.me/i.test(text)) {
    patterns.push('whatsapp_mention')
  }
  
  // Telegram
  if (/telegram|t\.me/i.test(text)) {
    patterns.push('telegram_mention')
  }
  
  return patterns
}
```

**CRITICAL**: **Message content is NEVER stored**. Only pattern flags.

**Fraud Use**:
- Detect scammers trying to move off-platform
- Flag excessive off-platform requests
- Does NOT read message content for training

### Community Feedback

#### User Report
```typescript
await trackUserReport(
  reporterId,
  reportedUserId,
  reason, // 'scam', 'fake_ad', 'harassment', etc.
  details,
  evidenceUrls,
  reportedAdId?
)
```

**Triggers**:
- Immediate fraud score recalculation
- If 3+ reports → add to review queue

#### User Block
```typescript
await trackUserBlock(blockerId, blockedUserId)
```

**Fraud Use**: Multiple blocks from different users = fraud signal

---

## Admin Tools

### Review Queue API

#### GET `/admin/fraud/review-queue`

**Query Parameters**:
- `priority`: Filter by priority (low/medium/high/urgent)
- `status`: Filter by status (pending/in_review/completed)
- `limit`: Results per page (default: 20)

**Response**:
```json
{
  "items": [
    {
      "id": "review-123",
      "userId": "user-456",
      "userEmail": "suspect@example.com",
      "priority": "high",
      "fraudScore": 78,
      "reportCount": 4,
      "reviewReason": "multiple_reports",
      "evidence": {
        "signals": ["rapid_posting", "duplicate_content"],
        "recentAds": 25,
        "verificationStatus": "unverified"
      },
      "createdAt": "2026-01-16T10:30:00Z",
      "hoursWaiting": 5.2
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 20
  }
}
```

#### GET `/admin/fraud/review-queue/:reviewId`

Returns detailed evidence for review:

```json
{
  "reviewId": "review-123",
  "user": {
    "id": "user-456",
    "email": "suspect@example.com",
    "username": "suspect_user",
    "createdAt": "2025-12-01T00:00:00Z",
    "verificationStatus": {
      "email": false,
      "phone": false
    }
  },
  "fraudScore": {
    "current": 78,
    "history": [
      { "score": 45, "date": "2026-01-10" },
      { "score": 78, "date": "2026-01-15" }
    ],
    "riskLevel": "high",
    "topSignals": [
      { "name": "rapid_posting", "score": 85, "weight": 20 },
      { "name": "duplicate_content", "score": 70, "weight": 25 }
    ]
  },
  "activity": {
    "adsCreated": 45,
    "adsLast24h": 12,
    "messagesLast24h": 25
  },
  "reports": [
    {
      "reporterId": "user-789",
      "reason": "scam",
      "details": "Selling fake items",
      "reportedAt": "2026-01-14T00:00:00Z"
    }
  ],
  "enforcementHistory": [
    {
      "action": "warning",
      "reason": "High posting velocity",
      "appliedAt": "2026-01-10T00:00:00Z"
    }
  ],
  "deviceNetwork": {
    "deviceCount": 3,
    "ipCount": 8,
    "vpnDetected": true
  }
}
```

#### POST `/admin/fraud/review-queue/:reviewId/complete`

Admin completes review with decision:

**Request**:
```json
{
  "decision": "temp_ban",
  "reason": "Confirmed fraudulent activity based on multiple reports and pattern analysis.",
  "durationHours": 72
}
```

**Decision Options**:
- `no_action`: False positive, no action needed
- `warning`: Send warning notification
- `soft_restriction`: Apply Level 1 restrictions
- `temp_ban`: Apply Level 2 temporary ban
- `permanent_ban`: **Requires detailed reason (50+ chars)**
- `false_positive`: Clear fraud score, lift restrictions

**Response**:
```json
{
  "success": true,
  "reviewId": "review-123",
  "decision": "temp_ban",
  "appliedBy": "admin-789",
  "appliedAt": "2026-01-16T15:00:00Z"
}
```

### Enforcement Management

#### GET `/admin/fraud/enforcement/:userId`

View user's enforcement history.

#### POST `/admin/fraud/enforcement/:userId/apply`

Manually apply enforcement action (admin override):

**Request**:
```json
{
  "actionType": "soft_restriction",
  "reason": "Manual review determined user is high risk",
  "restrictions": {
    "canPost": true,
    "canMessage": true,
    "reducedVisibility": true
  }
}
```

#### PUT `/admin/fraud/enforcement/:actionId/lift`

Lift enforcement action (appeal approved):

**Request**:
```json
{
  "reason": "User provided proof of legitimate business. Appeal approved."
}
```

### Appeals Management

#### GET `/admin/fraud/appeals`

Get pending appeals.

#### POST `/admin/fraud/appeals/:appealId/review`

Review user appeal:

**Request**:
```json
{
  "decision": "approved",
  "reviewNotes": "User provided legitimate proof. Lifting restrictions and clearing fraud score."
}
```

### Analytics

#### GET `/admin/fraud/stats?days=7`

Fraud detection statistics:

```json
{
  "period": "last_7_days",
  "reviewQueue": {
    "pending": 15,
    "inReview": 8,
    "completed": 127
  },
  "actions": {
    "warnings": 45,
    "softRestrictions": 23,
    "tempBans": 12,
    "permanentBans": 2
  },
  "topSignals": [
    { "name": "rapid_posting", "count": 67 },
    { "name": "duplicate_content", "count": 45 }
  ],
  "riskDistribution": {
    "low": 8542,
    "medium": 234,
    "high": 45,
    "critical": 12
  }
}
```

---

## Background Jobs

### Score Calculation Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| `recalculateActiveUserScores` | Every 6 hours | Recalculate scores for users with recent activity |
| `applyScoreDecay` | Daily at 4 AM | Apply score decay for good behavior (2 pts/day) |

### Pattern Detection Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| `detectMultiAccountFraud` | Every 12 hours | Find devices with 5+ accounts (fraud rings) |
| `detectContentDuplication` | Every 8 hours | Find duplicate descriptions across users |
| `detectImageReuse` | Every 8 hours | Find stolen product images |

### Monitoring Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| `escalateStaleReviews` | Every hour | Escalate reviews waiting > 24h |
| `sendDailyReviewSummary` | Daily at 9 AM | Email admins review queue status |
| `monitorFraudSpike` | Every 30 minutes | Alert if fraud activity spikes |
| `checkReviewQueueHealth` | Every 30 minutes | Alert if queue depth > 50 |

### Maintenance Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| `expireTemporaryBans` | Every 15 minutes | Auto-expire temp bans past expiry time |
| `archiveOldEvents` | Daily at 2 AM | Archive events older than 90 days |
| `cleanupDeviceFingerprints` | Weekly (Sunday 3 AM) | Remove old, inactive device records |

---

## Deployment Guide

### Prerequisites

- PostgreSQL 12+ (JSONB support required)
- Node.js 16+
- NestJS framework
- Redis (optional, for caching)

### Step 1: Database Setup

```bash
# Connect to PostgreSQL
psql -U postgres -d your_database

# Run schema migration
\i database/schema/marketplace-fraud-detection.sql

# Verify tables created
\dt fraud_*
```

**Expected tables** (18 total):
- `fraud_user_events`
- `fraud_ad_events`
- `fraud_messaging_events`
- `fraud_feedback_events`
- `fraud_user_scores`
- `fraud_score_history`
- `fraud_ad_scores`
- `fraud_enforcement_actions`
- `fraud_review_queue`
- `fraud_appeals`
- `fraud_audit_logs`
- `fraud_device_fingerprints`
- `fraud_ip_reputation`
- `fraud_content_patterns`
- `fraud_config`

### Step 2: Configure Services

Add to your NestJS module:

```typescript
// fraud.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MarketplaceFraudScoringService } from './marketplace-fraud-scoring.service';
import { MarketplaceFraudDecisionService } from './marketplace-fraud-decision.service';
import { MarketplaceFraudEventService } from './marketplace-fraud-event.service';
import { MarketplaceFraudAdminController } from './marketplace-fraud-admin.controller';
import { MarketplaceFraudJobsService } from './marketplace-fraud-jobs.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [MarketplaceFraudAdminController],
  providers: [
    MarketplaceFraudScoringService,
    MarketplaceFraudDecisionService,
    MarketplaceFraudEventService,
    MarketplaceFraudJobsService,
  ],
  exports: [
    MarketplaceFraudScoringService,
    MarketplaceFraudDecisionService,
    MarketplaceFraudEventService,
  ],
})
export class FraudModule {}
```

### Step 3: Integrate Event Tracking

#### Ad Creation Hook

```typescript
// ads.service.ts
import { MarketplaceFraudEventService } from '../fraud/marketplace-fraud-event.service';

async createAd(userId, adData, ipAddress) {
  // Create ad
  const ad = await this.adsRepository.save(adData);
  
  // Track event
  await this.fraudEventService.trackAdCreation(
    ad.id,
    userId,
    ad.categoryId,
    ad.price,
    ad.description,
    ad.imageHashes, // Perceptual hashes of images
    ipAddress
  );
  
  // Calculate ad fraud score
  const userScore = await this.getUser FraudScore(userId);
  const adScoreResult = await this.fraudScoringService.calculateAdFraudScore(
    {
      adId: ad.id,
      userId,
      categoryId: ad.categoryId,
      priceAmount: ad.price,
      descriptionHash: hashContent(ad.description),
      imagePerceptualHashes: ad.imageHashes,
      createdAt: new Date()
    },
    userScore
  );
  
  // Make enforcement decision
  const decision = await this.fraudDecisionService.makeAdEnforcementDecision(
    adScoreResult.finalScore,
    userScore
  );
  
  // Apply decision
  if (decision.action === 'hide') {
    ad.status = 'hidden';
    await this.adsRepository.save(ad);
  } else if (decision.action === 'reduce_visibility') {
    ad.searchBoost = 0.3; // Lower in search
    await this.adsRepository.save(ad);
  }
  
  return ad;
}
```

#### Message Hook

```typescript
// messages.service.ts
async sendMessage(senderId, recipientId, conversationId, adId, messageText) {
  // Save message
  const message = await this.messagesRepository.save({
    senderId,
    recipientId,
    text: messageText
  });
  
  // Detect off-platform patterns (server-side only)
  const patterns = this.fraudEventService.detectOffPlatformPatterns(messageText);
  
  // Track event (NO message content stored)
  await this.fraudEventService.trackMessageSent(
    senderId,
    recipientId,
    conversationId,
    adId,
    patterns // Only pattern flags
  );
  
  return message;
}
```

#### User Report Hook

```typescript
// reports.service.ts
async reportUser(reporterId, reportedUserId, reason, details, evidenceUrls, adId?) {
  // Save report
  const report = await this.reportsRepository.save({
    reporterId,
    reportedUserId,
    reason,
    details
  });
  
  // Track feedback event
  await this.fraudEventService.trackUserReport(
    reporterId,
    reportedUserId,
    reason,
    details,
    evidenceUrls,
    adId
  );
  
  // Trigger fraud score recalculation
  // This will be done by background job
  
  return report;
}
```

### Step 4: Admin Dashboard Setup

Add admin routes to your app:

```typescript
// app.module.ts
import { FraudModule } from './modules/fraud/fraud.module';

@Module({
  imports: [
    // ... other modules
    FraudModule,
  ],
})
export class AppModule {}
```

Access admin endpoints:
- `GET /admin/fraud/review-queue` - Review queue
- `GET /admin/fraud/stats` - Analytics dashboard
- `POST /admin/fraud/review-queue/:id/complete` - Complete review
- `GET /admin/fraud/appeals` - User appeals

### Step 5: Environment Variables

```env
# Fraud Detection Configuration
FRAUD_SCORE_THRESHOLD_HIGH=75
FRAUD_SCORE_THRESHOLD_CRITICAL=85
FRAUD_TEMP_BAN_DURATION_HOURS=24
FRAUD_SCORE_DECAY_RATE=2
FRAUD_REVIEW_QUEUE_ALERT_THRESHOLD=50

# External Services (Optional)
IP_QUALITY_SCORE_API_KEY=your_api_key # For VPN/proxy detection
PERCEPTUAL_HASH_SERVICE_URL=http://localhost:3001 # For image duplicate detection
```

### Step 6: Testing

```bash
# Run unit tests
npm test src/modules/fraud/**/*.spec.ts

# Test scoring engine
npm test marketplace-fraud-scoring.service.spec.ts

# Test decision engine
npm test marketplace-fraud-decision.service.spec.ts

# Test event tracking
npm test marketplace-fraud-event.service.spec.ts
```

### Step 7: Monitoring

Set up monitoring for:

1. **Review queue depth**: Alert if > 50 items
2. **Stale reviews**: Alert if any review waiting > 48 hours
3. **Fraud spike**: Alert if high-risk users > 2x average
4. **Job failures**: Alert if background jobs fail
5. **Database errors**: Monitor fraud table write failures

**Recommended tools**:
- Prometheus + Grafana for metrics
- Sentry for error tracking
- PagerDuty for critical alerts

---

## Scaling Considerations

### For 1 Million Users

**Current design handles**:
- Database: PostgreSQL with proper indexes
- Background jobs: Cron-based (sufficient for < 1M users)
- Review queue: Manual admin review

**Bottlenecks**:
- None expected at this scale

### For 10 Million+ Users

#### 1. Database Partitioning

Partition large tables by date:

```sql
-- Partition fraud_user_events by month
CREATE TABLE fraud_user_events_2026_01 PARTITION OF fraud_user_events
FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE fraud_user_events_2026_02 PARTITION OF fraud_user_events
FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

#### 2. Move to Message Queue

Replace cron jobs with distributed queue (Bull, RabbitMQ):

```typescript
// Instead of cron
@Cron('0 */6 * * *')
async recalculateScores() { ... }

// Use message queue
@Process('recalculate-score')
async processScoreCalculation(job: Job) {
  const userId = job.data.userId;
  // Calculate score
}

// Producer (triggered by events)
await this.scoreQueue.add('recalculate-score', { userId });
```

#### 3. Redis Caching

Cache fraud scores for hot users:

```typescript
// Check cache first
const cachedScore = await redis.get(`fraud:score:${userId}`);
if (cachedScore) return JSON.parse(cachedScore);

// Calculate and cache
const score = await this.calculateScore(userId);
await redis.setex(`fraud:score:${userId}`, 3600, JSON.stringify(score));
```

#### 4. Read Replicas

Use PostgreSQL read replicas for:
- Admin dashboard queries
- Analytics queries
- Historical data queries

**Write to primary**:
- fraud_enforcement_actions
- fraud_audit_logs

**Read from replicas**:
- fraud_review_queue (listing)
- fraud_score_history
- Analytics queries

#### 5. Event Archival

Move old events to cold storage (S3, BigQuery):

```sql
-- Archive events older than 90 days
INSERT INTO fraud_user_events_archive
SELECT * FROM fraud_user_events
WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM fraud_user_events
WHERE created_at < NOW() - INTERVAL '90 days';
```

#### 6. AI/ML Pipeline (Optional)

For very large scale, add ML pipeline:

```
Events → Kafka → Spark → ML Model → Predictions → Review Queue
```

**CRITICAL**: AI predictions are **suggestions only**. Humans make final decisions.

---

## AI Safety Guidelines

### What AI CAN Do

✅ **Pattern Detection**:
- Cluster similar fraudulent accounts
- Identify behavior anomalies
- Detect content duplication
- Predict risk trends

✅ **Feature Engineering**:
- Extract meaningful signals from events
- Calculate similarity scores
- Generate embeddings for content

✅ **Optimization**:
- Tune signal weights automatically
- Optimize review queue prioritization
- Predict false positive likelihood

### What AI MUST NOT Do

❌ **Make Final Ban Decisions**: Humans must approve all permanent bans  
❌ **Explain Fraud Rules**: Don't expose detection logic to users  
❌ **Read Private Messages**: Only pattern flags, never content  
❌ **Expose Exact Scoring Logic**: Keep weights and thresholds confidential  
❌ **Auto-Escalate Without Review**: Critical actions need human oversight  

### Safe AI Architecture

```
┌──────────────────┐
│  Event Stream    │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  ML Model        │
│  (Pattern        │
│   Detection)     │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  Risk Score      │ ← AI suggests score
│  (0-100)         │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  Review Queue    │ ← Human reviews
│  (Admin)         │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  Final Decision  │ ← Human decides
│  (Ban/No Ban)    │
└──────────────────┘
```

**Key principle**: AI finds patterns → Humans make decisions

---

## Security & Privacy

### Data Protection

1. **No Message Content Storage**: Only pattern flags
2. **Hashed Device Fingerprints**: SHA-256, irreversible
3. **Minimal PII**: Store only what's needed for fraud detection
4. **Audit Trail**: Immutable logs for compliance
5. **Access Control**: Admin endpoints require authentication

### GDPR Compliance

- **Right to Access**: Users can request fraud data via API
- **Right to Erasure**: Anonymize data on account deletion
- **Right to Explanation**: Provide clear reasons for enforcement
- **Data Minimization**: Only collect necessary data
- **Retention Policy**: 90 days for events, forever for audit logs

### Admin Accountability

- All admin actions logged to `fraud_audit_logs`
- Permanent bans require admin ID + reason
- Appeal process with full evidence
- Regular audit reviews

---

## Conclusion

This fraud detection system provides:

✅ **Comprehensive Detection**: 15+ fraud signals combined  
✅ **Progressive Enforcement**: 3-level system with human oversight  
✅ **No False Positive Bans**: Permanent bans require manual approval  
✅ **Full Audit Trail**: Immutable logs for compliance  
✅ **User-Friendly**: Appeal system, clear explanations  
✅ **Scalable**: Handles millions of users  
✅ **Privacy-Safe**: No message content storage  
✅ **AI-Assisted**: Pattern detection without auto-bans  

### Next Steps

1. **Deploy database schema**: Run migration script
2. **Integrate event tracking**: Hook into ad/message services
3. **Configure background jobs**: Enable cron scheduler
4. **Set up admin dashboard**: Deploy admin routes
5. **Train admin team**: Review process and tools
6. **Monitor and tune**: Adjust thresholds based on false positive rate

**Remember**: The goal is to reduce fraud while protecting legitimate users. When in doubt, err on the side of caution and queue for human review.

---

## Quick Reference

### Fraud Score Ranges

| Score | Risk | Action |
|-------|------|--------|
| 0-30 | Low | Monitor |
| 31-60 | Medium | Buyer warnings |
| 61-80 | High | Soft restrictions + review |
| 81-100 | Critical | Temp ban + mandatory review |

### Signal Weights (Default)

| Signal | Weight | Max Impact |
|--------|--------|-----------|
| New account | 15 | Low |
| Rapid posting | 20 | Medium |
| Duplicate content | 25 | High |
| User reports | 30 | High |
| Previous bans | 40 | Critical |

### Enforcement Levels

| Level | Type | Duration | Requires Review |
|-------|------|----------|-----------------|
| 1 | Soft restriction | Until improved | Yes |
| 2 | Temporary ban | 24-72h | Yes |
| 3 | Permanent ban | Permanent | **MANDATORY** |

### Admin Endpoints

- `GET /admin/fraud/review-queue` - Pending reviews
- `GET /admin/fraud/review-queue/:id` - Review details
- `POST /admin/fraud/review-queue/:id/complete` - Complete review
- `GET /admin/fraud/enforcement/:userId` - User history
- `GET /admin/fraud/appeals` - Pending appeals
- `GET /admin/fraud/stats` - Analytics

---

**System Status**: ✅ Production-ready  
**Last Updated**: January 16, 2026  
**Version**: 1.0.0
