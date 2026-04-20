const jwt = require("jsonwebtoken");

const extractBearerToken = (headers = {}) => {
  const authorizationHeader = headers.authorization || headers.Authorization;

  if (typeof authorizationHeader !== "string") {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
};

const isAdminUser = (user) => {
  return Boolean(user?.is_admin === true || `${user?.role || ""}`.toLowerCase() === "admin");
};

const createRequireAdmin = ({ jwtSecret, getUserById } = {}) => {
  if (!jwtSecret) {
    throw new Error("JWT secret is required to initialize admin auth middleware");
  }

  return (req, res, next) => {
    try {
      const token = extractBearerToken(req.headers);

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Access token required",
        });
      }

      const decodedUser = jwt.verify(token, jwtSecret);
      const persistedUser = typeof getUserById === "function"
        ? getUserById(decodedUser.id || decodedUser.userId || decodedUser.sub)
        : null;
      const resolvedUser = persistedUser ? { ...decodedUser, ...persistedUser } : decodedUser;

      req.token = token;
      req.auth = decodedUser;
      req.user = resolvedUser;
      req.currentUser = persistedUser || resolvedUser;

      if (!resolvedUser || !isAdminUser(resolvedUser)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      return next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }
  };
};

module.exports = {
  createRequireAdmin,
  extractBearerToken,
  isAdminUser,
};
