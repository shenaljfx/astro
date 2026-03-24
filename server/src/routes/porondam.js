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
const { optionalAuth } = require('../middleware/auth');
const { phoneAuth } = require('../middleware/subscription');
const { requireTokens } = require('../middleware/tokens');
const { savePorondamResult, updatePorondamReport } = require('../models/firestore');
const { getDb, COLLECTIONS } = require('../config/firebase');

// In-memory store for vibe-check links (use Redis/DB in production)
const vibeLinks = new Map();

/**
 * POST /api/porondam/check
 * 
 * Body:
 * {
 *   bride: { birthDate: "1995-03-15T08:30:00Z", lat: 6.9271, lng: 79.8612 },
 *   groom: { birthDate: "1993-07-22T14:00:00Z", lat: 7.2906, lng: 80.6337 }
 * }
 */
router.post('/check', optionalAuth, async (req, res) => {
  try {
    const { bride, groom } = req.body;

    if (!bride?.birthDate || !groom?.birthDate) {
      return res.status(400).json({
        error: 'Both bride and groom birth dates are required.',
        example: {
          bride: { birthDate: '1995-03-15T08:30:00Z', lat: 6.9271, lng: 79.8612 },
          groom: { birthDate: '1993-07-22T14:00:00Z', lat: 7.2906, lng: 80.6337 },
        },
      });
    }

    const brideBirthDate = parseSLT(bride.birthDate);
    const groomBirthDate = parseSLT(groom.birthDate);

    if (!brideBirthDate || isNaN(brideBirthDate.getTime()) || !groomBirthDate || isNaN(groomBirthDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use ISO 8601.' });
    }

    const brideLat = bride.lat || 6.9271;
    const brideLng = bride.lng || 79.8612;
    const groomLat = groom.lat || 6.9271;
    const groomLng = groom.lng || 79.8612;

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

    const responseData = {
      ...result,
      advancedPorondam,
      brideChart,
      groomChart,
      brideAdvanced,
      groomAdvanced,
    };

    // Save to Firestore — DISABLED
    /*
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
      } catch (e) { console.error('Save porondam error:', e.message); }
    }
    */
    let porondamId = null;

    res.json({
      success: true,
      data: responseData,
      porondamId: porondamId || null,
    });
  } catch (error) {
    console.error('Error calculating Porondam:', error);
    res.status(500).json({ error: 'Failed to calculate Porondam', details: error.message });
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
router.post('/report', phoneAuth, requireTokens(50, 'Porondam Report'), async (req, res) => {
  try {
    const { porondamData, language = 'en', brideName, groomName, porondamId } = req.body;

    if (!porondamData) {
      return res.status(400).json({ error: 'porondamData is required' });
    }

    // Deduct LKR 10 before AI generation
    let newBalance = req.tokenBalanceBefore;
    try {
      const deduction = await req.deductTokens();
      newBalance = deduction.newBalance;
    } catch (e) {
      if (e.code === 'INSUFFICIENT_BALANCE') {
        return res.status(402).json({ error: 'Insufficient token balance', balance: e.balance, required: e.required, topUpRequired: true });
      }
      throw e;
    }

    const langInstruction = language === 'si'
      ? `ඔබ ශ්‍රී ලංකාවේ ප්‍රසිද්ධ විවාහ ගැළපුම් උපදේශකයෙක්. මේ යුවලයාගේ ගැළපීම ගැන සිංහලෙන් ලියන්න.

100% සිංහල වචන පමණක් — ඉංග්‍රීසි වචන සිංහල අකුරින් ලියන්න එපා ("use", "score", "remedy", "factor" වගේ ඉංග්‍රීසි words එපා).
"දින පොරොන්දම", "ගණ", "යෝනි", "නාඩි", "වශ්‍ය", "රාශි", "මහේන්ද්‍ර", "ලග්නය", "නක්ෂත්‍ර", "දෝෂ", "යෝග" වගේ ජ්‍යෝතිෂ වචන ලියන්න එපා.
ඒ වෙනුවට සරල සිංහලෙන් කියන්න:
- "දින පොරොන්දම" → "දෛනික ගැළපීම" හෝ "එදිනෙදා ජීවිතයේ ගැළපීම"
- "ගණ පොරොන්දම" → "ස්වභාවයේ ගැළපීම"
- "යෝනි පොරොන්දම" → "ශාරීරික හා හැඟීම්වල ගැළපීම"
- "නාඩි පොරොන්දම" → "සෞඛ්‍ය ගැළපීම"
- "වශ්‍ය පොරොන්දම" → "ආකර්ශනය හා බැඳීම"
- "රාශි පොරොන්දම" → "මනස හා චින්තනයේ ගැළපීම"
- "මහේන්ද්‍ර පොරොන්දම" → "දිගු කාලීන සමෘද්ධිය"
- "දෝෂ" → "අභියෝග" හෝ "බාධක"
- "ග්‍රහ" → "අහස්හි බලපෑම්"
sugar-coat කරන්න එපා. අවුල් තියෙනවා නම් කෙළින්ම කියන්න, ඒත් එදිනෙදා ජීවිතයේ ප්‍රායෝගික උපදෙස් දෙන්න.
ආගමික වතාවත් (පූජා, ශාන්තිකර්ම, පිරිත්, මාල, යන්ත්‍ර) නිර්දේශ කරන්න එපා — බුද්ධිමත් මිනිස් සබඳතා උපදෙස් පමණක් දෙන්න.
හිතවත් යාලුවෙක් කතා කරනවා වගේ ලියන්න.`
      : `You are a wise marriage compatibility advisor. Write a compatibility report for this couple based on the data below.

ABSOLUTE LANGUAGE RULES:
- NEVER use these words: Porondam, Nakshatra, Rashi, Lagna, Dasha, Dosha, Yoga, Graha, Bhukti, Pada, Ayanamsha, Bhava, Karakamsha, Atmakaraka, Upapada, Dina, Gana, Yoni, Nadi, Vasya, Mahendra, Tithi, Karana, Panchanga
- Instead use: "birth star", "moon sign", "rising sign", "life phases", "challenges", "special strengths", "planets", "compatibility factor"
- For the 7 factors, translate them to human concepts:
  * Dina → "Daily Life Harmony" (how well they sync day-to-day)
  * Gana → "Temperament Match" (are they both calm/fierce/gentle?)  
  * Yoni → "Physical & Emotional Chemistry" (intimacy and attraction)
  * Nadi → "Health & Genetic Compatibility" (biological harmony)
  * Vasya → "Mutual Attraction & Bonding" (natural pull toward each other)
  * Rashi → "Mental & Emotional Wavelength" (do they think alike?)
  * Mahendra → "Long-term Prosperity" (wealth and growth together)
- Be HONEST and DIRECT — do not sugarcoat. If there are problems, say so clearly, but always provide remedies and practical advice.
- Write like a wise friend giving advice — not a textbook.
- The reader knows NOTHING about astrology. Explain everything in simple everyday words.`;

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
Past Life Karma: ${porondamData.brideAdvanced.tier3?.pastLife?.pastLife?.pastLifeStory || 'N/A'}
Karma Balance: Good — ${porondamData.brideAdvanced.tier3?.pastLife?.karmaBalance?.good || 'N/A'}, Challenging — ${porondamData.brideAdvanced.tier3?.pastLife?.karmaBalance?.challenging || 'N/A'}` : 'Not available'}

ADVANCED ANALYSIS — ${groomLabel.toUpperCase()}:
${porondamData.groomAdvanced ? `Doshas: ${(porondamData.groomAdvanced.tier1?.doshas?.items || []).map(d => d.name + ' (' + d.severity + ')' + (d.cancelled ? ' [CANCELLED]' : '')).join(', ') || 'None'}
Yogas: ${(porondamData.groomAdvanced.tier1?.advancedYogas?.items || []).slice(0, 10).map(y => y.name + ' (' + y.strength + ')').join(', ') || 'None'}
Jaimini Atmakaraka: ${porondamData.groomAdvanced.tier1?.jaimini?.atmakaraka?.planet || 'N/A'} — Karakamsha: ${porondamData.groomAdvanced.tier1?.jaimini?.karakamsha?.rashi || 'N/A'}
Upapada Lagna: ${porondamData.groomAdvanced.tier1?.jaimini?.upapadaLagna?.rashi || 'N/A'} (marriage indicator)
Past Life Karma: ${porondamData.groomAdvanced.tier3?.pastLife?.pastLife?.pastLifeStory || 'N/A'}
Karma Balance: Good — ${porondamData.groomAdvanced.tier3?.pastLife?.karmaBalance?.good || 'N/A'}, Challenging — ${porondamData.groomAdvanced.tier3?.pastLife?.karmaBalance?.challenging || 'N/A'}` : 'Not available'}

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

ABSOLUTE OUTPUT RULE: All the data labels above (Nakshatra, Rashi, Lagna, House, Lord, Atmakaraka, Upapada, etc.) are FOR YOUR REFERENCE ONLY. NEVER write these technical terms in your output. Translate everything to simple human language.

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
2. Go through EACH of the 7 compatibility factors one by one — but use HUMAN names (Daily Life Harmony, Temperament Match, Physical & Emotional Chemistry, Health Compatibility, Mutual Attraction, Mental Wavelength, Long-term Prosperity). For each factor: explain what it means in real married life, what score they got, and give specific real-life examples of how this will show up in their relationship.
3. Highlight any challenges HONESTLY — if there are problems, say them clearly in plain language. But always immediately follow with practical relationship advice (communication tips, compromise strategies, things to be mindful of etc.). Do NOT recommend any religious remedies, temple visits, prayers, rituals, gemstones, mantras, or religious ceremonies — keep advice purely practical and relationship-focused.
4. Discuss how their individual charts complement or clash — using everyday language (e.g., "Her chart shows she's naturally independent and career-driven, while his chart shows deep family attachment — this could cause friction about priorities")
5. If PORONDAM+ ADVANCED data is available, include a DEEP DIVE section covering:
   a. Current life phase compatibility — are both partners in harmonious or conflicting life phases right now?
   b. Marriage chart (D9) comparison — what the soul-level connection looks like
   c. Mars energy cross-check — any temperament friction concerns and whether they cancel out
   d. Marriage planet strength — how strong is each person's capacity for partnership
   e. Best wedding timing — when the stars align for both of them to tie the knot
6. Give an overall verdict using the COMBINED score (traditional + advanced) — be brutally honest but compassionate. Tell them their percentage and what it realistically means.
7. End with PRACTICAL relationship advice — specific things they can do together to strengthen their bond (e.g., communication habits, shared activities, ways to handle disagreements). NO religious remedies or rituals.
8. Write at least 800-1200 words. Be thorough and detailed. This is a full professional report that should feel like a wise elder sat with this couple for an hour.
9. NEVER use any technical astrology terms in your output — everything should be in simple everyday language that someone with ZERO astrology knowledge can understand and find valuable.`;

    const result = await chat(prompt, {
      language,
      provider: process.env.AI_PROVIDER || 'gemini',
      maxTokens: 165288,
    });

    // Save report to Firestore — DISABLED
    /*
    let savedPorondamId = porondamId || null;
    if (req.user?.uid && result.message) {
      try {
        if (porondamId) {
          await updatePorondamReport(porondamId, result.message, language);
        } else {
          savedPorondamId = await savePorondamResult(req.user.uid, {
            ...porondamData,
            bride: { ...porondamData.bride, name: brideName || 'Bride' },
            groom: { ...porondamData.groom, name: groomName || 'Groom' },
            report: result.message,
            reportLanguage: language,
          });
        }
      } catch (e) { console.error('Save porondam report error:', e.message); }
    }
    */
    let savedPorondamId = porondamId || null;

    res.json({
      success: true,
      report: result.message,
      language,
      tokenCost: req.tokenCost,
      balance: newBalance,
      porondamId: savedPorondamId,
      tokenUsage: result.usage ? {
        model: result.model,
        inputTokens: result.usage.promptTokenCount || result.usage.prompt_tokens || 0,
        outputTokens: result.usage.candidatesTokenCount || result.usage.completion_tokens || 0,
        thinkingTokens: result.usage.thoughtsTokenCount || 0,
        totalTokens: result.usage.totalTokenCount || result.usage.total_tokens || 0,
      } : null,
    });
  } catch (error) {
    console.error('Error generating porondam report:', error);
    res.status(500).json({ error: 'Failed to generate report', details: error.message });
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
router.post('/vibe-link', (req, res) => {
  try {
    const { senderName, senderBirthDate, senderLat, senderLng } = req.body;

    if (!senderName || !senderBirthDate) {
      return res.status(400).json({
        error: 'Sender name and birth date are required.',
      });
    }

    const linkId = uuidv4().split('-')[0]; // Short unique ID
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    vibeLinks.set(linkId, {
      senderName,
      senderBirthDate,
      senderLat: senderLat || 6.9271,
      senderLng: senderLng || 79.8612,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      used: false,
    });

    const shareUrl = `https://grahachara.lk/vibe/${linkId}`;
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
    res.status(500).json({ error: 'Failed to generate vibe link', details: error.message });
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
router.post('/vibe-check/:linkId', (req, res) => {
  try {
    const { linkId } = req.params;
    const { receiverName, receiverBirthDate } = req.body;

    const vibeLink = vibeLinks.get(linkId);

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
    res.status(500).json({ error: 'Failed to process vibe check', details: error.message });
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
