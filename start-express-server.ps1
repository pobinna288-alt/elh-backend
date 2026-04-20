# ELH Backend - Quick Start Script
# This script will set up and start your Express.js backend server

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  ELH BACKEND - QUICK START" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "[1/4] Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found! Please install Node.js from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Navigate to express-server directory
Write-Host ""
Write-Host "[2/4] Setting up directory..." -ForegroundColor Yellow
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverPath = Join-Path $scriptPath "express-server"

if (-not (Test-Path $serverPath)) {
    New-Item -ItemType Directory -Path $serverPath -Force | Out-Null
}

Set-Location $serverPath
Write-Host "✓ Directory ready: $serverPath" -ForegroundColor Green

# Install dependencies
Write-Host ""
Write-Host "[3/4] Installing dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "   This may take a minute..." -ForegroundColor Gray
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✓ Dependencies already installed" -ForegroundColor Green
}

# Start server
Write-Host ""
Write-Host "[4/4] Starting server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  SERVER INFORMATION" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "API Base URL:    http://localhost:3001/api" -ForegroundColor White
Write-Host "Health Check:    http://localhost:3001/api/health" -ForegroundColor White
Write-Host "API Tester:      Open api-tester.html in browser" -ForegroundColor White
Write-Host ""
Write-Host "Test Credentials:" -ForegroundColor Yellow
Write-Host "  Email: demo@elh.com" -ForegroundColor White
Write-Host "  Password: demo123" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Start the server
npm start
