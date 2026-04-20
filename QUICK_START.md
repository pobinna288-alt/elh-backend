# 🚀 Quick Start Guide - FIXED

## ✅ All Connection Issues Fixed

All frontend files now point to **port 5000** where the main server runs.

---

## 🎯 Start Backend Server

**Option 1: Double-click the batch file**
```
START_SERVER.bat
```

**Option 2: Run from terminal**
```bash
node server.js
```

**Expected Output:**
```
===========================================
🚀 EL HANNORA Backend Server Started
===========================================
📡 Server running on: http://localhost:5000
🌐 Health check: http://localhost:5000/health
```

---

## 🧪 Test Connection

Open any of these HTML files in your browser:

1. **[TEST_BACKEND_CONNECTION.html](TEST_BACKEND_CONNECTION.html)** - Complete test suite
2. **[test-endpoints.html](test-endpoints.html)** - Endpoint tester
3. **[FRONTEND_FIXED.html](FRONTEND_FIXED.html)** - Main frontend (port 5000)
4. **[payment-test.html](payment-test.html)** - Payment testing (port 5000)

---

## ✅ What Was Fixed

### 1. **Port Configuration**
- ✅ All HTML files updated to use **port 5000**
- ✅ Server runs on **port 5000** (server.js line 20)

### 2. **CORS Configuration**
- ✅ CORS now allows **all origins** during development
- ✅ Fixed CORS to accept `file://` protocol
- ✅ Added OPTIONS method support

### 3. **Files Updated**
- ✅ [TEST_BACKEND_CONNECTION.html](TEST_BACKEND_CONNECTION.html) → port 5000
- ✅ [test-endpoints.html](test-endpoints.html) → port 5000
- ✅ [payment-test.html](payment-test.html) → port 5000
- ✅ [FRONTEND_FIXED.html](FRONTEND_FIXED.html) → port 5000
- ✅ [server.js](server.js) → CORS accepts all origins

---

## 🎮 Demo Account

**Email:** demo@gmail.com  
**Password:** password123

---

## 🔍 Verify Server is Running

Visit: http://localhost:5000/health

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-19T...",
  "uptime": 123.456
}
```

---

## 🚨 Troubleshooting

### Backend won't start?
```bash
# Install dependencies first
npm install

# Then start
node server.js
```

### Port already in use?
```bash
# Check what's using port 5000
netstat -ano | findstr :5000

# Kill the process or restart your computer
```

### Still can't connect?
1. ✅ Check backend is running (you should see startup message)
2. ✅ Check browser console (F12) for errors
3. ✅ Try http://localhost:5000/health directly in browser
4. ✅ Disable any VPN or firewall temporarily

---

## ✅ SUCCESS INDICATORS

When everything works:
- ✅ Server shows: `Server running on: http://localhost:5000`
- ✅ Browser console shows no CORS errors
- ✅ Test pages show "✅ Backend is reachable!"
- ✅ Login/signup works without errors

---

**🎉 Everything is now configured correctly!**
