# 🚀 EL HANNORA Backend - Startup Guide

## 📋 Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

## ⚡ Quick Start

### 1. Install Dependencies
```powershell
npm install express cors jsonwebtoken bcryptjs dotenv uuid
```

Or if you prefer to use the package.json:
```powershell
# Copy server-package.json to package.json if needed
npm install
```

### 2. Start the Server
```powershell
node server.js
```

The server will start on **http://localhost:3000**

### 3. Verify Connection
Open your browser and visit:
- **Health Check**: http://localhost:3000/health
- You should see: `{"status":"ok",...}`

---

## 🎯 Test Endpoints

### Demo Account
- **Email**: `demo@elh.com`
- **Password**: `password123`

### Using PowerShell to Test

#### 1. Login
```powershell
$body = @{
    email = "demo@elh.com"
    password = "password123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method Post -Body $body -ContentType "application/json"
$token = $response.token
Write-Host "Token: $token"
Write-Host "User: $($response.user.fullName)"
Write-Host "Coins: $($response.user.coins)"
```

#### 2. Get Profile (with JWT)
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}
$profile = Invoke-RestMethod -Uri "http://localhost:3000/user/profile" -Method Get -Headers $headers
Write-Host "Profile: $($profile.user | ConvertTo-Json)"
```

#### 3. Create an Ad
```powershell
$adBody = @{
    title = "Test Product"
    description = "This is a test ad"
    price = 99.99
    category = "Tech"
    location = "New York"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
}
$ad = Invoke-RestMethod -Uri "http://localhost:3000/ads/create" -Method Post -Body $adBody -ContentType "application/json" -Headers $headers
Write-Host "Ad Created: $($ad.ad.id)"
```

#### 4. Get Notifications
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}
$notifications = Invoke-RestMethod -Uri "http://localhost:3000/notifications" -Method Get -Headers $headers
Write-Host "Notifications: $($notifications.notifications.Count)"
```

---

## 📡 Available Endpoints

### Public Endpoints (No Authentication Required)
- `GET /health` - Health check
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /ads/list` - List all ads

### Protected Endpoints (Requires JWT Token)
- `GET /user/profile` - Get user profile
- `PUT /user/profile` - Update user profile
- `POST /premium/unlock` - Activate premium
- `GET /premium/status` - Check premium status
- `POST /ads/create` - Create new ad
- `GET /ads/:id` - Get ad details
- `DELETE /ads/:id` - Delete ad
- `GET /notifications` - Get notifications
- `PUT /notifications/:id/read` - Mark notification as read
- `POST /messages/send` - Send message
- `GET /messages/conversations` - Get conversations
- `GET /messages/:userId` - Get messages with user
- `GET /coins/balance` - Get coin balance
- `POST /coins/earn` - Earn coins

---

## 🔧 Configuration

### Environment Variables
Create a `.env` file:
```
PORT=3000
JWT_SECRET=elh-secret-key-2026
FRONTEND_URL=http://127.0.0.1:5173
```

---

## 🌐 Frontend Integration

### CORS Configuration
The backend is configured to accept requests from:
- **Frontend URL**: `http://127.0.0.1:5173`

### Making Requests from Frontend
```javascript
// Login example
const response = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'demo@elh.com',
    password: 'password123'
  })
});

const data = await response.json();
const token = data.token;

// Store token
localStorage.setItem('token', token);
```

### Protected Requests
```javascript
// Get profile example
const token = localStorage.getItem('token');

const response = await fetch('http://localhost:3000/user/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const profile = await response.json();
```

---

## ✅ Checklist

- [x] Server listens on port 3000
- [x] CORS enabled for http://127.0.0.1:5173
- [x] JSON parsing enabled
- [x] JWT authentication implemented
- [x] Health check endpoint working
- [x] Login/Register endpoints
- [x] Premium unlock endpoint
- [x] Ads creation endpoint
- [x] Messages endpoint
- [x] Notifications endpoint
- [x] Error handling implemented

---

## 🐛 Troubleshooting

### Port Already in Use
If port 3000 is busy:
```powershell
# Check what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Frontend Cannot Connect
1. Make sure backend is running: `node server.js`
2. Check backend is on port 3000: visit http://localhost:3000/health
3. Verify frontend is on http://127.0.0.1:5173
4. Check browser console for CORS errors

### JWT Token Issues
- Token expires after 7 days
- Make sure to include `Bearer` prefix: `Authorization: Bearer <token>`
- Check token is stored correctly in frontend

---

## 📞 Support

If frontend still shows "Server not reachable":
1. ✅ Verify backend is running: `node server.js`
2. ✅ Test health endpoint: http://localhost:3000/health
3. ✅ Check CORS in browser DevTools Network tab
4. ✅ Ensure frontend uses correct backend URL

---

## 🎉 Success!

Once backend is running, your frontend should be able to:
- ✅ Login/Register users
- ✅ Unlock premium features
- ✅ Create and view ads
- ✅ Send messages
- ✅ Get notifications
- ✅ Manage coins

**Server is ready for frontend connections!** 🚀
