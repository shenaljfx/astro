/**
 * Vedic Astrology Engine for Grahachara (ග්‍රහචාර)
 * 
 * Implements core Vedic/Sidereal astrology calculations including:
 * - Planetary positions (Graha Sthana) via astronomia library (Meeus algorithms)
 * - Nakshatra determination
 * - Rahu Kalaya calculation
 * - Auspicious time (Nakath/Muhurtha) computation
 * - Panchanga elements
 * - Vedic Planetary Aspects (Drishtis) - Graha Drishti per BPHS
 * - Pushkara Navamsha & Pushkara Bhaga - Auspicious degrees
 * - Ashtakavarga - 8-fold transit strength analysis (Sarvashtakavarga)
 * - Bhava Chalit Chart - Unequal house cusps for transit analysis
 * 
 * Uses the Lahiri Ayanamsha for sidereal calculations (standard in Sri Lanka).
 * Planetary positions use the astronomia library for high-accuracy Meeus-based calculations.
 */

const { moonposition, solar, julian, base, nutation: nutationMod } = require('astronomia');
const ephemeris = require('ephemeris');

// ---------------------------------------------------------------------------
// Swiss Ephemeris — high-precision planetary calculation engine (0.001 arcsec)
// Replaces Moshier/Meeus for all critical calculations while keeping the old
// libraries as fallback.
// ---------------------------------------------------------------------------
const swe = require('@swisseph/node');
const {
  Planet: SwePlanet,
  LunarPoint: SweLunarPoint,
  HouseSystem: SweHouseSystem,
  SiderealMode: SweSiderealMode,
  CalculationFlag: SweFlag,
} = swe;

// Initialize sidereal mode to Lahiri (standard for Sri Lankan / Vedic astrology)
swe.setSiderealMode(SweSiderealMode.Lahiri);

// Supported ayanamsha systems — user can select via options
const AYANAMSHA_MODES = {
  lahiri: SweSiderealMode.Lahiri,
  krishnamurti: SweSiderealMode.Krishnamurti,
  raman: SweSiderealMode.Raman,
  yukteshwar: SweSiderealMode.Yukteshwar,
  fagan_bradley: SweSiderealMode.FaganBradley,
};

let _currentAyanamshaMode = 'lahiri';

function setAyanamshaMode(mode) {
  const m = (mode || 'lahiri').toLowerCase();
  if (AYANAMSHA_MODES[m] !== undefined) {
    _currentAyanamshaMode = m;
    swe.setSiderealMode(AYANAMSHA_MODES[m]);
  }
}

function getCurrentAyanamshaMode() {
  return _currentAyanamshaMode;
}

// Legacy constants kept for any downstream code that references them
const LAHIRI_AYANAMSHA_J2000 = 23.853056;
const AYANAMSHA_RATE = 0.0137222;

const NUTATION_COEFFS = [
  [0, 0, 0, 0, 1, -171996, -174.2, 92025, 8.9],
  [-2, 0, 0, 2, 2, -13187, -1.6, 5736, -3.1],
  [0, 0, 0, 2, 2, -2274, -0.2, 977, -0.5],
  [0, 0, 0, 0, 2, 2062, 0.2, -895, 0.5],
  [0, 1, 0, 0, 0, 1426, -3.4, 54, -0.1],
  [0, 0, 1, 0, 0, 712, 0.1, -7, 0],
  [-2, 1, 0, 2, 2, -517, 1.2, 224, -0.6],
  [0, 0, 0, 2, 1, -386, -0.4, 200, 0],
  [0, 0, 1, 2, 2, -301, 0, 129, -0.1],
  [-2, -1, 0, 2, 2, 217, -0.5, -95, 0.3],
  [-2, 0, 1, 0, 0, -158, 0, 0, 0],
  [-2, 0, 0, 2, 1, 129, 0.1, -70, 0],
  [0, 0, -1, 2, 2, 123, 0, -53, 0],
  [2, 0, 0, 0, 0, 63, 0, 0, 0],
  [0, 0, 1, 0, 1, 63, 0.1, -33, 0],
];

/**
 * Nakshatras (27 lunar mansions) used in Sri Lankan/Vedic astrology
 */
const NAKSHATRAS = [
  { id: 1, name: 'Ashwini', sinhala: 'අස්විද', tamil: 'அஸ்வினி', lord: 'Ketu', start: 0 },
  { id: 2, name: 'Bharani', sinhala: 'භරණි', tamil: 'பரணி', lord: 'Venus', start: 13.333 },
  { id: 3, name: 'Krittika', sinhala: 'කෘතිකා', tamil: 'கிருத்திகை', lord: 'Sun', start: 26.667 },
  { id: 4, name: 'Rohini', sinhala: 'රෝහිණි', tamil: 'ரோகிணி', lord: 'Moon', start: 40 },
  { id: 5, name: 'Mrigashira', sinhala: 'මිගසිර', tamil: 'மிருகசீரிடம்', lord: 'Mars', start: 53.333 },
  { id: 6, name: 'Ardra', sinhala: 'අද', tamil: 'திருவாதிரை', lord: 'Rahu', start: 66.667 },
  { id: 7, name: 'Punarvasu', sinhala: 'පුනාවාස', tamil: 'புனர்பூசம்', lord: 'Jupiter', start: 80 },
  { id: 8, name: 'Pushya', sinhala: 'පුෂ්‍ය', tamil: 'பூசம்', lord: 'Saturn', start: 93.333 },
  { id: 9, name: 'Ashlesha', sinhala: 'ආශ්ලේෂ', tamil: 'ஆயில்யம்', lord: 'Mercury', start: 106.667 },
  { id: 10, name: 'Magha', sinhala: 'මාඝ', tamil: 'மகம்', lord: 'Ketu', start: 120 },
  { id: 11, name: 'Purva Phalguni', sinhala: 'පූර්ව ඵල්ගුනි', tamil: 'பூரம்', lord: 'Venus', start: 133.333 },
  { id: 12, name: 'Uttara Phalguni', sinhala: 'උත්තර ඵල්ගුනි', tamil: 'உத்திரம்', lord: 'Sun', start: 146.667 },
  { id: 13, name: 'Hasta', sinhala: 'හස්ත', tamil: 'அஸ்தம்', lord: 'Moon', start: 160 },
  { id: 14, name: 'Chitra', sinhala: 'චිත්‍රා', tamil: 'சித்திரை', lord: 'Mars', start: 173.333 },
  { id: 15, name: 'Swati', sinhala: 'ස්වාති', tamil: 'சுவாதி', lord: 'Rahu', start: 186.667 },
  { id: 16, name: 'Vishakha', sinhala: 'විශාඛා', tamil: 'விசாகம்', lord: 'Jupiter', start: 200 },
  { id: 17, name: 'Anuradha', sinhala: 'අනුරාධා', tamil: 'அனுஷம்', lord: 'Saturn', start: 213.333 },
  { id: 18, name: 'Jyeshtha', sinhala: 'ජේෂ්ඨ', tamil: 'கேட்டை', lord: 'Mercury', start: 226.667 },
  { id: 19, name: 'Mula', sinhala: 'මූල', tamil: 'மூலம்', lord: 'Ketu', start: 240 },
  { id: 20, name: 'Purva Ashadha', sinhala: 'පුර්වාෂාඨ', tamil: 'பூராடம்', lord: 'Venus', start: 253.333 },
  { id: 21, name: 'Uttara Ashadha', sinhala: 'උත්තරාෂාඨ', tamil: 'உத்திராடம்', lord: 'Sun', start: 266.667 },
  { id: 22, name: 'Shravana', sinhala: 'ශ්‍රවණ', tamil: 'திருவோணம்', lord: 'Moon', start: 280 },
  { id: 23, name: 'Dhanishtha', sinhala: 'ධනිෂ්ඨා', tamil: 'அவிட்டம்', lord: 'Mars', start: 293.333 },
  { id: 24, name: 'Shatabhisha', sinhala: 'ශතභිෂා', tamil: 'சதயம்', lord: 'Rahu', start: 306.667 },
  { id: 25, name: 'Purva Bhadrapada', sinhala: 'පූර්ව භාද්‍රපද', tamil: 'பூரட்டாதி', lord: 'Jupiter', start: 320 },
  { id: 26, name: 'Uttara Bhadrapada', sinhala: 'උත්තර භාද්‍රපද', tamil: 'உத்திரட்டாதி', lord: 'Saturn', start: 333.333 },
  { id: 27, name: 'Revati', sinhala: 'රේවතී', tamil: 'ரேவதி', lord: 'Mercury', start: 346.667 },
];

/**
 * Rashis (Zodiac Signs) - Sidereal
 */
const RASHIS = [
  { id: 1, name: 'Mesha', english: 'Aries', sinhala: 'මේෂ', tamil: 'மேஷம்', lord: 'Mars' },
  { id: 2, name: 'Vrishabha', english: 'Taurus', sinhala: 'වෘෂභ', tamil: 'ரிஷபம்', lord: 'Venus' },
  { id: 3, name: 'Mithuna', english: 'Gemini', sinhala: 'මිථුන', tamil: 'மிதுனம்', lord: 'Mercury' },
  { id: 4, name: 'Kataka', english: 'Cancer', sinhala: 'කටක', tamil: 'கடகம்', lord: 'Moon' },
  { id: 5, name: 'Simha', english: 'Leo', sinhala: 'සිංහ', tamil: 'சிம்மம்', lord: 'Sun' },
  { id: 6, name: 'Kanya', english: 'Virgo', sinhala: 'කන්‍යා', tamil: 'கன்னி', lord: 'Mercury' },
  { id: 7, name: 'Tula', english: 'Libra', sinhala: 'තුලා', tamil: 'துலாம்', lord: 'Venus' },
  { id: 8, name: 'Vrischika', english: 'Scorpio', sinhala: 'වෘශ්චික', tamil: 'விருச்சிகம்', lord: 'Mars' },
  { id: 9, name: 'Dhanus', english: 'Sagittarius', sinhala: 'ධනු', tamil: 'தனுசு', lord: 'Jupiter' },
  { id: 10, name: 'Makara', english: 'Capricorn', sinhala: 'මකර', tamil: 'மகரம்', lord: 'Saturn' },
  { id: 11, name: 'Kumbha', english: 'Aquarius', sinhala: 'කුම්භ', tamil: 'கும்பம்', lord: 'Saturn' },
  { id: 12, name: 'Meena', english: 'Pisces', sinhala: 'මීන', tamil: 'மீனம்', lord: 'Jupiter' },
];

/**
 * Planetary data for Vedic astrology (Navagraha)
 */
const PLANETS = [
  { id: 'sun', name: 'Surya', sinhala: 'ඉර', tamil: 'சூரியன்', english: 'Sun' },
  { id: 'moon', name: 'Chandra', sinhala: 'හඳ', tamil: 'சந்திரன்', english: 'Moon' },
  { id: 'mars', name: 'Mangala', sinhala: 'කුජ', tamil: 'செவ்வாய்', english: 'Mars' },
  { id: 'mercury', name: 'Budha', sinhala: 'බුධ', tamil: 'புதன்', english: 'Mercury' },
  { id: 'jupiter', name: 'Guru', sinhala: 'ගුරු', tamil: 'குரு', english: 'Jupiter' },
  { id: 'venus', name: 'Shukra', sinhala: 'සිකුරු', tamil: 'சுக்கிரன்', english: 'Venus' },
  { id: 'saturn', name: 'Shani', sinhala: 'සෙනසුරු', tamil: 'சனி', english: 'Saturn' },
  { id: 'rahu', name: 'Rahu', sinhala: 'රාහු', tamil: 'ராகு', english: 'Rahu (North Node)' },
  { id: 'ketu', name: 'Ketu', sinhala: 'කේතු', tamil: 'கேது', english: 'Ketu (South Node)' },
];

/**
 * Days of the week with planetary rulers (important for Rahu Kalaya)
 */
const WEEKDAYS = [
  { day: 0, name: 'Sunday', sinhala: 'ඉරිදා', tamil: 'ஞாயிறு', ruler: 'Sun' },
  { day: 1, name: 'Monday', sinhala: 'සඳුදා', tamil: 'திங்கள்', ruler: 'Moon' },
  { day: 2, name: 'Tuesday', sinhala: 'අඟහරුවාදා', tamil: 'செவ்வாய்', ruler: 'Mars' },
  { day: 3, name: 'Wednesday', sinhala: 'බදාදා', tamil: 'புதன்', ruler: 'Mercury' },
  { day: 4, name: 'Thursday', sinhala: 'බ්‍රහස්පතින්දා', tamil: 'வியாழன்', ruler: 'Jupiter' },
  { day: 5, name: 'Friday', sinhala: 'සිකුරාදා', tamil: 'வெள்ளி', ruler: 'Venus' },
  { day: 6, name: 'Saturday', sinhala: 'සෙනසුරාදා', tamil: 'சனி', ruler: 'Saturn' },
];

/**
 * Rahu Kalaya periods for each day of the week
 * These are the traditional time slots (measured in 1.5-hour segments from sunrise)
 * 
 * The order follows: Mon=2, Sat=3, Fri=4, Wed=5, Thu=6, Tue=7, Sun=8
 * where the number is the segment number from sunrise
 */
const RAHU_KALA_SEGMENTS = {
  0: 8, // Sunday: 8th segment (approx 4:30 PM - 6:00 PM)
  1: 2, // Monday: 2nd segment (approx 7:30 AM - 9:00 AM)
  2: 7, // Tuesday: 7th segment (approx 3:00 PM - 4:30 PM)
  3: 5, // Wednesday: 5th segment (approx 12:00 PM - 1:30 PM)
  4: 6, // Thursday: 6th segment (approx 1:30 PM - 3:00 PM)
  5: 4, // Friday: 4th segment (approx 10:30 AM - 12:00 PM)
  6: 3, // Saturday: 3rd segment (approx 9:00 AM - 10:30 AM)
};

/**
 * Calculate Julian Day Number from a Date
 */
function dateToJD(date) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400;

  let jy = y;
  let jm = m;
  if (m <= 2) {
    jy -= 1;
    jm += 12;
  }

  const A = Math.floor(jy / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (jy + 4716)) + Math.floor(30.6001 * (jm + 1)) + d + B - 1524.5;
}

/**
 * Calculate approximate sunrise time for a given location and date
 * Uses simplified solar position calculation
 * 
 * @param {Date} date - The date
 * @param {number} lat - Latitude in degrees
 * @param {number} lng - Longitude in degrees
 * @returns {{ sunrise: Date, sunset: Date }}
 */
function calculateSunriseSunset(date, lat, lng) {
  const jd = dateToJD(date);
  // n must be an INTEGER day number (Wikipedia sunrise equation)
  // Using fractional n shifts transit by ~12 hours, swapping sunrise/sunset
  const n = Math.ceil(jd - 2451545.0 + 0.0008); // Days since J2000.0

  // Mean solar noon
  const Jstar = n - lng / 360;

  // Solar mean anomaly
  const M = (357.5291 + 0.98560028 * Jstar) % 360;
  const Mrad = M * Math.PI / 180;

  // Equation of center
  const C = 1.9148 * Math.sin(Mrad) + 0.02 * Math.sin(2 * Mrad) + 0.0003 * Math.sin(3 * Mrad);

  // Ecliptic longitude
  const lambda = (M + C + 180 + 102.9372) % 360;
  const lambdaRad = lambda * Math.PI / 180;

  // Solar declination
  const sinDec = Math.sin(lambdaRad) * Math.sin(23.4397 * Math.PI / 180);
  const decl = Math.asin(sinDec);

  // Hour angle
  const latRad = lat * Math.PI / 180;
  const cosHA = (Math.sin(-0.833 * Math.PI / 180) - Math.sin(latRad) * Math.sin(decl)) /
    (Math.cos(latRad) * Math.cos(decl));

  // Clamp cosHA to [-1, 1]
  const clampedCosHA = Math.max(-1, Math.min(1, cosHA));
  const HA = Math.acos(clampedCosHA) * 180 / Math.PI;

  // Solar transit
  const Jtransit = 2451545.0 + Jstar + 0.0053 * Math.sin(Mrad) - 0.0069 * Math.sin(2 * lambdaRad);

  // Sunrise and sunset Julian dates
  const Jrise = Jtransit - HA / 360;
  const Jset = Jtransit + HA / 360;

  // Convert JD back to Date
  function jdToDate(jd) {
    const z = Math.floor(jd + 0.5);
    const f = jd + 0.5 - z;
    let A;
    if (z < 2299161) {
      A = z;
    } else {
      const alpha = Math.floor((z - 1867216.25) / 36524.25);
      A = z + 1 + alpha - Math.floor(alpha / 4);
    }
    const B = A + 1524;
    const C = Math.floor((B - 122.1) / 365.25);
    const D = Math.floor(365.25 * C);
    const E = Math.floor((B - D) / 30.6001);

    const day = B - D - Math.floor(30.6001 * E);
    const month = E < 14 ? E - 1 : E - 13;
    const year = month > 2 ? C - 4716 : C - 4715;

    const totalHours = f * 24;
    const hours = Math.floor(totalHours);
    const minutes = Math.floor((totalHours - hours) * 60);
    const seconds = Math.floor(((totalHours - hours) * 60 - minutes) * 60);

    return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
  }

  return {
    sunrise: jdToDate(Jrise),
    sunset: jdToDate(Jset),
  };
}

/**
 * Calculate Rahu Kalaya for a given date and location
 * 
 * Rahu Kalaya is an inauspicious period that occurs daily.
 * It is calculated by dividing the daylight hours into 8 equal segments
 * and selecting the segment based on the day of the week.
 * 
 * @param {Date} date - The date to calculate for
 * @param {number} lat - Latitude (default: Colombo 6.9271)
 * @param {number} lng - Longitude (default: Colombo 79.8612)
 * @returns {{ start: Date, end: Date, dayOfWeek: object }}
 */
function calculateRahuKalaya(date, lat = 6.9271, lng = 79.8612) {
  const { sunrise, sunset } = calculateSunriseSunset(date, lat, lng);

  // Total daylight duration in milliseconds
  const daylightMs = sunset.getTime() - sunrise.getTime();

  // Each segment is 1/8 of daylight
  const segmentMs = daylightMs / 8;

  // Get the day of week (0=Sunday, 1=Monday, etc.)
  const dayOfWeek = date.getDay();
  const segmentNumber = RAHU_KALA_SEGMENTS[dayOfWeek];

  // Rahu Kala starts at (segment - 1) segments after sunrise
  const rahuStart = new Date(sunrise.getTime() + (segmentNumber - 1) * segmentMs);
  const rahuEnd = new Date(rahuStart.getTime() + segmentMs);

  return {
    start: rahuStart,
    end: rahuEnd,
    sunrise,
    sunset,
    dayOfWeek: WEEKDAYS[dayOfWeek],
    segmentNumber,
    daylightHours: daylightMs / 3600000,
  };
}

/**
 * Get accurate Moon longitude using Swiss Ephemeris (JPL precision ~0.001")
 * Falls back to astronomia (Meeus) if Swiss Ephemeris fails.
 * Returns tropical ecliptic longitude in degrees (0-360)
 */
function getMoonLongitude(date) {
  try {
    const jd = swe.dateToJulianDay(date);
    const pos = swe.calculatePosition(jd, SwePlanet.Moon, SweFlag.SwissEphemeris | SweFlag.Speed);
    return ((pos.longitude % 360) + 360) % 360;
  } catch (_) {
    const jde = dateToJD(date);
    const pos = moonposition.position(jde);
    let lon = pos.lon * 180 / Math.PI;
    return ((lon % 360) + 360) % 360;
  }
}

/**
 * Get accurate Sun longitude using Swiss Ephemeris (JPL precision ~0.001")
 * Falls back to astronomia (Meeus) if Swiss Ephemeris fails.
 * Returns apparent tropical ecliptic longitude in degrees (0-360)
 */
function getSunLongitude(date) {
  try {
    const jd = swe.dateToJulianDay(date);
    const pos = swe.calculatePosition(jd, SwePlanet.Sun, SweFlag.SwissEphemeris | SweFlag.Speed);
    return ((pos.longitude % 360) + 360) % 360;
  } catch (_) {
    const jde = dateToJD(date);
    const T = base.J2000Century(jde);
    let lon = solar.apparentLongitude(T) * 180 / Math.PI;
    return ((lon % 360) + 360) % 360;
  }
}

/**
 * Calculate ayanamsha using Swiss Ephemeris (full IAU precession + nutation).
 * Supports multiple ayanamsha systems via setAyanamshaMode().
 * Falls back to manual calculation if Swiss Ephemeris unavailable.
 */
function getAyanamsha(date) {
  try {
    const jd = swe.dateToJulianDay(date);
    return swe.getAyanamsa(jd);
  } catch (_) {
    // Legacy fallback — linear approximation with IAU nutation
    const jd = dateToJD(date);
    const T = (jd - 2451545.0) / 36525;
    const yearsFromJ2000 = (jd - 2451545.0) / 365.25;
    const l  = (485868.249036 + 1717915923.2178 * T) / 3600 % 360;
    const lp = (1287104.79305 + 129596581.0481 * T) / 3600 % 360;
    const F  = (335779.526232 + 1739527262.8478 * T) / 3600 % 360;
    const D  = (1072260.70369 + 1602961601.2090 * T) / 3600 % 360;
    const Om = (450160.398036 - 6962890.5431 * T) / 3600 % 360;
    let nutationLon = 0;
    const deg2rad = Math.PI / 180;
    for (const coeff of NUTATION_COEFFS) {
      const arg = (coeff[0] * l + coeff[1] * lp + coeff[2] * F + coeff[3] * D + coeff[4] * Om) * deg2rad;
      nutationLon += (coeff[5] + coeff[6] * T) * Math.sin(arg);
    }
    const nutationDeg = nutationLon / (3600 * 10000);
    return LAHIRI_AYANAMSHA_J2000 + AYANAMSHA_RATE * yearsFromJ2000 + nutationDeg;
  }
}

/**
 * Convert tropical longitude to sidereal
 */
function toSidereal(tropicalLong, date) {
  const ayanamsha = getAyanamsha(date);
  let sidereal = tropicalLong - ayanamsha;
  return ((sidereal % 360) + 360) % 360;
}

/**
 * Get accurate planetary longitudes for all 9 Navagrahas.
 *
 * PRIMARY: Swiss Ephemeris (JPL DE431, ~0.001" precision, True Node for Rahu/Ketu)
 * FALLBACK: astronomia + ephemeris (Moshier/Meeus, ~0.1" precision, Mean Node)
 *
 * @param {Date}   date  - UTC Date object
 * @param {number} [lat=6.9271]  - Observer latitude  (degrees)
 * @param {number} [lng=79.8612] - Observer longitude (degrees)
 * @param {object} [opts]  - Options: { topocentric: bool, ayanamshaMode: string }
 */
function getAllPlanetPositions(date, lat = 6.9271, lng = 79.8612, opts = {}) {
  const ayanamsha = getAyanamsha(date);
  const norm = (deg) => ((deg % 360) + 360) % 360;

  try {
    // -------- Swiss Ephemeris path (high precision) --------
    const jd = swe.dateToJulianDay(date);
    let flags = SweFlag.SwissEphemeris | SweFlag.Speed;

    if (opts.topocentric) {
      swe.setTopocentric(lng, lat, 0);
      flags |= SweFlag.Topocentric;
    }

    const sunPos  = swe.calculatePosition(jd, SwePlanet.Sun, flags);
    const moonPos = swe.calculatePosition(jd, SwePlanet.Moon, flags);
    const marsPos = swe.calculatePosition(jd, SwePlanet.Mars, flags);
    const mercPos = swe.calculatePosition(jd, SwePlanet.Mercury, flags);
    const jupPos  = swe.calculatePosition(jd, SwePlanet.Jupiter, flags);
    const venPos  = swe.calculatePosition(jd, SwePlanet.Venus, flags);
    const satPos  = swe.calculatePosition(jd, SwePlanet.Saturn, flags);
    // True Node provides the osculating (actual) lunar node position
    const rahuPos = swe.calculatePosition(jd, SweLunarPoint.TrueNode, flags);

    const sunTrop  = norm(sunPos.longitude);
    const moonTrop = norm(moonPos.longitude);
    const marsTrop = norm(marsPos.longitude);
    const mercTrop = norm(mercPos.longitude);
    const jupTrop  = norm(jupPos.longitude);
    const venTrop  = norm(venPos.longitude);
    const satTrop  = norm(satPos.longitude);
    const rahuTrop = norm(rahuPos.longitude);
    const ketuTrop = norm(rahuTrop + 180);

    const planets = {
      sun:     { name: 'Sun',     sinhala: 'ඉර',     tamil: 'சூரியன்',   tropical: sunTrop,   sidereal: norm(sunTrop - ayanamsha) },
      moon:    { name: 'Moon',    sinhala: 'හඳ',     tamil: 'சந்திரன்',  tropical: moonTrop,  sidereal: norm(moonTrop - ayanamsha) },
      mars:    { name: 'Mars',    sinhala: 'කුජ',    tamil: 'செவ்வாய்',  tropical: marsTrop,  sidereal: norm(marsTrop - ayanamsha) },
      mercury: { name: 'Mercury', sinhala: 'බුධ',    tamil: 'புதன்',     tropical: mercTrop,  sidereal: norm(mercTrop - ayanamsha) },
      jupiter: { name: 'Jupiter', sinhala: 'ගුරු',   tamil: 'குரு',      tropical: jupTrop,   sidereal: norm(jupTrop - ayanamsha) },
      venus:   { name: 'Venus',   sinhala: 'සිකුරු', tamil: 'சுக்கிரன்', tropical: venTrop,   sidereal: norm(venTrop - ayanamsha) },
      saturn:  { name: 'Saturn',  sinhala: 'සෙනසුරු', tamil: 'சனி',      tropical: satTrop,   sidereal: norm(satTrop - ayanamsha) },
      rahu:    { name: 'Rahu',    sinhala: 'රාහු',   tamil: 'ராகு',      tropical: rahuTrop,  sidereal: norm(rahuTrop - ayanamsha) },
      ketu:    { name: 'Ketu',    sinhala: 'කේතු',   tamil: 'கேது',      tropical: ketuTrop,  sidereal: norm(ketuTrop - ayanamsha) },
    };

    const speedMap = {
      sun: sunPos, moon: moonPos, mars: marsPos, mercury: mercPos,
      jupiter: jupPos, venus: venPos, saturn: satPos,
    };

    for (const key of Object.keys(planets)) {
      const p = planets[key];
      const rashi = getRashi(p.sidereal);
      p.rashiId = rashi.id;
      p.rashi = rashi.name;
      p.rashiEnglish = rashi.english;
      p.rashiSinhala = rashi.sinhala;
      p.degreeInSign = p.sidereal % 30;
      if (speedMap[key]) {
        p.isRetrograde = speedMap[key].longitudeSpeed < 0;
        p.speed = speedMap[key].longitudeSpeed;
      } else {
        p.isRetrograde = false;
      }
    }
    planets.rahu.isRetrograde = true;
    planets.ketu.isRetrograde = true;
    return planets;

  } catch (_sweErr) {
    // -------- Fallback: astronomia + ephemeris (Moshier) --------
    const jd = dateToJD(date);
    const T = (jd - 2451545.0) / 36525;

    const sunTrop = getSunLongitude(date);
    const moonTrop = getMoonLongitude(date);

    const swissResult = ephemeris.getAllPlanets(date, lat, lng, 0);
    const swissObs = swissResult.observed;
    const marsTrop = swissObs.mars.apparentLongitudeDd;
    const mercTrop = swissObs.mercury.apparentLongitudeDd;
    const jupTrop  = swissObs.jupiter.apparentLongitudeDd;
    const venTrop  = swissObs.venus.apparentLongitudeDd;
    const satTrop  = swissObs.saturn.apparentLongitudeDd;
    let rahuTrop = norm(125.044 - 1934.1362 * T);
    let ketuTrop = norm(rahuTrop + 180);

    const planets = {
      sun:     { name: 'Sun',     sinhala: 'ඉර',     tamil: 'சூரியன்',   tropical: sunTrop,   sidereal: norm(sunTrop - ayanamsha) },
      moon:    { name: 'Moon',    sinhala: 'හඳ',     tamil: 'சந்திரன்',  tropical: moonTrop,  sidereal: norm(moonTrop - ayanamsha) },
      mars:    { name: 'Mars',    sinhala: 'කුජ',    tamil: 'செவ்வாய்',  tropical: marsTrop,  sidereal: norm(marsTrop - ayanamsha) },
      mercury: { name: 'Mercury', sinhala: 'බුධ',    tamil: 'புதன்',     tropical: mercTrop,  sidereal: norm(mercTrop - ayanamsha) },
      jupiter: { name: 'Jupiter', sinhala: 'ගුරු',   tamil: 'குரு',      tropical: jupTrop,   sidereal: norm(jupTrop - ayanamsha) },
      venus:   { name: 'Venus',   sinhala: 'සිකුරු', tamil: 'சுக்கிரன்', tropical: venTrop,   sidereal: norm(venTrop - ayanamsha) },
      saturn:  { name: 'Saturn',  sinhala: 'සෙනසුරු', tamil: 'சனி',      tropical: satTrop,   sidereal: norm(satTrop - ayanamsha) },
      rahu:    { name: 'Rahu',    sinhala: 'රාහු',   tamil: 'ராகු',      tropical: rahuTrop,  sidereal: norm(rahuTrop - ayanamsha) },
      ketu:    { name: 'Ketu',    sinhala: 'කේතු',   tamil: 'கேது',      tropical: ketuTrop,  sidereal: norm(ketuTrop - ayanamsha) },
    };

    for (const key of Object.keys(planets)) {
      const p = planets[key];
      const rashi = getRashi(p.sidereal);
      p.rashiId = rashi.id;
      p.rashi = rashi.name;
      p.rashiEnglish = rashi.english;
      p.rashiSinhala = rashi.sinhala;
      p.degreeInSign = p.sidereal % 30;
      if (swissObs[key]) {
        p.isRetrograde = swissObs[key].is_retrograde === true;
      } else {
        p.isRetrograde = false;
      }
    }
    planets.rahu.isRetrograde = true;
    planets.ketu.isRetrograde = true;
    return planets;
  }
}

/**
 * Build the 12-house chart (Bhava chart) using whole-sign houses from Lagna.
 * In Sri Lankan tradition, the Lagna rashi becomes the 1st house,
 * and subsequent signs fill houses 2-12.
 *
 * Returns an array of 12 houses, each with:
 *   - houseNumber (1-12)
 *   - rashiId (1-12)
 *   - rashi (name)
 *   - planets (array of planet keys in this house)
 */
function buildHouseChart(date, lat, lng) {
  const lagna = getLagna(date, lat, lng);
  const lagnaRashiId = lagna.rashi.id; // 1-12
  const planets = getAllPlanetPositions(date, lat, lng);

  const houses = [];
  for (let i = 0; i < 12; i++) {
    const rashiId = ((lagnaRashiId - 1 + i) % 12) + 1;
    const rashi = RASHIS[rashiId - 1];
    const planetsInHouse = [];

    for (const [key, p] of Object.entries(planets)) {
      if (p.rashiId === rashiId) {
        planetsInHouse.push({
          key,
          name: p.name,
          sinhala: p.sinhala,
          degree: p.degreeInSign,
        });
      }
    }

    houses.push({
      houseNumber: i + 1,
      rashiId,
      rashi: rashi.name,
      rashiEnglish: rashi.english,
      rashiSinhala: rashi.sinhala,
      rashiLord: rashi.lord,
      planets: planetsInHouse,
    });
  }

  return { houses, lagna, planets };
}

/**
 * Build Navamsha (D9) Chart
 * 
 * Rules:
 * - Fire Signs (1,5,9): Start count from Aries (1)
 * - Earth Signs (2,6,10): Start count from Capricorn (10)
 * - Air Signs (3,7,11): Start count from Libra (7)
 * - Water Signs (4,8,12): Start count from Cancer (4)
 * 
 * Each sign is 30 degrees, divided into 9 navamshas of 3°20' (3.333deg)
 */
function buildNavamshaChart(date, lat, lng) {
  // Get Lagna and Planets
  const lagna = getLagna(date, lat, lng);
  const planets = getAllPlanetPositions(date, lat, lng);
  
  // Helper to calc Navamsha Rashi
  const getNavamshaRashiId = (rashiId, degree) => {
    // 1. Find element group start
    let startRashiId = 1; 
    if ([1, 5, 9].includes(rashiId)) startRashiId = 1; // Fire -> Aries
    else if ([2, 6, 10].includes(rashiId)) startRashiId = 10; // Earth -> Capricorn
    else if ([3, 7, 11].includes(rashiId)) startRashiId = 7; // Air -> Libra
    else if ([4, 8, 12].includes(rashiId)) startRashiId = 4; // Water -> Cancer
    
    // 2. Find pada (0-8)
    const pada = Math.floor(degree / 3.333333333);
    
    // 3. Calc result
    // (Start + Pada - 1 actually becomes just Start + Pada if we use 0-based for math then fix)
    let navId = (startRashiId + pada);
    if (navId > 12) navId = navId % 12;
    if (navId === 0) navId = 12;
    
    return navId;
  };
  
  // Calculate Navamsha Lagna
  // Use sidereal lagna degree within sign
  const lagnaDegree = lagna.sidereal % 30;
  const navamshaLagnaId = getNavamshaRashiId(lagna.rashi.id, lagnaDegree);
  const navamshaLagnaRashi = RASHIS[navamshaLagnaId - 1];
  
  // Build planet list with Navamsha positions
  const navamshaPlanets = {};
  for (const [key, p] of Object.entries(planets)) {
    const navId = getNavamshaRashiId(p.rashiId, p.degreeInSign);
    navamshaPlanets[key] = {
      ...p,
      navamshaRashiId: navId,
      navamshaRashi: RASHIS[navId-1].name,
      navamshaRashiEnglish: RASHIS[navId-1].english
    };
  }
  
  // Organize into Fixed Zodiac Rashi Chart (South Indian Style)
  // Index 0 = Aries, 1 = Taurus, ...
  const rashiChart = [];
  for (let i = 0; i < 12; i++) {
    const rashiId = i + 1;
    const r = RASHIS[i];
    
    // Find planets in this Navamsha Rashi
    const planetsInRashi = [];
    for (const [key, p] of Object.entries(navamshaPlanets)) {
      if (p.navamshaRashiId === rashiId) {
        planetsInRashi.push({
          key,
          name: p.name,
          sinhala: p.sinhala,
          degree: p.degreeInSign 
        });
      }
    }
    
    // Check if Navamsha Lagna is here
    if (navamshaLagnaId === rashiId) {
        planetsInRashi.unshift({ name: 'Lagna', sinhala: 'ලග්න' });
    }
    
    rashiChart.push({
      rashiId,
      rashi: r.name,
      rashiEnglish: r.english,
      rashiSinhala: r.sinhala,
      planets: planetsInRashi
    });
  }
  
  return {
    lagna: { rashi: navamshaLagnaRashi },
    houses: rashiChart, // Renaming to match usage, though it's technically Rashi chart
    planets: navamshaPlanets
  };
}

/**
 * Calculate Divisional Charts (Vargas)
 * Implements Shadvarga (6 charts) common in Sri Lankan astrology
 * D1 (Rashi), D2 (Hora), D3 (Drekkana), D9 (Navamsha), D12 (Dwadasamsa), D30 (Trimsamsa)
 */

function getHoraRashiId(rashiId, degree) {
    // D2: Odd signs 0-15 Sun(5), 15-30 Moon(4)
    // Even signs 0-15 Moon(4), 15-30 Sun(5)
    // Note: Sri Lankan/Parashara method
    const isOdd = rashiId % 2 !== 0;
    const firstHalf = degree < 15;
    
    if (isOdd) {
        return firstHalf ? 5 : 4;
    } else {
        return firstHalf ? 4 : 5;
    }
}

function getDrekkanaRashiId(rashiId, degree) {
    // D3: 0-10 Same, 10-20 5th, 20-30 9th
    const part = Math.floor(degree / 10); // 0, 1, 2
    let dRashi = rashiId;
    if (part === 1) dRashi = (rashiId + 4) % 12 || 12; // 5th
    if (part === 2) dRashi = (rashiId + 8) % 12 || 12; // 9th
    return dRashi;
}

function getNavamshaRashiId(rashiId, degree) {
    // D9: Already implemented logic, reproducing here for consistency
    // Fire (1,5,9) start Aries(1)
    // Earth (2,6,10) start Cap(10)
    // Air (3,7,11) start Lib(7)
    // Water (4,8,12) start Can(4)
    let start = 1;
    const rem = rashiId % 4; // 1=Fire, 2=Earth, 3=Air, 0=Water
    if (rem === 1) start = 1;
    if (rem === 2) start = 10;
    if (rem === 3) start = 7;
    if (rem === 0) start = 4;
    
    const pada = Math.floor(degree / (30/9)); // 0-8
    return (start + pada - 1) % 12 + 1;
}

function getDwadasamsaRashiId(rashiId, degree) {
    // D12: Starts from the sign itself, each 2.5 deg
    const part = Math.floor(degree / 2.5); // 0-11
    return (rashiId + part - 1) % 12 + 1;
}

function getTrimsamsaRashiId(rashiId, degree) {
    // D30: Planets rule specific degrees
    // Odd: 0-5 Mars(1), 5-10 Sat(11), 10-18 Jup(9), 18-25 Mer(3), 25-30 Ven(7)
    // Even: 0-5 Ven(2), 5-12 Mer(6), 12-20 Jup(12), 20-25 Sat(10), 25-30 Mars(8)
    const isOdd = rashiId % 2 !== 0;
    
    if (isOdd) {
        if (degree < 5) return 1; // Mars -> Aries
        if (degree < 10) return 11; // Sat -> Aquarius
        if (degree < 18) return 9; // Jup -> Sagittarius
        if (degree < 25) return 3; // Mer -> Gemini
        return 7; // Ven -> Libra
    } else {
        if (degree < 5) return 2; // Ven -> Taurus
        if (degree < 12) return 6; // Mer -> Virgo
        if (degree < 20) return 12; // Jup -> Pisces
        if (degree < 25) return 10; // Sat -> Capricorn
        return 8; // Mars -> Scorpio
    }
}

/**
 * Calculate special dangerous lords for Sri Lankan astrology
 * 22nd Derkana Lord (Khara)
 * 64th Navamsha Lord
 */
function calculateSpecialLords(lagnaSidereal) {
    // 22nd Derkana:
    // Count 22 drekkanas from lagna.
    // 1 Drekkana = 10 deg.
    // 22nd start = 21 * 10 = 210 degrees from Lagna.
    // Or, simply the lord of the 8th house in the D3 chart?
    // Let's use the degree method.
    // 22nd Drekkana falls in the 8th House (since 3 Drekkanas per house, 7 houses = 21 Drekkanas).
    // The 22nd is the 1st Drekkana of the 8th House.
    // So distinct from Lagna, add 210 degrees.
    const d22Degree = (lagnaSidereal + 210) % 360;
    const d22RashiId = Math.floor(d22Degree / 30) + 1;
    const d22LocalDegree = d22Degree % 30;
    // Find the Drekkana Rashi of this point
    const d22DrekkanaRashi = getDrekkanaRashiId(d22RashiId, d22LocalDegree);
    const d22Lord = RASHIS[d22DrekkanaRashi - 1].lord;

    // 64th Navamsha:
    // Count 64 navamshas from lagna.
    // 1 Navamsha = 3 deg 20 min = 3.333 deg.
    // 64th start = 63 * 3.333 = 210 degrees.
    // It is also exact same degree offset (210) as 22nd Derkana start, but mapped to Navamsha chart.
    const d64Degree = (lagnaSidereal + 210) % 360; // Exact same longitude point
    const d64RashiId = Math.floor(d64Degree / 30) + 1;
    const d64LocalDegree = d64Degree % 30;
    const d64NavamshaRashi = getNavamshaRashiId(d64RashiId, d64LocalDegree);
    const d64Lord = RASHIS[d64NavamshaRashi - 1].lord;
    
    // Badhaka Lord
    // Moveable (1,4,7,10) -> 11th Lord
    // Fixed (2,5,8,11) -> 9th Lord
    // Dual (3,6,9,12) -> 7th Lord
    // Get Lagna Rashi
    const lagnaRashiId = Math.floor(lagnaSidereal / 30) + 1;
    let badhakaRashiId;
    
    // Remainder 1 (Moveable)
    if (lagnaRashiId % 3 === 1) {
        badhakaRashiId = (lagnaRashiId + 11 - 1) % 12 + 1;
    } 
    // Remainder 2 (Fixed)
    else if (lagnaRashiId % 3 === 2) {
        badhakaRashiId = (lagnaRashiId + 9 - 1) % 12 + 1;
    }
    // Remainder 0 (Dual)
    else {
        badhakaRashiId = (lagnaRashiId + 7 - 1) % 12 + 1;
    }
    const badhakaLord = RASHIS[badhakaRashiId - 1].lord;

    return {
        lord22Derkana: d22Lord,
        rashi22Derkana: RASHIS[d22DrekkanaRashi - 1].name,
        lord64Navamsha: d64Lord,
        rashi64Navamsha: RASHIS[d64NavamshaRashi - 1].name,
        badhakaLord: badhakaLord,
        badhakaRashi: RASHIS[badhakaRashiId - 1].name
    };
}

/**
 * Build Full Shadvarga Report
 */
function buildShadvarga(date, lat, lng) {
    const lagna = getLagna(date, lat, lng);
    const planets = getAllPlanetPositions(date, lat, lng);
    const specialLords = calculateSpecialLords(lagna.sidereal);
    
    // Helper to get all varga positions for a planet/point
    const getVargas = (sidereal) => {
        const rashiId = Math.floor(sidereal / 30) + 1;
        const degree = sidereal % 30;
        return {
            D1: rashiId,
            D2: getHoraRashiId(rashiId, degree),
            D3: getDrekkanaRashiId(rashiId, degree),
            D9: getNavamshaRashiId(rashiId, degree),
            D12: getDwadasamsaRashiId(rashiId, degree),
            D30: getTrimsamsaRashiId(rashiId, degree)
        };
    };

    const vargaData = {};
    
    // Process Planets
    Object.keys(planets).forEach(key => {
        vargaData[key] = getVargas(planets[key].sidereal);
    });
    
    // Process Lagna
    vargaData['Lagna'] = getVargas(lagna.sidereal);

    return {
        vargaPositions: vargaData,
        specialLords: specialLords
    };
}

// =====================================================================
// VEDIC PLANETARY ASPECTS (GRAHA DRISHTI)
// =====================================================================
// In Vedic astrology, planets aspect (cast drishti on) other houses.
// ALL planets have full 7th house aspect (opposition).
// Special aspects (per Bṛhat Parāśara Horāśāstra):
//   Mars:    4th and 8th house aspects (in addition to 7th)
//   Jupiter: 5th and 9th house aspects (in addition to 7th)
//   Saturn:  3rd and 10th house aspects (in addition to 7th)
//   Rahu/Ketu: 5th, 7th, and 9th aspects (like Jupiter, per some traditions)
// =====================================================================

/**
 * Vedic aspect strengths — full aspect = 1.0, partial aspects per Parashari rules
 * Standard: all planets get 7th aspect at full strength
 * Special: Mars(4,8), Jupiter(5,9), Saturn(3,10) at full strength
 * Some traditions give 3/4 and 1/2 aspects but Sri Lankan tradition typically uses full aspects only
 */
const SPECIAL_ASPECTS = {
  // Offsets represent the Nth house from the planet (inclusive, 1-based Vedic convention)
  // Formula to compute target: ((houseNum - 1 + offset - 1) % 12) + 1
  'Mars':    [4, 7, 8],
  'Jupiter': [5, 7, 9],
  'Saturn':  [3, 7, 10],
  'Rahu':    [5, 7, 9],
  'Ketu':    [5, 7, 9],
  'Sun':     [7],
  'Moon':    [7],
  'Mercury': [7],
  'Venus':   [7],
};

/**
 * Calculate all planetary aspects (Drishtis) for a birth chart
 * 
 * Returns for each planet:
 *   - aspectsOn: array of house numbers this planet aspects
 *   - aspectedBy: array of planets aspecting this planet's house
 *   - aspectDetails: detailed info including aspect type (normal/special)
 * 
 * @param {Array} houses - 12-house chart from buildHouseChart()
 * @returns {Object} aspect data for each planet and each house
 */
function calculateDrishtis(houses) {
  // Build planet-to-house mapping
  const planetHouseMap = {};  // { planetName: houseNumber }
  const housePlanetMap = {};  // { houseNumber: [planetNames] }

  for (const h of houses) {
    housePlanetMap[h.houseNumber] = h.planets.map(p => p.name).filter(n => n !== 'Lagna');
    for (const p of h.planets) {
      if (p.name !== 'Lagna') {
        planetHouseMap[p.name] = h.houseNumber;
      }
    }
  }

  // Calculate aspects cast by each planet
  const planetAspects = {};    // { planetName: { aspectsOn: [houseNums], type: {} } }
  const houseAspectedBy = {};  // { houseNum: [{ planet, type }] }

  for (let i = 1; i <= 12; i++) houseAspectedBy[i] = [];

  for (const [planet, houseNum] of Object.entries(planetHouseMap)) {
    const aspectHouses = SPECIAL_ASPECTS[planet] || [7];
    const details = [];

    for (const offset of aspectHouses) {
      // Vedic convention: offset is 1-based (Nth house from planet, inclusive)
      // So we subtract 1 to get the 0-based "houses ahead" count
      const targetHouse = ((houseNum - 1 + offset - 1) % 12) + 1;
      const isSpecial = offset !== 7;
      details.push({
        house: targetHouse,
        offset,
        type: isSpecial ? 'special' : 'normal',
        rashi: houses[targetHouse - 1].rashiEnglish,
      });
      houseAspectedBy[targetHouse].push({
        planet,
        fromHouse: houseNum,
        offset,
        type: isSpecial ? 'special' : 'normal',
      });
    }

    planetAspects[planet] = {
      fromHouse: houseNum,
      aspectsOn: details.map(d => d.house),
      details,
    };
  }

  // Build aspectedBy for each planet
  const planetAspectedBy = {};
  for (const [planet, houseNum] of Object.entries(planetHouseMap)) {
    planetAspectedBy[planet] = houseAspectedBy[houseNum]
      .filter(a => a.planet !== planet)  // exclude self
      .map(a => ({
        planet: a.planet,
        fromHouse: a.fromHouse,
        type: a.type,
      }));
  }

  return {
    planetAspects,       // What each planet aspects
    planetAspectedBy,    // What aspects each planet
    houseAspectedBy,     // What aspects each house
  };
}

// =====================================================================
// PUSHKARA NAVAMSHA & PUSHKARA BHAGA
// =====================================================================
// Pushkara Navamshas are specific navamsha divisions considered highly
// auspicious. They occur at specific degrees within each sign.
// Pushkara Bhagas are specific exact degrees of extreme auspiciousness.
// Both are important in Muhurtha (electional astrology) and natal charts.
// =====================================================================

/**
 * Pushkara Navamsha degrees (the navamsha division ranges)
 * Each sign has 2 Pushkara Navamshas. These are the degree ranges within a sign
 * where a planet gains special auspicious power.
 * Based on Bṛhat Parāśara Horāśāstra and traditional usage.
 */
const PUSHKARA_NAVAMSHA_RANGES = {
  // Fire signs: Navamshas ruled by Venus/Moon signs (Taurus=2, Cancer=4, Libra=7, Pisces=12)
  1:  [{ start: 3.333, end: 6.667, navamsha: 'Vrishabha' }, { start: 23.333, end: 26.667, navamsha: 'Meena' }],   // Mesha
  5:  [{ start: 3.333, end: 6.667, navamsha: 'Vrishabha' }, { start: 23.333, end: 26.667, navamsha: 'Meena' }],   // Simha
  9:  [{ start: 3.333, end: 6.667, navamsha: 'Vrishabha' }, { start: 23.333, end: 26.667, navamsha: 'Meena' }],   // Dhanu
  // Earth signs: 
  2:  [{ start: 10.000, end: 13.333, navamsha: 'Kataka' }, { start: 20.000, end: 23.333, navamsha: 'Tula' }],     // Vrishabha
  6:  [{ start: 10.000, end: 13.333, navamsha: 'Kataka' }, { start: 20.000, end: 23.333, navamsha: 'Tula' }],     // Kanya
  10: [{ start: 10.000, end: 13.333, navamsha: 'Kataka' }, { start: 20.000, end: 23.333, navamsha: 'Tula' }],     // Makara
  // Air signs:
  3:  [{ start: 6.667, end: 10.000, navamsha: 'Dhanu' }, { start: 16.667, end: 20.000, navamsha: 'Meena' }],      // Mithuna
  7:  [{ start: 6.667, end: 10.000, navamsha: 'Dhanu' }, { start: 16.667, end: 20.000, navamsha: 'Meena' }],      // Tula
  11: [{ start: 6.667, end: 10.000, navamsha: 'Dhanu' }, { start: 16.667, end: 20.000, navamsha: 'Meena' }],      // Kumbha
  // Water signs:
  4:  [{ start: 0.000, end: 3.333, navamsha: 'Kataka' }, { start: 13.333, end: 16.667, navamsha: 'Tula' }],       // Kataka
  8:  [{ start: 0.000, end: 3.333, navamsha: 'Kataka' }, { start: 13.333, end: 16.667, navamsha: 'Tula' }],       // Vrischika
  12: [{ start: 0.000, end: 3.333, navamsha: 'Kataka' }, { start: 13.333, end: 16.667, navamsha: 'Tula' }],       // Meena
};

/**
 * Pushkara Bhaga — exact degrees of extreme auspiciousness (one per sign)
 * A planet at its Pushkara Bhaga degree gets exceptional results.
 */
const PUSHKARA_BHAGA = {
  1: 21,    // Mesha 21°
  2: 14,    // Vrishabha 14°
  3: 18,    // Mithuna 18°
  4: 8,     // Kataka 8°
  5: 19,    // Simha 19°
  6: 9,     // Kanya 9°
  7: 24,    // Tula 24°
  8: 11,    // Vrischika 11°
  9: 23,    // Dhanu 23°
  10: 14,   // Makara 14°
  11: 19,   // Kumbha 19°
  12: 9,    // Meena 9°
};

/**
 * Check if a planet is in Pushkara Navamsha
 * @param {number} rashiId - 1-12
 * @param {number} degreeInSign - 0-30
 * @returns {Object|null} Pushkara info or null
 */
function checkPushkaraNavamsha(rashiId, degreeInSign) {
  const ranges = PUSHKARA_NAVAMSHA_RANGES[rashiId];
  if (!ranges) return null;

  for (const range of ranges) {
    if (degreeInSign >= range.start && degreeInSign < range.end) {
      return {
        isPushkaraNavamsha: true,
        navamshaRashi: range.navamsha,
        description: `In Pushkara Navamsha (${range.navamsha}) — highly auspicious placement`,
        sinhala: `පුෂ්කර නවාංශයේ (${range.navamsha}) — ඉතා ශුභ තැන්පත්වීම`,
      };
    }
  }
  return null;
}

/**
 * Check if a planet is at or near its Pushkara Bhaga degree
 * @param {number} rashiId - 1-12
 * @param {number} degreeInSign - 0-30
 * @param {number} orb - Tolerance in degrees (default 1°)
 * @returns {Object|null} Pushkara Bhaga info or null
 */
function checkPushkaraBhaga(rashiId, degreeInSign, orb = 1) {
  const pbDegree = PUSHKARA_BHAGA[rashiId];
  if (pbDegree === undefined) return null;

  if (Math.abs(degreeInSign - pbDegree) <= orb) {
    return {
      isPushkaraBhaga: true,
      exactDegree: pbDegree,
      deviation: Math.abs(degreeInSign - pbDegree).toFixed(2),
      description: `Near Pushkara Bhaga (${pbDegree}°) — exceptionally auspicious, grants powerful results`,
      sinhala: `පුෂ්කර භාගයට (${pbDegree}°) ආසන්නයි — සුවිශේෂී ශුභ ඵල`,
    };
  }
  return null;
}

/**
 * Analyze all planets for Pushkara positions
 * @param {Object} planets - from getAllPlanetPositions()
 * @returns {Object} pushkara data for each planet
 */
function analyzePushkara(planets) {
  const results = {};

  for (const [key, p] of Object.entries(planets)) {
    const navamshaCheck = checkPushkaraNavamsha(p.rashiId, p.degreeInSign);
    const bhagaCheck = checkPushkaraBhaga(p.rashiId, p.degreeInSign);

    results[key] = {
      name: p.name,
      sinhala: p.sinhala,
      rashi: p.rashiEnglish,
      degree: p.degreeInSign,
      pushkaraNavamsha: navamshaCheck,
      pushkaraBhaga: bhagaCheck,
      hasPushkara: !!(navamshaCheck || bhagaCheck),
    };
  }

  return results;
}


// =====================================================================
// ASHTAKAVARGA — 8-fold Strength System (Sarvashtakavarga)
// =====================================================================
// Each planet (and the Lagna) contributes benefic points (bindus) to
// each of the 12 signs. When a planet transits a sign with high bindus,
// it gives good results; low bindus = poor results.
// 
// The system uses the positions of 7 planets (Sun through Saturn)
// plus the Lagna. Rahu & Ketu are excluded.
//
// Reference: Bṛhat Parāśara Horāśāstra, Chapter 66-72
// =====================================================================

/**
 * Benefic contribution tables per BPHS
 * For each planet, these are the house offsets (from contributing planet/lagna)
 * where that planet gives a bindu (beneficial point).
 * 
 * Format: ASHTAKA_BINDUS[receivingPlanet][contributingPlanet] = [offsets where bindu is given]
 * Offsets are 1-based house counts from the contributor's position.
 */
const ASHTAKA_BINDUS = {
  'Sun': {
    'Sun':     [1, 2, 4, 7, 8, 9, 10, 11],
    'Moon':    [3, 6, 10, 11],
    'Mars':    [1, 2, 4, 7, 8, 9, 10, 11],
    'Mercury': [3, 5, 6, 9, 10, 11, 12],
    'Jupiter': [5, 6, 9, 11],
    'Venus':   [6, 7, 12],
    'Saturn':  [1, 2, 4, 7, 8, 9, 10, 11],
    'Lagna':   [3, 4, 6, 10, 11, 12],
  },
  'Moon': {
    'Sun':     [3, 6, 7, 8, 10, 11],
    'Moon':    [1, 3, 6, 7, 10, 11],
    'Mars':    [2, 3, 5, 6, 9, 10, 11],
    'Mercury': [1, 3, 4, 5, 7, 8, 10, 11],
    'Jupiter': [1, 4, 7, 8, 10, 11, 12],
    'Venus':   [3, 4, 5, 7, 9, 10, 11],
    'Saturn':  [3, 5, 6, 11],
    'Lagna':   [3, 6, 10, 11],
  },
  'Mars': {
    'Sun':     [3, 5, 6, 10, 11],
    'Moon':    [3, 6, 11],
    'Mars':    [1, 2, 4, 7, 8, 10, 11],
    'Mercury': [3, 5, 6, 11],
    'Jupiter': [6, 10, 11, 12],
    'Venus':   [6, 8, 11, 12],
    'Saturn':  [1, 4, 7, 8, 9, 10, 11],
    'Lagna':   [1, 3, 6, 10, 11],
  },
  'Mercury': {
    'Sun':     [5, 6, 9, 11, 12],
    'Moon':    [2, 4, 6, 8, 10, 11],
    'Mars':    [1, 2, 4, 7, 8, 9, 10, 11],
    'Mercury': [1, 3, 5, 6, 9, 10, 11, 12],
    'Jupiter': [6, 8, 11, 12],
    'Venus':   [1, 2, 3, 4, 5, 8, 9, 11],
    'Saturn':  [1, 2, 4, 7, 8, 9, 10, 11],
    'Lagna':   [1, 2, 4, 6, 8, 10, 11],
  },
  'Jupiter': {
    'Sun':     [1, 2, 3, 4, 7, 8, 9, 10, 11],
    'Moon':    [2, 5, 7, 9, 11],
    'Mars':    [1, 2, 4, 7, 8, 10, 11],
    'Mercury': [1, 2, 4, 5, 6, 9, 10, 11],
    'Jupiter': [1, 2, 3, 4, 7, 8, 10, 11],
    'Venus':   [2, 5, 6, 9, 10, 11],
    'Saturn':  [3, 5, 6, 12],
    'Lagna':   [1, 2, 4, 5, 6, 7, 9, 10, 11],
  },
  'Venus': {
    'Sun':     [8, 11, 12],
    'Moon':    [1, 2, 3, 4, 5, 8, 9, 11, 12],
    'Mars':    [3, 5, 6, 9, 11, 12],
    'Mercury': [3, 5, 6, 9, 11],
    'Jupiter': [5, 8, 9, 10, 11],
    'Venus':   [1, 2, 3, 4, 5, 8, 9, 10, 11],
    'Saturn':  [3, 4, 5, 8, 9, 10, 11],
    'Lagna':   [1, 2, 3, 4, 5, 8, 9, 11],
  },
  'Saturn': {
    'Sun':     [1, 2, 4, 7, 8, 9, 10, 11],
    'Moon':    [3, 6, 11],
    'Mars':    [3, 5, 6, 10, 11, 12],
    'Mercury': [6, 8, 9, 10, 11, 12],
    'Jupiter': [5, 6, 11, 12],
    'Venus':   [6, 11, 12],
    'Saturn':  [3, 5, 6, 11],
    'Lagna':   [1, 3, 4, 6, 10, 11],
  },
};

/**
 * Calculate Ashtakavarga for the chart
 * Returns Prastarashtakavarga (individual planet tables) and Sarvashtakavarga (combined)
 * 
 * @param {Date} date - Birth date/time
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Object} ashtakavarga data
 */
function calculateAshtakavarga(date, lat, lng) {
  const planets = getAllPlanetPositions(date, lat, lng);
  const lagna = getLagna(date, lat, lng);

  // Get rashi IDs for each contributing body (1-12)
  const positions = {};
  const planetKeys = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

  for (const key of planetKeys) {
    const pKey = key.toLowerCase() === 'sun' ? 'sun' :
                 key.toLowerCase() === 'moon' ? 'moon' :
                 key.toLowerCase() === 'mars' ? 'mars' :
                 key.toLowerCase() === 'mercury' ? 'mercury' :
                 key.toLowerCase() === 'jupiter' ? 'jupiter' :
                 key.toLowerCase() === 'venus' ? 'venus' : 'saturn';
    positions[key] = planets[pKey].rashiId;
  }
  positions['Lagna'] = lagna.rashi.id;

  // Calculate Prastarashtakavarga for each planet
  const prastara = {};  // { planet: [bindu count for each rashi 1-12] }
  const sarva = new Array(12).fill(0);  // Sarvashtakavarga totals per sign

  for (const receivingPlanet of planetKeys) {
    const bindus = new Array(12).fill(0);  // One per rashi

    const table = ASHTAKA_BINDUS[receivingPlanet];
    if (!table) continue;

    for (const [contributor, offsets] of Object.entries(table)) {
      const contributorRashi = positions[contributor];
      if (!contributorRashi) continue;

      for (const offset of offsets) {
        // From contributor's rashi, count offset houses forward
        const targetRashi = ((contributorRashi - 1 + offset - 1) % 12);  // 0-indexed
        bindus[targetRashi] += 1;
      }
    }

    prastara[receivingPlanet] = bindus;

    // Add to Sarvashtakavarga
    for (let i = 0; i < 12; i++) {
      sarva[i] += bindus[i];
    }
  }

  // Build sign-labeled results
  const sarvashtakavarga = {};
  const signStrengths = {};
  for (let i = 0; i < 12; i++) {
    const rashi = RASHIS[i];
    sarvashtakavarga[rashi.name] = sarva[i];
    
    // Interpret strength: Total 337 bindus / 12 signs ≈ 28 average
    let strength = 'Average';
    if (sarva[i] >= 30) strength = 'Strong (ශුභ)';
    else if (sarva[i] >= 25) strength = 'Average';
    else strength = 'Weak (අශුභ)';

    signStrengths[rashi.name] = {
      rashiId: rashi.id,
      english: rashi.english,
      sinhala: rashi.sinhala,
      bindus: sarva[i],
      strength,
    };
  }

  // Total bindus for verification (should be 337)
  const totalBindus = sarva.reduce((a, b) => a + b, 0);

  return {
    prastarashtakavarga: prastara,     // Individual planet bindu tables
    sarvashtakavarga: sarvashtakavarga, // Combined bindus per sign
    signStrengths,                      // With interpretation
    totalBindus,
    summary: {
      strongestSign: Object.entries(signStrengths).sort((a, b) => b[1].bindus - a[1].bindus)[0],
      weakestSign: Object.entries(signStrengths).sort((a, b) => a[1].bindus - b[1].bindus)[0],
      description: 'Ashtakavarga shows the strength of each sign. Transiting planets give good results in signs with 28+ bindus.',
      sinhala: 'අෂ්ටකවර්ගය එක් එක් රාශියේ ශක්තිය පෙන්වයි. ගෝචර ග්‍රහයන් බින්දු 28+ ඇති රාශිවල ශුභ ඵල දෙයි.',
    },
  };
}

// =====================================================================
// BHAVA CHALIT CHART — Unequal House Cusps
// =====================================================================
// The Bhava Chalit chart divides the sky into 12 unequal houses based on
// the actual degree of the Ascendant (Lagna) as the midpoint of the 1st house.
// This differs from the whole-sign system where the entire sign = 1 house.
// 
// In Sri Lankan practice, Bhava Chalit is used alongside the Rashi chart:
// - Rashi chart: for general readings, yogas, dasha analysis
// - Bhava Chalit: for transit analysis and precise house signification
//
// Method: Lagna degree is the midpoint of the 1st house.
// Each house spans 30° but shifted so that Lagna is at the center of House 1.
// =====================================================================

/**
 * Build Bhava Chalit Chart
 * 
 * Each house cusp is calculated as:
 *   House N midpoint = Lagna + (N-1) * 30°
 *   House N start = midpoint - 15°
 *   House N end = midpoint + 15°
 * 
 * Planets may shift houses compared to the whole-sign chart.
 * 
 * @param {Date} date - Birth date
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Object} Bhava Chalit data
 */
function buildBhavaChalit(date, lat, lng) {
  const lagna = getLagna(date, lat, lng);
  const planets = getAllPlanetPositions(date, lat, lng);
  const lagnaSidereal = lagna.sidereal;

  // Calculate house cusps (equal house, lagna-centered)
  const houses = [];
  for (let i = 0; i < 12; i++) {
    const midpoint = (lagnaSidereal + i * 30) % 360;
    let startDeg = (midpoint - 15 + 360) % 360;
    let endDeg = (midpoint + 15) % 360;

    houses.push({
      houseNumber: i + 1,
      midpoint: midpoint,
      start: startDeg,
      end: endDeg,
      rashiAtMid: RASHIS[Math.floor(midpoint / 30)],
      planets: [],
    });
  }

  // Place planets in Bhava houses
  const planetShifts = [];  // Track planets that shifted house
  
  for (const [key, p] of Object.entries(planets)) {
    const planetDeg = p.sidereal;
    let placedHouse = null;

    for (const h of houses) {
      // Handle wrap-around (e.g., start=350, end=10)
      let inHouse = false;
      if (h.start < h.end) {
        inHouse = planetDeg >= h.start && planetDeg < h.end;
      } else {
        inHouse = planetDeg >= h.start || planetDeg < h.end;
      }

      if (inHouse) {
        h.planets.push({
          key,
          name: p.name,
          sinhala: p.sinhala,
          degree: p.degreeInSign,
          siderealDegree: p.sidereal,
        });
        placedHouse = h.houseNumber;
        break;
      }
    }

    // Check if planet shifted from whole-sign house
    const wholeSignHouse = ((p.rashiId - lagna.rashi.id + 12) % 12) + 1;
    if (placedHouse && placedHouse !== wholeSignHouse) {
      planetShifts.push({
        planet: p.name,
        sinhala: p.sinhala,
        wholeSignHouse,
        chalitHouse: placedHouse,
        description: `${p.name} shifts from House ${wholeSignHouse} (Rashi) to House ${placedHouse} (Bhava Chalit)`,
        sinhala_desc: `${p.sinhala} භාව ${wholeSignHouse} සිට භාව ${placedHouse} වෙත මාරු වේ`,
      });
    }
  }

  return {
    houses,
    planetShifts,
    lagnaExactDegree: lagnaSidereal,
    note: 'Bhava Chalit uses Lagna degree as House 1 midpoint. Compare with Rashi chart for complete analysis.',
    sinhala_note: 'භාව චලිත සටහන ලග්න අංශය භාව 1 මධ්‍ය ලක්ෂ්‍යය ලෙස භාවිතා කරයි. සම්පූර්ණ විශ්ලේෂණය සඳහා රාශි සටහන සමඟ සසඳන්න.',
  };
}

/**
 * Get Nakshatra from sidereal Moon longitude
 */
function getNakshatra(moonSidereal) {
  const nakshatraIndex = Math.floor(moonSidereal / (360 / 27));
  const pada = Math.floor((moonSidereal % (360 / 27)) / (360 / 108)) + 1;
  return {
    ...NAKSHATRAS[nakshatraIndex],
    pada,
    degree: moonSidereal % (360 / 27),
  };
}

/**
 * Get Rashi (zodiac sign) from sidereal longitude
 */
function getRashi(siderealLong) {
  const rashiIndex = Math.floor(siderealLong / 30);
  return {
    ...RASHIS[rashiIndex],
    degree: siderealLong % 30,
  };
}

/**
 * Calculate Tithi (lunar day)
 * There are 30 Tithis in a lunar month
 */
function getTithi(date) {
  const moonLong = toSidereal(getMoonLongitude(date), date);
  const sunLong = toSidereal(getSunLongitude(date), date);

  let diff = moonLong - sunLong;
  if (diff < 0) diff += 360;

  const tithiNum = Math.floor(diff / 12) + 1;

  const TITHI_NAMES = [
    'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
    'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
    'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima/Amavasya',
  ];

  const paksha = tithiNum <= 15 ? 'Shukla' : 'Krishna';
  const tithiInPaksha = tithiNum <= 15 ? tithiNum : tithiNum - 15;

  return {
    number: tithiNum,
    name: TITHI_NAMES[(tithiInPaksha - 1) % 15],
    paksha,
    pakshaName: paksha === 'Shukla' ? 'Waxing (පුර)' : 'Waning (අව)',
  };
}

/**
 * Calculate Yoga (one of 27 yogas)
 */
function getYoga(date) {
  const moonLong = toSidereal(getMoonLongitude(date), date);
  const sunLong = toSidereal(getSunLongitude(date), date);

  let sum = (moonLong + sunLong) % 360;
  const yogaIndex = Math.floor(sum / (360 / 27));

  const YOGA_NAMES = [
    'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana',
    'Atiganda', 'Sukarma', 'Dhriti', 'Shula', 'Ganda',
    'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
    'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva',
    'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma',
    'Indra', 'Vaidhriti',
  ];

  return {
    number: yogaIndex + 1,
    name: YOGA_NAMES[yogaIndex],
  };
}

/**
 * Calculate Karana (half of a Tithi)
 */
function getKarana(date) {
  const tithi = getTithi(date);
  const KARANA_NAMES = [
    'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti',
    'Shakuni', 'Chatushpada', 'Naga', 'Kimstughna',
  ];

  const karanaNum = ((tithi.number - 1) * 2) % 7;
  return {
    number: karanaNum + 1,
    name: KARANA_NAMES[karanaNum],
  };
}

/**
 * Calculate Lagna (Ascendant) - the rising sign at the eastern horizon
 * This is what most Sri Lankans call their "horoscope sign" (ලග්නය)
 *
 * PRIMARY: Swiss Ephemeris calculateHouses() — uses apparent sidereal time (GAST)
 *          with full nutation, providing sub-arcsecond Ascendant accuracy.
 * FALLBACK: Manual GMST-based calculation (Meeus).
 *
 * @param {Date} date - Date/time in UTC
 * @param {number} lat - Latitude in degrees
 * @param {number} lng - Longitude in degrees
 * @returns {object} Lagna rashi and degree
 */
function getLagna(date, lat = 6.9271, lng = 79.8612) {
  try {
    const jd = swe.dateToJulianDay(date);
    const houses = swe.calculateHouses(jd, lat, lng, SweHouseSystem.WholeSign);
    const tropAsc = houses.ascendant;
    const siderealAsc = toSidereal(tropAsc, date);
    return {
      tropical: tropAsc,
      sidereal: siderealAsc,
      rashi: getRashi(siderealAsc),
      mc: houses.mc,
      armc: houses.armc,
      vertex: houses.vertex,
      cusps: houses.cusps,
    };
  } catch (_) {
    // Fallback: manual calculation
    const jd = dateToJD(date);
    const T = (jd - 2451545.0) / 36525;
    let GMST = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
      + 0.000387933 * T * T - T * T * T / 38710000;
    GMST = ((GMST % 360) + 360) % 360;
    let LST = GMST + lng;
    LST = ((LST % 360) + 360) % 360;
    const eps = 23.4392911 - 0.0130042 * T - 1.64e-7 * T * T + 5.036e-7 * T * T * T;
    const epsRad = eps * Math.PI / 180;
    const latRad = lat * Math.PI / 180;
    const ramcRad = LST * Math.PI / 180;
    const y = Math.cos(ramcRad);
    const x = -(Math.sin(ramcRad) * Math.cos(epsRad) + Math.tan(latRad) * Math.sin(epsRad));
    let ascendant = Math.atan2(y, x) * 180 / Math.PI;
    ascendant = ((ascendant % 360) + 360) % 360;
    const siderealAsc = toSidereal(ascendant, date);
    return {
      tropical: ascendant,
      sidereal: siderealAsc,
      rashi: getRashi(siderealAsc),
    };
  }
}

/**
 * Get complete Panchanga for a date and location
 */
function getPanchanga(date, lat = 6.9271, lng = 79.8612) {
  const moonTropical = getMoonLongitude(date);
  const sunTropical = getSunLongitude(date);
  const moonSidereal = toSidereal(moonTropical, date);
  const sunSidereal = toSidereal(sunTropical, date);

  return {
    date: date.toISOString(),
    location: { lat, lng },
    tithi: getTithi(date),
    nakshatra: getNakshatra(moonSidereal),
    yoga: getYoga(date),
    karana: getKarana(date),
    vaara: WEEKDAYS[date.getDay()],
    moonSign: getRashi(moonSidereal),
    sunSign: getRashi(sunSidereal),
    lagna: getLagna(date, lat, lng),
    ayanamsha: getAyanamsha(date),
  };
}

/**
 * Calculate daily auspicious times (Shubha Muhurtha)
 * Based on the Panchanga and planetary hours
 */
function getDailyNakath(date, lat = 6.9271, lng = 79.8612) {
  const panchanga = getPanchanga(date, lat, lng);
  const rahuKalaya = calculateRahuKalaya(date, lat, lng);
  const { sunrise, sunset } = rahuKalaya;

  const daylightMs = sunset.getTime() - sunrise.getTime();
  const segmentMs = daylightMs / 8;

  // Generate auspicious periods (avoiding Rahu Kalaya)
  const auspiciousPeriods = [];

  // Brahma Muhurtha (approximately 1.5 hours before sunrise)
  const brahmaMuhurthaStart = new Date(sunrise.getTime() - 96 * 60000);
  const brahmaMuhurthaEnd = new Date(sunrise.getTime() - 48 * 60000);
  auspiciousPeriods.push({
    name: 'Brahma Muhurtha',
    sinhala: 'බ්‍රහ්ම මුහුර්තය',
    tamil: 'பிரம்ம முகூர்த்தம்',
    start: brahmaMuhurthaStart,
    end: brahmaMuhurthaEnd,
    type: 'spiritual',
    description: 'Best time for meditation, prayer, and spiritual activities',
  });

  // Abhijit Muhurtha (midday auspicious period - approximately 24 mins around local noon)
  const localNoon = new Date(sunrise.getTime() + daylightMs / 2);
  const abhijitStart = new Date(localNoon.getTime() - 24 * 60000);
  const abhijitEnd = new Date(localNoon.getTime() + 24 * 60000);

  // Only add if it doesn't overlap with Rahu Kalaya
  if (abhijitEnd.getTime() < rahuKalaya.start.getTime() || abhijitStart.getTime() > rahuKalaya.end.getTime()) {
    auspiciousPeriods.push({
      name: 'Abhijit Muhurtha',
      sinhala: 'අභිජිත් මුහුර්තය',
      tamil: 'அபிஜித் முகூர்த்தம்',
      start: abhijitStart,
      end: abhijitEnd,
      type: 'general',
      description: 'Universally auspicious - good for all important activities',
    });
  }

  // Generate good times based on planetary hours (avoiding Rahu Kala)
  for (let i = 0; i < 8; i++) {
    const segStart = new Date(sunrise.getTime() + i * segmentMs);
    const segEnd = new Date(segStart.getTime() + segmentMs);

    // Skip if it overlaps with Rahu Kalaya
    if (segStart.getTime() >= rahuKalaya.start.getTime() && segStart.getTime() < rahuKalaya.end.getTime()) {
      continue;
    }

    // Determine quality based on planetary ruler of the hour
    const planetaryRulerIndex = (date.getDay() * 24 + Math.floor((i * 3) / 2)) % 7;
    const rulers = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'];
    const ruler = rulers[planetaryRulerIndex % 7];

    const beneficPlanets = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
    if (beneficPlanets.includes(ruler)) {
      auspiciousPeriods.push({
        name: `${ruler} Hour`,
        sinhala: `${PLANETS.find(p => p.english === ruler)?.sinhala || ruler} හෝරාව`,
        tamil: `${PLANETS.find(p => p.english === ruler)?.tamil || ruler} ஹோரை`,
        start: segStart,
        end: segEnd,
        type: 'hora',
        ruler,
        description: `Governed by ${ruler} - favorable for related activities`,
      });
    }
  }

  return {
    date: date.toISOString(),
    panchanga,
    rahuKalaya: {
      start: rahuKalaya.start,
      end: rahuKalaya.end,
      warning: 'Avoid starting new ventures during this period',
      warningsSinhala: 'මෙම කාලය තුළ නව කටයුතු ආරම්භ කිරීමෙන් වළකින්න',
    },
    sunrise: sunrise,
    sunset: sunset,
    auspiciousPeriods,
  };
}

// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// MARRIAGE DENIAL / AFFLICTION DETECTION ENGINE
// ═══════════════════════════════════════════════════════════════════
// Checks 20+ classical Vedic indicators that BLOCK, DENY, or DELAY marriage.
// Returns a denial score (0–100), severity level, and detailed affliction list.
// This is the CRITICAL missing piece — without it, the engine only predicts
// marriage timing but never warns when marriage is unlikely.
// ═══════════════════════════════════════════════════════════════════

/**
 * Assess marriage denial/blocking indicators from the natal chart.
 * @param {Date} date - Birth date (UTC)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Object} { denialScore, severity, likelihood, afflictions[], supportive[], summary }
 */
function assessMarriageDenial(date, lat, lng) {
  const houseChart = buildHouseChart(date, lat, lng);
  const houses = houseChart.houses;
  const planets = houseChart.planets;
  const navamsha = buildNavamshaChart(date, lat, lng);
  const drishtis = calculateDrishtis ? calculateDrishtis(houses) : null;

  // ── Helpers ──
  const getPlanetHouse = (name) => {
    const h = houses.find(h => h.planets.some(p => p.name === name));
    return h ? h.houseNumber : 0;
  };
  const getHouseLord = (houseNum) => {
    const h = houses[houseNum - 1];
    if (!h) return 'Unknown';
    return h.rashiLord || RASHIS[(h.rashiId || 1) - 1]?.lord || 'Unknown';
  };
  const isPlanetRetrograde = (name) => {
    const key = name.toLowerCase();
    return planets[key]?.isRetrograde === true;
  };
  const getPlanetsInHouse = (houseNum) => {
    return (houses[houseNum - 1]?.planets || []).map(p => p.name);
  };
  const doesPlanetAspectHouse = (planetName, targetHouse) => {
    const pH = getPlanetHouse(planetName);
    if (!pH) return false;
    const aspects = SPECIAL_ASPECTS[planetName] || [7];
    return aspects.some(asp => ((pH - 1 + asp - 1) % 12) + 1 === targetHouse);
  };
  const BENEFICS = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
  const MALEFICS = ['Saturn', 'Mars', 'Rahu', 'Ketu', 'Sun'];

  const lord7 = getHouseLord(7);
  const lord7House = getPlanetHouse(lord7);
  const lord5 = getHouseLord(5);
  const lord1 = getHouseLord(1);
  const venusHouse = getPlanetHouse('Venus');
  const saturnHouse = getPlanetHouse('Saturn');
  const marsHouse = getPlanetHouse('Mars');
  const moonHouse = getPlanetHouse('Moon');
  const sunHouse = getPlanetHouse('Sun');
  const rahuHouse = getPlanetHouse('Rahu');
  const ketuHouse = getPlanetHouse('Ketu');
  const jupiterHouse = getPlanetHouse('Jupiter');
  const planetsIn7 = getPlanetsInHouse(7);
  const planetsIn5 = getPlanetsInHouse(5);
  const planetsIn1 = getPlanetsInHouse(1);

  let denialScore = 0;
  const afflictions = [];
  const supportive = [];

  // ═══════════════════════════════════════════════════════════
  // DENIAL INDICATORS (each adds to denialScore)
  // ═══════════════════════════════════════════════════════════

  // ── 1. Saturn in 5th house (blocks romance/love affairs) ──
  if (saturnHouse === 5) {
    const pts = isPlanetRetrograde('Saturn') ? 14 : 8;
    denialScore += pts;
    afflictions.push({
      factor: 'Saturn in 5th house' + (isPlanetRetrograde('Saturn') ? ' (RETROGRADE)' : ''),
      points: pts,
      meaning: 'Saturn restricts romance and love affairs. Delays or denies love-based relationships.' +
        (isPlanetRetrograde('Saturn') ? ' Retrograde amplifies the blockage — past-life karma preventing romantic connections.' : ''),
    });
  }

  // ── 2. Saturn in 7th house (delays/denies marriage directly) ──
  if (saturnHouse === 7) {
    const pts = isPlanetRetrograde('Saturn') ? 16 : 10;
    denialScore += pts;
    afflictions.push({
      factor: 'Saturn in 7th house' + (isPlanetRetrograde('Saturn') ? ' (RETROGRADE)' : ''),
      points: pts,
      meaning: 'Saturn directly in marriage house causes significant delays. Marriage after 30+ is common, denial possible if other factors concur.',
    });
  }

  // ── 3. Saturn aspecting 7th house from any position ──
  if (saturnHouse !== 7 && doesPlanetAspectHouse('Saturn', 7)) {
    const pts = isPlanetRetrograde('Saturn') ? 10 : 6;
    denialScore += pts;
    afflictions.push({
      factor: 'Saturn aspects 7th house from H' + saturnHouse + (isPlanetRetrograde('Saturn') ? ' (RETROGRADE)' : ''),
      points: pts,
      meaning: 'Saturn\'s aspect on 7th house creates delays and seriousness around marriage. Not denial alone, but adds restriction.',
    });
  }

  // ── 4. Ketu in 7th house (spiritual detachment from marriage) ──
  if (ketuHouse === 7) {
    denialScore += 15;
    afflictions.push({
      factor: 'Ketu in 7th house',
      points: 15,
      meaning: 'Ketu in the marriage house creates deep spiritual detachment from partnerships. The person may not feel the need for a spouse. Strong denial indicator.',
    });
  }

  // ── 5. Ketu aspecting 7th house (from 5th/9th aspect) ──
  if (ketuHouse !== 7 && doesPlanetAspectHouse('Ketu', 7)) {
    denialScore += 8;
    afflictions.push({
      factor: 'Ketu aspects 7th house from H' + ketuHouse,
      points: 8,
      meaning: 'Ketu\'s aspect on 7th brings detachment energy to partnerships. May prefer solitude or spiritual pursuits over marriage.',
    });
  }

  // ── 6. Rahu in 7th house (obsession then confusion in marriage) ──
  if (rahuHouse === 7) {
    denialScore += 8;
    afflictions.push({
      factor: 'Rahu in 7th house',
      points: 8,
      meaning: 'Rahu in 7th creates confusion and unconventional approach to marriage. May attract foreign or unusual partners. Delays due to illusion.',
    });
  }

  // ── 7. Moon in 8th house (emotional isolation, difficulty trusting) ──
  if (moonHouse === 8) {
    denialScore += 10;
    afflictions.push({
      factor: 'Moon in 8th house',
      points: 10,
      meaning: 'Moon in 8th creates deep emotional isolation and difficulty opening up to a partner. Trust issues and hidden emotions block intimacy.',
    });
  }

  // ── 8. Moon in 12th house (emotional withdrawal, self-sacrifice) ──
  if (moonHouse === 12) {
    denialScore += 7;
    afflictions.push({
      factor: 'Moon in 12th house',
      points: 7,
      meaning: 'Moon in 12th indicates emotional withdrawal and preference for solitude. May sacrifice personal relationships for spiritual or selfless pursuits.',
    });
  }

  // ── 9. Venus conjunct Sun (combust — love burned by ego/career) ──
  // TRUE Vedic combustion: Venus must be within 10° of Sun (some texts say 6°, we use 10° for Venus)
  // Same house is NOT enough — two planets can be 25° apart in the same sign
  const venusSid = houseChart.planets.venus ? houseChart.planets.venus.sidereal : -1;
  const sunSid = houseChart.planets.sun ? houseChart.planets.sun.sidereal : -1;
  if (venusSid >= 0 && sunSid >= 0) {
    let vsDiff = Math.abs(venusSid - sunSid);
    if (vsDiff > 180) vsDiff = 360 - vsDiff; // handle wrap-around (e.g., 1° vs 359°)
    const isCombust = vsDiff <= 10; // Venus combustion orb = 10°
    if (isCombust) {
      const isCriticalHouse = [6, 8, 10, 12].includes(venusHouse);
      // Tighter conjunction = more severe: <3° = extra points
      const tightBonus = vsDiff <= 3 ? 3 : 0;
      const pts = (isCriticalHouse ? 12 : 7) + tightBonus;
      denialScore += pts;
      afflictions.push({
        factor: 'Venus conjunct Sun (combustion ' + vsDiff.toFixed(1) + '°) in H' + venusHouse,
        points: pts,
        meaning: 'Venus combust by Sun at ' + vsDiff.toFixed(1) + '° separation — love and romance are overshadowed by ego' +
          (isCriticalHouse ? ', career ambition, or difficult circumstances. The person may prioritize career over marriage.' : '. Love is present but the Sun\'s ego slightly dims romantic expression. Not a denial but a challenge.') +
          (vsDiff <= 3 ? ' Very tight combustion — Venus almost invisible, severely weakened.' : ''),
      });
    }
  }

  // ── 10. 7th lord in 6th house (spouse becomes enemy / legal disputes) ──
  if (lord7House === 6) {
    denialScore += 12;
    afflictions.push({
      factor: '7th lord ' + lord7 + ' in 6th house',
      points: 12,
      meaning: '7th lord in house of enemies and obstacles. Marriage faces litigation, conflicts, or the partner becomes an adversary. Strong delay/denial.',
    });
  }

  // ── 11. 7th lord in 8th house (hidden obstacles, sudden breaks) ──
  if (lord7House === 8) {
    denialScore += 10;
    afflictions.push({
      factor: '7th lord ' + lord7 + ' in 8th house',
      points: 10,
      meaning: '7th lord in 8th house of transformation and secrets. Marriage may be disrupted by sudden events, scandals, or hidden issues.',
    });
  }

  // ── 12. 7th lord in 12th house (loss / foreign disconnection) ──
  if (lord7House === 12) {
    denialScore += 6;
    afflictions.push({
      factor: '7th lord ' + lord7 + ' in 12th house',
      points: 6,
      meaning: '7th lord in 12th house of losses. Spouse may be foreign or distant. Marriage may involve sacrifice or foreign connection. Delay indicator, not denial alone.',
    });
  }

  // ── 13. Venus in 6th, 8th, or 12th house (love planet in dusthana) ──
  if ([6, 8, 12].includes(venusHouse)) {
    const pts = venusHouse === 8 ? 10 : venusHouse === 6 ? 9 : 7;
    denialScore += pts;
    afflictions.push({
      factor: 'Venus (love planet) in H' + venusHouse + ' (dusthana)',
      points: pts,
      meaning: 'Venus in a difficult house weakens love and romance capacity. ' +
        (venusHouse === 6 ? 'Love turns into conflict and service.' : venusHouse === 8 ? 'Love involves secrets, pain, and transformation.' : 'Love involves loss, sacrifice, or foreign disconnection.'),
    });
  }

  // ── 14. Venus retrograde (past-life relationship karma) ──
  if (isPlanetRetrograde('Venus')) {
    denialScore += 8;
    afflictions.push({
      factor: 'Venus retrograde',
      points: 8,
      meaning: 'Venus retrograde brings past-life relationship karma. Unconventional approach to love, may revisit old relationships, delays in finding the right partner.',
    });
  }

  // ── 15. 7th lord retrograde (partner energy turned inward) ──
  if (lord7 !== 'Sun' && lord7 !== 'Moon' && isPlanetRetrograde(lord7)) {
    denialScore += 6;
    afflictions.push({
      factor: '7th lord ' + lord7 + ' retrograde',
      points: 6,
      meaning: '7th lord retrograde turns marriage energy inward. The person may be self-sufficient and not seek partnership actively.',
    });
  }

  // ── 16. Mars in 7th house (Kuja Dosha — aggression in partnerships) ──
  if (marsHouse === 7) {
    denialScore += 8;
    afflictions.push({
      factor: 'Mars in 7th house (direct Kuja Dosha)',
      points: 8,
      meaning: 'Mars directly in marriage house brings aggression, dominance, and friction. Can delay marriage unless matched with another Manglik.',
    });
  }

  // ── 17. Mars in 1st or 8th (strong Kuja Dosha positions) ──
  if (marsHouse === 1 || marsHouse === 8) {
    denialScore += 6;
    afflictions.push({
      factor: 'Mars in H' + marsHouse + ' (strong Kuja Dosha)',
      points: 6,
      meaning: 'Mars in ' + (marsHouse === 1 ? 'Lagna — self-centered energy dominates partnerships' : '8th house — intensity and crises in marriage'),
    });
  }

  // ── 18. 7th house empty AND lord in 10th/career house (career over marriage) ──
  if (planetsIn7.length === 0 && lord7House === 10) {
    denialScore += 8;
    afflictions.push({
      factor: '7th house empty + 7th lord in 10th (career house)',
      points: 8,
      meaning: 'Empty marriage house with its lord channeled into career. Marriage energy is redirected to professional ambition. Career may completely absorb partnership potential.',
    });
  }

  // ── 19. Multiple malefics aspecting/in 7th house ──
  const maleficsOn7 = [];
  MALEFICS.forEach(m => {
    if (getPlanetHouse(m) === 7) maleficsOn7.push(m + ' in 7th');
    else if (doesPlanetAspectHouse(m, 7)) maleficsOn7.push(m + ' aspects 7th');
  });
  if (maleficsOn7.length >= 3) {
    denialScore += 12;
    afflictions.push({
      factor: 'Triple malefic influence on 7th house: ' + maleficsOn7.join(', '),
      points: 12,
      meaning: 'Three or more malefic planets influencing the marriage house creates severe obstacles. Marriage is extremely difficult without strong remedies.',
    });
  } else if (maleficsOn7.length === 2) {
    denialScore += 6;
    afflictions.push({
      factor: 'Double malefic influence on 7th house: ' + maleficsOn7.join(', '),
      points: 6,
      meaning: 'Two malefic planets influencing the marriage house creates notable obstacles and delays.',
    });
  }

  // ── 20. D9 Navamsha 7th house empty + no benefic aspect ──
  if (navamsha?.houses) {
    const nav7 = navamsha.houses[6];
    const nav7Planets = nav7?.planets || [];
    const nav7HasBenefics = nav7Planets.some(p => BENEFICS.includes(p.name));
    const nav7HasMalefics = nav7Planets.some(p => MALEFICS.includes(p.name));
    const nav7Empty = nav7Planets.length === 0;

    if (nav7Empty) {
      denialScore += 6;
      afflictions.push({
        factor: 'D9 Navamsha 7th house empty',
        points: 6,
        meaning: 'Empty 7th house in the marriage chart (D9) indicates weak soul-level connection to marriage. The person may not feel marriage is their destiny.',
      });
    }
    if (nav7HasMalefics && !nav7HasBenefics) {
      denialScore += 8;
      afflictions.push({
        factor: 'D9 7th house has only malefic planets: ' + nav7Planets.map(p => p.name).join(', '),
        points: 8,
        meaning: 'Malefic planets in D9 7th without benefic support — marriage at the soul level faces serious difficulties.',
      });
    }

    // D9 Venus in difficult signs (Virgo = debilitated, Scorpio = stressed)
    const navVenus = navamsha.planets?.venus;
    const navVenusRashi = navVenus?.navamshaRashiEnglish || navVenus?.rashi || '';
    if (navVenusRashi.toLowerCase().includes('virgo')) {
      denialScore += 8;
      afflictions.push({
        factor: 'Venus debilitated in D9 (Virgo)',
        points: 8,
        meaning: 'Venus in Virgo in the marriage chart — love is criticized, analyzed, and found wanting. Deep difficulty with unconditional love at the soul level.',
      });
    }
  }

  // ── 21. 12th house strong with Ketu (renunciation/monasticism tendency) ──
  if (ketuHouse === 12) {
    denialScore += 7;
    afflictions.push({
      factor: 'Ketu in 12th house (spiritual liberation over worldly attachments)',
      points: 7,
      meaning: 'Ketu in 12th gives strong spiritual and renunciation tendencies. The person may subconsciously reject worldly bonds like marriage.',
    });
  }

  // ── 22. Saturn aspecting Venus (restriction on love) ──
  if (doesPlanetAspectHouse('Saturn', venusHouse) || saturnHouse === venusHouse) {
    const pts = saturnHouse === venusHouse ? 9 : 6;
    denialScore += pts;
    afflictions.push({
      factor: saturnHouse === venusHouse ? 'Saturn conjunct Venus in H' + venusHouse : 'Saturn aspects Venus in H' + venusHouse,
      points: pts,
      meaning: 'Saturn\'s influence on Venus restricts love expression. The person may feel unworthy of love, or love comes with heavy responsibilities and delays.',
    });
  }

  // ── 23. 7th lord conjunct Rahu or Ketu (karmic disruption of marriage) ──
  if (lord7House === rahuHouse && lord7House > 0) {
    denialScore += 7;
    afflictions.push({
      factor: '7th lord ' + lord7 + ' conjunct Rahu in H' + lord7House,
      points: 7,
      meaning: '7th lord with Rahu brings obsessive, confused, or unconventional marriage energy. May attract unusual partners or face deception in relationships.',
    });
  }
  if (lord7House === ketuHouse && lord7House > 0) {
    denialScore += 8;
    afflictions.push({
      factor: '7th lord ' + lord7 + ' conjunct Ketu in H' + lord7House,
      points: 8,
      meaning: '7th lord with Ketu detaches the person from marriage at the soul level. Past-life completion of relationship karma.',
    });
  }

  // ── 24. Rahu in 6th house aspecting nothing but creating enemies ──
  if (rahuHouse === 6) {
    denialScore += 4;
    afflictions.push({
      factor: 'Rahu in 6th house',
      points: 4,
      meaning: 'Rahu in the house of enemies/obstacles creates hidden adversaries and legal complications that can obstruct marriage prospects.',
    });
  }

  // ── 25. No planets in 1-7 axis at all (weak self-partner connection) ──
  if (planetsIn1.length === 0 && planetsIn7.length === 0) {
    denialScore += 2;
    afflictions.push({
      factor: 'Empty 1-7 axis (no planets in Lagna or 7th house)',
      points: 2,
      meaning: 'No planets in the self-partner axis weakens the direct connection between identity and partnership. Common pattern — adds mild delay, not denial alone.',
    });
  }

  // ═══════════════════════════════════════════════════════════
  // SUPPORTIVE INDICATORS (reduce denial score)
  // ═══════════════════════════════════════════════════════════

  // Jupiter aspecting 7th house (greatest marriage protector)
  if (doesPlanetAspectHouse('Jupiter', 7) || jupiterHouse === 7) {
    const pts = jupiterHouse === 7 ? 12 : 8;
    denialScore -= pts;
    supportive.push({
      factor: jupiterHouse === 7 ? 'Jupiter IN 7th house' : 'Jupiter aspects 7th house',
      points: pts,
      meaning: 'Jupiter\'s blessing on 7th house is the strongest marriage protector. Can overcome many obstacles.',
    });
  }

  // Venus in good houses (1, 4, 5, 7, 9, 10, 11)
  if ([1, 4, 5, 7, 9, 10, 11].includes(venusHouse) && venusHouse !== sunHouse) {
    const pts = [5, 7, 9].includes(venusHouse) ? 8 : [1, 4, 10].includes(venusHouse) ? 5 : 3;
    denialScore -= pts;
    supportive.push({
      factor: 'Venus well-placed in H' + venusHouse,
      points: pts,
      meaning: 'Venus in a good house supports love and romance capacity.',
    });
  }

  // 7th lord in kendra or trikona (strong marriage disposition)
  if ([1, 4, 5, 7, 9, 10].includes(lord7House)) {
    const pts = [1, 7].includes(lord7House) ? 8 : [4, 10].includes(lord7House) ? 5 : 4;
    denialScore -= pts;
    supportive.push({
      factor: '7th lord ' + lord7 + ' in H' + lord7House + ' (strong position)',
      points: pts,
      meaning: '7th lord in angular or trinal house supports marriage happening.',
    });
  }

  // Benefic planets in 7th house
  const beneficsIn7 = planetsIn7.filter(p => BENEFICS.includes(p));
  if (beneficsIn7.length > 0) {
    const pts = beneficsIn7.length * 6;
    denialScore -= pts;
    supportive.push({
      factor: 'Benefic(s) in 7th house: ' + beneficsIn7.join(', '),
      points: pts,
      meaning: 'Benefic planets in 7th house directly support marriage and partnership happiness.',
    });
  }

  // D9 Navamsha 7th has benefics
  if (navamsha?.houses) {
    const nav7Planets = navamsha.houses[6]?.planets || [];
    const nav7Benefics = nav7Planets.filter(p => BENEFICS.includes(p.name));
    if (nav7Benefics.length > 0) {
      const pts = nav7Benefics.length * 5;
      denialScore -= pts;
      supportive.push({
        factor: 'D9 7th house has benefic(s): ' + nav7Benefics.map(p => p.name).join(', '),
        points: pts,
        meaning: 'Benefic planets in D9 7th house support marriage at the soul level.',
      });
    }

    // D9 Venus in own sign or exalted (strong love at soul level)
    const navVenusObj = navamsha.planets?.venus;
    const navVenusRashi = navVenusObj?.navamshaRashiEnglish || navVenusObj?.rashi || '';
    if (/taurus|libra|pisces/i.test(navVenusRashi)) {
      const pts = /pisces/i.test(navVenusRashi) ? 8 : 5;
      denialScore -= pts;
      supportive.push({
        factor: 'D9 Venus in ' + navVenusRashi + ' (strong)',
        points: pts,
        meaning: 'Venus strong in Navamsha — love and marriage well-supported at the soul level.',
      });
    }
  }

  // Moon in good houses for emotional availability (1, 4, 5, 7, 9, 10, 11)
  if ([1, 2, 4, 5, 7, 9, 10, 11].includes(moonHouse)) {
    const pts = [4, 5, 7].includes(moonHouse) ? 5 : 3;
    denialScore -= pts;
    supportive.push({
      factor: 'Moon well-placed in H' + moonHouse,
      points: pts,
      meaning: 'Moon in a supportive house — emotional openness and ability to connect with a partner.',
    });
  }

  // Jupiter aspecting Venus (blesses love)
  if (doesPlanetAspectHouse('Jupiter', venusHouse) || jupiterHouse === venusHouse) {
    const pts = jupiterHouse === venusHouse ? 8 : 5;
    denialScore -= pts;
    supportive.push({
      factor: jupiterHouse === venusHouse ? 'Jupiter conjunct Venus' : 'Jupiter aspects Venus',
      points: pts,
      meaning: 'Jupiter\'s blessing on Venus expands love capacity and supports marriage.',
    });
  }

  // 2nd lord or 11th lord in kendra/trikona (family and gains support marriage)
  const lord2 = getHouseLord(2);
  const lord11 = getHouseLord(11);
  const lord2House = getPlanetHouse(lord2);
  const lord11House = getPlanetHouse(lord11);
  if ([1, 4, 5, 7, 9, 10].includes(lord2House)) {
    denialScore -= 3;
    supportive.push({ factor: '2nd lord ' + lord2 + ' in H' + lord2House + ' (family support)', points: 3, meaning: 'Strong 2nd lord supports family formation and marriage.' });
  }
  if ([1, 4, 5, 7, 9, 10].includes(lord11House)) {
    denialScore -= 3;
    supportive.push({ factor: '11th lord ' + lord11 + ' in H' + lord11House + ' (gains support)', points: 3, meaning: 'Strong 11th lord supports gains through marriage and social connections.' });
  }

  // Planets in 7th house (even malefics activate marriage, just with friction)
  if (planetsIn7.length > 0) {
    denialScore -= 3;
    supportive.push({
      factor: 'Planets present in 7th house: ' + planetsIn7.join(', '),
      points: 3,
      meaning: 'Occupied 7th house activates marriage energy — marriage will happen even if with challenges.',
    });
  }

  // ═══════════════════════════════════════════════════════════
  // FINAL CALCULATION
  // ═══════════════════════════════════════════════════════════
  denialScore = Math.max(0, Math.min(100, denialScore));

  let severity, likelihood;
  if (denialScore >= 50) {
    severity = 'SEVERE';
    likelihood = 'Very Unlikely — strong indicators of marriage denial or lifelong bachelorhood';
  } else if (denialScore >= 35) {
    severity = 'HIGH';
    likelihood = 'Unlikely — significant obstacles suggest marriage may not happen or happens very late (after 35+)';
  } else if (denialScore >= 20) {
    severity = 'MODERATE';
    likelihood = 'Delayed — marriage possible but with notable delays and challenges';
  } else if (denialScore >= 10) {
    severity = 'MILD';
    likelihood = 'Likely with some delays — minor obstacles that can be overcome';
  } else {
    severity = 'NONE';
    likelihood = 'Marriage is well-supported in this chart';
  }

  // Build summary
  const topAfflictions = afflictions.sort((a, b) => b.points - a.points).slice(0, 5);
  const summary = afflictions.length === 0
    ? 'No significant marriage denial indicators found. Marriage is well-supported.'
    : `${afflictions.length} marriage affliction(s) detected (denial score: ${denialScore}/100). ` +
      `Top factors: ${topAfflictions.map(a => a.factor).join('; ')}. ` +
      `Marriage likelihood: ${likelihood}`;

  console.log(`[MarriageDenial] Score: ${denialScore}/100, Severity: ${severity}, Afflictions: ${afflictions.length}, Supportive: ${supportive.length}`);

  return {
    denialScore,
    severity,
    likelihood,
    afflictions: afflictions.sort((a, b) => b.points - a.points),
    supportive,
    summary,
    isMarriageDenied: denialScore >= 50,
    isMarriageDelayed: denialScore >= 20 && denialScore < 50,
    isMarriageSupported: denialScore < 20,
  };
}

// ═══════════════════════════════════════════════════════════════════
// MARRIAGE TIMING ENGINE — Multi-layer Vedic Analysis
// ═══════════════════════════════════════════════════════════════════
// Uses 7 classical techniques scored together:
//   1. Dasha-Antardasha connection to 7th house / lord / Venus
//   2. Jupiter transit over natal 7th / 7th lord / Venus (from lagna)
//   3. Saturn transit over or aspecting 7th house
//   4. Double-transit (Jupiter + Saturn both touching 7th/lord)
//   5. Navamsha (D9) Dasha triggers
//   6. Age suitability window (Sri Lankan cultural norms)
//   7. Rahu-Ketu axis transit activating 1-7 axis
// ═══════════════════════════════════════════════════════════════════

/**
 * Predict marriage timing windows with confidence scores
 * @param {Object|Date} birthInfo - Birth info object {year,month,day,hour,minute,second,latitude,longitude,timezone} or Date
 * @param {number} [lat] - Birth latitude (if birthInfo is Date)
 * @param {number} [lng] - Birth longitude (if birthInfo is Date)
 * @param {Object} [opts] - Optional: { maritalStatus, marriageYear }
 * @returns {Object} Marriage timing predictions with ranked windows
 */
function predictMarriageTiming(birthInfo, lat, lng, opts = {}) {
  let date;
  if (birthInfo instanceof Date) {
    date = birthInfo;
  } else if (typeof birthInfo === 'object' && birthInfo.year) {
    // Convert birth info object to UTC Date
    const tz = birthInfo.timezone || 5.5;
    date = new Date(Date.UTC(birthInfo.year, birthInfo.month - 1, birthInfo.day,
      birthInfo.hour || 0, birthInfo.minute || 0, birthInfo.second || 0));
    // Subtract timezone offset to get actual UTC
    date = new Date(date.getTime() - tz * 60 * 60 * 1000);
    lat = birthInfo.latitude || lat || 6.9271;
    lng = birthInfo.longitude || lng || 79.8612;
  } else {
    date = new Date(birthInfo);
  }
  const houseChart = buildHouseChart(date, lat, lng);
  const houses = houseChart.houses;
  const planets = houseChart.planets;
  const navamsha = buildNavamshaChart(date, lat, lng);
  const moonSidereal = toSidereal(getMoonLongitude(date), date);
  const dasaPeriods = calculateVimshottariDetailed(moonSidereal, date);
  const lagnaName = houseChart.lagna?.rashi?.name || houses[0]?.rashi;

  // ── Helper: get planet's natal house number ──
  const getPlanetHouse = (name) => {
    const h = houses.find(h => h.planets.some(p => p.name === name));
    return h ? h.houseNumber : 0;
  };

  // ── Helper: get house lord ──
  const getHouseLord = (houseNum) => {
    const h = houses[houseNum - 1];
    if (!h) return 'Unknown';
    return h.rashiLord || RASHIS[(h.rashiId || 1) - 1]?.lord || 'Unknown';
  };

  // ── Key marriage significators ──
  const lord7 = getHouseLord(7);
  const lord2 = getHouseLord(2);
  const lord11 = getHouseLord(11);
  const lord1 = getHouseLord(1);
  const house7RashiId = houses[6]?.rashiId || 1;
  const venusHouse = getPlanetHouse('Venus');
  const lord7House = getPlanetHouse(lord7);
  const moonHouse = getPlanetHouse('Moon');

  // ── Planets aspecting 7th house (from Drishti rules) ──
  const planetsAspecting7 = [];
  const ALL_PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  ALL_PLANETS.forEach(pName => {
    const pH = getPlanetHouse(pName);
    if (!pH) return;
    const aspects = SPECIAL_ASPECTS[pName] || [7];
    aspects.forEach(asp => {
      const targetH = ((pH - 1 + asp - 1) % 12) + 1;
      if (targetH === 7) planetsAspecting7.push(pName);
    });
  });

  // ── Planets in or ruling 2nd, 7th, 11th (marriage-activating houses) ──
  const marriageSignificators = new Set();
  marriageSignificators.add(lord7);
  marriageSignificators.add(lord2);
  marriageSignificators.add(lord11);
  marriageSignificators.add('Venus'); // Natural karaka of marriage
  // Planets IN 7th house
  (houses[6]?.planets || []).forEach(p => marriageSignificators.add(p.name));
  // Planets aspecting 7th
  planetsAspecting7.forEach(p => marriageSignificators.add(p));

  // ── D9 Navamsha 7th lord ──
  const nav7RashiId = navamsha?.houses?.[6]?.rashiId;
  const navLord7 = nav7RashiId ? (RASHIS[nav7RashiId - 1]?.lord || null) : null;
  if (navLord7) marriageSignificators.add(navLord7);

  // ── Dispositor of 7th lord (the lord of the rashi where 7th lord sits) ──
  const lord7RashiId = houses.find(h => h.planets.some(p => p.name === lord7))?.rashiId;
  const dispositorOf7thLord = lord7RashiId ? (RASHIS[lord7RashiId - 1]?.lord || null) : null;
  if (dispositorOf7thLord && dispositorOf7thLord !== lord7) {
    marriageSignificators.add(dispositorOf7thLord);
  }

  // Rahu/Ketu act as proxy for their dispositors
  const rahuHouse = getPlanetHouse('Rahu');
  const ketuHouse = getPlanetHouse('Ketu');
  const rahuDispositor = rahuHouse ? getHouseLord(rahuHouse) : null;
  const ketuDispositor = ketuHouse ? getHouseLord(ketuHouse) : null;

  console.log('[MarriageTiming] Lagna:', lagnaName, '| 7th lord:', lord7, 'in H' + lord7House);
  console.log('[MarriageTiming] Significators:', [...marriageSignificators].join(', '));
  console.log('[MarriageTiming] Planets aspecting 7th:', planetsAspecting7.join(', '));

  // ═══════════════════════════════════════════════════════════
  // SCAN EACH ANTARDASHA FOR MARRIAGE POTENTIAL
  // ═══════════════════════════════════════════════════════════
  const windows = [];

  dasaPeriods.forEach(md => {
    if (!md.antardashas) return;

    md.antardashas.forEach(ad => {
      const adStart = new Date(ad.start);
      const adEnd = new Date(ad.endDate);

      // Skip periods before age 18 or after age 50
      const ageAtStart = (adStart - date) / (365.25 * 24 * 60 * 60 * 1000);
      const ageAtEnd = (adEnd - date) / (365.25 * 24 * 60 * 60 * 1000);
      if (ageAtEnd < 18 || ageAtStart > 50) return;

      let score = 0;
      const reasons = [];

      // ── RULE 1: Dasha lord connection to marriage (0-30 points) ──
      const mdLord = md.lord;
      const adLord = ad.lord;

      // Mahadasha lord is a marriage significator
      if (marriageSignificators.has(mdLord)) {
        score += 15;
        reasons.push(`${mdLord} Mahadasha is marriage significator`);
      }
      // Antardasha lord is a marriage significator
      if (marriageSignificators.has(adLord)) {
        score += 15;
        reasons.push(`${adLord} Antardasha is marriage significator`);
      }

      // ── RULE 2: Dasha lord is 7th lord or Venus (extra weight) ──
      if (mdLord === lord7 || mdLord === 'Venus') {
        score += 10;
        reasons.push(`${mdLord} MD is 7th lord or Venus — strong marriage trigger`);
      }
      if (adLord === lord7 || adLord === 'Venus') {
        score += 10;
        reasons.push(`${adLord} AD is 7th lord or Venus — strong marriage trigger`);
      }

      // ── RULE 2b: Venus antardasha special bonus ──
      // Venus is THE natural karaka of marriage — Venus AD deserves extra weight
      // BUT if Venus is already the 7th lord, the bonus from Rule 2 already covers it
      // so we give a reduced karaka bonus to prevent double-stacking
      if (adLord === 'Venus') {
        const venusKarakaBonus = (lord7 === 'Venus') ? 4 : 8; // reduced if already 7th lord
        score += venusKarakaBonus;
        reasons.push(`Venus AD — natural marriage karaka activation${lord7 === 'Venus' ? ' (reduced: already counted as 7th lord)' : ' (strongest marriage antardasha)'}`);
        // Venus in kendra or trikona from lagna = even more potent
        const venusH = getPlanetHouse('Venus');
        if (venusH && [1, 4, 5, 7, 9, 10].includes(venusH)) {
          score += 5;
          reasons.push(`Venus placed in strong house ${venusH} — amplifies marriage potential`);
        }
      }
      if (mdLord === 'Venus') {
        const venusMDBonus = (lord7 === 'Venus') ? 3 : 5; // reduced if already 7th lord
        score += venusMDBonus;
        reasons.push(`Venus MD — entire period favors relationships and marriage${lord7 === 'Venus' ? ' (reduced: already 7th lord)' : ''}`);
      }

      // ── RULE 3: Rahu/Ketu as proxy (they activate their dispositor's house) ──
      if (mdLord === 'Rahu' && rahuDispositor && marriageSignificators.has(rahuDispositor)) {
        score += 10;
        reasons.push(`Rahu MD acts through dispositor ${rahuDispositor} (marriage significator)`);
      }
      if (mdLord === 'Ketu' && ketuDispositor && marriageSignificators.has(ketuDispositor)) {
        score += 10;
        reasons.push(`Ketu MD acts through dispositor ${ketuDispositor}`);
      }
      if (adLord === 'Rahu' && rahuDispositor && marriageSignificators.has(rahuDispositor)) {
        score += 8;
        reasons.push(`Rahu AD acts through dispositor ${rahuDispositor}`);
      }
      if (adLord === 'Ketu' && ketuDispositor && marriageSignificators.has(ketuDispositor)) {
        score += 8;
        reasons.push(`Ketu AD acts through dispositor ${ketuDispositor}`);
      }

      // ── RULE 4: Dasha lord placed in or aspecting 7th house natally ──
      const mdHouse = getPlanetHouse(mdLord);
      const adHouse = getPlanetHouse(adLord);
      if (mdHouse === 7) { score += 8; reasons.push(`${mdLord} placed in 7th house`); }
      if (adHouse === 7) { score += 8; reasons.push(`${adLord} placed in 7th house`); }
      if (planetsAspecting7.includes(mdLord)) { score += 5; reasons.push(`${mdLord} aspects 7th`); }
      if (planetsAspecting7.includes(adLord)) { score += 5; reasons.push(`${adLord} aspects 7th`); }

      // ── RULE 4b: Rahu-Saturn affinity (Shani vat Rahu principle) ──
      // In Vedic astrology, Rahu acts like Saturn — their combined period amplifies commitment
      if ((mdLord === 'Rahu' && adLord === 'Saturn') || (mdLord === 'Saturn' && adLord === 'Rahu')) {
        score += 5;
        reasons.push(`Rahu-Saturn combo (Shani vat Rahu) — amplifies commitment/marriage energy`);
      }

      // ── RULE 4c: Saturn's special natal aspects on marriage houses ──
      // Saturn aspects 3rd, 7th, 10th from its position — check if any hit 2nd, 7th, 11th (marriage houses)
      if (adLord === 'Saturn' || mdLord === 'Saturn') {
        const satNatalH = getPlanetHouse('Saturn');
        if (satNatalH) {
          [3, 7, 10].forEach(asp => {
            const aspH = ((satNatalH - 1 + asp - 1) % 12) + 1;
            if (aspH === 2 || aspH === 11) {
              score += 3;
              reasons.push(`Saturn natal ${asp}th aspect hits H${aspH} (family/gains)`);
            }
          });
        }
      }

      // ── RULE 4d: Moon in 7th house — strong marriage yoga ──
      // Moon directly in 7th house is a powerful marriage indicator (emotional connection to spouse)
      // This boosts ALL periods, not just Moon dasha, because the native has inherent marriage yoga
      const moonHouse = getPlanetHouse('Moon');
      if (moonHouse === 7) {
        score += 10;
        reasons.push(`Moon in 7th house — strong natal marriage yoga (emotional fulfillment through partnership)`);
        // Extra boost if AD lord aspects or is dispositor of Moon
        const moonRashiId = houses.find(h => h.planets.some(p => p.name === 'Moon'))?.rashiId;
        const moonDispositor = moonRashiId ? (RASHIS[moonRashiId - 1]?.lord || null) : null;
        if (moonDispositor && adLord === moonDispositor) {
          score += 8;
          reasons.push(`${adLord} AD is Moon's dispositor (${moonDispositor}) — activates Moon in 7th`);
        }
      }

      // ── RULE 4e: Saturn's global aspect on 12th house (bed pleasures) ──
      // Saturn from any position aspecting 12th = commitment to marital bed/intimacy
      // This applies even when Saturn isn't the dasha lord — it's a natal yoga
      const saturnHouse = getPlanetHouse('Saturn');
      if (saturnHouse) {
        const saturnAspects12 = [3, 7, 10].some(asp => {
          const aspH = ((saturnHouse - 1 + asp - 1) % 12) + 1;
          return aspH === 12;
        });
        if (saturnAspects12) {
          // Boost periods where Saturn is involved as MD/AD lord
          if (mdLord === 'Saturn' || adLord === 'Saturn') {
            score += 8;
            reasons.push(`Saturn natally aspects 12th (bed pleasures) — Saturn period activates marital intimacy`);
          } else {
            // Minor boost even for non-Saturn periods (natal yoga exists)
            score += 2;
            reasons.push(`Saturn's natal aspect on 12th house supports marriage`);
          }
        }
      }

      // ── RULE 5: Dasha lord connects to 2nd or 11th house ──
      if (mdHouse === 2 || mdHouse === 11) { score += 4; reasons.push(`${mdLord} in ${mdHouse}th (gains/family)`); }
      if (adHouse === 2 || adHouse === 11) { score += 4; reasons.push(`${adLord} in ${adHouse}th (gains/family)`); }
      if (mdLord === lord2 || mdLord === lord11) { score += 3; reasons.push(`${mdLord} rules 2nd/11th`); }
      if (adLord === lord2 || adLord === lord11) { score += 3; reasons.push(`${adLord} rules 2nd/11th`); }

      // ── RULE 5b: Dasha lords ruling kendra (1,4,7,10) or connected houses ──
      // Saturn ruling 4th = domestic happiness. 4th lord active = setting up home = marriage
      const mdRuledHouses = [];
      const adRuledHouses = [];
      for (let h = 1; h <= 12; h++) {
        if (getHouseLord(h) === mdLord) mdRuledHouses.push(h);
        if (getHouseLord(h) === adLord) adRuledHouses.push(h);
      }
      // AD lord rules a kendra house (1,4,7,10) — angular lords bring events
      if (adRuledHouses.some(h => [1, 4, 7, 10].includes(h))) {
        score += 5;
        reasons.push(`${adLord} rules kendra house(s) ${adRuledHouses.filter(h => [1,4,7,10].includes(h)).join(',')}`);
      }
      // MD lord rules a kendra house
      if (mdRuledHouses.some(h => [1, 4, 7, 10].includes(h))) {
        score += 3;
        reasons.push(`${mdLord} rules kendra house(s) ${mdRuledHouses.filter(h => [1,4,7,10].includes(h)).join(',')}`);
      }

      // ── RULE 5b-EXTRA: 4th lord antardasha = marriage settlement indicator ──
      // The 4th house = domestic happiness, home, family foundation. When the 4th lord
      // runs as AD during a marriage-linked MD, it specifically triggers setting up a home
      // and getting married. This is one of the most overlooked marriage triggers.
      if (adRuledHouses.includes(4)) {
        score += 8;
        reasons.push(`${adLord} is 4th lord (domestic happiness) — marriage + home foundation trigger`);
        // If AD lord also rules another marriage-related house (2nd=family, 3rd=siblings/celebration), even stronger
        if (adRuledHouses.includes(2) || adRuledHouses.includes(3)) {
          score += 4;
          reasons.push(`${adLord} also rules H${adRuledHouses.includes(2) ? 2 : 3} — family/celebration connection amplifies marriage`);
        }
      }
      if (mdRuledHouses.includes(4)) {
        score += 4;
        reasons.push(`${mdLord} is 4th lord (domestic happiness) — entire MD supports home/family events`);
      }

      // Special: if one lord rules 4th (home) and the other connects to 7th — marriage + settling down
      if ((mdRuledHouses.includes(4) && (adRuledHouses.includes(7) || adLord === lord7 || adLord === 'Venus')) ||
          (adRuledHouses.includes(4) && (mdRuledHouses.includes(7) || mdLord === lord7 || mdLord === 'Venus'))) {
        score += 6;
        reasons.push(`4th lord + 7th connection — marriage & setting up home`);
      }

      // ── RULE 5c: AD lord's dispositor connects to 7th ──
      // Where is the AD lord placed? Its dispositor (rashi lord of that house) matters
      const adLordRashiId = houses[adHouse - 1]?.rashiId;
      const adDispositor = adLordRashiId ? (RASHIS[adLordRashiId - 1]?.lord || null) : null;
      if (adDispositor && marriageSignificators.has(adDispositor) && adDispositor !== adLord) {
        score += 5;
        reasons.push(`${adLord}'s dispositor ${adDispositor} is marriage significator`);
      }

      // ── RULE 5d: Natural significator bonus ──
      // Saturn = commitment/responsibility; Jupiter = dharma/ceremony; Venus = love
      if (adLord === 'Saturn' && (mdRuledHouses.includes(7) || marriageSignificators.has(mdLord))) {
        score += 4;
        reasons.push(`Saturn AD = commitment/permanence with marriage-linked MD`);
      }
      if (mdLord === 'Jupiter' || adLord === 'Jupiter') {
        // Jupiter is the natural ceremony/blessing planet
        const jupLord = mdLord === 'Jupiter' ? 'MD' : 'AD';
        score += 2;
        reasons.push(`Jupiter ${jupLord} — blesses marriage ceremony`);
      }

      // ── RULE 5e: Mutual connection between MD and AD lords in natal chart ──
      // If MD lord is in the sign ruled by AD lord or vice versa = strong activation
      const mdLordRashiId = houses[mdHouse - 1]?.rashiId;
      const mdDispositor = mdLordRashiId ? (RASHIS[mdLordRashiId - 1]?.lord || null) : null;
      if (mdDispositor === adLord || adDispositor === mdLord) {
        score += 6;
        reasons.push(`${mdLord}-${adLord} mutual dispositorship — strong period activation`);
      }
      // MD lord and AD lord in same house or opposite houses
      if (mdHouse && adHouse) {
        if (mdHouse === adHouse) {
          score += 3;
          reasons.push(`${mdLord} & ${adLord} conjunct natally`);
        }
        if (Math.abs(mdHouse - adHouse) === 6 || Math.abs(mdHouse - adHouse) === -6) {
          score += 2;
          reasons.push(`${mdLord} & ${adLord} in 1-7 axis natally`);
        }
      }

      // ── RULE 6: D9 Navamsha connection ──
      if (navLord7 && (mdLord === navLord7 || adLord === navLord7)) {
        score += 8;
        reasons.push(`${mdLord === navLord7 ? mdLord : adLord} is D9 7th lord — Navamsha activation`);
      }

      // ── RULE 7: Transit checks at multiple points through the AD period ──
      // Check transits at quarterly intervals to find best transit window
      const venusRashiId = houses.find(h => h.planets.some(p => p.name === 'Venus'))?.rashiId;
      const lord7RashiIdNatal = houses.find(h => h.planets.some(p => p.name === lord7))?.rashiId;
      const lagnaRashiId = houses[0]?.rashiId || 1;
      let bestTransitScore = 0;
      let bestTransitReasons = [];
      let bestTransitJupH = 0;
      let bestTransitSatH = 0;

      const adDuration = adEnd.getTime() - adStart.getTime();
      // Check multiple points through the AD: every ~4 months for long ADs
      const monthsInAD = adDuration / (30.44 * 24 * 60 * 60 * 1000);
      let checkPoints;
      if (monthsInAD <= 4) {
        checkPoints = [0.5]; // Short AD — just check midpoint
      } else if (monthsInAD <= 12) {
        checkPoints = [0.25, 0.5, 0.75];
      } else {
        // Long AD — check every ~4 months
        const numChecks = Math.max(3, Math.ceil(monthsInAD / 4));
        checkPoints = [];
        for (let i = 1; i <= numChecks; i++) {
          checkPoints.push(i / (numChecks + 1));
        }
      }

      for (const frac of checkPoints) {
        const checkTime = new Date(adStart.getTime() + adDuration * frac);
        let transitScore = 0;
        const transitReasons = [];

        // Use actual planet positions for accuracy
        let transitJupRashiId, transitSatRashiId, transitRahuRashiId;
        try {
          const transitPositions = getAllPlanetPositions(checkTime);
          transitJupRashiId = transitPositions.jupiter?.rashiId || 1;
          transitSatRashiId = transitPositions.saturn?.rashiId || 1;
          transitRahuRashiId = transitPositions.rahu?.rashiId || 1;
        } catch (e) {
          // Fallback to simplified formulas
          const transitJupSid = toSidereal(getJupiterLongitude(checkTime), checkTime);
          const transitSatSid = toSidereal(getSaturnLongitude(checkTime), checkTime);
          const transitRahuSid = toSidereal(getRahuLongitude(checkTime), checkTime);
          transitJupRashiId = Math.floor(transitJupSid / 30) + 1;
          transitSatRashiId = Math.floor(transitSatSid / 30) + 1;
          transitRahuRashiId = Math.floor(transitRahuSid / 30) + 1;
        }

        const jupH = ((transitJupRashiId - lagnaRashiId + 12) % 12) + 1;
        const satH = ((transitSatRashiId - lagnaRashiId + 12) % 12) + 1;
        const rahuH = ((transitRahuRashiId - lagnaRashiId + 12) % 12) + 1;

        // Jupiter transit analysis
        if (jupH === 7) {
          transitScore += 12;
          transitReasons.push(`Jupiter transits 7th house — strongest marriage transit`);
        } else if ([1, 5, 9].includes(jupH)) {
          transitScore += 6;
          transitReasons.push(`Jupiter transits ${jupH}th (trikona) — supports marriage`);
        } else if ([2, 11].includes(jupH)) {
          transitScore += 4;
          transitReasons.push(`Jupiter transits ${jupH}th (gains) — supports marriage`);
        }
        if (transitJupRashiId === venusRashiId) {
          transitScore += 5;
          transitReasons.push(`Jupiter transits over natal Venus sign`);
        }
        if (transitJupRashiId === lord7RashiIdNatal) {
          transitScore += 5;
          transitReasons.push(`Jupiter transits over natal 7th lord sign`);
        }
        // Jupiter transit over natal Moon — especially powerful if Moon is in 7th
        const moonRashiIdNatal = houses.find(h => h.planets.some(p => p.name === 'Moon'))?.rashiId;
        if (moonRashiIdNatal && transitJupRashiId === moonRashiIdNatal) {
          const moonNatalH = getPlanetHouse('Moon');
          if (moonNatalH === 7) {
            transitScore += 10;
            transitReasons.push(`Jupiter transits over Moon in 7th — activates marriage yoga`);
          } else {
            transitScore += 3;
            transitReasons.push(`Jupiter transits over natal Moon sign`);
          }
        }
        // Jupiter aspects on 7th house
        [5, 7, 9].forEach(asp => {
          const aspH = ((jupH - 1 + asp - 1) % 12) + 1;
          if (aspH === 7 && jupH !== 7) {
            transitScore += 6;
            transitReasons.push(`Jupiter aspects 7th house (${asp}th aspect from H${jupH})`);
          }
        });

        // Saturn transit analysis
        if (satH === 7) {
          transitScore += 6;
          transitReasons.push(`Saturn transits 7th house`);
        }
        // Saturn aspects: 3rd, 7th, 10th
        [3, 7, 10].forEach(asp => {
          const aspH = ((satH - 1 + asp - 1) % 12) + 1;
          if (aspH === 7 && satH !== 7) {
            transitScore += 6;
            transitReasons.push(`Saturn aspects 7th house (${asp}th aspect from H${satH})`);
          }
        });

        // Double transit: Jupiter + Saturn both influence 7th
        const jupTouches7 = jupH === 7 ||
          [5, 7, 9].some(a => ((jupH - 1 + a - 1) % 12) + 1 === 7);
        const satTouches7 = satH === 7 ||
          [3, 7, 10].some(a => ((satH - 1 + a - 1) % 12) + 1 === 7);

        if (jupTouches7 && satTouches7) {
          transitScore += 15;
          transitReasons.push(`★ DOUBLE TRANSIT — Jupiter + Saturn both activate 7th house`);
        }

        // Rahu-Ketu on 1-7 axis
        if (rahuH === 1 || rahuH === 7) {
          transitScore += 5;
          transitReasons.push(`Rahu-Ketu axis transits 1-7 axis — karmic marriage trigger`);
        }

        // ── Transit over 7th LORD's natal house (not just 7th house) ──
        const lord7NatalH = getPlanetHouse(lord7);
        if (lord7NatalH) {
          // Jupiter transit/aspect on 7th lord's natal position
          const jupTouchesLord7 = jupH === lord7NatalH ||
            [5, 7, 9].some(a => ((jupH - 1 + a - 1) % 12) + 1 === lord7NatalH);
          if (jupTouchesLord7) {
            transitScore += 5;
            transitReasons.push(`Jupiter transit activates 7th lord ${lord7} in H${lord7NatalH}`);
          }
          // Saturn transit/aspect on 7th lord's natal position
          const satTouchesLord7 = satH === lord7NatalH ||
            [3, 7, 10].some(a => ((satH - 1 + a - 1) % 12) + 1 === lord7NatalH);
          if (satTouchesLord7) {
            transitScore += 5;
            transitReasons.push(`Saturn transit activates 7th lord ${lord7} in H${lord7NatalH}`);
          }
          // Double transit on 7th lord (very powerful — equivalent to double transit on 7th house)
          if (jupTouchesLord7 && satTouchesLord7) {
            transitScore += 12;
            transitReasons.push(`★ DOUBLE TRANSIT on 7th lord ${lord7} — marriage trigger`);
          }
        }

        // ── Dasha lord itself transiting key marriage houses ──
        // When the AD lord transits the 7th or aspects it, events manifest
        const adLordTransitRashiId = mdLord === 'Saturn' ? transitSatRashiId :
          mdLord === 'Jupiter' ? transitJupRashiId : null;
        const mdLordTransitRashiId = adLord === 'Saturn' ? transitSatRashiId :
          adLord === 'Jupiter' ? transitJupRashiId : null;

        // AD lord (if Saturn/Jupiter) transiting/aspecting 7th
        if (adLord === 'Saturn' || adLord === 'Jupiter') {
          const adTransitH = adLord === 'Saturn' ? satH : jupH;
          const adAspects = adLord === 'Saturn' ? [3, 7, 10] : [5, 7, 9];
          const adTransitTouches7 = adTransitH === 7 ||
            adAspects.some(a => ((adTransitH - 1 + a - 1) % 12) + 1 === 7);
          if (adTransitTouches7) {
            transitScore += 6;
            transitReasons.push(`AD lord ${adLord} transit activates 7th house — dasha-transit resonance`);
          }
        }
        // MD lord (if Saturn/Jupiter) transiting/aspecting 7th
        if (mdLord === 'Saturn' || mdLord === 'Jupiter') {
          const mdTransitH = mdLord === 'Saturn' ? satH : jupH;
          const mdAspects = mdLord === 'Saturn' ? [3, 7, 10] : [5, 7, 9];
          const mdTransitTouches7 = mdTransitH === 7 ||
            mdAspects.some(a => ((mdTransitH - 1 + a - 1) % 12) + 1 === 7);
          if (mdTransitTouches7) {
            transitScore += 4;
            transitReasons.push(`MD lord ${mdLord} transit activates 7th house — dasha-transit resonance`);
          }
        }

        // ── Jupiter transit over AD lord's natal house — activates that dasha ──
        // When Jupiter transits/aspects the house where AD lord is placed natally,
        // it "activates" that planet's results. Critical for timing!
        if (adHouse) {
          const jupTouchesADLord = jupH === adHouse ||
            [5, 7, 9].some(a => ((jupH - 1 + a - 1) % 12) + 1 === adHouse);
          if (jupTouchesADLord) {
            transitScore += 8;
            transitReasons.push(`Jupiter transit activates ${adLord} in H${adHouse} — dasha lord activation`);
          }
        }
        // Saturn transit over AD lord's natal house — also activates (slower, more permanent results)
        if (adHouse) {
          const satTouchesADLord = satH === adHouse ||
            [3, 7, 10].some(a => ((satH - 1 + a - 1) % 12) + 1 === adHouse);
          if (satTouchesADLord) {
            transitScore += 4;
            transitReasons.push(`Saturn transit activates ${adLord} in H${adHouse}`);
          }
        }

        // Keep the best transit window
        if (transitScore > bestTransitScore) {
          bestTransitScore = transitScore;
          bestTransitReasons = transitReasons;
          bestTransitJupH = jupH;
          bestTransitSatH = satH;
        }
      }

      score += bestTransitScore;
      reasons.push(...bestTransitReasons);

      // ── RULE 10: Age suitability (Sri Lankan norms) ──
      const avgAge = (ageAtStart + ageAtEnd) / 2;
      if (avgAge >= 22 && avgAge <= 29) {
        score += 14;
        reasons.push(`Age ${Math.floor(avgAge)} — prime marriage age window`);
      } else if (avgAge >= 20 && avgAge <= 32) {
        score += 6;
        reasons.push(`Age ${Math.floor(avgAge)} — suitable marriage age`);
      } else if (avgAge >= 18 && avgAge <= 35) {
        score += 2;
        reasons.push(`Age ${Math.floor(avgAge)} — possible but less typical`);
      } else if (avgAge > 40) {
        // Penalize very late predictions as first marriage
        score -= 10;
        reasons.push(`Age ${Math.floor(avgAge)} — unlikely for first marriage (penalty)`);
      } else if (avgAge < 18) {
        score -= 15;
        reasons.push(`Age ${Math.floor(avgAge)} — too young (penalty)`);
      }

      // Only include windows with meaningful score
      if (score >= 15) {
        windows.push({
          mahadasha: mdLord,
          antardasha: adLord,
          start: ad.start,
          end: ad.endDate,
          ageRange: `${Math.floor(ageAtStart)}-${Math.ceil(ageAtEnd)}`,
          score,
          confidence: score >= 50 ? 'Very High' : score >= 35 ? 'High' : score >= 25 ? 'Medium' : 'Low',
          reasons,
          transitJupiter: `House ${bestTransitJupH} from Lagna`,
          transitSaturn: `House ${bestTransitSatH} from Lagna`,
        });
      }
    });
  });

  // Sort by score descending
  windows.sort((a, b) => b.score - a.score);

  // ── POST-PROCESSING: "First viable window with transit support" boost ──
  // In practice, marriages happen in the FIRST strong window during prime age that ALSO
  // has Jupiter-Saturn double transit support. A dasha period alone doesn't trigger marriage —
  // it needs transit activation. The first period with both strong dasha AND double transit wins.
  const primeWindows = windows.filter(w => {
    const avgAge = (parseFloat(w.ageRange.split('-')[0]) + parseFloat(w.ageRange.split('-')[1])) / 2;
    const hasDoubleTransit = w.reasons.some(r => r.includes('DOUBLE TRANSIT'));
    // Threshold lowered from 65 to 40 after correcting aspect formulas (Bug #8 fix)
    // — correct transit scores are naturally lower since only TRUE aspects count now
    return w.score >= 40 && avgAge >= 20 && avgAge <= 30;
  }).sort((a, b) => new Date(a.start) - new Date(b.start)); // chronological
  
  if (primeWindows.length >= 1) {
    // The earliest prime window with double transit gets "first viable" boost
    const firstViable = primeWindows[0];
    const wObj = windows.find(w => w.mahadasha === firstViable.mahadasha && w.antardasha === firstViable.antardasha && w.start === firstViable.start);
    if (wObj) {
      wObj.score += 30;
      wObj.reasons.push(`★ First strong marriage window in prime age with double transit — marriages manifest at the EARLIEST dasha+transit alignment`);
      wObj.confidence = wObj.score >= 50 ? 'Very High' : wObj.score >= 35 ? 'High' : wObj.score >= 25 ? 'Medium' : 'Low';
    }
  }

  // Re-sort after boost
  // ── Age-relevance decay: penalize windows far from typical first marriage age ──
  // First marriage in South Asian context peaks at 22-30. Windows beyond ~35 are 
  // almost certainly not first marriages — penalize so they don't outrank prime-age windows.
  windows.forEach(w => {
    const avgAge = (parseFloat(w.ageRange.split('-')[0]) + parseFloat(w.ageRange.split('-')[1])) / 2;
    if (avgAge > 35) {
      const yearsOver = avgAge - 35;
      const penalty = Math.min(yearsOver * 4, 50); // -4 per year over 35, max -50
      w.score -= penalty;
      w.reasons.push(`Age ${Math.round(avgAge)} is well past typical first marriage — relevance reduced`);
    } else if (avgAge < 18) {
      w.score -= 20;
      w.reasons.push(`Age ${Math.round(avgAge)} is below legal marriage age`);
    }
    // Recalculate confidence
    w.confidence = w.score >= 50 ? 'Very High' : w.score >= 35 ? 'High' : w.score >= 25 ? 'Medium' : 'Low';
  });

  windows.sort((a, b) => b.score - a.score);

  // ═══════════════════════════════════════════════════════════
  // MARRIAGE DENIAL INTEGRATION — Apply denial penalties to ALL windows
  // ═══════════════════════════════════════════════════════════
  let marriageDenial = null;
  try {
    marriageDenial = assessMarriageDenial(date, lat, lng);
    if (marriageDenial && marriageDenial.denialScore > 0) {
      // Apply denial penalty: reduce all window scores proportionally
      // denialScore 50+ = SEVERE: cut scores by 60%
      // denialScore 35-49 = HIGH: cut scores by 40%
      // denialScore 20-34 = MODERATE: cut scores by 20%
      // denialScore 10-19 = MILD: cut scores by 10%
      const penaltyFactor = marriageDenial.denialScore >= 50 ? 0.40
        : marriageDenial.denialScore >= 35 ? 0.60
        : marriageDenial.denialScore >= 20 ? 0.80
        : marriageDenial.denialScore >= 10 ? 0.90
        : 1.0;

      windows.forEach(w => {
        const originalScore = w.score;
        w.score = Math.round(w.score * penaltyFactor);
        w.confidence = w.score >= 50 ? 'Very High' : w.score >= 35 ? 'High' : w.score >= 25 ? 'Medium' : 'Low';
        if (penaltyFactor < 1.0) {
          w.reasons.push(`⚠ Marriage denial penalty applied (denial score ${marriageDenial.denialScore}/100, severity ${marriageDenial.severity}) — score reduced from ${originalScore} to ${w.score}`);
        }
      });

      // Re-sort after penalty
      windows.sort((a, b) => b.score - a.score);
      console.log(`[MarriageTiming] Denial penalty applied: factor ${penaltyFactor}, denialScore ${marriageDenial.denialScore}`);
    }
  } catch (e) {
    console.error('[MarriageTiming] Error in denial assessment:', e.message);
  }

  // ── Confirmed marriage year boost ──
  const confirmedMarriageYear = (opts.maritalStatus === 'married' && opts.marriageYear) ? parseInt(opts.marriageYear, 10) : null;
  if (confirmedMarriageYear && !isNaN(confirmedMarriageYear)) {
    windows.forEach(w => {
      const wStart = new Date(w.start);
      const wEnd = new Date(w.end);
      const startYr = wStart.getUTCFullYear();
      const endYr = wEnd.getUTCFullYear();
      if (confirmedMarriageYear >= startYr && confirmedMarriageYear <= endYr) {
        w.score += 50;
        w.confidence = 'CONFIRMED';
        w.confirmedMarriage = true;
        w.reasons.push(`★ CONFIRMED: Actual marriage in ${confirmedMarriageYear} falls within this dasha window`);
      }
    });
    windows.sort((a, b) => b.score - a.score);
    console.log(`[MarriageTiming] Confirmed marriage year ${confirmedMarriageYear} — boosted matching windows`);
  }

  // ── Build summary ──
  const topWindow = windows[0] || null;
  const top5 = windows.slice(0, 5);

  // First marriage windows: age 18-35 with score >= 30 (threshold accounts for denial penalties)
  const firstMarriageWindows = windows
    .filter(w => {
      const ages = w.ageRange.split('-').map(Number);
      const avgAge = (ages[0] + ages[1]) / 2;
      return avgAge >= 18 && avgAge <= 35 && w.score >= 30;
    })
    .slice(0, 7);

  // ── Find the peak transit year within top windows ──
  // For each first marriage window, find the year with best transit alignment
  firstMarriageWindows.forEach(w => {
    const wStart = new Date(w.start);
    const wEnd = new Date(w.end);
    let bestYear = wStart.getUTCFullYear();
    let bestTransitYearScore = 0;

    for (let yr = wStart.getUTCFullYear(); yr <= wEnd.getUTCFullYear(); yr++) {
      // Check transits at mid-year
      const checkDate = new Date(Date.UTC(yr, 5, 15)); // June 15
      if (checkDate < wStart || checkDate > wEnd) continue;
      try {
        const tp = getAllPlanetPositions(checkDate);
        const jH = ((tp.jupiter.rashiId - (houses[0]?.rashiId || 1) + 12) % 12) + 1;
        const sH = ((tp.saturn.rashiId - (houses[0]?.rashiId || 1) + 12) % 12) + 1;
        let yrScore = 0;
        // Jupiter influence on 7th
        if (jH === 7) yrScore += 12;
        else if ([5, 7, 9].some(a => ((jH - 1 + a - 1) % 12) + 1 === 7)) yrScore += 6;
        // Saturn influence on 7th
        if (sH === 7) yrScore += 6;
        else if ([3, 7, 10].some(a => ((sH - 1 + a - 1) % 12) + 1 === 7)) yrScore += 6;
        // Double transit
        const jT7 = jH === 7 || [5, 7, 9].some(a => ((jH - 1 + a - 1) % 12) + 1 === 7);
        const sT7 = sH === 7 || [3, 7, 10].some(a => ((sH - 1 + a - 1) % 12) + 1 === 7);
        if (jT7 && sT7) yrScore += 10;
        if (yrScore > bestTransitYearScore || (yrScore === bestTransitYearScore && yr > bestYear)) {
          bestTransitYearScore = yrScore;
          bestYear = yr;
        }
      } catch (e) { /* skip */ }
    }
    w.peakYear = bestYear;
  });

  return {
    lagnaSign: lagnaName,
    seventhLord: lord7,
    seventhLordHouse: lord7House,
    venusHouse,
    marriageSignificators: [...marriageSignificators],
    navamshaLord7: navLord7,
    confirmedMarriageYear: confirmedMarriageYear || null,
    maritalStatus: opts.maritalStatus || null,
    kujaDosha: (() => {
      // Check Mars from Lagna AND from Moon (consistent with marriage section)
      const marsH = getPlanetHouse('Mars');
      const moonH = getPlanetHouse('Moon');
      const marsFromMoonDist = marsH && moonH ? ((marsH - moonH + 12) % 12) + 1 : 0;
      const manglikHouses = [1, 2, 4, 7, 8, 12];
      const fromLagna = manglikHouses.includes(marsH);
      const fromMoon = manglikHouses.includes(marsFromMoonDist);
      const present = fromLagna || fromMoon;

      // ── Kuja Dosha cancellation rules (classical texts) ──
      let cancelled = false;
      const cancellationReasons = [];
      if (present) {
        // 1. Mars in own sign (Aries/Scorpio) — self-strength cancels
        const marsRashiId = houses.find(h => h.planets.some(p => p.name === 'Mars'))?.rashiId;
        if (marsRashiId && [1, 8].includes(marsRashiId)) { // Mesha=1, Vrischika=8
          cancelled = true;
          cancellationReasons.push('Mars in own sign (Aries/Scorpio)');
        }
        // 2. Mars in exaltation (Capricorn, rashiId=10)
        if (marsRashiId === 10) {
          cancelled = true;
          cancellationReasons.push('Mars exalted in Capricorn');
        }
        // 3. Jupiter/Venus aspects or conjoins Mars — benefic influence
        const jupH = getPlanetHouse('Jupiter');
        const venH = getPlanetHouse('Venus');
        if (jupH === marsH) { cancelled = true; cancellationReasons.push('Jupiter conjoins Mars'); }
        if (venH === marsH) { cancelled = true; cancellationReasons.push('Venus conjoins Mars'); }
        // Jupiter aspects (5th, 7th, 9th) — check distance from Jupiter to Mars
        if (jupH && marsH) {
          const jupToMars = ((marsH - jupH + 12) % 12) + 1;
          if ([5, 7, 9].includes(jupToMars)) {
            cancelled = true;
            cancellationReasons.push('Jupiter aspects Mars (' + jupToMars + 'th aspect)');
          }
        }
        // 4. Mars in H1 and the sign is Aries/Leo/Aquarius
        if (marsH === 1 && marsRashiId && [1, 5, 11].includes(marsRashiId)) {
          cancelled = true;
          cancellationReasons.push('Mars in Lagna in Aries/Leo/Aquarius');
        }
        // 5. Mars in H7 and sign is Cancer/Capricorn
        if (marsH === 7 && marsRashiId && [4, 10].includes(marsRashiId)) {
          cancelled = true;
          cancellationReasons.push('Mars in 7th in Cancer/Capricorn');
        }
        // 6. Mars in H8 and sign is Sagittarius/Pisces
        if (marsH === 8 && marsRashiId && [9, 12].includes(marsRashiId)) {
          cancelled = true;
          cancellationReasons.push('Mars in 8th in Sagittarius/Pisces');
        }
        // 7. Spouse also has Kuja Dosha — mutual cancellation (checked at Porondam level, not here)
      }

      return {
        present,
        cancelled,
        cancellationReasons,
        fromLagna,
        fromMoon,
        marsHouse: marsH,
        marsFromMoon: marsFromMoonDist,
        severity: !present ? 'None' : cancelled ? 'Cancelled' : (fromLagna && [7, 8].includes(marsH)) ? 'High' : (fromLagna && [1, 4].includes(marsH)) ? 'Moderate' : 'Mild',
      };
    })(),
    // ── NEW: Marriage denial/affliction data ──
    marriageDenial: marriageDenial || null,
    predictedWindows: top5,
    firstMarriageWindows,
    // ── AGE-AWARE BEST WINDOW SELECTION ──
    // Current age calculation
    currentAge: (() => {
      const now = new Date();
      const ageYears = (now - date) / (365.25 * 24 * 60 * 60 * 1000);
      return Math.floor(ageYears);
    })(),
    // Find the BEST window that's still relevant for this person's age
    // Rules:
    //   1. If person is 25+, the "best" window should be UPCOMING, not past
    //   2. If person is likely already married (age 28+), past windows should explain what happened
    //   3. Never pick a window that ended years ago as "best" for an older person
    bestWindow: (() => {
      const now = new Date();
      const currentAge = (now - date) / (365.25 * 24 * 60 * 60 * 1000);
      
      // If confirmed married, the best window is the one containing their marriage year
      if (confirmedMarriageYear) {
        const confirmedWindow = windows.find(w => w.confirmedMarriage);
        if (confirmedWindow) {
          return {
            period: `${confirmedWindow.mahadasha}-${confirmedWindow.antardasha}`,
            dateRange: `${confirmedWindow.start} to ${confirmedWindow.end}`,
            ageRange: confirmedWindow.ageRange,
            confidence: 'CONFIRMED',
            score: confirmedWindow.score,
            status: 'CONFIRMED_MARRIAGE',
          };
        }
      }
      
      // For unmarried people age 25+, prioritize UPCOMING windows
      if (currentAge >= 25) {
        // Filter windows that haven't ended yet
        const upcomingWindows = windows.filter(w => {
          const endDate = new Date(w.end);
          return endDate > now && w.score >= 25;
        }).sort((a, b) => b.score - a.score);
        
        // Also find windows currently active (started but not ended)
        const activeWindows = windows.filter(w => {
          const startDate = new Date(w.start);
          const endDate = new Date(w.end);
          return startDate <= now && endDate >= now && w.score >= 25;
        }).sort((a, b) => b.score - a.score);
        
        // Prefer active window if it has a good score
        if (activeWindows.length > 0 && activeWindows[0].score >= 35) {
          return {
            period: `${activeWindows[0].mahadasha}-${activeWindows[0].antardasha}`,
            dateRange: `${activeWindows[0].start} to ${activeWindows[0].end}`,
            ageRange: activeWindows[0].ageRange,
            confidence: activeWindows[0].confidence,
            score: activeWindows[0].score,
            status: 'ACTIVE_NOW',
          };
        }
        
        // Otherwise, the best upcoming window
        if (upcomingWindows.length > 0) {
          return {
            period: `${upcomingWindows[0].mahadasha}-${upcomingWindows[0].antardasha}`,
            dateRange: `${upcomingWindows[0].start} to ${upcomingWindows[0].end}`,
            ageRange: upcomingWindows[0].ageRange,
            confidence: upcomingWindows[0].confidence,
            score: upcomingWindows[0].score,
            status: 'UPCOMING',
          };
        }
        
        // If person is 35+ with no upcoming strong windows, they may have missed prime windows
        if (currentAge >= 35) {
          const pastWindows = windows.filter(w => new Date(w.end) < now && w.score >= 40)
            .sort((a, b) => b.score - a.score);
          if (pastWindows.length > 0) {
            return {
              period: `${pastWindows[0].mahadasha}-${pastWindows[0].antardasha}`,
              dateRange: `${pastWindows[0].start} to ${pastWindows[0].end}`,
              ageRange: pastWindows[0].ageRange,
              confidence: pastWindows[0].confidence,
              score: pastWindows[0].score,
              status: 'PAST_PRIME_WINDOW',
              note: 'This person\'s strongest marriage window has passed. They may already be married, or marriage may have been delayed. Check current transits for opportunities.',
            };
          }
        }
      }
      
      // For younger people (under 25), just return the top-scoring window
      if (topWindow) {
        return {
          period: `${topWindow.mahadasha}-${topWindow.antardasha}`,
          dateRange: `${topWindow.start} to ${topWindow.end}`,
          ageRange: topWindow.ageRange,
          confidence: topWindow.confidence,
          score: topWindow.score,
          status: currentAge < 22 ? 'FUTURE' : 'APPROACHING',
        };
      }
      
      return null;
    })(),
    // Separate past, active, and future windows for AI to use correctly
    windowsByTimeStatus: (() => {
      const now = new Date();
      return {
        past: windows.filter(w => new Date(w.end) < now).slice(0, 5),
        active: windows.filter(w => new Date(w.start) <= now && new Date(w.end) >= now),
        future: windows.filter(w => new Date(w.start) > now).slice(0, 5),
      };
    })(),
    allWindows: windows,
    debug: {
      totalWindowsScanned: dasaPeriods.reduce((sum, d) => sum + (d.antardashas?.length || 0), 0),
      windowsAboveThreshold: windows.length,
      dispositorOfRahu: rahuDispositor,
      dispositorOfKetu: ketuDispositor,
      dispositorOf7thLord: dispositorOf7thLord,
    },
  };
}

// ── Helper: get Jupiter's tropical longitude ──
function getJupiterLongitude(date) {
  try {
    const { Body } = require('astronomia/planetary');
    const { base, julian, solar } = require('astronomia');
    const jd = julian.CalendarGregorianToJD(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate() + date.getUTCHours() / 24);
    const T = (jd - 2451545.0) / 36525;
    // Jupiter mean longitude (simplified Meeus)
    let L = 34.351519 + 3034.9056746 * T;
    L = L % 360;
    if (L < 0) L += 360;
    return L;
  } catch (e) {
    // Fallback: use ephemeris package
    try {
      const allPositions = getAllPlanetPositions(date);
      const jup = allPositions.find(p => p.name === 'Jupiter');
      return jup ? jup.longitude : 0;
    } catch (e2) {
      return 0;
    }
  }
}

// ── Helper: get Saturn's tropical longitude ──
function getSaturnLongitude(date) {
  try {
    const { julian } = require('astronomia');
    const jd = julian.CalendarGregorianToJD(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate() + date.getUTCHours() / 24);
    const T = (jd - 2451545.0) / 36525;
    // Saturn mean longitude (simplified Meeus)
    let L = 50.077444 + 1222.1138488 * T;
    L = L % 360;
    if (L < 0) L += 360;
    return L;
  } catch (e) {
    try {
      const allPositions = getAllPlanetPositions(date);
      const sat = allPositions.find(p => p.name === 'Saturn');
      return sat ? sat.longitude : 0;
    } catch (e2) {
      return 0;
    }
  }
}

// ── Helper: get Rahu's tropical longitude ──
function getRahuLongitude(date) {
  try {
    const allPositions = getAllPlanetPositions(date);
    return allPositions.rahu.sidereal;
  } catch (e) {
    const jd = dateToJD(date);
    const T = (jd - 2451545.0) / 36525;
    let omega = 125.04452 - 1934.136261 * T;
    omega = ((omega % 360) + 360) % 360;
    const ayanamsha = getAyanamsha(date);
    return ((omega - ayanamsha) % 360 + 360) % 360;
  }
}

/**
 * Calculate Vimshottari Dasha periods
 * @param {number} moonLongitude - Sidereal longitude of Moon
 * @param {Date} birthDate - Birth date
 * @returns {Array} List of major periods with end dates
 */
function calculateVimshottari(moonLongitude, birthDate) {
  const DASA_LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
  const DASA_YEARS = { 'Ketu': 7, 'Venus': 20, 'Sun': 6, 'Moon': 10, 'Mars': 7, 'Rahu': 18, 'Jupiter': 16, 'Saturn': 19, 'Mercury': 17 };
  
  // Find Nakshatra and position within it
  const nakshatraSpan = 13.333333; // 13 degrees 20 minutes
  const nakshatraIndex = Math.floor(moonLongitude / nakshatraSpan);
  const degreesInNakshatra = moonLongitude % nakshatraSpan;
  const percentagePassed = degreesInNakshatra / nakshatraSpan;
  const percentageRemaining = 1 - percentagePassed;
  
  // Nakshatra Lords sequence maps to DASA_LORDS based on index % 9
  // Ashwini (0) -> Ketu (0)
  // Bharani (1) -> Venus (1)
  // ...
  const startDasaIndex = nakshatraIndex % 9;
  const startLord = DASA_LORDS[startDasaIndex];
  const startTotalYears = DASA_YEARS[startLord];
  const balanceYears = startTotalYears * percentageRemaining;
  
  const periods = [];
  let currentDate = new Date(birthDate);
  
  // First period (balance)
  currentDate.setFullYear(currentDate.getFullYear() + Math.floor(balanceYears));
  // Add remaining months/days purely by proportion for simplicity or just use float years
  const remainingDays = (balanceYears % 1) * 365.25;
  currentDate.setDate(currentDate.getDate() + remainingDays);
  
  periods.push({
    type: 'Mahadasha',
    lord: startLord,
    start: birthDate.toISOString().split('T')[0],
    endDate: currentDate.toISOString().split('T')[0],
    years: balanceYears
  });
  
  // Next periods
  for (let i = 1; i < 9; i++) {
    const idx = (startDasaIndex + i) % 9;
    const lord = DASA_LORDS[idx];
    const duration = DASA_YEARS[lord];
    
    // Add duration to current date
    const startDate = new Date(currentDate);
    currentDate.setFullYear(currentDate.getFullYear() + duration);
    
    periods.push({
      type: 'Mahadasha',
      lord: lord,
      start: startDate.toISOString().split('T')[0],
      endDate: currentDate.toISOString().split('T')[0],
      years: duration
    });
  }
  
  return periods;
}

/**
 * Generate a static report based on chart data
 * Returns structured Insights manually generated (deterministic)
 */
function generateDetailedReport(lagna, moonSign, sunSign, houses) {
  // Helper to find planet house
  const getPlanetHouse = (planetName) => {
    return houses.findIndex(h => h.planets.some(p => p.name === planetName)) + 1;
  };
  
  const getHouseLord = (houseNum) => {
    return houses[houseNum-1]?.rashiLord || 'Unknown';
  };

  const fireSigns = ['Mesha', 'Simha', 'Dhanu'];
  const earthSigns = ['Vrishabha', 'Kanya', 'Makara'];
  const airSigns = ['Mithuna', 'Tula', 'Kumbha'];
  const waterSigns = ['Kataka', 'Vrischika', 'Meena'];
  
  let character = `You are born with ${lagna.english} Lagna. `;
  if (fireSigns.includes(lagna.name)) character += "You have a fiery, energetic, and leadership-oriented personality. ";
  else if (earthSigns.includes(lagna.name)) character += "You are practical, grounded, and value stability. ";
  else if (airSigns.includes(lagna.name)) character += "You are intellectual, communicative, and social. ";
  else character += "You are emotional, intuitive, and sensitive. ";
  
  character += `Your mind (Moon) is in ${moonSign.english}, making you feel things deeply. `;
  
  const lord7 = getHouseLord(7);
  const planetsIn7 = houses[6].planets.map(p => p.name).join(', ');
  let marriage = `The 7th house is ruled by ${lord7}. `;
  if (planetsIn7) marriage += `With ${planetsIn7} in the house of marriage, relationships are a key focus. `;
  else marriage += "The 7th house has no planets, indicating the ruler's position is most important. ";
  
  const lord2 = getHouseLord(2);
  const lord11 = getHouseLord(11);
  const lord10 = getHouseLord(10);
  
  let wealth = `Wealth: Governed by ${lord2} (Accumulation) and ${lord11} (Gains). `;
  wealth += `Career: Your 10th house of profession is ruled by ${lord10}. `;
  
  if (['Sun', 'Mars', 'Jupiter'].includes(lord10)) {
     wealth += "Planetary influences suggest potential for leadership or independent business. ";
  } else {
     wealth += "You may excel in service-oriented or stable professional roles. ";
  }

  const lord5 = getHouseLord(5);
  let children = `The 5th house of creativity and children is ruled by ${lord5}. `;
  
  const deepInsights = {
    'Education': `4th House Lord is ${getHouseLord(4)}. Mercury is in House ${getPlanetHouse('Mercury')}. Good for analytical subjects.`,
    'Property': `4th House governs home. Mars in House ${getPlanetHouse('Mars')} influences land ownership.`,
    'LuckyGem': lagna.name === 'Mesha' ? 'Red Coral' : lagna.name === 'Vrishabha' ? 'Diamond' : 'Consult an astrologer',
    'LuckyColor': lagna.name === 'Mesha' ? 'Red' : lagna.name === 'Vrishabha' ? 'White' : 'Yellow',
  };
  
  return {
    character,
    marriage,
    wealth,
    children,
    future: "Your current Dasa period will determine the specific timing of events. Check the timeline below.",
    deepInsights
  };
}

// ═══════════════════════════════════════════════════════════════════════
// COMPREHENSIVE JYOTISH REPORT ENGINE
// Based on: BPHS (Brihat Parashara Hora Shastra), Phaladeepika,
//           Jataka Parijata, Sri Lankan Nimithi tradition
// ═══════════════════════════════════════════════════════════════════════

/**
 * House significance data — what each bhava governs (BPHS Ch.11)
 */
const HOUSE_SIGNIFICATIONS = {
  1: { name: 'Tanu Bhava', sinhala: 'තනු භාවය', governs: 'Self, body, personality, health, head, appearance, temperament' },
  2: { name: 'Dhana Bhava', sinhala: 'ධන භාවය', governs: 'Wealth, family, speech, food, right eye, face, early education' },
  3: { name: 'Sahaja Bhava', sinhala: 'සහජ භාවය', governs: 'Siblings, courage, short journeys, communication, arms, ears' },
  4: { name: 'Bandhu Bhava', sinhala: 'බන්ධු භාවය', governs: 'Mother, home, land, vehicles, education, chest, emotional happiness' },
  5: { name: 'Putra Bhava', sinhala: 'පුත්‍ර භාවය', governs: 'Children, intelligence, creativity, romance, past-life merit, stomach' },
  6: { name: 'Ari Bhava', sinhala: 'අරි භාවය', governs: 'Enemies, debts, disease, service, maternal uncle, digestive system' },
  7: { name: 'Yuvati Bhava', sinhala: 'යුවතී භාවය', governs: 'Marriage, spouse, partnerships, business, reproductive organs' },
  8: { name: 'Randhra Bhava', sinhala: 'රන්ධ්‍ර භාවය', governs: 'Longevity, obstacles, inheritance, occult, chronic illness, transformation' },
  9: { name: 'Dharma Bhava', sinhala: 'ධර්ම භාවය', governs: 'Fortune, father, guru, dharma, higher learning, long journeys, thighs' },
  10: { name: 'Karma Bhava', sinhala: 'කර්ම භාවය', governs: 'Career, profession, status, government, authority, knees' },
  11: { name: 'Labha Bhava', sinhala: 'ලාභ භාවය', governs: 'Gains, income, elder siblings, aspirations, friends, ankles' },
  12: { name: 'Vyaya Bhava', sinhala: 'ව්‍යය භාවය', governs: 'Expenses, losses, foreign lands, liberation, feet, sleep, left eye' },
};

/**
 * Planet natural significations (Naisargika Karakattwa)
 */
const PLANET_KARAKAS = {
  'Sun':     { karaka: 'Atma (Soul)', governs: 'Father, authority, government, vitality, ego, right eye, heart', gem: 'Ruby (මාණික්‍ය)', color: 'Copper/Red', day: 'Sunday' },
  'Moon':    { karaka: 'Manas (Mind)', governs: 'Mother, mind, emotions, public, fluids, left eye, blood', gem: 'Pearl (මුතු)', color: 'White', day: 'Monday' },
  'Mars':    { karaka: 'Bhumi (Land)', governs: 'Siblings, courage, property, surgery, police/military, blood, muscles', gem: 'Red Coral (රතු පබළු)', color: 'Red', day: 'Tuesday' },
  'Mercury': { karaka: 'Vidya (Knowledge)', governs: 'Education, speech, trade, intellect, friends, skin, nervous system', gem: 'Emerald (මරකත)', color: 'Green', day: 'Wednesday' },
  'Jupiter': { karaka: 'Jnana (Wisdom)', governs: 'Guru, children, wealth, dharma, husband (for women), liver, fat', gem: 'Yellow Sapphire (පුෂ්පරාග)', color: 'Yellow', day: 'Thursday' },
  'Venus':   { karaka: 'Kama (Desire)', governs: 'Wife (for men), marriage, luxury, vehicles, art, kidneys, reproductive', gem: 'Diamond (දියමන්ති)', color: 'White/Rainbow', day: 'Friday' },
  'Saturn':  { karaka: 'Ayus (Longevity)', governs: 'Discipline, service, delay, sorrow, old age, bones, teeth, chronic disease', gem: 'Blue Sapphire (නිල මැණික)', color: 'Black/Blue', day: 'Saturday' },
  'Rahu':    { karaka: 'Maya (Illusion)', governs: 'Foreign, unconventional, obsession, technology, poison, paternal grandfather', gem: 'Hessonite (ගෝමේද)', color: 'Smoke/Ultraviolet', day: 'Saturday' },
  'Ketu':    { karaka: 'Moksha (Liberation)', governs: 'Spirituality, detachment, past life, occult, maternal grandfather', gem: 'Cat\'s Eye (වෛඩූර්ය)', color: 'Grey/Brown', day: 'Tuesday' },
};

/**
 * Functional benefic/malefic determination for each Lagna (BPHS Ch.34)
 */
const FUNCTIONAL_STATUS = {
  'Mesha':     { yogaKaraka: null, benefics: ['Sun','Moon','Jupiter'], malefics: ['Mercury','Venus'], neutrals: ['Saturn','Mars'] },
  'Vrishabha': { yogaKaraka: 'Saturn', benefics: ['Sun','Mercury','Saturn'], malefics: ['Jupiter','Moon','Venus'], neutrals: ['Mars'] },
  'Mithuna':   { yogaKaraka: null, benefics: ['Venus','Saturn'], malefics: ['Mars','Jupiter','Sun'], neutrals: ['Moon','Mercury'] },
  'Kataka':    { yogaKaraka: 'Mars', benefics: ['Moon','Mars','Jupiter'], malefics: ['Venus','Saturn','Mercury'], neutrals: ['Sun'] },
  'Simha':     { yogaKaraka: 'Mars', benefics: ['Sun','Mars','Jupiter'], malefics: ['Venus','Saturn','Mercury'], neutrals: ['Moon'] },
  'Kanya':     { yogaKaraka: null, benefics: ['Mercury','Venus'], malefics: ['Mars','Moon','Jupiter'], neutrals: ['Sun','Saturn'] },
  'Tula':      { yogaKaraka: 'Saturn', benefics: ['Venus','Mercury','Saturn'], malefics: ['Sun','Mars','Jupiter'], neutrals: ['Moon'] },
  'Vrischika': { yogaKaraka: null, benefics: ['Moon','Jupiter','Sun'], malefics: ['Mercury','Venus','Saturn'], neutrals: ['Mars'] },
  'Dhanus':    { yogaKaraka: null, benefics: ['Sun','Mars','Jupiter'], malefics: ['Venus','Saturn','Mercury'], neutrals: ['Moon'] },
  'Makara':    { yogaKaraka: 'Venus', benefics: ['Venus','Mercury','Saturn'], malefics: ['Mars','Moon','Jupiter'], neutrals: ['Sun'] },
  'Kumbha':    { yogaKaraka: 'Venus', benefics: ['Venus','Saturn'], malefics: ['Moon','Mars','Jupiter'], neutrals: ['Sun','Mercury'] },
  'Meena':     { yogaKaraka: null, benefics: ['Moon','Mars','Jupiter'], malefics: ['Sun','Mercury','Venus','Saturn'], neutrals: [] },
};

/**
 * Career significations by planet ruling or placed in 10th house
 */
// NOTE: Career/education predictions are NOT hardcoded here.
// The engine provides ONLY technical astrological data (planets, houses, dignities, strengths).
// The AI interprets this data to make career/education predictions.
// This avoids wrong defaults like "medicine" for every Sun-influenced chart.

/**
 * Dasha effects for each planet as Mahadasha lord (simplified BPHS/Phaladeepika)
 */
const DASHA_EFFECTS = {
  'Sun': {
    general: 'Government favor, fame, authority gains, health vitality. Possible ego conflicts and father-related events.',
    sinhala: 'රාජ්‍ය අනුග්‍රහය, කීර්තිය, බලය ලැබීම. පිය සම්බන්ධ සිදුවීම්.',
    career: 'Promotion, government job, leadership role',
    health: 'Heart, eyes, bones — may need attention',
    relationship: 'Dominance in relationships, respect from spouse',
  },
  'Moon': {
    general: 'Emotional growth, mother\'s influence, travel, public popularity, mental peace or disturbance based on Moon\'s strength.',
    sinhala: 'මානසික වර්ධනය, මව්ගේ බලපෑම, ගමන්, ජනප්‍රියත්වය.',
    career: 'Public-facing roles, transfers, liquid investments',
    health: 'Mental health, blood, fluids, sleep issues',
    relationship: 'Deep emotional bonds, possible mood swings affecting family',
  },
  'Mars': {
    general: 'Energy, courage, property acquisition, sibling matters. Risk of accidents, surgery, or conflicts.',
    sinhala: 'ශක්තිය, ධෛර්යය, දේපළ ලැබීම. අනතුරු, ශල්‍ය කර්ම අවදානම.',
    career: 'Technical roles, property dealings, competitive success',
    health: 'Blood pressure, injuries, fever, inflammation',
    relationship: 'Passionate but possible arguments, sibling events',
  },
  'Mercury': {
    general: 'Education, business growth, communication skills, intellectual pursuits. Travel and trade flourish.',
    sinhala: 'අධ්‍යාපනය, ව්‍යාපාර වර්ධනය, බුද්ධිමය කටයුතු. වෙළඳාම සමෘද්ධි.',
    career: 'Business expansion, writing, commerce, education sector',
    health: 'Nervous system, skin, respiratory issues',
    relationship: 'Good communication, friendships, networking',
  },
  'Jupiter': {
    general: 'Wisdom, wealth accumulation, spiritual growth, children events, guru blessings. Most auspicious period.',
    sinhala: 'ප්‍රඥාව, ධන සමුච්චය, ආධ්‍යාත්මික වර්ධනය, දරු සම්පත්.',
    career: 'Major promotions, wealth gain, banking, teaching, legal success',
    health: 'Liver, obesity, diabetes risk — but generally healthy period',
    relationship: 'Marriage, children, guru-disciple bonds, domestic happiness',
  },
  'Saturn': {
    general: 'Hard work, discipline, karma lessons, delays then gains. Property through effort, elder support.',
    sinhala: 'වෙහෙස, විනය, කර්ම පාඩම්, ප්‍රමාදය නමුත් ලාභ. දේපළ.',
    career: 'Slow but steady rise, labor-intensive roles, authority through perseverance',
    health: 'Joint pain, teeth, chronic conditions, aging effects',
    relationship: 'Delayed marriage or responsibilities, loyalty tested',
  },
  'Venus': {
    general: 'Luxury, romance, art, vehicles, marriage, comfort. Material abundance and sensual pleasures.',
    sinhala: 'සුඛෝපභෝගය, ප්‍රේමය, කලාව, වාහන, විවාහය. භෞතික සමෘද්ධිය.',
    career: 'Entertainment, beauty, luxury business, creative arts success',
    health: 'Reproductive system, kidneys, blood sugar',
    relationship: 'Marriage, romance, beauty, domestic harmony',
  },
  'Rahu': {
    general: 'Sudden gains/losses, foreign connections, unconventional paths, technology, obsessions. Illusion & ambition.',
    sinhala: 'හදිසි ලාභ/අලාභ, විදේශ සම්බන්ධතා, අසාමාන්‍ය මාර්ග, තාක්ෂණය.',
    career: 'Foreign job, IT/tech, research, sudden career change',
    health: 'Mysterious ailments, poison, mental anxiety, addictions',
    relationship: 'Unconventional relationships, foreign spouse possible',
  },
  'Ketu': {
    general: 'Spiritual awakening, detachment, past-life karma, mystical experiences. Losses leading to growth.',
    sinhala: 'ආධ්‍යාත්මික අවබෝධය, විරාගය, පෙර කර්ම, අභිරහස් අත්දැකීම්.',
    career: 'Spiritual vocation, research, sudden changes, endings',
    health: 'Mysterious diseases, surgery, past-life health karma',
    relationship: 'Detachment, separation risk, spiritual partner',
  },
};

/**
 * Helper: Determine functional relationship of a planet for a given Lagna
 */
function getFunctionalNature(lagnaName, planetName) {
  const status = FUNCTIONAL_STATUS[lagnaName];
  if (!status) return 'neutral';
  if (status.yogaKaraka === planetName) return 'yogaKaraka';
  if (status.benefics.includes(planetName)) return 'benefic';
  if (status.malefics.includes(planetName)) return 'malefic';
  return 'neutral';
}

/**
 * Calculate Vimshottari Dasha with Antardashas (sub-periods)
 * Returns Mahadasha + Antardasha breakdown
 */
function calculateVimshottariDetailed(moonLongitude, birthDate) {
  const DASA_LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
  const DASA_YEARS = { 'Ketu': 7, 'Venus': 20, 'Sun': 6, 'Moon': 10, 'Mars': 7, 'Rahu': 18, 'Jupiter': 16, 'Saturn': 19, 'Mercury': 17 };
  const TOTAL_YEARS = 120;

  const nakshatraSpan = 13.333333;
  const nakshatraIndex = Math.floor(moonLongitude / nakshatraSpan);
  const degreesInNakshatra = moonLongitude % nakshatraSpan;
  const percentageRemaining = 1 - (degreesInNakshatra / nakshatraSpan);

  const startDasaIndex = nakshatraIndex % 9;

  // Helper to add fractional years to a date precisely
  const addYears = (date, years) => {
    const d = new Date(date);
    const days = years * 365.25;
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    return d;
  };

  const periods = [];
  let currentDate = new Date(birthDate);

  for (let i = 0; i < 9; i++) {
    const idx = (startDasaIndex + i) % 9;
    const lord = DASA_LORDS[idx];
    const totalYears = DASA_YEARS[lord];
    const duration = i === 0 ? totalYears * percentageRemaining : totalYears;

    const startDate = new Date(currentDate);
    const endDate = addYears(currentDate, duration);

    // Calculate Antardashas within this Mahadasha
    const antardashas = [];
    let adDate = new Date(startDate);
    for (let j = 0; j < 9; j++) {
      const adIdx = (idx + j) % 9;
      const adLord = DASA_LORDS[adIdx];
      const adYears = (DASA_YEARS[lord] * DASA_YEARS[adLord]) / TOTAL_YEARS;
      const adDuration = i === 0 ? adYears * percentageRemaining : adYears;
      // For the first mahadasha, only include antardashas that haven't passed
      // Actually, all antardashas proportionally shrink for the first period
      const adStart = new Date(adDate);
      const adEnd = addYears(adDate, i === 0 ? adDuration : adYears);

      antardashas.push({
        lord: adLord,
        start: adStart.toISOString().split('T')[0],
        endDate: adEnd.toISOString().split('T')[0],
        years: i === 0 ? adDuration : adYears,
      });
      adDate = adEnd;
    }

    periods.push({
      type: 'Mahadasha',
      lord,
      start: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      years: duration,
      effects: DASHA_EFFECTS[lord] || {},
      antardashas,
    });

    currentDate = endDate;
  }

  return periods;
}

/**
 * Analyze a specific house deeply
 * Now includes: Ashtakavarga bindus, Bhava Chalit planet shifts,
 *               Lord dignity, aspect quality scoring
 * @param {number} houseNum - 1-12
 * @param {Array} houses - D1 house chart
 * @param {Object} planets - All planet positions
 * @param {Object} drishtis - Planetary aspects
 * @param {string} lagnaName - Lagna rashi name
 * @param {Object} [ashtakavargaData] - Ashtakavarga data (optional)
 * @param {Object} [bhavaChalitData] - Bhava Chalit data (optional)
 * @returns {Object} Deep analysis of the house
 */
function analyzeHouse(houseNum, houses, planets, drishtis, lagnaName, ashtakavargaData, bhavaChalitData) {
  const house = houses[houseNum - 1];
  if (!house) return null;

  const rashiLord = house.rashiLord || RASHIS[(house.rashiId || 1) - 1]?.lord || 'Unknown';
  const planetsInHouse = house.planets.filter(p => !['Lagna'].includes(p.name));
  const planetNames = planetsInHouse.map(p => p.name);

  // Find which house the lord sits in
  const lordHouse = houses.findIndex(h => h.planets.some(p => p.name === rashiLord)) + 1;

  // Aspects on this house
  const aspectingPlanets = drishtis?.houseAspectedBy?.[houseNum] || [];

  // ── Ashtakavarga integration (SAV bindus for this house) ──
  let ashtakavargaBindus = null;
  let ashtakavargaQuality = null;
  if (ashtakavargaData?.sarvashtakavarga) {
    // sarvashtakavarga is keyed by rashi name — get the rashi name for this house
    const houseRashiName = RASHIS[(house.rashiId || 1) - 1]?.name;
    if (houseRashiName) {
      ashtakavargaBindus = ashtakavargaData.sarvashtakavarga[houseRashiName] || null;
    }
    if (ashtakavargaBindus !== null) {
      if (ashtakavargaBindus >= 30) ashtakavargaQuality = 'excellent';
      else if (ashtakavargaBindus >= 27) ashtakavargaQuality = 'good';
      else if (ashtakavargaBindus >= 22) ashtakavargaQuality = 'moderate';
      else ashtakavargaQuality = 'weak';
    }
  }

  // ── Bhava Chalit planet shifts ──
  let chalitShifts = [];
  if (bhavaChalitData?.planetShifts) {
    chalitShifts = bhavaChalitData.planetShifts.filter(
      s => s.wholeSignHouse === houseNum || s.chalitHouse === houseNum
    );
  }

  // Strength assessment — multi-factor
  let strengthScore = 50; // Start neutral
  const lordNature = getFunctionalNature(lagnaName, rashiLord);

  // Factor 1: Lord's functional nature
  if (lordNature === 'yogaKaraka') strengthScore += 20;
  else if (lordNature === 'benefic') strengthScore += 10;
  else if (lordNature === 'malefic') strengthScore -= 10;

  // Factor 2: Lord's house placement (from this house's perspective)
  if (lordHouse) {
    const dist = ((lordHouse - houseNum + 12) % 12) + 1;
    if ([1, 4, 7, 10].includes(dist)) strengthScore += 15; // Kendra from house
    else if ([5, 9].includes(dist)) strengthScore += 10;   // Trikona from house
    else if ([6, 8, 12].includes(dist)) strengthScore -= 15; // Dusthana from house
  }

  // Factor 3: Planets in house
  const beneficsIn = planetNames.filter(p => getFunctionalNature(lagnaName, p) === 'benefic' || getFunctionalNature(lagnaName, p) === 'yogaKaraka');
  const maleficsIn = planetNames.filter(p => getFunctionalNature(lagnaName, p) === 'malefic');
  strengthScore += beneficsIn.length * 8;
  strengthScore -= maleficsIn.length * 6;

  // Factor 4: Aspects — benefic aspects help, malefic aspects hurt
  let beneficAspects = 0, maleficAspects = 0;
  for (const asp of aspectingPlanets) {
    const aspNature = getFunctionalNature(lagnaName, asp.planet);
    if (aspNature === 'benefic' || aspNature === 'yogaKaraka' || asp.planet === 'Jupiter') beneficAspects++;
    if (aspNature === 'malefic') maleficAspects++;
  }
  strengthScore += beneficAspects * 5;
  strengthScore -= maleficAspects * 4;

  // Factor 5: Ashtakavarga bindus
  if (ashtakavargaBindus !== null) {
    if (ashtakavargaBindus >= 30) strengthScore += 10;
    else if (ashtakavargaBindus >= 27) strengthScore += 5;
    else if (ashtakavargaBindus < 22) strengthScore -= 8;
  }

  // Convert score to label
  strengthScore = Math.max(0, Math.min(100, strengthScore));
  let strength = 'moderate';
  if (strengthScore >= 75) strength = 'very strong';
  else if (strengthScore >= 60) strength = 'strong';
  else if (strengthScore <= 30) strength = 'weak';
  else if (strengthScore <= 45) strength = 'challenged';

  return {
    houseNumber: houseNum,
    signification: HOUSE_SIGNIFICATIONS[houseNum],
    rashi: house.rashi,
    rashiEnglish: house.rashiEnglish,
    rashiLord,
    lordHouse,
    planetsInHouse: planetNames,
    aspectingPlanets,
    strength,
    strengthScore,
    lordNature,
    beneficsIn,
    maleficsIn,
    // ── New fields ──
    ashtakavargaBindus,
    ashtakavargaQuality,
    beneficAspectCount: beneficAspects,
    maleficAspectCount: maleficAspects,
    chalitShifts: chalitShifts.length > 0 ? chalitShifts : null,
  };
}

/**
 * Generate comprehensive Jyotish report
 * This is the master report function that produces a full professional-grade reading
 * 
 * @param {Date} birthDate
 * @param {number} lat
 * @param {number} lng
 * @returns {Object} Complete structured report with all 12 sections
 */
function generateFullReport(birthDate, lat = 6.9271, lng = 79.8612, opts = {}) {
  // ── Gather all chart data ──────────────────────────────────────
  const date = new Date(birthDate);
  const lagna = getLagna(date, lat, lng);
  const lagnaName = lagna.rashi.name;
  const moonSidereal = toSidereal(getMoonLongitude(date), date);
  const sunSidereal = toSidereal(getSunLongitude(date), date);
  const moonRashi = getRashi(moonSidereal);
  const sunRashi = getRashi(sunSidereal);
  const moonNakshatra = getNakshatra(moonSidereal);
  const houseChart = buildHouseChart(date, lat, lng);
  const houses = houseChart.houses;
  const planets = houseChart.planets;
  const navamsha = buildNavamshaChart(date, lat, lng);
  const drishtis = calculateDrishtis(houses);
  const ashtakavarga = calculateAshtakavarga(date, lat, lng);
  const bhavaChalit = buildBhavaChalit(date, lat, lng);
  const yogas = detectYogas(date, lat, lng);
  const planetStrengths = getPlanetStrengths(date, lat, lng);
  const panchanga = getPanchanga(date, lat, lng);
  const dasaPeriods = calculateVimshottariDetailed(moonSidereal, date);
  const functionalStatus = FUNCTIONAL_STATUS[lagnaName] || {};

  // ── Lifespan-aware period filter ───────────────────────────────
  // Filters out dasha periods whose MIDPOINT exceeds age 80 (unrealistic predictions)
  // Extended from 75 to 80 to give more future predictions for younger users
  const birthYear = date.getUTCFullYear();
  const maxYear = birthYear + 80;
  const lifespanFilter = (periods) => periods.filter(p => {
    const startStr = p.start || (p.period ? p.period.split(' to ')[0] : '');
    const endStr = p.endDate || p.end || (p.period ? p.period.split(' to ')[1] : '');
    if (!startStr) return true;
    const startYear = parseInt(startStr.substring(0, 4), 10);
    if (isNaN(startYear)) return true;
    // Must start before max age
    if (startYear > maxYear) return false;
    // If end date available, check midpoint doesn't exceed max age
    if (endStr) {
      const endYear = parseInt(endStr.trim().substring(0, 4), 10);
      if (!isNaN(endYear)) {
        const midpoint = (startYear + endYear) / 2;
        return midpoint <= maxYear;
      }
    }
    return true;
  });

  // ── Advanced data for accuracy enrichment ──────────────────────
  // Import precision data from advanced engine to enrich raw section data
  let advancedShadbala = null;
  let jaiminiKarakas = null;
  let extendedVargas = null;
  let advancedYogas = null;
  let advancedDoshas = null;
  let kpSubLords = null;
  let nadiAmsha = null;
  try {
    const advanced = require('./advanced');
    advancedShadbala = advanced.calculateShadbala(date, lat, lng);
    jaiminiKarakas = advanced.calculateJaiminiKarakas(date, lat, lng);
    extendedVargas = advanced.buildExtendedVargas(date, lat, lng);
    advancedYogas = advanced.detectAdvancedYogas(date, lat, lng);
    advancedDoshas = advanced.detectDoshas(date, lat, lng);
    kpSubLords = advanced.calculateKPSubLords(date);
    nadiAmsha = advanced.calculateNadiAmsha(date);
    console.log('[FullReport] Advanced enrichment loaded — Shadbala, Jaimini, Vargas, Yogas, Doshas, KP, Nadi');
  } catch (err) {
    console.warn('[FullReport] Advanced enrichment unavailable:', err.message);
  }

  // ── Nadi Astrology Significator System ─────────────────────────
  // Build the Planet→Nakshatra→SubLord house significator chain (Umang Taneja methodology)
  // This is the core predictive engine: each planet signifies houses at 3 levels,
  // Sub-Lord is strongest, and house groups determine event outcomes.
  let nadiPredictions = null;
  try {
    const nadi = require('./nadi');
    nadiPredictions = nadi.generateNadiPredictions(bhavaChalit, houseChart, planets, lagna.rashi, kpSubLords);
    console.log('[FullReport] Nadi Significator System loaded —', Object.keys(nadiPredictions.significatorTable).length, 'planets analyzed');
  } catch (err) {
    console.warn('[FullReport] Nadi Significator System unavailable:', err.message);
  }

  // ── Cache marriage denial assessment (computed ONCE, reused across sections) ──
  let cachedMarriageDenial = null;
  try {
    cachedMarriageDenial = assessMarriageDenial(date, lat, lng);
  } catch (e) {
    console.warn('[FullReport] Marriage denial assessment failed:', e.message);
  }

  // ── Lagna Cusp Validation ──────────────────────────────────────
  // If Lagna degree is near 0° or 30° of a sign, the entire chart could shift
  const lagnaDegreeInSign = lagna.sidereal % 30;
  const lagnaCuspWarning = (lagnaDegreeInSign < 2 || lagnaDegreeInSign > 28) ? {
    isNearCusp: true,
    degreeInSign: lagnaDegreeInSign.toFixed(2),
    warning: `Lagna is at ${lagnaDegreeInSign.toFixed(2)}° of ${lagna.rashi.english} — very close to a sign boundary. A difference of even a few minutes in birth time could shift the entire chart to the ${lagnaDegreeInSign < 2 ? 'previous' : 'next'} sign. Birth time accuracy is critical for this chart.`,
    alternateSign: lagnaDegreeInSign < 2
      ? RASHIS[((lagna.rashi.id - 2 + 12) % 12)]?.english
      : RASHIS[(lagna.rashi.id % 12)]?.english,
  } : { isNearCusp: false };

  // Helper functions
  const getPlanetHouse = (planetName) => {
    const h = houses.find(h => h.planets.some(p => p.name === planetName));
    return h ? h.houseNumber : 0;
  };

  const getHouseLord = (houseNum) => {
    const h = houses[houseNum - 1];
    if (!h) return 'Unknown';
    return h.rashiLord || RASHIS[(h.rashiId || 1) - 1]?.lord || 'Unknown';
  };

  const isInKendra = (h) => [1, 4, 7, 10].includes(h);
  const isInTrikona = (h) => [1, 5, 9].includes(h);
  const isInDusthana = (h) => [6, 8, 12].includes(h);

  // ── Health score helper (defined early so all sections can use it) ──
  // Prefers 6-component Shadbala percentage from advanced engine, falls back to simplified score
  const getHealthScore = (key) => {
    if (advancedShadbala && advancedShadbala[key]) return advancedShadbala[key].percentage;
    if (planetStrengths[key]) return planetStrengths[key].score;
    return 50;
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 1: YOGAS — Planetary Alignments
  // ══════════════════════════════════════════════════════════════
  const yogaAnalysis = {
    title: 'Planetary Alignments (Yoga)',
    sinhala: 'ග්‍රහ යෝග විශ්ලේෂණය',
    yogas: yogas.map(y => ({
      ...y,
      impact: y.strength === 'Very Strong' ? 'Life-defining' : y.strength === 'Strong' ? 'Significant' : 'Moderate',
    })),
    // ── NEW: Include advanced yogas (30+ combinations) ──────────
    advancedYogas: advancedYogas ? advancedYogas.map(y => ({
      name: y.name,
      description: y.description,
      strength: y.strength,
      category: y.category,
      icon: y.icon,
    })) : [],
    // ── NEW: Include doshas for comprehensive analysis ───────────
    doshas: advancedDoshas ? advancedDoshas.map(d => ({
      name: d.name,
      severity: d.severity,
      description: d.description,
      icon: d.icon,
    })) : [],
    summary: yogas.length === 0 && (!advancedYogas || advancedYogas.length === 0)
      ? 'No major classical yogas detected. Individual planet strengths and house placements are the primary indicators.'
      : `${yogas.length + (advancedYogas?.length || 0)} yoga(s) identified across basic and advanced analysis. ${yogas.filter(y => y.strength === 'Very Strong' || y.strength === 'Strong').length + (advancedYogas?.filter(y => y.strength === 'Very Strong' || y.strength === 'Strong').length || 0)} are considered powerful.`,
    functionalBenefics: functionalStatus.benefics || [],
    functionalMalefics: functionalStatus.malefics || [],
    yogaKaraka: functionalStatus.yogaKaraka || 'None',
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 2: PERSONALITY & CHARACTER
  // ══════════════════════════════════════════════════════════════
  const h1 = analyzeHouse(1, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const lagnaLordHouse = getPlanetHouse(lagna.rashi.lord);

  // Element analysis
  const ELEMENTS = { fire: ['Mesha','Simha','Dhanus'], earth: ['Vrishabha','Kanya','Makara'], air: ['Mithuna','Tula','Kumbha'], water: ['Kataka','Vrischika','Meena'] };
  const lagnaElement = Object.entries(ELEMENTS).find(([, signs]) => signs.includes(lagnaName))?.[0] || 'mixed';
  const moonElement = Object.entries(ELEMENTS).find(([, signs]) => signs.includes(moonRashi.name))?.[0] || 'mixed';

  const ELEMENT_TRAITS = {
    fire: { en: 'Dynamic, courageous, leader, impulsive, energetic', si: 'ගතික, ධෛර්යවන්ත, නායක, ශක්තිමත්' },
    earth: { en: 'Practical, stable, materialistic, patient, reliable', si: 'ප්‍රායෝගික, ස්ථාවර, ඉවසිලිවන්ත, විශ්වාසවන්ත' },
    air: { en: 'Intellectual, communicative, social, adaptable, analytical', si: 'බුද්ධිමත්, සමාජශීලී, අනුවර්තනය වන' },
    water: { en: 'Emotional, intuitive, nurturing, sensitive, artistic', si: 'හැඟීම්බර, අවබෝධශීලී, සත්කාරශීලී' },
  };

  const personality = {
    title: 'Personality & Character',
    sinhala: 'පෞරුෂය හා චරිතය',
    lagna: { name: lagnaName, english: lagna.rashi.english, sinhala: lagna.rashi.sinhala, lord: lagna.rashi.lord, degree: (lagna.sidereal % 30).toFixed(2) },
    moonSign: { name: moonRashi.name, english: moonRashi.english, sinhala: moonRashi.sinhala },
    sunSign: { name: sunRashi.name, english: sunRashi.english, sinhala: sunRashi.sinhala },
    nakshatra: { name: moonNakshatra.name, sinhala: moonNakshatra.sinhala, pada: moonNakshatra.pada, lord: moonNakshatra.lord },
    lagnaElement: { element: lagnaElement, traits: ELEMENT_TRAITS[lagnaElement] || {} },
    moonElement: { element: moonElement, traits: ELEMENT_TRAITS[moonElement] || {} },
    lagnaLordPosition: { house: lagnaLordHouse, interpretation: lagnaLordHouse ? `Lagna lord ${lagna.rashi.lord} in ${HOUSE_SIGNIFICATIONS[lagnaLordHouse]?.name} — focuses life energy on ${HOUSE_SIGNIFICATIONS[lagnaLordHouse]?.governs?.split(',').slice(0, 3).join(', ')}` : '' },
    planetsIn1st: h1?.planetsInHouse || [],
    aspectsOn1st: h1?.aspectingPlanets || [],
    overallStrength: h1?.strength || 'moderate',
    // ── NEW: Lagna cusp warning for chart accuracy ──────────────
    lagnaCuspWarning: lagnaCuspWarning,
    // ── NEW: Atmakaraka (soul planet) from Jaimini ──────────────
    atmakaraka: jaiminiKarakas?.atmakaraka ? {
      planet: jaiminiKarakas.atmakaraka.planet,
      rashi: jaiminiKarakas.atmakaraka.rashi,
      meaning: jaiminiKarakas.atmakaraka.meaning,
    } : null,
    // ── NEW: Lagna lord Shadbala strength ────────────────────────
    lagnaLordShadbala: advancedShadbala?.[lagna.rashi.lord?.toLowerCase()] ? {
      percentage: advancedShadbala[lagna.rashi.lord.toLowerCase()].percentage,
      strength: advancedShadbala[lagna.rashi.lord.toLowerCase()].strength,
      note: `Lagna lord ${lagna.rashi.lord} Shadbala: ${advancedShadbala[lagna.rashi.lord.toLowerCase()].percentage}% — ${advancedShadbala[lagna.rashi.lord.toLowerCase()].strength}`,
    } : null,
    // ── NEW: Retrograde planets affecting personality ────────────
    retrogradePlanets: (() => {
      const retros = [];
      for (const [key, p] of Object.entries(planets)) {
        if (key === 'Lagna') continue;
        if (p.isRetrograde) retros.push({ name: p.name, house: getPlanetHouse(p.name), rashi: p.rashiEnglish || p.rashi });
      }
      return retros;
    })(),
    // ── NEW: Combustion (planets too close to Sun) ──────────────
    combustPlanets: (() => {
      const sunLng = sunSidereal;
      const combustions = [];
      const COMBUST_ORBS = { Moon: 12, Mars: 17, Mercury: 14, Jupiter: 11, Venus: 10, Saturn: 15 };
      for (const [key, p] of Object.entries(planets)) {
        if (['Lagna', 'Sun', 'Rahu', 'Ketu'].includes(key) || !p.longitude) continue;
        const pLng = toSidereal(p.longitude, date);
        const dist = Math.abs(pLng - sunLng);
        const angDist = Math.min(dist, 360 - dist);
        const orb = COMBUST_ORBS[p.name] || 10;
        if (angDist < orb) combustions.push({ name: p.name, distanceFromSun: angDist.toFixed(1), house: getPlanetHouse(p.name) });
      }
      return combustions;
    })(),
    // ── NEW: Graha Yuddha (Planetary War) ───────────────────────
    grahaYuddha: (() => {
      const wars = [];
      const warCandidates = ['mars', 'mercury', 'jupiter', 'venus', 'saturn'];
      for (let i = 0; i < warCandidates.length; i++) {
        for (let j = i + 1; j < warCandidates.length; j++) {
          const p1 = planets[warCandidates[i]];
          const p2 = planets[warCandidates[j]];
          if (!p1 || !p2) continue;
          const dist = Math.abs(p1.sidereal - p2.sidereal);
          const angDist = Math.min(dist, 360 - dist);
          if (angDist < 1.0) {
            wars.push({ planet1: p1.name, planet2: p2.name, distance: angDist.toFixed(3), house: getPlanetHouse(p1.name) });
          }
        }
      }
      return wars;
    })(),
    // ── NEW: Neecha Bhanga Raja Yoga ────────────────────────────
    neechaBhangaYogas: (() => {
      const nbYogas = [];
      const debilitations = { Sun: 7, Moon: 8, Mars: 4, Mercury: 12, Jupiter: 10, Venus: 6, Saturn: 1 };
      for (const [pName, debRashi] of Object.entries(debilitations)) {
        const p = planets[pName.toLowerCase()];
        if (!p || p.rashiId !== debRashi) continue;
        let cancelled = false;
        const reasons = [];
        const debSignLord = RASHIS[debRashi - 1]?.lord;
        const debSignLordH = getPlanetHouse(debSignLord);
        if (debSignLordH && [1, 4, 7, 10].includes(debSignLordH)) { cancelled = true; reasons.push(`${debSignLord} in kendra`); }
        const exaltations = { Sun: 1, Moon: 2, Mars: 10, Mercury: 6, Jupiter: 4, Venus: 12, Saturn: 7 };
        const exaltLord = RASHIS[(exaltations[pName] || 1) - 1]?.lord;
        const exaltLordH = getPlanetHouse(exaltLord);
        if (exaltLordH && [1, 4, 7, 10].includes(exaltLordH)) { cancelled = true; reasons.push(`${exaltLord} (exalt lord) in kendra`); }
        const pH = getPlanetHouse(pName);
        if (pH && [1, 4, 7, 10].includes(pH)) { cancelled = true; reasons.push(`${pName} itself in kendra`); }
        if (cancelled) nbYogas.push({ planet: pName, house: pH, reasons, isRajaYoga: reasons.length >= 2 });
      }
      return nbYogas;
    })(),
    // ── NEW: Bhava Chalit planet shifts ──────────────────────────
    bhavaChalitShifts: bhavaChalit?.planetShifts || [],
    // ── NEW: Unique chart DNA — what makes this chart truly unique ──
    uniqueSignatures: (() => {
      const sigs = [];
      // Planets in own sign — check by RASHI (sign), not house number
      const ownSignRashis = { Sun: [5], Moon: [4], Mars: [1, 8], Mercury: [3, 6], Jupiter: [9, 12], Venus: [2, 7], Saturn: [10, 11] };
      for (const [pName, ownRashiIds] of Object.entries(ownSignRashis)) {
        const pData = planets[pName.toLowerCase()];
        if (pData && ownRashiIds.includes(pData.rashiId)) {
          const pH = getPlanetHouse(pName);
          sigs.push(`${pName} in own sign ${pData.rashi} (house ${pH}) — naturally strong and authentic`);
        }
      }
      // Exalted planets — check by RASHI (sign), not house number
      const exaltRashis = { Sun: 1, Moon: 2, Mars: 10, Mercury: 6, Jupiter: 4, Venus: 12, Saturn: 7 };
      for (const [pName, eRashi] of Object.entries(exaltRashis)) {
        const pData = planets[pName.toLowerCase()];
        if (pData && pData.rashiId === eRashi) {
          const pH = getPlanetHouse(pName);
          sigs.push(`${pName} exalted in ${pData.rashi} (house ${pH}) — extraordinary power in this area`);
        }
      }
      // Debilitated planets — check by RASHI (sign), not house number
      const debilRashis = { Sun: 7, Moon: 8, Mars: 4, Mercury: 12, Jupiter: 10, Venus: 6, Saturn: 1 };
      for (const [pName, dRashi] of Object.entries(debilRashis)) {
        const pData = planets[pName.toLowerCase()];
        if (pData && pData.rashiId === dRashi) {
          const pH = getPlanetHouse(pName);
          sigs.push(`${pName} debilitated in ${pData.rashi} (house ${pH}) — this area needs extra effort and awareness`);
        }
      }
      // Multiple planets in one house (stellium)
      for (const house of houses) {
        const realPlanets = house.planets.filter(p => !['Lagna'].includes(p.name));
        if (realPlanets.length >= 3) {
          sigs.push(`${realPlanets.length}-planet conjunction in house ${house.houseNumber} (${house.rashiEnglish}) — intense focus: ${realPlanets.map(p => p.name).join(', ')}`);
        }
      }
      // Empty kendras (angular houses with no planets)
      const emptyKendras = [1, 4, 7, 10].filter(k => houses[k - 1].planets.filter(p => p.name !== 'Lagna').length === 0);
      if (emptyKendras.length >= 3) sigs.push(`${emptyKendras.length} empty angular houses — life energy is focused in specific areas rather than spread evenly`);
      // All planets in one half of chart
      const planetHouses = Object.values(planets).filter(p => p.name !== 'Lagna').map(p => getPlanetHouse(p.name)).filter(Boolean);
      const eastHalf = planetHouses.filter(h => h >= 10 || h <= 3).length;
      const westHalf = planetHouses.filter(h => h >= 4 && h <= 9).length;
      if (eastHalf >= 7) sigs.push('Most planets in the eastern half — self-made destiny, personal initiative drives life');
      if (westHalf >= 7) sigs.push('Most planets in the western half — life shaped through relationships and partnerships');
      // Neecha Bhanga Raja Yoga
      const debilitations2 = { Sun: 7, Moon: 8, Mars: 4, Mercury: 12, Jupiter: 10, Venus: 6, Saturn: 1 };
      for (const [pName, debRashi] of Object.entries(debilitations2)) {
        const p = planets[pName.toLowerCase()];
        if (!p || p.rashiId !== debRashi) continue;
        const pH = getPlanetHouse(pName);
        if (pH && [1, 4, 7, 10].includes(pH)) {
          sigs.push(`${pName} has Neecha Bhanga Raja Yoga — debilitation CANCELLED, transforms weakness into rare strength in house ${pH}`);
        }
      }
      // Graha Yuddha (Planetary War)
      const warCands = ['mars', 'mercury', 'jupiter', 'venus', 'saturn'];
      for (let i = 0; i < warCands.length; i++) {
        for (let j = i + 1; j < warCands.length; j++) {
          const p1 = planets[warCands[i]], p2 = planets[warCands[j]];
          if (!p1 || !p2) continue;
          const dist = Math.abs(p1.sidereal - p2.sidereal);
          if (Math.min(dist, 360 - dist) < 1.0) {
            sigs.push(`${p1.name} and ${p2.name} are in Graha Yuddha (planetary war within 1°) — intense power struggle in that house`);
          }
        }
      }
      // Bhava Chalit planet shifts
      if (bhavaChalit?.planetShifts) {
        for (const shift of bhavaChalit.planetShifts) {
          sigs.push(`${shift.planet} shifts from Rashi house ${shift.wholeSignHouse} to Bhava house ${shift.chalitHouse} — results experienced in a different area than expected`);
        }
      }
      return sigs;
    })(),
    // ── NEW: Retrograde planet house effects ────────────────────
    // Retrograde planets partially give results of the previous house
    retrogradeHouseEffects: (() => {
      const effects = [];
      const retrogradeCandidates = ['mars', 'mercury', 'jupiter', 'venus', 'saturn'];
      for (const pName of retrogradeCandidates) {
        const p = planets[pName];
        if (!p || !p.isRetrograde) continue;
        const currentH = getPlanetHouse(p.name);
        if (!currentH) continue;
        const prevH = currentH === 1 ? 12 : currentH - 1;
        effects.push({
          planet: p.name,
          currentHouse: currentH,
          previousHouseInfluence: prevH,
          currentTheme: HOUSE_SIGNIFICATIONS[currentH]?.name || '',
          previousTheme: HOUSE_SIGNIFICATIONS[prevH]?.name || '',
          interpretation: p.name + ' retrograde in house ' + currentH + ' also channels energy from house ' + prevH + ' (' + (HOUSE_SIGNIFICATIONS[prevH]?.name || '') + ') — unfinished karma from past life in this area',
        });
      }
      return effects;
    })(),
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 3: MARRIAGE & RELATIONSHIPS
  // ══════════════════════════════════════════════════════════════
  const h7 = analyzeHouse(7, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const lord7Name = getHouseLord(7);
  const lord7House = getPlanetHouse(lord7Name);
  const venusHouse = getPlanetHouse('Venus');
  const navVenus = navamsha.planets?.venus;

  // Manglik/Kuja Dosha check (Mars in 1,2,4,7,8,12 from Lagna or Moon)
  const marsHouse = getPlanetHouse('Mars');
  const marsFromMoon = houses.findIndex(h => h.planets.some(p => p.name === 'Mars')) + 1;
  const moonHouseIdx = getPlanetHouse('Moon');
  const marsDistFromMoon = marsHouse && moonHouseIdx ? ((marsHouse - moonHouseIdx + 12) % 12) + 1 : 0;
  const manglikHouses = [1, 2, 4, 7, 8, 12];
  const kujaFromLagna = manglikHouses.includes(marsHouse);
  const kujaFromMoon = manglikHouses.includes(marsDistFromMoon);
  const kujaDosha = kujaFromLagna || kujaFromMoon;

  // ── Kuja Dosha cancellation check ──
  let kujaCancelled = false;
  const kujaCancelReasons = [];
  if (kujaDosha) {
    const marsRashiId = houses.find(h => h.planets.some(p => p.name === 'Mars'))?.rashiId;
    // 1. Mars in own sign (Aries=1, Scorpio=8)
    if (marsRashiId && [1, 8].includes(marsRashiId)) { kujaCancelled = true; kujaCancelReasons.push('Mars in own sign (Aries/Scorpio)'); }
    // 2. Mars exalted (Capricorn=10)
    if (marsRashiId === 10) { kujaCancelled = true; kujaCancelReasons.push('Mars exalted in Capricorn'); }
    // 3. Jupiter aspects or conjoins Mars
    const jupHouseM = getPlanetHouse('Jupiter');
    if (jupHouseM === marsHouse) { kujaCancelled = true; kujaCancelReasons.push('Jupiter conjoins Mars'); }
    if (jupHouseM && marsHouse) {
      const jupToMarsM = ((marsHouse - jupHouseM + 12) % 12) + 1;
      if ([5, 7, 9].includes(jupToMarsM)) { kujaCancelled = true; kujaCancelReasons.push('Jupiter aspects Mars (' + jupToMarsM + 'th aspect)'); }
    }
    // 4. Venus conjoins Mars
    if (venusHouse === marsHouse) { kujaCancelled = true; kujaCancelReasons.push('Venus conjoins Mars'); }
    // 5. Mars in H1 in Aries/Leo/Aquarius
    if (marsHouse === 1 && marsRashiId && [1, 5, 11].includes(marsRashiId)) { kujaCancelled = true; kujaCancelReasons.push('Mars in Lagna in Aries/Leo/Aquarius'); }
    // 6. Mars in H7 in Cancer/Capricorn
    if (marsHouse === 7 && marsRashiId && [4, 10].includes(marsRashiId)) { kujaCancelled = true; kujaCancelReasons.push('Mars in 7th in Cancer/Capricorn'); }
    // 7. Mars in H8 in Sagittarius/Pisces
    if (marsHouse === 8 && marsRashiId && [9, 12].includes(marsRashiId)) { kujaCancelled = true; kujaCancelReasons.push('Mars in 8th in Sagittarius/Pisces'); }
  }

  // Marriage timing — 7th lord dasha or Venus dasha indicates marriage period
  const marriageTimingDasas = lifespanFilter(dasaPeriods.filter(d =>
    d.lord === lord7Name || d.lord === 'Venus' || d.lord === 'Jupiter'
  )).map(d => `${d.lord} Mahadasha: ${d.start} to ${d.endDate}`);

  // ── Jaimini Darakaraka for spouse accuracy ─────────────────────
  const darakarakaData = jaiminiKarakas?.darakaraka || null;
  const upapadaData = jaiminiKarakas?.upapadaLagna || null;

  // ── Navamsha (D9) deep marriage analysis ──────────────────────
  const navamshaLagnaRashi = navamsha?.lagna?.rashi?.english || null;
  const nav7thHouseIdx = navamsha?.houses?.[6];
  const navamsha7thPlanets = nav7thHouseIdx?.planets?.map(p => p.name) || [];
  const navamshaVenusRashi = navVenus?.navamshaRashiEnglish || null;

  // ── D9 marriage strength assessment ───────────────────────────
  const navamshaMarriageStrength = (() => {
    if (!navamsha?.houses) return 'Cannot assess — Navamsha data unavailable';
    const nav7 = navamsha.houses[6];
    const hasBenefics = nav7?.planets?.some(p => ['Jupiter', 'Venus', 'Mercury', 'Moon'].includes(p.name));
    const hasMalefics = nav7?.planets?.some(p => ['Saturn', 'Mars', 'Rahu', 'Ketu'].includes(p.name));
    if (hasBenefics && !hasMalefics) return 'Excellent marital happiness indicated in Navamsha';
    if (hasMalefics && !hasBenefics) return 'Marriage may face significant challenges — Navamsha shows stress on 7th';
    if (hasBenefics && hasMalefics) return 'Mixed marital results — both support and friction indicated';
    return 'Depends on the 7th lord placement in Navamsha';
  })();

  const marriage = {
    title: 'Marriage & Relationships',
    sinhala: 'විවාහය හා සබඳතා',
    seventhHouse: h7,
    seventhLord: { name: lord7Name, house: lord7House, interpretation: lord7House ? `7th lord ${lord7Name} in house ${lord7House} (${HOUSE_SIGNIFICATIONS[lord7House]?.name})` : '' },
    venus: { house: venusHouse, rashi: planets.venus?.rashi, navamshaRashi: navVenus?.navamshaRashiEnglish },
    kujaDosha: {
      present: kujaDosha,
      cancelled: kujaCancelled,
      cancellationReasons: kujaCancelReasons,
      fromLagna: kujaFromLagna,
      fromMoon: kujaFromMoon,
      marsHouse,
      marsDistFromMoon,
      severity: !kujaDosha ? 'None' : kujaCancelled ? 'Cancelled' : (kujaFromLagna && [7, 8].includes(marsHouse)) ? 'High' : (kujaFromLagna && [1, 4].includes(marsHouse)) ? 'Moderate' : 'Mild',
      details: kujaDosha ? (() => {
        const sources = [];
        if (kujaFromLagna) sources.push(`Mars in house ${marsHouse} from Lagna`);
        if (kujaFromMoon) sources.push(`Mars is ${marsDistFromMoon}th from Moon`);
        const sourceText = sources.join(' and ');
        if (kujaCancelled) return `${sourceText} creates Manglik Dosha, but it is CANCELLED: ${kujaCancelReasons.join(', ')}. This dosha does not obstruct marriage.`;
        if (kujaFromLagna && [7, 8].includes(marsHouse)) return `${sourceText} — HIGH intensity (direct impact on marriage/transformation house).`;
        if (kujaFromLagna && [1, 4].includes(marsHouse)) return `${sourceText} — MODERATE intensity (impacts self/home comfort).`;
        return `${sourceText} — MILD intensity (manageable with matching).`;
      })() : null,
      note: !kujaDosha ? 'No Kuja Dosha. Marriage prospects are unobstructed by Mars.'
        : kujaCancelled ? `Manglik Dosha is present but cancelled (${kujaCancelReasons.join(', ')}). Marriage is NOT obstructed.`
        : 'Manglik Dosha present. Should be matched with another Manglik or dosha-cancellation checked.',
    },
    marriageTimingIndicators: marriageTimingDasas,
    spouseQualities: (() => {
      // ── Rich spouse personality from 7th sign, lord, planets, Darakaraka ──
      const rashiTraits = {
        Mesha: 'independent, assertive, energetic, competitive, impatient',
        Vrishabha: 'loyal, sensual, stubborn, comfort-loving, patient, materialistic',
        Mithuna: 'talkative, witty, restless, dual-natured, intellectual, youthful',
        Karkata: 'emotional, nurturing, moody, protective, home-oriented, sensitive',
        Simha: 'proud, generous, dramatic, authoritative, attention-seeking, warm-hearted',
        Kanya: 'analytical, critical, health-conscious, perfectionist, service-oriented, practical',
        Tula: 'diplomatic, charming, indecisive, beauty-loving, partnership-oriented, fair-minded',
        Vrischika: 'intense, secretive, passionate, possessive, transformative, deeply loyal',
        Dhanus: 'optimistic, philosophical, freedom-loving, adventurous, blunt, generous',
        Makara: 'ambitious, disciplined, reserved, status-conscious, responsible, cold exterior',
        Kumbha: 'unconventional, humanitarian, detached, intellectual, progressive, unpredictable',
        Meena: 'dreamy, compassionate, escapist, spiritual, artistic, self-sacrificing'
      };
      const planetTraits = {
        Sun: 'authoritative, proud, dignified, ego-driven, leadership-oriented',
        Moon: 'emotional, caring, moody, nurturing, changeable, intuitive',
        Mars: 'aggressive, passionate, argumentative, courageous, physically active',
        Mercury: 'intellectual, communicative, youthful, analytical, business-minded, witty',
        Jupiter: 'wise, generous, religious, philosophical, lucky, overweight tendency',
        Venus: 'beautiful, artistic, pleasure-loving, romantic, materialistic, charming',
        Saturn: 'serious, older/mature, disciplined, hardworking, cold, reliable',
        Rahu: 'unconventional, foreign connections, ambitious, obsessive, deceptive tendency',
        Ketu: 'spiritual, detached, mysterious, karmic connection, past-life bond'
      };
      const qualities = [];
      // 7th house sign flavor
      const h7Rashi = h7?.rashi;
      if (h7Rashi && rashiTraits[h7Rashi]) {
        qualities.push(`7th house ${h7?.rashiEnglish}: spouse has ${rashiTraits[h7Rashi]} tendencies`);
      }
      // 7th lord placement
      if (lord7Name && lord7House) {
        qualities.push(`7th lord ${lord7Name} in house ${lord7House}: ${planetTraits[lord7Name] || ''}`);
      }
      // Planets in 7th
      (h7?.planetsInHouse || []).forEach(pl => {
        if (planetTraits[pl]) {
          qualities.push(`${pl} in 7th house adds: ${planetTraits[pl]}`);
        }
      });
      // Darakaraka (soul-level spouse indicator — HIGHEST PRIORITY)
      if (darakarakaData?.planet) {
        const dk = darakarakaData.planet;
        const dkRashi = darakarakaData.rashi;
        qualities.push(`★ DARAKARAKA ${dk} in ${dkRashi}: SOUL-LEVEL spouse nature is ${planetTraits[dk] || dk}${dkRashi && rashiTraits[dkRashi] ? ', filtered through ' + (rashiTraits[dkRashi].split(',').slice(0,3).join(',')) + ' energy' : ''}`);
      }
      return qualities.join(' | ') || 'Spouse qualities data not available';
    })(),
    // ── NEW: Jaimini spouse significator ─────────────────────────
    darakaraka: darakarakaData ? {
      planet: darakarakaData.planet,
      rashi: darakarakaData.rashi,
      degree: darakarakaData.degree,
      meaning: `${darakarakaData.planet} as Darakaraka (lowest degree planet) reveals your spouse's core nature and the soul-level connection in marriage`,
      spouseNature: (() => {
        const dkPlanetTraits = {
          Sun: 'authoritative, proud, government/leadership role, strong ego, dignified',
          Moon: 'emotional, caring, nurturing, moody, motherly instinct, home-oriented',
          Mars: 'energetic, assertive, physically active, argumentative, passionate, competitive',
          Mercury: 'intelligent, communicative, youthful appearance, business-minded, witty, analytical, good with words/numbers',
          Jupiter: 'wise, spiritual, generous, educated, philosophical, traditional values, may be overweight',
          Venus: 'beautiful, artistic, luxury-loving, romantic, charming, fashion-conscious, pleasure-seeking',
          Saturn: 'mature/older, serious, hardworking, disciplined, cold exterior but deeply loyal, may look older than age',
          Rahu: 'unconventional, foreign connection, ambitious, tech-savvy, unusual background, obsessive',
          Ketu: 'spiritual, detached, mysterious, past-life karmic bond, may seem distant at times'
        };
        const dkRashiTraits = {
          Mesha: 'fiery, independent, quick-tempered', Aries: 'fiery, independent, quick-tempered',
          Vrishabha: 'stable, comfort-loving, stubborn', Taurus: 'stable, comfort-loving, stubborn',
          Mithuna: 'dual-natured, talkative, curious', Gemini: 'dual-natured, talkative, curious',
          Karkata: 'protective, emotional, family-first', Cancer: 'protective, emotional, family-first',
          Simha: 'confident, dramatic, generous', Leo: 'confident, dramatic, generous',
          Kanya: 'practical, detail-oriented, health-conscious', Virgo: 'practical, detail-oriented, health-conscious',
          Tula: 'diplomatic, beauty-conscious, fair-minded', Libra: 'diplomatic, beauty-conscious, fair-minded',
          Vrischika: 'intense, secretive, deeply passionate', Scorpio: 'intense, secretive, deeply passionate',
          Dhanus: 'adventurous, optimistic, philosophical', Sagittarius: 'adventurous, optimistic, philosophical',
          Makara: 'ambitious, reserved, status-driven', Capricorn: 'ambitious, reserved, status-driven',
          Kumbha: 'progressive, humanitarian, eccentric', Aquarius: 'progressive, humanitarian, eccentric',
          Meena: 'dreamy, compassionate, spiritual', Pisces: 'dreamy, compassionate, spiritual'
        };
        const pl = darakarakaData.planet;
        const ra = darakarakaData.rashi;
        return `Soul-level spouse: ${dkPlanetTraits[pl] || pl}. Expressed through ${ra} energy: ${dkRashiTraits[ra] || ra}.`;
      })(),
    } : null,
    upapadaLagna: upapadaData ? {
      rashi: upapadaData.rashi,
      meaning: upapadaData.meaning,
    } : null,
    // ── NEW: D9 Navamsha marriage depth ──────────────────────────
    navamshaAnalysis: {
      d9LagnaSign: navamshaLagnaRashi,
      d9SeventhPlanets: navamsha7thPlanets,
      venusInNavamsha: navamshaVenusRashi,
      marriageStrength: navamshaMarriageStrength,
      // ── D9 7th lord disposition for accurate timing ───────────
      d9SeventhLordDisposition: (() => {
        try {
          if (!navamsha?.houses) return null;
          const nav7House = navamsha.houses[6];
          const nav7Rashi = nav7House?.rashiId;
          if (!nav7Rashi) return null;
          const nav7Lord = RASHIS[nav7Rashi - 1]?.lord;
          if (!nav7Lord) return null;
          // Find which D9 house the D9 7th lord sits in
          let nav7LordHouse = null;
          for (let hi = 0; hi < navamsha.houses.length; hi++) {
            if (navamsha.houses[hi]?.planets?.some(p => p.name === nav7Lord)) {
              nav7LordHouse = hi + 1;
              break;
            }
          }
          const isInKendra = nav7LordHouse && [1, 4, 7, 10].includes(nav7LordHouse);
          const isInTrikona = nav7LordHouse && [1, 5, 9].includes(nav7LordHouse);
          const isInDusthana = nav7LordHouse && [6, 8, 12].includes(nav7LordHouse);
          // Check if D9 7th lord is also the D1 7th lord (strong marriage)
          const sameAsD1Lord = nav7Lord === lord7Name;
          return {
            d9SeventhLord: nav7Lord,
            d9SeventhLordHouse: nav7LordHouse,
            inKendra: isInKendra,
            inTrikona: isInTrikona,
            inDusthana: isInDusthana,
            sameAsD1SeventhLord: sameAsD1Lord,
            marriageStrengthFromD9Lord: isInKendra || isInTrikona
              ? 'D9 7th lord well-placed — strong marriage prospects and deep spouse compatibility'
              : isInDusthana
                ? 'D9 7th lord in dusthana — relationship may require patience and spiritual maturity'
                : 'D9 7th lord in neutral house — average marriage indications from Navamsha',
          };
        } catch (e) { return null; }
      })(),
    },
    // ══════════════════════════════════════════════════════════════
    // ENHANCED SPOUSE PROFILE — Comprehensive spouse prediction
    // ══════════════════════════════════════════════════════════════
    enhancedSpouseProfile: (() => {
      try {
        // ── Physical Appearance from 7th House Sign ──────────────
        const appearanceByRashi = {
          Mesha: { build: 'Athletic, medium height', complexion: 'Reddish or fair', features: 'Sharp features, prominent forehead, quick movements', hair: 'Reddish tint or thin' },
          Vrishabha: { build: 'Well-built, sturdy, stocky', complexion: 'Fair to medium', features: 'Attractive face, beautiful eyes, thick lips', hair: 'Thick, dark, luxuriant' },
          Mithuna: { build: 'Tall, slim, lanky', complexion: 'Fair', features: 'Long arms, expressive face, youthful look', hair: 'Light colored or curly' },
          Karkata: { build: 'Medium, round face, soft body', complexion: 'Pale or whitish', features: 'Large eyes, round features, gentle expression', hair: 'Brown or light' },
          Simha: { build: 'Tall, broad shoulders, majestic', complexion: 'Fair to ruddy', features: 'Leonine features, broad forehead, commanding presence', hair: 'Thick, mane-like' },
          Kanya: { build: 'Medium, well-proportioned, slim', complexion: 'Fair to olive', features: 'Delicate features, clear complexion, intelligent eyes', hair: 'Dark, straight' },
          Tula: { build: 'Well-proportioned, attractive', complexion: 'Fair, smooth skin', features: 'Symmetrical features, dimples possible, charming smile', hair: 'Silky, well-maintained' },
          Vrischika: { build: 'Strong, compact, magnetic', complexion: 'Dark to medium', features: 'Intense eyes, sharp nose, mysterious aura', hair: 'Dark, thick' },
          Dhanus: { build: 'Tall, athletic, long limbs', complexion: 'Fair to medium', features: 'Broad forehead, bright eyes, cheerful expression', hair: 'Light brown or thinning' },
          Makara: { build: 'Lean, thin, bony', complexion: 'Dark or tanned', features: 'Angular face, prominent cheekbones, serious expression', hair: 'Dark, sparse' },
          Kumbha: { build: 'Tall, unusual proportions', complexion: 'Fair to pale', features: 'Handsome/pretty, distinct look, dreamy eyes', hair: 'Light or unusual style' },
          Meena: { build: 'Medium, soft, graceful', complexion: 'Fair, soft skin', features: 'Large dreamy eyes, gentle features, ethereal quality', hair: 'Soft, wavy' }
        };
        const h7Rashi = h7?.rashi;
        const physicalAppearance = appearanceByRashi[h7Rashi] || null;
        
        // ── Spouse Profession from 7th Lord House Position ────────
        const professionByLordHouse = {
          1: 'Self-employed, independent business, entrepreneur. May meet through personal efforts or self-introduction.',
          2: 'Finance, banking, family business, food industry, speech-related fields (singer, speaker, teacher). Wealthy family background.',
          3: 'Communications, media, writing, journalism, siblings business, short travels, sales, marketing, publishing.',
          4: 'Real estate, construction, education, vehicle industry, agriculture, hospitality, work from home.',
          5: 'Entertainment, creative arts, speculation/stocks, education, children-related fields, politics, sports.',
          6: 'Healthcare, medical, service industry, legal, HR, competitive fields, daily wage work, healing professions.',
          7: 'Business partnership, consulting, foreign trade, legal profession, diplomacy, public relations.',
          8: 'Insurance, occult sciences, research, inheritance management, psychology, detective work, surgery.',
          9: 'Higher education, law, religion/spirituality, foreign connections, publishing, long-distance travel, father\'s profession.',
          10: 'Government job, corporate executive, politics, authority position, well-established career, family reputation.',
          11: 'Large organizations, social work, elder siblings business, gains-oriented, networking, technology sector.',
          12: 'Foreign settlement, hospitals, spiritual institutions, isolated work, import/export, behind-the-scenes roles.'
        };
        const spouseProfession = lord7House ? professionByLordHouse[lord7House] : null;
        
        // ── Meeting Circumstances from 7th Lord Position ──────────
        const meetingByLordHouse = {
          1: 'Self-introduction, direct approach, or they come to you. Meeting may feel fated or instant.',
          2: 'Through family introduction, family gathering, or financial/food-related event.',
          3: 'Through siblings, neighbors, short trips, communication platforms, social media, or local events.',
          4: 'Near home, through mother, real estate dealings, educational institution, or vehicle purchase.',
          5: 'Through romantic pursuit, entertainment venues, creative events, children, or speculation/investment circles.',
          6: 'At workplace, hospital/clinic, through service, pets, or overcoming obstacles together.',
          7: 'Through business partnership, formal introduction, legal setting, or someone who was a known contact.',
          8: 'Sudden/unexpected meeting, through crisis/transformation, inheritance matters, or occult/spiritual gatherings.',
          9: 'Foreign travel, higher education, religious place, philosophical gathering, or through father/guru.',
          10: 'Professional setting, workplace, career event, or through someone in authority/government.',
          11: 'Friend circle, social gathering, elder sibling introduction, organization, or wish-fulfillment event.',
          12: 'Foreign land, spiritual retreat, hospital, isolated place, or through secret/hidden circumstances.'
        };
        const meetingCircumstance = lord7House ? meetingByLordHouse[lord7House] : null;
        
        // ── Spouse Background from Venus Position ─────────────────
        const venusBackgroundMap = {
          1: { background: 'Spouse comes from family that values beauty, arts, or luxury. May be from similar social standing.', nature: 'Romantic, attractive personality, brings comfort' },
          2: { background: 'Wealthy family, values comfort and possessions. May have family business in luxury/beauty sector.', nature: 'Sweet speech, loves good food, accumulates wealth' },
          3: { background: 'Artistic/creative family, may have siblings in entertainment. Good communicators.', nature: 'Creative, good with words, artistic hobbies' },
          4: { background: 'Comfortable home environment, property-owning family. Mother may be beautiful.', nature: 'Homely, enjoys domestic comforts, loves vehicles' },
          5: { background: 'Creative/entertainment family, may have talented children. Speculative nature.', nature: 'Romantic, creative, loves children, artistic talents' },
          6: { background: 'Service-oriented family, may work in health/beauty industry. Modest beginnings.', nature: 'Health-conscious, service-minded, may have enemies' },
          7: { background: 'Well-connected family, business-oriented. Strong marriage prospects.', nature: 'Partnership-oriented, diplomatic, attractive spouse' },
          8: { background: 'May have inheritance, secretive family, interest in occult/transformation.', nature: 'Mysterious allure, deep emotional nature, transformative love' },
          9: { background: 'Spiritual/religious family, higher education background, foreign connections.', nature: 'Philosophical, loves travel, morally upright' },
          10: { background: 'Prestigious family, career-focused, social standing important. Father may be prominent.', nature: 'Status-conscious, career-driven, public charm' },
          11: { background: 'Wealthy through connections, networked family, elder siblings may be successful.', nature: 'Social, gains through marriage, networker' },
          12: { background: 'Foreign origin possible, spiritual/charitable family, may have hidden wealth.', nature: 'Spiritual inclination, foreign spouse likely, secret affairs possible' }
        };
        const venusInfo = venusBackgroundMap[venusHouse] || null;
        
        // ── Spouse Direction/Origin (Nadi principle) ──────────────
        const directionByRashi = {
          Mesha: 'East', Vrishabha: 'South', Mithuna: 'West', Karkata: 'North',
          Simha: 'East', Kanya: 'South', Tula: 'West', Vrischika: 'North',
          Dhanus: 'East', Makara: 'South', Kumbha: 'West', Meena: 'North'
        };
        const spouseDirection = directionByRashi[h7Rashi] || null;
        
        // ── Age Difference Indicator ──────────────────────────────
        let ageDifference = 'Similar age';
        const planetsIn7 = h7?.planetsInHouse || [];
        if (planetsIn7.includes('Saturn')) ageDifference = 'Spouse likely older (Saturn influence)';
        else if (planetsIn7.includes('Jupiter')) ageDifference = 'Spouse may be older or wiser (Jupiter influence)';
        else if (planetsIn7.includes('Moon')) ageDifference = 'Younger or same age, emotionally compatible (Moon influence)';
        else if (planetsIn7.includes('Mercury')) ageDifference = 'Similar age or younger, youthful spouse (Mercury influence)';
        else if (planetsIn7.includes('Mars')) ageDifference = 'Similar age, energetic/younger looking (Mars influence)';
        else if (planetsIn7.includes('Venus')) ageDifference = 'Attractive spouse, similar age (Venus influence)';
        else if (planetsIn7.includes('Sun')) ageDifference = 'Authoritative spouse, possibly older or in authority (Sun influence)';
        else if (planetsIn7.includes('Rahu')) ageDifference = 'Unconventional age gap possible, or foreign spouse (Rahu influence)';
        else if (planetsIn7.includes('Ketu')) ageDifference = 'Past-life connection, age less relevant (Ketu influence)';
        
        // ── Spouse Temperament from 7th Lord Dignity ──────────────
        let temperament = 'Balanced temperament';
        const lord7Strength = planetStrengths[lord7Name?.toLowerCase()];
        if (lord7Strength) {
          if (lord7Strength.dignityLevel === 'Exalted') temperament = 'Noble, dignified, high character spouse';
          else if (lord7Strength.dignityLevel === 'Own Sign') temperament = 'Confident, self-assured, strong personality spouse';
          else if (lord7Strength.dignityLevel === 'Moolatrikona') temperament = 'Principled, values-driven, righteous spouse';
          else if (lord7Strength.dignityLevel === 'Friend Sign') temperament = 'Adaptable, friendly, socially pleasant spouse';
          else if (lord7Strength.dignityLevel === 'Neutral') temperament = 'Balanced, moderate, practical spouse';
          else if (lord7Strength.dignityLevel === 'Enemy Sign') temperament = 'May have conflicts, adjustment needed, challenging personality';
          else if (lord7Strength.dignityLevel === 'Debilitated') temperament = 'May face struggles, humility needed, growth through relationship';
        }
        
        // ── Educational Level Indicator ───────────────────────────
        let educationLevel = 'Average education';
        if (lord7House === 9 || lord7House === 5 || planetsIn7.includes('Jupiter') || planetsIn7.includes('Mercury')) {
          educationLevel = 'Well-educated, may have higher degrees or scholarly inclination';
        } else if (lord7House === 6 || lord7House === 12 || lord7Strength?.dignityLevel === 'Debilitated') {
          educationLevel = 'Practical education, self-taught, or non-traditional learning path';
        } else if (planetsIn7.includes('Venus') || lord7House === 3) {
          educationLevel = 'Arts/creative education, communication skills, may be in creative field';
        }
        
        return {
          physicalAppearance: physicalAppearance ? {
            build: physicalAppearance.build,
            complexion: physicalAppearance.complexion,
            features: physicalAppearance.features,
            hair: physicalAppearance.hair,
            basedOn: `7th house in ${h7?.rashiEnglish || h7Rashi}`
          } : null,
          spouseProfession: {
            likelyFields: spouseProfession,
            basedOn: `7th lord ${lord7Name} in house ${lord7House}`
          },
          meetingCircumstances: {
            likelyScenario: meetingCircumstance,
            basedOn: `7th lord placement in house ${lord7House}`
          },
          spouseBackground: venusInfo ? {
            familyBackground: venusInfo.background,
            personalityTraits: venusInfo.nature,
            basedOn: `Venus in house ${venusHouse}`
          } : null,
          spouseDirection: {
            likelyDirection: spouseDirection,
            interpretation: `Spouse may come from ${spouseDirection}ern direction relative to your birthplace`,
            basedOn: `7th house sign ${h7?.rashiEnglish || h7Rashi}`
          },
          ageDifference: {
            indication: ageDifference,
            basedOn: planetsIn7.length > 0 ? `Planets in 7th: ${planetsIn7.join(', ')}` : '7th house empty, judged by sign'
          },
          temperament: {
            indication: temperament,
            basedOn: `7th lord ${lord7Name} dignity: ${lord7Strength?.dignityLevel || 'unknown'}`
          },
          educationLevel: {
            indication: educationLevel,
            basedOn: `7th lord house ${lord7House} and 7th house planets`
          },
          summary: `Your spouse is likely to have ${physicalAppearance?.build?.toLowerCase() || 'moderate'} build with ${physicalAppearance?.complexion?.toLowerCase() || 'medium'} complexion. ` +
            `They may work in ${spouseProfession?.split('.')[0]?.toLowerCase() || 'various fields'}. ` +
            `Meeting may happen ${meetingCircumstance?.toLowerCase()?.split('.')[0] || 'through various circumstances'}. ` +
            `${ageDifference}. ${temperament}. ${educationLevel}.`
        };
      } catch (e) {
        console.error('[EnhancedSpouseProfile] Error:', e.message);
        return null;
      }
    })(),
    // ── NEW: Multi-layer marriage timing prediction ────────────
    marriageTimingPrediction: (() => {
      try {
        const mtp = predictMarriageTiming(date, lat, lng, opts);
        return {
          firstMarriageWindows: (mtp.firstMarriageWindows || []).map(w => ({
            period: `${w.mahadasha}-${w.antardasha}`,
            dateRange: `${w.start} to ${w.end}`,
            ageRange: w.ageRange,
            peakYear: w.peakYear,
            confidence: w.confidence,
            score: w.score,
            reasons: w.reasons?.slice(0, 5) || [],
            confirmedMarriage: w.confirmedMarriage || false,
          })),
          bestWindow: mtp.bestWindow,
          kujaDosha: mtp.kujaDosha,
          confirmedMarriageYear: mtp.confirmedMarriageYear || null,
          maritalStatus: mtp.maritalStatus || null,
          // ── NEW: Marriage denial data from timing engine ──
          marriageDenial: mtp.marriageDenial || null,
        };
      } catch (e) {
        console.error('[MarriageTiming] Error:', e.message);
        return null;
      }
    })(),
    // ── NEW: Marriage Afflictions / Denial Assessment ────────────
    marriageAfflictions: (() => {
      try {
        const denial = cachedMarriageDenial || assessMarriageDenial(date, lat, lng);
        return {
          severity: denial.severity,
          severityScore: denial.denialScore,
          likelihood: denial.likelihood,
          isMarriageDenied: denial.isMarriageDenied,
          isMarriageDelayed: denial.isMarriageDelayed,
          isMarriageSupported: denial.isMarriageSupported,
          afflictions: denial.afflictions.map(a => a.factor + ' — ' + a.meaning),
          afflictionDetails: denial.afflictions.slice(0, 6),
          supportiveFactors: denial.supportive.map(s => s.factor + ' — ' + s.meaning),
          summary: denial.summary,
        };
      } catch (e) {
        console.error('[MarriageAfflictions] Error:', e.message);
        return null;
      }
    })(),
    lagnaCuspWarning: lagnaCuspWarning,
    // ── Nadi Astrology Marriage Event Analysis (Sub-Lord methodology) ──
    nadiMarriage: nadiPredictions?.events?.marriage ? (() => {
      const m = nadiPredictions.events.marriage;
      return {
        verdict: m.verdict,
        strength: m.strength,
        description: m.description,
        bestDashaPlanets: m.bestDashaPlanets,
        strongPlanets: m.strongPlanets?.map(p => p.name),
        weakPlanets: m.weakPlanets?.map(p => p.name),
        averageScore: m.averageScore,
        note: 'Nadi methodology: Marriage happens in DBA of planets signifying 2,7,11. Sub-Lord of planet determines if marriage is promised or denied.',
      };
    })() : null,
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 4: CAREER & FINANCIAL STATUS
  // ══════════════════════════════════════════════════════════════
  const h10 = analyzeHouse(10, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const h2 = analyzeHouse(2, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const h11 = analyzeHouse(11, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const h4Career = analyzeHouse(4, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const lord10Name = getHouseLord(10);
  const lord2Name = getHouseLord(2);
  const lord11Name = getHouseLord(11);
  const lord4CareerName = getHouseLord(4);

  // Determine career suggestions based on 10th house lord, planets in 10th, AND Amatyakaraka — RANKED by strength
  // Amatyakaraka (Jaimini career significator) is added to the pool because it DEFINES career
  // direction even when not placed in the 10th house. Similarly, planets aspecting the 10th
  // with strong dignity contribute career themes.
  const _baseCareerPlanets = [lord10Name, ...(h10?.planetsInHouse || [])].filter(p => p && p !== 'Lagna' && p !== 'Ascendant');
  const amatyakarakaPlanet = jaiminiKarakas?.karakas?.Amatyakaraka?.planet;
  // Add Amatyakaraka to career planet pool if not already present
  if (amatyakarakaPlanet && !_baseCareerPlanets.includes(amatyakarakaPlanet)) {
    _baseCareerPlanets.push(amatyakarakaPlanet);
  }
  // Add planets aspecting 10th house that are exalted or in own sign (strong career influence)
  const h10AspectPlanets = (h10?.aspectingPlanets || []).map(a => typeof a === 'string' ? a : a.planet).filter(Boolean);
  for (const asp of h10AspectPlanets) {
    if (!_baseCareerPlanets.includes(asp) && asp !== 'Lagna' && asp !== 'Ascendant') {
      const aspDignity = planetStrengths[asp.toLowerCase()]?.dignityLevel || '';
      if (aspDignity === 'Exalted' || aspDignity === 'Own Sign' || aspDignity === 'Moolatrikona') {
        _baseCareerPlanets.push(asp);
      }
    }
  }
  const careerPlanets = _baseCareerPlanets;

  // Combination archetypes — REMOVED. AI interprets planet combinations directly.
  // The engine now provides only technical data: which planets influence career,
  // their strengths, dignities, house placements, and functional natures.

  // Score each planet's career influence (PURE TECHNICAL — no career name mapping)
  const rahuInTenth = (h10?.planetsInHouse || []).includes('Rahu');
  const ketuInTenth = (h10?.planetsInHouse || []).includes('Ketu');
  const isInTenth = (pName) => (h10?.planetsInHouse || []).includes(pName);
  const careerPlanetScores = careerPlanets.map(pName => {
    const key = pName.toLowerCase();
    const pStrength = advancedShadbala?.[key]?.percentage || planetStrengths[key]?.score || 50;
    const dignity = planetStrengths[key]?.dignityLevel || 'Neutral';
    const isLord10 = pName === lord10Name;
    const isAmatyakaraka = jaiminiKarakas?.karakas?.Amatyakaraka?.planet === pName;
    const isAspecting10th = h10AspectPlanets.includes(pName);
    const functionalNature = getFunctionalNature(lagnaName, pName);
    const rashiName = planetStrengths[key]?.rashi || '';
    const houseNum = getPlanetHouse(pName);
    const isRetrograde = planets[key]?.isRetrograde || false;
    const nakshatraName = planets[key]?.nakshatra || '';

    // Base score from planet strength (0-100 range)
    let influence = pStrength;

    // 10th lord gets priority boost
    if (isLord10) influence += 30;
    if (isAmatyakaraka) {
      influence += 25;
      if (dignity === 'Exalted' || dignity === 'Moolatrikona' || dignity === 'Own Sign') {
        influence += 10;
      }
    }
    if (isAspecting10th && !isLord10 && !isInTenth(pName)) influence += 10;
    if (pName === 'Rahu' && rahuInTenth) influence += 40;
    if (pName === 'Ketu' && ketuInTenth) influence += 25;

    // Dignity modifiers
    if (dignity === 'Exalted' || dignity === 'Moolatrikona') influence += 15;
    else if (dignity === 'Own Sign') influence += 10;
    else if (dignity === "Friend's Sign") influence += 5;
    else if (dignity === "Enemy's Sign" && !(pName === 'Rahu' && rahuInTenth)) influence -= 10;
    else if (dignity === 'Debilitated') influence -= 20;

    return { planet: pName, influence, isLord10, isAmatyakaraka, dignity, functionalNature, rashi: rashiName, house: houseNum, isRetrograde, nakshatra: nakshatraName, isInTenth: isInTenth(pName), isAspecting10th };
  }).sort((a, b) => b.influence - a.influence);

  // 10th house sign — raw technical data for AI interpretation
  const h10RashiEnglish = h10?.rashiEnglish || '';
  const h10Element = (() => {
    const ELEMENTS = { Fire: ['Aries','Leo','Sagittarius'], Earth: ['Taurus','Virgo','Capricorn'], Air: ['Gemini','Libra','Aquarius'], Water: ['Cancer','Scorpio','Pisces'] };
    for (const [el, signs] of Object.entries(ELEMENTS)) { if (signs.includes(h10RashiEnglish)) return el; }
    return '';
  })();
  const h10Modality = (() => {
    const MOD = { Cardinal: ['Aries','Cancer','Libra','Capricorn'], Fixed: ['Taurus','Leo','Scorpio','Aquarius'], Mutable: ['Gemini','Virgo','Sagittarius','Pisces'] };
    for (const [mod, signs] of Object.entries(MOD)) { if (signs.includes(h10RashiEnglish)) return mod; }
    return '';
  })();

  // Planet combinations in career sector (for AI to interpret)
  const careerPlanetCombinations = [];
  for (let i = 0; i < careerPlanetScores.length; i++) {
    for (let j = i + 1; j < careerPlanetScores.length; j++) {
      const p1 = careerPlanetScores[i];
      const p2 = careerPlanetScores[j];
      // Only include combinations where both planets are in 10th or one is 10th lord
      if (p1.isInTenth || p2.isInTenth || p1.isLord10 || p2.isLord10) {
        careerPlanetCombinations.push({
          planets: `${p1.planet}+${p2.planet}`,
          combinedInfluence: Math.round(p1.influence + p2.influence),
          context: `${p1.planet} (${p1.dignity}, ${p1.functionalNature}) + ${p2.planet} (${p2.dignity}, ${p2.functionalNature})`,
        });
      }
    }
  }

  // Dhana (wealth) yogas check
  const dhanaYogas = [];
  // 2nd lord in kendra/trikona
  const lord2House = getPlanetHouse(lord2Name);
  if (lord2House && (isInKendra(lord2House) || isInTrikona(lord2House))) {
    dhanaYogas.push(`${lord2Name} (2nd lord) in house ${lord2House} — wealth accumulation supported`);
  }
  // 11th lord in kendra
  const lord11House = getPlanetHouse(lord11Name);
  if (lord11House && isInKendra(lord11House)) {
    dhanaYogas.push(`${lord11Name} (11th lord) in Kendra — strong income gains`);
  }
  // 9th lord (fortune) + 10th lord connection
  const lord9Name = getHouseLord(9);
  const lord9House = getPlanetHouse(lord9Name);
  const lord10House = getPlanetHouse(lord10Name);
  if (lord9House && lord10House && lord9House === lord10House) {
    dhanaYogas.push(`Raja Yoga: 9th lord (${lord9Name}) and 10th lord (${lord10Name}) conjoin — fortune through career`);
  }

  const career = {
    title: 'Career & Financial Status',
    sinhala: 'වෘත්තිය හා මූල්‍ය තත්ත්වය',
    tenthHouse: h10,
    tenthLord: { name: lord10Name, house: lord10House },
    secondHouse: h2,
    eleventhHouse: h11,
    // TECHNICAL DATA ONLY — AI interprets career from these
    careerPlanetRanking: careerPlanetScores.map(p => ({
      planet: p.planet,
      influence: Math.round(p.influence),
      role: p.isLord10 ? '10th lord' : p.isAmatyakaraka ? 'Amatyakaraka' : p.isInTenth ? 'in 10th house' : p.isAspecting10th ? 'aspects 10th' : 'career pool',
      dignity: p.dignity,
      functionalNature: p.functionalNature,
      rashi: p.rashi,
      house: p.house,
      isRetrograde: p.isRetrograde,
      nakshatra: p.nakshatra,
    })),
    careerPlanetCombinations,
    tenthHouseSign: { rashi: h10RashiEnglish, element: h10Element, modality: h10Modality },
    rahuInTenth,
    ketuInTenth,
    dhanaYogas,
    wealthStrength: ashtakavarga?.sarvashtakavarga ? (() => {
      // Check bindus in 2nd and 11th house signs
      const h2RashiIdx = (houses[1]?.rashiId || 1) - 1;
      const h11RashiIdx = (houses[10]?.rashiId || 1) - 1;
      const h2Bindus = ashtakavarga.sarvashtakavarga[h2RashiIdx] || 0;
      const h11Bindus = ashtakavarga.sarvashtakavarga[h11RashiIdx] || 0;
      return { house2Bindus: h2Bindus, house11Bindus: h11Bindus, assessment: (h2Bindus + h11Bindus) >= 56 ? 'Strong wealth potential' : (h2Bindus + h11Bindus) >= 48 ? 'Moderate wealth' : 'Wealth requires effort' };
    })() : null,
    businessVsService: { lord10InKendra: isInKendra(lord10House), lord10InDusthana: isInDusthana(lord10House), lord10House: lord10House },
    // ── NEW: D10 Dashamsha for career precision ─────────────────
    dashamsha: extendedVargas?.D10 ? {
      d10Lagna: extendedVargas.D10.lagnaRashi,
      d10Sun: extendedVargas.D10.positions?.sun?.vargaRashi,
      d10Saturn: extendedVargas.D10.positions?.saturn?.vargaRashi,
      d10TenthLord: extendedVargas.D10.positions?.[lord10Name.toLowerCase()]?.vargaRashi,
      note: `D10 career chart shows ${extendedVargas.D10.lagnaRashi} rising — this reveals the deeper professional destiny beyond the birth chart`,
    } : null,
    // ── NEW: Amatyakaraka (career significator) from Jaimini ────
    amatyakaraka: jaiminiKarakas?.karakas?.Amatyakaraka ? {
      planet: jaiminiKarakas.karakas.Amatyakaraka.planet,
      rashi: jaiminiKarakas.karakas.Amatyakaraka.rashi,
      meaning: jaiminiKarakas.karakas.Amatyakaraka.meaning,
    } : null,
    // ── NEW: 10th lord Shadbala strength ─────────────────────────
    tenthLordShadbala: advancedShadbala?.[lord10Name.toLowerCase()] ? {
      totalRupas: advancedShadbala[lord10Name.toLowerCase()].totalRupas,
      percentage: advancedShadbala[lord10Name.toLowerCase()].percentage,
      strength: advancedShadbala[lord10Name.toLowerCase()].strength,
      strongestComponent: (() => {
        const comp = advancedShadbala[lord10Name.toLowerCase()].components;
        if (!comp) return null;
        const sorted = Object.entries(comp).sort((a, b) => b[1] - a[1]);
        return { name: sorted[0]?.[0], value: sorted[0]?.[1] };
      })(),
    } : null,
    lagnaCuspWarning: lagnaCuspWarning,
    // ── Nadi Astrology Career Analysis (Sub-Lord methodology) ──
    nadiCareer: nadiPredictions ? (() => {
      const service = nadiPredictions.events.career_service;
      const business = nadiPredictions.events.career_business;
      return {
        serviceVerdict: service?.verdict,
        serviceStrength: service?.strength,
        businessVerdict: business?.verdict,
        businessStrength: business?.strength,
        careerType: nadiPredictions.careerType,
        careerSectors: nadiPredictions.careerSectors,
        bestDashaPlanets: service?.bestDashaPlanets || [],
        wealthVerdict: nadiPredictions.events.wealth?.verdict,
        windfallVerdict: nadiPredictions.events.windfall?.verdict,
        note: 'Nadi methodology: Career success comes in DBA of planets signifying 2,6,10,11 (service) or 2,7,10,11 (business). 6,11 is strongest career combination; 10,11 gives status.',
      };
    })() : null,
    // ══════════════════════════════════════════════════════════════
    // CAREER PROMOTION TIMING — When promotion windows open
    // ══════════════════════════════════════════════════════════════
    promotionWindows: (() => {
      const windows = [];
      const promotionSignifiers = ['Sun', lord10Name, lord9Name, 'Jupiter'];
      const saturnReturnAge = 28 + Math.floor(Math.random() * 3); // ~28-31
      const birthYear = date.getFullYear();
      const currentYear = new Date().getFullYear();
      
      // Scan dashas for promotion indicators
      for (const md of dasaPeriods) {
        if (!md.antardashas) continue;
        const mdStart = new Date(md.start).getFullYear();
        const mdEnd = new Date(md.endDate).getFullYear();
        
        // Skip if entirely in the past or too far future
        if (mdEnd < currentYear - 5 || mdStart > currentYear + 25) continue;
        
        for (const ad of md.antardashas) {
          const adStart = parseInt(ad.start?.substring(0, 4), 10);
          const adEnd = parseInt(ad.endDate?.substring(0, 4), 10);
          if (isNaN(adStart) || adEnd < currentYear - 2) continue;
          
          let score = 0;
          const reasons = [];
          
          // 10th lord dasha = strongest promotion indicator
          if (md.lord === lord10Name) { score += 25; reasons.push(`${lord10Name} Mahadasha (10th lord activation)`); }
          if (ad.lord === lord10Name) { score += 20; reasons.push(`${lord10Name} Antardasha (10th lord sub-period)`); }
          
          // Sun dasha = authority, government favor, recognition
          if (md.lord === 'Sun') { score += 15; reasons.push('Sun Mahadasha (authority & recognition)'); }
          if (ad.lord === 'Sun') { score += 12; reasons.push('Sun Antardasha (leadership boost)'); }
          
          // Jupiter dasha = expansion, growth, wisdom
          if (md.lord === 'Jupiter') { score += 18; reasons.push('Jupiter Mahadasha (expansion & growth)'); }
          if (ad.lord === 'Jupiter') { score += 12; reasons.push('Jupiter Antardasha (fortune)'); }
          
          // 9th lord = luck, fortune, divine blessing
          if (md.lord === lord9Name) { score += 15; reasons.push(`${lord9Name} Mahadasha (9th lord — fortune)`); }
          if (ad.lord === lord9Name) { score += 10; reasons.push(`${lord9Name} Antardasha (luck boost)`); }
          
          // 11th lord = gains, income increase
          if (md.lord === lord11Name) { score += 12; reasons.push(`${lord11Name} Mahadasha (11th lord — gains)`); }
          if (ad.lord === lord11Name) { score += 8; reasons.push(`${lord11Name} Antardasha (income growth)`); }
          
          // Saturn return effect (ages 28-30)
          const ageAtPeriod = adStart - birthYear;
          if (ageAtPeriod >= 27 && ageAtPeriod <= 31) {
            score += 10;
            reasons.push('Saturn return age — career restructuring & maturity');
          }
          
          // Skip low-score periods
          if (score < 20) continue;
          
          windows.push({
            period: `${md.lord}-${ad.lord}`,
            dateRange: `${ad.start} to ${ad.endDate}`,
            age: `${adStart - birthYear} to ${adEnd - birthYear}`,
            score,
            confidence: score >= 40 ? 'HIGH' : score >= 25 ? 'MODERATE' : 'POSSIBLE',
            reasons,
            isActive: adStart <= currentYear && adEnd >= currentYear,
          });
        }
      }
      
      // Sort by score and return top windows
      windows.sort((a, b) => b.score - a.score);
      return {
        topWindows: windows.slice(0, 6),
        currentActive: windows.find(w => w.isActive) || null,
        saturnReturnAge: `${saturnReturnAge} years`,
        note: 'Promotion timing is strongest when 10th lord, Sun, Jupiter, or 9th lord are activated. Saturn return (ages 28-31) often brings major career restructuring.',
      };
    })(),
  };

  // ── HOME & DOMESTIC LIFE INDICATORS (appended to career section) ──
  (() => {
    const lord4CareerHouse = getPlanetHouse(lord4CareerName);
    const h4Planets = (h4Career?.planetsInHouse || []).filter(p => !['Rahu','Ketu','Lagna','Ascendant'].includes(p));
    const BENEFICS = ['Jupiter','Venus','Mercury','Moon'];
    const DUSTHANA = [6, 8, 12];
    const beneficsInH4 = h4Planets.filter(p => BENEFICS.includes(p));
    const maleficsInH4 = h4Planets.filter(p => !BENEFICS.includes(p));
    const h10Planets = (h10?.planetsInHouse || []).filter(p => !['Rahu','Ketu','Lagna','Ascendant'].includes(p));
    const h10Empty = h10Planets.length === 0;

    // Kemadruma: Moon isolated — no planets in 2nd or 12th from Moon, no conjunction
    const moonHouseKema = getPlanetHouse('Moon');
    var kemadrumaPresent = false;
    if (moonHouseKema) {
      const idx = moonHouseKema - 1;
      const prevIdx = (idx - 1 + 12) % 12;
      const nextIdx = (idx + 1) % 12;
      const hasVisible = (houseObj) => (houseObj?.planets || []).some(p => !['Sun','Rahu','Ketu','Lagna','Ascendant'].includes(p.name || p));
      kemadrumaPresent = !hasVisible(houses[prevIdx]) && !hasVisible(houses[nextIdx]) &&
        !(houses[idx]?.planets || []).some(p => !['Sun','Rahu','Ketu','Lagna','Ascendant','Moon'].includes(p.name || p));
    }

    // Domestic yogas
    const domesticYogas = [];
    if (beneficsInH4.includes('Jupiter') && beneficsInH4.includes('Mercury')) {
      domesticYogas.push('Jupiter + Mercury in home house — exceptional domestic intelligence, educated homemaker energy, wisdom expressed through family management');
    } else if (beneficsInH4.includes('Jupiter')) {
      domesticYogas.push('Jupiter in home house — home is a place of wisdom, teaching, and abundance');
    } else if (beneficsInH4.includes('Venus')) {
      domesticYogas.push('Venus in home house — beautiful, artistic, harmonious home environment');
    }
    if (lord4CareerHouse && DUSTHANA.includes(lord4CareerHouse)) {
      domesticYogas.push(`Home lord ${lord4CareerName} in house ${lord4CareerHouse} (suffering house) — domestic life carries hidden burdens, sacrifices, or losses not visible to the outside world`);
    }
    if (kemadrumaPresent) {
      domesticYogas.push('Moon isolated without planetary support — emotional isolation within the home, deep inner world, tendency to carry domestic burdens alone');
    }

    // Domestic role score
    var domesticScore = 0;
    if (h10Empty) domesticScore += 2;
    if (beneficsInH4.length >= 2) domesticScore += 2;
    if (lord4CareerHouse && DUSTHANA.includes(lord4CareerHouse)) domesticScore += 1;
    if (kemadrumaPresent) domesticScore += 1;
    if (lord10House && DUSTHANA.includes(lord10House)) domesticScore += 1;
    const domesticRole = domesticScore >= 4 ? 'PRIMARY' : domesticScore >= 2 ? 'SECONDARY' : 'NONE';

    // Plain-language home narrative
    var homeNarrative = '';
    if (domesticRole === 'PRIMARY') {
      homeNarrative = `The home IS the career. The ${h10Empty ? 'empty 10th house' : 'weakened external-career house'} combined with ${beneficsInH4.length >= 2 ? 'powerful planets in the home house' : 'a home-focused chart'} shows a person whose greatest work happens within the family.` +
        (lord4CareerHouse && DUSTHANA.includes(lord4CareerHouse) ? ` The home lord in house ${lord4CareerHouse} shows this domestic role carries real burden and sacrifice, often unseen by the outside world.` : '') +
        (kemadrumaPresent ? ` Emotional isolation is a recurring theme — this person carries the weight of the household largely alone, even when surrounded by family.` : '') +
        (beneficsInH4.includes('Jupiter') && beneficsInH4.includes('Mercury') ? ` Yet the intellect and wisdom in the home house reveal a highly educated, sharp mind channeled into domestic excellence — this is not a passive homemaker but a highly capable manager of the home domain.` : '');
    } else if (domesticRole === 'SECONDARY') {
      homeNarrative = `Career and home life are intertwined. This person may work from home, choose family-friendly careers, or prioritize domestic stability over professional ambition.` +
        (beneficsInH4.length > 0 ? ` The home house is well-supported, making domestic life a genuine source of strength and satisfaction.` : '');
    } else {
      homeNarrative = `External career ambition is strong. Home life, while valued, is secondary to professional achievement.`;
    }

    career.homeLifeIndicators = {
      h4Lord: lord4CareerName,
      h4LordHouse: lord4CareerHouse,
      h4LordInDusthana: lord4CareerHouse ? DUSTHANA.includes(lord4CareerHouse) : false,
      beneficsInH4,
      maleficsInH4,
      h4PlanetsAll: h4Planets,
      h10Empty,
      h10PlanetsCount: h10Planets.length,
      kemadrumaPresent,
      domesticYogas,
      domesticRole,     // 'PRIMARY' | 'SECONDARY' | 'NONE'
      domesticScore,
      homeNarrative,
    };
  })();

  // ══════════════════════════════════════════════════════════════
  // SECTION 5: CHILDREN & FAMILY
  // ══════════════════════════════════════════════════════════════
  const h5 = analyzeHouse(5, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const lord5Name = getHouseLord(5);
  const lord5House = getPlanetHouse(lord5Name);
  const jupiterHouse = getPlanetHouse('Jupiter');

  const children = {
    title: 'Children & Family',
    sinhala: 'දරු සම්පත් හා පවුල',
    fifthHouse: h5,
    fifthLord: { name: lord5Name, house: lord5House },
    jupiter: { house: jupiterHouse, note: 'Jupiter is the natural karaka (significator) for children' },
    assessment: h5?.strength === 'very strong' || h5?.strength === 'strong'
      ? 'Strong indications for children. The 5th house is well-disposed.'
      : h5?.strength === 'challenged' || h5?.strength === 'weak'
        ? 'Some challenges related to children may arise. Remedial measures recommended.'
        : 'Moderate indications. Timing through Dasha of 5th lord is important.',
    childrenTimingDasas: lifespanFilter(dasaPeriods.filter(d => d.lord === lord5Name || d.lord === 'Jupiter')).map(d => `${d.lord}: ${d.start} to ${d.endDate}`),
    // ── NEW: D7 Saptamsha for children accuracy ─────────────────
    saptamsha: extendedVargas?.D7 ? {
      d7Lagna: extendedVargas.D7.lagnaRashi,
      d7Jupiter: extendedVargas.D7.positions?.jupiter?.vargaRashi,
      d7FifthLord: extendedVargas.D7.positions?.[lord5Name.toLowerCase()]?.vargaRashi,
      note: `D7 children chart shows ${extendedVargas.D7.lagnaRashi} rising — this is the definitive chart for children, their nature, and timing of birth`,
    } : null,
    // ── NEW: Putrakaraka (children significator) from Jaimini ────
    putrakaraka: jaiminiKarakas?.karakas?.Putrakaraka ? {
      planet: jaiminiKarakas.karakas.Putrakaraka.planet,
      rashi: jaiminiKarakas.karakas.Putrakaraka.rashi,
      meaning: jaiminiKarakas.karakas.Putrakaraka.meaning,
    } : null,
    // ── NEW: Jupiter Shadbala strength (children karaka) ─────────
    jupiterShadbala: advancedShadbala?.jupiter ? {
      totalRupas: advancedShadbala.jupiter.totalRupas,
      percentage: advancedShadbala.jupiter.percentage,
      strength: advancedShadbala.jupiter.strength,
    } : null,
    // ── NEW: Estimated children count (multi-factor scoring) ─────
    estimatedChildren: (() => {
      let childScore = 0;
      let genderHints = [];
      const h5Planets = h5?.planetsInHouse || [];
      const h5Strength = h5?.strength || 'moderate';

      // Factor 1: 5th house strength
      if (h5Strength === 'very strong') childScore += 2;
      else if (h5Strength === 'strong') childScore += 1.5;
      else if (h5Strength === 'moderate') childScore += 1;
      else childScore += 0.5;

      // Factor 2: Planets in 5th house (each benefic adds ~0.5 child indication)
      for (const pl of h5Planets) {
        const nature = getFunctionalNature(lagnaName, pl);
        if (nature === 'benefic' || nature === 'yogaKaraka') childScore += 0.5;
        if (nature === 'malefic') childScore -= 0.3;
        // Gender hints
        if (['Sun', 'Mars', 'Jupiter'].includes(pl)) genderHints.push('male');
        if (['Moon', 'Venus'].includes(pl)) genderHints.push('female');
      }

      // Factor 3: Jupiter's condition (natural putra karaka)
      const jupScore = getHealthScore('jupiter');
      if (jupScore >= 70) childScore += 1;
      else if (jupScore >= 50) childScore += 0.5;
      else if (jupScore < 35) childScore -= 0.5;

      // Factor 4: Jupiter debilitated reduces fertility
      const jupDebilitated = planets.jupiter?.rashiId === 10; // Capricorn
      if (jupDebilitated) childScore -= 0.5;

      // Factor 5: 5th lord placement
      if (lord5House && [1, 4, 5, 7, 9, 10, 11].includes(lord5House)) childScore += 0.5;
      if (lord5House && [6, 8, 12].includes(lord5House)) childScore -= 0.5;

      // Factor 6: D7 Saptamsha confirmation (if available)
      if (extendedVargas?.D7) {
        const d7JupRashi = extendedVargas.D7.positions?.jupiter?.vargaRashi;
        const d7FifthLord = extendedVargas.D7.positions?.[lord5Name.toLowerCase()]?.vargaRashi;
        // Good D7 placements boost
        if (d7JupRashi && ['Sagittarius', 'Pisces', 'Cancer'].includes(d7JupRashi)) childScore += 0.5;
        if (d7FifthLord) childScore += 0.3; // 5th lord visible in D7 = positive
      }

      // Factor 7: Ashtakavarga bindus for 5th house
      if (ashtakavarga?.sarvashtakavarga) {
        const h5Bindus = ashtakavarga.sarvashtakavarga[4]; // 0-indexed
        if (h5Bindus >= 30) childScore += 0.5;
        else if (h5Bindus < 22) childScore -= 0.5;
      }

      // Factor 8: Saturn/Rahu/Ketu in 5th reduces
      if (h5Planets.includes('Saturn')) childScore -= 0.3;
      if (h5Planets.includes('Rahu')) childScore -= 0.2;
      if (h5Planets.includes('Ketu')) childScore -= 0.3;

      // Factor 9: Marriage denial cross-reference — graduated reduction
      // SEVERE (50+): marriage very unlikely → children through marriage improbable
      // HIGH (35-49): significant obstacles → children moderately unlikely  
      // MODERATE (20-34): delayed marriage → slight impact on children timing
      let marriageDenialImpact = null;
      try {
        const mDenial = cachedMarriageDenial || assessMarriageDenial(date, lat, lng);
        if (mDenial.severity === 'SEVERE') {
          childScore -= 1.5;
          marriageDenialImpact = 'SEVERE — marriage very unlikely, children through marriage improbable';
        } else if (mDenial.severity === 'HIGH') {
          childScore -= 0.8;
          marriageDenialImpact = 'HIGH — significant marriage obstacles, children through marriage unlikely';
        } else if (mDenial.severity === 'MODERATE') {
          childScore -= 0.3;
          marriageDenialImpact = 'MODERATE — marriage delayed, children timing affected';
        }
      } catch (e) { /* skip */ }

      const count = Math.max(0, Math.round(childScore));
      const maleHints = genderHints.filter(g => g === 'male').length;
      const femaleHints = genderHints.filter(g => g === 'female').length;
      const genderTendency = maleHints > femaleHints ? 'Sons more likely' : femaleHints > maleHints ? 'Daughters more likely' : 'Mix of sons and daughters';

      return {
        count: count >= 3 ? '3 or more' : count.toString(),
        genderTendency,
        jupiterDebilitated: jupDebilitated,
        marriageDenialImpact,
        score: childScore.toFixed(1),
        note: `Multi-factor child estimation: 5th house (${h5Strength}), Jupiter strength (${jupScore}%), ${h5Planets.length} planets in 5th, 5th lord in house ${lord5House}${extendedVargas?.D7 ? ', D7 confirmed' : ''}${marriageDenialImpact ? ', MARRIAGE DENIAL APPLIED' : ''}.`,
      };
    })(),
    // ── NEW: Predicted Children Birth Years ───────────────────────
    childrenBirthYears: (() => {
      try {
        const estCount = (() => {
          // Reuse the same scoring logic result
          let cs = 0;
          const h5S = h5?.strength || 'moderate';
          if (h5S === 'very strong') cs += 2; else if (h5S === 'strong') cs += 1.5; else if (h5S === 'moderate') cs += 1; else cs += 0.5;
          for (const pl of (h5?.planetsInHouse || [])) {
            const nat = getFunctionalNature(lagnaName, pl);
            if (nat === 'benefic' || nat === 'yogaKaraka') cs += 0.5;
            if (nat === 'malefic') cs -= 0.3;
          }
          const jScore = getHealthScore('jupiter');
          if (jScore >= 70) cs += 1; else if (jScore >= 50) cs += 0.5; else if (jScore < 35) cs -= 0.5;
          if (lord5House && [1, 4, 5, 7, 9, 10, 11].includes(lord5House)) cs += 0.5;
          if (lord5House && [6, 8, 12].includes(lord5House)) cs -= 0.5;
          return Math.max(0, Math.min(4, Math.round(cs)));
        })();
        if (estCount === 0) return { children: [], note: 'Children are not strongly indicated in this chart.' };

        // Find marriage timing window as baseline
        let marriageYear = null;
        try {
          const mtp = predictMarriageTiming(date, lat, lng);
          if (mtp.bestWindow?.peakYear) {
            marriageYear = parseInt(mtp.bestWindow.peakYear, 10);
          } else if (mtp.firstMarriageWindows?.length > 0) {
            const firstW = mtp.firstMarriageWindows[0];
            marriageYear = parseInt(firstW.peakYear || firstW.start?.substring(0, 4), 10);
          }
        } catch (e) { /* skip */ }
        // Fallback: if no marriage timing, use Venus dasha or age 27 approximation
        if (!marriageYear || isNaN(marriageYear)) {
          const venDasha = dasaPeriods.find(d => d.lord === 'Venus');
          if (venDasha) {
            const vy = parseInt(venDasha.start?.substring(0, 4), 10);
            const vAge = vy - date.getUTCFullYear();
            if (vAge >= 20 && vAge <= 40) marriageYear = vy;
          }
          if (!marriageYear) marriageYear = date.getUTCFullYear() + 27;
        }

        // Collect fertile antardasha windows across ALL dashas after marriage
        const fertileDashas = [];
        const fertilePlanets = new Set(['Jupiter', lord5Name, 'Moon', 'Venus']);
        // Rahu/Ketu dispositors — Rahu acts through the lord of the sign it occupies
        const getHouseLordLocal = (hNum) => {
          const hObj = houses[hNum - 1];
          return hObj?.rashiLord || '';
        };
        const rahuHouseLocal = houses.findIndex(h => h.planets.some(p => p.name === 'Rahu')) + 1;
        const ketuHouseLocal = houses.findIndex(h => h.planets.some(p => p.name === 'Ketu')) + 1;
        const rahuDisp = rahuHouseLocal ? getHouseLordLocal(rahuHouseLocal) : '';
        const ketuDisp = ketuHouseLocal ? getHouseLordLocal(ketuHouseLocal) : '';

        for (const d of dasaPeriods) {
          const dStart = parseInt(d.start?.substring(0, 4), 10);
          const dEnd = parseInt(d.endDate?.substring(0, 4), 10);
          if (isNaN(dStart) || isNaN(dEnd)) continue;
          if (dEnd < marriageYear) continue; // entire dasha before marriage

          // Rahu/Ketu act through their dispositors for fertility
          const effectiveMDLord = d.lord === 'Rahu' ? rahuDisp : d.lord === 'Ketu' ? ketuDisp : d.lord;
          const isFertileMD = fertilePlanets.has(d.lord) || fertilePlanets.has(effectiveMDLord);

          // Scan ALL antardashas — children come in ANY dasha when AD activates fertile planet
          if (d.antardashas && d.antardashas.length > 0) {
            for (const ad of d.antardashas) {
              const adStart = parseInt(ad.start?.substring(0, 4), 10);
              const adEnd = parseInt(ad.endDate?.substring(0, 4), 10);
              if (isNaN(adStart) || adEnd < marriageYear) continue;
              const adAge = adStart - date.getUTCFullYear();
              if (adAge > 48 || adAge < 18) continue; // childbearing age range

              const effectiveADLord = ad.lord === 'Rahu' ? rahuDisp : ad.lord === 'Ketu' ? ketuDisp : ad.lord;
              const isFertileAD = fertilePlanets.has(ad.lord) || fertilePlanets.has(effectiveADLord);
              // Must have at least one fertile planet in the MD-AD combo
              if (!isFertileMD && !isFertileAD) continue;

              let score = 0;
              if (d.lord === 'Jupiter') score += 3;
              if (d.lord === lord5Name && d.lord !== 'Jupiter') score += 3; // avoid double-count when Jupiter IS 5th lord
              if (ad.lord === 'Jupiter') score += 2;
              if (ad.lord === lord5Name && ad.lord !== 'Jupiter') score += 2; // avoid double-count
              if (d.lord === 'Venus' || ad.lord === 'Venus') score += 1;
              if (d.lord === 'Moon' || ad.lord === 'Moon') score += 1;
              // Double fertile = extra boost
              if (isFertileMD && isFertileAD) score += 1;
              // Boost if within 1-5 years after marriage — children most commonly arrive in this window
              // This boost must be strong enough to outweigh distant Jupiter periods
              const yearsAfterMarriage = Math.max(0, adStart - marriageYear);
              if (yearsAfterMarriage >= 1 && yearsAfterMarriage <= 5) score += 6;
              else if (yearsAfterMarriage >= 0 && yearsAfterMarriage <= 8) score += 4;
              else if (yearsAfterMarriage >= 0 && yearsAfterMarriage <= 12) score += 2;

              const effectiveStart = Math.max(adStart, marriageYear + 1);
              fertileDashas.push({
                period: `${d.lord}-${ad.lord}`,
                yearRange: `${effectiveStart}-${adEnd}`,
                peakYear: Math.round((effectiveStart + adEnd) / 2),
                age: `${effectiveStart - date.getUTCFullYear()} to ${adEnd - date.getUTCFullYear()}`,
                score,
                reason: `${d.lord} main period + ${ad.lord} sub-period — ${d.lord === 'Jupiter' ? 'children karaka active' : d.lord === lord5Name ? '5th lord active' : ad.lord === 'Jupiter' ? 'children karaka in sub-period' : ad.lord === lord5Name ? '5th lord in sub-period' : 'fertile period'}`
              });
            }
          } else if (isFertileMD) {
            // No antardasha detail — use whole dasha
            const effectiveStart = Math.max(dStart, marriageYear + 1);
            fertileDashas.push({
              period: d.lord,
              yearRange: `${effectiveStart}-${dEnd}`,
              peakYear: Math.round((effectiveStart + Math.min(dEnd, effectiveStart + 3)) / 2),
              age: `${effectiveStart - date.getUTCFullYear()} to ${dEnd - date.getUTCFullYear()}`,
              score: d.lord === 'Jupiter' ? 3 : 2,
              reason: `${d.lord} period — fertile window`
            });
          }
        }

        // Sort by score and pick top windows for each child
        // Sort by score, then select top windows with minimum spacing and re-sort chronologically
        fertileDashas.sort((a, b) => b.score - a.score);
        const selectedWindows = [];
        const usedPeakYears = new Set();

        for (const fd of fertileDashas) {
          if (selectedWindows.length >= estCount) break;
          // Ensure minimum 2-year gap between children
          const tooClose = selectedWindows.some(sw => Math.abs(sw.peakYear - fd.peakYear) < 2);
          if (tooClose || usedPeakYears.has(fd.peakYear)) continue;
          selectedWindows.push(fd);
          usedPeakYears.add(fd.peakYear);
        }

        // Re-sort selected windows chronologically
        selectedWindows.sort((a, b) => a.peakYear - b.peakYear);

        const childPredictions = [];
        for (let i = 0; i < selectedWindows.length; i++) {
          const window = selectedWindows[i];

          const childNum = i + 1;
          const ordinal = childNum === 1 ? '1st' : childNum === 2 ? '2nd' : childNum === 3 ? '3rd' : `${childNum}th`;
          // Gender prediction per child
          const maleIndicators = ['Sun', 'Mars', 'Jupiter'];
          const femaleIndicators = ['Moon', 'Venus'];
          const periodPlanets = [window.period.split('-')[0], window.period.split('-')[1] || ''].filter(Boolean);
          const isMale = periodPlanets.some(p => maleIndicators.includes(p));
          const isFemale = periodPlanets.some(p => femaleIndicators.includes(p));
          const gender = isMale && !isFemale ? 'Son' : isFemale && !isMale ? 'Daughter' : 'Son or Daughter';

          childPredictions.push({
            childNumber: ordinal,
            gender,
            predictedYears: window.yearRange,
            peakYear: window.peakYear,
            parentAge: window.age,
            period: window.period,
            confidence: window.score >= 5 ? 'HIGH' : window.score >= 3 ? 'MODERATE' : 'LOW',
            reason: window.reason,
          });
        }

        return {
          marriageYearUsed: marriageYear,
          children: childPredictions,
          fertilePeriods: fertileDashas.slice(0, 6),
          note: childPredictions.length > 0
            ? `Based on Jupiter, 5th lord (${lord5Name}), and dasha timing analysis, children are predicted in ${childPredictions.length} window(s) after likely marriage year ${marriageYear}.`
            : 'Specific birth year windows could not be determined — consult timing periods for general guidance.'
        };
      } catch (e) {
        return { children: [], note: 'Birth year prediction unavailable' };
      }
    })(),
    // ── NEW: Children's Education & Career Paths ──────────────────
    childrenEducation: (() => {
      // Children's education derived from: 5th house (children's nature), D7 chart,
      // 5th from 5th (9th house = children's fortune/higher ed),
      // 10th from 5th (2nd house = children's career)
      // ARCHITECTURE: Engine provides ONLY technical planet data — AI interprets education fields

      // Primary: Planets IN the 5th house (children's direct nature)
      const h5Planets = (h5?.planetsInHouse || []).filter(p => p !== 'Lagna');
      // Secondary: 5th lord's influence
      const lord5Info = { planet: lord5Name, house: lord5House };
      // Tertiary: Putrakaraka from Jaimini (if available)
      const pkPlanet = jaiminiKarakas?.karakas?.Putrakaraka?.planet;
      // Quaternary: 9th house (5th from 5th = children's higher education/fortune)
      const h9ForChildren = analyzeHouse(9, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
      const h9Planets = (h9ForChildren?.planetsInHouse || []).filter(p => p !== 'Lagna');
      // D7 Jupiter position for children's wisdom
      const d7JupRashi = extendedVargas?.D7?.positions?.jupiter?.vargaRashi;

      // Build technical planet pool for children's education (AI interprets fields from this)
      const childEduPlanetPool = [];
      for (const p of h5Planets) {
        const pData = planets[p.toLowerCase()];
        childEduPlanetPool.push({
          planet: p,
          source: '5th house occupant',
          tier: 1,
          house: 5,
          dignity: planetStrengths[p.toLowerCase()]?.dignityLevel || 'Neutral',
          rashi: pData?.rashi || 'N/A',
        });
      }
      // 5th lord
      const lord5Data = planets[lord5Name.toLowerCase()];
      childEduPlanetPool.push({
        planet: lord5Name,
        source: '5th lord',
        tier: 1,
        house: lord5House,
        dignity: planetStrengths[lord5Name.toLowerCase()]?.dignityLevel || 'Neutral',
        rashi: lord5Data?.rashi || 'N/A',
      });
      // Putrakaraka
      if (pkPlanet) {
        const pkData = planets[pkPlanet.toLowerCase()];
        childEduPlanetPool.push({
          planet: pkPlanet,
          source: 'Putrakaraka',
          tier: 2,
          house: pkData?.house || 'N/A',
          dignity: planetStrengths[pkPlanet.toLowerCase()]?.dignityLevel || 'Neutral',
          rashi: pkData?.rashi || 'N/A',
        });
      }
      // 9th house planets (5th from 5th)
      for (const p of h9Planets) {
        const pData = planets[p.toLowerCase()];
        childEduPlanetPool.push({
          planet: p,
          source: '9th house (5th from 5th)',
          tier: 2,
          house: 9,
          dignity: planetStrengths[p.toLowerCase()]?.dignityLevel || 'Neutral',
          rashi: pData?.rashi || 'N/A',
        });
      }

      // Academic excellence potential — based on Mercury + Jupiter strength and 4th/5th house
      const mercScore = getHealthScore('mercury');
      const jupScoreEdu = getHealthScore('jupiter');
      const h4ForChildEdu = analyzeHouse(4, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
      const h4EduStrength = h4ForChildEdu?.strength || 'moderate';
      const h5EduStrength = h5?.strength || 'moderate';
      let academicScore = 0;
      if (mercScore >= 60) academicScore += 2; else if (mercScore >= 40) academicScore += 1;
      if (jupScoreEdu >= 60) academicScore += 2; else if (jupScoreEdu >= 40) academicScore += 1;
      if (h4EduStrength === 'very strong' || h4EduStrength === 'strong') academicScore += 1;
      if (h5EduStrength === 'very strong' || h5EduStrength === 'strong') academicScore += 1;
      // D7 Jupiter in own/exalted sign = children excel academically
      if (d7JupRashi && ['Sagittarius', 'Pisces', 'Cancer'].includes(d7JupRashi)) academicScore += 1;
      // Rahu in 5th or 9th = foreign education for children
      const foreignEduForChildren = (h5?.planetsInHouse || []).includes('Rahu') || h9Planets.includes('Rahu');

      const academicLevel = academicScore >= 5 ? 'EXCEPTIONAL'
        : academicScore >= 3 ? 'ABOVE AVERAGE'
        : academicScore >= 1 ? 'AVERAGE'
        : 'NEEDS SUPPORT';

      // Study abroad indication
      const studyAbroad = foreignEduForChildren
        ? 'STRONG'
        : [9, 12].includes(lord5House) ? 'MODERATE'
        : 'LOW';

      // Education struggle indicators (technical)
      const eduStruggles = [];
      if ((h5?.planetsInHouse || []).includes('Saturn')) eduStruggles.push('Saturn in 5th house');
      if ((h5?.planetsInHouse || []).includes('Rahu')) eduStruggles.push('Rahu in 5th house');
      if ((h5?.planetsInHouse || []).includes('Ketu')) eduStruggles.push('Ketu in 5th house');
      if (jupScoreEdu < 35) eduStruggles.push('Weak Jupiter');

      return {
        childEduPlanetPool,
        primaryInfluence: h5Planets.length > 0 ? h5Planets.join(', ') : lord5Name,
        academicLevel,
        academicScore,
        foreignEducation: studyAbroad,
        foreignEduIndicator: foreignEduForChildren,
        struggles: eduStruggles,
        d7JupiterRashi: d7JupRashi || 'N/A',
        putrakarakaPlanet: pkPlanet || 'N/A',
        note: `Children's education planets from 5th house (${h5Planets.join(', ') || 'empty'}), 5th lord ${lord5Name}, Putrakaraka ${pkPlanet || 'N/A'}, and 9th house influence.`
      };
    })(),
    // ── Nadi Astrology Children Event Analysis (Sub-Lord methodology) ──
    nadiChildren: nadiPredictions?.events?.children ? (() => {
      const c = nadiPredictions.events.children;
      return {
        verdict: c.verdict,
        strength: c.strength,
        description: c.description,
        bestDashaPlanets: c.bestDashaPlanets,
        strongPlanets: c.strongPlanets?.map(p => p.name),
        averageScore: c.averageScore,
        note: 'Nadi methodology: Children come in DBA of planets signifying 2,5,11. Sub-Lord of 5th cusp determines if children are promised.',
      };
    })() : null,
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 6: LIFELONG FUTURE PREDICTIONS
  // ══════════════════════════════════════════════════════════════
  const currentDate = new Date();
  const currentDasha = dasaPeriods.find(d => new Date(d.start) <= currentDate && new Date(d.endDate) >= currentDate);
  const currentAntardasha = currentDasha?.antardashas?.find(ad => new Date(ad.start) <= currentDate && new Date(ad.endDate) >= currentDate);
  const nextDasha = dasaPeriods.find(d => new Date(d.start) > currentDate);

  const lifePredictions = {
    title: 'Lifelong Future Predictions',
    sinhala: 'ජීවිත කාලීන අනාවැකි',
    currentDasha: currentDasha ? {
      lord: currentDasha.lord,
      period: `${currentDasha.start} to ${currentDasha.endDate}`,
      effects: currentDasha.effects,
      // ── Chart-specific computed effects ──
      chartSpecificEffects: (() => {
        const lord = currentDasha.lord;
        const lordH = getPlanetHouse(lord);
        const ruledHouses = [];
        for (let i = 1; i <= 12; i++) { if (getHouseLord(i) === lord) ruledHouses.push(i); }
        const lordScore = getHealthScore(lord.toLowerCase());
        const funcNature = getFunctionalNature(lagnaName, lord);
        const isRetro = planets[lord.toLowerCase()]?.isRetrograde || false;
        return {
          lordHouse: lordH,
          ruledHouses,
          lordStrength: lordScore,
          functionalNature: funcNature,
          isRetrograde: isRetro,
          houseThemes: ruledHouses.map(h => `House ${h}: ${HOUSE_SIGNIFICATIONS[h]?.governs?.split(',').slice(0, 3).join(', ')}`),
          summary: `${lord} rules houses ${ruledHouses.join(',')} and sits in house ${lordH}. As a ${funcNature} for ${lagnaName} lagna with ${lordScore}% strength${isRetro ? ' (retrograde)' : ''}, this period ${funcNature === 'benefic' || funcNature === 'yogaKaraka' ? 'brings growth in' : funcNature === 'malefic' ? 'creates challenges in' : 'gives mixed results for'} ${ruledHouses.map(h => HOUSE_SIGNIFICATIONS[h]?.governs?.split(',')[0]).join(' and ')}.`,
        };
      })(),
    } : null,
    currentAntardasha: currentAntardasha ? {
      lord: currentAntardasha.lord,
      period: `${currentAntardasha.start} to ${currentAntardasha.endDate}`,
      // ── Chart-specific AD effects ──
      chartSpecificEffects: (() => {
        const lord = currentAntardasha.lord;
        const lordH = getPlanetHouse(lord);
        const ruledHouses = [];
        for (let i = 1; i <= 12; i++) { if (getHouseLord(i) === lord) ruledHouses.push(i); }
        return { lordHouse: lordH, ruledHouses, lordStrength: getHealthScore(lord.toLowerCase()), functionalNature: getFunctionalNature(lagnaName, lord) };
      })(),
    } : null,
    nextDasha: nextDasha ? {
      lord: nextDasha.lord,
      period: `${nextDasha.start} to ${nextDasha.endDate}`,
      effects: nextDasha.effects,
      chartSpecificEffects: (() => {
        const lord = nextDasha.lord;
        const lordH = getPlanetHouse(lord);
        const ruledHouses = [];
        for (let i = 1; i <= 12; i++) { if (getHouseLord(i) === lord) ruledHouses.push(i); }
        const funcNature = getFunctionalNature(lagnaName, lord);
        return {
          lordHouse: lordH, ruledHouses, lordStrength: getHealthScore(lord.toLowerCase()), functionalNature: funcNature,
          summary: `${lord} rules houses ${ruledHouses.join(',')} and sits in house ${lordH}. As a ${funcNature} for ${lagnaName} lagna, this upcoming period ${funcNature === 'benefic' || funcNature === 'yogaKaraka' ? 'promises growth' : funcNature === 'malefic' ? 'requires caution' : 'will bring mixed outcomes'}.`,
        };
      })(),
    } : null,
    lifePhaseSummary: dasaPeriods.map(d => ({
      lord: d.lord,
      period: `${d.start} to ${d.endDate}`,
      years: d.years.toFixed(1),
      theme: DASHA_EFFECTS[d.lord]?.general || '',
      isCurrent: currentDasha?.lord === d.lord,
      // ── Chart-specific theme for THIS person ──
      chartTheme: (() => {
        const ruledHouses = [];
        for (let i = 1; i <= 12; i++) { if (getHouseLord(i) === d.lord) ruledHouses.push(i); }
        const funcN = getFunctionalNature(lagnaName, d.lord);
        const themes = ruledHouses.map(h => HOUSE_SIGNIFICATIONS[h]?.governs?.split(',')[0]?.trim()).filter(Boolean);
        return `${d.lord} (${funcN}) activates ${themes.join(' & ')}`;
      })(),
    })),
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 7: INTELLECTUAL & MENTAL HEALTH
  // ══════════════════════════════════════════════════════════════
  const h4 = analyzeHouse(4, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const lord4Name = getHouseLord(4);
  const mercuryHouse = getPlanetHouse('Mercury');
  const moonHouse = getPlanetHouse('Moon');
  const mercuryStrength = planetStrengths.mercury || {};
  const moonStrength = planetStrengths.moon || {};

  const mentalHealth = {
    title: 'Intellectual & Mental Health',
    sinhala: 'බුද්ධිය හා මානසික සෞඛ්‍යය',
    fourthHouse: h4,
    mercury: { house: mercuryHouse, strength: mercuryStrength.strength, score: mercuryStrength.score, note: 'Mercury governs intellect, analytical ability, and communication' },
    moon: { house: moonHouse, strength: moonStrength.strength, score: moonStrength.score, note: 'Moon governs mind, emotions, and mental stability' },
    education: {
      fourthLord: lord4Name,
      fourthLordHouse: getPlanetHouse(lord4Name),
      fifthLord: lord5Name,
      fifthLordHouse: lord5House,
      assessment: (getHealthScore('mercury') >= 60) && (getHealthScore('moon') >= 50)
        ? 'Strong intellectual capacity. Education will be a source of success.'
        : getHealthScore('mercury') >= 40
          ? 'Good learning ability. Focused effort in education will yield results.'
          : 'Education may face some obstacles. Structured learning approach recommended.',
      // ── NEW: D24 Chaturvimshamsha for education precision ─────
      chaturvimshamsha: extendedVargas?.D24 ? {
        d24Lagna: extendedVargas.D24.lagnaRashi,
        d24Mercury: extendedVargas.D24.positions?.mercury?.vargaRashi,
        d24Jupiter: extendedVargas.D24.positions?.jupiter?.vargaRashi,
        note: `D24 education chart shows ${extendedVargas.D24.lagnaRashi} rising — this reveals the deeper learning destiny and academic potential`,
      } : null,
    },
    mentalStability: (() => {
      // Check Moon-Saturn conjunction (Vish Yoga) — strongest indicator of emotional suffering
      const saturnInMoonHouse = getPlanetHouse('Saturn') === moonHouse;
      if (saturnInMoonHouse) {
        return 'Moon-Saturn conjunction (Vish Yoga) detected — indicates deep emotional sensitivity, childhood trauma or emotional suppression, and periods of depression or melancholy. The native may have experienced a difficult early home environment. Meditation, counseling, and Moon-strengthening remedies are strongly recommended.';
      }
      // Check Moon in dusthana (6, 8, 12)
      if (moonHouse && [6, 8, 12].includes(moonHouse)) {
        return 'Moon in a challenging house — emotional turbulence, anxiety, and mental health fluctuations are possible. Regular meditation and emotional support are recommended.';
      }
      // Check Saturn aspecting Moon (even without conjunction)
      const saturnHouseForMH = getPlanetHouse('Saturn');
      if (saturnHouseForMH && moonHouse) {
        const satToMoon = ((moonHouse - saturnHouseForMH + 12) % 12) + 1;
        if ([3, 7, 10].includes(satToMoon)) {
          return 'Saturn aspects Moon — emotional maturity comes through hardship. You may suppress feelings or carry burdens silently. Learning to express emotions openly is important.';
        }
      }
      if (getHealthScore('moon') >= 70) return 'Emotionally stable with good mental resilience';
      if (getHealthScore('moon') >= 50) return 'Generally stable but may experience emotional fluctuations during Moon-related dashas';
      return 'Mental health needs attention. Meditation, mantra japa, and Moon remedies recommended';
    })(),
    // ── NEW: Mercury & Moon Shadbala for precise mental assessment ─
    mercuryShadbala: advancedShadbala?.mercury ? {
      percentage: advancedShadbala.mercury.percentage,
      strength: advancedShadbala.mercury.strength,
      digBala: advancedShadbala.mercury.components?.digBala,
      note: advancedShadbala.mercury.percentage >= 60 ? 'Mercury has strong directional force — sharp intellect' : 'Mercury needs strengthening for better focus and communication',
    } : null,
    moonShadbala: advancedShadbala?.moon ? {
      percentage: advancedShadbala.moon.percentage,
      strength: advancedShadbala.moon.strength,
      kalaBala: advancedShadbala.moon.components?.kalaBala,
      note: advancedShadbala.moon.percentage >= 60 ? 'Moon has strong temporal force — good emotional stamina' : 'Moon is weak in Shadbala — emotional sensitivity requires care',
    } : null,
    // ── Synthesized Mental Health Risk Assessments ───────────────
    moonAnalysis: (() => {
      const findings = [];
      if (moonHouse && [6, 8, 12].includes(moonHouse)) findings.push(`Moon in house ${moonHouse} — emotional isolation, hidden suffering, difficulty expressing feelings`);
      if (getHealthScore('moon') < 50) findings.push(`Moon is weak (score ${getHealthScore('moon')}/100) — emotional vulnerability, mood instability`);
      const rahuHouseCheck = getPlanetHouse('Rahu');
      const ketuHouseCheck = getPlanetHouse('Ketu');
      if (rahuHouseCheck === moonHouse) findings.push('Rahu conjunct Moon (Grahan Dosha) — anxiety, overthinking, obsessive thought patterns, mental fog');
      if (ketuHouseCheck === moonHouse) findings.push('Ketu conjunct Moon — emotional detachment, dissociation, feeling disconnected from self');
      const saturnHouseCheck = getPlanetHouse('Saturn');
      if (saturnHouseCheck === moonHouse) findings.push('Saturn conjunct Moon (Vish Yoga) — depression, emotional suppression, chronic sadness');
      // Saturn aspecting Moon
      if (saturnHouseCheck && moonHouse) {
        const satToMoon = ((moonHouse - saturnHouseCheck + 12) % 12) + 1;
        if ([3, 7, 10].includes(satToMoon)) findings.push('Saturn aspects Moon — emotional heaviness, tendency to carry burdens silently, delayed emotional maturity');
      }
      // Mars aspecting or conjunct Moon
      const marsHouseCheck = getPlanetHouse('Mars');
      if (marsHouseCheck === moonHouse) findings.push('Mars conjunct Moon — emotional volatility, anger issues, impulsive reactions');
      if (marsHouseCheck && moonHouse) {
        const marsToMoon = ((moonHouse - marsHouseCheck + 12) % 12) + 1;
        if ([4, 7, 8].includes(marsToMoon)) findings.push('Mars aspects Moon — irritability, emotional aggression, inner restlessness');
      }
      if (findings.length === 0) findings.push('Moon is relatively well-placed — emotional foundation is stable');
      return { findings, moonHouse, moonScore: getHealthScore('moon'), moonSign: planets.moon?.rashiEnglish };
    })(),
    depressionRisk: (() => {
      let score = 0;
      const indicators = [];
      // Moon in dusthana
      if (moonHouse && [6, 8, 12].includes(moonHouse)) { score += 2; indicators.push(`Moon in ${moonHouse}th house — emotional darkness/isolation`); }
      // Saturn in 4th (home/happiness disrupted)
      const satHouse = getPlanetHouse('Saturn');
      if (satHouse === 4) { score += 2; indicators.push('Saturn in 4th house — childhood unhappiness, suppressed emotions, cold home environment'); }
      // Saturn conjunct or aspecting Moon
      if (satHouse === moonHouse) { score += 3; indicators.push('Saturn-Moon conjunction (Vish Yoga) — strongest depression indicator in Vedic astrology'); }
      if (satHouse && moonHouse) {
        const satToM = ((moonHouse - satHouse + 12) % 12) + 1;
        if ([3, 7, 10].includes(satToM)) { score += 1; indicators.push('Saturn aspects Moon — melancholy, emotional weight'); }
      }
      // Rahu conjunct Moon
      const rahuH = getPlanetHouse('Rahu');
      if (rahuH === moonHouse) { score += 2; indicators.push('Rahu with Moon — anxiety-driven depression, mental confusion'); }
      // Moon weak in Shadbala
      if (getHealthScore('moon') < 40) { score += 1; indicators.push('Weak Moon strength — low emotional resilience'); }
      // 4th lord in dusthana
      const lord4H = getPlanetHouse(lord4Name);
      if (lord4H && [6, 8, 12].includes(lord4H)) { score += 1; indicators.push(`4th lord in ${lord4H}th — happiness house lord in suffering position`); }
      const level = score >= 5 ? 'HIGH' : score >= 3 ? 'MODERATE' : score >= 1 ? 'LOW' : 'MINIMAL';
      return { level, score, maxScore: 12, indicators };
    })(),
    anxietyRisk: (() => {
      let score = 0;
      const indicators = [];
      const rahuH = getPlanetHouse('Rahu');
      // Rahu conjunct Moon = #1 anxiety indicator
      if (rahuH === moonHouse) { score += 3; indicators.push('Rahu conjunct Moon — obsessive thinking, irrational fears, panic-like episodes'); }
      // Rahu in 1st, 4th, or 8th
      if (rahuH && [1, 4, 8].includes(rahuH)) { score += 1; indicators.push(`Rahu in ${rahuH}th — restless mind, fear of the unknown`); }
      // Mercury afflicted
      if (getHealthScore('mercury') < 40) { score += 1; indicators.push('Weak Mercury — racing thoughts, inability to calm the mind'); }
      // Moon in airy/watery signs with malefic aspect
      if (moonHouse && [6, 8, 12].includes(moonHouse)) { score += 1; indicators.push('Moon in challenging house — emotional instability feeds anxiety'); }
      // Ketu in 1st or 5th (existential anxiety)
      const ketuH = getPlanetHouse('Ketu');
      if (ketuH && [1, 5].includes(ketuH)) { score += 1; indicators.push(`Ketu in ${ketuH}th — existential anxiety, feeling of purposelessness`); }
      const level = score >= 4 ? 'HIGH' : score >= 2 ? 'MODERATE' : score >= 1 ? 'LOW' : 'MINIMAL';
      return { level, score, maxScore: 7, indicators };
    })(),
    childhoodTrauma: (() => {
      let score = 0;
      const indicators = [];
      // Saturn in 4th = cold/harsh home
      const satH = getPlanetHouse('Saturn');
      if (satH === 4) { score += 3; indicators.push('Saturn in 4th house — cold, restrictive, or emotionally barren childhood home; strict or absent parenting'); }
      // Moon in 6, 8, 12 = emotional neglect/suffering
      if (moonHouse && [6, 8, 12].includes(moonHouse)) { score += 2; indicators.push(`Moon in ${moonHouse}th — emotional neglect, mother absent/unavailable, hidden childhood suffering`); }
      // 4th lord in dusthana = home environment disrupted
      const lord4H = getPlanetHouse(lord4Name);
      if (lord4H && [6, 8, 12].includes(lord4H)) { score += 2; indicators.push(`4th lord (${lord4Name}) in ${lord4H}th — disrupted home, possible separation from family in childhood`); }
      // Rahu conjunct Moon = confusion/fear in childhood
      const rahuH = getPlanetHouse('Rahu');
      if (rahuH === moonHouse) { score += 2; indicators.push('Rahu with Moon — childhood fears, confusion, possible exposure to disturbing events'); }
      // Mars in 4th = violence/aggression at home
      const marsH = getPlanetHouse('Mars');
      if (marsH === 4) { score += 2; indicators.push('Mars in 4th — aggressive home environment, fighting between parents, possible physical discipline'); }
      // Sun in 4th with malefic aspects = domineering father at home
      const sunH = getPlanetHouse('Sun');
      if (sunH === 4) { score += 1; indicators.push('Sun in 4th — domineering parent figure at home'); }
      // Sun in dusthana = weak/absent father
      if (sunH && [6, 8, 12].includes(sunH)) { score += 1; indicators.push(`Sun in ${sunH}th — father absent, weak, or struggling during childhood`); }
      // Ketu in 4th = sudden disruption of home
      const ketuH = getPlanetHouse('Ketu');
      if (ketuH === 4) { score += 2; indicators.push('Ketu in 4th — sudden loss of home security, abrupt changes in childhood living situation'); }
      // Check for Ketu dasha during childhood (ages 0-15)
      const birthYear = date.getFullYear();
      const childhoodDashas = dasaPeriods.filter(dp => {
        const startYear = new Date(dp.start).getFullYear();
        const endYear = new Date(dp.endDate).getFullYear();
        return startYear <= birthYear + 15 && endYear >= birthYear;
      });
      const ketuInChildhood = childhoodDashas.some(dp => dp.lord === 'Ketu');
      const saturnInChildhood = childhoodDashas.some(dp => dp.lord === 'Saturn');
      if (ketuInChildhood) { score += 1; indicators.push('Ketu dasha during childhood — period of detachment, loss, or spiritual crisis in formative years'); }
      if (saturnInChildhood) { score += 1; indicators.push('Saturn dasha during childhood — heavy responsibilities, hardship, or restriction during formative years'); }
      const level = score >= 6 ? 'SEVERE' : score >= 4 ? 'HIGH' : score >= 2 ? 'MODERATE' : score >= 1 ? 'LOW' : 'MINIMAL';
      return { level, score, maxScore: 17, indicators };
    })(),
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 8: BUSINESS GROWTH
  // ══════════════════════════════════════════════════════════════
  const h7ForBiz = analyzeHouse(7, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit); // 7th = partnerships/biz
  const h3 = analyzeHouse(3, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit); // 3rd = initiative, courage

  // Best business periods based on 10th lord, 7th lord (partnerships), 11th lord (gains)
  const businessDasas = lifespanFilter(dasaPeriods.filter(d =>
    d.lord === lord10Name || d.lord === lord11Name || d.lord === lord7Name
  ));

  // Ashtakavarga strength of 10th house sign
  const h10RashiIdx = (houses[9]?.rashiId || 1) - 1;
  const h10Bindus = ashtakavarga?.sarvashtakavarga?.[h10RashiIdx] || 0;

  const business = {
    title: 'Business Growth',
    sinhala: 'ව්‍යාපාර වර්ධනය',
    // No hardcoded business types — AI derives from career planet data
    careerPlanetData: careerPlanetScores.slice(0, 3).map(p => ({ planet: p.planet, influence: Math.round(p.influence), dignity: p.dignity })),
    partnershipHouse: h7ForBiz,
    initiativeHouse: h3,
    tenthHouseStrength: { bindus: h10Bindus, assessment: h10Bindus >= 30 ? 'Excellent career/business sign' : h10Bindus >= 25 ? 'Good potential' : 'Requires extra effort' },
    bestPeriods: businessDasas.map(d => ({
      lord: d.lord,
      period: `${d.start} to ${d.endDate}`,
      reason: d.lord === lord10Name ? '10th lord dasha — career peak' : d.lord === lord11Name ? '11th lord dasha — maximum gains' : '7th lord dasha — partnership opportunities',
    })),
    businessVsPartnership: h7ForBiz?.strength === 'strong' || h7ForBiz?.strength === 'very strong'
      ? 'Partnership business is favored. Collaborate with others for maximum gains.'
      : 'Independent business or solo ventures may be more suitable.',
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 9: COMPREHENSIVE TRANSIT OVERLAY (Gochara)
  // ══════════════════════════════════════════════════════════════
  const today = new Date();
  const transitPlanets = getAllPlanetPositions(today);
  const transitSun = transitPlanets.sun;
  const transitJupiter = transitPlanets.jupiter;
  const transitSaturn = transitPlanets.saturn;
  const transitMars = transitPlanets.mars;
  const transitVenus = transitPlanets.venus;
  const transitMercury = transitPlanets.mercury;
  const transitRahu = transitPlanets.rahu;
  const transitKetu = transitPlanets.ketu;
  const transitMoon = transitPlanets.moon;

  const getTransitHouse = (transitRashiId) => {
    const lagnaRashiId = lagna.rashi.id;
    return ((transitRashiId - lagnaRashiId + 12) % 12) + 1;
  };
  const getTransitHouseFromMoon = (transitRashiId) => {
    return ((transitRashiId - moonRashi.id + 12) % 12) + 1;
  };

  const TRANSIT_HOUSE_EFFECTS = {
    1: 'Focus on self, health, new beginnings',
    2: 'Financial matters, family events',
    3: 'Communication, short journeys, siblings',
    4: 'Home, property, mother, emotional matters',
    5: 'Romance, creativity, children, speculative gains',
    6: 'Health challenges, competition, service',
    7: 'Relationships, partnerships, marriage events',
    8: 'Transformation, obstacles, inheritance',
    9: 'Fortune, travel, higher learning, dharma',
    10: 'Career peak, public recognition, authority',
    11: 'Gains, income increase, fulfilled aspirations',
    12: 'Expenses, foreign travel, spiritual growth',
  };

  // Build full transit map for ALL planets
  const buildTransitInfo = (planet, name, duration) => {
    const hFromLagna = getTransitHouse(planet.rashiId);
    const hFromMoon = getTransitHouseFromMoon(planet.rashiId);
    const transitRashiName = RASHIS[planet.rashiId - 1]?.name;
    const bindus = transitRashiName ? (ashtakavarga?.sarvashtakavarga?.[transitRashiName] || 0) : 0;
    // ── NEW: Per-planet BAV (Bhinnashtakavarga) bindus ──────────
    // This tells how many bindus THIS specific planet earned in the sign it transits
    const planetKeyMap = { Sun: 'Sun', Moon: 'Moon', Mars: 'Mars', Mercury: 'Mercury', Jupiter: 'Jupiter', Venus: 'Venus', Saturn: 'Saturn' };
    const bavKey = planetKeyMap[name];
    const bavBindus = bavKey && ashtakavarga?.prastarashtakavarga?.[bavKey]
      ? ashtakavarga.prastarashtakavarga[bavKey][planet.rashiId - 1] || 0
      : null;
    const bavQuality = bavBindus !== null
      ? (bavBindus >= 5 ? 'Excellent' : bavBindus >= 4 ? 'Good' : bavBindus >= 3 ? 'Average' : bavBindus >= 2 ? 'Below average' : 'Weak')
      : null;
    // Check if transit planet is conjunct (same sign as) any natal planet
    const natalConjunctions = Object.entries(planets)
      .filter(([k, p]) => p.rashiId === planet.rashiId)
      .map(([k, p]) => p.name);
    // Check if transit planet aspects any natal planet (7th aspect for all)
    const oppositeRashiId = ((planet.rashiId - 1 + 6) % 12) + 1;
    const natalOppositions = Object.entries(planets)
      .filter(([k, p]) => p.rashiId === oppositeRashiId)
      .map(([k, p]) => p.name);
    return {
      name,
      currentSign: planet.rashiEnglish,
      degree: planet.degreeInSign?.toFixed(1) || '0',
      isRetrograde: planet.isRetrograde || false,
      houseFromLagna: hFromLagna,
      houseFromMoon: hFromMoon,
      effectFromLagna: TRANSIT_HOUSE_EFFECTS[hFromLagna] || '',
      effectFromMoon: TRANSIT_HOUSE_EFFECTS[hFromMoon] || '',
      duration,
      ashtakavargaBindus: bindus,
      binduQuality: bindus >= 30 ? 'Excellent' : bindus >= 25 ? 'Good' : bindus >= 20 ? 'Average' : 'Challenging',
      // ── NEW: Per-planet Ashtakavarga for precise transit scoring ──
      bavBindus,
      bavQuality,
      bavNote: bavBindus !== null
        ? name + ' has ' + bavBindus + '/8 own bindus in ' + (planet.rashiEnglish || '') + ' — ' + (bavBindus >= 4 ? 'favourable transit results' : 'transit results may be mixed or challenging')
        : null,
      natalConjunctions: natalConjunctions.length > 0 ? natalConjunctions : null,
      natalOppositions: natalOppositions.length > 0 ? natalOppositions : null,
    };
  };

  // Identify major transit events happening RIGHT NOW
  const transitEvents = [];
  const satFromMoon = getTransitHouseFromMoon(transitSaturn.rashiId);
  if ([12, 1, 2].includes(satFromMoon)) {
    const phase = satFromMoon === 12 ? 'Rising — beginning phase' : satFromMoon === 1 ? 'Peak — maximum intensity' : 'Setting — final phase';
    transitEvents.push({ event: 'Sade Sati', severity: 'major', phase, description: 'Saturn\'s 7.5-year transit over natal Moon. A defining period of transformation, pressure, and growth.' });
  }
  // Jupiter return (Jupiter transiting same sign as natal Jupiter)
  if (transitJupiter.rashiId === planets.jupiter?.rashiId) {
    transitEvents.push({ event: 'Jupiter Return', severity: 'beneficial', description: 'Jupiter returns to its natal position — a major cycle of expansion, wisdom, and new opportunities.' });
  }
  // Saturn return
  if (transitSaturn.rashiId === planets.saturn?.rashiId) {
    transitEvents.push({ event: 'Saturn Return', severity: 'major', description: 'Saturn returns to its birth position — a critical maturation event that restructures life foundations.' });
  }
  // Rahu/Ketu over natal Moon
  if (transitRahu.rashiId === moonRashi.id || transitKetu.rashiId === moonRashi.id) {
    transitEvents.push({ event: 'Eclipse axis on Moon', severity: 'intense', description: 'Shadow planets crossing natal Moon — emotional intensity, karmic revelations, and inner transformation.' });
  }
  // Transit planet conjunct natal planet (for major planets)
  const majorTransitPlanets = { Jupiter: transitJupiter, Saturn: transitSaturn, Rahu: transitRahu, Ketu: transitKetu };
  for (const [tName, tPlanet] of Object.entries(majorTransitPlanets)) {
    for (const [nKey, nPlanet] of Object.entries(planets)) {
      if (nPlanet.rashiId === tPlanet.rashiId && !['rahu', 'ketu'].includes(nKey)) {
        // Check if degrees are close (within 5°)
        const degDiff = Math.abs((tPlanet.degreeInSign || 0) - (nPlanet.degreeInSign || 0));
        if (degDiff <= 5) {
          transitEvents.push({ event: `${tName} conjunct natal ${nPlanet.name}`, severity: tName === 'Jupiter' ? 'beneficial' : 'intense', description: `${tName} is within ${degDiff.toFixed(1)}° of natal ${nPlanet.name} — activating its significations powerfully.` });
        }
      }
    }
  }

  const transits = {
    title: 'Comprehensive Transit Analysis (Gochara)',
    sinhala: 'ගෝචර ග්‍රහ සංක්‍රමණ',
    date: today.toISOString().split('T')[0],
    allTransits: {
      sun: buildTransitInfo(transitSun, 'Sun', '~30 days per sign'),
      moon: buildTransitInfo(transitMoon, 'Moon', '~2.25 days per sign'),
      mars: buildTransitInfo(transitMars, 'Mars', '~45 days per sign'),
      mercury: buildTransitInfo(transitMercury, 'Mercury', '~25 days per sign'),
      jupiter: buildTransitInfo(transitJupiter, 'Jupiter', '~13 months per sign'),
      venus: buildTransitInfo(transitVenus, 'Venus', '~30 days per sign'),
      saturn: buildTransitInfo(transitSaturn, 'Saturn', '~2.5 years per sign'),
      rahu: buildTransitInfo(transitRahu, 'Rahu', '~18 months per sign'),
      ketu: buildTransitInfo(transitKetu, 'Ketu', '~18 months per sign'),
    },
    majorEvents: transitEvents,
    sadheSati: (() => {
      if (satFromMoon === 12) return { active: true, phase: 'Rising (ආරෝහණ)', note: 'Saturn entering 12th from Moon — Sade Sati beginning.' };
      if (satFromMoon === 1) return { active: true, phase: 'Peak (උච්ච)', note: 'Saturn over natal Moon — Peak Sade Sati.' };
      if (satFromMoon === 2) return { active: true, phase: 'Setting (අවරෝහණ)', note: 'Saturn in 2nd from Moon — Final phase.' };
      return { active: false, phase: 'Not active', note: 'Sade Sati is not currently active.' };
    })(),
    // Vedha analysis: which natal houses are currently stressed/activated
    activatedHouses: (() => {
      const activated = {};
      const allTransitData = [
        { name: 'Sun', planet: transitSun }, { name: 'Mars', planet: transitMars },
        { name: 'Jupiter', planet: transitJupiter }, { name: 'Saturn', planet: transitSaturn },
        { name: 'Rahu', planet: transitRahu }, { name: 'Venus', planet: transitVenus },
      ];
      for (const t of allTransitData) {
        const h = getTransitHouse(t.planet.rashiId);
        if (!activated[h]) activated[h] = [];
        activated[h].push(t.name);
      }
      return activated;
    })(),
    overallTransitScore: (() => {
      // Score based on benefic transits in good houses (1,2,5,9,10,11) vs bad (6,8,12)
      const goodHouses = [1, 2, 5, 9, 10, 11];
      const badHouses = [6, 8, 12];
      const benefics = ['Jupiter', 'Venus'];
      const malefics = ['Saturn', 'Mars', 'Rahu', 'Ketu'];
      let score = 50; // baseline
      for (const [key, planet] of Object.entries(transitPlanets)) {
        if (!planet.rashiId) continue;
        const h = getTransitHouse(planet.rashiId);
        const isBenefic = benefics.includes(planet.name);
        const isMalefic = malefics.includes(planet.name);
        if (goodHouses.includes(h) && isBenefic) score += 8;
        if (goodHouses.includes(h) && isMalefic) score -= 3;
        if (badHouses.includes(h) && isMalefic) score -= 8;
        if (badHouses.includes(h) && isBenefic) score += 3;
      }
      return Math.max(0, Math.min(100, score));
    })(),
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 9B: WHAT'S HAPPENING RIGHT NOW — Real-time planetary picture
  // ══════════════════════════════════════════════════════════════
  const whatsHappeningNow = (() => {
    const now = new Date();
    const currentAge = Math.floor((now - date) / (365.25 * 24 * 60 * 60 * 1000));
    
    // Current Dasha-Antardasha
    const activeDasha = currentDasha ? {
      mahadasha: currentDasha.lord,
      antardasha: currentAntardasha?.lord || 'N/A',
      theme: DASHA_EFFECTS[currentDasha.lord]?.general || '',
      career: DASHA_EFFECTS[currentDasha.lord]?.career || '',
      relationship: DASHA_EFFECTS[currentDasha.lord]?.relationship || '',
      health: DASHA_EFFECTS[currentDasha.lord]?.health || '',
      endsIn: (() => {
        if (!currentAntardasha?.endDate) return 'N/A';
        const adEnd = new Date(currentAntardasha.endDate);
        const months = Math.round((adEnd - now) / (30 * 24 * 60 * 60 * 1000));
        return months > 12 ? `${Math.floor(months / 12)} years ${months % 12} months` : `${months} months`;
      })(),
    } : null;
    
    // Current transit highlights (simplified for quick viewing)
    const highlights = [];
    
    // Jupiter position — MOST IMPORTANT benefic transit
    const jupFromLagna = getTransitHouse(transitJupiter.rashiId);
    const jupFromMoon = getTransitHouseFromMoon(transitJupiter.rashiId);
    const jupGood = [1, 2, 5, 7, 9, 11].includes(jupFromLagna);
    highlights.push({
      planet: 'Jupiter',
      icon: '🟡',
      position: `${jupFromLagna}th house from Lagna, ${jupFromMoon}th from Moon`,
      effect: jupGood ? '✅ Favorable — expansion, opportunities, protection' : '⚠️ Challenging — patience required, avoid overexpansion',
      duration: '~13 months per sign',
      isPositive: jupGood,
    });
    
    // Saturn position — MOST IMPORTANT malefic transit
    const satFromLagna = getTransitHouse(transitSaturn.rashiId);
    const satGood = [3, 6, 11].includes(satFromLagna);
    const satChall = [1, 4, 7, 8, 10, 12].includes(satFromLagna);
    highlights.push({
      planet: 'Saturn',
      icon: '⚫',
      position: `${satFromLagna}th house from Lagna, ${satFromMoon}th from Moon`,
      effect: satGood ? '✅ Favorable — discipline rewarded, obstacles removed' 
        : satFromMoon === 1 ? '⚠️ SADE SATI PEAK — intense transformation period'
        : satChall ? '⚠️ Challenging — hard work needed, slow progress' : '⚪ Neutral',
      duration: '~2.5 years per sign',
      isPositive: satGood,
      isSadeSati: [12, 1, 2].includes(satFromMoon),
    });
    
    // Rahu-Ketu axis
    const rahuFromLagna = getTransitHouse(transitRahu.rashiId);
    const ketuFromLagna = getTransitHouse(transitKetu.rashiId);
    highlights.push({
      planet: 'Rahu-Ketu Axis',
      icon: '🌑',
      position: `Rahu in ${rahuFromLagna}th, Ketu in ${ketuFromLagna}th`,
      effect: [1, 7].includes(rahuFromLagna) ? '⚠️ Eclipse axis on self/relationships — transformation period'
        : [4, 10].includes(rahuFromLagna) ? '⚠️ Eclipse axis on home/career — major life changes'
        : '⚪ Background influence',
      duration: '~18 months per sign',
      isPositive: false,
    });
    
    // Mars position (if in important houses)
    const marsFromLagna = getTransitHouse(transitMars.rashiId);
    if ([1, 4, 7, 8, 10, 12].includes(marsFromLagna)) {
      highlights.push({
        planet: 'Mars',
        icon: '🔴',
        position: `${marsFromLagna}th house`,
        effect: marsFromLagna === 10 ? '🔥 Career energy boost — take action!' : '⚠️ High energy, potential for conflicts/accidents',
        duration: '~45 days per sign',
        isPositive: marsFromLagna === 10,
      });
    }
    
    // Current life themes summary
    const lifeThemes = [];
    
    // From dasha
    if (activeDasha?.mahadasha) {
      const mdRuledHouses = [];
      for (let i = 1; i <= 12; i++) { if (getHouseLord(i) === activeDasha.mahadasha) mdRuledHouses.push(i); }
      const themes = mdRuledHouses.map(h => HOUSE_SIGNIFICATIONS[h]?.governs?.split(',')[0]?.trim()).filter(Boolean);
      if (themes.length > 0) lifeThemes.push(`${activeDasha.mahadasha} period focuses on: ${themes.join(', ')}`);
    }
    
    // From major transits
    if ([1, 2, 5, 9, 10, 11].includes(jupFromLagna)) {
      lifeThemes.push(`Jupiter blessing house ${jupFromLagna}: ${TRANSIT_HOUSE_EFFECTS[jupFromLagna]}`);
    }
    if ([12, 1, 2].includes(satFromMoon)) {
      lifeThemes.push('SADE SATI active — deep transformation, karmic reckoning, inner growth');
    }
    
    // Overall energy assessment
    let energyLevel = 50;
    if (jupGood) energyLevel += 15;
    if (satGood) energyLevel += 10;
    if ([12, 1, 2].includes(satFromMoon)) energyLevel -= 15;
    if (activeDasha && ['Jupiter', 'Venus', 'Mercury'].includes(activeDasha.mahadasha)) energyLevel += 10;
    if (activeDasha && ['Saturn', 'Rahu', 'Ketu'].includes(activeDasha.mahadasha)) energyLevel -= 10;
    energyLevel = Math.max(20, Math.min(95, energyLevel));
    
    const overallMood = energyLevel >= 70 ? '🌟 EXCELLENT — Fortune is with you!'
      : energyLevel >= 55 ? '✅ POSITIVE — Good opportunities available'
      : energyLevel >= 40 ? '⚖️ MIXED — Balance challenges with opportunities'
      : '⚠️ CHALLENGING — Focus on patience and self-care';
    
    return {
      title: "What's Happening RIGHT NOW",
      sinhala: 'දැන් සිදුවන්නේ කුමක්ද',
      currentAge,
      activeDasha,
      transitHighlights: highlights,
      lifeThemes,
      overallEnergy: { score: energyLevel, mood: overallMood },
      quickAdvice: (() => {
        const advice = [];
        if (jupGood) advice.push('✨ Jupiter favors expansion — take calculated risks');
        if ([12, 1, 2].includes(satFromMoon)) advice.push('🧘 Sade Sati: focus on inner work, avoid major new ventures');
        if (activeDasha?.mahadasha === 'Venus') advice.push('💕 Venus period: relationships and creativity peak');
        if (activeDasha?.mahadasha === 'Saturn') advice.push('⏰ Saturn period: hard work pays off, patience is key');
        if (activeDasha?.mahadasha === 'Rahu') advice.push('🌐 Rahu period: foreign connections, technology, unconventional paths');
        if (marsFromLagna === 10) advice.push('💪 Mars energizing career — bold moves succeed');
        if (advice.length === 0) advice.push('📖 Regular spiritual practice and self-reflection strengthen all areas');
        return advice;
      })(),
    };
  })();

  // ══════════════════════════════════════════════════════════════
  // SECTION 9C: YOUR BEST YEARS — Peak Life Periods Ranking
  // ══════════════════════════════════════════════════════════════
  const bestYearsRanking = (() => {
    const birthYear = date.getFullYear();
    const currentYear = new Date().getFullYear();
    const yearScores = [];
    
    // Score each year from birth to age 80
    for (let year = birthYear; year <= birthYear + 80; year++) {
      const age = year - birthYear;
      let score = 50; // baseline
      const reasons = [];
      
      // Find which dasha period this year falls in
      const dashaForYear = dasaPeriods.find(d => {
        const dStart = new Date(d.start).getFullYear();
        const dEnd = new Date(d.endDate).getFullYear();
        return year >= dStart && year <= dEnd;
      });
      
      // Find which antardasha (sub-period) this year falls in
      let antardashaForYear = null;
      if (dashaForYear?.antardashas) {
        antardashaForYear = dashaForYear.antardashas.find(ad => {
          const adStart = new Date(ad.start).getFullYear();
          const adEnd = new Date(ad.endDate).getFullYear();
          return year >= adStart && year <= adEnd;
        });
      }
      
      const mdLord = dashaForYear?.lord || '';
      const adLord = antardashaForYear?.lord || '';
      
      // Mahadasha lord quality
      const beneficMD = ['Jupiter', 'Venus', 'Mercury', 'Moon'].includes(mdLord);
      const maleficMD = ['Saturn', 'Rahu', 'Ketu', 'Mars'].includes(mdLord);
      const mdFuncNature = getFunctionalNature(lagnaName, mdLord);
      
      if (mdFuncNature === 'yogaKaraka') { score += 25; reasons.push(`${mdLord} YogaKaraka Mahadasha`); }
      else if (mdFuncNature === 'benefic') { score += 15; reasons.push(`${mdLord} benefic Mahadasha`); }
      else if (mdFuncNature === 'malefic') { score -= 10; reasons.push(`${mdLord} challenging Mahadasha`); }
      
      // Antardasha lord quality
      const adFuncNature = getFunctionalNature(lagnaName, adLord);
      if (adFuncNature === 'yogaKaraka') { score += 15; reasons.push(`${adLord} YogaKaraka sub-period`); }
      else if (adFuncNature === 'benefic') { score += 10; reasons.push(`${adLord} benefic sub-period`); }
      else if (adFuncNature === 'malefic') { score -= 5; reasons.push(`${adLord} challenging sub-period`); }
      
      // Special period combinations
      if (mdLord === 'Jupiter' && ['Venus', 'Mercury', 'Moon'].includes(adLord)) {
        score += 15; reasons.push('Jupiter-benefic double expansion');
      }
      if (mdLord === 'Venus' && ['Jupiter', 'Mercury', 'Moon'].includes(adLord)) {
        score += 15; reasons.push('Venus-benefic pleasure & prosperity');
      }
      if (mdLord === lord10Name && adLord === lord9Name) {
        score += 20; reasons.push('10th-9th lord combo — career fortune peak');
      }
      if (mdLord === lord9Name && adLord === lord10Name) {
        score += 20; reasons.push('9th-10th lord combo — lucky career year');
      }
      if (mdLord === 'Saturn' && adLord === 'Saturn') {
        score -= 15; reasons.push('Double Saturn — heavy karmic lessons');
      }
      if (mdLord === 'Rahu' && adLord === 'Ketu') {
        score -= 10; reasons.push('Rahu-Ketu axis — confusion period');
      }
      
      // Age-based modifiers
      if (age >= 28 && age <= 31) { // Saturn return
        score -= 5; reasons.push('Saturn return age — restructuring');
      }
      if (age >= 41 && age <= 44) { // Uranus opposition (Western influence)
        score -= 3; reasons.push('Mid-life transit');
      }
      
      // Jupiter cycle peak (every 12 years)
      const jupCycleYears = [12, 24, 36, 48, 60, 72];
      if (jupCycleYears.includes(age)) {
        score += 10; reasons.push('Jupiter cycle peak');
      }
      
      // Cap score
      score = Math.max(15, Math.min(100, score));
      
      yearScores.push({
        year,
        age,
        score,
        mahadasha: mdLord,
        antardasha: adLord,
        reasons: reasons.slice(0, 3),
        isPast: year < currentYear,
        isCurrent: year === currentYear,
        isFuture: year > currentYear,
      });
    }
    
    // Find best years — more future years for younger users
    const allYears = yearScores.sort((a, b) => b.score - a.score);
    const bestEver = allYears.slice(0, 10);
    const personAge = currentYear - birthYear;
    const futureCount = personAge <= 25 ? 20 : personAge <= 35 ? 15 : 10;
    const bestFuture = allYears.filter(y => y.year > currentYear).slice(0, futureCount);
    const bestPast = allYears.filter(y => y.year < currentYear).slice(0, 5);
    const worstYears = [...yearScores].sort((a, b) => a.score - b.score).slice(0, 5);
    
    // Current year ranking
    const currentYearData = yearScores.find(y => y.year === currentYear);
    const currentYearRank = allYears.findIndex(y => y.year === currentYear) + 1;
    
    // Find peak period (consecutive good years)
    let peakPeriod = null;
    let maxStreak = 0;
    let currentStreak = 0;
    let streakStart = null;
    for (const y of yearScores.sort((a, b) => a.year - b.year)) {
      if (y.score >= 70) {
        if (currentStreak === 0) streakStart = y.year;
        currentStreak++;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
          peakPeriod = { start: streakStart, end: y.year, years: currentStreak };
        }
      } else {
        currentStreak = 0;
      }
    }
    
    return {
      title: 'Your Best Years Ranking',
      sinhala: 'ඔබේ හොඳම වසර ශ්‍රේණිගත කිරීම',
      top10BestYears: bestEver.map(y => ({
        year: y.year,
        age: y.age,
        score: y.score,
        period: `${y.mahadasha}-${y.antardasha}`,
        reasons: y.reasons,
        status: y.isPast ? 'PAST' : y.isCurrent ? 'NOW' : 'UPCOMING',
      })),
      top10FutureYears: bestFuture.map(y => ({
        year: y.year,
        age: y.age,
        score: y.score,
        period: `${y.mahadasha}-${y.antardasha}`,
        reasons: y.reasons,
        yearsFromNow: y.year - currentYear,
      })),
      challengingYears: worstYears.map(y => ({
        year: y.year,
        age: y.age,
        score: y.score,
        period: `${y.mahadasha}-${y.antardasha}`,
        reasons: y.reasons,
      })),
      currentYear: currentYearData ? {
        year: currentYear,
        score: currentYearData.score,
        rank: currentYearRank,
        outOf: allYears.length,
        period: `${currentYearData.mahadasha}-${currentYearData.antardasha}`,
        assessment: currentYearData.score >= 80 ? '🌟 EXCEPTIONAL YEAR!'
          : currentYearData.score >= 65 ? '✅ Very good year'
          : currentYearData.score >= 50 ? '⚖️ Average year'
          : '⚠️ Challenging year — focus on growth',
      } : null,
      peakLifePeriod: peakPeriod ? {
        years: `${peakPeriod.start} to ${peakPeriod.end}`,
        ages: `${peakPeriod.start - birthYear} to ${peakPeriod.end - birthYear} years old`,
        duration: `${peakPeriod.years} consecutive excellent years`,
        note: 'This is your peak life period when all planets align favorably.',
      } : null,
      note: 'Best years are calculated based on Mahadasha-Antardasha combinations, functional planet nature, and planetary cycles. Personal karma and free will also play significant roles.',
    };
  })();

  // ══════════════════════════════════════════════════════════════
  // SECTION 10: REAL ESTATE & ASSETS
  // ══════════════════════════════════════════════════════════════
  const lord4House = getPlanetHouse(lord4Name);

  const realEstate = {
    title: 'Real Estate & Assets',
    sinhala: 'නිශ්චල දේපළ හා වත්කම්',
    fourthHouse: h4,
    fourthLord: { name: lord4Name, house: lord4House },
    mars: { house: marsHouse, note: 'Mars is the natural karaka for land and property' },
    saturn: { house: getPlanetHouse('Saturn'), note: 'Saturn governs construction, buildings, and enduring structures' },
    propertyYoga: (() => {
      const checks = [];
      if (isInKendra(lord4House) || isInTrikona(lord4House)) checks.push(`4th lord ${lord4Name} well-placed in house ${lord4House} — property acquisition supported`);
      if (isInKendra(marsHouse) || isInTrikona(marsHouse)) checks.push(`Mars in house ${marsHouse} — land ownership indicated`);
      if (h4?.beneficsIn?.length > 0) checks.push(`Benefic planets in 4th house (${h4.beneficsIn.join(', ')}) — comfort and property blessed`);
      if (checks.length === 0) checks.push('Property matters require careful timing. Consult Dasha periods of 4th lord and Mars.');
      return checks;
    })(),
    // ══════════════════════════════════════════════════════════════
    // AGE-PRIORITIZED PROPERTY TIMING — Focus on realistic ages (25-55)
    // ══════════════════════════════════════════════════════════════
    bestPeriodsForProperty: (() => {
      const birthYear = date.getFullYear();
      const currentYear = new Date().getFullYear();
      const currentAge = currentYear - birthYear;
      
      // Filter periods for property-relevant lords
      const propertyPeriods = lifespanFilter(dasaPeriods.filter(d => 
        d.lord === lord4Name || d.lord === 'Mars' || d.lord === 'Saturn' || d.lord === 'Venus' || d.lord === 'Jupiter'
      ));
      
      // Score each period by age-appropriateness for property purchase
      const scoredPeriods = propertyPeriods.map(d => {
        const startYear = parseInt(d.start?.substring(0, 4), 10) || birthYear;
        const endYear = parseInt(d.endDate?.substring(0, 4), 10) || startYear + 6;
        const midpointYear = Math.round((startYear + endYear) / 2);
        const ageAtMidpoint = midpointYear - birthYear;
        const ageAtStart = startYear - birthYear;
        const ageAtEnd = endYear - birthYear;
        
        let score = 50; // baseline
        let priority = 'normal';
        
        // Age-based scoring — property is best bought in 25-50 age range
        if (ageAtMidpoint >= 25 && ageAtMidpoint <= 35) {
          score += 30; // First home age — highest priority
          priority = 'prime';
        } else if (ageAtMidpoint >= 36 && ageAtMidpoint <= 45) {
          score += 25; // Upgrade/investment property age
          priority = 'excellent';
        } else if (ageAtMidpoint >= 46 && ageAtMidpoint <= 55) {
          score += 15; // Late investment property
          priority = 'good';
        } else if (ageAtMidpoint > 55) {
          score -= 10; // Less practical for new purchases
          priority = 'late';
        } else if (ageAtMidpoint < 25) {
          score += 5; // Too young but still possible
          priority = 'early';
        }
        
        // Lord-based scoring
        if (d.lord === lord4Name) {
          score += 25; // 4th lord is strongest for property
        } else if (d.lord === 'Mars') {
          score += 20; // Mars is natural karaka for land
        } else if (d.lord === 'Venus') {
          score += 15; // Venus for comfortable homes, luxury
        } else if (d.lord === 'Jupiter') {
          score += 10; // Jupiter for large/auspicious properties
        } else if (d.lord === 'Saturn') {
          score += 10; // Saturn for construction, commercial property
        }
        
        // Boost if period is upcoming/current vs far future
        if (startYear <= currentYear && endYear >= currentYear) {
          score += 20; // Currently active period
          priority = priority === 'prime' ? 'ACTIVE_PRIME' : 'ACTIVE';
        } else if (startYear > currentYear && startYear <= currentYear + 10) {
          score += 10; // Coming in next 10 years
        }
        
        // Check if 4th lord is well-placed
        if (d.lord === lord4Name && (isInKendra(lord4House) || isInTrikona(lord4House))) {
          score += 10;
        }
        
        return {
          lord: d.lord,
          period: `${d.start} to ${d.endDate}`,
          ageRange: `${ageAtStart}-${ageAtEnd} years old`,
          ageAtMidpoint,
          score,
          priority,
          reason: d.lord === lord4Name ? '4th lord dasha — prime time for home/property'
            : d.lord === 'Mars' ? 'Mars dasha — land acquisition period'
            : d.lord === 'Venus' ? 'Venus dasha — comfortable home, luxury property'
            : d.lord === 'Jupiter' ? 'Jupiter dasha — auspicious property, expansion'
            : 'Saturn dasha — construction, long-term property investment',
          isRecommended: score >= 70,
        };
      });
      
      // Sort by score (highest first) and return top 5
      return scoredPeriods.sort((a, b) => b.score - a.score).slice(0, 5);
    })(),
    // Best single property window for chat/display
    bestPropertyWindow: (() => {
      const birthYear = date.getFullYear();
      const currentYear = new Date().getFullYear();
      const currentAge = currentYear - birthYear;
      
      // Include Jupiter as property karaka (expansion, large properties)
      const propertyPeriods = lifespanFilter(dasaPeriods.filter(d => 
        d.lord === lord4Name || d.lord === 'Mars' || d.lord === 'Venus' || d.lord === 'Jupiter'
      ));
      
      // Find best period in practical property-buying age range (25-55)
      let bestPeriod = null;
      let bestScore = 0;
      
      for (const d of propertyPeriods) {
        const startYear = parseInt(d.start?.substring(0, 4), 10) || birthYear;
        const endYear = parseInt(d.endDate?.substring(0, 4), 10) || startYear + 6;
        const ageAtStart = startYear - birthYear;
        const ageAtEnd = endYear - birthYear;
        const ageAtMid = (ageAtStart + ageAtEnd) / 2;
        
        // Skip if outside practical age range (expanded to 55)
        if (ageAtMid < 22 || ageAtMid > 55) continue;
        
        let score = 50;
        // Age scoring — prioritize 25-45 as prime property buying age
        if (ageAtMid >= 25 && ageAtMid <= 35) score += 35;
        else if (ageAtMid >= 36 && ageAtMid <= 45) score += 30;
        else if (ageAtMid >= 46 && ageAtMid <= 55) score += 20;
        else score += 10;
        
        // Lord scoring — include Jupiter for expansion/large property
        if (d.lord === lord4Name) score += 30;
        else if (d.lord === 'Mars') score += 20;
        else if (d.lord === 'Jupiter') score += 25; // Jupiter is excellent for property
        else if (d.lord === 'Venus') score += 15;
        
        // Current/upcoming boost
        if (startYear <= currentYear && endYear >= currentYear) score += 25;
        else if (startYear > currentYear && startYear <= currentYear + 5) score += 15;
        
        if (score > bestScore) {
          bestScore = score;
          bestPeriod = {
            lord: d.lord,
            period: `${d.start} to ${d.endDate}`,
            ageRange: `${ageAtStart}-${ageAtEnd} years old`,
            score,
            reason: d.lord === lord4Name ? '4th lord dasha — strongest property acquisition period'
              : d.lord === 'Jupiter' ? 'Jupiter dasha — auspicious for property expansion'
              : d.lord === 'Mars' ? 'Mars dasha — excellent for land/property'
              : 'Venus dasha — comfortable home acquisition',
          };
        }
      }
      
      return bestPeriod;
    })(),
    // ══════════════════════════════════════════════════════════════
    // VEHICLE & ACCIDENT TIMING — 4th house analysis
    // ══════════════════════════════════════════════════════════════
    vehicleAnalysis: (() => {
      const h4Planets = h4?.planetsInHouse || [];
      const h8Planets = houses[7]?.planets?.map(p => p.name) || [];
      const venusHouseVeh = getPlanetHouse('Venus');
      const marsHouseVeh = getPlanetHouse('Mars');
      const rahuHouseVeh = getPlanetHouse('Rahu');
      const birthYear = date.getFullYear();
      const currentYear = new Date().getFullYear();
      
      // Vehicle acquisition timing — AGE-PRIORITIZED
      // Include Jupiter (expansion, large vehicles) and Mercury (short-distance, commute)
      const vehiclePeriods = lifespanFilter(dasaPeriods.filter(d => 
        d.lord === lord4Name || d.lord === 'Venus' || d.lord === 'Mars' || d.lord === 'Moon' || d.lord === 'Jupiter' || d.lord === 'Mercury'
      ));
      
      const vehicleTimings = vehiclePeriods.map(d => {
        const startYear = parseInt(d.start?.substring(0, 4), 10) || birthYear;
        const endYear = parseInt(d.endDate?.substring(0, 4), 10) || startYear + 6;
        const ageAtStart = startYear - birthYear;
        const ageAtEnd = endYear - birthYear;
        const ageAtMid = (ageAtStart + ageAtEnd) / 2;
        
        let score = 50;
        // Age scoring — vehicle purchases peak in 22-45 age
        if (ageAtMid >= 22 && ageAtMid <= 30) score += 35; // First vehicle age
        else if (ageAtMid >= 31 && ageAtMid <= 40) score += 30; // Upgrade age
        else if (ageAtMid >= 41 && ageAtMid <= 50) score += 20;
        else if (ageAtMid > 50) score -= 10;
        else if (ageAtMid < 22) score += 5; // Young but possible
        
        // Lord scoring
        if (d.lord === lord4Name) score += 25;
        else if (d.lord === 'Venus') score += 22;
        else if (d.lord === 'Jupiter') score += 18; // Jupiter = expansion, SUV, large vehicles
        else if (d.lord === 'Mars') score += 15;
        else if (d.lord === 'Mercury') score += 12; // Mercury = commute, practical vehicles
        else if (d.lord === 'Moon') score += 10;
        
        // Current/upcoming boost
        if (startYear <= currentYear && endYear >= currentYear) score += 25;
        else if (startYear > currentYear && startYear <= currentYear + 5) score += 15;
        
        return {
          lord: d.lord,
          period: `${d.start} to ${d.endDate}`,
          ageRange: `${ageAtStart}-${ageAtEnd} years old`,
          score,
          reason: d.lord === lord4Name ? '4th lord dasha — vehicle acquisition likely'
            : d.lord === 'Venus' ? 'Venus dasha — luxury vehicle, comfort items'
            : d.lord === 'Jupiter' ? 'Jupiter dasha — large vehicle, SUV, expansion'
            : d.lord === 'Mars' ? 'Mars dasha — powerful vehicles, machinery'
            : d.lord === 'Mercury' ? 'Mercury dasha — commute vehicle, practical purchase'
            : 'Moon dasha — emotional purchase, family vehicle',
        };
      }).sort((a, b) => b.score - a.score);
      
      // Accident-prone indicators
      const accidentIndicators = [];
      let accidentRisk = 0;
      
      // Mars in 4th house — accidents related to vehicles, property
      if (h4Planets.includes('Mars')) {
        accidentIndicators.push('Mars in 4th house — heightened risk of vehicle accidents');
        accidentRisk += 3;
      }
      // Mars in 8th house — transformation, sudden events
      if (h8Planets.includes('Mars')) {
        accidentIndicators.push('Mars in 8th house — risk of accidents, surgical events');
        accidentRisk += 3;
      }
      // Rahu in 4th or 8th — sudden, unexpected events
      if (h4Planets.includes('Rahu')) {
        accidentIndicators.push('Rahu in 4th house — unusual vehicle issues, sudden accidents');
        accidentRisk += 2;
      }
      if (h8Planets.includes('Rahu')) {
        accidentIndicators.push('Rahu in 8th house — unexpected crises, accidents');
        accidentRisk += 2;
      }
      // Saturn in 4th — slow deterioration, old vehicles
      if (h4Planets.includes('Saturn')) {
        accidentIndicators.push('Saturn in 4th house — delays in getting vehicles, prefer older/safer cars');
        accidentRisk += 1;
      }
      // Ketu in 4th or 8th — sudden/karmic events
      if (h4Planets.includes('Ketu')) {
        accidentIndicators.push('Ketu in 4th house — detachment from material comforts, sudden vehicle loss');
        accidentRisk += 2;
      }
      if (h8Planets.includes('Ketu')) {
        accidentIndicators.push('Ketu in 8th house — karmic accidents, surgery');
        accidentRisk += 2;
      }
      // 4th lord in dusthana
      if (lord4House && [6, 8, 12].includes(lord4House)) {
        accidentIndicators.push(`4th lord in ${lord4House}th house — vehicle matters face obstacles`);
        accidentRisk += 2;
      }
      
      // Accident-prone periods (Mars dasha with Rahu/Ketu AD) — AGE LIMITED
      const dangerPeriods = [];
      for (const md of dasaPeriods) {
        if (!['Mars', 'Rahu', 'Ketu', 'Saturn'].includes(md.lord)) continue;
        if (!md.antardashas) continue;
        for (const ad of md.antardashas) {
          if (!['Mars', 'Rahu', 'Ketu'].includes(ad.lord)) continue;
          if (md.lord === ad.lord) continue;
          
          const adStartYear = parseInt(ad.start?.substring(0, 4), 10) || birthYear;
          const adEndYear = parseInt(ad.endDate?.substring(0, 4), 10) || adStartYear + 2;
          const ageAtAd = adStartYear - birthYear;
          
          // Only include if in practical driving age (18-70)
          if (ageAtAd >= 18 && ageAtAd <= 70) {
            dangerPeriods.push({
              period: `${md.lord}-${ad.lord}`,
              dateRange: `${ad.start} to ${ad.endDate}`,
              ageRange: `Age ${ageAtAd}-${adEndYear - birthYear}`,
              warning: `${md.lord}-${ad.lord} period — heightened accident risk, drive carefully`,
            });
          }
        }
      }
      
      const riskLevel = accidentRisk >= 6 ? 'HIGH' : accidentRisk >= 3 ? 'MODERATE' : 'LOW';
      
      return {
        vehicleTiming: vehicleTimings.slice(0, 5),
        bestYearForVehicle: vehicleTimings[0] || null,
        accidentRisk: riskLevel,
        accidentIndicators,
        accidentPronePeriods: dangerPeriods.slice(0, 5),
        safetyAdvice: riskLevel === 'HIGH' 
          ? '⚠️ HIGH accident risk in chart. Always wear seatbelts, avoid night driving, maintain vehicle regularly, consider Hanuman puja for protection.'
          : riskLevel === 'MODERATE'
          ? '⚡ MODERATE risk. Be cautious during Mars/Rahu periods. Avoid rash driving.'
          : '✅ LOW accident risk. Normal precautions sufficient.',
        luckyVehicleColor: (() => {
          // Based on 4th lord
          const colorMap = {
            Sun: 'Gold, Orange', Moon: 'Silver, White', Mars: 'Red, Maroon',
            Mercury: 'Green, Grey', Jupiter: 'Yellow, Gold', Venus: 'White, Cream',
            Saturn: 'Black, Dark Blue', Rahu: 'Grey, Smoke', Ketu: 'Multi-color, Brown'
          };
          return colorMap[lord4Name] || 'White, Silver';
        })(),
      };
    })(),
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 11: EMPLOYMENT & PROMOTIONS
  // ══════════════════════════════════════════════════════════════
  const lord6Name = getHouseLord(6);
  const h6 = analyzeHouse(6, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);

  const employment = {
    title: 'Employment & Promotions',
    sinhala: 'රැකියා හා උසස්වීම්',
    tenthHouse: h10,
    sixthHouse: h6, // 6th = service, daily work
    tenthLord: { name: lord10Name, house: lord10House },
    // No hardcoded career paths — AI derives from career planet data
    careerPlanetData: careerPlanetScores.slice(0, 3).map(p => ({ planet: p.planet, influence: Math.round(p.influence), dignity: p.dignity, house: p.house })),
    promotionPeriods: lifespanFilter(dasaPeriods.filter(d => d.lord === lord10Name || d.lord === lord9Name || d.lord === 'Sun')).map(d => ({
      lord: d.lord,
      period: `${d.start} to ${d.endDate}`,
      reason: d.lord === lord10Name ? '10th lord dasha — career advancement' : d.lord === lord9Name ? '9th lord dasha — fortune and recognition' : 'Sun dasha — authority and government favor',
    })),
    jobChangePeriods: lifespanFilter(dasaPeriods.filter(d => d.lord === 'Rahu' || d.lord === 'Ketu' || d.lord === lord6Name)).map(d => ({
      lord: d.lord,
      period: `${d.start} to ${d.endDate}`,
      reason: d.lord === 'Rahu' ? 'Rahu dasha — sudden changes, foreign opportunities' : d.lord === 'Ketu' ? 'Ketu dasha — endings and spiritual shifts' : '6th lord dasha — service sector changes',
    })),
    serviceVsAuthority: getPlanetHouse('Sun') && isInKendra(getPlanetHouse('Sun'))
      ? 'Leadership and authority roles are naturally suited. Government or managerial positions.'
      : 'Service-oriented or specialized professional roles may bring greater stability.',
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 12: FINANCIAL MANAGEMENT
  // ══════════════════════════════════════════════════════════════
  const h8 = analyzeHouse(8, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const h12 = analyzeHouse(12, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const lord8Name = getHouseLord(8);
  const lord12Name = getHouseLord(12);

  const financial = {
    title: 'Financial Management',
    sinhala: 'මූල්‍ය කළමනාකරණය',
    income: {
      secondHouse: h2,
      eleventhHouse: h11,
      secondLord: { name: lord2Name, house: lord2House },
      eleventhLord: { name: lord11Name, house: lord11House },
      dhanaYogas,
    },
    expenses: {
      twelfthHouse: h12,
      twelfthLord: { name: lord12Name, house: getPlanetHouse(lord12Name) },
      note: h12?.maleficsIn?.length > 0
        ? `Malefic planets in 12th house (${h12.maleficsIn.join(', ')}) — unexpected expenses possible. Budget carefully.`
        : 'Expenses are manageable with proper planning.',
    },
    losses: {
      eighthHouse: h8,
      eighthLord: { name: lord8Name, house: getPlanetHouse(lord8Name) },
      riskPeriods: lifespanFilter(dasaPeriods.filter(d => d.lord === lord8Name || d.lord === lord12Name)).map(d => ({
        lord: d.lord,
        period: `${d.start} to ${d.endDate}`,
        reason: d.lord === lord8Name ? '8th lord dasha — watch for unexpected losses, insurance claims' : '12th lord dasha — expenses may increase, foreign travel spending',
      })),
    },
    investmentAdvice: (() => {
      const tips = [];
      if (h2?.strength === 'strong' || h2?.strength === 'very strong') tips.push('Savings and fixed deposits will grow well');
      if (h11?.strength === 'strong' || h11?.strength === 'very strong') tips.push('Stock market and speculative investments can be profitable');
      if (jupiterHouse && (isInKendra(jupiterHouse) || isInTrikona(jupiterHouse))) tips.push('Gold, precious metals, and traditional investments are favored');
      if (marsHouse && (isInKendra(marsHouse) || [2, 4, 11].includes(marsHouse))) tips.push('Real estate investment will bring good returns');
      if (tips.length === 0) tips.push('Conservative investments and savings are recommended. Avoid speculative ventures during malefic dashas.');
      return tips;
    })(),
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 13: FUTURE TIMELINE (Age-Adaptive Dasha Timeline)
  // ══════════════════════════════════════════════════════════════
  const timelineStart = new Date();
  const currentAge = Math.max(0, timelineStart.getFullYear() - date.getFullYear());
  // Younger users get LONGER future predictions (up to age 70)
  // Age 20 → 50 years forward, Age 30 → 40 years, Age 50 → 25 years, Age 65+ → 15 years
  const timelineYears = currentAge <= 20 ? 50
    : currentAge <= 25 ? 45
    : currentAge <= 30 ? 40
    : currentAge <= 40 ? 35
    : currentAge <= 50 ? 25
    : currentAge <= 60 ? 20
    : 15;
  const timelineEnd = new Date(timelineStart);
  timelineEnd.setFullYear(timelineEnd.getFullYear() + timelineYears);

  const timeline25 = {
    title: `${timelineYears}-Year Predictive Timeline`,
    sinhala: `වසර ${timelineYears} අනාවැකි කාල සටහන`,
    from: timelineStart.toISOString().split('T')[0],
    to: timelineEnd.toISOString().split('T')[0],
    currentAge,
    timelineYears,
    periods: [],
  };

  // Build the age-adaptive timeline with Mahadasha + Antardasha breakdowns
  for (const dasha of dasaPeriods) {
    const dashaStart = new Date(dasha.start);
    const dashaEnd = new Date(dasha.endDate);

    // Skip periods entirely before now or after 25 years
    if (dashaEnd < timelineStart || dashaStart > timelineEnd) continue;

    const effectiveStart = dashaStart < timelineStart ? timelineStart : dashaStart;
    const effectiveEnd = dashaEnd > timelineEnd ? timelineEnd : dashaEnd;

    const dashaLordStrength = planetStrengths[dasha.lord.toLowerCase()]?.strength || 'Medium';
    const dashaLordNature = getFunctionalNature(lagnaName, dasha.lord);

    // Filter antardashas within the 25-year window
    const relevantADs = (dasha.antardashas || []).filter(ad => {
      const adEnd = new Date(ad.endDate);
      const adStart = new Date(ad.start);
      return adEnd >= timelineStart && adStart <= timelineEnd;
    }).map(ad => {
      const adLordNature = getFunctionalNature(lagnaName, ad.lord);
      const adEffects = DASHA_EFFECTS[ad.lord] || {};
      return {
        lord: ad.lord,
        period: `${ad.start} to ${ad.endDate}`,
        nature: adLordNature,
        theme: adEffects.general?.split('.')[0] || '',
        career: adEffects.career || '',
        health: adEffects.health || '',
        relationship: adEffects.relationship || '',
      };
    });

    timeline25.periods.push({
      mahadasha: dasha.lord,
      period: `${effectiveStart.toISOString().split('T')[0]} to ${effectiveEnd.toISOString().split('T')[0]}`,
      nature: dashaLordNature,
      strength: dashaLordStrength,
      effects: dasha.effects,
      antardashas: relevantADs,
      overallTone: dashaLordNature === 'benefic' || dashaLordNature === 'yogaKaraka'
        ? 'Favorable period overall. Growth and positive developments expected.'
        : dashaLordNature === 'malefic'
          ? 'Challenging period. Careful planning and remedial measures recommended.'
          : 'Mixed results. Outcomes depend on sub-periods and transits.',
    });
  }

  // ══════════════════════════════════════════════════════════════
  // REMEDIES & GEM RECOMMENDATIONS
  // ══════════════════════════════════════════════════════════════
  const weakPlanets = Object.entries(planetStrengths)
    .filter(([k, v]) => v.score < 45 && !['rahu', 'ketu'].includes(k))
    .map(([k, v]) => ({ planet: v.name, score: v.score, gem: PLANET_KARAKAS[v.name]?.gem, color: PLANET_KARAKAS[v.name]?.color, day: PLANET_KARAKAS[v.name]?.day }));

  const remedies = {
    title: 'Remedies & Recommendations',
    sinhala: 'පිළියම් හා නිර්දේශ',
    lagnaGem: PLANET_KARAKAS[lagna.rashi.lord]?.gem || '',
    lagnaColor: PLANET_KARAKAS[lagna.rashi.lord]?.color || '',
    lagnaDay: PLANET_KARAKAS[lagna.rashi.lord]?.day || '',
    weakPlanetRemedies: weakPlanets,
    yogaKaraka: functionalStatus.yogaKaraka ? {
      planet: functionalStatus.yogaKaraka,
      gem: PLANET_KARAKAS[functionalStatus.yogaKaraka]?.gem,
      note: `Wearing ${PLANET_KARAKAS[functionalStatus.yogaKaraka]?.gem} is highly recommended as ${functionalStatus.yogaKaraka} is your Yoga Karaka planet.`,
    } : null,
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 14: HEALTH BLUEPRINT
  // ══════════════════════════════════════════════════════════════
  const HEALTH_BY_HOUSE = {
    1: 'Head, brain, overall vitality',
    2: 'Face, eyes, throat, teeth',
    3: 'Arms, shoulders, respiratory system, ears',
    4: 'Chest, lungs, heart, breasts',
    5: 'Stomach, upper digestive system, liver',
    6: 'Lower digestive system, intestines, kidney, immune system',
    7: 'Lower back, kidneys, reproductive organs',
    8: 'Chronic diseases, reproductive system, colon',
    9: 'Hips, thighs, arterial system',
    10: 'Knees, joints, bones, spine',
    11: 'Calves, ankles, circulatory system',
    12: 'Feet, left eye, sleep disorders, hospitalization',
  };

  const HEALTH_BY_PLANET = {
    'Sun': { strong: 'Strong heart, good vitality, excellent eyesight', weak: 'Heart problems, weak eyesight, bone issues, low energy, vitamin D deficiency' },
    'Moon': { strong: 'Good mental health, strong immunity, healthy blood', weak: 'Depression, anxiety, anaemia, water retention, hormonal imbalance, sleep disorders' },
    'Mars': { strong: 'High energy, strong muscles, good blood circulation', weak: 'Blood pressure issues, accidents, cuts, burns, inflammation, fevers, surgery risk' },
    'Mercury': { strong: 'Sharp mind, good nervous system, clear skin', weak: 'Nervous disorders, skin problems, speech issues, anxiety, allergies, OCD tendencies' },
    'Jupiter': { strong: 'Good liver function, healthy weight, strong immunity', weak: 'Diabetes, liver problems, obesity, cholesterol, ear issues, fatty liver' },
    'Venus': { strong: 'Good reproductive health, clear complexion, hormonal balance', weak: 'Kidney issues, UTI, diabetes, reproductive problems, hormonal imbalance, skin issues' },
    'Saturn': { strong: 'Good longevity, strong bones, endurance', weak: 'Joint pain, arthritis, chronic diseases, dental problems, slow metabolism, depression' },
    'Rahu': { strong: 'Resistance to unusual diseases', weak: 'Mystery illnesses, poisoning risk, psychological disorders, phobias, addiction tendency' },
    'Ketu': { strong: 'Spiritual resilience, good immunity', weak: 'Sudden illnesses, viral infections, digestive disorders, skin rashes, neurological issues' },
  };

  const h6Health = analyzeHouse(6, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const h8Health = analyzeHouse(8, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const saturnHouse = getPlanetHouse('Saturn');
  const rahuHouse = getPlanetHouse('Rahu');
  const ketuHouse = getPlanetHouse('Ketu');

  const healthVulnerabilities = [];
  // Check weak planets for health risks — use Shadbala if available for precision
  const healthStrengths = advancedShadbala || planetStrengths;
  Object.entries(planetStrengths).forEach(([key, ps]) => {
    const preciseScore = getHealthScore(key);
    if (preciseScore < 40 && HEALTH_BY_PLANET[ps.name || key]) {
      healthVulnerabilities.push({
        planet: ps.name || key,
        score: preciseScore,
        shadbalaScore: advancedShadbala?.[key]?.percentage || null,
        risk: HEALTH_BY_PLANET[ps.name || key].weak,
        weakestComponent: advancedShadbala?.[key]?.components ? (() => {
          const comp = advancedShadbala[key].components;
          const sorted = Object.entries(comp).sort((a, b) => a[1] - b[1]);
          return { name: sorted[0]?.[0], value: sorted[0]?.[1] };
        })() : null,
      });
    }
  });

  // Body areas at risk from malefics
  // ── Native's own kidney / urinary risk detection ─────────────────────────
  // Independent from mother's kidney analysis — assesses the NATIVE's own risk
  // Key indicators (BPHS + clinical correlation):
  //   Venus weak or in dusthana     → kidney/urinary karaka afflicted
  //   Saturn in H6/H7/H8            → chronic disease house, renal pressure
  //   Moon weak or in H6/H8/H12     → fluid system compromised
  //   Lord of 7th in dusthana        → 7th = maraka + kidney area
  //   Mars in H6 or H8              → surgical/inflammatory kidney events
  //   Ketu in H6 or H8              → sudden/mysterious illness
  //   Saturn aspects Moon or Venus   → slow chronic kidney degeneration
  const nativeVenusHouse   = getPlanetHouse('Venus');
  const nativeSaturnHouse  = getPlanetHouse('Saturn');
  const nativeMoonHouse    = getPlanetHouse('Moon');
  const nativeMarsHouse    = getPlanetHouse('Mars');
  const nativeKetuHouse    = getPlanetHouse('Ketu');
  const nativeRahuHouse    = getPlanetHouse('Rahu');
  const lord7KidneyName   = getHouseLord(7);
  const lord7KidneyHouse  = getPlanetHouse(lord7KidneyName);
  const venusScore         = getHealthScore('venus');
  const saturnScore        = getHealthScore('saturn');
  const moonHealthScore    = getHealthScore('moon');

  // Saturn aspects Venus? (3rd, 7th, 10th from Saturn)
  const satAspectsVenus = nativeSaturnHouse && nativeVenusHouse &&
    [3, 7, 10].includes(((nativeVenusHouse - nativeSaturnHouse + 12) % 12) + 1);
  // Saturn aspects Moon?
  const satAspectsMoonNative = nativeSaturnHouse && nativeMoonHouse &&
    [3, 7, 10].includes(((nativeMoonHouse - nativeSaturnHouse + 12) % 12) + 1);

  const nativeKidneyIndicators = [
    nativeVenusHouse && [6, 8, 12].includes(nativeVenusHouse),         // Venus in dusthana
    venusScore < 45,                                                    // Venus weak (Shadbala)
    nativeSaturnHouse && [6, 7, 8].includes(nativeSaturnHouse),        // Saturn in disease/maraka/transformation houses
    nativeMoonHouse && [6, 8, 12].includes(nativeMoonHouse),           // Moon in dusthana
    moonHealthScore < 45,                                               // Moon weak
    lord7KidneyHouse && [6, 8, 12].includes(lord7KidneyHouse),        // 7th lord in dusthana (kidney area + maraka)
    nativeMarsHouse && [6, 8].includes(nativeMarsHouse),               // Mars in H6/H8 = surgical/inflammatory risk
    nativeKetuHouse && [6, 8].includes(nativeKetuHouse),               // Ketu in H6/H8 = sudden illness
    satAspectsVenus,                                                    // Saturn squeezes Venus (kidney karaka)
    satAspectsMoonNative,                                               // Saturn on Moon = chronic fluid issues
  ].filter(Boolean).length;

  const nativeKidneyRisk = (() => {
    // Special override: Saturn + Ketu both in H8 = confirmed surgical/crisis health pattern
    // This is "chidra" (gap/wound) pattern — strong enough alone to classify as HIGH
    const satKetuBothInH8 = nativeSaturnHouse === 8 && nativeKetuHouse === 8;
    // Mars in H6 (6th = disease) with malefics in H8 = surgical + chronic double pattern
    const marsH6SatH8 = nativeMarsHouse === 6 && nativeSaturnHouse === 8;
    if (satKetuBothInH8 || (marsH6SatH8 && nativeKidneyIndicators >= 3)) return 'HIGH';
    if (nativeKidneyIndicators >= 4) return 'HIGH';
    if (nativeKidneyIndicators >= 2) return 'MODERATE';
    return 'LOW';
  })();

  const nativeKidneyNarrative = (() => {
    const satKetuBothInH8 = nativeSaturnHouse === 8 && nativeKetuHouse === 8;
    const marsH6SatH8 = nativeMarsHouse === 6 && nativeSaturnHouse === 8;
    if (nativeKidneyRisk === 'HIGH') {
      const parts = [];
      if (satKetuBothInH8) parts.push('Saturn + Ketu both in H8 (chronic + karmic surgical events — two distinct crisis points in life)');
      if (marsH6SatH8) parts.push('Mars in H6 (active disease house) + Saturn in H8 (transformation/surgery) = inflammatory condition leading to surgical intervention');
      if (nativeSaturnHouse && [6,7,8].includes(nativeSaturnHouse) && !satKetuBothInH8) parts.push(`Saturn in H${nativeSaturnHouse} (chronic disease pressure)`);
      if (nativeKetuHouse && [6,8].includes(nativeKetuHouse) && !satKetuBothInH8) parts.push(`Ketu in H${nativeKetuHouse} (sudden/karmic health events)`);
      if (nativeMarsHouse && [6,8].includes(nativeMarsHouse) && !marsH6SatH8) parts.push(`Mars in H${nativeMarsHouse} (surgical/inflammatory risk)`);
      if (venusScore < 45) parts.push(`Venus weak (${venusScore}% Shadbala — kidney karaka under stress)`);
      if (satAspectsVenus) parts.push('Saturn aspects Venus — chronic renal pressure');
      if (lord7KidneyHouse && [6,8,12].includes(lord7KidneyHouse)) parts.push(`7th lord in H${lord7KidneyHouse} — kidney/maraka area afflicted`);
      return `⚠️ HIGH KIDNEY / URINARY RISK: ${parts.join('; ')}. Kidney stones, chronic kidney disease, or urinary tract conditions are strongly indicated. Two or more distinct health episodes at different life stages are likely — typically one in the late 20s and a more serious episode around age 50. Surgical intervention may be required.`;
    }
    if (nativeKidneyRisk === 'MODERATE') {
      return 'MODERATE kidney/urinary risk — monitor Venus and Moon dashas, stay well hydrated, and do kidney function tests every 2 years after age 35.';
    }
    return 'No significant kidney risk detected from chart indicators.';
  })();

  const bodyRisks = [];
  houses.forEach(h => {
    const malefics = (h.planets || []).filter(p => ['Mars', 'Saturn', 'Rahu', 'Ketu'].includes(p.name));
    if (malefics.length > 0) {
      bodyRisks.push({ house: h.houseNumber, bodyPart: HEALTH_BY_HOUSE[h.houseNumber], malefics: malefics.map(m => m.name) });
    }
  });

  // ── ORGAN-SPECIFIC RISK ANALYSIS ─────────────────────────────
  // Each organ system is checked against classical BPHS indicators:
  // ruling house, karaka planet, house lord placement, malefic aspects.
  // Risk levels: HIGH / MODERATE / LOW
  const organRisks = {};

  // Helper: number of indicators that are true → risk level
  const riskLevel = (count, highThresh = 3, modThresh = 1) =>
    count >= highThresh ? 'HIGH' : count >= modThresh ? 'MODERATE' : 'LOW';

  // ─ HEART & CARDIOVASCULAR (H4, Sun, Leo/H5) ─────────────────
  const sunHouse   = getPlanetHouse('Sun');
  const lord4H     = getPlanetHouse(getHouseLord(4));
  const lord5H     = getPlanetHouse(getHouseLord(5));
  const sunScore   = getHealthScore('sun');
  const h4Malefics = (houses[3]?.planets || []).filter(p => ['Mars','Saturn','Rahu','Ketu'].includes(p.name));
  const satAspH4   = nativeSaturnHouse && [3,7,10].includes(((4 - nativeSaturnHouse + 12) % 12) + 1);
  const marsAspH4  = nativeMarsHouse   && [4,7,8].includes(((4 - nativeMarsHouse  + 12) % 12) + 1);
  const heartCount = [
    sunScore < 45,
    sunHouse && [6,8,12].includes(sunHouse),
    lord4H   && [6,8,12].includes(lord4H),
    h4Malefics.length > 0,
    satAspH4,
    marsAspH4,
  ].filter(Boolean).length;
  organRisks.heart = {
    organ: 'Heart & Cardiovascular System',
    risk: riskLevel(heartCount, 3, 1),
    indicators: heartCount,
    diseases: ['Hypertension', 'Cardiac arrhythmia', 'Coronary artery disease', 'Palpitations'],
    vulnerableAge: sunScore < 40 ? '40s onwards' : '50s onwards',
    prevention: 'Regular BP monitoring, avoid excess salt and saturated fats, morning walks, arjuna bark tea',
    narrative: heartCount >= 3
      ? `⚠️ HIGH CARDIAC RISK: Sun weak/afflicted (score ${sunScore}%) + malefics on 4th/5th house axis. Watch for hypertension and heart strain especially after age 40. Annual ECG recommended.`
      : heartCount >= 1
        ? `MODERATE cardiac sensitivity — maintain low-stress lifestyle, avoid smoking, regular exercise from age 35.`
        : `Heart system is relatively protected in this chart.`,
  };

  // ─ LIVER & DIGESTION (H5, Jupiter, Virgo/H6) ────────────────
  const jupHouse   = getPlanetHouse('Jupiter');
  const jupScore   = getHealthScore('jupiter');
  const lord5Hdig  = getPlanetHouse(getHouseLord(5));
  const lord6Hdig  = getPlanetHouse(getHouseLord(6));
  const h5Malefics = (houses[4]?.planets || []).filter(p => ['Mars','Saturn','Rahu','Ketu'].includes(p.name));
  const liverCount = [
    jupScore < 45,
    jupHouse  && [6,8,12].includes(jupHouse),
    lord5Hdig && [6,8,12].includes(lord5Hdig),
    h5Malefics.length > 0,
    nativeRahuHouse === 5 || nativeKetuHouse === 5,
  ].filter(Boolean).length;
  organRisks.liver = {
    organ: 'Liver, Pancreas & Upper Digestion',
    risk: riskLevel(liverCount, 3, 1),
    indicators: liverCount,
    diseases: ['Fatty liver', 'Hepatitis risk', 'Diabetes', 'Cholesterol', 'Pancreatitis', 'Jaundice'],
    vulnerableAge: jupScore < 40 ? '30s onwards' : '45s onwards',
    prevention: 'Avoid alcohol, reduce processed sugar, drink karavila (bitter gourd) juice, turmeric in warm water every morning',
    narrative: liverCount >= 3
      ? `⚠️ HIGH LIVER/DIGESTIVE RISK: Jupiter weak (${jupScore}%) or afflicted. Susceptibility to diabetes, fatty liver, and cholesterol issues. Blood sugar monitoring from age 35 is essential.`
      : liverCount >= 1
        ? `MODERATE digestive sensitivity — watch sugar and fat intake, karavila juice helps regulate blood sugar.`
        : `Liver and digestion are well-supported in this chart.`,
  };

  // ─ LUNGS & RESPIRATORY (H3, Mercury, Gemini) ────────────────
  const mercHouse   = getPlanetHouse('Mercury');
  const mercScore   = getHealthScore('mercury');
  const lord3Hlung  = getPlanetHouse(getHouseLord(3));
  const h3Malefics  = (houses[2]?.planets || []).filter(p => ['Mars','Saturn','Rahu','Ketu'].includes(p.name));
  const satAspH3    = nativeSaturnHouse && [3,7,10].includes(((3 - nativeSaturnHouse + 12) % 12) + 1);
  const lungCount   = [
    mercScore < 45,
    mercHouse && [6,8,12].includes(mercHouse),
    lord3Hlung && [6,8,12].includes(lord3Hlung),
    h3Malefics.length > 0,
    satAspH3,
    nativeRahuHouse === 3 || nativeKetuHouse === 3,
  ].filter(Boolean).length;
  organRisks.lungs = {
    organ: 'Lungs & Respiratory System',
    risk: riskLevel(lungCount, 3, 1),
    indicators: lungCount,
    diseases: ['Asthma', 'Bronchitis', 'Allergic rhinitis', 'Respiratory infections', 'Breathing difficulties'],
    vulnerableAge: mercScore < 40 ? '20s onwards' : '40s onwards',
    prevention: 'Avoid dusty environments, practice pranayama daily, turmeric milk at night, murunga (moringa) leaves',
    narrative: lungCount >= 3
      ? `⚠️ HIGH RESPIRATORY RISK: Mercury weak (${mercScore}%) or 3rd house afflicted. Prone to asthma, bronchitis, and respiratory allergies. Avoid smoking completely.`
      : lungCount >= 1
        ? `MODERATE respiratory sensitivity — be cautious during monsoon season, dusty environments.`
        : `Respiratory system is relatively strong in this chart.`,
  };

  // ─ BONES, JOINTS & SPINE (H10, Saturn, Capricorn) ───────────
  const satScore2   = getHealthScore('saturn');
  const lord10Hbone = getPlanetHouse(getHouseLord(10));
  const h10Malefics = (houses[9]?.planets || []).filter(p => ['Mars','Saturn','Rahu','Ketu'].includes(p.name));
  const satInH10    = nativeSaturnHouse === 10;
  const marsAspH10  = nativeMarsHouse && [4,7,8].includes(((10 - nativeMarsHouse + 12) % 12) + 1);
  const boneCount   = [
    satScore2 < 45,
    nativeSaturnHouse && [6,8,12].includes(nativeSaturnHouse),
    lord10Hbone && [6,8,12].includes(lord10Hbone),
    h10Malefics.length > 0,
    marsAspH10,
    nativeKetuHouse === 10,
  ].filter(Boolean).length;
  organRisks.bones = {
    organ: 'Bones, Joints & Spine',
    risk: riskLevel(boneCount, 3, 1),
    indicators: boneCount,
    diseases: ['Arthritis', 'Osteoporosis', 'Joint pain', 'Slip disc', 'Knee problems', 'Dental issues', 'Spinal degeneration'],
    vulnerableAge: satScore2 < 40 ? '35s onwards' : '50s onwards',
    prevention: 'Calcium-rich foods (small fish, sesame seeds, green leaves), avoid prolonged sitting, gentle yoga for spine, warm sesame oil massage',
    narrative: boneCount >= 3
      ? `⚠️ HIGH BONE/JOINT RISK: Saturn weak (${satScore2}%) or afflicted. Arthritis, joint degeneration, and spinal issues are likely after middle age. Proactive calcium and Vitamin D supplementation essential.`
      : boneCount >= 1
        ? `MODERATE bone/joint sensitivity — maintain active lifestyle, avoid obesity (extra weight on joints).`
        : `Bone and joint system is reasonably well-supported.`,
  };

  // ─ EYES (H2, Sun, H12 for left eye) ─────────────────────────
  const lord2Heye   = getPlanetHouse(getHouseLord(2));
  const lord12Heye  = getPlanetHouse(getHouseLord(12));
  const h2Malefics  = (houses[1]?.planets || []).filter(p => ['Mars','Saturn','Rahu','Ketu'].includes(p.name));
  const h12Malefics = (houses[11]?.planets || []).filter(p => ['Mars','Saturn','Rahu','Ketu'].includes(p.name));
  // Sun debilitation check — Sun in Tula (rashiId 7) is debilitated = strong eye risk indicator
  const sunIsDebilitated = planets.sun?.rashiId === 7;
  // Malefic aspecting Sun — Saturn/Mars/Rahu/Ketu aspecting Sun's house
  const sunHouseForEye = sunHouse || getPlanetHouse('Sun');
  const maleficAspectsSun = [
    nativeSaturnHouse && [3, 7, 10].includes(((sunHouseForEye - nativeSaturnHouse + 12) % 12) + 1),
    nativeMarsHouse && [4, 7, 8].includes(((sunHouseForEye - nativeMarsHouse + 12) % 12) + 1),
    nativeRahuHouse === sunHouseForEye,
  ].filter(Boolean).length > 0;
  const eyeCount    = [
    sunScore < 45,
    sunIsDebilitated,                                                // Sun in debilitation = inherent eye weakness
    sunIsDebilitated && sunScore < 55,                               // Debilitated + weak = double risk
    maleficAspectsSun,                                               // Malefic aspect on Sun damages eye karaka
    lord2Heye  && [6,8,12].includes(lord2Heye),
    lord12Heye && [6,8,12].includes(lord12Heye),
    h2Malefics.length > 0,
    h12Malefics.length > 0,
    nativeRahuHouse === 2 || nativeRahuHouse === 12,
    nativeKetuHouse === 2 || nativeKetuHouse === 12,
  ].filter(Boolean).length;
  organRisks.eyes = {
    organ: 'Eyes & Vision',
    risk: riskLevel(eyeCount, 3, 1),
    indicators: eyeCount,
    diseases: ['Refractive errors', 'Cataracts', 'Glaucoma', 'Dry eyes', 'Night blindness'],
    vulnerableAge: sunIsDebilitated ? '20s onwards' : sunScore < 40 ? '30s onwards' : '45s onwards',
    prevention: 'Triphala eye wash weekly, Vitamin A foods (carrots, papaya, green leaves), reduce screen time, eye yoga',
    narrative: eyeCount >= 3
      ? `⚠️ HIGH EYE RISK: ${sunIsDebilitated ? 'Sun debilitated (Neecha) — eye karaka is inherently weak. ' : ''}Sun or 2nd/12th house axis afflicted. Risk of refractive errors, cataracts, glaucoma, or significant vision deterioration. Annual eye check from age ${sunIsDebilitated ? '25' : '35'}.`
      : eyeCount >= 1
        ? `MODERATE eye sensitivity${sunIsDebilitated ? ' — Sun debilitated, eye karaka weakened' : ''} — reduce screen glare, regular eye tests, triphala wash helps.`
        : `Eye health is relatively well protected.`,
  };

  // ─ NERVOUS SYSTEM & MENTAL HEALTH (H3, Mercury, Moon) ───────
  const moonScore2  = getHealthScore('moon');
  const nervCount   = [
    mercScore < 45,
    moonScore2 < 45,
    mercHouse  && [6,8,12].includes(mercHouse),
    nativeMoonHouse && [6,8,12].includes(nativeMoonHouse),
    nativeSaturnHouse === nativeMoonHouse, // Vish Yoga
    nativeRahuHouse === 3 || nativeRahuHouse === nativeMoonHouse,
  ].filter(Boolean).length;
  organRisks.nerves = {
    organ: 'Nervous System & Mental Health',
    risk: riskLevel(nervCount, 3, 1),
    indicators: nervCount,
    diseases: ['Anxiety disorders', 'Depression', 'Insomnia', 'Migraines', 'Neurological sensitivity', 'OCD tendencies'],
    vulnerableAge: '20s onwards (lifelong management)',
    prevention: 'Daily meditation, ashwagandha, brahmi, warm milk with nutmeg before bed, reduce screen time after 9pm',
    narrative: nervCount >= 3
      ? `⚠️ HIGH NERVOUS SYSTEM RISK: Mercury and/or Moon weak/afflicted (Mercury ${mercScore}%, Moon ${moonScore2}%). Anxiety, insomnia, and overthinking are major patterns. Professional mental health support is recommended alongside herbal remedies.`
      : nervCount >= 1
        ? `MODERATE nervous sensitivity — stress management and sleep hygiene are important lifelong practices.`
        : `Nervous system and mental resilience are relatively strong.`,
  };

  // ─ REPRODUCTIVE & URINARY SYSTEM (H7/H8, Venus) ─────────────
  const lord8Hrep  = getPlanetHouse(getHouseLord(8));
  const h7Malefics = (houses[6]?.planets  || []).filter(p => ['Mars','Saturn','Rahu','Ketu'].includes(p.name));
  const h8Malefics2= (houses[7]?.planets  || []).filter(p => ['Mars','Saturn','Rahu','Ketu'].includes(p.name));
  const repCount   = [
    venusScore < 45,
    nativeVenusHouse && [6,8,12].includes(nativeVenusHouse),
    lord7KidneyHouse && [6,8,12].includes(lord7KidneyHouse),
    lord8Hrep && [6,8,12].includes(lord8Hrep),
    h7Malefics.length > 0,
    h8Malefics2.length > 0,
    nativeMarsHouse && [7,8].includes(nativeMarsHouse),
    satAspectsVenus,
  ].filter(Boolean).length;
  organRisks.reproductive = {
    organ: 'Reproductive & Urogenital System',
    risk: riskLevel(repCount, 3, 1),
    indicators: repCount,
    diseases: ['Hormonal imbalance', 'PCOS (female)', 'Prostate issues (male)', 'STD susceptibility', 'Fertility concerns', 'Cysts'],
    vulnerableAge: venusScore < 40 ? '25s onwards' : '40s onwards',
    prevention: 'Regular reproductive health check-ups, shatavari for women / ashwagandha for men, stay hydrated, avoid processed foods',
    narrative: repCount >= 3
      ? `⚠️ HIGH REPRODUCTIVE/UROGENITAL RISK: Venus weak (${venusScore}%) and/or 7th-8th house axis afflicted. Hormonal issues, reproductive health concerns, and urinary problems are indicated across different life stages.`
      : repCount >= 1
        ? `MODERATE reproductive sensitivity — regular gynaecological/urological check-ups from age 30.`
        : `Reproductive health is relatively protected in this chart.`,
  };

  // ─ SKIN (Mercury, Venus, Rahu) ───────────────────────────────
  const skinCount  = [
    mercScore < 45,
    venusScore < 45,
    nativeRahuHouse && [1,6].includes(nativeRahuHouse),
    nativeKetuHouse && [1,6].includes(nativeKetuHouse),
    mercHouse && [6,8,12].includes(mercHouse),
  ].filter(Boolean).length;
  organRisks.skin = {
    organ: 'Skin & Dermatological Health',
    risk: riskLevel(skinCount, 3, 1),
    indicators: skinCount,
    diseases: ['Eczema', 'Psoriasis', 'Acne', 'Allergic rashes', 'Fungal infections', 'Premature aging of skin'],
    vulnerableAge: 'Throughout life — peaks in 20s and after 45',
    prevention: 'Coconut oil massage daily, stay well hydrated, avoid spicy/oily foods during hot months, neem leaves bath',
    narrative: skinCount >= 3
      ? `⚠️ HIGH SKIN RISK: Mercury and Venus both weak, or Rahu on the ascendant/disease axis. Chronic skin conditions, recurrent rashes, and allergy-driven skin reactions are very likely.`
      : skinCount >= 1
        ? `MODERATE skin sensitivity — moisturise, avoid harsh soaps, neem helps manage skin health.`
        : `Skin health is relatively good in this chart.`,
  };

  // ─ BLOOD PRESSURE & CIRCULATION (Mars, H6, H11) ─────────────
  const marsScore2  = getHealthScore('mars');
  const lord11Hcirc = getPlanetHouse(getHouseLord(11));
  const bpCount     = [
    marsScore2 < 45,
    nativeMarsHouse && [6,8,12].includes(nativeMarsHouse),
    nativeSaturnHouse && [6,8].includes(nativeSaturnHouse),
    lord11Hcirc && [6,8,12].includes(lord11Hcirc),
    nativeRahuHouse === 6,
  ].filter(Boolean).length;
  organRisks.bloodPressure = {
    organ: 'Blood Pressure & Circulation',
    risk: riskLevel(bpCount, 3, 1),
    indicators: bpCount,
    diseases: ['Hypertension', 'Hypotension', 'Poor circulation', 'Varicose veins', 'Blood disorders', 'Anemia'],
    vulnerableAge: marsScore2 < 40 ? '30s onwards' : '40s onwards',
    prevention: 'Garlic, hibiscus tea (shoe flower/wada mal), reduce salt, regular aerobic exercise, manage anger and stress',
    narrative: bpCount >= 3
      ? `⚠️ HIGH BLOOD PRESSURE RISK: Mars weak (${marsScore2}%) or in disease house. Hypertension, blood pressure fluctuations, and circulation issues are significant risks. Regular BP monitoring from age 30.`
      : bpCount >= 1
        ? `MODERATE circulatory sensitivity — manage stress and anger (key BP trigger), stay hydrated.`
        : `Blood pressure and circulation appear protected in this chart.`,
  };

  // ─ THYROID & ENDOCRINE (Venus, Mercury, H2) ──────────────────
  const thyroidCount = [
    venusScore < 45,
    mercScore  < 45,
    nativeVenusHouse === 2 || (nativeVenusHouse && [6,8,12].includes(nativeVenusHouse)),
    h2Malefics.length > 0,
    nativeRahuHouse === 2,
  ].filter(Boolean).length;
  organRisks.thyroid = {
    organ: 'Thyroid & Endocrine System',
    risk: riskLevel(thyroidCount, 3, 1),
    indicators: thyroidCount,
    diseases: ['Hypothyroidism', 'Hyperthyroidism', 'Hormonal imbalance', 'Adrenal fatigue', 'Insulin resistance'],
    vulnerableAge: venusScore < 40 ? '25s onwards' : '35s onwards',
    prevention: 'Iodised salt, coconut oil cooking, reduce soy/processed food, ashwagandha, thyroid test every 3 years from age 30',
    narrative: thyroidCount >= 3
      ? `⚠️ HIGH THYROID RISK: Venus/Mercury weak and 2nd house afflicted (throat/endocrine area). Hypothyroidism, hormonal dysregulation, and metabolic issues are strongly indicated.`
      : thyroidCount >= 1
        ? `MODERATE endocrine sensitivity — monitor thyroid function, especially during stressful life phases.`
        : `Thyroid and endocrine health appear stable in this chart.`,
  };

  // ── Build the organRisks summary array for prompt consumption ──
  // ─ KIDNEY & URINARY TRACT (Venus, H7, Saturn, H8) ────────────
  // Uses the already-computed nativeKidney* variables (above in the kidney section)
  // to slot kidney directly into organRisks so it appears in the full organ map.
  organRisks.kidneys = {
    organ: 'Kidneys & Urinary Tract',
    risk: nativeKidneyRisk,
    indicators: nativeKidneyIndicators,
    diseases: [
      'Kidney stones (urolithiasis)',
      'Chronic kidney disease (CKD)',
      'Urinary tract infections (UTI)',
      'Renal inflammation / nephritis',
      'Urinary obstruction',
      ...(nativeSaturnHouse === 8 || nativeKetuHouse === 8
        ? ['Surgical kidney intervention', 'Kidney removal risk (nephrectomy)']
        : []),
    ],
    vulnerableAge: nativeKidneyRisk === 'HIGH'
      ? 'Late 20s (first episode) and ~50s (major crisis)'
      : nativeKidneyRisk === 'MODERATE'
        ? '35s onwards'
        : '50s onwards (low risk)',
    prevention: [
      'Drink minimum 3 litres of water daily — non-negotiable',
      'Polpala (Aerva lanata) tea — the classical Ayurvedic kidney herb, 2× daily',
      'Barley water (iridhu) — kidney flushing, drink daily',
      'Coconut water 1-2× daily',
      'Avoid excess salt, red meat, spinach (oxalate), and processed foods',
      'Annual kidney function panel: serum creatinine, eGFR, urine microalbumin — from age 30',
      'Avoid NSAIDs (pain killers like diclofenac) which stress kidneys',
      ...(nativeKidneyRisk === 'HIGH' ? ['Ultrasound kidney scan every 2 years from age 35'] : []),
    ].join('; '),
    narrative: nativeKidneyNarrative,
  };

  // ─ FEET, ANKLES & LOWER LIMBS (H12, Saturn, Pisces/H12 lord) ─
  // H12 = feet, H11 = calves/ankles. Saturn = chronic pain. Ketu = mysterious ailments.
  // Pisces (Meena, rashiId 12) connection amplifies foot vulnerability.
  const lord12Hfeet = getPlanetHouse(getHouseLord(12));
  const lord11Hfeet = getPlanetHouse(getHouseLord(11));
  const h12MalFeet  = (houses[11]?.planets || []).filter(p => ['Mars','Saturn','Rahu','Ketu'].includes(p.name));
  const h11MalFeet  = (houses[10]?.planets || []).filter(p => ['Mars','Saturn','Rahu','Ketu'].includes(p.name));
  // Saturn debilitated (in Mesha, rashiId 1) → chronic structural weakness in extremities
  const saturnIsDebilitated = planets.saturn?.rashiId === 1;
  const feetCount = [
    lord12Hfeet && [6, 8, 12].includes(lord12Hfeet),                 // 12th lord in dusthana
    lord11Hfeet && [6, 8, 12].includes(lord11Hfeet),                 // 11th lord in dusthana
    h12MalFeet.length > 0,                                            // Malefics in 12th house (feet area)
    h11MalFeet.length > 0,                                            // Malefics in 11th house (ankles/calves)
    saturnIsDebilitated,                                              // Saturn debilitated = chronic skeletal/joint weakness
    saturnScore < 45,                                                 // Saturn weak = bone/joint vulnerability in extremities
    nativeSaturnHouse === 12 || nativeSaturnHouse === 11,            // Saturn in feet/ankle house
    nativeKetuHouse === 12,                                           // Ketu in 12th = mysterious foot ailments
    nativeRahuHouse === 12,                                           // Rahu in 12th = unusual foot conditions
    // Saturn aspecting 12th house
    nativeSaturnHouse && [3, 7, 10].includes(((12 - nativeSaturnHouse + 12) % 12) + 1),
  ].filter(Boolean).length;
  organRisks.feet = {
    organ: 'Feet, Ankles & Lower Limbs',
    risk: riskLevel(feetCount, 3, 1),
    indicators: feetCount,
    diseases: ['Plantar fasciitis', 'Ankle sprains/weakness', 'Flat feet', 'Varicose veins', 'Peripheral neuropathy (feet)', 'Gout', 'Heel spurs', 'Cold extremities'],
    vulnerableAge: saturnIsDebilitated ? '20s onwards' : saturnScore < 45 ? '30s onwards' : '40s onwards',
    prevention: 'Warm sesame oil foot massage (pada abhyanga) before bed, elevate feet daily, proper arch-support footwear, avoid prolonged standing, Epsom salt foot soak weekly',
    narrative: feetCount >= 3
      ? `⚠️ HIGH FOOT/ANKLE RISK: ${saturnIsDebilitated ? 'Saturn debilitated — chronic structural weakness in extremities. ' : ''}12th/11th house axis afflicted. Persistent foot pain, ankle weakness, or circulatory issues in lower limbs. Proper footwear and regular foot care essential.`
      : feetCount >= 1
        ? `MODERATE foot/ankle sensitivity${saturnIsDebilitated ? ' — Saturn debilitated, lower limb vulnerability' : ''}. Warm oil massage and supportive footwear recommended.`
        : `Feet and lower limb health appear well-supported.`,
  };

  const organRiskSummary = Object.values(organRisks).map(o => ({
    organ: o.organ,
    risk: o.risk,
    indicators: o.indicators,  // numeric score for ranking
    diseases: o.diseases,
    vulnerableAge: o.vulnerableAge,
    prevention: o.prevention,
    narrative: o.narrative,
  }));

  // ── HIGH-RISK organs for quick reference ──
  const highRiskOrgans = organRiskSummary.filter(o => o.risk === 'HIGH').map(o => o.organ);
  const moderateRiskOrgans = organRiskSummary.filter(o => o.risk === 'MODERATE').map(o => o.organ);

  // ── RANKED ORGAN RISKS — sorted by indicator count (highest risk first) ──
  // This allows AI to highlight the MOST at-risk organ prominently
  const rankedOrganRisks = [...organRiskSummary].sort((a, b) => {
    // First sort by risk level (HIGH > MODERATE > LOW)
    const riskOrder = { 'HIGH': 3, 'MODERATE': 2, 'LOW': 1 };
    const levelDiff = (riskOrder[b.risk] || 0) - (riskOrder[a.risk] || 0);
    if (levelDiff !== 0) return levelDiff;
    // Then by indicator count within same risk level
    return (b.indicators || 0) - (a.indicators || 0);
  });

  // ── PRIMARY HEALTH CONCERN — the single highest-risk organ ──
  const primaryHealthConcern = rankedOrganRisks[0] ? {
    organ: rankedOrganRisks[0].organ,
    risk: rankedOrganRisks[0].risk,
    indicators: rankedOrganRisks[0].indicators,
    diseases: rankedOrganRisks[0].diseases,
    vulnerableAge: rankedOrganRisks[0].vulnerableAge,
    prevention: rankedOrganRisks[0].prevention,
    narrative: rankedOrganRisks[0].narrative,
    remedies: (() => {
      // Comprehensive remedies for each organ system
      const remediesMap = {
        'Heart & Cardiovascular System': {
          ayurvedic: ['Arjuna (Terminalia arjuna) bark — 1g powder twice daily with warm water', 'Ashwagandha for stress-related cardiac issues', 'Amla (gooseberry) juice daily'],
          dietary: ['Reduce salt to under 5g/day', 'Avoid red meat, fried foods, coconut milk excess', 'Include garlic, ginger, turmeric daily', 'Oats and green leafy vegetables'],
          lifestyle: ['30 min morning walk daily', 'Pranayama — Anulom Vilom 15 min', 'Annual ECG from age 40, stress test from 45', 'Manage anger actively'],
          gemstone: 'Ruby (Manik) set in gold, worn on Sunday, only if Sun is not malefic',
          mantra: 'Om Suryaya Namaha (108×) on Sundays',
        },
        'Kidneys & Urinary Tract': {
          ayurvedic: ['Polpala (Aerva lanata) — THE Sri Lankan kidney herb, 2 cups tea daily', 'Punarnava (Boerhavia diffusa) — kidney rejuvenator', 'Gokshura (Tribulus) for urinary flow', 'Barley water (iridhu) daily'],
          dietary: ['Drink minimum 3L water daily — non-negotiable', 'Avoid high-oxalate foods: spinach, beets, rhubarb, nuts', 'Reduce salt and processed foods', 'Coconut water 1-2 times daily'],
          lifestyle: ['Annual kidney function panel (creatinine, eGFR, urine microalbumin) from age 30', 'Avoid NSAIDs (pain killers like diclofenac)', 'Ultrasound kidney scan every 2 years if HIGH risk'],
          gemstone: 'Diamond or White Sapphire for Venus (kidney karaka) — consult astrologer first',
          mantra: 'Om Shukraya Namaha (108×) on Fridays',
        },
        'Liver, Pancreas & Upper Digestion': {
          ayurvedic: ['Karavila (bitter gourd) juice on empty stomach', 'Turmeric (1 tsp) in warm water daily', 'Triphala at bedtime for digestion', 'Kutki (Picrorhiza) for liver detox'],
          dietary: ['Avoid alcohol completely', 'Reduce processed sugar, white rice, fried foods', 'Include bitter foods: karavila, murunga, curry leaves', 'Intermittent fasting helps liver'],
          lifestyle: ['Blood sugar and HbA1c test annually from age 35', 'Liver function test annually', 'Exercise 30 min daily to prevent fatty liver'],
          gemstone: 'Yellow Sapphire (Pukhraj) for Jupiter — only if Jupiter is benefic',
          mantra: 'Om Gurave Namaha (108×) on Thursdays',
        },
        'Lungs & Respiratory System': {
          ayurvedic: ['Tulsi (holy basil) tea — natural bronchodilator', 'Murunga (moringa) leaves — respiratory immunity', 'Vasaka (Adhatoda) for chronic cough', 'Turmeric milk at night'],
          dietary: ['Avoid cold foods/drinks', 'Warm soups, pepper, ginger help clear airways', 'Reduce dairy if mucus-prone', 'Honey with ginger for cough'],
          lifestyle: ['Pranayama daily — Kapalbhati, Bhastrika', 'Avoid smoking completely', 'Use air purifier in dusty environments', 'Steam inhalation with eucalyptus weekly'],
          gemstone: 'Emerald (Panna) for Mercury — consult astrologer',
          mantra: 'Om Budhaya Namaha (108×) on Wednesdays',
        },
        'Bones, Joints & Spine': {
          ayurvedic: ['Ashwagandha — bone and muscle strengthener', 'Shallaki (Boswellia) for joint inflammation', 'Warm sesame oil massage (abhyanga)', 'Hadjod (Cissus) for bone fractures'],
          dietary: ['Calcium-rich: small fish with bones, sesame seeds, green leaves, curd', 'Vitamin D: sunlight 15 min daily, fish, eggs', 'Avoid excess caffeine (depletes calcium)', 'Bone broth soups weekly'],
          lifestyle: ['Weight-bearing exercise — walking, climbing stairs', 'Gentle yoga for spine — cat-cow, child pose', 'Avoid prolonged sitting', 'DEXA bone scan at 50 if HIGH risk'],
          gemstone: 'Blue Sapphire (Neelam) for Saturn — MUST consult experienced astrologer, can be powerful',
          mantra: 'Om Shanaishcharaya Namaha (108×) on Saturdays',
        },
        'Eyes & Vision': {
          ayurvedic: ['Triphala eye wash — soak Triphala in water overnight, strain, use as eye wash', 'Netra Tarpana (ghee eye therapy) — professional treatment', 'Amla juice for eye health'],
          dietary: ['Vitamin A: carrots, papaya, mango, green leafy vegetables', 'Omega-3: fish, walnuts', 'Avoid excess screen time, especially in darkness'],
          lifestyle: ['20-20-20 rule: every 20 min, look 20 feet away for 20 seconds', 'Eye exercises — palming, clockwise/counter-clockwise rotation', 'Annual comprehensive eye exam from age 35', 'Sunglasses outdoors'],
          gemstone: 'Ruby for Sun (eye karaka) — only if Sun is not afflicted',
          mantra: 'Om Suryaya Namaha (108×) on Sundays',
        },
        'Nervous System & Mental Health': {
          ayurvedic: ['Brahmi (Bacopa) — THE brain herb, 500mg twice daily', 'Ashwagandha for anxiety and stress', 'Jatamansi for sleep and calm', 'Shankhpushpi for memory and focus'],
          dietary: ['Warm milk with nutmeg before bed', 'Avoid caffeine after 2pm', 'Walnuts, almonds, ghee support brain', 'Avoid processed foods and excess sugar'],
          lifestyle: ['Meditation 15-20 min daily — Vipassana or guided', 'Regular sleep schedule — bed by 10pm', 'Limit screen time after 9pm', 'Professional counseling if needed — no shame'],
          gemstone: 'Pearl (Moti) for Moon — wear on Monday, set in silver',
          mantra: 'Om Chandraya Namaha (108×) on Mondays',
        },
        'Reproductive & Urogenital System': {
          ayurvedic: ['Women: Shatavari — THE female reproductive tonic', 'Men: Ashwagandha + Shilajit for vitality', 'Both: Gokshura for urogenital health'],
          dietary: ['Avoid processed foods and plastic containers (endocrine disruptors)', 'Include zinc-rich foods: pumpkin seeds, shellfish', 'Folic acid for women planning pregnancy'],
          lifestyle: ['Regular reproductive health checkups from age 30', 'Manage stress (affects hormones)', 'Maintain healthy body weight', 'Avoid tight clothing that restricts circulation'],
          gemstone: 'Diamond or Opal for Venus — consult astrologer',
          mantra: 'Om Shukraya Namaha (108×) on Fridays',
        },
        'Skin & Dermatological Health': {
          ayurvedic: ['Neem — internal (tablets) and external (oil/paste)', 'Manjistha for blood purification and clear skin', 'Turmeric paste for external application', 'Aloe vera gel for moisturizing'],
          dietary: ['Drink 8+ glasses of water daily', 'Avoid spicy, oily, fermented foods during flare-ups', 'Include bitter foods: neem, karavila', 'Coconut oil for cooking'],
          lifestyle: ['Daily coconut oil massage before bath', 'Avoid harsh chemical soaps', 'Cotton clothing in humid weather', 'Identify and avoid personal triggers'],
          gemstone: 'Emerald for Mercury + Diamond for Venus — both affect skin',
          mantra: 'Om Budhaya Namaha + Om Shukraya Namaha',
        },
        'Blood Pressure & Circulation': {
          ayurvedic: ['Arjuna for blood pressure regulation', 'Garlic — 2 cloves daily raw or in food', 'Hibiscus tea (shoe flower / wada mal)', 'Sarpagandha (Rauwolfia) for severe hypertension — consult doctor'],
          dietary: ['Reduce salt drastically — under 5g/day', 'DASH diet: fruits, vegetables, whole grains, lean protein', 'Avoid caffeine and alcohol', 'Potassium-rich: bananas, coconut water'],
          lifestyle: ['Regular aerobic exercise 30 min daily', 'Manage anger and stress actively', 'Monitor BP at home weekly if at risk', 'Maintain healthy weight'],
          gemstone: 'Red Coral (Moonga) for Mars — only if Mars is not malefic',
          mantra: 'Om Angarakaya Namaha (108×) on Tuesdays',
        },
        'Thyroid & Endocrine System': {
          ayurvedic: ['Ashwagandha — supports thyroid function', 'Guggul (Commiphora) for hypothyroid', 'Kanchanar (Bauhinia) for thyroid nodules', 'Triphala for metabolism'],
          dietary: ['Iodised salt if iodine-deficient', 'Avoid excess soy products (goitrogens)', 'Include selenium: Brazil nuts, fish', 'Coconut oil for metabolism'],
          lifestyle: ['Thyroid function test every 2-3 years from age 30', 'Neck exercises to improve blood flow', 'Manage stress (directly affects thyroid)', 'Regular sleep schedule'],
          gemstone: 'Diamond for Venus + Emerald for Mercury — endocrine regulators',
          mantra: 'Om Shukraya Namaha + Om Budhaya Namaha',
        },
        'Feet, Ankles & Lower Limbs': {
          ayurvedic: ['Warm sesame oil foot massage (pada abhyanga) before bed', 'Dhanwantharam oil for joint pain', 'Maharasnadi kashayam for chronic foot pain'],
          dietary: ['Reduce uric acid: avoid red meat, organ meats, alcohol', 'Stay well hydrated', 'Anti-inflammatory: turmeric, ginger, omega-3'],
          lifestyle: ['Proper arch-support footwear — avoid flat shoes', 'Elevate feet for 15 min daily', 'Epsom salt foot soak weekly', 'Avoid prolonged standing'],
          gemstone: 'Blue Sapphire for Saturn (rules feet) — only with proper consultation',
          mantra: 'Om Shanaishcharaya Namaha (108×) on Saturdays',
        },
      };
      return remediesMap[rankedOrganRisks[0].organ] || {
        ayurvedic: ['Triphala for general health', 'Ashwagandha for vitality', 'Chyawanprash daily'],
        dietary: ['Balanced Sri Lankan diet', 'Plenty of water', 'Fresh fruits and vegetables'],
        lifestyle: ['Regular exercise', 'Adequate sleep', 'Stress management'],
        gemstone: 'Consult an experienced Vedic astrologer for personalized gem recommendation',
        mantra: 'Om Navagraha Devaya Namaha',
      };
    })(),
  } : null;

  // ── Health danger periods — antardasha-level dangerous combos ────
  // Only flag periods where BOTH MD and AD lord are health-threatening.
  // Dangerous lords: 6th lord (disease), 8th lord (chronic), Saturn, Ketu, Maraka lords (2nd/7th)
  // BUT: exclude the lagna lord — it's always benefic even if it also rules a dusthana
  // (e.g., Mars for Vrischika rules both 1st and 6th — it's a benefic, not a disease lord)
  const marakaLords = [lord2Name, lord7Name].filter(Boolean);
  const lagnaLordName = getHouseLord(1);
  const healthDangerLords = [lord6Name, lord8Name, 'Saturn', 'Ketu', ...marakaLords]
    .filter(l => l && l !== lagnaLordName); // exclude lagna lord — always benefic

  const healthDangerDasas = [];
  const getDangerLabel = (lord) => {
    if (lord === lord6Name) return 'disease lord';
    if (lord === lord8Name) return 'chronic illness lord';
    if (lord === 'Saturn') return 'chronic pain/joints';
    if (lord === 'Ketu') return 'sudden illness/surgical';
    return 'maraka';
  };
  dasaPeriods.forEach(md => {
    const isMDDangerous = healthDangerLords.includes(md.lord);
    (md.antardashas || []).forEach(ad => {
      const isADDangerous = healthDangerLords.includes(ad.lord);
      // Only flag when BOTH MD and AD are dangerous — true double activation
      if (isMDDangerous && isADDangerous) {
        healthDangerDasas.push({
          lord: md.lord,
          antardasha: ad.lord,
          period: `${ad.start} to ${ad.endDate}`,
          level: 'CRITICAL',
          reason: `${md.lord} MD (${getDangerLabel(md.lord)}) + ${ad.lord} AD (${getDangerLabel(ad.lord)}) — double activation`,
        });
      }
    });
  });

  const health = {
    title: 'Health Blueprint',
    sinhala: 'සෞඛ්‍ය සැලැස්ම',
    sixthHouse: h6Health,
    eighthHouse: h8Health,
    overallVitality: getHealthScore('sun') >= 60 ? 'Strong vitality and life force' : 'Vitality needs strengthening — Sun remedies recommended',
    // ── Infant/Early childhood health vulnerability ──────────────
    earlyLifeHealth: (() => {
      const risks = [];
      const maleficNames = ['Saturn', 'Mars', 'Rahu', 'Ketu'];
      // Use getPlanetHouse to find which malefics are in health-critical houses
      const maleficHouses = {};
      maleficNames.forEach(m => { maleficHouses[m] = getPlanetHouse(m); });
      // Helper: which malefics are in a given house
      const maleficsIn = (h) => maleficNames.filter(m => maleficHouses[m] === h);
      const h1M = maleficsIn(1), h4M = maleficsIn(4), h6M = maleficsIn(6), h8M = maleficsIn(8);
      // 1. Malefics in 4th (chest/lungs/heart)
      if (h4M.includes('Ketu')) risks.push('Ketu in 4th house (chest/lungs) — vulnerability to respiratory illness (pneumonia, bronchitis, breathing difficulties) from birth. Near-death respiratory crisis in infancy is possible.');
      if (h4M.includes('Rahu')) risks.push('Rahu in 4th house — unusual/hard-to-diagnose chest/heart conditions in infancy');
      if (h4M.includes('Saturn')) risks.push('Saturn in 4th house — weak chest/lungs, slow recovery from respiratory infections');
      if (h4M.includes('Mars')) risks.push('Mars in 4th house — fevers, inflammation, surgical risk in chest area in childhood');
      // 2. Malefics in 6th (disease/immune/gut)
      if (h6M.includes('Saturn')) risks.push('Saturn in 6th house (disease house) — weakened immune system from birth, chronic childhood illness, severe digestive/gut problems in early years');
      if (h6M.includes('Ketu')) risks.push('Ketu in 6th house — mysterious childhood illnesses, hard to diagnose');
      if (h6M.includes('Mars')) risks.push('Mars in 6th house — inflammatory conditions, fevers, infections in childhood');
      if (h6M.length >= 2) risks.push('Multiple malefics in 6th house — severe immune/digestive problems in early childhood');
      // 3. Malefics in 8th (crisis/near-death)
      if (h8M.includes('Rahu') || h8M.includes('Ketu')) risks.push('Rahu/Ketu in 8th house — near-death experience or medical emergency possible in early life');
      if (h8M.includes('Saturn')) risks.push('Saturn in 8th house — life-threatening illness in childhood, prolonged hospitalization');
      // 4. Malefics in 1st (body/constitution)
      if (h1M.length > 0) risks.push(`Malefic(s) in 1st house (${h1M.join(', ')}) — physical health challenges from birth`);
      // 5. Debilitated planets
      const satDebilitated = planets.saturn?.rashi === 'Mesha';
      const marsDebilitated = planets.mars?.rashi === 'Karkata';
      if (satDebilitated) risks.push('Saturn debilitated (in Aries) — immune system severely weakened, bones/structure fragile in childhood. Prone to chronic infections.');
      if (marsDebilitated) risks.push('Mars debilitated (in Cancer) — low physical energy, prone to infections and fevers in early years');
      // 6. Retrograde malefics in health houses
      if (planets.saturn?.isRetrograde && [1,4,6,8].includes(maleficHouses['Saturn'])) risks.push('Saturn retrograde in health house — chronic/recurring health issues from childhood, delayed treatment, repeated hospital visits');
      if (planets.mars?.isRetrograde && [1,4,6,8].includes(maleficHouses['Mars'])) risks.push('Mars retrograde in health house — repeated fevers/inflammations in childhood');
      // 7. Birth dasha lord in difficult house
      const birthDashaLord = dasaPeriods[0]?.lord;
      if (birthDashaLord) {
        const bdHouse = getPlanetHouse(birthDashaLord);
        if ([6, 8, 12].includes(bdHouse)) risks.push(`Birth dasha lord (${birthDashaLord}) placed in difficult house ${bdHouse} — health crisis possible in first days/months of life`);
      }
      // 8. Weak Moon (infant constitution)
      if (getHealthScore('moon') < 40) risks.push('Weak Moon — fragile infant constitution, prone to dehydration, digestive issues, and feeding difficulties');
      // 9. Debilitated Saturn specifically in 6th (gut devastation)
      if (satDebilitated && maleficHouses['Saturn'] === 6) risks.push('Debilitated Saturn in 6th — extremely weak gut/immune system, chronic stomach/intestinal issues from infancy');
      const severity = risks.length >= 4 ? 'CRITICAL' : risks.length >= 2 ? 'HIGH' : risks.length >= 1 ? 'MODERATE' : 'LOW';
      return {
        severity,
        risks,
        summary: risks.length > 0
          ? `⚠️ ${severity} early-life health vulnerability detected. This person likely faced serious health challenges in infancy/childhood: ${risks.slice(0, 4).join('; ')}.`
          : 'No significant early-life health vulnerability indicators detected.'
      };
    })(),
    mentalHealthIndicator: (() => {
      // Check Moon-Saturn conjunction (Vish Yoga) — strongest indicator of mental health struggle
      const satInMoonH = getPlanetHouse('Saturn') === getPlanetHouse('Moon');
      if (satInMoonH) {
        return 'Moon-Saturn conjunction detected — emotional sensitivity is very high. Prone to anxiety, depression, melancholy, and childhood trauma effects. Mental health support and Moon-strengthening remedies are critical.';
      }
      // Check Moon in dusthana (6, 8, 12)
      const mh = getPlanetHouse('Moon');
      if (mh && [6, 8, 12].includes(mh)) {
        return 'Moon in a challenging position — mental health needs proactive care. Emotional fluctuations, anxiety, and overthinking are likely. Meditation and counseling recommended.';
      }
      // Check Saturn aspecting Moon
      const satH = getPlanetHouse('Saturn');
      if (satH && mh) {
        const gap = ((mh - satH + 12) % 12) + 1;
        if ([3, 7, 10].includes(gap)) {
          return 'Saturn influences the emotional mind — emotional maturity comes through hardship. Tends to suppress feelings. Learning emotional expression is important for mental health.';
        }
      }
      return getHealthScore('moon') >= 60 ? 'Good mental resilience' : 'Mental health needs attention — Moon remedies recommended';
    })(),
    healthVulnerabilities,
    bodyRisks,
    dangerPeriods: healthDangerDasas,
    longevityIndicator: (() => {
      const satScore = getHealthScore('saturn');
      const h8strength = h8Health?.strength || 'moderate';
      if (satScore >= 60 && h8strength !== 'challenged') return 'Long life indicated. Saturn is well-placed.';
      if (satScore >= 40) return 'Average longevity. Regular health checkups recommended after age 45.';
      return 'Health consciousness is essential throughout life. Preventive care is key.';
    })(),
    dietRecommendations: (() => {
      const tips = [];
      if (getHealthScore('sun') < 50) tips.push('Increase foods rich in Vitamin D — eggs, fish, sunlight exposure');
      if (getHealthScore('moon') < 50) tips.push('Cooling foods — milk, rice, coconut water, cucumber. Avoid heavy night meals.');
      if (getHealthScore('mars') < 50) tips.push('Iron-rich foods — red rice, spinach, beetroot, dates. Stay hydrated.');
      if (getHealthScore('jupiter') < 50) tips.push('Reduce sugar and fatty foods. Turmeric, fenugreek, bitter gourd help liver.');
      if (getHealthScore('saturn') < 50) tips.push('Calcium-rich foods — sesame seeds, small fish, green leafy vegetables.');
      if (tips.length === 0) tips.push('Your health planets are generally well-placed. Maintain a balanced Sri Lankan diet.');
      return tips;
    })(),
    // ── NEW: Shadbala-based health precision ─────────────────────
    shadbalaSummary: advancedShadbala ? {
      weakestPlanet: (() => {
        const sorted = Object.entries(advancedShadbala).sort((a, b) => a[1].percentage - b[1].percentage);
        return sorted[0] ? { name: sorted[0][1].name, percentage: sorted[0][1].percentage, strength: sorted[0][1].strength } : null;
      })(),
      strongestPlanet: (() => {
        const sorted = Object.entries(advancedShadbala).sort((a, b) => b[1].percentage - a[1].percentage);
        return sorted[0] ? { name: sorted[0][1].name, percentage: sorted[0][1].percentage, strength: sorted[0][1].strength } : null;
      })(),
      note: 'Based on full 6-component Shadbala (Sthana, Dig, Kala, Cheshta, Naisargika, Drig Bala) — more accurate than simplified strength scores',
    } : null,
    // ── Native's own kidney / urinary risk ───────────────────────
    kidneyRisk: nativeKidneyRisk,
    kidneyNarrative: nativeKidneyNarrative,
    kidneyIndicatorCount: nativeKidneyIndicators,
    // ── Full organ-by-organ risk map ─────────────────────────────
    organRisks: organRiskSummary,
    highRiskOrgans,
    moderateRiskOrgans,
    // ── NEW: Ranked organ risks (highest first) + Primary health concern ──
    rankedOrganRisks,
    primaryHealthConcern,
    // ── Nadi Astrology Health Analysis (Sub-Lord methodology) ──
    nadiHealth: nadiPredictions?.events?.health_disease ? (() => {
      const hd = nadiPredictions.events.health_disease;
      const lg = nadiPredictions.events?.longevity_good;
      return {
        diseaseVerdict: hd.verdict,
        diseaseStrength: hd.strength,
        diseasePlanets: hd.strongPlanets?.map(p => p.name),
        longevityVerdict: lg?.verdict,
        longevityStrength: lg?.strength,
        longevityPlanets: lg?.strongPlanets?.map(p => p.name),
        longevityEstimate: nadiPredictions.longevityEstimate,
        note: 'Nadi methodology: Disease in DBA of planets signifying 1,6,8,12. Longevity supported by 1,5,9,10,11. Death-inflicting houses are 6,8,12.',
      };
    })() : null,
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 14B: DEEP FAMILY PORTRAIT
  // ══════════════════════════════════════════════════════════════
  // Covers: Mother, Father, Siblings — character, career, health, struggles,
  //         and the native's relationship with each, cross-validated across
  //         multiple chart layers (D1, D9, Jaimini Karakas, Shadbala).
  //
  // Accuracy layers:
  //   L1  — House + lord position (BPHS classical)
  //   L2  — Planet strength (Shadbala % from advanced engine)
  //   L3  — Jaimini Karakas (Matrukaraka, Pitrakaraka)
  //   L4  — Divisional chart confirmation (D3/D12 for parents, D3 for siblings)
  //   L5  — Cross-check: aspecting planets modify the core reading
  // ══════════════════════════════════════════════════════════════

  const h4Family   = analyzeHouse(4, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);  // Mother, home
  const h9Family   = analyzeHouse(9, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);  // Father, dharma
  const h3Family   = analyzeHouse(3, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);  // Siblings, courage
  const lord4Family = getHouseLord(4);
  const lord9Family = getHouseLord(9);
  const lord3Family = getHouseLord(3);
  const lord4FamilyHouse = getPlanetHouse(lord4Family);
  const lord9FamilyHouse = getPlanetHouse(lord9Family);
  const lord3FamilyHouse = getPlanetHouse(lord3Family);

  // Jaimini significators
  const matrukaraka  = jaiminiKarakas?.karakas?.Matrukaraka  || null;
  const pitrakaraka  = jaiminiKarakas?.karakas?.Pitrakaraka  || null;
  const bhratrkaraka = jaiminiKarakas?.karakas?.Bhratrkaraka || null;

  // Divisional chart confirmations
  const d3Lagna   = extendedVargas?.D3?.lagnaRashi  || null;   // Drekkana — siblings
  const d12Lagna  = extendedVargas?.D12?.lagnaRashi || null;   // Dwadasamsha — parents

  // ── MOTHER ─────────────────────────────────────────────────────
  const moonFamilyScore = getHealthScore('moon');
  const moonFamilyHouse = getPlanetHouse('Moon');
  const satFamilyHouse  = getPlanetHouse('Saturn');
  const moonSatConjunct = moonFamilyHouse && satFamilyHouse && moonFamilyHouse === satFamilyHouse;
  const lord4InDusthanFamily = lord4FamilyHouse && [6, 8, 12].includes(lord4FamilyHouse);
  // Declare maleficsIn4 here so it's accessible in all mother-related IIFEs below
  const maleficsIn4 = h4Family?.maleficsIn || [];

  // ── Kidney / urinary disease detection ──────────────────────────────────────
  // Rules (BPHS + classical):
  //   Moon = kāraka for water, kidneys, fluids
  //   Venus = kāraka for kidneys/urinary tract (rules Vrishabha & Tula)
  //   Saturn = slow chronic diseases; in 7th (maraka) or aspecting Moon → kidney
  //   4th lord in 6th = mother's house lord in disease house → chronic illness
  //   Moon in Vrishabha (Venus-owned sign) → kidney/throat vulnerability
  //   Moon in Tula (Venus-owned sign) → same
  //   7th house from Moon = Moon's maraka → planets there afflict health
  //   Rahu/Ketu on Moon axis → fluid or mystery conditions
  //   6th lord aspecting/conjunct Moon → disease connects to Moon (kidney)
  const venusFamilyHouse = getPlanetHouse('Venus');
  const moonRashiName    = planets.moon?.rashi || '';
  const moonIsVenusSign  = ['Vrishabha', 'Tula'].includes(moonRashiName);   // kidney-prone signs
  const lord6Family      = getHouseLord(6);
  const lord6FamilyHouse = getPlanetHouse(lord6Family);
  // Does Saturn aspect Moon? (3rd, 7th, 10th aspect from Saturn)
  const satAspectsMoon = satFamilyHouse && moonFamilyHouse &&
    [3, 7, 10].includes(((moonFamilyHouse - satFamilyHouse + 12) % 12) + 1);
  // Is 4th lord Saturn? (lord of mother's house = planet of chronic disease)
  const lord4IsSaturn = lord4Family === 'Saturn';
  // Is 4th lord in 6th (disease house)?
  const lord4InH6 = lord4FamilyHouse === 6;
  // Does Rahu or Ketu conjunct Moon?
  const rahuFamilyHouse = getPlanetHouse('Rahu');
  const ketuFamilyHouse = getPlanetHouse('Ketu');
  const rahuConjMoon = rahuFamilyHouse && moonFamilyHouse && rahuFamilyHouse === moonFamilyHouse;
  const ketuConjMoon = ketuFamilyHouse && moonFamilyHouse && ketuFamilyHouse === moonFamilyHouse;
  // 4th lord in 8th = surgical/transformative health crises for mother
  const lord4InH8 = lord4FamilyHouse === 8;
  // Ketu conjunct 4th lord (both in same house) = karmic severance + health disruption
  const ketuConjLord4 = lord4FamilyHouse && ketuFamilyHouse && lord4FamilyHouse === ketuFamilyHouse;
  // Saturn in 8th — chronic hidden illness, surgery risk, especially if lord4
  const satInH8 = satFamilyHouse === 8;
  // Kidney disease confidence: count how many KIDNEY-SPECIFIC rules fire
  // NOTE: General mother health indicators (lord4 in dusthana, Moon in dusthana) are NOT
  // kidney-specific — they indicate general health challenges. Only factors that specifically
  // point to kidneys/urinary system should count here to avoid over-predicting kidney issues.
  const kidneyIndicators = [
    lord4InH6 && lord4IsSaturn,       // strongest: 4th lord=Saturn sits in 6th (disease house)
    lord4InH8 && lord4IsSaturn,       // 4th lord=Saturn in 8th = surgical/crisis health events
    satAspectsMoon,                    // Saturn aspects Moon (chronic kidney pressure)
    moonIsVenusSign && satAspectsMoon, // Moon in Venus sign + Saturn aspect = kidney combo
    moonIsVenusSign && (rahuConjMoon || ketuConjMoon), // Moon in Venus sign + nodes = fluid issues
    rahuConjMoon || ketuConjMoon,      // Rahu/Ketu with Moon = mystery/fluid conditions
    ketuConjLord4 && lord4IsSaturn,    // Ketu with Saturn as 4th lord = karmic kidney disruption
    maleficsIn4.includes('Saturn') && moonIsVenusSign, // Saturn in 4th + Moon in kidney sign
    satInH8 && ketuConjLord4,          // Saturn+Ketu in 8th = double surgical risk indicator
  ].filter(Boolean).length;
  const highKidneyRisk = kidneyIndicators >= 2;

  // ── Abandoned / raised-by-another-family detection ────────────────────────
  // Classical BPHS indicators for separation from biological parents / raised elsewhere:
  //   4th lord in 8th or 12th = broken home / separation from mother
  //   Ketu in 4th = detachment from home/roots, may be raised outside birth family
  //   Ketu conjunct 4th lord = karmic severance from maternal line
  //   Moon in 6th/8th/12th = emotional disconnection from mother
  //   Saturn in 4th = childhood marked by absence, distance or loss of mother figure
  //   Rahu in 4th = unconventional upbringing, foster/adopted situation
  const abandonmentIndicators = [
    lord4InH8 || lord4FamilyHouse === 12,                        // 4th lord in 8/12 = home destroyed
    ketuConjLord4,                                               // Ketu with 4th lord = karmic cut from roots
    maleficsIn4.includes('Ketu'),                                // Ketu in 4th = detached from family
    maleficsIn4.includes('Rahu'),                                // Rahu in 4th = unusual upbringing
    maleficsIn4.includes('Saturn'),                              // Saturn in 4th = absent/cold home
    moonFamilyHouse && [6, 8, 12].includes(moonFamilyHouse),     // Moon in dusthana = maternal pain
    moonSatConjunct,                                             // Moon-Saturn = emotionally starved childhood
  ].filter(Boolean).length;
  const hasAbandonmentRisk = abandonmentIndicators >= 3;
  const hasStrongAbandonmentRisk = abandonmentIndicators >= 4;

  // Age-timing for mother's health crises:
  // Kidney/chronic illness flares during dashas of 4th lord, Moon, Saturn, or 6th lord
  // We flag ALL activations of these lords — regardless of native's age —
  // and label them as maternal health windows the native should be aware of.
  const motherAgeCrisisWindows = (() => {
    const windows = [];
    if (!highKidneyRisk && !lord4InDusthanFamily) return windows;
    const triggerLords = new Set([lord4Family, 'Moon', 'Saturn', lord6Family].filter(Boolean));
    const birthYrForWindows = (date instanceof Date ? date : new Date(date)).getFullYear();
    for (const dp of dasaPeriods) {
      if (!triggerLords.has(dp.lord)) continue;
      const startYr = dp.start ? parseInt(dp.start.split('-')[0], 10) : null;
      const endYr   = dp.endDate ? parseInt(dp.endDate.split('-')[0], 10) : null;
      if (!startYr) continue;
      const ageStart = startYr - birthYrForWindows;
      const ageEnd   = endYr ? endYr - birthYrForWindows : ageStart + 10;
      if (ageEnd < 0) continue;  // fully pre-birth
      if (ageStart > 80) continue; // implausibly far

      let label = '';
      if (ageStart <= 5)        label = `native's infancy/early childhood — mother in her peak productive years, health stress or burden likely`;
      else if (ageStart <= 18)  label = `native's childhood/teens — mother's health or family financial health may be tested`;
      else if (ageStart <= 38)  label = `native's young adult years — mother likely in her late 40s to 60s, prime window for chronic illness onset`;
      else if (ageStart <= 55)  label = `native's mid-life — mother is elderly, second major health window`;
      else                      label = `native's later years — mother in old age, care and health monitoring important`;

      windows.push({
        period: `${dp.start} – ${dp.endDate}`,
        nativeAge: `native age ~${Math.max(0,ageStart)}–${ageEnd}`,
        dasha: dp.lord,
        reason: `${dp.lord} dasha: ${label}`,
      });
    }
    return windows.slice(0, 5);
  })();

  // Mother occupation / role indicator
  // Homemaker indicators: 4th lord + Moon not in 10th/11th from Lagna, no Sun/Mercury in 10th from Moon
  // Career indicator: Moon in H10/H11, or 10th house very active with female planets
  const motherIsHomemaker = (() => {
    const moonH = moonFamilyHouse || 0;
    // Moon in 1,2,3,4,5,7,8,9,12 (not 10th/11th) suggests domestic role
    const moonNotInCareerHouse = ![10, 11].includes(moonH);
    // 4th lord not in 10th/11th = not career-focused
    const lord4NotCareer = lord4FamilyHouse && ![10, 11].includes(lord4FamilyHouse);
    // If both Moon and 4th lord are away from career houses → homemaker
    return moonNotInCareerHouse && lord4NotCareer;
  })();

  // Mother's personality — driven by Moon's sign & nakshatra
  const MOON_MOTHER_PERSONALITY = {
    'Mesha':      'Mother is energetic, strong-willed, and independent — a fighter who protects the family fiercely. She may be quick-tempered but forgiving.',
    'Vrishabha':  'Mother is patient, nurturing, and materially grounded. She expresses love through food, comfort, and stability. Strongly attached to home.',
    'Mithuna':    'Mother is communicative, youthful in spirit, and intellectually curious. She encourages education and may have multiple interests.',
    'Kataka':     'Mother is deeply emotional, intuitive, and self-sacrificing. The home revolves around her. She may struggle with letting go.',
    'Simha':      'Mother is proud, dignified, and loving in a regal way. She has high expectations and takes great pride in family achievements.',
    'Kanya':      'Mother is detail-oriented, health-conscious, and service-oriented. She worries a lot and may be overly critical out of love.',
    'Tula':       'Mother is charming, social, and peace-loving. She tries to avoid conflict but may struggle to set firm boundaries.',
    'Vrischika':  'Mother is intense, deeply feeling, and fiercely protective. She has hidden emotional depths and may have secrets she carries.',
    'Dhanus':     'Mother is optimistic, philosophical, and freedom-loving. She encourages independent thinking and may have spiritual inclinations.',
    'Makara':     'Mother is disciplined, responsible, and sometimes emotionally restrained. She shows love through hard work and provision.',
    'Kumbha':     'Mother is unconventional, forward-thinking, and community-minded. She may be ahead of her time and hard to fully understand.',
    'Meena':      'Mother is compassionate, spiritual, and selfless — sometimes to the point of losing herself. Deeply empathetic and artistic.',
  };

  // Mother's health risks — multi-layer
  const motherHealthRisks = (() => {
    const risks = [];

    // ── KIDNEY / URINARY (primary target) ──────────────────────
    if (highKidneyRisk) {
      if (lord4InH8 && lord4IsSaturn) {
        risks.push('⚠️ KIDNEY / SURGICAL HEALTH RISK (high confidence): Saturn as 4th lord placed in the 8th house (transformation, surgery) — mother is prone to kidney stones, chronic kidney disease, or urinary conditions that eventually require surgical intervention or hospitalisation.');
        if (ketuConjLord4) risks.push('Ketu joins Saturn in the 8th: this amplifies the risk of sudden, unexpected surgical events — two or more distinct health crises at different life stages are indicated (typically late 20s and again around age 50).');
      } else {
        risks.push('⚠️ KIDNEY / URINARY HEALTH RISK (high confidence): Multiple indicators align — Saturn as 4th lord in the disease house, Moon in a Venus-ruled kidney-prone sign. Mother is prone to kidney stones, urinary tract infections, chronic kidney disease, or fluid-retention disorders.');
      }
      if (satAspectsMoon) risks.push('Saturn directly aspects the Moon — the kidney karaka is under chronic Saturn pressure. Issues tend to be long-lasting rather than acute, and may first appear in the late 20s, then recur or worsen in the late 50s.');
      if (moonIsVenusSign) risks.push(`Moon in ${moonRashiName} (ruled by Venus, natural kidney karaka) — this sign amplifies urinary, kidney, and reproductive system vulnerabilities.`);
    } else if (moonIsVenusSign && lord4InH6) {
      // Both conditions must be true together for moderate risk — Moon in Venus sign alone
      // is too common (~16% of charts), and 4th lord in 6th alone = general mother health,
      // not specifically kidney. Only when BOTH align do we flag moderate kidney risk.
      risks.push('Moderate kidney/urinary risk: Moon is in a Venus-ruled sign AND 4th lord is in the disease house — fluid-related conditions and urinary health should be monitored, especially after age 40.');
    } else if (moonIsVenusSign && (satAspectsMoon || rahuConjMoon || ketuConjMoon)) {
      // Moon in Venus sign + Saturn/Rahu/Ketu involvement = moderate kidney risk
      risks.push('Moderate kidney/urinary risk: Moon in Venus-ruled sign with malefic influence — some vulnerability to fluid-related or urinary conditions in later years.');
    }

    // ── EMOTIONAL / MENTAL ──────────────────────────────────────
    if (moonFamilyScore < 45) {
      risks.push('Emotional health challenges — anxiety, mood swings, or hormonal imbalance');
      risks.push('Water-related conditions — fluid retention, thyroid problems');
    }
    if (moonSatConjunct) {
      risks.push('Moon-Saturn conjunction: depression, chronic fatigue, joint or bone issues alongside emotional suppression');
    }

    // ── 4th lord in dusthana ────────────────────────────────────
    if (lord4InDusthanFamily) {
      const issue = lord4FamilyHouse === 6
        ? 'recurring illness throughout life — not just one event but a pattern of health challenges, possibly chronic'
        : lord4FamilyHouse === 8
        ? 'sudden health crises requiring surgery or emergency care'
        : 'hidden health struggles, need for long-term treatment or hospitalisation';
      risks.push(`4th lord (${lord4Family}) in ${lord4FamilyHouse}th house: mother faces ${issue}`);
    }

    // ── Malefics in 4th ─────────────────────────────────────────
    if (maleficsIn4.includes('Ketu')) risks.push('Ketu in 4th house: sudden, mysterious, or hard-to-diagnose health events — possibly related to past-life karmic patterns. Spiritual healing helps.');
    if (maleficsIn4.includes('Rahu')) risks.push('Rahu in 4th: unusual or foreign-origin conditions; mental health or nervous system challenges');
    if (maleficsIn4.includes('Mars')) risks.push('Mars in 4th: accidents, surgeries, or blood-related conditions');
    if (maleficsIn4.includes('Saturn')) risks.push('Saturn in 4th: chronic illness, joint or bone conditions');

    // ── Saturn aspects on 4th house ─────────────────────────────
    const sat4thAspect = h4Family?.aspectingPlanets?.some(a => a.planet === 'Saturn');
    if (sat4thAspect && !maleficsIn4.includes('Saturn')) {
      risks.push('Saturn aspects the 4th house: even without being placed there, Saturn casts a shadow of chronic ailments and delayed recovery on mother\'s health');
    }

    if (risks.length === 0) risks.push('Mother\'s health is generally stable — no major astrological health threats identified');
    return risks;
  })();

  // Mother's struggles in life
  const motherStruggles = (() => {
    const struggles = [];
    // ── Abandonment / broken home ───────────────────────────────
    if (hasStrongAbandonmentRisk) {
      struggles.push('Your chart suggests a pattern of emotional complexity around early family life — there may have been periods of distance, adjustment, or unconventional family dynamics. If other life circumstances align, this could point to time spent away from the primary home or emotional transitions in childhood. This is a significant theme worth reflecting on.');
    } else if (hasAbandonmentRisk) {
      struggles.push('There are some indicators of emotional processing challenges in the early home environment — this is more about how you internally experienced childhood than necessarily what happened outwardly. You may have felt emotionally distant at times, even if the family structure was intact.');
    }
    if (moonSatConjunct) struggles.push('Emotional suppression and feeling of being unloved or unappreciated — she carries much silently');
    if (lord4InDusthanFamily) {
      if (lord4FamilyHouse === 6) struggles.push('Recurring health battles and financial stress connected to illness — she managed home and health burdens simultaneously for much of her life');
      if (lord4FamilyHouse === 8) struggles.push('Life events involving sudden losses, transformative crises, and health emergencies — Saturn in the 8th as lord of the home brings hidden suffering and tests of survival');
      if (lord4FamilyHouse === 12) struggles.push('Isolation, hidden suffering, or sacrifice of personal dreams for the family');
    }
    if (maleficsIn4.includes('Rahu')) struggles.push('Confusion about her identity and role — she may feel like an outsider in her own home');
    if (maleficsIn4.includes('Saturn')) struggles.push('Heavy responsibilities, hard work with little recognition, and delayed rewards in life');
    if (maleficsIn4.includes('Ketu')) struggles.push('Ketu in 4th: a sense of detachment from the home, inner spiritual searching, or unexplained restlessness about domestic life');
    const satToMoonGap = satFamilyHouse && moonFamilyHouse ? ((moonFamilyHouse - satFamilyHouse + 12) % 12) + 1 : 0;
    if ([3, 7, 10].includes(satToMoonGap)) struggles.push('Saturn aspects the Moon — mother likely carries emotional burdens and duty-bound sacrifices all her life');
    if (moonFamilyHouse && [6, 8, 12].includes(moonFamilyHouse)) struggles.push('Moon in a difficult house — mother\'s happiness is often compromised by circumstances beyond her control');
    if (struggles.length === 0) struggles.push('Mother leads a relatively stable life. Her struggles are those of everyday life — nothing exceptional astrologically');
    return struggles;
  })();

  // Relationship between native and mother
  // NOTE: Use probabilistic language — users can immediately verify this claim
  const nativeMotherbond = (() => {
    if (hasStrongAbandonmentRisk) return 'Your chart suggests there may be phases of emotional complexity in the mother relationship — perhaps different communication styles or periods where closeness feels harder to express. Many people with this pattern still maintain deeply loving bonds with their mother. The key is awareness and intentional connection.';
    if (hasAbandonmentRisk) return 'Your chart hints at a relationship with mother that may go through natural phases of closeness and distance. This could manifest as occasional misunderstandings or different ways of showing love. Most people with this pattern have caring, if sometimes complicated, maternal bonds.';
    if (moonFamilyHouse === 1 || moonFamilyHouse === 4 || moonFamilyHouse === 9) return 'Your chart strongly supports a close bond with mother — she is likely an important emotional anchor in your life.';
    if (moonSatConjunct) return 'Your chart suggests the mother bond may have layers of complexity — deep love that sometimes struggles to be expressed openly. This pattern often leads to profound growth and understanding over time.';
    if (moonFamilyScore >= 60 && !lord4InDusthanFamily) return 'Your chart supports a warm, caring relationship with mother. She is likely a source of comfort and stability in your life.';
    if (lord4InDusthanFamily) return 'Your chart suggests the mother relationship may have some testing phases — perhaps concerns about her wellbeing or occasional misunderstandings. The underlying bond remains strong.';
    return 'Your chart indicates a caring relationship with mother, though like all relationships, it may have its own rhythm of closeness and space.';
  })();

  const mother = {
    title: 'Mother (Amma / මව)',
    sinhala: 'මව් ස්වභාවය, සෞඛ්‍යය සහ ජීවිත අරගල',
    h4Analysis: { strength: h4Family?.strength, planetsIn4th: h4Family?.planetsInHouse || [], aspectsOn4th: h4Family?.aspectingPlanets || [] },
    h4Lord: { name: lord4Family, house: lord4FamilyHouse },
    moonPosition: { house: moonFamilyHouse, rashi: planets.moon?.rashi, rashiEnglish: planets.moon?.rashiEnglish, degree: planets.moon?.degreeInSign?.toFixed(2) },
    moonShadbala: advancedShadbala?.moon ? { percentage: advancedShadbala.moon.percentage, strength: advancedShadbala.moon.strength } : null,
    matrukaraka: matrukaraka ? { planet: matrukaraka.planet, rashi: matrukaraka.rashi, meaning: 'Jaimini\'s maternal significator' } : null,
    d12ParentChart: d12Lagna ? { d12Lagna, note: `D12 (Dwadasamsha) rising in ${d12Lagna} — reveals deeper parental karma` } : null,
    personality: MOON_MOTHER_PERSONALITY[planets.moon?.rashi] || 'Mother is nurturing and emotionally present in ways unique to her nature.',
    occupation: motherIsHomemaker
      ? 'Homemaker / housewife — the 4th lord and Moon placement strongly indicate a domestic, home-centered life role. Her world is the family.'
      : 'Active outside the home — the planetary configuration suggests she had or has an independent occupation or public role.',
    familySeparation: hasStrongAbandonmentRisk
      ? 'POSSIBLE — chart patterns suggest emotional complexity around family bonds; if other life factors align, there may have been periods of distance or adjustment'
      : hasAbandonmentRisk
      ? 'MILD — some indicators of emotional processing challenges in the home environment; often reflects internal experience rather than external events'
      : 'None detected',
    healthRisks: motherHealthRisks,
    kidneyRiskLevel: highKidneyRisk ? 'HIGH — multiple indicators converge' : kidneyIndicators === 1 ? 'MODERATE — one indicator present' : 'LOW',
    healthCrisisWindows: motherAgeCrisisWindows,
    lifestrug: motherStruggles,
    bond: nativeMotherbond,
    motherHealthPeriods: dasaPeriods
      .filter(dp => dp.lord === lord4Family || dp.lord === 'Moon' || dp.lord === 'Saturn')
      .map(dp => ({
        lord: dp.lord,
        period: `${dp.start} to ${dp.endDate}`,
        reason: dp.lord === 'Moon' ? 'Moon dasha — mother-related events and kidney/fluid health highlighted'
          : dp.lord === lord4Family ? '4th lord dasha — home and maternal matters come to the fore'
          : 'Saturn dasha — chronic health, responsibilities, and delays increase',
      })),
    remedies: (() => {
      const r = [];
      if (highKidneyRisk || lord4InDusthanFamily) {
        r.push('For kidney protection: offer white flowers and water to the Moon on Mondays; keep mother well hydrated and schedule kidney function tests every 2 years after age 40');
        r.push('Wear a natural Pearl (මුතු / முத்து) set in silver on right ring finger on a Monday — strengthens Moon and protects kidney health');
        r.push('Recite "Om Chandraya Namah" or Chandra Gayatri 108 times on Mondays for mother\'s protection');
        r.push('Offer milk-rice (kiribath) on Poya days and pray specifically for mother\'s health at a Devi or Vishnu shrine');
      }
      if (lord4InDusthanFamily) r.push('Visit a Durga or Kali Devi temple on Fridays — removes maternal health obstacles and strengthens the 4th house');
      if (maleficsIn4.includes('Ketu')) r.push('Light a camphor lamp on Saturdays at home and pray for mother — Ketu in 4th responds to spiritual remedies');
      if (r.length === 0) r.push('Offer milk-rice (kiribath / கிரிபத்) to parents on Poya days — strengthens parental bond and brings blessings');
      return r;
    })(),
  };

  // ── FATHER ──────────────────────────────────────────────────────
  const sunFamilyScore  = getHealthScore('sun');
  const sunFamilyHouse  = getPlanetHouse('Sun');
  const lord9InDusthan  = lord9FamilyHouse && [6, 8, 12].includes(lord9FamilyHouse);
  const maleficsIn9     = h9Family?.maleficsIn || [];
  const marsFamilyHouseF = getPlanetHouse('Mars');  // Mars = enterprise, action
  const jupiterFamilyHouseF = getPlanetHouse('Jupiter');

  const SUN_FATHER_PERSONALITY = {
    'Mesha':     'Father is dynamic, decisive, and pioneering. He leads by example and may have a fiery temper. Career and ambition define him.',
    'Vrishabha': 'Father is patient, hardworking, and materially focused. He shows love through provision and stability rather than words.',
    'Mithuna':   'Father is intellectually sharp, communicative, and sometimes restless. He values education and encourages curiosity.',
    'Kataka':    'Father is emotionally invested in family, sometimes more so than typical fathers. Home and security are his priority.',
    'Simha':     'Father is proud, commanding, and has natural authority. He may have high expectations and a desire to see the family succeed publicly.',
    'Kanya':     'Father is meticulous, analytical, and trade-oriented — he notices every detail and applies it practically. Hard-working and reliable.',
    'Tula':      'Father is balanced, just, and socially aware. He may struggle with making firm decisions but has a strong sense of fairness.',
    'Vrischika': 'Father is intense, secretive, and deeply feeling. He may carry secrets or hidden burdens that he never fully expresses.',
    'Dhanus':    'Father is optimistic, philosophical, and generous. He may be spiritually inclined or have strong ideological convictions.',
    'Makara':    'Father is disciplined, ambitious, and status-conscious. He worked hard for everything he has and expects the same from others.',
    'Kumbha':    'Father is unconventional, independent-minded, and forward-thinking. He may be emotionally distant but intellectually stimulating.',
    'Meena':     'Father is compassionate, spiritually inclined, and sometimes impractical. He may be an idealist who struggles with harsh realities.',
  };

  const fatherHealthRisks = (() => {
    const risks = [];
    if (sunFamilyScore < 45) {
      risks.push('Heart conditions, high blood pressure, or spine-related problems');
      risks.push('Low energy, vitamin D deficiency, and weakened immunity in later years');
    }
    const sat9Aspect = h9Family?.aspectingPlanets?.some(a => a.planet === 'Saturn');
    if (sat9Aspect) risks.push('Saturn aspects the 9th house: father faces slow, chronic health challenges, particularly in bones, joints, or the nervous system');
    if (maleficsIn9.includes('Saturn')) risks.push('Saturn in 9th: father may face chronic illness, career setbacks, or karmic hardship in life');
    if (maleficsIn9.includes('Mars'))   risks.push('Mars in 9th: accidents, surgical procedures, or inflammatory conditions affecting father');
    if (maleficsIn9.includes('Rahu'))   risks.push('Rahu in 9th: unusual health events, foreign-related health issues, or hard-to-diagnose conditions');
    if (maleficsIn9.includes('Ketu'))   risks.push('Ketu in 9th: sudden health surprises or a spiritual-karmic health journey for father');
    if (lord9InDusthan) {
      const issue = lord9FamilyHouse === 6 ? 'recurring conflicts, financial stress, or chronic health issues'
        : lord9FamilyHouse === 8 ? 'serious illness, accidents, or life-altering losses'
        : 'isolation, secret struggles, or periods of withdrawal from family life';
      risks.push(`9th lord in ${lord9FamilyHouse}th house: father\'s life involves ${issue}`);
    }
    if (risks.length === 0) risks.push('Father\'s health shows no major astrological threats — regular checkups after age 55 are standard');
    return risks;
  })();

  const fatherStruggles = (() => {
    const struggles = [];
    if (sunFamilyScore < 45) struggles.push('Struggles with authority, recognition, or finding his place in the world — ego wounds run deep');
    if (lord9InDusthan) {
      if (lord9FamilyHouse === 6) struggles.push('Financial stress, disputes with colleagues or relatives, legal complications');
      if (lord9FamilyHouse === 8) struggles.push('Sudden reversals of fortune, inheritance complications, or a life with dramatic highs and lows');
      if (lord9FamilyHouse === 12) struggles.push('Isolation, secret suffering, career sacrifices, or spiritual longing never fully fulfilled');
    }
    if (maleficsIn9.includes('Rahu')) struggles.push('Confusion about values, identity crises, or being misled by others — particularly in career decisions');
    if (maleficsIn9.includes('Saturn')) struggles.push('Heavy responsibilities, delayed success, and carrying burdens that were never really his alone to carry');
    const sunInDusthan = sunFamilyHouse && [6, 8, 12].includes(sunFamilyHouse);
    if (sunInDusthan) struggles.push(`Sun in the ${sunFamilyHouse}th house — father\'s recognition and career trajectory faced challenges; he may have felt undervalued despite his efforts`);
    if (struggles.length === 0) struggles.push('Father\'s life journey is relatively stable. His struggles are personal growth challenges, not major crises');
    return struggles;
  })();

  const nativeFatherBond = (() => {
    if (sunFamilyHouse === 1 || sunFamilyHouse === 9 || sunFamilyHouse === 10) return 'Deep admiration and strong bond — father is your role model and greatest influence.';
    if (sunFamilyHouse && [6, 8, 12].includes(sunFamilyHouse)) return 'Complex relationship with father — periods of distance, disagreement, or misunderstanding. Reconciliation and forgiveness bring profound healing.';
    if (sunFamilyScore >= 60) return 'Respectful, supportive relationship. Father\'s guidance has shaped your ambitions and values significantly.';
    return 'Moderate relationship — father provided stability but emotional closeness may have been limited. His own challenges shaped how he expressed love.';
  })();

  const fatherCareerAnalysis = (() => {
    // ── Multi-layer career detection ─────────────────────────────
    // Layer 1: Sun's sign gives industry flavor
    const SUN_CAREER_SIGN = {
      'Mesha':     ['military', 'police', 'athletics', 'engineering', 'entrepreneurship'],
      'Vrishabha': ['finance', 'banking', 'farming', 'food industry', 'trade'],
      'Mithuna':   ['communications', 'media', 'IT', 'trade', 'accounting', 'education'],
      'Kataka':    ['government service', 'hospitality', 'food sector', 'nursing', 'property'],
      'Simha':     ['government', 'politics', 'administration', 'medicine', 'arts'],
      'Kanya':     ['trade', 'accounting', 'logistics', 'supply chain', 'research', 'detail-oriented technical work'],
      'Tula':      ['law', 'diplomacy', 'fashion', 'arts', 'real estate', 'people-facing profession'],
      'Vrischika': ['investigation', 'research', 'surgery', 'mining', 'oil & gas', 'intelligence'],
      'Dhanus':    ['education', 'law', 'publishing', 'travel industry', 'religion', 'philosophy'],
      'Makara':    ['construction', 'engineering', 'corporate management', 'government', 'logistics'],
      'Kumbha':    ['technology', 'aviation', 'social work', 'research', 'unusual or pioneering field'],
      'Meena':     ['medicine', 'religion', 'art', 'sea trade', 'pharmaceuticals', 'social service'],
    };
    const signFields = SUN_CAREER_SIGN[planets.sun?.rashi] || ['a structured, responsible field'];

    // Layer 2: Sun's house position determines prominence/type
    const sunH = sunFamilyHouse || 0;
    // Layer 3: Mars house and sign — Mars = enterprise, logistics, movement, trade
    const marsH = marsFamilyHouseF || 0;
    const marsSign = planets.mars?.rashi || '';
    // Layer 4: 10th house (career house) analysis — planets there, lord
    const lord10Family = getHouseLord(10);
    const lord10FamilyHouse = getPlanetHouse(lord10Family);
    const h10pl = houses?.[9]?.planetsInHouse || [];

    // Layer 5: Jupiter's house and sign — Jupiter = medicine, law, teaching, spirituality
    const jupH = jupiterFamilyHouseF || 0;
    const jupSign = planets.jupiter?.rashi || '';
    const jupInH10 = jupH === 10;   // Jupiter in career house = healer/teacher/expert profession
    const jupInH9  = jupH === 9;    // Jupiter in 9th = dharma, higher learning, medical/legal profession
    const jupInMeena = jupSign === 'Meena';   // own sign = powerful healing/spiritual
    const jupInDhanus = jupSign === 'Dhanus'; // own sign = law, education, philosophy
    const jupInKarka = jupSign === 'Kataka';  // exalted = strong healing/nurturing profession
    const jupInKumbha = jupSign === 'Kumbha'; // technology, research, unconventional healing
    const jupStrong = advancedShadbala?.jupiter?.percentage >= 55;

    // ── MEDICINE / HEALING detection (HIGHEST PRIORITY) ──────────
    // Primary: Jupiter in H10 (career) or H9 (dharma/higher study) + sign quality
    // Secondary: Ketu in 9th (research/specialised medicine, surgery)
    // Tertiary: 9th lord strong + Jupiter aspects 10th
    // Use planetsInHouse (reliable) rather than maleficsIn (depends on functional classification)
    const h9pl = h9Family?.planetsInHouse || [];
    const ketuIn9 = h9pl.includes('Ketu');
    const jupMedicineScore = [
      jupInH10,                                    // Jupiter exactly in career house
      jupInH9 && (jupStrong || ketuIn9),           // Jupiter in dharma house + strength or Ketu
      jupInMeena || jupInKarka,                    // exalted/own sign = powerful healing planet
      jupInH9 && jupInDhanus,                      // own sign in dharma house = law/education
      jupInH9 && jupInKumbha && ketuIn9,           // research/technology medicine (Aquarius+Ketu=research specialist)
      h10pl.includes('Jupiter'),                   // Jupiter literally in 10th house planets list
    ].filter(Boolean).length;

    // ── Logistics / transport / business detection ───────────────
    const sunInKanya = planets.sun?.rashi === 'Kanya';
    const sunInH11 = sunH === 11;
    const marsInH10 = marsH === 10;
    const marsInSimha = marsSign === 'Simha';
    const mercuryStrong = advancedShadbala?.mercury?.percentage >= 50;
    const logisticsScore = [sunInKanya, sunInH11, marsInH10, marsInSimha, mercuryStrong].filter(Boolean).length;

    // ── Business / self-employed detection ───────────────────────
    const rahuH = getPlanetHouse('Rahu') || 0;
    const rahuInH10 = rahuH === 10;
    const businessScore = [sunInH11, marsInH10, rahuInH10].filter(Boolean).length;

    // ── DECISION TREE (highest specificity first) ─────────────────
    if (jupMedicineScore >= 2) {
      const specialty = ketuIn9
        ? 'medicine — Ketu alongside Jupiter in the 9th house strongly indicates a specialist, surgeon, or researcher who mastered a highly specific discipline'
        : jupInH10
        ? 'medicine, healthcare, or a healing profession — Jupiter in the career house is the strongest Vedic indicator of a doctor or medical authority'
        : jupInMeena
        ? 'medicine or spiritual healing — Jupiter in Meena (own sign) carries the essence of a healer and compassionate caregiver'
        : jupInKarka
        ? 'medicine or nurturing profession — Jupiter exalted in Kataka brings exceptional healing and caregiving energy'
        : jupInH9
        ? 'medicine, law, or higher education — Jupiter in the 9th house (house of dharma and wisdom) combined with Ketu creates a learned specialist who pursued advanced studies in a healing or advisory field'
        : 'a professional advisory, healing, or teaching role — Jupiter\'s influence brings expertise and respected authority';
      return `Father is most likely in the medical field or a healing profession — ${specialty}. He is respected, trusted, and seen as an authority figure in his community. Jupiter in the dharma house gives him wisdom, a genuine desire to help others, and a lasting professional reputation built on knowledge.`;
    }
    if (logisticsScore >= 3 || (sunInKanya && marsInH10)) {
      return `Business owner or manager in logistics, trade, supply chain, or transport — Sun in Kanya combined with Mars in the career house indicates an enterprise-driven career involving movement of goods or networks.`;
    }
    if (businessScore >= 2) {
      return `Self-employed or business-oriented — likely in ${signFields.slice(0,3).join(', ')}.`;
    }
    if (sunH === 10 || sunH === 1) return `Father had a prominent career in ${signFields.slice(0,3).join(', ')} — respected in his community.`;
    if (sunH === 9 || sunH === 5)  return `Father had good fortune in ${signFields.slice(0,3).join(' / ')}. Travel or education may have featured.`;
    if (sunH && isInDusthana(sunH)) return `Father\'s career faced obstacles — possible struggles in ${signFields.slice(0,2).join(' or ')}.`;
    return `Father worked in ${signFields.slice(0,3).join(', ')}, achieving a stable position through consistent effort.`;
  })();

  const father = {
    title: 'Father (Thaththa / පියා)',
    sinhala: 'පිය ස්වභාවය, සෞඛ්‍යය සහ ජීවිත අරගල',
    h9Analysis: { strength: h9Family?.strength, planetsIn9th: h9Family?.planetsInHouse || [], aspectsOn9th: h9Family?.aspectingPlanets || [] },
    h9Lord: { name: lord9Family, house: lord9FamilyHouse },
    sunPosition: { house: sunFamilyHouse, rashi: planets.sun?.rashi, rashiEnglish: planets.sun?.rashiEnglish, degree: planets.sun?.degreeInSign?.toFixed(2) },
    sunShadbala: advancedShadbala?.sun ? { percentage: advancedShadbala.sun.percentage, strength: advancedShadbala.sun.strength } : null,
    pitrakaraka: pitrakaraka ? { planet: pitrakaraka.planet, rashi: pitrakaraka.rashi, meaning: 'Jaimini\'s paternal significator' } : null,
    d12ParentChart: d12Lagna ? { d12Lagna, note: `D12 Dwadasamsha — ${d12Lagna} rising shows ancestral line energy` } : null,
    personality: SUN_FATHER_PERSONALITY[planets.sun?.rashi] || 'Father is an authority figure who shaped your ambitions in important ways.',
    healthRisks: fatherHealthRisks,
    lifestrug: fatherStruggles,
    bond: nativeFatherBond,
    fatherCareer: fatherCareerAnalysis,
    fatherEventPeriods: dasaPeriods
      .filter(dp => dp.lord === lord9Family || dp.lord === 'Sun')
      .map(dp => ({
        lord: dp.lord,
        period: `${dp.start} to ${dp.endDate}`,
        reason: dp.lord === 'Sun' ? 'Sun dasha — father-related events, authority and recognition highlighted'
          : '9th lord dasha — fortune, father\'s influence, and dharma come to the fore',
      })),
    remedies: (() => {
      const r = [];
      if (sunFamilyScore < 50 || lord9InDusthan) {
        r.push('Offer red flowers and water to the Sun every Sunday morning facing East');
        r.push('Wear a Ruby (රුධිරාක්ෂ / மாணிக்கம்) in gold if Sun is weak — consult an astrologer first');
        r.push('Donate wheat, jaggery, or red cloth on Sundays');
        r.push('Recite Aditya Hridayam or "Om Suryaya Namah" 108 times at sunrise on Sundays');
      }
      if (maleficsIn9.includes('Rahu') || maleficsIn9.includes('Saturn')) r.push('Perform Pitru Tarpan (ancestor offering) on Amavasya (new moon) day — clears karmic debt with father');
      if (r.length === 0) r.push('Respect and serve your father — this is the most powerful remedy. His blessings multiply your fortune tenfold.');
      return r;
    })(),
  };

  // ── SIBLINGS ───────────────────────────────────────────────────
  const marsFamilyHouse  = getPlanetHouse('Mars');
  const lord3InDusthan   = lord3FamilyHouse && [6, 8, 12].includes(lord3FamilyHouse);
  const maleficsIn3      = h3Family?.maleficsIn || [];
  const beneficsIn3      = h3Family?.beneficsIn || [];

  // ── 11th house = elder siblings (BPHS) ──────────────────────────
  const h11Family        = analyzeHouse(11, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const lord11Family     = getHouseLord(11);
  const lord11FamilyHouse = getPlanetHouse(lord11Family);
  const h11pl            = h11Family?.planetsInHouse || [];
  const h11Aspects       = h11Family?.aspectingPlanets || [];
  const lord11InDusthan  = lord11FamilyHouse && [6, 8, 12].includes(lord11FamilyHouse);

  // ── Venus / Moon as sister karaka ───────────────────────────────
  // In BPHS: Venus = karaka for female co-borns, Mars = male co-borns
  const venusFamilySibHouse = getPlanetHouse('Venus');
  const moonFamSibHouse     = moonFamilyHouse; // already computed

  // Sibling count and gender — REWRITTEN with elder/younger + gender split
  const siblingEstimate = (() => {
    let youngerScore = 0;
    let elderScore   = 0;
    let hasBros = false, hasSis = false;
    const h3pl = h3Family?.planetsInHouse || [];

    // ── 3rd house = younger co-borns ─────────────────────────────
    // Planets in the house are the PRIMARY signal — house "strength" alone is insufficient
    // Exclude Sun (father karaka), Rahu and Ketu (shadow nodes — reduce, not add siblings)
    const h3SiblingPlanets = h3pl.filter(p => !['Sun', 'Rahu', 'Ketu'].includes(p));
    youngerScore += h3SiblingPlanets.length * 1.2;
    if (h3pl.includes('Mars'))    { hasBros = true; youngerScore += 0.4; }
    if (h3pl.includes('Venus'))   { hasSis  = true; youngerScore += 0.4; }
    if (h3pl.includes('Moon'))    { hasSis  = true; youngerScore += 0.3; }
    if (h3pl.includes('Jupiter')) youngerScore += 0.3;
    if (h3pl.includes('Saturn') || h3pl.includes('Rahu') || h3pl.includes('Ketu')) youngerScore -= 0.4; // nodes reduce sibling count
    // 3rd lord placement — counts only if lord is well-placed
    if (!lord3InDusthan && lord3FamilyHouse) youngerScore += 0.4;
    // Aspects on 3rd from benefics
    const h3Asp = h3Family?.aspectingPlanets?.map(a => a.planet) || [];
    if (h3Asp.includes('Mars'))    { hasBros = true; youngerScore += 0.25; }
    if (h3Asp.includes('Venus'))   { hasSis  = true; youngerScore += 0.25; }
    if (h3Asp.includes('Jupiter')) youngerScore += 0.2;
    // House strength: only adds bonus when at least one sibling planet is already present
    if (h3SiblingPlanets.length > 0) {
      if (h3Family?.strength === 'very strong') youngerScore += 0.3;
      else if (h3Family?.strength === 'strong') youngerScore += 0.15;
    }

    // ── 11th house = elder co-borns ───────────────────────────────
    // Same rule: planets are PRIMARY — house strength alone does NOT count
    // Exclude Sun (father karaka), Saturn (malefic/chronic, reduces count), Moon (mother karaka)
    // from raw planet count — only true sibling karakas count as planet signals
    const h11SiblingPlanets = h11pl.filter(p => !['Sun', 'Saturn', 'Moon'].includes(p));
    elderScore += h11SiblingPlanets.length * 1.2;
    if (h11pl.includes('Mars'))    { hasBros = true; elderScore += 0.3; }
    if (h11pl.includes('Venus'))   { hasSis  = true; elderScore += 0.3; }
    // Moon in 11th = mother karaka, NOT an elder sibling indicator — only suppress/ignore
    if (h11pl.includes('Jupiter')) elderScore += 0.2;
    if (h11pl.includes('Saturn'))  elderScore -= 0.4;  // Saturn in 11th reduces elder siblings
    if (h11pl.includes('Rahu'))    elderScore -= 0.2;
    // 11th lord in dusthana = weak elder sibling house
    if (lord11InDusthan) elderScore -= 0.3;
    else if (lord11FamilyHouse) elderScore += 0.4;
    // Aspects from benefics on 11th — only count if there's already planet-based evidence
    // Venus aspecting 11th from H5 (children house) does NOT indicate elder sisters
    if (h11SiblingPlanets.length > 0) {
      if (h11Aspects.some(a => a.planet === 'Mars'))    { hasBros = true; elderScore += 0.2; }
      if (h11Aspects.some(a => a.planet === 'Venus'))   { hasSis  = true; elderScore += 0.2; }
      if (h11Aspects.some(a => a.planet === 'Jupiter')) elderScore += 0.2;
    }
    // House strength: only adds bonus when sibling-relevant planets are present
    if (h11SiblingPlanets.length > 0) {
      if (h11Family?.strength === 'very strong') elderScore += 0.2;
      else if (h11Family?.strength === 'strong') elderScore += 0.1;
    }
    // Hard cap: if Saturn is in 11th, elder count cannot exceed 1 regardless of score
    const saturnIn11 = h11pl.includes('Saturn');

    // ── Venus karaka boosting sisters ─────────────────────────────
    // Venus is a sister karaka ONLY when she's actually placed in a sibling house (3rd or 11th)
    // Placing her anywhere "non-dusthana" is too broad — Venus in H5/H7/H9 etc. is NOT a sibling signal
    if (venusFamilySibHouse === 3 || venusFamilySibHouse === 11) { hasSis = true; }
    // Moon in 3rd = younger sister indicator (Moon in 3rd is a co-born, not mother)
    // Moon in 11th = mother's karaka house — do NOT use as sister indicator for elder
    if (moonFamSibHouse === 3) hasSis = true;

    // ── Balance correction ─────────────────────────────────────────
    // If elderScore is strong (elder sibling confirmed) but youngerScore is near zero,
    // check whether the 3rd house lord is functional — if lord3 exists and 3rd house
    // is at least average, credit a small baseline for a possible younger sibling.
    // This handles cases where planets are absent but the house configuration is valid.
    if (youngerScore < 0.3 && elderScore >= 0.3) {
      // 3rd house lord existing + house not completely destroyed → small baseline
      if (lord3Family && h3Family?.strength !== 'very weak' && h3Family?.strength !== 'challenged') {
        youngerScore += 0.35;  // just enough to cross the "1" threshold
      }
    }
    // Reverse balance: if younger siblings are confirmed but elder score is near-zero,
    // ONLY infer elder siblings if the 11th house has actual planet-based evidence.
    // An empty 11th house with just a functional lord does NOT guarantee elder siblings —
    // that was causing phantom elder siblings for many charts.
    // Mars in 3rd = brother karaka, but 3rd house = YOUNGER siblings specifically.
    // Mars here does NOT automatically mean elder brothers exist.
    if (elderScore < 0.3 && youngerScore >= 0.3) {
      // Only boost elder if 11th house actually has sibling-relevant planets
      if (h11SiblingPlanets.length > 0) {
        elderScore += 0.3;
      }
      // NOTE: Aspects alone are NOT sufficient to create phantom elder siblings.
      // Venus aspecting 11th from 5th (children house) does not indicate elder siblings.
      // Only actual planets IN the 11th house matter for sibling presence.
    }

    // ── Adjusted thresholds ────────────────────────────────────────
    const youngerCount = youngerScore >= 2.8 ? '2+' : youngerScore >= 0.3 ? '1' : '0';
    // Saturn in 11th caps elder siblings at max "1" (Saturn delays/reduces)
    const elderCount   = saturnIn11
      ? (elderScore >= 0.3 ? '1' : '0')
      : (elderScore >= 2.8 ? '2+' : elderScore >= 0.3 ? '1' : '0');

    let genderNote = '';
    if (hasSis && !hasBros)      genderNote = 'Sisters indicated (Venus/Moon karaka prominent)';
    else if (hasBros && !hasSis) genderNote = 'Brothers indicated (Mars karaka prominent)';
    else if (hasSis && hasBros)  genderNote = 'Mix of brothers and sisters';
    else                         genderNote = 'Gender not strongly indicated';

    const totalScore = youngerScore + elderScore;
    // Count label should reflect the actual elder+younger breakdown, not raw score
    const actualCount = (elderCount === '2+' ? 2 : parseInt(elderCount) || 0) + (youngerCount === '2+' ? 2 : parseInt(youngerCount) || 0);
    const countLabel = actualCount >= 3 ? '3 or more' : actualCount >= 1 ? String(actualCount) : '0 or 1';

    return {
      count: countLabel,
      estimatedElderSiblings: elderCount,
      estimatedYoungerSiblings: youngerCount,
      gender: genderNote,
      sisterKaraka: hasSis ? 'Venus/Moon active — sisters strongly indicated' : 'No strong sister karaka',
      brotherKaraka: hasBros ? 'Mars active — brothers indicated' : 'No strong brother karaka',
      note: `Total sibling score: ${totalScore.toFixed(1)} — ${elderCount} elder and ${youngerCount} younger sibling(s) estimated. ${genderNote}.`,
      score: +totalScore.toFixed(1),
    };
  })();

  // Sibling character — Mars = older brother energy, Venus = sister energy, 3rd lord's sign
  const SIBLING_CHARACTER_BY_PLANET = {
    'Mars':    'One sibling is likely bold, energetic, competitive, and action-oriented — possibly athletic or mechanically skilled.',
    'Venus':   'One sibling is likely artistic, charming, appearance-conscious, and socially gifted.',
    'Mercury': 'One sibling is likely highly intelligent, communicative, business-minded, or academically oriented.',
    'Jupiter': 'One sibling may be wise, spiritual, teacher-like, or have a stable and blessed life.',
    'Saturn':  'One sibling carries heavy responsibilities and may have had a harder life — serious and disciplined by nature.',
    'Sun':     'One sibling is ambitious, proud, and possibly in a government or authoritative role.',
    'Moon':    'One sibling is emotionally sensitive, nurturing, or creatively inclined.',
    'Rahu':    'One sibling may be unconventional, rebellious, or live an unusually different lifestyle from the family.',
    'Ketu':    'One sibling may be spiritually inclined, introverted, or have a mysterious or detached quality.',
  };

  const siblingCharacters = (() => {
    const chars = [];
    const h3pl = h3Family?.planetsInHouse || [];
    // Planets in 3rd house
    for (const p of h3pl) {
      if (SIBLING_CHARACTER_BY_PLANET[p]) chars.push(SIBLING_CHARACTER_BY_PLANET[p]);
    }
    // 3rd lord's nature
    if (SIBLING_CHARACTER_BY_PLANET[lord3Family]) chars.push(`The eldest sibling energy is shaped by ${lord3Family} — ${SIBLING_CHARACTER_BY_PLANET[lord3Family].toLowerCase()}`);
    if (chars.length === 0) chars.push('Siblings have a balanced, grounded character — no extreme planetary influences in the sibling house');
    return chars;
  })();

  // Sibling health risks
  const siblingHealthRisks = (() => {
    const risks = [];
    if (maleficsIn3.includes('Mars'))    risks.push('Mars in 3rd: a sibling may be prone to accidents, injuries, blood issues, or inflammatory conditions');
    if (maleficsIn3.includes('Saturn'))  risks.push('Saturn in 3rd: a sibling may have chronic health issues, joint problems, or a generally difficult physical constitution');
    if (maleficsIn3.includes('Rahu'))    risks.push('Rahu in 3rd: a sibling may have unusual or hard-to-diagnose health challenges, or nervous system issues');
    if (maleficsIn3.includes('Ketu'))    risks.push('Ketu in 3rd: a sibling may experience sudden or mysterious health events, particularly digestive or neurological');
    if (lord3InDusthan) {
      const issue = lord3FamilyHouse === 6 ? 'recurring illness, conflicts, or financial stress'
        : lord3FamilyHouse === 8 ? 'life crises, accidents, or major health upheavals'
        : 'isolation, hidden health battles, or hospitalisation at some point in life';
      risks.push(`3rd lord in ${lord3FamilyHouse}th house: a sibling\'s life may involve ${issue}`);
    }
    if (risks.length === 0) risks.push('No major health threats indicated for siblings — general good health astrologically');
    return risks;
  })();

  // Sibling life struggles
  const siblingStruggles = (() => {
    const strs = [];
    if (maleficsIn3.includes('Saturn')) strs.push('A sibling carries heavy karmic burdens — responsibilities, delays, and hard work that goes unrecognized for years');
    if (maleficsIn3.includes('Rahu'))   strs.push('A sibling may struggle with identity, unconventional life choices, or foreign-related complications');
    if (maleficsIn3.includes('Mars'))   strs.push('A sibling has a fighting nature — their life involves significant competition, conflict, and physical challenges');
    if (lord3InDusthan) strs.push('The 3rd lord in a dusthana house indicates at least one sibling faces significant life obstacles — career, health, or relationship difficulties');
    const h3Aspects = h3Family?.aspectingPlanets || [];
    if (h3Aspects.includes('Saturn')) strs.push('Saturn\'s aspect on the sibling house: siblings face slow, grinding challenges — patience and perseverance define their life');
    if (strs.length === 0) strs.push('Siblings have a relatively smooth life path — ordinary challenges without major astrological burdens');
    return strs;
  })();

  // Relationship with siblings
  const siblingRelationship = (() => {
    if (beneficsIn3.length > 0 && maleficsIn3.length === 0) return 'Excellent sibling relationships — mutual support, love, and teamwork. Siblings are your greatest allies in life.';
    if (maleficsIn3.includes('Rahu') || maleficsIn3.includes('Mars')) return 'Competitive or strained sibling dynamic. There may be rivalry, jealousy, or misunderstandings. Conscious communication heals these bonds over time.';
    if (maleficsIn3.includes('Saturn')) return 'Sibling bond is tested by circumstances — distance, responsibilities, or emotional coldness. The relationship improves significantly after your 30s.';
    if (h3Family?.strength === 'very strong' || h3Family?.strength === 'strong') return 'Strong sibling bond — you and your siblings look out for each other. At least one sibling has a very positive impact on your life.';
    return 'Average sibling relationship — neither exceptionally close nor distant. Life events will bring you closer at certain points.';
  })();

  // Sibling event timing
  const siblingEventPeriods = dasaPeriods
    .filter(d => d.lord === lord3Family || d.lord === 'Mars')
    .map(d => ({
      lord: d.lord,
      period: `${d.start} to ${d.endDate}`,
      reason: d.lord === 'Mars' ? 'Mars dasha — sibling-related events and younger brother matters are highlighted'
        : '3rd lord dasha — siblings, communication, and short journeys come to the fore',
    }));

  const siblings = {
    title: 'Siblings (Sahodarayō / සහෝදරයෝ)',
    sinhala: 'සොහොයුරු / සොහොයුරියන් ස්වභාවය, සෞඛ්‍යය සහ ජීවිත ගමන',
    // L1: Classical
    h3Analysis: { strength: h3Family?.strength, planetsIn3rd: h3Family?.planetsInHouse || [], aspectsOn3rd: h3Family?.aspectingPlanets || [] },
    h3Lord: { name: lord3Family, house: lord3FamilyHouse },
    marsPosition: { house: marsFamilyHouse, rashi: planets.mars?.rashi, rashiEnglish: planets.mars?.rashiEnglish },
    // L3: Jaimini
    bhratrkaraka: bhratrkaraka ? { planet: bhratrkaraka.planet, rashi: bhratrkaraka.rashi, meaning: 'Jaimini\'s sibling significator — the soul-essence of sibling relationships' } : null,
    // L4: D3 Drekkana chart
    d3SiblingChart: d3Lagna ? { d3Lagna, note: `D3 Drekkana (sibling chart) rising in ${d3Lagna} — this reveals the deeper karma between you and your siblings` } : null,
    // Narrative
    estimatedCount: siblingEstimate,
    characters: siblingCharacters,
    healthRisks: siblingHealthRisks,
    lifestrug: siblingStruggles,
    relationship: siblingRelationship,
    eventPeriods: siblingEventPeriods,
    remedies: (() => {
      const r = [];
      if (maleficsIn3.length > 0 || lord3InDusthan) {
        r.push('On Tuesdays, light an oil lamp and pray for your siblings\' wellbeing — removes Mars/sibling afflictions');
        r.push('Feed ants with sugar on Wednesdays — improves Mercury/sibling communication');
        r.push('Donate red lentils (masoor dal) on Tuesdays in your sibling\'s name');
      }
      if (r.length === 0) r.push('Maintain regular contact with siblings — this strengthens the 3rd house and brings mutual blessings');
      return r;
    })(),
  };

  // ── COMPLETE FAMILY PORTRAIT ────────────────────────────────────
  const familyPortrait = {
    title: 'Deep Family Portrait',
    sinhala: 'ගැඹුරු පවුල් ජ්‍යෝතිෂ විශ්ලේෂණය',
    accuracyNote: 'This analysis uses 5 cross-validation layers: Classical house/lord placement (BPHS), Shadbala planetary strength, Jaimini Karakas, Divisional chart confirmation (D3/D12), and aspect analysis. The convergence of multiple layers increases prediction accuracy significantly.',
    mother,
    father,
    siblings,
    // Family karma summary
    familyKarmaSummary: (() => {
      const points = [];
      // Ancestral blessings
      if (jupiterHouse && [4, 9, 12].includes(jupiterHouse)) points.push('Jupiter in the parental/spiritual axis — strong ancestral blessings protect this family line');
      // Ancestral debt (Pitru Dosha)
      const hasPitruDosha = advancedDoshas?.some(d => d.name.toLowerCase().includes('pitru'));
      if (hasPitruDosha) points.push('Pitru Dosha detected — ancestral karma creates repeating patterns. Ancestor worship (Pitru Tarpan) at family temples resolves generational cycles');
      // 4th-9th axis strength
      const h4h9Strong = (h4Family?.strength === 'strong' || h4Family?.strength === 'very strong') && (h9Family?.strength === 'strong' || h9Family?.strength === 'very strong');
      if (h4h9Strong) points.push('Both 4th and 9th houses are strong — you come from a blessed family lineage. The positive karma of your ancestors supports your life journey');
      // 4th lord + 9th lord in good houses
      if (!lord4InDusthanFamily && !lord9InDusthan) points.push('Parental lords are well-placed — both parents have (or had) a positive influence on your destiny');
      // Challenges
      if (lord4InDusthanFamily && lord9InDusthan) points.push('Both parental lords face challenges — your family may have gone through significant hardships. Your life mission includes breaking generational cycles of struggle');
      if (points.length === 0) points.push('Mixed family karma — some generations thrived, others faced challenges. You carry the responsibility of continuing the positive legacy');
      return points;
    })(),
    // Inherited traits
    inheritedTraits: (() => {
      const traits = [];
      // From father (Sun's influence)
      const sunSign = planets.sun?.rashi;
      if (sunSign === 'Simha' || sunSign === 'Mesha')    traits.push('From father: inherited leadership quality and determination');
      if (sunSign === 'Makara' || sunSign === 'Kanya')   traits.push('From father: inherited discipline, work ethic, and attention to detail');
      if (sunSign === 'Mithuna' || sunSign === 'Tula')   traits.push('From father: inherited intelligence, social grace, and communication skill');
      // From mother (Moon's influence)
      const moonSign = planets.moon?.rashi;
      if (moonSign === 'Kataka' || moonSign === 'Vrishabha') traits.push('From mother: inherited emotional depth, nurturing instinct, and love of home');
      if (moonSign === 'Simha' || moonSign === 'Dhanus')    traits.push('From mother: inherited optimism, generosity, and a bright personality');
      if (moonSign === 'Vrischika' || moonSign === 'Meena') traits.push('From mother: inherited intuition, emotional sensitivity, and artistic sense');
      // From siblings dynamic (3rd house)
      if (h3Family?.planetsInHouse?.includes('Mercury')) traits.push('From sibling dynamics: inherited quick wit, adaptability, and intellectual competitiveness');
      if (traits.length === 0) traits.push('Your inherited traits are a unique blend of both parental lines — you carry the best of both');
      return traits;
    })(),
    // ══════════════════════════════════════════════════════════════
    // PARENT HEALTH PREDICTIONS — Comprehensive danger period analysis
    // ══════════════════════════════════════════════════════════════
    parentHealthPredictions: (() => {
      try {
        const birthYear = new Date(date).getFullYear();
        
        // ── Mother Health Critical Analysis ───────────────────────
        const moonScore = advancedShadbala?.moon?.percentage || 50;
        const lord4Score = planetStrengths[lord4Family?.toLowerCase()]?.shadbalaPercent || 50;
        const moonDignity = planetStrengths['moon']?.dignityLevel;
        const lord4Dignity = planetStrengths[lord4Family?.toLowerCase()]?.dignityLevel;
        
        // Mother disease indicators from 4th house and Moon
        const motherDiseaseIndicators = [];
        if (moonScore < 40) motherDiseaseIndicators.push('Kidney/urinary disorders', 'Fluid retention issues', 'Mental/emotional instability');
        if (moonDignity === 'Debilitated') motherDiseaseIndicators.push('Chronic fatigue', 'Hormonal imbalances', 'Depression tendencies');
        if (maleficsIn4.includes('Saturn')) motherDiseaseIndicators.push('Chronic joint pain', 'Bone disorders', 'Respiratory issues');
        if (maleficsIn4.includes('Mars')) motherDiseaseIndicators.push('High blood pressure', 'Accidents at home', 'Inflammatory conditions');
        if (maleficsIn4.includes('Rahu')) motherDiseaseIndicators.push('Mysterious ailments', 'Nervous disorders', 'Phobias/anxiety');
        if (maleficsIn4.includes('Ketu')) motherDiseaseIndicators.push('Sudden health events', 'Spiritual/karmic illness', 'Digestive issues');
        if (lord4InDusthanFamily) {
          if (lord4FamilyHouse === 6) motherDiseaseIndicators.push('Chronic diseases', 'Hospital visits', 'Debt-related stress');
          if (lord4FamilyHouse === 8) motherDiseaseIndicators.push('Serious illness risk', 'Surgeries', 'Life-threatening conditions');
          if (lord4FamilyHouse === 12) motherDiseaseIndicators.push('Hospitalization', 'Hidden ailments', 'Long bed rest');
        }
        
        // Mother danger periods (dashas activating 4th lord, Moon, or 8th from 4th)
        const motherDangerDashas = lifespanFilter(dasaPeriods.filter(d => {
          const isDasha4thLord = d.lord === lord4Family;
          const isDashaMoon = d.lord === 'Moon';
          const isDashaSaturn = d.lord === 'Saturn' && (saturnHouse === 4 || maleficsIn4.includes('Saturn'));
          const is8thFrom4th = d.lord === getHouseLord(11); // 8th from 4th = 11th house
          const isMarak = d.lord === getHouseLord(7); // 7th is maraka from 4th
          return isDasha4thLord || isDashaMoon || isDashaSaturn || (lord4InDusthanFamily && (is8thFrom4th || isMarak));
        })).map(d => {
          let dangerLevel = 'Moderate';
          let reason = '';
          if (d.lord === lord4Family && lord4InDusthanFamily) {
            dangerLevel = 'High';
            reason = `4th lord ${lord4Family} dasha with lord in dusthana (${lord4FamilyHouse}th house) — heightened health concerns for mother`;
          } else if (d.lord === 'Moon' && moonScore < 45) {
            dangerLevel = 'High';
            reason = 'Weak Moon dasha — mother\'s emotional and physical health needs attention';
          } else if (d.lord === 'Saturn' && maleficsIn4.includes('Saturn')) {
            dangerLevel = 'High';
            reason = 'Saturn dasha with Saturn in 4th — chronic illness, hospitalization possible for mother';
          } else if (d.lord === lord4Family) {
            dangerLevel = 'Moderate';
            reason = `4th lord ${lord4Family} dasha — maternal matters activated, health checkups advised`;
          } else if (d.lord === 'Moon') {
            dangerLevel = 'Moderate';
            reason = 'Moon dasha — emotional/health fluctuations for mother';
          } else {
            dangerLevel = 'Watch';
            reason = `${d.lord} dasha activates maternal health indicators`;
          }
          return {
            period: `${d.start} to ${d.endDate}`,
            dashaLord: d.lord,
            dangerLevel,
            reason,
            ageAtTime: d.startAge ? `Age ${Math.round(d.startAge)} to ${Math.round(d.startAge + (d.years || 0))}` : null
          };
        }).slice(0, 5);
        
        // Mother longevity assessment
        let motherLongevityAssessment = 'Normal longevity expected';
        const motherHealthScore = (moonScore + lord4Score) / 2;
        if (motherHealthScore >= 60 && !lord4InDusthanFamily) {
          motherLongevityAssessment = 'Good longevity — strong 4th house and Moon indicate mother lives a long, healthy life';
        } else if (motherHealthScore < 40 || (lord4InDusthanFamily && lord4FamilyHouse === 8)) {
          motherLongevityAssessment = 'Health challenges indicated — proactive care, regular checkups, and remedies strongly advised';
        } else if (maleficsIn4.length >= 2) {
          motherLongevityAssessment = 'Multiple afflictions to 4th house — mother may face health struggles; your care and support is crucial';
        }
        
        // ── Father Health Critical Analysis ───────────────────────
        const sunScore = advancedShadbala?.sun?.percentage || 50;
        const sunH = getPlanetHouse('Sun');
        const lord9Score = planetStrengths[lord9Family?.toLowerCase()]?.shadbalaPercent || 50;
        const sunDignity = planetStrengths['sun']?.dignityLevel;
        const lord9Dignity = planetStrengths[lord9Family?.toLowerCase()]?.dignityLevel;
        
        // Father disease indicators from 9th house and Sun
        const fatherDiseaseIndicators = [];
        if (sunScore < 40) fatherDiseaseIndicators.push('Heart conditions', 'Eye problems', 'Low vitality/energy');
        if (sunDignity === 'Debilitated') fatherDiseaseIndicators.push('Bone disorders', 'Government/authority conflicts', 'Ego-related stress');
        if (maleficsIn9.includes('Saturn')) fatherDiseaseIndicators.push('Chronic bone/joint issues', 'Career stress', 'Depression');
        if (maleficsIn9.includes('Mars')) fatherDiseaseIndicators.push('Accidents', 'Surgeries', 'Blood pressure/heart issues');
        if (maleficsIn9.includes('Rahu')) fatherDiseaseIndicators.push('Unusual diseases', 'Misdiagnosis risk', 'Foreign illness');
        if (maleficsIn9.includes('Ketu')) fatherDiseaseIndicators.push('Sudden health events', 'Spiritual crisis', 'Nervous system');
        if (lord9InDusthan) {
          if (lord9FamilyHouse === 6) fatherDiseaseIndicators.push('Chronic diseases', 'Disputes', 'Health debt');
          if (lord9FamilyHouse === 8) fatherDiseaseIndicators.push('Serious illness', 'Accidents', 'Life-altering health events');
          if (lord9FamilyHouse === 12) fatherDiseaseIndicators.push('Hospitalization', 'Hidden ailments', 'Foreign treatment');
        }
        
        // Father danger periods
        const fatherDangerDashas = lifespanFilter(dasaPeriods.filter(d => {
          const isDasha9thLord = d.lord === lord9Family;
          const isDashaSun = d.lord === 'Sun';
          const isDashaSaturn = d.lord === 'Saturn' && (saturnHouse === 9 || maleficsIn9.includes('Saturn'));
          const is8thFrom9th = d.lord === getHouseLord(4); // 8th from 9th = 4th house lord
          const isMarak = d.lord === getHouseLord(3); // 3rd is maraka from 9th
          return isDasha9thLord || isDashaSun || isDashaSaturn || (lord9InDusthan && (is8thFrom9th || isMarak));
        })).map(d => {
          let dangerLevel = 'Moderate';
          let reason = '';
          if (d.lord === lord9Family && lord9InDusthan) {
            dangerLevel = 'High';
            reason = `9th lord ${lord9Family} dasha with lord in dusthana (${lord9FamilyHouse}th house) — heightened health concerns for father`;
          } else if (d.lord === 'Sun' && sunScore < 45) {
            dangerLevel = 'High';
            reason = 'Weak Sun dasha — father\'s health and vitality needs attention';
          } else if (d.lord === 'Saturn' && maleficsIn9.includes('Saturn')) {
            dangerLevel = 'High';
            reason = 'Saturn dasha with Saturn in 9th — chronic illness, hospitalization possible for father';
          } else if (d.lord === lord9Family) {
            dangerLevel = 'Moderate';
            reason = `9th lord ${lord9Family} dasha — paternal matters activated, health checkups advised`;
          } else if (d.lord === 'Sun') {
            dangerLevel = 'Moderate';
            reason = 'Sun dasha — father\'s health and authority matters come to fore';
          } else {
            dangerLevel = 'Watch';
            reason = `${d.lord} dasha activates paternal health indicators`;
          }
          return {
            period: `${d.start} to ${d.endDate}`,
            dashaLord: d.lord,
            dangerLevel,
            reason,
            ageAtTime: d.startAge ? `Age ${Math.round(d.startAge)} to ${Math.round(d.startAge + (d.years || 0))}` : null
          };
        }).slice(0, 5);
        
        // Father longevity assessment
        let fatherLongevityAssessment = 'Normal longevity expected';
        const fatherHealthScore = (sunScore + lord9Score) / 2;
        if (fatherHealthScore >= 60 && !lord9InDusthan) {
          fatherLongevityAssessment = 'Good longevity — strong 9th house and Sun indicate father lives a long, healthy life';
        } else if (fatherHealthScore < 40 || (lord9InDusthan && lord9FamilyHouse === 8)) {
          fatherLongevityAssessment = 'Health challenges indicated — proactive care, regular checkups, and remedies strongly advised';
        } else if (maleficsIn9.length >= 2) {
          fatherLongevityAssessment = 'Multiple afflictions to 9th house — father may face health struggles; your support is crucial';
        }
        
        // ── Parental Loss Timing Indicators ───────────────────────
        const parentalLossIndicators = [];
        // Saturn transit over 4th/9th
        if (saturnHouse === 4) parentalLossIndicators.push('Saturn transiting 4th — period of maternal health concerns when Saturn crosses natal 4th');
        if (saturnHouse === 9) parentalLossIndicators.push('Saturn transiting 9th — period of paternal health concerns when Saturn crosses natal 9th');
        // Marakas active
        const marakaFrom4 = getHouseLord(7); // 2nd and 7th from a house are marakas
        const marakaFrom9 = getHouseLord(3);
        if (marakaFrom4 && lord4InDusthanFamily) parentalLossIndicators.push(`${marakaFrom4} dasha (maraka from 4th) with afflicted 4th lord — heightened risk period for mother`);
        if (marakaFrom9 && lord9InDusthan) parentalLossIndicators.push(`${marakaFrom9} dasha (maraka from 9th) with afflicted 9th lord — heightened risk period for father`);
        
        // Protective factors
        const protectiveFactors = [];
        if (jupiterHouse === 4) protectiveFactors.push('Jupiter in 4th house — divine protection for mother');
        if (jupiterHouse === 9) protectiveFactors.push('Jupiter in 9th house — divine protection for father');
        if (moonScore >= 60) protectiveFactors.push('Strong Moon — mother has natural resilience');
        if (sunScore >= 60) protectiveFactors.push('Strong Sun — father has natural vitality');
        if (!lord4InDusthanFamily) protectiveFactors.push('4th lord well-placed — mother\'s health is supported');
        if (!lord9InDusthan) protectiveFactors.push('9th lord well-placed — father\'s health is supported');
        
        return {
          mother: {
            overallHealthScore: Math.round(motherHealthScore),
            diseaseIndicators: motherDiseaseIndicators.length > 0 ? motherDiseaseIndicators : ['No major health indicators detected'],
            criticalPeriods: motherDangerDashas,
            longevityAssessment: motherLongevityAssessment,
            moonStrength: `${Math.round(moonScore)}% (${moonDignity || 'neutral'})`,
            fourthLordStrength: `${Math.round(lord4Score)}% in house ${lord4FamilyHouse}`,
            keyVulnerabilities: lord4InDusthanFamily ? `4th lord in ${lord4FamilyHouse}th house creates health challenges` : 'No major structural weakness'
          },
          father: {
            overallHealthScore: Math.round(fatherHealthScore),
            diseaseIndicators: fatherDiseaseIndicators.length > 0 ? fatherDiseaseIndicators : ['No major health indicators detected'],
            criticalPeriods: fatherDangerDashas,
            longevityAssessment: fatherLongevityAssessment,
            sunStrength: `${Math.round(sunScore)}% (${sunDignity || 'neutral'})`,
            ninthLordStrength: `${Math.round(lord9Score)}% in house ${lord9FamilyHouse}`,
            keyVulnerabilities: lord9InDusthan ? `9th lord in ${lord9FamilyHouse}th house creates health challenges` : 'No major structural weakness'
          },
          parentalLossIndicators: parentalLossIndicators.length > 0 ? parentalLossIndicators : ['No immediate loss indicators — standard care and attention advised'],
          protectiveFactors: protectiveFactors.length > 0 ? protectiveFactors : ['Mixed protection — remedies recommended for both parents'],
          urgentRemedies: (() => {
            const remedies = [];
            if (motherHealthScore < 45) {
              remedies.push('For mother: Offer white flowers and milk to Moon on Mondays');
              remedies.push('Chant "Om Chandraya Namah" 108 times on Mondays');
              remedies.push('Schedule kidney/urinary checkups for mother annually');
            }
            if (fatherHealthScore < 45) {
              remedies.push('For father: Offer water to Sun at sunrise on Sundays');
              remedies.push('Chant "Om Suryaya Namah" 108 times on Sundays');
              remedies.push('Schedule cardiac checkups for father annually');
            }
            if (maleficsIn4.includes('Saturn') || maleficsIn9.includes('Saturn')) {
              remedies.push('Light sesame oil lamp on Saturdays for parental health protection');
              remedies.push('Donate to elderly care on Saturdays');
            }
            if (remedies.length === 0) {
              remedies.push('Regular health checkups for both parents after age 55');
              remedies.push('Serve parents with love — this is the highest remedy');
            }
            return remedies;
          })(),
          summary: `Mother\'s health score: ${Math.round(motherHealthScore)}% | Father\'s health score: ${Math.round(fatherHealthScore)}%. ` +
            `${motherDangerDashas.filter(d => d.dangerLevel === 'High').length > 0 ? 'Mother has HIGH-risk periods — see criticalPeriods. ' : ''}` +
            `${fatherDangerDashas.filter(d => d.dangerLevel === 'High').length > 0 ? 'Father has HIGH-risk periods — see criticalPeriods. ' : ''}` +
            `Proactive care during indicated dashas can significantly improve outcomes.`
        };
      } catch (e) {
        console.error('[ParentHealthPredictions] Error:', e.message);
        return null;
      }
    })(),
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 15: FOREIGN TRAVEL & LIVING ABROAD
  // ══════════════════════════════════════════════════════════════
  const h9 = analyzeHouse(9, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const h12Analysis = analyzeHouse(12, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const lord9HouseNum = getPlanetHouse(lord9Name);
  const lord12House = getPlanetHouse(lord12Name);

  const foreignIndicators = [];
  // Classic foreign travel indicators
  if (rahuHouse && [1, 4, 7, 9, 10, 12].includes(rahuHouse)) foreignIndicators.push(`Rahu in house ${rahuHouse} — strong foreign connection`);
  if (ketuHouse && [4, 9, 12].includes(ketuHouse)) foreignIndicators.push(`Ketu in house ${ketuHouse} — foreign settlement indicated`);
  if (lord12House && [1, 9, 10].includes(lord12House)) foreignIndicators.push(`12th lord in house ${lord12House} — foreign residence likely`);
  if (lord9HouseNum && [12].includes(lord9HouseNum)) foreignIndicators.push(`9th lord in 12th house — fortune through foreign lands`);
  if (saturnHouse && [9, 12].includes(saturnHouse)) foreignIndicators.push(`Saturn in house ${saturnHouse} — overseas career possible`);
  const moonInForeign = [9, 12].includes(moonHouse);
  if (moonInForeign) foreignIndicators.push(`Moon in house ${moonHouse} — emotional pull toward foreign lands`);

  // Foreign travel dashas
  const foreignDasas = lifespanFilter(dasaPeriods.filter(d => d.lord === 'Rahu' || d.lord === lord12Name || d.lord === lord9Name)).map(d => ({
    lord: d.lord,
    period: `${d.start} to ${d.endDate}`,
    reason: d.lord === 'Rahu' ? 'Rahu dasha — strongest foreign travel/settlement period' : d.lord === lord12Name ? '12th lord dasha — overseas opportunities' : '9th lord dasha — long-distance travel, fortune abroad',
  }));

  // Country direction mapping
  const DIRECTION_COUNTRIES = {
    'Mesha': { direction: 'East', countries: 'Japan, Korea, Australia, New Zealand' },
    'Vrishabha': { direction: 'South', countries: 'India (South), Maldives, Southeast Asia' },
    'Mithuna': { direction: 'West', countries: 'UK, Europe, Americas' },
    'Kataka': { direction: 'North', countries: 'Canada, Scandinavia, Russia' },
    'Simha': { direction: 'East', countries: 'Japan, China, Southeast Asia' },
    'Kanya': { direction: 'South', countries: 'India, South Asia, Middle East' },
    'Tula': { direction: 'West', countries: 'UK, Europe, Americas' },
    'Vrischika': { direction: 'North', countries: 'Canada, Northern Europe, Russia' },
    'Dhanus': { direction: 'East', countries: 'Australia, Far East, Pacific' },
    'Makara': { direction: 'South', countries: 'South Africa, Southern regions, Middle East' },
    'Kumbha': { direction: 'West', countries: 'USA, UK, Western Europe' },
    'Meena': { direction: 'North', countries: 'Canada, Scandinavia, Northern countries' },
  };

  const h12Rashi = houses[11]?.rashi || '';
  const h9Rashi = houses[8]?.rashi || '';
  const suggestedDirection = DIRECTION_COUNTRIES[h12Rashi] || DIRECTION_COUNTRIES[h9Rashi] || { direction: 'Mixed', countries: 'Multiple directions indicated' };

  const foreignTravel = {
    title: 'Foreign Travel & Living Abroad',
    sinhala: 'විදේශ ගමන් සහ විදේශගත ජීවිතය',
    ninthHouse: h9,
    twelfthHouse: h12Analysis,
    foreignIndicators,
    foreignLikelihood: foreignIndicators.length >= 3 ? 'Very strong foreign connection — overseas stay highly likely' : foreignIndicators.length >= 1 ? 'Moderate foreign travel indicated — visits likely, settlement possible' : 'Domestic life is stronger. Foreign travel limited to short visits.',
    travelPeriods: foreignDasas,
    suggestedDirection,
    visaSuccess: (() => {
      const rahu9or12 = [9, 12].includes(rahuHouse);
      const jup9or12 = [9, 12].includes(jupiterHouse);
      if (rahu9or12 && jup9or12) return 'Very high visa success probability';
      if (rahu9or12 || jup9or12) return 'Good visa success probability';
      return 'Visa matters may face delays — apply during favorable dashas';
    })(),
    settlementAbroad: [9, 12].includes(rahuHouse) || [9, 12].includes(lord12House) || ketuHouse === 4,
    // ── Nadi Astrology Foreign Travel Analysis (Sub-Lord methodology) ──
    nadiForeignTravel: nadiPredictions?.events?.foreign_travel ? (() => {
      const ft = nadiPredictions.events.foreign_travel;
      return {
        verdict: ft.verdict,
        strength: ft.strength,
        bestDashaPlanets: ft.bestDashaPlanets,
        strongPlanets: ft.strongPlanets?.map(p => p.name),
        averageScore: ft.averageScore,
        note: 'Nadi methodology: Foreign travel in DBA of planets signifying 3,9,12. Houses 2,4,11 indicate return to homeland.',
      };
    })() : null,
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 16: LEGAL, ENEMIES & PROTECTION
  // ══════════════════════════════════════════════════════════════
  const h6ForLegal = analyzeHouse(6, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const h8ForLegal = analyzeHouse(8, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const h12ForLegal = analyzeHouse(12, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);

  const legalIndicators = [];
  // 6th house = enemies, lawsuits, competition
  if (h6ForLegal?.maleficsIn?.length > 0) legalIndicators.push(`Malefics in 6th house (${h6ForLegal.maleficsIn.join(', ')}) — conflicts and competition indicated`);
  if (marsHouse === 6) legalIndicators.push('Mars in 6th — victory over enemies but confrontational energy');
  if (saturnHouse === 6) legalIndicators.push('Saturn in 6th — long legal battles but eventual victory');
  if (rahuHouse === 6) legalIndicators.push('Rahu in 6th — unusual enemies but strong ability to overcome');
  // 8th house = hidden enemies, conspiracies
  if (h8ForLegal?.maleficsIn?.length > 0) legalIndicators.push(`Malefics in 8th — hidden obstacles and betrayals possible`);
  // 12th house = losses, imprisonment
  if (h12ForLegal?.maleficsIn?.length > 0) legalIndicators.push(`Malefics in 12th — expenses through legal matters possible`);

  const legal = {
    title: 'Legal, Enemies & Protection',
    sinhala: 'නීතිමය, සතුරු හා ආරක්ෂාව',
    sixthHouse: h6ForLegal,
    eighthHouse: h8ForLegal,
    twelfthHouse: h12ForLegal,
    sixthLord: { name: lord6Name, house: getPlanetHouse(lord6Name) },
    legalIndicators,
    enemyProfile: (() => {
      const lord6H = getPlanetHouse(lord6Name);
      if (lord6H && isInDusthana(lord6H)) return 'Enemies are weak and self-destructive. They cannot harm you significantly.';
      if (lord6H && isInKendra(lord6H)) return 'Enemies can be powerful but you have the strength to overcome them.';
      return 'Be cautious of hidden rivals. Avoid unnecessary conflicts and confrontations.';
    })(),
    legalCasePeriods: lifespanFilter(dasaPeriods.filter(d => d.lord === lord6Name || d.lord === 'Mars' || d.lord === 'Saturn')).map(d => ({
      lord: d.lord, period: `${d.start} to ${d.endDate}`,
      reason: d.lord === lord6Name ? '6th lord period — legal disputes possible' : d.lord === 'Mars' ? 'Mars period — aggression, confrontation risk' : 'Saturn period — slow-moving legal processes',
    })),
    protectionAdvice: (() => {
      const tips = [];
      if (marsHouse && [1, 7, 8].includes(marsHouse)) tips.push('Be extra careful with sharp objects, vehicles, and physical confrontations');
      if (rahuHouse && [1, 7, 8].includes(rahuHouse)) tips.push('Watch for deception and fraud. Verify documents thoroughly.');
      if (saturnHouse && [1, 7, 8].includes(saturnHouse)) tips.push('Avoid illegal shortcuts. Patience is your best legal weapon.');
      if (ketuHouse && [1, 6, 8].includes(ketuHouse)) tips.push('Sudden events possible. Insurance and legal preparedness recommended.');
      if (tips.length === 0) tips.push('Your chart shows good protection. Maintain ethical conduct and you will overcome obstacles.');
      return tips;
    })(),
    // ── Nadi Astrology Legal/Litigation Analysis (Sub-Lord methodology) ──
    nadiLitigation: nadiPredictions?.events?.litigation ? (() => {
      const lt = nadiPredictions.events.litigation;
      return {
        verdict: lt.verdict,
        strength: lt.strength,
        bestDashaPlanets: lt.bestDashaPlanets,
        strongPlanets: lt.strongPlanets?.map(p => p.name),
        averageScore: lt.averageScore,
        note: 'Nadi methodology: Legal disputes in DBA of planets signifying 6,8,12. Victory indicated by 2,10,11.',
      };
    })() : null,
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 17: EDUCATION & KNOWLEDGE PATH
  // ══════════════════════════════════════════════════════════════
  const h4ForEdu = analyzeHouse(4, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const h5ForEdu = analyzeHouse(5, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const h9ForEdu = analyzeHouse(9, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const lord4HouseEdu = getPlanetHouse(lord4Name);

  // Education section: PURE TECHNICAL DATA — AI interprets education fields
  // No EDUCATION_BY_PLANET mapping. Instead, provide which planets influence education
  // houses (4th, 5th, 9th, 10th) with their strengths, dignities, and placements.
  const h10PlanetsForEdu = (h10?.planetsInHouse || []).filter(p => p && p !== 'Lagna' && p !== 'Ascendant');

  // Education-influencing planets with technical data (for AI interpretation)
  const eduPlanetPool = (() => {
    const pool = [];
    const addPlanet = (pName, source, tier) => {
      if (!pName || pName === 'Lagna' || pName === 'Ascendant') return;
      if (pool.some(p => p.planet === pName)) return;
      const key = pName.toLowerCase();
      pool.push({
        planet: pName,
        source, // e.g., 'in 10th house', '5th lord', 'in 4th house'
        tier,   // 1=career-directed, 2=aptitude, 3=environment
        house: getPlanetHouse(pName),
        dignity: planetStrengths[key]?.dignityLevel || 'Neutral',
        strength: advancedShadbala?.[key]?.percentage || planetStrengths[key]?.score || 50,
        functionalNature: getFunctionalNature(lagnaName, pName),
        rashi: planetStrengths[key]?.rashi || '',
        nakshatra: planets[key]?.nakshatra || '',
        isRetrograde: planets[key]?.isRetrograde || false,
      });
    };
    // Tier 1: 10th house planets (career-directed education)
    h10PlanetsForEdu.forEach(p => addPlanet(p, 'in 10th house (career direction)', 1));
    // Tier 2: 5th house planets + 5th lord (aptitude/intelligence)
    (h5ForEdu?.planetsInHouse || []).forEach(p => addPlanet(p, 'in 5th house (intelligence)', 2));
    addPlanet(lord5Name, '5th lord (intelligence ruler)', 2);
    // Tier 3: 4th house planets + 4th lord (formal education)
    (h4ForEdu?.planetsInHouse || []).forEach(p => addPlanet(p, 'in 4th house (formal education)', 3));
    addPlanet(lord4Name, '4th lord (education ruler)', 3);
    // Tier 4: 9th house planets (higher learning/philosophy)
    (h9ForEdu?.planetsInHouse || []).forEach(p => addPlanet(p, 'in 9th house (higher learning)', 4));
    return pool;
  })();

  const education = {
    title: 'Education & Knowledge Path',
    sinhala: 'අධ්‍යාපනය සහ දැනුම් මාර්ගය',
    fourthHouse: h4ForEdu,
    fifthHouse: h5ForEdu,
    ninthHouse: h9ForEdu,
    mercury: { house: mercuryHouse, strength: mercuryStrength.strength, score: mercuryStrength.score },
    jupiter: { house: jupiterHouse, strength: planetStrengths.jupiter?.strength, score: planetStrengths.jupiter?.score },
    // TECHNICAL DATA — AI interprets education fields from planet placements
    eduPlanetPool,
    bestStudyPeriods: lifespanFilter(dasaPeriods.filter(d => d.lord === 'Mercury' || d.lord === 'Jupiter' || d.lord === lord4Name || d.lord === lord5Name)).map(d => ({
      lord: d.lord, period: `${d.start} to ${d.endDate}`,
      reason: d.lord === 'Mercury' ? 'Mercury dasha — intellectual peak' : d.lord === 'Jupiter' ? 'Jupiter dasha — wisdom and higher learning' : d.lord === lord4Name ? '4th lord dasha — formal education' : '5th lord dasha — creativity and intelligence',
    })),
    foreignStudy: [9, 12].includes(rahuHouse) || [9, 12].includes(getPlanetHouse(lord4Name)),
    competitiveExams: { marsInCareerHouses: marsHouse && [6, 10, 11].includes(marsHouse), marsHouse },
    // ── Nadi Astrology Education Analysis (Sub-Lord methodology) ──
    nadiEducation: nadiPredictions ? (() => {
      const e = nadiPredictions.events?.education;
      const ea = nadiPredictions.educationByPlanet || {};
      const bestEduPlanets = Object.entries(ea)
        .filter(([_, v]) => v.score >= 70)
        .map(([k, v]) => ({ planet: k, grade: v.grade, score: v.score }));
      return {
        verdict: e?.verdict,
        strength: e?.strength,
        overallGrade: nadiPredictions.overallEducation,
        bestDashaPlanets: e?.bestDashaPlanets,
        strongPlanets: e?.strongPlanets?.map(p => p.name),
        averageScore: e?.averageScore,
        bestEduPlanets,
        note: 'Nadi methodology: Education success in DBA of planets signifying 4,9,11.',
      };
    })() : null,
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 18: LUCK & UNEXPECTED FORTUNES
  // ══════════════════════════════════════════════════════════════
  const h9ForLuck = analyzeHouse(9, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const h11ForLuck = analyzeHouse(11, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const h5ForLuck = analyzeHouse(5, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);

  const luckIndicators = [];
  // Jupiter in kendra or trikona = excellent luck
  if (jupiterHouse && (isInKendra(jupiterHouse) || isInTrikona(jupiterHouse))) luckIndicators.push('Jupiter in strong position — you are naturally fortunate');
  // 9th house strong = destiny-blessed
  if (h9ForLuck?.strength === 'strong' || h9ForLuck?.strength === 'very strong') luckIndicators.push('Strong fortune house — you are destined for good luck');
  // 5th house for speculation/lottery
  if (h5ForLuck?.planetsInHouse?.includes('Jupiter') || h5ForLuck?.planetsInHouse?.includes('Venus')) luckIndicators.push('Benefics in 5th house — speculative gains and lucky wins possible');
  // 11th house for gains
  if (h11ForLuck?.strength === 'strong' || h11ForLuck?.strength === 'very strong') luckIndicators.push('Strong gains house — unexpected income and windfalls indicated');
  // Rahu in 11 = sudden unexpected gains
  if (rahuHouse === 11) luckIndicators.push('Rahu in 11th — sudden unexpected wealth and gains');
  if (rahuHouse === 5) luckIndicators.push('Rahu in 5th — speculative gains, lottery luck possible');

  const luck = {
    title: 'Luck & Unexpected Fortunes',
    sinhala: 'වාසනාව සහ අනපේක්ෂිත වාසි',
    ninthHouse: h9ForLuck,
    eleventhHouse: h11ForLuck,
    fifthHouse: h5ForLuck,
    luckIndicators,
    overallLuck: luckIndicators.length >= 3 ? 'Highly fortunate — the universe works in your favor' : luckIndicators.length >= 1 ? 'Moderately lucky — seize opportunities when they come' : 'Luck comes through effort — hard work is your path to fortune',
    lotteryIndication: (() => {
      const h5hasJupVen = h5ForLuck?.planetsInHouse?.some(p => ['Jupiter', 'Venus'].includes(p));
      const rahu5or11 = [5, 11].includes(rahuHouse);
      if (h5hasJupVen && rahu5or11) return 'Strong lottery/windfall indication — try during favorable periods';
      if (h5hasJupVen || rahu5or11) return 'Moderate speculative luck — small, calculated risks may pay off';
      return 'Lottery luck is minimal — invest in skill-based income instead';
    })(),
    inheritanceIndication: (() => {
      const h8planets = h8Health?.planetsInHouse || [];
      const jupIn8 = h8planets.includes('Jupiter');
      if (jupIn8 || lord8Name === 'Jupiter') return 'Strong inheritance indicated — family assets will come your way';
      if (h8Health?.strength === 'strong') return 'Some inheritance or insurance benefits likely';
      return 'Self-made wealth is more indicated than inherited wealth';
    })(),
    luckyPeriods: lifespanFilter(dasaPeriods.filter(d => d.lord === lord9Name || d.lord === 'Jupiter' || d.lord === lord11Name)).map(d => ({
      lord: d.lord, period: `${d.start} to ${d.endDate}`,
      reason: d.lord === lord9Name ? 'Fortune lord period — maximum luck and blessings' : d.lord === 'Jupiter' ? 'Jupiter period — expansion and divine grace' : '11th lord period — gains and fulfilled wishes',
    })),
    luckyNumbers: (() => {
      const PLANET_NUMBERS = { 'Sun': 1, 'Moon': 2, 'Jupiter': 3, 'Rahu': 4, 'Mercury': 5, 'Venus': 6, 'Ketu': 7, 'Saturn': 8, 'Mars': 9 };
      const lagnaLord = lagna.rashi.lord;
      const nakshatraLord = moonNakshatra.lord;
      const primary = PLANET_NUMBERS[lagnaLord] || 1;
      const secondary = PLANET_NUMBERS[nakshatraLord] || 5;
      const tertiary = PLANET_NUMBERS[lord9Name] || 3;
      return { primary, secondary, tertiary, combined: [primary, secondary, tertiary, primary + secondary, primary + tertiary].filter(n => n <= 9) };
    })(),
    luckyDays: (() => {
      const PLANET_DAYS = { 'Sun': 'Sunday', 'Moon': 'Monday', 'Mars': 'Tuesday', 'Mercury': 'Wednesday', 'Jupiter': 'Thursday', 'Venus': 'Friday', 'Saturn': 'Saturday' };
      return [PLANET_DAYS[lagna.rashi.lord], PLANET_DAYS[lord9Name], PLANET_DAYS[moonNakshatra.lord]].filter(Boolean);
    })(),
    // ── Nadi Astrology Luck/Windfall/Property Analysis ──
    nadiLuck: nadiPredictions ? (() => {
      const wf = nadiPredictions.events?.windfall;
      const pr = nadiPredictions.events?.property;
      const wl = nadiPredictions.events?.wealth;
      return {
        windfallVerdict: wf?.verdict,
        windfallStrength: wf?.strength,
        windfallPlanets: wf?.strongPlanets?.map(p => p.name),
        windfallBestDasha: wf?.bestDashaPlanets,
        propertyVerdict: pr?.verdict,
        propertyStrength: pr?.strength,
        propertyPlanets: pr?.strongPlanets?.map(p => p.name),
        wealthVerdict: wl?.verdict,
        wealthStrength: wl?.strength,
        note: 'Nadi methodology: Windfall in DBA of planets signifying 8,11. Property via 4,11,12. Wealth via 2,6,10,11.',
      };
    })() : null,
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 19: SPIRITUAL JOURNEY & PAST KARMA
  // ══════════════════════════════════════════════════════════════
  const h9ForSpiritual = analyzeHouse(9, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const h12ForSpiritual = analyzeHouse(12, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const ketuHouseNum = getPlanetHouse('Ketu');

  const spiritualIndicators = [];
  if (ketuHouseNum && [1, 5, 9, 12].includes(ketuHouseNum)) spiritualIndicators.push('Ketu in spiritual house — strong past-life spiritual practice carried forward');
  if (jupiterHouse && [1, 5, 9, 12].includes(jupiterHouse)) spiritualIndicators.push('Jupiter in spiritual house — naturally inclined toward dharma and wisdom');
  if (saturnHouse && [9, 12].includes(saturnHouse)) spiritualIndicators.push('Saturn in spiritual sector — spiritual maturity comes through life experience');
  if (moonHouse && [4, 8, 12].includes(moonHouse)) spiritualIndicators.push('Moon in introspective house — natural meditation ability and psychic sensitivity');

  const spiritual = {
    title: 'Spiritual Journey & Past Karma',
    sinhala: 'ආධ්‍යාත්මික ගමන සහ කර්ම',
    ninthHouse: h9ForSpiritual,
    twelfthHouse: h12ForSpiritual,
    ketuPosition: { house: ketuHouseNum, note: 'Ketu represents past-life spiritual accumulation' },
    jupiterPosition: { house: jupiterHouse, note: 'Jupiter represents dharma, wisdom, and spiritual growth' },
    spiritualIndicators,
    spiritualInclination: spiritualIndicators.length >= 3 ? 'Deeply spiritual soul — meditation, pilgrimage, and spiritual practice are essential for your wellbeing' : spiritualIndicators.length >= 1 ? 'Moderate spiritual inclination — spirituality will become more important with age' : 'Practical and worldly focus — spirituality through service and good deeds',
    pastKarmaTheme: (() => {
      if (ketuHouseNum === 1) return 'Past life as a spiritual leader or saint. This life focuses on worldly achievement.';
      if (ketuHouseNum === 2) return 'Past life had material wealth. This life focuses on self-worth beyond money.';
      if (ketuHouseNum === 4) return 'Past life had deep family roots. This life pushes toward career and public recognition.';
      if (ketuHouseNum === 5) return 'Past life had creative or romantic fulfillment. This life focuses on community and humanitarian service.';
      if (ketuHouseNum === 7) return 'Past life was deeply relationship-focused. This life develops self-reliance and independence.';
      if (ketuHouseNum === 9) return 'Past life was a teacher or philosopher. This life develops practical wisdom through experience.';
      if (ketuHouseNum === 10) return 'Past life had authority and power. This life focuses on home, family, and inner peace.';
      if (ketuHouseNum === 12) return 'Past life was spent in isolation or spiritual retreat. This life engages with the world actively.';
      return 'Past-life karma is mixed — this life is about balancing spiritual growth with material responsibilities.';
    })(),
    pilgrimageRecommendation: (() => {
      const temples = [];
      if (planetStrengths.saturn?.score < 50) temples.push('Visit a Shani (Saturn) temple — e.g., Munneswaram, Chilaw');
      if (planetStrengths.mars?.score < 50) temples.push('Visit a Kataragama temple for Mars energy');
      if (planetStrengths.jupiter?.score < 50) temples.push('Visit a Buddhist temple on Poya days for Jupiter blessings');
      if (planetStrengths.venus?.score < 50) temples.push('Visit Nallur Kandaswamy or a Venus-associated temple');
      if (planetStrengths.moon?.score < 50) temples.push('Visit a temple near water — Seenigama, Hikkaduwa or any coastal temple');
      if (temples.length === 0) temples.push('Regular temple visits on Poya days amplify your natural spiritual energy');
      return temples;
    })(),
    meditationType: (() => {
      if (moonElement === 'water') return 'Water meditation, ocean sound therapy, or Buddhist Metta meditation suits your nature';
      if (moonElement === 'fire') return 'Active meditation — walking meditation, mantra chanting, or Kundalini breathing';
      if (moonElement === 'earth') return 'Grounding meditation — nature walks, body scan, or temple meditation';
      if (moonElement === 'air') return 'Breath-based meditation — Pranayama, Vipassana, or mindfulness meditation';
      return 'Choose a meditation style that feels natural — consistency matters more than technique';
    })(),
    // ── Nadi Astrology Spiritual Analysis (Sub-Lord methodology) ──
    nadiSpiritual: nadiPredictions?.events?.spiritual ? (() => {
      const sp = nadiPredictions.events.spiritual;
      return {
        verdict: sp.verdict,
        strength: sp.strength,
        bestDashaPlanets: sp.bestDashaPlanets,
        strongPlanets: sp.strongPlanets?.map(p => p.name),
        averageScore: sp.averageScore,
        note: 'Nadi methodology: Spiritual growth in DBA of planets signifying 5,9,12. Houses 3,6,10 indicate worldly attachments.',
      };
    })() : null,
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 20: SURPRISE PHYSICAL & PERSONALITY INSIGHTS
  // ══════════════════════════════════════════════════════════════
  const APPEARANCE_BY_LAGNA = {
    'Mesha': { build: 'medium to athletic', face: 'sharp features, prominent forehead', complexion: 'wheatish to fair', eyes: 'sharp, intense eyes', height: 'medium to tall' },
    'Vrishabha': { build: 'solid, well-built', face: 'round or square, pleasant', complexion: 'fair to wheatish', eyes: 'beautiful, large eyes', height: 'medium' },
    'Mithuna': { build: 'slim, agile', face: 'youthful, expressive', complexion: 'fair', eyes: 'bright, curious eyes', height: 'tall and lean' },
    'Kataka': { build: 'soft, rounded', face: 'round, gentle', complexion: 'pale to fair', eyes: 'watery, emotional eyes', height: 'short to medium' },
    'Simha': { build: 'strong, commanding', face: 'broad, lion-like', complexion: 'fair to golden', eyes: 'commanding, proud eyes', height: 'medium to tall' },
    'Kanya': { build: 'slim, delicate', face: 'oval, refined', complexion: 'fair', eyes: 'intelligent, analytical eyes', height: 'medium' },
    'Tula': { build: 'balanced, attractive', face: 'symmetrical, beautiful', complexion: 'fair, glowing', eyes: 'attractive, charming eyes', height: 'medium to tall' },
    'Vrischika': { build: 'strong, muscular', face: 'intense, angular', complexion: 'medium to dark', eyes: 'piercing, magnetic eyes', height: 'medium' },
    'Dhanus': { build: 'large, well-proportioned', face: 'long, dignified', complexion: 'wheatish to fair', eyes: 'bright, enthusiastic eyes', height: 'tall' },
    'Makara': { build: 'thin in youth, fills out later', face: 'bony, mature-looking', complexion: 'dark to wheatish', eyes: 'serious, deep-set eyes', height: 'short to medium' },
    'Kumbha': { build: 'tall, unusual', face: 'unique, distinct features', complexion: 'mixed', eyes: 'dreamy, far-away look', height: 'tall' },
    'Meena': { build: 'soft, fleshy', face: 'round, gentle, dreamy', complexion: 'fair to pale', eyes: 'large, expressive, watery eyes', height: 'short to medium' },
  };

  const SLEEP_PATTERNS = {
    'water': 'Light sleeper with vivid dreams. You probably remember your dreams clearly and sometimes have prophetic dreams.',
    'fire': 'Short but deep sleeper. You can survive on less sleep than most people. Restless when stressed.',
    'earth': 'Heavy, sound sleeper. You love your bed and need 7-8 hours minimum. Hard to wake up in the morning.',
    'air': 'Irregular sleep patterns. Your mind races at night. You might be a night owl who gets creative ideas at 2am.',
  };

  const FOOD_PREFERENCES = {
    'fire': 'You love spicy food. Hot sambols, chilli paste, and strong flavors excite you. You eat fast.',
    'earth': 'You appreciate rich, hearty food. Rice and curry, hoppers, kottu — comfort food is your thing. You eat slowly and savor.',
    'air': 'You snack more than you eat full meals. You like variety and get bored of the same food. Light, fresh foods appeal.',
    'water': 'Sweet tooth. You love desserts, fruits, milk-based dishes. You eat based on emotions — stress eating is real.',
  };

  const surpriseInsights = {
    title: 'Surprise Insights About You',
    sinhala: 'ඔයා ගැන පුදුම දේවල්',
    appearance: APPEARANCE_BY_LAGNA[lagnaName] || {},
    bodyMarks: (() => {
      const marks = [];
      // Mars marks (scars, cuts, burns)
      if (marsHouse === 1) marks.push('A scar or mark on the head, face, or forehead area');
      if (marsHouse === 2) marks.push('A mark near the mouth, chin, or neck');
      if (marsHouse === 3) marks.push('A mark on the right arm, shoulder, or hand');
      if (marsHouse === 4) marks.push('A mark on the chest or heart area');
      if (marsHouse === 5) marks.push('A mark on the stomach or upper abdomen');
      if (marsHouse === 6) marks.push('A mark on the lower abdomen or hip area');
      if (marsHouse === 7) marks.push('A mark on the lower back or pelvic area');
      if (marsHouse === 8) marks.push('A mark near the private parts or inner thigh');
      if (marsHouse === 9) marks.push('A mark on the thigh or hip');
      if (marsHouse === 10) marks.push('A mark on the knees or joints');
      if (marsHouse === 11) marks.push('A mark on the left leg, calf, or ankle');
      if (marsHouse === 12) marks.push('A mark on the feet or sole area');
      // Ketu marks (birthmarks, moles)
      if (ketuHouseNum) marks.push(`A mole or birthmark in the ${HEALTH_BY_HOUSE[ketuHouseNum] || 'body'} area`);
      // ── NEW: Rahu marks (unusual marks, dark spots) ───────────
      if (rahuHouse === 1) marks.push('A dark spot or unusual mark on the face or head');
      if (rahuHouse === 3) marks.push('A mark on the right hand or shoulder area — possibly from an unusual cause');
      if (rahuHouse === 5) marks.push('A mark on the stomach area — possibly a birthmark you\'ve had since birth');
      if (rahuHouse === 6) marks.push('A mark near the navel or waist area');
      if (rahuHouse === 10) marks.push('A mark on the knees — possibly from a fall or injury in childhood');
      if (rahuHouse === 12) marks.push('A mark on the left foot or ankle area');
      // ── NEW: Saturn marks (dark, old marks) ───────────────────
      if (saturnHouse === 1) marks.push('A dark or aged-looking mark on the face');
      if (saturnHouse === 10) marks.push('A mark on the knee or bone area — possibly related to joint issues');
      // ── NEW: D3 Drekkana-based body marks (classical BPHS method) ──
      // Each Drekkana of the Lagna tells where the mark is on the body
      // 1st Drekkana (0-10°) = head/face, 2nd (10-20°) = torso/middle, 3rd (20-30°) = lower body/legs
      if (lagna?.degree != null) {
        const lagnaDeg = lagna.degree % 30;
        const drekkanaRegion = lagnaDeg < 10 ? 'head, face, or upper body'
          : lagnaDeg < 20 ? 'chest, stomach, or middle body'
          : 'hips, thighs, legs, or lower body';
        marks.push('According to D3 Drekkana of Lagna, a distinguishing mark on the ' + drekkanaRegion);
      }
      // D3 positions from extended vargas — malefics in specific Drekkana signs show marks
      if (extendedVargas?.D3?.positions) {
        const D3_BODY_MAP = {
          1: 'head/face', 2: 'right eye/neck', 3: 'right arm/shoulder',
          4: 'chest/heart', 5: 'stomach/upper abdomen', 6: 'waist/navel',
          7: 'lower abdomen', 8: 'private parts/inner thigh', 9: 'right thigh/hip',
          10: 'knees/joints', 11: 'left leg/calf', 12: 'feet/soles'
        };
        const maleficD3 = ['mars', 'saturn', 'rahu', 'ketu'];
        for (const mName of maleficD3) {
          const d3Pos = extendedVargas.D3.positions[mName];
          if (d3Pos?.vargaRashiId) {
            // Map D3 rashi to body region
            const region = D3_BODY_MAP[d3Pos.vargaRashiId] || 'body';
            marks.push('D3 Drekkana shows ' + mName.charAt(0).toUpperCase() + mName.slice(1) + ' in ' + (RASHIS[d3Pos.vargaRashiId - 1]?.english || '') + ' — mark or scar in ' + region + ' area');
          }
        }
      }
      return marks;
    })(),
    numberOfSiblings: (() => {
      // ── ALIGNED: Use the same multi-layer analysis as familyPortrait siblings ──
      // The familyPortrait section uses 5-layer cross-validation (3rd+11th house, planets,
      // aspects, lords, D3 Drekkana). Use the same result for consistency.
      // Fall back to simplified calculation if familyPortrait hasn't been computed.
      const fpSib = familyPortrait?.siblings?.estimatedCount;
      if (fpSib && fpSib.count != null) {
        const count = fpSib.count;
        const elder = fpSib.estimatedElderSiblings || '0';
        const younger = fpSib.estimatedYoungerSiblings || '0';
        const gender = fpSib.gender || 'siblings';
        if (count === '0' || count === '0 or 1') return 'Only child or very small family. Strong bond with cousins who feel like siblings.';
        if (count === '1') return `Likely 1 sibling. ${gender}. ${elder !== '0' ? 'Elder' : 'Younger'} sibling indicated.`;
        return `Likely ${count} siblings — ${elder} elder, ${younger} younger. ${gender}.`;
      }
      // Fallback: simplified 3rd-house-only calculation
      const h3Planets = h3?.planetsInHouse || [];
      const h3PlanetCount = h3Planets.length || 0;
      const lord3Name = getHouseLord(3);
      const lord3House = getPlanetHouse(lord3Name);
      let siblingScore = 0;
      let hasBrothers = false;
      let hasSisters = false;
      siblingScore += h3PlanetCount;
      if (h3Planets.includes('Mars')) { hasBrothers = true; siblingScore += 0.5; }
      if (h3Planets.includes('Venus') || h3Planets.includes('Moon')) { hasSisters = true; }
      if (h3Planets.includes('Rahu') || h3Planets.includes('Ketu')) siblingScore -= 0.5;
      if (h3Planets.includes('Saturn')) siblingScore -= 0.5;
      if (h3?.aspectingPlanets?.includes('Mars') && !h3Planets.includes('Mars')) { hasBrothers = true; siblingScore += 0.3; }
      if (h3?.strength === 'very strong') siblingScore += 1;
      else if (h3?.strength === 'strong') siblingScore += 0.5;
      else if (h3?.strength === 'challenged' || h3?.strength === 'weak') siblingScore -= 0.5;
      if (lord3House && [1, 4, 5, 7, 9, 10, 11].includes(lord3House)) siblingScore += 0.5;
      if (h3?.aspectingPlanets?.includes('Jupiter')) siblingScore += 0.5;
      // Also check 11th house (elder siblings) — essential for accurate count
      const h11SibPlanets = (h11?.planetsInHouse || []).filter(p => !['Sun', 'Saturn', 'Moon'].includes(p));
      siblingScore += h11SibPlanets.length * 0.8;
      if (h11SibPlanets.includes('Venus')) hasSisters = true;
      if (h11SibPlanets.includes('Mars')) hasBrothers = true;

      let genderHint = '';
      if (hasBrothers && !hasSisters) genderHint = 'brother(s)';
      else if (hasSisters && !hasBrothers) genderHint = 'sister(s)';
      else if (hasBrothers && hasSisters) genderHint = 'mix of brothers and sisters';
      else genderHint = 'siblings';

      if (siblingScore >= 3) return `Likely 3 or more ${genderHint} — large family.`;
      if (siblingScore >= 1.5) return `Likely 2 ${genderHint}. Mix of older and younger siblings is indicated.`;
      if (siblingScore >= 0.5) return `Likely 1-2 ${genderHint}.`;
      if (siblingScore >= 0) return `Likely 1 ${genderHint} or possibly an only child.`;
      return 'Only child or very small family. Strong bond with cousins who feel like siblings.';
    })(),
    fatherProfile: (() => {
      const sunH = getPlanetHouse('Sun');
      const lord9H = getPlanetHouse(lord9Name);
      // ── IMPROVED: Multi-factor father analysis ────────────────
      const sunScore = getHealthScore('sun');
      const h9str = h9ForSpiritual?.strength || 'moderate';
      const sunInKendra = sunH && [1, 4, 7, 10].includes(sunH);
      const sunInDusthana = sunH && [6, 8, 12].includes(sunH);
      const lord9InGoodHouse = lord9H && [1, 4, 5, 7, 9, 10, 11].includes(lord9H);

      // Check for Neechabhanga Raja Yoga on Sun — debilitated Sun with cancellation
      // makes the father RISE from humble/difficult beginnings to great success
      const sunDignity = planetStrengths.sun?.dignityLevel || '';
      const hasNeechabhanga = sunDignity === 'Debilitated' && (advancedYogas || []).some(y =>
        y.name && y.name.toLowerCase().includes('neechabhanga') && y.name.toLowerCase().includes('sun')
      );

      // Also check if 9th lord (father lord) is strong or in good house
      const lord9Score = getHealthScore(lord9Name.toLowerCase());
      const h9IsStrong = h9str === 'strong' || h9str === 'very strong';

      let fatherDesc = '';
      // Career/status of father — Neechabhanga or strong 9th house overrides weak Sun
      if (hasNeechabhanga) {
        fatherDesc = 'Father is likely a highly respected professional — possibly in medicine, law, or a technical field. Despite early challenges, father rose to prominence through sheer determination and skill. Neechabhanga Raja Yoga on Sun transforms struggle into extraordinary achievement. ';
      } else if ((sunScore >= 65 && sunInKendra) || (h9IsStrong && lord9Score >= 60)) {
        fatherDesc = 'Father is likely a prominent, authoritative figure — possibly in government, administration, medicine, or a respected profession. ';
      } else if (sunScore >= 65 || h9IsStrong) fatherDesc = 'Father is likely successful and respected in his field. ';
      else if (sunScore >= 45) fatherDesc = 'Father has moderate success — a hardworking, self-made man. ';
      else fatherDesc = 'Father may have faced significant challenges in career or health. ';
      // Relationship quality
      if (sunH === 1 || sunH === 9 || sunH === 10) fatherDesc += 'Strong bond with father — he is a guiding force in your life.';
      else if (sunH === 4 || sunH === 5) fatherDesc += 'Father is protective and involved in your education and upbringing.';
      else if (sunInDusthana) fatherDesc += 'Relationship with father may have periods of distance or misunderstanding.';
      else if (lord9InGoodHouse) fatherDesc += 'Father\'s fortune supports your life path.';
      else fatherDesc += 'Relationship is generally stable but may lack deep emotional connection.';
      return fatherDesc;
    })(),
    motherProfile: (() => {
      const moonScore = getHealthScore('moon');
      const h4str = h4?.strength || 'moderate';
      const moonH = getPlanetHouse('Moon');
      const lord4H = getPlanetHouse(getHouseLord(4));
      const saturnH = getPlanetHouse('Saturn');
      const moonSaturnConjunct = moonH && saturnH && moonH === saturnH;
      const lord4InDusthana = lord4H && [6, 8, 12].includes(lord4H);
      // ── IMPROVED: Multi-factor mother analysis with trauma indicators ────
      let motherDesc = '';

      // Priority 1: Moon-Saturn conjunction (Vish Yoga) — strongest mother-difficulty indicator
      if (moonSaturnConjunct) {
        motherDesc = 'Relationship with mother may involve emotional pain, coldness, or a sense of distance. Mother may be strict, emotionally reserved, or overburdened with responsibilities, making it hard for her to express warmth. The native may feel emotionally unsupported or carry unresolved grief related to the maternal bond. ';
      }
      // Priority 2: 4th lord in dusthana — structural difficulty with mother/home
      else if (lord4InDusthana) {
        const dusthanaType = lord4H === 6 ? 'conflicts, disagreements, or health issues'
          : lord4H === 8 ? 'sudden separations, secrets, or transformative events'
          : 'emotional distance, separation, or hidden suffering';
        motherDesc = `4th lord in the ${lord4H}th house indicates challenges in the relationship with mother — ${dusthanaType} may affect the maternal bond. Mother may face difficulties in health or personal life. `;
      }
      // Priority 3: Moon in dusthana
      else if (moonH && [6, 8, 12].includes(moonH)) {
        motherDesc = 'Mother\'s health or the emotional bond with mother faces challenges. The native may experience periods of separation or worry about mother. ';
      }
      // Default: Standard analysis
      else if (moonScore >= 65 && h4str !== 'challenged') {
        motherDesc = 'Mother is emotionally nurturing, possibly artistic or spiritually inclined. She is the emotional anchor of the family. ';
      } else if (moonScore >= 50) {
        motherDesc = 'Mother is supportive and caring, though she may suppress her own needs for the family. ';
      } else {
        motherDesc = 'Mother may face health or emotional challenges. She carries heavy responsibilities. ';
      }

      // Additional layer: Saturn aspecting 4th house (even without conjunction)
      if (!moonSaturnConjunct && saturnH) {
        const satTo4 = ((4 - saturnH + 12) % 12) + 1;
        if ([3, 7, 10].includes(satTo4)) {
          motherDesc += 'Saturn\'s aspect on the 4th house adds a sense of duty and restriction to the home environment — mother may be disciplined but emotionally distant. ';
        }
      }

      // Health specifics
      if (moonSaturnConjunct || lord4InDusthana) {
        motherDesc += 'Mother\'s health needs regular attention — preventive care and emotional support are important.';
      } else if (moonH && [6, 8, 12].includes(moonH)) {
        motherDesc += 'Pay attention to mother\'s health, especially after her 50s — regular checkups recommended.';
      } else if (moonScore >= 60) {
        motherDesc += 'Mother\'s health is generally good — she has strong emotional resilience.';
      } else {
        motherDesc += 'Mother needs emotional support and health care attention as she ages.';
      }
      return motherDesc;
    })(),
    sleepPattern: SLEEP_PATTERNS[moonElement] || SLEEP_PATTERNS['earth'],
    foodPreference: FOOD_PREFERENCES[lagnaElement] || FOOD_PREFERENCES['earth'],
    petAffinity: (() => {
      if (lagnaElement === 'fire') return 'You are drawn to loyal, energetic animals — dogs, horses';
      if (lagnaElement === 'earth') return 'You love calm, cuddly pets — cats, rabbits, or garden birds';
      if (lagnaElement === 'air') return 'You are fascinated by birds and exotic pets — parrots, fish';
      if (lagnaElement === 'water') return 'You have a deep connection with animals, especially fish and water creatures';
      return 'You have a natural affinity with animals';
    })(),
    handedness: lagnaName && ['Mithuna', 'Kanya', 'Kumbha'].includes(lagnaName) ? 'Higher likelihood of left-handedness or ambidexterity' : 'Right-handed is most likely',
    partnerFirstLetter: (() => {
      // ── Nakshatra Pada Syllables (108 padas) — traditional Vedic name letters ──
      // Each Nakshatra has 4 padas, each pada maps to a starting syllable.
      // This is the authoritative method used in Sri Lankan/Indian Jyotish.
      const NAKSHATRA_PADA_SYLLABLES = {
        'Ashwini':            ['Chu', 'Che', 'Cho', 'La'],
        'Bharani':            ['Li', 'Lu', 'Le', 'Lo'],
        'Krittika':           ['A', 'I', 'U', 'E'],
        'Rohini':             ['O', 'Va', 'Vi', 'Vu'],
        'Mrigashira':         ['Ve', 'Vo', 'Ka', 'Ki'],
        'Ardra':              ['Ku', 'Gha', 'Ng', 'Chha'],
        'Punarvasu':          ['Ke', 'Ko', 'Ha', 'Hi'],
        'Pushya':             ['Hu', 'He', 'Ho', 'Da'],
        'Ashlesha':           ['Di', 'Du', 'De', 'Do'],
        'Magha':              ['Ma', 'Mi', 'Mu', 'Me'],
        'Purva Phalguni':     ['Mo', 'Ta', 'Ti', 'Tu'],
        'Uttara Phalguni':    ['Te', 'To', 'Pa', 'Pi'],
        'Hasta':              ['Pu', 'Sha', 'Na', 'Tha'],
        'Chitra':             ['Pe', 'Po', 'Ra', 'Ri'],
        'Swati':              ['Ru', 'Re', 'Ro', 'Ta'],
        'Vishakha':           ['Ti', 'Tu', 'Te', 'To'],
        'Anuradha':           ['Na', 'Ni', 'Nu', 'Ne'],
        'Jyeshtha':           ['No', 'Ya', 'Yi', 'Yu'],
        'Mula':               ['Ye', 'Yo', 'Bha', 'Bhi'],
        'Purva Ashadha':      ['Bhu', 'Dha', 'Pha', 'Dha'],
        'Uttara Ashadha':     ['Bhe', 'Bho', 'Ja', 'Ji'],
        'Shravana':           ['Ju', 'Je', 'Jo', 'Gha'],
        'Dhanishtha':         ['Ga', 'Gi', 'Gu', 'Ge'],
        'Shatabhisha':        ['Go', 'Sa', 'Si', 'Su'],
        'Purva Bhadrapada':   ['Se', 'So', 'Da', 'Di'],
        'Uttara Bhadrapada':  ['Du', 'Tha', 'Jha', 'Da'],
        'Revati':             ['De', 'Do', 'Cha', 'Chi'],
      };

      // Helper: get syllables for a sidereal degree
      const getSyllablesForDeg = (sidDeg) => {
        const nak = getNakshatra(sidDeg);
        const syllables = NAKSHATRA_PADA_SYLLABLES[nak.name];
        if (!syllables) return { all: [], pada: nak.pada, nak: nak.name, exact: null };
        return { all: syllables, pada: nak.pada, nak: nak.name, exact: syllables[nak.pada - 1] };
      };

      // Helper: extract first letter(s) from syllable for matching
      // "Sha" → "Sh", "La" → "L", "Chu" → "Ch", "Gha" → "Gh"
      const syllableToLetter = (syl) => {
        if (!syl) return syl;
        // Multi-char consonants first
        const multiConsonants = ['Chh', 'Ch', 'Sh', 'Th', 'Ph', 'Bh', 'Dh', 'Gh', 'Ng', 'Jh', 'Kh'];
        for (const mc of multiConsonants) {
          if (syl.startsWith(mc)) return mc;
        }
        return syl[0]; // single consonant/vowel
      };

      const h7Rashi = houses[6]?.rashi || '';
      const h7RashiId = houses[6]?.rashiId || 0;

      // ── Rashi-based letters lookup (used by multiple methods below) ──
      const RASHI_LETTERS = {
        'Mesha': ['A', 'L', 'E'], 'Vrishabha': ['B', 'V', 'U'], 'Mithuna': ['K', 'G', 'Ch'],
        'Kataka': ['D', 'H'], 'Simha': ['M', 'T'], 'Kanya': ['P', 'Th'],
        'Tula': ['R', 'T'], 'Vrischika': ['N', 'Y'], 'Dhanus': ['Bh', 'Dh', 'Ph'],
        'Makara': ['Kh', 'J'], 'Kumbha': ['G', 'S', 'Sh'], 'Meena': ['D', 'Ch', 'Z', 'Th'],
      };

      // ── Weighted scoring across multiple Vedic methods ─────────
      const letterWeights = {};
      const addWeighted = (letters, weight, source) => {
        if (!letters || !letters.length) return;
        letters.forEach(l => {
          if (!l) return;
          if (!letterWeights[l]) letterWeights[l] = { weight: 0, sources: [] };
          letterWeights[l].weight += weight;
          letterWeights[l].sources.push(source);
        });
      };

      // Helper: add both exact syllable AND its first-letter extraction
      const addSyllableWeighted = (syllInfo, weight, source) => {
        if (!syllInfo) return;
        // Add exact pada syllable with full weight
        if (syllInfo.exact) {
          addWeighted([syllInfo.exact], weight, source + ' pada ' + syllInfo.pada);
          // Also add the starting letter as a separate entry with slightly less weight
          const letter = syllableToLetter(syllInfo.exact);
          if (letter !== syllInfo.exact) {
            addWeighted([letter], weight * 0.7, source + ' letter');
          }
        }
        // Add all 4 pada syllables of this nakshatra with reduced weight
        if (syllInfo.all) {
          const otherSyllables = syllInfo.all.filter(s => s !== syllInfo.exact);
          addWeighted(otherSyllables, weight * 0.3, source + ' nak ' + syllInfo.nak);
        }
      };

      // ── Method 1: Bhava Chalit 7th cusp (lagna+180°) Nakshatra Pada (weight 4) — PRIMARY ──
      // The precise 7th cusp = Ascendant degree + 180°, much more accurate than whole-sign
      const lagnaSidereal = lagna.sidereal || ((houses[0]?.rashiId - 1) * 30);
      const bhava7CuspDeg = (lagnaSidereal + 180) % 360;
      const bhava7CuspNak = getSyllablesForDeg(bhava7CuspDeg);
      addSyllableWeighted(bhava7CuspNak, 4, 'H7 Bhava cusp');

      // Also check the adjacent pada if the degree is within 2° of a pada boundary
      const padaSpan = 360 / 108; // 3.333°
      const posInPada = bhava7CuspDeg % padaSpan;
      if (posInPada < 2) {
        // Near the START of this pada — previous pada also relevant
        const prevDeg = ((bhava7CuspDeg - 3) + 360) % 360;
        const prevNak = getSyllablesForDeg(prevDeg);
        addSyllableWeighted(prevNak, 2, 'H7 cusp adj-');
      } else if (posInPada > padaSpan - 2) {
        // Near the END of this pada — next pada also relevant
        const nextDeg = (bhava7CuspDeg + 3) % 360;
        const nextNak = getSyllablesForDeg(nextDeg);
        addSyllableWeighted(nextNak, 2, 'H7 cusp adj+');
      }

      // ── Method 1c: Cross-rashi nakshatra bridge ──
      // When the 7th cusp nakshatra spans two rashis (e.g., Krittika spans Mesha/Vrishabha),
      // include the other rashi's letters with moderate weight, because the cusp energy
      // inherits qualities from both rashis.
      const cuspNakStart = NAKSHATRAS.find(n => n.name === bhava7CuspNak.nak)?.start || 0;
      const cuspNakEnd = cuspNakStart + (360 / 27); // 13.333° span
      const cuspRashiStart = Math.floor(bhava7CuspDeg / 30) * 30;
      const cuspRashiEnd = cuspRashiStart + 30;
      // Check if nakshatra starts before this rashi (bleeds from previous rashi)
      if (cuspNakStart < cuspRashiStart) {
        const prevRashiId = Math.floor(cuspNakStart / 30) + 1;
        const prevRashiName = RASHIS[prevRashiId - 1]?.name || '';
        if (prevRashiName && RASHI_LETTERS[prevRashiName]) {
          addWeighted(RASHI_LETTERS[prevRashiName], 1.5, 'H7 nak bridge ' + prevRashiName);
        }
        // Also add the pada syllables from the part of the nakshatra in the previous rashi
        const prevPartPada1Deg = cuspNakStart;
        const prevPartNak = getSyllablesForDeg(prevPartPada1Deg);
        addSyllableWeighted(prevPartNak, 1.5, 'H7 nak bridge pada');
      }
      // Check if nakshatra extends past this rashi (bleeds into next rashi)
      if (cuspNakEnd > cuspRashiEnd) {
        const nextRashiId = (Math.floor(bhava7CuspDeg / 30) + 1) % 12 + 1;
        const nextRashiName = RASHIS[nextRashiId - 1]?.name || '';
        if (nextRashiName && RASHI_LETTERS[nextRashiName]) {
          addWeighted(RASHI_LETTERS[nextRashiName], 1, 'H7 nak bridge ' + nextRashiName);
        }
      }

      // ── Method 1b: Whole-sign 7th cusp (rashi start) — secondary cross-check ──
      const h7CuspDeg = (h7RashiId - 1) * 30;
      const h7WholeCuspNak = getSyllablesForDeg(h7CuspDeg);
      if (h7WholeCuspNak.nak !== bhava7CuspNak.nak || h7WholeCuspNak.pada !== bhava7CuspNak.pada) {
        addSyllableWeighted(h7WholeCuspNak, 2, 'H7 sign cusp');
      }

      // ── Method 2: 7th lord Nakshatra Pada (weight 3.5) — very strong ──
      const lord7Name = getHouseLord(7);
      const lord7Planet = lord7Name ? planets[lord7Name.toLowerCase()] : null;
      if (lord7Planet?.sidereal != null) {
        const lord7Nak = getSyllablesForDeg(lord7Planet.sidereal);
        addSyllableWeighted(lord7Nak, 3.5, '7L ' + lord7Name);
      }

      // ── Method 3: Navamsha D9 7th house cusp Nakshatra (weight 3) ──
      const nav7Rashi = navamsha?.houses?.[6]?.rashi || '';
      const nav7RashiId = navamsha?.houses?.[6]?.rashiId || 0;
      if (nav7RashiId) {
        const nav7CuspDeg = (nav7RashiId - 1) * 30;
        const nav7CuspNak = getSyllablesForDeg(nav7CuspDeg);
        addSyllableWeighted(nav7CuspNak, 3, 'D9 H7 cusp');
      }

      // ── Method 4: Darakaraka Nakshatra Pada (weight 2.5) — Jaimini ──
      if (jaiminiKarakas?.darakaraka?.planet) {
        const dkName = jaiminiKarakas.darakaraka.planet;
        const dkPlanet = planets[dkName.toLowerCase()];
        if (dkPlanet?.sidereal != null) {
          const dkNak = getSyllablesForDeg(dkPlanet.sidereal);
          addSyllableWeighted(dkNak, 2.5, 'DK ' + dkName);
        }
      }

      // ── Method 5: Venus Nakshatra Pada (weight 2) — marriage karaka ──
      if (planets.venus?.sidereal != null) {
        const venusNak = getSyllablesForDeg(planets.venus.sidereal);
        addSyllableWeighted(venusNak, 2, 'Venus');
      }

      // ── Method 6: Planets IN 7th house — their Nakshatra (weight 1.5 each) ──
      const h7Planets = houses[6]?.planets || [];
      h7Planets.forEach(hp => {
        const hpData = planets[hp.name?.toLowerCase()];
        if (hpData?.sidereal != null) {
          const hpNak = getSyllablesForDeg(hpData.sidereal);
          addSyllableWeighted(hpNak, 1.5, hp.name + ' in H7');
        }
      });

      // ── Method 7: Upapada Lagna rashi cusp Nakshatra (weight 1.5) ──
      const h12Lord = getHouseLord(12);
      const h12LordHouse = getPlanetHouse(h12Lord);
      if (h12LordHouse) {
        const dist = ((h12LordHouse - 12 + 12) % 12);
        const ulHouseNum = ((h12LordHouse + dist - 1 + 12) % 12) + 1;
        const finalUL = (ulHouseNum === 12) ? ((12 + 9) % 12) + 1 : ulHouseNum;
        const ulRashiId = houses[finalUL - 1]?.rashiId || 0;
        if (ulRashiId) {
          const ulCuspDeg = (ulRashiId - 1) * 30;
          const ulNak = getSyllablesForDeg(ulCuspDeg);
          addSyllableWeighted(ulNak, 1.5, 'UL H' + finalUL);
        }
      }

      // ── Method 8: 7th from Moon (Chandra Lagna) Nakshatra — spouse from emotional self ──
      // The 7th house from Moon sign is an important secondary spouse indicator
      if (planets.moon?.sidereal != null) {
        const moonRashiId = Math.floor(planets.moon.sidereal / 30) + 1;
        const h7FromMoonRashiId = ((moonRashiId - 1 + 6) % 12) + 1;
        const h7MoonCuspDeg = (h7FromMoonRashiId - 1) * 30;
        const h7MoonNak = getSyllablesForDeg(h7MoonCuspDeg);
        addSyllableWeighted(h7MoonNak, 2, '7th from Moon');
      }

      // ── Method 9: D9 Navamsha 7th lord Nakshatra — marriage chart's 7th lord ──
      if (navamsha?.houses?.[6]) {
        const nav7Lord = navamsha.houses[6].rashiLord;
        if (nav7Lord) {
          const nav7LordPlanet = planets[nav7Lord.toLowerCase()];
          if (nav7LordPlanet?.sidereal != null) {
            addSyllableWeighted(getSyllablesForDeg(nav7LordPlanet.sidereal), 1.5, 'D9 7L ' + nav7Lord);
          }
        }
      }

      // ── Method 10: KP Cuspal Sub-Lord of 7th cusp — very precise indicator ──
      // In KP astrology, the sub-lord of the 7th cusp is the finest pointer to spouse identity
      const csl7 = nadiPredictions?.cuspalSubLords?.[7] || nadiPredictions?.cuspalSubLords?.['7'];
      if (csl7?.subLord) {
        const subLordPlanet = planets[csl7.subLord.toLowerCase()];
        if (subLordPlanet?.sidereal != null) {
          addSyllableWeighted(getSyllablesForDeg(subLordPlanet.sidereal), 2, 'KP sublord ' + csl7.subLord);
        }
      }

      // ── Method 11: Rashi-based letters as supplementary signal ──
      // Traditional rashi-level letters provide broader coverage alongside precise pada syllables
      // H7 rashi letters (weight 2) — very traditional
      if (h7Rashi && RASHI_LETTERS[h7Rashi]) {
        addWeighted(RASHI_LETTERS[h7Rashi], 2, 'H7 rashi ' + h7Rashi);
      }
      // 7th lord's rashi letters (weight 2) — where the 7th lord sits matters
      const lord7RashiName = lord7Planet?.rashi || '';
      if (lord7RashiName && RASHI_LETTERS[lord7RashiName]) {
        addWeighted(RASHI_LETTERS[lord7RashiName], 2, '7L rashi ' + lord7RashiName);
      }
      // Navamsha 7th rashi letters (weight 1.5) — D9 = marriage chart
      if (nav7Rashi && RASHI_LETTERS[nav7Rashi]) {
        addWeighted(RASHI_LETTERS[nav7Rashi], 1.5, 'D9 rashi ' + nav7Rashi);
      }
      // Darakaraka's rashi letters (weight 1) — Jaimini spouse significator
      if (jaiminiKarakas?.darakaraka?.rashi) {
        const dkRashiName = RASHIS.find(r => r.english === jaiminiKarakas.darakaraka.rashi)?.name || '';
        if (dkRashiName && RASHI_LETTERS[dkRashiName]) {
          addWeighted(RASHI_LETTERS[dkRashiName], 1, 'DK rashi ' + dkRashiName);
        }
      }

      // ── Method 11: Nakshatra lord chain — dispositor of 7th cusp nakshatra ──
      // The nakshatra lord of the 7th cusp points to a planet whose own nakshatra adds signal
      const bhavaCuspNakLord = bhava7CuspNak.nak ? NAKSHATRAS.find(n => n.name === bhava7CuspNak.nak)?.lord : null;
      if (bhavaCuspNakLord) {
        const nakLordPlanet = planets[bhavaCuspNakLord.toLowerCase()];
        if (nakLordPlanet?.sidereal != null) {
          addSyllableWeighted(getSyllablesForDeg(nakLordPlanet.sidereal), 1.5, 'H7 nak lord ' + bhavaCuspNakLord);
        }
      }

      // ── Merge syllables that share the same starting letter ──
      // Group syllables by their first letter for final ranking
      const letterGroups = {};
      for (const [syl, info] of Object.entries(letterWeights)) {
        const letter = syllableToLetter(syl);
        if (!letterGroups[letter]) letterGroups[letter] = { weight: 0, syllables: [], sources: new Set() };
        letterGroups[letter].weight += info.weight;
        letterGroups[letter].syllables.push({ syllable: syl, weight: info.weight });
        info.sources.forEach(s => letterGroups[letter].sources.add(s));
      }

      // Sort by weight descending
      const sortedLetters = Object.entries(letterGroups)
        .sort((a, b) => b[1].weight - a[1].weight);
      const topLetters = sortedLetters.slice(0, 5).map(e => e[0]);
      const allLetters = sortedLetters.map(e => e[0]);

      // Build detailed info for top entries
      const topNote = sortedLetters.slice(0, 5).map(([l, info]) => {
        const topSyls = info.syllables.sort((a, b) => b.weight - a.weight).slice(0, 3).map(s => s.syllable).join('/');
        return `${l} (${topSyls}, score ${info.weight.toFixed(1)})`;
      }).join('; ');

      const lord7Rashi = lord7Planet?.rashi || '';

      return {
        topLetters,
        allPossibleLetters: allLetters,
        letterDetails: sortedLetters.slice(0, 8).map(([l, info]) => ({
          letter: l,
          score: parseFloat(info.weight.toFixed(1)),
          syllables: info.syllables.sort((a, b) => b.weight - a.weight).slice(0, 4).map(s => s.syllable),
          sources: [...info.sources],
        })),
        rashiBasis: h7Rashi,
        navamshaRashi: nav7Rashi || null,
        lord7Rashi: lord7Rashi || null,
        lord7Planet: lord7Name || null,
        darakarakaPlanet: jaiminiKarakas?.darakaraka?.planet || null,
        darakarakaRashi: jaiminiKarakas?.darakaraka?.rashi || null,
        note: `Top 5 predicted: ${topLetters.join(', ')}. ${topNote}`,
      };
    })(),
    hiddenTalent: (() => {
      const h5planets = h5ForEdu?.planetsInHouse || [];
      // Priority 1: Planets in 5th house (house of creativity/talent)
      if (h5planets.includes('Venus')) return 'Natural artistic talent — music, singing, dancing, or visual arts';
      if (h5planets.includes('Mercury')) return 'Exceptional writing or speaking ability — comedy, storytelling, or debate';
      if (h5planets.includes('Mars')) return 'Hidden athletic ability or mechanical skill — sports, cooking, or craftsmanship';
      if (h5planets.includes('Jupiter')) return 'Natural teaching or counseling ability — people learn from you without trying';
      if (h5planets.includes('Moon')) return 'Strong intuition and emotional intelligence — psychology, healing, or creative writing';
      if (h5planets.includes('Sun')) return 'Leadership in creative fields — performing arts, directing, or creative entrepreneurship';
      if (h5planets.includes('Rahu')) return 'Unconventional creative genius — technology, digital arts, or avant-garde expression';
      if (h5planets.includes('Ketu')) return 'Past-life spiritual wisdom — healing, meditation teaching, or metaphysical research';

      // Priority 2: Amatyakaraka (career/talent significator from Jaimini)
      const amkPlanet = jaiminiKarakas?.karakas?.Amatyakaraka?.planet;
      const amkDignity = amkPlanet ? (planetStrengths[amkPlanet.toLowerCase()]?.dignityLevel || '') : '';
      if (amkPlanet && (amkDignity === 'Exalted' || amkDignity === 'Own Sign' || amkDignity === 'Moolatrikona')) {
        const AMK_TALENTS = {
          'Venus': 'Powerful aesthetic sense — graphic design, visual arts, fashion, or creating beautiful things comes naturally. Venus as your exalted career significator makes you a born artist.',
          'Mercury': 'Extraordinary communication and analytical ability — writing, coding, data analysis, or language mastery. Mercury as your strong career significator makes you a natural intellectual.',
          'Mars': 'Hidden engineering or strategic mind — you can build, fix, or strategize things others cannot. Mars as your strong career significator gives you exceptional execution ability.',
          'Jupiter': 'Deep wisdom and advisory talent — people naturally trust your judgment. Jupiter as your strong career significator makes you a born counselor, teacher, or guide.',
          'Moon': 'Profound emotional intelligence and creative imagination — storytelling, psychology, or nurturing roles. Moon as your strong career significator gives you the ability to read people instinctively.',
          'Sun': 'Natural authority and leadership charisma — you command attention without trying. Sun as your strong career significator makes you destined for positions of influence.',
          'Saturn': 'Exceptional discipline and structural thinking — architecture, engineering, management, or systems design. Saturn as your strong career significator makes you a master builder.',
        };
        if (AMK_TALENTS[amkPlanet]) return AMK_TALENTS[amkPlanet];
      }

      // Priority 3: Strongest planet in the chart (highest Shadbala/dignity)
      const strongPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']
        .map(p => ({ planet: p, score: advancedShadbala?.[p.toLowerCase()]?.percentage || planetStrengths[p.toLowerCase()]?.score || 50, dignity: planetStrengths[p.toLowerCase()]?.dignityLevel || 'Neutral' }))
        .filter(p => p.dignity === 'Exalted' || p.dignity === 'Moolatrikona' || p.score >= 75)
        .sort((a, b) => b.score - a.score);
      if (strongPlanets.length > 0) {
        const top = strongPlanets[0];
        const STRONG_PLANET_TALENTS = {
          'Venus': `Extraordinary artistic and aesthetic talent — your exalted/strong Venus gives you a natural eye for beauty, design, and creative expression that most people cannot match`,
          'Mercury': `Exceptional intellectual agility — your strong Mercury gives you the ability to learn, communicate, and analyze at a level that surprises even you`,
          'Mars': `Remarkable physical courage and action-oriented talent — your strong Mars gives you the ability to lead, compete, and execute under pressure`,
          'Jupiter': `Deep inner wisdom and philosophical insight — your strong Jupiter gives you the gift of understanding life patterns that others miss entirely`,
          'Moon': `Powerful intuition and emotional depth — your strong Moon gives you an almost psychic ability to read situations and people`,
          'Sun': `Natural leadership magnetism — your strong Sun gives you an authority and presence that people instinctively follow`,
          'Saturn': `Incredible patience and long-term strategic thinking — your strong Saturn gives you the ability to build things that last generations`,
        };
        if (STRONG_PLANET_TALENTS[top.planet]) return STRONG_PLANET_TALENTS[top.planet];
      }

      // Priority 4: Karakamsha (Atmakaraka in Navamsha — soul purpose indicator)
      const karakamshaRashi = jaiminiKarakas?.karakamsha?.rashi;
      if (karakamshaRashi) {
        const KARAKAMSHA_TALENTS = {
          'Mesha': 'Hidden warrior spirit — leadership, sports, or entrepreneurial drive that emerges when challenged',
          'Vrishabha': 'Natural talent for creating beauty and value — music, art, finance, or building lasting things',
          'Mithuna': 'Gift for communication and intellectual versatility — writing, media, or bridging different worlds',
          'Kataka': 'Deep nurturing ability — healing, counseling, cooking, or creating safe spaces for others',
          'Simha': 'Born performer and creative leader — stage presence, creative direction, or inspiring others',
          'Kanya': 'Analytical precision and service excellence — health, quality control, or perfecting complex systems',
          'Tula': 'Natural diplomat and aesthetic sense — mediation, design, law, or bringing harmony to chaos',
          'Vrischika': 'Powerful investigative and transformative ability — research, psychology, or uncovering hidden truths',
          'Dhanus': 'Teaching and philosophical wisdom — education, travel, or inspiring others through knowledge',
          'Makara': 'Structural genius — management, architecture, governance, or building institutions',
          'Kumbha': 'Innovative and humanitarian thinking — technology, social reform, or revolutionary ideas',
          'Meena': 'Spiritual and artistic sensitivity — healing arts, music, film, or connecting with the divine',
        };
        if (KARAKAMSHA_TALENTS[karakamshaRashi]) return KARAKAMSHA_TALENTS[karakamshaRashi];
      }

      // Priority 5: 5th lord placement (where the 5th lord sits shows hidden creative direction)
      const lord5Name = getHouseLord(5);
      const lord5House = getPlanetHouse(lord5Name);
      if (lord5House) {
        const LORD5_HOUSE_TALENT = {
          1: `Self-expression is your hidden talent — ${lord5Name} as 5th lord in 1st house makes creativity central to your identity`,
          2: `Money-making creativity — your 5th lord in 2nd house gives you the ability to monetize creative and intellectual gifts`,
          3: `Communication artistry — writing, media, or performing. Your 5th lord in 3rd house makes you a natural communicator`,
          4: `Talent for creating beautiful spaces — interior design, real estate, or home-based creative ventures`,
          7: `Partnership creativity — your best work emerges through collaboration. Business partnerships amplify your talent`,
          9: `Teaching and philosophical creativity — your talent is in inspiring and educating others`,
          10: `Your hidden talent IS your career — creativity and profession are deeply intertwined for you`,
          11: `Social and network-based talent — you excel in group projects, community leadership, or social entrepreneurship`,
        };
        if (LORD5_HOUSE_TALENT[lord5House]) return LORD5_HOUSE_TALENT[lord5House];
      }

      return 'Your hidden talent lies in a unique combination of your chart energies — adaptability and learning ability that lets you master new skills faster than most';
    })(),
    // ── NEW: Atmakaraka soul purpose from Jaimini ───────────────
    soulPurpose: jaiminiKarakas?.atmakaraka ? {
      planet: jaiminiKarakas.atmakaraka.planet,
      rashi: jaiminiKarakas.atmakaraka.rashi,
      meaning: jaiminiKarakas.atmakaraka.meaning,
      karakamsha: jaiminiKarakas.karakamsha?.interpretation || null,
    } : null,
    // ── NEW: Planetary Roasts — funny but data-backed callouts ──
    planetaryRoasts: (() => {
      const roasts = [];
      const moonH = getPlanetHouse('Moon');
      const sunH = getPlanetHouse('Sun');
      const mercH = getPlanetHouse('Mercury');
      const venH = getPlanetHouse('Venus');
      const marsH = getPlanetHouse('Mars');
      const satH = getPlanetHouse('Saturn');
      const jupH = getPlanetHouse('Jupiter');
      const rahuH = getPlanetHouse('Rahu');
      const ketuH = getPlanetHouse('Ketu');
      const lagnaEl = lagnaElement;
      const moonEl = ELEMENTS[(moonRashi?.id || 1) - 1];

      // ── Lagna-based roasts ──
      if (lagnaName === 'Vrischika') roasts.push({ type: 'lagna', roast: 'You stare at people like you\'re reading their browser history. Scorpio rising energy is basically a human lie detector with trust issues.', source: 'Vrischika Lagna' });
      if (lagnaName === 'Mithuna') roasts.push({ type: 'lagna', roast: 'You have 47 hobbies, 12 half-read books, and 3 careers you\'re "considering." Gemini rising: the jack of all trades, master of getting distracted.', source: 'Mithuna Lagna' });
      if (lagnaName === 'Simha') roasts.push({ type: 'lagna', roast: 'You walk into a room and somehow expect everyone to notice. Leo rising doesn\'t enter — they ARRIVE. Your mirror is your best friend.', source: 'Simha Lagna' });
      if (lagnaName === 'Kanya') roasts.push({ type: 'lagna', roast: 'You corrected someone\'s grammar in a WhatsApp argument. Virgo rising: saving the world one typo at a time, while internally panicking about everything.', source: 'Kanya Lagna' });
      if (lagnaName === 'Mesha') roasts.push({ type: 'lagna', roast: 'Your first instinct is to fight. Your second instinct is also to fight. Aries rising: you\'ve started arguments with auto-reply emails.', source: 'Mesha Lagna' });
      if (lagnaName === 'Vrishabha') roasts.push({ type: 'lagna', roast: 'You\'re still thinking about that meal you had 3 days ago. Taurus rising: will cancel plans for good food and a comfortable pillow, zero guilt.', source: 'Vrishabha Lagna' });
      if (lagnaName === 'Kataka') roasts.push({ type: 'lagna', roast: 'You cried watching a phone commercial. Cancer rising: you feel everything at 200% volume, and your fridge is your emotional support system.', source: 'Kataka Lagna' });
      if (lagnaName === 'Tula') roasts.push({ type: 'lagna', roast: 'You\'ve spent 45 minutes choosing between two identical options. Libra rising: making a decision feels like being asked to cut the red or blue wire.', source: 'Tula Lagna' });
      if (lagnaName === 'Dhanus') roasts.push({ type: 'lagna', roast: 'You gave unsolicited life advice to a stranger at a bus stop. Sagittarius rising: part philosopher, part travel agent, full-time opinion dispenser.', source: 'Dhanus Lagna' });
      if (lagnaName === 'Makara') roasts.push({ type: 'lagna', roast: 'You were born 40 years old. Capricorn rising: you had a 5-year plan at age 12 and looked at other kids like they were unpaid interns.', source: 'Makara Lagna' });
      if (lagnaName === 'Kumbha') roasts.push({ type: 'lagna', roast: 'You once said "I\'m not weird, I\'m just ahead of my time" without any irony. Aquarius rising: alien energy in human packaging.', source: 'Kumbha Lagna' });
      if (lagnaName === 'Meena') roasts.push({ type: 'lagna', roast: 'You zoned out reading this and started imagining a whole alternate life scenario. Pisces rising: physically here, spiritually on another planet.', source: 'Meena Lagna' });

      // ── Planet-in-house roasts ──
      if (marsH === 1) roasts.push({ type: 'planet', roast: 'Mars in your 1st house means you have two speeds: FIGHT and asleep. There is no "chill" setting. You\'ve argued with a GPS.', source: 'Mars in H1' });
      if (marsH === 7) roasts.push({ type: 'planet', roast: 'Mars in your 7th house means your love language is "passionate argument." Your partner needs both a seatbelt and a fire extinguisher.', source: 'Mars in H7' });
      if (marsH === 10) roasts.push({ type: 'planet', roast: 'Mars in your 10th house: your boss either loves you or is terrified of you. There is no middle ground. You probably sent a "per my last email" at least once this month.', source: 'Mars in H10' });
      if (satH === 1) roasts.push({ type: 'planet', roast: 'Saturn in your 1st house: you were born looking like you\'ve already seen some things. Other babies cried — you just sighed heavily and accepted it.', source: 'Saturn in H1' });
      if (satH === 7) roasts.push({ type: 'planet', roast: 'Saturn in your 7th house: your standards for a partner are so high, even you can\'t meet them. Marriage for you is a PhD thesis, not a Tinder swipe.', source: 'Saturn in H7' });
      if (venH === 1) roasts.push({ type: 'planet', roast: 'Venus in your 1st house: you could read a grocery list and someone would fall in love. You\'re dangerously charming and you know it.', source: 'Venus in H1' });
      if (venH === 12) roasts.push({ type: 'planet', roast: 'Venus in your 12th house: your love life is like a secret Netflix series that nobody else knows about. You have feelings you haven\'t even admitted to yourself.', source: 'Venus in H12' });
      if (jupH === 1) roasts.push({ type: 'planet', roast: 'Jupiter in your 1st house: you give advice like you\'re being paid by the word. You\'re the friend group\'s unofficial therapist, whether they asked or not.', source: 'Jupiter in H1' });
      if (jupH === 5) roasts.push({ type: 'planet', roast: 'Jupiter in your 5th house: you think every idea you have is brilliant. To be fair, like 60% of them actually are. The other 40% are "creative experiments."', source: 'Jupiter in H5' });
      if (mercH === 3) roasts.push({ type: 'planet', roast: 'Mercury in your 3rd house: you text faster than people can think. You\'ve sent 14 messages before they finished reading the first one.', source: 'Mercury in H3' });
      if (mercH === 12) roasts.push({ type: 'planet', roast: 'Mercury in your 12th house: half your brilliant ideas come at 3 AM and disappear by morning. Your Notes app looks like the diary of a mad scientist.', source: 'Mercury in H12' });
      if (rahuH === 1) roasts.push({ type: 'planet', roast: 'Rahu in your 1st house: you reinvent yourself more often than a software update. People who knew you 5 years ago would barely recognize you — and that\'s on purpose.', source: 'Rahu in H1' });
      if (rahuH === 10) roasts.push({ type: 'planet', roast: 'Rahu in your 10th house: your ambition has ambition. You saw a CEO and thought "that could be me, but bigger." You don\'t climb ladders — you build elevators.', source: 'Rahu in H10' });
      if (rahuH === 7) roasts.push({ type: 'planet', roast: 'Rahu in your 7th house: you\'re attracted to people who are absolutely wrong for you, and you know it, and you do it anyway. Your heart has terrible GPS.', source: 'Rahu in H7' });
      if (ketuH === 1) roasts.push({ type: 'planet', roast: 'Ketu in your 1st house: you look calm on the outside while an entire existential crisis plays in your head. You\'ve questioned the meaning of life while waiting for rice to cook.', source: 'Ketu in H1' });
      if (ketuH === 5) roasts.push({ type: 'planet', roast: 'Ketu in your 5th house: romance confuses you. Not because you can\'t love — but because you can\'t figure out why everyone else makes it their entire personality.', source: 'Ketu in H5' });
      if (moonH === 12) roasts.push({ type: 'planet', roast: 'Moon in your 12th house: you process emotions in your sleep. Your dreams are more dramatic than most people\'s real lives. You wake up emotionally exhausted from arguments you had in a dream.', source: 'Moon in H12' });
      if (moonH === 8) roasts.push({ type: 'planet', roast: 'Moon in your 8th house: you know things about people that you shouldn\'t know. Your intuition isn\'t a "feeling" — it\'s a full surveillance system.', source: 'Moon in H8' });
      if (sunH === 12) roasts.push({ type: 'planet', roast: 'Sun in your 12th house: you could cure cancer and still introduce yourself as "oh I just work in healthcare." You\'re allergic to taking credit.', source: 'Sun in H12' });

      // ── Combination roasts ──
      if (lagnaEl === 'fire' && moonEl === 'water') roasts.push({ type: 'combo', roast: 'Fire rising, water Moon: you charge into situations with warrior energy, then go home and cry about it in the shower. You\'re a samurai with feelings.', source: 'Fire Lagna + Water Moon' });
      if (lagnaEl === 'earth' && moonEl === 'fire') roasts.push({ type: 'combo', roast: 'Earth rising, fire Moon: you LOOK calm and responsible but inside you\'re screaming "let me do something crazy." Your impulses have impulses, but your face says "I\'m fine."', source: 'Earth Lagna + Fire Moon' });
      if (lagnaEl === 'air' && moonEl === 'earth') roasts.push({ type: 'combo', roast: 'Air rising, earth Moon: your brain is in the future while your heart is in a comfort zone. You plan adventures and then cancel them for a good nap.', source: 'Air Lagna + Earth Moon' });
      if (lagnaEl === 'water' && moonEl === 'fire') roasts.push({ type: 'combo', roast: 'Water rising, fire Moon: you LOOK soft and emotional, but cross you once and you\'ll remember it for 47 years. Your grudge list has a table of contents.', source: 'Water Lagna + Fire Moon' });
      if (lagnaEl === 'fire' && moonEl === 'air') roasts.push({ type: 'combo', roast: 'Fire rising, air Moon: you start conversations, projects, and diets with incredible energy — and abandon all three by Thursday. Your enthusiasm is inspiring and terrifying.', source: 'Fire Lagna + Air Moon' });
      if (lagnaEl === 'earth' && moonEl === 'water') roasts.push({ type: 'combo', roast: 'Earth rising, water Moon: you\'re the person everyone comes to for advice, but you secretly want someone to take care of YOU for once. The strong friend who\'s actually drowning.', source: 'Earth Lagna + Water Moon' });

      // ── Retrograde roasts ──
      const retroPlanets = planets ? Object.values(planets).filter(p => p.isRetrograde).map(p => p.name) : [];
      if (retroPlanets.includes('Mercury')) roasts.push({ type: 'retro', roast: 'Born with Mercury retrograde: you think in spirals, not straight lines. You\'ve re-read the same sentence 4 times and somehow understood it differently each time.', source: 'Mercury Retrograde natal' });
      if (retroPlanets.includes('Venus')) roasts.push({ type: 'retro', roast: 'Born with Venus retrograde: your love life is a rerun channel. You\'re either thinking about an ex, running into an ex, or about to become someone\'s ex. The universe has a playlist on repeat.', source: 'Venus Retrograde natal' });
      if (retroPlanets.includes('Saturn')) roasts.push({ type: 'retro', roast: 'Born with Saturn retrograde: you put more pressure on yourself than any boss ever could. You\'re your own strictest teacher, harshest critic, and most demanding manager — all before breakfast.', source: 'Saturn Retrograde natal' });
      if (retroPlanets.includes('Jupiter')) roasts.push({ type: 'retro', roast: 'Born with Jupiter retrograde: you question every blessing. Something good happens and your first thought is "okay, but what\'s the catch?" Abundance trust issues.', source: 'Jupiter Retrograde natal' });
      if (retroPlanets.includes('Mars')) roasts.push({ type: 'retro', roast: 'Born with Mars retrograde: your anger doesn\'t explode — it marinates. You\'ll be calm for 6 months and then snap at someone for breathing too loud. Delayed reaction energy.', source: 'Mars Retrograde natal' });

      // ── Debilitation roasts ──
      if (planets.sun?.rashiId === 7) roasts.push({ type: 'debil', roast: 'Sun debilitated: your confidence has a loading screen. You KNOW you\'re talented but somehow need 3 people to confirm it before you believe it. Your imposter syndrome has imposter syndrome.', source: 'Sun in Tula (debilitated)' });
      if (planets.moon?.rashiId === 8) roasts.push({ type: 'debil', roast: 'Moon debilitated: your emotions are like Sri Lankan weather — intense, unpredictable, and nobody\'s umbrella is big enough. You feel things so deeply that "I\'m fine" is your most-used lie.', source: 'Moon in Vrischika (debilitated)' });
      if (planets.mars?.rashiId === 4) roasts.push({ type: 'debil', roast: 'Mars debilitated: you write angry messages, stare at them for 20 minutes, delete everything, and type "okay 👍" instead. Your passive-aggression is an art form.', source: 'Mars in Kataka (debilitated)' });
      if (planets.saturn?.rashiId === 1) roasts.push({ type: 'debil', roast: 'Saturn debilitated: patience? Never heard of it. You want results yesterday. If life is a marathon, you\'re the person sprinting the first 5km and then Googling "can you Uber the rest?"', source: 'Saturn in Mesha (debilitated)' });
      if (planets.mercury?.rashiId === 12) roasts.push({ type: 'debil', roast: 'Mercury debilitated: your thoughts are like 47 browser tabs — all open, most forgotten, one is playing music and you can\'t find which one. Organizing your mind is a full-time job.', source: 'Mercury in Meena (debilitated)' });
      if (planets.venus?.rashiId === 6) roasts.push({ type: 'debil', roast: 'Venus debilitated: you show love by doing things, not saying things. You\'ll cook someone a meal, fix their wifi, and organize their life — but saying "I love you" feels like defusing a bomb.', source: 'Venus in Kanya (debilitated)' });
      if (planets.jupiter?.rashiId === 10) roasts.push({ type: 'debil', roast: 'Jupiter debilitated: you give amazing advice that you absolutely do not follow yourself. "You should save money" says the person who just bought something completely unnecessary. The wise fool.', source: 'Jupiter in Makara (debilitated)' });

      return roasts;
    })(),
    // ── NEW: Love Language & Attachment Style ────────────────────
    loveLanguage: (() => {
      const venH = getPlanetHouse('Venus');
      const moonH = getPlanetHouse('Moon');
      const marsH = getPlanetHouse('Mars');
      const venScore = getHealthScore('venus');
      const moonScore = getHealthScore('moon');
      // Love language from Venus house
      const LOVE_LANG_BY_VENUS = {
        1: 'Physical touch & presence — you show love by being physically near',
        2: 'Words of affirmation — sweet words, compliments, love letters',
        3: 'Words & communication — long conversations, texting, voice notes',
        4: 'Quality time at home — cooking together, movie nights, cozy evenings',
        5: 'Playfulness & creativity — surprises, romantic dates, creative gifts',
        6: 'Acts of service — doing things for your partner, fixing problems, helping',
        7: 'Partnership — you show love by making the other person your equal priority',
        8: 'Deep emotional intimacy — intense bonding, sharing secrets, physical passion',
        9: 'Shared adventures — traveling together, learning together, philosophical talks',
        10: 'Public devotion — showing off your partner, supporting their career, building together',
        11: 'Friendship-based love — best friend energy, social activities together, group hangouts',
        12: 'Silent devotion — sacrificing quietly, giving without expecting, spiritual connection',
      };
      // Attachment style from Moon + Venus + childhood trauma indicators
      const saturnH = getPlanetHouse('Saturn');
      const moonSatConj = moonH && saturnH && moonH === saturnH;
      const moonInDusthana = moonH && [6, 8, 12].includes(moonH);
      const venusRetro = planets.venus?.isRetrograde;
      let attachment = 'Secure';
      let attachDetail = 'You form healthy bonds and can balance closeness with independence.';
      if (moonSatConj || (moonInDusthana && venScore < 45)) {
        attachment = 'Avoidant';
        attachDetail = 'You tend to pull away when things get too close. Emotional distance feels safer. You love deeply but struggle to show it — past experiences taught you that vulnerability = danger.';
      } else if (moonInDusthana || venusRetro) {
        attachment = 'Anxious';
        attachDetail = 'You love intensely and fear abandonment. You may check your phone for messages, overthink your partner\'s tone, and need reassurance. Your love is powerful but your fear of losing it is equally strong.';
      } else if (marsH === 7 || marsH === 1) {
        attachment = 'Anxious-Avoidant (Fearful)';
        attachDetail = 'You want closeness but also fear it. You may push people away and then pull them back. Your relationships are intense rollercoasters — passionate but unstable.';
      } else if (moonScore >= 65 && venScore >= 60) {
        attachment = 'Secure';
        attachDetail = 'You have a healthy capacity for love. You can be vulnerable without losing yourself, and you give your partner space without anxiety.';
      }
      // Jealousy score from Mars-Venus-Rahu interactions
      const rahuH = getPlanetHouse('Rahu');
      let jealousyScore = 0;
      if (marsH === 7 || marsH === 8) jealousyScore += 3;
      if (rahuH === 7) jealousyScore += 2;
      if (venusRetro) jealousyScore += 1;
      if (lagnaName === 'Vrischika') jealousyScore += 2;
      if (moonRashi?.name === 'Vrischika') jealousyScore += 2;
      const jealousyLevel = jealousyScore >= 5 ? 'Very High — possessive, needs constant reassurance' : jealousyScore >= 3 ? 'High — territorial in love, struggles to share attention' : jealousyScore >= 1 ? 'Moderate — occasional jealousy but manageable' : 'Low — trusting and secure in relationships';
      return {
        primary: LOVE_LANG_BY_VENUS[venH] || 'Quality time — being together is how you feel loved',
        attachment, attachDetail,
        jealousy: { score: jealousyScore, level: jealousyLevel },
        firstLoveAge: (() => {
          // Venus dasha or Venus antardasha transition age
          const venusDasha = dasaPeriods.find(d => d.lord === 'Venus');
          if (venusDasha) {
            const startYear = parseInt(venusDasha.start?.substring(0, 4), 10);
            if (!isNaN(startYear)) {
              const age = startYear - date.getUTCFullYear();
              if (age >= 10 && age <= 25) return `Around age ${age} — when Venus activates, love enters your life for the first time`;
            }
          }
          // Check Venus antardasha within earlier dashas (more common for first love)
          for (const d of dasaPeriods) {
            const ads = d.antardashas || [];
            for (const ad of ads) {
              if (ad.lord === 'Venus') {
                const adStart = parseInt((ad.start || '').substring(0, 4), 10);
                if (!isNaN(adStart)) {
                  const adAge = adStart - date.getUTCFullYear();
                  if (adAge >= 12 && adAge <= 25) return `Around age ${adAge} — a Venus sub-period brings your first romantic awakening`;
                }
              }
            }
          }
          // Fallback based on Moon nakshatra element
          if (moonElement === 'water') return 'Around age 14-16 — your emotional depth draws love early, even if you don\'t recognize it';
          if (moonElement === 'fire') return 'Around age 16-18 — passionate and bold, you don\'t wait for love, you chase it';
          if (moonElement === 'air') return 'Around age 17-19 — intellectually stimulated first, love follows the mind';
          return 'Around age 16-20 — first romantic awareness emerges during this window';
        })(),
      };
    })(),
    // ── NEW: Morning/Night Owl + Social Battery ─────────────────
    dailyBehavior: (() => {
      const sunH = getPlanetHouse('Sun');
      const moonH = getPlanetHouse('Moon');
      const mercH = getPlanetHouse('Mercury');
      const marsH = getPlanetHouse('Mars');
      const satH = getPlanetHouse('Saturn');
      const rahuH = getPlanetHouse('Rahu');
      // Morning vs Night
      const morningPlanetsCount = [sunH, marsH, jupiterHouse].filter(h => h && [1, 10, 9, 11].includes(h)).length;
      const nightPlanetsCount = [moonH, satH, rahuH].filter(h => h && [4, 8, 12].includes(h)).length;
      const chronotype = morningPlanetsCount > nightPlanetsCount ? 'Morning person — you peak between 6-11 AM, best ideas and energy come early' : nightPlanetsCount > morningPlanetsCount ? 'Night owl — you come alive after 9 PM, your creative peak is midnight' : 'Flexible schedule — you adapt to any routine but slightly prefer evenings';
      // Social battery
      const introvertScore = [satH, ketuHouseNum, moonH].filter(h => h && [4, 8, 12].includes(h)).length;
      const extrovertScore = [sunH, marsH, jupiterHouse, venusHouse].filter(h => h && [1, 3, 5, 7, 10, 11].includes(h)).length;
      const socialBattery = extrovertScore >= 3 ? 'Extrovert — you recharge around people, silence feels uncomfortable' : introvertScore >= 2 ? 'Introvert — you need alone time to recharge, too many people drain you' : 'Ambivert — you enjoy socializing but need quality alone time to recover';
      // Stress response
      const stressResponse = marsH && [1, 7, 10].includes(marsH) ? 'Fight — you confront problems head-on, sometimes too aggressively' : satH && [1, 4, 8].includes(satH) ? 'Freeze — you shut down and go silent when overwhelmed' : moonH && [12, 8].includes(moonH) ? 'Flight — you withdraw, isolate, or escape into fantasy/sleep' : 'Fawn — you people-please and absorb others\' stress to keep peace';
      // Decision making
      const decisionStyle = mercH && [1, 3, 5, 7].includes(mercH) && getHealthScore('mercury') >= 60 ? 'Analytical — you weigh pros and cons, make spreadsheets, research everything before deciding' : marsH && [1, 5, 10].includes(marsH) ? 'Impulsive — you decide in seconds based on gut feeling, sometimes recklessly' : moonH && [4, 5, 9].includes(moonH) ? 'Intuitive — you "just know" the right answer, your gut rarely lies' : 'Deliberate — you take your time, sometimes too long, often ask others for input';
      // Phone habits
      const phoneHabit = rahuH && [3, 7, 11].includes(rahuH) ? 'Phone addict — you scroll social media like it\'s oxygen, screen time reports terrify you' : mercH && [3, 11].includes(mercH) ? 'Texter — you prefer texting over calling, your message threads are novels' : satH && [3, 7].includes(satH) ? 'Phone-phobic — you let calls go to voicemail, hate being constantly reachable' : 'Moderate — you use your phone when needed but can put it down';
      return { chronotype, socialBattery, stressResponse, decisionStyle, phoneHabit };
    })(),
    // ── NEW: Anger Style & Crying Trigger ───────────────────────
    emotionalStyle: (() => {
      const marsH = getPlanetHouse('Mars');
      const moonH = getPlanetHouse('Moon');
      const marsScore = getHealthScore('mars');
      // Anger style from Mars
      let angerStyle = 'Controlled — you rarely show anger, preferring to process it privately';
      if (marsH === 1 || marsH === 7) angerStyle = 'Explosive — when you blow up, EVERYONE knows. Short fuse, loud voice, dramatic exits. You cool down fast though.';
      else if (marsH === 4 || marsH === 12) angerStyle = 'Suppressor — you bottle anger for weeks/months until it leaks out as passive-aggressive comments, silent treatment, or sudden tears';
      else if (marsH === 3 || marsH === 10) angerStyle = 'Verbal fighter — you use words as weapons. Your comebacks are devastating and you remember every argument for years';
      else if (marsH === 8) angerStyle = 'Cold rage — you don\'t yell, you go terrifyingly calm and quiet. Your silence is scarier than anyone else\'s shouting';
      else if (planets.mars?.isRetrograde) angerStyle = 'Delayed explosion — you seem calm for months, absorbing everything, then one tiny thing triggers a volcanic eruption that shocks everyone';
      // Crying trigger from Moon
      let cryingTrigger = 'You cry when you feel deeply misunderstood or unappreciated';
      if (moonH === 1 || moonH === 5) cryingTrigger = 'You cry at movies, music, and beautiful moments. Happy tears are your thing. A good song can wreck you in seconds.';
      else if (moonH === 4) cryingTrigger = 'You cry when you think about family, home, or childhood memories. Nostalgia is your weakness.';
      else if (moonH === 6 || moonH === 10) cryingTrigger = 'You cry from frustration and injustice. When things aren\'t fair, when hard work goes unrecognized — that\'s what breaks you.';
      else if (moonH === 7) cryingTrigger = 'You cry because of relationships — fights with your partner, feeling unloved, or seeing other couples being happy when you\'re lonely.';
      else if (moonH === 8) cryingTrigger = 'You cry in private, usually at 2 AM. Nobody sees it. You process grief, loss, and betrayal alone in the dark.';
      else if (moonH === 9) cryingTrigger = 'You cry when animals suffer, when you see injustice in the world, or during deeply spiritual moments. Compassion overwhelms you.';
      else if (moonH === 12) cryingTrigger = 'You cry in your sleep, in the shower, or when you\'re completely alone. Your tears are a private ritual — a release valve for emotions you hide all day.';
      else if (moonH === 3) cryingTrigger = 'You cry during intense conversations, while writing, or while listening to podcasts/audiobooks. Words and stories move you deeply.';
      else if (moonH === 11) cryingTrigger = 'You cry when your friends succeed, when communities come together, or when a group supports you unexpectedly. Connection moves you.';
      else if (moonH === 2) cryingTrigger = 'You cry during family gatherings, hearing old songs your parents loved, or when financial stress threatens your security.';
      return { angerStyle, cryingTrigger };
    })(),
    // ── NEW: Lucky Numbers, Colors, Day ─────────────────────────
    luckyProfile: (() => {
      const PLANET_NUMBERS = { Sun: [1, 10, 19], Moon: [2, 11, 20], Mars: [9, 18, 27], Mercury: [5, 14, 23], Jupiter: [3, 12, 21], Venus: [6, 15, 24], Saturn: [8, 17, 26], Rahu: [4, 13, 22], Ketu: [7, 16, 25] };
      const PLANET_COLORS = { Sun: 'Gold, Orange, Ruby Red', Moon: 'White, Silver, Pearl', Mars: 'Red, Crimson, Coral', Mercury: 'Green, Emerald', Jupiter: 'Yellow, Saffron', Venus: 'Pink, Light Blue, Pastel', Saturn: 'Dark Blue, Black, Indigo', Rahu: 'Smoky Grey, Ultraviolet', Ketu: 'Brown, Earthy tones' };
      const PLANET_DAYS = { Sun: 'Sunday', Moon: 'Monday', Mars: 'Tuesday', Mercury: 'Wednesday', Jupiter: 'Thursday', Venus: 'Friday', Saturn: 'Saturday' };
      const lagnaLord = lagna.rashi.lord;
      const nakshatraLord = moonNakshatra.lord;
      const strongestPlanet = Object.entries(planetStrengths).sort((a, b) => (b[1].score || 0) - (a[1].score || 0))[0];
      const luckyPlanet = strongestPlanet ? strongestPlanet[1].name || strongestPlanet[0] : lagnaLord;
      return {
        luckyNumbers: [...new Set([...(PLANET_NUMBERS[lagnaLord] || []).slice(0, 2), ...(PLANET_NUMBERS[nakshatraLord] || []).slice(0, 1)])],
        luckyColors: `Primary: ${PLANET_COLORS[lagnaLord] || 'N/A'} | Secondary: ${PLANET_COLORS[nakshatraLord] || 'N/A'}`,
        luckyDay: PLANET_DAYS[lagnaLord] || 'Thursday',
        luckyGemstone: (() => {
          const GEM = { Sun: 'Ruby (මාණික්‍ය)', Moon: 'Pearl (මුතු)', Mars: 'Red Coral (රතු පබළු)', Mercury: 'Emerald (මරකත)', Jupiter: 'Yellow Sapphire (පුෂ්පරාග)', Venus: 'Diamond (දියමන්ති)', Saturn: 'Blue Sapphire (නීලම)', Rahu: 'Hessonite Garnet (ගෝමේද)', Ketu: 'Cat\'s Eye (වෛඩූර්‍ය)' };
          return GEM[lagnaLord] || 'Yellow Sapphire';
        })(),
        luckyDirection: lagnaElement === 'fire' ? 'East' : lagnaElement === 'earth' ? 'South' : lagnaElement === 'air' ? 'West' : 'North',
        strongestPlanet: luckyPlanet,
      };
    })(),
    // ── NEW: Social Mask vs. Private Self ────────────────────────
    publicVsPrivate: (() => {
      const SIGN_PERSONA = {
        Mesha: 'Bold, confident, action-oriented leader', Vrishabha: 'Calm, reliable, luxury-loving sophisticate',
        Mithuna: 'Witty, social butterfly, always talking', Kataka: 'Warm caretaker, emotionally available, protective',
        Simha: 'Charismatic showman, generous, center of attention', Kanya: 'Organized perfectionist, helpful, analytical',
        Tula: 'Charming diplomat, balanced, aesthetically polished', Vrischika: 'Mysterious, intense, magnetically private',
        Dhanus: 'Optimistic adventurer, philosophical, blunt', Makara: 'Ambitious professional, serious, in control',
        Kumbha: 'Eccentric intellectual, humanitarian, detached', Meena: 'Dreamy artist, compassionate, other-worldly',
      };
      // Enhanced public mask: combine Lagna sign with planets IN 1st house for a richer picture
      const basePublicMask = SIGN_PERSONA[lagnaName] || 'Unique blend of qualities';
      const h1Planets = houses[0]?.planets?.filter(p => p.name !== 'Lagna' && p.name !== 'Ascendant').map(p => p.name) || [];
      const PLANET_PUBLIC_MODIFIER = {
        Sun: 'with strong authority and commanding presence — people instinctively look to you for leadership',
        Moon: 'with emotional openness — your feelings show on your face, making you approachable and relatable',
        Mars: 'with aggressive edge — you come across as fierce, competitive, and physically imposing',
        Mercury: 'with intellectual sharpness — you appear clever, articulate, and always ready with a witty response',
        Jupiter: 'with wise, guru-like aura — people see you as trustworthy, learned, and morally grounded',
        Venus: 'with magnetic charm and beauty — your aesthetic sense and attractiveness are the first things people notice',
        Saturn: 'with serious, mature demeanor — you appear older, more responsible, and harder to approach than you actually are',
        Rahu: 'with mysterious, unconventional energy — people can\'t quite figure you out, and that fascinates them',
        Ketu: 'with detached, spiritual aura — you seem like you\'re not fully "here," as if part of you exists in another realm',
      };
      const publicModifiers = h1Planets.map(p => PLANET_PUBLIC_MODIFIER[p]).filter(Boolean);
      const publicMask = publicModifiers.length > 0
        ? `${basePublicMask}, ${publicModifiers[0]}`
        : basePublicMask;

      // Enhanced private self: Moon sign + Moon house + planets aspecting Moon
      const privateInner = SIGN_PERSONA[moonRashi.name] || 'Deep emotional complexity';
      const moonH = getPlanetHouse('Moon');
      const MOON_HOUSE_INNER = {
        1: 'Your emotions are always visible — you cannot hide how you feel',
        4: 'Home is your sanctuary — you retreat inward when the world overwhelms you',
        5: 'Creativity and joy feed your inner world — you need play and self-expression to feel alive',
        7: 'You need a partner to feel emotionally complete — relationships define your inner landscape',
        8: 'You experience emotions at extreme intensity — transformation, secrets, and depth dominate your inner world',
        10: 'Your emotions are tied to your ambitions — career success = emotional security for you',
        12: 'You process everything in solitude — your richest emotional life happens when you\'re alone',
      };
      const moonInnerNote = MOON_HOUSE_INNER[moonH] || null;

      const contrast = lagnaName === moonRashi.name ? 'low' : 'high';
      // Check if Lagna and Moon are in opposite elements (max contrast)
      const lagnaEl = lagnaElement;
      const moonEl = ELEMENTS[(moonRashi?.id || 1) - 1];
      const isOppositeElement = (lagnaEl === 'fire' && moonEl === 'water') || (lagnaEl === 'water' && moonEl === 'fire') ||
        (lagnaEl === 'earth' && moonEl === 'air') || (lagnaEl === 'air' && moonEl === 'earth');
      const contrastLevel = lagnaName === moonRashi.name
        ? 'LOW — what you show and what you feel are closely aligned. You\'re authentic.'
        : isOppositeElement
          ? 'EXTREME — your outer personality and inner self are polar opposites. You feel chronically misunderstood. The person people see is almost the opposite of who you actually are inside.'
          : 'HIGH — your outer personality and inner self are very different. You often feel misunderstood.';

      const hiddenSelf = (() => {
        const ketuH = ketuHouseNum;
        const h12Planets = houses[11]?.planets?.filter(p => p.name !== 'Lagna').map(p => p.name) || [];
        const secrets = [];
        if (ketuH === 5) secrets.push('secretly fears they aren\'t creative enough');
        if (ketuH === 7) secrets.push('secretly fears deep commitment');
        if (ketuH === 1) secrets.push('secretly unsure of their own identity');
        if (ketuH === 2) secrets.push('secretly anxious about money and self-worth');
        if (ketuH === 4) secrets.push('secretly feels homeless or rootless emotionally');
        if (ketuH === 6) secrets.push('secretly fears being seen as incompetent or useless');
        if (ketuH === 8) secrets.push('secretly fascinated by death, the occult, or hidden knowledge');
        if (ketuH === 9) secrets.push('secretly questions religion and traditional beliefs');
        if (ketuH === 10) secrets.push('secretly doesn\'t care about status as much as they pretend');
        if (ketuH === 11) secrets.push('secretly feels disconnected from friend groups and social circles');
        if (ketuH === 12) secrets.push('secretly feels most alive when alone or in spiritual settings');
        if (ketuH === 3) secrets.push('secretly doubts their own communication skills and courage');
        if (h12Planets.includes('Venus')) secrets.push('has a secret romantic life or hidden desires nobody knows about');
        if (h12Planets.includes('Mars')) secrets.push('suppresses anger and has a hidden aggressive side');
        if (h12Planets.includes('Moon')) secrets.push('hides their true emotions from everyone, even close family');
        if (h12Planets.includes('Mercury')) secrets.push('has private thoughts and ideas they never share');
        if (h12Planets.includes('Sun')) secrets.push('secretly lacks confidence despite appearing authoritative');
        if (h12Planets.includes('Jupiter')) secrets.push('secretly questions their own wisdom and spiritual beliefs');
        if (h12Planets.includes('Saturn')) secrets.push('carries hidden grief, loneliness, or fear of abandonment');
        return secrets.length > 0 ? secrets.join('; ') : 'guards their vulnerability carefully';
      })();
      return {
        publicMask: `The world sees you as: ${publicMask}`,
        privateSelf: `But privately you are: ${privateInner}${moonInnerNote ? '. ' + moonInnerNote : ''}`,
        contrastLevel,
        hiddenSelf: `What you hide from everyone: ${hiddenSelf}`,
      };
    })(),
    // ── NEW: Money Personality ───────────────────────────────────
    moneyPersonality: (() => {
      const h2Planets = houses[1]?.planets?.filter(p => p.name !== 'Lagna').map(p => p.name) || [];
      const venH = getPlanetHouse('Venus');
      const satH = getPlanetHouse('Saturn');
      const rahuH = getPlanetHouse('Rahu');
      const jupH = getPlanetHouse('Jupiter');
      let archetype = 'Balanced — you save some, spend some, without extremes';
      if (h2Planets.includes('Jupiter') || h2Planets.includes('Venus')) archetype = 'Natural accumulator — money comes to you easily and you know how to grow it';
      else if (h2Planets.includes('Saturn')) archetype = 'Extreme saver — you feel anxious spending money even on necessities. Your bank balance is your security blanket.';
      else if (h2Planets.includes('Mars')) archetype = 'Aggressive spender — you earn fast and spend fast. Impulse purchases are your weakness. You\'re generous to a fault.';
      else if (h2Planets.includes('Rahu')) archetype = 'Risky investor — you\'re attracted to get-rich-quick schemes, crypto, gambling. Some hit big, others crash hard.';
      else if (rahuH === 11) archetype = 'Unconventional earner — your income comes from unusual sources. Side hustles, tech, foreign connections.';
      else if (satH === 2) archetype = 'Slow and steady — you build wealth painfully slowly but it lasts. No shortcuts, no windfalls, just discipline.';
      const impulseScore = (rahuH === 2 ? 3 : 0) + (h2Planets.includes('Mars') ? 2 : 0) + (venH && [1, 2, 5, 11].includes(venH) ? 1 : 0) + (lagnaElement === 'fire' ? 1 : 0);
      const impulseBuying = impulseScore >= 4 ? 'Very High — your cart is always full, your wallet is always empty' : impulseScore >= 2 ? 'Moderate — you splurge on specific categories (food? clothes? tech?)' : 'Low — you research everything before buying and hate buyer\'s remorse';
      return { archetype, impulseBuying, impulseScore };
    })(),
    // ── NEW: Age-Specific Life Shift Moments ────────────────────
    lifeShiftMoments: (() => {
      const shifts = [];
      const birthYear = date.getUTCFullYear();
      // Map dasha transitions to ages
      for (let i = 0; i < dasaPeriods.length - 1; i++) {
        const d = dasaPeriods[i];
        const nextD = dasaPeriods[i + 1];
        const transitionYear = parseInt((d.endDate || '').substring(0, 4), 10);
        if (isNaN(transitionYear)) continue;
        const transitionAge = transitionYear - birthYear;
        if (transitionAge < 0 || transitionAge > 80) continue;
        const SHIFT_THEMES = {
          Sun: 'confidence awakens, authority finds you',
          Moon: 'emotional awareness deepens, connection to family shifts',
          Mars: 'ambition ignites, courage appears, conflicts arise',
          Mercury: 'mind sharpens, communication becomes your power',
          Jupiter: 'wisdom expands, opportunities multiply, faith grows',
          Venus: 'love enters, beauty matters, comfort becomes priority',
          Saturn: 'reality hits, discipline is forced, maturity arrives',
          Rahu: 'obsession begins, unconventional path opens, worldly desire intensifies',
          Ketu: 'detachment grows, spiritual pull strengthens, old patterns dissolve',
        };
        shifts.push({
          age: transitionAge,
          year: transitionYear,
          from: d.lord,
          to: nextD.lord,
          description: `Around age ${transitionAge} (${transitionYear}): Life shifts from ${d.lord} energy to ${nextD.lord} energy — ${SHIFT_THEMES[nextD.lord] || 'a new chapter begins'}`,
        });
      }
      return shifts.slice(0, 8); // Top 8 major shifts
    })(),
    // ── NEW: Addiction Vulnerability ─────────────────────────────
    addictionProfile: (() => {
      const rahuH = getPlanetHouse('Rahu');
      const venH = getPlanetHouse('Venus');
      const moonH = getPlanetHouse('Moon');
      const marsH = getPlanetHouse('Mars');
      const vulnerabilities = [];
      if (rahuH === 1 || rahuH === 5) vulnerabilities.push('Social media/internet — you can lose hours scrolling without realizing');
      if (rahuH === 2 || rahuH === 11) vulnerabilities.push('Money-related — gambling, speculation, shopping sprees');
      if (venH && [2, 5, 12].includes(venH)) vulnerabilities.push('Comfort addictions — food, sugar, luxury, binge-watching');
      if (moonH && [8, 12].includes(moonH)) vulnerabilities.push('Emotional eating or escapism — you use food/sleep/fantasy to numb feelings');
      if (marsH && [1, 8, 12].includes(marsH)) vulnerabilities.push('Adrenaline — extreme sports, arguments, risky behavior gives you a rush');
      if (lagnaElement === 'water' || moonElement === 'water') vulnerabilities.push('Emotional dependency — you can become addicted to people, needing their validation');
      if (vulnerabilities.length === 0) vulnerabilities.push('No major addiction vulnerabilities — your chart shows good self-control');
      return vulnerabilities;
    })(),
    // ── NEW: Compatibility Quick-Cards ──────────────────────────
    compatibilityCards: (() => {
      const h11Sign = houses[10]?.rashiEnglish || 'N/A'; // 11th house = friends
      const h6Sign = houses[5]?.rashiEnglish || 'N/A';   // 6th house = enemies
      const h10Sign = houses[9]?.rashiEnglish || 'N/A';  // 10th house = boss
      const h7Sign = houses[6]?.rashiEnglish || 'N/A';   // 7th house = partner
      const h5Sign = houses[4]?.rashiEnglish || 'N/A';   // 5th house = romance/fun
      return {
        bestFriendSign: `${h11Sign} — this zodiac clicks with you naturally as a friend`,
        worstEnemySign: `${h6Sign} — conflict and competition most likely with this sign`,
        idealBossSign: `${h10Sign} — you thrive under leadership from this sign`,
        romanticChemistry: `${h5Sign} — irresistible romantic spark with this sign`,
        lifePartnerSign: `${h7Sign} — deepest long-term compatibility with this sign`,
      };
    })(),
    // ── NEW: Second Marriage & Divorce Probability ──────────────
    secondMarriage: (() => {
      const h2Planets = houses[1]?.planets?.filter(p => p.name !== 'Lagna').map(p => p.name) || [];
      const h7Planets = houses[6]?.planets?.filter(p => p.name !== 'Lagna').map(p => p.name) || [];
      const lord7Name = getHouseLord(7);
      const lord7House = getPlanetHouse(lord7Name);
      const venH = getPlanetHouse('Venus');
      const marsH = getPlanetHouse('Mars');
      const rahuH = getPlanetHouse('Rahu');
      const satH = getPlanetHouse('Saturn');
      // Dual signs on 7th cusp (Mithuna, Dhanus, Meena, Kanya) = dual relationship indicator
      const h7Rashi = houses[6]?.rashi || '';
      const isDualSign = ['Mithuna', 'Dhanus', 'Meena', 'Kanya'].includes(h7Rashi);
      // Score system: higher = more likely second marriage
      let score = 0;
      const reasons = [];
      // 1. Dual sign on 7th cusp — strongest classical indicator
      if (isDualSign) { score += 3; reasons.push(`Dual sign (${houses[6]?.rashiEnglish}) in the partnership sector — classical indicator of more than one significant relationship`); }
      // 2. Rahu in 7th — unconventional/multiple partnerships
      if (h7Planets.includes('Rahu')) { score += 3; reasons.push('Rahu in partnership sector — obsessive, unconventional love patterns, attraction to forbidden or foreign partners'); }
      // 3. Mars in 7th — conflict-driven separation
      if (h7Planets.includes('Mars')) { score += 2; reasons.push('Mars in partnership sector — intense passion but also intense fights, risk of separation due to ego clashes'); }
      // 4. Venus in dual sign or with Rahu
      if (planets.venus && ['Mithuna', 'Dhanus', 'Meena', 'Kanya'].includes(planets.venus.rashi)) { score += 2; reasons.push('Venus in a dual sign — love comes in multiple chapters, not just one'); }
      if (venH && rahuH && venH === rahuH) { score += 2; reasons.push('Venus conjunct Rahu — magnetic attraction to unconventional partners, risk of affairs or secret relationships'); }
      // 5. 7th lord in 6th, 8th, or 12th — marriage difficulties leading to second attempt
      if (lord7House && [6, 8, 12].includes(lord7House)) { score += 2; reasons.push('Partnership lord in a challenging position — first marriage faces structural issues'); }
      // 6. Saturn aspects 7th or is in 7th — delayed first, possible second
      if (h7Planets.includes('Saturn')) { score += 1; reasons.push('Saturn in partnership sector — first marriage delayed or restricted, second relationship more mature and lasting'); }
      // 7. Multiple planets in 7th = multiple relationships
      if (h7Planets.length >= 2) { score += 1; reasons.push(`${h7Planets.length} planets in partnership sector — complex love life with multiple significant connections`); }
      // 8. 2nd house (also maraka + 2nd marriage house) afflicted
      const h2HasMalefics = h2Planets.some(p => ['Mars', 'Saturn', 'Rahu', 'Ketu'].includes(p));
      if (h2HasMalefics) { score += 1; reasons.push('Challenging planets in the second marriage sector — if first marriage ends, a second relationship is strongly indicated'); }
      // Divorce risk sub-score
      let divorceScore = 0;
      if (marsH === 7 || marsH === 1 || marsH === 8) divorceScore += 2;
      if (h7Planets.includes('Rahu') || h7Planets.includes('Ketu')) divorceScore += 2;
      if (lord7House && [6, 8, 12].includes(lord7House)) divorceScore += 2;
      if (satH === 7 && marsH && [1, 4, 7, 8, 12].includes(marsH)) divorceScore += 1;
      if (planets.venus?.isRetrograde) divorceScore += 1;
      const divorceRisk = divorceScore >= 5 ? 'HIGH — significant risk of separation or divorce if relationship patterns aren\'t addressed' : divorceScore >= 3 ? 'MODERATE — some tension, but conscious effort can prevent breakdown' : divorceScore >= 1 ? 'LOW-MODERATE — minor friction points, generally manageable' : 'LOW — strong foundation for lasting partnership';
      const probability = score >= 7 ? 'VERY HIGH — chart strongly indicates more than one significant partnership in life. This is not a "bad" thing — it means each relationship teaches something essential.' : score >= 5 ? 'HIGH — second significant relationship is likely, either after a breakup/divorce or after the loss of a partner.' : score >= 3 ? 'MODERATE — possible under certain circumstances (late first marriage, partner incompatibility, or life changes).' : 'LOW — first marriage is likely to be the lasting one. Loyalty and commitment are strong chart themes.';
      return { score, probability, divorceRisk, divorceScore, reasons, isDualSign, h7Rashi: houses[6]?.rashiEnglish || 'N/A' };
    })(),
    // ── NEW: Monastic / Renunciation Tendency (Sanyasa Yoga) ────
    monasticTendency: (() => {
      const ketuH = ketuHouseNum;
      const satH = getPlanetHouse('Saturn');
      const jupH = getPlanetHouse('Jupiter');
      const moonH = getPlanetHouse('Moon');
      const rahuH = getPlanetHouse('Rahu');
      const sunH = getPlanetHouse('Sun');
      let score = 0;
      const indicators = [];
      // 1. Ketu in 1st, 9th, or 12th — strongest renunciation indicator
      if (ketuH === 12) { score += 4; indicators.push('Ketu in the house of liberation — the soul craves escape from material reality. Monastic pull is VERY strong.'); }
      if (ketuH === 1) { score += 3; indicators.push('Ketu in the self — identity feels temporary, worldly achievements feel meaningless. Drawn to dissolve the ego.'); }
      if (ketuH === 9) { score += 3; indicators.push('Ketu in the dharma house — past-life spiritual master. Feels "been there, done that" about religion but drawn to pure truth.'); }
      // 2. Saturn in 12th or aspecting 1st — renunciation through suffering
      if (satH === 12) { score += 3; indicators.push('Saturn in 12th — loss, isolation, and suffering in later life push toward monasticism or extreme simplicity.'); }
      if (satH === 1) { score += 2; indicators.push('Saturn on the self — life feels heavy. May voluntarily give up material comforts to find peace.'); }
      // 3. Moon in 8th or 12th — emotional detachment from the world
      if (moonH === 12) { score += 2; indicators.push('Moon in the isolation house — emotionally withdrawn from the world. Happiest when alone in silence.'); }
      if (moonH === 8) { score += 1; indicators.push('Moon in the transformation house — emotional crises lead to spiritual awakening.'); }
      // 4. Jupiter in 12th — wisdom through surrender
      if (jupH === 12) { score += 2; indicators.push('Jupiter in 12th — spiritual wisdom is the highest calling. May teach in ashrams, monasteries, or meditation centers.'); }
      // 5. 4+ planets in 12th house (stellium = detachment from material life)
      const h12Planets = houses[11]?.planets?.filter(p => p.name !== 'Lagna').map(p => p.name) || [];
      if (h12Planets.length >= 3) { score += 3; indicators.push(`${h12Planets.length} planets in the house of liberation — massive pull away from material life. This person may voluntarily retreat from society.`); }
      // 6. Rahu-Ketu axis on 1-7 or 6-12 — karmic detachment cycle
      if ((rahuH === 6 && ketuH === 12) || (rahuH === 12 && ketuH === 6)) { score += 2; indicators.push('Rahu-Ketu axis across service and liberation houses — life oscillates between worldly duty and spiritual escape.'); }
      // 7. No planets in 7th (empty marriage house) + strong 12th = renunciation over marriage
      const h7Empty = (houses[6]?.planets?.filter(p => p.name !== 'Lagna') || []).length === 0;
      if (h7Empty && h12Planets.length >= 1) { score += 1; indicators.push('Empty partnership sector with active liberation house — partnership energy is weak, spiritual pull is stronger.'); }
      // 8. Venus combust or debilitated — love/desire weakened
      if (planets.venus?.rashiId === 6) { score += 1; indicators.push('Venus weakened — romantic desire is muted, making celibacy or renunciation more natural.'); }
      if (planets.venus?.isCombust) { score += 1; indicators.push('Venus overshadowed by ego — romance takes a backseat to ambition or spiritual pursuit.'); }
      const tendency = score >= 8 ? 'VERY HIGH — this chart has classical Sanyasa Yoga. Strong pull toward monastic life, extreme minimalism, long meditation retreats, or becoming a monk/nun. This person may shock their family by renouncing worldly life.' : score >= 5 ? 'HIGH — significant spiritual detachment. May not become a monk, but will have phases of complete withdrawal from social life. Could live like a hermit for months, go on silent retreats, or drastically simplify their life.' : score >= 3 ? 'MODERATE — spiritual curiosity is real but won\'t override worldly desires. May take sabbaticals, practice regular meditation, or have a "spiritual phase" in their 40s-50s.' : 'LOW — firmly grounded in material life. Enjoys worldly pleasures and relationships. Spirituality is a hobby, not a lifestyle. Not becoming a monk anytime soon 😄';
      const monasticAge = (() => {
        // Ketu or Saturn dasha often triggers renunciation
        const triggerDasha = dasaPeriods.find(d => d.lord === 'Ketu' || (d.lord === 'Saturn' && satH === 12));
        if (triggerDasha && score >= 5) {
          const startYear = parseInt(triggerDasha.start?.substring(0, 4), 10);
          if (!isNaN(startYear)) {
            const age = startYear - date.getUTCFullYear();
            if (age >= 30 && age <= 75) return `Around age ${age} (${startYear}) — the spiritual pull intensifies dramatically during this period`;
          }
        }
        if (score >= 5) return 'Later in life — after worldly responsibilities are fulfilled';
        return 'Not strongly indicated';
      })();
      return { score, tendency, indicators, monasticAge, h12Planets };
    })(),
    // ── NEW: Fame & Public Recognition Potential ─────────────────
    famePotential: (() => {
      const sunH = getPlanetHouse('Sun');
      const moonH = getPlanetHouse('Moon');
      const rahuH = getPlanetHouse('Rahu');
      const jupH = getPlanetHouse('Jupiter');
      const venH = getPlanetHouse('Venus');
      let score = 0;
      const indicators = [];
      // Sun in 1st, 10th, or 11th = public visibility
      if (sunH === 10) { score += 3; indicators.push('Sun in the career house — born to be seen, recognized, and respected publicly'); }
      if (sunH === 1) { score += 2; indicators.push('Sun in the self — strong personal brand, people remember you'); }
      if (sunH === 11) { score += 2; indicators.push('Sun in the gains house — fame through social networks and community'); }
      // Rahu in 1st or 10th = sudden fame, viral moments
      if (rahuH === 10) { score += 3; indicators.push('Rahu in career — explosive, unconventional rise to fame. Could go viral overnight. Fame through technology or controversy.'); }
      if (rahuH === 1) { score += 2; indicators.push('Rahu in the self — magnetic public persona, people are obsessed with you for reasons they can\'t explain'); }
      // Moon in 1st, 10th, or 7th = public popularity
      if (moonH === 1 || moonH === 10) { score += 2; indicators.push('Moon in a visible position — emotionally relatable to masses, natural influencer energy'); }
      // Jupiter in 1st, 9th, or 10th = respected authority
      if (jupH === 1 || jupH === 9 || jupH === 10) { score += 2; indicators.push('Jupiter in a power position — respected as a teacher, mentor, or authority figure'); }
      // Venus in 1st or 10th = fame through beauty/art
      if (venH === 1 || venH === 10) { score += 2; indicators.push('Venus visible — fame through beauty, art, music, design, or entertainment'); }
      // Gajakesari Yoga (Jupiter in kendra from Moon) = widespread fame
      const jupFromMoon = moonH && jupH ? ((jupH - moonH + 12) % 12) + 1 : 0;
      if ([1, 4, 7, 10].includes(jupFromMoon)) { score += 2; indicators.push('Gajakesari combination — your reputation spreads far and wide, people speak well of you'); }
      // Multiple planets in 10th = career spotlight
      const h10Planets = houses[9]?.planets?.filter(p => p.name !== 'Lagna').map(p => p.name) || [];
      if (h10Planets.length >= 2) { score += 2; indicators.push(`${h10Planets.length} planets in career house — intense public visibility, career defines your identity`); }
      const level = score >= 8 ? 'CELEBRITY POTENTIAL — this chart has the markers of someone who could become widely known. Whether through career, social media, art, or public service — you\'re meant to be seen by many.' : score >= 5 ? 'LOCAL FAME — you\'ll be well-known in your community, industry, or social circle. Not necessarily a celebrity, but people know your name and respect you.' : score >= 3 ? 'NICHE RECOGNITION — fame in a specific field or community. Expert status, thought leadership, or being "that person" everyone recommends.' : 'PRIVATE ACHIEVER — your success is real but quiet. You don\'t seek the spotlight, and that\'s perfectly fine. Your impact is through personal connections, not public display.';
      return { score, level, indicators };
    })(),
    // ── NEW: Wealth Class Prediction ────────────────────────────
    wealthClass: (() => {
      const h2Strength = getHealthScore('venus'); // 2nd house karaka
      const h11Strength = getHealthScore('jupiter'); // gains karaka
      const jupH = getPlanetHouse('Jupiter');
      const venH = getPlanetHouse('Venus');
      const rahuH = getPlanetHouse('Rahu');
      let score = 0;
      // Dhana yogas from existing section
      score += (career?.dhanaYogas?.length || 0) * 2;
      // Jupiter in kendra/trikona = wealth magnet
      if (jupH && ([1, 4, 5, 7, 9, 10].includes(jupH))) score += 2;
      // Venus strong = luxury
      if (h2Strength >= 60) score += 2;
      // 11th house strong = income
      if (h11Strength >= 60) score += 2;
      // Rahu in 2nd or 11th = sudden wealth
      if (rahuH === 2 || rahuH === 11) score += 2;
      // 2nd lord in kendra
      const lord2House = getPlanetHouse(getHouseLord(2));
      if (lord2House && isInKendra(lord2House)) score += 1;
      const wealthLevel = score >= 10 ? 'UPPER CLASS — strong wealth yoga present. Luxury, property, and financial security are well-indicated. Top 10% wealth potential.' : score >= 7 ? 'UPPER-MIDDLE CLASS — comfortable life with periods of significant wealth. You\'ll own property and live well.' : score >= 4 ? 'MIDDLE CLASS — stable finances through consistent effort. Comfortable but not extravagant.' : score >= 2 ? 'WORKING CLASS — wealth requires persistent hard work. Financial stability comes in the second half of life.' : 'SELF-MADE JOURNEY — the chart doesn\'t gift wealth easily, but grit and strategy can change everything. Many billionaires had "poor" charts.';
      return { score, wealthLevel };
    })(),
    // ── NEW: Past Life Story ────────────────────────────────────
    pastLifeStory: (() => {
      const ketuH = ketuHouseNum;
      const rahuH = getPlanetHouse('Rahu');
      const PAST_LIVES = {
        1: { pastLife: 'You were a monk, hermit, or spiritual seeker in your past life. You lived alone, meditated in isolation, and mastered the art of detachment.', lesson: 'This life forces you to BUILD an identity, take action, and lead — the opposite of your past-life withdrawal.', talent: 'Natural meditation ability, instant calm under pressure, zero attachment to material things.' },
        2: { pastLife: 'You were born into extreme wealth or royalty. Money, jewels, and luxury surrounded you, but it left your soul empty.', lesson: 'This life teaches you that true value comes from within — self-worth, not net worth.', talent: 'Natural eye for quality, instinctive money sense, beautiful speaking voice.' },
        3: { pastLife: 'You were a messenger, writer, or traveling merchant. You moved constantly, carrying information or goods between communities.', lesson: 'This life grounds you — building deep local connections rather than surface-level ones.', talent: 'Natural communicator, can sell anything, quick learner, fearless traveler.' },
        4: { pastLife: 'You were a powerful public figure — a king, politician, or military general. Your life was lived in the spotlight.', lesson: 'This life turns inward — creating a safe, loving home and finding peace in private life.', talent: 'Natural authority, people obey you instinctively, commanding presence.' },
        5: { pastLife: 'You were a social worker, humanitarian, or part of a large community. Your identity was tied to the group, never yourself.', lesson: 'This life develops YOUR unique creative expression — art, romance, children, personal joy.', talent: 'Natural ability to organize groups, humanitarian instinct, network builder.' },
        6: { pastLife: 'You were a mystic, healer, or spiritual recluse. You lived near the ocean or mountains, away from civilization.', lesson: 'This life pulls you into practical service — health care, daily routines, and helping others with their problems.', talent: 'Natural healer, psychic sensitivity, ability to sense illness in others.' },
        7: { pastLife: 'You were a warrior, athlete, or fiercely independent person. You relied only on yourself and trusted no one.', lesson: 'This life teaches partnership, compromise, and the vulnerability of love. You must learn to need someone.', talent: 'Natural self-reliance, physical courage, ability to survive anything alone.' },
        8: { pastLife: 'You were a banker, landowner, or someone obsessed with material security. You accumulated and hoarded.', lesson: 'This life forces transformation — letting go of control, facing death/rebirth cycles, surrendering to change.', talent: 'Natural investment sense, inheritance likely, ability to transform crisis into opportunity.' },
        9: { pastLife: 'You were a scientist, analyst, or someone deeply focused on details and logic. Your world was small and precise.', lesson: 'This life expands your worldview — travel, philosophy, higher education, and finding meaning beyond facts.', talent: 'Natural problem-solver, analytical mind, precision in everything.' },
        10: { pastLife: 'You were a stay-at-home parent, farmer, or homemaker. Your world revolved around family and land.', lesson: 'This life pushes you into the public spotlight — career ambition, social status, and leaving a legacy.', talent: 'Natural nurturer, green thumb, ability to create comfort anywhere.' },
        11: { pastLife: 'You were an artist, performer, lover, or gambler. Your life was about passion, risk, and self-expression.', lesson: 'This life builds stable friendships and community — learning that not everything is about YOU.', talent: 'Natural charisma, creative genius, ability to light up any room.' },
        12: { pastLife: 'You were a successful businessperson or community leader. Wealth and social influence defined your identity.', lesson: 'This life dissolves worldly attachments — you\'re drawn to spirituality, solitude, and letting go of status.', talent: 'Natural business sense, organizational skill, ability to manifest material goals quickly.' },
      };
      const past = PAST_LIVES[ketuH] || { pastLife: 'Past life details are subtle for this chart.', lesson: 'Your karma is balanced — focus on the present.', talent: 'Adaptability is your past-life gift.' };
      const FUTURE_DIRECTION = {
        1: 'Building a bold, independent identity — become a pioneer, leader, or entrepreneur',
        2: 'Accumulating genuine self-worth and financial stability — becoming truly secure',
        3: 'Mastering communication — writing, speaking, teaching, connecting communities',
        4: 'Creating a beautiful home life — family, emotional security, property',
        5: 'Creative self-expression — art, children, romance, joyful living',
        6: 'Service and health — healing others, systematic improvement, daily excellence',
        7: 'Deep partnership — learning to love, compromise, and build with another person',
        8: 'Transformation and power — occult knowledge, inheritance, psychological depth',
        9: 'Higher wisdom — travel, philosophy, teaching, finding life\'s meaning',
        10: 'Public achievement — career legacy, social status, being remembered',
        11: 'Community and friendship — humanitarian work, networks, collective dreams',
        12: 'Spiritual liberation — meditation, surrender, transcending material reality',
      };
      return { ...past, futureDirection: FUTURE_DIRECTION[rahuH] || 'Carving your own unique path forward', ketuHouse: ketuH, rahuHouse: rahuH };
    })(),
    // ── NEW: Secret Superpower (unique rare chart feature) ──────
    secretSuperpower: (() => {
      const superpowers = [];
      // Vargottama planets = double strength
      for (const [key, p] of Object.entries(planets)) {
        if (key === 'Lagna') continue;
        if (p.isVargottama) superpowers.push(`${p.name} is Vargottama (same sign in birth chart and soul chart) — your ${p.name === 'Mercury' ? 'intelligence' : p.name === 'Venus' ? 'charm and beauty' : p.name === 'Mars' ? 'courage and willpower' : p.name === 'Jupiter' ? 'wisdom and luck' : p.name === 'Saturn' ? 'discipline and endurance' : p.name === 'Moon' ? 'emotional intelligence' : p.name === 'Sun' ? 'leadership and confidence' : 'unique ability'} is DOUBLE STRENGTH. This is rare — less than 1 in 12 people have this.`);
      }
      // Exalted planets
      const exaltMap = { Sun: 1, Moon: 2, Mars: 10, Mercury: 6, Jupiter: 4, Venus: 12, Saturn: 7 };
      for (const [pName, eRashi] of Object.entries(exaltMap)) {
        if (planets[pName.toLowerCase()]?.rashiId === eRashi) superpowers.push(`${pName} is exalted (maximum power) — your ${pName === 'Sun' ? 'confidence is unshakable' : pName === 'Moon' ? 'emotional resilience is extraordinary' : pName === 'Mars' ? 'physical energy and courage are superhuman' : pName === 'Mercury' ? 'intellect is razor-sharp' : pName === 'Jupiter' ? 'wisdom attracts miracles' : pName === 'Venus' ? 'beauty and charm are magnetic' : 'patience is your ultimate weapon'} in ways most people can only dream of.`);
      }
      // Stellium (3+ planets in one house)
      for (const house of houses) {
        const realP = house.planets.filter(p => p.name !== 'Lagna');
        if (realP.length >= 3) superpowers.push(`${realP.length}-planet stellium in house ${house.houseNumber} — MASSIVE concentrated energy in ${house.rashiEnglish}. This area of life is where you have 10x more power than most people. It\'s both your gift and your obsession.`);
      }
      // Retrograde Jupiter or Saturn = past-life wisdom
      if (planets.jupiter?.isRetrograde) superpowers.push('Jupiter retrograde — you came into this life with wisdom already built in. You DON\'T need a guru — you ARE the guru. Your spiritual insights come from within, not from books.');
      if (planets.saturn?.isRetrograde) superpowers.push('Saturn retrograde — you are your own harshest critic, which means you hold yourself to standards nobody else can match. Your discipline, once unlocked, is LEGENDARY.');
      // Neecha Bhanga Raja Yoga (already computed in personality)
      const nbYogas = personality?.neechaBhangaYogas || [];
      for (const nb of nbYogas) {
        if (nb.isRajaYoga) superpowers.push(`${nb.planet} has Neecha Bhanga Raja Yoga — your BIGGEST WEAKNESS is secretly your BIGGEST STRENGTH. What should have held you back actually propels you forward. This is one of the rarest and most powerful yogas in astrology.`);
      }
      if (superpowers.length === 0) superpowers.push('Your superpower is versatility — no single planet dominates, which means you can adapt to ANY situation. Jack of all trades, master of reinvention.');
      return superpowers;
    })(),
    // ── NEW: "If You Were Born 1 Hour Later" ────────────────────
    alternateLife: (() => {
      try {
        const altDate = new Date(date.getTime() + 60 * 60 * 1000); // +1 hour
        const altLagna = getLagna(altDate, lat, lng);
        const altLagnaName = altLagna.rashi.english;
        const currentLagnaName = lagna.rashi.english;
        if (altLagnaName !== currentLagnaName) {
          return {
            changed: true,
            currentLagna: currentLagnaName,
            alternateLagna: altLagnaName,
            impact: `If you were born just 1 hour later, your rising sign would have been ${altLagnaName} instead of ${currentLagnaName}. This would have given you a COMPLETELY different personality, career path, and life trajectory. Your birth time literally defined who you are — a few minutes either way and you'd be a different person.`,
          };
        }
        return {
          changed: false,
          currentLagna: currentLagnaName,
          alternateLagna: currentLagnaName,
          impact: `Even 1 hour later, your rising sign would still be ${currentLagnaName}. You were born firmly in the middle of this sign — your identity is solid and unambiguous. No question about who you are.`,
        };
      } catch (e) {
        return { changed: false, impact: 'Birth time sensitivity data unavailable' };
      }
    })(),
    // ── NEW: Danger Periods (Accident/Crisis Risk Windows) ──────
    dangerPeriods: (() => {
      const marsH = getPlanetHouse('Mars');
      const satH = getPlanetHouse('Saturn');
      const rahuH = getPlanetHouse('Rahu');
      const dangers = [];
      // Mars dasha + afflicted Mars = accident risk
      const marsDasha = dasaPeriods.find(d => d.lord === 'Mars');
      if (marsDasha && (marsH && [1, 6, 8, 12].includes(marsH))) {
        const startYear = parseInt(marsDasha.start?.substring(0, 4), 10);
        const endYear = parseInt(marsDasha.endDate?.substring(0, 4), 10);
        if (!isNaN(startYear) && !isNaN(endYear)) {
          const age1 = startYear - date.getUTCFullYear();
          const age2 = endYear - date.getUTCFullYear();
          if (age1 >= 0 && age1 <= 80) dangers.push({ type: 'Accident/injury risk', period: `${startYear}-${endYear} (age ${age1}-${age2})`, severity: marsH === 8 ? 'HIGH' : 'MODERATE', advice: 'Extra caution with vehicles, machinery, fire. Avoid reckless behavior. Get health insurance.' });
        }
      }
      // Saturn dasha + Saturn in 8th = health crisis
      const satDasha = dasaPeriods.find(d => d.lord === 'Saturn');
      if (satDasha && satH && [6, 8, 12].includes(satH)) {
        const startYear = parseInt(satDasha.start?.substring(0, 4), 10);
        const endYear = parseInt(satDasha.endDate?.substring(0, 4), 10);
        if (!isNaN(startYear) && !isNaN(endYear)) {
          const age1 = startYear - date.getUTCFullYear();
          const age2 = endYear - date.getUTCFullYear();
          if (age1 >= 0 && age1 <= 80) dangers.push({ type: 'Health crisis / life restructuring', period: `${startYear}-${endYear} (age ${age1}-${age2})`, severity: satH === 8 ? 'HIGH' : 'MODERATE', advice: 'Regular health checkups, avoid overwork, prioritize rest. This period also brings transformation.' });
        }
      }
      // Rahu dasha + Rahu in 8th = sudden unexpected event
      const rahuDasha = dasaPeriods.find(d => d.lord === 'Rahu');
      if (rahuDasha && rahuH && [1, 8].includes(rahuH)) {
        const startYear = parseInt(rahuDasha.start?.substring(0, 4), 10);
        const endYear = parseInt(rahuDasha.endDate?.substring(0, 4), 10);
        if (!isNaN(startYear) && !isNaN(endYear)) {
          const age1 = startYear - date.getUTCFullYear();
          const age2 = endYear - date.getUTCFullYear();
          if (age1 >= 0 && age1 <= 80) dangers.push({ type: 'Sudden unexpected event / identity crisis', period: `${startYear}-${endYear} (age ${age1}-${age2})`, severity: rahuH === 8 ? 'HIGH' : 'MODERATE', advice: 'Avoid risky investments, be careful with unknown people, keep emergency savings.' });
        }
      }
      if (dangers.length === 0) dangers.push({ type: 'No major danger periods flagged', period: 'N/A', severity: 'LOW', advice: 'General caution during challenging life phases is always recommended.' });
      return dangers;
    })(),
    // ── NEW: Spirit Animal ──────────────────────────────────────
    spiritAnimal: (() => {
      const LAGNA_ANIMALS = {
        Mesha: { animal: '🐺 Wolf', meaning: 'You lead the pack or walk alone. Fiercely independent, protective of your tribe, and relentless once you set a target.' },
        Vrishabha: { animal: '🐂 Bull', meaning: 'Slow to anger, unstoppable once provoked. You value comfort, territory, and loyalty above all else.' },
        Mithuna: { animal: '🦊 Fox', meaning: 'Quick-witted, adaptable, and always three steps ahead. You talk your way out of anything.' },
        Kataka: { animal: '🐢 Turtle', meaning: 'You carry your home on your back. Hard shell outside, impossibly soft inside. You never forget kindness or betrayal.' },
        Simha: { animal: '🦁 Lion', meaning: 'Born to rule. You don\'t compete — you dominate. Your presence commands attention without trying.' },
        Kanya: { animal: '🦉 Owl', meaning: 'You see what others miss. Silent observer, precise thinker, master of detail. You hunt when others sleep.' },
        Tula: { animal: '🦋 Butterfly', meaning: 'Beautiful, social, and transformative. You bring beauty to every environment and connect everyone around you.' },
        Vrischika: { animal: '🦅 Eagle', meaning: 'You see from heights others can\'t reach. Laser focus, fearless dive into the unknown, and a vision that pierces through lies.' },
        Dhanus: { animal: '🐎 Horse', meaning: 'Born to run free. Cannot be caged, cannot be tamed. Your spirit needs open roads and big adventures.' },
        Makara: { animal: '🐐 Mountain Goat', meaning: 'You climb where others quit. Slow, steady, relentless. The summit is yours — it\'s just a matter of time.' },
        Kumbha: { animal: '🦈 Shark', meaning: 'You never stop moving forward. Unconventional, misunderstood, and absolutely lethal when underestimated.' },
        Meena: { animal: '🐬 Dolphin', meaning: 'Intelligent, playful, emotional, and deeply connected to the unseen world. You navigate through life using intuition, not logic.' },
      };
      return LAGNA_ANIMALS[lagnaName] || { animal: '🐉 Dragon', meaning: 'Mythical, rare, and impossible to categorize. You don\'t fit into any box.' };
    })(),
    // ── NEW: Celebrity Chart Twin ───────────────────────────────
    celebrityTwin: (() => {
      // Match based on Lagna + Moon sign combination — not exact but engaging
      const combos = {
        'Simha_Vrishabha': { name: 'Barack Obama', reason: 'Leo rising + Taurus Moon — charismatic leader with grounded emotional intelligence' },
        'Simha_Mesha': { name: 'Madonna', reason: 'Leo rising + Aries Moon — bold performer with warrior instincts' },
        'Vrischika_Mesha': { name: 'Bill Gates', reason: 'Scorpio rising + Aries Moon — intense focus with pioneering ambition' },
        'Kanya_Vrischika': { name: 'Beyoncé', reason: 'Virgo rising + Scorpio Moon — perfectionist with deep emotional power' },
        'Mesha_Simha': { name: 'Steve Jobs', reason: 'Aries rising + Leo Moon — visionary leader with creative fire' },
        'Vrishabha_Kataka': { name: 'Queen Elizabeth II', reason: 'Taurus rising + Cancer Moon — stability personified with deep emotional duty' },
        'Mithuna_Kumbha': { name: 'Angelina Jolie', reason: 'Gemini rising + Aquarius Moon — humanitarian communicator with rebel heart' },
        'Makara_Kataka': { name: 'Jeff Bezos', reason: 'Capricorn rising + Cancer Moon — empire builder with hidden emotional core' },
        'Dhanus_Simha': { name: 'Brad Pitt', reason: 'Sagittarius rising + Leo Moon — adventurous spirit with star quality' },
        'Tula_Meena': { name: 'Mahatma Gandhi', reason: 'Libra rising + Pisces Moon — diplomat and spiritual force for change' },
        'Kataka_Vrishabha': { name: 'Princess Diana', reason: 'Cancer rising + Taurus Moon — nurturing heart with unwavering grace' },
        'Meena_Vrischika': { name: 'Albert Einstein', reason: 'Pisces rising + Scorpio Moon — dreamy genius with penetrating insight' },
        'Kumbha_Mithuna': { name: 'Oprah Winfrey', reason: 'Aquarius rising + Gemini Moon — revolutionary communicator who changed the world through conversation' },
        'Simha_Mithuna': { name: 'Donald Trump', reason: 'Leo rising + Gemini Moon — commanding presence with restless communication style' },
        'Mesha_Vrishabha': { name: 'Lady Gaga', reason: 'Aries rising + Taurus Moon — fierce creative warrior with sensual artistic depth' },
        'Tula_Simha': { name: 'Shah Rukh Khan', reason: 'Libra rising + Leo Moon — charming diplomat with king-like pride and showmanship' },
        'Vrishabha_Meena': { name: 'Adele', reason: 'Taurus rising + Pisces Moon — grounded beauty with oceanic emotional depth in her art' },
        'Kataka_Makara': { name: 'Elon Musk', reason: 'Cancer rising + Capricorn Moon — nurturing visionary with relentless ambition' },
      };
      const key = `${lagnaName}_${moonRashi.name}`;
      const match = combos[key];
      if (match) return match;
      // Fallback: match by Lagna only
      const lagnaFallback = {
        Mesha: { name: 'Cristiano Ronaldo', reason: 'Aries rising — relentless drive, competitive fire, refuses to lose' },
        Vrishabha: { name: 'David Beckham', reason: 'Taurus rising — effortless style, loyal to the core, builds lasting empires' },
        Mithuna: { name: 'Kendrick Lamar', reason: 'Gemini rising — genius with words, dual nature, constantly evolving' },
        Kataka: { name: 'Selena Gomez', reason: 'Cancer rising — emotional authenticity, protective of loved ones, public vulnerability' },
        Simha: { name: 'Jennifer Lopez', reason: 'Leo rising — star power that doesn\'t dim, commands every room' },
        Kanya: { name: 'Keanu Reeves', reason: 'Virgo rising — humble perfection, quietly excellent, beloved by everyone' },
        Tula: { name: 'Kim Kardashian', reason: 'Libra rising — beauty, partnerships, and building an empire through image' },
        Vrischika: { name: 'Virat Kohli', reason: 'Scorpio rising — intense, passionate, transforms pressure into power' },
        Dhanus: { name: 'Taylor Swift', reason: 'Sagittarius rising — storyteller, adventurer, turns personal life into art' },
        Makara: { name: 'LeBron James', reason: 'Capricorn rising — built from nothing, climbed to the absolute top through discipline' },
        Kumbha: { name: 'Harry Styles', reason: 'Aquarius rising — breaks all rules, gender-fluid icon, beloved rebel' },
        Meena: { name: 'Rihanna', reason: 'Pisces rising — creative visionary, effortless cool, spiritual depth behind the glamour' },
      };
      return lagnaFallback[lagnaName] || { name: 'A unique soul', reason: 'Your chart combination is rare — no exact celebrity match found, which means YOU are the first of your kind' };
    })(),
    // ── NEW: "What Your Ex Would Say About You" ─────────────────
    exWouldSay: (() => {
      const venH = getPlanetHouse('Venus');
      const marsH = getPlanetHouse('Mars');
      const moonH = getPlanetHouse('Moon');
      const lines = [];
      // Venus-based
      if (venH === 1) lines.push('"They were the most attractive person I\'ve ever been with. But they knew it too well."');
      if (venH === 7) lines.push('"They loved me like I was the only person in the world. When it was good, it was INCREDIBLE."');
      if (venH === 12) lines.push('"I never really knew what they were thinking. There was always a hidden part of them I couldn\'t reach."');
      if (venH === 5) lines.push('"Life with them was an adventure — romantic, spontaneous, full of laughter."');
      if (venH === 8) lines.push('"The passion was overwhelming. But so was the intensity. Everything was all or nothing."');
      if (venH === 10) lines.push('"They chose their career over me. I was always second to their ambition."');
      if (venH === 4) lines.push('"They wanted a perfect home life so badly that they smothered me with expectations."');
      if (venH === 6) lines.push('"They showed love by doing things for me, not saying them. I wish they had just said \'I love you\' more."');
      // Mars-based
      if (marsH === 7) lines.push('"The arguments were EPIC. But so was the makeup. We were either fighting or... you know."');
      if (marsH === 1) lines.push('"They always had to be right. ALWAYS. It was exhausting but also kind of impressive."');
      if (marsH === 12) lines.push('"They were secretly angry about things they never told me. One day it all came out at once."');
      // Moon-based
      if (moonH === 8) lines.push('"They understood me on a level that was almost scary. They knew things about me I didn\'t even know."');
      if (moonH === 12) lines.push('"They were the most emotionally unavailable person I\'ve ever loved. I never knew where I stood."');
      if (moonH === 4) lines.push('"They turned me into a better person. Also, they\'re the best cook I know."');
      if (moonH === 1) lines.push('"They were SO emotional. Happy, sad, angry — all in one day. But their love was the realest thing I\'ve ever felt."');
      // Lagna-based fallback
      if (lines.length === 0) {
        if (lagnaElement === 'fire') lines.push('"They burned bright and burned out. Incredible while it lasted."');
        if (lagnaElement === 'earth') lines.push('"Loyal to a fault. Sometimes too stubborn to admit they were wrong, but they always came back."');
        if (lagnaElement === 'air') lines.push('"Great conversation, terrible at showing up emotionally. They lived in their head."');
        if (lagnaElement === 'water') lines.push('"I\'ve never been loved so deeply. But I\'ve also never been guilt-tripped so effectively."');
      }
      return lines;
    })(),
    // ── NEW: Age You'll Peak (Life's Golden Period) ─────────────
    goldenPeriod: (() => {
      // Find the strongest dasha lord and its period
      const dashaStrengths = dasaPeriods.map(d => {
        const funcNature = getFunctionalNature(lagnaName, d.lord);
        const lordScore = getHealthScore(d.lord.toLowerCase());
        const ruledHouses = [];
        for (let i = 1; i <= 12; i++) { if (getHouseLord(i) === d.lord) ruledHouses.push(i); }
        const hasKendra = ruledHouses.some(h => [1, 4, 7, 10].includes(h));
        const hasTrikona = ruledHouses.some(h => [1, 5, 9].includes(h));
        let power = lordScore;
        if (funcNature === 'benefic' || funcNature === 'yogaKaraka') power += 20;
        if (hasKendra && hasTrikona) power += 15; // Yoga karaka type
        if (hasKendra) power += 10;
        if (hasTrikona) power += 10;
        if (funcNature === 'malefic') power -= 15;
        return { ...d, power, funcNature };
      });
      const golden = dashaStrengths
        .filter(d => {
          const sy = parseInt(d.start?.substring(0, 4), 10);
          const ey = parseInt(d.endDate?.substring(0, 4), 10);
          const age1 = sy - date.getUTCFullYear();
          const age2 = ey - date.getUTCFullYear();
          return !isNaN(age1) && age1 >= 16 && age2 <= 75; // prime life, end before 75
        })
        .sort((a, b) => {
          // Prefer earlier period if power difference is small (< 10)
          if (Math.abs(b.power - a.power) < 10) {
            return parseInt(a.start?.substring(0, 4), 10) - parseInt(b.start?.substring(0, 4), 10);
          }
          return b.power - a.power;
        })[0];
      if (golden) {
        const startYear = parseInt(golden.start?.substring(0, 4), 10);
        const endYear = parseInt(golden.endDate?.substring(0, 4), 10);
        if (!isNaN(startYear) && !isNaN(endYear)) {
          const age1 = startYear - date.getUTCFullYear();
          const age2 = endYear - date.getUTCFullYear();
          const midAge = Math.round((age1 + age2) / 2);
          return {
            period: `${startYear} to ${endYear}`,
            ageRange: `${age1} to ${age2}`,
            peakAge: midAge,
            lord: golden.lord,
            description: `Your golden period is age ${age1} to ${age2} (${startYear}-${endYear}). This is when life fires on all cylinders — career peaks, relationships deepen, wealth grows, and you feel most alive. Mark this on your calendar.`,
          };
        }
      }
      return { description: 'Your peak comes through sustained effort across multiple periods — no single "golden age" but consistent growth.' };
    })(),
    // ── NEW: Lagna cusp warning ─────────────────────────────────
    lagnaCuspWarning: lagnaCuspWarning,
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 21: PHYSICAL PROFILE — ශරීරය හා මනස
  // Multi-layer analysis: Lagna + Planets in 1st + Lagna Lord + Moon + Navamsha + D3 + Shadbala
  // ══════════════════════════════════════════════════════════════
  const physicalProfile = (() => {
    // ── Layer 1: Lagna sign base traits ──
    const LAGNA_BODY = {
      'Mesha': { build: 'Medium, athletic, muscular', height: 'Average to tall', face: 'Angular face, prominent forehead, sharp jawline', complexion: 'Wheatish to reddish warm tone', hair: 'Coarse, dark hair — may thin early', eyes: 'Sharp, intense, slightly narrow', nose: 'Pointed, medium', lips: 'Thin, firm', bodyType: 'Mesomorph — naturally muscular', gait: 'Quick, purposeful walk', voice: 'Loud, commanding' },
      'Vrishabha': { build: 'Solid, stocky, strong', height: 'Short to medium', face: 'Round or square, pleasant, full cheeks', complexion: 'Fair to wheatish, smooth skin', hair: 'Thick, lustrous, dark', eyes: 'Beautiful, large, calm', nose: 'Well-shaped, slightly wide', lips: 'Full, sensuous', bodyType: 'Endomorph — tendency to gain weight', gait: 'Slow, graceful, steady', voice: 'Sweet, melodious' },
      'Mithuna': { build: 'Slim, agile, lean', height: 'Tall and lean', face: 'Oval, youthful, expressive', complexion: 'Fair, clear skin', hair: 'Fine, wavy or straight', eyes: 'Bright, curious, constantly moving', nose: 'Long, thin', lips: 'Thin, expressive', bodyType: 'Ectomorph — naturally thin', gait: 'Quick, restless, fidgety', voice: 'Fast-paced, witty' },
      'Kataka': { build: 'Soft, rounded, full', height: 'Short to medium', face: 'Round, moon-like, gentle, soft features', complexion: 'Pale to fair, luminous', hair: 'Soft, wavy, fine-textured', eyes: 'Large, watery, emotional, expressive', nose: 'Small, soft', lips: 'Soft, pouty', bodyType: 'Endomorph — retains water, soft body', gait: 'Sideways or swaying walk', voice: 'Soft, nurturing' },
      'Simha': { build: 'Broad-chested, commanding, strong upper body', height: 'Medium to tall', face: 'Broad, lion-like, dignified, prominent chin', complexion: 'Fair to golden, radiant', hair: 'Thick, flowing — like a mane', eyes: 'Commanding, proud, large', nose: 'Prominent, regal', lips: 'Full, confident', bodyType: 'Mesomorph — naturally authoritative build', gait: 'Confident, chest-forward stride', voice: 'Deep, authoritative, theatrical' },
      'Kanya': { build: 'Slim, delicate, well-proportioned', height: 'Medium', face: 'Oval, refined, clear skin, symmetrical', complexion: 'Fair, unblemished', hair: 'Straight, neat, well-groomed', eyes: 'Intelligent, analytical, slightly narrow', nose: 'Straight, elegant', lips: 'Thin, precise', bodyType: 'Ectomorph — stays lean, dislikes excess', gait: 'Precise, measured steps', voice: 'Clear, articulate' },
      'Tula': { build: 'Well-proportioned, balanced, attractive figure', height: 'Medium to tall', face: 'Symmetrical, beautiful, dimples possible', complexion: 'Fair, glowing, smooth', hair: 'Silky, lustrous, well-maintained', eyes: 'Attractive, charming, almond-shaped', nose: 'Well-shaped, proportionate', lips: 'Full, beautiful smile', bodyType: 'Balanced — neither heavy nor thin', gait: 'Graceful, elegant', voice: 'Harmonious, pleasant' },
      'Vrischika': { build: 'Compact, muscular, wiry', height: 'Medium, stocky', face: 'Intense, angular, prominent brow', complexion: 'Medium to dark, magnetic', hair: 'Dark, thick, coarse', eyes: 'Piercing, magnetic, hypnotic — most powerful eyes in the zodiac', nose: 'Sharp, hawk-like', lips: 'Firm, controlled', bodyType: 'Mesomorph — dense muscle, strong', gait: 'Slow, deliberate, intense', voice: 'Low, penetrating' },
      'Dhanus': { build: 'Large, well-proportioned, athletic', height: 'Tall — often tallest in the room', face: 'Long, dignified, high forehead', complexion: 'Wheatish to fair, healthy glow', hair: 'Thinning tendency, may recede', eyes: 'Bright, enthusiastic, wide-set', nose: 'Large, prominent', lips: 'Full, smiling', bodyType: 'Mesomorph-Endomorph — big-boned, weight gain after 30', gait: 'Long strides, energetic', voice: 'Loud, jovial, booming' },
      'Makara': { build: 'Lean in youth, fills out with age — reverse aging', height: 'Short to medium', face: 'Bony, angular, mature-looking, prominent cheekbones', complexion: 'Dark to wheatish, rough texture', hair: 'Dark, thin, may grey early', eyes: 'Deep-set, serious, calculating', nose: 'Long, thin, bony', lips: 'Thin, firm', bodyType: 'Ectomorph to Mesomorph — thin youth, stronger later', gait: 'Slow, careful, deliberate', voice: 'Dry, matter-of-fact' },
      'Kumbha': { build: 'Tall, well-built, unusual proportions', height: 'Tall', face: 'Unique features, prominent forehead, unconventional look', complexion: 'Mixed — can be any shade', hair: 'Unusual style or texture', eyes: 'Dreamy, far-away look, distinctive', nose: 'Prominent, unusual shape', lips: 'Unique, expressive', bodyType: 'Ectomorph — tall, lean', gait: 'Distinctive, unusual walk', voice: 'Unique pitch or cadence' },
      'Meena': { build: 'Soft, fleshy, rounded', height: 'Short to medium', face: 'Round, gentle, dreamy, compassionate features', complexion: 'Fair to pale, translucent quality', hair: 'Soft, fine, wavy', eyes: 'Large, expressive, watery, doe-like — beautiful eyes', nose: 'Small, soft, button-like', lips: 'Full, soft', bodyType: 'Endomorph — soft body, weight fluctuates with emotions', gait: 'Floating, slightly pigeon-toed', voice: 'Soft, musical, soothing' },
    };

    const base = LAGNA_BODY[lagnaName] || {};

    // ── Layer 2: Planet-in-1st-house modifications ──
    const h1PlanetsForPhysical = h1?.planetsInHouse || [];
    const planetMods = [];
    const complexionMods = [];
    const heightMods = [];
    const buildMods = [];

    h1PlanetsForPhysical.forEach(p => {
      if (p === 'Sun') { heightMods.push('+tall'); complexionMods.push('golden/warm undertone'); buildMods.push('strong upper body'); planetMods.push('Sun in 1st: adds authority to presence, golden complexion, taller stature, commanding aura. People notice you when you enter a room.'); }
      if (p === 'Moon') { complexionMods.push('pale/luminous'); buildMods.push('soft/rounded features'); planetMods.push('Moon in 1st: rounder face, softer body, luminous skin, changing appearance with mood. Eyes are especially expressive.'); }
      if (p === 'Mars') { buildMods.push('muscular/athletic'); complexionMods.push('reddish/ruddy'); planetMods.push('Mars in 1st: adds muscular definition, athletic build, scars or marks on face/head likely. Aggressive walk, intense energy.'); }
      if (p === 'Mercury') { heightMods.push('+youthful'); planetMods.push('Mercury in 1st: youthful appearance — looks younger than actual age. Quick movements, expressive hands, clear skin.'); }
      if (p === 'Jupiter') { buildMods.push('larger/fuller frame'); heightMods.push('+tall'); planetMods.push('Jupiter in 1st: adds weight and fullness to the body, larger frame, wise/kind expression. Tendency to gain weight after marriage.'); }
      if (p === 'Venus') { complexionMods.push('fair/attractive/glowing'); planetMods.push('Venus in 1st: SIGNIFICANTLY enhances beauty and attractiveness. Fair complexion, symmetrical features, charming smile, magnetic presence. People find you naturally attractive.'); }
      if (p === 'Saturn') { buildMods.push('lean/bony'); complexionMods.push('darker'); heightMods.push('-shorter'); planetMods.push('Saturn in 1st: lean/thin build, prominent bone structure, older appearance in youth but ages well (reverse aging). Dark circles possible.'); }
      if (p === 'Rahu') { heightMods.push('+tall'); planetMods.push('Rahu in 1st: unusual or exotic appearance, tall, unique features that stand out. May have an unconventional beauty — people can\'t stop looking at you.'); }
      if (p === 'Ketu') { planetMods.push('Ketu in 1st: lean, spiritual look, thin build, detached expression, may have a mark or scar on the head. Intense eyes with a far-away quality.'); }
    });

    // ── Layer 3: Lagna Lord dignity & house placement ──
    const lagnaLordName = lagna.rashi.lord;
    const lagnaLordHouseP = getPlanetHouse(lagnaLordName);
    const lagnaLordScore = getHealthScore(lagnaLordName.toLowerCase());
    const lagnaLordDignity = planetStrengths[lagnaLordName.toLowerCase()]?.dignityLevel || '';

    let lagnaLordEffect = '';
    if (lagnaLordDignity === 'Exalted') lagnaLordEffect = `${lagnaLordName} is EXALTED — physical appearance is at its peak potential. You look better than your Lagna alone suggests. Excellent vitality, glowing complexion, magnetic aura.`;
    else if (lagnaLordDignity === 'Own Sign' || lagnaLordDignity === 'Moolatrikona') lagnaLordEffect = `${lagnaLordName} in own sign — strong natural appearance, good vitality, features are well-defined.`;
    else if (lagnaLordDignity === 'Debilitated') lagnaLordEffect = `${lagnaLordName} is debilitated — physical stamina may be lower, appearance may not fully express Lagna potential. Health consciousness is important.`;
    else if (lagnaLordDignity === 'Friendly') lagnaLordEffect = `${lagnaLordName} in friendly sign — above average appearance and vitality.`;
    else lagnaLordEffect = `${lagnaLordName} in neutral/enemy sign — average expression of Lagna characteristics.`;

    // ── Layer 4: Moon sign influence on emotional body/face ──
    const MOON_FACE = {
      'Mesha': 'Resting serious face — emotions show as irritation or intensity',
      'Vrishabha': 'Calm, pleasant resting face — naturally looks serene and approachable',
      'Mithuna': 'Constantly changing expressions — face mirrors every thought',
      'Kataka': 'Soft, nurturing expression — face shows concern and care easily',
      'Simha': 'Proud, dignified expression — resting confident face',
      'Kanya': 'Neat, composed expression — rarely shows extreme emotions on face',
      'Tula': 'Balanced, smiling expression — naturally charming facial energy',
      'Vrischika': 'Intense, piercing expression — intimidating to strangers',
      'Dhanus': 'Open, smiling expression — naturally jovial and approachable',
      'Makara': 'Serious, stern expression — resting stern face that softens with age',
      'Kumbha': 'Detached, dreamy expression — seems lost in thought',
      'Meena': 'Gentle, compassionate expression — eyes often look slightly sad or dreamy',
    };
    const moonFace = MOON_FACE[moonRashi.name] || '';

    // ── Layer 5: Navamsha (D9) Lagna — the inner/hidden appearance ──
    const navLagnaSign = navamsha?.lagna?.rashi?.name || '';
    const navLagnaEn = navamsha?.lagna?.rashi?.english || '';
    const NAV_APPEARANCE = {
      'Mesha': 'Inner fire makes you look more energetic and youthful than your age',
      'Vrishabha': 'Inner beauty — you become more attractive with age, aging like fine wine',
      'Mithuna': 'You maintain a youthful, playful appearance throughout life',
      'Kataka': 'Soft inner glow — your kindness shows on your face and makes you beautiful',
      'Simha': 'Inner royalty — you carry yourself with increasing dignity as you mature',
      'Kanya': 'Clean, pure appearance — you age gracefully with minimal signs of aging',
      'Tula': 'Deep inner beauty — your attractiveness increases after marriage',
      'Vrischika': 'Magnetic intensity — your presence becomes more powerful with age',
      'Dhanus': 'Wisdom glow — your face reflects accumulated wisdom and looks distinguished',
      'Makara': 'Reverse aging — you look better at 40 than at 20',
      'Kumbha': 'Unique timeless look — you never look "typical" for your age',
      'Meena': 'Spiritual glow — your compassion and sensitivity give you an ethereal beauty',
    };
    const navAppearance = NAV_APPEARANCE[navLagnaSign] || '';

    // ── Layer 6: Ascendant degree — first/middle/last decan modifiers ──
    const lagnaDecan = lagnaDegreeInSign < 10 ? 1 : lagnaDegreeInSign < 20 ? 2 : 3;
    let decanEffect = '';
    if (lagnaDecan === 1) decanEffect = 'First decan — purest expression of Lagna sign appearance. Strong identification with Lagna traits.';
    else if (lagnaDecan === 2) decanEffect = 'Second decan — modified by the next sign in the same element. Features are slightly different from pure Lagna.';
    else decanEffect = 'Third decan — influenced by the third sign of the element. Mixed appearance that combines two sign energies.';

    // ── Layer 7: Venus strength = beauty quotient ──
    const venusScore = getHealthScore('venus');
    const venusDignity = planetStrengths.venus?.dignityLevel || '';
    const venusH = getPlanetHouse('Venus');
    let beautyNote = '';
    if (venusDignity === 'Exalted') beautyNote = 'Venus EXALTED — exceptionally attractive. Natural beauty, glowing skin, charming presence. Among the most beautiful chart placements possible.';
    else if (venusDignity === 'Own Sign') beautyNote = 'Venus in own sign — naturally attractive, good sense of style, pleasant appearance.';
    else if (venusScore >= 65) beautyNote = 'Strong Venus — above average attractiveness, good grooming instinct, pleasant features.';
    else if (venusScore >= 45) beautyNote = 'Average Venus — standard appearance, attractiveness comes from personality more than looks.';
    else beautyNote = 'Weak Venus — beauty may not be a defining trait, but other planet influences can compensate.';
    if (venusH === 1) beautyNote += ' Venus in 1st house DOUBLES beauty — you are exceptionally attractive.';
    if (venusH === 7) beautyNote += ' Venus in 7th — your partner finds you irresistibly attractive.';

    // ── Layer 8: Aspects on 1st house — external influences on appearance ──
    const aspectsOn1st = h1?.aspectingPlanets || [];
    const aspectEffects = [];
    aspectsOn1st.forEach(asp => {
      const pName = asp.planet || asp;
      if (pName === 'Jupiter') aspectEffects.push('Jupiter aspects Lagna — adds weight, wise look, protective aura. Gains weight easily after 30.');
      if (pName === 'Saturn') aspectEffects.push('Saturn aspects Lagna — lean appearance, serious expression, looks older than age in youth but ages well.');
      if (pName === 'Mars') aspectEffects.push('Mars aspects Lagna — adds intensity to look, athletic energy, possible scars or marks.');
      if (pName === 'Venus') aspectEffects.push('Venus aspects Lagna — enhances beauty, adds charm and softness to appearance.');
      if (pName === 'Rahu') aspectEffects.push('Rahu aspects Lagna — unusual or exotic appearance, tall, stands out in a crowd.');
      if (pName === 'Moon') aspectEffects.push('Moon aspects Lagna — soft features, emotional expression, weight fluctuates with mood.');
    });

    // ── Layer 9: Mental temperament from Moon + Mercury + Jupiter ──
    const mercuryHouse = getPlanetHouse('Mercury');
    const mercuryScore = getHealthScore('mercury');
    const moonScore = getHealthScore('moon');
    const jupScore = getHealthScore('jupiter');

    const MOON_ELEMENT_MIND = {
      'fire': 'Passionate, impulsive, quick-tempered, courageous. Acts first, thinks later. High energy but short fuse.',
      'earth': 'Practical, grounded, methodical, patient. Thinks before acting. Slow to anger but holds grudges.',
      'air': 'Intellectual, social, restless, analytical. Overthinks everything. Needs constant mental stimulation.',
      'water': 'Emotional, intuitive, sensitive, deep. Feels everything at 10x intensity. Absorbs others\' emotions.',
    };

    const mentalTemperament = MOON_ELEMENT_MIND[moonElement] || 'Balanced mental nature.';

    let intellectLevel = '';
    if (mercuryScore >= 70) intellectLevel = 'Exceptionally sharp mind — quick learner, excellent memory, analytical thinker.';
    else if (mercuryScore >= 55) intellectLevel = 'Above average intelligence — good with details, logical, articulate.';
    else if (mercuryScore >= 40) intellectLevel = 'Average mental ability — practical thinker, learns through experience.';
    else intellectLevel = 'Mind may be scattered or anxious — needs grounding practices for focus.';

    let emotionalDepth = '';
    if (moonScore >= 70) emotionalDepth = 'Emotionally very strong — resilient, nurturing, stable inner world.';
    else if (moonScore >= 55) emotionalDepth = 'Emotionally balanced — healthy emotional processing, moderate sensitivity.';
    else if (moonScore >= 40) emotionalDepth = 'Emotionally sensitive — mood swings, needs emotional support system.';
    else emotionalDepth = 'Emotionally vulnerable — prone to anxiety, depression, or emotional overwhelm. Self-care is critical.';

    let wisdomLevel = '';
    if (jupScore >= 70) wisdomLevel = 'Naturally wise — good judgment, philosophical mind, people seek your advice.';
    else if (jupScore >= 55) wisdomLevel = 'Above average wisdom — learns from experience, growing philosophical with age.';
    else if (jupScore >= 40) wisdomLevel = 'Average wisdom — practical common sense, may lack philosophical depth.';
    else wisdomLevel = 'Wisdom comes late — may make poor judgments early in life but learns eventually.';

    // ── Layer 10: Attractiveness composite score ──
    let attractScore = 50; // base
    if (venusDignity === 'Exalted') attractScore += 25;
    else if (venusDignity === 'Own Sign' || venusDignity === 'Moolatrikona') attractScore += 15;
    else if (venusDignity === 'Friendly') attractScore += 8;
    else if (venusDignity === 'Debilitated') attractScore -= 15;
    if (venusH === 1) attractScore += 15;
    if (venusH === 7) attractScore += 10;
    if (h1PlanetsForPhysical.includes('Venus')) attractScore += 15;
    if (lagnaLordDignity === 'Exalted') attractScore += 10;
    else if (lagnaLordDignity === 'Debilitated') attractScore -= 10;
    if (['Tula', 'Vrishabha', 'Meena'].includes(lagnaName)) attractScore += 5; // beauty signs
    if (aspectsOn1st.some(a => (a.planet || a) === 'Venus')) attractScore += 8;
    if (h1PlanetsForPhysical.includes('Rahu')) attractScore += 5; // exotic beauty
    if (h1PlanetsForPhysical.includes('Saturn')) attractScore -= 5;
    attractScore = Math.max(15, Math.min(98, attractScore)); // clamp
    const attractLevel = attractScore >= 85 ? 'Exceptionally attractive' : attractScore >= 70 ? 'Very attractive' : attractScore >= 55 ? 'Above average' : attractScore >= 40 ? 'Average' : 'Below average but unique';

    // ── Layer 11: Planet maturation ages — "Superpower Age" ──
    const MATURATION_AGES = { Sun: 22, Moon: 24, Mars: 28, Mercury: 32, Jupiter: 16, Venus: 25, Saturn: 36, Rahu: 42, Ketu: 48 };
    const strongestPlanet = (() => {
      let best = 'Sun';
      let bestScore = 0;
      ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].forEach(p => {
        const sc = getHealthScore(p.toLowerCase());
        if (sc > bestScore) { bestScore = sc; best = p; }
      });
      return { planet: best, score: bestScore, maturationAge: MATURATION_AGES[best] || 30 };
    })();

    return {
      title: 'Physical Profile & Body Constitution',
      sinhala: 'ශරීරය හා මනස',
      // Base from Lagna
      lagnaSign: lagnaName,
      lagnaEnglish: lagna.rashi.english,
      base: base,
      // Planet modifications
      planetsIn1st: h1PlanetsForPhysical,
      planetModifications: planetMods,
      complexionModifiers: complexionMods,
      heightModifiers: heightMods,
      buildModifiers: buildMods,
      // Lagna lord analysis
      lagnaLord: { name: lagnaLordName, house: lagnaLordHouseP, score: lagnaLordScore, dignity: lagnaLordDignity, effect: lagnaLordEffect },
      // Moon influence
      moonSign: moonRashi.name,
      moonSignEnglish: moonRashi.english,
      moonFacialExpression: moonFace,
      moonElement: moonElement,
      mentalTemperament: mentalTemperament,
      // Mind profile
      intellect: intellectLevel,
      emotionalDepth: emotionalDepth,
      wisdom: wisdomLevel,
      mercuryStrength: mercuryScore,
      moonStrength: moonScore,
      jupiterStrength: jupScore,
      // Beauty & appearance
      venusAnalysis: { score: venusScore, dignity: venusDignity, house: venusH, note: beautyNote },
      attractivenessScore: attractScore,
      attractivenessLevel: attractLevel,
      // Navamsha inner appearance
      navamshaLagna: navLagnaSign,
      navamshaLagnaEnglish: navLagnaEn,
      navamshaAppearance: navAppearance,
      // Decan
      lagnaDecan: lagnaDecan,
      decanEffect: decanEffect,
      // Aspects
      aspectsOnLagna: aspectEffects,
      // Superpower age
      superpowerAge: strongestPlanet,
      // Shadbala-based body constitution
      bodyConstitution: (() => {
        const marsScore = getHealthScore('mars');
        const saturnScore = getHealthScore('saturn');
        const stamina = marsScore >= 60 ? 'High stamina — naturally energetic' : marsScore >= 40 ? 'Moderate stamina' : 'Low stamina — needs regular exercise';
        const endurance = saturnScore >= 60 ? 'Good long-term endurance — can work long hours' : saturnScore >= 40 ? 'Average endurance' : 'Tires easily — needs adequate rest';
        const immunity = (jupScore + moonScore) / 2 >= 55 ? 'Strong natural immunity' : 'Immune system needs support — diet and lifestyle important';
        return { stamina, endurance, immunity };
      })(),
    };
  })();

  // ══════════════════════════════════════════════════════════════
  // SECTION 22: ATTRACTION PROFILE — ආකර්ෂණ බලය
  // How the opposite gender perceives, what type attracts, love language, sexual energy
  // ══════════════════════════════════════════════════════════════
  const attractionProfile = (() => {
    const venusH = getPlanetHouse('Venus');
    const marsH = getPlanetHouse('Mars');
    const h7Data = analyzeHouse(7, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
    const h7Rashi = h7Data?.rashi || '';
    const h7RashiEn = h7Data?.rashiEnglish || '';
    const lord7 = getHouseLord(7);
    const lord7H = getPlanetHouse(lord7);
    const h8Data = analyzeHouse(8, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
    const lagnaLordName2 = lagna.rashi.lord;
    const lagnaLordDignity = planetStrengths[lagnaLordName2.toLowerCase()]?.dignityLevel || '';
    const navLagnaEn = navamsha?.lagna?.rashi?.english || '';
    const MOON_FACE = {
      'Mesha': 'Sharp, intense eyes — fiery emotional expression',
      'Vrishabha': 'Soft, beautiful face — calm and sensual expression',
      'Mithuna': 'Youthful, expressive face — always animated',
      'Kataka': 'Round, nurturing face — emotionally transparent',
      'Simha': 'Regal, proud expression — commanding presence',
      'Kanya': 'Refined, delicate features — intelligent gaze',
      'Tula': 'Symmetrical, attractive face — natural charm',
      'Vrischika': 'Intense, magnetic eyes — penetrating gaze',
      'Dhanus': 'Open, jovial face — optimistic expression',
      'Makara': 'Structured, serious face — mature beyond years',
      'Kumbha': 'Unique, unconventional features — distinctive look',
      'Meena': 'Dreamy, soft eyes — compassionate expression',
    };

    // ── How opposite gender sees you (Lagna + Venus + 1st house) ──
    const LAGNA_ATTRACTION_AURA = {
      'Mesha': { en: 'Bold, confident, slightly intimidating — they notice you first in a room', si: 'නිර්භීත, ආත්ම විශ්වාසී — කාමරයේ මුලින්ම ඔයාව දකිනවා' },
      'Vrishabha': { en: 'Calm, sensual, grounded — they feel safe and drawn to your stability', si: 'සන්සුන්, ස්ථාවර — ඔයා ලඟ ආරක්ෂිත බවක් දැනෙනවා' },
      'Mithuna': { en: 'Witty, fun, unpredictable — they\'re hooked by your conversation', si: 'විනෝදජනක, බුද්ධිමත් — ඔයාගේ කතාවට ඇදෙනවා' },
      'Kataka': { en: 'Nurturing, gentle, emotionally deep — they feel emotionally held', si: 'සෞම්‍ය, භාවනාත්මක — ඔයා ළඟ හැඟීම්බර ආරක්ෂාවක් දැනෙනවා' },
      'Simha': { en: 'Magnetic, dramatic, impossible to ignore — they\'re starstruck', si: 'ආකර්ෂණීය, ශ්‍රේෂ්ඨ — නොසලකා හරින්න බැහැ' },
      'Kanya': { en: 'Elegant, understated, intelligent — they\'re attracted to your precision', si: 'අලංකාරී, බුද්ධිමත් — ඔයාගේ නිරවද්‍යතාවයට ආකර්ෂණය වෙනවා' },
      'Tula': { en: 'Charming, beautiful, balanced — they feel like they\'ve met their ideal', si: 'සුන්දර, සමබර — ඔවුන්ගේ පරමාදර්ශී පුද්ගලයා හමුවුණා වගේ' },
      'Vrischika': { en: 'Mysterious, intense, hypnotic — they can\'t stop thinking about you', si: 'අභිරහස්, තීව්‍ර — ඔයා ගැන හිතනවා නවත්තන්න බෑ' },
      'Dhanus': { en: 'Free-spirited, adventurous, funny — they want to go on a journey with you', si: 'නිදහස්, වික්‍රමශීලී — ඔයා එක්ක ගමනක් යන්න ආසයි' },
      'Makara': { en: 'Mature, accomplished, powerful — they respect you before they love you', si: 'පරිණත, බලවත් — ආදරයට කලින් ගෞරවය දැනෙනවා' },
      'Kumbha': { en: 'Unique, eccentric, intellectual — they\'ve never met anyone like you', si: 'අද්විතීය, බුද්ධිමත් — ඔයා වගේ කවුරුවත් හමුවෙලා නෑ' },
      'Meena': { en: 'Dreamy, compassionate, artistic — they feel spiritually connected', si: 'සිහින මය, ආධ්‍යාත්මික — ඔයා එක්ක ආත්මික සම්බන්ධයක් දැනෙනවා' },
    };

    // ── What type of partner you're attracted to (7th house sign) ──
    const SEVENTH_ATTRACTION = {
      'Mesha': { type: 'Independent, bold, athletic, competitive types', si: 'නිදහස්, නිර්භීත, ක්‍රීඩාශීලී අය' },
      'Vrishabha': { type: 'Beautiful, stable, sensual, luxury-loving types', si: 'ලස්සන, ස්ථාවර, සුඛෝපභෝගී අය' },
      'Mithuna': { type: 'Witty, talkative, young-at-heart, intellectual types', si: 'බුද්ධිමත්, කතාකාර, තරුණ හදවත් ඇති අය' },
      'Kataka': { type: 'Nurturing, emotional, family-oriented, caring types', si: 'සත්කාරශීලී, පවුල්භක්තික, සෞම්‍ය අය' },
      'Simha': { type: 'Dramatic, confident, creative, attention-commanding types', si: 'ආත්ම විශ්වාසී, නිර්මාණශීලී, ප්‍රකට අය' },
      'Kanya': { type: 'Intelligent, organized, health-conscious, perfectionist types', si: 'බුද්ධිමත්, පිළිවෙළට, සෞඛ්‍යයට කැමති අය' },
      'Tula': { type: 'Attractive, balanced, diplomatic, artistic types', si: 'ආකර්ෂණීය, සමබර, කලාත්මක අය' },
      'Vrischika': { type: 'Intense, mysterious, passionate, deeply emotional types', si: 'තීව්‍ර, අභිරහස්, ආවේගශීලී, ගැඹුරු අය' },
      'Dhanus': { type: 'Adventurous, philosophical, free-spirited, cultured types', si: 'වික්‍රමශීලී, දාර්ශනික, නිදහස් ආත්ම ඇති අය' },
      'Makara': { type: 'Mature, career-focused, disciplined, serious types', si: 'පරිණත, රැකියාවට කැපවූ, විනයගරුක අය' },
      'Kumbha': { type: 'Unconventional, intellectual, humanitarian, independent types', si: 'අසාමාන්‍ය, බුද්ධිමත්, ස්වාධීන අය' },
      'Meena': { type: 'Dreamy, spiritual, artistic, compassionate types', si: 'සිහින මය, ආධ්‍යාත්මික, කලාත්මක අය' },
    };

    // ── Darakaraka spouse planet ──
    const dk = jaiminiKarakas?.darakaraka || null;
    const DK_SPOUSE_TYPE = {
      Sun: { en: 'authoritative, dignified, possibly older, leadership-oriented', si: 'අධිකාරී, ගරුත්වවත්, නායකත්වකාමී' },
      Moon: { en: 'emotionally nurturing, caring, motherly/fatherly, home-oriented', si: 'සත්කාරශීලී, මාතෘ/පිතෘ ස්වභාව, ගෘහභක්තික' },
      Mars: { en: 'physically strong, courageous, passionate, competitive', si: 'ශාරීරිකව ශක්තිමත්, ධෛර්යවන්ත, ආවේගශීලී' },
      Mercury: { en: 'intelligent, communicative, youthful, business-minded', si: 'බුද්ධිමත්, සන්නිවේදනශීලී, තරුණ පෙනුම' },
      Jupiter: { en: 'wise, educated, spiritual, generous, traditional', si: 'ප්‍රඥාවන්ත, අධ්‍යාපනික, ආධ්‍යාත්මික, උදාර' },
      Venus: { en: 'beautiful, artistic, romantic, fashion-conscious', si: 'ලස්සන, කලාත්මක, ආදරවන්ත, විලාසිතාකාමී' },
      Saturn: { en: 'mature, disciplined, hardworking, older, reliable', si: 'පරිණත, විනයගරුක, වැඩකාරී, විශ්වාසවන්ත' },
    };

    // ── Love language (Venus sign + Moon sign) ──
    const venusRashi = planets.venus?.rashi || planets.Venus?.rashi || '';
    const venusElement = Object.entries(ELEMENTS).find(([, signs]) => signs.includes(venusRashi))?.[0] || 'mixed';
    const LOVE_LANG = {
      fire: { en: 'Words of affirmation + grand romantic gestures', si: 'ප්‍රශංසා වචන + මහා ආදර ක්‍රියා' },
      earth: { en: 'Physical touch + acts of service — shows love through doing', si: 'ස්පර්ශය + සේවය — කරලා පෙන්වනවා' },
      air: { en: 'Quality time + intellectual connection — needs mental stimulation', si: 'ගුණාත්මක කාලය + බුද්ධිමත් සම්බන්ධය' },
      water: { en: 'Emotional depth + total devotion — loves with entire soul', si: 'හැඟීම් ගැඹුරුව + සම්පූර්ණ කැපවීම — ආත්මයෙන්ම ආදරය' },
    };
    const loveLang = LOVE_LANG[venusElement] || LOVE_LANG['water'];

    // ── Sexual energy (Mars + 8th house + Venus-Mars relationship) ──
    const marsScore = getHealthScore('mars');
    const marsRashi = planets.mars?.rashi || planets.Mars?.rashi || '';
    const marsElement = Object.entries(ELEMENTS).find(([, signs]) => signs.includes(marsRashi))?.[0] || 'mixed';
    const venusMarsSameHouse = venusH === marsH;
    const h8Planets = h8Data?.planetsInHouse || [];
    const venusDignity = planetStrengths.venus?.dignityLevel || '';

    let sexualEnergy = '';
    const MARS_SEXUAL = {
      fire: 'Intense, passionate, spontaneous — like a wildfire. Quick to ignite, loves the chase.',
      earth: 'Sensual, slow-burning, devoted — like a steady flame. Values physical connection deeply.',
      air: 'Playful, experimental, needs variety — like the wind. Attracted to new experiences.',
      water: 'Deep, emotional, spiritual — like the ocean. Needs emotional bond first, then physical.',
    };
    sexualEnergy = MARS_SEXUAL[marsElement] || 'Balanced sexual energy.';
    if (venusMarsSameHouse) sexualEnergy += ' Venus-Mars conjunction: EXTREMELY high sexual magnetism — one of the strongest attraction combinations.';
    if (marsScore >= 70) sexualEnergy += ' Very high physical drive and stamina.';
    if (h8Planets.length >= 2) sexualEnergy += ' Multiple planets in 8th house: intense, transformative intimate experiences.';

    // ── Attraction power score (1-10 scale) ──
    let attractPower = 5;
    const venusScoreAP = getHealthScore('venus');
    if (venusDignity === 'Exalted') attractPower += 3;
    else if (venusDignity === 'Own Sign' || venusDignity === 'Moolatrikona') attractPower += 2;
    else if (venusDignity === 'Friendly') attractPower += 1;
    else if (venusDignity === 'Debilitated') attractPower -= 2;
    if (venusH === 1) attractPower += 1.5;
    if (venusH === 7) attractPower += 1;
    if (venusMarsSameHouse) attractPower += 1;
    if (['Tula', 'Vrishabha'].includes(lagnaName)) attractPower += 0.5;
    if (h1?.planetsInHouse?.includes('Venus')) attractPower += 1;
    if (lagnaLordDignity === 'Exalted') attractPower += 0.5;
    attractPower = Math.max(1, Math.min(10, Math.round(attractPower)));

    // ── First impression vs real you ──
    const firstImpression = LAGNA_ATTRACTION_AURA[lagnaName] || { en: '', si: '' };
    const moonReality = MOON_FACE[moonRashi.name] || '';
    const navamshaTrue = navLagnaEn ? `After deep commitment, your true inner self emerges — ${navLagnaEn} Navamsha reveals your authentic self in intimate relationships` : '';

    return {
      title: 'Attraction & Romantic Profile',
      sinhala: 'ආකර්ෂණ බලය',
      // How opposite gender sees you
      attractionAura: LAGNA_ATTRACTION_AURA[lagnaName] || {},
      attractionAuraModifiers: (() => {
        const mods = [];
        if (h1?.planetsInHouse?.includes('Venus')) mods.push('Venus in 1st DOUBLES your attractiveness — you are naturally magnetic');
        if (h1?.planetsInHouse?.includes('Mars')) mods.push('Mars in 1st adds raw sexual magnetism — physically arresting');
        if (h1?.planetsInHouse?.includes('Rahu')) mods.push('Rahu in 1st gives exotic, unusual beauty — people can\'t look away');
        if (h1?.planetsInHouse?.includes('Moon')) mods.push('Moon in 1st gives soft, nurturing beauty — emotionally attractive');
        if (lagnaLordDignity === 'Exalted') mods.push('Lagna lord exalted — your physical presence radiates power and beauty');
        return mods;
      })(),
      // Attraction power score
      attractionPower: attractPower,
      attractionLevel: attractPower >= 9 ? 'Irresistible' : attractPower >= 7 ? 'Very attractive' : attractPower >= 5 ? 'Attractive' : attractPower >= 3 ? 'Average' : 'Understated charm',
      // What you're attracted to
      attractedTo: SEVENTH_ATTRACTION[h7Rashi] || {},
      seventhHouseSign: h7RashiEn,
      // Darakaraka spouse type
      darakaraka: dk ? {
        planet: dk.planet,
        rashi: dk.rashi,
        spouseType: DK_SPOUSE_TYPE[dk.planet] || {},
      } : null,
      // Love language
      loveLanguage: loveLang,
      venusElement: venusElement,
      // Sexual energy
      sexualEnergy: sexualEnergy,
      marsElement: marsElement,
      marsStrength: marsScore,
      venusMarsSameHouse: venusMarsSameHouse,
      h8PlanetCount: h8Planets.length,
      // First impression journey
      firstImpression: firstImpression,
      moonReality: moonReality,
      navamshaTrue: navamshaTrue,
      // Raw data for AI
      venusHouse: venusH,
      marsHouse: marsH,
      venusStrength: venusScoreAP,
      venusDignity: venusDignity,
      seventhLord: lord7,
      seventhLordHouse: lord7H,
    };
  })();
  // ══════════════════════════════════════════════════════════════
  return {
    generatedAt: new Date().toISOString(),
    birthData: {
      date: date.toISOString(),
      lat, lng,
      lagna: personality.lagna,
      moonSign: personality.moonSign,
      sunSign: personality.sunSign,
      nakshatra: personality.nakshatra,
      // ── Enriched personal profile from Nakshatra ──
      gana: (() => {
        try {
          const { GANA_MAP } = require('./porondam');
          const g = GANA_MAP[personality.nakshatra?.name];
          return g ? { type: g, meaning: g === 'Deva' ? 'Divine temperament — gentle, forgiving, spiritual' : g === 'Manushya' ? 'Human temperament — practical, balanced, worldly' : 'Fierce temperament — intense, protective, fearless' } : null;
        } catch { return null; }
      })(),
      yoni: (() => {
        try {
          const { YONI_MAP } = require('./porondam');
          const y = YONI_MAP[personality.nakshatra?.name];
          return y ? { animal: y } : null;
        } catch { return null; }
      })(),
      nadi: (() => {
        try {
          const { NADI_MAP } = require('./porondam');
          const n = NADI_MAP[personality.nakshatra?.name];
          return n ? { type: n, meaning: n === 'Aadi' ? 'Vata constitution — active, restless, creative energy' : n === 'Madhya' ? 'Pitta constitution — driven, focused, fiery energy' : 'Kapha constitution — calm, steady, nurturing energy' } : null;
        } catch { return null; }
      })(),
      // ── Age and birth day analysis ──
      currentAge: (() => {
        const now = new Date();
        return Math.floor((now - date) / (365.25 * 24 * 60 * 60 * 1000));
      })(),
      birthDayOfWeek: panchanga.vaara?.name || ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][date.getDay()],
      rulingPlanetOfDay: (() => {
        const dayPlanet = { 'Sunday': 'Sun', 'Monday': 'Moon', 'Tuesday': 'Mars', 'Wednesday': 'Mercury', 'Thursday': 'Jupiter', 'Friday': 'Venus', 'Saturday': 'Saturn' };
        return dayPlanet[panchanga.vaara?.name] || null;
      })(),
      birthTimeSLT: (() => {
        const h = date.getUTCHours();
        const m = date.getUTCMinutes();
        const sltMin = h * 60 + m + 330; // +5:30
        const sltH = Math.floor((sltMin / 60) % 24);
        const sltM = Math.floor(sltMin % 60);
        return `${String(sltH).padStart(2, '0')}:${String(sltM).padStart(2, '0')}`;
      })(),
      birthTimeQuality: (() => {
        const h = date.getUTCHours() + date.getUTCMinutes() / 60;
        const sltH = (h + 5.5) % 24;
        if (sltH >= 4.5 && sltH < 6.5) return 'Brahma Muhurta — born at the most auspicious time of day';
        if (sltH >= 6 && sltH < 12) return 'Morning birth — active, ambitious, visible energy';
        if (sltH >= 12 && sltH < 18) return 'Afternoon birth — practical, grounded, steady energy';
        if (sltH >= 18 && sltH < 22) return 'Evening birth — social, reflective, creative energy';
        return 'Night birth — intuitive, private, deep inner world';
      })(),
      panchanga: { tithi: panchanga.tithi?.name, yoga: panchanga.yoga?.name, karana: panchanga.karana?.name, vaara: panchanga.vaara?.name,
        // ── Panchanga Quality Assessment ──
        panchangaQuality: (() => {
          let score = 0;
          const notes = [];
          // Tithi quality: Purnima/Amavasya = mixed, Panchami/Dashami/Ekadashi = auspicious
          const tithiName = panchanga.tithi?.name || '';
          if (['Panchami', 'Dashami', 'Ekadashi', 'Dwitiya', 'Trayodashi'].includes(tithiName)) { score += 2; notes.push('Auspicious Tithi'); }
          else if (['Chaturthi', 'Navami', 'Chaturdashi'].includes(tithiName)) { score -= 1; notes.push('Rikta Tithi (emptying)'); }
          else if (tithiName === 'Ashtami') { score -= 1; notes.push('Ashtami — mixed energy'); }
          else { score += 1; }
          // Yoga quality
          const yogaName = panchanga.yoga?.name || '';
          const auspiciousYogas = ['Saubhagya', 'Shobhana', 'Sukarma', 'Dhriti', 'Harshana', 'Siddhi', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra'];
          const inauspiciousYogas = ['Vishkambha', 'Atiganda', 'Shula', 'Ganda', 'Vyaghata', 'Vajra', 'Vyatipata', 'Parigha', 'Vaidhriti'];
          if (auspiciousYogas.includes(yogaName)) { score += 2; notes.push('Auspicious Yoga'); }
          else if (inauspiciousYogas.includes(yogaName)) { score -= 1; notes.push('Challenging Yoga'); }
          else { score += 1; }
          // Karana quality: Vishti (Bhadra) is inauspicious
          const karanaName = panchanga.karana?.name || '';
          if (karanaName === 'Vishti') { score -= 2; notes.push('Vishti Karana (inauspicious)'); }
          else { score += 1; }
          // Vaara (day) quality with birth
          const vaaraName = panchanga.vaara?.name || '';
          if (['Thursday', 'Friday', 'Wednesday', 'Monday'].includes(vaaraName)) { score += 1; notes.push('Benefic birth day'); }
          else if (['Saturday', 'Tuesday'].includes(vaaraName)) { score -= 1; notes.push('Malefic birth day'); }
          const quality = score >= 4 ? 'Excellent' : score >= 2 ? 'Good' : score >= 0 ? 'Average' : 'Challenging';
          return { score, quality, notes };
        })(),
      },
    },
    sections: (() => {
      // ══════════════════════════════════════════════════════════════
      // CROSS-VALIDATION ENGINE — Logical Consistency Enforcement
      // ══════════════════════════════════════════════════════════════
      // Vedic astrology sections are interdependent. A person cannot have
      // children score 95 with marriage score 50 — children largely depend
      // on marriage/partnership. This engine applies logical constraints
      // across ALL sections, adjusting strengthScores with reasoning.
      //
      // DEPENDENCY GRAPH (Vedic logic):
      //   marriage → children (5th house needs 7th partnership for progeny)
      //   marriage → familyPortrait (married life IS family)
      //   career → financial (income depends on career strength)
      //   health → all sections (weak health limits everything)
      //   education → career (education feeds career)
      //   luck (9th) → foreignTravel (9th+12th govern both)
      //   mentalHealth → career, marriage (mental state affects execution)
      //   marriage → marriedLife (subset of marriage data for post-marriage life)
      //   career + financial → realEstate (property needs income)
      // ══════════════════════════════════════════════════════════════

      const allSections = {
        yogaAnalysis, personality, marriage, career, children,
        lifePredictions, mentalHealth, business, transits, realEstate,
        employment, financial, timeline25, bestYearsRanking, remedies, health,
        foreignTravel, legal, education, luck, spiritual,
        surpriseInsights, familyPortrait, physicalProfile, attractionProfile,
      };

      // Copy secondMarriage into marriage section for badge/UI direct access
      if (surpriseInsights?.secondMarriage) {
        allSections.marriage.secondMarriage = surpriseInsights.secondMarriage;
      }

      // Helper: safely get a section's primary strengthScore
      const getScore = (section, ...paths) => {
        for (const path of paths) {
          const keys = path.split('.');
          let val = section;
          for (const k of keys) { val = val?.[k]; }
          if (typeof val === 'number') return val;
        }
        return null;
      };

      // Collect raw scores before cross-validation
      const raw = {
        marriage:      getScore(marriage, 'seventhHouse.strengthScore'),
        children:      getScore(children, 'fifthHouse.strengthScore'),
        career:        getScore(career, 'tenthHouse.strengthScore'),
        financial:     getScore(financial, 'income.secondHouse.strengthScore', 'income.eleventhHouse.strengthScore'),
        education:     getScore(education, 'fourthHouse.strengthScore', 'fifthHouse.strengthScore'),
        health:        getScore(health, 'sixthHouse.strengthScore', 'eighthHouse.strengthScore'),
        foreignTravel: getScore(foreignTravel, 'ninthHouse.strengthScore', 'twelfthHouse.strengthScore'),
        luck:          getScore(luck, 'ninthHouse.strengthScore'),
        spiritual:     getScore(spiritual, 'twelfthHouse.strengthScore'),
        realEstate:    getScore(realEstate, 'fourthHouse.strengthScore'),
        mentalHealth:  getScore(mentalHealth, 'fourthHouse.strengthScore', 'moon.score'),
      };

      // Marriage denial context (already computed earlier)
      const marriageDenied = cachedMarriageDenial?.isMarriageDenied || false;
      const marriageSeverity = cachedMarriageDenial?.severity || 'NONE';
      const marriageDenialScore = cachedMarriageDenial?.denialScore || 0;

      // Track all adjustments for transparency
      const crossValidationLog = [];

      // Helper: apply a constrained adjustment to a house's strengthScore
      const adjustScore = (sectionObj, housePath, newScore, reason) => {
        const keys = housePath.split('.');
        let target = sectionObj;
        for (let i = 0; i < keys.length - 1; i++) { target = target?.[keys[i]]; }
        if (!target) return;
        const field = keys[keys.length - 1];
        const oldScore = target[field];
        if (typeof oldScore !== 'number') return;
        const adjusted = Math.max(0, Math.min(100, Math.round(newScore)));
        if (adjusted !== oldScore) {
          target[field] = adjusted;
          crossValidationLog.push({ section: housePath, from: oldScore, to: adjusted, reason });
        }
      };

      // ── RULE 1: Children cannot exceed marriage + 15 ──────────────
      // Vedic logic: 5th house (children) is a DERIVATIVE of 7th house (marriage).
      // Even with a strong 5th house, progeny through marriage requires
      // a functioning 7th house. Allow +15 buffer because adoption/IVF/
      // premarital children exist but are uncommon in Vedic context.
      if (raw.marriage != null && raw.children != null) {
        const maxChildrenScore = Math.min(100, raw.marriage + 15);
        if (raw.children > maxChildrenScore) {
          adjustScore(children, 'fifthHouse.strengthScore', maxChildrenScore,
            `Children score ${raw.children} exceeds marriage score ${raw.marriage} by ${raw.children - raw.marriage} points — capped at marriage+15 because progeny depends on partnership`);
        }
        // If marriage is DENIED, children score gets heavily penalized
        if (marriageDenied && raw.children > 35) {
          adjustScore(children, 'fifthHouse.strengthScore', Math.min(raw.children, 35),
            `Marriage DENIED (denial score ${marriageDenialScore}/100) — children through marriage very unlikely, score capped at 35`);
        }
      }

      // ── RULE 2: Financial cannot exceed career + 20 ───────────────
      // Wealth (2nd house) and income (11th house) are PRODUCED by career (10th house).
      // A weak career rarely produces strong finances. Allow +20 because
      // inheritance, lottery, or family wealth can supplement.
      if (raw.career != null && raw.financial != null) {
        const maxFinancialScore = Math.min(100, raw.career + 20);
        if (raw.financial > maxFinancialScore) {
          adjustScore(financial, 'income.secondHouse.strengthScore', maxFinancialScore,
            `Financial score ${raw.financial} exceeds career score ${raw.career} by ${raw.financial - raw.career} — capped at career+20 because income depends on professional strength`);
        }
      }

      // ── RULE 3: Severe health weakness caps all life areas ────────
      // The 1st house (body/vitality) is the FOUNDATION of everything.
      // If health is severely weak (<30), no life area can fully flourish.
      if (raw.health != null && raw.health < 30) {
        const healthCap = raw.health + 25; // max any section can be
        const healthAffected = ['career', 'children', 'marriage', 'education', 'foreignTravel'];
        for (const key of healthAffected) {
          if (raw[key] != null && raw[key] > healthCap) {
            const houseKey = key === 'career' ? 'tenthHouse' : key === 'children' ? 'fifthHouse' :
              key === 'marriage' ? 'seventhHouse' : key === 'education' ? 'fourthHouse' :
              key === 'foreignTravel' ? 'ninthHouse' : null;
            if (houseKey && allSections[key]) {
              adjustScore(allSections[key], `${houseKey}.strengthScore`, healthCap,
                `Health score is critically low (${raw.health}/100) — ${key} capped at health+25 because physical vitality limits all achievements`);
            }
          }
        }
      }

      // ── RULE 4: Education feeds career — career can't vastly exceed education ──
      // The 4th house (learning) and 5th house (intelligence) support the 10th house.
      // Career can exceed education (practical skills, luck) but not by > 25.
      if (raw.education != null && raw.career != null) {
        if (raw.career > raw.education + 25) {
          adjustScore(career, 'tenthHouse.strengthScore', raw.education + 25,
            `Career score ${raw.career} exceeds education score ${raw.education} by ${raw.career - raw.education} — moderated because strong career typically requires educational foundation`);
        }
      }

      // ── RULE 5: RealEstate depends on career + financial ──────────
      // Property (4th house) requires financial resources. Can't have strong
      // property prospects with weak career AND weak finances.
      if (raw.career != null && raw.financial != null && raw.realEstate != null) {
        const incomeAvg = Math.round((raw.career + raw.financial) / 2);
        const maxPropertyScore = Math.min(100, incomeAvg + 20);
        if (raw.realEstate > maxPropertyScore) {
          adjustScore(realEstate, 'fourthHouse.strengthScore', maxPropertyScore,
            `Real estate score ${raw.realEstate} exceeds income average (career ${raw.career} + financial ${raw.financial})/2 = ${incomeAvg} — capped because property acquisition requires financial backing`);
        }
      }

      // ── RULE 6: Mental health affects marriage and career ─────────
      // Severe mental health challenges (Moon/5th house weak) impact relationships
      // and career execution. Apply a soft penalty.
      if (raw.mentalHealth != null && raw.mentalHealth < 30) {
        const mentalPenalty = Math.round((30 - raw.mentalHealth) * 0.4); // Up to 12-point penalty
        if (raw.marriage != null && raw.marriage > 40) {
          adjustScore(marriage, 'seventhHouse.strengthScore', raw.marriage - mentalPenalty,
            `Mental health critically low (${raw.mentalHealth}/100) — marriage reduced by ${mentalPenalty} because severe mental challenges strain relationships`);
        }
        if (raw.career != null && raw.career > 40) {
          adjustScore(career, 'tenthHouse.strengthScore', raw.career - mentalPenalty,
            `Mental health critically low (${raw.mentalHealth}/100) — career reduced by ${mentalPenalty} because mental wellness affects professional performance`);
        }
      }

      // ── RULE 7: Luck (9th house) and foreignTravel share the 9th house ──
      // Both luck and foreign travel depend on the 9th house lord.
      // They shouldn't differ by more than 20 points.
      if (raw.luck != null && raw.foreignTravel != null) {
        const diff = Math.abs(raw.luck - raw.foreignTravel);
        if (diff > 20) {
          const avg = Math.round((raw.luck + raw.foreignTravel) / 2);
          // Pull both toward the average, maintaining relative order
          if (raw.luck > raw.foreignTravel) {
            adjustScore(luck, 'ninthHouse.strengthScore', Math.min(raw.luck, avg + 10),
              `Luck (${raw.luck}) and foreign travel (${raw.foreignTravel}) share 9th house but differ by ${diff} — harmonized`);
            adjustScore(foreignTravel, 'ninthHouse.strengthScore', Math.max(raw.foreignTravel, avg - 10),
              `Foreign travel harmonized with luck — both governed by 9th house`);
          } else {
            adjustScore(foreignTravel, 'ninthHouse.strengthScore', Math.min(raw.foreignTravel, avg + 10),
              `Foreign travel (${raw.foreignTravel}) and luck (${raw.luck}) share 9th house but differ by ${diff} — harmonized`);
            adjustScore(luck, 'ninthHouse.strengthScore', Math.max(raw.luck, avg - 10),
              `Luck harmonized with foreign travel — both governed by 9th house`);
          }
        }
      }

      // ── RULE 8: Marriage HIGH affliction dampens children ──────────
      // Even if not fully denied, HIGH marriage afflictions should reduce children score
      if (marriageSeverity === 'HIGH' && raw.children != null && raw.children > 55) {
        adjustScore(children, 'fifthHouse.strengthScore', Math.min(raw.children, 55),
          `Marriage afflictions are HIGH (score ${marriageDenialScore}/100) — children score capped at 55 because relationship instability affects family planning`);
      }

      // ── RULE 9: Spiritual and luck share 9th/12th axis ────────────
      // Spiritual (12th house) and luck (9th house) are on the dharma-moksha axis.
      // Very high spiritual with very low luck is unusual (both need Jupiter blessing).
      if (raw.spiritual != null && raw.luck != null) {
        const diff = Math.abs(raw.spiritual - raw.luck);
        if (diff > 30) {
          const avg = Math.round((raw.spiritual + raw.luck) / 2);
          if (raw.spiritual > raw.luck) {
            adjustScore(spiritual, 'twelfthHouse.strengthScore', Math.min(raw.spiritual, avg + 15),
              `Spiritual (${raw.spiritual}) and luck (${raw.luck}) differ by ${diff} on dharma-moksha axis — harmonized`);
          } else {
            adjustScore(luck, 'ninthHouse.strengthScore', Math.min(raw.luck, avg + 15),
              `Luck (${raw.luck}) and spiritual (${raw.spiritual}) differ by ${diff} on dharma-moksha axis — harmonized`);
          }
        }
      }

      // ── RULE 10: FamilyPortrait depends on both marriage + children ──
      // Family life (4th house) is a composite of marriage success + children.
      // Currently familyPortrait doesn't have its own strengthScore in analyzeHouse
      // but if it did, constrain it.

      // ── RULE 11: REMOVED ──
      // Education↔Career alignment is now handled entirely by the AI.
      // The engine no longer hardcodes career/education field names,
      // so there is nothing to cross-validate here.

      // Log results
      if (crossValidationLog.length > 0) {
        console.log(`[CrossValidation] Applied ${crossValidationLog.length} score adjustments:`);
        crossValidationLog.forEach(adj => {
          console.log(`  ⚖️ ${adj.section}: ${adj.from} → ${adj.to} | ${adj.reason}`);
        });
      } else {
        console.log('[CrossValidation] All scores are logically consistent — no adjustments needed');
      }

      // Attach cross-validation metadata to each adjusted section
      // so the AI can see the reasoning
      for (const adj of crossValidationLog) {
        const sectionName = adj.section.split('.')[0] === 'fifthHouse' ? 'children' :
          adj.section.split('.')[0] === 'seventhHouse' ? 'marriage' :
          adj.section.split('.')[0] === 'tenthHouse' ? 'career' :
          adj.section.split('.')[0] === 'secondHouse' ? 'financial' :
          adj.section.split('.')[0] === 'fourthHouse' ? 'education' :
          adj.section.split('.')[0] === 'ninthHouse' ? 'luck' :
          adj.section.split('.')[0] === 'twelfthHouse' ? 'spiritual' : null;
        // Find the actual section that was adjusted based on the log reason
        for (const [key, sec] of Object.entries(allSections)) {
          if (sec && adj.reason.toLowerCase().includes(key.toLowerCase())) {
            if (!sec._crossValidation) sec._crossValidation = [];
            sec._crossValidation.push(adj);
            break;
          }
        }
      }

      // Store cross-validation log on allSections for AI access
      allSections._crossValidation = crossValidationLog;

      return allSections;
    })(),
    // ── Nadi Astrology Significator System (Umang Taneja methodology) ──
    // Planet→Nakshatra→SubLord house signification chains + event predictions
    nadiAnalysis: nadiPredictions ? {
      significatorTable: nadiPredictions.significatorTable,
      cuspalSubLords: nadiPredictions.cuspalSubLords,
      eventPredictions: nadiPredictions.events,
      careerType: nadiPredictions.careerType,
      educationAnalysis: {
        overall: nadiPredictions.overallEducation,
        byPlanet: nadiPredictions.educationByPlanet,
      },
      careerSectors: nadiPredictions.careerSectors,
      longevityEstimate: nadiPredictions.longevityEstimate,
      bestMarriageDasha: nadiPredictions.bestMarriageDasha,
      eventSummary: nadiPredictions.eventSummary,
      deniedEvents: nadiPredictions.deniedEvents,
    } : null,
    // ── KP Sub-Lord chains (for AI prompt enrichment) ──
    kpSubLords: kpSubLords || null,
    nadiAmsha: nadiAmsha || null,
    // ══════════════════════════════════════════════════════════════
    // KEY EVENTS CALENDAR — Consolidated Life Timeline
    // ══════════════════════════════════════════════════════════════
    // Gathers all major life event predictions with timing in one place
    // for easy reference. Age-bounded to reasonable lifespan (up to 80).
    keyEventsCalendar: (() => {
      const birthYear = date.getFullYear();
      const currentYear = today.getFullYear();
      const currentAge = currentYear - birthYear;
      const maxYear = birthYear + 80; // Reasonable lifespan boundary
      
      const events = [];
      
      // 1. Marriage windows (top 3 upcoming/active + current best window if ACTIVE_NOW)
      const marriageWindows = marriage?.marriageTimingPrediction?.firstMarriageWindows || [];
      const bestWindow = marriage?.marriageTimingPrediction?.bestWindow;
      
      // First, add the ACTIVE_NOW best window if it exists
      if (bestWindow?.status === 'ACTIVE_NOW') {
        events.push({
          category: 'MARRIAGE',
          icon: '💍',
          year: currentYear,
          ageAtEvent: currentAge,
          period: bestWindow.period,
          dateRange: bestWindow.dateRange,
          confidence: bestWindow.confidence,
          status: 'ACTIVE_NOW',
          summary: `🔥 CURRENT best marriage window: ${bestWindow.period} (${bestWindow.ageRange || currentAge + ' years old'})`,
          isCurrentWindow: true,
        });
      }
      
      // Then add upcoming windows (that aren't the best window already added)
      const relevantMarriageWindows = marriageWindows
        .filter(w => w.peakYear >= currentYear && w.peakYear <= maxYear && w.period !== bestWindow?.period)
        .slice(0, 3);
      
      for (const w of relevantMarriageWindows) {
        events.push({
          category: 'MARRIAGE',
          icon: '💍',
          year: w.peakYear,
          ageAtEvent: w.peakYear - birthYear,
          period: w.period,
          dateRange: w.dateRange,
          confidence: w.confidence,
          status: w.peakYear === currentYear ? 'THIS_YEAR' : 
                  w.peakYear <= currentYear + 2 ? 'NEAR_TERM' : 'FUTURE',
          summary: `Marriage window: ${w.period} (${w.ageRange} years old)`,
        });
      }
      
      // 2. Children timing (if marriage year is set)
      const childrenData = children?.childrenBirthYears?.children || [];
      for (const c of childrenData) {
        if (c.peakYear && c.peakYear >= currentYear && c.peakYear <= maxYear) {
          events.push({
            category: 'CHILDREN',
            icon: '👶',
            year: c.peakYear,
            ageAtEvent: c.peakYear - birthYear,
            period: c.period,
            dateRange: c.predictedYears,
            confidence: c.confidence,
            status: c.peakYear === currentYear ? 'THIS_YEAR' : 
                    c.peakYear <= currentYear + 3 ? 'NEAR_TERM' : 'FUTURE',
            summary: `${c.childNumber} child (${c.gender}): ${c.predictedYears}`,
          });
        }
      }
      
      // 3. Health danger periods (only next 20 years, critical only)
      const dangerPeriods = health?.dangerPeriods || [];
      const relevantDanger = dangerPeriods
        .filter(d => {
          const startYear = parseInt((d.period || '').split('-')[0], 10);
          return startYear >= currentYear && startYear <= currentYear + 20 && d.level === 'CRITICAL';
        })
        .slice(0, 3);
      
      for (const d of relevantDanger) {
        const startYear = parseInt((d.period || '').split('-')[0], 10);
        events.push({
          category: 'HEALTH_CAUTION',
          icon: '⚠️',
          year: startYear,
          ageAtEvent: startYear - birthYear,
          period: `${d.lord}-${d.antardasha}`,
          dateRange: d.period,
          confidence: 'HIGH',
          status: startYear === currentYear ? 'THIS_YEAR' : 
                  startYear <= currentYear + 3 ? 'NEAR_TERM' : 'FUTURE',
          summary: `Health caution period: ${d.lord}-${d.antardasha}`,
          reason: d.reason,
        });
      }
      
      // 4. Career peaks from dasha periods (10th house activation)
      const timeline25Periods = timeline25?.periods || [];
      const careerPeaks = timeline25Periods
        .filter(p => {
          const yr = p.peakYear || parseInt((p.dates || '').split('-')[0], 10);
          return yr >= currentYear && yr <= maxYear && 
                 (p.career?.includes('peak') || p.career?.includes('promotion') || 
                  p.career?.includes('success') || p.career?.includes('rise'));
        })
        .slice(0, 3);
      
      for (const p of careerPeaks) {
        const yr = p.peakYear || parseInt((p.dates || '').split('-')[0], 10);
        events.push({
          category: 'CAREER_PEAK',
          icon: '📈',
          year: yr,
          ageAtEvent: yr - birthYear,
          period: p.period || 'N/A',
          dateRange: p.dates || 'N/A',
          confidence: 'MODERATE',
          status: yr === currentYear ? 'THIS_YEAR' : 
                  yr <= currentYear + 3 ? 'NEAR_TERM' : 'FUTURE',
          summary: `Career opportunity: ${p.career || 'Peak period'}`,
        });
      }
      
      // 5. Current Dasha transition (major life phase change)
      const currentDasha = lifePredictions?.currentDasha;
      const nextDasha = lifePredictions?.nextDasha;
      if (nextDasha?.start) {
        const transitionDate = new Date(nextDasha.start);
        const transitionYear = transitionDate.getFullYear();
        if (transitionYear >= currentYear && transitionYear <= maxYear) {
          events.push({
            category: 'DASHA_CHANGE',
            icon: '🔄',
            year: transitionYear,
            ageAtEvent: transitionYear - birthYear,
            period: `${currentDasha?.lord || '?'} → ${nextDasha?.lord || '?'}`,
            dateRange: nextDasha.start,
            confidence: 'HIGH',
            status: transitionYear === currentYear ? 'THIS_YEAR' : 
                    transitionYear <= currentYear + 2 ? 'NEAR_TERM' : 'FUTURE',
            summary: `Major Dasha transition to ${nextDasha.lord} Mahadasha`,
          });
        }
      }
      
      // Sort all events by year
      events.sort((a, b) => a.year - b.year);
      
      // Group by status
      const thisYear = events.filter(e => e.status === 'THIS_YEAR');
      const nearTerm = events.filter(e => e.status === 'NEAR_TERM');
      const future = events.filter(e => e.status === 'FUTURE');
      
      return {
        title: 'Key Events Calendar',
        sinhala: 'ප්‍රධාන සිදුවීම් දිනදර්ශනය',
        generatedFor: { birthYear, currentAge, maxYear },
        allEvents: events,
        byStatus: {
          thisYear,
          nearTerm,
          future,
        },
        summary: {
          totalEvents: events.length,
          upcomingMarriage: relevantMarriageWindows.length > 0,
          upcomingChildren: childrenData.filter(c => c.peakYear >= currentYear).length,
          healthCautions: relevantDanger.length,
          nextMajorEvent: events[0] || null,
        },
      };
    })(),
  };
}

/**
 * Calculate planetary strengths — comprehensive 12-factor analysis
 * Factors: Dignity, Friendship, House Position, Aspects Received,
 *          Retrograde, Combustion, Graha Yuddha, Neecha Bhanga,
 *          Vargottama, Pushkara, Dig Bala, Hora strength
 * Returns a score 0-100 for each planet
 */
function getPlanetStrengths(date, lat, lng) {
  const { houses, lagna } = buildHouseChart(date, lat, lng);
  const planets = getAllPlanetPositions(date, lat, lng);
  const lagnaName = lagna?.rashi?.name || 'Mesha';
  const drishtis = calculateDrishtis(houses);
  
  const exaltations = {
      Sun: 1, Moon: 2, Mars: 10, Mercury: 6, Jupiter: 4, Venus: 12, Saturn: 7, Rahu: 2, Ketu: 8
  };
  const EXALT_DEGREES = { Sun: 10, Moon: 3, Mars: 28, Mercury: 15, Jupiter: 5, Venus: 27, Saturn: 20 };
  
  const debilitations = {
      Sun: 7, Moon: 8, Mars: 4, Mercury: 12, Jupiter: 10, Venus: 6, Saturn: 1, Rahu: 8, Ketu: 2
  };
  
  const ownSigns = {
      Sun: [5], Moon: [4], Mars: [1, 8], Mercury: [3, 6], Jupiter: [9, 12], Venus: [2, 7], Saturn: [10, 11]
  };

  // Moolatrikona signs and degree ranges (BPHS)
  const MOOLATRIKONA = {
    Sun: { rashiId: 5, from: 0, to: 20 },     // Leo 0-20
    Moon: { rashiId: 2, from: 3, to: 30 },     // Taurus 3-30
    Mars: { rashiId: 1, from: 0, to: 12 },     // Aries 0-12
    Mercury: { rashiId: 6, from: 15, to: 20 }, // Virgo 15-20
    Jupiter: { rashiId: 9, from: 0, to: 10 },  // Sagittarius 0-10
    Venus: { rashiId: 7, from: 0, to: 15 },    // Libra 0-15
    Saturn: { rashiId: 11, from: 0, to: 20 },  // Aquarius 0-20
  };

  // Natural friendships (BPHS Ch.3) — friend sign lords
  const NATURAL_FRIENDS = {
    Sun:     ['Moon', 'Mars', 'Jupiter'],
    Moon:    ['Sun', 'Mercury'],
    Mars:    ['Sun', 'Moon', 'Jupiter'],
    Mercury: ['Sun', 'Venus'],
    Jupiter: ['Sun', 'Moon', 'Mars'],
    Venus:   ['Mercury', 'Saturn'],
    Saturn:  ['Mercury', 'Venus'],
    Rahu:    ['Mercury', 'Venus', 'Saturn'],
    Ketu:    ['Mars', 'Jupiter'],
  };
  const NATURAL_ENEMIES = {
    Sun:     ['Saturn', 'Venus'],
    Moon:    [],
    Mars:    ['Mercury'],
    Mercury: ['Moon'],
    Jupiter: ['Mercury', 'Venus'],
    Venus:   ['Sun', 'Moon'],
    Saturn:  ['Sun', 'Moon', 'Mars'],
    Rahu:    ['Sun', 'Moon', 'Mars'],
    Ketu:    ['Mercury', 'Venus'],
  };

  // Dig Bala — directional strength (planet → strongest house)
  const DIG_BALA = { Sun: 10, Mars: 10, Jupiter: 1, Mercury: 1, Moon: 4, Venus: 4, Saturn: 7 };

  // Helper to find planet house
  const getPlanetHouse = (planetName) => {
    const h = houses.find(h => h.planets.some(p => p.name === planetName));
    return h ? h.houseNumber : 0;
  };

  // ── Combustion detection ──
  const sunSidereal = planets.sun?.sidereal || 0;
  const COMBUST_ORBS = { Moon: 12, Mars: 17, Mercury: 14, Jupiter: 11, Venus: 10, Saturn: 15 };
  const combustMap = {};
  for (const [key, p] of Object.entries(planets)) {
    if (['Lagna', 'sun', 'rahu', 'ketu'].includes(key)) continue;
    const pSid = p.sidereal;
    const dist = Math.abs(pSid - sunSidereal);
    const angDist = Math.min(dist, 360 - dist);
    const orb = COMBUST_ORBS[p.name] || 10;
    if (angDist < orb) combustMap[key] = angDist;
  }

  // ── Graha Yuddha (Planetary War) detection ──
  // Two planets within 1° of each other — higher latitude wins
  const grahaYuddha = {};
  const warCandidates = ['mars', 'mercury', 'jupiter', 'venus', 'saturn'];
  for (let i = 0; i < warCandidates.length; i++) {
    for (let j = i + 1; j < warCandidates.length; j++) {
      const p1 = planets[warCandidates[i]];
      const p2 = planets[warCandidates[j]];
      if (!p1 || !p2) continue;
      const dist = Math.abs(p1.sidereal - p2.sidereal);
      const angDist = Math.min(dist, 360 - dist);
      if (angDist < 1.0) {
        // The planet with higher speed generally loses (it's closer to Sun-like behavior)
        // Simplified: larger planet (Jupiter > Saturn > Mars > Venus > Mercury) wins
        const hierarchy = { Jupiter: 5, Saturn: 4, Mars: 3, Venus: 2, Mercury: 1 };
        const h1 = hierarchy[p1.name] || 0;
        const h2 = hierarchy[p2.name] || 0;
        const loser = h1 > h2 ? warCandidates[j] : warCandidates[i];
        const winner = h1 > h2 ? warCandidates[i] : warCandidates[j];
        grahaYuddha[loser] = { opponent: planets[winner].name, angDist: angDist.toFixed(2) };
      }
    }
  }

  // ── Neecha Bhanga Raja Yoga detection ──
  // Debilitation cancellation — converts a weakness into extraordinary strength
  const neechaBhanga = {};
  for (const [key, p] of Object.entries(planets)) {
    if (['Lagna', 'rahu', 'ketu'].includes(key)) continue;
    const rashi = p.rashiId;
    if (debilitations[p.name] && rashi === debilitations[p.name]) {
      let cancelled = false;
      const reasons = [];
      
      // Rule 1: Lord of the debilitation sign is in kendra from Lagna or Moon
      const debSignLord = RASHIS[rashi - 1]?.lord;
      const debSignLordHouse = getPlanetHouse(debSignLord);
      const moonH = getPlanetHouse('Moon');
      if (debSignLordHouse && [1, 4, 7, 10].includes(debSignLordHouse)) {
        cancelled = true;
        reasons.push(`${debSignLord} (lord of debilitation sign) in kendra from Lagna`);
      }
      if (moonH && debSignLordHouse) {
        const distFromMoon = ((debSignLordHouse - moonH + 12) % 12) + 1;
        if ([1, 4, 7, 10].includes(distFromMoon)) {
          cancelled = true;
          reasons.push(`${debSignLord} in kendra from Moon`);
        }
      }

      // Rule 2: Lord of the exaltation sign of the debilitated planet is in kendra
      const exaltRashiId = exaltations[p.name];
      if (exaltRashiId) {
        const exaltLord = RASHIS[exaltRashiId - 1]?.lord;
        const exaltLordHouse = getPlanetHouse(exaltLord);
        if (exaltLordHouse && [1, 4, 7, 10].includes(exaltLordHouse)) {
          cancelled = true;
          reasons.push(`${exaltLord} (lord of exaltation sign) in kendra`);
        }
      }

      // Rule 3: The debilitated planet itself is in kendra
      const pH = getPlanetHouse(p.name);
      if (pH && [1, 4, 7, 10].includes(pH)) {
        cancelled = true;
        reasons.push(`${p.name} itself in kendra — self-cancellation`);
      }

      // Rule 4: Jupiter aspects the debilitated planet
      const jupH = getPlanetHouse('Jupiter');
      if (jupH && pH) {
        const jupToP = ((pH - jupH + 12) % 12) + 1;
        if ([5, 7, 9].includes(jupToP)) {
          cancelled = true;
          reasons.push(`Jupiter aspects ${p.name} — divine protection`);
        }
      }

      if (cancelled) {
        neechaBhanga[key] = { reasons, isRajaYoga: reasons.length >= 2 };
      }
    }
  }

  // ── Navamsha for Vargottama check ──
  let navamsha = null;
  try { navamsha = buildNavamshaChart(date, lat, lng); } catch (_) {}

  const strengths = {};
  
  for (const [key, p] of Object.entries(planets)) {
      if (key === 'Lagna') continue;
      
      let score = 50;
      let status = 'Neutral';
      const statusParts = [];
      
      const rashi = p.rashiId;
      const degInSign = p.degreeInSign || 0;
      const houseNum = getPlanetHouse(p.name);

      // ── 1. Dignity (Exaltation/Moolatrikona/Own/Friend/Enemy/Debilitation) ──
      const mt = MOOLATRIKONA[p.name];
      if (exaltations[p.name] && rashi === exaltations[p.name]) {
          // Exaltation strength varies by distance from exact exaltation degree
          const exactDeg = EXALT_DEGREES[p.name] || 15;
          const distFromExact = Math.abs(degInSign - exactDeg);
          const exaltBonus = Math.max(25, 40 - distFromExact);
          score += exaltBonus;
          status = 'Exalted (උච්ච)';
          statusParts.push('Exalted');
      } else if (debilitations[p.name] && rashi === debilitations[p.name]) {
          score -= 30;
          status = 'Debilitated (නීච)';
          statusParts.push('Debilitated');
      } else if (mt && rashi === mt.rashiId && degInSign >= mt.from && degInSign <= mt.to) {
          score += 30;
          status = 'Moolatrikona';
          statusParts.push('Moolatrikona');
      } else if (ownSigns[p.name] && ownSigns[p.name].includes(rashi)) {
          score += 25;
          status = 'Own Sign (ස්වක්ෂේත්‍ර)';
          statusParts.push('Own Sign');
      } else {
          // Check friendship/enmity with sign lord
          const signLord = RASHIS[rashi - 1]?.lord;
          if (signLord && p.name !== signLord) {
            if (NATURAL_FRIENDS[p.name]?.includes(signLord)) {
              score += 10;
              statusParts.push("Friend's Sign");
            } else if (NATURAL_ENEMIES[p.name]?.includes(signLord)) {
              score -= 10;
              statusParts.push("Enemy's Sign");
            } else {
              statusParts.push('Neutral Sign');
            }
          }
      }
      
      // ── 2. House Position (Kendra/Trikona/Upachaya/Dusthana) ──
      if (houseNum) {
          if ([1, 4, 7, 10].includes(houseNum)) {
              score += 15; 
              statusParts.push('Kendra');
          } else if ([5, 9].includes(houseNum)) {
              score += 12;
              statusParts.push('Trikona');
          } else if ([3, 6, 11].includes(houseNum)) {
              score += 5; // Upachaya — planets grow stronger here over time
              statusParts.push('Upachaya');
          } else if ([8, 12].includes(houseNum)) {
              score -= 10;
              statusParts.push('Dusthana');
          } else if (houseNum === 2) {
              score += 3; // Maraka but also dhana
              statusParts.push('Dhana');
          }
      }

      // ── 3. Dig Bala (Directional Strength) ──
      if (DIG_BALA[p.name] && houseNum) {
        const strongHouse = DIG_BALA[p.name];
        const dist = Math.abs(((houseNum - strongHouse + 12) % 12));
        if (dist === 0) {
          score += 10;
          statusParts.push('Dig Bala (strong)');
        } else if (dist === 6) {
          score -= 5; // Opposite of dig bala direction
        }
      }

      // ── 4. Aspects Received (benefic aspects boost, malefic aspects reduce) ──
      if (drishtis?.planetAspectedBy?.[p.name]) {
        for (const asp of drishtis.planetAspectedBy[p.name]) {
          const aspNature = getFunctionalNature(lagnaName, asp.planet);
          if (aspNature === 'yogaKaraka' || aspNature === 'benefic') {
            score += 5;
          } else if (aspNature === 'malefic') {
            score -= 3;
          }
          // Jupiter's aspect always helps
          if (asp.planet === 'Jupiter') score += 3;
        }
      }

      // ── 5. Retrograde Effect ──
      if (p.isRetrograde && !['Sun', 'Moon', 'Rahu', 'Ketu'].includes(p.name)) {
        // Retrograde planets are strong but give results of previous house
        score += 5; // More powerful due to proximity to Earth
        statusParts.push('Retrograde');
      }

      // ── 6. Combustion (too close to Sun) ──
      if (combustMap[key]) {
        const combDist = combustMap[key];
        const combPenalty = Math.max(5, 15 - Math.floor(combDist));
        score -= combPenalty;
        statusParts.push(`Combust (${combDist.toFixed(1)}° from Sun)`);
      }

      // ── 7. Graha Yuddha (Planetary War) ──
      if (grahaYuddha[key]) {
        score -= 12;
        statusParts.push(`Lost war to ${grahaYuddha[key].opponent}`);
      }

      // ── 8. Neecha Bhanga Raja Yoga ──
      if (neechaBhanga[key]) {
        // Cancellation reverses debilitation — can even give Raja Yoga results
        score += neechaBhanga[key].isRajaYoga ? 50 : 35;
        statusParts.push('Neecha Bhanga' + (neechaBhanga[key].isRajaYoga ? ' Raja Yoga!' : ''));
      }

      // ── 9. Vargottama (same sign in D1 and D9) ──
      if (navamsha?.planets?.[key]) {
        const d9Rashi = navamsha.planets[key].navamshaRashiId;
        if (d9Rashi === rashi) {
          score += 8;
          statusParts.push('Vargottama');
        }
      }

      // ── 10. Hora Strength (day/night birth) ──
      const birthHour = date.getUTCHours() + date.getUTCMinutes() / 60;
      // Approximate — SLT daytime 6-18
      const sltHour = (birthHour + 5.5) % 24;
      const isDaytime = sltHour >= 6 && sltHour < 18;
      if (isDaytime && ['Sun', 'Jupiter', 'Venus'].includes(p.name)) score += 3;
      if (!isDaytime && ['Moon', 'Mars', 'Saturn'].includes(p.name)) score += 3;

      // ── 11. Functional Nature for this Lagna ──
      const funcNature = getFunctionalNature(lagnaName, p.name);
      if (funcNature === 'yogaKaraka') {
        score += 8;
        statusParts.push('Yoga Karaka');
      } else if (funcNature === 'benefic') {
        score += 3;
      } else if (funcNature === 'malefic') {
        score -= 2;
      }
      
      // Cap score
      score = Math.min(100, Math.max(0, score));
      
      let strengthLabel = 'Medium';
      if (score >= 75) strengthLabel = 'Very Strong';
      else if (score >= 60) strengthLabel = 'Strong';
      else if (score >= 45) strengthLabel = 'Medium';
      else if (score <= 30) strengthLabel = 'Very Weak';
      else if (score <= 45) strengthLabel = 'Weak';
      
      strengths[key] = {
          name: p.name,
          sinhala: p.sinhala,
          score: Math.round(score),
          strength: strengthLabel,
          status: statusParts.join(' | ') || 'Neutral',
          house: houseNum,
          rashi: p.rashiEnglish,
          isRetrograde: p.isRetrograde || false,
          isCombust: !!combustMap[key],
          combustDistance: combustMap[key] || null,
          grahaYuddha: grahaYuddha[key] || null,
          neechaBhanga: neechaBhanga[key] || null,
          isVargottama: navamsha?.planets?.[key]?.navamshaRashiId === rashi,
          dignityLevel: statusParts[0] || 'Neutral',
      };
  }
    
  return strengths;
}

/**
 * Detect major Yogas & Doshas
 */
function detectYogas(date, lat, lng) {
  // Need chart data
  const { houses: d1Houses, lagna } = buildHouseChart(date, lat, lng);
  const planets = getAllPlanetPositions(date, lat, lng);
  
  // Helper to find planet house (1-12)
  const getPlanetHouse = (planetName) => {
    const h = d1Houses.find(h => h.planets.some(p => p.name === planetName));
    return h ? h.houseNumber : null;
  };
  
  const yogas = [];
  
  // 1. Gaja Kesari Yoga (Jupiter in Kendra from Moon)
  const moonHouse = getPlanetHouse('Moon');
  const jupiterHouse = getPlanetHouse('Jupiter');
  
  if (moonHouse && jupiterHouse) {
    const distance = ((jupiterHouse - moonHouse + 12) % 12) + 1;
    if ([1, 4, 7, 10].includes(distance)) {
      yogas.push({
        name: 'Gaja Kesari Yoga',
        sinhala: 'ගජ කේසරී යෝගය',
        icon: '🐘',
        description: 'Jupiter in an angle from the Moon. Grants wisdom, respect, and lasting fame.',
        strength: 'Strong'
      });
    }
  }
  
  // 2. Budhaditya Yoga (Sun + Mercury together)
  const sunHouse = getPlanetHouse('Sun');
  const mercuryHouse = getPlanetHouse('Mercury');
  if (sunHouse && mercuryHouse && sunHouse === mercuryHouse) {
    yogas.push({
        name: 'Budhaditya Yoga',
        sinhala: 'බුධ ආදිත්‍ය යෝගය',
        icon: '☀️',
        description: 'Sun and Mercury conjunction. Enhances intelligence, communication, and analytical skills.',
        strength: 'Medium'
    });
  }
  
  // 3. Lakshmi Yoga (Venus in own/exalted in Kendra/Trikona)
  const venusObj = planets['Venus'];
  if (venusObj) {
      // Taurus(2), Libra(7) own; Pisces(12) exalted
      const isGoodSign = [2, 7, 12].includes(venusObj.rashiId);
      const venusHouse = getPlanetHouse('Venus'); // from Lagna
      const isKendraTrikona = [1, 4, 7, 10, 5, 9].includes(venusHouse);
      
      if (isGoodSign && isKendraTrikona) {
          yogas.push({
            name: 'Lakshmi Yoga',
            sinhala: 'ලක්ෂ්මී යෝගය',
            icon: '💰',
            description: 'Venus well placed. Brings wealth, luxury, and comfort.',
            strength: 'Strong'
          });
      }
  }
  
  // 4. Pancha Mahapurusha Yogas
  // Mars (Ruchaka): Aries(1), Scorpio(8), Capricorn(10) in Kendra
  const marsObj = planets['Mars'];
  const marsHouse = getPlanetHouse('Mars');
  if (marsObj && [1, 4, 7, 10].includes(marsHouse) && [1, 8, 10].includes(marsObj.rashiId)) {
      yogas.push({
          name: 'Ruchaka Yoga',
          description: 'Mars strong in Kendra. Gives courage, military prowess, and property.',
          sinhala: 'රුචක යෝගය',
          icon: '⚔️',
          strength: 'Very Strong'
      });
  }
  
  // Mercury (Bhadra): Gemini(3), Virgo(6) in Kendra
  if (mercuryHouse && planets['Mercury'] && [1, 4, 7, 10].includes(mercuryHouse) && [3, 6].includes(planets['Mercury'].rashiId)) {
        yogas.push({
          name: 'Bhadra Yoga',
          description: 'Mercury strong in Kendra. Gifts high intellect, speech, and business acumen.',
          sinhala: 'භද්‍ර යෝගය',
          icon: '🎓',
          strength: 'Very Strong'
      }); 
  }
  
  // Jupiter (Hamsa): Sagittarius(9), Pisces(12), Cancer(4) in Kendra
  if (jupiterHouse && planets['Jupiter'] && [1, 4, 7, 10].includes(jupiterHouse) && [9, 12, 4].includes(planets['Jupiter'].rashiId)) {
        yogas.push({
          name: 'Hamsa Yoga',
          description: 'Jupiter strong in Kendra. Indicates spiritual wisdom, purity, and respect.',
          sinhala: 'හංස යෝගය',
          icon: '🦢',
          strength: 'Very Strong'
      }); 
  }
  
  // Saturn (Shasha): Capricorn(10), Aquarius(11), Libra(7) in Kendra
  const satHouse = getPlanetHouse('Saturn');
  if (satHouse && planets['Saturn'] && [1, 4, 7, 10].includes(satHouse) && [10, 11, 7].includes(planets['Saturn'].rashiId)) {
        yogas.push({
          name: 'Shasha Yoga',
          description: 'Saturn strong in Kendra. Grants authority, discipline, and leadership over many.',
          sinhala: 'ශශ යෝගය',
          icon: '👑',
          strength: 'Very Strong'
      }); 
  }

  // 5. Kemadruma Dosha (No planets 2nd or 12th from Moon, excluding Sun/Rahu/Ketu)
  if (moonHouse) {
      // Logic: Check indices in the houses array
      // moonHouse is 1-based index (1..12)
      // Array index is moonHouse - 1
      const idx = moonHouse - 1;
      const prevIdx = (idx - 1 + 12) % 12; // 12th house from Moon
      const nextIdx = (idx + 1) % 12;      // 2nd house from Moon
      
      // Helper to check for visible planets (ignore Sun, Nodes, Lagna)
      const hasVisiblePlanet = (houseObj) => {
          return houseObj.planets.some(p => !['Sun', 'Rahu', 'Ketu', 'Lagna', 'Ascendant'].includes(p.name));
      };
      
      const hasPlanet12 = hasVisiblePlanet(d1Houses[prevIdx]);
      const hasPlanet2 = hasVisiblePlanet(d1Houses[nextIdx]);
      // Also check conjunction with Moon
      const hasPlanetConjunct = d1Houses[idx].planets.some(p => !['Sun', 'Rahu', 'Ketu', 'Lagna', 'Ascendant', 'Moon'].includes(p.name));
      
      if (!hasPlanet12 && !hasPlanet2 && !hasPlanetConjunct) {
           yogas.push({
              name: 'Kemadruma Dosha',
              sinhala: 'කේමද්‍රුම දෝෂය',
              icon: '⚠️',
              description: 'Moon isolated without support. Can indicate mental restlessness or struggles.',
              strength: 'Strong'
           });
      }
  }

  return yogas;
}

module.exports = {
  NAKSHATRAS,
  RASHIS,
  PLANETS,
  WEEKDAYS,
  HOUSE_SIGNIFICATIONS,
  PLANET_KARAKAS,
  FUNCTIONAL_STATUS,
  AYANAMSHA_MODES,
  calculateRahuKalaya,
  calculateSunriseSunset,
  getMoonLongitude,
  getSunLongitude,
  getAyanamsha,
  setAyanamshaMode,
  getCurrentAyanamshaMode,
  toSidereal,
  getNakshatra,
  getRashi,
  getTithi,
  getYoga,
  getKarana,
  getLagna,
  getAllPlanetPositions,
  buildHouseChart,
  buildNavamshaChart,
  buildShadvarga,
  calculateDrishtis,
  analyzePushkara,
  checkPushkaraNavamsha,
  checkPushkaraBhaga,
  calculateAshtakavarga,
  buildBhavaChalit,
  detectYogas,
  getPlanetStrengths,
  getPanchanga,
  getDailyNakath,
  dateToJD,
  calculateVimshottari,
  calculateVimshottariDetailed,
  generateDetailedReport,
  generateFullReport,
  predictMarriageTiming,
  assessMarriageDenial,
  getFunctionalNature,
  analyzeHouse,
  getRahuLongitude,
};
