const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { resolveUserFromJwt } = require("../common/resolveUser");

// ─── Auth Middleware ─────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const database = req.app?.get("database");
    const persistedUser = database && Array.isArray(database.users)
      ? resolveUserFromJwt(database, decoded)
      : null;

    if (!persistedUser) {
      console.log("[IDENTITY] /ads/* - JWT id:", decoded.id || decoded.userId || decoded.sub || null);
      console.log("[IDENTITY] /ads/* - JWT email:", decoded.email || null);
      console.log("[IDENTITY] /ads/* - resolved record id: NOT_FOUND");
      console.log("[IDENTITY] /ads/* - resolved record email: NOT_FOUND");
      console.log("[DIAG] /ads/* - no persisted record found; rejecting request");
      return res.status(401).json({ success: false, error: "User not found", code: "USER_NOT_FOUND" });
    }

    req.user = { ...decoded, ...persistedUser };
    console.log("[IDENTITY] /ads/* - JWT id:", decoded.id || decoded.userId || decoded.sub || null);
    console.log("[IDENTITY] /ads/* - JWT email:", decoded.email || null);
    console.log("[IDENTITY] /ads/* - resolved record id:", persistedUser.id);
    console.log("[IDENTITY] /ads/* - resolved record email:", persistedUser.email ?? "NOT_FOUND");
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
}

// ─── Database reference (set by initAdsRoutes) ──────────────────────────────

let database = null;

/**
 * MVP Ads Database (in-memory demo data)
 * Real user-created ads are stored in SQLite via database.ads
 */
const adsDB = [
  // TECH
  { id: 1, category: "tech", type: "video_ad", mediaUrl: "https://www.w3schools.com/html/mov_bbb.mp4", duration: 20 },
  { id: 2, category: "tech", type: "video_ad", mediaUrl: "https://www.w3schools.com/html/movie.mp4", duration: 25 },
  { id: 3, category: "tech", type: "video_ad", mediaUrl: "https://www.w3schools.com/html/mov_bbb.mp4", duration: 15 },
  { id: 4, category: "tech", type: "video_ad", mediaUrl: "https://www.w3schools.com/html/movie.mp4", duration: 30 },
  { id: 5, category: "tech", type: "video_ad", mediaUrl: "https://www.w3schools.com/html/mov_bbb.mp4", duration: 18 },

  // FINANCE
  { id: 6, category: "finance", type: "video_ad", mediaUrl: "https://www.w3schools.com/html/movie.mp4", duration: 22 },
  { id: 7, category: "finance", type: "video_ad", mediaUrl: "https://www.w3schools.com/html/mov_bbb.mp4", duration: 28 },
  { id: 8, category: "finance", type: "video_ad", mediaUrl: "https://www.w3schools.com/html/movie.mp4", duration: 20 },
  { id: 9, category: "finance", type: "video_ad", mediaUrl: "https://www.w3schools.com/html/mov_bbb.mp4", duration: 25 },

  // ENTERTAINMENT
  { id: 10, category: "entertainment", type: "video_ad", mediaUrl: "https://www.w3schools.com/html/movie.mp4", duration: 30 },
  { id: 11, category: "entertainment", type: "video_ad", mediaUrl: "https://www.w3schools.com/html/mov_bbb.mp4", duration: 18 },
  { id: 12, category: "entertainment", type: "video_ad", mediaUrl: "https://www.w3schools.com/html/movie.mp4", duration: 25 },
  { id: 13, category: "entertainment", type: "video_ad", mediaUrl: "https://www.w3schools.com/html/mov_bbb.mp4", duration: 20 },

  // EDUCATION
  { id: 14, category: "education", type: "video_ad", mediaUrl: "https://www.w3schools.com/html/movie.mp4", duration: 30 },
  { id: 15, category: "education", type: "video_ad", mediaUrl: "https://www.w3schools.com/html/mov_bbb.mp4", duration: 22 },
  { id: 16, category: "education", type: "video_ad", mediaUrl: "https://www.w3schools.com/html/movie.mp4", duration: 26 },

  // HEALTH
  { id: 17, category: "health", type: "video_ad", mediaUrl: "https://www.w3schools.com/html/mov_bbb.mp4", duration: 20 },
  { id: 18, category: "health", type: "video_ad", mediaUrl: "https://www.w3schools.com/html/movie.mp4", duration: 24 },
  { id: 19, category: "health", type: "video_ad", mediaUrl: "https://www.w3schools.com/html/mov_bbb.mp4", duration: 18 }
];

// In-memory tracking store
const adEvents = [];

/**
 * GET /api/ads/feed
 * Optional query: ?category=tech
 */
const handleFetchAds = (req, res) => {
  try {
    const { category } = req.query;

    // Merge demo ads with real user-created ads from SQLite
    const realAds = (database && Array.isArray(database.ads))
      ? database.ads.filter((ad) => ad.status === "active" || ad.isActive === true)
      : [];
    const allAds = [...realAds, ...adsDB];

    // No category → return all ads
    if (!category) {
      return res.json(allAds);
    }

    // Filter by category (safe normalization)
    const filteredAds = allAds.filter(ad =>
      String(ad.category || "").toLowerCase() === String(category).toLowerCase()
    );

    return res.json(filteredAds);
  } catch (error) {
    console.error("Ads fetch error:", error);
    return res.status(500).json({ success: false });
  }
};

router.get("/feed", handleFetchAds);
router.get("/", handleFetchAds);

/**
 * GET /api/ads/mine
 * Returns the authenticated user's own posts (post history)
 */
router.get("/mine", requireAuth, (req, res) => {
  try {
    const userId = req.user.id;

    if (!database || !Array.isArray(database.ads)) {
      return res.json({ success: true, ads: [], total: 0 });
    }

    const userAds = database.ads
      .filter((ad) => ad.userId === userId || ad.seller_id === userId || ad.user_id === userId)
      .sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0));

    return res.json({
      success: true,
      ads: userAds,
      total: userAds.length,
    });
  } catch (err) {
    console.error("My ads fetch error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

/**
 * GET /api/ads/user/:userId
 * Returns a user's public posts (visible to anyone)
 */
router.get("/user/:userId", (req, res) => {
  try {
    const { userId } = req.params;

    if (!database || !Array.isArray(database.ads)) {
      return res.json({ success: true, ads: [], total: 0 });
    }

    const userAds = database.ads
      .filter((ad) => {
        const isOwner = ad.userId === userId || ad.seller_id === userId || ad.user_id === userId;
        const isActive = ad.status === "active" || ad.isActive === true;
        return isOwner && isActive;
      })
      .sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0));

    return res.json({
      success: true,
      ads: userAds,
      total: userAds.length,
    });
  } catch (err) {
    console.error("User ads fetch error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

/**
 * GET /api/ads/:adId
 * Returns a single ad by ID
 */
router.get("/:adId", (req, res) => {
  try {
    const { adId } = req.params;

    // Check SQLite first
    if (database && Array.isArray(database.ads)) {
      const ad = database.ads.find((a) => a.id === adId || String(a.id) === adId);
      if (ad) {
        return res.json({ success: true, ad });
      }
    }

    // Fallback to demo data
    const demoAd = adsDB.find((a) => String(a.id) === String(adId));
    if (demoAd) {
      return res.json({ success: true, ad: demoAd });
    }

    return res.status(404).json({ success: false, error: "Ad not found" });
  } catch (err) {
    console.error("Ad fetch error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/ads/track
router.post("/track", (req, res) => {
  try {
    console.log("🔥 TRACK ENDPOINT HIT");

    const { adId, event } = req.body;

    if (!adId || !event) {
      return res.status(400).json({
        success: false,
        message: "adId and event required"
      });
    }

    const record = {
      adId,
      event,
      timestamp: new Date()
    };

    adEvents.push(record);

    return res.json({
      success: true,
      message: "tracked"
    });
  } catch (error) {
    console.error("TRACK ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal error"
    });
  }
});

function initAdsRoutes(db) {
  database = db;
  return router;
}

module.exports = router;
module.exports.initAdsRoutes = initAdsRoutes;
