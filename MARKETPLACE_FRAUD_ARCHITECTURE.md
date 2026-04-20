# Marketplace Fraud Detection - Visual Architecture

## System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         FRONTEND APPLICATION                                 │
│                      (React Web + React Native Mobile)                       │
│                                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   Post     │  │   Send     │  │   Report   │  │   View     │            │
│  │    Ad      │  │  Message   │  │    User    │  │   Ads      │            │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘            │
│        │               │               │               │                    │
└────────┼───────────────┼───────────────┼───────────────┼────────────────────┘
         │               │               │               │
         │ POST          │ POST          │ POST          │ GET
         │ /ads          │ /messages     │ /reports      │ /ads
         │               │               │               │
         ↓               ↓               ↓               ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         NESTJS BACKEND API                                   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                     JWT AUTHENTICATION                                 │ │
│  └───────────────────────────┬────────────────────────────────────────────┘ │
│                              │                                               │
│  ┌───────────────────────────▼────────────────────────────────────────────┐ │
│  │                                                                         │ │
│  │                  FRAUD DETECTION PIPELINE                               │ │
│  │                                                                         │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │ │
│  │  │ 1. EVENT TRACKING SERVICE                                        │ │ │
│  │  │                                                                   │ │ │
│  │  │    trackAdCreation()     ─────────┐                              │ │ │
│  │  │    trackMessageSent()     ────┐   │                              │ │ │
│  │  │    trackUserReport()      ─┐  │   │                              │ │ │
│  │  │    trackLogin()           ─┼──┼───┼──> fraud_*_events tables    │ │ │
│  │  │                            │  │   │                              │ │ │
│  │  │    • Device fingerprinting │  │   │                              │ │ │
│  │  │    • IP tracking           │  │   │                              │ │ │
│  │  │    • Content hashing       │  │   │                              │ │ │
│  │  │    • Pattern detection     │  │   │                              │ │ │
│  │  └────────────────────────────┼──┼───┼──────────────────────────────┘ │ │
│  │                               │  │   │                                 │ │
│  │                               ↓  ↓   ↓                                 │ │
│  │  ┌───────────────────────────────────────────────────────────────────┐ │ │
│  │  │ 2. FRAUD SCORING ENGINE                                           │ │ │
│  │  │                                                                    │ │ │
│  │  │    calculateUserFraudScore()                                      │ │ │
│  │  │    ├─ Account signals (15-25 pts)                                │ │ │
│  │  │    ├─ Behavior signals (20-40 pts)                               │ │ │
│  │  │    ├─ Community signals (30 pts)                                 │ │ │
│  │  │    ├─ Enforcement history (20-40 pts)                            │ │ │
│  │  │    ├─ Device/network signals (15-25 pts)                         │ │ │
│  │  │    └─ Content signals (20-25 pts)                                │ │ │
│  │  │                                                                    │ │ │
│  │  │    → Weighted average → Final score (0-100)                      │ │ │
│  │  │    → Risk level: low | medium | high | critical                  │ │ │
│  │  └────────────────────────┬──────────────────────────────────────────┘ │ │
│  │                            │                                            │ │
│  │                            ↓                                            │ │
│  │  ┌───────────────────────────────────────────────────────────────────┐ │ │
│  │  │ 3. DECISION ENGINE                                                │ │ │
│  │  │                                                                    │ │ │
│  │  │    makeEnforcementDecision()                                      │ │ │
│  │  │                                                                    │ │ │
│  │  │    Score 0-30    → No action (monitor)                           │ │ │
│  │  │    Score 31-60   → Buyer warnings (no seller impact)             │ │ │
│  │  │    Score 61-80   → LEVEL 1: Soft restrictions + review           │ │ │
│  │  │    Score 81-100  → LEVEL 2: Temp ban (24-72h) + review           │ │ │
│  │  │    All criteria  → LEVEL 3: Perm ban candidate + URGENT review   │ │ │
│  │  │                                                                    │ │ │
│  │  └────────────┬────────────────────┬────────────────────────────────┘ │ │
│  │               │                    │                                   │ │
│  │               ↓                    ↓                                   │ │
│  │  ┌──────────────────────┐  ┌────────────────────────────────────────┐ │ │
│  │  │ ENFORCEMENT          │  │ REVIEW QUEUE                           │ │ │
│  │  │ EXECUTOR             │  │                                        │ │ │
│  │  │                      │  │ • Add to queue                         │ │ │
│  │  │ • Apply restrictions │  │ • Set priority                         │ │ │
│  │  │ • Hide ads           │  │ • Assign evidence                      │ │ │
│  │  │ • Block messaging    │  │                                        │ │ │
│  │  │ • Send notifications │  │ Urgent → Admin notified                │ │ │
│  │  │ • Log to audit trail │  │ High   → 24h SLA                       │ │ │
│  │  └──────────────────────┘  │ Medium → 48h SLA                       │ │ │
│  │                             │ Low    → 7d SLA                        │ │ │
│  │                             └────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                                                                       │   │
│  │                     ADMIN REVIEW DASHBOARD                            │   │
│  │                                                                       │   │
│  │  GET  /admin/fraud/review-queue         (pending reviews)           │   │
│  │  GET  /admin/fraud/review-queue/:id     (detailed evidence)         │   │
│  │  POST /admin/fraud/review-queue/:id/complete  (make decision)       │   │
│  │  GET  /admin/fraud/enforcement/:userId  (user history)              │   │
│  │  GET  /admin/fraud/appeals              (user appeals)              │   │
│  │  GET  /admin/fraud/stats                (analytics)                 │   │
│  │  GET  /admin/fraud/audit-log            (compliance trail)          │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                                                                       │   │
│  │                     BACKGROUND JOBS (Cron)                            │   │
│  │                                                                       │   │
│  │  Every 6h    → Recalculate fraud scores (active users)              │   │
│  │  Daily 4 AM  → Apply score decay (good behavior rewards)            │   │
│  │  Every 12h   → Detect multi-account fraud (device patterns)         │   │
│  │  Every 8h    → Detect content duplication (text + images)           │   │
│  │  Every 15m   → Expire temporary bans                                │   │
│  │  Every 1h    → Escalate stale reviews                               │   │
│  │  Daily 9 AM  → Send admin team review summary                       │   │
│  │  Every 30m   → Monitor fraud spikes (alert on anomalies)            │   │
│  │  Daily 2 AM  → Archive old events (90 day retention)                │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└────────────────────────────┬─────────────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         POSTGRESQL DATABASE                                  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ EVENT TRACKING (Time-Series Data)                                    │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ fraud_user_events         ← Account, login, IP change events        │   │
│  │ fraud_ad_events           ← Ad creation, edits, price changes        │   │
│  │ fraud_messaging_events    ← Message metadata (NO CONTENT)            │   │
│  │ fraud_feedback_events     ← Reports, blocks from community           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ FRAUD SCORING (Computed Data)                                        │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ fraud_user_scores         ← Current 0-100 score per user             │   │
│  │ fraud_score_history       ← Historical scores (trend analysis)       │   │
│  │ fraud_ad_scores           ← Per-ad fraud scores                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ENFORCEMENT & REVIEW (Action Data)                                   │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ fraud_enforcement_actions ← Warnings, bans, restrictions             │   │
│  │ fraud_review_queue        ← Pending manual reviews                   │   │
│  │ fraud_appeals             ← User appeals                             │   │
│  │ fraud_audit_logs          ← IMMUTABLE compliance trail               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ PATTERN DETECTION (Analysis Data)                                    │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ fraud_device_fingerprints ← Multi-account detection                  │   │
│  │ fraud_ip_reputation       ← VPN/proxy/datacenter tracking            │   │
│  │ fraud_content_patterns    ← Duplicate text/image detection           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ CONFIGURATION (Dynamic Settings)                                     │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ fraud_config              ← Signal weights, thresholds               │   │
│  │                             (adjustable without deployment)          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Fraud Scoring Flow

```
┌─────────────┐
│ User Action │ (creates ad, sends message, gets reported)
└──────┬──────┘
       │
       ↓
┌──────────────────────┐
│ Event Captured       │
│                      │
│ • Timestamp          │
│ • User ID            │
│ • IP address         │
│ • Device fingerprint │
│ • Action metadata    │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────────┐
│ Fraud Signals Evaluated                                  │
│                                                           │
│ ┌─────────────────────┐  ┌─────────────────────┐        │
│ │ Account Signals     │  │ Behavior Signals    │        │
│ │ • New account: 15   │  │ • Rapid posting: 20 │        │
│ │ • Unverified: 20    │  │ • Rapid msg: 15     │        │
│ └─────────────────────┘  └─────────────────────┘        │
│                                                           │
│ ┌─────────────────────┐  ┌─────────────────────┐        │
│ │ Content Signals     │  │ Community Signals   │        │
│ │ • Duplicate: 25     │  │ • Reports: 30       │        │
│ │ • Price: 15         │  │ • Blocks: 10        │        │
│ └─────────────────────┘  └─────────────────────┘        │
│                                                           │
│ ┌─────────────────────┐  ┌─────────────────────┐        │
│ │ History Signals     │  │ Network Signals     │        │
│ │ • Warnings: 20      │  │ • Device share: 20  │        │
│ │ • Bans: 40          │  │ • IP hop: 25        │        │
│ └─────────────────────┘  └─────────────────────┘        │
└──────────────┬───────────────────────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────┐
│ Weighted Score Calculation               │
│                                           │
│ finalScore = Σ(signal × weight) / Σweight│
│                                           │
│ Result: 0-100                             │
└──────────────┬────────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────────────────────────┐
│ Risk Level Determination                                      │
│                                                               │
│ 0-30   → Low      (🟢)                                       │
│ 31-60  → Medium   (🟡)                                       │
│ 61-80  → High     (🟠)                                       │
│ 81-100 → Critical (🔴)                                       │
└──────────────┬───────────────────────────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────────────────────────┐
│ Decision Engine                                               │
│                                                               │
│ IF low      → Monitor only                                   │
│ IF medium   → Show buyer warnings                            │
│ IF high     → Soft restrictions + add to review queue        │
│ IF critical → Temp ban + MANDATORY review                    │
│ IF perm ban criteria → URGENT admin review                   │
└──────────────┬───────────────────────────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────────────────────────┐
│ Enforcement Applied                                           │
│                                                               │
│ • Update fraud_enforcement_actions table                     │
│ • Apply restrictions (hide ads, block messages)              │
│ • Add to fraud_review_queue (if needed)                      │
│ • Send user notification (if applicable)                     │
│ • Log to fraud_audit_logs (IMMUTABLE)                        │
└──────────────────────────────────────────────────────────────┘
```

---

## 3-Level Enforcement System

```
┌──────────────────────────────────────────────────────────────────────┐
│                       FRAUD SCORE CALCULATED                          │
│                            0 ━━━━━━━ 100                             │
└────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────┘
         │             │             │             │             │
    0-30 │        31-60│        61-80│        81-85│        85-100│
   ┌─────▼──────┐ ┌────▼──────┐ ┌───▼──────┐ ┌───▼──────┐ ┌────▼──────┐
   │    LOW     │ │  MEDIUM   │ │   HIGH   │ │ CRITICAL │ │  CRITICAL │
   │            │ │           │ │          │ │          │ │           │
   │ No Action  │ │  Buyer    │ │ LEVEL 1  │ │ LEVEL 2  │ │  LEVEL 3  │
   │            │ │ Warnings  │ │          │ │          │ │           │
   └────────────┘ └───────────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘
                                      │            │             │
                                      ↓            ↓             ↓

┌───────────────────────────────────────────────────────────────────────────┐
│                          LEVEL 1: SOFT RESTRICTION                         │
│                                                                            │
│  Restrictions:                       Impact:                              │
│  ✅ Can post ads                     • Ads show lower in search           │
│  ✅ Can send messages                • May need verification              │
│  ⚠️ Reduced visibility               • Warning notification sent          │
│  ⚠️ Verification required                                                 │
│                                                                            │
│  Review: Added to queue (medium priority)                                │
│  Duration: Until behavior improves                                        │
│  Reversible: Yes (appeal or good behavior)                               │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                         LEVEL 2: TEMPORARY BAN                             │
│                                                                            │
│  Restrictions:                       Impact:                              │
│  ❌ Cannot post ads                  • Account suspended                  │
│  ❌ Cannot send messages             • All ads hidden                     │
│  ❌ All ads hidden                   • Email notification with reason     │
│  ⏱️ Duration: 24-72 hours           • Shows remaining time                │
│                                                                            │
│  Review: MANDATORY admin review (high priority)                          │
│  Duration: Escalates with history:                                        │
│           • 1st offense: 24 hours                                         │
│           • 2nd offense: 48 hours                                         │
│           • 3rd+ offense: 72 hours                                        │
│  Reversible: Yes (appeal or admin override)                              │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                      LEVEL 3: PERMANENT BAN CANDIDATE                      │
│                                                                            │
│  Criteria (ALL must be true):       Process:                             │
│  ✅ Score ≥ 85                       1. Account suspended (72h)           │
│  ✅ Reports ≥ 3 (independent)        2. URGENT admin review               │
│  ✅ Warnings ≥ 2                     3. Admin reviews ALL evidence        │
│  ✅ Temp bans ≥ 2                    4. Admin makes FINAL decision        │
│  ✅ Recent activity (< 30d)          5. Reason required (50+ chars)       │
│                                      6. Logged to audit trail             │
│  Review: MANDATORY HUMAN DECISION (urgent priority)                      │
│  Duration: Suspended until review complete                                │
│  Reversible: Yes (admin decision or appeal)                              │
│                                                                            │
│  🚨 CRITICAL: System NEVER auto-bans. Human approval required.            │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Admin Review Flow

```
┌──────────────────┐
│ User Flagged for │
│ Manual Review    │
└────────┬─────────┘
         │
         ↓
┌────────────────────────────────────────────────────────┐
│ Added to Review Queue                                  │
│                                                         │
│ Priority assigned:                                     │
│ • 🚨 Urgent:  Perm ban candidate, score 90+           │
│ • 🔴 High:    Score 80-89, repeat offenders           │
│ • 🟡 Medium:  Score 60-79, multiple reports           │
│ • 🟢 Low:     General monitoring                       │
└────────┬───────────────────────────────────────────────┘
         │
         ↓
┌────────────────────────────────────────────────────────┐
│ Admin Accesses Review Queue                            │
│                                                         │
│ GET /admin/fraud/review-queue?priority=urgent          │
└────────┬───────────────────────────────────────────────┘
         │
         ↓
┌────────────────────────────────────────────────────────┐
│ Admin Views Evidence                                   │
│                                                         │
│ GET /admin/fraud/review-queue/:reviewId                │
│                                                         │
│ Shows:                                                  │
│ • Fraud score (current + history)                      │
│ • Top signals contributing to score                    │
│ • User activity (ads, messages, reports)               │
│ • Community reports with details                       │
│ • Enforcement history (warnings, bans)                 │
│ • Device/IP patterns (multi-account check)             │
│ • Timeline of events                                   │
└────────┬───────────────────────────────────────────────┘
         │
         ↓
┌────────────────────────────────────────────────────────┐
│ Admin Makes Decision                                   │
│                                                         │
│ POST /admin/fraud/review-queue/:reviewId/complete      │
│                                                         │
│ Options:                                                │
│ 1. no_action       → False positive, clear flags      │
│ 2. warning         → Send warning notification        │
│ 3. soft_restriction → Apply Level 1                   │
│ 4. temp_ban        → Apply Level 2 (specify duration) │
│ 5. permanent_ban   → Requires detailed reason (50+)   │
│ 6. false_positive  → Clear score, lift restrictions   │
└────────┬───────────────────────────────────────────────┘
         │
         ↓
┌────────────────────────────────────────────────────────┐
│ Decision Executed                                      │
│                                                         │
│ • fraud_enforcement_actions table updated             │
│ • Restrictions applied/lifted                          │
│ • User notified (if applicable)                        │
│ • fraud_audit_logs entry created (IMMUTABLE)          │
│ • Review queue status = 'completed'                    │
└────────────────────────────────────────────────────────┘
```

---

## Data Flow: Ad Creation

```
┌───────────────┐
│ User Creates  │
│ New Ad        │
└───────┬───────┘
        │
        ↓
┌─────────────────────────────────────────────────┐
│ POST /ads                                        │
│                                                  │
│ Body: {                                          │
│   title: "iPhone 13 Pro",                       │
│   description: "Like new, no scratches",        │
│   price: 800,                                   │
│   categoryId: "electronics",                    │
│   images: [...]                                 │
│ }                                                │
└───────┬─────────────────────────────────────────┘
        │
        ↓
┌─────────────────────────────────────────────────┐
│ Backend: ads.service.createAd()                 │
│                                                  │
│ 1. Save ad to database                          │
│ 2. Generate image perceptual hashes            │
│ 3. Hash description text                        │
└───────┬─────────────────────────────────────────┘
        │
        ↓
┌─────────────────────────────────────────────────┐
│ fraudEventService.trackAdCreation()             │
│                                                  │
│ • Log to fraud_ad_events                        │
│ • Track content patterns (duplication check)    │
│ • Increment user's ad count (velocity check)    │
└───────┬─────────────────────────────────────────┘
        │
        ↓
┌─────────────────────────────────────────────────┐
│ fraudScoringService.calculateAdFraudScore()     │
│                                                  │
│ • Check price vs. category average              │
│ • Check for duplicate description               │
│ • Check for duplicate images                    │
│ • Inherit user's fraud score (× 0.6)            │
│ • Calculate final ad score (0-100)              │
└───────┬─────────────────────────────────────────┘
        │
        ↓
┌─────────────────────────────────────────────────┐
│ fraudDecisionService.makeAdEnforcementDecision()│
│                                                  │
│ • Score < 35:  Publish normally                 │
│ • Score 35-59: Publish with buyer warning       │
│ • Score 60-79: Reduce visibility + review       │
│ • Score 80+:   Hide ad + urgent review          │
└───────┬─────────────────────────────────────────┘
        │
        ↓
┌─────────────────────────────────────────────────┐
│ Enforcement Applied                             │
│                                                  │
│ • Update ad status (published/hidden/flagged)   │
│ • Set visibility boost (1.0 / 0.3 / 0.0)        │
│ • Add to review queue (if needed)               │
│ • Log to fraud_audit_logs                       │
└───────┬─────────────────────────────────────────┘
        │
        ↓
┌─────────────────────────────────────────────────┐
│ Response to User                                │
│                                                  │
│ 200 OK: { adId, status: "published" }          │
│ or                                               │
│ 200 OK: { adId, status: "under_review" }       │
└─────────────────────────────────────────────────┘
```

---

## Data Flow: User Report

```
┌───────────────┐
│ User Reports  │
│ Another User  │
└───────┬───────┘
        │
        ↓
┌─────────────────────────────────────────────────┐
│ POST /reports                                    │
│                                                  │
│ Body: {                                          │
│   reportedUserId: "user-456",                   │
│   reason: "scam",                               │
│   details: "Fake items, won't refund",          │
│   evidenceUrls: ["screenshot.jpg"],             │
│   adId: "ad-789" (optional)                     │
│ }                                                │
└───────┬─────────────────────────────────────────┘
        │
        ↓
┌─────────────────────────────────────────────────┐
│ Backend: reports.service.createReport()         │
│                                                  │
│ 1. Save report to reports table                 │
│ 2. Validate reporter is not abusing system      │
└───────┬─────────────────────────────────────────┘
        │
        ↓
┌─────────────────────────────────────────────────┐
│ fraudEventService.trackUserReport()             │
│                                                  │
│ • Log to fraud_feedback_events                  │
│ • Increment reported user's report count        │
└───────┬─────────────────────────────────────────┘
        │
        ↓
┌─────────────────────────────────────────────────┐
│ Trigger Fraud Score Recalculation               │
│                                                  │
│ • Queued for background job (or immediate)      │
│ • fraudScoringService.calculateUserFraudScore() │
│ • User's score increases (reports signal)       │
└───────┬─────────────────────────────────────────┘
        │
        ↓
┌─────────────────────────────────────────────────┐
│ Check if Action Needed                          │
│                                                  │
│ IF score crossed threshold (e.g., 61 → 75):     │
│   • fraudDecisionService.makeEnforcementDecision()│
│   • Apply new restrictions                       │
│   • Add to review queue (if 3+ reports)         │
└───────┬─────────────────────────────────────────┘
        │
        ↓
┌─────────────────────────────────────────────────┐
│ Response to Reporter                            │
│                                                  │
│ 200 OK: { message: "Report submitted" }        │
│                                                  │
│ (Reporter doesn't see what action was taken)    │
└─────────────────────────────────────────────────┘
```

---

## Database Relationships

```
┌──────────────┐
│    users     │
└───────┬──────┘
        │
        │ 1:N
        ↓
┌──────────────────┐     ┌───────────────────┐
│ fraud_user_events│     │ fraud_user_scores │
│                  │     │                   │
│ • user_id (FK)   │     │ • user_id (FK)    │
│ • event_type     │ ←──→│ • score (0-100)   │
│ • ip_address     │     │ • risk_level      │
│ • device_hash    │     │ • signal_breakdown│
└──────────────────┘     └───────────────────┘
        ↓                         ↓
        │                         │
        ↓                         ↓
┌──────────────────┐     ┌──────────────────────────┐
│ fraud_ad_events  │     │ fraud_enforcement_actions│
│                  │     │                          │
│ • ad_id          │     │ • user_id (FK)           │
│ • user_id (FK)   │     │ • action_type            │
│ • price_amount   │     │ • action_level (1/2/3)   │
│ • content_hash   │     │ • reason                 │
└──────────────────┘     │ • restrictions (JSONB)   │
                          │ • starts_at / expires_at │
                          │ • applied_by (admin)     │
                          └────────┬─────────────────┘
                                   │
                                   │ 1:N
                                   ↓
                          ┌──────────────────────┐
                          │ fraud_appeals        │
                          │                      │
                          │ • enforcement_id (FK)│
                          │ • user_id (FK)       │
                          │ • appeal_text        │
                          │ • status             │
                          │ • reviewed_by        │
                          └──────────────────────┘

┌─────────────────────┐   ┌──────────────────────┐
│ fraud_review_queue  │   │ fraud_audit_logs     │
│                     │   │ (IMMUTABLE)          │
│ • user_id (FK)      │   │                      │
│ • fraud_score       │   │ • user_id            │
│ • report_count      │   │ • admin_id           │
│ • priority          │   │ • action_type        │
│ • status            │   │ • before_state       │
│ • assigned_to       │   │ • after_state        │
│ • review_decision   │   │ • reason             │
└─────────────────────┘   │ • created_at         │
                           └──────────────────────┘
```

---

## Scaling Architecture (10M+ Users)

```
┌────────────────────────────────────────────────────────────────┐
│                         LOAD BALANCER                          │
│                     (HAProxy / AWS ELB)                        │
└───────┬────────────────────────────────────────────────────────┘
        │
        ↓
┌───────────────────────────────────────────────────────────────┐
│                    NESTJS API SERVERS                          │
│              (Horizontal scaling, 10+ instances)               │
│                                                                 │
│  Server 1    Server 2    Server 3    ...    Server N          │
│  ┌──────┐    ┌──────┐    ┌──────┐           ┌──────┐          │
│  │ API  │    │ API  │    │ API  │   ...     │ API  │          │
│  └───┬──┘    └───┬──┘    └───┬──┘           └───┬──┘          │
└──────┼──────────┼──────────┼──────────────────┼───────────────┘
       │          │          │                  │
       └──────────┴──────────┴──────────────────┘
                            │
       ┌────────────────────┼────────────────────┐
       ↓                    ↓                    ↓
┌──────────────┐   ┌──────────────────┐   ┌────────────────┐
│   REDIS      │   │ MESSAGE QUEUE    │   │  POSTGRESQL    │
│   CLUSTER    │   │ (RabbitMQ/Bull)  │   │   CLUSTER      │
│              │   │                  │   │                │
│ • Cache      │   │ • Score calc     │   │ • Primary      │
│   scores     │   │   jobs           │   │   (writes)     │
│ • Session    │   │ • Pattern        │   │                │
│   data       │   │   detection      │   │ • Read         │
│ • Rate       │   │ • Enforcement    │   │   Replicas     │
│   limits     │   │   actions        │   │   (reads)      │
└──────────────┘   └──────────────────┘   └────────┬───────┘
                                                    │
                                                    ↓
                                           ┌────────────────┐
                                           │ COLD STORAGE   │
                                           │ (S3 / BigQuery)│
                                           │                │
                                           │ • Old events   │
                                           │   (> 90 days)  │
                                           │ • Analytics    │
                                           └────────────────┘

┌───────────────────────────────────────────────────────────────┐
│                  BACKGROUND WORKERS                            │
│                  (Separate processes)                          │
│                                                                 │
│  Worker 1: Score calculation                                   │
│  Worker 2: Pattern detection                                   │
│  Worker 3: Content duplication                                 │
│  Worker 4: Enforcement expiry                                  │
│  Worker 5: Archival jobs                                       │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│                  MONITORING & ALERTS                           │
│                                                                 │
│  • Prometheus: Metrics collection                              │
│  • Grafana: Dashboards                                         │
│  • Sentry: Error tracking                                      │
│  • PagerDuty: Critical alerts                                  │
└───────────────────────────────────────────────────────────────┘
```

---

**Version**: 1.0.0  
**Last Updated**: January 16, 2026  
**Architecture Type**: Microservices-ready, Scalable, Backend-only
