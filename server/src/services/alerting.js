const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || '';
const ALERT_THROTTLE_MS = Number(process.env.ALERT_THROTTLE_MS || 300000);
const ALERT_LATENCY_MS = Number(process.env.ALERT_LATENCY_MS || 30000);
const ALERT_MEMORY_RSS_MB = Number(process.env.ALERT_MEMORY_RSS_MB || 450);

const lastSentAt = new Map();

function shouldSend(dedupeKey, throttleMs) {
  const now = Date.now();
  const previous = lastSentAt.get(dedupeKey) || 0;
  if (now - previous < throttleMs) return false;
  lastSentAt.set(dedupeKey, now);
  return true;
}

async function notifyAlert(event, payload = {}, options = {}) {
  if (!ALERT_WEBHOOK_URL) return false;
  const severity = options.severity || payload.severity || 'warning';
  const dedupeKey = options.dedupeKey || event;
  const throttleMs = Number(options.throttleMs || ALERT_THROTTLE_MS);
  if (!shouldSend(dedupeKey, throttleMs)) return false;

  const body = {
    service: 'grahachara-api',
    environment: process.env.NODE_ENV || 'development',
    severity,
    event,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  try {
    const response = await fetch(ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.error('[Alerting] Webhook returned', response.status, response.statusText);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Alerting] Failed to send alert:', err.message);
    return false;
  }
}

function requestAlertMiddleware(req, res, next) {
  const startedAt = Date.now();
  res.on('finish', () => {
    const latencyMs = Date.now() - startedAt;
    if (res.statusCode >= 500) {
      notifyAlert('http_5xx', {
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        latencyMs,
      }, {
        severity: 'critical',
        dedupeKey: `http_5xx:${req.method}:${req.route?.path || req.path}`,
      }).catch(() => null);
    }

    if (latencyMs >= ALERT_LATENCY_MS) {
      notifyAlert('http_latency_high', {
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        latencyMs,
        thresholdMs: ALERT_LATENCY_MS,
      }, {
        severity: 'warning',
        dedupeKey: `http_latency:${req.method}:${req.route?.path || req.path}`,
      }).catch(() => null);
    }
  });
  next();
}

function startMemoryMonitor() {
  if (!ALERT_WEBHOOK_URL || !ALERT_MEMORY_RSS_MB) return null;
  const interval = setInterval(() => {
    const memory = process.memoryUsage();
    const rssMb = Math.round(memory.rss / 1024 / 1024);
    if (rssMb >= ALERT_MEMORY_RSS_MB) {
      notifyAlert('memory_rss_high', {
        rssMb,
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
        thresholdMb: ALERT_MEMORY_RSS_MB,
      }, {
        severity: 'critical',
        dedupeKey: 'memory_rss_high',
      }).catch(() => null);
    }
  }, 60000);
  if (typeof interval.unref === 'function') interval.unref();
  return interval;
}

module.exports = {
  notifyAlert,
  requestAlertMiddleware,
  startMemoryMonitor,
};
