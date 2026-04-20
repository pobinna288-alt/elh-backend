/**
 * ENTERPRISE AI AUTO-POST GENERATOR SERVICE
 * Transform uploaded product data into fully optimized, decision-intelligent enterprise advertisements
 * 
 * ACCESS CONTROL:
 *   - Feature available ONLY for Enterprise subscription users
 *   - Pro/Hot users get limited features (titles + descriptions only)
 *   - Normal/Premium: Access denied
 * 
 * ROLE:
 *   Acts as:
 *   • Senior Marketing Strategist
 *   • Pricing Analyst
 *   • Market Researcher
 *   • Conversion Optimizer
 */

// Initialize OpenAI conditionally
let openai = null;
try {
  if (process.env.OPENAI_API_KEY) {
    const { OpenAI } = require("openai");
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
} catch (err) {
  console.warn("[Enterprise Auto-Post] OpenAI initialization skipped:", err.message);
}

// ─── Access Control ─────────────────────────────────────────────────────────

const SUBSCRIPTION_ACCESS = {
  enterprise: { hasAccess: true, aiEnabled: true, fullFeatures: true },
  pro: { hasAccess: true, aiEnabled: false, fullFeatures: false },
  hot: { hasAccess: true, aiEnabled: false, fullFeatures: false },
  premium: { hasAccess: false, aiEnabled: false, fullFeatures: false },
  normal: { hasAccess: false, aiEnabled: false, fullFeatures: false }
};

/**
 * Verify subscription access for Auto-Post Generator
 * @param {string} subscriptionPlan - User's subscription plan
 * @returns {{ hasAccess: boolean, aiEnabled: boolean, fullFeatures: boolean, error?: string }}
 */
function verifyAutoPostAccess(subscriptionPlan) {
  if (!subscriptionPlan) {
    return { hasAccess: false, aiEnabled: false, fullFeatures: false, error: "Subscription plan required" };
  }
  
  const normalizedPlan = subscriptionPlan.toLowerCase().trim();
  const access = SUBSCRIPTION_ACCESS[normalizedPlan];
  
  if (!access) {
    return { hasAccess: false, aiEnabled: false, fullFeatures: false, error: "Invalid subscription plan" };
  }
  
  if (!access.hasAccess) {
    return { 
      hasAccess: false, 
      aiEnabled: false, 
      fullFeatures: false,
      error: "Enterprise, Pro, or Hot subscription required for Auto-Post Generator" 
    };
  }
  
  return { 
    hasAccess: true, 
    aiEnabled: access.aiEnabled, 
    fullFeatures: access.fullFeatures 
  };
}

// ─── Master Prompt Generator ────────────────────────────────────────────────

function normalizeText(value, fallback = "") {
  return `${value ?? fallback}`.replace(/\s+/g, " ").trim();
}

function pickFirstText(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }

  const firstItem = items[0];
  if (typeof firstItem === "string") {
    return normalizeText(firstItem);
  }

  return normalizeText(firstItem?.text || firstItem?.value || "");
}

function detectFusionAudience(payload = {}) {
  const category = normalizeText(payload.category || "").toLowerCase();

  if (category.includes("fashion")) {
    return "Style-conscious buyers ready to purchase quickly";
  }

  if (category.includes("electronics")) {
    return "Tech-savvy buyers looking for trusted value";
  }

  if (category.includes("vehicle") || category.includes("car")) {
    return "Serious buyers comparing condition, trust, and price";
  }

  if (category.includes("property") || category.includes("real estate")) {
    return "High-intent renters or buyers ready to book a viewing";
  }

  return "High-intent buyers looking for value and quick action";
}

function suggestFusionPlatform(payload = {}) {
  const category = normalizeText(payload.category || "").toLowerCase();

  if (category.includes("fashion")) {
    return "Instagram Marketplace";
  }

  if (category.includes("electronics") || category.includes("vehicle") || category.includes("car")) {
    return "Facebook Marketplace";
  }

  if (category.includes("property") || category.includes("real estate")) {
    return "Facebook Marketplace";
  }

  return "Facebook Marketplace";
}

function buildFusionAdPackage(payload = {}, generated = {}) {
  const headline = normalizeText(
    generated.headline ||
      generated.fusionPackage?.headline ||
      generated.fusion_package?.headline ||
      pickFirstText(generated.titles) ||
      payload.title ||
      `${payload.category || "Product"} offer buyers notice fast`,
    "Optimized product listing"
  );

  const description = normalizeText(
    generated.description ||
      generated.fusionPackage?.description ||
      generated.fusion_package?.description ||
      pickFirstText(generated.descriptions) ||
      payload.description ||
      "Strong value, clear benefits, and ready for immediate buyer action.",
    "Strong value, clear benefits, and ready for immediate buyer action."
  );

  const cta = normalizeText(
    generated.cta ||
      generated.fusionPackage?.cta ||
      generated.fusion_package?.cta ||
      (payload.price ? `Message now to secure it for ${payload.price}.` : "Message now to secure this offer today."),
    "Message now to secure this offer today."
  );

  const targetAudience = normalizeText(
    generated.targetAudience ||
      generated.target_audience ||
      generated.fusionPackage?.targetAudience ||
      generated.fusion_package?.targetAudience ||
      detectFusionAudience(payload),
    "High-intent buyers looking for value and quick action"
  );

  const platformSuggestion = normalizeText(
    generated.platformSuggestion ||
      generated.platform_suggestion ||
      generated.fusionPackage?.platformSuggestion ||
      generated.fusion_package?.platformSuggestion ||
      suggestFusionPlatform(payload),
    "Facebook Marketplace"
  );

  return {
    headline,
    description,
    cta,
    targetAudience,
    platformSuggestion,
  };
}

/**
 * Generate the Enterprise Fusion Auto-Post prompt
 * @param {object} payload - Product data payload
 * @returns {string} - Formatted prompt for AI
 */
function generateMasterPrompt(payload) {
  return `
SYSTEM ROLE:
You are the AI Sales Intelligence Engine (v2 ENTERPRISE FUSION SYSTEM).

INTERNAL 3-BRAIN FUSION:
1. Creative Brain -> emotional messaging, hooks, CTA
2. Strategic Brain -> conversion optimization, urgency, revenue strength
3. Market Brain -> audience fit, demand timing, platform alignment

CORE OBJECTIVE:
- maximize conversion
- increase sales speed
- optimize pricing and messaging
- improve revenue outcomes

ACTIVE FEATURE:
AI Auto Post Generator (NEW SYSTEM VERSION ONLY)

TASK:
Create ONE full ad package for the product below.
Do not provide alternatives.
Do not expose reasoning.
Do not use legacy behavior.

INPUT DATA:
- Existing Title: ${payload.title || "None"}
- Existing Description: ${payload.description || "None"}
- Product Category: ${payload.category || "Unknown"}
- Uploaded Images Count: ${payload.images?.length || 0}
- Price: ${payload.price || "Not specified"}
- Target Market: ${payload.targetMarket || "Global"}
- AI Optimization Enabled: ${payload.aiEnabled}

RETURN STRICT JSON ONLY IN THIS SHAPE:
{
  "headline": "",
  "description": "",
  "cta": "",
  "targetAudience": "",
  "platformSuggestion": ""
}

RULES:
- one final optimized result only
- revenue-focused output
- concise and persuasive wording
- no markdown
- no explanations outside JSON
`;
}

// ─── Global Market Data ─────────────────────────────────────────────────────

const GLOBAL_MARKET_DATA = {
  regions: {
    "United States": { demandScore: 95, competition: "high", successProbability: 78, purchasingPower: "Very High" },
    "Canada": { demandScore: 88, competition: "medium", successProbability: 82, purchasingPower: "High" },
    "United Kingdom": { demandScore: 90, competition: "high", successProbability: 75, purchasingPower: "High" },
    "Germany": { demandScore: 85, competition: "medium", successProbability: 80, purchasingPower: "High" },
    "France": { demandScore: 82, competition: "medium", successProbability: 76, purchasingPower: "High" },
    "Australia": { demandScore: 80, competition: "medium", successProbability: 79, purchasingPower: "High" },
    "Nigeria": { demandScore: 75, competition: "low", successProbability: 85, purchasingPower: "Medium" },
    "UAE": { demandScore: 78, competition: "medium", successProbability: 77, purchasingPower: "Very High" },
    "Singapore": { demandScore: 83, competition: "medium", successProbability: 84, purchasingPower: "Very High" },
    "Netherlands": { demandScore: 79, competition: "low", successProbability: 83, purchasingPower: "High" },
    "India": { demandScore: 88, competition: "high", successProbability: 71, purchasingPower: "Medium" },
    "Japan": { demandScore: 84, competition: "high", successProbability: 76, purchasingPower: "High" }
  },
  
  categoryMultipliers: {
    "Electronics": 1.2,
    "Fashion": 1.1,
    "Home & Garden": 1.0,
    "Sports": 1.05,
    "Automotive": 1.15,
    "Health & Beauty": 1.1,
    "Toys & Games": 0.95,
    "Books & Media": 0.9,
    "Food & Beverages": 0.85,
    "Services": 1.0
  }
};

// ─── Fallback Generators (Non-AI) ───────────────────────────────────────────

/**
 * Generate titles without AI (template-based)
 * @param {object} payload - Product data
 * @returns {Array} - Array of title suggestions
 */
function generateFallbackTitles(payload) {
  const { title, category, description } = payload;
  const productName = title || "Premium Product";
  const cat = category || "Item";
  
  const templates = [
    {
      id: 1,
      text: `🔥 ${productName} — Premium Quality ${cat} | Limited Availability`,
      angle: "Urgency + Scarcity",
      estimatedEngagement: 85
    },
    {
      id: 2,
      text: `Discover the Ultimate ${productName} — Transform Your Experience Today`,
      angle: "Benefit + Transformation",
      estimatedEngagement: 82
    },
    {
      id: 3,
      text: `Exclusive ${productName} | Top-Rated ${cat} for Discerning Buyers`,
      angle: "Luxury + Status",
      estimatedEngagement: 79
    }
  ];
  
  return templates;
}

/**
 * Generate descriptions without AI (template-based)
 * @param {object} payload - Product data
 * @returns {Array} - Array of description suggestions
 */
function generateFallbackDescriptions(payload) {
  const { title, category, description } = payload;
  const productName = title || "this premium product";
  const cat = category || "item";
  
  const templates = [
    {
      id: 1,
      text: `Experience excellence with ${productName}. Crafted for those who demand the best, this ${cat} delivers unmatched quality and performance. Don't settle for ordinary — upgrade your lifestyle today. Limited stock available. Order now and transform your experience!`,
      tone: "Luxury",
      callToAction: "Order now",
      estimatedConversion: 78
    },
    {
      id: 2,
      text: `Looking for a reliable ${cat}? ${productName} is exactly what you need. Trusted by thousands of satisfied customers, it combines quality with value. Join the satisfied buyers who made the smart choice. Act fast — this deal won't last forever!`,
      tone: "Trust + Urgency",
      callToAction: "Act fast",
      estimatedConversion: 75
    },
    {
      id: 3,
      text: `Why wait? Get your hands on ${productName} now. Superior ${cat} at an unbeatable price. This is your chance to own something special. Fast shipping, secure checkout, satisfaction guaranteed. Make it yours today!`,
      tone: "Direct + Benefit",
      callToAction: "Make it yours",
      estimatedConversion: 72
    }
  ];
  
  return templates;
}

/**
 * Generate pricing intelligence without AI
 * @param {object} payload - Product data
 * @returns {object} - Pricing recommendation
 */
function generateFallbackPricing(payload) {
  const { price, category } = payload;
  const basePrice = parseFloat(price) || 100;
  const multiplier = GLOBAL_MARKET_DATA.categoryMultipliers[category] || 1.0;
  
  const minPrice = Math.round(basePrice * 0.85 * multiplier);
  const maxPrice = Math.round(basePrice * 1.15 * multiplier);
  const recommended = Math.round(basePrice * 0.95 * multiplier);
  
  return {
    priceRange: `$${minPrice} - $${maxPrice}`,
    recommendedPrice: `$${recommended}`,
    reason: `Based on ${category || "general"} market analysis and competitive positioning, a ${Math.round((1 - 0.95) * 100)}% discount optimizes conversion while maintaining margins.`,
    speedImpact: `Reducing price by $${Math.round(basePrice * 0.05)} may increase conversion likelihood by approximately 15-22%.`
  };
}

/**
 * Generate country targeting without AI
 * @param {object} payload - Product data
 * @returns {Array} - Top markets for the product
 */
function generateFallbackCountries(payload) {
  const { category, targetMarket } = payload;
  const regions = GLOBAL_MARKET_DATA.regions;
  const multiplier = GLOBAL_MARKET_DATA.categoryMultipliers[category] || 1.0;
  
  // Sort by adjusted success probability
  const sortedRegions = Object.entries(regions)
    .map(([country, data]) => ({
      country,
      ...data,
      adjustedProbability: Math.min(99, Math.round(data.successProbability * multiplier))
    }))
    .sort((a, b) => b.adjustedProbability - a.adjustedProbability)
    .slice(0, 6);
  
  // Mark fastest market
  sortedRegions[0].fastestMarket = true;
  
  return sortedRegions.map(region => ({
    country: region.country,
    successProbability: `${region.adjustedProbability}%`,
    demandLevel: region.demandScore >= 85 ? "High" : region.demandScore >= 75 ? "Medium" : "Growing",
    purchasingPowerMatch: region.purchasingPower,
    competition: region.competition,
    fastestMarket: region.fastestMarket || false
  }));
}

/**
 * Generate ad improvement report without AI
 * @param {object} payload - Product data
 * @returns {object} - Ad report scores
 */
function generateFallbackAdReport(payload) {
  const { title, description, images, category } = payload;
  
  // Score calculations
  let attentionScore = 50;
  let trustScore = 50;
  let purchaseIntentScore = 50;
  let marketFitScore = 50;
  
  // Title scoring
  if (title) {
    attentionScore += title.length > 20 ? 15 : 5;
    attentionScore += /[!🔥⭐💯]/.test(title) ? 10 : 0;
    attentionScore += /free|exclusive|limited|premium/i.test(title) ? 10 : 0;
  }
  
  // Description scoring
  if (description) {
    trustScore += description.length > 100 ? 20 : 10;
    trustScore += /guarantee|warranty|certified|trusted/i.test(description) ? 15 : 0;
    purchaseIntentScore += /buy now|order|get yours|limited/i.test(description) ? 15 : 0;
  }
  
  // Image scoring
  if (images && images.length > 0) {
    trustScore += Math.min(images.length * 5, 15);
    purchaseIntentScore += Math.min(images.length * 3, 10);
  }
  
  // Category fit
  if (category && GLOBAL_MARKET_DATA.categoryMultipliers[category]) {
    marketFitScore += GLOBAL_MARKET_DATA.categoryMultipliers[category] * 20;
  }
  
  // Normalize scores
  attentionScore = Math.min(100, attentionScore);
  trustScore = Math.min(100, trustScore);
  purchaseIntentScore = Math.min(100, purchaseIntentScore);
  marketFitScore = Math.min(100, marketFitScore);
  
  const avgScore = (attentionScore + trustScore + purchaseIntentScore + marketFitScore) / 4;
  const conversionProbability = Math.round(avgScore * 0.85);
  
  const improvements = [];
  if (attentionScore < 70) improvements.push("Add attention-grabbing words to your title (e.g., 'Exclusive', 'Limited')");
  if (trustScore < 70) improvements.push("Include trust signals like guarantees or certifications");
  if (purchaseIntentScore < 70) improvements.push("Add a clear call-to-action in your description");
  if (marketFitScore < 70) improvements.push("Ensure product category is correctly specified");
  
  return {
    attentionScore: Math.round(attentionScore),
    trustScore: Math.round(trustScore),
    purchaseIntentScore: Math.round(purchaseIntentScore),
    marketFitScore: Math.round(marketFitScore),
    predictedConversionProbability: `${conversionProbability}%`,
    insight: `Selecting top recommended markets increases projected sell probability from ${conversionProbability}% to ${Math.min(95, conversionProbability + 25)}%.`,
    improvements
  };
}

/**
 * Generate revenue prediction without AI
 * @param {object} payload - Product data
 * @param {object} adReport - Ad report scores
 * @returns {object} - Revenue prediction
 */
function generateFallbackRevenuePrediction(payload, adReport) {
  const { price } = payload;
  const basePrice = parseFloat(price) || 100;
  const conversionProb = parseInt(adReport.predictedConversionProbability) || 50;
  
  // Estimate buyers based on conversion probability
  const minBuyers = Math.max(1, Math.round(conversionProb / 10));
  const maxBuyers = Math.round(conversionProb / 5);
  
  const minRevenue = minBuyers * basePrice;
  const maxRevenue = maxBuyers * basePrice;
  
  let riskLevel = "Medium";
  if (conversionProb >= 75) riskLevel = "Low";
  else if (conversionProb < 50) riskLevel = "High";
  
  let aiApproval = "Warning";
  if (conversionProb >= 60 && adReport.trustScore >= 60) {
    aiApproval = "Approved";
  }
  
  return {
    salesProbability: `${conversionProb}%`,
    estimatedBuyersRange: `${minBuyers}–${maxBuyers}`,
    projectedRevenueRange: `$${Math.round(minRevenue)}–$${Math.round(maxRevenue)}`,
    riskLevel,
    aiApproval,
    confidenceNote: aiApproval === "Approved" 
      ? "Ad meets quality standards for successful sales."
      : "Consider implementing suggested improvements before publishing."
  };
}

// ─── Main Generation Functions ──────────────────────────────────────────────

/**
 * Generate Auto-Post content without AI (fallback mode)
 * @param {object} payload - Product data
 * @param {boolean} fullFeatures - Whether full features are enabled
 * @returns {object} - Generated content
 */
function generateAutoPostFallback(payload, fullFeatures = false) {
  const result = {
    productUnderstanding: {
      productType: payload.category || "General Product",
      targetCustomer: "Value-conscious buyers",
      valueTier: payload.price > 500 ? "Premium" : payload.price > 100 ? "Mid-Range" : "Budget",
      emotionalAppeal: "Quality and reliability",
      purchaseMotivation: "Practical value",
      marketPosition: "Competitive"
    },
    titles: generateFallbackTitles(payload),
    descriptions: generateFallbackDescriptions(payload),
    pricing: null,
    countries: [],
    marketInsight: "",
    adReport: generateFallbackAdReport(payload),
    revenuePrediction: null,
    fusionPackage: null,
    meta: {
      generatedAt: new Date().toISOString(),
      aiPowered: false,
      fullFeatures
    }
  };
  
  // Add full features for enterprise
  if (fullFeatures) {
    result.pricing = generateFallbackPricing(payload);
    result.countries = generateFallbackCountries(payload);
    result.marketInsight = `Targeting ${result.countries[0]?.country || "United States"} as your primary market increases success probability. This market shows ${result.countries[0]?.demandLevel || "high"} demand with ${result.countries[0]?.competition || "medium"} competition. Consider expanding to ${result.countries[1]?.country || "Canada"} and ${result.countries[2]?.country || "UK"} for 40% wider reach.`;
    result.revenuePrediction = generateFallbackRevenuePrediction(payload, result.adReport);
  }

  result.fusionPackage = buildFusionAdPackage(payload, result);
  
  return result;
}

/**
 * Generate Auto-Post content with AI (OpenAI)
 * @param {object} payload - Product data
 * @returns {object} - AI-generated content
 */
async function generateAutoPostWithAI(payload) {
  if (!openai) {
    console.warn("[Enterprise Auto-Post] OpenAI not available, using fallback");
    return generateAutoPostFallback(payload, true);
  }
  
  try {
    const prompt = generateMasterPrompt(payload);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are the AI Sales Intelligence Engine (v2 ENTERPRISE FUSION SYSTEM). Return ONLY valid JSON with one optimized result, no explanations or markdown."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2500,
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("Empty response from AI");
    }
    
    let parsedResult;
    try {
      parsedResult = JSON.parse(content);
    } catch (parseErr) {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse AI response as JSON");
      }
    }
    
    const fusionPackage = buildFusionAdPackage(payload, parsedResult);

    // Ensure required fields exist
    const result = {
      productUnderstanding: parsedResult.productUnderstanding || {
        productType: payload.category || "General Product",
        targetCustomer: "Value-conscious buyers",
        valueTier: "Mid-Range",
        emotionalAppeal: "Quality",
        purchaseMotivation: "Value",
        marketPosition: "Competitive"
      },
      titles: Array.isArray(parsedResult.titles) && parsedResult.titles.length > 0
        ? parsedResult.titles
        : [{ id: 1, text: fusionPackage.headline }],
      descriptions: Array.isArray(parsedResult.descriptions) && parsedResult.descriptions.length > 0
        ? parsedResult.descriptions
        : [{ id: 1, text: fusionPackage.description }],
      pricing: parsedResult.pricing || generateFallbackPricing(payload),
      countries: parsedResult.countries || generateFallbackCountries(payload),
      marketInsight: parsedResult.marketInsight || "",
      adReport: parsedResult.adReport || generateFallbackAdReport(payload),
      revenuePrediction: parsedResult.revenuePrediction || generateFallbackRevenuePrediction(payload, parsedResult.adReport || {}),
      fusionPackage,
      meta: {
        generatedAt: new Date().toISOString(),
        aiPowered: true,
        fullFeatures: true,
        model: "gpt-4o"
      }
    };
    
    return result;
    
  } catch (error) {
    console.error("[Enterprise Auto-Post] AI generation error:", error.message);
    // Fallback to non-AI generation
    return generateAutoPostFallback(payload, true);
  }
}

/**
 * Main entry point: Generate Enterprise Auto-Post
 * @param {object} payload - Product data
 * @param {object} accessInfo - Access control info
 * @returns {object} - Generated auto-post content
 */
async function generateEnterpriseAutoPost(payload, accessInfo) {
  const { aiEnabled, fullFeatures } = accessInfo;
  
  // Merge AI enabled flag into payload
  const enhancedPayload = {
    ...payload,
    aiEnabled
  };
  
  if (aiEnabled && fullFeatures) {
    return await generateAutoPostWithAI(enhancedPayload);
  }
  
  return generateAutoPostFallback(enhancedPayload, fullFeatures);
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  verifyAutoPostAccess,
  generateEnterpriseAutoPost,
  generateAutoPostFallback,
  generateAutoPostWithAI,
  generateMasterPrompt,
  SUBSCRIPTION_ACCESS,
  GLOBAL_MARKET_DATA
};
