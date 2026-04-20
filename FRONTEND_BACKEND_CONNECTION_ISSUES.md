# 🔴 CRITICAL: Frontend-Backend Connection Issues

## ❌ ISSUE #1: PORT MISMATCH (CRITICAL)

### Frontend Configuration (HTML Line ~2150):
```javascript
const API_CONFIG = {
    BASE_URL: 'http://localhost:4000', // ❌ WRONG PORT
    TIMEOUT: 10000,
    HEADERS: {
        'Content-Type': 'application/json'
    }
};
```

### Backend Configuration (server.js Line 20):
```javascript
const PORT = process.env.PORT || 3002; // ✅ ACTUAL PORT
```

### **Problem:**
- **Frontend is trying to connect to port 4000**
- **Backend is running on port 3002** (or 3001/3000 depending on which server)
- This causes ALL API requests to fail with "Server not reachable" error

### **Solution:**
The user needs to either:
1. **Change frontend to use port 3002**: `BASE_URL: 'http://localhost:3002'`
2. **OR change backend to use port 4000**: `const PORT = 4000;`

---

## ❌ ISSUE #2: ENDPOINT MISMATCH (CRITICAL)

### Frontend Login Request (HTML Line ~5400):
```javascript
const result = await apiClient.post('/auth/login', {
    email: email,
    password: password
});
```

### Frontend Signup Request (HTML Line ~5450):
```javascript
const result = await apiClient.post('/auth/signup', {  // ❌ WRONG ENDPOINT
    name: name,
    email: email,
    password: password
});
```

### Backend Endpoints (server.js):
```javascript
app.post("/auth/register", async (req, res) => {  // ✅ ACTUAL ENDPOINT
    // Signup logic
});

app.post("/auth/login", async (req, res) => {  // ✅ Correct
    // Login logic
});
```

### **Problem:**
- **Frontend sends to `/auth/signup`** (doesn't exist)
- **Backend expects `/auth/register`**
- Login works but signup will fail with 404 Not Found

### **Solution:**
Change frontend signup endpoint from `/auth/signup` to `/auth/register`

---

## ❌ ISSUE #3: CORS ORIGIN MISMATCH

### Frontend Location:
- Likely served from `file://` or a different origin

### Backend CORS (server.js Line 30):
```javascript
app.use(cors({
  origin: "http://127.0.0.1:5173",  // ❌ ONLY ALLOWS THIS ORIGIN
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
```

### **Problem:**
- If frontend is opened from file system (`file://`) or any port other than 5173, CORS will block requests
- Backend only accepts requests from `http://127.0.0.1:5173`

### **Solution:**
Change backend CORS to allow all origins during development:
```javascript
app.use(cors({
  origin: "*",  // Allow all origins
  credentials: true
}));
```

OR serve frontend from the correct port (5173)

---

## ❌ ISSUE #4: PARAMETER MISMATCH IN SIGNUP

### Frontend Signup Payload (HTML Line ~5450):
```javascript
const result = await apiClient.post('/auth/signup', {
    name: name,          // ❌ WRONG FIELD NAME
    email: email,
    password: password
});
```

### Backend Expects (server.js Line 195):
```javascript
const { fullName, email, password, age, location } = req.body;  // ✅ EXPECTS fullName
```

### **Problem:**
- Frontend sends `name` field
- Backend expects `fullName` field
- Backend also requires `age` and `location` which frontend doesn't send
- This will cause 400 Bad Request: "All fields are required"

### **Solution:**
Frontend needs to send:
```javascript
{
    fullName: name,  // Changed from 'name'
    email: email,
    password: password,
    age: 25,         // Add age field
    location: "USA"  // Add location field
}
```

---

## ✅ ISSUE #5: USER PROFILE ENDPOINT - FIELD MISMATCH

### Frontend Request (HTML Line ~2260):
```javascript
const data = await apiClient.get('/user/profile', { showLoader: false });
// Frontend expects: data.coins, data.isPremium
```

### Backend Response (server.js Line 330):
```javascript
res.json({
  success: true,
  user: sanitizeUser(user)  // ❌ Coins nested inside user object
});
```

### **Problem:**
- Frontend expects `data.coins` and `data.isPremium` at top level
- Backend returns `data.user.coins` and `data.user.isPremium`
- This causes coins/premium status not to update properly

### **Solution:**
Backend should return:
```javascript
res.json({
  success: true,
  user: sanitizeUser(user),
  coins: user.coins,         // Add at top level
  isPremium: user.isPremium  // Add at top level
});
```

---

## ✅ ISSUE #6: PREMIUM UNLOCK ENDPOINT - PARAMETER MISMATCH

### Frontend Request (From HTML):
```javascript
const result = await apiClient.post('/premium/unlock', {
    plan: plan,              // ❌ Backend doesn't use this
    paymentMethod: 'coins'   // ✅ Correct
});
```

### Backend Expects (server.js Line 398):
```javascript
const { userId, paymentMethod, duration } = req.body;
// ❌ Backend expects userId (which it validates against token)
// ❌ Backend expects duration (defaults to 30 if not provided)
```

### **Problem:**
- Frontend doesn't send `userId` (backend can get from token instead)
- Frontend doesn't send `duration`
- Frontend sends `plan` which backend ignores
- Backend validates `userId` against token (unnecessary security check)

### **Solution:**
Backend should use userId from token:
```javascript
app.post("/premium/unlock", authenticateToken, (req, res) => {
  try {
    const { paymentMethod, duration, plan } = req.body;
    const userId = req.user.id;  // ✅ Get from token instead
    
    // Map plan to duration
    const planDurations = {
      'premium': 30,
      'pro': 30,
      'hot': 30
    };
    const durationDays = duration || planDurations[plan] || 30;
    
    // Rest of code...
  }
});
```

---

## ❌ ISSUE #7: TOKEN RESPONSE FIELD MISMATCH

### Frontend Expects (HTML Line ~5405):
```javascript
if (result.token) {
    localStorage.setItem('authToken', result.token);
}
if (result.user) {
    currentUser = result.user;
}
if (result.coins !== undefined) {
    userCoins = result.coins;
}
```

### Backend Login Response (server.js Line ~310):
```javascript
res.json({
  success: true,
  message: "Login successful",
  token,
  user: sanitizeUser(user)  // ✅ User object without coins field
});
```

### **Problem:**
- Backend user object doesn't include `coins` field at top level
- Frontend expects `result.coins` to be separate from user object
- This causes coins not to update after login

### **Solution:**
Backend should return:
```javascript
res.json({
  success: true,
  message: "Login successful",
  token,
  user: sanitizeUser(user),
  coins: user.coins,        // Add coins at top level
  isPremium: user.isPremium  // Add premium status at top level
});
```

---

## 📋 SUMMARY OF ALL ERRORS

### Critical Errors (App won't work):
1. ❌ **PORT MISMATCH**: Frontend → 4000, Backend → 3002
2. ❌ **SIGNUP ENDPOINT**: Frontend → `/auth/signup`, Backend → `/auth/register`
3. ❌ **CORS RESTRICTION**: Only allows port 5173
4. ❌ **MISSING FIELDS**: Signup needs `fullName`, `age`, `location`

### Important Errors (Features broken):
5. ❌ **NO USER PROFILE ENDPOINT**: `/user/profile` doesn't exist
6. ❌ **NO PREMIUM UNLOCK ENDPOINT**: `/premium/unlock` doesn't exist
7. ❌ **COINS NOT RETURNED**: Login response missing coins field

---

## 🔧 QUICK FIX CHECKLIST

### Option A: Fix Frontend (Easier)
1. Change `BASE_URL: 'http://localhost:3002'`
2. Change `/auth/signup` to `/auth/register`
3. Add `fullName`, `age`, `location` to signup payload
4. Remove `/user/profile` call or handle 404 gracefully
5. Remove `/premium/unlock` call or handle 404 gracefully

### Option B: Fix Backend (Better)
1. Change `PORT` to 4000
2. Add `/auth/signup` alias that calls `/auth/register`
3. Accept `name` field and map to `fullName`
4. Make `age` and `location` optional with defaults
5. Add `/user/profile` endpoint
6. Add `/premium/unlock` endpoint
7. Return `coins` and `isPremium` in login response

---

## 🚀 RECOMMENDED ACTION

**Fix the backend** to match what the frontend expects. This is the best approach because:
- Frontend code is complex and harder to change
- Backend is simpler to modify
- Other frontends might depend on these endpoints
- Better to have flexible backend than rigid frontend

### Priority Order:
1. **CRITICAL**: Fix PORT to 4000
2. **CRITICAL**: Add `/auth/signup` endpoint or alias
3. **CRITICAL**: Fix CORS to allow all origins
4. **HIGH**: Make age/location optional in signup
5. **MEDIUM**: Add `/user/profile` endpoint
6. **MEDIUM**: Add `/premium/unlock` endpoint
7. **LOW**: Return coins/premium in login response

---

## 📝 NOTES

- The frontend has excellent error handling with apiClient
- All errors are caught and displayed to user
- The "Server not reachable" error is correct - port mismatch prevents connection
- Once port is fixed, other endpoint errors will become visible
- The frontend is well-structured and follows best practices
- Backend is simple and can easily be extended

---

## ⚠️ SECURITY ISSUES FOUND

While analyzing, I also found these security concerns:

1. **JWT_SECRET in code**: Should be in .env only
2. **CORS too permissive**: Should be restricted in production
3. **No rate limiting**: Authentication endpoints need rate limiting
4. **No input sanitization**: XSS vulnerability potential
5. **Passwords too short**: Minimum 6 chars is weak (should be 8+)

These should be fixed before production deployment.
