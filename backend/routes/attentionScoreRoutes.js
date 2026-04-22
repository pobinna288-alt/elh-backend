/**
 * ============================================
 * EL HANNORA - Attention Score Routes
 * ============================================
 * 
 * API endpoints for the Attention Score system.
 * Tracks user engagement with advertisements.
 * 
 * Core Signals:
 *   - ad_seen: Ad becomes visible in viewport
 *   - scroll_stop: User stops on ad for 2+ seconds  
 *   - repeated_view: User views same ad in different session
 * 
 * ============================================
 */

const express = require('express');

const attentionScoreService = require('../services/attentionScoreService');

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Validate request body has required fields
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

// ============================================
// ROUTER FACTORY
// ============================================

/**
 * @param {{ authenticateToken: Function }} options
 */
function createAttentionScoreRouter({ authenticateToken }) {
  const router = express.Router();

// ============================================
// EVENT TRACKING ENDPOINTS
// ============================================

/**
 * POST /api/ads/attention-event
 * 
 * Log an attention event for an ad.
 * 
 * Request body:
 * {
 *   "ad_id": "ad_1920",
 *   "user_id": "user_103",
 *   "event_type": "scroll_stop",
 *   "session_id": "sess_821",
 *   "device_type": "mobile",        // optional
 *   "viewport_time_ms": 3500        // optional
 * }
 * 
 * Event types: ad_seen, scroll_stop, repeated_view
 */
router.post('/attention-event',
  authenticateToken,
  validateRequired(['ad_id', 'event_type', 'session_id']),
  (req, res) => {
    try {
      const { ad_id, event_type, session_id, device_type, viewport_time_ms } = req.body;
      const user_id = req.user.id;

      const result = attentionScoreService.logAttentionEvent({
        ad_id,
        user_id,
        event_type,
        session_id,
        device_type,
        viewport_time_ms
      });

      if (!result.success) {
        // Event was blocked by spam prevention - return 200 but indicate it was ignored
        if (result.ignored) {
          return res.status(200).json({
            success: true,
            ignored: true,
            reason: result.reason
          });
        }
        
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('Error logging attention event:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * POST /api/ads/attention-event/batch
 * 
 * Log multiple attention events at once.
 * 
 * Request body:
 * {
 *   "events": [
 *     { "ad_id": "ad_1", "user_id": "user_1", "event_type": "ad_seen", "session_id": "sess_1" },
 *     { "ad_id": "ad_2", "user_id": "user_1", "event_type": "ad_seen", "session_id": "sess_1" }
 *   ]
 * }
 */
router.post('/attention-event/batch', authenticateToken, (req, res) => {
  try {
    const { events } = req.body;
    const authenticatedUserId = req.user.id;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'events must be a non-empty array'
      });
    }

    if (events.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 events per batch'
      });
    }

    const results = events.map(event => {
      try {
        return attentionScoreService.logAttentionEvent({ ...event, user_id: authenticatedUserId });
      } catch (e) {
        return { success: false, error: e.message };
      }
    });

    const successful = results.filter(r => r.success).length;
    const ignored = results.filter(r => r.ignored).length;
    const failed = results.filter(r => !r.success && !r.ignored).length;

    res.status(201).json({
      success: true,
      summary: {
        total: events.length,
        successful,
        ignored,
        failed
      },
      results
    });
  } catch (error) {
    console.error('Error processing batch events:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ============================================
// SCORE RETRIEVAL ENDPOINTS
// ============================================

/**
 * GET /api/ads/:adId/attention-score
 * 
 * Get attention score and metrics for a specific ad.
 * 
 * Response:
 * {
 *   "ad_id": "ad_1920",
 *   "seen_count": 200,
 *   "scroll_stop_count": 40,
 *   "repeated_view_count": 10,
 *   "attention_score": 370,
 *   "unique_viewers": 180,
 *   "last_updated": "2026-03-05T..."
 * }
 */
router.get('/:adId/attention-score', (req, res) => {
  try {
    const { adId } = req.params;

    if (!adId) {
      return res.status(400).json({
        success: false,
        error: 'ad_id is required'
      });
    }

    const score = attentionScoreService.getAttentionScore(adId);

    res.json({
      success: true,
      ...score
    });
  } catch (error) {
    console.error('Error getting attention score:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/ads/attention-scores/batch
 * 
 * Get attention scores for multiple ads.
 * 
 * Request body:
 * {
 *   "ad_ids": ["ad_1", "ad_2", "ad_3"]
 * }
 */
router.post('/attention-scores/batch', (req, res) => {
  try {
    const { ad_ids } = req.body;

    if (!Array.isArray(ad_ids) || ad_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ad_ids must be a non-empty array'
      });
    }

    if (ad_ids.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 ads per request'
      });
    }

    const scores = attentionScoreService.getAttentionScoresBatch(ad_ids);

    res.json({
      success: true,
      count: scores.length,
      scores
    });
  } catch (error) {
    console.error('Error getting batch attention scores:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/ads/:adId/attention-breakdown
 * 
 * Get detailed breakdown of attention score components.
 * 
 * Response:
 * {
 *   "ad_id": "ad_1920",
 *   "metrics": {
 *     "seen": { "count": 200, "weight": 1, "contribution": 200, "percentage": 54 },
 *     "scroll_stop": { "count": 40, "weight": 3, "contribution": 120, "percentage": 32 },
 *     "repeated_view": { "count": 10, "weight": 5, "contribution": 50, "percentage": 14 }
 *   },
 *   "total_score": 370,
 *   "engagement_rate": 25
 * }
 */
router.get('/:adId/attention-breakdown', (req, res) => {
  try {
    const { adId } = req.params;

    if (!adId) {
      return res.status(400).json({
        success: false,
        error: 'ad_id is required'
      });
    }

    const breakdown = attentionScoreService.getAttentionBreakdown(adId);

    res.json({
      success: true,
      ...breakdown
    });
  } catch (error) {
    console.error('Error getting attention breakdown:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/ads/:adId/attention-events
 * 
 * Get recent attention events for an ad.
 * 
 * Query params:
 *   - limit: number (default: 100, max: 500)
 *   - event_type: filter by event type
 *   - user_id: filter by user
 */
router.get('/:adId/attention-events', (req, res) => {
  try {
    const { adId } = req.params;
    const { limit = 100, event_type, user_id } = req.query;

    if (!adId) {
      return res.status(400).json({
        success: false,
        error: 'ad_id is required'
      });
    }

    const parsedLimit = Math.min(parseInt(limit) || 100, 500);

    const events = attentionScoreService.getAdAttentionEvents(adId, {
      limit: parsedLimit,
      eventType: event_type,
      userId: user_id
    });

    res.json({
      success: true,
      ad_id: adId,
      count: events.length,
      events
    });
  } catch (error) {
    console.error('Error getting attention events:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ============================================
// ANALYTICS ENDPOINTS
// ============================================

/**
 * GET /api/ads/attention/leaderboard
 * 
 * Get top ads by attention score.
 * 
 * Query params:
 *   - limit: number (default: 50, max: 100)
 */
router.get('/attention/leaderboard', (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 50, 100);

    const leaderboard = attentionScoreService.getAttentionLeaderboard(parsedLimit);

    res.json({
      success: true,
      ...leaderboard
    });
  } catch (error) {
    console.error('Error getting attention leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/ads/attention/seller-analytics
 * 
 * Get attention analytics for a seller's ads.
 * 
 * Request body:
 * {
 *   "seller_id": "seller_123",
 *   "ad_ids": ["ad_1", "ad_2", "ad_3"]
 * }
 */
router.post('/attention/seller-analytics', (req, res) => {
  try {
    const { seller_id, ad_ids } = req.body;

    if (!seller_id) {
      return res.status(400).json({
        success: false,
        error: 'seller_id is required'
      });
    }

    if (!Array.isArray(ad_ids) || ad_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ad_ids must be a non-empty array'
      });
    }

    const analytics = attentionScoreService.getSellerAttentionAnalytics(seller_id, ad_ids);

    res.json({
      success: true,
      ...analytics
    });
  } catch (error) {
    console.error('Error getting seller analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ============================================
// INFO ENDPOINT
// ============================================

/**
 * GET /api/ads/attention/info
 * 
 * Get information about the attention score system.
 */
router.get('/attention/info', (req, res) => {
  res.json({
    success: true,
    system: 'El Hannora Attention Score System',
    version: '1.0.0',
    event_types: attentionScoreService.VALID_EVENT_TYPES,
    weights: attentionScoreService.EVENT_WEIGHTS,
    formula: 'attention_score = (seen_count * 1) + (scroll_stop_count * 3) + (repeated_view_count * 5)',
    spam_prevention: {
      rules: [
        'Only 1 ad_seen per session per ad',
        'Only 1 scroll_stop per session per ad',
        'repeated_view requires previous view in different session'
      ]
    },
    endpoints: [
      { method: 'POST', path: '/api/ads/attention-event', description: 'Log attention event' },
      { method: 'POST', path: '/api/ads/attention-event/batch', description: 'Log multiple events' },
      { method: 'GET', path: '/api/ads/:adId/attention-score', description: 'Get ad attention score' },
      { method: 'POST', path: '/api/ads/attention-scores/batch', description: 'Get multiple ad scores' },
      { method: 'GET', path: '/api/ads/:adId/attention-breakdown', description: 'Get score breakdown' },
      { method: 'GET', path: '/api/ads/:adId/attention-events', description: 'Get ad events' },
      { method: 'GET', path: '/api/ads/attention/leaderboard', description: 'Get top ads' },
      { method: 'POST', path: '/api/ads/attention/seller-analytics', description: 'Get seller analytics' }
    ]
  });
});

  return router;
}

module.exports = { createAttentionScoreRouter };
