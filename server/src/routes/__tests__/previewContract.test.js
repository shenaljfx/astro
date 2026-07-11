/**
 * Contract tests for the free preview surfaces (Phase 1 tease funnel).
 *
 * These are the FREE, non-personalized (or deliberately-sliced) endpoints that
 * feed the paywall. The one rule that must never regress: the porondam tease
 * shows the archetype + one gift + COUNTS, but never the X/20 score or the
 * premium payload. A future edit that spreads the full result here would leak
 * the paid product — this test fails loudly if that happens.
 */

const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'preview.js'), 'utf8');

function routeBlock(method, routePath) {
  const pattern = new RegExp(`router\\.${method}\\('${routePath.replace('/', '\\/')}'[\\s\\S]*?\\n\\}\\);`, 'm');
  const m = source.match(pattern);
  return m ? m[0] : null;
}

describe('preview route surface', () => {
  test('all three free preview routes exist', () => {
    expect(source).toMatch(/router\.get\('\/today'/);
    expect(source).toMatch(/router\.post\('\/kendara'/);
    expect(source).toMatch(/router\.post\('\/porondam'/);
  });

  test('today reuses the shared daily-nakath builder (no drift from the paid route)', () => {
    expect(source).toContain("require('./nakath')");
    expect(source).toContain('buildDailyNakathData');
  });

  test('kendara preview exposes vault COUNTS, not the analyses themselves', () => {
    expect(source).toContain('vaultCounts');
    // counts only — never the dosha/yoga item arrays in the preview payload
    expect(source).toMatch(/yogas:\s*yogas\.length/);
    expect(source).toMatch(/doshas:\s*doshas\.length/);
  });

  test('convergence preview uses the sliced helper (no full calendar leak)', () => {
    expect(source).toMatch(/router\.post\('\/convergence'/);
    expect(source).toContain('previewSliceConvergence');
  });
});

describe('convergence preview slice never leaks the paid payload', () => {
  const { previewSliceConvergence } = require('../../engine/convergenceCalendar');

  // A minimal fake full calendar with scores + drivers (the paid depth).
  const fakeCal = {
    asOf: '2026-07-11', horizonMonths: 12,
    months: [
      { month: '2026-07', label: 'Jul 2026', scores: { career: 80, love: 40, money: 72, health: 55, travel: 60, family: 90 },
        drivers: { money: [{ signal: 'x', text: 'secret reason', pts: 10 }] } },
    ],
    windows: [
      { domain: 'money', type: 'opportunity', tier: '★★★', startLabel: 'Mar 2027', endLabel: 'Jul 2027',
        score: 88, drivers: [{ signal: 'ad_lord_house', text: 'SECRET DRIVER', pts: 18 }] },
    ],
    summary: { opportunityCount: 1, cautionCount: 0, bestMonth: { label: 'Jul 2026', score: 90 } },
  };

  const slice = previewSliceConvergence(fakeCal);

  test('returns an intensity strip (dots) but not per-domain scores', () => {
    expect(Array.isArray(slice.strip)).toBe(true);
    expect(slice.strip[0]).toHaveProperty('intensity');
    // the raw per-domain scores object must not survive into the strip entry
    expect(slice.strip[0]).not.toHaveProperty('scores');
  });

  test('window headers carry area + direction + dates, never scores or drivers', () => {
    const w = slice.lockedWindows[0];
    expect(w.domain).toBe('money');
    expect(w.startLabel).toBe('Mar 2027');
    expect(w).not.toHaveProperty('score');
    expect(w).not.toHaveProperty('drivers');
  });

  test('no driver reason text leaks anywhere in the slice', () => {
    const json = JSON.stringify(slice);
    expect(json).not.toContain('SECRET DRIVER');
    expect(json).not.toContain('secret reason');
    expect(json).not.toContain('drivers');
  });
});

describe('porondam tease never leaks the paid payload', () => {
  const block = source.match(/router\.post\('\/porondam'[\s\S]*?\n\}\);/m);

  test('the porondam route exists and is isolated', () => {
    expect(block).not.toBeNull();
  });

  test('does NOT return the X/20 score or max in the tease', () => {
    const b = block[0];
    // The response slice must not surface the numeric score fields.
    expect(b).not.toMatch(/totalScore/);
    expect(b).not.toMatch(/maxPossibleScore/);
    expect(b).not.toMatch(/traditionalCount/);
  });

  test('does NOT spread the full couple reading or porondam result into the response', () => {
    const b = block[0];
    // Guard against `...result` / `...cr` / `...coupleReading` style leaks.
    expect(b).not.toMatch(/\.\.\.result/);
    expect(b).not.toMatch(/\.\.\.cr\b/);
    expect(b).not.toMatch(/\.\.\.coupleReading/);
  });

  test('returns only the sliced shape: archetype + topGift + counts + named locked vaults', () => {
    const b = block[0];
    expect(b).toContain('archetype');
    expect(b).toContain('topGift');
    expect(b).toContain('counts');
    expect(b).toContain('lockedVaults');
  });
});
