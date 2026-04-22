/**
 * Ad Targeting Routes
 * POST /ads/targeting — Generate target countries for an ad
 * GET  /ads/targeting/countries — List all available countries
 * GET  /ads/targeting/categories — List supported categories
 */

const express = require("express");
const router = express.Router();
const {
  generateAdTargeting,
  resolveCountryISO,
  COUNTRY_DATA,
  PLAN_CONFIG,
  CATEGORY_INTEREST,
} = require("../services/adTargetingService");

// ─── POST /ads/targeting ────────────────────────────────────────────────────
// Generate target countries for an ad.
//
// Body:
// {
//   "plan": "pro",
//   "userCountry": "NG" | "Nigeria",
//   "category": "Solar Panels",
//   "performanceData": [{ "country": "GH", "ctr": 0.05, "conversionRate": 0.02 }],   // optional
//   "availableCountries": ["NG","GH","KE"]  // optional
// }

router.post("/targeting", (req, res) => {
  try {
    const { plan, userCountry, category, performanceData, availableCountries } = req.body;

    // ── Validate required fields ──
    if (!plan) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: "plan"',
        validPlans: Object.keys(PLAN_CONFIG),
      });
    }
    if (!userCountry) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: "userCountry" (ISO code or country name)',
      });
    }
    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: "category"',
        supportedCategories: Object.keys(CATEGORY_INTEREST),
      });
    }

    // Resolve country (accept ISO or name)
    const resolvedISO = resolveCountryISO(userCountry);
    if (!resolvedISO) {
      return res.status(400).json({
        success: false,
        error: `Unknown country: "${userCountry}". Provide a valid ISO 3166-1 alpha-2 code or country name.`,
      });
    }

    // ── Generate targeting ──
    const result = generateAdTargeting({
      plan,
      userCountry: resolvedISO,
      category,
      performanceData: performanceData || null,
      availableCountries: availableCountries || null,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("[Ad Targeting Error]", err.message);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

// ─── GET /ads/targeting/countries ───────────────────────────────────────────
// List all available countries with their ISO codes, regions, and currencies.

router.get("/targeting/countries", (_req, res) => {
  const countries = Object.entries(COUNTRY_DATA).map(([iso, data]) => ({
    iso,
    name: data.name,
    region: data.region,
    subregion: data.subregion,
    currency: data.currency,
  }));

  res.json({
    success: true,
    total: countries.length,
    data: countries,
  });
});

// ─── GET /ads/targeting/categories ──────────────────────────────────────────
// List all supported ad categories.

router.get("/targeting/categories", (_req, res) => {
  res.json({
    success: true,
    data: Object.keys(CATEGORY_INTEREST),
  });
});

// ─── GET /ads/targeting/plans ───────────────────────────────────────────────
// List plan configurations (limits & features).

router.get("/targeting/plans", (_req, res) => {
  const plans = Object.entries(PLAN_CONFIG).map(([name, cfg]) => ({
    plan: name,
    maxCountries: cfg.maxCountries === Infinity ? "unlimited" : cfg.maxCountries,
    globalReach: cfg.globalReach,
    currency: cfg.currency,
  }));

  res.json({
    success: true,
    data: plans,
  });
});

module.exports = router;
