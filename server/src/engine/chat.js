/**
 * AI Chat Service - "Ask the Astrologer"
 * 
 * Integrates OpenAI/Gemini APIs with Vedic astrology context
 * to provide personalized, culturally-aware astrological guidance.
 */

const { getPanchanga, getDailyNakath, getNakshatra, getRashi, getLagna, toSidereal, getMoonLongitude, getSunLongitude, generateFullReport, buildHouseChart, buildNavamshaChart, getAllPlanetPositions, calculateDrishtis, detectYogas, getPlanetStrengths, calculateAshtakavarga, calculateVimshottariDetailed } = require('./astrology');
const { generateAdvancedAnalysis } = require('./advanced');
const { extractGeminiUsage, extractOpenAIUsage, createTokenTracker, recordUsage, finalizeTracker, formatCostLog } = require('../utils/tokenCalculator');

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
          context += `- Body Type: ${c.primary || c.type} dominant (Vata:${c.vata} Pitta:${c.pitta} Kapha:${c.kapha})\n`;
          if (c.vulnerabilities && c.vulnerabilities.length > 0) {
            context += `- Constitutional vulnerabilities: ${c.vulnerabilities.join(', ')}\n`;
          }
        }
        if (healthResult.mentalHealth) {
          context += `- Mental Health Score: ${healthResult.mentalHealth.score || 'N/A'}/100\n`;
        }
        if (healthResult.vulnerableBodyParts && healthResult.vulnerableBodyParts.length > 0) {
          const topParts = healthResult.vulnerableBodyParts.slice(0, 3).map(v => v.zone || v.reason || v).join(' | ');
          context += `- Top Vulnerable Areas: ${topParts}\n`;
        }
        if (healthResult.diseaseSusceptibility && healthResult.diseaseSusceptibility.length > 0) {
          context += `- Disease susceptibility:\n`;
          healthResult.diseaseSusceptibility.slice(0, 5).forEach(d => {
            context += `  • [${d.severity}] ${d.indicator}: ${(d.diseases || []).join(', ')}\n`;
          });
        }
        if (healthResult.marakaAnalysis) {
          const m = healthResult.marakaAnalysis;
          context += `- Maraka (critical health) planets: ${(m.dangerousPlanets || []).join(', ')}\n`;
          context += `- Maraka warning: ${m.warning || 'N/A'}\n`;
        }
        // Kidney risk from the detailed engine
        const kidneyRisk = healthResult.diseaseSusceptibility?.find(d =>
          (d.indicator || '').toLowerCase().includes('venus') ||
          (d.diseases || []).some(dis => dis.toLowerCase().includes('kidney'))
        );
        if (kidneyRisk) {
          context += `- Kidney/Urinary risk: ${kidneyRisk.severity} — ${(kidneyRisk.diseases || []).slice(0,3).join(', ')}\n`;
        }
        if (healthResult.healthCrisisTiming) {
          const { currentCrisis, futureWindows } = healthResult.healthCrisisTiming;
          if (currentCrisis) {
            context += `- ⚠️ CURRENT HEALTH CRISIS PERIOD: ${currentCrisis.mahadasha}-${currentCrisis.antardasha} (${currentCrisis.start} to ${currentCrisis.end}) — diseases: ${(currentCrisis.predictedDiseases || []).slice(0,3).join(', ')}\n`;
          }
          if (futureWindows && futureWindows.length > 0) {
            context += `- Next health-sensitive period: ${futureWindows[0].mahadasha}-${futureWindows[0].antardasha} (${futureWindows[0].start} to ${futureWindows[0].end})\n`;
          }
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

  const model = 'gpt-4o-mini';
  const response = await openai.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    temperature: 0.7,
  });

  return {
    text: response.choices[0].message.content,
    usage: extractOpenAIUsage(response),
    model,
  };
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

  return {
    text: data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate response.',
    usage: extractGeminiUsage(data),
    model,
  };
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
    let result;
    if (provider === 'gemini') {
      result = await callGemini(messages, maxTokens);
    } else {
      result = await callOpenAI(messages, maxTokens);
    }

    return {
      message: result.text,
      provider,
      usage: result.usage || null,
      model: result.model || provider,
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
    familyPortrait: '👨‍👩‍👧‍👦 ගැඹුරු පවුලේ කතාව — දෙමව්පියන්, සහෝදරයෝ සහ පවුල් කර්මය',
    timeline25: '📅 ඉදිරි අවුරුදු 25 — ඔයාගේ ජීවිතේ ෆිල්ම් එක',
    remedies: '💎 ඔයාගේ බල මෙවලම් කට්ටලය',
  };

  const SECTION_PROMPTS = {
    personality: {
      title: '✨ Who You Really Are',
      prompt: `Write a SOUL-READING personality analysis for someone born with ${lagnaEn} rising sign and Moon in ${moonEn}, Nakshatra: ${nakshatraName}. This should feel like you've been watching them their whole life.

REMINDER: Do NOT use any astrology terms in the output. No "Lagna", "Rashi", "Nakshatra", "4th house", "Moon placement", "Atmakaraka", "Shadbala" etc. Describe everything as human experiences. If the language is Sinhala, write 100% pure Sinhala with zero English words.

━━━ COMPLETE PERSONALITY ENGINE DATA (USE ALL OF THIS — NO HALLUCINATION) ━━━

RISING SIGN: ${lagnaEn} (${sectionData?.lagna?.name || 'N/A'}), degree: ${sectionData?.lagna?.degree || 'N/A'}°
RISING SIGN LORD: ${sectionData?.lagna?.lord || 'N/A'}, placed in house ${sectionData?.lagnaLordPosition?.house || 'N/A'}
  → Interpretation: ${sectionData?.lagnaLordPosition?.interpretation || 'N/A'}
MOON SIGN: ${moonEn} (${sectionData?.moonSign?.name || 'N/A'})
SUN SIGN: ${sectionData?.sunSign?.english || 'N/A'} (${sectionData?.sunSign?.name || 'N/A'})
NAKSHATRA: ${nakshatraName}, Pada ${sectionData?.nakshatra?.pada || 'N/A'}, Lord: ${sectionData?.nakshatra?.lord || 'N/A'}

ELEMENT ANALYSIS:
- Rising Sign Element: ${sectionData?.lagnaElement?.element || 'N/A'} — ${sectionData?.lagnaElement?.traits?.en || 'N/A'}
- Moon Element: ${sectionData?.moonElement?.element || 'N/A'} — ${sectionData?.moonElement?.traits?.en || 'N/A'}
- Element Blend: ${sectionData?.lagnaElement?.element === sectionData?.moonElement?.element ? 'SAME element (pure ' + (sectionData?.lagnaElement?.element || '') + ' — very concentrated personality)' : 'DIFFERENT elements (' + (sectionData?.lagnaElement?.element || '') + ' + ' + (sectionData?.moonElement?.element || '') + ' — internal tension between outer persona and inner feelings)'}

PLANETS IN 1ST HOUSE (directly shape visible personality): ${(sectionData?.planetsIn1st || []).join(', ') || 'None — personality is shaped purely by the rising sign lord placement'}
PLANETS ASPECTING 1ST HOUSE (external influences on personality): ${(sectionData?.aspectsOn1st || []).join(', ') || 'None'}
OVERALL PERSONALITY STRENGTH: ${sectionData?.overallStrength || 'moderate'}

Soul Planet (Atmakaraka): ${sectionData?.atmakaraka ? `${sectionData.atmakaraka.planet} in ${sectionData.atmakaraka.rashi} — ${sectionData.atmakaraka.meaning}` : 'Not available'}
Rising Sign Lord Strength (Shadbala): ${sectionData?.lagnaLordShadbala ? `${sectionData.lagnaLordShadbala.percentage}% — ${sectionData.lagnaLordShadbala.strength}. ${sectionData.lagnaLordShadbala.note || ''}` : 'Not available'}

MENTAL/EMOTIONAL BACKDROP: ${allSections?.mentalHealth?.mentalStability || 'Not available'}
CURRENT LIFE PHASE: ${currentDasha} main / ${currentAD} sub — this colors their CURRENT personality expression

${sectionData?.lagnaCuspWarning?.isNearCusp ? `⚠️ BIRTH TIME SENSITIVITY: Lagna is at ${sectionData.lagnaCuspWarning.degreeInSign}° — near a sign boundary (${sectionData.lagnaCuspWarning.currentSign || sectionData.lagna?.english}/${sectionData.lagnaCuspWarning.alternateSign}). This person may exhibit traits of BOTH signs. Present both personality profiles and note "you may feel like you're a blend of two different energies."` : ''}

━━━ HOW TO USE THIS DATA (NO GUESSING ALLOWED) ━━━
- Rising sign + its lord placement → how they appear to the world, physical appearance, first impression
- Moon sign + nakshatra → inner emotional world, private self, childhood memories, intuition
- Sun sign → ego, public identity, confidence, creative expression
- Element blend → fundamental personality tension or harmony
- Planets in 1st house → dominant personality traits that override everything else
- Aspects on 1st house → external forces shaping their character (from specific people/events)
- Atmakaraka → their SOUL'S deepest purpose (the one thing they're here to learn)
- Rising lord strength → confidence meter (high = naturally assertive, low = self-doubting but deep)
- Mental stability indicator → emotional baseline (Moon-Saturn = childhood trauma carrier)
- Current dasha → which "flavor" of themselves they're expressing RIGHT NOW

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

━━━ COMPLETE MARRIAGE ENGINE DATA (USE ALL — NO HALLUCINATION) ━━━

7TH HOUSE ANALYSIS:
- Sign: ${sectionData?.seventhHouse?.rashiEnglish || 'N/A'} (${sectionData?.seventhHouse?.rashi || ''})
- Strength: ${sectionData?.seventhHouse?.strength || 'N/A'}
- Planets in 7th: ${(sectionData?.seventhHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- Aspects on 7th: ${(sectionData?.seventhHouse?.aspectingPlanets || []).map(a => a.planet || a).join(', ') || 'None'}
- 7th Lord: ${sectionData?.seventhLord?.name || 'N/A'} in house ${sectionData?.seventhLord?.house || 'N/A'}
  → Interpretation: ${sectionData?.seventhLord?.interpretation || 'N/A'}

VENUS (LOVE PLANET):
- Venus in house: ${sectionData?.venus?.house || 'N/A'}
- Venus sign: ${sectionData?.venus?.rashi || 'N/A'}
- Venus in Navamsha: ${sectionData?.venus?.navamshaRashi || 'N/A'}

KUJA DOSHA (MARS AFFLICTION):
- Present: ${sectionData?.kujaDosha?.present ? 'YES — Mars in house ' + sectionData.kujaDosha.marsHouse : 'NO'}
- Note: ${sectionData?.kujaDosha?.note || 'N/A'}

MARRIAGE AFFLICTIONS:
- Severity: ${sectionData?.marriageAfflictions?.severity || 'N/A'} (Score: ${sectionData?.marriageAfflictions?.severityScore || 'N/A'}/10)
- Issues: ${(sectionData?.marriageAfflictions?.afflictions || []).join(' | ') || 'None'}
- Summary: ${sectionData?.marriageAfflictions?.summary || 'N/A'}

SPOUSE QUALITIES: ${sectionData?.spouseQualities || 'N/A'}

JAIMINI SPOUSE DATA:
- Darakaraka (Spouse Planet): ${sectionData?.darakaraka ? `${sectionData.darakaraka.planet} in ${sectionData.darakaraka.rashi} — ${sectionData.darakaraka.spouseNature}` : 'Not available'}
- Upapada Lagna (Marriage Indicator): ${sectionData?.upapadaLagna ? `${sectionData.upapadaLagna.rashi} — ${sectionData.upapadaLagna.meaning}` : 'Not available'}

NAVAMSHA (D9) MARRIAGE ANALYSIS:
- D9 Lagna: ${sectionData?.navamshaAnalysis?.d9LagnaSign || 'N/A'}
- Venus in D9: ${sectionData?.navamshaAnalysis?.venusInNavamsha || 'N/A'}
- D9 7th house planets: ${(sectionData?.navamshaAnalysis?.d9SeventhPlanets || []).join(', ') || 'None'}
- Marriage Strength: ${sectionData?.navamshaAnalysis?.marriageStrength || 'N/A'}

MARRIAGE TIMING ENGINE (SPECIFIC YEARS — USE THESE):
${sectionData?.marriageTimingPrediction?.firstMarriageWindows?.length ? sectionData.marriageTimingPrediction.firstMarriageWindows.map((w, i) => `${i + 1}. ${w.period} (${w.dateRange}) — Age ${w.ageRange}, Peak year: ${w.peakYear}, Score: ${w.score}/100 [${w.confidence}]${w.reasons?.length ? '\n   Reasons: ' + w.reasons.join('; ') : ''}`).join('\n') : 'Marriage timing data not available — use general dasha timing from: ' + (sectionData?.marriageTimingIndicators || []).join('; ')}
${sectionData?.marriageTimingPrediction?.bestWindow ? `BEST WINDOW: ${sectionData.marriageTimingPrediction.bestWindow.period} (${sectionData.marriageTimingPrediction.bestWindow.dateRange}), Age ${sectionData.marriageTimingPrediction.bestWindow.ageRange}` : ''}

${sectionData?.lagnaCuspWarning?.isNearCusp ? `⚠️ BIRTH TIME SENSITIVITY: Lagna is at ${sectionData.lagnaCuspWarning.degreeInSign}° — near a sign boundary. Marriage predictions may vary.` : ''}

━━━ HOW TO USE THIS DATA (NO GUESSING ALLOWED) ━━━
- 7th house sign → what KIND of marriage partner they attract
- 7th lord placement → WHERE they'll meet their spouse (house = life domain)
- Planets IN 7th → direct modifiers of spouse personality
- Venus house/sign → HOW they experience love and pleasure
- Kuja Dosha → if present, marriage has friction/delay/intensity
- Marriage afflictions → CRITICAL: if severity is SEVERE, marriage WILL be difficult. Don't sugarcoat.
- Darakaraka → the single most accurate spouse descriptor
- D9 marriage strength → final verdict on marital happiness
- Marriage timing windows → USE THESE EXACT YEARS for predictions
- If affliction severity is SEVERE, predict: frequent arguments, possible separation periods, need for conscious effort

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

━━━ COMPLETE CAREER ENGINE DATA (USE ALL — NO HALLUCINATION) ━━━

10TH HOUSE (CAREER HOUSE):
- Sign: ${sectionData?.tenthHouse?.rashiEnglish || 'N/A'}
- Strength: ${sectionData?.tenthHouse?.strength || 'N/A'}
- Planets in 10th: ${(sectionData?.tenthHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- Aspects on 10th: ${(sectionData?.tenthHouse?.aspectingPlanets || []).map(a => a.planet || a).join(', ') || 'None'}
- 10th Lord: ${sectionData?.tenthLord?.name || 'N/A'} in house ${sectionData?.tenthLord?.house || 'N/A'}

2ND HOUSE (WEALTH/SAVINGS):
- Sign: ${sectionData?.secondHouse?.rashiEnglish || 'N/A'}
- Strength: ${sectionData?.secondHouse?.strength || 'N/A'}
- Planets in 2nd: ${(sectionData?.secondHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- 2nd Lord house: ${sectionData?.secondHouse?.lordHouse || 'N/A'}

11TH HOUSE (GAINS/INCOME):
- Sign: ${sectionData?.eleventhHouse?.rashiEnglish || 'N/A'}
- Strength: ${sectionData?.eleventhHouse?.strength || 'N/A'}
- Planets in 11th: ${(sectionData?.eleventhHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- 11th Lord house: ${sectionData?.eleventhHouse?.lordHouse || 'N/A'}

SUGGESTED CAREERS: ${(sectionData?.suggestedCareers || []).join(', ') || 'N/A'}
DHANA YOGAS (Wealth Combos): ${(sectionData?.dhanaYogas || []).join(' | ') || 'None detected'}
WEALTH STRENGTH (Ashtakavarga): ${sectionData?.wealthStrength ? `H2 Bindus: ${sectionData.wealthStrength.house2Bindus}, H11 Bindus: ${sectionData.wealthStrength.house11Bindus} — ${sectionData.wealthStrength.assessment}` : 'N/A'}
BUSINESS VS SERVICE: ${sectionData?.businessVsService || 'N/A'}

BIRTH DATA: Rising sign: ${lagnaEn}, Moon: ${moonEn}

⚠️ CAREER DEPTH DATA (USE THIS FOR PRECISION):
- Career Divisional Chart (D10): ${sectionData?.dashamsha ? `D10 Lagna: ${sectionData.dashamsha.d10Lagna}, Sun in D10: ${sectionData.dashamsha.d10Sun}, Saturn in D10: ${sectionData.dashamsha.d10Saturn}, 10th Lord in D10: ${sectionData.dashamsha.d10TenthLord}` : 'Not available'}
- Career Significator: ${sectionData?.amatyakaraka ? `${sectionData.amatyakaraka.planet} in ${sectionData.amatyakaraka.rashi} — ${sectionData.amatyakaraka.meaning}` : 'Not available'}
- 10th Lord Strength: ${sectionData?.tenthLordShadbala ? `${sectionData.tenthLordShadbala.totalRupas} Rupas (${sectionData.tenthLordShadbala.percentage}%) — ${sectionData.tenthLordShadbala.strength}. Strongest aspect: ${sectionData.tenthLordShadbala.strongestComponent}` : 'Not available'}
${sectionData?.lagnaCuspWarning?.isNearCusp ? `⚠️ BIRTH TIME SENSITIVITY: Lagna is at ${sectionData.lagnaCuspWarning.degreeInSign}° — near a sign boundary. Career predictions may vary if birth time is slightly off. Present both possibilities.` : ''}

⚠️ HOME & DOMESTIC LIFE INDICATORS — READ CAREFULLY BEFORE WRITING:
- Home house lord: ${sectionData?.homeLifeIndicators?.h4Lord} placed in house ${sectionData?.homeLifeIndicators?.h4LordHouse}${sectionData?.homeLifeIndicators?.h4LordInDusthana ? ' (SUFFERING/DIFFICULT HOUSE — home carries hidden burden)' : ''}
- Planets in home house: ${(sectionData?.homeLifeIndicators?.h4PlanetsAll || []).join(', ') || 'None'}
- Benefics in home house: ${(sectionData?.homeLifeIndicators?.beneficsInH4 || []).join(', ') || 'None'}
- External career house empty: ${sectionData?.homeLifeIndicators?.h10Empty ? 'YES — no planets driving external career ambition' : 'No — some external career pull exists'}
- Emotional isolation (Kemadruma): ${sectionData?.homeLifeIndicators?.kemadrumaPresent ? 'YES — Moon isolated, carries burdens alone' : 'No'}
- Domestic life patterns: ${(sectionData?.homeLifeIndicators?.domesticYogas || []).join(' | ') || 'None detected'}
- DOMESTIC ROLE INDICATOR: ${sectionData?.homeLifeIndicators?.domesticRole} (PRIMARY = homemaker/housewife is the main life path; SECONDARY = home and career balanced; NONE = career-dominant)
- Home life story: ${sectionData?.homeLifeIndicators?.homeNarrative || 'Not available'}

${sectionData?.homeLifeIndicators?.domesticRole === 'PRIMARY' ? `
🏠 SPECIAL INSTRUCTION — DOMESTIC ROLE DETECTED:
This chart clearly shows a HOMEMAKER / HOUSEWIFE path. Their career IS the home. Do NOT write this as a conventional career reading about job titles and salaries. Instead:
- Open by honouring their domestic role as REAL, SKILLED, DEMANDING work — not a "lesser" path
- Describe WHAT their home life looks like: the intelligence and organisation they bring to it, the quiet perfection they hold themselves to, the way they manage complex family dynamics
- Describe THE HIDDEN BURDEN: The home lord in a difficult house means this domestic role comes with real pain — what kind of suffering? Loss, loneliness, sacrifice? Name it with compassion.
- Describe THE EMOTIONAL ISOLATION: If Kemadruma is present, this person carries their burdens largely alone, even inside their own home. Acknowledge this without judgment.
- Show THE LOCKED POTENTIAL: With powerful benefics in the home house, they have exceptional intelligence and capability that may never have had a professional outlet — this is a genius working in an unlisted role.
- Describe THE DASHA STORY of their domestic life: when marriage changed everything, when children defined their world, when they quietly sacrificed an ambition.
- Show THE TURNING POINT AHEAD: When does the domestic pattern shift? Is there a dasha coming where they can redirect energy outward — study, a small business, a creative pursuit? Name the specific time window.
- END with EMPOWERMENT: "The hardest job in the world has no title, no salary, and no performance review. You have been doing it — with your intelligence, your sacrifice, and your silent love. That is not nothing. That is everything."
` : ''}

USE the Career Significator planet to identify their SPECIFIC career calling — this planet's qualities directly describe their professional destiny.
USE the D10 chart data to differentiate career advice from general personality — D10 shows the PROFESSIONAL self, which may differ from the birth chart self.
USE the 10th Lord Strength to gauge career success potential — if very strong, predict exceptional career achievements.

${sectionData?.homeLifeIndicators?.domesticRole !== 'PRIMARY' ? `⚠️ MANDATORY SPECIFICS — YOU MUST INCLUDE ALL OF THESE (no vague answers allowed):
- Name 3-5 EXACT job titles or specific industries (e.g., "civil engineering", "hotel management", "graphic design", "pharmaceutical sales", "property development") — NEVER use vague categories like "something creative" or "a leadership role"
- EXACT peak earning age range (e.g., "ages 38-45")
- SPECIFIC career change years if any (e.g., "expect a major career shift around 2029")
- If their career will be MEDIOCRE or STRUGGLING, say so: "Your chart shows career progress will be slower than your peers until age [X]" — do NOT pretend everyone will be a CEO
- Monthly/annual income range expectations at different life stages (relative terms OK: "comfortable middle-class income by 35, significant wealth by 45")
- Whether they'll be self-employed or employed, and when that transition happens` : `⚠️ FOR DOMESTIC ROLE — MANDATORY SPECIFICS:
- DESCRIBE their domestic management style in vivid detail (perfectionist? nurturing? quietly strategic?)
- NAME the specific domestic burden their chart shows (financial pressure? health of family members? isolation? sacrifice of dreams?)
- IDENTIFY the exact life phase when their domestic role was at its most demanding
- POINT to the first time window (after ${new Date().getFullYear()}) when they could redirect energy into something of their own
- SUGGEST what that "something" might be, based on their chart strengths (teaching? healing? writing? a home-based business?)`}

WRITE AT LEAST 7-9 PARAGRAPHS that feel like a personal career consultation worth thousands:

${sectionData?.homeLifeIndicators?.domesticRole === 'PRIMARY' ? `
1. **THE CAREER THEY CHOSE — AND THE ONE THAT CHOSE THEM** — Open with deep respect: "Most people will never understand the kind of work you do. No job title, no salary, no recognition. But the home you've built is your life's masterpiece..." Honour their choice fully.

2. **YOUR DOMESTIC GENIUS** — "You didn't just manage a home. You managed a world. You are [describe their specific domestic intelligence — organiser? peacekeeper? educator of children? emotional anchor?]. The irony is that this same skill set, in a boardroom, would be called [executive function / leadership / strategic planning]."

3. **THE HIDDEN WEIGHT** — "But here's what almost nobody sees: ${sectionData?.homeLifeIndicators?.homeNarrative}" Describe the specific pain the chart shows — the H4 lord in a difficult house, the loneliness of Kemadruma, the quiet grief of an unlived ambition.

4. **THE DASHA STORY OF YOUR HOME LIFE** — Walk through the major periods: when you entered this domestic life, what shifted in [specific dasha period], what the current period (${sectionData?.homeLifeIndicators?.domesticYogas?.[0] || 'the current phase'}) feels like right now.

5. **YOUR MONEY REALITY** — How does financial life work for a homemaker? Who controls it? What are the pressures? What financial wisdom have you quietly accumulated? Be specific and real.

6. **THE LOCKED POTENTIAL** — "If there is one thing I want you to hear: you have [describe their specific intelligence — Jupiter + Mercury in home house = exceptional education, analytical mind, teaching ability]. That has not been wasted. But it is waiting..." Name what is waiting.

7. **THE TURNING POINT AHEAD** — "There is a window coming — [specific dasha period after current year] — where something shifts. The demands of the home loosen slightly. The world outside starts to call your name again. This is the time to [specific suggestion — enroll in a course / start a small income / find a creative outlet]."

8. **WHAT YOU SHOULD BUILD — RIGHT NOW** — Concrete, practical. What is the one thing this person could begin today that honours their intelligence and creates something of their own? Be specific.

9. **THE FINAL WORD** — End with something they'll read again and again. Something about the invisible labour of love, the intelligence that never got a certificate, and the turning point that is coming.
` : `
1. **YOUR PROFESSIONAL DNA** — Not generic. SPECIFIC: "You're not just 'good at leadership' — you're the type who walks into a chaotic, failing team and within 3 months, everyone is performing at their peak." OR "You're the silent strategist. While everyone's arguing in the meeting, you're already five moves ahead."

2. **YOUR CAREER KRYPTONITE** — What destroys their work motivation? "Put you in a micromanaged environment with no autonomy, and watch the fire in your eyes die within months. You NEED [specific work condition]."

3. **THE CAREER YOU WERE BORN FOR** — Specific paths: ${(sectionData?.suggestedCareers || []).join(', ')} — for each one, explain WHY it fits their soul.

4. **YOUR MONEY PERSONALITY** — "Let me tell you something about your relationship with money that you probably haven't admitted to yourself: [specific money behavior]."

5. **WEALTH BUILDING BLUEPRINT** — "Your wealth won't come from [one source]. Your chart screams [specific wealth pattern]. The key? ${(sectionData?.dhanaYogas || []).join('; ')}." Translate into plain language.

6. **${sectionData?.businessVsService || 'Career Direction'}** — expand dramatically. If business: "You're wasting your time building someone else's dream." If service: "Your path is mastering your craft until you're the best in your field."

7. **YOUR PEAK EARNING WINDOW** — "There's a period coming — between [years] — where everything you've been building starts paying off MASSIVELY. Here's how to prepare RIGHT NOW..."

8. **MONEY MISTAKES TO AVOID** — "Based on your nature, you're prone to [specific financial mistake]. Here's how to break it..."

9. **THE 5-YEAR CAREER PLAN THE STARS SUGGEST:**
- **This year:** [specific career action]
- **Next year:** [build/pivot/invest in what]
- **Year 3:** [acceleration point]
- **Year 5:** [where they should be]
`}

- Make them feel seen, understood, and empowered
- Be brutally honest about challenges but deeply empowering about strengths
- Never be vague — every paragraph should feel like it was written for THIS person alone`,
    },

    children: {
      title: '👶 Children & Family Life',
      prompt: `Write a warm, deeply detailed, MIND-BLOWING reading about children, family life, and legacy. This person should feel like you've watched their parenting journey — past, present, and future.

REMINDER: Do NOT use any astrology terms. No "5th house", "Jupiter placement", "Putra Bhava", "Saptamsha", "Putrakaraka" etc. Describe everything as real-life family experiences. If Sinhala, write 100% pure Sinhala — zero English words.

━━━ COMPLETE CHILDREN ENGINE DATA (USE ALL — NO HALLUCINATION) ━━━

5TH HOUSE (CHILDREN HOUSE):
- Sign: ${sectionData?.fifthHouse?.rashiEnglish || 'N/A'}
- Strength: ${sectionData?.fifthHouse?.strength || 'N/A'}
- Planets in 5th: ${(sectionData?.fifthHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- Aspects on 5th: ${(sectionData?.fifthHouse?.aspectingPlanets || []).map(a => a.planet || a).join(', ') || 'None'}
- 5th Lord: ${sectionData?.fifthLord?.name || 'N/A'} in house ${sectionData?.fifthLord?.house || 'N/A'}

JUPITER (CHILDREN KARAKA): House ${sectionData?.jupiter?.house || 'N/A'}
  → ${sectionData?.jupiter?.note || ''}

ENGINE ASSESSMENT: ${sectionData?.assessment || 'N/A'}

CHILDREN TIMING (DASHA PERIODS): ${(sectionData?.childrenTimingDasas || []).join(' | ') || 'N/A'}

CHILDREN DIVISIONAL CHART (D7 Saptamsha): ${sectionData?.saptamsha ? `D7 Lagna: ${sectionData.saptamsha.d7Lagna}, Jupiter in D7: ${sectionData.saptamsha.d7Jupiter}, 5th Lord in D7: ${sectionData.saptamsha.d7FifthLord}` : 'Not available'}

CHILDREN SIGNIFICATOR (Putrakaraka): ${sectionData?.putrakaraka ? `${sectionData.putrakaraka.planet} in ${sectionData.putrakaraka.rashi} — ${sectionData.putrakaraka.meaning}` : 'Not available'}

JUPITER STRENGTH (Shadbala): ${sectionData?.jupiterShadbala ? `${sectionData.jupiterShadbala.percentage}% — ${sectionData.jupiterShadbala.strength} (${sectionData.jupiterShadbala.totalRupas} Rupas)` : 'Not available'}

⚠️ ESTIMATED CHILDREN — THE VIRAL PREDICTION (USE WITH BOLD CONFIDENCE):
- Estimated count: ${sectionData?.estimatedChildren?.count || 'N/A'}
- Gender tendency: ${sectionData?.estimatedChildren?.genderTendency || 'N/A'}
- Scoring explanation: ${sectionData?.estimatedChildren?.note || 'N/A'}
- Jupiter debilitated: ${sectionData?.estimatedChildren?.jupiterDebilitated ? 'YES — reduces count by 1' : 'No'}

⚠️ MARRIAGE AFFLICTIONS (AFFECTS CHILDREN):
${allSections?.marriage?.marriageAfflictions ? `Severity: ${allSections.marriage.marriageAfflictions.severity} (Score: ${allSections.marriage.marriageAfflictions.severityScore}/10)\nIssues: ${(allSections.marriage.marriageAfflictions.afflictions || []).join(' | ')}` : 'N/A'}

━━━ HOW TO USE THIS DATA (NO GUESSING ALLOWED) ━━━
- estimatedChildren.count → SAY THIS NUMBER BOLDLY: "You will have ${sectionData?.estimatedChildren?.count || '2'} children"
- genderTendency → STATE THIS: "${sectionData?.estimatedChildren?.genderTendency || 'Mix'}"
- 5th house strength → quality of relationship with children
- Jupiter strength → fertility and children's prosperity
- D7 chart → CONFIRMS or ADJUSTS the basic 5th house reading
- Putrakaraka planet → personality of the children themselves
- Children timing dashas → WHEN children arrive (give specific years)
- If marriage afflictions are SEVERE → children may experience parents' marital tension

WRITE AT LEAST 10-12 DEEPLY PERSONAL PARAGRAPHS:

1. **HOW MANY CHILDREN WILL YOU HAVE?** — Be BOLD: "You are most likely to have ${sectionData?.estimatedChildren?.count || '2'} children." Don't hedge. Gender: "${sectionData?.estimatedChildren?.genderTendency || 'mix of sons and daughters'}." This is the #1 thing people want to know.

2. **YOUR FIRST CHILD** — "Your first child will be [gender tendency]. They will arrive around [timing]. This child will be [personality description — quiet, energetic, stubborn, brilliant?]. The moment you hold them, [emotional description]."

3. **YOUR SECOND CHILD** — "If you have a second child, they'll be remarkably different from the first. Where the first is [trait], the second will be [opposite trait]. The sibling dynamic between them will be [description]."

4. **YOUR PARENTING STYLE** — Not generic. "You're the type of parent who [specific behavior]. You'll be strict about [specific things] but surprisingly relaxed about [other things]. Your children will describe you as [specific]. The mistake you're most likely to make as a parent: [specific]."

5. **YOUR CHILDREN'S EDUCATION** — "Your first child will excel in [specific subjects]. Your second child's talents lie in [different areas]. The challenge: one child will be easy to educate, the other will need a completely different approach."

6. **YOUR CHILDREN'S CAREER PATHS** — "Your eldest will likely gravitate toward [field]. Your younger one will surprise everyone by choosing [unexpected field]."

7. **PARENT-CHILD CONFLICTS** — "Around the time your child reaches [teenage/young adult], there will be a clash. The issue: [specific — independence, career choice, relationship, values]. How to handle it: [specific advice]."

8. **FERTILITY & TIMING** — Be compassionate but specific about timing windows. If challenges exist, acknowledge them with hope: "Your path to parenthood may require [patience/assistance], but the outcome is worth every moment of waiting."

9. **YOUR RELATIONSHIP WITH YOUR OWN PARENTS** — How childhood patterns shape their parenting. "The way your father/mother raised you left a mark. You'll unconsciously repeat [specific pattern] — but you'll also consciously correct [specific thing they wish was different]."

10. **CHILDREN & YOUR MARRIAGE** — "Having children will [strengthen/test] your marriage. The first 2 years after a child are the most [bonding/stressful] period. The key to surviving this: [specific]."

11. **THE CHILD WHO CHANGES YOUR LIFE** — "One of your children will bring a transformation to your life that you never expected. Around age [X], something they say or do will make you rethink everything."

12. **YOUR FAMILY LEGACY** — "What you'll pass on to your children isn't just material. It's [specific values, skills, wisdom]. They'll remember you for [specific quality]. In your old age, your children will [prediction about care, relationship]."

- Be gentle, hopeful, and deeply personal
- Acknowledge different paths to parenthood
- NO technical terms`,
    },

    lifePredictions: {
      title: '🔮 Your Life Journey — Past, Present & Future',
      prompt: `Write the most captivating, spine-tingling life prediction this person has ever read. They should feel like you've watched a movie of their entire life — past AND future. This is the CROWN JEWEL of the entire report.

REMINDER: Do NOT use any astrology terms. No "Dasha", "Mahadasha", "Antardasha", "transit", "Rahu", "Ketu", "Saturn return" etc. Describe life phases as actual events and emotions. If Sinhala, write 100% pure Sinhala — zero English words.

━━━ COMPLETE LIFE PREDICTIONS ENGINE DATA (USE ALL — NO HALLUCINATION) ━━━

CURRENT LIFE PHASE:
- Main Period Lord: ${sectionData?.currentDasha?.lord || 'N/A'}
- Main Period: ${sectionData?.currentDasha?.period || 'N/A'}
- Main Period Effects: ${sectionData?.currentDasha?.effects || 'N/A'}
- Sub-Period Lord: ${sectionData?.currentAntardasha?.lord || 'N/A'}
- Sub-Period: ${sectionData?.currentAntardasha?.period || 'N/A'}

NEXT MAJOR LIFE PHASE:
- Lord: ${sectionData?.nextDasha?.lord || 'N/A'}
- Period: ${sectionData?.nextDasha?.period || 'N/A'}
- Effects: ${sectionData?.nextDasha?.effects || 'N/A'}

COMPLETE LIFE PHASES TIMELINE (each phase has a theme — USE THESE for decade-by-decade predictions):
${(sectionData?.lifePhaseSummary || []).map(d => `${d.lord}: ${d.period} (${d.years} years) — "${d.theme}"${d.isCurrent ? ' ← YOU ARE HERE NOW' : ''}`).join('\n')}

CROSS-REFERENCE DATA:
- Marriage afflictions severity: ${allSections?.marriage?.marriageAfflictions?.severity || 'N/A'}
- Estimated children: ${allSections?.children?.estimatedChildren?.count || 'N/A'}
- Career path: ${(allSections?.career?.suggestedCareers || []).slice(0, 3).join(', ') || 'N/A'}
- Health danger periods: ${(allSections?.health?.dangerPeriods || []).filter(d => d.level === 'CRITICAL').slice(0, 3).map(d => d.lord + '-' + d.antardasha + ': ' + d.period).join(' | ') || 'None critical'}
- Foreign travel likelihood: ${allSections?.foreignTravel?.foreignLikelihood || 'N/A'}

━━━ HOW TO USE THIS DATA (NO GUESSING ALLOWED) ━━━
- Each life phase = a chapter in their movie. The lord determines the THEME:
  Sun = authority, fame, government  |  Moon = emotions, mother, travel
  Mars = energy, conflict, property  |  Mercury = business, education, communication
  Jupiter = expansion, children, wisdom  |  Venus = love, luxury, creativity
  Saturn = discipline, hardship, endurance  |  Rahu = obsession, foreign, unconventional
  Ketu = spiritual, loss, detachment
- isCurrent = TRUE → this is what they're living RIGHT NOW. Describe it vividly.
- Cross-reference marriage timing, career peak, health danger periods for SPECIFIC predictions
- PAST phases (before current age) → describe what ALREADY happened (builds trust)
- FUTURE phases → describe what WILL happen (the exciting part)

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

━━━ COMPLETE MENTAL HEALTH ENGINE DATA (USE ALL — NO HALLUCINATION) ━━━

MENTAL STABILITY ASSESSMENT: ${sectionData?.mentalStability || 'N/A'}
${(sectionData?.mentalStability || '').includes('Moon-Saturn') ? '⚠️ MAJOR FLAG: Moon-Saturn conjunction (emotional suffering pattern) is present. This person likely experienced childhood trauma, emotional neglect, periods of depression, or a difficult home environment. This MUST be addressed prominently and compassionately. Do NOT sugarcoat — acknowledge their pain but offer hope and healing paths.' : ''}

═══ MOON ANALYSIS (EMOTIONAL CORE) ═══
- Moon House: ${sectionData?.moonAnalysis?.moonHouse || 'N/A'}
- Moon Sign: ${sectionData?.moonAnalysis?.moonSign || 'N/A'}
- Moon Score: ${sectionData?.moonAnalysis?.moonScore || 'N/A'}/100
- Findings: ${sectionData?.moonAnalysis?.findings?.length ? sectionData.moonAnalysis.findings.join(' | ') : 'No major issues'}

═══ DEPRESSION RISK ASSESSMENT ═══
- Level: ${sectionData?.depressionRisk?.level || 'N/A'} (Score: ${sectionData?.depressionRisk?.score || 0}/${sectionData?.depressionRisk?.maxScore || 12})
${sectionData?.depressionRisk?.indicators?.length ? sectionData.depressionRisk.indicators.map(i => '  ⚠️ ' + i).join('\n') : '  No depression indicators detected'}
${sectionData?.depressionRisk?.level === 'HIGH' ? '\n🚨 HIGH DEPRESSION RISK DETECTED — This person has multiple converging indicators for depressive tendencies. Address this PROMINENTLY and compassionately. Describe what they actually feel (emptiness, emotional numbness, inability to enjoy things, withdrawal from people). Offer SPECIFIC coping strategies and healing paths. Do NOT minimize this.' : ''}

═══ ANXIETY RISK ASSESSMENT ═══
- Level: ${sectionData?.anxietyRisk?.level || 'N/A'} (Score: ${sectionData?.anxietyRisk?.score || 0}/${sectionData?.anxietyRisk?.maxScore || 7})
${sectionData?.anxietyRisk?.indicators?.length ? sectionData.anxietyRisk.indicators.map(i => '  ⚠️ ' + i).join('\n') : '  No anxiety indicators detected'}
${sectionData?.anxietyRisk?.level === 'HIGH' ? '\n🚨 HIGH ANXIETY RISK DETECTED — This person experiences racing thoughts, obsessive worrying, and possibly panic-like episodes. Describe their ACTUAL anxiety experience (the 3am thoughts, the "what if" spirals, the physical symptoms like chest tightness). Offer SPECIFIC techniques that work for this anxiety pattern.' : ''}

═══ CHILDHOOD TRAUMA ASSESSMENT ═══
- Level: ${sectionData?.childhoodTrauma?.level || 'N/A'} (Score: ${sectionData?.childhoodTrauma?.score || 0}/${sectionData?.childhoodTrauma?.maxScore || 17})
${sectionData?.childhoodTrauma?.indicators?.length ? sectionData.childhoodTrauma.indicators.map(i => '  🔴 ' + i).join('\n') : '  No childhood trauma indicators detected'}
${sectionData?.childhoodTrauma?.level === 'SEVERE' || sectionData?.childhoodTrauma?.level === 'HIGH' ? '\n🚨 SIGNIFICANT CHILDHOOD TRAUMA DETECTED — This person had a DIFFICULT childhood. The chart shows multiple layers of early-life suffering (parental issues, emotional neglect, disrupted home). Address this with EXTREME sensitivity:\n- Acknowledge their pain WITHOUT astrology jargon ("You grew up carrying weight that no child should have to carry")\n- Describe the SPECIFIC patterns they likely experienced (based on the indicators above)\n- Explain how childhood patterns show up in adult behavior (trust issues, people-pleasing, fear of abandonment, emotional walls)\n- Offer a path to healing that feels realistic and compassionate\n- Make them feel SEEN — this section should make them cry with recognition' : ''}

EDUCATION DIVISIONAL CHART (D24):
- D24 Lagna: ${sectionData?.education?.chaturvimshamsha?.d24Lagna || 'N/A'}
- Mercury in D24: ${sectionData?.education?.chaturvimshamsha?.d24Mercury || 'N/A'}
- Jupiter in D24: ${sectionData?.education?.chaturvimshamsha?.d24Jupiter || 'N/A'}

MERCURY (INTELLECT) STRENGTH:
- Score: ${sectionData?.mercuryShadbala?.percentage || 'N/A'}%
- Overall: ${sectionData?.mercuryShadbala?.strength || 'N/A'}
- Directional Strength: ${sectionData?.mercuryShadbala?.digBala || 'N/A'}
- Strongest Component: ${sectionData?.mercuryShadbala?.strongestComponent || 'N/A'}
- Total Rupas: ${sectionData?.mercuryShadbala?.totalRupas || 'N/A'}

MOON (EMOTIONS) STRENGTH:
- Score: ${sectionData?.moonShadbala?.percentage || 'N/A'}%
- Overall: ${sectionData?.moonShadbala?.strength || 'N/A'}
- Time-Based Strength: ${sectionData?.moonShadbala?.kalaBala || 'N/A'}
- Strongest Component: ${sectionData?.moonShadbala?.strongestComponent || 'N/A'}
- Total Rupas: ${sectionData?.moonShadbala?.totalRupas || 'N/A'}

CROSS-REFERENCE DATA:
- Health mental indicator: ${allSections?.health?.mentalHealthIndicator || 'N/A'}
- Health body risks: ${(allSections?.health?.bodyRisks || []).filter(r => (r.area || r).toString().toLowerCase().includes('nerv') || (r.area || r).toString().toLowerCase().includes('brain') || (r.area || r).toString().toLowerCase().includes('mental')).map(r => r.area || r).join(', ') || 'None neural'}
- Current life phase: ${allSections?.lifePredictions?.currentDasha?.lord || 'N/A'} period (${allSections?.lifePredictions?.currentDasha?.effects || 'N/A'})

━━━ HOW TO USE THIS DATA (NO GUESSING ALLOWED) ━━━
- Mercury Strength HIGH (>70%) → sharp analytical mind, excellent communication, quick learner
- Mercury Strength LOW (<40%) → creative/intuitive thinker, learns by doing (NOT dumb)
- Moon Strength HIGH (>70%) → emotionally stable, resilient, calm under pressure
- Moon Strength LOW (<40%) → emotionally sensitive, deep-feeling, empathetic (NOT weak)
- D24 Mercury well-placed → academic success, good at exams
- D24 Jupiter well-placed → wisdom, advanced degrees, teaching ability
- Moon-Saturn conjunction → emotional suffering pattern (childhood trauma, depression risk)
- mentalStability field → the MOST important single indicator for this section

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
      prompt: `Write a strategic, EXCITING, mind-blowing business and entrepreneurship reading. Make them feel like they just got a masterclass from a billionaire mentor.

REMINDER: Do NOT use any astrology terms. Write like a practical business advisor who can also see the future. If Sinhala, write 100% pure Sinhala — zero English words.

━━━ COMPLETE BUSINESS ENGINE DATA (USE ALL — NO HALLUCINATION) ━━━

BEST BUSINESS TYPES: ${(sectionData?.bestBusinessTypes || []).join(', ') || 'N/A'}
BUSINESS VS SERVICE: ${sectionData?.businessVsService || 'N/A'}
BEST PERIODS FOR BUSINESS:
${(sectionData?.bestPeriods || []).map(p => `- ${p.lord}: ${p.period} — ${p.reason || 'favorable'}`).join('\n') || 'N/A'}

CROSS-REFERENCE DATA:
- Suggested careers: ${(allSections?.career?.suggestedCareers || []).join(', ') || 'N/A'}
- Dhana yogas (wealth combos): ${(allSections?.career?.dhanaYogas || []).join(' | ') || 'None'}
- Wealth strength: ${allSections?.career?.wealthStrength ? `H2: ${allSections.career.wealthStrength.house2Bindus}, H11: ${allSections.career.wealthStrength.house11Bindus} — ${allSections.career.wealthStrength.assessment}` : 'N/A'}
- 10th house strength: ${allSections?.career?.tenthHouse?.strength || 'N/A'}
- Financial risk periods: ${(allSections?.financial?.losses?.riskPeriods || []).map(p => p.lord + ': ' + p.period).join(' | ') || 'None'}
- Investment advice: ${(allSections?.financial?.investmentAdvice || []).join(' | ') || 'N/A'}

WRITE AT LEAST 10-12 DETAILED PARAGRAPHS:

1. **YOUR ENTREPRENEURIAL DNA** — "You're not just 'business-minded.' You're specifically a [type — visionary founder who sees 5 years ahead / operations genius who makes chaos profitable / relationship builder who turns contacts into contracts / solo artist who builds a personal brand / system builder who creates machines that run without you]. In a partnership, you'd be the one who [specific role]."

2. **THE EXACT BUSINESS THAT'S MADE FOR YOU** — Not vague. SPECIFIC: "${(sectionData?.bestBusinessTypes || []).map((b, i) => `**${i+1}. ${b}** — Here's exactly WHY and HOW: [specific explanation of why this matches their nature]`).join('\n')}. Start with [smallest possible version of the idea] and grow from there."

3. **YOUR BUSINESS SUPERPOWERS** — "Your unfair advantage in business: [specific — you can read people instantly / you see patterns others miss / you're relentless once committed / you can sell anything you believe in / you make people trust you within minutes]. This is worth more than an MBA."

4. **YOUR BUSINESS KRYPTONITE** — "Where you'll FAIL in business: [specific — you try to do everything yourself / you trust people too quickly / you hate the boring parts (accounting, admin, follow-up) / you pivot too often / you undercharge for your work]. The solution: [specific person/system you need]."

5. **SHOULD YOU BE A BOSS OR EMPLOYEE?** — "${sectionData?.businessVsService || 'Your chart leans toward [direction]'}. Here's the honest truth: [elaborate — some people are wired to build empires, others are wired to master their craft within someone else's structure. There's no shame in either.]"

6. **BUSINESS TIMING — YOUR LAUNCH WINDOWS** — "The BEST time to start something: ${(sectionData?.bestPeriods || []).map(p => p.lord + ': ' + p.period).join('; ') || 'Within the next 3-5 years'}. If you launch during [period], the success rate is dramatically higher. AVOID launching during [period] — that's a testing period, not a building period."

7. **PARTNERSHIP DYNAMICS** — "Should you go solo or find a partner? [Specific answer]. If you DO partner: the ideal business partner is someone who [specific traits — analytical if you're creative / organized if you're visionary / extroverted if you're introverted]. The WRONG partner for you: [specific traits]. Partnership timing: [when to seek one]."

8. **YOUR FIRST LKR 10 MILLION** — "Based on your chart, your path to your first significant wealth (LKR 10M+) is through [specific — salary growth + side income / business profits / property appreciation / professional expertise + consulting / investment returns]. The timeline: [specific years]."

9. **THE BUSINESS IDEA YOU HAVEN'T THOUGHT OF** — "Based on your unique combination of skills and nature, there's a business idea you haven't considered yet: [specific creative suggestion derived from chart]. This idea combines your [strength 1] with your [strength 2] in a way that nobody else in your network could replicate."

10. **BUSINESS RISKS & FAILURES** — Be honest: "There will be at least [1-2] business setbacks. The first one around [year] will feel devastating but teach you [specific lesson]. The key: don't quit after the first failure. The success that's waiting on the other side of that failure is [specific]."

11. **SCALING STRATEGY** — "Year 1: [start small]. Year 2: [specific growth target]. Year 3: [hire your first [role]]. Year 5: [where the business should be]. The business becomes self-sustaining around [year]."

12. **THE BUSINESS PROPHECY** — "By [year], you will look back at today and realize that the business/career move you're thinking about RIGHT NOW was the beginning of everything. Take the leap."

- Be specific and actionable, like a startup advisor
- NO jargon`,
    },

    transits: {
      title: '🌍 What\'s Happening Right Now',
      prompt: `Write an URGENT, hyper-personal "right now" reading — this should feel like a personal daily briefing from a psychic advisor. The person should feel like you can SEE what's happening in their life THIS WEEK.

REMINDER: Do NOT use any astrology terms. No "transit", "Sade Sati", "Saturn return", "Rahu Kala" etc. Describe current energies as real feelings and events. If Sinhala, write 100% pure Sinhala — zero English words.

CHART DATA:
Overall Transit Score: ${sectionData?.overallTransitScore || 'N/A'}/100
Major Events Active: ${(sectionData?.majorEvents || []).map(e => e.event + ' (' + e.severity + '): ' + e.description).join(' | ') || 'None'}
Sade Sati: ${sectionData?.sadheSati?.active ? 'ACTIVE — ' + sectionData.sadheSati.phase + '. ' + sectionData.sadheSati.note : 'Not active'}
Activated Houses: ${sectionData?.activatedHouses ? Object.entries(sectionData.activatedHouses).map(([h, ps]) => 'House ' + h + ': ' + ps.join(', ')).join(' | ') : 'N/A'}

ALL PLANET TRANSITS:
${sectionData?.allTransits ? Object.values(sectionData.allTransits).map(t => `${t.name}: ${t.currentSign} ${t.degree}° (House ${t.houseFromLagna} from Asc, House ${t.houseFromMoon} from Moon)${t.isRetrograde ? ' [RETROGRADE]' : ''} — Ashtakavarga: ${t.ashtakavargaBindus} (${t.binduQuality})${t.natalConjunctions ? ' — CONJUNCT natal ' + t.natalConjunctions.join(', ') : ''}${t.natalOppositions ? ' — OPPOSES natal ' + t.natalOppositions.join(', ') : ''}`).join('\n') : JSON.stringify(sectionData, null, 1)}

WRITE AT LEAST 10-12 URGENT, PERSONAL PARAGRAPHS:

1. **RIGHT NOW — THIS EXACT MOMENT** — "As you're reading this, something is shifting in your life. You can feel it — that [restlessness/anticipation/heaviness/excitement/uncertainty]. That feeling isn't random. Here's what's actually happening: [specific current energy]."

2. **YOUR EMOTIONAL WEATHER RIGHT NOW** — "Your emotional state this month: [specific — you're carrying a weight that isn't yours / you're on the edge of a breakthrough / you feel stuck but the wheels are turning beneath the surface / you're more sensitive than usual]. Energy score: ${sectionData?.overallTransitScore || 50}/100."

3. **OPPORTUNITIES KNOCKING RIGHT NOW** — "There are [number] doors open for you right now:
   > 🚪 Door 1: [Career — specific opportunity]
   > 🚪 Door 2: [Relationships — specific connection]  
   > 🚪 Door 3: [Financial — specific money opportunity]
   The door you should walk through FIRST: [which one and why]."

4. **WARNINGS — WHAT TO WATCH** — "${sectionData?.sadheSati?.active ? '⚠️ You are currently going through one of the most intense transformation periods of your life. It feels heavy because the universe is restructuring your foundations. This will last until [end date]. How to survive: [specific].' : ''} ${(sectionData?.majorEvents || []).length > 0 ? 'Major cosmic events are active: ' + sectionData.majorEvents.map(e => e.description).join('; ') : 'No major storms — but stay alert for [specific smaller challenge].'}."

5. **YOUR BODY RIGHT NOW** — "Your physical energy this month: [high/moderate/low]. The body area that needs attention: [specific]. You're probably experiencing: [specific — sleep disruption / digestive issues / headaches / fatigue / restless energy / unusual appetite]. Action: [specific remedy]."

6. **YOUR RELATIONSHIPS RIGHT NOW** — "There's [tension/growth/deepening/distance] in your closest relationship right now. The issue: [specific — unspoken feelings / financial stress / different priorities / a decision that needs to be made together]. The best day this month to have that conversation: [specific day type]."

7. **MONEY ENERGY RIGHT NOW** — "Your financial energy this month: [flowing/blocked/unpredictable]. Expect: [specific — an unexpected expense / a delayed payment arriving / a spending temptation you should resist / a small financial surprise]. Best day for financial decisions: [specific]."

8. **THIS WEEK'S ACTION PLAN** — Make it ultra-practical:
   > "**Monday-Tuesday:** Focus on [specific]
   > **Wednesday-Thursday:** Best for [specific]
   > **Friday:** Take action on [specific — this is your power day this week]
   > **Weekend:** [specific — rest/social/creative/planning]
   > **AVOID this week:** [specific activity/decision/person]"

9. **NEXT 30 DAYS FORECAST** — "Week 1: [specific]. Week 2: [specific — something shifts]. Week 3: [specific — the peak moment]. Week 4: [specific — resolution or new beginning]. The single most important day this month: [specific date or day type]. What happens: [specific]."

10. **NEXT 3 MONTHS PREVIEW** — "Month 1: [theme]. Month 2: [theme — acceleration]. Month 3: [theme — results arrive]. The biggest surprise in the next 90 days: [specific prediction]."

11. **YOUR ENERGY FORECAST NUMBERS:**
    > 🔋 Physical Energy: [score]/10
    > 🧠 Mental Clarity: [score]/10
    > ❤️ Emotional Stability: [score]/10
    > 💰 Financial Flow: [score]/10
    > 💍 Relationship Harmony: [score]/10
    > 🍀 Luck Factor: [score]/10

12. **THE IMMEDIATE PROPHECY** — "Within the next [7/14/30] days, something will happen that confirms everything in this report. Watch for: [specific sign or event]. When it happens, you'll know — this reading was real."

- Make it feel urgent, relevant, almost like a personal daily briefing
- The person should feel like you can SEE their life right now
- NO astrological terms`,
    },

    realEstate: {
      title: '🏠 Property, Home & Assets',
      prompt: `Write a detailed, practical reading about property, home life, vehicles, and material assets. Property is a HUGE deal in Sri Lanka — land, houses, and vehicles define social status.

REMINDER: Do NOT use any astrology terms. Write practical property/home advice. If Sinhala, write 100% pure Sinhala — zero English words.

━━━ COMPLETE REAL ESTATE ENGINE DATA (USE ALL — NO HALLUCINATION) ━━━

4TH HOUSE (HOME/PROPERTY):
- Sign: ${sectionData?.fourthHouse?.rashiEnglish || 'N/A'}
- Strength: ${sectionData?.fourthHouse?.strength || 'N/A'}
- Planets in 4th: ${(sectionData?.fourthHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- Aspects on 4th: ${(sectionData?.fourthHouse?.aspectingPlanets || []).map(a => a.planet || a).join(', ') || 'None'}
- 4th Lord: ${sectionData?.fourthLord?.name || 'N/A'} in house ${sectionData?.fourthLord?.house || 'N/A'}

PROPERTY YOGAS: ${(sectionData?.propertyYoga || []).join(' | ') || 'None detected'}
BEST PERIODS FOR PROPERTY: ${(sectionData?.bestPeriodsForProperty || []).map(p => `${p.lord}: ${p.period}`).join(' | ') || 'N/A'}
PROPERTY OWNERSHIP POTENTIAL: ${sectionData?.propertyOwnership || 'N/A'}
VEHICLE INDICATION: ${sectionData?.vehicleIndication || 'N/A'}

CROSS-REFERENCE DATA:
- Career homeLife indicators: ${allSections?.career?.homeLifeIndicators?.homeNarrative || 'N/A'}
- Domestic role: ${allSections?.career?.homeLifeIndicators?.domesticRole || 'N/A'}
- Kemadruma (emotional isolation): ${allSections?.career?.homeLifeIndicators?.kemadrumaPresent ? 'Present' : 'Not present'}
- Financial wealth strength: ${allSections?.career?.wealthStrength?.assessment || 'N/A'}
- Inheritance indication: ${allSections?.luck?.inheritanceIndication || 'N/A'}

WRITE AT LEAST 10-12 DETAILED PARAGRAPHS:

1. **WILL YOU OWN PROPERTY?** — Be direct: "Your chart shows [strong/moderate/challenging] property ownership potential. You are likely to own [number] properties in your lifetime — ${(sectionData?.propertyYoga || []).join('; ') || 'with the first coming around [year]'}."

2. **YOUR FIRST HOME** — "Your first property will likely be [type — apartment/land/house/inherited family home]. Location: [direction from birthplace]. Size: [modest/comfortable/spacious]. You'll acquire it around [age/year]. The buying experience will be [smooth/stressful/surprising]."

3. **MULTIPLE PROPERTIES** — "Will you own more than one? [Yes — you could own up to [number] properties / No — one well-chosen home is your destiny / Maybe — if you invest wisely during [period]]. The second property comes around [year]."

4. **BEST TIME TO BUY** — "Your golden property windows: ${(sectionData?.bestPeriodsForProperty || []).map(p => p.lord + ': ' + p.period).join('; ') || 'Within the next 5-7 years'}. AVOID buying during [specific period] — prices will be against you or hidden problems will emerge."

5. **YOUR IDEAL HOME** — "The home that makes your soul happy: [specific — a house with a garden / a modern apartment with a view / a quiet home near water / a traditional home with trees / a home with lots of natural light]. Your home MUST have: [specific feature — open space / privacy / proximity to nature / a room just for you]. The direction: [specific — south-facing / east-facing]."

6. **LAND & INHERITANCE** — Very relevant in Sri Lanka: "Will you inherit property? [Yes — from [whom], around [year] / No — you build your own / Partial — shared with siblings, possible disputes]. Family land disputes: [prediction — will there be a fight? Who wins? When does it resolve?]."

7. **VEHICLES** — Sri Lankans care about this: "Your chart indicates [number] significant vehicle purchases. Your first major vehicle: around [year/age]. Type: [car/motorcycle/van/luxury vehicle]. Color that brings luck for vehicles: [specific]. Best day to register/buy: [day]."

8. **HOME ENERGY** — "Your current living space is [description — energetically supportive / draining / neutral]. To improve your home energy: [specific — rearrange [room], add [element], remove [object], paint [wall] in [color], place [item] in [direction]]."

9. **PROPERTY INVESTMENT STRATEGY** — "If you invest in property: [type that works — residential rental / commercial / land banking / holiday property]. Expected returns: [moderate/high]. The property market will be best for you around [year]. Avoid: [type of property investment]."

10. **CONSTRUCTION & RENOVATION** — "If you build a home: the best direction to face: [direction]. Best time to start construction: [period]. The room that matters most for your wellbeing: [bedroom/kitchen/study/garden]. Vastu/layout tip: [specific practical advice]."

11. **MATERIAL COMFORT TIMELINE** — "Your material comfort will peak around [age/year]. At this point, you'll have: [specific — your own home, [type of vehicle], comfortable savings, [luxury item]]. The journey there: [specific timeline of major acquisitions]."

12. **THE PROPERTY PROPHECY** — "There's a property opportunity coming around [year] that you should NOT miss. It will seem [risky/expensive/too good to be true], but if you take it, by [year+5], it will be worth [significantly more]. This is the investment that secures your family's future."

- Be practical and specific — include Sri Lankan property context
- NO jargon`,
    },

    employment: {
      title: '🏅 Career Growth & Promotions',
      prompt: `Write a detailed, motivating career growth roadmap. This is the PROMOTION section — when do they climb, when do they plateau, when do they need to jump ship?

REMINDER: Do NOT use any astrology terms. Write like a senior career mentor giving real advice. If Sinhala, write 100% pure Sinhala — zero English words.

━━━ COMPLETE EMPLOYMENT ENGINE DATA (USE ALL — NO HALLUCINATION) ━━━

PROMOTION PERIODS:
${(sectionData?.promotionPeriods || []).map((p, i) => `${i+1}. ${p.lord || 'N/A'}: ${p.period || 'N/A'} — ${p.reason || 'favorable for career growth'}`).join('\n') || 'N/A'}

JOB CHANGE PERIODS:
${(sectionData?.jobChangePeriods || []).map((p, i) => `${i+1}. ${p.lord || 'N/A'}: ${p.period || 'N/A'} — ${p.reason || 'likely change'}`).join('\n') || 'N/A'}

CAREER PATHS SUITED: ${(sectionData?.careerPaths || []).join(', ') || 'N/A'}
AUTHORITY POTENTIAL: ${sectionData?.authorityPotential || 'N/A'}
GOVERNMENT JOB INDICATION: ${sectionData?.governmentJob || 'N/A'}

CROSS-REFERENCE DATA:
- Suggested careers: ${(allSections?.career?.suggestedCareers || []).join(', ') || 'N/A'}
- Business vs service: ${allSections?.career?.businessVsService || 'N/A'}
- 10th lord strength: ${allSections?.career?.tenthLordShadbala ? `${allSections.career.tenthLordShadbala.percentage}% — ${allSections.career.tenthLordShadbala.strength}` : 'N/A'}
- Career significator: ${allSections?.career?.amatyakaraka ? `${allSections.career.amatyakaraka.planet} — ${allSections.career.amatyakaraka.meaning}` : 'N/A'}
- D10 career chart: ${allSections?.career?.dashamsha ? `D10 Lagna: ${allSections.career.dashamsha.d10Lagna}, Sun: ${allSections.career.dashamsha.d10Sun}` : 'N/A'}
- Current dasha: ${allSections?.lifePredictions?.currentDasha?.lord || 'N/A'} (${allSections?.lifePredictions?.currentDasha?.effects || 'N/A'})

WRITE AT LEAST 10-12 DETAILED PARAGRAPHS:

1. **YOUR LEADERSHIP STYLE** — "You lead by [specific — example / quiet authority / sheer competence / charm and charisma / strategic vision / making others feel safe / being the smartest person in the room]. In a meeting, you're the one who [specific behavior]. Your team respects you because [specific]."

2. **YOUR CAREER PERSONALITY TYPE** — "You're a [specific — builder (creates from nothing) / optimizer (makes everything better) / firefighter (handles crises) / visionary (sees 5 years ahead) / connector (brings people together) / specialist (goes deepest in one area)]. This means you THRIVE in [environment] and WILT in [environment]."

3. **PROMOTION TIMELINE — YOUR CAREER LADDER** — "Here's your career progression:
   > Ages 22-28: ${sectionData?.promotionPeriods?.[0] ? sectionData.promotionPeriods[0].reason : 'Foundation building — learning, proving yourself, earning trust'}
   > Ages 28-35: ${sectionData?.promotionPeriods?.[1] ? sectionData.promotionPeriods[1].reason : 'The acceleration — first major role, first real authority'}
   > Ages 35-45: ${sectionData?.promotionPeriods?.[2] ? sectionData.promotionPeriods[2].reason : 'Peak career phase — this is where you reach your highest position'}
   > Ages 45-55: ${sectionData?.promotionPeriods?.[3] ? sectionData.promotionPeriods[3].reason : 'The consolidation — from climbing to mentoring'}
   > Ages 55+: Wisdom phase — consulting, advising, or the unexpected second career"

4. **THE BIG PROMOTION** — "Your single biggest career leap happens around [year/age]. What triggers it: [specific — a project goes viral / a superior leaves / you get headhunted / you start something on the side that explodes / you take a risk everyone warns against]. After this promotion: [specific — salary doubles / title changes / you manage [X] people / you become known in your industry]."

5. **JOB CHANGES** — "You will change jobs [number] times in your career. The most important change: [which one and why]. Will any be forced? [honest answer]. The change you should make but are scared to make: [specific]. The right time to make it: [year]."

6. **YOUR CAREER PEAK** — "Maximum professional authority and recognition: ages [range]. At this peak, you'll be [specific position/role/reputation]. The people who currently look down on you will respect you during this period."

7. **SALARY NEGOTIATION WINDOWS** — "The BEST time to negotiate salary/benefits: [specific periods]. Walk into that conversation on [day], wearing [color]. Your negotiation strength is highest when you [specific — have another offer / just completed a major deliverable / during annual review]."

8. **CAREER PATHS YOU SHOULD ACTUALLY CONSIDER** — "${(sectionData?.careerPaths || []).slice(0, 8).join(', ') || 'Multiple paths suit you'}. The one you haven't considered: [surprising career path]. The one you should AVOID: [specific career that would drain them]."

9. **THE CAREER CRISIS** — Be honest: "Around [year/age], you'll face a career crisis — [specific — layoff / burnout / industry change / loss of passion / conflict with authority / feeling stuck]. This feels like the end but it's actually the beginning of your BEST career chapter. What to do when it hits: [specific]."

10. **WORK-LIFE BALANCE** — "Your chart shows your biggest career-life tension is: [specific — working too hard and neglecting family / being too generous with time / saying yes to everything / perfectionism that creates stress / competition that steals joy]. The one habit that fixes this: [specific]."

11. **YOUR RETIREMENT** — "Will you retire early? [prediction]. What retirement looks like for you: [specific — you'll never fully retire / you'll start a passion project / you'll travel / you'll teach / you'll write]. Your retirement income: [comfortable/modest/wealthy]."

12. **THE CAREER PROPHECY** — "By [year], your professional reputation will speak for itself. The person reading this section wondering 'will I ever get there?' — yes, you will. And it will be bigger than you currently imagine. The key: don't quit during [specific difficult year]. That's the year that separates those who achieve from those who almost did."

- Be motivating and specific — include Sri Lankan career context
- NO jargon`,
    },

    financial: {
      title: '💰 Your Money Blueprint',
      prompt: `Write an honest, deeply personal, MIND-BLOWING financial reading — like getting advice from your wisest, richest uncle who also happens to be psychic. This person should walk away feeling like they just got a private consultation worth thousands.

REMINDER: Do NOT use any astrology terms. No "2nd house", "11th lord", "Dhana yoga" etc. Write like a wise family elder giving money advice. If Sinhala, write 100% pure Sinhala — zero English words.

━━━ COMPLETE FINANCIAL ENGINE DATA (USE ALL — NO HALLUCINATION) ━━━

INCOME HOUSES:
- 2nd House (Savings/Wealth): Strength ${sectionData?.income?.secondHouse?.strength || 'N/A'}, Planets: ${(sectionData?.income?.secondHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- 2nd Lord: ${sectionData?.income?.secondLord?.name || 'N/A'} in house ${sectionData?.income?.secondLord?.house || 'N/A'}
- 11th House (Gains/Income): Strength ${sectionData?.income?.eleventhHouse?.strength || 'N/A'}, Planets: ${(sectionData?.income?.eleventhHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- 11th Lord: ${sectionData?.income?.eleventhLord?.name || 'N/A'} in house ${sectionData?.income?.eleventhLord?.house || 'N/A'}
- Wealth Yogas: ${(sectionData?.income?.dhanaYogas || []).join(' | ') || 'None detected'}

EXPENSE PATTERNS:
- 12th House (Expenses): Strength ${sectionData?.expenses?.twelfthHouse?.strength || 'N/A'}, Planets: ${(sectionData?.expenses?.twelfthHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- 12th Lord: ${sectionData?.expenses?.twelfthLord?.name || 'N/A'} in house ${sectionData?.expenses?.twelfthLord?.house || 'N/A'}
- Expense Note: ${sectionData?.expenses?.note || 'N/A'}

LOSSES & RISKS:
- 8th House (Sudden Losses): Strength ${sectionData?.losses?.eighthHouse?.strength || 'N/A'}, Planets: ${(sectionData?.losses?.eighthHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- 8th Lord: ${sectionData?.losses?.eighthLord?.name || 'N/A'} in house ${sectionData?.losses?.eighthLord?.house || 'N/A'}
- Risk Periods: ${(sectionData?.losses?.riskPeriods || []).map(p => p.lord + ': ' + p.period + ' — ' + p.reason).join(' | ') || 'None identified'}

INVESTMENT ADVICE (engine-generated): ${(sectionData?.investmentAdvice || []).join(' | ') || 'N/A'}

CROSS-REFERENCE DATA:
- Career suggested: ${(allSections?.career?.suggestedCareers || []).slice(0, 5).join(', ') || 'N/A'}
- Business vs Service: ${allSections?.career?.businessVsService || 'N/A'}
- Wealth Strength (Ashtakavarga): ${allSections?.career?.wealthStrength ? `H2 Bindus: ${allSections.career.wealthStrength.house2Bindus}, H11 Bindus: ${allSections.career.wealthStrength.house11Bindus} — ${allSections.career.wealthStrength.assessment}` : 'N/A'}
- Domestic Role: ${allSections?.career?.homeLifeIndicators?.domesticRole || 'N/A'}

━━━ HOW TO USE THIS DATA (NO GUESSING ALLOWED) ━━━
- 2nd house strength → savings capacity (strong = natural saver, weak = money slips through fingers)
- 11th house strength → income growth potential (strong = income rises steadily, weak = plateaus)
- Dhana yogas → specific wealth combinations (each one = a specific wealth mechanism)
- 12th house → expense patterns (malefics here = unexpected expenses)
- 8th house → sudden financial events (inheritance, insurance, windfalls OR losses)
- Risk periods → SPECIFIC years when financial caution is needed
- Investment advice → USE THESE EXACT recommendations from the engine
- Domestic role → if PRIMARY, financial advice must be home-centered (no salary talk)

WRITE AT LEAST 10-12 DEEPLY PERSONAL PARAGRAPHS:

1. **YOUR MONEY PERSONALITY — THE TRUTH** — "Let me tell you something about your relationship with money that nobody has ever said to your face: [specific]. You're the type who [specific money behavior — checks bank balance obsessively? avoids opening bills? spends impulsively then feels guilty? saves compulsively but feels deprived?]. Deep down, money makes you feel [safe/anxious/free/controlled]."

2. **YOUR MONEY STORY** — "Your relationship with money started in childhood. Growing up, money was [scarce/comfortable/a source of tension/a tool of control] in your home. That early experience planted a belief in you: '[specific money belief — money is hard to earn / rich people are bad / I'll never have enough / I need to save everything]'. This belief is STILL running your financial life."

3. **HOW YOU EARN** — "You're wired to earn money through [specific channels — salary, commissions, consulting, passive income, creative work, teaching, healing, managing others' money]. Multiple income streams? ${sectionData?.multipleIncomeStreams ? 'Absolutely — you need at least 2-3 income sources to feel secure' : 'Not necessarily — you do best when you go deep in ONE area'}."

4. **YOUR SPENDING LEAKS** — "Here are the 3 money leaks in your life that you probably don't track: (1) [specific — food delivery? clothes? gadgets? helping others financially? emotional shopping?] (2) [specific] (3) [specific]. If you plugged these 3 leaks, you'd save [estimated amount/timeframe]."

5. **YOUR WEALTH BUILDING TIMELINE** — "Your financial life has distinct phases:
   > Ages 20-28: ${sectionData?.earlyCareerFinance || 'Building the foundation — earnings are modest but education pays off'}
   > Ages 28-35: ${sectionData?.midCareerFinance || 'The acceleration — income starts matching your ambition'}  
   > Ages 35-45: ${sectionData?.peakEarningPhase || 'The peak earning window — this is where real wealth is built'}
   > Ages 45-55: ${sectionData?.matureFinance || 'Consolidation — protecting what you\'ve built becomes more important than earning more'}
   > Ages 55+: ${sectionData?.retirementFinance || 'Legacy phase — how your wealth serves the next generation'}"

6. **INVESTMENT PERSONALITY** — "Your chart reveals you're a [conservative/moderate/aggressive/erratic] investor. The investments that ACTUALLY work for you: ${(sectionData?.investmentAdvice || []).join('; ') || 'property, fixed deposits, and gold'}. Stay AWAY from: [specific warning — crypto? stocks? speculative business? lending to friends?]. The single biggest investment mistake you'll make: [specific]."

7. **PROPERTY & REAL ESTATE** — "Will you own property? ${sectionData?.propertyPotential ? 'Yes — ' + sectionData.propertyPotential : 'The signs point to property ownership, but timing matters'}. Best time to buy: [specific period]. Multiple properties: [yes/no/when]."

8. **DEBT & FINANCIAL RISKS** — "There are [specific number] periods in your life when financial stress hits hard. The biggest risk: [specific — a bad investment around age X / lending money you can't afford to lose / medical expenses / family financial burden]. How to protect yourself: [specific]."

9. **INHERITANCE & WINDFALL** — "Will you inherit? ${sectionData?.inheritanceIndication || 'Moderate possibility'}. From whom: [parent/relative/unexpected source]. When: [timing]. But here's the surprise: your biggest financial gain might come from [unexpected source — insurance, legal settlement, forgotten investment, property appreciation]."

10. **YOUR GOLDEN FINANCIAL YEARS** — "Between ages [X-Y], money flows more freely than any other period. This is when [specific — you double your salary / a business pays off / property values surge / investments mature]. Prepare for this window NOW by [specific action]."

11. **FINANCIAL HABITS THAT WILL SAVE YOU** — "Based on your specific nature, here are 5 money rules made for YOU:
    1. [Specific rule derived from chart]
    2. [Specific rule]
    3. [Specific rule]
    4. [Specific rule]
    5. [Specific rule — e.g., 'Never make financial decisions on [day] — your energy for money decisions peaks on [day]']"

12. **THE MONEY PROPHECY** — "By age [X], if you follow the path your energy is guiding you toward, you will have [specific financial milestone]. The person reading this in 10 years will look back at this paragraph and say: 'It actually happened.'"

- Sound like a wise, caring family elder giving money advice
- Be honest about both strengths and weaknesses
- Include at least 3 specific numbers/timeframes
- NO jargon`,
    },

    timeline25: {
      title: '📅 Your Next 25 Years — The Movie of Your Life',
      prompt: `Write the most EPIC, spine-tingling 25-year life prediction ever written. This should read like the screenplay for the movie of their life — complete with plot twists, triumphs, challenges, love stories, and a breathtaking climax.

REMINDER: Do NOT use any astrology terms. No "Dasha", "Mahadasha", "Antardasha", "Bhukti" etc. Describe each era using real events, emotions, and life milestones. If Sinhala, write 100% pure Sinhala — zero English words.

━━━ COMPLETE TIMELINE ENGINE DATA (USE ALL — NO HALLUCINATION) ━━━

LIFE PHASES COVERING NEXT 25 YEARS (from ${sectionData?.from || 'N/A'} to ${sectionData?.to || 'N/A'}):
${(sectionData?.periods || []).map(d => `${d.mahadasha || 'N/A'}: ${d.period || 'N/A'} — Nature: ${d.nature || 'N/A'}, Strength: ${d.strength || 'N/A'}
  Career: ${d.effects?.career || 'N/A'}
  Health: ${d.effects?.health || 'N/A'}
  Relationship: ${d.effects?.relationship || 'N/A'}
  General: ${d.effects?.general || 'N/A'}
  Overall Tone: ${d.overallTone || 'N/A'}
  Sub-periods: ${(d.antardashas || []).map(a => a.lord + ': ' + a.from + ' to ' + a.to).join(' | ')}`).join('\n\n') || JSON.stringify(sectionData, null, 1)}

LIFE PHASE SUMMARY (from lifePredictions for full dasha context):
${(allSections?.lifePredictions?.lifePhaseSummary || []).map(d => `${d.lord}: ${d.period} (${d.years} years) — "${d.theme}"${d.isCurrent ? ' ← CURRENT' : ''}`).join('\n') || 'N/A'}

CROSS-REFERENCE DATA FOR TIMELINE ACCURACY:
- Marriage timing: ${allSections?.marriage?.marriageTimingPrediction?.prediction || 'N/A'}, Age: ${allSections?.marriage?.marriageTimingPrediction?.idealAgeRange || 'N/A'}
- Marriage afflictions: ${allSections?.marriage?.marriageAfflictions?.severity || 'N/A'}
- Children estimate: ${allSections?.children?.estimatedChildren?.count || 'N/A'} (${allSections?.children?.estimatedChildren?.genderTendency || 'N/A'})
- Career paths: ${(allSections?.career?.suggestedCareers || []).slice(0, 3).join(', ') || 'N/A'}
- Health CRITICAL periods: ${(allSections?.health?.dangerPeriods || []).filter(d => d.level === 'CRITICAL').slice(0, 5).map(d => d.lord + '-' + d.antardasha + ': ' + d.period).join(' | ') || 'None critical'}
- Foreign travel likelihood: ${allSections?.foreignTravel?.foreignLikelihood || 'N/A'}
- Foreign travel periods: ${(allSections?.foreignTravel?.travelPeriods || []).map(p => p.lord + ': ' + p.period).join(' | ') || 'N/A'}
- Financial risk periods: ${(allSections?.financial?.losses?.riskPeriods || []).map(p => p.lord + ': ' + p.period).join(' | ') || 'None'}
- Lucky periods: ${(allSections?.luck?.luckyPeriods || []).map(p => p.lord + ': ' + p.period).join(' | ') || 'N/A'}

━━━ HOW TO USE THIS DATA (NO GUESSING ALLOWED) ━━━
- Each life phase lord determines the THEME of that period (see lord → theme mapping in lifePredictions)
- Cross-reference marriage timing → include wedding prediction in the right era
- Cross-reference children → include birth prediction in the right era
- Cross-reference health CRITICAL periods → include health warnings in the right era
- Cross-reference career paths → include career milestones in the right era
- Cross-reference foreign travel → include overseas chapters in the right era
- Financial risk periods → warn about money challenges in the right era
- Lucky periods → highlight golden opportunities in the right era
- EVERY prediction must reference SPECIFIC calendar years

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

━━━ COMPLETE REMEDIES ENGINE DATA (USE ALL — NO HALLUCINATION) ━━━

PRIMARY GEMSTONE (Lagna Gem): ${sectionData?.lagnaGem || 'N/A'}
LUCKY COLOR: ${sectionData?.lagnaColor || 'N/A'}
POWER DAY: ${sectionData?.lagnaDay || 'N/A'}

YOGA KARAKA (Most Powerful Planet for this person):
${sectionData?.yogaKaraka ? `Planet: ${sectionData.yogaKaraka.planet}, Gem: ${sectionData.yogaKaraka.gem}, Note: ${sectionData.yogaKaraka.note}` : 'None detected'}

WEAK PLANETS NEEDING REMEDIES:
${(sectionData?.weakPlanetRemedies || []).map((p, i) => `${i+1}. ${p.planet} (Score: ${p.score}%) — Gem: ${p.gem}, Color: ${p.color}, Day: ${p.day}`).join('\n') || 'No weak planets detected'}

CROSS-REFERENCE DATA:
- Health organ risks: ${(allSections?.health?.highRiskOrgans || []).join(', ') || 'None high risk'}
- Weakest planet (Shadbala): ${allSections?.health?.shadbalaSummary?.weakestPlanet ? `${allSections.health.shadbalaSummary.weakestPlanet.name} (${allSections.health.shadbalaSummary.weakestPlanet.percentage}%)` : 'N/A'}
- Strongest planet: ${allSections?.health?.shadbalaSummary?.strongestPlanet ? `${allSections.health.shadbalaSummary.strongestPlanet.name} (${allSections.health.shadbalaSummary.strongestPlanet.percentage}%)` : 'N/A'}
- Marriage afflictions: ${allSections?.marriage?.marriageAfflictions?.severity || 'N/A'}
- Functional benefics: ${(allSections?.yogaAnalysis?.functionalBenefics || []).join(', ') || 'N/A'}
- Functional malefics: ${(allSections?.yogaAnalysis?.functionalMalefics || []).join(', ') || 'N/A'}
- Yoga karaka from yogas: ${allSections?.yogaAnalysis?.yogaKaraka || 'None'}
- Lucky numbers: ${JSON.stringify(allSections?.luck?.luckyNumbers || {})}
- Lucky days: ${(allSections?.luck?.luckyDays || []).join(', ') || 'N/A'}
- Lottery indication: ${allSections?.luck?.lotteryIndication || 'N/A'}
- Pilgrimage recommendations: ${JSON.stringify(allSections?.spiritual?.pilgrimageRecommendation || [])}
- Meditation type: ${allSections?.spiritual?.meditationType || 'N/A'}
- Diet recommendations: ${JSON.stringify(allSections?.health?.dietRecommendations || [])}
- Mother remedies: ${JSON.stringify(allSections?.familyPortrait?.mother?.remedies || [])}

━━━ HOW TO USE THIS DATA (NO GUESSING ALLOWED) ━━━
- lagnaGem → the ONE stone that changes everything (present dramatically)
- weakPlanetRemedies → EACH weak planet has gem, color, day — give specific remedy for each
- yogaKaraka → strengthening this ONE planet amplifies EVERYTHING in their life
- Cross-reference health risks → remedies should target health vulnerabilities
- Cross-reference marriage afflictions → if severe, include relationship remedies
- Cross-reference pilgrimage/meditation → include temple + practice recommendations
- Cross-reference lucky numbers/days → include in daily routine recommendations

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

━━━ COMPLETE YOGAS & DOSHAS ENGINE DATA (USE ALL — NO HALLUCINATION) ━━━

CLASSICAL YOGAS (${(sectionData?.yogas || []).length} found):
${(sectionData?.yogas || []).map((y, i) => `${i+1}. ${y.name} (${y.strength || 'moderate'}): ${y.description || 'N/A'}\n   Impact: ${y.impact || 'N/A'}`).join('\n') || 'No classical yogas detected'}

ADVANCED YOGAS (${(sectionData?.advancedYogas || []).length} found):
${(sectionData?.advancedYogas || []).map((y, i) => `${i+1}. ${y.icon || '✨'} ${y.name} (${y.strength || 'moderate'}, ${y.category || 'general'}): ${y.description || 'N/A'}`).join('\n') || 'No advanced yogas detected'}

DOSHAS / KARMIC CHALLENGES (${(sectionData?.doshas || []).length} found):
${(sectionData?.doshas || []).map((d, i) => `${i+1}. ${d.icon || '⚠️'} ${d.name} (Severity: ${d.severity || 'moderate'}): ${d.description || 'N/A'}`).join('\n') || 'No major doshas detected — clean karmic slate'}

ENGINE SUMMARY: ${sectionData?.summary || 'N/A'}

FUNCTIONAL BENEFICS (planets working FOR this person): ${(sectionData?.functionalBenefics || []).join(', ') || 'N/A'}
FUNCTIONAL MALEFICS (planets creating challenges): ${(sectionData?.functionalMalefics || []).join(', ') || 'N/A'}
YOGA KARAKA (single most powerful planet): ${sectionData?.yogaKaraka || 'None'}

━━━ HOW TO USE THIS DATA (NO GUESSING ALLOWED) ━━━
- Each YOGA = a specific superpower. Name it, explain it in human terms, tell them how they've ALREADY used it
- Each DOSHA = a karmic challenge. NOT a curse — a growth area. Frame it as "the obstacle that's making you stronger"
- Yoga strength (Very Strong / Strong / Moderate) → how obviously this power manifests
- Functional benefics → planets that are their ALLIES in life
- Functional malefics → planets creating friction (not enemies — teachers)
- Yoga Karaka → the SINGLE most important planet for this specific person
- Total yoga count = how "gifted" this chart is (10+ = exceptional, 5-9 = blessed, 1-4 = focused, 0 = unique non-template gifts)

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

━━━ HEALTH DATA FROM CHART ━━━
- Overall vitality: ${sectionData?.overallVitality || 'N/A'}
- Mental health indicator: ${sectionData?.mentalHealthIndicator || 'N/A'}
${(sectionData?.mentalHealthIndicator || '').includes('Moon-Saturn') ? '⚠️ CRITICAL: Moon-Saturn conjunction detected — this person is highly susceptible to anxiety, depression, and emotional trauma. The MENTAL HEALTH DEEP DIVE section (#9) must address childhood emotional patterns, suppressed feelings, and provide serious healing recommendations. Do NOT skip or minimize this.' : ''}
- Longevity indicator: ${sectionData?.longevityIndicator || 'N/A'}
- Body areas at risk: ${JSON.stringify(sectionData?.bodyRisks || [])}
- Health vulnerabilities (weak planets): ${JSON.stringify(sectionData?.healthVulnerabilities || [])}
- Diet recommendations: ${JSON.stringify(sectionData?.dietRecommendations || [])}
- Shadbala Summary: ${sectionData?.shadbalaSummary ? `Weakest planet: ${JSON.stringify(sectionData.shadbalaSummary.weakestPlanet)}, Strongest: ${JSON.stringify(sectionData.shadbalaSummary.strongestPlanet)}. Note: ${sectionData.shadbalaSummary.note}` : 'N/A'}

━━━ ORGAN-BY-ORGAN RISK MAP ━━━
${sectionData?.highRiskOrgans?.length > 0 ? `🔴 HIGH RISK organs: ${sectionData.highRiskOrgans.join(', ')}` : '✅ No HIGH RISK organs detected'}
${sectionData?.moderateRiskOrgans?.length > 0 ? `🟡 MODERATE RISK organs: ${sectionData.moderateRiskOrgans.join(', ')}` : ''}
${(sectionData?.organRisks || []).map(o => `• [${o.risk}] ${o.organ}
  - Diseases: ${(o.diseases || []).join(', ')}
  - Vulnerable from: ${o.vulnerableAge}
  - Prevention: ${o.prevention}
  - Chart reason: ${o.narrative}`).join('\n')}

━━━ KIDNEY / URINARY SYSTEM (SPECIFIC) ━━━
- Kidney risk level: ${sectionData?.kidneyRisk || 'N/A'}
- Kidney chart analysis: ${sectionData?.kidneyNarrative || 'N/A'}
${sectionData?.kidneyRisk === 'HIGH' ? `⚠️ MANDATORY: You MUST include a detailed, specific kidney/urinary health section. This person has HIGH kidney risk written into their chart. Describe: (1) early stone/UTI episodes likely in their late 20s, (2) a more serious kidney health crisis around age 50, (3) the strong possibility of surgical intervention, (4) specific kidney protection protocol — diet (avoid oxalate-rich foods, drink 3L water daily, coconut water, barley water/iridhu), herbal remedies (polpala tea, punarnava, gokshura), annual kidney function tests (creatinine, eGFR, urine microalbumin) from age 30 onwards.` : ''}

━━━ HEALTH DANGER PERIODS (ANTARDASHA-LEVEL) ━━━
CRITICAL periods (both main + sub period are danger indicators):
${(sectionData?.dangerPeriods || []).filter(d => d.level === 'CRITICAL').slice(0, 12).map(d => `• ${d.lord}-${d.antardasha}: ${d.period} — ${d.reason}`).join('\n') || 'None'}

ELEVATED periods (main period is a health significator):
${(sectionData?.dangerPeriods || []).filter(d => d.level === 'ELEVATED').slice(0, 8).map(d => `• ${d.lord}-${d.antardasha}: ${d.period}`).join('\n') || 'None'}

⚠️ PRECISION NOTE: Health vulnerability scores are based on 6-component Shadbala analysis. The organ risk map above is computed from house positions, planetary strengths, and aspect patterns — use it to give HIGHLY SPECIFIC health advice for each organ system.

WRITE AT LEAST 12-14 DEEPLY PERSONAL, DETAILED PARAGRAPHS covering ALL of these:

1. **YOUR BODY TYPE & CONSTITUTION** — What Ayurvedic body type (Vata/Pitta/Kapha) this person likely has based on their birth energy. Describe their natural body build, metabolism speed, skin type, hair type. "You're likely lean-built with fast metabolism and dry skin" or "You tend to gain weight around the midsection easily." Make them nod in recognition.

2. **YOUR BODY'S NATURAL STRENGTHS** — What health advantages this person was born with. Strong immune system? Good bone density? Excellent cardiovascular health? Powerful digestion? Be specific about what their body does WELL.

3. **YOUR BODY'S WEAK POINTS — ORGAN BY ORGAN** — Using the ORGAN RISK MAP above, go through EVERY organ listed as HIGH or MODERATE risk. For EACH:
   - Name the specific organ/system clearly
   - At what AGE it becomes most vulnerable (use the vulnerableAge field)
   - What specific symptoms to watch for (use the diseases list)
   - Exact preventive measures (use the prevention field)
   - Do NOT skip any HIGH or MODERATE risk organ. If kidney risk is HIGH, give it a full dedicated paragraph.
   Example for kidneys: "Your kidneys are your body's most vulnerable area. Around your late 20s, you may experience your first serious kidney episode — likely stones or a UTI that doesn't resolve easily. The real test comes around age 50, when the accumulated pressure on your renal system may require medical intervention. This is NOT a reason for fear — it's a reason to start protecting your kidneys NOW..."

4. **YOUR HEALTH TIMELINE — DECADE BY DECADE**:
   - 20s: What health patterns to watch
   - 30s: What changes to expect, what screenings to get
   - 40s: Critical health shifts, what to prioritize
   - 50s-60s: Major health decisions, what to protect
   Use the CRITICAL danger periods data for SPECIFIC year ranges — name the actual years.

5. **YOUR RELATIONSHIP WITH FOOD** — Not generic diet advice. Describe their actual eating patterns: "You're probably someone who skips meals when stressed" or "You tend to emotionally eat — especially sweets late at night." Then give SPECIFIC Sri Lankan food remedies:
   - Name EXACT Sri Lankan foods: gotukola, karavila (bitter gourd), kohila, murunga (moringa), ranawara, polpala, beli mal (bael), veniwel geta, iramusu, barley water (iridhu)
   - Give specific recipes/preparations: "Drink kottamalli (coriander) water every morning" or "Eat a handful of raw gotukola leaves mixed with coconut 3 times a week"
   - Sri Lankan herbal teas: beli mal tea, polpala tea, ranawara tea — specify which is best for THIS person's organ risks

6. **ADDICTION & HABIT RISKS** — Be honest but gentle. Based on their birth energy:
   - Alcohol sensitivity? "Your body processes alcohol differently — even small amounts stress your kidneys/liver harder"
   - Smoking/tobacco impact on their specific weak organs
   - Sugar addiction and its impact on their specific risk (diabetes/kidney/liver)
   - Screen addiction/phone dependency?
   - Caffeine sensitivity?

7. **SEXUAL & REPRODUCTIVE HEALTH** — Tastefully but honestly — reference the reproductive organ risk data above:
   - Hormonal health timeline
   - For males: Testosterone levels, prostate awareness age, fertility
   - For females: Menstrual regularity, PCOS/hormonal awareness, fertility window
   - Libido patterns across life

8. **SLEEP & ENERGY PATTERNS** — When do they have most energy? Natural chronotype. Sleep quality, dream patterns, insomnia triggers.

9. **MENTAL HEALTH DEEP DIVE** — Not surface-level. Address:
   - Their specific anxiety triggers
   - Depression vulnerability windows (reference danger periods)
   - Overthinking patterns
   - Anger patterns and physical health consequences

10. **PANDEMIC & ENVIRONMENTAL SENSITIVITY** — Climate effects on their specific weak organs. Monsoon season and respiratory/joint risks. Sri Lanka-specific environmental triggers.

11. **YOUR LONGEVITY BLUEPRINT** — Based on the longevity indicator, give an honest but hopeful assessment. Reference the chart's actual strength indicators.

12. **YOUR PERSONAL HEALTH POWER TOOLKIT** — Sri Lankan specific remedies:
    - Which SPECIFIC Buddhist/Hindu temples to visit for health blessings (Munneswaram for health, Sri Maha Bodhi for vitality)
    - Which color to wear on which day for health energy
    - Specific gemstone for health protection (based on lagna lord and weak planets)
    - One Ayurvedic practice that is PERFECT for their constitution
    - "Drink [specific herbal water] every morning for 30 days and watch the difference"

13. **MEDICAL TESTS YOU SHOULD NEVER SKIP** — Based on their specific organ risk map, give a personalised screening schedule:
    - Which tests (kidney function / liver function / BP / eye test / bone density / thyroid / cardiac ECG / blood sugar)
    - At what age to START each test
    - How frequently to repeat them
    Example: "Because of your kidney vulnerability, get a kidney function panel (creatinine, eGFR, urine microalbumin) every year from age 30. Don't wait for symptoms — kidney disease is silent until it's serious."

REMINDER: Write as a caring elder who genuinely cares about their health. NEVER use words like "malefic", "afflicted", "debilitated", "6th house", "8th house". Say "your body's sensitive areas", "when your energy dips", "your healing foods". Be WARM but HONEST — if there's a real health risk, don't hide it. Just frame it with hope and actionable advice.
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English word.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish (Sinhala words in English letters).' : 'Write in warm, caring English.'}`,
    },

    marriedLife: {
      title: 'විවාහ ජීවිතය — Your Married Life',
      prompt: `You are writing the MARRIED LIFE section — this is SEPARATE from the Love & Relationships section. That section covers dating, finding love, and the soulmate blueprint. THIS section is specifically about LIFE AFTER MARRIAGE — the daily reality of being married, spouse dynamics, in-laws, and long-term relationship quality.

Birth details: Born under ${lagnaEn} rising, Moon in ${moonEn}, Nakshatra: ${nakshatraName}
Current life period: ${currentDasha} main period, ${currentAD} sub-period

━━━ COMPLETE MARRIED LIFE ENGINE DATA (USE ALL — NO HALLUCINATION) ━━━

7TH HOUSE (MARRIAGE HOUSE):
- Sign: ${sectionData?.seventhHouse?.rashiEnglish || 'N/A'}
- Strength: ${sectionData?.seventhHouse?.strength || 'N/A'}
- Planets in 7th: ${(sectionData?.seventhHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- 7th Lord: ${sectionData?.seventhLord?.name || 'N/A'} in house ${sectionData?.seventhLord?.house || 'N/A'}

SPOUSE NATURE (Darakaraka): ${sectionData?.darakaraka ? `${sectionData.darakaraka.planet} in ${sectionData.darakaraka.rashi} — ${sectionData.darakaraka.spouseNature}` : 'N/A'}
UPAPADA LAGNA: ${sectionData?.upapadaLagna ? `${sectionData.upapadaLagna.rashi} — ${sectionData.upapadaLagna.meaning}` : 'N/A'}

NAVAMSHA D9 ANALYSIS:
- D9 Lagna: ${sectionData?.navamshaAnalysis?.d9LagnaSign || 'N/A'}
- Venus in D9: ${sectionData?.navamshaAnalysis?.venusInNavamsha || 'N/A'}
- Marriage Strength: ${sectionData?.navamshaAnalysis?.marriageStrength || 'N/A'}
- 7th Lord in D9: ${sectionData?.navamshaAnalysis?.d9SeventhLord || 'N/A'}

MANGALA DOSHA: ${sectionData?.kujaDosha?.present ? `Present — ${sectionData.kujaDosha.severity || 'moderate'}. Details: ${sectionData.kujaDosha.details || 'N/A'}` : 'Not present'}

⚠️ MARRIAGE AFFLICTIONS (FROM allSections):
- Severity: ${allSections?.marriage?.marriageAfflictions?.severity || 'N/A'}
- Score: ${allSections?.marriage?.marriageAfflictions?.severityScore || 'N/A'}/10
- Afflictions: ${(allSections?.marriage?.marriageAfflictions?.afflictions || []).join(' | ') || 'None'}
- Summary: ${allSections?.marriage?.marriageAfflictions?.summary || 'N/A'}

MARRIAGE TIMING: ${allSections?.marriage?.marriageTimingPrediction ? `${allSections.marriage.marriageTimingPrediction.prediction || 'N/A'}, Age range: ${allSections.marriage.marriageTimingPrediction.idealAgeRange || 'N/A'}` : 'N/A'}

SPOUSE QUALITIES: ${Array.isArray(allSections?.marriage?.spouseQualities) ? allSections.marriage.spouseQualities.join(', ') : (allSections?.marriage?.spouseQualities || 'N/A')}

━━━ HOW TO USE THIS DATA (NO GUESSING ALLOWED) ━━━
- marriageAfflictions severity SEVERE → acknowledge REAL marriage difficulties, don't sugarcoat
- D9 marriageStrength → the TRUE picture of married life (D9 is marriage chart)
- Darakaraka → describes spouse's ACTUAL personality (use for daily life descriptions)
- Upapada → describes how the marriage LOOKS from outside
- Mangala Dosha → if present, describes the NATURE of conflicts (aggressive energy)
- Spouse qualities → USE THESE for "who you live with daily" section
- Marriage timing → if late marriage indicated, discuss the wait and its effect

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
      prompt: `You are writing the FOREIGN TRAVEL & LIVING ABROAD section. For Sri Lankans, this is one of the MOST anticipated sections — going abroad is a life-changing dream for many. Be direct, specific, and honest.

Birth details: Born under ${lagnaEn} rising, Moon in ${moonEn}, Nakshatra: ${nakshatraName}
Current life period: ${currentDasha} main period, ${currentAD} sub-period

━━━ COMPLETE FOREIGN TRAVEL ENGINE DATA (USE ALL — NO HALLUCINATION) ━━━

FOREIGN LIKELIHOOD: ${sectionData?.foreignLikelihood || 'N/A'}
SETTLEMENT ABROAD: ${sectionData?.settlementAbroad ? 'Yes — likely to settle' : 'No — rooted in Sri Lanka'}
VISA SUCCESS: ${sectionData?.visaSuccess || 'N/A'}

FOREIGN INDICATORS:
${(sectionData?.foreignIndicators || []).map((ind, i) => `${i+1}. ${ind}`).join('\n') || 'None detected'}

TRAVEL PERIODS:
${(sectionData?.travelPeriods || []).map(p => `- ${p.lord || 'N/A'}: ${p.period || 'N/A'} — ${p.reason || 'favorable for travel'}`).join('\n') || 'N/A'}

SUGGESTED DIRECTION:
- Best direction: ${sectionData?.suggestedDirection?.direction || 'N/A'}
- Countries: ${Array.isArray(sectionData?.suggestedDirection?.countries) ? sectionData.suggestedDirection.countries.join(', ') : (sectionData?.suggestedDirection?.countries || 'N/A')}
- Reason: ${sectionData?.suggestedDirection?.reason || 'N/A'}

CROSS-REFERENCE DATA:
- 9th house (long journeys): ${allSections?.luck?.luckIndicators ? 'Data available' : 'N/A'}
- 12th house (foreign lands): ${allSections?.financial?.expenses?.twelfthHouse?.strength || 'N/A'}
- Current dasha: ${allSections?.lifePredictions?.currentDasha?.lord || 'N/A'} (${allSections?.lifePredictions?.currentDasha?.effects || 'N/A'})

WRITE AT LEAST 10-12 DETAILED PARAGRAPHS:

1. **WILL YOU GO ABROAD? — THE HONEST ANSWER** — Don't hedge. Say: "Yes, your chart strongly indicates foreign travel" or "Your chart suggests your life is rooted in Sri Lanka, with short overseas visits rather than permanent moves." Sri Lankans want a CLEAR answer.

2. **WHICH COUNTRIES?** — Use the suggested direction data to name SPECIFIC countries. "Your energy points toward [direction] — countries like [name 3-4 specific countries: UK, Canada, Australia, UAE, Japan, Singapore, Germany, etc.]." Explain WHY those countries match their chart.

3. **WHEN TO APPLY — THE GOLDEN VISA WINDOWS** — "Your strongest visa windows are: ${(sectionData?.travelPeriods || []).map(p => p.lord + ': ' + p.period).join('; ') || 'Within the next 5 years'}. If you're planning to apply for a visa, the BEST time to submit your application is [specific month/year range]. Avoid applying during [specific period]."

4. **VISA SUCCESS RATE** — "Will your visa get approved? ${sectionData?.visaSuccess || 'Moderate chance'}. The type of visa most likely to succeed: [work/study/tourist/PR/spouse]. Your first attempt: [likely outcome]. If rejected, try again during [specific period]."

5. **YOUR FIRST TRIP ABROAD** — "Your first significant overseas trip will likely be [work-related/education/family visit/holiday]. The country: [specific]. Something unexpected will happen during this trip: [specific prediction — you'll meet someone important / you'll fall in love with a city / you'll get an opportunity you didn't plan for]."

6. **SETTLE OR RETURN?** — "Here's the big question: ${sectionData?.settlementAbroad ? 'Your chart indicates you WILL settle abroad — possibly permanently, or for an extended period of 5+ years. The adjustment won\'t be easy. Loneliness will hit hardest in the first [6 months/1 year].' : 'Your chart suggests you are fundamentally connected to Sri Lanka. You may live abroad for 2-5 years, but something will always pull you back — family, land, a sense of belonging that only home provides.'}"

7. **LIFE ABROAD — THE REAL PICTURE** — "If/when you go abroad, here's what your daily life will look like: [specific — will they thrive or struggle? Make friends easily or feel isolated? Find work quickly or face delays?]. The biggest challenge abroad: [specific — loneliness? cultural shock? racism? work-life balance?]. The biggest reward: [specific]."

8. **MONEY ABROAD** — "Your earning potential overseas: [specific — will you earn well or struggle? Send money home easily? Build savings?]. The financial peak abroad will be around [year]."

9. **FAMILY & TRAVEL** — "Your family's reaction to you going abroad: [specific]. Will your parents/spouse come with you? [prediction]. The hardest part of being away from family: [specific]."

10. **THE SURPRISE TRAVEL PREDICTION** — "Here's something you won't expect: [specific — 'You'll visit a cold, northern country before a warm one' / 'Your first trip abroad will be sudden — less than 2 months from decision to departure' / 'Someone you meet in [country] will become one of the most important people in your life' / 'You'll return to Sri Lanka from abroad at an unexpected time, and it will be one of the best decisions you ever make']."

11. **TRAVEL PROTECTION** — "When traveling, your most vulnerable periods: [specific]. Before any major trip, [specific protective action — visit a temple, wear specific color, carry specific item]."

12. **THE TRAVEL PROPHECY** — "By [year], you will have visited [number] countries. The trip that changes your life forever happens around [year]. Whether you stay abroad or return home, your international experience will be one of the defining chapters of your life story."

REMINDER: NEVER use "9th house", "12th house", "Rahu". Say "your travel energy", "your overseas destiny".
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English word.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish (Sinhala words in English letters).' : 'Write in warm, exciting English.'}`,
    },

    legal: {
      title: 'Legal, Enemies & Protection',
      prompt: `You are writing the LEGAL, ENEMIES & PROTECTION section. This section makes people feel SEEN and PROTECTED. Sri Lankans deeply believe in hidden enemies and evil eyes — give them specific, actionable protection.

Birth details: Born under ${lagnaEn} rising, Moon in ${moonEn}, Nakshatra: ${nakshatraName}
Current life period: ${currentDasha} main period, ${currentAD} sub-period

━━━ COMPLETE LEGAL & PROTECTION ENGINE DATA (USE ALL — NO HALLUCINATION) ━━━

ENEMY PROFILE: ${sectionData?.enemyProfile || 'N/A'}

6TH LORD (ENEMIES/DISPUTES):
- Planet: ${sectionData?.sixthLord?.name || 'N/A'}
- House: ${sectionData?.sixthLord?.house || 'N/A'}
- Strength: ${sectionData?.sixthLord?.strength || 'N/A'}

LEGAL INDICATORS:
${(sectionData?.legalIndicators || []).map((ind, i) => `${i+1}. ${ind}`).join('\n') || 'None detected'}

LEGAL CASE PERIODS:
${(sectionData?.legalCasePeriods || []).map(p => `- ${p.lord || 'N/A'}: ${p.period || 'N/A'} — ${p.reason || 'potential legal matter'}`).join('\n') || 'None detected'}

PROTECTION ADVICE:
${(sectionData?.protectionAdvice || []).map((a, i) => `${i+1}. ${a}`).join('\n') || 'N/A'}

CROSS-REFERENCE DATA:
- Marriage afflictions: ${allSections?.marriage?.marriageAfflictions?.severity || 'N/A'} (legal separation risk if severe)
- Property disputes: ${allSections?.realEstate?.propertyYoga ? 'Property indicated' : 'N/A'}
- Health 6th house: ${allSections?.health?.sixthHouse?.strength || 'N/A'}

WRITE AT LEAST 10-12 DETAILED PARAGRAPHS:

1. **YOUR NATURAL SHIELD** — "Some people walk through life attracting enemies left and right. Others seem to have an invisible shield. You? Your natural protection level is [HIGH/MODERATE/LOW]. Here's why: [specific explanation derived from chart]."

2. **THE PROFILE OF YOUR ENEMIES** — Be SPECIFIC about personality types: "The person most likely to cause you problems is someone who [specific personality — appears helpful but is secretly jealous / is close to your family / works in the same field / is younger than you / is someone you once trusted]. They'll target your [career/reputation/relationships/finances]."

3. **YOUR WORKPLACE ENEMIES** — "In your career, watch for [specific profile — a superior who feels threatened / a colleague who takes credit / a subordinate who gossips]. This person is most likely to appear during [specific period]. How to neutralize them: [specific strategy]."

4. **FAMILY DISPUTES** — "Land disputes, inheritance fights, and property issues are EXTREMELY common in Sri Lanka. Your chart shows [specific — YES there's a property dispute coming around [year] / NO, your family property matters resolve peacefully / PARTIAL — one dispute over [land/house/money] but it resolves in your favor by [year]]."

5. **COURT CASES & LEGAL MATTERS** — "Will you face legal issues? ${(sectionData?.legalCasePeriods || []).length > 0 ? 'There are [number] periods where legal matters could arise: ' + sectionData.legalCasePeriods.map(p => p.period).join(', ') : 'Your chart shows relatively few legal complications'}. The outcome: [win/lose/settle]. Best approach: [fight/negotiate/avoid]."

6. **THE EVIL EYE & JEALOUSY** — "People are jealous of you more than you realize. The areas where jealousy hits hardest: [specific — your appearance/success/family/relationship]. The signs that someone has cast negative energy toward you: [specific physical/emotional symptoms]."

7. **WHEN TO BE EXTRA CAREFUL** — "The periods when your protection is weakest: [specific dates/periods]. During these times: [specific precautions — avoid signing contracts, don't lend money, keep distance from [type of person]]."

8. **YOUR PROTECTION TOOLKIT** — Specific Sri Lankan remedies:
   - "Visit [specific temple name] — the energy of this place strengthens your shield"
   - "Wear [specific color] on [specific day] for maximum protection"
   - "Keep [specific item — lime/salt/ash/charmed thread] in your [pocket/wallet/car]"
   - "On [specific day], light a lamp at [specific time] facing [direction]"

9. **THE ENEMY WHO BECOMES A FRIEND** — "Around [year/period], someone you consider an enemy will surprise you. What looks like opposition is actually redirecting you toward something better."

10. **THE PERSON YOU SHOULD NEVER TRUST** — "There is one person — possibly already in your life — whose words are honey but whose intentions are vinegar. They are [gender/age/relation type]. The sign: [specific behavior — they always know your business before you tell them / they compare you to others subtly / they offer help you didn't ask for]."

11. **LEGAL SURPRISE PREDICTION** — "A legal or official matter around [year] will resolve in a way you don't expect. It could be [specific — a property registration, a delayed document, an insurance claim, a workplace policy] that suddenly works in your favor."

12. **YOUR ULTIMATE PROTECTION** — "The single most powerful thing you can do for protection: [specific — a weekly practice, a monthly temple visit, a daily recitation]. This isn't superstition — it's energetic hygiene."

REMINDER: NEVER use astrological jargon. Say "people who wish you harm", "your protection energy", "your guardian strength".
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English word.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish (Sinhala words in English letters).' : 'Write in direct, protective English.'}`,
    },

    education: {
      title: 'Education & Knowledge Path',
      prompt: `You are writing the EDUCATION & KNOWLEDGE PATH section. Education is EVERYTHING in Sri Lanka — O/L results, A/L results, university admission, and professional qualifications define social status. Make this section feel life-changing.

Birth details: Born under ${lagnaEn} rising, Moon in ${moonEn}, Nakshatra: ${nakshatraName}
Current life period: ${currentDasha} main period, ${currentAD} sub-period

━━━ COMPLETE EDUCATION ENGINE DATA (USE ALL — NO HALLUCINATION) ━━━

ACADEMIC STRENGTH: ${sectionData?.academicStrength || 'N/A'}

MERCURY (INTELLECT):
- House: ${sectionData?.mercury?.house || 'N/A'}
- Score: ${sectionData?.mercury?.score || 'N/A'}
- Strength: ${sectionData?.mercury?.strength || 'N/A'}

JUPITER (WISDOM/HIGHER EDUCATION):
- House: ${sectionData?.jupiter?.house || 'N/A'}
- Score: ${sectionData?.jupiter?.score || 'N/A'}
- Strength: ${sectionData?.jupiter?.strength || 'N/A'}

SUGGESTED FIELDS: ${(sectionData?.suggestedFields || []).join(', ') || 'N/A'}

BEST STUDY PERIODS:
${(sectionData?.bestStudyPeriods || []).map(p => `- ${typeof p === 'string' ? p : (p.lord + ': ' + p.period + ' — ' + (p.reason || 'favorable'))}`).join('\n') || 'N/A'}

FOREIGN STUDY: ${sectionData?.foreignStudy ? 'Yes — indicated' : 'Domestic study preferred'}
COMPETITIVE EXAMS: ${sectionData?.competitiveExams || 'N/A'}

CROSS-REFERENCE DATA:
- Mercury Shadbala: ${allSections?.mentalHealth?.mercuryShadbala ? `${allSections.mentalHealth.mercuryShadbala.percentage}% — ${allSections.mentalHealth.mercuryShadbala.strength}` : 'N/A'}
- Moon Shadbala: ${allSections?.mentalHealth?.moonShadbala ? `${allSections.mentalHealth.moonShadbala.percentage}% — ${allSections.mentalHealth.moonShadbala.strength}` : 'N/A'}
- D24 Education Chart: ${allSections?.mentalHealth?.education?.chaturvimshamsha ? `D24 Lagna: ${allSections.mentalHealth.education.chaturvimshamsha.d24Lagna}, Mercury D24: ${allSections.mentalHealth.education.chaturvimshamsha.d24Mercury}` : 'N/A'}
- Career suggested: ${(allSections?.career?.suggestedCareers || []).slice(0, 5).join(', ') || 'N/A'}

WRITE AT LEAST 10-12 DEEPLY PERSONAL PARAGRAPHS:

1. **HOW YOUR BRAIN ACTUALLY WORKS** — Not generic. "You're not a traditional textbook learner. Your brain processes information by [specific — visualizing concepts / connecting patterns / arguing with the material / physically doing it / teaching it to others]. In a classroom, you're the student who [specific behavior — zones out during theory but lights up during practical / takes beautiful notes but never reads them / asks the ONE question that changes the entire discussion / appears to not be listening but absorbs everything]."

2. **YOUR INTELLIGENCE TYPE** — "Your dominant intelligence: [specific — linguistic / logical-mathematical / spatial / musical / bodily-kinesthetic / interpersonal / intrapersonal / naturalistic]. This means you're WIRED for [specific fields]. The tragedy? Traditional Sri Lankan education may have made you feel [stupid/average/misplaced] because it doesn't test for YOUR type of brilliance."

3. **YOUR SCHOOL YEARS — THE UNTOLD STORY** — "Between ages 10-16, your academic journey was [specific — consistently strong / inconsistent / brilliant in [subject] but struggling in [subject] / affected by a family situation / transformed by one teacher or mentor]. There was a turning point around age [13-17] that changed how you saw education."

4. **THE TEACHER WHO CHANGED EVERYTHING** — "Around age [15-20], one person — a teacher, mentor, or elder — saw something in you that others missed. This person's influence is still echoing in your life decisions today. If you haven't thanked them, now is the time."

5. **BEST SUBJECTS FOR YOUR BRAIN** — Ultra-specific: "${(sectionData?.suggestedFields || []).join(', ') || 'Fields involving analysis and creativity'}. But here's the surprise: you probably have a hidden talent for [unexpected subject — music if they're analytical / mathematics if they're creative / psychology if they're practical]. The subjects that drain you: [specific]."

6. **EXAM SUCCESS WINDOWS** — Critical for Sri Lanka: "Your brain performs at peak capacity during: ${(sectionData?.bestStudyPeriods || []).map(p => p.period || p).join('; ') || 'specific periods linked to your energy cycles'}. If you have a major exam, interview, or certification: schedule it during [specific period]. Avoid important exams during [specific period] — your focus scatters."

7. **FOREIGN STUDY** — "Will you study abroad? ${sectionData?.foreignStudy ? 'YES — your chart strongly supports overseas education. The best countries for study: [specific countries]. Best time to apply: [specific period]. The degree that opens doors: [specific].' : 'Your chart suggests domestic education is your stronger path. But if you do pursue overseas education, the window is [specific period].'}"

8. **PROFESSIONAL QUALIFICATIONS** — "Beyond university, the qualifications that would TRANSFORM your career: [specific — CIMA, ACCA, MBA, LLB, a tech certification, a medical specialization]. The best time to study for these: [period]. Your pass rate on first attempt: [high/moderate — with specific advice]."

9. **LIFELONG LEARNING** — "Education doesn't end with a degree for you. Around age [30-40], you'll feel a strong pull to learn something completely new — possibly [field]. This isn't random — it's your chart calling you toward your second-act career."

10. **YOUR CHILDREN'S EDUCATION** — (Cross-reference) "When it comes to your children's education, you'll be the type of parent who [specific — pushes hard for results / gives freedom to choose / invests heavily in extra classes / values practical skills over grades]. Your children's strongest subjects will mirror: [your strengths/your partner's strengths]."

11. **THE EDUCATION SURPRISE** — "You probably struggled in one subject that 'everyone' found easy, but excelled in something others found hard. This isn't a flaw — it's your brain's way of telling you WHERE your genius actually lives. The subject you struggled with: [type]. The one where you quietly outshone everyone: [type]."

12. **YOUR KNOWLEDGE LEGACY** — "By [age/year], you will be known as someone who knows [specific domain] better than almost anyone in your circle. This knowledge becomes a source of [income/respect/influence/teaching]. The universe has been preparing you to become an authority in [specific area]."

REMINDER: NEVER use astrological jargon. Say "your intellectual energy", "your brain's natural wiring", "when your focus is sharpest".
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English word.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish (Sinhala words in English letters).' : 'Write in motivating, practical English.'}`,
    },

    luck: {
      title: 'Luck & Unexpected Fortunes',
      prompt: `You are writing the LUCK & UNEXPECTED FORTUNES section. Sri Lankans are OBSESSED with luck, lottery, and sudden windfalls. This section should make their heart race with excitement.

Birth details: Born under ${lagnaEn} rising, Moon in ${moonEn}, Nakshatra: ${nakshatraName}
Current life period: ${currentDasha} main period, ${currentAD} sub-period

━━━ COMPLETE LUCK ENGINE DATA (USE ALL — NO HALLUCINATION) ━━━

OVERALL LUCK SCORE: ${sectionData?.overallLuck || 'N/A'}

LUCK INDICATORS:
${(sectionData?.luckIndicators || []).map((ind, i) => `${i+1}. ${ind}`).join('\n') || 'None detected'}

LOTTERY INDICATION: ${sectionData?.lotteryIndication || 'N/A'}
INHERITANCE INDICATION: ${sectionData?.inheritanceIndication || 'N/A'}

LUCKY PERIODS:
${(sectionData?.luckyPeriods || []).map(p => `- ${p.lord || 'N/A'}: ${p.period || 'N/A'} — ${p.reason || 'favorable'}`).join('\n') || 'N/A'}

LUCKY NUMBERS: ${JSON.stringify(sectionData?.luckyNumbers || {})}
LUCKY DAYS: ${(sectionData?.luckyDays || []).join(', ') || 'N/A'}
LUCKY COLOR (from remedies): ${allSections?.remedies?.lagnaColor || 'N/A'}

9TH HOUSE (FORTUNE HOUSE):
- Sign: ${sectionData?.ninthHouse?.rashiEnglish || 'N/A'}
- Strength: ${sectionData?.ninthHouse?.strength || 'N/A'}
- Planets in 9th: ${(sectionData?.ninthHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- 9th Lord: ${sectionData?.ninthHouse?.rashiLord || 'N/A'} in house ${sectionData?.ninthHouse?.lordHouse || 'N/A'}

CROSS-REFERENCE DATA:
- Dhana yogas (wealth combos): ${(allSections?.career?.dhanaYogas || []).join(' | ') || 'None'}
- Financial risk periods: ${(allSections?.financial?.losses?.riskPeriods || []).map(p => p.lord + ': ' + p.period).join(' | ') || 'None'}
- 8th house (sudden events): ${allSections?.financial?.losses?.eighthHouse?.strength || 'N/A'}
- Lagna gem: ${allSections?.remedies?.lagnaGem || 'N/A'}
- Lagna day: ${allSections?.remedies?.lagnaDay || 'N/A'}

WRITE AT LEAST 10-12 EXCITING PARAGRAPHS:

1. **YOUR LUCK SCORE — OUT OF 100** — "If luck were a video game stat, yours would be ${sectionData?.overallLuck || '65'}/100. That's [above average/average/exceptional]. Here's what that means in real life: [specific — you tend to find parking spots easily / job interviews go better than expected / you narrowly escape problems that trap others]."

2. **YOUR LUCKY PATTERN** — "Your luck doesn't work randomly — it has a PATTERN. You get luckiest when you [specific — take risks on impulse / plan carefully first / follow your gut / ask for help / try something new / help someone else first]. The universe rewards you specifically for [behavior]."

3. **LOTTERY & GAMBLING** — Sri Lankans live for this: "Can you win the lottery? ${sectionData?.lotteryIndication || 'Moderate chance'}. Here's the honest truth: [specific — you have genuine windfall potential / your wealth comes through effort not luck / you could win small amounts frequently / one significant win is possible around [year]]. If you DO buy tickets: do it on [specific day], at [specific time], and choose numbers containing [specific numbers from data]."

4. **YOUR LUCKY NUMBERS** — "Your power numbers: ${JSON.stringify(sectionData?.luckyNumbers || {})}. Use these for lottery tickets, phone numbers, pin codes, and important dates. The number [X] is especially powerful for you — you'll notice it appearing in your life more than coincidence can explain."

5. **YOUR LUCKY DAYS & TIMES** — "Your luckiest day: ${(sectionData?.luckyDays || []).join(', ') || 'Thursday and Friday'}. The luckiest HOURS on those days: [specific — early morning 6-8am / late afternoon 3-5pm]. Schedule big decisions, interviews, and money conversations during these windows."

6. **WHEN LUCK PEAKS** — "Your life has specific 'luck surges': ${(sectionData?.luckyPeriods || []).map(p => p.lord + ': ' + p.period).join('; ') || 'Several powerful windows are ahead'}. During these periods, opportunities literally fall into your lap. The strongest luck surge: [year range]. What it will bring: [specific — job offer / financial windfall / meeting someone important / property opportunity]."

7. **UNEXPECTED FORTUNE PREDICTIONS** — "Here are 5 specific fortune predictions:
   > 1. An unexpected phone call or message will bring you money within [timeframe]
   > 2. You'll find something valuable you thought was lost — possibly around [period]
   > 3. Someone will repay an old debt or favor when you least expect it
   > 4. A random encounter in a [place — shop/temple/office] leads to a financial opportunity
   > 5. An investment or decision you make in [month/year] pays off 3-5x more than expected"

8. **INHERITANCE & FAMILY WEALTH** — "Will you inherit wealth? ${sectionData?.inheritanceIndication || 'Moderate chance'}. From [parent/relative/unexpected source]. The timing: around [year]. The form: [land/money/gold/property/business]. Surprise: the inheritance may come from someone you don't currently expect."

9. **LUCK IN LOVE vs LUCK IN MONEY** — "Interesting pattern: your chart shows you're luckier in [love/money]. This means [specific — you attract amazing partners easily but struggle financially / money comes easily but love takes work / you're lucky in BOTH but at different life stages]."

10. **YOUR UNLUCKY PATTERNS** — Be honest: "There are periods when luck turns away. Your most unlucky periods: [specific]. During these times, avoid: [gambling/investments/new partnerships/travel]. The reason luck dips: [specific — overconfidence / ignoring intuition / helping the wrong people]."

11. **HOW TO AMPLIFY YOUR LUCK** — "The 3 things that BOOST your luck:
   1. [Specific action — wearing specific color / visiting specific place / specific ritual]
   2. [Specific — giving to charity on specific day / feeding animals / specific temple visit]
   3. [Specific — carrying specific item / sleeping in specific direction / morning routine]"

12. **THE LUCK PROPHECY** — "Within the next [3/5/7] years, one moment of pure, unexplainable luck will change your life forever. You won't see it coming. It will feel like the universe has been saving this gift just for you. Watch for it around [year/period]."

REMINDER: NEVER use astrological jargon. Say "your fortune energy", "the universe's gifts for you", "your lucky window".
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English word.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish (Sinhala words in English letters).' : 'Write in exciting, hopeful English.'}`,
    },

    spiritual: {
      title: 'Spiritual Journey & Past Karma',
      prompt: `You are writing the SPIRITUAL JOURNEY & PAST KARMA section — the most PROFOUND, soul-touching part of this report. This should make them feel like they just met a true spiritual master who saw into their soul.

Birth details: Born under ${lagnaEn} rising, Moon in ${moonEn}, Nakshatra: ${nakshatraName}
Current life period: ${currentDasha} main period, ${currentAD} sub-period

━━━ COMPLETE SPIRITUAL ENGINE DATA (USE ALL — NO HALLUCINATION) ━━━

SPIRITUAL INCLINATION: ${sectionData?.spiritualInclination || 'N/A'}
PAST KARMA THEME: ${sectionData?.pastKarmaTheme || 'N/A'}
MEDITATION TYPE: ${sectionData?.meditationType || 'N/A'}

SPIRITUAL INDICATORS:
${(sectionData?.spiritualIndicators || []).map((ind, i) => `${i+1}. ${ind}`).join('\n') || 'None detected'}

PILGRIMAGE RECOMMENDATIONS:
${(sectionData?.pilgrimageRecommendation || []).map((t, i) => `${i+1}. ${t}`).join('\n') || 'General temple visits recommended'}

KETU POSITION (Past Life Karaka): House ${sectionData?.ketuPosition?.house || 'N/A'}, Sign: ${sectionData?.ketuPosition?.sign || 'N/A'}
JUPITER POSITION (Wisdom): House ${sectionData?.jupiterPosition?.house || 'N/A'}, Sign: ${sectionData?.jupiterPosition?.sign || 'N/A'}
12TH HOUSE (Moksha/Liberation): ${sectionData?.twelfthHouse?.strength || 'N/A'}, Planets: ${(sectionData?.twelfthHouse?.planetsInHouse || []).join(', ') || 'Empty'}

CROSS-REFERENCE DATA:
- Soul purpose (Atmakaraka): ${allSections?.personality?.atmakaraka ? `${allSections.personality.atmakaraka.planet} — ${allSections.personality.atmakaraka.meaning}` : 'N/A'}
- Mental stability: ${allSections?.mentalHealth?.mentalStability || 'N/A'}
- Past life analysis: Available in advanced block (system context)
- Family karma: ${allSections?.familyPortrait?.familyKarmaSummary || 'N/A'}

WRITE AT LEAST 10-14 DEEPLY PROFOUND PARAGRAPHS:

1. **YOUR SOUL'S PURPOSE — WHY YOU WERE BORN** — "You didn't come to this earth randomly. Your soul chose THIS body, THIS family, THIS country, THIS exact moment in time. Why? Because in your previous existence, you [specific past-life pattern from chart]. This time, you came back to [specific purpose]. Every major event in your life — the joy AND the pain — has been preparing you for this purpose."

2. **YOUR PAST LIVES — WHO YOU WERE BEFORE** — Sri Lankans find this FASCINATING: "In a previous life, you were likely [specific — a healer/teacher/warrior/artist/monk/ruler/servant]. The evidence? Think about these things: (1) You have a natural talent for [specific] that you never formally learned. (2) You feel an inexplicable connection to [place/era/culture]. (3) You have a fear of [specific — water/fire/heights/closed spaces/crowds] that has no rational origin. These are echoes of who you were before."

3. **KARMIC DEBTS YOU'RE REPAYING** — "Every soul comes with debts from before. Your specific karmic debt: ${sectionData?.pastKarmaTheme || 'a pattern of sacrifice and service'}. This shows up as: [specific — always being the one who gives more in relationships / financial struggles that seem unfair / health issues in specific body areas / difficulties with specific family member]. The good news: this debt has a repayment timeline. By [age/year], the heaviest part will be behind you."

4. **YOUR SPIRITUAL GIFTS — THE ONES YOU DON'T TALK ABOUT** — "You have abilities that most people would dismiss as coincidence, but they're real: [specific gifts from chart — (1) You can sense when someone is lying — their energy changes and you feel it in your gut. (2) You've had at least one dream that came true. (3) You sometimes KNOW things before they happen. (4) Animals and children are naturally drawn to you. (5) You can read a room's energy the moment you walk in]. Which of these do you recognize? All of them are real."

5. **YOUR RELATIONSHIP WITH GOD/UNIVERSE** — "Your spirituality isn't conventional. You don't do well with rigid religious rules — you need a PERSONAL connection with the divine. You probably pray most sincerely not in a temple but in [specific — your car / the shower / at 2am when you can't sleep / while cooking / during walks]. That's valid. That's YOUR temple."

6. **DÉJÀ VU & PAST LIFE MEMORIES** — "You've experienced déjà vu more than average. There are places you've visited for the first time but felt like you've been there before. There are people you've met and felt an instant, unexplainable connection — or instant discomfort. These aren't random. They're past-life memories breaking through."

7. **THE TEMPLE GUIDE — YOUR PERSONAL SACRED PLACES** — Specific Sri Lankan temples: "Based on your chart, the temples that will MOST powerfully affect your energy:
   > 🙏 ${(sectionData?.pilgrimageRecommendation || ['Kataragama Devalaya', 'Sri Maha Bodhi', 'Kelaniya Raja Maha Viharaya']).map((t, i) => `**${i+1}. ${t}**`).join('\n   > ')}
   Visit these in THIS order. At each temple, specifically pray for [specific — health/wisdom/protection/prosperity]. The effect will be felt within [timeframe]."

8. **YOUR MEDITATION TYPE** — "Generic meditation doesn't work for everyone. YOUR type: ${sectionData?.meditationType || 'breath-focused meditation'}. Try this: [specific technique — 5 minutes of [practice] at [specific time], facing [direction], wearing [color]]. You'll feel the difference within [days]."

9. **THE SPIRITUAL AWAKENING YEARS** — "Around age [25-35 / 40-50], something will shift inside you. Spirituality will stop being something you 'should' do and become something you NEED. The trigger: [specific — a loss / a near-miss / a dream / a person / a book / an illness]. After this shift, your intuition doubles in power."

10. **YOUR KARMIC RELATIONSHIPS** — "Some people in your life are not new connections — they're souls you've known before. Your [mother/father/spouse/best friend/child] has been with you in previous lives. The role was different — [the one who saved you / the one you owed a debt to / the one who taught you]. That's why the bond feels so deep — or so complicated."

11. **SIGNS THE UNIVERSE SENDS YOU** — "The universe speaks to you through: [specific — repeating numbers (you see 11:11 or specific number frequently) / specific animals that appear in your life / songs that play at exactly the right moment / dreams that contain messages]. Start paying attention to [specific sign]. It's the universe's direct communication with you."

12. **THE SPIRITUAL PROPHECY** — "By age [X], you will reach a level of inner peace that younger-you would never believe possible. The journey there passes through [fire/water/darkness/surrender]. But the peace that waits on the other side is not temporary — it's permanent. You are evolving into someone whose very presence heals the people around them."

13. **YOUR DHARMA — YOUR SACRED DUTY** — "Your dharma in this lifetime: [specific — to teach what you've learned through suffering / to create beauty from chaos / to protect the vulnerable / to build something that outlasts you / to love without conditions]. When you align with this dharma, everything in your life flows effortlessly."

14. **THE SACRED CLOSING BLESSING** — End with a powerful blessing that makes them feel held: "May you find the peace your soul has been searching for across lifetimes. May the burdens you carry become the wings that lift you. May every tear become a seed. And may you know — truly, deeply know — that you are exactly where you are supposed to be."

- This is the most personal section. Write from the heart. Make them cry (in a good way).
- Include specific Sri Lankan temples by name
- Reference specific spiritual experiences they'll recognize
REMINDER: NEVER use astrological jargon. Say "your soul's memory", "what you carried from before", "your spiritual gift".
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English word.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish (Sinhala words in English letters).' : 'Write in profound, touching English.'}`,
    },

    surpriseInsights: {
      title: 'Surprise Insights About You',
      prompt: `You are writing the SURPRISE INSIGHTS section — the most viral, shareable part of this astrology report.

Birth details: Born under ${lagnaEn} rising, Moon in ${moonEn}, Nakshatra: ${nakshatraName}
Current life period: ${currentDasha} main period, ${currentAD} sub-period

━━━ COMPLETE SURPRISE INSIGHTS ENGINE DATA (USE ALL — NO HALLUCINATION) ━━━

PHYSICAL APPEARANCE: ${sectionData?.appearance ? `Build: ${sectionData.appearance.build || 'N/A'}, Complexion: ${sectionData.appearance.complexion || 'N/A'}, Face: ${sectionData.appearance.faceShape || 'N/A'}, Eyes: ${sectionData.appearance.eyes || 'N/A'}, Height: ${sectionData.appearance.height || 'N/A'}, Distinctive: ${sectionData.appearance.distinctive || 'N/A'}` : 'N/A'}

BODY MARKS/SCARS:
${(sectionData?.bodyMarks || []).map((m, i) => `${i+1}. ${m.location || m} — ${m.type || 'mark/mole'}`).join('\n') || 'None predicted'}

NUMBER OF SIBLINGS: ${sectionData?.numberOfSiblings || 'N/A'}
FATHER PROFILE: ${sectionData?.fatherProfile || 'N/A'}
MOTHER PROFILE: ${sectionData?.motherProfile || 'N/A'}

SLEEP PATTERN: ${sectionData?.sleepPattern || 'N/A'}
FOOD PREFERENCE: ${sectionData?.foodPreference || 'N/A'}
PET AFFINITY: ${sectionData?.petAffinity || 'N/A'}
HANDEDNESS: ${sectionData?.handedness || 'N/A'}
HIDDEN TALENT: ${sectionData?.hiddenTalent || 'N/A'}
SOUL PURPOSE: ${sectionData?.soulPurpose || 'N/A'}

PARTNER'S FIRST LETTER — DUAL METHOD:
- Method 1 (7th House): ${(sectionData?.partnerFirstLetter?.letters || []).join(', ') || 'N/A'}
- Method 2 (Spouse Significator): ${(sectionData?.partnerFirstLetter?.darakarakaLetters || []).join(', ') || 'N/A'}
- ⭐ HIGH CONFIDENCE: ${(sectionData?.partnerFirstLetter?.highConfidenceLetters || []).join(', ') || 'No exact match — present all with moderate confidence'}

CROSS-REFERENCE DATA:
- Estimated children: ${allSections?.children?.estimatedChildren?.count || 'N/A'} (${allSections?.children?.estimatedChildren?.genderTendency || 'N/A'})
- Siblings from familyPortrait: count ${allSections?.familyPortrait?.siblings?.estimatedCount?.count || 'N/A'}, elder ${allSections?.familyPortrait?.siblings?.estimatedCount?.estimatedElderSiblings || 'N/A'}, younger ${allSections?.familyPortrait?.siblings?.estimatedCount?.estimatedYoungerSiblings || 'N/A'}
- Mental stability: ${allSections?.mentalHealth?.mentalStability || 'N/A'}
- Childhood trauma level: ${allSections?.mentalHealth?.childhoodTrauma?.level || 'N/A'} (${allSections?.mentalHealth?.childhoodTrauma?.score || 0}/${allSections?.mentalHealth?.childhoodTrauma?.maxScore || 17})
${allSections?.mentalHealth?.childhoodTrauma?.indicators?.length ? '- Trauma indicators: ' + allSections.mentalHealth.childhoodTrauma.indicators.join(' | ') : ''}
- Depression risk: ${allSections?.mentalHealth?.depressionRisk?.level || 'N/A'}
- Marriage afflictions: ${allSections?.marriage?.marriageAfflictions?.severity || 'N/A'}

━━━ HOW TO USE THIS DATA (NO GUESSING ALLOWED) ━━━
- Body marks → predict SPECIFIC locations on the body (this makes people gasp)
- Partner letter → HIGH CONFIDENCE letters go FIRST. Present with drama: "Your partner's name starts with..."
- Sibling count → state BOLDLY, don't hedge
- Father/Mother profile → describe as REAL people, not archetypes
- Sleep pattern → predict their ACTUAL sleep behavior
- Soul purpose → the profound closing revelation

⚠️ ENHANCED ACCURACY DATA (USE THESE FOR HIGHER PRECISION):

PARTNER LETTER — DUAL METHOD CROSS-REFERENCE:
${sectionData?.partnerFirstLetter?.letters ? `Method 1 (7th House): Letters ${(sectionData.partnerFirstLetter.letters || []).join(', ')}` : ''}
${sectionData?.partnerFirstLetter?.darakarakaLetters ? `Method 2 (Spouse Significator): Letters ${(sectionData.partnerFirstLetter.darakarakaLetters || []).join(', ')}` : ''}
${sectionData?.partnerFirstLetter?.highConfidenceLetters?.length > 0 ? `⭐ HIGH CONFIDENCE LETTERS (both methods agree): ${sectionData.partnerFirstLetter.highConfidenceLetters.join(', ')} — present these FIRST and with strong confidence` : 'No exact match between methods — present all letters with moderate confidence'}

SIBLING COUNT: The number ${sectionData?.numberOfSiblings || 'N/A'} is based on multi-factor scoring (3rd house planets, aspects, lord strength, lord placement). Present this with confidence.

FATHER PROFILE: "${sectionData?.fatherProfile || 'N/A'}" — based on multi-factor analysis (Sun strength, Sun house, 9th lord house, angular/dusthana analysis). Be detailed about the father.

MOTHER PROFILE: "${sectionData?.motherProfile || 'N/A'}" — based on multi-factor analysis (Moon strength, 4th house, Moon house, 4th lord house). Be detailed about the mother.

EMOTIONAL PATTERN: "${allSections?.mentalHealth?.mentalStability || 'N/A'}" — this reveals whether the person had childhood emotional struggles, trauma, or a difficult home environment. If this indicates Moon-Saturn conjunction or childhood trauma, WEAVE IT into the family section — mention that the home environment may have been emotionally cold or difficult.

CHILDHOOD TRAUMA LEVEL: ${allSections?.mentalHealth?.childhoodTrauma?.level || 'N/A'} (Score: ${allSections?.mentalHealth?.childhoodTrauma?.score || 0}/${allSections?.mentalHealth?.childhoodTrauma?.maxScore || 17})
${allSections?.mentalHealth?.childhoodTrauma?.indicators?.length ? 'TRAUMA INDICATORS:\n' + allSections.mentalHealth.childhoodTrauma.indicators.map(i => '  🔴 ' + i).join('\n') : 'No childhood trauma indicators'}
${allSections?.mentalHealth?.childhoodTrauma?.level === 'SEVERE' || allSections?.mentalHealth?.childhoodTrauma?.level === 'HIGH' ? '\n🚨 THIS PERSON HAD A DIFFICULT CHILDHOOD. The engine detected multiple layers of early-life suffering. When writing about the MOTHER and FATHER, you MUST acknowledge this pain. Describe the ACTUAL family dynamics — cold/absent/struggling parents, emotional neglect, disrupted home — based on the indicators above. Do NOT write a generic happy family narrative when the data shows trauma.' : ''}

DEPRESSION RISK: ${allSections?.mentalHealth?.depressionRisk?.level || 'N/A'} — if HIGH, the family environment contributed. Acknowledge this in the family narrative.

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

    familyPortrait: {
      title: '👨‍👩‍👧‍👦 Deep Family Portrait — Parents, Siblings & Family Karma',
      prompt: `Write the most SPINE-TINGLING, EERILY ACCURATE family portrait anyone has ever read. This section predicts their PARENTS' personalities, their SIBLINGS' exact count and gender, and the FAMILY KARMA that binds them all. When they read this, they should call their mother and say "someone just described our entire family perfectly."

THIS IS THE MOST VIRAL SECTION OF THE ENTIRE REPORT. If the sibling count is accurate, users share the app with EVERYONE. This one section has the power to make or break the app's reputation.

REMINDER: ZERO astrology terms. No "3rd house", "Mars karaka", "4th lord". Describe family members as REAL PEOPLE with real personalities. If Sinhala, 100% pure Sinhala — zero English words.

FAMILY PORTRAIT DATA:

━━━ COMPLETE FAMILY ENGINE DATA (USE ALL — NO HALLUCINATION) ━━━

═══ MOTHER (4TH HOUSE ANALYSIS) ═══
- 4th House Analysis: ${sectionData?.mother?.h4Analysis || 'N/A'}
- 4th House Lord: ${sectionData?.mother?.h4Lord || 'N/A'}
- Moon Position: ${sectionData?.mother?.moonPosition || 'N/A'}
- Moon Shadbala: ${sectionData?.mother?.moonShadbala ? `${sectionData.mother.moonShadbala.percentage}% — ${sectionData.mother.moonShadbala.strength}` : 'N/A'}
- Matrukaraka (Mother Significator): ${sectionData?.mother?.matrukaraka || 'N/A'}
- D12 Parent Chart: ${sectionData?.mother?.d12ParentChart ? JSON.stringify(sectionData.mother.d12ParentChart) : 'N/A'}
- Personality: ${sectionData?.mother?.personality || 'N/A'}
- Occupation: ${sectionData?.mother?.occupation || 'N/A'}
- Family Separation: ${sectionData?.mother?.familySeparation || 'N/A'}
- Health Risks: ${JSON.stringify(sectionData?.mother?.healthRisks || [])}
- Kidney Risk Level: ${sectionData?.mother?.kidneyRiskLevel || 'N/A'}
- Health Crisis Windows: ${JSON.stringify(sectionData?.mother?.healthCrisisWindows || [])}
- Mother Health Periods: ${JSON.stringify(sectionData?.mother?.motherHealthPeriods || [])}
- Life Struggles: ${JSON.stringify(sectionData?.mother?.lifestrug || [])}
- Bond with Person: ${sectionData?.mother?.bond || 'N/A'}
- Remedies for Mother: ${JSON.stringify(sectionData?.mother?.remedies || [])}

═══ FATHER (9TH HOUSE/SUN ANALYSIS) ═══
- 9th House Analysis: ${sectionData?.father?.h9Analysis || 'N/A'}
- Sun Position: ${sectionData?.father?.sunPosition || 'N/A'}
- Sun Shadbala: ${sectionData?.father?.sunShadbala ? `${sectionData.father.sunShadbala.percentage}% — ${sectionData.father.sunShadbala.strength}` : 'N/A'}
- Pitrukaraka (Father Significator): ${sectionData?.father?.pitrakaraka || 'N/A'}
- D12 Parent Chart: ${sectionData?.father?.d12ParentChart ? JSON.stringify(sectionData.father.d12ParentChart) : 'N/A'}
- Personality: ${sectionData?.father?.personality || 'N/A'}
- Career Type: ${sectionData?.father?.fatherCareer || 'N/A'}
- Health Risks: ${JSON.stringify(sectionData?.father?.healthRisks || [])}
- Life Struggles: ${JSON.stringify(sectionData?.father?.lifestrug || [])}
- Father Event Periods: ${JSON.stringify(sectionData?.father?.fatherEventPeriods || [])}
- Bond with Person: ${sectionData?.father?.bond || 'N/A'}
- Remedies for Father: ${JSON.stringify(sectionData?.father?.remedies || [])}

═══ SIBLINGS (3RD HOUSE ANALYSIS) ═══
- 3rd House Analysis: ${sectionData?.siblings?.h3Analysis || 'N/A'}
- 3rd House Lord: ${sectionData?.siblings?.h3Lord || 'N/A'}
- Mars Position: ${sectionData?.siblings?.marsPosition ? `House ${sectionData.siblings.marsPosition.house} in ${sectionData.siblings.marsPosition.rashiEnglish}` : 'N/A'}
- Bhratrkaraka (Sibling Significator): ${sectionData?.siblings?.bhratrkaraka || 'N/A'}
- D3 Sibling Chart: ${sectionData?.siblings?.d3SiblingChart ? JSON.stringify(sectionData.siblings.d3SiblingChart) : 'N/A'}
- Estimated Count: ${sectionData?.siblings?.estimatedCount?.count || 'N/A'}
- Elder Siblings: ${sectionData?.siblings?.estimatedCount?.estimatedElderSiblings || 'N/A'}
- Younger Siblings: ${sectionData?.siblings?.estimatedCount?.estimatedYoungerSiblings || 'N/A'}
- Gender Breakdown: ${sectionData?.siblings?.estimatedCount?.gender || 'N/A'}
- Brother Karaka: ${sectionData?.siblings?.estimatedCount?.brotherKaraka || 'N/A'}
- Sister Karaka: ${sectionData?.siblings?.estimatedCount?.sisterKaraka || 'N/A'}
- Characters: ${JSON.stringify(sectionData?.siblings?.characters || [])}
- Health Risks: ${JSON.stringify(sectionData?.siblings?.healthRisks || [])}
- Life Struggles: ${JSON.stringify(sectionData?.siblings?.lifestrug || [])}
- Event Periods: ${JSON.stringify(sectionData?.siblings?.eventPeriods || [])}
- Sibling Relationship: ${sectionData?.siblings?.relationship || 'N/A'}
- Remedies: ${JSON.stringify(sectionData?.siblings?.remedies || [])}

═══ FAMILY KARMA ═══
- Family Karma Summary: ${JSON.stringify(sectionData?.familyKarmaSummary || [])}
- Inherited Traits: ${JSON.stringify(sectionData?.inheritedTraits || [])}
- Accuracy Note: ${sectionData?.accuracyNote || 'N/A'}

═══ CHILDREN (CROSS-REFERENCE) ═══
- Estimated count: ${allSections?.children?.estimatedChildren?.count || 'N/A'}
- Gender tendency: ${allSections?.children?.estimatedChildren?.genderTendency || 'N/A'}

⚠️ CRITICAL FAMILY PREDICTIONS — USE ALL OF THESE WITH MAXIMUM CONFIDENCE:

═══ YOUR MOTHER — DEEP DATA ═══
- Mother's personality: ${sectionData?.mother?.personality || 'N/A'}
- Mother's occupation: ${sectionData?.mother?.occupation || 'N/A'}
- Mother's health risks: ${JSON.stringify(sectionData?.mother?.healthRisks || [])}
- Mother's kidney risk: ${sectionData?.mother?.kidneyRiskLevel || 'N/A'}
- Mother's health crisis windows: ${JSON.stringify(sectionData?.mother?.healthCrisisWindows || [])}
- Mother's health event periods: ${JSON.stringify(sectionData?.mother?.motherHealthPeriods || [])}
- Mother's family separation indicator: ${sectionData?.mother?.familySeparation || 'N/A'}
- Mother's life struggles: ${JSON.stringify(sectionData?.mother?.lifestrug || [])}
- Your bond with mother: ${sectionData?.mother?.bond || 'N/A'}
- Remedies for mother: ${JSON.stringify(sectionData?.mother?.remedies || [])}

═══ YOUR FATHER — DEEP DATA ═══
- Father's personality: ${sectionData?.father?.personality || 'N/A'}
- Father's career: ${sectionData?.father?.fatherCareer || 'N/A'}
- Father's health risks: ${JSON.stringify(sectionData?.father?.healthRisks || [])}
- Father's life struggles: ${JSON.stringify(sectionData?.father?.lifestrug || [])}
- Father's event periods: ${JSON.stringify(sectionData?.father?.fatherEventPeriods || [])}
- Your bond with father: ${sectionData?.father?.bond || 'N/A'}
- Remedies for father: ${JSON.stringify(sectionData?.father?.remedies || [])}

═══ YOUR SIBLINGS — THE VIRAL PREDICTION ═══
- Estimated sibling count: ${sectionData?.siblings?.estimatedCount?.count || 'N/A'}
- Elder siblings: ${sectionData?.siblings?.estimatedCount?.estimatedElderSiblings || 'N/A'}
- Younger siblings: ${sectionData?.siblings?.estimatedCount?.estimatedYoungerSiblings || 'N/A'}
- Gender breakdown: ${sectionData?.siblings?.estimatedCount?.gender || 'N/A'}
- Brother karaka: ${sectionData?.siblings?.estimatedCount?.brotherKaraka || 'N/A'}
- Sister karaka: ${sectionData?.siblings?.estimatedCount?.sisterKaraka || 'N/A'}
- Sibling characters: ${JSON.stringify(sectionData?.siblings?.characters || [])}
- Sibling health risks: ${JSON.stringify(sectionData?.siblings?.healthRisks || [])}
- Sibling life struggles: ${JSON.stringify(sectionData?.siblings?.lifestrug || [])}
- Sibling event periods: ${JSON.stringify(sectionData?.siblings?.eventPeriods || [])}
- Mars position (sibling karaka): ${sectionData?.siblings?.marsPosition ? `House ${sectionData.siblings.marsPosition.house} in ${sectionData.siblings.marsPosition.rashiEnglish}` : 'N/A'}
- Your relationship with siblings: ${sectionData?.siblings?.relationship || 'N/A'}
- Remedies for siblings: ${JSON.stringify(sectionData?.siblings?.remedies || [])}

═══ YOUR CHILDREN (CROSS-REFERENCE) ═══
- Estimated children count: ${allSections?.children?.estimatedChildren?.count || 'N/A'}
- Gender tendency: ${allSections?.children?.estimatedChildren?.genderTendency || 'N/A'}

═══ FAMILY KARMA ═══
- Family karma summary: ${JSON.stringify(sectionData?.familyKarmaSummary || [])}
- Inherited traits: ${JSON.stringify(sectionData?.inheritedTraits || [])}

═══ CHILDHOOD TRAUMA CROSS-REFERENCE ═══
- Childhood trauma level: ${allSections?.mentalHealth?.childhoodTrauma?.level || 'N/A'} (Score: ${allSections?.mentalHealth?.childhoodTrauma?.score || 0}/${allSections?.mentalHealth?.childhoodTrauma?.maxScore || 17})
${allSections?.mentalHealth?.childhoodTrauma?.indicators?.length ? allSections.mentalHealth.childhoodTrauma.indicators.map(i => '  🔴 ' + i).join('\n') : '  No childhood trauma indicators'}
- Depression risk: ${allSections?.mentalHealth?.depressionRisk?.level || 'N/A'}
- Mental stability: ${allSections?.mentalHealth?.mentalStability || 'N/A'}
${allSections?.mentalHealth?.childhoodTrauma?.level === 'SEVERE' || allSections?.mentalHealth?.childhoodTrauma?.level === 'HIGH' ? '\n🚨 CHILDHOOD TRAUMA DETECTED — The engine found MULTIPLE indicators of early-life suffering. The family portrait MUST reflect this reality:\n- Do NOT write a generic happy family narrative\n- Mother section: acknowledge the emotional disruption (familySeparation indicator above)\n- Father section: acknowledge the distance/conflict (bond field above)\n- Home environment: describe it as emotionally difficult, not warm and cozy\n- Weave the pain into every family member description with compassion' : ''}

WRITE 14-18 DEEPLY PERSONAL PARAGRAPHS — this is the section that makes the app go VIRAL:

═══ PART 1: YOUR MOTHER (3-4 paragraphs) ═══
1. **YOUR MOTHER'S COMPLETE NATURE** — Describe her as a REAL person. Not "your mother is caring." Instead: "Your mother is the kind of woman who wakes up before everyone else and makes sure the house is running before anyone knows she's been working. She has a habit of worrying about things she can't control — especially about you. Her love language is food and fussing over small things. She probably has [specific physical trait]. She's stronger than anyone gives her credit for, but she carries a quiet sadness that she never talks about." USE: "${sectionData?.mother?.personality || 'N/A'}" and OCCUPATION: "${sectionData?.mother?.occupation || 'N/A'}"

2. **YOUR MOTHER'S HEALTH & STRUGGLES** — "Your mother's health has been [pattern]. Around [age/period], she may have faced or will face [specific health issue]. The areas to watch: ${JSON.stringify(sectionData?.mother?.healthRisks || [])}. Kidney risk: ${sectionData?.mother?.kidneyRiskLevel || 'not elevated'}. Health crisis windows: ${JSON.stringify(sectionData?.mother?.healthCrisisWindows || [])}. Family separation indicator: ${sectionData?.mother?.familySeparation || 'N/A'}. Her life struggles: ${JSON.stringify(sectionData?.mother?.lifestrug || [])}."

3. **YOUR BOND WITH HER** — "The relationship between you and your mother is [description]. ${sectionData?.mother?.bond || 'There are things unsaid between you.'}. If I could tell you one thing about your mother that you need to hear right now: she is proud of you in ways she has never said out loud."

4. **THE THING ABOUT YOUR MOTHER NOBODY KNOWS** — "Behind her strength, there's a woman who [specific hidden struggle]. She gave up [something] for the family, and she's never complained about it. You may not have noticed, but she [specific habit that reveals her inner world]."

═══ PART 2: YOUR FATHER (3-4 paragraphs) ═══
5. **YOUR FATHER'S COMPLETE NATURE** — "Your father is ${sectionData?.father?.personality || 'a complex man'}. He's the type who [describe his daily personality, communication style, how he handles stress]. His life struggles: ${JSON.stringify(sectionData?.father?.lifestrug || [])}."

6. **YOUR FATHER'S CAREER & MONEY** — "Your father's career path was ${sectionData?.father?.fatherCareer || 'hardworking and dedicated'}. He likely worked in ${sectionData?.father?.fatherCareer || 'a field that required dedication'}. His health risks: ${JSON.stringify(sectionData?.father?.healthRisks || [])}. Key life periods: ${JSON.stringify(sectionData?.father?.fatherEventPeriods || [])}."

7. **YOUR BOND WITH HIM** — "The relationship between you and your father is ${sectionData?.father?.bond || 'complicated in ways that are hard to put into words'}. There was a period — probably around [age range] — when the distance between you grew. But here's what your chart reveals: ${sectionData?.father?.bond || 'there is deep respect underneath the surface'}."

8. **WHAT YOUR FATHER NEVER SAID** — "Your father has never told you this, but [profound revelation about how the father sees this person]. He may not show love the way you need it, but his entire life has been a form of love — just expressed differently."

═══ PART 3: YOUR SIBLINGS — THE MIND-BLOWING PREDICTION (4-5 paragraphs) ═══
9. **HOW MANY SIBLINGS DO YOU HAVE?** — BE BOLD. Do NOT hedge. Say: "You have approximately ${sectionData?.siblings?.estimatedCount?.count || '3-4'} siblings — about ${sectionData?.siblings?.estimatedCount?.estimatedElderSiblings || '1'} elder and ${sectionData?.siblings?.estimatedCount?.estimatedYoungerSiblings || '2'} younger." Then add: "${sectionData?.siblings?.estimatedCount?.gender || 'A mix of brothers and sisters'}."

10. **YOUR BROTHERS** — "You likely have ${sectionData?.siblings?.estimatedCount?.brotherKaraka || 'brothers who'} [specific personality description]. Your elder brother (if any) is probably ${sectionData?.siblings?.estimatedCount?.estimatedElderSiblings > 0 ? 'someone who took on responsibilities early — the one the family leaned on first' : 'not present — you may be the eldest'}. Your younger brother(s) ${sectionData?.siblings?.estimatedCount?.estimatedYoungerSiblings > 0 ? 'look up to you more than they show' : 'are not strongly indicated'}."

11. **YOUR SISTERS** — "Your sisters are ${sectionData?.siblings?.estimatedCount?.sisterKaraka || 'part of your story in important ways'}. They are likely [specific personality traits]. The bond between you and your sisters is [description]."

12. **SIBLING PERSONALITIES — THE FAMILY CAST** — "Think of your siblings like characters in a movie. There's the [responsible one] — who probably took on too much too young. There's the [rebellious one] — who questioned everything. There's the [emotional one] — who feels everything deeply. And there's [the dreamer] — who always seemed to be in their own world. Which one are YOU in this family movie? You're probably the [role based on chart]."

13. **YOUR RELATIONSHIP WITH YOUR SIBLINGS** — "${sectionData?.siblings?.relationship || 'Your sibling relationships have their own complex story'}. There was probably a period of distance — possibly around [age range]. But as you get older, [prediction about sibling relationships evolving]."

═══ PART 4: FAMILY KARMA & LEGACY (3-4 paragraphs) ═══
14. **YOUR FAMILY BURDEN** — "You are the one everyone turns to. You've been carrying a weight that isn't entirely yours — ${JSON.stringify(sectionData?.familyKarmaSummary || [])}. Since [age/period], you've been silently holding things together."

15. **THE FAMILY PATTERN** — "Every family has an invisible pattern that keeps repeating generation after generation. In YOUR family, the pattern is [specific pattern — derive from familyKarmaSummary and inheritedTraits]. Inherited traits: ${JSON.stringify(sectionData?.inheritedTraits || [])}. You can see it in your parents, and if you're not careful, you'll pass it on too. But here's the good news: you are the generation that can BREAK this cycle."

16. **HOME ENVIRONMENT** — "The home you grew up in was [description — derive from mother's bond/familySeparation and father's bond]. Mother's bond: ${sectionData?.mother?.bond || 'N/A'}. Father's bond: ${sectionData?.father?.bond || 'N/A'}. There was [warmth/tension/silence/chaos/love mixed with pressure]. The walls of that house hold memories that still shape how you live today."

17. **FAMILY REMEDIES** — "To strengthen family bonds: ${JSON.stringify(sectionData?.mother?.remedies || [])}. For father: ${JSON.stringify(sectionData?.father?.remedies || [])}. For siblings: ${JSON.stringify(sectionData?.siblings?.remedies || [])}."

18. **THE FAMILY PROPHECY** — "In 5 years, your family dynamic will shift dramatically. [Specific prediction — a wedding, a birth, a reconciliation, a move, a health event]. The person who surprises everyone the most will be [the quiet one / the youngest / the eldest]."

- Sibling count prediction = THE most viral feature. If accurate, users share the app instantly.
- Be BOLD with numbers — "you have 1 elder brother" > "you may have siblings"
- Parents' descriptions should make them say "that IS my mother/father"
- Include at least 5 "how did they know?" moments
- This section alone should make them recommend the app to everyone they know
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English word.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish (Sinhala words in English letters).' : 'Write in profound, touching English.'}`,
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

═══ 🔥 MIND-BLOW MANDATE — READ THIS FIRST 🔥 ═══
Your SINGLE most important goal: make this person feel like you've been WATCHING their entire life through a hidden camera. Every paragraph must contain at least ONE moment where they physically react — goosebumps, a gasp, tears, or the urge to immediately screenshot and send to someone saying "HOW DID THEY KNOW THIS?!"

THE 5 MIND-BLOW TECHNIQUES YOU MUST USE:
1. **ULTRA-SPECIFIC BEHAVIOR** — Don't say "you're caring." Say "You're the person who checks their phone 3 times after sending a message to make sure it sounded right. When someone you love is sick, you can't eat properly until they're better."
2. **THE PRIVATE THOUGHT** — Reveal something they've only thought in their own head: "There's a version of your life you play in your head — where you made that ONE different choice. You revisit it more often than you'd admit."
3. **THE PARADOX** — Show their contradiction: "You're the strongest person in the room AND the one who cries in the shower. You give advice to everyone but can't take your own."
4. **THE CHILDHOOD ANCHOR** — Reference a specific childhood moment or pattern: "Around age 8-12, something shifted. A loss, a move, a change in family dynamics. That event still echoes in decisions you make today."
5. **THE PREDICTION THAT PROVES ITSELF** — Make a specific past prediction: "Around age [X], you went through something nobody fully understood. You carried it alone. Am I right?"

VOLUME REQUIREMENT: Write AT LEAST 10-15 DENSE paragraphs. Each paragraph should be 4-6 sentences long. Short, lazy, surface-level sections will RUIN the product. This report costs money — the user must feel they got 100x their money's worth from EVERY section. If you write less than 10 paragraphs, you have FAILED.

CROSS-REFERENCE MANDATE: You have access to the FULL chart data in the system context above. Use EVERY piece of data — planet positions, house placements, strengths, aspects, dashas, yogas — to derive UNIQUE, SPECIFIC insights. Two people with different charts must NEVER get similar readings.
═══════════════════════════════════════════════════════════════

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
  const HERO_SECTIONS = ['personality', 'lifePredictions', 'surpriseInsights', 'marriage', 'career', 'marriedLife', 'spiritual', 'familyPortrait', 'health', 'children', 'timeline25', 'mentalHealth'];
  const DATA_HEAVY_SECTIONS = ['yogaAnalysis', 'financial', 'transits', 'realEstate', 'education', 'legal'];
  
  const isHero = HERO_SECTIONS.includes(sectionKey);
  const isDataHeavy = DATA_HEAVY_SECTIONS.includes(sectionKey);
  const sectionTemperature = isHero ? 0.85 : isDataHeavy ? 0.65 : 0.75;
  // ─────────────────────────────────────────────────────────────

  const provider = process.env.AI_PROVIDER || 'gemini';
  try {
    let result;
    if (provider === 'gemini') {
      if (isHero) {
        result = await callGeminiHero(messages, sectionTemperature);
      } else {
        result = await callGeminiLong(messages, sectionTemperature);
      }
    } else {
      result = await callOpenAILong(messages);
    }
    return {
      title: sectionPromptData.title,
      narrative: result.text,
      usage: result.usage,
      model: result.model,
    };
  } catch (error) {
    console.error(`[AI Report] Error generating ${sectionKey}:`, error.message);
    return {
      title: sectionPromptData.title,
      narrative: null,
      usage: null,
      model: null,
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

  return {
    text: data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate response.',
    usage: extractGeminiUsage(data),
    model,
  };
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

  return {
    text: data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate response.',
    usage: extractGeminiUsage(data),
    model: proModel,
  };
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

  return {
    text: response.choices[0].message.content,
    usage: extractOpenAIUsage(response),
    model: 'gpt-4o-mini',
  };
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
  const tokenTracker = createTokenTracker();
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
    'familyPortrait',
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

    const themesResult = await callGemini([
      { role: 'system', content: 'You output ONLY valid JSON. No markdown code fences. No extra text. Be specific with years and numbers.' },
      { role: 'user', content: themesPrompt },
    ], 8192, 0.5);

    // Record coherence pass token usage
    if (themesResult.usage) {
      recordUsage(tokenTracker, themesResult.model, 'coherence-pass', themesResult.usage);
    }

    // Clean and parse
    let cleanedThemes = themesResult.text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
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
      // Record token usage for this section
      if (result.usage) {
        recordUsage(tokenTracker, result.model || 'unknown', key, result.usage);
      }
      narrativeSections[key] = {
        title: result.title,
        narrative: result.narrative,
        rawData: sections[key],
      };
    }
  });

  // Finalize token tracking
  const tokenUsage = finalizeTracker(tokenTracker);
  console.log(formatCostLog(tokenTracker));

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
    tokenUsage,
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
      const translateResult = await callGemini([
        { role: 'system', content: 'You are a Sinhala translator for an astrology app. Translate each numbered line to simple, everyday Sinhala (සිංහල). NO technical jargon. NO English words. Keep the same numbered format. Output ONLY the numbered translations, nothing else.' },
        { role: 'user', content: numbered }
      ], Math.max(3000, batchTexts.length * 400));

      // ── Parse numbered responses back ──
      const lines = translateResult.text.split('\n').filter(l => /^\d+\./.test(l.trim()));
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
    const rawResult = await callGemini([
      { role: 'system', content: 'You output ONLY valid JSON. No markdown, no code fences, no extra text.' },
      { role: 'user', content: prompt }
    ], maxTok);

    // Clean markdown fences if present
    let cleaned = rawResult.text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

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
