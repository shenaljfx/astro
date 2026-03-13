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
const { saveReport, getCachedReport, saveChartExplanation, getCachedChartExplanation, saveTranslationCache, getCachedTranslation, getUserReports } = require('../models/firestore');
const { parseSLT } = require('../utils/dateUtils');

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
    console.log('[birth-chart] ▶ POST /birth-chart uid=' + (req.user?.uid || 'anon') + ' birthDate=' + birthDate + ' lang=' + (language || 'en'));

    if (!birthDate) {
      console.log('[birth-chart] ✖ Missing birthDate');
      return res.status(400).json({ error: 'Birth date is required (ISO 8601 format).' });
    }

    const date = parseSLT(birthDate);
    if (!date || isNaN(date.getTime())) {
      console.log('[birth-chart] ✖ Invalid date after parseSLT:', birthDate);
      return res.status(400).json({ error: 'Invalid date format.' });
    }
    console.log('[birth-chart]   parseSLT result:', date.toISOString());

    const birthLat = parseFloat(lat) || 6.9271;
    const birthLng = parseFloat(lng) || 79.8612;

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

    // ── Advanced Engine (Tiers 1-2-3) ────────────────────────────
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

    // Get Lagna Palapala (detailed interpretation)
    const lagnaDetails = LAGNA_PALAPALA[lagna.rashi.name] || {};

    // Standard D1 Rashi Chart (Ordered by Rashi ID 1-12 for South Indian Grid)
    const d1Chart = [];
    const allPlanets = houseChart.planets;
    
    // Create an array required by the grid: index 0 = Aries, 1 = Taurus, etc.
    for (let i = 0; i < 12; i++) {
      const rashiId = i + 1; // 1 = Mesha
      const r = RASHIS[i];
      const planetsInRashi = [];
      
      // Find planets in this Rashi
      for (const [key, p] of Object.entries(allPlanets)) {
        if (p.rashiId === rashiId) {
          planetsInRashi.push({ key, name: p.name, sinhala: p.sinhala, degree: p.degreeInSign });
        }
      }
      
      // Check if Lagna is in this Rashi
      const isLagna = lagna.rashi.id === rashiId;
      if (isLagna) {
          planetsInRashi.unshift({ name: 'Lagna', sinhala: 'ලග්න' });
      }

      d1Chart.push({
        rashiId, rashi: r.name,
        rashiEnglish: r.english, rashiSinhala: r.sinhala, rashiLord: r.lord,
        planets: planetsInRashi,
      });
    }

    // Determine personality traits based on Nakshatra and Rashi
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

    // ── AI translations & explanations ──
    // Both translation and AI explanations use cache-first strategy.
    // Cache hit = instant. Cache miss = send response immediately, generate in background.
    const uid = req.user?.uid || null;
    const lang = language || 'en';

    // Sinhala translation: check cache first, generate in background if miss
    if (language === 'si' && advancedAnalysis && uid) {
      try {
        const cachedTranslation = await getCachedTranslation(uid, birthDate);
        if (cachedTranslation) {
          advancedAnalysis = cachedTranslation;
          console.log('[birth-chart]   si translation from cache in ' + (Date.now() - reqStart) + 'ms');
        } else {
          // Cache miss — fire-and-forget: translate in background, send English for now
          console.log('[birth-chart]   si translation cache miss — translating in background');
          const analysisToTranslate = JSON.parse(JSON.stringify(advancedAnalysis)); // deep clone
          (async () => {
            try {
              const translated = await translateAdvancedForDisplay(analysisToTranslate);
              console.log('[birth-chart:bg]   si translation done');
              if (translated) {
                await saveTranslationCache(uid, birthDate, translated).catch(e =>
                  console.error('[birth-chart:bg] translation cache save failed:', e.message)
                );
                console.log('[birth-chart:bg]   translation cached for next load');
              }
            } catch (bgErr) {
              console.error('[birth-chart:bg] background translation failed:', bgErr.message);
            }
          })();
        }
      } catch (trErr) {
        console.error('Translation cache check failed (non-fatal):', trErr.message);
      }
    }

    let chartExplanations = null;

    if (uid && advancedAnalysis) {
      try {
        // Check cache first (fast Firestore read)
        chartExplanations = await getCachedChartExplanation(uid, birthDate, lang);
        if (chartExplanations) {
          console.log('[birth-chart]   AI explanations from cache in ' + (Date.now() - reqStart) + 'ms');
        } else {
          // Cache miss — fire-and-forget: generate in background, don't block the response
          console.log('[birth-chart]   AI explanations cache miss — generating in background');
          (async () => {
            try {
              const expl = await explainChartSimple(advancedAnalysis, lang);
              console.log('[birth-chart:bg]   AI explanations generated');
              if (expl) {
                await saveChartExplanation(uid, birthDate, lang, expl).catch(e =>
                  console.error('[birth-chart:bg] cache save failed:', e.message)
                );
                console.log('[birth-chart:bg]   cached for next load');
              }
            } catch (bgErr) {
              console.error('[birth-chart:bg] background AI failed:', bgErr.message);
            }
          })();
        }
      } catch (cacheErr) {
        console.error('Cache check failed (non-fatal):', cacheErr.message);
      }
    } else if (!uid && advancedAnalysis) {
      // No auth — skip AI explanations (can't cache without uid)
      console.log('[birth-chart]   no uid, skipping AI explanations');
    }

    const totalElapsed = Date.now() - reqStart;
    console.log('[birth-chart] ✔ Sending response after ' + totalElapsed + 'ms (hasExplanations=' + !!chartExplanations + ')');

    res.json({
      success: true,
      data: {
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
        chartExplanations: chartExplanations,
        genderPrediction: (function() {
          // ── Balanced Gender Energy Prediction (Vedic) ──────────────
          // Uses balanced masculine AND feminine Vedic indicators.
          // Scores both energies equally, then compares.
          // Entertainment / personality insight — NOT deterministic.
          const lagnaRashiId = lagna.rashi.id;
          const moonP = houseChart.planets.moon || houseChart.planets.Moon;
          const sunP = houseChart.planets.sun || houseChart.planets.Sun;
          const marsP = houseChart.planets.mars || houseChart.planets.Mars;
          const jupiterP = houseChart.planets.jupiter || houseChart.planets.Jupiter;
          const venusP = houseChart.planets.venus || houseChart.planets.Venus;
          const saturnP = houseChart.planets.saturn || houseChart.planets.Saturn;
          const navLagnaId = navamshaChart.lagna?.rashi?.id || 1;

          // We score feminine points (fP) vs masculine points (mP) on same scale
          var fP = 0;
          var mP = 0;
          var getHouseOf = function(pName) {
            return houseChart.houses.findIndex(function(h) {
              return h.planets.some(function(p) { return (p.key || p.name || '').toLowerCase() === pName; });
            }) + 1;
          };

          // ── Factor 1: Lagna rashi odd/even (weight 3) — BPHS classical rule
          // Odd rashis (Aries, Gemini, Leo, Libra, Sagittarius, Aquarius) = masculine
          // Even rashis (Taurus, Cancer, Virgo, Scorpio, Capricorn, Pisces) = feminine
          if (lagnaRashiId % 2 === 1) mP += 3; else fP += 3;

          // ── Factor 2: Lagna lord — masculine/feminine planet? (weight 3)
          var lagnaLord = (lagna.rashi.lord || '').toLowerCase();
          if (['sun', 'mars', 'jupiter'].includes(lagnaLord)) mP += 3;
          else if (['moon', 'venus'].includes(lagnaLord)) fP += 3;
          else { mP += 1.5; fP += 1.5; } // Mercury/Saturn = neutral

          // ── Factor 3: Planets in Lagna house — masc vs fem planets (weight 2 each)
          var lagnaHouse = houseChart.houses.find(function(h) { return h.houseNumber === 1; });
          var lagnaPlNames = (lagnaHouse ? lagnaHouse.planets : []).map(function(p) { return (p.name || '').toLowerCase(); });
          ['sun', 'mars', 'jupiter'].forEach(function(n) { if (lagnaPlNames.includes(n)) mP += 2; });
          ['moon', 'venus'].forEach(function(n) { if (lagnaPlNames.includes(n)) fP += 2; });

          // ── Factor 4: Sun vs Moon — which is stronger by house position (weight 3)
          if (sunP && moonP) {
            var sunH = getHouseOf('sun');
            var moonH = getHouseOf('moon');
            var sunStrong = [1, 4, 7, 10, 5, 9].includes(sunH);
            var moonStrong = [1, 4, 7, 10, 5, 9].includes(moonH);
            if (sunStrong && !moonStrong) mP += 3;
            else if (!sunStrong && moonStrong) fP += 3;
            else { mP += 1.5; fP += 1.5; }
          }

          // ── Factor 5: Venus strength — Venus strong = strong feminine (weight 3)
          if (venusP) {
            var venusOwn = [2, 7].includes(venusP.rashiId); // Taurus or Libra
            var venusExalt = venusP.rashiId === 12; // Pisces
            var venusH = getHouseOf('venus');
            var venusAngTri = [1, 4, 7, 10, 5, 9].includes(venusH);
            if (venusOwn || venusExalt) fP += 3;
            else if (venusAngTri) fP += 2;
            else fP += 1;
          }

          // ── Factor 6: Mars strength — Mars strong = strong masculine (weight 3)
          if (marsP) {
            var marsOwn = [1, 8].includes(marsP.rashiId); // Aries or Scorpio
            var marsExalt = marsP.rashiId === 10; // Capricorn
            var marsH = getHouseOf('mars');
            var marsAngTri = [1, 4, 7, 10, 5, 9].includes(marsH);
            if (marsOwn || marsExalt) mP += 3;
            else if (marsAngTri) mP += 2;
            else mP += 1;
          }

          // ── Factor 7: Moon Nakshatra gender (weight 3) — traditional BPHS classification
          // Male: Ashwini(1), Pushya(8), Ashlesha(9), Magha(10), Uttara Phalguni(12),
          //   Hasta(13), Swati(15), Anuradha(17), Mula(19), Uttara Ashadha(21),
          //   Shravana(22), Uttara Bhadrapada(26)
          // Female: Bharani(2), Krittika(3), Rohini(4), Mrigashira(5), Ardra(6),
          //   Punarvasu(7), Purva Phalguni(11), Chitra(14), Vishakha(16), Jyeshtha(18),
          //   Purva Ashadha(20), Dhanishta(23), Shatabhisha(24), Purva Bhadrapada(25), Revati(27)
          var maleNakshatras = [1, 8, 9, 10, 12, 13, 15, 17, 19, 21, 22, 26];
          var nakshatraId = moonNakshatra ? (moonNakshatra.id || moonNakshatra.index || 0) : 0;
          if (maleNakshatras.includes(nakshatraId)) mP += 3;
          else if (nakshatraId > 0) fP += 3;

          // ── Factor 8: Moon rashi odd/even (weight 2)
          if (moonP) {
            if (moonP.rashiId % 2 === 1) mP += 2; else fP += 2;
          }

          // ── Factor 9: Navamsha lagna odd/even (weight 2)
          if (navLagnaId % 2 === 1) mP += 2; else fP += 2;

          // ── Factor 10: Moon in own/exalt = feminine boost (weight 2)
          if (moonP) {
            var moonOwn = moonP.rashiId === 4; // Cancer
            var moonExalt = moonP.rashiId === 2; // Taurus
            if (moonOwn || moonExalt) fP += 2;
          }

          // ── Factor 11: 7th house planets — feminine planets in 7th = feminine (weight 2)
          var h7 = houseChart.houses.find(function(h) { return h.houseNumber === 7; });
          var h7Names = (h7 ? h7.planets : []).map(function(p) { return (p.name || '').toLowerCase(); });
          ['moon', 'venus'].forEach(function(n) { if (h7Names.includes(n)) fP += 2; });
          ['sun', 'mars'].forEach(function(n) { if (h7Names.includes(n)) mP += 2; });

          // ── Factor 12: Venus-Sun conjunction — combustion feminizes (weight 2)
          // When Venus is within ~10° of Sun (same house), feminine energy absorbs masculine
          if (venusP && sunP) {
            var venH = getHouseOf('venus');
            var suH = getHouseOf('sun');
            if (venH === suH) fP += 2;
          }

          // ── Factor 13: Eunuch planets (Saturn/Mercury) conjunct Moon — neutralize masc Moon (weight 2)
          if (moonP) {
            var mHouse = getHouseOf('moon');
            var satH = saturnP ? getHouseOf('saturn') : 0;
            var mercH = houseChart.planets.mercury || houseChart.planets.Mercury ? getHouseOf('mercury') : 0;
            if (satH === mHouse || mercH === mHouse) fP += 2;
          }

          // ── Factor 14: Majority planet sign count — odd vs even rashis (weight 3)
          // Count the 7 visible planets in odd vs even signs
          var oddCount = 0;
          var evenCount = 0;
          ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'].forEach(function(pn) {
            var pl = houseChart.planets[pn] || houseChart.planets[pn.charAt(0).toUpperCase() + pn.slice(1)];
            if (pl && pl.rashiId) {
              if (pl.rashiId % 2 === 1) oddCount++; else evenCount++;
            }
          });
          if (evenCount > oddCount) fP += 3;
          else if (oddCount > evenCount) mP += 3;
          else { mP += 1.5; fP += 1.5; }

          // ── Factor 15: Hora — lagna degree determines Sun hora or Moon hora (weight 3)
          // If lagna is in odd sign: first 15° = Sun hora (male), next 15° = Moon hora (female)
          // If lagna is in even sign: first 15° = Moon hora (female), next 15° = Sun hora (male)
          var lagnaDeg = lagna.sidereal ? (lagna.sidereal % 30) : 0;
          var lagnaInFirstHalf = lagnaDeg < 15;
          var lagnaOdd = lagnaRashiId % 2 === 1;
          var sunHora = (lagnaOdd && lagnaInFirstHalf) || (!lagnaOdd && !lagnaInFirstHalf);
          if (sunHora) mP += 3; else fP += 3;

          var totalPoints = mP + fP;
          var malePct = totalPoints > 0 ? Math.round((mP / totalPoints) * 100) : 50;
          // Clamp confidence between 55-90 so it never feels absurd
          var rawConf = Math.abs(malePct - 50) + 50;
          var confidence = Math.min(90, Math.max(55, rawConf));
          return {
            predicted: malePct >= 50 ? 'male' : 'female',
            confidence: confidence,
            maleEnergy: malePct,
            femaleEnergy: 100 - malePct,
          };
        })(),
      },
    });
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

    const date = parseSLT(birthDate);
    if (!date || isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format.' });
    }

    const birthLat = parseFloat(lat) || 6.9271;
    const birthLng = parseFloat(lng) || 79.8612;

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

    const birthDate = parseSLT(date);
    if (!birthDate || isNaN(birthDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format.' });
    }
    const birthLat = parseFloat(lat) || 6.9271;
    const birthLng = parseFloat(lng) || 79.8612;
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
          // Fire-and-forget background translation
          const cloned = JSON.parse(JSON.stringify(advancedAnalysis));
          (async () => {
            try {
              const translated = await translateAdvancedForDisplay(cloned);
              if (translated) await saveTranslationCache(getUid, date, translated).catch(() => {});
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

    const genderPrediction = (function() {
      const lagnaId = flatLagna.rashiId;
      const navLagId = navamshaChart.lagna?.rashi?.id || navamshaChart.houses?.[0]?.rashiId || 1;

      var fP = 0;
      var mP = 0;
      var getHouseOf = function(pName) {
        return houseChart.houses.findIndex(function(h) {
          return h.planets.some(function(p) { return (p.key || p.name || '').toLowerCase() === pName; });
        }) + 1;
      };

      // Factor 1: Lagna rashi odd/even (weight 3)
      if (lagnaId % 2 === 1) mP += 3; else fP += 3;

      // Factor 2: Lagna lord masculine/feminine (weight 3)
      var lord = (flatLagna.lord || '').toLowerCase();
      if (['sun', 'mars', 'jupiter'].includes(lord)) mP += 3;
      else if (['moon', 'venus'].includes(lord)) fP += 3;
      else { mP += 1.5; fP += 1.5; }

      // Factor 3: Planets in lagna house (weight 2 each)
      var lagnaH = houseChart.houses.find(function(h) { return h.houseNumber === 1; });
      var lagnaNames = (lagnaH ? lagnaH.planets : []).map(function(p) { return (p.name || '').toLowerCase(); });
      ['sun', 'mars', 'jupiter'].forEach(function(n) { if (lagnaNames.includes(n)) mP += 2; });
      ['moon', 'venus'].forEach(function(n) { if (lagnaNames.includes(n)) fP += 2; });

      // Factor 4: Sun vs Moon house strength (weight 3)
      if (sunPlanet && moonPlanet) {
        var sH = getHouseOf('sun');
        var moonH = getHouseOf('moon');
        var sunStrong = [1, 4, 7, 10, 5, 9].includes(sH);
        var moonStrong = [1, 4, 7, 10, 5, 9].includes(moonH);
        if (sunStrong && !moonStrong) mP += 3;
        else if (!sunStrong && moonStrong) fP += 3;
        else { mP += 1.5; fP += 1.5; }
      }

      // Factor 5: Venus strength (weight 3)
      if (venusPlanet) {
        var venusOwn = [2, 7].includes(venusPlanet.rashiId);
        var venusExalt = venusPlanet.rashiId === 12;
        var venusH = getHouseOf('venus');
        var venusAngTri = [1, 4, 7, 10, 5, 9].includes(venusH);
        if (venusOwn || venusExalt) fP += 3;
        else if (venusAngTri) fP += 2;
        else fP += 1;
      }

      // Factor 6: Mars strength (weight 3)
      if (marsPlanet) {
        var marsOwn = [1, 8].includes(marsPlanet.rashiId);
        var marsExalt = marsPlanet.rashiId === 10;
        var marsH = getHouseOf('mars');
        var marsAngTri = [1, 4, 7, 10, 5, 9].includes(marsH);
        if (marsOwn || marsExalt) mP += 3;
        else if (marsAngTri) mP += 2;
        else mP += 1;
      }

      // Factor 7: Moon Nakshatra gender (weight 3) — corrected BPHS classification
      var moonSid = toSidereal(getMoonLongitude(birthDate), birthDate);
      var nak = getNakshatra(moonSid);
      var maleNaks = [1, 8, 9, 10, 12, 13, 15, 17, 19, 21, 22, 26];
      var nakId = nak ? (nak.id || nak.index || 0) : 0;
      if (maleNaks.includes(nakId)) mP += 3;
      else if (nakId > 0) fP += 3;

      // Factor 8: Moon rashi odd/even (weight 2)
      if (moonPlanet) {
        if (moonPlanet.rashiId % 2 === 1) mP += 2; else fP += 2;
      }

      // Factor 9: Navamsha lagna odd/even (weight 2)
      if (navLagId % 2 === 1) mP += 2; else fP += 2;

      // Factor 10: Moon in own/exalt = feminine boost (weight 2)
      if (moonPlanet) {
        if (moonPlanet.rashiId === 4 || moonPlanet.rashiId === 2) fP += 2;
      }

      // Factor 11: 7th house planets (weight 2 each)
      var h7 = houseChart.houses.find(function(h) { return h.houseNumber === 7; });
      var h7Names = (h7 ? h7.planets : []).map(function(p) { return (p.name || '').toLowerCase(); });
      ['moon', 'venus'].forEach(function(n) { if (h7Names.includes(n)) fP += 2; });
      ['sun', 'mars'].forEach(function(n) { if (h7Names.includes(n)) mP += 2; });

      // Factor 12: Venus-Sun conjunction — combustion feminizes (weight 2)
      if (venusPlanet && sunPlanet) {
        var venH = getHouseOf('venus');
        var suH = getHouseOf('sun');
        if (venH === suH) fP += 2;
      }

      // Factor 13: Eunuch planets (Saturn/Mercury) conjunct Moon (weight 2)
      var saturnPlanet = houseChart.planets.saturn || houseChart.planets.Saturn;
      var mercuryPlanet = houseChart.planets.mercury || houseChart.planets.Mercury;
      if (moonPlanet) {
        var mHouse = getHouseOf('moon');
        var satH = saturnPlanet ? getHouseOf('saturn') : 0;
        var mercH = mercuryPlanet ? getHouseOf('mercury') : 0;
        if (satH === mHouse || mercH === mHouse) fP += 2;
      }

      // Factor 14: Majority planet sign count — odd vs even rashis (weight 3)
      var oddCount = 0;
      var evenCount = 0;
      ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'].forEach(function(pn) {
        var pl = houseChart.planets[pn] || houseChart.planets[pn.charAt(0).toUpperCase() + pn.slice(1)];
        if (pl && pl.rashiId) {
          if (pl.rashiId % 2 === 1) oddCount++; else evenCount++;
        }
      });
      if (evenCount > oddCount) fP += 3;
      else if (oddCount > evenCount) mP += 3;
      else { mP += 1.5; fP += 1.5; }

      // Factor 15: Hora — lagna degree Sun hora or Moon hora (weight 3)
      var lagDeg = flatLagna.degree || (lagna.sidereal ? lagna.sidereal % 30 : 0);
      var lagInFirst = lagDeg < 15;
      var lagOdd = lagnaId % 2 === 1;
      var sunHora = (lagOdd && lagInFirst) || (!lagOdd && !lagInFirst);
      if (sunHora) mP += 3; else fP += 3;

      var totalP = mP + fP;
      var malePct = totalP > 0 ? Math.round((mP / totalP) * 100) : 50;
      var rawConf = Math.abs(malePct - 50) + 50;
      return {
        predicted: malePct >= 50 ? 'male' : 'female',
        confidence: Math.min(90, Math.max(55, rawConf)),
        maleEnergy: malePct,
        femaleEnergy: 100 - malePct,
      };
    })();

    // ── AI Simple Explanations (GET route) — cache-first, background on miss ──
    let chartExplanations = null;
    const getLang = language || 'en';
    if (getUid && advancedAnalysis) {
      try {
        chartExplanations = await getCachedChartExplanation(getUid, date, getLang);
        if (!chartExplanations) {
          // Fire-and-forget: generate in background
          const analysisForAI = JSON.parse(JSON.stringify(advancedAnalysis));
          (async () => {
            try {
              const expl = await explainChartSimple(analysisForAI, getLang);
              if (expl) await saveChartExplanation(getUid, date, getLang, expl).catch(() => {});
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
            genderPrediction: genderPrediction,
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
router.post('/full-report', (req, res) => {
  try {
    const { birthDate, lat = 6.9271, lng = 79.8612 } = req.body;

    if (!birthDate) {
      return res.status(400).json({ error: 'birthDate is required (ISO format or parseable date string)' });
    }

    const date = parseSLT(birthDate);
    if (!date || isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid birthDate format. Use ISO format e.g. 1998-10-09T09:16:00' });
    }

    console.log(`[Full Report] Generating for ${date.toISOString()} at (${lat}, ${lng})`);
    const startTime = Date.now();

    const report = generateFullReport(date, parseFloat(lat), parseFloat(lng));

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

router.post('/full-report-ai', optionalAuth, async (req, res) => {
  try {
    const { birthDate, lat = 6.9271, lng = 79.8612, language = 'en', birthLocation = null, userName = null, userGender = null } = req.body;

    if (!birthDate) {
      return res.status(400).json({ error: 'birthDate is required (ISO format or parseable date string)' });
    }

    const date = parseSLT(birthDate);
    if (!date || isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid birthDate format. Use ISO format e.g. 1998-10-09T09:16:00' });
    }

    // Check for cached report if user is authenticated
    if (req.user && !req.user.anonymous && !req.query.forceRegenerate) {
      try {
        const cached = await getCachedReport(req.user.uid, birthDate, language);
        if (cached) {
          console.log(`[AI Report] Returning cached report ${cached.id} for user ${req.user.uid}`);
          return res.json({
            success: true,
            cached: true,
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

    console.log(`[AI Report] Generating narrative report for ${date.toISOString()} at (${lat}, ${lng}) in ${language}`);
    const startTime = Date.now();

    const report = await generateAINarrativeReport(date, parseFloat(lat), parseFloat(lng), language, birthLocation, userName, userGender);

    const elapsed = Date.now() - startTime;
    const sectionCount = Object.keys(report.narrativeSections).length;
    console.log(`[AI Report] Complete in ${elapsed}ms — ${sectionCount} narrative sections`);

    // Save report to Firestore if user is authenticated
    if (req.user && !req.user.anonymous) {
      try {
        const reportId = await saveReport(req.user.uid, {
          birthDate,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
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

    res.json({
      success: true,
      cached: false,
      generationTime: `${elapsed}ms`,
      data: report,
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
router.delete('/saved-report/:id', optionalAuth, async (req, res) => {
  try {
    if (!req.user || req.user.anonymous) {
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
