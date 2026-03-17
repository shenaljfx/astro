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
 * Author: Nakath AI Engine
 */

const { NAKSHATRAS, RASHIS, PLANETS, getAllPlanetPositions, getLagna, buildHouseChart, buildNavamshaChart, getRashi, getNakshatra, toSidereal, getMoonLongitude, getSunLongitude, getAyanamsha, dateToJD, calculateVimshottariDetailed } = require('./astrology');

// ── Shared Helper Functions ─────────────────────────────────────
const isInKendra = (h) => [1, 4, 7, 10].includes(h);
const isInTrikona = (h) => [1, 5, 9].includes(h);
const isInDusthana = (h) => [6, 8, 12].includes(h);

// ═══════════════════════════════════════════════════════════════════════════
//  TIER 1-A: COMPREHENSIVE DOSHA DETECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect ALL major doshas in a birth chart
 * Returns: Mangala Dosha, Kaal Sarp Dosha, Sade Sati, Pitru Dosha,
 *          Grahan Dosha, Shrapit Dosha, Guru Chandal Dosha, Kemdrum Dosha (enhanced)
 */
function detectDoshas(date, lat, lng) {
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
      name: 'Mangala Dosha (Kuja Dosha)',
      sinhala: 'මංගල දෝෂය (කුජ දෝෂය)',
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
        ? 'Mangala Dosha is present but cancelled by mitigating factors. Marriage is not obstructed.'
        : `Mangala Dosha is present (${severity}). Mars in house ${marsHouse} from Lagna creates intensity in marriage. Partner matching with another Manglik or performing remedies is recommended.`,
      descriptionSi: mangalCancelled
        ? 'මංගල දෝෂය පවතින නමුත් සමනය කරන සාධක මගින් වලංගු නොවේ. විවාහයට බාධාවක් නැත.'
        : `මංගල දෝෂය (${severity === 'Severe' ? 'බරපතල' : severity === 'Moderate' ? 'මධ්‍යම' : 'සුළු'}) පවතී. ලග්නයෙන් ${marsHouse} වන භාවයේ කුජ හේතුවෙන් විවාහයේ තීව්‍රතාවයක් ඇතිවේ. මංගලික සහකරු/සහකාරියක් සමඟ ගැළපීම හෝ පිළියම් නිර්දේශ කෙරේ.`,
      remedies: [
        'Perform Kuja Shanti pooja',
        'Visit Navagraha temple on Tuesdays',
        'Donate red lentils (masoor dal) on Tuesdays',
        'Recite Hanuman Chalisa or Mangala Stotram',
        'Wear Red Coral (Pavizham) on right ring finger (consult astrologer first)',
        'Marry after age 28 for natural mitigation',
      ],
      remediesSi: [
        'කුජ ශාන්ති පූජාවක් කරන්න',
        'අඟහරුවාදා නවග්‍රහ කෝවිලට යන්න',
        'අඟහරුවාදා රතු පරිප්පු දන් දෙන්න',
        'මංගල ස්තෝත්‍රය හෝ හනුමාන් චාලීසා කියවන්න',
        'රතු පබළු මුද්ද දකුණු අත ඇඟිල්ලේ පලඳින්න (ජ්‍යෝතිෂවේදියාගෙන් අසන්න)',
        'වයස 28ට පසු විවාහය ස්වාභාවික සමනයට හේතුවේ',
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
        descriptionSi: `සියලුම ග්‍රහයන් රාහු (${rahuHouse} වන භාවය) සහ කේතු (${ketuHouse} වන භාවය) අතර සීමා වී ඇත. මෙය ${kaalSarpType.sinhala} කාල සර්ප දෝෂය ඇති කරයි. ජීවිතයේ හදිසි උච්චාවචන අත්විඳිය හැක.`,
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
  const now = new Date();
  const transitPlanets = getAllPlanetPositions(now);
  const natalMoonRashiId = planets.moon?.rashiId;
  const transitSaturnRashiId = transitPlanets.saturn?.rashiId;

  if (natalMoonRashiId && transitSaturnRashiId) {
    const satFromMoon = ((transitSaturnRashiId - natalMoonRashiId + 12) % 12) + 1;
    let sadeSatiPhase = null;

    if (satFromMoon === 12) sadeSatiPhase = { phase: 'Rising (ආරෝහණ)', severity: 'Beginning', description: 'Saturn entering 12th from natal Moon — Sade Sati is beginning. Emotional and financial caution needed.', descriptionSi: 'සෙනසුරු චන්ද්‍රයෙන් 12 වන ස්ථානයට පිවිසීම — සාඩේ සාති ආරම්භ වේ. හැඟීම් හා මූල්‍ය සැලකිලිමත් බව අවශ්‍යයි.' };
    if (satFromMoon === 1) sadeSatiPhase = { phase: 'Peak (උච්ච)', severity: 'Maximum', description: 'Saturn directly over natal Moon — Peak Sade Sati. Maximum karmic pressure. This is the hardest but most transformative period.', descriptionSi: 'සෙනසුරු කෙලින්ම චන්ද්‍රයා මත — උච්ච සාඩේ සාති. උපරිම කර්ම පීඩනය. මෙය වඩාත් දුෂ්කර නමුත් පරිවර්තනශීලී කාලයයි.' };
    if (satFromMoon === 2) sadeSatiPhase = { phase: 'Setting (අවරෝහණ)', severity: 'Ending', description: 'Saturn in 2nd from natal Moon — Final phase of Sade Sati. Financial adjustments and family matters dominate.', descriptionSi: 'සෙනසුරු චන්ද්‍රයෙන් 2 වන ස්ථානයේ — සාඩේ සාතිහි අවසාන අවධිය. මූල්‍ය සකස්කිරීම් සහ පවුල් කටයුතු ප්‍රමුඛ වේ.' };

    if (sadeSatiPhase) {
      doshas.push({
        name: 'Sade Sati (7.5 Year Saturn Transit)',
        sinhala: 'සාඩේ සාති (එරාෂ්ටකය)',
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
          'Worship Shani Bhagavan on Saturdays',
          'Light sesame oil lamp at a Shani temple',
          'Donate black items (sesame, black cloth, iron) on Saturdays',
          'Recite Shani Stotram or Dasharatha Shani Stotram',
          'Wear Blue Sapphire (Neelam) only if Saturn is yogakaraka for your lagna',
          'Practice patience and accept karmic lessons during this period',
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
  if (sunHouse === rahuHouse) { pitruDosha = true; pitruDetails.push('Sun conjunct Rahu — ancestral curse blocking paternal blessings'); }
  if (sunHouse === ketuHouse) { pitruDosha = true; pitruDetails.push('Sun conjunct Ketu — past-life debt from father\'s lineage'); }
  // Sun in 9th afflicted
  if (sunHouse === 9 && (rahuHouse === 9 || saturnHouse === 9)) { pitruDosha = true; pitruDetails.push('Sun in 9th with malefic — direct affliction to father/fortune house'); }
  // 9th lord in 6, 8, 12
  if (lord9House && [6, 8, 12].includes(lord9House)) { pitruDosha = true; pitruDetails.push(`9th lord ${lord9Name} in dusthana (house ${lord9House}) — fortune weakened by ancestral karma`); }
  // Saturn aspects 9th house
  if (saturnHouse) {
    const satTo9 = ((9 - saturnHouse + 12) % 12) + 1;
    if ([3, 7, 10].includes(satTo9)) { pitruDosha = true; pitruDetails.push('Saturn aspects 9th house — ancestral delays and obstacles'); }
  }

  if (pitruDosha) {
    doshas.push({
      name: 'Pitru Dosha (Ancestral Karma)',
      sinhala: 'පිතෘ දෝෂය (පූර්ව පාප)',
      icon: '👤⚡',
      present: true,
      severity: pitruDetails.length >= 3 ? 'Severe' : pitruDetails.length >= 2 ? 'Moderate' : 'Mild',
      details: pitruDetails,
      description: 'Pitru Dosha indicates unresolved karma from the paternal ancestral lineage. This can manifest as delays in fortune, father-related struggles, or obstacles in dharmic pursuits.',
      descriptionSi: 'පිතෘ දෝෂය පියා පැත්තේ පරම්පරාවෙන් එන නොවිසඳුණු කර්මය පෙන්වයි. වාසනාව ප්‍රමාදවීම, පියා සම්බන්ධ අරගල, හෝ ධාර්මික කටයුතුවල බාධා ලෙස මෙය ප්‍රකාශ විය හැකිය.',
      remedies: [
        'Perform Pitru Tarpana on Amavasya (new moon) days',
        'Offer water to the Sun during sunrise facing east',
        'Perform Shraddha ceremony for departed ancestors',
        'Donate food to Brahmins on father\'s death anniversary',
        'Visit Gaya, Varanasi, or Rameswaram for Pinda Daan',
        'Recite Gayatri Mantra 108 times daily at dawn',
      ],
    });
  }

  // ── 5. GRAHAN DOSHA (Eclipse Affliction) ──────────────────────
  // Sun/Moon conjunct Rahu/Ketu
  if (sunHouse === rahuHouse || sunHouse === ketuHouse) {
    doshas.push({
      name: 'Surya Grahan Dosha (Solar Eclipse)',
      sinhala: 'සූර්ය ග්‍රහණ දෝෂය',
      icon: '🌑',
      present: true,
      severity: sunHouse === rahuHouse ? 'Strong' : 'Moderate',
      description: 'Sun conjunct shadow planet — father\'s health, government matters, and ego face challenges. Authority may be undermined.',
      descriptionSi: 'සූර්යයා සෙවනැලි ග්‍රහයා සමඟ — පියාගේ සෞඛ්‍යය, රාජ්‍ය කටයුතු, සහ ආත්ම ගෞරවයට අභියෝග. බලය අඩපණ විය හැක.',
      remedies: ['Recite Aditya Hridayam', 'Offer water to Sun at sunrise', 'Donate wheat and jaggery on Sundays'],
    });
  }

  if (moonHouse === rahuHouse || moonHouse === ketuHouse) {
    doshas.push({
      name: 'Chandra Grahan Dosha (Lunar Eclipse)',
      sinhala: 'චන්ද්‍ර ග්‍රහණ දෝෂය',
      icon: '🌘',
      present: true,
      severity: moonHouse === rahuHouse ? 'Strong' : 'Moderate',
      description: 'Moon conjunct shadow planet — mother\'s health, mental peace, and emotional stability face challenges. Anxiety and overthinking are common.',
      descriptionSi: 'චන්ද්‍ර සෙවනැලි ග්‍රහයා සමඟ — මවගේ සෞඛ්‍යය, මානසික සාමය, සහ හැඟීම් ස්ථාවරත්වයට අභියෝග. කනස්සල්ල හා අධික සිතීම සුලබයි.',
      remedies: ['Worship Chandra Bhagavan on Mondays', 'Wear Pearl (Muthu) on little finger', 'Donate white rice and milk on Mondays', 'Recite Chandra Kavach'],
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
      name: 'Vish Yoga (Poison Combination)',
      sinhala: 'විෂ යෝගය (විෂ සංයෝගය)',
      icon: '☠️',
      present: true,
      severity: vishCancelled ? 'Mild (Mitigated)' : 'Strong',
      cancelled: vishCancelled,
      details: { moonHouse, saturnHouse, conjunctHouse: moonHouse },
      description: vishCancelled
        ? `Moon-Saturn conjunction in house ${moonHouse} — Vish Yoga is present but mitigated by Jupiter's benefic aspect. Emotional challenges exist but are manageable with awareness.`
        : `Moon-Saturn conjunction in house ${moonHouse} — this is Vish Yoga (Poison Combination). It indicates deep emotional suffering, childhood trauma, difficult relationship with mother, depression, and emotional suppression. The native often carries unexpressed grief from early life. Mother may have been emotionally unavailable, strict, or the native experienced separation/coldness in the maternal bond.`,
      descriptionSi: vishCancelled
        ? `${moonHouse} වන භාවයේ චන්ද්‍ර-ශනි සංයෝගය — විෂ යෝගය පවතින නමුත් ගුරුගේ ශුභ දෘෂ්ටිය මඟින් සමනය වී ඇත. හැඟීම් අභියෝග ඇති නමුත් නිවැරදි අවබෝධයෙන් පාලනය කළ හැකිය.`
        : `${moonHouse} වන භාවයේ චන්ද්‍ර-ශනි සංයෝගය — මෙය විෂ යෝගයයි. ගැඹුරු හැඟීම් වේදනාව, ළමා කාලයේ කම්පා, මව සමඟ දුෂ්කර සබඳතාවය, මානසික අවපීඩනය සහ හැඟීම් මර්දනය පෙන්වයි.`,
      remedies: [
        'Worship Lord Shiva on Mondays — Shiva neutralizes Saturn\'s harshness on Moon',
        'Recite Chandra Kavach or Shiv Panchakshari mantra daily',
        'Wear a Pearl (Muthu) on the little finger on a Monday',
        'Donate white items (milk, rice, white cloth) on Mondays',
        'Practice meditation and emotional release techniques regularly',
        'Offer milk to a Shiva Lingam on Monday evenings',
        'Maintain a journal — writing helps process suppressed emotions',
      ],
    });
  }

  // ── 6. SHRAPIT DOSHA (Cursed Combination) ─────────────────────
  // Saturn + Rahu in same house
  if (saturnHouse && rahuHouse && saturnHouse === rahuHouse) {
    doshas.push({
      name: 'Shrapit Dosha (शापित)',
      sinhala: 'ශ්‍රාපිත දෝෂය',
      icon: '⛓️',
      present: true,
      severity: 'Severe',
      details: { house: saturnHouse },
      description: `Saturn and Rahu conjunct in house ${saturnHouse} — indicates a curse from a past life. This combination brings sudden obstacles, chronic delays, and karmic debts that feel inexplicable.`,
      descriptionSi: `${saturnHouse} වන භාවයේ ශනි-රාහු සංයෝගය — පූර්ව ජන්මයක ශාපයක් පෙන්නුම් කරයි. හදිසි බාධා, නිරන්තර ප්‍රමාදයන් සහ පැහැදිලි කළ නොහැකි කර්ම ණය ගෙන එයි.`,
      remedies: [
        'Perform Shrapit Dosha Nivaran Pooja',
        'Recite Maha Mrityunjaya Mantra 108 times daily',
        'Donate black sesame and iron on Saturdays',
        'Feed crows and stray dogs regularly',
        'Visit a Shani temple and pour oil on Shani idol',
      ],
    });
  }

  // ── 7. GURU CHANDAL DOSHA ─────────────────────────────────────
  // Jupiter + Rahu/Ketu in same house
  if (jupiterHouse && (jupiterHouse === rahuHouse || jupiterHouse === ketuHouse)) {
    const withNode = jupiterHouse === rahuHouse ? 'Rahu' : 'Ketu';
    doshas.push({
      name: 'Guru Chandal Dosha',
      sinhala: 'ගුරු චණ්ඩාල දෝෂය',
      icon: '🔱',
      present: true,
      severity: withNode === 'Rahu' ? 'Strong' : 'Moderate',
      details: { jupiterHouse, withNode },
      description: `Jupiter conjunct ${withNode} in house ${jupiterHouse} — the guru (wisdom planet) is corrupted by the shadow. This can create confusion in dharma, wrong teachers/advisors, and misguided beliefs. However, it also grants unconventional wisdom and research ability.`,
      descriptionSi: `${jupiterHouse} වන භාවයේ ගුරු ${withNode === 'Rahu' ? 'රාහු' : 'කේතු'} සමඟ — ප්‍රඥා ග්‍රහයා සෙවනැල්ලෙන් කිලිටි වේ. ධර්මයේ ව්‍යාකූලත්වය, වැරදි ගුරුවරුන්/උපදේශකයින් ඇතිවිය හැක. නමුත් අසාමාන්‍ය ප්‍රඥාව හා පර්යේෂණ හැකියාවද ලබා දේ.`,
      remedies: [
        'Worship Lord Vishnu on Thursdays',
        'Donate yellow items (turmeric, yellow cloth, gold) on Thursdays',
        'Recite Vishnu Sahasranama weekly',
        'Respect teachers and elderly people always',
        'Wear Yellow Sapphire (Pushparaga) if Jupiter is benefic for lagna',
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
      name: 'Daridra Dosha (Poverty Combination)',
      sinhala: 'දරිද්‍ර දෝෂය',
      icon: '💸',
      present: true,
      severity: 'Moderate',
      description: `Both wealth lords (2nd: ${lord2Name}, 11th: ${lord11Name}) are in difficult houses. Financial growth requires extra effort and karmic remedies.`,
      descriptionSi: `ධන භාවාධිපතීන් දෙදෙනාම (2 වන: ${lord2Name}, 11 වන: ${lord11Name}) දුෂ්කර භාවවල සිටී. මූල්‍ය වර්ධනය සඳහා අමතර උත්සාහය හා කර්ම පිළියම් අවශ්‍යයි.`,
      remedies: [
        'Worship Goddess Lakshmi on Fridays',
        'Recite Shri Suktam daily',
        'Keep finances transparent — never hide money',
        'Donate food to the needy on Fridays',
        'Keep the northeast corner of home clean and lit',
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
      description: 'Benefic planets dominate the angular houses with no malefic obstruction — grants a life of fortune, comfort, fame, and authority like a mountain king.',
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
      description: 'Benefic planets on both sides of the Ascendant — a divine protection shield. Life is blessed, obstacles are deflected, and fortune surrounds you.',
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
      description: 'Malefic planets hemming the Ascendant from both sides — creates pressure, restrictions, and feeling "boxed in" by circumstances. Requires spiritual remedies.',
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
function calculateJaiminiKarakas(date, lat, lng) {
  const planets = getAllPlanetPositions(date);
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

  // Interpret Karakamsha
  const KARAKAMSHA_INTERPRETATIONS = {
    1: 'Soul desires leadership, independence, and pioneering new paths. Warrior spirit.',
    2: 'Soul craves material security, beauty, luxury, and sensual pleasures. Artistic nature.',
    3: 'Soul seeks knowledge, communication, intellectual mastery, and versatility. Writer/teacher.',
    4: 'Soul wants emotional security, home, nurturing relationships, and protection of loved ones.',
    5: 'Soul desires creative expression, fame, authority, and recognition. Dramatic flair.',
    6: 'Soul is drawn to service, healing, problem-solving, and perfecting skills. Analytical mind.',
    7: 'Soul seeks harmony, partnership, justice, and aesthetic perfection. Diplomat/artist.',
    8: 'Soul craves transformation, occult knowledge, hidden truths, and depth of experience. Researcher.',
    9: 'Soul desires wisdom, spiritual growth, travel, teaching, and dharmic living. Philosopher.',
    10: 'Soul seeks achievement, structure, authority, and lasting legacy. Empire builder.',
    11: 'Soul craves innovation, humanitarian service, unusual experiences, and breaking boundaries.',
    12: 'Soul desires liberation (moksha), spiritual practice, foreign lands, and transcendence of material world.',
  };

  const KARAKAMSHA_INTERPRETATIONS_SI = {
    1: 'ආත්මය නායකත්වය, ස්වාධීනත්වය සහ නව මාර්ග සොයා යාම ප්‍රාර්ථනා කරයි. සටන්කාමී ආත්මය.',
    2: 'ආත්මය භෞතික ආරක්ෂාව, සෞන්දර්යය, සුඛෝපභෝගී සහ කලාත්මක ස්වභාවය ප්‍රාර්ථනා කරයි.',
    3: 'ආත්මය දැනුම, සන්නිවේදනය, බුද්ධිමය ප්‍රාවීණ්‍යතාව සොයයි. ලේඛක/ගුරුවර ස්වභාවය.',
    4: 'ආත්මය හැඟීම් ආරක්ෂාව, නිවස, පෝෂණ සබඳතා සොයයි.',
    5: 'ආත්මය නිර්මාණශීලී ප්‍රකාශනය, කීර්තිය, බලය සහ පිළිගැනීම ප්‍රාර්ථනා කරයි.',
    6: 'ආත්මය සේවය, සුව කිරීම, ගැටලු විසඳීම කෙරෙහි ආකර්ෂිත වේ. විශ්ලේෂණ මනස.',
    7: 'ආත්මය සාමය, හවුල්කාරිත්වය, යුක්තිය සහ සෞන්දර්යාත්මක පරිපූර්ණතාව සොයයි.',
    8: 'ආත්මය පරිවර්තනය, ගුප්ත දැනුම, සැඟවුණු සත්‍ය සොයයි. පර්යේෂක ස්වභාවය.',
    9: 'ආත්මය ප්‍රඥාව, ආධ්‍යාත්මික වර්ධනය, ගමන්, ඉගැන්වීම සොයයි. දාර්ශනික ස්වභාවය.',
    10: 'ආත්මය ජයග්‍රහණය, ව්‍යුහය, බලය සහ කල්පවතින උරුමයක් සොයයි.',
    11: 'ආත්මය නවෝත්පාදනය, මානවවාදී සේවය සහ සීමා බිඳීම ප්‍රාර්ථනා කරයි.',
    12: 'ආත්මය මෝක්ෂය, ආධ්‍යාත්මික පුහුණුව, සහ භෞතික ලෝකය ඉක්මවා යාම ප්‍රාර්ථනා කරයි.',
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
      interpretation: KARAKAMSHA_INTERPRETATIONS[karakamshaRashiId] || '',
      interpretationSi: KARAKAMSHA_INTERPRETATIONS_SI[karakamshaRashiId] || '',
    } : null,
    arudhaLagna: arudhaLagnaId ? {
      rashiId: arudhaLagnaId,
      rashi: RASHIS[arudhaLagnaId - 1]?.english,
      sinhala: RASHIS[arudhaLagnaId - 1]?.sinhala,
      meaning: 'How the world perceives you — your public image and reputation',
    } : null,
    upapadaLagna: upapadaId ? {
      rashiId: upapadaId,
      rashi: RASHIS[upapadaId - 1]?.english,
      sinhala: RASHIS[upapadaId - 1]?.sinhala,
      meaning: 'The nature of your marriage and spouse — derived from the 12th house Arudha',
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
function calculateShadbala(date, lat, lng) {
  const planets = getAllPlanetPositions(date);
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
    const birthHour = birthDate.getUTCHours() + 5.5; // Approximate SLT
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


// ═══════════════════════════════════════════════════════════════════════════
//  TIER 2-B: BHRIGU BINDU, AVASTHA, EXTRA DIVISIONAL CHARTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate Bhrigu Bindu (Destiny Point)
 * (Rahu longitude + Moon longitude) / 2 = the most sensitive point in the chart
 */
function calculateBhriguBindu(date) {
  const planets = getAllPlanetPositions(date);
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
  const now = new Date();
  const transitPlanets = getAllPlanetPositions(now);
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
    meaning: 'The Bhrigu Bindu is the destiny point — when any planet transits this degree, major life events are triggered. It is the karmic trigger point of the soul.',
    meaningSi: 'භ්‍රිගු බින්දුව ඉරණම් ලක්ෂ්‍යයි — ඕනෑම ග්‍රහයෙක් මෙම අංශය හරහා ගමන් කරන විට ජීවිතයේ ප්‍රධාන සිදුවීම් ඇති කෙරේ. මෙය ආත්මයේ කර්ම ප්‍රේරක ලක්ෂ්‍යයි.',
    interpretation: `Bhrigu Bindu falls in ${bbRashi.english} at ${(bhriguBindu % 30).toFixed(1)}° in ${bbNakshatra.name} nakshatra. ${activations.length > 0 ? 'Currently ACTIVATED by ' + activations.map(a => a.planet).join(', ') + ' — significant events unfolding.' : 'Currently not activated by transit planets.'}`,
    interpretationSi: `භ්‍රිගු බින්දුව ${bbRashi.sinhala} රාශියේ ${(bhriguBindu % 30).toFixed(1)}° ${bbNakshatra.sinhala} නැකතේ පිහිටයි. ${activations.length > 0 ? 'දැනට ' + activations.map(a => { const pi = { Sun: 'රවි', Moon: 'චන්ද්‍ර', Mars: 'කුජ', Mercury: 'බුධ', Jupiter: 'ගුරු', Venus: 'සිකුරු', Saturn: 'ශනි' }; return pi[a.planet] || a.planet; }).join(', ') + ' මගින් සක්‍රිය — වැදගත් සිදුවීම් සිදු වෙමින්.' : 'දැනට ග්‍රහ ගමන් මඟින් සක්‍රිය නොවේ.'}`,
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
function calculateAvasthas(date) {
  const planets = getAllPlanetPositions(date);
  const results = {};

  const BALAADI = [
    { name: 'Bala', sinhala: 'බාල', range: [0, 6], effect: 'Infant state — planet gives 25% results. Immature energy, needs development.', power: 0.25 },
    { name: 'Kumara', sinhala: 'කුමාර', range: [6, 12], effect: 'Adolescent state — planet gives 50% results. Growing energy, partial effects.', power: 0.50 },
    { name: 'Yuva', sinhala: 'යුව', range: [12, 18], effect: 'Youth state — planet gives 100% results. PEAK POWER. This planet is at full strength!', power: 1.0 },
    { name: 'Vriddha', sinhala: 'වෘද්ධ', range: [18, 24], effect: 'Old state — planet gives 50% results. Wise but declining energy.', power: 0.50 },
    { name: 'Mrita', sinhala: 'මෘත', range: [24, 30], effect: 'Dead state — planet gives near-zero results. This energy is dormant or blocked.', power: 0.05 },
  ];

  // For odd signs: normal order. For even signs: REVERSE order
  const BALAADI_EVEN = [
    { name: 'Mrita', sinhala: 'මෘත', range: [0, 6], effect: 'Dead state (reversed in even sign) — dormant energy.', power: 0.05 },
    { name: 'Vriddha', sinhala: 'වෘද්ධ', range: [6, 12], effect: 'Old state (reversed) — wise but fading.', power: 0.50 },
    { name: 'Yuva', sinhala: 'යුව', range: [12, 18], effect: 'Youth state — PEAK POWER even in reversed sign!', power: 1.0 },
    { name: 'Kumara', sinhala: 'කුමාර', range: [18, 24], effect: 'Adolescent (reversed) — growing.', power: 0.50 },
    { name: 'Bala', sinhala: 'බාල', range: [24, 30], effect: 'Infant (reversed) — just beginning.', power: 0.25 },
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
      'Jaagrat': { sinhala: 'ජාගෘත (අවදි)', effect: 'Planet is FULLY AWAKE — gives maximum results, conscious action', power: 1.0 },
      'Swapna': { sinhala: 'ස්වප්න (සිහින)', effect: 'Planet is DREAMING — gives partial results, subconscious influence', power: 0.5 },
      'Sushupti': { sinhala: 'සුෂුප්ති (නිදි)', effect: 'Planet is SLEEPING — minimal results, latent energy waiting to be awakened', power: 0.25 },
    };

    results[key] = {
      name,
      sinhala: p.sinhala,
      degree: deg.toFixed(2),
      rashi: p.rashiEnglish,
      balaadi: {
        state: avastha.name,
        sinhala: avastha.sinhala,
        effect: avastha.effect,
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
function buildExtendedVargas(date, lat, lng) {
  const planets = getAllPlanetPositions(date);
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

  const charts = {};
  const divisions = [
    { key: 'D7', name: 'Saptamsha', sinhala: 'සප්තාංශ', governs: 'Children, progeny, creative output', rules: d7Rules },
    { key: 'D10', name: 'Dasamsha', sinhala: 'දශාංශ', governs: 'Career, profession, public status, achievements', rules: d10Rules },
    { key: 'D24', name: 'Chaturvimshamsha', sinhala: 'චතුර්විංශාංශ', governs: 'Education, academic success, learning ability', rules: d24Rules },
    { key: 'D60', name: 'Shashtiamsha', sinhala: 'ෂෂ්ඨිඅංශ', governs: 'Past life karma, deepest karmic patterns, soul\'s journey across lifetimes', rules: d60Rules },
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

  return charts;
}


// ═══════════════════════════════════════════════════════════════════════════
//  TIER 2-C: PRATYANTARDASHA (Sub-Sub Periods)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate Pratyantardasha (sub-sub periods within each Antardasha)
 * Gives day-level timing accuracy
 */
function calculatePratyantardasha(moonLongitude, birthDate) {
  const DASA_LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
  const DASA_YEARS = { 'Ketu': 7, 'Venus': 20, 'Sun': 6, 'Moon': 10, 'Mars': 7, 'Rahu': 18, 'Jupiter': 16, 'Saturn': 19, 'Mercury': 17 };
  const TOTAL_YEARS = 120;

  // Get the detailed dashas first
  const dashas = calculateVimshottariDetailed(moonLongitude, birthDate);

  // For the CURRENT running dasha/antardasha, calculate pratyantardashas
  const now = new Date();
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
    interpretation: `Currently running: ${currentDasha.lord} Mahadasha → ${currentAD.lord} Antardasha${pratyantardashas.find(p => p.isCurrent) ? ' → ' + pratyantardashas.find(p => p.isCurrent).lord + ' Pratyantardasha' : ''}`,
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
function calculateNadiAmsha(date) {
  const planets = getAllPlanetPositions(date);

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
      interpretation: `${p.name} is in the ${nadiName} Nadi (${devata} realm, ${guna} quality) at ${degree.toFixed(2)}° of ${p.rashiEnglish}. This precise micro-position reveals the most granular karmic imprint of this planet.`,
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
function calculateKPSubLords(date) {
  const planets = getAllPlanetPositions(date);

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
      interpretation: `${p.name} operates through: ${signLord} (worldly arena) → ${starLord} (life theme) → ${subLord} (specific outcome) → ${subSubLord} (fine-tuning)`,
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
function analyzePastLife(date, lat, lng) {
  const { houses, planets } = buildHouseChart(date, lat, lng);
  const extendedVargas = buildExtendedVargas(date, lat, lng);
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

  const KETU_HOUSE_PAST_LIFE = {
    1: 'You were a strong, independent leader — possibly a warrior, king, or self-made pioneer. You came into this life already knowing how to survive alone.',
    2: 'You were wealthy and attached to family/possessions in your past life. Your speech had power. You may have been a banker, trader, or wealthy merchant.',
    3: 'You were a brave communicator — a writer, messenger, soldier, or traveling merchant. Your siblings played a crucial role in your past life.',
    4: 'You had deep roots in your homeland — possibly a landowner, farmer, or community elder. Your mother\'s lineage carries powerful karma.',
    5: 'You were a creative genius, scholar, or spiritual practitioner. You may have been a priest, teacher, or performer. Past-life romance karma is strong.',
    6: 'You were a healer, servant, soldier, or someone who fought against enemies and disease. You carried the karma of service and sacrifice.',
    7: 'You were deeply involved in partnerships and marriage. Your past life revolved around a significant relationship — possibly karmic soulmate dynamics.',
    8: 'You were an occultist, mystic, or researcher of hidden knowledge. You may have dealt with death, transformation, or other people\'s resources.',
    9: 'You were a spiritual teacher, priest, philosopher, or long-distance traveler. Your past life was devoted to dharma and higher learning.',
    10: 'You were a person of authority — a king, administrator, or public figure. You carried the karma of power and responsibility.',
    11: 'You were part of a community, group, or network. Your past life involved fulfilling collective aspirations and working toward shared goals.',
    12: 'You were a monk, hermit, spiritual seeker, or someone who lived in isolation or foreign lands. Liberation (moksha) was your past-life goal.',
  };

  const KETU_HOUSE_PAST_LIFE_SI = {
    1: 'ඔබ ශක්තිමත්, ස්වාධීන නායකයෙක් විය — සමහරවිට සටන්කරුවෙක්, රජෙක් හෝ ස්වයං-නිර්මාණ පුරෝගාමියෙක්. ඔබ තනිව ජීවත් වන හැටි දැනටමත් දනී.',
    2: 'ඔබ පෙර ජන්මයේ ධනවත් වූ අතර පවුලට/දේපල වලට බැඳී සිටියේය. ඔබේ වචනයට බලයක් තිබුණි.',
    3: 'ඔබ නිර්භීත සන්නිවේදකයෙක් විය — ලේඛකයෙක්, දූතයෙක් හෝ ගමන් කරන වෙළෙන්දෙක්.',
    4: 'ඔබේ මව්බිමේ ගැඹුරු මූලයන් තිබුණි — සමහරවිට ඉඩම් හිමියෙක්, ගොවියෙක් හෝ ප්‍රජා ප්‍රධානියෙක්.',
    5: 'ඔබ නිර්මාණශීලී ප්‍රතිභාවන්තයෙක්, විද්වතෙක් හෝ ආධ්‍යාත්මික සාධකයෙක් විය.',
    6: 'ඔබ වෛද්‍යවරයෙක්, සේවකයෙක් හෝ සතුරන්ට හා රෝගවලට එරෙහිව සටන් කළ කෙනෙක් විය.',
    7: 'ඔබේ පෙර ජීවිතය සහකරු/සහකාරිය වටා කැරකුණි — කර්ම ආත්ම සහකරු සබඳතා.',
    8: 'ඔබ ගුප්ත විද්‍යාවේ පර්යේෂකයෙක් විය. මරණය, පරිවර්තනය සම්බන්ධයෙන් ක්‍රියා කළේය.',
    9: 'ඔබ ආධ්‍යාත්මික ගුරුවරයෙක්, දාර්ශනිකයෙක් හෝ දුර ගමන්කරුවෙක් විය.',
    10: 'ඔබ බලයේ පුද්ගලයෙක් විය — රජෙක්, පරිපාලකයෙක් හෝ මහජන පුද්ගලයෙක්.',
    11: 'ඔබ ප්‍රජාවක හෝ සමූහයක කොටසක් විය. සාමූහික අභිලාෂයන් ඉටුකරන ජීවිතයක්.',
    12: 'ඔබ භික්ෂුවක්, තාපසයෙක් හෝ ආධ්‍යාත්මික ගවේෂකයෙක් විය. මෝක්ෂය ඔබේ ඉලක්කය විය.',
  };

  // ── 2. 5th HOUSE — Purva Punya (Past-Life Merit) ─────────────
  const lord5 = getHouseLord(5);
  const lord5House = lord5 ? getPlanetHouse(lord5) : null;
  const planetsIn5 = houses[4]?.planets?.map(p => p.name).filter(n => n !== 'Lagna') || [];
  const beneficsIn5 = planetsIn5.filter(p => ['Jupiter', 'Venus', 'Mercury', 'Moon'].includes(p));
  const maleficsIn5 = planetsIn5.filter(p => ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'].includes(p));

  let pastLifeMerit = 'Mixed';
  if (beneficsIn5.length > 0 && maleficsIn5.length === 0) pastLifeMerit = 'Highly Meritorious — you have accumulated significant good karma';
  else if (maleficsIn5.length > 0 && beneficsIn5.length === 0) pastLifeMerit = 'Karmic Debts — past-life actions require resolution in this life';
  else if (beneficsIn5.length > 0 && maleficsIn5.length > 0) pastLifeMerit = 'Mixed Karma — both merit and debt from past lives';

  // ── 3. 12th HOUSE — Moksha & Past-Life Endings ────────────────
  const lord12 = getHouseLord(12);
  const lord12House = lord12 ? getPlanetHouse(lord12) : null;
  const planetsIn12 = houses[11]?.planets?.map(p => p.name).filter(n => n !== 'Lagna') || [];

  // ── 4. D60 (Shashtiamsha) — Most Precise Past Life Indicator ──
  const d60Data = extendedVargas.D60;

  // ── 5. RAHU — Current Life's Karmic Direction ─────────────────
  const rahuHouse = getPlanetHouse('Rahu');
  const rahuRashi = planets.rahu?.rashiEnglish;

  const RAHU_HOUSE_DIRECTION = {
    1: 'Soul wants to develop a strong individual identity — break free from relationship dependency.',
    2: 'Soul wants to build its own wealth and find its own voice — independently of family.',
    3: 'Soul wants to develop courage, communication skills, and take initiative.',
    4: 'Soul wants to create a stable home, connect with emotions, and develop inner security.',
    5: 'Soul wants to express creativity, have children, and experience romance.',
    6: 'Soul wants to serve others, solve problems, and develop practical skills.',
    7: 'Soul wants to learn partnership, compromise, and the art of relationships.',
    8: 'Soul wants to explore the mysteries of life, transformation, and shared resources.',
    9: 'Soul wants to pursue higher knowledge, travel, and develop philosophical wisdom.',
    10: 'Soul wants to achieve public status, career success, and leave a legacy.',
    11: 'Soul wants to connect with community, fulfill aspirations, and serve humanity.',
    12: 'Soul wants to transcend material attachments, develop spirituality, and find liberation.',
  };

  const RAHU_HOUSE_DIRECTION_SI = {
    1: 'ආත්මය ශක්තිමත් තනි පුද්ගල අනන්‍යතාවයක් වර්ධනය කිරීමට කැමතියි — සබඳතා මත යැපීමෙන් නිදහස් වන්න.',
    2: 'ආත්මය තමන්ගේම ධනය ගොඩනැගීමට සහ තමන්ගේම හඬ සොයා ගැනීමට කැමතියි.',
    3: 'ආත්මය නිර්භීතකම, සන්නිවේදන හැකියාව සහ මුලපිරීම වර්ධනය කරන්න කැමතියි.',
    4: 'ආත්මය ස්ථාවර නිවසක් නිර්මාණය කිරීමට සහ අභ්‍යන්තර ආරක්ෂාව වර්ධනය කිරීමට කැමතියි.',
    5: 'ආත්මය නිර්මාණශීලීත්වය ප්‍රකාශ කිරීමට, දරුවන් ලැබීමට සහ ආදරය අත්විඳීමට කැමතියි.',
    6: 'ආත්මය අන් අයට සේවය කිරීමට, ගැටලු විසඳීමට සහ ප්‍රායෝගික කුසලතා වර්ධනය කිරීමට කැමතියි.',
    7: 'ආත්මය හවුල්කාරිත්වය, සම්මුතිය සහ සබඳතා කලාව ඉගෙන ගැනීමට කැමතියි.',
    8: 'ආත්මය ජීවිතයේ අභිරහස්, පරිවර්තනය සහ හවුල් සම්පත් ගවේෂණය කිරීමට කැමතියි.',
    9: 'ආත්මය උසස් දැනුම, ගමන් සහ දාර්ශනික ප්‍රඥාව වර්ධනය කිරීමට කැමතියි.',
    10: 'ආත්මය මහජන තත්ත්වය, වෘත්තීය සාර්ථකත්වය සහ උරුමයක් තැබීමට කැමතියි.',
    11: 'ආත්මය ප්‍රජාව සමඟ සම්බන්ධ වීමට, අභිලාෂයන් ඉටු කිරීමට සහ මනුෂ්‍යත්වයට සේවය කිරීමට කැමතියි.',
    12: 'ආත්මය භෞතික බැඳීම් ඉක්මවා ආධ්‍යාත්මිකත්වය වර්ධනය කිරීමට සහ මෝක්ෂය සොයාගැනීමට කැමතියි.',
  };

  return {
    title: 'Past Life & Karmic Analysis',
    sinhala: 'පෙර ජන්ම හා කර්ම විශ්ලේෂණය',

    pastLife: {
      ketuHouse,
      ketuRashi,
      pastLifeStory: KETU_HOUSE_PAST_LIFE[ketuHouse] || 'Past life analysis requires precise birth time.',
      pastLifeStorySi: KETU_HOUSE_PAST_LIFE_SI[ketuHouse] || 'පෙර ජන්ම විශ්ලේෂණයට නිවැරදි උපන් වේලාව අවශ්‍යයි.',
    },

    pastLifeMerit: {
      fifthHousePlanets: planetsIn5,
      benefics: beneficsIn5,
      malefics: maleficsIn5,
      assessment: pastLifeMerit,
      assessmentSi: pastLifeMerit === 'Highly Meritorious — you have accumulated significant good karma'
        ? 'ඉතා පුණ්‍යකර — ඔබ සැලකිය යුතු යහපත් කර්ම රැස් කර ඇත'
        : pastLifeMerit === 'Karmic Debts — past-life actions require resolution in this life'
          ? 'කර්ම ණය — පෙර ජන්ම ක්‍රියා මෙම ජීවිතයේ විසඳිය යුතුය'
          : 'මිශ්‍ර කර්ම — පෙර ජන්ම වලින් පුණ්‍ය හා ණය දෙකම',
      lord5: { name: lord5, house: lord5House },
    },

    currentLifeDirection: {
      rahuHouse,
      rahuRashi,
      direction: RAHU_HOUSE_DIRECTION[rahuHouse] || '',
      directionSi: RAHU_HOUSE_DIRECTION_SI[rahuHouse] || '',
      note: 'Rahu shows where your soul wants to GO in this life — the unfamiliar territory you must master.',
    },

    pastLifeEndings: {
      twelfthHousePlanets: planetsIn12,
      lord12: { name: lord12, house: lord12House },
      note: '12th house shows how your previous life ended and what you let go of before being reborn.',
    },

    d60Analysis: d60Data ? {
      lagnaRashi: d60Data.lagnaRashi,
      note: 'The Shashtiamsha (D60) chart is the most precise indicator of past-life karma. Its Lagna reveals the nature of your soul\'s journey across many lifetimes.',
    } : null,

    karmaBalance: {
      ketuAxis: `Ketu in house ${ketuHouse} → Rahu in house ${rahuHouse}`,
      summary: `Your soul has mastered the qualities of house ${ketuHouse} (${KETU_HOUSE_PAST_LIFE[ketuHouse]?.split('.')[0]}). Now it must develop the qualities of house ${rahuHouse} (${RAHU_HOUSE_DIRECTION[rahuHouse]?.split('—')[0]?.trim()}).`,
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
function calculateSarvatobhadraActivations(date, lat, lng) {
  const planets = getAllPlanetPositions(date);
  const transitPlanets = getAllPlanetPositions(new Date());

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
      warning: vedhaPlanets.length > 0 ? `${vedhaPlanets.join(', ')} currently in ${vedhaNak} — creating Vedha to your natal Moon star. Be cautious in new ventures.` : 'No Vedha active — transit conditions are favorable.',
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
function generateAdvancedAnalysis(birthDate, lat = 6.9271, lng = 79.8612) {
  const date = new Date(birthDate);

  console.log('[Advanced Engine] Starting comprehensive Tier 1-2-3 analysis...');
  const startTime = Date.now();

  // TIER 1: Core
  const doshas = detectDoshas(date, lat, lng);
  const advancedYogas = detectAdvancedYogas(date, lat, lng);
  const jaiminiKarakas = calculateJaiminiKarakas(date, lat, lng);

  // TIER 2: Precision
  const shadbala = calculateShadbala(date, lat, lng);
  const bhriguBindu = calculateBhriguBindu(date);
  const avasthas = calculateAvasthas(date);
  const extendedVargas = buildExtendedVargas(date, lat, lng);
  const moonSidereal = toSidereal(getMoonLongitude(date), date);
  const pratyantardasha = calculatePratyantardasha(moonSidereal, date);

  // TIER 3: Expert
  const nadiAmsha = calculateNadiAmsha(date);
  const kpSubLords = calculateKPSubLords(date);
  const pastLife = analyzePastLife(date, lat, lng);
  const sarvatobhadra = calculateSarvatobhadraActivations(date, lat, lng);

  const elapsed = Date.now() - startTime;
  console.log(`[Advanced Engine] Complete analysis done in ${elapsed}ms — ${doshas.length} doshas, ${advancedYogas.length} yogas detected`);

  return {
    generatedAt: new Date().toISOString(),
    engineVersion: 'NakathAI-Advanced-v3.0',
    computeTimeMs: elapsed,

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
