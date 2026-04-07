/**
 * Weekly Lagna Palapala Engine
 * 
 * Generates weekly horoscope predictions for all 12 lagnas using AI.
 * This is a CENTRAL generation — one report per lagna, shared by all users.
 * 
 * Flow:
 *   1. Scheduler calls generateWeeklyLagnaReports() every Sunday 6AM SLT
 *   2. Engine calculates current planetary positions & transits for the week
 *   3. AI generates bilingual (EN + SI) predictions for each of 12 lagnas
 *   4. Reports stored in Firestore under weeklyLagnaReports/{weekId}
 *   5. Previous week's report is automatically replaced
 * 
 * Each lagna report contains:
 *   - General outlook (lucky/neutral/challenging)
 *   - Career & finance prediction
 *   - Health & wellbeing
 *   - Relationships
 *   - Lucky day, color, number for the week
 *   - Key advice
 *   All in both English and Sinhala
 */

const { getDb } = require('../config/firebase');
const { getAllPlanetPositions, getPanchanga, toSidereal } = require('./astrology');

// Enhanced engine (graceful — null if unavailable)
let enhancedEngine = null;
try { enhancedEngine = require('./enhanced'); } catch (e) { console.warn('[WeeklyLagna] enhanced engine not available:', e.message); }

// Jyotish engine (graceful — null if unavailable)
let jyotishEngine = null;
try { jyotishEngine = require('./jyotish'); } catch (e) { console.warn('[WeeklyLagna] jyotish engine not available:', e.message); }

const COLLECTION = 'weeklyLagnaReports';

// All 12 Lagnas
const LAGNAS = [
  { id: 1,  en: 'Aries',       si: 'මේෂ',     sanskrit: 'Mesha',     lord: 'Mars',    lordSi: 'කුජ',   symbol: '♈' },
  { id: 2,  en: 'Taurus',      si: 'වෘෂභ',    sanskrit: 'Vrishabha', lord: 'Venus',   lordSi: 'සිකුරු', symbol: '♉' },
  { id: 3,  en: 'Gemini',      si: 'මිථුන',    sanskrit: 'Mithuna',   lord: 'Mercury', lordSi: 'බුධ',    symbol: '♊' },
  { id: 4,  en: 'Cancer',      si: 'කටක',     sanskrit: 'Kataka',    lord: 'Moon',    lordSi: 'චන්ද්‍ර', symbol: '♋' },
  { id: 5,  en: 'Leo',         si: 'සිංහ',     sanskrit: 'Simha',     lord: 'Sun',     lordSi: 'සූර්ය',  symbol: '♌' },
  { id: 6,  en: 'Virgo',       si: 'කන්‍යා',   sanskrit: 'Kanya',     lord: 'Mercury', lordSi: 'බුධ',    symbol: '♍' },
  { id: 7,  en: 'Libra',       si: 'තුලා',     sanskrit: 'Thula',     lord: 'Venus',   lordSi: 'සිකුරු', symbol: '♎' },
  { id: 8,  en: 'Scorpio',     si: 'වෘශ්චික',  sanskrit: 'Vrischika', lord: 'Mars',    lordSi: 'කුජ',   symbol: '♏' },
  { id: 9,  en: 'Sagittarius', si: 'ධනු',      sanskrit: 'Dhanu',     lord: 'Jupiter', lordSi: 'ගුරු',   symbol: '♐' },
  { id: 10, en: 'Capricorn',   si: 'මකර',     sanskrit: 'Makara',    lord: 'Saturn',  lordSi: 'ශනි',   symbol: '♑' },
  { id: 11, en: 'Aquarius',    si: 'කුම්භ',    sanskrit: 'Kumbha',    lord: 'Saturn',  lordSi: 'ශනි',   symbol: '♒' },
  { id: 12, en: 'Pisces',      si: 'මීන',      sanskrit: 'Meena',     lord: 'Jupiter', lordSi: 'ගුරු',   symbol: '♓' },
];

const LUCKY_COLORS_EN = ['Red', 'White', 'Green', 'Silver', 'Gold', 'Blue', 'Pink', 'Maroon', 'Yellow', 'Dark Blue', 'Purple', 'Sea Green', 'Orange', 'Cream', 'Brown'];
const LUCKY_COLORS_SI = ['රතු', 'සුදු', 'කොළ', 'රිදී', 'රන්', 'නිල්', 'රෝස', 'දම් රතු', 'කහ', 'තද නිල්', 'දම්', 'මුහුදු කොළ', 'තැඹිලි', 'ක්‍රීම්', 'දුඹුරු'];
const DAYS_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_SI = ['සඳුදා', 'අඟහරුවාදා', 'බදාදා', 'බ්‍රහස්පතින්දා', 'සිකුරාදා', 'සෙනසුරාදා', 'ඉරිදා'];

/**
 * Get the week's date range (Monday to Sunday)
 */
function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  // Monday = start of week
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

/**
 * Get week ID for Firestore document
 */
function getWeekId(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return d.getUTCFullYear() + '-W' + String(weekNum).padStart(2, '0');
}

/**
 * Build planetary context for AI prompt
 */
function buildPlanetaryContext(date) {
  try {
    const positions = getAllPlanetPositions(date, 6.9271, 79.8612);
    const panchanga = getPanchanga(date, 6.9271, 79.8612);
    
    let context = 'Current Planetary Positions (Sidereal/Lahiri Ayanamsha):\n';
    if (positions) {
      for (const [planet, data] of Object.entries(positions)) {
        if (data && data.rashi) {
          context += `  ${planet}: ${data.rashi.name} (${data.longitude?.toFixed(2) || '?'}°)`;
          if (data.retrograde) context += ' [Retrograde]';
          context += '\n';
        }
      }
    }
    if (panchanga) {
      context += '\nPanchanga:\n';
      if (panchanga.nakshatra) context += `  Nakshatra: ${panchanga.nakshatra.name}\n`;
      if (panchanga.tithi) context += `  Tithi: ${panchanga.tithi.name}\n`;
      if (panchanga.yoga) context += `  Yoga: ${panchanga.yoga.name}\n`;
    }

    // Enhanced engine data for richer weekly predictions
    if (enhancedEngine) {
      try {
        // Choghadiya for the week (daily muhurta timing)
        const choghadiya = enhancedEngine.calculateChoghadiya(6.9271, 79.8612);
        if (choghadiya) {
          context += '\nChoghadiya (Daily Muhurta Periods):\n';
          const daytime = (choghadiya.daytimeChoghadiyas || []).slice(0, 4);
          daytime.forEach(c => {
            context += `  ${c.type}: ${c.start} to ${c.end}\n`;
          });
        }
      } catch (e) { /* skip */ }

      try {
        // Aspect patterns in the sky right now (T-Square, Grand Trine, Yod)
        const patterns = enhancedEngine.detectAspectPatterns(date, 6.9271, 79.8612);
        if (patterns?.patterns?.length > 0) {
          context += '\nCurrent Aspect Patterns (Sky Configuration):\n';
          patterns.patterns.forEach(p => {
            context += `  ${p.name}: ${(p.planets || []).join(', ')}${p.description ? ' — ' + p.description : ''}\n`;
          });
        }
        if (patterns?.summary) {
          const s = patterns.summary;
          if (s.elements) {
            context += `  Element Distribution: Fire=${(s.elements.fire || []).length}, Earth=${(s.elements.earth || []).length}, Air=${(s.elements.air || []).length}, Water=${(s.elements.water || []).length}\n`;
          }
        }
      } catch (e) { /* skip */ }

      try {
        // Current retrograde periods (precise from celestine)
        const retros = enhancedEngine.findRetrogradePeriods(date.getFullYear());
        if (retros?.length > 0) {
          const currentRetros = retros.filter(r => {
            const now = date;
            return now >= new Date(r.start) && now <= new Date(r.end);
          });
          if (currentRetros.length > 0) {
            context += '\nCurrently Retrograde (Celestine/NASA-verified):\n';
            currentRetros.forEach(r => {
              context += `  ${r.planet}: ${r.start} to ${r.end}\n`;
            });
          }
        }
      } catch (e) { /* skip */ }
    }

    // Jyotish engine data for weekly predictions
    if (jyotishEngine) {
      try {
        const jWeekly = jyotishEngine.generateWeeklyContext(date);
        if (jWeekly) {
          context += '\n' + jWeekly + '\n';
        }
      } catch (e) { /* skip */ }
    }

    return context;
  } catch (err) {
    console.error('[WeeklyLagna] Failed to get planetary positions:', err.message);
    return 'Planetary positions unavailable for this calculation.';
  }
}

/**
 * Call AI to generate weekly predictions for all 12 lagnas
 */
async function callAIForWeeklyReports(weekRange, planetaryContext) {
  const provider = process.env.AI_PROVIDER || 'gemini';
  const weekStartStr = weekRange.start.toISOString().split('T')[0];
  const weekEndStr = weekRange.end.toISOString().split('T')[0];

  const systemPrompt = `You are a renowned Vedic astrologer creating weekly lagna palapala (ලග්න පලාපල) for a Sri Lankan astrology app called Grahachara.

You have access to Google Search — use it to verify current planetary transits, retrograde periods, and any significant astronomical events for the prediction week. Cross-reference the provided engine data with live search results for maximum accuracy.

IMPORTANT RULES:
1. You must provide predictions for ALL 12 lagnas (Mesha through Meena)
2. Each prediction must be in BOTH English AND Sinhala
3. Use the actual planetary positions provided AND verify with Google Search for the most accurate, up-to-date transit data
4. Consider planetary transits, aspects (drishti), and house placements FROM each lagna
5. Be specific — mention exact planets, their positions, and effects
6. Keep each lagna's prediction concise but meaningful (3-4 sentences per section)
7. The tone should be positive yet honest — warn about challenges with remedies
8. Include practical advice, not just vague spiritual platitudes
9. Mention specific astrological remedies (mantras, colors, gemstones, donations) for challenging periods
10. Search for any special astronomical events (eclipses, planetary conjunctions, retrogrades) happening during this week
11. If Choghadiya data is provided, incorporate auspicious/inauspicious daily timing into advice (e.g., "early mornings are especially auspicious this week")
12. If Aspect Patterns (T-Square, Grand Trine, Yod) are present in the sky, explain how they affect each lagna — these are major cosmic configurations
13. If retrograde planets are listed, emphasize their effects on each lagna (delays, revisiting old issues, inner reflection)
14. Use the Element Distribution data to note which lagnas benefit most from current elemental balance

For each lagna, analyze:
- Which houses the current planets occupy FROM that lagna
- Major transits affecting that sign this week
- Benefic/malefic influences
- Dasha-like general trends
- Specific planetary conjunctions and their effects
- Any retrogrades or station changes this week (verify via search)`;

  const userPrompt = `Generate weekly horoscope for the week of ${weekStartStr} to ${weekEndStr}.

${planetaryContext}

For EACH of the 12 lagnas, provide a JSON object with:
{
  "lagnaId": 1-12,
  "outlook": "favorable" | "mixed" | "challenging",
  "overallEn": "3-4 sentence overall outlook in English — mention key planetary influences",
  "overallSi": "Same in Sinhala",
  "transitEn": "2-3 sentences about key planetary transits affecting this lagna this week. Mention which planets are in which houses and their effects. Be specific about planet names.",
  "transitSi": "Same in Sinhala",
  "careerEn": "Career & finance prediction in English (2-3 sentences)",
  "careerSi": "Same in Sinhala",
  "educationEn": "Education, studies, exams, learning opportunities (1-2 sentences)",
  "educationSi": "Same in Sinhala",
  "healthEn": "Health & wellbeing in English (1-2 sentences)",
  "healthSi": "Same in Sinhala",
  "relationshipEn": "Love & relationships in English (1-2 sentences)",
  "relationshipSi": "Same in Sinhala",
  "familyEn": "Family life, home matters, property (1-2 sentences)",
  "familySi": "Same in Sinhala",
  "spiritualEn": "Spiritual growth, religious activities, pilgrimages (1 sentence)",
  "spiritualSi": "Same in Sinhala",
  "remedyEn": "Specific astrological remedy or precaution for the week — mention specific mantras, colors to wear, gemstones, or offerings (1-2 sentences)",
  "remedySi": "Same in Sinhala",
  "adviceEn": "Key practical advice for the week in English (1 sentence)",
  "adviceSi": "Same in Sinhala",
  "luckyDayIndex": 0-6 (Monday=0 to Sunday=6),
  "luckyColorIndex": 0-14,
  "luckyNumber": 1-9
}

Return a JSON array of exactly 12 objects. ONLY return the JSON array, no other text.`;

  let result;
  
  if (provider === 'gemini') {
    result = await callGemini(systemPrompt, userPrompt);
  } else {
    result = await callOpenAI(systemPrompt, userPrompt);
  }

  return result;
}

async function callGemini(systemPrompt, userPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }

  // Prefer Gemini 3.1 Pro for weekly reports (best quality + search grounding)
  // Falls back to GEMINI_PRO_MODEL → GEMINI_MODEL → gemini-2.5-flash
  const model = process.env.GEMINI_3_PRO_MODEL
    || process.env.GEMINI_PRO_MODEL
    || process.env.GEMINI_MODEL
    || 'gemini-2.5-flash';

  const useSearchGrounding = model.includes('3.1') || model.includes('3-');
  
  console.log(`[WeeklyLagna] Using model: ${model} (search grounding: ${useSearchGrounding})`);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 65536,
      responseMimeType: 'application/json',
    },
  };

  // Enable Google Search grounding for real-time planetary transit awareness
  if (useSearchGrounding) {
    requestBody.tools = [{ google_search: {} }];
  }

  const MAX_RETRIES = 3;
  const BASE_DELAY = 3000;
  const TIMEOUT_MS = 180000; // 3 min — Gemini 3.1 Pro can be slower

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

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
          const delay = BASE_DELAY * Math.pow(2, attempt - 1) + Math.random() * 1000;
          console.warn(`[WeeklyLagna] ${msg} on attempt ${attempt}, retrying in ${Math.round(delay)}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        // Final attempt: fall back to standard model without search grounding
        if (model !== (process.env.GEMINI_MODEL || 'gemini-2.5-flash')) {
          console.warn(`[WeeklyLagna] ${model} failed after ${MAX_RETRIES} attempts, falling back to standard model`);
          return callGeminiFallback(systemPrompt, userPrompt);
        }
        throw new Error(`Gemini API error: ${msg} after ${MAX_RETRIES} attempts`);
      }

      const data = await response.json();
      if (data.error) {
        console.warn(`[WeeklyLagna] Gemini error: ${data.error.message}`);
        if (model !== (process.env.GEMINI_MODEL || 'gemini-2.5-flash')) {
          console.warn('[WeeklyLagna] Falling back to standard model');
          return callGeminiFallback(systemPrompt, userPrompt);
        }
        throw new Error(`Gemini API error: ${data.error.message}`);
      }

      // Log search grounding info if available
      const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
      if (groundingMetadata) {
        const queries = groundingMetadata.webSearchQueries || [];
        console.log(`[WeeklyLagna] 🔍 Search grounded with ${queries.length} queries: ${queries.slice(0, 3).join(', ')}`);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const usage = data.usageMetadata || {};
      console.log(`[WeeklyLagna] ✅ Generated with ${model} (tokens: ${usage.totalTokenCount || '?'})`);
      
      const reports = parseAIResponse(text);
      return { reports, usage: { inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0, thinkingTokens: usage.thoughtsTokenCount || 0 } };
    } catch (err) {
      const retryable = /fetch failed|AbortError|ECONNRESET|UND_ERR_CONNECT_TIMEOUT/i.test(err.message || '');
      if (retryable && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, attempt - 1) + Math.random() * 1000;
        console.warn(`[WeeklyLagna] ${err.message} on attempt ${attempt}, retrying in ${Math.round(delay)}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      // Fall back to standard model on final failure
      if (model !== (process.env.GEMINI_MODEL || 'gemini-2.5-flash')) {
        console.warn(`[WeeklyLagna] ${model} error: ${err.message}, falling back to standard model`);
        return callGeminiFallback(systemPrompt, userPrompt);
      }
      throw err;
    }
  }
}

/**
 * Fallback: call standard Gemini model (gemini-2.5-flash) without search grounding
 */
async function callGeminiFallback(systemPrompt, userPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  console.log(`[WeeklyLagna] Fallback to: ${model}`);
  
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const genModel = genAI.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 32768,
      responseMimeType: 'application/json',
    },
  });

  const result = await genModel.generateContent(userPrompt);
  const text = result.response.text();
  const usageMeta = result.response.usageMetadata || {};
  const reports = parseAIResponse(text);
  return { reports, usage: { inputTokens: usageMeta.promptTokenCount || 0, outputTokens: usageMeta.candidatesTokenCount || 0, thinkingTokens: usageMeta.thoughtsTokenCount || 0 } };
}

async function callOpenAI(systemPrompt, userPrompt) {
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 8192,
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const text = response.choices[0].message.content;
  const reports = parseAIResponse(text);
  return { reports, usage: { inputTokens: response.usage?.prompt_tokens || 0, outputTokens: response.usage?.completion_tokens || 0, thinkingTokens: 0 } };
}

function parseAIResponse(text) {
  try {
    // Try direct JSON parse
    let parsed = JSON.parse(text);
    // Could be { reports: [...] } or just [...]
    if (Array.isArray(parsed)) return parsed;
    if (parsed.reports && Array.isArray(parsed.reports)) return parsed.reports;
    if (parsed.lagnas && Array.isArray(parsed.lagnas)) return parsed.lagnas;
    // Try to find array in the response
    for (const key of Object.keys(parsed)) {
      if (Array.isArray(parsed[key])) return parsed[key];
    }
    throw new Error('No array found in AI response');
  } catch (e) {
    // Try extracting JSON array from text
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Failed to parse AI response: ' + e.message);
  }
}

/**
 * Main generation function — called by scheduler
 * Generates reports for all 12 lagnas, stores in Firestore
 * 
 * NOTE: This runs on Sunday morning but generates for the UPCOMING week
 * (Monday–Sunday), so predictions are fresh when users read them on Monday.
 */
async function generateWeeklyLagnaReports() {
  const now = new Date();
  
  // Target the upcoming week: add 1 day (Sunday → Monday) to get next week's IDs
  const targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const weekId = getWeekId(targetDate);
  const weekRange = getWeekRange(targetDate);
  
  console.log(`[WeeklyLagna] Generating reports for week ${weekId} (${weekRange.start.toISOString().split('T')[0]} to ${weekRange.end.toISOString().split('T')[0]})`);

  // Build planetary context
  const planetaryContext = buildPlanetaryContext(now);
  console.log('[WeeklyLagna] Planetary context built');

  // Call AI
  const aiResult = await callAIForWeeklyReports(weekRange, planetaryContext);
  const aiReports = aiResult.reports || aiResult;
  const aiUsage = aiResult.usage || null;
  console.log(`[WeeklyLagna] AI returned ${aiReports.length} reports`);

  // Validate and enrich reports
  const reports = LAGNAS.map((lagna, idx) => {
    const aiReport = aiReports.find(r => r.lagnaId === lagna.id) || aiReports[idx] || {};

    const luckyDayIdx = (typeof aiReport.luckyDayIndex === 'number' && aiReport.luckyDayIndex >= 0 && aiReport.luckyDayIndex <= 6)
      ? aiReport.luckyDayIndex : Math.floor(Math.random() * 7);
    const luckyColorIdx = (typeof aiReport.luckyColorIndex === 'number' && aiReport.luckyColorIndex >= 0 && aiReport.luckyColorIndex <= 14)
      ? aiReport.luckyColorIndex : Math.floor(Math.random() * 15);
    const luckyNum = (typeof aiReport.luckyNumber === 'number' && aiReport.luckyNumber >= 1 && aiReport.luckyNumber <= 9)
      ? aiReport.luckyNumber : Math.floor(Math.random() * 9) + 1;

    return {
      lagnaId: lagna.id,
      symbol: lagna.symbol,
      nameEn: lagna.en,
      nameSi: lagna.si,
      sanskrit: lagna.sanskrit,
      lord: lagna.lord,
      lordSi: lagna.lordSi,
      outlook: aiReport.outlook || 'mixed',
      overallEn: aiReport.overallEn || 'Predictions are being calculated.',
      overallSi: aiReport.overallSi || 'පලාපල ගණනය කරමින්.',
      transitEn: aiReport.transitEn || '',
      transitSi: aiReport.transitSi || '',
      careerEn: aiReport.careerEn || '',
      careerSi: aiReport.careerSi || '',
      educationEn: aiReport.educationEn || '',
      educationSi: aiReport.educationSi || '',
      healthEn: aiReport.healthEn || '',
      healthSi: aiReport.healthSi || '',
      relationshipEn: aiReport.relationshipEn || '',
      relationshipSi: aiReport.relationshipSi || '',
      familyEn: aiReport.familyEn || '',
      familySi: aiReport.familySi || '',
      spiritualEn: aiReport.spiritualEn || '',
      spiritualSi: aiReport.spiritualSi || '',
      remedyEn: aiReport.remedyEn || '',
      remedySi: aiReport.remedySi || '',
      adviceEn: aiReport.adviceEn || '',
      adviceSi: aiReport.adviceSi || '',
      luckyDay: { en: DAYS_EN[luckyDayIdx], si: DAYS_SI[luckyDayIdx] },
      luckyColor: { en: LUCKY_COLORS_EN[luckyColorIdx], si: LUCKY_COLORS_SI[luckyColorIdx] },
      luckyNumber: luckyNum,
    };
  });

  // Store in Firestore (replaces previous week automatically via weekId)
  const db = getDb();
  if (db) {
    // Delete previous weeks' reports (keep only current)
    try {
      const allDocs = await db.collection(COLLECTION).listDocuments();
      const batch = db.batch();
      let deleted = 0;
      for (const docRef of allDocs) {
        if (docRef.id !== weekId) {
          batch.delete(docRef);
          deleted++;
        }
      }
      if (deleted > 0) {
        await batch.commit();
        console.log(`[WeeklyLagna] Deleted ${deleted} old report(s)`);
      }
    } catch (err) {
      console.error('[WeeklyLagna] Cleanup error:', err.message);
    }

    // Save current week
    await db.collection(COLLECTION).doc(weekId).set({
      weekId,
      weekStart: weekRange.start.toISOString(),
      weekEnd: weekRange.end.toISOString(),
      generatedAt: now.toISOString(),
      reports,
    });
    console.log(`[WeeklyLagna] ✅ Saved ${reports.length} reports to Firestore (${weekId})`);
  }

  return {
    weekId,
    weekStart: weekRange.start.toISOString(),
    weekEnd: weekRange.end.toISOString(),
    reportCount: reports.length,
    generatedAt: now.toISOString(),
    usage: aiUsage,
  };
}

module.exports = {
  generateWeeklyLagnaReports,
  LAGNAS,
  getWeekId,
  getWeekRange,
};
