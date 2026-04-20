# 🎥 Media Upload System - Quick Start

## Installation (One Command!)

```powershell
.\install-media-upload.ps1
```

This will:
- Install npm dependencies (multer)
- Check/install FFmpeg
- Create upload directories
- Guide you through database migration

## Manual Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Install FFmpeg**
   ```bash
   choco install ffmpeg
   ```

3. **Run Migration**
   ```bash
   psql -U user -d db -f database/schema/media-upload.sql
   ```

4. **Start Server**
   ```bash
   npm run start:dev
   ```

## Quick Test

```bash
curl -X POST http://localhost:3000/api/v1/ads/upload-video \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "video=@video.mp4" \
  -F "plan=premium"
```

## Plan Limits

| Plan    | Duration | Size  | Compression | Watermark |
|---------|----------|-------|-------------|-----------|
| Normal  | 2 min    | 20MB  | High        | Yes       |
| Premium | 3 min    | 40MB  | Medium      | No        |
| Pro     | 5 min    | 80MB  | Low         | No        |
| Hot     | 10 min   | 120MB | Minimal     | No        |

## Documentation

- **[MEDIA_UPLOAD_SUMMARY.md](MEDIA_UPLOAD_SUMMARY.md)** - Implementation overview
- **[MEDIA_UPLOAD_GUIDE.md](MEDIA_UPLOAD_GUIDE.md)** - Complete guide
- **[MEDIA_UPLOAD_QUICK_REF.md](MEDIA_UPLOAD_QUICK_REF.md)** - Quick reference

## Files Created

✅ 7 new files, 6 modified
✅ Complete upload endpoint
✅ Video processing service
✅ Plan-based restrictions
✅ Full documentation

Ready to use!
