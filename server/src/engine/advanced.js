/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ADVANCED VEDIC ASTROLOGY ENGINE — "Past, Present & Future Vision System"
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * TIER 1: Dosha Detection, Expanded Yogas (30+), Jaimini Karakas
 * TIER 2: Full Shadbala, Bhrigu Bindu, Avastha, More Divisional Charts, Pratyantardasha
 * TIER 3: Nadi Amsha, KP Sub-Lords, Sarvatobhadra Chakra, Past-Life Analysis
 * 
 * Based on: BPHS (Brihat Parashara Hora Shastra), Phaladeepika,
 *           Jataka Parijata, Jaimini Sutras, Nadi Jyotish texts,
 *           KP Reader, Sarvartha Chintamani
 * 
 * Author: Grahachara Engine
 */

const { NAKSHATRAS, RASHIS, PLANETS, getAllPlanetPositions, getLagna, buildHouseChart, buildNavamshaChart, getRashi, getNakshatra, toSidereal, getMoonLongitude, getSunLongitude, getAyanamsha, dateToJD, calculateVimshottariDetailed } = require('./astrology');
const { resolveCalculationSettings, formatLocalDateTime } = require('./calculationSettings');

// ── Shared Helper Functions ─────────────────────────────────────
const isInKendra = (h) => [1, 4, 7, 10].includes(h);
const isInTrikona = (h) => [1, 5, 9].includes(h);
const isInDusthana = (h) => [6, 8, 12].includes(h);

function resolveAdvancedOptions(opts = {}) {
  const asOf = opts.asOfDate ? new Date(opts.asOfDate) : new Date();
  return {
    ...opts,
    settings: resolveCalculationSettings(opts),
    asOfDate: isNaN(asOf.getTime()) ? new Date() : asOf,
    timeContext: opts.timeContext || null,
  };
}

function getAdvancedPlanets(date, lat, lng, opts = {}) {
  const options = resolveAdvancedOptions(opts);
  return getAllPlanetPositions(date, lat, lng, options.settings);
}

function getLocalHour(date, opts = {}) {
  const local = formatLocalDateTime(date, opts.timeContext || null);
  const [hour, minute] = local.time.split(':').map(Number);
  return hour + minute / 60;
}

// ═══════════════════════════════════════════════════════════════════════════
//  TIER 1-A: COMPREHENSIVE DOSHA DETECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect ALL major doshas in a birth chart
 * Returns: Mangala Dosha, Kaal Sarp Dosha, Sade Sati, Pitru Dosha,
 *          Grahan Dosha, Shrapit Dosha, Guru Chandal Dosha, Kemdrum Dosha (enhanced)
 */
function detectDoshas(date, lat, lng, opts = {}) {
  const options = resolveAdvancedOptions(opts);
  const { houses, lagna, planets } = buildHouseChart(date, lat, lng);
  const doshas = [];

  const getPlanetHouse = (planetName) => {
    const h = houses.find(h => h.planets.some(p => p.name === planetName));
    return h ? h.houseNumber : null;
  };

  const moonHouse = getPlanetHouse('Moon');
  const marsHouse = getPlanetHouse('Mars');
  const sunHouse = getPlanetHouse('Sun');
  const saturnHouse = getPlanetHouse('Saturn');
  const rahuHouse = getPlanetHouse('Rahu');
  const ketuHouse = getPlanetHouse('Ketu');
  const jupiterHouse = getPlanetHouse('Jupiter');
  const venusHouse = getPlanetHouse('Venus');
  const mercuryHouse = getPlanetHouse('Mercury');

  // ── 1. MANGALA DOSHA (Kuja Dosha) ─────────────────────────────
  // Mars in 1, 2, 4, 7, 8, 12 from Lagna, Moon, or Venus
  const mangalFromLagna = [1, 2, 4, 7, 8, 12].includes(marsHouse);
  const marsFromMoon = moonHouse ? ((marsHouse - moonHouse + 12) % 12) + 1 : 0;
  const mangalFromMoon = [1, 2, 4, 7, 8, 12].includes(marsFromMoon);
  const marsFromVenus = venusHouse ? ((marsHouse - venusHouse + 12) % 12) + 1 : 0;
  const mangalFromVenus = [1, 2, 4, 7, 8, 12].includes(marsFromVenus);

  // Cancellation checks
  let mangalCancelled = false;
  const marsRashiId = planets.mars?.rashiId;
  // Mars in own sign or exalted
  if ([1, 8, 10].includes(marsRashiId)) mangalCancelled = true;
  // Mars in 1 or 8 in Aries/Scorpio
  if ((marsHouse === 1 || marsHouse === 8) && [1, 8].includes(marsRashiId)) mangalCancelled = true;
  // Jupiter aspects Mars
  if (jupiterHouse) {
    const jupToMars = ((marsHouse - jupiterHouse + 12) % 12) + 1;
    if ([5, 7, 9].includes(jupToMars)) mangalCancelled = true; // Jupiter's aspect
  }

  if (mangalFromLagna || mangalFromMoon || mangalFromVenus) {
    let severity = 'Mild';
    let count = [mangalFromLagna, mangalFromMoon, mangalFromVenus].filter(Boolean).length;
    if (count >= 3) severity = 'Severe';
    else if (count >= 2) severity = 'Moderate';

    doshas.push({
      name: 'Mars Influence',
      sinhala: 'අංගහරු ප්‍රභාවය',
      icon: '♂️🔴',
      present: true,
      severity: mangalCancelled ? 'Cancelled' : severity,
      cancelled: mangalCancelled,
      details: {
        fromLagna: mangalFromLagna,
        fromMoon: mangalFromMoon,
        fromVenus: mangalFromVenus,
        marsHouse,
        cancellationReason: mangalCancelled ? 'Mars is in own sign, exalted, or aspected by Jupiter' : null,
      },
      description: mangalCancelled
        ? 'Mars influence is present but neutralized by mitigating factors. Relationship compatibility is not affected.'
        : `Mars influence is present (${severity}). Mars in position ${marsHouse} creates intensity in relationships. Matching with a similarly energetic partner or conscious awareness is recommended.`,
      descriptionSi: mangalCancelled
        ? 'අංගහරු ප්‍රභාවය පවතින නමුත් සමනය කරන සාධක මගින් වලංගු නොවෙනවා. සබඳතාවට බාධාවක් නැත.'
        : `අංගහරු ප්‍රභාවය (${severity === 'Severe' ? 'බරපතල' : severity === 'Moderate' ? 'මධ්‍යම' : 'සුළු'}) පවතී. ස්ථානයෙන් ${marsHouse} වන කුජ හේතුවෙන් සබඳතාවෙනවා තීව්‍රතාවයක් තියෙනවාිවෙනවා. සමාන ශක්තියක් තියෙනවාි සහකරුවක් සමඟ ගැලපීම නිර්දේශ කෙරේ.`,
      remedies: [
        'Channel physical energy into exercise, sports, or creative work',
        'Practice patience in relationships — awareness is the key',
        'Volunteer or engage in community service regularly',
        'Wear warm, grounding colors like earth tones',
        'Focus on open communication with your partner',
        'Consider marrying after age 28 when Mars energy naturally mellows',
      ],
      remediesSi: [
        'කුජ ශාන්ති පූජාවක් කරන්න',
        'අඟහරුවාදා නවග්‍රහ කෝවිලට යන්න',
        'අඟහරුවාදා රතු පරිප්පු දන් දෙන්න',
        'මංගල ස්තෝත්‍රය හෝ හනුමාන් චාලීසා කියවන්න',
        'රතු පබළු මුද්ද දකුණු අත ඇඟිල්ලේ පලඳින්න (ජ්‍යෝතිෂවෙනවාදියාගෙන් අසන්න)',
        'වයස 28ට පසු විවාහය ස්වාභාවික සමනයට හේතුවෙනවා',
      ],
    });
  }

  // ── 2. KAAL SARP DOSHA ────────────────────────────────────────
  // All planets between Rahu-Ketu axis
  if (rahuHouse && ketuHouse) {
    const allPlanetHouses = [sunHouse, moonHouse, marsHouse, mercuryHouse, jupiterHouse, venusHouse, saturnHouse].filter(Boolean);

    // Check if all planets are on one side of Rahu-Ketu axis
    let allBetweenRK = true;
    let allBetweenKR = true;

    for (const ph of allPlanetHouses) {
      // Rahu to Ketu clockwise
      let betweenRK;
      if (rahuHouse <= ketuHouse) {
        betweenRK = ph >= rahuHouse && ph <= ketuHouse;
      } else {
        betweenRK = ph >= rahuHouse || ph <= ketuHouse;
      }
      if (!betweenRK) allBetweenRK = false;

      // Ketu to Rahu clockwise
      let betweenKR;
      if (ketuHouse <= rahuHouse) {
        betweenKR = ph >= ketuHouse && ph <= rahuHouse;
      } else {
        betweenKR = ph >= ketuHouse || ph <= rahuHouse;
      }
      if (!betweenKR) allBetweenKR = false;
    }

    const isKaalSarp = allBetweenRK || allBetweenKR;

    // Determine the type of Kaal Sarp based on Rahu's house
    const KAAL_SARP_TYPES = {
      1: { name: 'Ananta', sinhala: 'අනන්ත', effect: 'Physical health challenges and self-identity struggles' },
      2: { name: 'Kulika', sinhala: 'කුලික', effect: 'Financial instability and family conflicts' },
      3: { name: 'Vasuki', sinhala: 'වාසුකි', effect: 'Sibling issues and communication blocks' },
      4: { name: 'Shankhapala', sinhala: 'ශංඛපාල', effect: 'Domestic unhappiness and property disputes' },
      5: { name: 'Padma', sinhala: 'පද්ම', effect: 'Delayed children and speculative losses' },
      6: { name: 'Mahapadma', sinhala: 'මහාපද්ම', effect: 'Enemies, debts, and health issues' },
      7: { name: 'Takshaka', sinhala: 'තක්ෂක', effect: 'Marriage delays and partnership problems' },
      8: { name: 'Karkotaka', sinhala: 'කර්කෝටක', effect: 'Sudden crises and hidden enemies' },
      9: { name: 'Shankha', sinhala: 'ශංඛ', effect: 'Bad luck and problems from father/guru' },
      10: { name: 'Ghataka', sinhala: 'ඝාටක', effect: 'Career obstacles and loss of reputation' },
      11: { name: 'Vishadhara', sinhala: 'විෂධර', effect: 'Income disruption and unfulfilled aspirations' },
      12: { name: 'Sheshanaga', sinhala: 'ශේෂනාග', effect: 'Excessive spending and foreign exile' },
    };

    const kaalSarpType = KAAL_SARP_TYPES[rahuHouse] || { name: 'Unknown', effect: '' };

    // Partial Kaal Sarp — if one planet is just outside the axis
    let partial = false;
    if (!isKaalSarp) {
      const outsideCount = allPlanetHouses.filter(ph => {
        if (rahuHouse <= ketuHouse) return !(ph >= rahuHouse && ph <= ketuHouse);
        return !(ph >= rahuHouse || ph <= ketuHouse);
      }).length;
      if (outsideCount === 1) partial = true;
    }

    if (isKaalSarp || partial) {
      doshas.push({
        name: `Kaal Sarp Dosha — ${kaalSarpType.name}`,
        sinhala: `කාල සර්ප දෝෂය — ${kaalSarpType.sinhala}`,
        icon: '🐍',
        present: true,
        severity: isKaalSarp ? 'Full' : 'Partial',
        type: kaalSarpType.name,
        details: {
          rahuHouse,
          ketuHouse,
          isFullKaalSarp: isKaalSarp,
          isPartial: partial,
          effect: kaalSarpType.effect,
        },
        description: `All planets are hemmed between Rahu (house ${rahuHouse}) and Ketu (house ${ketuHouse}). This creates ${kaalSarpType.name} Kaal Sarp Dosha: ${kaalSarpType.effect}. Life experiences sudden ups and downs like a serpent's coil.`,
        descriptionSi: `සියලුම ග්‍රහයන් රාහු (${rahuHouse} වන භාවය) සහ කේතු (${ketuHouse} වන භාවය) අතර සීමා වී තියෙනවා. මෙය ${kaalSarpType.sinhala} කාල සර්ප දෝෂය තියෙනවාි කරනවා. ජීවිතයේ හදිසි උච්චාවචන අත්විඳිය පුළුවන්.`,
        remedies: [
          'Perform Kaal Sarp Dosha Shanti Pooja at Trimbakeshwar or Navagraha temple',
          'Recite Rahu Kavach stotra daily',
          'Feed 11 snakes (or donate to snake conservation) on Naga Panchami',
          'Offer milk and turmeric at a Naga temple',
          'Wear Gomed (Hessonite) on advice of astrologer',
          'Chant "Om Rahave Namaha" 108 times on Saturdays',
        ],
      });
    }
  }

  // ── 3. SADE SATI (Saturn's 7.5 Year Transit Over Moon) ────────
  // Check current Saturn position relative to natal Moon
  const transitPlanets = getAllPlanetPositions(options.asOfDate, lat, lng, options.settings);
  const natalMoonRashiId = planets.moon?.rashiId;
  const transitSaturnRashiId = transitPlanets.saturn?.rashiId;

  if (natalMoonRashiId && transitSaturnRashiId) {
    const satFromMoon = ((transitSaturnRashiId - natalMoonRashiId + 12) % 12) + 1;
    let sadeSatiPhase = null;

    if (satFromMoon === 12) sadeSatiPhase = { phase: 'Rising (ආරෝහණ)', severity: 'Beginning', description: 'Saturn entering 12th from natal Moon — Sade Sati is beginning. Emotional and financial caution needed.', descriptionSi: 'සෙනසුරු චන්ද්‍රයෙන් 12 වන ස්ථානයට පිවිසීම — සාඩේ සාති ආරම්භ වෙනවා. හැඟීම් හා මූල්‍ය සැලකිලිමත් බව ඕනේ.' };
    if (satFromMoon === 1) sadeSatiPhase = { phase: 'Peak (උච්ච)', severity: 'Maximum', description: 'Saturn directly over natal Moon — Peak phase. Maximum life pressure. This is the most challenging but also the most growth-oriented period.', descriptionSi: 'සෙනසුරු කෙලින්ම චන්ද්‍රයා මත — උච්ච අවධිය. උපරිම ජීවිත පීඩනය. මෙය වඩාත් දුෂ්කර නමුත් පරිවර්තනශීලී කාලයයි.' };
    if (satFromMoon === 2) sadeSatiPhase = { phase: 'Setting (අවරෝහණ)', severity: 'Ending', description: 'Saturn in 2nd from natal Moon — Final phase of Sade Sati. Financial adjustments and family matters dominate.', descriptionSi: 'සෙනසුරු චන්ද්‍රයෙන් 2 වන ස්ථානයේ — සාඩේ සාතිහි අවසාන අවධිය. මූල්‍ය සකස්කිරීම් සහ පවුල් කටයුතු ප්‍රමුඛ වෙනවා.' };

    if (sadeSatiPhase) {
      doshas.push({
        name: 'Saturn\'s 7.5-Year Transit',
        sinhala: 'ශනි පැමිණීම (අවුරුදු 7½)',
        icon: '🪐',
        present: true,
        severity: sadeSatiPhase.severity,
        details: {
          currentPhase: sadeSatiPhase.phase,
          natalMoonSign: RASHIS[natalMoonRashiId - 1]?.english,
          transitSaturnSign: RASHIS[transitSaturnRashiId - 1]?.english,
        },
        description: sadeSatiPhase.description,
        descriptionSi: sadeSatiPhase.descriptionSi,
        remedies: [
          'Build long-term plans with realistic milestones — progress through patience',
          'Exercise 30min daily + maintain 7-8 hours sleep — protect your energy',
          'Keep a 6-month emergency fund — avoid taking on new debt',
          'Delay major life changes (job switch, relocation) if possible — timing matters',
          'Schedule a comprehensive health checkup — don\'t ignore symptoms',
          'Seek advice from a mentor before big decisions — don\'t act alone',
        ],
      });
    }

    // Also calculate future Sade Sati windows
    // Saturn takes ~2.5 years per sign, ~29.5 years full cycle
    // Next Sade Sati starts when Saturn enters 12th from natal Moon
  }

  // ── 4. PITRU DOSHA (Ancestral Karma) ──────────────────────────
  // Sun afflicted by Rahu/Saturn in 9th house, or 9th lord afflicted
  const lord9RashiId = houses[8]?.rashiId;
  const lord9Name = RASHIS[(lord9RashiId || 1) - 1]?.lord;
  const lord9House = getPlanetHouse(lord9Name);

  let pitruDosha = false;
  let pitruDetails = [];

  // Sun with Rahu/Ketu
  if (sunHouse === rahuHouse) { pitruDosha = true; pitruDetails.push('Sun conjunct Rahu — challenges related to father figure or authority'); }
  if (sunHouse === ketuHouse) { pitruDosha = true; pitruDetails.push('Sun conjunct Ketu — deep patterns from paternal lineage'); }
  // Sun in 9th afflicted
  if (sunHouse === 9 && (rahuHouse === 9 || saturnHouse === 9)) { pitruDosha = true; pitruDetails.push('Sun in 9th with challenging planet — direct influence on father/fortune area'); }
  // 9th lord in 6, 8, 12
  if (lord9House && [6, 8, 12].includes(lord9House)) { pitruDosha = true; pitruDetails.push(`9th lord ${lord9Name} in dusthana (house ${lord9House}) — fortune influenced by inherited family patterns`); }
  // Saturn aspects 9th house
  if (saturnHouse) {
    const satTo9 = ((9 - saturnHouse + 12) % 12) + 1;
    if ([3, 7, 10].includes(satTo9)) { pitruDosha = true; pitruDetails.push('Saturn aspects 9th house — ancestral delays and obstacles'); }
  }

  if (pitruDosha) {
    doshas.push({
      name: 'Family Heritage Influence',
      sinhala: 'පිතෘ පරම්පරා ප්‍රභාවය',
      icon: '👤⚡',
      present: true,
      severity: pitruDetails.length >= 3 ? 'Severe' : pitruDetails.length >= 2 ? 'Moderate' : 'Mild',
      details: pitruDetails,
      description: 'This pattern indicates inherited family dynamics that may affect fortune, father-related matters, or life direction. Awareness and positive action can transform these patterns.',
      descriptionSi: 'පිතෘ දෝෂය පියා පැත්තේ පරම්පරාවෙන් එන නොවිසඳුණු කර්මය පෙන්වනවා. වාසනාව ප්‍රමාදවීම, පියා සම්බන්ධ අරගල, හෝ ධාර්මික කටයුතුවල බාධා ලෙස මෙය ප්‍රකාශ විය පුළුවන්ිය.',
      remedies: [
        'Honor and respect family elders and their wisdom',
        'Practice gratitude toward your parents and ancestors',
        'Engage in charitable activities, especially feeding the hungry',
        'Spend quality time outdoors, especially at sunrise',
        'Build a positive relationship with father figures or mentors',
        'Journaling about family patterns helps build awareness',
      ],
    });
  }

  // ── 5. GRAHAN DOSHA (Eclipse Affliction) ──────────────────────
  // Sun/Moon conjunct Rahu/Ketu
  if (sunHouse === rahuHouse || sunHouse === ketuHouse) {
    doshas.push({
      name: 'Solar Sensitivity',
      sinhala: 'සූර්ය සංවෙනවාදිතාව',
      icon: '🌑',
      present: true,
      severity: sunHouse === rahuHouse ? 'Strong' : 'Moderate',
      description: 'Sun conjunct shadow planet — father\'s health, government matters, and ego face challenges. Authority may be undermined.',
      descriptionSi: 'සූර්යයා සෙවනැලි ග්‍රහයා සමඟ — පියාගේ සෞඛ්‍යය, රාජ්‍ය කටයුතු, සහ ආත්ම ගෞරවයට අභියෝග. බලය අඩපණ විය පුළුවන්.',
      remedies: ['Spend time in sunlight daily', 'Build self-confidence through positive affirmations', 'Engage in leadership activities'],
    });
  }

  if (moonHouse === rahuHouse || moonHouse === ketuHouse) {
    doshas.push({
      name: 'Lunar Sensitivity',
      sinhala: 'චන්ද්‍ර සංවෙනවාදිතාව',
      icon: '🌘',
      present: true,
      severity: moonHouse === rahuHouse ? 'Strong' : 'Moderate',
      description: 'Moon conjunct shadow planet — mother\'s health, mental peace, and emotional stability face challenges. Anxiety and overthinking are common.',
      descriptionSi: 'චන්ද්‍ර සෙවනැලි ග්‍රහයා සමඟ — මවගේ සෞඛ්‍යය, මානසික සාමය, සහ හැඟීම් ස්ථාවරත්වයට අභියෝග. කනස්සල්ල හා අධික සිතීම සුලබයි.',
      remedies: ['Practice mindfulness and meditation', 'Nurture your relationship with your mother', 'Prioritize quality sleep and emotional self-care', 'Journaling helps process complex emotions'],
    });
  }

  // ── 5b. VISH YOGA (Poison Combination — Moon-Saturn) ────────
  // Moon and Saturn in same house = emotional suffering, childhood trauma, depression
  if (moonHouse && saturnHouse && moonHouse === saturnHouse) {
    // Check for cancellation: Jupiter aspects on Moon-Saturn conjunction
    let vishCancelled = false;
    if (jupiterHouse) {
      const jupToMoon = ((moonHouse - jupiterHouse + 12) % 12) + 1;
      if ([1, 5, 7, 9].includes(jupToMoon)) vishCancelled = true; // Jupiter's aspect or conjunction
    }
    doshas.push({
      name: 'Moon-Saturn Tension',
      sinhala: 'චන්ද්‍ර-ශනි ගැටුම',
      icon: '☠️',
      present: true,
      severity: vishCancelled ? 'Mild (Mitigated)' : 'Strong',
      cancelled: vishCancelled,
      details: { moonHouse, saturnHouse, conjunctHouse: moonHouse },
      description: vishCancelled
        ? `Moon-Saturn conjunction in house ${moonHouse} — emotional tension is present but eased by Jupiter's supportive influence. Emotional challenges exist but are manageable with awareness.`
        : `Moon-Saturn conjunction in house ${moonHouse} — this indicates deep emotional complexity. It can manifest as emotional restraint, a need for structure in feelings, or a complex relationship with nurturing figures. The native often carries unexpressed emotions from early life. Understanding this pattern is the first step to growth.`,
      descriptionSi: vishCancelled
        ? `${moonHouse} වන භාවයේ චන්ද්‍ර-ශනි සංයෝගය — විෂ යෝගය පවතින නමුත් ගුරුගේ ශුභ දෘෂ්ටිය මඟින් සමනය වී තියෙනවා. හැඟීම් අභියෝග තියෙනවාි නමුත් නිවැරදි අවබෝධයෙන් පාලනය කළ පුළුවන්ිය.`
        : `${moonHouse} වන භාවයේ චන්ද්‍ර-ශනි සංයෝගය — මෙය විෂ යෝගයයි. ගැඹුරු හැඟීම් වෙනවාදනාව, ළමා කාලයේ කම්පා, මව සමඟ දුෂ්කර සබඳතාවය, මානසික අවපීඩනය සහ හැඟීම් මර්දනය පෙන්වනවා.`,
      remedies: [
        'Practice regular meditation and mindfulness',
        'Seek professional counseling for emotional processing if needed',
        'Build a consistent daily routine — structure helps Moon-Saturn energy',
        'Journaling helps process suppressed emotions',
        'Nurture your relationship with maternal figures',
        'Practice emotional release techniques regularly',
        'Maintain a gratitude journal — writing helps reframe challenges',
      ],
    });
  }

  // ── 6. SHRAPIT DOSHA (Cursed Combination) ─────────────────────
  // Saturn + Rahu in same house
  if (saturnHouse && rahuHouse && saturnHouse === rahuHouse) {
    doshas.push({
      name: 'Saturn-Rahu Challenge',
      sinhala: 'ශනි-රාහු අභියෝගය',
      icon: '⛓️',
      present: true,
      severity: 'Severe',
      details: { house: saturnHouse },
      description: `Saturn and Rahu conjunct in house ${saturnHouse} — this combination can bring unexpected obstacles, delays, and challenges that feel difficult to explain. Patience and consistent effort are the keys to overcoming this pattern.`,
      descriptionSi: `${saturnHouse} වන භාවයේ ශනි-රාහු සංයෝගය — මෙම සංයෝගය හදිසි බාධා, ප්‍රමාදයන් සහ පැහැදිලි කිරීමට අපහසු අභියෝග ගෙන ඒමට පුළුවන්ියි. ඉවසීම සහ අඛණ්ඩ උත්සාහය මෙම රටාව ජය ගැනීමේ යතුරයි.`,
      remedies: [
        'Practice extreme patience — delays are temporary',
        'Engage in regular acts of service and charity',
        'Feed stray animals regularly — builds positive energy',
        'Maintain strict honesty in all dealings',
        'Build resilience through consistent daily discipline',
      ],
    });
  }

  // ── 7. GURU CHANDAL DOSHA ─────────────────────────────────────
  // Jupiter + Rahu/Ketu in same house
  if (jupiterHouse && (jupiterHouse === rahuHouse || jupiterHouse === ketuHouse)) {
    const withNode = jupiterHouse === rahuHouse ? 'Rahu' : 'Ketu';
    doshas.push({
      name: 'Jupiter-Shadow Node Tension',
      sinhala: 'ගුරු-සෙවනැල්ල අභියෝගය',
      icon: '🔱',
      present: true,
      severity: withNode === 'Rahu' ? 'Strong' : 'Moderate',
      details: { jupiterHouse, withNode },
      description: `Jupiter conjunct ${withNode} in house ${jupiterHouse} — the wisdom planet is influenced by the shadow node. This can create confusion in values, encounters with misleading advisors, and unconventional beliefs. However, it also grants unique insight and strong research ability.`,
      descriptionSi: `${jupiterHouse} වන භාවයේ ගුරු ${withNode === 'Rahu' ? 'රාහු' : 'කේතු'} සමඟ — ප්‍රඥා ග්‍රහයා සෙවනැල්ලෙන් කිලිටි වෙනවා. ධර්මයේ ව්‍යාකූලත්වය, වැරදි ගුරුවරුන්/උපදේශකයින් තියෙනවාිවිය පුළුවන්. නමුත් අසාමාන්‍ය ප්‍රඥාව හා පර්යේෂණ පුළුවන්ියාවද ලබා දෙනවා.`,
      remedies: [
        'Seek wisdom from verified, trustworthy mentors',
        'Practice generosity and share knowledge freely',
        'Read broadly and form your own informed opinions',
        'Respect teachers and elderly people always',
        'Engage in lifelong learning — education strengthens Jupiter',
      ],
    });
  }

  // ── 8. DARIDRA DOSHA (Poverty Yoga) ───────────────────────────
  // Lord of 11th in 6, 8, or 12 AND Lord of 2nd in 6, 8, or 12
  const lord2RashiId = houses[1]?.rashiId;
  const lord2Name = RASHIS[(lord2RashiId || 1) - 1]?.lord;
  const lord2House = getPlanetHouse(lord2Name);

  const lord11RashiId = houses[10]?.rashiId;
  const lord11Name = RASHIS[(lord11RashiId || 1) - 1]?.lord;
  const lord11House = getPlanetHouse(lord11Name);

  if (lord2House && lord11House && [6, 8, 12].includes(lord2House) && [6, 8, 12].includes(lord11House)) {
    doshas.push({
      name: 'Financial Challenge Pattern',
      sinhala: 'මූල්‍ය අභියෝග රටාව',
      icon: '💸',
      present: true,
      severity: 'Moderate',
      description: `Both wealth lords (2nd: ${lord2Name}, 11th: ${lord11Name}) are in difficult houses. Financial growth requires extra effort and karmic remedies.`,
      descriptionSi: `ධන භාවාධිපතීන් දෙන්නම (2 වන: ${lord2Name}, 11 වන: ${lord11Name}) දුෂ්කර භාවවල ඉන්නවා. මූල්‍ය වර්ධනය සඳහා අමතර උත්සාහය හා කර්ම පිළියම් ඕනේ.`,
      remedies: [
        'Build a consistent saving habit — even small amounts matter',
        'Practice generosity by sharing with those in need',
        'Keep finances transparent — never hide money',
        'Develop financial literacy — learn about budgeting and investing',
        'Keep your living space clean and organized, especially the northeast corner',
      ],
    });
  }

  return doshas;
}


// ═══════════════════════════════════════════════════════════════════════════
//  TIER 1-B: EXPANDED YOGA DETECTION (30+ YOGAS)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect comprehensive yogas beyond the basic 6
 * Adds: Raja Yogas, Dhana Yogas, Viparita Raja, Neechabhanga,
 *       Chandra-Mangala, Saraswati, Adhi Yoga, Sunapha/Anapha/Durudhura,
 *       Amala Yoga, Chamara Yoga, Parvata Yoga, and more
 */
function detectAdvancedYogas(date, lat, lng) {
  const { houses, lagna, planets } = buildHouseChart(date, lat, lng);
  const yogas = [];

  const getPlanetHouse = (planetName) => {
    const h = houses.find(h => h.planets.some(p => p.name === planetName));
    return h ? h.houseNumber : null;
  };

  const getHouseLord = (houseNum) => {
    const h = houses[houseNum - 1];
    if (!h) return null;
    return RASHIS[(h.rashiId || 1) - 1]?.lord;
  };

  const moonHouse = getPlanetHouse('Moon');
  const sunHouse = getPlanetHouse('Sun');
  const marsHouse = getPlanetHouse('Mars');
  const mercuryHouse = getPlanetHouse('Mercury');
  const jupiterHouse = getPlanetHouse('Jupiter');
  const venusHouse = getPlanetHouse('Venus');
  const saturnHouse = getPlanetHouse('Saturn');
  const rahuHouse = getPlanetHouse('Rahu');
  const ketuHouse = getPlanetHouse('Ketu');

  // ── RAJA YOGAS (Power & Authority) ────────────────────────────

  // 1. Kendra-Trikona Raja Yoga (Lord of Kendra + Lord of Trikona conjunct/same house)
  const kendraHouses = [1, 4, 7, 10];
  const trikonaHouses = [1, 5, 9];

  for (const k of kendraHouses) {
    for (const t of trikonaHouses) {
      if (k === t && k === 1) continue; // Skip Lagna lord with itself
      const kendraLord = getHouseLord(k);
      const trikonaLord = getHouseLord(t);
      if (!kendraLord || !trikonaLord || kendraLord === trikonaLord) continue;

      const kendraLordHouse = getPlanetHouse(kendraLord);
      const trikonaLordHouse = getPlanetHouse(trikonaLord);

      if (kendraLordHouse && trikonaLordHouse && kendraLordHouse === trikonaLordHouse) {
        yogas.push({
          name: `Raja Yoga (${k}th + ${t}th Lords)`,
          sinhala: 'රාජ යෝගය',
          icon: '👑',
          description: `Lord of ${k}th house (${kendraLord}) and ${t}th house (${trikonaLord}) conjunct in house ${kendraLordHouse}. Grants power, authority, and high social status.`,
          descriptionSi: `${k} වැනි භාවයේ අධිපති (${kendraLord}) සහ ${t} වැනි භාවයේ අධිපති (${trikonaLord}) ${kendraLordHouse} වැනි භාවයේ එක්ව ඉන්නවා. බලය, අධිකාරය සහ ඉහළ සමාජ තත්ත්වය ලබා දෙනවා.`,
          strength: (isInKendra(kendraLordHouse) || isInTrikona(kendraLordHouse)) ? 'Very Strong' : 'Strong',
          category: 'Raja Yoga',
        });
        break; // Don't flood with too many Raja Yogas
      }
    }
  }

  // 2. Dharma-Karmadhipati Yoga (9th lord + 10th lord connected)
  const lord9 = getHouseLord(9);
  const lord10 = getHouseLord(10);
  const lord9House = lord9 ? getPlanetHouse(lord9) : null;
  const lord10House = lord10 ? getPlanetHouse(lord10) : null;

  if (lord9 && lord10 && lord9House && lord10House) {
    if (lord9House === lord10House) {
      yogas.push({
        name: 'Dharma-Karmadhipati Yoga',
        sinhala: 'ධර්ම-කර්මාධිපති යෝගය',
        icon: '⭐',
        description: `9th lord (${lord9}) and 10th lord (${lord10}) conjunct in house ${lord9House}. This is one of the most powerful Raja Yogas — fortune through career, high status.`,
        descriptionSi: `9 වැනි අධිපති (${lord9}) සහ 10 වැනි අධිපති (${lord10}) ${lord9House} වැනි භාවයේ එක්ව ඉන්නවා. ධර්ම-කර්මාධිපති යෝගය — වෘත්තීය ජයග්‍රහණ සහ ඉහළ තත්ත්වය ලබා දෙන ඉතා බලවත් රාජ යෝගයකි.`,
        strength: 'Very Strong',
        category: 'Raja Yoga',
      });
    }
    // Mutual aspect (exchange of houses)
    if (lord9House === 10 && lord10House === 9) {
      yogas.push({
        name: 'Dharma-Karma Parivartana Yoga',
        sinhala: 'ධර්ම-කර්ම පරිවර්තන යෝගය',
        icon: '🔄⭐',
        description: `9th lord (${lord9}) in 10th and 10th lord (${lord10}) in 9th — mutual exchange. Extremely powerful for career success and spiritual-material balance.`,
        descriptionSi: `9 වැනි අධිපති (${lord9}) 10 වැනි භාවයේ සහ 10 වැනි අධිපති (${lord10}) 9 වැනි භාවයේ — අන්‍යෝන්‍ය හුවමාරුවකි. රැකියා ජයග්‍රහණ සහ ආධ්‍යාත්මික-භෞතික සමතුලිතතාව සඳහා අතිශයින් බලවත් ය.`,
        strength: 'Very Strong',
        category: 'Raja Yoga',
      });
    }
  }

  // 3. Viparita Raja Yoga (Lords of 6, 8, 12 in each other's houses)
  const lord6 = getHouseLord(6);
  const lord8 = getHouseLord(8);
  const lord12 = getHouseLord(12);
  const lord6House = lord6 ? getPlanetHouse(lord6) : null;
  const lord8House = lord8 ? getPlanetHouse(lord8) : null;
  const lord12House = lord12 ? getPlanetHouse(lord12) : null;

  const dusthanaLords = [
    { lord: lord6, house: lord6House, from: 6 },
    { lord: lord8, house: lord8House, from: 8 },
    { lord: lord12, house: lord12House, from: 12 },
  ];

  for (const dl of dusthanaLords) {
    if (dl.house && [6, 8, 12].includes(dl.house) && dl.house !== dl.from) {
      yogas.push({
        name: `Viparita Raja Yoga (${dl.from}th lord)`,
        sinhala: 'විපරීත රාජ යෝගය',
        icon: '🔄👑',
        description: `${dl.from}th lord (${dl.lord}) in house ${dl.house}. Enemies destroy each other — creating success from adversity. Problems of others become your gain.`,
        descriptionSi: `${dl.from} වැනි අධිපති (${dl.lord}) ${dl.house} වැනි භාවයේ ඉන්නවා. සතුරන් එකිනෙකා විනාශ කරගනී — අසීරුතාවලින් සාර්ථකත්වය උපදී. අන් අයගේ ගැටළු ඔබට වාසිදායක වෙනවා.`,
        strength: 'Strong',
        category: 'Viparita Raja Yoga',
      });
    }
  }

  // ── DHANA YOGAS (Wealth) ──────────────────────────────────────

  // 4. Dhana Yoga — 2nd lord + 11th lord connected
  const lord2 = getHouseLord(2);
  const lord11 = getHouseLord(11);
  const lord2House = lord2 ? getPlanetHouse(lord2) : null;
  const lord11House = lord11 ? getPlanetHouse(lord11) : null;

  if (lord2House && lord11House && lord2House === lord11House) {
    yogas.push({
      name: 'Dhana Yoga (Wealth Combination)',
      sinhala: 'ධන යෝගය',
      icon: '💰',
      description: `2nd lord (${lord2}) and 11th lord (${lord11}) conjunct in house ${lord2House}. Strong wealth accumulation through steady income and savings.`,
      descriptionSi: `2 වැනි අධිපති (${lord2}) සහ 11 වැනි අධිපති (${lord11}) ${lord2House} වැනි භාවයේ එක්ව ඉන්නවා. ස්ථාවර ආදායම සහ ඉතිරිකිරීම් හරහා ශක්තිමත් ධන සමුච්චයක් ලබා දෙනවා.`,
      strength: 'Strong',
      category: 'Dhana Yoga',
    });
  }

  // 5. Lakshmi-Narayana Yoga — Venus and Jupiter in Kendras
  if (venusHouse && jupiterHouse && isInKendra(venusHouse) && isInKendra(jupiterHouse)) {
    yogas.push({
      name: 'Lakshmi-Narayana Yoga',
      sinhala: 'ලක්ෂ්මී-නාරායණ යෝගය',
      icon: '💎✨',
      description: 'Both Venus and Jupiter in angular houses. Grants exceptional wealth, marital happiness, and divine protection.',
      descriptionSi: 'සිකුරු සහ ගුරු යන දෙන්නම කේන්ද්‍ර භාවවල ඉන්නවා. සුවිශේෂ ධනය, විවාහ සතුට සහ දෛවික ආරක්ෂාව ලබා දෙනවා.',
      strength: 'Very Strong',
      category: 'Dhana Yoga',
    });
  }

  // ── NEECHABHANGA RAJA YOGA (Debilitation Cancelled) ───────────

  // 6. Check for each planet: if debilitated but lord of its debilitation sign is in kendra from lagna/moon
  const DEBILITATIONS = {
    'Sun': { sign: 7, cancelLord: 'Venus' },    // Libra, lord Venus
    'Moon': { sign: 8, cancelLord: 'Mars' },     // Scorpio, lord Mars
    'Mars': { sign: 4, cancelLord: 'Moon' },     // Cancer, lord Moon
    'Mercury': { sign: 12, cancelLord: 'Jupiter' }, // Pisces, lord Jupiter
    'Jupiter': { sign: 10, cancelLord: 'Saturn' }, // Capricorn, lord Saturn
    'Venus': { sign: 6, cancelLord: 'Mercury' },   // Virgo, lord Mercury
    'Saturn': { sign: 1, cancelLord: 'Mars' },     // Aries, lord Mars
  };

  for (const [planetName, debilData] of Object.entries(DEBILITATIONS)) {
    const pRashiId = planets[planetName.toLowerCase()]?.rashiId;
    if (pRashiId === debilData.sign) {
      // Planet is debilitated — check cancellation
      const cancelLordHouse = getPlanetHouse(debilData.cancelLord);
      const planetHouse = getPlanetHouse(planetName);

      let cancelled = false;
      let reason = '';

      // Cancel lord in kendra from Lagna
      if (cancelLordHouse && isInKendra(cancelLordHouse)) {
        cancelled = true;
        reason = `${debilData.cancelLord} (lord of debilitation sign) is in kendra (house ${cancelLordHouse})`;
      }
      // Exaltation lord of the debilitation sign aspects the debilitated planet
      // The planet that gets exalted in the debilitation sign also cancels
      if (planetHouse && cancelLordHouse && cancelLordHouse === planetHouse) {
        cancelled = true;
        reason = `${debilData.cancelLord} conjunct with debilitated ${planetName}`;
      }

      if (cancelled) {
        yogas.push({
          name: `Neechabhanga Raja Yoga (${planetName})`,
          sinhala: 'නීචභංග රාජ යෝගය',
          icon: '🦅',
          description: `${planetName} is debilitated but cancellation occurs: ${reason}. This transforms weakness into extraordinary strength. From rock bottom to the top — the phoenix yoga.`,
          descriptionSi: `${planetName} නීච වුවත් නීචභංගය සිද්ධ වෙලා තියෙනවා: ${reason}. මෙය දුර්වලකම අසාමාන්‍ය ශක්තියක් බවට පරිවර්තනය කරනවා. පිරිහීමේ සිට උත්කර්ෂය දක්වා — මෙය ෆීනික්ස් යෝගයයි.`,
          strength: 'Very Strong',
          category: 'Neechabhanga',
        });
      }
    }
  }

  // ── MOON-BASED YOGAS ──────────────────────────────────────────

  // 7. Chandra-Mangala Yoga (Moon + Mars together)
  if (moonHouse && marsHouse && moonHouse === marsHouse) {
    yogas.push({
      name: 'Chandra-Mangala Yoga',
      sinhala: 'චන්ද්‍ර-මංගල යෝගය',
      icon: '🌙🔥',
      description: 'Moon and Mars conjunct — grants wealth through bold action, real estate, and the courage to take risks. Emotionally intense but financially rewarding.',
      descriptionSi: 'චන්ද්‍ර සහ කුජ එක්ව ඉන්නවා — නිර්භීත ක්‍රියාමාර්ග, ඉඩම් සහ අවදානම් ගැනීමේ ධෛර්යය තුළින් ධනය ලබා දෙනවා. හැඟීම්බර නමුත් මූල්‍යමය වශයෙන් ප්‍රතිලාභදායක වෙනවා.',
      strength: 'Strong',
      category: 'Dhana Yoga',
    });
  }

  // 8. Sunapha Yoga (Any planet except Sun in 2nd from Moon)
  if (moonHouse) {
    const secondFromMoon = (moonHouse % 12) + 1;
    const planetsIn2ndFromMoon = [marsHouse, mercuryHouse, jupiterHouse, venusHouse, saturnHouse].filter(h => h === secondFromMoon);
    if (planetsIn2ndFromMoon.length > 0) {
      yogas.push({
        name: 'Sunapha Yoga',
        sinhala: 'සුනාපා යෝගය',
        icon: '🌙✨',
        description: 'Planet(s) in 2nd from Moon — grants self-made wealth, good reputation, and the ability to acquire resources through personal effort.',
        descriptionSi: 'චන්ද්‍රයාගෙන් 2 වැනි භාවයේ ග්‍රහයන් — ස්වයං උත්සාහයෙන් ධනය, යහපත් කීර්තිනාමය සහ පෞද්ගලික වෑයමෙන් සම්පත් ලබා ගැනීමේ පුළුවන්ියාව ලබා දෙනවා.',
        strength: 'Strong',
        category: 'Moon Yoga',
      });
    }

    // 9. Anapha Yoga (Planet in 12th from Moon)
    const twelfthFromMoon = ((moonHouse - 2 + 12) % 12) + 1;
    const planetsIn12thFromMoon = [marsHouse, mercuryHouse, jupiterHouse, venusHouse, saturnHouse].filter(h => h === twelfthFromMoon);
    if (planetsIn12thFromMoon.length > 0) {
      yogas.push({
        name: 'Anapha Yoga',
        sinhala: 'අනපා යෝගය',
        icon: '🌙💫',
        description: 'Planet(s) in 12th from Moon — grants charismatic personality, fame, and the power to influence others. Natural leadership quality.',
        descriptionSi: 'චන්ද්‍රයාගෙන් 12 වැනි භාවයේ ග්‍රහයන් — ආකර්ෂණීය පෞරුෂය, ප්‍රසිද්ධිය සහ අන් අය කෙරෙහි බලපෑම් කරන්න පුළුවන් ශක්තිය ලබා දෙනවා. ස්වභාවික නායකත්ව ගුණාංගයකි.',
        strength: 'Strong',
        category: 'Moon Yoga',
      });
    }

    // 10. Durudhura Yoga (Planets on both sides of Moon)
    if (planetsIn2ndFromMoon.length > 0 && planetsIn12thFromMoon.length > 0) {
      yogas.push({
        name: 'Durudhura Yoga',
        sinhala: 'දුරුධුරා යෝගය',
        icon: '🌙👑',
        description: 'Moon flanked by planets on both sides — the most powerful Moon yoga. Grants wealth, fame, generosity, and high position. Life is blessed from all directions.',
        descriptionSi: 'චන්ද්‍රයාගේ දෙපසින්ම ග්‍රහයන් පිහිටා තියෙනවා — ඉතා බලවත් චන්ද්‍ර යෝගයයි. ධනය, කීර්තිය, ත්‍යාගශීලිත්වය සහ ඉහළ තත්ත්වය ලබා දෙනවා. ජීවිතය සෑම දිශාවකින්ම ආශීර්වාද ලැබී තියෙනවා.',
        strength: 'Very Strong',
        category: 'Moon Yoga',
      });
    }
  }

  // 11. Adhi Yoga (Benefics in 6, 7, 8 from Moon)
  if (moonHouse) {
    const h6FromMoon = ((moonHouse + 5 - 1) % 12) + 1;
    const h7FromMoon = ((moonHouse + 6 - 1) % 12) + 1;
    const h8FromMoon = ((moonHouse + 7 - 1) % 12) + 1;

    const benefics = [jupiterHouse, venusHouse, mercuryHouse];
    const inH6 = benefics.filter(h => h === h6FromMoon).length;
    const inH7 = benefics.filter(h => h === h7FromMoon).length;
    const inH8 = benefics.filter(h => h === h8FromMoon).length;

    if (inH6 + inH7 + inH8 >= 2) {
      yogas.push({
        name: 'Adhi Yoga',
        sinhala: 'අධි යෝගය',
        icon: '🏛️',
        description: 'Multiple benefic planets in 6th, 7th, and 8th from Moon. Grants commanding authority, political power, and the ability to defeat all opposition.',
        descriptionSi: 'චන්ද්‍රයාගෙන් 6, 7 සහ 8 වැනි භාවවල බහු ශුභ ග්‍රහයන් ඉන්නවා. විධාන බලය, දේශපාලන බලය සහ සියලු විරුද්ධත්වය පරාජය කිරීමේ පුළුවන්ියාව ලබා දෙනවා.',
        strength: inH6 + inH7 + inH8 >= 3 ? 'Very Strong' : 'Strong',
        category: 'Raja Yoga',
      });
    }
  }

  // ── WISDOM & EDUCATION YOGAS ──────────────────────────────────

  // 12. Saraswati Yoga (Mercury, Venus, Jupiter in Kendras/Trikonas)
  const saraswatiPlanets = [mercuryHouse, venusHouse, jupiterHouse].filter(Boolean);
  const saraswatiInGood = saraswatiPlanets.filter(h => isInKendra(h) || isInTrikona(h));
  if (saraswatiInGood.length >= 2) {
    yogas.push({
      name: 'Saraswati Yoga',
      sinhala: 'සරස්වතී යෝගය',
      icon: '📚',
      description: 'Mercury, Venus, and Jupiter are well placed — grants exceptional intelligence, artistic talent, eloquence in speech, and mastery of knowledge. A scholar\'s combination.',
      descriptionSi: 'බුධ, සිකුරු සහ ගුරු යහපත් ස්ථානවල පිහිටා තියෙනවා — සුවිශේෂ බුද්ධිය, කලාත්මක පුළුවන්ියාව, වාග් චාතුර්යය සහ දැනුමේ ප්‍රවීණත්වය ලබා දෙනවා. විද්වතෙකුගේ සංයෝජනයකි.',
      strength: saraswatiInGood.length === 3 ? 'Very Strong' : 'Strong',
      category: 'Education Yoga',
    });
  }

  // 13. Budha-Aditya Yoga — already in basic, skip
  // 14. Gaja Kesari — already in basic, skip

  // 15. Amala Yoga (Benefic in 10th from Moon or Lagna)
  if (moonHouse) {
    const h10FromMoon = ((moonHouse + 9 - 1) % 12) + 1;
    if ([jupiterHouse, venusHouse, mercuryHouse].includes(h10FromMoon)) {
      yogas.push({
        name: 'Amala Yoga',
        sinhala: 'අමල යෝගය',
        icon: '🕊️',
        description: 'Benefic planet in 10th from Moon — grants an unblemished reputation, ethical conduct, and lasting fame. People naturally trust and respect you.',
        descriptionSi: 'චන්ද්‍රයාගෙන් 10 වැනි භාවයේ ශුභ ග්‍රහයෙක් — නිර්දෝෂ කීර්තිනාමය, ආචාරශීලී හැසිරීම සහ කල්පවත්නා ප්‍රසිද්ධිය ලබා දෙනවා. මිනිසුන් ස්වභාවිකවම ඔබට විශ්වාස කොට ගෞරව කරති.',
        strength: 'Strong',
        category: 'Character Yoga',
      });
    }
  }

  // 16. Chamara Yoga (Lagna lord exalted and aspected by Jupiter)
  const lagnaLord = lagna.rashi.lord;
  const lagnaLordRashiId = planets[lagnaLord?.toLowerCase()]?.rashiId;
  const EXALTATIONS = { 'Sun': 1, 'Moon': 2, 'Mars': 10, 'Mercury': 6, 'Jupiter': 4, 'Venus': 12, 'Saturn': 7 };

  if (lagnaLord && lagnaLordRashiId === EXALTATIONS[lagnaLord]) {
    yogas.push({
      name: 'Chamara Yoga',
      sinhala: 'චාමර යෝගය',
      icon: '🏅',
      description: `Lagna lord ${lagnaLord} is exalted — the soul is born with exceptional strength. Grants royal honors, high position, and a magnetic personality.`,
      descriptionSi: `ලග්නාධිපති ${lagnaLord} උච්ච වී තියෙනවා — ආත්මය සුවිශේෂ ශක්තියකින් උපත ලබා තියෙනවා. රාජකීය ගෞරව, ඉහළ තත්ත්වය සහ ආකර්ෂණීය පෞරුෂයක් ලබා දෙනවා.`,
      strength: 'Very Strong',
      category: 'Personality Yoga',
    });
  }

  // 17. Parvata Yoga (Benefics in Kendras, no malefic in Kendras)
  const beneficInKendra = [jupiterHouse, venusHouse, mercuryHouse, moonHouse].filter(h => h && isInKendra(h));
  const maleficInKendra = [sunHouse, marsHouse, saturnHouse, rahuHouse, ketuHouse].filter(h => h && isInKendra(h));

  if (beneficInKendra.length >= 2 && maleficInKendra.length === 0) {
    yogas.push({
      name: 'Parvata Yoga',
      sinhala: 'පර්වත යෝගය',
      icon: '🏔️',
      description: 'Supportive planets dominate the key positions with no challenging obstruction — grants a life of fortune, comfort, recognition, and natural authority.',
      descriptionSi: 'ශුභ ග්‍රහයන් පාප ග්‍රහ බාධාවකින් තොරව කේන්ද්‍ර භාවවල ආධිපත්‍යය දරයි — කඳුකර රජෙකු මෙන් වාසනාවන්ත, සුවපහසු, ප්‍රසිද්ධ සහ බලවත් ජීවිතයක් ලබා දෙනවා.',
      strength: 'Very Strong',
      category: 'Raja Yoga',
    });
  }

  // 18. Kahala Yoga (Lords of 4th and 9th together or in mutual Kendras)
  const lord4 = getHouseLord(4);
  const lord4House = lord4 ? getPlanetHouse(lord4) : null;
  if (lord4House && lord9House && lord4House === lord9House) {
    yogas.push({
      name: 'Kahala Yoga',
      sinhala: 'කහල යෝගය',
      icon: '🥁',
      description: `4th lord (${lord4}) and 9th lord (${lord9}) conjunct in house ${lord4House} — grants boldness, property, fortune through homeland, and a courageous spirit.`,
      descriptionSi: `4 වැනි අධිපති (${lord4}) සහ 9 වැනි අධිපති (${lord9}) ${lord4House} වැනි භාවයේ එක්ව ඉන්නවා — නිර්භීතකම, දේපළ, මව්බිම හරහා වාසනාව සහ ධෛර්යවන්ත ආත්මයක් ලබා දෙනවා.`,
      strength: 'Strong',
      category: 'Dhana Yoga',
    });
  }

  // 19. Malavya Yoga (Panch Mahapurusha — Venus)
  if (venusHouse && isInKendra(venusHouse) && [2, 7, 12].includes(planets.venus?.rashiId)) {
    yogas.push({
      name: 'Malavya Yoga',
      sinhala: 'මාලව්‍ය යෝගය',
      icon: '💐',
      description: 'Venus strong in Kendra in own/exalted sign — grants exceptional beauty, artistic talent, luxurious life, and a loving spouse. One of the Panch Mahapurusha Yogas.',
      descriptionSi: 'සිකුරු කේන්ද්‍රයක ස්වකීය/උච්ච රාශියේ බලවත්ව ඉන්නවා — සුවිශේෂ සෞන්දර්යය, කලාත්මක පුළුවන්ියාව, සුඛෝපභෝගී ජීවිතයක් සහ ආදරණීය සහකරුවෙකු ලබා දෙනවා. පංච මහාපුරුෂ යෝගවලින් එකකි.',
      strength: 'Very Strong',
      category: 'Panch Mahapurusha',
    });
  }

  // 20. Shubha Kartari Yoga (Benefics on both sides of a house)
  // Check for Lagna (house 1)
  const planetsIn2 = houses[1]?.planets?.map(p => p.name) || [];
  const planetsIn12 = houses[11]?.planets?.map(p => p.name) || [];
  const beneficNames = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
  const hasBeneficIn2 = planetsIn2.some(p => beneficNames.includes(p));
  const hasBeneficIn12 = planetsIn12.some(p => beneficNames.includes(p));

  if (hasBeneficIn2 && hasBeneficIn12) {
    yogas.push({
      name: 'Shubha Kartari Yoga',
      sinhala: 'ශුභ කර්තරි යෝගය',
      icon: '🛡️',
      description: 'Supportive planets on both sides of the Ascendant — a natural protection shield. Life is blessed, obstacles are deflected, and good fortune surrounds you.',
      descriptionSi: 'ලග්නයේ දෙපසින්ම ශුභ ග්‍රහයන් — දෛවික ආරක්ෂණ පළිහකි. ජීවිතය ආශීර්වාදමය, බාධා මග හැරෙන අතර වාසනාව ඔබ වටා කරකැවෙනවා.',
      strength: 'Strong',
      category: 'Protection Yoga',
    });
  }

  // 21. Papa Kartari Yoga (Malefics hemming Lagna — negative)
  const maleficNames = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
  const hasMaleficIn2 = planetsIn2.some(p => maleficNames.includes(p));
  const hasMaleficIn12 = planetsIn12.some(p => maleficNames.includes(p));

  if (hasMaleficIn2 && hasMaleficIn12 && !hasBeneficIn2 && !hasBeneficIn12) {
    yogas.push({
      name: 'Papa Kartari Yoga',
      sinhala: 'පාප කර්තරි යෝගය',
      icon: '⚠️',
      description: 'Challenging planets on both sides of the Ascendant — creates pressure, restrictions, and feeling "boxed in" by circumstances. Awareness and proactive effort help overcome this.',
      descriptionSi: 'පාප ග්‍රහයන් ලග්නය දෙපසින් වටකර තියෙනවා — පීඩනය, සීමාවන් සහ තත්ත්වයන් මගින් "සීමා වී තියෙනවාි" හැඟීමක් තියෙනවාි කරනවා. ආධ්‍යාත්මික පිළියම් අවශ්‍ය වෙනවා.',
      strength: 'Strong',
      category: 'Dosha Yoga',
    });
  }

  // 22. Shakata Yoga (Jupiter in 6, 8, 12 from Moon — negative)
  if (moonHouse && jupiterHouse) {
    const jupFromMoon = ((jupiterHouse - moonHouse + 12) % 12) + 1;
    if ([6, 8, 12].includes(jupFromMoon)) {
      yogas.push({
        name: 'Shakata Yoga',
        sinhala: 'ශකට යෝගය',
        icon: '🎡',
        description: 'Jupiter in 6th, 8th, or 12th from Moon — life goes up and down like a cart wheel. Wealth comes and goes. Need to build resilience and consistent effort.',
        descriptionSi: 'ගුරු චන්ද්‍රයාගෙන් 6, 8 හෝ 12 වැනි භාවයේ ඉන්නවා — ජීවිතය ගැල් රෝදයක් මෙන් ඉහළ පහළ යයි. ධනය පැමිණී යළිත් යනවා. ඔරොත්තු දීමේ ශක්තිය හා අඛණ්ඩ උත්සාහය හදාගන්න ඕනේ.',
        strength: 'Moderate',
        category: 'Challenge Yoga',
      });
    }
  }

  // 23. Voshi Yoga (Planet in 2nd from Sun, excluding Moon)
  if (sunHouse) {
    const secondFromSun = (sunHouse % 12) + 1;
    const planetsIn2ndFromSun = [marsHouse, mercuryHouse, jupiterHouse, venusHouse, saturnHouse].filter(h => h === secondFromSun);
    if (planetsIn2ndFromSun.length > 0) {
      yogas.push({
        name: 'Voshi Yoga',
        sinhala: 'වෝෂී යෝගය',
        icon: '☀️✨',
        description: 'Planet in 2nd from Sun — grants eloquent speech, good memory, and the ability to influence through words and presence.',
        descriptionSi: 'සූර්යයාගෙන් 2 වැනි භාවයේ ග්‍රහයෙක් — වාග් චාතුර්යය, හොඳ මතක ශක්තිය සහ වචනවලින් සහ පැවැත්මෙන් බලපෑම් කිරීමේ පුළුවන්ියාව ලබා දෙනවා.',
        strength: 'Medium',
        category: 'Sun Yoga',
      });
    }
  }

  // 24. Ubhayachari Yoga (Planets on both sides of Sun)
  if (sunHouse) {
    const beforeSun = ((sunHouse - 2 + 12) % 12) + 1;
    const afterSun = (sunHouse % 12) + 1;
    const hasBefore = [marsHouse, mercuryHouse, jupiterHouse, venusHouse, saturnHouse].some(h => h === beforeSun);
    const hasAfter = [marsHouse, mercuryHouse, jupiterHouse, venusHouse, saturnHouse].some(h => h === afterSun);

    if (hasBefore && hasAfter) {
      yogas.push({
        name: 'Ubhayachari Yoga',
        sinhala: 'උභයචාරී යෝගය',
        icon: '☀️👑',
        description: 'Planets flanking the Sun on both sides — grants royal bearing, kingly generosity, and the ability to be the center of any room. Natural-born leader.',
        descriptionSi: 'සූර්යයාගේ දෙපසින්ම ග්‍රහයන් ඉන්නවා — රාජකීය ගතිගුණ, රජුන්ගේ ත්‍යාගශීලිත්වය සහ ඕනෑම අවස්ථාවක මධ්‍යස්ථානය වීමේ පුළුවන්ියාව ලබා දෙනවා. ස්වභාවික නායකයෙකි.',
        strength: 'Strong',
        category: 'Sun Yoga',
      });
    }
  }

  // 25. Kesari Yoga variant — Jupiter in Kendra from Lagna (not just Moon)
  if (jupiterHouse && isInKendra(jupiterHouse)) {
    yogas.push({
      name: 'Guru Bala (Jupiter Strength)',
      sinhala: 'ගුරු බල',
      icon: '🙏',
      description: 'Jupiter in an angular house from Lagna — divine protection, wisdom in decision-making, and blessings from teachers and elder mentors.',
      descriptionSi: 'ගුරු ලග්නයෙන් කේන්ද්‍ර භාවයක ඉන්නවා — දෛවික ආරක්ෂාව, තීරණ ගැනීමේ ප්‍රඥාව සහ ගුරුවරුන් හා වැඩිහිටි උපදේශකයන්ගේ ආශීර්වාදය ලැබෙනවා.',
      strength: 'Strong',
      category: 'Benefic Yoga',
    });
  }

  return yogas;
}


// ═══════════════════════════════════════════════════════════════════════════
//  TIER 1-C: JAIMINI SYSTEM — Chara Karakas & Karakamsha
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate Jaimini Chara Karakas (Variable Significators)
 * Planets sorted by degree in sign — highest degree = Atmakaraka (soul)
 * 
 * 7 Karakas: Atmakaraka → Amatyakaraka → Bhratrikaraka → Matrikaraka →
 *            Putrakaraka → Gnatikaraka → Darakaraka
 */
function calculateJaiminiKarakas(date, lat, lng, opts = {}) {
  const planets = getAdvancedPlanets(date, lat, lng, opts);
  const lagna = getLagna(date, lat, lng);
  const navamsha = buildNavamshaChart(date, lat, lng);

  // Only use 7 planets (exclude Rahu/Ketu for standard Jaimini)
  const KARAKA_NAMES = [
    { name: 'Atmakaraka', sinhala: 'ආත්මකාරක', meaning: 'Soul Significator — reveals your soul\'s deepest desire and life purpose' },
    { name: 'Amatyakaraka', sinhala: 'අමාත්‍යකාරක', meaning: 'Career Significator — shows your professional path and public role' },
    { name: 'Bhratrikaraka', sinhala: 'භ්‍රාතෘකාරක', meaning: 'Sibling Significator — governs courage, initiative, and younger siblings' },
    { name: 'Matrikaraka', sinhala: 'මාතෘකාරක', meaning: 'Mother Significator — represents mother, home, emotions, and nurturing' },
    { name: 'Putrakaraka', sinhala: 'පුත්‍රකාරක', meaning: 'Children Significator — governs children, creativity, past-life merit' },
    { name: 'Gnatikaraka', sinhala: 'ඥාතිකාරක', meaning: 'Obstacles Significator — shows enemies, diseases, and struggles you must overcome' },
    { name: 'Darakaraka', sinhala: 'දාරකාරක', meaning: 'Spouse Significator — the LOWEST degree planet reveals your spouse\'s nature' },
  ];

  // Sort planets by degree in sign (descending)
  const planetEntries = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn']
    .map(key => ({
      key,
      name: planets[key].name,
      sinhala: planets[key].sinhala,
      degree: planets[key].degreeInSign,
      rashi: planets[key].rashiEnglish,
      rashiId: planets[key].rashiId,
    }))
    .sort((a, b) => b.degree - a.degree);

  const karakas = {};

  planetEntries.forEach((planet, index) => {
    if (index < KARAKA_NAMES.length) {
      const karakaInfo = KARAKA_NAMES[index];
      karakas[karakaInfo.name] = {
        planet: planet.name,
        sinhala: planet.sinhala,
        degree: planet.degree.toFixed(2),
        rashi: planet.rashi,
        rashiId: planet.rashiId,
        role: karakaInfo.name,
        roleSinhala: karakaInfo.sinhala,
        meaning: karakaInfo.meaning,
      };
    }
  });

  // ── KARAKAMSHA — Navamsha position of Atmakaraka ──────────────
  // This reveals the soul's true desire and spiritual path
  const atmakarakaKey = planetEntries[0].key;
  const atmakarakaNavamsha = navamsha.planets[atmakarakaKey];
  const karakamshaRashiId = atmakarakaNavamsha?.navamshaRashiId;
  const karakamshaRashi = karakamshaRashiId ? RASHIS[karakamshaRashiId - 1] : null;

  // Karakamsha themes — technical keywords for AI interpretation
  const KARAKAMSHA_THEMES = {
    1: { desire: 'leadership', archetype: 'pioneer', domain: 'independence', desireSi: 'නායකත්වය', archetypeSi: 'පුරෝගාමියා', domainSi: 'ස්වාධීනත්වය' },
    2: { desire: 'material_security', archetype: 'artist', domain: 'wealth_beauty', desireSi: 'භෞතික ආරක්ෂාව', archetypeSi: 'කලාකරු', domainSi: 'ධනය_සෞන්දර්ය' },
    3: { desire: 'knowledge', archetype: 'communicator', domain: 'intellect', desireSi: 'දැනුම', archetypeSi: 'සන්නිවෙනවාදක', domainSi: 'බුද්ධිය' },
    4: { desire: 'emotional_security', archetype: 'nurturer', domain: 'home_family', desireSi: 'හැඟීම් ආරක්ෂාව', archetypeSi: 'පෝෂකයා', domainSi: 'නිවස_පවුල' },
    5: { desire: 'creative_expression', archetype: 'performer', domain: 'fame_authority', desireSi: 'නිර්මාණශීලී ප්‍රකාශනය', archetypeSi: 'රංගන ශිල්පියා', domainSi: 'කීර්තිය_අධිකාරය' },
    6: { desire: 'service', archetype: 'healer', domain: 'problem_solving', desireSi: 'සේවය', archetypeSi: 'වෛද්‍ය', domainSi: 'ගැටලු විසඳීම' },
    7: { desire: 'harmony', archetype: 'diplomat', domain: 'partnership_justice', desireSi: 'සමගිය', archetypeSi: 'රාජ්‍ය තාන්ත්‍රික', domainSi: 'හවුල්කාරිත්වය_යුක්තිය' },
    8: { desire: 'transformation', archetype: 'researcher', domain: 'occult_depth', desireSi: 'පරිවර්තනය', archetypeSi: 'පර්යේෂක', domainSi: 'රහස්‍ය_ගැඹුරු' },
    9: { desire: 'wisdom', archetype: 'philosopher', domain: 'dharma_spirituality', desireSi: 'ප්‍රඥාව', archetypeSi: 'දාර්ශනික', domainSi: 'ධර්මය_ආධ්‍යාත්මිකත්වය' },
    10: { desire: 'achievement', archetype: 'empire_builder', domain: 'authority_legacy', desireSi: 'ජයග්‍රහණය', archetypeSi: 'අධිරාජ්‍ය නිර්මාතෘ', domainSi: 'අධිකාරය_උරුමය' },
    11: { desire: 'innovation', archetype: 'humanitarian', domain: 'social_reform', desireSi: 'නව්‍යකරණය', archetypeSi: 'මානවහිතවාදී', domainSi: 'සමාජ ප්‍රතිසංස්කරණය' },
    12: { desire: 'liberation', archetype: 'mystic', domain: 'moksha_transcendence', desireSi: 'මෝක්ෂය', archetypeSi: 'අධ්‍යාත්මවාදී', domainSi: 'මෝක්ෂය_අතීන්ද්‍රිය' },
  };

  // ── ARUDHA LAGNA (AL) — External Image ────────────────────────
  // The sign as far from the Lagna lord as the Lagna lord is from the Lagna
  const lagnaRashiId = lagna.rashi.id;
  const lagnaLordKey = lagna.rashi.lord?.toLowerCase();
  const lagnaLordRashiId = planets[lagnaLordKey]?.rashiId;

  let arudhaLagnaId = null;
  if (lagnaLordRashiId) {
    const distance = ((lagnaLordRashiId - lagnaRashiId + 12) % 12);
    arudhaLagnaId = ((lagnaLordRashiId - 1 + distance) % 12) + 1;
    // Exception: if AL falls in the 1st or 7th from Lagna, take 10th from it
    const alFromLagna = ((arudhaLagnaId - lagnaRashiId + 12) % 12) + 1;
    if (alFromLagna === 1 || alFromLagna === 7) {
      arudhaLagnaId = ((arudhaLagnaId + 9 - 1) % 12) + 1;
    }
  }

  // ── UPAPADA LAGNA — Marriage Indicator ────────────────────────
  // Arudha of the 12th house
  const h12RashiId = ((lagnaRashiId + 11 - 1) % 12) + 1;
  const h12Lord = RASHIS[h12RashiId - 1]?.lord;
  const h12LordRashiId = planets[h12Lord?.toLowerCase()]?.rashiId;

  let upapadaId = null;
  if (h12LordRashiId) {
    const distance12 = ((h12LordRashiId - h12RashiId + 12) % 12);
    upapadaId = ((h12LordRashiId - 1 + distance12) % 12) + 1;
    const upFromH12 = ((upapadaId - h12RashiId + 12) % 12) + 1;
    if (upFromH12 === 1 || upFromH12 === 7) {
      upapadaId = ((upapadaId + 9 - 1) % 12) + 1;
    }
  }

  return {
    karakas,
    atmakaraka: karakas['Atmakaraka'],
    darakaraka: karakas['Darakaraka'],
    karakamsha: karakamshaRashi ? {
      rashi: karakamshaRashi.english,
      rashiName: karakamshaRashi.name,
      sinhala: karakamshaRashi.sinhala,
      themes: KARAKAMSHA_THEMES[karakamshaRashiId] || null,
    } : null,
    arudhaLagna: arudhaLagnaId ? {
      rashiId: arudhaLagnaId,
      rashi: RASHIS[arudhaLagnaId - 1]?.english,
      sinhala: RASHIS[arudhaLagnaId - 1]?.sinhala,
    } : null,
    upapadaLagna: upapadaId ? {
      rashiId: upapadaId,
      rashi: RASHIS[upapadaId - 1]?.english,
      sinhala: RASHIS[upapadaId - 1]?.sinhala,
    } : null,
  };
}


// ═══════════════════════════════════════════════════════════════════════════
//  TIER 2-A: FULL SHADBALA (Six-fold Planetary Strength)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate proper Shadbala with all 6 components
 * Returns strength in Rupas (traditional unit) and percentage
 */
function calculateShadbala(date, lat, lng, opts = {}) {
  const planets = getAdvancedPlanets(date, lat, lng, opts);
  const lagna = getLagna(date, lat, lng);
  const { houses } = buildHouseChart(date, lat, lng);

  const EXALT_DEGREES = { Sun: 10, Moon: 33, Mars: 298, Mercury: 165, Jupiter: 95, Venus: 357, Saturn: 200 };
  const DEBIL_DEGREES = { Sun: 190, Moon: 213, Mars: 118, Mercury: 345, Jupiter: 275, Venus: 177, Saturn: 20 };

  // Moolatrikona signs
  const MOOLATRIKONA = { Sun: 5, Moon: 2, Mars: 1, Mercury: 6, Jupiter: 9, Venus: 7, Saturn: 11 };
  const OWN_SIGNS = { Sun: [5], Moon: [4], Mars: [1, 8], Mercury: [3, 6], Jupiter: [9, 12], Venus: [2, 7], Saturn: [10, 11] };

  // Friend/Enemy table (simplified Panchadha Maitri)
  const FRIENDS = {
    Sun: ['Moon', 'Mars', 'Jupiter'],
    Moon: ['Sun', 'Mercury'],
    Mars: ['Sun', 'Moon', 'Jupiter'],
    Mercury: ['Sun', 'Venus'],
    Jupiter: ['Sun', 'Moon', 'Mars'],
    Venus: ['Mercury', 'Saturn'],
    Saturn: ['Mercury', 'Venus'],
  };
  const ENEMIES = {
    Sun: ['Venus', 'Saturn'],
    Moon: ['Rahu', 'Ketu'],
    Mars: ['Mercury'],
    Mercury: ['Moon'],
    Jupiter: ['Mercury', 'Venus'],
    Venus: ['Sun', 'Moon'],
    Saturn: ['Sun', 'Moon', 'Mars'],
  };

  const getPlanetHouse = (planetName) => {
    const h = houses.find(h => h.planets.some(p => p.name === planetName));
    return h ? h.houseNumber : 0;
  };

  const results = {};
  const planetKeys = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

  // Naisargika Bala (Natural Strength) — fixed values in Rupas
  const NAISARGIKA_BALA = { Sun: 60, Moon: 51.43, Mars: 17.14, Mercury: 25.71, Jupiter: 34.29, Venus: 42.86, Saturn: 8.57 };

  for (const name of planetKeys) {
    const key = name.toLowerCase();
    const p = planets[key];
    if (!p) continue;

    const siderealDeg = p.sidereal;
    const rashiId = p.rashiId;
    const degreeInSign = p.degreeInSign;
    const houseNum = getPlanetHouse(name);

    // ── 1. STHANA BALA (Positional Strength) ────────────────────
    let sthanaBala = 0;

    // a) Uchcha Bala (Exaltation Strength)
    const exaltDeg = EXALT_DEGREES[name];
    if (exaltDeg !== undefined) {
      const distFromExalt = Math.abs(siderealDeg - exaltDeg);
      const normalDist = distFromExalt > 180 ? 360 - distFromExalt : distFromExalt;
      sthanaBala += Math.max(0, (180 - normalDist) / 3); // Max 60 when exalted
    }

    // b) Saptavargaja Bala (Dignity in 7 divisional charts)
    let dignityCount = 0;
    // Own sign in D1
    if (OWN_SIGNS[name]?.includes(rashiId)) dignityCount += 2;
    // Moolatrikona
    if (MOOLATRIKONA[name] === rashiId && degreeInSign < 20) dignityCount += 2;
    // Exalted
    if (exaltDeg !== undefined && Math.abs(siderealDeg - exaltDeg) < 15) dignityCount += 3;
    // Friend's sign
    if (FRIENDS[name]?.some(f => OWN_SIGNS[f]?.includes(rashiId))) dignityCount += 1;
    sthanaBala += dignityCount * 7.5;

    // c) Ojhayugmarashi Bala (Odd/Even sign strength)
    const isOddSign = rashiId % 2 !== 0;
    const isMasculine = ['Sun', 'Mars', 'Jupiter'].includes(name);
    if ((isOddSign && isMasculine) || (!isOddSign && !isMasculine)) sthanaBala += 15;

    // d) Kendradi Bala
    if (isInKendra(houseNum)) sthanaBala += 60;
    else if ([2, 5, 8, 11].includes(houseNum)) sthanaBala += 30;
    else if ([3, 6, 9, 12].includes(houseNum)) sthanaBala += 15;

    // ── 2. DIG BALA (Directional Strength) ──────────────────────
    let digBala = 0;
    // Jupiter/Mercury strongest in East (1st house/Lagna)
    // Sun/Mars strongest in South (10th house)
    // Saturn strongest in West (7th house)
    // Moon/Venus strongest in North (4th house)
    const DIG_STRONG_HOUSE = { Jupiter: 1, Mercury: 1, Sun: 10, Mars: 10, Saturn: 7, Moon: 4, Venus: 4 };
    const strongHouse = DIG_STRONG_HOUSE[name] || 1;
    const distFromStrong = Math.min(
      Math.abs(houseNum - strongHouse),
      12 - Math.abs(houseNum - strongHouse)
    );
    digBala = Math.max(0, (6 - distFromStrong) * 10); // Max 60

    // ── 3. KALA BALA (Temporal Strength) ─────────────────────────
    let kalaBala = 0;
    const birthDate = new Date(date);
    const birthHour = getLocalHour(birthDate, opts);
    const isDaytime = birthHour >= 6 && birthHour < 18;

    // Diurnal planets (Sun, Jupiter, Venus) are stronger during day
    // Nocturnal planets (Moon, Mars, Saturn) are stronger during night
    if (isDaytime && ['Sun', 'Jupiter', 'Venus'].includes(name)) kalaBala += 30;
    if (!isDaytime && ['Moon', 'Mars', 'Saturn'].includes(name)) kalaBala += 30;
    // Mercury is always strong (amphichara — both day and night)
    if (name === 'Mercury') kalaBala += 30;

    // Hora Bala (lord of birth hour)
    // Masa Bala (lord of birth month)
    // Ayana Bala (solstice strength)
    const month = birthDate.getUTCMonth();
    // Northern hemisphere: Uttarayana (Jan-Jun), Dakshinayana (Jul-Dec)
    const isUttarayana = month < 6;
    if (isUttarayana && ['Sun', 'Mars', 'Jupiter'].includes(name)) kalaBala += 15;
    if (!isUttarayana && ['Moon', 'Venus', 'Saturn'].includes(name)) kalaBala += 15;

    // Weekday lord bonus
    const weekday = birthDate.getDay();
    const WEEKDAY_LORDS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    if (WEEKDAY_LORDS[weekday] === name) kalaBala += 15;

    // ── 4. CHESHTA BALA (Motional Strength) ─────────────────────
    let cheshtaBala = 30; // Default moderate
    // Retrograde planets get more Cheshta Bala (they appear brighter)
    if (p.isRetrograde && !['Sun', 'Moon'].includes(name)) cheshtaBala = 45;
    // Sun and Moon don't go retrograde — use different criteria
    if (name === 'Moon') {
      // Fast Moon (Shukla Paksha) = stronger
      const moonSpeed = degreeInSign; // Simplified: bright Moon = stronger
      cheshtaBala = moonSpeed > 15 ? 40 : 25;
    }
    if (name === 'Sun') cheshtaBala = 30; // Sun has constant cheshta

    // ── 5. NAISARGIKA BALA (Natural Strength) ───────────────────
    const naisargikaBala = NAISARGIKA_BALA[name] || 30;

    // ── 6. DRIG BALA (Aspectual Strength) ────────────────────────
    let drigBala = 0;
    // Benefic aspects add, malefic aspects subtract
    for (const otherName of planetKeys) {
      if (otherName === name) continue;
      const otherHouse = getPlanetHouse(otherName);
      if (!otherHouse) continue;

      const dist = ((houseNum - otherHouse + 12) % 12) + 1;
      const isBenefic = ['Jupiter', 'Venus', 'Mercury', 'Moon'].includes(otherName);

      // Check if other planet aspects this planet
      let aspects = false;
      if (dist === 7) aspects = true; // All planets aspect 7th
      if (otherName === 'Mars' && [4, 8].includes(dist)) aspects = true;
      if (otherName === 'Jupiter' && [5, 9].includes(dist)) aspects = true;
      if (otherName === 'Saturn' && [3, 10].includes(dist)) aspects = true;

      if (aspects) {
        drigBala += isBenefic ? 15 : -10;
      }
    }
    drigBala = Math.max(-30, Math.min(60, drigBala));

    // ── TOTAL SHADBALA ──────────────────────────────────────────
    const totalBala = sthanaBala + digBala + kalaBala + cheshtaBala + naisargikaBala + drigBala;
    const maxPossible = 60 + 60 + 60 + 45 + 60 + 60; // ~345
    const percentage = Math.round((totalBala / maxPossible) * 100);

    // Required strength thresholds (BPHS)
    const REQUIRED_STRENGTH = { Sun: 165, Moon: 133, Mars: 96, Mercury: 165, Jupiter: 165, Venus: 133, Saturn: 96 };
    const required = REQUIRED_STRENGTH[name] || 133;
    const isAdequate = totalBala >= required;

    let strengthLabel = 'Medium';
    if (percentage >= 75) strengthLabel = 'Very Strong';
    else if (percentage >= 60) strengthLabel = 'Strong';
    else if (percentage <= 30) strengthLabel = 'Very Weak';
    else if (percentage <= 40) strengthLabel = 'Weak';

    results[key] = {
      name,
      sinhala: p.sinhala,
      totalRupas: Math.round(totalBala * 10) / 10,
      percentage,
      strength: strengthLabel,
      isAdequate,
      components: {
        sthanaBala: Math.round(sthanaBala * 10) / 10,
        digBala: Math.round(digBala * 10) / 10,
        kalaBala: Math.round(kalaBala * 10) / 10,
        cheshtaBala: Math.round(cheshtaBala * 10) / 10,
        naisargikaBala: Math.round(naisargikaBala * 10) / 10,
        drigBala: Math.round(drigBala * 10) / 10,
      },
      house: houseNum,
      rashi: p.rashiEnglish,
      isRetrograde: p.isRetrograde || false,
    };
  }

  return results;
}

/**
 * Calculate Ishta Phala (benefic potential) and Kashta Phala (malefic potential)
 * from Shadbala components. Per BPHS:
 *   Ishta Phala = Uchcha Bala × Cheshta Bala  (geometric mean, in Virupas)
 *   Kashta Phala = complement based on total minus Ishta
 * These indicate how well a planet can deliver its promised results.
 */
function calculateIshtaKashta(date, lat, lng, opts = {}) {
  const shadbala = calculateShadbala(date, lat, lng, opts);
  const planets = getAdvancedPlanets(date, lat, lng, opts);
  const EXALT_DEGREES = { Sun: 10, Moon: 33, Mars: 298, Mercury: 165, Jupiter: 95, Venus: 357, Saturn: 200 };

  const results = {};
  for (const [key, sb] of Object.entries(shadbala)) {
    const name = sb.name;
    const p = planets[key];
    if (!p) continue;

    // Uchcha Bala (0-60 virupas) — from sthanaBala component approximation
    const exaltDeg = EXALT_DEGREES[name];
    let ucchaBala = 30;
    if (exaltDeg !== undefined) {
      const dist = Math.abs(p.sidereal - exaltDeg);
      const normDist = dist > 180 ? 360 - dist : dist;
      ucchaBala = Math.max(0, (180 - normDist) / 3);
    }

    const cheshtaBala = sb.components.cheshtaBala;

    // Ishta Phala = sqrt(Uchcha Bala × Cheshta Bala) per BPHS
    const ishtaPhala = Math.sqrt(Math.max(0, ucchaBala) * Math.max(0, cheshtaBala));
    // Kashta Phala = sqrt((60 - Uchcha) × (60 - Cheshta))
    const kashtaPhala = Math.sqrt(Math.max(0, 60 - ucchaBala) * Math.max(0, 60 - cheshtaBala));

    // Net benefic ratio
    const netBenefic = ishtaPhala - kashtaPhala;

    results[key] = {
      name,
      ishtaPhala: Math.round(ishtaPhala * 100) / 100,
      kashtaPhala: Math.round(kashtaPhala * 100) / 100,
      netBenefic: Math.round(netBenefic * 100) / 100,
      tendency: netBenefic > 10 ? 'Strongly Supportive' : netBenefic > 0 ? 'Mildly Supportive' : netBenefic > -10 ? 'Mildly Challenging' : 'Strongly Challenging',
      shadbalaRupas: sb.totalRupas,
      shadbalaStrength: sb.strength,
    };
  }
  return results;
}

/**
 * Weight Dasha predictions by Shadbala — a Dasha lord with high Shadbala
 * delivers results more reliably and prominently.
 *
 * Returns a multiplier (0.5 - 1.5) for each Dasha lord's prediction weight.
 */
function getShadbalaWeightsForDasha(date, lat, lng, opts = {}) {
  const shadbala = calculateShadbala(date, lat, lng, opts);
  const ishtaKashta = calculateIshtaKashta(date, lat, lng, opts);

  const weights = {};
  const PLANET_NAMES = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  // Rahu/Ketu use their sign dispositor's strength
  const RAHU_KETU_DISPOSITORS = {};

  for (const name of PLANET_NAMES) {
    const key = name.toLowerCase();
    const sb = shadbala[key];
    const ik = ishtaKashta[key];
    if (!sb) continue;

    // Base weight from Shadbala percentage (0-100 → 0.5-1.5 range)
    const sbWeight = 0.5 + (sb.percentage / 100);
    // Ishta/Kashta modifier
    const ikMod = ik ? (ik.netBenefic > 0 ? 1.1 : ik.netBenefic < -10 ? 0.85 : 0.95) : 1;

    weights[name] = Math.round(Math.min(1.5, Math.max(0.5, sbWeight * ikMod)) * 100) / 100;
  }

  // Rahu and Ketu inherit their dispositor's weight
  weights['Rahu'] = weights['Saturn'] || 1.0;
  weights['Ketu'] = weights['Mars'] || 1.0;

  return weights;
}


// ═══════════════════════════════════════════════════════════════════════════
//  TIER 2-B: BHRIGU BINDU, AVASTHA, EXTRA DIVISIONAL CHARTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate Bhrigu Bindu (Destiny Point)
 * (Rahu longitude + Moon longitude) / 2 = the most sensitive point in the chart
 */
function calculateBhriguBindu(date, lat = 6.9271, lng = 79.8612, opts = {}) {
  const options = resolveAdvancedOptions(opts);
  const planets = getAdvancedPlanets(date, lat, lng, options);
  const rahuSidereal = planets.rahu.sidereal;
  const moonSidereal = planets.moon.sidereal;

  // Midpoint
  let bhriguBindu = (rahuSidereal + moonSidereal) / 2;
  // If the arc between them is > 180°, take the other midpoint
  if (Math.abs(rahuSidereal - moonSidereal) > 180) {
    bhriguBindu = (bhriguBindu + 180) % 360;
  }
  bhriguBindu = ((bhriguBindu % 360) + 360) % 360;

  const bbRashi = getRashi(bhriguBindu);
  const bbNakshatra = getNakshatra(bhriguBindu);

  // Check which planets transit this point currently
  const transitPlanets = getAllPlanetPositions(options.asOfDate, lat, lng, options.settings);
  const activations = [];

  for (const [key, tp] of Object.entries(transitPlanets)) {
    if (['rahu', 'ketu'].includes(key)) continue;
    const diff = Math.abs(tp.sidereal - bhriguBindu);
    const normalDiff = diff > 180 ? 360 - diff : diff;
    if (normalDiff <= 5) { // Within 5 degree orb
      activations.push({
        planet: tp.name,
        distance: normalDiff.toFixed(2),
        isExact: normalDiff < 1,
      });
    }
  }

  return {
    degree: bhriguBindu.toFixed(4),
    rashi: bbRashi.english,
    rashiName: bbRashi.name,
    sinhala: bbRashi.sinhala,
    nakshatra: bbNakshatra.name,
    nakshatraSinhala: bbNakshatra.sinhala,
    degreeInSign: (bhriguBindu % 30).toFixed(2),
    currentActivations: activations,
    isCurrentlyActive: activations.length > 0,
  };
}

/**
 * Calculate Planetary Avasthas (States of Being)
 * 5 Balaadi Avasthas based on degree in sign:
 *   Bala (infant: 0-6°), Kumara (adolescent: 6-12°), Yuva (young: 12-18°),
 *   Vriddha (old: 18-24°), Mrita (dead: 24-30°)
 * 
 * Plus Jaagrat/Swapna/Sushupti states
 */
function calculateAvasthas(date, lat = 6.9271, lng = 79.8612, opts = {}) {
  const planets = getAdvancedPlanets(date, lat, lng, opts);
  const results = {};

  const BALAADI = [
    { name: 'Bala', sinhala: 'බාල', range: [0, 6], power: 0.25 },
    { name: 'Kumara', sinhala: 'කුමාර', range: [6, 12], power: 0.50 },
    { name: 'Yuva', sinhala: 'යුව', range: [12, 18], power: 1.0 },
    { name: 'Vriddha', sinhala: 'වෘද්ධ', range: [18, 24], power: 0.50 },
    { name: 'Mrita', sinhala: 'මෘත', range: [24, 30], power: 0.05 },
  ];

  // For odd signs: normal order. For even signs: REVERSE order
  const BALAADI_EVEN = [
    { name: 'Mrita', sinhala: 'මෘත', range: [0, 6], power: 0.05 },
    { name: 'Vriddha', sinhala: 'වෘද්ධ', range: [6, 12], power: 0.50 },
    { name: 'Yuva', sinhala: 'යුව', range: [12, 18], power: 1.0 },
    { name: 'Kumara', sinhala: 'කුමාර', range: [18, 24], power: 0.50 },
    { name: 'Bala', sinhala: 'බාල', range: [24, 30], power: 0.25 },
  ];

  // Jaagrat/Swapna/Sushupti based on placement
  // In own/exalt sign = Jaagrat (Awake), friend sign = Swapna (Dream), enemy sign = Sushupti (Sleep)
  const OWN_SIGNS = { Sun: [5], Moon: [4], Mars: [1, 8], Mercury: [3, 6], Jupiter: [9, 12], Venus: [2, 7], Saturn: [10, 11] };
  const EXALTATIONS = { Sun: 1, Moon: 2, Mars: 10, Mercury: 6, Jupiter: 4, Venus: 12, Saturn: 7 };

  for (const [key, p] of Object.entries(planets)) {
    if (['rahu', 'ketu'].includes(key)) continue;
    const name = p.name;
    const deg = p.degreeInSign;
    const rashiId = p.rashiId;
    const isOddSign = rashiId % 2 !== 0;

    const avasthaList = isOddSign ? BALAADI : BALAADI_EVEN;
    let avastha = avasthaList[2]; // Default Yuva

    for (const a of avasthaList) {
      if (deg >= a.range[0] && deg < a.range[1]) {
        avastha = a;
        break;
      }
    }

    // Consciousness state
    let consciousness = 'Swapna';
    if (OWN_SIGNS[name]?.includes(rashiId) || EXALTATIONS[name] === rashiId) {
      consciousness = 'Jaagrat';
    } else {
      // Simplified: if in debilitation or enemy sign = Sushupti
      const DEBILITATIONS = { Sun: 7, Moon: 8, Mars: 4, Mercury: 12, Jupiter: 10, Venus: 6, Saturn: 1 };
      if (DEBILITATIONS[name] === rashiId) consciousness = 'Sushupti';
    }

    const CONSCIOUSNESS_EFFECTS = {
      'Jaagrat': { sinhala: 'ජාගෘත (අවදි)', power: 1.0 },
      'Swapna': { sinhala: 'ස්වප්න (සිහින)', power: 0.5 },
      'Sushupti': { sinhala: 'සුෂුප්ති (නිදි)', power: 0.25 },
    };

    results[key] = {
      name,
      sinhala: p.sinhala,
      degree: deg.toFixed(2),
      rashi: p.rashiEnglish,
      balaadi: {
        state: avastha.name,
        sinhala: avastha.sinhala,
        powerMultiplier: avastha.power,
      },
      consciousness: {
        state: consciousness,
        ...CONSCIOUSNESS_EFFECTS[consciousness],
      },
      effectivePower: Math.round(avastha.power * CONSCIOUSNESS_EFFECTS[consciousness].power * 100),
    };
  }

  return results;
}

/**
 * Build additional Divisional Charts — D7, D10, D24, D60
 */
function buildExtendedVargas(date, lat, lng, opts = {}) {
  const planets = getAdvancedPlanets(date, lat, lng, opts);
  const lagna = getLagna(date, lat, lng);

  const getVargaPosition = (siderealDeg, division, rules) => {
    const rashiId = Math.floor(siderealDeg / 30) + 1;
    const degree = siderealDeg % 30;

    if (typeof rules === 'function') {
      return rules(rashiId, degree);
    }

    // Generic equal division
    const partSize = 30 / division;
    const part = Math.floor(degree / partSize);
    return ((rashiId + part - 1) % 12) + 1;
  };

  // D7 (Saptamsha) — Children & Progeny
  const d7Rules = (rashiId, degree) => {
    const part = Math.floor(degree / (30 / 7)); // 0-6
    const isOdd = rashiId % 2 !== 0;
    const startSign = isOdd ? rashiId : ((rashiId + 6 - 1) % 12) + 1;
    return ((startSign + part - 1) % 12) + 1;
  };

  // D10 (Dasamsha) — Career & Professional Status
  const d10Rules = (rashiId, degree) => {
    const part = Math.floor(degree / 3); // 0-9
    const isOdd = rashiId % 2 !== 0;
    const startSign = isOdd ? rashiId : ((rashiId + 9 - 1) % 12) + 1;
    return ((startSign + part - 1) % 12) + 1;
  };

  // D24 (Chaturvimshamsha) — Education & Learning
  const d24Rules = (rashiId, degree) => {
    const part = Math.floor(degree / (30 / 24)); // 0-23
    const isOdd = rashiId % 2 !== 0;
    const startSign = isOdd ? 5 : 4; // Leo for odd, Cancer for even
    return ((startSign + part - 1) % 12) + 1;
  };

  // D60 (Shashtiamsha) — Past Life Karma (Most Precise)
  const d60Rules = (rashiId, degree) => {
    const part = Math.floor(degree / 0.5); // 0-59
    return ((rashiId + part - 1) % 12) + 1;
  };

  // D2 (Hora) — Wealth
  const d2Rules = (rashiId, degree) => {
    const isOdd = rashiId % 2 !== 0;
    const firstHalf = degree < 15;
    if (isOdd) return firstHalf ? 5 : 4; // Leo / Cancer
    return firstHalf ? 4 : 5;            // Cancer / Leo
  };

  // D3 (Drekkana) — Siblings, courage
  const d3Rules = (rashiId, degree) => {
    const part = Math.floor(degree / 10); // 0,1,2
    return ((rashiId - 1 + part * 4) % 12) + 1;
  };

  // D4 (Chaturthamsha) — Property, fortune
  const d4Rules = (rashiId, degree) => {
    const part = Math.floor(degree / 7.5); // 0-3
    return ((rashiId - 1 + part * 3) % 12) + 1;
  };

  // D12 (Dwadasamsha) — Parents
  const d12Rules = (rashiId, degree) => {
    const part = Math.floor(degree / 2.5); // 0-11
    return ((rashiId - 1 + part) % 12) + 1;
  };

  // D16 (Shodasamsha) — Vehicles, happiness
  const d16Rules = (rashiId, degree) => {
    const part = Math.floor(degree / (30 / 16)); // 0-15
    const isMovable = [1, 4, 7, 10].includes(rashiId);
    const isFixed = [2, 5, 8, 11].includes(rashiId);
    const startSign = isMovable ? 1 : isFixed ? 5 : 9;
    return ((startSign - 1 + part) % 12) + 1;
  };

  // D20 (Vimsamsha) — Spiritual life
  const d20Rules = (rashiId, degree) => {
    const part = Math.floor(degree / 1.5); // 0-19
    const isMovable = [1, 4, 7, 10].includes(rashiId);
    const isFixed = [2, 5, 8, 11].includes(rashiId);
    const startSign = isMovable ? 1 : isFixed ? 9 : 5;
    return ((startSign - 1 + part) % 12) + 1;
  };

  // D27 (Saptavimsamsha) — Strength
  const d27Rules = (rashiId, degree) => {
    const part = Math.floor(degree / (30 / 27)); // 0-26
    const element = (rashiId - 1) % 4; // 0=fire, 1=earth, 2=air, 3=water
    const startSign = element === 0 ? 1 : element === 1 ? 4 : element === 2 ? 7 : 10;
    return ((startSign - 1 + part) % 12) + 1;
  };

  // D40 (Khavedamsha) — Auspicious/inauspicious effects
  const d40Rules = (rashiId, degree) => {
    const part = Math.floor(degree / 0.75); // 0-39
    const isOdd = rashiId % 2 !== 0;
    const startSign = isOdd ? 1 : 7;
    return ((startSign - 1 + part) % 12) + 1;
  };

  // D45 (Akshavedamsha) — General well-being
  const d45Rules = (rashiId, degree) => {
    const part = Math.floor(degree / (30 / 45)); // 0-44
    const isMovable = [1, 4, 7, 10].includes(rashiId);
    const isFixed = [2, 5, 8, 11].includes(rashiId);
    const startSign = isMovable ? 1 : isFixed ? 5 : 9;
    return ((startSign - 1 + part) % 12) + 1;
  };

  const charts = {};
  const divisions = [
    { key: 'D2',  name: 'Hora',              sinhala: 'හෝරා',          governs: 'Wealth, financial prosperity', rules: d2Rules },
    { key: 'D3',  name: 'Drekkana',          sinhala: 'ද්‍රේක්කාණ',     governs: 'Siblings, courage, initiative', rules: d3Rules },
    { key: 'D4',  name: 'Chaturthamsha',     sinhala: 'චතුර්තාංශ',     governs: 'Property, fortune, fixed assets', rules: d4Rules },
    { key: 'D7',  name: 'Saptamsha',         sinhala: 'සප්තාංශ',       governs: 'Children, progeny, creative output', rules: d7Rules },
    { key: 'D10', name: 'Dasamsha',          sinhala: 'දශාංශ',         governs: 'Career, profession, public status', rules: d10Rules },
    { key: 'D12', name: 'Dwadasamsha',       sinhala: 'ද්වාදශාංශ',     governs: 'Parents, lineage, ancestry', rules: d12Rules },
    { key: 'D16', name: 'Shodasamsha',       sinhala: 'ෂෝඩශාංශ',      governs: 'Vehicles, conveyances, happiness', rules: d16Rules },
    { key: 'D20', name: 'Vimsamsha',         sinhala: 'විංශාංශ',       governs: 'Inner growth, personal development, mindfulness', rules: d20Rules },
    { key: 'D24', name: 'Chaturvimshamsha',  sinhala: 'චතුර්විංශාංශ',  governs: 'Education, academic success', rules: d24Rules },
    { key: 'D27', name: 'Saptavimsamsha',    sinhala: 'සප්තවිංශාංශ',   governs: 'Strength, stamina, physical ability', rules: d27Rules },
    { key: 'D40', name: 'Khavedamsha',       sinhala: 'ඛවෙනවාදාංශ',      governs: 'Auspicious and inauspicious effects', rules: d40Rules },
    { key: 'D45', name: 'Akshavedamsha',     sinhala: 'අක්ෂවෙනවාදාංශ',    governs: 'General well-being, paternal legacy', rules: d45Rules },
    { key: 'D60', name: 'Shashtiamsha',      sinhala: 'ෂෂ්ඨිඅංශ',     governs: 'Deepest personality patterns, inherited tendencies', rules: d60Rules },
  ];

  for (const div of divisions) {
    const positions = {};
    for (const [key, p] of Object.entries(planets)) {
      const vargaRashiId = div.rules(p.rashiId, p.degreeInSign);
      positions[key] = {
        name: p.name,
        vargaRashiId,
        vargaRashi: RASHIS[vargaRashiId - 1]?.english,
        vargaRashiSinhala: RASHIS[vargaRashiId - 1]?.sinhala,
      };
    }

    // Lagna in this varga
    const lagnaVargaId = div.rules(lagna.rashi.id, lagna.sidereal % 30);

    charts[div.key] = {
      name: div.name,
      sinhala: div.sinhala,
      governs: div.governs,
      lagnaRashiId: lagnaVargaId,
      lagnaRashi: RASHIS[lagnaVargaId - 1]?.english,
      positions,
    };
  }

  // Varga Visesha Bala — how well a planet performs across divisional charts
  // A planet in its own sign, exaltation, or moolatrikona in a varga gets points.
  const SIGN_LORDS_MAP = {
    1: 'Mars', 2: 'Venus', 3: 'Mercury', 4: 'Moon',
    5: 'Sun', 6: 'Mercury', 7: 'Venus', 8: 'Mars',
    9: 'Jupiter', 10: 'Saturn', 11: 'Saturn', 12: 'Jupiter',
  };
  const EXALTATION_SIGNS = { Sun: 1, Moon: 2, Mars: 10, Mercury: 6, Jupiter: 4, Venus: 12, Saturn: 7 };

  const vargaVisheshaBala = {};
  const PLANET_KEYS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];
  for (const pKey of PLANET_KEYS) {
    const pName = planets[pKey]?.name;
    let score = 0;
    let details = [];
    for (const [dKey, chart] of Object.entries(charts)) {
      const vRashi = chart.positions[pKey]?.vargaRashiId;
      if (!vRashi) continue;
      const signLord = SIGN_LORDS_MAP[vRashi];
      if (signLord === pName) {
        score += 1;
        details.push({ varga: dKey, dignity: 'own_sign' });
      } else if (EXALTATION_SIGNS[pName] === vRashi) {
        score += 1.5;
        details.push({ varga: dKey, dignity: 'exalted' });
      }
    }
    vargaVisheshaBala[pKey] = {
      planet: pName,
      totalScore: Math.round(score * 10) / 10,
      maxPossible: divisions.length * 1.5,
      percentage: Math.round(score / (divisions.length * 1.5) * 100),
      details,
    };
  }

  charts._vargaVisheshaBala = vargaVisheshaBala;

  return charts;
}


// ═══════════════════════════════════════════════════════════════════════════
//  TIER 2-C: PRATYANTARDASHA (Sub-Sub Periods)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate Pratyantardasha (sub-sub periods within each Antardasha)
 * Gives day-level timing accuracy
 */
function calculatePratyantardasha(moonLongitude, birthDate, opts = {}) {
  const DASA_LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
  const DASA_YEARS = { 'Ketu': 7, 'Venus': 20, 'Sun': 6, 'Moon': 10, 'Mars': 7, 'Rahu': 18, 'Jupiter': 16, 'Saturn': 19, 'Mercury': 17 };
  const TOTAL_YEARS = 120;

  // Get the detailed dashas first
  const dashas = calculateVimshottariDetailed(moonLongitude, birthDate);

  // For the CURRENT running dasha/antardasha, calculate pratyantardashas
  const now = resolveAdvancedOptions(opts).asOfDate;
  const currentDasha = dashas.find(d => new Date(d.start) <= now && new Date(d.endDate) >= now);
  if (!currentDasha) return { dashas, pratyantardashas: null };

  const currentAD = currentDasha.antardashas?.find(ad => new Date(ad.start) <= now && new Date(ad.endDate) >= now);
  if (!currentAD) return { dashas, pratyantardashas: null, currentDasha: currentDasha.lord };

  // Calculate pratyantardashas within the current antardasha
  const addDays = (date, days) => {
    const d = new Date(date);
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    return d;
  };

  const mdYears = DASA_YEARS[currentDasha.lord];
  const adYears = DASA_YEARS[currentAD.lord];
  const adDuration = currentAD.years * 365.25; // in days
  const adStartDate = new Date(currentAD.start);

  const mdIdx = DASA_LORDS.indexOf(currentDasha.lord);
  const adIdx = DASA_LORDS.indexOf(currentAD.lord);

  const pratyantardashas = [];
  let pdDate = new Date(adStartDate);

  for (let i = 0; i < 9; i++) {
    const pdIdx = (adIdx + i) % 9;
    const pdLord = DASA_LORDS[pdIdx];
    const pdYears = (mdYears * adYears * DASA_YEARS[pdLord]) / (TOTAL_YEARS * TOTAL_YEARS);
    const pdDays = pdYears * 365.25;
    // Adjust for first dasha balance
    const adjustedDays = pdDays * (currentAD.years / DASA_YEARS[currentAD.lord]);

    const pdStart = new Date(pdDate);
    const pdEnd = addDays(pdDate, adjustedDays);

    const isCurrent = pdStart <= now && pdEnd >= now;

    pratyantardashas.push({
      lord: pdLord,
      start: pdStart.toISOString().split('T')[0],
      endDate: pdEnd.toISOString().split('T')[0],
      days: Math.round(adjustedDays),
      isCurrent,
    });

    pdDate = pdEnd;
  }

  return {
    currentMahadasha: currentDasha.lord,
    currentAntardasha: currentAD.lord,
    pratyantardashas,
    currentPratyantardasha: pratyantardashas.find(p => p.isCurrent) || null,
  };
}


// ═══════════════════════════════════════════════════════════════════════════
//  TIER 3-A: NADI AMSHA (150 Sub-Divisions Per Sign)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate Nadi Amsha for each planet
 * Each sign divided into 150 equal parts (0.2° each)
 * Chara/Sthira/Dvisvabhava signs have different naming sequences
 */
function calculateNadiAmsha(date, lat = 6.9271, lng = 79.8612, opts = {}) {
  const planets = getAdvancedPlanets(date, lat, lng, opts);

  // Sign types
  const CHARA_SIGNS = [1, 4, 7, 10];   // Moveable
  const STHIRA_SIGNS = [2, 5, 8, 11];  // Fixed
  const DVISVABHAVA_SIGNS = [3, 6, 9, 12]; // Dual

  // 150 Nadi Amsha names (traditional names from Nadi texts)
  // Using first 10 representative names for each section of 15
  const NADI_SECTIONS = [
    'Vasudha', 'Vaishnavi', 'Brahmi', 'Kalika', 'Shankari',
    'Saumya', 'Jaya', 'Lakshmi', 'Gauri', 'Parvati',
    'Padma', 'Chamunda', 'Tulasi', 'Rudra', 'Agni',
  ];

  const results = {};

  for (const [key, p] of Object.entries(planets)) {
    const rashiId = p.rashiId;
    const degree = p.degreeInSign;

    // Calculate Nadi number (1-150)
    const nadiNum = Math.floor(degree / 0.2) + 1;
    const clampedNadi = Math.min(150, Math.max(1, nadiNum));

    // Determine sign type
    let signType = 'Chara';
    let effectiveNadi = clampedNadi;

    if (STHIRA_SIGNS.includes(rashiId)) {
      signType = 'Sthira';
      effectiveNadi = 151 - clampedNadi; // Reversed in Sthira
    } else if (DVISVABHAVA_SIGNS.includes(rashiId)) {
      signType = 'Dvisvabhava';
      // Start from middle (76th) for dual signs
      effectiveNadi = ((clampedNadi + 74) % 150) + 1;
    }

    // Get Nadi name from the section
    const sectionIndex = Math.floor((effectiveNadi - 1) / 10) % NADI_SECTIONS.length;
    const nadiName = NADI_SECTIONS[sectionIndex];

    // Determine devatā (ruling deity) based on Nadi group
    const DEVATAS = ['Brahma', 'Vishnu', 'Shiva'];
    const devata = DEVATAS[(effectiveNadi - 1) % 3];

    // Determine Nadi guna (quality)
    const GUNAS = ['Sattva', 'Rajas', 'Tamas'];
    const guna = GUNAS[Math.floor((effectiveNadi - 1) / 50)];

    results[key] = {
      name: p.name,
      sinhala: p.sinhala,
      nadiNumber: clampedNadi,
      effectiveNadi: effectiveNadi,
      nadiName,
      signType,
      devata,
      guna,
      exactDegree: degree.toFixed(4),
      rashi: p.rashiEnglish,
      microPosition: `${p.rashiEnglish} ${degree.toFixed(2)}° — Nadi #${clampedNadi} (${nadiName})`,
    };
  }

  return results;
}


// ═══════════════════════════════════════════════════════════════════════════
//  TIER 3-B: KP (KRISHNAMURTI PADDHATI) SUB-LORD SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate KP Sub-Lords for each planet
 * Each Nakshatra is divided into 9 sub-divisions proportional to Vimshottari Dasha
 * Sign Lord → Star Lord → Sub Lord chain gives precise prediction
 */
function calculateKPSubLords(date, lat = 6.9271, lng = 79.8612, opts = {}) {
  const planets = getAdvancedPlanets(date, lat, lng, opts);

  const DASA_LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
  const DASA_YEARS = [7, 20, 6, 10, 7, 18, 16, 19, 17]; // Total = 120
  const TOTAL = 120;

  const results = {};

  for (const [key, p] of Object.entries(planets)) {
    const siderealDeg = p.sidereal;

    // Sign Lord
    const signLord = RASHIS[p.rashiId - 1]?.lord;

    // Star (Nakshatra) Lord
    const nakshatraIndex = Math.floor(siderealDeg / (360 / 27));
    const starLord = NAKSHATRAS[nakshatraIndex]?.lord;
    const nakshatraName = NAKSHATRAS[nakshatraIndex]?.name;

    // Sub-Lord calculation
    const degreeInNakshatra = siderealDeg % (360 / 27);
    const nakshatraSpan = 360 / 27; // 13.333...

    // Find which lord owns the sub based on proportional Dasha periods
    const starLordIndex = DASA_LORDS.indexOf(starLord);
    let accumulated = 0;
    let subLord = starLord;
    let subSubLord = starLord;

    for (let i = 0; i < 9; i++) {
      const idx = (starLordIndex + i) % 9;
      const lordName = DASA_LORDS[idx];
      const proportion = DASA_YEARS[idx] / TOTAL;
      const subSpan = nakshatraSpan * proportion;

      if (accumulated + subSpan > degreeInNakshatra) {
        subLord = lordName;

        // Sub-sub lord within this sub
        const degInSub = degreeInNakshatra - accumulated;
        let subAccum = 0;
        for (let j = 0; j < 9; j++) {
          const subIdx = (idx + j) % 9;
          const subProportion = DASA_YEARS[subIdx] / TOTAL;
          const subSubSpan = subSpan * subProportion;
          if (subAccum + subSubSpan > degInSub) {
            subSubLord = DASA_LORDS[subIdx];
            break;
          }
          subAccum += subSubSpan;
        }
        break;
      }
      accumulated += subSpan;
    }

    results[key] = {
      name: p.name,
      sinhala: p.sinhala,
      degree: siderealDeg.toFixed(4),
      rashi: p.rashiEnglish,
      nakshatra: nakshatraName,
      signLord,
      starLord,
      subLord,
      subSubLord,
      chain: `${signLord} → ${starLord} → ${subLord} → ${subSubLord}`,
    };
  }

  return results;
}


// ═══════════════════════════════════════════════════════════════════════════
//  TIER 3-C: PAST LIFE ANALYSIS (D60 + Ketu + 5th House + 12th House)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Comprehensive Past Life Analysis
 * Combines multiple Vedic indicators to reveal past-life karma
 */
function analyzePastLife(date, lat, lng, opts = {}) {
  const { houses, planets } = buildHouseChart(date, lat, lng);
  const extendedVargas = buildExtendedVargas(date, lat, lng, opts);
  const lagna = getLagna(date, lat, lng);

  const getPlanetHouse = (planetName) => {
    const h = houses.find(h => h.planets.some(p => p.name === planetName));
    return h ? h.houseNumber : null;
  };

  const getHouseLord = (houseNum) => {
    const h = houses[houseNum - 1];
    return RASHIS[(h?.rashiId || 1) - 1]?.lord;
  };

  // ── 1. KETU — Past Life Planet ────────────────────────────────
  const ketuHouse = getPlanetHouse('Ketu');
  const ketuRashi = planets.ketu?.rashiEnglish;

  // Technical classification of Ketu house themes (AI interprets into narrative)
  const KETU_HOUSE_THEMES = {
    1: { domain: 'self-identity', archetype: 'leader/warrior/pioneer', axis: 'independence', domainSi: 'ස්වයං අනන්‍යතාව', archetypeSi: 'නායක/යෝධ/පුරෝගාමී' },
    2: { domain: 'wealth/speech/family', archetype: 'merchant/trader/banker', axis: 'resources', domainSi: 'ධනය/වචනය/පවුල', archetypeSi: 'වෙළෙන්දා/බැංකුකරු' },
    3: { domain: 'communication/siblings', archetype: 'writer/messenger/soldier', axis: 'courage', domainSi: 'සන්නිවෙනවාදනය/සහෝදර', archetypeSi: 'ලේඛක/පණිවිඩකරු/සෙබළා' },
    4: { domain: 'home/mother/land', archetype: 'landowner/farmer/elder', axis: 'roots', domainSi: 'නිවස/මව/ඉඩම්', archetypeSi: 'ඉඩම් හිමි/ගොවියා/වැඩිහිටියා' },
    5: { domain: 'creativity/education/children', archetype: 'scholar/priest/performer', axis: 'expression', domainSi: 'නිර්මාණශීලිත්වය/අධ්‍යාපනය/දරුවන්', archetypeSi: 'ශිෂ්‍ය/පූජක/රංගන ශිල්පියා' },
    6: { domain: 'service/health/enemies', archetype: 'healer/servant/soldier', axis: 'service', domainSi: 'සේවය/සෞඛ්‍ය/සතුරන්', archetypeSi: 'වෛද්‍ය/සේවක/යෝධ' },
    7: { domain: 'partnerships/marriage', archetype: 'partner/diplomat/mediator', axis: 'relationships', domainSi: 'හවුල්කාරිත්වය/විවාහය', archetypeSi: 'හවුල්කරු/රාජ්‍ය තාන්ත්‍රික' },
    8: { domain: 'occult/transformation/death', archetype: 'mystic/researcher/alchemist', axis: 'hidden-knowledge', domainSi: 'රහස්‍ය/පරිවර්තනය/මරණය', archetypeSi: 'අධ්‍යාත්මවාදී/පර්යේෂක' },
    9: { domain: 'dharma/higher-learning/travel', archetype: 'teacher/philosopher/pilgrim', axis: 'wisdom', domainSi: 'ධර්මය/උසස් අධ්‍යාපනය/සංචාරය', archetypeSi: 'ගුරු/දාර්ශනික/වන්දනා සංචාරක' },
    10: { domain: 'authority/career/public-life', archetype: 'king/administrator/leader', axis: 'power', domainSi: 'බලය/වෘත්තිය/මහජන ජීවිතය', archetypeSi: 'රජ/පරිපාලක/නායක' },
    11: { domain: 'community/aspirations/gains', archetype: 'community-leader/networker', axis: 'collective', domainSi: 'ප්‍රජාව/අභිලාෂයන්/ලාභ', archetypeSi: 'ප්‍රජා නායක/ජාලකරු' },
    12: { domain: 'spirituality/isolation/foreign', archetype: 'monk/hermit/seeker', axis: 'liberation', domainSi: 'ආධ්‍යාත්මිකත්වය/තනිකම/විදේශ', archetypeSi: 'සන්නාසී/තාපස/සොයන්නා' },
  };

  // ── 2. 5th HOUSE — Purva Punya (Past-Life Merit) ─────────────
  const lord5 = getHouseLord(5);
  const lord5House = lord5 ? getPlanetHouse(lord5) : null;
  const planetsIn5 = houses[4]?.planets?.map(p => p.name).filter(n => n !== 'Lagna') || [];
  const beneficsIn5 = planetsIn5.filter(p => ['Jupiter', 'Venus', 'Mercury', 'Moon'].includes(p));
  const maleficsIn5 = planetsIn5.filter(p => ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'].includes(p));

  let pastLifeMerit = 'mixed';
  if (beneficsIn5.length > 0 && maleficsIn5.length === 0) pastLifeMerit = 'highly_meritorious';
  else if (maleficsIn5.length > 0 && beneficsIn5.length === 0) pastLifeMerit = 'karmic_debts';
  else if (beneficsIn5.length > 0 && maleficsIn5.length > 0) pastLifeMerit = 'mixed';

  // ── 3. 12th HOUSE — Moksha & Past-Life Endings ────────────────
  const lord12 = getHouseLord(12);
  const lord12House = lord12 ? getPlanetHouse(lord12) : null;
  const planetsIn12 = houses[11]?.planets?.map(p => p.name).filter(n => n !== 'Lagna') || [];

  // ── 4. D60 (Shashtiamsha) — Most Precise Past Life Indicator ──
  const d60Data = extendedVargas.D60;

  // ── 5. RAHU — Current Life's Karmic Direction ─────────────────
  const rahuHouse = getPlanetHouse('Rahu');
  const rahuRashi = planets.rahu?.rashiEnglish;

  // Technical classification of Rahu house themes (AI interprets into narrative)
  const RAHU_HOUSE_THEMES = {
    1: { domain: 'self-identity', growth: 'independence/individuality', challenge: 'relationship-dependency', growthSi: 'ස්වාධීනත්වය/තනි පුද්ගල බව' },
    2: { domain: 'wealth/speech', growth: 'own-resources/voice', challenge: 'family-dependency', growthSi: 'තමන්ගේ සම්පත්/කටහඬ' },
    3: { domain: 'courage/communication', growth: 'initiative/expression', challenge: 'passivity', growthSi: 'මුලපිරීම/ප්‍රකාශනය' },
    4: { domain: 'home/emotions', growth: 'inner-security/stability', challenge: 'external-validation', growthSi: 'අභ්‍යන්තර ආරක්ෂාව/ස්ථාවරත්වය' },
    5: { domain: 'creativity/children', growth: 'self-expression/romance', challenge: 'community-conformity', growthSi: 'ස්වයං ප්‍රකාශනය/ප්‍රේමය' },
    6: { domain: 'service/problem-solving', growth: 'practical-skills/health', challenge: 'spiritual-escapism', growthSi: 'ප්‍රායෝගික කුසලතා/සෞඛ්‍ය' },
    7: { domain: 'partnerships/marriage', growth: 'compromise/relationships', challenge: 'isolation', growthSi: 'සම්මුතිය/සබඳතා' },
    8: { domain: 'transformation/mysteries', growth: 'shared-resources/depth', challenge: 'material-attachment', growthSi: 'හවුල් සම්පත්/ගැඹුරු' },
    9: { domain: 'higher-knowledge/travel', growth: 'philosophy/wisdom', challenge: 'narrow-mindedness', growthSi: 'දර්ශනය/ප්‍රඥාව' },
    10: { domain: 'career/public-status', growth: 'achievement/legacy', challenge: 'domestic-comfort', growthSi: 'ජයග්‍රහණය/උරුමය' },
    11: { domain: 'community/aspirations', growth: 'collective-service/networking', challenge: 'self-centeredness', growthSi: 'සාමූහික සේවය/ජාලකරණය' },
    12: { domain: 'spirituality/liberation', growth: 'transcendence/surrender', challenge: 'material-attachment', growthSi: 'අතීන්ද්‍රිය/සමර්පණය' },
  };

  return {
    pastLife: {
      ketuHouse,
      ketuRashi,
      ketuThemes: KETU_HOUSE_THEMES[ketuHouse] || null,
    },

    pastLifeMerit: {
      fifthHousePlanets: planetsIn5,
      benefics: beneficsIn5,
      malefics: maleficsIn5,
      assessment: pastLifeMerit,
      lord5: { name: lord5, house: lord5House },
    },

    currentLifeDirection: {
      rahuHouse,
      rahuRashi,
      rahuThemes: RAHU_HOUSE_THEMES[rahuHouse] || null,
    },

    pastLifeEndings: {
      twelfthHousePlanets: planetsIn12,
      lord12: { name: lord12, house: lord12House },
    },

    d60Analysis: d60Data ? {
      lagnaRashi: d60Data.lagnaRashi,
    } : null,

    karmaBalance: {
      ketuHouse,
      rahuHouse,
      ketuDomain: KETU_HOUSE_THEMES[ketuHouse]?.domain || null,
      rahuGrowth: RAHU_HOUSE_THEMES[rahuHouse]?.growth || null,
    },
  };
}


// ═══════════════════════════════════════════════════════════════════════════
//  TIER 3-D: SARVATOBHADRA CHAKRA (Universal Auspiciousness Grid)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate Sarvatobhadra Chakra activations
 * Shows which Nakshatras, Tithis, and Varas are activated by current transits
 */
function calculateSarvatobhadraActivations(date, lat, lng, opts = {}) {
  const options = resolveAdvancedOptions(opts);
  const planets = getAdvancedPlanets(date, lat, lng, options);
  const transitPlanets = getAllPlanetPositions(options.asOfDate, lat, lng, options.settings);

  // Map each transit planet to its Nakshatra
  const activatedNakshatras = {};
  for (const [key, tp] of Object.entries(transitPlanets)) {
    const nakIdx = Math.floor(tp.sidereal / (360 / 27));
    const nak = NAKSHATRAS[nakIdx];
    if (!activatedNakshatras[nak?.name]) {
      activatedNakshatras[nak?.name] = [];
    }
    activatedNakshatras[nak?.name].push(tp.name);
  }

  // Check Vedha (obstruction) between natal and transit nakshatras
  // Vedha pairs (traditional):
  const VEDHA_PAIRS = {
    'Ashwini': 'Jyeshtha', 'Bharani': 'Anuradha', 'Krittika': 'Vishakha',
    'Rohini': 'Swati', 'Mrigashira': 'Chitra', 'Ardra': 'Hasta',
    'Punarvasu': 'Uttara Phalguni', 'Pushya': 'Purva Phalguni', 'Ashlesha': 'Magha',
    'Magha': 'Ashlesha', 'Purva Phalguni': 'Pushya', 'Uttara Phalguni': 'Punarvasu',
    'Hasta': 'Ardra', 'Chitra': 'Mrigashira', 'Swati': 'Rohini',
    'Vishakha': 'Krittika', 'Anuradha': 'Bharani', 'Jyeshtha': 'Ashwini',
    'Mula': 'Revati', 'Purva Ashadha': 'Uttara Bhadrapada', 'Uttara Ashadha': 'Purva Bhadrapada',
    'Shravana': 'Shatabhisha', 'Dhanishtha': 'Shatabhisha',
    'Shatabhisha': 'Shravana', 'Purva Bhadrapada': 'Uttara Ashadha',
    'Uttara Bhadrapada': 'Purva Ashadha', 'Revati': 'Mula',
  };

  // Check natal Moon nakshatra vedha
  const natalMoonNak = Math.floor(planets.moon.sidereal / (360 / 27));
  const natalMoonNakName = NAKSHATRAS[natalMoonNak]?.name;
  const vedhaNak = VEDHA_PAIRS[natalMoonNakName];
  const vedhaPlanets = vedhaNak ? (activatedNakshatras[vedhaNak] || []) : [];

  return {
    natalMoonNakshatra: natalMoonNakName,
    activatedNakshatras,
    vedha: {
      pairNakshatra: vedhaNak,
      activatingPlanets: vedhaPlanets,
      isActive: vedhaPlanets.length > 0,
    },
  };
}


// ═══════════════════════════════════════════════════════════════════════════
//  MASTER FUNCTION: Run ALL Advanced Calculations
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate the complete advanced analysis for a birth chart
 * This is the most comprehensive Vedic analysis possible
 */
function generateAdvancedAnalysis(birthDate, lat = 6.9271, lng = 79.8612, opts = {}) {
  const date = new Date(birthDate);
  const options = resolveAdvancedOptions(opts);

  console.log('[Advanced Engine] Starting comprehensive Tier 1-2-3 analysis...');
  const startTime = Date.now();

  // TIER 1: Core
  const doshas = detectDoshas(date, lat, lng, options);
  const advancedYogas = detectAdvancedYogas(date, lat, lng);
  const jaiminiKarakas = calculateJaiminiKarakas(date, lat, lng, options);

  // TIER 2: Precision
  const shadbala = calculateShadbala(date, lat, lng, options);
  const bhriguBindu = calculateBhriguBindu(date, lat, lng, options);
  const avasthas = calculateAvasthas(date, lat, lng, options);
  const extendedVargas = buildExtendedVargas(date, lat, lng, options);
  const moonSidereal = toSidereal(getMoonLongitude(date), date);
  const pratyantardasha = calculatePratyantardasha(moonSidereal, date, options);

  // TIER 3: Expert
  const nadiAmsha = calculateNadiAmsha(date, lat, lng, options);
  const kpSubLords = calculateKPSubLords(date, lat, lng, options);
  const pastLife = analyzePastLife(date, lat, lng, options);
  const sarvatobhadra = calculateSarvatobhadraActivations(date, lat, lng, options);

  const elapsed = Date.now() - startTime;
  console.log(`[Advanced Engine] Complete analysis done in ${elapsed}ms — ${doshas.length} doshas, ${advancedYogas.length} yogas detected`);

  return {
    generatedAt: new Date().toISOString(),
    engineVersion: 'Grahachara-Advanced-v3.0',
    computeTimeMs: elapsed,
    calculationSettings: options.settings,
    asOfDate: options.asOfDate.toISOString(),
    timeContext: options.timeContext,

    tier1: {
      doshas: {
        found: doshas.length,
        items: doshas,
        hasMangalaDosha: doshas.some(d => d.name.includes('Mangala')),
        hasKaalSarp: doshas.some(d => d.name.includes('Kaal Sarp')),
        hasSadeSati: doshas.some(d => d.name.includes('Sade Sati')),
      },
      advancedYogas: {
        found: advancedYogas.length,
        items: advancedYogas,
        rajaYogas: advancedYogas.filter(y => y.category === 'Raja Yoga'),
        dhanaYogas: advancedYogas.filter(y => y.category === 'Dhana Yoga'),
        doshaYogas: advancedYogas.filter(y => y.category?.includes('Dosha') || y.category?.includes('Challenge')),
      },
      jaimini: jaiminiKarakas,
    },

    tier2: {
      shadbala,
      bhriguBindu,
      avasthas,
      extendedVargas,
      pratyantardasha,
    },

    tier3: {
      nadiAmsha,
      kpSubLords,
      pastLife,
      sarvatobhadra,
    },
  };
}


// ═══════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Tier 1
  detectDoshas,
  detectAdvancedYogas,
  calculateJaiminiKarakas,

  // Tier 2
  calculateShadbala,
  calculateIshtaKashta,
  getShadbalaWeightsForDasha,
  calculateBhriguBindu,
  calculateAvasthas,
  buildExtendedVargas,
  calculatePratyantardasha,

  // Tier 3
  calculateNadiAmsha,
  calculateKPSubLords,
  analyzePastLife,
  calculateSarvatobhadraActivations,

  // Master
  generateAdvancedAnalysis,
};
