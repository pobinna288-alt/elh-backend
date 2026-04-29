const axios = require("axios");

const BASE_URL = "https://serpapi.com/search";
const SERPAPI_KEY = process.env.SERPAPI_KEY;

async function getMarketTrends(query) {
  try {
    if (!SERPAPI_KEY) {
      console.warn("[SerpAPI] Missing API key");
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
        api_key: SERPAPI_KEY,
      },
      timeout: 10000,
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("[SerpAPI ERROR]", error.response?.data || error.message);

    return {
      success: false,
      data: null,
    };
  }
}

module.exports = {
  getMarketTrends,
};
