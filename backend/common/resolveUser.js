function normalizeUserId(value) {
  return String(value ?? "").trim();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function resolveUserFromJwt(database, decoded = {}) {
  const userId = normalizeUserId(decoded.id || decoded.userId || decoded.sub);
  const email = normalizeEmail(decoded.email || decoded.user_email);

  if (!userId && !email) {
    return null;
  }

  let user = null;
  if (userId) {
    user = database.users.find((entry) => normalizeUserId(entry?.id) === userId);
  }

  if (!user && email) {
    user = database.users.find((entry) => {
      const entryEmail = normalizeEmail(entry?.email || entry?.user_email);
      return entryEmail === email;
    });
  }

  return user || null;
}

function resolveUserById(database, userId) {
  const normalizedId = normalizeUserId(userId);
  if (!normalizedId) {
    return null;
  }

  return database.users.find((entry) => normalizeUserId(entry?.id) === normalizedId) || null;
}

module.exports = {
  normalizeUserId,
  normalizeEmail,
  resolveUserFromJwt,
  resolveUserById,
};
