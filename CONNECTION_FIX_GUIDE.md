# 🔧 CONNECTION FIX - STEP BY STEP GUIDE

## ❌ PROBLEM IDENTIFIED:
**PORT MISMATCH** - Frontend expecting port 4000, but backend running on port 3001

---

## ✅ SOLUTION (3 STEPS):

### **STEP 1: Fix Your HTML File**

In your HTML file, find this line (around line 820):

```javascript
BASE_URL: 'http://localhost:4000', // ❌ WRONG
```

**Change it to:**

```javascript
BASE_URL: 'http://localhost:3001', // ✅ CORRECT
```

---

### **STEP 2: Start Backend Server**

Open terminal and run:

```bash
cd "c:\Users\User\Desktop\ELH backend\express-server"
node server.js
```

**Expected output:**
```
🚀 Server running on http://localhost:3001
✅ Database initialized
✅ CORS enabled for frontend
```

**If you see errors:**
- `Cannot find module` → Run: `npm install`
- `Port already in use` → Kill process on port 3001 or change port
- `EADDRINUSE` → Another app is using port 3001

---

### **STEP 3: Test Connection**

1. **Open your HTML file** in browser
2. **Open Developer Console** (Press F12)
3. **Look for these messages:**

✅ **SUCCESS:**
```
🔍 Testing backend connection...
📍 Backend URL: http://localhost:3001
✅ Backend is reachable!
```

❌ **FAILURE:**
```
❌ Backend NOT reachable: Failed to fetch
```

---

## 📋 **CHECKLIST:**

- [ ] Backend server is running (`node server.js`)
- [ ] Frontend `BASE_URL` points to `http://localhost:3001`
- [ ] No firewall blocking port 3001
- [ ] Browser console shows no CORS errors
- [ ] You see "Backend is reachable" message

---

## 🚨 **STILL NOT WORKING?**

### Check 1: Is backend actually running?
```bash
curl http://localhost:3001/health
```
Should return: `{"status":"ok"}`

### Check 2: Check port
```bash
netstat -ano | findstr :3001
```
Should show something listening on port 3001

### Check 3: Backend logs
Look at backend terminal - should show:
```
[2026-01-19T...] POST /auth/login
```

---

## 🎯 **QUICK FIX - Copy This Exact Code:**

Replace your `API_CONFIG` with:

```javascript
const API_CONFIG = {
    BASE_URL: 'http://localhost:3001', // Express server
    TIMEOUT: 10000,
    HEADERS: {
        'Content-Type': 'application/json'
    }
};
```

---

## 📞 **DEBUGGING COMMANDS:**

### Test backend is running:
```bash
curl http://localhost:3001/health
```

### Test login endpoint:
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@test.com\",\"password\":\"password123\"}"
```

### Check if port is open:
```bash
telnet localhost 3001
```

---

## ✅ **BACKEND PORTS:**

- `server.js` → Port **4000** (not used currently)
- `express-server/server.js` → Port **3001** ⭐ USE THIS
- `paystack-premium/server.js` → Port **3000**

**Your frontend should connect to port 3001**

---

## 🔄 **IF YOU WANT TO USE PORT 4000 INSTEAD:**

Option A: Change backend port in `express-server/server.js`:
```javascript
const PORT = process.env.PORT || 4000; // Change 3001 to 4000
```

Option B: Use the main `server.js` instead:
```bash
node server.js  # This runs on port 4000
```

---

## 📝 **SUMMARY:**

1. ✅ **Backend CORS fixed** - Now allows file:// protocol
2. ✅ **Port documented** - Express server uses 3001
3. ✅ **Frontend needs update** - Change BASE_URL to port 3001
4. ✅ **Debugging added** - Console logs show connection status

**After fixing, you should see "Backend is reachable" popup!**
