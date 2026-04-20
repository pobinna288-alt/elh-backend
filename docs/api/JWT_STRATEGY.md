# 🔐 JWT Authentication Strategy - EL HANNORA

## 📋 Complete Token Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER LOGIN                                  │
│                     (POST /auth/login)                              │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         │ email + password
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION SERVICE                           │
│  1. Validate credentials                                            │
│  2. Generate Access Token (15min expiry)                            │
│  3. Generate Refresh Token (30d expiry)                             │
│  4. Hash refresh token (SHA-256)                                    │
│  5. Store hashed token in database                                  │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         │ Returns both tokens
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT STORAGE                              │
│                                                                     │
│  ┌───────────────────────────────────────────────────────┐        │
│  │ Access Token (Memory/SessionStorage)                  │        │
│  │ • Short-lived (15 minutes)                            │        │
│  │ • Used for all API requests                           │        │
│  │ • Not persisted long-term                             │        │
│  └───────────────────────────────────────────────────────┘        │
│                                                                     │
│  ┌───────────────────────────────────────────────────────┐        │
│  │ Refresh Token (HttpOnly Cookie/Secure Storage)        │        │
│  │ • Long-lived (30 days)                                │        │
│  │ • Used only to get new access tokens                  │        │
│  │ • Never sent with regular API requests                │        │
│  └───────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘

                              ▼
                    NORMAL API REQUEST FLOW
                              ▼

┌─────────────────────────────────────────────────────────────────────┐
│                    CLIENT MAKES API REQUEST                         │
│                   GET /api/v1/ads                                   │
│                   Authorization: Bearer <accessToken>               │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     JWT AUTH GUARD                                  │
│  1. Extract token from Authorization header                         │
│  2. Verify token signature                                          │
│  3. Check expiration                                                │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                    ┌────┴─────┐
                    │          │
              Valid │          │ Expired/Invalid
                    ▼          ▼
         ┌──────────────┐  ┌──────────────┐
         │   Allow      │  │  Return 401  │
         │   Request    │  │ Unauthorized │
         └──────────────┘  └──────────────┘
                                   │
                                   │ Client receives 401
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  AUTOMATIC TOKEN REFRESH                            │
│                  (POST /auth/refresh)                               │
│                  Body: { refreshToken }                             │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   REFRESH TOKEN SERVICE                             │
│  1. Hash incoming refresh token                                     │
│  2. Look up hashed token in database                                │
│  3. Verify token not revoked                                        │
│  4. Verify token not expired                                        │
│  5. Generate new access token (15min)                               │
│  6. Update lastUsedAt timestamp                                     │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                    ┌────┴─────┐
                    │          │
              Valid │          │ Invalid/Expired
                    ▼          ▼
         ┌──────────────┐  ┌──────────────┐
         │  Return New  │  │ Force Logout │
         │ Access Token │  │ (Redirect to │
         │              │  │    Login)    │
         └──────┬───────┘  └──────────────┘
                │
                │ New access token received
                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   CLIENT UPDATES TOKEN                              │
│  1. Store new access token in memory                                │
│  2. Retry original API request                                      │
│  3. Continue normal operation                                       │
└─────────────────────────────────────────────────────────────────────┘

                    USER STAYS LOGGED IN ✓
                 (No interruption to workflow)
```

---

## 🔑 Token Structure

### **Access Token (JWT)**
```javascript
Header:
{
  "alg": "HS256",
  "typ": "JWT"
}

Payload:
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",  // User ID
  "email": "user@example.com",
  "role": "user",                                  // User role
  "iat": 1705057800,                               // Issued at
  "exp": 1705058700                                // Expires at (+15 min)
}

Signature:
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  JWT_SECRET
)
```

**Properties:**
- **Lifespan:** 15 minutes
- **Storage:** Client memory/sessionStorage
- **Usage:** Every API request (Authorization: Bearer <token>)
- **Revocation:** Not revokable (short-lived by design)

---

### **Refresh Token (JWT)**
```javascript
Header:
{
  "alg": "HS256",
  "typ": "JWT"
}

Payload:
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "user",
  "type": "refresh",                               // Token type
  "iat": 1705057800,
  "exp": 1707649800                                // Expires at (+30 days)
}

Signature:
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  JWT_SECRET
)
```

**Properties:**
- **Lifespan:** 30 days
- **Storage:** Database (SHA-256 hashed) + Client secure storage
- **Usage:** Only for `/auth/refresh` endpoint
- **Revocation:** Revokable (marked as revoked in database)

---

## 🔄 Complete Flow Scenarios

### **Scenario 1: Fresh Login**

```
Time: 10:00 AM
Action: User logs in

Step 1: Login Request
POST /auth/login
{ "email": "user@example.com", "password": "SecurePass123" }

Step 2: Server Response
{
  "accessToken": "eyJ...",   // Expires: 10:15 AM
  "refreshToken": "eyJ...",  // Expires: Feb 11, 2026
  "user": { ... }
}

Step 3: Client Storage
sessionStorage.setItem('accessToken', accessToken)
secureStorage.set('refreshToken', refreshToken)

Step 4: API Requests (10:00 - 10:15 AM)
All requests succeed with access token ✓
```

---

### **Scenario 2: Token Expiry During Usage**

```
Time: 10:16 AM (Access token expired at 10:15 AM)
Action: User clicks "View Ads"

Step 1: Client makes request
GET /api/v1/ads
Authorization: Bearer <expired_token>

Step 2: Server responds
401 Unauthorized
{ "message": "Unauthorized" }

Step 3: Client intercepts 401
if (response.status === 401) {
  // Attempt automatic refresh
  const newAccessToken = await refreshAccessToken()
  
  if (newAccessToken) {
    // Retry original request with new token
    return retryRequest(originalRequest, newAccessToken)
  } else {
    // Refresh failed, redirect to login
    redirectToLogin()
  }
}

Step 4: Refresh Token Request
POST /auth/refresh
{ "refreshToken": "eyJ..." }

Step 5: Server validates refresh token
- Hash token with SHA-256
- Look up in database
- Check not revoked
- Check not expired
- Generate new access token

Step 6: Server response
{ "accessToken": "eyJ..." }  // New token, expires 10:31 AM

Step 7: Client retries original request
GET /api/v1/ads
Authorization: Bearer <new_token>

Step 8: Success ✓
User sees ads without any interruption
```

---

### **Scenario 3: Refresh Token Expired**

```
Time: February 12, 2026 (30 days after login)
Action: User opens app

Step 1: Client attempts token refresh
POST /auth/refresh
{ "refreshToken": "eyJ..." }

Step 2: Server validates
- Token expired ✗

Step 3: Server response
401 Unauthorized
{ "message": "Refresh token has expired" }

Step 4: Client receives 401
- Clear local tokens
- Redirect to login page
- Show message: "Your session has expired. Please log in again."

Step 5: User logs in again
New access + refresh tokens issued ✓
```

---

### **Scenario 4: User Logs Out**

```
Time: 10:30 AM
Action: User clicks "Logout"

Step 1: Client sends logout request
POST /auth/logout
{ "refreshToken": "eyJ..." }

Step 2: Server revokes token
- Find token in database
- Set isRevoked = true
- Set revokedAt = NOW()

Step 3: Server response
{ "message": "Logged out successfully" }

Step 4: Client clears storage
sessionStorage.removeItem('accessToken')
secureStorage.remove('refreshToken')

Step 5: Redirect to login page

Note: Access token remains valid until expiry (max 15 min)
```

---

### **Scenario 5: Multiple Devices**

```
User logs in on 3 devices:
├─ Desktop (10:00 AM) → Refresh Token A
├─ Mobile (11:00 AM)  → Refresh Token B
└─ Tablet (12:00 PM)  → Refresh Token C

Each device operates independently:

Desktop (10:15 AM):
- Access token expires
- Refreshes using Token A
- Gets new access token
- Continues working ✓

Mobile (11:15 AM):
- Access token expires
- Refreshes using Token B
- Gets new access token
- Continues working ✓

User clicks "Logout All Devices":
- Tokens A, B, C all revoked
- All devices forced to re-login
```

---

## 🛡️ Security Considerations

### **Why 15-Minute Access Tokens?**
✅ **Minimize damage if stolen**
- If attacker steals access token, they only have 15 minutes
- No need for complex revocation mechanism
- Short window of vulnerability

✅ **Stateless authentication**
- No database lookup for every request
- Fast API performance
- Scalable architecture

### **Why 30-Day Refresh Tokens?**
✅ **Good user experience**
- Users stay logged in for a month
- No annoying re-logins every day
- Mobile app feels native

✅ **Revokable for security**
- Can force logout if account compromised
- Stored in database for control
- Can logout all devices

### **Why Hash Refresh Tokens?**
✅ **Database breach protection**
- If database is compromised, tokens are hashed
- Attacker cannot use stolen tokens
- One-way hash (SHA-256) cannot be reversed

### **Why Store in Database?**
✅ **Full control**
- Can revoke tokens (logout)
- Can track device usage
- Can logout all devices
- Can set expiry policies

---

## 🔧 Implementation Details

### **Token Generation**
```typescript
// src/modules/auth/auth.service.ts

private async generateTokens(user: User, ipAddress?: string, userAgent?: string) {
  const payload = { 
    sub: user.id, 
    email: user.email, 
    role: user.role 
  };

  // Access Token: 15 minutes
  const accessToken = this.jwtService.sign(payload);

  // Refresh Token: 30 days
  const refreshTokenPayload = { ...payload, type: 'refresh' };
  const refreshToken = this.jwtService.sign(refreshTokenPayload, { 
    expiresIn: '30d' 
  });

  // Hash refresh token for storage
  const hashedRefreshToken = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  // Store in database
  await this.refreshTokenRepository.save({
    userId: user.id,
    token: hashedRefreshToken,
    deviceInfo: userAgent,
    ipAddress: ipAddress,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isRevoked: false,
  });

  return { accessToken, refreshToken };
}
```

### **Token Refresh**
```typescript
// src/modules/auth/auth.service.ts

async refreshAccessToken(refreshTokenDto: RefreshTokenDto) {
  const { refreshToken } = refreshTokenDto;

  // 1. Verify JWT signature and expiry
  let payload: any;
  try {
    payload = this.jwtService.verify(refreshToken);
  } catch (error) {
    throw new UnauthorizedException('Invalid or expired refresh token');
  }

  // 2. Hash token to lookup in database
  const hashedToken = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  // 3. Find token in database
  const storedToken = await this.refreshTokenRepository.findOne({
    where: { token: hashedToken, isRevoked: false },
    relations: ['user'],
  });

  if (!storedToken) {
    throw new UnauthorizedException('Refresh token has been revoked');
  }

  // 4. Check database expiry
  if (new Date() > storedToken.expiresAt) {
    throw new UnauthorizedException('Refresh token has expired');
  }

  // 5. Update last used timestamp
  storedToken.lastUsedAt = new Date();
  await this.refreshTokenRepository.save(storedToken);

  // 6. Generate new access token
  const user = storedToken.user;
  const newPayload = { 
    sub: user.id, 
    email: user.email, 
    role: user.role 
  };
  const accessToken = this.jwtService.sign(newPayload);

  return { accessToken };
}
```

### **JWT Auth Guard**
```typescript
// src/modules/auth/guards/jwt-auth.guard.ts

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Extract token from Authorization header
    // Verify signature with JWT_SECRET
    // Check expiration
    // If valid: allow request
    // If invalid: return 401 Unauthorized
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid token');
    }
    return user;
  }
}
```

### **JWT Strategy**
```typescript
// src/modules/auth/strategies/jwt.strategy.ts

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,  // Reject expired tokens
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Return user data to be attached to request
    return { 
      sub: payload.sub, 
      email: payload.email, 
      role: payload.role 
    };
  }
}
```

---

## 💻 Frontend Implementation

### **Login and Store Tokens**
```javascript
// Login
async function login(email, password) {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const { accessToken, refreshToken, user } = await response.json();

  // Store access token in memory (short-lived)
  sessionStorage.setItem('accessToken', accessToken);

  // Store refresh token securely
  // Option 1: httpOnly cookie (backend sets this)
  // Option 2: Secure storage on mobile
  // DO NOT use localStorage (XSS vulnerability)
  secureStorage.set('refreshToken', refreshToken);

  return user;
}
```

### **API Request with Auto-Refresh**
```javascript
// Automatic token refresh interceptor
async function apiRequest(url, options = {}) {
  const makeRequest = async (token) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });
  };

  // Try with current access token
  let accessToken = sessionStorage.getItem('accessToken');
  let response = await makeRequest(accessToken);

  // If 401, attempt to refresh token
  if (response.status === 401) {
    console.log('Access token expired, refreshing...');
    
    try {
      // Get new access token
      const refreshToken = secureStorage.get('refreshToken');
      const refreshResponse = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (refreshResponse.ok) {
        const { accessToken: newAccessToken } = await refreshResponse.json();
        sessionStorage.setItem('accessToken', newAccessToken);
        
        // Retry original request with new token
        response = await makeRequest(newAccessToken);
      } else {
        // Refresh failed, redirect to login
        console.log('Refresh token expired, redirecting to login');
        window.location.href = '/login';
        throw new Error('Session expired');
      }
    } catch (error) {
      // Refresh failed, redirect to login
      window.location.href = '/login';
      throw error;
    }
  }

  return response;
}

// Usage
const ads = await apiRequest('/api/v1/ads').then(r => r.json());
```

### **Logout**
```javascript
async function logout() {
  const refreshToken = secureStorage.get('refreshToken');

  // Revoke refresh token on server
  await fetch('/api/v1/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  // Clear local storage
  sessionStorage.removeItem('accessToken');
  secureStorage.remove('refreshToken');

  // Redirect to login
  window.location.href = '/login';
}
```

---

## 📊 Token Lifecycle

```
Login (10:00 AM)
├─ Access Token: Valid until 10:15 AM
└─ Refresh Token: Valid until Feb 11, 2026

10:00 - 10:14 AM: Normal API usage ✓
10:15 AM: Access token expires
10:15 AM: Next API request fails with 401
10:15 AM: Client auto-refreshes token
10:15 AM: New access token issued (valid until 10:30 AM)
10:15 - 10:29 AM: Normal API usage continues ✓
10:30 AM: Token expires again
10:30 AM: Auto-refresh happens again

Repeat cycle every 15 minutes...

Feb 11, 2026: Refresh token expires
Next refresh attempt fails
User redirected to login
```

---

## ✅ Benefits of This Strategy

1. **No Forced Logouts**
   - User stays logged in for 30 days
   - Automatic token refresh is transparent
   - Seamless user experience

2. **Strong Security**
   - Short-lived access tokens (15 min)
   - Revokable refresh tokens
   - Hashed storage in database

3. **Multi-Device Support**
   - Each device gets own refresh token
   - Can logout specific devices
   - Can logout all devices

4. **Good Performance**
   - Stateless access tokens (no DB lookup)
   - Fast API request validation
   - Scalable architecture

5. **Account Protection**
   - Can revoke tokens if account compromised
   - Device tracking for security audit
   - IP address logging

---

## 🎯 Best Practices

✅ **Access tokens in memory** (sessionStorage)  
✅ **Refresh tokens in secure storage** (httpOnly cookies)  
❌ **Never store refresh tokens in localStorage** (XSS risk)  
✅ **Automatic token refresh** on 401  
✅ **Clear tokens on logout**  
✅ **Use HTTPS** in production  
✅ **Monitor suspicious patterns** (unusual IPs, devices)  

---

**Implementation Status:** ✅ Complete  
**Last Updated:** January 12, 2026  
**Production Ready:** Yes
