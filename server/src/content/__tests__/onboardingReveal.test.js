/**
 * onboardingReveal composer — future-card behavior.
 *
 * The Future chapter is the funnel's cliffhanger: it must always have at
 * least one card. Timelines that exhaust the 120-year Vimshottari cycle
 * (e.g. a 1900 birth viewed in 2026) used to produce an empty page.
 */

'use strict';

const { composeReveal } = require('../onboardingReveal');

const NOW = new Date('2026-07-17T00:00:00Z');

function basePayload(overrides) {
  return Object.assign({
    name: 'Tester',
    lagna: { rashi: { id: 4, name: 'Kataka', english: 'Cancer', sinhala: 'කටක' }, sidereal: 93.6 },
    nakshatra: { name: 'Mula', sinhala: 'මූල', pada: 4 },
    moonRashi: { id: 9, name: 'Dhanus', english: 'Sagittarius', sinhala: 'ධනු' },
    language: 'en',
    now: NOW,
  }, overrides);
}

// A timeline fully in the past — the 120-year cycle has run out.
const EXHAUSTED_PERIODS = [
  {
    lord: 'Ketu', start: '1900-01-01', endDate: '1907-01-01',
    antardashas: [
      { lord: 'Ketu', start: '1900-01-01', endDate: '1901-01-01' },
      { lord: 'Venus', start: '1901-01-01', endDate: '1903-01-01' },
    ],
  },
];

// A live timeline: one antardasha spanning "now" + future windows.
const LIVE_PERIODS = [
  {
    lord: 'Moon', start: '2021-11-01', endDate: '2031-11-01',
    antardashas: [
      { lord: 'Saturn', start: '2026-01-01', endDate: '2027-09-01' },
      { lord: 'Mercury', start: '2027-09-01', endDate: '2029-02-01' },
      { lord: 'Ketu', start: '2029-02-01', endDate: '2029-09-01' },
      { lord: 'Venus', start: '2029-09-01', endDate: '2031-06-01' },
      { lord: 'Sun', start: '2031-06-01', endDate: '2031-11-01' },
    ],
  },
];

describe('composeReveal future cards', () => {
  test('live timeline: current window is FREE with guidance, the rest locked with real dates', () => {
    const reveal = composeReveal(basePayload({ dashaPeriods: LIVE_PERIODS }));
    expect(reveal.futureCards.length).toBe(4);

    const [current, ...locked] = reveal.futureCards;
    expect(current.locked).toBe(false);
    expect(current.guidance).toBeTruthy();
    expect(current.window).toContain('September 2027');

    for (const card of locked) {
      expect(card.locked).toBe(true);
      expect(card.guidance).toBeNull();
    }
    expect(locked[0].window).toContain('September 2027');

    expect(reveal.dasha.lord).toBe('Moon');
    expect(reveal.dasha.sinceYear).toBe('2021');
  });

  test('exhausted timeline: never an empty Future page — one locked fallback card', () => {
    const reveal = composeReveal(basePayload({ dashaPeriods: EXHAUSTED_PERIODS }));
    expect(reveal.futureCards.length).toBe(1);
    const card = reveal.futureCards[0];
    expect(card.id).toBe('timeline');
    expect(card.locked).toBe(true);
    expect(card.title).toBeTruthy();
    expect(card.window).toBeTruthy();
    // no current dasha context on an exhausted timeline
    expect(reveal.dasha.sinceYear).toBeNull();
  });

  test('exhausted timeline in Sinhala: fallback card is localized', () => {
    const reveal = composeReveal(basePayload({ dashaPeriods: EXHAUSTED_PERIODS, language: 'si' }));
    expect(reveal.futureCards.length).toBe(1);
    expect(reveal.futureCards[0].domain).toBe('ඔබේ කාලරේඛාව');
    expect(reveal.futureCards[0].window).toBe('සම්පූර්ණ කියවීමේදී');
  });

  test('identity block is always complete regardless of timeline state', () => {
    for (const periods of [LIVE_PERIODS, EXHAUSTED_PERIODS]) {
      const reveal = composeReveal(basePayload({ dashaPeriods: periods }));
      expect(reveal.identity.map(i => i.kind)).toEqual(['lagna', 'nakshatra', 'moon', 'dasha']);
      expect(reveal.greeting.startsWith('Tester, ')).toBe(true);
    }
  });
});
