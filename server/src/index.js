require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

// Firebase initialization
const { initFirebase } = require('./config/firebase');
initFirebase();

// Security middleware
const {
  globalLimiter,
  authLimiter,
  aiLimiter,
  reportLimiter,
  chatLimiter,
  sanitizeInputs,
  corsOptions,
  hppProtection,
} = require('./middleware/security');

const nakathRoutes = require('./routes/nakath');
const porondamRoutes = require('./routes/porondam');
const chatRoutes = require('./routes/chat');
const horoscopeRoutes = require('./routes/horoscope');
const shareRoutes = require('./routes/share');
const userRoutes = require('./routes/user');
const authRoutes = require('./routes/auth');
const rectificationRoutes = require('./routes/rectification');
const predictionRoutes = require('./routes/predictions');
const tokensRoutes = require('./routes/tokens');
const notificationRoutes = require('./routes/notifications');
const revenuecatRoutes = require('./routes/revenuecat');
const pricingRoutes = require('./routes/pricing');
const weeklyLagnaRoutes = require('./routes/weeklyLagna');
const readingRoutes = require('./routes/reading');
const enhancedRoutes = require('./routes/enhanced');
const jyotishRoutes = require('./routes/jyotish');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security Middleware (order matters) ────────────────────────

// 1. CORS — restricted origins (dev + production domains)
app.use(cors(corsOptions));

// 2. Helmet — security headers (HSTS, X-Frame-Options, etc.)
app.use(helmet({
  contentSecurityPolicy: false,          // Disable CSP in dev (blocks cross-origin fetch)
  crossOriginResourcePolicy: false,      // Allow cross-origin resource loading
  crossOriginOpenerPolicy: false,
}));

// 3. Request logging
app.use(morgan('dev'));

// 3b. gzip compression — large JSON reports compress 5-10x. Skip for already
// compressed payloads (images) and respect the standard Cache-Control hint.
app.use(compression({
  threshold: 1024,
  filter: function(req, res){
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

// 4. Body parsers with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 5. HTTP Parameter Pollution protection
app.use(hppProtection);

// 6. XSS sanitization on all inputs
app.use(sanitizeInputs);

// 7. Global rate limit — 200 req / 15 min per IP
app.use(globalLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Grahachara',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Routes — with per-route rate limits
app.use('/api/nakath', nakathRoutes);
app.use('/api/porondam', aiLimiter, porondamRoutes);
app.use('/api/chat', chatLimiter, chatRoutes);
app.use('/api/horoscope', horoscopeRoutes);         // individual route limiters applied inside
app.use('/api/share', shareRoutes);
app.use('/api/user', userRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/rectification', aiLimiter, rectificationRoutes);
app.use('/api/predictions', aiLimiter, predictionRoutes);
app.use('/api/tokens', tokensRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/revenuecat', revenuecatRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/weekly-lagna', weeklyLagnaRoutes);
app.use('/api/reading', aiLimiter, readingRoutes);
app.use('/api/enhanced', enhancedRoutes);
app.use('/api/jyotish', jyotishRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

const server = app.listen(PORT, () => {
  console.log(`🪐 Grahachara Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   AI Provider: ${process.env.AI_PROVIDER || 'openai'}`);

  // Start notification scheduler (only if Firebase is available)
  try {
    const { startScheduler } = require('./services/scheduler');
    const { getDb } = require('./config/firebase');
    if (getDb()) {
      startScheduler();
    } else {
      console.log('   ⚠️  Notification scheduler skipped — Firebase not available');
    }
  } catch (err) {
    console.error('   ⚠️  Notification scheduler failed to start:', err.message);
  }
});

// HTTP keep-alive + request timeouts — prevent hung connections during long
// AI report generation (Gemini calls can take 2-3 min) while still capping
// at a hard ceiling so dead clients don't accumulate.
server.setTimeout(360000);          // 6 min hard ceiling per request
server.keepAliveTimeout = 70000;    // 70s — must exceed common LB idle (60s)
server.headersTimeout = 75000;      // must exceed keepAliveTimeout

module.exports = app;
