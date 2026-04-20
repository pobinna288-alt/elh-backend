function createVideoWatchController(videoWatchService) {
  return {
    getRouteGroups() {
      return videoWatchService.routeGroups;
    },
  };
}

module.exports = {
  createVideoWatchController,
};
