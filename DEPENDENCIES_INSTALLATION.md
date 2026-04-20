# Required Dependencies for High-Performance Backend

## Installation Command

Run this command to install all performance-related dependencies:

```bash
npm install --save @nestjs/cache-manager cache-manager cache-manager-redis-yet @nestjs/bull bull ioredis @nestjs/throttler nestjs-throttler-storage-redis
```

## Individual Packages

### Caching
```bash
npm install --save @nestjs/cache-manager cache-manager cache-manager-redis-yet
```
- `@nestjs/cache-manager`: NestJS caching integration
- `cache-manager`: Caching library
- `cache-manager-redis-yet`: Redis store for cache-manager (modern, maintained)

### Background Jobs
```bash
npm install --save @nestjs/bull bull
npm install --save-dev @types/bull
```
- `@nestjs/bull`: NestJS integration for Bull
- `bull`: Redis-based queue for background jobs

### Redis Client
```bash
npm install --save ioredis
npm install --save-dev @types/ioredis
```
- `ioredis`: High-performance Redis client

### Rate Limiting
```bash
npm install --save @nestjs/throttler nestjs-throttler-storage-redis
```
- `@nestjs/throttler`: Rate limiting for NestJS
- `nestjs-throttler-storage-redis`: Redis storage for distributed rate limiting

---

## Already Installed (should be in your package.json)

These should already be installed:
- `@nestjs/common`
- `@nestjs/core`
- `@nestjs/config`
- `@nestjs/typeorm`
- `typeorm`
- `pg` (PostgreSQL driver)
- `axios` (for Paystack API)

---

## package.json Addition

Add these to your `package.json` dependencies:

```json
{
  "dependencies": {
    "@nestjs/cache-manager": "^2.1.1",
    "cache-manager": "^5.2.4",
    "cache-manager-redis-yet": "^4.1.2",
    "@nestjs/bull": "^10.0.1",
    "bull": "^4.11.5",
    "ioredis": "^5.3.2",
    "@nestjs/throttler": "^5.1.1",
    "nestjs-throttler-storage-redis": "^0.4.1"
  },
  "devDependencies": {
    "@types/bull": "^4.10.0",
    "@types/ioredis": "^5.0.0"
  }
}
```

---

## Installation Steps

1. **Install dependencies**:
   ```bash
   npm install --save @nestjs/cache-manager cache-manager cache-manager-redis-yet @nestjs/bull bull ioredis @nestjs/throttler nestjs-throttler-storage-redis
   ```

2. **Install dev dependencies**:
   ```bash
   npm install --save-dev @types/bull @types/ioredis
   ```

3. **Verify installation**:
   ```bash
   npm list | grep -E "cache-manager|bull|ioredis|throttler"
   ```

---

## Redis Installation

### Windows (Docker - Recommended)
```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

### Windows (Native)
Download from: https://github.com/microsoftarchive/redis/releases

### macOS
```bash
brew install redis
brew services start redis
```

### Linux
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
```

### Verify Redis
```bash
redis-cli PING
# Should return: PONG
```

---

## Environment Variables

Add to your `.env` file:

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# API Security
API_KEY=generate_a_secure_random_key_here

# Paystack (if not already configured)
PAYSTACK_SECRET_KEY=sk_test_xxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
PAYSTACK_CALLBACK_URL=http://localhost:3000/api/v1/payments/callback
```

---

## Troubleshooting

### Issue: Cache manager not found
**Solution**: Make sure you have the correct version:
```bash
npm install --save @nestjs/cache-manager@^2.1.1 cache-manager@^5.2.4
```

### Issue: Bull types not found
**Solution**: Install type definitions:
```bash
npm install --save-dev @types/bull
```

### Issue: Redis connection failed
**Solution**: Ensure Redis is running:
```bash
# Check if Redis is running
redis-cli PING

# If not running, start it:
# Docker: docker start redis
# Mac: brew services start redis
# Linux: sudo systemctl start redis
```

### Issue: Module not found errors
**Solution**: Clear cache and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Next Steps

After installing dependencies:

1. ✅ Install all packages
2. ✅ Start Redis server
3. ✅ Update `.env` with Redis config
4. ✅ Run database indexes script
5. ✅ Start your application

```bash
npm run start:dev
```

Visit http://localhost:3000/api/v1/performance/health to verify everything is working!
