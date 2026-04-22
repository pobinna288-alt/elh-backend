function createAiController(aiService) {
  return {
    getRouteGroups() {
      return aiService.routeGroups;
    },
  };
}

module.exports = {
  createAiController,
};
