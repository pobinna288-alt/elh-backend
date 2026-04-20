# Paystack Payment Architecture - Visual Guide

## 🔄 Complete Payment Flow

```
┌─────────────┐
│   FRONTEND  │
│   (User)    │
└──────┬──────┘
       │ 1. Click "Subscribe"
       ▼
┌──────────────────────────────────────────┐
│  Initialize Payment                      │
│  POST /api/initialize-payment            │
│  { email, amount }                       │
└──────┬───────────────────────────────────┘
       │ 2. Backend calls Paystack API
       ▼
┌──────────────────────────────────────────┐
│  YOUR BACKEND (Express/NestJS)           │
│  - Load secret key from .env             │
│  - Call Paystack initialization endpoint │
└──────┬───────────────────────────────────┘
       │ 3. Returns authorization URL
       ▼
┌──────────────────────────────────────────┐
│  PAYSTACK API                            │
│  POST /transaction/initialize            │
│  Returns: { authorization_url, reference }│
└──────┬───────────────────────────────────┘
       │ 4. Send URL to frontend
       ▼
┌──────────────────────────────────────────┐
│  FRONTEND                                │
│  Redirect user to Paystack checkout      │
│  window.location = authorization_url     │
└──────┬───────────────────────────────────┘
       │ 5. User enters card details
       ▼
┌──────────────────────────────────────────┐
│  PAYSTACK CHECKOUT PAGE                  │
│  - User enters card: 5531886652142950    │
│  - User enters CVV: 564                  │
│  - User clicks "Pay"                     │
└──────┬───────────────────────────────────┘
       │ 6. Payment processed
       ▼
┌──────────────────────────────────────────┐
│  PAYSTACK                                │
│  - Charge card                           │
│  - Generate reference                    │
│  - Redirect back to your app             │
└──────┬───────────────────────────────────┘
       │ 7. Callback with reference
       ▼
┌──────────────────────────────────────────┐
│  FRONTEND (Callback URL)                 │
│  - Extract reference from URL            │
│  - Call backend verification             │
└──────┬───────────────────────────────────┘
       │ 8. Verify payment
       ▼
┌──────────────────────────────────────────┐
│  Verify Payment                          │
│  POST /api/verify-payment                │
│  { reference: "ref_abc123xyz" }          │
└──────┬───────────────────────────────────┘
       │ 9. Backend verifies with Paystack
       ▼
┌──────────────────────────────────────────┐
│  YOUR BACKEND                            │
│  - Load secret key                       │
│  - Call Paystack verify endpoint         │
└──────┬───────────────────────────────────┘
       │ 10. Check payment status
       ▼
┌──────────────────────────────────────────┐
│  PAYSTACK API                            │
│  GET /transaction/verify/:reference      │
│  Returns: { status: "success", ... }     │
└──────┬───────────────────────────────────┘
       │ 11. If success, update database
       ▼
┌──────────────────────────────────────────┐
│  DATABASE                                │
│  UPDATE users                            │
│  SET role = 'premium'                    │
│  WHERE id = 'user-uuid'                  │
└──────┬───────────────────────────────────┘
       │ 12. Return success to frontend
       ▼
┌──────────────────────────────────────────┐
│  FRONTEND                                │
│  - Show success message                  │
│  - Redirect to premium dashboard         │
│  - Update UI with new features           │
└──────────────────────────────────────────┘
```

---

## 🏗️ System Architecture

### Express.js Standalone

```
┌────────────────────────────────────────────────────┐
│                                                    │
│  EXPRESS SERVER (express-paystack-server.js)       │
│                                                    │
│  ┌──────────────────────────────────────────┐    │
│  │  API ENDPOINTS                           │    │
│  │  - POST /api/verify-payment              │    │
│  │  - POST /api/initialize-payment          │    │
│  │  - GET  /api/users                       │    │
│  │  - GET  /health                          │    │
│  └───────────┬──────────────────────────────┘    │
│              │                                     │
│  ┌───────────▼──────────────────────────────┐    │
│  │  PAYSTACK SERVICE                        │    │
│  │  - initializePayment()                   │    │
│  │  - verifyPayment()                       │    │
│  │  - Uses axios for HTTP requests          │    │
│  └───────────┬──────────────────────────────┘    │
│              │                                     │
│  ┌───────────▼──────────────────────────────┐    │
│  │  MOCK DATABASE                           │    │
│  │  - In-memory array                       │    │
│  │  - findUserByEmail()                     │    │
│  │  - updateUserStatus()                    │    │
│  └──────────────────────────────────────────┘    │
│                                                    │
└────────────────────────────────────────────────────┘
         │                              ▲
         │ Verify                       │ Response
         ▼                              │
    ┌─────────────────────────────────────┐
    │     PAYSTACK API                    │
    │  https://api.paystack.co            │
    └─────────────────────────────────────┘
```

### NestJS Integrated

```
┌──────────────────────────────────────────────────────┐
│  NESTJS APPLICATION                                  │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │  PaymentsController                        │    │
│  │  - @UseGuards(JwtAuthGuard)                │    │
│  │  - POST /payments/paystack/initialize      │    │
│  │  - GET /payments/paystack/verify           │    │
│  └───────────┬────────────────────────────────┘    │
│              │                                       │
│  ┌───────────▼────────────────────────────────┐    │
│  │  PaymentsService                           │    │
│  │  - initializePaystackPayment()             │    │
│  │  - verifyPaystackPayment()                 │    │
│  │  - updateUserSubscription() [NEW!]         │    │
│  └───────────┬───────┬────────────────────────┘    │
│              │       │                               │
│              │       │                               │
│    ┌─────────▼─┐  ┌──▼──────────────────────┐     │
│    │ Paystack  │  │  UserRepository          │     │
│    │ API       │  │  (TypeORM)               │     │
│    │ (axios)   │  │  - findOne()             │     │
│    └───────────┘  │  - save()                │     │
│                   └──┬───────────────────────┘     │
│                      │                              │
└──────────────────────┼──────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │   PostgreSQL   │
              │   Database     │
              │                │
              │  ┌──────────┐  │
              │  │  users   │  │
              │  │  - id    │  │
              │  │  - email │  │
              │  │  - role  │  │
              │  └──────────┘  │
              └────────────────┘
```

---

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────┐
│  SECURITY LAYERS                                    │
└─────────────────────────────────────────────────────┘

Layer 1: Environment Variables
┌────────────────────────────────────────┐
│  .env file (NEVER commit to Git)       │
│  PAYSTACK_SECRET_KEY=sk_test_xxx       │
│  JWT_SECRET=xxx                        │
└────────────────────────────────────────┘
          │
          │ Loaded at startup
          ▼
Layer 2: Backend Configuration
┌────────────────────────────────────────┐
│  ConfigService (NestJS)                │
│  process.env (Express)                 │
│  - Keys stored in memory only          │
│  - Never sent to frontend              │
└────────────────────────────────────────┘
          │
          │ Used for API calls
          ▼
Layer 3: API Communication
┌────────────────────────────────────────┐
│  HTTPS Connection to Paystack          │
│  Authorization: Bearer sk_test_xxx     │
│  - Encrypted in transit                │
│  - Server-to-server only               │
└────────────────────────────────────────┘
          │
          │ Sanitized response
          ▼
Layer 4: Frontend Response
┌────────────────────────────────────────┐
│  JSON Response (Safe Data Only)        │
│  { success: true, amount: 5000 }       │
│  - No secret keys                      │
│  - No sensitive data                   │
└────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  WHAT FRONTEND SEES                     │
├─────────────────────────────────────────┤
│  ✅ Payment success/failure             │
│  ✅ Transaction amount                  │
│  ✅ Payment reference                   │
│  ✅ Customer email                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  WHAT FRONTEND NEVER SEES               │
├─────────────────────────────────────────┤
│  ❌ Paystack secret key                 │
│  ❌ Database credentials                │
│  ❌ Internal errors                     │
│  ❌ API keys                            │
└─────────────────────────────────────────┘
```

---

## 📊 Data Flow

### Payment Initialization

```
FRONTEND                    BACKEND                     PAYSTACK
   │                           │                           │
   │ { email, amount }         │                           │
   ├──────────────────────────>│                           │
   │                           │ { email, amount }         │
   │                           │ Authorization: SECRET_KEY │
   │                           ├──────────────────────────>│
   │                           │                           │
   │                           │   { authorization_url,    │
   │                           │     reference }           │
   │                           │<──────────────────────────┤
   │                           │                           │
   │ { authorizationUrl,       │                           │
   │   reference }             │                           │
   │<──────────────────────────┤                           │
   │                           │                           │
```

### Payment Verification

```
FRONTEND                    BACKEND                     PAYSTACK                  DATABASE
   │                           │                           │                        │
   │ { reference }             │                           │                        │
   ├──────────────────────────>│                           │                        │
   │                           │ GET /verify/:reference    │                        │
   │                           │ Authorization: SECRET_KEY │                        │
   │                           ├──────────────────────────>│                        │
   │                           │                           │                        │
   │                           │ { status: "success",      │                        │
   │                           │   amount: 5000,           │                        │
   │                           │   metadata: {...} }       │                        │
   │                           │<──────────────────────────┤                        │
   │                           │                           │                        │
   │                           │                           │  UPDATE users          │
   │                           │                           │  SET role='premium'    │
   │                           │                           │  WHERE id='...'        │
   │                           ├───────────────────────────┼───────────────────────>│
   │                           │                           │                        │
   │                           │                           │  { success: true }     │
   │                           │<──────────────────────────┼────────────────────────┤
   │                           │                           │                        │
   │ { success: true,          │                           │                        │
   │   amount: 5000 }          │                           │                        │
   │<──────────────────────────┤                           │                        │
   │                           │                           │                        │
```

---

## 🗂️ Database Schema

### User Table (NestJS)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    
    -- Payment/Subscription Fields
    role VARCHAR(50) DEFAULT 'user',
    -- Possible values: 'user', 'premium', 'pro', 'hot', 'admin'
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Payment Status Mapping

```
┌────────────┬──────────────┬──────────────┐
│  Plan      │  Price (₦)   │  User Role   │
├────────────┼──────────────┼──────────────┤
│  Free      │  0                  │  user        │
│  Premium   │  $20 / 20,000 coins │  premium     │
│  Pro       │  200,000            │  pro         │
│  Hot       │  1,000,000   │  hot         │
└────────────┴──────────────┴──────────────┘
```

### Before Payment
```javascript
{
  id: "uuid-123",
  email: "user@example.com",
  role: "user",  // ← Free user
  created_at: "2026-01-15T10:00:00Z"
}
```

### After Payment
```javascript
{
  id: "uuid-123",
  email: "user@example.com",
  role: "premium",  // ← ✅ Upgraded!
  updated_at: "2026-01-15T10:30:00Z"
}
```

---

## 🎨 Frontend Integration Patterns

### Pattern 1: Direct Redirect

```javascript
// 1. Initialize payment
const { authorizationUrl } = await initializePayment();

// 2. Redirect user to Paystack
window.location.href = authorizationUrl;

// 3. User pays on Paystack

// 4. Paystack redirects back with reference
// URL: https://yoursite.com/callback?reference=xxx

// 5. Extract reference and verify
const urlParams = new URLSearchParams(window.location.search);
const reference = urlParams.get('reference');
await verifyPayment(reference);
```

### Pattern 2: Popup/Inline (Better UX)

```javascript
// 1. Load Paystack inline script
<script src="https://js.paystack.co/v1/inline.js"></script>

// 2. Open payment popup
const handler = PaystackPop.setup({
    key: 'pk_test_xxx',
    email: 'user@example.com',
    amount: 500000,
    callback: function(response) {
        // 3. User paid! Verify immediately
        verifyPayment(response.reference);
    }
});
handler.openIframe();
```

### Pattern 3: Two-Step (Recommended)

```javascript
// Step 1: Backend initialization
const paymentData = await fetch('/api/initialize-payment', {
    method: 'POST',
    body: JSON.stringify({ email, amount })
});

// Step 2: Use Paystack inline with backend reference
const handler = PaystackPop.setup({
    key: 'pk_test_xxx',
    email: email,
    amount: amount * 100,
    ref: paymentData.reference, // ← Use backend reference
    callback: function(response) {
        // Step 3: Verify on backend
        verifyOnBackend(response.reference);
    }
});
```

---

## 🔄 Error Handling Flow

```
┌─────────────────────────────────────┐
│  Payment Verification Request      │
└──────────────┬──────────────────────┘
               │
               ▼
      ┌────────────────────┐
      │ Validate Reference │
      └────────┬───────────┘
               │
         Valid?│
        ┌──────┴──────┐
        │             │
       Yes           No
        │             │
        ▼             ▼
┌───────────────┐   ┌──────────────────┐
│ Call Paystack │   │ Return 400 Error │
│ Verify API    │   │ "Reference       │
└───────┬───────┘   │  required"       │
        │           └──────────────────┘
        │
    Success?
   ┌────┴────┐
   │         │
  Yes       No
   │         │
   ▼         ▼
┌──────────────┐  ┌──────────────────┐
│ Update DB    │  │ Return 400 Error │
│ User -> Pro  │  │ "Payment failed" │
└──────┬───────┘  └──────────────────┘
       │
  DB Success?
   ┌───┴────┐
   │        │
  Yes      No
   │        │
   ▼        ▼
┌────────────┐ ┌──────────────────┐
│ Return 200 │ │ Return 500 Error │
│ {success}  │ │ "DB update fail" │
└────────────┘ └──────────────────┘
```

---

## 📈 Scalability Considerations

### Current Architecture (Good for MVP)

```
┌─────────────────┐
│   Frontend      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────┐
│   Backend       │────>│  Database    │
│   (Single)      │     └──────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Paystack API  │
└─────────────────┘
```

### Production Architecture (Recommended)

```
┌─────────────────┐
│   Frontend      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────┐
│  Load Balancer  │     │   Redis      │
│   (Nginx)       │     │   (Cache)    │
└────────┬────────┘     └──────────────┘
         │                      ▲
         ▼                      │
┌─────────────────┐             │
│  Backend API    │─────────────┘
│  (Multiple      │
│   instances)    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌──────────────┐
│ Primary │ │  Read        │
│ DB      │ │  Replicas    │
└─────────┘ └──────────────┘
    │
    ▼
┌─────────────────┐
│  Paystack API   │
└─────────────────┘
```

---

## 🎯 Implementation Checklist

### Express Server Setup
- [x] Create express-paystack-server.js
- [x] Add payment verification endpoint
- [x] Add payment initialization endpoint
- [x] Add mock database
- [x] Add error handling
- [x] Add CORS support
- [x] Create .env configuration
- [x] Create test page

### NestJS Integration
- [x] Update PaymentsService
- [x] Add database integration (TypeORM)
- [x] Add user role update logic
- [x] Update PaymentsModule
- [x] Add JWT authentication
- [x] Add error handling
- [x] Add logging

### Documentation
- [x] Complete implementation guide
- [x] Frontend integration examples
- [x] Testing instructions
- [x] Troubleshooting guide
- [x] Security best practices
- [x] Visual diagrams

### Testing
- [ ] Test with Paystack test cards
- [ ] Test error scenarios
- [ ] Test database updates
- [ ] Test frontend integration
- [ ] Test CORS
- [ ] Load testing (production)

---

## 🚀 Deployment Checklist

### Before Going Live
- [ ] Replace test keys with live keys
- [ ] Enable HTTPS
- [ ] Configure production database
- [ ] Set up proper logging
- [ ] Add monitoring (e.g., Sentry)
- [ ] Configure rate limiting
- [ ] Set up webhooks (optional)
- [ ] Add email notifications
- [ ] Test in production-like environment
- [ ] Create backup strategy

---

This visual guide provides a complete overview of the payment architecture! 🎉
