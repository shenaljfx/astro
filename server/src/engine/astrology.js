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

// Debug logger — gated by DEBUG_ASTRO=1 env var. Defaults to no-op so production
// is not flooded with diagnostic output (which was costing hundreds of ms per
// full report on the previous build).
const DEBUG_ASTRO = process.env.DEBUG_ASTRO === '1';
const debugLog = DEBUG_ASTRO ? console.log.bind(console) : function(){};

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
  3:  [{ start: 6.667, end: 10.000, navamsha: 'Dhanus' }, { start: 16.667, end: 20.000, navamsha: 'Meena' }],      // Mithuna
  7:  [{ start: 6.667, end: 10.000, navamsha: 'Dhanus' }, { start: 16.667, end: 20.000, navamsha: 'Meena' }],      // Tula
  11: [{ start: 6.667, end: 10.000, navamsha: 'Dhanus' }, { start: 16.667, end: 20.000, navamsha: 'Meena' }],      // Kumbha
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
    
    let strength = 'average';
    if (sarva[i] >= 30) strength = 'strong';
    else if (sarva[i] >= 25) strength = 'average';
    else strength = 'weak';

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
      });
    }
  }

  return {
    houses,
    planetShifts,
    lagnaExactDegree: lagnaSidereal,
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
      });
    }
  }

  return {
    date: date.toISOString(),
    panchanga,
    rahuKalaya: {
      start: rahuKalaya.start,
      end: rahuKalaya.end,
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

  // ── 1–8: Planet placements affecting 5th/7th houses ──
  // Architecture: Engine provides ONLY technical data (planet, house, aspect, retrograde, points).
  // AI interprets the marriage implications using Vedic signification knowledge.
  if (saturnHouse === 5) {
    const pts = isPlanetRetrograde('Saturn') ? 14 : 8;
    denialScore += pts;
    afflictions.push({ planet: 'Saturn', house: 5, type: 'placement', isRetrograde: isPlanetRetrograde('Saturn'), points: pts, targetHouse: 5 });
  }
  if (saturnHouse === 7) {
    const pts = isPlanetRetrograde('Saturn') ? 16 : 10;
    denialScore += pts;
    afflictions.push({ planet: 'Saturn', house: 7, type: 'placement', isRetrograde: isPlanetRetrograde('Saturn'), points: pts, targetHouse: 7 });
  }
  if (saturnHouse !== 7 && doesPlanetAspectHouse('Saturn', 7)) {
    const pts = isPlanetRetrograde('Saturn') ? 10 : 6;
    denialScore += pts;
    afflictions.push({ planet: 'Saturn', house: saturnHouse, type: 'aspect', targetHouse: 7, isRetrograde: isPlanetRetrograde('Saturn'), points: pts });
  }
  if (ketuHouse === 7) {
    denialScore += 15;
    afflictions.push({ planet: 'Ketu', house: 7, type: 'placement', points: 15, targetHouse: 7 });
  }
  if (ketuHouse !== 7 && doesPlanetAspectHouse('Ketu', 7)) {
    denialScore += 8;
    afflictions.push({ planet: 'Ketu', house: ketuHouse, type: 'aspect', targetHouse: 7, points: 8 });
  }
  if (rahuHouse === 7) {
    denialScore += 8;
    afflictions.push({ planet: 'Rahu', house: 7, type: 'placement', points: 8, targetHouse: 7 });
  }
  if (moonHouse === 8) {
    denialScore += 10;
    afflictions.push({ planet: 'Moon', house: 8, type: 'placement', points: 10, targetHouse: 7 });
  }
  if (moonHouse === 12) {
    denialScore += 7;
    afflictions.push({ planet: 'Moon', house: 12, type: 'placement', points: 7, targetHouse: 7 });
  }

  // ── 9. Venus combustion ──
  const venusSid = houseChart.planets.venus ? houseChart.planets.venus.sidereal : -1;
  const sunSid = houseChart.planets.sun ? houseChart.planets.sun.sidereal : -1;
  if (venusSid >= 0 && sunSid >= 0) {
    let vsDiff = Math.abs(venusSid - sunSid);
    if (vsDiff > 180) vsDiff = 360 - vsDiff;
    const isCombust = vsDiff <= 10;
    if (isCombust) {
      const isCriticalHouse = [6, 8, 10, 12].includes(venusHouse);
      const tightBonus = vsDiff <= 3 ? 3 : 0;
      const pts = (isCriticalHouse ? 12 : 7) + tightBonus;
      denialScore += pts;
      afflictions.push({ planet: 'Venus', type: 'combustion', combustOrb: parseFloat(vsDiff.toFixed(1)), house: venusHouse, isCriticalHouse, points: pts, targetHouse: 7 });
    }
  }

  // ── 10–12: 7th lord in dusthana houses ──
  if (lord7House === 6) {
    denialScore += 12;
    afflictions.push({ planet: lord7, type: '7thLordPlacement', house: 6, points: 12, targetHouse: 7 });
  }
  if (lord7House === 8) {
    denialScore += 10;
    afflictions.push({ planet: lord7, type: '7thLordPlacement', house: 8, points: 10, targetHouse: 7 });
  }
  if (lord7House === 12) {
    denialScore += 6;
    afflictions.push({ planet: lord7, type: '7thLordPlacement', house: 12, points: 6, targetHouse: 7 });
  }

  // ── 13. Venus in dusthana ──
  if ([6, 8, 12].includes(venusHouse)) {
    const pts = venusHouse === 8 ? 10 : venusHouse === 6 ? 9 : 7;
    denialScore += pts;
    afflictions.push({ planet: 'Venus', type: 'dusthanaPlacement', house: venusHouse, points: pts, targetHouse: 7 });
  }

  // ── 14. Venus retrograde ──
  if (isPlanetRetrograde('Venus')) {
    denialScore += 8;
    afflictions.push({ planet: 'Venus', type: 'retrograde', house: venusHouse, points: 8, targetHouse: 7 });
  }

  // ── 15. 7th lord retrograde ──
  if (lord7 !== 'Sun' && lord7 !== 'Moon' && isPlanetRetrograde(lord7)) {
    denialScore += 6;
    afflictions.push({ planet: lord7, type: '7thLordRetrograde', house: lord7House, points: 6, targetHouse: 7 });
  }

  // ── 16. Mars in 7th (Kuja Dosha direct) ──
  if (marsHouse === 7) {
    denialScore += 8;
    afflictions.push({ planet: 'Mars', type: 'kujaDosha', house: 7, points: 8, targetHouse: 7 });
  }

  // ── 17. Mars in 1st or 8th (strong Kuja Dosha) ──
  if (marsHouse === 1 || marsHouse === 8) {
    denialScore += 6;
    afflictions.push({ planet: 'Mars', type: 'kujaDosha', house: marsHouse, points: 6, targetHouse: 7 });
  }

  // ── 18. Empty 7th + lord in 10th ──
  if (planetsIn7.length === 0 && lord7House === 10) {
    denialScore += 8;
    afflictions.push({ planet: lord7, type: 'emptyHouseWithLordInCareer', house: 10, emptyHouse: 7, points: 8, targetHouse: 7 });
  }

  // ── 19. Multiple malefics on 7th ──
  const maleficsOn7 = [];
  MALEFICS.forEach(m => {
    if (getPlanetHouse(m) === 7) maleficsOn7.push({ planet: m, relation: 'in' });
    else if (doesPlanetAspectHouse(m, 7)) maleficsOn7.push({ planet: m, relation: 'aspects' });
  });
  if (maleficsOn7.length >= 3) {
    denialScore += 12;
    afflictions.push({ type: 'multipleMalefics', count: maleficsOn7.length, malefics: maleficsOn7, points: 12, targetHouse: 7 });
  } else if (maleficsOn7.length === 2) {
    denialScore += 6;
    afflictions.push({ type: 'multipleMalefics', count: maleficsOn7.length, malefics: maleficsOn7, points: 6, targetHouse: 7 });
  }

  // ── 20. D9 Navamsha 7th house analysis ──
  if (navamsha?.houses) {
    const nav7 = navamsha.houses[6];
    const nav7Planets = nav7?.planets || [];
    const nav7HasBenefics = nav7Planets.some(p => BENEFICS.includes(p.name));
    const nav7HasMalefics = nav7Planets.some(p => MALEFICS.includes(p.name));
    const nav7Empty = nav7Planets.length === 0;
    if (nav7Empty) {
      denialScore += 6;
      afflictions.push({ type: 'navamshaEmpty7th', chart: 'D9', points: 6, targetHouse: 7 });
    }
    if (nav7HasMalefics && !nav7HasBenefics) {
      denialScore += 8;
      afflictions.push({ type: 'navamshaMalefic7th', chart: 'D9', planets: nav7Planets.map(p => p.name), points: 8, targetHouse: 7 });
    }
    const navVenus = navamsha.planets?.venus;
    const navVenusRashi = navVenus?.navamshaRashiEnglish || navVenus?.rashi || '';
    if (navVenusRashi.toLowerCase().includes('virgo')) {
      denialScore += 8;
      afflictions.push({ type: 'navamshaVenusDebilitated', chart: 'D9', venusRashi: 'Virgo', points: 8, targetHouse: 7 });
    }
  }

  // ── 21. Ketu in 12th ──
  if (ketuHouse === 12) {
    denialScore += 7;
    afflictions.push({ planet: 'Ketu', type: 'placement', house: 12, points: 7, targetHouse: 7 });
  }

  // ── 22. Saturn influencing Venus ──
  if (doesPlanetAspectHouse('Saturn', venusHouse) || saturnHouse === venusHouse) {
    const pts = saturnHouse === venusHouse ? 9 : 6;
    const isConjunction = saturnHouse === venusHouse;
    denialScore += pts;
    afflictions.push({ planet: 'Saturn', type: isConjunction ? 'conjunctionWithVenus' : 'aspectOnVenus', house: saturnHouse, venusHouse, points: pts, targetHouse: 7 });
  }

  // ── 23. 7th lord conjunct Rahu/Ketu ──
  if (lord7House === rahuHouse && lord7House > 0) {
    denialScore += 7;
    afflictions.push({ planet: lord7, type: '7thLordConjunctRahu', house: lord7House, points: 7, targetHouse: 7 });
  }
  if (lord7House === ketuHouse && lord7House > 0) {
    denialScore += 8;
    afflictions.push({ planet: lord7, type: '7thLordConjunctKetu', house: lord7House, points: 8, targetHouse: 7 });
  }

  // ── 24. Rahu in 6th ──
  if (rahuHouse === 6) {
    denialScore += 4;
    afflictions.push({ planet: 'Rahu', type: 'placement', house: 6, points: 4, targetHouse: 7 });
  }

  // ── 25. Empty 1-7 axis ──
  if (planetsIn1.length === 0 && planetsIn7.length === 0) {
    denialScore += 2;
    afflictions.push({ type: 'emptyAxis', houses: [1, 7], points: 2, targetHouse: 7 });
  }

  // ═══════════════════════════════════════════════════════════
  // SUPPORTIVE INDICATORS (reduce denial score) — technical data only
  // ═══════════════════════════════════════════════════════════

  if (doesPlanetAspectHouse('Jupiter', 7) || jupiterHouse === 7) {
    const pts = jupiterHouse === 7 ? 12 : 8;
    denialScore -= pts;
    supportive.push({ planet: 'Jupiter', type: jupiterHouse === 7 ? 'placement' : 'aspect', house: jupiterHouse, targetHouse: 7, points: pts });
  }

  if ([1, 4, 5, 7, 9, 10, 11].includes(venusHouse) && venusHouse !== sunHouse) {
    const pts = [5, 7, 9].includes(venusHouse) ? 8 : [1, 4, 10].includes(venusHouse) ? 5 : 3;
    denialScore -= pts;
    supportive.push({ planet: 'Venus', type: 'wellPlaced', house: venusHouse, points: pts });
  }

  if ([1, 4, 5, 7, 9, 10].includes(lord7House)) {
    const pts = [1, 7].includes(lord7House) ? 8 : [4, 10].includes(lord7House) ? 5 : 4;
    denialScore -= pts;
    supportive.push({ planet: lord7, type: '7thLordWellPlaced', house: lord7House, isKendra: [1, 4, 7, 10].includes(lord7House), isTrikona: [1, 5, 9].includes(lord7House), points: pts });
  }

  const beneficsIn7 = planetsIn7.filter(p => BENEFICS.includes(p));
  if (beneficsIn7.length > 0) {
    const pts = beneficsIn7.length * 6;
    denialScore -= pts;
    supportive.push({ type: 'beneficsIn7th', planets: beneficsIn7, count: beneficsIn7.length, points: pts });
  }

  if (navamsha?.houses) {
    const nav7Planets = navamsha.houses[6]?.planets || [];
    const nav7Benefics = nav7Planets.filter(p => BENEFICS.includes(p.name));
    if (nav7Benefics.length > 0) {
      const pts = nav7Benefics.length * 5;
      denialScore -= pts;
      supportive.push({ type: 'navamshaBenefics7th', chart: 'D9', planets: nav7Benefics.map(p => p.name), points: pts });
    }
    const navVenusObj = navamsha.planets?.venus;
    const navVenusRashi = navVenusObj?.navamshaRashiEnglish || navVenusObj?.rashi || '';
    if (/taurus|libra|pisces/i.test(navVenusRashi)) {
      const pts = /pisces/i.test(navVenusRashi) ? 8 : 5;
      denialScore -= pts;
      supportive.push({ type: 'navamshaVenusStrong', chart: 'D9', venusRashi: navVenusRashi, isExalted: /pisces/i.test(navVenusRashi), points: pts });
    }
  }

  if ([1, 2, 4, 5, 7, 9, 10, 11].includes(moonHouse)) {
    const pts = [4, 5, 7].includes(moonHouse) ? 5 : 3;
    denialScore -= pts;
    supportive.push({ planet: 'Moon', type: 'wellPlaced', house: moonHouse, points: pts });
  }

  if (doesPlanetAspectHouse('Jupiter', venusHouse) || jupiterHouse === venusHouse) {
    const pts = jupiterHouse === venusHouse ? 8 : 5;
    denialScore -= pts;
    supportive.push({ planet: 'Jupiter', type: jupiterHouse === venusHouse ? 'conjunctionWithVenus' : 'aspectOnVenus', house: jupiterHouse, venusHouse, points: pts });
  }

  const lord2 = getHouseLord(2);
  const lord11 = getHouseLord(11);
  const lord2House = getPlanetHouse(lord2);
  const lord11House = getPlanetHouse(lord11);
  if ([1, 4, 5, 7, 9, 10].includes(lord2House)) {
    denialScore -= 3;
    supportive.push({ planet: lord2, type: '2ndLordWellPlaced', house: lord2House, points: 3 });
  }
  if ([1, 4, 5, 7, 9, 10].includes(lord11House)) {
    denialScore -= 3;
    supportive.push({ planet: lord11, type: '11thLordWellPlaced', house: lord11House, points: 3 });
  }

  if (planetsIn7.length > 0) {
    denialScore -= 3;
    supportive.push({ type: 'occupiedHouse', house: 7, planets: planetsIn7, points: 3 });
  }

  // ═══════════════════════════════════════════════════════════
  // FINAL CALCULATION — severity label only, no interpretation strings
  // ═══════════════════════════════════════════════════════════
  denialScore = Math.max(0, Math.min(100, denialScore));

  let severity;
  if (denialScore >= 50) severity = 'SEVERE';
  else if (denialScore >= 35) severity = 'HIGH';
  else if (denialScore >= 20) severity = 'MODERATE';
  else if (denialScore >= 10) severity = 'MILD';
  else severity = 'NONE';

  debugLog(`[MarriageDenial] Score: ${denialScore}/100, Severity: ${severity}, Afflictions: ${afflictions.length}, Supportive: ${supportive.length}`);

  return {
    denialScore,
    severity,
    afflictions: afflictions.sort((a, b) => b.points - a.points),
    supportive,
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

  debugLog('[MarriageTiming] Lagna:', lagnaName, '| 7th lord:', lord7, 'in H' + lord7House);
  debugLog('[MarriageTiming] Significators:', [...marriageSignificators].join(', '));
  debugLog('[MarriageTiming] Planets aspecting 7th:', planetsAspecting7.join(', '));

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
        reasons.push({ rule: 'mdSignificator', planet: mdLord, pts: 15 });
      }
      // Antardasha lord is a marriage significator
      if (marriageSignificators.has(adLord)) {
        score += 15;
        reasons.push({ rule: 'adSignificator', planet: adLord, pts: 15 });
      }

      // ── RULE 2: Dasha lord is 7th lord or Venus (extra weight) ──
      if (mdLord === lord7 || mdLord === 'Venus') {
        score += 10;
        reasons.push({ rule: 'mdIs7thLordOrVenus', planet: mdLord, pts: 10 });
      }
      if (adLord === lord7 || adLord === 'Venus') {
        score += 10;
        reasons.push({ rule: 'adIs7thLordOrVenus', planet: adLord, pts: 10 });
      }

      // ── RULE 2b: Venus antardasha special bonus ──
      if (adLord === 'Venus') {
        const venusKarakaBonus = (lord7 === 'Venus') ? 4 : 8;
        score += venusKarakaBonus;
        reasons.push({ rule: 'venusADKaraka', pts: venusKarakaBonus, venusIs7thLord: lord7 === 'Venus' });
        const venusH = getPlanetHouse('Venus');
        if (venusH && [1, 4, 5, 7, 9, 10].includes(venusH)) {
          score += 5;
          reasons.push({ rule: 'venusInKendraTrikona', house: venusH, pts: 5 });
        }
      }
      if (mdLord === 'Venus') {
        const venusMDBonus = (lord7 === 'Venus') ? 3 : 5;
        score += venusMDBonus;
        reasons.push({ rule: 'venusMDKaraka', pts: venusMDBonus, venusIs7thLord: lord7 === 'Venus' });
      }

      // ── RULE 3: Rahu/Ketu as proxy (they activate their dispositor's house) ──
      if (mdLord === 'Rahu' && rahuDispositor && marriageSignificators.has(rahuDispositor)) {
        score += 10;
        reasons.push({ rule: 'rahuMDDispositor', planet: 'Rahu', dispositor: rahuDispositor, pts: 10 });
      }
      if (mdLord === 'Ketu' && ketuDispositor && marriageSignificators.has(ketuDispositor)) {
        score += 10;
        reasons.push({ rule: 'ketuMDDispositor', planet: 'Ketu', dispositor: ketuDispositor, pts: 10 });
      }
      if (adLord === 'Rahu' && rahuDispositor && marriageSignificators.has(rahuDispositor)) {
        score += 8;
        reasons.push({ rule: 'rahuADDispositor', planet: 'Rahu', dispositor: rahuDispositor, pts: 8 });
      }
      if (adLord === 'Ketu' && ketuDispositor && marriageSignificators.has(ketuDispositor)) {
        score += 8;
        reasons.push({ rule: 'ketuADDispositor', planet: 'Ketu', dispositor: ketuDispositor, pts: 8 });
      }

      // ── RULE 4: Dasha lord placed in or aspecting 7th house natally ──
      const mdHouse = getPlanetHouse(mdLord);
      const adHouse = getPlanetHouse(adLord);
      if (mdHouse === 7) { score += 8; reasons.push({ rule: 'mdInH7', planet: mdLord, pts: 8 }); }
      if (adHouse === 7) { score += 8; reasons.push({ rule: 'adInH7', planet: adLord, pts: 8 }); }
      if (planetsAspecting7.includes(mdLord)) { score += 5; reasons.push({ rule: 'mdAspectsH7', planet: mdLord, pts: 5 }); }
      if (planetsAspecting7.includes(adLord)) { score += 5; reasons.push({ rule: 'adAspectsH7', planet: adLord, pts: 5 }); }

      // ── RULE 4b: Rahu-Saturn affinity (Shani vat Rahu principle) ──
      // In Vedic astrology, Rahu acts like Saturn — their combined period amplifies commitment
      if ((mdLord === 'Rahu' && adLord === 'Saturn') || (mdLord === 'Saturn' && adLord === 'Rahu')) {
        score += 5;
        reasons.push({ rule: 'rahuSaturnCombo', pts: 5 });
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
              reasons.push({ rule: 'saturnAspectH2H11', aspect: asp, targetHouse: aspH, pts: 3 });
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
        reasons.push({ rule: 'moonInH7', pts: 10 });
        const moonRashiId = houses.find(h => h.planets.some(p => p.name === 'Moon'))?.rashiId;
        const moonDispositor = moonRashiId ? (RASHIS[moonRashiId - 1]?.lord || null) : null;
        if (moonDispositor && adLord === moonDispositor) {
          score += 8;
          reasons.push({ rule: 'adIsMoonDispositor', planet: adLord, dispositor: moonDispositor, pts: 8 });
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
          if (mdLord === 'Saturn' || adLord === 'Saturn') {
            score += 8;
            reasons.push({ rule: 'saturnAspectsH12_dashaLord', pts: 8 });
          } else {
            score += 2;
            reasons.push({ rule: 'saturnAspectsH12_natal', pts: 2 });
          }
        }
      }

      // ── RULE 5: Dasha lord connects to 2nd or 11th house ──
      if (mdHouse === 2 || mdHouse === 11) { score += 4; reasons.push({ rule: 'mdInH2H11', planet: mdLord, house: mdHouse, pts: 4 }); }
      if (adHouse === 2 || adHouse === 11) { score += 4; reasons.push({ rule: 'adInH2H11', planet: adLord, house: adHouse, pts: 4 }); }
      if (mdLord === lord2 || mdLord === lord11) { score += 3; reasons.push({ rule: 'mdRulesH2H11', planet: mdLord, pts: 3 }); }
      if (adLord === lord2 || adLord === lord11) { score += 3; reasons.push({ rule: 'adRulesH2H11', planet: adLord, pts: 3 }); }

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
        reasons.push({ rule: 'adRulesKendra', planet: adLord, houses: adRuledHouses.filter(h => [1,4,7,10].includes(h)), pts: 5 });
      }
      if (mdRuledHouses.some(h => [1, 4, 7, 10].includes(h))) {
        score += 3;
        reasons.push({ rule: 'mdRulesKendra', planet: mdLord, houses: mdRuledHouses.filter(h => [1,4,7,10].includes(h)), pts: 3 });
      }

      // ── RULE 5b-EXTRA: 4th lord antardasha = marriage settlement indicator ──
      // The 4th house = domestic happiness, home, family foundation. When the 4th lord
      // runs as AD during a marriage-linked MD, it specifically triggers setting up a home
      // and getting married. This is one of the most overlooked marriage triggers.
      if (adRuledHouses.includes(4)) {
        score += 8;
        reasons.push({ rule: 'adIsH4Lord', planet: adLord, pts: 8 });
        if (adRuledHouses.includes(2) || adRuledHouses.includes(3)) {
          score += 4;
          reasons.push({ rule: 'adAlsoRulesH2H3', planet: adLord, house: adRuledHouses.includes(2) ? 2 : 3, pts: 4 });
        }
      }
      if (mdRuledHouses.includes(4)) {
        score += 4;
        reasons.push({ rule: 'mdIsH4Lord', planet: mdLord, pts: 4 });
      }

      // Special: if one lord rules 4th (home) and the other connects to 7th — marriage + settling down
      if ((mdRuledHouses.includes(4) && (adRuledHouses.includes(7) || adLord === lord7 || adLord === 'Venus')) ||
          (adRuledHouses.includes(4) && (mdRuledHouses.includes(7) || mdLord === lord7 || mdLord === 'Venus'))) {
        score += 6;
        reasons.push({ rule: 'h4PlusH7Connection', pts: 6 });
      }

      // ── RULE 5c: AD lord's dispositor connects to 7th ──
      // Where is the AD lord placed? Its dispositor (rashi lord of that house) matters
      const adLordRashiId = houses[adHouse - 1]?.rashiId;
      const adDispositor = adLordRashiId ? (RASHIS[adLordRashiId - 1]?.lord || null) : null;
      if (adDispositor && marriageSignificators.has(adDispositor) && adDispositor !== adLord) {
        score += 5;
        reasons.push({ rule: 'adDispositorSignificator', planet: adLord, dispositor: adDispositor, pts: 5 });
      }

      // ── RULE 5d: Natural significator bonus ──
      if (adLord === 'Saturn' && (mdRuledHouses.includes(7) || marriageSignificators.has(mdLord))) {
        score += 4;
        reasons.push({ rule: 'saturnADWithMarriageMD', pts: 4 });
      }
      if (mdLord === 'Jupiter' || adLord === 'Jupiter') {
        const jupLord = mdLord === 'Jupiter' ? 'MD' : 'AD';
        score += 2;
        reasons.push({ rule: 'jupiterDasha', period: jupLord, pts: 2 });
      }

      // ── RULE 5e: Mutual connection between MD and AD lords in natal chart ──
      // If MD lord is in the sign ruled by AD lord or vice versa = strong activation
      const mdLordRashiId = houses[mdHouse - 1]?.rashiId;
      const mdDispositor = mdLordRashiId ? (RASHIS[mdLordRashiId - 1]?.lord || null) : null;
      if (mdDispositor === adLord || adDispositor === mdLord) {
        score += 6;
        reasons.push({ rule: 'mutualDispositorship', md: mdLord, ad: adLord, pts: 6 });
      }
      if (mdHouse && adHouse) {
        if (mdHouse === adHouse) {
          score += 3;
          reasons.push({ rule: 'mdAdConjunct', md: mdLord, ad: adLord, house: mdHouse, pts: 3 });
        }
        if (Math.abs(mdHouse - adHouse) === 6 || Math.abs(mdHouse - adHouse) === -6) {
          score += 2;
          reasons.push({ rule: 'mdAdOnAxis', md: mdLord, ad: adLord, pts: 2 });
        }
      }

      // ── RULE 6: D9 Navamsha connection ──
      if (navLord7 && (mdLord === navLord7 || adLord === navLord7)) {
        score += 8;
        reasons.push({ rule: 'd9H7Lord', planet: mdLord === navLord7 ? mdLord : adLord, pts: 8 });
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
          transitReasons.push({ rule: 'jupiterTransitsH7', house: 7, pts: 12 });
        } else if ([1, 5, 9].includes(jupH)) {
          transitScore += 6;
          transitReasons.push({ rule: 'jupiterTransitsTrikona', house: jupH, pts: 6 });
        } else if ([2, 11].includes(jupH)) {
          transitScore += 4;
          transitReasons.push({ rule: 'jupiterTransitsGains', house: jupH, pts: 4 });
        }
        if (transitJupRashiId === venusRashiId) {
          transitScore += 5;
          transitReasons.push({ rule: 'jupiterOverNatalVenus', pts: 5 });
        }
        if (transitJupRashiId === lord7RashiIdNatal) {
          transitScore += 5;
          transitReasons.push({ rule: 'jupiterOverNatalH7Lord', pts: 5 });
        }
        // Jupiter transit over natal Moon — especially powerful if Moon is in 7th
        const moonRashiIdNatal = houses.find(h => h.planets.some(p => p.name === 'Moon'))?.rashiId;
        if (moonRashiIdNatal && transitJupRashiId === moonRashiIdNatal) {
          const moonNatalH = getPlanetHouse('Moon');
          if (moonNatalH === 7) {
            transitScore += 10;
            transitReasons.push({ rule: 'jupiterOverMoonInH7', pts: 10 });
          } else {
            transitScore += 3;
            transitReasons.push({ rule: 'jupiterOverNatalMoon', pts: 3 });
          }
        }
        // Jupiter aspects on 7th house
        [5, 7, 9].forEach(asp => {
          const aspH = ((jupH - 1 + asp - 1) % 12) + 1;
          if (aspH === 7 && jupH !== 7) {
            transitScore += 6;
            transitReasons.push({ rule: 'jupiterAspectsH7', aspect: asp, fromHouse: jupH, pts: 6 });
          }
        });

        // Saturn transit analysis
        if (satH === 7) {
          transitScore += 6;
          transitReasons.push({ rule: 'saturnTransitsH7', pts: 6 });
        }
        // Saturn aspects: 3rd, 7th, 10th
        [3, 7, 10].forEach(asp => {
          const aspH = ((satH - 1 + asp - 1) % 12) + 1;
          if (aspH === 7 && satH !== 7) {
            transitScore += 6;
            transitReasons.push({ rule: 'saturnAspectsH7', aspect: asp, fromHouse: satH, pts: 6 });
          }
        });

        // Double transit: Jupiter + Saturn both influence 7th
        const jupTouches7 = jupH === 7 ||
          [5, 7, 9].some(a => ((jupH - 1 + a - 1) % 12) + 1 === 7);
        const satTouches7 = satH === 7 ||
          [3, 7, 10].some(a => ((satH - 1 + a - 1) % 12) + 1 === 7);

        if (jupTouches7 && satTouches7) {
          transitScore += 15;
          transitReasons.push({ rule: 'doubleTransitH7', pts: 15 });
        }

        // Rahu-Ketu on 1-7 axis
        if (rahuH === 1 || rahuH === 7) {
          transitScore += 5;
          transitReasons.push({ rule: 'rahuKetuOnAxis17', rahuHouse: rahuH, pts: 5 });
        }

        // ── Transit over 7th LORD's natal house (not just 7th house) ──
        const lord7NatalH = getPlanetHouse(lord7);
        if (lord7NatalH) {
          // Jupiter transit/aspect on 7th lord's natal position
          const jupTouchesLord7 = jupH === lord7NatalH ||
            [5, 7, 9].some(a => ((jupH - 1 + a - 1) % 12) + 1 === lord7NatalH);
          if (jupTouchesLord7) {
            transitScore += 5;
            transitReasons.push({ rule: 'jupiterActivatesH7Lord', lord: lord7, house: lord7NatalH, pts: 5 });
          }
          const satTouchesLord7 = satH === lord7NatalH ||
            [3, 7, 10].some(a => ((satH - 1 + a - 1) % 12) + 1 === lord7NatalH);
          if (satTouchesLord7) {
            transitScore += 5;
            transitReasons.push({ rule: 'saturnActivatesH7Lord', lord: lord7, house: lord7NatalH, pts: 5 });
          }
          if (jupTouchesLord7 && satTouchesLord7) {
            transitScore += 12;
            transitReasons.push({ rule: 'doubleTransitOnH7Lord', lord: lord7, pts: 12 });
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
            transitReasons.push({ rule: 'adLordTransitActivatesH7', planet: adLord, pts: 6 });
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
            transitReasons.push({ rule: 'mdLordTransitActivatesH7', planet: mdLord, pts: 4 });
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
            transitReasons.push({ rule: 'jupiterActivatesADLord', planet: adLord, house: adHouse, pts: 8 });
          }
        }
        // Saturn transit over AD lord's natal house
        if (adHouse) {
          const satTouchesADLord = satH === adHouse ||
            [3, 7, 10].some(a => ((satH - 1 + a - 1) % 12) + 1 === adHouse);
          if (satTouchesADLord) {
            transitScore += 4;
            transitReasons.push({ rule: 'saturnActivatesADLord', planet: adLord, house: adHouse, pts: 4 });
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

      // ── RULE 10: Age suitability ──
      const avgAge = (ageAtStart + ageAtEnd) / 2;
      if (avgAge >= 22 && avgAge <= 29) {
        score += 14;
        reasons.push({ rule: 'primeAge', age: Math.floor(avgAge), pts: 14 });
      } else if (avgAge >= 20 && avgAge <= 32) {
        score += 6;
        reasons.push({ rule: 'suitableAge', age: Math.floor(avgAge), pts: 6 });
      } else if (avgAge >= 18 && avgAge <= 35) {
        score += 2;
        reasons.push({ rule: 'possibleAge', age: Math.floor(avgAge), pts: 2 });
      } else if (avgAge > 40) {
        score -= 10;
        reasons.push({ rule: 'lateAgePenalty', age: Math.floor(avgAge), pts: -10 });
      } else if (avgAge < 18) {
        score -= 15;
        reasons.push({ rule: 'underagePenalty', age: Math.floor(avgAge), pts: -15 });
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
    const hasDoubleTransit = w.reasons.some(r => r.rule === 'doubleTransitH7' || r.rule === 'doubleTransitOnH7Lord');
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
      wObj.reasons.push({ rule: 'firstViableWindow', pts: 30 });
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
      w.reasons.push({ rule: 'lateAgePenaltyPost', age: Math.round(avgAge), pts: -penalty });
    } else if (avgAge < 18) {
      w.score -= 20;
      w.reasons.push({ rule: 'underagePenaltyPost', age: Math.round(avgAge), pts: -20 });
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
          w.reasons.push({ rule: 'denialPenalty', denialScore: marriageDenial.denialScore, severity: marriageDenial.severity, originalScore, newScore: w.score });
        }
      });

      // Re-sort after penalty
      windows.sort((a, b) => b.score - a.score);
      debugLog(`[MarriageTiming] Denial penalty applied: factor ${penaltyFactor}, denialScore ${marriageDenial.denialScore}`);
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
        w.reasons.push({ rule: 'confirmedMarriage', year: confirmedMarriageYear });
      }
    });
    windows.sort((a, b) => b.score - a.score);
    debugLog(`[MarriageTiming] Confirmed marriage year ${confirmedMarriageYear} — boosted matching windows`);
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
      const cancellationFactors = [];
      if (present) {
        // 1. Mars in own sign (Aries/Scorpio) — self-strength cancels
        const marsRashiId = houses.find(h => h.planets.some(p => p.name === 'Mars'))?.rashiId;
        if (marsRashiId && [1, 8].includes(marsRashiId)) { // Mesha=1, Vrischika=8
          cancelled = true;
          cancellationFactors.push({ type: 'ownSign', planet: 'Mars', rashiId: marsRashiId });
        }
        // 2. Mars in exaltation (Capricorn, rashiId=10)
        if (marsRashiId === 10) {
          cancelled = true;
          cancellationFactors.push({ type: 'exalted', planet: 'Mars', rashiId: 10 });
        }
        // 3. Jupiter/Venus aspects or conjoins Mars — benefic influence
        const jupH = getPlanetHouse('Jupiter');
        const venH = getPlanetHouse('Venus');
        if (jupH === marsH) { cancelled = true; cancellationFactors.push({ type: 'conjunction', planet: 'Jupiter' }); }
        if (venH === marsH) { cancelled = true; cancellationFactors.push({ type: 'conjunction', planet: 'Venus' }); }
        // Jupiter aspects (5th, 7th, 9th) — check distance from Jupiter to Mars
        if (jupH && marsH) {
          const jupToMars = ((marsH - jupH + 12) % 12) + 1;
          if ([5, 7, 9].includes(jupToMars)) {
            cancelled = true;
            cancellationFactors.push({ type: 'aspect', planet: 'Jupiter', aspectNum: jupToMars });
          }
        }
        // 4. Mars in H1 and the sign is Aries/Leo/Aquarius
        if (marsH === 1 && marsRashiId && [1, 5, 11].includes(marsRashiId)) {
          cancelled = true;
          cancellationFactors.push({ type: 'signInHouse', house: 1, rashiId: marsRashiId });
        }
        // 5. Mars in H7 and sign is Cancer/Capricorn
        if (marsH === 7 && marsRashiId && [4, 10].includes(marsRashiId)) {
          cancelled = true;
          cancellationFactors.push({ type: 'signInHouse', house: 7, rashiId: marsRashiId });
        }
        // 6. Mars in H8 and sign is Sagittarius/Pisces
        if (marsH === 8 && marsRashiId && [9, 12].includes(marsRashiId)) {
          cancelled = true;
          cancellationFactors.push({ type: 'signInHouse', house: 8, rashiId: marsRashiId });
        }
        // 7. Spouse also has Kuja Dosha — mutual cancellation (checked at Porondam level, not here)
      }

      return {
        present,
        cancelled,
        cancellationFactors,
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
  // Architecture: Returns ONLY pure technical data. AI interprets personality,
  // marriage prospects, wealth outlook, etc. from this technical data.
  // No hardcoded English sentences or interpretive text.

  const getPlanetHouse = (planetName) => {
    return houses.findIndex(h => h.planets.some(p => p.name === planetName)) + 1;
  };

  const getHouseLord = (houseNum) => {
    return houses[houseNum-1]?.rashiLord || 'Unknown';
  };

  const ELEMENTS_MAP = {
    fire: ['Mesha', 'Simha', 'Dhanus'],
    earth: ['Vrishabha', 'Kanya', 'Makara'],
    air: ['Mithuna', 'Tula', 'Kumbha'],
    water: ['Kataka', 'Vrischika', 'Meena'],
  };
  const lagnaElement = Object.entries(ELEMENTS_MAP).find(([, signs]) => signs.includes(lagna.name))?.[0] || 'mixed';
  const moonElement = Object.entries(ELEMENTS_MAP).find(([, signs]) => signs.includes(moonSign.name))?.[0] || 'mixed';

  const lord7 = getHouseLord(7);
  const planetsIn7 = houses[6]?.planets?.map(p => p.name).filter(n => n !== 'Lagna' && n !== 'Ascendant') || [];
  const lord2 = getHouseLord(2);
  const lord5 = getHouseLord(5);
  const lord10 = getHouseLord(10);
  const lord11 = getHouseLord(11);

  return {
    character: {
      lagna: { name: lagna.name, english: lagna.english, lord: lagna.lord },
      lagnaElement,
      moonSign: { name: moonSign.name, english: moonSign.english, lord: moonSign.lord },
      moonElement,
      sunSign: { name: sunSign.name, english: sunSign.english, lord: sunSign.lord },
    },
    marriage: {
      seventhLord: lord7,
      planetsInSeventh: planetsIn7,
      seventhHouseRashi: houses[6]?.rashi || houses[6]?.rashiName || null,
    },
    wealth: {
      secondLord: lord2,
      eleventhLord: lord11,
      tenthLord: lord10,
      tenthHousePlanets: houses[9]?.planets?.map(p => p.name).filter(n => n !== 'Lagna') || [],
    },
    children: {
      fifthLord: lord5,
      planetsInFifth: houses[4]?.planets?.map(p => p.name).filter(n => n !== 'Lagna') || [],
    },
    deepInsights: {
      fourthLord: getHouseLord(4),
      mercuryHouse: getPlanetHouse('Mercury'),
      marsHouse: getPlanetHouse('Mars'),
      jupiterHouse: getPlanetHouse('Jupiter'),
      saturnHouse: getPlanetHouse('Saturn'),
      venusHouse: getPlanetHouse('Venus'),
    },
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
// Architecture: DASHA_EFFECTS removed. Engine provides only technical dasha data
// (lord, house, ruled houses, functional nature, strength, retrograde status).
// AI interprets dasha effects using Vedic signification knowledge from prompts.
const DASHA_EFFECTS = {};  // kept as empty object so references don't crash

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
    debugLog('[FullReport] Advanced enrichment loaded — Shadbala, Jaimini, Vargas, Yogas, Doshas, KP, Nadi');
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
    debugLog('[FullReport] Nadi Significator System loaded —', Object.keys(nadiPredictions.significatorTable).length, 'planets analyzed');
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
    degreeInSign: parseFloat(lagnaDegreeInSign.toFixed(2)),
    direction: lagnaDegreeInSign < 2 ? 'previous' : 'next',
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
    })),
    // ── NEW: Include advanced yogas (30+ combinations) ──────────
    advancedYogas: advancedYogas ? advancedYogas.map(y => ({
      name: y.name,
      strength: y.strength,
      category: y.category,
      planets: y.planets,
    })) : [],
    // ── Include doshas for comprehensive analysis ───────────
    doshas: advancedDoshas ? advancedDoshas.map(d => ({
      name: d.name,
      severity: d.severity,
      planets: d.planets,
    })) : [],
    totalYogaCount: yogas.length + (advancedYogas?.length || 0),
    strongYogaCount: yogas.filter(y => y.strength === 'Very Strong' || y.strength === 'Strong').length + (advancedYogas?.filter(y => y.strength === 'Very Strong' || y.strength === 'Strong').length || 0),
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
    fire: { element: 'fire', quality: 'cardinal/fixed/mutable' },
    earth: { element: 'earth', quality: 'cardinal/fixed/mutable' },
    air: { element: 'air', quality: 'cardinal/fixed/mutable' },
    water: { element: 'water', quality: 'cardinal/fixed/mutable' },
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
    lagnaLordPosition: { house: lagnaLordHouse },
    planetsIn1st: h1?.planetsInHouse || [],
    aspectsOn1st: h1?.aspectingPlanets || [],
    overallStrength: h1?.strength || 'moderate',
    // ── NEW: Lagna cusp warning for chart accuracy ──────────────
    lagnaCuspWarning: lagnaCuspWarning,
    // ── NEW: Atmakaraka (soul planet) from Jaimini ──────────────
    atmakaraka: jaiminiKarakas?.atmakaraka ? {
      planet: jaiminiKarakas.atmakaraka.planet,
      rashi: jaiminiKarakas.atmakaraka.rashi,
    } : null,
    // ── NEW: Lagna lord Shadbala strength ────────────────────────
    lagnaLordShadbala: advancedShadbala?.[lagna.rashi.lord?.toLowerCase()] ? {
      percentage: advancedShadbala[lagna.rashi.lord.toLowerCase()].percentage,
      strength: advancedShadbala[lagna.rashi.lord.toLowerCase()].strength,
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
        if (debSignLordH && [1, 4, 7, 10].includes(debSignLordH)) { cancelled = true; reasons.push({ rule: 'debLordInKendra', lord: debSignLord, house: debSignLordH }); }
        const exaltations = { Sun: 1, Moon: 2, Mars: 10, Mercury: 6, Jupiter: 4, Venus: 12, Saturn: 7 };
        const exaltLord = RASHIS[(exaltations[pName] || 1) - 1]?.lord;
        const exaltLordH = getPlanetHouse(exaltLord);
        if (exaltLordH && [1, 4, 7, 10].includes(exaltLordH)) { cancelled = true; reasons.push({ rule: 'exaltLordInKendra', lord: exaltLord, house: exaltLordH }); }
        const pH = getPlanetHouse(pName);
        if (pH && [1, 4, 7, 10].includes(pH)) { cancelled = true; reasons.push({ rule: 'selfInKendra', planet: pName, house: pH }); }
        if (cancelled) nbYogas.push({ planet: pName, house: pH, reasons, isRajaYoga: reasons.length >= 2 });
      }
      return nbYogas;
    })(),
    // ── NEW: Bhava Chalit planet shifts ──────────────────────────
    bhavaChalitShifts: bhavaChalit?.planetShifts || [],
    // ── NEW: Unique chart DNA — what makes this chart truly unique ──
    uniqueSignatures: (() => {
      const sigs = [];
      // Planets in own sign
      const ownSignRashis = { Sun: [5], Moon: [4], Mars: [1, 8], Mercury: [3, 6], Jupiter: [9, 12], Venus: [2, 7], Saturn: [10, 11] };
      for (const [pName, ownRashiIds] of Object.entries(ownSignRashis)) {
        const pData = planets[pName.toLowerCase()];
        if (pData && ownRashiIds.includes(pData.rashiId)) {
          sigs.push({ type: 'ownSign', planet: pName, sign: pData.rashi, house: getPlanetHouse(pName) });
        }
      }
      // Exalted planets
      const exaltRashis = { Sun: 1, Moon: 2, Mars: 10, Mercury: 6, Jupiter: 4, Venus: 12, Saturn: 7 };
      for (const [pName, eRashi] of Object.entries(exaltRashis)) {
        const pData = planets[pName.toLowerCase()];
        if (pData && pData.rashiId === eRashi) {
          sigs.push({ type: 'exalted', planet: pName, sign: pData.rashi, house: getPlanetHouse(pName) });
        }
      }
      // Debilitated planets
      const debilRashis = { Sun: 7, Moon: 8, Mars: 4, Mercury: 12, Jupiter: 10, Venus: 6, Saturn: 1 };
      for (const [pName, dRashi] of Object.entries(debilRashis)) {
        const pData = planets[pName.toLowerCase()];
        if (pData && pData.rashiId === dRashi) {
          sigs.push({ type: 'debilitated', planet: pName, sign: pData.rashi, house: getPlanetHouse(pName) });
        }
      }
      // Stelliums
      for (const house of houses) {
        const realPlanets = house.planets.filter(p => !['Lagna'].includes(p.name));
        if (realPlanets.length >= 3) {
          sigs.push({ type: 'stellium', house: house.houseNumber, sign: house.rashiEnglish, planets: realPlanets.map(p => p.name), count: realPlanets.length });
        }
      }
      // Empty kendras
      const emptyKendras = [1, 4, 7, 10].filter(k => houses[k - 1].planets.filter(p => p.name !== 'Lagna').length === 0);
      if (emptyKendras.length >= 3) sigs.push({ type: 'emptyKendras', count: emptyKendras.length, houses: emptyKendras });
      // Hemisphere concentration
      const planetHouses = Object.values(planets).filter(p => p.name !== 'Lagna').map(p => getPlanetHouse(p.name)).filter(Boolean);
      const eastHalf = planetHouses.filter(h => h >= 10 || h <= 3).length;
      const westHalf = planetHouses.filter(h => h >= 4 && h <= 9).length;
      if (eastHalf >= 7) sigs.push({ type: 'hemisphere', side: 'east', count: eastHalf });
      if (westHalf >= 7) sigs.push({ type: 'hemisphere', side: 'west', count: westHalf });
      // Neecha Bhanga Raja Yoga
      const debilitations2 = { Sun: 7, Moon: 8, Mars: 4, Mercury: 12, Jupiter: 10, Venus: 6, Saturn: 1 };
      for (const [pName, debRashi] of Object.entries(debilitations2)) {
        const p = planets[pName.toLowerCase()];
        if (!p || p.rashiId !== debRashi) continue;
        const pH = getPlanetHouse(pName);
        if (pH && [1, 4, 7, 10].includes(pH)) {
          sigs.push({ type: 'neechaBhangaRajaYoga', planet: pName, house: pH });
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
            sigs.push({ type: 'grahaYuddha', planet1: p1.name, planet2: p2.name, degreeDiff: parseFloat(Math.min(dist, 360 - dist).toFixed(2)) });
          }
        }
      }
      // Bhava Chalit planet shifts
      if (bhavaChalit?.planetShifts) {
        for (const shift of bhavaChalit.planetShifts) {
          sigs.push({ type: 'bhavaChalitShift', planet: shift.planet, rashiHouse: shift.wholeSignHouse, chalitHouse: shift.chalitHouse });
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
  const kujaCancelFactors = [];
  if (kujaDosha) {
    const marsRashiId = houses.find(h => h.planets.some(p => p.name === 'Mars'))?.rashiId;
    // 1. Mars in own sign (Aries=1, Scorpio=8)
    if (marsRashiId && [1, 8].includes(marsRashiId)) { kujaCancelled = true; kujaCancelFactors.push({ type: 'ownSign', planet: 'Mars', rashiId: marsRashiId }); }
    // 2. Mars exalted (Capricorn=10)
    if (marsRashiId === 10) { kujaCancelled = true; kujaCancelFactors.push({ type: 'exalted', planet: 'Mars', rashiId: 10 }); }
    // 3. Jupiter aspects or conjoins Mars
    const jupHouseM = getPlanetHouse('Jupiter');
    if (jupHouseM === marsHouse) { kujaCancelled = true; kujaCancelFactors.push({ type: 'conjunction', planet: 'Jupiter' }); }
    if (jupHouseM && marsHouse) {
      const jupToMarsM = ((marsHouse - jupHouseM + 12) % 12) + 1;
      if ([5, 7, 9].includes(jupToMarsM)) { kujaCancelled = true; kujaCancelFactors.push({ type: 'aspect', planet: 'Jupiter', aspectNum: jupToMarsM }); }
    }
    // 4. Venus conjoins Mars
    if (venusHouse === marsHouse) { kujaCancelled = true; kujaCancelFactors.push({ type: 'conjunction', planet: 'Venus' }); }
    // 5. Mars in H1 in Aries/Leo/Aquarius
    if (marsHouse === 1 && marsRashiId && [1, 5, 11].includes(marsRashiId)) { kujaCancelled = true; kujaCancelFactors.push({ type: 'signInHouse', house: 1, rashiId: marsRashiId }); }
    // 6. Mars in H7 in Cancer/Capricorn
    if (marsHouse === 7 && marsRashiId && [4, 10].includes(marsRashiId)) { kujaCancelled = true; kujaCancelFactors.push({ type: 'signInHouse', house: 7, rashiId: marsRashiId }); }
    // 7. Mars in H8 in Sagittarius/Pisces
    if (marsHouse === 8 && marsRashiId && [9, 12].includes(marsRashiId)) { kujaCancelled = true; kujaCancelFactors.push({ type: 'signInHouse', house: 8, rashiId: marsRashiId }); }
  }

  // Marriage timing — 7th lord dasha or Venus dasha indicates marriage period
  const marriageTimingDasas = lifespanFilter(dasaPeriods.filter(d =>
    d.lord === lord7Name || d.lord === 'Venus' || d.lord === 'Jupiter'
  )).map(d => ({ lord: d.lord, start: d.start, end: d.endDate }));

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
    if (!navamsha?.houses) return { hasBenefics: false, hasMalefics: false, available: false };
    const nav7 = navamsha.houses[6];
    const hasBenefics = nav7?.planets?.some(p => ['Jupiter', 'Venus', 'Mercury', 'Moon'].includes(p.name)) || false;
    const hasMalefics = nav7?.planets?.some(p => ['Saturn', 'Mars', 'Rahu', 'Ketu'].includes(p.name)) || false;
    return { hasBenefics, hasMalefics, available: true, planets: nav7?.planets?.map(p => p.name) || [] };
  })();

  const marriage = {
    title: 'Marriage & Relationships',
    sinhala: 'විවාහය හා සබඳතා',
    seventhHouse: h7,
    seventhLord: { name: lord7Name, house: lord7House },
    venus: { house: venusHouse, rashi: planets.venus?.rashi, navamshaRashi: navVenus?.navamshaRashiEnglish },
    kujaDosha: {
      present: kujaDosha,
      cancelled: kujaCancelled,
      cancellationFactors: kujaCancelFactors,
      fromLagna: kujaFromLagna,
      fromMoon: kujaFromMoon,
      marsHouse,
      marsDistFromMoon,
      severity: !kujaDosha ? 'None' : kujaCancelled ? 'Cancelled' : (kujaFromLagna && [7, 8].includes(marsHouse)) ? 'High' : (kujaFromLagna && [1, 4].includes(marsHouse)) ? 'Moderate' : 'Mild',
      // Architecture: details and note removed — AI interprets from technical data above
    },
    marriageTimingIndicators: marriageTimingDasas,
    // Architecture: Engine provides ONLY technical spouse data. AI interprets personality, appearance, etc.
    spouseSignificators: {
      seventhHouseRashi: h7?.rashi,
      seventhHouseRashiEnglish: h7?.rashiEnglish,
      seventhHouseElement: h7?.element,
      seventhHousePlanets: h7?.planetsInHouse || [],
      seventhLord: lord7Name,
      seventhLordHouse: lord7House,
      seventhLordDignity: planetStrengths[lord7Name?.toLowerCase()]?.dignityLevel || 'Unknown',
      seventhLordStrength: planetStrengths[lord7Name?.toLowerCase()]?.score || 0,
      seventhLordRetrograde: planets[lord7Name?.toLowerCase()]?.isRetrograde || false,
      venusHouse,
      venusRashi: planets.venus?.rashi,
      venusStrength: planetStrengths.venus?.score || 0,
      venusDignity: planetStrengths.venus?.dignityLevel || 'Unknown',
      venusRetrograde: planets.venus?.isRetrograde || false,
      darakaraka: darakarakaData ? {
        planet: darakarakaData.planet,
        rashi: darakarakaData.rashi,
        degree: darakarakaData.degree,
      } : null,
      upapada: upapadaData ? { rashi: upapadaData.rashi } : null,
    },
    // Architecture: All old hardcoded rashiTraits, planetTraits, appearanceByRashi,
    // professionByLordHouse, meetingByLordHouse, venusBackgroundMap, etc. REMOVED.
    // AI interprets spouse details from spouseSignificators technical data above.
    navamshaMarriage: {
      d9LagnaSign: navamshaLagnaRashi,
      d9SeventhPlanets: navamsha7thPlanets,
      venusInNavamsha: navamshaVenusRashi,
      d9SeventhLordDisposition: (() => {
        try {
          if (!navamsha?.houses) return null;
          const nav7House = navamsha.houses[6];
          const nav7Rashi = nav7House?.rashiId;
          if (!nav7Rashi) return null;
          const nav7Lord = RASHIS[nav7Rashi - 1]?.lord;
          if (!nav7Lord) return null;
          let nav7LordHouse = null;
          for (let hi = 0; hi < navamsha.houses.length; hi++) {
            if (navamsha.houses[hi]?.planets?.some(p => p.name === nav7Lord)) {
              nav7LordHouse = hi + 1;
              break;
            }
          }
          return {
            d9SeventhLord: nav7Lord,
            d9SeventhLordHouse: nav7LordHouse,
            inKendra: nav7LordHouse && [1, 4, 7, 10].includes(nav7LordHouse),
            inTrikona: nav7LordHouse && [1, 5, 9].includes(nav7LordHouse),
            inDusthana: nav7LordHouse && [6, 8, 12].includes(nav7LordHouse),
            sameAsD1SeventhLord: nav7Lord === lord7Name,
          };
        } catch (e) { return null; }
      })(),
    },
    // ── Multi-layer marriage timing prediction ────────────
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
    // ── Marriage Afflictions / Denial Assessment — pure technical data ──
    marriageAfflictions: (() => {
      try {
        const denial = cachedMarriageDenial || assessMarriageDenial(date, lat, lng);
        return {
          severity: denial.severity,
          severityScore: denial.denialScore,
          isMarriageDenied: denial.isMarriageDenied,
          isMarriageDelayed: denial.isMarriageDelayed,
          isMarriageSupported: denial.isMarriageSupported,
          afflictions: denial.afflictions.slice(0, 8),
          supportiveFactors: denial.supportive.slice(0, 8),
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
        bestDashaPlanets: m.bestDashaPlanets,
        strongPlanets: m.strongPlanets?.map(p => p.name),
        weakPlanets: m.weakPlanets?.map(p => p.name),
        averageScore: m.averageScore,
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
    dhanaYogas.push({ type: 'lord2InKendraTrikona', lord: lord2Name, house: lord2House });
  }
  // 11th lord in kendra
  const lord11House = getPlanetHouse(lord11Name);
  if (lord11House && isInKendra(lord11House)) {
    dhanaYogas.push({ type: 'lord11InKendra', lord: lord11Name, house: lord11House });
  }
  // 9th lord (fortune) + 10th lord connection
  const lord9Name = getHouseLord(9);
  const lord9House = getPlanetHouse(lord9Name);
  const lord10House = getPlanetHouse(lord10Name);
  if (lord9House && lord10House && lord9House === lord10House) {
    dhanaYogas.push({ type: 'rajaYoga', lord9: lord9Name, lord10: lord10Name, house: lord9House });
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
      // Check bindus in 2nd and 11th house signs (keyed by rashi NAME, not index)
      const h2RashiName = houses[1]?.rashi;
      const h11RashiName = houses[10]?.rashi;
      const h2Bindus = h2RashiName ? (ashtakavarga.sarvashtakavarga[h2RashiName] || 0) : 0;
      const h11Bindus = h11RashiName ? (ashtakavarga.sarvashtakavarga[h11RashiName] || 0) : 0;
      return { house2Bindus: h2Bindus, house11Bindus: h11Bindus, totalBindus: h2Bindus + h11Bindus };
    })() : null,
    businessVsService: { lord10InKendra: isInKendra(lord10House), lord10InDusthana: isInDusthana(lord10House), lord10House: lord10House },
    // ── NEW: D10 Dashamsha for career precision ─────────────────
    dashamsha: extendedVargas?.D10 ? {
      d10Lagna: extendedVargas.D10.lagnaRashi,
      d10Sun: extendedVargas.D10.positions?.sun?.vargaRashi,
      d10Saturn: extendedVargas.D10.positions?.saturn?.vargaRashi,
      d10TenthLord: extendedVargas.D10.positions?.[lord10Name.toLowerCase()]?.vargaRashi,
    } : null,
    // ── Amatyakaraka (career significator) from Jaimini ────
    amatyakaraka: jaiminiKarakas?.karakas?.Amatyakaraka ? {
      planet: jaiminiKarakas.karakas.Amatyakaraka.planet,
      rashi: jaiminiKarakas.karakas.Amatyakaraka.rashi,
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
          const factors = [];
          
          // 10th lord dasha = strongest promotion indicator
          if (md.lord === lord10Name) { score += 25; factors.push({ planet: lord10Name, level: 'MD', house: 10 }); }
          if (ad.lord === lord10Name) { score += 20; factors.push({ planet: lord10Name, level: 'AD', house: 10 }); }
          
          // Sun dasha
          if (md.lord === 'Sun') { score += 15; factors.push({ planet: 'Sun', level: 'MD' }); }
          if (ad.lord === 'Sun') { score += 12; factors.push({ planet: 'Sun', level: 'AD' }); }
          
          // Jupiter dasha
          if (md.lord === 'Jupiter') { score += 18; factors.push({ planet: 'Jupiter', level: 'MD' }); }
          if (ad.lord === 'Jupiter') { score += 12; factors.push({ planet: 'Jupiter', level: 'AD' }); }
          
          // 9th lord
          if (md.lord === lord9Name) { score += 15; factors.push({ planet: lord9Name, level: 'MD', house: 9 }); }
          if (ad.lord === lord9Name) { score += 10; factors.push({ planet: lord9Name, level: 'AD', house: 9 }); }
          
          // 11th lord
          if (md.lord === lord11Name) { score += 12; factors.push({ planet: lord11Name, level: 'MD', house: 11 }); }
          if (ad.lord === lord11Name) { score += 8; factors.push({ planet: lord11Name, level: 'AD', house: 11 }); }
          
          // Saturn return effect (ages 28-30)
          const ageAtPeriod = adStart - birthYear;
          if (ageAtPeriod >= 27 && ageAtPeriod <= 31) {
            score += 10;
            factors.push({ planet: 'Saturn', level: 'transit', saturnReturn: true });
          }
          
          // Skip low-score periods
          if (score < 20) continue;
          
          windows.push({
            period: `${md.lord}-${ad.lord}`,
            dateRange: `${ad.start} to ${ad.endDate}`,
            age: `${adStart - birthYear} to ${adEnd - birthYear}`,
            score,
            confidence: score >= 40 ? 'HIGH' : score >= 25 ? 'MODERATE' : 'POSSIBLE',
            factors,
            isActive: adStart <= currentYear && adEnd >= currentYear,
          });
        }
      }
      
      // Sort by score and return top windows
      windows.sort((a, b) => b.score - a.score);
      return {
        topWindows: windows.slice(0, 6),
        currentActive: windows.find(w => w.isActive) || null,
        saturnReturnAge,
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

    // Domestic yogas — technical indicators
    const domesticYogas = [];
    if (beneficsInH4.includes('Jupiter') && beneficsInH4.includes('Mercury')) {
      domesticYogas.push({ planets: ['Jupiter', 'Mercury'], house: 4 });
    } else if (beneficsInH4.includes('Jupiter')) {
      domesticYogas.push({ planets: ['Jupiter'], house: 4 });
    } else if (beneficsInH4.includes('Venus')) {
      domesticYogas.push({ planets: ['Venus'], house: 4 });
    }
    if (lord4CareerHouse && DUSTHANA.includes(lord4CareerHouse)) {
      domesticYogas.push({ type: 'lord4InDusthana', lord: lord4CareerName, house: lord4CareerHouse });
    }
    if (kemadrumaPresent) {
      domesticYogas.push({ type: 'kemadrumaYoga' });
    }

    // Domestic role score
    var domesticScore = 0;
    if (h10Empty) domesticScore += 2;
    if (beneficsInH4.length >= 2) domesticScore += 2;
    if (lord4CareerHouse && DUSTHANA.includes(lord4CareerHouse)) domesticScore += 1;
    if (kemadrumaPresent) domesticScore += 1;
    if (lord10House && DUSTHANA.includes(lord10House)) domesticScore += 1;
    const domesticRole = domesticScore >= 4 ? 'PRIMARY' : domesticScore >= 2 ? 'SECONDARY' : 'NONE';

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
    jupiter: { house: jupiterHouse },
    childrenTimingDasas: lifespanFilter(dasaPeriods.filter(d => d.lord === lord5Name || d.lord === 'Jupiter')).map(d => ({ lord: d.lord, start: d.start, end: d.endDate })),
    // ── NEW: D7 Saptamsha for children accuracy ─────────────────
    saptamsha: extendedVargas?.D7 ? {
      d7Lagna: extendedVargas.D7.lagnaRashi,
      d7Jupiter: extendedVargas.D7.positions?.jupiter?.vargaRashi,
      d7FifthLord: extendedVargas.D7.positions?.[lord5Name.toLowerCase()]?.vargaRashi,
    } : null,
    // ── Putrakaraka (children significator) from Jaimini ────
    putrakaraka: jaiminiKarakas?.karakas?.Putrakaraka ? {
      planet: jaiminiKarakas.karakas.Putrakaraka.planet,
      rashi: jaiminiKarakas.karakas.Putrakaraka.rashi,
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
        // sarvashtakavarga is keyed by rashi NAME, not index — get the 5th house rashi name
        const h5RashiName = houses[4]?.rashi;
        const h5Bindus = h5RashiName ? ashtakavarga.sarvashtakavarga[h5RashiName] : null;
        if (h5Bindus >= 30) childScore += 0.5;
        else if (h5Bindus != null && h5Bindus < 22) childScore -= 0.5;
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
          marriageDenialImpact = 'SEVERE';
        } else if (mDenial.severity === 'HIGH') {
          childScore -= 0.8;
          marriageDenialImpact = 'HIGH';
        } else if (mDenial.severity === 'MODERATE') {
          childScore -= 0.3;
          marriageDenialImpact = 'MODERATE';
        }
      } catch (e) { /* skip */ }

      const count = Math.max(0, Math.round(childScore));
      const maleHints = genderHints.filter(g => g === 'male').length;
      const femaleHints = genderHints.filter(g => g === 'female').length;

      return {
        count: count >= 3 ? '3 or more' : count.toString(),
        // Raw gender planet data — AI interprets tendency
        malePlanetCount: maleHints,
        femalePlanetCount: femaleHints,
        genderPlanetsIn5th: genderHints,
        jupiterDebilitated: jupDebilitated,
        marriageDenialImpact,
        score: childScore.toFixed(1),
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
        if (estCount === 0) return { children: [] };

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
          // Gender data — raw planet indicators, AI interprets
          const maleIndicators = ['Sun', 'Mars', 'Jupiter'];
          const femaleIndicators = ['Moon', 'Venus'];
          const periodPlanets = [window.period.split('-')[0], window.period.split('-')[1] || ''].filter(Boolean);
          const malePlanetsDasha = periodPlanets.filter(p => maleIndicators.includes(p));
          const femalePlanetsDasha = periodPlanets.filter(p => femaleIndicators.includes(p));

          childPredictions.push({
            childNumber: ordinal,
            // Raw gender planet data — AI interprets
            malePlanetsInDasha: malePlanetsDasha,
            femalePlanetsInDasha: femalePlanetsDasha,
            predictedYears: window.yearRange,
            peakYear: window.peakYear,
            parentAge: window.age,
            period: window.period,
            confidence: window.score >= 5 ? 'HIGH' : window.score >= 3 ? 'MODERATE' : 'LOW',
          });
        }

        return {
          marriageYearUsed: marriageYear,
          children: childPredictions,
          fertilePeriods: fertileDashas.slice(0, 6),
        };
      } catch (e) {
        return { children: [] };
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
      };
    })(),
    // ── Nadi Astrology Children Event Analysis (Sub-Lord methodology) ──
    nadiChildren: nadiPredictions?.events?.children ? (() => {
      const c = nadiPredictions.events.children;
      return {
        verdict: c.verdict,
        strength: c.strength,
        bestDashaPlanets: c.bestDashaPlanets,
        strongPlanets: c.strongPlanets?.map(p => p.name),
        averageScore: c.averageScore,
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
        };
      })(),
    } : null,
    lifePhaseSummary: dasaPeriods.map(d => ({
      lord: d.lord,
      period: `${d.start} to ${d.endDate}`,
      years: d.years.toFixed(1),
      isCurrent: currentDasha?.lord === d.lord,
      // ── Chart-specific theme for THIS person ──
      chartTheme: (() => {
        const ruledHouses = [];
        for (let i = 1; i <= 12; i++) { if (getHouseLord(i) === d.lord) ruledHouses.push(i); }
        const funcN = getFunctionalNature(lagnaName, d.lord);
        return { functionalNature: funcN, ruledHouses };
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
    mercury: { house: mercuryHouse, strength: mercuryStrength.strength, score: mercuryStrength.score },
    moon: { house: moonHouse, strength: moonStrength.strength, score: moonStrength.score },
    education: {
      fourthLord: lord4Name,
      fourthLordHouse: getPlanetHouse(lord4Name),
      fifthLord: lord5Name,
      fifthLordHouse: lord5House,
      // Architecture: AI interprets education assessment from technical data
      mercuryScore: getHealthScore('mercury'),
      moonScore: getHealthScore('moon'),
      // ── NEW: D24 Chaturvimshamsha for education precision ─────
      chaturvimshamsha: extendedVargas?.D24 ? {
        d24Lagna: extendedVargas.D24.lagnaRashi,
        d24Mercury: extendedVargas.D24.positions?.mercury?.vargaRashi,
        d24Jupiter: extendedVargas.D24.positions?.jupiter?.vargaRashi,
      } : null,
    },
    mentalStability: (() => {
      // Architecture: Return technical indicators only, AI interprets
      const saturnInMoonHouse = getPlanetHouse('Saturn') === moonHouse;
      const saturnHouseForMH = getPlanetHouse('Saturn');
      let saturnAspectsMoon = false;
      if (saturnHouseForMH && moonHouse) {
        const satToMoon = ((moonHouse - saturnHouseForMH + 12) % 12) + 1;
        saturnAspectsMoon = [3, 7, 10].includes(satToMoon);
      }
      return {
        moonScore: getHealthScore('moon'),
        moonHouse,
        vishYoga: saturnInMoonHouse,
        moonInDusthana: moonHouse && [6, 8, 12].includes(moonHouse),
        saturnAspectsMoon,
      };
    })(),
    // Technical Shadbala data for mental assessment — no interpretation strings
    mercuryShadbala: advancedShadbala?.mercury ? {
      percentage: advancedShadbala.mercury.percentage,
      strength: advancedShadbala.mercury.strength,
      digBala: advancedShadbala.mercury.components?.digBala,
    } : null,
    moonShadbala: advancedShadbala?.moon ? {
      percentage: advancedShadbala.moon.percentage,
      strength: advancedShadbala.moon.strength,
      kalaBala: advancedShadbala.moon.components?.kalaBala,
    } : null,
    // ── Synthesized Mental Health Risk Assessments ───────────────
    moonAnalysis: (() => {
      // Architecture: Return technical indicators only, AI interprets meaning
      const indicators = [];
      if (moonHouse && [6, 8, 12].includes(moonHouse)) indicators.push({ type: 'moonInDusthana', house: moonHouse });
      if (getHealthScore('moon') < 50) indicators.push({ type: 'weakMoon', score: getHealthScore('moon') });
      const rahuHouseCheck = getPlanetHouse('Rahu');
      const ketuHouseCheck = getPlanetHouse('Ketu');
      if (rahuHouseCheck === moonHouse) indicators.push({ type: 'rahuConjunctMoon', yoga: 'Grahan Dosha' });
      if (ketuHouseCheck === moonHouse) indicators.push({ type: 'ketuConjunctMoon' });
      const saturnHouseCheck = getPlanetHouse('Saturn');
      if (saturnHouseCheck === moonHouse) indicators.push({ type: 'saturnConjunctMoon', yoga: 'Vish Yoga' });
      if (saturnHouseCheck && moonHouse) {
        const satToMoon = ((moonHouse - saturnHouseCheck + 12) % 12) + 1;
        if ([3, 7, 10].includes(satToMoon)) indicators.push({ type: 'saturnAspectsMoon', aspect: satToMoon });
      }
      const marsHouseCheck = getPlanetHouse('Mars');
      if (marsHouseCheck === moonHouse) indicators.push({ type: 'marsConjunctMoon' });
      if (marsHouseCheck && moonHouse) {
        const marsToMoon = ((moonHouse - marsHouseCheck + 12) % 12) + 1;
        if ([4, 7, 8].includes(marsToMoon)) indicators.push({ type: 'marsAspectsMoon', aspect: marsToMoon });
      }
      return { indicators, moonHouse, moonScore: getHealthScore('moon'), moonSign: planets.moon?.rashiEnglish };
    })(),
    depressionRisk: (() => {
      let score = 0;
      const indicators = [];
      if (moonHouse && [6, 8, 12].includes(moonHouse)) { score += 2; indicators.push({ type: 'moonInDusthana', house: moonHouse }); }
      const satHouse = getPlanetHouse('Saturn');
      if (satHouse === 4) { score += 2; indicators.push({ type: 'saturnIn4th' }); }
      if (satHouse === moonHouse) { score += 3; indicators.push({ type: 'saturnMoonConjunction', yoga: 'Vish Yoga' }); }
      if (satHouse && moonHouse) {
        const satToM = ((moonHouse - satHouse + 12) % 12) + 1;
        if ([3, 7, 10].includes(satToM)) { score += 1; indicators.push({ type: 'saturnAspectsMoon', aspect: satToM }); }
      }
      const rahuH = getPlanetHouse('Rahu');
      if (rahuH === moonHouse) { score += 2; indicators.push({ type: 'rahuConjunctMoon' }); }
      if (getHealthScore('moon') < 40) { score += 1; indicators.push({ type: 'weakMoon', score: getHealthScore('moon') }); }
      const lord4H = getPlanetHouse(lord4Name);
      if (lord4H && [6, 8, 12].includes(lord4H)) { score += 1; indicators.push({ type: 'lord4InDusthana', house: lord4H }); }
      const level = score >= 5 ? 'HIGH' : score >= 3 ? 'MODERATE' : score >= 1 ? 'LOW' : 'MINIMAL';
      return { level, score, maxScore: 12, indicators };
    })(),
    anxietyRisk: (() => {
      let score = 0;
      const indicators = [];
      const rahuH = getPlanetHouse('Rahu');
      if (rahuH === moonHouse) { score += 3; indicators.push({ type: 'rahuConjunctMoon' }); }
      if (rahuH && [1, 4, 8].includes(rahuH)) { score += 1; indicators.push({ type: 'rahuInAnxietyHouse', house: rahuH }); }
      if (getHealthScore('mercury') < 40) { score += 1; indicators.push({ type: 'weakMercury', score: getHealthScore('mercury') }); }
      if (moonHouse && [6, 8, 12].includes(moonHouse)) { score += 1; indicators.push({ type: 'moonInDusthana', house: moonHouse }); }
      const ketuH = getPlanetHouse('Ketu');
      if (ketuH && [1, 5].includes(ketuH)) { score += 1; indicators.push({ type: 'ketuInExistentialHouse', house: ketuH }); }
      const level = score >= 4 ? 'HIGH' : score >= 2 ? 'MODERATE' : score >= 1 ? 'LOW' : 'MINIMAL';
      return { level, score, maxScore: 7, indicators };
    })(),
    childhoodTrauma: (() => {
      let score = 0;
      const indicators = [];
      const satH = getPlanetHouse('Saturn');
      if (satH === 4) { score += 3; indicators.push({ type: 'saturnIn4th' }); }
      if (moonHouse && [6, 8, 12].includes(moonHouse)) { score += 2; indicators.push({ type: 'moonInDusthana', house: moonHouse }); }
      const lord4H = getPlanetHouse(lord4Name);
      if (lord4H && [6, 8, 12].includes(lord4H)) { score += 2; indicators.push({ type: 'lord4InDusthana', lord: lord4Name, house: lord4H }); }
      const rahuH = getPlanetHouse('Rahu');
      if (rahuH === moonHouse) { score += 2; indicators.push({ type: 'rahuConjunctMoon' }); }
      const marsH = getPlanetHouse('Mars');
      if (marsH === 4) { score += 2; indicators.push({ type: 'marsIn4th' }); }
      const sunH = getPlanetHouse('Sun');
      if (sunH === 4) { score += 1; indicators.push({ type: 'sunIn4th' }); }
      if (sunH && [6, 8, 12].includes(sunH)) { score += 1; indicators.push({ type: 'sunInDusthana', house: sunH }); }
      const ketuH = getPlanetHouse('Ketu');
      if (ketuH === 4) { score += 2; indicators.push({ type: 'ketuIn4th' }); }
      const birthYear = date.getFullYear();
      const childhoodDashas = dasaPeriods.filter(dp => {
        const startYear = new Date(dp.start).getFullYear();
        const endYear = new Date(dp.endDate).getFullYear();
        return startYear <= birthYear + 15 && endYear >= birthYear;
      });
      const ketuInChildhood = childhoodDashas.some(dp => dp.lord === 'Ketu');
      const saturnInChildhood = childhoodDashas.some(dp => dp.lord === 'Saturn');
      if (ketuInChildhood) { score += 1; indicators.push({ type: 'ketuDashaInChildhood' }); }
      if (saturnInChildhood) { score += 1; indicators.push({ type: 'saturnDashaInChildhood' }); }
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
    tenthHouseStrength: { bindus: h10Bindus },
    bestPeriods: businessDasas.map(d => ({
      lord: d.lord,
      period: `${d.start} to ${d.endDate}`,
    })),
    h7Strength: h7ForBiz?.strength,
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

  // Architecture: TRANSIT_HOUSE_EFFECTS removed — AI interprets transit effects from house numbers.
  // Keeping as empty object so existing references return empty string gracefully.
  const TRANSIT_HOUSE_EFFECTS = {};

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
      bavBindus,
      bavQuality,
      natalConjunctions: natalConjunctions.length > 0 ? natalConjunctions : null,
      natalOppositions: natalOppositions.length > 0 ? natalOppositions : null,
    };
  };

  // Identify major transit events happening RIGHT NOW
  const transitEvents = [];
  const satFromMoon = getTransitHouseFromMoon(transitSaturn.rashiId);
  if ([12, 1, 2].includes(satFromMoon)) {
    const phase = satFromMoon === 12 ? 'rising' : satFromMoon === 1 ? 'peak' : 'setting';
    transitEvents.push({ event: 'Sade Sati', severity: 'major', phase, saturnHouseFromMoon: satFromMoon });
  }
  // Jupiter return (Jupiter transiting same sign as natal Jupiter)
  if (transitJupiter.rashiId === planets.jupiter?.rashiId) {
    transitEvents.push({ event: 'Jupiter Return', severity: 'beneficial' });
  }
  // Saturn return
  if (transitSaturn.rashiId === planets.saturn?.rashiId) {
    transitEvents.push({ event: 'Saturn Return', severity: 'major' });
  }
  // Rahu/Ketu over natal Moon
  if (transitRahu.rashiId === moonRashi.id || transitKetu.rashiId === moonRashi.id) {
    transitEvents.push({ event: 'Eclipse axis on Moon', severity: 'intense', node: transitRahu.rashiId === moonRashi.id ? 'Rahu' : 'Ketu' });
  }
  // Transit planet conjunct natal planet (for major planets)
  const majorTransitPlanets = { Jupiter: transitJupiter, Saturn: transitSaturn, Rahu: transitRahu, Ketu: transitKetu };
  for (const [tName, tPlanet] of Object.entries(majorTransitPlanets)) {
    for (const [nKey, nPlanet] of Object.entries(planets)) {
      if (nPlanet.rashiId === tPlanet.rashiId && !['rahu', 'ketu'].includes(nKey)) {
        // Check if degrees are close (within 5°)
        const degDiff = Math.abs((tPlanet.degreeInSign || 0) - (nPlanet.degreeInSign || 0));
        if (degDiff <= 5) {
          transitEvents.push({ event: `${tName} conjunct natal ${nPlanet.name}`, severity: tName === 'Jupiter' ? 'beneficial' : 'intense', degreeDiff: parseFloat(degDiff.toFixed(1)) });
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
      if (satFromMoon === 12) return { active: true, phase: 'Rising', saturnHouseFromMoon: 12 };
      if (satFromMoon === 1) return { active: true, phase: 'Peak', saturnHouseFromMoon: 1 };
      if (satFromMoon === 2) return { active: true, phase: 'Setting', saturnHouseFromMoon: 2 };
      return { active: false };
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
      transitHouseFromLagna: jupFromLagna,
      transitHouseFromMoon: jupFromMoon,
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
      transitHouseFromLagna: satFromLagna,
      transitHouseFromMoon: satFromMoon,
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
      rahuTransitHouse: rahuFromLagna,
      ketuTransitHouse: ketuFromLagna,
      duration: '~18 months per sign',
      isPositive: false,
    });
    
    // Mars position (if in important houses)
    const marsFromLagna = getTransitHouse(transitMars.rashiId);
    if ([1, 4, 7, 8, 10, 12].includes(marsFromLagna)) {
      highlights.push({
        planet: 'Mars',
        icon: '🔴',
        transitHouseFromLagna: marsFromLagna,
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
      if (themes.length > 0) lifeThemes.push({ planet: activeDasha.mahadasha, ruledHouses: mdRuledHouses, primarySignifications: themes });
    }
    
    // From major transits — technical data only
    if ([1, 2, 5, 9, 10, 11].includes(jupFromLagna)) {
      lifeThemes.push({ planet: 'Jupiter', transitHouse: jupFromLagna, type: 'benefic_transit' });
    }
    if ([12, 1, 2].includes(satFromMoon)) {
      lifeThemes.push({ planet: 'Saturn', satFromMoon, type: 'sade_sati' });
    }
    
    // Overall energy assessment — technical score only, AI interprets
    let energyLevel = 50;
    if (jupGood) energyLevel += 15;
    if (satGood) energyLevel += 10;
    if ([12, 1, 2].includes(satFromMoon)) energyLevel -= 15;
    if (activeDasha && ['Jupiter', 'Venus', 'Mercury'].includes(activeDasha.mahadasha)) energyLevel += 10;
    if (activeDasha && ['Saturn', 'Rahu', 'Ketu'].includes(activeDasha.mahadasha)) energyLevel -= 10;
    energyLevel = Math.max(20, Math.min(95, energyLevel));
    
    return {
      title: "What's Happening RIGHT NOW",
      sinhala: 'දැන් සිදුවන්නේ කුමක්ද',
      currentAge,
      activeDasha,
      transitHighlights: highlights,
      lifeThemes,
      overallEnergy: { score: energyLevel },
      // Architecture: quickAdvice and overallMood REMOVED — AI interprets from technical data
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
      
      if (mdFuncNature === 'yogaKaraka') { score += 25; reasons.push({ rule: 'mdYogaKaraka', planet: mdLord, pts: 25 }); }
      else if (mdFuncNature === 'benefic') { score += 15; reasons.push({ rule: 'mdBenefic', planet: mdLord, pts: 15 }); }
      else if (mdFuncNature === 'malefic') { score -= 10; reasons.push({ rule: 'mdMalefic', planet: mdLord, pts: -10 }); }
      
      // Antardasha lord quality
      const adFuncNature = getFunctionalNature(lagnaName, adLord);
      if (adFuncNature === 'yogaKaraka') { score += 15; reasons.push({ rule: 'adYogaKaraka', planet: adLord, pts: 15 }); }
      else if (adFuncNature === 'benefic') { score += 10; reasons.push({ rule: 'adBenefic', planet: adLord, pts: 10 }); }
      else if (adFuncNature === 'malefic') { score -= 5; reasons.push({ rule: 'adMalefic', planet: adLord, pts: -5 }); }
      
      // Special period combinations
      if (mdLord === 'Jupiter' && ['Venus', 'Mercury', 'Moon'].includes(adLord)) {
        score += 15; reasons.push({ md: 'Jupiter', ad: adLord, type: 'beneficDouble' });
      }
      if (mdLord === 'Venus' && ['Jupiter', 'Mercury', 'Moon'].includes(adLord)) {
        score += 15; reasons.push({ md: 'Venus', ad: adLord, type: 'beneficDouble' });
      }
      if (mdLord === lord10Name && adLord === lord9Name) {
        score += 20; reasons.push({ md: lord10Name, ad: lord9Name, type: 'h10h9combo' });
      }
      if (mdLord === lord9Name && adLord === lord10Name) {
        score += 20; reasons.push({ md: lord9Name, ad: lord10Name, type: 'h9h10combo' });
      }
      if (mdLord === 'Saturn' && adLord === 'Saturn') {
        score -= 15; reasons.push({ md: 'Saturn', ad: 'Saturn', type: 'doubleSaturn' });
      }
      if (mdLord === 'Rahu' && adLord === 'Ketu') {
        score -= 10; reasons.push({ md: 'Rahu', ad: 'Ketu', type: 'rahuKetuAxis' });
      }
      
      // Age-based modifiers
      if (age >= 28 && age <= 31) { // Saturn return
        score -= 5; reasons.push({ type: 'saturnReturn', age });
      }
      if (age >= 41 && age <= 44) { // Uranus opposition (Western influence)
        score -= 3; reasons.push({ type: 'midLifeTransit', age });
      }
      
      // Jupiter cycle peak (every 12 years)
      const jupCycleYears = [12, 24, 36, 48, 60, 72];
      if (jupCycleYears.includes(age)) {
        score += 10; reasons.push({ type: 'jupiterCyclePeak', age });
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
      } : null,
      peakLifePeriod: peakPeriod ? {
        years: `${peakPeriod.start} to ${peakPeriod.end}`,
        ages: `${peakPeriod.start - birthYear} to ${peakPeriod.end - birthYear} years old`,
        duration: `${peakPeriod.years} consecutive excellent years`,
      } : null,
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
    mars: { house: marsHouse },
    saturn: { house: getPlanetHouse('Saturn') },
    propertyYoga: {
      lord4InKendraTrikona: isInKendra(lord4House) || isInTrikona(lord4House),
      lord4House,
      marsInKendraTrikona: isInKendra(marsHouse) || isInTrikona(marsHouse),
      marsHouse,
      beneficsIn4th: h4?.beneficsIn || [],
    },
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
        };
      }).sort((a, b) => b.score - a.score);
      
      // Accident-prone indicators — technical data
      const accidentFactors = {
        marsIn4th: h4Planets.includes('Mars'),
        marsIn8th: h8Planets.includes('Mars'),
        rahuIn4th: h4Planets.includes('Rahu'),
        rahuIn8th: h8Planets.includes('Rahu'),
        saturnIn4th: h4Planets.includes('Saturn'),
        ketuIn4th: h4Planets.includes('Ketu'),
        ketuIn8th: h8Planets.includes('Ketu'),
        lord4InDusthana: lord4House && [6, 8, 12].includes(lord4House),
      };
      let accidentRisk = 0;
      if (accidentFactors.marsIn4th) accidentRisk += 3;
      if (accidentFactors.marsIn8th) accidentRisk += 3;
      if (accidentFactors.rahuIn4th) accidentRisk += 2;
      if (accidentFactors.rahuIn8th) accidentRisk += 2;
      if (accidentFactors.saturnIn4th) accidentRisk += 1;
      if (accidentFactors.ketuIn4th) accidentRisk += 2;
      if (accidentFactors.ketuIn8th) accidentRisk += 2;
      if (accidentFactors.lord4InDusthana) accidentRisk += 2;
      
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
            });
          }
        }
      }
      
      const riskLevel = accidentRisk >= 6 ? 'HIGH' : accidentRisk >= 3 ? 'MODERATE' : 'LOW';
      
      return {
        vehicleTiming: vehicleTimings.slice(0, 5),
        bestYearForVehicle: vehicleTimings[0] || null,
        accidentRiskLevel: riskLevel,
        accidentRiskScore: accidentRisk,
        accidentFactors,
        accidentPronePeriods: dangerPeriods.slice(0, 5),
        lord4Name,
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
    })),
    jobChangePeriods: lifespanFilter(dasaPeriods.filter(d => d.lord === 'Rahu' || d.lord === 'Ketu' || d.lord === lord6Name)).map(d => ({
      lord: d.lord,
      period: `${d.start} to ${d.endDate}`,
    })),
    sunInKendra: getPlanetHouse('Sun') && isInKendra(getPlanetHouse('Sun')),
    sunHouse: getPlanetHouse('Sun'),
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
      maleficsIn12th: h12?.maleficsIn || [],
    },
    losses: {
      eighthHouse: h8,
      eighthLord: { name: lord8Name, house: getPlanetHouse(lord8Name) },
      riskPeriods: lifespanFilter(dasaPeriods.filter(d => d.lord === lord8Name || d.lord === lord12Name)).map(d => ({
        lord: d.lord,
        period: `${d.start} to ${d.endDate}`,
        lordType: d.lord === lord8Name ? '8thLord' : '12thLord',
      })),
    },
    investmentFactors: {
      h2Strength: h2?.strength,
      h11Strength: h11?.strength,
      jupiterHouse,
      jupiterInKendraTrikona: jupiterHouse && (isInKendra(jupiterHouse) || isInTrikona(jupiterHouse)),
      marsHouse,
      marsInPropertyHouses: marsHouse && (isInKendra(marsHouse) || [2, 4, 11].includes(marsHouse)),
    },
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
      return {
        lord: ad.lord,
        period: `${ad.start} to ${ad.endDate}`,
        nature: adLordNature,
      };
    });

    timeline25.periods.push({
      mahadasha: dasha.lord,
      period: `${effectiveStart.toISOString().split('T')[0]} to ${effectiveEnd.toISOString().split('T')[0]}`,
      nature: dashaLordNature,
      strength: dashaLordStrength,
      antardashas: relevantADs,
      // Architecture: AI interprets overallTone from dashaLordNature + strength data
      overallTone: dashaLordNature,
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
    } : null,
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 14: HEALTH BLUEPRINT
  // ══════════════════════════════════════════════════════════════
  // Architecture: HEALTH_BY_HOUSE mapping removed — AI interprets body areas from house numbers.
  // Keeping as empty object so existing references return gracefully.
  const HEALTH_BY_HOUSE = {};

  // Architecture: HEALTH_BY_PLANET mapping removed — AI interprets health risks from planet strength data.
  // Keeping as empty object so existing references return gracefully.
  const HEALTH_BY_PLANET = {};

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
    if (preciseScore < 40) {
      healthVulnerabilities.push({
        planet: ps.name || key,
        score: preciseScore,
        shadbalaScore: advancedShadbala?.[key]?.percentage || null,
        dignity: ps.dignityLevel || 'Unknown',
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

  // Architecture: kidneyNarrative returns technical indicators only, AI interprets
  const nativeKidneyNarrative = (() => {
    const satKetuBothInH8 = nativeSaturnHouse === 8 && nativeKetuHouse === 8;
    const marsH6SatH8 = nativeMarsHouse === 6 && nativeSaturnHouse === 8;
    const indicators = [];
    if (satKetuBothInH8) indicators.push({ type: 'satKetuInH8' });
    if (marsH6SatH8) indicators.push({ type: 'marsH6SatH8' });
    if (nativeSaturnHouse && [6,7,8].includes(nativeSaturnHouse)) indicators.push({ type: 'saturnInDiseaseHouse', house: nativeSaturnHouse });
    if (nativeKetuHouse && [6,8].includes(nativeKetuHouse)) indicators.push({ type: 'ketuInDiseaseHouse', house: nativeKetuHouse });
    if (nativeMarsHouse && [6,8].includes(nativeMarsHouse)) indicators.push({ type: 'marsInDiseaseHouse', house: nativeMarsHouse });
    if (venusScore < 45) indicators.push({ type: 'weakVenus', score: venusScore });
    if (satAspectsVenus) indicators.push({ type: 'saturnAspectsVenus' });
    if (lord7KidneyHouse && [6,8,12].includes(lord7KidneyHouse)) indicators.push({ type: 'lord7InDusthana', house: lord7KidneyHouse });
    return { risk: nativeKidneyRisk, indicatorCount: nativeKidneyIndicators, indicators };
  })();

  const bodyRisks = [];
  houses.forEach(h => {
    const malefics = (h.planets || []).filter(p => ['Mars', 'Saturn', 'Rahu', 'Ketu'].includes(p.name));
    if (malefics.length > 0) {
      bodyRisks.push({ house: h.houseNumber, malefics: malefics.map(m => m.name) });
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
    sunScore,
    sunHouse,
    lord4InDusthana: lord4H && [6,8,12].includes(lord4H),
    h4MaleficNames: h4Malefics.map(p => p.name),
    saturnAspectsH4: !!satAspH4,
    marsAspectsH4: !!marsAspH4,
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
    jupiterScore: jupScore,
    jupiterHouse: jupHouse,
    lord5InDusthana: lord5Hdig && [6,8,12].includes(lord5Hdig),
    h5MaleficNames: h5Malefics.map(p => p.name),
    rahuOrKetuInH5: nativeRahuHouse === 5 || nativeKetuHouse === 5,
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
    mercuryScore: mercScore,
    mercuryHouse: mercHouse,
    lord3InDusthana: lord3Hlung && [6,8,12].includes(lord3Hlung),
    h3MaleficNames: h3Malefics.map(p => p.name),
    saturnAspectsH3: !!satAspH3,
    rahuOrKetuInH3: nativeRahuHouse === 3 || nativeKetuHouse === 3,
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
    saturnScore: satScore2,
    saturnHouse: nativeSaturnHouse,
    lord10InDusthana: lord10Hbone && [6,8,12].includes(lord10Hbone),
    h10MaleficNames: h10Malefics.map(p => p.name),
    marsAspectsH10: !!marsAspH10,
    ketuInH10: nativeKetuHouse === 10,
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
    sunScore,
    sunIsDebilitated,
    maleficAspectsSun,
    lord2InDusthana: lord2Heye && [6,8,12].includes(lord2Heye),
    lord12InDusthana: lord12Heye && [6,8,12].includes(lord12Heye),
    h2MaleficNames: h2Malefics.map(p => p.name),
    h12MaleficNames: h12Malefics.map(p => p.name),
    rahuInH2OrH12: nativeRahuHouse === 2 || nativeRahuHouse === 12,
    ketuInH2OrH12: nativeKetuHouse === 2 || nativeKetuHouse === 12,
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
    mercuryScore: mercScore,
    moonScore: moonScore2,
    mercuryInDusthana: mercHouse && [6,8,12].includes(mercHouse),
    moonInDusthana: nativeMoonHouse && [6,8,12].includes(nativeMoonHouse),
    vishYoga: nativeSaturnHouse === nativeMoonHouse,
    rahuOnMoonOrH3: nativeRahuHouse === 3 || nativeRahuHouse === nativeMoonHouse,
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
    venusScore,
    venusHouse: nativeVenusHouse,
    lord7InDusthana: lord7KidneyHouse && [6,8,12].includes(lord7KidneyHouse),
    lord8InDusthana: lord8Hrep && [6,8,12].includes(lord8Hrep),
    h7MaleficNames: h7Malefics.map(p => p.name),
    h8MaleficNames: h8Malefics2.map(p => p.name),
    marsInH7OrH8: nativeMarsHouse && [7,8].includes(nativeMarsHouse),
    saturnAspectsVenus: !!satAspectsVenus,
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
    mercuryScore: mercScore,
    venusScore,
    rahuInH1OrH6: nativeRahuHouse && [1,6].includes(nativeRahuHouse),
    ketuInH1OrH6: nativeKetuHouse && [1,6].includes(nativeKetuHouse),
    mercuryInDusthana: mercHouse && [6,8,12].includes(mercHouse),
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
    marsScore: marsScore2,
    marsHouse: nativeMarsHouse,
    saturnInH6OrH8: nativeSaturnHouse && [6,8].includes(nativeSaturnHouse),
    lord11InDusthana: lord11Hcirc && [6,8,12].includes(lord11Hcirc),
    rahuInH6: nativeRahuHouse === 6,
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
    venusScore,
    mercuryScore: mercScore,
    venusInH2OrDusthana: nativeVenusHouse === 2 || (nativeVenusHouse && [6,8,12].includes(nativeVenusHouse)),
    h2MaleficNames: h2Malefics.map(p => p.name),
    rahuInH2: nativeRahuHouse === 2,
  };

  // ── Build the organRisks summary array for prompt consumption ──
  // ─ KIDNEY & URINARY TRACT (Venus, H7, Saturn, H8) ────────────
  // Uses the already-computed nativeKidney* variables (above in the kidney section)
  // to slot kidney directly into organRisks so it appears in the full organ map.
  organRisks.kidneys = {
    organ: 'Kidneys & Urinary Tract',
    risk: nativeKidneyRisk,
    indicators: nativeKidneyIndicators,
    saturnInH8: nativeSaturnHouse === 8,
    ketuInH8: nativeKetuHouse === 8,
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
    saturnIsDebilitated,
    saturnScore,
    saturnInH11OrH12: nativeSaturnHouse === 12 || nativeSaturnHouse === 11,
    ketuInH12: nativeKetuHouse === 12,
    rahuInH12: nativeRahuHouse === 12,
    h12MaleficNames: h12MalFeet.map(p => p.name),
    h11MaleficNames: h11MalFeet.map(p => p.name),
  };

  const organRiskSummary = Object.values(organRisks).map(o => ({
    organ: o.organ,
    risk: o.risk,
    indicators: o.indicators,
  }));

  // ── HIGH-RISK organs for quick reference ──
  const highRiskOrgans = organRiskSummary.filter(o => o.risk === 'HIGH').map(o => o.organ);
  const moderateRiskOrgans = organRiskSummary.filter(o => o.risk === 'MODERATE').map(o => o.organ);

  // ── RANKED ORGAN RISKS — sorted by indicator count (highest risk first) ──
  const rankedOrganRisks = [...organRiskSummary].sort((a, b) => {
    const riskOrder = { 'HIGH': 3, 'MODERATE': 2, 'LOW': 1 };
    const levelDiff = (riskOrder[b.risk] || 0) - (riskOrder[a.risk] || 0);
    if (levelDiff !== 0) return levelDiff;
    return (b.indicators || 0) - (a.indicators || 0);
  });

  // ── PRIMARY HEALTH CONCERN — the single highest-risk organ ──
  const primaryHealthConcern = rankedOrganRisks[0] ? {
    organ: rankedOrganRisks[0].organ,
    risk: rankedOrganRisks[0].risk,
    indicators: rankedOrganRisks[0].indicators,
  } : null;

  // ── Health danger periods — antardasha-level dangerous combos ────
  const marakaLords = [lord2Name, lord7Name].filter(Boolean);
  const lagnaLordName = getHouseLord(1);
  const healthDangerLords = [lord6Name, lord8Name, 'Saturn', 'Ketu', ...marakaLords]
    .filter(l => l && l !== lagnaLordName);

  const healthDangerDasas = [];
  dasaPeriods.forEach(md => {
    const isMDDangerous = healthDangerLords.includes(md.lord);
    (md.antardashas || []).forEach(ad => {
      const isADDangerous = healthDangerLords.includes(ad.lord);
      if (isMDDangerous && isADDangerous) {
        healthDangerDasas.push({
          lord: md.lord,
          antardasha: ad.lord,
          period: `${ad.start} to ${ad.endDate}`,
          level: 'CRITICAL',
        });
      }
    });
  });

  const health = {
    title: 'Health Blueprint',
    sinhala: 'සෞඛ්‍ය සැලැස්ම',
    sixthHouse: h6Health,
    eighthHouse: h8Health,
    sunHealthScore: getHealthScore('sun'),
    // ── Infant/Early childhood health vulnerability ──────────────
    earlyLifeHealth: (() => {
      const indicators = [];
      const maleficNames = ['Saturn', 'Mars', 'Rahu', 'Ketu'];
      const maleficHouses = {};
      maleficNames.forEach(m => { maleficHouses[m] = getPlanetHouse(m); });
      const maleficsIn = (h) => maleficNames.filter(m => maleficHouses[m] === h);
      const h1M = maleficsIn(1), h4M = maleficsIn(4), h6M = maleficsIn(6), h8M = maleficsIn(8);
      // Malefics in health houses
      if (h4M.length > 0) indicators.push({ type: 'maleficsInH4', planets: h4M });
      if (h6M.length > 0) indicators.push({ type: 'maleficsInH6', planets: h6M, multiple: h6M.length >= 2 });
      if (h8M.length > 0) indicators.push({ type: 'maleficsInH8', planets: h8M });
      if (h1M.length > 0) indicators.push({ type: 'maleficsInH1', planets: h1M });
      // Debilitated planets
      const satDebilitated = planets.saturn?.rashi === 'Mesha';
      const marsDebilitated = planets.mars?.rashi === 'Karkata';
      if (satDebilitated) indicators.push({ type: 'saturnDebilitated', house: maleficHouses['Saturn'] });
      if (marsDebilitated) indicators.push({ type: 'marsDebilitated', house: maleficHouses['Mars'] });
      // Retrograde malefics in health houses
      if (planets.saturn?.isRetrograde && [1,4,6,8].includes(maleficHouses['Saturn'])) indicators.push({ type: 'saturnRetroInHealthHouse', house: maleficHouses['Saturn'] });
      if (planets.mars?.isRetrograde && [1,4,6,8].includes(maleficHouses['Mars'])) indicators.push({ type: 'marsRetroInHealthHouse', house: maleficHouses['Mars'] });
      // Birth dasha lord in difficult house
      const birthDashaLord = dasaPeriods[0]?.lord;
      if (birthDashaLord) {
        const bdHouse = getPlanetHouse(birthDashaLord);
        if ([6, 8, 12].includes(bdHouse)) indicators.push({ type: 'birthDashaLordInDusthana', lord: birthDashaLord, house: bdHouse });
      }
      // Weak Moon
      const moonScore = getHealthScore('moon');
      if (moonScore < 40) indicators.push({ type: 'weakMoon', score: moonScore });
      const severity = indicators.length >= 4 ? 'CRITICAL' : indicators.length >= 2 ? 'HIGH' : indicators.length >= 1 ? 'MODERATE' : 'LOW';
      return {
        severity,
        indicators,
        riskCount: indicators.length,
      };
    })(),
    mentalHealthIndicator: (() => {
      const satInMoonH = getPlanetHouse('Saturn') === getPlanetHouse('Moon');
      const mh = getPlanetHouse('Moon');
      const satH = getPlanetHouse('Saturn');
      let saturnAspectsMoon = false;
      if (satH && mh) {
        const gap = ((mh - satH + 12) % 12) + 1;
        saturnAspectsMoon = [3, 7, 10].includes(gap);
      }
      return {
        moonSaturnConjunction: satInMoonH,
        moonInDusthana: mh && [6, 8, 12].includes(mh),
        moonHouse: mh,
        saturnAspectsMoon,
        moonScore: getHealthScore('moon'),
      };
    })(),
    healthVulnerabilities,
    bodyRisks,
    dangerPeriods: healthDangerDasas,
    longevityIndicator: (() => {
      const satScore = getHealthScore('saturn');
      const h8strength = h8Health?.strength || 'moderate';
      return { saturnScore: satScore, h8Strength: h8strength };
    })(),
    dietRecommendations: (() => {
      const weakPlanets = [];
      if (getHealthScore('sun') < 50) weakPlanets.push({ planet: 'Sun', score: getHealthScore('sun') });
      if (getHealthScore('moon') < 50) weakPlanets.push({ planet: 'Moon', score: getHealthScore('moon') });
      if (getHealthScore('mars') < 50) weakPlanets.push({ planet: 'Mars', score: getHealthScore('mars') });
      if (getHealthScore('jupiter') < 50) weakPlanets.push({ planet: 'Jupiter', score: getHealthScore('jupiter') });
      if (getHealthScore('saturn') < 50) weakPlanets.push({ planet: 'Saturn', score: getHealthScore('saturn') });
      return weakPlanets;
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

      windows.push({
        period: `${dp.start} – ${dp.endDate}`,
        nativeAge: `native age ~${Math.max(0,ageStart)}–${ageEnd}`,
        dasha: dp.lord,
      });
    }
    return windows.slice(0, 5);
  })();

  // ── MOTHER'S CAREER — RAW PLANETARY DATA (no bias/predictions) ─────
  // Architecture: Engine provides ONLY raw planet positions, dignities, strengths,
  // and house placements. AI interprets what career the mother may have had.
  // NO hardcoded career types, NO scoring, NO homemaker assumptions.
  const motherCareerAnalysis = (() => {
    const moonH = moonFamilyHouse || 0;
    const venusH = venusFamilyHouse || 0;
    const lord4H = lord4FamilyHouse || 0;
    const moonSign = planets.moon?.rashi || '';
    const mercH = getPlanetHouse('Mercury') || 0;
    const jupH = getPlanetHouse('Jupiter') || 0;
    const sunH = getPlanetHouse('Sun') || 0;
    const h4pl = h4Family?.planetsInHouse || [];

    // 10th from 4th = mother's career house (1st house of native)
    const motherCareerHouse = 1; // 10th from 4th
    const h1ForMotherCareer = houses[0]?.planets?.filter(p => p.name !== 'Lagna').map(p => p.name) || [];

    // Lord of mother's career house (= lagna lord) and its placement
    const motherCareerLord = getHouseLord(1);
    const motherCareerLordHouse = getPlanetHouse(motherCareerLord);

    // 7th from 4th = mother's partnership/public house (10th house of native)
    const mother7thHouse = 10;
    const h10ForMother = (houses[9]?.planets || []).filter(p => p.name !== 'Lagna').map(p => p.name);

    return {
      // Raw Moon data (mother karaka)
      moonRashi: moonSign,
      moonRashiEnglish: planets.moon?.rashiEnglish || '',
      moonHouse: moonH,
      moonDignity: planetStrengths.moon?.dignityLevel || 'Neutral',
      moonShadbala: advancedShadbala?.moon?.percentage || null,
      moonNakshatra: planets.moon?.nakshatra || '',
      // D9 Moon confirmation (Navamsha position reveals deeper nature)
      moonNavamsha: navamsha?.planets?.moon?.navamshaRashi || null,
      moonNavamshaEnglish: navamsha?.planets?.moon?.navamshaRashiEnglish || null,
      // 4th house data (mother's house)
      lord4Planet: lord4Family,
      lord4House: lord4H,
      lord4Dignity: planetStrengths[lord4Family?.toLowerCase()]?.dignityLevel || 'Neutral',
      lord4Shadbala: advancedShadbala?.[lord4Family?.toLowerCase()]?.percentage || null,
      // D9 4th lord confirmation
      lord4Navamsha: navamsha?.planets?.[lord4Family?.toLowerCase()]?.navamshaRashi || null,
      planetsIn4th: h4pl,
      aspectsOn4th: h4Family?.aspectingPlanets?.map(a => ({ planet: a.planet, aspect: a.aspect })) || [],
      // Mother's career house (10th from 4th = H1)
      motherCareerHousePlanets: h1ForMotherCareer,
      motherCareerLord,
      motherCareerLordHouse,
      motherCareerLordDignity: planetStrengths[motherCareerLord?.toLowerCase()]?.dignityLevel || 'Neutral',
      motherCareerLordShadbala: advancedShadbala?.[motherCareerLord?.toLowerCase()]?.percentage || null,
      // Mother's 7th house (10th from native = public/career visibility)
      mother7thHousePlanets: h10ForMother,
      // Key planets relevant to career analysis
      venusHouse: venusH,
      venusDignity: planetStrengths.venus?.dignityLevel || 'Neutral',
      venusShadbala: advancedShadbala?.venus?.percentage || null,
      mercuryHouse: mercH,
      mercuryDignity: planetStrengths.mercury?.dignityLevel || 'Neutral',
      mercuryShadbala: advancedShadbala?.mercury?.percentage || null,
      jupiterHouse: jupH,
      jupiterDignity: planetStrengths.jupiter?.dignityLevel || 'Neutral',
      jupiterShadbala: advancedShadbala?.jupiter?.percentage || null,
      sunHouse: sunH,
      saturnHouse: satFamilyHouse,
      rahuHouse: rahuFamilyHouse,
      // Matrukaraka (Jaimini) for mother
      matrukaraka: matrukaraka ? { planet: matrukaraka.planet, rashi: matrukaraka.rashi } : null,
      // D12 for parent chart
      d12Data: extendedVargas?.D12 ? {
        d12Lagna: extendedVargas.D12.lagnaRashi,
        d12Moon: extendedVargas.D12.positions?.moon?.vargaRashi,
        d12Lord4: extendedVargas.D12.positions?.[lord4Family?.toLowerCase()]?.vargaRashi,
      } : null,
    };
  })();

  // Mother's personality — AI interprets from Moon sign (no hardcoded mapping)

  // Mother's health risks — technical indicators
  const motherHealthRisks = (() => {
    const indicators = [];

    // ── KIDNEY / URINARY ──────────────────────
    if (highKidneyRisk) {
      indicators.push({ type: 'kidneyHighRisk', lord4InH8, lord4IsSaturn, ketuConjLord4, satAspectsMoon, moonIsVenusSign, moonRashiName });
    } else if (moonIsVenusSign && lord4InH6) {
      indicators.push({ type: 'kidneyModerateRisk', moonIsVenusSign: true, lord4InH6: true });
    } else if (moonIsVenusSign && (satAspectsMoon || rahuConjMoon || ketuConjMoon)) {
      indicators.push({ type: 'kidneyModerateRisk', moonIsVenusSign: true, satAspectsMoon, rahuConjMoon, ketuConjMoon });
    }

    // ── EMOTIONAL / MENTAL ──────────────────────
    if (moonFamilyScore < 45) indicators.push({ type: 'weakMoon', score: moonFamilyScore });
    if (moonSatConjunct) indicators.push({ type: 'moonSaturnConjunction' });

    // ── 4th lord in dusthana ────────────────────
    if (lord4InDusthanFamily) indicators.push({ type: 'lord4InDusthana', lord: lord4Family, house: lord4FamilyHouse });

    // ── Malefics in 4th ─────────────────────────
    if (maleficsIn4.length > 0) indicators.push({ type: 'maleficsIn4th', planets: maleficsIn4 });

    // ── Saturn aspects 4th house ────────────────
    const sat4thAspect = h4Family?.aspectingPlanets?.some(a => a.planet === 'Saturn');
    if (sat4thAspect && !maleficsIn4.includes('Saturn')) indicators.push({ type: 'saturnAspects4th' });

    return indicators;
  })();

  // Mother's struggles — technical indicators
  const motherStruggles = (() => {
    const indicators = [];
    if (hasStrongAbandonmentRisk) indicators.push({ type: 'strongAbandonmentRisk' });
    else if (hasAbandonmentRisk) indicators.push({ type: 'abandonmentRisk' });
    if (moonSatConjunct) indicators.push({ type: 'moonSaturnConjunction' });
    if (lord4InDusthanFamily) indicators.push({ type: 'lord4InDusthana', house: lord4FamilyHouse });
    if (maleficsIn4.length > 0) indicators.push({ type: 'maleficsIn4th', planets: maleficsIn4 });
    const satToMoonGap = satFamilyHouse && moonFamilyHouse ? ((moonFamilyHouse - satFamilyHouse + 12) % 12) + 1 : 0;
    if ([3, 7, 10].includes(satToMoonGap)) indicators.push({ type: 'saturnAspectsMoon' });
    if (moonFamilyHouse && [6, 8, 12].includes(moonFamilyHouse)) indicators.push({ type: 'moonInDusthana', house: moonFamilyHouse });
    return indicators;
  })();

  // Mother bond — technical factors for AI interpretation
  const nativeMotherbond = {
    hasStrongAbandonmentRisk,
    hasAbandonmentRisk,
    moonInKendra: [1, 4, 7, 10].includes(moonFamilyHouse),  // Kendra = 1,4,7,10 (not 9 which is Trikona)
    moonInTrikona: [1, 5, 9].includes(moonFamilyHouse),
    moonSatConjunct,
    moonScore: moonFamilyScore,
    lord4InDusthana: lord4InDusthanFamily,
    moonHouse: moonFamilyHouse,
  };

  const mother = {
    title: 'Mother (Amma / මව)',
    sinhala: 'මව් ස්වභාවය, සෞඛ්‍යය සහ ජීවිත අරගල',
    h4Analysis: { strength: h4Family?.strength, planetsIn4th: h4Family?.planetsInHouse || [], aspectsOn4th: h4Family?.aspectingPlanets || [] },
    h4Lord: { name: lord4Family, house: lord4FamilyHouse },
    moonPosition: { house: moonFamilyHouse, rashi: planets.moon?.rashi, rashiEnglish: planets.moon?.rashiEnglish, degree: planets.moon?.degreeInSign?.toFixed(2) },
    moonShadbala: advancedShadbala?.moon ? { percentage: advancedShadbala.moon.percentage, strength: advancedShadbala.moon.strength } : null,
    matrukaraka: matrukaraka ? { planet: matrukaraka.planet, rashi: matrukaraka.rashi } : null,
    d12ParentChart: d12Lagna ? { d12Lagna } : null,
    motherCareer: motherCareerAnalysis,
    // ── DERIVED HOUSE CHART — Mother's full chart (4th as lagna) ──
    // Enables AI to read ALL 12 houses from mother's perspective, not just cherry-picked ones
    derivedChart: (() => {
      const baseHouse = 4; // mother's lagna = native's 4th
      const chart = {};
      for (let i = 1; i <= 12; i++) {
        const nativeHouseNum = ((baseHouse - 1 + i - 1) % 12) + 1;
        const h = houses[nativeHouseNum - 1];
        const pl = h?.planets?.filter(p => p.name !== 'Lagna').map(p => p.name) || [];
        chart[i] = {
          nativeHouse: nativeHouseNum,
          rashi: h?.rashi,
          rashiLord: h?.rashiLord,
          planets: pl,
        };
      }
      return chart;
    })(),
    hasStrongAbandonmentRisk,
    hasAbandonmentRisk,
    healthRisks: motherHealthRisks,
    kidneyRisk: { high: highKidneyRisk, indicatorCount: kidneyIndicators },
    healthCrisisWindows: motherAgeCrisisWindows,
    lifestrug: motherStruggles,
    bond: nativeMotherbond,
    motherHealthPeriods: dasaPeriods
      .filter(dp => dp.lord === lord4Family || dp.lord === 'Moon' || dp.lord === 'Saturn')
      .map(dp => ({
        lord: dp.lord,
        period: `${dp.start} to ${dp.endDate}`,
      })),
    maleficsIn4th: maleficsIn4,
    lord4InDusthanFamily,
  };

  // ── FATHER ──────────────────────────────────────────────────────
  const sunFamilyScore  = getHealthScore('sun');
  const sunFamilyHouse  = getPlanetHouse('Sun');
  const lord9InDusthan  = lord9FamilyHouse && [6, 8, 12].includes(lord9FamilyHouse);
  const maleficsIn9     = h9Family?.maleficsIn || [];
  const marsFamilyHouseF = getPlanetHouse('Mars');  // Mars = enterprise, action
  const jupiterFamilyHouseF = getPlanetHouse('Jupiter');

  // Father's personality — AI interprets from Sun sign (no hardcoded mapping)

  const fatherHealthRisks = (() => {
    const indicators = [];
    if (sunFamilyScore < 45) indicators.push({ type: 'weakSun', score: sunFamilyScore });
    const sat9Aspect = h9Family?.aspectingPlanets?.some(a => a.planet === 'Saturn');
    if (sat9Aspect) indicators.push({ type: 'saturnAspects9th' });
    if (maleficsIn9.length > 0) indicators.push({ type: 'maleficsIn9th', planets: maleficsIn9 });
    if (lord9InDusthan) indicators.push({ type: 'lord9InDusthana', house: lord9FamilyHouse });
    return indicators;
  })();

  const fatherStruggles = (() => {
    const indicators = [];
    if (sunFamilyScore < 45) indicators.push({ type: 'weakSun', score: sunFamilyScore });
    if (lord9InDusthan) indicators.push({ type: 'lord9InDusthana', house: lord9FamilyHouse });
    if (maleficsIn9.length > 0) indicators.push({ type: 'maleficsIn9th', planets: maleficsIn9 });
    const sunInDusthan = sunFamilyHouse && [6, 8, 12].includes(sunFamilyHouse);
    if (sunInDusthan) indicators.push({ type: 'sunInDusthana', house: sunFamilyHouse });
    return indicators;
  })();

  const nativeFatherBond = {
    sunInKendra: [1, 4, 7, 10].includes(sunFamilyHouse),   // Kendra = 1,4,7,10 (not 9 which is Trikona)
    sunInTrikona: [1, 5, 9].includes(sunFamilyHouse),
    sunInDusthana: sunFamilyHouse && [6, 8, 12].includes(sunFamilyHouse),
    sunScore: sunFamilyScore,
    lord9InDusthana: lord9InDusthan,
    sunHouse: sunFamilyHouse,
  };

  const fatherCareerAnalysis = (() => {
    const sunH = sunFamilyHouse || 0;
    const marsH = marsFamilyHouseF || 0;
    const lord10Family = getHouseLord(10);
    const lord10FamilyHouse = getPlanetHouse(lord10Family);
    const h9pl = h9Family?.planetsInHouse || [];
    const jupH = jupiterFamilyHouseF || 0;
    const h10pl = (houses?.[9]?.planets || []).filter(p => p.name !== 'Lagna').map(p => p.name);

    // 10th from 9th = father's career house (6th house of native)
    const fatherCareerHouse = 6; // 10th from 9th
    const h6ForFatherCareer = (houses[5]?.planets || []).filter(p => p.name !== 'Lagna').map(p => p.name);

    // Lord of father's career house (= lord of 6th) and its placement
    const fatherCareerLord = getHouseLord(6);
    const fatherCareerLordHouse = getPlanetHouse(fatherCareerLord);

    // 7th from 9th = father's partnership/public house (3rd house of native)
    const father7thHouse = 3;
    const h3ForFather = (houses[2]?.planets || []).filter(p => p.name !== 'Lagna').map(p => p.name);

    return {
      // Raw Sun data (father karaka)
      sunRashi: planets.sun?.rashi,
      sunRashiEnglish: planets.sun?.rashiEnglish || '',
      sunHouse: sunH,
      sunDignity: planetStrengths.sun?.dignityLevel || 'Neutral',
      sunShadbala: advancedShadbala?.sun?.percentage || null,
      sunNakshatra: planets.sun?.nakshatra || '',
      // D9 Sun confirmation (Navamsha position reveals deeper nature)
      sunNavamsha: navamsha?.planets?.sun?.navamshaRashi || null,
      sunNavamshaEnglish: navamsha?.planets?.sun?.navamshaRashiEnglish || null,
      // 9th house data (father's house)
      lord9Planet: lord9Family,
      lord9House: lord9FamilyHouse,
      lord9Dignity: planetStrengths[lord9Family?.toLowerCase()]?.dignityLevel || 'Neutral',
      lord9Shadbala: advancedShadbala?.[lord9Family?.toLowerCase()]?.percentage || null,
      // D9 9th lord confirmation
      lord9Navamsha: navamsha?.planets?.[lord9Family?.toLowerCase()]?.navamshaRashi || null,
      planetsIn9th: h9pl,
      aspectsOn9th: h9Family?.aspectingPlanets?.map(a => ({ planet: a.planet, aspect: a.aspect })) || [],
      // Father's career house (10th from 9th = H6)
      fatherCareerHousePlanets: h6ForFatherCareer,
      fatherCareerLord,
      fatherCareerLordHouse,
      fatherCareerLordDignity: planetStrengths[fatherCareerLord?.toLowerCase()]?.dignityLevel || 'Neutral',
      fatherCareerLordShadbala: advancedShadbala?.[fatherCareerLord?.toLowerCase()]?.percentage || null,
      // Father's 7th house (3rd of native = partnerships/public for father)
      father7thHousePlanets: h3ForFather,
      // Key planets for career inference
      marsHouse: marsH,
      marsRashi: planets.mars?.rashi,
      marsDignity: planetStrengths.mars?.dignityLevel || 'Neutral',
      marsShadbala: advancedShadbala?.mars?.percentage || null,
      jupiterHouse: jupH,
      jupiterRashi: planets.jupiter?.rashi,
      jupiterDignity: planetStrengths.jupiter?.dignityLevel || 'Neutral',
      jupiterShadbala: advancedShadbala?.jupiter?.percentage || null,
      saturnHouse: satFamilyHouse,
      rahuHouse: getPlanetHouse('Rahu'),
      // Native's 10th house data (father often influences native's career)
      nativeLord10: lord10Family,
      nativeLord10House: lord10FamilyHouse,
      nativeH10Planets: h10pl,
      // Pitrakaraka (Jaimini) for father
      pitrakaraka: pitrakaraka ? { planet: pitrakaraka.planet, rashi: pitrakaraka.rashi } : null,
      // D12 for parent chart
      d12Data: extendedVargas?.D12 ? {
        d12Lagna: extendedVargas.D12.lagnaRashi,
        d12Sun: extendedVargas.D12.positions?.sun?.vargaRashi,
        d12Lord9: extendedVargas.D12.positions?.[lord9Family?.toLowerCase()]?.vargaRashi,
      } : null,
    };
  })();

  const father = {
    title: 'Father (Thaththa / පියා)',
    sinhala: 'පිය ස්වභාවය, සෞඛ්‍යය සහ ජීවිත අරගල',
    h9Analysis: { strength: h9Family?.strength, planetsIn9th: h9Family?.planetsInHouse || [], aspectsOn9th: h9Family?.aspectingPlanets || [] },
    h9Lord: { name: lord9Family, house: lord9FamilyHouse },
    sunPosition: { house: sunFamilyHouse, rashi: planets.sun?.rashi, rashiEnglish: planets.sun?.rashiEnglish, degree: planets.sun?.degreeInSign?.toFixed(2) },
    sunShadbala: advancedShadbala?.sun ? { percentage: advancedShadbala.sun.percentage, strength: advancedShadbala.sun.strength } : null,
    pitrakaraka: pitrakaraka ? { planet: pitrakaraka.planet, rashi: pitrakaraka.rashi } : null,
    d12ParentChart: d12Lagna ? { d12Lagna } : null,
    // ── DERIVED HOUSE CHART — Father's full chart (9th as lagna) ──
    // Enables AI to read ALL 12 houses from father's perspective, not just cherry-picked ones
    derivedChart: (() => {
      const baseHouse = 9;
      const chart = {};
      for (let i = 1; i <= 12; i++) {
        const nativeHouseNum = ((baseHouse - 1 + i - 1) % 12) + 1;
        const h = houses[nativeHouseNum - 1];
        const pl = h?.planets?.filter(p => p.name !== 'Lagna').map(p => p.name) || [];
        chart[i] = {
          nativeHouse: nativeHouseNum,
          rashi: h?.rashi,
          rashiLord: h?.rashiLord,
          planets: pl,
        };
      }
      return chart;
    })(),
    healthRisks: fatherHealthRisks,
    lifestrug: fatherStruggles,
    bond: nativeFatherBond,
    fatherCareer: fatherCareerAnalysis,
    lord9InDusthan,
    maleficsIn9th: maleficsIn9,
    fatherEventPeriods: dasaPeriods
      .filter(dp => dp.lord === lord9Family || dp.lord === 'Sun')
      .map(dp => ({
        lord: dp.lord,
        period: `${dp.start} to ${dp.endDate}`,
      })),
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

    // ── Mars karaka strength modulation ──────────────────────────
    // Mars = natural karaka for siblings (BPHS). Strong Mars = more siblings,
    // weak/debilitated Mars = fewer siblings regardless of house placements.
    const marsDignity = planetStrengths.mars?.dignityLevel || 'Neutral';
    const marsShadbala = advancedShadbala?.mars?.percentage || 50;
    let marsKarakaMod = 0;
    if (marsDignity === 'Exalted' || marsShadbala >= 70) marsKarakaMod = 0.4;
    else if (marsDignity === 'Own Sign' || marsShadbala >= 60) marsKarakaMod = 0.2;
    else if (marsDignity === 'Debilitated' || marsShadbala < 30) marsKarakaMod = -0.5;
    else if (marsShadbala < 40) marsKarakaMod = -0.3;
    // Neutral Mars (not debilitated, not exceptionally weak) = no penalty
    // This prevents false negatives when Mars is just average (shadbala 38-50)

    // ── Fertile sign bonus ───────────────────────────────────────
    // BPHS: Water signs (Kataka, Vrischika, Meena) are the most fertile.
    // If the 3rd or 11th house falls in a fertile sign, sibling count increases.
    const FERTILE_SIGNS = ['Kataka', 'Vrischika', 'Meena'];
    const BARREN_SIGNS = ['Mesha', 'Simha', 'Kanya']; 
    const h3SignFertile = FERTILE_SIGNS.includes(houses[2]?.rashi) ? 0.2 : 0;
    const h3SignBarren = BARREN_SIGNS.includes(houses[2]?.rashi) ? -0.15 : 0;
    const h11SignFertile = FERTILE_SIGNS.includes(houses[10]?.rashi) ? 0.2 : 0;
    const h11SignBarren = BARREN_SIGNS.includes(houses[10]?.rashi) ? -0.15 : 0;

    // ── 3rd house = younger co-borns ─────────────────────────────
    // BPHS principles for sibling count:
    //   1. Planets IN the house — strongest direct evidence
    //   2. House lord placement — represents the house even when away (PRIMARY, not secondary)
    //   3. Aspects on the house — especially important when house is empty
    //   4. Mars karaka strength — natural sibling indicator regardless of house occupancy
    //   5. Lord in dusthana = troubled/reduced siblings, NOT zero
    //
    // Exclude Sun (father karaka), Rahu and Ketu (shadow nodes — reduce, not add siblings)
    const h3SiblingPlanets = h3pl.filter(p => !['Sun', 'Rahu', 'Ketu'].includes(p));
    youngerScore += h3SiblingPlanets.length * 1.2;
    if (h3pl.includes('Mars'))    { hasBros = true; youngerScore += 0.4; }
    if (h3pl.includes('Venus'))   { hasSis  = true; youngerScore += 0.4; }
    if (h3pl.includes('Moon'))    { hasSis  = true; youngerScore += 0.3; }
    if (h3pl.includes('Jupiter')) youngerScore += 0.3;
    if (h3pl.includes('Saturn')) youngerScore -= 0.4; // Saturn restricts/delays
    if (h3pl.includes('Rahu'))   youngerScore -= 0.3; // Rahu = shadow, confuses
    if (h3pl.includes('Ketu'))   youngerScore -= 0.4; // Ketu = severance
    // BPHS: Ketu conjunct Mars (sibling karaka) in sibling house = karaka "severed"
    // Ketu strips Mars of its ability to produce siblings — much stronger denial
    if (h3pl.includes('Ketu') && h3pl.includes('Mars')) youngerScore -= 0.6;
    // Rahu as SOLE occupant = illusion, no real siblings. Extra penalty.
    if (h3pl.includes('Rahu') && h3SiblingPlanets.length === 0) youngerScore -= 0.2;
    // Saturn aspecting Rahu = restriction on the illusion
    const h3AspEarly = (h3Family?.aspectingPlanets || []).map(a => a.planet);
    if (h3pl.includes('Rahu') && h3AspEarly.includes('Saturn')) youngerScore -= 0.15;

    // 3rd lord placement — LORD IS A PRIMARY INDICATOR per BPHS
    // The lord carries the house's energy wherever it sits. Even in dusthana,
    // siblings may exist (just troubled/reduced).
    if (lord3FamilyHouse) {
      if (lord3FamilyHouse === 3) {
        // Lord in own house = strongest — ALWAYS gives siblings
        youngerScore += 0.8;
      } else if (lord3InDusthan) {
        // Lord in dusthana = siblings exist but may be troubled/fewer
        // Base: 0.25. When Mars karaka is strong, compensate further.
        youngerScore += 0.25;
        if (marsShadbala >= 50) youngerScore += 0.15; // Strong karaka compensates weak lord
      } else if (h3SiblingPlanets.length > 0) {
        // Lord well-placed AND planets present = strong evidence
        youngerScore += 0.5;
      } else {
        // Lord well-placed, house empty = moderate evidence
        youngerScore += 0.35;
      }
      // Special: Mars is both 3rd lord AND natural sibling karaka
      if (lord3Family === 'Mars') youngerScore += 0.2;
    }

    // Aspects on 3rd — IMPORTANT when house is empty (only energy reaching the house)
    const h3Asp = h3AspEarly; // already computed above for Rahu+Saturn check
    if (h3SiblingPlanets.length > 0) {
      // Planets present — aspects are confirmation
      if (h3Asp.includes('Mars'))    { hasBros = true; youngerScore += 0.25; }
      if (h3Asp.includes('Venus'))   { hasSis  = true; youngerScore += 0.25; }
      if (h3Asp.includes('Jupiter')) {
        const jupDig = planetStrengths.jupiter?.dignityLevel || 'Neutral';
        youngerScore += (jupDig === 'Debilitated') ? 0 : 0.2;
      }
    } else {
      // House empty — aspects are the PRIMARY evidence of energy reaching it
      if (h3Asp.includes('Mars'))    { hasBros = true; youngerScore += 0.15; }
      if (h3Asp.includes('Venus'))   { hasSis  = true; youngerScore += 0.15; }
      if (h3Asp.includes('Jupiter')) {
        const jupDig = planetStrengths.jupiter?.dignityLevel || 'Neutral';
        youngerScore += (jupDig === 'Debilitated') ? 0 : 0.15;
      }
      // Saturn aspect on empty house = delay/reduction but not elimination
      if (h3Asp.includes('Saturn')) youngerScore -= 0.1;
    }

    // House strength: only adds bonus when at least one sibling planet is already present
    if (h3SiblingPlanets.length > 0) {
      if (h3Family?.strength === 'very strong') youngerScore += 0.3;
      else if (h3Family?.strength === 'strong') youngerScore += 0.15;
    }

    // Apply Mars karaka modulation + fertile sign bonus to younger siblings
    // BPHS nuance: If Mars IS the 3rd lord, its lordship compensates karaka weakness.
    // A debilitated Mars that is also the lord still represents the house — halve the penalty.
    const marsKarakaYounger = (lord3Family === 'Mars' && marsKarakaMod < 0)
      ? marsKarakaMod * 0.5 : marsKarakaMod;
    youngerScore += marsKarakaYounger;
    youngerScore += h3SignFertile + h3SignBarren;

    // ── 11th house = elder co-borns ───────────────────────────────
    // Same BPHS principles: lord is PRIMARY, aspects matter for empty houses.
    // Exclude Sun (father karaka), Saturn (malefic/chronic, reduces count), Moon (mother karaka),
    // Rahu and Ketu (shadow nodes — reduce, not add siblings)
    const h11SiblingPlanets = h11pl.filter(p => !['Sun', 'Saturn', 'Moon', 'Rahu', 'Ketu'].includes(p));
    elderScore += h11SiblingPlanets.length * 1.2;
    if (h11pl.includes('Mars'))    { hasBros = true; elderScore += 0.3; }
    if (h11pl.includes('Venus'))   { hasSis  = true; elderScore += 0.3; }
    // Moon in 11th = mother karaka, NOT an elder sibling indicator — only suppress/ignore
    if (h11pl.includes('Jupiter')) elderScore += 0.2;
    if (h11pl.includes('Saturn'))  elderScore -= 0.4;  // Saturn in 11th reduces elder siblings
    if (h11pl.includes('Rahu'))    elderScore -= 0.3;   // Rahu = shadow node, reduces count
    if (h11pl.includes('Ketu'))    elderScore -= 0.4;   // Ketu = severance, reduces count
    // BPHS: Ketu conjunct Mars in sibling house = karaka severed
    if (h11pl.includes('Ketu') && h11pl.includes('Mars')) elderScore -= 0.6;
    // Rahu as SOLE occupant = illusion, no real sibling presence. Extra penalty.
    if (h11pl.includes('Rahu') && h11SiblingPlanets.length === 0) elderScore -= 0.2;
    // Saturn aspecting Rahu = restriction on the illusion → stronger denial
    if (h11pl.includes('Rahu') && h11Aspects.some(a => a.planet === 'Saturn')) elderScore -= 0.15;

    // 11th lord placement — LORD IS PRIMARY per BPHS
    if (lord11FamilyHouse) {
      if (lord11FamilyHouse === 11) {
        elderScore += 0.7; // Lord in own house = strong elder siblings
      } else if (lord11InDusthan) {
        // Lord in dusthana = elder siblings may exist but fewer/troubled
        elderScore += 0.25;
        if (marsShadbala >= 50) elderScore += 0.15; // Strong karaka compensates weak lord
      } else if (h11SiblingPlanets.length > 0) {
        elderScore += 0.5;
      } else {
        // Lord well-placed, house empty = moderate evidence
        elderScore += 0.35;
      }
      // Special: Mars is 11th lord AND natural sibling karaka
      if (lord11Family === 'Mars') elderScore += 0.2;
    }

    // Aspects on 11th — important when house is empty
    if (h11SiblingPlanets.length > 0) {
      if (h11Aspects.some(a => a.planet === 'Mars'))    { hasBros = true; elderScore += 0.2; }
      if (h11Aspects.some(a => a.planet === 'Venus'))   { hasSis  = true; elderScore += 0.2; }
      // Jupiter aspect: check dignity — debilitated Jupiter gives weak/no benefit
      if (h11Aspects.some(a => a.planet === 'Jupiter')) {
        const jupDig = planetStrengths.jupiter?.dignityLevel || 'Neutral';
        elderScore += (jupDig === 'Debilitated') ? 0 : 0.2;
      }
    } else {
      // Empty house — aspects are primary energy
      if (h11Aspects.some(a => a.planet === 'Mars'))    { hasBros = true; elderScore += 0.15; }
      if (h11Aspects.some(a => a.planet === 'Venus'))   { hasSis  = true; elderScore += 0.15; }
      // Jupiter aspect on empty house: debilitated Jupiter = no benefit
      if (h11Aspects.some(a => a.planet === 'Jupiter')) {
        const jupDig = planetStrengths.jupiter?.dignityLevel || 'Neutral';
        elderScore += (jupDig === 'Debilitated') ? 0 : 0.15;
      }
      if (h11Aspects.some(a => a.planet === 'Saturn'))  elderScore -= 0.1;
    }

    // House strength: only adds bonus when sibling-relevant planets are present
    if (h11SiblingPlanets.length > 0) {
      if (h11Family?.strength === 'very strong') elderScore += 0.2;
      else if (h11Family?.strength === 'strong') elderScore += 0.1;
    }
    // Hard cap: if Saturn is in 11th, elder count cannot exceed 1 regardless of score
    const saturnIn11 = h11pl.includes('Saturn');

    // Apply Mars karaka modulation + fertile sign bonus to elder siblings
    // Same lordship compensation: if Mars IS the 11th lord, halve karaka penalty
    const marsKarakaElder = (lord11Family === 'Mars' && marsKarakaMod < 0)
      ? marsKarakaMod * 0.5 : marsKarakaMod;
    elderScore += marsKarakaElder;
    elderScore += h11SignFertile + h11SignBarren;

    // ── Ashtakavarga confirmation — SAV bindus in sibling houses ──
    // SAV bindus represent overall house vitality. High SAV = thriving, low = weak.
    // For empty houses, SAV is one of the FEW quantitative signals available.
    // Mars BAV (Bhinnashtakavarga) = Mars's SPECIFIC contribution to each rashi.
    // Since Mars is the sibling karaka, high Mars BAV in sibling houses = strong
    // karaka support for siblings even when the house is physically empty.
    if (ashtakavarga?.sarvashtakavarga) {
      const h3RashiName = houses[2]?.rashi;
      const h11RashiName = houses[10]?.rashi;
      const h3SAV = h3RashiName ? (ashtakavarga.sarvashtakavarga[h3RashiName] || 0) : 0;
      const h11SAV = h11RashiName ? (ashtakavarga.sarvashtakavarga[h11RashiName] || 0) : 0;

      // SAV modulates ALL houses — even empty ones (represents latent house energy)
      if (h3SAV >= 30) youngerScore += 0.3;
      else if (h3SAV >= 25) youngerScore += 0.1;
      else if (h3SAV < 22) youngerScore -= 0.2;

      if (h11SAV >= 30) elderScore += 0.3;
      else if (h11SAV >= 25) elderScore += 0.1;
      else if (h11SAV < 22) elderScore -= 0.2;

      // Mars BAV — karaka's specific contribution to sibling houses
      const marsBAV = ashtakavarga.prastarashtakavarga?.Mars;
      if (marsBAV) {
        const h3MarsBAV = marsBAV[(houses[2]?.rashiId || 1) - 1] || 0;
        const h11MarsBAV = marsBAV[(houses[10]?.rashiId || 1) - 1] || 0;
        // Mars BAV ≥ 5 = strong karaka presence → boost sibling count
        // Mars BAV ≥ 4 = decent support → small boost
        // Mars BAV ≤ 1 = very weak karaka → penalty
        if (h3MarsBAV >= 5) youngerScore += 0.25;
        else if (h3MarsBAV >= 4) youngerScore += 0.1;
        else if (h3MarsBAV <= 1) youngerScore -= 0.15;

        if (h11MarsBAV >= 5) elderScore += 0.25;
        else if (h11MarsBAV >= 4) elderScore += 0.1;
        else if (h11MarsBAV <= 1) elderScore -= 0.15;
      }
    }

    // ── D3 (Drekkana) confirmation — BPHS primary varga for siblings ──
    // D3 is a CONFIRMATION layer — it can strengthen or weaken existing evidence,
    // but it should NOT create siblings from nothing when the primary house is empty.
    // Rule: D3 modulates ONLY the score that already has primary evidence (planets in house).
    const d3Data = extendedVargas?.D3 || null;
    if (d3Data) {
      const marsD3Rashi = d3Data.positions?.mars?.vargaRashi;
      if (marsD3Rashi) {
        // NOTE: extendedVargas uses ENGLISH rashi names (Aries, Capricorn, etc.)
        const marsExaltedOrOwn = ['Aries', 'Scorpio', 'Capricorn'].includes(marsD3Rashi);
        const marsDebilD3 = marsD3Rashi === 'Cancer';
        // D3 Mars strength modulates ONLY houses with existing planetary evidence
        // (prevents creating false siblings in empty houses)
        if (h3SiblingPlanets.length > 0) {
          if (marsExaltedOrOwn) youngerScore += 0.3;
          if (marsDebilD3) youngerScore -= 0.3;
        }
        if (h11SiblingPlanets.length > 0) {
          if (marsExaltedOrOwn) elderScore += 0.2;
          if (marsDebilD3) elderScore -= 0.2;
        }
        // D3 Mars debilitation can ALWAYS suppress (even without planets — it reduces the karaka globally)
        if (marsDebilD3 && h3SiblingPlanets.length === 0) youngerScore -= 0.15;
        if (marsDebilD3 && h11SiblingPlanets.length === 0) elderScore -= 0.1;
      }
    }

    // ── Gender determination — BPHS multi-layer methodology ──────
    // BPHS priority for sibling gender (highest to lowest weight):
    //   1. HOUSE LORD'S SIGN — lord of 3rd/11th sitting in even sign = female, odd = male (PRIMARY)
    //   2. Planets IN the house — Venus/Moon = female, Mars/Sun = male, others = neutral
    //   3. Aspecting planets — secondary confirmation only
    //   4. Venus/Moon direct connection to the sibling house = strong female override
    //   5. House sign — weakest indicator, barely tips the scale
    //
    // CRITICAL: Elder and younger gender are determined SEPARATELY.
    // Elder = 11th house indicators only. Younger = 3rd house indicators only.
    const EVEN_SIGNS = ['Vrishabha', 'Kataka', 'Kanya', 'Vrischika', 'Makara', 'Meena'];
    const FEMALE_PLANETS = ['Venus', 'Moon'];
    const MALE_PLANETS = ['Sun', 'Mars'];
    // Jupiter = male but weak gender signal (guru, not warrior)
    // Mercury, Saturn, Rahu, Ketu = gender-neutral — use their sign placement

    // ── ELDER sibling gender (11th house) ─────────────────────────
    let elderFemale = 0, elderMale = 0;
    const h11Rashi = houses[10]?.rashi || '';

    // PRIMARY: 11th lord's sign placement (strongest indicator per BPHS)
    const lord11Rashi = planets[lord11Family?.toLowerCase()]?.rashi || '';
    if (EVEN_SIGNS.includes(lord11Rashi)) elderFemale += 1.5;
    else if (lord11Rashi) elderMale += 1.5;

    // Planets in 11th — gendered planets, MODULATED by their sign placement
    // BPHS: A male planet in a female sign gives mixed/reduced male indication
    for (const p of h11pl) {
      const pRashi = planets[p.toLowerCase()]?.rashi || '';
      const inEvenSign = EVEN_SIGNS.includes(pRashi);
      if (FEMALE_PLANETS.includes(p)) {
        // Female planet: strong female, but in odd sign = slightly reduced
        elderFemale += inEvenSign ? 1.2 : 0.8;
      } else if (MALE_PLANETS.includes(p)) {
        // Male planet: strong male, but in EVEN sign = gender is mixed/reduced
        if (inEvenSign) {
          elderMale += 0.4;    // much reduced — male planet contradicted by female sign
          elderFemale += 0.5;  // sign adds female pull
        } else {
          elderMale += 1.2;    // male planet in male sign = strong male
        }
      } else if (p === 'Jupiter') elderMale += 0.4; // Jupiter = weakly male
      else {
        // Neutral planet — use its sign
        if (inEvenSign) elderFemale += 0.4;
        else if (pRashi) elderMale += 0.4;
      }
    }

    // Aspects on 11th — weak confirmation
    for (const asp of h11Aspects) {
      if (FEMALE_PLANETS.includes(asp.planet)) elderFemale += 0.4;
      else if (MALE_PLANETS.includes(asp.planet)) elderMale += 0.4;
      else if (asp.planet === 'Jupiter') {
        // Jupiter aspecting: check its sign for gender lean
        const jRashi = planets[asp.planet.toLowerCase()]?.rashi || '';
        if (EVEN_SIGNS.includes(jRashi)) elderFemale += 0.3;
        else elderMale += 0.3;
      }
    }

    // Venus/Moon connection to 11th (karaka override)
    if (venusFamilySibHouse === 11) elderFemale += 1.5;
    if (moonFamSibHouse === 11) elderFemale += 1.0;

    // House sign — weakest, tiebreaker only
    if (EVEN_SIGNS.includes(h11Rashi)) elderFemale += 0.3;
    else if (h11Rashi) elderMale += 0.3;

    // ── YOUNGER sibling gender (3rd house) ────────────────────────
    let youngerFemale = 0, youngerMale = 0;
    const h3Rashi = houses[2]?.rashi || '';

    // PRIMARY: 3rd lord's sign placement
    const lord3Rashi = planets[lord3Family?.toLowerCase()]?.rashi || '';
    if (EVEN_SIGNS.includes(lord3Rashi)) youngerFemale += 1.5;
    else if (lord3Rashi) youngerMale += 1.5;

    // Planets in 3rd — gendered planets, MODULATED by their sign placement
    for (const p of h3pl) {
      const pRashi = planets[p.toLowerCase()]?.rashi || '';
      const inEvenSign = EVEN_SIGNS.includes(pRashi);
      if (FEMALE_PLANETS.includes(p)) {
        youngerFemale += inEvenSign ? 1.2 : 0.8;
      } else if (MALE_PLANETS.includes(p)) {
        // Male planet in EVEN sign = gender is mixed/reduced
        if (inEvenSign) {
          youngerMale += 0.4;
          youngerFemale += 0.5;
        } else {
          youngerMale += 1.2;
        }
      } else if (p === 'Jupiter') youngerMale += 0.4;
      else {
        if (inEvenSign) youngerFemale += 0.4;
        else if (pRashi) youngerMale += 0.4;
      }
    }

    // Aspects on 3rd
    const h3AspList = h3Family?.aspectingPlanets || [];
    for (const asp of h3AspList) {
      if (FEMALE_PLANETS.includes(asp.planet)) youngerFemale += 0.4;
      else if (MALE_PLANETS.includes(asp.planet)) youngerMale += 0.4;
      else if (asp.planet === 'Jupiter') {
        const jRashi = planets[asp.planet.toLowerCase()]?.rashi || '';
        if (EVEN_SIGNS.includes(jRashi)) youngerFemale += 0.3;
        else youngerMale += 0.3;
      }
    }

    // Venus/Moon connection to 3rd
    if (venusFamilySibHouse === 3) youngerFemale += 1.5;
    if (moonFamSibHouse === 3) youngerFemale += 1.0;

    // House sign — weakest
    if (EVEN_SIGNS.includes(h3Rashi)) youngerFemale += 0.3;
    else if (h3Rashi) youngerMale += 0.3;

    // ── Combine: hasBros/hasSis from EITHER elder or younger ──────
    const elderIsFemale = elderFemale > elderMale;
    const elderIsMale = elderMale > elderFemale;
    const youngerIsFemale = youngerFemale > youngerMale;
    const youngerIsMale = youngerMale > youngerFemale;

    // Define thresholds early — needed for both gender flags and count conversion
    const youngerThreshold = h3SiblingPlanets.length > 0 ? 0.3 : 0.5;
    const elderThreshold = h11SiblingPlanets.length > 0 ? 0.3 : 0.5;

    // Set flags based on whether any sibling group leans female/male
    // IMPORTANT: Use the actual count thresholds, not a lower value.
    // Gender flags should only be set when the count is ≥ 1.
    const hasElderSibs = elderScore >= elderThreshold;
    const hasYoungerSibs = youngerScore >= youngerThreshold;
    hasSis = (hasElderSibs && elderIsFemale) || (hasYoungerSibs && youngerIsFemale);
    hasBros = (hasElderSibs && elderIsMale) || (hasYoungerSibs && youngerIsMale);
    // Close calls = mixed gender — but only when scores are truly ambiguous.
    // Use relative threshold: if the difference is < 15% of the higher score, it's mixed.
    // This prevents minor factors from overriding the lord's dominant gender signal.
    const elderMaxG = Math.max(elderFemale, elderMale, 0.1);
    const youngerMaxG = Math.max(youngerFemale, youngerMale, 0.1);
    if (hasElderSibs && Math.abs(elderFemale - elderMale) / elderMaxG < 0.15) { hasSis = true; hasBros = true; }
    if (hasYoungerSibs && Math.abs(youngerFemale - youngerMale) / youngerMaxG < 0.15) { hasSis = true; hasBros = true; }

    if (elderScore < 0.3 && hasYoungerSibs) {
      // Boost elder if 11th house has sibling-relevant planets or lord is well-placed
      if (h11SiblingPlanets.length > 0 || (!lord11InDusthan && lord11FamilyHouse)) {
        elderScore += 0.2;
      }
    }

    // Ensure scores don't go below 0
    youngerScore = Math.max(0, youngerScore);
    elderScore = Math.max(0, elderScore);

    // ── Score-to-count conversion ──────────────────────────────────
    // Key insight: each sibling planet in a house adds ~1.2-1.6 to the score.
    // So 1 planet → score ~1.5-2.5, 2 planets → score ~3.0-4.0.
    // For empty houses, the max score from lord+aspects+SAV is ~1.0-1.5.
    // "Multiple siblings from empty house" requires fertile sign + high SAV confirmation.
    // Rahu in house (sole occupant) corrupts the fertile potential — no "2" multiplier.
    function scoreToCount(score, threshold, sibPlanets, signFertile, sav, lordIsMars, rahuSole, marsAspects, rahuPresent) {
      if (score < threshold) return '0';
      // Multiple planets in house = direct evidence of multiple siblings
      if (sibPlanets.length >= 3) return '3+';
      if (sibPlanets.length >= 2 && score >= 2.5) return '2+';
      if (sibPlanets.length >= 2) return '2';
      // Single planet + very high score: lord, karaka, sign, aspects all converge
      // Score ≥ 2.8 from 1 planet means exceptional multi-factor support
      // Rahu inflates scores without creating siblings — skip when Rahu is present
      if (sibPlanets.length >= 1 && !rahuPresent && score >= 2.8) return '2';
      // Single planet + fertile sign + high SAV → strong evidence for 2
      const fertileHighSAV = signFertile > 0 && sav >= 30 && !rahuSole;
      if (sibPlanets.length >= 1 && fertileHighSAV && score >= 1.5) return '2';
      // Single planet + fertile sign + Mars karaka aspect → karaka confirms siblings
      // Mars aspect on a fertile house with a planet = very productive for siblings
      if (sibPlanets.length >= 1 && signFertile > 0 && marsAspects && score >= 1.5) return '2';
      // Empty house: fertile sign + high SAV can indicate "2" (very strict)
      if (sibPlanets.length === 0 && fertileHighSAV && score >= 1.2) return '2';
      // Empty house: Mars as lord + fertile sign = double sibling signification
      // Mars is the NATURAL sibling karaka, so Mars-ruled fertile house is very productive.
      // SAV need not be very high — the lord+sign combo is sufficient.
      // But NOT when Rahu corrupts the house.
      if (sibPlanets.length === 0 && lordIsMars && signFertile > 0 && !rahuSole && score >= 0.7) return '2';
      return '1';
    }

    // Get SAV values for count estimation
    const h3RashiForCount = houses[2]?.rashi;
    const h11RashiForCount = houses[10]?.rashi;
    const h3SAVForCount = h3RashiForCount ? (ashtakavarga?.sarvashtakavarga?.[h3RashiForCount] || 0) : 0;
    const h11SAVForCount = h11RashiForCount ? (ashtakavarga?.sarvashtakavarga?.[h11RashiForCount] || 0) : 0;

    // Rahu presence flags
    const h3RahuSole = h3pl.includes('Rahu') && h3SiblingPlanets.length === 0;
    const h11RahuSole = h11pl.includes('Rahu') && h11SiblingPlanets.length === 0;
    const h3RahuPresent = h3pl.includes('Rahu');
    const h11RahuPresent = h11pl.includes('Rahu');
    // Mars aspect flags — Mars karaka aspecting the sibling house strengthens count
    const h3MarsAsp = h3Asp.includes('Mars');
    const h11MarsAsp = h11Aspects.some(a => a.planet === 'Mars');

    const youngerCount = scoreToCount(youngerScore, youngerThreshold, h3SiblingPlanets, h3SignFertile, h3SAVForCount, lord3Family === 'Mars', h3RahuSole, h3MarsAsp, h3RahuPresent);
    // Saturn in 11th caps elder siblings at max "1" (Saturn delays/reduces)
    const elderCount   = saturnIn11
      ? (elderScore >= elderThreshold ? '1' : '0')
      : scoreToCount(elderScore, elderThreshold, h11SiblingPlanets, h11SignFertile, h11SAVForCount, lord11Family === 'Mars', h11RahuSole, h11MarsAsp, h11RahuPresent);

    let genderNote = '';
    if (hasSis && !hasBros)      genderNote = 'Sisters indicated (Venus/Moon karaka prominent)';
    else if (hasBros && !hasSis) genderNote = 'Brothers indicated (Mars karaka prominent)';
    else if (hasSis && hasBros)  genderNote = 'Mix of brothers and sisters';
    else                         genderNote = 'Gender not strongly indicated';

    const totalScore = youngerScore + elderScore;
    // Count label should reflect the actual elder+younger breakdown, not raw score
    // Parse count strings: '0', '1', '2', '2+', '3+' → numeric
    function parseCount(c) {
      if (c === '3+') return 3;
      if (c === '2+') return 2;
      return parseInt(c) || 0;
    }
    const actualCount = parseCount(elderCount) + parseCount(youngerCount);
    const countLabel = actualCount >= 3 ? '3 or more' : actualCount >= 1 ? String(actualCount) : '0 or 1';

    return {
      count: countLabel,
      estimatedElderSiblings: elderCount,
      estimatedYoungerSiblings: youngerCount,
      hasSisters: hasSis,
      hasBrothers: hasBros,
      score: +totalScore.toFixed(1),
    };
  })();

  // Sibling character — AI interprets from planet placements
  const SIBLING_CHARACTER_BY_PLANET = {};

  const siblingCharacters = (() => {
    const h3pl = h3Family?.planetsInHouse || [];
    return h3pl.filter(p => ['Mars','Venus','Mercury','Jupiter','Saturn','Sun','Moon','Rahu','Ketu'].includes(p));
  })();

  // Sibling event timing
  const siblingEventPeriods = dasaPeriods
    .filter(d => d.lord === lord3Family || d.lord === 'Mars')
    .map(d => ({
      lord: d.lord,
      period: `${d.start} to ${d.endDate}`,
    }));

  const siblings = {
    title: 'Siblings (Sahodarayō / සහෝදරයෝ)',
    sinhala: 'සොහොයුරු / සොහොයුරියන් ස්වභාවය, සෞඛ්‍යය සහ ජීවිත ගමන',
    h3Analysis: { strength: h3Family?.strength, planetsIn3rd: h3Family?.planetsInHouse || [], aspectsOn3rd: h3Family?.aspectingPlanets || [] },
    h3Lord: { name: lord3Family, house: lord3FamilyHouse },
    // 11th house = elder siblings (BPHS) — raw data for AI interpretation
    h11Analysis: { strength: h11Family?.strength, planetsIn11th: h11pl, aspectsOn11th: h11Aspects },
    h11Lord: { name: lord11Family, house: lord11FamilyHouse },
    marsPosition: { house: marsFamilyHouse, rashi: planets.mars?.rashi, rashiEnglish: planets.mars?.rashiEnglish },
    marsStrength: {
      dignity: planetStrengths.mars?.dignityLevel || 'Neutral',
      shadbala: advancedShadbala?.mars?.percentage || null,
      navamshaRashi: navamsha?.planets?.mars?.navamshaRashi || null,
    },
    bhratrkaraka: bhratrkaraka ? { planet: bhratrkaraka.planet, rashi: bhratrkaraka.rashi } : null,
    d3SiblingChart: d3Lagna ? {
      d3Lagna,
      d3Mars: extendedVargas?.D3?.positions?.mars?.vargaRashi || null,
      d3Venus: extendedVargas?.D3?.positions?.venus?.vargaRashi || null,
      d3Lord3: extendedVargas?.D3?.positions?.[lord3Family?.toLowerCase()]?.vargaRashi || null,
    } : null,
    // ── Ashtakavarga bindus for sibling houses (advanced improvement) ──
    // SAV bindus: high (>28) = thriving siblings, low (<22) = weak sibling prospects
    // Mars BAV bindus in 3rd/11th: Mars's specific contribution to sibling houses
    ashtakavargaSiblings: ashtakavarga?.sarvashtakavarga ? (() => {
      const h3RashiName = houses[2]?.rashi;
      const h11RashiName = houses[10]?.rashi;
      const h3SAV = h3RashiName ? (ashtakavarga.sarvashtakavarga[h3RashiName] || 0) : 0;
      const h11SAV = h11RashiName ? (ashtakavarga.sarvashtakavarga[h11RashiName] || 0) : 0;
      const marsBAV3 = h3RashiName && ashtakavarga.prastarashtakavarga?.Mars
        ? (ashtakavarga.prastarashtakavarga.Mars[(houses[2]?.rashiId || 1) - 1] || 0) : null;
      const marsBAV11 = h11RashiName && ashtakavarga.prastarashtakavarga?.Mars
        ? (ashtakavarga.prastarashtakavarga.Mars[(houses[10]?.rashiId || 1) - 1] || 0) : null;
      return {
        h3SAVBindus: h3SAV,
        h3Quality: h3SAV >= 30 ? 'strong' : h3SAV >= 25 ? 'average' : 'weak',
        h11SAVBindus: h11SAV,
        h11Quality: h11SAV >= 30 ? 'strong' : h11SAV >= 25 ? 'average' : 'weak',
        marsBAVin3rd: marsBAV3,
        marsBAVin11th: marsBAV11,
      };
    })() : null,
    estimatedCount: siblingEstimate,
    planetsIn3rd: siblingCharacters,
    lord3InDusthan,
    lord11InDusthan,
    maleficsIn3rd: maleficsIn3,
    beneficsIn3rd: beneficsIn3,
    eventPeriods: siblingEventPeriods,
  };

  // ── COMPLETE FAMILY PORTRAIT ────────────────────────────────────
  const familyPortrait = {
    title: 'Deep Family Portrait',
    sinhala: 'ගැඹුරු පවුල් ජ්‍යෝතිෂ විශ්ලේෂණය',
    mother,
    father,
    siblings,
    // Family karma — technical data
    familyKarmaFactors: {
      jupiterInParentalAxis: jupiterHouse && [4, 9, 12].includes(jupiterHouse),
      jupiterHouse,
      hasPitruDosha: advancedDoshas?.some(d => d.name.toLowerCase().includes('pitru')) || false,
      h4Strength: h4Family?.strength,
      h9Strength: h9Family?.strength,
      lord4InDusthan: lord4InDusthanFamily,
      lord9InDusthan,
    },
    // Inherited traits — technical data
    inheritedTraitFactors: {
      sunSign: planets.sun?.rashi,
      moonSign: planets.moon?.rashi,
      planetsIn3rd: h3Family?.planetsInHouse || [],
    },
    // ══════════════════════════════════════════════════════════════
    // PARENT HEALTH PREDICTIONS — Comprehensive danger period analysis
    // ══════════════════════════════════════════════════════════════
    parentHealthPredictions: (() => {
      try {
        const moonScore = advancedShadbala?.moon?.percentage || 50;
        const lord4Score = planetStrengths[lord4Family?.toLowerCase()]?.shadbalaPercent || 50;
        const moonDignity = planetStrengths['moon']?.dignityLevel;
        const lord4Dignity = planetStrengths[lord4Family?.toLowerCase()]?.dignityLevel;

        // Mother disease indicators — technical
        const motherDiseaseFactors = {
          weakMoon: moonScore < 40,
          moonDebilitated: moonDignity === 'Debilitated',
          maleficsIn4th: maleficsIn4,
          lord4InDusthana: lord4InDusthanFamily,
          lord4House: lord4FamilyHouse,
        };

        // Mother danger dashas — technical
        const motherDangerDashas = lifespanFilter(dasaPeriods.filter(d => {
          const isDasha4thLord = d.lord === lord4Family;
          const isDashaMoon = d.lord === 'Moon';
          const isDashaSaturn = d.lord === 'Saturn' && (saturnHouse === 4 || maleficsIn4.includes('Saturn'));
          const is8thFrom4th = d.lord === getHouseLord(11);
          const isMarak = d.lord === getHouseLord(7);
          return isDasha4thLord || isDashaMoon || isDashaSaturn || (lord4InDusthanFamily && (is8thFrom4th || isMarak));
        })).map(d => {
          let dangerLevel = 'Moderate';
          if ((d.lord === lord4Family && lord4InDusthanFamily) || (d.lord === 'Moon' && moonScore < 45) || (d.lord === 'Saturn' && maleficsIn4.includes('Saturn'))) dangerLevel = 'High';
          else if (d.lord !== lord4Family && d.lord !== 'Moon' && d.lord !== 'Saturn') dangerLevel = 'Watch';
          return {
            period: `${d.start} to ${d.endDate}`,
            dashaLord: d.lord,
            dangerLevel,
            ageAtTime: d.startAge ? `Age ${Math.round(d.startAge)} to ${Math.round(d.startAge + (d.years || 0))}` : null
          };
        }).slice(0, 5);

        const motherHealthScore = (moonScore + lord4Score) / 2;

        // Father analysis — technical
        const sunScore = advancedShadbala?.sun?.percentage || 50;
        const lord9Score = planetStrengths[lord9Family?.toLowerCase()]?.shadbalaPercent || 50;
        const sunDignity = planetStrengths['sun']?.dignityLevel;

        const fatherDiseaseFactors = {
          weakSun: sunScore < 40,
          sunDebilitated: sunDignity === 'Debilitated',
          maleficsIn9th: maleficsIn9,
          lord9InDusthana: lord9InDusthan,
          lord9House: lord9FamilyHouse,
        };

        const fatherDangerDashas = lifespanFilter(dasaPeriods.filter(d => {
          const isDasha9thLord = d.lord === lord9Family;
          const isDashaSun = d.lord === 'Sun';
          const isDashaSaturn = d.lord === 'Saturn' && (saturnHouse === 9 || maleficsIn9.includes('Saturn'));
          const is8thFrom9th = d.lord === getHouseLord(4);
          const isMarak = d.lord === getHouseLord(3);
          return isDasha9thLord || isDashaSun || isDashaSaturn || (lord9InDusthan && (is8thFrom9th || isMarak));
        })).map(d => {
          let dangerLevel = 'Moderate';
          if ((d.lord === lord9Family && lord9InDusthan) || (d.lord === 'Sun' && sunScore < 45) || (d.lord === 'Saturn' && maleficsIn9.includes('Saturn'))) dangerLevel = 'High';
          else if (d.lord !== lord9Family && d.lord !== 'Sun' && d.lord !== 'Saturn') dangerLevel = 'Watch';
          return {
            period: `${d.start} to ${d.endDate}`,
            dashaLord: d.lord,
            dangerLevel,
            ageAtTime: d.startAge ? `Age ${Math.round(d.startAge)} to ${Math.round(d.startAge + (d.years || 0))}` : null
          };
        }).slice(0, 5);

        const fatherHealthScore = (sunScore + lord9Score) / 2;

        return {
          mother: {
            overallHealthScore: Math.round(motherHealthScore),
            diseaseFactors: motherDiseaseFactors,
            criticalPeriods: motherDangerDashas,
            moonScore: Math.round(moonScore),
            moonDignity,
            lord4Score: Math.round(lord4Score),
            lord4House: lord4FamilyHouse,
          },
          father: {
            overallHealthScore: Math.round(fatherHealthScore),
            diseaseFactors: fatherDiseaseFactors,
            criticalPeriods: fatherDangerDashas,
            sunScore: Math.round(sunScore),
            sunDignity,
            lord9Score: Math.round(lord9Score),
            lord9House: lord9FamilyHouse,
          },
          protectiveFactors: {
            jupiterIn4th: jupiterHouse === 4,
            jupiterIn9th: jupiterHouse === 9,
            strongMoon: moonScore >= 60,
            strongSun: sunScore >= 60,
            lord4WellPlaced: !lord4InDusthanFamily,
            lord9WellPlaced: !lord9InDusthan,
          },
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

  const foreignIndicatorFactors = {
    rahuHouse,
    rahuInForeignHouse: rahuHouse && [1, 4, 7, 9, 10, 12].includes(rahuHouse),
    ketuHouse,
    ketuInForeignHouse: ketuHouse && [4, 9, 12].includes(ketuHouse),
    lord12House,
    lord12InForeignHouse: lord12House && [1, 9, 10].includes(lord12House),
    lord9HouseNum,
    lord9In12th: lord9HouseNum === 12,
    saturnHouse,
    saturnInForeignHouse: saturnHouse && [9, 12].includes(saturnHouse),
    moonInForeignHouse: [9, 12].includes(moonHouse),
  };

  // Foreign travel dashas
  const foreignDasas = lifespanFilter(dasaPeriods.filter(d => d.lord === 'Rahu' || d.lord === lord12Name || d.lord === lord9Name)).map(d => ({
    lord: d.lord,
    period: `${d.start} to ${d.endDate}`,
  }));

  // Country direction mapping — technical: sign → direction
  const DIRECTION_BY_SIGN = {
    'Mesha': 'East', 'Vrishabha': 'South', 'Mithuna': 'West', 'Kataka': 'North',
    'Simha': 'East', 'Kanya': 'South', 'Tula': 'West', 'Vrischika': 'North',
    'Dhanus': 'East', 'Makara': 'South', 'Kumbha': 'West', 'Meena': 'North',
  };

  const h12Rashi = houses[11]?.rashi || '';
  const h9Rashi = houses[8]?.rashi || '';

  const foreignTravel = {
    title: 'Foreign Travel & Living Abroad',
    sinhala: 'විදේශ ගමන් සහ විදේශගත ජීවිතය',
    ninthHouse: h9,
    twelfthHouse: h12Analysis,
    foreignIndicatorFactors,
    foreignIndicatorCount: Object.values(foreignIndicatorFactors).filter(v => v === true).length,
    travelPeriods: foreignDasas,
    h12Direction: DIRECTION_BY_SIGN[h12Rashi] || null,
    h9Direction: DIRECTION_BY_SIGN[h9Rashi] || null,
    jupiterIn9or12: [9, 12].includes(jupiterHouse),
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
      };
    })() : null,
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 16: LEGAL, ENEMIES & PROTECTION
  // ══════════════════════════════════════════════════════════════
  const h6ForLegal = analyzeHouse(6, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const h8ForLegal = analyzeHouse(8, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);
  const h12ForLegal = analyzeHouse(12, houses, planets, drishtis, lagnaName, ashtakavarga, bhavaChalit);

  const legalIndicators = {
    maleficsIn6th: h6ForLegal?.maleficsIn || [],
    maleficsIn8th: h8ForLegal?.maleficsIn || [],
    maleficsIn12th: h12ForLegal?.maleficsIn || [],
    marsIn6th: marsHouse === 6,
    saturnIn6th: saturnHouse === 6,
    rahuIn6th: rahuHouse === 6,
  };

  const legal = {
    title: 'Legal, Enemies & Protection',
    sinhala: 'නීතිමය, සතුරු හා ආරක්ෂාව',
    sixthHouse: h6ForLegal,
    eighthHouse: h8ForLegal,
    twelfthHouse: h12ForLegal,
    sixthLord: { name: lord6Name, house: getPlanetHouse(lord6Name) },
    legalIndicators,
    lord6House: getPlanetHouse(lord6Name),
    lord6InDusthana: getPlanetHouse(lord6Name) && isInDusthana(getPlanetHouse(lord6Name)),
    lord6InKendra: getPlanetHouse(lord6Name) && isInKendra(getPlanetHouse(lord6Name)),
    legalCasePeriods: lifespanFilter(dasaPeriods.filter(d => d.lord === lord6Name || d.lord === 'Mars' || d.lord === 'Saturn')).map(d => ({
      lord: d.lord, period: `${d.start} to ${d.endDate}`,
    })),
    dangerPlanetPositions: {
      marsHouse, marsInDangerHouse: marsHouse && [1, 7, 8].includes(marsHouse),
      rahuHouse, rahuInDangerHouse: rahuHouse && [1, 7, 8].includes(rahuHouse),
      saturnHouse, saturnInDangerHouse: saturnHouse && [1, 7, 8].includes(saturnHouse),
      ketuHouse, ketuInDangerHouse: ketuHouse && [1, 6, 8].includes(ketuHouse),
    },
    // ── Nadi Astrology Legal/Litigation Analysis (Sub-Lord methodology) ──
    nadiLitigation: nadiPredictions?.events?.litigation ? (() => {
      const lt = nadiPredictions.events.litigation;
      return {
        verdict: lt.verdict,
        strength: lt.strength,
        bestDashaPlanets: lt.bestDashaPlanets,
        strongPlanets: lt.strongPlanets?.map(p => p.name),
        averageScore: lt.averageScore,
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
  if (jupiterHouse && (isInKendra(jupiterHouse) || isInTrikona(jupiterHouse))) luckIndicators.push({ type: 'jupiterStrong', house: jupiterHouse });
  if (h9ForLuck?.strength === 'strong' || h9ForLuck?.strength === 'very strong') luckIndicators.push({ type: 'h9Strong', strength: h9ForLuck?.strength });
  const luckFactors = {
    jupiterInKendraTrikona: jupiterHouse && (isInKendra(jupiterHouse) || isInTrikona(jupiterHouse)),
    h9Strength: h9ForLuck?.strength,
    h5HasBenefics: h5ForLuck?.planetsInHouse?.some(p => ['Jupiter', 'Venus'].includes(p)) || false,
    h11Strength: h11ForLuck?.strength,
    rahuIn11: rahuHouse === 11,
    rahuIn5: rahuHouse === 5,
  };

  const luck = {
    title: 'Luck & Unexpected Fortunes',
    sinhala: 'වාසනාව සහ අනපේක්ෂිත වාසි',
    ninthHouse: h9ForLuck,
    eleventhHouse: h11ForLuck,
    fifthHouse: h5ForLuck,
    luckFactors,
    h8Planets: h8Health?.planetsInHouse || [],
    h8Strength: h8Health?.strength,
    lord8Name,
    luckyPeriods: lifespanFilter(dasaPeriods.filter(d => d.lord === lord9Name || d.lord === 'Jupiter' || d.lord === lord11Name)).map(d => ({
      lord: d.lord, period: `${d.start} to ${d.endDate}`,
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
  if (ketuHouseNum && [1, 5, 9, 12].includes(ketuHouseNum)) spiritualIndicators.push({ type: 'ketuSpiritualHouse', house: ketuHouseNum });
  if (jupiterHouse && [1, 5, 9, 12].includes(jupiterHouse)) spiritualIndicators.push({ type: 'jupiterSpiritualHouse', house: jupiterHouse });
  if (saturnHouse && [9, 12].includes(saturnHouse)) spiritualIndicators.push({ type: 'saturnSpiritualHouse', house: saturnHouse });
  if (moonHouse && [4, 8, 12].includes(moonHouse)) spiritualIndicators.push({ type: 'moonIntrospectiveHouse', house: moonHouse });

  const spiritual = {
    title: 'Spiritual Journey & Past Karma',
    sinhala: 'ආධ්‍යාත්මික ගමන සහ කර්ම',
    ninthHouse: h9ForSpiritual,
    twelfthHouse: h12ForSpiritual,
    ketuPosition: { house: ketuHouseNum },
    jupiterPosition: { house: jupiterHouse },
    spiritualIndicatorCount: spiritualIndicators.length,
    ketuInSpiritualHouse: ketuHouseNum && [1, 5, 9, 12].includes(ketuHouseNum),
    jupiterInSpiritualHouse: jupiterHouse && [1, 5, 9, 12].includes(jupiterHouse),
    saturnInSpiritualHouse: saturnHouse && [9, 12].includes(saturnHouse),
    moonInIntrospectiveHouse: moonHouse && [4, 8, 12].includes(moonHouse),
    moonElement,
    // ── Nadi Astrology Spiritual Analysis (Sub-Lord methodology) ──
    nadiSpiritual: nadiPredictions?.events?.spiritual ? (() => {
      const sp = nadiPredictions.events.spiritual;
      return {
        verdict: sp.verdict,
        strength: sp.strength,
        bestDashaPlanets: sp.bestDashaPlanets,
        strongPlanets: sp.strongPlanets?.map(p => p.name),
        averageScore: sp.averageScore,
      };
    })() : null,
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 20: SURPRISE PHYSICAL & PERSONALITY INSIGHTS
  // ══════════════════════════════════════════════════════════════
  // Architecture: APPEARANCE_BY_LAGNA removed — AI interprets physical traits from lagna sign + element.
  const APPEARANCE_BY_LAGNA = {};

  // Architecture: SLEEP_PATTERNS removed — AI interprets from Moon element.
  const SLEEP_PATTERNS = {};

  // Architecture: FOOD_PREFERENCES removed — AI interprets from lagna element.
  const FOOD_PREFERENCES = {};

  const surpriseInsights = {
    title: 'Surprise Insights About You',
    sinhala: 'ඔයා ගැන පුදුම දේවල්',
    // Architecture: AI interprets appearance from lagna sign/element data
    lagnaSign: lagnaName,
    lagnaElement: lagnaElement,
    bodyMarks: (() => {
      // Architecture: Return technical planet-house data only. AI interprets body areas.
      const marks = [];
      if (marsHouse) marks.push({ planet: 'Mars', house: marsHouse, type: 'scar' });
      if (ketuHouseNum) marks.push({ planet: 'Ketu', house: ketuHouseNum, type: 'birthmark' });
      if (rahuHouse) marks.push({ planet: 'Rahu', house: rahuHouse, type: 'unusual_mark' });
      if (saturnHouse) marks.push({ planet: 'Saturn', house: saturnHouse, type: 'dark_mark' });
      // D3 Drekkana data
      if (lagna?.degree != null) {
        const lagnaDeg = lagna.degree % 30;
        const drekkana = lagnaDeg < 10 ? 1 : lagnaDeg < 20 ? 2 : 3;
        marks.push({ type: 'drekkana', drekkana, lagnaDegree: lagnaDeg });
      }
      if (extendedVargas?.D3?.positions) {
        const maleficD3 = ['mars', 'saturn', 'rahu', 'ketu'];
        for (const mName of maleficD3) {
          const d3Pos = extendedVargas.D3.positions[mName];
          if (d3Pos?.vargaRashiId) {
            marks.push({ type: 'd3_malefic', planet: mName, d3RashiId: d3Pos.vargaRashiId, d3Rashi: RASHIS[d3Pos.vargaRashiId - 1]?.english || '' });
          }
        }
      }
      return marks;
    })(),
    // Architecture: numberOfSiblings now returns technical data, AI interprets
    numberOfSiblings: (() => {
      const fpSib = familyPortrait?.siblings?.estimatedCount;
      if (fpSib && fpSib.count != null) {
        return { count: fpSib.count, elder: fpSib.estimatedElderSiblings || '0', younger: fpSib.estimatedYoungerSiblings || '0', gender: fpSib.gender || 'siblings', source: 'familyPortrait' };
      }
      // Fallback: simplified calculation returning technical data
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
      const h11SibPlanets = (h11?.planetsInHouse || []).filter(p => !['Sun', 'Saturn', 'Moon'].includes(p));
      siblingScore += h11SibPlanets.length * 0.8;
      if (h11SibPlanets.includes('Venus')) hasSisters = true;
      if (h11SibPlanets.includes('Mars')) hasBrothers = true;
      return { siblingScore, hasBrothers, hasSisters, h3Planets, lord3Name, lord3House, source: 'fallback' };
    })(),
    // Architecture: fatherProfile returns technical data only, AI interprets
    fatherProfile: (() => {
      const sunH = getPlanetHouse('Sun');
      const lord9H = getPlanetHouse(lord9Name);
      const sunScore = getHealthScore('sun');
      const h9str = h9ForSpiritual?.strength || 'moderate';
      const sunInKendra = sunH && [1, 4, 7, 10].includes(sunH);
      const sunInDusthana = sunH && [6, 8, 12].includes(sunH);
      const lord9InGoodHouse = lord9H && [1, 4, 5, 7, 9, 10, 11].includes(lord9H);
      const sunDignity = planetStrengths.sun?.dignityLevel || '';
      const hasNeechabhanga = sunDignity === 'Debilitated' && (advancedYogas || []).some(y =>
        y.name && y.name.toLowerCase().includes('neechabhanga') && y.name.toLowerCase().includes('sun')
      );
      const lord9Score = getHealthScore(lord9Name.toLowerCase());
      return {
        sunHouse: sunH, sunScore, sunDignity, sunInKendra, sunInDusthana,
        lord9: lord9Name, lord9House: lord9H, lord9Score, lord9InGoodHouse,
        h9Strength: h9str, hasNeechabhanga,
      };
    })(),
    // Architecture: motherProfile returns technical data only, AI interprets
    motherProfile: (() => {
      const moonScore = getHealthScore('moon');
      const h4str = h4?.strength || 'moderate';
      const moonH = getPlanetHouse('Moon');
      const lord4H = getPlanetHouse(getHouseLord(4));
      const saturnH = getPlanetHouse('Saturn');
      const moonSaturnConjunct = moonH && saturnH && moonH === saturnH;
      const lord4InDusthana = lord4H && [6, 8, 12].includes(lord4H);
      let saturnAspects4th = false;
      if (!moonSaturnConjunct && saturnH) {
        const satTo4 = ((4 - saturnH + 12) % 12) + 1;
        saturnAspects4th = [3, 7, 10].includes(satTo4);
      }
      return {
        moonHouse: moonH, moonScore, moonInDusthana: moonH && [6, 8, 12].includes(moonH),
        lord4House: lord4H, lord4InDusthana, h4Strength: h4str,
        moonSaturnConjunct, saturnAspects4th,
      };
    })(),
    // Architecture: AI interprets sleep/food from element data
    moonElement,
    petAffinity: lagnaElement,
    handednessIndicator: lagnaName && ['Mithuna', 'Kanya', 'Kumbha'].includes(lagnaName),
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
        topLetters,
      };
    })(),
    // Architecture: hiddenTalent returns technical data only, AI interprets
    hiddenTalent: (() => {
      const h5planets = h5ForEdu?.planetsInHouse || [];
      const amkPlanet = jaiminiKarakas?.karakas?.Amatyakaraka?.planet;
      const amkDignity = amkPlanet ? (planetStrengths[amkPlanet.toLowerCase()]?.dignityLevel || '') : '';
      const strongPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']
        .map(p => ({ planet: p, score: advancedShadbala?.[p.toLowerCase()]?.percentage || planetStrengths[p.toLowerCase()]?.score || 50, dignity: planetStrengths[p.toLowerCase()]?.dignityLevel || 'Neutral' }))
        .filter(p => p.dignity === 'Exalted' || p.dignity === 'Moolatrikona' || p.score >= 75)
        .sort((a, b) => b.score - a.score);
      const karakamshaRashi = jaiminiKarakas?.karakamsha?.rashi;
      const lord5Name = getHouseLord(5);
      const lord5House = getPlanetHouse(lord5Name);
      return {
        fifthHousePlanets: h5planets,
        amatyakaraka: amkPlanet ? { planet: amkPlanet, dignity: amkDignity } : null,
        strongestPlanets: strongPlanets.slice(0, 3),
        karakamshaRashi,
        fifthLord: lord5Name,
        fifthLordHouse: lord5House,
      };
    })(),
    // ── NEW: Atmakaraka soul purpose from Jaimini ───────────────
    soulPurpose: jaiminiKarakas?.atmakaraka ? {
      planet: jaiminiKarakas.atmakaraka.planet,
      rashi: jaiminiKarakas.atmakaraka.rashi,
      karakamshaRashi: jaiminiKarakas.karakamsha?.rashi || null,
    } : null,
    // Architecture: planetaryRoasts — AI generates roasts from technical positions
    planetaryRoasts: (() => {
      const moonH = getPlanetHouse('Moon');
      const sunH = getPlanetHouse('Sun');
      const mercH = getPlanetHouse('Mercury');
      const venH = getPlanetHouse('Venus');
      const marsH = getPlanetHouse('Mars');
      const satH = getPlanetHouse('Saturn');
      const jupH = getPlanetHouse('Jupiter');
      const rahuH = getPlanetHouse('Rahu');
      const ketuH = getPlanetHouse('Ketu');
      const moonEl = ELEMENTS[(moonRashi?.id || 1) - 1];
      const retroPlanets = planets ? Object.values(planets).filter(p => p.isRetrograde).map(p => p.name) : [];
      const debilitatedPlanets = Object.entries(planetStrengths)
        .filter(([k, v]) => v.dignityLevel === 'Debilitated')
        .map(([k, v]) => v.name || k);
      return {
        lagnaSign: lagnaName, lagnaElement,
        moonElement: moonEl,
        planetHouses: { Sun: sunH, Moon: moonH, Mars: marsH, Mercury: mercH, Jupiter: jupH, Venus: venH, Saturn: satH, Rahu: rahuH, Ketu: ketuH },
        retroPlanets,
        debilitatedPlanets,
      };
    })(),
    // ── NEW: Love Language & Attachment Style ────────────────────
    loveLanguage: (() => {
      const venH = getPlanetHouse('Venus');
      const moonH = getPlanetHouse('Moon');
      const marsH = getPlanetHouse('Mars');
      const venScore = getHealthScore('venus');
      const moonScore = getHealthScore('moon');
      const saturnH = getPlanetHouse('Saturn');
      const moonSatConj = moonH && saturnH && moonH === saturnH;
      const moonInDusthana = moonH && [6, 8, 12].includes(moonH);
      const venusRetro = planets.venus?.isRetrograde;
      const rahuH = getPlanetHouse('Rahu');
      let jealousyScore = 0;
      if (marsH === 7 || marsH === 8) jealousyScore += 3;
      if (rahuH === 7) jealousyScore += 2;
      if (venusRetro) jealousyScore += 1;
      if (lagnaName === 'Vrischika') jealousyScore += 2;
      if (moonRashi?.name === 'Vrischika') jealousyScore += 2;
      // First love age from Venus dasha
      const firstLoveAge = (() => {
        const venusDasha = dasaPeriods.find(d => d.lord === 'Venus');
        if (venusDasha) {
          const startYear = parseInt(venusDasha.start?.substring(0, 4), 10);
          if (!isNaN(startYear)) {
            const age = startYear - date.getUTCFullYear();
            if (age >= 10 && age <= 25) return age;
          }
        }
        for (const d of dasaPeriods) {
          const ads = d.antardashas || [];
          for (const ad of ads) {
            if (ad.lord === 'Venus') {
              const adStart = parseInt((ad.start || '').substring(0, 4), 10);
              if (!isNaN(adStart)) {
                const adAge = adStart - date.getUTCFullYear();
                if (adAge >= 12 && adAge <= 25) return adAge;
              }
            }
          }
        }
        return null;
      })();
      return {
        venusHouse: venH, moonHouse: moonH, marsHouse: marsH,
        venusScore: venScore, moonScore: moonScore,
        saturnHouse: saturnH, rahuHouse: rahuH,
        moonSaturnConjunct: moonSatConj,
        moonInDusthana, venusRetrograde: venusRetro,
        jealousyScore,
        firstLoveAge, moonElement,
      };
    })(),
    // ── Morning/Night Owl + Social Battery — technical data ───
    dailyBehavior: (() => {
      const sunH = getPlanetHouse('Sun');
      const moonH = getPlanetHouse('Moon');
      const mercH = getPlanetHouse('Mercury');
      const marsH = getPlanetHouse('Mars');
      const satH = getPlanetHouse('Saturn');
      const rahuH = getPlanetHouse('Rahu');
      const morningPlanetsCount = [sunH, marsH, jupiterHouse].filter(h => h && [1, 10, 9, 11].includes(h)).length;
      const nightPlanetsCount = [moonH, satH, rahuH].filter(h => h && [4, 8, 12].includes(h)).length;
      const introvertScore = [satH, ketuHouseNum, moonH].filter(h => h && [4, 8, 12].includes(h)).length;
      const extrovertScore = [sunH, marsH, jupiterHouse, venusHouse].filter(h => h && [1, 3, 5, 7, 10, 11].includes(h)).length;
      const mercuryScore = getHealthScore('mercury');
      return {
        planetHouses: { Sun: sunH, Moon: moonH, Mercury: mercH, Mars: marsH, Saturn: satH, Rahu: rahuH },
        morningPlanetsCount, nightPlanetsCount,
        introvertScore, extrovertScore,
        mercuryScore, lagnaElement,
      };
    })(),
    // ── Anger Style & Crying Trigger — technical data ─────────
    emotionalStyle: (() => {
      const marsH = getPlanetHouse('Mars');
      const moonH = getPlanetHouse('Moon');
      const marsScore = getHealthScore('mars');
      const marsRetro = planets.mars?.isRetrograde;
      return { marsHouse: marsH, moonHouse: moonH, marsScore, marsRetrograde: marsRetro };
    })(),
    // ── Lucky Numbers, Colors, Day — technical data ───────────
    luckyProfile: (() => {
      const lagnaLord = lagna.rashi.lord;
      const nakshatraLord = moonNakshatra.lord;
      const strongestPlanet = Object.entries(planetStrengths).sort((a, b) => (b[1].score || 0) - (a[1].score || 0))[0];
      const luckyPlanet = strongestPlanet ? strongestPlanet[1].name || strongestPlanet[0] : lagnaLord;
      return {
        lagnaLord, nakshatraLord, strongestPlanet: luckyPlanet, lagnaElement,
      };
    })(),
    // ── Social Mask vs. Private Self — technical data ──────────
    publicVsPrivate: (() => {
      const h1Planets = houses[0]?.planets?.filter(p => p.name !== 'Lagna' && p.name !== 'Ascendant').map(p => p.name) || [];
      const moonH = getPlanetHouse('Moon');
      const lagnaEl = lagnaElement;
      const moonEl = ELEMENTS[(moonRashi?.id || 1) - 1];
      const sameSign = lagnaName === moonRashi.name;
      const isOppositeElement = (lagnaEl === 'fire' && moonEl === 'water') || (lagnaEl === 'water' && moonEl === 'fire') ||
        (lagnaEl === 'earth' && moonEl === 'air') || (lagnaEl === 'air' && moonEl === 'earth');
      const ketuH = ketuHouseNum;
      const h12Planets = houses[11]?.planets?.filter(p => p.name !== 'Lagna').map(p => p.name) || [];
      return {
        lagnaSign: lagnaName, lagnaElement: lagnaEl,
        moonSign: moonRashi.name, moonElement: moonEl, moonHouse: moonH,
        h1Planets, h12Planets, ketuHouse: ketuH,
        sameSign, isOppositeElement,
      };
    })(),
    // ── Money Personality — technical data ─────────────────────
    moneyPersonality: (() => {
      const h2Planets = houses[1]?.planets?.filter(p => p.name !== 'Lagna').map(p => p.name) || [];
      const venH = getPlanetHouse('Venus');
      const satH = getPlanetHouse('Saturn');
      const rahuH = getPlanetHouse('Rahu');
      const jupH = getPlanetHouse('Jupiter');
      const impulseScore = (rahuH === 2 ? 3 : 0) + (h2Planets.includes('Mars') ? 2 : 0) + (venH && [1, 2, 5, 11].includes(venH) ? 1 : 0) + (lagnaElement === 'fire' ? 1 : 0);
      return { h2Planets, venusHouse: venH, saturnHouse: satH, rahuHouse: rahuH, jupiterHouse: jupH, impulseScore, lagnaElement };
    })(),
    // ── Age-Specific Life Shift Moments — technical data ──────
    lifeShiftMoments: (() => {
      const shifts = [];
      const birthYear = date.getUTCFullYear();
      for (let i = 0; i < dasaPeriods.length - 1; i++) {
        const d = dasaPeriods[i];
        const nextD = dasaPeriods[i + 1];
        const transitionYear = parseInt((d.endDate || '').substring(0, 4), 10);
        if (isNaN(transitionYear)) continue;
        const transitionAge = transitionYear - birthYear;
        if (transitionAge < 0 || transitionAge > 80) continue;
        shifts.push({
          age: transitionAge, year: transitionYear,
          from: d.lord, to: nextD.lord,
        });
      }
      return shifts.slice(0, 8);
    })(),
    // ── Addiction Vulnerability — technical data ───────────────
    addictionProfile: (() => {
      const rahuH = getPlanetHouse('Rahu');
      const venH = getPlanetHouse('Venus');
      const moonH = getPlanetHouse('Moon');
      const marsH = getPlanetHouse('Mars');
      return { rahuHouse: rahuH, venusHouse: venH, moonHouse: moonH, marsHouse: marsH, lagnaElement, moonElement };
    })(),
    // ── Compatibility Quick-Cards — technical data ────────────
    compatibilityCards: (() => {
      return {
        h11Sign: houses[10]?.rashiEnglish || 'N/A',
        h6Sign: houses[5]?.rashiEnglish || 'N/A',
        h10Sign: houses[9]?.rashiEnglish || 'N/A',
        h7Sign: houses[6]?.rashiEnglish || 'N/A',
        h5Sign: houses[4]?.rashiEnglish || 'N/A',
      };
    })(),
    // ── Second Marriage & Divorce Probability — technical data ─
    secondMarriage: (() => {
      const h2Planets = houses[1]?.planets?.filter(p => p.name !== 'Lagna').map(p => p.name) || [];
      const h7Planets = houses[6]?.planets?.filter(p => p.name !== 'Lagna').map(p => p.name) || [];
      const lord7Name = getHouseLord(7);
      const lord7House = getPlanetHouse(lord7Name);
      const venH = getPlanetHouse('Venus');
      const marsH = getPlanetHouse('Mars');
      const rahuH = getPlanetHouse('Rahu');
      const satH = getPlanetHouse('Saturn');
      const h7Rashi = houses[6]?.rashi || '';
      const isDualSign = ['Mithuna', 'Dhanus', 'Meena', 'Kanya'].includes(h7Rashi);
      let score = 0;
      if (isDualSign) score += 3;
      if (h7Planets.includes('Rahu')) score += 3;
      if (h7Planets.includes('Mars')) score += 2;
      if (planets.venus && ['Mithuna', 'Dhanus', 'Meena', 'Kanya'].includes(planets.venus.rashi)) score += 2;
      if (venH && rahuH && venH === rahuH) score += 2;
      if (lord7House && [6, 8, 12].includes(lord7House)) score += 2;
      if (h7Planets.includes('Saturn')) score += 1;
      if (h7Planets.length >= 2) score += 1;
      const h2HasMalefics = h2Planets.some(p => ['Mars', 'Saturn', 'Rahu', 'Ketu'].includes(p));
      if (h2HasMalefics) score += 1;
      let divorceScore = 0;
      if (marsH === 7 || marsH === 1 || marsH === 8) divorceScore += 2;
      if (h7Planets.includes('Rahu') || h7Planets.includes('Ketu')) divorceScore += 2;
      if (lord7House && [6, 8, 12].includes(lord7House)) divorceScore += 2;
      if (satH === 7 && marsH && [1, 4, 7, 8, 12].includes(marsH)) divorceScore += 1;
      if (planets.venus?.isRetrograde) divorceScore += 1;
      return {
        score, divorceScore, isDualSign,
        h7Rashi: houses[6]?.rashiEnglish || 'N/A',
        h7Planets, h2Planets, lord7House,
        venusRahuConjunct: venH && rahuH && venH === rahuH,
        venusRetrograde: planets.venus?.isRetrograde || false,
      };
    })(),
    // ── Monastic / Renunciation Tendency — technical data ──────
    monasticTendency: (() => {
      const ketuH = ketuHouseNum;
      const satH = getPlanetHouse('Saturn');
      const jupH = getPlanetHouse('Jupiter');
      const moonH = getPlanetHouse('Moon');
      const rahuH = getPlanetHouse('Rahu');
      let score = 0;
      if (ketuH === 12) score += 4;
      if (ketuH === 1) score += 3;
      if (ketuH === 9) score += 3;
      if (satH === 12) score += 3;
      if (satH === 1) score += 2;
      if (moonH === 12) score += 2;
      if (moonH === 8) score += 1;
      if (jupH === 12) score += 2;
      const h12Planets = houses[11]?.planets?.filter(p => p.name !== 'Lagna').map(p => p.name) || [];
      if (h12Planets.length >= 3) score += 3;
      if ((rahuH === 6 && ketuH === 12) || (rahuH === 12 && ketuH === 6)) score += 2;
      const h7Empty = (houses[6]?.planets?.filter(p => p.name !== 'Lagna') || []).length === 0;
      if (h7Empty && h12Planets.length >= 1) score += 1;
      if (planets.venus?.rashiId === 6) score += 1;
      if (planets.venus?.isCombust) score += 1;
      const monasticAge = (() => {
        const triggerDasha = dasaPeriods.find(d => d.lord === 'Ketu' || (d.lord === 'Saturn' && satH === 12));
        if (triggerDasha && score >= 5) {
          const startYear = parseInt(triggerDasha.start?.substring(0, 4), 10);
          if (!isNaN(startYear)) {
            const age = startYear - date.getUTCFullYear();
            if (age >= 30 && age <= 75) return age;
          }
        }
        return null;
      })();
      return {
        score, monasticAge, h12Planets,
        ketuHouse: ketuH, saturnHouse: satH, jupiterHouse: jupH,
        moonHouse: moonH, rahuHouse: rahuH,
        venusDebilitated: planets.venus?.rashiId === 6,
        venusCombust: planets.venus?.isCombust || false,
      };
    })(),
    // ── Fame & Public Recognition — technical data ────────────
    famePotential: (() => {
      const sunH = getPlanetHouse('Sun');
      const moonH = getPlanetHouse('Moon');
      const rahuH = getPlanetHouse('Rahu');
      const jupH = getPlanetHouse('Jupiter');
      const venH = getPlanetHouse('Venus');
      let score = 0;
      if (sunH === 10) score += 3;
      if (sunH === 1) score += 2;
      if (sunH === 11) score += 2;
      if (rahuH === 10) score += 3;
      if (rahuH === 1) score += 2;
      if (moonH === 1 || moonH === 10) score += 2;
      if (jupH === 1 || jupH === 9 || jupH === 10) score += 2;
      if (venH === 1 || venH === 10) score += 2;
      const jupFromMoon = moonH && jupH ? ((jupH - moonH + 12) % 12) + 1 : 0;
      if ([1, 4, 7, 10].includes(jupFromMoon)) score += 2;
      const h10Planets = houses[9]?.planets?.filter(p => p.name !== 'Lagna').map(p => p.name) || [];
      if (h10Planets.length >= 2) score += 2;
      return {
        score,
        sunHouse: sunH, moonHouse: moonH, rahuHouse: rahuH,
        jupiterHouse: jupH, venusHouse: venH,
        gajakesari: [1, 4, 7, 10].includes(jupFromMoon),
        h10Planets,
      };
    })(),
    // ── Wealth Class Prediction — technical data ──────────────
    wealthClass: (() => {
      const h2Strength = getHealthScore('venus');
      const h11Strength = getHealthScore('jupiter');
      const jupH = getPlanetHouse('Jupiter');
      const venH = getPlanetHouse('Venus');
      const rahuH = getPlanetHouse('Rahu');
      let score = 0;
      score += (career?.dhanaYogas?.length || 0) * 2;
      if (jupH && ([1, 4, 5, 7, 9, 10].includes(jupH))) score += 2;
      if (h2Strength >= 60) score += 2;
      if (h11Strength >= 60) score += 2;
      if (rahuH === 2 || rahuH === 11) score += 2;
      const lord2House = getPlanetHouse(getHouseLord(2));
      if (lord2House && isInKendra(lord2House)) score += 1;
      return { score, h2Strength, h11Strength, jupiterHouse: jupH, venusHouse: venH, rahuHouse: rahuH, dhanaYogaCount: career?.dhanaYogas?.length || 0 };
    })(),
    // ── Past Life Story — technical data ──────────────────────
    pastLifeStory: (() => {
      const ketuH = ketuHouseNum;
      const rahuH = getPlanetHouse('Rahu');
      return { ketuHouse: ketuH, rahuHouse: rahuH };
    })(),
    // ── Secret Superpower — technical data ────────────────────
    secretSuperpower: (() => {
      const vargottamaPlanets = [];
      for (const [key, p] of Object.entries(planets)) {
        if (key === 'Lagna') continue;
        if (p.isVargottama) vargottamaPlanets.push(p.name);
      }
      const exaltedPlanets = [];
      const exaltMap = { Sun: 1, Moon: 2, Mars: 10, Mercury: 6, Jupiter: 4, Venus: 12, Saturn: 7 };
      for (const [pName, eRashi] of Object.entries(exaltMap)) {
        if (planets[pName.toLowerCase()]?.rashiId === eRashi) exaltedPlanets.push(pName);
      }
      const stelliums = [];
      for (const house of houses) {
        const realP = house.planets.filter(p => p.name !== 'Lagna');
        if (realP.length >= 3) stelliums.push({ house: house.houseNumber, count: realP.length, sign: house.rashiEnglish });
      }
      const retroJupiter = planets.jupiter?.isRetrograde || false;
      const retroSaturn = planets.saturn?.isRetrograde || false;
      const nbYogas = personality?.neechaBhangaYogas || [];
      const nbRajaYogas = nbYogas.filter(nb => nb.isRajaYoga).map(nb => nb.planet);
      return { vargottamaPlanets, exaltedPlanets, stelliums, retroJupiter, retroSaturn, nbRajaYogas };
    })(),
    // ── "If You Were Born 1 Hour Later" — technical data ──────
    alternateLife: (() => {
      try {
        const altDate = new Date(date.getTime() + 60 * 60 * 1000);
        const altLagna = getLagna(altDate, lat, lng);
        const altLagnaName = altLagna.rashi.english;
        const currentLagnaName = lagna.rashi.english;
        return { changed: altLagnaName !== currentLagnaName, currentLagna: currentLagnaName, alternateLagna: altLagnaName };
      } catch (e) {
        return { changed: false };
      }
    })(),
    // ── Danger Periods — technical data ───────────────────────
    dangerPeriods: (() => {
      const marsH = getPlanetHouse('Mars');
      const satH = getPlanetHouse('Saturn');
      const rahuH = getPlanetHouse('Rahu');
      const dangers = [];
      const marsDasha = dasaPeriods.find(d => d.lord === 'Mars');
      if (marsDasha && (marsH && [1, 6, 8, 12].includes(marsH))) {
        const startYear = parseInt(marsDasha.start?.substring(0, 4), 10);
        const endYear = parseInt(marsDasha.endDate?.substring(0, 4), 10);
        if (!isNaN(startYear) && !isNaN(endYear)) {
          const age1 = startYear - date.getUTCFullYear();
          const age2 = endYear - date.getUTCFullYear();
          if (age1 >= 0 && age1 <= 80) dangers.push({ type: 'Mars', period: `${startYear}-${endYear}`, ageRange: `${age1}-${age2}`, marsHouse: marsH });
        }
      }
      const satDasha = dasaPeriods.find(d => d.lord === 'Saturn');
      if (satDasha && satH && [6, 8, 12].includes(satH)) {
        const startYear = parseInt(satDasha.start?.substring(0, 4), 10);
        const endYear = parseInt(satDasha.endDate?.substring(0, 4), 10);
        if (!isNaN(startYear) && !isNaN(endYear)) {
          const age1 = startYear - date.getUTCFullYear();
          const age2 = endYear - date.getUTCFullYear();
          if (age1 >= 0 && age1 <= 80) dangers.push({ type: 'Saturn', period: `${startYear}-${endYear}`, ageRange: `${age1}-${age2}`, saturnHouse: satH });
        }
      }
      const rahuDasha = dasaPeriods.find(d => d.lord === 'Rahu');
      if (rahuDasha && rahuH && [1, 8].includes(rahuH)) {
        const startYear = parseInt(rahuDasha.start?.substring(0, 4), 10);
        const endYear = parseInt(rahuDasha.endDate?.substring(0, 4), 10);
        if (!isNaN(startYear) && !isNaN(endYear)) {
          const age1 = startYear - date.getUTCFullYear();
          const age2 = endYear - date.getUTCFullYear();
          if (age1 >= 0 && age1 <= 80) dangers.push({ type: 'Rahu', period: `${startYear}-${endYear}`, ageRange: `${age1}-${age2}`, rahuHouse: rahuH });
        }
      }
      return dangers;
    })(),
    // ── Spirit Animal — technical data ────────────────────────
    spiritAnimal: { lagnaSign: lagnaName, lagnaElement },
    // ── Celebrity Chart Twin — technical data ──────────────────
    celebrityTwin: { lagnaSign: lagnaName, moonSign: moonRashi.name },
    // ── "What Your Ex Would Say" — technical data ─────────────
    exWouldSay: (() => {
      const venH = getPlanetHouse('Venus');
      const marsH = getPlanetHouse('Mars');
      const moonH = getPlanetHouse('Moon');
      return { venusHouse: venH, marsHouse: marsH, moonHouse: moonH, lagnaElement };
    })(),
    // ── Age You'll Peak — technical data ──────────────────────
    goldenPeriod: (() => {
      const dashaStrengths = dasaPeriods.map(d => {
        const funcNature = getFunctionalNature(lagnaName, d.lord);
        const lordScore = getHealthScore(d.lord.toLowerCase());
        const ruledHouses = [];
        for (let i = 1; i <= 12; i++) { if (getHouseLord(i) === d.lord) ruledHouses.push(i); }
        const hasKendra = ruledHouses.some(h => [1, 4, 7, 10].includes(h));
        const hasTrikona = ruledHouses.some(h => [1, 5, 9].includes(h));
        let power = lordScore;
        if (funcNature === 'benefic' || funcNature === 'yogaKaraka') power += 20;
        if (hasKendra && hasTrikona) power += 15;
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
          return !isNaN(age1) && age1 >= 16 && age2 <= 75;
        })
        .sort((a, b) => {
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
          return {
            period: `${startYear}-${endYear}`, ageRange: `${age1}-${age2}`,
            peakAge: Math.round((age1 + age2) / 2),
            lord: golden.lord, power: golden.power,
          };
        }
      }
      return null;
    })(),
    // ── NEW: Lagna cusp warning ─────────────────────────────────
    lagnaCuspWarning: lagnaCuspWarning,
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 21: PHYSICAL PROFILE — ශරීරය හා මනස
  // Technical data only — AI interprets
  // ══════════════════════════════════════════════════════════════
  const physicalProfile = (() => {
    const h1PlanetsForPhysical = h1?.planetsInHouse || [];
    const lagnaLordName = lagna.rashi.lord;
    const lagnaLordHouseP = getPlanetHouse(lagnaLordName);
    const lagnaLordScore = getHealthScore(lagnaLordName.toLowerCase());
    const lagnaLordDignity = planetStrengths[lagnaLordName.toLowerCase()]?.dignityLevel || '';
    const navLagnaSign = navamsha?.lagna?.rashi?.name || '';
    const navLagnaEn = navamsha?.lagna?.rashi?.english || '';
    const lagnaDecan = lagnaDegreeInSign < 10 ? 1 : lagnaDegreeInSign < 20 ? 2 : 3;
    const venusScore = getHealthScore('venus');
    const venusDignity = planetStrengths.venus?.dignityLevel || '';
    const venusH = getPlanetHouse('Venus');
    const aspectsOn1st = h1?.aspectingPlanets || [];
    const aspectPlanets = aspectsOn1st.map(asp => asp.planet || asp);
    const mercuryScore = getHealthScore('mercury');
    const moonScore = getHealthScore('moon');
    const jupScore = getHealthScore('jupiter');
    const marsScore = getHealthScore('mars');
    const saturnScore = getHealthScore('saturn');

    // Attractiveness composite score (pure math)
    let attractScore = 50;
    if (venusDignity === 'Exalted') attractScore += 25;
    else if (venusDignity === 'Own Sign' || venusDignity === 'Moolatrikona') attractScore += 15;
    else if (venusDignity === 'Friendly') attractScore += 8;
    else if (venusDignity === 'Debilitated') attractScore -= 15;
    if (venusH === 1) attractScore += 15;
    if (venusH === 7) attractScore += 10;
    if (h1PlanetsForPhysical.includes('Venus')) attractScore += 15;
    if (lagnaLordDignity === 'Exalted') attractScore += 10;
    else if (lagnaLordDignity === 'Debilitated') attractScore -= 10;
    if (['Tula', 'Vrishabha', 'Meena'].includes(lagnaName)) attractScore += 5;
    if (aspectPlanets.includes('Venus')) attractScore += 8;
    if (h1PlanetsForPhysical.includes('Rahu')) attractScore += 5;
    if (h1PlanetsForPhysical.includes('Saturn')) attractScore -= 5;
    attractScore = Math.max(15, Math.min(98, attractScore));

    const MATURATION_AGES = { Sun: 22, Moon: 24, Mars: 28, Mercury: 32, Jupiter: 16, Venus: 25, Saturn: 36, Rahu: 42, Ketu: 48 };
    const strongestPlanet = (() => {
      let best = 'Sun'; let bestScore = 0;
      ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].forEach(p => {
        const sc = getHealthScore(p.toLowerCase());
        if (sc > bestScore) { bestScore = sc; best = p; }
      });
      return { planet: best, score: bestScore, maturationAge: MATURATION_AGES[best] || 30 };
    })();

    return {
      lagnaSign: lagnaName, lagnaEnglish: lagna.rashi.english, lagnaElement,
      planetsIn1st: h1PlanetsForPhysical,
      lagnaLord: { name: lagnaLordName, house: lagnaLordHouseP, score: lagnaLordScore, dignity: lagnaLordDignity },
      moonSign: moonRashi.name, moonSignEnglish: moonRashi.english, moonElement,
      mercuryStrength: mercuryScore, moonStrength: moonScore, jupiterStrength: jupScore,
      marsStrength: marsScore, saturnStrength: saturnScore,
      venusAnalysis: { score: venusScore, dignity: venusDignity, house: venusH },
      attractivenessScore: attractScore,
      navamshaLagna: navLagnaSign, navamshaLagnaEnglish: navLagnaEn,
      lagnaDecan,
      aspectPlanetsOnLagna: aspectPlanets,
      superpowerAge: strongestPlanet,
    };
  })();

  // ══════════════════════════════════════════════════════════════
  // SECTION 22: ATTRACTION PROFILE — ආකර්ෂණ බලය
  // Technical data only — AI interprets
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
    const h8Planets = h8Data?.planetsInHouse || [];
    const dk = jaiminiKarakas?.darakaraka || null;
    const venusRashi = planets.venus?.rashi || planets.Venus?.rashi || '';
    const venusElement = Object.entries(ELEMENTS).find(([, signs]) => signs.includes(venusRashi))?.[0] || 'mixed';
    const marsScore = getHealthScore('mars');
    const marsRashi = planets.mars?.rashi || planets.Mars?.rashi || '';
    const marsElement = Object.entries(ELEMENTS).find(([, signs]) => signs.includes(marsRashi))?.[0] || 'mixed';
    const venusMarsSameHouse = venusH === marsH;
    const venusDignity = planetStrengths.venus?.dignityLevel || '';
    const venusScoreAP = getHealthScore('venus');
    const lagnaLordName2 = lagna.rashi.lord;
    const lagnaLordDignity = planetStrengths[lagnaLordName2.toLowerCase()]?.dignityLevel || '';
    const navLagnaSign = navamsha?.lagna?.rashi?.name || '';
    const navLagnaEn = navamsha?.lagna?.rashi?.english || '';

    // Attraction power score (pure math)
    let attractPower = 5;
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

    return {
      lagnaSign: lagnaName, lagnaEnglish: lagna.rashi.english, lagnaElement,
      planetsIn1st: h1?.planetsInHouse || [],
      lagnaLordDignity,
      moonSign: moonRashi.name, moonElement,
      navamshaLagna: navLagnaSign, navamshaLagnaEnglish: navLagnaEn,
      venusHouse: venusH, venusStrength: venusScoreAP, venusDignity, venusElement, venusRashi,
      marsHouse: marsH, marsStrength: marsScore, marsElement, marsRashi,
      venusMarsSameHouse,
      h7Sign: h7Rashi, h7SignEnglish: h7RashiEn,
      seventhLord: lord7, seventhLordHouse: lord7H,
      h8Planets,
      darakaraka: dk ? { planet: dk.planet, rashi: dk.rashi } : null,
      attractionPower: attractPower,
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
          return g ? { type: g } : null;
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
          return n ? { type: n } : null;
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
        if (sltH >= 4.5 && sltH < 6.5) return 'Brahma Muhurta';
        if (sltH >= 6 && sltH < 12) return 'Morning';
        if (sltH >= 12 && sltH < 18) return 'Afternoon';
        if (sltH >= 18 && sltH < 22) return 'Evening';
        return 'Night';
      })(),
      panchanga: { tithi: panchanga.tithi?.name, yoga: panchanga.yoga?.name, karana: panchanga.karana?.name, vaara: panchanga.vaara?.name,
        // ── Panchanga Quality Assessment ──
        panchangaQuality: (() => {
          let score = 0;
          const factors = [];
          const tithiName = panchanga.tithi?.name || '';
          if (['Panchami', 'Dashami', 'Ekadashi', 'Dwitiya', 'Trayodashi'].includes(tithiName)) { score += 2; factors.push({ factor: 'tithi', value: tithiName, category: 'auspicious' }); }
          else if (['Chaturthi', 'Navami', 'Chaturdashi'].includes(tithiName)) { score -= 1; factors.push({ factor: 'tithi', value: tithiName, category: 'rikta' }); }
          else if (tithiName === 'Ashtami') { score -= 1; factors.push({ factor: 'tithi', value: tithiName, category: 'mixed' }); }
          else { score += 1; factors.push({ factor: 'tithi', value: tithiName, category: 'neutral' }); }
          const yogaName = panchanga.yoga?.name || '';
          const auspiciousYogas = ['Saubhagya', 'Shobhana', 'Sukarma', 'Dhriti', 'Harshana', 'Siddhi', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra'];
          const inauspiciousYogas = ['Vishkambha', 'Atiganda', 'Shula', 'Ganda', 'Vyaghata', 'Vajra', 'Vyatipata', 'Parigha', 'Vaidhriti'];
          if (auspiciousYogas.includes(yogaName)) { score += 2; factors.push({ factor: 'yoga', value: yogaName, category: 'auspicious' }); }
          else if (inauspiciousYogas.includes(yogaName)) { score -= 1; factors.push({ factor: 'yoga', value: yogaName, category: 'inauspicious' }); }
          else { score += 1; factors.push({ factor: 'yoga', value: yogaName, category: 'neutral' }); }
          const karanaName = panchanga.karana?.name || '';
          if (karanaName === 'Vishti') { score -= 2; factors.push({ factor: 'karana', value: karanaName, category: 'inauspicious' }); }
          else { score += 1; factors.push({ factor: 'karana', value: karanaName, category: 'neutral' }); }
          const vaaraName = panchanga.vaara?.name || '';
          if (['Thursday', 'Friday', 'Wednesday', 'Monday'].includes(vaaraName)) { score += 1; factors.push({ factor: 'vaara', value: vaaraName, category: 'benefic' }); }
          else if (['Saturday', 'Tuesday'].includes(vaaraName)) { score -= 1; factors.push({ factor: 'vaara', value: vaaraName, category: 'malefic' }); }
          else { factors.push({ factor: 'vaara', value: vaaraName, category: 'neutral' }); }
          return { score, factors };
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
        debugLog(`[CrossValidation] Applied ${crossValidationLog.length} score adjustments:`);
        crossValidationLog.forEach(adj => {
          debugLog(`  ⚖️ ${adj.section}: ${adj.from} → ${adj.to} | ${adj.reason}`);
        });
      } else {
        debugLog('[CrossValidation] All scores are logically consistent — no adjustments needed');
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

      // ══════════════════════════════════════════════════════════════
      // JYOTISH PER-SECTION ENRICHMENT — Deep-merge @prisri/jyotish
      // data INTO each section for AI prompt enrichment
      // ══════════════════════════════════════════════════════════════
      try {
        const jyotishEngine = require('./jyotish');
        if (jyotishEngine.isAvailable()) {
          const enrichments = jyotishEngine.generateSectionEnrichments(date, lat, lng);
          if (enrichments) {
            // Map enrichment keys to allSections keys
            const SECTION_MAP = {
              yogaAnalysis:    'yogaAnalysis',
              personality:     'personality',
              marriage:        'marriage',
              career:          'career',
              children:        'children',
              lifePredictions: 'lifePredictions',
              mentalHealth:    'mentalHealth',
              business:        'business',
              transits:        'transits',
              realEstate:      'realEstate',
              employment:      'employment',
              financial:       'financial',
              futureTimeline:  'timeline25',
              health:          'health',
              foreignTravel:   'foreignTravel',
              legal:           'legal',
              education:       'education',
              luck:            'luck',
              spiritual:       'spiritual',
              surpriseInsights:'surpriseInsights',
              physicalProfile: 'physicalProfile',
            };

            let mergeCount = 0;
            for (const [enrichKey, sectionKey] of Object.entries(SECTION_MAP)) {
              if (enrichments[enrichKey] && allSections[sectionKey]) {
                // Add jyotish data as a sub-object within each section
                allSections[sectionKey]._jyotish = enrichments[enrichKey];
                mergeCount++;
              }
            }

            // Attach cross-cutting data to sections that benefit from it
            if (enrichments.chalitChart) {
              // Health section gets full chalit for medical house analysis
              if (allSections.health) allSections.health._chalitChart = enrichments.chalitChart;
              // Transits section gets chalit for D1-vs-Chalit planet shifts
              if (allSections.transits) allSections.transits._chalitChart = enrichments.chalitChart;
            }
            if (enrichments.allVargas) {
              // Attach all varga ascendants to personality for AI deep analysis
              if (allSections.personality) allSections.personality._allVargas = enrichments.allVargas;
            }

            debugLog(`[FullReport] Jyotish enrichments merged into ${mergeCount} sections (${enrichments._computeTimeMs}ms)`);
          }
        }
      } catch (enrichErr) {
        console.warn('[FullReport] Jyotish section enrichment failed (non-fatal):', enrichErr.message);
      }

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

    // ══════════════════════════════════════════════════════════════
    // SECTION: ENHANCED ANALYSIS (MIT Libraries — celestine + astrology-insights)
    // ══════════════════════════════════════════════════════════════
    enhanced: (() => {
      try {
        const enhancedEngine = require('./enhanced');
        const enhancedData = enhancedEngine.generateEnhancedReport(date, lat, lng);
        debugLog('[FullReport] Enhanced module loaded —', enhancedData._loadedModules, 'features available');
        return enhancedData;
      } catch (err) {
        console.warn('[FullReport] Enhanced module unavailable:', err.message);
        return null;
      }
    })(),

    // ══════════════════════════════════════════════════════════════
    // SECTION: JYOTISH ANALYSIS (ISC — @prisri/jyotish independent cross-validation)
    // ══════════════════════════════════════════════════════════════
    jyotish: (() => {
      try {
        const jyotishEngine = require('./jyotish');
        const jyotishData = jyotishEngine.generateJyotishReport(date, lat, lng);
        console.log('[FullReport] Jyotish module loaded —', jyotishData?._computeTimeMs || 0, 'ms compute');
        return jyotishData;
      } catch (err) {
        console.warn('[FullReport] Jyotish module unavailable:', err.message);
        return null;
      }
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
        reasons.push({ rule: 'debSignLordInKendraFromLagna', lord: debSignLord, house: debSignLordHouse });
      }
      if (moonH && debSignLordHouse) {
        const distFromMoon = ((debSignLordHouse - moonH + 12) % 12) + 1;
        if ([1, 4, 7, 10].includes(distFromMoon)) {
          cancelled = true;
          reasons.push({ rule: 'debSignLordInKendraFromMoon', lord: debSignLord, house: debSignLordHouse });
        }
      }

      // Rule 2: Lord of the exaltation sign of the debilitated planet is in kendra
      const exaltRashiId = exaltations[p.name];
      if (exaltRashiId) {
        const exaltLord = RASHIS[exaltRashiId - 1]?.lord;
        const exaltLordHouse = getPlanetHouse(exaltLord);
        if (exaltLordHouse && [1, 4, 7, 10].includes(exaltLordHouse)) {
          cancelled = true;
          reasons.push({ rule: 'exaltSignLordInKendra', lord: exaltLord, house: exaltLordHouse });
        }
      }

      // Rule 3: The debilitated planet itself is in kendra
      const pH = getPlanetHouse(p.name);
      if (pH && [1, 4, 7, 10].includes(pH)) {
        cancelled = true;
        reasons.push({ rule: 'selfInKendra', planet: p.name, house: pH });
      }

      // Rule 4: Jupiter aspects the debilitated planet
      const jupH = getPlanetHouse('Jupiter');
      if (jupH && pH) {
        const jupToP = ((pH - jupH + 12) % 12) + 1;
        if ([5, 7, 9].includes(jupToP)) {
          cancelled = true;
          reasons.push({ rule: 'jupiterAspects', planet: p.name });
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
        planets: ['Jupiter', 'Moon'],
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
        planets: ['Sun', 'Mercury'],
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
            planets: ['Venus'],
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
          sinhala: 'රුචක යෝගය',
          planets: ['Mars'],
          strength: 'Very Strong'
      });
  }
  
  // Mercury (Bhadra): Gemini(3), Virgo(6) in Kendra
  if (mercuryHouse && planets['Mercury'] && [1, 4, 7, 10].includes(mercuryHouse) && [3, 6].includes(planets['Mercury'].rashiId)) {
        yogas.push({
          name: 'Bhadra Yoga',
          sinhala: 'භද්‍ර යෝගය',
          planets: ['Mercury'],
          strength: 'Very Strong'
      }); 
  }
  
  // Jupiter (Hamsa): Sagittarius(9), Pisces(12), Cancer(4) in Kendra
  if (jupiterHouse && planets['Jupiter'] && [1, 4, 7, 10].includes(jupiterHouse) && [9, 12, 4].includes(planets['Jupiter'].rashiId)) {
        yogas.push({
          name: 'Hamsa Yoga',
          sinhala: 'හංස යෝගය',
          planets: ['Jupiter'],
          strength: 'Very Strong'
      }); 
  }
  
  // Saturn (Shasha): Capricorn(10), Aquarius(11), Libra(7) in Kendra
  const satHouse = getPlanetHouse('Saturn');
  if (satHouse && planets['Saturn'] && [1, 4, 7, 10].includes(satHouse) && [10, 11, 7].includes(planets['Saturn'].rashiId)) {
        yogas.push({
          name: 'Shasha Yoga',
          sinhala: 'ශශ යෝගය',
          planets: ['Saturn'],
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
              planets: ['Moon'],
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
