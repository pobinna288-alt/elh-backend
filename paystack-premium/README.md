# Paystack Premium Payment Backend

A modular, production-ready Node.js + Express backend for handling premium subscription payments via Paystack.

## 🎯 Features

✅ **Paystack Integration** - Initialize and verify payments  
✅ **Modular Architecture** - Clean separation of concerns  
✅ **Database Support** - Mock database OR MongoDB  
✅ **Error Handling** - Comprehensive error management  
✅ **Security** - Helmet, CORS, environment variables  
✅ **Well-Commented** - Beginner-friendly code  
✅ **Production-Ready** - Scalable and maintainable  

## 📋 Requirements

- Node.js >= 14.0.0
- npm >= 6.0.0
- Paystack account (get free test keys)
- MongoDB (optional - can use mock database)

## 🚀 Quick Start (5 Minutes)

### 1. Install Dependencies

```bash
cd paystack-premium
npm install
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and add your Paystack secret key
# Get it from: https://dashboard.paystack.com/#/settings/developer
```

Your `.env` file should look like:

```env
PORT=3000
NODE_ENV=development
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
USE_MONGODB=false
```

### 3. Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

You should see:

```
============================================================
🚀 PAYSTACK PREMIUM PAYMENT SERVER STARTED
============================================================
📡 Server running on: http://localhost:3000
🌍 Environment: development
🏥 Health check: http://localhost:3000/health
💳 Payment API: http://localhost:3000/api/payments
============================================================
```

### 4. Test It!

```bash
# Health check
curl http://localhost:3000/health

# Get all users
curl http://localhost:3000/api/payments/users

# Get specific user
curl http://localhost:3000/api/payments/user/user_001
```

## 📚 API Documentation

### Base URL

```
http://localhost:3000/api/payments
```

---

### 1. Verify Payment (Main Endpoint)

**Endpoint:** `POST /api/payments/verify`

**Description:** Verify payment and update user premium status

**Request Body:**

```json
{
  "reference": "ref_abc123xyz",
  "userId": "user_001"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Payment verified successfully. User upgraded to premium!",
  "data": {
    "userId": "user_001",
    "email": "user@example.com",
    "isPremium": true,
    "premiumExpiry": "2026-02-15T10:00:00.000Z",
    "amount": 5000,
    "reference": "ref_abc123xyz",
    "paidAt": "2026-01-15T10:00:00.000Z"
  }
}
```

**Failure Response (400):**

```json
{
  "success": false,
  "message": "Payment verification failed"
}
```

---

### 2. Initialize Payment

**Endpoint:** `POST /api/payments/initialize`

**Description:** Initialize a new payment transaction

**Request Body:**

```json
{
  "email": "user@example.com",
  "amount": 5000,
  "userId": "user_001",
  "plan": "premium"
}
```

**Response (200):**

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

---

### 3. Get User Status

**Endpoint:** `GET /api/payments/user/:userId`

**Description:** Get user payment status and subscription details

**Example:** `GET /api/payments/user/user_001`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "userId": "user_001",
    "email": "user@example.com",
    "name": "John Doe",
    "isPremium": true,
    "hasActivePremium": true,
    "premiumExpiry": "2026-02-15T10:00:00.000Z",
    "totalPaid": 5000,
    "paymentHistory": [
      {
        "reference": "ref_abc123",
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

### 4. Get All Users (Testing)

**Endpoint:** `GET /api/payments/users`

**Response (200):**

```json
{
  "success": true,
  "count": 3,
  "data": [...]
}
```

---

## 🌐 Frontend Integration

### Example 1: Vanilla JavaScript

```javascript
// After user completes payment on Paystack
async function verifyPayment(reference, userId) {
  try {
    const response = await fetch('http://localhost:3000/api/payments/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reference: reference,
        userId: userId
      })
    });

    const data = await response.json();

    if (data.success) {
      alert('Payment successful! You are now a premium user.');
      // Redirect to dashboard or update UI
    } else {
      alert('Payment verification failed.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### Example 2: With Paystack Inline (Popup)

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://js.paystack.co/v1/inline.js"></script>
</head>
<body>
  <button onclick="payWithPaystack()">Subscribe to Premium - ₦5,000</button>

  <script>
    function payWithPaystack() {
      // First, initialize payment on your backend
      fetch('http://localhost:3000/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          amount: 5000,
          userId: 'user_001',
          plan: 'premium'
        })
      })
      .then(res => res.json())
      .then(data => {
        // Open Paystack popup
        const handler = PaystackPop.setup({
          key: 'pk_test_your_public_key', // Your Paystack PUBLIC key
          email: 'user@example.com',
          amount: 500000, // 5000 * 100 (kobo)
          ref: data.data.reference,
          callback: function(response) {
            // Payment successful, verify on backend
            verifyPayment(response.reference, 'user_001');
          }
        });
        handler.openIframe();
      });
    }

    async function verifyPayment(reference, userId) {
      const response = await fetch('http://localhost:3000/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, userId })
      });

      const data = await response.json();
      if (data.success) {
        alert('✅ Premium activated!');
        window.location.href = '/dashboard';
      }
    }
  </script>
</body>
</html>
```

---

## 🗂️ Project Structure

```
paystack-premium/
├── server.js                    # Main Express server
├── package.json                 # Dependencies and scripts
├── .env.example                 # Environment variables template
├── .env                         # Your environment variables (create this)
├── config/
│   └── config.js               # Configuration management
├── controllers/
│   └── payment.controller.js   # Payment business logic
├── routes/
│   └── payment.routes.js       # API route definitions
└── services/
    ├── paystack.service.js     # Paystack API integration
    └── database.service.js     # Database operations
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Server port |
| `NODE_ENV` | No | development | Environment (development/production) |
| `PAYSTACK_SECRET_KEY` | **Yes** | - | Paystack secret key |
| `CORS_ORIGIN` | No | * | Allowed CORS origins |
| `USE_MONGODB` | No | false | Use MongoDB (true) or mock DB (false) |
| `MONGODB_URI` | If MongoDB | - | MongoDB connection string |

### Using MongoDB (Optional)

1. Set `USE_MONGODB=true` in `.env`
2. Add MongoDB connection URI:
   ```env
   MONGODB_URI=mongodb://localhost:27017/paystack-premium
   ```
3. Make sure MongoDB is running
4. Restart the server

### Using Mock Database (Default)

The server comes with an in-memory mock database that's perfect for:
- Development
- Testing
- Quick prototyping

No setup required! Just run the server.

---

## 🧪 Testing

### Test with cURL

```bash
# Verify a payment
curl -X POST http://localhost:3000/api/payments/verify \
  -H "Content-Type: application/json" \
  -d '{"reference":"test_ref","userId":"user_001"}'

# Get user status
curl http://localhost:3000/api/payments/user/user_001

# Initialize payment
curl -X POST http://localhost:3000/api/payments/initialize \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","amount":5000,"userId":"user_001"}'
```

### Test Cards (Paystack Test Mode)

| Card Number | Expiry | CVV | Result |
|-------------|--------|-----|--------|
| 5531886652142950 | 09/32 | 564 | ✅ Success |
| 5060666666666666666 | 09/32 | 123 | ❌ Failure |

---

## 🔒 Security Best Practices

✅ **Environment Variables** - All secrets in `.env`  
✅ **Helmet** - Security headers configured  
✅ **CORS** - Cross-origin requests controlled  
✅ **Server-side Verification** - Never trust client  
✅ **Error Sanitization** - No sensitive data leaked  

### Important Security Notes

1. **Never commit `.env` file** - It's in `.gitignore`
2. **Never expose secret key to frontend** - Only use PUBLIC key on frontend
3. **Always verify payments on backend** - Client-side can be manipulated
4. **Use HTTPS in production** - Encrypt all traffic
5. **Validate all inputs** - Never trust user input

---

## 🚀 Deployment

### Preparing for Production

1. **Get Live Paystack Keys**
   - Go to https://dashboard.paystack.com
   - Switch to "Live Mode"
   - Get your live secret key (starts with `sk_live_`)

2. **Update Environment Variables**
   ```env
   NODE_ENV=production
   PAYSTACK_SECRET_KEY=sk_live_your_live_key
   USE_MONGODB=true
   MONGODB_URI=mongodb+srv://...
   CORS_ORIGIN=https://yourdomain.com
   ```

3. **Enable HTTPS**
   - Use a reverse proxy (Nginx, Apache)
   - Or deploy to platforms with HTTPS (Heroku, Vercel, Railway)

4. **Set Up Database**
   - Use MongoDB Atlas (cloud) or self-hosted MongoDB
   - Back up regularly

### Deploy to Heroku

```bash
# Install Heroku CLI
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set PAYSTACK_SECRET_KEY=sk_live_xxx
heroku config:set USE_MONGODB=true
heroku config:set MONGODB_URI=mongodb+srv://...

# Deploy
git push heroku main

# Open app
heroku open
```

---

## 📊 Database Schema

### User Object

```javascript
{
  id: 'user_001',                    // Unique user ID
  email: 'user@example.com',         // User email
  name: 'John Doe',                  // User name
  isPremium: true,                   // Premium status
  premiumExpiry: '2026-02-15T...',   // Premium expiry date
  totalPaid: 5000,                   // Total amount paid
  paymentHistory: [                  // Payment history array
    {
      reference: 'ref_abc123',
      amount: 5000,
      plan: 'premium',
      date: '2026-01-15T...',
      status: 'completed'
    }
  ],
  createdAt: '2026-01-01T...',       // Account created date
  updatedAt: '2026-01-15T...'        // Last updated date
}
```

---

## 🆘 Troubleshooting

### "PAYSTACK_SECRET_KEY is not set"

**Problem:** Server can't find Paystack secret key

**Solution:**
1. Create `.env` file in project root
2. Add `PAYSTACK_SECRET_KEY=sk_test_your_key_here`
3. Restart server

---

### CORS Error

**Problem:** Frontend can't connect to backend

**Solution:**
1. Check `CORS_ORIGIN` in `.env`
2. Set it to your frontend URL: `CORS_ORIGIN=http://localhost:4200`
3. Or allow all during development: `CORS_ORIGIN=*`

---

### "Payment verification failed"

**Problem:** Payment verification returns error

**Possible causes:**
1. Invalid payment reference
2. Payment not completed
3. Wrong secret key (test vs live)

**Solution:**
- Check the reference is correct
- Verify payment was completed on Paystack
- Ensure you're using correct environment keys

---

### MongoDB Connection Failed

**Problem:** Can't connect to MongoDB

**Solution:**
1. Check if MongoDB is running: `mongod --version`
2. Verify connection URI in `.env`
3. Or use mock database: `USE_MONGODB=false`

---

## 📚 Additional Resources

- [Paystack Documentation](https://paystack.com/docs)
- [Paystack API Reference](https://paystack.com/docs/api/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [MongoDB Documentation](https://docs.mongodb.com/)

---

## 📄 License

MIT

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

---

## 📞 Support

- **Paystack Support:** support@paystack.com
- **Paystack Dashboard:** https://dashboard.paystack.com

---

**Made with ❤️ for developers | Modular | Production-Ready | Well-Documented**
