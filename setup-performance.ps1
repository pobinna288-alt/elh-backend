# High-Performance Backend Setup Script
# Run this script to set up your high-performance backend

Write-Host "🚀 High-Performance Backend Setup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if npm is installed
Write-Host "Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm $npmVersion installed" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found. Please install npm first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Installing Performance Dependencies..." -ForegroundColor Cyan
Write-Host "This may take a few minutes..." -ForegroundColor Yellow
Write-Host ""

# Install dependencies
$dependencies = @(
    "@nestjs/cache-manager",
    "cache-manager",
    "cache-manager-redis-yet",
    "@nestjs/bull",
    "bull",
    "ioredis",
    "@nestjs/throttler",
    "nestjs-throttler-storage-redis"
)

try {
    npm install --save $dependencies
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    Write-Host "Please run manually: npm install --save $($dependencies -join ' ')" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "📦 Installing Dev Dependencies..." -ForegroundColor Cyan

$devDependencies = @(
    "@types/bull",
    "@types/ioredis"
)

try {
    npm install --save-dev $devDependencies
    Write-Host "✅ Dev dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Failed to install dev dependencies (non-critical)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔍 Checking Redis..." -ForegroundColor Cyan

# Check if Redis is running
try {
    $redisCheck = redis-cli PING 2>&1
    if ($redisCheck -match "PONG") {
        Write-Host "✅ Redis is running" -ForegroundColor Green
    } else {
        throw "Redis not responding"
    }
} catch {
    Write-Host "⚠️ Redis not found or not running" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To install Redis:" -ForegroundColor Cyan
    Write-Host "  Option 1 (Docker - Recommended):" -ForegroundColor White
    Write-Host "    docker run -d --name redis -p 6379:6379 redis:alpine" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Option 2 (Native Windows):" -ForegroundColor White
    Write-Host "    Download from: https://github.com/microsoftarchive/redis/releases" -ForegroundColor Gray
    Write-Host ""
}

Write-Host ""
Write-Host "📝 Setting up environment file..." -ForegroundColor Cyan

# Check if .env exists
if (Test-Path ".env") {
    Write-Host "⚠️ .env file already exists. Skipping..." -ForegroundColor Yellow
} elseif (Test-Path ".env.template") {
    Copy-Item ".env.template" ".env"
    Write-Host "✅ Created .env from template" -ForegroundColor Green
    Write-Host "⚠️ Please edit .env with your actual values!" -ForegroundColor Yellow
} else {
    Write-Host "⚠️ .env.template not found. Please create .env manually" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🗄️ Database Setup" -ForegroundColor Cyan
Write-Host ""
Write-Host "To apply database indexes (CRITICAL for performance):" -ForegroundColor Yellow
Write-Host "  psql -U postgres -d elh_backend -f database/indexes/performance-indexes.sql" -ForegroundColor Gray
Write-Host ""

Write-Host ""
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Start Redis (if not running)" -ForegroundColor White
Write-Host "  2. Edit .env with your configuration" -ForegroundColor White
Write-Host "  3. Apply database indexes" -ForegroundColor White
Write-Host "  4. Start the server: npm run start:dev" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "  • Quick Start: QUICK_START_PERFORMANCE.md" -ForegroundColor White
Write-Host "  • Architecture: PERFORMANCE_ARCHITECTURE.md" -ForegroundColor White
Write-Host "  • Quick Reference: PERFORMANCE_QUICK_REF.md" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Your high-performance backend is ready!" -ForegroundColor Green
Write-Host ""
