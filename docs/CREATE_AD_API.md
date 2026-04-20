# Create Ad API Documentation

## Endpoint

```
POST /api/ads/create
```

## Authentication

Required: JWT Bearer Token

## Request Body

```json
{
  "title": "iPhone 15 Pro Max - 256GB",
  "description": "Brand new iPhone 15 Pro Max with warranty. Perfect condition.",
  "category": "Electronics",
  "condition": "new",
  "price": 1299.99,
  "currency": "USD",
  "location": "Lagos, Nigeria",
  "mediaUrls": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  "videoUrl": "https://example.com/video.mp4",
  "videoDuration": 90,
  "videoFileSize": 15000000
}
```

## Field Validations

### Title
- **Required**: Yes
- **Max Length**: 80 characters
- **Error**: `"Title exceeds maximum length of 80 characters"`

### Description
- **Required**: No
- **Max Length**: 500 characters
- **Error**: `"Description exceeds maximum length of 500 characters"`

### Category
- **Required**: Yes
- **Allowed Values**:
  - `Electronics`
  - `Vehicles`
  - `Real Estate`
  - `Fashion`
  - `Phones`
  - `Computers`
  - `Home & Furniture`
  - `Services`
- **Error**: `"Invalid category. Allowed categories: Electronics, Vehicles, Real Estate, Fashion, Phones, Computers, Home & Furniture, Services"`

### Condition
- **Required**: No (defaults to `used`)
- **Allowed Values**: `new`, `used`
- **Error**: `"Condition must be "new" or "used""`

### Price
- **Required**: Yes
- **Validation**: Must be a positive number
- **Error**: `"Price cannot be negative"`

### Currency
- **Required**: Yes
- **Examples**: `USD`, `EUR`, `NGN`, `GBP`, etc.

### Location
- **Required**: No
- **Type**: String

### Images (mediaUrls)
- **Required**: No
- **Max Count**: 5 images per ad
- **Max Size**: 5 MB each
- **Allowed Formats**: JPG, PNG, WEBP
- **Error**: `"Maximum 5 images allowed per ad"`

### Video
- **Required**: No
- **Max Count**: 1 video per ad
- **Format**: MP4 (H264)
- **Max Resolution**: 1080p
- **Tier-based Limits**:

| Tier       | Max Duration | Max File Size |
|------------|--------------|---------------|
| Normal     | 2 minutes    | 25 MB         |
| Premium    | 3 minutes    | 40 MB         |
| Pro        | 5 minutes    | 60 MB         |
| Hot        | 10 minutes   | 80 MB         |
| Enterprise | Unlimited    | Backend controlled |

- **Duration Error**: `"Your plan allows a maximum video length of X minutes"`
- **Size Error**: `"Video file size exceeds plan limit of X MB"`

## Response

### Success (201 Created)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "iPhone 15 Pro Max - 256GB",
  "description": "Brand new iPhone 15 Pro Max with warranty. Perfect condition.",
  "category": "Electronics",
  "condition": "new",
  "price": 1299.99,
  "currency": "USD",
  "priceUsd": 1299.99,
  "location": "Lagos, Nigeria",
  "mediaUrls": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  "videoUrl": "https://example.com/video.mp4",
  "videoDuration": 90,
  "videoFileSize": 15000000,
  "qualityScore": 5,
  "hasImage": true,
  "isVideoAd": true,
  "authorId": "user-uuid",
  "createdAt": "2026-03-06T12:00:00.000Z",
  "updatedAt": "2026-03-06T12:00:00.000Z"
}
```

### Quality Score Calculation

The `qualityScore` is calculated automatically:
- Each image: **+1 point**
- Video: **+3 points**
- **Maximum**: 10 points

Example: 4 images + 1 video = 4 + 3 = **7 points**

### Error Response (400 Bad Request)

```json
{
  "statusCode": 400,
  "message": "Title exceeds maximum length of 80 characters",
  "error": "Bad Request"
}
```

## Currency Conversion

The backend automatically converts the price to USD and stores it in `priceUsd`.

**USD Display Rules**:
- **Normal/Premium users**: See local currency only
- **Pro/Hot/Enterprise users**: Can see USD price

## Security Notes

1. **All validations occur server-side** - frontend validations are supplementary
2. **Backend never trusts frontend data** - all limits are enforced server-side
3. **User tier is verified from database** - not from client request
4. **File uploads should be validated** during the upload process separately

## Example cURL Request

```bash
curl -X POST "https://api.elhannora.com/api/ads/create" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "iPhone 15 Pro Max - 256GB",
    "description": "Brand new iPhone 15 Pro Max with warranty.",
    "category": "Electronics",
    "condition": "new",
    "price": 1299.99,
    "currency": "USD",
    "location": "Lagos, Nigeria",
    "mediaUrls": ["https://example.com/image1.jpg"]
  }'
```

## Related Endpoints

- `POST /api/ads` - Legacy create endpoint (same functionality)
- `GET /api/ads` - List all ads with filters
- `GET /api/ads/:id` - Get single ad details
- `PATCH /api/ads/:id` - Update an ad
- `DELETE /api/ads/:id` - Delete an ad
- `POST /api/ads/upload-video` - Upload video for ad
