const HOURS_FOR_ACTIVE_CHAT = 48;
const RECENT_ITEMS_LIMIT = 5;

const toValidDate = (value) => {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toIsoString = (value) => {
  const parsed = toValidDate(value);
  return parsed ? parsed.toISOString() : null;
};

const toNumber = (value) => {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
};

const pickDate = (...values) => {
  for (const value of values) {
    const parsed = toValidDate(value);
    if (parsed) {
      return parsed;
    }
  }

  return null;
};

const getCreatedDate = (item = {}) => {
  return pickDate(
    item.created_at,
    item.createdAt,
    item.timestamp,
    item.updated_at,
    item.updatedAt,
  );
};

const getLastLoginDate = (user = {}) => {
  return pickDate(
    user.last_login,
    user.lastLogin,
    user.lastLoginAt,
    user.last_active_date,
  );
};

const isCurrentMonth = (date, now = new Date()) => {
  const parsed = toValidDate(date);
  if (!parsed) {
    return false;
  }

  return parsed.getUTCFullYear() === now.getUTCFullYear()
    && parsed.getUTCMonth() === now.getUTCMonth();
};

const isRecent = (date, hours = HOURS_FOR_ACTIVE_CHAT, now = new Date()) => {
  const parsed = toValidDate(date);
  if (!parsed || !Number.isFinite(hours)) {
    return false;
  }

  return now.getTime() - parsed.getTime() <= hours * 60 * 60 * 1000;
};

const sortByDateDesc = (left, right) => {
  return (getCreatedDate(right)?.getTime() || 0) - (getCreatedDate(left)?.getTime() || 0);
};

const sanitizeRecentUser = (user) => ({
  id: user?.id || null,
  full_name: user?.fullName || user?.name || null,
  email: user?.email || null,
  role: user?.role || (user?.is_admin ? "admin" : "user"),
  created_at: toIsoString(getCreatedDate(user)),
  last_login: toIsoString(getLastLoginDate(user)),
});

const sanitizeRecentAd = (ad) => ({
  id: ad?.id || null,
  title: ad?.title || "Untitled ad",
  status: ad?.status || "draft",
  price: toNumber(ad?.price),
  created_at: toIsoString(getCreatedDate(ad)),
});

const sanitizeRecentChat = (chat, lastActivity) => ({
  id: chat?.id || chat?.chat_id || null,
  subject: chat?.subject || chat?.company_name || chat?.contact_reason || "Enterprise lead",
  tier: chat?.tier || chat?.plan || "STANDARD",
  status: chat?.status || "open",
  created_at: toIsoString(getCreatedDate(chat)),
  last_activity_at: toIsoString(lastActivity || getCreatedDate(chat)),
});

const getRecentItems = (items, serializer) => {
  return [...items]
    .sort(sortByDateDesc)
    .slice(0, RECENT_ITEMS_LIMIT)
    .map(serializer);
};

const createGetAdminDashboardHandler = (dataSource) => {
  if (!dataSource) {
    throw new Error("Admin dashboard data source is required");
  }

  return async (req, res) => {
    try {
      const now = new Date();
      const users = dataSource.getUsers();
      const ads = dataSource.getAds();
      const transactions = dataSource.getTransactions();
      const enterpriseChats = dataSource.getEnterpriseChats();
      const messagesByChat = dataSource.getEnterpriseMessagesByChat();

      let monthlyActiveUsers = 0;
      for (const user of users) {
        if (isCurrentMonth(getLastLoginDate(user), now)) {
          monthlyActiveUsers += 1;
        }
      }

      let activeAds = 0;
      for (const ad of ads) {
        if (`${ad?.status || ""}`.toLowerCase() === "active") {
          activeAds += 1;
        }
      }

      let totalRevenue = 0;
      let monthlyRevenue = 0;
      for (const transaction of transactions) {
        const amount = toNumber(transaction?.amount);
        totalRevenue += amount;

        if (isCurrentMonth(getCreatedDate(transaction), now)) {
          monthlyRevenue += amount;
        }
      }

      let vipLeads = 0;
      let activeChats = 0;
      const lastActivityByChat = {};

      for (const chat of enterpriseChats) {
        const normalizedTier = `${chat?.tier || chat?.plan || ""}`.toUpperCase();
        if (normalizedTier === "VIP") {
          vipLeads += 1;
        }

        const chatId = `${chat?.id || chat?.chat_id || ""}`;
        const chatMessages = messagesByChat[chatId] || [];
        const lastMessageDate = chatMessages.reduce((latest, message) => {
          const candidate = pickDate(message?.timestamp, message?.created_at, message?.createdAt, message?.updated_at);
          if (!candidate) {
            return latest;
          }

          if (!latest || candidate.getTime() > latest.getTime()) {
            return candidate;
          }

          return latest;
        }, null);

        const lastActivity = lastMessageDate || getCreatedDate(chat);
        lastActivityByChat[chatId] = lastActivity;

        if (isRecent(lastActivity, HOURS_FOR_ACTIVE_CHAT, now)) {
          activeChats += 1;
        }
      }

      return res.json({
        success: true,
        data: {
          users: {
            total: users.length,
            monthly_active: monthlyActiveUsers,
          },
          ads: {
            total: ads.length,
            active: activeAds,
          },
          revenue: {
            total: totalRevenue,
            monthly: monthlyRevenue,
          },
          enterprise: {
            total_leads: enterpriseChats.length,
            vip_leads: vipLeads,
            active_chats: activeChats,
          },
          recent: {
            users: getRecentItems(users, sanitizeRecentUser),
            ads: getRecentItems(ads, sanitizeRecentAd),
            chats: [...enterpriseChats]
              .sort(sortByDateDesc)
              .slice(0, RECENT_ITEMS_LIMIT)
              .map((chat) => sanitizeRecentChat(chat, lastActivityByChat[`${chat?.id || chat?.chat_id || ""}`])),
          },
        },
      });
    } catch (error) {
      console.error("Admin dashboard error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to load dashboard",
      });
    }
  };
};

module.exports = {
  createGetAdminDashboardHandler,
  isCurrentMonth,
  isRecent,
};
