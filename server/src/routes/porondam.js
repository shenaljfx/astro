/**
 * Porondam (Marriage Compatibility) API Routes
 * 
 * Endpoints:
 * - POST /api/porondam/check     - Calculate compatibility between two birth charts
 * - POST /api/porondam/vibe-link - Generate a shareable compatibility link
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { calculatePorondam, calculateAdvancedPorondam } = require('../engine/porondam');
const { buildHouseChart } = require('../engine/astrology');
const { generateAdvancedAnalysis } = require('../engine/advanced');
const { chat } = require('../engine/chat');
const { parseSLT } = require('../utils/dateUtils');
const { parseBirthDateTime } = require('../services/timezone');
const { optionalAuth } = require('../middleware/auth');
const { phoneAuth, requireSubscription } = require('../middleware/subscription');
const { aiLimiter, aiUserLimiter, INPUT_LIMITS, sanitizeString } = require('../middleware/security');
const { trackCost } = require('../services/costTracker');
const { budgetGuard } = require('../services/budgetEnforcer');
const { distributedAiUserLimiter } = require('../services/distributedRateLimit');
const { saveVibeLink, getVibeLink, markVibeLinkUsed } = require('../services/vibeLinkStore');
const { savePorondamResult, updatePorondamReport } = require('../models/firestore');
const { getDb, COLLECTIONS } = require('../config/firebase');
const { createOrResumeEntitlement, fulfillEntitlement, recordEntitlementError, restoreEntitlementRetry } = require('../middleware/entitlements');

// Enhanced engine (graceful — null if unavailable)
let enhancedEngine = null;
try { enhancedEngine = require('../engine/enhanced'); } catch (e) { console.warn('[porondam] enhanced engine not available:', e.message); }

// Jyotish engine (graceful — null if unavailable)
let jyotishEngine = null;
try { jyotishEngine = require('../engine/jyotish'); } catch (e) { console.warn('[porondam] jyotish engine not available:', e.message); }

// Dev fallback only; production links are stored durably in Firestore.
const vibeLinks = new Map();

function normalizeEntitlementCoord(value, fallback) {
  const num = parseFloat(value);
  if (!Number.isFinite(num)) return fallback;
  return Number(num.toFixed(4));
}

function buildPorondamEntitlementInput(entitlementInput, porondamData, language) {
  const source = entitlementInput || porondamData?.entitlementInput || {};
  if (source.brideBirthDate && source.groomBirthDate) {
    return {
      brideBirthDate: String(source.brideBirthDate),
      brideLat: normalizeEntitlementCoord(source.brideLat, 6.9271),
      brideLng: normalizeEntitlementCoord(source.brideLng, 79.8612),
      groomBirthDate: String(source.groomBirthDate),
      groomLat: normalizeEntitlementCoord(source.groomLat, 6.9271),
      groomLng: normalizeEntitlementCoord(source.groomLng, 79.8612),
      language: language || source.language || 'en',
    };
  }

  return {
    brideBirth: porondamData.bride?.nakshatra?.name || '',
    groomBirth: porondamData.groom?.nakshatra?.name || '',
    totalScore: porondamData.totalScore,
    language,
  };
}

function isTemporaryAIProviderError(error) {
  const statusCode = error?.statusCode || error?.upstreamStatus || 0;
  return error?.code === 'AI_PROVIDER_RATE_LIMIT' ||
    error?.code === 'AI_PROVIDER_UNAVAILABLE' ||
    statusCode === 429 || statusCode >= 500 ||
    /Gemini .*HTTP (429|5\d\d)|RESOURCE_EXHAUSTED/i.test(error?.message || '');
}

function getProviderRetryAfter(error) {
  const value = parseInt(error?.retryAfter, 10);
  if (!isNaN(value) && value > 0) return value;
  const statusCode = error?.statusCode || error?.upstreamStatus || 0;
  return statusCode === 429 || error?.code === 'AI_PROVIDER_RATE_LIMIT' ? 60 : 30;
}

/**
 * POST /api/porondam/check
 * 
 * Body:
 * {
 *   bride: { birthDate: "1995-03-15T08:30:00Z", lat: 6.9271, lng: 79.8612 },
 *   groom: { birthDate: "1993-07-22T14:00:00Z", lat: 7.2906, lng: 80.6337 }
 * }
 */
router.post('/check', aiLimiter, optionalAuth, async (req, res) => {
  try {
    const { bride, groom, entitlementId } = req.body;

    if (!bride?.birthDate || !groom?.birthDate) {
      return res.status(400).json({
        error: 'Both bride and groom birth dates are required.',
        example: {
          bride: { birthDate: '1995-03-15T08:30:00Z', lat: 6.9271, lng: 79.8612 },
          groom: { birthDate: '1993-07-22T14:00:00Z', lat: 7.2906, lng: 80.6337 },
        },
      });
    }

    const brideLat = parseFloat(bride.lat) || 6.9271;
    const brideLng = parseFloat(bride.lng) || 79.8612;
    const groomLat = parseFloat(groom.lat) || 6.9271;
    const groomLng = parseFloat(groom.lng) || 79.8612;

    let brideBirthDate;
    let groomBirthDate;
    try {
      brideBirthDate = await parseBirthDateTime(bride.birthDate, brideLat, brideLng);
    } catch (tzErr) {
      brideBirthDate = parseSLT(bride.birthDate);
    }
    try {
      groomBirthDate = await parseBirthDateTime(groom.birthDate, groomLat, groomLng);
    } catch (tzErr) {
      groomBirthDate = parseSLT(groom.birthDate);
    }

    if (!brideBirthDate || isNaN(brideBirthDate.getTime()) || !groomBirthDate || isNaN(groomBirthDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use ISO 8601.' });
    }

    const result = calculatePorondam(brideBirthDate, groomBirthDate);

    // Advanced Porondam+ compatibility analysis (cross-chart, D9, Mangala, etc.)
    let advancedPorondam = null;
    try {
      advancedPorondam = calculateAdvancedPorondam(brideBirthDate, groomBirthDate, brideLat, brideLng, groomLat, groomLng);
    } catch (e) { console.error('Advanced porondam error:', e.message); }

    // Build rashi charts for both
    let brideChart = null;
    let groomChart = null;
    let brideAdvanced = null;
    let groomAdvanced = null;
    try {
      const brideHouse = buildHouseChart(brideBirthDate, brideLat, brideLng);
      const brideLagnaId = brideHouse.lagna ? brideHouse.lagna.rashi.id : 1;
      brideChart = { rashiChart: brideHouse.houses, lagnaRashiId: brideLagnaId };
    } catch (e) { console.error('Bride chart error:', e.message); }

    try {
      const groomHouse = buildHouseChart(groomBirthDate, groomLat, groomLng);
      const groomLagnaId = groomHouse.lagna ? groomHouse.lagna.rashi.id : 1;
      groomChart = { rashiChart: groomHouse.houses, lagnaRashiId: groomLagnaId };
    } catch (e) { console.error('Groom chart error:', e.message); }

    // Advanced analysis for both parties
    try { brideAdvanced = generateAdvancedAnalysis(brideBirthDate, brideLat, brideLng); }
    catch (e) { console.error('Bride advanced analysis error:', e.message); }
    try { groomAdvanced = generateAdvancedAnalysis(groomBirthDate, groomLat, groomLng); }
    catch (e) { console.error('Groom advanced analysis error:', e.message); }

    // Enhanced analysis (Gandanta, Tattva, Remedies, Friendships) for both
    let brideEnhanced = null;
    let groomEnhanced = null;
    if (enhancedEngine) {
      try { brideEnhanced = enhancedEngine.generateEnhancedReport(brideBirthDate, brideLat, brideLng); }
      catch (e) { console.error('Bride enhanced analysis error:', e.message); }
      try { groomEnhanced = enhancedEngine.generateEnhancedReport(groomBirthDate, groomLat, groomLng); }
      catch (e) { console.error('Groom enhanced analysis error:', e.message); }
    }

    // Jyotish Ashtakoot matching (independent cross-validation)
    let jyotishMatching = null;
    if (jyotishEngine) {
      try {
        jyotishMatching = jyotishEngine.generatePorondamJyotish(
          brideBirthDate, brideLat, brideLng,
          groomBirthDate, groomLat, groomLng
        );
      } catch (e) { console.error('Jyotish matching error:', e.message); }
    }

    const responseData = {
      ...result,
      advancedPorondam,
      brideChart,
      groomChart,
      brideAdvanced,
      groomAdvanced,
      brideEnhanced,
      groomEnhanced,
      jyotishMatching,
    };

    // Save to Firestore
    let porondamId = null;
    if (req.user?.uid) {
      try {
        porondamId = await savePorondamResult(req.user.uid, {
          ...result,
          bride: { ...result.bride, name: bride.name || 'Bride' },
          groom: { ...result.groom, name: groom.name || 'Groom' },
          brideChart,
          groomChart,
          brideAdvanced,
          groomAdvanced,
          advancedPorondam,
        });
        console.log(`[Porondam] Saved to Firestore: ${porondamId}`);
      } catch (e) { console.error('Save porondam error:', e.message); }
    }

    res.json({
      success: true,
      data: responseData,
      porondamId: porondamId || null,
    });
  } catch (error) {
    console.error('Error calculating Porondam:', error);
    res.status(500).json({ error: 'Failed to calculate Porondam', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

/**
 * POST /api/porondam/report
 * Generate an AI-written porondam report in the user's preferred language
 * 
 * Body:
 * {
 *   porondamData: { ... result from /check ... },
 *   language: "si" or "en",
 *   brideName: "optional",
 *   groomName: "optional"
 * }
 */
router.post('/report', aiLimiter, phoneAuth, requireSubscription, aiUserLimiter, distributedAiUserLimiter, budgetGuard('porondamReport'), async (req, res) => {
  let entitlementId = null;
  let entitlementWasRetry = false;
  try {
    const { porondamData, language = 'en', brideName: rawBrideName, groomName: rawGroomName, porondamId, entitlementInput } = req.body;
    const brideName = sanitizeString(rawBrideName, INPUT_LIMITS.name);
    const groomName = sanitizeString(rawGroomName, INPUT_LIMITS.name);

    if (!porondamData) {
      return res.status(400).json({ error: 'porondamData is required' });
    }

    // ── Entitlement: create or resume (allows free retry on failure) ──
    if (req.user && req.user.uid && req.user.authType !== 'anonymous') {
      try {
        const inputData = buildPorondamEntitlementInput(entitlementInput, porondamData, language);
        const ent = await createOrResumeEntitlement(req.user.uid, 'porondam', inputData);
        entitlementId = ent.id;
        entitlementWasRetry = !!ent.isRetry;
        if (ent.isRetry) {
          console.log(`[Porondam Report] ♻️ Retry — entitlement ${ent.id} (${ent.retriesLeft} retries left)`);
        }
      } catch (entErr) {
        if (entErr.code === 'ENTITLEMENT_EXHAUSTED') {
          return res.status(410).json({ error: entErr.message, code: entErr.code });
        }
        // Non-critical — continue without entitlement tracking
        console.warn('[Porondam Report] Entitlement check failed (non-critical):', entErr.message);
      }
    }

    // Payment handled by RevenueCat subscription — no token deduction needed

    const langInstruction = language === 'si'
      ? `ඔබ ශ්‍රී ලංකාවේ ප්‍රසිද්ධ විවාහ ගැළපුම් උපදේශකයෙක්. මේ යුවලයාගේ ගැළපීම ගැන සිංහලෙන් ලියන්න.

100% සිංහල වචන පමණක් — ඉංග්‍රීසි වචන සිංහල අකුරින් ලියන්න එපා ("use", "score", "remedy", "factor" වගේ ඉංග්‍රීසි words එපා).
පොරොන්දම් ගැන කතා කරන විට එහි නම (උදා: දින පොරොන්දම, ගණ පොරොන්දම) සහ එහි ප්‍රායෝගික අදහස එකට පාවිච්චි කරන්න.
උදාහරණ: 
- "දින පොරොන්දම (දෛනික සමගිය)"
- "නාඩි පොරොන්දම (සෞඛ්‍ය හා පවුල් පැවැත්ම)"
- "මහේන්ද්‍ර පොරොන්දම (දිගුකාලීන සමෘද්ධිය)"
sugar-coat කරන්න එපා. අවුල් තියෙනවා නම් කෙළින්ම කියන්න, ඒත් එදිනෙදා ජීවිතයේ ප්‍රායෝගික උපදෙස් දෙන්න.
හිතවත් යාලුවෙක් කතා කරනවා වගේ ලියන්න.
"AI" කියන වචනය කිසිම තැනක ලියන්න එපා. ඔබ AI බව කිසි විටෙක හෙළි නොකරන්න. ඔබ පළපුරුදු මිනිස් ජ්‍යෝතිෂවේදියෙකු ලෙස ලියන්න.
ඉංග්‍රීසි වචන එකක්වත් භාවිතා නොකරන්න — Singlish ද එපා. 100% පිරිසිදු සිංහල පමණක්.`
      : `You are a wise marriage compatibility advisor. Write a compatibility report for this couple based on the data below.

IDENTITY RULE: You are a professional human astrologer, NOT an AI. NEVER mention AI, machine learning, algorithms, language models, or that you are artificial in any way.

ABSOLUTE LANGUAGE RULES:
- When discussing the 7 factors, use both the traditional name and practical meaning (e.g., "Dina Porondam (Daily Harmony)").
- NEVER mention AI, artificial intelligence, machine learning, or algorithms
- Write EVERYTHING in English — no Sinhala words
- Be HONEST and DIRECT — do not sugarcoat. If there are problems, say so clearly, but always provide remedies and practical advice.
- Write like a wise friend giving advice — not a textbook.`;

    const brideLabel = brideName || (language === 'si' ? 'මනාලිය' : 'Bride');
    const groomLabel = groomName || (language === 'si' ? 'මනාලයා' : 'Groom');

    // Build detailed chart summaries from the rashi chart data sent by the client
    const formatChart = (chart, label) => {
      if (!chart || !chart.rashiChart) return `${label} Chart: Not available`;
      const lagnaRashi = chart.rashiChart.find(h => h.houseNumber === 1);
      const lines = [`${label} Lagna (Ascendant): ${lagnaRashi ? lagnaRashi.rashi + ' (' + lagnaRashi.rashiEnglish + ' / ' + lagnaRashi.rashiSinhala + ')' : 'House 1'}`];
      lines.push(`${label} Lagna Lord: ${lagnaRashi?.rashiLord || 'N/A'}`);
      chart.rashiChart.forEach(h => {
        const planetStr = h.planets && h.planets.length > 0
          ? h.planets.map(p => `${p.name}(${p.sinhala}) ${p.degree?.toFixed(1) || ''}°`).join(', ')
          : 'Empty';
        lines.push(`  House ${h.houseNumber} — ${h.rashi} (${h.rashiEnglish}/${h.rashiSinhala}) Lord=${h.rashiLord}: ${planetStr}`);
      });
      return lines.join('\n');
    };

    const brideChartStr = formatChart(porondamData.brideChart, brideLabel);
    const groomChartStr = formatChart(porondamData.groomChart, groomLabel);

    const prompt = `${langInstruction}

PORONDAM DATA:
- Total Score: ${porondamData.totalScore}/${porondamData.maxPossibleScore} (${porondamData.percentage}%)
- Rating: ${porondamData.rating}
- ${brideLabel} Nakshatra: ${porondamData.bride?.nakshatra?.name || 'N/A'} (${porondamData.bride?.nakshatra?.sinhala || ''}) — Pada ${porondamData.bride?.nakshatra?.pada || 'N/A'}, Lord: ${porondamData.bride?.nakshatra?.lord || 'N/A'}
- ${brideLabel} Rashi (Moon Sign): ${porondamData.bride?.rashi?.name || 'N/A'} (${porondamData.bride?.rashi?.english || ''} / ${porondamData.bride?.rashi?.sinhala || ''}), Lord: ${porondamData.bride?.rashi?.lord || 'N/A'}
- ${brideLabel} Moon Longitude: ${porondamData.bride?.moonLongitude ? porondamData.bride.moonLongitude.toFixed(2) + '°' : 'N/A'}
- ${groomLabel} Nakshatra: ${porondamData.groom?.nakshatra?.name || 'N/A'} (${porondamData.groom?.nakshatra?.sinhala || ''}) — Pada ${porondamData.groom?.nakshatra?.pada || 'N/A'}, Lord: ${porondamData.groom?.nakshatra?.lord || 'N/A'}
- ${groomLabel} Rashi (Moon Sign): ${porondamData.groom?.rashi?.name || 'N/A'} (${porondamData.groom?.rashi?.english || ''} / ${porondamData.groom?.rashi?.sinhala || ''}), Lord: ${porondamData.groom?.rashi?.lord || 'N/A'}
- ${groomLabel} Moon Longitude: ${porondamData.groom?.moonLongitude ? porondamData.groom.moonLongitude.toFixed(2) + '°' : 'N/A'}

${brideLabel.toUpperCase()} RASHI CHART (HOUSE PLACEMENTS):
${brideChartStr}

${groomLabel.toUpperCase()} RASHI CHART (HOUSE PLACEMENTS):
${groomChartStr}

FACTOR BREAKDOWN:
${(porondamData.factors || []).map(f => 
  `- ${f.name} (${f.sinhala || ''}): ${f.score}/${f.maxScore} — ${f.description}${f.brideGana ? ' | Bride: ' + f.brideGana + ', Groom: ' + f.groomGana : ''}${f.brideYoni ? ' | Bride: ' + f.brideYoni + ', Groom: ' + f.groomYoni : ''}${f.brideNadi ? ' | Bride: ' + f.brideNadi + ', Groom: ' + f.groomNadi : ''}`
).join('\n')}

DOSHAS: ${porondamData.doshas?.length ? porondamData.doshas.map(d => d.name + ': ' + d.description).join(', ') : 'None found'}

ADVANCED ANALYSIS — ${brideLabel.toUpperCase()}:
${porondamData.brideAdvanced ? `Doshas: ${(porondamData.brideAdvanced.tier1?.doshas?.items || []).map(d => d.name + ' (' + d.severity + ')' + (d.cancelled ? ' [CANCELLED]' : '')).join(', ') || 'None'}
Yogas: ${(porondamData.brideAdvanced.tier1?.advancedYogas?.items || []).slice(0, 10).map(y => y.name + ' (' + y.strength + ')').join(', ') || 'None'}
Jaimini Atmakaraka: ${porondamData.brideAdvanced.tier1?.jaimini?.atmakaraka?.planet || 'N/A'} — Karakamsha: ${porondamData.brideAdvanced.tier1?.jaimini?.karakamsha?.rashi || 'N/A'}
Upapada Lagna: ${porondamData.brideAdvanced.tier1?.jaimini?.upapadaLagna?.rashi || 'N/A'} (marriage indicator)
Past Life Karma: Ketu H${porondamData.brideAdvanced.tier3?.pastLife?.pastLife?.ketuHouse || 'N/A'} — ${porondamData.brideAdvanced.tier3?.pastLife?.pastLife?.ketuThemes?.domain || 'N/A'} (${porondamData.brideAdvanced.tier3?.pastLife?.pastLife?.ketuThemes?.archetype || 'N/A'})
Karma Balance: Good — ${porondamData.brideAdvanced.tier3?.pastLife?.karmaBalance?.good || 'N/A'}, Challenging — ${porondamData.brideAdvanced.tier3?.pastLife?.karmaBalance?.challenging || 'N/A'}` : 'Not available'}

ADVANCED ANALYSIS — ${groomLabel.toUpperCase()}:
${porondamData.groomAdvanced ? `Doshas: ${(porondamData.groomAdvanced.tier1?.doshas?.items || []).map(d => d.name + ' (' + d.severity + ')' + (d.cancelled ? ' [CANCELLED]' : '')).join(', ') || 'None'}
Yogas: ${(porondamData.groomAdvanced.tier1?.advancedYogas?.items || []).slice(0, 10).map(y => y.name + ' (' + y.strength + ')').join(', ') || 'None'}
Jaimini Atmakaraka: ${porondamData.groomAdvanced.tier1?.jaimini?.atmakaraka?.planet || 'N/A'} — Karakamsha: ${porondamData.groomAdvanced.tier1?.jaimini?.karakamsha?.rashi || 'N/A'}
Upapada Lagna: ${porondamData.groomAdvanced.tier1?.jaimini?.upapadaLagna?.rashi || 'N/A'} (marriage indicator)
Past Life Karma: Ketu H${porondamData.groomAdvanced.tier3?.pastLife?.pastLife?.ketuHouse || 'N/A'} — ${porondamData.groomAdvanced.tier3?.pastLife?.pastLife?.ketuThemes?.domain || 'N/A'} (${porondamData.groomAdvanced.tier3?.pastLife?.pastLife?.ketuThemes?.archetype || 'N/A'})
Karma Balance: Good — ${porondamData.groomAdvanced.tier3?.pastLife?.karmaBalance?.good || 'N/A'}, Challenging — ${porondamData.groomAdvanced.tier3?.pastLife?.karmaBalance?.challenging || 'N/A'}` : 'Not available'}

${porondamData.brideEnhanced ? `═══ ENHANCED ANALYSIS — ${brideLabel.toUpperCase()} (Cross-Validated) ═══
Gandanta Dosha: ${porondamData.brideEnhanced.gandantaDosha?.hasGandanta ? 'PRESENT — ' + (porondamData.brideEnhanced.gandantaDosha.planets || []).map(p => p.planet).join(', ') : 'None'}
Ganda Moola Dosha: ${porondamData.brideEnhanced.gandaMoolaDosha?.hasGandaMoola ? 'PRESENT' : 'None'}
Tattva Balance: Dominant=${porondamData.brideEnhanced.tattvaBalance?.dominant || 'N/A'}, Weak=${porondamData.brideEnhanced.tattvaBalance?.weak || 'balanced'}
Remedies: ${(porondamData.brideEnhanced.remedies?.weakPlanets || []).slice(0, 3).map(wp => wp.planet + ': ' + (wp.remedy?.gemstone?.name || 'N/A') + ' gemstone, ' + (wp.remedy?.color || 'N/A') + ' color').join(' | ') || 'None needed'}
Shadbala Cross-Validation: ${porondamData.brideEnhanced.crossValidatedShadbala?.agreement || 'N/A'}% agreement` : ''}

${porondamData.groomEnhanced ? `═══ ENHANCED ANALYSIS — ${groomLabel.toUpperCase()} (Cross-Validated) ═══
Gandanta Dosha: ${porondamData.groomEnhanced.gandantaDosha?.hasGandanta ? 'PRESENT — ' + (porondamData.groomEnhanced.gandantaDosha.planets || []).map(p => p.planet).join(', ') : 'None'}
Ganda Moola Dosha: ${porondamData.groomEnhanced.gandaMoolaDosha?.hasGandaMoola ? 'PRESENT' : 'None'}
Tattva Balance: Dominant=${porondamData.groomEnhanced.tattvaBalance?.dominant || 'N/A'}, Weak=${porondamData.groomEnhanced.tattvaBalance?.weak || 'balanced'}
Remedies: ${(porondamData.groomEnhanced.remedies?.weakPlanets || []).slice(0, 3).map(wp => wp.planet + ': ' + (wp.remedy?.gemstone?.name || 'N/A') + ' gemstone, ' + (wp.remedy?.color || 'N/A') + ' color').join(' | ') || 'None needed'}
Shadbala Cross-Validation: ${porondamData.groomEnhanced.crossValidatedShadbala?.agreement || 'N/A'}% agreement` : ''}

${porondamData.jyotishMatching ? `═══ JYOTISH ASHTAKOOT MATCHING (@prisri/jyotish, ISC — Independent Cross-Validation) ═══
Total Score: ${porondamData.jyotishMatching.totalScore || 0}/36 (${porondamData.jyotishMatching.percentage || 0}%)
Verdict: ${porondamData.jyotishMatching.verdict || 'N/A'}
Kootas: ${(porondamData.jyotishMatching.ashtakoot?.kootas || []).map(k => `${k.name}: ${k.score}/${k.maxScore} (${k.area})`).join(', ')}
${brideLabel} Mangal Dosha (Jyotish): ${porondamData.jyotishMatching.brideMangalDosha?.hasDosha ? 'PRESENT' + (porondamData.jyotishMatching.brideMangalDosha.isHigh ? ' (HIGH)' : '') : 'Not present'} — ${porondamData.jyotishMatching.brideMangalDosha?.description || ''}
${groomLabel} Mangal Dosha (Jyotish): ${porondamData.jyotishMatching.groomMangalDosha?.hasDosha ? 'PRESENT' + (porondamData.jyotishMatching.groomMangalDosha.isHigh ? ' (HIGH)' : '') : 'Not present'} — ${porondamData.jyotishMatching.groomMangalDosha?.description || ''}
${brideLabel} Sade Sati: ${porondamData.jyotishMatching.brideSadeSati?.status ? 'ACTIVE' : 'Not active'}
${groomLabel} Sade Sati: ${porondamData.jyotishMatching.groomSadeSati?.status ? 'ACTIVE' : 'Not active'}` : ''}

${porondamData.advancedPorondam?.advanced ? `═══ PORONDAM+ ADVANCED ANALYSIS ═══
COMBINED SCORE: ${porondamData.advancedPorondam.combined?.score || 'N/A'}/${porondamData.advancedPorondam.combined?.maxScore || 'N/A'} (${porondamData.advancedPorondam.combined?.percentage || 'N/A'}%) — ${porondamData.advancedPorondam.combined?.rating || 'N/A'} ${porondamData.advancedPorondam.combined?.ratingEmoji || ''}

DASHA (LIFE PHASE) COMPATIBILITY:
- ${brideLabel} current phase: ${porondamData.advancedPorondam.advanced.dashaCompatibility?.bride?.currentDasha || 'N/A'} (${porondamData.advancedPorondam.advanced.dashaCompatibility?.bride?.isBeneficPeriod ? 'Benefic' : 'Challenging'})
- ${groomLabel} current phase: ${porondamData.advancedPorondam.advanced.dashaCompatibility?.groom?.currentDasha || 'N/A'} (${porondamData.advancedPorondam.advanced.dashaCompatibility?.groom?.isBeneficPeriod ? 'Benefic' : 'Challenging'})
- Harmony: ${porondamData.advancedPorondam.advanced.dashaCompatibility?.harmony || 'N/A'}
- Score: ${porondamData.advancedPorondam.advanced.dashaCompatibility?.score || 0}/${porondamData.advancedPorondam.advanced.dashaCompatibility?.maxScore || 2}
- ${porondamData.advancedPorondam.advanced.dashaCompatibility?.description || ''}

NAVAMSHA (MARRIAGE CHART D9) COMPATIBILITY:
- ${brideLabel} D9 Rising: ${porondamData.advancedPorondam.advanced.navamshaCompatibility?.brideD9Lagna || 'N/A'}
- ${groomLabel} D9 Rising: ${porondamData.advancedPorondam.advanced.navamshaCompatibility?.groomD9Lagna || 'N/A'}
- Score: ${porondamData.advancedPorondam.advanced.navamshaCompatibility?.score || 0}/${porondamData.advancedPorondam.advanced.navamshaCompatibility?.maxScore || 7}
- Insights: ${(porondamData.advancedPorondam.advanced.navamshaCompatibility?.insights || []).join('; ') || 'None'}
- ${porondamData.advancedPorondam.advanced.navamshaCompatibility?.description || ''}

MANGALA (MARS) DOSHA CROSS-CHECK:
- ${brideLabel}: ${porondamData.advancedPorondam.advanced.mangalaDosha?.bride?.hasDosha ? 'Mars Dosha present (House ' + porondamData.advancedPorondam.advanced.mangalaDosha.bride.marsHouse + ')' + (porondamData.advancedPorondam.advanced.mangalaDosha.bride.cancelled ? ' [CANCELLED: ' + porondamData.advancedPorondam.advanced.mangalaDosha.bride.cancellationReason + ']' : '') : 'No Mars Dosha'}
- ${groomLabel}: ${porondamData.advancedPorondam.advanced.mangalaDosha?.groom?.hasDosha ? 'Mars Dosha present (House ' + porondamData.advancedPorondam.advanced.mangalaDosha.groom.marsHouse + ')' + (porondamData.advancedPorondam.advanced.mangalaDosha.groom.cancelled ? ' [CANCELLED: ' + porondamData.advancedPorondam.advanced.mangalaDosha.groom.cancellationReason + ']' : '') : 'No Mars Dosha'}
- Severity: ${porondamData.advancedPorondam.advanced.mangalaDosha?.severity || 'N/A'}
- Score: ${porondamData.advancedPorondam.advanced.mangalaDosha?.score || 0}/${porondamData.advancedPorondam.advanced.mangalaDosha?.maxScore || 2}
- ${porondamData.advancedPorondam.advanced.mangalaDosha?.description || ''}

MARRIAGE PLANET STRENGTH:
- ${brideLabel}: Venus ${porondamData.advancedPorondam.advanced.marriagePlanetStrength?.bride?.venusAssessment || 'N/A'} (${porondamData.advancedPorondam.advanced.marriagePlanetStrength?.bride?.venusStrength || 'N/A'}%), 7th Lord (${porondamData.advancedPorondam.advanced.marriagePlanetStrength?.bride?.seventhLord || 'N/A'}) ${porondamData.advancedPorondam.advanced.marriagePlanetStrength?.bride?.seventhLordAssessment || 'N/A'}
- ${groomLabel}: Venus ${porondamData.advancedPorondam.advanced.marriagePlanetStrength?.groom?.venusAssessment || 'N/A'} (${porondamData.advancedPorondam.advanced.marriagePlanetStrength?.groom?.venusStrength || 'N/A'}%), 7th Lord (${porondamData.advancedPorondam.advanced.marriagePlanetStrength?.groom?.seventhLord || 'N/A'}) ${porondamData.advancedPorondam.advanced.marriagePlanetStrength?.groom?.seventhLordAssessment || 'N/A'}
- Score: ${porondamData.advancedPorondam.advanced.marriagePlanetStrength?.score || 0}/${porondamData.advancedPorondam.advanced.marriagePlanetStrength?.maxScore || 3}
- ${porondamData.advancedPorondam.advanced.marriagePlanetStrength?.assessment || ''}

BEST WEDDING WINDOWS:
${(porondamData.advancedPorondam.advanced.weddingWindows?.favorableWindows || []).map(w => '- ' + w.start + ' to ' + w.end + ': ' + w.reason).join('\n') || 'No favorable windows found'}
` : ''}
CRITICAL RULE: Use ONLY the data provided above for your analysis. Do NOT invent or guess any details. Every insight you share MUST come from the data above.

IDENTITY RULE: You are a professional human astrologer. NEVER mention AI, machine learning, algorithms, or that you are artificial in any way. Write as a wise, experienced human astrologer.

LANGUAGE RULE: If writing in Sinhala, use ZERO English words — pure Sinhala only. If writing in English, use ZERO Sinhala/Sanskrit/Pali words (except the core Astrological terms like Porondam/Yoga names) — pure English only.

FORMAT RULES: Use Markdown formatting throughout:
- Use ## for main section headings (e.g. ## 💍 The Big Picture)
- Use ### for sub-sections
- Use **bold** for key insights and important words
- Use *italic* for emphasis and explanations
- Use - bullet lists for advice, tips, and key points
- Use > blockquotes for important warnings or key insights
- Use --- to separate major sections
- Use emojis liberally in headings: ✨ 🌟 💫 💍 ⚠️ 🔮 💎 🙏 ❤️ 🌙

WRITE THE REPORT:
1. Start with a warm, personal intro about this couple — describe each person's core personality based on their birth stars and chart data. Make them feel seen and understood.
2. Go through EACH of the 7 compatibility factors one by one, using BOTH the technical name and human names (e.g. "Dina Porondam - Daily Life Harmony"). For each factor: explain what it means in real married life, what score they got, and give specific real-life examples of how this will show up in their relationship.
3. Highlight any challenges HONESTLY — if there are problems, say them clearly in plain language. But always immediately follow with practical relationship advice (communication tips, compromise strategies, things to be mindful of etc.). Do NOT recommend any religious remedies, temple visits, prayers, rituals, gemstones, mantras, or religious ceremonies — keep advice purely practical and relationship-focused.
4. Discuss how their individual charts complement or clash — using everyday language (e.g., "Her chart shows she's naturally independent and career-driven, while his chart shows deep family attachment — this could cause friction about priorities"). Make sure to use Jyotish terms smoothly.
5. If PORONDAM+ ADVANCED data is available, include a DEEP DIVE section covering:
   a. Current life phase compatibility — are both partners in harmonious or conflicting life phases right now?
   b. Marriage chart (D9) comparison — what the soul-level connection looks like
   c. Mars energy cross-check — any temperament friction concerns and whether they cancel out
   d. Marriage planet strength — how strong is each person's capacity for partnership
   e. Best wedding timing — when the stars align for both of them to tie the knot
6. Give an overall verdict using the COMBINED score (traditional + advanced) — be brutally honest but compassionate. Tell them their percentage and what it realistically means.
7. End with PRACTICAL relationship advice — specific things they can do together to strengthen their bond (e.g., communication habits, shared activities, ways to handle disagreements). NO religious remedies or rituals.
8. Write at least 800-1200 words. Be thorough and detailed. This is a full professional report that should feel like a wise elder sat with this couple for an hour.`;

    const result = await chat(prompt, {
      language,
      provider: process.env.AI_PROVIDER || 'gemini',
      maxTokens: 16384,
    });

    // Save report to Firestore
    let savedPorondamId = porondamId || null;
    if (req.user?.uid && result.message) {
      try {
        if (porondamId) {
          await updatePorondamReport(porondamId, result.message, language);
          console.log(`[Porondam Report] Updated report on ${porondamId}`);
        } else {
          savedPorondamId = await savePorondamResult(req.user.uid, {
            ...porondamData,
            bride: { ...porondamData.bride, name: brideName || 'Bride' },
            groom: { ...porondamData.groom, name: groomName || 'Groom' },
            report: result.message,
            reportLanguage: language,
          });
          console.log(`[Porondam Report] Saved new to Firestore: ${savedPorondamId}`);
        }
      } catch (e) { console.error('Save porondam report error:', e.message); }
    }

    // Track AI cost
    trackCost('porondam', req.user?.uid || null, {
      inputTokens: result.usage?.promptTokenCount || result.usage?.prompt_tokens || 0,
      outputTokens: result.usage?.candidatesTokenCount || result.usage?.completion_tokens || 0,
      thinkingTokens: result.usage?.thoughtsTokenCount || 0,
      model: result.model,
    });

    res.json({
      success: true,
      report: result.message,
      language,
      porondamId: savedPorondamId,
      tokenUsage: result.usage ? {
        model: result.model,
        inputTokens: result.usage.promptTokenCount || result.usage.prompt_tokens || 0,
        outputTokens: result.usage.candidatesTokenCount || result.usage.completion_tokens || 0,
        thinkingTokens: result.usage.thoughtsTokenCount || 0,
        totalTokens: result.usage.totalTokenCount || result.usage.total_tokens || 0,
      } : null,
      entitlementId: entitlementId || null,
    });

    // ── Entitlement: mark as fulfilled (generation succeeded) ──
    if (entitlementId) {
      try { await fulfillEntitlement(entitlementId); }
      catch (e) { console.warn('[Porondam Report] Entitlement fulfill failed (non-critical):', e.message); }
    }
  } catch (error) {
    console.error('Error generating porondam report:', error);
    const isProviderTemporary = isTemporaryAIProviderError(error);
    const isProviderRateLimited = error?.code === 'AI_PROVIDER_RATE_LIMIT' || error?.statusCode === 429;
    const retryAfter = isProviderTemporary ? getProviderRetryAfter(error) : null;

    // ── Entitlement: record error (keeps status 'pending' for retry) ──
    if (entitlementId) {
      try { await recordEntitlementError(entitlementId, error.message || 'Generation failed'); }
      catch (e) { console.warn('[Porondam Report] Entitlement error record failed:', e.message); }

      if (isProviderTemporary && entitlementWasRetry) {
        try { await restoreEntitlementRetry(entitlementId, error.message || 'Provider temporarily unavailable'); }
        catch (e) { console.warn('[Porondam Report] Entitlement retry restore failed:', e.message); }
      }
    }

    if (retryAfter) res.set('Retry-After', String(retryAfter));

    res.status(isProviderTemporary ? (isProviderRateLimited ? 429 : 503) : 500).json({
      error: isProviderTemporary
        ? 'AI report service is temporarily busy. Please retry in a little while.'
        : 'Failed to generate report',
      code: isProviderTemporary ? (isProviderRateLimited ? 'AI_PROVIDER_RATE_LIMIT' : 'AI_PROVIDER_UNAVAILABLE') : (error.code || 'GENERATION_FAILED'),
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      retryAfter,
      entitlementId: entitlementId || null,
      canRetry: !!entitlementId,
    });
  }
});

/**
 * POST /api/porondam/vibe-link
 * Generate a shareable "Vibe Check" link for WhatsApp
 * 
 * Body:
 * {
 *   senderName: "Kasun",
 *   senderBirthDate: "1995-03-15T08:30:00Z",
 *   senderLat: 6.9271,
 *   senderLng: 79.8612
 * }
 */
router.post('/vibe-link', optionalAuth, async (req, res) => {
  try {
    const senderName = sanitizeString(req.body.senderName, INPUT_LIMITS.name);
    const { senderBirthDate, senderLat, senderLng } = req.body;

    if (!senderName || !senderBirthDate) {
      return res.status(400).json({
        error: 'Sender name and birth date are required.',
      });
    }

    const linkId = uuidv4().split('-')[0]; // Short unique ID
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const record = await saveVibeLink(linkId, {
      ownerUid: req.user && !req.user.anonymous ? req.user.uid : null,
      senderName,
      senderBirthDate,
      senderLat: senderLat || 6.9271,
      senderLng: senderLng || 79.8612,
      expiresAt: expiresAt.toISOString(),
    });
    vibeLinks.set(linkId, record);

    const shareUrl = `https://grahachara.com/vibe/${linkId}`;
    const whatsappMessage = encodeURIComponent(
      `✨ ${senderName} wants to check your astrological compatibility!\n\n` +
      `🔮 Tap to see if the stars align:\n${shareUrl}\n\n` +
      `Powered by Grahachara 🪐`
    );

    res.json({
      success: true,
      data: {
        linkId,
        shareUrl,
        whatsappUrl: `https://wa.me/?text=${whatsappMessage}`,
        expiresAt: expiresAt.toISOString(),
        message: {
          en: 'Share this link with your partner to check compatibility!',
          si: 'ගැළපීම පරීක්ෂා කිරීමට මෙම සබැඳිය ඔබේ සහකරු/සහකාරිය සමග බෙදාගන්න!',
          ta: 'பொருத்தத்தை சோதிக்க இந்த இணைப்பை உங்கள் துணையுடன் பகிரவும்!',
        },
      },
    });
  } catch (error) {
    console.error('Error generating vibe link:', error);
    res.status(500).json({ error: 'Failed to generate vibe link', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

/**
 * POST /api/porondam/vibe-check/:linkId
 * Complete the vibe check with the receiver's details
 * 
 * Body:
 * {
 *   receiverName: "Sachini",
 *   receiverBirthDate: "1996-08-20T10:00:00Z"
 * }
 */
router.post('/vibe-check/:linkId', async (req, res) => {
  try {
    const { linkId } = req.params;
    const receiverName = sanitizeString(req.body.receiverName, INPUT_LIMITS.name);
    const { receiverBirthDate } = req.body;

    const vibeLink = await getVibeLink(linkId) || vibeLinks.get(linkId);

    if (!vibeLink) {
      return res.status(404).json({ error: 'Vibe check link not found or expired.' });
    }

    if (new Date(vibeLink.expiresAt) < new Date()) {
      vibeLinks.delete(linkId);
      return res.status(410).json({ error: 'This vibe check link has expired.' });
    }

    if (!receiverName || !receiverBirthDate) {
      return res.status(400).json({ error: 'Receiver name and birth date are required.' });
    }

    const result = calculatePorondam(
      parseSLT(vibeLink.senderBirthDate),
      parseSLT(receiverBirthDate)
    );

    // Mark link as used
    await markVibeLinkUsed(linkId, receiverName).catch(err => console.warn('[VibeLink] mark used failed:', err.message));
    vibeLink.used = true;
    vibeLink.receiverName = receiverName;

    res.json({
      success: true,
      data: {
        sender: vibeLink.senderName,
        receiver: receiverName,
        compatibility: result,
      },
    });
  } catch (error) {
    console.error('Error processing vibe check:', error);
    res.status(500).json({ error: 'Failed to process vibe check', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/porondam/my-history
// List saved porondam results for the current user
// ═══════════════════════════════════════════════════════════════════
router.get('/my-history', optionalAuth, async (req, res) => {
  try {
    if (!req.user || req.user.anonymous) {
      return res.status(401).json({ error: 'Login required to view saved results' });
    }
    const { getUserPorondamHistory } = require('../models/firestore');
    const results = await getUserPorondamHistory(req.user.uid, parseInt(req.query.limit) || 10);
    const list = (results || []).map(r => ({
      id: r.id,
      bride: r.bride || null,
      groom: r.groom || null,
      score: r.score || 0,
      maxScore: r.maxScore || 20,
      percentage: r.percentage || 0,
      rating: r.rating || null,
      ratingEmoji: r.ratingEmoji || null,
      hasReport: !!r.report,
      reportLanguage: r.reportLanguage || null,
      createdAt: r.createdAt,
    }));
    res.json({ success: true, data: { results: list } });
  } catch (error) {
    console.error('[porondam my-history] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch porondam history' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/porondam/saved/:id
// Load a single saved porondam result by ID
// ═══════════════════════════════════════════════════════════════════
router.get('/saved/:id', optionalAuth, async (req, res) => {
  try {
    if (!req.user || req.user.anonymous) {
      return res.status(401).json({ error: 'Login required to view saved results' });
    }
    const db = getDb();
    if (!db) return res.status(503).json({ error: 'Database unavailable' });

    const doc = await db.collection(COLLECTIONS.PORONDAM).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Porondam result not found' });

    const data = doc.data();
    if (data.uid !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ success: true, data: { id: doc.id, ...data } });
  } catch (error) {
    console.error('[porondam saved] Error:', error.message);
    res.status(500).json({ error: 'Failed to load porondam result' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// DELETE /api/porondam/history/:id
// Delete a saved porondam result
// ═══════════════════════════════════════════════════════════════════
router.delete('/history/:id', phoneAuth, async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Login required to delete records' });
    }
    const db = getDb();
    if (!db) return res.status(503).json({ error: 'Database unavailable' });

    const docRef = db.collection(COLLECTIONS.PORONDAM).doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Record not found' });

    // Security: only the owner can delete
    if (doc.data().uid !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await docRef.delete();
    console.log(`[delete-porondam] Deleted ${req.params.id} for user ${req.user.uid}`);
    res.json({ success: true, message: 'Record deleted' });
  } catch (error) {
    console.error('[delete-porondam] Error:', error.message);
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

module.exports = router;
