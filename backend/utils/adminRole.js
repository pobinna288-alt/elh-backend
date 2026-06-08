const resolveAdminFlags = (user = {}) => {
  const email = String(user?.email || user?.user_email || "").trim().toLowerCase();
  const isAdmin = email === "pobinna288@gmail.com";

  return {
    role: isAdmin ? "admin" : "user",
    is_admin: isAdmin,
  };
};

module.exports = {
  resolveAdminFlags,
};
