function normalizePrice(price) {
  const p = Number(price);
  return Number.isFinite(p) && p > 0 ? p : null;
}

module.exports = {
  normalizePrice,
};
