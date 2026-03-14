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
 * Author: Nakath AI Engine v4.0
 */

const {
  NAKSHATRAS, RASHIS, PLANETS,
  getAllPlanetPositions, getLagna, getPanchanga, getDailyNakath,
  calculateRahuKalaya, calculateSunriseSunset,
  toSidereal, getMoonLongitude, getNakshatra, getRashi,
  getTithi, getYoga, getKarana, dateToJD,
} = require('./astrology');


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
 * @returns {Object} score breakdown
 */
function scoreMuhurtha(dateTime, activityType, birthDate, lat = 6.9271, lng = 79.8612) {
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
  breakdown.tithi = { name: panchanga.tithi?.name, number: tithiNum, score: tithiScore, max: 15 };
  totalScore += tithiScore;

  // ── Nakshatra Score (0-15) ──
  const nakName = panchanga.nakshatra?.name || '';
  let nakScore = 7;
  if (rules.goodNakshatras.includes(nakName)) nakScore = 15;
  else if (rules.badNakshatras.includes(nakName)) { nakScore = 0; warnings.push(`${nakName} Nakshatra is not suitable for ${rules.name}`); }
  else if (GENERALLY_AUSPICIOUS.includes(nakName)) nakScore = 10;
  else if (INAUSPICIOUS_NAKSHATRAS.includes(nakName)) nakScore = 3;
  breakdown.nakshatra = { name: nakName, score: nakScore, max: 15 };
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
    const bDate = new Date(birthDate);
    const natalMoonSid = toSidereal(getMoonLongitude(bDate), bDate);
    const natalNakIdx = Math.floor(natalMoonSid / (360 / 27));
    const natalMoonRashiId = Math.floor(natalMoonSid / 30) + 1;

    // Current Moon position
    const transitMoonSid = toSidereal(getMoonLongitude(dt), dt);
    const transitNakIdx = Math.floor(transitMoonSid / (360 / 27));
    const transitMoonRashiId = Math.floor(transitMoonSid / 30) + 1;

    // ── Tarabala (0-10) ──
    if (rules.needsTarabala) {
      const tara = calculateTarabala(transitNakIdx, natalNakIdx);
      breakdown.tarabala = { name: tara.name, quality: tara.quality, score: tara.score, max: 10 };
      totalScore += tara.score;
      if (tara.quality === 'bad') warnings.push(`${tara.name} Tara — not ideal for your birth star`);
    }

    // ── Chandrabala (0-10) ──
    if (rules.needsChandrabala) {
      const chandra = calculateChandrabala(transitMoonRashiId, natalMoonRashiId);
      breakdown.chandrabala = { house: chandra.house, quality: chandra.quality, score: chandra.score, max: 10 };
      totalScore += chandra.score;
      if (chandra.quality === 'bad') warnings.push(`Moon in house ${chandra.house} from your natal Moon — weak Chandrabala`);
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
      breakdown.lagnaStrength = { lagna: lagna.rashi.english, lord: lagnaLord, score: lagnaScore, max: 10 };
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
 * @returns {Object} ranked list of best dates/times
 */
function findMuhurtha(activityType, startDate, endDate, birthDate, lat = 6.9271, lng = 79.8612, maxResults = 5) {
  const rules = ACTIVITY_RULES[activityType];
  if (!rules) {
    throw new Error(`Unknown activity: ${activityType}. Valid: ${Object.keys(ACTIVITY_RULES).join(', ')}`);
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const bDate = birthDate ? new Date(birthDate) : null;

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
        const result = scoreMuhurtha(ct, activityType, bDate, lat, lng);
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

function formatTime(date) {
  if (!date) return '';
  // Convert to SLT (UTC+5:30)
  const slt = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  const h = slt.getUTCHours();
  const m = slt.getUTCMinutes();
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
  ACTIVITY_RULES,

  // Inauspicious periods
  calculateGulikaKala,
  calculateYamaghanta,
  calculateDurmuhurtha,
  getInauspiciousPeriods,

  // Personalized calculations
  calculateTarabala,
  calculateChandrabala,

  // Quick checks
  isGoodTimeNow,
};
