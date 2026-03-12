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
const { chat, generateAINarrativeReport } = require('../engine/chat');

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
router.post('/birth-chart', (req, res) => {
  try {
    const { birthDate, lat, lng } = req.body;

    if (!birthDate) {
      return res.status(400).json({ error: 'Birth date is required (ISO 8601 format).' });
    }

    const date = new Date(birthDate);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format.' });
    }

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
          // Add 'Lagna' marker if desired, but frontend usually handles it via separate Lagna display.
          // However, putting 'Lgna' in the planets list is a common way to show it in the box.
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
        genderPrediction: (function() {
          // ── Comprehensive Gender Energy Prediction ──────────────
          // Uses multiple Vedic indicators for a fun "magic trick" guess.
          // This is entertainment — NOT a deterministic tool.
          const lagnaRashiId = lagna.rashi.id;
          const moonP = houseChart.planets.moon || houseChart.planets.Moon;
          const sunP = houseChart.planets.sun || houseChart.planets.Sun;
          const marsP = houseChart.planets.mars || houseChart.planets.Mars;
          const jupiterP = houseChart.planets.jupiter || houseChart.planets.Jupiter;
          const venusP = houseChart.planets.venus || houseChart.planets.Venus;
          const saturnP = houseChart.planets.saturn || houseChart.planets.Saturn;
          const navLagnaId = navamshaChart.lagna?.rashi?.id || 1;

          let mScore = 0;
          let total = 0;

          // ── Factor 1: Masculine planets (Sun, Mars, Jupiter) in Lagna or aspecting Lagna (weight 4)
          // If masculine planets influence the 1st house, masculine energy dominates
          const lagnaHouse = houseChart.houses.find(function(h) { return h.houseNumber === 1; });
          const lagnaPlNames = (lagnaHouse ? lagnaHouse.planets : []).map(function(p) { return (p.name || '').toLowerCase(); });
          const mascInLagna = ['sun', 'mars', 'jupiter'].filter(function(n) { return lagnaPlNames.includes(n); }).length;
          const femInLagna = ['moon', 'venus'].filter(function(n) { return lagnaPlNames.includes(n); }).length;
          mScore += mascInLagna * 2;
          total += (mascInLagna + femInLagna) * 2 || 2; // at least 2

          // ── Factor 2: Lagna lord — is it a masculine or feminine planet? (weight 3)
          // Masculine lords: Sun, Mars, Jupiter. Feminine: Moon, Venus. Neutral: Mercury, Saturn.
          const lagnaLord = (lagna.rashi.lord || '').toLowerCase();
          const mascLords = ['sun', 'mars', 'jupiter'];
          const femLords = ['moon', 'venus'];
          if (mascLords.includes(lagnaLord)) mScore += 3;
          else if (femLords.includes(lagnaLord)) { /* 0 */ }
          else mScore += 1.5; // neutral (Mercury, Saturn) = half
          total += 3;

          // ── Factor 3: Sun's house placement — angular houses (1,4,7,10) = strong masculine (weight 2)
          if (sunP) {
            const sunHouse = houseChart.houses.findIndex(function(h) { return h.planets.some(function(p) { return (p.key || p.name || '').toLowerCase() === 'sun'; }); }) + 1;
            if ([1, 4, 7, 10].includes(sunHouse)) mScore += 2; // Sun angular = strong masc
            else if ([5, 9].includes(sunHouse)) mScore += 1.5; // Sun trikona = moderate
            else mScore += 0.5;
          }
          total += 2;

          // ── Factor 4: Mars strong? Mars in own/exalt = masculine boost (weight 2)
          if (marsP) {
            const marsOwn = [1, 8].includes(marsP.rashiId); // Aries or Scorpio
            const marsExalt = marsP.rashiId === 10; // Capricorn
            if (marsOwn || marsExalt) mScore += 2;
            else if (marsP.rashiId % 2 === 1) mScore += 1.5; // odd rashi
            else mScore += 0.5;
          }
          total += 2;

          // ── Factor 5: Moon vs Sun — which is stronger by house position (weight 2)
          if (sunP && moonP) {
            const sunH = houseChart.houses.findIndex(function(h) { return h.planets.some(function(p) { return (p.key || p.name || '').toLowerCase() === 'sun'; }); }) + 1;
            const moonH = houseChart.houses.findIndex(function(h) { return h.planets.some(function(p) { return (p.key || p.name || '').toLowerCase() === 'moon'; }); }) + 1;
            const sunAngular = [1, 4, 7, 10].includes(sunH);
            const moonAngular = [1, 4, 7, 10].includes(moonH);
            if (sunAngular && !moonAngular) mScore += 2;
            else if (!sunAngular && moonAngular) mScore += 0.5;
            else mScore += 1; // tie
          }
          total += 2;

          // ── Factor 5b: Mars house placement — Mars in Kendra/Trikona = strong masculine (weight 2)
          if (marsP) {
            const marsH = houseChart.houses.findIndex(function(h) { return h.planets.some(function(p) { return (p.key || p.name || '').toLowerCase() === 'mars'; }); }) + 1;
            if ([1, 4, 7, 10].includes(marsH)) mScore += 2;
            else if ([5, 9].includes(marsH)) mScore += 1.5;
            else mScore += 0.5;
          }
          total += 2;

          // ── Factor 6: Nakshatra gender — each nakshatra has a gender (weight 2)
          // Male nakshatras: Ashwini, Bharani, Krittika, Mrigashira, Punarvasu, Pushya,
          //   Magha, Purva Phalguni, Hasta, Chitra, Anuradha, Jyeshtha, Purva Ashadha,
          //   Shravana, Dhanishta, Purva Bhadrapada, Revati
          const maleNakshatras = [1, 2, 3, 5, 7, 8, 10, 11, 13, 14, 17, 18, 20, 22, 23, 25, 27];
          const nakshatraId = moonNakshatra ? (moonNakshatra.id || moonNakshatra.index || 0) : 0;
          if (maleNakshatras.includes(nakshatraId)) mScore += 2;
          total += 2;

          // ── Factor 7: Jupiter placement — Jupiter strong = masculine wisdom (weight 1)
          if (jupiterP) {
            const jupOwn = [9, 12].includes(jupiterP.rashiId); // Sagittarius or Pisces
            const jupExalt = jupiterP.rashiId === 4; // Cancer
            if (jupOwn || jupExalt) mScore += 1;
            else mScore += 0.5;
          }
          total += 1;

          // ── Factor 8: Odd/even Lagna (classical rule but lower weight) (weight 1)
          if (lagnaRashiId % 2 === 1) mScore += 1;
          total += 1;

          // ── Factor 9: Navamsha lagna odd/even (weight 1)
          if (navLagnaId % 2 === 1) mScore += 1;
          total += 1;

          const malePct = Math.round((mScore / total) * 100);
          // Clamp confidence between 55-90 so it never feels absurd
          const rawConf = Math.abs(malePct - 50) + 50;
          const confidence = Math.min(90, Math.max(55, rawConf));
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
    console.error('Error generating birth chart:', error);
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

    const date = new Date(birthDate);
    if (isNaN(date.getTime())) {
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
router.get('/birth-chart/data', async (req, res) => {
  try {
    const { date, lat, lng } = req.query;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    const birthDate = new Date(date);
    const birthLat = parseFloat(lat) || 6.9271;
    const birthLng = parseFloat(lng) || 79.8612;

    const houseChart = buildHouseChart(birthDate, birthLat, birthLng);
    const navamshaChart = buildNavamshaChart(birthDate, birthLat, birthLng);
    const shadvarga = buildShadvarga(birthDate, birthLat, birthLng);
    
    // Calculate Panchanga
    const panchanga = getPanchanga(birthDate, birthLat, birthLng);

    // New advanced calculations
    const drishtis = calculateDrishtis(houseChart.houses);
    const pushkara = analyzePushkara(houseChart.planets);
    const ashtakavarga = calculateAshtakavarga(birthDate, birthLat, birthLng);
    const bhavaChalit = buildBhavaChalit(birthDate, birthLat, birthLng);

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

    // ── Gender Energy Prediction (comprehensive Vedic indicators) ─────────
    const moonPlanet = houseChart.planets.moon || houseChart.planets.Moon;
    const sunPlanet = houseChart.planets.sun || houseChart.planets.Sun;
    const marsPlanet = houseChart.planets.mars || houseChart.planets.Mars;
    const jupiterPlanet = houseChart.planets.jupiter || houseChart.planets.Jupiter;

    const genderPrediction = (function() {
      const lagnaId = flatLagna.rashiId;
      const navLagId = navamshaChart.lagna?.rashi?.id || navamshaChart.houses?.[0]?.rashiId || 1;

      let mS = 0;
      let tS = 0;

      // Factor 1: Masculine planets in lagna house (weight ~4)
      const lagnaH = houseChart.houses.find(function(h) { return h.houseNumber === 1; });
      const lagnaNames = (lagnaH ? lagnaH.planets : []).map(function(p) { return (p.name || '').toLowerCase(); });
      const mascIn = ['sun', 'mars', 'jupiter'].filter(function(n) { return lagnaNames.includes(n); }).length;
      const femIn = ['moon', 'venus'].filter(function(n) { return lagnaNames.includes(n); }).length;
      mS += mascIn * 2;
      tS += (mascIn + femIn) * 2 || 2;

      // Factor 2: Lagna lord masculine/feminine (weight 3)
      const lord = (flatLagna.lord || '').toLowerCase();
      if (['sun', 'mars', 'jupiter'].includes(lord)) mS += 3;
      else if (['moon', 'venus'].includes(lord)) { }
      else mS += 1.5;
      tS += 3;

      // Factor 3: Sun angular (weight 2)
      if (sunPlanet) {
        const sH = houseChart.houses.findIndex(function(h) { return h.planets.some(function(p) { return (p.key || p.name || '').toLowerCase() === 'sun'; }); }) + 1;
        if ([1, 4, 7, 10].includes(sH)) mS += 2;
        else if ([5, 9].includes(sH)) mS += 1.5;
        else mS += 0.5;
      }
      tS += 2;

      // Factor 4: Mars strong (weight 2)
      if (marsPlanet) {
        if ([1, 8].includes(marsPlanet.rashiId) || marsPlanet.rashiId === 10) mS += 2;
        else if (marsPlanet.rashiId % 2 === 1) mS += 1.5;
        else mS += 0.5;
      }
      tS += 2;

      // Factor 5: Sun vs Moon house strength (weight 2)
      if (sunPlanet && moonPlanet) {
        const sH2 = houseChart.houses.findIndex(function(h) { return h.planets.some(function(p) { return (p.key || p.name || '').toLowerCase() === 'sun'; }); }) + 1;
        const mH2 = houseChart.houses.findIndex(function(h) { return h.planets.some(function(p) { return (p.key || p.name || '').toLowerCase() === 'moon'; }); }) + 1;
        if ([1, 4, 7, 10].includes(sH2) && ![1, 4, 7, 10].includes(mH2)) mS += 2;
        else if (![1, 4, 7, 10].includes(sH2) && [1, 4, 7, 10].includes(mH2)) mS += 0.5;
        else mS += 1;
      }
      tS += 2;

      // Factor 5b: Mars house placement — angular = strong masculine (weight 2)
      if (marsPlanet) {
        const marsH = houseChart.houses.findIndex(function(h) { return h.planets.some(function(p) { return (p.key || p.name || '').toLowerCase() === 'mars'; }); }) + 1;
        if ([1, 4, 7, 10].includes(marsH)) mS += 2;
        else if ([5, 9].includes(marsH)) mS += 1.5;
        else mS += 0.5;
      }
      tS += 2;

      // Factor 6: Nakshatra gender (weight 2)
      const moonSid = toSidereal(getMoonLongitude(birthDate), birthDate);
      const nak = getNakshatra(moonSid);
      const maleNaks = [1, 2, 3, 5, 7, 8, 10, 11, 13, 14, 17, 18, 20, 22, 23, 25, 27];
      if (maleNaks.includes(nak ? (nak.id || nak.index || 0) : 0)) mS += 2;
      tS += 2;

      // Factor 7: Jupiter strong (weight 1)
      if (jupiterPlanet) {
        if ([9, 12].includes(jupiterPlanet.rashiId) || jupiterPlanet.rashiId === 4) mS += 1;
        else mS += 0.5;
      }
      tS += 1;

      // Factor 8: Lagna odd/even (weight 1)
      if (lagnaId % 2 === 1) mS += 1;
      tS += 1;

      // Factor 9: Navamsha lagna odd/even (weight 1)
      if (navLagId % 2 === 1) mS += 1;
      tS += 1;

      const malePct = Math.round((mS / tS) * 100);
      const rawConf = Math.abs(malePct - 50) + 50;
      return {
        predicted: malePct >= 50 ? 'male' : 'female',
        confidence: Math.min(90, Math.max(55, rawConf)),
        maleEnergy: malePct,
        femaleEnergy: 100 - malePct,
      };
    })();

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

    const date = new Date(birthDate);
    if (isNaN(date.getTime())) {
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
const { optionalAuth } = require('../middleware/auth');
const { saveReport, getCachedReport } = require('../models/firestore');

router.post('/full-report-ai', optionalAuth, async (req, res) => {
  try {
    const { birthDate, lat = 6.9271, lng = 79.8612, language = 'en', birthLocation = null, userName = null, userGender = null } = req.body;

    if (!birthDate) {
      return res.status(400).json({ error: 'birthDate is required (ISO format or parseable date string)' });
    }

    const date = new Date(birthDate);
    if (isNaN(date.getTime())) {
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

module.exports = router;
