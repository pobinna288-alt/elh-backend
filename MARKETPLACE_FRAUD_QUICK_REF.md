# Marketplace Fraud Detection - Quick Reference Guide

## 🚀 Quick Start

### 1. Deploy Database Schema
```bash
psql -U postgres -d your_database -f database/schema/marketplace-fraud-detection.sql
```

### 2. Add to NestJS Module
```typescript
// app.module.ts
imports: [FraudModule]
```

### 3. Integrate Event Tracking
```typescript
// When user creates ad
await fraudEventService.trackAdCreation(adId, userId, ...);

// When user sends message
const patterns = fraudEventService.detectOffPlatformPatterns(text);
await fraudEventService.trackMessageSent(senderId, recipientId, conversationId, adId, patterns);

// When user reports another user
await fraudEventService.trackUserReport(reporterId, reportedUserId, reason, ...);
```

---

## 📊 Fraud Score Ranges

| Score | Risk Level | Action | User Impact |
|-------|-----------|--------|-------------|
| **0-30** | 🟢 Low | Monitor only | None |
| **31-60** | 🟡 Medium | Show buyer warnings | Buyers see safety tips |
| **61-80** | 🟠 High | Soft restrictions + review | Reduced visibility, verification required |
| **81-100** | 🔴 Critical | Temp ban + mandatory review | Account suspended 24-72h |

---

## 🎯 Fraud Signals & Weights

### Account Signals (15-25 points)
- **New account** (< 7 days): 15 points
- **Unverified email**: 10 points
- **Unverified phone**: 10 points
- **Incomplete profile**: 5 points

### Behavior Signals (20-40 points)
- **Rapid posting** (>10 ads/24h): 20 points
- **Rapid messaging** (>20 msgs/hour): 15 points
- **Device sharing** (>5 users/device): 20 points
- **Country hopping** (>3 countries/week): 25 points

### Content Signals (20-25 points)
- **Duplicate descriptions**: 25 points
- **Duplicate images** (stolen photos): 20 points
- **Price outlier** (< 30% of average): 15 points

### Community Signals (30 points)
- **User reports**: 30 points (scales with count)

### Enforcement History (20-40 points)
- **Previous warnings**: 20 points (×25 per warning)
- **Previous temp bans**: 40 points (×40 per ban)
- **Ban evasion**: 100 points (instant critical)

---

## ⚖️ 3-Level Enforcement System

### Level 1: Soft Restriction
**Trigger**: Score 61-80 (High Risk)

**Restrictions**:
- ✅ Can still post ads
- ✅ Can still message
- ⚠️ Ads show lower in search
- ⚠️ May require phone/ID verification
- 📋 Added to review queue

**User Notification**: ⚠️ Warning sent

### Level 2: Temporary Ban
**Trigger**: Score 81-100 (Critical Risk)

**Restrictions**:
- ❌ Cannot post ads
- ❌ Cannot send messages
- ❌ All ads hidden
- ⏱️ Duration: 24-72 hours (escalates with history)
- 📋 Mandatory admin review

**User Notification**: 🚫 Ban notice with reason

### Level 3: Permanent Ban Candidate
**Trigger**: ALL criteria must be met:
- ✅ Score ≥ 85
- ✅ Reports ≥ 3 (from different users)
- ✅ Warnings ≥ 2
- ✅ Temp bans ≥ 2
- ✅ Recent activity (< 30 days since last violation)

**Process**:
1. User suspended (72h) while under review
2. **MANDATORY human review** (no auto-ban)
3. Admin reviews all evidence
4. Admin makes final decision with detailed reason (50+ chars)
5. Logged to immutable audit trail

**CRITICAL**: System NEVER permanently bans without human approval

---

## 🔍 Admin Review Queue

### Priority Levels

| Priority | Criteria | SLA |
|----------|----------|-----|
| 🚨 **Urgent** | Perm ban candidate, score 90+ | Review within 4 hours |
| 🔴 **High** | Score 80-89, repeat offenders | Review within 24 hours |
| 🟡 **Medium** | Score 60-79, multiple reports | Review within 48 hours |
| 🟢 **Low** | General monitoring | Review within 7 days |

### Admin Actions

1. **View Queue**: `GET /admin/fraud/review-queue?priority=high`
2. **View Details**: `GET /admin/fraud/review-queue/:id`
3. **Complete Review**: `POST /admin/fraud/review-queue/:id/complete`
   ```json
   {
     "decision": "temp_ban",
     "reason": "Confirmed fraudulent activity",
     "durationHours": 72
   }
   ```

### Review Decisions

| Decision | Effect |
|----------|--------|
| `no_action` | Close review, continue monitoring |
| `warning` | Send warning notification |
| `soft_restriction` | Apply Level 1 restrictions |
| `temp_ban` | Apply Level 2 temporary ban |
| `permanent_ban` | **Requires 50+ char reason**, logged to audit trail |
| `false_positive` | Clear score, lift all restrictions |

---

## 📅 Background Jobs Schedule

| Job | Frequency | Purpose |
|-----|-----------|---------|
| **Score Recalculation** | Every 6 hours | Update fraud scores for active users |
| **Score Decay** | Daily 4 AM | Apply good behavior rewards (-2 pts/day) |
| **Multi-Account Detection** | Every 12 hours | Find fraud rings (5+ users per device) |
| **Content Duplication** | Every 8 hours | Find duplicate ads across users |
| **Image Reuse Detection** | Every 8 hours | Find stolen product photos |
| **Expire Temp Bans** | Every 15 minutes | Auto-expire completed bans |
| **Escalate Stale Reviews** | Every hour | Bump priority on old reviews |
| **Daily Admin Summary** | Daily 9 AM | Email review queue status to admins |
| **Archive Old Events** | Daily 2 AM | Move events older than 90 days |
| **Fraud Spike Monitor** | Every 30 minutes | Alert on sudden fraud increase |

---

## 🔐 Security & Privacy

### What We Store
✅ Event metadata (timestamps, IDs, counts)  
✅ Pattern flags (e.g., "phone_number" detected)  
✅ Hashed device fingerprints (SHA-256)  
✅ IP addresses (for pattern analysis)  
✅ Image perceptual hashes  
✅ Text content hashes (SHA-256)  

### What We DON'T Store
❌ Message content (only pattern flags)  
❌ Raw device fingerprints (only hashes)  
❌ Credit card numbers  
❌ Passwords  
❌ Private user data beyond fraud detection needs  

### Privacy Features
- **No message reading**: Only pattern detection
- **Hashed fingerprints**: Irreversible
- **Right to appeal**: Full evidence access
- **Audit trail**: All decisions logged
- **Data retention**: 90 days for events (configurable)

---

## 📈 Key Metrics to Monitor

### Health Metrics
- **Review queue depth**: Alert if > 50 items
- **Stale reviews**: Alert if oldest > 48 hours
- **Fraud spike**: Alert if high-risk users > 2× average
- **Job failures**: Alert on background job errors

### Performance Metrics
- **False positive rate**: Target < 5%
- **Average review time**: Target < 24 hours
- **Appeal approval rate**: Track admin accuracy
- **Score distribution**: Monitor risk level breakdown

### Business Metrics
- **Fraud prevented**: Estimated value saved
- **User reports**: Track community engagement
- **Enforcement actions**: Weekly/monthly trends
- **Ban accuracy**: Post-ban confirmation rate

---

## 🧪 Testing Checklist

### Unit Tests
- [ ] Fraud scoring engine calculates correctly
- [ ] Decision engine applies correct level
- [ ] Event tracking logs to correct tables
- [ ] Pattern detection finds duplicates
- [ ] Score decay applies correctly

### Integration Tests
- [ ] Ad creation triggers fraud check
- [ ] High score triggers review queue
- [ ] Admin can complete reviews
- [ ] Appeals flow works end-to-end
- [ ] Temp bans expire automatically

### Load Tests
- [ ] Handle 1000 ad creations/minute
- [ ] Calculate 10,000 scores/hour
- [ ] Process review queue under load
- [ ] Background jobs complete on schedule

---

## 🐛 Troubleshooting

### Issue: High false positive rate
**Solution**: Lower signal weights in `fraud_config`:
```sql
UPDATE fraud_config 
SET config_value = jsonb_set(config_value, '{rapid_posting}', '15')
WHERE config_key = 'signal_weights';
```

### Issue: Review queue backing up
**Solution**: 
1. Check admin team capacity
2. Lower review threshold temporarily
3. Auto-approve low-risk cases
4. Hire more moderators

### Issue: Score not updating
**Solution**: 
1. Check background job logs
2. Manually trigger: `POST /admin/fraud/recalculate/:userId`
3. Verify database connectivity
4. Check for locked tables

### Issue: Temp ban not expiring
**Solution**:
1. Check `expireTemporaryBans` cron job
2. Manually expire: `PUT /admin/fraud/enforcement/:actionId/expire`
3. Verify `expires_at` timestamp is correct

---

## 📞 Admin Endpoints Reference

### Review Queue
```bash
# Get pending reviews
GET /admin/fraud/review-queue?priority=high&status=pending

# Get review details
GET /admin/fraud/review-queue/:reviewId

# Assign review to self
PUT /admin/fraud/review-queue/:reviewId/assign

# Complete review
POST /admin/fraud/review-queue/:reviewId/complete
{
  "decision": "temp_ban",
  "reason": "Confirmed fraud",
  "durationHours": 48
}
```

### Enforcement
```bash
# Get user's enforcement history
GET /admin/fraud/enforcement/:userId

# Manually apply action
POST /admin/fraud/enforcement/:userId/apply
{
  "actionType": "soft_restriction",
  "reason": "Manual review decision",
  "restrictions": { "reducedVisibility": true }
}

# Lift enforcement (appeal approved)
PUT /admin/fraud/enforcement/:actionId/lift
{
  "reason": "Appeal approved - legitimate user"
}
```

### Appeals
```bash
# Get pending appeals
GET /admin/fraud/appeals?status=pending

# Review appeal
POST /admin/fraud/appeals/:appealId/review
{
  "decision": "approved",
  "reviewNotes": "User provided valid proof"
}
```

### Analytics
```bash
# Get fraud statistics
GET /admin/fraud/stats?days=7

# Get audit log
GET /admin/fraud/audit-log?userId=user-123

# Get configuration
GET /admin/fraud/config

# Update configuration
PUT /admin/fraud/config
{
  "signalWeights": { "rapidPosting": 15 }
}
```

---

## 🎓 Training: When to Approve Permanent Bans

### ✅ APPROVE if ALL true:
- Score consistently high (85+) over weeks
- Multiple independent user reports (3+)
- Previous warnings ignored (2+)
- Previous temp bans (2+)
- Clear pattern of fraud (not mistakes)
- Detailed evidence documented

### ❌ REJECT if ANY true:
- First offense (no previous warnings)
- Reports from single source
- Score recently spiked (not sustained)
- Plausible explanation provided
- Evidence is circumstantial
- Doubt about intent

### ⏸️ NEED MORE INFO if:
- Evidence incomplete
- Timeline unclear
- User appeal has merit
- Pattern not obvious
- Want to investigate further

**Golden Rule**: When in doubt, choose temp ban + investigation over permanent ban.

---

## 📋 Quick Decision Matrix

| Score | Reports | Prev Bans | Action | Review? |
|-------|---------|-----------|--------|---------|
| 0-30 | 0-2 | 0 | ✅ None | No |
| 31-60 | 0-2 | 0 | ⚠️ Buyer warnings | No |
| 31-60 | 3+ | 0 | 📋 Review | Yes |
| 61-80 | Any | 0 | 🟠 Soft restrict | Yes |
| 61-80 | 3+ | 1+ | 🔴 Temp ban | Yes |
| 81-100 | Any | 0-1 | 🔴 Temp ban | Yes (mandatory) |
| 85+ | 3+ | 2+ | 🚨 Perm ban candidate | **URGENT** |

---

## 🎯 Success Metrics

### Target KPIs (First 90 Days)
- **Fraud detection rate**: > 80% of fraudulent activity caught
- **False positive rate**: < 5% of restrictions on legitimate users
- **Review completion time**: < 24 hours average
- **Appeal approval rate**: 10-20% (shows system is accurate but fair)
- **Score decay success**: 60%+ of warned users improve behavior

### Adjustment Triggers
- **False positives > 10%**: Lower signal weights
- **Fraud slipping through**: Increase weights, add new signals
- **Queue backing up**: Adjust thresholds, add moderators
- **Too many appeals approved**: System too strict, ease thresholds

---

## 💡 Best Practices

### For Developers
1. **Always log to audit trail** for enforcement actions
2. **Never expose scoring logic** to users (security risk)
3. **Test with real data patterns** from production (anonymized)
4. **Monitor false positives** aggressively
5. **Version control config changes** in `fraud_config` table

### For Admins
1. **Review evidence thoroughly** before permanent bans
2. **Document decisions clearly** (appeals will reference them)
3. **Look for patterns**, not single incidents
4. **Give users benefit of doubt** when unclear
5. **Track your decision accuracy** (learn from mistakes)

### For Product Managers
1. **Balance security vs. UX** (don't scare legitimate users)
2. **Communicate clearly** (users should know why they're restricted)
3. **Iterate on thresholds** based on metrics
4. **Plan for scale** (review queue grows with users)
5. **Legal compliance** (GDPR, data retention, audit trails)

---

## 🚨 Emergency Procedures

### Fraud Spike Detected
1. Check logs for pattern (device, IP, content)
2. Temporarily increase thresholds
3. Notify admin team
4. Investigate source (bot attack, coordinated fraud)
5. Apply bulk enforcement if needed

### False Positive Wave
1. Immediately lower problematic signal weight
2. Identify affected users
3. Bulk lift restrictions
4. Send apology notifications
5. Post-mortem and fix

### System Down
1. Fraud detection fails gracefully (allow activity)
2. Queue events for later processing
3. Don't block legitimate users
4. Fix system
5. Process queued events in batch

---

## 📚 Related Documentation

- **[MARKETPLACE_FRAUD_SYSTEM.md](MARKETPLACE_FRAUD_SYSTEM.md)**: Complete technical guide
- **[marketplace-fraud-detection.sql](database/schema/marketplace-fraud-detection.sql)**: Database schema
- **[marketplace-fraud-scoring.service.ts](src/modules/fraud/marketplace-fraud-scoring.service.ts)**: Scoring engine
- **[marketplace-fraud-decision.service.ts](src/modules/fraud/marketplace-fraud-decision.service.ts)**: Decision engine
- **[marketplace-fraud-admin.controller.ts](src/modules/fraud/marketplace-fraud-admin.controller.ts)**: Admin API

---

**Version**: 1.0.0  
**Last Updated**: January 16, 2026  
**Support**: fraud-system@yourcompany.com
