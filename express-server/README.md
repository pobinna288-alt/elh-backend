# EL HANNORA - Complete Express.js Backend

## 🎯 Overview

A complete, production-ready Express.js backend for the EL HANNORA ad & social platform. This server is fully functional with **in-memory storage** - no database setup required!

### ✨ Features

- ✅ **JWT Authentication** - Secure login/register
- ✅ **User Management** - Profiles, coins, premium subscriptions
- ✅ **Ad Management** - Create, browse, filter, interact
- ✅ **AI Tools** (Premium+) - Copywriter, Competitor Analysis, Negotiation, Forecast
- ✅ **Advanced AI** (Enterprise) - Audience Expansion
- ✅ **Messaging** - Real-time conversations
- ✅ **Notifications** - System-wide notifications
- ✅ **Reviews & Ratings** - For ads and sellers
- ✅ **Social Features** - Follow, wishlist, referrals
- ✅ **Streak System** - Daily check-ins with rewards
- ✅ **Payment Processing** - Mock Stripe/Paystack integration
- ✅ **File Uploads** - Images and videos for ads
- ✅ **Rate Limiting** - Protection against abuse

---

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
cd express-server
npm install
```

### 2. Configure Environment

The `.env` file is already configured with defaults:

```env
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=development
FRONTEND_URL=http://127.0.0.1:5173
```

### 3. Start Server

```powershell
npm start
```

Or for development with auto-reload:

```powershell
npm run dev
```

### 4. Test the Server

Open http://localhost:3001/api/health in your browser. You should see:

```json
{
  "status": "ok",
  "timestamp": "2026-01-17T...",
  "uptime": 5.234,
  "database": {
    "users": 2,
    "ads": 3,
    "messages": 0,
    "notifications": 2
  }
}
```

---

## 🧪 Testing Endpoints

### Test Credentials

**Demo User (Premium)**
- Email: `demo@elh.com`
- Password: `demo123`
- Coins: 5,000
- Premium: Yes

**John Seller (Pro)**
- Email: `john@elh.com`
- Password: `password123`
- Coins: 12,000
- Premium: Pro Tier

### Using PowerShell to Test

#### 1. Register a New User

```powershell
$body = @{
    fullName = "Test User"
    email = "test@example.com"
    password = "test123"
    confirmPassword = "test123"
    age = 25
    location = "New York"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

#### 2. Login

```powershell
$loginBody = @{
    email = "demo@elh.com"
    password = "demo123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" `
    -Method POST `
    -Body $loginBody `
    -ContentType "application/json"

# Save token for later use
$token = $response.token
Write-Host "Token: $token"
```

#### 3. Get User Profile

```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:3001/api/user/profile" `
    -Method GET `
    -Headers $headers
```

#### 4. Get All Ads

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/ads" -Method GET
```

#### 5. Get Ads with Filters

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/ads?category=Tech&minPrice=500&maxPrice=2000" -Method GET
```

#### 6. Create a New Ad

```powershell
$adBody = @{
    title = "Brand New iPhone 15 Pro"
    description = "Excellent condition, comes with box and accessories"
    price = 999.99
    category = "Tech"
    location = "New York"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:3001/api/ads/create" `
    -Method POST `
    -Body $adBody `
    -Headers $headers `
    -ContentType "application/json"
```

#### 7. Like an Ad

```powershell
$adId = "copy-ad-id-from-response"
$interactBody = @{
    adId = $adId
    action = "like"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/ads/interact" `
    -Method POST `
    -Body $interactBody `
    -Headers $headers `
    -ContentType "application/json"
```

#### 8. Check-in for Streak Reward

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/streak/checkin" `
    -Method POST `
    -Headers $headers
```

#### 9. Use AI Copywriter (Premium)

```powershell
$aiBody = @{
    productName = "Gaming Laptop"
    description = "High performance for gaming and work"
    tone = "professional"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/ai/copywriter" `
    -Method POST `
    -Body $aiBody `
    -Headers $headers `
    -ContentType "application/json"
```

#### 10. Unlock Premium

```powershell
$premiumBody = @{
    plan = "premium"
    useCoins = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/premium/unlock" `
    -Method POST `
    -Body $premiumBody `
    -Headers $headers `
    -ContentType "application/json"
```

---

## 📋 Complete API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login and get JWT token |
| POST | `/api/auth/logout` | ✅ | Logout (invalidate token) |

### User Profile

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/user/profile` | ✅ | Get user profile with stats |
| PUT | `/api/user/profile` | ✅ | Update profile (supports file upload) |
| GET | `/api/user/coins` | ✅ | Get coin balance |

### Coins & Premium

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/coins/earn` | ✅ | Earn coins (tasks, ads) |
| POST | `/api/coins/spend` | ✅ | Spend coins |
| POST | `/api/premium/unlock` | ✅ | Unlock premium with coins/payment |
| GET | `/api/premium/check` | ✅ | Check premium status |

### Ads

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/ads/create` | ✅ | Create new ad (supports file upload) |
| GET | `/api/ads` | ❌ | Get all ads with filters |
| GET | `/api/ads/:id` | ❌ | Get single ad details |
| POST | `/api/ads/interact` | ✅ | Like, dislike, share, save, click |
| DELETE | `/api/ads/:id` | ✅ | Delete your ad |

### Comments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/comments/create` | ✅ | Add comment to ad |
| GET | `/api/comments/:adId` | ❌ | Get all comments for ad |

### AI Tools (Tier-Gated)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/ai/copywriter` | ✅ 👑 | Generate ad copy *(Premium+)* |
| POST | `/api/ai/competitor` | ✅ 👑 | Analyze competitors *(Premium+)* |
| POST | `/api/ai/negotiation` | ✅ 👑 | Get negotiation advice *(Premium+)* |
| POST | `/api/ai/audience` | ✅ 👑 | Audience expansion analysis *(Enterprise only)* |

### Messaging

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/messages` | ✅ | Get all conversations |
| POST | `/api/messages/send` | ✅ | Send message |
| POST | `/api/messages/:id/read` | ✅ | Mark message as read |
| POST | `/api/chat/start` | ✅ | Start conversation |

### Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications` | ✅ | Get all notifications |
| POST | `/api/notifications/read` | ✅ | Mark as read |
| DELETE | `/api/notifications/:id` | ✅ | Delete notification |

### Reviews & Ratings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/reviews` | ✅ | Create review |
| GET | `/api/reviews/ad/:adId` | ❌ | Get ad reviews |
| GET | `/api/reviews/seller/:sellerId` | ❌ | Get seller reviews |

### Social Features

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/social/follow` | ✅ | Follow user |
| DELETE | `/api/social/follow/:userId` | ✅ | Unfollow user |
| GET | `/api/social/followers` | ✅ | Get your followers |
| GET | `/api/social/following` | ✅ | Get users you follow |
| GET | `/api/social/wishlist` | ✅ | Get wishlist items |

### Streak System

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/streak/checkin` | ✅ | Daily check-in |
| GET | `/api/streak` | ✅ | Get streak status |

### Referral Program

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/referral/code` | ✅ | Get your referral code |
| POST | `/api/referral/apply` | ✅ | Apply referral code |

### Payments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/payments` | ✅ | Process payment |
| GET | `/api/payments/history` | ✅ | Payment history |

### Admin (Optional)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/stats` | ✅ | Platform statistics |

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | ❌ | Server health check |

---

## 📁 Project Structure

```
express-server/
├── server.js           # Main server file (all logic)
├── package.json        # Dependencies
├── .env               # Environment variables
├── uploads/           # Uploaded files (auto-created)
└── README.md          # This file
```

---

## 🔐 Security Features

- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Password Hashing** - bcrypt with salt rounds
- ✅ **Rate Limiting** - Prevent abuse
- ✅ **Input Validation** - Email, password, age validation
- ✅ **CORS Protection** - Configured for frontend
- ✅ **File Upload Limits** - 10MB max, type validation
- ✅ **Error Handling** - Comprehensive error responses

---

## 🎨 Sample Data

The server comes pre-loaded with:
- 2 test users (demo & john_seller)
- 3 sample ads (MacBook, Leather Jacket, Web Services)
- 2 notifications
- Multiple categories

---

## 🔄 Integration with Frontend

### Setting Up Your Frontend

In your React/Vite frontend:

```javascript
// api/client.js
const API_BASE_URL = 'http://localhost:3001/api';

export const api = {
  // Auth
  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  },

  // Get ads
  getAds: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_BASE_URL}/ads?${params}`);
    return response.json();
  },

  // Create ad
  createAd: async (adData, token) => {
    const response = await fetch(`${API_BASE_URL}/ads/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(adData)
    });
    return response.json();
  },

  // ... more endpoints
};
```

---

## 🐛 Troubleshooting

### Port Already in Use

```powershell
# Find and kill process on port 3001
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force
```

### CORS Issues

Make sure your frontend URL in `.env` matches your Vite dev server:
```env
FRONTEND_URL=http://127.0.0.1:5173
```

### JWT Token Expired

Tokens expire after 7 days. Re-login to get a new token.

---

## 📦 Dependencies

```json
{
  "express": "^4.18.2",          // Web framework
  "cors": "^2.8.5",              // CORS middleware
  "jsonwebtoken": "^9.0.2",      // JWT tokens
  "bcryptjs": "^2.4.3",          // Password hashing
  "dotenv": "^16.3.1",           // Environment variables
  "multer": "^1.4.5-lts.1",      // File uploads
  "uuid": "^9.0.1",              // Unique IDs
  "express-rate-limit": "^7.1.5" // Rate limiting
}
```

---

## 🚀 Production Deployment

### Environment Variables for Production

```env
PORT=3001
JWT_SECRET=use-a-strong-random-secret-here
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com
```

### Recommendations

1. **Use a Real Database** - Replace in-memory storage with PostgreSQL/MongoDB
2. **Add Redis** - For session management and caching
3. **Use HTTPS** - Deploy behind a reverse proxy (nginx)
4. **Add Logging** - Winston or Morgan for production logs
5. **Implement WebSockets** - For real-time messaging
6. **Add Payment Integration** - Real Stripe/Paystack keys
7. **Set up CI/CD** - Automated testing and deployment

---

## 📚 Additional Notes

### Premium Tiers

- **User** (Free): Basic features, 1000 welcome coins
- **Premium** ($20 or 20,000 coins): 3 AI tools
- **Pro** ($200 or 200,000 coins): All AI tools
- **Hot** ($400 or 400,000 coins): All features + featured ads

### Coin System

- Welcome bonus: 1,000 coins
- Daily check-in: 10-100 coins (based on streak)
- Referral reward: 500 coins (both parties)
- 1 USD = 100 coins

### Trust Score Calculation

Based on:
- Ad engagement rate (views, clicks, likes)
- Ad completion rate
- Community feedback
- Account age
- Response time

---

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review the API reference
3. Test endpoints using the provided PowerShell examples

---

## ✅ Checklist

- [x] Authentication working
- [x] User profiles functional
- [x] Ad creation and browsing
- [x] AI tools (mock responses)
- [x] Messaging system
- [x] Notifications
- [x] Reviews & ratings
- [x] Social features
- [x] Streak tracking
- [x] Referral program
- [x] Payment processing (mock)
- [x] File uploads
- [x] Rate limiting
- [x] Error handling
- [x] CORS configuration
- [x] Sample data loaded

---

**🎉 Your backend is ready! Start the server and begin testing!**

```powershell
cd express-server
npm install
npm start
```

Then visit: http://localhost:3001/api/health
