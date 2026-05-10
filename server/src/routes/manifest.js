/**
 * Manifestation API Routes
 * 
 * Endpoints:
 * - GET /api/manifest/affirmations - Get daily AI-generated affirmations
 */

const express = require('express');
const router = express.Router();
const { getAllPlanetPositions, getPanchanga, getNakshatra, getRashi, toSidereal, getMoonLongitude } = require('../engine/astrology');
const { getManifestationScore } = require('../engine/manifestation');
const { trackCost } = require('../services/costTracker');

const GEMINI_FLASH_LITE_MODEL = 'gemini-2.5-flash-lite';

/**
 * Call Gemini Flash Lite for affirmation generation
 * Lightweight call — small prompt, small output
 */
async function callGeminiFlashLite(systemPrompt, userPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const model = process.env.GEMINI_AFFIRMATION_MODEL || GEMINI_FLASH_LITE_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.8,
          responseMimeType: 'application/json',
        },
      }),
    });
    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errText.substring(0, 200)}`);
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const textParts = parts.filter(p => p.text && !p.thought);
    const text = textParts.map(p => p.text).join('');

    const usage = data.usageMetadata || {};

    return { text, usage, model };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET /api/manifest/affirmations
 * 
 * Query params:
 * - date (optional): ISO date string, defaults to today
 * - birthDate (required): User's birth date ISO string
 * - lat (optional): Birth latitude
 * - lng (optional): Birth longitude
 */
router.get('/affirmations', async (req, res) => {
  try {
    const { birthDate, lat, lng, date } = req.query;

    if (!birthDate) {
      return res.status(400).json({ error: 'birthDate is required' });
    }

    const parsedBirthDate = new Date(birthDate);
    if (isNaN(parsedBirthDate.getTime())) {
      return res.status(400).json({ error: 'Invalid birthDate format. Use ISO 8601.' });
    }

    const targetDate = date ? new Date(date) : new Date();
    const birthLat = parseFloat(lat) || 6.9271;
    const birthLng = parseFloat(lng) || 79.8612;

    // Get user's birth chart data
    const planets = getAllPlanetPositions(parsedBirthDate, birthLat, birthLng);
    const moonSidereal = planets.moon.sidereal;
    const nakshatra = getNakshatra(moonSidereal);
    const rashi = getRashi(moonSidereal);

    // Get today's panchanga for transit context
    const panchanga = getPanchanga(targetDate);
    const manifestation = getManifestationScore(targetDate);

    // Build concise chart context for the AI
    const chartContext = [
      `Birth Nakshatra: ${nakshatra.name} (Lord: ${nakshatra.lord}, Pada: ${nakshatra.pada})`,
      `Moon Sign: ${rashi.name} (${rashi.english})`,
      `Lagna: ${planets.sun.rashi} (Ascendant)`,
      `Venus in: ${planets.venus.rashi}`,
      `Jupiter in: ${planets.jupiter.rashi}`,
      `Mars in: ${planets.mars.rashi}`,
      `Today's Nakshatra: ${panchanga.nakshatra?.name || 'unknown'}`,
      `Today's Tithi: ${panchanga.tithi?.name || 'unknown'}`,
      `Moon Phase: ${manifestation.isWaxing ? 'Waxing (Shukla Paksha)' : 'Waning (Krishna Paksha)'}`,
      `Manifestation Score: ${manifestation.score}/100`,
      `Best Focus: ${manifestation.focus?.primary?.en || 'General'}`,
    ].join('\n');

    const systemPrompt = `You are a warm, friendly Vedic astrology life coach for a Sri Lankan app. Generate personalized Law of Attraction guidance based on the user's birth chart and today's cosmic energy.

LANGUAGE RULES (VERY IMPORTANT):
- English: Use simple everyday words. NO jargon. Write like you're talking to a friend. Short sentences.
- Sinhala: Use SPOKEN (කතා) Sinhala, NOT written/literary Sinhala. Like how people actually talk in Sri Lanka. Use "ඔයා" not "ඔබ". Use "වැඩ" not "කාර්ය". Keep it natural and warm.
- NEVER use astrological terms in user-facing text (no "Kanya Lagna", "sidereal", "transit", etc). Just say what it MEANS for them.

For each of the 3 categories (love, career, spiritual), generate:
1. An affirmation (2-3 sentences, present tense, powerful but simple)
2. A short astrological insight (1 sentence, plain language, explain WHY this energy is good today)
3. Two DO's - practical, specific things to actually do today
4. Two DON'Ts - things to avoid today

Make affirmations LONGER and more meaningful (2-3 sentences each, not just 1). 
Use the moon phase: waxing = attract/grow energy, waning = release/let go energy.
Tone: warm, empowering, like a wise older friend giving advice.

Respond in this exact JSON format:
{
  "affirmations": [
    {
      "category": "love",
      "en": "English affirmation (2-3 sentences)",
      "si": "සිංහල affirmation (spoken style, 2-3 sentences)",
      "insight": { "en": "Plain English insight", "si": "සිංහල insight (spoken style)" },
      "dos": { "en": ["Do this", "And this"], "si": ["මේක කරන්න", "මේකත් කරන්න"] },
      "donts": { "en": ["Avoid this", "Skip this"], "si": ["මේක කරන්න එපා", "මේකත් එපා"] }
    },
    {
      "category": "career",
      "en": "...", "si": "...",
      "insight": { "en": "...", "si": "..." },
      "dos": { "en": ["...", "..."], "si": ["...", "..."] },
      "donts": { "en": ["...", "..."], "si": ["...", "..."] }
    },
    {
      "category": "spiritual",
      "en": "...", "si": "...",
      "insight": { "en": "...", "si": "..." },
      "dos": { "en": ["...", "..."], "si": ["...", "..."] },
      "donts": { "en": ["...", "..."], "si": ["...", "..."] }
    }
  ]
}`;

    const userPrompt = `Generate today's affirmations for this person:\n\n${chartContext}`;

    const result = await callGeminiFlashLite(systemPrompt, userPrompt);

    // Parse the JSON response
    let affirmations;
    try {
      const parsed = JSON.parse(result.text);
      affirmations = parsed.affirmations || parsed;
    } catch (parseErr) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        affirmations = parsed.affirmations || parsed;
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    // Track cost
    if (result.usage) {
      try {
        trackCost(req.user?.uid || 'anonymous', 'affirmation', {
          model: result.model,
          inputTokens: result.usage.promptTokenCount || 0,
          outputTokens: result.usage.candidatesTokenCount || 0,
          thinkingTokens: result.usage.thoughtsTokenCount || 0,
        });
      } catch (e) { /* cost tracking is best-effort */ }
    }

    res.json({
      success: true,
      data: {
        date: targetDate.toISOString().split('T')[0],
        affirmations,
        manifestation: {
          score: manifestation.score,
          rating: manifestation.rating,
          phase: manifestation.phase,
          focus: manifestation.focus,
        },
        model: result.model,
      },
    });
  } catch (error) {
    console.error('Error generating affirmations:', error);
    res.status(500).json({
      error: 'Failed to generate affirmations',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
