/**
 * Enterprise AI Ad Doctor Service
 * Advanced Strategic Diagnosis, Global Optimization Intelligence & Execution Guidance
 * 
 * ACCESS CONTROL:
 *   - Feature available ONLY for Enterprise subscription users
 *   - All other plans: Access denied
 * 
 * ROLE:
 *   Acts as a senior AI Advertising Strategist combining:
 *   • Creative analysis
 *   • Global market intelligence
 *   • Audience psychology
 *   • Competitive positioning
 *   • Engagement optimization
 */

const axios = require("axios");

// ─── Access Control ─────────────────────────────────────────────────────────

/**
 * Verify Enterprise access
 * @param {string} subscriptionPlan - User's subscription plan
 * @returns {{ hasAccess: boolean, error?: string }}
 */
function verifyEnterpriseAccess(subscriptionPlan) {
  if (!subscriptionPlan) {
    return { hasAccess: false, error: "Enterprise access required" };
  }
  
  const normalizedPlan = subscriptionPlan.toLowerCase().trim();
  
  if (normalizedPlan !== "enterprise") {
    return { 
      hasAccess: false, 
      error: "Enterprise access required" 
    };
  }
  
  return { hasAccess: true };
}

// ─── Diagnosis Labels ───────────────────────────────────────────────────────

const DIAGNOSIS_LABELS = {
  STRONG: "✅ Strong",
  NEEDS_IMPROVEMENT: "⚠️ Needs Improvement",
  CRITICAL: "🚨 Critical Weakness"
};

// ─── Global Market Data ─────────────────────────────────────────────────────

const GLOBAL_MARKET_DATA = {
  // Demand & Competition by Region
  regions: {
    "United States": { demandScore: 95, competition: "high", engagementProbability: 0.78, peakHours: "12PM-3PM EST" },
    "Canada": { demandScore: 88, competition: "medium", engagementProbability: 0.82, peakHours: "12PM-3PM EST" },
    "United Kingdom": { demandScore: 90, competition: "high", engagementProbability: 0.75, peakHours: "6PM-9PM GMT" },
    "Germany": { demandScore: 85, competition: "medium", engagementProbability: 0.80, peakHours: "6PM-9PM CET" },
    "France": { demandScore: 82, competition: "medium", engagementProbability: 0.76, peakHours: "7PM-10PM CET" },
    "Australia": { demandScore: 80, competition: "medium", engagementProbability: 0.79, peakHours: "7PM-10PM AEST" },
    "Nigeria": { demandScore: 75, competition: "low", engagementProbability: 0.85, peakHours: "7PM-10PM WAT" },
    "South Africa": { demandScore: 72, competition: "low", engagementProbability: 0.81, peakHours: "6PM-9PM SAST" },
    "UAE": { demandScore: 78, competition: "medium", engagementProbability: 0.77, peakHours: "8PM-11PM GST" },
    "Singapore": { demandScore: 83, competition: "medium", engagementProbability: 0.84, peakHours: "8PM-11PM SGT" },
    "Netherlands": { demandScore: 79, competition: "low", engagementProbability: 0.83, peakHours: "7PM-10PM CET" },
    "Sweden": { demandScore: 76, competition: "low", engagementProbability: 0.82, peakHours: "6PM-9PM CET" },
    "Brazil": { demandScore: 77, competition: "medium", engagementProbability: 0.74, peakHours: "8PM-11PM BRT" },
    "Mexico": { demandScore: 74, competition: "medium", engagementProbability: 0.73, peakHours: "7PM-10PM CST" },
    "India": { demandScore: 88, competition: "high", engagementProbability: 0.71, peakHours: "8PM-11PM IST" },
    "Japan": { demandScore: 84, competition: "high", engagementProbability: 0.76, peakHours: "8PM-11PM JST" },
    "South Korea": { demandScore: 82, competition: "medium", engagementProbability: 0.79, peakHours: "9PM-12AM KST" },
    "Indonesia": { demandScore: 73, competition: "low", engagementProbability: 0.80, peakHours: "7PM-10PM WIB" },
    "Philippines": { demandScore: 71, competition: "low", engagementProbability: 0.82, peakHours: "8PM-11PM PHT" },
    "Kenya": { demandScore: 68, competition: "low", engagementProbability: 0.84, peakHours: "7PM-10PM EAT" },
    "Egypt": { demandScore: 70, competition: "low", engagementProbability: 0.78, peakHours: "8PM-11PM EET" },
    "Saudi Arabia": { demandScore: 76, competition: "medium", engagementProbability: 0.75, peakHours: "9PM-12AM AST" }
  },
  
  // Emerging markets with growth potential
  emergingMarkets: [
    { country: "Singapore", reason: "Rapid buyer growth", growthRate: "18%" },
    { country: "Netherlands", reason: "Low competition trend", growthRate: "15%" },
    { country: "Indonesia", reason: "Expanding digital adoption", growthRate: "22%" },
    { country: "Kenya", reason: "Mobile commerce surge", growthRate: "25%" },
    { country: "Philippines", reason: "Young demographic boom", growthRate: "20%" },
    { country: "Vietnam", reason: "E-commerce expansion", growthRate: "28%" },
    { country: "Poland", reason: "Growing purchasing power", growthRate: "14%" },
    { country: "Colombia", reason: "Digital transformation", growthRate: "16%" }
  ]
};

// ─── Category Market Intelligence ───────────────────────────────────────────

const CATEGORY_INSIGHTS = {
  "Tech": {
    highDemandRegions: ["United States", "Germany", "Japan", "South Korea"],
    competitionLevel: "high",
    bestAudiences: ["Tech enthusiasts", "Early adopters", "Professionals 25-45"],
    optimalPostingTimes: ["12PM-3PM North America", "6PM-9PM Europe", "9PM-12AM Asia"]
  },
  "Fashion": {
    highDemandRegions: ["United States", "United Kingdom", "France", "UAE"],
    competitionLevel: "high",
    bestAudiences: ["Fashion-conscious 18-35", "Luxury buyers", "Trend followers"],
    optimalPostingTimes: ["6PM-9PM Europe", "12PM-3PM North America", "8PM-11PM Middle East"]
  },
  "Electronics": {
    highDemandRegions: ["United States", "Japan", "Germany", "South Korea"],
    competitionLevel: "very high",
    bestAudiences: ["Tech buyers", "Gadget enthusiasts", "Home automation users"],
    optimalPostingTimes: ["12PM-3PM North America", "7PM-10PM Europe", "8PM-11PM Asia"]
  },
  "Health": {
    highDemandRegions: ["United States", "United Kingdom", "Australia", "Canada"],
    competitionLevel: "medium",
    bestAudiences: ["Health-conscious adults", "Fitness enthusiasts", "Wellness seekers"],
    optimalPostingTimes: ["6AM-9AM Local", "6PM-9PM Local"]
  },
  "Home": {
    highDemandRegions: ["United States", "Germany", "Australia", "Canada"],
    competitionLevel: "medium",
    bestAudiences: ["Homeowners 30-55", "Interior design enthusiasts", "DIY community"],
    optimalPostingTimes: ["7PM-10PM Local weekend", "12PM-2PM weekday"]
  },
  "Automotive": {
    highDemandRegions: ["United States", "Germany", "UAE", "Japan"],
    competitionLevel: "high",
    bestAudiences: ["Car enthusiasts", "Professionals 30-50", "Luxury buyers"],
    optimalPostingTimes: ["6PM-9PM Local", "Weekend afternoons"]
  },
  "Food": {
    highDemandRegions: ["United States", "United Kingdom", "France", "Japan"],
    competitionLevel: "medium",
    bestAudiences: ["Foodies", "Health-conscious consumers", "Busy professionals"],
    optimalPostingTimes: ["11AM-1PM Local", "5PM-7PM Local"]
  },
  "Services": {
    highDemandRegions: ["United States", "United Kingdom", "Canada", "Australia"],
    competitionLevel: "medium",
    bestAudiences: ["Business professionals", "Small business owners", "Decision makers"],
    optimalPostingTimes: ["9AM-12PM Business hours", "6PM-9PM Local"]
  },
  "General": {
    highDemandRegions: ["United States", "United Kingdom", "Canada", "Germany"],
    competitionLevel: "medium",
    bestAudiences: ["General consumers", "Online shoppers", "Value seekers"],
    optimalPostingTimes: ["12PM-3PM North America", "6PM-9PM Europe"]
  }
};

// ─── 1️⃣ AD DIAGNOSIS ENGINE ─────────────────────────────────────────────────

/**
 * Analyze advertisement quality across multiple dimensions
 * @param {object} adData - Advertisement data
 * @returns {string[]} - Array of diagnosis labels
 */
function runDiagnosisEngine(adData) {
  const { adTitle, adDescription, mediaType, adCategory, audienceTargeting, attentionScore, competitorInsights } = adData;
  const diagnosis = [];

  // Headline Strength Analysis
  if (!adTitle || adTitle.trim().length < 10) {
    diagnosis.push(`${DIAGNOSIS_LABELS.CRITICAL} Weak headline — lacks compelling hook`);
  } else if (adTitle.length > 60) {
    diagnosis.push(`${DIAGNOSIS_LABELS.NEEDS_IMPROVEMENT} Headline too long — reduce for clarity`);
  } else {
    const powerWords = ["free", "new", "exclusive", "limited", "save", "discover", "transform", "unlock", "boost", "instant"];
    const hasPowerWord = powerWords.some(word => adTitle.toLowerCase().includes(word));
    if (hasPowerWord) {
      diagnosis.push(`${DIAGNOSIS_LABELS.STRONG} Headline strength — compelling power words detected`);
    } else {
      diagnosis.push(`${DIAGNOSIS_LABELS.NEEDS_IMPROVEMENT} Headline could use stronger action words`);
    }
  }

  // Attention Opening Impact
  if (adDescription) {
    const firstSentence = adDescription.split(/[.!?]/)[0] || "";
    const attentionGrabbers = ["imagine", "discover", "finally", "introducing", "stop", "don't miss", "what if", "ready to"];
    const hasAttentionGrabber = attentionGrabbers.some(word => firstSentence.toLowerCase().includes(word));
    
    if (hasAttentionGrabber) {
      diagnosis.push(`${DIAGNOSIS_LABELS.STRONG} Attention opening — strong hook detected`);
    } else if (firstSentence.length < 20) {
      diagnosis.push(`${DIAGNOSIS_LABELS.CRITICAL} Weak opening — fails to capture attention`);
    } else {
      diagnosis.push(`${DIAGNOSIS_LABELS.NEEDS_IMPROVEMENT} Opening could be more attention-grabbing`);
    }
  } else {
    diagnosis.push(`${DIAGNOSIS_LABELS.CRITICAL} Missing description — no message to analyze`);
  }

  // Message Clarity
  if (adDescription && adDescription.length > 50) {
    const clarityIndicators = /\$|€|£|₦|\d+%|buy|get|order|call|visit|learn|price|cost/i;
    if (clarityIndicators.test(adDescription)) {
      diagnosis.push(`${DIAGNOSIS_LABELS.STRONG} Message clarity — clear value proposition`);
    } else {
      diagnosis.push(`${DIAGNOSIS_LABELS.NEEDS_IMPROVEMENT} Message clarity — add specific offer details`);
    }
  } else {
    diagnosis.push(`${DIAGNOSIS_LABELS.NEEDS_IMPROVEMENT} Message too brief — expand value proposition`);
  }

  // Audience Relevance
  if (!audienceTargeting || audienceTargeting.trim().length === 0) {
    diagnosis.push(`${DIAGNOSIS_LABELS.CRITICAL} Audience targeting undefined`);
  } else {
    const genericAudiences = ["everyone", "all", "anybody", "general public", "all ages"];
    const isGeneric = genericAudiences.some(term => audienceTargeting.toLowerCase().includes(term));
    if (isGeneric) {
      diagnosis.push(`${DIAGNOSIS_LABELS.NEEDS_IMPROVEMENT} Audience too broad — narrow targeting recommended`);
    } else {
      diagnosis.push(`${DIAGNOSIS_LABELS.STRONG} Audience targeting — specific segment defined`);
    }
  }

  // Emotional Persuasion
  const emotionalTriggers = ["transform", "imagine", "love", "hate", "fear", "dream", "hope", "relief", "joy", "frustrated", "tired of"];
  const contentText = `${adTitle || ""} ${adDescription || ""}`.toLowerCase();
  const hasEmotionalTrigger = emotionalTriggers.some(word => contentText.includes(word));
  
  if (hasEmotionalTrigger) {
    diagnosis.push(`${DIAGNOSIS_LABELS.STRONG} Emotional persuasion — psychological triggers active`);
  } else {
    diagnosis.push(`${DIAGNOSIS_LABELS.NEEDS_IMPROVEMENT} Emotional appeal — add psychological triggers`);
  }

  // Competitive Pressure
  if (competitorInsights && competitorInsights.saturationLevel) {
    if (competitorInsights.saturationLevel === "high") {
      diagnosis.push(`${DIAGNOSIS_LABELS.NEEDS_IMPROVEMENT} Market competition high — differentiation critical`);
    } else if (competitorInsights.saturationLevel === "low") {
      diagnosis.push(`${DIAGNOSIS_LABELS.STRONG} Low competition — market opportunity detected`);
    } else {
      diagnosis.push(`${DIAGNOSIS_LABELS.NEEDS_IMPROVEMENT} Moderate competition — positioning optimization needed`);
    }
  } else {
    const categoryCompetition = CATEGORY_INSIGHTS[adCategory]?.competitionLevel || "medium";
    if (categoryCompetition === "high" || categoryCompetition === "very high") {
      diagnosis.push(`${DIAGNOSIS_LABELS.NEEDS_IMPROVEMENT} Market competition high — differentiation required`);
    } else {
      diagnosis.push(`${DIAGNOSIS_LABELS.STRONG} Manageable competition level`);
    }
  }

  // Offer Attractiveness
  const offerIndicators = ["free", "discount", "%off", "sale", "bonus", "gift", "guarantee", "warranty", "trial"];
  const hasOffer = offerIndicators.some(word => contentText.includes(word));
  
  if (hasOffer) {
    diagnosis.push(`${DIAGNOSIS_LABELS.STRONG} Offer attractiveness — incentive detected`);
  } else {
    diagnosis.push(`${DIAGNOSIS_LABELS.NEEDS_IMPROVEMENT} Add incentive or offer to increase conversion`);
  }

  return diagnosis;
}

// ─── 2️⃣ AD HEALTH SCORE ─────────────────────────────────────────────────────

/**
 * Generate Ad Health Score (0-100)
 * Represents engagement success probability
 * @param {object} adData - Advertisement data
 * @param {string[]} diagnosis - Diagnosis results
 * @returns {number} - Health score 0-100
 */
function calculateAdHealthScore(adData, diagnosis) {
  let score = 70; // Base score

  // Count diagnosis results by type
  const strongCount = diagnosis.filter(d => d.startsWith(DIAGNOSIS_LABELS.STRONG)).length;
  const improvementCount = diagnosis.filter(d => d.startsWith(DIAGNOSIS_LABELS.NEEDS_IMPROVEMENT)).length;
  const criticalCount = diagnosis.filter(d => d.startsWith(DIAGNOSIS_LABELS.CRITICAL)).length;

  // Adjust score based on diagnosis
  score += strongCount * 5;
  score -= improvementCount * 4;
  score -= criticalCount * 10;

  // Factor in attention score if provided
  if (adData.attentionScore !== null && adData.attentionScore !== undefined) {
    score = Math.round((score * 0.7) + (adData.attentionScore * 0.3));
  }

  // Creative quality bonuses
  const { adTitle, adDescription, mediaType } = adData;

  if (adTitle && adTitle.length >= 20 && adTitle.length <= 60) {
    score += 3;
  }

  if (adDescription && adDescription.length >= 100 && adDescription.length <= 500) {
    score += 5;
  }

  if (mediaType === "video") {
    score += 5; // Video content tends to have higher engagement
  }

  // Targeting alignment bonus
  if (adData.audienceTargeting && adData.audienceTargeting.length > 15) {
    score += 3;
  }

  // Clamp score to 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─── 3️⃣ GLOBAL MARKET INTELLIGENCE ─────────────────────────────────────────

/**
 * Analyze global reach countries and identify priority/emerging markets
 * CRITICAL: Never override Global Reach AI targeting
 * @param {string[]} globalReachCountries - Countries selected by Global Reach AI
 * @param {string} adCategory - Ad category
 * @param {object} adData - Full ad data
 * @returns {{ priorityCountries: object[], emergingMarkets: object[] }}
 */
function analyzeGlobalMarketIntelligence(globalReachCountries, adCategory, adData) {
  const priorityCountries = [];
  const emergingMarkets = [];

  const categoryData = CATEGORY_INSIGHTS[adCategory] || CATEGORY_INSIGHTS["General"];
  
  // Analyze countries WITHIN Global Reach selection
  if (globalReachCountries && globalReachCountries.length > 0) {
    globalReachCountries.forEach(country => {
      const marketData = GLOBAL_MARKET_DATA.regions[country];
      if (marketData) {
        priorityCountries.push({
          country,
          engagementProbability: `${Math.round(marketData.engagementProbability * 100)}%`,
          demandSignal: marketData.demandScore >= 80 ? "High" : marketData.demandScore >= 70 ? "Medium" : "Growing",
          competitionDensity: marketData.competition,
          recommendation: marketData.engagementProbability >= 0.80 
            ? `High priority — Strong engagement potential in ${country}`
            : `Optimize targeting — Good opportunity with proper positioning`,
          peakHours: marketData.peakHours
        });
      } else {
        // Country not in our data, provide general guidance
        priorityCountries.push({
          country,
          engagementProbability: "Variable",
          demandSignal: "Unknown",
          competitionDensity: "Unknown",
          recommendation: `Monitor performance — Insufficient market data for ${country}`,
          peakHours: "Test different time slots"
        });
      }
    });

    // Sort by engagement probability descending
    priorityCountries.sort((a, b) => {
      const aProb = parseFloat(a.engagementProbability) || 0;
      const bProb = parseFloat(b.engagementProbability) || 0;
      return bProb - aProb;
    });
  }

  // Identify emerging opportunities OUTSIDE current Global Reach
  const globalReachSet = new Set((globalReachCountries || []).map(c => c.toLowerCase()));
  
  GLOBAL_MARKET_DATA.emergingMarkets.forEach(market => {
    if (!globalReachSet.has(market.country.toLowerCase())) {
      const marketRegionData = GLOBAL_MARKET_DATA.regions[market.country];
      emergingMarkets.push({
        country: market.country,
        reason: market.reason,
        growthRate: market.growthRate,
        engagementProbability: marketRegionData 
          ? `${Math.round(marketRegionData.engagementProbability * 100)}%` 
          : "High potential",
        competitionLevel: marketRegionData?.competition || "Low",
        suggestion: `Consider expanding — ${market.reason} with ${market.growthRate} growth`
      });
    }
  });

  // Limit to top 5 emerging markets
  return {
    priorityCountries: priorityCountries.slice(0, 10),
    emergingMarkets: emergingMarkets.slice(0, 5)
  };
}

// ─── 4️⃣ COMPETITOR POSITIONING AI ──────────────────────────────────────────

/**
 * Analyze competitor landscape and generate positioning strategy
 * @param {object} competitorInsights - Competitor data
 * @param {string} adCategory - Ad category
 * @param {object} adData - Full ad data
 * @returns {string[]} - Positioning strategies
 */
function analyzeCompetitorPositioning(competitorInsights, adCategory, adData) {
  const strategies = [];
  const { adTitle, adDescription } = adData;
  const contentText = `${adTitle || ""} ${adDescription || ""}`.toLowerCase();

  // Determine market saturation level
  let saturationLevel = competitorInsights?.saturationLevel || "medium";
  const categoryCompetition = CATEGORY_INSIGHTS[adCategory]?.competitionLevel || "medium";
  
  if (categoryCompetition === "very high" || categoryCompetition === "high") {
    saturationLevel = "high";
  }

  // Detect messaging similarity and differentiation gaps
  const messagingSimilarity = competitorInsights?.messagingSimilarity || "unknown";
  const differentiationGap = competitorInsights?.differentiationGap || "medium";

  // Generate positioning strategies based on analysis
  if (saturationLevel === "high") {
    strategies.push("Market saturation detected — Focus on unique differentiators");
    
    // Check for price positioning opportunity
    const hasPriceAngle = /cheap|affordable|budget|value|save|discount/i.test(contentText);
    const hasPremiumAngle = /premium|luxury|exclusive|elite|best-in-class/i.test(contentText);
    
    if (!hasPriceAngle && !hasPremiumAngle) {
      strategies.push("Positioning opportunity: Compete on pricing advantage OR emphasize premium quality");
    } else if (hasPriceAngle) {
      strategies.push("Strengthen value positioning — Highlight price-to-quality ratio");
    } else {
      strategies.push("Reinforce premium positioning — Emphasize exclusivity and superior quality");
    }
  }

  // Speed/convenience angle
  const hasSpeedAngle = /fast|quick|instant|same.day|express|immediate/i.test(contentText);
  if (!hasSpeedAngle && ["Tech", "Electronics", "Services", "Food"].includes(adCategory)) {
    strategies.push("Consider highlighting faster delivery or instant access as differentiator");
  }

  // Unique feature benefit
  const hasUniqueFeature = /only|unique|exclusive|first|patented|proprietary/i.test(contentText);
  if (!hasUniqueFeature) {
    strategies.push("Highlight unique feature benefit — What makes your offer different?");
  } else {
    strategies.push("Strong: Unique value proposition detected — Amplify this differentiator");
  }

  // Trust and credibility
  const hasTrustSignals = /guarantee|certified|verified|trusted|reviews|rated|award/i.test(contentText);
  if (!hasTrustSignals) {
    strategies.push("Add trust signals — Include guarantees, certifications, or social proof");
  }

  // Category-specific strategies
  if (adCategory === "Tech" || adCategory === "Electronics") {
    strategies.push("Tech market positioning: Emphasize innovation, specs superiority, or ecosystem integration");
  } else if (adCategory === "Fashion") {
    strategies.push("Fashion positioning: Highlight style exclusivity, trend alignment, or sustainability");
  } else if (adCategory === "Health") {
    strategies.push("Health positioning: Focus on proven results, safety certifications, expert endorsements");
  }

  return strategies.slice(0, 6);
}

// ─── 5️⃣ AUDIENCE EXPANSION INTELLIGENCE ────────────────────────────────────

/**
 * Evaluate targeting efficiency and recommend improvements
 * @param {string} audienceTargeting - Current audience targeting
 * @param {string} adCategory - Ad category
 * @param {string[]} globalReachCountries - Target countries
 * @returns {string[]} - Audience optimization strategies
 */
function analyzeAudienceExpansion(audienceTargeting, adCategory, globalReachCountries) {
  const strategies = [];
  const categoryData = CATEGORY_INSIGHTS[adCategory] || CATEGORY_INSIGHTS["General"];

  if (!audienceTargeting || audienceTargeting.trim().length < 10) {
    strategies.push("CRITICAL: Define specific audience targeting for effective reach");
    strategies.push(`Recommended audiences for ${adCategory}: ${categoryData.bestAudiences.join(", ")}`);
    return strategies;
  }

  const targetingLower = audienceTargeting.toLowerCase();

  // Check targeting breadth
  const broadTerms = ["everyone", "all", "anybody", "general", "all ages", "universal"];
  const isTooGeneric = broadTerms.some(term => targetingLower.includes(term));

  if (isTooGeneric) {
    strategies.push("Audience narrowing recommended — Generic targeting reduces engagement efficiency");
    strategies.push(`Consider segmenting to: ${categoryData.bestAudiences[0]} for higher conversion rates`);
  }

  // Check for behavioral targeting
  const hasBehavioral = /buyer|shopper|enthusiast|interested in|engages with|follows/i.test(targetingLower);
  if (!hasBehavioral) {
    strategies.push("Behavioral improvement: Add interest-based or behavior-based targeting signals");
  }

  // Age targeting check
  const hasAgeTarget = /\d{2}-\d{2}|\d{2}\+|young|adult|senior|millennial|gen.?z|boomer/i.test(targetingLower);
  if (!hasAgeTarget) {
    strategies.push("Age refinement: Specify age demographics for better audience-product fit");
  }

  // Regional optimization
  if (globalReachCountries && globalReachCountries.length > 3) {
    strategies.push("Regional optimization: Consider audience variation by country for localized messaging");
  }

  // Interest refinement suggestions
  const categoryInterests = {
    "Tech": ["gadget lovers", "early adopters", "tech professionals", "software developers"],
    "Fashion": ["style enthusiasts", "trend followers", "luxury shoppers", "sustainable fashion buyers"],
    "Electronics": ["home automation users", "gaming enthusiasts", "audio enthusiasts", "smart home adopters"],
    "Health": ["fitness enthusiasts", "wellness seekers", "health-conscious parents", "athletes"],
    "Home": ["homeowners", "interior design enthusiasts", "DIY hobbyists", "new home buyers"],
    "Automotive": ["car enthusiasts", "first-time buyers", "luxury car seekers", "fleet managers"],
    "Food": ["foodies", "health-conscious eaters", "busy professionals", "meal prep enthusiasts"],
    "Services": ["small business owners", "entrepreneurs", "decision makers", "C-suite executives"]
  };

  const relevantInterests = categoryInterests[adCategory] || categoryInterests["Tech"];
  strategies.push(`Interest refinement: Consider targeting ${relevantInterests.slice(0, 2).join(" or ")} for ${adCategory} category`);

  // Lookalike expansion
  strategies.push("Expansion opportunity: Create lookalike audiences from high-converting customer segments");

  return strategies.slice(0, 5);
}

// ─── 6️⃣ BEST POSTING TIME INTELLIGENCE ─────────────────────────────────────

/**
 * Predict optimal posting windows
 * @param {string[]} globalReachCountries - Target countries
 * @param {string} adCategory - Ad category
 * @param {object} historicalSignals - Historical engagement data
 * @returns {string[]} - Optimal posting times
 */
function predictBestPostingTimes(globalReachCountries, adCategory, historicalSignals) {
  const postingTimes = [];
  const categoryData = CATEGORY_INSIGHTS[adCategory] || CATEGORY_INSIGHTS["General"];

  // Add category-specific optimal times
  if (categoryData.optimalPostingTimes) {
    categoryData.optimalPostingTimes.forEach(time => {
      postingTimes.push(time);
    });
  }

  // Add regional peak hours based on target countries
  if (globalReachCountries && globalReachCountries.length > 0) {
    const regionGroups = {
      northAmerica: ["United States", "Canada", "Mexico"],
      europe: ["United Kingdom", "Germany", "France", "Netherlands", "Sweden"],
      asia: ["Japan", "South Korea", "Singapore", "India", "Indonesia", "Philippines"],
      middleEast: ["UAE", "Saudi Arabia", "Egypt"],
      africa: ["Nigeria", "South Africa", "Kenya"],
      oceania: ["Australia"]
    };

    const targetRegions = new Set();
    
    globalReachCountries.forEach(country => {
      for (const [region, countries] of Object.entries(regionGroups)) {
        if (countries.includes(country)) {
          targetRegions.add(region);
        }
      }
    });

    // Add region-specific posting windows
    if (targetRegions.has("northAmerica")) {
      if (!postingTimes.includes("12PM-3PM North America")) {
        postingTimes.push("12PM-3PM EST (North America peak)");
      }
    }
    if (targetRegions.has("europe")) {
      if (!postingTimes.includes("6PM-9PM Europe")) {
        postingTimes.push("6PM-9PM CET (Europe evening peak)");
      }
    }
    if (targetRegions.has("asia")) {
      postingTimes.push("8PM-11PM Local (Asia evening engagement)");
    }
    if (targetRegions.has("middleEast")) {
      postingTimes.push("9PM-12AM GST (Middle East evening peak)");
    }
    if (targetRegions.has("africa")) {
      postingTimes.push("7PM-10PM Local (Africa evening engagement)");
    }
  }

  // Factor in historical signals if provided
  if (historicalSignals && historicalSignals.bestPerformingTimes) {
    historicalSignals.bestPerformingTimes.forEach(time => {
      if (!postingTimes.includes(time)) {
        postingTimes.push(`${time} (Historical high engagement)`);
      }
    });
  }

  // Remove duplicates and limit
  const uniqueTimes = [...new Set(postingTimes)];
  return uniqueTimes.slice(0, 5);
}

// ─── 7️⃣ ENTERPRISE TREATMENT PLAN ──────────────────────────────────────────

/**
 * Generate actionable execution steps
 * @param {object} adData - Full ad data
 * @param {string[]} diagnosis - Diagnosis results
 * @param {object} globalIntelligence - Global market analysis
 * @param {string[]} competitorStrategy - Competitor positioning
 * @param {string[]} audienceStrategy - Audience recommendations
 * @param {string[]} postingTimes - Best posting times
 * @returns {string[]} - Actionable treatment plan
 */
function generateTreatmentPlan(adData, diagnosis, globalIntelligence, competitorStrategy, audienceStrategy, postingTimes) {
  const treatmentPlan = [];
  const { adTitle, adDescription, adCategory, audienceTargeting } = adData;

  // 1. Optimized Headline Suggestion
  const criticalHeadline = diagnosis.some(d => d.includes("Weak headline") || d.includes("Headline"));
  if (criticalHeadline || !adTitle || adTitle.length < 15) {
    const powerWords = ["Discover", "Transform", "Unlock", "Exclusive", "Limited Time"];
    const randomPower = powerWords[Math.floor(Math.random() * powerWords.length)];
    treatmentPlan.push(`HEADLINE: Rewrite to "${randomPower}: [Your Core Benefit] — [Call to Action]" (max 60 chars)`);
  } else {
    treatmentPlan.push(`HEADLINE: Current headline is effective — Consider A/B testing power word variations`);
  }

  // 2. Priority Country Focus Guidance
  if (globalIntelligence.priorityCountries && globalIntelligence.priorityCountries.length > 0) {
    const topCountries = globalIntelligence.priorityCountries.slice(0, 3).map(c => c.country);
    treatmentPlan.push(`PRIORITY MARKETS: Focus budget allocation on ${topCountries.join(", ")} for highest engagement ROI`);
  }

  // 3. Audience Targeting Improvement
  const audienceIssue = diagnosis.some(d => d.includes("Audience"));
  if (audienceIssue || !audienceTargeting) {
    const categoryAudiences = CATEGORY_INSIGHTS[adCategory]?.bestAudiences || ["targeted buyers"];
    treatmentPlan.push(`AUDIENCE: Refine targeting to "${categoryAudiences[0]}" for improved conversion rates`);
  } else {
    treatmentPlan.push(`AUDIENCE: Current targeting is defined — Consider creating lookalike audiences for expansion`);
  }

  // 4. Competitive Positioning Adjustment
  if (competitorStrategy && competitorStrategy.length > 0) {
    const topStrategy = competitorStrategy[0];
    treatmentPlan.push(`POSITIONING: ${topStrategy}`);
  }

  // 5. Recommended Posting Schedule
  if (postingTimes && postingTimes.length > 0) {
    treatmentPlan.push(`SCHEDULE: Post during ${postingTimes[0]} for optimal engagement`);
  }

  // Additional strategic actions based on diagnosis
  const emotionalIssue = diagnosis.some(d => d.includes("Emotional"));
  if (emotionalIssue) {
    treatmentPlan.push(`CREATIVE: Add emotional trigger in opening — Use "Imagine...", "Finally...", or "What if..." hooks`);
  }

  const offerIssue = diagnosis.some(d => d.includes("incentive") || d.includes("offer"));
  if (offerIssue) {
    treatmentPlan.push(`OFFER: Add compelling incentive — Free trial, discount code, or limited-time bonus`);
  }

  // Media-specific recommendations
  if (adData.mediaType === "video") {
    treatmentPlan.push(`VIDEO: Front-load key message in first 3 seconds — Add captions for 85% silent viewers`);
  } else {
    treatmentPlan.push(`MEDIA: Consider video content for 2x higher engagement potential`);
  }

  return treatmentPlan.slice(0, 8);
}

// ─── MAIN FUNCTION: Generate Enterprise Ad Doctor Report ────────────────────

/**
 * Generate comprehensive Enterprise AI Ad Doctor Report
 * @param {object} params - Input parameters
 * @returns {object} - Complete Ad Doctor report in strict JSON format
 */
async function generateEnterpriseAdDoctorReport({
  subscriptionPlan,
  adTitle,
  adDescription,
  mediaType = "image",
  adCategory = "General",
  globalReachCountries = [],
  audienceTargeting = "",
  attentionScore = null,
  competitorInsights = null,
  historicalEngagementSignals = null
}) {
  // ─── ACCESS CONTROL ───────────────────────────────────────────────────────
  const accessCheck = verifyEnterpriseAccess(subscriptionPlan);
  if (!accessCheck.hasAccess) {
    return { error: accessCheck.error };
  }

  // ─── PREPARE AD DATA ──────────────────────────────────────────────────────
  const adData = {
    adTitle: adTitle || "",
    adDescription: adDescription || "",
    mediaType: mediaType || "image",
    adCategory: adCategory || "General",
    globalReachCountries: globalReachCountries || [],
    audienceTargeting: audienceTargeting || "",
    attentionScore: attentionScore,
    competitorInsights: competitorInsights || {},
    historicalEngagementSignals: historicalEngagementSignals || {}
  };

  // ─── 1️⃣ RUN DIAGNOSIS ENGINE ─────────────────────────────────────────────
  const diagnosis = runDiagnosisEngine(adData);

  // ─── 2️⃣ CALCULATE AD HEALTH SCORE ────────────────────────────────────────
  const adHealthScore = calculateAdHealthScore(adData, diagnosis);

  // ─── 3️⃣ GLOBAL MARKET INTELLIGENCE ───────────────────────────────────────
  const globalIntelligence = analyzeGlobalMarketIntelligence(
    adData.globalReachCountries,
    adData.adCategory,
    adData
  );

  // ─── 4️⃣ COMPETITOR POSITIONING ───────────────────────────────────────────
  const competitorStrategy = analyzeCompetitorPositioning(
    adData.competitorInsights,
    adData.adCategory,
    adData
  );

  // ─── 5️⃣ AUDIENCE EXPANSION INTELLIGENCE ──────────────────────────────────
  const audienceStrategy = analyzeAudienceExpansion(
    adData.audienceTargeting,
    adData.adCategory,
    adData.globalReachCountries
  );

  // ─── 6️⃣ BEST POSTING TIME INTELLIGENCE ───────────────────────────────────
  const bestPostingTime = predictBestPostingTimes(
    adData.globalReachCountries,
    adData.adCategory,
    adData.historicalEngagementSignals
  );

  // ─── 7️⃣ ENTERPRISE TREATMENT PLAN ────────────────────────────────────────
  const treatmentPlan = generateTreatmentPlan(
    adData,
    diagnosis,
    globalIntelligence,
    competitorStrategy,
    audienceStrategy,
    bestPostingTime
  );

  // ─── CONSTRUCT FINAL REPORT ───────────────────────────────────────────────
  const report = {
    plan: "Enterprise",
    aiLevel: "Advanced Intelligence",
    diagnosis: diagnosis,
    adHealthScore: adHealthScore,
    priorityCountries: globalIntelligence.priorityCountries,
    emergingMarkets: globalIntelligence.emergingMarkets,
    competitorStrategy: competitorStrategy,
    audienceStrategy: audienceStrategy,
    bestPostingTime: bestPostingTime,
    treatmentPlan: treatmentPlan
  };

  return report;
}

/**
 * Generate AI-Enhanced Enterprise Report using DeepSeek (optional enhancement)
 * Uses DeepSeek for deeper strategic analysis when API key is available
 */
async function generateAIEnhancedEnterpriseReport(params) {
  // First generate the base Enterprise report
  const baseReport = await generateEnterpriseAdDoctorReport(params);

  const deepseekApiKey = String(process.env.DEEPSEEK_API_KEY || "").trim();

  // If there's an error or AI not configured, return base report
  if (baseReport.error || !deepseekApiKey) {
    return baseReport;
  }

  try {
    const prompt = `You are an elite enterprise advertising strategist. Analyze this ad and provide 3 high-impact strategic recommendations:

Ad Title: ${params.adTitle || "Not provided"}
Ad Description: ${params.adDescription || "Not provided"}
Category: ${params.adCategory || "General"}
Target Audience: ${params.audienceTargeting || "Not specified"}
Target Countries: ${(params.globalReachCountries || []).join(", ") || "Global"}
Current Ad Health Score: ${baseReport.adHealthScore}/100

Current Diagnosis:
${baseReport.diagnosis.join("\n")}

Provide enterprise-level strategic insights in JSON format:
{
  "strategicInsights": ["insight1", "insight2", "insight3"],
  "competitiveEdge": "one key competitive advantage to leverage",
  "globalExpansionTip": "specific global market recommendation",
  "conversionBooster": "one high-impact conversion optimization tip"
}`;

    const deepseekTimeoutMs = Number(process.env.DEEPSEEK_TIMEOUT_MS) || 20000;
    const completion = await axios.post(
      "https://api.deepseek.com/v1/chat/completions",
      {
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${deepseekApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: deepseekTimeoutMs,
      }
    );

    const aiResponse = completion?.data?.choices?.[0]?.message?.content;
    if (aiResponse) {
      try {
        const aiData = JSON.parse(aiResponse);
        baseReport.aiEnhancedInsights = aiData;
      } catch (parseError) {
        baseReport.aiEnhancedInsights = { rawResponse: aiResponse };
      }
    }
  } catch (aiError) {
    console.error("[AI Enhancement Error]", aiError.message);
    // Continue with base report if AI fails
  }

  return baseReport;
}

// ─── EXPORTS ────────────────────────────────────────────────────────────────

module.exports = {
  generateEnterpriseAdDoctorReport,
  generateAIEnhancedEnterpriseReport,
  verifyEnterpriseAccess,
  DIAGNOSIS_LABELS,
  GLOBAL_MARKET_DATA,
  CATEGORY_INSIGHTS
};
