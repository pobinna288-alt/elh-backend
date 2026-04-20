# 🚀 QUICK START GUIDE

Get your Paystack payment backend running in 5 minutes!

## Step 1: Install Dependencies (1 minute)

```bash
cd paystack-premium
npm install
```

## Step 2: Configure Environment (2 minutes)

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` and add your Paystack secret key:

```env
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
```

**Get your test key:**
1. Go to https://dashboard.paystack.com
2. Sign in or create account
3. Go to Settings → API Keys & Webhooks
4. Copy your **Test Secret Key** (starts with `sk_test_`)

## Step 3: Start Server (1 minute)

```bash
npm start
```

You should see:
```
🚀 PAYSTACK PREMIUM PAYMENT SERVER STARTED
📡 Server running on: http://localhost:3000
```

## Step 4: Test It! (1 minute)

Open a new terminal and test:

```bash
# Check server health
curl http://localhost:3000/health

# View all users (mock database)
curl http://localhost:3000/api/payments/users

# Get specific user
curl http://localhost:3000/api/payments/user/user_001
```

## 🎉 You're Done!

Your payment backend is now running and ready to accept requests from your frontend.

---

## 📝 Next Steps

### Test Payment Verification

```bash
curl -X POST http://localhost:3000/api/payments/verify \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "test_reference",
    "userId": "user_001"
  }'
```

### Test Payment Initialization

```bash
curl -X POST http://localhost:3000/api/payments/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "amount": 5000,
    "userId": "user_001",
    "plan": "premium"
  }'
```

---

## 🔗 Integration with Frontend

### Simple Example (JavaScript)

```javascript
// Verify payment after user completes payment
async function verifyPayment(reference, userId) {
  const response = await fetch('http://localhost:3000/api/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference, userId })
  });
  
  const data = await response.json();
  
  if (data.success) {
    alert('Payment successful! You are now premium.');
  } else {
    alert('Payment failed.');
  }
}

// Call this after Paystack payment
verifyPayment('payment_reference_from_paystack', 'user_001');
```

---

## 💡 Tips

1. **Use test cards** during development:
   - Success: `5531886652142950` | 09/32 | 564
   - Failure: `5060666666666666666` | 09/32 | 123

2. **Check logs** - The server prints detailed logs for debugging

3. **Mock database** - Default setup uses in-memory database (no MongoDB needed)

4. **Development mode** - Use `npm run dev` for auto-reload

---

## 🆘 Problems?

**Server won't start:**
- Check if port 3000 is available
- Make sure `.env` file exists
- Verify `PAYSTACK_SECRET_KEY` is set

**Can't verify payments:**
- Make sure you're using test key (starts with `sk_test_`)
- Check payment reference is correct
- Verify payment was completed on Paystack

---

## 📖 Full Documentation

See [README.md](README.md) for complete documentation.

---

**Ready to accept payments! 🎊**
