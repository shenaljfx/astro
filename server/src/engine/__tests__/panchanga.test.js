const { getPanchanga } = require('../astrology');

describe('panchanga transitions', () => {
  test('returns end-times for core panchanga elements', () => {
    const date = new Date('2024-05-23T12:00:00.000Z');
    const panchanga = getPanchanga(date, 6.9271, 79.8612);

    expect(panchanga.tithi.endsAt).toBeTruthy();
    expect(panchanga.nakshatra.endsAt).toBeTruthy();
    expect(panchanga.yoga.endsAt).toBeTruthy();
    expect(panchanga.karana.endsAt).toBeTruthy();

    expect(new Date(panchanga.tithi.endsAt).getTime()).toBeGreaterThan(date.getTime());
    expect(new Date(panchanga.nakshatra.endsAt).getTime()).toBeGreaterThan(date.getTime());
    expect(new Date(panchanga.yoga.endsAt).getTime()).toBeGreaterThan(date.getTime());
    expect(new Date(panchanga.karana.endsAt).getTime()).toBeGreaterThan(date.getTime());
  });

  test('returns daily rise/set, bad periods, and planetary horas', () => {
    const date = new Date('2024-05-23T12:00:00.000Z');
    const panchanga = getPanchanga(date, 6.9271, 79.8612);

    expect(panchanga.sunrise).toBeTruthy();
    expect(panchanga.sunset).toBeTruthy();
    expect(panchanga.moonrise).toBeTruthy();
    expect(panchanga.moonset).toBeTruthy();
    expect(new Date(panchanga.sunset).getTime()).toBeGreaterThan(new Date(panchanga.sunrise).getTime());

    expect(panchanga.rahuKalam.start).toBeTruthy();
    expect(panchanga.gulikaKalam.start).toBeTruthy();
    expect(panchanga.yamaganda.start).toBeTruthy();
    expect(new Date(panchanga.rahuKalam.end).getTime()).toBeGreaterThan(new Date(panchanga.rahuKalam.start).getTime());

    expect(panchanga.horas).toHaveLength(24);
    expect(panchanga.horas[0]).toEqual(expect.objectContaining({ index: 1, period: 'day' }));
    expect(panchanga.horas[23]).toEqual(expect.objectContaining({ index: 24, period: 'night' }));
  });
});