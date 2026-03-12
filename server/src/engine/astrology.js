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
 * Calculate Lahiri Ayanamsha
 * Lahiri ayanamsha at J2000.0 (Jan 1, 2000) = 23.853056°
 * Precession rate ≈ 50.29" per year = 0.0137222° per year
 */
function getAyanamsha(date) {
  const jd = dateToJD(date);
  const yearsFromJ2000 = (jd - 2451545.0) / 365.25;
  return LAHIRI_AYANAMSHA_J2000 + AYANAMSHA_RATE * yearsFromJ2000;
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
 * Get accurate planetary longitudes using Swiss Ephemeris (ephemeris package)
 * for Mars, Mercury, Jupiter, Venus, Saturn, and astronomia for Sun & Moon.
 * Rahu/Ketu use mean node calculation.
 * 
 * All positions are tropical apparent longitudes, then converted to sidereal
 * using Lahiri Ayanamsha.
 */
function getAllPlanetPositions(date) {
  const jd = dateToJD(date);
  const T = (jd - 2451545.0) / 36525;
  const ayanamsha = getAyanamsha(date);

  const norm = (deg) => ((deg % 360) + 360) % 360;

  // Sun & Moon from astronomia (Meeus algorithms - already highly accurate)
  const sunTrop = getSunLongitude(date);
  const moonTrop = getMoonLongitude(date);

  // Mars, Mercury, Jupiter, Venus, Saturn from Swiss Ephemeris (ephemeris package)
  // This provides full perturbation-corrected apparent longitudes
  const swissResult = ephemeris.getAllPlanets(date, 6.9271, 79.8612, 0);
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
  const planets = getAllPlanetPositions(date);

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
  const planets = getAllPlanetPositions(date);
  
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
    const planets = getAllPlanetPositions(date);
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
  const planets = getAllPlanetPositions(date);
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
  const planets = getAllPlanetPositions(date);
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
    summary: yogas.length === 0
      ? 'No major classical yogas detected. Individual planet strengths and house placements are the primary indicators.'
      : `${yogas.length} yoga(s) identified. ${yogas.filter(y => y.strength === 'Very Strong' || y.strength === 'Strong').length} are considered powerful.`,
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

  const marriage = {
    title: 'Marriage & Relationships',
    sinhala: 'විවාහය හා සබඳතා',
    seventhHouse: h7,
    seventhLord: { name: lord7Name, house: lord7House, interpretation: lord7House ? `7th lord ${lord7Name} in house ${lord7House} (${HOUSE_SIGNIFICATIONS[lord7House]?.name})` : '' },
    venus: { house: venusHouse, rashi: planets.venus?.rashi, navamshaRashi: navVenus?.navamshaRashiEnglish },
    kujaDosha: { present: kujaDosha, marsHouse, note: kujaDosha ? 'Manglik Dosha present. Should be matched with another Manglik or dosha-cancellation checked.' : 'No Kuja Dosha. Marriage prospects are unobstructed by Mars.' },
    marriageTimingIndicators: marriageTimingDasas,
    spouseQualities: `7th house in ${h7?.rashiEnglish || ''} ruled by ${lord7Name}. ${h7?.planetsInHouse?.length ? 'Planets in 7th (' + h7.planetsInHouse.join(', ') + ') directly influence spouse character.' : 'No planets in 7th — lord\'s position is the primary indicator.'}`,
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 4: CAREER & FINANCIAL STATUS
  // ══════════════════════════════════════════════════════════════
  const h10 = analyzeHouse(10, houses, planets, drishtis, lagnaName);
  const h2 = analyzeHouse(2, houses, planets, drishtis, lagnaName);
  const h11 = analyzeHouse(11, houses, planets, drishtis, lagnaName);
  const lord10Name = getHouseLord(10);
  const lord2Name = getHouseLord(2);
  const lord11Name = getHouseLord(11);

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
  };

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
      assessment: mercuryStrength.score >= 60 && moonStrength.score >= 50
        ? 'Strong intellectual capacity. Education will be a source of success.'
        : mercuryStrength.score >= 40
          ? 'Good learning ability. Focused effort in education will yield results.'
          : 'Education may face some obstacles. Structured learning approach recommended.',
    },
    mentalStability: moonStrength.score >= 70
      ? 'Emotionally stable with good mental resilience'
      : moonStrength.score >= 50
        ? 'Generally stable but may experience emotional fluctuations during Moon-related dashas'
        : 'Mental health needs attention. Meditation, mantra japa, and Moon remedies recommended',
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
  // SECTION 9: SHORT-TERM TRANSITS (Gochara)
  // ══════════════════════════════════════════════════════════════
  const today = new Date();
  const transitPlanets = getAllPlanetPositions(today);
  const transitSun = transitPlanets.sun;
  const transitJupiter = transitPlanets.jupiter;
  const transitSaturn = transitPlanets.saturn;

  const getTransitHouse = (transitRashiId) => {
    const lagnaRashiId = lagna.rashi.id;
    return ((transitRashiId - lagnaRashiId + 12) % 12) + 1;
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

  const transits = {
    title: 'Short-term Transits (Gochara)',
    sinhala: 'ගෝචර ග්‍රහ සංක්‍රමණ',
    date: today.toISOString().split('T')[0],
    sun: {
      currentSign: transitSun.rashiEnglish,
      houseFromLagna: getTransitHouse(transitSun.rashiId),
      effect: TRANSIT_HOUSE_EFFECTS[getTransitHouse(transitSun.rashiId)] || '',
      duration: '~30 days per sign',
    },
    jupiter: {
      currentSign: transitJupiter.rashiEnglish,
      houseFromLagna: getTransitHouse(transitJupiter.rashiId),
      effect: TRANSIT_HOUSE_EFFECTS[getTransitHouse(transitJupiter.rashiId)] || '',
      duration: '~13 months per sign',
      note: 'Jupiter transits are among the most important in Vedic astrology',
    },
    saturn: {
      currentSign: transitSaturn.rashiEnglish,
      houseFromLagna: getTransitHouse(transitSaturn.rashiId),
      effect: TRANSIT_HOUSE_EFFECTS[getTransitHouse(transitSaturn.rashiId)] || '',
      duration: '~2.5 years per sign',
      sadheSati: (() => {
        const satFromMoon = ((transitSaturn.rashiId - moonRashi.id + 12) % 12) + 1;
        if (satFromMoon === 12) return { active: true, phase: 'Rising (ආරෝහණ)', note: 'Saturn entering 12th from Moon — Sade Sati beginning. Emotional challenges and transformation ahead.' };
        if (satFromMoon === 1) return { active: true, phase: 'Peak (උච්ච)', note: 'Saturn over natal Moon — Peak Sade Sati. Maximum pressure but also maximum growth.' };
        if (satFromMoon === 2) return { active: true, phase: 'Setting (අවරෝහණ)', note: 'Saturn in 2nd from Moon — Final phase of Sade Sati. Financial adjustments.' };
        return { active: false, phase: 'Not active', note: 'Sade Sati is not currently active.' };
      })(),
    },
    ashtakavargaTransit: {
      jupiterSignBindus: ashtakavarga?.sarvashtakavarga?.[transitJupiter.rashiId - 1] || 0,
      saturnSignBindus: ashtakavarga?.sarvashtakavarga?.[transitSaturn.rashiId - 1] || 0,
      note: 'Transits through signs with 28+ Sarvashtakavarga bindus give favorable results',
    },
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
    },
  };
}

/**
 * Calculate planetary strengths (Shadbala-ish light version)
 * Returns a score 0-100 for each planet
 */
function getPlanetStrengths(date, lat, lng) {
  const { houses } = buildHouseChart(date, lat, lng);
  const planets = getAllPlanetPositions(date);
  
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
  const planets = getAllPlanetPositions(date);
  
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
  generateFullReport,      // Comprehensive 13-section Jyotish report
  getFunctionalNature,
  analyzeHouse,
};
