/**
 * computeStateFromEvents — pins the replay state machine against the live
 * webhook's mapping, incl. out-of-order events and the expiry safety net.
 */
jest.mock('../../config/firebase', () => ({ getDb: () => null, COLLECTIONS: { REVENUECAT_WEBHOOK_EVENTS: 'x', USERS: 'u' } }));
const { computeStateFromEvents } = require('../subscriptionReconcile');

const future = new Date(Date.now() + 30 * 864e5).toISOString();
const past = new Date(Date.now() - 5 * 864e5).toISOString();

describe('computeStateFromEvents', () => {
  test('no events → null', () => {
    expect(computeStateFromEvents([])).toBeNull();
    expect(computeStateFromEvents([{ eventType: 'NON_RENEWING_PURCHASE', productId: 'full_report' }])).toBeNull(); // one-time credit only
  });

  test('initial purchase → active/subscribed', () => {
    const s = computeStateFromEvents([{ eventType: 'INITIAL_PURCHASE', productId: 'pro_monthly', store: 'PLAY_STORE', subExpiresAt: future, eventTimestampMs: 1000 }]);
    expect(s).toMatchObject({ isSubscribed: true, status: 'active', plan: 'pro_monthly' });
  });

  test('replays IN ORDER regardless of array order (expiration after renewal → expired)', () => {
    const s = computeStateFromEvents([
      { eventType: 'EXPIRATION', eventTimestampMs: 3000 },
      { eventType: 'INITIAL_PURCHASE', productId: 'pro', subExpiresAt: past, eventTimestampMs: 1000 },
      { eventType: 'RENEWAL', productId: 'pro', subExpiresAt: past, eventTimestampMs: 2000 },
    ]);
    expect(s.isSubscribed).toBe(false);
    expect(s.status).toBe('expired');
  });

  test('cancellation keeps access active (until expiration)', () => {
    const s = computeStateFromEvents([
      { eventType: 'INITIAL_PURCHASE', productId: 'pro', subExpiresAt: future, eventTimestampMs: 1000 },
      { eventType: 'CANCELLATION', eventTimestampMs: 2000 },
    ]);
    expect(s.isSubscribed).toBe(true);
  });

  test('safety net: active state but known expiry already passed → expired', () => {
    const s = computeStateFromEvents([{ eventType: 'RENEWAL', productId: 'pro', subExpiresAt: past, eventTimestampMs: 1000 }]);
    expect(s.isSubscribed).toBe(false);
    expect(s.expiredByKnownExpiry).toBe(true);
  });

  test('lifetime one-time purchase → active with no expiry', () => {
    const s = computeStateFromEvents([{ eventType: 'NON_RENEWING_PURCHASE', productId: 'lifetime', eventTimestampMs: 1000 }]);
    expect(s).toMatchObject({ isSubscribed: true, status: 'active', lifetime: true });
  });
});
