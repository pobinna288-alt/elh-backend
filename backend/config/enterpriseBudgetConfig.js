const ENTERPRISE_BUDGET_CONFIG = Object.freeze({
  enterprise_budget_ranges: Object.freeze([
    Object.freeze({
      label: "50k-100k",
      min: 50000,
      max: 100000,
      tier: "enterprise",
    }),
    Object.freeze({
      label: "100k-300k",
      min: 100000,
      max: 300000,
      tier: "enterprise_pro",
    }),
    Object.freeze({
      label: "300k+",
      min: 300000,
      max: null,
      tier: "vip",
    }),
  ]),
});

const DEFAULT_BUDGET_TIER = "enterprise";
const DEFAULT_MIN_BUDGET = 50000;

const LEGACY_RANGE_LABELS = Object.freeze({
  OLD_10K_50K: "10k-50k",
  OLD_50K_100K: "50k-100k",
  OLD_100K_PLUS: "100k+",
});

const tierByName = new Map(
  ENTERPRISE_BUDGET_CONFIG.enterprise_budget_ranges.map((range) => [range.tier, range]),
);

function assertBudgetConfig() {
  const vip = tierByName.get("vip");
  if (!vip || vip.min !== 300000 || vip.max !== null) {
    throw new Error("Invalid enterprise budget config: vip must be min=300000 and max=null");
  }
}

function normalizeNumericBudget(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return Number.NaN;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return Number.NaN;
  }

  const multiplier = normalized.endsWith("k") ? 1000 : 1;
  const numericText = normalized.replace(/[$,\s]/g, "").replace(/k$/, "");
  const parsed = Number.parseFloat(numericText);
  if (!Number.isFinite(parsed)) {
    return Number.NaN;
  }

  return parsed * multiplier;
}

function normalizeRangeLabel(value) {
  return `${value || ""}`.trim().toLowerCase().replace(/\s+/g, "");
}

function getRangeForBudget(budgetValue) {
  if (!Number.isFinite(budgetValue)) {
    return null;
  }

  for (const range of ENTERPRISE_BUDGET_CONFIG.enterprise_budget_ranges) {
    const inLowerBound = budgetValue >= range.min;
    const inUpperBound = range.max === null ? true : budgetValue < range.max;

    if (inLowerBound && inUpperBound) {
      return range;
    }
  }

  if (budgetValue >= DEFAULT_MIN_BUDGET) {
    return ENTERPRISE_BUDGET_CONFIG.enterprise_budget_ranges[0];
  }

  return null;
}

function getRangeByTier(tier) {
  return tierByName.get(`${tier || ""}`.trim().toLowerCase()) || null;
}

function resolveTierFromLegacyInputs({ budgetValue, budgetRangeLabel, tierValue }) {
  const normalizedTier = `${tierValue || ""}`.trim().toLowerCase();
  if (normalizedTier === "vip") {
    return getRangeByTier("vip");
  }

  if (["priority", "enterprise_pro", "enterprisepro"].includes(normalizedTier)) {
    return getRangeByTier("enterprise_pro");
  }

  if (["standard", "enterprise"].includes(normalizedTier)) {
    return getRangeByTier("enterprise");
  }

  const normalizedRange = normalizeRangeLabel(budgetRangeLabel);

  if (normalizedRange === LEGACY_RANGE_LABELS.OLD_10K_50K) {
    return getRangeByTier("enterprise");
  }

  if (normalizedRange === LEGACY_RANGE_LABELS.OLD_50K_100K) {
    return getRangeByTier("enterprise");
  }

  if (normalizedRange === LEGACY_RANGE_LABELS.OLD_100K_PLUS) {
    if (Number.isFinite(budgetValue) && budgetValue >= 300000) {
      return getRangeByTier("vip");
    }
    return getRangeByTier("enterprise_pro");
  }

  if (Number.isFinite(budgetValue)) {
    if (budgetValue >= 300000) {
      return getRangeByTier("vip");
    }

    if (budgetValue >= 100000) {
      return getRangeByTier("enterprise_pro");
    }

    if (budgetValue >= 50000) {
      return getRangeByTier("enterprise");
    }

    if (budgetValue >= 10000) {
      return getRangeByTier("enterprise");
    }
  }

  return getRangeByTier(DEFAULT_BUDGET_TIER);
}

function resolveBudgetContext(input = {}) {
  const budgetValue = normalizeNumericBudget(
    input.budgetValue ??
      input.budget ??
      input.annual_budget ??
      input.estimated_budget ??
      input.value,
  );

  const parsedBudgetMin = normalizeNumericBudget(input.budget_min ?? input.min);
  const parsedBudgetMax = normalizeNumericBudget(input.budget_max ?? input.max);

  let selectedRange = null;

  if (Number.isFinite(parsedBudgetMin)) {
    selectedRange = ENTERPRISE_BUDGET_CONFIG.enterprise_budget_ranges.find((range) => {
      const maxMatches = range.max === null
        ? !Number.isFinite(parsedBudgetMax)
        : Number.isFinite(parsedBudgetMax) && parsedBudgetMax === range.max;
      return range.min === parsedBudgetMin && maxMatches;
    }) || null;
  }

  if (!selectedRange && Number.isFinite(budgetValue)) {
    selectedRange = getRangeForBudget(budgetValue);
  }

  if (!selectedRange) {
    selectedRange = resolveTierFromLegacyInputs({
      budgetValue,
      budgetRangeLabel: input.budget_range ?? input.budgetRange,
      tierValue: input.budget_tier ?? input.budgetTier ?? input.tier,
    });
  }

  const safeRange = selectedRange || getRangeByTier(DEFAULT_BUDGET_TIER);

  return {
    budget_value: Number.isFinite(budgetValue) ? budgetValue : null,
    budget_min: safeRange.min,
    budget_max: safeRange.max,
    budget_tier: safeRange.tier,
    budget_label: safeRange.label,
  };
}

assertBudgetConfig();

module.exports = {
  ENTERPRISE_BUDGET_CONFIG,
  DEFAULT_BUDGET_TIER,
  resolveBudgetContext,
  normalizeNumericBudget,
};
