/**
 * El Hannora - Trust Score Routes
 * 
 * API Routes for trust score management.
 * 
 * Endpoints:
 * - GET /api/trust/score/:userId - Get user trust score
 * - GET /api/trust/summary/:userId - Get full trust summary
 * - GET /api/trust/history/:userId - Get trust score history
 * - GET /api/trust/violations/:userId - Get user violations
 * - POST /api/trust/verify-email - Apply email verification reward
 * - POST /api/trust/report - Report a user/ad violation
 * - POST /api/trust/violation - Record a violation (admin only)
 * - GET /api/trust/levels - Get trust level definitions
 * 
 * @author El Hannora Team
 * @version 2.0.0
 */

const express = require('express');
const router = express.Router();
const {
  getTrustLevel,
  getTrustSummary,
  formatSellerTrustInfo,
  applyEmailVerificationReward,
  checkAndApplyAgeBonus,
  recordUserReport,
  recordSpamAd,
  recordFakeAd,
  recordSexualContent,
  recordScam,
  getUserViolations,
  getUserTrustHistory,
  getFrontendTrustProfile,
  flagUserForReview,
  getPendingAiFlags,
  TRUST_LEVELS,
  VIOLATION_PENALTIES,
  BASE_TRUST_SCORE,
  EMAIL_VERIFICATION_REWARD,
  AGE_BONUSES
} = require('../services/trustScoreService');

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Input validation middleware
 */
const validateUserId = (req, res, next) => {
  const userId = req.params.userId || req.body.userId;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Valid user ID is required'
    });
  }
  next();
};

// ============================================
// PUBLIC ROUTES
// ============================================

// ----------------------------------------------------------------
// PRIMARY FRONTEND ENDPOINT  (spec: GET /trust-score/:userId)
// Mounted at /api/trust, so full path is GET /api/trust/trust-score/:userId
// ----------------------------------------------------------------

/**
 * @route   GET /api/trust/trust-score/:userId
 * @desc    Frontend-ready trust profile – the single source of truth for the UI.
 *
 * Response shape (spec-required):
 * {
 *   currentScore    : number,
 *   trustLevel      : "New Seller" | "Verified Seller" | "Trusted Seller",
 *   recentChanges   : [{ userId, change, reason, label, source, timestamp }],  // last 20
 *   totalViolations : number,
 *   isTrusted       : boolean,
 *   improvementTips : string[]
 * }
 * @access  Public
 */
router.get('/trust-score/:userId', validateUserId, (req, res) => {
  try {
    const database = req.app.get('database');
    const user = database?.users?.find(u => u.id === req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const profile = getFrontendTrustProfile(user);

    return res.json({
      success: true,
      ...profile
    });
  } catch (error) {
    console.error('[Trust Profile Error]', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to get trust profile'
    });
  }
});

/**
 * @route   GET /api/trust/score/:userId
 * @desc    Get user's trust score and level
 * @access  Public
 */
router.get('/score/:userId', validateUserId, (req, res) => {
  try {
    const database = req.app.get('database');
    const user = database?.users?.find(u => u.id === req.params.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const score = user.trust_score || BASE_TRUST_SCORE;
    
    return res.json({
      success: true,
      user_id: user.id,
      trust_score: score,
      trust_level: getTrustLevel(score)
    });
  } catch (error) {
    console.error('[Trust Score Error]', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to get trust score'
    });
  }
});

/**
 * @route   GET /api/trust/summary/:userId
 * @desc    Get full trust summary for a user
 * @access  Public
 */
router.get('/summary/:userId', validateUserId, (req, res) => {
  try {
    const database = req.app.get('database');
    const user = database?.users?.find(u => u.id === req.params.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const summary = getTrustSummary(user);
    
    return res.json({
      success: true,
      ...summary
    });
  } catch (error) {
    console.error('[Trust Summary Error]', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to get trust summary'
    });
  }
});

/**
 * @route   GET /api/trust/history/:userId
 * @desc    Get trust score change history
 * @access  Public
 */
router.get('/history/:userId', validateUserId, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const history = getUserTrustHistory(req.params.userId, limit);
    
    return res.json({
      success: true,
      user_id: req.params.userId,
      total_entries: history.length,
      history
    });
  } catch (error) {
    console.error('[Trust History Error]', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to get trust history'
    });
  }
});

/**
 * @route   GET /api/trust/violations/:userId
 * @desc    Get user's violation history
 * @access  Public
 */
router.get('/violations/:userId', validateUserId, (req, res) => {
  try {
    const violations = getUserViolations(req.params.userId);
    
    return res.json({
      success: true,
      user_id: req.params.userId,
      total_violations: violations.length,
      violations
    });
  } catch (error) {
    console.error('[Violations Error]', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to get violations'
    });
  }
});

/**
 * @route   GET /api/trust/levels
 * @desc    Get trust level definitions
 * @access  Public
 */
router.get('/levels', (req, res) => {
  return res.json({
    success: true,
    levels: {
      new_seller: {
        label: TRUST_LEVELS.NEW_SELLER.label,
        range: `${TRUST_LEVELS.NEW_SELLER.min}-${TRUST_LEVELS.NEW_SELLER.max}`,
        description: 'New accounts start here'
      },
      verified_seller: {
        label: TRUST_LEVELS.VERIFIED_SELLER.label,
        range: `${TRUST_LEVELS.VERIFIED_SELLER.min}-${TRUST_LEVELS.VERIFIED_SELLER.max}`,
        description: 'Established sellers with good history'
      },
      trusted_seller: {
        label: TRUST_LEVELS.TRUSTED_SELLER.label,
        range: `${TRUST_LEVELS.TRUSTED_SELLER.min}-${TRUST_LEVELS.TRUSTED_SELLER.max}`,
        description: 'Highly trusted sellers with excellent track record'
      }
    },
    bonuses: {
      base_score: BASE_TRUST_SCORE,
      email_verification: EMAIL_VERIFICATION_REWARD,
      account_age: {
        '30_days': AGE_BONUSES.DAYS_30.bonus,
        '180_days': AGE_BONUSES.DAYS_180.bonus,
        '365_days': AGE_BONUSES.DAYS_365.bonus
      }
    },
    penalties: VIOLATION_PENALTIES
  });
});

// ============================================
// AUTHENTICATED ROUTES
// ============================================

/**
 * @route   POST /api/trust/verify-email
 * @desc    Apply email verification reward to authenticated user
 * @access  Private (requires auth)
 */
router.post('/verify-email', (req, res) => {
  try {
    const database = req.app.get('database');
    
    // Get user from auth token
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const user = database?.users?.find(u => u.id === req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const result = applyEmailVerificationReward(user);
    
    return res.json(result);
  } catch (error) {
    console.error('[Email Verify Error]', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to apply email verification reward'
    });
  }
});

/**
 * @route   POST /api/trust/check-age-bonus
 * @desc    Check and apply account age bonus
 * @access  Private (requires auth)
 */
router.post('/check-age-bonus', (req, res) => {
  try {
    const database = req.app.get('database');
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const user = database?.users?.find(u => u.id === req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const result = checkAndApplyAgeBonus(user);
    
    return res.json(result);
  } catch (error) {
    console.error('[Age Bonus Error]', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to check age bonus'
    });
  }
});

/**
 * @route   POST /api/trust/report
 * @desc    Report a user or ad for violation
 * @access  Private (requires auth)
 */
router.post('/report', (req, res) => {
  try {
    const database = req.app.get('database');
    const { reported_user_id, ad_id, reason, description } = req.body;
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    if (!reported_user_id && !ad_id) {
      return res.status(400).json({
        success: false,
        error: 'Either reported_user_id or ad_id is required'
      });
    }
    
    // Find the user being reported
    let reportedUser;
    if (reported_user_id) {
      reportedUser = database?.users?.find(u => u.id === reported_user_id);
    } else if (ad_id) {
      const ad = database?.ads?.find(a => a.id === ad_id);
      if (ad) {
        reportedUser = database?.users?.find(u => u.id === ad.seller_id);
      }
    }
    
    if (!reportedUser) {
      return res.status(404).json({
        success: false,
        error: 'Reported user not found'
      });
    }
    
    // Cannot report yourself
    if (reportedUser.id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot report yourself'
      });
    }
    
    // Record the report as a user_report violation
    const result = recordUserReport(
      reportedUser,
      ad_id,
      req.user.id,
      description || reason || 'User report'
    );
    
    return res.json({
      success: true,
      message: 'Report submitted successfully',
      ...result
    });
  } catch (error) {
    console.error('[Report Error]', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit report'
    });
  }
});

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * @route   POST /api/trust/violation
 * @desc    Record a violation (admin/moderation only)
 * @access  Admin
 */
router.post('/violation', (req, res) => {
  try {
    const database = req.app.get('database');
    const { 
      user_id, 
      violation_type, 
      ad_id, 
      detected_by = 'manual',
      description 
    } = req.body;
    
    // Check admin access (in production, verify admin role)
    // For now, we'll allow it but log the action
    
    if (!user_id || !violation_type) {
      return res.status(400).json({
        success: false,
        error: 'user_id and violation_type are required'
      });
    }
    
    const validTypes = ['user_report', 'spam_ad', 'fake_ad', 'sexual_content', 'scam'];
    if (!validTypes.includes(violation_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid violation_type. Must be one of: ${validTypes.join(', ')}`
      });
    }
    
    const user = database?.users?.find(u => u.id === user_id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    let result;
    switch (violation_type) {
      case 'user_report':
        result = recordUserReport(user, ad_id, null, description);
        break;
      case 'spam_ad':
        result = recordSpamAd(user, ad_id, detected_by);
        break;
      case 'fake_ad':
        result = recordFakeAd(user, ad_id, detected_by);
        break;
      case 'sexual_content':
        result = recordSexualContent(user, ad_id, detected_by);
        break;
      case 'scam':
        result = recordScam(user, ad_id, description);
        break;
    }
    
    return res.json(result);
  } catch (error) {
    console.error('[Violation Record Error]', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to record violation'
    });
  }
});

/**
 * @route   GET /api/trust/ai-flags
 * @desc    List pending AI flags for admin review.
 *          AI systems flag users via flagUserForReview() – they CANNOT change scores.
 *          Only an admin acting on this list may then call POST /api/trust/violation.
 * @access  Admin
 */
router.get('/ai-flags', (req, res) => {
  try {
    const { user_id } = req.query;
    const flags = getPendingAiFlags(user_id || null);
    return res.json({
      success: true,
      total: flags.length,
      flags
    });
  } catch (error) {
    console.error('[AI Flags Error]', error.message);
    return res.status(500).json({ success: false, error: 'Failed to get AI flags' });
  }
});

/**
 * @route   GET /api/trust/docs
 * @desc    Get API documentation for trust system
 * @access  Public
 */
router.get('/docs', (req, res) => {
  return res.json({
    success: true,
    api_version: '2.0.0',
    documentation: {
      overview: {
        description: 'Trust Score System for El Hannora marketplace',
        base_score: BASE_TRUST_SCORE,
        score_range: '0-100',
        levels: ['New Seller (0-39)', 'Verified Seller (40-69)', 'Trusted Seller (70-100)']
      },
      endpoints: [
        {
          method: 'GET',
          path: '/api/trust/score/:userId',
          description: 'Get user trust score and level'
        },
        {
          method: 'GET',
          path: '/api/trust/summary/:userId',
          description: 'Get full trust summary'
        },
        {
          method: 'GET',
          path: '/api/trust/history/:userId',
          description: 'Get trust score change history'
        },
        {
          method: 'GET',
          path: '/api/trust/violations/:userId',
          description: 'Get user violation history'
        },
        {
          method: 'GET',
          path: '/api/trust/levels',
          description: 'Get trust level definitions'
        },
        {
          method: 'POST',
          path: '/api/trust/verify-email',
          description: 'Apply email verification reward (auth required)'
        },
        {
          method: 'POST',
          path: '/api/trust/check-age-bonus',
          description: 'Check and apply account age bonus (auth required)'
        },
        {
          method: 'POST',
          path: '/api/trust/report',
          description: 'Report a user or ad (auth required)'
        },
        {
          method: 'POST',
          path: '/api/trust/violation',
          description: 'Record violation (admin only)'
        }
      ],
      bonuses: {
        email_verification: `+${EMAIL_VERIFICATION_REWARD} (one-time)`,
        account_age_30_days: `+${AGE_BONUSES.DAYS_30.bonus}`,
        account_age_180_days: `+${AGE_BONUSES.DAYS_180.bonus}`,
        account_age_365_days: `+${AGE_BONUSES.DAYS_365.bonus}`
      },
      penalties: {
        user_report: VIOLATION_PENALTIES.user_report,
        spam_ad: VIOLATION_PENALTIES.spam_ad,
        fake_ad: VIOLATION_PENALTIES.fake_ad,
        sexual_content: VIOLATION_PENALTIES.sexual_content,
        scam: `${VIOLATION_PENALTIES.scam} + account suspension`
      }
    }
  });
});

// ============================================
// EXPORTS
// ============================================

module.exports = router;
