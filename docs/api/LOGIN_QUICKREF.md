# 🔐 Login System - Quick Reference

## 🎯 Key Changes from Original

| Aspect | Before | After |
|--------|--------|-------|
| **Access Token Expiry** | 7 days | **15 minutes** ✅ |
| **Refresh Token Storage** | Not stored | **Stored in DB** ✅ |
| **Multi-Device Support** | No | **Yes** ✅ |
| **Rate Limiting** | No | **5 attempts / 15min lockout** ✅ |
| **Device Tracking** | No | **IP + User-Agent** ✅ |
| **Token Revocation** | No | **Logout support** ✅ |
| **Last Login Tracking** | No | **Yes** ✅ |

---

## 📋 API Endpoints Cheat Sheet

```bash
# Login
POST /api/v1/auth/login
Body: { email, password }
Returns: { accessToken, refreshToken, user }

# Refresh Token
POST /api/v1/auth/refresh
Body: { refreshToken }
Returns: { accessToken }

# Logout (Current Device)
POST /api/v1/auth/logout
Body: { refreshToken }
Returns: { message }

# Logout (All Devices)
POST /api/v1/auth/logout-all
Headers: Authorization: Bearer <accessToken>
Returns: { message, devicesLoggedOut }
```

---

## 🔒 Security Settings

```typescript
// Rate Limiting
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION = 15 minutes

// Token Expiry
ACCESS_TOKEN = 15 minutes
REFRESH_TOKEN = 30 days

// Storage
Refresh tokens hashed with SHA-256
Device info and IP address tracked
```

---

## ⚠️ Error Messages

| Code | Scenario | Message |
|------|----------|---------|
| 401 | Wrong credentials | "Invalid email or password" |
| 401 | Account locked | "Account is temporarily locked... Try again in X minutes" |
| 401 | Invalid refresh token | "Invalid or expired refresh token" |
| 401 | Revoked token | "Refresh token has been revoked..." |
| 400 | Missing fields | Validation error array |

---

## 🧪 Test Commands

```powershell
# Login
curl -X POST http://localhost:3000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"SecurePass123"}'

# Refresh
curl -X POST http://localhost:3000/api/v1/auth/refresh `
  -H "Content-Type: application/json" `
  -d '{"refreshToken":"<token>"}'

# Logout
curl -X POST http://localhost:3000/api/v1/auth/logout `
  -H "Content-Type: application/json" `
  -d '{"refreshToken":"<token>"}'

# Logout All
curl -X POST http://localhost:3000/api/v1/auth/logout-all `
  -H "Authorization: Bearer <accessToken>"
```

---

## 📊 Database Schema

```sql
-- Users (new fields)
failed_login_attempts INTEGER DEFAULT 0
locked_until TIMESTAMP
last_login_at TIMESTAMP

-- Refresh Tokens (new table)
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token VARCHAR(64) UNIQUE, -- SHA-256 hash
  device_info VARCHAR(500),
  ip_address VARCHAR(45),
  expires_at TIMESTAMP,
  is_revoked BOOLEAN,
  created_at TIMESTAMP,
  revoked_at TIMESTAMP,
  last_used_at TIMESTAMP
);
```

---

## 💻 Frontend Integration

```javascript
// Login
const { accessToken, refreshToken } = await login(email, password);
sessionStorage.setItem('accessToken', accessToken);
// Store refreshToken in httpOnly cookie or secure storage

// API Call
fetch('/api/v1/ads', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

// Auto-Refresh on 401
if (response.status === 401) {
  const { accessToken } = await refresh(refreshToken);
  sessionStorage.setItem('accessToken', accessToken);
  // Retry request
}

// Logout
await logout(refreshToken);
sessionStorage.removeItem('accessToken');
```

---

## ✅ Production Checklist

- [x] Rate limiting implemented
- [x] Account lockout after 5 failed attempts
- [x] Short-lived access tokens (15min)
- [x] Refresh tokens stored in database
- [x] Device tracking enabled
- [x] Token revocation support
- [x] Multi-device login support
- [x] Generic error messages (no enumeration)
- [x] Last login timestamp tracking
- [x] Logout from all devices

---

## 📚 Full Documentation

- **Complete API Docs:** [LOGIN.md](LOGIN.md)
- **Implementation Details:** [LOGIN_SUMMARY.md](LOGIN_SUMMARY.md)
- **Database Scripts:** [refresh-tokens.sql](../../database/schema/refresh-tokens.sql)

---

**Status:** ✅ Production Ready  
**Last Updated:** January 12, 2026
