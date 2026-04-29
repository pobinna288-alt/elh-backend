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

async function getProductPrice(query) {
  try {
    const searchQuery = `${query} price buy online`;

    const response = await axios.get("https://serpapi.com/search.json", {
      params: {
        engine: "google_shopping",
        q: searchQuery,
        api_key: process.env.SERPAPI_KEY,
      },
      timeout: 20000,
    });

    const results = response.data?.shopping_results || [];

    if (!results.length) {
      return null;
    }

    const prices = results
      .map((item) => parseFloat(item.price?.replace(/[^0-9.]/g, "")))
      .filter((p) => Number.isFinite(p));

    if (!prices.length) {
      return null;
    }

    // median price (stable)
    prices.sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);

    return prices[mid];

  } catch (error) {
    console.log("[SerpAPI] failed, using fallback");
    return null;
  }
}

module.exports = {
  getMarketTrends,
  getProductPrice,
};
