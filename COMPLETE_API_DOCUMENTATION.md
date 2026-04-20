# Complete Backend API Documentation

## Overview
Complete backend implementation for EL HANNORA ad platform with all frontend features supported.

## Base URL
```
http://localhost:3000/api
```

## Authentication
All protected endpoints require JWT Bearer token:
```
Authorization: Bearer <token>
```

---

## 📝 Authentication & Users

### POST /auth/register
Register new user
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "fullName": "John Doe"
}
```

### POST /auth/login
Login user
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

### GET /users/profile
Get current user profile (Protected)

### PATCH /users/profile
Update user profile (Protected)

---

## 🎯 Ads Management

### POST /ads
Create new ad (Protected)

### GET /ads
Get all ads with filters
Query params: `category`, `location`, `minPrice`, `maxPrice`, `sort`

### GET /ads/:id
Get single ad details

### PATCH /ads/:id
Update ad (Protected)

### DELETE /ads/:id
Delete ad (Protected)

### PATCH /ads/:id/like
Like an ad (Protected)

### PATCH /ads/:id/dislike
Dislike an ad (Protected)

---

## 💬 Comments

### POST /comments
Create comment (Protected)
```json
{
  "text": "Great product!",
  "adId": "ad-uuid"
}
```

### GET /comments/ad/:adId
Get comments for an ad

### PATCH /comments/:id/like
Like a comment (Protected)

### DELETE /comments/:id
Delete comment (Protected)

---

## ✉️ Messages

### POST /messages
Send message (Protected)
```json
{
  "content": "Hi, is this still available?",
  "receiverId": "user-uuid",
  "adId": "ad-uuid"
}
```

### GET /messages/conversations
Get all conversations (Protected)

### GET /messages/conversation/:userId
Get conversation with specific user (Protected)

### GET /messages/unread-count
Get unread message count (Protected)

### PATCH /messages/:id/read
Mark message as read (Protected)

---

## ⭐ Reviews

### POST /reviews
Create review (Protected)
```json
{
  "rating": 5,
  "title": "Excellent seller!",
  "reviewText": "Fast delivery, great communication",
  "adId": "ad-uuid",
  "sellerId": "user-uuid"
}
```

### GET /reviews/ad/:adId
Get reviews for an ad

### GET /reviews/seller/:sellerId
Get reviews for a seller

### PATCH /reviews/:id/helpful
Mark review as helpful (Protected)

---

## 🔔 Notifications

### GET /notifications
Get user notifications (Protected)
Query params: `unreadOnly=true`

### GET /notifications/unread-count
Get unread notification count (Protected)

### PATCH /notifications/:id/read
Mark notification as read (Protected)

### PATCH /notifications/read-all
Mark all as read (Protected)

### DELETE /notifications/:id
Delete notification (Protected)

---

## 🔥 Streak System

### GET /streak
Get streak information (Protected)

### POST /streak/check-in
Daily check-in (Protected)

### GET /streak/leaderboard
Get streak leaderboard

---

## 👥 Social Features

### POST /social/follow/:userId
Follow a user (Protected)

### DELETE /social/follow/:userId
Unfollow a user (Protected)

### GET /social/followers
Get followers (Protected)

### GET /social/following
Get following (Protected)

### POST /social/wishlist/:adId
Add to wishlist (Protected)

### DELETE /social/wishlist/:adId
Remove from wishlist (Protected)

### GET /social/wishlist
Get wishlist (Protected)

---

## 🎁 Referral Program

### GET /referral/code
Get referral code (Protected)

### POST /referral/apply
Apply referral code (Protected)
```json
{
  "referralCode": "ABC123XYZ"
}
```

### GET /referral/stats
Get referral statistics (Protected)

### GET /referral/referred-users
Get referred users list (Protected)

---

## 🔍 Saved Searches & Price Alerts

### POST /alerts/saved-searches
Create saved search (Protected)
```json
{
  "searchName": "Tech Gadgets NYC",
  "keyword": "laptop",
  "category": "Tech",
  "location": "New York",
  "minPrice": 100,
  "maxPrice": 1000,
  "notificationFrequency": "daily"
}
```

### GET /alerts/saved-searches
Get saved searches (Protected)

### DELETE /alerts/saved-searches/:id
Delete saved search (Protected)

### POST /alerts/price-alerts
Create price alert (Protected)
```json
{
  "adId": "ad-uuid",
  "targetPrice": 500,
  "alertFrequency": "instant"
}
```

### GET /alerts/price-alerts
Get price alerts (Protected)

### DELETE /alerts/price-alerts/:id
Delete price alert (Protected)

---

## 🤖 AI Tools (Premium Features)

### POST /ai-tools/smart-copywriter
Generate ad copy (Premium)
```json
{
  "productName": "Leather Jacket",
  "category": "Clothes",
  "targetAudience": "young adults",
  "tone": "casual"
}
```

### POST /ai-tools/negotiation-ai
Get negotiation suggestions (Premium)
```json
{
  "originalPrice": 1000,
  "offeredPrice": 750,
  "productCategory": "Electronics"
}
```

### POST /ai-tools/competitor-analyzer
Analyze competitors (Premium)
```json
{
  "category": "Tech",
  "yourPrice": 599,
  "location": "New York"
}
```

### POST /ai-tools/audience-expansion
Get expansion opportunities (Pro/Hot)
```json
{
  "currentCategory": "Tech",
  "currentLocations": ["New York", "LA"]
}
```

---

## 💳 Payments

### POST /payments/stripe/checkout
Create Stripe checkout session (Protected)
```json
{
  "plan": "premium",
  "successUrl": "https://yourapp.com/success",
  "cancelUrl": "https://yourapp.com/cancel"
}
```

### POST /payments/paystack/initialize
Initialize Paystack payment (Protected)

### POST /payments/verify
Verify payment (Protected)

---

## 🪙 Wallet

### GET /wallet/balance
Get wallet balance (Protected)

### POST /wallet/coins/earn
Earn coins (Protected)
```json
{
  "amount": 50,
  "reason": "Watched video ad"
}
```

### POST /wallet/coins/spend
Spend coins (Protected)
```json
{
  "amount": 20000,
  "reason": "Premium subscription"
}
```

---

## 👑 Premium

### GET /premium/check
Check premium status (Protected)

### POST /premium/unlock
Unlock premium with coins (Protected)
```json
{
  "plan": "premium",
  "duration": 30
}
```

---

## Response Format

### Success Response
```json
{
  "data": {...},
  "message": "Success",
  "timestamp": "2026-01-17T10:00:00Z"
}
```

### Error Response
```json
{
  "error": "Error message",
  "statusCode": 400,
  "timestamp": "2026-01-17T10:00:00Z"
}
```

---

## Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

---

## Rate Limiting
- Default: 100 requests per minute
- Login: 5 requests per minute
- Payment: 10 requests per minute

---

## Database Setup

1. Create PostgreSQL database
2. Run schema files in order:
   - `database/schema/users.sql`
   - `database/schema/refresh-tokens.sql`
   - `database/schema/media-upload.sql`
   - `database/schema/password-reset.sql`
   - `database/schema/fraud-detection.sql`
   - `database/schema/marketplace-fraud-detection.sql`
   - `database/schema/social-features.sql`

3. Create indexes:
   ```bash
   psql -d your_database -f database/indexes/performance-indexes.sql
   ```

---

## Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=elh_ads_platform

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_secret_key

# Payment
STRIPE_SECRET_KEY=sk_test_...
PAYSTACK_SECRET_KEY=sk_test_...

# Server
PORT=3000
NODE_ENV=development
```

---

## All Features Implemented ✅

### Authentication & User Management
- ✅ Register with email/password
- ✅ Login with JWT tokens
- ✅ Profile management
- ✅ Password reset
- ✅ Two-factor authentication support

### Ads System
- ✅ Create/Edit/Delete ads
- ✅ Media upload (images/videos)
- ✅ 26 categories
- ✅ Search & filters
- ✅ Like/Dislike
- ✅ View tracking

### Social Features
- ✅ Comments system
- ✅ Messaging system
- ✅ Follow users
- ✅ Wishlist
- ✅ Reviews & ratings

### Gamification
- ✅ Daily streak tracking
- ✅ Coin earning system
- ✅ Leaderboards
- ✅ Referral program

### Notifications
- ✅ In-app notifications
- ✅ Email notifications
- ✅ Push notifications support
- ✅ Notification preferences

### Premium Features
- ✅ Subscription tiers (Free, Premium, Pro, Hot)
- ✅ AI Tools (5 tools)
- ✅ Enhanced video limits
- ✅ Higher coin earnings

### Smart Features
- ✅ Saved searches
- ✅ Price alerts
- ✅ Personalized recommendations
- ✅ Analytics dashboard

### Payments
- ✅ Stripe integration
- ✅ Paystack integration
- ✅ Coin-based payments
- ✅ Transaction history

### Security
- ✅ Rate limiting
- ✅ Fraud detection
- ✅ Input validation
- ✅ SQL injection prevention
- ✅ XSS protection

---

## Support
For issues or questions, contact support or check the documentation.
