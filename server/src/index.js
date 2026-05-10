require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

// ─── Production safety guards (fail fast at boot) ───────────────
// These prevent dev-only escape hatches from accidentally shipping to prod.
const IS_PROD = process.env.NODE_ENV === 'production';

if (IS_PROD) {
  if (process.env.MOCK_PAYMENTS === 'true') {
    throw new Error('FATAL: MOCK_PAYMENTS=true cannot be enabled in production. This bypasses all subscription checks.');
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('FATAL: JWT_SECRET must be set and >= 32 chars in production. Generate one: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  }
  if (!process.env.REVENUECAT_WEBHOOK_AUTH_KEY) {
    throw new Error('FATAL: REVENUECAT_WEBHOOK_AUTH_KEY must be set in production. Without it, anyone can forge subscription webhooks.');
  }
  if (!process.env.GOOGLE_OAUTH_CLIENT_ID) {
    throw new Error('FATAL: GOOGLE_OAUTH_CLIENT_ID must be set in production.');
  }
}

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
  aiUserLimiter,
  userDataLimiter,
  requireAdmin,
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
const geocodeRoutes = require('./routes/geocode');
const manifestRoutes = require('./routes/manifest');
const { phoneAuth, requireSubscription } = require('./middleware/subscription');
const { requestAlertMiddleware, startMemoryMonitor } = require('./services/alerting');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security Middleware (order matters) ────────────────────────

// 1. CORS — restricted origins (dev + production domains)
app.use(cors(corsOptions));

// 2. Helmet — security headers (HSTS, X-Frame-Options, etc.)
app.use(helmet({
  contentSecurityPolicy: IS_PROD ? undefined : false,  // Enable default CSP in production
  crossOriginResourcePolicy: false,      // Allow cross-origin resource loading
  crossOriginOpenerPolicy: false,
}));

// 3. Request logging
app.use(morgan('dev'));

// 3a. Operational alert hooks — throttled and inert unless ALERT_WEBHOOK_URL is set
app.use(requestAlertMiddleware);

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
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

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

var paidAccess = [phoneAuth, requireSubscription];

// Routes — with per-route rate limits
app.use('/api/nakath', paidAccess, nakathRoutes);
app.use('/api/porondam', paidAccess, porondamRoutes);
app.use('/api/chat', chatLimiter, paidAccess, chatRoutes);
app.use('/api/horoscope', paidAccess, horoscopeRoutes);
app.use('/api/share', userDataLimiter, paidAccess, shareRoutes);
app.use('/api/user', userDataLimiter, userRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/rectification', aiLimiter, paidAccess, rectificationRoutes);
app.use('/api/predictions', aiLimiter, paidAccess, predictionRoutes);
app.use('/api/tokens', userDataLimiter, tokensRoutes);
app.use('/api/notifications', userDataLimiter, notificationRoutes);
app.use('/api/revenuecat', revenuecatRoutes);
app.use('/api/pricing', userDataLimiter, pricingRoutes);
app.use('/api/weekly-lagna', paidAccess, weeklyLagnaRoutes);
app.use('/api/reading', aiLimiter, paidAccess, readingRoutes);
app.use('/api/enhanced', userDataLimiter, paidAccess, enhancedRoutes);
app.use('/api/jyotish', userDataLimiter, paidAccess, jyotishRoutes);
app.use('/api/geocode', geocodeRoutes);
app.use('/api/manifest', aiLimiter, paidAccess, manifestRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    // Never leak error details in production
  });
});

const server = app.listen(PORT, () => {
  console.log(`🪐 Grahachara Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   AI Provider: ${process.env.AI_PROVIDER || 'openai'}`);
  startMemoryMonitor();

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

  if (process.env.START_EMBEDDED_WORKER === 'true') {
    try {
      const { startWorkerLoop } = require('./services/jobWorker');
      startWorkerLoop({ workerId: `api-${process.pid}` });
      console.log('   ⚙️  Embedded durable worker started');
    } catch (err) {
      console.error('   ⚠️  Embedded worker failed to start:', err.message);
    }
  }
});

// HTTP keep-alive + request timeouts — prevent hung connections during long
// AI report generation (Gemini calls can take 2-3 min) while still capping
// at a hard ceiling so dead clients don't accumulate.
server.setTimeout(360000);          // 6 min hard ceiling per request
server.keepAliveTimeout = 70000;    // 70s — must exceed common LB idle (60s)
server.headersTimeout = 75000;      // must exceed keepAliveTimeout

module.exports = app;
