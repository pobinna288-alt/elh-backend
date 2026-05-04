const express = require("express");
const router = express.Router();

/**
 * MVP Ads Database (in-memory)
 * This does NOT affect any existing backend logic
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

    // No category → return all ads
    if (!category) {
      return res.json(adsDB);
    }

    // Filter by category (safe normalization)
    const filteredAds = adsDB.filter(ad =>
      String(ad.category).toLowerCase() === String(category).toLowerCase()
    );

    return res.json(filteredAds);
  } catch (error) {
    console.error("Ads fetch error:", error);
    return res.status(500).json({ success: false });
  }
};

router.get("/feed", handleFetchAds);
router.get("/", handleFetchAds);

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

module.exports = router;
