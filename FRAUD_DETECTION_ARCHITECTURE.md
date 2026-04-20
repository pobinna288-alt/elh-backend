# Fraud Detection System Architecture

## High-Level System Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER APPLICATION                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │   Watch     │  │ Send        │  │ Request     │                  │
│  │   Ad Video  │→ │ Checkpoint  │→ │ Reward      │                  │
│  └─────────────┘  └─────────────┘  └──────┬──────┘                  │
└──────────────────────────────────────────────┼────────────────────────┘
                                               │
                    HTTPS (TLS Encrypted)      │
                                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      NODE.JS BACKEND (NestJS)                        │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  JWT Authentication & Authorization                         │   │
│  └───────────────────────┬──────────────────────────────────────┘   │
│                          │                                           │
│  ┌──────────────────────▼──────────────────────────────────────┐   │
│  │           FRAUD DETECTION PIPELINE                          │   │
│  │                                                               │   │
│  │  ┌────────────────────────────────────────────────────┐    │   │
│  │  │ 1. SESSION VALIDATION                              │    │   │
│  │  │    - Check session exists                          │    │   │
│  │  │    - Verify belongs to user                        │    │   │
│  │  │    - Verify not expired                            │    │   │
│  │  └────────────────────────────────────────────────────┘    │   │
│  │                                                               │   │
│  │  ┌────────────────────────────────────────────────────┐    │   │
│  │  │ 2. TIMING VALIDATION                               │    │   │
│  │  │    - Check watch duration                          │    │   │
│  │  │    - Apply grace period (5%)                       │    │   │
│  │  │    - Verify against provider                       │    │   │
│  │  └────────────────────────────────────────────────────┘    │   │
│  │                                                               │   │
│  │  ┌────────────────────────────────────────────────────┐    │   │
│  │  │ 3. DEVICE REPUTATION CHECK                         │    │   │
│  │  │    - Generate device fingerprint                   │    │   │
│  │  │    - Check blacklist (Redis)                       │    │   │
│  │  │    - Count accounts per device                     │    │   │
│  │  └────────────────────────────────────────────────────┘    │   │
│  │                                                               │   │
│  │  ┌────────────────────────────────────────────────────┐    │   │
│  │  │ 4. IP REPUTATION CHECK                             │    │   │
│  │  │    - Check VPN/proxy/datacenter                    │    │   │
│  │  │    - Rate limit per IP (100/day)                   │    │   │
│  │  │    - Check IP blacklist                            │    │   │
│  │  └────────────────────────────────────────────────────┘    │   │
│  │                                                               │   │
│  │  ┌────────────────────────────────────────────────────┐    │   │
│  │  │ 5. USER HISTORY CHECK                              │    │   │
│  │  │    - Check if user banned                          │    │   │
│  │  │    - Check fraud flags                             │    │   │
│  │  │    - Review previous violations                    │    │   │
│  │  └────────────────────────────────────────────────────┘    │   │
│  │                                                               │   │
│  │  ┌────────────────────────────────────────────────────┐    │   │
│  │  │ 6. DAILY LIMITS CHECK                              │    │   │
│  │  │    - Max 30 ads/day                                │    │   │
│  │  │    - Max 100 coins/day                             │    │   │
│  │  │    - New account restrictions                      │    │   │
│  │  └────────────────────────────────────────────────────┘    │   │
│  │                                                               │   │
│  │  ┌────────────────────────────────────────────────────┐    │   │
│  │  │ 7. VELOCITY LIMITS CHECK                           │    │   │
│  │  │    - Max 5 ads/hour                                │    │   │
│  │  │    - Check interval variance                       │    │   │
│  │  │    - Detect bot patterns                           │    │   │
│  │  └────────────────────────────────────────────────────┘    │   │
│  │                                                               │   │
│  │  ┌────────────────────────────────────────────────────┐    │   │
│  │  │ 8. AD PROVIDER VERIFICATION (Server-to-Server)   │    │   │
│  │  │    - Call provider API                             │    │   │
│  │  │    - Confirm ad was actually served                │    │   │
│  │  │    - Verify watch duration matches                 │    │   │
│  │  └────────────────────────────────────────────────────┘    │   │
│  │                                                               │   │
│  │  ALL 8 CHECKS MUST PASS (AND operation)                      │   │
│  │                                                               │   │
│  └──────────────────────┬───────────────────────────────────────┘   │
│                         │                                            │
│         ┌───────────────┼───────────────┐                           │
│         │ ✗ FAILED     │ ✓ PASSED      │                           │
│         │              │                │                           │
│         ↓              ↓                ↓                           │
│    ┌─────────┐   ┌──────────────────────────┐                      │
│    │ REJECT  │   │ CREATE PENDING REWARD    │                      │
│    │ REQUEST │   │ (Delayed Payout)         │                      │
│    └─────────┘   │                          │                      │
│                  │ Amount: 10 coins          │                      │
│                  │ State: PENDING            │                      │
│                  │ Clearable: +24h           │                      │
│                  └──────────┬─────────────────┘                      │
│                             │                                        │
└─────────────────────────────┼────────────────────────────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │                    │
        ┌───────────▼─────────┐  ┌───────▼──────────┐
        │   REDIS CACHE       │  │  POSTGRESQL DB   │
        │                     │  │                  │
        │ - Sessions          │  │ - Rewards        │
        │ - Rate limits       │  │ - Sessions       │
        │ - Blacklists        │  │ - Fraud events   │
        │ - IP blocks         │  │ - Blacklists     │
        │ - Device blocks     │  │ - User flags     │
        │ - Completed keys    │  │ - Reconciliation │
        └─────────────────────┘  └──────────────────┘
                                           │
                    ┌──────────────────────┘
                    │ Every 24 hours
                    ↓
        ┌──────────────────────────────┐
        │   AUTOMATED REVIEW CYCLE     │
        │                              │
        │  For each PENDING reward:    │
        │  1. Calculate risk score     │
        │  2. Query ML service         │
        │  3. Make decision            │
        │  4. Update state             │
        │                              │
        │  < 0.3 → CLEARED            │
        │  0.3-0.7 → EXTENDED HOLD    │
        │  > 0.7 → MANUAL REVIEW      │
        └──────────────────────────────┘
                    │
        ┌───────────┼───────────┬──────────┐
        │           │           │          │
        ↓           ↓           ↓          ↓
    ┌────────┐ ┌────────┐ ┌─────────┐ ┌────────┐
    │CLEARED │ │  HOLD  │ │ REVIEW  │ │REVERSE │
    │ +24h   │ │ +48h   │ │ +72h    │ │ &ban   │
    └────────┘ └────────┘ └─────────┘ └────────┘
```

## Data Flow on Ad Completion

```
CLIENT REQUEST
    ↓
┌────────────────────────────────────────────────────────────────┐
│ POST /rewards/fraud-protected/ad/complete                      │
│ {                                                               │
│   "sessionId": "uuid",                                         │
│   "adId": "ad_12345",                                         │
│   "deviceFingerprint": "hash"                                 │
│ }                                                              │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ↓
            ┌────────────────┐
            │  JWT Verify    │
            └────────┬───────┘
                     │
        ┌────────────┴────────────┐
        │ Invalid → 401 Forbidden │
        │ Valid → Continue        │
        └────────────┬────────────┘
                     │
                     ↓
        ┌────────────────────────────┐
        │ PARALLEL VALIDATION (8 x)  │
        └────┬───────────────────┬───┘
             │                   │
    ┌────────▼─┐        ┌───────▼──────┐
    │ Redis    │        │ PostgreSQL   │
    │ Checks   │        │ Checks       │
    │          │        │              │
    │- Session │        │- Duration    │
    │- Rate    │        │- User ban    │
    │- Block   │        │- Flags       │
    │- IP      │        │- Daily limit │
    │  rate    │        │- Velocity    │
    └────┬─────┘        └───────┬──────┘
         │                      │
         └──────────┬───────────┘
                    │
        ┌───────────▼───────────┐
        │ AD PROVIDER VERIFY    │
        │ (External API Call)   │
        └──────────┬────────────┘
                   │
        ┌──────────┴──────────┐
        │ ✗ Any failure →     │
        │   Reject request    │
        │                     │
        │ ✓ All pass →        │
        │   Continue          │
        └──────────┬──────────┘
                   │
                   ↓
        ┌──────────────────────────────┐
        │ WRITE PENDING REWARD         │
        │                              │
        │ INSERT INTO ad_rewards       │
        │   session_id,                │
        │   user_id,                   │
        │   amount,                    │
        │   state: 'pending',          │
        │   clearable_at: +24h         │
        │                              │
        │ UPDATE users                 │
        │   pending_coins += 10        │
        └──────────┬───────────────────┘
                   │
                   ↓
        ┌──────────────────────────┐
        │ RETURN SUCCESS           │
        │ {                        │
        │   success: true,         │
        │   coinsEarned: 10,       │
        │   state: 'pending',      │
        │   message: '24h hold'    │
        │ }                        │
        └──────────────────────────┘
```

## ML Fraud Scoring Flow

```
USER DATA INPUT
    ↓
┌────────────────────────────────────────┐
│ Python ML Service                      │
│ fraud_detection.py                     │
└────────────────────────────────────────┘
    │
    ├─→ RULE-BASED DETECTION (catches ~80%)
    │   │
    │   ├─ New account + high activity?      → +0.25
    │   ├─ Watch interval < 30s?             → +0.30
    │   ├─ Perfect timing consistency?       → +0.35
    │   ├─ Device farming (3+ accounts)?     → +0.40
    │   ├─ Too many IPs (VPN)?               → +0.25
    │   ├─ 24-hour binge watching?           → +0.35
    │   ├─ Earnings without engagement?      → +0.22
    │   ├─ Immediate cashout?                → +0.28
    │   │
    │   └─ RULE SCORE = sum of violations
    │
    ├─→ ML-BASED DETECTION (catches remaining ~20%)
    │   │
    │   ├─ Extract 16 features:
    │   │   - Account age
    │   │   - Total ads watched
    │   │   - Device/IP count
    │   │   - Watch patterns
    │   │   - Engagement scores
    │   │   - etc.
    │   │
    │   ├─ Normalize features
    │   ├─ Feed to RandomForestClassifier
    │   │
    │   └─ ML PROBABILITY = 0.0-1.0
    │
    └─→ COMBINE SCORES
        │
        Combined = (ML_PROB × 0.7) + (RULE_SCORE × 0.3)
        │
        ├─ < 0.3  → APPROVE
        ├─ 0.3-0.5 → EXTENDED_HOLD
        ├─ 0.5-0.7 → MANUAL_REVIEW
        ├─ 0.7-0.9 → REVIEW_REQUIRED
        └─ > 0.9  → BLOCK
```

## Reward State Transitions

```
PENDING                    (24-72 hours review)
  ├─ Automated Review Day 1
  │  ├─ LOW RISK (score < 0.3)
  │  │  └─→ CLEARED (can withdraw)
  │  ├─ MEDIUM RISK (score 0.3-0.7)
  │  │  └─→ EXTENDED_HOLD (review again in 48h)
  │  └─ HIGH RISK (score > 0.7)
  │     └─→ Manual Review Required (admin to decide)
  │
  └─ Automated Review Day 2
     ├─ Still pending?
     │  ├─ LOW RISK
     │  │  └─→ CLEARED
     │  └─ HIGH RISK
     │     └─→ REVERSED (fraud confirmed)
     │
     └─ End of holding period
        └─ Not reviewed? Auto-CLEAR (benefit of doubt)

CLEARED (withdrawable)
  └─→ User can withdraw coins to payment method

SUSPICIOUS (under manual review)
  ├─→ Admin approves
  │   └─→ CLEARED
  └─→ Admin rejects
     └─→ REVERSED
```

## Circuit Breaker State Machine

```
CLOSED (Normal Operation)
  │
  ├─ Monitor: Count suspicious activities
  │  │
  │  ├─ < 50/minute → Stay CLOSED
  │  │
  │  └─ >= 50/minute
  │     │
  │     └─→ OPEN (Trip circuit breaker)
  │
OPEN (Fraud Spike Detected)
  │
  ├─ Action: Disable ad completions
  ├─ Alert: Page ops team
  ├─ Log: All suspicious activity
  ├─ Wait: 5 minutes
  │  │
  │  ├─ If spike continues
  │  │  └─→ Extend wait 5 more minutes
  │  │
  │  └─ If spike stops
  │     └─→ HALF_OPEN (test state)
  │
HALF_OPEN (Testing)
  │
  ├─ Allow: Limited requests (5%)
  ├─ Monitor: Closely check quality
  │  │
  │  ├─ If no new fraud
  │  │  └─→ CLOSED (resume normal)
  │  │
  │  └─ If fraud detected
  │     └─→ OPEN (spike is back)
```

---

## Technology Stack

```
Frontend Layer:
  ├─ Mobile App (iOS/Android)
  │  └─ Sends video watch events
  │
  └─ Web App (React/Vue)
     └─ Alternative access

Backend Layer:
  ├─ Node.js with NestJS
  │  ├─ Express/Fastify HTTP server
  │  ├─ JWT authentication
  │  └─ Fraud detection pipeline
  │
  ├─ PostgreSQL Database
  │  ├─ Financial ledger (ad_rewards)
  │  ├─ Session tracking (video_sessions)
  │  ├─ Audit trail (fraud_events)
  │  └─ User management (users)
  │
  ├─ Redis Cache
  │  ├─ Session storage
  │  ├─ Rate limiting
  │  ├─ Blacklists
  │  └─ Circuit breaker state
  │
  └─ Python ML Service
     ├─ Flask framework
     ├─ Scikit-learn models
     ├─ Joblib serialization
     └─ Real-time predictions

External Services:
  ├─ Ad Provider API
  │  ├─ Verify ad completion
  │  └─ Confirm reward eligibility
  │
  └─ Payment Gateway
     ├─ Process withdrawals
     └─ Handle chargebacks

Monitoring:
  ├─ Prometheus metrics
  ├─ Grafana dashboards
  ├─ ELK logging
  └─ PagerDuty alerts
```

---

**Key Takeaway**: This architecture creates multiple independent layers of fraud detection.
Even if one layer is bypassed, others catch it. The system is designed for resilience
and cannot be exploited by a single attack vector.
