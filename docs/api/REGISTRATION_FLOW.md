# 🔐 User Registration Flow - Visual Guide

## 📊 Complete Registration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│                  (HTML Registration Form)                       │
│                                                                 │
│  Fields:                                                        │
│  • fullName                                                     │
│  • email                                                        │
│  • password                                                     │
│  • confirmPassword                                              │
│  • age                                                          │
│  • location                                                     │
│  • referralCode (optional)                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ POST /api/v1/auth/register
                         │ Content-Type: application/json
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│              AUTH CONTROLLER (NestJS)                           │
│              @Post('register')                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ RegisterDto (validated)
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                 DTO VALIDATION LAYER                            │
│                 (class-validator)                               │
│                                                                 │
│  ✅ fullName: IsString, IsNotEmpty                             │
│  ✅ email: IsEmail, IsNotEmpty                                 │
│  ✅ password: MinLength(8), IsStrongPassword                   │
│  ✅ confirmPassword: Match('password')                         │
│  ✅ age: Min(13), Max(120)                                     │
│  ✅ location: IsString, IsNotEmpty                             │
│  ✅ referralCode: IsOptional                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ If validation fails → 400 Bad Request
                         │ If validation passes ↓
                         │
┌─────────────────────────────────────────────────────────────────┐
│              AUTH SERVICE (Business Logic)                      │
│                                                                 │
│  Step 1: Normalize Email                                       │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ email.toLowerCase().trim()                           │     │
│  │ "JOHN@EXAMPLE.COM" → "john@example.com"             │     │
│  └──────────────────────────────────────────────────────┘     │
│                         │                                       │
│  Step 2: Check Duplicate Email                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ SELECT * FROM users WHERE email = ?                  │     │
│  │ If exists → 409 Conflict                             │     │
│  └──────────────────────────────────────────────────────┘     │
│                         │                                       │
│  Step 3: Generate Unique Username                              │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ baseUsername = email.split('@')[0]                   │     │
│  │ Remove special chars                                 │     │
│  │ Check collision → append counter if exists           │     │
│  │ "john@example.com" → "john" or "john1"              │     │
│  └──────────────────────────────────────────────────────┘     │
│                         │                                       │
│  Step 4: Hash Password                                         │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ bcrypt.hash(password, 10)                            │     │
│  │ "SecurePass123" → "$2b$10$abc...xyz"               │     │
│  │ NOTE: confirmPassword NOT stored                     │     │
│  └──────────────────────────────────────────────────────┘     │
│                         │                                       │
│  Step 5: Generate Referral Code                                │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ "USER" + random 4 digits                             │     │
│  │ Example: "USER1234"                                  │     │
│  └──────────────────────────────────────────────────────┘     │
│                         │                                       │
│  Step 6: Process Referral (if provided)                        │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ Find referrer by referralCode                        │     │
│  │ If found:                                             │     │
│  │   • New user gets 50 coins                           │     │
│  │   • Referrer gets 50 coins                           │     │
│  │   • Referrer's referralCount++                       │     │
│  │ If not found: Continue (no error)                    │     │
│  └──────────────────────────────────────────────────────┘     │
│                         │                                       │
│  Step 7: Create User Record                                    │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ INSERT INTO users (                                  │     │
│  │   email, password, fullName, username,               │     │
│  │   age, location, referralCode, referredBy,           │     │
│  │   coins, role, trustScore, isEmailVerified           │     │
│  │ ) VALUES (...)                                        │     │
│  └──────────────────────────────────────────────────────┘     │
│                         │                                       │
│  Step 8: Generate JWT Tokens                                   │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ Payload: { sub: userId, email, role }                │     │
│  │ accessToken (7 days)                                 │     │
│  │ refreshToken (30 days)                               │     │
│  └──────────────────────────────────────────────────────┘     │
│                         │                                       │
│  Step 9: Sanitize Response                                     │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ Remove password from user object                     │     │
│  │ Return: { accessToken, refreshToken, user }          │     │
│  └──────────────────────────────────────────────────────┘     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Success
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│               RESPONSE INTERCEPTOR                              │
│               (Transform to standard format)                    │
│                                                                 │
│  { success: true, data: { ... } }                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ 201 Created
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│                  (Receives Response)                            │
│                                                                 │
│  • Store accessToken (localStorage/cookies)                    │
│  • Store refreshToken (httpOnly cookie)                        │
│  • Redirect to dashboard                                       │
│  • Display welcome message                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Transformation Flow

### **Input (Frontend)**
```json
{
  "fullName": "Jane Doe",
  "email": "JANE@EXAMPLE.COM",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123",
  "age": 25,
  "location": "  New York  ",
  "referralCode": "user1234"
}
```

### **After DTO Validation**
```typescript
{
  fullName: "Jane Doe",
  email: "JANE@EXAMPLE.COM", // Not yet normalized
  password: "SecurePass123",
  confirmPassword: "SecurePass123", // Validated match
  age: 25,
  location: "  New York  ",
  referralCode: "user1234"
}
```

### **After Service Processing**
```typescript
{
  email: "jane@example.com", // ✅ Normalized
  password: "$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36W...", // ✅ Hashed
  fullName: "Jane Doe", // ✅ Trimmed
  username: "jane", // ✅ Auto-generated
  age: 25,
  location: "New York", // ✅ Trimmed
  referralCode: "USER5678", // ✅ Generated
  referredBy: "USER1234", // ✅ Normalized & validated
  coins: 50, // ✅ Bonus from referral
  role: "user",
  trustScore: 50,
  isEmailVerified: false
  // confirmPassword NOT stored ✅
}
```

### **Stored in Database**
```sql
INSERT INTO users (
  id,                    -- Generated UUID
  email,                 -- "jane@example.com"
  password,              -- "$2b$10$..."
  full_name,             -- "Jane Doe"
  username,              -- "jane"
  age,                   -- 25
  location,              -- "New York"
  referral_code,         -- "USER5678"
  referred_by,           -- "USER1234"
  coins,                 -- 50
  role,                  -- "user"
  trust_score,           -- 50
  is_email_verified,     -- false
  created_at,            -- CURRENT_TIMESTAMP
  updated_at             -- CURRENT_TIMESTAMP
) VALUES (...);
```

### **Response to Frontend**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "jane@example.com",
      "fullName": "Jane Doe",
      "username": "jane",
      "age": 25,
      "location": "New York",
      "role": "user",
      "coins": 50,
      "trustScore": 50,
      "isEmailVerified": false,
      "referralCode": "USER5678",
      "referredBy": "USER1234",
      "createdAt": "2026-01-12T10:30:00.000Z"
      // password NOT included ✅
    }
  }
}
```

---

## 🚨 Error Handling Flow

```
POST /api/v1/auth/register
         │
         ├─→ Validation Error (400 Bad Request)
         │   ├─ Empty fields
         │   ├─ Invalid email format
         │   ├─ Weak password
         │   ├─ Password mismatch
         │   ├─ Age < 13
         │   └─ Missing required fields
         │
         ├─→ Business Logic Error
         │   ├─ Duplicate email (409 Conflict)
         │   └─ Database connection error (500 Internal Server Error)
         │
         └─→ Success (201 Created)
             └─ Return tokens + user data
```

---

## 🔐 Security Measures Applied

| Layer | Security Measure | Implementation |
|-------|------------------|----------------|
| **Transport** | HTTPS (production) | Configure reverse proxy |
| **Input** | Server-side validation | class-validator decorators |
| **Password** | Strong password rules | Min 8 chars, 1 upper, 1 lower, 1 number |
| **Password** | Bcrypt hashing | Cost factor 10 |
| **Password** | Confirmation check | Match validator (never stored) |
| **Email** | Normalization | Lowercase + trim |
| **Email** | Duplicate prevention | Unique constraint + case-insensitive check |
| **Database** | SQL injection prevention | TypeORM parameterized queries |
| **Database** | Indexed lookups | Indexes on email, username, referralCode |
| **Response** | Password exclusion | @Exclude decorator + sanitizeUser() |
| **Authentication** | JWT tokens | Access (7d) + Refresh (30d) |
| **Authorization** | Role-based access | User role in JWT payload |

---

## 🎯 Validation Rules Summary

### **fullName**
- ✅ Must be a string
- ✅ Cannot be empty
- ✅ Automatically trimmed

### **email**
- ✅ Must be valid email format
- ✅ Cannot be empty
- ✅ Normalized to lowercase
- ✅ Trimmed of whitespace
- ✅ Must be unique (case-insensitive)

### **password**
- ✅ Minimum 8 characters
- ✅ At least 1 uppercase letter (A-Z)
- ✅ At least 1 lowercase letter (a-z)
- ✅ At least 1 number (0-9)
- ✅ Hashed with bcrypt before storage

### **confirmPassword**
- ✅ Must match password exactly
- ✅ Never stored in database

### **age**
- ✅ Must be a number
- ✅ Minimum 13 years old
- ✅ Maximum 120 years old

### **location**
- ✅ Must be a string
- ✅ Cannot be empty
- ✅ Automatically trimmed

### **referralCode** (optional)
- ✅ Optional field
- ✅ Normalized to uppercase
- ✅ Trimmed of whitespace
- ✅ Silently ignored if invalid

---

## 📱 Frontend Integration Checklist

- [ ] Match field names exactly: `fullName`, `email`, `password`, `confirmPassword`, `age`, `location`
- [ ] Implement client-side validation (faster UX)
- [ ] Show password strength indicator
- [ ] Confirm password match in real-time
- [ ] Display user-friendly error messages
- [ ] Disable submit button during request
- [ ] Show loading spinner
- [ ] Store JWT tokens securely (HttpOnly cookies preferred)
- [ ] Redirect to dashboard on success
- [ ] Handle network errors gracefully
- [ ] Implement retry logic with exponential backoff

---

## 🧪 Testing Scenarios

### ✅ **Happy Path**
1. User fills all fields correctly
2. Password meets strength requirements
3. Passwords match
4. Age ≥ 13
5. Email not already registered
6. → **Result:** 201 Created with tokens

### ❌ **Error Scenarios**

| Scenario | Expected Result |
|----------|----------------|
| Missing fullName | 400: "Full name is required" |
| Invalid email | 400: "Please provide a valid email address" |
| Password < 8 chars | 400: "Password must be at least 8 characters long" |
| Weak password (no uppercase) | 400: "Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number" |
| Passwords don't match | 400: "Passwords do not match" |
| Age < 13 | 400: "You must be at least 13 years old to register" |
| Duplicate email | 409: "An account with this email already exists" |
| Database down | 500: Internal Server Error |

---

## 🔄 JWT Token Structure

### **Access Token**
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "jane@example.com",
  "role": "user",
  "iat": 1705057800,
  "exp": 1705662600
}
```

### **Refresh Token**
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "jane@example.com",
  "role": "user",
  "iat": 1705057800,
  "exp": 1707649800
}
```

---

**Last Updated:** January 12, 2026  
**Visual Guide for:** EL HANNORA Registration System
