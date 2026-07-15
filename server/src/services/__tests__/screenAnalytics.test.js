const { sanitizeScreen, aggregateBatch, mergeDailyDocs } = require('../screenAnalytics');

describe('screenAnalytics', () => {
  test('sanitizeScreen makes safe, readable field keys', () => {
    expect(sanitizeScreen('/(tabs)/porondam')).toBe('tabs_porondam');
    expect(sanitizeScreen('Report Detail!!')).toBe('report_detail');
    expect(sanitizeScreen('')).toBe('unknown');
  });

  test('aggregateBatch collapses events per screen and clamps time', () => {
    const out = aggregateBatch([
      { screen: 'today', ms: 1000 },
      { screen: 'today', ms: 500, exit: true },
      { screen: 'porondam', ms: 9e9 }, // absurd → clamped to 2h
    ]);
    expect(out.today).toEqual({ views: 2, totalMs: 1500, exits: 1 });
    expect(out.porondam.views).toBe(1);
    expect(out.porondam.totalMs).toBe(2 * 60 * 60 * 1000);
  });

  test('mergeDailyDocs sums across days and computes avg time + exit rate', () => {
    const merged = mergeDailyDocs([
      { screens: { today: { views: 10, totalMs: 20000, exits: 2 }, chat: { views: 4, totalMs: 40000, exits: 3 } } },
      { screens: { today: { views: 10, totalMs: 20000, exits: 0 } } },
    ]);
    const today = merged.screens.find((s) => s.screen === 'today');
    const chat = merged.screens.find((s) => s.screen === 'chat');
    expect(today.views).toBe(20);
    expect(today.avgMs).toBe(2000);
    expect(today.exitRate).toBe(0.1); // 2 exits / 20 views
    expect(chat.exitRate).toBe(0.75); // 3 / 4 — a drop-off hotspot
    expect(merged.screens[0].screen).toBe('today'); // sorted by views desc
    expect(merged.maxViews).toBe(20);
  });

  test('empty input is safe', () => {
    expect(aggregateBatch(null)).toEqual({});
    expect(mergeDailyDocs([]).screens).toEqual([]);
  });
});
