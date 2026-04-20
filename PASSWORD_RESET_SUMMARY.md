# Password Reset System - Quick Reference

## 🚀 Quick Start

### 1. Database Migration
```sql
-- Run this to add reset fields to users table
psql -U postgres -d elhannora_db -f database/schema/password-reset.sql
```

### 2. API Endpoints

#### Request Password Reset
```bash
POST /api/v1/auth/password-reset/request
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Confirm Password Reset
```bash
POST /api/v1/auth/password-reset/confirm
Content-Type: application/json

{
  "token": "a1b2c3d4e5f6...",
  "newPassword": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}
```

## 🔐 Security Features

✅ **One-time tokens** - Cannot be reused after reset  
✅ **15-minute expiry** - Short window prevents abuse  
✅ **SHA-256 hashing** - Tokens hashed before storage  
✅ **Anti-enumeration** - Same response for all emails  
✅ **Auto logout** - All sessions invalidated  
✅ **Strong passwords** - Validation enforced

## 📁 Files Modified

### Backend
- `src/modules/users/entities/user.entity.ts` - Added `resetToken`, `resetTokenExpiry`
- `src/modules/auth/dto/auth.dto.ts` - Added `PasswordResetRequestDto`, `PasswordResetConfirmDto`
- `src/modules/auth/auth.service.ts` - Added `requestPasswordReset()`, `resetPassword()`
- `src/modules/auth/auth.controller.ts` - Added reset endpoints

### Database
- `database/schema/password-reset.sql` - Migration script

### Documentation
- `docs/api/PASSWORD_RESET.md` - Complete technical documentation

## 🧪 Testing Flow

```powershell
# 1. Request reset
curl -X POST http://localhost:3000/api/v1/auth/password-reset/request `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com"}'

# 2. Get token from console logs (dev only)
# Console: "Password reset token for test@example.com: abc123..."

# 3. Reset password
curl -X POST http://localhost:3000/api/v1/auth/password-reset/confirm `
  -H "Content-Type: application/json" `
  -d '{"token":"abc123...","newPassword":"NewPass123!","confirmPassword":"NewPass123!"}'

# 4. Login with new password
curl -X POST http://localhost:3000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"NewPass123!"}'
```

## ⚠️ TODO Before Production

1. **Remove Console Logs** - Delete token logging from service
2. **Integrate Email Service** - Install Nodemailer/SendGrid
3. **Add Rate Limiting** - Max 3 requests/minute per IP
4. **Configure SMTP** - Set up email credentials

## 📧 Email Integration (Next Step)

```typescript
// Install email package
npm install @nestjs-modules/mailer nodemailer

// Configure in auth.module.ts
MailerModule.forRoot({
  transport: {
    host: process.env.SMTP_HOST,
    port: 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  },
}),

// Send email in requestPasswordReset()
await this.mailerService.sendMail({
  to: user.email,
  subject: 'Reset Your Password',
  html: `<a href="https://elhannora.com/reset-password?token=${token}">Reset Password</a>`,
});
```

## 📊 Current System Architecture

```
User Flow:
1. User forgets password → Clicks "Forgot Password"
2. Enters email → POST /password-reset/request
3. Receives email with token link
4. Clicks link → Redirected to reset page
5. Enters new password → POST /password-reset/confirm
6. Password updated → All devices logged out
7. User logs in with new password

Token Security:
- Generated: crypto.randomBytes(32) = 64 hex chars
- Stored: SHA-256 hash in database
- Expiry: 15 minutes from creation
- Single-use: Cleared after successful reset
- Validation: Hash comparison + expiry check
```

## 🎯 Next Steps

1. Run database migration
2. Test endpoints locally
3. Integrate email service
4. Add rate limiting
5. Create frontend pages
6. Deploy to production

---

**System Status:** ✅ Ready for Email Integration  
**Documentation:** See `docs/api/PASSWORD_RESET.md` for full details
