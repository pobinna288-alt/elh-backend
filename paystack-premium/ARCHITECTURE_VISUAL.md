# Paystack Premium Backend - Visual Architecture

## 🔄 Complete Payment Flow

```
┌─────────────────┐
│   FRONTEND      │
│   (Your App)    │
└────────┬────────┘
         │ 1. User clicks "Subscribe to Premium"
         │
         ▼
┌─────────────────────────────────────────────┐
│  Initialize Payment                         │
│  POST /api/payments/initialize              │
│  Body: { email, amount, userId, plan }      │
└────────┬────────────────────────────────────┘
         │ 2. Backend creates payment
         ▼
┌─────────────────────────────────────────────┐
│  YOUR BACKEND (Express)                     │
│  payment.controller.js                      │
│  └─> paystack.service.js                    │
│      └─> POST to Paystack API               │
└────────┬────────────────────────────────────┘
         │ 3. Get authorization URL
         ▼
┌─────────────────────────────────────────────┐
│  PAYSTACK API                               │
│  POST /transaction/initialize               │
│  Returns: { authorization_url, reference }  │
└────────┬────────────────────────────────────┘
         │ 4. Return URL to frontend
         ▼
┌─────────────────────────────────────────────┐
│  FRONTEND                                   │
│  Redirect user to Paystack payment page     │
│  window.location = authorization_url        │
└────────┬────────────────────────────────────┘
         │ 5. User enters card details & pays
         ▼
┌─────────────────────────────────────────────┐
│  PAYSTACK CHECKOUT PAGE                     │
│  - User enters: 5531886652142950            │
│  - User enters CVV: 564                     │
│  - User clicks "Pay ₦5,000"                 │
└────────┬────────────────────────────────────┘
         │ 6. Payment processed
         ▼
┌─────────────────────────────────────────────┐
│  PAYSTACK                                   │
│  - Charge card                              │
│  - Generate unique reference               │
│  - Redirect back to your app               │
└────────┬────────────────────────────────────┘
         │ 7. Redirect with reference
         ▼
┌─────────────────────────────────────────────┐
│  FRONTEND (Callback Page)                   │
│  - Extract reference from URL               │
│  - Call verify endpoint                     │
└────────┬────────────────────────────────────┘
         │ 8. Verify Payment
         │    POST /api/payments/verify
         │    { reference, userId }
         ▼
┌─────────────────────────────────────────────┐
│  YOUR BACKEND                               │
│  payment.controller.js                      │
│  1. Validate input                          │
│  2. Call paystack.service.verifyPayment()   │
└────────┬────────────────────────────────────┘
         │ 9. Verify with Paystack
         ▼
┌─────────────────────────────────────────────┐
│  PAYSTACK API                               │
│  GET /transaction/verify/:reference         │
│  Returns: { status: "success", amount, ... }│
└────────┬────────────────────────────────────┘
         │ 10. Payment verified!
         ▼
┌─────────────────────────────────────────────┐
│  YOUR BACKEND                               │
│  database.service.js                        │
│  updateUserPremiumStatus()                  │
│  - Set isPremium = true                     │
│  - Set premiumExpiry = +1 month             │
│  - Add to payment history                   │
└────────┬────────────────────────────────────┘
         │ 11. User updated
         ▼
┌─────────────────────────────────────────────┐
│  DATABASE (Mock or MongoDB)                 │
│  User document updated:                     │
│  {                                          │
│    isPremium: true,                         │
│    premiumExpiry: "2026-02-15",             │
│    totalPaid: 5000                          │
│  }                                          │
└────────┬────────────────────────────────────┘
         │ 12. Return success
         ▼
┌─────────────────────────────────────────────┐
│  FRONTEND                                   │
│  Receives: { success: true, data: {...} }   │
│  - Show success message                     │
│  - Redirect to premium dashboard            │
│  - Update UI (unlock premium features)      │
└─────────────────────────────────────────────┘
```

---

## 🏗️ Backend Architecture

```
┌───────────────────────────────────────────────────────┐
│  EXPRESS APPLICATION (server.js)                      │
├───────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  MIDDLEWARE LAYER                           │    │
│  │  - helmet (security headers)                │    │
│  │  - cors (cross-origin)                      │    │
│  │  - express.json() (body parser)             │    │
│  │  - morgan (logging)                         │    │
│  └─────────────────────────────────────────────┘    │
│                       ↓                               │
│  ┌─────────────────────────────────────────────┐    │
│  │  ROUTES (payment.routes.js)                 │    │
│  │  POST   /api/payments/verify                │    │
│  │  POST   /api/payments/initialize            │    │
│  │  GET    /api/payments/user/:userId          │    │
│  └─────────────────────┬───────────────────────┘    │
│                        ↓                              │
│  ┌─────────────────────────────────────────────┐    │
│  │  CONTROLLER (payment.controller.js)         │    │
│  │  - verifyPayment()                          │    │
│  │  - initializePayment()                      │    │
│  │  - getUserStatus()                          │    │
│  └─────────────┬───────────────┬───────────────┘    │
│                │               │                      │
│       ┌────────▼─────┐  ┌──────▼──────────┐         │
│       │  PAYSTACK    │  │  DATABASE       │         │
│       │  SERVICE     │  │  SERVICE        │         │
│       │              │  │                 │         │
│       │ - initialize │  │ - findUser      │         │
│       │ - verify     │  │ - updateUser    │         │
│       └────────┬─────┘  └──────┬──────────┘         │
│                │               │                      │
└────────────────┼───────────────┼──────────────────────┘
                 │               │
         ┌───────▼─────┐  ┌──────▼──────────┐
         │  PAYSTACK   │  │  DATABASE       │
         │  API        │  │  (Mock/MongoDB) │
         │  (External) │  │                 │
         └─────────────┘  └─────────────────┘
```

---

## 📂 File Relationships

```
server.js
    │
    ├── imports ───> config/config.js
    │                   └── loads .env variables
    │
    ├── imports ───> routes/payment.routes.js
    │                   │
    │                   └── uses ───> controllers/payment.controller.js
    │                                      │
    │                                      ├── uses ───> services/paystack.service.js
    │                                      │                 └── calls Paystack API
    │                                      │
    │                                      └── uses ───> services/database.service.js
    │                                                        └── updates database
    │
    └── starts Express server on port 3000
```

---

## 🔐 Security Flow

```
┌─────────────────────────────────────────────┐
│  Layer 1: Environment Variables             │
│  .env file (not committed to git)           │
│  PAYSTACK_SECRET_KEY=sk_test_xxx            │
└────────────────┬────────────────────────────┘
                 │ Loaded at startup
                 ▼
┌─────────────────────────────────────────────┐
│  Layer 2: Configuration Validation          │
│  config/config.js                           │
│  - Checks key exists                        │
│  - Validates format (starts with sk_)       │
│  - Throws error if invalid                  │
└────────────────┬────────────────────────────┘
                 │ Used by services
                 ▼
┌─────────────────────────────────────────────┐
│  Layer 3: Service Layer                     │
│  services/paystack.service.js               │
│  - Uses key in Authorization header         │
│  - Never logs or exposes key                │
│  - HTTPS communication only                 │
└────────────────┬────────────────────────────┘
                 │ Sanitized response
                 ▼
┌─────────────────────────────────────────────┐
│  Layer 4: Controller Layer                  │
│  controllers/payment.controller.js          │
│  - Catches errors                           │
│  - Sanitizes responses                      │
│  - No sensitive data in errors              │
└────────────────┬────────────────────────────┘
                 │ Safe JSON
                 ▼
┌─────────────────────────────────────────────┐
│  Layer 5: Frontend Response                 │
│  { success: true, data: {...} }             │
│  - No API keys                              │
│  - No internal errors                       │
│  - Only necessary data                      │
└─────────────────────────────────────────────┘
```

---

## 💾 Database Operations Flow

```
┌─────────────────────────────────────┐
│  Request: Verify Payment            │
│  { reference, userId }              │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  Step 1: Find User                  │
│  database.service.findUserById()    │
│                                     │
│  Mock DB: Array search              │
│  MongoDB: collection.findOne()      │
└────────────────┬────────────────────┘
                 │ User found
                 ▼
┌─────────────────────────────────────┐
│  Step 2: Verify Payment             │
│  paystack.service.verifyPayment()   │
│  └─> Call Paystack API              │
└────────────────┬────────────────────┘
                 │ Payment successful
                 ▼
┌─────────────────────────────────────┐
│  Step 3: Update User                │
│  database.service.updateUser()      │
│                                     │
│  Updates:                           │
│  - isPremium = true                 │
│  - premiumExpiry = Date + 1 month   │
│  - totalPaid += amount              │
│  - paymentHistory.push(payment)     │
│  - updatedAt = now                  │
└────────────────┬────────────────────┘
                 │ User updated
                 ▼
┌─────────────────────────────────────┐
│  Return Updated User                │
│  {                                  │
│    id, email, name,                 │
│    isPremium: true,                 │
│    premiumExpiry: "2026-02-15",     │
│    totalPaid: 5000                  │
│  }                                  │
└─────────────────────────────────────┘
```

---

## 🎨 Request/Response Flow

### Successful Payment Verification

```
CLIENT REQUEST
↓
POST /api/payments/verify
{
  "reference": "ref_abc123xyz",
  "userId": "user_001"
}
↓
VALIDATION
├─ reference exists? ✓
├─ userId exists? ✓
└─ valid format? ✓
↓
PAYSTACK VERIFICATION
├─ GET /transaction/verify/ref_abc123xyz
├─ Authorization: Bearer sk_test_xxx
└─ Response: { status: "success", amount: 5000 }
↓
DATABASE UPDATE
├─ Find user: user_001
├─ Update isPremium: true
├─ Set expiry: +1 month
└─ Add to history
↓
SERVER RESPONSE
↓
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "userId": "user_001",
    "isPremium": true,
    "amount": 5000,
    "reference": "ref_abc123xyz"
  }
}
```

### Failed Payment Verification

```
CLIENT REQUEST
↓
POST /api/payments/verify
{
  "reference": "invalid_ref",
  "userId": "user_001"
}
↓
VALIDATION
├─ reference exists? ✓
├─ userId exists? ✓
└─ valid format? ✓
↓
PAYSTACK VERIFICATION
├─ GET /transaction/verify/invalid_ref
├─ Authorization: Bearer sk_test_xxx
└─ Response: 404 Not Found
↓
ERROR HANDLING
├─ Catch error
├─ Log error message
└─ Sanitize response
↓
SERVER RESPONSE
↓
{
  "success": false,
  "message": "Payment reference not found"
}
```

---

## 📊 Data Flow Diagram

```
┌──────────┐      ┌──────────┐      ┌──────────┐
│ Frontend │─────>│ Backend  │─────>│ Paystack │
│          │      │          │      │   API    │
│          │<─────│          │<─────│          │
└──────────┘      └────┬─────┘      └──────────┘
                       │
                       ▼
                  ┌──────────┐
                  │ Database │
                  │          │
                  └──────────┘

DATA FLOW:
1. Frontend → Backend: { reference, userId }
2. Backend → Paystack: Verify transaction
3. Paystack → Backend: { status: "success" }
4. Backend → Database: Update user premium
5. Database → Backend: Updated user data
6. Backend → Frontend: { success: true }
```

---

## 🎯 Module Dependencies

```
server.js
    │
    ├─── requires ───> express
    ├─── requires ───> cors
    ├─── requires ───> helmet
    ├─── requires ───> morgan
    ├─── requires ───> dotenv
    │
    ├─── requires ───> config/config.js
    │                       │
    │                       └─── requires ───> dotenv
    │
    └─── requires ───> routes/payment.routes.js
                            │
                            └─── requires ───> controllers/payment.controller.js
                                                    │
                                                    ├─── requires ───> services/paystack.service.js
                                                    │                       │
                                                    │                       ├─── requires ───> axios
                                                    │                       └─── requires ───> config
                                                    │
                                                    └─── requires ───> services/database.service.js
                                                                            │
                                                                            ├─── requires ───> config
                                                                            └─── requires ───> mongodb (optional)
```

---

**This visual guide shows exactly how everything connects!** 🎨
