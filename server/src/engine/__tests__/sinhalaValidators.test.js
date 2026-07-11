/**
 * Sinhala validator parity (audit fix B3).
 * The safety/consistency validators used to be English-regex-only, so
 * Sinhala reports — the primary market — skipped guaranteed-timing checks,
 * Sinhala jargon detection, and ALL cross-section age comparison.
 */

const { validateTimingNarrativeSafety, detectRedFlags } = require('../reportValidator');
const { findCrossSectionDiscrepancies } = require('../crossSectionValidator');

describe('Sinhala timing-promise detection', () => {
  test('flags "අනිවාර්යයෙන්ම විවාහ වෙනවා" as a guaranteed marriage claim', () => {
    const narrative = 'ඔයා 2028දී අනිවාර්යයෙන්ම විවාහ වෙනවා. ඒක නියත වශයෙන්ම සිද්ධ වෙනවා.';
    const result = validateTimingNarrativeSafety(narrative, 'marriage', null);
    expect(result.checked).toBe(true);
    const types = result.issues.map(i => i.type);
    expect(types).toContain('guaranteed_timing_language_si');
  });

  test('flags -මයි promise suffixes ("වෙනවාමයි")', () => {
    const narrative = 'ඔයාට 2027දී විදේශ ගමනක් ලැබෙනවාමයි.';
    const result = validateTimingNarrativeSafety(narrative, 'foreignTravel', null);
    const types = result.issues.map(i => i.type);
    expect(types).toContain('guaranteed_event_timing_si');
  });

  test('does NOT flag ordinary hedged Sinhala ("ස්ථිර රැකියාවක් ලැබෙන්න පුළුවන්")', () => {
    const narrative = 'මේ කාලේ ඔයාට ස්ථිර රැකියාවක් ලැබෙන්න පුළුවන්. ඉඩකඩ හොඳයි.';
    const result = validateTimingNarrativeSafety(narrative, 'career', null);
    const guaranteed = result.issues.filter(i => i.type.startsWith('guaranteed'));
    expect(guaranteed).toHaveLength(0);
  });

  test('unframed future year in a Sinhala event sentence is flagged; hedged is not', () => {
    const currentYear = new Date().getUTCFullYear();
    const y = currentYear + 2;
    const unframed = `${y}දී ඔයාගේ විවාහය සිදු වේ.`;
    const hedged = `${y} වටේ විවාහයට හොඳ ඉඩකඩ තියෙනවා.`;
    const r1 = validateTimingNarrativeSafety(unframed, 'marriage', null);
    const r2 = validateTimingNarrativeSafety(hedged, 'marriage', null);
    expect(r1.issues.map(i => i.type)).toContain('unframed_future_timing_window');
    expect(r2.issues.map(i => i.type)).not.toContain('unframed_future_timing_window');
  });
});

describe('Sinhala jargon leak detection', () => {
  test('flags ලග්නය / දශාව / නවාංශ leaks in Sinhala narratives', () => {
    const narrative = 'ඔයාගේ ලග්නය ශක්තිමත් නිසා මේ දශාව ඉතා හොඳයි.';
    const flags = detectRedFlags(narrative, 'si');
    expect(flags.map(f => f.type)).toContain('astrology_jargon_leak_si');
  });

  test('everyday Sinhala ("දෝෂයක් නැහැ", "කේන්දරය") is not flagged', () => {
    const narrative = 'ඔයාගේ කේන්දරයේ කිසිම දෝෂයක් නැහැ. හිත හදාගෙන ඉදිරියට යන්න.';
    const flags = detectRedFlags(narrative, 'si');
    expect(flags.map(f => f.type)).not.toContain('astrology_jargon_leak_si');
  });
});

describe('Sinhala cross-section age extraction', () => {
  test('detects a marriage-age contradiction between Sinhala sections', () => {
    const narrativeSections = {
      marriage: { narrative: 'ඔයාගේ විවාහයට හොඳම කාලය වයස අවුරුදු 28 - 30 අතර.' },
      lifePredictions: { narrative: 'විවාහය ගැන බලද්දී, ඔයා 45 වියේදී විවාහ වෙන්න ඉඩ තියෙනවා.' },
    };
    const result = findCrossSectionDiscrepancies(narrativeSections);
    expect(result.discrepancies.length).toBeGreaterThan(0);
    expect(result.discrepancies[0].event).toBe('marriage_age');
  });

  test('agreeing Sinhala windows produce no discrepancy', () => {
    const narrativeSections = {
      marriage: { narrative: 'විවාහයට හොඳම කාලය වයස අවුරුදු 28 - 30 අතර.' },
      lifePredictions: { narrative: 'විවාහ ජීවිතය 29 වියේදී පටන් ගන්න ඉඩ තියෙනවා.' },
    };
    const result = findCrossSectionDiscrepancies(narrativeSections);
    expect(result.discrepancies).toHaveLength(0);
  });

  test('year mentions like "2028 දී" are not misread as ages', () => {
    const narrativeSections = {
      marriage: { narrative: 'විවාහයට හොඳම කාලය වයස අවුරුදු 28 - 30 අතර.' },
      surpriseInsights: { narrative: 'ඔයාගේ විවාහ ජීවිතයට 2028 දී හොඳ බලපෑමක් එනවා.' },
    };
    const result = findCrossSectionDiscrepancies(narrativeSections);
    expect(result.discrepancies).toHaveLength(0);
  });
});
