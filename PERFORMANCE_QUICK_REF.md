# Performance Optimization Quick Reference

## 🎯 One-Page Cheat Sheet

---

## ⚡ Top 10 Performance Rules

1. **Always paginate** - Max 100 items per request
2. **Cache frequently accessed data** - Use @CacheTTL() decorator
3. **Index database columns** - WHERE, JOIN, ORDER BY columns
4. **Return only needed fields** - Use Response DTOs
5. **Process heavy tasks async** - Use background jobs
6. **Avoid N+1 queries** - Use joins instead of loops
7. **Rate limit endpoints** - Prevent abuse
8. **Validate inputs** - Prevent security issues
9. **Monitor performance** - Check /performance/stats regularly
10. **Never expose secrets** - Use environment variables

---

## 🚀 Quick Setup (5 Commands)

```bash
# 1. Install dependencies
npm install --save @nestjs/cache-manager cache-manager cache-manager-redis-yet @nestjs/bull bull ioredis @nestjs/throttler nestjs-throttler-storage-redis

# 2. Start Redis
docker run -d --name redis -p 6379:6379 redis:alpine

# 3. Apply database indexes
psql -d elh_backend -f database/indexes/performance-indexes.sql

# 4. Copy environment template
cp .env.template .env

# 5. Start server
npm run start:dev
```

---

## 📝 Common Patterns

### 1. Cache an Endpoint
```typescript
@Get('users/:id')
@CacheTTL(300) // 5 minutes
async getUser(@Param('id') id: number) {
  return this.usersService.findOne(id);
}
```

### 2. Add Pagination
```typescript
@Get('ads')
async getAds(@Query() query: PaginationDto) {
  return this.adsService.findAll(query.page, query.limit);
}
```

### 3. Background Job
```typescript
await this.queue.add(JobType.VERIFY_PAYMENT, { reference });
return { status: 'processing' }; // Immediate response
```

### 4. Custom Rate Limit
```typescript
@Post('login')
@RateLimit(5, 60) // 5 per minute
async login(@Body() dto: LoginDto) {
  return this.authService.login(dto);
}
```

### 5. Optimized Query
```typescript
const ads = await this.adsRepository
  .createQueryBuilder('ad')
  .select(['ad.id', 'ad.title', 'ad.price']) // Only needed fields
  .where('ad.status = :status', { status: 'active' })
  .orderBy('ad.createdAt', 'DESC')
  .take(20) // Limit results
  .getMany();
```

---

## 🎨 Response DTO Template

```typescript
export class EntityResponseDto {
  id: number;
  name: string;
  // Include only necessary fields
  
  constructor(entity: any) {
    this.id = entity.id;
    this.name = entity.name;
    // Don't expose: password, tokens, internal IDs
  }
}
```

---

## 📊 Cache TTL Guidelines

| Data Type | TTL | Reason |
|-----------|-----|--------|
| User profile | 5 min | Changes occasionally |
| Payment status | 30 min | Rarely changes after success |
| Ads list | 5 min | Updates frequently |
| Static content | 1 hour | Rarely changes |
| Search results | 3 min | Dynamic content |

---

## 🔍 Performance Monitoring

### Check Performance Stats
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/v1/performance/stats
```

### Check Health
```bash
curl http://localhost:3000/api/v1/performance/health
```

### Monitor Database
```sql
-- Slow queries (PostgreSQL)
SELECT query, mean_exec_time, calls
FROM pg_stat_statements 
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;
```

### Monitor Redis
```bash
redis-cli INFO stats    # Cache statistics
redis-cli INFO memory   # Memory usage
redis-cli DBSIZE        # Number of keys
```

---

## ⚠️ Anti-Patterns (DON'T DO THIS)

### ❌ BAD: No pagination
```typescript
@Get('all-ads')
async getAllAds() {
  return this.adsRepository.find(); // Could return 10,000+ records!
}
```

### ✅ GOOD: With pagination
```typescript
@Get('ads')
async getAds(@Query() query: PaginationDto) {
  return this.adsRepository.findPaginated(query.page, query.limit);
}
```

---

### ❌ BAD: Blocking operation
```typescript
await this.sendEmail(user.email); // Blocks for 2-3 seconds
return { success: true };
```

### ✅ GOOD: Background job
```typescript
await this.emailQueue.add({ email: user.email });
return { success: true }; // Immediate response
```

---

### ❌ BAD: Over-fetching
```typescript
return user; // Returns password, tokens, everything!
```

### ✅ GOOD: DTO with only needed fields
```typescript
return new UserResponseDto(user); // Only safe fields
```

---

### ❌ BAD: N+1 queries
```typescript
for (const ad of ads) {
  ad.user = await this.userRepository.findOne(ad.userId);
}
```

### ✅ GOOD: Single query with join
```typescript
const ads = await this.adsRepository
  .createQueryBuilder('ad')
  .leftJoinAndSelect('ad.user', 'user')
  .getMany();
```

---

## 🎯 Performance Targets

| Metric | Target | How to Achieve |
|--------|--------|----------------|
| Response time (cached) | < 50ms | Use Redis cache |
| Response time (uncached) | < 150ms | Database indexes + pagination |
| Cache hit rate | > 80% | Smart caching strategy |
| Requests/second | 1000+ | Redis + connection pooling |
| Database queries | < 50ms | Apply all indexes |
| Payment processing | < 200ms | Async verification |

---

## 🛠️ Essential Commands

### Development
```bash
npm run start:dev          # Start with hot reload
npm run build             # Build for production
npm run start:prod        # Start production server
```

### Database
```bash
# Apply indexes
psql -d elh_backend -f database/indexes/performance-indexes.sql

# Check slow queries
psql -d elh_backend -c "SELECT * FROM pg_stat_statements WHERE mean_exec_time > 100;"

# Analyze tables
psql -d elh_backend -c "ANALYZE users; ANALYZE ads; ANALYZE payments;"
```

### Redis
```bash
redis-cli PING            # Test connection
redis-cli FLUSHDB         # Clear cache (dev only!)
redis-cli INFO stats      # View statistics
redis-cli KEYS "*"        # List all keys (dev only!)
```

---

## 📱 Environment Variables (Required)

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=elh_backend

# Redis
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your_jwt_secret_min_32_chars
API_KEY=your_api_key

# Paystack
PAYSTACK_SECRET_KEY=sk_test_xxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

---

## 🚨 Troubleshooting

| Problem | Solution |
|---------|----------|
| Slow responses | Check if indexes applied, verify Redis running |
| Redis connection failed | Start Redis: `docker start redis` |
| Cache not working | Ensure `@CacheTTL()` decorator and GET method |
| High memory | Clear Redis: `redis-cli FLUSHDB` |
| Payment webhook fails | Verify signature validation |

---

## 📚 Documentation Links

- [Implementation Summary](IMPLEMENTATION_SUMMARY.md) - What was built
- [Quick Start Guide](QUICK_START_PERFORMANCE.md) - Get started in 5 minutes
- [Architecture Guide](PERFORMANCE_ARCHITECTURE.md) - Full technical details
- [Example Controller](EXAMPLE_OPTIMIZED_CONTROLLER.md) - Complete example
- [Dependencies](DEPENDENCIES_INSTALLATION.md) - Installation guide

---

## ✅ Pre-Deployment Checklist

- [ ] All dependencies installed
- [ ] Redis running and connected
- [ ] Database indexes applied
- [ ] Environment variables configured
- [ ] Payment webhooks tested
- [ ] Rate limiting configured
- [ ] Performance stats accessible
- [ ] Logs configured for production
- [ ] SSL/TLS configured
- [ ] CORS configured for production domain

---

**Keep this reference handy for quick access to performance best practices! 🚀**
