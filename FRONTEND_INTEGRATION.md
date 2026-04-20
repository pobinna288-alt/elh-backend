# Frontend Integration Guide (NO API KEYS)

## ⚠️ CRITICAL: Frontend NEVER has access to API keys

This guide shows how your frontend should interact with the secure backend.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│              FRONTEND (Browser)                  │
│         ⛔ NO API KEYS HERE EVER                 │
│                                                  │
│  - HTML/CSS/JavaScript                          │
│  - User authentication (JWT)                    │
│  - API calls to backend only                    │
└────────────────────┬─────────────────────────────┘
                     │
                     │ Authenticated HTTP Requests
                     │ Authorization: Bearer <JWT>
                     ↓
┌──────────────────────────────────────────────────┐
│              BACKEND (Server)                    │
│         ✅ ALL API KEYS HERE ONLY                │
│                                                  │
│  - NestJS/Node.js                               │
│  - Environment variables (.env)                 │
│  - Paystack/Stripe SDK with secret keys         │
└────────────────────┬─────────────────────────────┘
                     │
                     │ API Requests with Secret Keys
                     ↓
┌──────────────────────────────────────────────────┐
│          EXTERNAL APIs                           │
│  - Paystack API                                  │
│  - Stripe API                                    │
│  - OpenAI API                                    │
└──────────────────────────────────────────────────┘
```

---

## 🔒 Authentication Flow

### 1. User Login (Frontend)
```javascript
// login.js - FRONTEND CODE
async function loginUser(email, password) {
  const response = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  
  // ✅ Store JWT token (not API keys)
  localStorage.setItem('authToken', data.accessToken);
  return data;
}
```

---

## 💳 Payment Integration

### Example 1: Paystack Payment (Frontend)

```html
<!-- payment.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Payment - EL HANNORA</title>
</head>
<body>
  <h2>Subscribe to Premium Plan</h2>
  
  <select id="plan">
    <option value="premium">Premium - $20 / 20,000 coins</option>
    <option value="pro">Pro - ₦200,000</option>
    <option value="hot">Hot - ₦1,000,000</option>
  </select>

  <button onclick="initializePayment()">Pay Now</button>

  <script src="payment.js"></script>
</body>
</html>
```

```javascript
// payment.js - FRONTEND CODE (NO API KEYS)
async function initializePayment() {
  const plan = document.getElementById('plan').value;
  const authToken = localStorage.getItem('authToken');
  
  if (!authToken) {
    alert('Please login first');
    return;
  }

  try {
    // ✅ STEP 1: Call backend to initialize payment
    // Backend uses Paystack secret key server-side
    const response = await fetch('http://localhost:3000/api/v1/payments/paystack/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plan: plan,
        email: 'user@example.com'  // Get from user profile
      })
    });

    const data = await response.json();

    if (data.success) {
      // ✅ STEP 2: Redirect to Paystack checkout
      // No API key needed here - backend gave us the URL
      window.location.href = data.authorizationUrl;
    } else {
      alert('Payment initialization failed');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred');
  }
}

// ✅ STEP 3: Verify payment after redirect
async function verifyPayment(reference) {
  const authToken = localStorage.getItem('authToken');

  const response = await fetch(`http://localhost:3000/api/v1/payments/paystack/verify?reference=${reference}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });

  const data = await response.json();

  if (data.success) {
    alert('Payment successful!');
    // Update user subscription status
  } else {
    alert('Payment verification failed');
  }
}
```

### Example 2: Stripe Payment (Frontend)

```javascript
// stripe-payment.js - FRONTEND CODE (NO API KEYS)
async function initializeStripePayment() {
  const plan = 'premium';
  const authToken = localStorage.getItem('authToken');

  try {
    // ✅ Call backend to create Stripe checkout session
    const response = await fetch('http://localhost:3000/api/v1/payments/stripe/create-checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ plan })
    });

    const data = await response.json();

    if (data.success) {
      // ✅ Redirect to Stripe checkout
      window.location.href = data.checkoutUrl;
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
```

---

## 🤖 AI Feature Integration

### Example: Generate Ad Description

```javascript
// ai-description.js - FRONTEND CODE (NO API KEYS)
async function generateDescription() {
  const title = document.getElementById('adTitle').value;
  const category = document.getElementById('category').value;
  const authToken = localStorage.getItem('authToken');

  try {
    // ✅ Backend calls OpenAI API with secret key
    const response = await fetch('http://localhost:3000/api/v1/ads/generate-description', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: title,
        category: category,
        plan: 'premium'
      })
    });

    const data = await response.json();

    if (data.description) {
      document.getElementById('result').textContent = data.description;
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
```

---

## 🎯 Complete Frontend Example

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EL HANNORA - Secure Frontend</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; }
    button { padding: 10px 20px; margin: 10px 0; cursor: pointer; }
    .section { margin: 30px 0; padding: 20px; border: 1px solid #ddd; }
  </style>
</head>
<body>
  <h1>🔒 Secure Frontend Integration</h1>
  <p>⚠️ No API keys in this code - all secure operations happen on backend</p>

  <!-- Login Section -->
  <div class="section">
    <h2>1. Login</h2>
    <input type="email" id="email" placeholder="Email">
    <input type="password" id="password" placeholder="Password">
    <button onclick="login()">Login</button>
    <p id="loginStatus"></p>
  </div>

  <!-- Payment Section -->
  <div class="section">
    <h2>2. Make Payment (Paystack)</h2>
    <select id="plan">
      <option value="premium">Premium - $20 / 20,000 coins</option>
      <option value="pro">Pro - ₦200,000</option>
    </select>
    <button onclick="payWithPaystack()">Pay with Paystack</button>
  </div>

  <!-- AI Feature Section -->
  <div class="section">
    <h2>3. Generate AI Description</h2>
    <input type="text" id="adTitle" placeholder="Ad Title">
    <button onclick="generateAI()">Generate</button>
    <p id="aiResult"></p>
  </div>

  <script>
    const API_BASE = 'http://localhost:3000/api/v1';

    // ✅ FRONTEND CODE - NO API KEYS
    async function login() {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (data.accessToken) {
        localStorage.setItem('authToken', data.accessToken);
        document.getElementById('loginStatus').textContent = '✅ Logged in successfully';
      }
    }

    async function payWithPaystack() {
      const plan = document.getElementById('plan').value;
      const token = localStorage.getItem('authToken');

      if (!token) {
        alert('Please login first');
        return;
      }

      // ✅ Backend handles Paystack secret key
      const response = await fetch(`${API_BASE}/payments/paystack/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan: plan,
          email: 'user@example.com'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // ✅ Redirect to Paystack (no API key needed)
        window.location.href = data.authorizationUrl;
      }
    }

    async function generateAI() {
      const title = document.getElementById('adTitle').value;
      const token = localStorage.getItem('authToken');

      if (!token) {
        alert('Please login first');
        return;
      }

      // ✅ Backend handles OpenAI API key
      const response = await fetch(`${API_BASE}/ads/generate-description`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title,
          category: 'electronics',
          plan: 'premium'
        })
      });

      const data = await response.json();
      
      if (data.description) {
        document.getElementById('aiResult').textContent = data.description;
      }
    }
  </script>
</body>
</html>
```

---

## ✅ Security Checklist for Frontend

### **NEVER DO THIS (Frontend):**
- ❌ Store API keys in JavaScript code
- ❌ Include secret keys in HTML
- ❌ Call payment APIs directly from browser
- ❌ Expose backend secrets in localStorage
- ❌ Make direct calls to Paystack/Stripe from frontend

### **ALWAYS DO THIS (Frontend):**
- ✅ Store only JWT tokens (not API keys)
- ✅ Call backend endpoints with authentication
- ✅ Let backend handle all external API calls
- ✅ Redirect users to payment URLs from backend
- ✅ Validate authentication before making requests

---

## 🔍 Frontend vs Backend Responsibilities

| Task | Frontend | Backend |
|------|----------|---------|
| **Store API Keys** | ❌ NEVER | ✅ YES (.env) |
| **User Authentication** | ✅ Store JWT | ✅ Validate JWT |
| **Payment Initialization** | ✅ Call backend | ✅ Call Paystack/Stripe API |
| **AI Generation** | ✅ Call backend | ✅ Call OpenAI API |
| **Error Handling** | ✅ Show user message | ✅ Log & sanitize |

---

## 📱 Mobile App Integration (React Native)

```javascript
// mobile-app/services/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://your-backend.com/api/v1';

export async function initializePayment(plan) {
  const token = await AsyncStorage.getItem('authToken');

  // ✅ Call backend (no API keys in mobile app)
  const response = await fetch(`${API_BASE}/payments/paystack/initialize`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      plan,
      email: 'user@example.com'
    })
  });

  const data = await response.json();
  
  // ✅ Open payment URL in WebView
  return data.authorizationUrl;
}
```

---

## 🛡️ Summary

**Frontend:** 
- Makes authenticated HTTP requests to your backend
- Never has access to API keys
- Redirects users to payment URLs from backend

**Backend:**
- Stores all API keys in `.env`
- Handles all external API calls
- Returns only safe data to frontend

**Your frontend is now secure and properly integrated! 🚀**
