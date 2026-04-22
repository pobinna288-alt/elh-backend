function createModuleContext(dependencies = {}) {
  return Object.freeze({ ...dependencies });
}

module.exports = {
  createModuleContext,
};
