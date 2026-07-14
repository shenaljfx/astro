/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MUHURTHA (ELECTIONAL ASTROLOGY) ENGINE — "When Should I Do X?"
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Finds the most auspicious date/time for important life activities based on
 * traditional Vedic Muhurtha rules with Sri Lankan Nekath traditions.
 *
 * Activities covered:
 *   - Wedding (Poruwa) ceremony
 *   - Business start / Company registration
 *   - Vehicle purchase
 *   - House construction / Ground breaking
 *   - Travel (domestic and foreign)
 *   - Education start / Exam sitting
 *   - Name ceremony / Baby naming
 *   - Moving into new house
 *   - Surgery timing
 *   - Financial transactions / Major purchases
 *
 * Scoring system (out of 100):
 *   1. Tithi suitability (0–15)
 *   2. Nakshatra suitability (0–15)
 *   3. Yoga suitability (0–10)
 *   4. Karana suitability (0–5)
 *   5. Rahu Kala avoidance (0 or –20)
 *   6. Gulika Kala avoidance (0 or –15)
 *   7. Yamaghanta avoidance (0 or –10)
 *   8. Tarabala – natal Nakshatra compatibility (0–10)
 *   9. Chandrabala – Moon house quality (0–10)
 *  10. Lagna strength at the chosen time (0–10)
 *
 * Based on: Muhurtha Chintamani, Kaala Prakashika, Sri Lankan Nekath Shastra
 *
 * Author: Grahachara Engine v4.0
 */

const {
  NAKSHATRAS, RASHIS, PLANETS,
  getAllPlanetPositions, getLagna, getPanchanga, getDailyNakath,
  calculateRahuKalaya, calculateSunriseSunset,
  toSidereal, getMoonLongitude, getNakshatra, getRashi,
  getTithi, getYoga, getKarana, dateToJD,
} = require('./astrology');
const { formatLocalDateTime } = require('./calculationSettings');


// ═══════════════════════════════════════════════════════════════════════════
//  NAKSHATRA CLASSIFICATION FOR MUHURTHA
// ═══════════════════════════════════════════════════════════════════════════

// Fixed / Sthira — good for permanent works (house, wedding)
const FIXED_NAKSHATRAS = ['Rohini', 'Uttara Phalguni', 'Uttara Ashadha', 'Uttara Bhadrapada'];
// Moveable / Chara — good for travel, vehicles, journeys
const MOVEABLE_NAKSHATRAS = ['Ashwini', 'Pushya', 'Hasta', 'Ashlesha', 'Punarvasu', 'Mrigashira', 'Shravana', 'Dhanishtha', 'Shatabhisha', 'Revati', 'Swati', 'Anuradha'];
// Fierce / Ugra — good for destruction, surgery, combat-related activities
const FIERCE_NAKSHATRAS = ['Ardra', 'Ashlesha', 'Jyeshtha', 'Mula'];
// Mixed / Mishra — ok for many things
const MIXED_NAKSHATRAS = ['Krittika', 'Vishakha'];
// Sharp / Tikshna — good for sharp/pointed activities (surgery, research)
const SHARP_NAKSHATRAS = ['Ardra', 'Ashlesha', 'Jyeshtha', 'Mula'];
// Soft / Mridu — good for arts, romance, clothing, beauty
const SOFT_NAKSHATRAS = ['Mrigashira', 'Chitra', 'Anuradha', 'Revati'];
// Auspicious for most activities
const GENERALLY_AUSPICIOUS = ['Ashwini', 'Rohini', 'Mrigashira', 'Punarvasu', 'Pushya', 'Hasta', 'Chitra', 'Swati', 'Anuradha', 'Shravana', 'Dhanishtha', 'Revati', 'Uttara Phalguni', 'Uttara Ashadha', 'Uttara Bhadrapada'];
// Bad Nakshatras (avoid for positive events)
const INAUSPICIOUS_NAKSHATRAS = ['Bharani', 'Magha', 'Purva Phalguni', 'Purva Ashadha', 'Purva Bhadrapada'];

// Tithis
const GOOD_TITHIS = [2, 3, 5, 7, 10, 11, 13]; // 2nd, 3rd, 5th, 7th, 10th, 11th, 13th
const RIKTA_TITHIS = [4, 9, 14]; // 4th, 9th, 14th — avoid for positive events
const BAD_TITHIS = [8, 12, 30]; // 8th, 12th, Amavasya (30 = new moon)
const FULL_MOON = 15;

// Yogas (Panchanga)
const GOOD_YOGAS = ['Siddhi', 'Amrita', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Priti', 'Ayushman', 'Saubhagya', 'Sobhana', 'Sukarma', 'Dhriti', 'Harshana', 'Vardhamana', 'Dhruva', 'Siddha'];
const BAD_YOGAS = ['Vishkumbha', 'Atiganda', 'Shula', 'Gandha', 'Vyaghata', 'Vajra', 'Vyatipata', 'Parigha', 'Vaidhriti'];

// Karanas
const GOOD_KARANAS = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Garija', 'Vanija', 'Vishti_no']; // Vishti (Bhadra) is always bad
const BAD_KARANAS = ['Vishti']; // Bhadra Karana — always avoid


// ═══════════════════════════════════════════════════════════════════════════
//  GULIKA KALA & YAMAGHANTA CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate Gulika Kala (Mandi) — Saturn's sub-period, most malefic
 * Like Rahu Kala, daylight is divided into 8 segments.
 * Gulika segment by day: Sun=7, Mon=6, Tue=5, Wed=4, Thu=3, Fri=2, Sat=1
 */
function calculateGulikaKala(date, lat = 6.9271, lng = 79.8612) {
  const { sunrise, sunset } = calculateSunriseSunset(date, lat, lng);
  const daylightMs = sunset.getTime() - sunrise.getTime();
  const segmentMs = daylightMs / 8;

  const GULIKA_SEGMENTS = { 0: 7, 1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 };
  const seg = GULIKA_SEGMENTS[date.getDay()];

  return {
    start: new Date(sunrise.getTime() + (seg - 1) * segmentMs),
    end: new Date(sunrise.getTime() + seg * segmentMs),
  };
}

/**
 * Calculate Yamaghanta Kala — death-related sub-period
 * Yamaghanta segment by day: Sun=5, Mon=4, Tue=3, Wed=2, Thu=1, Fri=7, Sat=6
 */
function calculateYamaghanta(date, lat = 6.9271, lng = 79.8612) {
  const { sunrise, sunset } = calculateSunriseSunset(date, lat, lng);
  const daylightMs = sunset.getTime() - sunrise.getTime();
  const segmentMs = daylightMs / 8;

  const YAMAGHANTA_SEGMENTS = { 0: 5, 1: 4, 2: 3, 3: 2, 4: 1, 5: 7, 6: 6 };
  const seg = YAMAGHANTA_SEGMENTS[date.getDay()];

  return {
    start: new Date(sunrise.getTime() + (seg - 1) * segmentMs),
    end: new Date(sunrise.getTime() + seg * segmentMs),
  };
}

/**
 * Calculate Durmuhurtha — inauspicious 48-minute sub-period
 * Varies by day of week. Simplified: 2 Durmuhurthas per day.
 * Sun: seg 5,6; Mon: seg 2,3; Tue: seg 3,4; Wed: seg 5,6; Thu: seg 6,7; Fri: seg 4,5; Sat: seg 1,2
 * (Each segment = daylight / 15 = ~48 minutes)
 */
function calculateDurmuhurtha(date, lat = 6.9271, lng = 79.8612) {
  const { sunrise, sunset } = calculateSunriseSunset(date, lat, lng);
  const daylightMs = sunset.getTime() - sunrise.getTime();
  const segmentMs = daylightMs / 15;

  const DURMUHURTHA_SEGMENTS = {
    0: [10, 11], 1: [3, 4], 2: [4, 5], 3: [10, 11],
    4: [11, 12], 5: [7, 8], 6: [1, 2],
  };
  const segs = DURMUHURTHA_SEGMENTS[date.getDay()] || [1, 2];

  return segs.map(seg => ({
    start: new Date(sunrise.getTime() + (seg - 1) * segmentMs),
    end: new Date(sunrise.getTime() + seg * segmentMs),
  }));
}


// ═══════════════════════════════════════════════════════════════════════════
//  DISHA SHOOLA — travel direction of the day
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Disha Shoola (දිශා ශූලය) — the classical weekday rule: one cardinal
 * direction is "blocked" each day; SETTING OUT toward it is inauspicious.
 * The opposite direction is the day's best for departures, and the same
 * facing is used when entering/receiving (ගෙට ඇතුළු වීම).
 *
 *   Mon & Sat → East blocked   ·   Sun & Fri → West blocked
 *   Tue & Wed → North blocked  ·   Thu       → South blocked
 */
const DISHA_SHOOLA = {
  0: 'West', 1: 'East', 2: 'North', 3: 'North', 4: 'South', 5: 'West', 6: 'East',
};
const DIRECTION_SI = { East: 'නැගෙනහිර', West: 'බටහිර', North: 'උතුර', South: 'දකුණ' };
const OPPOSITE_DIRECTION = { East: 'West', West: 'East', North: 'South', South: 'North' };

/**
 * Direction guidance for a given datetime (weekday-based).
 * @returns {{ best: {en,si}, avoid: {en,si}, rule: string }}
 */
function getTravelDirections(dateTime) {
  const avoid = DISHA_SHOOLA[new Date(dateTime).getDay()];
  const best = OPPOSITE_DIRECTION[avoid];
  return {
    best: { en: best, si: DIRECTION_SI[best] },
    avoid: { en: avoid, si: DIRECTION_SI[avoid] },
    rule: 'Disha Shoola',
  };
}


// ═══════════════════════════════════════════════════════════════════════════
//  TARABALA & CHANDRABALA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate Tarabala — compatibility between transit Nakshatra and natal Nakshatra
 * Count from natal to transit, mod 9, get Tara name and quality
 */
function calculateTarabala(transitNakshatraIdx, natalNakshatraIdx) {
  const count = ((transitNakshatraIdx - natalNakshatraIdx + 27) % 27) + 1;
  const taraIdx = ((count - 1) % 9);
  const TARA_NAMES = ['Janma', 'Sampat', 'Vipat', 'Kshema', 'Pratyari', 'Sadhaka', 'Vadha', 'Mitra', 'Ati-Mitra'];
  const TARA_QUALITY = ['bad', 'good', 'bad', 'good', 'bad', 'good', 'bad', 'good', 'good'];

  return {
    name: TARA_NAMES[taraIdx],
    number: count,
    quality: TARA_QUALITY[taraIdx],
    score: TARA_QUALITY[taraIdx] === 'good' ? 10 : (TARA_NAMES[taraIdx] === 'Vadha' ? 0 : 3),
  };
}

/**
 * Calculate Chandrabala — quality of Moon's house position from natal Moon
 * Good houses from Moon: 1, 3, 6, 7, 10, 11
 */
function calculateChandrabala(transitMoonRashiId, natalMoonRashiId) {
  const house = ((transitMoonRashiId - natalMoonRashiId + 12) % 12) + 1;
  const GOOD_HOUSES = [1, 3, 6, 7, 10, 11];
  const isGood = GOOD_HOUSES.includes(house);

  return {
    house,
    quality: isGood ? 'good' : 'bad',
    score: isGood ? 10 : 2,
  };
}


// ═══════════════════════════════════════════════════════════════════════════
//  ACTIVITY-SPECIFIC NAKSHATRA & TITHI RULES
// ═══════════════════════════════════════════════════════════════════════════

const ACTIVITY_RULES = {
  wedding: {
    name: 'Wedding / Poruwa Ceremony',
    sinhala: 'විවාහය / පොරුව උත්සවය',
    icon: '💒',
    goodNakshatras: ['Rohini', 'Mrigashira', 'Uttara Phalguni', 'Hasta', 'Swati', 'Anuradha', 'Uttara Ashadha', 'Uttara Bhadrapada', 'Revati', 'Magha', 'Shravana'],
    badNakshatras: ['Bharani', 'Ardra', 'Ashlesha', 'Jyeshtha', 'Mula', 'Purva Bhadrapada', 'Krittika'],
    goodTithis: [2, 3, 5, 7, 10, 11, 13, 15], // include Purnima (full moon)
    badTithis: [4, 8, 9, 12, 14, 30], // avoid Rikta, Amavasya
    goodWeekdays: [1, 3, 4, 5], // Mon, Wed, Thu, Fri
    badWeekdays: [2, 6], // Tue, Sat
    avoidRahuKala: true,
    avoidGulikaKala: true,
    avoidYamaghanta: true,
    lagnaCheck: true,
    needsTarabala: true,
    needsChandrabala: true,
  },
  business: {
    name: 'Business Start / Registration',
    sinhala: 'ව්‍යාපාර ආරම්භය / ලියාපදිංචිය',
    icon: '🏢',
    goodNakshatras: ['Ashwini', 'Rohini', 'Mrigashira', 'Punarvasu', 'Pushya', 'Hasta', 'Chitra', 'Swati', 'Anuradha', 'Shravana', 'Dhanishtha', 'Revati'],
    badNakshatras: ['Bharani', 'Ardra', 'Ashlesha', 'Jyeshtha', 'Mula', 'Purva Bhadrapada'],
    goodTithis: [2, 3, 5, 7, 10, 11, 13],
    badTithis: [4, 8, 9, 14, 30],
    goodWeekdays: [1, 3, 4, 5], // Mon, Wed, Thu, Fri
    badWeekdays: [2, 6],
    avoidRahuKala: true,
    avoidGulikaKala: true,
    avoidYamaghanta: false,
    lagnaCheck: true,
    needsTarabala: true,
    needsChandrabala: true,
  },
  vehicle: {
    name: 'Vehicle Purchase / First Drive',
    sinhala: 'වාහන මිලදී ගැනීම / පළමු ධාවනය',
    icon: '🚗',
    goodNakshatras: ['Ashwini', 'Rohini', 'Pushya', 'Hasta', 'Chitra', 'Swati', 'Anuradha', 'Shravana', 'Dhanishtha', 'Revati'],
    badNakshatras: ['Bharani', 'Ardra', 'Ashlesha', 'Jyeshtha', 'Mula', 'Vishakha'],
    goodTithis: [2, 3, 5, 7, 10, 11, 13],
    badTithis: [4, 8, 9, 14, 30],
    goodWeekdays: [1, 3, 4, 5],
    badWeekdays: [2, 6],
    avoidRahuKala: true,
    avoidGulikaKala: true,
    avoidYamaghanta: true,
    lagnaCheck: false,
    needsTarabala: true,
    needsChandrabala: true,
  },
  construction: {
    name: 'House Construction / Ground Breaking',
    sinhala: 'නිවාස ඉදිකිරීම / මුල්ගල තැබීම',
    icon: '🏗️',
    goodNakshatras: ['Rohini', 'Uttara Phalguni', 'Uttara Ashadha', 'Uttara Bhadrapada', 'Mrigashira', 'Pushya', 'Chitra', 'Hasta', 'Swati', 'Anuradha', 'Shravana', 'Revati'],
    badNakshatras: ['Bharani', 'Ardra', 'Ashlesha', 'Jyeshtha', 'Mula', 'Purva Bhadrapada', 'Purva Phalguni', 'Purva Ashadha'],
    goodTithis: [2, 3, 5, 7, 10, 11, 13],
    badTithis: [4, 8, 9, 14, 30],
    goodWeekdays: [1, 3, 4, 5],
    badWeekdays: [2, 6],
    avoidRahuKala: true,
    avoidGulikaKala: true,
    avoidYamaghanta: true,
    lagnaCheck: true,
    needsTarabala: true,
    needsChandrabala: true,
  },
  travel: {
    name: 'Journey / Travel Start',
    sinhala: 'ගමන / යාත්‍රාව ආරම්භය',
    icon: '✈️',
    goodNakshatras: MOVEABLE_NAKSHATRAS,
    badNakshatras: ['Bharani', 'Ardra', 'Ashlesha', 'Jyeshtha', 'Mula'],
    goodTithis: [2, 3, 5, 7, 10, 11, 13],
    badTithis: [4, 8, 9, 14, 30],
    goodWeekdays: [1, 3, 4, 5],
    badWeekdays: [2, 6, 0], // also avoid Sunday for travel
    avoidRahuKala: true,
    avoidGulikaKala: false,
    avoidYamaghanta: true,
    lagnaCheck: false,
    needsTarabala: true,
    needsChandrabala: true,
  },
  education: {
    name: 'Education Start / Exam',
    sinhala: 'අධ්‍යාපන ආරම්භය / විභාගය',
    icon: '📚',
    goodNakshatras: ['Ashwini', 'Rohini', 'Mrigashira', 'Punarvasu', 'Pushya', 'Hasta', 'Chitra', 'Swati', 'Anuradha', 'Shravana', 'Dhanishtha', 'Revati', 'Uttara Phalguni'],
    badNakshatras: ['Bharani', 'Ardra', 'Ashlesha', 'Jyeshtha', 'Mula'],
    goodTithis: [2, 3, 5, 7, 10, 11, 13],
    badTithis: [4, 8, 9, 14, 30],
    goodWeekdays: [1, 3, 4, 5],
    badWeekdays: [2, 6],
    avoidRahuKala: true,
    avoidGulikaKala: false,
    avoidYamaghanta: false,
    lagnaCheck: false,
    needsTarabala: true,
    needsChandrabala: true,
  },
  nameCeremony: {
    name: 'Name Ceremony / Baby Naming',
    sinhala: 'නම තැබීමේ උත්සවය',
    icon: '👶',
    goodNakshatras: ['Ashwini', 'Rohini', 'Mrigashira', 'Punarvasu', 'Pushya', 'Hasta', 'Chitra', 'Swati', 'Anuradha', 'Shravana', 'Uttara Phalguni', 'Uttara Ashadha', 'Uttara Bhadrapada', 'Revati'],
    badNakshatras: ['Bharani', 'Ardra', 'Ashlesha', 'Jyeshtha', 'Mula', 'Krittika'],
    goodTithis: [2, 3, 5, 7, 10, 11, 13, 15],
    badTithis: [4, 8, 9, 14, 30],
    goodWeekdays: [1, 3, 4, 5],
    badWeekdays: [2, 6],
    avoidRahuKala: true,
    avoidGulikaKala: true,
    avoidYamaghanta: true,
    lagnaCheck: false,
    needsTarabala: true,
    needsChandrabala: true,
  },
  firstFeeding: {
    name: 'First Feeding (Indul Katha Gaema)',
    sinhala: 'ඉඳුල් කට ගෑම',
    icon: '🍚',
    goodNakshatras: ['Ashwini', 'Rohini', 'Mrigashira', 'Punarvasu', 'Pushya', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Anuradha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha', 'Uttara Bhadrapada', 'Revati'],
    badNakshatras: ['Bharani', 'Krittika', 'Ardra', 'Ashlesha', 'Magha', 'Jyeshtha', 'Mula', 'Purva Phalguni', 'Purva Ashadha', 'Purva Bhadrapada'],
    goodTithis: [2, 3, 5, 7, 10, 11, 13, 15],
    badTithis: [4, 8, 9, 14, 30],
    goodWeekdays: [1, 3, 4, 5], // Mon, Wed, Thu, Fri
    badWeekdays: [2, 6],
    avoidRahuKala: true,
    avoidGulikaKala: true,
    avoidYamaghanta: true,
    lagnaCheck: false,
    needsTarabala: true,
    needsChandrabala: true,
  },
  movingIn: {
    name: 'Moving Into New House',
    sinhala: 'නව නිවසට ඇතුළුවීම',
    icon: '🏠',
    goodNakshatras: FIXED_NAKSHATRAS.concat(['Pushya', 'Mrigashira', 'Chitra', 'Swati', 'Anuradha', 'Shravana', 'Dhanishtha', 'Revati']),
    badNakshatras: ['Bharani', 'Ardra', 'Ashlesha', 'Jyeshtha', 'Mula', 'Purva Bhadrapada'],
    goodTithis: [2, 3, 5, 7, 10, 11, 13],
    badTithis: [4, 8, 9, 14, 30],
    goodWeekdays: [1, 3, 4, 5],
    badWeekdays: [2, 6],
    avoidRahuKala: true,
    avoidGulikaKala: true,
    avoidYamaghanta: true,
    lagnaCheck: true,
    needsTarabala: true,
    needsChandrabala: true,
  },
  surgery: {
    name: 'Surgery / Medical Procedure',
    sinhala: 'ශල්‍ය කර්මය / වෛද්‍ය ක්‍රියාමාර්ග',
    icon: '🏥',
    goodNakshatras: ['Ashwini', 'Ardra', 'Hasta', 'Chitra', 'Mula', 'Jyeshtha', 'Anuradha', 'Shravana'],
    badNakshatras: ['Bharani', 'Rohini', 'Uttara Phalguni', 'Vishakha', 'Purva Bhadrapada'],
    goodTithis: [2, 3, 5, 7, 10, 11],
    badTithis: [4, 8, 9, 14, 15, 30], // avoid full moon too for surgery
    goodWeekdays: [1, 3, 4, 5],
    badWeekdays: [2, 6, 0],
    avoidRahuKala: true,
    avoidGulikaKala: true,
    avoidYamaghanta: true,
    lagnaCheck: false,
    needsTarabala: true,
    needsChandrabala: true,
    specialRule: 'Avoid Moon transiting the body part being operated — check house-body mapping',
  },
  financialTransaction: {
    name: 'Major Financial Transaction',
    sinhala: 'ප්‍රධාන මූල්‍ය ගනුදෙනුව',
    icon: '💳',
    goodNakshatras: ['Ashwini', 'Rohini', 'Pushya', 'Hasta', 'Chitra', 'Swati', 'Anuradha', 'Shravana', 'Revati', 'Uttara Phalguni', 'Uttara Ashadha'],
    badNakshatras: ['Bharani', 'Ardra', 'Ashlesha', 'Jyeshtha', 'Mula'],
    goodTithis: [2, 3, 5, 7, 10, 11, 13],
    badTithis: [4, 8, 9, 14, 30],
    goodWeekdays: [1, 3, 4, 5],
    badWeekdays: [2, 6],
    avoidRahuKala: true,
    avoidGulikaKala: true,
    avoidYamaghanta: false,
    lagnaCheck: false,
    needsTarabala: true,
    needsChandrabala: true,
  },
};


// ═══════════════════════════════════════════════════════════════════════════
//  CORE: Score a Specific Date-Time for an Activity
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Score a specific datetime for a given activity type
 * @param {Date} dateTime — the datetime to evaluate
 * @param {string} activityType — key from ACTIVITY_RULES
 * @param {Date} [birthDate] — user's birth date (for Tarabala/Chandrabala)
 * @param {number} [lat] — latitude
 * @param {number} [lng] — longitude
 * @param {Date} [partnerBirthDate] — partner's birth date. For two-person
 *   events (weddings) the day must clear Tarabala/Chandrabala for BOTH people;
 *   the personalized factors then score the pair, warning if either is weak.
 * @returns {Object} score breakdown
 */
function scoreMuhurtha(dateTime, activityType, birthDate, lat = 6.9271, lng = 79.8612, partnerBirthDate = null) {
  const rules = ACTIVITY_RULES[activityType];
  if (!rules) {
    throw new Error(`Unknown activity: ${activityType}. Valid: ${Object.keys(ACTIVITY_RULES).join(', ')}`);
  }

  const dt = new Date(dateTime);
  let totalScore = 0;
  const breakdown = {};
  const warnings = [];

  // 1. PANCHANGA ELEMENTS
  const panchanga = getPanchanga(dt, lat, lng);

  // ── Tithi Score (0-15) ──
  const tithiNum = panchanga.tithi?.number || 1;
  let tithiScore = 7; // default neutral
  if (rules.goodTithis.includes(tithiNum)) tithiScore = 15;
  else if (rules.badTithis.includes(tithiNum)) { tithiScore = 0; warnings.push(`Tithi ${panchanga.tithi?.name} is inauspicious for ${rules.name}`); }
  else if (RIKTA_TITHIS.includes(tithiNum)) { tithiScore = 2; warnings.push('Rikta Tithi — generally weak energy'); }
  breakdown.tithi = { name: panchanga.tithi?.name, number: tithiNum, paksha: panchanga.tithi?.paksha || null, score: tithiScore, max: 15 };
  totalScore += tithiScore;

  // ── Nakshatra Score (0-15) ──
  const nakName = panchanga.nakshatra?.name || '';
  let nakScore = 7;
  if (rules.goodNakshatras.includes(nakName)) nakScore = 15;
  else if (rules.badNakshatras.includes(nakName)) { nakScore = 0; warnings.push(`${nakName} Nakshatra is not suitable for ${rules.name}`); }
  else if (GENERALLY_AUSPICIOUS.includes(nakName)) nakScore = 10;
  else if (INAUSPICIOUS_NAKSHATRAS.includes(nakName)) nakScore = 3;
  breakdown.nakshatra = { name: nakName, sinhala: panchanga.nakshatra?.sinhala || null, score: nakScore, max: 15 };
  totalScore += nakScore;

  // ── Yoga Score (0-10) ──
  const yogaName = panchanga.yoga?.name || '';
  let yogaScore = 5;
  if (GOOD_YOGAS.includes(yogaName)) yogaScore = 10;
  else if (BAD_YOGAS.includes(yogaName)) { yogaScore = 0; warnings.push(`${yogaName} Yoga is inauspicious`); }
  breakdown.yoga = { name: yogaName, score: yogaScore, max: 10 };
  totalScore += yogaScore;

  // ── Karana Score (0-5) ──
  const karanaName = panchanga.karana?.name || '';
  let karanaScore = 3;
  if (BAD_KARANAS.some(k => karanaName.includes(k))) { karanaScore = 0; warnings.push('Vishti (Bhadra) Karana — strongly inauspicious'); }
  else if (GOOD_KARANAS.some(k => karanaName.includes(k))) karanaScore = 5;
  breakdown.karana = { name: karanaName, score: karanaScore, max: 5 };
  totalScore += karanaScore;

  // ── Weekday ──
  const dayNum = dt.getDay();
  let weekdayScore = 5;
  if (rules.goodWeekdays.includes(dayNum)) weekdayScore = 8;
  else if (rules.badWeekdays.includes(dayNum)) { weekdayScore = 0; warnings.push(`${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dayNum]} is not ideal for ${rules.name}`); }
  breakdown.weekday = { day: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dayNum], score: weekdayScore, max: 8 };
  totalScore += weekdayScore;

  // 2. INAUSPICIOUS PERIOD CHECKS

  // ── Rahu Kala (−20 if overlaps) ──
  if (rules.avoidRahuKala) {
    try {
      const rahuKala = calculateRahuKalaya(dt, lat, lng);
      const dtTime = dt.getTime();
      if (dtTime >= rahuKala.start.getTime() && dtTime <= rahuKala.end.getTime()) {
        totalScore -= 20;
        warnings.push('⚠️ Falls within Rahu Kala — strongly inauspicious. Avoid this time.');
        breakdown.rahuKala = { blocked: true, penalty: -20, period: `${formatTime(rahuKala.start)} – ${formatTime(rahuKala.end)}` };
      } else {
        breakdown.rahuKala = { blocked: false, penalty: 0 };
      }
    } catch (e) { breakdown.rahuKala = { blocked: false, penalty: 0 }; }
  }

  // ── Gulika Kala (−15 if overlaps) ──
  if (rules.avoidGulikaKala) {
    try {
      const gulika = calculateGulikaKala(dt, lat, lng);
      const dtTime = dt.getTime();
      if (dtTime >= gulika.start.getTime() && dtTime <= gulika.end.getTime()) {
        totalScore -= 15;
        warnings.push('⚠️ Falls within Gulika Kala — inauspicious period');
        breakdown.gulikaKala = { blocked: true, penalty: -15, period: `${formatTime(gulika.start)} – ${formatTime(gulika.end)}` };
      } else {
        breakdown.gulikaKala = { blocked: false, penalty: 0 };
      }
    } catch (e) { breakdown.gulikaKala = { blocked: false, penalty: 0 }; }
  }

  // ── Yamaghanta (−10 if overlaps) ──
  if (rules.avoidYamaghanta) {
    try {
      const yama = calculateYamaghanta(dt, lat, lng);
      const dtTime = dt.getTime();
      if (dtTime >= yama.start.getTime() && dtTime <= yama.end.getTime()) {
        totalScore -= 10;
        warnings.push('⚠️ Falls within Yamaghanta — avoid for auspicious activities');
        breakdown.yamaghanta = { blocked: true, penalty: -10, period: `${formatTime(yama.start)} – ${formatTime(yama.end)}` };
      } else {
        breakdown.yamaghanta = { blocked: false, penalty: 0 };
      }
    } catch (e) { breakdown.yamaghanta = { blocked: false, penalty: 0 }; }
  }

  // 3. PERSONALIZED CHECKS (require birth date)

  if (birthDate) {
    // Transit Moon depends only on the chosen datetime — compute once, then
    // score each person's natal Moon against it.
    const transitMoonSid = toSidereal(getMoonLongitude(dt), dt);
    const transitNakIdx = Math.floor(transitMoonSid / (360 / 27));
    const transitMoonRashiId = Math.floor(transitMoonSid / 30) + 1;

    const natalOf = (bd) => {
      const sid = toSidereal(getMoonLongitude(bd), bd);
      return { nakIdx: Math.floor(sid / (360 / 27)), rashiId: Math.floor(sid / 30) + 1 };
    };
    const primary = natalOf(new Date(birthDate));
    const partner = partnerBirthDate ? natalOf(new Date(partnerBirthDate)) : null;

    // ── Tarabala (0-10) ── with a partner, both stars are scored and the
    // day carries the average; a weak star on either side raises a warning.
    if (rules.needsTarabala) {
      const taraA = calculateTarabala(transitNakIdx, primary.nakIdx);
      if (partner) {
        const taraB = calculateTarabala(transitNakIdx, partner.nakIdx);
        const combined = Math.round((taraA.score + taraB.score) / 2);
        breakdown.tarabala = {
          dual: true, max: 10, combined,
          name: taraA.name, quality: taraA.quality, score: taraA.score,
          partnerName: taraB.name, partnerQuality: taraB.quality, partnerScore: taraB.score,
        };
        totalScore += combined;
        if (taraA.quality === 'bad') warnings.push(`${taraA.name} Tara — weak for the first partner's birth star`);
        if (taraB.quality === 'bad') warnings.push(`${taraB.name} Tara — weak for the second partner's birth star`);
      } else {
        breakdown.tarabala = { name: taraA.name, quality: taraA.quality, score: taraA.score, max: 10 };
        totalScore += taraA.score;
        if (taraA.quality === 'bad') warnings.push(`${taraA.name} Tara — not ideal for your birth star`);
      }
    }

    // ── Chandrabala (0-10) ── same pairing logic for the Moon's house.
    if (rules.needsChandrabala) {
      const chandraA = calculateChandrabala(transitMoonRashiId, primary.rashiId);
      if (partner) {
        const chandraB = calculateChandrabala(transitMoonRashiId, partner.rashiId);
        const combined = Math.round((chandraA.score + chandraB.score) / 2);
        breakdown.chandrabala = {
          dual: true, max: 10, combined,
          house: chandraA.house, quality: chandraA.quality, score: chandraA.score,
          partnerHouse: chandraB.house, partnerQuality: chandraB.quality, partnerScore: chandraB.score,
        };
        totalScore += combined;
        if (chandraA.quality === 'bad') warnings.push(`Weak Chandrabala for the first partner (Moon in house ${chandraA.house})`);
        if (chandraB.quality === 'bad') warnings.push(`Weak Chandrabala for the second partner (Moon in house ${chandraB.house})`);
      } else {
        breakdown.chandrabala = { house: chandraA.house, quality: chandraA.quality, score: chandraA.score, max: 10 };
        totalScore += chandraA.score;
        if (chandraA.quality === 'bad') warnings.push(`Moon in house ${chandraA.house} from your natal Moon — weak Chandrabala`);
      }
    }
  }

  // 4. LAGNA STRENGTH (if applicable)
  if (rules.lagnaCheck) {
    try {
      const lagna = getLagna(dt, lat, lng);
      const lagnaLord = lagna.rashi.lord;
      // Check if Lagna is in a fixed sign (good for permanent activities)
      const FIXED_SIGNS = [2, 5, 8, 11]; // Taurus, Leo, Scorpio, Aquarius
      const isFix = FIXED_SIGNS.includes(lagna.rashi.id);
      let lagnaScore = 5;
      if (activityType === 'wedding' || activityType === 'construction' || activityType === 'movingIn') {
        if (isFix) lagnaScore = 10; // Fixed Lagna is best for permanent events
        else lagnaScore = 5;
      } else {
        lagnaScore = 7; // neutral for other activities
      }
      // Venus or Jupiter in Lagna = bonus
      const planets = getAllPlanetPositions(dt);
      const lagnaRashiId = lagna.rashi.id;
      if (planets.jupiter?.rashiId === lagnaRashiId || planets.venus?.rashiId === lagnaRashiId) {
        lagnaScore = 10;
      }
      // Malefic in Lagna = penalty
      if (planets.mars?.rashiId === lagnaRashiId || planets.saturn?.rashiId === lagnaRashiId || planets.rahu?.rashiId === lagnaRashiId) {
        lagnaScore = Math.max(0, lagnaScore - 5);
        warnings.push('Malefic planet in Lagna at the chosen time — not ideal');
      }
      breakdown.lagnaStrength = { lagna: lagna.rashi.english, lagnaSinhala: lagna.rashi.sinhala || null, lord: lagnaLord, score: lagnaScore, max: 10 };
      totalScore += lagnaScore;
    } catch (e) {
      breakdown.lagnaStrength = { score: 5, max: 10 };
      totalScore += 5;
    }
  }

  // Calculate max possible score
  let maxScore = 15 + 15 + 10 + 5 + 8; // tithi + nak + yoga + karana + weekday = 53
  if (birthDate && rules.needsTarabala) maxScore += 10;
  if (birthDate && rules.needsChandrabala) maxScore += 10;
  if (rules.lagnaCheck) maxScore += 10;

  // Normalize to 0-100
  const normalizedScore = Math.max(0, Math.round((totalScore / maxScore) * 100));

  const quality = normalizedScore >= 80 ? 'Excellent' : normalizedScore >= 65 ? 'Good' : normalizedScore >= 50 ? 'Average' : normalizedScore >= 35 ? 'Below Average' : 'Poor';

  return {
    dateTime: dt.toISOString(),
    activity: rules.name,
    activitySinhala: rules.sinhala,
    icon: rules.icon,
    rawScore: totalScore,
    maxScore,
    score: normalizedScore,
    quality,
    breakdown,
    direction: getTravelDirections(dt),
    warnings,
    specialRule: rules.specialRule || null,
    recommendation: normalizedScore >= 65
      ? `✅ This is a ${quality.toLowerCase()} time for ${rules.name}. Proceed with confidence.`
      : normalizedScore >= 50
        ? `⚠️ Average timing. Consider an alternative date if possible.`
        : `❌ Not recommended for ${rules.name}. Look for a better date.`,
  };
}


// ═══════════════════════════════════════════════════════════════════════════
//  FIND BEST MUHURTHA IN A DATE RANGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find the best auspicious time for an activity within a date range
 * @param {string} activityType — key from ACTIVITY_RULES
 * @param {Date|string} startDate — range start
 * @param {Date|string} endDate — range end
 * @param {Date|string} [birthDate] — user's birth date (for personalized scoring)
 * @param {number} [lat] — latitude (default: Colombo)
 * @param {number} [lng] — longitude (default: Colombo)
 * @param {number} [maxResults] — maximum results to return (default: 5)
 * @param {Date|string} [partnerBirthDate] — partner's birth date (weddings)
 * @param {Object} [opts] — { includeTimeWindows: attach 2–3 Rahu-free time
 *   windows (suggestTimeWindows) to each result day }
 * @returns {Object} ranked list of best dates/times
 */
function findMuhurtha(activityType, startDate, endDate, birthDate, lat = 6.9271, lng = 79.8612, maxResults = 5, partnerBirthDate = null, opts = {}) {
  const rules = ACTIVITY_RULES[activityType];
  if (!rules) {
    throw new Error(`Unknown activity: ${activityType}. Valid: ${Object.keys(ACTIVITY_RULES).join(', ')}`);
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const bDate = birthDate ? new Date(birthDate) : null;
  const pDate = partnerBirthDate ? new Date(partnerBirthDate) : null;

  // Limit range to 90 days max for performance
  const maxDays = 90;
  const rangeDays = Math.min(maxDays, Math.ceil((end - start) / (24 * 60 * 60 * 1000)));

  const candidates = [];

  for (let d = 0; d < rangeDays; d++) {
    const checkDate = new Date(start);
    checkDate.setDate(checkDate.getDate() + d);

    // Quick pre-filter: check weekday
    if (rules.badWeekdays.includes(checkDate.getDay())) continue;

    // Test at sunrise + 30min (typical Muhurtha start) and at 3 more intervals
    let sunrise;
    try {
      const ss = calculateSunriseSunset(checkDate, lat, lng);
      sunrise = ss.sunrise;
    } catch (e) {
      sunrise = new Date(checkDate);
      sunrise.setUTCHours(0, 30, 0);  // fallback ~6AM SLT
    }

    // Check at: sunrise+30min, 9AM SLT, 11AM SLT, 2PM SLT
    const checkTimes = [
      new Date(sunrise.getTime() + 30 * 60000),
      new Date(Date.UTC(checkDate.getUTCFullYear(), checkDate.getUTCMonth(), checkDate.getUTCDate(), 3, 30, 0)),  // 9AM SLT
      new Date(Date.UTC(checkDate.getUTCFullYear(), checkDate.getUTCMonth(), checkDate.getUTCDate(), 5, 30, 0)),  // 11AM SLT
      new Date(Date.UTC(checkDate.getUTCFullYear(), checkDate.getUTCMonth(), checkDate.getUTCDate(), 8, 30, 0)),  // 2PM SLT
    ];

    for (const ct of checkTimes) {
      try {
        const result = scoreMuhurtha(ct, activityType, bDate, lat, lng, pDate);
        if (result.score >= 40) { // Only include candidates above minimum threshold
          candidates.push(result);
        }
      } catch (e) { /* skip errored dates */ }
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Deduplicate by date (keep best time for each date)
  const seenDates = new Set();
  const deduplicated = [];
  for (const c of candidates) {
    const dateKey = c.dateTime.split('T')[0];
    if (!seenDates.has(dateKey)) {
      seenDates.add(dateKey);
      deduplicated.push(c);
    }
  }

  const topResults = deduplicated.slice(0, maxResults);

  // Optionally attach concrete 2–3 time windows (Rahu Kalaya always dodged)
  // to each result day, so the client can offer a choice of times instead of
  // a single instant. Opt-in: the free preview and report pipelines that call
  // findMuhurtha for day-level answers skip this extra per-day work.
  if (opts.includeTimeWindows) {
    for (const r of topResults) {
      try {
        const tw = suggestTimeWindows(new Date(r.dateTime), activityType, bDate, lat, lng, pDate, { withDay: false });
        r.timeWindows = tw.windows;
        r.avoid = tw.avoid;
      } catch (e) { /* result stays valid without windows */ }
    }
  }

  return {
    activity: rules.name,
    activitySinhala: rules.sinhala,
    icon: rules.icon,
    searchRange: { from: start.toISOString().split('T')[0], to: end.toISOString().split('T')[0] },
    daysSearched: rangeDays,
    candidatesFound: candidates.length,
    results: topResults,
    bestDate: topResults[0] || null,
    noGoodDate: topResults.length === 0,
    noGoodDateAdvice: topResults.length === 0
      ? 'No strongly auspicious date found in this range. Try expanding your date range or consult an astrologer for exceptions.'
      : null,
  };
}


// ═══════════════════════════════════════════════════════════════════════════
//  TIME WINDOWS WITHIN A SINGLE DAY — "the date is fixed; WHEN exactly?"
// ═══════════════════════════════════════════════════════════════════════════

// Chaldean hora order + weekday rulers (same convention as astrology.js).
const HORA_SEQUENCE = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];
const DAY_RULERS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
const HORA_BENEFICS = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
const HORA_SI = { Sun: 'රවි', Moon: 'සඳු', Mars: 'කුජ', Mercury: 'බුධ', Jupiter: 'ගුරු', Venus: 'සිකුරු', Saturn: 'ශනි' };
const DAYPARTS = [
  { key: 'morning', en: 'Morning', si: 'උදේ' },
  { key: 'midday', en: 'Midday', si: 'දවල්' },
  { key: 'afternoon', en: 'Afternoon', si: 'හවස' },
];

function periodsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/** Day hora (12 divisions sunrise→sunset) ruling a given instant. */
function dayHoraAt(tMs, sunriseMs, sunsetMs, weekday) {
  const horaMs = (sunsetMs - sunriseMs) / 12;
  const idx = Math.min(11, Math.max(0, Math.floor((tMs - sunriseMs) / horaMs)));
  const startIndex = Math.max(0, HORA_SEQUENCE.indexOf(DAY_RULERS[weekday] || 'Sun'));
  const ruler = HORA_SEQUENCE[(startIndex + idx) % HORA_SEQUENCE.length];
  return { ruler, sinhala: HORA_SI[ruler] || ruler, benefic: HORA_BENEFICS.includes(ruler) };
}

/** Same lagna-quality rules as scoreMuhurtha's block, for one instant. */
function scoreLagnaAt(dt, activityType, planets, lat, lng) {
  const lagna = getLagna(dt, lat, lng);
  const FIXED_SIGNS = [2, 5, 8, 11]; // Taurus, Leo, Scorpio, Aquarius
  let score = (activityType === 'wedding' || activityType === 'construction' || activityType === 'movingIn')
    ? (FIXED_SIGNS.includes(lagna.rashi.id) ? 10 : 5)
    : 7;
  const warnings = [];
  const id = lagna.rashi.id;
  if ((planets.jupiter && planets.jupiter.rashiId === id) || (planets.venus && planets.venus.rashiId === id)) score = 10;
  if ((planets.mars && planets.mars.rashiId === id) || (planets.saturn && planets.saturn.rashiId === id) || (planets.rahu && planets.rahu.rashiId === id)) {
    score = Math.max(0, score - 5);
    warnings.push('Malefic planet in Lagna at the chosen time — not ideal');
  }
  return { score, lagna, warnings };
}

function qualityOf(score) {
  return score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Average' : score >= 35 ? 'Below Average' : 'Poor';
}

/**
 * Suggest 2–3 auspicious time WINDOWS within one day for an activity.
 *
 * Every window is guaranteed clear of Rahu Kalaya (always) and of Gulika /
 * Yamaghanta when the activity's rules avoid them. Candidates are one-muhurtha
 * (48 min) slices of daylight; within the day they are ranked by the rising
 * lagna quality (for lagna-checked activities such as weddings), a benefic
 * planetary-hora bonus (Jupiter/Venus/Mercury/Moon), and a small Durmuhurtha
 * penalty — the day-level panchanga factors are computed once and shared.
 * The final picks are spread across morning / midday / afternoon so the user
 * gets genuinely different choices, then returned in chronological order.
 *
 * @param {Date|string} date — the civil day to examine
 * @param {string} activityType — key from ACTIVITY_RULES
 * @param {Date} [birthDate] — for Tarabala/Chandrabala personalization
 * @param {number} [lat] @param {number} [lng]
 * @param {Date} [partnerBirthDate] — weddings: both charts must be weighed
 * @param {Object} [options] — { windowMinutes=48, maxWindows=3, withDay=true }
 * @returns {{date, activity, activitySinhala, icon, sunrise, sunset, day, windows, avoid, noWindows}}
 */
function suggestTimeWindows(date, activityType, birthDate, lat = 6.9271, lng = 79.8612, partnerBirthDate = null, options = {}) {
  const rules = ACTIVITY_RULES[activityType];
  if (!rules) {
    throw new Error(`Unknown activity: ${activityType}. Valid: ${Object.keys(ACTIVITY_RULES).join(', ')}`);
  }

  const anchor = new Date(date);
  const windowMs = (options.windowMinutes || 48) * 60000;
  const maxWindows = Math.min(Math.max(options.maxWindows || 3, 1), 4);
  const withDay = options.withDay !== false;

  const { sunrise, sunset } = calculateSunriseSunset(anchor, lat, lng);
  const sunriseMs = sunrise.getTime();
  const sunsetMs = sunset.getTime();
  const weekday = anchor.getDay();

  // ── Inauspicious periods: hard blocks vs display list ──
  // Rahu Kalaya is ALWAYS a hard block for suggested times; Gulika and
  // Yamaghanta become hard blocks when the activity's rules avoid them.
  const hardBlocks = [];
  const avoid = [];
  const addPeriod = (name, sinhala, severity, calc, hard) => {
    try {
      const p = calc(anchor, lat, lng);
      avoid.push({
        name, sinhala, severity,
        start: p.start.toISOString(), end: p.end.toISOString(),
        startDisplay: formatTime(p.start), endDisplay: formatTime(p.end),
      });
      if (hard) hardBlocks.push({ start: p.start.getTime(), end: p.end.getTime() });
    } catch (e) { /* period unavailable — skip */ }
  };
  addPeriod('Rahu Kalaya', 'රාහු කාලය', 'High', calculateRahuKalaya, true);
  addPeriod('Gulika Kala', 'ගුලික කාලය', 'High', calculateGulikaKala, rules.avoidGulikaKala === true);
  addPeriod('Yamaghanta', 'යමඝණ්ට කාලය', 'Medium', calculateYamaghanta, rules.avoidYamaghanta === true);
  avoid.sort((a, b) => new Date(a.start) - new Date(b.start));

  let durmuhurthas = [];
  try { durmuhurthas = calculateDurmuhurtha(anchor, lat, lng).map(p => ({ start: p.start.getTime(), end: p.end.getTime() })); }
  catch (e) { /* soft factor only */ }

  // ── Day-level base score, computed ONCE at solar noon ──
  // Tithi/nakshatra/yoga/karana/weekday/tara/chandra barely move within a
  // day; each candidate then swaps in its own lagna + hora. Any Rahu/Gulika/
  // Yama penalty the noon instant happened to catch is stripped (candidates
  // are already guaranteed outside those periods).
  const noon = new Date((sunriseMs + sunsetMs) / 2);
  const bDate = birthDate ? new Date(birthDate) : null;
  const pDate = partnerBirthDate ? new Date(partnerBirthDate) : null;
  const base = scoreMuhurtha(noon, activityType, bDate, lat, lng, pDate);
  const periodPenalty = (base.breakdown.rahuKala ? base.breakdown.rahuKala.penalty || 0 : 0)
    + (base.breakdown.gulikaKala ? base.breakdown.gulikaKala.penalty || 0 : 0)
    + (base.breakdown.yamaghanta ? base.breakdown.yamaghanta.penalty || 0 : 0);
  const baseLagnaScore = base.breakdown.lagnaStrength ? base.breakdown.lagnaStrength.score || 0 : 0;
  const baseRawClean = base.rawScore - periodPenalty - baseLagnaScore;
  const maxScore = base.maxScore + 3; // +3 headroom = benefic-hora bonus

  let planets = null;
  if (rules.lagnaCheck) {
    try { planets = getAllPlanetPositions(noon); } catch (e) { planets = null; }
  }

  // ── Candidate windows: one muhurtha (48 min) sliding every 24 min ──
  const stepMs = 24 * 60000;
  const candidates = [];
  for (let t = sunriseMs + 24 * 60000; t + windowMs <= sunsetMs; t += stepMs) {
    const end = t + windowMs;
    if (hardBlocks.some(p => periodsOverlap(t, end, p.start, p.end))) continue;

    const midMs = t + windowMs / 2;
    const mid = new Date(midMs);
    let lagnaScore = 0;
    let lagnaInfo = null;
    let warnings = [];
    if (rules.lagnaCheck && planets) {
      try {
        const ls = scoreLagnaAt(mid, activityType, planets, lat, lng);
        lagnaScore = ls.score;
        lagnaInfo = { name: ls.lagna.rashi.english, sinhala: ls.lagna.rashi.sinhala || null };
        warnings = ls.warnings;
      } catch (e) { lagnaScore = baseLagnaScore; }
    }
    const hora = dayHoraAt(midMs, sunriseMs, sunsetMs, weekday);
    const inDurmuhurtha = durmuhurthas.some(p => periodsOverlap(t, end, p.start, p.end));
    const raw = baseRawClean + lagnaScore + (hora.benefic ? 3 : 0) - (inDurmuhurtha ? 2 : 0);
    const score = Math.max(0, Math.min(100, Math.round((raw / maxScore) * 100)));
    candidates.push({ startMs: t, endMs: end, mid, score, hora, lagna: lagnaInfo, warnings });
  }

  // ── Pick up to maxWindows, spread across the day ──
  // Best of each daylight third first (morning/midday/afternoon), then fill
  // by score with a ≥30 min gap so two picks never crowd the same hour.
  const third = (sunsetMs - sunriseMs) / 3;
  const partOf = (ms) => (ms < sunriseMs + third ? 0 : ms < sunriseMs + 2 * third ? 1 : 2);
  const picked = [];
  for (let p = 0; p < 3; p++) {
    const inPart = candidates.filter(c => partOf(c.mid.getTime()) === p);
    if (inPart.length) picked.push(inPart.reduce((a, b) => (b.score > a.score ? b : a)));
  }
  const GAP_MS = 30 * 60000;
  const clashes = (c) => picked.some(p => periodsOverlap(c.startMs - GAP_MS, c.endMs + GAP_MS, p.startMs, p.endMs));
  for (const c of [...candidates].sort((a, b) => b.score - a.score)) {
    if (picked.length >= maxWindows) break;
    if (!picked.includes(c) && !clashes(c)) picked.push(c);
  }
  picked.sort((a, b) => a.startMs - b.startMs);
  const windows = picked.slice(0, maxWindows).map(c => ({
    start: new Date(c.startMs).toISOString(),
    end: new Date(c.endMs).toISOString(),
    startDisplay: formatTime(new Date(c.startMs)),
    endDisplay: formatTime(new Date(c.endMs)),
    daypart: DAYPARTS[partOf(c.mid.getTime())],
    score: c.score,
    quality: qualityOf(c.score),
    hora: c.hora,
    lagna: c.lagna,
    warnings: c.warnings,
  }));

  // Day headline: re-score at the best window's midpoint so the numbers the
  // user sees are clean of the noon instant's accidental period penalties.
  let day = base;
  if (withDay && picked.length) {
    const best = picked.reduce((a, b) => (b.score > a.score ? b : a));
    try { day = scoreMuhurtha(best.mid, activityType, bDate, lat, lng, pDate); } catch (e) { /* keep base */ }
  }

  return {
    date: anchor.toISOString().split('T')[0],
    activity: rules.name,
    activitySinhala: rules.sinhala,
    icon: rules.icon,
    sunrise: sunrise.toISOString(),
    sunset: sunset.toISOString(),
    sunriseDisplay: formatTime(sunrise),
    sunsetDisplay: formatTime(sunset),
    day: withDay ? day : null,
    windows,
    avoid,
    noWindows: windows.length === 0,
  };
}


// ═══════════════════════════════════════════════════════════════════════════
//  GET ALL INAUSPICIOUS PERIODS FOR A DAY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all inauspicious time periods for a given date
 * Returns Rahu Kala, Gulika Kala, Yamaghanta, and Durmuhurtha
 */
function getInauspiciousPeriods(date, lat = 6.9271, lng = 79.8612) {
  const d = new Date(date);
  const result = {
    date: d.toISOString().split('T')[0],
    periods: [],
  };

  try {
    const rahu = calculateRahuKalaya(d, lat, lng);
    result.periods.push({
      name: 'Rahu Kala',
      sinhala: 'රාහු කාලය',
      severity: 'High',
      start: rahu.start,
      end: rahu.end,
      startTime: formatTime(rahu.start),
      endTime: formatTime(rahu.end),
      advice: 'Avoid starting new ventures, signing contracts, or important activities',
    });
  } catch (e) { /* skip */ }

  try {
    const gulika = calculateGulikaKala(d, lat, lng);
    result.periods.push({
      name: 'Gulika Kala',
      sinhala: 'ගුලික කාලය',
      severity: 'High',
      start: gulika.start,
      end: gulika.end,
      startTime: formatTime(gulika.start),
      endTime: formatTime(gulika.end),
      advice: 'Most malefic sub-period — avoid all auspicious activities',
    });
  } catch (e) { /* skip */ }

  try {
    const yama = calculateYamaghanta(d, lat, lng);
    result.periods.push({
      name: 'Yamaghanta',
      sinhala: 'යමඝණ්ට කාලය',
      severity: 'Medium',
      start: yama.start,
      end: yama.end,
      startTime: formatTime(yama.start),
      endTime: formatTime(yama.end),
      advice: 'Avoid travel and health-related activities',
    });
  } catch (e) { /* skip */ }

  try {
    const durms = calculateDurmuhurtha(d, lat, lng);
    for (const dm of durms) {
      result.periods.push({
        name: 'Durmuhurtha',
        sinhala: 'දුර්මුහුර්තය',
        severity: 'Low',
        start: dm.start,
        end: dm.end,
        startTime: formatTime(dm.start),
        endTime: formatTime(dm.end),
        advice: 'Avoid starting important activities during this short period',
      });
    }
  } catch (e) { /* skip */ }

  // Sort by start time
  result.periods.sort((a, b) => new Date(a.start) - new Date(b.start));

  return result;
}


// ═══════════════════════════════════════════════════════════════════════════
//  QUICK CHECK: Is this a good time?
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Quick yes/no check — is the current moment auspicious?
 */
function isGoodTimeNow(birthDate, lat = 6.9271, lng = 79.8612) {
  const now = new Date();
  const panchanga = getPanchanga(now, lat, lng);
  const inauspicious = getInauspiciousPeriods(now, lat, lng);

  // Check if NOW falls in any bad period
  const nowTime = now.getTime();
  const inBadPeriod = inauspicious.periods.some(p =>
    nowTime >= new Date(p.start).getTime() && nowTime <= new Date(p.end).getTime() && p.severity === 'High'
  );

  const nakName = panchanga.nakshatra?.name || '';
  const tithiNum = panchanga.tithi?.number || 1;
  const isGoodNak = GENERALLY_AUSPICIOUS.includes(nakName);
  const isGoodTithi = GOOD_TITHIS.includes(tithiNum);

  const isGood = !inBadPeriod && isGoodNak && isGoodTithi;

  return {
    dateTime: now.toISOString(),
    isAuspicious: isGood,
    quality: isGood ? 'Good' : inBadPeriod ? 'Bad (inauspicious period active)' : 'Average',
    nakshatra: nakName,
    tithi: panchanga.tithi?.name,
    currentBadPeriod: inBadPeriod ? inauspicious.periods.find(p =>
      nowTime >= new Date(p.start).getTime() && nowTime <= new Date(p.end).getTime() && p.severity === 'High'
    )?.name : null,
    advice: isGood
      ? 'Current moment is auspicious — good to start important activities'
      : inBadPeriod
        ? 'Currently in an inauspicious period — wait until it ends'
        : 'Mixed conditions — proceed with minor activities but avoid major commitments',
  };
}


// ═══════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatTime(date, timeContext = null) {
  if (!date) return '';
  const local = formatLocalDateTime(date, timeContext);
  const [h, m] = local.time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}


// ═══════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Core
  scoreMuhurtha,
  findMuhurtha,
  suggestTimeWindows,
  ACTIVITY_RULES,

  // Inauspicious periods
  calculateGulikaKala,
  calculateYamaghanta,
  calculateDurmuhurtha,
  getInauspiciousPeriods,

  // Personalized calculations
  calculateTarabala,
  calculateChandrabala,

  // Direction of the day (Disha Shoola)
  getTravelDirections,

  // Quick checks
  isGoodTimeNow,
};
