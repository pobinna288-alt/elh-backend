/**
 * El Hannora - Coin Reward Engine Service
 * 
 * Core service for calculating and managing coin rewards for ad viewers.
 * All calculations are performed server-side only - frontend values are never trusted.
 * 
 * Key Features:
 * - Linear coin scaling based on video duration
 * - Plan-based reward limits
 * - Anti-cheat validation
 * - Watch tracking and duplicate prevention
 * - Daily coin caps
 */

const { v4: uuidv4 } = require('uuid');
const {
  getPlanConfig,
  isValidPlan,
  PLAN_DAILY_COIN_CAP,
  VIEWER_DAILY_COIN_CAP,
  WATCH_COMPLETION_THRESHOLD,
  MINIMUM_WATCH_DURATION_SECONDS,
  MAX_ALLOWED_PLAYBACK_SPEED,
  WATCH_SESSION_TIMEOUT_MS,
  DEFAULT_PLAN
} = require('../config/subscriptionPlans');

// ─── In-Memory Storage (Production: Use Redis/Database) ────────────────────

/**
 * Published ads with their calculated coin rewards
 * Key: ad_id, Value: ad object
 */
const publishedAds = new Map();

/**
 * Track which viewers have earned coins from which ads
 * Key: `${viewer_id}:${ad_id}`, Value: { earned_at, coins }
 */
const viewerAdRewards = new Map();

/**
 * Daily coin earnings per viewer
 * Key: `${viewer_id}:${date}`, Value: total coins earned that day
 */
const dailyCoinEarnings = new Map();

/**
 * Active watch sessions
 * Key: session_id, Value: session object
 */
const watchSessions = new Map();

/**
 * Uploaded videos pending publication
 * Key: video_id, Value: video metadata
 */
const pendingVideos = new Map();


// ─── Coin Calculation Functions ────────────────────────────────────────────

/**
 * Calculate coin reward based on video duration and plan
 * 
 * Formula: coin_reward = floor((video_duration / max_duration) * max_coins)
 * 
 * @param {number} videoDurationSeconds - Actual video duration in seconds
 * @param {string} planType - User's subscription plan type
 * @returns {Object} Calculation result with coins and validation info
 */
function calculateCoinReward(videoDurationSeconds, planType) {
  const plan = getPlanConfig(planType);
  
  if (!plan) {
    return {
      success: false,
      error: `Invalid plan type: ${planType}`,
      coin_reward: 0
    };
  }

  // Ensure duration is a positive number
  const duration = Math.max(0, Number(videoDurationSeconds) || 0);
  
  // Calculate using the linear formula
  const rawReward = (duration / plan.max_video_duration) * plan.max_coin_reward;
  
  // Floor the result and enforce maximum cap
  let coinReward = Math.floor(rawReward);
  coinReward = Math.min(coinReward, plan.max_coin_reward);
  
  return {
    success: true,
    coin_reward: coinReward,
    video_duration: duration,
    plan_type: plan.id,
    daily_coin_limit: plan.daily_coin_limit || PLAN_DAILY_COIN_CAP[plan.id] || VIEWER_DAILY_COIN_CAP,
    ai_features: plan.ai_features || [],
    max_coin_reward: plan.max_coin_reward,
    max_video_duration: plan.max_video_duration,
    calculation: {
      formula: 'floor((video_duration / max_duration) * max_coins)',
      raw_value: rawReward,
      capped_value: coinReward
    }
  };
}

/**
 * Validate video duration against plan limits
 * @param {number} videoDurationSeconds - Video duration to validate
 * @param {string} planType - User's subscription plan
 * @returns {Object} Validation result
 */
function validateVideoDuration(videoDurationSeconds, planType) {
  const plan = getPlanConfig(planType);
  
  if (!plan) {
    return {
      valid: false,
      error: `Invalid plan type: ${planType}`
    };
  }

  const duration = Number(videoDurationSeconds) || 0;
  
  if (duration <= 0) {
    return {
      valid: false,
      error: 'Video duration must be greater than 0'
    };
  }

  if (duration > plan.max_video_duration) {
    return {
      valid: false,
      error: plan.id === 'HOT'
        ? 'Elite tier videos cannot exceed 7 minutes'
        : `Video exceeds allowed duration for your subscription plan. Maximum allowed: ${plan.max_video_duration}s, Your video: ${duration}s`,
      max_allowed: plan.max_video_duration,
      actual_duration: duration,
      plan_type: plan.id
    };
  }

  return {
    valid: true,
    duration: duration,
    max_allowed: plan.max_video_duration,
    plan_type: plan.id
  };
}


// ─── Video Upload Functions ────────────────────────────────────────────────

/**
 * Register an uploaded video (called after media processing extracts duration)
 * @param {string} userId - Uploader's user ID
 * @param {string} videoPath - Path to uploaded video
 * @param {number} extractedDuration - Duration extracted from video metadata (seconds)
 * @returns {Object} Video registration result
 */
function registerUploadedVideo(userId, videoPath, extractedDuration) {
  const videoId = uuidv4();
  
  const videoRecord = {
    video_id: videoId,
    user_id: userId,
    video_path: videoPath,
    duration_seconds: extractedDuration,
    uploaded_at: new Date(),
    status: 'pending', // pending -> published or rejected
    published_ad_id: null
  };

  pendingVideos.set(videoId, videoRecord);
  
  return {
    success: true,
    video_id: videoId,
    duration_seconds: extractedDuration,
    status: 'pending'
  };
}

/**
 * Get pending video by ID
 * @param {string} videoId - Video ID
 * @returns {Object|null} Video record or null
 */
function getPendingVideo(videoId) {
  return pendingVideos.get(videoId) || null;
}


// ─── Ad Publishing Functions ────────────────────────────────────────────────

/**
 * Publish an ad with calculated coin reward
 * 
 * SECURITY: This function calculates the coin reward server-side.
 * Frontend coin values are completely ignored.
 * 
 * @param {string} userId - Publisher's user ID
 * @param {string} videoId - ID of the uploaded video
 * @param {string} planType - User's current subscription plan
 * @param {Object} adMetadata - Additional ad metadata (title, description, etc.)
 * @returns {Object} Published ad result
 */
function publishAd(userId, videoId, planType, adMetadata = {}) {
  // Get the uploaded video
  const video = pendingVideos.get(videoId);
  
  if (!video) {
    return {
      success: false,
      error: 'Video not found. Please upload a video first.'
    };
  }

  if (video.user_id !== userId) {
    return {
      success: false,
      error: 'Unauthorized. You can only publish your own videos.'
    };
  }

  if (video.status === 'published') {
    return {
      success: false,
      error: 'This video has already been published.',
      existing_ad_id: video.published_ad_id
    };
  }

  // Validate duration against plan
  const validation = validateVideoDuration(video.duration_seconds, planType);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      validation_details: validation
    };
  }

  // Calculate coin reward (server-side only!)
  const rewardCalculation = calculateCoinReward(video.duration_seconds, planType);
  if (!rewardCalculation.success) {
    return {
      success: false,
      error: rewardCalculation.error
    };
  }

  // Create the published ad record
  const adId = uuidv4();
  const publishedAd = {
    ad_id: adId,
    user_id: userId,
    video_id: videoId,
    plan_type: planType,
    video_duration: video.duration_seconds,
    max_coin_reward_for_ad: rewardCalculation.coin_reward,
    title: adMetadata.title || 'Untitled Ad',
    description: adMetadata.description || '',
    category: adMetadata.category || 'general',
    video_path: video.video_path,
    status: 'active',
    views: 0,
    total_coins_distributed: 0,
    created_at: new Date(),
    updated_at: new Date()
  };

  // Store the published ad
  publishedAds.set(adId, publishedAd);
  
  // Update video status
  video.status = 'published';
  video.published_ad_id = adId;
  pendingVideos.set(videoId, video);

  return {
    success: true,
    ad_id: adId,
    max_coin_reward: publishedAd.max_coin_reward_for_ad,
    video_duration: publishedAd.video_duration,
    plan_type: planType,
    daily_coin_limit: rewardCalculation.daily_coin_limit,
    ai_features: rewardCalculation.ai_features,
    message: 'Ad published successfully. Viewers can earn up to ' + publishedAd.max_coin_reward_for_ad + ' coins.'
  };
}

/**
 * Get a published ad by ID
 * @param {string} adId - Ad ID
 * @returns {Object|null} Ad record or null
 */
function getPublishedAd(adId) {
  return publishedAds.get(adId) || null;
}

/**
 * Get all published ads (with pagination)
 * @param {number} limit - Max results
 * @param {number} offset - Offset for pagination
 * @returns {Array} Array of published ads
 */
function getPublishedAds(limit = 20, offset = 0) {
  const ads = Array.from(publishedAds.values())
    .filter(ad => ad.status === 'active')
    .sort((a, b) => b.created_at - a.created_at)
    .slice(offset, offset + limit);
  
  return ads;
}


// ─── Viewer Watch Session Functions ────────────────────────────────────────

/**
 * Start a watch session for a viewer
 * @param {string} viewerId - Viewer's user ID
 * @param {string} adId - Ad being watched
 * @returns {Object} Session creation result
 */
function startWatchSession(viewerId, adId) {
  const ad = publishedAds.get(adId);
  
  if (!ad) {
    return {
      success: false,
      error: 'Ad not found'
    };
  }

  // Check if viewer already earned coins from this ad
  const rewardKey = `${viewerId}:${adId}`;
  if (viewerAdRewards.has(rewardKey)) {
    const existing = viewerAdRewards.get(rewardKey);
    return {
      success: false,
      error: 'You have already earned coins from this ad',
      earned_coins: existing.coins,
      earned_at: existing.earned_at
    };
  }

  const sessionId = uuidv4();
  const session = {
    session_id: sessionId,
    viewer_id: viewerId,
    ad_id: adId,
    ad_duration: ad.video_duration,
    max_coins: ad.max_coin_reward_for_ad,
    watch_start: new Date(),
    watch_end: null,
    total_watch_time: 0,
    reported_playback_speed: 1.0,
    tab_visibility_changes: 0,
    pause_count: 0,
    seek_events: [],
    status: 'active',
    last_heartbeat: new Date()
  };

  watchSessions.set(sessionId, session);

  // Increment ad views
  ad.views++;
  publishedAds.set(adId, ad);

  return {
    success: true,
    session_id: sessionId,
    ad_duration: ad.video_duration,
    max_coins: ad.max_coin_reward_for_ad,
    completion_threshold: WATCH_COMPLETION_THRESHOLD * 100 + '%'
  };
}

/**
 * Update watch session with heartbeat data
 * @param {string} sessionId - Session ID
 * @param {Object} heartbeatData - Watch progress data
 * @returns {Object} Update result
 */
function updateWatchSession(sessionId, heartbeatData) {
  const session = watchSessions.get(sessionId);
  
  if (!session) {
    return {
      success: false,
      error: 'Session not found or expired'
    };
  }

  if (session.status !== 'active') {
    return {
      success: false,
      error: 'Session is no longer active'
    };
  }

  // Check for session timeout
  const now = new Date();
  if (now - session.last_heartbeat > WATCH_SESSION_TIMEOUT_MS) {
    session.status = 'timed_out';
    watchSessions.set(sessionId, session);
    return {
      success: false,
      error: 'Session timed out due to inactivity'
    };
  }

  // Update session with heartbeat data
  session.last_heartbeat = now;
  session.total_watch_time = heartbeatData.watch_time || session.total_watch_time;
  
  if (heartbeatData.playback_speed !== undefined) {
    session.reported_playback_speed = heartbeatData.playback_speed;
  }
  
  if (heartbeatData.tab_visible === false) {
    session.tab_visibility_changes++;
  }
  
  if (heartbeatData.paused) {
    session.pause_count++;
  }
  
  if (heartbeatData.seek_to !== undefined) {
    session.seek_events.push({
      from: heartbeatData.seek_from,
      to: heartbeatData.seek_to,
      timestamp: now
    });
  }

  watchSessions.set(sessionId, session);

  return {
    success: true,
    session_id: sessionId,
    watch_progress: (session.total_watch_time / session.ad_duration * 100).toFixed(1) + '%'
  };
}


// ─── Anti-Cheat Validation Functions ────────────────────────────────────────

/**
 * Validate watch session for anti-cheat compliance
 * @param {Object} session - Watch session to validate
 * @returns {Object} Validation result with detailed reasons
 */
function validateWatchSession(session) {
  const issues = [];

  // Check 1: Minimum watch time
  if (session.total_watch_time < MINIMUM_WATCH_DURATION_SECONDS) {
    issues.push({
      code: 'MIN_DURATION',
      message: `Watch time too short. Minimum: ${MINIMUM_WATCH_DURATION_SECONDS}s`
    });
  }

  // Check 2: Completion threshold
  const completionRate = session.total_watch_time / session.ad_duration;
  if (completionRate < WATCH_COMPLETION_THRESHOLD) {
    issues.push({
      code: 'INCOMPLETE_WATCH',
      message: `Watch completion below threshold. Required: ${WATCH_COMPLETION_THRESHOLD * 100}%, Actual: ${(completionRate * 100).toFixed(1)}%`
    });
  }

  // Check 3: Playback speed manipulation
  if (session.reported_playback_speed > MAX_ALLOWED_PLAYBACK_SPEED) {
    issues.push({
      code: 'SPEED_MANIPULATION',
      message: `Playback speed too high. Max allowed: ${MAX_ALLOWED_PLAYBACK_SPEED}x`
    });
  }

  // Check 4: Excessive tab visibility changes (background watching)
  if (session.tab_visibility_changes > 5) {
    issues.push({
      code: 'BACKGROUND_WATCHING',
      message: 'Excessive tab switching detected. Video must be watched with tab visible.'
    });
  }

  // Check 5: Excessive seeking (trying to skip)
  const totalSeekDistance = session.seek_events.reduce((total, seek) => {
    return total + Math.abs(seek.to - seek.from);
  }, 0);
  
  if (totalSeekDistance > session.ad_duration * 0.5) {
    issues.push({
      code: 'EXCESSIVE_SEEKING',
      message: 'Excessive video seeking detected. Please watch the video without skipping.'
    });
  }

  // Check 6: Watch time vs real elapsed time
  if (session.watch_end && session.watch_start) {
    const elapsedTime = (session.watch_end - session.watch_start) / 1000;
    const expectedMinTime = session.total_watch_time / MAX_ALLOWED_PLAYBACK_SPEED;
    
    if (elapsedTime < expectedMinTime * 0.8) {
      issues.push({
        code: 'TIME_ANOMALY',
        message: 'Watch timing anomaly detected. Possible manipulation.'
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues: issues,
    completion_rate: completionRate,
    watch_time: session.total_watch_time,
    required_time: session.ad_duration * WATCH_COMPLETION_THRESHOLD
  };
}


// ─── Coin Distribution Functions ────────────────────────────────────────────

/**
 * Complete a watch session and award coins if valid
 * 
 * SECURITY: Coins are only awarded after server-side validation.
 * Frontend cannot directly claim coins.
 * 
 * @param {string} sessionId - Session ID
 * @param {number} reportedWatchTime - Final watch time reported (will be validated)
 * @returns {Object} Coin award result
 */
function completeWatchAndAwardCoins(sessionId, reportedWatchTime) {
  const session = watchSessions.get(sessionId);
  
  if (!session) {
    return {
      success: false,
      error: 'Session not found or expired',
      coins_awarded: 0
    };
  }

  if (session.status === 'completed') {
    return {
      success: false,
      error: 'Session already completed',
      coins_awarded: 0
    };
  }

  if (session.status === 'timed_out') {
    return {
      success: false,
      error: 'Session timed out',
      coins_awarded: 0
    };
  }

  // Update final watch time
  session.watch_end = new Date();
  session.total_watch_time = Math.min(reportedWatchTime, session.ad_duration);
  session.status = 'validating';
  watchSessions.set(sessionId, session);

  // Check if viewer already earned from this ad (double-check)
  const rewardKey = `${session.viewer_id}:${session.ad_id}`;
  if (viewerAdRewards.has(rewardKey)) {
    session.status = 'duplicate_blocked';
    watchSessions.set(sessionId, session);
    return {
      success: false,
      error: 'You have already earned coins from this ad',
      coins_awarded: 0
    };
  }

  // Check daily coin cap
  const today = new Date().toISOString().split('T')[0];
  const dailyKey = `${session.viewer_id}:${today}`;
  const dailyEarned = dailyCoinEarnings.get(dailyKey) || 0;
  const adPlan = `${publishedAds.get(session.ad_id)?.plan_type || DEFAULT_PLAN}`.toUpperCase();
  const adPlanConfig = getPlanConfig(adPlan);
  const dailyCap = adPlanConfig?.daily_coin_limit || PLAN_DAILY_COIN_CAP[adPlan] || VIEWER_DAILY_COIN_CAP;
  
  if (dailyEarned >= dailyCap) {
    session.status = 'daily_cap_reached';
    watchSessions.set(sessionId, session);
    return {
      success: false,
      error: `Daily coin limit reached (${dailyCap} coins). Try again tomorrow.`,
      coins_awarded: 0,
      daily_earned: dailyEarned,
      daily_cap: dailyCap
    };
  }

  // Run anti-cheat validation
  const validation = validateWatchSession(session);
  
  if (!validation.valid) {
    session.status = 'rejected_anticheat';
    session.rejection_reasons = validation.issues;
    watchSessions.set(sessionId, session);
    return {
      success: false,
      error: 'Watch session did not meet requirements',
      issues: validation.issues,
      coins_awarded: 0
    };
  }

  // Calculate proportional coins based on actual watch completion
  const completionRate = Math.min(session.total_watch_time / session.ad_duration, 1.0);
  let coinsToAward = Math.floor(completionRate * session.max_coins);
  
  // Enforce daily cap
  const remainingDaily = dailyCap - dailyEarned;
  coinsToAward = Math.min(coinsToAward, remainingDaily);

  // Award the coins
  session.status = 'completed';
  session.coins_awarded = coinsToAward;
  watchSessions.set(sessionId, session);

  // Record the reward (prevents duplicate earning)
  viewerAdRewards.set(rewardKey, {
    earned_at: new Date(),
    coins: coinsToAward,
    session_id: sessionId
  });

  // Update daily earnings
  dailyCoinEarnings.set(dailyKey, dailyEarned + coinsToAward);

  // Update ad statistics
  const ad = publishedAds.get(session.ad_id);
  if (ad) {
    ad.total_coins_distributed += coinsToAward;
    ad.updated_at = new Date();
    publishedAds.set(session.ad_id, ad);
  }

  return {
    success: true,
    coins_awarded: coinsToAward,
    completion_rate: (completionRate * 100).toFixed(1) + '%',
    watch_time: session.total_watch_time,
    ad_duration: session.ad_duration,
    daily_earned_today: dailyEarned + coinsToAward,
    daily_remaining: dailyCap - (dailyEarned + coinsToAward),
    message: `Congratulations! You earned ${coinsToAward} coins.`
  };
}


// ─── Viewer Statistics Functions ────────────────────────────────────────────

/**
 * Get viewer's daily coin statistics
 * @param {string} viewerId - Viewer's user ID
 * @returns {Object} Daily statistics
 */
function getViewerDailyStats(viewerId) {
  const today = new Date().toISOString().split('T')[0];
  const dailyKey = `${viewerId}:${today}`;
  const dailyEarned = dailyCoinEarnings.get(dailyKey) || 0;
  const activeSession = Array.from(watchSessions.values()).find((session) => session.viewer_id === viewerId);
  const activePlan = `${publishedAds.get(activeSession?.ad_id)?.plan_type || DEFAULT_PLAN}`.toUpperCase();
  const activePlanConfig = getPlanConfig(activePlan);
  const dailyCap = activePlanConfig?.daily_coin_limit || PLAN_DAILY_COIN_CAP[activePlan] || VIEWER_DAILY_COIN_CAP;

  return {
    viewer_id: viewerId,
    date: today,
    coins_earned_today: dailyEarned,
    daily_cap: dailyCap,
    remaining: Math.max(0, dailyCap - dailyEarned),
    cap_reached: dailyEarned >= dailyCap
  };
}

/**
 * Check if viewer can earn from a specific ad
 * @param {string} viewerId - Viewer's user ID
 * @param {string} adId - Ad ID
 * @returns {Object} Eligibility result
 */
function checkViewerEligibility(viewerId, adId) {
  const rewardKey = `${viewerId}:${adId}`;
  const alreadyEarned = viewerAdRewards.has(rewardKey);
  
  const dailyStats = getViewerDailyStats(viewerId);
  const ad = publishedAds.get(adId);

  if (!ad) {
    return {
      eligible: false,
      reason: 'Ad not found'
    };
  }

  if (alreadyEarned) {
    const reward = viewerAdRewards.get(rewardKey);
    return {
      eligible: false,
      reason: 'Already earned coins from this ad',
      earned_coins: reward.coins,
      earned_at: reward.earned_at
    };
  }

  if (dailyStats.cap_reached) {
    return {
      eligible: false,
      reason: 'Daily coin limit reached',
      daily_stats: dailyStats
    };
  }

  return {
    eligible: true,
    max_coins_available: ad.max_coin_reward_for_ad,
    max_coins_can_earn: Math.min(ad.max_coin_reward_for_ad, dailyStats.remaining),
    daily_stats: dailyStats
  };
}


// ─── Admin/Reporting Functions ────────────────────────────────────────────

/**
 * Get statistics for published ads
 * @param {string} userId - Optional user ID to filter by publisher
 * @returns {Object} Ad statistics
 */
function getAdStatistics(userId = null) {
  let ads = Array.from(publishedAds.values());
  
  if (userId) {
    ads = ads.filter(ad => ad.user_id === userId);
  }

  const totalAds = ads.length;
  const totalViews = ads.reduce((sum, ad) => sum + ad.views, 0);
  const totalCoinsDistributed = ads.reduce((sum, ad) => sum + ad.total_coins_distributed, 0);

  return {
    total_ads: totalAds,
    total_views: totalViews,
    total_coins_distributed: totalCoinsDistributed,
    average_views_per_ad: totalAds > 0 ? (totalViews / totalAds).toFixed(1) : 0,
    ads: ads.map(ad => ({
      ad_id: ad.ad_id,
      title: ad.title,
      views: ad.views,
      coins_distributed: ad.total_coins_distributed,
      max_coin_reward: ad.max_coin_reward_for_ad,
      created_at: ad.created_at
    }))
  };
}

/**
 * Get watch session statistics
 * @returns {Object} Session statistics
 */
function getSessionStatistics() {
  const sessions = Array.from(watchSessions.values());
  
  const statusCounts = sessions.reduce((counts, session) => {
    counts[session.status] = (counts[session.status] || 0) + 1;
    return counts;
  }, {});

  const completedSessions = sessions.filter(s => s.status === 'completed');
  const totalCoinsAwarded = completedSessions.reduce((sum, s) => sum + (s.coins_awarded || 0), 0);

  return {
    total_sessions: sessions.length,
    status_breakdown: statusCounts,
    completed_sessions: completedSessions.length,
    total_coins_awarded: totalCoinsAwarded,
    average_coins_per_session: completedSessions.length > 0 
      ? (totalCoinsAwarded / completedSessions.length).toFixed(1) 
      : 0
  };
}


// ─── Export Module ────────────────────────────────────────────────────────

module.exports = {
  // Coin Calculation
  calculateCoinReward,
  validateVideoDuration,
  
  // Video Upload
  registerUploadedVideo,
  getPendingVideo,
  
  // Ad Publishing
  publishAd,
  getPublishedAd,
  getPublishedAds,
  
  // Watch Sessions
  startWatchSession,
  updateWatchSession,
  completeWatchAndAwardCoins,
  
  // Anti-Cheat
  validateWatchSession,
  
  // Viewer Statistics
  getViewerDailyStats,
  checkViewerEligibility,
  
  // Admin/Reporting
  getAdStatistics,
  getSessionStatistics,
  
  // Constants Export
  VIEWER_DAILY_COIN_CAP,
  WATCH_COMPLETION_THRESHOLD,
  MINIMUM_WATCH_DURATION_SECONDS,
  MAX_ALLOWED_PLAYBACK_SPEED
};
