/**
 * Watch Ad & Earn Coins Routes
 * 
 * Express routes for the Watch Ad & Earn Coins system.
 * All coin calculations and validations are performed server-side.
 * 
 * Endpoints:
 *   POST /api/ad-progress       - Report watch progress and earn coins
 *   POST /api/ad-watch/start    - Start a new watch session
 *   GET  /api/ad-watch/stats    - Get user's watch statistics
 *   GET  /api/ad-watch/status/:adId - Get completion status for an ad
 */

const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const {
  appendLedgerTransaction,
  ensureUserLedger,
  syncUserBalanceFromLedger,
} = require("../common/coinLedger");

// ─── Configuration ──────────────────────────────────────────────────────────

/**
 * Tier configuration for coin rewards
 * Backend enforces these limits strictly
 */
const TIER_CONFIG = {
  NORMAL: { maxVideoLength: 120, maxCoins: 10 },   // 2 min, 10 coins max (NOT 20)
  PREMIUM: { maxVideoLength: 180, maxCoins: 50 },  // Starter: 3 min, 50 coins/day cap context
  PRO: { maxVideoLength: 300, maxCoins: 120 },     // Pro: 5 min, 120 coins/day cap context
  HOT: { maxVideoLength: 420, maxCoins: 225 },     // Elite: 7 min, 225 coins/day cap context
};

const VIEWER_DAILY_COIN_LIMITS = {
  NORMAL: 50,
  PREMIUM: 50,
  PRO: 120,
  HOT: 225,
};

/**
 * Milestone percentages and cumulative rewards
 */
const MILESTONES = {
  25: 0.2,   // 20% of max coins at 25%
  50: 0.5,   // 50% of max coins at 50%
  75: 0.7,   // 70% of max coins at 75%
  100: 1.0,  // 100% of max coins at 100%
};

/**
 * Anti-cheat configuration
 */
const ANTI_CHEAT = {
  MIN_WATCH_TIME_RATIO: 0.8,
  MAX_PROGRESS_JUMP: 30,
  MIN_UPDATE_INTERVAL_MS: 2000,
  DAILY_COIN_LIMIT: 50,
};

// ─── In-Memory Storage (Production: Use PostgreSQL) ─────────────────────────

const adViews = new Map();          // Key: `${userId}:${adId}`
const coinTransactions = [];        // Array of transactions
const boostEvents = new Map();      // Key: eventId
const dailyEarnings = new Map();    // Key: `${userId}:${date}`

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Get tier configuration for an ad
 */
function getTierConfig(tier) {
  return TIER_CONFIG[tier?.toUpperCase()] || TIER_CONFIG.NORMAL;
}

/**
 * Calculate coins for each milestone
 */
function calculateMilestoneRewards(maxCoins) {
  const m25 = Math.floor(maxCoins * 0.2);
  const m50 = Math.floor(maxCoins * 0.5);
  const m75 = Math.floor(maxCoins * 0.7);
  const m100 = maxCoins;
  
  return {
    '25': m25,
    '50': m50 - m25,
    '75': m75 - m50,
    '100': m100 - m75,
  };
}

/**
 * Get or create ad view record
 */
function getOrCreateAdView(userId, adId) {
  const key = `${userId}:${adId}`;
  if (!adViews.has(key)) {
    adViews.set(key, {
      id: uuidv4(),
      userId,
      adId,
      watchPercent: 0,
      watchTimeSeconds: 0,
      milestone25: false,
      milestone50: false,
      milestone75: false,
      milestone100: false,
      totalCoinsEarned: 0,
      completed: false,
      lastProgressTime: null,
      sessionStartTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  return adViews.get(key);
}

/**
 * Check daily coin limit
 */
function getDailyCoinsRemaining(userId) {
  return getDailyCoinsRemainingByTier(userId, 'NORMAL');
}

function getDailyCoinsRemainingByTier(userId, tier) {
  const today = new Date().toISOString().split('T')[0];
  const key = `${userId}:${today}`;
  const earned = dailyEarnings.get(key) || 0;
  const dailyLimit = VIEWER_DAILY_COIN_LIMITS[tier] || ANTI_CHEAT.DAILY_COIN_LIMIT;
  return Math.max(0, dailyLimit - earned);
}

/**
 * Update daily earnings
 */
function updateDailyEarnings(userId, coins) {
  const today = new Date().toISOString().split('T')[0];
  const key = `${userId}:${today}`;
  const current = dailyEarnings.get(key) || 0;
  dailyEarnings.set(key, current + coins);
}

/**
 * Get active boost event
 */
function getActiveBoostEvent(tier) {
  const now = new Date();
  for (const event of boostEvents.values()) {
    if (event.isActive &&
        new Date(event.startTime) <= now &&
        new Date(event.endTime) >= now &&
        (!event.maxTotalCoins || event.coinsDistributed < event.maxTotalCoins) &&
        (!event.eligibleTiers || !tier || event.eligibleTiers.includes(tier))) {
      return event;
    }
  }
  return null;
}

/**
 * Log coin transaction
 */
function logTransaction(userId, adId, coins, type, description, milestone, multiplier, boostEventId) {
  coinTransactions.push({
    id: uuidv4(),
    userId,
    adId,
    coins,
    type,
    description,
    milestone,
    multiplier: multiplier || 1.0,
    boostEventId,
    createdAt: new Date(),
  });
}

// ─── POST /api/ad-progress ──────────────────────────────────────────────────
// Main endpoint for reporting watch progress and earning coins
//
// Payload:
//   user_id: string
//   ad_id: string
//   watch_percent: number (0-100)
//   watch_time_seconds?: number (for anti-cheat validation)
//
// Response:
//   { success, watch_percent, coins_earned, total_from_ad, new_balance, completed, milestones_reached }

router.post("/ad-progress", async (req, res) => {
  try {
    const user_id = req.user?.id;
    const { ad_id, watch_percent, watch_time_seconds, session_id } = req.body || {};

    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: "Authentication is required for watch rewards"
      });
    }

    if (req.body?.user_id && req.body.user_id !== user_id) {
      return res.status(403).json({
        success: false,
        error: "You can only submit watch progress for your own account"
      });
    }

    const database = req.app.get("database");
    const user = Array.isArray(database?.users)
      ? database.users.find((entry) => entry.id === user_id)
      : null;

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    ensureUserLedger(database, user);

    // Validate required fields
    if (!ad_id || watch_percent === undefined) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: ad_id, watch_percent"
      });
    }

    // Validate watch_percent range
    if (watch_percent < 0 || watch_percent > 100) {
      return res.status(400).json({
        success: false,
        error: "watch_percent must be between 0 and 100"
      });
    }

    // Get or create view record
    const view = getOrCreateAdView(user_id, ad_id);

    // Check if already completed
    if (view.completed) {
      return res.json({
        success: true,
        watch_percent: 100,
        coins_earned: 0,
        total_from_ad: view.totalCoinsEarned,
        new_balance: 0, // In production, fetch from database
        completed: true,
        milestones_reached: [],
        message: "Ad already completed"
      });
    }

    // Anti-cheat: Check progress doesn't decrease
    if (watch_percent < view.watchPercent) {
      return res.status(400).json({
        success: false,
        error: "Watch progress cannot decrease"
      });
    }

    // Anti-cheat: Check progress jump limit
    const progressJump = watch_percent - view.watchPercent;
    if (progressJump > ANTI_CHEAT.MAX_PROGRESS_JUMP) {
      console.warn(`[Anti-Cheat] Suspicious progress jump: ${progressJump}% for user ${user_id}`);
      return res.status(400).json({
        success: false,
        error: "Suspicious watch pattern detected"
      });
    }

    // Anti-cheat: Check update interval
    if (view.lastProgressTime) {
      const timeSinceLastUpdate = Date.now() - new Date(view.lastProgressTime).getTime();
      if (timeSinceLastUpdate < ANTI_CHEAT.MIN_UPDATE_INTERVAL_MS) {
        return res.status(400).json({
          success: false,
          error: "Progress updates too frequent"
        });
      }
    }

    // Determine ad tier (in production, fetch from database)
    const requestedTier = String(req.body?.ad_tier || req.body?.plan || 'NORMAL').toUpperCase();
    const tier = TIER_CONFIG[requestedTier] ? requestedTier : "NORMAL";
    const tierConfig = getTierConfig(tier);
    const maxCoins = tierConfig.maxCoins;

    // Check for active boost event
    const boostEvent = getActiveBoostEvent(tier);
    const multiplier = boostEvent ? parseFloat(boostEvent.multiplier) : 1.0;

    // Calculate milestone rewards
    const m25Coins = Math.floor(maxCoins * 0.2);
    const m50Coins = Math.floor(maxCoins * 0.5);
    const m75Coins = Math.floor(maxCoins * 0.7);
    const m100Coins = maxCoins;

    let coinsEarned = 0;
    const milestonesReached = [];

    // Check 25% milestone
    if (watch_percent >= 25 && !view.milestone25) {
      const coins = Math.floor(m25Coins * multiplier);
      coinsEarned += coins;
      view.milestone25 = true;
      milestonesReached.push(25);
      logTransaction(user_id, ad_id, coins, 'ad_watch_reward', 'Ad watch 25% milestone', 25, multiplier, boostEvent?.id);
    }

    // Check 50% milestone
    if (watch_percent >= 50 && !view.milestone50) {
      const coins = Math.floor((m50Coins - m25Coins) * multiplier);
      coinsEarned += coins;
      view.milestone50 = true;
      milestonesReached.push(50);
      logTransaction(user_id, ad_id, coins, 'ad_watch_reward', 'Ad watch 50% milestone', 50, multiplier, boostEvent?.id);
    }

    // Check 75% milestone
    if (watch_percent >= 75 && !view.milestone75) {
      const coins = Math.floor((m75Coins - m50Coins) * multiplier);
      coinsEarned += coins;
      view.milestone75 = true;
      milestonesReached.push(75);
      logTransaction(user_id, ad_id, coins, 'ad_watch_reward', 'Ad watch 75% milestone', 75, multiplier, boostEvent?.id);
    }

    // Check 100% milestone
    if (watch_percent >= 100 && !view.milestone100) {
      const coins = Math.floor((m100Coins - m75Coins) * multiplier);
      coinsEarned += coins;
      view.milestone100 = true;
      milestonesReached.push(100);
      view.completed = true;
      logTransaction(user_id, ad_id, coins, 'ad_watch_reward', 'Ad watch 100% milestone', 100, multiplier, boostEvent?.id);
    }

    // Check daily limit
    const dailyRemaining = getDailyCoinsRemainingByTier(user_id, tier);
    if (coinsEarned > dailyRemaining) {
      coinsEarned = Math.max(0, dailyRemaining);
      if (coinsEarned === 0) {
        return res.json({
          success: true,
          watch_percent: view.watchPercent,
          coins_earned: 0,
          total_from_ad: view.totalCoinsEarned,
          new_balance: 0,
          completed: false,
          milestones_reached: [],
          message: "Daily coin limit reached"
        });
      }
    }

    let awardedCoins = coinsEarned;
    let newBalance = syncUserBalanceFromLedger(database, user);

    if (awardedCoins > 0) {
      const ledgerResult = appendLedgerTransaction(database, {
        userId: user_id,
        amount: awardedCoins,
        type: "reward",
        reason: "watch_video_reward",
        description: `Validated watch reward for ad ${ad_id}`,
        idempotencyKey: `watch:${user_id}:${ad_id}:${session_id || view.id}:${watch_percent}`,
        metadata: {
          ad_id,
          session_id: session_id || view.id,
          watch_percent,
          milestones: milestonesReached,
          source: "/api/ad-progress",
        },
      });

      if (!ledgerResult.success) {
        if (ledgerResult.duplicate) {
          awardedCoins = 0;
        } else {
          return res.status(400).json({
            success: false,
            error: ledgerResult.error,
          });
        }
      } else {
        updateDailyEarnings(user_id, awardedCoins);
        newBalance = ledgerResult.balance;
      }
    }

    // Update view record
    view.watchPercent = watch_percent;
    view.lastProgressTime = new Date();
    view.updatedAt = new Date();
    if (watch_time_seconds !== undefined) {
      view.watchTimeSeconds = watch_time_seconds;
    }
    view.totalCoinsEarned += awardedCoins;

    // Build response
    const response = {
      success: true,
      watch_percent: watch_percent,
      coins_earned: awardedCoins,
      total_from_ad: view.totalCoinsEarned,
      new_balance: newBalance,
      completed: view.completed,
      milestones_reached: milestonesReached,
    };

    if (multiplier > 1) {
      response.boost_multiplier = multiplier;
    }

    if (view.completed) {
      response.status = "completed";
      response.message = "Congratulations! Ad completed!";
    } else if (milestonesReached.length > 0) {
      response.message = `Milestone${milestonesReached.length > 1 ? 's' : ''} reached: ${milestonesReached.join(', ')}%`;
    } else {
      response.message = "Progress saved";
    }

    return res.json(response);

  } catch (error) {
    console.error("[Ad Progress Error]", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to process ad progress"
    });
  }
});

// ─── POST /api/ad-watch/start ───────────────────────────────────────────────
// Start a new watch session for an ad

router.post("/ad-watch/start", async (req, res) => {
  try {
    const user_id = req.user?.id;
    const { ad_id } = req.body || {};

    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: "Authentication is required to start a watch session"
      });
    }

    if (req.body?.user_id && req.body.user_id !== user_id) {
      return res.status(403).json({
        success: false,
        error: "You can only start watch sessions for your own account"
      });
    }

    if (!ad_id) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: ad_id"
      });
    }

    // Get or create view record
    const view = getOrCreateAdView(user_id, ad_id);

    // Check if already completed
    if (view.completed) {
      return res.status(400).json({
        success: false,
        error: "You have already completed watching this ad"
      });
    }

    // Update session start time
    view.sessionStartTime = new Date();
    view.updatedAt = new Date();

    // Get tier config (in production, fetch from ad record)
    const requestedTier = String(req.body?.ad_tier || req.body?.plan || 'NORMAL').toUpperCase();
    const tier = TIER_CONFIG[requestedTier] ? requestedTier : "NORMAL";
    const tierConfig = getTierConfig(tier);
    const maxCoins = tierConfig.maxCoins;

    // Calculate milestone rewards
    const milestoneRewards = calculateMilestoneRewards(maxCoins);

    // Check for active boost event
    const boostEvent = getActiveBoostEvent(tier);

    return res.json({
      success: true,
      session_id: uuidv4(),
      ad_id: ad_id,
      tier: tier,
      video_duration: tierConfig.maxVideoLength,
      max_coins: maxCoins,
      milestone_rewards: milestoneRewards,
      boost_event: boostEvent ? {
        name: boostEvent.name,
        multiplier: parseFloat(boostEvent.multiplier),
        ends_at: boostEvent.endTime
      } : null
    });

  } catch (error) {
    console.error("[Start Watch Session Error]", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to start watch session"
    });
  }
});

// ─── GET /api/ad-watch/stats ────────────────────────────────────────────────
// Get user's watch statistics

router.get("/ad-watch/stats", async (req, res) => {
  try {
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: "Authentication is required to view watch stats"
      });
    }

    // Count views for this user
    let totalAdsWatched = 0;
    let adsCompleted = 0;
    let totalCoinsEarned = 0;

    for (const [key, view] of adViews) {
      if (key.startsWith(`${user_id}:`)) {
        totalAdsWatched++;
        if (view.completed) adsCompleted++;
        totalCoinsEarned += view.totalCoinsEarned;
      }
    }

    // Get daily earnings
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `${user_id}:${today}`;
    const coinsEarnedToday = dailyEarnings.get(dailyKey) || 0;

    // Get active boost event
    const boostEvent = getActiveBoostEvent();

    return res.json({
      success: true,
      user_id: user_id,
      coin_balance: totalCoinsEarned,
      total_ads_watched: totalAdsWatched,
      ads_completed: adsCompleted,
      watch_streak: 0, // In production, fetch from user record
      coins_earned_today: coinsEarnedToday,
      daily_coin_limit: VIEWER_DAILY_COIN_LIMITS.NORMAL,
      active_boost_event: boostEvent ? {
        name: boostEvent.name,
        multiplier: parseFloat(boostEvent.multiplier),
        ends_at: boostEvent.endTime
      } : null
    });

  } catch (error) {
    console.error("[Watch Stats Error]", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to get watch stats"
    });
  }
});

// ─── GET /api/ad-watch/status/:adId ─────────────────────────────────────────
// Get completion status for a specific ad

router.get("/ad-watch/status/:adId", async (req, res) => {
  try {
    const { adId } = req.params;
    const user_id = req.user?.id;

    if (!user_id || !adId) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters"
      });
    }

    const key = `${user_id}:${adId}`;
    const view = adViews.get(key);

    if (!view) {
      return res.json({
        success: true,
        status: "not_started",
        watch_percent: 0,
        coins_earned: 0,
        completed: false
      });
    }

    return res.json({
      success: true,
      status: view.completed ? "completed" : "in_progress",
      watch_percent: view.watchPercent,
      coins_earned: view.totalCoinsEarned,
      completed: view.completed,
      milestones: {
        "25": view.milestone25,
        "50": view.milestone50,
        "75": view.milestone75,
        "100": view.milestone100
      }
    });

  } catch (error) {
    console.error("[Ad Status Error]", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to get ad status"
    });
  }
});

// ─── Admin: Create Boost Event ──────────────────────────────────────────────

router.post("/admin/boost-events", async (req, res) => {
  try {
    const isAdmin = Boolean(req.currentUser?.is_admin === true || `${req.currentUser?.role || ""}`.toLowerCase() === "admin");
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const { name, description, multiplier, start_time, end_time, eligible_tiers, max_total_coins } = req.body;

    if (!name || !multiplier || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields"
      });
    }

    const eventId = uuidv4();
    const event = {
      id: eventId,
      name,
      description: description || '',
      eventType: 'coin_boost',
      multiplier: parseFloat(multiplier),
      startTime: new Date(start_time),
      endTime: new Date(end_time),
      isActive: true,
      eligibleTiers: eligible_tiers || null,
      maxTotalCoins: max_total_coins || null,
      coinsDistributed: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    boostEvents.set(eventId, event);

    return res.status(201).json({
      success: true,
      event
    });

  } catch (error) {
    console.error("[Create Boost Event Error]", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to create boost event"
    });
  }
});

// ─── Admin: Get All Boost Events ────────────────────────────────────────────

router.get("/admin/boost-events", async (req, res) => {
  try {
    const isAdmin = Boolean(req.currentUser?.is_admin === true || `${req.currentUser?.role || ""}`.toLowerCase() === "admin");
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const events = Array.from(boostEvents.values());
    return res.json({
      success: true,
      events
    });
  } catch (error) {
    console.error("[Get Boost Events Error]", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to get boost events"
    });
  }
});

// ─── Admin: Deactivate Boost Event ──────────────────────────────────────────

router.patch("/admin/boost-events/:id/deactivate", async (req, res) => {
  try {
    const isAdmin = Boolean(req.currentUser?.is_admin === true || `${req.currentUser?.role || ""}`.toLowerCase() === "admin");
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const { id } = req.params;
    const event = boostEvents.get(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: "Event not found"
      });
    }

    event.isActive = false;
    event.updatedAt = new Date();
    boostEvents.set(id, event);

    return res.json({
      success: true,
      message: "Event deactivated"
    });

  } catch (error) {
    console.error("[Deactivate Event Error]", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to deactivate event"
    });
  }
});

module.exports = router;
