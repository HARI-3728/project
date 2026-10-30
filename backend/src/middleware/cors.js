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
 *
 * IMPORTANT – order of operations (see app.js):
 *   1. This middleware runs FIRST, before all API routes.
 *   2. It answers OPTIONS preflight requests directly in the Express layer
 *      (before auth/route handlers touch the request), so browsers never
 *      see "Response to preflight request doesn't pass access control check".
 */
const configureCors = () => {
  // Allowlist – never a wildcard. Add/remove origins only here, or via
  // the FRONTEND_URL env var (which getFrontendOrigins reads from).
  const envOrigins = getFrontendOrigins(process.env.FRONTEND_URL);

  // Hard-coded allowlist for the deployed MediCare+ frontends, kept in sync
  // with the values documented in .env.example. envOrigins takes precedence
  // when the env var is set; the two lists must be consistent on Render.
  const allowedOrigins = [
    'https://project-dvcn656q9-hari-3728.vercel.app',
    'https://project-hari-3728.vercel.app',
    'http://localhost:5173',
    ...envOrigins,
  ].filter((origin, index, self) => self.indexOf(origin) === index);

  return cors({
    // Credentials are enabled (frontend may send cookies). With credentials
    // active, we MUST NOT use a wildcard origin – the origin callback below
    // enforces an explicit allowlist instead.
    credentials: true,

    origin: (origin, callback) => {
      // Allow requests without an Origin header (curl, server-to-server,
      // mobile apps, same-origin Node clients). These are not browser
      // requests, so CORS headers are irrelevant for them.
      // No Origin header → not a browser request. Allow without CORS headers.
      // This covers curl, server-to-server calls, mobile apps, and same-origin
      // Node clients.
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
        callback(null, false);
      }
    },

    // Supported HTTP methods. OPTIONS is included so the cors middleware
    // itself can short-circuit preflight requests.
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    // Headers the frontend is allowed to send. Content-Type and Authorization
    // are the two the MediCare+ API actually relies on; the rest are standard
    // CORS request headers browsers include automatically.
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
    ],

    // Additional headers the browser is allowed to read from responses.
    exposedHeaders: ['Content-Length', 'X-Request-Id'],

    // Chrome & Firefox expect 204 for successful preflights; 200 is fine too
    // but 204 is cleaner. This affects only OPTIONS responses the cors
    // middleware generates.
    optionsSuccessStatus: 204,

    // Cache preflight results in the browser for 24 hours. This reduces the
    // number of OPTIONS requests the browser sends for the same endpoint/origin
    // combination. It is safe because our allowed-methods / allowed-headers
    // lists are stable.
    maxAge: 86400,
  });
};

/**
 * Build the allowlist that would be used for the given FRONTEND_URL value.
 * Exposed only for tests / diagnostics; the middleware itself does not depend
 * on callers importing this.
 */
const allowedOriginsFor = (frontendUrlValue) => {
  const envOrigins = getFrontendOrigins(frontendUrlValue);
  const combined = [
    'https://project-dvcn656q9-hari-3728.vercel.app',
    'https://project-hari-3728.vercel.app',
    'http://localhost:5173',
    ...envOrigins,
  ].filter((origin, index, self) => self.indexOf(origin) === index);

  return combined;
};

module.exports = {
  configureCors,
  allowedOriginsFor,
};

/**
 * Build the allowlist that would be used for the given FRONTEND_URL value.
 * Exposed only for tests / diagnostics; the middleware itself does not depend
 * on callers importing this.
 */
module.exports.allowedOriginsFor = allowedOriginsFor;
