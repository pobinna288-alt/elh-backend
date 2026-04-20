# 🔐 User Registration API Documentation

## Overview
Production-grade user registration system for EL HANNORA ads platform with comprehensive validation and security features.

---

## 📋 Registration Endpoint

### **POST** `/api/v1/auth/register`

Register a new user account with email verification preparation.

#### **Request Headers**
```http
Content-Type: application/json
```

#### **Request Body**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123",
  "age": 25,
  "location": "New York, NY",
  "referralCode": "USER1234" // Optional
}
```

#### **Field Validation Rules**

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| `fullName` | string | ✅ | Must not be empty |
| `email` | string | ✅ | Valid email format, automatically normalized (lowercase, trimmed) |
| `password` | string | ✅ | Min 8 chars, 1 uppercase, 1 lowercase, 1 number |
| `confirmPassword` | string | ✅ | Must match `password` exactly |
| `age` | number | ✅ | Between 13-120 years |
| `location` | string | ✅ | Must not be empty |
| `referralCode` | string | ❌ | Optional, silently ignored if invalid |

---

## ✅ Success Response

**Status Code:** `201 Created`

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john@example.com",
      "fullName": "John Doe",
      "username": "john",
      "age": 25,
      "location": "New York, NY",
      "role": "user",
      "coins": 50,
      "streakDays": 0,
      "trustScore": 50,
      "isVerified": false,
      "isEmailVerified": false,
      "referralCode": "USER5678",
      "referredBy": "USER1234",
      "referralCount": 0,
      "premiumExpiresAt": null,
      "createdAt": "2026-01-12T10:30:00.000Z",
      "updatedAt": "2026-01-12T10:30:00.000Z"
    }
  }
}
```

**Notes:**
- User receives **50 bonus coins** if registered with a valid referral code
- Password is never returned in response
- Tokens are valid: Access token (7 days), Refresh token (30 days)

---

## ❌ Error Responses

### **400 Bad Request** - Validation Errors

```json
{
  "success": false,
  "statusCode": 400,
  "message": [
    "Full name is required",
    "Please provide a valid email address",
    "Password must be at least 8 characters long",
    "Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number",
    "Passwords do not match",
    "You must be at least 13 years old to register",
    "Location is required"
  ],
  "timestamp": "2026-01-12T10:30:00.000Z",
  "path": "/api/v1/auth/register"
}
```

### **409 Conflict** - Email Already Exists

```json
{
  "success": false,
  "statusCode": 409,
  "message": "An account with this email already exists",
  "timestamp": "2026-01-12T10:30:00.000Z",
  "path": "/api/v1/auth/register"
}
```

---

## 🔒 Security Features

### **Password Security**
- ✅ Minimum 8 characters
- ✅ Must contain at least 1 uppercase letter (A-Z)
- ✅ Must contain at least 1 lowercase letter (a-z)
- ✅ Must contain at least 1 number (0-9)
- ✅ Hashed with bcrypt (cost factor 10)
- ✅ `confirmPassword` never stored in database

### **Email Normalization**
- Automatically converted to lowercase
- Trimmed of whitespace
- Case-insensitive duplicate detection

### **Username Generation**
- Auto-generated from email prefix
- Special characters removed
- Collision handling with numeric suffix
- Always unique

### **Data Sanitization**
- All string fields trimmed
- Email normalized (lowercase)
- Referral codes normalized (uppercase)
- SQL injection prevention via TypeORM parameterization

---

## 🎁 Referral System

### **How It Works**
1. User provides optional `referralCode` during registration
2. System validates referral code exists
3. If valid:
   - New user receives **50 bonus coins**
   - Referrer receives **50 bonus coins**
   - Referrer's `referralCount` incremented
   - Referrer's `referralEarnings` increased by 50
4. If invalid: Silently ignored (no error thrown)

### **Referral Code Format**
- Format: `USER####` (e.g., `USER1234`)
- 4 random digits
- Case-insensitive matching
- Unique per user

---

## 📧 Email Verification (Prepared for Future)

The system includes `isEmailVerified` field set to `false` by default.

**Future Implementation:**
1. Send verification email with token after registration
2. User clicks verification link
3. Backend validates token and sets `isEmailVerified = true`
4. Optionally require verification before certain actions

---

## 🧪 Example cURL Requests

### **Valid Registration**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Jane Smith",
    "email": "jane@example.com",
    "password": "SecurePass123",
    "confirmPassword": "SecurePass123",
    "age": 28,
    "location": "Los Angeles, CA"
  }'
```

### **Registration with Referral Code**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Bob Johnson",
    "email": "bob@example.com",
    "password": "MyPassword99",
    "confirmPassword": "MyPassword99",
    "age": 32,
    "location": "Chicago, IL",
    "referralCode": "USER1234"
  }'
```

---

## 🛡️ Security Best Practices

### **What We Do**
✅ Bcrypt password hashing (never plain text)  
✅ Email normalization (case-insensitive)  
✅ Strong password requirements  
✅ Password confirmation matching  
✅ Age validation (minimum 13 years)  
✅ SQL injection prevention  
✅ Unique constraint enforcement  
✅ Prepared for email verification  

### **What You Should Do (Frontend)**
- Validate fields before submission (faster UX)
- Hash passwords only on backend (never on frontend)
- Store JWT tokens securely (HttpOnly cookies preferred)
- Implement retry logic with exponential backoff
- Show user-friendly error messages
- Disable submit button during request

---

## 📊 Database Schema

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 13),
  location VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  coins INTEGER DEFAULT 0,
  trust_score INTEGER DEFAULT 50,
  is_email_verified BOOLEAN DEFAULT FALSE,
  referral_code VARCHAR(10) UNIQUE NOT NULL,
  referred_by VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_referral_code ON users(referral_code);
```

---

## 🚀 Testing the Endpoint

### **Postman Collection**
1. Method: POST
2. URL: `http://localhost:3000/api/v1/auth/register`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON): See example above
5. Expected: 201 Created with JWT tokens

### **Common Errors to Test**
- Missing required fields
- Invalid email format
- Weak password
- Password mismatch
- Age under 13
- Duplicate email
- Invalid referral code (should be silently ignored)

---

## 📝 Implementation Details

### **Files Modified**
- ✅ `src/modules/users/entities/user.entity.ts` - Updated to use `fullName`, added `isEmailVerified`
- ✅ `src/modules/auth/dto/auth.dto.ts` - Added `confirmPassword`, password strength validation
- ✅ `src/modules/auth/auth.service.ts` - Enhanced with email normalization, better error messages
- ✅ `src/common/validators/match.validator.ts` - Custom validator for password matching
- ✅ `src/common/validators/password-strength.validator.ts` - Password strength validation

### **Dependencies Used**
- `bcrypt` - Password hashing
- `class-validator` - DTO validation
- `class-transformer` - Response serialization
- `@nestjs/jwt` - Token generation
- `typeorm` - Database operations

---

## 🎯 Next Steps

**Recommended Enhancements:**
1. ✅ Implement email verification flow
2. ✅ Add rate limiting (prevent brute force)
3. ✅ Add account lockout after failed attempts
4. ✅ Implement password reset flow
5. ✅ Add OAuth (Google, Facebook)
6. ✅ Implement 2FA (Two-Factor Authentication)
7. ✅ Add CAPTCHA for bot prevention
8. ✅ Implement refresh token rotation
9. ✅ Add device tracking
10. ✅ Implement audit logs

---

**Last Updated:** January 12, 2026  
**API Version:** v1  
**Maintained by:** EL HANNORA Development Team
