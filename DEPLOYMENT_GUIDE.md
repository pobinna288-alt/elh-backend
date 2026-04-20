# Deployment Guide: High-Stakes Fraud Detection System

## Pre-Deployment Checklist

- [ ] Database migrations applied (fraud-detection.sql)
- [ ] PostgreSQL indices created for performance
- [ ] Python ML service built and tested
- [ ] Redis configured and accessible
- [ ] Environment variables configured
- [ ] SSL certificates installed (for payment data)
- [ ] Backups scheduled
- [ ] Monitoring and alerts set up
- [ ] Support team trained on admin interface
- [ ] Legal review completed

## Environment Variables

```bash
# Node.js Backend
AD_PROVIDER_API=https://api.adprovider.com
AD_PROVIDER_API_KEY=your_api_key
JWT_SECRET=your_secret_key
DATABASE_URL=postgresql://user:pass@localhost/elh_backend
REDIS_URL=redis://localhost:6379

# ML Service
ML_SERVICE_URL=http://python-fraud-service:8000
LOG_LEVEL=INFO
FLASK_ENV=production

# Fraud Detection
FRAUD_CONFIG_ENV=production
ENABLE_CIRCUIT_BREAKER=true
CIRCUIT_BREAKER_THRESHOLD=50
```

## Staging Deployment (1-2 weeks before production)

### Phase 1: Shadow Mode (Days 1-3)
```bash
# Run fraud checks but don't block anyone
# Enable logging for all fraud events
# Collect baseline metrics

FRAUD_CONFIG_ENV=staging
# - Lower thresholds to catch more fraud
# - Don't block/ban accounts
# - Log everything
```

### Phase 2: Monitoring (Days 4-7)
```bash
# Continue shadow mode
# Review metrics:
# - Fraud detection rate
# - False positive rate
# - ML service latency
# - Database query performance
```

### Phase 3: Soft Launch (Days 8-14)
```bash
# Enable for 10% of users
# Still don't block, only flag
# Monitor closely
```

## Production Deployment

### Step 1: Database Migration
```bash
# Backup existing database first
pg_dump -U postgres elh_backend > backup_$(date +%s).sql

# Run migration
psql -U postgres -d elh_backend -f database/schema/fraud-detection.sql

# Verify indices
psql -U postgres -d elh_backend -c "\di ad_rewards*"
```

### Step 2: Python Service Deployment
```bash
# Build Docker image
docker build -t elh-fraud-detector:v1 ./python-service

# Push to registry
docker push your-registry/elh-fraud-detector:v1

# Update docker-compose.yml
docker-compose up -d python-fraud-service

# Verify service is running
curl http://localhost:8000/health
```

### Step 3: Node.js Backend Deployment
```bash
# Update fraud config
cp src/config/fraud.config.ts.production src/config/fraud.config.ts

# Build
npm run build

# Deploy (using your deployment process)
# Restart services
pm2 restart all

# Verify endpoints
curl http://localhost:3000/rewards/fraud-protected/ad/start
```

### Step 4: Enable Fraud Detection
```typescript
// src/app.module.ts
@Module({
  imports: [
    FraudModule,  // Add this
    // ... other modules
  ],
})
export class AppModule {}
```

### Step 5: Database Indices Optimization
```sql
-- Create specialized indices for fraud queries
CREATE INDEX CONCURRENTLY idx_ad_rewards_user_state_earned 
ON ad_rewards(user_id, state, earned_at DESC);

CREATE INDEX CONCURRENTLY idx_fraud_events_user_severity 
ON fraud_events(user_id, severity DESC, created_at DESC);

-- Vacuum after large operations
VACUUM ANALYZE ad_rewards;
```

## Monitoring & Alerts

### Key Metrics to Monitor

```javascript
// Real-time dashboard
- Ads completed per minute
- Fraud detection rate
- False positive rate
- ML service response time
- Database query latency
- Pending vs. cleared rewards
- Circuit breaker status
```

### Alert Thresholds

```javascript
CRITICAL (page on-call):
- Fraud detection rate drops below 90%
- False positive rate exceeds 2%
- ML service unavailable > 5 minutes
- Circuit breaker open
- Database connection failures

HIGH (email alert):
- Daily financial discrepancy > 5%
- Response time > 1 second
- Pending rewards backlog > 10,000

MEDIUM (log only):
- New fraud pattern detected
- Unusual activity spike
```

### Setup Prometheus Metrics

```typescript
// Add to your service
import { register, Counter, Histogram } from 'prom-client';

const fraudDetectedCounter = new Counter({
  name: 'fraud_detected_total',
  help: 'Total fraud events detected',
  labelNames: ['severity']
});

const rewardProcessingTime = new Histogram({
  name: 'reward_processing_seconds',
  help: 'Reward processing time',
  buckets: [0.1, 0.5, 1, 2, 5]
});

@Get('/metrics')
async getMetrics() {
  return register.metrics();
}
```

## Rollback Plan

### If Critical Issues Found:

1. **Immediate (< 5 minutes)**
   ```bash
   # Disable fraud checks but keep logging
   FRAUD_CONFIG_ENV=development
   # Circuit breaker will still function
   ```

2. **Short-term (< 1 hour)**
   ```bash
   # Rollback to previous version
   docker-compose down
   git revert <commit>
   npm run build
   docker-compose up -d
   ```

3. **Data Recovery**
   ```bash
   # If rewards were incorrectly reversed
   psql -U postgres -d elh_backend -f recovery_script.sql
   ```

## Post-Deployment

### Daily Tasks (First 2 Weeks)
- [ ] Review fraud dashboard
- [ ] Check false positive rate
- [ ] Validate financial reconciliation
- [ ] Monitor ML service performance
- [ ] Review support tickets

### Weekly Tasks
- [ ] Generate fraud detection report
- [ ] Analyze new fraud patterns
- [ ] Update ML model if needed
- [ ] Review and approve/deny manual disputes
- [ ] Adjust thresholds if necessary

### Monthly Tasks
- [ ] Full system audit
- [ ] Performance analysis
- [ ] Cost analysis (fraud saved vs. system cost)
- [ ] Plan improvements
- [ ] Train new support staff

## Performance Optimization

### Database Query Optimization

```sql
-- Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Analyze query plans
EXPLAIN ANALYZE 
SELECT * FROM ad_rewards 
WHERE user_id = 'user_123' 
AND state = 'pending';
```

### Redis Optimization

```bash
# Monitor Redis memory
redis-cli INFO memory

# Set up eviction policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Monitor key sizes
redis-cli --bigkeys
```

### ML Service Scaling

```yaml
# docker-compose.yml
python-fraud-service:
  deploy:
    replicas: 3  # Run 3 instances
    resources:
      limits:
        cpus: '1'
        memory: 1G
```

## Troubleshooting Common Issues

### High False Positive Rate
```sql
-- Query to find users being blocked incorrectly
SELECT u.id, COUNT(fe.id) as fraud_events
FROM users u
JOIN fraud_events fe ON u.id = fe.user_id
WHERE u.banned = true
AND fe.created_at > NOW() - INTERVAL '7 days'
GROUP BY u.id
HAVING COUNT(fe.id) < 2;
```

### Fraud Leaking Through
```sql
-- Query to find recent fraud reversals
SELECT COUNT(*), reward_amount, reversal_reason
FROM ad_rewards
WHERE state = 'reversed'
AND reversed_at > NOW() - INTERVAL '24 hours'
GROUP BY reward_amount, reversal_reason;
```

### Database Performance Issues
```bash
# Increase connection pool
# In DATABASE_URL connection string
# Add: pool_size=20&max_overflow=40

# Scale read replicas
# Set up read-only PostgreSQL replica
# Point read queries to replica
```

## Success Metrics (After 1 Month)

✓ **Fraud Prevention**: > 98% of obvious fraud caught
✓ **False Positives**: < 0.5% of legitimate users blocked
✓ **Performance**: < 100ms average reward processing time
✓ **Uptime**: 99.9% system availability
✓ **Financial Impact**: Prevented fraud > Cost of system × 100

## Support & Escalation

### For Fraud Questions
- Contact: fraud-team@elh.com
- Slack: #fraud-detection

### For Technical Issues
- Create issue in GitHub
- Tag: fraud-detection
- Include logs and user ID

### Critical Issues (> $1000 at risk)
- Call on-call engineer immediately
- Page fraud team lead
- Initiate incident response

---

**Remember**: When coins = real money, security is not optional. It's the foundation of trust.
