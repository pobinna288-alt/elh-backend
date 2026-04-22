/**
 * Enterprise Chat Routes
 * MVP enterprise contact + in-app admin/client chat.
 */

const express = require("express");
const {
  ENTERPRISE_STATUS,
  SENDER_TYPES,
  SYSTEM_WELCOME_MESSAGE,
  normalizeOptionalText,
  determineEnterpriseTier,
  normalizeLeadBudgetContext,
  normalizeChatTier,
  validateEnterpriseContactInput,
  buildEnterpriseLead,
  buildEnterpriseChat,
  buildEnterpriseMessage,
  isAdminUser,
  normalizeStatusValue,
  sortEnterpriseChats,
  buildChatSummary,
} = require("../services/enterpriseChatService");

const router = express.Router();

let database = null;
let authenticateToken = null;
let createNotification = null;

const CONTACT_WINDOW_MS = 10 * 60 * 1000;
const CONTACT_MAX_REQUESTS = 3;
const contactAttemptStore = new Map();

const ensureEnterpriseCollections = () => {
  if (!database) {
    return;
  }

  if (!Array.isArray(database.enterpriseLeads)) {
    database.enterpriseLeads = [];
  }

  if (!Array.isArray(database.enterpriseChats)) {
    database.enterpriseChats = [];
  }

  if (!Array.isArray(database.enterpriseMessages)) {
    database.enterpriseMessages = [];
  }

  database.enterpriseLeads = database.enterpriseLeads.map((lead) => normalizeLeadBudgetContext(lead));

  const leadLookup = new Map(database.enterpriseLeads.map((lead) => [lead.id, lead]));
  database.enterpriseChats = database.enterpriseChats.map((chat) => {
    const lead = leadLookup.get(chat.enterprise_lead_id);
    return normalizeChatTier(chat, lead);
  });
};

const requireAuth = (req, res, next) => {
  if (typeof authenticateToken !== "function") {
    return res.status(500).json({
      success: false,
      error: "Enterprise chat auth middleware is not initialized",
    });
  }

  return authenticateToken(req, res, next);
};

const requireAdminAccess = (req, res, next) => {
  if (!isAdminUser(req.currentUser || req.user)) {
    return res.status(403).json({
      success: false,
      error: "Access Denied",
    });
  }

  next();
};

const enterpriseContactRateLimit = (req, res, next) => {
  const now = Date.now();
  const key = `${req.user?.id || "anonymous"}:${req.ip || "unknown"}`;
  const currentWindow = contactAttemptStore.get(key);

  if (!currentWindow || currentWindow.resetAt <= now) {
    contactAttemptStore.set(key, {
      count: 1,
      resetAt: now + CONTACT_WINDOW_MS,
    });
    return next();
  }

  if (currentWindow.count >= CONTACT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((currentWindow.resetAt - now) / 1000);
    res.setHeader("Retry-After", retryAfterSeconds);

    return res.status(429).json({
      success: false,
      error: "Too many enterprise contact attempts. Please try again shortly.",
      retry_after_seconds: retryAfterSeconds,
    });
  }

  currentWindow.count += 1;
  next();
};

const getLeadById = (leadId) => {
  ensureEnterpriseCollections();
  return database.enterpriseLeads.find((lead) => lead.id === leadId);
};

const getChatById = (chatId) => {
  ensureEnterpriseCollections();
  return database.enterpriseChats.find((chat) => chat.id === chatId);
};

const getChatMessages = (chatId) => {
  ensureEnterpriseCollections();
  return database.enterpriseMessages
    .filter((message) => message.chat_id === chatId)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

const canAccessChat = (req, chat, lead) => {
  if (isAdminUser(req.currentUser || req.user)) {
    return true;
  }

  const ownerId = lead?.user_id || chat?.user_id;
  return ownerId === req.user.id;
};

const getVisibleUnreadCount = (messages, requesterIsAdmin) => {
  return messages.filter((entry) => {
    if (entry.read_status) {
      return false;
    }

    if (requesterIsAdmin) {
      return entry.sender_type === SENDER_TYPES.CLIENT;
    }

    return entry.sender_type === SENDER_TYPES.ADMIN || entry.sender_type === SENDER_TYPES.SYSTEM;
  }).length;
};

const buildChatPayload = (chat, req) => {
  const lead = getLeadById(chat.enterprise_lead_id);
  const owner = database.users.find((user) => user.id === (lead?.user_id || chat.user_id));
  const messages = getChatMessages(chat.id);
  const requesterIsAdmin = isAdminUser(req.currentUser || req.user);

  return {
    ...buildChatSummary({
      chat,
      lead,
      owner,
      messages,
    }),
    unread_count: getVisibleUnreadCount(messages, requesterIsAdmin),
  };
};

const notifyAdmins = ({ title, message, metadata = {} }) => {
  if (typeof createNotification !== "function") {
    return;
  }

  database.users.filter((user) => isAdminUser(user)).forEach((adminUser) => {
    createNotification({
      userId: adminUser.id,
      type: "message",
      title,
      message,
      metadata,
    });
  });
};

const notifyClient = (userId, { title, message, metadata = {} }) => {
  if (typeof createNotification !== "function" || !userId) {
    return;
  }

  createNotification({
    userId,
    type: "message",
    title,
    message,
    metadata,
  });
};

const markMessagesAsRead = (chatId, requesterIsAdmin) => {
  ensureEnterpriseCollections();

  database.enterpriseMessages.forEach((entry) => {
    if (entry.chat_id !== chatId || entry.read_status) {
      return;
    }

    const shouldMarkRead = requesterIsAdmin
      ? entry.sender_type === SENDER_TYPES.CLIENT
      : entry.sender_type === SENDER_TYPES.ADMIN || entry.sender_type === SENDER_TYPES.SYSTEM;

    if (shouldMarkRead) {
      entry.read_status = true;
    }
  });
};

router.post("/enterprise/contact", requireAuth, enterpriseContactRateLimit, (req, res) => {
  try {
    ensureEnterpriseCollections();

    const { errors, normalized } = validateEnterpriseContactInput(req.body, req.currentUser);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors[0],
        errors,
      });
    }

    if (normalized.user_id !== req.user.id && !isAdminUser(req.currentUser)) {
      return res.status(403).json({
        success: false,
        error: "You can only create enterprise chats for your own account",
      });
    }

    const { tier, budget } = determineEnterpriseTier(normalized.budget);
    if (!tier) {
      return res.status(400).json({
        success: false,
        error: "budget must be at least 50000 for enterprise support",
      });
    }

    if (normalized.contact_phone) {
      req.currentUser.phone = normalized.contact_phone;
    }

    const lead = buildEnterpriseLead({
      userId: req.user.id,
      companyName: normalized.company_name,
      budget,
      tier,
      contactEmail: normalized.contact_email,
      contactPhone: normalized.contact_phone,
    });

    const chat = buildEnterpriseChat({
      lead,
      userId: req.user.id,
    });

    const systemMessage = buildEnterpriseMessage({
      chatId: chat.id,
      senderType: SENDER_TYPES.SYSTEM,
      message: SYSTEM_WELCOME_MESSAGE,
      readStatus: true,
    });

    database.enterpriseLeads.push(lead);
    database.enterpriseChats.push(chat);
    database.enterpriseMessages.push(systemMessage);

    if (normalized.message) {
      const clientMessage = buildEnterpriseMessage({
        chatId: chat.id,
        senderId: req.user.id,
        senderType: SENDER_TYPES.CLIENT,
        message: normalized.message,
      });

      database.enterpriseMessages.push(clientMessage);
      chat.last_message = clientMessage.message;
      chat.updated_at = clientMessage.timestamp;
      lead.updated_at = clientMessage.timestamp;
    } else {
      chat.last_message = systemMessage.message;
      chat.updated_at = systemMessage.timestamp;
      lead.updated_at = systemMessage.timestamp;
    }

    notifyAdmins({
      title: `New ${tier} enterprise lead`,
      message: `${normalized.company_name} started an enterprise chat.`,
      metadata: {
        chat_id: chat.id,
        tier,
        company_name: normalized.company_name,
        response_time_expectation: lead.response_time_expectation,
      },
    });

    return res.status(201).json({
      success: true,
      chat_id: chat.id,
      tier,
      response_time_expectation: lead.response_time_expectation,
      message: "Chat created successfully",
      chat: buildChatPayload(chat, req),
    });
  } catch (error) {
    console.error("Enterprise contact error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create enterprise chat",
    });
  }
});

router.get("/enterprise/chats", requireAuth, (req, res) => {
  try {
    ensureEnterpriseCollections();

    const requesterIsAdmin = isAdminUser(req.currentUser || req.user);
    const leadLookup = new Map(database.enterpriseLeads.map((lead) => [lead.id, lead]));
    const visibleChats = requesterIsAdmin
      ? database.enterpriseChats
      : database.enterpriseChats.filter((chat) => {
          const lead = leadLookup.get(chat.enterprise_lead_id);
          return (lead?.user_id || chat.user_id) === req.user.id;
        });

    const chats = sortEnterpriseChats(visibleChats, leadLookup).map((chat) => buildChatPayload(chat, req));

    return res.json({
      success: true,
      chats,
      total: chats.length,
    });
  } catch (error) {
    console.error("Enterprise chats error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch enterprise chats",
    });
  }
});

router.get("/admin/enterprise-chat", requireAuth, requireAdminAccess, (req, res) => {
  try {
    ensureEnterpriseCollections();

    const rawStatus = `${req.query.status || ""}`.trim().toUpperCase();
    const requestedStatus = rawStatus === "ALL" ? "ALL" : normalizeStatusValue(rawStatus);
    const leadLookup = new Map(database.enterpriseLeads.map((lead) => [lead.id, lead]));

    let chats = database.enterpriseChats;
    if (requestedStatus && requestedStatus !== "ALL") {
      const normalizedStatus = normalizeStatusValue(requestedStatus);
      chats = chats.filter((chat) => {
        const lead = leadLookup.get(chat.enterprise_lead_id);
        return (lead?.status || chat.status) === normalizedStatus;
      });
    }

    const sortedChats = sortEnterpriseChats(chats, leadLookup).map((chat) => buildChatPayload(chat, req));

    return res.json({
      success: true,
      chats: sortedChats,
      total: sortedChats.length,
      sort_order: ["vip", "enterprise_pro", "enterprise"],
    });
  } catch (error) {
    console.error("Admin enterprise chat list error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch admin enterprise chats",
    });
  }
});

router.get("/chat/:id", requireAuth, (req, res) => {
  try {
    ensureEnterpriseCollections();

    const chat = getChatById(req.params.id);
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found",
      });
    }

    const lead = getLeadById(chat.enterprise_lead_id);
    if (!lead || !canAccessChat(req, chat, lead)) {
      return res.status(403).json({
        success: false,
        error: "Access Denied",
      });
    }

    const requesterIsAdmin = isAdminUser(req.currentUser || req.user);
    markMessagesAsRead(chat.id, requesterIsAdmin);

    const afterTimestamp = req.query.after ? new Date(req.query.after) : null;
    const allMessages = getChatMessages(chat.id);
    const messages = afterTimestamp && !Number.isNaN(afterTimestamp.getTime())
      ? allMessages.filter((entry) => new Date(entry.timestamp) > afterTimestamp)
      : allMessages;

    return res.json({
      success: true,
      chat: buildChatPayload(chat, req),
      messages,
      polling: {
        enabled: true,
        recommended_interval_ms: 5000,
        after_supported: true,
      },
    });
  } catch (error) {
    console.error("Get enterprise chat error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch chat",
    });
  }
});

router.post("/chat/:id/message", requireAuth, (req, res) => {
  try {
    ensureEnterpriseCollections();

    const chat = getChatById(req.params.id);
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found",
      });
    }

    const lead = getLeadById(chat.enterprise_lead_id);
    if (!lead || !canAccessChat(req, chat, lead)) {
      return res.status(403).json({
        success: false,
        error: "Access Denied",
      });
    }

    if (lead.status === ENTERPRISE_STATUS.ARCHIVED) {
      return res.status(409).json({
        success: false,
        error: "Archived chats are read-only",
      });
    }

    const messageText = normalizeOptionalText(req.body.message, 2000);
    if (!messageText) {
      return res.status(400).json({
        success: false,
        error: "message is required",
      });
    }

    const requesterIsAdmin = isAdminUser(req.currentUser || req.user);
    const requestedSenderType = `${req.body.sender_type || req.body.senderType || ""}`.trim().toUpperCase();

    if (requestedSenderType === SENDER_TYPES.SYSTEM) {
      return res.status(400).json({
        success: false,
        error: "SYSTEM messages can only be created automatically",
      });
    }

    if (!requesterIsAdmin && req.body.sender_id && req.body.sender_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "sender_id must match the authenticated user",
      });
    }

    const senderType = requesterIsAdmin ? SENDER_TYPES.ADMIN : SENDER_TYPES.CLIENT;
    if (requestedSenderType && requestedSenderType !== senderType) {
      return res.status(403).json({
        success: false,
        error: `sender_type must be ${senderType} for this user`,
      });
    }

    const messageEntry = buildEnterpriseMessage({
      chatId: chat.id,
      senderId: req.user.id,
      senderType,
      message: messageText,
    });

    database.enterpriseMessages.push(messageEntry);

    if (!requesterIsAdmin && lead.status === ENTERPRISE_STATUS.CLOSED) {
      lead.status = ENTERPRISE_STATUS.ACTIVE;
      chat.status = ENTERPRISE_STATUS.ACTIVE;
    }

    chat.last_message = messageEntry.message;
    chat.updated_at = messageEntry.timestamp;
    lead.updated_at = messageEntry.timestamp;

    if (requesterIsAdmin) {
      notifyClient(lead.user_id, {
        title: "Enterprise team replied",
        message: messageEntry.message.length > 80 ? `${messageEntry.message.slice(0, 77)}...` : messageEntry.message,
        metadata: {
          chat_id: chat.id,
          tier: lead.tier,
        },
      });
    } else {
      notifyAdmins({
        title: `${lead.tier} client replied`,
        message: messageEntry.message.length > 80 ? `${messageEntry.message.slice(0, 77)}...` : messageEntry.message,
        metadata: {
          chat_id: chat.id,
          tier: lead.tier,
          company_name: lead.company_name,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: messageEntry,
      chat: buildChatPayload(chat, req),
    });
  } catch (error) {
    console.error("Post enterprise message error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to send message",
    });
  }
});

router.patch("/admin/enterprise-chat/:chatId/status", requireAuth, requireAdminAccess, (req, res) => {
  try {
    ensureEnterpriseCollections();

    const chat = getChatById(req.params.chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found",
      });
    }

    const lead = getLeadById(chat.enterprise_lead_id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: "Enterprise lead not found",
      });
    }

    const nextStatus = normalizeStatusValue(req.body.status || req.body.action);
    if (!nextStatus) {
      return res.status(400).json({
        success: false,
        error: "status must be ACTIVE, RESOLVED, CLOSED, or ARCHIVED",
      });
    }

    const systemNote = normalizeOptionalText(req.body.note, 400);
    const timestamp = new Date().toISOString();
    lead.status = nextStatus;
    lead.updated_at = timestamp;
    chat.status = nextStatus;
    chat.updated_at = timestamp;

    const statusMessage = systemNote
      ? `Admin update: ${systemNote}`
      : `This enterprise chat was marked ${nextStatus === ENTERPRISE_STATUS.CLOSED ? "resolved" : nextStatus.toLowerCase()} by the admin team.`;

    const auditMessage = buildEnterpriseMessage({
      chatId: chat.id,
      senderType: SENDER_TYPES.SYSTEM,
      message: statusMessage,
      readStatus: false,
    });

    database.enterpriseMessages.push(auditMessage);
    chat.last_message = auditMessage.message;
    chat.updated_at = auditMessage.timestamp;
    lead.updated_at = auditMessage.timestamp;

    notifyClient(lead.user_id, {
      title: "Enterprise chat updated",
      message: statusMessage,
      metadata: {
        chat_id: chat.id,
        tier: lead.tier,
        status: nextStatus,
      },
    });

    return res.json({
      success: true,
      message: `Chat marked as ${nextStatus === ENTERPRISE_STATUS.CLOSED ? "RESOLVED" : nextStatus}`,
      chat: buildChatPayload(chat, req),
    });
  } catch (error) {
    console.error("Enterprise status update error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update enterprise chat status",
    });
  }
});

const initEnterpriseChatRoutes = ({ db, authMiddleware, notificationFactory }) => {
  database = db;
  authenticateToken = authMiddleware;
  createNotification = notificationFactory;
  ensureEnterpriseCollections();
  return router;
};

module.exports = {
  initEnterpriseChatRoutes,
};
