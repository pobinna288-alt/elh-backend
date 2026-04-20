# El Hannora Trust Score System Documentation

## Overview

The Trust Score System is a reputation mechanism for the El Hannora marketplace that ensures buyer confidence and seller accountability. Users start with a base score and can earn bonuses or receive penalties based on their activities.

## Trust Score Mechanics

### Base Score
- **New accounts start at: 30 points**

### Bonuses (Rewards)

| Bonus Type | Points | Condition |
|------------|--------|-----------|
| Email Verification | +10 | One-time reward when email is verified |
| Account Age (30 days) | +5 | One-time bonus at 30 days |
| Account Age (180 days) | +10 | One-time bonus at 180 days |
| Account Age (365 days) | +15 | One-time bonus at 365 days |

**Maximum possible bonus points:** 40 (10 + 5 + 10 + 15)

### Penalties (Violations)

| Violation Type | Penalty | Consequence |
|----------------|---------|-------------|
| `user_report` | -10 | Reported by another user |
| `spam_ad` | -15 | Posting spam advertisements |
| `fake_ad` | -20 | Posting misleading/fake ads |
| `sexual_content` | -20 | Adult content violations |
| `scam` | -50 | Scam attempt + Account suspension |

### Trust Levels

| Level | Score Range | Badge |
|-------|-------------|-------|
| New Seller | 0-39 | 🆕 |
| Verified Seller | 40-69 | ✅ |
| Trusted Seller | 70-100 | ⭐ |

### Score Bounds
- **Minimum:** 0
- **Maximum:** 100

## API Endpoints

### Base URL
```
http://localhost:4000/api/trust
```

---

### 1. Get User Trust Score

**Endpoint:** `GET /api/trust/score/:userId`

**Description:** Get basic trust score and level for a user.

**Response:**
```json
{
  "success": true,
  "user_id": "uuid-string",
  "trust_score": 55,
  "trust_level": {
    "level": "verified_seller",
    "label": "Verified Seller",
    "min": 40,
    "max": 69
  }
}
```

---

### 2. Get Full Trust Summary

**Endpoint:** `GET /api/trust/summary/:userId`

**Description:** Get comprehensive trust information including bonuses earned.

**Response:**
```json
{
  "success": true,
  "user_id": "uuid-string",
  "trust_score": 55,
  "trust_level": {
    "level": "verified_seller",
    "label": "Verified Seller"
  },
  "bonuses_earned": {
    "email_verification": true,
    "age_30_days": true,
    "age_180_days": true,
    "age_365_days": true
  },
  "max_possible_score": 70,
  "penalties_received": 0,
  "account_age_days": 400,
  "is_trusted": true
}
```

---

### 3. Get Trust Score History

**Endpoint:** `GET /api/trust/history/:userId`

**Query Parameters:**
- `limit` (optional): Max entries to return (default: 50, max: 100)

**Description:** Get history of trust score changes.

**Response:**
```json
{
  "success": true,
  "user_id": "uuid-string",
  "total_entries": 5,
  "history": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "previous_score": 30,
      "new_score": 40,
      "change_amount": 10,
      "change_type": "bonus",
      "reason": "email_verification",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### 4. Get User Violations

**Endpoint:** `GET /api/trust/violations/:userId`

**Description:** Get all violations recorded against a user.

**Response:**
```json
{
  "success": true,
  "user_id": "uuid-string",
  "total_violations": 2,
  "violations": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "violation_type": "spam_ad",
      "ad_id": "uuid",
      "penalty_points": 15,
      "status": "active",
      "detected_by": "ai_moderation",
      "description": "Duplicate posting detected",
      "created_at": "2024-01-20T14:00:00Z"
    }
  ]
}
```

---

### 5. Get Trust Level Definitions

**Endpoint:** `GET /api/trust/levels`

**Description:** Get all trust level definitions and bonus/penalty information.

**Response:**
```json
{
  "success": true,
  "levels": {
    "new_seller": {
      "label": "New Seller",
      "range": "0-39",
      "description": "New accounts start here"
    },
    "verified_seller": {
      "label": "Verified Seller",
      "range": "40-69",
      "description": "Established sellers with good history"
    },
    "trusted_seller": {
      "label": "Trusted Seller",
      "range": "70-100",
      "description": "Highly trusted sellers"
    }
  },
  "bonuses": {
    "base_score": 30,
    "email_verification": 10,
    "account_age": {
      "30_days": 5,
      "180_days": 10,
      "365_days": 15
    }
  },
  "penalties": {
    "user_report": -10,
    "spam_ad": -15,
    "fake_ad": -20,
    "sexual_content": -20,
    "scam": -50
  }
}
```

---

### 6. Apply Email Verification Reward

**Endpoint:** `POST /api/trust/verify-email`

**Authentication:** Required

**Description:** Apply the +10 email verification bonus (one-time).

**Response:**
```json
{
  "success": true,
  "already_rewarded": false,
  "previous_score": 30,
  "new_score": 40,
  "bonus_applied": 10,
  "message": "Email verification reward applied"
}
```

---

### 7. Check and Apply Account Age Bonus

**Endpoint:** `POST /api/trust/check-age-bonus`

**Authentication:** Required

**Description:** Check and apply any earned account age bonuses.

**Response:**
```json
{
  "success": true,
  "account_age_days": 200,
  "bonuses_checked": {
    "30_days": { "earned": true, "previously_awarded": true },
    "180_days": { "earned": true, "previously_awarded": false, "bonus_applied": 10 },
    "365_days": { "earned": false, "days_remaining": 165 }
  },
  "total_bonus_applied": 10,
  "new_trust_score": 55
}
```

---

### 8. Report User/Ad

**Endpoint:** `POST /api/trust/report`

**Authentication:** Required

**Request Body:**
```json
{
  "reported_user_id": "uuid",
  "ad_id": "uuid",
  "reason": "spam",
  "description": "This ad contains spam content"
}
```

**Notes:**
- Either `reported_user_id` OR `ad_id` is required (not both)
- Cannot report yourself

**Response:**
```json
{
  "success": true,
  "message": "Report submitted successfully",
  "violation_id": "uuid",
  "violation_type": "user_report",
  "penalty_applied": 10,
  "previous_score": 55,
  "new_score": 45
}
```

---

### 9. Record Violation (Admin)

**Endpoint:** `POST /api/trust/violation`

**Authentication:** Admin required

**Request Body:**
```json
{
  "user_id": "uuid",
  "violation_type": "spam_ad",
  "ad_id": "uuid",
  "detected_by": "ai_moderation",
  "description": "Automatic spam detection"
}
```

**Valid violation types:**
- `user_report`
- `spam_ad`
- `fake_ad`
- `sexual_content`
- `scam`

**Response:**
```json
{
  "success": true,
  "violation_id": "uuid",
  "violation_type": "spam_ad",
  "penalty_applied": 15,
  "previous_score": 55,
  "new_score": 40,
  "new_trust_level": {
    "level": "verified_seller",
    "label": "Verified Seller"
  }
}
```

---

### 10. API Documentation

**Endpoint:** `GET /api/trust/docs`

**Description:** Get interactive API documentation.

---

## Integration with Search

The trust score integrates with the Search API for ranking:

```javascript
// Search ranking formula includes trust factor
ranking_score = relevance + (trust_score * 0.2)
```

This means:
- **Higher trust = better search visibility**
- Trust scores of 70+ get a +14 boost
- New sellers (30 points) get a +6 boost

---

## Database Schema

### violations table
```sql
CREATE TABLE violations (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    violation_type VARCHAR(50) NOT NULL,
    ad_id UUID,
    penalty_points INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    reported_by UUID,
    detected_by VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### trust_score_history table
```sql
CREATE TABLE trust_score_history (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    previous_score INTEGER NOT NULL,
    new_score INTEGER NOT NULL,
    change_amount INTEGER NOT NULL,
    change_type VARCHAR(20) NOT NULL,
    reason VARCHAR(100),
    related_violation_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Usage Examples

### cURL Examples

**Get trust score:**
```bash
curl http://localhost:4000/api/trust/score/{userId}
```

**Get full summary:**
```bash
curl http://localhost:4000/api/trust/summary/{userId}
```

**Get trust levels:**
```bash
curl http://localhost:4000/api/trust/levels
```

**Report a user (authenticated):**
```bash
curl -X POST http://localhost:4000/api/trust/report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"reported_user_id": "uuid", "reason": "spam"}'
```

### PowerShell Examples

**Get trust score:**
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/trust/score/{userId}"
```

**Get violations:**
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/trust/violations/{userId}"
```

---

## Best Practices

1. **Always display trust badges** on seller profiles
2. **Show trust level** next to ads in search results
3. **Warn buyers** when viewing ads from New Sellers
4. **Highlight Trusted Sellers** as premium results
5. **Encourage email verification** early in user journey
6. **Automate age bonus checks** on user login

---

## Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid user ID | User ID format is invalid |
| 401 | Authentication required | Endpoint requires login |
| 403 | Admin access required | Endpoint is admin-only |
| 404 | User not found | User ID doesn't exist |
| 500 | Internal error | Server error |

---

## Version History

- **v2.0.0** - Complete trust score system with bonuses, penalties, and history tracking
- **v1.0.0** - Basic trust score field on ads

---

*El Hannora Trust Score System - Building Marketplace Trust*
