# 🔐 Login System API Documentation

## Overview
Production-grade login system with rate limiting, multi-device support, and secure token management for EL HANNORA.

---

## 🔑 Login Endpoint

### **POST** `/api/v1/auth/login`

Authenticate user and receive access + refresh tokens with device tracking.

#### **Request Headers**
```http
Content-Type: application/json
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)...
```

#### **Request Body**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

#### **Field Validation**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `email` | string | ✅ | Valid email format, normalized to lowercase |
| `password` | string | ✅ | Must not be empty |

---

## ✅ Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTcwNTA1NzgwMCwiZXhwIjoxNzA1MDU4NzAwfQ...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzA1MDU3ODAwLCJleHAiOjE3MDc2NDk4MDB9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john@example.com",
      "fullName": "John Doe",
      "username": "john",
      "role": "user",
      "coins": 150,
      "trustScore": 85,
      "isEmailVerified": true,
      "lastLoginAt": "2026-01-12T10:30:00.000Z",
      "createdAt": "2025-12-01T10:00:00.000Z"
    }
  }
}
```

**Token Information:**
- **Access Token:** Expires in **15 minutes** (use for API requests)
- **Refresh Token:** Expires in **30 days** (use to get new access tokens)
- Refresh token is stored in database with device info and IP address
- Password is never returned in response

---

## ❌ Error Responses

### **401 Unauthorized** - Invalid Credentials

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Invalid email or password",
  "timestamp": "2026-01-12T10:30:00.000Z",
  "path": "/api/v1/auth/login"
}
```

**Note:** Generic error message prevents account enumeration attacks. System doesn't reveal whether email exists or password is wrong.

---

### **401 Unauthorized** - Account Locked (Rate Limiting)

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Account is temporarily locked due to multiple failed login attempts. Please try again in 12 minutes.",
  "timestamp": "2026-01-12T10:30:00.000Z",
  "path": "/api/v1/auth/login"
}
```

**Rate Limiting Rules:**
- ✅ **Maximum 5 failed login attempts**
- ✅ **Account locked for 15 minutes** after 5th failed attempt
- ✅ Counter resets on successful login
- ✅ Lockout timer displayed in error message

---

### **400 Bad Request** - Validation Error

```json
{
  "success": false,
  "statusCode": 400,
  "message": [
    "Please provide a valid email address",
    "Password is required"
  ],
  "timestamp": "2026-01-12T10:30:00.000Z",
  "path": "/api/v1/auth/login"
}
```

---

## 🔄 Refresh Token Endpoint

### **POST** `/api/v1/auth/refresh`

Get a new access token using refresh token (without re-login).

#### **Request Body**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### **Success Response (200 OK)**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Notes:**
- Only access token is returned (refresh token stays the same)
- Refresh token `lastUsedAt` timestamp is updated
- Validates token exists in database and is not revoked

#### **Error Responses**

```json
// Invalid or expired token
{
  "success": false,
  "statusCode": 401,
  "message": "Invalid or expired refresh token"
}

// Token revoked (user logged out)
{
  "success": false,
  "statusCode": 401,
  "message": "Refresh token has been revoked or does not exist"
}

// Token expired
{
  "success": false,
  "statusCode": 401,
  "message": "Refresh token has expired"
}
```

---

## 🚪 Logout Endpoint

### **POST** `/api/v1/auth/logout`

Logout from current device (revokes refresh token).

#### **Request Body**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### **Success Response (200 OK)**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

**Notes:**
- Marks refresh token as revoked in database
- Access token remains valid until expiry (15 minutes)
- User can no longer refresh access token with this refresh token

---

## 🚪🚪 Logout All Devices

### **POST** `/api/v1/auth/logout-all`

Logout from all devices (revokes all refresh tokens).

#### **Request Headers**
```http
Authorization: Bearer <access_token>
```

#### **Success Response (200 OK)**
```json
{
  "success": true,
  "data": {
    "message": "Logged out from all devices successfully",
    "devicesLoggedOut": 3
  }
}
```

**Notes:**
- Requires authentication (JWT access token)
- Revokes all refresh tokens for the user
- Useful when account is compromised

---

## 🔒 Security Features

### **Rate Limiting**
| Setting | Value |
|---------|-------|
| Max failed attempts | 5 |
| Lockout duration | 15 minutes |
| Counter reset | On successful login |
| Lockout bypass | None (must wait) |

**How It Works:**
1. User enters wrong password → `failedLoginAttempts++`
2. After 5 failed attempts → Account locked for 15 minutes
3. Successful login → Counter resets to 0
4. During lockout → All login attempts rejected with time remaining

### **Token Security**
- **Access Token:** 15 minutes (short-lived, stateless)
- **Refresh Token:** 30 days (stored in DB, revokable)
- Refresh tokens hashed with SHA-256 before storage
- Each device gets separate refresh token
- Tokens include: userId, email, role, issued-at, expiry

### **Password Security**
- Bcrypt verification (no plain text comparison)
- Constant-time comparison prevents timing attacks
- Generic error messages prevent enumeration

### **Device Tracking**
- User-Agent stored for device identification
- IP address logged for security auditing
- Last used timestamp tracks activity
- Can view active sessions

### **No Sensitive Data Exposure**
- Password never returned in responses
- Generic error messages (don't reveal if email exists)
- Token details not exposed in errors

---

## 📱 Multi-Device Support

### **How It Works**
```
User logs in on:
├─ Desktop (Chrome) → Refresh Token A
├─ Mobile (Safari) → Refresh Token B
└─ Tablet (Firefox) → Refresh Token C

Each device can:
- Refresh access token independently
- Logout without affecting other devices
- View all active sessions
```

### **Session Management**

```mermaid
User Login
    ↓
Create Refresh Token
    ↓
Store in Database:
- Device Info: "Mozilla/5.0..."
- IP Address: "192.168.1.1"
- Expires At: +30 days
- Is Revoked: false
    ↓
Return to Client:
- Access Token (15min)
- Refresh Token (30d)
```

---

## 🧪 Testing Examples

### **Valid Login**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

### **Refresh Access Token**
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### **Logout from Current Device**
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### **Logout from All Devices**
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout-all \
  -H "Authorization: Bearer <access_token>"
```

---

## 🎯 Frontend Integration Guide

### **1. Login Flow**
```javascript
// Store tokens securely
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { accessToken, refreshToken, user } = await response.json();

// Store access token in memory (never localStorage for security)
sessionStorage.setItem('accessToken', accessToken);

// Store refresh token in httpOnly cookie (backend sets this) or secure storage
// NEVER store refresh token in localStorage
```

### **2. API Requests with Access Token**
```javascript
const response = await fetch('/api/v1/ads', {
  headers: {
    'Authorization': `Bearer ${sessionStorage.getItem('accessToken')}`
  }
});
```

### **3. Automatic Token Refresh**
```javascript
async function apiRequest(url, options = {}) {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${sessionStorage.getItem('accessToken')}`
    }
  });

  // If access token expired (401)
  if (response.status === 401) {
    // Refresh token
    const refreshToken = getRefreshToken(); // From secure storage
    const refreshResponse = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (refreshResponse.ok) {
      const { accessToken } = await refreshResponse.json();
      sessionStorage.setItem('accessToken', accessToken);
      
      // Retry original request
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`
        }
      });
    } else {
      // Refresh failed, redirect to login
      window.location.href = '/login';
    }
  }

  return response;
}
```

### **4. Stay Logged In (Remember Me)**
```javascript
// Option 1: Store refresh token in httpOnly cookie (backend)
// Option 2: Store refresh token in secure storage on mobile
// DO NOT store in localStorage (XSS vulnerability)

// On app load, check if refresh token exists
const refreshToken = getRefreshToken();
if (refreshToken) {
  // Get new access token
  const { accessToken } = await refreshAccessToken(refreshToken);
  sessionStorage.setItem('accessToken', accessToken);
}
```

### **5. Handle Rate Limiting**
```javascript
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});

if (response.status === 401) {
  const error = await response.json();
  
  if (error.message.includes('locked')) {
    // Account locked - show timer
    const match = error.message.match(/(\d+) minute/);
    const minutes = match ? parseInt(match[1]) : 15;
    showLockoutMessage(minutes);
  } else {
    // Wrong credentials
    showError('Invalid email or password');
  }
}
```

---

## 📊 Database Schema

### **refresh_tokens Table**
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(64) UNIQUE, -- SHA-256 hash
  device_info VARCHAR(500),
  ip_address VARCHAR(45),
  expires_at TIMESTAMP,
  is_revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,
  last_used_at TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_active ON refresh_tokens(user_id, is_revoked, expires_at);
```

### **users Table (Security Fields)**
```sql
-- Added for rate limiting
failed_login_attempts INTEGER DEFAULT 0,
locked_until TIMESTAMP,
last_login_at TIMESTAMP
```

---

## 🛡️ Security Best Practices

### **What We Do**
✅ Rate limiting (5 attempts, 15min lockout)  
✅ Generic error messages (no account enumeration)  
✅ Short-lived access tokens (15 minutes)  
✅ Refresh token storage with revocation support  
✅ Device tracking for security auditing  
✅ SHA-256 hashed refresh tokens in database  
✅ Bcrypt password verification  
✅ Last login tracking  
✅ Multi-device logout support  

### **What You Should Do (Frontend)**
✅ Store access token in memory/sessionStorage  
✅ Store refresh token in httpOnly cookie (if backend sets) or secure mobile storage  
❌ NEVER store refresh token in localStorage (XSS risk)  
✅ Implement automatic token refresh on 401  
✅ Clear tokens on logout  
✅ Show lockout timer to users  
✅ Implement retry with exponential backoff  
✅ Use HTTPS in production  

---

## 📈 Monitoring & Analytics

Track these metrics for security:
- Failed login attempts per user/IP
- Account lockouts per day
- Average session duration
- Active devices per user
- Refresh token usage patterns
- Suspicious login patterns (unusual IPs, times)

---

**Last Updated:** January 12, 2026  
**API Version:** v1  
**Maintained by:** EL HANNORA Development Team
