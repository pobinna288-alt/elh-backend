/**
 * El Hannora - Trust Score Service
 * 
 * Comprehensive trust score management system.
 * 
 * Features:
 * - Base score of 30 for new users
 * - Email verification reward (+10, one-time)
 * - Account age bonuses (+5/+10/+15)
 * - Strict penalty system for violations
 * - Score bounds (0-100)
 * - Trust level classification
 * - Complete audit trail
 * 
 * @author El Hannora Team
 * @version 2.0.0
 */

// ============================================
// CONSTANTS
// ============================================

/**
 * Base trust score for new accounts
 */
const BASE_TRUST_SCORE = 30;

/**
 * Email verification reward (one-time)
 */
const EMAIL_VERIFICATION_REWARD = 10;

/**
 * Account age bonuses (only highest applies)
 */
const AGE_BONUSES = {
  DAYS_30: { days: 30, bonus: 5 },
  DAYS_180: { days: 180, bonus: 10 },
  DAYS_365: { days: 365, bonus: 15 }
};

/**
 * Violation penalties (negative values)
 */
const VIOLATION_PENALTIES = {
  user_report: -10,
  spam_ad: -15,
  fake_ad: -20,
  sexual_content: -20,
  scam: -50
};

/**
 * Trust score bounds
 */
const MIN_TRUST_SCORE = 0;
const MAX_TRUST_SCORE = 100;

/**
 * Trust level thresholds
 */
const TRUST_LEVELS = {
  NEW_SELLER: { min: 0, max: 39, label: 'New Seller' },
  VERIFIED_SELLER: { min: 40, max: 69, label: 'Verified Seller' },
  TRUSTED_SELLER: { min: 70, max: 100, label: 'Trusted Seller' }
};

/**
 * Event types for trust changes
 */
const EVENT_TYPES = {
  ACCOUNT_CREATED: 'account_created',
  EMAIL_VERIFIED: 'email_verified',
  ACCOUNT_AGE_BONUS: 'account_age_bonus',
  USER_REPORT_CONFIRMED: 'user_report_confirmed',
  SPAM_AD_DETECTED: 'spam_ad_detected',
  FAKE_AD_DETECTED: 'fake_ad_detected',
  SEXUAL_CONTENT_DETECTED: 'sexual_content_detected',
  CONFIRMED_SCAM: 'confirmed_scam',
  MANUAL_ADJUSTMENT: 'manual_adjustment',
  APPEAL_APPROVED: 'appeal_approved'
};

/**
 * Structured event metadata for every trust change.
 * Each entry defines the system reason code, the human-readable label
 * shown to the frontend, and the source of the change.
 * 
 * source is one of: "system" | "user_report" | "admin" | "verification"
 */
const SCORE_EVENT_META = {
  account_created:          { reason: 'account_created',          label: '+30 New account created',          source: 'system' },
  email_verified:           { reason: 'email_verified',           label: '+10 Email verified',               source: 'verification' },
  account_age_bonus:        { reason: 'account_age_bonus',        label: 'Account age milestone reached',    source: 'system' },
  // Age milestone variants (label set dynamically)
  account_age_30_days:      { reason: 'account_age_30_days',      label: '+5 Account is 30 days old',        source: 'system' },
  account_age_180_days:     { reason: 'account_age_180_days',     label: '+10 Account is 180 days old',      source: 'system' },
  account_age_365_days:     { reason: 'account_age_365_days',     label: '+15 Account is 365 days old',      source: 'system' },
  // Violations
  user_report_detected:     { reason: 'user_report',              label: '-10 Spam report received',         source: 'user_report' },
  spam_ad_detected:         { reason: 'spam_ad',                  label: '-15 Spam ad detected',             source: 'system' },
  fake_ad_detected:         { reason: 'fake_ad',                  label: '-20 Fake ad detected',             source: 'system' },
  sexual_content_detected:  { reason: 'sexual_content',           label: '-20 Inappropriate content detected', source: 'system' },
  scam_detected:            { reason: 'scam',                     label: '-50 Scam violation – account suspended', source: 'admin' },
  confirmed_scam:           { reason: 'scam',                     label: '-50 Scam violation – account suspended', source: 'admin' },
  // Admin / appeal
  manual_adjustment:        { reason: 'manual_adjustment',        label: 'Manual score adjustment by admin', source: 'admin' },
  appeal_approved:          { reason: 'appeal_approved',          label: 'Appeal approved – score restored', source: 'admin' },
};

/**
 * Improvement tips returned to the frontend.
 * Static strings only – no AI generation.
 */
const IMPROVEMENT_TIPS = {
  needs_email_verification: 'Verify your email to earn +10',
  avoid_spam_reports:       'Avoid spam reports to protect your score',
  post_authentic_ads:       'Post authentic, accurate ads',
  build_account_age:        'Build account age trust – milestones at 30, 180 and 365 days',
  clean_record:             'Maintain a clean record to reach Trusted Seller',
  already_trusted:          'Keep your record clean to stay a Trusted Seller',
};

// ============================================
// IN-MEMORY STORAGE (for demo - use DB in production)
// ============================================

const violations = [];
const trustScoreHistory = [];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate UUID v4
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get trust level from score
 * @param {number} score - Trust score (0-100)
 * @returns {string} - Trust level label
 */
function getTrustLevel(score) {
  if (score <= TRUST_LEVELS.NEW_SELLER.max) {
    return TRUST_LEVELS.NEW_SELLER.label;
  } else if (score <= TRUST_LEVELS.VERIFIED_SELLER.max) {
    return TRUST_LEVELS.VERIFIED_SELLER.label;
  } else {
    return TRUST_LEVELS.TRUSTED_SELLER.label;
  }
}

/**
 * Get trust level details from score
 * @param {number} score - Trust score
 * @returns {object} - Trust level object with label, min, max
 */
function getTrustLevelDetails(score) {
  if (score <= TRUST_LEVELS.NEW_SELLER.max) {
    return { ...TRUST_LEVELS.NEW_SELLER, current: score };
  } else if (score <= TRUST_LEVELS.VERIFIED_SELLER.max) {
    return { ...TRUST_LEVELS.VERIFIED_SELLER, current: score };
  } else {
    return { ...TRUST_LEVELS.TRUSTED_SELLER, current: score };
  }
}

/**
 * Calculate account age in days
 * @param {Date|string} createdAt - Account creation date
 * @returns {number} - Days since account creation
 */
function calculateAccountAgeDays(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate account age bonus based on days
 * @param {number} ageDays - Account age in days
 * @returns {number} - Bonus points (0, 5, 10, or 15)
 */
function calculateAccountAgeBonus(ageDays) {
  if (ageDays > AGE_BONUSES.DAYS_365.days) {
    return AGE_BONUSES.DAYS_365.bonus;
  } else if (ageDays > AGE_BONUSES.DAYS_180.days) {
    return AGE_BONUSES.DAYS_180.bonus;
  } else if (ageDays > AGE_BONUSES.DAYS_30.days) {
    return AGE_BONUSES.DAYS_30.bonus;
  }
  return 0;
}

/**
 * Clamp trust score to valid bounds
 * @param {number} score - Raw score
 * @returns {number} - Clamped score (0-100)
 */
function clampTrustScore(score) {
  if (score < MIN_TRUST_SCORE) return MIN_TRUST_SCORE;
  if (score > MAX_TRUST_SCORE) return MAX_TRUST_SCORE;
  return score;
}

// ============================================
// TRUST SCORE HISTORY LOGGING
// ============================================

/**
 * Build a human-readable label for a score change.
 * Prefer the label from SCORE_EVENT_META; fall back to a generic string.
 * @param {string} eventType
 * @param {number} changeAmount
 * @param {string|null} overrideLabel
 * @returns {string}
 */
function buildEventLabel(eventType, changeAmount, overrideLabel = null) {
  if (overrideLabel) return overrideLabel;
  const meta = SCORE_EVENT_META[eventType];
  if (meta) return meta.label;
  const sign = changeAmount >= 0 ? '+' : '';
  return `${sign}${changeAmount} Score updated`;
}

/**
 * Log a trust score change for audit trail.
 * Every entry MUST include reason, label, and source so the frontend
 * can display a fully transparent history – NO silent updates.
 * @param {object} params - Log parameters
 */
function logTrustScoreChange({
  userId,
  previousScore,
  newScore,
  changeAmount,
  eventType,
  violationId = null,
  description = null,
  label = null,
  source = null
}) {
  const meta = SCORE_EVENT_META[eventType] || {};

  const historyEntry = {
    id: generateUUID(),
    // Spec-required fields (frontend consumption)
    userId,
    change: changeAmount,
    reason: meta.reason || eventType,
    label: buildEventLabel(eventType, changeAmount, label),
    source: source || meta.source || 'system',
    timestamp: new Date().toISOString(),
    // Extended fields (internal / debugging)
    previous_score: previousScore,
    new_score: newScore,
    event_type: eventType,
    violation_id: violationId,
    description
  };
  
  trustScoreHistory.push(historyEntry);
  
  // Keep only last 10000 entries in memory
  if (trustScoreHistory.length > 10000) {
    trustScoreHistory.splice(0, trustScoreHistory.length - 10000);
  }
  
  console.log(`[Trust Score] User ${userId}: ${previousScore} → ${newScore} (${changeAmount >= 0 ? '+' : ''}${changeAmount}) [${eventType}]`);
  
  return historyEntry;
}

// ============================================
// CORE TRUST SCORE FUNCTIONS
// ============================================

/**
 * Update trust score for a user.
 * This is the ONLY function allowed to mutate trust scores.
 * Every call MUST produce a log entry visible to the frontend.
 * @param {object} user - User object (must have id, trust_score)
 * @param {number} change - Score change (positive or negative)
 * @param {string} eventType - Event type from EVENT_TYPES
 * @param {object} options - Additional options (violationId, description, label, source)
 * @returns {object} - Updated user with new trust score and level
 */
function updateTrustScore(user, change, eventType, options = {}) {
  if (!user || !user.id) {
    throw new Error('Invalid user object');
  }
  
  const previousScore = user.trust_score || BASE_TRUST_SCORE;
  const newScore = clampTrustScore(previousScore + change);
  
  // Update user object
  user.trust_score = newScore;
  
  // Log the change – every mutation is transparent
  logTrustScoreChange({
    userId: user.id,
    previousScore,
    newScore,
    changeAmount: change,
    eventType,
    violationId: options.violationId || null,
    description: options.description || null,
    label: options.label || null,
    source: options.source || null
  });
  
  return {
    user,
    previousScore,
    newScore,
    change,
    trustLevel: getTrustLevel(newScore)
  };
}

/**
 * Initialize trust score for a new user
 * @param {object} user - User object
 * @returns {object} - User with initialized trust score
 */
function initializeTrustScore(user) {
  user.trust_score = BASE_TRUST_SCORE;
  user.email_verified = false;
  user.email_verification_reward_claimed = false;
  // Per-milestone age bonus flags (idempotency guards)
  user.age_bonus_30_claimed = false;
  user.age_bonus_180_claimed = false;
  user.age_bonus_365_claimed = false;
  
  logTrustScoreChange({
    userId: user.id,
    previousScore: 0,
    newScore: BASE_TRUST_SCORE,
    changeAmount: BASE_TRUST_SCORE,
    eventType: EVENT_TYPES.ACCOUNT_CREATED,
    description: 'New account created with base trust score'
  });
  
  return user;
}

/**
 * Apply email verification reward (one-time only)
 * @param {object} user - User object
 * @returns {object} - Result with success flag and updated score
 */
function applyEmailVerificationReward(user) {
  if (!user) {
    return { success: false, error: 'User not found' };
  }
  
  // Check if already claimed
  if (user.email_verification_reward_claimed) {
    return { 
      success: false, 
      error: 'Email verification reward already claimed',
      trust_score: user.trust_score,
      trust_level: getTrustLevel(user.trust_score)
    };
  }
  
  // Apply reward
  user.email_verified = true;
  user.email_verification_reward_claimed = true;
  
  const result = updateTrustScore(
    user, 
    EMAIL_VERIFICATION_REWARD, 
    EVENT_TYPES.EMAIL_VERIFIED,
    { description: 'Email verification completed' }
  );
  
  return {
    success: true,
    message: `Email verified! +${EMAIL_VERIFICATION_REWARD} trust points`,
    trust_score: result.newScore,
    trust_level: result.trustLevel,
    bonus_applied: EMAIL_VERIFICATION_REWARD
  };
}

/**
 * Check and apply account age bonus.
 * 
 * Each milestone (30 / 180 / 365 days) is applied ONCE and tracked with
 * an individual boolean flag on the user object so the rule is idempotent
 * regardless of how many times this function is called (login, daily sync, etc.).
 * 
 * Milestone flags:  user.age_bonus_30_claimed
 *                   user.age_bonus_180_claimed
 *                   user.age_bonus_365_claimed
 * 
 * @param {object} user - User object
 * @returns {object} - Result with any bonus applied
 */
function checkAndApplyAgeBonus(user) {
  if (!user || !user.createdAt) {
    return { success: false, error: 'Invalid user or missing creation date' };
  }

  const ageDays = calculateAccountAgeDays(user.createdAt);
  const results = [];

  // --- Milestone: 30 days ---
  if (ageDays >= AGE_BONUSES.DAYS_30.days && !user.age_bonus_30_claimed) {
    user.age_bonus_30_claimed = true;
    const r = updateTrustScore(
      user,
      AGE_BONUSES.DAYS_30.bonus,
      'account_age_30_days',
      { description: 'Account reached 30 days old', source: 'system' }
    );
    results.push({ milestone: '30_days', bonus: AGE_BONUSES.DAYS_30.bonus, newScore: r.newScore });
  }

  // --- Milestone: 180 days ---
  if (ageDays >= AGE_BONUSES.DAYS_180.days && !user.age_bonus_180_claimed) {
    user.age_bonus_180_claimed = true;
    const r = updateTrustScore(
      user,
      AGE_BONUSES.DAYS_180.bonus,
      'account_age_180_days',
      { description: 'Account reached 180 days old', source: 'system' }
    );
    results.push({ milestone: '180_days', bonus: AGE_BONUSES.DAYS_180.bonus, newScore: r.newScore });
  }

  // --- Milestone: 365 days ---
  if (ageDays >= AGE_BONUSES.DAYS_365.days && !user.age_bonus_365_claimed) {
    user.age_bonus_365_claimed = true;
    const r = updateTrustScore(
      user,
      AGE_BONUSES.DAYS_365.bonus,
      'account_age_365_days',
      { description: 'Account reached 365 days old', source: 'system' }
    );
    results.push({ milestone: '365_days', bonus: AGE_BONUSES.DAYS_365.bonus, newScore: r.newScore });
  }

  if (results.length > 0) {
    const totalBonus = results.reduce((sum, r) => sum + r.bonus, 0);
    return {
      success: true,
      message: `Account age bonus applied! +${totalBonus} trust points`,
      trust_score: user.trust_score,
      trust_level: getTrustLevel(user.trust_score),
      bonuses_applied: results,
      account_age_days: ageDays
    };
  }

  return {
    success: true,
    message: 'No new age bonus available',
    trust_score: user.trust_score,
    trust_level: getTrustLevel(user.trust_score),
    bonuses_applied: [],
    account_age_days: ageDays
  };
}

// ============================================
// VIOLATION AND PENALTY FUNCTIONS
// ============================================

/**
 * Record a violation and apply penalty
 * @param {object} params - Violation parameters
 * @returns {object} - Violation record and updated trust info
 */
function recordViolation({
  user,
  violationType,
  adId = null,
  detectedBy = 'system',
  reportedBy = null,
  description = null
}) {
  if (!user) {
    return { success: false, error: 'User not found' };
  }
  
  if (!VIOLATION_PENALTIES[violationType]) {
    return { success: false, error: `Invalid violation type: ${violationType}` };
  }
  
  const penalty = VIOLATION_PENALTIES[violationType];
  
  // Create violation record
  const violation = {
    id: generateUUID(),
    user_id: user.id,
    violation_type: violationType,
    penalty_points: penalty,
    ad_id: adId,
    detected_by: detectedBy,
    reported_by: reportedBy,
    description,
    status: 'confirmed',
    created_at: new Date().toISOString()
  };
  
  violations.push(violation);
  
  // Apply penalty
  const eventType = `${violationType}_detected`;
  const result = updateTrustScore(user, penalty, eventType, {
    violationId: violation.id,
    description: description || `Violation: ${violationType}`
  });
  
  // Special handling for scam - suspend account and zero score
  if (violationType === 'scam') {
    user.status = 'suspended';
    user.trust_score = 0;
    
    logTrustScoreChange({
      userId: user.id,
      previousScore: result.newScore,
      newScore: 0,
      changeAmount: -result.newScore,
      eventType: EVENT_TYPES.CONFIRMED_SCAM,
      violationId: violation.id,
      description: 'Account suspended due to confirmed scam'
    });
  }
  
  return {
    success: true,
    violation,
    penalty_applied: penalty,
    trust_score: violationType === 'scam' ? 0 : result.newScore,
    trust_level: violationType === 'scam' ? 'Suspended' : result.trustLevel,
    account_status: user.status || 'active'
  };
}

/**
 * Record a user report violation
 * @param {object} user - Reported user
 * @param {string} adId - Ad ID being reported
 * @param {string} reporterId - User ID of reporter
 * @param {string} description - Report reason
 */
function recordUserReport(user, adId, reporterId, description) {
  return recordViolation({
    user,
    violationType: 'user_report',
    adId,
    detectedBy: 'user_report',
    reportedBy: reporterId,
    description
  });
}

/**
 * Record a spam ad violation
 * @param {object} user - Offending user
 * @param {string} adId - Spam ad ID
 * @param {string} detectedBy - Detection method
 */
function recordSpamAd(user, adId, detectedBy = 'ai_moderation') {
  return recordViolation({
    user,
    violationType: 'spam_ad',
    adId,
    detectedBy,
    description: 'Spam or duplicate ad detected'
  });
}

/**
 * Record a fake/misleading ad violation
 * @param {object} user - Offending user
 * @param {string} adId - Fake ad ID
 * @param {string} detectedBy - Detection method
 */
function recordFakeAd(user, adId, detectedBy = 'ai_moderation') {
  return recordViolation({
    user,
    violationType: 'fake_ad',
    adId,
    detectedBy,
    description: 'Fake or misleading ad content detected'
  });
}

/**
 * Record a sexual/adult content violation
 * @param {object} user - Offending user
 * @param {string} adId - Violating ad ID
 * @param {string} detectedBy - Detection method
 */
function recordSexualContent(user, adId, detectedBy = 'ai_moderation') {
  return recordViolation({
    user,
    violationType: 'sexual_content',
    adId,
    detectedBy,
    description: 'Sexual or adult content detected'
  });
}

/**
 * Record a confirmed scam
 * @param {object} user - Scammer user
 * @param {string} adId - Scam ad ID (optional)
 * @param {string} description - Scam details
 */
function recordScam(user, adId = null, description = 'Confirmed scam activity') {
  return recordViolation({
    user,
    violationType: 'scam',
    adId,
    detectedBy: 'manual',
    description
  });
}

// ============================================
// QUERY FUNCTIONS
// ============================================

/**
 * Get user's violation history
 * @param {string} userId - User ID
 * @returns {Array} - List of violations
 */
function getUserViolations(userId) {
  return violations.filter(v => v.user_id === userId);
}

/**
 * Get user's trust score history
 * @param {string} userId - User ID
 * @param {number} limit - Max entries to return
 * @returns {Array} - Trust score change history
 */
function getUserTrustHistory(userId, limit = 50) {
  return trustScoreHistory
    .filter(h => h.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

/**
 * Get trust score summary for a user
 * @param {object} user - User object
 * @returns {object} - Trust summary
 */
function getTrustSummary(user) {
  if (!user) {
    return null;
  }
  
  const score = user.trust_score || BASE_TRUST_SCORE;
  const level = getTrustLevelDetails(score);
  const violationCount = getUserViolations(user.id).length;
  const ageDays = user.createdAt ? calculateAccountAgeDays(user.createdAt) : 0;
  
  return {
    user_id: user.id,
    trust_score: score,
    trust_level: level.label,
    level_details: {
      current: level.current,
      min: level.min,
      max: level.max,
      next_level: score < 40 ? 'Verified Seller at 40' : 
                  score < 70 ? 'Trusted Seller at 70' : 'Maximum level reached'
    },
    email_verified: user.email_verified || false,
    account_age_days: ageDays,
    total_violations: violationCount,
    account_status: user.status || 'active'
  };
}

/**
 * Get user's trust score payload by user ID
 * @param {string} userId - User ID
 * @param {Array} users - User collection
 * @returns {object|null} - Trust score payload or null when user is missing
 */
function getTrustScore(userId, users = []) {
  const userList = Array.isArray(users) ? users : [];
  const user = userList.find((item) => item?.id === userId);

  if (!user) {
    return null;
  }

  const score = user.trust_score || BASE_TRUST_SCORE;
  return {
    user_id: user.id,
    trust_score: score,
    trust_level: getTrustLevel(score),
  };
}

/**
 * Format seller trust info for API response
 * @param {object} user - User/seller object
 * @returns {object} - Formatted seller trust info
 */
function formatSellerTrustInfo(user) {
  if (!user) return null;
  
  const score = user.trust_score || BASE_TRUST_SCORE;
  
  return {
    id: user.id,
    trust_score: score,
    trust_level: getTrustLevel(score),
    is_verified: user.email_verified || false,
    account_status: user.status || 'active'
  };
}

// ============================================
// SEARCH RANKING INTEGRATION
// ============================================

/**
 * Calculate trust factor for search ranking
 * Trust score contributes 20% to search ranking
 * @param {number} trustScore - User's trust score
 * @returns {number} - Trust ranking factor (0-20)
 */
function calculateTrustRankingFactor(trustScore) {
  return (trustScore || 0) * 0.2;
}

/**
 * Apply trust score to search results
 * @param {Array} results - Search results with seller_id
 * @param {object} usersMap - Map of user_id to user object
 * @returns {Array} - Results with trust info and adjusted ranking
 */
function applyTrustToSearchResults(results, usersMap) {
  return results.map(result => {
    const seller = usersMap[result.seller_id];
    const trustScore = seller?.trust_score || BASE_TRUST_SCORE;
    
    return {
      ...result,
      seller: formatSellerTrustInfo(seller),
      _trust_ranking_factor: calculateTrustRankingFactor(trustScore)
    };
  });
}

// ============================================
// FRONTEND-READY HELPERS
// ============================================

/**
 * Whether the user is considered "trusted" (score >= 70).
 * @param {number} score
 * @returns {boolean}
 */
function isTrusted(score) {
  return (score || 0) >= TRUST_LEVELS.TRUSTED_SELLER.min;
}

/**
 * Return static improvement tips relevant to the user's current state.
 * Tips are simple strings – NO AI generation.
 * @param {object} user - User object
 * @returns {string[]}
 */
function getImprovementTips(user) {
  const score = user.trust_score || BASE_TRUST_SCORE;
  const tips = [];

  if (!user.email_verification_reward_claimed) {
    tips.push(IMPROVEMENT_TIPS.needs_email_verification);
  }

  if (score < TRUST_LEVELS.TRUSTED_SELLER.min) {
    tips.push(IMPROVEMENT_TIPS.post_authentic_ads);
    tips.push(IMPROVEMENT_TIPS.avoid_spam_reports);
  }

  const ageDays = user.createdAt ? calculateAccountAgeDays(user.createdAt) : 0;
  if (ageDays < AGE_BONUSES.DAYS_365.days) {
    tips.push(IMPROVEMENT_TIPS.build_account_age);
  }

  if (score >= TRUST_LEVELS.TRUSTED_SELLER.min) {
    tips.push(IMPROVEMENT_TIPS.already_trusted);
  } else {
    tips.push(IMPROVEMENT_TIPS.clean_record);
  }

  return tips;
}

/**
 * Return the last `limit` trust history events in the canonical spec format:
 *   { userId, change, reason, label, source, timestamp }
 *
 * This is the shape the frontend reads for the score timeline.
 * @param {string} userId
 * @param {number} limit - Max events to return (default 20)
 * @returns {object[]}
 */
function getStructuredHistory(userId, limit = 20) {
  return trustScoreHistory
    .filter(e => e.userId === userId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, Math.min(limit, 50))
    .map(e => ({
      userId: e.userId,
      change: e.change,
      reason: e.reason,
      label: e.label,
      source: e.source,
      timestamp: e.timestamp
    }));
}

/**
 * Full frontend-ready trust profile for GET /trust-score/:userId.
 * Satisfies the spec:
 *   currentScore, trustLevel, recentChanges, totalViolations, isTrusted, improvementTips
 * @param {object} user - User object
 * @returns {object}
 */
function getFrontendTrustProfile(user) {
  if (!user) return null;

  const score = user.trust_score || BASE_TRUST_SCORE;
  const violationCount = getUserViolations(user.id).length;

  return {
    currentScore: score,
    trustLevel: getTrustLevel(score),
    recentChanges: getStructuredHistory(user.id, 20),
    totalViolations: violationCount,
    isTrusted: isTrusted(score),
    improvementTips: getImprovementTips(user)
  };
}

// ============================================
// AI GUARDRAIL – FLAG ONLY, NO SCORE MUTATION
// ============================================

/**
 * In-memory store for AI flags (no score impact in MVP).
 * AI systems MUST call this instead of updateTrustScore.
 */
const aiFlags = [];

/**
 * Flag a user for human review.
 * AI systems MUST ONLY call this function – they are NOT permitted to
 * modify trust scores directly.  An admin must review and, if necessary,
 * call recordViolation() manually.
 *
 * @param {string} userId - Target user ID
 * @param {string} reason - System reason code
 * @param {object} metadata - Any additional context (adId, confidence, etc.)
 * @returns {object} - The flag record (read-only)
 */
function flagUserForReview(userId, reason, metadata = {}) {
  if (!userId || !reason) {
    throw new Error('flagUserForReview: userId and reason are required');
  }

  const flag = {
    id: generateUUID(),
    userId,
    reason,
    metadata,
    status: 'pending_review',  // admin must act; score is NOT changed
    flaggedAt: new Date().toISOString()
  };

  aiFlags.push(flag);

  // Keep last 5000 flags
  if (aiFlags.length > 5000) {
    aiFlags.splice(0, aiFlags.length - 5000);
  }

  console.log(`[AI Flag] User ${userId} flagged for review: ${reason}`);
  return flag;
}

/**
 * Retrieve pending AI flags for admin review.
 * @param {string|null} userId - Filter by user, or null for all pending
 * @returns {object[]}
 */
function getPendingAiFlags(userId = null) {
  return aiFlags
    .filter(f => f.status === 'pending_review' && (!userId || f.userId === userId))
    .sort((a, b) => new Date(b.flaggedAt) - new Date(a.flaggedAt));
}

// ============================================
// DAILY ACCOUNT AGE CHECK (for cron jobs)
// ============================================

/**
 * Process daily age bonus checks for all users
 * @param {Array} users - Array of user objects
 * @returns {object} - Summary of bonuses applied
 */
function processDailyAgeBonuses(users) {
  const results = {
    processed: 0,
    bonuses_applied: 0,
    total_points: 0
  };
  
  users.forEach(user => {
    const bonus = checkAndApplyAgeBonus(user);
    results.processed++;
    
    if (bonus.bonuses_applied && bonus.bonuses_applied.length > 0) {
      results.bonuses_applied += bonus.bonuses_applied.length;
      results.total_points += bonus.bonuses_applied.reduce((s, b) => s + b.bonus, 0);
    }
  });
  
  console.log(`[Trust Score] Daily age bonus check: ${results.bonuses_applied} bonuses applied (${results.total_points} total points)`);
  
  return results;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Constants
  BASE_TRUST_SCORE,
  EMAIL_VERIFICATION_REWARD,
  AGE_BONUSES,
  VIOLATION_PENALTIES,
  MIN_TRUST_SCORE,
  MAX_TRUST_SCORE,
  TRUST_LEVELS,
  EVENT_TYPES,
  
  // Core functions
  getTrustLevel,
  getTrustLevelDetails,
  calculateAccountAgeDays,
  calculateAccountAgeBonus,
  clampTrustScore,
  
  // Trust score management
  initializeTrustScore,
  updateTrustScore,
  applyEmailVerificationReward,
  checkAndApplyAgeBonus,
  
  // Violation handling
  recordViolation,
  recordUserReport,
  recordSpamAd,
  recordFakeAd,
  recordSexualContent,
  recordScam,
  
  // Query functions
  getUserViolations,
  getUserTrustHistory,
  getTrustScore,
  getTrustSummary,
  formatSellerTrustInfo,

  // Frontend-ready helpers
  isTrusted,
  getImprovementTips,
  getStructuredHistory,
  getFrontendTrustProfile,

  // AI guardrail (flag-only, no score change)
  flagUserForReview,
  getPendingAiFlags,

  // Search integration
  calculateTrustRankingFactor,
  applyTrustToSearchResults,
  
  // Daily processing
  processDailyAgeBonuses,

  // Metadata
  SCORE_EVENT_META,
  IMPROVEMENT_TIPS,
  
  // Data access (for testing/admin)
  _violations: violations,
  _trustScoreHistory: trustScoreHistory,
  _aiFlags: aiFlags
};
