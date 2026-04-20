# API Quick Reference - Backend Controlled System

## 🔑 Authentication

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "username": "john_doe",
  "fullName": "John Doe",
  "age": 25,
  "location": "New York"
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}

Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": { "id", "username", "coins", "isPremium" }
}
```

---

## 👤 User Profile

### Get Profile (Backend Source of Truth)
```http
GET /user/profile
Authorization: Bearer <accessToken>

Response:
{
  "id": "uuid",
  "username": "john_doe",
  "email": "user@example.com",
  "fullName": "John Doe",
  "coins": 5000,           ← Backend database value
  "isPremium": false,      ← Backend calculated
  "role": "user",
  "premiumExpiresAt": null
}
```

---

## 💰 Coins Management

### Add Coins (Backend Updates Database)
```http
POST /coins/add
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "amount": 100,
  "reason": "Daily reward"
}

Response:
{
  "success": true,
  "message": "Coins added successfully",
  "coins": 5100,           ← Updated balance from database
  "userId": "uuid"
}
```

**Backend Process:**
1. Validates user authentication
2. Gets current balance from database
3. Adds coins: `newBalance = currentBalance + amount`
4. Saves to database
5. Returns updated balance

---

## 👑 Premium Unlock

### Unlock Premium (Backend Validates & Deducts)
```http
POST /premium/unlock
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "durationDays": 30
}

Success Response (200):
{
  "success": true,
  "message": "Premium unlocked successfully",
  "isPremium": true,
  "premiumExpiresAt": "2026-02-15T10:00:00.000Z",
  "coinsDeducted": 20000,
  "remainingCoins": 3000,
  "userId": "uuid"
}

Error Response (400):
{
  "success": false,
  "message": "INSUFFICIENT_COINS",
  "required": 20000,
  "current": 8000,
  "shortage": 12000
}
```

**Backend Validation:**
1. ✅ Get user from database (not frontend)
2. ✅ Check `user.coins >= 20000`
3. ✅ Deduct 20,000 coins if sufficient
4. ✅ Set `premiumExpiresAt` to 30 days
5. ✅ Return error if insufficient

**CRITICAL:** Frontend CANNOT bypass coin check!

---

## 📢 Ads Management

### Create Ad (Backend Validates Everything)
```http
POST /ads/create
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "title": "MacBook Pro M3 for Sale",
  "description": "Brand new MacBook Pro with M3 chip",
  "category": "TECH",
  "price": 1899,
  "location": "New York, NY",
  "mediaUrls": ["url1", "url2"],
  "isVideoAd": false
}

Success Response (201):
{
  "id": "uuid",
  "title": "MacBook Pro M3 for Sale",
  "isPremium": false,      ← Backend sets this
  "author": {
    "id": "uuid",
    "username": "john_doe"
  }
}

Error Responses:
400: "Missing required fields: title, description, or category"
400: "Title must be between 5 and 200 characters"
400: "Description must be at least 10 characters"
403: "Video ads require premium membership"
403: "Uploading more than 3 images requires premium membership"
```

**Backend Validation:**
- ✅ User authenticated
- ✅ Required fields present
- ✅ Title length 5-200 characters
- ✅ Description min 10 characters
- ✅ Price >= 0
- ✅ Video ads → requires premium
- ✅ More than 3 images → requires premium

### Get All Ads
```http
GET /ads?category=TECH&page=1&limit=20
```

### Get My Ads
```http
GET /ads/my-ads
Authorization: Bearer <accessToken>
```

### Get Single Ad
```http
GET /ads/:id
```

### Update Ad
```http
PATCH /ads/:id
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "title": "Updated title",
  "price": 1799
}
```

### Delete Ad
```http
DELETE /ads/:id
Authorization: Bearer <accessToken>
```

---

## 🔐 Security Rules

### 1. All Protected Endpoints Require JWT
```http
Authorization: Bearer <accessToken>
```

### 2. User ID Extracted from Token
Backend gets user ID from JWT token - frontend cannot fake it:
```typescript
// Backend code
const userId = req.user.sub;  // From JWT
```

### 3. All Data from Database
Backend NEVER trusts frontend values:
```typescript
// ✅ CORRECT
const user = await db.findOne({ id: userId });
const coins = user.coins;  // From database

// ❌ WRONG
const coins = req.body.coins;  // Never trust frontend
```

---

## 📋 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "INSUFFICIENT_COINS",
  "error": "Bad Request"
}
```

---

## 🎯 Frontend Integration Examples

### React/Next.js Example

```javascript
// API utility
const api = {
  baseURL: 'http://localhost:3000',
  
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('accessToken');
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    return response.json();
  },
};

// Get user profile
async function getUserProfile() {
  const user = await api.request('/user/profile');
  return user;  // Use backend values
}

// Add coins
async function addCoins(amount) {
  const result = await api.request('/coins/add', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
  return result.coins;  // Backend updated balance
}

// Unlock premium
async function unlockPremium() {
  try {
    const result = await api.request('/premium/unlock', {
      method: 'POST',
      body: JSON.stringify({ durationDays: 30 }),
    });
    
    if (result.success) {
      alert('Premium unlocked!');
      return result;
    }
  } catch (error) {
    if (error.message === 'INSUFFICIENT_COINS') {
      alert('Not enough coins!');
    }
  }
}

// Create ad
async function createAd(adData) {
  try {
    const ad = await api.request('/ads/create', {
      method: 'POST',
      body: JSON.stringify(adData),
    });
    
    alert('Ad created successfully!');
    return ad;
  } catch (error) {
    alert(error.message);  // Show backend error
  }
}
```

### Vue.js Example

```javascript
// store/user.js
export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    loading: false,
  }),
  
  actions: {
    async fetchProfile() {
      this.loading = true;
      const response = await fetch('/user/profile', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      this.user = await response.json();
      this.loading = false;
    },
    
    async addCoins(amount) {
      const response = await fetch('/coins/add', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
      });
      
      const result = await response.json();
      this.user.coins = result.coins;  // Update with backend value
    },
    
    async unlockPremium() {
      const response = await fetch('/premium/unlock', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ durationDays: 30 })
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.user.isPremium = true;
        this.user.coins = result.remainingCoins;
      } else {
        throw new Error(result.message);
      }
    }
  }
});
```

---

## ✅ Validation Rules

### User Profile
- Email: Valid email format, unique
- Password: Min 8 characters (hashed with bcrypt)
- Username: Min 3 characters, unique
- Age: 13-120

### Coins
- Amount: Must be > 0
- Balance: Cannot be negative
- All operations logged

### Premium
- Cost: 20,000 coins (backend enforced)
- Duration: 30 days default
- Cannot unlock if already premium

### Ads
- Title: 5-200 characters
- Description: Min 10 characters
- Price: >= 0
- Video ads: Premium only
- 4+ images: Premium only

---

## 🔍 Testing Endpoints

### Test with cURL

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}'

# Get profile
curl http://localhost:3000/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN"

# Add coins
curl -X POST http://localhost:3000/coins/add \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":100}'

# Unlock premium
curl -X POST http://localhost:3000/premium/unlock \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"durationDays":30}'

# Create ad
curl -X POST http://localhost:3000/ads/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Test Ad",
    "description":"Test description here",
    "category":"TECH",
    "price":100,
    "location":"NY"
  }'
```

---

## 🚨 Common Errors

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```
**Solution:** Include valid JWT token in Authorization header

### 400 Bad Request - Insufficient Coins
```json
{
  "success": false,
  "message": "INSUFFICIENT_COINS",
  "required": 20000,
  "current": 8000
}
```
**Solution:** Add more coins before attempting operation

### 403 Forbidden - Premium Required
```json
{
  "statusCode": 403,
  "message": "Video ads require premium membership"
}
```
**Solution:** Unlock premium first using `/premium/unlock`

### 400 Bad Request - Validation Error
```json
{
  "statusCode": 400,
  "message": "Title must be between 5 and 200 characters"
}
```
**Solution:** Fix the validation error in request data

---

## 📊 Backend Guarantees

✅ **Coin balance** always reflects database value  
✅ **Premium status** calculated from `premiumExpiresAt`  
✅ **User ID** extracted from JWT token only  
✅ **All validations** run on backend  
✅ **Frontend cannot** bypass any checks  
✅ **Audit logs** track all operations  

---

**Remember:** Backend is the single source of truth! 🔒
