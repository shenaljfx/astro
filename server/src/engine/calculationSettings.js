const DEFAULT_CALCULATION_SETTINGS = Object.freeze({
  ayanamsha: 'lahiri',
  houseSystem: 'whole_sign',
  nodeType: 'true',
  observerMode: 'geocentric',
  sunriseMode: 'hindu_disc_center_no_refraction',
  dashaYearMode: 'tropical_365_2422',
  ephemeris: 'swiss_bundled',
  timezoneSource: 'route_resolved_or_default',
});

function resolveCalculationSettings(input = {}) {
  const source = input.calculationSettings || input.settings || input;
  const ayanamsha = source.ayanamsha || source.ayanamshaMode || DEFAULT_CALCULATION_SETTINGS.ayanamsha;
  return {
    ayanamsha: String(ayanamsha).toLowerCase(),
    houseSystem: source.houseSystem || DEFAULT_CALCULATION_SETTINGS.houseSystem,
    nodeType: source.nodeType || DEFAULT_CALCULATION_SETTINGS.nodeType,
    observerMode: source.topocentric ? 'topocentric' : (source.observerMode || DEFAULT_CALCULATION_SETTINGS.observerMode),
    sunriseMode: source.sunriseMode || DEFAULT_CALCULATION_SETTINGS.sunriseMode,
    dashaYearMode: source.dashaYearMode || DEFAULT_CALCULATION_SETTINGS.dashaYearMode,
    ephemeris: source.ephemeris || DEFAULT_CALCULATION_SETTINGS.ephemeris,
    timezoneSource: source.timezoneSource || DEFAULT_CALCULATION_SETTINGS.timezoneSource,
  };
}

function buildCalculationMetadata({ settings, date, lat, lng, timeContext = null, ephemeris = null } = {}) {
  const resolvedSettings = resolveCalculationSettings(settings || {});
  return {
    engineVersion: 'Grahachara-Core-v1',
    generatedAt: new Date().toISOString(),
    calculationDate: date instanceof Date && !isNaN(date.getTime()) ? date.toISOString() : null,
    observer: {
      lat: typeof lat === 'number' ? lat : null,
      lng: typeof lng === 'number' ? lng : null,
    },
    settings: resolvedSettings,
    ephemeris: ephemeris || {
      provider: resolvedSettings.ephemeris,
      requestedFlags: [],
      returnedFlags: [],
      returnedFlagsOk: null,
    },
    timeContext,
  };
}

function formatUtcOffset(offsetSeconds = 0) {
  const sign = offsetSeconds >= 0 ? '+' : '-';
  const abs = Math.abs(offsetSeconds);
  const hours = Math.floor(abs / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  return `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function getOffsetSecondsFromTimeContext(timeContext = null, fallbackSeconds = 19800) {
  if (timeContext && typeof timeContext.offsetSeconds === 'number') {
    return timeContext.offsetSeconds;
  }
  return fallbackSeconds;
}

function formatLocalDateTime(date, timeContext = null, fallbackSeconds = 19800) {
  const offsetSeconds = getOffsetSecondsFromTimeContext(timeContext, fallbackSeconds);
  const local = new Date(date.getTime() + offsetSeconds * 1000);
  const dateString = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}-${String(local.getUTCDate()).padStart(2, '0')}`;
  const timeString = `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`;
  const offsetLabel = formatUtcOffset(offsetSeconds);
  const zoneName = timeContext?.zoneName || null;
  return {
    date: dateString,
    time: timeString,
    offsetSeconds,
    offsetLabel,
    zoneName,
    source: timeContext?.source || 'fallback_offset',
    label: zoneName ? `${zoneName}, ${offsetLabel}` : offsetLabel,
    display: `${dateString} ${timeString} (${zoneName ? `${zoneName}, ` : ''}${offsetLabel})`,
  };
}

module.exports = {
  DEFAULT_CALCULATION_SETTINGS,
  resolveCalculationSettings,
  buildCalculationMetadata,
  formatUtcOffset,
  getOffsetSecondsFromTimeContext,
  formatLocalDateTime,
};