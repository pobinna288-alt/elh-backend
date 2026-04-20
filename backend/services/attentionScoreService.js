/**
 * ============================================
 * EL HANNORA - Attention Score Service
 * ============================================
 * 
 * Measures user attention/engagement with ads based on:
 *   - ad_seen: Ad becomes visible in viewport
 *   - scroll_stop: User stops scrolling on ad for 2+ seconds
 *   - repeated_view: User views same ad in different session
 * 
 * Attention Score Formula:
 *   score = (seen_count * 1) + (scroll_stop_count * 3) + (repeated_view_count * 5)
 * 
 * ============================================
 */

// ============================================
// CONSTANTS
// ============================================

const EVENT_TYPES = {
  AD_SEEN: 'ad_seen',
  SCROLL_STOP: 'scroll_stop',
  REPEATED_VIEW: 'repeated_view'
};

const EVENT_WEIGHTS = {
  [EVENT_TYPES.AD_SEEN]: 1,      // Low attention signal
  [EVENT_TYPES.SCROLL_STOP]: 3,  // Medium attention signal
  [EVENT_TYPES.REPEATED_VIEW]: 5 // High attention signal
};

const VALID_EVENT_TYPES = Object.values(EVENT_TYPES);

const DEVICE_TYPES = ['mobile', 'tablet', 'desktop'];

// ============================================
// IN-MEMORY STORE (Replace with real DB)
// ============================================

const attentionEvents = new Map(); // Map<eventKey, event>
const attentionScores = new Map(); // Map<adId, scoreData>
const sessionEventTracker = new Map(); // Map<sessionKey, Set<eventType>>

/**
 * Generate unique key for event deduplication
 */
function getSessionEventKey(adId, userId, sessionId) {
  return `${adId}:${userId}:${sessionId}`;
}

/**
 * Generate unique event ID
 */
function generateEventId() {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// EVENT VALIDATION
// ============================================

/**
 * Validate event data
 * @param {object} eventData - Event data to validate
 * @returns {object} - { valid: boolean, errors: string[] }
 */
function validateEventData(eventData) {
  const errors = [];

  if (!eventData.ad_id) {
    errors.push('ad_id is required');
  }

  if (!eventData.user_id) {
    errors.push('user_id is required');
  }

  if (!eventData.session_id) {
    errors.push('session_id is required');
  }

  if (!eventData.event_type) {
    errors.push('event_type is required');
  } else if (!VALID_EVENT_TYPES.includes(eventData.event_type)) {
    errors.push(`event_type must be one of: ${VALID_EVENT_TYPES.join(', ')}`);
  }

  if (eventData.device_type && !DEVICE_TYPES.includes(eventData.device_type)) {
    errors.push(`device_type must be one of: ${DEVICE_TYPES.join(', ')}`);
  }

  if (eventData.viewport_time_ms !== undefined && 
      (typeof eventData.viewport_time_ms !== 'number' || eventData.viewport_time_ms < 0)) {
    errors.push('viewport_time_ms must be a positive number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================
// SPAM PREVENTION
// ============================================

/**
 * Check if event should be blocked due to spam rules
 * Rules:
 *   - Only 1 ad_seen per session per ad
 *   - Only 1 scroll_stop per session per ad
 *   - repeated_view must occur in different session
 * 
 * @param {object} eventData - Event data
 * @returns {object} - { allowed: boolean, reason: string }
 */
function checkSpamPrevention(eventData) {
  const { ad_id, user_id, session_id, event_type } = eventData;
  const sessionKey = getSessionEventKey(ad_id, user_id, session_id);

  // Get existing events for this session
  const sessionEvents = sessionEventTracker.get(sessionKey) || new Set();

  // Rule: Only 1 ad_seen per session per ad
  if (event_type === EVENT_TYPES.AD_SEEN && sessionEvents.has(EVENT_TYPES.AD_SEEN)) {
    return {
      allowed: false,
      reason: 'ad_seen already recorded for this session'
    };
  }

  // Rule: Only 1 scroll_stop per session per ad
  if (event_type === EVENT_TYPES.SCROLL_STOP && sessionEvents.has(EVENT_TYPES.SCROLL_STOP)) {
    return {
      allowed: false,
      reason: 'scroll_stop already recorded for this session'
    };
  }

  // Rule: repeated_view must require previous session with ad_seen
  if (event_type === EVENT_TYPES.REPEATED_VIEW) {
    // Check if user has seen this ad in a DIFFERENT session
    const hasPreviousView = checkUserHasPreviousView(ad_id, user_id, session_id);
    if (!hasPreviousView) {
      return {
        allowed: false,
        reason: 'repeated_view requires previous view in different session'
      };
    }
  }

  return { allowed: true, reason: null };
}

/**
 * Check if user has viewed ad in a different session
 */
function checkUserHasPreviousView(adId, userId, currentSessionId) {
  for (const [key, event] of attentionEvents) {
    if (event.ad_id === adId && 
        event.user_id === userId && 
        event.session_id !== currentSessionId &&
        event.event_type === EVENT_TYPES.AD_SEEN) {
      return true;
    }
  }
  return false;
}

// ============================================
// EVENT LOGGING
// ============================================

/**
 * Log an attention event
 * @param {object} eventData - Event data
 * @returns {object} - Result with event or error
 */
function logAttentionEvent(eventData) {
  // Validate event data
  const validation = validateEventData(eventData);
  if (!validation.valid) {
    return {
      success: false,
      error: 'Validation failed',
      details: validation.errors
    };
  }

  // Check spam prevention rules
  const spamCheck = checkSpamPrevention(eventData);
  if (!spamCheck.allowed) {
    return {
      success: false,
      error: 'Event blocked by spam prevention',
      reason: spamCheck.reason,
      ignored: true
    };
  }

  // Create event record
  const event = {
    id: generateEventId(),
    ad_id: eventData.ad_id,
    user_id: eventData.user_id,
    event_type: eventData.event_type,
    session_id: eventData.session_id,
    device_type: eventData.device_type || null,
    viewport_time_ms: eventData.viewport_time_ms || null,
    created_at: new Date().toISOString()
  };

  // Store event
  attentionEvents.set(event.id, event);

  // Update session tracker
  const sessionKey = getSessionEventKey(eventData.ad_id, eventData.user_id, eventData.session_id);
  if (!sessionEventTracker.has(sessionKey)) {
    sessionEventTracker.set(sessionKey, new Set());
  }
  sessionEventTracker.get(sessionKey).add(eventData.event_type);

  // Update attention score for the ad
  updateAttentionScore(eventData.ad_id);

  return {
    success: true,
    event_id: event.id,
    event_type: event.event_type,
    ad_id: event.ad_id,
    message: 'Event logged successfully'
  };
}

// ============================================
// SCORE CALCULATION
// ============================================

/**
 * Calculate attention score using weighted formula
 * Formula: (seen * 1) + (scroll_stop * 3) + (repeated_view * 5)
 * 
 * @param {number} seenCount - Number of ad_seen events
 * @param {number} scrollStopCount - Number of scroll_stop events
 * @param {number} repeatedViewCount - Number of repeated_view events
 * @returns {number} - Attention score
 */
function calculateAttentionScore(seenCount, scrollStopCount, repeatedViewCount) {
  return (seenCount * EVENT_WEIGHTS[EVENT_TYPES.AD_SEEN]) +
         (scrollStopCount * EVENT_WEIGHTS[EVENT_TYPES.SCROLL_STOP]) +
         (repeatedViewCount * EVENT_WEIGHTS[EVENT_TYPES.REPEATED_VIEW]);
}

/**
 * Update attention score for an ad
 * @param {string} adId - Ad ID
 */
function updateAttentionScore(adId) {
  // Count events by type for this ad
  let seenCount = 0;
  let scrollStopCount = 0;
  let repeatedViewCount = 0;
  let uniqueUsers = new Set();
  let totalViewportTime = 0;

  for (const event of attentionEvents.values()) {
    if (event.ad_id === adId) {
      uniqueUsers.add(event.user_id);
      
      if (event.viewport_time_ms) {
        totalViewportTime += event.viewport_time_ms;
      }

      switch (event.event_type) {
        case EVENT_TYPES.AD_SEEN:
          seenCount++;
          break;
        case EVENT_TYPES.SCROLL_STOP:
          scrollStopCount++;
          break;
        case EVENT_TYPES.REPEATED_VIEW:
          repeatedViewCount++;
          break;
      }
    }
  }

  // Calculate score
  const score = calculateAttentionScore(seenCount, scrollStopCount, repeatedViewCount);

  // Store score data
  attentionScores.set(adId, {
    ad_id: adId,
    seen_count: seenCount,
    scroll_stop_count: scrollStopCount,
    repeated_view_count: repeatedViewCount,
    attention_score: score,
    unique_viewers: uniqueUsers.size,
    total_viewport_time_ms: totalViewportTime,
    last_updated: new Date().toISOString()
  });

  return score;
}

// ============================================
// SCORE RETRIEVAL
// ============================================

/**
 * Get attention score for a specific ad
 * @param {string} adId - Ad ID
 * @returns {object} - Score data or null
 */
function getAttentionScore(adId) {
  const score = attentionScores.get(adId);
  
  if (!score) {
    // Return default score if no events recorded
    return {
      ad_id: adId,
      seen_count: 0,
      scroll_stop_count: 0,
      repeated_view_count: 0,
      attention_score: 0,
      unique_viewers: 0,
      total_viewport_time_ms: 0,
      last_updated: null
    };
  }

  return score;
}

/**
 * Get attention scores for multiple ads
 * @param {string[]} adIds - Array of ad IDs
 * @returns {object[]} - Array of score data
 */
function getAttentionScoresBatch(adIds) {
  return adIds.map(adId => getAttentionScore(adId));
}

/**
 * Get top ads by attention score
 * @param {number} limit - Number of ads to return
 * @returns {object[]} - Array of score data sorted by attention_score
 */
function getTopAdsByAttention(limit = 20) {
  const scores = Array.from(attentionScores.values());
  
  return scores
    .sort((a, b) => b.attention_score - a.attention_score)
    .slice(0, limit);
}

/**
 * Get attention events for an ad
 * @param {string} adId - Ad ID
 * @param {object} options - Filter options
 * @returns {object[]} - Array of events
 */
function getAdAttentionEvents(adId, options = {}) {
  const { limit = 100, eventType = null, userId = null } = options;

  let events = Array.from(attentionEvents.values())
    .filter(e => e.ad_id === adId);

  if (eventType) {
    events = events.filter(e => e.event_type === eventType);
  }

  if (userId) {
    events = events.filter(e => e.user_id === userId);
  }

  return events
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

/**
 * Get attention breakdown by event type for an ad
 * @param {string} adId - Ad ID
 * @returns {object} - Breakdown statistics
 */
function getAttentionBreakdown(adId) {
  const score = getAttentionScore(adId);
  const totalScore = score.attention_score || 1;

  return {
    ad_id: adId,
    metrics: {
      seen: {
        count: score.seen_count,
        weight: EVENT_WEIGHTS[EVENT_TYPES.AD_SEEN],
        contribution: score.seen_count * EVENT_WEIGHTS[EVENT_TYPES.AD_SEEN],
        percentage: Math.round((score.seen_count * EVENT_WEIGHTS[EVENT_TYPES.AD_SEEN] / totalScore) * 100)
      },
      scroll_stop: {
        count: score.scroll_stop_count,
        weight: EVENT_WEIGHTS[EVENT_TYPES.SCROLL_STOP],
        contribution: score.scroll_stop_count * EVENT_WEIGHTS[EVENT_TYPES.SCROLL_STOP],
        percentage: Math.round((score.scroll_stop_count * EVENT_WEIGHTS[EVENT_TYPES.SCROLL_STOP] / totalScore) * 100)
      },
      repeated_view: {
        count: score.repeated_view_count,
        weight: EVENT_WEIGHTS[EVENT_TYPES.REPEATED_VIEW],
        contribution: score.repeated_view_count * EVENT_WEIGHTS[EVENT_TYPES.REPEATED_VIEW],
        percentage: Math.round((score.repeated_view_count * EVENT_WEIGHTS[EVENT_TYPES.REPEATED_VIEW] / totalScore) * 100)
      }
    },
    total_score: score.attention_score,
    unique_viewers: score.unique_viewers,
    engagement_rate: score.unique_viewers > 0 
      ? Math.round(((score.scroll_stop_count + score.repeated_view_count) / score.seen_count) * 100) 
      : 0
  };
}

// ============================================
// ANALYTICS
// ============================================

/**
 * Get attention analytics for a seller's ads
 * @param {string} sellerId - Seller ID
 * @param {string[]} adIds - Array of ad IDs owned by seller
 * @returns {object} - Analytics summary
 */
function getSellerAttentionAnalytics(sellerId, adIds) {
  const scores = adIds.map(adId => getAttentionScore(adId));
  
  const totalScore = scores.reduce((sum, s) => sum + s.attention_score, 0);
  const totalSeen = scores.reduce((sum, s) => sum + s.seen_count, 0);
  const totalScrollStops = scores.reduce((sum, s) => sum + s.scroll_stop_count, 0);
  const totalRepeatedViews = scores.reduce((sum, s) => sum + s.repeated_view_count, 0);
  const totalUniqueViewers = scores.reduce((sum, s) => sum + s.unique_viewers, 0);

  // Find best performing ad
  const bestAd = scores.reduce((best, current) => 
    (!best || current.attention_score > best.attention_score) ? current : best
  , null);

  return {
    seller_id: sellerId,
    summary: {
      total_ads: adIds.length,
      total_attention_score: totalScore,
      average_attention_score: adIds.length > 0 ? Math.round(totalScore / adIds.length) : 0,
      total_impressions: totalSeen,
      total_scroll_stops: totalScrollStops,
      total_repeated_views: totalRepeatedViews,
      total_unique_viewers: totalUniqueViewers,
      engagement_rate: totalSeen > 0 
        ? Math.round(((totalScrollStops + totalRepeatedViews) / totalSeen) * 100) 
        : 0
    },
    best_performing_ad: bestAd,
    ad_scores: scores
  };
}

/**
 * Get global attention leaderboard
 * @param {number} limit - Number of ads to return
 * @returns {object} - Leaderboard data
 */
function getAttentionLeaderboard(limit = 50) {
  const topAds = getTopAdsByAttention(limit);
  
  return {
    generated_at: new Date().toISOString(),
    total_tracked_ads: attentionScores.size,
    total_events: attentionEvents.size,
    leaderboard: topAds.map((ad, index) => ({
      rank: index + 1,
      ...ad
    }))
  };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Constants
  EVENT_TYPES,
  EVENT_WEIGHTS,
  VALID_EVENT_TYPES,

  // Event logging
  logAttentionEvent,
  validateEventData,
  checkSpamPrevention,

  // Score calculation
  calculateAttentionScore,
  updateAttentionScore,

  // Score retrieval
  getAttentionScore,
  getAttentionScoresBatch,
  getTopAdsByAttention,
  getAdAttentionEvents,
  getAttentionBreakdown,

  // Analytics
  getSellerAttentionAnalytics,
  getAttentionLeaderboard
};
