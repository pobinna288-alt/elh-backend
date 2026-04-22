/**
 * AI Guardian Core Engine
 * Campaign Intelligence System for AI-Powered Advertising Platform
 * 
 * SYSTEM ROLE:
 * You are AI Guardian Core Engine.
 * You power the campaign intelligence system for an AI-powered advertising platform.
 * Your responsibility is to analyze product campaign inputs and generate a structured campaign intelligence report.
 * You must strictly enforce feature access based on subscription tiers.
 * You must never expose features from higher tiers to lower tiers.
 * All outputs must be deterministic, structured, and safe for frontend rendering.
 * 
 * GLOBAL ANALYSIS TASKS:
 *   1. Detect product category
 *   2. Evaluate market demand
 *   3. Analyze audience alignment
 *   4. Evaluate competition intensity
 *   5. Estimate campaign risk
 *   6. Identify best performing markets
 *   7. Evaluate price competitiveness (if allowed by tier)
 *   8. Generate optimization insights
 *   9. Produce safety score and confidence score
 * 
 * TIER FEATURE GATING:
 * ┌────────────────────────────────┬───────────┬───────────┬──────────────────────────────┐
 * │ Feature                        │   PRO     │   HOT     │       ENTERPRISE             │
 * ├────────────────────────────────┼───────────┼───────────┼──────────────────────────────┤
 * │ AI Models                      │ Primary   │   Best    │ Ensemble (3 models)          │
 * │ Safety Score                   │    ✓      │    ✓      │      ✓                       │
 * │ Risk Level                     │    ✓      │    ✓      │      ✓                       │
 * │ Demand Analysis                │    ✓      │    ✓      │      ✓                       │
 * │ Audience Match Score           │    ✓      │    ✓      │      ✓                       │
 * │ Competition Analysis           │    ✓      │    ✓      │      ✓                       │
 * │ Top Target Markets             │    2      │    4      │      6                       │
 * │ Actionable Insights            │    3      │    6      │     10                       │
 * │ Confidence Score               │   62      │   78      │     91                       │
 * │ Price Intelligence             │    ❌     │    ✓      │      ✓                       │
 * │ Full Price Intelligence        │    ❌     │    ❌     │      ✓                       │
 * │ Auto Post Generator            │    ❌     │    ❌     │      ✓                       │
 * │ Enterprise Strategies          │    ❌     │    ❌     │      ✓                       │
 * └────────────────────────────────┴───────────┴───────────┴──────────────────────────────┘
 * 
 * SCORING LOGIC:
 *   Safety Score (0-100): Derived from demand_score, audience_match, competition_level, price_competitiveness
 *   Risk Level Mapping:
 *     0-39   → Critical
 *     40-59  → High
 *     60-79  → Moderate
 *     80-100 → Low
 *   Demand Analysis: High | Moderate | Low
 *   Audience Match Score: 0-100
 *   Competition Analysis: Low | Medium | High
 */

// ─── AI Model Initialization ────────────────────────────────────────────────

// OpenAI GPT-4o (used by all tiers)
let openaiClient = null;
try {
  if (process.env.OPENAI_API_KEY) {
    const { OpenAI } = require("openai");
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
} catch (err) {
  console.warn("[AI Guardian] OpenAI initialization skipped:", err.message);
}

// ─── Required Campaign Inputs Schema ────────────────────────────────────────

/**
 * INPUT OBJECT SCHEMA
 * {
 *   "tier": "pro | hot | enterprise",
 *   "product_name": "",
 *   "product_description": "",
 *   "product_price": "",
 *   "product_image": "",
 *   "target_country": "",
 *   "target_audience": "",
 *   "target_age_range": "",
 *   "ad_platform": ""
 * }
 */

const REQUIRED_INPUTS = [
  "tier",
  "product_name",
  "product_description",
  "product_price",
  "target_country",
  "target_audience",
  "ad_platform"
];

const OPTIONAL_INPUTS = [
  "product_image",
  "target_age_range"
];

// ─── Subscription Configuration ─────────────────────────────────────────────

const ALLOWED_SUBSCRIPTION_LEVELS = ["pro", "hot", "enterprise"];

/**
 * TIER FEATURE GATING
 * 
 * PRO TIER:
 *   - AI: Primary OpenAI reasoning model
 *   - confidence_score = 62
 *   - top_target_markets LIMIT: 2 countries
 *   - actionable_insights LIMIT: 3
 *   - NO price_intelligence
 *   - NO enterprise features
 * 
 * HOT TIER (includes Pro):
 *   - AI: Best OpenAI reasoning model
 *   - confidence_score = 78
 *   - price_intelligence (market_price_range, price_position, pricing_warning)
 *   - top_target_markets LIMIT: 4 countries
 *   - actionable_insights LIMIT: 6
 *   - NO enterprise optimizations
 * 
 * ENTERPRISE TIER (includes Hot):
 *   - AI: Ensemble reasoning from 3 most advanced AI models
 *   - confidence_score = 91
 *   - full_price_intelligence (market_price_range, price_position, conversion_risk_warning, optimal_price_recommendation)
 *   - top_target_markets LIMIT: 6 countries
 *   - actionable_insights LIMIT: 10
 *   - Enterprise strategies
 *   - Auto Post Generator (optimized_title, optimized_description, suggested_price, ad_hook, call_to_action)
 */

const SUBSCRIPTION_FEATURES = {
  pro: {
    // AI Model Configuration
    aiModel: "gpt-4o",
    useMultiModel: false,
    aiModelDescription: "Primary OpenAI reasoning model",
    
    // Fixed confidence score for Pro tier
    confidenceScore: 62,
    
    // Core features (all tiers)
    includeSafetyScore: true,
    includeRiskLevel: true,
    includeDemandAnalysis: true,
    includeAudienceMatchScore: true,
    includeCompetitionAnalysis: true,
    
    // Tier limits
    maxTopTargetMarkets: 2,
    maxActionableInsights: 3,
    
    // Price intelligence - NOT allowed for Pro
    includePriceIntelligence: false,
    includeFullPriceIntelligence: false,
    
    // Enterprise features - NOT allowed for Pro
    includeEnterpriseStrategies: false,
    includeAutoPostGenerator: false,
    
    tierName: "Pro",
    tierDescription: "Primary AI campaign analysis with essential features"
  },
  
  hot: {
    // AI Model Configuration
    aiModel: "gpt-4o",
    useMultiModel: false,
    aiModelDescription: "Best OpenAI reasoning model",
    
    // Fixed confidence score for Hot tier
    confidenceScore: 78,
    
    // Core features (all tiers)
    includeSafetyScore: true,
    includeRiskLevel: true,
    includeDemandAnalysis: true,
    includeAudienceMatchScore: true,
    includeCompetitionAnalysis: true,
    
    // Tier limits
    maxTopTargetMarkets: 4,
    maxActionableInsights: 6,
    
    // Price intelligence - allowed for Hot
    includePriceIntelligence: true,
    includeFullPriceIntelligence: false,
    
    // Enterprise features - NOT allowed for Hot
    includeEnterpriseStrategies: false,
    includeAutoPostGenerator: false,
    
    tierName: "Hot",
    tierDescription: "Advanced AI analysis with price intelligence"
  },
  
  enterprise: {
    // AI Model Configuration - OpenAI GPT-4o (all tiers use OpenAI)
    aiModel: "gpt-4o",
    useMultiModel: false,
    aiModelDescription: "Advanced OpenAI reasoning model with full enterprise features",
    
    // Fixed confidence score for Enterprise tier
    confidenceScore: 91,
    
    // Core features (all tiers)
    includeSafetyScore: true,
    includeRiskLevel: true,
    includeDemandAnalysis: true,
    includeAudienceMatchScore: true,
    includeCompetitionAnalysis: true,
    
    // Tier limits
    maxTopTargetMarkets: 6,
    maxActionableInsights: 10,
    
    // Price intelligence - full access for Enterprise
    includePriceIntelligence: true,
    includeFullPriceIntelligence: true,
    
    // Enterprise-exclusive features
    includeEnterpriseStrategies: true,
    includeAutoPostGenerator: true,
    
    // Enterprise strategies list
    enterpriseStrategies: [
      "dynamic_creative_optimization",
      "automated_budget_reallocation",
      "lookalike_audience_strategy",
      "campaign_budget_optimization",
      "creative_testing_strategy",
      "market_entry_priority",
      "conversion_funnel_optimization",
      "ad_spend_efficiency",
      "audience_expansion",
      "retention_targeting"
    ],
    
    tierName: "Enterprise",
    tierDescription: "Multi-model AI ensemble with full intelligence suite"
  }
};

// ─── Market Data ────────────────────────────────────────────────────────────

const GLOBAL_MARKETS = [
  { country: "United States", code: "US", demandMultiplier: 1.0, avgConversionRate: 3.2, marketSize: "very-large" },
  { country: "United Kingdom", code: "UK", demandMultiplier: 0.85, avgConversionRate: 2.9, marketSize: "large" },
  { country: "Canada", code: "CA", demandMultiplier: 0.75, avgConversionRate: 2.7, marketSize: "medium" },
  { country: "Germany", code: "DE", demandMultiplier: 0.8, avgConversionRate: 2.5, marketSize: "large" },
  { country: "Australia", code: "AU", demandMultiplier: 0.7, avgConversionRate: 2.8, marketSize: "medium" },
  { country: "France", code: "FR", demandMultiplier: 0.65, avgConversionRate: 2.3, marketSize: "medium" },
  { country: "Nigeria", code: "NG", demandMultiplier: 0.9, avgConversionRate: 4.1, marketSize: "emerging" },
  { country: "South Africa", code: "ZA", demandMultiplier: 0.6, avgConversionRate: 3.5, marketSize: "emerging" },
  { country: "India", code: "IN", demandMultiplier: 0.95, avgConversionRate: 3.8, marketSize: "very-large" },
  { country: "Brazil", code: "BR", demandMultiplier: 0.7, avgConversionRate: 3.0, marketSize: "large" }
];

const PRODUCT_CATEGORIES = {
  electronics: { demandLevel: "high", priceRange: [50, 2000], seasonality: "q4-peak", saturation: "high" },
  fashion: { demandLevel: "high", priceRange: [20, 500], seasonality: "year-round", saturation: "high" },
  home: { demandLevel: "moderate", priceRange: [30, 1000], seasonality: "spring-peak", saturation: "moderate" },
  beauty: { demandLevel: "high", priceRange: [15, 200], seasonality: "year-round", saturation: "high" },
  sports: { demandLevel: "moderate", priceRange: [25, 500], seasonality: "summer-peak", saturation: "moderate" },
  automotive: { demandLevel: "moderate", priceRange: [50, 5000], seasonality: "year-round", saturation: "low" },
  food: { demandLevel: "very-high", priceRange: [5, 100], seasonality: "holiday-peak", saturation: "high" },
  services: { demandLevel: "moderate", priceRange: [50, 1000], seasonality: "year-round", saturation: "moderate" },
  health: { demandLevel: "high", priceRange: [20, 300], seasonality: "new-year-peak", saturation: "moderate" },
  education: { demandLevel: "moderate", priceRange: [50, 500], seasonality: "fall-peak", saturation: "low" },
  other: { demandLevel: "moderate", priceRange: [10, 500], seasonality: "year-round", saturation: "moderate" }
};

// ─── Utility Functions ──────────────────────────────────────────────────────

/**
 * Validate required campaign inputs
 */
function validateCampaignInputs(campaignData) {
  const missing = [];
  const provided = [];
  
  for (const field of REQUIRED_INPUTS) {
    if (!campaignData[field] || (typeof campaignData[field] === "string" && !campaignData[field].trim())) {
      missing.push(field);
    } else {
      provided.push(field);
    }
  }
  
  return {
    isValid: missing.length === 0,
    missingFields: missing,
    providedFields: provided,
    optionalProvided: OPTIONAL_INPUTS.filter(f => campaignData[f])
  };
}

/**
 * Check if subscription level has access to AI Guardian
 */
function checkSubscriptionAccess(subscriptionLevel) {
  const normalizedLevel = (subscriptionLevel || "").toLowerCase().trim();
  
  if (!ALLOWED_SUBSCRIPTION_LEVELS.includes(normalizedLevel)) {
    return {
      hasAccess: false,
      message: `AI Guardian is available only for Pro, Hot, and Enterprise subscribers. Your level: "${subscriptionLevel || 'unknown'}"`,
      currentLevel: subscriptionLevel
    };
  }
  
  return {
    hasAccess: true,
    features: SUBSCRIPTION_FEATURES[normalizedLevel],
    message: `Access granted for ${normalizedLevel.toUpperCase()} subscriber`
  };
}

// ─── Analysis Module 1: Demand Analysis ─────────────────────────────────────

/**
 * Detect product category from name and description
 */
function detectProductCategory(campaignData) {
  const text = `${campaignData.product_name || ""} ${campaignData.product_description || ""}`.toLowerCase();
  
  const categoryKeywords = {
    electronics: ["phone", "laptop", "computer", "tablet", "gadget", "tech", "electronic", "camera", "headphone", "speaker", "charger", "battery"],
    fashion: ["clothing", "dress", "shirt", "pants", "shoe", "fashion", "wear", "jacket", "accessories", "jewelry", "watch", "bag", "handbag"],
    beauty: ["skincare", "makeup", "cosmetic", "beauty", "cream", "lotion", "serum", "hair", "nail", "perfume", "fragrance"],
    home: ["furniture", "home", "decor", "kitchen", "bed", "sofa", "chair", "table", "lamp", "rug", "curtain"],
    sports: ["fitness", "gym", "exercise", "sports", "workout", "athletic", "yoga", "running", "bicycle", "outdoor"],
    food: ["food", "snack", "drink", "beverage", "organic", "meal", "supplement", "vitamin", "nutrition"],
    health: ["health", "medical", "wellness", "medicine", "supplement", "vitamin", "care", "therapy"],
    automotive: ["car", "auto", "vehicle", "motor", "tire", "engine", "automotive"],
    education: ["course", "tutorial", "learning", "education", "training", "book", "ebook"],
    services: ["service", "consulting", "subscription", "membership", "plan"]
  };
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return category;
    }
  }
  
  return "other";
}

/**
 * Evaluate market demand
 * Output: High | Moderate | Low
 */
function analyzeDemand(campaignData, tier) {
  const category = detectProductCategory(campaignData);
  const categoryData = PRODUCT_CATEGORIES[category] || PRODUCT_CATEGORIES.other;
  
  // Map demand levels to High | Moderate | Low as per spec
  const demandMap = {
    "very-high": "High",
    "high": "High", 
    "moderate": "Moderate",
    "low": "Low",
    "declining": "Low"
  };
  
  const demandAnalysis = demandMap[categoryData.demandLevel] || "Moderate";
  
  return demandAnalysis;
}

// ─── Analysis Module 2: Audience Alignment ──────────────────────────────────

/**
 * Analyze audience alignment
 * Output: Audience Match Score (0-100)
 */
function analyzeAudienceAlignment(campaignData, tier) {
  let matchScore = 50; // Base score
  
  const category = detectProductCategory(campaignData);
  const targetAudience = (campaignData.target_audience || "").toLowerCase();
  const ageRange = campaignData.target_age_range || "";
  const productDescription = (campaignData.product_description || "").toLowerCase();
  
  // Interest/audience alignment check based on detected category
  const categoryKeywords = {
    electronics: ["tech", "gadget", "gaming", "computer", "phone", "smart", "developer", "gamer", "professional"],
    fashion: ["style", "clothing", "trend", "outfit", "wear", "apparel", "shopper", "fashionista"],
    beauty: ["skincare", "makeup", "cosmetic", "beauty", "wellness", "self-care", "women", "beauty enthusiast"],
    sports: ["fitness", "exercise", "athletic", "outdoor", "health", "gym", "athlete", "active"],
    food: ["cooking", "recipe", "gourmet", "health", "organic", "dining", "foodie", "chef"],
    home: ["interior", "decor", "furniture", "home", "living", "garden", "homeowner", "decorator"],
    health: ["wellness", "fitness", "medical", "nutrition", "healthy", "care", "health-conscious"],
    automotive: ["car", "driver", "vehicle", "mechanic", "automotive", "enthusiast"],
    education: ["student", "learner", "professional", "career", "education", "skill"],
    services: ["business", "professional", "entrepreneur", "company", "enterprise"]
  };
  
  const relevantKeywords = categoryKeywords[category] || [];
  const hasRelevantAudience = relevantKeywords.some(kw => targetAudience.includes(kw));
  
  if (hasRelevantAudience) {
    matchScore += 25;
  } else if (targetAudience) {
    matchScore += 10;
  }
  
  // Age range check
  if (ageRange) {
    matchScore += 10;
    
    // Age-category mismatch detection
    if (category === "electronics" && (ageRange.includes("65+") || ageRange.includes("60+"))) {
      matchScore -= 5;
    }
    if (category === "beauty" && ageRange.includes("13-17")) {
      matchScore -= 5;
    }
  }
  
  // Product description quality bonus
  if (productDescription.length >= 100) {
    matchScore += 10;
  } else if (productDescription.length >= 50) {
    matchScore += 5;
  }
  
  // Target country bonus
  if (campaignData.target_country) {
    matchScore += 5;
  }
  
  matchScore = Math.min(100, Math.max(0, matchScore));
  
  return matchScore;
}

// ─── Analysis Module 3: Price Intelligence ──────────────────────────────────

/**
 * Evaluate price competitiveness (if allowed by tier)
 * 
 * HOT TIER Output:
 *   - market_price_range
 *   - price_position
 *   - pricing_warning
 * 
 * ENTERPRISE TIER Output (full_price_intelligence):
 *   - market_price_range
 *   - price_position
 *   - conversion_risk_warning
 *   - optimal_price_recommendation
 */
function analyzePricing(campaignData, tier) {
  const features = SUBSCRIPTION_FEATURES[tier];
  
  // PRO tier doesn't get price intelligence
  if (!features.includePriceIntelligence) {
    return null;
  }
  
  const category = detectProductCategory(campaignData);
  const categoryData = PRODUCT_CATEGORIES[category] || PRODUCT_CATEGORIES.other;
  const [minPrice, maxPrice] = categoryData.priceRange;
  const productPrice = parseFloat(campaignData.product_price) || 0;
  
  // Calculate optimal price band
  const optimalMin = Math.round(minPrice * 1.1);
  const optimalMax = Math.round(maxPrice * 0.85);
  
  // Determine price position
  let pricePosition;
  let pricingWarning = null;
  
  if (productPrice < optimalMin * 0.7) {
    pricePosition = "below_market";
    pricingWarning = "Price may be too low - could signal low quality to buyers";
  } else if (productPrice > optimalMax * 1.2) {
    pricePosition = "above_market";
    pricingWarning = "Price above optimal range - may reduce conversions";
  } else if (productPrice > optimalMax) {
    pricePosition = "slightly_high";
  } else if (productPrice < optimalMin) {
    pricePosition = "slightly_low";
  } else {
    pricePosition = "competitive";
  }
  
  // Basic price intelligence for Hot tier
  const priceIntelligence = {
    market_price_range: `$${optimalMin} - $${optimalMax}`,
    price_position: pricePosition,
    pricing_warning: pricingWarning
  };
  
  // Full price intelligence for Enterprise tier
  if (features.includeFullPriceIntelligence) {
    // Calculate conversion risk
    let conversionRiskWarning = null;
    if (pricePosition === "above_market") {
      conversionRiskWarning = "High price may reduce conversion rate by 20-35%";
    } else if (pricePosition === "below_market") {
      conversionRiskWarning = "Low price may attract low-intent buyers, reducing quality conversions";
    } else if (pricePosition === "slightly_high") {
      conversionRiskWarning = "Price slightly above average may reduce conversion rate by 5-10%";
    }
    
    // Calculate optimal price recommendation
    const optimalPrice = Math.round(optimalMin + (optimalMax - optimalMin) * 0.4);
    
    priceIntelligence.conversion_risk_warning = conversionRiskWarning;
    priceIntelligence.optimal_price_recommendation = `$${optimalPrice}`;
  }
  
  return priceIntelligence;
}

// ─── Analysis Module 4: Competition Analysis ────────────────────────────────

/**
 * Evaluate competition intensity
 * Output: Low | Medium | High
 */
function analyzeCompetition(campaignData, tier) {
  const category = detectProductCategory(campaignData);
  const categoryData = PRODUCT_CATEGORIES[category] || PRODUCT_CATEGORIES.other;
  
  // Map saturation to competition level as per spec: Low | Medium | High
  const competitionMap = {
    "low": "Low",
    "moderate": "Medium", 
    "high": "High"
  };
  
  return competitionMap[categoryData.saturation] || "Medium";
}

// ─── Analysis Module 5: Market Opportunity Detection ────────────────────────

/**
 * Identify best performing markets
 * Output: Array of country names (limited by tier)
 */
function detectTopTargetMarkets(campaignData, tier) {
  const features = SUBSCRIPTION_FEATURES[tier];
  const maxMarkets = features.maxTopTargetMarkets;
  const targetCountry = (campaignData.target_country || "").toLowerCase();
  
  // Score markets based on various factors
  const scoredMarkets = GLOBAL_MARKETS.map(market => {
    let score = market.demandMultiplier * 100;
    
    // Boost score for target country if specified
    if (targetCountry && (
      targetCountry.includes(market.country.toLowerCase()) || 
      targetCountry === market.code.toLowerCase()
    )) {
      score += 30;
    }
    
    // Factor in conversion rate
    score += market.avgConversionRate * 5;
    
    return {
      ...market,
      score: Math.round(score)
    };
  });
  
  // Sort by score and return top markets (as array of country names per spec)
  return scoredMarkets
    .sort((a, b) => b.score - a.score)
    .slice(0, maxMarkets)
    .map(market => market.country);
}

// ─── Analysis Module 6: Safety Score Calculation ────────────────────────────

/**
 * Calculate Safety Score (0-100)
 * Derived from: demand_score, audience_match, competition_level, price_competitiveness
 * 
 * Risk Level Mapping:
 *   0-39   → Critical
 *   40-59  → High
 *   60-79  → Moderate
 *   80-100 → Low
 */
function calculateSafetyScore(demandAnalysis, audienceMatchScore, competitionAnalysis, priceIntelligence) {
  let safetyScore = 50; // Base score
  
  // Demand factor (+/- 15 points)
  if (demandAnalysis === "High") safetyScore += 15;
  else if (demandAnalysis === "Moderate") safetyScore += 5;
  else if (demandAnalysis === "Low") safetyScore -= 10;
  
  // Audience match factor (+/- 15 points)
  if (audienceMatchScore >= 80) safetyScore += 15;
  else if (audienceMatchScore >= 60) safetyScore += 10;
  else if (audienceMatchScore >= 40) safetyScore += 0;
  else safetyScore -= 10;
  
  // Competition factor (+/- 10 points)
  if (competitionAnalysis === "Low") safetyScore += 10;
  else if (competitionAnalysis === "Medium") safetyScore += 5;
  else if (competitionAnalysis === "High") safetyScore -= 5;
  
  // Price competitiveness factor (+/- 10 points) - only if available
  if (priceIntelligence) {
    if (priceIntelligence.price_position === "competitive") safetyScore += 10;
    else if (priceIntelligence.price_position === "slightly_high" || priceIntelligence.price_position === "slightly_low") safetyScore += 5;
    else if (priceIntelligence.price_position === "above_market" || priceIntelligence.price_position === "below_market") safetyScore -= 10;
  }
  
  // Ensure score is within bounds
  safetyScore = Math.min(100, Math.max(0, safetyScore));
  
  // Determine risk level per spec
  let riskLevel;
  if (safetyScore >= 80) riskLevel = "Low";
  else if (safetyScore >= 60) riskLevel = "Moderate";
  else if (safetyScore >= 40) riskLevel = "High";
  else riskLevel = "Critical";
  
  return {
    safety_score: safetyScore,
    risk_level: riskLevel
  };
}

// ─── Enterprise AI Analysis (OpenAI) ────────────────────────────────────────

/**
 * OpenAI GPT-4o demand + trend analysis (used for all tiers)
 */
async function analyzeWithGPT4o(campaignData) {
  if (!openaiClient) {
    return { error: "OpenAI not available", fallback: true };
  }
  
  try {
    const prompt = `You are an AI demand analyst. Analyze this campaign for demand and trends.

Product: ${campaignData.product_name}
Description: ${campaignData.product_description}
Price: $${campaignData.product_price}
Target Country: ${campaignData.target_country}
Target Audience: ${campaignData.target_audience}

Return JSON with:
{
  "demandSignal": "High" | "Moderate" | "Low",
  "trendDirection": "Rising" | "Stable" | "Declining",
  "seasonalityImpact": "Positive" | "Neutral" | "Negative",
  "marketGrowthRate": "string percentage",
  "demandConfidence": number 0-100
}`;

    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 500
    });
    
    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error("[AI Guardian GPT-4o]", error.message);
    return { error: error.message, fallback: true };
  }
}



// ─── Analysis Module 7: Actionable Insights Generation ──────────────────────

/**
 * Generate optimization insights
 * Limited by tier: Pro=3, Hot=6, Enterprise=10
 */
function generateActionableInsights(campaignData, demandAnalysis, audienceMatchScore, competitionAnalysis, priceIntelligence, tier) {
  const features = SUBSCRIPTION_FEATURES[tier];
  const insights = [];
  const category = detectProductCategory(campaignData);
  
  // Demand-based insights
  if (demandAnalysis === "High") {
    insights.push("Capitalize on high market demand with aggressive targeting");
  } else if (demandAnalysis === "Low") {
    insights.push("Consider repositioning product or exploring niche markets");
  }
  
  // Audience-based insights
  if (audienceMatchScore < 50) {
    insights.push("Refine target audience to better match product category");
  } else if (audienceMatchScore >= 80) {
    insights.push("Strong audience alignment - consider expanding reach");
  }
  
  // Competition-based insights
  if (competitionAnalysis === "High") {
    insights.push("Differentiate with unique value propositions");
    insights.push("Focus on niche segments to reduce competition");
  } else if (competitionAnalysis === "Low") {
    insights.push("Low competition presents market capture opportunity");
  }
  
  // Price-based insights (Hot/Enterprise)
  if (priceIntelligence) {
    if (priceIntelligence.price_position === "above_market") {
      insights.push("Consider price reduction to improve conversion rate");
    } else if (priceIntelligence.price_position === "below_market") {
      insights.push("Price increase may improve perceived value");
    }
  }
  
  // Platform-specific insights
  const platform = (campaignData.ad_platform || "").toLowerCase();
  if (platform.includes("facebook") || platform.includes("instagram")) {
    insights.push("Use carousel ads for higher engagement on social platforms");
  } else if (platform.includes("google")) {
    insights.push("Optimize keywords for search intent alignment");
  }
  
  // General optimization insights
  insights.push("A/B test ad creatives for optimal performance");
  insights.push("Set up conversion tracking before campaign launch");
  insights.push("Monitor first 48 hours closely for quick optimization");
  
  // Return limited by tier
  return insights.slice(0, features.maxActionableInsights);
}

// ─── Enterprise Auto Post Generator ─────────────────────────────────────────

/**
 * Enterprise AI Auto Post Generator
 * Generates optimized ad content using AI
 * 
 * Output:
 *   - optimized_title
 *   - optimized_description
 *   - suggested_price
 *   - ad_hook
 *   - call_to_action
 */
async function generateAutoPost(campaignData) {
  // Generate using AI if available
  if (openaiClient) {
    try {
      const prompt = `You are an AI ad copy specialist. Generate optimized ad content for this product.

Product Name: ${campaignData.product_name}
Description: ${campaignData.product_description}
Price: $${campaignData.product_price}
Target Audience: ${campaignData.target_audience}
Target Country: ${campaignData.target_country}
Platform: ${campaignData.ad_platform}

Generate a JSON response with:
{
  "optimized_title": "catchy, compelling title under 60 characters",
  "optimized_description": "engaging description under 150 characters highlighting key benefits",
  "suggested_price": "optimal price point as string with $ symbol",
  "ad_hook": "attention-grabbing opening line",
  "call_to_action": "compelling CTA phrase"
}`;

      const completion = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 500
      });
      
      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error("[AI Guardian Auto Post Generator]", error.message);
    }
  }
  
  // Fallback to rule-based generation
  const productName = campaignData.product_name || "Product";
  const price = parseFloat(campaignData.product_price) || 0;
  const category = detectProductCategory(campaignData);
  const categoryData = PRODUCT_CATEGORIES[category] || PRODUCT_CATEGORIES.other;
  
  // Calculate suggested price
  const [minPrice, maxPrice] = categoryData.priceRange;
  const optimalPrice = Math.round(minPrice + (maxPrice - minPrice) * 0.4);
  
  return {
    optimized_title: `${productName} - Premium Quality, Best Value`,
    optimized_description: campaignData.product_description?.substring(0, 150) || `Discover ${productName} - the perfect choice for you.`,
    suggested_price: `$${optimalPrice}`,
    ad_hook: `Looking for the perfect ${category} solution?`,
    call_to_action: "Shop Now and Save"
  };
}

// ─── Main Analysis Function ─────────────────────────────────────────────────

/**
 * Generate AI Guardian Campaign Intelligence Report
 * 
 * OUTPUT FORMAT:
 * {
 *   "safety_score": number,
 *   "risk_level": "",
 *   "demand_analysis": "",
 *   "audience_match_score": number,
 *   "competition_analysis": "",
 *   "price_intelligence": {},      // Hot/Enterprise only
 *   "top_target_markets": [],
 *   "actionable_insights": [],
 *   "confidence_score": number,
 *   "auto_post_generator": {}      // Enterprise only
 * }
 * 
 * Fields not allowed by tier are omitted.
 */
async function generateGuardianAnalysis(campaignData) {
  // Validate tier
  const tier = (campaignData.tier || "pro").toLowerCase();
  if (!ALLOWED_SUBSCRIPTION_LEVELS.includes(tier)) {
    throw new Error(`Invalid tier: ${tier}. Must be one of: pro, hot, enterprise`);
  }
  
  const features = SUBSCRIPTION_FEATURES[tier];
  
  // 1. Detect product category
  const category = detectProductCategory(campaignData);
  
  // 2. Evaluate market demand
  const demandAnalysis = analyzeDemand(campaignData, tier);
  
  // 3. Analyze audience alignment
  const audienceMatchScore = analyzeAudienceAlignment(campaignData, tier);
  
  // 4. Evaluate competition intensity
  const competitionAnalysis = analyzeCompetition(campaignData, tier);
  
  // 5. Identify best performing markets
  const topTargetMarkets = detectTopTargetMarkets(campaignData, tier);
  
  // 6. Evaluate price competitiveness (if allowed by tier)
  const priceIntelligence = analyzePricing(campaignData, tier);
  
  // 7. Calculate safety score and risk level
  const safetyResult = calculateSafetyScore(demandAnalysis, audienceMatchScore, competitionAnalysis, priceIntelligence);
  
  // 8. Generate optimization insights
  const actionableInsights = generateActionableInsights(campaignData, demandAnalysis, audienceMatchScore, competitionAnalysis, priceIntelligence, tier);
  
  // Build response object - only include fields allowed by tier
  const response = {
    safety_score: safetyResult.safety_score,
    risk_level: safetyResult.risk_level,
    demand_analysis: demandAnalysis,
    audience_match_score: audienceMatchScore,
    competition_analysis: competitionAnalysis,
    top_target_markets: topTargetMarkets,
    actionable_insights: actionableInsights,
    confidence_score: features.confidenceScore
  };
  
  // Add price_intelligence for Hot/Enterprise only
  if (features.includePriceIntelligence && priceIntelligence) {
    response.price_intelligence = priceIntelligence;
  }
  
  // Add Enterprise-exclusive features
  if (features.includeAutoPostGenerator) {
    response.auto_post_generator = await generateAutoPost(campaignData);
  }
  
  return response;
}

/**
 * Synchronous version of guardian analysis (without auto-post generator AI calls)
 */
function generateGuardianAnalysisSync(campaignData) {
  // Validate tier
  const tier = (campaignData.tier || "pro").toLowerCase();
  if (!ALLOWED_SUBSCRIPTION_LEVELS.includes(tier)) {
    throw new Error(`Invalid tier: ${tier}. Must be one of: pro, hot, enterprise`);
  }
  
  const features = SUBSCRIPTION_FEATURES[tier];
  
  // Run all analysis modules
  const demandAnalysis = analyzeDemand(campaignData, tier);
  const audienceMatchScore = analyzeAudienceAlignment(campaignData, tier);
  const competitionAnalysis = analyzeCompetition(campaignData, tier);
  const topTargetMarkets = detectTopTargetMarkets(campaignData, tier);
  const priceIntelligence = analyzePricing(campaignData, tier);
  const safetyResult = calculateSafetyScore(demandAnalysis, audienceMatchScore, competitionAnalysis, priceIntelligence);
  const actionableInsights = generateActionableInsights(campaignData, demandAnalysis, audienceMatchScore, competitionAnalysis, priceIntelligence, tier);
  
  // Build response
  const response = {
    safety_score: safetyResult.safety_score,
    risk_level: safetyResult.risk_level,
    demand_analysis: demandAnalysis,
    audience_match_score: audienceMatchScore,
    competition_analysis: competitionAnalysis,
    top_target_markets: topTargetMarkets,
    actionable_insights: actionableInsights,
    confidence_score: features.confidenceScore
  };
  
  // Add price_intelligence for Hot/Enterprise only
  if (features.includePriceIntelligence && priceIntelligence) {
    response.price_intelligence = priceIntelligence;
  }
  
  // Add rule-based auto_post_generator for Enterprise
  if (features.includeAutoPostGenerator) {
    const productName = campaignData.product_name || "Product";
    const category = detectProductCategory(campaignData);
    const categoryData = PRODUCT_CATEGORIES[category] || PRODUCT_CATEGORIES.other;
    const [minPrice, maxPrice] = categoryData.priceRange;
    const optimalPrice = Math.round(minPrice + (maxPrice - minPrice) * 0.4);
    
    response.auto_post_generator = {
      optimized_title: `${productName} - Premium Quality, Best Value`,
      optimized_description: campaignData.product_description?.substring(0, 150) || `Discover ${productName} - the perfect choice for you.`,
      suggested_price: `$${optimalPrice}`,
      ad_hook: `Looking for the perfect ${category} solution?`,
      call_to_action: "Shop Now and Save"
    };
  }
  
  return response;
}

/**
 * Generate AI-Enhanced Guardian Analysis
 * Uses OpenAI GPT-4o for AI-enhanced insights across all tiers
 */
async function generateAIEnhancedGuardianAnalysis(campaignData) {
  const tier = (campaignData.tier || "pro").toLowerCase();
  const features = SUBSCRIPTION_FEATURES[tier] || SUBSCRIPTION_FEATURES.pro;
  
  // Get base analysis
  const baseAnalysis = await generateGuardianAnalysis(campaignData);
  
  // Enhance with OpenAI for all tiers that have access
  if (openaiClient) {
    try {
      const prompt = `You are AI Guardian, a campaign intelligence engine. Analyze this campaign and provide optimization suggestions.

Product: ${campaignData.product_name}
Description: ${campaignData.product_description}
Price: $${campaignData.product_price}
Target Country: ${campaignData.target_country}
Target Audience: ${campaignData.target_audience}
Platform: ${campaignData.ad_platform}

Current Analysis:
- Safety Score: ${baseAnalysis.safety_score}
- Risk Level: ${baseAnalysis.risk_level}
- Demand: ${baseAnalysis.demand_analysis}
- Competition: ${baseAnalysis.competition_analysis}

Tier: ${tier.toUpperCase()}
Max Insights: ${features.maxActionableInsights}

Return JSON with exactly ${features.maxActionableInsights} actionable insights:
{
  "enhanced_insights": ["array of specific, actionable recommendations"]
}`;

      const completion = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 500
      });
      
      const aiResponse = JSON.parse(completion.choices[0].message.content);
      
      // Merge AI insights with existing insights
      if (aiResponse.enhanced_insights && aiResponse.enhanced_insights.length > 0) {
        baseAnalysis.actionable_insights = aiResponse.enhanced_insights.slice(0, features.maxActionableInsights);
      }
    } catch (error) {
      console.error("[AI Guardian AI Enhancement]", error.message);
      // Continue with base analysis on error
    }
  }
  
  return baseAnalysis;
}

/**
 * Get feature comparison for all tiers
 */
function getFeatureComparison() {
  return {
    description: "AI Guardian Core Engine - Campaign Intelligence System",
    mission: "Analyze product campaign inputs and generate structured campaign intelligence reports",
    access: "Available for Pro, Hot, and Enterprise subscribers",
    requiredInputs: REQUIRED_INPUTS,
    optionalInputs: OPTIONAL_INPUTS,
    analysisModules: [
      "Product Category Detection",
      "Market Demand Evaluation",
      "Audience Alignment Analysis",
      "Competition Intensity Evaluation",
      "Campaign Risk Estimation",
      "Best Performing Markets Identification",
      "Price Competitiveness Evaluation",
      "Optimization Insights Generation",
      "Safety Score & Confidence Score Production"
    ],
    scoringLogic: {
      safetyScore: "0-100, derived from demand_score, audience_match, competition_level, price_competitiveness",
      riskLevelMapping: {
        "0-39": "Critical",
        "40-59": "High",
        "60-79": "Moderate",
        "80-100": "Low"
      },
      demandAnalysis: "High | Moderate | Low",
      competitionAnalysis: "Low | Medium | High"
    },
    tiers: {
      pro: {
        name: "Pro",
        aiModel: "Primary OpenAI reasoning model",
        confidenceScore: 62,
        limits: {
          topTargetMarkets: 2,
          actionableInsights: 3
        },
        features: {
          safetyScore: true,
          riskLevel: true,
          demandAnalysis: true,
          audienceMatchScore: true,
          competitionAnalysis: true,
          topTargetMarkets: true,
          actionableInsights: true,
          priceIntelligence: false,
          autoPostGenerator: false,
          enterpriseStrategies: false
        }
      },
      hot: {
        name: "Hot",
        aiModel: "Best OpenAI reasoning model",
        confidenceScore: 78,
        limits: {
          topTargetMarkets: 4,
          actionableInsights: 6
        },
        features: {
          safetyScore: true,
          riskLevel: true,
          demandAnalysis: true,
          audienceMatchScore: true,
          competitionAnalysis: true,
          topTargetMarkets: true,
          actionableInsights: true,
          priceIntelligence: true,
          autoPostGenerator: false,
          enterpriseStrategies: false
        },
        priceIntelligenceFields: [
          "market_price_range",
          "price_position",
          "pricing_warning"
        ]
      },
      enterprise: {
        name: "Enterprise",
        aiModel: "Advanced OpenAI reasoning model with full enterprise features",
        confidenceScore: 91,
        limits: {
          topTargetMarkets: 6,
          actionableInsights: 10
        },
        features: {
          safetyScore: true,
          riskLevel: true,
          demandAnalysis: true,
          audienceMatchScore: true,
          competitionAnalysis: true,
          topTargetMarkets: true,
          actionableInsights: true,
          priceIntelligence: true,
          fullPriceIntelligence: true,
          autoPostGenerator: true,
          enterpriseStrategies: true
        },
        priceIntelligenceFields: [
          "market_price_range",
          "price_position",
          "conversion_risk_warning",
          "optimal_price_recommendation"
        ],
        autoPostGeneratorFields: [
          "optimized_title",
          "optimized_description",
          "suggested_price",
          "ad_hook",
          "call_to_action"
        ],
        enterpriseStrategies: SUBSCRIPTION_FEATURES.enterprise.enterpriseStrategies
      }
    },
    outputFormat: {
      description: "Always returns valid JSON",
      fields: [
        "safety_score (number)",
        "risk_level (string)",
        "demand_analysis (string)",
        "audience_match_score (number)",
        "competition_analysis (string)",
        "price_intelligence (object, Hot/Enterprise only)",
        "top_target_markets (array)",
        "actionable_insights (array)",
        "confidence_score (number)",
        "auto_post_generator (object, Enterprise only)"
      ],
      note: "Fields not allowed by tier are omitted"
    }
  };
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  // Main functions
  generateGuardianAnalysis,
  generateGuardianAnalysisSync,
  generateAIEnhancedGuardianAnalysis,
  
  // Utility functions
  validateCampaignInputs,
  checkSubscriptionAccess,
  getFeatureComparison,
  
  // Analysis modules (for direct access if needed)
  detectProductCategory,
  analyzeDemand,
  analyzeAudienceAlignment,
  analyzePricing,
  analyzeCompetition,
  detectTopTargetMarkets,
  calculateSafetyScore,
  generateActionableInsights,
  generateAutoPost,
  
  // Configuration exports
  REQUIRED_INPUTS,
  OPTIONAL_INPUTS,
  ALLOWED_SUBSCRIPTION_LEVELS,
  SUBSCRIPTION_FEATURES,
  PRODUCT_CATEGORIES,
  GLOBAL_MARKETS
};
