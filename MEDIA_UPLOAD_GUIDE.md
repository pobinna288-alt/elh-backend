# Media Upload System - Complete Guide

## Overview
Backend media upload system for ads app with plan-based video limits and automatic processing.

## Features
✅ Plan-based upload limits (Normal, Premium, Pro, Hot Ads)
✅ Duration and file size validation
✅ Automatic video compression based on plan
✅ Thumbnail generation
✅ Watermark application (Normal plan only)
✅ Secure file storage
✅ Clear error messages
✅ User role-based access control

## Plan Limits

| Plan     | Max Duration | Max File Size | Compression | Watermark | Payment Required |
|----------|--------------|---------------|-------------|-----------|------------------|
| Normal   | 2 minutes    | 20MB          | High        | Yes       | No               |
| Premium  | 3 minutes    | 40MB          | Medium      | No        | No               |
| Pro      | 5 minutes    | 80MB          | Low         | No        | No               |
| Hot Ads  | 10 minutes   | 120MB         | Minimal     | No        | Yes              |

## Installation

### 1. Install Dependencies
```bash
npm install multer @types/multer
```

### 2. Install FFmpeg
FFmpeg is required for video processing.

**Windows:**
```bash
# Using Chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

**Linux:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

Verify installation:
```bash
ffmpeg -version
ffprobe -version
```

### 3. Run Database Migration
```bash
psql -U your_username -d your_database -f database/schema/media-upload.sql
```

Or using TypeORM:
```bash
npm run typeorm migration:run
```

### 4. Create Upload Directories
The system automatically creates directories on startup, but you can pre-create them:
```bash
mkdir -p uploads/original uploads/processed uploads/thumbnails uploads/temp
```

## API Endpoints

### Upload Video
```http
POST /ads/upload-video
Content-Type: multipart/form-data
Authorization: Bearer <token>

Parameters:
- video: File (required) - Video file to upload
- plan: string (required) - Upload plan: "normal", "premium", "pro", or "hot"
- adId: string (optional) - Ad ID to associate with the video
```

**Example Request (cURL):**
```bash
curl -X POST http://localhost:3000/ads/upload-video \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "video=@/path/to/video.mp4" \
  -F "plan=premium"
```

**Success Response (201):**
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

**Error Responses:**

```json
// 400 - No file provided
{
  "statusCode": 400,
  "message": "No video file provided",
  "error": "Bad Request"
}

// 400 - Invalid video format
{
  "statusCode": 400,
  "message": "Invalid video format. Allowed formats: video/mp4, video/mpeg, video/quicktime, video/x-msvideo, video/webm",
  "error": "Bad Request"
}

// 400 - Duration exceeded
{
  "statusCode": 400,
  "message": "Video duration 4m 30s exceeds plan limit of 3m 0s",
  "error": "Bad Request"
}

// 403 - Plan not accessible
{
  "statusCode": 403,
  "message": "Your account does not have access to the premium plan",
  "error": "Forbidden"
}

// 413 - File too large
{
  "statusCode": 413,
  "message": "File size 45.5 MB exceeds plan limit of 40 MB",
  "error": "Payload Too Large"
}
```

## Usage Examples

### JavaScript/TypeScript (Fetch API)
```typescript
async function uploadVideo(videoFile: File, plan: string, token: string) {
  const formData = new FormData();
  formData.append('video', videoFile);
  formData.append('plan', plan);

  const response = await fetch('http://localhost:3000/ads/upload-video', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}

// Usage
try {
  const result = await uploadVideo(fileInput.files[0], 'premium', userToken);
  console.log('Upload successful:', result);
  // Display video: result.processedUrl
  // Display thumbnail: result.thumbnailUrl
} catch (error) {
  console.error('Upload failed:', error.message);
}
```

### React Component Example
```tsx
import { useState } from 'react';

function VideoUpload({ userToken, userPlan }) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = e.target.video.files[0];
    
    if (!file) {
      setError('Please select a video file');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('video', file);
    formData.append('plan', userPlan);

    try {
      const response = await fetch('/ads/upload-video', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleUpload}>
        <input type="file" name="video" accept="video/*" />
        <button type="submit" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload Video'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}
      
      {result && (
        <div className="success">
          <h3>Upload Successful!</h3>
          <video src={result.processedUrl} controls poster={result.thumbnailUrl} />
          <p>Duration: {Math.floor(result.duration / 60)}m {Math.floor(result.duration % 60)}s</p>
          <p>File size: {(result.fileSize / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      )}
    </div>
  );
}
```

## Plan Access Control

Users can only upload videos using plans their role has access to:

| User Role | Available Plans              |
|-----------|------------------------------|
| user      | Normal                       |
| premium   | Normal, Premium              |
| pro       | Normal, Premium, Pro         |
| hot       | Normal, Premium, Pro, Hot    |
| admin     | All plans                    |

The system automatically validates user permissions before processing uploads.

## Video Processing Details

### Compression Levels

**High Compression (Normal Plan):**
- CRF: 28
- Audio Bitrate: 96k
- Preset: faster
- Result: Smaller file size, lower quality

**Medium Compression (Premium Plan):**
- CRF: 23
- Audio Bitrate: 128k
- Preset: medium
- Result: Balanced size and quality

**Low Compression (Pro Plan):**
- CRF: 20
- Audio Bitrate: 192k
- Preset: slow
- Result: Better quality, larger file

**Minimal Compression (Hot Ads Plan):**
- CRF: 18
- Audio Bitrate: 256k
- Preset: veryslow
- Result: Near original quality

### Watermark
For Normal plan users, a semi-transparent "Sample" watermark is added to the center of the video.

### Thumbnail Generation
Thumbnails are automatically generated at 2 seconds into the video.

## File Structure

```
uploads/
├── original/        # Original uploaded files
│   └── {uuid}_original.mp4
├── processed/       # Compressed videos
│   └── {uuid}_processed.mp4
├── thumbnails/      # Generated thumbnails
│   └── {uuid}_thumb.jpg
└── temp/           # Temporary upload files (auto-cleaned)
```

## Environment Variables

```env
# Optional - defaults provided
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=125829120  # 120MB in bytes
```

## Error Handling

The system provides detailed error messages for common issues:

1. **No video file provided** - File missing from request
2. **Invalid video format** - Unsupported file type
3. **Duration exceeded** - Video longer than plan allows
4. **File too large** - File size exceeds plan limit
5. **Plan not accessible** - User role insufficient for requested plan
6. **Video processing failed** - FFmpeg processing error
7. **Corrupted file** - Cannot read video metadata

## Security Considerations

1. **File Type Validation**: Only video MIME types accepted
2. **File Size Limits**: Enforced at application and multer levels
3. **User Authentication**: JWT required for uploads
4. **Role-Based Access**: Plan restrictions by user role
5. **Storage Isolation**: Separate directories for different processing stages
6. **Filename Sanitization**: UUID-based filenames prevent path traversal

## Performance Tips

1. **Background Processing**: For production, consider using a job queue (Bull, BullMQ) for video processing
2. **CDN Integration**: Serve processed videos through a CDN
3. **Storage**: Use cloud storage (S3, Google Cloud Storage) instead of local filesystem
4. **Cleanup**: Implement automatic cleanup of old/unused videos

## Testing

### Test Video Upload
```bash
# Create a test video (requires FFmpeg)
ffmpeg -f lavfi -i testsrc=duration=30:size=1280x720:rate=30 -pix_fmt yuv420p test.mp4

# Upload with cURL
curl -X POST http://localhost:3000/ads/upload-video \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "video=@test.mp4" \
  -F "plan=normal"
```

### Test Plan Validation
```typescript
// In your test file
describe('Media Upload', () => {
  it('should reject Normal plan for premium video', async () => {
    const response = await request(app)
      .post('/ads/upload-video')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('video', largePremiumVideo)
      .field('plan', 'normal');

    expect(response.status).toBe(400);
  });
});
```

## Troubleshooting

### FFmpeg Not Found
```
Error: ffmpeg: command not found
```
**Solution**: Install FFmpeg and ensure it's in your system PATH.

### Permission Denied
```
Error: EACCES: permission denied, mkdir 'uploads'
```
**Solution**: Ensure the application has write permissions to the project directory.

### Processing Timeout
```
Error: Failed to process video
```
**Solution**: Large videos may take time. Consider increasing timeout or using background jobs.

### Memory Issues
```
Error: JavaScript heap out of memory
```
**Solution**: Process videos in a separate worker process or increase Node.js memory limit:
```bash
node --max-old-space-size=4096 dist/main.js
```

## Future Enhancements

- [ ] Background job queue for video processing
- [ ] Progress tracking during upload/processing
- [ ] Multiple video quality outputs (360p, 720p, 1080p)
- [ ] Video preview clips
- [ ] Batch upload support
- [ ] Cloud storage integration (AWS S3, Google Cloud Storage)
- [ ] Video analytics (watch time, completion rate)
- [ ] Adaptive bitrate streaming (HLS)
- [ ] Custom watermark images per user/brand

## Support

For issues or questions:
1. Check FFmpeg installation: `ffmpeg -version`
2. Verify file permissions on uploads directory
3. Check application logs for detailed error messages
4. Ensure database migrations have run successfully
