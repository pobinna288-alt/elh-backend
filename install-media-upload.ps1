# Media Upload System - Installation Script

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "   Media Upload System - Installation" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install Node dependencies
Write-Host "[1/4] Installing Node dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Check FFmpeg installation
Write-Host "[2/4] Checking FFmpeg installation..." -ForegroundColor Yellow
$ffmpegExists = Get-Command ffmpeg -ErrorAction SilentlyContinue
$ffprobeExists = Get-Command ffprobe -ErrorAction SilentlyContinue

if ($ffmpegExists -and $ffprobeExists) {
    Write-Host "✓ FFmpeg is already installed" -ForegroundColor Green
    $version = ffmpeg -version | Select-Object -First 1
    Write-Host "  $version" -ForegroundColor Gray
} else {
    Write-Host "⚠ FFmpeg is not installed" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please install FFmpeg:" -ForegroundColor White
    Write-Host "  1. Using Chocolatey: choco install ffmpeg" -ForegroundColor White
    Write-Host "  2. Or download from: https://ffmpeg.org/download.html" -ForegroundColor White
    Write-Host ""
    $install = Read-Host "Would you like to install FFmpeg via Chocolatey now? (y/n)"
    
    if ($install -eq 'y' -or $install -eq 'Y') {
        $chocoExists = Get-Command choco -ErrorAction SilentlyContinue
        if ($chocoExists) {
            choco install ffmpeg -y
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ FFmpeg installed successfully" -ForegroundColor Green
            } else {
                Write-Host "⚠ FFmpeg installation failed. Please install manually." -ForegroundColor Yellow
            }
        } else {
            Write-Host "⚠ Chocolatey is not installed. Please install FFmpeg manually." -ForegroundColor Yellow
        }
    }
}
Write-Host ""

# Step 3: Create upload directories
Write-Host "[3/4] Creating upload directories..." -ForegroundColor Yellow
$directories = @(
    "uploads/original",
    "uploads/processed",
    "uploads/thumbnails",
    "uploads/temp"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  Created: $dir" -ForegroundColor Gray
    } else {
        Write-Host "  Exists: $dir" -ForegroundColor Gray
    }
}
Write-Host "✓ Upload directories created" -ForegroundColor Green
Write-Host ""

# Step 4: Database migration reminder
Write-Host "[4/4] Database migration..." -ForegroundColor Yellow
Write-Host "⚠ Don't forget to run the database migration:" -ForegroundColor Yellow
Write-Host "  psql -U your_user -d your_database -f database/schema/media-upload.sql" -ForegroundColor White
Write-Host "  OR" -ForegroundColor White
Write-Host "  npm run typeorm migration:run" -ForegroundColor White
Write-Host ""

# Summary
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "   Installation Summary" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ Node dependencies installed" -ForegroundColor Green
Write-Host "✓ Upload directories created" -ForegroundColor Green

if ($ffmpegExists -and $ffprobeExists) {
    Write-Host "✓ FFmpeg is installed" -ForegroundColor Green
} else {
    Write-Host "⚠ FFmpeg needs to be installed" -ForegroundColor Yellow
}

Write-Host "⚠ Database migration pending" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Install FFmpeg (if not done)" -ForegroundColor White
Write-Host "  2. Run database migration" -ForegroundColor White
Write-Host "  3. Start server: npm run start:dev" -ForegroundColor White
Write-Host "  4. Test endpoint: POST /api/v1/ads/upload-video" -ForegroundColor White
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "  • MEDIA_UPLOAD_SUMMARY.md - Complete overview" -ForegroundColor White
Write-Host "  • MEDIA_UPLOAD_GUIDE.md - Detailed guide" -ForegroundColor White
Write-Host "  • MEDIA_UPLOAD_QUICK_REF.md - Quick reference" -ForegroundColor White
Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan
