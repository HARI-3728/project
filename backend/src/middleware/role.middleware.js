const { sendError } = require('../utils/response');

/**
 * Restrict access to specific roles.
 * Usage: authorize('patient'), authorize('doctor', 'hospital')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated.');
    }
    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        `Access denied. This endpoint requires one of: ${roles.join(', ')}.`
      );
    }
    next();
  };
};

module.exports = { authorize };
