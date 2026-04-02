/**
 * Security Middleware — Rate Limiting, Input Sanitization, CORS
 *
 * Provides:
 *   - globalLimiter       — 100 req/15min per IP (all routes)
 *   - authLimiter         — 10 req/15min per IP (login/register)
 *   - aiLimiter           — 5 req/min per IP (expensive AI endpoints)
 *   - reportLimiter       — 3 req/min per IP (full report generation)
 *   - chatLimiter         — 15 req/min per IP (chat messages)
 *   - webhookLimiter      — 30 req/min per IP (webhooks)
 *   - sanitizeInputs      — strips XSS from all req.body/query/params strings
 *   - corsOptions         — restricted CORS config
 *   - validateBirthData   — validates common birth data inputs
 */

const rateLimit = require('express-rate-limit');
const hpp = require('hpp');

// ─── XSS Sanitizer ─────────────────────────────────────────────
// Strips dangerous HTML/script tags from string values recursively

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript\s*:/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /on\w+\s*=[^\s>]*/gi,
  /<\/?iframe\b[^>]*>/gi,
  /<\/?object\b[^>]*>/gi,
  /<\/?embed\b[^>]*>/gi,
  /<link\b[^>]*>/gi,
  /<meta\b[^>]*>/gi,
  /<img\b[^>]*>/gi,
  /<svg\b[^>]*>/gi,
  /<\/?svg>/gi,
  /data\s*:\s*text\/html/gi,
  /vbscript\s*:/gi,
  /expression\s*\(/gi,
  /url\s*\(\s*['"]?\s*javascript/gi,
];

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  let cleaned = str;
  for (const pattern of XSS_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  // Strip null bytes
  cleaned = cleaned.replace(/\0/g, '');
  return cleaned.trim();
}

function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizeString(obj);
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Sanitize keys too (prevent prototype pollution)
    const safeKey = sanitizeString(key);
    if (safeKey === '__proto__' || safeKey === 'constructor' || safeKey === 'prototype') continue;
    sanitized[safeKey] = sanitizeObject(value);
  }
  return sanitized;
}

// ─── Middleware: Sanitize all inputs ────────────────────────────

function sanitizeInputs(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
}

// ─── Rate Limiters ──────────────────────────────────────────────

// Standard error response for rate limiting
function rateLimitHandler(req, res) {
  res.status(429).json({
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: res.getHeader('Retry-After'),
  });
}

/**
 * Global limiter — 200 requests per 15 minutes per IP
 * Generous enough for normal use, blocks abuse
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip health check endpoint
    return req.path === '/api/health';
  },
});

/**
 * Auth limiter — 10 attempts per 15 minutes per IP
 * Prevents brute force on auth endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Please wait before trying again.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * AI limiter — 5 requests per minute per IP
 * AI endpoints are expensive (~$0.01–$0.69 each)
 */
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  handler: (req, res) => {
    res.status(429).json({
      error: 'AI rate limit exceeded',
      message: 'AI requests are limited to 5 per minute. Please wait.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Report limiter — 3 requests per minute per IP
 * Full reports are the most expensive operation ($0.69 each)
 */
const reportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Report generation rate limit exceeded',
      message: 'Report generation is limited to 3 per minute. Please wait.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Chat limiter — 15 messages per minute per IP
 */
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Chat rate limit exceeded',
      message: 'Chat is limited to 15 messages per minute.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Webhook limiter — 30 requests per minute per IP
 * RevenueCat / external webhooks; should be generous
 */
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── CORS Configuration ────────────────────────────────────────

const ALLOWED_ORIGINS = [
  // Production
  'https://grahachara.com',
  'https://www.grahachara.com',
  'https://api.grahachara.com',
  'https://app.grahachara.com',
  // Dev & Expo
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^http:\/\/10\.0\.2\.2(:\d+)?$/,        // Android emulator
  /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/, // Local network (Expo Go)
  /^https?:\/\/.*\.exp\.direct$/,          // Expo tunnel
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const isAllowed = ALLOWED_ORIGINS.some((allowed) => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-App-Country'],
  maxAge: 86400, // Cache preflight for 24 hours
};

// ─── Input Validation Helpers ───────────────────────────────────

/**
 * Validate birth data inputs (reusable across routes)
 */
function validateBirthData(body) {
  const errors = [];

  if (body.birthDate) {
    const d = new Date(body.birthDate);
    if (isNaN(d.getTime())) {
      errors.push('birthDate must be a valid ISO 8601 date string');
    }
    // Sanity check: birth year between 1900 and current year + 1
    const year = d.getFullYear();
    if (year < 1900 || year > new Date().getFullYear() + 1) {
      errors.push('birthDate year must be between 1900 and current year');
    }
  }

  if (body.lat !== undefined) {
    const lat = parseFloat(body.lat);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.push('lat must be a number between -90 and 90');
    }
  }

  if (body.lng !== undefined) {
    const lng = parseFloat(body.lng);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.push('lng must be a number between -180 and 180');
    }
  }

  if (body.language) {
    const validLangs = ['en', 'si', 'ta', 'singlish'];
    if (!validLangs.includes(body.language)) {
      errors.push(`language must be one of: ${validLangs.join(', ')}`);
    }
  }

  if (body.userName && typeof body.userName === 'string') {
    if (body.userName.length > 100) {
      errors.push('userName must be 100 characters or fewer');
    }
  }

  return errors;
}

// ─── HPP (HTTP Parameter Pollution) ─────────────────────────────

const hppProtection = hpp();

// ─── Export ─────────────────────────────────────────────────────

module.exports = {
  globalLimiter,
  authLimiter,
  aiLimiter,
  reportLimiter,
  chatLimiter,
  webhookLimiter,
  sanitizeInputs,
  corsOptions,
  validateBirthData,
  hppProtection,
};
