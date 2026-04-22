/**
 * ============================================
 * EL HANNORA - Follow Seller Routes
 * ============================================
 * 
 * API endpoints for the Follow Seller feature:
 *   - Follow/unfollow sellers
 *   - Get followed feed with "new" badges
 *   - Track engagement events
 *   - Manage bookmarks
 *   - View follower statistics
 * 
 * Base path: /api/follow
 * 
 * @author El Hannora Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();

const followSellerService = require('../services/followSellerService');

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Validate required fields in request body
 */
function validateRequired(fields) {
  return (req, res, next) => {
    const missing = fields.filter(field => !req.body[field]);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missing_fields: missing
      });
    }
    next();
  };
}

/**
 * Mock user extraction from auth token
 * In production, use proper JWT validation
 */
function extractUser(req, res, next) {
  // Get user from header or body (for demo purposes)
  const userId = req.headers['x-user-id'] || req.body.user_id;
  const userTrustScore = parseInt(req.headers['x-user-trust-score']) || req.body.user_trust_score || 50;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'User ID required',
      code: 'UNAUTHORIZED'
    });
  }
  
  req.user = {
    id: userId,
    trust_score: userTrustScore
  };
  
  next();
}

// ============================================
// FOLLOW/UNFOLLOW ENDPOINTS
// ============================================

/**
 * POST /api/follow/seller
 * 
 * Follow a seller with optional trust boost.
 * 
 * Request body:
 * {
 *   "seller_id": "seller-uuid",
 *   "user_id": "follower-uuid",          // or use x-user-id header
 *   "user_trust_score": 75,              // or use x-user-trust-score header
 *   "seller_trust_score": 60,            // current seller trust score
 *   "notifications_enabled": true,       // optional
 *   "auto_bookmark_new_ads": false       // optional
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "follow": { ... },
 *     "seller_stats": { ... },
 *     "trust_boost": { ... }
 *   }
 * }
 */
router.post('/seller',
  extractUser,
  validateRequired(['seller_id']),
  (req, res) => {
    try {
      const {
        seller_id,
        seller_trust_score = 50,
        notifications_enabled = true,
        auto_bookmark_new_ads = false
      } = req.body;
      
      const result = followSellerService.followSeller({
        followerId: req.user.id,
        sellerId: seller_id,
        follower: req.user,
        seller: { id: seller_id, trust_score: seller_trust_score },
        notificationsEnabled: notifications_enabled,
        autoBookmarkNewAds: auto_bookmark_new_ads
      });
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Error following seller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * DELETE /api/follow/seller/:sellerId
 * 
 * Unfollow a seller.
 * Note: Trust boost is NOT reversed on unfollow.
 */
router.delete('/seller/:sellerId',
  extractUser,
  (req, res) => {
    try {
      const { sellerId } = req.params;
      
      const result = followSellerService.unfollowSeller(req.user.id, sellerId);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error unfollowing seller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/follow/check/:sellerId
 * 
 * Check if user is following a specific seller.
 */
router.get('/check/:sellerId',
  extractUser,
  (req, res) => {
    try {
      const { sellerId } = req.params;
      const isFollowing = followSellerService.isFollowing(req.user.id, sellerId);
      const details = followSellerService.getFollowDetails(req.user.id, sellerId);
      
      res.json({
        success: true,
        data: {
          is_following: isFollowing,
          follow_details: details
        }
      });
    } catch (error) {
      console.error('Error checking follow status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * PATCH /api/follow/seller/:sellerId/preferences
 * 
 * Update follow preferences (notifications, auto-bookmark).
 */
router.patch('/seller/:sellerId/preferences',
  extractUser,
  (req, res) => {
    try {
      const { sellerId } = req.params;
      const { notifications_enabled, auto_bookmark_new_ads } = req.body;
      
      const result = followSellerService.updateFollowPreferences(
        req.user.id,
        sellerId,
        { notifications_enabled, auto_bookmark_new_ads }
      );
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error updating preferences:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// ============================================
// FEED ENDPOINTS
// ============================================

/**
 * GET /api/follow/feed
 * 
 * Get the followed seller feed for current user.
 * 
 * Query params:
 * - limit: number (default 20)
 * - offset: number (default 0)
 * - sort_by: 'created_at' | 'attention_score' (default 'created_at')
 * - sort_order: 'ASC' | 'DESC' (default 'DESC')
 * - only_new: boolean (default false)
 * - seller_id: string (optional, filter by specific seller)
 */
router.get('/feed',
  extractUser,
  (req, res) => {
    try {
      const {
        limit = 20,
        offset = 0,
        sort_by = 'created_at',
        sort_order = 'DESC',
        only_new = false,
        seller_id
      } = req.query;
      
      // Get ads from database (mocked here)
      const database = req.app.get('database');
      const allAds = database?.ads || [];
      
      const result = followSellerService.getFollowedFeed(req.user.id, allAds, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        sortBy: sort_by,
        sortOrder: sort_order,
        onlyNew: only_new === 'true',
        sellerId: seller_id
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error getting followed feed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/follow/feed/seller/:sellerId
 * 
 * Get feed from a specific followed seller.
 */
router.get('/feed/seller/:sellerId',
  extractUser,
  (req, res) => {
    try {
      const { sellerId } = req.params;
      const { limit = 20, offset = 0 } = req.query;
      
      // Check if following
      if (!followSellerService.isFollowing(req.user.id, sellerId)) {
        return res.status(403).json({
          success: false,
          error: 'Not following this seller',
          code: 'NOT_FOLLOWING'
        });
      }
      
      const database = req.app.get('database');
      const allAds = database?.ads || [];
      
      const result = followSellerService.getSellerFeed(req.user.id, sellerId, allAds, {
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error getting seller feed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// ============================================
// ENGAGEMENT TRACKING ENDPOINTS
// ============================================

/**
 * POST /api/follow/engagement
 * 
 * Track an engagement event on a followed seller's ad.
 * Enforces daily unique limit per user per ad per event type.
 * 
 * Request body:
 * {
 *   "ad_id": "ad-uuid",
 *   "seller_id": "seller-uuid",
 *   "event_type": "scroll_stop",
 *   "session_id": "session-123",      // optional
 *   "device_type": "mobile",          // optional
 *   "viewport_time_ms": 3500          // optional
 * }
 * 
 * Event types: ad_seen, scroll_stop, repeated_view, click, save, share
 */
router.post('/engagement',
  extractUser,
  validateRequired(['ad_id', 'seller_id', 'event_type']),
  (req, res) => {
    try {
      const {
        ad_id,
        seller_id,
        event_type,
        session_id,
        device_type,
        viewport_time_ms
      } = req.body;
      
      const result = followSellerService.trackEngagement({
        adId: ad_id,
        userId: req.user.id,
        sellerId: seller_id,
        eventType: event_type,
        sessionId: session_id,
        deviceType: device_type,
        viewportTimeMs: viewport_time_ms
      });
      
      if (!result.success && !result.ignored) {
        return res.status(400).json(result);
      }
      
      // Return 200 even for ignored (duplicate) events
      res.status(result.ignored ? 200 : 201).json(result);
    } catch (error) {
      console.error('Error tracking engagement:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/follow/engagement/stats/:sellerId
 * 
 * Get engagement statistics with a specific seller.
 */
router.get('/engagement/stats/:sellerId',
  extractUser,
  (req, res) => {
    try {
      const { sellerId } = req.params;
      
      const result = followSellerService.getEngagementStats(req.user.id, sellerId);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error getting engagement stats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/follow/ad/:adId/attention-score
 * 
 * Get attention score for an ad based on engagement events.
 */
router.get('/ad/:adId/attention-score', (req, res) => {
  try {
    const { adId } = req.params;
    
    const scoreData = followSellerService.calculateAttentionScore(adId);
    
    res.json({
      success: true,
      data: {
        ad_id: adId,
        ...scoreData
      }
    });
  } catch (error) {
    console.error('Error calculating attention score:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ============================================
// BOOKMARK ENDPOINTS
// ============================================

/**
 * POST /api/follow/bookmark
 * 
 * Bookmark an ad.
 */
router.post('/bookmark',
  extractUser,
  validateRequired(['ad_id']),
  (req, res) => {
    try {
      const { ad_id, from_followed_seller = false } = req.body;
      
      const result = followSellerService.bookmarkAd(
        req.user.id,
        ad_id,
        false,
        from_followed_seller
      );
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating bookmark:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * DELETE /api/follow/bookmark/:adId
 * 
 * Remove a bookmark.
 */
router.delete('/bookmark/:adId',
  extractUser,
  (req, res) => {
    try {
      const { adId } = req.params;
      
      const result = followSellerService.removeBookmark(req.user.id, adId);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error removing bookmark:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/follow/bookmarks
 * 
 * Get user's bookmarks.
 */
router.get('/bookmarks',
  extractUser,
  (req, res) => {
    try {
      const { only_auto = false, limit = 50, offset = 0 } = req.query;
      
      const result = followSellerService.getBookmarks(req.user.id, {
        onlyAuto: only_auto === 'true',
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error getting bookmarks:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// ============================================
// LIST ENDPOINTS
// ============================================

/**
 * GET /api/follow/following
 * 
 * Get list of sellers the user follows.
 */
router.get('/following',
  extractUser,
  (req, res) => {
    try {
      const { limit = 50, offset = 0 } = req.query;
      
      const result = followSellerService.getFollowedSellers(req.user.id, parseInt(limit), parseInt(offset));
      
      res.json(result);
    } catch (error) {
      console.error('Error getting followed sellers:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/follow/followers/:sellerId
 * 
 * Get list of followers for a seller (public view).
 */
router.get('/followers/:sellerId', (req, res) => {
  try {
    const { sellerId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const result = followSellerService.getSellerFollowers(sellerId, parseInt(limit), parseInt(offset));
    
    res.json(result);
  } catch (error) {
    console.error('Error getting seller followers:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/follow/seller/:sellerId/stats
 * 
 * Get seller's follower statistics.
 */
router.get('/seller/:sellerId/stats', (req, res) => {
  try {
    const { sellerId } = req.params;
    
    const result = followSellerService.getSellerStats(sellerId);
    
    res.json(result);
  } catch (error) {
    console.error('Error getting seller stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ============================================
// TRUST SCORE LOG ENDPOINTS
// ============================================

/**
 * GET /api/follow/trust-log/:userId
 * 
 * Get trust score change history for a user.
 */
router.get('/trust-log/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;
    
    const history = followSellerService.getTrustScoreHistory(userId, parseInt(limit));
    
    res.json({
      success: true,
      data: {
        user_id: userId,
        history,
        total: history.length
      }
    });
  } catch (error) {
    console.error('Error getting trust log:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

/**
 * GET /api/follow/health
 * 
 * Health check for the follow service.
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'follow-seller',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: {
      follow_unfollow: true,
      followed_feed: true,
      new_badge: true,
      engagement_tracking: true,
      trust_boost: true,
      daily_limit_enforcement: true,
      bookmarks: true
    }
  });
});

module.exports = router;
