/**
 * INTENT ROUTER & PROMPT COMPOSER
 *
 * Replaces the monolithic 4000-line system prompt with a small CORE prompt
 * plus 0..N domain skills loaded based on a heuristic intent classifier.
 *
 * Goal: reduce hallucination caused by context overload. When the user asks
 * "what's my star sign?" we no longer send marriage rules, dream rules,
 * health rules, etc. — just CORE. When they ask "when will I marry?",
 * we send CORE + marriage + timing.
 *
 * Determinism: classifier is keyword + regex based, no AI call.
 */

const { buildCorePrompt } = require('./core');

const SKILLS = {
  marriage: require('./skills/marriage'),
  career: require('./skills/career'),
  health: require('./skills/health'),
  timing: require('./skills/timing'),
  dream: require('./skills/dream'),
  compatibility: require('./skills/compatibility'),
  remedies: require('./skills/remedies'),
};

// ── Intent keywords (multi-language: en + sinhala + transliterated) ─────
// Each key maps to a list of regex patterns. Case-insensitive.
const INTENT_PATTERNS = {
  marriage: [
    /\b(marriage|marry|married|marrying|wedding|spouse|husband|wife|partner|love|girlfriend|boyfriend|relationship|breakup|divorce|engagement|romance)\b/i,
    /විවාහ|මංගල|සැමියා|බිරිඳ|පෙම්වතා|පෙම්වතිය|පෙම්|ආදර/,
    /\b(vivaha|mangala|adare|kasada|yuwala)\b/i,
  ],
  career: [
    /\b(career|job|work|profession|business|money|wealth|income|salary|finance|promotion|education|study|exam|degree|university|school)\b/i,
    /රැකියා|වැඩ|මුදල්|ව්‍යාපාර|අධ්‍යාපන|විභාග|උපාධි|පාසල/,
    /\b(rakiya|wada|mudal|wyaapaara|udyaapana|vibhaaga)\b/i,
  ],
  health: [
    /\b(health|illness|sick|disease|body|pain|hospital|doctor|medicine|mental|depression|anxiety|sleep|stress|wellbeing|wellness)\b/i,
    /සෞඛ්‍ය|අසනීප|රෝග|වේදනා|මානසික|නින්ද|කායික/,
    /\b(saukya|asaneepa|roga|maanasika|ninda)\b/i,
  ],
  timing: [
    /\b(when|what time|today|tomorrow|tonight|this week|this month|this year|auspicious|rahu kala|gulika|muhurtha|nekath|good day|good time|favourable)\b/i,
    /කවදද|අද|හෙට|සතිය|මාසය|අවුරුදු|නැකත්|සුබ|රාහු|ගුලික/,
    /\b(kawada|aada|heta|sathiya|nekath|suba)\b/i,
  ],
  dream: [
    /\b(dream|nightmare)\b/i,
    /\[DREAM ANALYSIS REQUEST\]/,
    /සිහින|නින්දේ දැක්ක/,
  ],
  compatibility: [
    /\b(compatibility|porondam|match|matching|kundali milan|horoscope match)\b/i,
    /පොරොන්දම්|ගැලපීම|කේන්දර ගැලපී/,
  ],
  remedies: [
    /\b(remedy|remedies|gemstone|mantra|pooja|puja|ritual|fix|cure|fasting|donation|temple|charity|offering)\b/i,
    /පිළියම්|උපාය|මාණික්‍ය|මන්ත්‍ර|පූජා|පන්සල|දන්|බෝධි/,
  ],
};

/**
 * Classify the user message into one or more intents.
 * Returns an array of intent keys. May be empty (= general/unknown question).
 */
function classifyIntent(userMessage) {
  if (!userMessage || typeof userMessage !== 'string') return [];
  const intents = [];
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (patterns.some((rx) => rx.test(userMessage))) {
      intents.push(intent);
    }
  }
  return intents;
}

/**
 * Compose a chat system prompt from CORE + the skills triggered by the user message.
 * Keeps prompt small for narrow questions, broad for broad ones.
 *
 * @param {string} userMessage - Raw user message text
 * @param {string} [language='en'] - en | si | ta | singlish
 * @param {object} [options]
 * @param {string[]} [options.forceSkills] - Force-include specific skills (e.g. for testing)
 * @returns {{ prompt: string, intents: string[], tokenEstimate: number }}
 */
function composeChatPrompt(userMessage, language = 'en', options = {}) {
  const detected = classifyIntent(userMessage);
  const forced = Array.isArray(options.forceSkills) ? options.forceSkills : [];
  const intents = Array.from(new Set([...detected, ...forced]));

  const parts = [buildCorePrompt(language)];
  for (const intent of intents) {
    if (SKILLS[intent]) parts.push(SKILLS[intent]);
  }
  // If we triggered nothing, still include a tiny generic hint so the model
  // doesn't go too freeform.
  if (intents.length === 0) {
    parts.push(`\n═══ GENERAL Q&A SKILL ═══\nThis is a general question. Use the chart context to answer briefly and concretely. If the question requires a specific life domain (love, career, health, timing) and you genuinely cannot answer from the supplied context, ask the user a single follow-up question to narrow the topic.`);
  }
  const prompt = parts.join('\n');
  return {
    prompt,
    intents,
    tokenEstimate: Math.ceil(prompt.length / 4), // rough: 4 chars/token
  };
}

module.exports = {
  classifyIntent,
  composeChatPrompt,
  SKILLS,
};
