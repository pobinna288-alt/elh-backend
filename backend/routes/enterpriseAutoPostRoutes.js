/**
 * ENTERPRISE AI AUTO-POST GENERATOR ROUTES
 * Transform uploaded product data into optimized enterprise advertisements
 * 
 * Endpoints:
 *   POST /auto-post/generate         - Generate full auto-post content
 *   POST /auto-post/generate-ai      - Generate with AI enhancement (Enterprise only)
 *   POST /auto-post/titles           - Generate title suggestions only
 *   POST /auto-post/descriptions     - Generate description suggestions only
 *   POST /auto-post/pricing          - Get pricing intelligence (Enterprise only)
 *   POST /auto-post/markets          - Get market targeting (Enterprise only)
 *   GET  /auto-post/features         - Get features by subscription level
 * 
 * Access Control:
 *   - Enterprise: Full AI-powered features
 *   - Pro, Hot: Limited features (titles + descriptions only)
 *   - Normal, Premium: Access denied
 */

const express = require("express");
const router = express.Router();
const {
  verifyAutoPostAccess,
  generateEnterpriseAutoPost,
  generateAutoPostFallback,
  generateAutoPostWithAI,
  SUBSCRIPTION_ACCESS,
  GLOBAL_MARKET_DATA
} = require("../services/enterpriseAutoPostService");

const extractFusionAutoPostResult = (result = {}, requestBody = {}) => {
  if (result.fusionPackage) {
    return result.fusionPackage;
  }

  const firstTitle = Array.isArray(result.titles)
    ? (result.titles[0]?.text || result.titles[0] || requestBody.title || "Optimized headline")
    : (requestBody.title || "Optimized headline");

  const firstDescription = Array.isArray(result.descriptions)
    ? (result.descriptions[0]?.text || result.descriptions[0] || requestBody.description || "Optimized description")
    : (requestBody.description || "Optimized description");

  return {
    headline: `${firstTitle}`.trim(),
    description: `${firstDescription}`.trim(),
    cta: requestBody.price ? `Message now to secure it for ${requestBody.price}.` : "Message now to secure it today.",
    targetAudience: "High-intent buyers ready to take action.",
    platformSuggestion: "Facebook Marketplace"
  };
};

// ─── Middleware: Subscription Access Check ──────────────────────────────────

/**
 * Middleware to verify subscription level access
 * SECURITY FIX: ONLY checks req.user.subscriptionLevel from authenticated token
 * NEVER accepts tier from request body to prevent tier spoofing
 */
const requireAutoPostAccess = (req, res, next) => {
  // Get subscription level from AUTHENTICATED USER only (never from body)
  const authenticatedUser = req.user || req.currentUser;
  if (!authenticatedUser) {
    return res.status(401).json({
      success: false,
      error: "Authentication is required for AI Auto Post",
      feature: "AI Auto Post Generator"
    });
  }

  const subscriptionLevel = authenticatedUser.subscriptionLevel || 
                            authenticatedUser.subscriptionPlan || 
                            authenticatedUser.plan || "";

  if (!subscriptionLevel) {
    return res.status(400).json({
      success: false,
      error: "Subscription level is required but not found in authenticated user",
      allowedLevels: ["enterprise", "pro", "hot"],
      feature: "AI Auto Post Generator"
    });
  }

  const accessCheck = verifyAutoPostAccess(subscriptionLevel);
  if (!accessCheck.hasAccess) {
    return res.status(403).json({
      success: false,
      error: accessCheck.error,
      allowedLevels: ["enterprise", "pro", "hot"],
      feature: "AI Auto Post Generator"
    });
  }

  req.accessInfo = accessCheck;
  req.body = req.body || {};
  req.body.subscriptionLevel = subscriptionLevel; // Set authenticated level
  req.authenticatedSubscriptionLevel = subscriptionLevel; // Track for enforcement
  return next();
};

/**
 * Middleware to require Enterprise access specifically
 * SECURITY FIX: ONLY checks req.user.subscriptionLevel (authenticated token)
 * NEVER accepts subscriptionLevel from request body
 */
const requireEnterpriseAccess = (req, res, next) => {
  const authenticatedUser = req.user || req.currentUser;
  if (!authenticatedUser) {
    return res.status(401).json({
      success: false,
      error: "Authentication is required",
      feature: "Enterprise AI Features",
    });
  }

  const subscriptionLevel = (authenticatedUser.subscriptionLevel || 
                             authenticatedUser.subscriptionPlan || 
                             authenticatedUser.plan || "").toLowerCase();
  
  if (subscriptionLevel !== "enterprise") {
    return res.status(403).json({
      success: false,
      error: "This feature requires Enterprise subscription",
      feature: "AI Auto Post Generator",
      requiredLevel: "enterprise",
      currentLevel: subscriptionLevel || "unknown"
    });
  }
  
  req.accessInfo = { hasAccess: true, aiEnabled: true, fullFeatures: true };
  req.authenticatedSubscriptionLevel = "enterprise"; // For enforcement
  next();
};

/**
 * Middleware to enforce AI quota for Enterprise features
 * SECURITY FIX: Ensures quota checks happen BEFORE expensive OpenAI calls
 */
const requireEnterpriseAiQuota = (req, res, next) => {
  const authenticatedUser = req.user || req.currentUser;
  if (!authenticatedUser) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
    });
  }

  const userId = authenticatedUser.id || authenticatedUser.sub;
  const now = new Date();
  const todayKey = now.toISOString().split("T")[0];
  const monthKey = now.toISOString().slice(0, 7);

  // Get or create usage record for this user
  if (!req.app.locals.enterpriseAiUsage) {
    req.app.locals.enterpriseAiUsage = new Map();
  }

  const usageKey = `${userId}:${monthKey}`;
  const usage = req.app.locals.enterpriseAiUsage.get(usageKey) || {
    userId,
    monthKey,
    dailyCount: 0,
    dailyDate: todayKey,
    monthlyCount: 0,
    resets: 0,
  };

  // Reset daily counter if new day
  if (usage.dailyDate !== todayKey) {
    usage.dailyDate = todayKey;
    usage.dailyCount = 0;
  }

  // Enterprise tier quotas (adjust as needed)
  const ENTERPRISE_DAILY_LIMIT = Number.parseInt(process.env.ENTERPRISE_DAILY_AI_LIMIT || "50", 10);
  const ENTERPRISE_MONTHLY_LIMIT = Number.parseInt(process.env.ENTERPRISE_MONTHLY_AI_LIMIT || "1000", 10);

  // Check quotas BEFORE any API call
  if (usage.dailyCount >= ENTERPRISE_DAILY_LIMIT) {
    return res.status(429).json({
      success: false,
      error: "Daily Enterprise AI quota reached",
      daily_limit: ENTERPRISE_DAILY_LIMIT,
      daily_used: usage.dailyCount,
    });
  }

  if (usage.monthlyCount >= ENTERPRISE_MONTHLY_LIMIT) {
    return res.status(429).json({
      success: false,
      error: "Monthly Enterprise AI quota reached",
      monthly_limit: ENTERPRISE_MONTHLY_LIMIT,
      monthly_used: usage.monthlyCount,
    });
  }

  // Store for post-execution update
  req.aiQuotaUsage = usage;
  req.aiQuotaKey = usageKey;
  next();
};

// ─── POST /auto-post/generate ───────────────────────────────────────────────

/**
 * Generate complete auto-post content
 * 
 * Request Body:
 * {
 *   "subscriptionLevel": "enterprise" | "pro" | "hot",
 *   "title": "Optional existing title",
 *   "description": "Optional existing description",
 *   "category": "Product category",
 *   "price": 99.99,
 *   "images": ["url1", "url2"],
 *   "targetMarket": "Global | US | EU | etc"
 * }
 * 
 * Response (Enterprise - Full Features):
 * {
 *   "success": true,
 *   "data": {
 *     "productUnderstanding": {...},
 *     "titles": [...],
 *     "descriptions": [...],
 *     "pricing": {...},
 *     "countries": [...],
 *     "marketInsight": "...",
 *     "adReport": {...},
 *     "revenuePrediction": {...}
 *   }
 * }
 * 
 * Response (Pro/Hot - Limited Features):
 * {
 *   "success": true,
 *   "data": {
 *     "productUnderstanding": {...},
 *     "titles": [...],
 *     "descriptions": [...],
 *     "adReport": {...}
 *   },
 *   "upgradePrompt": "Upgrade to Enterprise for AI-powered pricing..."
 * }
 */
router.post("/generate", requireAutoPostAccess, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      price,
      images,
      targetMarket,
      subscriptionLevel
    } = req.body;

    const payload = {
      title,
      description,
      category,
      price,
      images,
      targetMarket
    };

    const result = await generateEnterpriseAutoPost(payload, req.accessInfo);

    return res.json({
      success: true,
      feature: "AI Auto Post Generator",
      data: extractFusionAutoPostResult(result, req.body),
      subscriptionLevel,
      features: {
        aiEnabled: req.accessInfo.aiEnabled,
        fullFeatures: req.accessInfo.fullFeatures
      }
    });

  } catch (error) {
    console.error("[Auto-Post Generate] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate auto-post content",
      details: error.message
    });
  }
});

// ─── POST /auto-post/generate-ai ────────────────────────────────────────────

/**
 * Generate AI-enhanced auto-post content (Enterprise only)
 * Uses OpenAI for advanced content generation
 * SECURITY FIX: Added requireEnterpriseAiQuota to check quotas BEFORE OpenAI call
 */
router.post("/generate-ai", requireEnterpriseAccess, requireEnterpriseAiQuota, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      price,
      images,
      targetMarket
    } = req.body;

    const payload = {
      title,
      description,
      category,
      price,
      images,
      targetMarket,
      aiEnabled: true
    };

    const result = await generateAutoPostWithAI(payload);

    // SECURITY FIX: Increment quota counter AFTER successful API execution
    if (req.aiQuotaUsage && req.aiQuotaKey) {
      const app = req.app;
      if (!app.locals.enterpriseAiUsage) {
        app.locals.enterpriseAiUsage = new Map();
      }
      
      req.aiQuotaUsage.dailyCount += 1;
      req.aiQuotaUsage.monthlyCount += 1;
      app.locals.enterpriseAiUsage.set(req.aiQuotaKey, req.aiQuotaUsage);
    }

    return res.json({
      success: true,
      feature: "AI Auto Post Generator",
      data: extractFusionAutoPostResult(result, req.body),
      subscriptionLevel: "enterprise",
      features: {
        aiEnabled: true,
        fullFeatures: true,
        model: result.meta?.model || "gpt-4o"
      }
    });

  } catch (error) {
    console.error("[Auto-Post AI Generate] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate AI-enhanced content",
      details: error.message
    });
  }
});

// ─── POST /auto-post/titles ─────────────────────────────────────────────────

/**
 * Generate title suggestions only
 * Available to all subscription levels with access
 */
router.post("/titles", requireAutoPostAccess, async (req, res) => {
  try {
    const { title, description, category } = req.body;

    const payload = { title, description, category };
    const result = await generateEnterpriseAutoPost(payload, { ...req.accessInfo, fullFeatures: false });

    return res.json({
      success: true,
      titles: result.titles,
      meta: {
        generatedAt: new Date().toISOString(),
        aiPowered: req.accessInfo.aiEnabled
      }
    });

  } catch (error) {
    console.error("[Auto-Post Titles] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate titles",
      details: error.message
    });
  }
});

// ─── POST /auto-post/descriptions ───────────────────────────────────────────

/**
 * Generate description suggestions only
 * Available to all subscription levels with access
 */
router.post("/descriptions", requireAutoPostAccess, async (req, res) => {
  try {
    const { title, description, category } = req.body;

    const payload = { title, description, category };
    const result = await generateEnterpriseAutoPost(payload, { ...req.accessInfo, fullFeatures: false });

    return res.json({
      success: true,
      descriptions: result.descriptions,
      meta: {
        generatedAt: new Date().toISOString(),
        aiPowered: req.accessInfo.aiEnabled
      }
    });

  } catch (error) {
    console.error("[Auto-Post Descriptions] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate descriptions",
      details: error.message
    });
  }
});

// ─── POST /auto-post/pricing ────────────────────────────────────────────────

/**
 * Get pricing intelligence (Enterprise only)
 */
router.post("/pricing", requireEnterpriseAccess, async (req, res) => {
  try {
    const { title, category, price, targetMarket } = req.body;

    if (!price) {
      return res.status(400).json({
        success: false,
        error: "Price is required for pricing intelligence"
      });
    }

    const payload = { title, category, price, targetMarket };
    const result = await generateEnterpriseAutoPost(payload, { aiEnabled: true, fullFeatures: true });

    return res.json({
      success: true,
      pricing: result.pricing,
      meta: {
        generatedAt: new Date().toISOString(),
        aiPowered: result.meta?.aiPowered || false
      }
    });

  } catch (error) {
    console.error("[Auto-Post Pricing] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate pricing intelligence",
      details: error.message
    });
  }
});

// ─── POST /auto-post/markets ────────────────────────────────────────────────

/**
 * Get global market targeting (Enterprise only)
 */
router.post("/markets", requireEnterpriseAccess, async (req, res) => {
  try {
    const { title, category, price, targetMarket } = req.body;

    const payload = { title, category, price, targetMarket };
    const result = await generateEnterpriseAutoPost(payload, { aiEnabled: true, fullFeatures: true });

    return res.json({
      success: true,
      countries: result.countries,
      marketInsight: result.marketInsight,
      availableRegions: Object.keys(GLOBAL_MARKET_DATA.regions),
      meta: {
        generatedAt: new Date().toISOString(),
        aiPowered: result.meta?.aiPowered || false
      }
    });

  } catch (error) {
    console.error("[Auto-Post Markets] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate market intelligence",
      details: error.message
    });
  }
});

// ─── GET /auto-post/features ────────────────────────────────────────────────

/**
 * Get available features by subscription level
 */
router.get("/features", (req, res) => {
  const { subscriptionLevel } = req.query;

  const response = {
    success: true,
    subscriptionLevels: {
      enterprise: {
        hasAccess: true,
        aiEnabled: true,
        fullFeatures: true,
        features: [
          "One optimized headline",
          "One conversion-focused description",
          "One strong CTA",
          "Target audience positioning",
          "Best platform suggestion"
        ]
      },
      pro: {
        hasAccess: true,
        aiEnabled: false,
        fullFeatures: false,
        features: [
          "One optimized headline",
          "One conversion-focused description",
          "Target audience positioning"
        ],
        upgradeOptions: ["Upgrade to Enterprise for full Fusion output"]
      },
      hot: {
        hasAccess: true,
        aiEnabled: false,
        fullFeatures: false,
        features: [
          "One optimized headline",
          "One conversion-focused description",
          "Target audience positioning"
        ],
        upgradeOptions: ["Upgrade to Enterprise for full Fusion output"]
      },
      premium: {
        hasAccess: false,
        aiEnabled: false,
        fullFeatures: false,
        upgradeRequired: true,
        upgradeOptions: ["Upgrade to Pro, Hot, or Enterprise"]
      },
      normal: {
        hasAccess: false,
        aiEnabled: false,
        fullFeatures: false,
        upgradeRequired: true,
        upgradeOptions: ["Upgrade to Pro, Hot, or Enterprise"]
      }
    }
  };

  // If specific level requested, return only that
  if (subscriptionLevel) {
    const level = subscriptionLevel.toLowerCase();
    if (response.subscriptionLevels[level]) {
      return res.json({
        success: true,
        subscriptionLevel: level,
        ...response.subscriptionLevels[level]
      });
    }
    return res.status(400).json({
      success: false,
      error: `Unknown subscription level: ${subscriptionLevel}`
    });
  }

  return res.json(response);
});

// ─── GET /auto-post/categories ──────────────────────────────────────────────

/**
 * Get supported product categories with market multipliers
 */
router.get("/categories", (req, res) => {
  return res.json({
    success: true,
    categories: Object.entries(GLOBAL_MARKET_DATA.categoryMultipliers).map(([name, multiplier]) => ({
      name,
      marketMultiplier: multiplier,
      demandLevel: multiplier >= 1.1 ? "High" : multiplier >= 1.0 ? "Medium" : "Moderate"
    }))
  });
});

// ─── GET /auto-post/regions ─────────────────────────────────────────────────

/**
 * Get available global regions
 */
router.get("/regions", (req, res) => {
  return res.json({
    success: true,
    regions: Object.entries(GLOBAL_MARKET_DATA.regions).map(([country, data]) => ({
      country,
      demandScore: data.demandScore,
      competition: data.competition,
      purchasingPower: data.purchasingPower
    }))
  });
});

module.exports = router;
