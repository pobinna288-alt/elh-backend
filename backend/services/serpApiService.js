const axios = require("axios");

const BASE_URL = "https://serpapi.com/search";

async function getMarketTrends(query) {
  try {
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) {
      return { success: false, data: null };
    }

    const normalizedQuery = `${query || ""}`.trim();
    if (!normalizedQuery) {
      return { success: false, data: null };
    }

    const response = await axios.get(BASE_URL, {
      params: {
        engine: "google_trends",
        q: normalizedQuery,
        api_key: apiKey,
      },
      timeout: 10000,
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const status = Number(error?.response?.status);
    if (status === 401 || status === 403) {
      console.warn("[SerpAPI] Unauthorized", {
        status,
        message: error?.message,
      });
    } else {
      console.warn("[SerpAPI] Request failed", {
        status: Number.isFinite(status) ? status : null,
        message: error?.message,
      });
    }

    return {
      success: false,
      data: null,
    };
  }
}

module.exports = {
  getMarketTrends,
};
