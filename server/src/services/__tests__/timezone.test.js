const { parseBirthDateTimeWithContext } = require('../timezone');

describe('timezone context', () => {
  test('returns traditional Sri Lankan timezone metadata for local birth strings', async () => {
    const parsed = await parseBirthDateTimeWithContext('1998-10-09T09:16:00', 6.9271, 79.8612);

    expect(parsed.date.toISOString()).toBe('1998-10-09T03:46:00.000Z');
    expect(parsed.timeContext.offsetSeconds).toBe(19800);
    expect(parsed.timeContext.source).toBe('traditional_slt');
    expect(parsed.timeContext.displayLocalTime).toBe('09:16');
  });

  test('preserves explicit timezone offsets as provenance', async () => {
    const parsed = await parseBirthDateTimeWithContext('1998-10-09T09:16:00+05:30', 6.9271, 79.8612);

    expect(parsed.date.toISOString()).toBe('1998-10-09T03:46:00.000Z');
    expect(parsed.timeContext.offsetSeconds).toBe(19800);
    expect(parsed.timeContext.source).toBe('explicit_offset');
  });
});