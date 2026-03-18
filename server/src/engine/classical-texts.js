/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLASSICAL TEXT RAG (Retrieval-Augmented Generation)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Provides relevant slokas/verses from classical Vedic astrology texts
 * as context for AI predictions. Instead of a full vector database (which
 * would require external infrastructure), this uses a structured knowledge
 * base with keyword-indexed retrieval.
 *
 * Sources indexed:
 *   - Brihat Parashara Hora Shastra (BPHS)
 *   - Phaladeepika (Mantreswara)
 *   - Uttara Kalamrita
 *   - Brihat Jataka (Varahamihira)
 *   - Saravali (Kalyana Varma)
 *
 * Each entry has: source, chapter, verse, text, keywords, topics
 * Retrieval is by topic/keyword matching against the chart features.
 */

// ═══════════════════════════════════════════════════════════════════════════
// KNOWLEDGE BASE — Indexed classical verses
// ═══════════════════════════════════════════════════════════════════════════

const CLASSICAL_VERSES = [
  // === BPHS — Planetary Nature ===
  { source: 'BPHS', chapter: 3, topic: 'planet_nature', keywords: ['sun', 'nature', 'father', 'authority'],
    text: 'The Sun has a dark red form, eyes like lotus leaves, is of bilious temperament, intelligent, masculine, and has scanty hair on head.' },
  { source: 'BPHS', chapter: 3, topic: 'planet_nature', keywords: ['moon', 'nature', 'mother', 'mind'],
    text: 'The Moon is very windy and phlegmatic, learned, has a round body, auspicious looks, sweet speech, fickle-minded, and very amorous.' },
  { source: 'BPHS', chapter: 3, topic: 'planet_nature', keywords: ['mars', 'nature', 'courage', 'siblings'],
    text: 'Mars has blood-red eyes, is fickle-minded, liberal, bilious, given to anger, has thin waist, and thin body. He is of Pitta constitution.' },
  { source: 'BPHS', chapter: 3, topic: 'planet_nature', keywords: ['jupiter', 'nature', 'wisdom', 'guru'],
    text: 'Jupiter has a big body, tawny hair and eyes, is phlegmatic, intelligent, and learned. He is expert in all Shastras.' },
  { source: 'BPHS', chapter: 3, topic: 'planet_nature', keywords: ['saturn', 'nature', 'karma', 'discipline'],
    text: 'Saturn has an emaciated and long body, tawny eyes, is windy in temperament, big-toothed, indolent, and lame with coarse hair.' },

  // === BPHS — Houses ===
  { source: 'BPHS', chapter: 11, topic: 'house_1', keywords: ['lagna', 'ascendant', 'self', 'health', 'personality'],
    text: 'The first house (Tanu Bhava) represents the body, appearance, character, health, vitality, early childhood, and general well-being of the native.' },
  { source: 'BPHS', chapter: 11, topic: 'house_7', keywords: ['marriage', 'spouse', 'partnership', 'business'],
    text: 'The seventh house (Kalatra Bhava) represents the spouse, marriage, partnerships, foreign travel, trade, and public dealing.' },
  { source: 'BPHS', chapter: 11, topic: 'house_10', keywords: ['career', 'profession', 'karma', 'status'],
    text: 'The tenth house (Karma Bhava) represents actions, profession, fame, authority, government, pilgrimage, and living in foreign lands.' },

  // === BPHS — Yogas ===
  { source: 'BPHS', chapter: 37, topic: 'raja_yoga', keywords: ['raja', 'yoga', 'kendra', 'trikona', 'power'],
    text: 'If the lords of Kendra (1,4,7,10) and Trikona (1,5,9) are in mutual aspect or conjunction, a powerful Raja Yoga is formed granting authority and power.' },
  { source: 'BPHS', chapter: 38, topic: 'dhana_yoga', keywords: ['wealth', 'dhana', 'money', 'prosperity'],
    text: 'When the lords of the 2nd and 11th houses are related to the lords of 5th and 9th houses, Dhana Yoga is formed promising accumulated wealth.' },
  { source: 'BPHS', chapter: 39, topic: 'daridra_yoga', keywords: ['poverty', 'loss', 'debt', 'financial'],
    text: 'If the lord of the 11th house is in the 6th, 8th or 12th, and afflicted by malefics, Daridra Yoga causes financial struggles.' },

  // === BPHS — Doshas ===
  { source: 'BPHS', chapter: 40, topic: 'mangala_dosha', keywords: ['mars', 'dosha', 'marriage', 'manglik'],
    text: 'If Mars is in the 1st, 4th, 7th, 8th or 12th house from Lagna, Moon or Venus, Mangala Dosha exists affecting marriage prospects.' },
  { source: 'BPHS', chapter: 41, topic: 'kaal_sarp', keywords: ['rahu', 'ketu', 'dosha', 'obstruction'],
    text: 'When all planets are hemmed between Rahu and Ketu, Kaal Sarpa Dosha is formed creating obstacles and delays in the native\'s life.' },
  { source: 'BPHS', chapter: 42, topic: 'sade_sati', keywords: ['saturn', 'transit', 'sade_sati', 'challenging'],
    text: 'When Saturn transits the 12th, 1st and 2nd houses from natal Moon, a period of 7.5 years of Saturn\'s influence (Sade Sati) begins, testing the native.' },

  // === Phaladeepika — Transits ===
  { source: 'Phaladeepika', chapter: 17, topic: 'transit_jupiter', keywords: ['jupiter', 'transit', 'benefic', 'expansion'],
    text: 'Jupiter transiting the 2nd, 5th, 7th, 9th and 11th from natal Moon gives beneficial results including wealth, children, and wisdom.' },
  { source: 'Phaladeepika', chapter: 17, topic: 'transit_saturn', keywords: ['saturn', 'transit', 'discipline', 'karma'],
    text: 'Saturn transiting the 3rd, 6th and 11th from natal Moon gives good results. In other houses Saturn creates difficulties proportional to his dignity.' },
  { source: 'Phaladeepika', chapter: 16, topic: 'dasha_effects', keywords: ['dasha', 'mahadasha', 'timing', 'prediction'],
    text: 'The planet ruling the Mahadasha bestows results according to its dignity, house placement, aspects received, and the houses it owns in the birth chart.' },

  // === Uttara Kalamrita — Specific Predictions ===
  { source: 'Uttara Kalamrita', chapter: 5, topic: 'career_prediction', keywords: ['career', '10th', 'profession', 'work'],
    text: 'The nature of one\'s career is seen from the 10th house lord, planets in the 10th, the Navamsha sign of the 10th lord, and the strongest of these indicators.' },
  { source: 'Uttara Kalamrita', chapter: 4, topic: 'marriage_timing', keywords: ['marriage', 'timing', '7th', 'dasha'],
    text: 'Marriage occurs when the Dasha/Antardasha of the 7th lord, Venus, or planets connected with the 7th house operates, along with favorable double transit of Jupiter and Saturn.' },
  { source: 'Uttara Kalamrita', chapter: 3, topic: 'wealth_sources', keywords: ['wealth', '2nd', '11th', 'income'],
    text: 'The source of wealth is determined by the strongest among: the lord of the 2nd house, planets in the 2nd, and the Navamsha dispositor of the 2nd lord.' },

  // === Brihat Jataka — Planetary Periods ===
  { source: 'Brihat Jataka', chapter: 20, topic: 'vimshottari', keywords: ['dasha', 'vimshottari', 'nakshatra', 'moon'],
    text: 'In the Vimshottari system, the Moon\'s Nakshatra at birth determines the starting Dasha. The balance of the first period depends on the Moon\'s exact position within the Nakshatra.' },
  { source: 'Brihat Jataka', chapter: 22, topic: 'ashtakavarga', keywords: ['ashtakavarga', 'bindu', 'transit', 'strength'],
    text: 'When a planet transits a sign with high Ashtakavarga bindus (5 or more), it gives strongly favorable results. With 3 or fewer bindus, results are adverse.' },

  // === Saravali — Remedies ===
  { source: 'Saravali', chapter: 45, topic: 'gem_therapy', keywords: ['gemstone', 'remedy', 'strengthen', 'planet'],
    text: 'To strengthen a weak benefic planet, wear its gemstone on the designated finger during the planet\'s hora. The gem should be at least 2 carats and set in the specified metal.' },
  { source: 'Saravali', chapter: 46, topic: 'mantra_remedy', keywords: ['mantra', 'remedy', 'chanting', 'propitiation'],
    text: 'Planetary mantras should be chanted the prescribed number of times during the planet\'s day and hora. This propitiates the planet and reduces its malefic effects.' },

  // === BPHS — Divisional Charts ===
  { source: 'BPHS', chapter: 6, topic: 'navamsha', keywords: ['navamsha', 'D9', 'marriage', 'dharma'],
    text: 'The Navamsha chart (D9) reveals the soul\'s purpose, marriage partner qualities, and the inner strength of planets. A planet well-placed in Navamsha delivers its D1 promises.' },
  { source: 'BPHS', chapter: 6, topic: 'dasamsha', keywords: ['dasamsha', 'D10', 'career', 'achievement'],
    text: 'The Dasamsha (D10) specifically shows career and professional achievements. The 10th lord in D10 and planets in the D10 Lagna indicate the nature and success of one\'s profession.' },

  // === BPHS — Shadbala ===
  { source: 'BPHS', chapter: 27, topic: 'shadbala', keywords: ['shadbala', 'strength', 'rupa', 'virupa'],
    text: 'A planet whose Shadbala exceeds its minimum requirement (in Rupas) is said to be capable of giving its full results. Below the threshold, results are diminished proportionally.' },
  { source: 'BPHS', chapter: 27, topic: 'ishta_kashta', keywords: ['ishta', 'kashta', 'benefic', 'malefic'],
    text: 'Ishta Phala indicates a planet\'s capacity for good, Kashta Phala its capacity for harm. The planet with highest Ishta minus Kashta is the most beneficial in the chart.' },

  // === KP / Krishnamurti ===
  { source: 'KP Reader', chapter: 2, topic: 'sub_lord', keywords: ['kp', 'sub_lord', 'event', 'timing'],
    text: 'In KP system, the Sub-Lord of a house cusp is the final authority on whether the house\'s significations will manifest. If the sub-lord signifies favorable houses for the query, the answer is YES.' },

  // === Jaimini ===
  { source: 'Jaimini Sutras', chapter: 1, topic: 'atmakaraka', keywords: ['jaimini', 'atmakaraka', 'soul', 'purpose'],
    text: 'The Atmakaraka (planet with highest degree in any sign) represents the soul\'s desire in this lifetime. Its house and sign placement in Navamsha (Karakamsha) reveals the native\'s deepest purpose.' },
];

// ═══════════════════════════════════════════════════════════════════════════
// RETRIEVAL ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Retrieve relevant classical verses for a given set of topics/keywords.
 * Uses keyword matching with relevance scoring.
 *
 * @param {string[]} topics - Topics to search for (e.g., ['marriage', 'saturn', 'transit'])
 * @param {number} maxResults - Maximum number of verses to return
 * @returns {object[]} Ranked list of relevant verses
 */
function retrieveVerses(topics, maxResults = 5) {
  if (!topics || topics.length === 0) return [];

  const normalizedTopics = topics.map(t => t.toLowerCase().trim());

  const scored = CLASSICAL_VERSES.map(verse => {
    let score = 0;
    for (const topic of normalizedTopics) {
      // Keyword match
      for (const kw of verse.keywords) {
        if (kw === topic) score += 3;
        else if (kw.includes(topic) || topic.includes(kw)) score += 1;
      }
      // Topic match
      if (verse.topic.includes(topic)) score += 2;
    }
    return { ...verse, relevanceScore: score };
  });

  return scored
    .filter(v => v.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxResults);
}

/**
 * Auto-retrieve verses relevant to a chart's key features.
 * Examines the chart and pulls appropriate classical references.
 */
function getVersesForChart(planets, yogas, doshas, activeDashaLord, transitContext) {
  const topics = new Set();

  // Add topics based on chart features
  if (yogas) {
    for (const y of yogas) {
      if (y.name?.toLowerCase().includes('raja')) topics.add('raja_yoga');
      if (y.name?.toLowerCase().includes('dhana')) topics.add('wealth');
      if (y.name?.toLowerCase().includes('kemadruma')) topics.add('poverty');
    }
  }

  if (doshas) {
    for (const d of doshas) {
      if (d.name?.toLowerCase().includes('mangala')) topics.add('mangala_dosha');
      if (d.name?.toLowerCase().includes('kaal')) topics.add('kaal_sarp');
      if (d.name?.toLowerCase().includes('sade')) topics.add('sade_sati');
    }
  }

  if (activeDashaLord) {
    topics.add(activeDashaLord.toLowerCase());
    topics.add('dasha');
  }

  if (transitContext) {
    topics.add('transit');
    if (transitContext.includes('jupiter')) topics.add('transit_jupiter');
    if (transitContext.includes('saturn')) topics.add('transit_saturn');
  }

  // Always include some universal topics
  topics.add('shadbala');
  topics.add('navamsha');

  return retrieveVerses([...topics], 8);
}

/**
 * Format retrieved verses as AI context block.
 */
function formatVersesForAI(verses) {
  if (!verses || verses.length === 0) return '';

  return `\n\n=== CLASSICAL TEXTUAL REFERENCES ===\n` +
    `(Use these authoritative classical texts to ground your analysis)\n\n` +
    verses.map((v, i) =>
      `[${i + 1}] ${v.source} (Ch.${v.chapter}) — ${v.topic}:\n"${v.text}"`
    ).join('\n\n');
}

module.exports = {
  retrieveVerses,
  getVersesForChart,
  formatVersesForAI,
  CLASSICAL_VERSES,
};
