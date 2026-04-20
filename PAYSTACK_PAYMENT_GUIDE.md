# Paystack Payment Integration - Complete Guide

This guide covers both the **Express.js standalone server** and the **NestJS integrated payment system** for handling Paystack card payments.

---

## 📋 Table of Contents

1. [Express.js Standalone Server (Beginner-Friendly)](#express-standalone)
2. [NestJS Integrated Payment System (Production-Ready)](#nestjs-integrated)
3. [Frontend Integration Examples](#frontend-integration)
4. [Testing Your Implementation](#testing)
5. [Common Issues & Solutions](#troubleshooting)

---

## 🚀 Express.js Standalone Server {#express-standalone}

### What It Does

A simple Node.js + Express server that:
- ✅ Receives payment reference from your frontend
- ✅ Verifies payment with Paystack
- ✅ Updates user status in a mock database
- ✅ Returns JSON response to frontend

### Setup Instructions

#### Step 1: Install Dependencies

```bash
npm install express axios dotenv
```

#### Step 2: Create Environment File

Create a `.env` file in your project root:

```env
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
PORT=3000
```

> 🔑 **Get Your Secret Key**: Visit [Paystack Dashboard](https://dashboard.paystack.com/#/settings/developer)

#### Step 3: Run the Server

```bash
node express-paystack-server.js
```

You should see:

```
============================================================
🚀 PAYSTACK PAYMENT SERVER STARTED
============================================================
📡 Server running on: http://localhost:3000
🏥 Health check: http://localhost:3000/health
💳 Verify payment: POST http://localhost:3000/api/verify-payment
👥 View users: GET http://localhost:3000/api/users
============================================================
```

---

### API Endpoints

#### 1. Health Check

**Request:**
```http
GET http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "message": "Paystack Payment Server is running",
  "timestamp": "2026-01-15T10:30:00.000Z"
}
```

---

#### 2. Initialize Payment

**Request:**
```http
POST http://localhost:3000/api/initialize-payment
Content-Type: application/json

{
  "email": "customer@example.com",
  "amount": 5000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment initialized successfully",
  "data": {
    "authorizationUrl": "https://checkout.paystack.com/abc123xyz",
    "reference": "ref_abc123xyz",
    "accessCode": "abc123xyz"
  }
}
```

---

#### 3. Verify Payment (Main Endpoint)

**Request:**
```http
POST http://localhost:3000/api/verify-payment
Content-Type: application/json

{
  "reference": "ref_abc123xyz"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "reference": "ref_abc123xyz",
    "amount": 5000,
    "currency": "NGN",
    "customerEmail": "customer@example.com",
    "paidAt": "2026-01-15T10:30:00.000Z",
    "channel": "card"
  }
}
```

**Failure Response:**
```json
{
  "success": false,
  "message": "Payment verification failed"
}
```

---

#### 4. View Mock Database

**Request:**
```http
GET http://localhost:3000/api/users
```

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "email": "user1@example.com",
      "status": "premium",
      "paidAmount": 5000
    },
    {
      "id": 2,
      "email": "user2@example.com",
      "status": "free",
      "paidAmount": 0
    }
  ]
}
```

---

### Code Walkthrough

#### How Payment Verification Works

```javascript
// 1. Receive payment reference from frontend
const { reference } = req.body;

// 2. Verify with Paystack using secret key
const paystackResponse = await axios.get(
  `https://api.paystack.co/transaction/verify/${reference}`,
  {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
    }
  }
);

// 3. Check if payment was successful
if (paystackResponse.data.data.status === 'success') {
  const customerEmail = paystackResponse.data.customer.email;
  const amountPaid = paystackResponse.data.amount / 100; // Convert from kobo
  
  // 4. Update user status in database
  updateUserStatus(customerEmail, amountPaid);
  
  // 5. Send success response
  return res.json({ success: true, ... });
}
```

---

## 🏗️ NestJS Integrated Payment System {#nestjs-integrated}

### What It Does

A production-ready payment system integrated with your existing NestJS backend:
- ✅ JWT-protected endpoints
- ✅ Real database integration (PostgreSQL/TypeORM)
- ✅ Automatic user role updates (FREE → PREMIUM → PRO → HOT)
- ✅ Both Stripe and Paystack support
- ✅ Comprehensive error handling
- ✅ Security best practices

### Setup Instructions

#### Step 1: Configure Environment Variables

Ensure your `.env` file has:

```env
# Paystack
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=elh_ads_platform

# JWT (for authentication)
JWT_SECRET=your-jwt-secret
JWT_EXPIRATION=7d

# Frontend URL
FRONTEND_URL=http://localhost:4200
```

#### Step 2: Install Dependencies

```bash
npm install axios stripe @nestjs/typeorm typeorm pg
```

#### Step 3: Run Migrations (if needed)

```bash
npm run migration:run
```

#### Step 4: Start Your NestJS Server

```bash
npm run start:dev
```

---

### API Endpoints

#### 1. Initialize Paystack Payment

**Request:**
```http
POST http://localhost:3000/api/v1/payments/paystack/initialize
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "plan": "premium",
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "authorizationUrl": "https://checkout.paystack.com/abc123xyz",
  "reference": "ref_abc123xyz",
  "message": "Redirect user to authorization URL"
}
```

**Plans Available:**
- `premium` - $20 or 20,000 coins
- `pro` - ₦200,000
- `hot` - ₦1,000,000

---

#### 2. Verify Paystack Payment

**Request:**
```http
GET http://localhost:3000/api/v1/payments/paystack/verify?reference=ref_abc123xyz
Authorization: Bearer YOUR_JWT_TOKEN
```

**Success Response:**
```json
{
  "success": true,
  "amount": 20000,
  "metadata": {
    "userId": "uuid-123",
    "plan": "premium"
  }
}
```

**What Happens:**
1. ✅ Payment verified with Paystack
2. ✅ User role automatically upgraded in database
3. ✅ User gets access to premium features

---

### Database Integration

The payment verification automatically updates the user's role:

```typescript
// Before payment
{
  id: "uuid-123",
  email: "user@example.com",
  role: "user",  // Free user
  ...
}

// After successful payment verification
{
  id: "uuid-123",
  email: "user@example.com",
  role: "premium",  // ✅ Upgraded!
  ...
}
```

**User Roles:**
- `user` - Free tier
- `premium` - $20 or 20,000 coins plan
- `pro` - ₦200,000 plan
- `hot` - ₦1,000,000 plan
- `admin` - System administrator

---

### Code Architecture

```
src/modules/payments/
├── payments.controller.ts    # API endpoints
├── payments.service.ts       # Business logic + Paystack integration
└── payments.module.ts        # Module configuration
```

**Key Features:**

1. **Automatic User Upgrade:**
```typescript
async verifyPaystackPayment(reference: string) {
  // Verify with Paystack
  const response = await axios.get(`/transaction/verify/${reference}`);
  
  if (response.data.data.status === 'success') {
    // Extract user info from payment metadata
    const userId = response.data.data.metadata.userId;
    const plan = response.data.data.metadata.plan;
    
    // Update user role in database
    await this.updateUserSubscription(userId, plan);
  }
}
```

2. **Secure Secret Key Management:**
```typescript
// ✅ Keys loaded from environment variables only
this.paystackSecretKey = this.configService.get('PAYSTACK_SECRET_KEY');

// ❌ Never hardcode keys in code
// const key = 'sk_test_abc123'; // DON'T DO THIS!
```

---

## 🌐 Frontend Integration Examples {#frontend-integration}

### Example 1: React/JavaScript

```javascript
// Step 1: Initialize payment
async function initializePayment() {
  const response = await fetch('http://localhost:3000/api/initialize-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'user@example.com',
      amount: 5000
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Redirect user to Paystack payment page
    window.location.href = data.data.authorizationUrl;
  }
}

// Step 2: Verify payment (after user completes payment)
async function verifyPayment(reference) {
  const response = await fetch('http://localhost:3000/api/verify-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reference })
  });
  
  const data = await response.json();
  
  if (data.success) {
    alert('Payment successful! You are now a premium user.');
    // Update UI, redirect to dashboard, etc.
  } else {
    alert('Payment verification failed.');
  }
}
```

---

### Example 2: Using Paystack Inline (Popup)

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://js.paystack.co/v1/inline.js"></script>
</head>
<body>
  <button onclick="payWithPaystack()">Pay ₦5,000</button>

  <script>
    function payWithPaystack() {
      const handler = PaystackPop.setup({
        key: 'pk_test_your_public_key_here', // Use PUBLIC key for frontend
        email: 'user@example.com',
        amount: 500000, // Amount in kobo (₦5,000)
        currency: 'NGN',
        ref: 'ref_' + Math.floor(Math.random() * 1000000000),
        
        callback: function(response) {
          // Payment successful, verify on backend
          verifyPayment(response.reference);
        },
        
        onClose: function() {
          alert('Payment window closed');
        }
      });
      
      handler.openIframe();
    }

    async function verifyPayment(reference) {
      const response = await fetch('http://localhost:3000/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('✅ Payment verified! Welcome to Premium!');
        window.location.href = '/dashboard';
      }
    }
  </script>
</body>
</html>
```

---

### Example 3: Angular/NestJS Integration

```typescript
// Angular Service
@Injectable()
export class PaymentService {
  private apiUrl = 'http://localhost:3000/api/v1';

  constructor(private http: HttpClient) {}

  initializePayment(plan: string, email: string) {
    const token = localStorage.getItem('jwt_token');
    
    return this.http.post(
      `${this.apiUrl}/payments/paystack/initialize`,
      { plan, email },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
  }

  verifyPayment(reference: string) {
    const token = localStorage.getItem('jwt_token');
    
    return this.http.get(
      `${this.apiUrl}/payments/paystack/verify?reference=${reference}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
  }
}

// Angular Component
export class SubscriptionComponent {
  constructor(private paymentService: PaymentService) {}

  subscribeToPremium() {
    this.paymentService
      .initializePayment('premium', 'user@example.com')
      .subscribe(response => {
        if (response.success) {
          // Redirect to Paystack
          window.location.href = response.authorizationUrl;
        }
      });
  }

  // Call this on payment callback page
  verifyPayment(reference: string) {
    this.paymentService
      .verifyPayment(reference)
      .subscribe(response => {
        if (response.success) {
          alert('You are now a Premium member!');
          this.router.navigate(['/dashboard']);
        }
      });
  }
}
```

---

## 🧪 Testing Your Implementation {#testing}

### Test with Paystack Test Cards

Use these test card details on Paystack's test environment:

**Successful Payment:**
- Card Number: `5531886652142950`
- Expiry: `09/32`
- CVV: `564`

**Failed Payment:**
- Card Number: `5060666666666666666`
- Expiry: `09/32`
- CVV: `123`

---

### Testing the Express Server

#### 1. Test Health Check

```bash
curl http://localhost:3000/health
```

#### 2. Initialize a Test Payment

```bash
curl -X POST http://localhost:3000/api/initialize-payment \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "amount": 5000
  }'
```

#### 3. Verify a Payment

```bash
curl -X POST http://localhost:3000/api/verify-payment \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "ref_abc123xyz"
  }'
```

#### 4. Check Mock Database

```bash
curl http://localhost:3000/api/users
```

---

### Testing the NestJS Server

#### 1. Get JWT Token

First, log in to get your JWT token:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword"
  }'
```

#### 2. Initialize Payment

```bash
curl -X POST http://localhost:3000/api/v1/payments/paystack/initialize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "plan": "premium",
    "email": "your@email.com"
  }'
```

#### 3. Verify Payment

```bash
curl -X GET "http://localhost:3000/api/v1/payments/paystack/verify?reference=ref_abc123xyz" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔧 Common Issues & Solutions {#troubleshooting}

### Issue 1: "PAYSTACK_SECRET_KEY not configured"

**Problem:** Server can't find your Paystack secret key.

**Solution:**
1. Create a `.env` file in your project root
2. Add: `PAYSTACK_SECRET_KEY=sk_test_your_key_here`
3. Make sure to load dotenv: `require('dotenv').config()`

---

### Issue 2: CORS Error on Frontend

**Problem:** Browser blocks requests from frontend to backend.

**Solution (Express):**
```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:4200'); // Your frontend URL
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  next();
});
```

**Solution (NestJS):**
```typescript
// main.ts
app.enableCors({
  origin: 'http://localhost:4200',
  credentials: true
});
```

---

### Issue 3: "Payment verification failed"

**Possible Causes:**
1. ❌ Invalid payment reference
2. ❌ Wrong secret key (using test key in production or vice versa)
3. ❌ Payment not completed by user

**Solution:**
- Check the payment reference is correct
- Verify you're using the right secret key for your environment
- Make sure user actually completed the payment

---

### Issue 4: Database Not Updating (NestJS)

**Problem:** Payment verifies but user role doesn't change.

**Check:**
1. Is TypeORM configured correctly?
2. Is the User entity imported in PaymentsModule?
3. Check logs for database errors

**Solution:**
```bash
# Check NestJS logs
npm run start:dev

# Look for: "✅ User uuid-123 upgraded to premium plan"
```

---

### Issue 5: Test Mode vs Live Mode

**Remember:**
- **Test Mode:** Use `sk_test_...` secret key and `pk_test_...` public key
- **Live Mode:** Use `sk_live_...` secret key and `pk_live_...` public key

**Never mix test and live keys!**

---

## 🔒 Security Best Practices

### ✅ DO:
- Store secret keys in environment variables
- Use HTTPS in production
- Validate all input data
- Log payment transactions
- Use JWT authentication (NestJS)
- Sanitize error messages

### ❌ DON'T:
- Hardcode secret keys in code
- Expose secret keys to frontend
- Trust client-side payment verification
- Skip server-side verification
- Commit `.env` files to Git

---

## 📚 Additional Resources

- [Paystack Documentation](https://paystack.com/docs)
- [Paystack API Reference](https://paystack.com/docs/api/)
- [Test Cards](https://paystack.com/docs/payments/test-payments/)
- [Webhooks Guide](https://paystack.com/docs/payments/webhooks/)

---

## 🎉 Summary

You now have two payment solutions:

1. **Express Server** - Simple, beginner-friendly, standalone
2. **NestJS Integration** - Production-ready, database-integrated

Both handle:
- ✅ Payment initialization
- ✅ Payment verification with Paystack
- ✅ User status updates
- ✅ Secure API key management
- ✅ Error handling

Choose the one that fits your needs! 🚀
