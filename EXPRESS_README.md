# Express Paystack Payment Server - Quick Start

A simple, beginner-friendly Express.js server for handling Paystack card payments.

## 🚀 Quick Start (5 Minutes)

### 1. Install Dependencies

```bash
npm install express axios dotenv
```

Or use the provided package.json:

```bash
cp express-package.json package.json
npm install
```

### 2. Configure Environment

Create a `.env` file:

```env
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
PORT=3000
```

Get your secret key from: https://dashboard.paystack.com/#/settings/developer

### 3. Start the Server

```bash
node express-paystack-server.js
```

You should see:
```
============================================================
🚀 PAYSTACK PAYMENT SERVER STARTED
============================================================
📡 Server running on: http://localhost:3000
```

### 4. Test the Payment

Open `payment-test.html` in your browser or use curl:

```bash
# Test health check
curl http://localhost:3000/health

# Initialize a payment
curl -X POST http://localhost:3000/api/initialize-payment \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "amount": 5000}'

# Verify a payment
curl -X POST http://localhost:3000/api/verify-payment \
  -H "Content-Type: application/json" \
  -d '{"reference": "ref_abc123xyz"}'
```

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Check if server is running |
| POST | `/api/initialize-payment` | Start a payment transaction |
| POST | `/api/verify-payment` | Verify completed payment |
| GET | `/api/users` | View mock database |

## 🧪 Test Cards

**Successful Payment:**
- Card: `5531886652142950`
- Expiry: `09/32`
- CVV: `564`

**Failed Payment:**
- Card: `5060666666666666666`
- Expiry: `09/32`
- CVV: `123`

## 📖 Full Documentation

See [PAYSTACK_PAYMENT_GUIDE.md](PAYSTACK_PAYMENT_GUIDE.md) for complete documentation including:
- Detailed API reference
- Frontend integration examples
- NestJS integration guide
- Troubleshooting tips
- Security best practices

## 🔧 Project Structure

```
.
├── express-paystack-server.js  # Main server file
├── payment-test.html            # Test page
├── .env                         # Environment variables
├── .env.example                 # Environment template
└── PAYSTACK_PAYMENT_GUIDE.md   # Full documentation
```

## ⚡ Features

- ✅ Simple Express.js implementation
- ✅ Paystack payment verification
- ✅ Mock database for testing
- ✅ CORS enabled for frontend integration
- ✅ Comprehensive error handling
- ✅ Beginner-friendly with comments

## 🔒 Security Notes

- Never commit `.env` file to Git
- Use test keys for development
- Always verify payments on the server side
- Never expose secret keys to frontend

## 🆘 Common Issues

**"PAYSTACK_SECRET_KEY not configured"**
- Make sure you created a `.env` file
- Check that your secret key starts with `sk_test_` or `sk_live_`

**CORS Error**
- The server has CORS enabled by default
- Change `Access-Control-Allow-Origin` in the code if needed

**Payment verification fails**
- Make sure you're using the correct environment (test/live)
- Verify the payment reference is correct
- Check Paystack dashboard for transaction details

## 📞 Support

- Paystack Documentation: https://paystack.com/docs
- Paystack API Reference: https://paystack.com/docs/api/

## 📄 License

MIT
