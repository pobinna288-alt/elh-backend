// ─── Centralized environment URL configuration ──────────────────────────────
// All URL generation should use these helpers instead of hardcoding domains.
// Defaults fall back to the production domain so deployments never leak localhost.

const PRODUCTION_DOMAIN = "https://elhannora.com";
const PRODUCTION_API    = "https://api.elhannora.com";

const trimSlash = (url) => String(url || "").replace(/\/+$/, "");

/**
 * Frontend / client base URL (used for referral links, auth callbacks, emails).
 * Reads: BASE_URL → FRONTEND_URL → CLIENT_URL → production default
 */
const getBaseUrl = () =>
  trimSlash(
    process.env.BASE_URL ||
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    PRODUCTION_DOMAIN
  );

/**
 * Backend API base URL (used for webhook callbacks, self-referencing URLs).
 * Reads: API_URL → API_BASE_URL → production default
 */
const getApiUrl = () =>
  trimSlash(
    process.env.API_URL ||
    process.env.API_BASE_URL ||
    PRODUCTION_API
  );

/**
 * Client origin for CORS.
 * Reads: CLIENT_URL → FRONTEND_URL → BASE_URL → "*"
 */
const getClientOrigin = () =>
  trimSlash(
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    process.env.BASE_URL ||
    ""
  ) || "*";

/**
 * Whether the app is running in production mode.
 */
const isProduction = () =>
  (process.env.NODE_ENV || "").toLowerCase() === "production";

module.exports = {
  PRODUCTION_DOMAIN,
  PRODUCTION_API,
  getBaseUrl,
  getApiUrl,
  getClientOrigin,
  isProduction,
};
