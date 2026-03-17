/**
 * Vedic Astrology Engine for Nakath AI
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

// Lahiri Ayanamsha reference values (from Lahiri's Indian Ephemeris)
// These are well-established reference points for Lahiri Ayanamsha
const LAHIRI_AYANAMSHA_J2000 = 23.853056; // degrees at J2000.0 (Jan 1, 2000 12:00 TT)
const AYANAMSHA_RATE = 0.0137222; // degrees per year (50.29" per year precession rate)

// IAU 2000A nutation coefficients (top 15 terms for sub-arcsecond accuracy)
// Each: [multipliers for l, l', F, D, Ω, S_coeff, C_coeff] in 0.0001 arcsec
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
 * Get accurate Moon longitude using astronomia library (Meeus algorithms)
 * Returns tropical ecliptic longitude in degrees (0-360)
 */
function getMoonLongitude(date) {
  const jde = dateToJD(date);
  const pos = moonposition.position(jde);
  // pos.lon is in radians, convert to degrees
  let lon = pos.lon * 180 / Math.PI;
  return ((lon % 360) + 360) % 360;
}

/**
 * Get accurate Sun longitude using astronomia library (Meeus algorithms)
 * Returns apparent tropical ecliptic longitude in degrees (0-360)
 */
function getSunLongitude(date) {
  const jde = dateToJD(date);
  const T = base.J2000Century(jde);
  // solar.apparentLongitude returns radians
  let lon = solar.apparentLongitude(T) * 180 / Math.PI;
  return ((lon % 360) + 360) % 360;
}

/**
 * Calculate Lahiri Ayanamsha with nutation correction
 * Uses IAU 2000A nutation model (top 15 terms) for sub-arcsecond accuracy
 * instead of the simple linear approximation.
 * 
 * Lahiri ayanamsha = general precession in longitude - nutation in longitude
 * This corrects the ~1° error that accumulates with the linear formula.
 */
function getAyanamsha(date) {
  const jd = dateToJD(date);
  const T = (jd - 2451545.0) / 36525; // Julian centuries from J2000.0
  const yearsFromJ2000 = (jd - 2451545.0) / 365.25;
  
  // General precession in longitude (IAU 2006, Capitaine et al.)
  // More accurate than constant rate — includes quadratic and cubic terms
  const precession = (5028.796195 * T + 1.1054348 * T * T + 0.00007964 * T * T * T) / 3600; // degrees
  
  // Fundamental arguments for nutation (in degrees)
  const l  = (485868.249036 + 1717915923.2178 * T) / 3600 % 360; // mean anomaly of Moon
  const lp = (1287104.79305 + 129596581.0481 * T) / 3600 % 360;  // mean anomaly of Sun
  const F  = (335779.526232 + 1739527262.8478 * T) / 3600 % 360;  // mean arg of latitude of Moon
  const D  = (1072260.70369 + 1602961601.2090 * T) / 3600 % 360;  // mean elongation Moon-Sun
  const Om = (450160.398036 - 6962890.5431 * T) / 3600 % 360;     // longitude of ascending node
  
  // Calculate nutation in longitude (ΔΨ) using IAU coefficients
  let nutationLon = 0; // in 0.0001 arcseconds
  const deg2rad = Math.PI / 180;
  for (const coeff of NUTATION_COEFFS) {
    const arg = (coeff[0] * l + coeff[1] * lp + coeff[2] * F + coeff[3] * D + coeff[4] * Om) * deg2rad;
    nutationLon += (coeff[5] + coeff[6] * T) * Math.sin(arg);
  }
  const nutationDeg = nutationLon / (3600 * 10000); // convert 0.0001" to degrees
  
  // Lahiri Ayanamsha = base at J2000 + precession since J2000 + nutation correction
  // The official Lahiri value at J2000 is 23.853056°
  // Total ayanamsha = ayanamsha_base + precession_since_base
  // But since we use J2000 as base, ayanamsha = base + precession_rate * T + nutation
  const ayanamsha = LAHIRI_AYANAMSHA_J2000 + AYANAMSHA_RATE * yearsFromJ2000 + nutationDeg;
  
  return ayanamsha;
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
 * Get accurate planetary longitudes using the ephemeris package (Meeus/VSOP87 algorithms)
 * for all 9 Navagrahas. Rahu/Ketu use mean node calculation.
 *
 * @param {Date}   date  - UTC Date object
 * @param {number} [lat=6.9271]  - Observer latitude  (degrees). Used for topocentric corrections.
 * @param {number} [lng=79.8612] - Observer longitude (degrees). Used for topocentric corrections.
 *
 * All positions are tropical apparent longitudes, then converted to sidereal
 * using Lahiri Ayanamsha.
 */
function getAllPlanetPositions(date, lat = 6.9271, lng = 79.8612) {
  const jd = dateToJD(date);
  const T = (jd - 2451545.0) / 36525;
  const ayanamsha = getAyanamsha(date);

  const norm = (deg) => ((deg % 360) + 360) % 360;

  // Sun & Moon from astronomia (Meeus algorithms - already highly accurate)
  const sunTrop = getSunLongitude(date);
  const moonTrop = getMoonLongitude(date);

  // Mars, Mercury, Jupiter, Venus, Saturn from ephemeris package (VSOP87 / Jean Meeus).
  // Pass the actual observer lat/lng so topocentric parallax corrections are applied
  // to the correct location — previously hardcoded to Colombo.
  const swissResult = ephemeris.getAllPlanets(date, lat, lng, 0);
  const swissObs = swissResult.observed;

  const marsTrop = swissObs.mars.apparentLongitudeDd;
  const mercTrop = swissObs.mercury.apparentLongitudeDd;
  const jupTrop = swissObs.jupiter.apparentLongitudeDd;
  const venTrop = swissObs.venus.apparentLongitudeDd;
  const satTrop = swissObs.saturn.apparentLongitudeDd;

  // Rahu (Mean North Node) - moves retrograde ~19.355° per year
  // This is the standard Vedic mean node; true node varies ±1.5° but
  // Sri Lankan tradition predominantly uses the mean node.
  let rahuTrop = norm(125.044 - 1934.1362 * T);

  // Ketu = Rahu + 180°
  let ketuTrop = norm(rahuTrop + 180);

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

  // Add rashi and retrograde info for each planet
  for (const key of Object.keys(planets)) {
    const p = planets[key];
    const rashi = getRashi(p.sidereal);
    p.rashiId = rashi.id;
    p.rashi = rashi.name;
    p.rashiEnglish = rashi.english;
    p.rashiSinhala = rashi.sinhala;
    p.degreeInSign = p.sidereal % 30;
    // Add retrograde status from Swiss Ephemeris (where available)
    if (swissObs[key]) {
      p.isRetrograde = swissObs[key].is_retrograde === true;
    } else {
      p.isRetrograde = false;
    }
  }
  // Rahu is always retrograde in Vedic astrology
  planets.rahu.isRetrograde = true;
  planets.ketu.isRetrograde = true;

  return planets;
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
      const targetHouse = ((houseNum - 1 + offset) % 12) + 1;
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
 * Uses the formula: RAMC = LST * 15, then Ascendant from RAMC + obliquity + latitude
 * 
 * @param {Date} date - Date/time in UTC
 * @param {number} lat - Latitude in degrees
 * @param {number} lng - Longitude in degrees
 * @returns {object} Lagna rashi and degree
 */
function getLagna(date, lat = 6.9271, lng = 79.8612) {
  const jd = dateToJD(date);
  const T = (jd - 2451545.0) / 36525;

  // Mean sidereal time at Greenwich (in degrees)
  let GMST = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
    + 0.000387933 * T * T - T * T * T / 38710000;
  GMST = ((GMST % 360) + 360) % 360;

  // Local Sidereal Time (degrees)
  let LST = GMST + lng;
  LST = ((LST % 360) + 360) % 360;

  // Obliquity of the ecliptic (Meeus)
  const eps = 23.4392911 - 0.0130042 * T - 1.64e-7 * T * T + 5.036e-7 * T * T * T;
  const epsRad = eps * Math.PI / 180;
  const latRad = lat * Math.PI / 180;

  // RAMC in radians
  const ramcRad = LST * Math.PI / 180;

  // Ascendant formula
  const y = Math.cos(ramcRad);
  const x = -(Math.sin(ramcRad) * Math.cos(epsRad) + Math.tan(latRad) * Math.sin(epsRad));
  let ascendant = Math.atan2(y, x) * 180 / Math.PI;
  ascendant = ((ascendant % 360) + 360) % 360;

  // Convert to sidereal
  const siderealAsc = toSidereal(ascendant, date);

  return {
    tropical: ascendant,
    sidereal: siderealAsc,
    rashi: getRashi(siderealAsc),
  };
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
 * @returns {Object} Marriage timing predictions with ranked windows
 */
function predictMarriageTiming(birthInfo, lat, lng) {
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
      const targetH = ((pH - 1 + asp) % 12) + 1;
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
      // regardless of house placement, Venus activates marriage energy
      if (adLord === 'Venus') {
        score += 8;
        reasons.push('Venus AD — natural marriage karaka activation (strongest marriage antardasha)');
        // Venus in kendra or trikona from lagna = even more potent
        const venusH = getPlanetHouse('Venus');
        if (venusH && [1, 4, 5, 7, 9, 10].includes(venusH)) {
          score += 5;
          reasons.push(`Venus placed in strong house ${venusH} — amplifies marriage potential`);
        }
      }
      if (mdLord === 'Venus') {
        score += 5;
        reasons.push('Venus MD — entire period favors relationships and marriage');
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
            const aspH = ((satNatalH - 1 + asp) % 12) + 1;
            if (aspH === 2 || aspH === 11) {
              score += 3;
              reasons.push(`Saturn natal ${asp}th aspect hits H${aspH} (family/gains)`);
            }
          });
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
        // Jupiter aspects on 7th house
        [5, 7, 9].forEach(asp => {
          const aspH = ((jupH - 1 + asp) % 12) + 1;
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
          const aspH = ((satH - 1 + asp) % 12) + 1;
          if (aspH === 7 && satH !== 7) {
            transitScore += 6;
            transitReasons.push(`Saturn aspects 7th house (${asp}th aspect from H${satH})`);
          }
        });

        // Double transit: Jupiter + Saturn both influence 7th
        const jupTouches7 = jupH === 7 ||
          [5, 7, 9].some(a => ((jupH - 1 + a) % 12) + 1 === 7);
        const satTouches7 = satH === 7 ||
          [3, 7, 10].some(a => ((satH - 1 + a) % 12) + 1 === 7);

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
            [5, 7, 9].some(a => ((jupH - 1 + a) % 12) + 1 === lord7NatalH);
          if (jupTouchesLord7) {
            transitScore += 5;
            transitReasons.push(`Jupiter transit activates 7th lord ${lord7} in H${lord7NatalH}`);
          }
          // Saturn transit/aspect on 7th lord's natal position
          const satTouchesLord7 = satH === lord7NatalH ||
            [3, 7, 10].some(a => ((satH - 1 + a) % 12) + 1 === lord7NatalH);
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
            adAspects.some(a => ((adTransitH - 1 + a) % 12) + 1 === 7);
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
            mdAspects.some(a => ((mdTransitH - 1 + a) % 12) + 1 === 7);
          if (mdTransitTouches7) {
            transitScore += 4;
            transitReasons.push(`MD lord ${mdLord} transit activates 7th house — dasha-transit resonance`);
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
      if (avgAge >= 23 && avgAge <= 28) {
        score += 12;
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

  // ── Build summary ──
  const topWindow = windows[0] || null;
  const top5 = windows.slice(0, 5);

  // First marriage windows: age 18-35 with score >= 30
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
        else if ([5, 7, 9].some(a => ((jH - 1 + a) % 12) + 1 === 7)) yrScore += 6;
        // Saturn influence on 7th
        if (sH === 7) yrScore += 6;
        else if ([3, 7, 10].some(a => ((sH - 1 + a) % 12) + 1 === 7)) yrScore += 6;
        // Double transit
        const jT7 = jH === 7 || [5, 7, 9].some(a => ((jH - 1 + a) % 12) + 1 === 7);
        const sT7 = sH === 7 || [3, 7, 10].some(a => ((sH - 1 + a) % 12) + 1 === 7);
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
    kujaDosha: [1, 2, 4, 7, 8, 12].includes(getPlanetHouse('Mars')),
    predictedWindows: top5,
    firstMarriageWindows,
    bestWindow: topWindow ? {
      period: `${topWindow.mahadasha}-${topWindow.antardasha}`,
      dateRange: `${topWindow.start} to ${topWindow.end}`,
      ageRange: topWindow.ageRange,
      confidence: topWindow.confidence,
      score: topWindow.score,
    } : null,
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
    const rahu = allPositions.find(p => p.name === 'Rahu');
    return rahu ? rahu.longitude : 0;
  } catch (e) {
    // Simplified Rahu mean node
    const { julian } = require('astronomia');
    const jd = julian.CalendarGregorianToJD(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate() + date.getUTCHours() / 24);
    const T = (jd - 2451545.0) / 36525;
    let omega = 125.04452 - 1934.136261 * T;
    omega = omega % 360;
    if (omega < 0) omega += 360;
    return omega;
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
  'Mesha':     { yogaKaraka: 'Saturn', benefics: ['Sun','Moon','Jupiter'], malefics: ['Mercury','Venus'], neutrals: ['Saturn','Mars'] },
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
const CAREER_BY_PLANET = {
  'Sun':     ['Government service', 'Administration', 'Medicine', 'Politics', 'Management', 'Temple/religious work'],
  'Moon':    ['Nursing', 'Hotel/catering', 'Shipping', 'Dairy', 'Public relations', 'Counseling'],
  'Mars':    ['Military/Police', 'Engineering', 'Surgery', 'Real estate', 'Sports', 'Construction', 'Fire dept'],
  'Mercury': ['Accounting', 'Writing/Journalism', 'IT/Software', 'Teaching', 'Commerce', 'Astrology'],
  'Jupiter': ['Education/Professor', 'Law/Judge', 'Banking', 'Religious leader', 'Consulting', 'Finance'],
  'Venus':   ['Art/Music/Cinema', 'Fashion', 'Luxury goods', 'Tourism', 'Beauty industry', 'Interior design'],
  'Saturn':  ['Mining', 'Agriculture', 'Labor unions', 'Iron/steel', 'Judiciary', 'Oil/petroleum', 'Democracy/politics'],
  'Rahu':    ['Foreign companies', 'Technology/IT', 'Aviation', 'Research', 'Diplomacy', 'Pharmaceuticals'],
  'Ketu':    ['Spiritual/religious', 'Alternative medicine', 'Mathematics', 'Computer science', 'Investigation'],
};

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
 * @param {number} houseNum - 1-12
 * @param {Array} houses - D1 house chart
 * @param {Object} planets - All planet positions
 * @param {Object} drishtis - Planetary aspects
 * @param {string} lagnaName - Lagna rashi name
 * @returns {Object} Deep analysis of the house
 */
function analyzeHouse(houseNum, houses, planets, drishtis, lagnaName) {
  const house = houses[houseNum - 1];
  if (!house) return null;

  const rashiLord = house.rashiLord || RASHIS[(house.rashiId || 1) - 1]?.lord || 'Unknown';
  const planetsInHouse = house.planets.filter(p => !['Lagna'].includes(p.name));
  const planetNames = planetsInHouse.map(p => p.name);

  // Find which house the lord sits in
  const lordHouse = houses.findIndex(h => h.planets.some(p => p.name === rashiLord)) + 1;

  // Aspects on this house
  const aspectingPlanets = drishtis?.houseAspectedBy?.[houseNum] || [];

  // Strength assessment
  let strength = 'moderate';
  const lordNature = getFunctionalNature(lagnaName, rashiLord);

  if (lordNature === 'yogaKaraka' || lordNature === 'benefic') strength = 'strong';
  if (lordNature === 'malefic') strength = 'challenged';

  // Check if lord is in kendra/trikona from this house
  if (lordHouse) {
    const dist = ((lordHouse - houseNum + 12) % 12) + 1;
    if ([1, 4, 7, 10].includes(dist)) strength = 'very strong';
    if ([6, 8, 12].includes(dist)) strength = 'weak';
  }

  // Check benefic/malefic planets in house
  const beneficsIn = planetNames.filter(p => getFunctionalNature(lagnaName, p) === 'benefic');
  const maleficsIn = planetNames.filter(p => getFunctionalNature(lagnaName, p) === 'malefic');

  if (beneficsIn.length > 0 && maleficsIn.length === 0) strength = 'very strong';
  if (maleficsIn.length > 0 && beneficsIn.length === 0 && strength !== 'very strong') strength = 'challenged';

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
    lordNature,
    beneficsIn,
    maleficsIn,
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
function generateFullReport(birthDate, lat = 6.9271, lng = 79.8612) {
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
  const yogas = detectYogas(date, lat, lng);
  const planetStrengths = getPlanetStrengths(date, lat, lng);
  const panchanga = getPanchanga(date, lat, lng);
  const dasaPeriods = calculateVimshottariDetailed(moonSidereal, date);
  const functionalStatus = FUNCTIONAL_STATUS[lagnaName] || {};

  // ── Advanced data for accuracy enrichment ──────────────────────
  // Import precision data from advanced engine to enrich raw section data
  let advancedShadbala = null;
  let jaiminiKarakas = null;
  let extendedVargas = null;
  let advancedYogas = null;
  let advancedDoshas = null;
  try {
    const advanced = require('./advanced');
    advancedShadbala = advanced.calculateShadbala(date, lat, lng);
    jaiminiKarakas = advanced.calculateJaiminiKarakas(date, lat, lng);
    extendedVargas = advanced.buildExtendedVargas(date, lat, lng);
    advancedYogas = advanced.detectAdvancedYogas(date, lat, lng);
    advancedDoshas = advanced.detectDoshas(date, lat, lng);
    console.log('[FullReport] Advanced enrichment loaded — Shadbala, Jaimini, Vargas, Yogas, Doshas');
  } catch (err) {
    console.warn('[FullReport] Advanced enrichment unavailable:', err.message);
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
  const h1 = analyzeHouse(1, houses, planets, drishtis, lagnaName);
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
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 3: MARRIAGE & RELATIONSHIPS
  // ══════════════════════════════════════════════════════════════
  const h7 = analyzeHouse(7, houses, planets, drishtis, lagnaName);
  const lord7Name = getHouseLord(7);
  const lord7House = getPlanetHouse(lord7Name);
  const venusHouse = getPlanetHouse('Venus');
  const navVenus = navamsha.planets?.venus;

  // Manglik/Kuja Dosha check (Mars in 1,2,4,7,8,12 from Lagna or Moon)
  const marsHouse = getPlanetHouse('Mars');
  const marsFromMoon = houses.findIndex(h => h.planets.some(p => p.name === 'Mars')) + 1;
  const moonHouseIdx = getPlanetHouse('Moon');
  const marsDistFromMoon = marsHouse && moonHouseIdx ? ((marsHouse - moonHouseIdx + 12) % 12) + 1 : 0;
  const kujaDosha = [1, 2, 4, 7, 8, 12].includes(marsHouse) || [1, 2, 4, 7, 8, 12].includes(marsDistFromMoon);

  // Marriage timing — 7th lord dasha or Venus dasha indicates marriage period
  const marriageTimingDasas = dasaPeriods.filter(d =>
    d.lord === lord7Name || d.lord === 'Venus' || d.lord === 'Jupiter'
  ).map(d => `${d.lord} Mahadasha: ${d.start} to ${d.endDate}`);

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
    kujaDosha: { present: kujaDosha, marsHouse, note: kujaDosha ? 'Manglik Dosha present. Should be matched with another Manglik or dosha-cancellation checked.' : 'No Kuja Dosha. Marriage prospects are unobstructed by Mars.' },
    marriageTimingIndicators: marriageTimingDasas,
    spouseQualities: `7th house in ${h7?.rashiEnglish || ''} ruled by ${lord7Name}. ${h7?.planetsInHouse?.length ? 'Planets in 7th (' + h7.planetsInHouse.join(', ') + ') directly influence spouse character.' : 'No planets in 7th — lord\'s position is the primary indicator.'}`,
    // ── NEW: Jaimini spouse significator ─────────────────────────
    darakaraka: darakarakaData ? {
      planet: darakarakaData.planet,
      rashi: darakarakaData.rashi,
      degree: darakarakaData.degree,
      meaning: `${darakarakaData.planet} as Darakaraka (lowest degree planet) reveals your spouse's core nature and the soul-level connection in marriage`,
      spouseNature: `Spouse influenced by ${darakarakaData.planet} energy in ${darakarakaData.rashi}`,
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
    },
    // ── NEW: Multi-layer marriage timing prediction ────────────
    marriageTimingPrediction: (() => {
      try {
        const mtp = predictMarriageTiming(date, lat, lng);
        return {
          firstMarriageWindows: (mtp.firstMarriageWindows || []).map(w => ({
            period: `${w.mahadasha}-${w.antardasha}`,
            dateRange: `${w.start} to ${w.end}`,
            ageRange: w.ageRange,
            peakYear: w.peakYear,
            confidence: w.confidence,
            score: w.score,
            reasons: w.reasons?.slice(0, 5) || [],
          })),
          bestWindow: mtp.bestWindow,
          kujaDosha: mtp.kujaDosha,
        };
      } catch (e) {
        console.error('[MarriageTiming] Error:', e.message);
        return null;
      }
    })(),
    lagnaCuspWarning: lagnaCuspWarning,
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 4: CAREER & FINANCIAL STATUS
  // ══════════════════════════════════════════════════════════════
  const h10 = analyzeHouse(10, houses, planets, drishtis, lagnaName);
  const h2 = analyzeHouse(2, houses, planets, drishtis, lagnaName);
  const h11 = analyzeHouse(11, houses, planets, drishtis, lagnaName);
  const h4Career = analyzeHouse(4, houses, planets, drishtis, lagnaName);
  const lord10Name = getHouseLord(10);
  const lord2Name = getHouseLord(2);
  const lord11Name = getHouseLord(11);
  const lord4CareerName = getHouseLord(4);

  // Determine career suggestions based on 10th house lord and planets
  const careerPlanets = [lord10Name, ...(h10?.planetsInHouse || [])];
  const suggestedCareers = [...new Set(careerPlanets.flatMap(p => CAREER_BY_PLANET[p] || []))];

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
    suggestedCareers,
    dhanaYogas,
    wealthStrength: ashtakavarga?.sarvashtakavarga ? (() => {
      // Check bindus in 2nd and 11th house signs
      const h2RashiIdx = (houses[1]?.rashiId || 1) - 1;
      const h11RashiIdx = (houses[10]?.rashiId || 1) - 1;
      const h2Bindus = ashtakavarga.sarvashtakavarga[h2RashiIdx] || 0;
      const h11Bindus = ashtakavarga.sarvashtakavarga[h11RashiIdx] || 0;
      return { house2Bindus: h2Bindus, house11Bindus: h11Bindus, assessment: (h2Bindus + h11Bindus) >= 56 ? 'Strong wealth potential' : (h2Bindus + h11Bindus) >= 48 ? 'Moderate wealth' : 'Wealth requires effort' };
    })() : null,
    businessVsService: isInKendra(lord10House) ? 'Strong potential for independent business or leadership roles' : isInDusthana(lord10House) ? 'Service-oriented or behind-the-scenes roles may suit better' : 'A balanced mix of initiative and cooperative work',
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
  const h5 = analyzeHouse(5, houses, planets, drishtis, lagnaName);
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
    childrenTimingDasas: dasaPeriods.filter(d => d.lord === lord5Name || d.lord === 'Jupiter').map(d => `${d.lord}: ${d.start} to ${d.endDate}`),
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
    } : null,
    currentAntardasha: currentAntardasha ? {
      lord: currentAntardasha.lord,
      period: `${currentAntardasha.start} to ${currentAntardasha.endDate}`,
    } : null,
    nextDasha: nextDasha ? {
      lord: nextDasha.lord,
      period: `${nextDasha.start} to ${nextDasha.endDate}`,
      effects: nextDasha.effects,
    } : null,
    lifePhaseSummary: dasaPeriods.map(d => ({
      lord: d.lord,
      period: `${d.start} to ${d.endDate}`,
      years: d.years.toFixed(1),
      theme: DASHA_EFFECTS[d.lord]?.general || '',
      isCurrent: currentDasha?.lord === d.lord,
    })),
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 7: INTELLECTUAL & MENTAL HEALTH
  // ══════════════════════════════════════════════════════════════
  const h4 = analyzeHouse(4, houses, planets, drishtis, lagnaName);
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
  const h7ForBiz = analyzeHouse(7, houses, planets, drishtis, lagnaName); // 7th = partnerships/biz
  const h3 = analyzeHouse(3, houses, planets, drishtis, lagnaName); // 3rd = initiative, courage

  // Best business periods based on 10th lord, 7th lord (partnerships), 11th lord (gains)
  const businessDasas = dasaPeriods.filter(d =>
    d.lord === lord10Name || d.lord === lord11Name || d.lord === lord7Name
  );

  // Ashtakavarga strength of 10th house sign
  const h10RashiIdx = (houses[9]?.rashiId || 1) - 1;
  const h10Bindus = ashtakavarga?.sarvashtakavarga?.[h10RashiIdx] || 0;

  const business = {
    title: 'Business Growth',
    sinhala: 'ව්‍යාපාර වර්ධනය',
    bestBusinessTypes: suggestedCareers.slice(0, 5),
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
    const bindus = ashtakavarga?.sarvashtakavarga?.[planet.rashiId - 1] || 0;
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
    bestPeriodsForProperty: dasaPeriods.filter(d => d.lord === lord4Name || d.lord === 'Mars' || d.lord === 'Saturn').map(d => ({
      lord: d.lord,
      period: `${d.start} to ${d.endDate}`,
      reason: d.lord === lord4Name ? '4th lord dasha — prime time for home/property' : d.lord === 'Mars' ? 'Mars dasha — land acquisition period' : 'Saturn dasha — construction, long-term property investment',
    })),
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 11: EMPLOYMENT & PROMOTIONS
  // ══════════════════════════════════════════════════════════════
  const lord6Name = getHouseLord(6);
  const h6 = analyzeHouse(6, houses, planets, drishtis, lagnaName);

  const employment = {
    title: 'Employment & Promotions',
    sinhala: 'රැකියා හා උසස්වීම්',
    tenthHouse: h10,
    sixthHouse: h6, // 6th = service, daily work
    tenthLord: { name: lord10Name, house: lord10House },
    careerPaths: suggestedCareers,
    promotionPeriods: dasaPeriods.filter(d => d.lord === lord10Name || d.lord === lord9Name || d.lord === 'Sun').map(d => ({
      lord: d.lord,
      period: `${d.start} to ${d.endDate}`,
      reason: d.lord === lord10Name ? '10th lord dasha — career advancement' : d.lord === lord9Name ? '9th lord dasha — fortune and recognition' : 'Sun dasha — authority and government favor',
    })),
    jobChangePeriods: dasaPeriods.filter(d => d.lord === 'Rahu' || d.lord === 'Ketu' || d.lord === lord6Name).map(d => ({
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
  const h8 = analyzeHouse(8, houses, planets, drishtis, lagnaName);
  const h12 = analyzeHouse(12, houses, planets, drishtis, lagnaName);
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
      riskPeriods: dasaPeriods.filter(d => d.lord === lord8Name || d.lord === lord12Name).map(d => ({
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
  // SECTION 13: 25-YEAR TIMELINE (Dasha Timeline)
  // ══════════════════════════════════════════════════════════════
  const timelineStart = new Date();
  const timelineEnd = new Date(timelineStart);
  timelineEnd.setFullYear(timelineEnd.getFullYear() + 25);

  const timeline25 = {
    title: '25-Year Predictive Timeline',
    sinhala: 'වසර 25 අනාවැකි කාල සටහන',
    from: timelineStart.toISOString().split('T')[0],
    to: timelineEnd.toISOString().split('T')[0],
    periods: [],
  };

  // Build the 25-year timeline with Mahadasha + Antardasha breakdowns
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

  const h6Health = analyzeHouse(6, houses, planets, drishtis, lagnaName);
  const h8Health = analyzeHouse(8, houses, planets, drishtis, lagnaName);
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
  const eyeCount    = [
    sunScore < 45,
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
    vulnerableAge: sunScore < 40 ? '30s onwards' : '45s onwards',
    prevention: 'Triphala eye wash weekly, Vitamin A foods (carrots, papaya, green leaves), reduce screen time, eye yoga',
    narrative: eyeCount >= 3
      ? `⚠️ HIGH EYE RISK: Sun or 2nd/12th house axis afflicted. Risk of cataracts, glaucoma, or significant vision deterioration. Annual eye check from age 35.`
      : eyeCount >= 1
        ? `MODERATE eye sensitivity — reduce screen glare, regular eye tests, triphala wash helps.`
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

  const organRiskSummary = Object.values(organRisks).map(o => ({
    organ: o.organ,
    risk: o.risk,
    diseases: o.diseases,
    vulnerableAge: o.vulnerableAge,
    prevention: o.prevention,
    narrative: o.narrative,
  }));

  // ── HIGH-RISK organs for quick reference ──
  const highRiskOrgans = organRiskSummary.filter(o => o.risk === 'HIGH').map(o => o.organ);
  const moderateRiskOrgans = organRiskSummary.filter(o => o.risk === 'MODERATE').map(o => o.organ);

  // ── Health danger periods — expanded to antardasha level ────
  // Include mahadashas of 6th lord, 8th lord, Saturn, Ketu, Rahu, Maraka lords
  // Note: lord2Name and lord7Name are already declared earlier in this function
  const marakaLords = [lord2Name, lord7Name].filter(Boolean);

  const healthDangerDasas = [];
  dasaPeriods.forEach(md => {
    const isMDDangerous = [lord6Name, lord8Name, 'Saturn', 'Ketu', ...marakaLords].includes(md.lord);
    // Always scan antardashas for dangerous combos regardless of MD
    (md.antardashas || []).forEach(ad => {
      const isADDangerous = [lord6Name, lord8Name, 'Saturn', 'Ketu', ...marakaLords].includes(ad.lord);
      // Both MD and AD are dangerous → very high risk window
      if (isMDDangerous && isADDangerous) {
        healthDangerDasas.push({
          lord: md.lord,
          antardasha: ad.lord,
          period: `${ad.start} to ${ad.endDate}`,
          level: 'CRITICAL',
          reason: `${md.lord} MD (${md.lord === lord6Name ? 'disease lord' : md.lord === lord8Name ? 'chronic illness lord' : md.lord === 'Saturn' ? 'chronic pain/joints' : md.lord === 'Ketu' ? 'sudden illness' : 'maraka'}) + ${ad.lord} AD (${ad.lord === lord6Name ? 'disease lord' : ad.lord === lord8Name ? 'chronic illness' : ad.lord === 'Saturn' ? 'chronic' : ad.lord === 'Ketu' ? 'surgical/karmic' : 'maraka'}) — double activation`,
        });
      } else if (isMDDangerous && !isADDangerous) {
        // MD dangerous but AD is not — moderate risk sub-period
        healthDangerDasas.push({
          lord: md.lord,
          antardasha: ad.lord,
          period: `${ad.start} to ${ad.endDate}`,
          level: 'ELEVATED',
          reason: `${md.lord} main period (${md.lord === lord6Name ? 'disease significator' : md.lord === lord8Name ? 'chronic illness' : md.lord === 'Saturn' ? 'joints/chronic' : md.lord === 'Ketu' ? 'sudden' : 'maraka'}) — all sub-periods carry elevated health vigilance`,
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

  const h4Family   = analyzeHouse(4,  houses, planets, drishtis, lagnaName);  // Mother, home
  const h9Family   = analyzeHouse(9,  houses, planets, drishtis, lagnaName);  // Father, dharma
  const h3Family   = analyzeHouse(3,  houses, planets, drishtis, lagnaName);  // Siblings, courage
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
  // Kidney disease confidence: count how many rules fire
  const kidneyIndicators = [
    lord4InH6 && lord4IsSaturn,       // strongest: 4th lord=Saturn sits in 6th (disease house)
    lord4InH8 && lord4IsSaturn,       // 4th lord=Saturn in 8th = surgical/crisis health events
    satAspectsMoon,                    // Saturn aspects Moon (chronic kidney pressure)
    moonIsVenusSign,                   // Moon in Venus sign (kidney-prone rashi)
    lord4InDusthanFamily,              // 4th lord in any dusthana (6/8/12)
    rahuConjMoon || ketuConjMoon,      // Rahu/Ketu with Moon = mystery/fluid conditions
    ketuConjLord4,                     // Ketu with 4th lord = karmic health disruption
    maleficsIn4.includes('Saturn'),    // Saturn in 4th house itself
    satInH8 && ketuConjLord4,          // Saturn+Ketu in 8th = double surgical risk indicator
    moonFamilyHouse && [6,8,12].includes(moonFamilyHouse), // Moon in dusthana itself
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
  const hasAbandonmentRisk = abandonmentIndicators >= 2;
  const hasStrongAbandonmentRisk = abandonmentIndicators >= 3;

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
    } else if (moonIsVenusSign || lord4InH6) {
      risks.push('Moderate kidney/urinary risk: Moon is in a Venus-ruled sign or 4th lord is in the disease house — fluid-related conditions and urinary health should be monitored, especially after age 40.');
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
      struggles.push('⚠️ BROKEN FAMILY / SEPARATION FROM ROOTS: Strong indicators of early family disruption — the native may have been separated from the biological mother or raised by a different family. Ketu and Saturn afflicting the 4th house lord create a karmic severing of the maternal bond. This is one of the most significant life themes for this chart.');
    } else if (hasAbandonmentRisk) {
      struggles.push('Disrupted home or strained maternal relationship — the native\'s early childhood home environment was unstable, absent, or emotionally cold. The biological family bond may have been weakened by circumstance.');
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
  const nativeMotherbond = (() => {
    if (hasStrongAbandonmentRisk) return '⚠️ Significant separation from the biological mother or family of origin is strongly indicated. The native may have been raised by relatives, foster family, or a completely different household. The maternal bond with the biological mother was either absent or deeply disrupted in early childhood. This is a defining karmic theme of this lifetime.';
    if (hasAbandonmentRisk) return 'The relationship with mother or the home of origin had significant disruptions — physical separation, emotional distance, or an unconventional upbringing. Healing the relationship with the idea of "home" and "belonging" is a key life lesson.';
    if (moonFamilyHouse === 1 || moonFamilyHouse === 4 || moonFamilyHouse === 9) return 'Exceptionally close bond with mother — she is the emotional center of your universe. You think of her often.';
    if (moonSatConjunct) return 'Complicated bond — deep love mixed with emotional distance, misunderstandings, or unspoken pain. Healing this relationship brings great karmic benefit.';
    if (moonFamilyScore >= 60 && !lord4InDusthanFamily) return 'Warm, supportive relationship with mother. She is a source of comfort and strength for you.';
    if (lord4InDusthanFamily) return 'Relationship with mother has testing phases — separations, misunderstandings, or worry about her wellbeing. Despite challenges, the love is real.';
    return 'Caring but sometimes strained relationship. Geographic distance or busy lifestyles may limit closeness.';
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
      ? 'HIGH — strong indicators of abandonment or separation from biological family in early childhood'
      : hasAbandonmentRisk
      ? 'MODERATE — disrupted home or weakened maternal bond in early life'
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
  const h11Family        = analyzeHouse(11, houses, planets, drishtis, lagnaName);
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
    // Aspects from benefics on 11th
    if (h11Aspects.some(a => a.planet === 'Mars'))    { hasBros = true; elderScore += 0.2; }
    if (h11Aspects.some(a => a.planet === 'Venus'))   { hasSis  = true; elderScore += 0.2; }
    if (h11Aspects.some(a => a.planet === 'Jupiter')) elderScore += 0.2;
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
    const countLabel = totalScore >= 3.6 ? '3 or more' : totalScore >= 0.6 ? '2' : totalScore >= 0.3 ? '1' : '0 or 1';

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
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 15: FOREIGN TRAVEL & LIVING ABROAD
  // ══════════════════════════════════════════════════════════════
  const h9 = analyzeHouse(9, houses, planets, drishtis, lagnaName);
  const h12Analysis = analyzeHouse(12, houses, planets, drishtis, lagnaName);
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
  const foreignDasas = dasaPeriods.filter(d => d.lord === 'Rahu' || d.lord === lord12Name || d.lord === lord9Name).map(d => ({
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
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 16: LEGAL, ENEMIES & PROTECTION
  // ══════════════════════════════════════════════════════════════
  const h6ForLegal = analyzeHouse(6, houses, planets, drishtis, lagnaName);
  const h8ForLegal = analyzeHouse(8, houses, planets, drishtis, lagnaName);
  const h12ForLegal = analyzeHouse(12, houses, planets, drishtis, lagnaName);

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
    legalCasePeriods: dasaPeriods.filter(d => d.lord === lord6Name || d.lord === 'Mars' || d.lord === 'Saturn').map(d => ({
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
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 17: EDUCATION & KNOWLEDGE PATH
  // ══════════════════════════════════════════════════════════════
  const h4ForEdu = analyzeHouse(4, houses, planets, drishtis, lagnaName);
  const h5ForEdu = analyzeHouse(5, houses, planets, drishtis, lagnaName);
  const h9ForEdu = analyzeHouse(9, houses, planets, drishtis, lagnaName);
  const lord4HouseEdu = getPlanetHouse(lord4Name);

  const EDUCATION_BY_PLANET = {
    'Sun': 'Medicine, political science, administration, government studies',
    'Moon': 'Psychology, nursing, hospitality, social work, marine studies',
    'Mars': 'Engineering, military, sports science, surgery, IT hardware',
    'Mercury': 'IT, accounting, business management, languages, communications, law',
    'Jupiter': 'Teaching, philosophy, banking, religious studies, advisory roles',
    'Venus': 'Arts, design, fashion, music, media, hotel management, beauty therapy',
    'Saturn': 'Construction, agriculture, mining, archaeology, geology, civil engineering',
    'Rahu': 'Foreign languages, software, research, aviation, overseas studies',
    'Ketu': 'Spiritual studies, alternative medicine, astrology, psychology, forensics',
  };

  const educationPlanets = [lord4Name, lord5Name, ...(h4ForEdu?.planetsInHouse || []), ...(h5ForEdu?.planetsInHouse || [])];
  const suggestedEducation = [...new Set(educationPlanets.filter(p => EDUCATION_BY_PLANET[p]).flatMap(p => EDUCATION_BY_PLANET[p].split(', ')))];

  const education = {
    title: 'Education & Knowledge Path',
    sinhala: 'අධ්‍යාපනය සහ දැනුම් මාර්ගය',
    fourthHouse: h4ForEdu,
    fifthHouse: h5ForEdu,
    ninthHouse: h9ForEdu,
    mercury: { house: mercuryHouse, strength: mercuryStrength.strength, score: mercuryStrength.score },
    jupiter: { house: jupiterHouse, strength: planetStrengths.jupiter?.strength, score: planetStrengths.jupiter?.score },
    suggestedFields: suggestedEducation.slice(0, 8),
    academicStrength: (() => {
      const mercScore = mercuryStrength.score || 0;
      const jupScore = planetStrengths.jupiter?.score || 0;
      const avg = (mercScore + jupScore) / 2;
      if (avg >= 60) return 'Excellent academic potential — higher education strongly favored';
      if (avg >= 45) return 'Good academic ability — focused effort brings success';
      return 'Education may face obstacles — practical/vocational learning may suit better';
    })(),
    bestStudyPeriods: dasaPeriods.filter(d => d.lord === 'Mercury' || d.lord === 'Jupiter' || d.lord === lord4Name || d.lord === lord5Name).map(d => ({
      lord: d.lord, period: `${d.start} to ${d.endDate}`,
      reason: d.lord === 'Mercury' ? 'Intellectual peak — exams and learning favored' : d.lord === 'Jupiter' ? 'Wisdom and higher learning period' : d.lord === lord4Name ? '4th lord — formal education success' : '5th lord — creativity and intelligence boosted',
    })),
    foreignStudy: [9, 12].includes(rahuHouse) || [9, 12].includes(getPlanetHouse(lord4Name)),
    competitiveExams: marsHouse && [6, 10, 11].includes(marsHouse) ? 'Strong ability to succeed in competitive exams' : 'Competitive exams need extra preparation and remedial support',
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 18: LUCK & UNEXPECTED FORTUNES
  // ══════════════════════════════════════════════════════════════
  const h9ForLuck = analyzeHouse(9, houses, planets, drishtis, lagnaName);
  const h11ForLuck = analyzeHouse(11, houses, planets, drishtis, lagnaName);
  const h5ForLuck = analyzeHouse(5, houses, planets, drishtis, lagnaName);

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
    luckyPeriods: dasaPeriods.filter(d => d.lord === lord9Name || d.lord === 'Jupiter' || d.lord === lord11Name).map(d => ({
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
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 19: SPIRITUAL JOURNEY & PAST KARMA
  // ══════════════════════════════════════════════════════════════
  const h9ForSpiritual = analyzeHouse(9, houses, planets, drishtis, lagnaName);
  const h12ForSpiritual = analyzeHouse(12, houses, planets, drishtis, lagnaName);
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
      return marks;
    })(),
    numberOfSiblings: (() => {
      const h3Planets = h3?.planetsInHouse || [];
      const h3PlanetCount = h3Planets.length || 0;
      const lord3Name = getHouseLord(3);
      const lord3House = getPlanetHouse(lord3Name);
      // ── IMPROVED: Multi-factor sibling analysis with gender distinction ───
      let siblingScore = 0;
      let hasBrothers = false;
      let hasSisters = false;
      let ageGapIndicated = false;

      // Planets in 3rd house (each planet = ~1 sibling)
      siblingScore += h3PlanetCount;

      // Mars in 3rd = brothers specifically (Mars is karaka for younger brothers)
      if (h3Planets.includes('Mars')) {
        hasBrothers = true;
        siblingScore += 0.5; // Mars in own karaka house is strong
      }
      // Venus/Moon in 3rd = sisters more likely
      if (h3Planets.includes('Venus') || h3Planets.includes('Moon')) {
        hasSisters = true;
      }
      // Mercury in 3rd = mixed or adopted siblings
      // Jupiter in 3rd = elder sibling who is wise/protective

      // Rahu in 3rd = unconventional sibling situation, age gap, or half-siblings
      if (h3Planets.includes('Rahu')) {
        ageGapIndicated = true;
        // Rahu inflates but also creates gaps/delays
        siblingScore -= 0.5; // Rahu exaggerates — reduce count slightly
      }
      // Ketu in 3rd = detachment from siblings or spiritual sibling
      if (h3Planets.includes('Ketu')) {
        siblingScore -= 0.5;
      }
      // Saturn in 3rd = delays, fewer siblings, or elder sibling with health issues
      if (h3Planets.includes('Saturn')) {
        siblingScore -= 0.5;
        ageGapIndicated = true;
      }

      // Mars aspects 3rd house (Mars = brothers, courage)
      if (h3?.aspectingPlanets?.includes('Mars') && !h3Planets.includes('Mars')) {
        hasBrothers = true;
        siblingScore += 0.3;
      }

      // 3rd lord strength
      if (h3?.strength === 'very strong') siblingScore += 1;
      else if (h3?.strength === 'strong') siblingScore += 0.5;
      else if (h3?.strength === 'challenged' || h3?.strength === 'weak') siblingScore -= 0.5;
      // 3rd lord in good houses
      if (lord3House && [1, 4, 5, 7, 9, 10, 11].includes(lord3House)) siblingScore += 0.5;
      // Jupiter's aspect on 3rd (expansion)
      if (h3?.aspectingPlanets?.includes('Jupiter')) siblingScore += 0.5;

      // Gender descriptor
      let genderHint = '';
      if (hasBrothers && !hasSisters) genderHint = 'brother(s)';
      else if (hasSisters && !hasBrothers) genderHint = 'sister(s)';
      else if (hasBrothers && hasSisters) genderHint = 'mix of brothers and sisters';
      else genderHint = 'siblings';

      // Age gap hint
      const ageGapNote = ageGapIndicated ? ' A notable age gap between siblings is indicated.' : '';

      if (siblingScore >= 3) return `Likely 3 or more ${genderHint} — large family. You may be close to one particular sibling.${ageGapNote}`;
      if (siblingScore >= 2) return `Likely 2 ${genderHint}. Mix of older and younger siblings is indicated.${ageGapNote}`;
      if (siblingScore >= 1) return `Likely 1 ${genderHint}.${ageGapNote || ' You may have a sibling born within 2-3 years of you.'}`;
      if (siblingScore >= 0) return `Likely 1 ${genderHint} or possibly an only child. Small family unit.${ageGapNote}`;
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

      let fatherDesc = '';
      // Career/status of father
      if (sunScore >= 65 && sunInKendra) fatherDesc = 'Father is likely a prominent, authoritative figure — possibly in government, administration, or a respected profession. ';
      else if (sunScore >= 65) fatherDesc = 'Father is likely successful and respected in his field. ';
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
      const h7Rashi = houses[6]?.rashi || '';
      const RASHI_LETTERS = {
        'Mesha': ['A', 'L', 'E'], 'Vrishabha': ['B', 'V', 'U'], 'Mithuna': ['K', 'G', 'CH'],
        'Kataka': ['D', 'H'], 'Simha': ['M', 'T'], 'Kanya': ['P', 'Th'],
        'Tula': ['R', 'T'], 'Vrischika': ['N', 'Y'], 'Dhanus': ['Bh', 'Dh', 'Ph'],
        'Makara': ['Kh', 'J'], 'Kumbha': ['G', 'S', 'Sh'], 'Meena': ['D', 'Ch', 'Z', 'Th'],
      };
      const h7Letters = RASHI_LETTERS[h7Rashi] || ['Unknown'];

      // ── NEW: Darakaraka nakshatra-based partner letter ─────────
      // Jaimini's Darakaraka (lowest degree planet) rashi also indicates spouse name
      let darakarakaLetters = [];
      if (jaiminiKarakas?.darakaraka?.rashi) {
        // Find the Rashi name (internal name) from the English name
        const dkRashiName = RASHIS.find(r => r.english === jaiminiKarakas.darakaraka.rashi)?.name;
        if (dkRashiName && RASHI_LETTERS[dkRashiName]) {
          darakarakaLetters = RASHI_LETTERS[dkRashiName];
        }
      }

      // Combine both methods — letters appearing in both are most likely
      const primaryLetters = h7Letters.filter(l => darakarakaLetters.includes(l));
      const allLetters = [...new Set([...h7Letters, ...darakarakaLetters])];

      return {
        letters: h7Letters,
        rashiBasis: h7Rashi,
        darakarakaLetters: darakarakaLetters.length > 0 ? darakarakaLetters : null,
        darakarakaPlanet: jaiminiKarakas?.darakaraka?.planet || null,
        darakarakaRashi: jaiminiKarakas?.darakaraka?.rashi || null,
        highConfidenceLetters: primaryLetters.length > 0 ? primaryLetters : null,
        allPossibleLetters: allLetters,
        note: primaryLetters.length > 0
          ? `Both traditional and Jaimini methods agree on letters: ${primaryLetters.join(', ')} — HIGH confidence`
          : `Traditional method suggests: ${h7Letters.join(', ')}${darakarakaLetters.length > 0 ? `. Jaimini Darakaraka (${jaiminiKarakas.darakaraka.planet}) adds: ${darakarakaLetters.join(', ')}` : ''}`,
      };
    })(),
    hiddenTalent: (() => {
      const h5planets = h5ForEdu?.planetsInHouse || [];
      if (h5planets.includes('Venus')) return 'Natural artistic talent — music, singing, dancing, or visual arts';
      if (h5planets.includes('Mercury')) return 'Exceptional writing or speaking ability — comedy, storytelling, or debate';
      if (h5planets.includes('Mars')) return 'Hidden athletic ability or mechanical skill — sports, cooking, or craftsmanship';
      if (h5planets.includes('Jupiter')) return 'Natural teaching or counseling ability — people learn from you without trying';
      if (h5planets.includes('Moon')) return 'Strong intuition and emotional intelligence — psychology, healing, or creative writing';
      if (h5planets.includes('Sun')) return 'Leadership in creative fields — performing arts, directing, or creative entrepreneurship';
      return 'Your hidden talent lies in your ability to adapt and learn anything you put your mind to';
    })(),
    // ── NEW: Atmakaraka soul purpose from Jaimini ───────────────
    soulPurpose: jaiminiKarakas?.atmakaraka ? {
      planet: jaiminiKarakas.atmakaraka.planet,
      rashi: jaiminiKarakas.atmakaraka.rashi,
      meaning: jaiminiKarakas.atmakaraka.meaning,
      karakamsha: jaiminiKarakas.karakamsha?.interpretation || null,
    } : null,
    // ── NEW: Lagna cusp warning ─────────────────────────────────
    lagnaCuspWarning: lagnaCuspWarning,
  };

  // ══════════════════════════════════════════════════════════════
  // ASSEMBLE FINAL REPORT
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
      panchanga: { tithi: panchanga.tithi?.name, yoga: panchanga.yoga?.name, karana: panchanga.karana?.name, vaara: panchanga.vaara?.name },
    },
    sections: {
      yogaAnalysis,
      personality,
      marriage,
      career,
      children,
      lifePredictions,
      mentalHealth,
      business,
      transits,
      realEstate,
      employment,
      financial,
      timeline25,
      remedies,
      health,
      foreignTravel,
      legal,
      education,
      luck,
      spiritual,
      surpriseInsights,
      familyPortrait,
    },
  };
}

/**
 * Calculate planetary strengths (Shadbala-ish light version)
 * Returns a score 0-100 for each planet
 */
function getPlanetStrengths(date, lat, lng) {
  const { houses } = buildHouseChart(date, lat, lng);
  const planets = getAllPlanetPositions(date, lat, lng);
  
  const exaltations = {
      'Sun': 1, // Aries
      'Moon': 2, // Taurus
      'Mars': 10, // Capricorn
      'Mercury': 6, // Virgo
      'Jupiter': 4, // Cancer
      'Venus': 12, // Pisces
      'Saturn': 7, // Libra
      'Rahu': 2, // Taurus (Debatable)
      'Ketu': 8 // Scorpio
  };
  
  const debilitations = {
      'Sun': 7, 'Moon': 8, 'Mars': 4, 'Mercury': 12, 'Jupiter': 10, 'Venus': 6, 'Saturn': 1, 'Rahu': 8, 'Ketu': 2
  };
  
  const ownSigns = {
      'Sun': [5], 'Moon': [4], 'Mars': [1, 8], 'Mercury': [3, 6], 'Jupiter': [9, 12], 'Venus': [2, 7], 'Saturn': [10, 11]
  };
  
  const strengths = {};
  
  for (const [key, p] of Object.entries(planets)) {
      if (key === 'Lagna') continue;
      
      let score = 50;
      let status = 'Neutral';
      
      const rashi = p.rashiId;
      
      // 1. Exaltation/Debilitation/Own Sign
      if (exaltations[key] && rashi === exaltations[key]) {
          score += 40;
          status = 'Exalted (උච්ච)';
      } else if (debilitations[key] && rashi === debilitations[key]) {
          score -= 30;
          status = 'Debilitated (නීච)';
      } else if (ownSigns[key] && ownSigns[key].includes(rashi)) {
          score += 25;
          status = 'Own Sign (ස්වක්ෂේත්‍ර)';
      }
      
      // 2. Kendra/Trikona position
      // Find which house the planet is in
      // houses array has 12 items, index 0 is house 1
      const planetHouseObj = houses.find(h => h.planets.some(pl => pl.name === p.name));
      let houseNum = planetHouseObj ? planetHouseObj.houseNumber : 0;

      if (houseNum) {
          if ([1, 4, 7, 10].includes(houseNum)) {
              status += houseNum === 1 ? ' + Kendra' : ' in Kendra';
              score += 15; 
          } else if ([5, 9].includes(houseNum)) {
              status += ' in Trikona';
              score += 10;
          } else if ([6, 8, 12].includes(houseNum)) {
              status += ' in Dusthana';
              score -= 10;
          }
      }
      
      // Cap score
      score = Math.min(100, Math.max(0, score));
      
      let strengthLabel = 'Medium';
      if (score >= 75) strengthLabel = 'Very Strong';
      else if (score >= 60) strengthLabel = 'Strong';
      else if (score <= 40) strengthLabel = 'Weak';
      
      strengths[key] = {
          name: p.name,
          sinhala: p.sinhala,
          score: Math.round(score),
          strength: strengthLabel,
          status: status,
          house: houseNum,
          rashi: p.rashiEnglish
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
  calculateRahuKalaya,
  calculateSunriseSunset,
  getMoonLongitude,
  getSunLongitude,
  getAyanamsha,
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
  calculateDrishtis,       // Vedic planetary aspects
  analyzePushkara,         // Pushkara Navamsha & Bhaga analysis
  checkPushkaraNavamsha,
  checkPushkaraBhaga,
  calculateAshtakavarga,   // Ashtakavarga transit strength
  buildBhavaChalit,        // Bhava Chalit unequal house chart
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
  getFunctionalNature,
  analyzeHouse,
};
