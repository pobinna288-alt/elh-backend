const coinRewardService = require("../../services/coinRewardService");
const watchShortAdService = require("../../services/watchShortAdService");

function createVideoWatchService() {
  return {
    coinRewardService,
    watchShortAdService,
    routeGroups: ["/watch"],
  };
}

module.exports = {
  coinRewardService,
  watchShortAdService,
  createVideoWatchService,
};
