/**
 * Watch Short Ad Routes
 * API endpoints for the "Watch Short Ad" feature in El Hannora
 * 
 * Endpoints:
 *   GET  /watch/shorts         — Get trending shorts for user's region
 *   POST /watch/shorts/session — Start a new watch session
 *   POST /watch/shorts/event   — Record watch/skip event
 *   GET  /watch/shorts/next    — Get next short in session queue
 *   POST /watch/shorts/end     — End watch session
 *   GET  /watch/shorts/stats   — Get aggregate watch statistics (admin)
 *   GET  /watch/region         — Detect user's region from IP
 */

const express = require("express");
const router = express.Router();

const {
  detectRegionFromIP,
  extractClientIP,
  fetchTrendingShorts,
  formatShortsForResponse,
  createWatchSession,
  recordWatchEvent,
  endWatchSession,
  getSessionStatus,
  getNextShortInSession,
  getWatchStatistics,
  COUNTRY_DATA,
  SHORTS_MAX_DURATION_SECONDS
} = require("../services/watchShortAdService");

// ─── GET /watch/region ──────────────────────────────────────────────────────
// Detect user's region from IP address
//
// Response:
// {
//   "success": true,
//   "region": {
//     "country": "Nigeria",
//     "country_code": "NG",
//     "city": "Lagos",
//     "region_name": "Africa",
//     "detection_method": "ip-api"
//   }
// }

router.get("/region", async (req, res) => {
  try {
    const clientIP = extractClientIP(req);
    const region = await detectRegionFromIP(clientIP, req.headers);
    
    return res.json({
      success: true,
      ip_detected: clientIP,
      region: region
    });
  } catch (error) {
    console.error("[Region Detection Error]", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to detect region",
      region: {
        country: "Global",
        country_code: "GLOBAL",
        state: null,
        city: null,
        region_name: "Global",
        detection_method: "error_fallback"
      }
    });
  }
});

// ─── GET /watch/shorts ──────────────────────────────────────────────────────
// Get trending shorts based on user's region
// Auto-detects region from IP if not provided
//
// Query Params:
//   region    - ISO country code (optional, auto-detected if not provided)
//   limit     - Max number of shorts (default: 10, max: 20)
//   category  - Filter by category (optional)
//
// Response:
// {
//   "success": true,
//   "region": "Nigeria",
//   "trending_shorts": [...]
// }

router.get("/shorts", async (req, res) => {
  try {
    let { region, state, city, limit, category } = req.query;
    
    // Auto-detect region if not provided
    let regionInfo;
    if (!region) {
      const clientIP = extractClientIP(req);
      regionInfo = await detectRegionFromIP(clientIP, req.headers);
      region = regionInfo.country_code;
    } else {
      region = region.toUpperCase();
      regionInfo = COUNTRY_DATA[region]
        ? {
            country: COUNTRY_DATA[region].name,
            country_code: region,
            state: state || null,
            city: city || null,
            region_name: COUNTRY_DATA[region].region
          }
        : { country: "Global", country_code: "GLOBAL", state: state || null, city: city || null, region_name: "Global" };
    }

    limit = Math.min(Math.max(parseInt(limit) || 10, 1), 20);

    const shorts = fetchTrendingShorts({
      countryCode: region,
      state: regionInfo.state || state || null,
      city: regionInfo.city || city || null,
      limit: limit,
      category: category || null,
      maxDuration: SHORTS_MAX_DURATION_SECONDS
    });

    const formattedShorts = formatShortsForResponse(shorts);

    return res.json({
      success: true,
      region: regionInfo.country || "Global",
      region_code: region,
      location: {
        country: regionInfo.country || "Global",
        state: regionInfo.state || state || null,
        city: regionInfo.city || city || null
      },
      priority_order: ["city", "state", "country", "global"],
      total_count: formattedShorts.length,
      preload_next: formattedShorts.slice(0, 3),
      trending_shorts: formattedShorts
    });
    
  } catch (error) {
    console.error("[Fetch Shorts Error]", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch trending shorts"
    });
  }
});

// ─── POST /watch/shorts/session ─────────────────────────────────────────────
// Start a new watch session for tracking user's progress
//
// Body:
// {
//   "user_id": "user_123" (optional),
//   "region": "NG" (optional, auto-detected),
//   "limit": 10 (optional),
//   "category": "technology" (optional)
// }
//
// Response:
// {
//   "success": true,
//   "session": {
//     "id": "session_uuid",
//     "region": "Nigeria",
//     "shorts_queue": [...],
//     "total_count": 10
//   }
// }

router.post("/shorts/session", async (req, res) => {
  try {
    let { region, state, city, limit, category } = req.body;
    // Always use the authenticated user's ID — never accept user_id from the request body.
    const authenticatedUserId = req.user?.id;
    
    // Auto-detect region if not provided
    let regionInfo;
    if (!region) {
      const clientIP = extractClientIP(req);
      regionInfo = await detectRegionFromIP(clientIP, req.headers);
      region = regionInfo.country_code;
    } else {
      region = region.toUpperCase();
      regionInfo = COUNTRY_DATA[region]
        ? {
            country: COUNTRY_DATA[region].name,
            country_code: region,
            state: state || null,
            city: city || null,
            region_name: COUNTRY_DATA[region].region
          }
        : { country: "Global", country_code: "GLOBAL", state: state || null, city: city || null, region_name: "Global" };
    }

    limit = Math.min(Math.max(parseInt(limit) || 10, 1), 20);

    const shorts = fetchTrendingShorts({
      countryCode: region,
      state: regionInfo.state || state || null,
      city: regionInfo.city || city || null,
      limit: limit,
      category: category || null,
      maxDuration: SHORTS_MAX_DURATION_SECONDS
    });
    
    if (shorts.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No trending shorts available for this region"
      });
    }
    
    const shortIds = shorts.map(s => s.id);
    const formattedShorts = formatShortsForResponse(shorts);
    
    // Create watch session
    const session = createWatchSession(authenticatedUserId, regionInfo.country, shortIds, {
      ...regionInfo,
      state: regionInfo.state || state || null,
      city: regionInfo.city || city || null
    });

    return res.json({
      success: true,
      session: {
        id: session.id,
        region: regionInfo.country,
        region_code: region,
        location: {
          country: regionInfo.country,
          state: regionInfo.state || state || null,
          city: regionInfo.city || city || null
        },
        status: session.status,
        total_count: shorts.length,
        current_index: 0
      },
      first_short: formattedShorts[0],
      preload_next: formattedShorts.slice(1, 4),
      trending_shorts: formattedShorts
    });
    
  } catch (error) {
    console.error("[Create Session Error]", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to create watch session"
    });
  }
});

// ─── POST /watch/shorts/event ───────────────────────────────────────────────
// Record a watch or skip event for a short
//
// Body:
// {
//   "session_id": "session_uuid",
//   "short_id": "ts_001",
//   "action": "watched" | "skipped",
//   "watch_duration": 45 (seconds, for "watched" action)
// }
//
// Response:
// {
//   "success": true,
//   "session_status": {...},
//   "has_next": true,
//   "next_short": {...}
// }

router.post("/shorts/event", (req, res) => {
  try {
    const { session_id, short_id, action, watch_duration } = req.body;
    
    // Validate required fields
    if (!session_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: "session_id"'
      });
    }
    if (!short_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: "short_id"'
      });
    }
    if (!action || !["watched", "skipped"].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "watched" or "skipped"'
      });
    }
    
    // Record the event
    const session = recordWatchEvent(
      session_id,
      short_id,
      action,
      parseInt(watch_duration) || 0,
      req.user?.id
    );
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Session not found or already ended"
      });
    }

    if (session.error) {
      return res.status(session.statusCode || 400).json({
        success: false,
        error: session.error
      });
    }
    
    // Get next short if available
    const nextInfo = getNextShortInSession(session_id);
    
    return res.json({
      success: true,
      event_recorded: {
        short_id: short_id,
        action: action,
        watch_duration: watch_duration || 0,
        duplicate_ignored: Boolean(session.duplicate_ignored)
      },
      session_status: {
        id: session.id,
        status: session.status,
        watched_count: session.watched.length,
        skipped_count: session.skipped.length,
        total_watch_time: session.total_watch_time,
        current_index: session.current_index,
        total_count: session.shorts_queue.length
      },
      has_next: nextInfo !== null,
      next_short: nextInfo,
      preload_next: nextInfo?.up_next || []
    });
    
  } catch (error) {
    console.error("[Record Event Error]", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to record watch event"
    });
  }
});

// ─── GET /watch/shorts/next ─────────────────────────────────────────────────
// Get the next short in the session queue
//
// Query Params:
//   session_id - Session UUID
//
// Response:
// {
//   "success": true,
//   "has_next": true,
//   "next_short": {...},
//   "position": 2,
//   "total": 10
// }

router.get("/shorts/next", (req, res) => {
  try {
    const { session_id } = req.query;
    
    if (!session_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query param: "session_id"'
      });
    }
    
    const nextInfo = getNextShortInSession(session_id);
    
    if (!nextInfo) {
      const session = getSessionStatus(session_id);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: "Session not found"
        });
      }
      
      return res.json({
        success: true,
        has_next: false,
        message: "No more shorts in queue",
        session_status: session.status
      });
    }
    
    return res.json({
      success: true,
      has_next: true,
      next_short: nextInfo.short,
      position: nextInfo.position,
      total: nextInfo.total,
      is_last: nextInfo.is_last,
      preload_next: nextInfo.up_next || []
    });
    
  } catch (error) {
    console.error("[Get Next Short Error]", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to get next short"
    });
  }
});

// ─── POST /watch/shorts/end ─────────────────────────────────────────────────
// End a watch session (called when user closes modal)
//
// Body:
// {
//   "session_id": "session_uuid"
// }
//
// Response:
// {
//   "success": true,
//   "session_summary": {
//     "total_watched": 5,
//     "total_skipped": 2,
//     "total_watch_time": 180,
//     "completion_rate": "71.4%"
//   }
// }

router.post("/shorts/end", (req, res) => {
  try {
    const { session_id } = req.body;
    
    if (!session_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: "session_id"'
      });
    }
    
    const session = endWatchSession(session_id);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Session not found"
      });
    }
    
    const totalContent = session.watched.length + session.skipped.length;
    const completionRate = totalContent > 0
      ? ((session.watched.length / totalContent) * 100).toFixed(1)
      : "0";
    
    return res.json({
      success: true,
      message: "Watch session ended",
      session_summary: {
        session_id: session.id,
        region: session.region,
        total_watched: session.watched.length,
        total_skipped: session.skipped.length,
        total_watch_time: session.total_watch_time,
        completion_rate: completionRate + "%",
        started_at: session.started_at,
        ended_at: session.ended_at,
        status: session.status
      }
    });
    
  } catch (error) {
    console.error("[End Session Error]", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to end session"
    });
  }
});

// ─── GET /watch/shorts/session/:id ──────────────────────────────────────────
// Get current session status
//
// Response:
// {
//   "success": true,
//   "session": {...}
// }

router.get("/shorts/session/:id", (req, res) => {
  try {
    const { id } = req.params;
    
    const session = getSessionStatus(id);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Session not found"
      });
    }
    
    return res.json({
      success: true,
      session: {
        id: session.id,
        region: session.region,
        status: session.status,
        watched_count: session.watched.length,
        skipped_count: session.skipped.length,
        total_watch_time: session.total_watch_time,
        current_index: session.current_index,
        total_count: session.shorts_queue.length,
        started_at: session.started_at,
        ended_at: session.ended_at
      }
    });
    
  } catch (error) {
    console.error("[Get Session Status Error]", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to get session status"
    });
  }
});

// ─── GET /watch/shorts/stats ────────────────────────────────────────────────
// Get aggregate watch statistics (admin endpoint)
//
// Response:
// {
//   "success": true,
//   "statistics": {
//     "total_sessions": 100,
//     "completed_sessions": 75,
//     "completion_rate": "75%",
//     ...
//   }
// }

router.get("/shorts/stats", (req, res) => {
  try {
    const isAdmin = Boolean(req.currentUser?.is_admin === true || `${req.currentUser?.role || ""}`.toLowerCase() === "admin");
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Access denied"
      });
    }

    const stats = getWatchStatistics();
    
    return res.json({
      success: true,
      statistics: stats,
      generated_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("[Get Statistics Error]", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to get statistics"
    });
  }
});

// ─── GET /watch/countries ───────────────────────────────────────────────────
// List all supported countries
//
// Response:
// {
//   "success": true,
//   "countries": [...]
// }

router.get("/countries", (req, res) => {
  try {
    const countries = Object.entries(COUNTRY_DATA).map(([code, data]) => ({
      code: code,
      name: data.name,
      region: data.region,
      language: data.defaultLanguage
    }));
    
    return res.json({
      success: true,
      total_count: countries.length,
      countries: countries
    });
    
  } catch (error) {
    console.error("[Get Countries Error]", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to get countries list"
    });
  }
});

module.exports = router;
