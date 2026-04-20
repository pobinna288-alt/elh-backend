const express = require("express");

const createAdminRouter = ({ requireAdmin, getDashboard } = {}) => {
  if (typeof requireAdmin !== "function") {
    throw new Error("Admin router requires a valid requireAdmin middleware");
  }

  if (typeof getDashboard !== "function") {
    throw new Error("Admin router requires a valid dashboard controller");
  }

  const router = express.Router();

  router.get("/dashboard", requireAdmin, getDashboard);

  return router;
};

module.exports = createAdminRouter;
