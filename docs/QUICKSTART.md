# 🚀 Quick Start - Testing Registration Backend

## Prerequisites
Ensure you have the following installed:
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL (or use Docker)

---

## 1️⃣ Install Dependencies

```powershell
cd "c:\Users\User\Desktop\ELH backend"
npm install
```

This will install all required packages including:
- `@nestjs/common`, `@nestjs/core`
- `@nestjs/typeorm`, `typeorm`, `pg`
- `@nestjs/jwt`, `@nestjs/passport`
- `bcrypt`, `class-validator`, `class-transformer`

---

## 2️⃣ Start Database (Docker)

```powershell
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Check if running
docker-compose ps
```

**Alternative:** Use local PostgreSQL and update `.env` file.

---

## 3️⃣ Configure Environment

Ensure your `.env` file has these settings:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=elh_ads_platform

JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

---

## 4️⃣ Run Database Migrations

**Option A: TypeORM CLI**
```powershell
npm run migration:run
```

**Option B: Run SQL Directly**
```powershell
# Connect to PostgreSQL
docker exec -it elh-postgres psql -U postgres -d elh_ads_platform

# Then paste the contents of database/schema/users.sql
```

---

## 5️⃣ Start Backend Server

```powershell
npm run start:dev
```

You should see:
```
[Nest] Application successfully started
[Nest] Listening on port 3000
[Nest] Swagger docs available at http://localhost:3000/api/docs
```

---

## 6️⃣ Test Registration Endpoint

### **Using PowerShell (curl)**

**Valid Registration:**
```powershell
curl -X POST http://localhost:3000/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -d '{
    "fullName": "Jane Doe",
    "email": "jane@example.com",
    "password": "SecurePass123",
    "confirmPassword": "SecurePass123",
    "age": 25,
    "location": "New York, NY"
  }'
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "jane@example.com",
      "fullName": "Jane Doe",
      "username": "jane",
      "age": 25,
      "location": "New York, NY",
      "role": "user",
      "coins": 0,
      "isEmailVerified": false,
      "referralCode": "USER1234"
    }
  }
}
```

---

### **Using Postman**

1. **Create New Request**
   - Method: `POST`
   - URL: `http://localhost:3000/api/v1/auth/register`
   
2. **Headers**
   ```
   Content-Type: application/json
   ```

3. **Body (raw JSON)**
   ```json
   {
     "fullName": "John Smith",
     "email": "john@example.com",
     "password": "MySecure123",
     "confirmPassword": "MySecure123",
     "age": 30,
     "location": "Chicago, IL"
   }
   ```

4. **Send** → Should get 201 Created

---

### **Using Swagger UI**

1. Open browser: http://localhost:3000/api/docs
2. Find `POST /api/v1/auth/register`
3. Click **"Try it out"**
4. Fill in the example values
5. Click **"Execute"**
6. Check response below

---

## 7️⃣ Test Validation Errors

### **Weak Password**
```powershell
curl -X POST http://localhost:3000/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "password": "weak",
    "confirmPassword": "weak",
    "age": 25,
    "location": "LA"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "statusCode": 400,
  "message": [
    "Password must be at least 8 characters long",
    "Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number"
  ]
}
```

---

### **Password Mismatch**
```powershell
curl -X POST http://localhost:3000/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "password": "SecurePass123",
    "confirmPassword": "DifferentPass123",
    "age": 25,
    "location": "LA"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "statusCode": 400,
  "message": ["Passwords do not match"]
}
```

---

### **Duplicate Email**
```powershell
# Register the same email twice
curl -X POST http://localhost:3000/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -d '{
    "fullName": "Jane Doe",
    "email": "jane@example.com",
    "password": "SecurePass123",
    "confirmPassword": "SecurePass123",
    "age": 25,
    "location": "New York"
  }'
```

**Expected Response (409 Conflict):**
```json
{
  "success": false,
  "statusCode": 409,
  "message": "An account with this email already exists"
}
```

---

### **Age Too Young**
```powershell
curl -X POST http://localhost:3000/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -d '{
    "fullName": "Young User",
    "email": "young@example.com",
    "password": "SecurePass123",
    "confirmPassword": "SecurePass123",
    "age": 10,
    "location": "LA"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "statusCode": 400,
  "message": ["You must be at least 13 years old to register"]
}
```

---

## 8️⃣ Verify in Database

```powershell
# Connect to PostgreSQL
docker exec -it elh-postgres psql -U postgres -d elh_ads_platform

# View registered users
SELECT id, email, full_name, username, age, location, is_email_verified, coins, referral_code, created_at 
FROM users;

# Check password is hashed
SELECT email, password FROM users WHERE email = 'jane@example.com';
```

**Expected:**
- Password should be a bcrypt hash (starts with `$2b$`)
- Email should be lowercase
- `is_email_verified` should be `false`
- `referral_code` should be generated

---

## 9️⃣ Test Referral System

### **Step 1: Get First User's Referral Code**
```sql
SELECT referral_code FROM users WHERE email = 'jane@example.com';
-- Returns: USER1234 (example)
```

### **Step 2: Register Second User with Referral Code**
```powershell
curl -X POST http://localhost:3000/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -d '{
    "fullName": "Bob Referrer",
    "email": "bob@example.com",
    "password": "SecurePass123",
    "confirmPassword": "SecurePass123",
    "age": 28,
    "location": "Miami, FL",
    "referralCode": "USER1234"
  }'
```

### **Step 3: Verify Both Users Got Coins**
```sql
-- Check referrer (Jane)
SELECT email, coins, referral_count, referral_earnings 
FROM users WHERE email = 'jane@example.com';
-- Expected: coins = 50, referral_count = 1, referral_earnings = 50

-- Check referred user (Bob)
SELECT email, coins, referred_by 
FROM users WHERE email = 'bob@example.com';
-- Expected: coins = 50, referred_by = 'USER1234'
```

---

## 🐛 Troubleshooting

### **"Cannot connect to database"**
```powershell
# Check if PostgreSQL is running
docker-compose ps

# Restart database
docker-compose restart postgres
```

### **"Port 3000 already in use"**
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

### **"Module not found" errors**
```powershell
# Reinstall dependencies
rm -rf node_modules
npm install
```

### **TypeORM connection errors**
- Check `.env` file has correct database credentials
- Ensure `DB_HOST=localhost` when using Docker
- Try `DB_HOST=127.0.0.1` if localhost doesn't work

---

## 📊 Success Checklist

- [ ] Backend server starts without errors
- [ ] Can register new user with valid data
- [ ] Receives JWT tokens in response
- [ ] Password is hashed in database
- [ ] Email is normalized (lowercase)
- [ ] Weak password is rejected
- [ ] Password mismatch is detected
- [ ] Duplicate email is prevented
- [ ] Age validation works (min 13)
- [ ] Referral system awards coins
- [ ] Swagger UI is accessible

---

## 📝 Next Steps After Testing

1. **Test Login Endpoint**
   ```powershell
   curl -X POST http://localhost:3000/api/v1/auth/login `
     -H "Content-Type: application/json" `
     -d '{
       "email": "jane@example.com",
       "password": "SecurePass123"
     }'
   ```

2. **Test Protected Routes** (use accessToken from registration response)
   ```powershell
   curl http://localhost:3000/api/v1/users/profile `
     -H "Authorization: Bearer <your_access_token>"
   ```

3. **Implement Email Verification** (see REGISTRATION.md for details)

4. **Add Rate Limiting** (prevent brute force attacks)

5. **Set up Frontend Integration**

---

## 📚 Documentation

- Full API Docs: [`docs/api/REGISTRATION.md`](REGISTRATION.md)
- Implementation Summary: [`docs/api/REGISTRATION_SUMMARY.md`](REGISTRATION_SUMMARY.md)
- Database Schema: [`database/schema/users.sql`](../../database/schema/users.sql)

---

**Last Updated:** January 12, 2026  
**Status:** ✅ Ready for Testing
