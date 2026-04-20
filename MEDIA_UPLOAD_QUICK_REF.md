# Media Upload System - Quick Reference

## Installation Steps

1. **Install Dependencies**
   ```bash
   npm install multer @types/multer
   ```

2. **Install FFmpeg**
   ```bash
   # Windows (Chocolatey)
   choco install ffmpeg
   
   # Linux
   sudo apt install ffmpeg
   
   # macOS
   brew install ffmpeg
   ```

3. **Run Migration**
   ```bash
   psql -U user -d database -f database/schema/media-upload.sql
   ```

## API Endpoint

```http
POST /ads/upload-video
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
- video: File (required)
- plan: "normal"|"premium"|"pro"|"hot" (required)
- adId: string (optional)
```

## Plan Limits at a Glance

| Plan    | Duration | Size  | Compression | Watermark |
|---------|----------|-------|-------------|-----------|
| Normal  | 2 min    | 20MB  | High        | Yes       |
| Premium | 3 min    | 40MB  | Medium      | No        |
| Pro     | 5 min    | 80MB  | Low         | No        |
| Hot Ads | 10 min   | 120MB | Minimal     | No        |

## Role Access

- **user**: Normal only
- **premium**: Normal, Premium
- **pro**: Normal, Premium, Pro
- **hot**: All plans

## Response Example

```json
{
  "originalUrl": "/uploads/original/abc123_original.mp4",
  "processedUrl": "/uploads/processed/abc123_processed.mp4",
  "thumbnailUrl": "/uploads/thumbnails/abc123_thumb.jpg",
  "duration": 165.5,
  "fileSize": 35840000,
  "compressed": true,
  "watermarked": false,
  "plan": "premium"
}
```

## Common Errors

- **400**: Invalid file, duration/size exceeded
- **403**: Plan not accessible for user role
- **413**: File too large

## File Structure

```
uploads/
├── original/     # Original files
├── processed/    # Compressed videos
├── thumbnails/   # Generated thumbnails
└── temp/         # Temporary files
```

## Quick Test

```bash
curl -X POST http://localhost:3000/ads/upload-video \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "video=@video.mp4" \
  -F "plan=premium"
```

## Files Created

1. ✅ `src/modules/ads/dto/media-upload.dto.ts` - DTOs and plan limits
2. ✅ `src/modules/ads/media.service.ts` - Video processing service
3. ✅ `src/modules/ads/ads.controller.ts` - Upload endpoint (updated)
4. ✅ `src/modules/ads/ads.module.ts` - Module config (updated)
5. ✅ `src/modules/ads/entities/ad.entity.ts` - Entity fields (updated)
6. ✅ `src/config/storage.config.ts` - Storage configuration
7. ✅ `database/schema/media-upload.sql` - Database migration
8. ✅ `package.json` - Dependencies (updated)

## Key Features

✅ Duration validation
✅ File size validation
✅ Plan-based compression
✅ Automatic thumbnail generation
✅ Watermark for Normal plan
✅ Role-based access control
✅ Detailed error messages
✅ Secure file storage
