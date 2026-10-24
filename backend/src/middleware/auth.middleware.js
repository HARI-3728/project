const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendError } = require('../utils/response');

const protect = async (req, res, next) => {
  try {
    let token;

    // Support Bearer token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendError(res, 401, 'Not authenticated. Please log in.');
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 401, 'Your session has expired. Please log in again.');
      }
      return sendError(res, 401, 'Invalid authentication token.');
    }

    // Fetch user from DB (ensures account still exists and is active)
    const user = await User.findById(decoded.id);
    if (!user) {
      return sendError(res, 401, 'The account associated with this token no longer exists.');
    }
    if (!user.isActive) {
      return sendError(res, 403, 'Your account has been deactivated. Please contact support.');
    }

    // Verify role matches token (prevent role escalation)
    if (user.role !== decoded.role) {
      return sendError(res, 403, 'Token role mismatch. Please log in again.');
    }

    req.user = user;
    next();
  } catch (error) {
    return sendError(res, 500, 'Authentication error.');
  }
};

module.exports = { protect };
