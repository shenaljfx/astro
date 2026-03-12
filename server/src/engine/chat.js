/**
 * AI Chat Service - "Ask the Astrologer"
 * 
 * Integrates OpenAI/Gemini APIs with Vedic astrology context
 * to provide personalized, culturally-aware astrological guidance.
 */

const { getPanchanga, getDailyNakath, getNakshatra, getRashi, getLagna, toSidereal, getMoonLongitude, getSunLongitude, generateFullReport, buildHouseChart, buildNavamshaChart, getAllPlanetPositions, calculateDrishtis, detectYogas, getPlanetStrengths, calculateAshtakavarga, calculateVimshottariDetailed } = require('./astrology');

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
async function callOpenAI(messages, maxTokens = 1024) {
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
async function callGemini(messages, maxTokens = 1024) {
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
    maxTokens = 1024,
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
function buildSectionPrompt(sectionKey, sectionData, birthData, allSections) {
  const bd = birthData || {};
  const lagnaEn = bd.lagna?.english || 'Unknown';
  const moonEn = bd.moonSign?.english || 'Unknown';
  const nakshatraName = bd.nakshatra?.name || 'Unknown';
  const currentDasha = allSections?.lifePredictions?.currentDasha?.lord || '';
  const currentAD = allSections?.lifePredictions?.currentAntardasha?.lord || '';

  const SECTION_PROMPTS = {
    personality: {
      title: '✨ Who You Really Are',
      prompt: `Write a SOUL-READING personality analysis for someone born with ${lagnaEn} rising sign and Moon in ${moonEn}, Nakshatra: ${nakshatraName}. This should feel like you've been watching them their whole life.

CHART DATA:
${JSON.stringify(sectionData, null, 1)}

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

- Every single line should use "you" and feel like a personal letter
- Include at least 3 "chills moments" — lines so specific they'll screenshot them
- Reference their exact birth energy without using ANY technical terms`,
    },

    marriage: {
      title: '💍 Love & Relationships',
      prompt: `Write the most intimate, eerily accurate love and relationship reading this person has ever received. They should feel like you've read their diary.

CHART DATA:
${JSON.stringify(sectionData, null, 1)}

⚠️ MANDATORY SPECIFICS — YOU MUST INCLUDE ALL OF THESE (no vague answers allowed):
- EXACT marriage year or 2-year window (e.g., "most likely between 2027-2029"). If already married, confirm the timing pattern.
- EXACT type of partner (profession, personality, appearance hints derived from 7th house lord)
- If marriage is DELAYED or DIFFICULT, say so directly: "Your chart shows marriage is likely delayed until age [X]" or "Relationships will require extra effort because..."
- If there are signs of divorce or separation risk, mention it honestly with remedies
- Number of serious relationships before marriage
- Whether arranged or love marriage is more likely

WRITE AT LEAST 7-9 DEEPLY PERSONAL PARAGRAPHS — this section should make their heart race:

1. **YOUR LOVE FINGERPRINT** — How you fall in love is DIFFERENT from everyone else. Describe their exact pattern: "You don't fall slowly — you resist, resist, resist... and then one look, one conversation, and you're completely gone." OR "You fall in love with someone's mind first. The physical comes later." Be SPECIFIC to their chart.

2. **THE INVISIBLE WALL** — Every person has a defense mechanism in love. What's theirs? Do they test people? Push them away when it gets real? Give everything and then feel resentful? Need constant reassurance but hate asking for it? This should be uncomfortably accurate.

3. **YOUR SOULMATE BLUEPRINT** — Not generic "someone kind and loyal." SPECIFIC: "Your ideal partner has a sharp, slightly sarcastic wit but melts when you're vulnerable with them. They challenge you intellectually but make you feel emotionally safe. They probably have intense eyes and a calm voice." Derive from 7th house lord and Venus placement.

4. **YOUR LOVE LANGUAGE (THE REAL ONE)** — "You SAY you don't need words of affirmation, but every time someone genuinely compliments you, something lights up inside that you try to hide." Be revealing.

5. **THE PATTERN YOU KEEP REPEATING** — "You've noticed this, haven't you? The same type keeps showing up in your life. The one who [specific pattern]..." Show them the pattern they've been blind to.

6. **${sectionData?.kujaDosha?.present ? 'YOUR FIRE IN LOVE — You love with an intensity that can be overwhelming. When you want someone, every cell in your body knows it. This is NOT a curse — this is PASSION that needs the right match. Someone timid will drown in your love. You need someone who can HOLD your fire without flinching.' : 'YOUR STEADY FLAME — Your love burns steady and warm, not wild and destructive. You are the kind of partner who builds a cathedral, brick by brick. The danger? You might settle for someone who doesn\'t deserve the kingdom you\'re building.'}

7. **WHEN LOVE ARRIVES OR DEEPENS** — Be specific with timing from: ${(sectionData?.marriageTimingIndicators || []).join('; ')}. Frame it dramatically: "There is a window opening between [period]... and if you are paying attention, the universe will put someone in your path who changes everything."

8. **IN THE BEDROOM** — Tastefully but honestly: are they passionate? tender? playful? Do they need emotional connection first? Are they surprisingly wild behind closed doors? This paragraph always gets shared.

9. **YOUR RELATIONSHIP SURVIVAL GUIDE** — Practical, specific advice: "When you feel like shutting down after a fight — DON'T. That's your defense mechanism talking. Instead, say these exact words: 'I need 20 minutes, but I'm coming back to this.' It will transform your relationships."

- Make every paragraph feel like reading their private journal
- Include at least one line that makes them blush
- Be warm, honest, sometimes playful, sometimes profound`,
    },

    career: {
      title: '💼 Your Career & Money Path',
      prompt: `Write a career reading so specific and motivating that they'll want to quit their job or double down on it by the time they finish reading. You are part career coach, part psychic, part motivational speaker.

CHART DATA:
${JSON.stringify(sectionData, null, 1)}

BIRTH DATA: Rising sign: ${lagnaEn}, Moon: ${moonEn}

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

CHART DATA:
${JSON.stringify(sectionData, null, 1)}

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
- NO technical terms`,
    },

    lifePredictions: {
      title: '🔮 Your Life Journey — Past, Present & Future',
      prompt: `Write the most captivating, spine-tingling life prediction this person has ever read. They should feel like you've watched a movie of their entire life — past AND future. This is the CROWN JEWEL of the entire report.

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

CHART DATA:
${JSON.stringify(sectionData, null, 1)}

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

CHART DATA:
${JSON.stringify(sectionData, null, 1)}

WRITE AT LEAST 4-5 RICH PARAGRAPHS covering ALL of these:
1. THIS WEEK/MONTH — what energies are active RIGHT NOW? What should they focus on? What to avoid?
2. OPPORTUNITIES KNOCKING — specific doors that are open right now. Career? Love? Money? Health?
3. WARNINGS — challenges to watch for. Sade Sati: ${sectionData?.saturn?.sadheSati?.active ? 'ACTIVE — ' + sectionData.saturn.sadheSati.phase + '. Explain what this means for their daily life without using the term.' : 'Not active — a period of relative ease.'}
4. ENERGY FORECAST — their emotional, physical, and mental energy levels right now. When will they feel most alive this month?
5. ACTION PLAN — at least 5 specific, practical things to do RIGHT NOW:
   "This week: ..."
   "This month: ..."
   "Avoid: ..."
   "Best day for big decisions: ..."
   "Focus your energy on: ..."

- Make it feel urgent, relevant, almost like a personal daily briefing
- NO astrological terms`,
    },

    realEstate: {
      title: '🏠 Property, Home & Assets',
      prompt: `Write a practical, detailed reading about property, home life, and material assets.

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
  };

  return SECTION_PROMPTS[sectionKey] || null;
}

/**
 * Generate AI narrative for a single section
 */
async function generateSectionNarrative(sectionKey, sectionData, birthData, allSections, language = 'en', rashiContext = null, ageContext = null, userName = null, userGender = null) {
  const sectionPromptData = buildSectionPrompt(sectionKey, sectionData, birthData, allSections);
  if (!sectionPromptData) return null;

  const langInstructions = {
    en: 'Write in English. Warm, personal, wise tone.',
    si: 'Write in beautiful, clear Sinhala (සිංහල). Use simple Sinhala that anyone can understand. Be warm and wise like a caring elder. Do NOT mix English words — use pure Sinhala throughout.',
    ta: 'Write in clear Tamil (தமிழ்). Be warm and wise.',
    singlish: 'Write in Singlish (Sinhala typed in English). Casual, friendly, relatable tone.',
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
════════════════════════════════════════════

INSTRUCTIONS FOR USING THIS DATA:
- Use the BIRTH DATE and EXACT TIME to ground all your readings — this person was born at a very specific moment
- Use HOUSE placements to determine which life areas each planet influences
- Use PLANET STRENGTHS to know which energies are strong vs weak in their chart
- Use ASPECTS to understand how planets interact and influence each other
- Use the DASHA TIMELINE to give SPECIFIC date ranges for predictions — look at which dasha lord is running and what houses it rules
- Use YOGAS to identify special talents, gifts, or challenges
- Use the NAVAMSHA chart to confirm/deepen readings about marriage, dharma, and inner nature
- Reference actual planet placements (without using technical astrology terms) to give precise, personal insights
- Every prediction should be traceable to a specific placement, aspect, dasha period, or yoga from this data` : '';

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

CRITICAL RULES:
- Use ONLY the chart data provided — do NOT invent planet positions or house placements
- Every claim must be traceable to a specific planet position, house lord, or yoga from the data
- NO astrological jargon — no "Lagna", "Rashi", "Bhava", "Graha", "Dasha", "Mahadasha", "Antardasha", "Yoga" (as astrology term), "Nakshatra", "Dosha", "Karana", "Tithi"
- Instead, translate everything into vivid human experiences and emotions
- Write at least 500-800 words per section — this is a PREMIUM report, not a summary

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

  const userPrompt = sectionPromptData.prompt + rashiBlock;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const provider = process.env.AI_PROVIDER || 'gemini';
  try {
    let response;
    if (provider === 'gemini') {
      response = await callGeminiLong(messages);
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
 */
async function callGeminiLong(messages) {
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
        temperature: 0.88,
        topP: 0.95,
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

  const sectionOrder = [
    'personality',
    'yogaAnalysis',
    'lifePredictions',
    'career',
    'marriage',
    'financial',
    'children',
    'mentalHealth',
    'business',
    'transits',
    'realEstate',
    'employment',
    'timeline25',
    'remedies',
  ];

  console.log(`[AI Report] Generating ${sectionOrder.length} narrative sections in parallel...`);
  const startTime = Date.now();

  const narrativePromises = sectionOrder.map(key => {
    const sectionData = sections[key];
    if (!sectionData) return Promise.resolve({ title: key, narrative: null });
    return generateSectionNarrative(key, sectionData, birthData, sections, language, rashiContext, ageContext, userName, userGender);
  });

  const narrativeResults = await Promise.all(narrativePromises);

  const elapsed = Date.now() - startTime;
  console.log(`[AI Report] All narratives generated in ${elapsed}ms`);

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
  };
}

module.exports = {
  chat,
  buildSystemPrompt,
  buildBirthChartContext,
  buildTransitContext,
  generateAINarrativeReport,
};
