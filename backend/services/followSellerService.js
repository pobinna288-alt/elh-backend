/**
 * ============================================
 * EL HANNORA - Follow Seller Service
 * ============================================
 * 
 * Complete implementation of the Follow Seller feature:
 *   - Follow/unfollow sellers
 *   - Followed feed with "new" badges
 *   - Engagement tracking with daily limits
 *   - Trust boost from high-trust followers
 *   - Engagement streaks and statistics
 * 
 * Business Rules:
 *   - Only users with trust_score >= 50 can influence seller trust
 *   - Trust boost is capped at +10 total from followers
 *   - Individual boost is 1-3 points based on follower's trust level
 *   - One unique interaction per user per ad per event type per day
 * 
 * @author El Hannora Team
 * @version 1.0.0
 */

// ============================================
// CONSTANTS
// ============================================

/**
 * Trust score thresholds
 */
const TRUST_THRESHOLDS = {
  MIN_INFLUENCE_TRUST: 50,    // Minimum trust to influence seller
  HIGH_TRUST: 70,             // High trust follower
  MAX_TRUST: 100
};

/**
 * Trust boost configuration
 */
const TRUST_BOOST = {
  MIN_BOOST: 1,               // Minimum boost per follow
  MAX_BOOST: 3,               // Maximum boost per follow
  TOTAL_CAP: 10,              // Maximum total boost from followers
  TRUST_50_BOOST: 1,          // Boost from 50-69 trust followers
  TRUST_70_BOOST: 2,          // Boost from 70-89 trust followers
  TRUST_90_BOOST: 3           // Boost from 90+ trust followers
};

/**
 * Engagement event weights for attention score
 */
const EVENT_WEIGHTS = {
  ad_seen: 1,
  scroll_stop: 3,
  repeated_view: 5,
  click: 4,
  save: 6,
  share: 8
};

/**
 * Valid event types
 */
const VALID_EVENT_TYPES = Object.keys(EVENT_WEIGHTS);

/**
 * Time thresholds for "new" badge (in hours)
 */
const NEW_AD_THRESHOLD_HOURS = 24;
const VERY_NEW_AD_THRESHOLD_HOURS = 1;

// ============================================
// IN-MEMORY STORAGE (Replace with PostgreSQL in production)
// ============================================

const followers = new Map();          // key: 'follower_id:seller_id', value: follower object
const sellerStats = new Map();        // key: seller_id, value: stats object
const engagementEvents = new Map();   // key: 'ad_id:user_id:event_type:date', value: event
const trustScoreLog = [];             // Array of trust score changes
const adBookmarks = new Map();        // key: 'user_id:ad_id', value: bookmark object

let followIdCounter = 1;
let engagementIdCounter = 1;
let trustLogIdCounter = 1;
let bookmarkIdCounter = 1;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate unique key for follower relationship
 */
function getFollowerKey(followerId, sellerId) {
  return `${followerId}:${sellerId}`;
}

/**
 * Generate unique key for daily engagement event
 */
function getEngagementKey(adId, userId, eventType) {
  const today = new Date().toISOString().split('T')[0];
  return `${adId}:${userId}:${eventType}:${today}`;
}

/**
 * Generate unique key for bookmark
 */
function getBookmarkKey(userId, adId) {
  return `${userId}:${adId}`;
}

/**
 * Calculate trust boost amount based on follower's trust score
 */
function calculateTrustBoost(followerTrustScore) {
  if (followerTrustScore < TRUST_THRESHOLDS.MIN_INFLUENCE_TRUST) {
    return 0;
  }
  if (followerTrustScore >= 90) {
    return TRUST_BOOST.TRUST_90_BOOST;
  }
  if (followerTrustScore >= 70) {
    return TRUST_BOOST.TRUST_70_BOOST;
  }
  return TRUST_BOOST.TRUST_50_BOOST;
}

/**
 * Check if ad is "new" (within threshold hours)
 */
function isNewAd(adCreatedAt, thresholdHours = NEW_AD_THRESHOLD_HOURS) {
  const adDate = new Date(adCreatedAt);
  const now = new Date();
  const hoursDiff = (now - adDate) / (1000 * 60 * 60);
  return hoursDiff <= thresholdHours;
}

/**
 * Get or create seller stats
 */
function getOrCreateSellerStats(sellerId) {
  if (!sellerStats.has(sellerId)) {
    sellerStats.set(sellerId, {
      seller_id: sellerId,
      follower_count: 0,
      high_trust_follower_count: 0,
      total_follower_engagements: 0,
      avg_engagement_per_follower: 0,
      total_trust_boost_received: 0,
      trust_boost_cap_reached: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  return sellerStats.get(sellerId);
}

// ============================================
// TRUST SCORE LOGGING
// ============================================

/**
 * Log a trust score change for audit trail
 */
function logTrustScoreChange({
  userId,
  previousScore,
  newScore,
  changeAmount,
  reason,
  reasonDetail = null,
  sourceType,
  sourceUserId = null
}) {
  const logEntry = {
    id: trustLogIdCounter++,
    user_id: userId,
    previous_score: previousScore,
    new_score: newScore,
    change_amount: changeAmount,
    reason,
    reason_detail: reasonDetail,
    source_type: sourceType,
    source_user_id: sourceUserId,
    created_at: new Date().toISOString()
  };
  
  trustScoreLog.push(logEntry);
  
  // Keep only last 10000 entries in memory
  if (trustScoreLog.length > 10000) {
    trustScoreLog.splice(0, trustScoreLog.length - 10000);
  }
  
  console.log(`[Trust Log] User ${userId}: ${previousScore} → ${newScore} (${changeAmount >= 0 ? '+' : ''}${changeAmount}) [${sourceType}] - ${reason}`);
  
  return logEntry;
}

/**
 * Get trust score history for a user
 */
function getTrustScoreHistory(userId, limit = 50) {
  return trustScoreLog
    .filter(log => log.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

// ============================================
// FOLLOW/UNFOLLOW FUNCTIONS
// ============================================

/**
 * Follow a seller
 * 
 * @param {object} params - Follow parameters
 * @param {string} params.followerId - ID of the user following
 * @param {string} params.sellerId - ID of the seller being followed
 * @param {object} params.follower - Follower user object (with trust_score)
 * @param {object} params.seller - Seller user object (with trust_score)
 * @param {boolean} params.notificationsEnabled - Enable notifications for new ads
 * @param {boolean} params.autoBookmarkNewAds - Auto-bookmark new ads from seller
 * @returns {object} - Result with follow data and trust boost info
 */
function followSeller({
  followerId,
  sellerId,
  follower,
  seller,
  notificationsEnabled = true,
  autoBookmarkNewAds = false
}) {
  // Validation: No self-following
  if (followerId === sellerId) {
    return {
      success: false,
      error: 'Cannot follow yourself',
      code: 'SELF_FOLLOW_NOT_ALLOWED'
    };
  }
  
  // Check if already following
  const key = getFollowerKey(followerId, sellerId);
  if (followers.has(key)) {
    return {
      success: false,
      error: 'Already following this seller',
      code: 'ALREADY_FOLLOWING'
    };
  }
  
  // Calculate trust boost
  let trustBoostAmount = 0;
  let trustBoostApplied = false;
  const followerTrustScore = follower.trust_score || 0;
  
  // Get seller stats
  const stats = getOrCreateSellerStats(sellerId);
  
  // Only high-trust followers can influence trust
  if (followerTrustScore >= TRUST_THRESHOLDS.MIN_INFLUENCE_TRUST) {
    // Check if cap is reached
    if (stats.total_trust_boost_received < TRUST_BOOST.TOTAL_CAP) {
      const potentialBoost = calculateTrustBoost(followerTrustScore);
      const remainingCap = TRUST_BOOST.TOTAL_CAP - stats.total_trust_boost_received;
      trustBoostAmount = Math.min(potentialBoost, remainingCap);
      
      if (trustBoostAmount > 0) {
        trustBoostApplied = true;
        
        // Update seller trust score
        const previousScore = seller.trust_score || 50;
        const newScore = Math.min(100, previousScore + trustBoostAmount);
        seller.trust_score = newScore;
        
        // Log the trust change
        logTrustScoreChange({
          userId: sellerId,
          previousScore,
          newScore,
          changeAmount: trustBoostAmount,
          reason: 'Followed by high-trust user',
          reasonDetail: `Follower trust score: ${followerTrustScore}`,
          sourceType: 'follower_boost',
          sourceUserId: followerId
        });
        
        // Update stats
        stats.total_trust_boost_received += trustBoostAmount;
        stats.trust_boost_cap_reached = stats.total_trust_boost_received >= TRUST_BOOST.TOTAL_CAP;
      }
    }
    
    stats.high_trust_follower_count++;
  }
  
  // Create follow record
  const follow = {
    id: followIdCounter++,
    follower_id: followerId,
    seller_id: sellerId,
    notifications_enabled: notificationsEnabled,
    auto_bookmark_new_ads: autoBookmarkNewAds,
    engagement_streak: 0,
    last_engagement_date: null,
    total_interactions: 0,
    trust_boost_applied: trustBoostApplied,
    trust_boost_amount: trustBoostAmount,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  followers.set(key, follow);
  
  // Update seller stats
  stats.follower_count++;
  stats.updated_at = new Date().toISOString();
  
  console.log(`[Follow] User ${followerId} followed seller ${sellerId}. Trust boost: ${trustBoostAmount}`);
  
  return {
    success: true,
    data: {
      follow,
      seller_stats: {
        follower_count: stats.follower_count,
        trust_boost_received: stats.total_trust_boost_received,
        trust_boost_cap_reached: stats.trust_boost_cap_reached
      },
      trust_boost: {
        applied: trustBoostApplied,
        amount: trustBoostAmount,
        reason: trustBoostApplied 
          ? `High-trust follower (${followerTrustScore}) added ${trustBoostAmount} points`
          : followerTrustScore < TRUST_THRESHOLDS.MIN_INFLUENCE_TRUST
            ? `Trust score ${followerTrustScore} below threshold (${TRUST_THRESHOLDS.MIN_INFLUENCE_TRUST})`
            : 'Trust boost cap reached'
      }
    }
  };
}

/**
 * Unfollow a seller
 * 
 * @param {string} followerId - ID of the user unfollowing
 * @param {string} sellerId - ID of the seller being unfollowed
 * @returns {object} - Result of unfollow operation
 */
function unfollowSeller(followerId, sellerId) {
  const key = getFollowerKey(followerId, sellerId);
  
  if (!followers.has(key)) {
    return {
      success: false,
      error: 'Not following this seller',
      code: 'NOT_FOLLOWING'
    };
  }
  
  const follow = followers.get(key);
  
  // Note: Trust boost is NOT reversed on unfollow (per business rule)
  // This prevents gaming the system by follow/unfollow cycles
  
  // Update seller stats
  const stats = getOrCreateSellerStats(sellerId);
  stats.follower_count = Math.max(0, stats.follower_count - 1);
  
  if (follow.trust_boost_applied) {
    stats.high_trust_follower_count = Math.max(0, stats.high_trust_follower_count - 1);
  }
  
  stats.updated_at = new Date().toISOString();
  
  // Remove follow record
  followers.delete(key);
  
  console.log(`[Unfollow] User ${followerId} unfollowed seller ${sellerId}`);
  
  return {
    success: true,
    data: {
      unfollowed: true,
      seller_stats: {
        follower_count: stats.follower_count
      }
    }
  };
}

/**
 * Check if user is following a seller
 */
function isFollowing(followerId, sellerId) {
  const key = getFollowerKey(followerId, sellerId);
  return followers.has(key);
}

/**
 * Get follow relationship details
 */
function getFollowDetails(followerId, sellerId) {
  const key = getFollowerKey(followerId, sellerId);
  return followers.get(key) || null;
}

// ============================================
// FOLLOWED FEED FUNCTIONS
// ============================================

/**
 * Get followed seller feed for a user
 * 
 * @param {string} userId - User ID
 * @param {array} allAds - All ads in the system
 * @param {object} options - Feed options
 * @returns {object} - Feed with ads and metadata
 */
function getFollowedFeed(userId, allAds, options = {}) {
  const {
    limit = 20,
    offset = 0,
    sortBy = 'created_at',
    sortOrder = 'DESC',
    onlyNew = false,
    sellerId = null  // Filter by specific seller
  } = options;
  
  // Get all sellers this user follows
  const followedSellerIds = new Set();
  const followData = new Map();
  
  for (const [key, follow] of followers.entries()) {
    if (follow.follower_id === userId) {
      followedSellerIds.add(follow.seller_id);
      followData.set(follow.seller_id, follow);
    }
  }
  
  if (followedSellerIds.size === 0) {
    return {
      success: true,
      data: {
        ads: [],
        total: 0,
        limit,
        offset,
        has_more: false,
        following_count: 0
      }
    };
  }
  
  // Filter ads from followed sellers
  let feedAds = allAds.filter(ad => {
    // Must be from a followed seller
    if (!followedSellerIds.has(ad.seller_id)) return false;
    
    // Filter by specific seller if requested
    if (sellerId && ad.seller_id !== sellerId) return false;
    
    // Must be active
    if (ad.status !== 'active') return false;
    
    // Filter only new ads if requested
    if (onlyNew && !isNewAd(ad.created_at)) return false;
    
    return true;
  });
  
  // Add "is_new" flag and follow info
  feedAds = feedAds.map(ad => {
    const followInfo = followData.get(ad.seller_id);
    return {
      ...ad,
      is_new: isNewAd(ad.created_at, NEW_AD_THRESHOLD_HOURS),
      is_very_new: isNewAd(ad.created_at, VERY_NEW_AD_THRESHOLD_HOURS),
      followed_at: followInfo?.created_at,
      from_followed_seller: true
    };
  });
  
  // Sort
  feedAds.sort((a, b) => {
    const aVal = sortBy === 'created_at' ? new Date(a.created_at) : a[sortBy];
    const bVal = sortBy === 'created_at' ? new Date(b.created_at) : b[sortBy];
    
    if (sortOrder === 'DESC') {
      return bVal - aVal;
    }
    return aVal - bVal;
  });
  
  const total = feedAds.length;
  
  // Paginate
  feedAds = feedAds.slice(offset, offset + limit);
  
  return {
    success: true,
    data: {
      ads: feedAds,
      total,
      limit,
      offset,
      has_more: offset + feedAds.length < total,
      following_count: followedSellerIds.size,
      new_ads_count: feedAds.filter(ad => ad.is_new).length
    }
  };
}

/**
 * Get feed from a specific followed seller
 */
function getSellerFeed(userId, sellerId, allAds, options = {}) {
  return getFollowedFeed(userId, allAds, { ...options, sellerId });
}

// ============================================
// ENGAGEMENT TRACKING FUNCTIONS
// ============================================

/**
 * Track engagement event on a followed seller's ad
 * Enforces daily unique limit per user per ad per event type
 * 
 * @param {object} params - Event parameters
 * @returns {object} - Result with engagement data
 */
function trackEngagement({
  adId,
  userId,
  sellerId,
  eventType,
  sessionId = null,
  deviceType = null,
  viewportTimeMs = null
}) {
  // Validate event type
  if (!VALID_EVENT_TYPES.includes(eventType)) {
    return {
      success: false,
      error: `Invalid event type. Must be one of: ${VALID_EVENT_TYPES.join(', ')}`,
      code: 'INVALID_EVENT_TYPE'
    };
  }
  
  // Check for daily duplicate
  const key = getEngagementKey(adId, userId, eventType);
  if (engagementEvents.has(key)) {
    return {
      success: true,
      ignored: true,
      reason: 'Event already recorded for today',
      code: 'DUPLICATE_DAILY_EVENT'
    };
  }
  
  // Create engagement event
  const event = {
    id: engagementIdCounter++,
    ad_id: adId,
    user_id: userId,
    seller_id: sellerId,
    event_type: eventType,
    event_date: new Date().toISOString().split('T')[0],
    session_id: sessionId,
    device_type: deviceType,
    viewport_time_ms: viewportTimeMs,
    created_at: new Date().toISOString()
  };
  
  engagementEvents.set(key, event);
  
  // Update follower engagement stats
  const followKey = getFollowerKey(userId, sellerId);
  const follow = followers.get(followKey);
  
  if (follow) {
    const today = new Date().toISOString().split('T')[0];
    const wasEngagedToday = follow.last_engagement_date === today;
    
    follow.total_interactions++;
    
    if (!wasEngagedToday) {
      // Check if streak continues
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (follow.last_engagement_date === yesterdayStr) {
        follow.engagement_streak++;
      } else if (follow.last_engagement_date !== today) {
        follow.engagement_streak = 1; // Reset streak
      }
      
      follow.last_engagement_date = today;
    }
    
    follow.updated_at = new Date().toISOString();
  }
  
  // Update seller stats
  const stats = getOrCreateSellerStats(sellerId);
  stats.total_follower_engagements++;
  if (stats.follower_count > 0) {
    stats.avg_engagement_per_follower = 
      stats.total_follower_engagements / stats.follower_count;
  }
  stats.updated_at = new Date().toISOString();
  
  console.log(`[Engagement] User ${userId} - ${eventType} on ad ${adId} from seller ${sellerId}`);
  
  return {
    success: true,
    data: {
      event,
      engagement_streak: follow?.engagement_streak || 0,
      total_interactions: follow?.total_interactions || 1
    }
  };
}

/**
 * Get engagement statistics for a user with a seller
 */
function getEngagementStats(userId, sellerId) {
  const followKey = getFollowerKey(userId, sellerId);
  const follow = followers.get(followKey);
  
  if (!follow) {
    return {
      success: false,
      error: 'Not following this seller',
      code: 'NOT_FOLLOWING'
    };
  }
  
  // Count events by type for this week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];
  
  const weeklyStats = {
    ad_seen: 0,
    scroll_stop: 0,
    repeated_view: 0,
    click: 0,
    save: 0,
    share: 0
  };
  
  for (const [key, event] of engagementEvents.entries()) {
    if (event.user_id === userId && 
        event.seller_id === sellerId &&
        event.event_date >= oneWeekAgoStr) {
      weeklyStats[event.event_type]++;
    }
  }
  
  const totalWeeklyViews = weeklyStats.ad_seen + weeklyStats.repeated_view;
  
  return {
    success: true,
    data: {
      follower_id: userId,
      seller_id: sellerId,
      engagement_streak: follow.engagement_streak,
      total_interactions: follow.total_interactions,
      last_engagement_date: follow.last_engagement_date,
      weekly_stats: weeklyStats,
      weekly_summary: `You've viewed ${totalWeeklyViews} ads from this seller this week.`,
      follow_date: follow.created_at
    }
  };
}

/**
 * Calculate attention score for an ad based on engagement
 * Formula: (seen * 1) + (scroll_stop * 3) + (repeated_view * 5) + (click * 4) + (save * 6) + (share * 8)
 */
function calculateAttentionScore(adId) {
  const eventCounts = {
    ad_seen: 0,
    scroll_stop: 0,
    repeated_view: 0,
    click: 0,
    save: 0,
    share: 0
  };
  
  // Count unique users per event type (not daily events)
  const uniqueUserEvents = new Map();
  
  for (const [key, event] of engagementEvents.entries()) {
    if (event.ad_id === adId) {
      const userEventKey = `${event.user_id}:${event.event_type}`;
      if (!uniqueUserEvents.has(userEventKey)) {
        uniqueUserEvents.set(userEventKey, event);
        eventCounts[event.event_type]++;
      }
    }
  }
  
  // Calculate weighted score
  let score = 0;
  for (const [eventType, count] of Object.entries(eventCounts)) {
    score += count * (EVENT_WEIGHTS[eventType] || 0);
  }
  
  // Cap at 1000 to prevent abuse
  const cappedScore = Math.min(score, 1000);
  
  return {
    raw_score: score,
    capped_score: cappedScore,
    event_counts: eventCounts,
    unique_engagers: uniqueUserEvents.size
  };
}

// ============================================
// BOOKMARK FUNCTIONS
// ============================================

/**
 * Bookmark an ad
 */
function bookmarkAd(userId, adId, isAutoBookmark = false, fromFollowedSeller = false) {
  const key = getBookmarkKey(userId, adId);
  
  if (adBookmarks.has(key)) {
    return {
      success: false,
      error: 'Ad already bookmarked',
      code: 'ALREADY_BOOKMARKED'
    };
  }
  
  const bookmark = {
    id: bookmarkIdCounter++,
    user_id: userId,
    ad_id: adId,
    auto_bookmarked: isAutoBookmark,
    from_followed_seller: fromFollowedSeller,
    created_at: new Date().toISOString()
  };
  
  adBookmarks.set(key, bookmark);
  
  return {
    success: true,
    data: bookmark
  };
}

/**
 * Remove bookmark
 */
function removeBookmark(userId, adId) {
  const key = getBookmarkKey(userId, adId);
  
  if (!adBookmarks.has(key)) {
    return {
      success: false,
      error: 'Bookmark not found',
      code: 'NOT_BOOKMARKED'
    };
  }
  
  adBookmarks.delete(key);
  
  return {
    success: true,
    data: { removed: true }
  };
}

/**
 * Get user's bookmarks
 */
function getBookmarks(userId, options = {}) {
  const { onlyAuto = false, limit = 50, offset = 0 } = options;
  
  let bookmarks = [];
  
  for (const [key, bookmark] of adBookmarks.entries()) {
    if (bookmark.user_id === userId) {
      if (onlyAuto && !bookmark.auto_bookmarked) continue;
      bookmarks.push(bookmark);
    }
  }
  
  // Sort by created_at desc
  bookmarks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  const total = bookmarks.length;
  bookmarks = bookmarks.slice(offset, offset + limit);
  
  return {
    success: true,
    data: {
      bookmarks,
      total,
      limit,
      offset,
      has_more: offset + bookmarks.length < total
    }
  };
}

/**
 * Auto-bookmark new ads from followed sellers (for users with auto_bookmark enabled)
 */
function autoBookmarkNewAds(userId, newAd) {
  const followKey = getFollowerKey(userId, newAd.seller_id);
  const follow = followers.get(followKey);
  
  if (!follow || !follow.auto_bookmark_new_ads) {
    return { success: false, reason: 'Auto-bookmark not enabled' };
  }
  
  return bookmarkAd(userId, newAd.id, true, true);
}

// ============================================
// LIST/QUERY FUNCTIONS
// ============================================

/**
 * Get list of sellers a user follows
 */
function getFollowedSellers(userId, limit = 50, offset = 0) {
  const followedSellers = [];
  
  for (const [key, follow] of followers.entries()) {
    if (follow.follower_id === userId) {
      followedSellers.push({
        seller_id: follow.seller_id,
        followed_at: follow.created_at,
        engagement_streak: follow.engagement_streak,
        total_interactions: follow.total_interactions,
        notifications_enabled: follow.notifications_enabled
      });
    }
  }
  
  // Sort by followed_at desc
  followedSellers.sort((a, b) => new Date(b.followed_at) - new Date(a.followed_at));
  
  const total = followedSellers.length;
  const paginated = followedSellers.slice(offset, offset + limit);
  
  return {
    success: true,
    data: {
      sellers: paginated,
      total,
      limit,
      offset,
      has_more: offset + paginated.length < total
    }
  };
}

/**
 * Get all seller IDs a user follows
 */
function getFollowedSellerIds(userId) {
  const sellerIds = [];

  for (const follow of followers.values()) {
    if (follow.follower_id === userId) {
      sellerIds.push(follow.seller_id);
    }
  }

  return Array.from(new Set(sellerIds));
}

/**
 * Get following count for a user
 */
function getFollowingCount(userId) {
  return getFollowedSellerIds(userId).length;
}

/**
 * Count new ads from followed sellers since the provided timestamp
 */
function countNewAdsFromFollowedSellers(userId, allAds = [], lastSeenTime = null) {
  const followedSellerIds = new Set(getFollowedSellerIds(userId));

  if (followedSellerIds.size === 0) {
    return 0;
  }

  const parsedLastSeen = lastSeenTime ? new Date(lastSeenTime) : new Date(0);
  const safeLastSeen = Number.isNaN(parsedLastSeen.getTime()) ? new Date(0) : parsedLastSeen;

  return allAds.filter((ad) => {
    const sellerId = ad?.seller_id || ad?.userId || ad?.user_id;
    const isActive = ad?.active !== false && ad?.isActive !== false && (!ad?.status || ad.status === 'active' || ad.status === 'published');
    const createdAt = new Date(ad?.created_at || ad?.createdAt || 0);

    return (
      followedSellerIds.has(sellerId) &&
      isActive &&
      !Number.isNaN(createdAt.getTime()) &&
      createdAt > safeLastSeen
    );
  }).length;
}

/**
 * Get list of followers for a seller
 */
function getSellerFollowers(sellerId, limit = 50, offset = 0) {
  const sellerFollowers = [];
  
  for (const [key, follow] of followers.entries()) {
    if (follow.seller_id === sellerId) {
      sellerFollowers.push({
        follower_id: follow.follower_id,
        followed_at: follow.created_at,
        trust_boost_applied: follow.trust_boost_applied,
        trust_boost_amount: follow.trust_boost_amount,
        engagement_streak: follow.engagement_streak
      });
    }
  }
  
  // Sort by followed_at desc
  sellerFollowers.sort((a, b) => new Date(b.followed_at) - new Date(a.followed_at));
  
  const total = sellerFollowers.length;
  const paginated = sellerFollowers.slice(offset, offset + limit);
  
  // Get stats
  const stats = getOrCreateSellerStats(sellerId);
  
  return {
    success: true,
    data: {
      followers: paginated,
      total,
      limit,
      offset,
      has_more: offset + paginated.length < total,
      stats: {
        follower_count: stats.follower_count,
        high_trust_followers: stats.high_trust_follower_count,
        total_trust_boost: stats.total_trust_boost_received,
        trust_boost_cap_reached: stats.trust_boost_cap_reached
      }
    }
  };
}

/**
 * Get seller's follower statistics
 */
function getSellerStats(sellerId) {
  const stats = getOrCreateSellerStats(sellerId);
  
  return {
    success: true,
    data: stats
  };
}

/**
 * Update follow preferences
 */
function updateFollowPreferences(followerId, sellerId, preferences) {
  const key = getFollowerKey(followerId, sellerId);
  const follow = followers.get(key);
  
  if (!follow) {
    return {
      success: false,
      error: 'Not following this seller',
      code: 'NOT_FOLLOWING'
    };
  }
  
  if (preferences.notifications_enabled !== undefined) {
    follow.notifications_enabled = preferences.notifications_enabled;
  }
  
  if (preferences.auto_bookmark_new_ads !== undefined) {
    follow.auto_bookmark_new_ads = preferences.auto_bookmark_new_ads;
  }
  
  follow.updated_at = new Date().toISOString();
  
  return {
    success: true,
    data: follow
  };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Constants
  TRUST_THRESHOLDS,
  TRUST_BOOST,
  EVENT_WEIGHTS,
  VALID_EVENT_TYPES,
  NEW_AD_THRESHOLD_HOURS,
  
  // Follow/Unfollow
  followSeller,
  unfollowSeller,
  isFollowing,
  getFollowDetails,
  
  // Feed
  getFollowedFeed,
  getSellerFeed,
  
  // Engagement
  trackEngagement,
  getEngagementStats,
  calculateAttentionScore,
  
  // Bookmarks
  bookmarkAd,
  removeBookmark,
  getBookmarks,
  autoBookmarkNewAds,
  
  // Lists/Queries
  getFollowedSellers,
  getFollowedSellerIds,
  getFollowingCount,
  countNewAdsFromFollowedSellers,
  getSellerFollowers,
  getSellerStats,
  updateFollowPreferences,
  
  // Trust Logging
  logTrustScoreChange,
  getTrustScoreHistory,
  
  // Utilities
  isNewAd,
  calculateTrustBoost
};
