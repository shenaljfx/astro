/**
 * Porondam (Marriage Compatibility) Engine
 * 
 * Implements the traditional Sri Lankan / South Indian marriage compatibility
 * system based on 20 Porondam (compatibility points).
 * 
 * The system matches based on:
 * - Nakshatra compatibility (Gana, Yoni, Rashi, Nadi, etc.)
 * - Dasha Porondam (10 compatibility factors scored out of 20)
 */

const { getNakshatra, getRashi, toSidereal, getMoonLongitude, getAyanamsha } = require('./astrology');

/**
 * Gana (Temperament) classification for each Nakshatra
 * Deva (Divine), Manushya (Human), Rakshasa (Demon)
 */
const GANA_MAP = {
  'Ashwini': 'Deva', 'Bharani': 'Manushya', 'Krittika': 'Rakshasa',
  'Rohini': 'Manushya', 'Mrigashira': 'Deva', 'Ardra': 'Manushya',
  'Punarvasu': 'Deva', 'Pushya': 'Deva', 'Ashlesha': 'Rakshasa',
  'Magha': 'Rakshasa', 'Purva Phalguni': 'Manushya', 'Uttara Phalguni': 'Manushya',
  'Hasta': 'Deva', 'Chitra': 'Rakshasa', 'Swati': 'Deva',
  'Vishakha': 'Rakshasa', 'Anuradha': 'Deva', 'Jyeshtha': 'Rakshasa',
  'Mula': 'Rakshasa', 'Purva Ashadha': 'Manushya', 'Uttara Ashadha': 'Manushya',
  'Shravana': 'Deva', 'Dhanishtha': 'Rakshasa', 'Shatabhisha': 'Rakshasa',
  'Purva Bhadrapada': 'Manushya', 'Uttara Bhadrapada': 'Manushya', 'Revati': 'Deva',
};

/**
 * Yoni (Animal symbol) for each Nakshatra
 */
const YONI_MAP = {
  'Ashwini': 'Horse', 'Bharani': 'Elephant', 'Krittika': 'Goat',
  'Rohini': 'Serpent', 'Mrigashira': 'Serpent', 'Ardra': 'Dog',
  'Punarvasu': 'Cat', 'Pushya': 'Goat', 'Ashlesha': 'Cat',
  'Magha': 'Rat', 'Purva Phalguni': 'Rat', 'Uttara Phalguni': 'Cow',
  'Hasta': 'Buffalo', 'Chitra': 'Tiger', 'Swati': 'Buffalo',
  'Vishakha': 'Tiger', 'Anuradha': 'Deer', 'Jyeshtha': 'Deer',
  'Mula': 'Dog', 'Purva Ashadha': 'Monkey', 'Uttara Ashadha': 'Mongoose',
  'Shravana': 'Monkey', 'Dhanishtha': 'Lion', 'Shatabhisha': 'Horse',
  'Purva Bhadrapada': 'Lion', 'Uttara Bhadrapada': 'Cow', 'Revati': 'Elephant',
};

/**
 * Nadi (Pulse/Energy channel) classification
 * Aadi (First), Madhya (Middle), Antya (Last)
 */
const NADI_MAP = {
  'Ashwini': 'Aadi', 'Bharani': 'Madhya', 'Krittika': 'Antya',
  'Rohini': 'Antya', 'Mrigashira': 'Madhya', 'Ardra': 'Aadi',
  'Punarvasu': 'Aadi', 'Pushya': 'Madhya', 'Ashlesha': 'Antya',
  'Magha': 'Antya', 'Purva Phalguni': 'Madhya', 'Uttara Phalguni': 'Aadi',
  'Hasta': 'Aadi', 'Chitra': 'Madhya', 'Swati': 'Antya',
  'Vishakha': 'Antya', 'Anuradha': 'Madhya', 'Jyeshtha': 'Aadi',
  'Mula': 'Aadi', 'Purva Ashadha': 'Madhya', 'Uttara Ashadha': 'Antya',
  'Shravana': 'Antya', 'Dhanishtha': 'Madhya', 'Shatabhisha': 'Aadi',
  'Purva Bhadrapada': 'Aadi', 'Uttara Bhadrapada': 'Madhya', 'Revati': 'Antya',
};

/**
 * Vasya (Dominance/Compatibility) groups
 */
const VASYA_GROUPS = {
  'Mesha': ['Simha', 'Vrischika'],
  'Vrishabha': ['Kataka', 'Tula'],
  'Mithuna': ['Kanya'],
  'Kataka': ['Vrischika', 'Dhanus'],
  'Simha': ['Tula'],
  'Kanya': ['Meena', 'Mithuna'],
  'Tula': ['Makara', 'Kanya'],
  'Vrischika': ['Kataka'],
  'Dhanus': ['Meena'],
  'Makara': ['Mesha', 'Kumbha'],
  'Kumbha': ['Mesha'],
  'Meena': ['Makara'],
};

/**
 * Enemy Yoni pairs (incompatible animals)
 */
const ENEMY_YONIS = [
  ['Horse', 'Buffalo'], ['Elephant', 'Lion'], ['Goat', 'Monkey'],
  ['Serpent', 'Mongoose'], ['Dog', 'Deer'], ['Cat', 'Rat'],
  ['Tiger', 'Cow'],
];

/**
 * Calculate Dina (Day) Porondam
 * Count from bride's nakshatra to groom's nakshatra
 * Maximum: 3 points
 */
function calculateDinaPorondam(brideNakshatra, groomNakshatra) {
  const count = ((groomNakshatra.id - brideNakshatra.id + 27) % 27) + 1;
  const remainder = count % 9;

  // Remainder of 2, 4, 6, 8, 9 is good
  const isGood = [2, 4, 6, 8, 0].includes(remainder);
  return {
    name: 'Dina',
    sinhala: 'දින',
    tamil: 'தினம்',
    score: isGood ? 3 : 0,
    maxScore: 3,
    count,
    remainder,
    description: isGood
      ? 'Good day compatibility - promotes health and well-being'
      : 'Day compatibility is unfavorable',
  };
}

/**
 * Calculate Gana Porondam
 * Temperament compatibility
 * Maximum: 2 points
 */
function calculateGanaPorondam(brideNakshatra, groomNakshatra) {
  const brideGana = GANA_MAP[brideNakshatra.name];
  const groomGana = GANA_MAP[groomNakshatra.name];

  let score = 0;
  let description = '';

  if (brideGana === groomGana) {
    score = 2;
    description = 'Same temperament - excellent compatibility';
  } else if (
    (brideGana === 'Deva' && groomGana === 'Manushya') ||
    (brideGana === 'Manushya' && groomGana === 'Deva')
  ) {
    score = 1;
    description = 'Good temperament compatibility';
  } else {
    score = 0;
    description = 'Different temperaments - may cause friction';
  }

  return {
    name: 'Gana',
    sinhala: 'ගණ',
    tamil: 'கணம்',
    score,
    maxScore: 2,
    brideGana,
    groomGana,
    description,
  };
}

/**
 * Calculate Yoni Porondam
 * Sexual/physical compatibility
 * Maximum: 3 points
 */
function calculateYoniPorondam(brideNakshatra, groomNakshatra) {
  const brideYoni = YONI_MAP[brideNakshatra.name];
  const groomYoni = YONI_MAP[groomNakshatra.name];

  let score = 0;
  let description = '';

  if (brideYoni === groomYoni) {
    score = 3;
    description = 'Same yoni - excellent physical compatibility';
  } else {
    const isEnemy = ENEMY_YONIS.some(
      ([a, b]) => (brideYoni === a && groomYoni === b) || (brideYoni === b && groomYoni === a)
    );
    if (isEnemy) {
      score = 0;
      description = 'Enemy yonis - physical incompatibility';
    } else {
      score = 2;
      description = 'Friendly yonis - good physical compatibility';
    }
  }

  return {
    name: 'Yoni',
    sinhala: 'යෝනි',
    tamil: 'யோனி',
    score,
    maxScore: 3,
    brideYoni,
    groomYoni,
    description,
  };
}

/**
 * Calculate Rashi Porondam
 * Sign compatibility (emotional compatibility)
 * Maximum: 2 points
 */
function calculateRashiPorondam(brideRashi, groomRashi) {
  const diff = Math.abs(brideRashi.id - groomRashi.id);
  const normalizedDiff = Math.min(diff, 12 - diff);

  let score = 0;
  let description = '';

  // 1, 7 (kendras), 5, 9 (trikonas) are good
  if ([1, 5, 7, 9].includes(normalizedDiff + 1) || normalizedDiff === 0) {
    score = 2;
    description = 'Good sign compatibility - emotional harmony';
  } else if ([2, 12].includes(normalizedDiff + 1)) {
    score = 0;
    description = '2-12 relationship - financial concerns';
  } else {
    score = 1;
    description = 'Moderate sign compatibility';
  }

  return {
    name: 'Rashi',
    sinhala: 'රාශි',
    tamil: 'ராசி',
    score,
    maxScore: 2,
    description,
  };
}

/**
 * Calculate Vasya Porondam
 * Magnetic control/dominance compatibility
 * Maximum: 1 point
 */
function calculateVasyaPorondam(brideRashi, groomRashi) {
  const brideName = brideRashi.name;
  const groomName = groomRashi.name;

  const brideVasya = VASYA_GROUPS[brideName] || [];
  const groomVasya = VASYA_GROUPS[groomName] || [];

  let score = 0;
  let description = '';

  if (brideVasya.includes(groomName) || groomVasya.includes(brideName)) {
    score = 1;
    description = 'Vasya compatibility present - mutual attraction';
  } else if (brideName === groomName) {
    score = 1;
    description = 'Same sign - natural attraction';
  } else {
    score = 0;
    description = 'No Vasya compatibility';
  }

  return {
    name: 'Vasya',
    sinhala: 'වශ්‍ය',
    tamil: 'வஸ்யம்',
    score,
    maxScore: 1,
    description,
  };
}

/**
 * Calculate Nadi Porondam
 * Health and genetic compatibility
 * Maximum: 8 points (most important!)
 */
function calculateNadiPorondam(brideNakshatra, groomNakshatra) {
  const brideNadi = NADI_MAP[brideNakshatra.name];
  const groomNadi = NADI_MAP[groomNakshatra.name];

  let score = 0;
  let description = '';

  if (brideNadi !== groomNadi) {
    score = 8;
    description = 'Different Nadi - excellent health compatibility for offspring';
  } else {
    score = 0;
    description = 'Same Nadi (Nadi Dosha) - potential health concerns for offspring. Remedies may be recommended.';
  }

  return {
    name: 'Nadi',
    sinhala: 'නාඩි',
    tamil: 'நாடி',
    score,
    maxScore: 8,
    brideNadi,
    groomNadi,
    description,
    isDosha: brideNadi === groomNadi,
  };
}

/**
 * Calculate Mahendra Porondam
 * Prosperity and well-being
 * Maximum: 1 point
 */
function calculateMahendraPorondam(brideNakshatra, groomNakshatra) {
  const count = ((groomNakshatra.id - brideNakshatra.id + 27) % 27) + 1;
  const isGood = [4, 7, 10, 13, 16, 19, 22, 25].includes(count);

  return {
    name: 'Mahendra',
    sinhala: 'මහේන්ද්‍ර',
    tamil: 'மகேந்திரம்',
    score: isGood ? 1 : 0,
    maxScore: 1,
    description: isGood
      ? 'Mahendra compatible - promotes prosperity and progeny'
      : 'Mahendra not compatible',
  };
}

/**
 * Calculate full 20-point Porondam compatibility
 */
function calculatePorondam(brideBirthDate, groomBirthDate) {
  // Get Moon positions
  const brideMoonTropical = getMoonLongitude(brideBirthDate);
  const groomMoonTropical = getMoonLongitude(groomBirthDate);
  const brideMoonSidereal = toSidereal(brideMoonTropical, brideBirthDate);
  const groomMoonSidereal = toSidereal(groomMoonTropical, groomBirthDate);

  // Get Nakshatras and Rashis
  const brideNakshatra = getNakshatra(brideMoonSidereal);
  const groomNakshatra = getNakshatra(groomMoonSidereal);
  const brideRashi = getRashi(brideMoonSidereal);
  const groomRashi = getRashi(groomMoonSidereal);

  // Calculate all Porondam factors
  const factors = [
    calculateDinaPorondam(brideNakshatra, groomNakshatra),
    calculateGanaPorondam(brideNakshatra, groomNakshatra),
    calculateYoniPorondam(brideNakshatra, groomNakshatra),
    calculateRashiPorondam(brideRashi, groomRashi),
    calculateVasyaPorondam(brideRashi, groomRashi),
    calculateNadiPorondam(brideNakshatra, groomNakshatra),
    calculateMahendraPorondam(brideNakshatra, groomNakshatra),
  ];

  const totalScore = factors.reduce((sum, f) => sum + f.score, 0);
  const maxPossibleScore = 20;
  const percentage = Math.round((totalScore / maxPossibleScore) * 100);

  // Determine overall compatibility rating
  let rating, ratingEmoji, ratingSinhala, ratingTamil;
  if (totalScore >= 18) {
    rating = 'Excellent';
    ratingEmoji = '💫';
    ratingSinhala = 'උතුම්';
    ratingTamil = 'சிறப்பு';
  } else if (totalScore >= 14) {
    rating = 'Very Good';
    ratingEmoji = '🌟';
    ratingSinhala = 'ඉතා හොඳ';
    ratingTamil = 'மிக நல்லது';
  } else if (totalScore >= 10) {
    rating = 'Good';
    ratingEmoji = '✨';
    ratingSinhala = 'හොඳ';
    ratingTamil = 'நல்லது';
  } else if (totalScore >= 7) {
    rating = 'Average';
    ratingEmoji = '⭐';
    ratingSinhala = 'සාමාන්‍ය';
    ratingTamil = 'சராசரி';
  } else {
    rating = 'Below Average';
    ratingEmoji = '🔮';
    ratingSinhala = 'සාමාන්‍යයට පහළ';
    ratingTamil = 'சராசரிக்கு கீழே';
  }

  // Check for major doshas
  const doshas = [];
  const nadiResult = factors.find(f => f.name === 'Nadi');
  if (nadiResult && nadiResult.isDosha) {
    doshas.push({
      name: 'Nadi Dosha',
      sinhala: 'නාඩි දෝෂය',
      severity: 'high',
      description: 'Same Nadi indicates potential health issues for children. Traditional remedies available.',
    });
  }

  return {
    bride: {
      birthDate: brideBirthDate.toISOString(),
      nakshatra: brideNakshatra,
      rashi: brideRashi,
      moonLongitude: brideMoonSidereal,
    },
    groom: {
      birthDate: groomBirthDate.toISOString(),
      nakshatra: groomNakshatra,
      rashi: groomRashi,
      moonLongitude: groomMoonSidereal,
    },
    totalScore,
    maxPossibleScore,
    percentage,
    rating,
    ratingEmoji,
    ratingSinhala,
    ratingTamil,
    factors,
    doshas,
    recommendation: totalScore >= 10
      ? 'This match is considered favorable according to traditional Vedic astrology.'
      : 'This match may face challenges. Consulting a traditional astrologer for remedies is recommended.',
    recommendationSinhala: totalScore >= 10
      ? 'සාම්ප්‍රදායික වේද ජ්‍යෝතිෂ්‍ය අනුව මෙම ගැලපීම හිතකර ලෙස සැලකේ.'
      : 'මෙම ගැලපීම අභියෝගවලට මුහුණ දිය හැක. ප්‍රතිකාර සඳහා සාම්ප්‍රදායික ජ්‍යෝතිෂ්‍යවේදියෙකුගෙන් විමසන්න.',
  };
}

module.exports = {
  calculatePorondam,
  GANA_MAP,
  YONI_MAP,
  NADI_MAP,
};
