/**
 * AI Chat Service - "Ask the Astrologer"
 * 
 * Integrates OpenAI/Gemini APIs with Vedic astrology context
 * to provide personalized, culturally-aware astrological guidance.
 */

const { getPanchanga, getDailyNakath, getNakshatra, getRashi, getLagna, toSidereal, getMoonLongitude, getSunLongitude, generateFullReport, buildHouseChart, buildNavamshaChart, getAllPlanetPositions, calculateDrishtis, detectYogas, getPlanetStrengths, calculateAshtakavarga, calculateVimshottariDetailed } = require('./astrology');
const { generateAdvancedAnalysis } = require('./advanced');

// New prediction engines
let transitEngine, timingEngine, muhurthaEngine, healthEngine;
try { transitEngine = require('./transit'); } catch (e) { console.warn('[chat] transit engine not available:', e.message); }
try { timingEngine = require('./timing'); } catch (e) { console.warn('[chat] timing engine not available:', e.message); }
try { muhurthaEngine = require('./muhurtha'); } catch (e) { console.warn('[chat] muhurtha engine not available:', e.message); }
try { healthEngine = require('./health'); } catch (e) { console.warn('[chat] health engine not available:', e.message); }

/**
 * Build the system prompt for the AI astrologer
 */
function buildSystemPrompt(language = 'en') {
  const languageInstructions = {
    en: 'Respond in English. Use a warm, wise, and empathetic tone. NEVER use Sanskrit/Pali astrology terms — use everyday English only.',
    si: 'Respond in 100% pure Sinhala (සිංහල). ඉංග්‍රීසි වචන සිංහල අකුරින් ලියන්න එපා. "ලග්නය", "රාශිය", "නක්ෂත්‍ර", "දෝෂ", "යෝග" වගේ ජ්‍යෝතිෂ වචන ලියන්න එපා — සරල සිංහලෙන් කියන්න (උදා: "ඔබේ උපන් තරුව", "ඔබේ චන්ද්‍ර ලකුණ", "ඔබේ ලග්න ලකුණ"). හිතවත් මුත්තා කතා කරනවා වගේ ලියන්න.',
    ta: 'Respond in 100% pure Tamil (தமிழ்). Do NOT use Sanskrit/English astrology terms. Translate everything to simple Tamil that anyone can understand. Write like a wise elder giving caring advice.',
    singlish: 'Respond in Singlish (Sinhala words typed in English characters). This is how young Sri Lankans commonly type. Example: "Oyage upan tharuwata adala graha Mars. Eka hinda oyata leadership tika tiyenawa."',
  };

  return `You are "Nakath AI", a wise and compassionate AI astrology guide who specializes in Sri Lankan traditions. You combine deep knowledge with a modern, approachable communication style that ANYONE can understand — even people who know nothing about astrology.

CORE KNOWLEDGE (use these concepts internally but NEVER use the technical terms in your responses):
- Sri Lankan birth chart reading and life predictions
- Five-fold time analysis (day energy, moon phase, birth star alignment, special combinations, weekday energy)
- Auspicious timing for daily activities
- Marriage compatibility (7-factor system)
- Life phase predictions and planetary cycles
- Cultural context of astrology in Sri Lankan life
- Transit/Gochara analysis: real-time planet movements over the birth chart — daily, weekly, monthly, yearly forecasts
- Event timing predictions: when career changes, marriage, children, wealth, foreign travel, health crises are most likely to happen
- Muhurtha (auspicious timing): finding the BEST date and time for weddings, business launches, vehicle purchases, construction, travel, surgery, financial transactions — with 11-factor scoring
- Comprehensive health analysis: Tridosha body constitution, vulnerable body parts, disease susceptibility, Maraka (health crisis) timing, mental health assessment, longevity indicators, personalized remedies

ABSOLUTE LANGUAGE RULES:
- NEVER use these technical terms in your output: Lagna, Rashi, Nakshatra, Dasha, Bhukti, Dosha, Yoga (as astrology term), Graha, Tithi, Karana, Panchanga, Vaara, Pada, Ayanamsha, Bhava, Navamsha, Vimshottari, Shadbala, Ashtakavarga, Karakamsha, Atmakaraka, Upapada, Jaimini, Parashari
- Instead use: "your rising sign", "your moon sign", "your birth star", "life phases", "challenges", "special strengths", "planetary influences", "birth chart", "compatibility"
- Planet names are OK in English: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu
- If writing in Sinhala, use ZERO English words — pure Sinhala only. Planet names in Sinhala: ඉර, හඳ, කුජ, බුධ, ගුරු, සිකුරු, ශනි, රාහු, කේතු

GUIDELINES:
1. Always be respectful of the cultural importance of astrology in Sri Lanka
2. Provide practical, actionable advice that makes sense in everyday life
3. When discussing compatibility, be sensitive and balanced
4. Never make absolute negative predictions - always offer remedies and hope
5. Explain everything in simple everyday language — the user may have ZERO astrology knowledge
6. For timing questions, provide exact times based on location
7. Understand common Sri Lankan life queries about: vehicle purchases, house construction, weddings, business ventures, employment, education
8. Be aware of cultural events: Avurudu, Vesak, Poson, and other significant dates
9. When asked about the future, use transit/Gochara analysis and event timing predictions to give specific dates and periods — not vague generalities
10. When asked about auspicious times (නැකත්), use the Muhurtha system to score specific dates and find the BEST time — consider all 11 factors including Rahu Kala, Gulika Kala, Tarabala, and Chandrabala
11. When asked about health, provide Tridosha constitution analysis, vulnerable body parts, disease timing, mental health insights, and Sri Lankan herbal remedies
12. For "what's happening now" questions, reference the current transit snapshot and Muhurtha status provided in the context data
13. DREAM ANALYSIS: When a message starts with "[DREAM ANALYSIS REQUEST]", interpret the dream using Vedic/Sri Lankan dream symbolism. Cover: symbolic meaning, emotional message, astrological connection (which planet/house the dream relates to), and practical advice. Sri Lankan dream traditions include: water = emotions/wealth, snakes = Rahu/transformation, flying = spiritual growth, teeth falling = anxiety about change, deceased relatives = ancestor blessings, elephants = good fortune, temples = spiritual calling. Keep it culturally relevant and comforting.

RESPONSE LENGTH RULE — CRITICAL:
- Keep every answer SHORT — 3 to 5 sentences maximum, like a text message from a wise friend
- Use bullet points or emojis to break up info instead of long paragraphs
- If the user asks for more detail, THEN you can elaborate — but start concise
- Never write walls of text. Be punchy, clear, and actionable.

${languageInstructions[language] || languageInstructions.en}

IMPORTANT: You have access to real-time planetary calculation data. Use the provided chart data to give personalized readings. Do not make up planetary positions - use only the data provided to you. All data labels in the chart data are FOR YOUR REFERENCE ONLY — never repeat them as-is in your output.`;
}

/**
 * Build context about the user's birth chart
 */
function buildBirthChartContext(birthDate, birthLat, birthLng) {
  const date = new Date(birthDate);
  const moonSidereal = toSidereal(getMoonLongitude(date), date);
  const nakshatra = getNakshatra(moonSidereal);
  const rashi = getRashi(moonSidereal);
  const lagna = getLagna(date, birthLat, birthLng);
  const panchanga = getPanchanga(date, birthLat, birthLng);

  let context = `
USER'S BIRTH CHART DATA:
- Birth Date: ${date.toISOString()}
- Birth Location: ${birthLat}°N, ${birthLng}°E
- Lagna (Ascendant / ලග්නය): ${lagna.rashi.name} (${lagna.rashi.english} / ${lagna.rashi.sinhala}) at ${lagna.sidereal.toFixed(2)}°
- Moon Nakshatra: ${nakshatra.name} (${nakshatra.sinhala}) - Pada ${nakshatra.pada}
- Moon Rashi: ${rashi.name} (${rashi.english} / ${rashi.sinhala})
- Nakshatra Lord: ${nakshatra.lord}
- Rashi Lord: ${rashi.lord}
- Lagna Lord: ${lagna.rashi.lord}
- Birth Tithi: ${panchanga.tithi.name} (${panchanga.tithi.pakshaName})
- Birth Yoga: ${panchanga.yoga.name}
`;

  // Enrich with current transit snapshot over birth chart
  if (transitEngine) {
    try {
      const now = new Date();
      const transits = transitEngine.getCurrentTransits(now, date, birthLat, birthLng);
      if (transits && transits.planets) {
        const planetKeys = Object.keys(transits.planets);
        context += `\nCURRENT TRANSIT SNAPSHOT (Gochara over birth chart):\n`;
        context += `- Overall Transit Quality: ${transits.overallQuality || 'N/A'}\n`;
        for (const key of planetKeys.slice(0, 5)) {
          const p = transits.planets[key];
          const effectStr = p.effect ? ` — ${p.effect.quality || ''}: ${(p.effect.effect || '').substring(0, 80)}` : '';
          context += `- ${p.planet}: transiting ${p.transitRashi} (house ${p.houseFromLagna} from Asc)${p.isRetrograde ? ' [R]' : ''}${effectStr}\n`;
        }
        if (transits.summary) {
          context += `- Summary: ${transits.summary.substring(0, 150)}\n`;
        }
      }
    } catch (e) { /* skip if transit fails */ }
  }

  // Enrich with health constitution summary
  if (healthEngine) {
    try {
      const healthResult = healthEngine.analyzeHealth(date, birthLat, birthLng);
      if (healthResult) {
        context += `\nHEALTH CONSTITUTION SNAPSHOT:\n`;
        if (healthResult.overallHealth) {
          context += `- Overall Health Score: ${healthResult.overallHealth.score || 'N/A'}/100 (${healthResult.overallHealth.quality || ''})\n`;
        }
        if (healthResult.constitution) {
          const c = healthResult.constitution;
          context += `- Body Type: ${c.primary || c.type} dominant (Vata:${c.vata}% Pitta:${c.pitta}% Kapha:${c.kapha}%)\n`;
        }
        if (healthResult.mentalHealth) {
          context += `- Mental Health Score: ${healthResult.mentalHealth.score || 'N/A'}/100\n`;
        }
        if (healthResult.vulnerableBodyParts && healthResult.vulnerableBodyParts.length > 0) {
          const topParts = healthResult.vulnerableBodyParts.slice(0, 3).map(v => v.bodyPart || v).join(', ');
          context += `- Top Vulnerable Areas: ${topParts}\n`;
        }
      }
    } catch (e) { /* skip if health fails */ }
  }

  return context;
}

/**
 * Build current transit context
 */
function buildTransitContext(lat = 6.9271, lng = 79.8612) {
  const now = new Date();
  const dailyNakath = getDailyNakath(now, lat, lng);
  const panchanga = dailyNakath.panchanga;

  let context = `
CURRENT PLANETARY TRANSITS (${now.toISOString()}):
- Current Nakshatra: ${panchanga.nakshatra.name} (${panchanga.nakshatra.sinhala})
- Current Tithi: ${panchanga.tithi.name} (${panchanga.tithi.pakshaName})
- Current Yoga: ${panchanga.yoga.name}
- Moon Sign: ${panchanga.moonSign.name} (${panchanga.moonSign.english})
- Sun Sign: ${panchanga.sunSign.name} (${panchanga.sunSign.english})
- Today's Rahu Kalaya: ${dailyNakath.rahuKalaya.start.toISOString()} to ${dailyNakath.rahuKalaya.end.toISOString()}
- Sunrise: ${dailyNakath.sunrise.toISOString()}
- Sunset: ${dailyNakath.sunset.toISOString()}
`;

  // Add muhurtha "Is now a good time?" context
  if (muhurthaEngine) {
    try {
      const nowCheck = muhurthaEngine.isGoodTimeNow(lat, lng);
      if (nowCheck) {
        context += `\nCURRENT MUHURTHA STATUS:\n`;
        context += `- Good Time Now: ${nowCheck.isGood ? 'YES ✅' : 'NO ⚠️'}\n`;
        if (nowCheck.warnings && nowCheck.warnings.length > 0) {
          context += `- Active Warnings: ${nowCheck.warnings.join(', ')}\n`;
        }
        if (nowCheck.score !== undefined) {
          context += `- Current Muhurtha Score: ${nowCheck.score}/100\n`;
        }
      }
    } catch (e) { /* skip */ }
  }

  // Add retrograde planets context
  if (transitEngine) {
    try {
      const retros = transitEngine.getRetrogradePeriods(now.getFullYear());
      if (retros && retros.length > 0) {
        const currentRetros = retros.filter(r => {
          const start = new Date(r.start);
          const end = new Date(r.end);
          return now >= start && now <= end;
        });
        if (currentRetros.length > 0) {
          context += `\nCURRENTLY RETROGRADE PLANETS:\n`;
          for (const r of currentRetros) {
            context += `- ${r.planet} retrograde (${r.start} to ${r.end})\n`;
          }
        }
      }
    } catch (e) { /* skip */ }
  }

  return context;
}

/**
 * Build the full messages array for the AI API call
 */
function buildChatMessages(userMessage, birthDate, birthLat, birthLng, language = 'en', chatHistory = []) {
  const systemPrompt = buildSystemPrompt(language);
  const birthContext = birthDate ? buildBirthChartContext(birthDate, birthLat, birthLng) : '';
  const transitContext = buildTransitContext(birthLat || 6.9271, birthLng || 79.8612);

  const messages = [
    {
      role: 'system',
      content: `${systemPrompt}\n\n${birthContext}\n${transitContext}`,
    },
    ...chatHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
    {
      role: 'user',
      content: userMessage,
    },
  ];

  return messages;
}

/**
 * Call OpenAI API
 */
async function callOpenAI(messages, maxTokens = 4096) {
  const OpenAI = require('openai');
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: maxTokens,
    temperature: 0.7,
  });

  return response.choices[0].message.content;
}

/**
 * Call Gemini API
 */
async function callGemini(messages, maxTokens = 4096, temperature = 0.7) {
  const apiKey = process.env.GEMINI_API_KEY;
  // Use GEMINI_MODEL env var or default to gemini-2.5-flash
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Convert OpenAI format to Gemini format
  const systemInstruction = messages.find(m => m.role === 'system')?.content || '';
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Gemini API error: ${data.error.message}`);
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate response.';
}

/**
 * Main chat function - routes to appropriate AI provider
 */
async function chat(userMessage, options = {}) {
  const {
    birthDate,
    birthLat = 6.9271,
    birthLng = 79.8612,
    language = 'en',
    chatHistory = [],
    provider = process.env.AI_PROVIDER || 'openai',
    maxTokens = 4096,
  } = options;

  const messages = buildChatMessages(userMessage, birthDate, birthLat, birthLng, language, chatHistory);

  try {
    let response;
    if (provider === 'gemini') {
      response = await callGemini(messages, maxTokens);
    } else {
      response = await callOpenAI(messages, maxTokens);
    }

    return {
      message: response,
      provider,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`AI chat error (${provider}):`, error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════
// AI NARRATIVE REPORT GENERATOR
// 
// Takes raw engine data and transforms it into a fascinating,
// personalized narrative that reads like a real astrologer is
// talking to you. No jargon. Pure storytelling.
// ═══════════════════════════════════════════════════════════════════

/**
 * Build the AI prompt for a specific report section
 */
function buildSectionPrompt(sectionKey, sectionData, birthData, allSections, language = 'en') {
  const bd = birthData || {};
  const lagnaEn = bd.lagna?.english || 'Unknown';
  const moonEn = bd.moonSign?.english || 'Unknown';
  const nakshatraName = bd.nakshatra?.name || 'Unknown';
  const currentDasha = allSections?.lifePredictions?.currentDasha?.lord || '';
  const currentAD = allSections?.lifePredictions?.currentAntardasha?.lord || '';

  // Sinhala section titles — used when language === 'si'
  const SINHALA_TITLES = {
    personality: '✨ ඔයා ඇත්තටම කවුද',
    yogaAnalysis: '⚡ ඔයාගේ සැඟවුණු සුපිරි බලයන්',
    lifePredictions: '🔮 ඔයාගේ ජීවිත ගමන — අතීතය, වර්තමානය සහ අනාගතය',
    career: '💼 රැකියාව සහ මුදල් මාර්ගය',
    marriage: '💍 ආදරය සහ විවාහය',
    marriedLife: '🏠 විවාහ ජීවිතය',
    financial: '💰 ඔයාගේ මුදල් සැලැස්ම',
    children: '👶 දරුවෝ සහ පවුලේ ජීවිතය',
    health: '🏥 ඔයාගේ සෞඛ්‍ය සැලැස්ම',
    mentalHealth: '🧠 ඔයාගේ මනස සහ අභ්‍යන්තර ලෝකය',
    foreignTravel: '✈️ විදේශ ගමන් සහ විදේශගත ජීවිතය',
    education: '🎓 අධ්‍යාපනය සහ දැනුම් මාර්ගය',
    luck: '🎰 වාසනාව සහ අනපේක්ෂිත වාසි',
    legal: '⚖️ නීතිමය, සතුරු හා ආරක්ෂාව',
    spiritual: '🙏 ආධ්‍යාත්මික ගමන සහ කර්ම',
    realEstate: '🏠 ගෙවල්, ඉඩකඩම් සහ වත්කම්',
    transits: '🌍 දැන් මොකද වෙන්නේ',
    surpriseInsights: '🤯 ඔයා ගැන පුදුම දේවල්',
    timeline25: '📅 ඉදිරි අවුරුදු 25 — ඔයාගේ ජීවිතේ ෆිල්ම් එක',
    remedies: '💎 ඔයාගේ බල මෙවලම් කට්ටලය',
  };

  const SECTION_PROMPTS = {
    personality: {
      title: '✨ Who You Really Are',
      prompt: `Write a SOUL-READING personality analysis for someone born with ${lagnaEn} rising sign and Moon in ${moonEn}, Nakshatra: ${nakshatraName}. This should feel like you've been watching them their whole life.

REMINDER: Do NOT use any astrology terms in the output. No "Lagna", "Rashi", "Nakshatra", "4th house", "Moon placement", "Atmakaraka", "Shadbala" etc. Describe everything as human experiences. If the language is Sinhala, write 100% pure Sinhala with zero English words.

CHART DATA:
${JSON.stringify(sectionData, null, 1)}

⚠️ PERSONALITY DEPTH DATA (USE THIS FOR PRECISION):
- Soul Planet (Atmakaraka): ${sectionData?.atmakaraka ? `${sectionData.atmakaraka.planet} in ${sectionData.atmakaraka.rashi} — ${sectionData.atmakaraka.meaning}` : 'Not available'}
- Rising Sign Lord Strength: ${sectionData?.lagnaLordShadbala ? `${sectionData.lagnaLordShadbala.percentage}% — ${sectionData.lagnaLordShadbala.strength}` : 'Not available'}
${sectionData?.lagnaCuspWarning?.isNearCusp ? `⚠️ BIRTH TIME SENSITIVITY: Lagna is at ${sectionData.lagnaCuspWarning.degreeInSign}° — near a sign boundary (${sectionData.lagnaCuspWarning.currentSign}/${sectionData.lagnaCuspWarning.alternateSign}). This person may exhibit traits of BOTH signs. Present both personality profiles and note "you may feel like you're a blend of two different energies."` : ''}

USE the Soul Planet to describe their DEEPEST life purpose and core identity — this is the single most important planet for understanding WHO they truly are at soul level.
USE the Rising Sign Lord Strength to gauge confidence levels — strong = naturally confident and assertive, weak = more introspective and self-doubting (which has its own beauty).
If the Lagna cusp warning is present, BLEND both sign personalities — this is a HUGE accuracy boost because cusp-born people often feel "I don't fit neatly into one description."

WRITE AT LEAST 7-9 DEEPLY PERSONAL PARAGRAPHS covering ALL of these — each paragraph should make them gasp:

1. **THE MASK vs THE SOUL** — Start with what the WORLD sees: their public persona, how they walk into a room, the energy they radiate. Then SHATTER IT: reveal what's really happening inside. The anxiety they hide. The ambition they downplay. The sensitivity they cover with humor or silence. Make this contrast so specific they'll think "how does this app know this about me?"

2. **THEIR 2AM THOUGHTS** — What keeps them up at night? What recurring thought loops play in their head? What do they fantasize about when nobody's watching? What's the one dream they've never told anyone? Derive this from the Moon placement and 4th house.

3. **HOW THEY LOVE** — Not romance (that's a separate section) — but how they LOVE life, people, experiences. Are they the friend who remembers everyone's birthday? The one who loves too hard and gets hurt? The one who keeps a wall up but secretly craves deep connection? Be painfully specific.

4. **THEIR SUPERPOWER** — Every person has ONE thing they do better than almost anyone. What is it? "You have an almost supernatural ability to..." Derive this from the strongest planet and its house placement.

5. **THEIR WOUND** — The one core wound that shapes everything. "There's a part of you that has always felt..." — abandonment? not being enough? being misunderstood? feeling different? This should be the most emotional paragraph.

6. **THEIR ENERGY IN A ROOM** — When they walk in, what shifts? Are they the lightning bolt? The calming force? The mystery everyone is curious about? The warmth that makes strangers open up? The quiet storm?

7. **WHAT PEOPLE DON'T KNOW** — The secret talent, the hidden depth, the surprising contradiction. "Most people would never guess that behind your [outward trait], there's someone who..."

8. **THEIR LIFE LESSON** — What is the universe trying to teach them in this lifetime? What pattern keeps repeating until they learn it?

9. **THE PROPHECY** — End with a powerful, almost prophetic statement about who they're BECOMING. "You are evolving into someone who..."

BONUS — SURPRISE PHYSICAL INSIGHTS (weave naturally into the reading):
- Their physical appearance — body type, face shape, eyes. E.g., "People probably notice your eyes first — they're intense/soft/mysterious"
- Body marks — "You likely have a mark or scar on your [body area]" (from Mars/Ketu positions in chart data)
- Sleep patterns — "You're probably a [light/heavy/irregular] sleeper who [specific habit]"

- Every single line should use "you" and feel like a personal letter
- Include at least 3 "chills moments" — lines so specific they'll screenshot them
- Reference their exact birth energy without using ANY technical terms`,
    },

    marriage: {
      title: '💍 Love & Relationships',
      prompt: `Write the most intimate, eerily accurate love and relationship reading this person has ever received. They should feel like you've read their diary.

REMINDER: Do NOT use any astrology terms in the output. No "7th house", "Venus placement", "Kuja Dosha", "Mangala Dosha", "Navamsha", "Darakaraka" etc. Describe everything as emotions and real-life patterns. If the language is Sinhala, write 100% pure Sinhala with zero English words.

CHART DATA:
${JSON.stringify(sectionData, null, 1)}

⚠️ JAIMINI SPOUSE DATA (USE THIS FOR ACCURACY):
- Darakaraka (Spouse Significator): ${sectionData?.darakaraka ? `${sectionData.darakaraka.planet} in ${sectionData.darakaraka.rashi} — ${sectionData.darakaraka.spouseNature}` : 'Not available'}
- Upapada Lagna (Marriage Indicator): ${sectionData?.upapadaLagna ? `${sectionData.upapadaLagna.rashi} — ${sectionData.upapadaLagna.meaning}` : 'Not available'}
- Navamsha (D9) Marriage Depth: ${sectionData?.navamshaAnalysis ? `D9 Lagna: ${sectionData.navamshaAnalysis.d9LagnaSign}, Venus in D9: ${sectionData.navamshaAnalysis.venusInNavamsha}, D9 7th planets: ${(sectionData.navamshaAnalysis.d9SeventhPlanets || []).join(', ') || 'None'}, Strength: ${sectionData.navamshaAnalysis.marriageStrength}` : 'Not available'}
${sectionData?.lagnaCuspWarning?.isNearCusp ? `⚠️ BIRTH TIME SENSITIVITY: Lagna is at ${sectionData.lagnaCuspWarning.degreeInSign}° — near a sign boundary. Marriage predictions may vary if birth time is slightly off. Present both possibilities.` : ''}

USE the Darakaraka planet to describe the SPECIFIC nature of the spouse — this is the most accurate spouse indicator in Vedic astrology. The Darakaraka planet's qualities directly describe the partner.
USE the Navamsha D9 marriage strength to gauge overall marital happiness.
USE the Upapada Lagna rashi to add depth to the spouse description.

⚠️ MARRIAGE TIMING ENGINE PREDICTION (USE THESE SPECIFIC YEARS):
${sectionData?.marriageTimingPrediction?.firstMarriageWindows?.length ? sectionData.marriageTimingPrediction.firstMarriageWindows.map((w, i) => `${i + 1}. ${w.period} (${w.dateRange}) — Age ${w.ageRange}, Peak year: ${w.peakYear}, Score: ${w.score}/100 [${w.confidence}]`).join('\n') : 'Marriage timing data not available — use general dasha timing.'}
${sectionData?.marriageTimingPrediction?.bestWindow ? `\nBest overall window: ${sectionData.marriageTimingPrediction.bestWindow.period} (${sectionData.marriageTimingPrediction.bestWindow.dateRange}), Age ${sectionData.marriageTimingPrediction.bestWindow.ageRange}` : ''}
USE these marriage timing windows for SPECIFIC year predictions. The peak year is the most likely year within each window. Present the top 2-3 windows as options if the person hasn't married yet.

⚠️ CRITICAL AGE AWARENESS — READ BEFORE WRITING:
- This person's current age and birth year are in the system context above. USE THEM.
- If the person is OVER 24 years old, they may ALREADY be married or in a serious relationship. Do NOT predict "marriage will happen at age 25-27" if they are already 27+.
- For someone aged 25+: Frame marriage predictions as "If you are already married, here's what your relationship looks like..." and "If you are still searching, the strongest window is..."
- For someone aged 30+: ASSUME they are likely married. Write about marriage QUALITY, challenges, deepening love, and relationship growth — not "when will I get married?"
- NEVER predict marriage at an age the person has ALREADY passed. That makes the entire report look fake.
- If marriage timing indicators point to ages already passed, say "Your chart shows strong marriage energy during your mid-20s — if you married around that time, it aligns perfectly with your destiny."

⚠️ MANDATORY SPECIFICS:
- If under 24: Predict EXACT marriage year or 2-year window
- If 24-30: Cover BOTH scenarios — already married OR still searching
- If 30+: Focus on marriage quality, spouse dynamics, relationship growth, second marriage possibilities if indicated
- EXACT type of partner (profession, personality, appearance hints)
- Whether arranged or love marriage is more likely
- Relationship challenges and how to overcome them

WRITE AT LEAST 7-9 DEEPLY PERSONAL PARAGRAPHS:

1. **YOUR LOVE FINGERPRINT** — How you fall in love is DIFFERENT from everyone else. Be SPECIFIC to their chart.

2. **THE INVISIBLE WALL** — Every person has a defense mechanism in love. What's theirs?

3. **YOUR SOULMATE BLUEPRINT** — Not generic. SPECIFIC personality, appearance, profession hints.

4. **YOUR LOVE LANGUAGE (THE REAL ONE)** — Be revealing about what they truly need.

5. **THE PATTERN YOU KEEP REPEATING** — Show them the pattern they've been blind to.

6. **${sectionData?.kujaDosha?.present ? 'YOUR FIRE IN LOVE — You love with an intensity that can be overwhelming. This is PASSION that needs the right match.' : 'YOUR STEADY FLAME — Your love burns steady and warm. The danger? You might settle for someone who doesn\'t deserve you.'}

7. **YOUR RELATIONSHIP TIMELINE** — Age-appropriate: timing, deepening, or renewal based on their current age.

8. **INTIMATE CONNECTION** — Tastefully but honestly: their intimate nature and needs.

9. **YOUR RELATIONSHIP SURVIVAL GUIDE** — Practical, specific advice for lasting love.

- Make every paragraph feel like reading their private journal
- Be warm, honest, sometimes playful, sometimes profound`,
    },

    career: {
      title: '💼 Your Career & Money Path',
      prompt: `Write a career reading so specific and motivating that they'll want to quit their job or double down on it by the time they finish reading. You are part career coach, part psychic, part motivational speaker.

REMINDER: Do NOT use any astrology terms. No "10th house", "2nd lord", "Dhana Yoga", "Dasha period", "Dashamsha", "Amatyakaraka" etc. Describe career insights as real-world experiences and patterns. If Sinhala, write 100% pure Sinhala — zero English words.

CHART DATA:
${JSON.stringify(sectionData, null, 1)}

BIRTH DATA: Rising sign: ${lagnaEn}, Moon: ${moonEn}

⚠️ CAREER DEPTH DATA (USE THIS FOR PRECISION):
- Career Divisional Chart (D10): ${sectionData?.dashamsha ? `D10 Lagna: ${sectionData.dashamsha.d10Lagna}, Sun in D10: ${sectionData.dashamsha.d10Sun}, Saturn in D10: ${sectionData.dashamsha.d10Saturn}, 10th Lord in D10: ${sectionData.dashamsha.d10TenthLord}` : 'Not available'}
- Career Significator: ${sectionData?.amatyakaraka ? `${sectionData.amatyakaraka.planet} in ${sectionData.amatyakaraka.rashi} — ${sectionData.amatyakaraka.meaning}` : 'Not available'}
- 10th Lord Strength: ${sectionData?.tenthLordShadbala ? `${sectionData.tenthLordShadbala.totalRupas} Rupas (${sectionData.tenthLordShadbala.percentage}%) — ${sectionData.tenthLordShadbala.strength}. Strongest aspect: ${sectionData.tenthLordShadbala.strongestComponent}` : 'Not available'}
${sectionData?.lagnaCuspWarning?.isNearCusp ? `⚠️ BIRTH TIME SENSITIVITY: Lagna is at ${sectionData.lagnaCuspWarning.degreeInSign}° — near a sign boundary. Career predictions may vary if birth time is slightly off. Present both possibilities.` : ''}

USE the Career Significator planet to identify their SPECIFIC career calling — this planet's qualities directly describe their professional destiny.
USE the D10 chart data to differentiate career advice from general personality — D10 shows the PROFESSIONAL self, which may differ from the birth chart self.
USE the 10th Lord Strength to gauge career success potential — if very strong, predict exceptional career achievements.

⚠️ MANDATORY SPECIFICS — YOU MUST INCLUDE ALL OF THESE (no vague answers allowed):
- Name 3-5 EXACT job titles or specific industries (e.g., "civil engineering", "hotel management", "graphic design", "pharmaceutical sales", "property development") — NEVER use vague categories like "something creative" or "a leadership role"
- EXACT peak earning age range (e.g., "ages 38-45")
- SPECIFIC career change years if any (e.g., "expect a major career shift around 2029")
- If their career will be MEDIOCRE or STRUGGLING, say so: "Your chart shows career progress will be slower than your peers until age [X]" — do NOT pretend everyone will be a CEO
- Monthly/annual income range expectations at different life stages (relative terms OK: "comfortable middle-class income by 35, significant wealth by 45")
- Whether they'll be self-employed or employed, and when that transition happens

WRITE AT LEAST 7-9 PARAGRAPHS that feel like a personal career consultation worth thousands:

1. **YOUR PROFESSIONAL DNA** — Not generic. SPECIFIC: "You're not just 'good at leadership' — you're the type who walks into a chaotic, failing team and within 3 months, everyone is performing at their peak. You don't manage people — you UNLOCK them." OR "You're the silent strategist. While everyone's arguing in the meeting, you're already five moves ahead."

2. **YOUR CAREER KRYPTONITE** — What destroys their work motivation? "Put you in a micromanaged environment with no autonomy, and watch the fire in your eyes die within months. You NEED [specific work condition]." OR "Your weakness? You take on too much because you don't trust anyone else to do it right."

3. **THE CAREER YOU WERE BORN FOR** — Specific paths: ${(sectionData?.suggestedCareers || []).join(', ')} — for each one, explain WHY it fits their soul, not just their skills. "You'd thrive as a [career] because your chart shows [translated insight]."

4. **YOUR MONEY PERSONALITY** — "Let me tell you something about your relationship with money that you probably haven't admitted to yourself: [specific money behavior]. You [spend/save/invest] the way you do because..."

5. **WEALTH BUILDING BLUEPRINT** — "Your wealth won't come from [one source]. Your chart screams [specific wealth pattern]. The key? ${(sectionData?.dhanaYogas || []).join('; ')}." Translate into plain language.

6. **${sectionData?.businessVsService || 'Career Direction'}** — expand dramatically. If they're meant for business: "You're wasting your time building someone else's dream." If service: "Your path to wealth is through mastering your craft until you're the best in your field."

7. **YOUR PEAK EARNING WINDOW** — "There's a period coming — between [years] — where everything you've been building starts paying off MASSIVELY. Here's how to prepare RIGHT NOW..."

8. **MONEY MISTAKES TO AVOID** — "Based on your nature, you're prone to [specific financial mistake]. I've seen this pattern a hundred times in charts like yours. Here's how to break it..."

9. **THE 5-YEAR CAREER PLAN THE STARS SUGGEST:**
- **This year:** [specific career action]
- **Next year:** [build/pivot/invest in what]
- **Year 3:** [acceleration point]
- **Year 5:** [where they should be]

- Make them feel like they have a secret career advantage
- Be brutally honest about their weaknesses but empowering about their strengths`,
    },

    children: {
      title: '👶 Children & Family Life',
      prompt: `Write a warm, detailed reading about children, family life, and legacy.

REMINDER: Do NOT use any astrology terms. No "5th house", "Jupiter placement", "Putra Bhava", "Saptamsha", "Putrakaraka" etc. Describe everything as real-life family experiences. If Sinhala, write 100% pure Sinhala — zero English words.

CHART DATA:
${JSON.stringify(sectionData, null, 1)}

⚠️ CHILDREN DEPTH DATA (USE THIS FOR PRECISION):
- Children Divisional Chart (D7): ${sectionData?.saptamsha ? `D7 Lagna: ${sectionData.saptamsha.d7Lagna}, Jupiter in D7: ${sectionData.saptamsha.d7Jupiter}, 5th Lord in D7: ${sectionData.saptamsha.d7FifthLord}` : 'Not available'}
- Children Significator: ${sectionData?.putrakaraka ? `${sectionData.putrakaraka.planet} in ${sectionData.putrakaraka.rashi} — ${sectionData.putrakaraka.meaning}` : 'Not available'}
- Jupiter Strength: ${sectionData?.jupiterShadbala ? `${sectionData.jupiterShadbala.percentage}% — ${sectionData.jupiterShadbala.strength}` : 'Not available'}

USE the Children Significator planet to describe the nature and personality of their children — this planet's qualities directly describe the offspring.
USE the D7 chart to refine children count and timing — if Jupiter is well-placed in D7, children come easily; if afflicted, delays are likely.
USE Jupiter Strength to assess fertility and ease of having children — strong Jupiter = smoother path to parenthood.

⚠️ MANDATORY SPECIFICS — YOU MUST INCLUDE ALL OF THESE (no vague answers allowed):
- EXACT number of children (e.g., "most likely 2 children" or "1 child is the strongest indication"). If the chart shows difficulty having children or childlessness, say it honestly: "Your chart suggests challenges in having children — here's why and what can help..."
- APPROXIMATE timing for first child (e.g., "first child around age 30-32" or "around 2031-2033")
- Gender indication if the chart suggests it
- If adoption or assisted conception is indicated, mention it compassionately but directly
- Relationship with children — will it be close? challenging? competitive?

WRITE AT LEAST 4-5 RICH PARAGRAPHS covering ALL of these:
1. Their NATURAL PARENTING STYLE — strict? nurturing? the fun parent? helicopter? free-range? What kind of parent would they naturally be?
2. Their RELATIONSHIP WITH THEIR OWN PARENTS — patterns from childhood that shape how they parent
3. CHILDREN OUTLOOK — likelihood, timing, number. If challenging, frame beautifully: "your path may be unique but deeply meaningful"
4. The KIND OF CHILDREN they'll have — will their kids be independent? artistic? academic? How will the parent-child dynamic feel?
5. FAMILY LEGACY — what they'll pass on to the next generation beyond material things
6. Timing: ${(sectionData?.childrenTimingDasas || []).join('; ')}

- Be gentle, hopeful, and deeply personal
- Acknowledge different paths to parenthood

BONUS — FAMILY SURPRISE INSIGHTS:
- SIBLING COUNT: If available from allSections.surpriseInsights, include "You likely have [X] siblings" — Sri Lankan users go crazy when this is accurate
- FATHER'S NATURE: Include a line about their father — "Your father is likely [successful/strict/distant/loving] and works in [type of field]"
- MOTHER'S HEALTH: "Your mother's health [is generally good / needs attention around age X]"

- NO technical terms`,
    },

    lifePredictions: {
      title: '🔮 Your Life Journey — Past, Present & Future',
      prompt: `Write the most captivating, spine-tingling life prediction this person has ever read. They should feel like you've watched a movie of their entire life — past AND future. This is the CROWN JEWEL of the entire report.

REMINDER: Do NOT use any astrology terms. No "Dasha", "Mahadasha", "Antardasha", "transit", "Rahu", "Ketu", "Saturn return" etc. Describe life phases as actual events and emotions. If Sinhala, write 100% pure Sinhala — zero English words.

CHART DATA:
${JSON.stringify(sectionData, null, 1)}

⚠️ MANDATORY REALITY CHECK — ABSOLUTE RULES:
- Use the person's EXACT birth date and current age (provided in the system context) to anchor ALL predictions
- Past predictions must match ages they've ALREADY LIVED — describe specific life events at specific ages they would recognize
- Future predictions must fall within ages they can ACTUALLY reach (max ~80-85). NEVER predict anything beyond this.
- Be BRUTALLY HONEST about difficult periods — if ages 35-40 look rough, say "these years will test you in ways you can't imagine right now"
- Give SPECIFIC years for every prediction, not vague "someday" or "when the time is right"
- If health issues are indicated at certain ages, mention them directly (e.g., "around age 50, pay extra attention to your heart/joints/back")
- Do NOT make every decade sound amazing — real life has hard chapters. Include them honestly.

WRITE AT LEAST 10-12 DEEPLY PERSONAL PARAGRAPHS — this should read like a prophecy:

1. **YOUR ORIGIN STORY** — "You came into this world carrying something different. Even as a child, [specific childhood pattern]..." Describe their early years: were they the quiet observer? the wild one? the one who felt older than their age? The sensitive child who absorbed everyone's emotions? Derive from 4th house and Moon.

2. **THE WOUND THAT SHAPED YOU** — Every great story has a defining challenge. "Between the ages of [period], something happened that quietly changed the course of your life. You may not have recognized it then, but [describe the shift]." Be specific about the age and nature of the challenge.

3. **YOUR 20s DECODED** — "Your twenties were about [theme]. You were searching for [specific thing]. There were moments when you felt completely lost, and others when everything seemed to click..." Make them nod and think "yes, exactly."

4. **RIGHT NOW — THIS EXACT MOMENT IN YOUR LIFE** — This is the most important paragraph. "${currentDasha} energy is running through your life right now, with ${currentAD} energy underneath. Here's what that ACTUALLY means: [translate into specific life events]." Talk about what they're feeling RIGHT NOW — the restlessness, the decisions they're weighing, the relationships they're questioning, the ambitions stirring.

5. **THE NEXT 6 MONTHS** — Ultra-specific: "In the next few months, watch for [specific event type]. Someone or something is about to enter your life that changes your perspective on [area]. Around [specific month], there will be a moment of clarity..."

6. **2026-2027 PREDICTION** — "This period is about [specific theme]. Your career will [specific trajectory]. Your relationships will [shift]. Financially, expect [pattern]. The biggest surprise of this period? [Something unexpected]."

7. **2028-2030 — THE ACCELERATION** — "Something begins to build. The seeds you're planting now start showing real results around [year]. This is when people who doubted you start to notice..."

8. **YOUR PEAK YEARS** — "There is a golden window in your life between [year range]. During this time, [dramatic specific prediction about career/wealth/status]. This is when your life's biggest chapter unfolds."

9. **THE CHALLENGE YEARS** — Be honest but compassionate: "Around [year range], the universe will test you. This isn't punishment — it's preparation. [Describe the nature of the challenge]. Those who know you will watch you rise from this like a phoenix."

10. **YOUR LIFE'S SECRET PURPOSE** — "You are not here by accident. The pattern of your life — all the pain, the joy, the strange coincidences — they all point to one thing: you are here to [specific purpose]. Every experience has been training you for this."

11. **SPECIFIC PREDICTIONS TIMELINE:**
> **This month:** [something specific]
> **Next 3 months:** [specific event or energy shift]  
> **By end of this year:** [meaningful prediction]
> **Within 2 years:** [life-changing prediction]
> **Within 5 years:** [major milestone]
> **Within 10 years:** [vision of their life]

12. **THE CLOSING PROPHECY** — End with something SO powerful they'll want to frame it: "I have looked at thousands of charts in my life. Yours tells me one thing with absolute certainty: [powerful closing statement about their destiny]."

- Use vivid, cinematic language — this should read like a movie trailer of their life
- Be SPECIFIC about years, ages, and timeframes
- Make the past predictions so accurate that they'll trust the future ones completely
- Include at least 5 "how did they know this?" moments
- This section alone should make them recommend the app to everyone`,
    },

    mentalHealth: {
      title: '🧠 Your Mind & Inner World',
      prompt: `Write a compassionate, insightful reading about mental patterns, intellect, and emotional wellbeing.

REMINDER: Do NOT use any astrology terms. No "Mercury placement", "Moon in 4th", "Budha", "Chaturvimshamsha", "Shadbala" etc. Describe thinking and emotional patterns as real experiences. If Sinhala, write 100% pure Sinhala — zero English words.

CHART DATA:
${JSON.stringify(sectionData, null, 1)}

⚠️ CRITICAL MENTAL HEALTH INSIGHT:
- Mental Stability Assessment: ${sectionData?.mentalStability || 'N/A'}
${(sectionData?.mentalStability || '').includes('Moon-Saturn') ? '⚠️ THIS IS A MAJOR FLAG: Moon-Saturn conjunction (emotional suffering pattern) is present. This person likely experienced childhood trauma, emotional neglect, periods of depression, or a difficult home environment. This MUST be addressed prominently and compassionately in this section. Do NOT sugarcoat — acknowledge their pain but offer hope and healing paths.' : ''}

⚠️ MIND & EDUCATION DEPTH DATA (USE THIS FOR PRECISION):
- Education Divisional Chart (D24): ${sectionData?.education?.chaturvimshamsha ? `D24 Lagna: ${sectionData.education.chaturvimshamsha.d24Lagna}, Mercury in D24: ${sectionData.education.chaturvimshamsha.d24Mercury}, Jupiter in D24: ${sectionData.education.chaturvimshamsha.d24Jupiter}` : 'Not available'}
- Mercury (Intellect) Strength: ${sectionData?.mercuryShadbala ? `${sectionData.mercuryShadbala.percentage}% — ${sectionData.mercuryShadbala.strength}. Directional strength: ${sectionData.mercuryShadbala.digBala}` : 'Not available'}
- Moon (Emotions) Strength: ${sectionData?.moonShadbala ? `${sectionData.moonShadbala.percentage}% — ${sectionData.moonShadbala.strength}. Time-based strength: ${sectionData.moonShadbala.kalaBala}` : 'Not available'}

USE Mercury Strength to determine intellectual capability — high Mercury = sharp analytical mind, low = creative/intuitive thinker (NOT dumb).
USE Moon Strength to determine emotional resilience — high Moon = emotionally stable, low = emotionally sensitive and deep-feeling (NOT weak).
USE D24 chart to refine education predictions — Mercury well-placed in D24 = academic success, Jupiter well-placed = wisdom and advanced degrees.

WRITE AT LEAST 5-6 RICH PARAGRAPHS covering ALL of these:
1. Their THINKING STYLE — analytical? creative? intuitive? scattered? laser-focused? How does their mind actually work?
2. Their EMOTIONAL PATTERNS — what triggers anxiety? what brings peace? how do they handle stress? do they bottle up or explode?
3. Their INTELLIGENCE TYPE — book smart? street smart? emotionally intelligent? spatial? musical? Which learning style suits them?
4. Their INNER CRITIC — what negative self-talk plays on repeat? "I'm not good enough"? "I don't deserve this"? How to silence it
5. MENTAL HEALTH TOOLKIT — specific activities that would genuinely help THEM (not generic "try meditation"): based on their nature, what specific practices would work?
6. Their DREAM LIFE — what does inner peace look like for them? What would their ideal mental state feel like?

- Be compassionate, not clinical
- Acknowledge that struggles are part of their strength
- Give real, actionable mental health advice
- NO jargon`,
    },

    business: {
      title: '📈 Business & Growth Opportunities',
      prompt: `Write a strategic, motivating business and entrepreneurship reading.

REMINDER: Do NOT use any astrology terms. No "10th house", "business yoga", "Dasha period" etc. Write like a practical business advisor. If Sinhala, write 100% pure Sinhala — zero English words.

CHART DATA:
${JSON.stringify(sectionData, null, 1)}

WRITE AT LEAST 4-5 RICH PARAGRAPHS covering ALL of these:
1. Their ENTREPRENEURIAL DNA — are they a founder type? an intrapreneur? a solo freelancer? a partnership builder?
2. SPECIFIC BUSINESS IDEAS that genuinely suit them: ${(sectionData?.bestBusinessTypes || []).join(', ')} — explain WHY and HOW
3. Their BUSINESS SUPERPOWERS and BLIND SPOTS — what they'll naturally excel at and what they'll need help with
4. TIMING — peak business launch windows. When to start, when to scale, when to pivot
5. PARTNERSHIP DYNAMICS — should they go solo or find a co-founder? What kind of business partner would complement them?
6. Best periods: ${(sectionData?.bestPeriods || []).map(p => p.lord + ': ' + p.period).join('; ')}

- Be specific and actionable, like a startup advisor
- NO jargon`,
    },

    transits: {
      title: '🌍 What\'s Happening Right Now',
      prompt: `Write an urgent, personal "right now" reading — this should feel like checking the weather for their life.

REMINDER: Do NOT use any astrology terms. No "transit", "Sade Sati", "Saturn return", "Rahu Kala" etc. Describe current energies as real feelings and events. If Sinhala, write 100% pure Sinhala — zero English words.

CHART DATA:
Overall Transit Score: ${sectionData?.overallTransitScore || 'N/A'}/100
Major Events Active: ${(sectionData?.majorEvents || []).map(e => e.event + ' (' + e.severity + '): ' + e.description).join(' | ') || 'None'}
Sade Sati: ${sectionData?.sadheSati?.active ? 'ACTIVE — ' + sectionData.sadheSati.phase + '. ' + sectionData.sadheSati.note : 'Not active'}
Activated Houses: ${sectionData?.activatedHouses ? Object.entries(sectionData.activatedHouses).map(([h, ps]) => 'House ' + h + ': ' + ps.join(', ')).join(' | ') : 'N/A'}

ALL PLANET TRANSITS:
${sectionData?.allTransits ? Object.values(sectionData.allTransits).map(t => `${t.name}: ${t.currentSign} ${t.degree}° (House ${t.houseFromLagna} from Asc, House ${t.houseFromMoon} from Moon)${t.isRetrograde ? ' [RETROGRADE]' : ''} — Ashtakavarga: ${t.ashtakavargaBindus} (${t.binduQuality})${t.natalConjunctions ? ' — CONJUNCT natal ' + t.natalConjunctions.join(', ') : ''}${t.natalOppositions ? ' — OPPOSES natal ' + t.natalOppositions.join(', ') : ''}`).join('\n') : JSON.stringify(sectionData, null, 1)}

WRITE AT LEAST 4-5 RICH PARAGRAPHS covering ALL of these:
1. THIS WEEK/MONTH — what energies are active RIGHT NOW? What should they focus on? What to avoid?
2. OPPORTUNITIES KNOCKING — specific doors that are open right now. Career? Love? Money? Health?
3. WARNINGS — challenges to watch for.${sectionData?.sadheSati?.active ? ' Major life restructuring is active — explain what this means for their daily life without using any technical terms.' : ''} ${(sectionData?.majorEvents || []).length > 0 ? 'Major cosmic events detected: describe each in human terms.' : ''}
4. ENERGY FORECAST — their emotional, physical, and mental energy levels right now. The overall cosmic score is ${sectionData?.overallTransitScore || 50}/100.
5. ACTION PLAN — at least 5 specific, practical things to do RIGHT NOW:
   "This week: ..."
   "This month: ..."
   "Avoid: ..."
   "Best day for big decisions: ..."
   "Focus your energy on: ..."

- Make it feel urgent, relevant, almost like a personal daily briefing
- Reference specific planet effects but describe them as energies, forces, or cosmic influences — NEVER the planet names
- NO astrological terms`,
    },

    realEstate: {
      title: '🏠 Property, Home & Assets',
      prompt: `Write a practical, detailed reading about property, home life, and material assets.

REMINDER: Do NOT use any astrology terms. No "4th house", "Mars in property sector" etc. Write practical property/home advice. If Sinhala, write 100% pure Sinhala — zero English words.

CHART DATA:
${JSON.stringify(sectionData, null, 1)}

WRITE AT LEAST 4-5 RICH PARAGRAPHS covering ALL of these:
1. Will they OWN PROPERTY? Multiple properties? Land? Apartments? What type suits them?
2. Their IDEAL HOME — city apartment? suburban house? countryside? near water? What environment makes them thrive?
3. BEST TIME TO BUY — specific timing windows from: ${(sectionData?.bestPeriodsForProperty || []).map(p => p.lord + ': ' + p.period).join('; ')}
4. Property indicators: ${(sectionData?.propertyYoga || []).join('; ')}
5. INHERITANCE & FAMILY ASSETS — will they receive? When?
6. HOME AS SANCTUARY — what their home should feel like for maximum wellbeing
7. PRACTICAL real estate advice specific to their chart

- Be practical and specific
- NO jargon`,
    },

    employment: {
      title: '🏅 Career Growth & Promotions',
      prompt: `Write a detailed career growth roadmap reading.

REMINDER: Do NOT use any astrology terms. No "10th lord", "promotion dasha" etc. Write like a career mentor giving real advice. If Sinhala, write 100% pure Sinhala — zero English words.

CHART DATA:
${JSON.stringify(sectionData, null, 1)}

WRITE AT LEAST 4-5 RICH PARAGRAPHS covering ALL of these:
1. Their LEADERSHIP STYLE — are they a quiet leader? a visionary? a hands-on manager? What's their natural authority style?
2. PROMOTION TIMELINE — when will the big career jumps happen? Specific periods: ${(sectionData?.promotionPeriods || []).map(p => p.lord + ': ' + p.period + ' — ' + p.reason).join('; ')}
3. JOB CHANGES — when will they switch? Will it be voluntary or forced? Will it be positive?
4. Their CAREER PEAK — when does authority and recognition reach its highest? What will that look like?
5. Career paths: ${(sectionData?.careerPaths || []).slice(0, 8).join(', ')}
6. PRACTICAL ADVICE — when to negotiate salary, when to stay put, when to take risks

- Be motivating and specific
- NO jargon`,
    },

    financial: {
      title: '💰 Your Money Blueprint',
      prompt: `Write an honest, deeply personal financial reading — like getting advice from your wisest, richest uncle.

REMINDER: Do NOT use any astrology terms. No "2nd house", "11th lord", "Dhana yoga" etc. Write like a wise family elder giving money advice. If Sinhala, write 100% pure Sinhala — zero English words.

CHART DATA:
${JSON.stringify(sectionData, null, 1)}

WRITE AT LEAST 5-6 RICH PARAGRAPHS covering ALL of these:
1. Their MONEY PERSONALITY — what's their emotional relationship with money? Fear? Freedom? Control? Security?
2. INCOME STREAMS — will they earn from one source or multiple? What type of income suits them best?
3. SPENDING PATTERNS — where does their money leak? What are their guilty pleasures? What expenses they should cut?
4. INVESTMENT STRATEGY — what types of investments suit their nature? ${(sectionData?.investmentAdvice || []).join('; ')}
5. WEALTH BUILDING TIMELINE — when does money start flowing? Peak earning years? When to be extra careful?
6. FINANCIAL RISKS — periods of potential loss, unexpected expenses. How to protect themselves
7. PRACTICAL MONEY RULES — 5 specific financial habits they should adopt based on their nature

- Sound like a wise, caring family elder giving money advice
- Be honest about both strengths and weaknesses
- NO jargon`,
    },

    timeline25: {
      title: '📅 Your Next 25 Years — The Movie of Your Life',
      prompt: `Write the most EPIC, spine-tingling 25-year life prediction ever written. This should read like the screenplay for the movie of their life — complete with plot twists, triumphs, challenges, love stories, and a breathtaking climax.

REMINDER: Do NOT use any astrology terms. No "Dasha", "Mahadasha", "Antardasha", "Bhukti" etc. Describe each era using real events, emotions, and life milestones. If Sinhala, write 100% pure Sinhala — zero English words.

CHART DATA:
${JSON.stringify(sectionData, null, 1)}

⚠️ CRITICAL LIFESPAN RULE — READ CAREFULLY:
- The person's current age and birth year are in the system context. Calculate the END of the 25-year window.
- If the 25-year window would push them PAST age 80, SHORTEN the timeline to end at age ~80. For example, if they're 65, write a 15-year timeline, not 25.
- If they're young (20s-30s), the full 25 years is fine.
- EVERY year reference must be a REAL calendar year (e.g., 2027, 2032, 2041). NEVER use years beyond the person turning ~80.
- Include AT LEAST 2-3 genuinely DIFFICULT years — not every year can be "amazing". Real life has recessions, heartbreaks, health scares, career setbacks. Include them.
- Be SPECIFIC about what happens each era — not "good things come your way" but "a promotion to senior management" or "your second child is born" or "a property investment pays off significantly"

WRITE AT LEAST 10-14 DEEPLY CINEMATIC PARAGRAPHS — one for each life era:

For EACH PERIOD, create a mini-movie scene:

1. **THE OPENING SCENE (Now - 2 years)** — "Right now, as you read these words, something is already shifting. You can feel it, can't you? That restlessness... that sense that you're on the edge of something. Here's what's happening behind the scenes of your life: [ultra specific current energy]..."

2. **ACT ONE: THE AWAKENING (2-5 years)** — "Between [year]-[year], the fog lifts. A decision you make around [specific year] — one that feels scary in the moment — becomes the best decision of your life. Career: [specific]. Love: [specific]. Money: [specific pattern]."

3. **THE FIRST PLOT TWIST (5-7 years)** — "Around [year], just when you think you've figured life out, the universe throws you a curveball. But here's the thing — this 'disruption' is actually the best thing that ever happens to you because it pushes you toward [something you'd never have chosen voluntarily]."

4. **ACT TWO: THE RISE (7-10 years)** — "This is where the world starts to notice. Between [year]-[year], what was private becomes public. Your work, your reputation, your influence — it expands in ways you can barely imagine right now."

5. **THE GOLDEN YEARS (10-15 years)** — "If your life were a mountain, this is the summit. Between [year]-[year], you reach a peak that makes all the climbing worth it. [Specific career/financial/relationship milestone]."

6. **THE DEEP WATERS (15-18 years)** — "Every great story has a chapter of depth. This isn't darkness — it's depth. A period where you go inward, question everything, and emerge with a wisdom that makes you almost untouchable."

7. **ACT THREE: THE LEGACY (18-25 years)** — "By [year], you're no longer chasing success — success has found a permanent home in your life. The focus shifts to [meaning/impact/legacy]. People look at your life and wonder how you built something so remarkable."

8. For EACH era, include:
   - **Emotional weather:** How they'll FEEL during this period
   - **Career trajectory:** Specific changes, peaks, pivots
   - **Love story arc:** Single/partnered/deepening/challenging
   - **Health & energy:** Physical vitality, what to watch
   - **Financial wave:** Abundance/caution/investment/windfall
   - **Spiritual evolution:** How their inner world transforms

9. **KEY TURNING-POINT YEARS:** Mark specific years that will be game-changers:
> **[Year]:** The year everything changes direction
> **[Year]:** The year of unexpected abundance  
> **[Year]:** The year of the biggest challenge
> **[Year]:** The year you find your ultimate purpose
> **[Year]:** The year your legacy is sealed

10. **THE FINAL SCENE** — End with a powerful vision: "I want you to imagine yourself in [25 years from now]. You're sitting somewhere beautiful — a place you built with your own hands, surrounded by people who love you for exactly who you are. The person you are TODAY is the seed. This report is the map. The journey? That's yours to live."

- Use vivid, cinematic, dramatic language throughout
- Specific years, specific predictions, specific milestones
- This should feel like reading a prophecy written specifically for them
- Make them EXCITED about every chapter — even the hard ones
- This is the section they'll re-read on their birthday every year`,
    },

    remedies: {
      title: '💎 Your Personal Power Toolkit',
      prompt: `Write a practical, magical, deeply personal guide to enhancing their life energy. This should feel like receiving a custom-made power manual that nobody else in the world has.

REMINDER: Do NOT use any astrology terms. No "weak planet", "Lagna gem", "benefic", "malefic" etc. Present everything as practical lifestyle tips, lucky items, and empowering habits. If Sinhala, write 100% pure Sinhala — zero English words.

CHART DATA:
${JSON.stringify(sectionData, null, 1)}

WRITE AT LEAST 7-9 RICH PARAGRAPHS that feel like receiving ancient wisdom:

1. **YOUR POWER STONE** — Their primary gemstone, but presented like discovering a magical artifact: "There is ONE stone on this planet that was practically made for your energy: **[gemstone]**. When you wear it on your [finger] on a [day], something subtle but real shifts. Your confidence sharpens. Opportunities seem to find you. People who've worn their power stone describe it as 'turning the volume up on luck.'" Include: which finger, which day to first wear, how to activate it.

2. **YOUR LUCKY COLORS** — Not just a list. "Your power color is **[color]**. On days when you have a big meeting, a first date, or a scary decision to make — wear it. Even if it's just socks or a phone case. It sounds ridiculous until you try it and realize it works." Include daily color guidance.

3. **YOUR POWER DAY** — "**[Day]** is YOUR day. Schedule your most important calls, interviews, proposals, and decisions on this day whenever possible. Your energy is naturally amplified. If you've been putting off asking for a raise — do it on a [day]."

4. **YOUR MORNING RITUAL** — A personalized 10-minute morning routine: "Based on your specific energy pattern, here's the most powerful morning you can have:
- **First 3 minutes:** [specific activity derived from their chart — not generic meditation]
- **Next 3 minutes:** [specific gratitude/visualization practice tailored to their goals]
- **Last 4 minutes:** [specific physical movement that activates their energy]"

5. **YOUR WEEKLY POWER SCHEDULE:**
- **Monday:** [specific activity + why it matters for them]
- **Tuesday:** [tailored recommendation]
- **Wednesday:** [tailored recommendation]
- **Thursday:** [tailored recommendation]
- **Friday:** [tailored recommendation]
- **Saturday:** [tailored recommendation]
- **Sunday:** [tailored recommendation]

6. **FOODS THAT FUEL YOUR CHART** — "Your body responds especially well to [specific foods]. On your power day, eat [specific meal suggestion]. Avoid [specific food] on days when you need mental clarity." Be specific and Sri Lankan when possible.

7. **TEMPLES & SACRED PLACES** — Specific Sri Lankan temples that amplify their energy: "Visit **[specific temple name]** at least once. The energy of that place resonates with your chart in a way that's hard to explain until you feel it." Include 2-3 specific temples with reasons.

8. **YOUR PROTECTION PRACTICE** — "When life feels heavy, when you're surrounded by negative people, or when things aren't going your way, do this: [specific protection practice]. This isn't superstition — it's energy management."

9. **THE ONE HABIT THAT CHANGES EVERYTHING** — "If you do NOTHING else from this entire report, do this one thing: [ONE specific, practical habit derived from their weakest planet]. Do it for 21 days and watch what shifts."

- Make it feel like a lifestyle guide from a mystical mentor
- Modern, practical, Instagram-worthy advice that actually works
- Include specific Sri Lankan temples by name
- Every recommendation should feel personally tailored, not generic`,
    },

    yogaAnalysis: {
      title: '🪐 Your Hidden Superpowers',
      prompt: `Write about their secret superpowers — abilities coded into their birth chart that most people (including themselves) don't fully see yet. This should make them feel like they just discovered they have REAL powers.

REMINDER: Do NOT use any astrology terms. No "Yoga", "Raja Yoga", "Dhana Yoga", "Gajakeshari", "Budhaditya", "benefic", "malefic", "Dosha" etc. Describe superpowers as real-world abilities and talents. Describe challenges as real-life obstacles, NOT astrological afflictions. If Sinhala, write 100% pure Sinhala — zero English words.

CHART DATA:
${JSON.stringify(sectionData, null, 1)}

⚠️ ENRICHED DATA NOTE: This section now contains BOTH basic combinations (${(sectionData?.yogas || []).length} classical) AND advanced combinations (${(sectionData?.advancedYogas || []).length} advanced patterns). Together these represent ${(sectionData?.yogas || []).length + (sectionData?.advancedYogas || []).length} total hidden patterns in this chart.

Additionally, ${(sectionData?.doshas || []).length} karmic challenge patterns (doshas) are included. These are NOT curses — they are areas where the person must grow. Present them as growth opportunities, not doom.

For each ADVANCED yoga, the data includes which planets are involved and in which signs — use this for ultra-specific descriptions of the superpower.
For each DOSHA, the data includes severity and remedies — present the remedy as a "power-up" tip, not a fear-based warning.

CHART DATA:
${JSON.stringify(sectionData, null, 1)}

WRITE AT LEAST 6-8 PARAGRAPHS that make them feel genuinely special:

1. **THE SUPERPOWER THEY DON'T KNOW THEY HAVE** — "You have an ability that most people would pay millions for, and you don't even realize you're doing it. It's [specific power derived from strongest yoga/planet]. When you [specific situation], something almost supernatural happens — [describe the effect]. People around you have noticed. You probably haven't."

2. ${(sectionData?.yogas || []).length === 0 ? '**YOUR HIDDEN COMBINATION** — "Your chart doesn\'t have the classical \'textbook\' combinations — which is actually MORE interesting. It means your gifts are UNIQUE, not template-based. Here\'s what makes your chart one-of-a-kind: [describe unique planet positions and what they mean as real-world abilities]."' : '**YOUR SPECIAL COMBINATIONS** — For each of their ' + sectionData.yogas.length + ' combinations, give it a dramatic, memorable name and explain what it means in real life:'}

3. ${(sectionData?.yogas || []).map((y, i) => `**SUPERPOWER #${i+1}: "${y.name}" — THE [fun name]** — "This is ${y.strength === 'Very Strong' ? 'EXTREMELY rare and powerful' : y.strength === 'Strong' ? 'a significant gift' : 'a subtle but real ability'}. In plain language, it means: [vivid real-world description]. You've already used this power — think about a time when [specific example they'd recognize]... that was this energy at work."`).join('\n\n')}

4. **YOUR STRONGEST ENERGY** — "If your life were a video game, your MAIN STAT would be [specific ability]. You're naturally built for [specific domain]. This isn't something you learned — it's something you were BORN with."

5. **YOUR WEAKEST LINK** — "Now here's the honest part. Every superhero has a vulnerability, and yours is [specific weak area]. This shows up as [specific real-world manifestation]. But here's the secret: this weakness is actually the doorway to your biggest growth."

6. **HOW TO ACTIVATE YOUR POWERS** — "Most people go through life with their superpowers on 'standby mode.' Here's how to switch yours to FULL POWER:
- [Specific daily practice for power #1]
- [Specific weekly practice for power #2]  
- [Specific life decision that unlocks their potential]"

7. **BENEFIC ENERGIES helping you**: ${(sectionData?.functionalBenefics || []).join(', ')} — translate each into a real-world advantage
8. **CHALLENGING ENERGIES to manage**: ${(sectionData?.functionalMalefics || []).join(', ')} — translate each into a real-world area needing attention

- Make them feel like they just discovered a cheat code for life
- Every person has something extraordinary — find it and CELEBRATE it
- Use dramatic, empowering language that makes them want to share this section`,
    },

    health: {
      title: 'සෞඛ්‍ය සැලැස්ම — Your Complete Health Blueprint',
      prompt: `You are writing the MOST COMPREHENSIVE HEALTH ANALYSIS this person has ever read. This is NOT a generic health section — this is a deeply personal body-mind-soul health map that will make them think you've been watching their medical history.

Birth details: Born under ${lagnaEn} rising, Moon in ${moonEn}, Nakshatra: ${nakshatraName}
Current life period: ${currentDasha} main period, ${currentAD} sub-period

HEALTH DATA FROM CHART:
- Overall vitality: ${sectionData?.overallVitality || 'N/A'}
- Mental health indicator: ${sectionData?.mentalHealthIndicator || 'N/A'}
${(sectionData?.mentalHealthIndicator || '').includes('Moon-Saturn') ? '⚠️ CRITICAL: Moon-Saturn conjunction detected — this person is highly susceptible to anxiety, depression, and emotional trauma. The MENTAL HEALTH DEEP DIVE section (#9) must address childhood emotional patterns, suppressed feelings, and provide serious healing recommendations. Do NOT skip or minimize this.' : ''}
- Longevity indicator: ${sectionData?.longevityIndicator || 'N/A'}
- Body areas at risk: ${JSON.stringify(sectionData?.bodyRisks || [])}
- Health vulnerabilities: ${JSON.stringify(sectionData?.healthVulnerabilities || [])}
- Danger periods: ${JSON.stringify(sectionData?.dangerPeriods || [])}
- Diet recommendations: ${JSON.stringify(sectionData?.dietRecommendations || [])}
- Shadbala Summary: ${sectionData?.shadbalaSummary ? `Weakest planet: ${sectionData.shadbalaSummary.weakestPlanet} (${sectionData.shadbalaSummary.weakestScore}%), Strongest: ${sectionData.shadbalaSummary.strongestPlanet} (${sectionData.shadbalaSummary.strongestScore}%). Note: ${sectionData.shadbalaSummary.note}` : 'N/A'}

⚠️ PRECISION NOTE: Health vulnerability scores are based on 6-component Shadbala analysis (positional, directional, temporal, motional, natural, and aspectual strength). Each vulnerability includes the weakest component — use this to give MORE SPECIFIC health advice.

WRITE AT LEAST 10-12 DEEPLY PERSONAL, DETAILED PARAGRAPHS covering ALL of these:

1. **YOUR BODY TYPE & CONSTITUTION** — What Ayurvedic body type (Vata/Pitta/Kapha) this person likely has based on their birth energy. Describe their natural body build, metabolism speed, skin type, hair type. "You're likely lean-built with fast metabolism and dry skin" or "You tend to gain weight around the midsection easily." Make them nod in recognition.

2. **YOUR BODY'S NATURAL STRENGTHS** — What health advantages this person was born with. Strong immune system? Good bone density? Excellent cardiovascular health? Powerful digestion? Be specific about what their body does WELL.

3. **YOUR BODY'S WEAK POINTS — ORGAN BY ORGAN** — Go through each vulnerable body system in detail. For EACH weak area:
   - Name the specific organ/system (stomach, liver, kidneys, lungs, spine, joints, eyes, etc.)
   - At what AGE it becomes most vulnerable
   - What symptoms to watch for
   - Preventive measures SPECIFIC to that area
   Example: "Your digestive system is your most sensitive area. After age 35, you may notice acidity, bloating, or food sensitivities. The specific trigger for you is stress — when you're anxious, your gut is the first thing that reacts."

4. **YOUR HEALTH TIMELINE — DECADE BY DECADE**:
   - 20s: What health patterns to watch
   - 30s: What changes to expect, what screenings to get
   - 40s: Critical health shifts, what to prioritize
   - 50s-60s: Major health decisions, what to protect
   Use the danger periods data for SPECIFIC year ranges.

5. **YOUR RELATIONSHIP WITH FOOD** — Not generic diet advice. Describe their actual eating patterns: "You're probably someone who skips meals when stressed" or "You tend to emotionally eat — especially sweets late at night." Then give SPECIFIC Sri Lankan food remedies:
   - Name EXACT Sri Lankan foods: gotukola, karavila (bitter gourd), kohila, murunga (moringa), ranawara, polpala, beli mal (bael), veniwel geta, iramusu
   - Give specific recipes/preparations: "Drink kottamalli (coriander) water every morning" or "Eat a handful of raw gotukola leaves mixed with coconut 3 times a week"
   - Sri Lankan herbal teas: beli mal tea, polpala tea, ranawara tea — specify which is best for THIS person

6. **ADDICTION & HABIT RISKS** — Be honest but gentle. Based on their birth energy, are they prone to:
   - Alcohol sensitivity? "Your body processes alcohol differently — even small amounts hit you harder"
   - Smoking/tobacco? "If you've ever tried smoking, your lungs are more vulnerable than average"
   - Sugar addiction? "You have a specific weakness for sweets that's written into your energy"
   - Screen addiction/phone dependency? 
   - Caffeine sensitivity?

7. **SEXUAL & REPRODUCTIVE HEALTH** — Tastefully but honestly:
   - For males: Testosterone levels, prostate awareness age, fertility timeline
   - For females: Menstrual regularity patterns, PCOS/hormonal awareness, fertility window
   - General: Libido patterns across life, what affects their intimate health

8. **SLEEP & ENERGY PATTERNS** — When do they have most energy? "You're NOT a morning person — your peak energy comes between 10AM-2PM and again at 9PM-12AM" or "You're a morning warrior but crash hard by 4PM." Also: sleep quality, dream patterns, insomnia triggers.

9. **MENTAL HEALTH DEEP DIVE** — Not surface-level. Address:
   - Their specific anxiety triggers (social? financial? health-related? relationship?)
   - Depression vulnerability: When are they most at risk? What seasonal patterns?
   - Overthinking patterns: "Your mind doesn't have an OFF switch — especially between 11PM-3AM"
   - Anger patterns: "You hold it in until you explode" or "You express it immediately but regret it"

10. **PANDEMIC & ENVIRONMENTAL SENSITIVITY** — How does their body react to:
    - Climate changes (monsoon season health, dry season skin issues)
    - Environmental allergies specific to Sri Lanka (dust, humidity, certain trees)
    - "You probably get sick more during [specific season] and feel strongest during [season]"

11. **YOUR LONGEVITY BLUEPRINT** — Based on the longevity indicator, give an honest but hopeful assessment. "Your chart shows strong life force — with proper care, you're built for a long, active life" or "You need to be MORE careful than average because [specific reason]."

12. **YOUR PERSONAL HEALTH POWER TOOLKIT** — Sri Lankan specific remedies:
    - Which SPECIFIC Buddhist/Hindu temples to visit for health blessings
    - Which color to wear on which day for health energy
    - Specific gemstone for health protection
    - One Ayurvedic practice that is PERFECT for their constitution
    - "Drink [specific herbal water] every morning for 30 days and watch the difference"

REMINDER: Write as a caring elder who genuinely cares about their health. NEVER use words like "malefic", "afflicted", "debilitated", "6th house", "8th house". Say "your body's sensitive areas", "when your energy dips", "your healing foods". Be WARM but HONEST — if there's a real health risk, don't hide it. Just frame it with hope and actionable advice.
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English word.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish (Sinhala words in English letters).' : 'Write in warm, caring English.'}`,
    },

    marriedLife: {
      title: 'විවාහ ජීවිතය — Your Married Life',
      prompt: `You are writing the MARRIED LIFE section — this is SEPARATE from the Love & Relationships section. That section covers dating, finding love, and the soulmate blueprint. THIS section is specifically about LIFE AFTER MARRIAGE — the daily reality of being married, spouse dynamics, in-laws, and long-term relationship quality.

Birth details: Born under ${lagnaEn} rising, Moon in ${moonEn}, Nakshatra: ${nakshatraName}
Current life period: ${currentDasha} main period, ${currentAD} sub-period

MARRIAGE LIFE DATA FROM CHART:
- Marriage indicators: ${JSON.stringify(sectionData?.marriageIndicators || sectionData || {})}
- Spouse nature (Darakaraka): ${sectionData?.darakaraka ? `${sectionData.darakaraka.planet} in ${sectionData.darakaraka.rashi} — ${sectionData.darakaraka.spouseNature}` : 'N/A'}
- Upapada Lagna: ${sectionData?.upapadaLagna ? `${sectionData.upapadaLagna.rashi} — ${sectionData.upapadaLagna.meaning}` : 'N/A'}
- Navamsha D9 Analysis: ${sectionData?.navamshaAnalysis ? `D9 Lagna: ${sectionData.navamshaAnalysis.d9LagnaSign}, Venus in D9: ${sectionData.navamshaAnalysis.venusInNavamsha}, Marriage Strength: ${sectionData.navamshaAnalysis.marriageStrength}` : 'N/A'}
- Mangala Dosha: ${sectionData?.kujaDosha?.present ? 'Present — ' + (sectionData.kujaDosha.severity || 'moderate') : 'Not present'}

⚠️ CRITICAL AGE AWARENESS:
- Use the person's CURRENT AGE from the system context.
- If they are under 24: Write FUTURE-TENSE predictions about what their married life WILL look like
- If 24-35: Mix future predictions with "if you're already married, this is what you're experiencing"
- If 35+: ASSUME they are married. Write about their CURRENT married life, challenges, growth, and future of the relationship

THIS IS A SRI LANKAN AUDIENCE — married life topics that RESONATE:
- In-law relationships (මාමා/නැන්දා dynamics) — this is HUGE in Sri Lanka
- Joint family vs separate household tension
- Financial control in marriage — who manages the money?
- Children timing pressure from family
- Spouse's career vs homemaking balance
- Communication gaps between husband and wife
- Romance dying after children
- WhatsApp/phone trust issues (modern Sri Lankan couples)
- Property/land ownership in marriage
- Dowry dynamics (if applicable)

WRITE AT LEAST 8-10 DETAILED PARAGRAPHS:

1. **YOUR SPOUSE'S TRUE NATURE** — Based on the Darakaraka, describe who this person will live with daily. Not the romantic version — the REAL one. "Your spouse is someone who [specific daily habits]. They're the type who [morning routine, communication style, arguing style]."

2. **FIRST YEAR OF MARRIAGE** — What the adjustment period looks like. "The first year will be [easy/challenging] because..." Sri Lankans care DEEPLY about the first year — it sets the tone.

3. **THE POWER DYNAMIC** — Who will be the dominant partner? "In your marriage, you'll be the [decision-maker/peacekeeper/emotional anchor]. Your spouse will be the [provider/organizer/emotional one]." Be specific about financial decisions, household decisions, child-rearing decisions.

4. **IN-LAW DYNAMICS** — This is THE #1 marriage issue in Sri Lanka. "Your relationship with your [mother-in-law/father-in-law] will be [detailed prediction]. The key challenge is [specific issue]. To navigate this: [specific advice]."

5. **FIGHTS & FORGIVENESS** — "When you and your spouse fight, the pattern will be: [one of you goes silent / one raises voice / one walks away]. The danger period for major arguments is [specific year range]. The secret to your marriage surviving is: [specific technique]."

6. **INTIMACY AFTER MARRIAGE** — Tastefully but honestly: How physical intimacy evolves over time. "In the early years, [pattern]. After children, [pattern]. The key to keeping the spark is [specific to their chart]."

7. **CHILDREN IN MARRIAGE** — How children will affect the marriage dynamic. "Having children will [strengthen/test] your bond. The transition from couple to parents will be [description]."

8. **MONEY IN MARRIAGE** — "Financial arguments are [likely/unlikely] in your marriage. The main tension will be about [spending vs saving / property decisions / supporting parents / children's education]."

9. **THE 7-YEAR TEST** — Sri Lankan tradition and Vedic astrology both recognize the 7-year cycle in marriage. "Around the 7th year of marriage, you'll face [specific challenge]. This is the test that either breaks or deepens the bond."

10. **SECOND MARRIAGE POSSIBILITY** — If indicators exist, address honestly. If not, reassure: "Your chart shows one strong, lasting marriage."

11. **YOUR MARRIAGE SURVIVAL GUIDE** — Practical, Sri Lanka-specific advice: "Every [time period], go to [specific temple] together. Practice [specific ritual]. The secret weapon for your marriage is [specific activity/habit]."

REMINDER: NEVER use astrological jargon. Say "your marriage energy", "the bond between you two", "your partnership power". NOT "7th house lord", "Venus in 12th", "Kuja Dosha effects".
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English word.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish (Sinhala words in English letters).' : 'Write in warm, honest, relatable English.'}`,
    },

    foreignTravel: {
      title: 'Foreign Travel & Living Abroad',
      prompt: `You are writing the FOREIGN TRAVEL & LIVING ABROAD section of a personal astrology report.

Birth details: Born under ${lagnaEn} rising, Moon in ${moonEn}, Nakshatra: ${nakshatraName}
Current life period: ${currentDasha} main period, ${currentAD} sub-period

FOREIGN TRAVEL DATA FROM CHART:
- Foreign likelihood: ${sectionData?.foreignLikelihood || 'N/A'}
- Foreign indicators: ${JSON.stringify(sectionData?.foreignIndicators || [])}
- Travel periods: ${JSON.stringify(sectionData?.travelPeriods || [])}
- Suggested direction: ${JSON.stringify(sectionData?.suggestedDirection || {})}
- Visa success: ${sectionData?.visaSuccess || 'N/A'}
- Settlement abroad: ${sectionData?.settlementAbroad ? 'Yes' : 'No'}

Write a compelling foreign travel analysis covering:

1. **WILL YOU GO ABROAD?** — Clear yes/no/maybe with explanation. Sri Lankans desperately want to know this — be direct and honest
2. **WHICH COUNTRY OR DIRECTION?** — Use the suggested direction data to name specific countries. "Your chart points toward Western countries — UK, Canada, Australia are most favored"
3. **WHEN IS THE BEST TIME TO APPLY?** — Specific timing based on travel periods. "Between 2025-2028 is your strongest visa window"
4. **VISA SUCCESS** — Will visa applications succeed? When to apply for best results?
5. **WILL YOU SETTLE OR RETURN?** — Whether they'll stay abroad permanently or return to Sri Lanka
6. **SURPRISE TRAVEL INSIGHT** — Include a specific prediction like "You'll visit a cold country first" or "Your first overseas trip will be work-related, not personal" or "Someone you meet abroad will change your life direction"

REMINDER: NEVER use words like "9th house", "12th house", "Rahu", "natal chart". Say things like "your travel energy", "your overseas destiny", "the universe is guiding you toward", "your passport window opens".
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English word.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish (Sinhala words in English letters).' : 'Write in warm, exciting English.'}`,
    },

    legal: {
      title: 'Legal, Enemies & Protection',
      prompt: `You are writing the LEGAL, ENEMIES & PROTECTION section of a personal astrology report.

Birth details: Born under ${lagnaEn} rising, Moon in ${moonEn}, Nakshatra: ${nakshatraName}
Current life period: ${currentDasha} main period, ${currentAD} sub-period

LEGAL & PROTECTION DATA FROM CHART:
- Enemy profile: ${sectionData?.enemyProfile || 'N/A'}
- Legal indicators: ${JSON.stringify(sectionData?.legalIndicators || [])}
- Legal case periods: ${JSON.stringify(sectionData?.legalCasePeriods || [])}
- Protection advice: ${JSON.stringify(sectionData?.protectionAdvice || [])}
- 6th lord position: ${JSON.stringify(sectionData?.sixthLord || {})}

Write a protective, empowering analysis covering:

1. **YOUR SHIELD STRENGTH** — How naturally protected this person is from enemies and obstacles
2. **WHO ARE YOUR HIDDEN ENEMIES?** — Profile of the type of people who may cause trouble (don't name individuals, describe personality types). Sri Lankan users LOVE this — "Watch out for a person at work who smiles at you but talks behind your back"
3. **LEGAL MATTERS** — Will they face court cases, land disputes, property issues? Very relevant in Sri Lanka
4. **WHEN TO BE EXTRA CAREFUL** — Specific periods when conflicts are most likely based on the data
5. **YOUR PROTECTION TOOLKIT** — Practical advice for staying safe and overcoming enemies
6. **SURPRISE ENEMY INSIGHT** — Include a specific prediction like "An old friend may turn into a rival around age 35" or "Someone jealous of your success will try to block you — but they'll fail" or "A family dispute about land or money will arise but resolve in your favor"

REMINDER: NEVER use astrological jargon. Say "people who wish you harm", "your protection energy", "periods when you need to watch your back", "your guardian strength". NOT "6th house", "dusthana", "malefic aspects".
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English word.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish (Sinhala words in English letters).' : 'Write in direct, protective English.'}`,
    },

    education: {
      title: 'Education & Knowledge Path',
      prompt: `You are writing the EDUCATION & KNOWLEDGE PATH section of a personal astrology report.

Birth details: Born under ${lagnaEn} rising, Moon in ${moonEn}, Nakshatra: ${nakshatraName}
Current life period: ${currentDasha} main period, ${currentAD} sub-period

EDUCATION DATA FROM CHART:
- Academic strength: ${sectionData?.academicStrength || 'N/A'}
- Mercury (intellect): house ${sectionData?.mercury?.house}, score ${sectionData?.mercury?.score}
- Jupiter (wisdom): house ${sectionData?.jupiter?.house}, score ${sectionData?.jupiter?.score}
- Suggested fields: ${JSON.stringify(sectionData?.suggestedFields || [])}
- Best study periods: ${JSON.stringify(sectionData?.bestStudyPeriods || [])}
- Foreign study: ${sectionData?.foreignStudy ? 'Yes, indicated' : 'Domestic study preferred'}
- Competitive exams: ${sectionData?.competitiveExams || 'N/A'}

Write a motivating education analysis covering:

1. **YOUR LEARNING SUPERPOWER** — How this person's brain works best. Are they visual learners? Do they learn by doing? Are they bookworms or street-smart?
2. **BEST SUBJECTS FOR YOU** — Specific fields of study based on the data. Be very specific — "Computer Science, particularly software development and AI" not just "technology"
3. **EXAM SUCCESS PERIODS** — When they'll perform best in exams. Critical for Sri Lankan O/L, A/L, university entrance, professional exams
4. **FOREIGN STUDY** — Will they study abroad? If so, what kind of program?
5. **CAREER THROUGH EDUCATION** — How their education connects to career success
6. **SURPRISE EDUCATION INSIGHT** — Include a specific prediction like "You probably struggled in one subject in school but excelled in another unexpectedly" or "A teacher or mentor around age 16-20 changed your life direction" or "You'll learn something new after age 30 that opens a completely new career path"

REMINDER: NEVER use astrological jargon. Say "your intellectual energy", "your brain's natural wiring", "when your focus is sharpest". NOT "Mercury in 4th house", "5th lord", "Jupiter aspect".
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English word.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish (Sinhala words in English letters).' : 'Write in motivating, practical English.'}`,
    },

    luck: {
      title: 'Luck & Unexpected Fortunes',
      prompt: `You are writing the LUCK & UNEXPECTED FORTUNES section of a personal astrology report.

Birth details: Born under ${lagnaEn} rising, Moon in ${moonEn}, Nakshatra: ${nakshatraName}
Current life period: ${currentDasha} main period, ${currentAD} sub-period

LUCK DATA FROM CHART:
- Overall luck: ${sectionData?.overallLuck || 'N/A'}
- Luck indicators: ${JSON.stringify(sectionData?.luckIndicators || [])}
- Lottery indication: ${sectionData?.lotteryIndication || 'N/A'}
- Inheritance indication: ${sectionData?.inheritanceIndication || 'N/A'}
- Lucky periods: ${JSON.stringify(sectionData?.luckyPeriods || [])}
- Lucky numbers: ${JSON.stringify(sectionData?.luckyNumbers || {})}
- Lucky days: ${JSON.stringify(sectionData?.luckyDays || [])}

Write an exciting luck and fortune analysis covering:

1. **YOUR LUCK SCORE** — How naturally lucky is this person? Be honest but positive
2. **LOTTERY & WINDFALLS** — Sri Lankans are obsessed with this. Will they win lotteries? Should they buy tickets? Which numbers?
3. **WHEN LUCK PEAKS** — Specific years and periods when luck is at maximum. "Between 2026-2029, you're in the luckiest phase of your life"
4. **INHERITANCE & FAMILY WEALTH** — Will they inherit money, property, or assets?
5. **YOUR LUCKY NUMBERS & DAYS** — Use the data to give specific lucky numbers and days for buying lottery tickets, starting business, etc.
6. **SURPRISE LUCK INSIGHT** — Include a specific prediction like "An unexpected phone call or message will bring you money" or "You'll find money or a valuable item you thought was lost" or "Someone will repay an old debt you forgot about"

REMINDER: NEVER use astrological jargon. Say "your fortune energy", "the universe's gifts for you", "when the stars align for you", "your lucky window". NOT "5th house", "9th lord", "11th house gains".
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English word.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish (Sinhala words in English letters).' : 'Write in exciting, hopeful English.'}`,
    },

    spiritual: {
      title: 'Spiritual Journey & Past Karma',
      prompt: `You are writing the SPIRITUAL JOURNEY & PAST KARMA section of a personal astrology report.

Birth details: Born under ${lagnaEn} rising, Moon in ${moonEn}, Nakshatra: ${nakshatraName}
Current life period: ${currentDasha} main period, ${currentAD} sub-period

SPIRITUAL DATA FROM CHART:
- Spiritual inclination: ${sectionData?.spiritualInclination || 'N/A'}
- Spiritual indicators: ${JSON.stringify(sectionData?.spiritualIndicators || [])}
- Past karma theme: ${sectionData?.pastKarmaTheme || 'N/A'}
- Pilgrimage recommendations: ${JSON.stringify(sectionData?.pilgrimageRecommendation || [])}
- Meditation type: ${sectionData?.meditationType || 'N/A'}
- Ketu position: house ${sectionData?.ketuPosition?.house}
- Jupiter position: house ${sectionData?.jupiterPosition?.house}

Write a profound spiritual analysis covering:

1. **YOUR SOUL'S PURPOSE** — What did your soul come to learn in this lifetime? Based on the past karma theme
2. **WHAT YOU BROUGHT FROM PAST LIVES** — Past-life talents, fears, and tendencies that explain things in this life. Sri Lankan users find this FASCINATING
3. **YOUR SPIRITUAL GIFTS** — Natural psychic abilities, healing powers, or spiritual talents
4. **TEMPLE & PILGRIMAGE GUIDE** — Specific Sri Lankan temples to visit for maximum spiritual benefit. Be specific — name actual temples
5. **MEDITATION & PRAYER** — What type of meditation or spiritual practice suits this person based on their nature
6. **SURPRISE SPIRITUAL INSIGHT** — Include a specific prediction like "You sometimes feel you've been to a place before, even though it's your first visit" or "You've had at least one dream that came true" or "Around age 40-45, spirituality will become much more important to you" or "You have a natural ability to sense when someone is lying"

REMINDER: This is the most personal section. Write from the heart. NEVER use astrological jargon. Say "your soul's memory", "what you carried from before", "your spiritual gift", "the sacred energy within you". NOT "Ketu in 9th", "moksha houses", "Jupiter aspect to 12th".
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English word.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish (Sinhala words in English letters).' : 'Write in profound, touching English.'}`,
    },

    surpriseInsights: {
      title: 'Surprise Insights About You',
      prompt: `You are writing the SURPRISE INSIGHTS section — the most viral, shareable part of this astrology report.

Birth details: Born under ${lagnaEn} rising, Moon in ${moonEn}, Nakshatra: ${nakshatraName}
Current life period: ${currentDasha} main period, ${currentAD} sub-period

SURPRISE DATA FROM CHART:
- Physical appearance: ${JSON.stringify(sectionData?.appearance || {})}
- Body marks/scars: ${JSON.stringify(sectionData?.bodyMarks || [])}
- Number of siblings: ${sectionData?.numberOfSiblings || 'N/A'}
- Father profile: ${sectionData?.fatherProfile || 'N/A'}
- Mother profile: ${sectionData?.motherProfile || 'N/A'}
- Sleep pattern: ${sectionData?.sleepPattern || 'N/A'}
- Food preference: ${sectionData?.foodPreference || 'N/A'}
- Pet affinity: ${sectionData?.petAffinity || 'N/A'}
- Handedness: ${sectionData?.handedness || 'N/A'}
- Partner's name letter: ${JSON.stringify(sectionData?.partnerFirstLetter || {})}
- Hidden talent: ${sectionData?.hiddenTalent || 'N/A'}
- Soul purpose: ${sectionData?.soulPurpose || 'N/A'}

⚠️ ENHANCED ACCURACY DATA (USE THESE FOR HIGHER PRECISION):

PARTNER LETTER — DUAL METHOD CROSS-REFERENCE:
${sectionData?.partnerFirstLetter?.letters ? `Method 1 (7th House): Letters ${(sectionData.partnerFirstLetter.letters || []).join(', ')}` : ''}
${sectionData?.partnerFirstLetter?.darakarakaLetters ? `Method 2 (Spouse Significator): Letters ${(sectionData.partnerFirstLetter.darakarakaLetters || []).join(', ')}` : ''}
${sectionData?.partnerFirstLetter?.highConfidenceLetters?.length > 0 ? `⭐ HIGH CONFIDENCE LETTERS (both methods agree): ${sectionData.partnerFirstLetter.highConfidenceLetters.join(', ')} — present these FIRST and with strong confidence` : 'No exact match between methods — present all letters with moderate confidence'}

SIBLING COUNT: The number ${sectionData?.numberOfSiblings || 'N/A'} is based on multi-factor scoring (3rd house planets, aspects, lord strength, lord placement). Present this with confidence.

FATHER PROFILE: "${sectionData?.fatherProfile || 'N/A'}" — based on multi-factor analysis (Sun strength, Sun house, 9th lord house, angular/dusthana analysis). Be detailed about the father.

MOTHER PROFILE: "${sectionData?.motherProfile || 'N/A'}" — based on multi-factor analysis (Moon strength, 4th house, Moon house, 4th lord house). Be detailed about the mother.

EMOTIONAL PATTERN: "${allSections?.mentalHealth?.mentalStability || 'N/A'}" — this reveals whether the person had childhood emotional struggles, trauma, or a difficult home environment. If this indicates Moon-Saturn conjunction or childhood trauma, WEAVE IT into the family section — mention that the home environment may have been emotionally cold or difficult.

SOUL PURPOSE: "${sectionData?.soulPurpose || 'N/A'}" — from the soul significator planet. Include this as the profound closing insight: "Your deepest soul purpose in this lifetime is..."

THIS IS THE SECTION THAT MAKES PEOPLE SAY "HOW DID THEY KNOW?!"

Write a mind-blowing series of personal predictions covering:

1. **YOUR PHYSICAL APPEARANCE** — Describe their likely body type, face shape, eyes, complexion. Be specific enough that they recognize themselves
2. **MARKS ON YOUR BODY** — Predict birthmarks, moles, or scars in specific body areas. This is what makes people believe. "You likely have a mark or mole on your [specific body area]"
3. **YOUR FAMILY** — Predict number of siblings, father's nature/profession, mother's health and personality. Be specific
4. **YOUR SLEEP & DREAMS** — Predict their sleep patterns and dream style. "You're probably a light sleeper who remembers dreams vividly"
5. **YOUR FOOD & LIFESTYLE** — Predict food preferences, whether they're a morning or night person, pet preferences
6. **YOUR FUTURE PARTNER'S NAME** — This is the BIGGEST draw. "Your future partner's name likely starts with the letter [X] or [Y]". Use the data provided
7. **YOUR HIDDEN TALENT** — A talent they may not know they have or haven't fully developed
8. **BONUS SURPRISE** — Add 2-3 more ultra-specific predictions like: "You think more clearly in the shower or while walking" or "You often wake up between 3-4 AM for no reason" or "You tend to attract stray animals" or "People tell you their secrets without you asking" — pick predictions that match their chart data

Make each revelation feel like a personal message. The reader should feel like someone is reading their mind.

REMINDER: ABSOLUTELY ZERO astrological jargon. This section must read like a psychic reading, not an astrology report. No house numbers, no planet names, no Sanskrit terms.
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English word.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish (Sinhala words in English letters).' : 'Write in conversational, mind-blowing English.'}`,
    },
  };

  const result = SECTION_PROMPTS[sectionKey] || null;
  // Override title with Sinhala when language is 'si'
  if (result && language === 'si' && SINHALA_TITLES[sectionKey]) {
    result.title = SINHALA_TITLES[sectionKey];
  }
  return result;
}

/**
 * Generate AI narrative for a single section
 */
async function generateSectionNarrative(sectionKey, sectionData, birthData, allSections, language = 'en', rashiContext = null, ageContext = null, userName = null, userGender = null) {
  const sectionPromptData = buildSectionPrompt(sectionKey, sectionData, birthData, allSections, language);
  if (!sectionPromptData) return null;

  const langInstructions = {
    en: 'Write in English. Warm, personal, wise tone. Do NOT use ANY Sinhala, Sanskrit, Pali, Hindi, or Tamil words. Everything must be in plain English that anyone can understand.',
    si: 'ඔබ ලියන සෑම වචනයක්ම, සෑම වාක්‍යයක්ම, සෑම මාතෘකාවක්ම 100% පිරිසිදු සිංහලෙන් ලියන්න. ඉංග්‍රීසි වචනයක්වත් mix කරන්න එපා — "chart", "career", "life", "love", "personality", "power", "energy", "strong", "weak", "confidence", "relationship", "marriage delay", "partner" වැනි ඉංග්‍රීසි වචන සිංහල වාක්‍ය වලට දාන්න එපා. ජ්‍යෝතිෂ්‍ය තාක්ෂණික වචන ("ලග්නය", "රාශිය", "නක්ෂත්‍ර", "දශාව", "දෝෂ", "යෝග") පාවිච්චි කරන්න එපා — ඒ වෙනුවට සාමාන්‍ය සිංහලෙන් කියන්න. 15 හැවිරිදි ළමයෙකුට තේරෙන සරල, උණුසුම් සිංහලෙන් ලියන්න. యాලුවෙක් කතා කරනවා වගේ ලියන්න.',
    ta: 'எல்லாவற்றையும் முழுமையான தமிழில் எழுதுங்கள். ஆங்கிலம் அல்லது சிங்களம் கலக்க வேண்டாம். ஜோதிட சொற்களை பயன்படுத்த வேண்டாம் — அன்றாட தமிழில் விளக்குங்கள். 15 வயது பிள்ளை புரிந்துகொள்ளக்கூடிய எளிய தமிழில் எழுதுங்கள்.',
    singlish: 'Write in Singlish (Sinhala typed in English). Casual, friendly, relatable tone. Do not use astrology terms — describe everything as human experiences.',
  };

  // Build the full Rashi chart context block
  const rashiBlock = rashiContext ? `

═══ BIRTH DETAILS ═══
Date of Birth: ${rashiContext.birthDateFormatted}
Exact Birth Time: ${rashiContext.birthTimeSLT} (Sri Lanka Time, UTC+5:30)
Birth Location: ${rashiContext.birthLocation}
Moon Sign: ${rashiContext.moonSign}
Sun Sign: ${rashiContext.sunSign}
Birth Star (Nakshatra): ${rashiContext.nakshatra}, Pada ${rashiContext.nakshatraPada}, Lord: ${rashiContext.nakshatraLord}
Panchanga at Birth: ${rashiContext.panchanga}

═══ COMPLETE BIRTH CHART (RASHI CHART) ═══
Ascendant (Lagna): ${rashiContext.lagnaEnglish} (${rashiContext.lagnaName}) at ${rashiContext.lagnaDegree}° — Lord: ${rashiContext.lagnaLord}

HOUSE-BY-HOUSE PLACEMENT:
${rashiContext.rashiChart}

PLANET POSITIONS (with exact degrees):
${rashiContext.planetPositions}

═══ PLANETARY ASPECTS (DRISHTIS) ═══
${rashiContext.aspects}

═══ PLANET STRENGTH SCORES ═══
${rashiContext.planetStrengths}

═══ YOGAS (SPECIAL COMBINATIONS) ═══
${rashiContext.yogas}

═══ DASHA TIMELINE (LIFE PERIODS) ═══
${rashiContext.dashaTimeline}

═══ NAVAMSHA (D9) CHART ═══
${rashiContext.navamshaChart}
${rashiContext.advancedBlock || ''}
════════════════════════════════════════════

INSTRUCTIONS FOR USING THIS DATA:
- Use the BIRTH DATE and EXACT TIME to ground all your readings — this person was born at a very specific moment
- Use HOUSE placements to determine which life areas each planet influences
- Use PLANET STRENGTHS (SHADBALA) to know which energies are strong vs weak — reference the 6-component breakdown
- Use ASPECTS to understand how planets interact and influence each other
- Use the DASHA TIMELINE to give SPECIFIC date ranges for predictions — look at which dasha lord is running and what houses it rules
- Use YOGAS and ADVANCED YOGAS to identify special talents, gifts, or challenges — Raja Yogas for power, Dhana Yogas for wealth
- Use DOSHAS to reveal karmic challenges — Mangala Dosha for marriage, Kaal Sarp for life patterns, Sade Sati for current pressure
- Use JAIMINI KARAKAS to identify the soul's deepest purpose (Atmakaraka) and spouse nature (Darakaraka)
- Use PAST LIFE analysis to explain recurring patterns and deep-seated personality traits
- Use KP SUB-LORDS for precise prediction — the sub-lord chain determines the exact outcome
- Use BHRIGU BINDU to identify timing of major life events
- Use PLANETARY AVASTHAS to determine which planets are at peak power (Yuva) vs dormant (Mrita)
- Use the NAVAMSHA chart to confirm/deepen readings about marriage, dharma, and inner nature
- Use DIVISIONAL CHARTS (D7, D10, D24) embedded in section data for domain-specific precision — D10 for career, D7 for children, D24 for education
- Use LAGNA CUSP WARNINGS when present — if the rising sign is near a boundary, present BOTH sign possibilities for maximum accuracy
- Reference actual planet placements (without using technical astrology terms) to give precise, personal insights
- Every prediction should be traceable to a specific placement, aspect, dasha period, or yoga from this data
- Use the PAST LIFE section to weave in karmic narratives — people LOVE hearing about their soul's journey

⚠️ CRITICAL OUTPUT RULE: All the data labels above (Shadbala, Dasha, Yoga, Rashi, Dosha, Navamsha, Karakamsha, etc.) are FOR YOUR REFERENCE ONLY. 
NEVER write these terms in your output. Translate EVERY concept into plain human language.
Example: Instead of "Your Jupiter Mahadasha starts in 2028" → "Starting around 2028, you enter a period of incredible expansion — doors will open that you didn't even know existed"` : '';

  // Build age and lifespan context for reality-checking predictions
  const ageBlock = ageContext ? `

═══ PERSON'S AGE & LIFESPAN CONTEXT ═══
Date of Birth: ${ageContext.birthDateStr}
Current Age: ${ageContext.currentAge} years old (as of ${ageContext.todayStr})
Birth Year: ${ageContext.birthYear}
Current Year: ${ageContext.currentYear}
Realistic Max Age: ~85 years (death around ~${ageContext.birthYear + 85})
Realistic Predictions Window: ${ageContext.currentYear} to ${ageContext.birthYear + 80}
════════════════════════════════════════` : '';

  // Inject cross-section coherence themes
  const coherenceBlock = rashiContext?.coreThemes || '';

  // Build person's name context
  const nameStr = userName ? userName : 'this person';
  const nameGreeting = userName ? `This person's name is **${userName}**.` : '';
  const genderContext = userGender ? `This person is **${userGender}**. Use appropriate pronouns (${userGender === 'male' ? 'he/him/his' : 'she/her/hers'}) and gender-relevant context throughout. For marriage sections, describe their future ${userGender === 'male' ? 'wife/partner' : 'husband/partner'}. For career, use culturally appropriate references.` : 'Gender is unknown — use neutral "you/your" language.';

  const systemPrompt = `You are the most legendary, mystical Vedic astrologer who has ever lived in Sri Lanka — a seer whose readings have made people weep with recognition, gasp in shock, and share screenshots with everyone they know. You can see into a person's SOUL through their birth chart. Your readings are so accurate that people believe you must have been watching their entire life.

${nameGreeting}
${genderContext}
You are writing the "${sectionPromptData.title}" section of their deeply personal life report.
${ageBlock}

${langInstructions[language] || langInstructions.en}

VOICE & STYLE:
- Write like you're talking to a close friend — warm, real, like a wise older sibling or a cool uncle who happens to be a genius astrologer
- ${userName ? `Use their name "${userName}" naturally — sprinkle it in 2-3 times per section (e.g., "Look ${userName}, here's the thing..." or "What makes you special, ${userName}, is..." or "${userName}, let me be honest with you..."). DON'T overuse it — it should feel natural, not robotic.` : 'Address them as "you" throughout — make it feel like a one-on-one conversation.'}
- Be SPECIFIC: not "you're creative" but "you're the kind of person who lies awake at 2am because a random idea just set your brain on fire, and by morning you've already planned three versions of it"
- Be EERILY ACCURATE: describe their habits, thought patterns, fears, desires in such detail that they'll screenshot it and send to their best friend saying "HOW does it know this?!"
- Use the EXACT planetary positions from the chart data to derive specific, unique insights — no two people should ever get the same reading
- Mix warmth with brutal honesty — tell them what they NEED to hear, not just what they want to hear
- Talk like a REAL person, not a textbook. Use conversational phrases like "Here's the thing...", "Let me be real with you...", "You know that feeling when...", "Between you and me...", "I'm not gonna sugarcoat this..."
- Create "chills moments" — lines so personal and accurate they physically react
- Every paragraph should have at least ONE line that makes them think "this is EXACTLY me"

FORMAT: Use Markdown formatting for beautiful presentation:
- Use **bold** for key personality traits, important predictions, planet names, and words that should HIT hard
- Use *italic* for gentle emphasis, inner thoughts, and emotional nuances  
- Use > blockquotes for the most powerful revelations or warnings — the "screenshot-worthy" lines
- Use - bullet lists for remedies, practical advice, and key action items
- Use --- to separate major thematic shifts within the section
- Use emojis naturally (not excessively) — ✨ 🔥 💫 ⚡ 🌙 💎 🌟 ❤️ ⚠️ 🙏
- Write flowing prose with occasional bullets — NOT a wall of bullet points
- Each paragraph should be 3-5 sentences of rich, personal content

══════════════════════════════════════════════════════════════
🚫🚫🚫 ABSOLUTE LANGUAGE RULES — NEVER VIOLATE 🚫🚫🚫
══════════════════════════════════════════════════════════════

1. ZERO TECHNICAL TERMS — The following words are BANNED from your output. NEVER use them, not even once:
   "Lagna", "Rashi", "Bhava", "Graha", "Dasha", "Mahadasha", "Antardasha", "Yoga" (as astrology term), 
   "Nakshatra", "Dosha", "Karana", "Tithi", "Mangala Dosha", "Kuja Dosha", "Sade Sati", "Shadbala",
   "Karakamsha", "Atmakaraka", "Arudha", "Upapada", "Navamsha", "Vimshottari", "Bhukti", "Panchanga",
   "Drishti", "Ashtakavarga", "Bindu", "Pushkara", "Rahu Kala", "Yamagandhaya", "Chara Karaka",
   "Raja Yoga", "Dhana Yoga", "Kaal Sarp", "Gajakeshari", "Budhaditya", "Neecha Bhanga",
   "Benefic", "Malefic", "Exalted", "Debilitated", "Retrograde", "Combustion",
   "7th house", "10th house", "5th house", "4th house" — do NOT reference house numbers.
   Instead of ANY technical term, describe the HUMAN EXPERIENCE:
   - Instead of "Mangala Dosha" → "Your love life has a fierce, intense energy that needs the right match"
   - Instead of "Saturn in 7th house" → "Relationships come to you later than most, but when they arrive, they're built to last"
   - Instead of "Jupiter Mahadasha" → "You're entering a period of expansion and growth that will last several years"
   - Instead of "Rahu in 10th" → "There's a deep, almost obsessive drive in you to reach the top of whatever mountain you choose to climb"
   - Instead of "Sade Sati" → "You're going through one of life's toughest tests right now — a period that feels heavy but is making you unbreakable"

2. 100% TARGET LANGUAGE — Write EVERYTHING in the language specified:
   - If language is "si" (Sinhala): Write PURE Sinhala. NOT A SINGLE English word.
     ❌ WRONG: "ඔයාගේ chart එකේ" / "career එක" / "love life එක" / "marriage delay" / "personality" / "confidence"
     ✅ RIGHT: "ඔයාගේ ඉරණම" / "රැකියාව" / "ආදර ජීවිතය" / "විවාහය ප්‍රමාද" / "ගතිගුණ" / "විශ්වාසය"
     Every heading, every sentence, every word MUST be in Sinhala. If you don't know the Sinhala word, describe the concept in simple Sinhala — do NOT use the English word.
     Use simple, everyday Sinhala that a 15-year-old could understand. NOT formal/literary Sinhala.
   - If language is "en" (English): Write everything in English. No Sinhala/Sanskrit/Pali terms at all.
   - If language is "ta" (Tamil): Write everything in pure Tamil. No English/Sinhala mixing.

3. YOUR READERS ARE NOT ASTROLOGY EXPERTS — They are regular people (students, office workers, farmers, mothers, young couples). They've NEVER read an astrology book. Imagine you're explaining their life to someone who has ZERO background in astrology. Use everyday language, real-life examples, and emotional descriptions. If you can't explain something without a technical term, you don't understand it well enough.

4. NO PLANET NAMES AS LABELS — Don't say "Saturn influences your career" or "Venus rules your love life" or "Jupiter brings wealth." Instead describe the EFFECT:
   - Instead of "Venus is strong in your chart" → "You have a natural magnetic charm — people are drawn to you without you even trying"
   - Instead of "Mars in your career sector" → "You attack your career goals with a warrior's intensity — once you set your sights on something, nothing stops you"
   - Instead of "Moon is weak" → "You feel emotions more deeply than most people around you, and sometimes that sensitivity feels like a burden"
   Planet names (Saturn, Venus, Mars, etc.) can appear in explanations occasionally but NEVER as primary labels or headings, and NEVER as the subject of a sentence.
══════════════════════════════════════════════════════════════

REALITY CHECK — ABSOLUTE RULES (NEVER VIOLATE):
- This person is CURRENTLY ${ageContext ? ageContext.currentAge + ' years old (born ' + ageContext.birthDateStr + ')' : 'a real human being'}. NEVER forget their age when making predictions.
- ALL predictions must fall within a REALISTIC human lifespan. NEVER predict events beyond age 80-85. If they are 30, don't predict marriage at 99 or career breakthroughs at 95.
- ${ageContext ? 'Your prediction window is: ' + ageContext.currentYear + ' to ' + (ageContext.birthYear + 80) + '. Do NOT reference ANY year beyond ' + (ageContext.birthYear + 80) + '.' : 'Keep all predictions within a realistic timeframe.'}
- Be BRUTALLY HONEST. Do NOT sugar-coat difficulties. If the chart shows delayed marriage, SAY "marriage is likely to be delayed until [specific age/year]." If career is challenging, say "your career path will require unusual patience."
- Give PINPOINT SPECIFICS, not vague generalities:
  • CAREER: Name 2-3 EXACT job titles or industries (e.g., "software engineering", "restaurant management", "real estate development") — NOT vague categories like "something creative"
  • MARRIAGE: Give a SPECIFIC year or 2-year window (e.g., "between 2027-2029") — NOT "when the time is right" or "when you're ready"
  • CHILDREN: Give a SPECIFIC number (e.g., "most likely 2 children") and approximate timing (e.g., "first child around 2030-2031") — NOT "you may have children someday"
  • MONEY: Give specific periods of wealth vs caution — NOT "money will come when it's meant to"
- If the chart shows genuine hardship (poverty, loneliness, health issues, infertility), DO NOT hide it. Frame it compassionately but HONESTLY. Say it directly, then offer remedies.
- NEVER use filler phrases like "only time will tell", "the universe has a plan", "everything happens for a reason", "when the time is right". These are BANNED. Replace with specific, concrete predictions.
- Past predictions (for ages already lived) must match common life patterns for that chart — this builds trust so they believe the future predictions.`;

  const userPrompt = sectionPromptData.prompt + rashiBlock + coherenceBlock;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  // ── Hybrid Model Strategy + Per-Section Temperature ──────────
  // Hero sections (personality, lifePredictions, surpriseInsights, marriage, career)
  // use the Pro model with higher creativity. Data-heavy sections use lower
  // temperature for factual accuracy.
  const HERO_SECTIONS = ['personality', 'lifePredictions', 'surpriseInsights', 'marriage', 'career', 'marriedLife', 'spiritual'];
  const DATA_HEAVY_SECTIONS = ['yogaAnalysis', 'health', 'financial', 'transits', 'timeline25', 'realEstate', 'education', 'legal'];
  
  const isHero = HERO_SECTIONS.includes(sectionKey);
  const isDataHeavy = DATA_HEAVY_SECTIONS.includes(sectionKey);
  const sectionTemperature = isHero ? 0.85 : isDataHeavy ? 0.65 : 0.75;
  // ─────────────────────────────────────────────────────────────

  const provider = process.env.AI_PROVIDER || 'gemini';
  try {
    let response;
    if (provider === 'gemini') {
      if (isHero) {
        response = await callGeminiHero(messages, sectionTemperature);
      } else {
        response = await callGeminiLong(messages, sectionTemperature);
      }
    } else {
      response = await callOpenAILong(messages);
    }
    return {
      title: sectionPromptData.title,
      narrative: response,
    };
  } catch (error) {
    console.error(`[AI Report] Error generating ${sectionKey}:`, error.message);
    return {
      title: sectionPromptData.title,
      narrative: null,
      error: error.message,
    };
  }
}

/**
 * Call Gemini with higher token limit for long narratives
 * Accepts temperature parameter for section-specific tuning
 */
async function callGeminiLong(messages, sectionTemperature = 0.88) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemInstruction = messages.find(m => m.role === 'system')?.content || '';
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: {
        maxOutputTokens: 65536,
        temperature: sectionTemperature,
        topP: sectionTemperature > 0.75 ? 0.95 : 0.90,
      },
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Gemini API error: ${data.error.message}`);
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate response.';
}

/**
 * Call Gemini Pro model for hero sections that need deep reasoning
 * Falls back to standard model if GEMINI_PRO_MODEL is not set
 */
async function callGeminiHero(messages, sectionTemperature = 0.82) {
  const apiKey = process.env.GEMINI_API_KEY;
  // Use Pro model for hero sections — falls back to standard model if not set
  const proModel = process.env.GEMINI_PRO_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${proModel}:generateContent?key=${apiKey}`;

  const systemInstruction = messages.find(m => m.role === 'system')?.content || '';
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: {
        maxOutputTokens: 65536,
        temperature: sectionTemperature,
        topP: 0.92,
      },
    }),
  });

  const data = await response.json();
  if (data.error) {
    // Fall back to standard model on Pro failure
    console.warn(`[AI Report] Pro model failed (${data.error.message}), falling back to standard model`);
    return callGeminiLong(messages, sectionTemperature);
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate response.';
}

/**
 * Call OpenAI with high token limit for rich narratives
 */
async function callOpenAILong(messages) {
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 4096,
    temperature: 0.88,
    top_p: 0.95,
  });

  return response.choices[0].message.content;
}

/**
 * Resolve lat/lng to a human-readable location name
 * Uses a lookup of major Sri Lankan cities + key international cities
 * Falls back to coordinate display if no match found
 */
function resolveLocationName(lat, lng) {
  const SRI_LANKAN_CITIES = [
    { name: 'Colombo', lat: 6.9271, lng: 79.8612 },
    { name: 'Kandy', lat: 7.2906, lng: 80.6337 },
    { name: 'Galle', lat: 6.0535, lng: 80.2210 },
    { name: 'Jaffna', lat: 9.6615, lng: 80.0255 },
    { name: 'Matara', lat: 5.9549, lng: 80.5550 },
    { name: 'Negombo', lat: 7.2008, lng: 79.8737 },
    { name: 'Anuradhapura', lat: 8.3114, lng: 80.4037 },
    { name: 'Trincomalee', lat: 8.5874, lng: 81.2152 },
    { name: 'Batticaloa', lat: 7.7310, lng: 81.6747 },
    { name: 'Kurunegala', lat: 7.4863, lng: 80.3647 },
    { name: 'Ratnapura', lat: 6.6828, lng: 80.3992 },
    { name: 'Badulla', lat: 6.9934, lng: 81.0550 },
    { name: 'Nuwara Eliya', lat: 6.9497, lng: 80.7891 },
    { name: 'Polonnaruwa', lat: 7.9403, lng: 81.0188 },
    { name: 'Hambantota', lat: 6.1429, lng: 81.1212 },
    { name: 'Kalmunai', lat: 7.4167, lng: 81.8167 },
    { name: 'Moratuwa', lat: 6.7730, lng: 79.8824 },
    { name: 'Dehiwala-Mount Lavinia', lat: 6.8390, lng: 79.8652 },
    { name: 'Sri Jayawardenepura Kotte', lat: 6.9108, lng: 79.8878 },
    { name: 'Chilaw', lat: 7.5758, lng: 79.7953 },
    { name: 'Puttalam', lat: 8.0362, lng: 79.8283 },
    { name: 'Matale', lat: 7.4675, lng: 80.6234 },
    { name: 'Ampara', lat: 7.2975, lng: 81.6820 },
    { name: 'Vavuniya', lat: 8.7514, lng: 80.4971 },
    { name: 'Mannar', lat: 8.9810, lng: 79.9044 },
    { name: 'Kilinochchi', lat: 9.3803, lng: 80.3770 },
    { name: 'Mullaitivu', lat: 9.2671, lng: 80.8142 },
    { name: 'Gampaha', lat: 7.0840, lng: 80.0098 },
    { name: 'Kalutara', lat: 6.5854, lng: 79.9607 },
    { name: 'Kegalle', lat: 7.2513, lng: 80.3464 },
    { name: 'Monaragala', lat: 6.8728, lng: 81.3507 },
    { name: 'Dambulla', lat: 7.8675, lng: 80.6519 },
    { name: 'Sigiriya', lat: 7.9519, lng: 80.7600 },
    // International
    { name: 'Chennai, India', lat: 13.0827, lng: 80.2707 },
    { name: 'Mumbai, India', lat: 19.0760, lng: 72.8777 },
    { name: 'New Delhi, India', lat: 28.6139, lng: 77.2090 },
    { name: 'Dubai, UAE', lat: 25.2048, lng: 55.2708 },
    { name: 'London, UK', lat: 51.5074, lng: -0.1278 },
    { name: 'New York, USA', lat: 40.7128, lng: -74.0060 },
    { name: 'Sydney, Australia', lat: -33.8688, lng: 151.2093 },
    { name: 'Singapore', lat: 1.3521, lng: 103.8198 },
    { name: 'Kuala Lumpur, Malaysia', lat: 3.1390, lng: 101.6869 },
    { name: 'Doha, Qatar', lat: 25.2854, lng: 51.5310 },
    { name: 'Riyadh, Saudi Arabia', lat: 24.7136, lng: 46.6753 },
    { name: 'Rome, Italy', lat: 41.9028, lng: 12.4964 },
    { name: 'Toronto, Canada', lat: 43.6532, lng: -79.3832 },
    { name: 'Melbourne, Australia', lat: -37.8136, lng: 144.9631 },
  ];

  // Find nearest city within 30km (~0.27 degrees)
  let nearest = null;
  let minDist = Infinity;
  for (const city of SRI_LANKAN_CITIES) {
    const dlat = lat - city.lat;
    const dlng = lng - city.lng;
    const dist = Math.sqrt(dlat * dlat + dlng * dlng);
    if (dist < minDist) {
      minDist = dist;
      nearest = city;
    }
  }

  if (nearest && minDist < 0.27) {
    return `${nearest.name} (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`;
  }

  // Check if in Sri Lanka broadly
  if (lat >= 5.9 && lat <= 9.9 && lng >= 79.5 && lng <= 81.9) {
    return `Sri Lanka (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`;
  }

  return `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
}

/**
 * MASTER FUNCTION: Generate complete AI narrative report
 * 
 * 1. Runs the deterministic engine to get raw chart data
 * 2. Sends each section to AI in parallel for narrative generation
 * 3. Returns a beautiful, personalized, jargon-free report
 * 
 * @param {Date} birthDate
 * @param {number} lat
 * @param {number} lng
 * @param {string} language - 'en', 'si', 'ta', 'singlish'
 * @returns {Object} Full narrative report
 */
async function generateAINarrativeReport(birthDate, lat = 6.9271, lng = 79.8612, language = 'en', birthLocation = null, userName = null, userGender = null) {
  const rawReport = generateFullReport(birthDate, lat, lng);
  const birthData = rawReport.birthData;
  const sections = rawReport.sections;

  // ── Resolve birth location name ────────────────────────────────
  const resolvedLocation = birthLocation || resolveLocationName(lat, lng);

  // ── Build Rashi Chart Context ──────────────────────────────────
  const date = new Date(birthDate);
  const houseChart = buildHouseChart(date, lat, lng);
  const navamshaChart = buildNavamshaChart(date, lat, lng);
  const drishtis = calculateDrishtis(houseChart.houses);
  const yogas = detectYogas(date, lat, lng);
  const planetStrengths = getPlanetStrengths(date, lat, lng);
  const moonSidereal = toSidereal(getMoonLongitude(date), date);
  const dasaPeriods = calculateVimshottariDetailed(moonSidereal, date);
  const panchanga = getPanchanga(date, lat, lng);

  // ── Advanced Engine (Tiers 1-2-3) ─────────────────────────────
  let advancedData = null;
  try {
    advancedData = generateAdvancedAnalysis(date, lat, lng);
    console.log(`[AI Report] Advanced analysis: ${advancedData.tier1.doshas.found} doshas, ${advancedData.tier1.advancedYogas.found} yogas, Jaimini AK=${advancedData.tier1.jaimini.atmakaraka?.planet}`);
  } catch (err) {
    console.error('[AI Report] Advanced analysis failed (continuing without):', err.message);
  }

  // ── Human-readable birth time ─────────────────────────────────
  const birthHours = date.getUTCHours();
  const birthMinutes = date.getUTCMinutes();
  // Convert to Sri Lanka Time (UTC+5:30)
  const sltOffset = 5.5 * 60; // minutes
  const sltTotalMin = birthHours * 60 + birthMinutes + sltOffset;
  const sltH = Math.floor((sltTotalMin / 60) % 24);
  const sltM = Math.floor(sltTotalMin % 60);
  const birthTimeSLT = `${String(sltH).padStart(2, '0')}:${String(sltM).padStart(2, '0')}`;
  const birthDateFormatted = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;

  // Build a human-readable Rashi chart summary
  const rashiChartSummary = houseChart.houses.map(h => {
    const planetsStr = h.planets.length > 0
      ? h.planets.map(p => `${p.name} (${p.degree.toFixed(1)}°)`).join(', ')
      : 'Empty';
    return `House ${h.houseNumber}: ${h.rashiEnglish} (${h.rashi}) — Lord: ${h.rashiLord} — Planets: ${planetsStr}`;
  }).join('\n');

  // Build Navamsha summary
  const navamshaSummary = (navamshaChart.houses || []).map(h => {
    const planetsStr = h.planets.length > 0
      ? h.planets.map(p => `${p.name}`).join(', ')
      : 'Empty';
    return `D9 House ${h.houseNumber}: ${h.rashiEnglish || h.rashi} — Planets: ${planetsStr}`;
  }).join('\n');

  // Planet positions summary
  const planetPositions = Object.entries(houseChart.planets || {}).map(([key, p]) => {
    return `${p.name}: ${p.rashiEnglish || ''} at ${(p.degreeInSign || 0).toFixed(2)}° (House from Lagna: ${houseChart.houses.findIndex(h => h.rashiId === p.rashiId) + 1})`;
  }).join('\n');

  // ── Planet Aspects (Drishtis) ──────────────────────────────────
  const aspectsSummary = Object.entries(drishtis.planetAspects || {}).map(([planet, data]) => {
    const targets = data.details.map(d => `House ${d.house} (${d.rashi})${d.type === 'special' ? ' [SPECIAL]' : ''}`).join(', ');
    return `${planet} (from House ${data.fromHouse}) aspects → ${targets}`;
  }).join('\n');

  // ── Planet Strengths ───────────────────────────────────────────
  const strengthsSummary = Object.entries(planetStrengths || {}).map(([key, p]) => {
    return `${p.name || key}: Score ${p.score || 0}/100 — ${p.strength || 'unknown'}`;
  }).join('\n');

  // ── Dasha Timeline ─────────────────────────────────────────────
  const dashaSummary = (dasaPeriods || []).map(d => {
    const marker = (sections.lifePredictions?.currentDasha?.lord === d.lord) ? ' ← CURRENT' : '';
    return `${d.lord}: ${d.start} to ${d.endDate} (${d.years.toFixed(1)} years)${marker}`;
  }).join('\n');

  // ── Yogas ──────────────────────────────────────────────────────
  const yogasSummary = yogas.length > 0
    ? yogas.map(y => `${y.name} (${y.strength || 'moderate'}): ${y.description || ''}`).join('\n')
    : 'No major classical yogas detected.';

  // ── Panchanga at Birth ─────────────────────────────────────────
  const panchangaSummary = `Tithi: ${panchanga.tithi?.name || 'N/A'}, Yoga: ${panchanga.yoga?.name || 'N/A'}, Karana: ${panchanga.karana?.name || 'N/A'}, Vaara: ${panchanga.vaara?.name || 'N/A'}`;

  // ── Advanced Engine Data Block ─────────────────────────────────
  let advancedBlock = '';
  if (advancedData) {
    const t1 = advancedData.tier1;
    const t2 = advancedData.tier2;
    const t3 = advancedData.tier3;

    // Doshas
    const doshasSummary = t1.doshas.items.length > 0
      ? t1.doshas.items.map(d => `${d.icon} ${d.name} — Severity: ${d.severity}${d.cancelled ? ' (CANCELLED)' : ''}\n   ${d.description}\n   Remedies: ${(d.remedies || []).slice(0, 3).join('; ')}`).join('\n\n')
      : 'No major doshas detected — this chart is relatively clean karmically.';

    // Advanced Yogas
    const advYogasSummary = t1.advancedYogas.items.length > 0
      ? t1.advancedYogas.items.map(y => `${y.icon} ${y.name} (${y.strength}): ${y.description}`).join('\n')
      : 'No additional advanced yogas beyond the basic ones.';

    // Jaimini
    const jaiminiSummary = Object.entries(t1.jaimini.karakas || {}).map(([role, data]) =>
      `${role}: ${data.planet} at ${data.degree}° in ${data.rashi} — ${data.meaning}`
    ).join('\n');
    const karakamshaSummary = t1.jaimini.karakamsha
      ? `Karakamsha (Soul's True Desire): ${t1.jaimini.karakamsha.rashi} — ${t1.jaimini.karakamsha.interpretation}`
      : '';
    const arudhaLagnaSummary = t1.jaimini.arudhaLagna
      ? `Arudha Lagna (Public Image): ${t1.jaimini.arudhaLagna.rashi} — ${t1.jaimini.arudhaLagna.meaning}`
      : '';
    const upapadaSummary = t1.jaimini.upapadaLagna
      ? `Upapada Lagna (Marriage Indicator): ${t1.jaimini.upapadaLagna.rashi} — ${t1.jaimini.upapadaLagna.meaning}`
      : '';

    // Shadbala
    const shadbalaSummary = Object.entries(t2.shadbala || {}).map(([key, sb]) =>
      `${sb.name}: ${sb.totalRupas} Rupas (${sb.percentage}%) — ${sb.strength}${sb.isRetrograde ? ' [R]' : ''} | Sthana:${sb.components.sthanaBala} Dig:${sb.components.digBala} Kala:${sb.components.kalaBala} Cheshta:${sb.components.cheshtaBala} Naisargika:${sb.components.naisargikaBala} Drig:${sb.components.drigBala}`
    ).join('\n');

    // Bhrigu Bindu
    const bhriguSummary = t2.bhriguBindu
      ? `Destiny Point: ${t2.bhriguBindu.rashi} at ${t2.bhriguBindu.degreeInSign}° (Nakshatra: ${t2.bhriguBindu.nakshatra})\n${t2.bhriguBindu.meaning}\nCurrently Active: ${t2.bhriguBindu.isCurrentlyActive ? 'YES — ' + t2.bhriguBindu.currentActivations.map(a => `${a.planet} at ${a.distance}° orb`).join(', ') : 'No planets currently triggering the destiny point'}`
      : '';

    // Avasthas
    const avasthasSummary = Object.entries(t2.avasthas || {}).map(([key, av]) =>
      `${av.name}: ${av.balaadi.state} (${av.balaadi.sinhala}) — ${av.consciousness.state} — Effective Power: ${av.effectivePower}%`
    ).join('\n');

    // Pratyantardasha
    const pdSummary = t2.pratyantardasha
      ? `${t2.pratyantardasha.interpretation}\n${t2.pratyantardasha.currentPratyantardasha ? `Sub-sub period: ${t2.pratyantardasha.currentPratyantardasha.lord} (${t2.pratyantardasha.currentPratyantardasha.start} to ${t2.pratyantardasha.currentPratyantardasha.endDate})` : ''}`
      : '';

    // Extended Vargas (D7, D10, D24, D60)
    const vargasSummary = Object.entries(t2.extendedVargas || {}).map(([key, chart]) => {
      const positions = Object.entries(chart.positions || {}).map(([pk, pp]) => `${pp.name}: ${pp.vargaRashi}`).join(', ');
      return `${key} (${chart.name}) — ${chart.governs}\n  Lagna: ${chart.lagnaRashi} | ${positions}`;
    }).join('\n');

    // KP Sub-Lords
    const kpSummary = Object.entries(t3.kpSubLords || {}).map(([key, kp]) =>
      `${kp.name}: ${kp.chain} — ${kp.interpretation}`
    ).join('\n');

    // Past Life
    const pastLifeSummary = t3.pastLife ? `
Past Life (Ketu in House ${t3.pastLife.pastLife.ketuHouse}, ${t3.pastLife.pastLife.ketuRashi}):
${t3.pastLife.pastLife.pastLifeStory}

Past-Life Merit (5th House): ${t3.pastLife.pastLifeMerit.assessment}
Planets in 5th: ${t3.pastLife.pastLifeMerit.fifthHousePlanets.join(', ') || 'None'}

Current Life Direction (Rahu in House ${t3.pastLife.currentLifeDirection.rahuHouse}):
${t3.pastLife.currentLifeDirection.direction}

Karma Balance: ${t3.pastLife.karmaBalance.summary}` : '';

    // Nadi Amsha (top 3 key planets)
    const nadiSummary = Object.entries(t3.nadiAmsha || {}).slice(0, 5).map(([key, na]) =>
      `${na.name}: ${na.microPosition} — ${na.devata} realm, ${na.guna} quality`
    ).join('\n');

    // Sarvatobhadra
    const svbSummary = t3.sarvatobhadra
      ? `Natal Moon Star: ${t3.sarvatobhadra.natalMoonNakshatra}\nVedha: ${t3.sarvatobhadra.vedha.warning}`
      : '';

    advancedBlock = `

═══ DOSHAS (KARMIC CHALLENGES) ═══
${doshasSummary}

═══ ADVANCED YOGAS (30+ COMBINATIONS) ═══
${advYogasSummary}

═══ JAIMINI KARAKAS (SOUL SIGNIFICATORS) ═══
${jaiminiSummary}
${karakamshaSummary}
${arudhaLagnaSummary}
${upapadaSummary}

═══ SHADBALA (6-FOLD PLANETARY STRENGTH) ═══
${shadbalaSummary}

═══ BHRIGU BINDU (DESTINY POINT) ═══
${bhriguSummary}

═══ PLANETARY AVASTHAS (STATES OF BEING) ═══
${avasthasSummary}

═══ CURRENT SUB-SUB PERIOD (PRATYANTARDASHA) ═══
${pdSummary}

═══ EXTENDED DIVISIONAL CHARTS ═══
${vargasSummary}

═══ KP SUB-LORD ANALYSIS ═══
${kpSummary}

═══ PAST LIFE & KARMIC ANALYSIS ═══
${pastLifeSummary}

═══ NADI AMSHA (MICRO-POSITIONS) ═══
${nadiSummary}

═══ SARVATOBHADRA CHAKRA (TRANSIT VEDHA) ═══
${svbSummary}`;
  }

  const rashiContext = {
    lagnaEnglish: houseChart.lagna?.rashi?.english || '',
    lagnaName: houseChart.lagna?.rashi?.name || '',
    lagnaLord: houseChart.lagna?.rashi?.lord || '',
    lagnaDegree: (houseChart.lagna?.sidereal % 30)?.toFixed(2) || '0',
    rashiChart: rashiChartSummary,
    navamshaChart: navamshaSummary,
    planetPositions: planetPositions,
    aspects: aspectsSummary,
    planetStrengths: strengthsSummary,
    dashaTimeline: dashaSummary,
    yogas: yogasSummary,
    panchanga: panchangaSummary,
    birthTimeSLT: birthTimeSLT,
    birthDateFormatted: birthDateFormatted,
    birthLocation: resolvedLocation,
    moonSign: birthData.moonSign?.english || '',
    sunSign: birthData.sunSign?.english || '',
    nakshatra: birthData.nakshatra?.name || '',
    nakshatraPada: birthData.nakshatra?.pada || '',
    nakshatraLord: birthData.nakshatra?.lord || '',
    advancedBlock: advancedBlock,
  };

  // ── Build Age Context for Reality-Checked Predictions ──────────
  const now = new Date();
  const birthDateObj = new Date(birthDate);
  const currentAge = Math.floor((now - birthDateObj) / (365.25 * 24 * 60 * 60 * 1000));
  const birthYear = birthDateObj.getFullYear();
  const currentYear = now.getFullYear();
  const ageContext = {
    currentAge,
    birthYear,
    currentYear,
    birthDateStr: birthDateObj.toISOString().split('T')[0],
    todayStr: now.toISOString().split('T')[0],
  };
  console.log(`[AI Report] Person is ${currentAge} years old (born ${ageContext.birthDateStr}). Predictions window: ${currentYear}-${birthYear + 80}`);
  // ──────────────────────────────────────────────────────────────

  console.log(`[AI Report] Rashi chart context built — ${houseChart.houses.length} houses, ${Object.keys(houseChart.planets).length} planets`);
  // ──────────────────────────────────────────────────────────────

  // Consolidated sections — removed duplicates/overlaps:
  // - 'employment' merged into 'career' (was repeating career paths/promotions)
  // - 'business' merged into 'career' (was repeating career data)
  // NEW: marriedLife (separate from marriage/love), legal, education, spiritual
  // EXPANDED: health (from ~35 lines to ~100+ lines)
  const sectionOrder = [
    'personality',
    'yogaAnalysis',
    'lifePredictions',
    'career',
    'marriage',
    'marriedLife',
    'financial',
    'children',
    'health',
    'mentalHealth',
    'foreignTravel',
    'education',
    'luck',
    'legal',
    'spiritual',
    'realEstate',
    'transits',
    'surpriseInsights',
    'timeline25',
    'remedies',
  ];

  // ══════════════════════════════════════════════════════════════
  // PASS 1: Generate "Core Themes" summary for cross-section coherence
  // This ensures all 16 sections tell a consistent story.
  // ══════════════════════════════════════════════════════════════
  console.log('[AI Report] Pass 1: Generating core themes for coherence...');
  const coherenceStart = Date.now();
  
  let coreThemes = '';
  try {
    const themesPrompt = `You are an expert Vedic astrologer analyzing a birth chart. Based on this data, produce a CONCISE "Core Themes" document (max 300 words) that ALL report sections must follow for consistency.

BIRTH DATA:
- Lagna: ${rashiContext.lagnaEnglish} (${rashiContext.lagnaName}), Lord: ${rashiContext.lagnaLord}
- Moon Sign: ${rashiContext.moonSign}, Sun Sign: ${rashiContext.sunSign}
- Nakshatra: ${rashiContext.nakshatra}, Pada ${rashiContext.nakshatraPada}
- Age: ${ageContext.currentAge} years old (born ${ageContext.birthDateStr})

KEY PLANETS:
${rashiContext.planetPositions}

DASHA TIMELINE:
${rashiContext.dashaTimeline}

YOGAS: ${rashiContext.yogas}

${rashiContext.advancedBlock ? 'ADVANCED:\n' + rashiContext.advancedBlock.substring(0, 2000) : ''}

Write EXACTLY this JSON format (no markdown, no fences):
{
  "corePersonality": "2-sentence summary of who this person fundamentally is",
  "marriageTiming": "specific age/year range for marriage based on 7th lord dasha + D9",
  "careerPath": "2-3 specific career types based on 10th lord + Amatyakaraka",
  "financialPeak": "year range for peak wealth based on 11th lord dasha + Dhana yogas",
  "childrenTiming": "specific year range + likely count based on 5th lord + D7",
  "healthConcerns": "specific body areas based on weak planets + 6th/8th lord",
  "currentPhase": "what the person is going through RIGHT NOW based on current dasha + transits",
  "biggestChallenge": "the #1 life challenge from doshas/weak planets",
  "biggestBlessing": "the #1 gift from strong yogas/exalted planets",
  "lifeMotto": "a one-sentence theme that captures their entire chart story"
}`;

    const themesResponse = await callGemini([
      { role: 'system', content: 'You output ONLY valid JSON. No markdown code fences. No extra text. Be specific with years and numbers.' },
      { role: 'user', content: themesPrompt },
    ], 2048, 0.5);

    // Clean and parse
    let cleanedThemes = themesResponse.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    try {
      const parsed = JSON.parse(cleanedThemes);
      coreThemes = `
═══ CORE THEMES (ALL SECTIONS MUST FOLLOW THESE) ═══
• Core Personality: ${parsed.corePersonality || ''}
• Marriage Timing: ${parsed.marriageTiming || ''}
• Career Path: ${parsed.careerPath || ''}
• Financial Peak: ${parsed.financialPeak || ''}
• Children Timing: ${parsed.childrenTiming || ''}
• Health Concerns: ${parsed.healthConcerns || ''}
• Current Phase: ${parsed.currentPhase || ''}
• Biggest Challenge: ${parsed.biggestChallenge || ''}
• Biggest Blessing: ${parsed.biggestBlessing || ''}
• Life Motto: ${parsed.lifeMotto || ''}

⚠️ CRITICAL: Your section MUST be consistent with these core themes. If the core themes say "marriage around 28-30", you MUST NOT say "marriage at 24" or "marriage unlikely before 35". All sections tell ONE coherent story.
════════════════════════════════════════════════════════`;
      console.log(`[AI Report] Core themes generated in ${Date.now() - coherenceStart}ms`);
    } catch (parseErr) {
      console.warn('[AI Report] Core themes parse failed (continuing without):', parseErr.message);
      // Use raw text as fallback
      coreThemes = `\n═══ CORE THEMES ═══\n${cleanedThemes}\n════════════════════\n`;
    }
  } catch (themeErr) {
    console.warn('[AI Report] Core themes generation failed (continuing without):', themeErr.message);
  }

  // Inject core themes into rashiContext so all sections see it
  rashiContext.coreThemes = coreThemes;

  // ══════════════════════════════════════════════════════════════
  // PASS 2: Generate all sections in parallel with coherence context
  // ══════════════════════════════════════════════════════════════
  console.log(`[AI Report] Pass 2: Generating ${sectionOrder.length} narrative sections in parallel...`);
  const startTime = Date.now();

  const narrativePromises = sectionOrder.map(key => {
    // marriedLife uses the same chart data as marriage section
    const dataKey = key === 'marriedLife' ? 'marriage' : key;
    const sectionData = sections[dataKey];
    if (!sectionData) return Promise.resolve({ title: key, narrative: null });
    return generateSectionNarrative(key, sectionData, birthData, sections, language, rashiContext, ageContext, userName, userGender);
  });

  const narrativeResults = await Promise.all(narrativePromises);

  const elapsed = Date.now() - startTime;
  console.log(`[AI Report] All narratives generated in ${elapsed}ms (total with coherence: ${Date.now() - coherenceStart}ms)`);

  const narrativeSections = {};
  sectionOrder.forEach((key, i) => {
    const result = narrativeResults[i];
    if (result && result.narrative) {
      narrativeSections[key] = {
        title: result.title,
        narrative: result.narrative,
        rawData: sections[key],
      };
    }
  });

  return {
    generatedAt: new Date().toISOString(),
    language,
    birthData,
    rashiChart: {
      houses: houseChart.houses,
      lagna: houseChart.lagna,
      planets: planetPositions,
    },
    narrativeSections,
    rawSections: sections,
    coreThemes: coreThemes || null,
  };
}

/**
 * Translate advanced analysis text fields to Sinhala using AI (small token call).
 * Collects all English description/interpretation strings into a numbered list,
 * sends ONE batch call to Gemini with ~1500 tokens, maps translations back.
 */
async function translateAdvancedForDisplay(advancedAnalysis) {
  if (!advancedAnalysis) return advancedAnalysis;

  // ── Collect all translatable text into a flat array ──
  const texts = [];
  const paths = []; // tracks where each text came from so we can map back

  // Tier 1: Doshas
  if (advancedAnalysis.tier1?.doshas?.items) {
    advancedAnalysis.tier1.doshas.items.forEach((d, i) => {
      if (d.name) { texts.push(d.name); paths.push({ t: 1, s: 'doshas', i, f: 'name' }); }
      if (d.description) { texts.push(d.description); paths.push({ t: 1, s: 'doshas', i, f: 'description' }); }
      if (d.cancellationReason) { texts.push(d.cancellationReason); paths.push({ t: 1, s: 'doshas', i, f: 'cancellationReason' }); }
    });
  }

  // Tier 1: Yogas
  if (advancedAnalysis.tier1?.advancedYogas?.items) {
    advancedAnalysis.tier1.advancedYogas.items.forEach((y, i) => {
      if (y.name) { texts.push(y.name); paths.push({ t: 1, s: 'yogas', i, f: 'name' }); }
      if (y.description) { texts.push(y.description); paths.push({ t: 1, s: 'yogas', i, f: 'description' }); }
    });
  }

  // Tier 1: Jaimini
  if (advancedAnalysis.tier1?.jaimini) {
    const j = advancedAnalysis.tier1.jaimini;
    if (j.karakamsha?.interpretation) { texts.push(j.karakamsha.interpretation); paths.push({ t: 1, s: 'jaimini', i: 0, f: 'karakamshaInterp' }); }
    if (j.karakamsha?.rashi) { texts.push(j.karakamsha.rashi); paths.push({ t: 1, s: 'jaimini', i: 0, f: 'karakamshaRashi' }); }
    if (j.arudhaLagna?.rashi) { texts.push(j.arudhaLagna.rashi); paths.push({ t: 1, s: 'jaimini', i: 0, f: 'arudhaRashi' }); }
    if (j.upapadaLagna?.rashi) { texts.push(j.upapadaLagna.rashi); paths.push({ t: 1, s: 'jaimini', i: 0, f: 'upapadaRashi' }); }
    if (j.karakas) {
      Object.entries(j.karakas).forEach(([key, k]) => {
        if (k.role) { texts.push(k.role); paths.push({ t: 1, s: 'jaimini', i: 0, f: 'role_' + key }); }
      });
    }
  }

  // Tier 2: Bhrigu Bindu
  if (advancedAnalysis.tier2?.bhriguBindu) {
    const bb = advancedAnalysis.tier2.bhriguBindu;
    if (bb.interpretation) { texts.push(bb.interpretation); paths.push({ t: 2, s: 'bhrigu', i: 0, f: 'interpretation' }); }
    if (bb.rashi) { texts.push(bb.rashi); paths.push({ t: 2, s: 'bhrigu', i: 0, f: 'rashi' }); }
    if (bb.nakshatra) { texts.push(bb.nakshatra); paths.push({ t: 2, s: 'bhrigu', i: 0, f: 'nakshatra' }); }
  }

  // Tier 3: Past Life
  if (advancedAnalysis.tier3?.pastLife) {
    const pl = advancedAnalysis.tier3.pastLife;
    if (pl.pastLife?.pastLifeStory) { texts.push(pl.pastLife.pastLifeStory); paths.push({ t: 3, s: 'pastLife', i: 0, f: 'story' }); }
    if (pl.currentLifeDirection?.direction) { texts.push(pl.currentLifeDirection.direction); paths.push({ t: 3, s: 'pastLife', i: 0, f: 'direction' }); }
    if (pl.pastLifeMerit?.assessment) { texts.push(pl.pastLifeMerit.assessment); paths.push({ t: 3, s: 'pastLife', i: 0, f: 'assessment' }); }
  }

  if (texts.length === 0) return advancedAnalysis;

  // ── Translate in batches to avoid token limits ──
  // Sinhala chars are ~3-4x more token-heavy than English
  const BATCH_SIZE = 6;
  const results = {};

  for (let batchStart = 0; batchStart < texts.length; batchStart += BATCH_SIZE) {
    const batchTexts = texts.slice(batchStart, batchStart + BATCH_SIZE);
    const numbered = batchTexts.map((t, i) => `${batchStart + i + 1}. ${t}`).join('\n');

    try {
      const translated = await callGemini([
        { role: 'system', content: 'You are a Sinhala translator for an astrology app. Translate each numbered line to simple, everyday Sinhala (සිංහල). NO technical jargon. NO English words. Keep the same numbered format. Output ONLY the numbered translations, nothing else.' },
        { role: 'user', content: numbered }
      ], Math.max(3000, batchTexts.length * 400));

      // ── Parse numbered responses back ──
      const lines = translated.split('\n').filter(l => /^\d+\./.test(l.trim()));
      lines.forEach(line => {
        const match = line.match(/^(\d+)\.\s*(.+)/);
        if (match) results[parseInt(match[1])] = match[2].trim();
      });
    } catch (batchErr) {
      console.error('Translation batch failed (non-fatal), batch start=' + batchStart + ':', batchErr.message);
      // Continue with next batch — partial translation is better than none
    }
  }

  // ── Map translations back ──
  paths.forEach((p, idx) => {
    const tr = results[idx + 1];
    if (!tr) return;

    if (p.s === 'doshas') {
      advancedAnalysis.tier1.doshas.items[p.i][p.f] = tr;
    } else if (p.s === 'yogas') {
      advancedAnalysis.tier1.advancedYogas.items[p.i][p.f] = tr;
    } else if (p.s === 'jaimini') {
      if (p.f === 'karakamshaInterp') advancedAnalysis.tier1.jaimini.karakamsha.interpretation = tr;
      else if (p.f === 'karakamshaRashi') advancedAnalysis.tier1.jaimini.karakamsha.rashi = tr;
      else if (p.f === 'arudhaRashi') advancedAnalysis.tier1.jaimini.arudhaLagna.rashi = tr;
      else if (p.f === 'upapadaRashi') advancedAnalysis.tier1.jaimini.upapadaLagna.rashi = tr;
      else if (p.f.startsWith('role_')) {
        const key = p.f.replace('role_', '');
        if (advancedAnalysis.tier1.jaimini.karakas[key]) advancedAnalysis.tier1.jaimini.karakas[key].role = tr;
      }
    } else if (p.s === 'bhrigu') {
      if (p.f === 'interpretation') advancedAnalysis.tier2.bhriguBindu.interpretation = tr;
      else if (p.f === 'rashi') advancedAnalysis.tier2.bhriguBindu.rashi = tr;
      else if (p.f === 'nakshatra') advancedAnalysis.tier2.bhriguBindu.nakshatra = tr;
    } else if (p.s === 'pastLife') {
      if (p.f === 'story') advancedAnalysis.tier3.pastLife.pastLife.pastLifeStory = tr;
      else if (p.f === 'direction') advancedAnalysis.tier3.pastLife.currentLifeDirection.direction = tr;
      else if (p.f === 'assessment') advancedAnalysis.tier3.pastLife.pastLifeMerit.assessment = tr;
    }
  });

  console.log('[translateAdvanced] Mapped ' + Object.keys(results).length + '/' + texts.length + ' translations');

  return advancedAnalysis;
}

/**
 * Generate simple, human-friendly explanations for ALL advanced chart data
 * in ONE small AI call. Returns an object with plain-language summaries.
 * Works for both English and Sinhala.
 */
async function explainChartSimple(advancedAnalysis, language = 'en') {
  if (!advancedAnalysis) return null;

  // ── Build a compact summary of all chart data for AI ──
  const parts = [];

  // Doshas
  if (advancedAnalysis.tier1?.doshas?.items?.length > 0) {
    const doshaList = advancedAnalysis.tier1.doshas.items.map(d =>
      `${d.name} (${d.severity}${d.cancelled ? ', CANCELLED' : ''}): ${d.description}`
    ).join(' | ');
    parts.push(`DOSHAS: ${doshaList}`);
  }

  // Yogas
  if (advancedAnalysis.tier1?.advancedYogas?.items?.length > 0) {
    const yogaList = advancedAnalysis.tier1.advancedYogas.items.map(y =>
      `${y.name} (${y.category}, ${y.strength}): ${y.description}`
    ).join(' | ');
    parts.push(`YOGAS: ${yogaList}`);
  }

  // Jaimini
  if (advancedAnalysis.tier1?.jaimini) {
    const j = advancedAnalysis.tier1.jaimini;
    let jParts = [];
    if (j.atmakaraka) jParts.push(`Soul Planet: ${j.atmakaraka.planet}`);
    if (j.karakamsha?.interpretation) jParts.push(`Soul Destination: ${j.karakamsha.rashi} - ${j.karakamsha.interpretation}`);
    if (j.arudhaLagna?.rashi) jParts.push(`Public Image: ${j.arudhaLagna.rashi}`);
    if (j.upapadaLagna?.rashi) jParts.push(`Marriage Sign: ${j.upapadaLagna.rashi}`);
    if (jParts.length) parts.push(`SOUL PURPOSE: ${jParts.join(' | ')}`);
  }

  // Shadbala
  if (advancedAnalysis.tier2?.shadbala) {
    const sbList = Object.values(advancedAnalysis.tier2.shadbala).map(sb =>
      `${sb.name}: ${sb.percentage}% (${sb.isAdequate ? 'Strong' : 'Weak'})`
    ).join(', ');
    parts.push(`PLANET POWER: ${sbList}`);
  }

  // Bhrigu Bindu
  if (advancedAnalysis.tier2?.bhriguBindu) {
    const bb = advancedAnalysis.tier2.bhriguBindu;
    parts.push(`DESTINY POINT: ${bb.degree}° in ${bb.rashi}, ${bb.nakshatra}. ${bb.interpretation || ''}`);
  }

  // Past Life
  if (advancedAnalysis.tier3?.pastLife) {
    const pl = advancedAnalysis.tier3.pastLife;
    let plParts = [];
    if (pl.pastLife?.pastLifeStory) plParts.push(pl.pastLife.pastLifeStory);
    if (pl.currentLifeDirection?.direction) plParts.push(`Direction: ${pl.currentLifeDirection.direction}`);
    if (pl.pastLifeMerit?.assessment) plParts.push(`Merit: ${pl.pastLifeMerit.assessment}`);
    if (plParts.length) parts.push(`PAST LIFE: ${plParts.join(' | ')}`);
  }

  if (parts.length === 0) return null;

  const langRule = language === 'si'
    ? 'Write EVERYTHING in pure simple Sinhala (සිංහල). ZERO English words. Use everyday language a village person would understand.'
    : 'Write everything in simple everyday English. No astrology jargon at all.';

  const prompt = `You are explaining someone's birth chart in simple terms. ${langRule}

Here is their chart data:
${parts.join('\n')}

Write a JSON object with these keys (each value is a short 1-3 sentence explanation):
{
  "doshas": "explain what challenges they face and what cancelled means",
  "yogas": "explain their special gifts/blessings",
  "soulPurpose": "explain their soul's mission and purpose",
  "planetPower": "which planets are strong/weak and what it means",
  "destinyPoint": "what their destiny point means for their life",
  "pastLife": "their past life story in simple words",
  "overall": "a 2-sentence overall summary of their chart"
}

Rules:
- Each explanation must be 1-3 sentences MAX
- Talk like a wise friend, not an astrologer
- NO technical terms (no "dosha", "yoga", "rashi", "house", "nakshatra")
- If a section has no data, write "N/A"
- Output ONLY valid JSON, nothing else`;

  try {
    // Sinhala uses ~3-4x more tokens per character than English
    const maxTok = language === 'si' ? 6000 : 3000;
    const raw = await callGemini([
      { role: 'system', content: 'You output ONLY valid JSON. No markdown, no code fences, no extra text.' },
      { role: 'user', content: prompt }
    ], maxTok);

    // Clean markdown fences if present
    let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

    // Replace literal newlines/carriage-returns inside the text (before JSON parse)
    cleaned = cleaned.replace(/\r/g, '');
    // Replace newlines that are INSIDE string values (not structural)
    cleaned = cleaned.replace(/\n/g, ' ');

    // ── Robust truncated JSON recovery ──
    // Try parsing as-is first
    try {
      return JSON.parse(cleaned);
    } catch (_firstErr) {
      // If it failed, try to fix common truncation issues
      let fixed = cleaned;

      // Remove any trailing incomplete key-value (after last complete value)
      // Find the last complete "key": "value" or "key": "value",
      const lastCompleteComma = fixed.lastIndexOf('",');
      const lastCompleteEnd = fixed.lastIndexOf('"}');
      const lastGoodPos = Math.max(lastCompleteComma, lastCompleteEnd);

      if (lastGoodPos > 0) {
        fixed = fixed.substring(0, lastGoodPos + 1); // include the closing "
      }

      // Ensure it ends with }
      if (!fixed.endsWith('}')) {
        fixed = fixed + '}';
      }

      // Ensure it starts with {
      const braceStart = fixed.indexOf('{');
      if (braceStart > 0) fixed = fixed.substring(braceStart);

      try {
        return JSON.parse(fixed);
      } catch (_secondErr) {
        // Last resort: extract whatever key-value pairs we can find with regex
        const result = {};
        const kvRegex = /"(doshas|yogas|soulPurpose|planetPower|destinyPoint|pastLife|overall)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
        let match;
        while ((match = kvRegex.exec(cleaned)) !== null) {
          result[match[1]] = match[2].replace(/\\"/g, '"').replace(/\\n/g, ' ');
        }
        if (Object.keys(result).length > 0) {
          console.log(`[ExplainChart] Recovered ${Object.keys(result).length}/7 keys via regex fallback`);
          return result;
        }
        // Truly unrecoverable
        throw _secondErr;
      }
    }
  } catch (err) {
    console.error('Chart explanation AI failed (non-fatal):', err.message);
    return null;
  }
}

module.exports = {
  chat,
  buildSystemPrompt,
  buildBirthChartContext,
  buildTransitContext,
  generateAINarrativeReport,
  translateAdvancedForDisplay,
  explainChartSimple,
};
