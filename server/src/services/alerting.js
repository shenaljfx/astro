const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || '';
// Telegram channel: set BOTH to route alerts to a Telegram chat via Bot API
// (works alongside or instead of the generic webhook).
const TELEGRAM_BOT_TOKEN = process.env.ALERT_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.ALERT_TELEGRAM_CHAT_ID || '';
const TELEGRAM_ENABLED = !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
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

// Render the alert as a compact human-readable Telegram message.
function formatTelegramText(body) {
  const icon = body.severity === 'critical' ? '🔴' : body.severity === 'warning' ? '🟡' : 'ℹ️';
  const lines = [`${icon} ${body.event} — ${body.severity}`, `env: ${body.environment}`];
  for (const [key, value] of Object.entries(body)) {
    if (['service', 'environment', 'severity', 'event', 'timestamp'].includes(key)) continue;
    if (value == null) continue;
    lines.push(`${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`);
  }
  lines.push(body.timestamp);
  // Telegram caps messages at 4096 chars — trim defensively.
  return lines.join('\n').slice(0, 3900);
}

async function sendTelegram(body) {
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: formatTelegramText(body) }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Telegram API ${response.status}: ${detail.slice(0, 200)}`);
  }
}

async function sendWebhook(body) {
  const response = await fetch(ALERT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Webhook ${response.status} ${response.statusText}`);
}

async function notifyAlert(event, payload = {}, options = {}) {
  if (!ALERT_WEBHOOK_URL && !TELEGRAM_ENABLED) return false;
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

  // Send to every configured channel; one failing must not block the other.
  const attempts = [];
  if (TELEGRAM_ENABLED) attempts.push(sendTelegram(body));
  if (ALERT_WEBHOOK_URL) attempts.push(sendWebhook(body));
  const results = await Promise.allSettled(attempts);
  const anyOk = results.some((r) => r.status === 'fulfilled');
  results.forEach((r) => {
    if (r.status === 'rejected') console.error('[Alerting] Failed to send alert:', r.reason && r.reason.message);
  });
  return anyOk;
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
  if ((!ALERT_WEBHOOK_URL && !TELEGRAM_ENABLED) || !ALERT_MEMORY_RSS_MB) return null;
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
