/**
 * AI Chat Service - "Ask the Astrologer"
 * 
 * Integrates OpenAI/Gemini APIs with Vedic astrology context
 * to provide personalized, culturally-aware astrological guidance.
 */

const { getPanchanga, getDailyNakath, getNakshatra, getRashi, getLagna, toSidereal, getMoonLongitude } = require('./astrology');

/**
 * Build the system prompt for the AI astrologer
 */
function buildSystemPrompt(language = 'en') {
  const languageInstructions = {
    en: 'Respond in English. Use a warm, wise, and empathetic tone.',
    si: 'Respond using beautiful, clear Sinhala (සිංහල). You are a highly wise, spiritual, and very friendly astrological guide. Use traditional Sinhala astrological terminology, but keep the tone warm, welcoming, and easy to understand like a wise elder giving caring advice. Explain everything clearly in Sinhala.',
    ta: 'Respond in Tamil (தமிழ்). Use traditional Tamil astrological terminology. Be respectful and wise.',
    singlish: 'Respond in Singlish (Sinhala words typed in English characters). This is how young Sri Lankans commonly type. Example: "Oyage lagna rashiya Mesha. Eyata adala graha Mars."',
  };

  return `You are "Nakath AI", a wise and compassionate AI astrologer specializing in Sri Lankan Vedic (Jyotish) astrology. You combine deep knowledge of traditional Panchanga, Nakshatra, and Vedic astrology with a modern, approachable communication style.

CORE KNOWLEDGE:
- Sri Lankan Vedic astrology (Sinhala Jyotishya / ජ්‍යෝතිෂ්‍යය)
- Panchanga (five limbs): Tithi, Nakshatra, Yoga, Karana, Vaara
- Rahu Kalaya and Yamagandhaya calculations
- Nakath (auspicious times) for daily activities
- Porondam (marriage compatibility) - 20-point system
- Planetary periods (Dasha/Bhukti)
- Sinhala and Tamil New Year (Avurudu) Nakath traditions
- Cultural context of astrology in Sri Lankan life

GUIDELINES:
1. Always be respectful of the cultural importance of astrology in Sri Lanka
2. Provide practical, actionable advice based on astrological principles
3. When discussing compatibility, be sensitive and balanced
4. Never make absolute negative predictions - always offer remedies and hope
5. Reference specific planetary positions, Nakshatras, and timing when relevant
6. For Rahu Kalaya questions, provide exact times based on location
7. Understand common Sri Lankan astrological queries about: vehicle purchases, house construction, weddings, business ventures, employment, education
8. Be aware of cultural events: Avurudu, Vesak, Poson, and other significant dates

${languageInstructions[language] || languageInstructions.en}

IMPORTANT: You have access to real-time planetary calculation data. Use the provided chart data to give personalized readings. Do not make up planetary positions - use only the data provided to you.`;
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

  return `
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
}

/**
 * Build current transit context
 */
function buildTransitContext(lat = 6.9271, lng = 79.8612) {
  const now = new Date();
  const dailyNakath = getDailyNakath(now, lat, lng);
  const panchanga = dailyNakath.panchanga;

  return `
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
async function callOpenAI(messages) {
  const OpenAI = require('openai');
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 1024,
    temperature: 0.7,
  });

  return response.choices[0].message.content;
}

/**
 * Call Gemini API
 */
async function callGemini(messages) {
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
        maxOutputTokens: 1024,
        temperature: 0.7,
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
  } = options;

  const messages = buildChatMessages(userMessage, birthDate, birthLat, birthLng, language, chatHistory);

  try {
    let response;
    if (provider === 'gemini') {
      response = await callGemini(messages);
    } else {
      response = await callOpenAI(messages);
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

module.exports = {
  chat,
  buildSystemPrompt,
  buildBirthChartContext,
  buildTransitContext,
};
