/**
 * Ad Improvement Report Routes
 * AI-powered ad analysis and recommendations
 * 
 * Endpoints:
 *   POST /ads/improvement/analyze     - Generate Ad Improvement Report
 *   POST /ads/improvement/analyze-ai  - Generate AI-Enhanced Report (uses external AI)
 *   GET  /ads/improvement/features    - Get features by subscription level
 * 
 * Access Control:
 *   - Enterprise, Pro, Hot: ALLOWED
 *   - Normal, Premium: BLOCKED
 */

const express = require("express");
const router = express.Router();
const {
  generateAdImprovementReport,
  generateAIEnhancedReport,
  checkSubscriptionAccess,
  ALLOWED_SUBSCRIPTION_LEVELS,
  SUBSCRIPTION_FEATURES
} = require("../services/adImprovementService");
const {
  generateEnterpriseAdDoctorReport,
  generateAIEnhancedEnterpriseReport,
  verifyEnterpriseAccess
} = require("../services/enterpriseAdDoctorService");

const AI_RATE_TRACKER = new Map();
const AI_RATE_WINDOW_MS = 60 * 1000;
const AI_BURST_LIMITS = Object.freeze({
  pro: 10,
  hot: 20,
  enterprise: 30,
});
const AI_DAILY_QUOTAS = Object.freeze({
  pro: 25,
  hot: 100,
  enterprise: 500,
});
const AI_MONTHLY_QUOTAS = Object.freeze({
  pro: 300,
  hot: 2000,
  enterprise: 10000,
});

function resolveAuthenticatedSubscriptionLevel(req) {
  const currentUser = req.currentUser || req.user || {};
  const rawPlan = `${
    currentUser.subscriptionLevel ||
    currentUser.subscriptionPlan ||
    currentUser.plan ||
    (currentUser.isPremium ? "pro" : "")
  }`.trim().toLowerCase();

  if (currentUser.is_admin === true || `${currentUser.role || ""}`.toLowerCase() === "admin") {
    return "enterprise";
  }

  if (rawPlan === "elite") {
    return "hot";
  }

  if (rawPlan === "starter") {
    return "premium";
  }

  return rawPlan;
}

function ensureAiUsageLog(database) {
  if (!database) {
    return [];
  }

  if (!Array.isArray(database.aiUsageLog)) {
    database.aiUsageLog = [];
  }

  return database.aiUsageLog;
}

function countAiUsage(records, userId, prefix) {
  return records.filter((entry) => entry?.userId === userId && `${entry.createdAt || ""}`.startsWith(prefix)).length;
}

// ─── Middleware: Subscription Access Check ──────────────────────────────────

/**
 * Middleware to verify subscription level access
 * Blocks anonymous, free, and premium users from accessing AI compute endpoints.
 */
const requireSubscriptionAccess = (req, res, next) => {
  const currentUser = req.currentUser || req.user;
  if (!currentUser?.id) {
    return res.status(401).json({
      success: false,
      error: "Authentication is required for AI requests",
    });
  }

  const subscriptionLevel = resolveAuthenticatedSubscriptionLevel(req);
  const accessCheck = checkSubscriptionAccess(subscriptionLevel);
  if (!accessCheck.hasAccess) {
    return res.status(403).json({
      success: false,
      error: accessCheck.message,
      allowedLevels: ALLOWED_SUBSCRIPTION_LEVELS,
      feature: "Ad Improvement Report"
    });
  }

  const perMinuteLimit = AI_BURST_LIMITS[subscriptionLevel] || AI_BURST_LIMITS.pro;
  const dailyQuota = AI_DAILY_QUOTAS[subscriptionLevel] || AI_DAILY_QUOTAS.pro;
  const monthlyQuota = AI_MONTHLY_QUOTAS[subscriptionLevel] || AI_MONTHLY_QUOTAS.pro;
  const userId = currentUser.id;
  const now = Date.now();
  const recentRequests = (AI_RATE_TRACKER.get(userId) || []).filter((timestamp) => now - timestamp < AI_RATE_WINDOW_MS);

  if (recentRequests.length >= perMinuteLimit) {
    return res.status(429).json({
      success: false,
      error: "AI rate limit exceeded. Please slow down and retry.",
      retry_after_ms: AI_RATE_WINDOW_MS,
    });
  }

  recentRequests.push(now);
  AI_RATE_TRACKER.set(userId, recentRequests);

  const database = req.app.get("database");
  const usageLog = ensureAiUsageLog(database);
  const currentDate = new Date();
  const dayPrefix = currentDate.toISOString().slice(0, 10);
  const monthPrefix = currentDate.toISOString().slice(0, 7);
  const dailyCount = countAiUsage(usageLog, userId, dayPrefix);
  const monthlyCount = countAiUsage(usageLog, userId, monthPrefix);

  if (dailyCount >= dailyQuota) {
    return res.status(429).json({
      success: false,
      error: "Daily AI quota reached for this account",
      daily_quota: dailyQuota,
    });
  }

  if (monthlyCount >= monthlyQuota) {
    return res.status(429).json({
      success: false,
      error: "Monthly AI quota reached for this account",
      monthly_quota: monthlyQuota,
    });
  }

  usageLog.push({
    id: `ai-${userId}-${now}`,
    userId,
    endpoint: req.originalUrl || req.path,
    plan: subscriptionLevel,
    createdAt: currentDate.toISOString(),
  });

  req.subscriptionFeatures = accessCheck.features;
  req.body = {
    ...(req.body || {}),
    subscriptionLevel,
    user_id: userId,
  };
  req.aiPolicy = {
    plan: subscriptionLevel,
    perMinuteLimit,
    dailyQuota,
    monthlyQuota,
    dailyRemaining: Math.max(dailyQuota - (dailyCount + 1), 0),
    monthlyRemaining: Math.max(monthlyQuota - (monthlyCount + 1), 0),
  };

  return next();
};

// ─── POST /ads/improvement/analyze ──────────────────────────────────────────
/**
 * Generate Ad Improvement Report
 * 
 * Request Body:
 * {
 *   "subscriptionLevel": "pro" | "hot" | "enterprise",
 *   "title": "Ad title",
 *   "description": "Ad description",
 *   "media": { 
 *     "imageUrl": "...", 
 *     "videoUrl": "...", 
 *     "videoDuration": 30,
 *     "altText": "..." 
 *   },
 *   "category": "Tech",
 *   "targetAudience": "Young professionals 25-35",
 *   "attentionScore": 75,
 *   "historicalPerformance": { ... }
 * }
 * 
 * Response (Pro):
 * {
 *   "success": true,
 *   "issues": ["Weak headline detected", ...],
 *   "successProbability": 62,
 *   "recommendations": ["Shorten headline", "Add price clarity"],
 *   "subscriptionLevel": "pro",
 *   "metadata": { ... }
 * }
 * 
 * Response (Hot - additional):
 * {
 *   ... (same as Pro),
 *   "toneSuggestions": { "professional": {...}, "casual": {...}, ... }
 * }
 * 
 * Response (Enterprise - additional):
 * {
 *   ... (same as Hot),
 *   "globalInsights": { "regions": {...}, ... },
 *   "advancedOptimization": { "abTestingSuggestions": [...], ... }
 * }
 */
router.post("/analyze", requireSubscriptionAccess, async (req, res) => {
  try {
    const {
      subscriptionLevel,
      title,
      description,
      media,
      category,
      targetAudience,
      attentionScore,
      historicalPerformance
    } = req.body;

    // Validate required fields
    if (!title && !description) {
      return res.status(400).json({
        success: false,
        error: "At least one of 'title' or 'description' is required for analysis"
      });
    }

    // Generate the report
    const report = await generateAdImprovementReport({
      subscriptionLevel,
      title,
      description,
      media,
      category,
      targetAudience,
      attentionScore,
      historicalPerformance
    });

    if (!report.success) {
      return res.status(403).json(report);
    }

    return res.json(report);

  } catch (err) {
    console.error("[Ad Improvement Error]", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to generate ad improvement report",
      details: err.message
    });
  }
});

// ─── POST /ads/improvement/analyze-ai ───────────────────────────────────────
/**
 * Generate AI-Enhanced Ad Improvement Report
 * Uses external AI for more nuanced analysis (Enterprise gets enhanced AI suggestions)
 * 
 * Same request/response format as /analyze, with optional additional AI insights
 */
router.post("/analyze-ai", requireSubscriptionAccess, async (req, res) => {
  try {
    const {
      subscriptionLevel,
      title,
      description,
      media,
      category,
      targetAudience,
      attentionScore,
      historicalPerformance
    } = req.body;

    // Validate required fields
    if (!title && !description) {
      return res.status(400).json({
        success: false,
        error: "At least one of 'title' or 'description' is required for analysis"
      });
    }

    // Generate AI-enhanced report
    const report = await generateAIEnhancedReport({
      subscriptionLevel,
      title,
      description,
      media,
      category,
      targetAudience,
      attentionScore,
      historicalPerformance
    });

    if (!report.success) {
      return res.status(403).json(report);
    }

    return res.json(report);

  } catch (err) {
    console.error("[AI Ad Improvement Error]", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to generate AI-enhanced ad improvement report",
      details: err.message
    });
  }
});

// ─── GET /ads/improvement/features ──────────────────────────────────────────
/**
 * Get available features by subscription level
 * Useful for frontend to know what features to display/hide
 * 
 * Query: ?subscriptionLevel=pro|hot|enterprise
 * 
 * Response:
 * {
 *   "success": true,
 *   "subscriptionLevel": "hot",
 *   "hasAccess": true,
 *   "features": {
 *     "issueDetectionLevel": "advanced",
 *     "maxRecommendations": 5,
 *     "includeMultiTone": true,
 *     ...
 *   }
 * }
 */
router.get("/features", (req, res) => {
  try {
    const { subscriptionLevel } = req.query;

    if (!subscriptionLevel) {
      return res.json({
        success: true,
        allowedLevels: ALLOWED_SUBSCRIPTION_LEVELS,
        allFeatures: SUBSCRIPTION_FEATURES
      });
    }

    const accessCheck = checkSubscriptionAccess(subscriptionLevel);

    return res.json({
      success: true,
      subscriptionLevel: subscriptionLevel.toLowerCase(),
      hasAccess: accessCheck.hasAccess,
      features: accessCheck.hasAccess ? accessCheck.features : null,
      message: accessCheck.hasAccess ? 
        "Full access to Ad Improvement Report" : 
        accessCheck.message
    });

  } catch (err) {
    console.error("[Features Check Error]", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to check features"
    });
  }
});

// ─── POST /ads/improvement/real-time ────────────────────────────────────────
/**
 * Real-time analysis endpoint for frontend edits
 * Lightweight analysis that runs as user types
 * 
 * Request Body:
 * {
 *   "subscriptionLevel": "pro" | "hot" | "enterprise",
 *   "title": "Current title",
 *   "description": "Current description",
 *   "field": "title" | "description"  // Which field was just updated
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "fieldAnalyzed": "title",
 *   "issues": [...],
 *   "quickTip": "..."
 * }
 */
router.post("/real-time", requireSubscriptionAccess, (req, res) => {
  try {
    const { subscriptionLevel, title, description, field } = req.body;

    // Lightweight analysis for real-time feedback
    const issues = [];
    let quickTip = null;

    if (field === "title" || !field) {
      if (title) {
        if (title.length > 60) {
          issues.push("Headline too long");
          quickTip = "Keep headlines under 60 characters for better readability";
        } else if (title.length < 10) {
          issues.push("Headline too short");
          quickTip = "Add more detail to your headline";
        } else if (title.length >= 20 && title.length <= 50) {
          quickTip = "Great headline length!";
        }
      }
    }

    if (field === "description" || !field) {
      if (description) {
        if (description.length < 50) {
          issues.push("Description too brief");
          quickTip = quickTip || "Add more detail to help buyers understand your offer";
        }
        
        const pricePattern = /\$|€|£|₦|price|cost/i;
        if (!pricePattern.test(description) && description.length > 100) {
          issues.push("Consider adding price information");
        }
      }
    }

    return res.json({
      success: true,
      fieldAnalyzed: field || "all",
      issues,
      quickTip,
      subscriptionLevel: subscriptionLevel.toLowerCase()
    });

  } catch (err) {
    console.error("[Real-time Analysis Error]", err.message);
    return res.status(500).json({
      success: false,
      error: "Real-time analysis failed"
    });
  }
});

// ─── Documentation Endpoint ─────────────────────────────────────────────────

router.get("/docs", (_req, res) => {
  res.json({
    success: true,
    feature: "Ad Improvement Report",
    version: "1.0.0",
    description: "AI-powered ad analysis and recommendations",
    accessControl: {
      allowed: ["enterprise", "pro", "hot"],
      blocked: ["normal", "premium"]
    },
    endpoints: [
      {
        method: "POST",
        path: "/ads/improvement/analyze",
        description: "Generate full Ad Improvement Report",
        requiredFields: ["subscriptionLevel", "title OR description"],
        optionalFields: ["media", "category", "targetAudience", "attentionScore", "historicalPerformance"]
      },
      {
        method: "POST",
        path: "/ads/improvement/analyze-ai",
        description: "Generate AI-Enhanced Report (uses external AI for Enterprise)",
        requiredFields: ["subscriptionLevel", "title OR description"],
        optionalFields: ["media", "category", "targetAudience", "attentionScore"]
      },
      {
        method: "POST",
        path: "/ads/improvement/real-time",
        description: "Lightweight real-time analysis for frontend edits",
        requiredFields: ["subscriptionLevel"],
        optionalFields: ["title", "description", "field"]
      },
      {
        method: "GET",
        path: "/ads/improvement/features",
        description: "Get available features by subscription level",
        queryParams: ["subscriptionLevel (optional)"]
      }
    ],
    featuresByTier: {
      pro: {
        issueDetection: "Basic",
        maxRecommendations: 2,
        multiTone: false,
        globalInsights: false,
        advancedOptimization: false
      },
      hot: {
        issueDetection: "Advanced",
        maxRecommendations: 5,
        multiTone: true,
        globalInsights: false,
        advancedOptimization: false
      },
      enterprise: {
        issueDetection: "Comprehensive",
        maxRecommendations: 10,
        multiTone: true,
        globalInsights: true,
        advancedOptimization: true
      }
    },
    exampleRequest: {
      subscriptionLevel: "hot",
      title: "Brand New iPhone 15 Pro Max",
      description: "Selling my iPhone 15 Pro Max. Great condition, comes with original box and charger.",
      category: "Electronics",
      targetAudience: "Tech enthusiasts 18-35",
      attentionScore: 72
    },
    exampleResponse: {
      success: true,
      issues: ["Price information missing or unclear", "Missing call-to-action in headline"],
      successProbability: 68,
      recommendations: ["Add price clarity (exact price or price range)", "Add a clear call-to-action"],
      subscriptionLevel: "hot",
      toneSuggestions: "{ ... multi-tone examples ... }",
      metadata: {
        analysisLevel: "advanced",
        featuresIncluded: {
          multiTone: true,
          globalInsights: false,
          advancedOptimization: false
        }
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 🏢 ENTERPRISE AI AD DOCTOR ENDPOINTS
// Advanced Strategic Diagnosis, Global Optimization & Execution Guidance
// ═══════════════════════════════════════════════════════════════════════════

// ─── Middleware: Enterprise-Only Access ─────────────────────────────────────

/**
 * Middleware to verify Enterprise subscription access
 * ONLY Enterprise users can access Ad Doctor endpoints
 */
const requireEnterpriseAccess = (req, res, next) => {
  const subscriptionPlan = req.body.subscriptionPlan || req.body.subscription_plan;

  // Check from request body
  if (subscriptionPlan) {
    const accessCheck = verifyEnterpriseAccess(subscriptionPlan);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({
        success: false,
        error: accessCheck.error,
        requiredPlan: "Enterprise",
        feature: "AI Ad Doctor Report"
      });
    }
    return next();
  }

  // Check from user object (auth middleware)
  if (req.user && (req.user.subscriptionPlan || req.user.subscription_plan)) {
    const userPlan = req.user.subscriptionPlan || req.user.subscription_plan;
    const accessCheck = verifyEnterpriseAccess(userPlan);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({
        success: false,
        error: accessCheck.error,
        requiredPlan: "Enterprise",
        feature: "AI Ad Doctor Report"
      });
    }
    req.body.subscriptionPlan = userPlan;
    return next();
  }

  // No subscription found
  return res.status(400).json({
    success: false,
    error: 'Missing required field: "subscriptionPlan". Enterprise access required.',
    requiredPlan: "Enterprise"
  });
};

// ─── POST /ads/improvement/enterprise/ad-doctor ─────────────────────────────
/**
 * Generate Enterprise AI Ad Doctor Report
 * Advanced strategic diagnosis with global optimization intelligence
 * 
 * ACCESS: Enterprise subscription ONLY
 * 
 * Request Body:
 * {
 *   "subscriptionPlan": "enterprise",
 *   "adTitle": "Your Amazing Product - Limited Time Offer",
 *   "adDescription": "Full ad description with value proposition...",
 *   "mediaType": "image" | "video",
 *   "adCategory": "Tech" | "Fashion" | "Electronics" | "Health" | "Home" | etc.,
 *   "globalReachCountries": ["United States", "Canada", "Germany"],
 *   "audienceTargeting": "Tech enthusiasts 25-45, early adopters",
 *   "attentionScore": 75,  // optional
 *   "competitorInsights": {  // optional
 *     "saturationLevel": "high" | "medium" | "low",
 *     "messagingSimilarity": "high" | "medium" | "low",
 *     "differentiationGap": "high" | "medium" | "low"
 *   },
 *   "historicalEngagementSignals": {  // optional
 *     "bestPerformingTimes": ["6PM-9PM EST", "12PM-3PM PST"]
 *   }
 * }
 * 
 * Response:
 * {
 *   "plan": "Enterprise",
 *   "aiLevel": "Advanced Intelligence",
 *   "diagnosis": [
 *     "✅ Strong Headline strength — compelling power words detected",
 *     "⚠️ Needs Improvement Opening could be more attention-grabbing",
 *     ...
 *   ],
 *   "adHealthScore": 78,
 *   "priorityCountries": [...],
 *   "emergingMarkets": [...],
 *   "competitorStrategy": [...],
 *   "audienceStrategy": [...],
 *   "bestPostingTime": [...],
 *   "treatmentPlan": [...]
 * }
 */
router.post("/enterprise/ad-doctor", requireEnterpriseAccess, async (req, res) => {
  try {
    const {
      subscriptionPlan,
      adTitle,
      adDescription,
      mediaType,
      adCategory,
      globalReachCountries,
      audienceTargeting,
      attentionScore,
      competitorInsights,
      historicalEngagementSignals
    } = req.body;

    // Validate minimum required fields
    if (!adTitle && !adDescription) {
      return res.status(400).json({
        success: false,
        error: "At least one of 'adTitle' or 'adDescription' is required for analysis"
      });
    }

    // Generate Enterprise Ad Doctor Report
    const report = await generateEnterpriseAdDoctorReport({
      subscriptionPlan,
      adTitle,
      adDescription,
      mediaType,
      adCategory,
      globalReachCountries,
      audienceTargeting,
      attentionScore,
      competitorInsights,
      historicalEngagementSignals
    });

    // Check for access error
    if (report.error) {
      return res.status(403).json({
        success: false,
        error: report.error
      });
    }

    return res.json({
      success: true,
      ...report
    });

  } catch (err) {
    console.error("[Enterprise Ad Doctor Error]", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to generate Enterprise Ad Doctor report",
      details: err.message
    });
  }
});

// ─── POST /ads/improvement/enterprise/ad-doctor-ai ──────────────────────────
/**
 * Generate AI-Enhanced Enterprise Ad Doctor Report
 * Uses external AI for deeper strategic analysis (when API key available)
 * 
 * Same request format as /enterprise/ad-doctor
 * Response includes additional aiEnhancedInsights when AI is configured
 */
router.post("/enterprise/ad-doctor-ai", requireEnterpriseAccess, async (req, res) => {
  try {
    const {
      subscriptionPlan,
      adTitle,
      adDescription,
      mediaType,
      adCategory,
      globalReachCountries,
      audienceTargeting,
      attentionScore,
      competitorInsights,
      historicalEngagementSignals
    } = req.body;

    // Validate minimum required fields
    if (!adTitle && !adDescription) {
      return res.status(400).json({
        success: false,
        error: "At least one of 'adTitle' or 'adDescription' is required for analysis"
      });
    }

    // Generate AI-Enhanced Enterprise Report
    const report = await generateAIEnhancedEnterpriseReport({
      subscriptionPlan,
      adTitle,
      adDescription,
      mediaType,
      adCategory,
      globalReachCountries,
      audienceTargeting,
      attentionScore,
      competitorInsights,
      historicalEngagementSignals
    });

    // Check for access error
    if (report.error) {
      return res.status(403).json({
        success: false,
        error: report.error
      });
    }

    return res.json({
      success: true,
      ...report
    });

  } catch (err) {
    console.error("[Enterprise AI Ad Doctor Error]", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to generate AI-enhanced Enterprise Ad Doctor report",
      details: err.message
    });
  }
});

// ─── GET /ads/improvement/enterprise/ad-doctor/docs ─────────────────────────
/**
 * Get Enterprise Ad Doctor API documentation
 */
router.get("/enterprise/ad-doctor/docs", (req, res) => {
  res.json({
    service: "Enterprise AI Ad Doctor",
    version: "1.0.0",
    accessControl: "Enterprise subscription ONLY",
    description: "Advanced strategic diagnosis, global optimization intelligence, and execution guidance for advertisements",
    role: "Senior AI Advertising Strategist combining creative analysis, global market intelligence, audience psychology, competitive positioning, and engagement optimization",
    
    endpoints: {
      "POST /ads/improvement/enterprise/ad-doctor": {
        description: "Generate Enterprise AI Ad Doctor Report",
        accessLevel: "Enterprise only"
      },
      "POST /ads/improvement/enterprise/ad-doctor-ai": {
        description: "Generate AI-Enhanced Report with external AI integration",
        accessLevel: "Enterprise only"
      }
    },

    inputFields: {
      subscriptionPlan: { type: "string", required: true, value: "enterprise" },
      adTitle: { type: "string", required: true, description: "Advertisement headline" },
      adDescription: { type: "string", required: true, description: "Full ad copy" },
      mediaType: { type: "string", options: ["image", "video"], default: "image" },
      adCategory: { type: "string", options: ["Tech", "Fashion", "Electronics", "Health", "Home", "Automotive", "Food", "Services", "General"] },
      globalReachCountries: { type: "array", description: "Countries selected by Global Reach AI" },
      audienceTargeting: { type: "string", description: "Target audience definition" },
      attentionScore: { type: "number", optional: true, range: "0-100" },
      competitorInsights: { type: "object", optional: true },
      historicalEngagementSignals: { type: "object", optional: true }
    },

    outputFormat: {
      plan: "Enterprise",
      aiLevel: "Advanced Intelligence",
      diagnosis: ["Array of diagnostic labels with ✅ Strong, ⚠️ Needs Improvement, 🚨 Critical Weakness"],
      adHealthScore: "0-100 engagement success probability",
      priorityCountries: ["Best performing countries within Global Reach"],
      emergingMarkets: ["New market opportunities outside Global Reach"],
      competitorStrategy: ["Positioning strategies based on competitive analysis"],
      audienceStrategy: ["Targeting optimization recommendations"],
      bestPostingTime: ["Optimal posting windows by region"],
      treatmentPlan: ["Actionable execution steps"]
    },

    diagnosisEngine: {
      analyzedDimensions: [
        "Headline strength",
        "Attention opening impact", 
        "Message clarity",
        "Audience relevance",
        "Emotional persuasion",
        "Competitive pressure",
        "Offer attractiveness"
      ]
    },

    rules: {
      important: [
        "NEVER generates revenue forecasts",
        "NEVER overrides Global Reach AI targeting",
        "Provides reasoning-driven strategic insights",
        "Avoids generic advice",
        "Focuses on measurable improvement actions"
      ]
    },

    exampleRequest: {
      subscriptionPlan: "enterprise",
      adTitle: "Transform Your Home with Smart Tech - 50% Off",
      adDescription: "Discover the future of home automation. Our AI-powered smart home system learns your habits and saves you money. Limited time offer - 50% off installation. Free consultation available.",
      mediaType: "video",
      adCategory: "Tech",
      globalReachCountries: ["United States", "Canada", "Germany", "United Kingdom"],
      audienceTargeting: "Tech enthusiasts 30-50, homeowners, early adopters",
      attentionScore: 78,
      competitorInsights: {
        saturationLevel: "medium",
        messagingSimilarity: "low"
      }
    }
  });
});

module.exports = router;
