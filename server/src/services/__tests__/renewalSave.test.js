/**
 * Renewal Save Flow — stage computation + push copy.
 *
 * The flow reads only webhook-maintained subscription state
 * (status / willRenew / cancelledAt / expiresAt), so these tests pin the
 * exact stage transitions across a billing cycle, including the timeline of
 * the first real customer (subscribed 2026-07-16 20:39 UTC, disabled
 * auto-renew 18 minutes later, expires 2026-08-16).
 */

const {
  computeSaveStage,
  buildRenewalSaveMessage,
  getCycleKey,
} = require('../renewalSave');

const DAY_MS = 24 * 60 * 60 * 1000;

function subFixture(overrides = {}) {
  const now = Date.now();
  return {
    status: 'active',
    plan: 'monthly',
    willRenew: false,
    cancelledAt: new Date(now - 20 * 60 * 60 * 1000).toISOString(), // 20h ago
    expiresAt: new Date(now + 29 * DAY_MS).toISOString(),
    provider: 'revenuecat',
    ...overrides,
  };
}

describe('computeSaveStage — guards', () => {
  test('null/invalid subscription → null', () => {
    expect(computeSaveStage(null)).toBeNull();
    expect(computeSaveStage(undefined)).toBeNull();
    expect(computeSaveStage('nope')).toBeNull();
    expect(computeSaveStage({})).toBeNull();
  });

  test('still auto-renewing → null (willRenew true or missing)', () => {
    expect(computeSaveStage(subFixture({ willRenew: true }))).toBeNull();
    expect(computeSaveStage(subFixture({ willRenew: undefined }))).toBeNull();
  });

  test('non-active statuses → null (expired and billing-issue have their own flows)', () => {
    expect(computeSaveStage(subFixture({ status: 'expired' }))).toBeNull();
    expect(computeSaveStage(subFixture({ status: 'payment_failed' }))).toBeNull();
  });

  test('lifetime plan → null', () => {
    expect(computeSaveStage(subFixture({ isLifetime: true }))).toBeNull();
  });

  test('missing, invalid, or past expiry → null', () => {
    expect(computeSaveStage(subFixture({ expiresAt: null }))).toBeNull();
    expect(computeSaveStage(subFixture({ expiresAt: 'not-a-date' }))).toBeNull();
    expect(computeSaveStage(subFixture({ expiresAt: new Date(Date.now() - DAY_MS).toISOString() }))).toBeNull();
  });
});

describe('computeSaveStage — stage windows', () => {
  test('quiet period: cancelled 2h ago with a month left → null', () => {
    const sub = subFixture({ cancelledAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() });
    expect(computeSaveStage(sub)).toBeNull();
  });

  test('value: morning after cancelling with most of the month left', () => {
    const result = computeSaveStage(subFixture());
    expect(result).toEqual({ stage: 'value', daysUntilExpiry: 29 });
  });

  test('value also covers legacy docs missing cancelledAt', () => {
    const result = computeSaveStage(subFixture({ cancelledAt: null }));
    expect(result?.stage).toBe('value');
  });

  test('mid: inside 14 days of expiry once the cancel is ≥3 days old', () => {
    const sub = subFixture({
      cancelledAt: new Date(Date.now() - 5 * DAY_MS).toISOString(),
      expiresAt: new Date(Date.now() + 12 * DAY_MS).toISOString(),
    });
    expect(computeSaveStage(sub)).toEqual({ stage: 'mid', daysUntilExpiry: 12 });
  });

  test('fresh cancel at D-12 gets value (not mid) the next morning', () => {
    const sub = subFixture({
      cancelledAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 12 * DAY_MS).toISOString(),
    });
    expect(computeSaveStage(sub)?.stage).toBe('value');
  });

  test('save: final 3 days, regardless of how recent the cancel is', () => {
    const sub = subFixture({
      cancelledAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 2 * DAY_MS).toISOString(),
    });
    expect(computeSaveStage(sub)).toEqual({ stage: 'save', daysUntilExpiry: 2 });
  });

  test('cancel at D-5: nothing until the save window opens (no value/mid squeeze)', () => {
    const sub = subFixture({
      cancelledAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 5 * DAY_MS).toISOString(),
    });
    expect(computeSaveStage(sub)).toBeNull();
  });
});

describe('computeSaveStage — first real customer timeline', () => {
  const sub = {
    status: 'active',
    plan: 'monthly',
    willRenew: false,
    cancelledAt: '2026-07-16T20:57:00.000Z',
    expiresAt: '2026-08-16T20:39:00.000Z',
  };

  test('next Colombo morning (7.5h after cancel) → still quiet', () => {
    expect(computeSaveStage(sub, new Date('2026-07-17T04:30:00Z'))).toBeNull();
  });

  test('the morning after that → value', () => {
    expect(computeSaveStage(sub, new Date('2026-07-18T04:30:00Z'))?.stage).toBe('value');
  });

  test('two weeks before expiry → mid', () => {
    expect(computeSaveStage(sub, new Date('2026-08-04T04:30:00Z'))?.stage).toBe('mid');
  });

  test('three days out → save with day count', () => {
    expect(computeSaveStage(sub, new Date('2026-08-14T09:00:00Z'))).toEqual({ stage: 'save', daysUntilExpiry: 3 });
  });

  test('final day → save with daysUntilExpiry 1', () => {
    expect(computeSaveStage(sub, new Date('2026-08-16T05:00:00Z'))).toEqual({ stage: 'save', daysUntilExpiry: 1 });
  });

  test('re-enabling auto-renew any time stops the flow', () => {
    const uncancelled = { ...sub, willRenew: true };
    expect(computeSaveStage(uncancelled, new Date('2026-08-14T09:00:00Z'))).toBeNull();
  });
});

describe('getCycleKey', () => {
  test('keys the billing cycle by expiry date', () => {
    expect(getCycleKey({ expiresAt: '2026-08-16T20:39:00.000Z' })).toBe('2026-08-16');
  });

  test('degrades safely without an expiry', () => {
    expect(getCycleKey({})).toBe('unknown-cycle');
    expect(getCycleKey(null)).toBe('unknown-cycle');
  });
});

describe('buildRenewalSaveMessage', () => {
  const stages = ['value', 'mid', 'save'];

  test('every stage has non-empty copy in both languages', () => {
    for (const stage of stages) {
      for (const lang of ['si', 'en']) {
        const msg = buildRenewalSaveMessage(stage, lang, { daysUntilExpiry: 3 });
        expect(typeof msg.title).toBe('string');
        expect(msg.title.length).toBeGreaterThan(0);
        expect(typeof msg.body).toBe('string');
        expect(msg.body.length).toBeGreaterThan(0);
      }
    }
  });

  test('unknown language falls back to Sinhala', () => {
    const msg = buildRenewalSaveMessage('value', 'ta');
    expect(msg.title).toContain('ඔබේ');
  });

  test('save copy carries the day count', () => {
    expect(buildRenewalSaveMessage('save', 'si', { daysUntilExpiry: 3 }).title).toContain('දින 3');
    expect(buildRenewalSaveMessage('save', 'en', { daysUntilExpiry: 3 }).title).toContain('3 days');
  });

  test('final day switches to tomorrow phrasing', () => {
    expect(buildRenewalSaveMessage('save', 'si', { daysUntilExpiry: 1 }).title).toContain('හෙට');
    expect(buildRenewalSaveMessage('save', 'en', { daysUntilExpiry: 1 }).title).toContain('tomorrow');
  });

  test('copy rules: premium ඔබ register, never ඔයා, never the word "AI"', () => {
    for (const stage of stages) {
      for (const lang of ['si', 'en']) {
        const msg = buildRenewalSaveMessage(stage, lang, { daysUntilExpiry: 2 });
        const text = msg.title + ' ' + msg.body;
        expect(text).not.toMatch(/ඔයා/);
        expect(text).not.toMatch(/\bAI\b/);
      }
    }
  });
});
