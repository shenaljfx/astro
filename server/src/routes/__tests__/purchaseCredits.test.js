/**
 * Tests for the one-time-purchase credit system (Phase 0 monetization fix).
 *
 * Covers:
 *   1. purchaseCredits service — add (idempotent), find, consume
 *   2. requireSubscriptionOrCredit middleware — subscription / credit /
 *      entitlement-retry / 402 / MOCK_PAYMENTS paths
 *   3. Webhook + route wiring — NON_RENEWING_PURCHASE only grants lifetime
 *      Pro for the real 'lifetime' product; consumables mint credits; the
 *      generation routes accept subscription-or-credit; the onboarding
 *      reveal is exempt from the mount-level paywall
 */

const fs = require('fs');
const path = require('path');

// ─── In-memory Firestore mock (doc ops + simple where-chains) ────────

function createMockDb() {
  const store = {};

  function makeDocRef(collectionName, id) {
    const key = `${collectionName}/${id}`;
    return {
      _key: key,
      get: async () => ({
        exists: key in store,
        data: () => (store[key] ? JSON.parse(JSON.stringify(store[key])) : undefined),
      }),
      set: async (data, opts) => {
        if (opts && opts.merge) store[key] = { ...(store[key] || {}), ...data };
        else store[key] = JSON.parse(JSON.stringify(data));
      },
      update: async (data) => {
        if (!store[key]) throw new Error('not-found');
        for (const [field, val] of Object.entries(data)) {
          if (field.includes('.')) {
            const parts = field.split('.');
            let obj = store[key];
            for (let i = 0; i < parts.length - 1; i++) {
              if (!obj[parts[i]] || typeof obj[parts[i]] !== 'object') obj[parts[i]] = {};
              obj = obj[parts[i]];
            }
            obj[parts[parts.length - 1]] = val;
          } else {
            store[key][field] = val;
          }
        }
      },
    };
  }

  function makeQuery(collectionName, filters) {
    return {
      where(field, op, value) {
        return makeQuery(collectionName, filters.concat([[field, value]]));
      },
      limit() { return this; },
      orderBy() { return this; },
      get: async () => {
        const docs = Object.entries(store)
          .filter(([key]) => key.startsWith(`${collectionName}/`))
          .filter(([, data]) => filters.every(([field, value]) => data[field] === value))
          .map(([key, data]) => ({
            id: key.slice(collectionName.length + 1),
            data: () => JSON.parse(JSON.stringify(data)),
            ref: makeDocRef(collectionName, key.slice(collectionName.length + 1)),
          }));
        return { empty: docs.length === 0, size: docs.length, docs };
      },
    };
  }

  return {
    store,
    collection(name) {
      const query = makeQuery(name, []);
      return {
        doc: (id) => makeDocRef(name, id),
        where: query.where.bind(query),
        limit: query.limit,
        get: query.get,
      };
    },
    runTransaction: async (fn) => fn({
      get: async (ref) => ref.get(),
      set: (ref, data) => { ref.set(data); },
      update: (ref, data) => {
        // synchronous apply against the same store
        const key = ref._key;
        if (!store[key]) throw new Error('not-found');
        Object.entries(data).forEach(([field, val]) => { store[key][field] = val; });
      },
    }),
  };
}

let mockDb;

jest.mock('../../config/firebase', () => ({
  getDb: () => mockDb,
  getAuth: () => null,
  COLLECTIONS: {
    USERS: 'users',
    REVENUECAT_WEBHOOK_EVENTS: 'revenuecatWebhookEvents',
    PURCHASE_CREDITS: 'purchaseCredits',
  },
}));

jest.mock('../../config/pricing', () => ({
  detectCurrency: () => 'LKR',
  getPricing: () => ({
    subscription: { amount: 490, period: 'month', label: 'LKR 490/month' },
    porondam: { amount: 990, label: 'LKR 990', productId: 'porondam_check' },
    report: { amount: 750, label: 'LKR 750', productId: 'full_report' },
  }),
}));

function mockReq(overrides = {}) {
  return { headers: {}, body: {}, user: null, ...overrides };
}

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { res.statusCode = code; return res; },
    json(data) { res.body = data; return res; },
  };
  return res;
}

function seedUser(uid, data) {
  mockDb.store[`users/${uid}`] = { uid, subscription: { status: 'pending' }, ...data };
}

beforeEach(() => {
  mockDb = createMockDb();
  delete process.env.MOCK_PAYMENTS;
  process.env.NODE_ENV = 'test';
});

// ═══════════════════════════════════════════════════════════════════
//  1. purchaseCredits service
// ═══════════════════════════════════════════════════════════════════

describe('purchaseCredits service', () => {
  const credits = require('../../services/purchaseCredits');

  test('addPurchaseCredit writes one available credit', async () => {
    const result = await credits.addPurchaseCredit('u1', 'full_report', { eventId: 'evt1' });
    expect(result.created).toBe(true);
    expect(result.type).toBe('report');
    const stored = mockDb.store[`purchaseCredits/${result.id}`];
    expect(stored.status).toBe('available');
    expect(stored.uid).toBe('u1');
    expect(stored.productId).toBe('full_report');
  });

  test('addPurchaseCredit is idempotent per (uid, eventId)', async () => {
    const first = await credits.addPurchaseCredit('u1', 'porondam_check', { eventId: 'evt-dup' });
    const second = await credits.addPurchaseCredit('u1', 'porondam_check', { eventId: 'evt-dup' });
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    const all = Object.keys(mockDb.store).filter((k) => k.startsWith('purchaseCredits/'));
    expect(all).toHaveLength(1);
  });

  test('addPurchaseCredit returns null for unknown products', async () => {
    const result = await credits.addPurchaseCredit('u1', 'some_future_sku', { eventId: 'evt2' });
    expect(result).toBeNull();
  });

  test('getAvailableCredit finds only available credits of the right type', async () => {
    await credits.addPurchaseCredit('u1', 'full_report', { eventId: 'evtA' });
    expect(await credits.getAvailableCredit('u1', 'porondam')).toBeNull();
    expect(await credits.getAvailableCredit('u2', 'report')).toBeNull();
    const found = await credits.getAvailableCredit('u1', 'report');
    expect(found).not.toBeNull();
    expect(found.type).toBe('report');
  });

  test('consumeCredit consumes exactly once', async () => {
    const added = await credits.addPurchaseCredit('u1', 'full_report', { eventId: 'evtC' });
    expect(await credits.consumeCredit(added.id, 'ent1')).toBe(true);
    expect(await credits.consumeCredit(added.id, 'ent2')).toBe(false);
    const stored = mockDb.store[`purchaseCredits/${added.id}`];
    expect(stored.status).toBe('consumed');
    expect(stored.entitlementId).toBe('ent1');
    expect(await credits.getAvailableCredit('u1', 'report')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
//  2. requireSubscriptionOrCredit middleware
// ═══════════════════════════════════════════════════════════════════

describe('requireSubscriptionOrCredit middleware', () => {
  const { requireSubscriptionOrCredit } = require('../../middleware/subscription');
  const credits = require('../../services/purchaseCredits');

  test('rejects unauthenticated requests with 401', async () => {
    const mw = requireSubscriptionOrCredit('report', 'full_report');
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await mw(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('passes subscribers with accessVia=subscription', async () => {
    seedUser('sub1', { isSubscribed: true, subscription: { status: 'active' } });
    const mw = requireSubscriptionOrCredit('report', 'full_report');
    const req = mockReq({ user: { uid: 'sub1', authType: 'google' } });
    const res = mockRes();
    const next = jest.fn();
    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.accessVia).toBe('subscription');
  });

  test('passes credit holders with accessVia=credit and attaches the credit', async () => {
    seedUser('buyer1', { isSubscribed: false });
    const added = await credits.addPurchaseCredit('buyer1', 'full_report', { eventId: 'evtM' });
    const mw = requireSubscriptionOrCredit('report', 'full_report');
    const req = mockReq({ user: { uid: 'buyer1', authType: 'google' } });
    const res = mockRes();
    const next = jest.fn();
    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.accessVia).toBe('credit');
    expect(req.purchaseCredit.id).toBe(added.id);
  });

  test('passes users with a retryable pending entitlement (paid, generation failed)', async () => {
    seedUser('retry1', { isSubscribed: false });
    mockDb.store['entitlements/ent-r1'] = {
      uid: 'retry1',
      type: 'report',
      status: 'pending',
      retryCount: 1,
      createdAt: new Date().toISOString(),
    };
    const mw = requireSubscriptionOrCredit('report', 'full_report');
    const req = mockReq({ user: { uid: 'retry1', authType: 'google' } });
    const res = mockRes();
    const next = jest.fn();
    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.accessVia).toBe('entitlement-retry');
  });

  test('returns 402 with one-time pricing when there is no subscription and no credit', async () => {
    seedUser('free1', { isSubscribed: false });
    const mw = requireSubscriptionOrCredit('porondam', 'porondam_check');
    const req = mockReq({ user: { uid: 'free1', authType: 'google' } });
    const res = mockRes();
    const next = jest.fn();
    await mw(req, res, next);
    expect(res.statusCode).toBe(402);
    expect(res.body.subscriptionRequired).toBe(true);
    expect(res.body.oneTime.productId).toBe('porondam_check');
    expect(next).not.toHaveBeenCalled();
  });

  test('a consumed credit no longer grants access', async () => {
    seedUser('spent1', { isSubscribed: false });
    const added = await credits.addPurchaseCredit('spent1', 'porondam_check', { eventId: 'evtS' });
    await credits.consumeCredit(added.id, 'ent-done');
    const mw = requireSubscriptionOrCredit('porondam', 'porondam_check');
    const req = mockReq({ user: { uid: 'spent1', authType: 'google' } });
    const res = mockRes();
    const next = jest.fn();
    await mw(req, res, next);
    expect(res.statusCode).toBe(402);
    expect(next).not.toHaveBeenCalled();
  });

  test('MOCK_PAYMENTS=true bypasses all checks', async () => {
    process.env.MOCK_PAYMENTS = 'true';
    const mw = requireSubscriptionOrCredit('report', 'full_report');
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.accessVia).toBe('subscription');
  });
});

// ═══════════════════════════════════════════════════════════════════
//  3. Wiring — webhook branches, route middleware, mount exemptions
// ═══════════════════════════════════════════════════════════════════

describe('leak-fix wiring', () => {
  const read = (rel) => fs.readFileSync(path.join(__dirname, rel), 'utf8');

  test('NON_RENEWING_PURCHASE grants lifetime Pro ONLY for the lifetime product', () => {
    const source = read('../revenuecat.js');
    const caseMatch = source.match(/case 'NON_RENEWING_PURCHASE':[\s\S]*?\n      \}/m);
    expect(caseMatch).not.toBeNull();
    const block = caseMatch[0];
    expect(block).toContain("productId === 'lifetime'");
    expect(block).toContain('addPurchaseCredit');
    // isSubscribed assignment must sit behind the lifetime guard
    const guardIndex = block.indexOf("productId === 'lifetime'");
    const subIndex = block.indexOf('isSubscribed: true');
    expect(subIndex).toBeGreaterThan(guardIndex);
  });

  test('porondam /check and /report accept subscription OR credit', () => {
    const source = read('../porondam.js');
    expect(source).toMatch(/router\.post\('\/check',[^\n]*requireSubscriptionOrCredit\('porondam'/);
    expect(source).toMatch(/router\.post\('\/report',[^\n]*requireSubscriptionOrCredit\('porondam'/);
  });

  test('horoscope report-generation routes accept subscription OR credit', () => {
    const source = read('../horoscope.js');
    // POST routes are part of the paid report flow → creditable.
    expect(source).toMatch(/router\.post\('\/full-report-ai',[^\n]*requireSubscriptionOrCredit\('report'/);
    expect(source).toMatch(/router\.post\('\/birth-chart',[^\n]*requireSubscriptionOrCredit\('report'/);
  });

  test('GET /birth-chart/data (Home basic chart) is subscription-only, not creditable', () => {
    const source = read('../horoscope.js');
    // It is NOT a purchasable one-time product, so it must not offer the
    // "buy this once" credit path — plain requireSubscription.
    expect(source).toMatch(/router\.get\('\/birth-chart\/data',[^\n]*requireSubscription\b/);
    expect(source).not.toMatch(/router\.get\('\/birth-chart\/data',[^\n]*requireSubscriptionOrCredit/);
  });

  test('generation routes consume the credit on new entitlements', () => {
    expect(read('../porondam.js')).toContain('consumeCredit(req.purchaseCredit.id, ent.id)');
    expect(read('../horoscope.js')).toContain('consumeCredit(req.purchaseCredit.id, ent.id)');
  });

  test('onboarding reveal and credit routes are exempt from the mount-level gate', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'index.js'), 'utf8');
    const horoscopeMount = source.match(/app\.use\('\/api\/horoscope',\s*paidAccessExcept\(\[([\s\S]*?)\]\)/);
    expect(horoscopeMount).not.toBeNull();
    expect(horoscopeMount[1]).toContain("'/onboarding-reveal'");
    expect(horoscopeMount[1]).toContain("'/full-report-ai'");
    const porondamMount = source.match(/app\.use\('\/api\/porondam',\s*paidAccessExcept\(\[([\s\S]*?)\]\)/);
    expect(porondamMount).not.toBeNull();
    expect(porondamMount[1]).toContain("'/check'");
    expect(porondamMount[1]).toContain("'/report'");
  });
});
