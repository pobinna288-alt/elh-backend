const express = require('express');
const router = express.Router();
const {
  buildInstantConnectionMatch,
  startConnectionRequest,
  respondToConnectionRequest,
  completeConnectionRequest,
  getConnectionStatus,
  parseIntent,
} = require('../services/instantConnectionSearchService');

// ============================================
// RATE LIMITING (Custom implementation)
// ============================================

const rateLimitStore = new Map();

/**
 * Create a rate limiter middleware
 * @param {object} options - Rate limit options
 * @returns {function} Express middleware
 */
function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60000; // 1 minute default
  const max = options.max || 100;
  const message = options.message || {
    success: false,
    error: 'Too many requests. Please try again later.',
    retry_after_seconds: Math.ceil(windowMs / 1000)
  };
  
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    
    if (!entry || now - entry.windowStart > windowMs) {
      // Reset or create new window
      entry = {
        windowStart: now,
        count: 0
      };
    }
    
    entry.count++;
    rateLimitStore.set(key, entry);
    
    // Clean up old entries periodically
    if (rateLimitStore.size > 10000) {
      const cutoff = now - windowMs;
      for (const [k, v] of rateLimitStore) {
        if (v.windowStart < cutoff) {
          rateLimitStore.delete(k);
        }
      }
    }
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil((entry.windowStart + windowMs) / 1000));
    
    if (entry.count > max) {
      return res.status(429).json(message);
    }
    
    next();
  };
}

/**
 * Rate limiter for search endpoints
 * Allows 100 requests per minute per IP
 */
const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Too many search requests. Please try again later.',
    retry_after_seconds: 60
  }
});

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  for (const key in req.query) {
    if (typeof req.query[key] === 'string') {
      req.query[key] = req.query[key]
        .replace(/[;'"\\]/g, '')
        .substring(0, 300);
    }
  }

  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key]
          .replace(/[;'"\\]/g, '')
          .substring(0, 500);
      }
    }
  }

  next();
};

router.use(sanitizeInput);

router.get('/', searchRateLimiter, (req, res) => {
  try {
    const database = req.app.get('database');

    if (!database || !database.ads) {
      return res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

    const query = (req.query.query || req.query.q || '').toString().trim();
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required',
        message: 'Provide query or q in the request.'
      });
    }

    const userId = req.user?.id || null;

    const result = buildInstantConnectionMatch({
      database,
      query,
      req,
      userId,
    });

    const statusCode = result.success ? 200 : 404;
    return res.status(statusCode).json({
      ...result,
      status_code: statusCode,
    });

  } catch (error) {
    console.error('[Instant Match Error]', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to resolve best seller match'
    });
  }
});

router.post('/connect', searchRateLimiter, (req, res) => {
  try {
    const database = req.app.get('database');

    if (!database) {
      return res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

    const query = (req.body.query || req.body.q || '').toString().trim();
    const connectionId = (req.body.connection_id || '').toString().trim() || null;
    const bestMatch = req.body.best_match || null;
    const alternatives = Array.isArray(req.body.alternatives) ? req.body.alternatives : [];

    if (!connectionId && (!bestMatch || !bestMatch.seller_id)) {
      return res.status(400).json({
        success: false,
        error: 'connection_id or best_match with seller_id is required'
      });
    }

    const intent = req.body.intent && req.body.intent.category
      ? req.body.intent
      : parseIntent(query || 'service request');

    const connection = startConnectionRequest({
      database,
      query,
      intent,
      bestMatch,
      alternatives,
      buyerId: req.user?.id || null,
      connectionId,
    });

    return res.json({
      success: true,
      message: 'Connection request created',
      timeout_seconds: 45,
      connection,
    });

  } catch (error) {
    console.error('[Connect Error]', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to create connection request'
    });
  }
});

router.post('/connect/:connectionId/respond', searchRateLimiter, (req, res) => {
  try {
    const database = req.app.get('database');
    if (!database) {
      return res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

    const accepted = req.body.accepted !== false;
    const result = respondToConnectionRequest({
      database,
      connectionId: req.params.connectionId,
      sellerId: req.body.seller_id || null,
      accepted,
    });

    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error('[Connection Response Error]', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to update connection response'
    });
  }
});

router.post('/connect/:connectionId/complete', searchRateLimiter, (req, res) => {
  try {
    const database = req.app.get('database');
    if (!database) {
      return res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

    const result = completeConnectionRequest({
      database,
      connectionId: req.params.connectionId,
      completed: req.body.completed !== false,
    });

    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error('[Connection Complete Error]', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to complete connection'
    });
  }
});

router.get('/connect/:connectionId/status', searchRateLimiter, (req, res) => {
  try {
    const database = req.app.get('database');
    if (!database) {
      return res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

    const result = getConnectionStatus({
      database,
      connectionId: req.params.connectionId,
    });

    if (!result.success) {
      return res.status(result.statusCode || 404).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error('[Connection Status Error]', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch connection status'
    });
  }
});

router.get('/docs', (_req, res) => {
  return res.json({
    success: true,
    api_version: '3.0.0',
    mode: 'intent_match_connect_mvp',
    principles: [
      'speed over complexity',
      'decision over browsing',
      'connection over listing',
    ],
    endpoints: [
      {
        method: 'GET',
        path: '/api/search?query=<text>',
        description: 'Resolve one best seller and up to 3 alternatives after strict dispatch filters, and reserve the selected seller immediately.'
      },
      {
        method: 'POST',
        path: '/api/search/connect',
        description: 'Confirm an existing reserved connection (via connection_id) or create one from provided best_match candidates.'
      },
      {
        method: 'POST',
        path: '/api/search/connect/:connectionId/respond',
        description: 'Seller accepts or rejects; rejection auto-routes to next best seller.'
      },
      {
        method: 'POST',
        path: '/api/search/connect/:connectionId/complete',
        description: 'Track successful or cancelled interaction outcome.'
      },
      {
        method: 'GET',
        path: '/api/search/connect/:connectionId/status',
        description: 'Read current connection state and response timing.'
      }
    ]
  });
});

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Initialize search routes with database reference
 * @param {object} database - Database object reference
 * @returns {Router} Express router
 */
function initSearchRoutes(database) {
  router.use((req, res, next) => {
    req.app.set('database', database);
    next();
  });
  
  return router;
}

// ============================================
// EXPORTS
// ============================================

module.exports = router;
module.exports.initSearchRoutes = initSearchRoutes;
