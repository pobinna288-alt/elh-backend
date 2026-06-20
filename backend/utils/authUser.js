function getAuthenticatedUserId(req) {
  return (
    req.user?.userId ||
    req.user?.id ||
    req.user?.user_id ||
    null
  );
}

module.exports = {
  getAuthenticatedUserId
};
