# 🚪 Logout System - Technical Documentation

## 🎯 Overview

Secure logout system for EL HANNORA with support for:
- ✅ **Single device logout** - Revoke current session only
- ✅ **Multi-device logout** - Revoke all sessions
- ✅ **Session management** - View and manage active devices
- ✅ **Selective logout** - Remove suspicious sessions
- ✅ **Token prevention** - Old tokens cannot be reused

---

## 🔐 How Logout Works

### **Token Revocation Strategy**

```
User Login
    ↓
Refresh Token Created
    ↓
Stored in Database:
├─ token (SHA-256 hash)
├─ userId
├─ deviceInfo
├─ ipAddress
├─ isRevoked: false  ← Active
├─ expiresAt
└─ createdAt

User Clicks Logout
    ↓
Token Updated:
├─ isRevoked: true   ← Revoked
└─ revokedAt: NOW()

Token Refresh Attempt
    ↓
Database Check:
├─ Find token by hash
├─ Check isRevoked
└─ If true → Reject (401)

Result: Token cannot be reused ✓
```

---

## 📋 Logout Scenarios

### **Scenario 1: Logout from Current Device**

```
User Action: Click "Logout" on Desktop

Backend Process:
1. Receive refresh token from client
2. Hash token with SHA-256
3. Find token in database
4. Check if already revoked (idempotent)
5. Set isRevoked = true
6. Set revokedAt = NOW()
7. Return success

Database State:
Desktop Token: isRevoked = true  ✓
Mobile Token: isRevoked = false  (Still active)
Tablet Token: isRevoked = false  (Still active)

Result:
- Desktop logged out ✓
- Mobile still logged in ✓
- Tablet still logged in ✓
- Other sessions unaffected ✓
```

### **Scenario 2: Logout from All Devices**

```
User Action: Click "Logout All Devices" (security concern)

Backend Process:
1. Extract userId from JWT access token
2. Find all tokens where userId = user AND isRevoked = false
3. Count active tokens
4. Update all: isRevoked = true, revokedAt = NOW()
5. Return count of revoked tokens

Database State:
Desktop Token: isRevoked = true  ✓
Mobile Token: isRevoked = true   ✓
Tablet Token: isRevoked = true   ✓

Result:
- All devices logged out ✓
- User must re-login on all devices ✓
- Forces fresh authentication ✓
```

### **Scenario 3: Logout Specific Device**

```
User Action: View sessions → Click "Remove" on suspicious device

Backend Process:
1. Extract userId from JWT access token
2. Receive tokenId (session ID) from request
3. Find token where id = tokenId AND userId = user
4. Verify token belongs to user (security check)
5. Set isRevoked = true
6. Return success

Database State:
Desktop Token: isRevoked = false  (Current device - still active)
Mobile Token: isRevoked = false   (Still active)
Tablet Token: isRevoked = true    (Suspicious device - removed) ✓

Result:
- Only specified device logged out ✓
- Current session unaffected ✓
- Other sessions unaffected ✓
```

---

## 🛡️ Security Features

### **1. Token Revocation is Immediate**
```typescript
// Once token is revoked, it cannot be used
if (storedToken.isRevoked) {
  throw new UnauthorizedException('Refresh token has been revoked');
}

// Next refresh attempt → Rejected ✓
```

### **2. Idempotent Logout**
```typescript
// Calling logout multiple times is safe
if (storedToken.isRevoked) {
  return { message: 'Token already revoked', success: true };
}

// No error thrown → Can call multiple times ✓
```

### **3. User Ownership Verification**
```typescript
// Cannot logout other users' sessions
const token = await db.findOne({
  where: { id: tokenId, userId: currentUserId }
});

if (!token) {
  throw new NotFoundException('Session does not belong to this user');
}

// Security: Users can only manage their own sessions ✓
```

### **4. Old Tokens Cannot Be Reused**
```typescript
// Token refresh checks revocation status
const storedToken = await db.findOne({
  where: { token: hashedToken, isRevoked: false }
});

if (!storedToken) {
  throw new UnauthorizedException('Token revoked or does not exist');
}

// Revoked tokens permanently blocked ✓
```

### **5. Access Tokens Remain Valid (Short Window)**
```typescript
// After logout, access token valid until expiry
// Maximum window: 15 minutes
// This is acceptable because:
// 1. Short lifespan (15 min)
// 2. Cannot get new access tokens (refresh revoked)
// 3. User will be forced to re-login after 15 min

// Compromise: Security vs Complexity ✓
```

---

## 📊 API Endpoints

### **1. Logout from Current Device**
```http
POST /api/v1/auth/logout
Content-Type: application/json

Body:
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response (200 OK):
{
  "success": true,
  "data": {
    "message": "Logged out successfully from this device",
    "success": true
  }
}

What Happens:
- Refresh token revoked in database
- Access token still valid for max 15 minutes
- Cannot refresh access token anymore
- User must re-login after access token expires
```

### **2. Logout from All Devices**
```http
POST /api/v1/auth/logout-all
Authorization: Bearer <accessToken>

Response (200 OK):
{
  "success": true,
  "data": {
    "message": "Logged out from 3 device(s) successfully",
    "devicesLoggedOut": 3
  }
}

What Happens:
- All refresh tokens for user revoked
- All devices logged out
- User must re-login on all devices
- Good for: password changed, account compromised
```

### **3. Get Active Sessions**
```http
GET /api/v1/auth/sessions
Authorization: Bearer <accessToken>

Response (200 OK):
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "deviceInfo": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "ipAddress": "192.168.1.100",
      "createdAt": "2026-01-12T10:00:00Z",
      "lastUsedAt": "2026-01-12T15:30:00Z",
      "expiresAt": "2026-02-11T10:00:00Z"
    },
    {
      "id": "uuid-2",
      "deviceInfo": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)",
      "ipAddress": "192.168.1.101",
      "createdAt": "2026-01-11T14:00:00Z",
      "lastUsedAt": "2026-01-12T12:00:00Z",
      "expiresAt": "2026-02-10T14:00:00Z"
    }
  ]
}

What Happens:
- Shows all active sessions for user
- User can see which devices are logged in
- Can identify suspicious sessions
```

### **4. Logout Specific Device**
```http
DELETE /api/v1/auth/sessions/:tokenId
Authorization: Bearer <accessToken>

Example:
DELETE /api/v1/auth/sessions/uuid-2

Response (200 OK):
{
  "success": true,
  "data": {
    "message": "Device logged out successfully",
    "success": true
  }
}

What Happens:
- Only specified session revoked
- Other sessions remain active
- Good for: removing suspicious devices
```

---

## 🔄 Complete Logout Flow

### **Frontend Implementation**

```javascript
// 1. Logout from Current Device
async function logout() {
  const refreshToken = getRefreshToken();
  
  try {
    // Revoke refresh token on server
    await fetch('/api/v1/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
  } catch (error) {
    console.error('Logout failed:', error);
    // Continue with local cleanup anyway
  }
  
  // Clear local storage
  sessionStorage.removeItem('accessToken');
  secureStorage.remove('refreshToken');
  
  // Redirect to login
  window.location.href = '/login';
}

// 2. Logout from All Devices
async function logoutAllDevices() {
  const accessToken = getAccessToken();
  
  const response = await fetch('/api/v1/auth/logout-all', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  const data = await response.json();
  console.log(`Logged out from ${data.devicesLoggedOut} devices`);
  
  // Clear local storage
  sessionStorage.removeItem('accessToken');
  secureStorage.remove('refreshToken');
  
  // Redirect to login
  window.location.href = '/login';
}

// 3. View Active Sessions
async function getActiveSessions() {
  const accessToken = getAccessToken();
  
  const response = await fetch('/api/v1/auth/sessions', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  const sessions = await response.json();
  return sessions;
}

// 4. Remove Specific Device
async function removeDevice(sessionId) {
  const accessToken = getAccessToken();
  
  await fetch(`/api/v1/auth/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  console.log('Device removed successfully');
}
```

---

## 🧪 Testing the Logout System

### **Test 1: Single Device Logout**
```powershell
# Step 1: Login
$login = curl -X POST http://localhost:3000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"SecurePass123"}'

$refreshToken = $login.refreshToken

# Step 2: Logout
curl -X POST http://localhost:3000/api/v1/auth/logout `
  -H "Content-Type: application/json" `
  -d "{\"refreshToken\":\"$refreshToken\"}"

# Expected: "Logged out successfully from this device"

# Step 3: Try to refresh (should fail)
curl -X POST http://localhost:3000/api/v1/auth/refresh `
  -H "Content-Type: application/json" `
  -d "{\"refreshToken\":\"$refreshToken\"}"

# Expected: 401 Unauthorized "Token has been revoked"
```

### **Test 2: Logout All Devices**
```powershell
# Step 1: Login on multiple devices
# Device 1
$device1 = curl -X POST http://localhost:3000/api/v1/auth/login `
  -d '{"email":"test@example.com","password":"SecurePass123"}'

# Device 2
$device2 = curl -X POST http://localhost:3000/api/v1/auth/login `
  -d '{"email":"test@example.com","password":"SecurePass123"}'

# Step 2: Logout all devices
curl -X POST http://localhost:3000/api/v1/auth/logout-all `
  -H "Authorization: Bearer $($device1.accessToken)"

# Expected: { "devicesLoggedOut": 2 }

# Step 3: Try to refresh from both devices (both should fail)
curl -X POST http://localhost:3000/api/v1/auth/refresh `
  -d "{\"refreshToken\":\"$($device1.refreshToken)\"}"
# Expected: 401

curl -X POST http://localhost:3000/api/v1/auth/refresh `
  -d "{\"refreshToken\":\"$($device2.refreshToken)\"}"
# Expected: 401
```

### **Test 3: Logout Specific Device**
```powershell
# Step 1: Login and get sessions
$login = curl -X POST http://localhost:3000/api/v1/auth/login `
  -d '{"email":"test@example.com","password":"SecurePass123"}'

$sessions = curl http://localhost:3000/api/v1/auth/sessions `
  -H "Authorization: Bearer $($login.accessToken)"

# Step 2: Remove first session
$sessionId = $sessions[0].id
curl -X DELETE "http://localhost:3000/api/v1/auth/sessions/$sessionId" `
  -H "Authorization: Bearer $($login.accessToken)"

# Expected: "Device logged out successfully"

# Step 3: Verify session removed
$sessions = curl http://localhost:3000/api/v1/auth/sessions `
  -H "Authorization: Bearer $($login.accessToken)"

# Expected: One less session
```

---

## 🛡️ Preventing Token Reuse

### **Why Revoked Tokens Cannot Be Reused**

```typescript
// Token refresh validation
async refreshAccessToken(refreshToken: string) {
  // 1. Verify JWT signature
  const payload = jwt.verify(refreshToken, JWT_SECRET);
  // ✓ Signature valid
  
  // 2. Hash and lookup in database
  const hashedToken = sha256(refreshToken);
  const storedToken = await db.findOne({
    where: { token: hashedToken, isRevoked: false }
    //                             ^^^^^^^^^^^^^^^^
    //                   Only find non-revoked tokens
  });
  
  // 3. Check if token found
  if (!storedToken) {
    throw new UnauthorizedException('Token revoked');
    // Revoked tokens not found → Rejected ✓
  }
  
  // 4. Additional expiry check
  if (new Date() > storedToken.expiresAt) {
    throw new UnauthorizedException('Token expired');
  }
  
  // 5. Generate new access token
  return { accessToken: newToken };
}

// Result: Revoked tokens CANNOT get new access tokens ✓
```

---

## 📊 Database State Management

### **Token Lifecycle**

```sql
-- Fresh Token (Just created)
INSERT INTO refresh_tokens (
  user_id, token, device_info, ip_address,
  is_revoked, expires_at
) VALUES (
  'user-uuid', 'hashed-token', 'Chrome', '192.168.1.1',
  false, NOW() + INTERVAL '30 days'
);

-- Active Token (Being used)
UPDATE refresh_tokens 
SET last_used_at = NOW()
WHERE token = 'hashed-token';

-- Revoked Token (Logged out)
UPDATE refresh_tokens 
SET is_revoked = true, revoked_at = NOW()
WHERE token = 'hashed-token';

-- Expired Token (Cleanup job)
DELETE FROM refresh_tokens 
WHERE expires_at < NOW();
```

### **Cleanup Strategy**

```typescript
// Scheduled job (runs daily)
@Cron('0 0 * * *') // Every day at midnight
async cleanupExpiredTokens() {
  const result = await this.refreshTokenRepository.delete({
    expiresAt: LessThan(new Date())
  });
  
  console.log(`Cleaned up ${result.affected} expired tokens`);
}

// Benefits:
// - Keeps database clean
// - Removes old expired tokens
// - Improves query performance
```

---

## ✅ Security Guarantees

| Feature | Implementation | Benefit |
|---------|---------------|---------|
| **Token Revocation** | isRevoked flag in database | Immediate invalidation |
| **Hash Storage** | SHA-256 one-way hash | Database breach protection |
| **User Ownership** | Verify userId matches token | Users can only manage own sessions |
| **Idempotent Logout** | Check if already revoked | Safe to call multiple times |
| **Selective Logout** | Revoke by token ID | Don't affect other sessions |
| **Complete Logout** | Revoke all user tokens | Force re-login everywhere |
| **Session Visibility** | List active devices | User awareness |
| **Expiry Cleanup** | Delete expired tokens | Database hygiene |

---

## 🎯 Best Practices

### **When to Use Each Logout Method**

1. **logout()** - Normal logout
   - User clicks "Logout"
   - User switches accounts
   - User closes app

2. **logoutAllDevices()** - Security events
   - Password changed
   - Account compromised
   - Suspicious activity detected
   - User requests to "logout everywhere"

3. **logoutDevice()** - Session management
   - Remove suspicious devices
   - Logout old/forgotten sessions
   - Clean up inactive devices

---

## 📝 Implementation Checklist

- [x] Single device logout implemented
- [x] Multi-device logout implemented
- [x] Session listing implemented
- [x] Selective device logout implemented
- [x] Token revocation checks in refresh logic
- [x] Idempotent logout operations
- [x] User ownership verification
- [x] Proper error handling
- [x] Swagger documentation
- [x] Database cleanup job

---

**Status:** ✅ Production Ready  
**Security Level:** Enterprise-Grade  
**Last Updated:** January 12, 2026
