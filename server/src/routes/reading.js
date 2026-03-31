/**
 * Full Astrology Reading Route — Premium endpoint
 * 
 * Generates a comprehensive Vedic astrology reading using
 * computed planetary data + AI interpretation via Gemini 3.1 Pro
 * with Google Search grounding for maximum accuracy.
 * 
 * Endpoints:
 *   - POST /api/reading/full — Full multi-section reading (premium)
 */

const express = require('express');
const router = express.Router();
const { buildFullBirthContext, formatContextForAI } = require('../engine/aiContext');
const { phoneAuth, requireSubscription } = require('../middleware/subscription');
const { trackCost } = require('../services/costTracker');

/**
 * Call Gemini 3.1 Pro with Google Search grounding for a reading section
 */
async function callGeminiForReading(systemPrompt, userPrompt, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const model = options.model
    || process.env.GEMINI_3_PRO_MODEL
    || process.env.GEMINI_PRO_MODEL
    || process.env.GEMINI_MODEL
    || 'gemini-2.5-flash';

  const useSearchGrounding = model.includes('3.1') || model.includes('3-');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      maxOutputTokens: options.maxTokens || 8192,
      temperature: options.temperature || 0.7,
      topP: 0.92,
    },
  };

  if (useSearchGrounding) {
    requestBody.tools = [{ google_search: {} }];
  }

  const MAX_RETRIES = 3;
  const BASE_DELAY = 2000;
  const TIMEOUT_MS = 180000;

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
        if (attempt < MAX_RETRIES) {
          const delay = BASE_DELAY * Math.pow(2, attempt - 1) + Math.random() * 500;
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw new Error(`Gemini API HTTP ${response.status} after ${MAX_RETRIES} attempts`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
      const searchQueries = groundingMetadata?.webSearchQueries || [];

      return {
        text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
        model,
        searchGrounded: searchQueries.length > 0,
        searchQueries,
        usage: data.usageMetadata || null,
      };
    } catch (err) {
      const retryable = /fetch failed|AbortError|ECONNRESET|UND_ERR_CONNECT_TIMEOUT/i.test(err.message || '');
      if (retryable && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, attempt - 1) + Math.random() * 500;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

/**
 * POST /api/reading/full
 * 
 * Body: {
 *   dateTime: "1998-10-09T03:46:00Z",
 *   lat: 6.9271,
 *   lng: 79.8612,
 *   language: "si"  // optional, defaults to "si"
 * }
 */
router.post('/full', phoneAuth, requireSubscription, async (req, res) => {
  try {
    var { dateTime, lat, lng, language } = req.body;

    if (!dateTime) {
      return res.status(400).json({ error: 'dateTime is required' });
    }

    var lang = language || 'si';
    var bDate = new Date(dateTime);
    var latitude = lat || 6.9271;
    var longitude = lng || 79.8612;

    console.log(`[Reading] Generating full reading for ${bDate.toISOString()} (${lang})`);

    // Step 1: Compute all astrology data using our engine
    var ctx = buildFullBirthContext(bDate, latitude, longitude);
    var computedData = formatContextForAI(ctx, lang);

    console.log(`[Reading] Birth context: Lagna=${ctx.lagna.rashi}, Moon=${ctx.moonSign.rashi}, ${ctx.planets.length} planets`);

    // Step 2: Build section prompts
    var sections = [
      {
        key: 'personality',
        prompt: lang === 'si'
          ? 'ලග්නය, ලග්නාධිපති, සහ ලග්නයේ ග්‍රහයන් මත පදනම්ව මෙම පුද්ගලයාගේ ස්වභාවය, පෞරුෂත්වය, සහ බාහිර පෙනුම විස්තර කරන්න. Google Search භාවිතයෙන් මෙම ලග්නයට අදාළ ගුණාංග සත්‍යාපනය කරන්න. 300 වචනවලින්.'
          : 'Based on the Lagna, Lagna lord, and planets in Lagna, describe personality, temperament, and appearance. Use Google Search to verify traits associated with this lagna. 300 words.',
      },
      {
        key: 'career',
        prompt: lang === 'si'
          ? '10 වන භාවය (කර්ම), 2 වන භාවය (ධන), 11 වන භාවය (ලාභ), සහ වර්තමාන දශාව මත පදනම්ව රැකියා/වෘත්තීය අනාවැකි ලබා දෙන්න. සුදුසු රැකියා ක්ෂේත්‍ර නම් කරන්න. 300 වචනවලින්.'
          : 'Based on 10th house (career), 2nd (wealth), 11th (gains), and current dasha, provide career predictions. Name suitable fields. 300 words.',
      },
      {
        key: 'marriage',
        prompt: lang === 'si'
          ? '7 වන භාවය (කලත්‍ර), ශුක්‍ර/ගුරු ස්ථානය, සහ නවාංශ සටහන මත පදනම්ව විවාහ/සබඳතා අනාවැකි ලබා දෙන්න. විවාහ වයස, සහකරු/සහකාරිය ගැන ද සඳහන් කරන්න. 250 වචනවලින්.'
          : 'Based on 7th house, Venus/Jupiter positions, and Navamsha, provide marriage predictions. 250 words.',
      },
      {
        key: 'health',
        prompt: lang === 'si'
          ? '6 වන භාවය (රෝග), 8 වන භාවය (ආයු), සහ ලග්නාධිපතියේ බලය මත පදනම්ව සෞඛ්‍ය අනාවැකි ලබා දෙන්න. අවධානම් කාල සහ ආරක්ෂිත ක්‍රම සඳහන් කරන්න. 250 වචනවලින්.'
          : 'Based on 6th house, 8th house, and Lagna lord strength, provide health predictions. 250 words.',
      },
      {
        key: 'wealth',
        prompt: lang === 'si'
          ? '2, 5, 9, 11 භාව සහ ධන යෝග මත පදනම්ව ධන/මුදල් අනාවැකි ලබා දෙන්න. වඩාත් ලාභදායී කාල සඳහන් කරන්න. 250 වචනවලින්.'
          : 'Based on houses 2, 5, 9, 11 and Dhana yogas, provide wealth predictions. 250 words.',
      },
      {
        key: 'remedies',
        prompt: lang === 'si'
          ? 'මෙම කේන්ද්‍රයේ දුබල ග්‍රහයන් සහ පාප ග්‍රහ ස්ථාන සලකා ශ්‍රී ලාංකික බෞද්ධ/හින්දු සම්ප්‍රදායට අනුව පිළියම් නිර්දේශ කරන්න: පිරිත්, බෝධි පූජා, ග්‍රහ ශාන්ති, මැණික්, වර්ණ, දිනයන්. Google Search භාවිතයෙන් නිවැරදි මන්ත්‍ර සහ පූජා වගේ දේ සොයන්න. 300 වචනවලින්.'
          : 'Based on weak/afflicted planets, recommend Sri Lankan Buddhist/Hindu remedies: pirith, bodhi puja, graha shanti, gems, colors, auspicious days. Use Google Search to verify correct mantras. 300 words.',
      },
      {
        key: 'currentPeriod',
        prompt: lang === 'si'
          ? 'වර්තමාන මහා දශාව සහ අන්තර් දශාව මත පදනම්ව ඉදිරි මාස 6-12 සඳහා සවිස්තරාත්මක අනාවැකි ලබා දෙන්න. Google Search භාවිතයෙන් වර්තමාන ග්‍රහ ගමන් (transits) සත්‍යාපනය කරන්න. 300 වචනවලින්.'
          : 'Based on current Maha Dasha and Antar Dasha, provide detailed predictions for the next 6-12 months. Use Google Search to verify current planetary transits. 300 words.',
      },
    ];

    var systemMessage = lang === 'si'
      ? `ඔබ ශ්‍රී ලාංකික වෛදික ජ්‍යෝතිෂ විශේෂඥයෙකි. ඔබ "ග්‍රහචාර" යෙදුමේ ප්‍රධාන ජ්‍යෝතිෂ උපදේශකයායි.

අනිවාර්ය නීති:
1. ඔබ ස්වයංව ග්‍රහ ස්ථාන ගණනය නොකරන්න. පහත දී ඇති COMPUTED DATA පමණක් භාවිත කරන්න.
2. පහත ගණනය කළ දත්ත 100% නිවැරදි — ඒවා astronomia + ephemeris engines වලින් ලබාගත් සත්‍ය ග්‍රහ ස්ථාන ය.
3. ඔබේ කාර්යය: මෙම දත්ත අර්ථ නිරූපණය කිරීම, අනාවැකි, සහ පිළියම් පමණි.
4. Google Search භාවිතයෙන් වර්තමාන ග්‍රහ ගමන්, විශේෂ තාරකා විද්‍යා සිදුවීම් (ග්‍රහණ, යුති, වක්‍ර ගමන්) සත්‍යාපනය කරන්න.
5. සෑම පිළිතුරකම 100% සිංහල භාෂාවෙන් ලියන්න.
6. ශ්‍රී ලාංකික සංස්කෘතික සන්දර්භය යොදන්න.
7. "මම නිවැරදිව ගණනය කළා" වැනි දේ නොකියන්න — data engine එකෙන් ලැබුණ බව පවසන්න.

${computedData}`
      : `You are a Sri Lankan Vedic astrology expert. You are the chief advisor of the "Grahachara" app.

Mandatory Rules:
1. DO NOT calculate planetary positions yourself. Use ONLY the COMPUTED DATA provided below.
2. The computed data below is 100% accurate — real planetary positions from astronomia + ephemeris engines.
3. Your role is ONLY: interpretation, predictions, and remedies based on the provided data.
4. Use Google Search to verify current transits, special astronomical events (eclipses, conjunctions, retrogrades).
5. Apply Sri Lankan cultural context — recommend pirith, bodhi puja, graha shanti, etc.
6. Never say "I calculated" — say the data comes from the astronomical computation engine.

${computedData}`;

    // Step 3: Generate all sections in parallel
    var results = {};
    var totalInputTokens = 0;
    var totalOutputTokens = 0;
    var totalThinkingTokens = 0;
    var usedModel = null;
    var promises = sections.map(async function(section) {
      try {
        var response = await callGeminiForReading(systemMessage, section.prompt, {
          temperature: 0.75,
          maxTokens: 4096,
        });
        results[section.key] = {
          text: response.text,
          model: response.model,
          searchGrounded: response.searchGrounded || false,
        };
        // Accumulate usage
        if (!usedModel && response.model) usedModel = response.model;
        if (response.usage) {
          totalInputTokens += response.usage.promptTokenCount || 0;
          totalOutputTokens += response.usage.candidatesTokenCount || 0;
          totalThinkingTokens += response.usage.thoughtsTokenCount || 0;
        }
      } catch (err) {
        console.error('[Reading] Section ' + section.key + ' failed:', err.message);
        results[section.key] = {
          text: lang === 'si' ? 'මෙම කොටස ජනනය කිරීමට නොහැකි විය.' : 'Failed to generate this section.',
          model: null,
          error: err.message,
        };
      }
    });

    await Promise.all(promises);

    console.log(`[Reading] ✅ Full reading generated (${Object.keys(results).length} sections)`);

    // Track AI cost
    trackCost('reading', req.user?.uid || null, {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      thinkingTokens: totalThinkingTokens,
      model: usedModel,
    });

    res.json({
      success: true,
      birthChart: {
        lagna: ctx.lagna,
        moonSign: ctx.moonSign,
        sunSign: ctx.sunSign,
        planets: ctx.planets,
        houses: ctx.houses,
        currentDasha: ctx.currentDasha,
        currentBhukti: ctx.currentBhukti,
        yogas: ctx.yogas,
      },
      reading: results,
      generatedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[Reading] Full reading error:', err);
    res.status(500).json({ error: 'Failed to generate reading' });
  }
});

module.exports = router;
