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
const { calculatePorondam } = require('../engine/porondam');
const { buildHouseChart } = require('../engine/astrology');
const { chat } = require('../engine/chat');
const { optionalAuth } = require('../middleware/auth');
const { savePorondamResult, updatePorondamReport } = require('../models/firestore');

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

    const brideBirthDate = new Date(bride.birthDate);
    const groomBirthDate = new Date(groom.birthDate);

    if (isNaN(brideBirthDate.getTime()) || isNaN(groomBirthDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use ISO 8601.' });
    }

    const brideLat = bride.lat || 6.9271;
    const brideLng = bride.lng || 79.8612;
    const groomLat = groom.lat || 6.9271;
    const groomLng = groom.lng || 79.8612;

    const result = calculatePorondam(brideBirthDate, groomBirthDate);

    // Build rashi charts for both
    let brideChart = null;
    let groomChart = null;
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

    const responseData = {
      ...result,
      brideChart,
      groomChart,
    };

    // Save to Firestore in background (don't block response)
    let porondamId = null;
    if (req.user?.uid) {
      try {
        porondamId = await savePorondamResult(req.user.uid, {
          ...result,
          bride: { ...result.bride, name: bride.name || 'Bride' },
          groom: { ...result.groom, name: groom.name || 'Groom' },
          brideChart,
          groomChart,
        });
      } catch (e) { console.error('Save porondam error:', e.message); }
    }

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
router.post('/report', optionalAuth, async (req, res) => {
  try {
    const { porondamData, language = 'en', brideName, groomName, porondamId } = req.body;

    if (!porondamData) {
      return res.status(400).json({ error: 'porondamData is required' });
    }

    const langInstruction = language === 'si'
      ? `ඔබ ශ්‍රී ලංකාවේ ප්‍රසිද්ධ ජ්‍යෝතිෂවේදියෙක්. මේ පොරොන්දම් පරීක්ෂාවේ ප්‍රතිඵල ගැන සිංහලෙන් ලියන්න. 
හිතවත්, පැහැදිලි, කෙළින්ම කියන විදියට ලියන්න — "ගුඩ් මෝනින්" වගේ ඉංග්‍රීසි වචන සිංහල අකුරින් ලියන්න එපා. 
සිංහල ජ්‍යෝතිෂ වචන (දින, ගණ, යෝනි, නාඩි, වශ්‍ය, රාශි, මහේන්ද්‍ර) use කරන්න, ඒත් ඒවා මොකක්ද කියලා සරල සිංහලෙන් explain කරන්න. 
sugar-coat කරන්න එපා. අවුල් තියෙනවා නම් කෙළින්ම කියන්න, ඒත් විසඳුම් (remedy) දෙන්න. 
යාලුවෙක් කතා කරනවා වගේ ලියන්න — formal වචන use කරන්න එපා.`
      : `You are a renowned Sri Lankan astrologer. Write a Porondam (marriage compatibility) report based on the data below.
Be HONEST and DIRECT — do not sugarcoat. If there are problems, say so clearly, but always provide remedies and practical advice.
Explain every technical term (Dina, Gana, Yoni, Nadi, Vasya, Rashi, Mahendra) in simple words anyone can understand.
Write like a wise friend giving advice — not a textbook.`;

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

CRITICAL RULE: Use ONLY the rashi, nakshatra, lagna, and planet data provided above. Do NOT invent or guess any planetary positions, rashis, or nakshatras. Every astrological detail you mention MUST come from the data above.

FORMAT RULES: Use Markdown formatting throughout:
- Use ## for main section headings (e.g. ## 💍 Overall Verdict)
- Use ### for sub-sections
- Use **bold** for key terms, scores, planet names, and important words
- Use *italic* for emphasis and explanations
- Use - bullet lists for remedies, advice lists, and key points
- Use > blockquotes for important warnings, doshas, or key insights
- Use --- to separate major sections
- Start each of the 7 factor sections with ### and include the score prominently in **bold**
- Use emojis liberally in headings: ✨ 🌟 💫 💍 ⚠️ 🔮 💎 🙏 ❤️ 🌙

WRITE THE REPORT:
1. Start with a warm intro about the couple and their star signs — mention their EXACT nakshatras, rashis, and lagnas from the data above
2. Briefly describe each person's chart: their lagna, key planet placements, and what these mean for their personality
3. Explain EACH of the 7 factors one by one in detail — what it means in real life, what score they got, and what that means for their marriage. Give specific examples.
4. Highlight any doshas (problems) honestly and explain remedies in detail (temple visits, mantras, rituals, gemstones etc.)
5. Give an overall verdict — be brutally honest but compassionate
6. End with practical advice for the couple — things they can do to strengthen their bond
7. Write at least 600-1000 words. Be thorough and detailed. Do NOT give a short summary — this is a full professional astrology report.`;

    const result = await chat(prompt, {
      language,
      provider: process.env.AI_PROVIDER || 'gemini',
      maxTokens: 165288,
    });

    // Save report to Firestore in background
    let savedPorondamId = porondamId || null;
    if (req.user?.uid && result.message) {
      try {
        if (porondamId) {
          // Update existing porondam record with the AI report
          await updatePorondamReport(porondamId, result.message, language);
        } else {
          // No existing record — save a new full record with the report
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

    res.json({
      success: true,
      report: result.message,
      language,
      porondamId: savedPorondamId,
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

    const shareUrl = `https://nakath.ai/vibe/${linkId}`;
    const whatsappMessage = encodeURIComponent(
      `✨ ${senderName} wants to check your astrological compatibility!\n\n` +
      `🔮 Tap to see if the stars align:\n${shareUrl}\n\n` +
      `Powered by Nakath AI 🪐`
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
      new Date(vibeLink.senderBirthDate),
      new Date(receiverBirthDate)
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

module.exports = router;
