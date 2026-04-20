# 🔐 Security Architecture - Visual Guide

## 🚨 Problem: API Key Exposed

```
┌─────────────────────────────────────────┐
│        YOUR CODE (BEFORE)               │
│                                         │
│  const key = "sk_live_45559e5d..."     │  ❌ EXPOSED
│  axios.post(url, data, {               │  ❌ VISIBLE IN GIT
│    headers: { Authorization: key }     │  ❌ ANYONE CAN STEAL
│  });                                    │
└─────────────────────────────────────────┘
```

**Danger:** Anyone with access to your code can use your API key to make unauthorized charges!

---

## ✅ Solution: Secure Backend Architecture

### **3-Layer Security Model**

```
┌──────────────────────────────────────────────────────────────────┐
│                       LAYER 1: FRONTEND                          │
│                     (Browser / Mobile App)                       │
│                                                                  │
│  ⛔ NO API KEYS - NEVER EVER                                    │
│                                                                  │
│  JavaScript Code:                                               │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ fetch('/api/v1/payments/paystack/initialize', {    │       │
│  │   headers: { 'Authorization': 'Bearer JWT_TOKEN' } │       │
│  │ })                                                  │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                  │
│  ✅ Only stores: JWT token (for auth)                          │
│  ✅ Makes: HTTP requests to backend                            │
│  ✅ Receives: Safe URLs and data (no keys)                     │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             │ HTTP Request
                             │ Authorization: Bearer <JWT>
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                       LAYER 2: BACKEND                           │
│                       (NestJS/Node.js)                           │
│                                                                  │
│  ✅ ALL API KEYS HERE ONLY                                      │
│  🔒 Loaded from .env file                                       │
│                                                                  │
│  Payment Service:                                               │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ constructor(private config: ConfigService) {        │       │
│  │   // 🔒 Load from environment variable              │       │
│  │   this.key = config.get('PAYSTACK_SECRET_KEY');    │       │
│  │                                                     │       │
│  │   // Make API call with secret key                 │       │
│  │   axios.post('https://api.paystack.co/...', {      │       │
│  │     headers: { Authorization: `Bearer ${this.key}` }│       │
│  │   })                                                │       │
│  │ }                                                   │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                  │
│  Security Features:                                             │
│  ✅ Validates keys on startup                                   │
│  ✅ Sanitizes errors (removes keys)                             │
│  ✅ Filters responses (strips secrets)                          │
│  ✅ JWT authentication required                                 │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             │ API Request
                             │ Authorization: Bearer sk_live_45559e...
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                     LAYER 3: EXTERNAL API                        │
│                  (Paystack / Stripe / OpenAI)                    │
│                                                                  │
│  ✅ Receives authenticated requests from backend                │
│  ✅ Processes payments securely                                 │
│  ✅ Returns results to backend only                             │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ File Structure Security

### **What Goes Where**

```
ELH backend/
│
├── .env                              🔒 SECRET - NEVER COMMIT
│   ├── PAYSTACK_SECRET_KEY=sk_live_... ← Your actual key here
│   ├── STRIPE_SECRET_KEY=sk_test_...
│   ├── JWT_SECRET=...
│   └── OPENAI_API_KEY=...
│
├── .gitignore                        ✅ SAFE - Commit this
│   └── .env ← Prevents .env from being committed
│
├── .env.example                      ✅ SAFE - Commit this
│   └── PAYSTACK_SECRET_KEY=sk_live_fake_key_for_example
│
└── src/
    ├── modules/
    │   └── payments/
    │       └── payments.service.ts   ✅ SAFE - Uses env vars
    │           ├── this.configService.get('PAYSTACK_SECRET_KEY')
    │           └── ❌ NOT: "sk_live_45559e..."
    │
    └── common/
        ├── filters/
        │   └── secure-exception.filter.ts  🛡️ Sanitizes errors
        └── interceptors/
            └── security.interceptor.ts     🛡️ Filters responses
```

---

## 🔄 Payment Flow (Step-by-Step)

### **Secure Payment Process**

```
┌─────────────┐
│   User      │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. User clicks "Pay Now"
       │
       ↓
┌─────────────────────────────────────────────────────────┐
│  Frontend JavaScript                                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │ const response = await fetch(                    │  │
│  │   'http://backend.com/api/v1/payments/initialize',│  │
│  │   {                                               │  │
│  │     method: 'POST',                               │  │
│  │     headers: {                                    │  │
│  │       'Authorization': `Bearer ${jwtToken}`,     │  │
│  │       'Content-Type': 'application/json'         │  │
│  │     },                                            │  │
│  │     body: JSON.stringify({                       │  │
│  │       plan: 'premium',                           │  │
│  │       email: 'user@example.com'                  │  │
│  │     })                                            │  │
│  │   }                                               │  │
│  │ )                                                 │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ⛔ NO API KEY IN THIS CODE                            │
└────────────────────────┬─────────────────────────────────┘
                         │
                         │ 2. HTTP Request with JWT
                         │
                         ↓
┌───────────────────────────────────────────────────────────┐
│  Backend (payments.controller.ts)                         │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ @Post('paystack/initialize')                       │  │
│  │ @UseGuards(JwtAuthGuard) // 🔒 Verify JWT         │  │
│  │ async initializePayment(@Body() body, @Request() req)│  │
│  │ {                                                  │  │
│  │   // 3. Call payment service                      │  │
│  │   const result = await this.paymentsService       │  │
│  │     .initializePaystackPayment(                   │  │
│  │       body.plan,                                  │  │
│  │       body.email,                                 │  │
│  │       req.user.userId                             │  │
│  │     );                                            │  │
│  │                                                    │  │
│  │   // 5. Return only safe data                    │  │
│  │   return {                                        │  │
│  │     success: true,                                │  │
│  │     authorizationUrl: result.authorizationUrl,   │  │
│  │     reference: result.reference                  │  │
│  │   };                                              │  │
│  │ }                                                  │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────────┬──────────────────────────────────┘
                         │
                         │ 3. Call service method
                         │
                         ↓
┌───────────────────────────────────────────────────────────┐
│  Backend (payments.service.ts)                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ constructor(private config: ConfigService) {       │  │
│  │   // Load key from .env                           │  │
│  │   this.key = config.get('PAYSTACK_SECRET_KEY');  │  │
│  │ }                                                  │  │
│  │                                                    │  │
│  │ async initializePaystackPayment() {               │  │
│  │   // 4. Make API call with secret key            │  │
│  │   const response = await axios.post(              │  │
│  │     'https://api.paystack.co/transaction/initialize',│  │
│  │     { email, amount, ... },                      │  │
│  │     {                                             │  │
│  │       headers: {                                  │  │
│  │         'Authorization': `Bearer ${this.key}`,   │  │
│  │         //           🔒 sk_live_45559e...        │  │
│  │       }                                           │  │
│  │     }                                             │  │
│  │   );                                              │  │
│  │                                                    │  │
│  │   return {                                        │  │
│  │     authorizationUrl: response.data.data.authorization_url,│
│  │     reference: response.data.data.reference      │  │
│  │   };                                              │  │
│  │ }                                                  │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────────┬──────────────────────────────────┘
                         │
                         │ 4. API Request with Secret Key
                         │    Authorization: Bearer sk_live_45559e...
                         │
                         ↓
┌───────────────────────────────────────────────────────────┐
│  Paystack API                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ✅ Validates secret key                            │  │
│  │ ✅ Creates payment session                         │  │
│  │ ✅ Returns authorization URL                       │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────────┬──────────────────────────────────┘
                         │
                         │ 5. Returns safe data
                         │    (authorization_url, reference)
                         │
                         ↓
┌───────────────────────────────────────────────────────────┐
│  Frontend receives response:                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ {                                                  │  │
│  │   "success": true,                                │  │
│  │   "authorizationUrl": "https://paystack.com/...", │  │
│  │   "reference": "ref_123456"                       │  │
│  │ }                                                  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ✅ NO API KEY IN RESPONSE                                │
│                                                            │
│  6. Redirect user to payment page:                        │
│     window.location.href = data.authorizationUrl;         │
└───────────────────────────────────────────────────────────┘
```

---

## 🛡️ Security Layers Explained

### **Layer 1: Git Protection**

```
┌─────────────────────────────────────┐
│  .gitignore                         │
│  ┌───────────────────────────────┐  │
│  │ .env                          │  │ ← Blocks .env from git
│  │ .env.local                    │  │
│  │ .env.production               │  │
│  │ secrets/                      │  │
│  │ *.pem                         │  │
│  │ *.key                         │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘

RESULT: ✅ .env never committed to GitHub
```

### **Layer 2: Environment Variables**

```
┌─────────────────────────────────────┐
│  .env (Not in git)                  │
│  ┌───────────────────────────────┐  │
│  │ PAYSTACK_SECRET_KEY=sk_live_..│  │ ← Actual secret
│  │ STRIPE_SECRET_KEY=sk_test_... │  │
│  │ JWT_SECRET=random_string      │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
          │
          │ Loaded by ConfigService
          ↓
┌─────────────────────────────────────┐
│  Backend Code                       │
│  ┌───────────────────────────────┐  │
│  │ this.key = config.get(        │  │
│  │   'PAYSTACK_SECRET_KEY'       │  │
│  │ )                             │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘

RESULT: ✅ Keys loaded at runtime (not hardcoded)
```

### **Layer 3: Error Sanitization**

```
❌ WITHOUT FILTER:
{
  "error": "Payment failed: Invalid key sk_live_45559e5d..."
}
↓ API KEY EXPOSED

✅ WITH FILTER:
{
  "success": false,
  "message": "Payment processing failed"
}
↓ SAFE - NO KEY EXPOSED
```

### **Layer 4: Response Filtering**

```
❌ WITHOUT INTERCEPTOR:
{
  "user": {
    "id": 123,
    "email": "user@example.com",
    "password": "hashed_password",
    "apiKey": "sk_live_45559e...",
    "secretToken": "xyz123"
  }
}
↓ SECRETS EXPOSED

✅ WITH INTERCEPTOR:
{
  "user": {
    "id": 123,
    "email": "user@example.com"
  }
}
↓ SAFE - SECRETS STRIPPED
```

---

## 🎯 Key Concepts

### **1. Separation of Concerns**

```
Frontend  → 🎨 User Interface, Display Data
            ⛔ NO business logic with secrets

Backend   → 🔒 Business Logic, API Keys
            ✅ ALL sensitive operations
```

### **2. Trust Boundary**

```
┌─────────────────────┐
│  UNTRUSTED ZONE     │
│  (Frontend/Browser) │  ⛔ User can see everything here
│                     │  ⛔ Never store secrets
└─────────────────────┘
          │
          │ HTTP Request
          │
┌─────────────────────┐
│  TRUSTED ZONE       │
│  (Backend/Server)   │  ✅ Secure environment
│                     │  ✅ Store secrets here
└─────────────────────┘
```

### **3. Defense in Depth**

```
Layer 1: .gitignore       → Prevent accidental commits
Layer 2: Environment vars → Separate config from code
Layer 3: Backend-only ops → Keep keys server-side
Layer 4: Error sanitize   → Remove keys from errors
Layer 5: Response filter  → Strip secrets from responses
Layer 6: JWT auth         → Verify user identity
Layer 7: Rate limiting    → Prevent abuse
```

---

## ✅ Security Checklist

```
[✅] .env file created with actual keys
[✅] .gitignore excludes .env
[✅] Backend loads keys from environment
[✅] Frontend makes authenticated requests only
[✅] Error filter sanitizes responses
[✅] Security interceptor strips secrets
[✅] No hardcoded keys in source code
[✅] JWT authentication required
[✅] Payment operations server-side only
[✅] Documentation provided
```

---

## 🚀 Your Backend is Now Secure!

```
┌──────────────────────────────────────┐
│                                      │
│     ✅ API KEYS SECURED              │
│     🔒 ENVIRONMENT VARIABLES         │
│     🛡️ ERROR SANITIZATION           │
│     🔐 RESPONSE FILTERING            │
│     ⛔ FRONTEND PROTECTED            │
│                                      │
│   YOUR BACKEND IS PRODUCTION-READY   │
│                                      │
└──────────────────────────────────────┘
```

**Read the complete guide:** [SECURITY_IMPLEMENTATION.md](SECURITY_IMPLEMENTATION.md)
