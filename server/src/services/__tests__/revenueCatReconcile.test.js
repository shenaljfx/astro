/**
 * reconcileFromRevenueCat — authoritative, UPGRADE-ONLY self-heal.
 * Pins: active RC entitlement heals the flag; inactive/absent/error never
 * downgrades (protects admin grants + survives API blips).
 */
const mockGetSubscriber = jest.fn();
const mockIsConfigured = jest.fn(() => true);
const mockState = { userDoc: null, updated: null };

jest.mock('../revenueCatClient', () => ({
  isConfigured: () => mockIsConfigured(),
  getSubscriber: (uid) => mockGetSubscriber(uid),
}));

jest.mock('../../config/firebase', () => ({
  COLLECTIONS: { USERS: 'users', REVENUECAT_WEBHOOK_EVENTS: 'e' },
  getDb: () => ({
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: true, data: () => mockState.userDoc }),
        update: async (u) => { mockState.updated = u; },
      }),
    }),
  }),
}));

const { reconcileFromRevenueCat } = require('../subscriptionReconcile');

beforeEach(() => {
  mockGetSubscriber.mockReset();
  mockIsConfigured.mockReturnValue(true);
  mockState.userDoc = { isSubscribed: false, subscription: { status: 'expired' } };
  mockState.updated = null;
});

test('not configured → reports it, no change', async () => {
  mockIsConfigured.mockReturnValue(false);
  const r = await reconcileFromRevenueCat('u1');
  expect(r.applied).toBe(false);
  expect(r.reason).toMatch(/not configured/i);
  expect(mockState.updated).toBeNull();
});

test('RevenueCat active → heals isSubscribed=true', async () => {
  mockGetSubscriber.mockResolvedValue({ found: true, active: true, latestExpiry: '2099-01-01T00:00:00Z', product: 'pro_monthly', store: 'play_store', entitlements: ['pro'] });
  const r = await reconcileFromRevenueCat('u1');
  expect(r.applied).toBe(true);
  expect(mockState.updated.isSubscribed).toBe(true);
  expect(mockState.updated['subscription.plan']).toBe('pro_monthly');
});

test('RevenueCat inactive → NO downgrade (upgrade-only)', async () => {
  mockState.userDoc = { isSubscribed: true, subscription: { status: 'active', plan: 'admin_grant' } };
  mockGetSubscriber.mockResolvedValue({ found: true, active: false, entitlements: [] });
  const r = await reconcileFromRevenueCat('u1');
  expect(r.applied).toBe(false);
  expect(mockState.updated).toBeNull(); // admin grant preserved
});

test('RevenueCat API error → fails safe, no change', async () => {
  mockGetSubscriber.mockRejectedValue(new Error('502 upstream'));
  const r = await reconcileFromRevenueCat('u1');
  expect(r.applied).toBe(false);
  expect(r.error).toBe(true);
  expect(mockState.updated).toBeNull();
});
