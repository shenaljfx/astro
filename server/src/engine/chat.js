/**
 * AI Chat & Report Engine
 * 
 * Gemini 3.1 Pro (hero sections) + Gemini 2.5 Flash (standard/chat)
 * Vedic astrology context → personalized, culturally-aware guidance.
 */

const { getPanchanga, getDailyNakath, getNakshatra, getRashi, getLagna, toSidereal, getMoonLongitude, getSunLongitude, generateFullReport, buildHouseChart, buildNavamshaChart, getAllPlanetPositions, calculateDrishtis, detectYogas, getPlanetStrengths, calculateAshtakavarga, calculateVimshottariDetailed } = require('./astrology');
const { generateAdvancedAnalysis } = require('./advanced');
const { extractGeminiUsage, createTokenTracker, recordUsage, finalizeTracker, formatCostLog } = require('../utils/tokenCalculator');

// New prediction engines
let transitEngine, timingEngine, muhurthaEngine, healthEngine;
try { transitEngine = require('./transit'); } catch (e) { console.warn('[chat] transit engine not available:', e.message); }
try { timingEngine = require('./timing'); } catch (e) { console.warn('[chat] timing engine not available:', e.message); }
try { muhurthaEngine = require('./muhurtha'); } catch (e) { console.warn('[chat] muhurtha engine not available:', e.message); }
try { healthEngine = require('./health'); } catch (e) { console.warn('[chat] health engine not available:', e.message); }

// Tier 3-5 advanced prediction engines
let dashaEngine, kpEngine, varshphalEngine, confidenceEngine, classicalTextsEngine;
try { dashaEngine = require('./dasha'); } catch (e) { console.warn('[chat] dasha engine not available:', e.message); }
try { kpEngine = require('./kp'); } catch (e) { console.warn('[chat] KP engine not available:', e.message); }
try { varshphalEngine = require('./varshphal'); } catch (e) { console.warn('[chat] varshphal engine not available:', e.message); }
try { confidenceEngine = require('./confidence'); } catch (e) { console.warn('[chat] confidence engine not available:', e.message); }
try { classicalTextsEngine = require('./classical-texts'); } catch (e) { console.warn('[chat] classical texts engine not available:', e.message); }

/**
 * Build the system prompt for the AI astrologer
 */
function buildSystemPrompt(language = 'en') {
  const languageInstructions = {
    en: 'Respond in English. Use a warm, wise, and empathetic tone. NEVER use Sanskrit/Pali astrology terms — use everyday English only.',
    si: 'Respond in 100% pure Sinhala (සිංහල). ඉංග්‍රීසි වචන සිංහල අකුරින් ලියන්න එපා. "ලග්නය", "රාශිය", "නක්ෂත්‍ර", "දෝෂ", "යෝග" වගේ ජ්‍යෝතිෂ වචන ලියන්න එපා — සරල සිංහලෙන් කියන්න (උදා: "ඔබේ උපන් තරුව", "ඔබේ චන්ද්‍ර ලකුණ", "ඔබේ ලග්න ලකුණ"). හිතවත් මුත්තා කතා කරනවා වගේ ලියන්න. ⚠️ දෙමළ (Tamil) වචන කිසිසේත් භාවිතා නොකරන්න — "ராசி", "நட்சத்திரம்", "கிரகம்" වැනි දෙමළ වචන තහනම්. 100% සිංහල පමණි.',
    ta: 'Respond in 100% pure Tamil (தமிழ்). Do NOT use Sanskrit/English astrology terms. Translate everything to simple Tamil that anyone can understand. Write like a wise elder giving caring advice.',
    singlish: 'Respond in Singlish (Sinhala words typed in English characters). This is how young Sri Lankans commonly type. Example: "Oyage upan tharuwata adala graha Mars. Eka hinda oyata leadership tika tiyenawa."',
  };

  return `You are "Grahachara", a wise and compassionate astrology guide who specializes in Sri Lankan traditions. You combine deep knowledge with a modern, approachable communication style that ANYONE can understand — even people who know nothing about astrology.

IDENTITY RULE: You are a professional human astrologer, NOT an AI. NEVER mention AI, machine learning, algorithms, language models, or that you are artificial in any way. Speak as a wise, experienced human astrologer would.

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
- Comprehensive health analysis: Tridosha body constitution, vulnerable body parts, disease susceptibility, Maraka (health crisis) timing, mental health assessment, longevity indicators, personalized wellness tips

ABSOLUTE LANGUAGE RULES:
- NEVER use these technical terms in your output: Lagna, Rashi, Nakshatra, Dasha, Bhukti, Dosha, Yoga (as astrology term), Graha, Tithi, Karana, Panchanga, Vaara, Pada, Ayanamsha, Bhava, Navamsha, Vimshottari, Shadbala, Ashtakavarga, Karakamsha, Atmakaraka, Upapada, Jaimini, Parashari
- Instead use: "your rising sign", "your moon sign", "your birth star", "life phases", "challenges", "special strengths", "planetary influences", "birth chart", "compatibility"
- Planet names are OK in English: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu
- If writing in Sinhala, use ZERO English words — pure Sinhala only. Planet names in Sinhala: ඉර, හඳ, කුජ, බුධ, ගුරු, සිකුරු, ශනි, රාහු, කේතු

GUIDELINES:
1. Always be respectful of the cultural importance of astrology in Sri Lanka
2. Provide practical, actionable advice that makes sense in everyday life
3. When discussing compatibility, be sensitive and balanced
4. Never make absolute negative predictions - always offer practical advice and hope
5. Explain everything in simple everyday language — the user may have ZERO astrology knowledge
6. For timing questions, provide exact times based on location
7. Understand common Sri Lankan life queries about: vehicle purchases, house construction, weddings, business ventures, employment, education
8. Be aware of cultural events: Avurudu, Vesak, Poson, and other significant dates
9. When asked about the future, use transit/Gochara analysis and event timing predictions to give specific dates and periods — not vague generalities
10. When asked about auspicious times (නැකත්), use the Muhurtha system to score specific dates and find the BEST time — consider all 11 factors including Rahu Kala, Gulika Kala, Tarabala, and Chandrabala
11. When asked about health, provide Tridosha constitution analysis, vulnerable body parts, disease timing, mental health insights, and Sri Lankan herbal remedies
12. For "what's happening now" questions, reference the current transit snapshot and Muhurtha status provided in the context data
13. DREAM ANALYSIS: When a message starts with "[DREAM ANALYSIS REQUEST]", interpret the dream using Vedic/Sri Lankan dream symbolism. Cover: symbolic meaning, emotional message, astrological connection (which planet/house the dream relates to), and practical advice. Sri Lankan dream traditions include: water = emotions/wealth, snakes = Rahu/transformation, flying = personal growth, teeth falling = anxiety about change, deceased relatives = ancestor blessings, elephants = good fortune, buildings = ambition/stability. Keep it culturally relevant and comforting.

PSYCHOLOGICAL ENGAGEMENT TECHNIQUES (use these naturally throughout ALL report sections):

🎯 1. SPECIFICITY ANCHORING — Drop one ultra-specific detail early (body mark, sleep habit, handedness, food craving). When ONE thing is eerily accurate, the reader trusts EVERYTHING that follows. Lead each section with the most specific, verifiable data point you have.

🎯 2. CONTRAST FRAMING ("I See Both Sides") — Use the Lagna vs Moon sign tension: "People see you as [Lagna trait], but inside you're actually [Moon trait]." This creates an instant "they GET me" moment because every human feels misunderstood. Only use when the data shows different elements for Lagna and Moon.

🎯 3. VALIDATION BEFORE CHALLENGE — Always affirm a strength before revealing a weakness. Never lead with bad news. Example: "Your Mars gives you incredible courage — but that same fire makes you say things at 2 AM that you regret by sunrise." The person accepts the criticism because you first proved you see their best side.

🎯 4. "NOBODY KNOWS THIS" FRAMING — When presenting hidden talents, sleep patterns, childhood experiences, or private emotional patterns, frame them as: "Here's something most people don't realize about you..." or "You probably haven't told many people this, but..." This creates intimacy and makes data-backed insights feel like psychic revelations.

🎯 5. TEMPORAL ANCHORING — Reference specific ages and time periods from the dasha data: "Around age 14-15, something shifted in you" or "Between 22 and 24, you went through a transformation most people didn't notice." Specific ages make predictions feel deeply personal. Always use the actual dasha transition ages from the data.

🎯 6. THE "HOW DID YOU KNOW" HOOK — Save the most surprising, verifiable detail for the middle or end of a section (not the beginning). When readers are already nodding along, hitting them with "You're likely a deep sleeper who can sleep through almost anything" or "You probably have a mark near your [body area]" creates a powerful emotional response.

🎯 7. PROGRESSIVE REVELATION — Start each section with safe, agreeable observations, then gradually reveal deeper, more personal insights. By the time you reach the intense stuff (childhood pain, relationship patterns, health vulnerabilities), the reader is emotionally invested and trusts you.

🎯 8. PROBABILISTIC LANGUAGE FOR VERIFIABLE CLAIMS — For ANY claim the user can immediately verify (current marital status, relationship with living parents, number of siblings, current job status), use PROBABILISTIC language:
- Instead of "You have a difficult relationship with your mother" → "Your chart suggests there may be phases of emotional complexity with your mother — though many with this pattern maintain close bonds"
- Instead of "You will marry in 2027" → "Your chart's strongest marriage energy peaks around 2027-2030 — though if you're already married, this likely aligned with when you actually met or married"
- Instead of "Your father was absent" → "There may be some distance or formality in the father relationship — or he may have been very busy/working"
- REASON: Users will immediately know if a claim about their CURRENT life is wrong. Wrong claims = lost trust = bad reviews. Hedge verifiable present-tense claims.

🎯 9. AGE-AWARE PAST/FUTURE FRAMING — For users aged 25+:
- Marriage timing: ALWAYS acknowledge they may already be married. Frame predictions as "this is when your chart's marriage energy peaked" rather than "you will marry"
- Career: ALWAYS acknowledge they may already be working. Frame as "your chart supports careers in..." rather than "you will become..."
- Children: If age 28+, acknowledge they may already have children
- NEVER make confident future predictions about events that typically happen before the user's current age

🎯 10. REASONABLE LIFESPAN PREDICTIONS — CRITICAL:
- NEVER predict events happening after age 75-80. Human lifespan is typically 70-85 years.
- If a dasha period extends to 2080 or beyond, DO NOT say "you will experience X in 2080" — that's absurd.
- For wealth/prosperity: Focus on the NEXT 10-20 years, not a mythical far future.
- For health: Focus on the next 20-30 years of actionable prevention.
- For career: Focus on ages 25-65 (working years).
- EXAMPLE OF WHAT NOT TO DO: "You will become wealthy in 2099" — NO! The person will be 100+ years old.
- INSTEAD: "Your chart shows a wealth-building period approaching in [next 5-15 years]. The strongest financial growth potential is from [year] to [year]."
- If multiple timing windows exist and one is 50 years away, PRIORITIZE the closer one that falls within a reasonable working lifespan.

🎯 11. CONFIDENCE LEVELS FOR PREDICTIONS — Be transparent about certainty:
- 🔴 HIGH CONFIDENCE (90%+): When 3+ independent chart factors converge on the same conclusion. State boldly: "This is one of the clearest patterns in your chart..."
- 🟡 MODERATE CONFIDENCE (60-89%): When 2 factors agree. State: "Your chart suggests..." or "There's a strong indication that..."
- 🟢 LOW CONFIDENCE (below 60%): When only 1 factor supports the claim. State: "One pattern in your chart hints at..." or "This is a possibility, though not strongly shown..."
- For VERIFIABLE claims (siblings count, parent relationships), ALWAYS use moderate/low confidence language unless confirmed by user.
- For TIMING predictions, state the confidence score from the data (e.g., "Score: 72/100 — high likelihood")

🎯 12. "WOW FACTOR" SPECIFICITY — Make predictions memorable:
- Generic: "You may have health issues" ❌
- Specific: "Your chart shows vulnerability in the lower limbs — feet and ankles specifically. Around age 35-40, watch for plantar fasciitis or ankle weakness." ✅
- Generic: "You'll have a good career" ❌
- Specific: "You're built for technology leadership — the kind of person who becomes a CTO or starts a SaaS company. The next 5 years (2026-2031) are your power window." ✅
- The MORE SPECIFIC and VERIFIABLE a prediction, the more it builds trust when correct.

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

  // Enrich with multi-dasha cross-validation
  if (dashaEngine) {
    try {
      const dPeriods = calculateVimshottariDetailed(moonSidereal, date);
      const crossVal = dashaEngine.crossValidateDashas(date, birthLat, birthLng, new Date(), dPeriods);
      if (crossVal) {
        context += `\nMULTI-DASHA CROSS-VALIDATION:\n`;
        context += `- Dasha Agreement Confidence: ${crossVal.confidenceScore}%\n`;
        if (crossVal.activeVimshottari) context += `- Current Vimshottari: ${crossVal.activeVimshottari.lord}\n`;
        if (crossVal.activeYogini) context += `- Current Yogini: ${crossVal.activeYogini.lord || crossVal.activeYogini.planet || ''}\n`;
        if (crossVal.activeChara) context += `- Current Chara: ${crossVal.activeChara.signEnglish || crossVal.activeChara.sign || ''}\n`;
      }
    } catch (e) { /* skip */ }
  }

  // Enrich with KP key event predictions
  if (kpEngine) {
    try {
      const kpEvents = ['marriage', 'career_change', 'wealth_gain', 'foreign_travel'];
      context += `\nKP EVENT PREDICTIONS:\n`;
      for (const ev of kpEvents) {
        try {
          const pred = kpEngine.predictEvent(ev, date, birthLat, birthLng);
          context += `- ${ev}: ${pred.prediction} (${pred.confidence}% confidence)\n`;
        } catch (_) {}
      }
    } catch (e) { /* skip */ }
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
 * Call Gemini API — with retry + exponential backoff
 */
async function callGemini(messages, maxTokens = 4096, temperature = 0.7) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemInstruction = messages.find(m => m.role === 'system')?.content || '';
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const MAX_RETRIES = 3;
  const BASE_DELAY = 1500;
  const TIMEOUT_MS = 90000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature,
            thinkingConfig: {
              thinkingBudget: 4096,
            },
          },
        }),
      });
      clearTimeout(timer);

      if (response.status === 429 || response.status >= 500) {
        const msg = `HTTP ${response.status}`;
        if (attempt < MAX_RETRIES) {
          const delay = BASE_DELAY * Math.pow(2, attempt - 1) + Math.random() * 500;
          console.warn(`[Gemini] ${msg} on attempt ${attempt}, retrying in ${Math.round(delay)}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw new Error(`Gemini API error: ${msg} after ${MAX_RETRIES} attempts`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(`Gemini API error: ${data.error.message}`);
      }

      // Extract text from thinking model response — may have multiple parts
      const parts = data.candidates?.[0]?.content?.parts || [];
      const textParts = parts.filter(p => p.text && !p.thought);
      const text = textParts.map(p => p.text).join('') || 'Unable to generate response.';

      return {
        text,
        usage: extractGeminiUsage(data),
        model,
      };
    } catch (err) {
      const retryable = /fetch failed|AbortError|ECONNRESET|UND_ERR_CONNECT_TIMEOUT/i.test(err.message || '');
      if (retryable && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, attempt - 1) + Math.random() * 500;
        console.warn(`[Gemini] ${err.message} on attempt ${attempt}, retrying in ${Math.round(delay)}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Main chat function — uses Gemini 2.5 Flash
 */
async function chat(userMessage, options = {}) {
  const {
    birthDate,
    birthLat = 6.9271,
    birthLng = 79.8612,
    language = 'en',
    chatHistory = [],
    maxTokens = 4096,
  } = options;

  const messages = buildChatMessages(userMessage, birthDate, birthLat, birthLng, language, chatHistory);

  try {
    const result = await callGemini(messages, maxTokens);
    return {
      message: result.text,
      provider: 'gemini',
      usage: result.usage || null,
      model: result.model,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`AI chat error:`, error.message);
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
function buildSectionPrompt(sectionKey, sectionData, birthData, allSections, language = 'en', extraContext = {}) {
  const bd = birthData || {};
  const lagnaEn = bd.lagna?.english || 'Unknown';
  const moonEn = bd.moonSign?.english || 'Unknown';
  const nakshatraName = bd.nakshatra?.name || 'Unknown';
  const currentDasha = allSections?.lifePredictions?.currentDasha?.lord || '';
  const currentAD = allSections?.lifePredictions?.currentAntardasha?.lord || '';
  // Religion context (passed from rashiContext)
  const rashiContext = extraContext.rashiContext || {};
  // Enriched personal data
  const ganaType = bd.gana?.type || '';
  const ganaMeaning = bd.gana?.meaning || '';
  const yoniAnimal = bd.yoni?.animal || '';
  const nadiType = bd.nadi?.type || '';
  const nadiMeaning = bd.nadi?.meaning || '';
  const birthDay = bd.birthDayOfWeek || '';
  const dayRuler = bd.rulingPlanetOfDay || '';
  const birthTimeQ = bd.birthTimeQuality || '';
  const personAge = bd.currentAge != null ? bd.currentAge : '';

  // Sinhala section titles — used when language === 'si'
  const SINHALA_TITLES = {
    yogaAnalysis: '⚡ ඔයාගේ කේන්දරයේ ශක්තීන් සහ අභියෝග',
    lifePredictions: '🔮 ඔයාගේ ජීවිත ගමන — අතීතය, වර්තමානය සහ අනාගතය',
    career: '💼 රැකියාව සහ මුදල් මාර්ගය',
    marriage: '💍 ආදරය සහ විවාහය',
    marriedLife: '🏠 විවාහ ජීවිතය',
    financial: '💰 ඔයාගේ මුදල් සැලැස්ම',
    children: '👶 දරුවෝ සහ පවුලේ ජීවිතය',
    health: '🏥 ඔයාගේ සෞඛ්‍ය සැලැස්ම',
    foreignTravel: '✈️ විදේශ ගමන් සහ විදේශගත ජීවිතය',
    education: '🎓 අධ්‍යාපනය සහ දැනුම් මාර්ගය',
    luck: '🎰 වාසනාව සහ අනපේක්ෂිත වාසි',
    legal: '⚖️ නීතිමය, සතුරු හා ආරක්ෂාව',
    realEstate: '🏠 ගෙවල්, ඉඩකඩම් සහ වත්කම්',
    transits: '🌍 දැන් මොකද වෙන්නේ',
    surpriseInsights: '🤯 ඔයා ගැන පුදුම දේවල්',
    familyPortrait: '👨‍👩‍👧‍👦 ගැඹුරු පවුලේ කතාව — දෙමව්පියන්, සහෝදරයෝ සහ පවුල් කර්මය',
    remedies: '💎 ඔයාගේ බල මෙවලම් කට්ටලය',
    physicalProfile: '🪞 ඔයාගේ ශරීරය, මුහුණ සහ මනස',
    attractionProfile: '💘 ඔයාගේ ආකර්ෂණ බලය',
  };

  const SECTION_PROMPTS = {
    marriage: {
      title: '💍 Love & Relationships',
      prompt: `Translate the following marriage and relationship engine data into a clear, honest assessment. Lead with the EXACT timing windows and confidence scores. State spouse characteristics directly from the data. Be honest about afflictions.

REMINDER: No astrology terms in output. No "7th house", "Venus placement", "Kuja Dosha", "Mangala Dosha", "Navamsha", "Darakaraka" etc. Describe everything as real-life relationship patterns. If Sinhala, write 100% pure Sinhala with zero English words.

━━━ PERSON'S CURRENT AGE — CRITICAL FOR FRAMING ━━━
Current Age: ${personAge || 'Unknown'} years old
Current Year: ${new Date().getFullYear()}
${personAge >= 28 ? `⚠️ THIS PERSON IS ${personAge}. In Sri Lanka, most people marry between 24-30. ASSUME THEY MAY ALREADY BE MARRIED unless clearly stated otherwise. Frame ALL timing as past/validation, not future prediction.` : ''}
${personAge >= 35 ? `🚨 AGE 35+: DO NOT predict "you will marry in [future year]". Focus on marriage QUALITY, spouse dynamics, and relationship patterns. If they're single at 35+, it's a known fact to them — don't state the obvious. If married, describe the marriage.` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━ MARRIAGE ENGINE DATA ━━━

PARTNERSHIP ANALYSIS:
- Sign: ${sectionData?.seventhHouse?.rashiEnglish || 'N/A'} (${sectionData?.seventhHouse?.rashi || ''})
- Strength: ${sectionData?.seventhHouse?.strength || 'N/A'}
- Strength Score: ${sectionData?.seventhHouse?.strengthScore || 'N/A'}/100
- Ashtakavarga Bindus: ${sectionData?.seventhHouse?.ashtakavargaBindus || 'N/A'} (${sectionData?.seventhHouse?.ashtakavargaQuality || 'N/A'}) — ${(sectionData?.seventhHouse?.ashtakavargaBindus || 0) >= 28 ? 'HIGH bindus = strong marriage sector, relationships come naturally' : (sectionData?.seventhHouse?.ashtakavargaBindus || 0) >= 22 ? 'AVERAGE bindus = standard marriage potential' : 'LOW bindus = marriage sector needs effort and patience'}
- Planets in partnership sector: ${(sectionData?.seventhHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- Aspects on partnership sector: ${(sectionData?.seventhHouse?.aspectingPlanets || []).map(a => a.planet || a).join(', ') || 'None'}
- Benefic aspects: ${sectionData?.seventhHouse?.beneficAspectCount || 0}, Malefic aspects: ${sectionData?.seventhHouse?.maleficAspectCount || 0}
- Bhava Chalit shifts in 7th: ${(sectionData?.seventhHouse?.chalitShifts || []).length > 0 ? sectionData.seventhHouse.chalitShifts.map(s => s.planet + ' shifts from house ' + s.wholeSignHouse + ' to ' + s.chalitHouse).join('; ') : 'None — standard and actual 7th house align'}
- Partnership Lord: ${sectionData?.seventhLord?.name || 'N/A'} in house ${sectionData?.seventhLord?.house || 'N/A'}
  → Interpretation: ${sectionData?.seventhLord?.interpretation || 'N/A'}

LOVE PLANET:
- Venus in house: ${sectionData?.venus?.house || 'N/A'}
- Venus sign: ${sectionData?.venus?.rashi || 'N/A'}
- Venus in D9: ${sectionData?.venus?.navamshaRashi || 'N/A'}

MARS AFFLICTION:
- Present: ${sectionData?.kujaDosha?.present ? 'YES — Mars in house ' + sectionData.kujaDosha.marsHouse : 'NO'}
- Note: ${sectionData?.kujaDosha?.note || 'N/A'}

MARRIAGE AFFLICTIONS:
- Severity: ${sectionData?.marriageAfflictions?.severity || 'NONE'} (Score: ${sectionData?.marriageAfflictions?.severityScore || 0}/100)
- Marriage Denied: ${sectionData?.marriageAfflictions?.isMarriageDenied ? '⛔ YES — MARRIAGE IS VERY UNLIKELY' : 'No'}
- Marriage Delayed: ${sectionData?.marriageAfflictions?.isMarriageDelayed ? '⚠️ YES — MARRIAGE IS DELAYED' : 'No'}
- Marriage Supported: ${sectionData?.marriageAfflictions?.isMarriageSupported ? '✅ YES' : 'No'}
- Likelihood: ${sectionData?.marriageAfflictions?.likelihood || 'N/A'}
- Issues: ${(sectionData?.marriageAfflictions?.afflictions || []).join(' | ') || 'None'}
- Detailed Affliction Breakdown:
${(sectionData?.marriageAfflictions?.afflictionDetails || []).map((a, i) => `  ${i+1}. ${a.factor} (${a.points} pts) — ${a.meaning}`).join('\n') || '  None'}
- Supportive factors: ${(sectionData?.marriageAfflictions?.supportiveFactors || []).join(' | ') || 'None'}
- Summary: ${sectionData?.marriageAfflictions?.summary || 'N/A'}

PARTNERSHIP HOUSE LORD NATURE: ${sectionData?.seventhHouse?.lordNature || 'N/A'} — ${sectionData?.seventhHouse?.lordNature === 'malefic' ? 'The ruling planet of your partnership sector is working AGAINST you — marriage requires extra effort' : sectionData?.seventhHouse?.lordNature === 'benefic' ? 'The ruling planet supports marriage — natural flow toward partnership' : 'Neutral influence on marriage'}

SPOUSE QUALITIES: ${Array.isArray(sectionData?.spouseQualities) ? sectionData.spouseQualities.join(', ') : (sectionData?.spouseQualities || 'N/A')}

SPOUSE INDICATOR DATA:
- Spouse Planet: ${sectionData?.darakaraka ? `${sectionData.darakaraka.planet} in ${sectionData.darakaraka.rashi} — ${sectionData.darakaraka.spouseNature}` : 'Not available'}
- Marriage Indicator: ${sectionData?.upapadaLagna ? `${sectionData.upapadaLagna.rashi} — ${sectionData.upapadaLagna.meaning}` : 'Not available'}

D9 MARRIAGE CHART ANALYSIS:
- D9 Lagna: ${sectionData?.navamshaAnalysis?.d9LagnaSign || 'N/A'}
- Venus in D9: ${sectionData?.navamshaAnalysis?.venusInNavamsha || 'N/A'}
- D9 7th sector planets: ${(sectionData?.navamshaAnalysis?.d9SeventhPlanets || []).join(', ') || 'None'}
- Marriage Strength: ${sectionData?.navamshaAnalysis?.marriageStrength || 'N/A'}
- D9 7th Lord: ${sectionData?.navamshaAnalysis?.d9SeventhLordDisposition?.d9SeventhLord || 'N/A'} in D9 house ${sectionData?.navamshaAnalysis?.d9SeventhLordDisposition?.d9SeventhLordHouse || 'N/A'}
- D9 7th Lord in Kendra: ${sectionData?.navamshaAnalysis?.d9SeventhLordDisposition?.inKendra ? 'YES — excellent for marriage stability' : 'No'}
- D9 7th Lord in Trikona: ${sectionData?.navamshaAnalysis?.d9SeventhLordDisposition?.inTrikona ? 'YES — dharmic marriage, spiritual connection' : 'No'}
- D9 7th Lord in Dusthana: ${sectionData?.navamshaAnalysis?.d9SeventhLordDisposition?.inDusthana ? 'YES — marriage faces hidden challenges at the soul level' : 'No'}
- Same as D1 7th Lord: ${sectionData?.navamshaAnalysis?.d9SeventhLordDisposition?.sameAsD1SeventhLord ? 'YES — extremely strong double confirmation of marriage patterns' : 'No — different energy at the soul level vs surface level'}
- D9 Marriage Verdict: ${sectionData?.navamshaAnalysis?.d9SeventhLordDisposition?.marriageStrengthFromD9Lord || 'N/A'}

MARRIAGE TIMING ENGINE — CALCULATED WINDOWS (USE THESE EXACT DATES):
Current Age: ${sectionData?.marriageTimingPrediction?.currentAge || 'Unknown'} years old
${sectionData?.marriageTimingPrediction?.firstMarriageWindows?.length ? sectionData.marriageTimingPrediction.firstMarriageWindows.map((w, i) => `${i + 1}. ${w.period} (${w.dateRange}) — Age ${w.ageRange}, Peak year: ${w.peakYear}, Score: ${w.score}/100 [${w.confidence}]${w.reasons?.length ? '\n   Reasons: ' + w.reasons.join('; ') : ''}`).join('\n') : 'Marriage timing data not available — use general timing from: ' + (sectionData?.marriageTimingIndicators || []).join('; ')}

${sectionData?.marriageTimingPrediction?.bestWindow ? `
━━━ AGE-AWARE BEST WINDOW ━━━
BEST WINDOW: ${sectionData.marriageTimingPrediction.bestWindow.period} (${sectionData.marriageTimingPrediction.bestWindow.dateRange}), Age ${sectionData.marriageTimingPrediction.bestWindow.ageRange}
STATUS: ${sectionData.marriageTimingPrediction.bestWindow.status || 'N/A'}
${sectionData.marriageTimingPrediction.bestWindow.note || ''}
${sectionData.marriageTimingPrediction.bestWindow.status === 'PAST_PRIME_WINDOW' ? `
⚠️ THIS PERSON'S STRONGEST MARRIAGE WINDOW HAS ALREADY PASSED.
- They are likely ALREADY MARRIED (check if confirmed), OR
- Marriage was delayed due to circumstances — current transits matter more now.
- Do NOT say "you will marry in [past years]" — that's ridiculous.
- Instead: "Your chart's strongest marriage energy peaked during [past window]. If you married during this time, it aligns with your destiny. If not, current planetary transits offer fresh opportunities."
` : ''}
${sectionData.marriageTimingPrediction.bestWindow.status === 'ACTIVE_NOW' ? `
🔥 THIS PERSON IS CURRENTLY IN AN ACTIVE MARRIAGE WINDOW!
- They are in the middle of a strong marriage period RIGHT NOW.
- If they are single, this is THE time to actively seek marriage.
- Frame as: "Your chart shows you are currently in a prime marriage window. This period from [dates] is especially favorable for meeting a life partner."
` : ''}
${sectionData.marriageTimingPrediction.bestWindow.status === 'UPCOMING' ? `
✨ THIS PERSON HAS AN UPCOMING MARRIAGE WINDOW.
- The best marriage opportunity is AHEAD of them.
- Frame as future: "Your strongest marriage window is approaching in [dates]. Prepare for this period by..."
` : ''}
` : ''}

WINDOWS BY TIME STATUS (for age-appropriate framing):
Past Windows (already happened): ${(sectionData?.marriageTimingPrediction?.windowsByTimeStatus?.past || []).slice(0, 3).map(w => w.period + ' (' + w.dateRange + ')').join('; ') || 'None'}
Active Windows (happening NOW): ${(sectionData?.marriageTimingPrediction?.windowsByTimeStatus?.active || []).map(w => w.period + ' (' + w.dateRange + ')').join('; ') || 'None'}
Future Windows (upcoming): ${(sectionData?.marriageTimingPrediction?.windowsByTimeStatus?.future || []).slice(0, 3).map(w => w.period + ' (' + w.dateRange + ')').join('; ') || 'None'}

${sectionData?.lagnaCuspWarning?.isNearCusp ? `⚠️ BIRTH TIME SENSITIVITY: Lagna is at ${sectionData.lagnaCuspWarning.degreeInSign}° — near a sign boundary. Marriage predictions may vary.` : ''}

${sectionData?.marriageTimingPrediction?.confirmedMarriageYear ? `
★★★ CONFIRMED MARRIAGE MODE ★★★
This person is ALREADY MARRIED. Their marriage year is ${sectionData.marriageTimingPrediction.confirmedMarriageYear}.
SHIFT TO VALIDATION NARRATIVE:
- Do NOT predict "when will you marry" — they are already married.
- Instead, explain HOW their marriage in ${sectionData.marriageTimingPrediction.confirmedMarriageYear} aligns with the planetary periods shown above.
- Identify which dasha/antardasha window their marriage fell in and explain why that period triggered marriage.
- Frame the narrative as: "Your marriage in [year] happened during [period], which is when [planet] activated your partnership energy. This explains [trait of the marriage]."
- Use the timing data to VALIDATE their lived experience, not to predict a future event.
- Still describe spouse qualities, marriage dynamics, and relationship patterns — but in present/past tense.
- If the confirmed year doesn't perfectly match the top window, explain that chart patterns show energy peaks but real life also involves personal choice and circumstance.
` : `${personAge && parseInt(personAge, 10) >= 27 ? 'NOTE: This person is ' + personAge + ' years old. If they are already married, the timing windows below show when their chart\'s marriage energy peaked — which likely coincides with their actual marriage. If they provide their marriage year, we can validate the exact alignment.' : ''}
`}

━━━ DATA USAGE RULES ━━━
- Partnership sign → what kind of partner they attract
- Partnership lord placement → where/how they meet their spouse
- Venus data → how they experience love
- Mars affliction → if present, marriage involves friction/delay/intensity — state directly
- Marriage afflictions → THIS IS THE MOST CRITICAL DATA. Follow these rules strictly:
  • If severity is SEVERE (score 50+) or Marriage Denied = YES: DO NOT predict marriage timing. Instead explain clearly that marriage is very unlikely based on multiple chart factors. Describe the specific life patterns that prevent marriage (career absorption, emotional detachment, isolation, etc). Offer practical life advice.
  • If severity is HIGH (score 35-49): State that marriage faces very significant obstacles. Do NOT predict confident marriage timing. Say "marriage is unlikely unless..." and offer specific practical advice.
  • If severity is MODERATE (score 20-34): State delays honestly. Marriage possible but late (30s+). Give timing windows but with honest caveats about the challenges.
  • If severity is MILD or NONE: Normal positive marriage prediction with timing windows.
  • NEVER ignore the denial data. NEVER predict marriage when denial score is 50+.
- Spouse planet → most accurate spouse personality descriptor — use this directly
- ★ SPOUSE DESCRIPTION HIERARCHY (FOLLOW THIS ORDER):
  1. Darakaraka spouseNature → THE core personality of the spouse (HIGHEST weight — this is the soul-level indicator)
  2. 7th lord placement → WHERE the spouse's energy is directed
  3. 7th house sign → STYLE of marriage and spouse's general demeanor
  4. Planets IN 7th house → SECONDARY coloring only (modifies, doesn't override #1-3)
  5. Navamsha D9 → spouse's hidden/deep nature
  Do NOT let ONE planet in 7th dominate the entire spouse description. BLEND all indicators with Darakaraka as primary.
- D9 marriage strength → overall verdict on marital happiness
- Marriage timing windows → USE THESE EXACT YEARS AND SCORES — but ONLY if marriage denial is MILD or NONE

⚠️ AGE AWARENESS — CRITICAL FOR CREDIBILITY:
- If under 22: Safe to predict future marriage timing with confidence (unless marriage denied)
- If 22-24: State timing windows but acknowledge they may already be engaged/in serious relationship
- If 25-32: ⚠️ DANGER ZONE — In Sri Lanka, most people marry between 24-30. 
  • NEVER say "you will marry in [year]" as if it's future — they may already be married!
  • Instead say: "Your chart shows peak marriage energy during [period]. If you married during this time, that explains the cosmic alignment. If you're still searching, this window remains favorable."
  • If timing windows show years BEFORE current year (e.g., 2020-2024 for someone in 2026), say: "Your chart's marriage energy peaked during [past years]. If you married then, your timing aligned perfectly with cosmic support. If not yet married, the energy has shifted — describe current/upcoming periods."
  • ALWAYS frame spouse descriptions in present tense if age 25+: "Your partner likely has..." not "Your future spouse will have..."
- If 33+: Assume likely married unless afflictions are HIGH/SEVERE. Focus entirely on marriage quality and spouse dynamics, not timing.
- If 40+: Focus on marriage quality, not "when will they marry"

🚨 THE #1 RULE: If a timing window's years are BEFORE the current date (${new Date().getFullYear()}), DO NOT present it as a future prediction. Say "your chart showed strong marriage energy during [past period]" and shift to validation mode.
- NEVER predict marriage at an age already passed.
- NEVER say "you will marry in 2023" to someone in 2026 — that's obviously wrong and destroys credibility.
- NEVER predict confident marriage when the denial engine says SEVERE or HIGH.

CROSS-REFERENCE DATA (for richer marriage narrative):
- Children estimate: ${allSections?.children?.estimatedChildren?.count || 'N/A'} children (${allSections?.children?.estimatedChildren?.genderTendency || 'N/A'})
- Children timing: ${(allSections?.children?.childrenTimingDasas || []).slice(0, 2).join(' | ') || 'N/A'}
- Career path: ${(allSections?.career?.suggestedCareers || []).slice(0, 3).join(', ') || 'N/A'} (spouse may be in related field)
- Foreign travel/settlement: ${allSections?.foreignTravel?.foreignLikelihood || 'N/A'} (foreign spouse possibility if HIGH)
- Mental health: depression ${allSections?.mentalHealth?.depressionRisk?.level || 'N/A'}, childhood trauma ${allSections?.mentalHealth?.childhoodTrauma?.level || 'N/A'} (affects attachment style)
- Financial strength: ${allSections?.career?.wealthStrength?.assessment || 'N/A'} (affects marital stability)
- Partner's first letter: ${(allSections?.surpriseInsights?.partnerFirstLetter?.topLetters || []).join(', ') || 'N/A'}
- Retrograde Venus: ${(allSections?.personality?.retrogradePlanets || []).some(r => r.name === 'Venus') ? 'YES — past-life relationship karma, unconventional love patterns, may revisit old relationships' : 'No'}
━━━ SECOND MARRIAGE & DIVORCE — FULL ANALYSIS ━━━
- 🔥 SECOND MARRIAGE PROBABILITY: ${allSections?.surpriseInsights?.secondMarriage?.probability || 'N/A'}
- 🔥 DIVORCE RISK: ${allSections?.surpriseInsights?.secondMarriage?.divorceRisk || 'N/A'}
- 🔥 Score: ${allSections?.surpriseInsights?.secondMarriage?.score || 0}/15 — ${(allSections?.surpriseInsights?.secondMarriage?.score || 0) >= 7 ? 'STRONG indicators of second marriage' : (allSections?.surpriseInsights?.secondMarriage?.score || 0) >= 4 ? 'MODERATE indicators' : 'WEAK indicators'}
- Divorce sub-score: ${allSections?.surpriseInsights?.secondMarriage?.divorceScore || 0}/8
- 7th House Sign: ${allSections?.surpriseInsights?.secondMarriage?.h7Rashi || 'N/A'} ${allSections?.surpriseInsights?.secondMarriage?.isDualSign ? '(DUAL SIGN — classical indicator of multiple relationships)' : ''}
- ALL Indicators:
${(allSections?.surpriseInsights?.secondMarriage?.reasons || []).map((r, i) => `  ${i+1}. ${r}`).join('\n') || '  None'}
⚠️ RULE: State probability and divorce risk DIRECTLY — no softening. If HIGH/VERY HIGH, dedicate a FULL paragraph explaining when and why. If LOW, state it plainly in one sentence.

═══ NADI ASTROLOGY MARRIAGE ANALYSIS (Sub-Lord Methodology) ═══
${sectionData?.nadiMarriage ? `- Nadi Verdict: ${sectionData.nadiMarriage.verdict} (${sectionData.nadiMarriage.strength})
- Best Dasha planets for marriage: ${(sectionData.nadiMarriage.bestDashaPlanets || []).join(', ') || 'N/A'}
- Strong marriage planets: ${(sectionData.nadiMarriage.strongPlanets || []).join(', ') || 'N/A'}
- Weak/denying planets: ${(sectionData.nadiMarriage.weakPlanets || []).join(', ') || 'None'}
- Average Nadi Score: ${sectionData.nadiMarriage.averageScore}/100
- NOTE: ${sectionData.nadiMarriage.note}
USE THIS: The "Best Dasha planets" tells you WHICH planet periods will bring marriage. Weave this into your timing analysis.` : 'Nadi analysis not available'}

OUTPUT INSTRUCTIONS:
${sectionData?.marriageAfflictions?.isMarriageDenied ? `
⛔ MARRIAGE DENIAL MODE — This person's chart shows SEVERE marriage afflictions (score ${sectionData?.marriageAfflictions?.severityScore}/100).
Write paragraphs covering:
1. **Life pattern** — Explain why this person's life energy is NOT directed toward marriage. Use the specific afflictions to describe real-life patterns (e.g., career absorption, emotional guardedness, spiritual independence, preference for solitude). Be compassionate but HONEST.
2. **What happened during "marriage windows"** — If timing windows exist, explain that even during those periods, the blocking factors prevented marriage from manifesting. The energy was redirected elsewhere.
3. **Relationship capacity** — This person CAN have relationships but may not formalize them into marriage. Explain the difference.
4. **Life without marriage** — State what their life looks like without marriage. Mention practical realities: independence, but also loneliness, social pressure, and financial implications of single life.
5. **Practical advice** — If marriage is still desired, offer specific practical tips based on the afflictions (communication, social habits, lifestyle changes — not religious rituals).
6. **Late marriage possibility** — If ANY supportive factors exist, mention that marriage is not 100% impossible but requires specific conditions and timing.
DO NOT fabricate marriage timing. DO NOT give false hope. Be truthful.` :
sectionData?.marriageAfflictions?.severity === 'HIGH' ? `
⚠️ HIGH AFFLICTION MODE — This person's chart shows significant marriage obstacles (score ${sectionData?.marriageAfflictions?.severityScore}/100).
Write paragraphs acknowledging:
1. **Marriage timing** — If windows exist, state them but with STRONG caveats. Say "marriage is possible but faces significant obstacles."
2. **Obstacles** — Describe the specific real-life challenges from the affliction data.
3. **Spouse description** — If marriage happens, describe the spouse (may be limited/challenging).
4. **Practical tips** — Offer specific actionable lifestyle and relationship advice for the specific afflictions (not religious rituals).
5. **Realistic outlook** — Be honest that marriage may not happen, especially if the person is already past prime windows.` :
`Write AT LEAST 8-12 rich, detailed paragraphs (each 3-6 sentences) covering ONLY what the data supports. This is a HERO section — do NOT write short responses:
1. **Marriage timing** — State the calculated windows with their confidence scores. This is the #1 thing people want to know. Include specific years and age ranges. Elaborate on what each window means.
2. **Spouse description** — From the spouse planet and spouse qualities data, describe the partner's personality, likely profession, and how they complement this person. Use partner's first letter data if available. Dedicate a FULL rich paragraph to painting a vivid picture of the spouse.
3. **How they meet** — From the partnership lord placement, describe the likely circumstances of meeting (through work, family, travel, etc.) Paint a scenario.
4. **Marriage strength** — From the D9 analysis, state whether marriage is indicated as strong, moderate, or challenging. Be HONEST.
5. **Afflictions and challenges** — If affliction data exists, state the severity and specific issues. If Mars affliction is present, explain its real-life impact (arguments, dominance, passion).
6. **Impact on children** — From cross-reference data, how marriage dynamics affect family building
7. **Attachment style** — If childhood trauma or depression data exists, explain how it shapes their approach to love. This is deeply personal — write with empathy.
8. 🔥 **Second marriage & divorce risk** — State the probability DIRECTLY. If score >= 5, explain each indicator and what it means in real life. Include the specific triggers (which relationship patterns, which life periods). If divorce risk is HIGH, state WHEN it's most likely (from Dasha data). If LOW, state it in one clear sentence and move on.
9. **Practical advice** — Based on the SPECIFIC challenges identified in the data (not generic "communicate better"). Give actionable, specific steps.
⚠️ DO NOT write about daily married life, in-law dynamics, or decade-by-decade evolution here — that content belongs in the "විවාහ ජීවිතය (Your Married Life)" section.`}
Skip any area where the data is N/A.`,
    },

    marriedLife: {
      title: '🏠 විවාහ ජීවිතය — Your Married Life',
      prompt: `Write about the DAILY EXPERIENCE of married life — what happens AFTER marriage. This is NOT about timing, NOT about finding a partner, NOT about whether marriage happens (that was covered in the Love & Relationships section). Focus EXCLUSIVELY on: what married life FEELS like day-to-day, conflict patterns, intimacy, household management, power dynamics, in-law relationships, financial decisions as a couple, and how the marriage evolves over decades.

⚠️ THIS SECTION IS COMPLETELY DIFFERENT FROM "LOVE & RELATIONSHIPS":
- Love section = WHEN marriage happens, WHO the partner is, HOW they meet
- THIS section = What happens EVERY DAY after the wedding — the reality of living together

⚠️ CRITICAL AGE-AWARE FRAMING (Person is ${personAge || 'unknown'} years old):
${personAge && parseInt(personAge, 10) >= 25 ? `- This person is ${personAge} years old — they are likely ALREADY MARRIED
- Write in PRESENT/PAST TENSE: "In your married life, you experience..." NOT "When you marry, you will..."
- Describe what IS happening in their marriage, not what WILL happen
- If describing challenges, say "you may notice..." or "there could be patterns of..." — not definitive statements they can immediately disprove` : '- This person may not yet be married. Use future tense: "In your married life, you will likely experience..."'}

REMINDER: No astrology terms in output. No "7th house", "Venus placement", "Navamsha", "Darakaraka" etc. Describe everything as real-life relationship patterns. If Sinhala, write 100% pure Sinhala with zero English words.

Birth details: Born under ${lagnaEn} rising, Moon in ${moonEn}, Nakshatra: ${nakshatraName}
Current life period: ${currentDasha} main period, ${currentAD} sub-period
Person's age: ${personAge || 'unknown'}
Gender: ${extraContext.userGender || 'unknown'}

━━━ COMPLETE MARRIED LIFE ENGINE DATA (USE ALL — NO HALLUCINATION) ━━━

7TH HOUSE (MARRIAGE HOUSE) — PRIMARY MARRIAGE INDICATOR:
- Sign: ${sectionData?.seventhHouse?.rashiEnglish || 'N/A'} (${sectionData?.seventhHouse?.rashi || ''})
- Strength: ${sectionData?.seventhHouse?.strength || 'N/A'}
- Strength Score: ${sectionData?.seventhHouse?.strengthScore || 'N/A'}/100 — ${(sectionData?.seventhHouse?.strengthScore || 0) >= 65 ? 'STRONG marriage house = harmonious married life' : (sectionData?.seventhHouse?.strengthScore || 0) >= 45 ? 'MODERATE marriage house = mixed married life' : 'WEAK marriage house = married life faces challenges'}
- Ashtakavarga Bindus: ${sectionData?.seventhHouse?.ashtakavargaBindus || 'N/A'} (${sectionData?.seventhHouse?.ashtakavargaQuality || 'N/A'})
- Planets in 7th: ${(sectionData?.seventhHouse?.planetsInHouse || []).join(', ') || 'Empty — marriage dynamics depend on 7th lord'}
- Aspects on 7th: ${(sectionData?.seventhHouse?.aspectingPlanets || []).map(a => a.planet || a).join(', ') || 'None'}
- Benefic aspects: ${sectionData?.seventhHouse?.beneficAspectCount || 0}, Malefic aspects: ${sectionData?.seventhHouse?.maleficAspectCount || 0} — ${(sectionData?.seventhHouse?.beneficAspectCount || 0) > (sectionData?.seventhHouse?.maleficAspectCount || 0) ? 'More benefic = smoother married life' : (sectionData?.seventhHouse?.maleficAspectCount || 0) > (sectionData?.seventhHouse?.beneficAspectCount || 0) ? 'More malefic = friction in married life' : 'Balanced'}
- Bhava Chalit shifts: ${(sectionData?.seventhHouse?.chalitShifts || []).length > 0 ? sectionData.seventhHouse.chalitShifts.map(s => s.planet + ' shifts from house ' + s.wholeSignHouse + ' to ' + s.chalitHouse).join('; ') : 'None'}
- 7th Lord: ${sectionData?.seventhLord?.name || 'N/A'} in house ${sectionData?.seventhLord?.house || 'N/A'}
- 7th Lord Nature: ${sectionData?.seventhHouse?.lordNature || 'N/A'} — ${sectionData?.seventhHouse?.lordNature === 'malefic' ? 'Marriage lord is working AGAINST domestic harmony — extra effort needed' : sectionData?.seventhHouse?.lordNature === 'benefic' ? 'Marriage lord SUPPORTS domestic harmony' : 'Neutral'}

SPOUSE PERSONALITY (Darakaraka — soul-level spouse indicator):
${sectionData?.darakaraka ? `- Planet: ${sectionData.darakaraka.planet} in ${sectionData.darakaraka.rashi}
- Spouse Nature: ${sectionData.darakaraka.spouseNature}
→ THIS defines the spouse's CORE personality. Use this to describe daily interactions.` : 'Not available'}

UPAPADA LAGNA (how marriage APPEARS to others):
${sectionData?.upapadaLagna ? `- Sign: ${sectionData.upapadaLagna.rashi}
- Meaning: ${sectionData.upapadaLagna.meaning}` : 'Not available'}

SPOUSE QUALITIES (blended from all indicators — ALREADY PRIORITIZED):
${Array.isArray(sectionData?.spouseQualities) ? sectionData.spouseQualities.map((q, i) => `${i+1}. ${q}`).join('\n') : (sectionData?.spouseQualities || 'N/A')}

LOVE PLANET (Venus — romance and intimacy style):
- Venus in house: ${sectionData?.venus?.house || 'N/A'}
- Venus sign: ${sectionData?.venus?.rashi || 'N/A'}
- Venus in D9: ${sectionData?.venus?.navamshaRashi || 'N/A'}
→ Venus house = HOW they express love daily. Venus in 1st = affectionate, 4th = home-loving, 7th = partner-focused, 12th = bedroom passion

MARS AFFLICTION (Kuja Dosha — conflict energy):
- Present: ${sectionData?.kujaDosha?.present ? 'YES — Mars in house ' + sectionData.kujaDosha.marsHouse : 'NO'}
- Details: ${sectionData?.kujaDosha?.note || 'N/A'}
→ If present: Mars injects AGGRESSION into married life — arguments are heated, dominance struggles exist, but also PASSION

D9 NAVAMSHA (MARRIAGE SOUL CHART — THE TRUE married life picture):
- D9 Lagna: ${sectionData?.navamshaAnalysis?.d9LagnaSign || 'N/A'}
- Venus in D9: ${sectionData?.navamshaAnalysis?.venusInNavamsha || 'N/A'}
- D9 7th planets: ${(sectionData?.navamshaAnalysis?.d9SeventhPlanets || []).join(', ') || 'None'}
- Marriage Strength: ${sectionData?.navamshaAnalysis?.marriageStrength || 'N/A'}
- D9 7th Lord: ${sectionData?.navamshaAnalysis?.d9SeventhLordDisposition?.d9SeventhLord || 'N/A'} in D9 house ${sectionData?.navamshaAnalysis?.d9SeventhLordDisposition?.d9SeventhLordHouse || 'N/A'}
- In Kendra: ${sectionData?.navamshaAnalysis?.d9SeventhLordDisposition?.inKendra ? 'YES — STRONG marriage foundation at soul level' : 'No'}
- In Dusthana: ${sectionData?.navamshaAnalysis?.d9SeventhLordDisposition?.inDusthana ? 'YES — hidden soul-level marriage challenges' : 'No'}
- D9 Verdict: ${sectionData?.navamshaAnalysis?.d9SeventhLordDisposition?.marriageStrengthFromD9Lord || 'N/A'}
→ D9 is THE marriage chart. Marriage strength here = TRUE daily quality of married life

MARRIAGE AFFLICTIONS (from allSections — critical for married life quality):
- Severity: ${allSections?.marriage?.marriageAfflictions?.severity || 'NONE'} (Score: ${allSections?.marriage?.marriageAfflictions?.severityScore || 0}/100)
- Marriage Denied: ${allSections?.marriage?.marriageAfflictions?.isMarriageDenied ? '⛔ YES' : 'No'}
- Marriage Delayed: ${allSections?.marriage?.marriageAfflictions?.isMarriageDelayed ? '⚠️ YES' : 'No'}
- Likelihood: ${allSections?.marriage?.marriageAfflictions?.likelihood || 'N/A'}
- Specific afflictions: ${(allSections?.marriage?.marriageAfflictions?.afflictions || []).join(' | ') || 'None'}
- Detailed breakdown: ${(allSections?.marriage?.marriageAfflictions?.afflictionDetails || []).map(a => a.factor + ': ' + a.meaning).join(' | ') || 'None'}
- Supportive factors: ${(allSections?.marriage?.marriageAfflictions?.supportiveFactors || []).join(' | ') || 'None'}
- Summary: ${allSections?.marriage?.marriageAfflictions?.summary || 'N/A'}

━━━ IN-LAW RELATIONSHIP ENGINE DATA ━━━

4TH HOUSE (HOME & DOMESTIC LIFE):
- Strength Score: ${allSections?.realEstate?.fourthHouse?.strengthScore || allSections?.education?.fourthHouse?.strengthScore || 'N/A'}/100
- Planets in 4th: ${(allSections?.realEstate?.fourthHouse?.planetsInHouse || allSections?.education?.fourthHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- Malefics in 4th: ${(allSections?.realEstate?.fourthHouse?.maleficsIn || allSections?.education?.fourthHouse?.maleficsIn || []).join(', ') || 'None — domestic peace supported'}
- 4th Lord in house: ${allSections?.career?.homeLifeIndicators?.h4LordHouse || 'N/A'} ${allSections?.career?.homeLifeIndicators?.h4LordInDusthana ? '⚠️ (in difficult house — domestic friction likely)' : ''}
- Domestic Yogas: ${(allSections?.career?.homeLifeIndicators?.domesticYogas || []).join(' | ') || 'None'}
- Domestic Role: ${allSections?.career?.homeLifeIndicators?.domesticRole || 'N/A'}
- Home Narrative: ${allSections?.career?.homeLifeIndicators?.homeNarrative || 'N/A'}

IN-LAW CONFLICT INDICATORS:
- Saturn aspecting 7th: ${(sectionData?.seventhHouse?.aspectingPlanets || []).some(a => (a.planet || a) === 'Saturn') ? 'YES — cold, distant, or restrictive in-law dynamics' : 'No'}
- Rahu in 7th: ${(sectionData?.seventhHouse?.planetsInHouse || []).includes('Rahu') ? 'YES — unconventional in-laws, cultural/religious differences possible' : 'No'}
- Ketu in 7th: ${(sectionData?.seventhHouse?.planetsInHouse || []).includes('Ketu') ? 'YES — detachment from spouse family, spiritual disconnect with in-laws' : 'No'}
- Jupiter position: house ${allSections?.children?.jupiter?.house || sectionData?.venus?.house || 'N/A'} — ${(() => { const jh = allSections?.children?.jupiter?.house; return jh && [6,8,12].includes(jh) ? '⚠️ Jupiter in dusthana = in-law disputes, interference in marriage' : 'Jupiter not in difficult position for in-laws'; })()}
- Mother bond: ${allSections?.familyPortrait?.mother?.bond || 'N/A'} → shapes mother-in-law relationship
- Father bond: ${allSections?.familyPortrait?.father?.bond || 'N/A'} → shapes father-in-law relationship

━━━ CROSS-REFERENCE DATA FOR MARRIED LIFE DYNAMICS ━━━

PERSONALITY & ATTACHMENT:
- Retrograde Venus: ${(allSections?.personality?.retrogradePlanets || []).some(r => r.name === 'Venus') ? 'YES — past-life relationship karma, revisiting old patterns in marriage' : 'No'}
- Retrograde planets in 7th: ${(allSections?.personality?.retrogradePlanets || []).filter(r => r.house === 7).map(r => r.name + ' — delays/complications in partnership').join(', ') || 'None'}
- Attachment style: ${allSections?.surpriseInsights?.loveLanguage?.attachment || 'N/A'} — ${allSections?.surpriseInsights?.loveLanguage?.attachDetail || ''}
- Love language: ${allSections?.surpriseInsights?.loveLanguage?.primary || 'N/A'}
- Childhood trauma: ${allSections?.mentalHealth?.childhoodTrauma?.level || 'N/A'} (score: ${allSections?.mentalHealth?.childhoodTrauma?.score || 0}) — affects conflict patterns in marriage
- Depression risk: ${allSections?.mentalHealth?.depressionRisk?.level || 'N/A'} — affects emotional availability in marriage
- Anger style: ${allSections?.surpriseInsights?.emotionalStyle?.angerStyle || 'N/A'}
- Conflict style: ${allSections?.surpriseInsights?.emotionalStyle?.conflictStyle || 'N/A'}
- Social battery: ${allSections?.surpriseInsights?.dailyBehavior?.socialBattery || 'N/A'}
- Public vs Private contrast: ${allSections?.surpriseInsights?.publicVsPrivate?.contrastLevel || 'N/A'}

FINANCIAL DYNAMICS AS A COUPLE:
- Wealth strength: ${allSections?.career?.wealthStrength?.assessment || 'N/A'}
- Money personality: ${allSections?.surpriseInsights?.moneyPersonality?.archetype || 'N/A'} (impulse: ${allSections?.surpriseInsights?.moneyPersonality?.impulseScore || 'N/A'})
- Business vs Service: ${allSections?.career?.businessVsService || 'N/A'}

CHILDREN IMPACT ON MARRIAGE:
- Estimated children: ${allSections?.children?.estimatedChildren?.count || 'N/A'} (${allSections?.children?.estimatedChildren?.genderTendency || ''})
- First child predicted: ${allSections?.children?.childrenBirthYears?.children?.[0]?.predictedYears || 'N/A'}

━━━ SECOND MARRIAGE & DIVORCE — FULL DATA ━━━
- 🔥 SECOND MARRIAGE PROBABILITY: ${allSections?.surpriseInsights?.secondMarriage?.probability || 'N/A'}
- 🔥 DIVORCE RISK: ${allSections?.surpriseInsights?.secondMarriage?.divorceRisk || 'N/A'}
- Score: ${allSections?.surpriseInsights?.secondMarriage?.score || 0}/15
- Divorce sub-score: ${allSections?.surpriseInsights?.secondMarriage?.divorceScore || 0}/8
- 7th House Sign: ${allSections?.surpriseInsights?.secondMarriage?.h7Rashi || 'N/A'} ${allSections?.surpriseInsights?.secondMarriage?.isDualSign ? '(DUAL SIGN — multiple relationships indicated)' : ''}
- ALL Indicators:
${(allSections?.surpriseInsights?.secondMarriage?.reasons || []).map((r, i) => `  ${i+1}. ${r}`).join('\n') || '  None'}

MARRIAGE TIMING (for age-context):
- Best window: ${allSections?.marriage?.marriageTimingPrediction?.bestWindow ? allSections.marriage.marriageTimingPrediction.bestWindow.dateRange + ', Age ' + allSections.marriage.marriageTimingPrediction.bestWindow.ageRange : 'N/A'}

═══ NADI ASTROLOGY MARRIAGE ANALYSIS (Sub-Lord Methodology) ═══
${sectionData?.nadiMarriage ? `- Nadi Verdict: ${sectionData.nadiMarriage.verdict} (${sectionData.nadiMarriage.strength})
- Best Dasha planets for marriage: ${(sectionData.nadiMarriage.bestDashaPlanets || []).join(', ') || 'N/A'}
- Strong marriage planets: ${(sectionData.nadiMarriage.strongPlanets || []).join(', ') || 'N/A'}
- Weak/denying planets: ${(sectionData.nadiMarriage.weakPlanets || []).join(', ') || 'None'}
- Average Nadi Score: ${sectionData.nadiMarriage.averageScore}/100
- NOTE: ${sectionData.nadiMarriage.note}
USE THIS: Strong Nadi verdict = marriage is CONFIRMED at soul level → married life dynamics are more meaningful. Weak verdict = marriage itself is uncertain → write conditionally. Best Dasha planets indicate WHICH life periods bring HARMONY or CONFLICT in married life.` : 'Nadi marriage analysis not available'}

━━━ DASHA PERIODS (for decade-by-decade marriage evolution) ━━━
${allSections?.lifePredictions?.lifePhaseSummary ? allSections.lifePredictions.lifePhaseSummary.map(d => `${d.lord}: ${d.period} (${d.years}yr) — "${d.theme}"${d.chartTheme ? ' | ' + d.chartTheme : ''}${d.isCurrent ? ' ← NOW' : ''}`).join('\n') : 'Dasha timeline not available'}

━━━ HOW TO USE ALL THIS DATA ━━━

SPOUSE PERSONALITY FOR DAILY LIFE (follow this hierarchy):
1. Darakaraka spouseNature → THE core personality you live with daily (HIGHEST weight)
2. 7th house sign → STYLE and TONE of daily interactions
3. Upapada → how the marriage LOOKS to outsiders
4. D9 marriage strength → the DEEP TRUTH of married life quality
5. Affliction severity → the CHALLENGES you face

IN-LAW ANALYSIS (mandatory if data exists):
- 4th house weak + malefics = domestic friction including in-laws
- Mother bond "difficult"/"distant" → challenging mother-in-law dynamics
- Father bond → authority dynamics with father-in-law
- Rahu/Ketu on 1-7 axis = cultural/background differences with spouse's family
- Saturn aspecting 7th = cold or formal in-law relationships
- Jupiter in dusthana (6/8/12) = in-law interference in marriage decisions

CONFLICT PATTERN DERIVATION:
- Mars in 7th or Kuja Dosha = heated arguments, physical tension, dominance struggles
- Saturn influence = cold war, silent treatment, emotional distance
- Rahu influence = deception, misunderstandings, trust issues
- Ketu influence = spiritual disconnect, feeling like strangers
- Anger style + conflict style data = HOW arguments actually play out

⚠️ CRITICAL AGE AWARENESS:
- If marriage afflictions severity is SEVERE or Marriage Denied = YES: DO NOT assume they are married. Write conditionally: "If you were to marry..." Frame as hypothetical.
- If under 24: Future tense — "Your married life WILL look like..."
- If 24-35 AND denial NONE/MILD: Mix — "If you're already married..." / "When you marry..."
- If 35+ AND denial NONE/MILD: ASSUME married. Write about CURRENT daily dynamics.
- If 35+ AND denial MODERATE+: Write conditionally.

⚠️ ${sectionData?.lagnaCuspWarning?.isNearCusp ? `BIRTH TIME SENSITIVITY: Lagna at ${sectionData.lagnaCuspWarning.degreeInSign}° — near sign boundary. Married life predictions may vary.` : ''}

OUTPUT — Write AT LEAST 10-14 rich, detailed paragraphs (each 3-6 sentences). This is a HERO section. Cover:
1. 🏠 **Daily routine together** — Morning dynamics, evening patterns, weekend routines. Who wakes first? Who handles what? How do they spend evenings together? Use 7th house sign + Darakaraka to paint this picture.
2. 💬 **Communication patterns** — How do they talk? Deep conversations or surface-level? Who initiates? Use attachment style + love language data. Are they emotionally open or guarded?
3. ⚔️ **Conflict and arguments** — HOW they fight (from anger style + Mars data). What triggers arguments? How long do they last? Who apologizes first? Who holds grudges? If Kuja Dosha present, describe the HEAT and INTENSITY.
4. 💕 **Intimacy and emotional connection** — Physical and emotional intimacy quality from Venus data + D9. Is there passion, tenderness, or distance? How does intimacy change over years?
5. 🏡 **Household management and power dynamics** — Who manages money? Who makes big decisions? Who handles daily tasks? From domestic role data + money personality. Is there equality or one-sided control?
6. 👨‍👩‍👧 **In-law relationships** — DETAILED: Mother-in-law dynamics (from mother bond data), father-in-law (from father bond), living arrangements (together or separate?), interference level, cultural friction if Rahu involved. Will in-laws SUPPORT or STRAIN the marriage?
7. 💰 **Financial decisions as a couple** — Saving vs spending, joint accounts vs separate, financial stress periods from risk data. Who earns more? Does that create tension?
8. 👶 **How children change the marriage** — From children data: when first child comes, how parenting shifts dynamics, added stress or bonding.
9. 📅 **Decade-by-decade evolution** — Use Dasha periods to map how the marriage changes: the honeymoon phase, the adjustment years, the challenging middle period, the mature companionship phase. Which specific year ranges bring closeness and which bring distance?
10. 🔮 **Separation or distance risks** — If divorce risk data is HIGH, describe the vulnerable periods. If separation planets are active, describe when distance may occur. Be honest but constructive.
11. 💪 **Practical advice for a better marriage** — Based on the SPECIFIC challenges identified. NOT generic. If conflict is the issue, give conflict-specific tips. If intimacy is weak, give intimacy tips. If in-laws are the problem, give boundary-setting advice.

REMINDER: Plain language — avoid technical chart jargon.
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English or Tamil word. දෙමළ (Tamil) අකුරු හෝ වචන කිසිසේත් භාවිතා නොකරන්න.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish (Sinhala words in English letters).' : 'Write in warm, honest, relatable English.'}`,
    },

    career: {
      title: '💼 Your Career & Money Path',
      prompt: `Translate the following career engine data into a FOCUSED, specific career and wealth assessment. You MUST pick the 2-3 MOST relevant career paths from the ranked data and explain WHY they fit — do NOT list every possible career. Be specific and on-point.

REMINDER: No astrology terms. No "10th house", "2nd lord", "Dhana Yoga", "Dashamsha", "Amatyakaraka" etc. Describe career insights as real-world experiences. If Sinhala, write 100% pure Sinhala — zero English words.

━━━ AGE-AWARE CAREER/WEALTH PREDICTIONS ━━━
Current Age: ${personAge || 'Unknown'} years old
Current Year: ${new Date().getFullYear()}
Birth Year: ${bd?.birthDateStr ? new Date(bd.birthDateStr).getFullYear() : 'Unknown'}
Max Prediction Year: ${bd?.birthDateStr ? new Date(bd.birthDateStr).getFullYear() + 75 : new Date().getFullYear() + 30}

⚠️ CRITICAL TIMING RULES:
- NEVER predict wealth/career events beyond age 75. No "you will be rich in 2099".
- For career predictions, focus on ages 22-65 (working life).
- For wealth predictions, focus on the NEXT 10-20 years from current age.
- If dasha periods extend beyond age 75, DO NOT mention those years specifically.
- ${personAge >= 25 ? `This person is ${personAge} — they are likely ALREADY WORKING. Frame career advice as "your chart supports..." not "you will become..."` : 'This person may be starting their career or still studying.'}
- ${personAge >= 40 ? `At age ${personAge}, focus on career CONSOLIDATION and wealth PRESERVATION, not "you will start..." predictions.` : ''}
- ${personAge >= 55 ? `At age ${personAge}, focus on retirement planning, legacy, and health-wealth balance. Do NOT predict major career changes.` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━ CAREER ENGINE DATA ━━━

CAREER SECTOR:
- Sign: ${sectionData?.tenthHouse?.rashiEnglish || 'N/A'}
- Career sign tone: ${sectionData?.careerSignFlavor || 'N/A'} — use this to FLAVOR the career narrative
- Strength: ${sectionData?.tenthHouse?.strength || 'N/A'}
- Strength Score: ${sectionData?.tenthHouse?.strengthScore || 'N/A'}/100 — ${(sectionData?.tenthHouse?.strengthScore || 0) >= 70 ? 'POWERFUL career sector — natural ability to rise to the top' : (sectionData?.tenthHouse?.strengthScore || 0) >= 50 ? 'SOLID career sector — steady professional growth' : 'CHALLENGED career sector — success requires extra effort and persistence'}
- Ashtakavarga Bindus: ${sectionData?.tenthHouse?.ashtakavargaBindus || 'N/A'} (${sectionData?.tenthHouse?.ashtakavargaQuality || 'N/A'})
- Benefic/Malefic aspects: ${sectionData?.tenthHouse?.beneficAspectCount || 0} benefic / ${sectionData?.tenthHouse?.maleficAspectCount || 0} malefic
- Bhava Chalit shifts: ${(sectionData?.tenthHouse?.chalitShifts || []).length > 0 ? sectionData.tenthHouse.chalitShifts.map(s => s.planet + ' shifts to house ' + s.chalitHouse + ' — career energy redirected').join('; ') : 'None'}
- Planets in career sector: ${(sectionData?.tenthHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- Aspects on career sector: ${(sectionData?.tenthHouse?.aspectingPlanets || []).map(a => a.planet || a).join(', ') || 'None'}
- Career Lord: ${sectionData?.tenthLord?.name || 'N/A'} in house ${sectionData?.tenthLord?.house || 'N/A'}

⭐ CAREER PLANET RANKING (sorted by influence — use this order):
${(sectionData?.careerPlanetRanking || []).map((r, i) => `  ${i + 1}. ${r}`).join('\n') || 'N/A'}

⭐ PRIMARY CAREERS (TOP PICKS — focus your narrative on these):
${(sectionData?.primaryCareers || []).map((c, i) => `  ${i + 1}. ${c}`).join('\n') || (sectionData?.suggestedCareers || []).slice(0, 3).join(', ') || 'N/A'}

${(sectionData?.secondaryCareers || []).length > 0 ? `SECONDARY CAREERS (mention briefly as alternatives):
${sectionData.secondaryCareers.map((c, i) => `  ${i + 1}. ${c}`).join('\n')}` : ''}

WEALTH SECTOR:
- Sign: ${sectionData?.secondHouse?.rashiEnglish || 'N/A'}
- Strength: ${sectionData?.secondHouse?.strength || 'N/A'}
- Strength Score: ${sectionData?.secondHouse?.strengthScore || 'N/A'}/100
- Ashtakavarga Bindus: ${sectionData?.secondHouse?.ashtakavargaBindus || 'N/A'} (${sectionData?.secondHouse?.ashtakavargaQuality || 'N/A'})
- Planets: ${(sectionData?.secondHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- Lord house: ${sectionData?.secondHouse?.lordHouse || 'N/A'}

INCOME/GAINS SECTOR:
- Sign: ${sectionData?.eleventhHouse?.rashiEnglish || 'N/A'}
- Strength: ${sectionData?.eleventhHouse?.strength || 'N/A'}
- Strength Score: ${sectionData?.eleventhHouse?.strengthScore || 'N/A'}/100
- Ashtakavarga Bindus: ${sectionData?.eleventhHouse?.ashtakavargaBindus || 'N/A'} (${sectionData?.eleventhHouse?.ashtakavargaQuality || 'N/A'})
- Planets: ${(sectionData?.eleventhHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- Lord house: ${sectionData?.eleventhHouse?.lordHouse || 'N/A'}

WEALTH COMBINATIONS: ${(sectionData?.dhanaYogas || []).join(' | ') || 'None detected'}
WEALTH STRENGTH: ${sectionData?.wealthStrength ? `Savings: ${sectionData.wealthStrength.house2Bindus}, Income: ${sectionData.wealthStrength.house11Bindus} — ${sectionData.wealthStrength.assessment}` : 'N/A'}
BUSINESS VS SERVICE: ${sectionData?.businessVsService || 'N/A'}

Rising sign: ${lagnaEn}, Moon: ${moonEn}

CAREER DEPTH DATA:
- Career Chart (D10): ${sectionData?.dashamsha ? `D10 Lagna: ${sectionData.dashamsha.d10Lagna}, Sun in D10: ${sectionData.dashamsha.d10Sun}, Saturn in D10: ${sectionData.dashamsha.d10Saturn}, Career Lord in D10: ${sectionData.dashamsha.d10TenthLord}` : 'Not available'}
- Career Significator: ${sectionData?.amatyakaraka ? `${sectionData.amatyakaraka.planet} in ${sectionData.amatyakaraka.rashi} — ${sectionData.amatyakaraka.meaning}` : 'Not available'}
- Career Lord Strength: ${sectionData?.tenthLordShadbala ? `${sectionData.tenthLordShadbala.totalRupas} Rupas (${sectionData.tenthLordShadbala.percentage}%) — ${sectionData.tenthLordShadbala.strength}. Strongest aspect: ${sectionData.tenthLordShadbala.strongestComponent}` : 'Not available'}
${sectionData?.lagnaCuspWarning?.isNearCusp ? `⚠️ BIRTH TIME SENSITIVITY: Near sign boundary. Career predictions may vary if birth time is slightly off.` : ''}

═══ NADI ASTROLOGY CAREER ANALYSIS (Sub-Lord Methodology) ═══
${sectionData?.nadiCareer ? `- Service/Job Verdict: ${sectionData.nadiCareer.serviceVerdict} (${sectionData.nadiCareer.serviceStrength})
- Business Verdict: ${sectionData.nadiCareer.businessVerdict} (${sectionData.nadiCareer.businessStrength})
- Nadi Career Type: ${sectionData.nadiCareer.careerType?.type} (Confidence: ${sectionData.nadiCareer.careerType?.confidence})
- Career Sectors: ${(sectionData.nadiCareer.careerSectors || []).map(s => s.planet + '→' + s.sector).join(', ') || 'N/A'}
- Best Dasha for career: ${(sectionData.nadiCareer.bestDashaPlanets || []).join(', ') || 'N/A'}
- Wealth Verdict: ${sectionData.nadiCareer.wealthVerdict}
- Windfall/Unearned income: ${sectionData.nadiCareer.windfallVerdict}
USE THIS: Service vs Business verdicts tell you definitively whether this person should pursue employment or entrepreneurship. Career sectors narrow down the INDUSTRY.` : 'Nadi career analysis not available'}

HOME & DOMESTIC INDICATORS:
- Home lord: ${sectionData?.homeLifeIndicators?.h4Lord} in house ${sectionData?.homeLifeIndicators?.h4LordHouse}${sectionData?.homeLifeIndicators?.h4LordInDusthana ? ' (difficult placement)' : ''}
- Planets in home sector: ${(sectionData?.homeLifeIndicators?.h4PlanetsAll || []).join(', ') || 'None'}
- Career sector empty: ${sectionData?.homeLifeIndicators?.h10Empty ? 'YES' : 'No'}
- Emotional isolation: ${sectionData?.homeLifeIndicators?.kemadrumaPresent ? 'YES' : 'No'}
- Domestic patterns: ${(sectionData?.homeLifeIndicators?.domesticYogas || []).join(' | ') || 'None detected'}
- DOMESTIC ROLE: ${sectionData?.homeLifeIndicators?.domesticRole} (PRIMARY = homemaker path; SECONDARY = balanced; NONE = career-dominant)
- Home narrative: ${sectionData?.homeLifeIndicators?.homeNarrative || 'Not available'}

⛔ MANDATORY EDUCATION↔CAREER CONSISTENCY CHECK:
- Education suggested fields: ${(allSections?.education?.suggestedFields || []).join(', ') || 'N/A'}
- Nadi education fields: ${(allSections?.education?.nadiEducation?.suggestedFields || []).slice(0, 8).join(', ') || 'N/A'}
- Education→Career alignment from core themes: (see CORE THEMES above — "Education→Career Alignment" field)
⚠️ YOUR CAREER NARRATIVE MUST LOGICALLY CONNECT TO THE EDUCATION DATA. If the education engine says "Medicine, biology" you CANNOT say "IT programmer" for career unless you explicitly explain the bridge (e.g., "health-tech", "medical informatics", "biotech software"). The career path must be a NATURAL EXTENSION of the education background. If they truly diverge, acknowledge the career pivot explicitly.

CROSS-REFERENCE DATA (for richer career narrative):
- Education strength: ${allSections?.education?.academicStrength || 'N/A'}
- Education fields: ${(allSections?.education?.suggestedFields || []).join(', ') || 'N/A'}
- Foreign travel likelihood: ${allSections?.foreignTravel?.foreignLikelihood || 'N/A'}
- Foreign settlement: ${allSections?.foreignTravel?.settlementAbroad ? 'Yes — likely to settle abroad' : 'N/A'}
- Current life phase: ${currentDasha} main / ${currentAD} sub
- Life phase effects on career: ${allSections?.lifePredictions?.currentDasha?.effects?.career || 'N/A'}
- Marriage afflictions: ${allSections?.marriage?.marriageAfflictions?.severity || 'N/A'} (impacts work-life balance if SEVERE)
- Financial risk periods: ${(allSections?.financial?.losses?.riskPeriods || []).slice(0, 3).map(p => p.lord + ': ' + p.period + ' — ' + p.reason).join(' | ') || 'None'}
- Retrograde planets affecting career: ${(allSections?.personality?.retrogradePlanets || []).filter(r => [1, 2, 6, 7, 10, 11].includes(r.house)).map(r => r.name + ' (house ' + r.house + ')').join(', ') || 'None'}

${sectionData?.homeLifeIndicators?.domesticRole === 'PRIMARY' ? `
DOMESTIC ROLE DETECTED — write about homemaking as their primary career path:
- Describe the domestic role based on the data (home narrative, domestic patterns)
- If emotional isolation is YES, acknowledge it
- Identify the next life phase window when they could redirect energy outward
- Suggest practical options based on their chart strengths
` : ''}

━━━ CRITICAL RULES FOR CAREER OUTPUT ━━━

🚫 DO NOT list 5+ career options like a menu. This is NOT a career fair brochure.
✅ DO pick the TOP 2-3 careers from PRIMARY CAREERS and build a FOCUSED narrative.
✅ DO explain WHY each career fits — connect it to the career sign tone, planet ranking, and career depth data.
✅ DO mention 1-2 secondary careers briefly as alternatives, not as equal options.
✅ DO use the career planet ranking to determine which career direction is STRONGEST.
✅ DO consider the person's current life phase (dasha) and education background to make the advice RELEVANT.
✅ DO pay special attention to Venus/Moon/Mercury indicators — if Venus is prominent (in career house, aspecting 10th, strong in career planet ranking), creative/artistic careers like graphic design, visual arts, photography, fashion, interior design MUST be mentioned prominently. Do NOT ignore artistic/design careers when Venus is a top career planet.
✅ DO check for Mercury+Venus combinations — these strongly indicate design, communication design, advertising, UX/UI, or digital art careers.

- Business vs service → state directly whether self-employment or employment suits them better
- Career significator → describes their professional calling
- D10 data → the professional self (may differ from general personality)
- Career lord strength → gauges career success potential
- Wealth combinations → explain what kind of wealth-building the data indicates
- Wealth strength assessment → overall financial capacity
- Education cross-reference → connect their academic strengths to career suitability
- Foreign travel → if likely, discuss international career opportunities
- Financial risk periods → warn about specific years to be cautious
- Retrograde planets in career houses → these create UNCONVENTIONAL career paths (freelancing, career changes, going against the norm)

⚠️ AGE-AWARE CAREER ADVICE:
- If under 22: Focus on education choices and career direction from the data
- If 22-30: Focus on career launch, first job success indicators, and early growth periods. Be specific about WHICH field to enter.
- If 30-45: Focus on peak earning periods, promotions, business opportunities. They are already in a career — advise on advancement.
- If 45+: Focus on career legacy, post-retirement activities, wealth preservation

${sectionData?.homeLifeIndicators?.domesticRole !== 'PRIMARY' ? `OUTPUT STRUCTURE:
1. Their CORE career direction (1-2 sentences, the single strongest career path)
2. Why this specific path fits them (connect sign tone + planet strengths + education)
3. Alternative career option (1 sentence, the secondary path)
4. Peak earning period and growth trajectory
5. Business vs service verdict with reasoning
6. Foreign career opportunities if travel data supports it
7. Financial caution periods
8. Late career/retirement outlook` : `OUTPUT — for domestic role:
- Describe the domestic role and its challenges from the data
- Identify the time window for redirecting energy outward
- Suggest practical options based on chart strengths`}`,
    },

    children: {
      title: '👶 Children & Family Life',
      prompt: `Translate the following children engine data into a clear, honest assessment. State the estimated count and gender tendency directly. State timing windows from the data. Be honest about fertility challenges if indicated.

REMINDER: No astrology terms. No "5th house", "Jupiter placement", "Putra Bhava", "Saptamsha", "Putrakaraka" etc. If Sinhala, write 100% pure Sinhala — zero English words.

━━━ CHILDREN ENGINE DATA ━━━

CHILDREN SECTOR:
- Sign: ${sectionData?.fifthHouse?.rashiEnglish || 'N/A'}
- Strength: ${sectionData?.fifthHouse?.strength || 'N/A'}
- Strength Score: ${sectionData?.fifthHouse?.strengthScore || 'N/A'}/100
- Ashtakavarga Bindus: ${sectionData?.fifthHouse?.ashtakavargaBindus || 'N/A'} (${sectionData?.fifthHouse?.ashtakavargaQuality || 'N/A'}) — ${(sectionData?.fifthHouse?.ashtakavargaBindus || 0) >= 28 ? 'HIGH bindus = fertility and children are well-supported' : 'Standard fertility indications'}
- Bhava Chalit shifts: ${(sectionData?.fifthHouse?.chalitShifts || []).length > 0 ? sectionData.fifthHouse.chalitShifts.map(s => s.planet + ' shifts from house ' + s.wholeSignHouse + ' to ' + s.chalitHouse).join('; ') : 'None — children sector is straightforward'}
- Planets: ${(sectionData?.fifthHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- Aspects: ${(sectionData?.fifthHouse?.aspectingPlanets || []).map(a => a.planet || a).join(', ') || 'None'}
- Lord: ${sectionData?.fifthLord?.name || 'N/A'} in house ${sectionData?.fifthLord?.house || 'N/A'}

FERTILITY INDICATOR: House ${sectionData?.jupiter?.house || 'N/A'}
  → ${sectionData?.jupiter?.note || ''}

ENGINE ASSESSMENT: ${sectionData?.assessment || 'N/A'}

CHILDREN TIMING PERIODS: ${(sectionData?.childrenTimingDasas || []).join(' | ') || 'N/A'}

CHILDREN CHART (D7): ${sectionData?.saptamsha ? `D7 Lagna: ${sectionData.saptamsha.d7Lagna}, Jupiter in D7: ${sectionData.saptamsha.d7Jupiter}, 5th Lord in D7: ${sectionData.saptamsha.d7FifthLord}` : 'Not available'}

CHILDREN SIGNIFICATOR: ${sectionData?.putrakaraka ? `${sectionData.putrakaraka.planet} in ${sectionData.putrakaraka.rashi} — ${sectionData.putrakaraka.meaning}` : 'Not available'}

FERTILITY STRENGTH: ${sectionData?.jupiterShadbala ? `${sectionData.jupiterShadbala.percentage}% — ${sectionData.jupiterShadbala.strength} (${sectionData.jupiterShadbala.totalRupas} Rupas)` : 'Not available'}

ESTIMATED CHILDREN:
- Count: ${sectionData?.estimatedChildren?.count || 'N/A'}
- Gender tendency: ${sectionData?.estimatedChildren?.genderTendency || 'N/A'}
- Multi-factor score: ${sectionData?.estimatedChildren?.score || 'N/A'}
- Scoring: ${sectionData?.estimatedChildren?.note || 'N/A'}
- Fertility reduced: ${sectionData?.estimatedChildren?.jupiterDebilitated ? 'YES — fertility indicator is weakened, may need medical support or timing awareness' : 'No — fertility indicator is functional'}
- Marriage denial impact on children: ${sectionData?.estimatedChildren?.marriageDenialImpact || 'None — marriage is supported'}

🔥 PREDICTED BIRTH YEARS FOR EACH CHILD:
${sectionData?.childrenBirthYears?.children?.length > 0 ? sectionData.childrenBirthYears.children.map(c => `- ${c.childNumber} Child: ${c.gender} — Predicted birth years: ${c.predictedYears} (Peak: ${c.peakYear}) — Parent age: ${c.parentAge} — Confidence: ${c.confidence}\n  Reason: ${c.reason}`).join('\n') : 'No specific birth year windows could be calculated'}
- Marriage year used as baseline: ${sectionData?.childrenBirthYears?.marriageYearUsed || 'N/A'}
- ${sectionData?.childrenBirthYears?.note || ''}
⚠️ IMPORTANT: Present birth year predictions with authority — "Your first child is most likely to be born around [year], when you are [age]." People LOVE specific year predictions. Use the peak year for the most precise statement.

🔥 CHILDREN'S EDUCATION & CAREER PATHS:
- Academic Potential: ${sectionData?.childrenEducation?.academicLevel || 'N/A'}
- Academic Score: ${sectionData?.childrenEducation?.academicScore || 0}/7
- Suggested Study Fields: ${(sectionData?.childrenEducation?.suggestedFields || []).join(', ') || 'N/A'}
- Primary Planetary Influence: ${sectionData?.childrenEducation?.primaryInfluence || 'N/A'}
- Putrakaraka Planet: ${sectionData?.childrenEducation?.putrakarakaPlanet || 'N/A'}
- Learning Styles:
${(sectionData?.childrenEducation?.learningStyles || []).map(s => `  → ${s}`).join('\n') || '  N/A'}
- Foreign Education: ${sectionData?.childrenEducation?.foreignEducation || 'N/A'}
- Academic Struggles/Challenges:
${(sectionData?.childrenEducation?.struggles || []).map(s => `  ⚠️ ${s}`).join('\n') || '  None flagged'}
- D7 Jupiter Position: ${sectionData?.childrenEducation?.d7JupiterRashi || 'N/A'}
⚠️ IMPORTANT: Children's education is highly shareable content. Parents want to know WHAT their children should study, what careers suit them, and how they learn. Be specific — "Your child is naturally inclined toward [field] and will thrive in [learning environment]."

MARRIAGE AFFLICTIONS (affects children):
${allSections?.marriage?.marriageAfflictions ? `Severity: ${allSections.marriage.marriageAfflictions.severity} (Score: ${allSections.marriage.marriageAfflictions.severityScore}/100)\nMarriage Denied: ${allSections.marriage.marriageAfflictions.isMarriageDenied ? '⛔ YES — CHILDREN THROUGH MARRIAGE VERY UNLIKELY' : 'No'}\nIssues: ${(allSections.marriage.marriageAfflictions.afflictions || []).join(' | ')}` : 'N/A'}

═══ NADI ASTROLOGY CHILDREN ANALYSIS (Sub-Lord Methodology) ═══
${sectionData?.nadiChildren ? `- Nadi Verdict: ${sectionData.nadiChildren.verdict} (${sectionData.nadiChildren.strength})
- Best Dasha planets for children: ${(sectionData.nadiChildren.bestDashaPlanets || []).join(', ') || 'N/A'}
- Strong children planets: ${(sectionData.nadiChildren.strongPlanets || []).join(', ') || 'N/A'}
- Average Nadi Score: ${sectionData.nadiChildren.averageScore}/100
- NOTE: ${sectionData.nadiChildren.note}
USE THIS: Nadi methodology determines children timing through DBA of planets signifying houses 2,5,11. Sub-Lord of 5th cusp determines if children are PROMISED or DENIED. Use "Best Dasha planets" to refine timing predictions.` : 'Nadi children analysis not available'}

━━━ DATA USAGE RULES ━━━
- Estimated count → state this number directly
- Gender tendency → state directly
- Children sector strength → quality of relationship with children
- Fertility strength → fertility capacity
- D7 chart → confirms or adjusts the primary reading
- Children significator → personality of the children
- Timing periods → WHEN children arrive (give specific years from the data)
- Marriage denial impact → CRITICAL: If marriage is DENIED (SEVERE), do NOT predict children through marriage as if they will definitely happen. Instead:
  • If marriage denied AND person is 35+: State honestly that children are unlikely due to unmarried status
  • If marriage denied AND person is under 35: Say children are possible but depend on whether marriage obstacles are overcome
  • You CAN still describe what their children WOULD be like IF they had them
- If marriage afflictions are SEVERE but not denied → note impact on children timing and quality

CROSS-REFERENCE DATA (for richer children narrative):
- Marriage timing: ${allSections?.marriage?.marriageTimingPrediction?.bestWindow?.dateRange || 'N/A'} (children come AFTER marriage in most cases)
- Marriage afflictions: ${allSections?.marriage?.marriageAfflictions?.severity || 'N/A'} (${allSections?.marriage?.marriageAfflictions?.severityScore || 0}/100 — if SEVERE, children may be delayed or affected. If marriage DENIED, children through marriage very unlikely)
- Marriage score: ${allSections?.marriage?.seventhHouse?.strengthScore || 'N/A'}/100 — children score CANNOT be more optimistic than marriage score. If marriage is 50/100, do NOT write an enthusiastic children section.
- Cross-validation adjustments: ${(sectionData?._crossValidation || []).map(a => `${a.from}→${a.to}: ${a.reason}`).join('; ') || 'None — scores are consistent'}
- Mother profile: ${allSections?.surpriseInsights?.motherProfile ? allSections.surpriseInsights.motherProfile.substring(0, 100) : 'N/A'} (parenting style influenced by own upbringing)
- Childhood trauma: ${allSections?.mentalHealth?.childhoodTrauma?.level || 'N/A'} (if HIGH/SEVERE, person may be extra protective or struggle with parenting)
- Health: fertility-related organ risks: ${(allSections?.health?.organRisks || []).filter(o => (o.organ || '').toLowerCase().includes('reprod')).map(o => o.organ + ': ' + o.risk).join(', ') || 'None flagged'}
- Career domestic role: ${allSections?.career?.homeLifeIndicators?.domesticRole || 'N/A'}
- Current life phase: ${currentDasha} main / ${currentAD} sub

OUTPUT INSTRUCTIONS:
${allSections?.marriage?.marriageAfflictions?.isMarriageDenied ? `
⛔ MARRIAGE DENIED — This person's chart shows marriage is very unlikely (denial score ${allSections.marriage.marriageAfflictions.severityScore}/100).
Children through marriage are therefore VERY UNLIKELY. Write about:
1. **Fertility capacity** — what the 5th house data shows about their BIOLOGICAL ability (separate from marriage)
2. **What children would be like** — IF they had children, describe the nature from the significator data (use conditional language: "If you were to have children...")
3. **Alternative paths** — nieces/nephews, mentoring, teaching, adoption possibilities
4. **Relationship with younger people** — from the 5th house data, how they connect with youth
5. **Creative expression** — 5th house also governs creativity, hobbies, self-expression (discuss this instead)
DO NOT predict children timing as though they will definitely happen.` :
allSections?.marriage?.marriageAfflictions?.severity === 'HIGH' ? `
⚠️ HIGH MARRIAGE AFFLICTION — Marriage faces significant obstacles (score ${allSections.marriage.marriageAfflictions.severityScore}/100).
Children through marriage are UNLIKELY but not impossible. Write about:
1. **Estimated children** — state the reduced count from the data but add caveats about marriage obstacles
2. **What children would be like** — describe nature from significator data, but use cautious language
3. **Fertility capacity** — biological ability separate from marital status
4. **Timing** — IF marriage happens, when children might follow. Use "if marriage occurs..." framing
5. **Alternative paths** — mention mentoring, creative expression as 5th house alternatives
Be honest about the marriage obstacles affecting children prospects.` :
`Write AT LEAST 12-16 rich, detailed paragraphs (each 3-6 sentences) covering ONLY what the data supports. This is a HERO section — dedicate a full paragraph to each point:
1. **Estimated number of children** — state the count and gender tendency from the data with confidence. Explain what this means for their family life.
2. 🔥 **Birth year predictions** — For EACH predicted child, state: "Your [1st/2nd/3rd] child (likely a [son/daughter]) is predicted to be born around [peak year], when you are approximately [age]." This is the #1 question parents/future parents ask — DELIVER WITH AUTHORITY. Use the peak year for maximum precision.
3. **Children's nature** — from the significator data, describe children's likely temperament, talents, and personality. Paint a vivid picture of what these children will be like.
4. 🔥 **Children's education & career** — What subjects should their children study? What careers suit them? State the suggested fields clearly. Describe the learning style — how do their children learn best? Are they quick learners or late bloomers? Will they study abroad? This is EXTREMELY valuable for parents planning their children's future.
5. 🔥 **Academic potential** — Will their children excel academically? Top of the class or average? Will they pursue higher education, postgraduate studies, or practical vocational training? State the academic level with confidence.
6. **Fertility assessment** — from the strength data, state fertility outlook DIRECTLY. If weak, say "fertility faces challenges" plainly. Reference organ risk if relevant.
7. **Relationship with children** — from the sector strength data + childhood trauma cross-reference. How will they bond with their children?
8. **Impact of marriage dynamics** — if marriage affliction data shows severity, note the effect on family
9. **Parenting style** — from the person's own personality + childhood experience data. What kind of parent will they be?
10. 🔥 **Educational challenges** — If any struggles are flagged, describe what academic difficulties children may face and how to address them. Early intervention advice.`}
Skip any area where data is N/A.`,
    },

    lifePredictions: {
      title: '🔮 Your Life Journey — Past, Present & Future',
      prompt: `Translate the following life phase data into a clear timeline. For each phase, state the dates, theme, and real-life effects from the data. Focus on the CURRENT phase and the NEXT 2-3 upcoming phases.

REMINDER: No astrology terms. No "Dasha", "Mahadasha", "Antardasha" etc. Describe life phases as real events. If Sinhala, write 100% pure Sinhala — zero English words.

━━━ LIFE PHASES ENGINE DATA ━━━

CURRENT LIFE PHASE:
- Main Period Lord: ${sectionData?.currentDasha?.lord || 'N/A'}
- Main Period: ${sectionData?.currentDasha?.period || 'N/A'}
- Main Period Effects: ${typeof sectionData?.currentDasha?.effects === 'object' ? `General: ${sectionData.currentDasha.effects.general || 'N/A'}, Career: ${sectionData.currentDasha.effects.career || 'N/A'}, Health: ${sectionData.currentDasha.effects.health || 'N/A'}, Relationship: ${sectionData.currentDasha.effects.relationship || 'N/A'}` : (sectionData?.currentDasha?.effects || 'N/A')}
- CHART-SPECIFIC DASHA ANALYSIS:
  → Houses ruled: ${sectionData?.currentDasha?.chartSpecificEffects?.ruledHouses?.join(', ') || 'N/A'}
  → Sits in house: ${sectionData?.currentDasha?.chartSpecificEffects?.lordHouse || 'N/A'}
  → Functional nature for this person: ${sectionData?.currentDasha?.chartSpecificEffects?.functionalNature || 'N/A'}
  → Strength: ${sectionData?.currentDasha?.chartSpecificEffects?.lordStrength || 'N/A'}%
  → Is retrograde: ${sectionData?.currentDasha?.chartSpecificEffects?.isRetrograde ? 'YES — internalized, past-life karma activated' : 'No'}
  → Life areas activated: ${(sectionData?.currentDasha?.chartSpecificEffects?.houseThemes || []).join(', ') || 'N/A'}
  → ENGINE VERDICT: ${sectionData?.currentDasha?.chartSpecificEffects?.summary || 'N/A'}
- Sub-Period Lord: ${sectionData?.currentAntardasha?.lord || 'N/A'}
- Sub-Period: ${sectionData?.currentAntardasha?.period || 'N/A'}
- Sub-Period Chart Analysis:
  → Houses ruled: ${sectionData?.currentAntardasha?.chartSpecificEffects?.ruledHouses?.join(', ') || 'N/A'}
  → Sits in house: ${sectionData?.currentAntardasha?.chartSpecificEffects?.lordHouse || 'N/A'}
  → Functional nature: ${sectionData?.currentAntardasha?.chartSpecificEffects?.functionalNature || 'N/A'}
  → ENGINE VERDICT: ${sectionData?.currentAntardasha?.chartSpecificEffects?.summary || 'N/A'}

NEXT MAJOR LIFE PHASE:
- Lord: ${sectionData?.nextDasha?.lord || 'N/A'}
- Period: ${sectionData?.nextDasha?.period || 'N/A'}
- Effects: ${typeof sectionData?.nextDasha?.effects === 'object' ? `General: ${sectionData.nextDasha.effects.general || 'N/A'}, Career: ${sectionData.nextDasha.effects.career || 'N/A'}, Health: ${sectionData.nextDasha.effects.health || 'N/A'}, Relationship: ${sectionData.nextDasha.effects.relationship || 'N/A'}` : (sectionData?.nextDasha?.effects || 'N/A')}
- CHART-SPECIFIC ANALYSIS:
  → Houses ruled: ${sectionData?.nextDasha?.chartSpecificEffects?.ruledHouses?.join(', ') || 'N/A'}
  → Sits in house: ${sectionData?.nextDasha?.chartSpecificEffects?.lordHouse || 'N/A'}
  → Functional nature: ${sectionData?.nextDasha?.chartSpecificEffects?.functionalNature || 'N/A'}
  → Strength: ${sectionData?.nextDasha?.chartSpecificEffects?.lordStrength || 'N/A'}%
  → Life areas activated: ${(sectionData?.nextDasha?.chartSpecificEffects?.houseThemes || []).join(', ') || 'N/A'}
  → ENGINE VERDICT: ${sectionData?.nextDasha?.chartSpecificEffects?.summary || 'N/A'}

COMPLETE LIFE PHASES TIMELINE:
${(sectionData?.lifePhaseSummary || []).map(d => `${d.lord}: ${d.period} (${d.years} years) — "${d.theme}"${d.chartTheme ? ' | Chart-specific: ' + d.chartTheme : ''}${d.isCurrent ? ' ← CURRENT' : ''}`).join('\n')}

CROSS-REFERENCE DATA:
- Marriage afflictions: ${allSections?.marriage?.marriageAfflictions?.severity || 'N/A'}${allSections?.marriage?.marriageAfflictions?.isMarriageDenied ? ' ⛔ MARRIAGE DENIED — do NOT predict marriage events in life timeline' : allSections?.marriage?.marriageAfflictions?.severity === 'HIGH' ? ' ⚠️ MARRIAGE HIGHLY UNLIKELY — avoid predicting marriage events unless with strong caveats' : ''}
- Estimated children: ${allSections?.children?.estimatedChildren?.count || 'N/A'}${allSections?.children?.estimatedChildren?.marriageDenialImpact ? ' (' + allSections.children.estimatedChildren.marriageDenialImpact + ')' : ''}
- Career path: ${(allSections?.career?.suggestedCareers || []).slice(0, 3).join(', ') || 'N/A'}
- Health danger periods: ${(allSections?.health?.dangerPeriods || []).filter(d => d.level === 'CRITICAL').slice(0, 3).map(d => d.lord + '-' + d.antardasha + ': ' + d.period).join(' | ') || 'None critical'}
- Foreign travel likelihood: ${allSections?.foreignTravel?.foreignLikelihood || 'N/A'}
- 25-year detailed forecast: ${(allSections?.timeline25?.periods || []).slice(0, 5).map(p => `${p.period}: ${p.overallTone || p.nature || ''}`).join(' | ') || 'N/A'}
- Financial risk periods: ${(allSections?.financial?.losses?.riskPeriods || []).slice(0, 3).map(p => p.lord + ': ' + p.period).join(' | ') || 'None'}
- Property best periods: ${(allSections?.realEstate?.bestPeriodsForProperty || []).slice(0, 2).map(p => p.lord + ': ' + p.period).join(' | ') || 'N/A'}

━━━ DATA USAGE RULES ━━━
CRITICAL: Each life phase NOW has CHART-SPECIFIC analysis. Do NOT use generic planet themes. Instead:
- The "chartSpecificEffects" field tells you EXACTLY which houses this planet rules FOR THIS PERSON
- The "functionalNature" field tells you if this planet is a FRIEND or FOE for this rising sign
- The "lordStrength" field tells you HOW POWERFUL this period's effects will be
- The "houseThemes" field gives you the EXACT life areas activated
- The "chartTheme" in lifePhaseSummary gives a one-line CHART-SPECIFIC summary for each period

EXAMPLE: Instead of "Jupiter period = expansion" (GENERIC), use:
"Jupiter rules houses 8 and 11 for this person. As a malefic for Taurus rising with 66% strength, this period creates challenges in transformation (house 8) but gains through social networks (house 11)."
→ Translate this into plain language: "The next several years bring an unusual mix — financial gains through unexpected channels, but also intense personal transformation that forces you to shed old skin."

- isCurrent = the phase they are living RIGHT NOW
- Cross-reference marriage, career, health data for specific predictions per phase
- Past phases → describe what the data indicates for those periods
- Future phases → state what the data predicts

═══ NADI ASTROLOGY CROSS-REFERENCES (enrich each life phase) ═══
- Nadi Career: ${allSections?.career?.nadiCareer?.careerType || 'N/A'} | Best dashas: ${(allSections?.career?.nadiCareer?.bestDashaPlanets || []).join(', ') || 'N/A'}
- Nadi Marriage: ${allSections?.marriage?.nadiMarriage?.verdict || 'N/A'} | Best dashas: ${(allSections?.marriage?.nadiMarriage?.bestDashaPlanets || []).join(', ') || 'N/A'}
- Nadi Health: Longevity ${allSections?.health?.nadiHealth?.longevityEstimate?.estimatedYears || 'N/A'}yr | Danger dashas: ${(allSections?.health?.nadiHealth?.dangerousDashaPlanets || []).join(', ') || 'N/A'}
- Nadi Children: ${allSections?.children?.nadiChildren?.verdict || 'N/A'} | Best dashas: ${(allSections?.children?.nadiChildren?.bestDashaPlanets || []).join(', ') || 'N/A'}
- Nadi Foreign: ${allSections?.foreignTravel?.nadiForeignTravel?.verdict || 'N/A'}
USE: When describing a life phase, check if its lord planet appears in ANY Nadi "bestDashaPlanets" list — that tells you WHICH life events are most likely during that period. If the period lord is a "danger dasha planet" for health, flag it.

REALITY CHECK:
- Use the person's exact age from system context to anchor all predictions
- Future predictions must fall within realistic lifespan (max age 80-85)
- Be honest about difficult periods — if a phase shows hardship, say so DIRECTLY without softening
- Use SPECIFIC years from the data for every prediction
- Do NOT make every phase sound positive — include hard periods with full honesty

⚠️ PERSONALIZATION RULE: For each life phase, cross-reference with ALL available section data:
- During a Venus period → reference marriage timing from marriage section, romance, beauty/art career
- During a Jupiter period → reference children timing from children section, education, spiritual growth  
- During a Saturn period → reference health danger periods, career delays, karmic lessons
- During a Rahu period → reference foreign travel data, unconventional career moves
- During a Mars period → reference property data from real estate section, sibling events, surgery risks from health section
- During a Moon period → reference mental health data, mother events from family portrait, travel
- This makes EACH phase description unique to THIS person instead of generic planet descriptions

OUTPUT INSTRUCTIONS:
For each life phase in the timeline, write 1-2 paragraphs covering:
1. **Current phase (MOST DETAILED)** — what this period means for career, relationships, health, money. Reference the person's current age and life situation. What are they experiencing RIGHT NOW?
2. **Next phase** — what is coming and when, with specific dates. What should they prepare for?
3. **Future phases (next 5-10 years only)** — for each, state dates, themes, and cross-reference specific events (marriage/children/career peaks/health risks)
4. **Past phases (brief)** — for already-lived periods, note what the data indicates they went through (helps validate the reading)
5. **Critical turning points** — flag specific years where multiple data sources converge (e.g., health danger + financial risk + Saturn period = very challenging year)
6. **The single most important year ahead** — identify ONE upcoming year that the data suggests will be transformative, and explain why
Skip phases beyond 10 years from now unless the person is under 25.`,
    },

    transits: {
      title: '🌍 What\'s Happening Right Now',
      prompt: `Translate the following current transit data into a practical assessment of what is happening now and in the next 6-12 months. State the transit score, active events, and planet positions from the data.

REMINDER: No astrology terms. No "transit", "Sade Sati", "Saturn return" etc. If Sinhala, write 100% pure Sinhala — zero English words.

━━━ TRANSIT ENGINE DATA ━━━

Overall Transit Score: ${sectionData?.overallTransitScore || 'N/A'}/100
Major Events Active: ${(sectionData?.majorEvents || []).map(e => e.event + ' (' + e.severity + '): ' + e.description).join(' | ') || 'None'}
Saturn Testing Period: ${sectionData?.sadheSati?.active ? 'ACTIVE — ' + sectionData.sadheSati.phase + '. ' + sectionData.sadheSati.note : 'Not active'}
Activated Life Areas: ${sectionData?.activatedHouses ? Object.entries(sectionData.activatedHouses).map(([h, ps]) => 'Area ' + h + ': ' + ps.join(', ')).join(' | ') : 'N/A'}

CURRENT PLANET POSITIONS:
${sectionData?.allTransits ? Object.values(sectionData.allTransits).map(t => `${t.name}: ${t.currentSign} ${t.degree}° (Area ${t.houseFromLagna} from Asc, Area ${t.houseFromMoon} from Moon)${t.isRetrograde ? ' [RETROGRADE]' : ''} — SAV: ${t.ashtakavargaBindus} (${t.binduQuality})${t.bavBindus !== null && t.bavBindus !== undefined ? ' | BAV: ' + t.bavBindus + '/8 (' + t.bavQuality + ')' : ''}${t.effects ? ' | Effects: ' + (typeof t.effects === 'string' ? t.effects : (t.effects.career ? 'Career: ' + t.effects.career + ', ' : '') + (t.effects.health ? 'Health: ' + t.effects.health + ', ' : '') + (t.effects.relationship ? 'Rel: ' + t.effects.relationship : '')) : ''}${t.duration ? ' | Duration: ' + t.duration : ''}${t.natalConjunctions ? ' — touching natal ' + t.natalConjunctions.join(', ') + ' ⚡' : ''}${t.natalOppositions ? ' — opposing natal ' + t.natalOppositions.join(', ') + ' ⚡' : ''}`).join('\n') : JSON.stringify(sectionData, null, 1)}

TRANSIT PRECISION NOTE: Each planet now has TWO scores:
1. SAV (Sarvashtakavarga) = overall sign strength (how strong the sign is generally)
2. BAV (Bhinnashtakavarga) = THIS PLANET'S personal score in this sign (0-8 scale)
A planet with LOW BAV in a HIGH SAV sign = the sign is strong but this specific planet struggles there.
A planet with HIGH BAV in a LOW SAV sign = this planet thrives even in a weak sign.
USE BOTH to give precise transit readings. BAV is more important for individual planet effects.

OUTPUT INSTRUCTIONS — cover ONLY what the data supports:
1. **Overall period quality** — state the transit score and what it means
2. **Active major events** — describe each active event from the data in plain language
3. **Saturn testing period** — if active, explain the phase and its real-life effects
4. **Planet-by-planet transit power** — for EACH major planet, use the BAV score to say whether it's currently helping or challenging the person. High BAV (4+/8) = planet is your friend right now. Low BAV (0-2/8) = planet is testing you.
5. **Challenging aspects** — any natal conjunctions or oppositions happening now
6. **Next 6-12 months outlook** — based on the current transit positions and their BAV scores

Write AT LEAST 5-8 detailed paragraphs (each 3-6 sentences). For each major planet transit, describe its real-life effect on career, health, relationships. For the overall period, paint a vivid picture of what the person is experiencing NOW.`,
    },

    realEstate: {
      title: '🏠 Property, Home & Assets',
      prompt: `Translate the following property engine data into a practical assessment. State ownership potential, best timing windows, and vehicle indications directly from the data.

REMINDER: No astrology terms. If Sinhala, write 100% pure Sinhala — zero English words.

━━━ PROPERTY ENGINE DATA ━━━

HOME/PROPERTY SECTOR:
- Sign: ${sectionData?.fourthHouse?.rashiEnglish || 'N/A'}
- Strength: ${sectionData?.fourthHouse?.strength || 'N/A'}
- Strength Score: ${sectionData?.fourthHouse?.strengthScore || 'N/A'}/100 — ${(sectionData?.fourthHouse?.strengthScore || 0) >= 65 ? 'STRONG property sector — land, homes, and vehicles come naturally' : (sectionData?.fourthHouse?.strengthScore || 0) >= 45 ? 'MODERATE property sector — property through effort' : 'CHALLENGED — property acquisition requires significant effort'}
- Ashtakavarga Bindus: ${sectionData?.fourthHouse?.ashtakavargaBindus || 'N/A'} (${sectionData?.fourthHouse?.ashtakavargaQuality || 'N/A'})
- Bhava Chalit shifts: ${(sectionData?.fourthHouse?.chalitShifts || []).length > 0 ? sectionData.fourthHouse.chalitShifts.map(s => s.planet + ' shifts — property energy redirected').join('; ') : 'None'}
- Planets: ${(sectionData?.fourthHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- Aspects: ${(sectionData?.fourthHouse?.aspectingPlanets || []).map(a => a.planet || a).join(', ') || 'None'}
- Benefic aspects: ${sectionData?.fourthHouse?.beneficAspectCount || 0}, Malefic aspects: ${sectionData?.fourthHouse?.maleficAspectCount || 0} — ${(sectionData?.fourthHouse?.beneficAspectCount || 0) > (sectionData?.fourthHouse?.maleficAspectCount || 0) ? 'More benefic influence — property matters go smoothly' : (sectionData?.fourthHouse?.maleficAspectCount || 0) > (sectionData?.fourthHouse?.beneficAspectCount || 0) ? 'More malefic influence — property disputes or delays possible' : 'Balanced influence'}
- Lord nature: ${sectionData?.fourthHouse?.lordNature || 'N/A'}
- Lord: ${sectionData?.fourthLord?.name || 'N/A'} in house ${sectionData?.fourthLord?.house || 'N/A'}

PROPERTY COMBINATIONS: ${(sectionData?.propertyYoga || []).join(' | ') || 'None detected'}
BEST PERIODS FOR PROPERTY: ${(sectionData?.bestPeriodsForProperty || []).map(p => `${p.lord}: ${p.period}`).join(' | ') || 'N/A'}

MARS (LAND/PROPERTY KARAKA):
- House: ${sectionData?.mars?.house || 'N/A'}
- Note: ${sectionData?.mars?.note || 'N/A'}

SATURN (STRUCTURES/BUILDINGS):
- House: ${sectionData?.saturn?.house || 'N/A'}
- Note: ${sectionData?.saturn?.note || 'N/A'}

CROSS-REFERENCE:
- Home narrative: ${allSections?.career?.homeLifeIndicators?.homeNarrative || 'N/A'}
- Wealth strength: ${allSections?.career?.wealthStrength?.assessment || 'N/A'}
- Inheritance indication: ${allSections?.luck?.inheritanceIndication || 'N/A'}
- Venus (vehicles/luxury): house ${allSections?.marriage?.venus?.house || 'N/A'} — ${allSections?.marriage?.venus?.note || 'N/A'}
- Foreign settlement: ${allSections?.foreignTravel?.settlementAbroad ? 'YES — property abroad possible' : 'Domestic focus'}

═══ NADI ASTROLOGY PROPERTY ANALYSIS (Sub-Lord Methodology) ═══
${allSections?.luck?.nadiLuck ? `- Property Verdict: ${allSections.luck.nadiLuck.propertyVerdict || 'N/A'} (${allSections.luck.nadiLuck.propertyStrength || 'N/A'})
- Property-activating planets: ${(allSections.luck.nadiLuck.propertyPlanets || []).join(', ') || 'N/A'}
- NOTE: Nadi methodology: Property via houses 4,11,12. Strong verdict = property acquisition is PROMISED.
USE THIS: If property verdict is "strong"/"very_strong", property ownership is confirmed. Cross-reference with best periods for property from traditional analysis.` : 'Nadi property analysis not available'}

OUTPUT INSTRUCTIONS — cover ONLY what the data supports:
1. **Property ownership potential** — from 4th house strength score and property combinations
2. **Best timing for property** — state the exact periods from the data
3. **Property combinations** — if any detected, explain what they mean
4. **Land and building indicators** — from Mars and Saturn data
5. **Vehicle ownership** — from Venus placement and 4th house data (4th house also governs vehicles)
6. **Inheritance** — if data available, state it

Write AT LEAST 5-8 detailed paragraphs (each 3-6 sentences). For each property timing window, describe what type of property investment suits that period. Skip any area where data is N/A.`,
    },

    financial: {
      title: '💰 Your Money Blueprint',
      prompt: `Translate the following financial engine data into a clear, honest money assessment. State income strength, expense patterns, risk periods, and investment recommendations directly from the data.

REMINDER: No astrology terms. No "2nd house", "11th lord", "Dhana yoga" etc. If Sinhala, write 100% pure Sinhala — zero English words.

━━━ FINANCIAL ENGINE DATA ━━━

INCOME:
- Savings Sector: Strength ${sectionData?.income?.secondHouse?.strength || 'N/A'}, Score ${sectionData?.income?.secondHouse?.strengthScore || 'N/A'}/100, AV ${sectionData?.income?.secondHouse?.ashtakavargaBindus || 'N/A'} (${sectionData?.income?.secondHouse?.ashtakavargaQuality || 'N/A'}), Planets: ${(sectionData?.income?.secondHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- Savings Lord: ${sectionData?.income?.secondLord?.name || 'N/A'} in house ${sectionData?.income?.secondLord?.house || 'N/A'}
- Income Sector: Strength ${sectionData?.income?.eleventhHouse?.strength || 'N/A'}, Score ${sectionData?.income?.eleventhHouse?.strengthScore || 'N/A'}/100, AV ${sectionData?.income?.eleventhHouse?.ashtakavargaBindus || 'N/A'} (${sectionData?.income?.eleventhHouse?.ashtakavargaQuality || 'N/A'}), Planets: ${(sectionData?.income?.eleventhHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- Income Lord: ${sectionData?.income?.eleventhLord?.name || 'N/A'} in house ${sectionData?.income?.eleventhLord?.house || 'N/A'}
- Wealth Combinations: ${(sectionData?.income?.dhanaYogas || []).join(' | ') || 'None detected'}

FINANCIAL PRECISION: Houses with Ashtakavarga bindus 28+ are STRONG money areas — planet transits through these signs bring financial opportunities. Houses with bindus below 22 are WEAK — transits through these signs may drain money.

EXPENSES:
- Expense Sector: Strength ${sectionData?.expenses?.twelfthHouse?.strength || 'N/A'}, Planets: ${(sectionData?.expenses?.twelfthHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- Expense Lord: ${sectionData?.expenses?.twelfthLord?.name || 'N/A'} in house ${sectionData?.expenses?.twelfthLord?.house || 'N/A'}
- Expense Note: ${sectionData?.expenses?.note || 'N/A'}

LOSSES & RISKS:
- Sudden Events Sector: Strength ${sectionData?.losses?.eighthHouse?.strength || 'N/A'}, Planets: ${(sectionData?.losses?.eighthHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- Sudden Events Lord: ${sectionData?.losses?.eighthLord?.name || 'N/A'} in house ${sectionData?.losses?.eighthLord?.house || 'N/A'}
- Risk Periods: ${(sectionData?.losses?.riskPeriods || []).map(p => p.lord + ': ' + p.period + ' — ' + p.reason).join(' | ') || 'None identified'}

INVESTMENT ADVICE (engine): ${(sectionData?.investmentAdvice || []).join(' | ') || 'N/A'}

CROSS-REFERENCE:
- Career: ${(allSections?.career?.suggestedCareers || []).slice(0, 5).join(', ') || 'N/A'}
- Wealth Strength: ${allSections?.career?.wealthStrength ? `Savings: ${allSections.career.wealthStrength.house2Bindus}, Income: ${allSections.career.wealthStrength.house11Bindus} — ${allSections.career.wealthStrength.assessment}` : 'N/A'}
- Business vs service: ${allSections?.career?.businessVsService || 'N/A'}
- Dhana yogas: ${(allSections?.career?.dhanaYogas || []).join(' | ') || 'None'}
- Money personality: ${allSections?.surpriseInsights?.moneyPersonality?.archetype || 'N/A'} (impulse: ${allSections?.surpriseInsights?.moneyPersonality?.impulseScore || 'N/A'})
- Wealth class prediction: ${allSections?.surpriseInsights?.wealthClass?.wealthLevel || 'N/A'}

═══ NADI ASTROLOGY FINANCIAL ANALYSIS (Sub-Lord Methodology) ═══
${allSections?.luck?.nadiLuck ? `- Wealth Verdict: ${allSections.luck.nadiLuck.wealthVerdict || 'N/A'} (${allSections.luck.nadiLuck.wealthStrength || 'N/A'})
- Windfall Verdict: ${allSections.luck.nadiLuck.windfallVerdict || 'N/A'} (${allSections.luck.nadiLuck.windfallStrength || 'N/A'})
- Windfall-activating planets: ${(allSections.luck.nadiLuck.windfallPlanets || []).join(', ') || 'N/A'}
- Best Dasha for windfalls: ${(allSections.luck.nadiLuck.windfallBestDasha || []).join(', ') || 'N/A'}
- NOTE: Nadi methodology: Wealth via 2,6,10,11. Windfall via 8,11.
USE THIS: Wealth verdict confirms earning capacity. Windfall verdict tells if unearned money (insurance, PF, inheritance, lottery) is promised. Cross-reference with risk periods to know when to protect vs invest aggressively.` : 'Nadi financial analysis not available'}
${allSections?.career?.nadiCareer ? `- Nadi Career Wealth: ${allSections.career.nadiCareer.wealthVerdict || 'N/A'}
- Nadi Windfall: ${allSections.career.nadiCareer.windfallVerdict || 'N/A'}` : ''}

━━━ DATA USAGE RULES ━━━
- Savings sector strength → savings capacity
- Income sector strength → income growth potential
- Wealth combinations → specific wealth mechanisms
- Expense sector → spending patterns
- Sudden events sector → windfalls or losses
- Risk periods → SPECIFIC years for financial caution
- Investment advice → use these EXACT engine recommendations

OUTPUT INSTRUCTIONS — cover ONLY what the data supports:
1. **Income and savings capacity** — from the sector strengths
2. **Wealth combinations** — if any detected, explain what kind of wealth they indicate
3. **Expense patterns** — from expense sector data
4. **Financial risk periods** — state exact periods from the data with reasons
5. **Investment recommendations** — state the engine's advice directly
6. **Overall financial outlook** — from the wealth strength cross-reference

Write AT LEAST 6-8 detailed paragraphs (each 3-6 sentences). For income, describe earning potential across different life periods. For risk periods, give specific years and what to avoid. For investments, give actionable practical advice.`,
    },

    remedies: {
      title: '💎 Your Personal Power Toolkit',
      prompt: `Translate the following remedies data into practical recommendations. State gemstones, colors, days, and weak planet remedies directly from the data.

REMINDER: Be clear and honest. If Sinhala (si), use 100% pure Sinhala with no English or Tamil (දෙමළ) words mixed in.

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
- Diet recommendations: ${JSON.stringify(allSections?.health?.dietRecommendations || [])}
- Mother remedies: ${JSON.stringify(allSections?.familyPortrait?.mother?.remedies || [])}
- Spiritual inclination: ${allSections?.spiritual?.spiritualInclination || 'N/A'}
- Past karma theme: ${allSections?.spiritual?.pastKarmaTheme || 'N/A'}
- Meditation type: ${allSections?.spiritual?.meditationType || 'N/A'}
- Nature connection: ${JSON.stringify(allSections?.spiritual?.pilgrimageRecommendation || [])}
- Current dasha effects: ${typeof allSections?.lifePredictions?.currentDasha?.effects === 'object' ? allSections.lifePredictions.currentDasha.effects.health || 'N/A' : 'N/A'}

═══ PRACTICAL LIFESTYLE RECOMMENDATIONS ═══
⚠️ IMPORTANT: Do NOT recommend any religious activities — no temple visits, prayers, pujas, pirith, mantras, church services, mosque visits, rituals, or any faith-based practices. Keep ALL advice purely practical and lifestyle-based.

RECOMMEND THESE PRACTICAL APPROACHES:
- 💎 Gemstones — wear the recommended gemstone as a personal accessory (explain which finger, which metal, when to start wearing)
- 🎨 Color therapy — incorporate lucky colors into daily wardrobe, workspace, phone wallpaper, accessories
- 📅 Power day awareness — plan important decisions, meetings, and new ventures on the power day
- 🧘 Meditation and mindfulness — daily 10-15 minute sessions for mental clarity (breathing exercises, body scan, visualization)
- 🏃 Physical exercise — specific activities suited to weak planet energy (e.g., martial arts for weak Mars, swimming for weak Moon, yoga stretches for weak Saturn)
- 🥗 Diet adjustments — from the diet data, explain specific foods that strengthen weak planets
- � Acts of generosity — helping others, volunteering, charity donations (most powerful universal practice)
- 🌿 Nature connection — morning walks, gardening, spending time near water or mountains
- � Journaling — daily reflection to build self-awareness and track personal growth
- � Sleep hygiene — consistent bedtime routine, screen-free wind-down, optimal sleep environment
- 🤝 Social habits — specific relationship and communication improvements based on weak planets
- 🎵 Music and sound — calming or energizing music matched to planetary needs
- 📚 Learning and skill-building — courses or hobbies that strengthen weak planetary energies

═══ NADI CROSS-REFERENCES (prioritize remedies for Nadi-identified weaknesses) ═══
- Nadi Career weak planets: ${(allSections?.career?.nadiCareer?.weakPlanets || []).join(', ') || 'None'}
- Nadi Marriage weak planets: ${(allSections?.marriage?.nadiMarriage?.weakPlanets || []).join(', ') || 'None'}
- Nadi Health weak areas: ${(allSections?.health?.nadiHealth?.vulnerableOrgans || []).join(', ') || 'None'}
- Nadi Longevity strength: ${allSections?.health?.nadiHealth?.longevityStrength || 'N/A'}
USE: If Nadi identifies a planet as weak for career AND it appears in weak planet remedies, EMPHASIZE that remedy as highest priority.

OUTPUT: 1. Primary gemstone recommendation (which gem, which finger, which metal, when to start) 2. Lucky color integration and power day strategy 3. Weak planet practical lifestyle adjustments from the data 4. Diet and exercise recommendations from cross-reference data 5. Daily routine suggestions (morning, evening habits) 6. General protective and self-improvement practices

Write AT LEAST 6-8 detailed paragraphs (each 3-6 sentences). For each remedy, explain WHAT to do, WHEN to do it, and WHY it helps. Don't just list — elaborate with practical instructions.`,
    },

    yogaAnalysis: {
      title: '🪐 Your Chart Strengths & Challenges',
      prompt: `Translate the following yoga and dosha data. For each yoga, explain what it means in real-life terms. For each dosha, explain the challenge honestly.

REMINDER: Plain language only — no jargon. If Sinhala (si), use 100% pure Sinhala with no English or Tamil (දෙමළ) words mixed in.

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

PERSONALITY CROSS-REFERENCE (unique chart signatures):
- Unique signatures: ${(allSections?.personality?.uniqueSignatures || []).join('; ') || 'None'}
- Retrograde planets: ${(allSections?.personality?.retrogradePlanets || []).map(r => `${r.name} in house ${r.house}`).join(', ') || 'None'}
- Retrograde effects: ${(allSections?.personality?.retrogradeHouseEffects || []).join('; ') || 'N/A'}
- Combust planets: ${(allSections?.personality?.combustPlanets || []).map(c => `${c.name} (${c.combustDistance?.toFixed(1) || '?'}° from Sun)`).join(', ') || 'None'}
- Graha Yuddha (planetary wars): ${(allSections?.personality?.grahaYuddha || []).map(g => `${g.planet1} vs ${g.planet2} — ${g.winner} wins`).join('; ') || 'None'}
- Neecha Bhanga (weakness→strength): ${(allSections?.personality?.neechaBhangaYogas || []).map(n => `${n.planet}: ${n.reason}`).join('; ') || 'None'}
- Lagna lord position: house ${allSections?.personality?.lagnaLordPosition?.house || 'N/A'} — ${allSections?.personality?.lagnaLordPosition?.interpretation || 'N/A'}
- Atmakaraka (soul planet): ${allSections?.personality?.atmakaraka || 'N/A'}
- Overall personality strength: ${allSections?.personality?.overallStrength || 'N/A'}

═══ NADI CROSS-REFERENCES (for enriching yoga/dosha analysis) ═══
- Nadi Career verdict: ${allSections?.career?.nadiCareer?.careerType || 'N/A'} (strength: ${allSections?.career?.nadiCareer?.serviceStrength || 'N/A'})
- Nadi Marriage verdict: ${allSections?.marriage?.nadiMarriage?.verdict || 'N/A'} (strength: ${allSections?.marriage?.nadiMarriage?.strength || 'N/A'})
- Nadi Health longevity: ${allSections?.health?.nadiHealth?.longevityEstimate?.estimatedYears || 'N/A'} years (${allSections?.health?.nadiHealth?.longevityStrength || 'N/A'})
- Nadi Education: ${(allSections?.education?.nadiEducation?.suggestedFields || []).slice(0, 3).join(', ') || 'N/A'}
USE: If a yoga supports career and Nadi career is STRONG, the yoga's effect is AMPLIFIED. If a dosha threatens health and Nadi longevity is WEAK, the dosha's impact is MORE SEVERE.

OUTPUT: 1. Each classical yoga — name and real-life meaning 2. Each advanced yoga if any 3. Each dosha/challenge with severity 4. Unique chart signatures — what makes THIS chart special (retrograde patterns, planetary wars, weakness→strength transformations) 5. Functional benefics and malefics explained 6. Yoga karaka planet explained

Write AT LEAST 6-8 detailed paragraphs (each 3-6 sentences). For each yoga, explain its real-life effect with a scenario. For each dosha, describe how it manifests in daily life and what to watch for.`,
    },

    health: {
      title: 'සෞඛ්‍ය සැලැස්ම — Your Complete Health Blueprint',
      prompt: `Translate the following health engine data into an honest health assessment. State organ risks, danger periods, and diet recommendations directly from the data.

REMINDER: Clear and honest. If Sinhala (si), use 100% pure Sinhala with no English or Tamil (දෙමළ) words mixed in.

Birth details: Born under ${lagnaEn} rising, Moon in ${moonEn}, Nakshatra: ${nakshatraName}
Current life period: ${currentDasha} main period, ${currentAD} sub-period

━━━ HEALTH DATA FROM CHART ━━━
- Overall vitality: ${sectionData?.overallVitality || 'N/A'}
- Mental health indicator: ${sectionData?.mentalHealthIndicator || 'N/A'}
${(sectionData?.mentalHealthIndicator || '').includes('Moon-Saturn') ? '⚠️ CRITICAL: Moon-Saturn conjunction detected — this person is highly susceptible to anxiety, depression, and emotional trauma. The MENTAL HEALTH DEEP DIVE section (#9) must address childhood emotional patterns, suppressed feelings, and provide serious healing recommendations. Do NOT skip or minimize this.' : ''}
- Longevity indicator: ${sectionData?.longevityIndicator || 'N/A'}
- Body areas at risk: ${JSON.stringify(sectionData?.bodyRisks || [])}
- Health vulnerabilities (weak planets): ${(sectionData?.healthVulnerabilities || []).map(v => `${v.planet || v.name || JSON.stringify(v)}: ${v.score || v.percentage || '?'}% — ${v.riskDescription || v.risk || ''} (weakest: ${v.weakestComponent || 'N/A'})`).join('; ') || 'N/A'}
- Diet recommendations: ${JSON.stringify(sectionData?.dietRecommendations || [])}
- Shadbala Summary: ${sectionData?.shadbalaSummary ? `Weakest planet: ${JSON.stringify(sectionData.shadbalaSummary.weakestPlanet)}, Strongest: ${JSON.stringify(sectionData.shadbalaSummary.strongestPlanet)}. Note: ${sectionData.shadbalaSummary.note}` : 'N/A'}

BIRTH QUALITY & HEALTH FOUNDATION:
${bd?.panchanga?.panchangaQuality ? `Birth Quality: ${bd.panchanga.panchangaQuality.score}/5 (${bd.panchanga.panchangaQuality.quality}) — ${bd.panchanga.panchangaQuality.score >= 4 ? 'Born at an excellent cosmic moment — natural vitality is HIGH, recovery from illness is fast' : bd.panchanga.panchangaQuality.score >= 3 ? 'Good birth quality — average resilience' : 'Challenged birth quality — health needs extra attention from early age. This person may have had a difficult birth (premature, incubator, birth complications). Do NOT say they were born strong.'}` : 'Birth quality data not available'}

⚠️ CRITICAL — BIRTH HEALTH ACCURACY RULES:
- If Birth Quality score is 1 or 2 out of 5, the birth was DIFFICULT. The person may have been premature, spent time in an incubator or NICU, or had birth complications. State this clearly. Do NOT say "born strong" or "healthy birth" when the score is low.
- If earlyLifeHealth severity is HIGH or CRITICAL (see below), the infant period was dangerous — describe the struggles honestly.
- Only describe the birth as "strong" or "healthy" if BOTH Birth Quality >= 4 AND earlyLifeHealth severity is LOW.

━━━ ORGAN-BY-ORGAN RISK MAP ━━━
${sectionData?.highRiskOrgans?.length > 0 ? `🔴 HIGH RISK organs: ${sectionData.highRiskOrgans.join(', ')}` : '✅ No HIGH RISK organs detected'}
${sectionData?.moderateRiskOrgans?.length > 0 ? `🟡 MODERATE RISK organs: ${sectionData.moderateRiskOrgans.join(', ')}` : ''}

🎯 PRIMARY HEALTH CONCERN (HIGHEST RISK ORGAN):
${sectionData?.primaryHealthConcern ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ ${sectionData.primaryHealthConcern.organ} — ${sectionData.primaryHealthConcern.risk} RISK (${sectionData.primaryHealthConcern.indicators} indicators)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Diseases: ${(sectionData.primaryHealthConcern.diseases || []).join(', ')}
• Vulnerable from: ${sectionData.primaryHealthConcern.vulnerableAge}
• Why: ${sectionData.primaryHealthConcern.narrative}

📋 COMPREHENSIVE REMEDIES FOR ${sectionData.primaryHealthConcern.organ.toUpperCase()}:
🌿 Ayurvedic Medicines: ${(sectionData.primaryHealthConcern.remedies?.ayurvedic || []).join(' | ')}
🍽️ Dietary Guidelines: ${(sectionData.primaryHealthConcern.remedies?.dietary || []).join(' | ')}
🏃 Lifestyle Changes: ${(sectionData.primaryHealthConcern.remedies?.lifestyle || []).join(' | ')}
💎 Gemstone Remedy: ${sectionData.primaryHealthConcern.remedies?.gemstone || 'Consult astrologer'}
🕉️ Mantra: ${sectionData.primaryHealthConcern.remedies?.mantra || 'N/A'}
` : 'No primary health concern identified — all organs are at LOW or MODERATE risk.'}

RANKED ORGANS BY RISK (sorted from highest to lowest risk):
${(sectionData?.rankedOrganRisks || []).map((o, i) => `${i + 1}. [${o.risk}] ${o.organ} (${o.indicators} indicators)`).join('\n')}

━━━ ALL ORGAN DETAILS ━━━
${(sectionData?.organRisks || []).map(o => `• [${o.risk}] ${o.organ}
  - Diseases: ${(o.diseases || []).join(', ')}
  - Vulnerable from: ${o.vulnerableAge}
  - Prevention: ${o.prevention}
  - Chart reason: ${o.narrative}`).join('\n')}

━━━ 🍼 INFANT & EARLY CHILDHOOD HEALTH ━━━
${sectionData?.earlyLifeHealth?.severity !== 'LOW' ? `
⚠️ EARLY-LIFE HEALTH VULNERABILITY: ${sectionData?.earlyLifeHealth?.severity}
${(sectionData?.earlyLifeHealth?.risks || []).map((r, i) => `${i+1}. ${r}`).join('\n')}
Summary: ${sectionData?.earlyLifeHealth?.summary || 'N/A'}

IMPORTANT: If this person's early-life health severity is HIGH or CRITICAL, you MUST dedicate a FULL PARAGRAPH to their infant/childhood health struggles. Describe:
- What likely happened in the first days/weeks/months of life (based on the risk indicators above)
- Possible premature birth, time in incubator/NICU, low birth weight, breathing difficulties
- The specific illness patterns (respiratory if Ketu/Mars in 4th, gut/immune if Saturn in 6th, etc.)
- How they survived and what this means for their resilience
- Long-term health effects of childhood illness
- This is NOT speculative — the chart clearly shows early-life health crisis indicators.
- NEVER contradict this by saying "born strong" elsewhere in the report.
` : 'No significant early-life health vulnerability detected.'}

━━━ KIDNEY / URINARY SYSTEM (SPECIFIC) ━━━
- Kidney risk level: ${sectionData?.kidneyRisk || 'N/A'}
- Kidney chart analysis: ${sectionData?.kidneyNarrative || 'N/A'}
${sectionData?.kidneyRisk === 'HIGH' ? `⚠️ MANDATORY: You MUST include a detailed, specific kidney/urinary health section. This person has HIGH kidney risk written into their chart. Describe: (1) early stone/UTI episodes likely in their late 20s, (2) a more serious kidney health crisis around age 50, (3) the strong possibility of surgical intervention, (4) specific kidney protection protocol — diet (avoid oxalate-rich foods, drink 3L water daily, coconut water, barley water/iridhu), herbal remedies (polpala tea, punarnava, gokshura), annual kidney function tests (creatinine, eGFR, urine microalbumin) from age 30 onwards.` : ''}

━━━ HEALTH DANGER PERIODS (ANTARDASHA-LEVEL) ━━━
CRITICAL periods (both main + sub period are danger indicators):
${(sectionData?.dangerPeriods || []).filter(d => d.level === 'CRITICAL').slice(0, 12).map(d => `• ${d.lord}-${d.antardasha}: ${d.period} — ${d.reason}`).join('\n') || 'None'}

ELEVATED periods (main period is a health significator):
${(sectionData?.dangerPeriods || []).filter(d => d.level === 'ELEVATED').slice(0, 8).map(d => `• ${d.lord}-${d.antardasha}: ${d.period}`).join('\n') || 'None'}

═══ NADI ASTROLOGY HEALTH ANALYSIS (Sub-Lord Methodology) ═══
${sectionData?.nadiHealth ? `- Disease Verdict: ${sectionData.nadiHealth.diseaseVerdict} (${sectionData.nadiHealth.diseaseStrength})
- Disease-activating planets: ${(sectionData.nadiHealth.diseasePlanets || []).join(', ') || 'N/A'}
- Longevity Verdict: ${sectionData.nadiHealth.longevityVerdict || 'N/A'} (${sectionData.nadiHealth.longevityStrength || 'N/A'})
- Longevity-supporting planets: ${(sectionData.nadiHealth.longevityPlanets || []).join(', ') || 'N/A'}
- Longevity Estimate: ${sectionData.nadiHealth.longevityEstimate ? `${sectionData.nadiHealth.longevityEstimate.estimatedYears} years — ${sectionData.nadiHealth.longevityEstimate.category}` : 'N/A'}
- NOTE: ${sectionData.nadiHealth.note}
USE THIS: Disease verdict tells if health problems are PROMISED or DENIED. Disease planets tell which DASHA periods bring illness. Longevity estimate gives lifespan range. Cross-reference with organ risk map for precision.` : 'Nadi health analysis not available'}

⚠️ PRECISION NOTE: Health vulnerability scores are based on 6-component Shadbala analysis. The organ risk map above is computed from house positions, planetary strengths, and aspect patterns — use it to give HIGHLY SPECIFIC health advice for each organ system.

CROSS-REFERENCE DATA (for richer health narrative):
- Depression risk: ${allSections?.mentalHealth?.depressionRisk?.level || 'N/A'} (mental health affects physical health)
- Childhood trauma: ${allSections?.mentalHealth?.childhoodTrauma?.level || 'N/A'} (stored trauma manifests as physical symptoms)
- Sleep pattern: ${allSections?.surpriseInsights?.sleepPattern || 'N/A'}
- Food preference: ${allSections?.surpriseInsights?.foodPreference || 'N/A'}
- Career type: ${(allSections?.career?.suggestedCareers || []).slice(0, 2).join(', ') || 'N/A'} (desk job vs physical work matters for health)
- Marriage stress: ${allSections?.marriage?.marriageAfflictions?.severity || 'N/A'} (relationship stress affects cardiovascular/digestive health)
- Current age: use from system context to prioritize age-appropriate health advice
- Mother health risks: ${JSON.stringify(allSections?.familyPortrait?.mother?.healthRisks || []).substring(0, 100)} (hereditary patterns)
- Father health risks: ${JSON.stringify(allSections?.familyPortrait?.father?.healthRisks || []).substring(0, 100)} (hereditary patterns)

OUTPUT: Write detailed paragraphs (8-12) covering ONLY what the data supports:
1. **Overall vitality assessment** — from the vitality data, what's their baseline health?
2. **HIGH-RISK organs** — for EACH organ in the risk map, dedicate a full paragraph: name the organ, vulnerable age, specific diseases, prevention strategy, and screening schedule
3. **MODERATE-RISK organs** — brief mention with prevention tips
4. **Hereditary patterns** — from parent health risk cross-reference, what conditions run in the family
5. **Health danger periods** — EXACT dates from the danger period data with severity levels. Which years need extra vigilance?
6. **Diet and lifestyle** — from the engine diet recommendations PLUS food preference data. Be specific: what to eat, what to avoid, and WHY for this person's specific risks
7. **Sleep and stress** — from sleep pattern + mental health cross-reference
8. **Age-specific health plan** — based on current age, what should they prioritize NOW vs in 10 years
9. **Medical screening calendar** — specific tests based on organ risk data, at what age to start each
10. **Longevity assessment** — from the longevity indicator data

Write AT LEAST 10-14 rich, detailed paragraphs (each 3-6 sentences). This is a HERO section — health is CRITICAL. Every organ risk needs its own full paragraph. Every danger period needs specific dates and what to watch for. Do NOT rush through this section.

REMINDER: Plain language — avoid technical chart jargon. Be honest about risks; stay actionable and supportive.
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English or Tamil word. දෙමළ (Tamil) අකුරු හෝ වචන කිසිසේත් භාවිතා නොකරන්න.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish (Sinhala words in English letters).' : 'Write in warm, caring English.'}`,
    },

    foreignTravel: {
      title: 'Foreign Travel & Living Abroad',
      prompt: `Translate the following foreign travel data. State likelihood, timing windows, suggested countries, and settlement indication directly from the data.

REMINDER: Clear and honest. If Sinhala (si), use 100% pure Sinhala with no English or Tamil (දෙමළ) words mixed in.

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
- 9th house (long journeys): Strength ${sectionData?.ninthHouse?.strengthScore || 'N/A'}/100, AV ${sectionData?.ninthHouse?.ashtakavargaBindus || 'N/A'} (${sectionData?.ninthHouse?.ashtakavargaQuality || 'N/A'}) — ${(sectionData?.ninthHouse?.strengthScore || 0) >= 65 ? 'STRONG fortune/travel sector — overseas journeys well-supported' : 'Standard travel potential'}
- 12th house (foreign lands): Strength ${sectionData?.twelfthHouse?.strengthScore || 'N/A'}/100, AV ${sectionData?.twelfthHouse?.ashtakavargaBindus || 'N/A'} (${sectionData?.twelfthHouse?.ashtakavargaQuality || 'N/A'}) — ${(sectionData?.twelfthHouse?.strengthScore || 0) >= 50 ? 'Active foreign residence sector' : 'Foreign settlement needs more effort'}
- Planets in 12th: ${(sectionData?.twelfthHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- 12th lord: ${sectionData?.twelfthHouse?.rashiLord || 'N/A'} in house ${sectionData?.twelfthHouse?.lordHouse || 'N/A'}
- Current dasha: ${allSections?.lifePredictions?.currentDasha?.lord || 'N/A'} (${typeof allSections?.lifePredictions?.currentDasha?.effects === 'object' ? allSections.lifePredictions.currentDasha.effects.general || 'N/A' : allSections?.lifePredictions?.currentDasha?.effects || 'N/A'})
- Education foreign study: ${allSections?.education?.foreignStudy ? 'YES — foreign study indicated' : 'N/A'}
- Career foreign opportunity: ${(allSections?.career?.suggestedCareers || []).some(c => (c || '').toLowerCase().includes('foreign') || (c || '').toLowerCase().includes('international')) ? 'International career path suggested' : 'N/A'}

═══ NADI ASTROLOGY FOREIGN TRAVEL ANALYSIS (Sub-Lord Methodology) ═══
${sectionData?.nadiForeignTravel ? `- Nadi Verdict: ${sectionData.nadiForeignTravel.verdict} (${sectionData.nadiForeignTravel.strength})
- Best Dasha planets for foreign travel: ${(sectionData.nadiForeignTravel.bestDashaPlanets || []).join(', ') || 'N/A'}
- Strong travel planets: ${(sectionData.nadiForeignTravel.strongPlanets || []).join(', ') || 'N/A'}
- Average Nadi Score: ${sectionData.nadiForeignTravel.averageScore}/100
- NOTE: Nadi methodology: Foreign travel in DBA of planets signifying 3,9,12. Houses 2,4,11 indicate return to homeland.
USE THIS: If verdict is "strong" or "very_strong", foreign travel is CONFIRMED. Best Dasha planets tell you WHEN travel happens. Cross-reference with traditional travel periods for highest accuracy.` : 'Nadi foreign travel analysis not available'}

OUTPUT: 1. Foreign travel likelihood from the data 2. Settlement abroad indication 3. Visa success assessment 4. Travel timing windows with dates 5. Suggested direction and countries 6. Foreign study indication if applicable

Write AT LEAST 5-8 detailed paragraphs (each 3-6 sentences). For each travel window, describe what kind of travel (work/study/leisure), the likelihood of success, and practical advice for that period.

REMINDER: Plain language — avoid technical chart jargon.
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English or Tamil word. දෙමළ (Tamil) අකුරු හෝ වචන කිසිසේත් භාවිතා නොකරන්න.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish (Sinhala words in English letters).' : 'Write in warm, exciting English.'}`,
    },

    legal: {
      title: 'Legal, Enemies & Protection',
      prompt: `Translate the following legal and protection data. State enemy profile, legal case periods, and protection advice from the data.

REMINDER: Clear and honest. If Sinhala (si), use 100% pure Sinhala with no English or Tamil (දෙමළ) words mixed in.

Birth details: Born under ${lagnaEn} rising, Moon in ${moonEn}, Nakshatra: ${nakshatraName}
Current life period: ${currentDasha} main period, ${currentAD} sub-period

━━━ COMPLETE LEGAL & PROTECTION ENGINE DATA (USE ALL — NO HALLUCINATION) ━━━

ENEMY PROFILE: ${sectionData?.enemyProfile || 'N/A'}

6TH HOUSE (ENEMIES/DISPUTES SECTOR):
- Strength: ${sectionData?.sixthHouse?.strength || 'N/A'}, Score: ${sectionData?.sixthHouse?.strengthScore || 'N/A'}/100
- AV Bindus: ${sectionData?.sixthHouse?.ashtakavargaBindus || 'N/A'} (${sectionData?.sixthHouse?.ashtakavargaQuality || 'N/A'})
- Planets: ${(sectionData?.sixthHouse?.planetsInHouse || []).join(', ') || 'Empty'}

8TH HOUSE (HIDDEN OBSTACLES):
- Strength: ${sectionData?.eighthHouse?.strength || 'N/A'}, Score: ${sectionData?.eighthHouse?.strengthScore || 'N/A'}/100
- AV Bindus: ${sectionData?.eighthHouse?.ashtakavargaBindus || 'N/A'} (${sectionData?.eighthHouse?.ashtakavargaQuality || 'N/A'})

12TH HOUSE (LOSSES/IMPRISONMENT):
- Strength: ${sectionData?.twelfthHouse?.strength || 'N/A'}, Score: ${sectionData?.twelfthHouse?.strengthScore || 'N/A'}/100
- AV Bindus: ${sectionData?.twelfthHouse?.ashtakavargaBindus || 'N/A'} (${sectionData?.twelfthHouse?.ashtakavargaQuality || 'N/A'})

6TH LORD (ENEMIES/DISPUTES):
- Planet: ${sectionData?.sixthLord?.name || 'N/A'}
- House: ${sectionData?.sixthLord?.house || 'N/A'}

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

═══ NADI ASTROLOGY LEGAL/LITIGATION ANALYSIS (Sub-Lord Methodology) ═══
${sectionData?.nadiLitigation ? `- Litigation Verdict: ${sectionData.nadiLitigation.verdict} (${sectionData.nadiLitigation.strength})
- Litigation-activating planets: ${(sectionData.nadiLitigation.strongPlanets || []).join(', ') || 'N/A'}
- Best Dasha for legal matters: ${(sectionData.nadiLitigation.bestDashaPlanets || []).join(', ') || 'N/A'}
- Average Nadi Score: ${sectionData.nadiLitigation.averageScore}/100
- NOTE: Nadi methodology: Legal disputes in DBA of planets signifying 6,8,12. Victory indicated by 2,10,11.
USE THIS: If verdict is "denied" or "weak", legal troubles are unlikely. If "strong"/"very_strong", legal issues are PROMISED during the activating Dasha periods. Cross-reference with traditional legal case periods for highest accuracy.` : 'Nadi litigation analysis not available'}

OUTPUT: 1. Enemy profile from the data 2. Legal indicators 3. Legal case periods with dates 4. Protection advice from the engine 5. Property dispute risk from cross-reference

Write AT LEAST 5-8 detailed paragraphs (each 3-6 sentences). For each legal risk period, describe what kind of dispute might arise, how to prepare, and protective measures. Describe the enemy profile in vivid, practical terms.

REMINDER: Plain language — avoid technical chart jargon.
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English or Tamil word. දෙමළ (Tamil) අකුරු හෝ වචන කිසිසේත් භාවිතා නොකරන්න.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish (Sinhala words in English letters).' : 'Write in direct, protective English.'}`,
    },

    education: {
      title: 'Education & Knowledge Path',
      prompt: `Translate the following education data. State academic strength, suggested fields, study periods, and competitive exam indication from the data.

REMINDER: Clear and honest. If Sinhala (si), use 100% pure Sinhala with no English or Tamil (දෙමළ) words mixed in.

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

EDUCATION HOUSE STRENGTH DATA:
- 4th house (foundational education): Strength ${sectionData?.fourthHouse?.strengthScore || 'N/A'}/100, AV ${sectionData?.fourthHouse?.ashtakavargaBindus || 'N/A'} (${sectionData?.fourthHouse?.ashtakavargaQuality || 'N/A'})
- 5th house (intellect/creativity): Strength ${sectionData?.fifthHouse?.strengthScore || 'N/A'}/100, AV ${sectionData?.fifthHouse?.ashtakavargaBindus || 'N/A'} (${sectionData?.fifthHouse?.ashtakavargaQuality || 'N/A'})
- 9th house (higher education): Strength ${sectionData?.ninthHouse?.strengthScore || 'N/A'}/100, AV ${sectionData?.ninthHouse?.ashtakavargaBindus || 'N/A'} (${sectionData?.ninthHouse?.ashtakavargaQuality || 'N/A'})

CROSS-REFERENCE DATA:
- Mercury Shadbala: ${allSections?.mentalHealth?.mercuryShadbala ? `${allSections.mentalHealth.mercuryShadbala.percentage}% — ${allSections.mentalHealth.mercuryShadbala.strength}` : 'N/A'}
- Moon Shadbala: ${allSections?.mentalHealth?.moonShadbala ? `${allSections.mentalHealth.moonShadbala.percentage}% — ${allSections.mentalHealth.moonShadbala.strength}` : 'N/A'}
- D24 Education Chart: ${allSections?.mentalHealth?.education?.chaturvimshamsha ? `D24 Lagna: ${allSections.mentalHealth.education.chaturvimshamsha.d24Lagna}, Mercury D24: ${allSections.mentalHealth.education.chaturvimshamsha.d24Mercury}, Jupiter D24: ${allSections.mentalHealth.education.chaturvimshamsha.d24Jupiter}` : 'N/A'}
- Education Assessment: ${allSections?.mentalHealth?.education?.assessment || 'N/A'}
- 4th Lord (foundation): ${allSections?.mentalHealth?.education?.fourthLord || 'N/A'} in house ${allSections?.mentalHealth?.education?.fourthLordHouse || 'N/A'}
- 5th Lord (intellect): ${allSections?.mentalHealth?.education?.fifthLord || 'N/A'} in house ${allSections?.mentalHealth?.education?.fifthLordHouse || 'N/A'}
- Mental stability: ${allSections?.mentalHealth?.mentalStability || 'N/A'}
- Career suggested: ${(allSections?.career?.suggestedCareers || []).slice(0, 5).join(', ') || 'N/A'}
- Career primary paths: ${(allSections?.career?.primaryCareers || []).join(', ') || 'N/A'}
- Nadi career type: ${allSections?.career?.nadiCareer?.careerType?.type || 'N/A'}
- Nadi career sectors: ${(allSections?.career?.nadiCareer?.careerSectors || []).map(s => s.planet + '→' + s.sector).join(', ') || 'N/A'}

⛔ MANDATORY EDUCATION↔CAREER CONSISTENCY CHECK:
- Education→Career alignment from core themes: (see CORE THEMES above — "Education→Career Alignment" field)
⚠️ YOUR EDUCATION NARRATIVE MUST LOGICALLY LEAD TOWARD THE CAREER DATA. If the career engine says "IT, software" you CANNOT suggest "Ancient History" as the primary education field unless you explicitly explain the connection. The education fields you emphasize must be the FOUNDATION for the career paths indicated above. If education and career planets genuinely point to different domains, acknowledge the pivot explicitly: "Your education may begin in [field A] but your career naturally gravitates toward [field B] because..."

═══ NADI ASTROLOGY EDUCATION ANALYSIS (Sub-Lord Methodology) ═══
${sectionData?.nadiEducation ? `- Nadi Education Verdict: ${sectionData.nadiEducation.verdict} (${sectionData.nadiEducation.strength})
- Overall Nadi Grade: ${sectionData.nadiEducation.overallGrade}
- Best Dasha for education: ${(sectionData.nadiEducation.bestDashaPlanets || []).join(', ') || 'N/A'}
- Strong education planets: ${(sectionData.nadiEducation.strongPlanets || []).join(', ') || 'N/A'}
- Nadi suggested fields: ${(sectionData.nadiEducation.suggestedFields || []).slice(0, 8).join(', ') || 'N/A'}
USE THIS: The Nadi grade (A/B/C/D/F) indicates education quality. Best Dasha planets indicate WHEN academic peaks occur.` : 'Nadi education analysis not available'}

OUTPUT: 1. Academic strength assessment 2. Intellect and wisdom strength from the data 3. Suggested study fields 4. Best study periods with dates 5. Foreign study indication 6. Competitive exam suitability

Write AT LEAST 6-8 detailed paragraphs (each 3-6 sentences). For each study field, explain WHY it suits this person. For study periods, give specific years and what kind of academic success to expect. Describe their learning style and intellectual strengths vividly.

REMINDER: Plain language — avoid technical chart jargon.
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English or Tamil word. දෙමළ (Tamil) අකුරු හෝ වචන කිසිසේත් භාවිතා නොකරන්න.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish (Sinhala words in English letters).' : 'Write in motivating, practical English.'}`,
    },

    luck: {
      title: 'Luck & Unexpected Fortunes',
      prompt: `Translate the following luck engine data. State the overall luck score, lucky periods, lucky numbers/days, lottery indication, and inheritance indication directly from the data.

REMINDER: Clear and honest. If Sinhala (si), use 100% pure Sinhala with no English or Tamil (දෙමළ) words mixed in.

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
- Strength Score: ${sectionData?.ninthHouse?.strengthScore || 'N/A'}/100 — ${(sectionData?.ninthHouse?.strengthScore || 0) >= 65 ? 'POWERFUL fortune sector — luck actively supports this person' : (sectionData?.ninthHouse?.strengthScore || 0) >= 45 ? 'MODERATE fortune — luck works when effort is applied' : 'CHALLENGED fortune sector — luck comes through hard work, not windfalls'}
- Ashtakavarga Bindus: ${sectionData?.ninthHouse?.ashtakavargaBindus || 'N/A'} (${sectionData?.ninthHouse?.ashtakavargaQuality || 'N/A'})
- Planets in 9th: ${(sectionData?.ninthHouse?.planetsInHouse || []).join(', ') || 'Empty'}
- 9th Lord: ${sectionData?.ninthHouse?.rashiLord || 'N/A'} in house ${sectionData?.ninthHouse?.lordHouse || 'N/A'}

CROSS-REFERENCE DATA:
- 5th house (speculation/games): Strength ${sectionData?.fifthHouse?.strengthScore || 'N/A'}/100, AV ${sectionData?.fifthHouse?.ashtakavargaBindus || 'N/A'} (${sectionData?.fifthHouse?.ashtakavargaQuality || 'N/A'}) — ${(sectionData?.fifthHouse?.strengthScore || 0) >= 65 ? 'Strong speculation sector — games of chance may favor this person' : 'Standard speculation potential'}
- 11th house (gains/wishes): Strength ${sectionData?.eleventhHouse?.strengthScore || 'N/A'}/100, AV ${sectionData?.eleventhHouse?.ashtakavargaBindus || 'N/A'} (${sectionData?.eleventhHouse?.ashtakavargaQuality || 'N/A'}) — ${(sectionData?.eleventhHouse?.ashtakavargaBindus || 0) >= 30 ? 'STRONG gains sector — wishes and aspirations tend to manifest' : 'Standard gains potential'}
- Dhana yogas (wealth combos): ${(allSections?.career?.dhanaYogas || []).join(' | ') || 'None'}
- Financial risk periods: ${(allSections?.financial?.losses?.riskPeriods || []).map(p => p.lord + ': ' + p.period).join(' | ') || 'None'}
- 8th house (sudden events): ${allSections?.financial?.losses?.eighthHouse?.strength || 'N/A'}, Score: ${allSections?.financial?.losses?.eighthHouse?.strengthScore || 'N/A'}/100
- Lagna gem: ${allSections?.remedies?.lagnaGem || 'N/A'}
- Lagna day: ${allSections?.remedies?.lagnaDay || 'N/A'}
- Past karma theme: ${allSections?.spiritual?.pastKarmaTheme || 'N/A'} (karmic luck patterns)
- Spiritual inclination: ${allSections?.spiritual?.spiritualInclination || 'N/A'}

═══ NADI ASTROLOGY LUCK & WINDFALL ANALYSIS (Sub-Lord Methodology) ═══
${sectionData?.nadiLuck ? `- Windfall Verdict: ${sectionData.nadiLuck.windfallVerdict || 'N/A'} (${sectionData.nadiLuck.windfallStrength || 'N/A'})
- Windfall-activating planets: ${(sectionData.nadiLuck.windfallPlanets || []).join(', ') || 'N/A'}
- Best Dasha for windfalls: ${(sectionData.nadiLuck.windfallBestDasha || []).join(', ') || 'N/A'}
- Wealth Verdict: ${sectionData.nadiLuck.wealthVerdict || 'N/A'} (${sectionData.nadiLuck.wealthStrength || 'N/A'})
- NOTE: Nadi methodology: Windfall in DBA of planets signifying 8,11. Wealth via 2,6,10,11.
USE THIS: Windfall verdict tells if UNEARNED income (lottery, inheritance, insurance, PF) is promised. Best Dasha planets tell WHEN windfalls come. Cross-reference with lottery indication for precision.` : 'Nadi luck analysis not available'}

OUTPUT: 1. Overall luck score 2. Lucky periods with dates 3. Lucky numbers and days 4. Lottery indication - honest assessment 5. Inheritance indication 6. Fortune sector strength

Write AT LEAST 6-8 detailed paragraphs (each 3-6 sentences). For each lucky period, describe what kind of luck to expect and how to maximize it. For lottery indication, be brutally honest. For lucky numbers, explain how to use them practically.

REMINDER: Plain language — avoid technical chart jargon.
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English or Tamil word. දෙමළ (Tamil) අකුරු හෝ වචන කිසිසේත් භාවිතා නොකරන්න.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish (Sinhala words in English letters).' : 'Write in exciting, hopeful English.'}`,
    },

    surpriseInsights: {
      title: 'Surprise Insights About You',
      prompt: `ANALYZE the following prediction data deeply. Do NOT just list each field — THINK about what combinations reveal about this person. Cross-reference multiple data points to find HIGH-CONFIDENCE insights that will make the reader say "How did they know that?"

ACCURACY RULES FOR THIS SECTION:
1. Body marks: ONLY state locations from the data — these are verifiable, so accuracy matters most here
2. Sibling count: State the EXACT number from the data. If the data says 3 siblings, say 3. Do NOT round or hedge.
3. Parent profiles: The engine text is already analyzed — translate faithfully, do NOT reinterpret
4. Partner letter: The TOP 3 letters are weighted by 6 methods — present them with confidence
5. Life shift moments: These are AGE-SPECIFIC — the reader will check these against their real life. Only include ages that the data provides.
6. For appearance, sleep, food, handedness — these are verifiable facts. Be specific, not vague.
7. CROSS-CHECK: If the attachment style says "anxious" but the social battery says "introvert" — think about what that COMBINATION means. Write about the combination, not just each field separately.

REMINDER: Stick to the data. If Sinhala (si), use 100% pure Sinhala with no English or Tamil (දෙමළ) words mixed in.

Birth details: Born under ${lagnaEn} rising, Moon in ${moonEn}, Nakshatra: ${nakshatraName}
Current life period: ${currentDasha} main period, ${currentAD} sub-period

━━━ COMPLETE SURPRISE INSIGHTS ENGINE DATA (USE ALL — NO HALLUCINATION) ━━━

PHYSICAL APPEARANCE: ${sectionData?.appearance ? `Build: ${sectionData.appearance.build || 'N/A'}, Complexion: ${sectionData.appearance.complexion || 'N/A'}, Face: ${sectionData.appearance.faceShape || 'N/A'}, Eyes: ${sectionData.appearance.eyes || 'N/A'}, Height: ${sectionData.appearance.height || 'N/A'}, Distinctive: ${sectionData.appearance.distinctive || 'N/A'}` : 'N/A'}

BODY MARKS/SCARS:
${(sectionData?.bodyMarks || []).map((m, i) => `${i+1}. ${m.location || m} — ${m.type || 'mark/mole'}${(m.location || m || '').includes('D3') || (m.location || m || '').includes('Drekkana') ? ' [PRECISE — from D3 Drekkana divisional chart analysis]' : ''}`).join('\n') || 'None predicted'}
NOTE: Body marks now use DUAL analysis — traditional house placement AND D3 Drekkana divisional chart. D3-based marks are especially precise for locating scars, moles, and birthmarks on specific body parts.

NUMBER OF SIBLINGS: ${sectionData?.numberOfSiblings || 'N/A'}
FATHER PROFILE: ${sectionData?.fatherProfile || 'N/A'}
MOTHER PROFILE: ${sectionData?.motherProfile || 'N/A'}

SLEEP PATTERN: ${sectionData?.sleepPattern || 'N/A'}
FOOD PREFERENCE: ${sectionData?.foodPreference || 'N/A'}
PET AFFINITY: ${sectionData?.petAffinity || 'N/A'}
HANDEDNESS: ${sectionData?.handedness || 'N/A'}
HIDDEN TALENT: ${sectionData?.hiddenTalent || 'N/A'}
SOUL PURPOSE: ${sectionData?.soulPurpose || 'N/A'}

PARTNER'S FIRST LETTER — WEIGHTED MULTI-METHOD (6 sources):
- ⭐ TOP 3 PREDICTED: ${(sectionData?.partnerFirstLetter?.topLetters || []).join(', ') || 'N/A'}
- All possible: ${(sectionData?.partnerFirstLetter?.allPossibleLetters || []).join(', ') || 'N/A'}
- Scoring: ${sectionData?.partnerFirstLetter?.note || 'N/A'}

CROSS-REFERENCE DATA:
- Estimated children: ${allSections?.children?.estimatedChildren?.count || 'N/A'} (${allSections?.children?.estimatedChildren?.genderTendency || 'N/A'})
- Siblings from familyPortrait: count ${allSections?.familyPortrait?.siblings?.estimatedCount?.count || 'N/A'}, elder ${allSections?.familyPortrait?.siblings?.estimatedCount?.estimatedElderSiblings || 'N/A'}, younger ${allSections?.familyPortrait?.siblings?.estimatedCount?.estimatedYoungerSiblings || 'N/A'}
- Mental stability: ${allSections?.mentalHealth?.mentalStability || 'N/A'}
- Childhood trauma level: ${allSections?.mentalHealth?.childhoodTrauma?.level || 'N/A'} (${allSections?.mentalHealth?.childhoodTrauma?.score || 0}/${allSections?.mentalHealth?.childhoodTrauma?.maxScore || 17})
${allSections?.mentalHealth?.childhoodTrauma?.indicators?.length ? '- Trauma indicators: ' + allSections.mentalHealth.childhoodTrauma.indicators.join(' | ') : ''}
- Depression risk: ${allSections?.mentalHealth?.depressionRisk?.level || 'N/A'}
- Marriage afflictions: ${allSections?.marriage?.marriageAfflictions?.severity || 'N/A'}${allSections?.marriage?.marriageAfflictions?.isMarriageDenied ? ' ⛔ MARRIAGE DENIED — partner letter predictions still valid (describes potential partner if they were to meet someone) but frame as hypothetical' : ''}

━━━ HOW TO USE THIS DATA (NO GUESSING ALLOWED) ━━━
- Body marks → state only locations given in the data
- Partner letter → TOP 3 letters go FIRST; present all possible letters as secondary options. ${allSections?.marriage?.marriageAfflictions?.isMarriageDenied ? 'NOTE: Marriage is denied, so frame partner letter as "if you were to meet someone, their name would likely start with..."' : 'State with confidence.'}
- Sibling count → state clearly from the data, don't hedge
- Father/Mother profile → translate the engine text faithfully
- Sleep pattern → only if present in the data above
- Soul purpose → from the soul purpose field when present

⚠️ ENHANCED ACCURACY DATA (USE THESE FOR HIGHER PRECISION):

PARTNER LETTER — 6-METHOD WEIGHTED SCORING:
${sectionData?.partnerFirstLetter?.topLetters ? `⭐ TOP 3 LETTERS: ${sectionData.partnerFirstLetter.topLetters.join(', ')} — present these FIRST with highest confidence` : ''}
${(sectionData?.partnerFirstLetter?.letterDetails || []).map(d => `  ${d.letter}: score ${d.score} (from: ${d.sources.join(' + ')})`).join('\n')}
${sectionData?.partnerFirstLetter?.allPossibleLetters?.length > 3 ? `Secondary letters: ${sectionData.partnerFirstLetter.allPossibleLetters.slice(3).join(', ')}` : ''}

SIBLING COUNT: The number ${sectionData?.numberOfSiblings || 'N/A'} is based on multi-factor scoring (3rd house planets, aspects, lord strength, lord placement). Present this with confidence.

FATHER PROFILE: "${sectionData?.fatherProfile || 'N/A'}" — based on multi-factor analysis (Sun strength, Sun house, 9th lord house, angular/dusthana analysis). Be detailed about the father.

MOTHER PROFILE: "${sectionData?.motherProfile || 'N/A'}" — based on multi-factor analysis (Moon strength, 4th house, Moon house, 4th lord house). Be detailed about the mother.

EMOTIONAL PATTERN: "${allSections?.mentalHealth?.mentalStability || 'N/A'}" — this reveals whether the person had childhood emotional struggles, trauma, or a difficult home environment. If this indicates Moon-Saturn conjunction or childhood trauma, WEAVE IT into the family section — mention that the home environment may have been emotionally cold or difficult.

CHILDHOOD TRAUMA LEVEL: ${allSections?.mentalHealth?.childhoodTrauma?.level || 'N/A'} (Score: ${allSections?.mentalHealth?.childhoodTrauma?.score || 0}/${allSections?.mentalHealth?.childhoodTrauma?.maxScore || 17})
${allSections?.mentalHealth?.childhoodTrauma?.indicators?.length ? 'TRAUMA INDICATORS:\n' + allSections.mentalHealth.childhoodTrauma.indicators.map(i => '  🔴 ' + i).join('\n') : 'No childhood trauma indicators'}
${allSections?.mentalHealth?.childhoodTrauma?.level === 'SEVERE' || allSections?.mentalHealth?.childhoodTrauma?.level === 'HIGH' ? '\n🚨 THIS PERSON HAD A DIFFICULT CHILDHOOD. The engine detected multiple layers of early-life suffering. When writing about the MOTHER and FATHER, you MUST acknowledge this pain. Describe the ACTUAL family dynamics — cold/absent/struggling parents, emotional neglect, disrupted home — based on the indicators above. Do NOT write a generic happy family narrative when the data shows trauma.' : ''}

DEPRESSION RISK: ${allSections?.mentalHealth?.depressionRisk?.level || 'N/A'} — if HIGH, the family environment contributed. Acknowledge this in the family narrative.

SOUL PURPOSE: "${sectionData?.soulPurpose ? (typeof sectionData.soulPurpose === 'object' ? `${sectionData.soulPurpose.planet} in ${sectionData.soulPurpose.rashi} — ${sectionData.soulPurpose.meaning}` : sectionData.soulPurpose) : 'N/A'}"
KARAKAMSHA (Soul's deepest craving): ${sectionData?.soulPurpose?.karakamsha || 'N/A'} — THIS is the most specific soul description. Use it to paint a vivid picture of what this person's soul truly wants in this lifetime.

═══ LOVE LANGUAGE & ATTACHMENT STYLE ═══
- Primary Love Language: ${sectionData?.loveLanguage?.primary || 'N/A'}
- Attachment Style: ${sectionData?.loveLanguage?.attachment || 'N/A'} — ${sectionData?.loveLanguage?.attachDetail || ''}
- Jealousy Level: ${sectionData?.loveLanguage?.jealousy?.level || 'N/A'} (Score: ${sectionData?.loveLanguage?.jealousy?.score || 0})
- First Love Timing: ${sectionData?.loveLanguage?.firstLoveAge || 'N/A'}

═══ DAILY BEHAVIOR PROFILE ═══
- Chronotype: ${sectionData?.dailyBehavior?.chronotype || 'N/A'}
- Social Battery: ${sectionData?.dailyBehavior?.socialBattery || 'N/A'}
- Stress Response: ${sectionData?.dailyBehavior?.stressResponse || 'N/A'}
- Decision-Making Style: ${sectionData?.dailyBehavior?.decisionStyle || 'N/A'}
- Phone Habits: ${sectionData?.dailyBehavior?.phoneHabit || 'N/A'}

═══ ANGER & EMOTIONAL STYLE ═══
- Anger Style: ${sectionData?.emotionalStyle?.angerStyle || 'N/A'}
- Crying Trigger: ${sectionData?.emotionalStyle?.cryingTrigger || 'N/A'}

═══ LUCKY PROFILE ═══
- Lucky Numbers: ${(sectionData?.luckyProfile?.luckyNumbers || []).join(', ') || 'N/A'}
- Lucky Colors: ${sectionData?.luckyProfile?.luckyColors || 'N/A'}
- Lucky Day: ${sectionData?.luckyProfile?.luckyDay || 'N/A'}
- Lucky Gemstone: ${sectionData?.luckyProfile?.luckyGemstone || 'N/A'}
- Lucky Direction: ${sectionData?.luckyProfile?.luckyDirection || 'N/A'}
- Strongest Planet: ${sectionData?.luckyProfile?.strongestPlanet || 'N/A'}

═══ PUBLIC MASK vs PRIVATE SELF ═══
- Public Persona: ${sectionData?.publicVsPrivate?.publicMask || 'N/A'}
- Private Inner Self: ${sectionData?.publicVsPrivate?.privateSelf || 'N/A'}
- Contrast Level: ${sectionData?.publicVsPrivate?.contrastLevel || 'N/A'}
- What They Hide: ${sectionData?.publicVsPrivate?.hiddenSelf || 'N/A'}

═══ MONEY PERSONALITY ═══
- Money Archetype: ${sectionData?.moneyPersonality?.archetype || 'N/A'}
- Impulse Buying: ${sectionData?.moneyPersonality?.impulseBuying || 'N/A'} (Score: ${sectionData?.moneyPersonality?.impulseScore || 0})

═══ LIFE SHIFT MOMENTS (Age-Specific "How Did You Know" Anchors) ═══
${(sectionData?.lifeShiftMoments || []).map(s => `- ${s.description}`).join('\n') || 'No major life shifts calculated'}

═══ ADDICTION VULNERABILITIES ═══
${(sectionData?.addictionProfile || []).map((a, i) => `${i+1}. ${a}`).join('\n') || 'No vulnerabilities flagged'}

═══ COMPATIBILITY QUICK-CARDS ═══
- Best Friend Sign: ${sectionData?.compatibilityCards?.bestFriendSign || 'N/A'}
- Worst Enemy Sign: ${sectionData?.compatibilityCards?.worstEnemySign || 'N/A'}
- Ideal Boss Sign: ${sectionData?.compatibilityCards?.idealBossSign || 'N/A'}
- Romantic Chemistry Sign: ${sectionData?.compatibilityCards?.romanticChemistry || 'N/A'}
- Life Partner Sign: ${sectionData?.compatibilityCards?.lifePartnerSign || 'N/A'}

═══ NADI CROSS-REFERENCES (for enriching surprise insights) ═══
- Nadi Career: ${allSections?.career?.nadiCareer?.careerType || 'N/A'} | Sectors: ${(allSections?.career?.nadiCareer?.careerSectors || []).slice(0, 3).map(s => s.sector || s.planet).join(', ') || 'N/A'}
- Nadi Marriage: ${allSections?.marriage?.nadiMarriage?.verdict || 'N/A'} (${allSections?.marriage?.nadiMarriage?.strength || 'N/A'})
- Nadi Health longevity: ${allSections?.health?.nadiHealth?.longevityEstimate?.estimatedYears || 'N/A'}yr
- Nadi Education: ${(allSections?.education?.nadiEducation?.suggestedFields || []).slice(0, 3).join(', ') || 'N/A'}
USE: Nadi verdicts CONFIRM or DENY surprise insights. If Nadi marriage is WEAK and second marriage score is HIGH, the combination is VERY strong evidence for relationship disruption.

═══ 🔥 SECOND MARRIAGE & DIVORCE ANALYSIS ═══
- Second Marriage Probability: ${sectionData?.secondMarriage?.probability || 'N/A'}
- Divorce Risk: ${sectionData?.secondMarriage?.divorceRisk || 'N/A'}
- Score: ${sectionData?.secondMarriage?.score || 0}/15
- 7th House Sign: ${sectionData?.secondMarriage?.h7Rashi || 'N/A'}
- Key Indicators:
${(sectionData?.secondMarriage?.reasons || []).map((r, i) => `  ${i+1}. ${r}`).join('\n') || '  None'}

═══ 🔥 MONASTIC / RENUNCIATION TENDENCY (Sanyasa Yoga) ═══
- Monk/Renunciation Score: ${sectionData?.monasticTendency?.score || 0}
- Tendency Level: ${sectionData?.monasticTendency?.tendency || 'N/A'}
- Trigger Period: ${sectionData?.monasticTendency?.monasticAge || 'N/A'}
- Indicators:
${(sectionData?.monasticTendency?.indicators || []).map((ind, i) => `  ${i+1}. ${ind}`).join('\n') || '  None'}

═══ 🔥 FAME & PUBLIC RECOGNITION POTENTIAL ═══
- Fame Level: ${sectionData?.famePotential?.level || 'N/A'}
- Fame Score: ${sectionData?.famePotential?.score || 0}
- Indicators:
${(sectionData?.famePotential?.indicators || []).map((ind, i) => `  ${i+1}. ${ind}`).join('\n') || '  None'}

═══ 🔥 WEALTH CLASS PREDICTION ═══
- Predicted Wealth Level: ${sectionData?.wealthClass?.wealthLevel || 'N/A'}
- Score: ${sectionData?.wealthClass?.score || 0}

═══ 🔥 PAST LIFE STORY (Based on Ketu & Rahu Positions) ═══
- Ketu in House: ${sectionData?.pastLifeStory?.ketuHouse || 'N/A'} | Rahu in House: ${sectionData?.pastLifeStory?.rahuHouse || 'N/A'}
- Past Life: ${sectionData?.pastLifeStory?.pastLife || 'N/A'}
- Karmic Lesson: ${sectionData?.pastLifeStory?.lesson || 'N/A'}
- Past-Life Talent: ${sectionData?.pastLifeStory?.talent || 'N/A'}
- Future Direction (Rahu path): ${sectionData?.pastLifeStory?.futureDirection || 'N/A'}

═══ 🔥 DANGER PERIODS (Crisis/Accident Risk Windows) ═══
${(sectionData?.dangerPeriods || []).map((d, i) => `${i+1}. ${d.type} — ${d.period} | Severity: ${d.severity}\n   Advice: ${d.advice}`).join('\n') || 'No major danger periods'}

═══ 🔥 SPIRIT ANIMAL ═══
- Your Spirit Animal: ${sectionData?.spiritAnimal?.animal || 'N/A'}
- Why: ${sectionData?.spiritAnimal?.meaning || 'N/A'}

═══ 🔥 CELEBRITY CHART TWIN ═══
- Celebrity Match: ${sectionData?.celebrityTwin?.name || 'N/A'}
- Why: ${sectionData?.celebrityTwin?.reason || 'N/A'}

═══ 🔥 YOUR GOLDEN PERIOD (Peak Life Phase) ═══
- ${sectionData?.goldenPeriod?.description || 'N/A'}
- Peak Age: ${sectionData?.goldenPeriod?.peakAge || 'N/A'}
- Ruling Planet: ${sectionData?.goldenPeriod?.lord || 'N/A'}

OUTPUT: Write AT LEAST 25-30 rich, detailed paragraphs covering ALL the data below. This is the MOST PERSONAL and VIRAL section — people screenshot this and share it on social media. Make it feel like a psychic reading, not a report.

SECTION STRUCTURE (dedicate a FULL paragraph to each):
1. **Physical appearance** — paint a vivid picture from the data
2. **Body marks/scars** — state exact locations from the data
3. **Number of siblings** — from the data
4. **Father profile** — describe as a real person
5. **Mother profile** — describe as a real person
6. **Partner's first letter** — top 3 weighted letters with explanation
7. **Hidden talent** — from the data
8. **Soul purpose** — from the soul purpose and karakamsha data
9. **Love language & attachment** — how they love, their attachment style, jealousy level, first love age. This is INCREDIBLY personal — people will feel called out.
10. **Daily behavior** — morning/night owl, social battery, decision style, phone habits. People LOVE seeing their daily habits predicted.
11. **Anger & crying** — how they express anger and what makes them cry. This is the "HOW DID YOU KNOW" moment. Be specific.
12. **Public mask vs private self** — who they show the world vs who they really are. The contrast is what makes people share this. Include what they hide from everyone.
13. **Money personality** — spender vs saver archetype, impulse buying. People identify strongly with their money habits.
14. **Life shift moments** — list 3-5 specific ages where major shifts happened. Use "Around age X..." phrasing. People will check these against their real life and be amazed.
15. **Addiction vulnerabilities** — what they're most susceptible to. Frame compassionately but honestly.
16. **Lucky profile** — numbers, colors, day, gemstone, direction. People use these in daily life.
17. **Compatibility cards** — best friend sign, enemy sign, boss sign, romance sign. Highly shareable.
18. 🔥 **Second Marriage & Divorce** — Will they have a second marriage? What's the divorce risk? State the probability DIRECTLY without softening. If LOW, say "low" in one sentence. If HIGH, explain exactly WHY and WHEN divorce/second marriage is most likely. Do NOT sugarcoat — this is the #1 question people ask astrologers and they want the TRUTH.
19. 🔥 **Monk or Renunciation** — Do they have the chart of a monk/nun? Will they ever "leave everything behind"? Even if LOW, discuss their relationship with spirituality vs material life. If HIGH, this becomes the most dramatic paragraph in the report.
20. 🔥 **Fame Potential** — Will they be famous? How and where? Celebrity level or local recognition? People LOVE hearing about their fame potential.
21. 🔥 **Wealth Class Prediction** — What economic class does their chart indicate? Be direct. People want to know if they'll be rich.
22. 🔥 **Past Life Story** — Who were they in their past life? What karmic lesson are they learning? What talent did they bring? This is DEEPLY engaging — write it like a short story.
23. 🔥 **Danger Periods** — When should they be extra careful? Accident-prone years, health crisis windows. Frame as protective advice, not doom.
24. 🔥 **Spirit Animal** — What animal represents their cosmic energy? Fun, shareable, and memorable.
25. 🔥 **Celebrity Chart Twin** — Which famous person shares their chart energy? People LOVE this and will share it instantly.
26. 🔥 **Golden Period** — The BEST years of their life. When everything clicks. People mark these dates and tell their friends.
27. **🔥 The Cosmic Roast** — END with a funny, affectionate roasting paragraph using the planetary roasts below. Like a best friend exposing you lovingly.

Skip any area where data is N/A. Do NOT add generic predictions not supported by the data.

🔥 PLANETARY ROASTS (use 2-3 of these for the Cosmic Roast paragraph at the end):
${(sectionData?.planetaryRoasts || []).map(r => `- [${r.source}]: "${r.roast}"`).join('\n') || 'No roast data available'}

REMINDER: Plain language — no technical chart jargon.
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English or Tamil word. දෙමළ (Tamil) අකුරු හෝ වචන කිසිසේත් භාවිතා නොකරන්න.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish (Sinhala words in English letters).' : 'Write in clear, conversational English.'}`,
    },

    familyPortrait: {
      title: '👨‍👩‍👧‍👦 Deep Family Portrait — Parents, Siblings & Family Karma',
      prompt: `Translate the following family data into an honest, vivid family portrait. Describe each family member as a REAL person. Be honest about difficult dynamics when the data shows them.

━━━ MOTHER ━━━
- Personality: ${sectionData?.mother?.personality || 'N/A'}
- Occupation: ${sectionData?.mother?.occupation || 'N/A'}
- Moon strength: ${sectionData?.mother?.moonShadbala ? `${sectionData.mother.moonShadbala.percentage}% — ${sectionData.mother.moonShadbala.strength}` : 'N/A'}
- Mother significator: ${sectionData?.mother?.matrukaraka || 'N/A'}
- D12 parent chart: ${sectionData?.mother?.d12ParentChart ? JSON.stringify(sectionData.mother.d12ParentChart) : 'N/A'}
- Family separation: ${sectionData?.mother?.familySeparation || 'N/A'}
- Health risks: ${JSON.stringify(sectionData?.mother?.healthRisks || [])}
- Top 3 most vulnerable organs: ${JSON.stringify(sectionData?.mother?.healthRisks?.slice(0, 3) || [])}
- Health crisis windows (by native's age): ${JSON.stringify(sectionData?.mother?.healthCrisisWindows || [])}
- Health event periods: ${JSON.stringify(sectionData?.mother?.motherHealthPeriods || [])}
- Life struggles: ${JSON.stringify(sectionData?.mother?.lifestrug || [])}
- Your bond with mother: ${sectionData?.mother?.bond || 'N/A'}
- Remedies: ${JSON.stringify(sectionData?.mother?.remedies || [])}

━━━ FATHER ━━━
- Personality: ${sectionData?.father?.personality || 'N/A'}
- Career: ${sectionData?.father?.fatherCareer || 'N/A'}
- Sun strength: ${sectionData?.father?.sunShadbala ? `${sectionData.father.sunShadbala.percentage}% — ${sectionData.father.sunShadbala.strength}` : 'N/A'}
- Father significator: ${sectionData?.father?.pitrakaraka || 'N/A'}
- D12 parent chart: ${sectionData?.father?.d12ParentChart ? JSON.stringify(sectionData.father.d12ParentChart) : 'N/A'}
- Health risks: ${JSON.stringify(sectionData?.father?.healthRisks || [])}
- Life struggles: ${JSON.stringify(sectionData?.father?.lifestrug || [])}
- Father event periods: ${JSON.stringify(sectionData?.father?.fatherEventPeriods || [])}
- Your bond with father: ${sectionData?.father?.bond || 'N/A'}
- Remedies: ${JSON.stringify(sectionData?.father?.remedies || [])}

━━━ SIBLINGS ━━━
- Estimated count: ${sectionData?.siblings?.estimatedCount?.count || 'N/A'}
- Elder: ${sectionData?.siblings?.estimatedCount?.estimatedElderSiblings || 'N/A'}, Younger: ${sectionData?.siblings?.estimatedCount?.estimatedYoungerSiblings || 'N/A'}
- Gender breakdown: ${sectionData?.siblings?.estimatedCount?.gender || 'N/A'}
- Brother karaka: ${sectionData?.siblings?.estimatedCount?.brotherKaraka || 'N/A'}, Sister karaka: ${sectionData?.siblings?.estimatedCount?.sisterKaraka || 'N/A'}
- Sibling significator: ${sectionData?.siblings?.bhratrkaraka || 'N/A'}
- D3 sibling chart: ${sectionData?.siblings?.d3SiblingChart ? JSON.stringify(sectionData.siblings.d3SiblingChart) : 'N/A'}
- Characters: ${JSON.stringify(sectionData?.siblings?.characters || [])}
- Health risks: ${JSON.stringify(sectionData?.siblings?.healthRisks || [])}
- Life struggles: ${JSON.stringify(sectionData?.siblings?.lifestrug || [])}
- Event periods: ${JSON.stringify(sectionData?.siblings?.eventPeriods || [])}
- Your relationship: ${sectionData?.siblings?.relationship || 'N/A'}
- Remedies: ${JSON.stringify(sectionData?.siblings?.remedies || [])}

━━━ FAMILY KARMA ━━━
- Family karma: ${JSON.stringify(sectionData?.familyKarmaSummary || [])}
- Inherited traits: ${JSON.stringify(sectionData?.inheritedTraits || [])}

━━━ CROSS-REFERENCE ━━━
- Children: ${allSections?.children?.estimatedChildren?.count || 'N/A'} (${allSections?.children?.estimatedChildren?.genderTendency || 'N/A'})
- Childhood trauma: ${allSections?.mentalHealth?.childhoodTrauma?.level || 'N/A'} (${allSections?.mentalHealth?.childhoodTrauma?.score || 0}/${allSections?.mentalHealth?.childhoodTrauma?.maxScore || 17})
${allSections?.mentalHealth?.childhoodTrauma?.indicators?.length ? allSections.mentalHealth.childhoodTrauma.indicators.map(i => '  🔴 ' + i).join('\n') : ''}
- Depression risk: ${allSections?.mentalHealth?.depressionRisk?.level || 'N/A'}
- Mental stability: ${allSections?.mentalHealth?.mentalStability || 'N/A'}
- Marriage afflictions: ${allSections?.marriage?.marriageAfflictions?.severity || 'N/A'} (family dynamics often echo in marriage patterns)
- Retrograde planets: ${(allSections?.personality?.retrogradePlanets || []).filter(r => [4, 9, 3].includes(r.house)).map(r => r.name + ' in house ' + r.house + ' — past-life family karma').join(', ') || 'None in family houses'}

═══ NADI CROSS-REFERENCES ═══
- Nadi Marriage strength: ${allSections?.marriage?.nadiMarriage?.strength || 'N/A'} (strong = stable family foundation, weak = family stress)
- Nadi Health longevity: ${allSections?.health?.nadiHealth?.longevityEstimate?.estimatedYears || 'N/A'}yr (context for parent health predictions)
- Nadi Children verdict: ${allSections?.children?.nadiChildren?.verdict || 'N/A'} (strong = family grows, weak = limited family expansion)
USE: Nadi verdicts add confidence to family predictions — if Nadi marriage is weak AND family trauma is high, the family dysfunction pattern is CONFIRMED at multiple levels.

${allSections?.mentalHealth?.childhoodTrauma?.level === 'SEVERE' || allSections?.mentalHealth?.childhoodTrauma?.level === 'HIGH' ? '🚨 CHILDHOOD TRAUMA DETECTED — Multiple indicators of early-life suffering. Do NOT write a generic happy family narrative. Acknowledge emotional disruption in mother section (familySeparation), distance/conflict in father section (bond field), and weave pain into descriptions with compassion.' : ''}

⚠️ CRITICAL: PROBABILISTIC LANGUAGE FOR FAMILY RELATIONSHIPS
The user can IMMEDIATELY verify claims about their living parents. Wrong claims = lost trust = bad reviews.
- For mother bond: If the data suggests "difficult" or "distant", ALWAYS use probabilistic language:
  • Say "there may be phases of emotional complexity" NOT "you have a difficult relationship"
  • Say "communication styles may sometimes differ" NOT "you don't understand each other"
  • Say "your chart suggests some testing phases in this bond — though many with this pattern maintain very close relationships" NOT definitive negative statements
- For father bond: Same rule — hedge all negative claims
- For health risks: Say "watch for" or "be mindful of" NOT "your mother WILL have kidney problems"
- For life struggles: Say "your mother may have faced challenges with..." NOT definitive past-tense claims about events you can't verify

REASON: A user whose mother is perfectly healthy and loving will immediately reject the entire report if you claim the relationship is "difficult." But if you say "there may be phases of emotional adjustment" — that's true for EVERYONE and doesn't trigger rejection.

OUTPUT: Write AT LEAST 10-14 paragraphs (each 3-6 sentences). This is a HERO section.
- AT LEAST 3 paragraphs for MOTHER: personality as a real person, her occupation/daily life, health risks — identify the TOP 3 most vulnerable organs from the health risks data, HIGHLIGHT the single most dangerous one prominently, explain health crisis windows, your bond
- AT LEAST 3 paragraphs for FATHER: personality, career type, health risks, life struggles, your bond
- AT LEAST 2 paragraphs for SIBLINGS: state the EXACT elder and younger count from the engine data — if estimatedElderSiblings > 0 say "you likely have [N] older sibling(s)", if estimatedYoungerSiblings > 0 say "you likely have [N] younger sibling(s)". Use the gender breakdown to specify brothers vs sisters. Describe each sibling's character, health, relationship dynamics. NEVER say "no older siblings" if the estimatedElderSiblings field is > 0.
- AT LEAST 2 paragraphs for FAMILY KARMA: inherited patterns, karmic summary, how family patterns echo in your own life

State sibling count and parent details from the engine fields directly — do not invent drama beyond the data.
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English or Tamil word.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish.' : 'Write in profound, touching English.'}`,
    },

    physicalProfile: {
      title: '🪞 Your Body, Face & Mind Profile',
      prompt: `You are creating the most PERSONAL and SPECIFIC physical profile possible for this person. Use ALL the multi-layer data below — do NOT rely only on Lagna. The engine has cross-referenced 10+ data layers for high accuracy. This is the section where people say "HOW DID THEY KNOW WHAT I LOOK LIKE?!"

CRITICAL ACCURACY RULES:
1. Use ALL layers — Lagna base, planet modifications, Lagna lord dignity, Moon influence, Navamsha, decan, Venus analysis, aspects, and body constitution. Each layer REFINES the prediction.
2. When planets IN the 1st house contradict the base Lagna, the PLANETS WIN. E.g., Saturn in 1st overrides Taurus's "stocky" with "lean/bony."
3. When Lagna lord is exalted/debilitated, it AMPLIFIES or DIMINISHES the base traits significantly.
4. Moon sign determines EMOTIONAL expression on the face — how they LOOK when relaxed, how their face changes with mood.
5. Navamsha Lagna shows how they CHANGE with age — especially after 30-35.
6. Be SPECIFIC — don't say "nice eyes", say "large, calm, almond-shaped eyes with a warm expression."

REMINDER: No astrology jargon. No "Lagna", "1st house", "Navamsha", "Venus dignity." Describe as if you're painting a portrait of a real person.

Birth details: ${lagnaEn} rising, Moon in ${moonEn}, Nakshatra: ${nakshatraName}

━━━ PHYSICAL PROFILE ENGINE DATA (10-LAYER ANALYSIS) ━━━

LAYER 1 — BASE BODY (from rising sign):
- Build: ${sectionData?.base?.build || 'N/A'}
- Height: ${sectionData?.base?.height || 'N/A'}
- Face: ${sectionData?.base?.face || 'N/A'}
- Complexion: ${sectionData?.base?.complexion || 'N/A'}
- Eyes: ${sectionData?.base?.eyes || 'N/A'}
- Hair: ${sectionData?.base?.hair || 'N/A'}
- Nose: ${sectionData?.base?.nose || 'N/A'}
- Lips: ${sectionData?.base?.lips || 'N/A'}
- Body Type: ${sectionData?.base?.bodyType || 'N/A'}
- Walk Style: ${sectionData?.base?.gait || 'N/A'}
- Voice: ${sectionData?.base?.voice || 'N/A'}

LAYER 2 — PLANET MODIFICATIONS (planets in 1st house: ${(sectionData?.planetsIn1st || []).join(', ') || 'None'}):
${(sectionData?.planetModifications || []).map(m => '- ' + m).join('\n') || '- No planets modifying appearance'}
Complexion modifiers: ${(sectionData?.complexionModifiers || []).join(', ') || 'None'}
Height modifiers: ${(sectionData?.heightModifiers || []).join(', ') || 'None'}
Build modifiers: ${(sectionData?.buildModifiers || []).join(', ') || 'None'}

LAYER 3 — RULING PLANET ANALYSIS:
- ${sectionData?.lagnaLord?.name || 'N/A'} (ruling planet): House ${sectionData?.lagnaLord?.house || 'N/A'}, Strength: ${sectionData?.lagnaLord?.score || 'N/A'}%, Dignity: ${sectionData?.lagnaLord?.dignity || 'N/A'}
- Effect: ${sectionData?.lagnaLord?.effect || 'N/A'}

LAYER 4 — EMOTIONAL FACE (from Moon in ${sectionData?.moonSignEnglish || 'N/A'}):
- Resting expression: ${sectionData?.moonFacialExpression || 'N/A'}
- Emotional element: ${sectionData?.moonElement || 'N/A'}

LAYER 5 — AGING PATTERN (from inner chart):
- Inner sign: ${sectionData?.navamshaLagnaEnglish || 'N/A'}
- How you change with age: ${sectionData?.navamshaAppearance || 'N/A'}

LAYER 6 — DECAN MODIFIER:
- Decan ${sectionData?.lagnaDecan || 'N/A'}: ${sectionData?.decanEffect || 'N/A'}

LAYER 7 — BEAUTY ANALYSIS:
- Beauty planet strength: ${sectionData?.venusAnalysis?.score || 'N/A'}%, Dignity: ${sectionData?.venusAnalysis?.dignity || 'N/A'}, House: ${sectionData?.venusAnalysis?.house || 'N/A'}
- ${sectionData?.venusAnalysis?.note || 'N/A'}
- ATTRACTIVENESS SCORE: ${sectionData?.attractivenessScore || 'N/A'}/100 — ${sectionData?.attractivenessLevel || 'N/A'}

LAYER 8 — EXTERNAL INFLUENCES ON APPEARANCE:
${(sectionData?.aspectsOnLagna || []).map(a => '- ' + a).join('\n') || '- No external planetary influences'}

LAYER 9 — MENTAL & PSYCHOLOGICAL PROFILE:
- Mental temperament: ${sectionData?.mentalTemperament || 'N/A'}
- Intellect: ${sectionData?.intellect || 'N/A'} (Mercury: ${sectionData?.mercuryStrength || 'N/A'}%)
- Emotional depth: ${sectionData?.emotionalDepth || 'N/A'} (Moon: ${sectionData?.moonStrength || 'N/A'}%)
- Wisdom: ${sectionData?.wisdom || 'N/A'} (Jupiter: ${sectionData?.jupiterStrength || 'N/A'}%)

LAYER 10 — BODY CONSTITUTION:
- Stamina: ${sectionData?.bodyConstitution?.stamina || 'N/A'}
- Endurance: ${sectionData?.bodyConstitution?.endurance || 'N/A'}
- Immunity: ${sectionData?.bodyConstitution?.immunity || 'N/A'}

SUPERPOWER AGE:
- Strongest planet: ${sectionData?.superpowerAge?.planet || 'N/A'} (${sectionData?.superpowerAge?.score || 'N/A'}%)
- Peak maturation age: ${sectionData?.superpowerAge?.maturationAge || 'N/A'}

OUTPUT STRUCTURE (dedicate a FULL paragraph to each):
1. **Overall body portrait** — paint a vivid picture combining build, height, body type, walk style. Make the reader SEE themselves.
2. **Face & features** — detailed face shape, eyes, nose, lips, jaw. Be SPECIFIC enough that a friend could recognize them from the description.
3. **Complexion & skin** — skin tone, texture, how it changes. Include planet modifications.
4. **Hair** — texture, thickness, style tendency, how it changes with age.
5. **Voice & presence** — how they sound, how they enter a room, their natural aura.
6. **How you age** — Navamsha aging pattern. Youth vs maturity appearance changes.
7. **Beauty & attractiveness** — honest assessment with the attractiveness score. What makes them beautiful/handsome.
8. **Mental landscape** — temperament, how they think, emotional processing. This is the "mind" part.
9. **Intellect & wisdom** — how sharp, how wise, how they learn and make decisions.
10. **Body constitution** — stamina, endurance, immunity, physical strengths/weaknesses.
11. **Superpower age** — the age when their strongest planet matures and they peak.

Write AT LEAST 12-15 detailed paragraphs. This is DEEPLY personal — people will share this section.
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English or Tamil word.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish.' : 'Write in vivid, portrait-like English.'}`,
    },

    attractionProfile: {
      title: '💘 Your Attraction & Romantic Power',
      prompt: `You are writing the MOST VIRAL section of this report — the attraction and romantic profile. This is what people SCREENSHOT and share on social media. Every paragraph must make the reader feel SEEN and slightly exposed.

CRITICAL RULES:
1. This section is about ATTRACTION — how the opposite gender perceives them, what they're attracted to, their romantic energy. NOT about marriage timing or daily married life (those are separate sections).
2. Be bold and specific. Don't hedge. If the data says they're highly attractive, SAY IT with confidence.
3. The attraction power score is the CENTERPIECE — present it dramatically.
4. Love language and sexual energy must feel PERSONAL, not generic.
5. The "first impression vs real you" journey is the MOST shareable part — make it feel like a revelation.

REMINDER: No astrology jargon. No "7th house", "Venus placement", "Darakaraka." Describe as romantic profile of a real person.

Birth details: ${lagnaEn} rising, Moon in ${moonEn}, Nakshatra: ${nakshatraName}
Gender: ${extraContext?.userGender || 'Unknown'}

━━━ ATTRACTION PROFILE ENGINE DATA ━━━

🔥 ATTRACTION POWER SCORE: ${sectionData?.attractionPower || 'N/A'}/10 — ${sectionData?.attractionLevel || 'N/A'}

HOW THE OPPOSITE GENDER SEES YOU:
- First impression: ${sectionData?.attractionAura?.en || 'N/A'}
- Sinhala: ${sectionData?.attractionAura?.si || ''}
- Modifiers:
${(sectionData?.attractionAuraModifiers || []).map(m => '  ★ ' + m).join('\n') || '  None'}

WHAT TYPE YOU'RE ATTRACTED TO:
- 7th house sign: ${sectionData?.seventhHouseSign || 'N/A'}
- Your type: ${sectionData?.attractedTo?.type || 'N/A'}
${sectionData?.darakaraka ? `
SOUL-LEVEL PARTNER TYPE (Darakaraka: ${sectionData.darakaraka.planet}):
- Spouse planet: ${sectionData.darakaraka.planet} in ${sectionData.darakaraka.rashi || 'N/A'}
- Spouse nature: ${sectionData.darakaraka.spouseType?.en || 'N/A'}` : ''}

LOVE LANGUAGE:
- Primary: ${sectionData?.loveLanguage?.en || 'N/A'}
- Venus element: ${sectionData?.venusElement || 'N/A'}
- Venus strength: ${sectionData?.venusStrength || 'N/A'}%, Dignity: ${sectionData?.venusDignity || 'N/A'}, House: ${sectionData?.venusHouse || 'N/A'}

SEXUAL ENERGY:
- ${sectionData?.sexualEnergy || 'N/A'}
- Mars element: ${sectionData?.marsElement || 'N/A'}, Mars strength: ${sectionData?.marsStrength || 'N/A'}%
- Venus-Mars together: ${sectionData?.venusMarsSameHouse ? 'YES — extremely high sexual magnetism' : 'No'}
- Intimacy house planets: ${sectionData?.h8PlanetCount || 0} planets

FIRST IMPRESSION → REAL YOU JOURNEY:
1. First 5 minutes: ${sectionData?.firstImpression?.en || 'N/A'}
2. After 3 months: ${sectionData?.moonReality || 'N/A'}
3. After deep commitment: ${sectionData?.navamshaTrue || 'N/A'}

CROSS-REFERENCE:
- Marriage afflictions: ${allSections?.marriage?.marriageAfflictions?.severity || 'N/A'}
- Attachment style: ${allSections?.surpriseInsights?.loveLanguage?.attachment || 'N/A'}
- Jealousy level: ${allSections?.surpriseInsights?.loveLanguage?.jealousy?.level || 'N/A'}

OUTPUT STRUCTURE (dedicate a FULL paragraph to each):
1. 🔥 **Attraction Power Score reveal** — dramatic reveal of the score. If 8+, celebrate it boldly. If 5-7, state it as average and explain why. If below 5, be HONEST — state the score directly and explain what holds it back. Do NOT reframe a low score as a hidden strength.
2. **How the opposite gender sees you** — paint a vivid picture of the first impression. Make it feel like a movie scene.
3. **Your romantic modifiers** — what amplifies/changes the base attraction (planet modifiers).
4. **Your type** — who you're drawn to and WHY. From 7th house sign and Darakaraka.
5. **Love language** — how you express and receive love. Be specific, not generic.
6. **Sexual energy profile** — tasteful but honest. The Mars element and Venus-Mars relationship tell the story.
7. **The reveal journey** — First impression → 3 months → after commitment. This is the MOST shareable paragraph. "At first they see... but after 3 months they discover... and after full commitment, the real you emerges as..."
8. **Your ultimate romantic superpower** — the one thing about your romantic energy that nobody else has.

Write AT LEAST 10-12 detailed paragraphs. This section should make the reader's heart race.
${language === 'si' ? 'MUST write ENTIRELY in pure Sinhala (සිංහල). Not a single English or Tamil word.' : language === 'ta' ? 'Write in Tamil.' : language === 'singlish' ? 'Write in Singlish.' : 'Write in bold, engaging English.'}`,
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
async function generateSectionNarrative(sectionKey, sectionData, birthData, allSections, language = 'en', rashiContext = null, ageContext = null, userName = null, userGender = null, userReligion = null) {
  const sectionPromptData = buildSectionPrompt(sectionKey, sectionData, birthData, allSections, language, { rashiContext: rashiContext || { userReligion: userReligion }, userGender, userName, userReligion });
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
${rashiContext.personalProfile || ''}

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

  // Build religion context — NO religious recommendations
  const religionContext = '⚠️ IMPORTANT RULE: Do NOT recommend any religious activities, rituals, or faith-based practices. No temple visits, prayers, pujas, pirith, mantras, church services, mosque visits, chanting, novenas, or any worship activities. Keep ALL advice purely practical: gemstones as accessories, lucky colors, meditation/mindfulness (secular), exercise, diet, charity, journaling, nature connection, and lifestyle improvements.';

  const systemPrompt = `You are a precise Vedic astrology analyst for a Sri Lankan astrology app called "Grahachara". Your job is to ANALYZE pre-calculated birth chart data, REASON about what it means for this specific person, and then write clear, honest, plain-language descriptions.

⚠️ CRITICAL APPROACH — ANALYZE FIRST, WRITE SECOND:
You are NOT a data translator. You are an ANALYST. Before writing any paragraph:
1. THINK about what the combination of data points means — a single data point alone is weak, but 2-3 data points pointing the same direction is a strong prediction
2. CROSS-REFERENCE the section data with the full birth chart data below — find confirming or contradicting signals
3. IDENTIFY CONTRADICTIONS — if the engine says one thing but the planet positions suggest another, address the tension honestly
4. When multiple data fields converge on the same conclusion, that prediction is HIGH CONFIDENCE — state it boldly and decisively
5. When only one weak indicator supports a claim, still state it but note it depends on a single factor
6. Pick the STRONGER signal and COMMIT to it — do NOT hedge with vague "mixed indicators" language. Make a call. Be decisive.

🔥 HONESTY MANDATE — NON-NEGOTIABLE:
- Do NOT soften bad news. Do NOT add silver linings to every negative finding.
- If the data shows something difficult, STATE IT DIRECTLY. The user is paying for TRUTH, not comfort.
- A score of 35/100 means WEAK — say it plainly. Do not dress it up as "developing" or "has room for growth."
- A score of 55/100 means BELOW AVERAGE — say what that means in real life without sugarcoating.
- A score of 80+ means STRONG — celebrate it boldly.
- If divorce risk is HIGH, say "divorce risk is high" — do NOT hide it behind "there may be some adjustments needed."
- If second marriage is indicated, state the probability directly without tiptoeing.
- The ONLY exception: when marriage is completely denied or a life-threatening health issue is indicated, you may add ONE sentence of compassionate framing AFTER stating the hard truth. But the truth comes FIRST, always.

IDENTITY RULE: You are a professional human astrologer, NOT an AI. NEVER mention AI, machine learning, algorithms, language models, or that you are artificial in any way. Speak as a wise, experienced human astrologer would.

${nameGreeting}
${genderContext}
${religionContext}
You are writing the "${sectionPromptData.title}" section of their personal life report.
${ageBlock}

${langInstructions[language] || langInstructions.en}

═══ CORE MANDATE ═══
- ANALYZE the engine data deeply — don't just convert each field into a sentence. Think about what combinations of data points MEAN together.
- ONLY state what the engine data supports. If a data field says "N/A" or is missing, SKIP it — do not invent content to fill the gap.
- Every date, year, timing window, and number you mention MUST come from the provided data. NEVER make up dates or numbers.
- Two people with different chart data must get completely different readings because you are analyzing THEIR specific data.
- Use ALL the data provided. Each data point with a real value = at least 1-2 sentences of analysis. Count your data fields and ensure each gets attention.
- ${userName ? `Use their name "${userName}" naturally 2-3 times per section.` : 'Address them as "you" throughout.'}
- ACCURACY IS KING: If the data says earlyLifeHealth severity is HIGH, do NOT write "you were born healthy". If estimatedElderSiblings is 1, do NOT write "you have no older siblings". READ the data carefully and FAITHFULLY represent it.
- CROSS-REFERENCE: Before writing about any topic, check BOTH the section-specific data AND the full birth chart below. The birth chart is the ground truth — if the section data seems wrong, the chart data overrides it.

⚠️ ANTI-GENERIC MANDATE — THIS IS YOUR #1 PRIORITY:
Before writing ANY sentence, ask yourself: "Could this sentence appear in someone else's report who has a completely different chart?" If yes, DELETE IT and replace with something specific to THIS person's data.

BANNED GENERIC PATTERNS (never write these):
- "You have a strong personality" → Instead: reference the SPECIFIC lagna, planets, or strength score
- "Your career will be successful" → Instead: state the SPECIFIC career types and timing from data
- "You will face some challenges" → Instead: name the SPECIFIC challenge, its severity, and when
- "Love is important to you" → Instead: describe THIS person's specific love pattern from 7th house data
- "You are creative/intelligent/hardworking" → Instead: explain WHY from specific planetary data
- "Take care of your health" → Instead: name SPECIFIC organs at risk and when to watch them
- ANY sentence that starts with "You are a person who..." or "People born under..." — these are ALWAYS generic

SPECIFICITY TEST: Every paragraph must contain at least ONE of:
- A specific date, year, or age range from the engine data
- A specific strength score or percentage
- A reference to a specific planet's effect (described in plain language)
- A cross-reference between two different data points
- A unique chart feature that less than 20% of people would have

VOICE & STYLE:
- Write like a seasoned astrologer who has analyzed 10,000 charts — confident, specific, decisive, never vague
- Be BLUNT: if the data shows difficulty, say so FIRST, then offer practical advice. Truth before comfort.
- Start STRONG — the first sentence of each section should be a bold, specific claim that hooks the reader. Never start with a preamble.
- Every paragraph must contain at least ONE specific, concrete prediction or insight the person has never heard before
- Use vivid real-life scenarios with specific ages: "Around age 35-38, expect heated arguments about money" NOT "financial disagreements are possible"
- NO generic advice like "communicate better" or "be patient" — give SPECIFIC, chart-derived guidance: "Your partner responds best to physical gestures, not words — a touch on the shoulder resolves fights faster than a 2-hour conversation"
- Make the reader feel like you're sitting across from them telling them things nobody else has ever told them
- Every claim must trace back to a specific data field provided to you

FORMAT: Use Markdown for readability:
- **bold** for key predictions, important dates, and critical findings
- *italic* for gentle emphasis
- > blockquotes for the most important findings or warnings
- - bullet lists for practical advice and action items
- --- to separate major topics within the section

══════════════════════════════════════════════════════════════
ABSOLUTE LANGUAGE RULES — NEVER VIOLATE
══════════════════════════════════════════════════════════════

1. ZERO TECHNICAL TERMS — The following words are BANNED from your output:
   "Lagna", "Rashi", "Bhava", "Graha", "Dasha", "Mahadasha", "Antardasha", "Yoga" (as astrology term), 
   "Nakshatra", "Dosha", "Karana", "Tithi", "Mangala Dosha", "Kuja Dosha", "Sade Sati", "Shadbala",
   "Karakamsha", "Atmakaraka", "Arudha", "Upapada", "Navamsha", "Vimshottari", "Bhukti", "Panchanga",
   "Drishti", "Ashtakavarga", "Bindu", "Pushkara", "Rahu Kala", "Yamagandhaya", "Chara Karaka",
   "Raja Yoga", "Dhana Yoga", "Kaal Sarp", "Gajakeshari", "Budhaditya", "Neecha Bhanga",
   "Benefic", "Malefic", "Exalted", "Debilitated", "Retrograde", "Combustion",
   "7th house", "10th house", "5th house", "4th house" — do NOT reference house numbers.
   Instead describe the real-life effect:
   - Instead of "Saturn in 7th house" → "Relationships come to you later than most, but when they arrive, they're built to last"
   - Instead of "Jupiter Mahadasha" → "You're entering a period of expansion and growth that will last several years"

2. 100% TARGET LANGUAGE:
   - If language is "si" (Sinhala): Write PURE Sinhala. NOT A SINGLE English word.
     ❌ WRONG: "ඔයාගේ chart එකේ" / "career එක" / "love life එක"
     ✅ RIGHT: "ඔයාගේ ඉරණම" / "රැකියාව" / "ආදර ජීවිතය"
     Use simple, everyday Sinhala that a 15-year-old could understand.
   - If language is "en" (English): Write everything in English. No Sinhala/Sanskrit/Pali terms.
   - If language is "ta" (Tamil): Write everything in pure Tamil. No English/Sinhala mixing.

3. READERS ARE NOT ASTROLOGY EXPERTS — Use everyday language. If you can't explain something without a technical term, describe the real-life effect instead.

4. NO PLANET NAMES AS LABELS — Don't say "Saturn influences your career." Instead describe the effect: "Your career path rewards patience and persistence — success builds slowly but solidly."
   Planet names can appear occasionally in explanations but NEVER as headings or sentence subjects.
══════════════════════════════════════════════════════════════

REALITY CHECK — ABSOLUTE RULES:
- This person is CURRENTLY ${ageContext ? ageContext.currentAge + ' years old (born ' + ageContext.birthDateStr + ')' : 'a real human being'}. NEVER forget their age.
- ALL predictions must fall within a REALISTIC lifespan (max age 80-85).
- ${ageContext ? 'Prediction window: ' + ageContext.currentYear + ' to ' + (ageContext.birthYear + 80) + '. Do NOT reference ANY year beyond ' + (ageContext.birthYear + 80) + '.' : 'Keep all predictions within a realistic timeframe.'}
- Be HONEST. If the data shows delayed marriage, say "marriage is likely to be delayed until [year from data]." If career is challenging, say so.
- Use SPECIFIC dates and numbers from the engine data:
  • MARRIAGE: Use the exact year/window from the timing engine data
  • CAREER: Use the suggested careers from the engine data
  • CHILDREN: Use the estimated count and timing from the engine data
  • MONEY: Use the specific wealth/risk periods from the engine data
- If the data shows genuine hardship, state it directly with compassion, then offer practical advice if available.
- BANNED filler phrases: "only time will tell", "the universe has a plan", "everything happens for a reason", "when the time is right", "the stars indicate", "celestial energies suggest", "you are destined to", "success is in your future", "challenges will make you stronger", "there may be some ups and downs", "with patience and perseverance", "trust the process", "your journey is unique". Replace with specific data-backed statements that include dates, numbers, or specific planetary effects.
- BANNED generic openings: Do NOT start any section with "Based on your chart..." or "Your birth chart reveals..." or "The analysis shows..." or "Looking at your..." — jump straight into the specific finding.
- For ages already lived: describe what the data indicates for those periods — do not invent specific personal events.

══════════════════════════════════════════════════════════════
ANTI-DUPLICATION MANDATE — CRITICAL
══════════════════════════════════════════════════════════════
Each section MUST focus ONLY on its own domain. DO NOT repeat information from other sections:
- "marriage" → TIMING of marriage, partner description (appearance, personality, profession), how/where they meet, whether marriage happens, afflictions, first letter of partner — NOT daily married life
- "marriedLife" → DAILY experience AFTER marriage: conflict patterns, intimacy, in-law dynamics, household management, power dynamics, decade-by-decade evolution — NOT timing, NOT partner finding, NOT whether marriage happens
- "career" → Career PATH, business vs service, earning periods — NOT financial management or property
- "financial" → Money management, savings, debt, investment style, loss periods — NOT career paths
- "lifePredictions" → Timeline of life phases — NOT deep dive into any single topic
- "children" → Number, timing, children's nature — NOT marriage quality
- "health" → Physical body, organs, diseases, diet — include mental health aspects too
- "education" → Academic path, degrees, study fields — NOT career paths
- "luck" → Lottery, unexpected gains, inheritance, lucky periods — NOT career earnings
- "realEstate" → Property, land, vehicles — NOT general wealth
- "legal" → Court cases, enemies, disputes, protection — NOT general challenges
- "foreignTravel" → Travel, visa, countries, settlement — NOT career abroad (brief mention OK)
- "surpriseInsights" → Hidden/unusual facts — appearance, siblings, parents, sleep, food — NOT repeating other sections
- "familyPortrait" → Mother, father, siblings, family karma — NOT children or spouse
- "physicalProfile" → Body, face, height, complexion, mind, intellect — NOT personality traits from "personality" section
- "attractionProfile" → Attraction power, romantic energy, sexual magnetism, love language — NOT marriage timing or partner finding from "marriage" section
- "timeline25" → Year-by-year forecast for next 25 years — compact, punchy, dates only
- "remedies" → Gemstones, mantras, rituals, colors, fasting — NOT predictions

If you find yourself writing something that belongs in another section, STOP and write something section-specific instead.
══════════════════════════════════════════════════════════════

DEPTH MANDATE — DATA-DRIVEN LENGTH:
⚠️ LENGTH RULE — SIMPLE: Use ALL the data. Each data point = at least 1-2 sentences. If you have 30 data points, you need 30+ sentences across your paragraphs.
- HERO sections (lifePredictions, career, marriage, marriedLife, health, children, familyPortrait, surpriseInsights, education, physicalProfile, attractionProfile): AT LEAST 8-15 paragraphs, each 3-6 sentences. Target 1500-2500 words.
- STANDARD sections (financial, luck, legal, foreignTravel, realEstate, remedies, yogaAnalysis, transits): AT LEAST 5-10 paragraphs. Target 800-1500 words.
- Every data field with a value MUST appear in your output. Count them.
- Include SPECIFIC numbers: strength scores, percentages, years, ages, counts
- Name the person by name 2-3 times per section if provided
- For each major finding, use the 4-LAYER technique: (1) State it boldly, (2) Explain the real-life impact, (3) Give a vivid scenario with specific ages/years, (4) Offer actionable advice
- Cross-reference data: mention briefly (1 sentence) to connect sections`;

  const userPrompt = sectionPromptData.prompt + rashiBlock + coherenceBlock;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  // ── Hybrid Model Strategy + Per-Section Temperature ──────────
  // Hero sections → Gemini 3.1 Pro (temp 0.82 — vivid, unique per person)
  // Data-heavy sections → Gemini 2.5 Flash (temp 0.62 — grounded but not robotic)
  // Standard sections → Gemini 2.5 Flash (temp 0.72)
  const HERO_SECTIONS = ['lifePredictions', 'surpriseInsights', 'marriage', 'career', 'marriedLife', 'familyPortrait', 'health', 'children', 'education', 'physicalProfile', 'attractionProfile'];
  const DATA_HEAVY_SECTIONS = ['yogaAnalysis', 'financial', 'transits', 'realEstate', 'legal'];
  
  const isHero = HERO_SECTIONS.includes(sectionKey);
  const isDataHeavy = DATA_HEAVY_SECTIONS.includes(sectionKey);
  const sectionTemperature = isHero ? 0.82 : isDataHeavy ? 0.62 : 0.72;
  // ─────────────────────────────────────────────────────────────

  try {
    const result = isHero
      ? await callGeminiHero(messages, sectionTemperature)
      : await callGeminiLong(messages, sectionTemperature);

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
 * Call Gemini with higher token limit for long narratives — with retry + exponential backoff
 */
async function callGeminiLong(messages, sectionTemperature = 0.65) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemInstruction = messages.find(m => m.role === 'system')?.content || '';
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const MAX_RETRIES = 3;
  const BASE_DELAY = 2000;
  const TIMEOUT_MS = 120000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: {
            maxOutputTokens: 65536,
            temperature: sectionTemperature,
            topP: 0.90,
            thinkingConfig: {
              thinkingBudget: 8192,
            },
          },
        }),
      });
      clearTimeout(timer);

      if (response.status === 429 || response.status >= 500) {
        const msg = `HTTP ${response.status}`;
        if (attempt < MAX_RETRIES) {
          const delay = BASE_DELAY * Math.pow(2, attempt - 1) + Math.random() * 500;
          console.warn(`[GeminiLong] ${msg} on attempt ${attempt}, retrying in ${Math.round(delay)}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw new Error(`Gemini API error: ${msg} after ${MAX_RETRIES} attempts`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(`Gemini API error: ${data.error.message}`);
      }

      // Extract text from thinking model response — may have multiple parts
      const parts = data.candidates?.[0]?.content?.parts || [];
      const textParts = parts.filter(p => p.text && !p.thought);
      const text = textParts.map(p => p.text).join('') || 'Unable to generate response.';
      const thoughtParts = parts.filter(p => p.thought);
      if (thoughtParts.length > 0) {
        const thinkingChars = thoughtParts.reduce((sum, p) => sum + (p.text?.length || 0), 0);
        console.log(`[GeminiLong] 🧠 Model used thinking (${thinkingChars} chars of reasoning)`);
      }

      return {
        text,
        usage: extractGeminiUsage(data),
        model,
      };
    } catch (err) {
      const retryable = /fetch failed|AbortError|ECONNRESET|UND_ERR_CONNECT_TIMEOUT/i.test(err.message || '');
      if (retryable && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, attempt - 1) + Math.random() * 500;
        console.warn(`[GeminiLong] ${err.message} on attempt ${attempt}, retrying in ${Math.round(delay)}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Call Gemini 2.5 Flash for hero sections — with thinking enabled for deep analysis
 */
async function callGeminiHero(messages, sectionTemperature = 0.65) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = 'gemini-3.1-pro-preview';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemInstruction = messages.find(m => m.role === 'system')?.content || '';
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const MAX_RETRIES = 3;
  const BASE_DELAY = 2000;
  const TIMEOUT_MS = 180000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const requestBody = {
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          maxOutputTokens: 65536,
          temperature: sectionTemperature,
          topP: 0.90,
          thinkingConfig: {
            thinkingBudget: 16384,
          },
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(requestBody),
      });
      clearTimeout(timer);

      if (response.status === 429 || response.status >= 500) {
        const msg = `HTTP ${response.status}`;
        if (attempt < MAX_RETRIES) {
          const delay = BASE_DELAY * Math.pow(2, attempt - 1) + Math.random() * 500;
          console.warn(`[GeminiHero] ${msg} on attempt ${attempt}, retrying in ${Math.round(delay)}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw new Error(`Gemini Hero error: ${msg} after ${MAX_RETRIES} attempts`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(`Gemini Hero error: ${data.error.message}`);
      }

      const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
      if (groundingMetadata) {
        const queries = groundingMetadata.webSearchQueries || [];
        if (queries.length > 0) {
          console.log(`[GeminiHero] 🔍 Search grounded with ${queries.length} queries`);
        }
      }

      // Extract text from thinking model response — may have multiple parts
      const parts = data.candidates?.[0]?.content?.parts || [];
      const textParts = parts.filter(p => p.text && !p.thought);
      const text = textParts.map(p => p.text).join('') || 'Unable to generate response.';
      const thoughtParts = parts.filter(p => p.thought);
      if (thoughtParts.length > 0) {
        const thinkingTokens = thoughtParts.reduce((sum, p) => sum + (p.text?.length || 0), 0);
        console.log(`[GeminiHero] 🧠 Model used thinking (${thinkingTokens} chars of reasoning)`);
      }

      return {
        text,
        usage: extractGeminiUsage(data),
        model,
      };
    } catch (err) {
      const retryable = /fetch failed|AbortError|ECONNRESET|UND_ERR_CONNECT_TIMEOUT/i.test(err.message || '');
      if (retryable && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, attempt - 1) + Math.random() * 500;
        console.warn(`[GeminiHero] ${err.message} on attempt ${attempt}, retrying in ${Math.round(delay)}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
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
async function generateAINarrativeReport(birthDate, lat = 6.9271, lng = 79.8612, language = 'en', birthLocation = null, userName = null, userGender = null, userReligion = null, marriageOpts = {}) {
  const tokenTracker = createTokenTracker();
  const rawReport = generateFullReport(birthDate, lat, lng, marriageOpts);
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

  // ── Human-readable birth time (SLT = UTC + 5:30) ──────────────
  // Create a proper SLT date to handle day rollover correctly
  const sltDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  const sltH = sltDate.getUTCHours();
  const sltM = sltDate.getUTCMinutes();
  const birthTimeSLT = `${String(sltH).padStart(2, '0')}:${String(sltM).padStart(2, '0')}`;
  const birthDateFormatted = `${sltDate.getUTCFullYear()}-${String(sltDate.getUTCMonth() + 1).padStart(2, '0')}-${String(sltDate.getUTCDate()).padStart(2, '0')}`;

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

  // ── Planet Strengths (12-factor comprehensive) ─────────────────
  const strengthsSummary = Object.entries(planetStrengths || {}).map(([key, p]) => {
    let line = `${p.name || key}: Score ${p.score || 0}/100 — ${p.strength || 'unknown'}`;
    if (p.dignityLevel) line += ` | Dignity: ${p.dignityLevel}`;
    if (p.isRetrograde) line += ' | RETROGRADE (past-life karma active)';
    if (p.isCombust) line += ` | COMBUST (${p.combustDistance ? p.combustDistance.toFixed(1) + '° from Sun' : 'near Sun'})`;
    if (p.isVargottama) line += ' | VARGOTTAMA (same sign in birth chart & D9 — extra powerful)';
    if (p.neechaBhanga) line += ` | NEECHA BHANGA RAJA YOGA (weakness→strength: ${(p.neechaBhanga.reasons || []).join(', ')})`;
    if (p.grahaYuddha) line += ` | PLANETARY WAR with ${p.grahaYuddha.opponent} (${p.grahaYuddha.result})`;
    return line;
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

  // ── Tier 3-5 Engine Data for Report ──────────────────────────
  let tier35Block = '';
  try {
    const reportEngineStart = Date.now();
    const pieces = [];

    // Multi-Dasha cross-validation
    if (dashaEngine) {
      try {
        const yoginiDasha = dashaEngine.calculateYoginiDasha(moonSidereal, date);
        const charaDasha = dashaEngine.calculateCharaDasha(date, lat, lng);
        const crossVal = dashaEngine.crossValidateDashas(birthDate, lat, lng, new Date(), dasaPeriods);
        const activeYogini = yoginiDasha.dashas.find(d => {
          const s = new Date(d.start), e = new Date(d.end);
          return new Date() >= s && new Date() < e;
        });
        const activeChara = charaDasha.dashas.find(d => {
          const s = new Date(d.start), e = new Date(d.end);
          return new Date() >= s && new Date() < e;
        });
        pieces.push(`═══ MULTI-DASHA CROSS-VALIDATION ═══
Current Yogini Dasha: ${activeYogini ? activeYogini.lord + ' (' + activeYogini.years + ' years)' : 'N/A'}
Current Chara Dasha: ${activeChara ? activeChara.signEnglish + ' (' + activeChara.years + ' years)' : 'N/A'}
Dasha Agreement Confidence: ${crossVal.confidenceScore}%
Systems Agreeing: ${crossVal.agreements || 0} / ${crossVal.totalPairs || 0}
${crossVal.activeVimshottari ? 'Vimshottari: ' + crossVal.activeVimshottari.lord : ''}
${crossVal.activeYogini ? 'Yogini: ' + crossVal.activeYogini.lord : ''}
${crossVal.activeChara ? 'Chara: ' + crossVal.activeChara.signEnglish : ''}`);
      } catch (e) { console.warn('[AI Report] Multi-dasha failed:', e.message); }
    }

    // KP Event Predictions
    if (kpEngine) {
      try {
        const kpEvents = ['marriage', 'career_change', 'children', 'foreign_travel', 'wealth_gain', 'property', 'health_crisis'];
        const kpResults = kpEvents.map(ev => {
          try { return kpEngine.predictEvent(ev, date, lat, lng); } catch (_) { return null; }
        }).filter(Boolean);
        if (kpResults.length > 0) {
          pieces.push(`═══ KP EVENT PREDICTIONS (YES/NO) ═══
${kpResults.map(r => `${r.event}: ${r.prediction} (${r.confidence}% confidence)${r.reasons ? ' — ' + r.reasons.slice(0, 2).join('; ') : ''}`).join('\n')}`);
        }
      } catch (e) { console.warn('[AI Report] KP predictions failed:', e.message); }
    }

    // Varshphal Annual Forecast
    if (varshphalEngine) {
      try {
        const currentYear = new Date().getFullYear();
        const annual = varshphalEngine.getAnnualForecast(birthDate, currentYear, lat, lng);
        pieces.push(`═══ ANNUAL FORECAST ${currentYear} (VARSHPHAL/TAJAKA) ═══
Year Score: ${annual.yearScore}/100 — ${annual.yearOutlook}
Solar Return: ${annual.solarReturnDate ? new Date(annual.solarReturnDate).toISOString().split('T')[0] : 'N/A'}
Muntha: ${annual.muntha?.munthaSign || 'N/A'} in House ${annual.muntha?.munthaHouse || 'N/A'} — ${annual.muntha?.effect || ''}
Tajaka Yogas: ${annual.tajakaYogas?.length > 0 ? annual.tajakaYogas.map(y => y.name + ': ' + y.effect).join('; ') : 'None detected'}
Mudda Dasha: ${annual.muddaDasha?.slice(0, 3).map(d => d.lord + ' (' + d.days + ' days)').join(', ') || 'N/A'}`);
      } catch (e) { console.warn('[AI Report] Varshphal failed:', e.message); }
    }

    // Confidence Scores for key events
    if (confidenceEngine) {
      try {
        const confAll = confidenceEngine.calculateAllConfidences({
          birthDate: birthDate, lat, lng, birthTimeQuality: 'approximate',
        });
        const confEntries = Object.entries(confAll).slice(0, 6);
        if (confEntries.length > 0) {
          pieces.push(`═══ PREDICTION CONFIDENCE SCORES ═══
${confEntries.map(([ev, c]) => `${ev}: ${c.confidenceScore}% (${c.label})`).join('\n')}`);
        }
      } catch (e) { console.warn('[AI Report] Confidence scoring failed:', e.message); }
    }

    // Enhanced Transits with Ashtakavarga Scoring
    if (transitEngine && transitEngine.getEnhancedTransits) {
      try {
        const enhanced = transitEngine.getEnhancedTransits(null, birthDate, lat, lng);
        const planetTransits = Object.entries(enhanced.planets || {}).slice(0, 5);
        pieces.push(`═══ ASHTAKAVARGA-WEIGHTED TRANSITS ═══
Composite Transit Score: ${enhanced.compositeAshtakavargaScore || '--'} — ${enhanced.compositeLabel || 'Mixed'}
${enhanced.doubleTransits?.length > 0 ? 'Double Transit (Jupiter+Saturn): Houses ' + enhanced.doubleTransits.map(dt => dt.house).join(', ') : 'No double transit active'}
${planetTransits.map(([k, p]) => `${p.planet}: ${p.transitRashi} (Score: ${p.ashtakavargaScore || '--'}/100)${p.kakshya ? ' Kakshya: ' + p.kakshya.kakshyaLord : ''}`).join('\n')}`);
      } catch (e) { console.warn('[AI Report] Enhanced transits failed:', e.message); }
    }

    // Classical Text RAG
    if (classicalTextsEngine) {
      try {
        const chartFeatures = { yogas: yogas.map(y => y.name), dashaLord: dasaPeriods?.[0]?.lord };
        const verses = classicalTextsEngine.getVersesForChart(chartFeatures);
        if (verses && verses.length > 0) {
          pieces.push(`═══ CLASSICAL TEXT REFERENCES ═══
${verses.slice(0, 3).map(v => `[${v.source}] ${v.topic}: "${v.text}"`).join('\n')}`);
        }
      } catch (e) { console.warn('[AI Report] Classical texts failed:', e.message); }
    }

    if (pieces.length > 0) {
      tier35Block = '\n\n' + pieces.join('\n\n');
      console.log(`[AI Report] Tier 3-5 engine data gathered in ${Date.now() - reportEngineStart}ms — ${pieces.length} blocks`);
    }
  } catch (outerErr) {
    console.warn('[AI Report] Tier 3-5 engine block failed (continuing without):', outerErr.message);
  }

  advancedBlock += tier35Block;

  // ── Key Events Calendar (consolidated life timeline) ──────────
  const keyEventsCalendar = rawReport.keyEventsCalendar || null;

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
    // ── Key Events Calendar (for quick AI reference) ──
    keyEventsCalendar: keyEventsCalendar ? `
═══ KEY EVENTS CALENDAR (CONSOLIDATED TIMELINE) ═══
Generated for: Born ${keyEventsCalendar.generatedFor?.birthYear}, Current age: ${keyEventsCalendar.generatedFor?.currentAge}
📊 Summary: ${keyEventsCalendar.summary?.totalEvents} major life events predicted

${keyEventsCalendar.summary?.nextMajorEvent ? `🎯 NEXT MAJOR EVENT: ${keyEventsCalendar.summary.nextMajorEvent.icon} ${keyEventsCalendar.summary.nextMajorEvent.summary} (${keyEventsCalendar.summary.nextMajorEvent.year}, age ${keyEventsCalendar.summary.nextMajorEvent.ageAtEvent})` : ''}

${keyEventsCalendar.byStatus?.thisYear?.length > 0 ? `🔥 THIS YEAR (${new Date().getFullYear()}):
${keyEventsCalendar.byStatus.thisYear.map(e => `  ${e.icon} ${e.summary}`).join('\n')}` : ''}

${keyEventsCalendar.byStatus?.nearTerm?.length > 0 ? `📅 NEAR TERM (next 2-3 years):
${keyEventsCalendar.byStatus.nearTerm.map(e => `  ${e.icon} ${e.summary} (${e.year})`).join('\n')}` : ''}

${keyEventsCalendar.allEvents?.filter(e => e.status === 'ACTIVE_NOW').length > 0 ? `⭐ CURRENTLY ACTIVE WINDOWS:
${keyEventsCalendar.allEvents.filter(e => e.status === 'ACTIVE_NOW').map(e => `  ${e.icon} ${e.summary} — HAPPENING NOW!`).join('\n')}` : ''}

REFERENCE: Use this calendar when writing about "key upcoming events" or "life timeline ahead".
` : '',
    // ── Enriched personal profile for deeper personalization ──
    personalProfile: (() => {
      const parts = [];
      if (birthData.gana) parts.push(`Gana (Temperament): ${birthData.gana.type} — ${birthData.gana.meaning}`);
      if (birthData.yoni) parts.push(`Yoni (Instinct): ${birthData.yoni.animal}`);
      if (birthData.nadi) parts.push(`Nadi (Constitution): ${birthData.nadi.type} — ${birthData.nadi.meaning}`);
      if (birthData.birthDayOfWeek) parts.push(`Born on: ${birthData.birthDayOfWeek} (ruler: ${birthData.rulingPlanetOfDay || 'N/A'})`);
      if (birthData.birthTimeQuality) parts.push(`Birth time quality: ${birthData.birthTimeQuality}`);
      if (birthData.currentAge != null) parts.push(`Current age: ${birthData.currentAge} years old`);
      // NEW: Personal behavior data from surpriseInsights
      const si = sections.surpriseInsights;
      if (si?.loveLanguage?.attachment) parts.push(`Attachment Style: ${si.loveLanguage.attachment} — ${si.loveLanguage.attachDetail}`);
      if (si?.loveLanguage?.primary) parts.push(`Love Language: ${si.loveLanguage.primary}`);
      if (si?.dailyBehavior?.chronotype) parts.push(`Chronotype: ${si.dailyBehavior.chronotype}`);
      if (si?.dailyBehavior?.socialBattery) parts.push(`Social Battery: ${si.dailyBehavior.socialBattery}`);
      if (si?.emotionalStyle?.angerStyle) parts.push(`Anger Style: ${si.emotionalStyle.angerStyle}`);
      if (si?.publicVsPrivate?.contrastLevel) parts.push(`Public/Private Contrast: ${si.publicVsPrivate.contrastLevel}`);
      if (si?.moneyPersonality?.archetype) parts.push(`Money Personality: ${si.moneyPersonality.archetype}`);
      // NEW: Viral fields for coherence
      if (si?.secondMarriage?.probability) parts.push(`Second Marriage: ${si.secondMarriage.probability.substring(0, 80)}`);
      if (si?.monasticTendency?.tendency) parts.push(`Monastic Tendency: ${si.monasticTendency.tendency.substring(0, 80)}`);
      if (si?.famePotential?.level) parts.push(`Fame Potential: ${si.famePotential.level.substring(0, 80)}`);
      if (si?.wealthClass?.wealthLevel) parts.push(`Wealth Class: ${si.wealthClass.wealthLevel.substring(0, 80)}`);
      if (si?.spiritAnimal?.animal) parts.push(`Spirit Animal: ${si.spiritAnimal.animal}`);
      if (si?.celebrityTwin?.name) parts.push(`Celebrity Twin: ${si.celebrityTwin.name}`);
      if (si?.goldenPeriod?.ageRange) parts.push(`Golden Period: Age ${si.goldenPeriod.ageRange}`);
      return parts.length > 0 ? '\nPERSONAL PROFILE:\n' + parts.map(p => '- ' + p).join('\n') : '';
    })(),
    // ── Religion for faith-aware remedies ──
    userReligion: userReligion || null,
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
  // marriedLife = post-marriage daily life (separate from marriage timing/partner)
  // EXPANDED: health (from ~35 lines to ~100+ lines)
  const sectionOrder = [
    'yogaAnalysis',
    'lifePredictions',
    'career',
    'marriage',
    'marriedLife',
    'financial',
    'children',
    'familyPortrait',
    'health',
    'physicalProfile',
    'attractionProfile',
    'foreignTravel',
    'education',
    'luck',
    'legal',
    'realEstate',
    'transits',
    'surpriseInsights',
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
    const themesPrompt = `You are a precise Vedic astrology data summarizer. Based on the chart data below, produce a concise JSON summary for cross-section consistency. Every value MUST be derived from the provided data. If the data does not clearly indicate something, write "Insufficient data" rather than guessing.

BIRTH DATA:
- Lagna: ${rashiContext.lagnaEnglish} (${rashiContext.lagnaName}), Lord: ${rashiContext.lagnaLord}
- Moon Sign: ${rashiContext.moonSign}, Sun Sign: ${rashiContext.sunSign}
- Nakshatra: ${rashiContext.nakshatra}, Pada ${rashiContext.nakshatraPada}
- Age: ${ageContext.currentAge} years old (born ${ageContext.birthDateStr})
${rashiContext.personalProfile || ''}

KEY PLANETS:
${rashiContext.planetPositions}

DASHA TIMELINE:
${rashiContext.dashaTimeline}

YOGAS: ${rashiContext.yogas}

PLANET STRENGTHS:
${rashiContext.planetStrengths}

${rashiContext.advancedBlock ? 'ADVANCED:\n' + rashiContext.advancedBlock.substring(0, 3000) : ''}

SECTION DATA HIGHLIGHTS:
- Marriage afflictions: ${sections.marriage?.marriageAfflictions?.severity || 'NONE'} (Score: ${sections.marriage?.marriageAfflictions?.severityScore || 0}/100)
- Marriage Denied: ${sections.marriage?.marriageAfflictions?.isMarriageDenied ? '⛔ YES — MARRIAGE VERY UNLIKELY' : 'No'}
- Marriage Delayed: ${sections.marriage?.marriageAfflictions?.isMarriageDelayed ? '⚠️ YES' : 'No'}
- Marriage Likelihood: ${sections.marriage?.marriageAfflictions?.likelihood || 'Well-supported'}
- Marriage affliction details: ${(sections.marriage?.marriageAfflictions?.afflictions || []).slice(0, 3).join(' | ') || 'None'}
- Marriage best window: ${sections.marriage?.marriageTimingPrediction?.bestWindow?.dateRange || 'N/A'} ${sections.marriage?.marriageAfflictions?.isMarriageDenied ? '(⚠ window exists but marriage denial overrides — do NOT predict marriage)' : ''}
- Career suggestions: ${(sections.career?.primaryCareers || sections.career?.suggestedCareers || []).join(', ') || 'N/A'}
- Career sign flavor: ${sections.career?.careerSignFlavor || 'N/A'}
- Career planet ranking: ${(sections.career?.careerPlanetRanking || []).join('; ') || 'N/A'}
- Children estimate: ${sections.children?.estimatedChildren?.count || 'N/A'} (${sections.children?.estimatedChildren?.genderTendency || ''})
- Depression risk: ${sections.mentalHealth?.depressionRisk?.level || 'N/A'}
- Childhood trauma: ${sections.mentalHealth?.childhoodTrauma?.level || 'N/A'}
- Foreign travel: ${sections.foreignTravel?.foreignLikelihood || 'N/A'}
- Overall vitality: ${sections.health?.overallVitality || 'N/A'}
- High risk organs: ${(sections.health?.highRiskOrgans || []).join(', ') || 'None'}
- Unique signatures: ${(sections.personality?.uniqueSignatures || []).slice(0, 5).join('; ') || 'None'}
- Retrograde planets: ${(sections.personality?.retrogradePlanets || []).map(r => r.name).join(', ') || 'None'}
- Attachment style: ${sections.surpriseInsights?.loveLanguage?.attachment || 'N/A'} — ${sections.surpriseInsights?.loveLanguage?.attachDetail || ''}
- Love language: ${sections.surpriseInsights?.loveLanguage?.primary || 'N/A'}
- Social battery: ${sections.surpriseInsights?.dailyBehavior?.socialBattery || 'N/A'}
- Anger style: ${sections.surpriseInsights?.emotionalStyle?.angerStyle || 'N/A'}
- Public mask vs private self contrast: ${sections.surpriseInsights?.publicVsPrivate?.contrastLevel || 'N/A'}
- Money personality: ${sections.surpriseInsights?.moneyPersonality?.archetype || 'N/A'}

CROSS-VALIDATED SECTION SCORES (engine-enforced logical consistency):
${(() => {
  const cv = sections._crossValidation || [];
  if (cv.length === 0) return '✅ All section scores are logically consistent — no adjustments were needed.';
  return '⚠️ The engine detected logical inconsistencies and applied the following corrections:\n' +
    cv.map((adj, i) => `${i + 1}. ${adj.section}: ${adj.from} → ${adj.to} | ${adj.reason}`).join('\n') +
    '\n\n⛔ CRITICAL: You MUST respect these adjusted scores. If children was reduced from 95 to 65 because marriage is 50, your narrative must reflect CHALLENGES in both areas — do NOT write an optimistic children section that contradicts a weak marriage section.';
})()}

SECTION SCORE SUMMARY (after cross-validation):
- Marriage: ${sections.marriage?.seventhHouse?.strengthScore ?? 'N/A'}/100
- Children: ${sections.children?.fifthHouse?.strengthScore ?? 'N/A'}/100
- Career: ${sections.career?.tenthHouse?.strengthScore ?? 'N/A'}/100
- Financial: ${sections.financial?.secondHouse?.strengthScore ?? 'N/A'}/100
- Education: ${sections.education?.fourthHouse?.strengthScore ?? sections.education?.fifthHouse?.strengthScore ?? 'N/A'}/100
- Health: ${sections.health?.sixthHouse?.strengthScore ?? sections.health?.eighthHouse?.strengthScore ?? 'N/A'}/100
- Foreign Travel: ${sections.foreignTravel?.ninthHouse?.strengthScore ?? sections.foreignTravel?.twelfthHouse?.strengthScore ?? 'N/A'}/100
- Luck: ${sections.luck?.ninthHouse?.strengthScore ?? 'N/A'}/100
- Spiritual: ${sections.spiritual?.twelfthHouse?.strengthScore ?? 'N/A'}/100

Write EXACTLY this JSON format (no markdown, no fences). For each field, derive the value ONLY from the data above. If insufficient data exists for a field, write "Insufficient data":
{
  "corePersonality": "3-sentence summary — what makes THIS person fundamentally different from others with same lagna. Include retrograde/combust effects and unique signatures.",
  "dominantLifeTheme": "The single most powerful theme running through this chart — derived from strongest yoga + atmakaraka + lagna lord placement",
  "marriageTiming": "specific age/year range from 7th lord dasha + D9 + marriage windows data above. If marriageAfflictions severity is SEVERE or HIGH, write 'Marriage unlikely — [reason]' instead of a timing range",
  "marriageQuality": "honest 1-sentence verdict: If marriageAfflictions isMarriageDenied=true, write 'Marriage very unlikely — [specific denial reasons from affliction data]'. If severity HIGH, write 'Marriage faces severe obstacles — [reasons]'. Otherwise derive from affliction severity: happy/difficult/delayed/transformative",
  "careerPath": "2-3 specific career types from 10th lord + Amatyakaraka, or 'Insufficient data'",
  "financialPeak": "year range from 11th lord dasha + Dhana yogas, or 'Insufficient data'",
  "childrenTiming": "year range + count from 5th lord + D7 + section data above, or 'Insufficient data'",
  "healthConcerns": "specific body areas from weak planets + organ risk data above + risk level, or 'Insufficient data'",
  "mentalHealthNote": "honest assessment from depression/anxiety/trauma data above — LOW/MODERATE/HIGH risk with 1-sentence explanation",
  "currentPhase": "current dasha effects summary + what this person is experiencing RIGHT NOW at age ${ageContext.currentAge}",
  "biggestChallenge": "primary challenge from doshas/weak planets/afflictions — be brutally specific, not vague",
  "biggestBlessing": "primary strength from yogas/strong planets — be specific about what it gives them",
  "uniqueChartFeatures": "2-3 features that make this chart rare — stelliums, exalted/debilitated planets, retrograde patterns, unusual combinations",
  "educationCareerAlignment": "CRITICAL — Reconcile education fields (${(sections.education?.suggestedFields || []).join(', ') || 'N/A'}) with career paths (${(sections.career?.primaryCareers || sections.career?.suggestedCareers || []).join(', ') || 'N/A'}) and Nadi education fields (${(sections.education?.nadiEducation?.suggestedFields || []).slice(0, 5).join(', ') || 'N/A'}) and Nadi career sectors (${(sections.career?.nadiCareer?.careerSectors || []).map(s => s.sector || s.planet).join(', ') || 'N/A'}). Find the LOGICAL THREAD connecting education to career. Example: if education=medicine and career=healthcare administration, the thread is 'Medical degree leading to healthcare management'. If they seem contradictory, find the bridge field. Output: '[Education field] → [Career field]: [1-sentence explanation of how education leads to this career]'",
  "lifeMotto": "one-sentence theme from the chart data — NOT a generic inspirational quote but something that captures THIS person's specific journey"
}`;

    const themesResult = await callGemini([
      { role: 'system', content: 'You output ONLY valid JSON. No markdown code fences. No extra text. Be specific with years and numbers.' },
      { role: 'user', content: themesPrompt },
    ], 8192, 0.65);

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
• Dominant Life Theme: ${parsed.dominantLifeTheme || ''}
• Marriage Timing: ${parsed.marriageTiming || ''}
• Marriage Quality: ${parsed.marriageQuality || ''}
• Career Path: ${parsed.careerPath || ''}
• Financial Peak: ${parsed.financialPeak || ''}
• Children Timing: ${parsed.childrenTiming || ''}
• Health Concerns: ${parsed.healthConcerns || ''}
• Mental Health: ${parsed.mentalHealthNote || ''}
• Current Phase: ${parsed.currentPhase || ''}
• Biggest Challenge: ${parsed.biggestChallenge || ''}
• Biggest Blessing: ${parsed.biggestBlessing || ''}
• Unique Chart Features: ${parsed.uniqueChartFeatures || ''}
• Education→Career Alignment: ${parsed.educationCareerAlignment || ''}
• Life Motto: ${parsed.lifeMotto || ''}

⚠️ CRITICAL: Your section MUST be consistent with these core themes. If the core themes say "marriage around 28-30", you MUST NOT say "marriage at 24" or "marriage unlikely before 35". All sections tell ONE coherent story.

⚠️ PERSONALIZATION MANDATE: The "Unique Chart Features" and "Dominant Life Theme" above capture what makes THIS person's chart rare. EVERY section must reflect these unique qualities. If this chart has a stellium in house 10, the career section must be dramatically different from a chart with an empty house 10. If retrograde Venus is noted, the marriage section must address it specifically. Generic statements that could apply to anyone are FORBIDDEN.

⚖️ CROSS-VALIDATION MANDATE: Section scores have been ENGINE-VALIDATED for logical consistency. ${(() => {
  const cv = sections._crossValidation || [];
  if (cv.length === 0) return 'All scores are consistent.';
  return 'The following adjustments were applied: ' + cv.map(a => `${a.section} ${a.from}→${a.to}`).join(', ') + '. Your narrative tone MUST match the ADJUSTED score HONESTLY. 80+/100 = STRONG — celebrate it. 60-79 = DECENT — state it plainly. 40-59 = BELOW AVERAGE — say it directly and explain real-life impact. Below 40 = WEAK — be blunt about what this means. Do NOT soften scores with diplomatic language.';
})()}
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
    const dataKey = key === 'marriedLife' ? 'marriage' : key;
    const sectionData = sections[dataKey];
    if (!sectionData) return Promise.resolve({ title: key, narrative: null });
    return generateSectionNarrative(key, sectionData, birthData, sections, language, rashiContext, ageContext, userName, userGender, userReligion);
  });

  const narrativeResults = await Promise.all(narrativePromises);

  const elapsed = Date.now() - startTime;
  console.log(`[AI Report] All narratives generated in ${elapsed}ms (total with coherence: ${Date.now() - coherenceStart}ms)`);

  const narrativeSections = {};
  const failedSections = [];
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
    } else {
      failedSections.push({ key, error: result?.error || 'No narrative generated' });
    }
  });

  if (failedSections.length > 0) {
    console.warn(`[AI Report] ${failedSections.length} sections failed: ${failedSections.map(f => f.key).join(', ')}`);
  }

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
    failedSections: failedSections.length > 0 ? failedSections : undefined,
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
