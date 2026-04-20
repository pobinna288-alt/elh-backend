# Financial-Grade Rewarded Video Fraud Detection System

When coins are directly convertible to real money, fraud is not a user experience issue—it's a **bankruptcy risk**.

## Architecture Overview

### Defense Layers (In Order of Execution)

```
┌─────────────────────────────────────────┐
│  1. PREVENTION (Stop fraud before it happens)
│     - Device fingerprinting
│     - IP reputation
│     - Rate limiting (per user, per IP, per device)
│     - Velocity analysis
├─────────────────────────────────────────┤
│  2. DETECTION (Catch fraud when it occurs)
│     - Real-time validation checks
│     - ML fraud scoring
│     - Pattern analysis
│     - Ad provider verification
├─────────────────────────────────────────┤
│  3. CONTAINMENT (Limit fraud damage)
│     - Delayed payouts (24-72h holding)
│     - Pending → Cleared state transition
│     - Manual review triggers
│     - Circuit breakers
├─────────────────────────────────────────┤
│  4. RESPONSE (Act on fraud)
│     - Immediate bans for clear cases
│     - Reward reversals
│     - Device/IP blacklisting
│     - Support escalation
├─────────────────────────────────────────┤
│  5. RECOVERY (Audit and prevent future)
│     - Daily reconciliation
│     - ML model retraining
│     - Historical analysis
│     - Pattern identification
└─────────────────────────────────────────┘
```

---

## Implementation Guide

### 1. Database Setup

Run the migration to create fraud tracking tables:

```bash
# Using PostgreSQL
psql -U postgres -d elh_backend -f database/schema/fraud-detection.sql
```

This creates:
- `ad_rewards` - Financial ledger for all rewards
- `video_sessions` - Session tracking
- `fraud_events` - Audit trail
- `user_flags` - Manual review flags
- `device_blocks`, `ip_blocks` - Blacklists
- `withdrawal_requests` - Financial compliance
- Indices for performance

### 2. Node.js Setup

Import the fraud module in your app:

```typescript
// src/app.module.ts
import { FraudModule } from './modules/fraud/fraud.module';

@Module({
  imports: [
    // ... other modules
    FraudModule,
  ],
})
export class AppModule {}
```

### 3. Python ML Service Setup

```bash
# Install dependencies
cd python-service
pip install -r requirements.txt

# Run the service
python app/fraud_detection.py
```

The service exposes endpoints:
- `POST /predict` - Fraud scoring for single user
- `POST /batch-predict` - Batch processing
- `POST /train` - Model retraining
- `GET /health` - Health check

### 4. Docker Orchestration

Update your docker-compose.yml to include the Python service:

```yaml
services:
  python-fraud-service:
    build:
      context: ./python-service
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - FLASK_ENV=production
      - LOG_LEVEL=INFO
    depends_on:
      - postgres
    networks:
      - elh-network
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## API Usage

### Starting an Ad Session

```typescript
POST /rewards/fraud-protected/ad/start
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "adId": "ad_12345"
}

Response:
{
  "sessionId": "uuid",
  "temporaryToken": "token_for_completion",
  "requiredDuration": 30000
}
```

### Checkpointing Progress (Every 25%)

```typescript
POST /rewards/fraud-protected/ad/checkpoint
Authorization: Bearer <jwt_token>

{
  "sessionId": "uuid",
  "progress": 50  // 0-100
}

Response:
{ "saved": true }
```

### Completing Ad (Request Reward)

```typescript
POST /rewards/fraud-protected/ad/complete
Authorization: Bearer <jwt_token>

{
  "sessionId": "uuid",
  "adId": "ad_12345",
  "deviceFingerprint": "hash_of_device_info"
}

Response:
{
  "success": true,
  "coinsEarned": 10,
  "state": "pending",
  "message": "Coins will be available for withdrawal in 24 hours",
  "withdrawableBalance": 150
}
```

---

## Key Security Features

### 1. **Multi-Signal Validation**

Every reward request is validated against:

```javascript
const validations = [
  validateSession(),           // Is this session valid?
  validateTiming(),           // Did user watch long enough?
  validateDevice(),           // Is device trusted?
  validateIPReputation(),     // Is IP from known fraud cluster?
  validateUserHistory(),      // Does user have fraud flags?
  validateAdProvider(),       // Did provider confirm completion?
  checkDailyLimits(),        // Within rate limits?
  checkVelocityLimits(),     // No bot patterns?
];

// ALL must pass, not just one
```

### 2. **Delayed Payout System**

Rewards are NOT immediately withdrawable:

```
Time 0: User completes ad
  → Coin added to PENDING balance
  → Can spend in-app (not withdrawable)
  
Time 24-72h: Automated review
  → ML fraud scoring
  → Pattern analysis
  
Time 48h: Review complete
  → Low risk: Move to WITHDRAWABLE
  → High risk: Manual review
  → Suspicious: Extended hold or reversal
```

### 3. **ML-Based Fraud Detection**

Python service uses multiple signals:

```python
# Obvious rule-based patterns (catches ~80% of fraud)
- New account + high activity
- Impossible watch intervals (< 30 seconds between ads)
- Perfect consistency in timing (bot signature)
- Device farming (same device, multiple accounts)
- VPN hopping patterns

# ML-based subtle patterns (catches remaining 15-20%)
- Extracted 16 features per user
- RandomForest classifier
- Probabilities: 0-1 scale
- Combined with rule-based scores
```

### 4. **Circuit Breaker**

Automatically shut down if fraud spikes:

```typescript
// If > 50 suspicious activities in 1 minute
// → Temporarily disable ad completions
// → Alert ops team
// → Wait for manual review
```

---

## Fraud Thresholds

### Risk Score Interpretation

| Score | Action | Holding Period |
|-------|--------|-----------------|
| 0.0-0.3 | APPROVE | 24h |
| 0.3-0.5 | EXTENDED_HOLD | 48h |
| 0.5-0.7 | MANUAL_REVIEW | 72h |
| 0.7-0.9 | REVIEW_REQUIRED | 72h+ |
| 0.9-1.0 | BLOCK | Permanent |

### Rate Limits (Per User, Per Day)

```javascript
const LIMITS = {
  MAX_ADS_PER_HOUR: 5,
  MAX_ADS_PER_DAY: 30,
  MAX_DAILY_EARNINGS: 100,  // coins
  MAX_WEEKLY_EARNINGS: 500,
  
  // New account restrictions (first 30 days)
  NEW_ACCOUNT_DAILY_LIMIT: 20,
  
  // Withdrawal restrictions
  MIN_ACCOUNT_AGE_DAYS: 7,
  MAX_WITHDRAWAL_PER_DAY: 50,  // coins
};
```

---

## Monitoring & Alerting

### Key Metrics to Track

```typescript
// Financial metrics
- Total coins granted today
- Total coins pending
- Total coins withdrawn
- Rewards reversed (fraud caught)

// Fraud metrics
- Fraud detection rate
- False positive rate (legitimate users blocked)
- Average time to fraud detection
- Accounts banned today

// System metrics
- Circuit breaker triggers
- API response time
- Database query performance
- ML prediction latency
```

### Alert Conditions

```javascript
ALERT if:
- Daily discrepancy > 5% (reconciliation)
- Fraud detection rate drops < 95%
- False positive rate > 1%
- Circuit breaker opens
- Database query timeout
- ML service unavailable
```

---

## Admin Dashboard Queries

### View Suspicious Users

```sql
SELECT
  user_id,
  ads_watched_24h,
  rewards_cleared,
  rewards_pending,
  total_earned,
  high_severity_events,
  active_flags,
  last_suspicious_activity
FROM fraud_dashboard
WHERE active_flags > 0 OR high_severity_events > 5
ORDER BY active_flags DESC;
```

### Track Financial Reconciliation

```sql
SELECT
  date,
  expected_coins,
  actual_coins,
  discrepancy_percent,
  status
FROM daily_reconciliation
WHERE status = 'ALERT'
ORDER BY date DESC;
```

### Device Farming Detection

```sql
SELECT
  device_fingerprint,
  COUNT(DISTINCT user_id) as unique_accounts,
  SUM(CASE WHEN state = 'cleared' THEN amount END) as total_earned
FROM ad_rewards
JOIN (
  SELECT DISTINCT device_fingerprint FROM user_sessions
) devices ON TRUE
GROUP BY device_fingerprint
HAVING COUNT(DISTINCT user_id) > 2
ORDER BY total_earned DESC;
```

---

## Cost-Benefit Analysis

### Investment Breakdown

- **Prevention layer**: ~$500/month (Redis, IP reputation API)
- **Detection layer**: ~$1,000/month (Python ML service, compute)
- **Manual review**: ~40 hours/week (support team)
- **Total**: ~$3,000-5,000/month

### ROI Calculation

If platform would lose $50,000/day to fraud without protection:
- System prevents: 98% of fraud = $49,000/day saved
- Payback period: < 1 week
- Annual savings: ~$17.85M

**When coins = real money, fraud prevention is not a cost, it's a survival requirement.**

---

## Troubleshooting

### High False Positive Rate

If legitimate users are being blocked:

1. Check ML model training data
2. Review fraud threshold settings
3. Examine device fingerprinting logic
4. Look for regional patterns

```sql
-- Find recently banned users with high engagement
SELECT u.id, u.email, COUNT(vs.session_id) as ads_watched
FROM users u
JOIN video_sessions vs ON u.id = vs.user_id
WHERE u.banned = true
GROUP BY u.id
HAVING COUNT(vs.session_id) > 50;
```

### Fraud Leaking Through

If fraudsters are bypassing detection:

1. Check ML model accuracy
2. Review recent rule violations
3. Analyze new fraud patterns
4. Investigate circuit breaker logs

```sql
-- Find patterns in reversed rewards
SELECT
  fe.event_type,
  COUNT(*) as count,
  COUNT(DISTINCT fe.user_id) as unique_users
FROM fraud_events fe
WHERE fe.created_at > NOW() - INTERVAL '7 days'
  AND fe.severity = 'HIGH'
GROUP BY fe.event_type
ORDER BY count DESC;
```

### Performance Issues

If API is slow:

1. Check Redis performance
2. Verify database indices are used
3. Profile ML prediction latency
4. Scale Python service if needed

---

## Compliance & Legal

### Storing Financial Data

- Encrypt sensitive information at rest
- Use SSL/TLS for all transit
- Audit all access attempts
- Maintain 7-year retention for tax authorities
- GDPR: Implement user data deletion

### Financial Auditing

```sql
-- Generate audit trail for regulatory compliance
SELECT
  ar.id,
  ar.user_id,
  ar.session_id,
  ar.amount,
  ar.state,
  ar.earned_at,
  ar.cleared_at,
  ar.reversal_reason,
  fe.event_type,
  fe.severity
FROM ad_rewards ar
LEFT JOIN fraud_events fe ON ar.user_id = fe.user_id
WHERE ar.earned_at > NOW() - INTERVAL '30 days'
ORDER BY ar.earned_at DESC;
```

---

## Next Steps

1. Deploy fraud detection module to staging
2. Run with 10% of traffic (shadow mode)
3. Compare fraud rates with/without
4. Adjust thresholds based on results
5. Full production rollout
6. Continuous monitoring and improvement

**Remember**: False negatives (fraud) are far more expensive than false positives (legitimate users delayed). When real money is involved, err on the side of caution.
