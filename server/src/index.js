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

// ─── Misconfiguration guard: prod secrets but not NODE_ENV=production ─────────
// Nearly every fail-closed protection above (JWT length, webhook auth, admin
// secret, CORS restriction, Firebase-down handling) branches on NODE_ENV. If
// this host is clearly a production deployment (real RevenueCat webhook key
// present) but NODE_ENV isn't 'production', those protections silently turn
// OFF. Fail fast so a dev .env can't be shipped to prod unnoticed.
if (!IS_PROD && process.env.REVENUECAT_WEBHOOK_AUTH_KEY && process.env.MOCK_PAYMENTS !== 'true') {
  throw new Error(
    `FATAL: REVENUECAT_WEBHOOK_AUTH_KEY is set but NODE_ENV="${process.env.NODE_ENV || '(unset)'}". ` +
    'Production hosts must set NODE_ENV=production so security guards engage. ' +
    'If this is genuinely a dev/staging box, unset the webhook key or set MOCK_PAYMENTS=true.'
  );
}

// Firebase initialization
const { initFirebase } = require('./config/firebase');
initFirebase();

// Mirror console output to LOG_DIR/server.log for the admin dashboard log tail
const { initLogTee } = require('./utils/logTee');
initLogTee('server');

// Live dashboard-editable operational settings (budget knobs) — cached in memory
const { startRuntimeConfig } = require('./services/runtimeConfig');
startRuntimeConfig();

// Security middleware
const {
  globalLimiter,
  authLimiter,
  aiLimiter,
  reportLimiter,
  chatLimiter,
  aiUserLimiter,
  userDataLimiter,
  previewLimiter,
  requireAdmin,
  sanitizeInputs,
  corsOptions,
  hppProtection,
} = require('./middleware/security');
const { enforceTokenNotRevoked } = require('./services/tokenRevocation');

const nakathRoutes = require('./routes/nakath');
const porondamRoutes = require('./routes/porondam');
const chatRoutes = require('./routes/chat');
const horoscopeRoutes = require('./routes/horoscope');
const shareRoutes = require('./routes/share');
const userRoutes = require('./routes/user');
const authRoutes = require('./routes/auth');
const rectificationRoutes = require('./routes/rectification');
const predictionRoutes = require('./routes/predictions');
const entitlementRoutes = require('./routes/entitlements');
const notificationRoutes = require('./routes/notifications');
const revenuecatRoutes = require('./routes/revenuecat');
const pricingRoutes = require('./routes/pricing');
const weeklyLagnaRoutes = require('./routes/weeklyLagna');
const readingRoutes = require('./routes/reading');
const enhancedRoutes = require('./routes/enhanced');
const jyotishRoutes = require('./routes/jyotish');
const geocodeRoutes = require('./routes/geocode');
const previewRoutes = require('./routes/preview');
const manifestRoutes = require('./routes/manifest');
const marketingRoutes = require('./routes/marketing');
const analyticsRoutes = require('./routes/analytics');
const babyRoutes = require('./routes/baby');
const adminRoutes = require('./routes/admin');
const { phoneAuth, requireSubscription } = require('./middleware/subscription');
const { requestAlertMiddleware, startMemoryMonitor } = require('./services/alerting');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Trust proxy (opt-in) ───────────────────────────────────────
// IP-based rate limiting relies on req.ip being the REAL client. Behind a
// reverse proxy / load balancer, req.ip is the proxy unless we trust the
// X-Forwarded-For chain — so all clients would share one rate-limit bucket.
// Set TRUST_PROXY to the number of proxy hops in front of the app (e.g. 1 for
// a single nginx/LB). Leave it UNSET when the app is exposed directly, because
// blindly trusting XFF then lets clients spoof their IP to dodge rate limits.
if (process.env.TRUST_PROXY !== undefined && process.env.TRUST_PROXY !== '') {
  const hops = Number(process.env.TRUST_PROXY);
  app.set('trust proxy', Number.isFinite(hops) ? hops : process.env.TRUST_PROXY);
  console.log(`   🔗 trust proxy set to: ${process.env.TRUST_PROXY}`);
}

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
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));

// 5. HTTP Parameter Pollution protection
app.use(hppProtection);

// 6. XSS sanitization on all inputs
app.use(sanitizeInputs);

// 7. Global rate limit — 200 req / 15 min per IP
app.use(globalLimiter);

// Health check
app.get('/api/health', (req, res) => {
  let firestore = null;
  let ephemeris = null;
  try { firestore = require('./services/firestoreCircuit').getState(); } catch (_) {}
  try { ephemeris = require('./engine/astrology').getEphemerisFallbackStats(); } catch (_) {}
  // Degrade the reported status when the DB breaker is open so external
  // health checks / dashboards can see a real problem without parsing logs.
  const degraded = firestore && firestore.state === 'open';
  res.status(degraded ? 503 : 200).json({
    status: degraded ? 'degraded' : 'ok',
    app: 'Grahachara',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    firestore,
    ephemeris,
  });
});

var paidAccess = [phoneAuth, enforceTokenNotRevoked, requireSubscription];

/**
 * paidAccess with explicit route exemptions. Exempted paths skip the
 * mount-level subscription gate; their OWN route-level middleware governs
 * access instead (requireSubscriptionOrCredit for one-time-product routes,
 * optionalAuth for free-funnel and user-owned-artifact routes). req.path
 * here is relative to the mount point.
 */
function paidAccessExcept(exemptPrefixes) {
  return [phoneAuth, enforceTokenNotRevoked, function (req, res, next) {
    var p = req.path;
    for (var i = 0; i < exemptPrefixes.length; i++) {
      var ex = exemptPrefixes[i];
      if (p === ex || p.indexOf(ex + '/') === 0) return next();
    }
    return requireSubscription(req, res, next);
  }];
}

// Routes — with per-route rate limits
// /month-ahead skips the mount gate but self-gates: first 10 days free
// (generic Rahu Kalaya + best-time date math), days beyond that return as
// locked stubs unless subscribed. The rest of /api/nakath stays
// subscription-gated; the chart-tuned activity finder remains the Pro upsell.
app.use('/api/nakath', paidAccessExcept(['/month-ahead']), nakathRoutes);
// Porondam: /check + /report admit one-time credit buyers (route-level
// requireSubscriptionOrCredit); history/saved are the buyer's own artifacts.
app.use('/api/porondam', paidAccessExcept([
  '/check',        // route-gated: subscription OR porondam credit
  '/report',       // route-gated: subscription OR porondam credit (also /report/health — pre-payment check)
  '/my-history',   // user's own saved results (optionalAuth, uid-scoped)
  '/saved',        // user's own saved result by id
  '/history',      // delete own history entry (phoneAuth in route)
]), porondamRoutes);
app.use('/api/chat', chatLimiter, paidAccess, chatRoutes);
// Horoscope: onboarding reveal is the FREE funnel hook (must work logged-out);
// full-report flow admits one-time credit buyers; my-reports/saved-report are
// the buyer's own purchased artifacts.
app.use('/api/horoscope', paidAccessExcept([
  '/onboarding-reveal', // free funnel — the identity reveal + future-window cards
  '/birth-chart',       // POST route-gated: subscription OR report credit. GET /birth-chart/data is subscription-only (Home basic chart)
  '/full-report-ai',    // route-gated: subscription OR report credit
  '/report-progress',   // polling own generation (phoneAuth in route)
  '/my-reports',        // own saved reports list
  '/saved-report',      // own saved report content (+ delete)
  '/report-feedback',   // feedback on own report
]), horoscopeRoutes);
app.use('/api/share', userDataLimiter, paidAccess, shareRoutes);
app.use('/api/user', userDataLimiter, userRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/rectification', aiLimiter, paidAccess, rectificationRoutes);
app.use('/api/predictions', aiLimiter, paidAccess, predictionRoutes);
app.use('/api/entitlements', userDataLimiter, entitlementRoutes);
app.use('/api/notifications', userDataLimiter, notificationRoutes);
app.use('/api/revenuecat', revenuecatRoutes);
app.use('/api/pricing', userDataLimiter, pricingRoutes);
app.use('/api/weekly-lagna', paidAccess, weeklyLagnaRoutes);
app.use('/api/reading', aiLimiter, paidAccess, readingRoutes);
app.use('/api/enhanced', userDataLimiter, paidAccess, enhancedRoutes);
app.use('/api/jyotish', userDataLimiter, paidAccess, jyotishRoutes);
app.use('/api/geocode', geocodeRoutes);
// Public teasers (no subscription) — free kendara preview feeds the funnel.
// previewLimiter (20/min/IP) is tighter than userDataLimiter because these
// routes run unauthenticated Swiss-Ephemeris-heavy calculations.
app.use('/api/preview', previewLimiter, previewRoutes);
app.use('/api/manifest', aiLimiter, paidAccess, manifestRoutes);
// Baby Kendara: /compose + /generate admit one-time baby_kendara credit buyers (route-gated).
app.use('/api/baby', userDataLimiter, paidAccessExcept(['/compose', '/generate']), babyRoutes);
app.use('/api/marketing', marketingRoutes);
// Analytics — public (paywall funnel events fire for free/logged-out users)
app.use('/api/analytics', userDataLimiter, analyticsRoutes);

// God-mode dashboard API (admin.grahachara.com → nginx → /admin/*).
// Own rate limiter + Firebase-token allowlist auth inside the router.
app.use('/admin', adminRoutes);

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

  // Job worker. Without a running worker, every queued AI job (baby narrative,
  // full report) sits unclaimed forever and the app shows "failed" after the
  // poll timeout. Three modes:
  //   • START_EMBEDDED_WORKER=true  → run the loop IN-PROCESS (single-container
  //     deploys that want it embedded; note: heavy work shares this event loop).
  //   • dev default                 → FORK a separate worker process, so the
  //     AI/chart CPU work never blocks the API event loop (fixes the 30s+
  //     enqueue + crawling progress polls seen with the in-process loop).
  //   • production default          → OFF; the VM runs a dedicated worker
  //     container (forking a 2nd Node in a 512MB container would OOM).
  const workerPref = String(process.env.START_EMBEDDED_WORKER || '').toLowerCase();
  const isProd = process.env.NODE_ENV === 'production';
  if (workerPref === 'true') {
    try {
      const { startWorkerLoop } = require('./services/jobWorker');
      startWorkerLoop({ workerId: `api-${process.pid}` });
      console.log('   ⚙️  Embedded durable worker started (in-process)');
    } catch (err) {
      console.error('   ⚠️  Embedded worker failed to start:', err.message);
    }
  } else if (!isProd && workerPref !== 'false') {
    try {
      const path = require('path');
      const { fork } = require('child_process');
      const workerProc = fork(path.join(__dirname, '..', 'scripts', 'worker.js'), [], {
        env: { ...process.env, WORKER_ID: `dev-fork-${process.pid}`, WORKER_EXIT_IF_ORPHANED: 'true' },
        stdio: 'inherit',
      });
      workerProc.on('exit', (code) => console.warn(`   ⚙️  Dev worker process exited (code ${code}) — AI jobs won't process until restart`));
      // Don't leave an orphaned worker behind when the API stops.
      const killWorker = () => { try { workerProc.kill(); } catch (_) {} };
      process.on('exit', killWorker);
      process.on('SIGINT', () => { killWorker(); process.exit(0); });
      process.on('SIGTERM', () => { killWorker(); process.exit(0); });
      console.log(`   ⚙️  Dev worker forked as separate process (pid ${workerProc.pid}) — no event-loop contention`);
    } catch (err) {
      console.error('   ⚠️  Dev worker fork failed:', err.message);
    }
  } else {
    console.log('   ⚙️  Worker OFF (external worker container expected) — AI report jobs need a running worker');
  }
});

// HTTP keep-alive + request timeouts — prevent hung connections during long
// AI report generation (Gemini calls can take 2-3 min) while still capping
// at a hard ceiling so dead clients don't accumulate.
server.setTimeout(360000);          // 6 min hard ceiling per request
server.keepAliveTimeout = 70000;    // 70s — must exceed common LB idle (60s)
server.headersTimeout = 75000;      // must exceed keepAliveTimeout

module.exports = app;
