# 🚀 EL HANNORA Backend - Premium Ads Platform

Complete backend infrastructure for the EL HANNORA ads platform, built with **Node.js (NestJS)** and **Python (FastAPI)** microservices.

---

## 📋 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│                  (HTML/CSS/JavaScript)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ REST API
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              Node.js Backend (NestJS)                       │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │  Auth    │  Users   │   Ads    │ Payments │  Wallet  │  │
│  ├──────────┼──────────┼──────────┼──────────┼──────────┤  │
│  │ Comments │ Messages │  Redis   │   etc.   │          │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└──────────────┬───────────────────────┬──────────────────────┘
               │                       │
               │                       │ HTTP REST
               ↓                       ↓
    ┌──────────────────┐   ┌─────────────────────────┐
    │   PostgreSQL     │   │  Python Microservice    │
    │   (Main DB)      │   │      (FastAPI)          │
    └──────────────────┘   │  • Analytics            │
               │            │  • Fraud Detection      │
               │            │  • Trust Score          │
               ↓            │  • AI Recommendations   │
    ┌──────────────────┐   └─────────────────────────┘
    │      Redis       │
    │  (Cache/Counters)│
    └──────────────────┘
```

---

## 🛠️ Tech Stack

### **Node.js Backend**
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL with TypeORM
- **Cache**: Redis (ioredis)
- **Authentication**: JWT (Passport)
- **Payment**: Stripe, Paystack
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI

### **Python Microservice**
- **Framework**: FastAPI
- **ML Libraries**: scikit-learn, pandas, numpy
- **Database**: SQLAlchemy (PostgreSQL)
- **Cache**: redis-py

---

## 📦 Installation

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### 1. **Clone Repository**
```bash
cd "ELH backend"
```

### 2. **Setup Node.js Backend**

#### Install dependencies:
```bash
npm install
```

#### Configure environment:
```bash
cp .env.example .env
```

Edit `.env` file with your credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=elh_ads_platform

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=your-super-secret-jwt-key
STRIPE_SECRET_KEY=sk_test_...
PAYSTACK_SECRET_KEY=sk_test_...

PYTHON_SERVICE_URL=http://localhost:8000
```

#### Run migrations:
```bash
npm run migration:run
```

#### Start development server:
```bash
npm run start:dev
```

Backend runs at: **http://localhost:3000**  
API Docs at: **http://localhost:3000/api/docs**

---

### 3. **Setup Python Microservice**

#### Navigate to Python service:
```bash
cd python-service
```

#### Create virtual environment:
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

#### Install dependencies:
```bash
pip install -r requirements.txt
```

#### Start FastAPI server:
```bash
uvicorn app.main:app --reload --port 8000
```

Python service runs at: **http://localhost:8000**  
API Docs at: **http://localhost:8000/docs**

---

## 🐳 Docker Deployment

### **Run everything with Docker Compose:**

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Services:
- **Node.js Backend**: http://localhost:3000
- **Python Service**: http://localhost:8000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

---

## 📚 API Endpoints

### **Authentication**
```http
POST /api/v1/auth/register    # Register new user
POST /api/v1/auth/login        # Login user
```

### **Users**
```http
GET  /api/v1/users/profile     # Get current user profile
PATCH /api/v1/users/profile    # Update profile
GET  /api/v1/users/:id         # Get user by ID
```

### **Ads**
```http
POST  /api/v1/ads              # Create ad
GET   /api/v1/ads              # Get all ads (with filters)
GET   /api/v1/ads/:id          # Get ad by ID
PATCH /api/v1/ads/:id          # Update ad
DELETE /api/v1/ads/:id         # Delete ad
GET   /api/v1/ads/trending     # Get trending ads
POST  /api/v1/ads/:id/view     # Increment view count
POST  /api/v1/ads/:id/click    # Increment click count
POST  /api/v1/ads/:id/like     # Like ad
```

### **Payments**
```http
POST /api/v1/payments/stripe/create-checkout    # Stripe checkout
POST /api/v1/payments/paystack/initialize       # Paystack payment
POST /api/v1/payments/coins/purchase            # Buy coins
GET  /api/v1/payments/subscription/status       # Get subscription
```

### **Wallet**
```http
GET  /api/v1/wallet/balance             # Get coin balance
GET  /api/v1/wallet/transactions        # Get transaction history
POST /api/v1/wallet/earn-video          # Earn coins from video
POST /api/v1/wallet/keep-streak         # Maintain streak
```

### **Comments**
```http
POST   /api/v1/comments                 # Add comment
GET    /api/v1/comments/ad/:adId        # Get ad comments
DELETE /api/v1/comments/:id             # Delete comment
POST   /api/v1/comments/:id/like        # Like comment
```

### **Messages**
```http
POST /api/v1/messages/send              # Send message
GET  /api/v1/messages/conversations     # Get conversations
GET  /api/v1/messages/conversation/:id  # Get conversation messages
```

### **Python Microservice** (Internal APIs)
```http
POST /api/trust-score                   # Calculate trust score
POST /api/fraud-detection               # Detect fraud
POST /api/recommendations               # Get AI recommendations
POST /api/analytics                     # Get analytics & forecast
```

---

## 🗄️ Database Schema

### **Key Entities:**
- **users** - User accounts with roles, coins, trust scores
- **ads** - Advertisements with media, category, pricing
- **comments** - User comments on ads
- **messages** - User-to-user messaging
- **transactions** - Wallet transactions (coins, payments)

### **Relationships:**
- User → Ads (one-to-many)
- User → Comments (one-to-many)
- User → Messages (one-to-many)
- Ad → Comments (one-to-many)

---

## 🔐 Authentication

### **JWT Token-based authentication:**

1. Register or login to get access token
2. Include token in requests:
```http
Authorization: Bearer <your_access_token>
```

### **User Roles:**
- `user` - Free tier
- `premium` - Premium subscription
- `pro` - Pro business account
- `hot` - Hot business account
- `admin` - Administrator

---

## 💰 Payment Integration

### **Stripe (International)**
```typescript
POST /api/v1/payments/stripe/create-checkout
{
  "plan": "premium",  // premium | pro | hot
  "paymentType": "dollar"
}
```

### **Paystack (Nigerian)**
```typescript
POST /api/v1/payments/paystack/initialize
{
  "plan": "premium",
  "paymentType": "dollar"
}
```

### **Coins Purchase**
```typescript
POST /api/v1/payments/coins/purchase
{
  "amount": 20000,
  "paymentMethod": "stripe" // or "paystack"
}
```

---

## 🧪 Testing

### **Run tests:**
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

---

## 🚀 Production Deployment

### **Environment Variables for Production:**
```env
NODE_ENV=production
DB_HOST=your-production-db-host
REDIS_HOST=your-production-redis-host
JWT_SECRET=secure-production-secret
STRIPE_SECRET_KEY=sk_live_...
PAYSTACK_SECRET_KEY=sk_live_...
```

### **Build for production:**
```bash
npm run build
npm run start:prod
```

### **PM2 (Process Manager):**
```bash
npm install -g pm2
pm2 start dist/main.js --name elh-backend
pm2 save
pm2 startup
```

---

## 📊 Monitoring & Logs

### **View logs:**
```bash
# Docker
docker-compose logs -f backend
docker-compose logs -f python_service

# PM2
pm2 logs elh-backend
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📝 License

MIT License - see LICENSE file for details

---

## 👥 Team

**EL HANNORA Development Team**

---

## 📞 Support

For issues and questions:
- GitHub Issues
- Email: support@elhannora.com

---

## 🎯 Roadmap

- [ ] Real-time chat with WebSockets
- [ ] Advanced ML recommendations
- [ ] Mobile app API optimization
- [ ] Multi-language support
- [ ] Video processing pipeline
- [ ] Advanced fraud detection models

---

**Built with ❤️ using NestJS & FastAPI**
