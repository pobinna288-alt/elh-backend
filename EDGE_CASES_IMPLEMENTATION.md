# 🚀 Edge Case Handling - Quick Implementation

## Priority 1: Essential (Implement First)

### 1. Request Timeouts (5 minutes)
```typescript
// File: src/main.ts
// Add after app creation

app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds
  res.setTimeout(30000);
  next();
});

// Status: ✅ Prevents indefinite hanging
```

### 2. Rate Limiting (10 minutes)
```bash
# Install package
npm install @nestjs/throttler
```

```typescript
// File: src/modules/auth/auth.module.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,      // Time window in seconds
      limit: 10,    // Max requests per window
    }),
    // ... other imports
  ],
})
```

```typescript
// File: src/modules/auth/auth.controller.ts
import { Throttle } from '@nestjs/throttler';

// Override for sensitive endpoints
@Throttle(3, 60) // 3 per minute
@Post('password-reset/request')
async requestPasswordReset(...) {}

@Throttle(5, 60) // 5 per minute
@Post('login')
async login(...) {}

// Status: ✅ Prevents abuse and duplicate requests
```

### 3. Health Check Endpoint (15 minutes)
```typescript
// File: src/modules/health/health.controller.ts (CREATE NEW)
import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private connection: Connection,
  ) {}

  @Get()
  async check() {
    const dbHealthy = this.connection.isConnected;
    
    return {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected',
      uptime: Math.floor(process.uptime()),
      version: '1.0.0'
    };
  }
}
```

```typescript
// File: src/modules/health/health.module.ts (CREATE NEW)
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

```typescript
// File: src/app.module.ts
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // ... other imports
    HealthModule,
  ],
})
```

```bash
# Test it
curl http://localhost:3000/health

# Response:
{
  "status": "healthy",
  "timestamp": "2026-01-12T10:30:00.000Z",
  "database": "connected",
  "uptime": 3600,
  "version": "1.0.0"
}

# Status: ✅ Load balancers can monitor backend health
```

---

## Priority 2: Recommended (Implement Next)

### 4. Database Connection Resilience (10 minutes)
```typescript
// File: src/app.module.ts
// Update TypeORM configuration

TypeOrmModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    host: configService.get<string>('DB_HOST'),
    port: configService.get<number>('DB_PORT'),
    username: configService.get<string>('DB_USERNAME'),
    password: configService.get<string>('DB_PASSWORD'),
    database: configService.get<string>('DB_NAME'),
    
    // Connection pooling settings
    extra: {
      max: 10,                          // Max connections
      min: 2,                           // Min connections
      connectionTimeoutMillis: 10000,   // 10 sec timeout
      idleTimeoutMillis: 30000,         // Close idle after 30 sec
    },
    
    // Retry configuration
    retryAttempts: 3,
    retryDelay: 3000, // 3 seconds between retries
    
    // Other settings
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
  }),
  inject: [ConfigService],
}),

// Status: ✅ Handles temporary database connection issues
```

### 5. Graceful Shutdown (15 minutes)
```typescript
// File: src/main.ts
// Add at end of bootstrap function

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ... existing configuration
  
  // Enable graceful shutdown
  app.enableShutdownHooks();
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  // Handle shutdown signals
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n${signal} received - shutting down gracefully...`);
    
    try {
      // Wait for ongoing requests to complete (30 sec max)
      await app.close();
      console.log('✓ HTTP server closed');
      
      console.log('✓ Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };
  
  // Listen for shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  console.log(`
  ╔════════════════════════════════════════════════╗
  ║                                                ║
  ║     🚀 EL HANNORA Backend Server Running     ║
  ║                                                ║
  ║     📍 http://localhost:${port}                 ║
  ║     📚 API: http://localhost:${port}/api/v1    ║
  ║     📖 Docs: http://localhost:${port}/api/docs ║
  ║     ❤️  Health: http://localhost:${port}/health ║
  ║                                                ║
  ╚════════════════════════════════════════════════╝
  `);
}

bootstrap();

// Status: ✅ No interrupted requests during deployments
```

### 6. Service Unavailable Exception Handler (10 minutes)
```typescript
// File: src/common/filters/service-unavailable.filter.ts (CREATE NEW)
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class ServiceUnavailableFilter implements ExceptionFilter {
  catch(error: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    // Database connection errors
    const dbErrors = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'];
    
    if (dbErrors.includes(error.code)) {
      return response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        statusCode: 503,
        message: 'Service temporarily unavailable. Please try again in a moment.',
        error: 'Service Unavailable'
      });
    }
    
    // Default error handling
    const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
    response.status(status).json({
      statusCode: status,
      message: error.message || 'An error occurred',
      error: error.name || 'Internal Server Error'
    });
  }
}
```

```typescript
// File: src/main.ts
import { ServiceUnavailableFilter } from './common/filters/service-unavailable.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Add global exception filter
  app.useGlobalFilters(new ServiceUnavailableFilter());
  
  // ... rest of configuration
}

// Status: ✅ User-friendly error messages for database issues
```

---

## Priority 3: Frontend Improvements

### 7. Auto Token Refresh (20 minutes)
```javascript
// File: frontend/js/auth.js

// Decode JWT and schedule refresh
function scheduleTokenRefresh(accessToken) {
  // Decode JWT payload
  const base64Url = accessToken.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const payload = JSON.parse(atob(base64));
  
  // Get expiry time
  const expiresAt = payload.exp * 1000; // Convert to milliseconds
  const now = Date.now();
  
  // Calculate when to refresh (2 minutes before expiry)
  const refreshBuffer = 2 * 60 * 1000; // 2 minutes
  const refreshTime = expiresAt - now - refreshBuffer;
  
  if (refreshTime > 0) {
    console.log(`Token expires in ${Math.floor((expiresAt - now) / 1000)}s. Will refresh in ${Math.floor(refreshTime / 1000)}s`);
    
    // Clear any existing timer
    if (window.tokenRefreshTimer) {
      clearTimeout(window.tokenRefreshTimer);
    }
    
    // Schedule refresh
    window.tokenRefreshTimer = setTimeout(async () => {
      console.log('Auto-refreshing token...');
      await refreshAccessToken();
    }, refreshTime);
  }
}

// Call after login and after each manual refresh
async function login(email, password) {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  // Save tokens
  sessionStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  
  // Schedule auto-refresh
  scheduleTokenRefresh(data.accessToken);
  
  return data;
}

// Status: ✅ Proactive token refresh prevents expiry issues
```

### 8. Request Retry with Token Refresh (25 minutes)
```javascript
// File: frontend/js/api.js

// Axios-like fetch wrapper with auto-retry
class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }
  
  async request(url, options = {}) {
    const accessToken = sessionStorage.getItem('accessToken');
    
    // Add authorization header
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    // Make request
    let response = await fetch(this.baseURL + url, {
      ...options,
      headers,
      signal: AbortSignal.timeout(30000) // 30 sec timeout
    });
    
    // Check if 401 (unauthorized)
    if (response.status === 401 && !options._retry) {
      console.log('Access token expired - attempting refresh...');
      
      try {
        // Refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        const refreshResponse = await fetch(this.baseURL + '/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
        
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          const newAccessToken = data.accessToken;
          
          // Save new token
          sessionStorage.setItem('accessToken', newAccessToken);
          
          // Schedule next refresh
          scheduleTokenRefresh(newAccessToken);
          
          // Retry original request with new token
          console.log('Token refreshed - retrying request...');
          return this.request(url, { ...options, _retry: true });
        } else {
          // Refresh failed - logout
          console.error('Token refresh failed - redirecting to login');
          this.logout();
        }
      } catch (error) {
        console.error('Error refreshing token:', error);
        this.logout();
      }
    }
    
    return response;
  }
  
  logout() {
    sessionStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login.html';
  }
  
  // Convenience methods
  get(url, options) {
    return this.request(url, { ...options, method: 'GET' });
  }
  
  post(url, data, options) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

// Create singleton instance
const api = new ApiClient('http://localhost:3000/api/v1');

// Usage examples:
// await api.get('/ads');
// await api.post('/ads', { title: 'My Ad' });

// Status: ✅ Automatic retry after token refresh
```

### 9. Duplicate Request Prevention (15 minutes)
```javascript
// File: frontend/js/forms.js

// Prevent duplicate form submissions
class FormHandler {
  constructor(formElement) {
    this.form = formElement;
    this.submitting = false;
    this.init();
  }
  
  init() {
    this.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Prevent duplicate submissions
      if (this.submitting) {
        console.log('Form submission already in progress...');
        return;
      }
      
      this.submitting = true;
      const submitButton = this.form.querySelector('button[type="submit"]');
      const originalText = submitButton.textContent;
      
      try {
        // Disable button and show loading
        submitButton.disabled = true;
        submitButton.textContent = 'Loading...';
        
        // Get form data
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData);
        
        // Submit
        await this.onSubmit(data);
        
      } catch (error) {
        console.error('Form submission error:', error);
        alert(error.message || 'An error occurred. Please try again.');
      } finally {
        // Re-enable button
        submitButton.disabled = false;
        submitButton.textContent = originalText;
        this.submitting = false;
      }
    });
  }
  
  onSubmit(data) {
    throw new Error('onSubmit must be implemented');
  }
}

// Usage example:
class LoginForm extends FormHandler {
  async onSubmit(data) {
    const response = await api.post('/auth/login', data);
    if (response.ok) {
      const result = await response.json();
      // Save tokens and redirect
      sessionStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      window.location.href = '/dashboard.html';
    } else {
      const error = await response.json();
      throw new Error(error.message);
    }
  }
}

// Initialize forms
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    new LoginForm(loginForm);
  }
});

// Status: ✅ Prevents duplicate submissions from double-clicks
```

---

## Testing Edge Cases

### Test Script: test-edge-cases.ps1
```powershell
# Test 1: Request Timeout
Write-Host "Test 1: Request Timeout" -ForegroundColor Cyan
try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/v1/slow-endpoint" `
    -TimeoutSec 35
  Write-Host "✓ Timeout handled correctly" -ForegroundColor Green
} catch {
  Write-Host "✗ Timeout test failed" -ForegroundColor Red
}

# Test 2: Rate Limiting
Write-Host "`nTest 2: Rate Limiting" -ForegroundColor Cyan
for ($i = 1; $i -le 12; $i++) {
  try {
    Invoke-RestMethod -Method POST `
      -Uri "http://localhost:3000/api/v1/auth/login" `
      -ContentType "application/json" `
      -Body '{"email":"test@example.com","password":"wrong"}'
    Write-Host "Request $i: Success"
  } catch {
    if ($_.Exception.Response.StatusCode -eq 429) {
      Write-Host "✓ Rate limiting active (request $i blocked)" -ForegroundColor Green
      break
    }
  }
}

# Test 3: Health Check
Write-Host "`nTest 3: Health Check" -ForegroundColor Cyan
$health = Invoke-RestMethod -Uri "http://localhost:3000/health"
if ($health.status -eq "healthy") {
  Write-Host "✓ Health check: $($health.status)" -ForegroundColor Green
  Write-Host "  Database: $($health.database)"
  Write-Host "  Uptime: $($health.uptime)s"
} else {
  Write-Host "✗ Health check failed" -ForegroundColor Red
}

# Test 4: Multiple Device Sessions
Write-Host "`nTest 4: Multiple Device Sessions" -ForegroundColor Cyan
$device1 = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3000/api/v1/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com","password":"Pass123!"}'

$device2 = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3000/api/v1/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com","password":"Pass123!"}'

# Logout device1
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3000/api/v1/auth/logout" `
  -ContentType "application/json" `
  -Body "{`"refreshToken`":`"$($device1.refreshToken)`"}"

# Try to refresh device2 (should still work)
try {
  $refresh = Invoke-RestMethod -Method POST `
    -Uri "http://localhost:3000/api/v1/auth/refresh" `
    -ContentType "application/json" `
    -Body "{`"refreshToken`":`"$($device2.refreshToken)`"}"
  Write-Host "✓ Device 2 still active after Device 1 logout" -ForegroundColor Green
} catch {
  Write-Host "✗ Multi-device test failed" -ForegroundColor Red
}

Write-Host "`n=== Edge Case Tests Complete ===" -ForegroundColor Cyan
```

---

## Quick Status Check

Run this to verify implementations:

```bash
# 1. Check if rate limiting installed
npm list @nestjs/throttler

# 2. Check if health endpoint works
curl http://localhost:3000/health

# 3. Test rate limiting
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  echo "Request $i"
done

# 4. Check timeout configuration
# Look for setTimeout in main.ts

# 5. Check graceful shutdown
# Look for SIGTERM handler in main.ts
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Request timeouts configured (30s)
- [ ] Rate limiting active on auth endpoints
- [ ] Health check endpoint accessible
- [ ] Database connection pool configured
- [ ] Graceful shutdown handlers added
- [ ] Service unavailable filter installed
- [ ] Frontend auto-refresh implemented
- [ ] Frontend retry logic added
- [ ] Duplicate submission prevention added
- [ ] All edge case tests passing

---

**Next Steps:** Implement Priority 1 items first (30 minutes total)  
**Full Documentation:** See `AUTHENTICATION_EDGE_CASES.md`  
**Status:** Ready to implement
