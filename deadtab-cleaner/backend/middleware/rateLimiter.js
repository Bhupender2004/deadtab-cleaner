/**
 * Rate Limiter Middleware
 */
const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Try again in 15 minutes.',
  },
});

// Stricter limiter for archive endpoints
const archiveLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Archive rate limit exceeded. Try again shortly.',
  },
});

module.exports = { apiLimiter, archiveLimiter };
