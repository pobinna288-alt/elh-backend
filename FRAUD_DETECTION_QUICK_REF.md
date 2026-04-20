# Fraud Detection Quick Reference

## Files Created/Modified

| File | Purpose |
|------|---------|
| `src/modules/fraud/fraud.service.ts` | Core fraud detection engine |
| `src/modules/fraud/fraud.controller.ts` | User-facing API endpoints |
| `src/modules/fraud/fraud.module.ts` | NestJS module definition |
| `src/modules/fraud/fraud-admin.controller.ts` | Admin management tools |
| `src/config/fraud.config.ts` | Configurable thresholds |
| `python-service/app/fraud_detection.py` | ML-based fraud scoring |
| `python-service/app/test_fraud_detection.py` | Comprehensive test suite |
| `database/schema/fraud-detection.sql` | Database schema and indices |
| `FRAUD_DETECTION_IMPLEMENTATION.md` | Complete technical guide |
| `DEPLOYMENT_GUIDE.md` | Step-by-step deployment |
| `FRAUD_DETECTION_SUMMARY.md` | Implementation overview |

## Key Thresholds

```javascript
Rate Limits (per user, per day):
  - Max 5 ads/hour
  - Max 30 ads/day
  - Max 100 coins/day
  - Max 50 coins withdrawal/day
  - Min 7 days account age for withdrawal

Fraud Score (0.0-1.0):
  - < 0.3: APPROVE (24h holding)
  - 0.3-0.5: EXTENDED_HOLD (48h)
  - 0.5-0.7: MANUAL_REVIEW (72h)
  - 0.7-0.9: REVIEW_REQUIRED (72h+)
  - > 0.9: BLOCK (permanent)
```

## Quick Start Commands

```bash
# 1. Apply database schema
psql -U postgres -d elh_backend -f database/schema/fraud-detection.sql

# 2. Install Python dependencies
cd python-service
pip install -r requirements.txt

# 3. Start Python ML service
python app/fraud_detection.py
# Service runs on http://localhost:8000

# 4. Run test suite
python app/test_fraud_detection.py

# 5. Import FraudModule in src/app.module.ts
# Then restart Node.js backend
pm2 restart backend
```

## API Usage Examples

### Start Ad Session
```bash
curl -X POST http://localhost:3000/rewards/fraud-protected/ad/start \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"adId": "ad_12345"}'

# Response:
# {
#   "sessionId": "uuid",
#   "temporaryToken": "token",
#   "requiredDuration": 30000
# }
```

### Save Checkpoint (at 50% progress)
```bash
curl -X POST http://localhost:3000/rewards/fraud-protected/ad/checkpoint \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "uuid", "progress": 50}'
```

### Complete Ad & Request Reward
```bash
curl -X POST http://localhost:3000/rewards/fraud-protected/ad/complete \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "uuid",
    "adId": "ad_12345",
    "deviceFingerprint": "hash_of_device"
  }'

# Response:
# {
#   "success": true,
#   "coinsEarned": 10,
#   "state": "pending",
#   "message": "Coins will be available for withdrawal in 24 hours",
#   "withdrawableBalance": 150
# }
```

## Admin Commands

### Get Fraud Dashboard
```bash
curl -X GET http://localhost:3000/admin/fraud/dashboard \
  -H "Authorization: Bearer <admin_token>"
```

### View User Fraud Profile
```bash
curl -X GET http://localhost:3000/admin/fraud/user/<userId> \
  -H "Authorization: Bearer <admin_token>"
```

### Ban User for Fraud
```bash
curl -X POST http://localhost:3000/admin/fraud/user/<userId>/ban \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"reason": "device-farming"}'
```

### Reverse a Reward
```bash
curl -X POST http://localhost:3000/admin/fraud/reward/<rewardId>/reverse \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"reason": "false-positive"}'
```

## Database Queries

### Check User's Recent Rewards
```sql
SELECT * FROM ad_rewards 
WHERE user_id = 'user_id' 
ORDER BY earned_at DESC 
LIMIT 10;
```

### Find Suspicious Users
```sql
SELECT user_id, COUNT(*) as fraud_events 
FROM fraud_events 
WHERE severity IN ('HIGH', 'CRITICAL')
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id 
ORDER BY fraud_events DESC 
LIMIT 20;
```

### Check Pending Rewards for Review
```sql
SELECT COUNT(*), SUM(amount) as total 
FROM ad_rewards 
WHERE state = 'pending' 
  AND clearable_at < NOW();
```

### Device Farming Detection
```sql
SELECT device_fingerprint, COUNT(DISTINCT user_id) as accounts
FROM user_sessions 
GROUP BY device_fingerprint 
HAVING COUNT(DISTINCT user_id) > 2 
ORDER BY accounts DESC;
```

## Environment Variables

```bash
# .env file

# Node.js
AD_PROVIDER_API=https://api.adprovider.com
AD_PROVIDER_API_KEY=your_key
DATABASE_URL=postgresql://user:pass@localhost/elh_backend
REDIS_URL=redis://localhost:6379
ML_SERVICE_URL=http://python-fraud-service:8000

# Python
FLASK_ENV=production
LOG_LEVEL=INFO
```

## Monitoring

### Check System Health
```bash
# ML Service
curl http://localhost:8000/health

# Database
psql -U postgres -d elh_backend -c "SELECT 1;"

# Redis
redis-cli PING
```

### View Recent Fraud Events
```bash
# Get last 100 fraud events
curl http://localhost:3000/admin/fraud/dashboard
```

### Check Financial Reconciliation
```sql
SELECT date, expected_coins, actual_coins, discrepancy_percent 
FROM daily_reconciliation 
WHERE status != 'OK' 
ORDER BY date DESC;
```

## Troubleshooting

### High False Positive Rate?
1. Check fraud thresholds in `src/config/fraud.config.ts`
2. Lower `FRAUD_SCORE.BLOCK_THRESHOLD` from 0.9 to 0.95
3. Increase `MIN_WATCH_DURATION_PERCENT` grace period
4. Restart services

### Fraud Leaking Through?
1. Review `fraud_events` table for patterns
2. Check ML model accuracy: `python python-service/app/test_fraud_detection.py`
3. Increase `FRAUD_SCORE.BLOCK_THRESHOLD` to 0.85
4. Lower `FRAUD_SCORE.MANUAL_REVIEW_THRESHOLD` to 0.6
5. Retrain ML model with recent data

### Slow API Response?
1. Check database indices: `psql -U postgres -d elh_backend -c "\di ad_rewards*"`
2. Profile queries: `SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;`
3. Scale Python service: Add more replicas in docker-compose
4. Cache frequent queries in Redis

### Circuit Breaker Opening?
1. Check for attack: `SELECT COUNT(*) FROM fraud_events WHERE created_at > NOW() - INTERVAL '1 minute';`
2. Review suspicious activities
3. If attack confirmed, manually ban users
4. Increase threshold if too sensitive

## Maintenance

### Daily
- [ ] Review fraud dashboard
- [ ] Check alert logs
- [ ] Validate financial reconciliation

### Weekly
- [ ] Generate fraud report
- [ ] Review and approve/deny disputes
- [ ] Check system performance
- [ ] Update ML model if needed

### Monthly
- [ ] Full fraud audit
- [ ] Analyze new fraud patterns
- [ ] Plan improvements
- [ ] Update documentation

## Important Notes

⚠️ **When coins = real money:**
- False negatives (fraud) are FAR more expensive than false positives (blocked users)
- Better to temporarily block legitimate user than allow fraud
- Always err on the side of caution
- Provide clear appeals process
- Communicate transparently with users

✅ **Best Practices:**
- Always use HTTPS for payment data
- Encrypt database at rest
- Audit all withdrawal requests
- Keep fraud thresholds updated
- Monitor for new fraud patterns
- Train support team regularly
- Document all decisions
- Maintain compliance audit trail

🔒 **Security Reminders:**
- Never log user PII unnecessarily
- Use strong passwords for admin accounts
- Enable 2FA for all admins
- Rotate API keys regularly
- Keep system dependencies updated
- Have incident response plan
- Test disaster recovery regularly
- Maintain data backups

## Support

**Implementation Questions?**
→ See `FRAUD_DETECTION_IMPLEMENTATION.md`

**Deployment Issues?**
→ See `DEPLOYMENT_GUIDE.md`

**ML Model Questions?**
→ See `python-service/app/fraud_detection.py` comments

**Need to adjust thresholds?**
→ Edit `src/config/fraud.config.ts` and restart

**Critical production issue?**
→ Check circuit breaker: `redis-cli GET circuit-breaker:ads`
→ Disable manually if needed: `redis-cli SET circuit-breaker:ads closed`

---

**Remember**: This system is built for worst-case scenarios. 
When the platform's existence depends on stopping fraud, 
no layer of security is too much.
