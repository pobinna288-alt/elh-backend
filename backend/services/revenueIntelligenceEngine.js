const crypto = require("crypto");
const { fetchMarketIntelligence } = require("./marketIntelligenceService");
const { resolveBudgetContext } = require("../config/enterpriseBudgetConfig");

const MARKET_INTERNAL_AUTH_SECRET = process.env.MARKET_INTERNAL_AUTH_SECRET || "";

function cleanText(value, fallback = "") {
  const normalized = `${value ?? fallback}`.replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function numberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function formatMoney(value) {
  const num = numberOrNull(value);
  if (num === null) {
    return "N/A";
  }

  return `$${Math.round(num)}`;
}

function parseInputPrice(input = {}) {
  const candidates = [
    input.seller_asking_price,
    input.sellerAskingPrice,
    input.asking_price,
    input.askingPrice,
    input.price,
    input.seller_price,
    input.sellerPrice,
  ];

  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number.parseFloat(value.replace(/[^\d.-]/g, ""));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function formatRecommendationPrice(value) {
  const numeric = numberOrNull(value);
  if (numeric === null) {
    return "0";
  }

  const rounded = Math.round(numeric * 10) / 10;
  if (Number.isInteger(rounded)) {
    return `${rounded}`;
  }

  return rounded.toFixed(1);
}

function demandAdjustmentFactor(demandScore) {
  const score = clamp(Math.round(numberOrNull(demandScore) ?? 50));

  if (score > 70) {
    // Strong demand supports a modest premium.
    return 1.15;
  }

  if (score < 40) {
    // Weak demand benefits from a faster-sale discount.
    return 0.85;
  }

  return 1;
}

function clampPositive(value, fallback) {
  const numeric = numberOrNull(value);
  if (numeric === null || numeric <= 0) {
    return fallback;
  }
  return numeric;
}

function pickTrendDirection(direction) {
  const normalized = `${direction || "stable"}`.toLowerCase();
  if (["rising", "stable", "declining"].includes(normalized)) {
    return normalized;
  }
  return "stable";
}

function buildMarketJustification(market) {
  const score = clamp(Math.round(numberOrNull(market?.demandScore) ?? 50));
  const direction = pickTrendDirection(market?.trendDirection);
  return `Google Trends demand ${score}/100 with ${direction} momentum.`;
}

function resolveRequestCycleId(input = {}, runtime = {}) {
  void input;
  return cleanText(
    runtime.requestCycleId,
    "",
  );
}

function resolveRuntimeBudgetContext(input = {}, runtime = {}) {
  const runtimeBudget = runtime?.budgetContext || {};
  return resolveBudgetContext({
    budget: runtimeBudget.budget_value ?? input.budget ?? input.annual_budget ?? input.estimated_budget,
    budget_min: runtimeBudget.budget_min ?? input.budget_min,
    budget_max: runtimeBudget.budget_max ?? input.budget_max,
    budget_tier: runtimeBudget.budget_tier ?? input.budget_tier ?? input.tier,
    budget_range: runtimeBudget.budget_label ?? input.budget_range,
  });
}

function isProMode(runtime = {}) {
  return `${runtime?.subscriptionLevel || ""}`.toLowerCase() === "pro";
}

function isStarterMode(runtime = {}) {
  const normalized = `${runtime?.subscriptionLevel || ""}`.toLowerCase();
  return normalized === "starter" || normalized === "premium";
}

function buildInternalMarketAuth(feature, requestCycleId, subscriptionLevel) {
  const timestamp = `${Date.now()}`;
  const payload = `${feature}|${requestCycleId || "none"}|${subscriptionLevel || "unknown"}|${timestamp}`;
  const signature = MARKET_INTERNAL_AUTH_SECRET
    ? crypto.createHmac("sha256", MARKET_INTERNAL_AUTH_SECRET).update(payload).digest("hex")
    : "";

  return {
    service: "revenueIntelligenceEngine",
    feature,
    requestCycleId: requestCycleId || "none",
    subscriptionLevel: subscriptionLevel || "unknown",
    timestamp,
    signature,
  };
}

function getMarketFetchOptions(feature, input = {}, runtime = {}) {
  const requestCycleId = resolveRequestCycleId(input, runtime);
  const subscriptionLevel = runtime.subscriptionLevel;
  const marketAccessMode = `${runtime.marketAccessMode || "cache_only"}`.trim().toLowerCase();
  const proMode = isProMode(runtime);
  const starterMode = isStarterMode(runtime);
  const aiOnlyMode = runtime.marketAccessMode === "ai_only";
  const forceCacheOnly = starterMode || runtime.marketAccessMode === "cache_only";

  return {
    feature,
    requestCycleId,
    subscriptionLevel,
    maxLiveApiCalls: (aiOnlyMode || forceCacheOnly) ? 0 : (proMode ? 1 : Number.POSITIVE_INFINITY),
    forceCacheOnly: aiOnlyMode || forceCacheOnly,
    marketAccessMode,
    allowedSources: starterMode ? ["google_trends"] : undefined,
    internalAuth: buildInternalMarketAuth(feature, requestCycleId, subscriptionLevel),
  };
}

function marketCallsConsumed(marketSignals = {}) {
  const used = Number(marketSignals?.execution?.liveApiCallsUsed);
  if (!Number.isFinite(used)) {
    return 0;
  }

  return Math.max(0, Math.min(1, Math.floor(used)));
}

function buildBudgetOutputFields(context = {}) {
  return {
    budget_min: context.budget_min,
    budget_max: context.budget_max,
    budget_tier: context.budget_tier,
  };
}

function isVipMode(budgetContext = {}, runtime = {}) {
  // SECURITY FIX: Pro tier CANNOT access VIP features, even if injected in budget context
  if (isProMode(runtime)) {
    return false;
  }

  const tier = `${budgetContext?.budget_tier || ""}`.toLowerCase();
  const minBudget = numberOrNull(budgetContext?.budget_min);
  return tier === "vip" || (Number.isFinite(minBudget) && minBudget >= 300000);
}

function getEffectiveBudgetTier(budgetContext = {}, runtime = {}) {
  // SECURITY FIX: Pro tier CANNOT be VIP, even if budget context claims VIP
  return isVipMode(budgetContext, runtime) ? "vip" : `${budgetContext?.budget_tier || "enterprise"}`;
}

function resolveDataSourceStrength(marketSignals = {}) {
  const coverage = Number(marketSignals?.aggregate?.apiCoverage);
  if (Number.isFinite(coverage) && coverage >= 2) {
    return "high";
  }
  return "medium";
}

function buildVipMetaFields({
  budgetContext,
  marketSignals,
  confidence,
  pricePrecision,
  runtime = {},
}) {
  const vipMode = isVipMode(budgetContext, runtime);
  const normalizedConfidence = clampPositive(numberOrNull(confidence), vipMode ? 0.86 : 0.72);

  return {
    budget_tier: getEffectiveBudgetTier(budgetContext, runtime),
    vip_mode: vipMode,
    confidence: Number(normalizedConfidence.toFixed(4)),
    data_source_strength: resolveDataSourceStrength(marketSignals),
    price_precision: vipMode ? "tight" : (pricePrecision || "standard"),
  };
}

function buildVipCloseFlowRange(market = {}, sellerAskingPrice = null) {
  const ebayAnchor = clampPositive(numberOrNull(market?.ebayAveragePrice), null);
  const amazonValidation = clampPositive(numberOrNull(market?.amazonAveragePrice), null);
  const fallbackAnchor = clampPositive(numberOrNull(sellerAskingPrice), 100);

  let baseAnchor = ebayAnchor || amazonValidation || fallbackAnchor;

  if (Number.isFinite(baseAnchor) && Number.isFinite(amazonValidation)) {
    const deltaRatio = Math.abs(baseAnchor - amazonValidation) / Math.max(amazonValidation, 1);
    if (deltaRatio > 0.12) {
      // Keep eBay as primary anchor, but pull 30% toward Amazon for validation stability.
      baseAnchor = (baseAnchor * 0.7) + (amazonValidation * 0.3);
    }
  }

  const demandMultiplier = clampPositive(numberOrNull(market?.demandFactor), 1);
  const fair = baseAnchor * demandMultiplier;

  return {
    low: fair * 0.975,
    fair,
    high: fair * 1.025,
  };
}

function applyCloseFlowTierPricing(range, budgetContext) {
  const tier = `${budgetContext?.budget_tier || "enterprise"}`;
  const baseFair = clampPositive(numberOrNull(range?.fair), 100);

  let fairMultiplier = 1;
  let rangeWidth = 0.08;

  if (tier === "enterprise_pro") {
    fairMultiplier = 1.04;
    rangeWidth = 0.07;
  }

  if (tier === "vip") {
    fairMultiplier = 1.08;
    rangeWidth = 0.04;
  }

  const fair = baseFair * fairMultiplier;
  return {
    low: fair * (1 - rangeWidth),
    fair,
    high: fair * (1 + rangeWidth),
  };
}

function resolveAdGuardianRiskLevel({ demandScore, successScore, budgetTier }) {
  const tier = `${budgetTier || "enterprise"}`;
  const tierTargetScore = tier === "vip" ? 90 : tier === "enterprise_pro" ? 80 : 70;
  const gap = tierTargetScore - successScore;

  if (demandScore < 45 || gap > 15) {
    return "high";
  }

  if (demandScore < 65 || gap > 5) {
    return "medium";
  }

  return "low";
}

function buildTrendToneHint(market) {
  const score = clamp(Math.round(numberOrNull(market?.demandScore) ?? 50));
  const direction = pickTrendDirection(market?.trendDirection);

  if (score >= 70 || direction === "rising") {
    return "Use urgency, scarcity, and action-heavy language.";
  }

  if (score < 40 || direction === "declining") {
    return "Use trust-building, education, and reassurance-focused messaging.";
  }

  return "Use balanced confidence with clear value and low-friction CTA.";
}

function inferBuyerIntent(input = {}) {
  const message = cleanText(input.buyer_message || input.message || input.conversation || "").toLowerCase();
  if (!message) {
    return "warm";
  }

  const hotSignals = ["ready", "buy now", "pickup", "payment", "today", "available now"];
  const coldSignals = ["maybe", "later", "not sure", "too expensive", "think about", "discount?"];

  if (hotSignals.some((signal) => message.includes(signal))) {
    return "hot";
  }

  if (coldSignals.some((signal) => message.includes(signal))) {
    return "cold";
  }

  return "warm";
}

function buildEstimatedRange(askingPrice, demandScore) {
  const anchor = clampPositive(askingPrice, 100);
  const demandFactor = demandAdjustmentFactor(demandScore);
  const fair = anchor * demandFactor;

  return {
    low: fair * 0.92,
    fair,
    high: fair * 1.1,
  };
}

async function buildAiEstimatedCloseflowRange({
  aiTools,
  buyerIntent,
  strategy,
  behaviorInsight,
  sellerAskingPrice,
  demandScore,
}) {
  const fallback = buildEstimatedRange(sellerAskingPrice, demandScore);

  if (!aiTools?.generateJsonWithAi) {
    return {
      estimatedRange: fallback,
      optimizedReply: `Based on current buyer intent and product context, a fair close is around ${formatMoney(fallback.fair)} with a working range of ${formatMoney(fallback.low)} to ${formatMoney(fallback.high)}.`,
      buyerBehaviorInsight: behaviorInsight,
      strategy,
    };
  }

  const aiEstimate = await aiTools.generateJsonWithAi({
    systemPrompt: "You are an elite negotiation strategist. Return JSON only with low, fair, high, optimized_reply_message.",
    userPrompt: [
      `Buyer intent: ${buyerIntent}`,
      `Seller asking price: ${formatMoney(sellerAskingPrice)}`,
      `Demand score proxy: ${Math.round(demandScore)}`,
      `Strategy: ${strategy}`,
      "Rules: one final pricing estimate only. No alternatives. No reasoning chain.",
    ].join("\n"),
    fallbackData: {
      low: fallback.low,
      fair: fallback.fair,
      high: fallback.high,
      optimized_reply_message: `A realistic close is near ${formatMoney(fallback.fair)}; we can close quickly within ${formatMoney(fallback.low)} to ${formatMoney(fallback.high)} depending on confirmation speed.`,
    },
    temperature: 0.45,
  });

  const safeRange = {
    low: numberOrNull(aiEstimate?.low) ?? fallback.low,
    fair: numberOrNull(aiEstimate?.fair) ?? fallback.fair,
    high: numberOrNull(aiEstimate?.high) ?? fallback.high,
  };

  return {
    estimatedRange: safeRange,
    optimizedReply: cleanText(aiEstimate?.optimized_reply_message, `A realistic close is near ${formatMoney(safeRange.fair)} with a working range of ${formatMoney(safeRange.low)} to ${formatMoney(safeRange.high)}.`),
    buyerBehaviorInsight: behaviorInsight,
    strategy,
  };
}

async function buildSmartCopywriterDecision(input, aiTools = {}, runtime = {}) {
  const marketSignals = await fetchMarketIntelligence(input, getMarketFetchOptions("revenue_copy", input, runtime));
  const market = marketSignals.aggregate;
  const starterMode = isStarterMode(runtime);

  const product = cleanText(input.product || input.product_name || input.title, "Your product");
  const details = cleanText(input.description || input.details || input.prompt, "");
  const audience = cleanText(input.audience || input.target_audience, "buyers ready to act");
  const toneHint = buildTrendToneHint(market);

  const fallbackCopy = `${product} built for ${audience}. ${details || "Designed to deliver immediate value with confidence."} ${toneHint} Message now to secure this offer today.`;

  const optimizedAdCopy = aiTools.generateTextWithAi
    ? await aiTools.generateTextWithAi({
        model: aiTools.latestModel,
        systemPrompt: "You are an elite conversion copywriter. Return one final ad copy only.",
        userPrompt: [
          `Product: ${product}`,
          `Audience: ${audience}`,
          `Details: ${details || "N/A"}`,
          `Cached demand signal: ${buildMarketJustification(market)}`,
          `Tone optimization: ${toneHint}`,
          "Rules: one optimized ad copy only. No reasoning. No alternatives.",
        ].join("\n"),
        fallbackText: fallbackCopy,
        temperature: starterMode ? 0.3 : 0.8,
      })
    : fallbackCopy;

  return {
    optimized_ad_copy: cleanText(optimizedAdCopy, fallbackCopy),
    market_api_calls_consumed: marketCallsConsumed(marketSignals),
  };
}

async function buildAdGuardianDecision(input, aiTools = {}, runtime = {}) {
  const marketSignals = await fetchMarketIntelligence(input, getMarketFetchOptions("ad_guardian", input, runtime));
  const market = marketSignals.aggregate;
  const budgetContext = resolveRuntimeBudgetContext(input, runtime);
  const proMode = isProMode(runtime);
  const vipMode = isVipMode(budgetContext, runtime);

  if (proMode) {
    const basicHeadline = cleanText(input.product_name || input.product || input.title, "Offer");
    const basicBody = cleanText(input.product_description || input.description, "Clear value proposition with a direct call to action.");
    const hasCtaSignal = /\b(buy|shop|order|message|call|book|try)\b/i.test(`${basicBody} ${input.cta || ""}`);

    return {
      ...buildBudgetOutputFields(budgetContext),
      vip_mode: false,
      confidence: 0.62,
      data_source_strength: resolveDataSourceStrength(marketSignals),
      price_precision: "wide",
      success_score: null,
      risk_level: hasCtaSignal ? "medium" : "high",
      recommendation_policy: "basic_validation_only",
      warning_flag: null,
      improvement_suggestions: [
        "Add one explicit action CTA in the final sentence.",
        "Lead with one clear user benefit before feature details.",
      ],
      final_optimized_ad_version: {
        headline: basicHeadline,
        body: basicBody,
        cta: hasCtaSignal ? cleanText(input.cta, "Message now to get started.") : "Message now to get started.",
      },
      market_api_calls_consumed: marketCallsConsumed(marketSignals),
    };
  }

  const creativePrompt = [
    `Product: ${cleanText(input.product_name || input.product || input.title, "Product")}`,
    `Description: ${cleanText(input.product_description || input.description, "")}`,
    `Audience: ${cleanText(input.target_audience || input.audience, "general buyers")}`,
    "Generate one optimized ad version with clear value, urgency, and CTA. No alternatives.",
  ].join("\n");

  const fallbackAd = {
    headline: cleanText(input.product_name || input.title, "Optimized Market-Ready Offer"),
    body: cleanText(input.product_description || input.description, "Built for real buyer demand with competitive pricing and immediate value."),
    cta: "Message now to secure this offer today.",
  };

  const aiCreative = aiTools.generateJsonWithAi
    ? await aiTools.generateJsonWithAi({
        systemPrompt: "You are the Creative Brain in a revenue intelligence engine. Return JSON only with headline, body, cta.",
        userPrompt: creativePrompt,
        fallbackData: fallbackAd,
        temperature: 0.6,
      })
    : fallbackAd;

  const strategicStrength = clamp(Math.round((market.demandScore * 0.7) + ((market.trendDirection === "rising" ? 85 : market.trendDirection === "declining" ? 50 : 68) * 0.3)));
  const aiStrength = clamp(Math.round((cleanText(aiCreative.headline).length > 16 ? 78 : 62) + (cleanText(aiCreative.cta).toLowerCase().includes("now") ? 8 : 0)));
  const tierPerformanceBoost = vipMode ? 8 : budgetContext.budget_tier === "enterprise_pro" ? 4 : 0;
  const rawSuccessScore = clamp(Math.round((market.demandScore * 0.6) + (strategicStrength * 0.2) + (aiStrength * 0.2) + tierPerformanceBoost));
  const successScore = vipMode ? clamp(rawSuccessScore - 8) : rawSuccessScore;

  const suggestions = [
    "Tighten the first line to lead with strongest buyer outcome.",
    market.trendDirection === "rising"
      ? "Add urgency language tied to current demand momentum."
      : "Strengthen trust proof and product reassurance for hesitant buyers.",
    "Use one direct CTA that asks for immediate next action.",
  ];

  if (vipMode) {
    suggestions[0] = "Lead with quantified proof and premium positioning in the first sentence.";
    suggestions[2] = "Use a decisive CTA with explicit conversion timeline and premium trust signal.";
  }

  const normalizedRiskLevel = resolveAdGuardianRiskLevel({
    demandScore: market.demandScore,
    successScore,
    budgetTier: getEffectiveBudgetTier(budgetContext, runtime),
  });

  const confidence = vipMode
    ? (normalizedRiskLevel === "low" ? 0.93 : normalizedRiskLevel === "medium" ? 0.87 : 0.85)
    : (normalizedRiskLevel === "low" ? 0.84 : normalizedRiskLevel === "medium" ? 0.76 : 0.7);

  return {
    ...buildBudgetOutputFields(budgetContext),
    ...buildVipMetaFields({
      budgetContext,
      marketSignals,
      confidence,
      pricePrecision: vipMode ? "tight" : "standard",
      runtime,
    }),
    success_score: successScore,
    risk_level: normalizedRiskLevel,
    recommendation_policy: vipMode ? "only_high_confidence_ads_recommended" : "standard_confidence_policy",
    warning_flag: marketSignals.warnings?.includes("ad_guardian_stale_cache_used") ? "stale_market_cache_used" : null,
    improvement_suggestions: suggestions.slice(0, 3),
    final_optimized_ad_version: {
      headline: cleanText(aiCreative.headline, fallbackAd.headline),
      body: cleanText(aiCreative.body, fallbackAd.body),
      cta: cleanText(aiCreative.cta, fallbackAd.cta),
    },
    market_api_calls_consumed: marketCallsConsumed(marketSignals),
  };
}

async function buildCloseFlowDecision(input, aiTools = {}, runtime = {}) {
  const budgetContext = resolveRuntimeBudgetContext(input, runtime);
  const proMode = isProMode(runtime);
  const starterMode = isStarterMode(runtime);
  const vipMode = isVipMode(budgetContext, runtime);
  const marketSignals = await fetchMarketIntelligence(input, getMarketFetchOptions("closeflow", input, runtime));
  const market = marketSignals.aggregate;

  const sellerAskingPrice = parseInputPrice(input);
  const buyerIntent = inferBuyerIntent(input);
  const marketAnchoredPrice = numberOrNull(market.fairPrice) ?? sellerAskingPrice;
  const estimatedRange = buildEstimatedRange(marketAnchoredPrice, market.demandScore);
  const tierAdjustedRange = vipMode
    ? buildVipCloseFlowRange(market, sellerAskingPrice)
    : applyCloseFlowTierPricing(estimatedRange, budgetContext);

  if (proMode) {
    const anchor = clampPositive(numberOrNull(market.fairPrice) ?? sellerAskingPrice, 100);
    const wideRange = {
      low: anchor * 0.85,
      fair: anchor,
      high: anchor * 1.18,
    };

    return {
      ...buildBudgetOutputFields(budgetContext),
      vip_mode: false,
      confidence: 0.62,
      data_source_strength: resolveDataSourceStrength(marketSignals),
      price_precision: "wide",
      recommended_price: Number(formatRecommendationPrice(wideRange.fair)),
      price_range: {
        low: Number(formatRecommendationPrice(wideRange.low)),
        fair: Number(formatRecommendationPrice(wideRange.fair)),
        high: Number(formatRecommendationPrice(wideRange.high)),
      },
      market_confidence: "low",
      data_source: marketCallsConsumed(marketSignals) > 0 ? "single_market_fallback" : "ai_estimation",
      market_api_calls_consumed: marketCallsConsumed(marketSignals),
    };
  }

  const tierStrategyPrefix = budgetContext.budget_tier === "vip"
    ? "Use premium pricing confidence and keep negotiation range tight."
    : budgetContext.budget_tier === "enterprise_pro"
      ? "Apply aggressive optimization with strong value anchoring."
      : "Use moderate pricing with balanced confidence.";

  const strategy = buyerIntent === "hot"
    ? `${tierStrategyPrefix} Close confidently with firm value framing and immediate next-step confirmation.`
    : buyerIntent === "cold"
      ? `${tierStrategyPrefix} Use trust-first framing and flexible terms to reduce buyer hesitation.`
      : `${tierStrategyPrefix} Use balanced value anchoring with a clear close timeline.`;

  const behaviorInsight = buyerIntent === "hot"
    ? "Buyer intent is hot and responds well to direct close language."
    : buyerIntent === "cold"
      ? "Buyer intent is cold and needs reassurance before price commitment."
      : "Buyer intent is warm and likely to convert with clear value anchoring.";

  const deterministicPath = `${marketSignals?.execution?.closeflowPath || "ai_estimation"}`;
  const sourceAvailability = [
    marketSignals?.sources?.googleTrends?.available,
    marketSignals?.sources?.ebay?.available,
    marketSignals?.sources?.amazon?.available,
  ];
  const allMarketSourcesFailed = sourceAvailability.every((isAvailable) => !isAvailable);
  const shouldUseAiOnlyPricing = vipMode ? allMarketSourcesFailed : deterministicPath === "ai_estimation";
  const selectedPipeline = proMode
    ? "pro_basic"
    : starterMode && shouldUseAiOnlyPricing
      ? "starter_ai_only"
      : shouldUseAiOnlyPricing
        ? "ai_only"
        : "market";

  if (selectedPipeline === "starter_ai_only") {
    const aiEstimated = await buildAiEstimatedCloseflowRange({
      aiTools,
      buyerIntent,
      strategy,
      behaviorInsight,
      sellerAskingPrice,
      demandScore: market.demandScore,
    });

    const broadRange = {
      low: aiEstimated.estimatedRange.fair * 0.9,
      fair: aiEstimated.estimatedRange.fair,
      high: aiEstimated.estimatedRange.fair * 1.15,
    };

    return {
      recommended_price: Number(formatRecommendationPrice(broadRange.fair)),
      price_range: {
        low: Number(formatRecommendationPrice(broadRange.low)),
        fair: Number(formatRecommendationPrice(broadRange.fair)),
        high: Number(formatRecommendationPrice(broadRange.high)),
      },
      market_confidence: "low",
      data_source: "ai_estimation",
      market_api_calls_consumed: marketCallsConsumed(marketSignals),
    };
  }

  if (selectedPipeline === "ai_only") {
    const aiEstimated = await buildAiEstimatedCloseflowRange({
      aiTools,
      buyerIntent,
      strategy,
      behaviorInsight,
      sellerAskingPrice,
      demandScore: market.demandScore,
    });

    const tierAdjustedAiRange = vipMode
      ? {
          low: aiEstimated.estimatedRange.fair * 0.975,
          fair: aiEstimated.estimatedRange.fair,
          high: aiEstimated.estimatedRange.fair * 1.025,
        }
      : applyCloseFlowTierPricing(aiEstimated.estimatedRange, budgetContext);
    const confidence = vipMode ? 0.86 : 0.72;

    return {
      ...buildBudgetOutputFields(budgetContext),
      ...buildVipMetaFields({
        budgetContext,
        marketSignals,
        confidence,
        pricePrecision: vipMode ? "tight" : "standard",
        runtime,
      }),
      recommended_price: Number(formatRecommendationPrice(tierAdjustedAiRange.fair)),
      price_range: {
        low: Number(formatRecommendationPrice(tierAdjustedAiRange.low)),
        fair: Number(formatRecommendationPrice(tierAdjustedAiRange.fair)),
        high: Number(formatRecommendationPrice(tierAdjustedAiRange.high)),
      },
      market_confidence: vipMode ? "high" : "low",
      data_source: "ai_estimation",
      market_api_calls_consumed: marketCallsConsumed(marketSignals),
    };
  }

  const fairPriceValue = Number(formatRecommendationPrice(tierAdjustedRange.fair));
  const lowPriceValue = Number(formatRecommendationPrice(tierAdjustedRange.low));
  const highPriceValue = Number(formatRecommendationPrice(tierAdjustedRange.high));

  const baseConfidence = deterministicPath === "cache" ? "medium" : "high";
  const confidence = vipMode ? "high" : baseConfidence;
  const numericConfidence = vipMode
    ? (resolveDataSourceStrength(marketSignals) === "high" ? 0.94 : 0.88)
    : (baseConfidence === "high" ? 0.84 : 0.74);

  return {
    ...buildBudgetOutputFields(budgetContext),
    ...buildVipMetaFields({
      budgetContext,
      marketSignals,
      confidence: numericConfidence,
      pricePrecision: vipMode ? "tight" : "standard",
    }),
    recommended_price: fairPriceValue,
    price_range: {
      low: lowPriceValue,
      fair: fairPriceValue,
      high: highPriceValue,
    },
    market_confidence: confidence,
    data_source: deterministicPath === "live_api" ? "live_api" : "cache",
    market_api_calls_consumed: marketCallsConsumed(marketSignals),
  };
}

async function buildAdImprovementReportDecision(input, aiTools = {}, runtime = {}) {
  const marketSignals = await fetchMarketIntelligence(input, getMarketFetchOptions("ad_guardian", input, runtime));
  const market = marketSignals.aggregate;
  const proMode = isProMode(runtime);

  const adText = cleanText(input.ad_content || input.description || input.copy || input.prompt, "");
  const product = cleanText(input.product || input.product_name || input.title, "Your offer");

  const fallbackImproved = {
    headline: `${product}: Clear Value, Fast Action`,
    body: `${adText || "Premium offer built to deliver direct buyer value."} ${buildTrendToneHint(market)}`,
    cta: "Message now to claim this offer today.",
  };

  const improved = aiTools.generateJsonWithAi
    ? await aiTools.generateJsonWithAi({
        systemPrompt: "You are an elite ad optimization strategist. Return JSON with headline, body, cta only.",
        userPrompt: [
          `Current ad: ${adText || "N/A"}`,
          `Product: ${product}`,
          `Demand signal: ${buildMarketJustification(market)}`,
          `Optimization direction: ${buildTrendToneHint(market)}`,
          "Rules: improve clarity, persuasion, emotional impact, and trend alignment. One final output only.",
        ].join("\n"),
        fallbackData: fallbackImproved,
        temperature: 0.6,
      })
    : fallbackImproved;

  if (proMode) {
    return {
      performance_score: null,
      improvement_actions: [
        "Use one strong value statement in the first line.",
        "Add a single direct CTA for immediate action.",
      ],
      weakness_summary: "Basic optimization mode for Pro tier.",
      improved_final_ad_version: {
        headline: cleanText(improved.headline, fallbackImproved.headline),
        body: cleanText(improved.body, fallbackImproved.body),
        cta: cleanText(improved.cta, fallbackImproved.cta),
      },
      market_api_calls_consumed: marketCallsConsumed(marketSignals),
    };
  }

  const clarityScore = adText.length > 80 ? 72 : 60;
  const persuasionBoost = market.demandScore >= 70 ? 16 : market.demandScore < 40 ? 8 : 12;
  const performanceScore = clamp(clarityScore + persuasionBoost);

  return {
    performance_score: performanceScore,
    improvement_actions: [
      "Lead with the strongest buyer value in the first sentence.",
      market.demandScore >= 70
        ? "Inject urgency language to capitalize on rising demand."
        : "Strengthen trust and proof statements before the CTA.",
      "Use one direct CTA focused on immediate next action.",
    ].slice(0, 5),
    weakness_summary: "Current copy under-leverages conversion triggers and can present value more sharply.",
    improved_final_ad_version: {
      headline: cleanText(improved.headline, fallbackImproved.headline),
      body: cleanText(improved.body, fallbackImproved.body),
      cta: cleanText(improved.cta, fallbackImproved.cta),
    },
    market_api_calls_consumed: marketCallsConsumed(marketSignals),
  };
}

async function buildDemandPulseDecision(input, _aiTools = {}, runtime = {}) {
  const marketSignals = await fetchMarketIntelligence(input, getMarketFetchOptions("demand_pulse", input, runtime));
  const market = marketSignals.aggregate;
  const budgetContext = resolveRuntimeBudgetContext(input, runtime);
  const proMode = isProMode(runtime);
  const vipMode = isVipMode(budgetContext, runtime);

  const trendDirection = pickTrendDirection(market.trendDirection);
  const demandScore = clamp(Math.round(market.demandScore));
  const vipSignalBase = vipMode ? Math.max(demandScore, 55) : demandScore;
  const demandScorePrecise = Number((((vipSignalBase * 0.7) + (clamp(Math.round(market.interestIntensity || vipSignalBase)) * 0.3))).toFixed(1));

  const audienceInsight = trendDirection === "rising"
    ? "High-intent buyers are actively comparing options; speed and social proof will convert best."
    : trendDirection === "declining"
      ? "Price-sensitive buyers dominate; bundle value and urgency are required to sustain conversion."
      : "Demand is steady; consistent messaging and clear differentiation will drive predictable sales.";

  const vipAudienceInsight = demandScorePrecise >= 75
    ? "High-value demand cluster is strong; prioritize premium buyers with immediate close readiness."
    : "High-value segment is selective; concentrate spend on strongest trend-aligned buyer cohorts only.";

  const positioning = market.competitionLevel === "high"
    ? "Position as differentiated value with stronger proof, faster fulfillment, and trust signals."
    : market.competitionLevel === "medium"
      ? "Position as reliable mid-market value with a clear benefits-first headline."
      : "Position as premium-trust offer with confident pricing and convenience-focused messaging.";

  const targetingBreadth = budgetContext.budget_tier === "vip"
    ? { market_scope: "global", recommended_regions: 10 }
    : budgetContext.budget_tier === "enterprise_pro"
      ? { market_scope: "multi-region", recommended_regions: 6 }
      : { market_scope: "focused", recommended_regions: 3 };

  const buyIntentStrength = demandScorePrecise >= 80
    ? "very_high"
    : demandScorePrecise >= 65
      ? "high"
      : demandScorePrecise >= 55
        ? "medium"
        : "low";

  const confidence = vipMode
    ? (resolveDataSourceStrength(marketSignals) === "high" ? 0.9 : 0.86)
    : (resolveDataSourceStrength(marketSignals) === "high" ? 0.82 : 0.74);

  if (proMode) {
    return {
      ...buildBudgetOutputFields(budgetContext),
      vip_mode: false,
      confidence: 0.64,
      data_source_strength: resolveDataSourceStrength(marketSignals),
      price_precision: "wide",
      demand_score: demandScore,
      trend_direction: trendDirection,
      best_selling_timing: cleanText(market.bestTiming, "Next 7-14 days"),
      target_audience_insight: trendDirection === "rising"
        ? "Demand is rising. Keep messaging simple and action-focused."
        : trendDirection === "declining"
          ? "Demand is soft. Use value framing and concise offers."
          : "Demand is stable. Use consistent messaging and clear CTA.",
      suggested_product_positioning: "Basic trend-led positioning",
      demand_targeting: { market_scope: "single_source", recommended_regions: 1 },
      market_api_status: {
        active_sources: market.apiCoverage,
        total_sources: 3,
      },
      market_api_calls_consumed: marketCallsConsumed(marketSignals),
    };
  }

  return {
    ...buildBudgetOutputFields(budgetContext),
    ...buildVipMetaFields({
      budgetContext,
      marketSignals,
      confidence,
      pricePrecision: vipMode ? "tight" : "standard",
      runtime,
    }),
    demand_score: demandScore,
    precise_demand_score: demandScorePrecise,
    trend_direction: trendDirection,
    best_selling_timing: cleanText(market.bestTiming, "Next 7-14 days"),
    target_audience_insight: vipMode ? vipAudienceInsight : audienceInsight,
    buy_intent_strength: buyIntentStrength,
    high_value_signal_filter: vipMode ? "enabled" : "standard",
    suggested_product_positioning: positioning,
    demand_targeting: targetingBreadth,
    market_api_status: {
      active_sources: market.apiCoverage,
      total_sources: 3,
    },
    market_api_calls_consumed: marketCallsConsumed(marketSignals),
  };
}

module.exports = {
  buildSmartCopywriterDecision,
  buildAdGuardianDecision,
  buildAdImprovementReportDecision,
  buildCloseFlowDecision,
  buildDemandPulseDecision,
};
