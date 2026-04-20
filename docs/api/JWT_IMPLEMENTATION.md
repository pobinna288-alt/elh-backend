# 🔐 JWT Authentication - Implementation Guide

## 🎯 Overview

EL HANNORA uses a **dual-token authentication strategy**:
- **Access Token** (15 min) - Used for all API requests
- **Refresh Token** (30 days) - Used to get new access tokens

This approach provides both **security** (short-lived tokens) and **user experience** (stay logged in for 30 days).

---

## 🏗️ System Architecture

### **Components**

```
┌─────────────────────────────────────────────────────┐
│                   Backend                           │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ JWT Strategy (jwt.strategy.ts)               │  │
│  │ • Validates access token signature           │  │
│  │ • Checks expiration                           │  │
│  │ • Extracts user info from token               │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ JWT Auth Guard (jwt-auth.guard.ts)           │  │
│  │ • Protects routes                             │  │
│  │ • Returns 401 if token invalid/expired        │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ Auth Service (auth.service.ts)                │  │
│  │ • Generates tokens on login                   │  │
│  │ • Refreshes access tokens                     │  │
│  │ • Stores/validates refresh tokens             │  │
│  │ • Handles logout                              │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ Database (refresh_tokens table)               │  │
│  │ • Stores hashed refresh tokens                │  │
│  │ • Tracks device info                          │  │
│  │ • Manages token revocation                    │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Authentication Flow

### **Step-by-Step Process**

#### **1. User Login**
```typescript
// Frontend sends login request
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123"
}

// Backend validates credentials and generates tokens
const accessToken = jwt.sign(
  { sub: userId, email, role },
  JWT_SECRET,
  { expiresIn: '15m' }
);

const refreshToken = jwt.sign(
  { sub: userId, email, role, type: 'refresh' },
  JWT_SECRET,
  { expiresIn: '30d' }
);

// Hash and store refresh token in database
const hashedToken = sha256(refreshToken);
await db.refreshTokens.save({
  userId,
  token: hashedToken,
  deviceInfo: req.headers['user-agent'],
  ipAddress: req.ip,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
});

// Return both tokens to client
return {
  accessToken,
  refreshToken,
  user: { id, email, fullName, ... }
};
```

#### **2. Making API Requests**
```typescript
// Frontend attaches access token to every request
GET /api/v1/ads
Headers: {
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
}

// Backend JWT Guard validates token
@UseGuards(JwtAuthGuard)
@Get('ads')
async getAds(@Request() req) {
  // req.user contains: { userId, email, role }
  return this.adsService.findAll();
}

// JWT Strategy automatically:
1. Extracts token from Authorization header
2. Verifies signature using JWT_SECRET
3. Checks expiration timestamp
4. Decodes payload and attaches to req.user
5. If valid → Allow request
6. If invalid → Return 401 Unauthorized
```

#### **3. Token Expiration & Auto-Refresh**
```typescript
// Scenario: Access token expired after 15 minutes

// Frontend makes API request
GET /api/v1/ads
Authorization: Bearer <expired_token>

// Backend responds with 401
Response: 401 Unauthorized

// Frontend intercepts 401 and refreshes token
async function handleApiRequest(url, options) {
  let response = await fetch(url, options);
  
  if (response.status === 401) {
    // Token expired - get new one
    const refreshToken = getRefreshToken();
    
    const refreshResponse = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    });
    
    if (refreshResponse.ok) {
      const { accessToken } = await refreshResponse.json();
      saveAccessToken(accessToken);
      
      // Retry original request with new token
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${accessToken}`
        }
      });
    } else {
      // Refresh failed - redirect to login
      redirectToLogin();
    }
  }
  
  return response;
}

// User never notices the refresh happened!
```

#### **4. Refresh Token Validation**
```typescript
// Backend validates refresh token
POST /api/v1/auth/refresh
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// Validation process:
1. Verify JWT signature
   try {
     payload = jwt.verify(refreshToken, JWT_SECRET);
   } catch (error) {
     return 401; // Invalid signature or format
   }

2. Hash token and look up in database
   const hashedToken = sha256(refreshToken);
   const storedToken = await db.refreshTokens.findOne({
     where: { token: hashedToken }
   });
   
   if (!storedToken) {
     return 401; // Token not found (never created or deleted)
   }

3. Check if token is revoked
   if (storedToken.isRevoked) {
     return 401; // User logged out
   }

4. Check if token expired
   if (new Date() > storedToken.expiresAt) {
     return 401; // Token expired
   }

5. Generate new access token
   const newAccessToken = jwt.sign(
     { sub: userId, email, role },
     JWT_SECRET,
     { expiresIn: '15m' }
   );

6. Update last used timestamp
   storedToken.lastUsedAt = new Date();
   await db.refreshTokens.save(storedToken);

7. Return new access token
   return { accessToken: newAccessToken };

// Note: Refresh token stays the same!
```

#### **5. Logout**
```typescript
// Frontend sends logout request
POST /api/v1/auth/logout
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// Backend revokes refresh token
const hashedToken = sha256(refreshToken);
await db.refreshTokens.update(
  { token: hashedToken },
  { isRevoked: true, revokedAt: new Date() }
);

// Frontend clears tokens
sessionStorage.removeItem('accessToken');
secureStorage.remove('refreshToken');

// Redirect to login page
window.location.href = '/login';

// Note: Access token remains valid until expiry (max 15 min)
// This is acceptable since it's short-lived
```

---

## 🔒 Why This Strategy Works

### **Problem: Access Tokens**
❌ **Long-lived tokens** (7+ days):
- If stolen, attacker has access for days
- No way to revoke (stateless)
- Security risk

❌ **Very short tokens** (1-2 min):
- User interrupted every minute
- Poor user experience
- Excessive refresh requests

### **Solution: Dual-Token System**
✅ **Short-lived access tokens** (15 min):
- Minimal damage if stolen (15 min window)
- No database lookup needed (fast)
- Automatically expires

✅ **Long-lived refresh tokens** (30 days):
- Good user experience (stay logged in)
- Stored in database (revokable)
- Hashed for security

✅ **Automatic refresh**:
- Transparent to user
- No workflow interruption
- Happens in background

---

## 🛡️ Security Features

### **1. Token Hashing**
```typescript
// Refresh tokens are hashed before storage
const hashedToken = crypto
  .createHash('sha256')
  .update(refreshToken)
  .digest('hex');

// Why?
// If database is breached, attacker gets hashes, not actual tokens
// SHA-256 is one-way (cannot reverse to get original token)
```

### **2. Token Revocation**
```typescript
// Can revoke specific token (logout from device)
await db.refreshTokens.update(
  { id: tokenId },
  { isRevoked: true }
);

// Can revoke all tokens (logout from all devices)
await db.refreshTokens.update(
  { userId },
  { isRevoked: true }
);
```

### **3. Device Tracking**
```typescript
// Each refresh token tracks device
{
  userId: "uuid",
  deviceInfo: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  ipAddress: "192.168.1.100",
  createdAt: "2026-01-12T10:00:00Z",
  lastUsedAt: "2026-01-12T15:30:00Z"
}

// Benefits:
// - User can see active sessions
// - Detect suspicious logins (unusual IP/device)
// - Logout specific devices
```

### **4. Short Access Token Lifespan**
```typescript
// Access tokens expire quickly
expiresIn: '15m'

// Benefits:
// - If stolen, only 15 minutes of access
// - No need to revoke (expires naturally)
// - Stateless validation (no DB lookup)
```

---

## 💻 Frontend Implementation

### **Complete API Client with Auto-Refresh**
```javascript
class ApiClient {
  constructor() {
    this.baseUrl = 'http://localhost:3000/api/v1';
  }

  // Get current access token
  getAccessToken() {
    return sessionStorage.getItem('accessToken');
  }

  // Get refresh token
  getRefreshToken() {
    // Use secure storage (not localStorage!)
    return secureStorage.get('refreshToken');
  }

  // Save new access token
  setAccessToken(token) {
    sessionStorage.setItem('accessToken', token);
  }

  // Refresh access token
  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const { accessToken } = await response.json();
    this.setAccessToken(accessToken);
    return accessToken;
  }

  // Make API request with automatic token refresh
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Add access token to request
    const token = this.getAccessToken();
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };

    // Make request
    let response = await fetch(url, { ...options, headers });

    // If 401, try to refresh token and retry
    if (response.status === 401) {
      try {
        console.log('Token expired, refreshing...');
        const newToken = await this.refreshAccessToken();
        
        // Retry with new token
        headers.Authorization = `Bearer ${newToken}`;
        response = await fetch(url, { ...options, headers });
      } catch (error) {
        console.error('Token refresh failed:', error);
        // Redirect to login
        window.location.href = '/login';
        throw error;
      }
    }

    return response;
  }

  // Convenience methods
  async get(endpoint) {
    return this.request(endpoint);
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// Usage
const api = new ApiClient();

// User never sees token expiration!
const ads = await api.get('/ads').then(r => r.json());
const profile = await api.get('/users/profile').then(r => r.json());
```

---

## 🧪 Testing the Strategy

### **Test 1: Login and Get Tokens**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123"
  }'

# Expected response:
{
  "accessToken": "eyJhbGciOiJIUzI1...",  # 15 min expiry
  "refreshToken": "eyJhbGciOiJIUzI1...", # 30 day expiry
  "user": { ... }
}
```

### **Test 2: Use Access Token**
```bash
curl http://localhost:3000/api/v1/ads \
  -H "Authorization: Bearer <accessToken>"

# Expected: 200 OK with ads data
```

### **Test 3: Wait 16 Minutes (Token Expired)**
```bash
# After 16 minutes, access token is expired
curl http://localhost:3000/api/v1/ads \
  -H "Authorization: Bearer <expired_accessToken>"

# Expected: 401 Unauthorized
```

### **Test 4: Refresh Token**
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refreshToken>"}'

# Expected response:
{
  "accessToken": "eyJhbGciOiJIUzI1..."  # New 15 min token
}
```

### **Test 5: Use New Access Token**
```bash
curl http://localhost:3000/api/v1/ads \
  -H "Authorization: Bearer <new_accessToken>"

# Expected: 200 OK with ads data
```

### **Test 6: Logout**
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refreshToken>"}'

# Expected: 200 OK

# Try to refresh again
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<same_refreshToken>"}'

# Expected: 401 Unauthorized (token revoked)
```

---

## 📊 Token Comparison

| Feature | Access Token | Refresh Token |
|---------|-------------|---------------|
| **Lifespan** | 15 minutes | 30 days |
| **Storage (Client)** | Memory/sessionStorage | httpOnly cookie/secure storage |
| **Storage (Server)** | Not stored | Stored (hashed) in database |
| **Usage** | Every API request | Only `/auth/refresh` |
| **Revokable** | No (expires naturally) | Yes (mark as revoked in DB) |
| **Security** | Short-lived = Less risk | Hashed + Revokable = Controlled |

---

## ✅ Best Practices Summary

### **DO**
✅ Store access tokens in memory (sessionStorage)  
✅ Store refresh tokens in httpOnly cookies or secure storage  
✅ Implement automatic token refresh on 401  
✅ Clear tokens on logout  
✅ Use HTTPS in production  
✅ Validate token signatures  
✅ Check token expiration  
✅ Hash refresh tokens in database  

### **DON'T**
❌ Store refresh tokens in localStorage (XSS risk)  
❌ Make access tokens long-lived (security risk)  
❌ Forget to revoke tokens on logout  
❌ Expose JWT_SECRET  
❌ Skip token expiration checks  
❌ Store refresh tokens in plain text  

---

## 🎯 Summary

**This JWT strategy provides:**

1. **Security** - Short-lived access tokens minimize risk
2. **User Experience** - 30-day sessions with automatic refresh
3. **Control** - Revokable refresh tokens in database
4. **Performance** - Stateless access token validation
5. **Multi-Device** - Each device tracked separately
6. **Transparency** - User never sees token expiration

**Result:** Users stay logged in for 30 days without security compromises!

---

**Implementation:** ✅ Complete  
**Documentation:** ✅ Complete  
**Production Ready:** ✅ Yes  
**Last Updated:** January 12, 2026
