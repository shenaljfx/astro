const {
  DEFAULT_CALCULATION_SETTINGS,
  resolveCalculationSettings,
  buildCalculationMetadata,
} = require('../calculationSettings');

describe('calculation settings metadata', () => {
  test('normalizes legacy option names into first-class settings', () => {
    const settings = resolveCalculationSettings({
      ayanamshaMode: 'Raman',
      topocentric: true,
    });

    expect(settings.ayanamsha).toBe('raman');
    expect(settings.observerMode).toBe('topocentric');
    expect(settings.houseSystem).toBe(DEFAULT_CALCULATION_SETTINGS.houseSystem);
  });

  test('builds report-safe calculation metadata', () => {
    const date = new Date('1998-10-09T03:46:00.000Z');
    const metadata = buildCalculationMetadata({
      settings: { ayanamsha: 'lahiri' },
      date,
      lat: 6.9271,
      lng: 79.8612,
      ephemeris: {
        provider: 'swiss_bundled',
        requestedFlags: ['SwissEphemeris', 'Sidereal', 'Speed'],
        returnedFlags: [['SwissEphemeris', 'Sidereal', 'Speed']],
        returnedFlagsOk: true,
      },
    });

    expect(metadata.settings.ayanamsha).toBe('lahiri');
    expect(metadata.calculationDate).toBe(date.toISOString());
    expect(metadata.observer).toEqual({ lat: 6.9271, lng: 79.8612 });
    expect(metadata.ephemeris.returnedFlagsOk).toBe(true);
  });
});