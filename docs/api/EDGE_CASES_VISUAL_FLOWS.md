# 🎯 Authentication Edge Cases - Visual Flows

## 1. Poor Internet Connection Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    POOR CONNECTION                          │
└─────────────────────────────────────────────────────────────┘

User: Click "Login" on slow 3G
  │
  ├─> Frontend: Show loading spinner
  │     │
  │     └─> Check if request already in progress
  │           │
  │           ├─ YES → Ignore duplicate click ✓
  │           └─ NO  → Continue
  │
  ├─> Network: Send login request
  │     │
  │     └─> Set 30-second timeout
  │           │
  │           ├─ Response in 25s → ✓ Success
  │           │   └─> Save tokens, redirect to dashboard
  │           │
  │           └─ No response in 30s → ✗ Timeout
  │               └─> Show: "Connection timeout. Check internet."
  │
  └─> User can retry safely (idempotent operation)

Backend Response:
├─ Request 1 at 0:00  → Tokens: {access: A1, refresh: R1}
├─ Request 2 at 0:10  → Tokens: {access: A2, refresh: R2}
└─ Both valid ✓ No conflicts
```

---

## 2. Token Expiry During API Call Flow

```
┌─────────────────────────────────────────────────────────────┐
│                TOKEN EXPIRY MID-REQUEST                     │
└─────────────────────────────────────────────────────────────┘

Timeline:
10:00:00 → User logs in
10:14:58 → User starts uploading photo (3-second operation)
10:15:00 → Access token expires
10:15:01 → Upload completes, server receives request

Server Validation:
  │
  ├─> Extract JWT from Authorization header
  │     │
  │     └─> Verify signature ✓
  │
  ├─> Check expiry
  │     │
  │     ├─ Token exp: 10:15:00
  │     ├─ Current time: 10:15:01
  │     └─ Difference: 1 second
  │
  ├─> Apply grace period (30 seconds)
  │     │
  │     └─ 1 second < 30 seconds → ✓ ALLOW
  │
  └─> Process upload successfully

Result: User doesn't lose data ✓

Alternative: Auto-Refresh Before Expiry
  │
  ├─> Token expires at: 10:15:00
  ├─> Schedule refresh at: 10:13:00 (2 min before)
  │     │
  │     └─> Proactively refresh token
  │           │
  │           └─> New token expires at: 10:28:00
  │
  └─> Upload at 10:14:58 uses new token ✓
```

---

## 3. Multiple Device Login Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 MULTI-DEVICE SESSIONS                       │
└─────────────────────────────────────────────────────────────┘

Monday 8:00 AM → Login from Desktop
  │
  └─> Database:
      ├─ Token 1: {id: uuid-1, device: "Chrome/Windows", ip: "192.168.1.100"}
      └─ Status: Active ✓

Monday 12:00 PM → Login from Mobile
  │
  └─> Database:
      ├─ Token 1: Active (Desktop)
      └─ Token 2: {id: uuid-2, device: "Safari/iOS", ip: "192.168.1.101"}
      └─ Status: Active ✓

Monday 5:00 PM → Login from Tablet
  │
  └─> Database:
      ├─ Token 1: Active (Desktop)
      ├─ Token 2: Active (Mobile)
      └─ Token 3: {id: uuid-3, device: "Chrome/Android", ip: "192.168.1.102"}
      └─ Status: Active ✓

Tuesday 9:00 AM → Logout from Mobile
  │
  └─> Database:
      ├─ Token 1: Active (Desktop) ✓
      ├─ Token 2: REVOKED (Mobile) ✗
      └─ Token 3: Active (Tablet) ✓

User Activities:
├─ Desktop: Can still browse ads ✓
├─ Mobile: Must re-login ✗
└─ Tablet: Can still browse ads ✓

Password Reset → Logout ALL Devices
  │
  └─> Database:
      ├─ Token 1: REVOKED (Desktop) ✗
      ├─ Token 2: REVOKED (Mobile) ✗
      └─ Token 3: REVOKED (Tablet) ✗
      └─> All devices must re-login for security
```

---

## 4. Clock Difference Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   CLOCK SKEW HANDLING                       │
└─────────────────────────────────────────────────────────────┘

Scenario: 3 devices with different clocks

Device A (Clock Fast +10 min):
  ├─ Client Time: 10:10:00
  ├─ Token exp: 10:15:00
  └─ Client thinks: "5 min left"

Device B (Correct Time):
  ├─ Client Time: 10:00:00
  ├─ Token exp: 10:15:00
  └─ Client thinks: "15 min left"

Device C (Clock Slow -10 min):
  ├─ Client Time: 09:50:00
  ├─ Token exp: 10:15:00
  └─ Client thinks: "25 min left"

Backend Validation (Server Time Only):
  │
  ├─> Client sends token
  │
  ├─> Server extracts JWT
  │     ├─ exp: 10:15:00 (issued by server)
  │     └─ Server time: 10:05:00
  │
  ├─> Server validates:
  │     ├─ 10:05:00 < 10:15:00 → ✓ VALID
  │     └─ Decision based ONLY on server time
  │
  └─> All 3 devices get same result ✓

Result:
├─ Device A: Token valid (despite client thinking 5 min left)
├─ Device B: Token valid (15 min left)
└─ Device C: Token valid (despite client thinking 25 min left)
└─> Consistent validation regardless of client clock ✓
```

---

## 5. Backend Restart Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND RESTART                           │
└─────────────────────────────────────────────────────────────┘

Before Restart:
  │
  ├─> User logged in with:
  │     ├─ Access Token (JWT) - Stored in sessionStorage
  │     └─ Refresh Token (UUID) - Stored in localStorage
  │
  └─> Database has refresh token:
        ├─ token: "hashed-uuid"
        ├─ userId: "user-123"
        └─ expiresAt: NOW() + 30 days

Deployment / Restart:
  │
  ├─> Backend receives SIGTERM
  │
  ├─> Graceful shutdown:
  │     ├─ Stop accepting new requests
  │     ├─ Wait for in-flight requests (max 30s)
  │     └─ Close database connections
  │
  └─> Server restarts (10 seconds downtime)

After Restart:
  │
  ├─> User makes API request
  │     ├─ Authorization: Bearer <access-token>
  │     │
  │     └─> Server validates JWT
  │           ├─ Check signature with JWT_SECRET ✓
  │           ├─ Check expiry ✓
  │           └─ No database lookup needed ✓
  │
  └─> Request succeeds ✓

Access Token Expired? → Refresh
  │
  ├─> Client sends refresh token
  │
  ├─> Server queries database
  │     ├─ Find token in PostgreSQL
  │     ├─ Database persisted across restart ✓
  │     └─ Token found and valid ✓
  │
  └─> New access token issued ✓

Result: User stays logged in through restart ✓
```

---

## 6. Database Downtime Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE DOWNTIME                          │
└─────────────────────────────────────────────────────────────┘

Normal Operation:
  │
  ├─> Request → Backend → Database → Response
  │
  └─> Latency: 50ms ✓

Database Crashes:
  │
  ├─> Request → Backend → Database (down) ✗
  │                 │
  │                 └─> Connection attempt
  │                       ├─ Timeout: 10 seconds
  │                       ├─ Retry 1: Failed
  │                       ├─ Retry 2: Failed
  │                       └─ Retry 3: Failed
  │
  └─> Circuit Breaker Opens
        │
        └─> Subsequent requests fail fast (no wait)

With Circuit Breaker:
  │
  ├─> Request 1: Try database → Timeout (10s) → 503 Error
  ├─> Request 2: Try database → Timeout (10s) → 503 Error
  ├─> Request 3: Try database → Timeout (10s) → 503 Error
  │
  ├─> Circuit OPENS (50% failure rate reached)
  │
  ├─> Request 4: Circuit open → Immediate 503 (no DB attempt)
  ├─> Request 5: Circuit open → Immediate 503 (no DB attempt)
  │
  └─> Wait 30 seconds → Circuit HALF-OPEN
        │
        └─> Request 6: Try database again
              ├─ Success? → Circuit CLOSED (resume normal)
              └─ Failed? → Circuit OPEN again (wait 30s more)

With Redis Fallback (Login):
  │
  ├─> Request login
  │
  ├─> Try PostgreSQL
  │     └─> Failed (database down)
  │
  ├─> Try Redis cache
  │     ├─ Key: user:email@example.com
  │     ├─ Value: {id, email, password_hash, ...}
  │     └─> Found ✓
  │
  ├─> Verify password with cached hash ✓
  │
  └─> Generate tokens ✓

Result:
├─ Critical operations work during downtime
├─ User can still login
└─ Better experience than complete failure

Response to User:
├─ Database down: "Service temporarily unavailable. Please try again."
├─ Circuit open: "Service experiencing issues. Please try again shortly."
└─ Redis fallback: Works normally (user doesn't know DB is down)
```

---

## 7. Duplicate Request Prevention Flow

```
┌─────────────────────────────────────────────────────────────┐
│                DUPLICATE REQUEST HANDLING                   │
└─────────────────────────────────────────────────────────────┘

Scenario 1: Double-Click Login
  │
  ├─> User clicks "Login" at t=0
  │     │
  │     └─> Frontend: loginInProgress = true
  │
  ├─> User clicks "Login" again at t=0.1s (impatient)
  │     │
  │     └─> Frontend: Check loginInProgress
  │           ├─ true → Ignore click ✓
  │           └─> Log: "Login already in progress"
  │
  └─> First request completes at t=2s
        │
        └─> Frontend: loginInProgress = false

Scenario 2: Network Glitch (2 requests sent)
  │
  ├─> Request 1 sent at t=0
  ├─> Request 2 sent at t=0.1s (duplicate)
  │
  ├─> Both reach server
  │     │
  │     ├─> Request 1 processed:
  │     │     ├─ Verify password ✓
  │     │     ├─ Generate tokens: {A1, R1}
  │     │     └─ Store R1 in database
  │     │
  │     └─> Request 2 processed:
  │           ├─ Verify password ✓
  │           ├─ Generate tokens: {A2, R2}
  │           └─ Store R2 in database
  │
  └─> Result:
        ├─ Two valid sessions created
        ├─ User can use either token pair
        └─ No conflict ✓

Scenario 3: Password Reset (Multiple Requests)
  │
  ├─> Request 1: Generate token T1 → Store T1
  ├─> Request 2: Generate token T2 → Store T2 (overwrites T1)
  ├─> Request 3: Generate token T3 → Store T3 (overwrites T2)
  │
  └─> Database state:
        └─ resetToken: T3 (only latest valid)

  After 3 requests:
  │
  ├─> User tries T1 → Invalid (overwritten)
  ├─> User tries T2 → Invalid (overwritten)
  └─> User tries T3 → Valid ✓ (latest)

  Rate Limiting Applied:
  │
  ├─> Request 1: ✓ Allowed
  ├─> Request 2: ✓ Allowed
  ├─> Request 3: ✓ Allowed
  └─> Request 4: ✗ Blocked (429 Too Many Requests)
        └─> Message: "Too many attempts. Try again in 60 seconds."
```

---

## Summary Matrix

```
┌──────────────────────┬─────────────┬──────────────────────────┐
│ Edge Case            │ Status      │ User Impact              │
├──────────────────────┼─────────────┼──────────────────────────┤
│ Poor Internet        │ ✓ Handled   │ Clear timeout message    │
│ Duplicate Requests   │ ✓ Handled   │ No errors, works fine    │
│ Token Expiry         │ ✓ Handled   │ Seamless auto-refresh    │
│ Multiple Devices     │ ✓ Handled   │ Independent sessions     │
│ Clock Differences    │ ✓ Handled   │ Server-time validation   │
│ Backend Restarts     │ ✓ Handled   │ Stays logged in          │
│ Database Downtime    │ ⚠ Partial   │ Graceful degradation     │
└──────────────────────┴─────────────┴──────────────────────────┘

Legend:
  ✓ Fully handled - No user impact
  ⚠ Partially handled - Minimal user impact
  ✗ Not handled - User affected
```

---

## Request Flow with All Protections

```
User Action: "Create Ad"
  │
  ├─> [FRONTEND] Duplicate Check
  │     ├─ Submission in progress? → Block ✓
  │     └─ First submission? → Continue
  │
  ├─> [FRONTEND] Token Check
  │     ├─ Token expires in < 2 min? → Refresh first
  │     └─ Token fresh? → Continue
  │
  ├─> [NETWORK] Send Request
  │     ├─ Set 30s timeout
  │     └─ Add Authorization header
  │
  ├─> [BACKEND] Rate Limiting
  │     ├─ Too many requests? → 429 Error
  │     └─ Within limit? → Continue
  │
  ├─> [BACKEND] JWT Validation
  │     ├─ Check signature ✓
  │     ├─ Check expiry (server time) ✓
  │     └─ Grace period if recently expired ✓
  │
  ├─> [BACKEND] Database Query
  │     ├─ Connection pooling
  │     ├─ Retry on failure (3 attempts)
  │     ├─ Circuit breaker if persistent failure
  │     └─ Redis fallback if available
  │
  └─> [RESPONSE]
        ├─ Success (200) → Show ad created ✓
        ├─ Unauthorized (401) → Auto-refresh & retry ✓
        ├─ Rate limited (429) → Show "too many requests" ✓
        ├─ Unavailable (503) → Show "try again later" ✓
        └─ Timeout → Show "connection timeout" ✓

All edge cases protected ✓
```

---

**Status:** Comprehensive edge case coverage  
**User Impact:** Minimized frustration  
**Production Ready:** 90% (Add remaining Priority 2 items)
