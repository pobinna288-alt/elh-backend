/**
 * Enterprise Chat Service
 * Simple, scalable MVP helpers for enterprise contact and chat flows.
 */

const { v4: uuidv4 } = require("uuid");
const {
  ENTERPRISE_BUDGET_CONFIG,
  resolveBudgetContext,
  normalizeNumericBudget,
} = require("../config/enterpriseBudgetConfig");

const ENTERPRISE_TIERS = Object.freeze({
  ENTERPRISE: "enterprise",
  ENTERPRISE_PRO: "enterprise_pro",
  VIP: "vip",
});

const ENTERPRISE_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  CLOSED: "CLOSED",
  ARCHIVED: "ARCHIVED",
});

const SENDER_TYPES = Object.freeze({
  ADMIN: "ADMIN",
  CLIENT: "CLIENT",
  SYSTEM: "SYSTEM",
});

const TIER_PRIORITY = Object.freeze({
  vip: 1,
  enterprise_pro: 2,
  enterprise: 3,
});

const RESPONSE_TIME_BY_TIER = Object.freeze({
  enterprise: "1-6 hours",
  enterprise_pro: "< 1 hour",
  vip: "15-30 minutes",
});

const SYSTEM_WELCOME_MESSAGE = "Thanks for contacting Enterprise Ads. A specialist will respond shortly.";

const CONTACT_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeText = (value, maxLength = 1000) => {
  const normalized = `${value || ""}`.replace(/\s+/g, " ").trim();
  return normalized.slice(0, maxLength);
};

const normalizeOptionalText = (value, maxLength = 1000) => {
  const normalized = normalizeText(value, maxLength);
  return normalized || null;
};

const normalizeBudget = (value) => {
  return normalizeNumericBudget(value);
};

const formatBudgetRange = (budget) => {
  const budgetContext = resolveBudgetContext({ budget });
  if (!budgetContext.budget_tier) {
    return null;
  }

  return budgetContext.budget_label;
};

const determineEnterpriseTier = (budgetValue) => {
  const budget = normalizeBudget(budgetValue);
  const budgetContext = resolveBudgetContext({ budget });

  if (!Number.isFinite(budget) || budget < 10000 || !budgetContext.budget_tier) {
    return {
      tier: null,
      budget,
      budget_min: null,
      budget_max: null,
      budget_tier: null,
    };
  }

  return {
    tier: budgetContext.budget_tier,
    budget,
    budget_min: budgetContext.budget_min,
    budget_max: budgetContext.budget_max,
    budget_tier: budgetContext.budget_tier,
  };
};

const getResponseTimeExpectation = (tier) => {
  return RESPONSE_TIME_BY_TIER[tier] || RESPONSE_TIME_BY_TIER.enterprise;
};

const validateEnterpriseContactInput = (payload = {}, currentUser = {}) => {
  const normalized = {
    user_id: normalizeText(payload.user_id || payload.userId || currentUser.id, 80),
    company_name: normalizeText(payload.company_name || payload.companyName || currentUser.companyName, 120),
    budget: normalizeBudget(
      payload.budget ?? payload.estimated_budget ?? payload.monthly_budget ?? payload.annual_budget,
    ),
    message: normalizeOptionalText(payload.message, 2000),
    contact_email: normalizeOptionalText(payload.contact_email || payload.email || currentUser.email, 160),
    contact_phone: normalizeOptionalText(payload.contact_phone || payload.phone || currentUser.phone, 40),
  };

  const errors = [];

  if (!normalized.user_id) {
    errors.push("user_id is required");
  }

  if (!normalized.company_name) {
    errors.push("company_name is required");
  }

  if (!Number.isFinite(normalized.budget)) {
    errors.push("budget must be a valid number");
  }

  if (Number.isFinite(normalized.budget) && normalized.budget < 50000) {
    errors.push("budget must be at least 50000 for enterprise support");
  }

  if (!normalized.contact_email && !normalized.contact_phone) {
    errors.push("email or phone is required");
  }

  if (normalized.contact_email && !CONTACT_EMAIL_REGEX.test(normalized.contact_email)) {
    errors.push("contact_email must be a valid email address");
  }

  if (normalized.contact_phone && normalized.contact_phone.length < 7) {
    errors.push("contact_phone must be at least 7 characters");
  }

  return {
    errors,
    normalized,
  };
};

const buildEnterpriseLead = ({
  userId,
  companyName,
  budget,
  tier,
  contactEmail = null,
  contactPhone = null,
}) => {
  const timestamp = new Date().toISOString();
  const budgetContext = resolveBudgetContext({ budget, tier });

  return {
    id: uuidv4(),
    user_id: userId,
    company_name: companyName,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    budget,
    budget_range: budgetContext.budget_label,
    budget_min: budgetContext.budget_min,
    budget_max: budgetContext.budget_max,
    budget_tier: budgetContext.budget_tier,
    tier: budgetContext.budget_tier,
    response_time_expectation: getResponseTimeExpectation(budgetContext.budget_tier),
    status: ENTERPRISE_STATUS.ACTIVE,
    created_at: timestamp,
    updated_at: timestamp,
  };
};

const buildEnterpriseChat = ({ lead, userId }) => {
  const timestamp = new Date().toISOString();

  return {
    id: uuidv4(),
    enterprise_lead_id: lead.id,
    user_id: userId,
    tier: lead.tier,
    response_time_expectation: lead.response_time_expectation,
    status: lead.status,
    last_message: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
};

const buildEnterpriseMessage = ({
  chatId,
  senderId = null,
  senderType,
  message,
  readStatus = false,
}) => {
  const timestamp = new Date().toISOString();

  return {
    id: uuidv4(),
    chat_id: chatId,
    sender_id: senderId,
    sender_type: senderType,
    message: normalizeText(message, 2000),
    timestamp,
    read_status: Boolean(readStatus),
  };
};

const isAdminUser = (user) => {
  return Boolean(user?.is_admin) || `${user?.role || ""}`.toLowerCase() === "admin";
};

const normalizeStatusValue = (value) => {
  const rawValue = `${value || ""}`.trim().toUpperCase();

  if (!rawValue) {
    return null;
  }

  if (rawValue === "RESOLVED") {
    return ENTERPRISE_STATUS.CLOSED;
  }

  if (Object.values(ENTERPRISE_STATUS).includes(rawValue)) {
    return rawValue;
  }

  return null;
};

const normalizeLeadBudgetContext = (lead = {}) => {
  const budgetContext = resolveBudgetContext({
    budget: lead.budget,
    budget_min: lead.budget_min,
    budget_max: lead.budget_max,
    budget_tier: lead.budget_tier || lead.tier,
    budget_range: lead.budget_range,
  });

  return {
    ...lead,
    budget: Number.isFinite(normalizeBudget(lead.budget)) ? normalizeBudget(lead.budget) : lead.budget,
    budget_range: budgetContext.budget_label,
    budget_min: budgetContext.budget_min,
    budget_max: budgetContext.budget_max,
    budget_tier: budgetContext.budget_tier,
    tier: budgetContext.budget_tier,
    response_time_expectation: getResponseTimeExpectation(budgetContext.budget_tier),
  };
};

const normalizeChatTier = (chat = {}, lead = null) => {
  const budgetContext = resolveBudgetContext({
    budget: lead?.budget,
    budget_min: lead?.budget_min,
    budget_max: lead?.budget_max,
    budget_tier: lead?.budget_tier || lead?.tier || chat.tier,
    budget_range: lead?.budget_range,
  });

  return {
    ...chat,
    tier: budgetContext.budget_tier,
    response_time_expectation: getResponseTimeExpectation(budgetContext.budget_tier),
  };
};

const sortEnterpriseChats = (chats = [], leadLookup = new Map()) => {
  return [...chats].sort((chatA, chatB) => {
    const leadA = normalizeLeadBudgetContext(leadLookup.get(chatA.enterprise_lead_id) || {});
    const leadB = normalizeLeadBudgetContext(leadLookup.get(chatB.enterprise_lead_id) || {});
    const tierA = TIER_PRIORITY[leadA.tier || chatA.tier] || 99;
    const tierB = TIER_PRIORITY[leadB.tier || chatB.tier] || 99;

    if (tierA !== tierB) {
      return tierA - tierB;
    }

    return new Date(chatB.updated_at || 0) - new Date(chatA.updated_at || 0);
  });
};

const buildChatSummary = ({ chat, lead, owner, messages = [] }) => {
  const normalizedLead = normalizeLeadBudgetContext(lead || {});
  const normalizedChat = normalizeChatTier(chat, normalizedLead);
  const lastMessage = messages[messages.length - 1];
  const status = normalizedLead?.status || normalizedChat?.status || ENTERPRISE_STATUS.ACTIVE;

  return {
    id: normalizedChat.id,
    enterprise_lead_id: normalizedChat.enterprise_lead_id,
    user_id: normalizedChat.user_id,
    company_name: normalizedLead?.company_name || owner?.companyName || null,
    budget: normalizedLead?.budget || null,
    budget_range: normalizedLead?.budget_range || null,
    budget_min: normalizedLead?.budget_min ?? null,
    budget_max: normalizedLead?.budget_max ?? null,
    budget_tier: normalizedLead?.budget_tier || normalizedLead?.tier || null,
    tier: normalizedLead?.tier || normalizedChat.tier,
    priority_rank: TIER_PRIORITY[normalizedLead?.tier || normalizedChat.tier] || null,
    response_time_expectation: normalizedLead?.response_time_expectation || normalizedChat.response_time_expectation,
    status,
    status_label: status === ENTERPRISE_STATUS.CLOSED ? "RESOLVED" : status,
    last_message: normalizedChat.last_message || lastMessage?.message || null,
    message_count: messages.length,
    updated_at: normalizedChat.updated_at,
    created_at: normalizedChat.created_at,
    client: owner
      ? {
          id: owner.id,
          name: owner.fullName || owner.name || owner.email || "Client",
          email: owner.email || normalizedLead?.contact_email || null,
          phone: owner.phone || normalizedLead?.contact_phone || null,
        }
      : null,
  };
};

module.exports = {
  ENTERPRISE_TIERS,
  ENTERPRISE_STATUS,
  SENDER_TYPES,
  TIER_PRIORITY,
  RESPONSE_TIME_BY_TIER,
  SYSTEM_WELCOME_MESSAGE,
  normalizeOptionalText,
  determineEnterpriseTier,
  normalizeLeadBudgetContext,
  normalizeChatTier,
  getResponseTimeExpectation,
  validateEnterpriseContactInput,
  buildEnterpriseLead,
  buildEnterpriseChat,
  buildEnterpriseMessage,
  isAdminUser,
  normalizeStatusValue,
  sortEnterpriseChats,
  buildChatSummary,
  ENTERPRISE_BUDGET_CONFIG,
};
