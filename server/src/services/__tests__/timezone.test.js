const { parseBirthDateTimeWithContext } = require('../timezone');

describe('timezone context', () => {
  test('uses the historical civil offset (+6:00) for 1996–2006 Sri Lankan births', async () => {
    // 1998 falls inside Sri Lanka's UTC+6:00 period (1996-10-26 → 2006-04-15).
    // A birth-certificate time of 09:16 was civil +6:00, so UTC = 03:16, NOT
    // 03:46. The previous behaviour hard-coded +5:30 and computed the wrong
    // instant — flipping the lagna sign for ~25% of births in this window.
    const parsed = await parseBirthDateTimeWithContext('1998-10-09T09:16:00', 6.9271, 79.8612);

    expect(parsed.date.toISOString()).toBe('1998-10-09T03:16:00.000Z');
    expect(parsed.timeContext.offsetSeconds).toBe(21600);
    expect(parsed.timeContext.source).toBe('iana_history');
    expect(parsed.timeContext.displayLocalTime).toBe('09:16');
  });

  test('uses +5:30 for modern (post-2006) Sri Lankan births', async () => {
    const parsed = await parseBirthDateTimeWithContext('2010-10-09T09:16:00', 6.9271, 79.8612);

    expect(parsed.date.toISOString()).toBe('2010-10-09T03:46:00.000Z');
    expect(parsed.timeContext.offsetSeconds).toBe(19800);
    expect(parsed.timeContext.displayLocalTime).toBe('09:16');
  });

  test('preserves explicit timezone offsets as provenance', async () => {
    const parsed = await parseBirthDateTimeWithContext('1998-10-09T09:16:00+05:30', 6.9271, 79.8612);

    expect(parsed.date.toISOString()).toBe('1998-10-09T03:46:00.000Z');
    expect(parsed.timeContext.offsetSeconds).toBe(19800);
    expect(parsed.timeContext.source).toBe('explicit_offset');
  });
});