/**
 * revenueCatClient — authoritative "is this user subscribed right now?" lookups
 * straight from RevenueCat, independent of webhook delivery. This is what closes
 * the gap that webhook-history replay can't: older subscribers whose events were
 * never stored or have TTL-expired.
 *
 * Requires the SECRET v2 API key in REVENUECAT_API_KEY
 * (RevenueCat dashboard → Project settings → API keys → secret key).
 */
const RC_BASE = process.env.REVENUECAT_API_BASE || 'https://api.revenuecat.com/v1';

function isConfigured() {
  return !!process.env.REVENUECAT_API_KEY;
}

/**
 * Look up a subscriber and summarize their CURRENT entitlement state.
 * Returns { found, active, latestExpiry, product, store, entitlements }.
 * Throws on network / auth / unexpected errors (callers must fail SAFE — never
 * downgrade a user on an error).
 */
async function getSubscriber(appUserId) {
  const key = process.env.REVENUECAT_API_KEY;
  if (!key) throw new Error('REVENUECAT_API_KEY not configured');

  const res = await fetch(`${RC_BASE}/subscribers/${encodeURIComponent(appUserId)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  });

  if (res.status === 404) return { found: false, active: false, latestExpiry: null, product: null, store: null, entitlements: [] };
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`RevenueCat API ${res.status}: ${body.slice(0, 160)}`);
  }

  const data = await res.json();
  const sub = (data && data.subscriber) || {};
  const ents = sub.entitlements || {};
  const now = Date.now();

  // An entitlement is active if it has no expiry (lifetime) or expires in future.
  const active = Object.entries(ents).filter(([, e]) => {
    const exp = e && e.expires_date ? Date.parse(e.expires_date) : null;
    return exp === null || (Number.isFinite(exp) && exp > now);
  });

  let latestExpiry = null;
  for (const [, e] of active) {
    if (e.expires_date && (!latestExpiry || Date.parse(e.expires_date) > Date.parse(latestExpiry))) {
      latestExpiry = e.expires_date;
    }
  }
  const product = active.length ? active[0][1].product_identifier || null : null;
  const subs = sub.subscriptions || {};
  const store = product && subs[product] ? subs[product].store || null : null;

  return {
    found: true,
    active: active.length > 0,
    latestExpiry,
    product,
    store,
    entitlements: active.map(([name]) => name),
  };
}

module.exports = { isConfigured, getSubscriber };
