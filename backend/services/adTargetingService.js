/**
 * Ad Targeting Service
 * Automatically assigns target countries based on user plan, location,
 * ad category, and historical performance.
 *
 * Plans:
 *   - normal         → local country only, local currency
 *   - premium        → global reach up to 5 countries, USD
 *   - pro            → max 10 countries, USD
 *   - hot            → max 15 countries, USD
 *   - enterprise     → unlimited countries, USD
 */

// ─── Country & Region Data ──────────────────────────────────────────────────

/**
 * ISO-code → { name, region, subregion, currency }
 * Covers 100+ countries across all major regions.
 */
const COUNTRY_DATA = {
  // ── Africa ──
  NG: { name: "Nigeria", region: "Africa", subregion: "West Africa", currency: "NGN" },
  GH: { name: "Ghana", region: "Africa", subregion: "West Africa", currency: "GHS" },
  KE: { name: "Kenya", region: "Africa", subregion: "East Africa", currency: "KES" },
  ZA: { name: "South Africa", region: "Africa", subregion: "Southern Africa", currency: "ZAR" },
  EG: { name: "Egypt", region: "Africa", subregion: "North Africa", currency: "EGP" },
  MA: { name: "Morocco", region: "Africa", subregion: "North Africa", currency: "MAD" },
  TZ: { name: "Tanzania", region: "Africa", subregion: "East Africa", currency: "TZS" },
  UG: { name: "Uganda", region: "Africa", subregion: "East Africa", currency: "UGX" },
  ET: { name: "Ethiopia", region: "Africa", subregion: "East Africa", currency: "ETB" },
  DZ: { name: "Algeria", region: "Africa", subregion: "North Africa", currency: "DZD" },
  SN: { name: "Senegal", region: "Africa", subregion: "West Africa", currency: "XOF" },
  CI: { name: "Côte d'Ivoire", region: "Africa", subregion: "West Africa", currency: "XOF" },
  CM: { name: "Cameroon", region: "Africa", subregion: "Central Africa", currency: "XAF" },
  AO: { name: "Angola", region: "Africa", subregion: "Southern Africa", currency: "AOA" },
  MZ: { name: "Mozambique", region: "Africa", subregion: "Southern Africa", currency: "MZN" },
  ZW: { name: "Zimbabwe", region: "Africa", subregion: "Southern Africa", currency: "ZWL" },
  BW: { name: "Botswana", region: "Africa", subregion: "Southern Africa", currency: "BWP" },
  RW: { name: "Rwanda", region: "Africa", subregion: "East Africa", currency: "RWF" },
  TN: { name: "Tunisia", region: "Africa", subregion: "North Africa", currency: "TND" },
  LY: { name: "Libya", region: "Africa", subregion: "North Africa", currency: "LYD" },
  SD: { name: "Sudan", region: "Africa", subregion: "North Africa", currency: "SDG" },
  ML: { name: "Mali", region: "Africa", subregion: "West Africa", currency: "XOF" },
  BF: { name: "Burkina Faso", region: "Africa", subregion: "West Africa", currency: "XOF" },
  NE: { name: "Niger", region: "Africa", subregion: "West Africa", currency: "XOF" },
  MG: { name: "Madagascar", region: "Africa", subregion: "East Africa", currency: "MGA" },
  CD: { name: "DR Congo", region: "Africa", subregion: "Central Africa", currency: "CDF" },
  ZM: { name: "Zambia", region: "Africa", subregion: "Southern Africa", currency: "ZMW" },
  MW: { name: "Malawi", region: "Africa", subregion: "East Africa", currency: "MWK" },

  // ── Middle East ──
  AE: { name: "UAE", region: "Middle East", subregion: "Gulf", currency: "AED" },
  SA: { name: "Saudi Arabia", region: "Middle East", subregion: "Gulf", currency: "SAR" },
  QA: { name: "Qatar", region: "Middle East", subregion: "Gulf", currency: "QAR" },
  KW: { name: "Kuwait", region: "Middle East", subregion: "Gulf", currency: "KWD" },
  BH: { name: "Bahrain", region: "Middle East", subregion: "Gulf", currency: "BHD" },
  OM: { name: "Oman", region: "Middle East", subregion: "Gulf", currency: "OMR" },
  JO: { name: "Jordan", region: "Middle East", subregion: "Levant", currency: "JOD" },
  LB: { name: "Lebanon", region: "Middle East", subregion: "Levant", currency: "LBP" },
  IQ: { name: "Iraq", region: "Middle East", subregion: "Levant", currency: "IQD" },
  IL: { name: "Israel", region: "Middle East", subregion: "Levant", currency: "ILS" },
  TR: { name: "Turkey", region: "Middle East", subregion: "Anatolia", currency: "TRY" },

  // ── South Asia ──
  IN: { name: "India", region: "Asia", subregion: "South Asia", currency: "INR" },
  PK: { name: "Pakistan", region: "Asia", subregion: "South Asia", currency: "PKR" },
  BD: { name: "Bangladesh", region: "Asia", subregion: "South Asia", currency: "BDT" },
  LK: { name: "Sri Lanka", region: "Asia", subregion: "South Asia", currency: "LKR" },
  NP: { name: "Nepal", region: "Asia", subregion: "South Asia", currency: "NPR" },

  // ── East & Southeast Asia ──
  CN: { name: "China", region: "Asia", subregion: "East Asia", currency: "CNY" },
  JP: { name: "Japan", region: "Asia", subregion: "East Asia", currency: "JPY" },
  KR: { name: "South Korea", region: "Asia", subregion: "East Asia", currency: "KRW" },
  TW: { name: "Taiwan", region: "Asia", subregion: "East Asia", currency: "TWD" },
  PH: { name: "Philippines", region: "Asia", subregion: "Southeast Asia", currency: "PHP" },
  VN: { name: "Vietnam", region: "Asia", subregion: "Southeast Asia", currency: "VND" },
  TH: { name: "Thailand", region: "Asia", subregion: "Southeast Asia", currency: "THB" },
  MY: { name: "Malaysia", region: "Asia", subregion: "Southeast Asia", currency: "MYR" },
  SG: { name: "Singapore", region: "Asia", subregion: "Southeast Asia", currency: "SGD" },
  ID: { name: "Indonesia", region: "Asia", subregion: "Southeast Asia", currency: "IDR" },
  MM: { name: "Myanmar", region: "Asia", subregion: "Southeast Asia", currency: "MMK" },

  // ── Europe ──
  GB: { name: "United Kingdom", region: "Europe", subregion: "Western Europe", currency: "GBP" },
  DE: { name: "Germany", region: "Europe", subregion: "Western Europe", currency: "EUR" },
  FR: { name: "France", region: "Europe", subregion: "Western Europe", currency: "EUR" },
  IT: { name: "Italy", region: "Europe", subregion: "Western Europe", currency: "EUR" },
  ES: { name: "Spain", region: "Europe", subregion: "Western Europe", currency: "EUR" },
  NL: { name: "Netherlands", region: "Europe", subregion: "Western Europe", currency: "EUR" },
  BE: { name: "Belgium", region: "Europe", subregion: "Western Europe", currency: "EUR" },
  SE: { name: "Sweden", region: "Europe", subregion: "Northern Europe", currency: "SEK" },
  NO: { name: "Norway", region: "Europe", subregion: "Northern Europe", currency: "NOK" },
  DK: { name: "Denmark", region: "Europe", subregion: "Northern Europe", currency: "DKK" },
  FI: { name: "Finland", region: "Europe", subregion: "Northern Europe", currency: "EUR" },
  PL: { name: "Poland", region: "Europe", subregion: "Eastern Europe", currency: "PLN" },
  CZ: { name: "Czech Republic", region: "Europe", subregion: "Eastern Europe", currency: "CZK" },
  AT: { name: "Austria", region: "Europe", subregion: "Western Europe", currency: "EUR" },
  CH: { name: "Switzerland", region: "Europe", subregion: "Western Europe", currency: "CHF" },
  PT: { name: "Portugal", region: "Europe", subregion: "Western Europe", currency: "EUR" },
  IE: { name: "Ireland", region: "Europe", subregion: "Western Europe", currency: "EUR" },
  RO: { name: "Romania", region: "Europe", subregion: "Eastern Europe", currency: "RON" },
  HU: { name: "Hungary", region: "Europe", subregion: "Eastern Europe", currency: "HUF" },
  GR: { name: "Greece", region: "Europe", subregion: "Southern Europe", currency: "EUR" },
  UA: { name: "Ukraine", region: "Europe", subregion: "Eastern Europe", currency: "UAH" },
  RU: { name: "Russia", region: "Europe", subregion: "Eastern Europe", currency: "RUB" },

  // ── Americas ──
  US: { name: "United States", region: "Americas", subregion: "North America", currency: "USD" },
  CA: { name: "Canada", region: "Americas", subregion: "North America", currency: "CAD" },
  MX: { name: "Mexico", region: "Americas", subregion: "Central America", currency: "MXN" },
  BR: { name: "Brazil", region: "Americas", subregion: "South America", currency: "BRL" },
  AR: { name: "Argentina", region: "Americas", subregion: "South America", currency: "ARS" },
  CO: { name: "Colombia", region: "Americas", subregion: "South America", currency: "COP" },
  CL: { name: "Chile", region: "Americas", subregion: "South America", currency: "CLP" },
  PE: { name: "Peru", region: "Americas", subregion: "South America", currency: "PEN" },
  VE: { name: "Venezuela", region: "Americas", subregion: "South America", currency: "VES" },
  EC: { name: "Ecuador", region: "Americas", subregion: "South America", currency: "USD" },

  // ── Oceania ──
  AU: { name: "Australia", region: "Oceania", subregion: "Oceania", currency: "AUD" },
  NZ: { name: "New Zealand", region: "Oceania", subregion: "Oceania", currency: "NZD" },
};

// Map from country name → ISO code (for reverse lookups)
const NAME_TO_ISO = {};
for (const [iso, data] of Object.entries(COUNTRY_DATA)) {
  NAME_TO_ISO[data.name.toLowerCase()] = iso;
}

// ─── Category Interest Scores ───────────────────────────────────────────────
// Score 0-100 representing market demand / interest level per region & category.
// A score of 0 means the country is excluded for that category.

const CATEGORY_INTEREST = {
  "Solar Panels": {
    high: ["NG", "GH", "KE", "ZA", "EG", "MA", "TZ", "UG", "ET", "IN", "PK", "BD", "AU", "DE", "US", "AE", "SA", "SN", "CI", "RW", "MZ", "ZM"],
    medium: ["BR", "MX", "PH", "VN", "TH", "ID", "TR", "DZ", "TN", "CM", "JP", "ES", "IT", "FR", "GB", "NL", "PT", "GR", "CL", "PE", "CO"],
    low: ["CA", "SE", "NO", "FI", "DK", "AR", "PL", "CZ", "RO", "HU", "NZ", "CH", "AT", "IE", "BE", "KR", "CN", "RU", "UA"],
  },
  "Fashion": {
    high: ["US", "GB", "FR", "IT", "DE", "NG", "GH", "ZA", "AE", "SA", "IN", "JP", "KR", "BR", "MX", "TR", "AU", "ES", "NL"],
    medium: ["CA", "SE", "DK", "PL", "RO", "EG", "MA", "KE", "PH", "TH", "MY", "SG", "ID", "VN", "CN", "RU", "AR", "CO", "CL", "PT", "IE", "BE", "AT", "CH", "NZ"],
    low: ["PK", "BD", "ET", "TZ", "UG", "SN", "CM", "HU", "CZ", "GR", "PE", "VE", "EC", "NP", "LK", "NO", "FI"],
  },
  "Electronics": {
    high: ["US", "CN", "JP", "KR", "DE", "GB", "IN", "AE", "SG", "AU", "CA", "FR", "NL", "TW", "SE"],
    medium: ["NG", "ZA", "KE", "EG", "BR", "MX", "TR", "SA", "IT", "ES", "PL", "TH", "MY", "PH", "VN", "ID", "RU"],
    low: ["GH", "MA", "TZ", "ET", "CO", "AR", "CL", "PE", "DK", "NO", "FI", "CZ", "RO", "HU", "AT", "CH", "PT", "IE", "BE", "NZ", "PK", "BD"],
  },
  "Real Estate": {
    high: ["AE", "SA", "US", "GB", "AU", "CA", "DE", "FR", "NG", "ZA", "EG", "TR", "IN", "SG"],
    medium: ["GH", "KE", "MA", "BR", "MX", "JP", "KR", "MY", "TH", "PH", "IT", "ES", "NL", "SE", "PL", "RU", "QA", "KW", "BH"],
    low: ["TZ", "UG", "ET", "SN", "CM", "CO", "AR", "CL", "PE", "VN", "ID", "DK", "NO", "FI", "CZ", "RO", "HU", "AT", "CH", "PT", "IE", "NZ"],
  },
  "Food & Beverages": {
    high: ["US", "GB", "NG", "GH", "ZA", "IN", "BR", "MX", "FR", "IT", "DE", "JP", "AU", "CA", "AE", "TR", "KE"],
    medium: ["EG", "MA", "TZ", "PH", "TH", "MY", "VN", "ID", "KR", "ES", "NL", "SE", "PL", "SA", "CO", "AR", "SG", "CN", "RU"],
    low: ["ET", "UG", "SN", "CM", "DZ", "PK", "BD", "CL", "PE", "DK", "NO", "FI", "CZ", "RO", "HU", "AT", "CH", "PT", "IE", "BE", "NZ"],
  },
  "Automotive": {
    high: ["US", "DE", "JP", "KR", "GB", "CN", "IN", "BR", "FR", "IT", "CA", "AU", "AE", "SA", "TR", "MX"],
    medium: ["NG", "ZA", "EG", "TH", "MY", "ID", "ES", "NL", "SE", "PL", "RU", "AR", "CO"],
    low: ["GH", "KE", "MA", "TZ", "PH", "VN", "DK", "NO", "FI", "CZ", "RO", "HU", "AT", "CH", "PT", "IE", "NZ", "CL", "PE"],
  },
  "Health & Wellness": {
    high: ["US", "GB", "DE", "AU", "CA", "IN", "AE", "SA", "JP", "KR", "FR", "NL", "SE", "SG"],
    medium: ["NG", "ZA", "KE", "EG", "BR", "MX", "TR", "IT", "ES", "TH", "MY", "PH", "CN", "PL"],
    low: ["GH", "MA", "TZ", "ET", "UG", "CO", "AR", "CL", "PE", "VN", "ID", "DK", "NO", "FI", "CZ", "RO", "HU", "AT", "CH", "PT", "IE", "NZ"],
  },
  "Education": {
    high: ["US", "GB", "IN", "NG", "AU", "CA", "DE", "AE", "SA", "EG", "ZA", "KE", "GH", "JP", "KR", "SG", "MY"],
    medium: ["FR", "NL", "SE", "BR", "MX", "TR", "PH", "TH", "VN", "ID", "PK", "BD", "PL", "IT", "ES"],
    low: ["MA", "TZ", "ET", "UG", "SN", "CM", "TN", "CO", "AR", "CL", "PE", "DK", "NO", "FI", "CZ", "RO", "HU", "AT", "CH", "PT", "IE", "NZ", "CN", "RU"],
  },
  "Agriculture": {
    high: ["NG", "GH", "KE", "TZ", "UG", "ET", "IN", "BR", "US", "AU", "ZA", "EG", "SN", "CI", "CM", "ZM", "MW", "RW", "MZ"],
    medium: ["PK", "BD", "TH", "VN", "ID", "PH", "MX", "AR", "CO", "PE", "FR", "DE", "NL", "CA", "TR", "MA", "DZ"],
    low: ["GB", "JP", "KR", "IT", "ES", "SE", "PL", "CZ", "RO", "HU", "AT", "CH", "NZ", "AE", "SA"],
  },
  "Cryptocurrency": {
    high: ["US", "NG", "IN", "GB", "AE", "SG", "KR", "JP", "DE", "AU", "CA", "TR", "BR", "ZA", "VN", "PH"],
    medium: ["GH", "KE", "EG", "FR", "NL", "ES", "IT", "TH", "MY", "ID", "MX", "AR", "CO", "PL", "RU", "UA", "CH", "SE"],
    low: ["MA", "TZ", "ET", "UG", "SA", "PK", "BD", "CL", "PE", "DK", "NO", "FI", "CZ", "RO", "HU", "AT", "PT", "IE", "NZ", "CN"],
  },
  "Beauty & Cosmetics": {
    high: ["US", "KR", "JP", "FR", "GB", "NG", "GH", "ZA", "AE", "SA", "IN", "BR", "DE", "AU", "IT"],
    medium: ["CA", "MX", "TR", "EG", "MA", "KE", "TH", "MY", "PH", "VN", "ID", "SG", "ES", "NL", "SE", "PL", "CN", "RU"],
    low: ["TZ", "ET", "UG", "SN", "PK", "BD", "CO", "AR", "CL", "PE", "DK", "NO", "FI", "CZ", "RO", "HU", "AT", "CH", "PT", "IE", "NZ"],
  },
  "Telecommunications": {
    high: ["US", "CN", "IN", "NG", "GB", "DE", "JP", "KR", "FR", "BR", "ZA", "KE", "AE", "SA", "AU", "CA"],
    medium: ["GH", "EG", "MA", "TZ", "TR", "MX", "IT", "ES", "TH", "MY", "PH", "VN", "ID", "SG", "NL", "SE", "PL", "RU"],
    low: ["ET", "UG", "SN", "CM", "PK", "BD", "CO", "AR", "CL", "PE", "DK", "NO", "FI", "CZ", "RO", "HU", "AT", "CH", "PT", "IE", "NZ"],
  },
};

// Fallback: generic interest for unknown categories
const DEFAULT_CATEGORY_INTEREST = {
  high: ["US", "GB", "DE", "IN", "NG", "AE", "AU", "FR", "BR", "JP", "CA", "ZA", "KR", "SG"],
  medium: ["GH", "KE", "EG", "MA", "MX", "TR", "IT", "ES", "NL", "TH", "MY", "PH", "CN", "SE", "PL", "ID"],
  low: Object.keys(COUNTRY_DATA), // everything else at low priority
};

// ─── Plan Configuration ─────────────────────────────────────────────────────

const PLAN_CONFIG = {
  normal:     { maxCountries: 1,        globalReach: false, currency: "local" },
  premium:    { maxCountries: 5,        globalReach: true,  currency: "USD" },
  pro:        { maxCountries: 10,       globalReach: true,  currency: "USD" },
  hot:        { maxCountries: 15,       globalReach: true,  currency: "USD" },
  enterprise: { maxCountries: Infinity, globalReach: true,  currency: "USD" },
};

// ─── Scoring Helpers ────────────────────────────────────────────────────────

/**
 * Get interest score for a country in a category.
 * Returns 100 (high), 60 (medium), 30 (low), 10 (unlisted fallback).
 */
function getCategoryScore(countryISO, category) {
  const cat = CATEGORY_INTEREST[category] || DEFAULT_CATEGORY_INTEREST;
  if (cat.high && cat.high.includes(countryISO)) return 100;
  if (cat.medium && cat.medium.includes(countryISO)) return 60;
  if (cat.low && cat.low.includes(countryISO)) return 30;
  return 10; // unlisted
}

/**
 * Get proximity score — how close a country is to the user's country.
 *   Same subregion → 100
 *   Same region    → 70
 *   Related region → 40  (e.g. Middle East ↔ Africa)
 *   Otherwise      → 10
 */
function getProximityScore(userISO, candidateISO) {
  if (userISO === candidateISO) return 100;
  const user = COUNTRY_DATA[userISO];
  const cand = COUNTRY_DATA[candidateISO];
  if (!user || !cand) return 10;

  if (user.subregion === cand.subregion) return 100;
  if (user.region === cand.region) return 70;

  // Related regions
  const RELATED = {
    "Africa": ["Middle East"],
    "Middle East": ["Africa", "Asia"],
    "Asia": ["Middle East", "Oceania"],
    "Europe": ["Americas"],
    "Americas": ["Europe"],
    "Oceania": ["Asia"],
  };
  if (RELATED[user.region] && RELATED[user.region].includes(cand.region)) return 40;

  return 10;
}

/**
 * Historical performance score.
 * If the user has previous ad data with CTR / conversion data per country,
 * return a normalized score 0-100. Otherwise returns 0.
 */
function getPerformanceScore(countryISO, performanceData) {
  if (!performanceData || !Array.isArray(performanceData)) return 0;
  const entry = performanceData.find(
    (p) => p.country === countryISO || p.countryName === (COUNTRY_DATA[countryISO] || {}).name
  );
  if (!entry) return 0;

  // Weighted: 60 % CTR, 40 % conversion rate (both 0-1 → 0-100)
  const ctr = Math.min((entry.ctr || 0) * 100, 100);
  const conv = Math.min((entry.conversionRate || 0) * 100, 100);
  return Math.round(ctr * 0.6 + conv * 0.4);
}

// ─── Core Targeting Function ────────────────────────────────────────────────

/**
 * Generate ad target countries.
 *
 * @param {object} params
 * @param {string} params.plan           - "normal"|"premium"|"pro"|"hot"|"enterprise"
 * @param {string} params.userCountry    - ISO code (e.g. "NG")
 * @param {string} params.category       - Ad category
 * @param {Array}  [params.performanceData] - Previous ad performance [ { country, ctr, conversionRate } ]
 * @param {Array}  [params.availableCountries] - Restrict to these ISOs; default all
 * @returns {{ targetCountries: string[], reasoning: string[], currency: string }}
 */
function generateAdTargeting({
  plan,
  userCountry,
  category,
  performanceData = null,
  availableCountries = null,
}) {
  // Normalize plan
  const normalizedPlan = (plan || "normal").toLowerCase().trim();
  const config = PLAN_CONFIG[normalizedPlan];
  if (!config) {
    throw new Error(`Invalid plan: "${plan}". Valid plans: ${Object.keys(PLAN_CONFIG).join(", ")}`);
  }

  // Validate user country (accept ISO code or country name)
  let userISO = userCountry.toUpperCase().trim();
  if (!COUNTRY_DATA[userISO]) {
    // Try to resolve as a country name
    const resolved = resolveCountryISO(userCountry);
    if (resolved) {
      userISO = resolved;
    } else {
      throw new Error(`Unknown country: "${userCountry}". Use an ISO 3166-1 alpha-2 code or country name.`);
    }
  }

  const userCountryData = COUNTRY_DATA[userISO];
  const reasoning = [];

  // ── Normal: local only ──
  if (!config.globalReach) {
    reasoning.push(`${capitalise(normalizedPlan)} plan users are restricted to local country`);
    return {
      targetCountries: [userCountryData.name],
      reasoning,
      currency: userCountryData.currency,
    };
  }

  if (normalizedPlan === "premium") {
    reasoning.push("Premium plan: global reach across up to 5 countries");
  }

  // ── Premium / Pro / Hot / Enterprise: AI-based country selection ──
  const candidatePool = availableCountries
    ? availableCountries.map((c) => c.toUpperCase()).filter((c) => COUNTRY_DATA[c])
    : Object.keys(COUNTRY_DATA);

  // Score every candidate country
  const scored = candidatePool
    .filter((iso) => iso !== userISO) // score separately; user country always included
    .map((iso) => {
      const catScore  = getCategoryScore(iso, category);
      const proxScore = getProximityScore(userISO, iso);
      const perfScore = getPerformanceScore(iso, performanceData);

      // Weighted total: category 45 %, proximity 30 %, performance 25 %
      const total = catScore * 0.45 + proxScore * 0.30 + perfScore * 0.25;

      return { iso, total, catScore, proxScore, perfScore };
    })
    .sort((a, b) => b.total - a.total);

  // Select top N-1 (reserve slot 0 for user country)
  const limit = config.maxCountries === Infinity ? scored.length : config.maxCountries - 1;
  const selected = scored.slice(0, limit);

  // Build target list — user country first
  const targetCountries = [userCountryData.name, ...selected.map((s) => COUNTRY_DATA[s.iso].name)];

  // Build reasoning
  reasoning.push(`High interest in ${category} across selected markets`);

  const hasSameRegion = selected.some((s) => COUNTRY_DATA[s.iso].region === userCountryData.region);
  if (hasSameRegion) {
    reasoning.push("Nearby countries with strong market potential");
  }

  if (performanceData && performanceData.length > 0) {
    const perfCountries = selected.filter((s) => s.perfScore > 0);
    if (perfCountries.length > 0) {
      reasoning.push("Past ad success in region boosted selection");
    }
  }

  if (normalizedPlan === "enterprise") {
    reasoning.push("Enterprise plan: global reach across all high-interest markets");
  }

  // Deduplicate (safety)
  const uniqueTargets = [...new Set(targetCountries)];

  return {
    targetCountries: uniqueTargets,
    reasoning,
    currency: config.currency === "local" ? userCountryData.currency : "USD",
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Resolve a country input that might be a name or ISO code → ISO code.
 */
function resolveCountryISO(input) {
  if (!input) return null;
  const upper = input.toUpperCase().trim();
  if (COUNTRY_DATA[upper]) return upper;
  const lower = input.toLowerCase().trim();
  if (NAME_TO_ISO[lower]) return NAME_TO_ISO[lower];
  return null;
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  generateAdTargeting,
  resolveCountryISO,
  COUNTRY_DATA,
  PLAN_CONFIG,
  CATEGORY_INTEREST,
  getCategoryScore,
  getProximityScore,
  getPerformanceScore,
};
