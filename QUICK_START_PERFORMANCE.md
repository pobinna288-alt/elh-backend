# Quick Start: High-Performance Backend

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies

```bash
npm install --save @nestjs/cache-manager cache-manager cache-manager-redis-yet
npm install --save @nestjs/bull bull
npm install --save @nestjs/throttler nestjs-throttler-storage-redis
npm install --save ioredis
```

### 2. Update Environment Variables

Add to your `.env`:

```bash
# Redis (Required for caching and queues)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# API Key (for internal services)
API_KEY=generate_a_secure_random_key_here
```

### 3. Update app.module.ts

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';

// Import new modules
import { PerformanceModule } from './common/performance/performance.module';
import { CachingModule } from './common/caching/caching.module';
import { QueueModule } from './common/queue/queue.module';
import { SecurityModule } from './common/security/security.module';
import { PerformanceInterceptor } from './common/performance/interceptors/performance.interceptor';
import { HttpCacheInterceptor } from './common/caching/interceptors/http-cache.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({ /* your config */ }),
    
    // Add performance modules
    PerformanceModule,
    CachingModule,
    QueueModule,
    SecurityModule,
    
    // Your existing modules
    // AuthModule,
    // UsersModule,
    // etc...
  ],
  providers: [
    // Global performance interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
    // Global cache interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpCacheInterceptor,
    },
  ],
})
export class AppModule {}
```

### 4. Install and Run Redis

**Windows (using Docker)**:
```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

**Or download from**: https://github.com/microsoftarchive/redis/releases

**Verify Redis**:
```bash
redis-cli PING
# Should return: PONG
```

### 5. Apply Database Indexes

```bash
# Connect to your database
psql -U postgres -d elh_backend

# Run the indexes script
\i database/indexes/performance-indexes.sql
```

### 6. Start the Server

```bash
npm run start:dev
```

### 7. Test Performance

**Check health**:
```bash
curl http://localhost:3000/api/v1/performance/health
```

**Get performance stats**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/performance/stats
```

---

## 📝 Usage Examples

### Example 1: Cache an Endpoint

```typescript
import { Controller, Get } from '@nestjs/common';
import { CacheTTL } from './common/caching/decorators/cache.decorators';

@Controller('users')
export class UsersController {
  
  @Get(':id')
  @CacheTTL(300) // Cache for 5 minutes
  async getUser(@Param('id') id: number) {
    return this.usersService.findOne(id);
  }
}
```

### Example 2: Add Pagination

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { PaginationDto } from './common/dto/pagination.dto';

@Controller('ads')
export class AdsController {
  
  @Get()
  async getAds(@Query() query: PaginationDto) {
    // PaginationDto automatically enforces max 100 items
    return this.adsService.findAll(query.page, query.limit);
  }
}
```

### Example 3: Background Job

```typescript
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QueueName, JobType } from './common/queue/queue.constants';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectQueue(QueueName.PAYMENT_VERIFICATION) 
    private paymentQueue: Queue,
  ) {}

  async verifyPayment(reference: string) {
    // Queue the job (non-blocking)
    await this.paymentQueue.add(JobType.VERIFY_PAYMENT, { reference });
    
    return { status: 'processing', message: 'Verification queued' };
  }
}
```

### Example 4: Custom Rate Limit

```typescript
import { Controller, Post } from '@nestjs/common';
import { RateLimit } from './common/security/guards/custom-throttler.guard';

@Controller('auth')
export class AuthController {
  
  @Post('login')
  @RateLimit(5, 60) // Max 5 login attempts per minute
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
```

---

## 🎯 Next Steps

### Immediate Actions

1. **Apply database indexes** (most important for performance)
   ```bash
   psql -d elh_backend -f database/indexes/performance-indexes.sql
   ```

2. **Add caching to frequently accessed endpoints**
   - User profile
   - Ads list
   - Payment status

3. **Move heavy operations to background jobs**
   - Email sending
   - Payment verification
   - Fraud detection

### Monitoring

1. **Check performance regularly**:
   ```bash
   curl http://localhost:3000/api/v1/performance/stats
   ```

2. **Monitor slow queries** (in PostgreSQL):
   ```sql
   SELECT * FROM pg_stat_statements 
   WHERE mean_exec_time > 100 
   ORDER BY mean_exec_time DESC;
   ```

3. **Monitor Redis**:
   ```bash
   redis-cli INFO memory
   redis-cli INFO stats
   ```

### Optimization Checklist

- [ ] All list endpoints use pagination
- [ ] All frequently accessed endpoints are cached
- [ ] Database indexes are applied
- [ ] Heavy operations moved to background jobs
- [ ] Rate limiting configured for all endpoints
- [ ] Response DTOs return only necessary fields
- [ ] No N+1 query problems
- [ ] Redis is running and connected
- [ ] Performance monitoring is enabled

---

## 🔧 Troubleshooting

### Redis Connection Failed

**Problem**: `Error: connect ECONNREFUSED`

**Solution**:
```bash
# Start Redis
docker start redis

# Or install Redis locally
# Windows: https://github.com/microsoftarchive/redis/releases
# Mac: brew install redis && brew services start redis
# Linux: sudo apt-get install redis-server && sudo systemctl start redis
```

### Slow Queries

**Problem**: Endpoints taking > 500ms

**Solution**:
1. Check if indexes are applied
2. Enable query logging:
   ```typescript
   // In TypeORM config
   logging: true,
   ```
3. Look for missing indexes on WHERE/JOIN/ORDER BY columns

### Cache Not Working

**Problem**: Cache hit rate is low

**Solution**:
1. Verify Redis connection: `redis-cli PING`
2. Check TTL is set correctly
3. Ensure GET requests (cache only works for GET)
4. Verify `@CacheTTL()` decorator is used

### High Memory Usage

**Problem**: Application using too much memory

**Solution**:
1. Check Redis memory: `redis-cli INFO memory`
2. Reduce cache TTL for less important data
3. Limit pagination max to 50 instead of 100
4. Clear old cache: `redis-cli FLUSHDB` (if needed)

---

## 📚 Documentation

- [Full Architecture Guide](PERFORMANCE_ARCHITECTURE.md)
- [Example Implementation](EXAMPLE_OPTIMIZED_CONTROLLER.md)
- [Database Indexes](database/indexes/performance-indexes.sql)

---

## 🎉 You're Ready!

Your backend is now optimized for:
- ⚡ Fast responses (< 100ms)
- 📈 High scalability (10,000+ users)
- 🔒 Secure operations
- 💰 Cost-effective (efficient resource usage)

Start building and watch your performance soar! 🚀
