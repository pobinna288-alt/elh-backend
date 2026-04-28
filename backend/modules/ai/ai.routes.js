const express = require("express");
const enterpriseAutoPostRoutes = require("../../routes/enterpriseAutoPostRoutes");
const {
  buildSmartCopywriterDecision,
  buildAdGuardianDecision,
  buildAdImprovementReportDecision,
  buildCloseFlowDecision,
  buildDemandPulseDecision,
} = require("../../services/revenueIntelligenceEngine");
const {
  runMarketIntelligenceHealthCheck,
} = require("../../services/marketIntelligenceService");
const { formatCloseFlowCurrencyResponse } = require("../../utils/currencyResponseFormatter");
const { resolveBudgetContext } = require("../../config/enterpriseBudgetConfig");
const { createAiUsageGuard } = require("../../middleware/aiUsageGuardMiddleware");
const { createAiService } = require("./ai.service");
const { createAiController } = require("./ai.controller");

let openaiClient = null;
try {
  if (process.env.OPENAI_API_KEY) {
    const { OpenAI } = require("openai");
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
} catch (error) {
  console.warn("[AI Routes] OpenAI initialization skipped:", error.message);
}

const OPENAI_LATEST_MODEL = process.env.OPENAI_LATEST_MODEL || "gpt-5";
const OPENAI_DEFAULT_MODEL = process.env.OPENAI_DEFAULT_MODEL || "gpt-4o-mini";
const EXTERNAL_AI_TIMEOUT_MS = Number.parseInt(process.env.EXTERNAL_AI_TIMEOUT_MS || process.env.EXTERNAL_CALL_TIMEOUT_MS || "12000", 10);

const FEATURE_GATE_STATE = {
  initialized: false,
  runningCheck: false,
  disabledFeatures: new Set(),
  checks: null,
};

const FUSION_ENGINE_CONTEXT = `
You are the AI Sales Intelligence Engine (v2 ENTERPRISE FUSION SYSTEM).
Use a 3-brain fusion system internally:
- Creative Brain: emotional messaging and engagement
- Strategic Brain: pricing, persuasion, and deal closing
- Market Brain: demand fit, timing, and competitive positioning

Market Brain must use Google Trends only (demand and trend timing).
Do not use external pricing APIs.

Return one final optimized result only.
Do not expose reasoning.
Do not provide alternatives.
Always prioritize conversion speed, pricing strength, and revenue outcomes.
`.trim();

const ENTERPRISE_AI_FEATURES = Object.freeze([
  {
    id: "smart_copywriter",
    name: "Smart Copywriter (ELITE)",
    description: "Returns one optimized high-conversion ad aligned with Google Trends demand.",
    access: ["starter", "pro", "elite", "enterprise"],
  },
  {
    id: "negotiation_ai",
    name: "Negotiation AI (ELITE)",
    description: "Returns one optimized negotiation reply with strategy, estimated range, and buyer intent insight.",
    access: ["starter", "pro", "elite", "enterprise"],
  },
  {
    id: "ad_improvement_report",
    name: "Ad Improvement Report (ELITE)",
    description: "Returns one final ad improvement report with score, actions, weakness summary, and improved ad.",
    access: ["pro", "elite", "enterprise"],
  },
  {
    id: "ai_auto_post_generator",
    name: "AI Auto Post Generator",
    description: "Builds one complete ad package with headline, description, CTA, audience fit, and platform suggestion.",
    access: ["pro", "elite", "enterprise"],
  },
  {
    id: "ai_adguardian",
    name: "AI AdGuardian",
    description: "Scores ad performance, flags risk, limits fixes to the top three, and returns one optimized final ad.",
    access: ["pro", "elite", "enterprise"],
  },
]);

function resolveSubscriptionLevel(req) {
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

  if (rawPlan === "elite" || rawPlan === "hot") {
    return "elite";
  }

  if (rawPlan === "starter" || rawPlan === "premium") {
    return "starter";
  }

  return rawPlan || "normal";
}

function getRequireAuth(context = {}) {
  return typeof context.authenticateToken === "function"
    ? context.authenticateToken
    : (_req, res) => res.status(500).json({ success: false, error: "AI auth middleware unavailable" });
}

function attachResolvedPlan(req, _res, next) {
  const subscriptionLevel = resolveSubscriptionLevel(req);
  req.subscriptionLevel = subscriptionLevel;

  if (req.user) {
    req.user.subscriptionLevel = req.user.subscriptionLevel || subscriptionLevel;
  }

  if (req.currentUser) {
    req.currentUser.subscriptionLevel = req.currentUser.subscriptionLevel || subscriptionLevel;
  }

  next();
}

function sanitizeText(value, fallback = "") {
  const normalized = `${value ?? fallback}`.replace(/\s+/g, " ").trim();
  return normalized;
}

function sanitizeStarterDecision(featureId, decision = {}) {
  if (!decision || typeof decision !== "object") {
    return {};
  }

  const base = { ...decision };
  delete base.market_api_calls_consumed;
  delete base.market_api_status;
  delete base.data_source;
  delete base.data_source_strength;

  if (featureId === "copywriter") {
    return {
      optimized_ad_copy: sanitizeText(base.optimized_ad_copy, "Generate concise, buyer-focused copy with one direct CTA."),
    };
  }

  if (featureId === "negotiation") {
    const priceRange = base.price_range && typeof base.price_range === "object"
      ? {
          low: Number.isFinite(Number(base.price_range.low)) ? Number(base.price_range.low) : null,
          fair: Number.isFinite(Number(base.price_range.fair)) ? Number(base.price_range.fair) : null,
          high: Number.isFinite(Number(base.price_range.high)) ? Number(base.price_range.high) : null,
        }
      : null;

    return {
      recommended_price: Number.isFinite(Number(base.recommended_price)) ? Number(base.recommended_price) : null,
      broad_price_range: priceRange,
      market_confidence: sanitizeText(base.market_confidence, "low"),
    };
  }

  if (featureId === "market_insight") {
    return {
      demand_score: Number.isFinite(Number(base.demand_score)) ? Number(base.demand_score) : null,
      trend_direction: sanitizeText(base.trend_direction, "stable"),
      target_audience_insight: sanitizeText(base.target_audience_insight, "Focus on clear value and immediate buyer action."),
      suggested_product_positioning: sanitizeText(base.suggested_product_positioning, "Use clear differentiation and direct value framing."),
      best_selling_timing: sanitizeText(base.best_selling_timing, "Next 7-14 days"),
    };
  }

  return base;
}

function resolveUserId(req) {
  return sanitizeText(
    req?.currentUser?.id ||
      req?.user?.id ||
      req?.user?.userId ||
      req?.user?.sub,
    "anonymous",
  );
}

function buildFeatureResponse(feature, result) {
  return {
    success: true,
    feature,
    result,
  };
}

function markFeatureDisabled(featureKey, reason) {
  FEATURE_GATE_STATE.disabledFeatures.add(featureKey);
  if (reason) {
    console.warn(`[AI Health] Feature disabled: ${featureKey}. Reason: ${reason}`);
  }
}

async function withExternalTimeout(taskFn, label) {
  const timeoutMs = Number.isFinite(EXTERNAL_AI_TIMEOUT_MS) && EXTERNAL_AI_TIMEOUT_MS > 0
    ? EXTERNAL_AI_TIMEOUT_MS
    : 12000;

  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const taskPromise = Promise.resolve().then(() => taskFn());
    return await Promise.race([taskPromise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function checkOpenAiModelAccess(modelName) {
  if (!openaiClient || !modelName) {
    return false;
  }

  try {
    await withExternalTimeout(
      () => openaiClient.models.retrieve(modelName),
      `OpenAI model accessibility check (${modelName})`
    );
    return true;
  } catch (_error) {
    return false;
  }
}

async function initializeAiHealthState(options = {}) {
  const forceCloseflow = options && options.forceCloseflow === true;
  if ((FEATURE_GATE_STATE.initialized && !forceCloseflow) || FEATURE_GATE_STATE.runningCheck) {
    return;
  }

  FEATURE_GATE_STATE.runningCheck = true;

  try {
    const marketHealth = await runMarketIntelligenceHealthCheck();
    const defaultModelOk = await checkOpenAiModelAccess(OPENAI_DEFAULT_MODEL);
    const latestModelOk = await checkOpenAiModelAccess(OPENAI_LATEST_MODEL);

    FEATURE_GATE_STATE.checks = {
      ...marketHealth.checks,
      openAiDefaultModelAccessible: defaultModelOk,
      openAiLatestModelAccessible: latestModelOk,
    };

    const closeflowDisableReasons = [];

    if (marketHealth.shouldHardDisableFeatures) {
      const reason = (marketHealth.hardDisableReasons || []).join("; ") || "market intelligence hard-disabled by configuration";
      closeflowDisableReasons.push(reason);

      if (!forceCloseflow) {
        markFeatureDisabled("ad_guardian", reason);
        markFeatureDisabled("demand_pulse", reason);
        markFeatureDisabled("closeflow", reason);
      }
    } else if (Array.isArray(marketHealth.degradedReasons) && marketHealth.degradedReasons.length > 0) {
      console.warn(`[AI Health] Market intelligence degraded mode active. Reasons: ${marketHealth.degradedReasons.join("; ")}`);
    }

    if (!marketHealth.checks.closeflowSafetyModeEnabled && marketHealth.shouldHardDisableFeatures) {
      closeflowDisableReasons.push("closeflow safety mode disabled");
      if (!forceCloseflow) {
        markFeatureDisabled("closeflow", "closeflow safety mode disabled");
      }
    }

    if (!defaultModelOk) {
      closeflowDisableReasons.push("OpenAI default model unavailable");
      if (!forceCloseflow) {
        markFeatureDisabled("ad_guardian", "OpenAI default model unavailable");
        if (!marketHealth.checks.fallbackEngineWorking) {
          markFeatureDisabled("closeflow", "OpenAI default model unavailable");
        }
        markFeatureDisabled("ad_improvement", "OpenAI default model unavailable");
      }
    }

    if (!latestModelOk && !forceCloseflow) {
      markFeatureDisabled("revenue_copy", "OpenAI latest model unavailable");
    }

    if (forceCloseflow) {
      if (closeflowDisableReasons.length > 0) {
        markFeatureDisabled("closeflow", closeflowDisableReasons[0]);
      } else {
        FEATURE_GATE_STATE.disabledFeatures.delete("closeflow");
      }
    } else if (closeflowDisableReasons.length === 0) {
      FEATURE_GATE_STATE.disabledFeatures.delete("closeflow");
    }

    FEATURE_GATE_STATE.initialized = true;
    console.info("[AI Health] Startup checks completed", FEATURE_GATE_STATE.checks);
    console.log("CloseFlow status:", FEATURE_GATE_STATE.disabledFeatures.has("closeflow"));
  } catch (error) {
    markFeatureDisabled("revenue_copy", `startup check failed: ${error.message}`);
    markFeatureDisabled("ad_guardian", `startup check failed: ${error.message}`);
    markFeatureDisabled("closeflow", `startup check failed: ${error.message}`);
    markFeatureDisabled("demand_pulse", `startup check failed: ${error.message}`);
    markFeatureDisabled("ad_improvement", `startup check failed: ${error.message}`);
    FEATURE_GATE_STATE.initialized = true;
    console.log("CloseFlow status:", FEATURE_GATE_STATE.disabledFeatures.has("closeflow"));
  } finally {
    FEATURE_GATE_STATE.runningCheck = false;
  }
}

function requireFeatureHealthy(featureKey) {
  return (_req, res, next) => {
    // Allow CloseFlow during initialization if fallback engine is working
    if (!FEATURE_GATE_STATE.initialized && featureKey === "closeflow") {
      const fallbackWorking = FEATURE_GATE_STATE.checks?.fallbackEngineWorking === true;
      if (fallbackWorking) {
        return next();
      }
    }

    if (!FEATURE_GATE_STATE.initialized) {
      if (!FEATURE_GATE_STATE.runningCheck) {
        void initializeAiHealthState().catch((error) => {
          console.warn(`[AI Health] Lazy initialization failed: ${error.message}`);
        });
      }
      return res.status(503).json({
        success: false,
        error: "AI system health check is still initializing",
      });
    }

    if (FEATURE_GATE_STATE.disabledFeatures.has(featureKey)) {
      if (featureKey === "closeflow" && !FEATURE_GATE_STATE.runningCheck) {
        console.log("CloseFlow status:", FEATURE_GATE_STATE.disabledFeatures.has("closeflow"));
        void initializeAiHealthState({ forceCloseflow: true }).catch((error) => {
          console.warn(`[AI Health] Closeflow recheck failed: ${error.message}`);
        });
      }
      return res.status(503).json({
        success: false,
        error: `${featureKey} is temporarily unavailable due to startup safety checks`,
      });
    }

    next();
  };
}

async function generateTextWithAi({ systemPrompt, userPrompt, fallbackText, temperature = 0.7, model }) {
  if (!openaiClient) {
    return fallbackText;
  }

  try {
    const completion = await withExternalTimeout(
      () => openaiClient.chat.completions.create({
        model: model || OPENAI_DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
      }),
      "OpenAI text generation"
    );

    return sanitizeText(completion.choices?.[0]?.message?.content, fallbackText) || fallbackText;
  } catch (error) {
    console.warn("[AI Routes] Falling back to local response:", error.message);
    return fallbackText;
  }
}

async function generateJsonWithAi({ systemPrompt, userPrompt, fallbackData, temperature = 0.4, model }) {
  if (!openaiClient) {
    return fallbackData;
  }

  try {
    const completion = await withExternalTimeout(
      () => openaiClient.chat.completions.create({
        model: model || OPENAI_DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        response_format: { type: "json_object" },
      }),
      "OpenAI JSON generation"
    );

    const rawContent = completion.choices?.[0]?.message?.content;
    if (!rawContent) {
      return fallbackData;
    }

    const parsed = JSON.parse(rawContent);
    return parsed && typeof parsed === "object" ? parsed : fallbackData;
  } catch (error) {
    console.warn("[AI Routes] Falling back to local JSON response:", error.message);
    return fallbackData;
  }
}

function extractNumericPrice(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const normalized = `${value ?? ""}`.replace(/[^\d.]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPriceRange(value, minimumValue = null) {
  const price = extractNumericPrice(value);
  const minimum = extractNumericPrice(minimumValue);

  if (!price && !minimum) {
    return "Keep the current asking price as the anchor and only discount for serious buyers.";
  }

  const floor = minimum || Math.max(1, Math.round((price || minimum) * 0.92));
  const ceiling = Math.max(floor, Math.round(price || minimum));
  return `$${floor} - $${ceiling}`;
}

function normalizeGuardianOutput(analysis, guardianInput) {
  const fallbackImprovements = [
    analysis?.demand_analysis ? `Strengthen the ad around ${sanitizeText(analysis.demand_analysis).toLowerCase()} demand signals.` : "Lead with the clearest value benefit in the first sentence.",
    analysis?.competition_analysis ? `Differentiate more sharply against ${sanitizeText(analysis.competition_analysis).toLowerCase()} competition.` : "Add urgency and proof points to reduce buyer hesitation.",
    guardianInput?.product_price ? `Keep price positioning competitive around ${guardianInput.product_price}.` : "Use a confident CTA that moves buyers to immediate action.",
  ];

  const improvements = (Array.isArray(analysis?.actionable_insights) ? analysis.actionable_insights : fallbackImprovements)
    .map((item) => sanitizeText(item))
    .filter(Boolean)
    .slice(0, 3);

  return {
    performance_score: Math.max(0, Math.min(100, Math.round(Number(analysis?.safety_score ?? analysis?.confidence_score ?? 75)))),
    risk_level: sanitizeText(analysis?.risk_level, "Moderate"),
    improvements,
    final_optimized_ad: {
      headline: sanitizeText(analysis?.auto_post_generator?.optimized_title || guardianInput?.product_name, "Optimized Offer"),
      description: sanitizeText(
        analysis?.auto_post_generator?.optimized_description || guardianInput?.product_description,
        "High-value offer refined for stronger conversion and faster sales.",
      ),
      cta: sanitizeText(analysis?.auto_post_generator?.call_to_action, "Message now to secure it today."),
    },
  };
}

function getRequestCycleId(req) {
  return sanitizeText(
    req?.aiRequestId ||
      req?.id,
    "",
  );
}

function buildBudgetContextPayload(req, payload = {}) {
  // SECURITY FIX: Only accept tier from authenticated user, NEVER from request body
  // Prevents Pro users from injecting "vip" or "enterprise" tier in request payload
  const authenticatedTier = req.subscriptionLevel || resolveSubscriptionLevel(req);
  
  // If Pro tier, enforce Pro-only limits regardless of payload claims
  if (authenticatedTier === "pro") {
    return resolveBudgetContext({
      budget: payload.budget ?? payload.annual_budget ?? payload.estimated_budget,
      budget_min: payload.budget_min,
      budget_max: payload.budget_max,
      budget_tier: "pro", // Force Pro tier, ignore payload
      budget_range: payload.budget_range,
      tier: "pro",
      // Pro enforcement: no VIP, no multi-source, no enterprise features
      enforceProLimits: true,
    });
  }

  if (authenticatedTier === "starter") {
    return resolveBudgetContext({
      budget: payload.budget ?? payload.annual_budget ?? payload.estimated_budget,
      budget_min: payload.budget_min,
      budget_max: payload.budget_max,
      budget_tier: "starter",
      budget_range: payload.budget_range,
      tier: "starter",
    });
  }

  return resolveBudgetContext({
    budget: payload.budget ?? payload.annual_budget ?? payload.estimated_budget,
    budget_min: payload.budget_min,
    budget_max: payload.budget_max,
    budget_tier: payload.budget_tier,
    budget_range: payload.budget_range,
    tier: payload.tier,
  });
}

async function handleCopywriter(req, res) {
  try {
    const payload = req.body || {};
    const decision = await buildSmartCopywriterDecision(payload, {
      generateTextWithAi,
      generateJsonWithAi,
      latestModel: OPENAI_LATEST_MODEL,
    }, {
      requestCycleId: getRequestCycleId(req),
      userId: resolveUserId(req),
      subscriptionLevel: req.subscriptionLevel,
      marketAccessMode: req.marketAccessMode,
    });

    const responsePayload = req.subscriptionLevel === "starter"
      ? sanitizeStarterDecision("copywriter", decision)
      : decision;

    return res.json(buildFeatureResponse("RevenueCopy AI", responsePayload));
  } catch (error) {
    return res.status(500).json({ success: false, error: "Failed to generate ad copy", details: error.message });
  }
}

async function handleNegotiation(req, res) {
  try {
    const payload = req.body || {};
    const budgetContext = buildBudgetContextPayload(req, payload);
    const decision = await buildCloseFlowDecision(payload, {
      generateTextWithAi,
      generateJsonWithAi,
    }, {
      requestCycleId: getRequestCycleId(req),
      userId: resolveUserId(req),
      subscriptionLevel: req.subscriptionLevel,
      budgetContext,
      marketAccessMode: req.marketAccessMode,
    });

    const responsePayload = req.subscriptionLevel === "starter"
      ? sanitizeStarterDecision("negotiation", decision)
      : decision;

    const userContext = {
      ...(req.currentUser || {}),
      ...(req.user || {}),
      plan: req.subscriptionLevel,
    };
    const currencyNormalizedPayload = await formatCloseFlowCurrencyResponse(userContext, responsePayload);

    return res.json(buildFeatureResponse("CloseFlow AI", currencyNormalizedPayload));
  } catch (error) {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    return res.status(statusCode).json({ success: false, error: "Failed to generate CloseFlow intelligence", details: error.message });
  }
}

async function handleCloseFlowMvp(req, res) {
  try {
    const payload = req.body || {};
    const budgetContext = buildBudgetContextPayload(req, payload);
    const decision = await buildCloseFlowDecision(payload, {
      generateTextWithAi,
      generateJsonWithAi,
    }, {
      requestCycleId: getRequestCycleId(req),
      userId: resolveUserId(req),
      subscriptionLevel: req.subscriptionLevel,
      budgetContext,
      marketAccessMode: req.marketAccessMode,
    });

    const responsePayload = req.subscriptionLevel === "starter"
      ? sanitizeStarterDecision("negotiation", decision)
      : decision;

    const userContext = {
      ...(req.currentUser || {}),
      ...(req.user || {}),
      plan: req.subscriptionLevel,
    };
    const currencyNormalizedPayload = await formatCloseFlowCurrencyResponse(userContext, responsePayload);

    const priceCandidate =
      currencyNormalizedPayload?.recommended_price ??
      currencyNormalizedPayload?.price ??
      currencyNormalizedPayload?.broad_price_range?.fair ??
      currencyNormalizedPayload?.broad_price_range?.low;
    const price = Number.isFinite(Number(priceCandidate)) ? Number(priceCandidate) : 0;

    return res.json({
      success: true,
      price,
      message: "CloseFlow generated successfully",
    });
  } catch (err) {
    console.error("CloseFlow error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

async function handleDemandPulse(req, res) {
  try {
    const payload = req.body || {};
    const budgetContext = buildBudgetContextPayload(req, payload);
    const decision = await buildDemandPulseDecision(payload, {
      generateTextWithAi,
      generateJsonWithAi,
    }, {
      requestCycleId: getRequestCycleId(req),
      userId: resolveUserId(req),
      subscriptionLevel: req.subscriptionLevel,
      budgetContext,
      marketAccessMode: req.marketAccessMode,
    });

    const responsePayload = req.subscriptionLevel === "starter"
      ? sanitizeStarterDecision("market_insight", decision)
      : decision;

    return res.json(buildFeatureResponse("DemandPulse AI", responsePayload));
  } catch (error) {
    return res.status(500).json({ success: false, error: "Failed to generate DemandPulse intelligence", details: error.message });
  }
}

async function handleAdImprovement(req, res) {
  try {
    const payload = req.body || {};
    const decision = await buildAdImprovementReportDecision(payload, {
      generateTextWithAi,
      generateJsonWithAi,
    }, {
      requestCycleId: getRequestCycleId(req),
      userId: resolveUserId(req),
      subscriptionLevel: req.subscriptionLevel,
      marketAccessMode: req.marketAccessMode,
    });

    return res.json(buildFeatureResponse("Ad Improvement Report", decision));
  } catch (error) {
    return res.status(500).json({ success: false, error: "Failed to generate Ad Improvement Report", details: error.message });
  }
}

async function handleGuardian(req, res, aiService) {
  try {
    const payload = req.body || {};
    const budgetContext = buildBudgetContextPayload(req, payload);
    const decision = await buildAdGuardianDecision(payload, {
      generateTextWithAi,
      generateJsonWithAi,
    }, {
      requestCycleId: getRequestCycleId(req),
      userId: resolveUserId(req),
      subscriptionLevel: req.subscriptionLevel,
      budgetContext,
      marketAccessMode: req.marketAccessMode,
    });

    return res.json(buildFeatureResponse("AdGuardian AI", decision));
  } catch (error) {
    return res.status(500).json({ success: false, error: "Failed to analyze ad with AI AdGuardian", details: error.message });
  }
}

function createAiRoutes() {
  const aiService = createAiService();
  const controller = createAiController(aiService);

  return {
    controller,
    aiService,
    enterpriseAutoPostRoutes,
  };
}

function createAiAliasRouter(routes, context = {}) {
  const router = express.Router();
  const requireAuth = getRequireAuth(context);

  const requireAuthIfPresent = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (typeof authHeader !== "string") {
      const closeFlowMvpEnabled = `${process.env.CLOSEFLOW_MVP || ""}`.trim().toLowerCase() === "true";
      if (!closeFlowMvpEnabled) {
        return res.status(401).json({
          success: false,
          message: "Authentication required"
        });
      }

      console.log("⚠️ MVP mode: CloseFlow bypass auth");
      return next();
    }

    return requireAuth(req, res, next);
  };

  router.get("/ai/features", requireAuth, attachResolvedPlan, (_req, res) => {
    return res.json({
      success: true,
      engine: "AI Sales Intelligence Engine (v2 ENTERPRISE FUSION SYSTEM)",
      plan: "enterprise",
      features: ENTERPRISE_AI_FEATURES,
      total: ENTERPRISE_AI_FEATURES.length,
    });
  });

  router.post(
    "/ai/copywriter",
    requireAuth,
    attachResolvedPlan,
    requireFeatureHealthy("revenue_copy"),
    createAiUsageGuard({ feature: "copywriter" }),
    handleCopywriter,
  );

  router.post(
    "/ai/negotiation",
    requireAuth,
    attachResolvedPlan,
    requireFeatureHealthy("closeflow"),
    createAiUsageGuard({ feature: "negotiation" }),
    handleNegotiation,
  );

  router.post(
    "/ai/closeflow",
    requireAuth,
    attachResolvedPlan,
    requireFeatureHealthy("closeflow"),
    createAiUsageGuard({ feature: "negotiation" }),
    handleNegotiation,
  );

  router.post(
    "/closeflow",
    requireAuthIfPresent,
    attachResolvedPlan,
    requireFeatureHealthy("closeflow"),
    createAiUsageGuard({ feature: "negotiation" }),
    handleCloseFlowMvp,
  );

  router.post(
    "/ai/ad-improvement",
    requireAuth,
    attachResolvedPlan,
    requireFeatureHealthy("ad_improvement"),
    createAiUsageGuard({ feature: "ad-improvement" }),
    handleAdImprovement,
  );

  router.post(
    "/ai/demandpulse",
    requireAuth,
    attachResolvedPlan,
    requireFeatureHealthy("demand_pulse"),
    createAiUsageGuard({ feature: "demandpulse" }),
    handleDemandPulse,
  );

  router.post(
    "/ai/guardian",
    requireAuth,
    attachResolvedPlan,
    requireFeatureHealthy("ad_guardian"),
    createAiUsageGuard({ feature: "guardian" }),
    (req, res) => handleGuardian(req, res, routes.aiService),
  );

  return router;
}

function registerAiModule(app, context = {}) {
  const routes = createAiRoutes();
  const aliasRouter = createAiAliasRouter(routes, context);
  const requireAuth = getRequireAuth(context);

  app.use("/ai/auto-post", requireAuth, attachResolvedPlan, routes.enterpriseAutoPostRoutes);
  app.use("/auto-post", requireAuth, attachResolvedPlan, routes.enterpriseAutoPostRoutes);
  app.use("/api", aliasRouter);
  app.use("/", aliasRouter);

  void initializeAiHealthState().catch((error) => {
    console.warn(`[AI Health] Startup initialization failed: ${error.message}`);
  });

  return {
    ...routes,
    aliasRouter,
  };
}

module.exports = {
  createAiRoutes,
  registerAiModule,
};
