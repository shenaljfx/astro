/**
 * minRequiredSections — the validity floor must scale with the REQUESTED
 * section count. Regression guard for the bug where Baby Kendara's 5-section
 * narrative was held to the full report's floor of 10 and thus always failed.
 */
const { minRequiredSections, REPORT_SECTION_ORDER } = require('../chat');

describe('minRequiredSections', () => {
  test('Baby Kendara subset (5) is satisfiable — floor ≤ requested', () => {
    const floor = minRequiredSections(5);
    expect(floor).toBeLessThanOrEqual(5); // the actual bug: was 10 > 5
    expect(floor).toBe(3); // 60% of 5
  });

  test('full report (19) keeps the strong ≥10 bar (unchanged behaviour)', () => {
    expect(minRequiredSections(REPORT_SECTION_ORDER.length)).toBe(10);
    expect(minRequiredSections(19)).toBe(10);
  });

  test('floor never exceeds the number of sections requested, for any size', () => {
    for (let n = 1; n <= 25; n++) {
      expect(minRequiredSections(n)).toBeLessThanOrEqual(n);
      expect(minRequiredSections(n)).toBeGreaterThanOrEqual(1);
    }
  });

  test('degenerate inputs never throw and floor to 1', () => {
    expect(minRequiredSections(0)).toBe(1);
    expect(minRequiredSections(undefined)).toBe(1);
    expect(minRequiredSections(1)).toBe(1);
  });
});
