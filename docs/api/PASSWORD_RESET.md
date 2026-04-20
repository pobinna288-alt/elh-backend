# 🔐 Password Reset System - Technical Documentation

## 🎯 Overview

Secure password reset system for EL HANNORA with:
- ✅ **Email-based reset** - Request reset using registered email
- ✅ **One-time tokens** - Secure random tokens that expire
- ✅ **15-minute expiry** - Short window to prevent abuse
- ✅ **Hashed storage** - SHA-256 hashed tokens in database
- ✅ **Anti-enumeration** - Prevents discovering registered emails
- ✅ **Auto logout** - Invalidates all sessions after reset

---

## 🔒 Security Architecture

### **Token Generation & Storage**

```
User Requests Reset
    ↓
Generate Random Token:
├─ 32 bytes (256 bits)
├─ crypto.randomBytes(32)
└─ Result: 64 hex characters

Example Plain Token:
"a1b2c3d4e5f6...64chars"

Hash with SHA-256:
├─ One-way hash
├─ Cannot reverse
└─ Store only hash

Database Storage:
├─ reset_token: "abc123...hash"  (SHA-256)
├─ reset_token_expiry: NOW() + 15 min
└─ Plain token sent via email only

User Clicks Email Link:
http://elhannora.com/reset-password?token=a1b2c3d4e5f6...

Backend Validates:
├─ Hash received token
├─ Find user by hashed token
├─ Check expiry < NOW()
└─ If valid → Allow reset

After Reset:
├─ Update password
├─ Clear reset_token = NULL
├─ Clear reset_token_expiry = NULL
└─ Logout all devices

Result: Token single-use only ✓
```

---

## 🛡️ Preventing User Enumeration

### **What is User Enumeration?**

```
❌ BAD RESPONSE (Reveals if email exists):
POST /auth/password-reset/request
{
  "email": "nonexistent@example.com"
}

Response: 400 Bad Request
{
  "error": "No account found with this email"
}

→ Attacker now knows this email is NOT registered

✓ GOOD RESPONSE (Consistent message):
POST /auth/password-reset/request
{
  "email": "nonexistent@example.com"
}

Response: 200 OK
{
  "message": "If an account with that email exists, a password reset link has been sent",
  "success": true
}

→ Same message whether email exists or not
→ Attacker cannot determine if email is registered
```

### **Implementation**

```typescript
async requestPasswordReset(email: string) {
  const user = await findUserByEmail(email);
  
  if (user) {
    // Generate and send reset token
    const token = generateToken();
    saveToken(user, token);
    sendEmail(user.email, token);
  }
  
  // ALWAYS return success (even if user doesn't exist)
  return {
    message: 'If an account with that email exists, a password reset link has been sent',
    success: true
  };
}

// Security Benefits:
// 1. Cannot discover registered emails
// 2. Cannot build list of valid users
// 3. Protects user privacy
```

---

## 📊 API Endpoints

### **1. Request Password Reset**

```http
POST /api/v1/auth/password-reset/request
Content-Type: application/json

Body:
{
  "email": "john@example.com"
}

Response (200 OK):
{
  "success": true,
  "data": {
    "message": "If an account with that email exists, a password reset link has been sent",
    "success": true
  }
}

What Happens:
1. Email normalized (lowercase, trim)
2. Find user by email
3. If user exists:
   - Generate 32-byte random token
   - Hash token with SHA-256
   - Store hash + expiry (15 min) in database
   - Send email with plain token
4. Return success (even if user doesn't exist)

Email Content:
Subject: Reset Your Password
Body:
  Hi [Name],
  
  Click the link below to reset your password:
  https://elhannora.com/reset-password?token=a1b2c3d4...
  
  This link expires in 15 minutes.
  
  If you didn't request this, ignore this email.

Security Notes:
- Token only sent once via email
- Token never exposed in response
- Same message regardless of email existence
```

### **2. Confirm Password Reset**

```http
POST /api/v1/auth/password-reset/confirm
Content-Type: application/json

Body:
{
  "token": "a1b2c3d4e5f6789...",
  "newPassword": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}

Response (200 OK):
{
  "success": true,
  "data": {
    "message": "Password has been reset successfully. Please login with your new password.",
    "success": true
  }
}

Response (400 Bad Request - Expired):
{
  "statusCode": 400,
  "message": "Invalid or expired reset token",
  "error": "Bad Request"
}

What Happens:
1. Hash received token with SHA-256
2. Find user where:
   - reset_token = hashedToken
   - reset_token_expiry > NOW()
3. If not found or expired → Reject (400)
4. If valid:
   - Hash new password with bcrypt
   - Update user password
   - Clear reset_token = NULL
   - Clear reset_token_expiry = NULL
   - Reset failed_login_attempts = 0
   - Clear locked_until = NULL
   - Logout from all devices (revoke all refresh tokens)
5. Return success

Security Features:
- Token single-use (cleared after use)
- Cannot reuse same token
- All sessions invalidated (forced re-login)
- Password strength validated (8+ chars, uppercase, lowercase, number)
- Passwords must match (confirmPassword)
```

---

## 🔄 Complete Reset Flow

### **Step-by-Step Process**

```javascript
// ==========================================
// STEP 1: User Requests Reset
// ==========================================

// Frontend
async function requestPasswordReset(email) {
  const response = await fetch('/api/v1/auth/password-reset/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  
  const data = await response.json();
  console.log(data.message);
  // "If an account with that email exists, a password reset link has been sent"
  
  // Show success message to user
  alert('Check your email for reset instructions');
}

// Backend
async requestPasswordReset(email: string) {
  // 1. Find user
  const user = await usersRepository.findOne({ where: { email } });
  
  if (user) {
    // 2. Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    // Result: "a1b2c3d4e5f6..." (64 chars)
    
    // 3. Hash token
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // 4. Set expiry (15 minutes)
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 15);
    
    // 5. Save to database
    user.resetToken = hashedToken;
    user.resetTokenExpiry = expiryDate;
    await usersRepository.save(user);
    
    // 6. Send email (TODO: integrate email service)
    const resetLink = `https://elhannora.com/reset-password?token=${resetToken}`;
    // sendEmail(user.email, resetLink);
  }
  
  // 7. Always return success
  return { message: 'If an account with that email exists...', success: true };
}

// ==========================================
// STEP 2: User Clicks Email Link
// ==========================================

// User clicks: https://elhannora.com/reset-password?token=a1b2c3d4...
// Frontend displays reset form with token in URL

// ==========================================
// STEP 3: User Submits New Password
// ==========================================

// Frontend
async function resetPassword(token, newPassword, confirmPassword) {
  const response = await fetch('/api/v1/auth/password-reset/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword, confirmPassword })
  });
  
  if (response.ok) {
    const data = await response.json();
    alert(data.message);
    // "Password has been reset successfully. Please login with your new password."
    
    // Redirect to login
    window.location.href = '/login';
  } else {
    const error = await response.json();
    alert(error.message);
    // "Invalid or expired reset token"
  }
}

// Backend
async resetPassword(token: string, newPassword: string) {
  // 1. Hash received token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // 2. Find user with matching token
  const user = await usersRepository.findOne({
    where: { resetToken: hashedToken }
  });
  
  // 3. Validate token exists and not expired
  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    throw new BadRequestException('Invalid or expired reset token');
  }
  
  // 4. Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  // 5. Update password and clear token
  user.password = hashedPassword;
  user.resetToken = null;
  user.resetTokenExpiry = null;
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  await usersRepository.save(user);
  
  // 6. Logout from all devices
  await refreshTokenRepository.update(
    { userId: user.id, isRevoked: false },
    { isRevoked: true, revokedAt: new Date() }
  );
  
  // 7. Return success
  return {
    message: 'Password has been reset successfully. Please login with your new password.',
    success: true
  };
}

// ==========================================
// STEP 4: User Logs In with New Password
// ==========================================

// User enters new credentials on login page
// Normal login flow proceeds
```

---

## 🧪 Testing the Reset System

### **Test 1: Successful Reset Flow**

```powershell
# Step 1: Request reset
$request = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3000/api/v1/auth/password-reset/request" `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com"}'

Write-Host $request.message
# "If an account with that email exists, a password reset link has been sent"

# Step 2: Check console logs for token (dev only)
# Console: "Password reset token for test@example.com: a1b2c3d4e5f6..."
# Copy the token

# Step 3: Reset password with token
$reset = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3000/api/v1/auth/password-reset/confirm" `
  -ContentType "application/json" `
  -Body @"
{
  "token": "a1b2c3d4e5f6...",
  "newPassword": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}
"@

Write-Host $reset.message
# "Password has been reset successfully. Please login with your new password."

# Step 4: Login with new password
$login = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3000/api/v1/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com","password":"NewSecurePass123!"}'

Write-Host "Login successful!"
```

### **Test 2: Expired Token**

```powershell
# Step 1: Request reset
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3000/api/v1/auth/password-reset/request" `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com"}'

# Step 2: Wait 16 minutes (token expires after 15 min)
Start-Sleep -Seconds 960

# Step 3: Try to reset (should fail)
try {
  Invoke-RestMethod -Method POST `
    -Uri "http://localhost:3000/api/v1/auth/password-reset/confirm" `
    -ContentType "application/json" `
    -Body '{"token":"a1b2c3d4...","newPassword":"NewPass123!","confirmPassword":"NewPass123!"}'
} catch {
  Write-Host "Error: Invalid or expired reset token" ✓
}
```

### **Test 3: Invalid Token**

```powershell
# Try to reset with random token
try {
  Invoke-RestMethod -Method POST `
    -Uri "http://localhost:3000/api/v1/auth/password-reset/confirm" `
    -ContentType "application/json" `
    -Body '{"token":"invalidtoken123","newPassword":"NewPass123!","confirmPassword":"NewPass123!"}'
} catch {
  Write-Host "Error: Invalid or expired reset token" ✓
}
```

### **Test 4: User Enumeration Prevention**

```powershell
# Request reset for non-existent email
$response1 = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3000/api/v1/auth/password-reset/request" `
  -ContentType "application/json" `
  -Body '{"email":"nonexistent@example.com"}'

# Request reset for existing email
$response2 = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3000/api/v1/auth/password-reset/request" `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com"}'

# Both responses should be identical
Write-Host ($response1.message -eq $response2.message)
# True ✓ (Cannot tell if email exists)
```

### **Test 5: Token Reuse Prevention**

```powershell
# Step 1: Request reset and get token
$token = "a1b2c3d4e5f6..."

# Step 2: Reset password (first time)
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3000/api/v1/auth/password-reset/confirm" `
  -ContentType "application/json" `
  -Body "{\"token\":\"$token\",\"newPassword\":\"NewPass123!\",\"confirmPassword\":\"NewPass123!\"}"

Write-Host "First reset successful" ✓

# Step 3: Try to reuse same token (should fail)
try {
  Invoke-RestMethod -Method POST `
    -Uri "http://localhost:3000/api/v1/auth/password-reset/confirm" `
    -ContentType "application/json" `
    -Body "{\"token\":\"$token\",\"newPassword\":\"AnotherPass123!\",\"confirmPassword\":\"AnotherPass123!\"}"
} catch {
  Write-Host "Error: Invalid or expired reset token" ✓
  Write-Host "Token already used - cannot reuse" ✓
}
```

### **Test 6: All Sessions Logged Out**

```powershell
# Step 1: Login from multiple devices
$device1 = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3000/api/v1/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com","password":"OldPass123!"}'

$device2 = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3000/api/v1/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com","password":"OldPass123!"}'

Write-Host "Logged in from 2 devices" ✓

# Step 2: Reset password
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3000/api/v1/auth/password-reset/request" `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com"}'

# Get token from console
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3000/api/v1/auth/password-reset/confirm" `
  -ContentType "application/json" `
  -Body '{"token":"token...","newPassword":"NewPass123!","confirmPassword":"NewPass123!"}'

# Step 3: Try to refresh from both devices (should fail)
try {
  Invoke-RestMethod -Method POST `
    -Uri "http://localhost:3000/api/v1/auth/refresh" `
    -ContentType "application/json" `
    -Body "{\"refreshToken\":\"$($device1.refreshToken)\"}"
} catch {
  Write-Host "Device 1: Token revoked" ✓
}

try {
  Invoke-RestMethod -Method POST `
    -Uri "http://localhost:3000/api/v1/auth/refresh" `
    -ContentType "application/json" `
    -Body "{\"refreshToken\":\"$($device2.refreshToken)\"}"
} catch {
  Write-Host "Device 2: Token revoked" ✓
}

Write-Host "All sessions invalidated after password reset" ✓
```

---

## 🛡️ Security Features

| Feature | Implementation | Benefit |
|---------|---------------|---------|
| **Random Tokens** | 32 bytes (256 bits) | Cryptographically secure, unpredictable |
| **Hashed Storage** | SHA-256 one-way hash | Database breach doesn't expose tokens |
| **Short Expiry** | 15 minutes | Limits window for attacks |
| **Single Use** | Cleared after use | Cannot reuse same token |
| **Anti-Enumeration** | Same response for all emails | Cannot discover registered users |
| **Auto Logout** | Revoke all refresh tokens | Forces re-login after reset |
| **Password Strength** | 8+ chars, mixed case, number | Strong passwords required |
| **Account Unlock** | Reset failed attempts | Fresh start after reset |

---

## 📊 Database State Management

### **Token Lifecycle**

```sql
-- Initial State (No reset requested)
SELECT reset_token, reset_token_expiry FROM users WHERE email = 'john@example.com';
reset_token       | NULL
reset_token_expiry| NULL

-- After Reset Request
UPDATE users 
SET 
  reset_token = 'abc123...hash',
  reset_token_expiry = NOW() + INTERVAL '15 minutes'
WHERE email = 'john@example.com';

reset_token       | abc123456789abcdef... (SHA-256 hash)
reset_token_expiry| 2026-01-12 10:15:00

-- After Successful Reset
UPDATE users 
SET 
  reset_token = NULL,
  reset_token_expiry = NULL,
  password = 'newhash...',
  failed_login_attempts = 0,
  locked_until = NULL
WHERE email = 'john@example.com';

-- Revoke all refresh tokens
UPDATE refresh_tokens 
SET 
  is_revoked = true,
  revoked_at = NOW()
WHERE user_id = 'user-uuid' AND is_revoked = false;

reset_token       | NULL
reset_token_expiry| NULL
-- User must re-login
```

### **Index for Performance**

```sql
-- Faster token lookups
CREATE INDEX idx_users_reset_token 
ON users(reset_token) 
WHERE reset_token IS NOT NULL;

-- Query optimization
SELECT * FROM users 
WHERE reset_token = 'hashedtoken' 
AND reset_token_expiry > NOW();
-- Uses index ✓
```

---

## 🎯 Best Practices

### **Email Integration** (TODO)

```typescript
// Install email service (e.g., Nodemailer, SendGrid)
// npm install @nestjs-modules/mailer nodemailer

// Configure in auth.module.ts
MailerModule.forRoot({
  transport: {
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  },
  defaults: {
    from: '"EL HANNORA" <noreply@elhannora.com>',
  },
}),

// Send email in requestPasswordReset()
await this.mailerService.sendMail({
  to: user.email,
  subject: 'Reset Your Password',
  template: './reset-password', // HTML template
  context: {
    name: user.fullName,
    resetLink: `https://elhannora.com/reset-password?token=${resetToken}`,
  },
});
```

### **Rate Limiting** (Recommended)

```typescript
// Prevent abuse (limit reset requests)
// npm install @nestjs/throttler

// In auth.module.ts
ThrottlerModule.forRoot({
  ttl: 60,
  limit: 3, // Max 3 requests per minute per IP
}),

// In controller
@Throttle(3, 60)
@Post('password-reset/request')
async requestPasswordReset(...) {
  // Max 3 requests per minute
}
```

### **Frontend Integration**

```javascript
// Reset Request Page
<form onsubmit="handleResetRequest(event)">
  <input type="email" name="email" required>
  <button type="submit">Send Reset Link</button>
</form>

async function handleResetRequest(e) {
  e.preventDefault();
  const email = e.target.email.value;
  
  const response = await fetch('/api/v1/auth/password-reset/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  
  alert('Check your email for reset instructions');
}

// Reset Confirmation Page
// URL: /reset-password?token=a1b2c3d4...
<form onsubmit="handleResetConfirm(event)">
  <input type="password" name="newPassword" required>
  <input type="password" name="confirmPassword" required>
  <button type="submit">Reset Password</button>
</form>

async function handleResetConfirm(e) {
  e.preventDefault();
  const token = new URLSearchParams(window.location.search).get('token');
  const newPassword = e.target.newPassword.value;
  const confirmPassword = e.target.confirmPassword.value;
  
  try {
    const response = await fetch('/api/v1/auth/password-reset/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword, confirmPassword })
    });
    
    if (response.ok) {
      alert('Password reset successfully! Redirecting to login...');
      window.location.href = '/login';
    } else {
      const error = await response.json();
      alert(error.message);
    }
  } catch (error) {
    alert('An error occurred. Please try again.');
  }
}
```

---

## ✅ Security Checklist

- [x] Random token generation (32 bytes)
- [x] SHA-256 hashing before storage
- [x] 15-minute token expiry
- [x] Single-use tokens (cleared after use)
- [x] Anti-enumeration (consistent responses)
- [x] Password strength validation
- [x] Password confirmation matching
- [x] All sessions invalidated after reset
- [x] Failed login attempts cleared
- [x] Account lockout cleared
- [x] Database index for performance
- [x] Proper error messages
- [ ] Email integration (TODO)
- [ ] Rate limiting (TODO)

---

## 📝 Frontend Checklist

- [ ] Reset request page (/forgot-password)
- [ ] Reset confirmation page (/reset-password)
- [ ] Email input with validation
- [ ] Password strength indicator
- [ ] Password confirmation matching
- [ ] Success/error message display
- [ ] Redirect to login after reset
- [ ] Loading states during API calls

---

## 🚀 Deployment Notes

### **Environment Variables**

```env
# Email Service (TODO)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@elhannora.com
SMTP_PASS=your-app-password

# Frontend URL
FRONTEND_URL=https://elhannora.com
```

### **Production Checklist**

1. **Remove Console Logs**
   - Delete `console.log(resetToken)` from service
   - Only send token via email

2. **Enable Rate Limiting**
   - Max 3 reset requests per minute per IP
   - Prevents brute force attacks

3. **Configure Email Service**
   - Integrate Nodemailer or SendGrid
   - Create HTML email template
   - Test email delivery

4. **Monitor Reset Requests**
   - Log reset attempts
   - Alert on unusual patterns
   - Track success/failure rates

---

**Status:** ✅ Ready for Email Integration  
**Security Level:** Enterprise-Grade  
**Last Updated:** January 12, 2026
