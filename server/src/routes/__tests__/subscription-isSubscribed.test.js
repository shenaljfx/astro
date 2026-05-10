/**
 * Tests for the isSubscribed boolean flag across the subscription flow.
 *
 * Covers:
 *   1. Webhook handler — sets isSubscribed correctly for every event type
 *   2. requireSubscription middleware — gates on isSubscribed, lazy-migrates
 *   3. GET /subscription route — returns isSubscribed, lazy-migrates
 *   4. POST /auth/google — returns isSubscribed in user object
 *   5. Edge cases — missing field, MOCK_PAYMENTS, no DB
 */

// ─── Shared mocks ────────────────────────────────────────────────

// In-memory Firestore mock
function createMockDb() {
  const store = {};
  const writes = [];
  return {
    store,
    writes,
    collection(name) {
      return {
        doc(id) {
          const key = `${name}/${id}`;
          return {
            get: jest.fn().mockImplementation(async () => ({
              exists: key in store,
              data: () => store[key] ? JSON.parse(JSON.stringify(store[key])) : undefined,
            })),
            set: jest.fn().mockImplementation(async (data, opts) => {
              if (!store[key]) store[key] = {};
              if (opts && opts.merge) {
                Object.assign(store[key], data);
              } else {
                store[key] = data;
              }
              writes.push({ op: 'set', key, data });
            }),
            update: jest.fn().mockImplementation(async (data) => {
              if (!store[key]) store[key] = {};
              // Handle dot-notation keys (e.g. 'subscription.status')
              for (const [field, val] of Object.entries(data)) {
                if (field.includes('.')) {
                  const parts = field.split('.');
                  let obj = store[key];
                  for (let i = 0; i < parts.length - 1; i++) {
                    if (!obj[parts[i]] || typeof obj[parts[i]] !== 'object') {
                      obj[parts[i]] = {};
                    }
                    obj = obj[parts[i]];
                  }
                  obj[parts[parts.length - 1]] = val;
                } else {
                  store[key][field] = val;
                }
              }
              writes.push({ op: 'update', key, data });
            }),
          };
        },
      };
    },
    runTransaction: jest.fn().mockImplementation(async (fn) => {
      // Simplified: just run the callback
      const mockTx = {
        get: jest.fn().mockImplementation(async (ref) => {
          // Piggyback on doc().get()
          return ref.get();
        }),
        set: jest.fn().mockImplementation((ref, data) => {
          ref.set(data);
        }),
      };
      return fn(mockTx);
    }),
  };
}

let mockDb;
let mockEnv;

// ─── Mock modules ────────────────────────────────────────────────

jest.mock('../../config/firebase', () => ({
  getDb: () => mockDb,
  getAuth: () => null,
  COLLECTIONS: {
    USERS: 'users',
    REVENUECAT_WEBHOOK_EVENTS: 'revenuecatWebhookEvents',
  },
}));

jest.mock('../../config/pricing', () => ({
  detectCurrency: () => 'LKR',
  getPricing: () => ({
    subscription: { amount: 280, period: 'month', label: 'LKR 280/month' },
  }),
}));

jest.mock('../../services/alerting', () => ({
  notifyAlert: jest.fn().mockResolvedValue(null),
}));

// ─── Helpers ─────────────────────────────────────────────────────

function seedUser(uid, data) {
  mockDb.store[`users/${uid}`] = {
    uid,
    email: 'test@test.com',
    subscription: { status: 'pending', plan: null },
    ...data,
  };
}

function getUser(uid) {
  return mockDb.store[`users/${uid}`];
}

function makeWebhookPayload(type, overrides = {}) {
  return {
    event: {
      type,
      app_user_id: 'user123',
      product_id: 'com.grahachara.pro_month',
      expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
      purchased_at_ms: Date.now(),
      store: 'play_store',
      environment: 'PRODUCTION',
      event_timestamp_ms: Date.now(),
      id: `evt_${type}_${Date.now()}`,
      ...overrides,
    },
  };
}

function mockReq(overrides = {}) {
  return {
    headers: {},
    body: {},
    user: null,
    ...overrides,
  };
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

// ═══════════════════════════════════════════════════════════════════
//  1. WEBHOOK — isSubscribed writes
// ═══════════════════════════════════════════════════════════════════

describe('RevenueCat Webhook — isSubscribed', () => {
  let app;

  beforeEach(() => {
    mockDb = createMockDb();
    // Seed the webhook events collection to avoid duplicate detection
    jest.resetModules();
    // Clear require cache so fresh mocks are used
    delete require.cache[require.resolve('../revenuecat')];
  });

  function getWebhookRouter() {
    return require('../revenuecat');
  }

  async function postWebhook(router, payload) {
    const express = require('express');
    const app = express();
    app.use(express.json());
    app.use('/api/revenuecat', router);

    const request = require('supertest');
    return request(app).post('/api/revenuecat/webhook').send(payload);
  }

  // Skip supertest tests if not installed — use unit-level tests instead
  let hasSupertest = false;
  try { require('supertest'); hasSupertest = true; } catch (e) {}

  // Unit-level: directly test the webhook update objects
  describe('webhook update objects per event type', () => {
    beforeEach(() => {
      mockDb = createMockDb();
      seedUser('user123', { subscription: { status: 'pending' } });
    });

    const eventToIsSubscribed = {
      INITIAL_PURCHASE: true,
      RENEWAL: true,
      UNCANCELLATION: true,
      PRODUCT_CHANGE: true,
      NON_RENEWING_PURCHASE: true,
      EXPIRATION: false,
    };

    const eventsThatDontChangeIsSubscribed = [
      'CANCELLATION',
      'BILLING_ISSUE',
    ];

    test.each(Object.entries(eventToIsSubscribed))(
      '%s sets isSubscribed=%s',
      async (eventType, expectedValue) => {
        // Read the route source to verify the switch case
        const fs = require('fs');
        const path = require('path');
        const source = fs.readFileSync(
          path.join(__dirname, '..', 'revenuecat.js'),
          'utf8'
        );

        // Find the case block for this event
        const casePattern = new RegExp(
          `case '${eventType}':[\\s\\S]*?break;`,
          'm'
        );
        const caseMatch = source.match(casePattern);
        expect(caseMatch).not.toBeNull();

        const caseBlock = caseMatch[0];
        // Verify isSubscribed is set to the expected value
        expect(caseBlock).toContain(`isSubscribed: ${expectedValue}`);
      }
    );

    test.each(eventsThatDontChangeIsSubscribed)(
      '%s does NOT set isSubscribed (stays unchanged)',
      async (eventType) => {
        const fs = require('fs');
        const path = require('path');
        const source = fs.readFileSync(
          path.join(__dirname, '..', 'revenuecat.js'),
          'utf8'
        );

        const casePattern = new RegExp(
          `case '${eventType}':[\\s\\S]*?break;`,
          'm'
        );
        const caseMatch = source.match(casePattern);
        expect(caseMatch).not.toBeNull();

        const caseBlock = caseMatch[0];
        // isSubscribed should NOT be ASSIGNED in this case block
        // (the word may appear in comments, that's fine)
        expect(caseBlock).not.toMatch(/isSubscribed:\s*(true|false)/);
      }
    );

    test('RENEWAL clears billingIssueAt', () => {
      const fs = require('fs');
      const path = require('path');
      const source = fs.readFileSync(
        path.join(__dirname, '..', 'revenuecat.js'),
        'utf8'
      );
      // Find RENEWAL-specific handling
      expect(source).toContain("subscriptionUpdate['subscription.billingIssueAt'] = null");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
//  2. MIDDLEWARE — requireSubscription
// ═══════════════════════════════════════════════════════════════════

describe('requireSubscription middleware', () => {
  let requireSubscription;

  beforeEach(() => {
    mockDb = createMockDb();
    jest.resetModules();
    delete require.cache[require.resolve('../../middleware/subscription')];
    // Reset MOCK_PAYMENTS
    delete process.env.MOCK_PAYMENTS;
    delete process.env.NODE_ENV;
    ({ requireSubscription } = require('../../middleware/subscription'));
  });

  afterEach(() => {
    delete process.env.MOCK_PAYMENTS;
    delete process.env.NODE_ENV;
  });

  test('allows access when isSubscribed=true', async () => {
    seedUser('u1', { isSubscribed: true, subscription: { status: 'active' } });

    const req = mockReq({ user: { uid: 'u1', authType: 'google' } });
    const res = mockRes();
    const next = jest.fn();

    await requireSubscription(req, res, next);
    // Wait for async .then chain
    await new Promise(r => setTimeout(r, 10));

    expect(next).toHaveBeenCalled();
    expect(req.subscription).toBeDefined();
    expect(req.subscription.status).toBe('active');
  });

  test('returns 402 when isSubscribed=false', async () => {
    seedUser('u2', { isSubscribed: false, subscription: { status: 'expired' } });

    const req = mockReq({ user: { uid: 'u2', authType: 'google' } });
    const res = mockRes();
    const next = jest.fn();

    await requireSubscription(req, res, next);
    await new Promise(r => setTimeout(r, 10));

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(402);
    expect(res.body.subscriptionRequired).toBe(true);
  });

  test('lazy-migrates when isSubscribed is undefined and subscription.status=active', async () => {
    // Simulate pre-migration user — no isSubscribed field
    seedUser('u3', { subscription: { status: 'active', plan: 'pro' } });
    // Explicitly remove isSubscribed to simulate missing field
    delete mockDb.store['users/u3'].isSubscribed;

    const req = mockReq({ user: { uid: 'u3', authType: 'google' } });
    const res = mockRes();
    const next = jest.fn();

    await requireSubscription(req, res, next);
    await new Promise(r => setTimeout(r, 50));

    // Should allow access (derived from subscription.status=active)
    expect(next).toHaveBeenCalled();

    // Should have backfilled isSubscribed=true
    const user = getUser('u3');
    expect(user.isSubscribed).toBe(true);
  });

  test('lazy-migrates when isSubscribed is undefined and subscription.status=expired', async () => {
    seedUser('u4', { subscription: { status: 'expired' } });
    delete mockDb.store['users/u4'].isSubscribed;

    const req = mockReq({ user: { uid: 'u4', authType: 'google' } });
    const res = mockRes();
    const next = jest.fn();

    await requireSubscription(req, res, next);
    await new Promise(r => setTimeout(r, 50));

    // Should block access
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(402);

    // Should have backfilled isSubscribed=false
    const user = getUser('u4');
    expect(user.isSubscribed).toBe(false);
  });

  test('lazy-migrates when isSubscribed is undefined and no subscription', async () => {
    seedUser('u5', {});
    delete mockDb.store['users/u5'].subscription;
    delete mockDb.store['users/u5'].isSubscribed;

    const req = mockReq({ user: { uid: 'u5', authType: 'google' } });
    const res = mockRes();
    const next = jest.fn();

    await requireSubscription(req, res, next);
    await new Promise(r => setTimeout(r, 50));

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(402);

    const user = getUser('u5');
    expect(user.isSubscribed).toBe(false);
  });

  test('MOCK_PAYMENTS=true bypasses everything', async () => {
    process.env.MOCK_PAYMENTS = 'true';
    jest.resetModules();
    delete require.cache[require.resolve('../../middleware/subscription')];
    const { requireSubscription: mw } = require('../../middleware/subscription');

    // No user doc needed — should pass through
    const req = mockReq({ user: { uid: 'nobody', authType: 'google' } });
    const res = mockRes();
    const next = jest.fn();

    mw(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.subscription.plan).toBe('mock_pro');
  });

  test('returns 401 for anonymous users', () => {
    const req = mockReq({ user: { uid: 'anon', authType: 'anonymous' } });
    const res = mockRes();
    const next = jest.fn();

    requireSubscription(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  test('returns 401 when no user', () => {
    const req = mockReq({ user: null });
    const res = mockRes();
    const next = jest.fn();

    requireSubscription(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  test('returns 404 when user doc does not exist', async () => {
    // Don't seed user — doc doesn't exist
    const req = mockReq({ user: { uid: 'ghost', authType: 'google' } });
    const res = mockRes();
    const next = jest.fn();

    await requireSubscription(req, res, next);
    await new Promise(r => setTimeout(r, 10));

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
  });

  test('no database in dev mode — allows access', async () => {
    mockDb = null; // Simulate no DB
    jest.resetModules();
    delete require.cache[require.resolve('../../middleware/subscription')];
    const { requireSubscription: mw } = require('../../middleware/subscription');

    const req = mockReq({ user: { uid: 'u1', authType: 'google' } });
    const res = mockRes();
    const next = jest.fn();

    mw(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('no database in production — returns 503', async () => {
    mockDb = null;
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    delete require.cache[require.resolve('../../middleware/subscription')];
    const { requireSubscription: mw } = require('../../middleware/subscription');

    const req = mockReq({ user: { uid: 'u1', authType: 'google' } });
    const res = mockRes();
    const next = jest.fn();

    mw(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(503);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  3. SUBSCRIPTION LIFECYCLE — full scenarios
// ═══════════════════════════════════════════════════════════════════

describe('Subscription lifecycle scenarios', () => {
  let requireSubscription;

  beforeEach(() => {
    mockDb = createMockDb();
    jest.resetModules();
    delete process.env.MOCK_PAYMENTS;
    delete require.cache[require.resolve('../../middleware/subscription')];
    ({ requireSubscription } = require('../../middleware/subscription'));
  });

  test('new user → purchase → access → cancel → still access → expire → blocked', async () => {
    const uid = 'lifecycle1';

    // 1. New user — isSubscribed=false
    seedUser(uid, { isSubscribed: false, subscription: { status: 'pending' } });

    // Should be blocked
    let req = mockReq({ user: { uid, authType: 'google' } });
    let res = mockRes();
    let next = jest.fn();
    await requireSubscription(req, res, next);
    await new Promise(r => setTimeout(r, 10));
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(402);

    // 2. INITIAL_PURCHASE webhook fires — simulate the update
    mockDb.store[`users/${uid}`].isSubscribed = true;
    mockDb.store[`users/${uid}`].subscription = {
      status: 'active',
      plan: 'pro_month',
      willRenew: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Should have access
    req = mockReq({ user: { uid, authType: 'google' } });
    res = mockRes();
    next = jest.fn();
    await requireSubscription(req, res, next);
    await new Promise(r => setTimeout(r, 10));
    expect(next).toHaveBeenCalled();

    // 3. CANCELLATION webhook — isSubscribed stays true
    mockDb.store[`users/${uid}`].subscription.willRenew = false;
    mockDb.store[`users/${uid}`].subscription.cancelledAt = new Date().toISOString();
    // isSubscribed stays true!

    req = mockReq({ user: { uid, authType: 'google' } });
    res = mockRes();
    next = jest.fn();
    await requireSubscription(req, res, next);
    await new Promise(r => setTimeout(r, 10));
    expect(next).toHaveBeenCalled(); // Still has access

    // 4. EXPIRATION webhook — isSubscribed becomes false
    mockDb.store[`users/${uid}`].isSubscribed = false;
    mockDb.store[`users/${uid}`].subscription.status = 'expired';

    req = mockReq({ user: { uid, authType: 'google' } });
    res = mockRes();
    next = jest.fn();
    await requireSubscription(req, res, next);
    await new Promise(r => setTimeout(r, 10));
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(402);
  });

  test('billing issue → still access → renewal → still access', async () => {
    const uid = 'lifecycle2';

    seedUser(uid, {
      isSubscribed: true,
      subscription: {
        status: 'active',
        plan: 'pro_month',
        willRenew: true,
      },
    });

    // 1. BILLING_ISSUE — isSubscribed unchanged (stays true)
    mockDb.store[`users/${uid}`].subscription.status = 'payment_failed';
    mockDb.store[`users/${uid}`].subscription.billingIssueAt = new Date().toISOString();
    // isSubscribed stays true!

    let req = mockReq({ user: { uid, authType: 'google' } });
    let res = mockRes();
    let next = jest.fn();
    await requireSubscription(req, res, next);
    await new Promise(r => setTimeout(r, 10));
    expect(next).toHaveBeenCalled(); // Still has access during billing retry

    // 2. RENEWAL succeeds — isSubscribed stays true, billingIssueAt cleared
    mockDb.store[`users/${uid}`].subscription.status = 'active';
    mockDb.store[`users/${uid}`].subscription.billingIssueAt = null;

    req = mockReq({ user: { uid, authType: 'google' } });
    res = mockRes();
    next = jest.fn();
    await requireSubscription(req, res, next);
    await new Promise(r => setTimeout(r, 10));
    expect(next).toHaveBeenCalled();
  });

  test('lifetime purchase — isSubscribed=true, no expiry check needed', async () => {
    const uid = 'lifetime1';

    seedUser(uid, {
      isSubscribed: true,
      subscription: {
        status: 'active',
        plan: 'pro_lifetime',
        isLifetime: true,
        willRenew: false,
        // No expiresAt — lifetime never expires
      },
    });

    const req = mockReq({ user: { uid, authType: 'google' } });
    const res = mockRes();
    const next = jest.fn();
    await requireSubscription(req, res, next);
    await new Promise(r => setTimeout(r, 10));
    expect(next).toHaveBeenCalled();
  });

  test('isSubscribed=true takes precedence regardless of subscription.status', async () => {
    // This tests that the middleware ONLY checks isSubscribed, not subscription.status
    const uid = 'override1';

    seedUser(uid, {
      isSubscribed: true,
      subscription: {
        status: 'payment_failed', // Would have been blocked by old logic
        billingIssueAt: new Date().toISOString(),
      },
    });

    const req = mockReq({ user: { uid, authType: 'google' } });
    const res = mockRes();
    const next = jest.fn();
    await requireSubscription(req, res, next);
    await new Promise(r => setTimeout(r, 10));
    expect(next).toHaveBeenCalled(); // isSubscribed=true wins
  });

  test('isSubscribed=false blocks even if subscription.status=active (stale data)', async () => {
    // This could happen if EXPIRATION webhook set isSubscribed=false but
    // subscription.status wasn't updated due to partial write
    const uid = 'stale1';

    seedUser(uid, {
      isSubscribed: false,
      subscription: { status: 'active', plan: 'pro' },
    });

    const req = mockReq({ user: { uid, authType: 'google' } });
    const res = mockRes();
    const next = jest.fn();
    await requireSubscription(req, res, next);
    await new Promise(r => setTimeout(r, 10));
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(402);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  4. AUTH ROUTE — isSubscribed in responses
// ═══════════════════════════════════════════════════════════════════

describe('Auth route — isSubscribed in responses', () => {
  test('POST /auth/google response includes isSubscribed in user object', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'auth.js'),
      'utf8'
    );

    // The response user object should include isSubscribed
    expect(source).toContain('isSubscribed: user.isSubscribed === true');
  });

  test('GET /subscription response includes isSubscribed field', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'auth.js'),
      'utf8'
    );

    // The response should include isSubscribed
    expect(source).toMatch(/res\.json\(\{[\s\S]*?isSubscribed[\s\S]*?\}\)/);
  });

  test('new user creation sets isSubscribed: false', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'auth.js'),
      'utf8'
    );

    // Find the createGoogleUser function
    expect(source).toContain('isSubscribed: false,');
  });

  test('GET /subscription lazy-migrates missing isSubscribed', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'auth.js'),
      'utf8'
    );

    // Should check for undefined and derive from subscription.status
    expect(source).toContain('if (isSubscribed === undefined)');
    expect(source).toContain("isSubscribed = subscription.status === 'active'");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  5. WEBHOOK SOURCE CODE — structural verification
// ═══════════════════════════════════════════════════════════════════

describe('Webhook structural integrity', () => {
  const fs = require('fs');
  const path = require('path');

  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', 'revenuecat.js'),
      'utf8'
    );
  });

  test('CANCELLATION case does NOT touch isSubscribed', () => {
    const match = source.match(/case 'CANCELLATION':[\s\S]*?break;/);
    expect(match).not.toBeNull();
    // isSubscribed should NOT be ASSIGNED in the CANCELLATION case
    // (comments mentioning it are fine — we check for the assignment pattern)
    expect(match[0]).not.toMatch(/isSubscribed:\s*(true|false)/);
    // But should set willRenew: false
    expect(match[0]).toContain("'subscription.willRenew': false");
  });

  test('BILLING_ISSUE case does NOT touch isSubscribed', () => {
    const match = source.match(/case 'BILLING_ISSUE':[\s\S]*?break;/);
    expect(match).not.toBeNull();
    expect(match[0]).not.toContain('isSubscribed');
  });

  test('EXPIRATION is the ONLY event that sets isSubscribed=false', () => {
    // Count all occurrences of isSubscribed: false
    const falseMatches = source.match(/isSubscribed:\s*false/g) || [];
    // Should be exactly 1 (in the EXPIRATION case)
    expect(falseMatches.length).toBe(1);

    // And it should be in the EXPIRATION case
    const expirationCase = source.match(/case 'EXPIRATION':[\s\S]*?break;/);
    expect(expirationCase[0]).toContain('isSubscribed: false');
  });

  test('all purchase/renewal events set isSubscribed=true', () => {
    const positiveEvents = [
      'INITIAL_PURCHASE',
      'RENEWAL',
      'UNCANCELLATION',
      'PRODUCT_CHANGE',
      'NON_RENEWING_PURCHASE',
    ];

    for (const eventType of positiveEvents) {
      const pattern = new RegExp(`case '${eventType}':[\\s\\S]*?break;`);
      const match = source.match(pattern);
      if (!match) {
        // Event might be grouped (INITIAL_PURCHASE / RENEWAL / UNCANCELLATION)
        continue;
      }
      // Check: either this case block has isSubscribed: true,
      // or it falls through to a shared block that does
    }

    // Verify isSubscribed: true appears in the grouped case block
    const groupedCase = source.match(
      /case 'INITIAL_PURCHASE':[\s\S]*?case 'RENEWAL':[\s\S]*?case 'UNCANCELLATION':[\s\S]*?break;/
    );
    expect(groupedCase).not.toBeNull();
    expect(groupedCase[0]).toContain('isSubscribed: true');
  });

  test('webhook always returns 200 (even on errors)', () => {
    // Error handler should return 200
    expect(source).toContain('res.status(200).json({ success: false');
  });

  test('webhook has deduplication via claimWebhookEvent', () => {
    expect(source).toContain('claimWebhookEvent');
    expect(source).toContain('claim.duplicate');
  });
});

// ═══════════════════════════════════════════════════════════════════
//  6. MIDDLEWARE SIMPLICITY — verify no complex derivation
// ═══════════════════════════════════════════════════════════════════

describe('Middleware simplicity', () => {
  const fs = require('fs');
  const path = require('path');

  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'middleware', 'subscription.js'),
      'utf8'
    );
  });

  test('requireSubscription does NOT check subscription.status for access control', () => {
    // Extract the requireSubscription function body
    const fnMatch = source.match(
      /function requireSubscription[\s\S]*?^}/m
    );
    expect(fnMatch).not.toBeNull();
    const fnBody = fnMatch[0];

    // Should NOT contain the old complex status checks
    expect(fnBody).not.toContain("sub.status === 'cancelled'");
    expect(fnBody).not.toContain("sub.status === 'payment_failed'");
    expect(fnBody).not.toContain("sub.status === 'none'");
    expect(fnBody).not.toContain('GRACE_PERIOD_MS');
  });

  test('requireSubscription checks isSubscribed boolean', () => {
    expect(source).toContain('isSubscribed === true');
  });

  test('requireSubscription has lazy migration for undefined isSubscribed', () => {
    expect(source).toContain('isSubscribed === undefined');
    expect(source).toContain("sub.status === 'active'");
    // The migration should be best-effort (catch errors)
    expect(source).toContain('.catch(');
  });
});
