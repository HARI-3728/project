const cors = require('cors');
const { getFrontendOrigins, parseOrigin } = require('../config/env');

/**
 * CORS middleware for MediCare+ backend.
 *
 * Configures the `cors` package with:
 * - Explicit allowlist of frontend origins from FRONTEND_URL env var.
 * - Credentials: true so the frontend can send cookies if needed.
 * - Allowed methods: GET, POST, PUT, PATCH, DELETE, OPTIONS.
 * - Allowed headers: Content-Type, Authorization (and common CORS headers).
 * - OPTIONS preflight responses with 204 status.
 *
 * When credentials are enabled, wildcard origins are NOT used.
 */
const configureCors = () => {
  const allowedOrigins = getFrontendOrigins(process.env.FRONTEND_URL);

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }

      let normalizedOrigin;
      try {
        normalizedOrigin = parseOrigin(origin, 'Origin').origin;
      } catch {
        callback(null, false);
        return;
      }

      if (allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
      } else {
        callback(
          new Error(
            `CORS policy: Origin "${origin}" is not allowed. Allowed origins: ${allowedOrigins.join(', ')}`
          ),
          false
        );
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
    ],
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
    optionsSuccessStatus: 204,
    maxAge: 86400, // cache preflight for 24 hours
  });
};

module.exports = { configureCors };
