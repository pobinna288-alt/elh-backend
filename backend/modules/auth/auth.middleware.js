const {
  createRequireAdmin,
  extractBearerToken,
  isAdminUser,
} = require("../../../middleware/auth");

function createAuthMiddleware({ authenticateToken } = {}) {
  return {
    authenticateToken,
  };
}

module.exports = {
  createAuthMiddleware,
  createRequireAdmin,
  extractBearerToken,
  isAdminUser,
};
