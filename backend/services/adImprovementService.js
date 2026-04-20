/**
 * Ad Improvement Service
 * AI-Powered Ad Analysis and Recommendations
 * 
 * Access Control:
 *   - Enterprise, Pro, Hot users: Full access (with tier-based features)
 *   - Normal, Premium users: NO access
 * 
 * Features by Tier:
 *   - Pro:        Basic issue detection + 1-2 recommendations
 *   - Hot:        Advanced issue detection + multiple recommendations + multi-tone suggestions
 *   - Enterprise: Full AI report + global targeting insights + advanced optimization
 */

// Initialize OpenAI conditionally (only if API key is available)
let openai = null;
try {
  if (process.env.OPENAI_API_KEY) {
    const { OpenAI } = require("openai");
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
} catch (err) {
  console.warn("[Ad Improvement Service] OpenAI initialization skipped:", err.message);
}

// ─── Subscription Configuration ─────────────────────────────────────────────

const ALLOWED_SUBSCRIPTION_LEVELS = ["pro", "hot", "enterprise"];

const SUBSCRIPTION_FEATURES = {
  pro: {
    issueDetectionLevel: "basic",
    maxRecommendations: 2,
    includeMultiTone: false,
    includeGlobalInsights: false,
    includeAdvancedOptimization: false,
    analysisDepth: "standard"
  },
  hot: {
    issueDetectionLevel: "advanced",
    maxRecommendations: 5,
    includeMultiTone: true,
    includeGlobalInsights: false,
    includeAdvancedOptimization: false,
    analysisDepth: "detailed"
  },
  enterprise: {
    issueDetectionLevel: "comprehensive",
    maxRecommendations: 10,
    includeMultiTone: true,
    includeGlobalInsights: true,
    includeAdvancedOptimization: true,
    analysisDepth: "comprehensive"
  }
};

// ─── Issue Detection Categories ─────────────────────────────────────────────

const ISSUE_CATEGORIES = {
  headline: {
    weakHeadline: "Weak headline detected",
    longHeadline: "Headline too long (over 60 characters)",
    noCallToAction: "Missing call-to-action in headline",
    genericHeadline: "Generic/vague headline",
    noBenefit: "Headline lacks clear benefit statement"
  },
  attention: {
    lowAttentionOpening: "Low attention opening",
    weakHook: "Weak hook in first sentence",
    buriedLede: "Key value proposition is buried"
  },
  product: {
    productClarity: "Product/service unclear",
    missingPrice: "Price information missing or unclear",
    noValueProposition: "No clear value proposition",
    featureOverload: "Too many features listed without benefits"
  },
  audience: {
    audienceTargeting: "Audience targeting issues",
    tooGeneric: "Ad too generic for target audience",
    mismatchedTone: "Tone doesn't match target demographic"
  },
  media: {
    lowQualityMedia: "Media quality concerns",
    missingAltText: "Missing media description",
    videoTooLong: "Video exceeds optimal length",
    poorThumbnail: "Video opening may not capture attention"
  }
};

// ─── Recommendation Templates ───────────────────────────────────────────────

const RECOMMENDATION_TEMPLATES = {
  headline: [
    "Shorten headline to under 60 characters",
    "Add a clear call-to-action (e.g., 'Buy Now', 'Learn More')",
    "Lead with the main benefit",
    "Include a number or statistic for credibility",
    "Use power words (Free, New, Exclusive, Limited)"
  ],
  attention: [
    "Start with a question to engage readers",
    "Lead with the most compelling benefit",
    "Use an attention-grabbing statistic",
    "Create urgency in the opening line",
    "Address a pain point immediately"
  ],
  product: [
    "Add price clarity (exact price or price range)",
    "List top 3 benefits, not just features",
    "Add social proof (reviews, testimonials)",
    "Include warranty or guarantee information",
    "Highlight what makes you different from competitors"
  ],
  audience: [
    "Target specific audience segments",
    "Use language that resonates with your demographic",
    "Address specific pain points of your audience",
    "Include industry-specific terminology",
    "Adjust tone to match audience expectations"
  ],
  media: [
    "Use higher resolution images (minimum 1080p)",
    "Improve video opening (first 3 seconds)",
    "Add captions/subtitles to video",
    "Use lifestyle images showing product in use",
    "Optimize thumbnail for click-through"
  ]
};

// ─── Subscription Access Check ──────────────────────────────────────────────

/**
 * Check if user has access to Ad Improvement Report
 * @param {string} subscriptionLevel - User's subscription level
 * @returns {{ hasAccess: boolean, message?: string }}
 */
function checkSubscriptionAccess(subscriptionLevel) {
  if (!subscriptionLevel) {
    return {
      hasAccess: false,
      message: "Subscription level not provided"
    };
  }

  const normalizedLevel = subscriptionLevel.toLowerCase().trim();
  
  if (!ALLOWED_SUBSCRIPTION_LEVELS.includes(normalizedLevel)) {
    return {
      hasAccess: false,
      message: `Ad Improvement Report is only available for Pro, Hot, and Enterprise subscribers. Current subscription: ${subscriptionLevel}`
    };
  }

  return {
    hasAccess: true,
    features: SUBSCRIPTION_FEATURES[normalizedLevel]
  };
}

// ─── Issue Detection ────────────────────────────────────────────────────────

/**
 * Analyze ad title for issues
 * @param {string} title - Ad title
 * @param {string} analysisLevel - basic|advanced|comprehensive
 * @returns {string[]} - Array of detected issues
 */
function analyzeTitle(title, analysisLevel) {
  const issues = [];
  
  if (!title || title.trim().length === 0) {
    issues.push(ISSUE_CATEGORIES.headline.weakHeadline);
    return issues;
  }

  const trimmedTitle = title.trim();

  // Basic checks (all levels)
  if (trimmedTitle.length > 60) {
    issues.push(ISSUE_CATEGORIES.headline.longHeadline);
  }
  
  if (trimmedTitle.length < 10) {
    issues.push(ISSUE_CATEGORIES.headline.weakHeadline);
  }

  // Advanced checks (hot & enterprise)
  if (analysisLevel !== "basic") {
    const ctaWords = ["buy", "get", "shop", "order", "call", "visit", "learn", "discover", "try", "start"];
    const hasCallToAction = ctaWords.some(word => trimmedTitle.toLowerCase().includes(word));
    if (!hasCallToAction) {
      issues.push(ISSUE_CATEGORIES.headline.noCallToAction);
    }

    const genericPhrases = ["best", "great", "amazing", "awesome", "quality"];
    const isGeneric = genericPhrases.some(phrase => 
      trimmedTitle.toLowerCase().includes(phrase) && trimmedTitle.split(" ").length < 5
    );
    if (isGeneric) {
      issues.push(ISSUE_CATEGORIES.headline.genericHeadline);
    }
  }

  // Comprehensive checks (enterprise only)
  if (analysisLevel === "comprehensive") {
    const benefitWords = ["save", "free", "fast", "easy", "guaranteed", "exclusive", "limited", "new"];
    const hasBenefit = benefitWords.some(word => trimmedTitle.toLowerCase().includes(word));
    if (!hasBenefit) {
      issues.push(ISSUE_CATEGORIES.headline.noBenefit);
    }
  }

  return issues;
}

/**
 * Analyze ad description for issues
 * @param {string} description - Ad description
 * @param {string} analysisLevel - basic|advanced|comprehensive
 * @returns {string[]} - Array of detected issues
 */
function analyzeDescription(description, analysisLevel) {
  const issues = [];
  
  if (!description || description.trim().length === 0) {
    issues.push(ISSUE_CATEGORIES.product.productClarity);
    issues.push(ISSUE_CATEGORIES.attention.lowAttentionOpening);
    return issues;
  }

  const trimmedDesc = description.trim();
  const sentences = trimmedDesc.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = trimmedDesc.split(/\s+/);

  // Basic checks (all levels)
  if (trimmedDesc.length < 50) {
    issues.push(ISSUE_CATEGORIES.product.productClarity);
  }

  // Check for price mentions
  const pricePattern = /\$|€|£|₦|price|cost|from\s+\d/i;
  if (!pricePattern.test(trimmedDesc)) {
    issues.push(ISSUE_CATEGORIES.product.missingPrice);
  }

  // Advanced checks (hot & enterprise)
  if (analysisLevel !== "basic") {
    // Check first sentence for hook
    if (sentences.length > 0) {
      const firstSentence = sentences[0].trim();
      if (firstSentence.length < 20 || firstSentence.split(" ").length < 4) {
        issues.push(ISSUE_CATEGORIES.attention.weakHook);
      }
    }

    // Check for value proposition
    const valueWords = ["benefit", "advantage", "unique", "only", "exclusive", "best", "top"];
    const hasValue = valueWords.some(word => trimmedDesc.toLowerCase().includes(word));
    if (!hasValue && words.length > 30) {
      issues.push(ISSUE_CATEGORIES.product.noValueProposition);
    }
  }

  // Comprehensive checks (enterprise only)
  if (analysisLevel === "comprehensive") {
    // Check for feature overload
    const featureIndicators = trimmedDesc.match(/[-•]\s/g);
    if (featureIndicators && featureIndicators.length > 6) {
      issues.push(ISSUE_CATEGORIES.product.featureOverload);
    }

    // Check for buried lede
    if (sentences.length > 3) {
      const middleSentences = sentences.slice(1, 3).join(" ").toLowerCase();
      const keyWords = ["buy", "order", "special", "discount", "free", "limited"];
      const hasKeyInfo = keyWords.some(word => middleSentences.includes(word));
      const firstHasKeyInfo = keyWords.some(word => sentences[0].toLowerCase().includes(word));
      if (hasKeyInfo && !firstHasKeyInfo) {
        issues.push(ISSUE_CATEGORIES.attention.buriedLede);
      }
    }
  }

  return issues;
}

/**
 * Analyze target audience alignment
 * @param {object} adData - Ad data with category, targetAudience
 * @param {string} analysisLevel - basic|advanced|comprehensive
 * @returns {string[]} - Array of detected issues
 */
function analyzeAudienceTargeting(adData, analysisLevel) {
  const issues = [];
  const { category, targetAudience, title, description } = adData;

  // Basic check: Is target audience specified?
  if (!targetAudience || targetAudience.trim().length === 0) {
    issues.push(ISSUE_CATEGORIES.audience.audienceTargeting);
    return issues;
  }

  // Advanced checks
  if (analysisLevel !== "basic") {
    // Check if ad seems too generic
    const genericAudiences = ["everyone", "all", "anybody", "anyone", "general"];
    const isGenericAudience = genericAudiences.some(term => 
      targetAudience.toLowerCase().includes(term)
    );
    if (isGenericAudience) {
      issues.push(ISSUE_CATEGORIES.audience.tooGeneric);
    }
  }

  // Comprehensive checks
  if (analysisLevel === "comprehensive") {
    // Check tone/audience mismatch
    const formalTones = ["professional", "business", "corporate", "enterprise"];
    const casualContent = /(lol|wow|amazing!|!!|emoji)/i;
    
    const isFormalAudience = formalTones.some(term => 
      (targetAudience || "").toLowerCase().includes(term) ||
      (category || "").toLowerCase().includes(term)
    );
    
    const contentText = `${title || ""} ${description || ""}`;
    const hasCasualContent = casualContent.test(contentText);
    
    if (isFormalAudience && hasCasualContent) {
      issues.push(ISSUE_CATEGORIES.audience.mismatchedTone);
    }
  }

  return issues;
}

/**
 * Analyze media quality and effectiveness
 * @param {object} mediaInfo - Media metadata
 * @param {string} analysisLevel - basic|advanced|comprehensive
 * @returns {string[]} - Array of detected issues
 */
function analyzeMedia(mediaInfo, analysisLevel) {
  const issues = [];

  if (!mediaInfo || (!mediaInfo.imageUrl && !mediaInfo.videoUrl)) {
    return issues; // No media to analyze
  }

  // Basic checks
  if (mediaInfo.imageUrl && !mediaInfo.altText) {
    issues.push(ISSUE_CATEGORIES.media.missingAltText);
  }

  // Advanced checks
  if (analysisLevel !== "basic") {
    if (mediaInfo.videoUrl) {
      // Video length check
      if (mediaInfo.videoDuration && mediaInfo.videoDuration > 60) {
        issues.push(ISSUE_CATEGORIES.media.videoTooLong);
      }
    }
  }

  // Comprehensive checks
  if (analysisLevel === "comprehensive") {
    if (mediaInfo.imageQuality && mediaInfo.imageQuality < 720) {
      issues.push(ISSUE_CATEGORIES.media.lowQualityMedia);
    }

    if (mediaInfo.videoUrl && mediaInfo.videoOpeningScore && mediaInfo.videoOpeningScore < 50) {
      issues.push(ISSUE_CATEGORIES.media.poorThumbnail);
    }
  }

  return issues;
}

// ─── Success Probability Calculation ────────────────────────────────────────

/**
 * Calculate success probability based on ad quality
 * @param {string[]} issues - Array of detected issues
 * @param {object} adData - Ad data
 * @param {number|null} attentionScore - Attention score if available
 * @returns {number} - Success probability 0-100
 */
function calculateSuccessProbability(issues, adData, attentionScore = null) {
  let baseScore = 70; // Start with base score

  // Deduct for each issue
  const issueDeductions = {
    [ISSUE_CATEGORIES.headline.weakHeadline]: 15,
    [ISSUE_CATEGORIES.headline.longHeadline]: 5,
    [ISSUE_CATEGORIES.headline.noCallToAction]: 8,
    [ISSUE_CATEGORIES.headline.genericHeadline]: 7,
    [ISSUE_CATEGORIES.headline.noBenefit]: 6,
    [ISSUE_CATEGORIES.attention.lowAttentionOpening]: 12,
    [ISSUE_CATEGORIES.attention.weakHook]: 8,
    [ISSUE_CATEGORIES.attention.buriedLede]: 6,
    [ISSUE_CATEGORIES.product.productClarity]: 15,
    [ISSUE_CATEGORIES.product.missingPrice]: 10,
    [ISSUE_CATEGORIES.product.noValueProposition]: 8,
    [ISSUE_CATEGORIES.product.featureOverload]: 5,
    [ISSUE_CATEGORIES.audience.audienceTargeting]: 12,
    [ISSUE_CATEGORIES.audience.tooGeneric]: 8,
    [ISSUE_CATEGORIES.audience.mismatchedTone]: 10,
    [ISSUE_CATEGORIES.media.lowQualityMedia]: 7,
    [ISSUE_CATEGORIES.media.missingAltText]: 3,
    [ISSUE_CATEGORIES.media.videoTooLong]: 5,
    [ISSUE_CATEGORIES.media.poorThumbnail]: 8
  };

  issues.forEach(issue => {
    const deduction = issueDeductions[issue] || 5;
    baseScore -= deduction;
  });

  // Factor in attention score if available
  if (attentionScore !== null && attentionScore >= 0 && attentionScore <= 100) {
    baseScore = Math.round((baseScore * 0.7) + (attentionScore * 0.3));
  }

  // Bonus for good practices
  if (adData.title && adData.title.length >= 20 && adData.title.length <= 60) {
    baseScore += 5;
  }
  if (adData.description && adData.description.length >= 100) {
    baseScore += 5;
  }
  if (adData.targetAudience && adData.targetAudience.length > 10) {
    baseScore += 5;
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(baseScore)));
}

// ─── Recommendation Generator ───────────────────────────────────────────────

/**
 * Generate recommendations based on detected issues
 * @param {string[]} issues - Array of detected issues
 * @param {object} features - Subscription features
 * @returns {string[]} - Array of recommendations
 */
function generateRecommendations(issues, features) {
  const recommendations = [];
  const { maxRecommendations } = features;

  // Map issues to recommendation categories
  issues.forEach(issue => {
    if (recommendations.length >= maxRecommendations) return;

    for (const [category, categoryIssues] of Object.entries(ISSUE_CATEGORIES)) {
      if (Object.values(categoryIssues).includes(issue)) {
        const categoryRecs = RECOMMENDATION_TEMPLATES[category] || [];
        const availableRecs = categoryRecs.filter(rec => !recommendations.includes(rec));
        if (availableRecs.length > 0) {
          recommendations.push(availableRecs[0]);
        }
        break;
      }
    }
  });

  return recommendations.slice(0, maxRecommendations);
}

/**
 * Generate multi-tone suggestions (Hot & Enterprise only)
 * @param {string} title - Ad title
 * @param {string} description - Ad description
 * @returns {object} - Tone variations
 */
function generateMultiToneSuggestions(title, description) {
  return {
    professional: {
      titleExample: `${(title || "Your Product").split(" ").slice(0, 3).join(" ")} - Professional Grade Solution`,
      toneDescription: "Formal, business-focused language"
    },
    casual: {
      titleExample: `Hey! Check out ${(title || "this").split(" ").slice(0, 2).join(" ")} 🔥`,
      toneDescription: "Friendly, approachable tone"
    },
    urgent: {
      titleExample: `Limited Time: ${(title || "Deal").split(" ").slice(0, 3).join(" ")} - Act Now!`,
      toneDescription: "Creates sense of urgency"
    },
    benefit_focused: {
      titleExample: `Save Time & Money with ${(title || "Our Solution").split(" ").slice(0, 2).join(" ")}`,
      toneDescription: "Highlights key benefits upfront"
    }
  };
}

/**
 * Generate global targeting insights (Enterprise only)
 * @param {string} category - Ad category
 * @param {string} targetAudience - Target audience
 * @returns {object} - Global insights
 */
function generateGlobalInsights(category, targetAudience) {
  const regionInsights = {
    "North America": {
      recommended: true,
      tips: ["Emphasize convenience and time-saving", "Include price in USD"],
      peakHours: "9 AM - 5 PM EST"
    },
    "Europe": {
      recommended: true,
      tips: ["Consider multiple languages", "Highlight quality and sustainability"],
      peakHours: "10 AM - 6 PM CET"
    },
    "Asia Pacific": {
      recommended: true,
      tips: ["Mobile-first optimization critical", "Consider local payment methods"],
      peakHours: "7 PM - 11 PM Local"
    },
    "Middle East": {
      recommended: true,
      tips: ["Respect cultural considerations", "Premium positioning works well"],
      peakHours: "8 PM - 12 AM Local"
    },
    "Africa": {
      recommended: true,
      tips: ["Emphasize value and durability", "Mobile money integration important"],
      peakHours: "6 PM - 10 PM Local"
    },
    "Latin America": {
      recommended: true,
      tips: ["Spanish/Portuguese localization", "Installment payments popular"],
      peakHours: "7 PM - 11 PM Local"
    }
  };

  return {
    regions: regionInsights,
    categorySpecificTip: `For ${category || "general"} category, consider regional pricing strategies`,
    audienceExpansion: `Based on "${targetAudience || "general"}" targeting, similar audiences exist globally`
  };
}

/**
 * Generate advanced optimization suggestions (Enterprise only)
 * @param {object} adData - Full ad data
 * @param {string[]} issues - Detected issues
 * @returns {object} - Advanced optimization suggestions
 */
function generateAdvancedOptimization(adData, issues) {
  return {
    abTestingSuggestions: [
      "Test headline with vs without price",
      "Compare image-first vs video-first layouts",
      "Test different call-to-action buttons"
    ],
    competitorAnalysis: {
      tip: "Analyze top competitors in your category for messaging gaps",
      focusAreas: ["Unique selling proposition", "Price positioning", "Visual style"]
    },
    conversionOptimization: {
      landingPageTips: [
        "Ensure message match between ad and landing page",
        "Reduce form fields to minimum",
        "Add trust signals (reviews, certifications)"
      ],
      funnelSuggestions: [
        "Consider retargeting for non-converters",
        "Test limited-time offers",
        "Add social proof elements"
      ]
    },
    mediaOptimization: {
      imageRecommendations: ["A/B test product-only vs lifestyle images"],
      videoRecommendations: ["Front-load key message in first 3 seconds", "Add captions for silent viewing"]
    }
  };
}

// ─── Main Analysis Function ─────────────────────────────────────────────────

/**
 * Generate Ad Improvement Report
 * @param {object} params - Analysis parameters
 * @param {string} params.subscriptionLevel - User subscription level
 * @param {string} params.title - Ad title
 * @param {string} params.description - Ad description
 * @param {object} params.media - Media information
 * @param {string} params.category - Ad category
 * @param {string} params.targetAudience - Target audience
 * @param {number|null} params.attentionScore - Attention score if available
 * @param {object|null} params.historicalPerformance - Historical ad performance
 * @returns {object} - Ad improvement report
 */
async function generateAdImprovementReport({
  subscriptionLevel,
  title,
  description,
  media = null,
  category = null,
  targetAudience = null,
  attentionScore = null,
  historicalPerformance = null
}) {
  // Check subscription access
  const accessCheck = checkSubscriptionAccess(subscriptionLevel);
  if (!accessCheck.hasAccess) {
    return {
      success: false,
      error: accessCheck.message,
      subscriptionLevel: subscriptionLevel || "unknown"
    };
  }

  const features = accessCheck.features;
  const analysisLevel = features.analysisDepth === "standard" ? "basic" :
                        features.analysisDepth === "detailed" ? "advanced" : "comprehensive";

  // Collect all issues
  const allIssues = [];
  
  // Analyze title
  const titleIssues = analyzeTitle(title, analysisLevel);
  allIssues.push(...titleIssues);

  // Analyze description
  const descriptionIssues = analyzeDescription(description, analysisLevel);
  allIssues.push(...descriptionIssues);

  // Analyze audience targeting
  const audienceIssues = analyzeAudienceTargeting({
    category,
    targetAudience,
    title,
    description
  }, analysisLevel);
  allIssues.push(...audienceIssues);

  // Analyze media
  if (media) {
    const mediaIssues = analyzeMedia(media, analysisLevel);
    allIssues.push(...mediaIssues);
  }

  // Remove duplicates
  const uniqueIssues = [...new Set(allIssues)];

  // Calculate success probability
  const successProbability = calculateSuccessProbability(
    uniqueIssues,
    { title, description, targetAudience },
    attentionScore
  );

  // Generate recommendations
  const recommendations = generateRecommendations(uniqueIssues, features);

  // Build response
  const response = {
    success: true,
    issues: uniqueIssues,
    successProbability,
    recommendations,
    subscriptionLevel: subscriptionLevel.toLowerCase()
  };

  // Add multi-tone suggestions for Hot & Enterprise
  if (features.includeMultiTone) {
    response.toneSuggestions = generateMultiToneSuggestions(title, description);
  }

  // Add global insights for Enterprise
  if (features.includeGlobalInsights) {
    response.globalInsights = generateGlobalInsights(category, targetAudience);
  }

  // Add advanced optimization for Enterprise
  if (features.includeAdvancedOptimization) {
    response.advancedOptimization = generateAdvancedOptimization(
      { title, description, media, category, targetAudience },
      uniqueIssues
    );
  }

  // Add metadata
  response.metadata = {
    analysisLevel,
    featuresIncluded: {
      multiTone: features.includeMultiTone,
      globalInsights: features.includeGlobalInsights,
      advancedOptimization: features.includeAdvancedOptimization
    },
    timestamp: new Date().toISOString()
  };

  return response;
}

/**
 * Generate AI-Enhanced Report using OpenAI (optional enhancement)
 * Uses OpenAI for more nuanced analysis when API key is available
 */
async function generateAIEnhancedReport({
  subscriptionLevel,
  title,
  description,
  category,
  targetAudience
}) {
  // First run the standard analysis
  const baseReport = await generateAdImprovementReport({
    subscriptionLevel,
    title,
    description,
    category,
    targetAudience
  });

  // If no access or OpenAI not configured, return base report
  if (!baseReport.success || !openai) {
    return baseReport;
  }

  try {
    // Enhance with AI for Enterprise users
    if (subscriptionLevel.toLowerCase() === "enterprise") {
      const prompt = `You are an expert advertising consultant. Analyze this ad and provide 2-3 specific improvements:

Title: ${title || "Not provided"}
Description: ${description || "Not provided"}
Category: ${category || "General"}
Target Audience: ${targetAudience || "General"}

Detected Issues: ${baseReport.issues.join(", ") || "None"}

Provide specific, actionable suggestions in JSON format:
{
  "aiSuggestions": ["suggestion1", "suggestion2", "suggestion3"],
  "improvedTitleExample": "example title",
  "keyInsight": "one key insight about this ad"
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.7
      });

      const aiResponse = completion.choices[0]?.message?.content;
      if (aiResponse) {
        try {
          const aiData = JSON.parse(aiResponse);
          baseReport.aiEnhancedSuggestions = aiData;
        } catch (parseError) {
          baseReport.aiEnhancedSuggestions = { rawResponse: aiResponse };
        }
      }
    }
  } catch (aiError) {
    console.error("[AI Enhancement Error]", aiError.message);
    // Continue with base report if AI fails
  }

  return baseReport;
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  generateAdImprovementReport,
  generateAIEnhancedReport,
  checkSubscriptionAccess,
  ALLOWED_SUBSCRIPTION_LEVELS,
  SUBSCRIPTION_FEATURES,
  ISSUE_CATEGORIES
};
