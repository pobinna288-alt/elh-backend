const aiGuardianService = require("../../services/aiGuardianService");
const enterpriseAutoPostService = require("../../services/enterpriseAutoPostService");

function createAiService() {
  return {
    aiGuardianService,
    enterpriseAutoPostService,
    routeGroups: [
      "/ai/features",
      "/ai/copywriter",
      "/ai/negotiation",
      "/ai/closeflow",
      "/ai/ad-improvement",
      "/ai/demandpulse",
      "/ai/guardian",
      "/ai/auto-post",
    ],
  };
}

module.exports = {
  aiGuardianService,
  enterpriseAutoPostService,
  createAiService,
};
