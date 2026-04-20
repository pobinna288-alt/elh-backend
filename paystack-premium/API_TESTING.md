# 🧪 API TESTING & EXAMPLES

Complete guide to testing your Paystack payment backend.

---

## 📋 Table of Contents

1. [Quick Health Check](#quick-health-check)
2. [Testing Payment Flow](#testing-payment-flow)
3. [Frontend Integration Examples](#frontend-integration)
4. [Testing with Postman](#testing-with-postman)
5. [Test Scenarios](#test-scenarios)

---

## 🏥 Quick Health Check

### Check if server is running

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Paystack Premium Payment Server is running",
  "timestamp": "2026-01-15T10:00:00.000Z",
  "environment": "development"
}
```

---

## 💳 Testing Payment Flow

### Complete Payment Flow Test

#### Step 1: View Available Users

```bash
curl http://localhost:3000/api/payments/users
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "user_001",
      "email": "user1@example.com",
      "name": "John Doe",
      "isPremium": false,
      "totalPaid": 0
    }
  ]
}
```

#### Step 2: Check User Status (Before Payment)

```bash
curl http://localhost:3000/api/payments/user/user_001
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user_001",
    "email": "user1@example.com",
    "isPremium": false,
    "premiumExpiry": null,
    "totalPaid": 0,
    "paymentHistory": []
  }
}
```

#### Step 3: Initialize Payment

```bash
curl -X POST http://localhost:3000/api/payments/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@example.com",
    "amount": 5000,
    "userId": "user_001",
    "plan": "premium"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Payment initialized successfully",
  "data": {
    "authorizationUrl": "https://checkout.paystack.com/...",
    "reference": "ref_abc123xyz",
    "accessCode": "abc123xyz"
  }
}
```

**Action:** Copy the `reference` from the response for next step.

#### Step 4: Verify Payment (After User Pays)

```bash
curl -X POST http://localhost:3000/api/payments/verify \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "ref_abc123xyz",
    "userId": "user_001"
  }'
```

**Success Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully. User upgraded to premium!",
  "data": {
    "userId": "user_001",
    "email": "user1@example.com",
    "isPremium": true,
    "premiumExpiry": "2026-02-15T10:00:00.000Z",
    "amount": 5000,
    "reference": "ref_abc123xyz"
  }
}
```

#### Step 5: Check User Status (After Payment)

```bash
curl http://localhost:3000/api/payments/user/user_001
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user_001",
    "isPremium": true,
    "premiumExpiry": "2026-02-15T10:00:00.000Z",
    "totalPaid": 5000,
    "paymentHistory": [
      {
        "reference": "ref_abc123xyz",
        "amount": 5000,
        "plan": "premium",
        "date": "2026-01-15T10:00:00.000Z",
        "status": "completed"
      }
    ]
  }
}
```

---

## 🌐 Frontend Integration Examples

### Example 1: Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <title>Paystack Payment Test</title>
</head>
<body>
  <h1>Subscribe to Premium</h1>
  <button onclick="subscribeToPremium()">Pay ₦5,000</button>

  <script>
    const API_URL = 'http://localhost:3000/api/payments';
    const USER_ID = 'user_001';
    const USER_EMAIL = 'user1@example.com';

    async function subscribeToPremium() {
      try {
        // Step 1: Initialize payment on backend
        const initResponse = await fetch(`${API_URL}/initialize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: USER_EMAIL,
            amount: 5000,
            userId: USER_ID,
            plan: 'premium'
          })
        });

        const initData = await initResponse.json();

        if (!initData.success) {
          alert('Failed to initialize payment');
          return;
        }

        // Step 2: Redirect to Paystack payment page
        window.location.href = initData.data.authorizationUrl;

        // Or use the reference with Paystack inline popup:
        // payWithPaystackPopup(initData.data.reference);

      } catch (error) {
        console.error('Error:', error);
        alert('Payment initialization failed');
      }
    }

    // This function should be called on your callback page
    async function verifyPaymentOnCallback() {
      // Get reference from URL
      const urlParams = new URLSearchParams(window.location.search);
      const reference = urlParams.get('reference');

      if (!reference) {
        alert('No payment reference found');
        return;
      }

      try {
        // Verify payment on backend
        const verifyResponse = await fetch(`${API_URL}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: reference,
            userId: USER_ID
          })
        });

        const verifyData = await verifyResponse.json();

        if (verifyData.success) {
          alert('✅ Payment successful! You are now a premium member.');
          window.location.href = '/dashboard';
        } else {
          alert('❌ Payment verification failed');
        }

      } catch (error) {
        console.error('Error:', error);
        alert('Payment verification failed');
      }
    }
  </script>
</body>
</html>
```

---

### Example 2: Using Paystack Inline Popup

```html
<!DOCTYPE html>
<html>
<head>
  <title>Paystack Payment - Inline</title>
  <script src="https://js.paystack.co/v1/inline.js"></script>
</head>
<body>
  <h1>Subscribe to Premium</h1>
  <button onclick="payWithPaystack()">Pay ₦5,000</button>

  <script>
    const API_URL = 'http://localhost:3000/api/payments';
    const USER_ID = 'user_001';
    const USER_EMAIL = 'user1@example.com';
    const PAYSTACK_PUBLIC_KEY = 'pk_test_your_public_key_here';

    async function payWithPaystack() {
      try {
        // Initialize payment on backend
        const response = await fetch(`${API_URL}/initialize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: USER_EMAIL,
            amount: 5000,
            userId: USER_ID,
            plan: 'premium'
          })
        });

        const data = await response.json();

        if (!data.success) {
          alert('Failed to initialize payment');
          return;
        }

        // Open Paystack inline popup
        const handler = PaystackPop.setup({
          key: PAYSTACK_PUBLIC_KEY,
          email: USER_EMAIL,
          amount: 500000, // Amount in kobo (5000 * 100)
          currency: 'NGN',
          ref: data.data.reference, // Use reference from backend
          
          callback: function(response) {
            console.log('Payment successful:', response);
            // Verify payment on backend
            verifyPayment(response.reference);
          },
          
          onClose: function() {
            alert('Payment window closed');
          }
        });

        handler.openIframe();

      } catch (error) {
        console.error('Error:', error);
        alert('Payment failed');
      }
    }

    async function verifyPayment(reference) {
      try {
        const response = await fetch(`${API_URL}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: reference,
            userId: USER_ID
          })
        });

        const data = await response.json();

        if (data.success) {
          alert('✅ Payment verified! Welcome to Premium!');
          window.location.href = '/dashboard';
        } else {
          alert('❌ Payment verification failed');
        }

      } catch (error) {
        console.error('Verification error:', error);
        alert('Payment verification failed');
      }
    }
  </script>
</body>
</html>
```

---

### Example 3: React Component

```jsx
import React, { useState } from 'react';

const PaymentComponent = () => {
  const [loading, setLoading] = useState(false);
  const API_URL = 'http://localhost:3000/api/payments';

  const initializePayment = async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          amount: 5000,
          userId: 'user_001',
          plan: 'premium'
        })
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to Paystack
        window.location.href = data.data.authorizationUrl;
      } else {
        alert('Payment initialization failed');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (reference) => {
    try {
      const response = await fetch(`${API_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: reference,
          userId: 'user_001'
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Payment successful!');
        // Update UI or redirect
      } else {
        alert('Payment verification failed');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      <h2>Premium Subscription</h2>
      <p>₦5,000 / month</p>
      <button 
        onClick={initializePayment} 
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Subscribe Now'}
      </button>
    </div>
  );
};

export default PaymentComponent;
```

---

## 📮 Testing with Postman

### Import Collection

Create a new Postman collection with these requests:

#### 1. Health Check
- **Method:** GET
- **URL:** `http://localhost:3000/health`

#### 2. Get All Users
- **Method:** GET
- **URL:** `http://localhost:3000/api/payments/users`

#### 3. Get User Status
- **Method:** GET
- **URL:** `http://localhost:3000/api/payments/user/user_001`

#### 4. Initialize Payment
- **Method:** POST
- **URL:** `http://localhost:3000/api/payments/initialize`
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
  ```json
  {
    "email": "user1@example.com",
    "amount": 5000,
    "userId": "user_001",
    "plan": "premium"
  }
  ```

#### 5. Verify Payment
- **Method:** POST
- **URL:** `http://localhost:3000/api/payments/verify`
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
  ```json
  {
    "reference": "ref_from_paystack",
    "userId": "user_001"
  }
  ```

---

## 🎯 Test Scenarios

### Scenario 1: Successful Payment Flow

1. Initialize payment
2. User pays on Paystack (use test card: 5531886652142950)
3. Paystack redirects back with reference
4. Verify payment on backend
5. User upgraded to premium

**Expected Result:** ✅ User status changes to premium

---

### Scenario 2: Failed Payment

1. Initialize payment
2. User cancels payment or payment fails
3. Try to verify with invalid reference
4. Backend returns error

**Expected Result:** ❌ User remains non-premium

---

### Scenario 3: Duplicate Verification

1. Complete successful payment
2. Try to verify same reference again
3. Backend should handle gracefully

**Expected Result:** ✅ Should not cause errors

---

### Scenario 4: Invalid User ID

1. Try to verify payment with wrong userId
2. Backend should detect mismatch

**Expected Result:** ❌ Returns error about user mismatch

---

## 💳 Test Cards (Paystack Test Mode)

| Card Number | Expiry | CVV | Result | Use Case |
|-------------|--------|-----|--------|----------|
| 5531886652142950 | 09/32 | 564 | ✅ Success | Test successful payment |
| 5060666666666666666 | 09/32 | 123 | ❌ Decline | Test failed payment |
| 4084084084084081 | 09/32 | 123 | 🔐 3DS | Test 3D Secure |

---

## 📊 Expected Logs

When testing, you should see logs like:

```
🔍 Verifying payment for user user_001 with reference: ref_abc123xyz
✅ Payment verified successfully: ₦5000
💾 Updating premium status for user: user_001
✅ User user_001 upgraded to premium (Mock DB)
```

---

## 🐛 Debugging Tips

1. **Enable detailed logging:** Check server console
2. **Check Paystack dashboard:** View transaction details
3. **Verify test mode:** Ensure using test keys
4. **Check network tab:** Inspect request/response in browser
5. **Test with curl first:** Isolate backend issues

---

## ✅ Checklist

- [ ] Server starts without errors
- [ ] Health check returns 200
- [ ] Can initialize payment
- [ ] Payment verification works
- [ ] User status updates correctly
- [ ] Frontend can call all endpoints
- [ ] CORS configured properly
- [ ] Error handling works

---

**All tests passing? You're ready to go live! 🚀**
