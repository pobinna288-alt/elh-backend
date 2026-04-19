const toArray = (value) => (Array.isArray(value) ? value : []);

const flattenMessageStore = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.entries(value).flatMap(([chatId, entries]) => {
    return toArray(entries).map((message) => ({
      chat_id: message?.chat_id || message?.chatId || chatId,
      ...message,
    }));
  });
};

const createAdminDataSource = (store = {}) => {
  const getUsers = () => toArray(store.users);
  const getAds = () => toArray(store.ads);
  const getTransactions = () => toArray(store.transactions);

  const getEnterpriseChats = () => {
    const chats = toArray(store.enterprise_chats || store.enterpriseChats);
    if (chats.length > 0) {
      return chats;
    }

    return toArray(store.enterprise_leads || store.enterpriseLeads);
  };

  const getEnterpriseMessages = () => {
    return flattenMessageStore(store.enterprise_messages ?? store.enterpriseMessages);
  };

  const getEnterpriseMessagesByChat = () => {
    return getEnterpriseMessages().reduce((accumulator, message) => {
      const chatId = `${message?.chat_id || message?.chatId || ""}`;

      if (!chatId) {
        return accumulator;
      }

      if (!accumulator[chatId]) {
        accumulator[chatId] = [];
      }

      accumulator[chatId].push(message);
      return accumulator;
    }, {});
  };

  return {
    getUsers,
    getAds,
    getTransactions,
    getEnterpriseChats,
    getEnterpriseMessages,
    getEnterpriseMessagesByChat,
  };
};

module.exports = {
  createAdminDataSource,
};
