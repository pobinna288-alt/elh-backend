const resolveAdminFlags = (user = {}) => {
  const email = String(user?.email || user?.user_email || "").trim().toLowerCase();
  const isAdmin = email === "pobinna288@gmail.com";

  return {
    role: isAdmin ? "admin" : "user",
    is_admin: isAdmin,
  };
};

const normalizeUser = (user = {}) => {
  const flags = resolveAdminFlags(user);
  return {
    ...user,
    role: flags.role,
    is_admin: flags.is_admin,
  };
};

module.exports = {
  resolveAdminFlags,
  normalizeUser,
};
