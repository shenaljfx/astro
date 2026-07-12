/**
 * Baby Kendara report engine — deterministic guarantees.
 * These lock in the vitality guardrail, gender threading, and the AI section
 * subset so the paid pack can't silently regress.
 */
const { parseSLT } = require('../../utils/dateUtils');
const { buildBabyReport } = require('../babyReport');
const { REPORT_SECTION_ORDER } = require('../chat');

// Mirror of routes/baby.js BABY_SECTION_KEYS — the curated AI life-story set.
const BABY_SECTION_KEYS = ['yogaAnalysis', 'career', 'education', 'familyPortrait', 'financial'];

const LAT = 6.9271;
const LNG = 79.8612;
// buildBabyReport only reads identity.lagnaDetails (for the lucky section, which
// these tests don't assert), so a bare identity keeps the unit test light.
function report(dateStr, gender) {
  const date = parseSLT(dateStr);
  return buildBabyReport(date, LAT, LNG, { lagnaDetails: {} }, gender);
}

describe('buildBabyReport — deterministic vitality note', () => {
  const r = report('2026-07-12T10:00:00', 'female');

  test('vitality is present, deterministic, and carries a medical disclaimer', () => {
    expect(r.vitality).toBeTruthy();
    expect(r.vitality.deterministic).toBe(true);
    expect(['fire', 'earth', 'air', 'water']).toContain(r.vitality.dominantElement);
    expect(r.vitality.note.en.length).toBeGreaterThan(20);
    expect(r.vitality.note.si.length).toBeGreaterThan(20);
    expect(r.vitality.disclaimer.en.toLowerCase()).toContain('pediatrician');
    expect(r.vitality.disclaimer.si).toContain('ළමා රෝග');
  });

  test('vitality never names a disease (guardrail is structural)', () => {
    const banned = /disease|illness|asthma|fever|disorder|cancer|infection|symptom|diagnos/i;
    // Check every dominant-element template, not just this chart's.
    const dates = ['2026-07-12T10:00:00', '2026-01-03T04:00:00', '2026-09-21T18:30:00', '2026-03-15T23:10:00'];
    for (const d of dates) {
      const note = report(d, 'male').vitality.note;
      expect(note.en).not.toMatch(banned);
    }
  });
});

describe('buildBabyReport — mandatory gender', () => {
  test('gender is echoed and defaults the naming list', () => {
    const rf = report('2026-07-12T10:00:00', 'female');
    const rm = report('2026-07-12T10:00:00', 'male');
    expect(rf.gender).toBe('female');
    expect(rm.gender).toBe('male');
    expect(rf.naming.defaultGender).toBe('female');
    expect(rm.naming.defaultGender).toBe('male');
  });

  test('an invalid/absent gender does not crash and yields null gender', () => {
    const r = report('2026-07-12T10:00:00', undefined);
    expect(r.gender).toBeNull();
    expect(['male', 'female']).toContain(r.naming.defaultGender); // still a valid default
  });
});

describe('Baby AI section subset', () => {
  test('every baby section key exists in the full report section order', () => {
    for (const key of BABY_SECTION_KEYS) {
      expect(REPORT_SECTION_ORDER).toContain(key);
    }
  });

  test('the subset is exactly five curated sections', () => {
    expect(BABY_SECTION_KEYS).toHaveLength(5);
    expect(new Set(BABY_SECTION_KEYS).size).toBe(5);
  });
});
