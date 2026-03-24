/**
 * Horoscope Routes
 * 
 * Endpoints:
 * - GET /api/horoscope/daily/:sign - Get daily horoscope by zodiac sign
 * - POST /api/horoscope/birth-chart - Generate birth chart summary
 */

const express = require('express');
const router = express.Router();
const { getPanchanga, getNakshatra, getRashi, toSidereal, getMoonLongitude, getSunLongitude, getLagna, getAllPlanetPositions, buildHouseChart, buildNavamshaChart, buildShadvarga, calculateDrishtis, analyzePushkara, calculateAshtakavarga, buildBhavaChalit, detectYogas, getPlanetStrengths, calculateVimshottari, generateDetailedReport, generateFullReport, RASHIS } = require('../engine/astrology');
const { generateAdvancedAnalysis } = require('../engine/advanced');
const { chat, generateAINarrativeReport, translateAdvancedForDisplay, explainChartSimple } = require('../engine/chat');
const { optionalAuth } = require('../middleware/auth');
const { phoneAuth } = require('../middleware/subscription');
const { requireTokens, deductTokenBalance } = require('../middleware/tokens');
const { saveReport, getCachedReport, saveChartExplanation, getCachedChartExplanation, saveTranslationCache, getCachedTranslation, getUserReports, saveBirthChartCache, getCachedBirthChart } = require('../models/firestore');
const { parseSLT } = require('../utils/dateUtils');
const { parseBirthDateTime } = require('../services/timezone');

/**
 * Detailed Lagna Palapala (ලග්න පලාපල) - traditional Sri Lankan interpretations
 * Based on classical Vedic texts and Sri Lankan astrological tradition
 */
const LAGNA_PALAPALA = {
  'Mesha': {
    english: 'Aries Lagna',
    sinhala: 'මේෂ ලග්නය',
    description: 'Born under Mesha Lagna, you are a natural leader with fiery courage and pioneering spirit. Mars (Kuja) as your Lagna lord blesses you with energy, determination, and a warrior\'s heart.',
    descriptionSi: 'මේෂ ලග්නයෙන් උපන් ඔබ ස්වභාවික නායකයෙකි. කුජ ග්‍රහයා ලග්නාධිපති වන බැවින් ධෛර්යය, අධිෂ්ඨානය සහ සටන්කාමී ස්වභාවය ඔබේ ලක්ෂණයකි.',
    traits: ['Leadership & courage', 'Quick decision-maker', 'Athletic build', 'Short temper but forgiving'],
    traitsSi: ['නායකත්ව හා ධෛර්යය', 'ඉක්මන් තීරණ ගන්නා', 'ක්‍රියාශීලී ශරීර ගොඩනැගිල්ල', 'කෝපය ඇති නමුත් සමාව දෙන'],
    bodyType: 'Medium to tall, sharp features, reddish complexion',
    career: 'Military, sports, engineering, surgery, entrepreneurship',
    careerSi: 'හමුදා, ක්‍රීඩා, ඉංජිනේරු, ශල්‍ය වෛද්‍ය, ව්‍යාපාර',
    gem: 'Red Coral (රතු පබළු)',
    luckyColor: 'Red, Orange',
    luckyDay: 'Tuesday (අඟහරුවාදා)',
  },
  'Vrishabha': {
    english: 'Taurus Lagna',
    sinhala: 'වෘෂභ ලග්නය',
    description: 'Vrishabha Lagna natives are blessed by Venus (Shukra), the planet of beauty and luxury. You possess remarkable patience, artistic talent, and a deep love of comfort and stability.',
    descriptionSi: 'වෘෂභ ලග්නයෙන් උපන් ඔබට සිකුරු ග්‍රහයාගේ ආශීර්වාදය ලැබේ. ඉවසීම, කලාත්මක හැකියාව, සහ සුඛෝපභෝගී ජීවිතයට ඇල්මක් ඔබේ විශේෂ ලක්ෂණයි.',
    traits: ['Patient & reliable', 'Artistic & musical talent', 'Love of luxury & comfort', 'Strong willpower'],
    traitsSi: ['ඉවසීම සහ විශ්වාසදායක', 'කලාත්මක හා සංගීත හැකියාව', 'සුඛෝපභෝගී ජීවිතයට ප්‍රේමය', 'ශක්තිමත් කැමැත්ත'],
    bodyType: 'Solid build, beautiful features, pleasant voice',
    career: 'Finance, arts, agriculture, hospitality, music',
    careerSi: 'මූල්‍ය, කලා, කෘෂිකර්මය, ආතිථ්‍ය, සංගීතය',
    gem: 'Diamond (දියමන්ති)',
    luckyColor: 'White, Cream, Pink',
    luckyDay: 'Friday (සිකුරාදා)',
  },
  'Mithuna': {
    english: 'Gemini Lagna',
    sinhala: 'මිථුන ලග්නය',
    description: 'Mercury (Budha) as your Lagna lord makes you highly intellectual, communicative, and versatile. Mithuna Lagna people are natural storytellers and quick learners.',
    descriptionSi: 'බුධ ග්‍රහයා ලග්නාධිපති වන බැවින් ඔබ බුද්ධිමත්, සන්නිවේදනයට දක්ෂ සහ බහුමුඛ පුද්ගලයෙකි. මිථුන ලග්නයේ අය ස්වභාවික කතාකරුවන් ය.',
    traits: ['Intellectual & curious', 'Excellent communicator', 'Adaptable & versatile', 'Restless mind'],
    traitsSi: ['බුද්ධිමත් හා කුතුහලකාරී', 'විශිෂ්ට සන්නිවේදක', 'අනුවර්තනය වන හා බහුමුඛ', 'නොසන්සුන් මනස'],
    bodyType: 'Slim, youthful appearance, bright eyes',
    career: 'Writing, journalism, teaching, trade, IT',
    careerSi: 'ලේඛනය, මාධ්‍ය, ඉගැන්වීම, වෙළඳාම, තොරතුරු තාක්ෂණය',
    gem: 'Emerald (මරකත)',
    luckyColor: 'Green, Light Yellow',
    luckyDay: 'Wednesday (බදාදා)',
  },
  'Kataka': {
    english: 'Cancer Lagna',
    sinhala: 'කටක ලග්නය',
    description: 'The Moon (Chandra) rules your Lagna, making you deeply emotional, intuitive, and nurturing. Kataka natives have a powerful connection to home, family, and their motherland.',
    descriptionSi: 'චන්ද්‍ර ග්‍රහයා ඔබේ ලග්නාධිපති වන බැවින් ඔබ ගැඹුරු හැඟීම්කාරී, අවබෝධශීලී සහ සත්කාරශීලී පුද්ගලයෙකි. නිවස, පවුල සහ මව්බිම ඔබට ඉතා වැදගත්.',
    traits: ['Deeply emotional & caring', 'Strong intuition', 'Home & family oriented', 'Protective nature'],
    traitsSi: ['ගැඹුරු හැඟීම්කාරී හා සත්කාරශීලී', 'ශක්තිමත් අවබෝධය', 'නිවස හා පවුල් නැඹුරු', 'ආරක්ෂණ ස්වභාවය'],
    bodyType: 'Round face, fair complexion, medium height',
    career: 'Healthcare, hospitality, real estate, psychology, food industry',
    careerSi: 'සෞඛ්‍ය, ආතිථ්‍ය, නිවාස, මනෝවිද්‍යාව, ආහාර කර්මාන්තය',
    gem: 'Pearl (මුතු)',
    luckyColor: 'White, Silver',
    luckyDay: 'Monday (සඳුදා)',
  },
  'Simha': {
    english: 'Leo Lagna',
    sinhala: 'සිංහ ලග්නය',
    description: 'The Sun (Surya) as your Lagna lord bestows royal dignity, confidence, and natural authority. Simha Lagna natives command respect and have a magnetic personality.',
    descriptionSi: 'සූර්ය ග්‍රහයා ලග්නාධිපති වන බැවින් රාජ ගෞරවය, ආත්ම විශ්වාසය සහ ස්වභාවික බලය ඔබට හිමි වේ. සිංහ ලග්නයේ අය ගෞරවය දිනාගෙන ආකර්ෂණීය පෞරුෂයක් ඇත.',
    traits: ['Natural leader & authority', 'Generous & warm-hearted', 'Strong self-confidence', 'Proud & dignified'],
    traitsSi: ['ස්වභාවික නායක හා බලය', 'උදාර හා උණුසුම් හදවත', 'ශක්තිමත් ආත්ම විශ්වාසය', 'ආඩම්බර හා ගෞරවනීය'],
    bodyType: 'Commanding presence, broad chest, thick hair',
    career: 'Government, politics, administration, entertainment, management',
    careerSi: 'රජය, දේශපාලනය, පරිපාලනය, විනෝදාස්වාදය, කළමනාකරණය',
    gem: 'Ruby (මාණික්‍ය)',
    luckyColor: 'Gold, Orange, Red',
    luckyDay: 'Sunday (ඉරිදා)',
  },
  'Kanya': {
    english: 'Virgo Lagna',
    sinhala: 'කන්‍යා ලග්නය',
    description: 'Mercury (Budha) governs your Lagna, giving you exceptional analytical ability, attention to detail, and a service-oriented nature. Kanya natives excel in precision work.',
    descriptionSi: 'බුධ ග්‍රහයා ඔබේ ලග්නය පාලනය කරන බැවින් විශ්ලේෂණ හැකියාව, විස්තර කෙරෙහි අවධානය සහ සේවා නැඹුරු ස්වභාවය ඔබේ ලක්ෂණයි.',
    traits: ['Analytical & detail-oriented', 'Practical & organized', 'Health-conscious', 'Perfectionist tendencies'],
    traitsSi: ['විශ්ලේෂණාත්මක හා විස්තර නැඹුරු', 'ප්‍රායෝගික හා සංවිධානාත්මක', 'සෞඛ්‍ය සැලකිලිමත්', 'පරිපූර්ණතාවාදී ප්‍රවණතා'],
    bodyType: 'Slim, delicate features, youthful look',
    career: 'Medicine, accounting, research, editing, nutrition',
    careerSi: 'වෛද්‍ය, ගණකාධිකරණය, පර්යේෂණ, සංස්කරණය, පෝෂණය',
    gem: 'Emerald (මරකත)',
    luckyColor: 'Green, Earthy tones',
    luckyDay: 'Wednesday (බදාදා)',
  },
  'Tula': {
    english: 'Libra Lagna',
    sinhala: 'තුලා ලග්නය',
    description: 'Venus (Shukra) rules your Lagna, blessing you with charm, diplomacy, and a deep sense of justice. Tula natives naturally seek balance and harmony in all things.',
    descriptionSi: 'සිකුරු ග්‍රහයා ඔබේ ලග්නය පාලනය කරන බැවින් ආකර්ෂණීයත්වය, රාජ්‍ය තාන්ත්‍රිකත්වය සහ යුක්තිය පිළිබඳ ගැඹුරු හැඟීමක් ඔබට ලැබේ.',
    traits: ['Diplomatic & fair-minded', 'Charming & sociable', 'Artistic sensibility', 'Seeks balance in all things'],
    traitsSi: ['රාජ්‍ය තාන්ත්‍රික හා සාධාරණ', 'ආකර්ෂණීය හා සමාජශීලී', 'කලාත්මක සංවේදීතාව', 'සියල්ලෙහි සමතුලිතතාවය සොයයි'],
    bodyType: 'Attractive appearance, symmetrical features, graceful',
    career: 'Law, fashion, art, diplomacy, public relations',
    careerSi: 'නීතිය, විලාසිතා, කලාව, රාජ්‍ය තාන්ත්‍රිකත්වය, මහජන සම්බන්ධතා',
    gem: 'Diamond (දියමන්ති)',
    luckyColor: 'White, Pastel shades',
    luckyDay: 'Friday (සිකුරාදා)',
  },
  'Vrischika': {
    english: 'Scorpio Lagna',
    sinhala: 'වෘශ්චික ලග්නය',
    description: 'Mars (Kuja) as your Lagna lord gives you intense willpower, magnetic charisma, and deep transformative energy. Vrischika natives are fearless investigators who see beneath the surface.',
    descriptionSi: 'කුජ ග්‍රහයා ලග්නාධිපති වන බැවින් තීව්‍ර කැමැත්ත, ආකර්ෂණීය පෞරුෂය සහ ගැඹුරු පරිවර්තන ශක්තිය ඔබට ලැබේ. වෘශ්චික ලග්නයේ අය නිර්භීත පර්යේෂකයන් වන අතර පෘෂ්ඨය යට බලති.',
    traits: ['Intense willpower', 'Magnetic personality', 'Deep & mysterious', 'Resilient & transformative'],
    traitsSi: ['තීව්‍ර කැමැත්ත', 'ආකර්ෂණීය පෞරුෂය', 'ගැඹුරු හා අභිරහස්', 'ප්‍රතිරෝධී හා පරිවර්තනශීලී'],
    bodyType: 'Sharp eyes, intense gaze, medium build, magnetic presence',
    career: 'Research, investigation, surgery, psychology, occult sciences',
    careerSi: 'පර්යේෂණ, විමර්ශන, ශල්‍ය කර්ම, මනෝවිද්‍යාව, ගුප්ත විද්‍යා',
    gem: 'Red Coral (රතු පබළු)',
    luckyColor: 'Deep Red, Maroon',
    luckyDay: 'Tuesday (අඟහරුවාදා)',
  },
  'Dhanus': {
    english: 'Sagittarius Lagna',
    sinhala: 'ධනු ලග්නය',
    description: 'Jupiter (Guru) as your Lagna lord bestows wisdom, optimism, and spiritual inclination. Dhanus natives are philosophical seekers and natural teachers.',
    descriptionSi: 'ගුරු ග්‍රහයා ලග්නාධිපති වන බැවින් ප්‍රඥාව, ශුභවාදය සහ ආධ්‍යාත්මික නැඹුරුව ඔබට ලැබේ. ධනු ලග්නයේ අය දාර්ශනික ගවේෂකයන් සහ ස්වභාවික ගුරුවරුන් වේ.',
    traits: ['Wise & philosophical', 'Optimistic & adventurous', 'Love of learning & travel', 'Honest & straightforward'],
    traitsSi: ['ප්‍රඥාවන්ත හා දාර්ශනික', 'ශුභවාදී හා සාහසික', 'ඉගෙනීම හා ගමන් කිරීමට ප්‍රේමය', 'අවංක හා කෙළින්ම'],
    bodyType: 'Tall, well-proportioned, jovial expression',
    career: 'Education, law, religion, philosophy, publishing',
    careerSi: 'අධ්‍යාපනය, නීතිය, ආගම, දර්ශනය, ප්‍රකාශනය',
    gem: 'Yellow Sapphire (පුෂ්පරාග)',
    luckyColor: 'Yellow, Gold',
    luckyDay: 'Thursday (බ්‍රහස්පතින්දා)',
  },
  'Makara': {
    english: 'Capricorn Lagna',
    sinhala: 'මකර ලග්නය',
    description: 'Saturn (Shani) governs your Lagna, granting you tremendous discipline, patience, and ambition. Makara natives build empires slowly but surely through persistent effort.',
    descriptionSi: 'සෙනසුරු ග්‍රහයා ඔබේ ලග්නය පාලනය කරන බැවින් අති විශාල විනය, ඉවසීම සහ අභිලාෂය ඔබට ලැබේ. මකර ලග්නයේ අය සෙමින් නමුත් තහවුරුව අධිරාජ්‍යයන් ගොඩනඟති.',
    traits: ['Disciplined & ambitious', 'Extremely patient', 'Practical & responsible', 'Traditional values'],
    traitsSi: ['විනයගරුක හා අභිලාෂකාමී', 'අතිශයින් ඉවසිලිවන්ත', 'ප්‍රායෝගික හා වගකීම්සහගත', 'සාම්ප්‍රදායික වටිනාකම්'],
    bodyType: 'Lean, angular features, serious expression, ages well',
    career: 'Administration, engineering, mining, construction, politics',
    careerSi: 'පරිපාලනය, ඉංජිනේරු, පතල්කරණය, ඉදිකිරීම්, දේශපාලනය',
    gem: 'Blue Sapphire (නිල මැණික)',
    luckyColor: 'Dark Blue, Black',
    luckyDay: 'Saturday (සෙනසුරාදා)',
  },
  'Kumbha': {
    english: 'Aquarius Lagna',
    sinhala: 'කුම්භ ලග්නය',
    description: 'Saturn (Shani) rules your Lagna, combined with Rahu\'s influence giving you an unconventional, progressive, and humanitarian outlook. Kumbha natives think ahead of their time.',
    descriptionSi: 'සෙනසුරු ග්‍රහයා ඔබේ ලග්නය පාලනය කරන අතර රාහුගේ බලපෑම සමඟ ඔබට සාම්ප්‍රදායික නොවන, ප්‍රගතිශීලී සහ මානවවාදී දැක්මක් ලැබේ.',
    traits: ['Progressive & innovative', 'Humanitarian spirit', 'Independent thinker', 'Detached yet friendly'],
    traitsSi: ['ප්‍රගතිශීලී හා නවෝත්පාදන', 'මානවවාදී ආත්මය', 'ස්වාධීන චින්තකයා', 'විඩබරව නමුත් මිත්‍රශීලී'],
    bodyType: 'Tall, distinctive appearance, striking features',
    career: 'Technology, social work, aviation, electronics, astrology',
    careerSi: 'තාක්ෂණය, සමාජ සේවය, ගුවන් සේවය, ඉලෙක්ට්‍රොනිකය, ජ්‍යෝතිෂය',
    gem: 'Blue Sapphire (නිල මැණික)',
    luckyColor: 'Blue, Electric Blue',
    luckyDay: 'Saturday (සෙනසුරාදා)',
  },
  'Meena': {
    english: 'Pisces Lagna',
    sinhala: 'මීන ලග්නය',
    description: 'Jupiter (Guru) as your Lagna lord grants you deep spirituality, compassion, and artistic genius. Meena natives are empathic dreamers with a strong connection to the divine.',
    descriptionSi: 'ගුරු ග්‍රහයා ලග්නාධිපති වන බැවින් ගැඹුරු ආධ්‍යාත්මිකත්වය, කරුණාව සහ කලාත්මක ප්‍රතිභාව ඔබට ලැබේ. මීන ලග්නයේ අය දිව්‍ය සම්බන්ධතාවයක් ඇති සහානුභූතික සිහින දකින්නන් වේ.',
    traits: ['Spiritually inclined', 'Deeply compassionate', 'Artistic & creative', 'Dreamy & imaginative'],
    traitsSi: ['ආධ්‍යාත්මික නැඹුරු', 'ගැඹුරු කරුණාව', 'කලාත්මක හා නිර්මාණශීලී', 'සිහින බහුල හා සිතුවිලි'],
    bodyType: 'Soft features, dreamy eyes, medium build',
    career: 'Spirituality, arts, healing, music, film, charity',
    careerSi: 'ආධ්‍යාත්මිකත්වය, කලාව, සුව කිරීම, සංගීතය, චිත්‍රපට, දානශීලී',
    gem: 'Yellow Sapphire (පුෂ්පරාග)',
    luckyColor: 'Yellow, Sea Green',
    luckyDay: 'Thursday (බ්‍රහස්පතින්දා)',
  },
};

/**
 * GET /api/horoscope/daily/:sign
 * 
 * Params:
 * - sign: Zodiac sign name (e.g., "aries", "mesha", "mesha")
 */
router.get('/daily/:sign', (req, res) => {
  try {
    const signInput = req.params.sign.toLowerCase();

    // Find the rashi by English name or Vedic name
    const rashi = RASHIS.find(r =>
      r.english.toLowerCase() === signInput ||
      r.name.toLowerCase() === signInput
    );

    if (!rashi) {
      return res.status(400).json({
        error: 'Invalid zodiac sign.',
        validSigns: RASHIS.map(r => ({ vedic: r.name, western: r.english })),
      });
    }

    const today = new Date();
    const panchanga = getPanchanga(today);

    // Generate daily insights based on current transits
    const moonTransit = panchanga.moonSign;
    const sunTransit = panchanga.sunSign;

    // Calculate relationship between current transits and the queried sign
    const moonDistance = ((moonTransit.id - rashi.id + 12) % 12) + 1;
    const sunDistance = ((sunTransit.id - rashi.id + 12) % 12) + 1;

    // Determine areas affected
    const HOUSE_MEANINGS = {
      1: { area: 'Self & Personality', luck: 'high' },
      2: { area: 'Wealth & Family', luck: 'medium' },
      3: { area: 'Communication & Courage', luck: 'high' },
      4: { area: 'Home & Comfort', luck: 'medium' },
      5: { area: 'Romance & Creativity', luck: 'high' },
      6: { area: 'Health & Service', luck: 'low' },
      7: { area: 'Partnerships & Marriage', luck: 'high' },
      8: { area: 'Transformation & Occult', luck: 'low' },
      9: { area: 'Fortune & Spirituality', luck: 'high' },
      10: { area: 'Career & Status', luck: 'high' },
      11: { area: 'Gains & Aspirations', luck: 'high' },
      12: { area: 'Expenses & Liberation', luck: 'low' },
    };

    const moonHouse = HOUSE_MEANINGS[moonDistance];
    const sunHouse = HOUSE_MEANINGS[sunDistance];

    // Lucky elements for the day
    const luckyNumbers = [(rashi.id * 3 + today.getDate()) % 9 + 1, (rashi.id * 7 + today.getDate()) % 9 + 1];
    const colors = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Indigo', 'Violet', 'Gold', 'Silver', 'White', 'Pink', 'Maroon'];
    const luckyColor = colors[(rashi.id + today.getDay()) % colors.length];

    res.json({
      success: true,
      data: {
        sign: {
          vedic: rashi.name,
          english: rashi.english,
          sinhala: rashi.sinhala,
          tamil: rashi.tamil,
          lord: rashi.lord,
        },
        date: today.toISOString().split('T')[0],
        currentTransits: {
          moonIn: `${moonTransit.english} (${moonTransit.name})`,
          sunIn: `${sunTransit.english} (${sunTransit.name})`,
          moonHouseFromSign: moonDistance,
          sunHouseFromSign: sunDistance,
        },
        focus: {
          moonArea: moonHouse.area,
          sunArea: sunHouse.area,
        },
        overall: moonHouse.luck === 'high' && sunHouse.luck === 'high' ? 'Excellent'
          : moonHouse.luck === 'high' || sunHouse.luck === 'high' ? 'Good'
            : 'Challenging',
        luckyNumbers: [...new Set(luckyNumbers)],
        luckyColor,
        nakshatra: panchanga.nakshatra.name,
        tithi: panchanga.tithi.name,
      },
    });
  } catch (error) {
    console.error('Error generating horoscope:', error);
    res.status(500).json({ error: 'Failed to generate horoscope', details: error.message });
  }
});

/**
 * POST /api/horoscope/birth-chart
 * 
 * Body:
 * {
 *   birthDate: "1995-03-15T08:30:00Z",
 *   lat: 6.9271,
 *   lng: 79.8612
 * }
 */
router.post('/birth-chart', optionalAuth, async (req, res) => {
  const reqStart = Date.now();
  try {
    const { birthDate, lat, lng, language } = req.body;
    const uid = req.user?.uid || null;
    const lang = language || 'en';
    console.log('[birth-chart] ▶ POST /birth-chart uid=' + (uid || 'anon') + ' birthDate=' + birthDate + ' lang=' + lang);

    if (!birthDate) {
      console.log('[birth-chart] ✖ Missing birthDate');
      return res.status(400).json({ error: 'Birth date is required (ISO 8601 format).' });
    }

    const birthLat = parseFloat(lat) || 6.9271;
    const birthLng = parseFloat(lng) || 79.8612;

    // ── Check cached chart first (avoid recomputation) ───────────
    if (uid) {
      try {
        const cached = await getCachedBirthChart(uid);
        if (cached && cached.birthDate === birthDate && cached.chartData) {
          console.log('[birth-chart] ✔ Returning cached chart in ' + (Date.now() - reqStart) + 'ms');

          let cachedData = cached.chartData;

          // Swap in Sinhala translation if cached
          if (language === 'si' && cachedData.advancedAnalysis) {
            try {
              const cachedTranslation = await getCachedTranslation(uid, birthDate);
              if (cachedTranslation) cachedData = { ...cachedData, advancedAnalysis: cachedTranslation };
            } catch (e) { /* ignore */ }
          }

          // Swap in AI explanations if cached
          try {
            const cachedExpl = await getCachedChartExplanation(uid, birthDate, lang);
            if (cachedExpl) cachedData = { ...cachedData, chartExplanations: cachedExpl };
          } catch (e) { /* ignore */ }

          return res.json({ success: true, cached: true, data: cachedData });
        }
      } catch (cacheErr) {
        console.warn('[birth-chart] cache check failed (non-fatal):', cacheErr.message);
      }
    }

    // ── No cache hit — full computation ──────────────────────────
    let date;
    try {
      date = await parseBirthDateTime(birthDate, birthLat, birthLng);
    } catch (tzErr) {
      console.warn('[birth-chart] timezone resolution error, falling back to parseSLT:', tzErr.message);
      date = parseSLT(birthDate);
    }

    if (!date || isNaN(date.getTime())) {
      console.log('[birth-chart] ✖ Invalid date after timezone resolution:', birthDate);
      return res.status(400).json({ error: 'Invalid date format.' });
    }
    console.log('[birth-chart]   resolved UTC birth time:', date.toISOString());

    const panchanga = getPanchanga(date, birthLat, birthLng);
    const moonSidereal = toSidereal(getMoonLongitude(date), date);
    const sunSidereal = toSidereal(getSunLongitude(date), date);
    const lagna = getLagna(date, birthLat, birthLng);
    const houseChart = buildHouseChart(date, birthLat, birthLng);
    const navamshaChart = buildNavamshaChart(date, birthLat, birthLng);
    const yogas = detectYogas(date, birthLat, birthLng);
    const planetStrengths = getPlanetStrengths(date, birthLat, birthLng);
    const drishtis = calculateDrishtis(houseChart.houses);
    const pushkara = analyzePushkara(houseChart.planets);
    const ashtakavarga = calculateAshtakavarga(date, birthLat, birthLng);
    const bhavaChalit = buildBhavaChalit(date, birthLat, birthLng);
    console.log('[birth-chart]   core engine done in ' + (Date.now() - reqStart) + 'ms');

    let advancedAnalysis = null;
    try {
      advancedAnalysis = generateAdvancedAnalysis(date, birthLat, birthLng);
      console.log('[birth-chart]   advanced engine done in ' + (Date.now() - reqStart) + 'ms');
    } catch (err) {
      console.error('Advanced analysis failed (non-fatal):', err.message);
    }

    const moonNakshatra = getNakshatra(moonSidereal);
    const moonRashi = getRashi(moonSidereal);
    const sunRashi = getRashi(sunSidereal);
    const lagnaDetails = LAGNA_PALAPALA[lagna.rashi.name] || {};

    const d1Chart = [];
    const allPlanets = houseChart.planets;
    for (let i = 0; i < 12; i++) {
      const rashiId = i + 1;
      const r = RASHIS[i];
      const planetsInRashi = [];
      for (const [key, p] of Object.entries(allPlanets)) {
        if (p.rashiId === rashiId) {
          planetsInRashi.push({ key, name: p.name, sinhala: p.sinhala, degree: p.degreeInSign });
        }
      }
      if (lagna.rashi.id === rashiId) {
        planetsInRashi.unshift({ name: 'Lagna', sinhala: 'ලග්න' });
      }
      d1Chart.push({
        rashiId, rashi: r.name,
        rashiEnglish: r.english, rashiSinhala: r.sinhala, rashiLord: r.lord,
        planets: planetsInRashi,
      });
    }

    const RASHI_TRAITS = {
      'Mesha': ['Courageous', 'Energetic', 'Independent', 'Impulsive'],
      'Vrishabha': ['Patient', 'Reliable', 'Devoted', 'Stubborn'],
      'Mithuna': ['Versatile', 'Communicative', 'Witty', 'Restless'],
      'Kataka': ['Intuitive', 'Protective', 'Caring', 'Moody'],
      'Simha': ['Confident', 'Ambitious', 'Generous', 'Proud'],
      'Kanya': ['Analytical', 'Practical', 'Diligent', 'Critical'],
      'Tula': ['Diplomatic', 'Graceful', 'Idealistic', 'Indecisive'],
      'Vrischika': ['Passionate', 'Resourceful', 'Determined', 'Secretive'],
      'Dhanus': ['Optimistic', 'Philosophical', 'Adventurous', 'Careless'],
      'Makara': ['Disciplined', 'Responsible', 'Patient', 'Reserved'],
      'Kumbha': ['Progressive', 'Original', 'Humanitarian', 'Detached'],
      'Meena': ['Intuitive', 'Compassionate', 'Artistic', 'Escapist'],
    };

    // ── Build the response payload FIRST ─────────────────────────
    const responseData = {
        birthInfo: {
          date: date.toISOString(),
          location: { lat: birthLat, lng: birthLng },
        },
        lagna: {
          ...lagna.rashi,
          rashiId: lagna.rashi.id,
          degree: lagna.sidereal % 30,
          siderealDegree: lagna.sidereal,
        },
        lagnaDetails,
        moonSign: { ...moonRashi, degree: moonSidereal % 30 },
        sunSign: { ...sunRashi, degree: sunSidereal % 30 },
        nakshatra: moonNakshatra,
        houseChart: houseChart.houses,
        rashiChart: d1Chart,
        navamshaChart: navamshaChart.houses,
        navamshaLagna: navamshaChart.lagna,
        planets: houseChart.planets,
        planetStrengths,
        drishtis,
        pushkara,
        ashtakavarga,
        bhavaChalit,
        yogas,
        panchanga,
        personality: {
          lagnaTraits: RASHI_TRAITS[lagna.rashi.name] || [],
          moonTraits: RASHI_TRAITS[moonRashi.name] || [],
          sunTraits: RASHI_TRAITS[sunRashi.name] || [],
        },
        report: generateDetailedReport(lagna.rashi, moonRashi, sunRashi, houseChart.houses),
        dasaPeriods: calculateVimshottari(moonSidereal, date),
        advancedAnalysis: advancedAnalysis,
        chartExplanations: null,
    };

    // ── Save chart to cache SYNCHRONOUSLY before response ────────
    // This ensures the next request will hit cache, saving tokens.
    if (uid) {
      try {
        await saveBirthChartCache(uid, birthDate, responseData);
        console.log('[birth-chart] ✔ chart cached for uid=' + uid + ' in ' + (Date.now() - reqStart) + 'ms');
      } catch (e) {
        console.error('[birth-chart] ✖ chart cache save FAILED:', e.message);
      }
    }

    // ── AI translations & explanations (background, cache-first) ──
    if (language === 'si' && advancedAnalysis && uid) {
      try {
        const cachedTranslation = await getCachedTranslation(uid, birthDate);
        if (cachedTranslation) {
          responseData.advancedAnalysis = cachedTranslation;
          console.log('[birth-chart]   si translation from cache in ' + (Date.now() - reqStart) + 'ms');
        } else {
          console.log('[birth-chart]   si translation cache miss — translating in background');
          const analysisToTranslate = JSON.parse(JSON.stringify(advancedAnalysis));
          (async () => {
            try {
              const translated = await translateAdvancedForDisplay(analysisToTranslate);
              await saveTranslationCache(uid, birthDate, translated);
              console.log('[birth-chart:bg] si translation saved');
            } catch (bgErr) {
              console.error('[birth-chart:bg] translation save FAILED:', bgErr.message);
            }
          })();
        }
      } catch (trErr) {
        console.error('[birth-chart] translation cache check failed:', trErr.message);
      }
    }

    if (uid && advancedAnalysis) {
      try {
        const cachedExpl = await getCachedChartExplanation(uid, birthDate, lang);
        if (cachedExpl) {
          responseData.chartExplanations = cachedExpl;
          console.log('[birth-chart]   AI explanations from cache in ' + (Date.now() - reqStart) + 'ms');
        } else {
          console.log('[birth-chart]   AI explanations cache miss — generating in background');
          (async () => {
            try {
              const expl = await explainChartSimple(advancedAnalysis, lang);
              await saveChartExplanation(uid, birthDate, lang, expl);
              console.log('[birth-chart:bg] AI explanations saved');
            } catch (bgErr) {
              console.error('[birth-chart:bg] AI explanation save FAILED:', bgErr.message);
            }
          })();
        }
      } catch (cacheErr) {
        console.error('[birth-chart] explanation cache check failed:', cacheErr.message);
      }
    }

    const totalElapsed = Date.now() - reqStart;
    console.log('[birth-chart] ✔ Sending response after ' + totalElapsed + 'ms (hasExplanations=' + !!responseData.chartExplanations + ')');

    res.json({ success: true, cached: false, data: responseData });
  } catch (error) {
    const elapsed = Date.now() - reqStart;
    console.error('[birth-chart] ✖ ERROR after ' + elapsed + 'ms:', error.message);
    console.error('[birth-chart]   stack:', error.stack?.split('\n').slice(0, 3).join(' | '));
    res.status(500).json({ error: 'Failed to generate birth chart', details: error.message });
  }
});

/**
 * POST /api/horoscope/ai-analysis
 * Uses Gemini AI to generate a deeply personal, addictive analysis
 * based on ALL chart data (Lagna, Rashi, Navamsha, Yogas, Planet Strengths)
 */
router.post('/ai-analysis', async (req, res) => {
  try {
    const { birthDate, lat, lng, language = 'en' } = req.body;

    if (!birthDate) {
      return res.status(400).json({ error: 'Birth date is required.' });
    }

    const birthLat = parseFloat(lat) || 6.9271;
    const birthLng = parseFloat(lng) || 79.8612;

    let date;
    try {
      date = await parseBirthDateTime(birthDate, birthLat, birthLng);
    } catch (tzErr) {
      date = parseSLT(birthDate);
    }
    if (!date || isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format.' });
    }

    // Gather ALL chart data
    const lagna = getLagna(date, birthLat, birthLng);
    const moonSidereal = toSidereal(getMoonLongitude(date), date);
    const sunSidereal = toSidereal(getSunLongitude(date), date);
    const moonRashi = getRashi(moonSidereal);
    const sunRashi = getRashi(sunSidereal);
    const moonNakshatra = getNakshatra(moonSidereal);
    const houseChart = buildHouseChart(date, birthLat, birthLng);
    const navamshaChart = buildNavamshaChart(date, birthLat, birthLng);
    const yogas = detectYogas(date, birthLat, birthLng);
    const planetStrengths = getPlanetStrengths(date, birthLat, birthLng);
    const panchanga = getPanchanga(date, birthLat, birthLng);
    const drishtis = calculateDrishtis(houseChart.houses);
    const pushkara = analyzePushkara(houseChart.planets);
    const ashtakavarga = calculateAshtakavarga(date, birthLat, birthLng);

    // Build detailed planet positions text
    const planetPositions = Object.entries(houseChart.planets)
      .map(([key, p]) => `${p.name} (${p.sinhala}): ${p.rashiEnglish} at ${p.degreeInSign.toFixed(1)}° - House ${houseChart.houses.findIndex(h => h.planets.some(hp => hp.key === key)) + 1}`)
      .join('\n');

    // Build strength text
    const strengthText = Object.entries(planetStrengths)
      .filter(([k]) => k !== 'rahu' && k !== 'ketu')
      .map(([_, s]) => `${s.name}: ${s.status} (${s.score}/100) in house ${s.house}`)
      .join('\n');

    // Build yoga text
    const yogaText = yogas.length > 0
      ? yogas.map(y => `${y.icon} ${y.name} (${y.sinhala}): ${y.description}`).join('\n')
      : 'No major yogas detected';

    // Build navamsha text
    const navamshaText = Object.entries(navamshaChart.planets)
      .map(([key, p]) => `${p.name}: Navamsha ${p.navamshaRashiEnglish}`)
      .join(', ');

    const langInstruction = language === 'si'
      ? 'Respond ENTIRELY in Sinhala (සිංහල). Use traditional Sinhala astrological terminology. Make it deeply personal and emotionally resonant.'
      : 'Respond in English. Make it deeply personal and emotionally resonant. Use some Sinhala/Pali terms for authenticity.';

    const aiPrompt = `You are the most gifted Vedic astrologer in Sri Lanka, known for readings so accurate they give people chills. You have been given a person's complete birth chart data. Create an INTENSELY personal, deeply specific, almost eerily accurate astrological personality & life analysis.

${langInstruction}

BIRTH DATA:
- Birth: ${date.toISOString()}
- Lagna (Ascendant): ${lagna.rashi.english} (${lagna.rashi.sinhala}) at ${(lagna.sidereal % 30).toFixed(1)}°
- Moon Sign: ${moonRashi.english} (${moonRashi.sinhala}) at ${(moonSidereal % 30).toFixed(1)}°
- Sun Sign: ${sunRashi.english} (${sunRashi.sinhala}) at ${(sunSidereal % 30).toFixed(1)}°
- Nakshatra: ${moonNakshatra.name} (${moonNakshatra.sinhala}) Pada ${moonNakshatra.pada}, Lord: ${moonNakshatra.lord}
- Birth Tithi: ${panchanga.tithi.name} (${panchanga.tithi.pakshaName})

PLANETARY POSITIONS (Sidereal):
${planetPositions}

PLANET STRENGTHS:
${strengthText}

YOGAS & DOSHAS:
${yogaText}

NAVAMSHA (D9):
Navamsha Lagna: ${navamshaChart.lagna.rashi.english} (${navamshaChart.lagna.rashi.sinhala})
${navamshaText}

PLANETARY ASPECTS (DRISHTIS):
${Object.entries(drishtis.planetAspects || {}).map(([planet, data]) => `${planet}: aspects houses ${(data.aspectsHouses || []).join(', ')}`).join('\n')}

ASHTAKAVARGA STRENGTHS:
Strongest sign: ${ashtakavarga.summary?.strongestSign?.[0] || 'N/A'} (${ashtakavarga.summary?.strongestSign?.[1]?.bindus || 0} bindus)
Weakest sign: ${ashtakavarga.summary?.weakestSign?.[0] || 'N/A'} (${ashtakavarga.summary?.weakestSign?.[1]?.bindus || 0} bindus)
Sarvashtakavarga: ${(ashtakavarga.sarvashtakavarga || []).map((pts, i) => `${['Mesha','Vrishabha','Mithuna','Karka','Simha','Kanya','Tula','Vrischika','Dhanu','Makara','Kumbha','Meena'][i]}=${pts}`).join(', ')}

PUSHKARA STATUS:
${Object.entries(pushkara || {}).filter(([, p]) => p.inPushkaraNavamsha || p.inPushkaraBhaga).map(([name, p]) => `${name}: ${p.inPushkaraNavamsha ? 'Pushkara Navamsha ✨' : ''} ${p.inPushkaraBhaga ? 'Pushkara Bhaga ✨' : ''}`).join('\n') || 'No planets in Pushkara positions'}

ANALYSIS FORMAT - Create these sections with emojis, make each deeply personal:

1. 🔮 SOUL BLUEPRINT (ආත්ම සැලැස්ම) - Who they TRULY are at the deepest level. Their core essence based on Lagna+Moon+Nakshatra combination. Be specific about their inner contradictions, secret desires, and hidden strengths.

2. 💝 LOVE & RELATIONSHIPS (ප්‍රේමය හා සබඳතා) - Based on 7th house, Venus, Navamsha D9. Be very specific about what type of partner they attract, their romantic patterns, when they'll find deep love, marriage timing indicators.

3. 💰 WEALTH & CAREER (ධනය හා වෘත්තිය) - Based on 10th house, 2nd house, 11th house lords, Dhana yogas. Specific career paths that WILL succeed, money patterns, best investment times.

4. ⚡ HIDDEN POWERS & YOGAS (සැඟවුණු බලයන්) - Their yogas explained dramatically. What makes them special. Their secret superpower that most people don't see.

5. ⚠️ SHADOW & CHALLENGES (අභියෝග) - Doshas, weak planets, what to watch for. But ALWAYS end with specific remedies and hope.

6. 🌟 DESTINY & TIMING (ඉරණම) - Key life periods, current planetary period effects, what's coming next. Make it exciting and specific.

7. 💎 PERSONAL REMEDIES (පිළියම්) - Specific gemstones, mantras, colors, days, temples to visit (Sri Lankan temples), specific rituals.

CRITICAL RULES:
- Be SPECIFIC, not generic. Reference exact planetary positions.
- Make it feel like you're reading their soul, not a textbook.
- Use dramatic, engaging language that makes them want to share it.
- Every sentence should feel personally tailored.
- Include specific predictions with timeframes.
- Reference their Nakshatra pada for extra specificity.
- Maximum 2000 words. Dense with insights.`;

    const aiResponse = await chat(aiPrompt, {
      birthDate: birthDate,
      birthLat: birthLat,
      birthLng: birthLng,
      language: language,
      provider: 'gemini',
    });

    res.json({
      success: true,
      data: {
        analysis: aiResponse.message,
        lagna: lagna.rashi.english,
        lagnaSinhala: lagna.rashi.sinhala,
        moonSign: moonRashi.english,
        nakshatra: moonNakshatra.name,
        yogaCount: yogas.length,
        yogas: yogas.map(y => ({ name: y.name, sinhala: y.sinhala, icon: y.icon, strength: y.strength })),
        planetStrengths: Object.entries(planetStrengths)
          .filter(([k]) => k !== 'rahu' && k !== 'ketu')
          .map(([k, s]) => ({ key: k, name: s.name, sinhala: s.sinhala, score: s.score, status: s.status, strength: s.strength })),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error generating AI analysis:', error);
    res.status(500).json({ error: 'Failed to generate analysis', details: error.message });
  }
});

/**
 * GET /api/horoscope/birth-chart/data
 * 
 * Query Params:
 * - date: Birth date (ISO 8601 format)
 * - lat: Latitude (optional)
 * - lng: Longitude (optional)
 */
router.get('/birth-chart/data', optionalAuth, async (req, res) => {
  try {
    const { date, lat, lng, language, basic } = req.query;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    const birthLat = parseFloat(lat) || 6.9271;
    const birthLng = parseFloat(lng) || 79.8612;

    let birthDate;
    try {
      birthDate = await parseBirthDateTime(date, birthLat, birthLng);
    } catch (tzErr) {
      birthDate = parseSLT(date);
    }
    if (!birthDate || isNaN(birthDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format.' });
    }
    const isBasic = basic === 'true' || basic === '1';

    const houseChart = buildHouseChart(birthDate, birthLat, birthLng);
    const navamshaChart = buildNavamshaChart(birthDate, birthLat, birthLng);

    // ── Basic mode: return only what the home screen needs (no AI calls) ──
    if (isBasic) {
      const lagna = getLagna(birthDate, birthLat, birthLng);
      const moonSidereal = toSidereal(getMoonLongitude(birthDate), birthDate);
      const sunSidereal = toSidereal(getSunLongitude(birthDate), birthDate);
      const moonNakshatra = getNakshatra(moonSidereal);
      const moonRashi = getRashi(moonSidereal);
      const sunRashi = getRashi(sunSidereal);
      const lagnaDetails = LAGNA_PALAPALA[lagna.rashi.name] || {};

      // Build D1 chart (same as POST /birth-chart)
      const d1Chart = [];
      const allPlanets = houseChart.planets;
      for (let i = 0; i < 12; i++) {
        const rashiId = i + 1;
        const r = RASHIS[i];
        const planetsInRashi = [];
        for (const [key, p] of Object.entries(allPlanets)) {
          if (p.rashiId === rashiId) {
            planetsInRashi.push({ key, name: p.name, sinhala: p.sinhala, degree: p.degreeInSign });
          }
        }
        if (lagna.rashi.id === rashiId) {
          planetsInRashi.unshift({ name: 'Lagna', sinhala: 'ලග්න' });
        }
        d1Chart.push({
          rashiId, rashi: r.name,
          rashiEnglish: r.english, rashiSinhala: r.sinhala, rashiLord: r.lord,
          planets: planetsInRashi,
        });
      }

      const RASHI_TRAITS = {
        'Mesha': ['Courageous', 'Energetic', 'Independent', 'Impulsive'],
        'Vrishabha': ['Patient', 'Reliable', 'Devoted', 'Stubborn'],
        'Mithuna': ['Versatile', 'Communicative', 'Witty', 'Restless'],
        'Kataka': ['Intuitive', 'Protective', 'Caring', 'Moody'],
        'Simha': ['Confident', 'Ambitious', 'Generous', 'Proud'],
        'Kanya': ['Analytical', 'Practical', 'Diligent', 'Critical'],
        'Tula': ['Diplomatic', 'Graceful', 'Idealistic', 'Indecisive'],
        'Vrischika': ['Passionate', 'Resourceful', 'Determined', 'Secretive'],
        'Dhanus': ['Optimistic', 'Philosophical', 'Adventurous', 'Careless'],
        'Makara': ['Disciplined', 'Responsible', 'Patient', 'Reserved'],
        'Kumbha': ['Progressive', 'Original', 'Humanitarian', 'Detached'],
        'Meena': ['Intuitive', 'Compassionate', 'Artistic', 'Escapist'],
      };

      return res.json({
        success: true,
        data: {
          lagna: {
            ...lagna.rashi,
            rashiId: lagna.rashi.id,
            degree: lagna.sidereal % 30,
            siderealDegree: lagna.sidereal,
          },
          lagnaDetails,
          moonSign: { ...moonRashi, degree: moonSidereal % 30 },
          sunSign: { ...sunRashi, degree: sunSidereal % 30 },
          nakshatra: moonNakshatra,
          rashiChart: d1Chart,
          personality: {
            lagnaTraits: RASHI_TRAITS[lagna.rashi.name] || [],
            moonTraits: RASHI_TRAITS[moonRashi.name] || [],
            sunTraits: RASHI_TRAITS[sunRashi.name] || [],
          },
        },
      });
    }

    const shadvarga = buildShadvarga(birthDate, birthLat, birthLng);
    
    // Calculate Panchanga
    const panchanga = getPanchanga(birthDate, birthLat, birthLng);

    // New advanced calculations
    const drishtis = calculateDrishtis(houseChart.houses);
    const pushkara = analyzePushkara(houseChart.planets);
    const ashtakavarga = calculateAshtakavarga(birthDate, birthLat, birthLng);
    const bhavaChalit = buildBhavaChalit(birthDate, birthLat, birthLng);

    // ── Advanced Engine (Tiers 1-2-3) ────────────────────────────
    let advancedAnalysis = null;
    try {
      advancedAnalysis = generateAdvancedAnalysis(birthDate, birthLat, birthLng);
    } catch (err) {
      console.error('Advanced analysis (GET) failed (non-fatal):', err.message);
    }

    // Sinhala translation: cache-first, background on miss
    const getUid = req.user?.uid || null;
    if (language === 'si' && advancedAnalysis && getUid) {
      try {
        const cachedTr = await getCachedTranslation(getUid, date);
        if (cachedTr) {
          advancedAnalysis = cachedTr;
        } else {
          const cloned = JSON.parse(JSON.stringify(advancedAnalysis));
          (async () => {
            try {
              const translated = await translateAdvancedForDisplay(cloned);
              try { await saveTranslationCache(getUid, date, translated); } catch (se) { console.warn('Save translation (GET) failed:', se.message); }
            } catch (e) { console.error('BG translation (GET) failed:', e.message); }
          })();
        }
      } catch (e) { console.error('Translation cache check (GET) failed:', e.message); }
    }

    // Flatten lagna for client: client expects rashiId, lord, degree, english, name, etc. at top level
    const lagna = houseChart.lagna;
    const flatLagna = {
      ...lagna.rashi,             // id, name, english, sinhala, lord, degree
      rashiId: lagna.rashi.id,    // explicit rashiId
      rashiSinhala: lagna.rashi.sinhala,
      degree: lagna.sidereal % 30,
      siderealDegree: lagna.sidereal,
      tropical: lagna.tropical,
      sidereal: lagna.sidereal,
    };

    // Add Lagna marker to house 1's planets so the chart grid shows ASC
    const houses = houseChart.houses.map(h => {
      if (h.houseNumber === 1) {
        return {
          ...h,
          planets: [{ name: 'Lagna', sinhala: 'ලග්න' }, ...h.planets],
        };
      }
      return h;
    });

    // Build planets array for the Planets tab (client expects an array with name, rashiId, degree)
    const planetsArray = Object.entries(houseChart.planets).map(([key, p]) => ({
      key,
      name: p.name,
      sinhala: p.sinhala,
      rashiId: p.rashiId,
      rashi: p.rashi,
      rashiEnglish: p.rashiEnglish,
      rashiSinhala: p.rashiSinhala,
      degree: p.degreeInSign,
      tropical: p.tropical,
      sidereal: p.sidereal,
      isRetrograde: p.isRetrograde || false,
    }));

    // ── Gender Energy Prediction (balanced Vedic indicators) ────────────
    const moonPlanet = houseChart.planets.moon || houseChart.planets.Moon;
    const sunPlanet = houseChart.planets.sun || houseChart.planets.Sun;
    const marsPlanet = houseChart.planets.mars || houseChart.planets.Mars;
    const jupiterPlanet = houseChart.planets.jupiter || houseChart.planets.Jupiter;
    const venusPlanet = houseChart.planets.venus || houseChart.planets.Venus;

    // ── AI Simple Explanations (GET route) — cache-first, background on miss ──
    let chartExplanations = null;
    const getLang = language || 'en';
    if (getUid && advancedAnalysis) {
      try {
        chartExplanations = await getCachedChartExplanation(getUid, date, getLang);
        if (!chartExplanations) {
          const analysisForAI = JSON.parse(JSON.stringify(advancedAnalysis));
          (async () => {
            try {
              const expl = await explainChartSimple(analysisForAI, getLang);
              try { await saveChartExplanation(getUid, date, getLang, expl); } catch (se) { console.warn('Save explanation (GET) failed:', se.message); }
            } catch (e) { console.error('BG explanation (GET) failed:', e.message); }
          })();
        }
      } catch (exErr) {
        console.error('Chart explanation (GET) failed (non-fatal):', exErr.message);
      }
    }

    res.json({
        success: true,
        data: {
            houseChart: houses,
            rashiChart: houses,
            navamshaChart: navamshaChart.houses,
            shadvarga: shadvarga.vargaPositions,
            specialLords: shadvarga.specialLords,
            lagna: flatLagna,
            planets: planetsArray,
            panchanga: panchanga,
            drishtis: drishtis,
            pushkara: pushkara,
            ashtakavarga: ashtakavarga,
            bhavaChalit: bhavaChalit,
            advancedAnalysis: advancedAnalysis,
            chartExplanations: chartExplanations,
        }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/horoscope/full-report
// Comprehensive 13-section Jyotish report
// Body: { birthDate, lat?, lng? }
// ═══════════════════════════════════════════════════════════════════
router.post('/full-report', async (req, res) => {
  try {
    const { birthDate, lat = 6.9271, lng = 79.8612 } = req.body;

    if (!birthDate) {
      return res.status(400).json({ error: 'birthDate is required (ISO format or parseable date string)' });
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    let date;
    try {
      date = await parseBirthDateTime(birthDate, parsedLat, parsedLng);
    } catch (tzErr) {
      date = parseSLT(birthDate);
    }
    if (!date || isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid birthDate format. Use ISO format e.g. 1998-10-09T09:16:00' });
    }

    console.log(`[Full Report] Generating for ${date.toISOString()} at (${parsedLat}, ${parsedLng})`);
    const startTime = Date.now();

    const report = generateFullReport(date, parsedLat, parsedLng);

    const elapsed = Date.now() - startTime;
    console.log(`[Full Report] Generated in ${elapsed}ms — ${Object.keys(report.sections).length} sections`);

    res.json({
      success: true,
      generationTime: `${elapsed}ms`,
      data: report,
    });
  } catch (error) {
    console.error('[Full Report] Error:', error);
    res.status(500).json({ error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/horoscope/full-report-ai
// AI-powered narrative report — addictive, personal, no jargon
// Body: { birthDate, lat?, lng?, language? }
// Optional auth: if logged in, caches report & returns cached if available
// ═══════════════════════════════════════════════════════════════════

router.post('/full-report-ai', phoneAuth, requireTokens(350, 'Full AI Report'), async (req, res) => {
  try {
    const { birthDate, lat = 6.9271, lng = 79.8612, language = 'en', birthLocation = null, userName = null, userGender = null, userReligion = null } = req.body;

    if (!birthDate) {
      return res.status(400).json({ error: 'birthDate is required (ISO format or parseable date string)' });
    }

    const reportLat = parseFloat(lat);
    const reportLng = parseFloat(lng);
    let date;
    try {
      date = await parseBirthDateTime(birthDate, reportLat, reportLng);
    } catch (tzErr) {
      date = parseSLT(birthDate);
    }
    if (!date || isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid birthDate format. Use ISO format e.g. 1998-10-09T09:16:00' });
    }

    // Check for cached report — DISABLED: always regenerate fresh
    // Cache lookup disabled to ensure latest engine + prompt improvements are used
    /*
    if (req.user && !req.user.anonymous && !req.query.forceRegenerate) {
      try {
        const cached = await getCachedReport(req.user.uid, birthDate, language);
        if (cached) {
          console.log(`[AI Report] Returning cached report ${cached.id} for user ${req.user.uid}`);
          return res.json({
            success: true,
            cached: true,
            tokenCost: 0,
            balance: req.tokenBalanceBefore,
            generationTime: '0ms',
            data: {
              generatedAt: cached.createdAt,
              language: cached.language,
              birthData: cached.birthInfo,
              rashiChart: cached.rashiChart,
              narrativeSections: cached.sections,
            },
          });
        }
      } catch (e) {
        console.warn('[AI Report] Cache check failed:', e.message);
      }
    }
    */

    // Deduct LKR 15 BEFORE generation
    let newBalance = req.tokenBalanceBefore;
    try {
      const deduction = await req.deductTokens();
      newBalance = deduction.newBalance;
    } catch (e) {
      if (e.code === 'INSUFFICIENT_BALANCE') {
        return res.status(402).json({ error: 'Insufficient token balance', balance: e.balance, required: e.required, topUpRequired: true });
      }
      throw e;
    }

    console.log(`[AI Report] Generating narrative report for ${date.toISOString()} at (${reportLat}, ${reportLng}) in ${language}`);
    const startTime = Date.now();

    const report = await generateAINarrativeReport(date, reportLat, reportLng, language, birthLocation, userName, userGender, userReligion);

    const elapsed = Date.now() - startTime;
    const sectionCount = Object.keys(report.narrativeSections).length;
    console.log(`[AI Report] Complete in ${elapsed}ms — ${sectionCount} narrative sections`);

    // Save report to Firestore — DISABLED: caching disabled during development
    /*
    if (req.user && !req.user.anonymous) {
      try {
        const reportId = await saveReport(req.user.uid, {
          birthDate,
          lat: reportLat,
          lng: reportLng,
          language,
          type: 'ai-narrative',
          sections: report.narrativeSections,
          rashiChart: report.rashiChart,
          birthInfo: report.birthData,
          generationTime: `${elapsed}ms`,
          userName: userName || null,
          userGender: userGender || null,
          birthLocation: birthLocation || null,
        });
        console.log(`[AI Report] Saved to Firestore: ${reportId}`);
      } catch (e) {
        console.warn('[AI Report] Failed to cache report:', e.message);
      }
    }
    */

    res.json({
      success: true,
      cached: false,
      tokenCost: req.tokenCost,
      balance: newBalance,
      generationTime: `${elapsed}ms`,
      data: report,
      tokenUsage: report.tokenUsage || null,
    });
  } catch (error) {
    console.error('[AI Report] Error:', error);
    res.status(500).json({ error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/horoscope/my-reports
// List saved reports for current user
// ═══════════════════════════════════════════════════════════════════
router.get('/my-reports', optionalAuth, async (req, res) => {
  try {
    if (!req.user || req.user.anonymous) {
      return res.status(401).json({ error: 'Login required to view saved reports' });
    }
    const reports = await getUserReports(req.user.uid);
    // Return lightweight list (no full narrative content)
    const list = (reports || []).map(r => ({
      id: r.id,
      birthDate: r.birthDate,
      language: r.language,
      createdAt: r.createdAt,
      generationTime: r.generationTime,
      birthInfo: r.birthInfo,
      sectionCount: r.sections ? Object.keys(r.sections).length : 0,
      userName: r.userName || null,
      birthLocation: r.birthLocation || null,
    }));
    res.json({ success: true, data: { reports: list } });
  } catch (error) {
    console.error('[my-reports] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/horoscope/saved-report/:id
// Load a single saved report by ID
// ═══════════════════════════════════════════════════════════════════
router.get('/saved-report/:id', optionalAuth, async (req, res) => {
  try {
    if (!req.user || req.user.anonymous) {
      return res.status(401).json({ error: 'Login required to view saved reports' });
    }
    const { getDb, COLLECTIONS } = require('../config/firebase');
    const db = getDb();
    if (!db) return res.status(503).json({ error: 'Database unavailable' });

    const doc = await db.collection(COLLECTIONS.REPORTS).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Report not found' });

    const data = doc.data();
    // Security: only the owner can view their report
    if (data.uid !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      data: {
        id: doc.id,
        generatedAt: data.createdAt,
        language: data.language,
        birthDate: data.birthDate || null,
        birthData: data.birthInfo,
        rashiChart: data.rashiChart,
        narrativeSections: data.sections,
        generationTime: data.generationTime,
        userName: data.userName || null,
        userGender: data.userGender || null,
        birthLocation: data.birthLocation || null,
        lat: data.lat || null,
        lng: data.lng || null,
      },
    });
  } catch (error) {
    console.error('[saved-report] Error:', error.message);
    res.status(500).json({ error: 'Failed to load report' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// DELETE /api/horoscope/saved-report/:id
// Delete a saved report
// ═══════════════════════════════════════════════════════════════════
router.delete('/saved-report/:id', phoneAuth, async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Login required to delete reports' });
    }
    const { getDb, COLLECTIONS } = require('../config/firebase');
    const db = getDb();
    if (!db) return res.status(503).json({ error: 'Database unavailable' });

    const docRef = db.collection(COLLECTIONS.REPORTS).doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Report not found' });

    const data = doc.data();
    // Security: only the owner can delete their report
    if (data.uid !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await docRef.delete();
    console.log(`[delete-report] Deleted report ${req.params.id} for user ${req.user.uid}`);
    res.json({ success: true, message: 'Report deleted' });
  } catch (error) {
    console.error('[delete-report] Error:', error.message);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

module.exports = router;
