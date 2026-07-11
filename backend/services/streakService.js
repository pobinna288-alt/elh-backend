/**
 * Streak Service - Single Source of Truth for Daily Streak Progression
 * 
 * This service handles all streak calculation logic to ensure consistency
 * across the entire application. No other code should directly modify
 * streak fields - they must use this service.
 */

/**
 * Calculate and update user's daily streak based on last active date
 * 
 * @param {Object} user - User object with streak fields
 * @returns {Object} Updated user object with correct streak values
 */
function updateDailyStreak(user) {
  if (!user) {
    return user;
  }

  const now = new Date();
  const previousDate = user.last_active_date ? new Date(user.last_active_date) : null;

  // Initialize coin_balance if not set
  user.coin_balance = Number.isFinite(Number(user.coin_balance))
    ? Number(user.coin_balance)
    : Number.isFinite(Number(user.coins))
      ? Number(user.coins)
      : 0;
  user.coins = user.coin_balance;

  // Initialize trust_score if not set
  if (!Number.isFinite(Number(user.trust_score))) {
    user.trust_score = 50;
  }

  // Calculate streak progression
  if (!previousDate || Number.isNaN(previousDate.getTime())) {
    // First time user or invalid date - start with streak 1
    user.daily_streak = Math.max(1, Number(user.daily_streak) || 0);
  } else {
    const previousUtc = Date.UTC(previousDate.getUTCFullYear(), previousDate.getUTCMonth(), previousDate.getUTCDate());
    const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const dayDifference = Math.floor((nowUtc - previousUtc) / (24 * 60 * 60 * 1000));

    if (dayDifference >= 2) {
      // Missed more than 1 day - reset streak to 1
      user.daily_streak = 1;
    } else if (dayDifference === 1) {
      // Consecutive day - increment streak
      user.daily_streak = Math.max(1, Number(user.daily_streak) || 0) + 1;
    } else if (!(Number(user.daily_streak) > 0)) {
      // Same day but no streak - initialize to 1
      user.daily_streak = 1;
    }
    // If same day and streak exists, keep current streak unchanged
  }

  // Update other streak fields
  user.current_streak = Math.max(Number(user.current_streak) || 0, Number(user.daily_streak) || 0);
  user.streak_count = Number(user.daily_streak) || 0;
  user.last_active_date = now.toISOString();
  user.updatedAt = now;

  return user;
}

/**
 * Check if user can claim daily streak reward today
 * 
 * @param {Object} user - User object
 * @returns {boolean} True if user can claim today
 */
function canClaimDailyReward(user) {
  if (!user || !user.last_streak_claimed_at) {
    return true;
  }

  const now = new Date();
  const lastClaimed = new Date(user.last_streak_claimed_at);
  
  const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const claimedUtc = Date.UTC(lastClaimed.getUTCFullYear(), lastClaimed.getUTCMonth(), lastClaimed.getUTCDate());
  
  return nowUtc > claimedUtc;
}

/**
 * Get streak information for a user
 * 
 * @param {Object} user - User object
 * @returns {Object} Streak information
 */
function getStreakInfo(user) {
  if (!user) {
    return {
      daily_streak: 0,
      current_streak: 0,
      streak_count: 0,
      last_active_date: null,
      can_claim_today: false
    };
  }

  return {
    daily_streak: Number(user.daily_streak) || 0,
    current_streak: Number(user.current_streak) || 0,
    streak_count: Number(user.streak_count) || 0,
    last_active_date: user.last_active_date || null,
    can_claim_today: canClaimDailyReward(user)
  };
}

module.exports = {
  updateDailyStreak,
  canClaimDailyReward,
  getStreakInfo
};
