const logger = require('../utils/logger');
const { sendError } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    message = `A record with this ${field || 'value'} already exists.`;
    statusCode = 409;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join('. ');
    statusCode = 400;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    message = `Invalid ${err.path}: ${err.value}`;
    statusCode = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token. Please log in again.';
    statusCode = 401;
  }
  if (err.name === 'TokenExpiredError') {
    message = 'Token expired. Please log in again.';
    statusCode = 401;
  }

  // Log only server errors (5xx)
  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.path} — ${statusCode}: ${err.message}`, {
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    });
  }

  return sendError(res, statusCode, message);
};

module.exports = errorHandler;
