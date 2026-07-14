/**
 * PARENT PROFESSION CLASSIFIER
 * =============================
 *
 * Deterministic, evidence-based ranker that converts the engine's raw
 * planet/house/sign/dignity data into a ranked list of plausible
 * occupations for a parent. Used for BOTH mother and father by
 * pointing the function at the right "career house" relative to the
 * parent's reference (10th from 4th for mother, 10th from 9th for
 * father).
 *
 * Why a deterministic ranker matters:
 *   The AI alone, given raw planetary data, will hallucinate a
 *   profession. By pre-computing a ranked list with explicit reasoning
 *   for each candidate, we (a) constrain the AI's output, (b) make the
 *   reasoning auditable, and (c) increase verifiable accuracy because
 *   readers can confirm "yes, my dad was a teacher" against a small
 *   shortlist instead of a paragraph of vague generalities.
 *
 * The classifier uses a weighted scoring system over four signals:
 *   1. Career-house lord PLANET   (35 pts max — strongest signal)
 *   2. Planets IN the career house (25 pts max each)
 *   3. Sign on the career-house cusp (15 pts max)
 *   4. D10 (Dasamsha) cross-reference (15 pts max — career varga)
 *   5. Dignity / Shadbala modifiers (±10 pts)
 *
 * Returns the top N occupations with score, evidence, and confidence
 * tier.
 */

// ── PLANET → OCCUPATION DOMAINS ───────────────────────────────────
// Each planet has primary and secondary occupation categories with
// classical Vedic associations. Weights reflect how strongly the
// planet signifies that domain.
const PLANET_DOMAINS = {
  Sun: [
    { occupation: 'Government / civil service', weight: 1.0 },
    { occupation: 'Doctor / medicine', weight: 0.7 },
    { occupation: 'Authority / administration / management', weight: 0.9 },
    { occupation: 'Politics / public office', weight: 0.6 },
    { occupation: 'Goldsmith / jeweller', weight: 0.4 },
  ],
  Moon: [
    { occupation: 'Public-facing service (hospitality, nursing, retail)', weight: 1.0 },
    { occupation: 'Dairy / food / agriculture', weight: 0.7 },
    { occupation: 'Water-related (sailor, fisherman, plumbing, beverages)', weight: 0.6 },
    { occupation: 'Caregiving / nursing / childcare', weight: 0.8 },
    { occupation: 'Hospitality / restaurant / catering', weight: 0.7 },
  ],
  Mars: [
    { occupation: 'Engineering / mechanical / technical trades', weight: 1.0 },
    { occupation: 'Military / police / security', weight: 0.95 },
    { occupation: 'Surgery / dentistry', weight: 0.7 },
    { occupation: 'Sports / athletics / fitness', weight: 0.6 },
    { occupation: 'Construction / metalwork / fire-related work', weight: 0.7 },
  ],
  Mercury: [
    { occupation: 'Writing / journalism / publishing / editing', weight: 0.9 },
    { occupation: 'Accounting / commerce / banking', weight: 0.95 },
    { occupation: 'Software / IT / data', weight: 0.85 },
    { occupation: 'Teaching (esp. mathematics, language)', weight: 0.7 },
    { occupation: 'Sales / trade / brokerage', weight: 0.8 },
    { occupation: 'Communications / media', weight: 0.75 },
    // Small-business shopkeeping is one of the most common Mercury occupations
    // in SL/IN — separate from corporate sales. Captured explicitly so the AI
    // can offer "shop owner / SME proprietor" instead of always "accountant".
    { occupation: 'Small business / shopkeeper / SME proprietor', weight: 0.8 },
  ],
  Jupiter: [
    { occupation: 'Teaching / professor / educator', weight: 1.0 },
    { occupation: 'Law / judiciary / advocacy', weight: 0.85 },
    { occupation: 'Banking / finance / advisory', weight: 0.8 },
    { occupation: 'Religious / philosophical / counselling', weight: 0.85 },
    { occupation: 'Medicine (esp. paediatrics, traditional)', weight: 0.6 },
  ],
  Venus: [
    { occupation: 'Arts / music / dance / performance', weight: 1.0 },
    { occupation: 'Beauty / fashion / cosmetics / textiles', weight: 0.85 },
    { occupation: 'Hospitality / luxury / entertainment', weight: 0.7 },
    { occupation: 'Design / interior / decoration', weight: 0.75 },
    { occupation: 'Vehicles / transport (esp. private)', weight: 0.6 },
    // NOTE: SME-retail blends (furniture, textile, jewellery) are intentionally
    // NOT seeded here. Adding them to Venus's base list gave every Venus-career
    // chart a permanent lift toward furniture/textile/jewellery, which is what
    // made "wood work career" surface for nearly everyone. These domains are
    // now reachable ONLY via the conjunction-gated, capped PAIR_AMPLIFIERS below.
  ],
  Saturn: [
    { occupation: 'Manual labour / construction / mining', weight: 1.0 },
    { occupation: 'Oil / coal / heavy industry', weight: 0.7 },
    { occupation: 'Agriculture / farming (long-term)', weight: 0.7 },
    { occupation: 'Government clerical / civil service', weight: 0.8 },
    { occupation: 'Iron / steel / leather / waste / sanitation', weight: 0.6 },
    { occupation: 'Long-tenure technical or scientific work', weight: 0.65 },
    // NOTE: 'Timber / sawmill / carpentry / furniture-making' is intentionally
    // NOT seeded in Saturn's base list — same reason as Venus above. Timber is
    // reachable only when Saturn is ACTUALLY conjunct Venus, via PAIR_AMPLIFIERS.
  ],
  Rahu: [
    { occupation: 'Foreign country / immigration / overseas work', weight: 1.0 },
    { occupation: 'Technology / unconventional fields', weight: 0.8 },
    { occupation: 'Aviation / electronics / photography', weight: 0.7 },
    { occupation: 'Politics / underworld / speculation', weight: 0.5 },
    { occupation: 'Pharmaceuticals / chemicals', weight: 0.55 },
  ],
  Ketu: [
    { occupation: 'Spiritual / monastic / occult / astrology', weight: 0.9 },
    { occupation: 'Research / investigation / forensics', weight: 0.7 },
    { occupation: 'Medicine (esp. healing, surgery)', weight: 0.6 },
    { occupation: 'Computers / mathematics / abstract work', weight: 0.6 },
  ],
};

// ── HOUSE → OCCUPATION MODIFIERS ──────────────────────────────────
// Houses where a planet sits add domain colour. The career-house's own
// number is also informative.
const HOUSE_DOMAINS = {
  1: { boost: ['leadership', 'self-employed', 'public personality'], weight: 0.6 },
  2: { boost: ['finance', 'food', 'banking', 'family business'], weight: 0.8 },
  3: { boost: ['communication', 'sales', 'writing', 'short travel', 'siblings business'], weight: 0.7 },
  4: { boost: ['property', 'agriculture', 'vehicles', 'home-based work', 'education (school level)'], weight: 0.7 },
  5: { boost: ['education', 'creative', 'speculation', 'children-related'], weight: 0.7 },
  6: { boost: ['service / employment', 'medicine', 'law', 'enemies of state (military/police)', 'litigation'], weight: 0.8 },
  7: { boost: ['business partnership', 'foreign trade', 'public dealing'], weight: 0.75 },
  8: { boost: ['research', 'insurance', 'occult', 'inheritance', 'longevity work'], weight: 0.6 },
  9: { boost: ['teaching', 'religion', 'long travel', 'publishing', 'higher education'], weight: 0.7 },
  10: { boost: ['government', 'authority', 'public reputation', 'corporate'], weight: 1.0 },
  11: { boost: ['networks', 'large income', 'group work', 'elder sibling business'], weight: 0.7 },
  12: { boost: ['foreign country', 'hospitals', 'spirituality', 'isolation work', 'losses'], weight: 0.6 },
};

// ── SIGN → OCCUPATION COLOURS ─────────────────────────────────────
const SIGN_COLOURS = {
  Aries:        ['leadership', 'military', 'sports', 'engineering'],
  Taurus:       ['finance', 'food', 'beauty', 'land'],
  Gemini:       ['communication', 'writing', 'sales', 'teaching'],
  Cancer:       ['caregiving', 'food', 'real estate', 'family business'],
  Leo:          ['authority', 'government', 'creative leadership', 'gold'],
  Virgo:        ['analysis', 'medicine', 'accounting', 'service'],
  Libra:        ['arts', 'law', 'partnership', 'beauty'],
  Scorpio:      ['research', 'medicine', 'occult', 'investigation'],
  Sagittarius:  ['teaching', 'religion', 'law', 'long travel'],
  Capricorn:    ['government', 'long-tenure work', 'manual labour', 'business'],
  Aquarius:     ['technology', 'group work', 'unconventional fields', 'engineering'],
  Pisces:       ['spirituality', 'medicine', 'arts', 'foreign work'],
};

// ── DIGNITY / SHADBALA MODIFIERS ──────────────────────────────────
const DIGNITY_BONUS = {
  'Exalted': 12,
  'Own Sign': 10,
  'Mooltrikona': 9,
  'Friendly': 4,
  'Neutral': 0,
  'Enemy': -3,
  'Debilitated': -8,
  'Combust': -5,
};

// Aggregate parent input. All fields optional; missing data simply
// downweights the relevant signal instead of breaking the function.
//
// @typedef {Object} ParentEvidence
// @property {string} parent          'mother' | 'father'
// @property {string} careerLord      e.g. 'Saturn'
// @property {number} careerLordHouse e.g. 6
// @property {string} careerLordDignity
// @property {number} careerLordShadbala  0..100
// @property {string[]} careerHousePlanets  planets sitting in parent's
//                                          career house
// @property {string} careerHouseSign       English name of the sign
// @property {string} parentKaraka          'Sun' (father) or 'Moon' (mother)
// @property {number} parentKarakaHouse
// @property {string} parentKarakaDignity
// @property {string} parentKarakaSign      English sign name
// @property {string} d10Lagna              Dasamsha lagna sign (career varga)
// @property {string} d10Lord                D10 placement of career lord
// @property {object} planetStrengths       map planet → { dignityLevel, shadbala }

function _addCandidate(map, occupation, score, reason) {
  if (!occupation) return;
  const cur = map.get(occupation) || { occupation, score: 0, reasons: [] };
  cur.score += score;
  cur.reasons.push(reason);
  map.set(occupation, cur);
}

function _applyPlanetDomains(map, planet, multiplier, reason) {
  if (!planet) return;
  const domains = PLANET_DOMAINS[planet];
  if (!domains) return;
  for (const d of domains) {
    _addCandidate(map, d.occupation, d.weight * multiplier, `${reason} (${planet} → ${d.occupation})`);
  }
}

function _applyDignityModifier(planet, dignity, shadbala) {
  let mod = DIGNITY_BONUS[dignity] ?? 0;
  if (typeof shadbala === 'number') {
    if (shadbala >= 80) mod += 5;
    else if (shadbala >= 60) mod += 2;
    else if (shadbala < 40) mod -= 4;
  }
  return mod;
}

/**
 * Tag candidate occupations whose label matches one of the
 * sign/house keyword colours and add a small bonus.
 */
function _applyKeywordBoost(map, keywords, boost, reason) {
  if (!keywords || keywords.length === 0) return;
  for (const cand of map.values()) {
    const lower = cand.occupation.toLowerCase();
    if (keywords.some(k => lower.includes(k.toLowerCase()))) {
      cand.score += boost;
      cand.reasons.push(reason);
    }
  }
}

/**
 * Rank likely occupations for a parent from raw evidence.
 *
 * @param {ParentEvidence} evidence
 * @param {object} [options]
 * @param {number} [options.topN=5]
 * @param {number} [options.nativeBirthYear] - used to estimate parent era for specific-title lookup
 * @param {string} [options.region='LK']     - 'LK' | 'IN' | 'default'
 * @returns {{ candidates: Array, top: Array, summary: string, signals: object, blended: boolean, specificCandidates: Array }}
 */
function rankParentProfessions(evidence, options = {}) {
  const { topN = 5, nativeBirthYear = null, region = 'default', regionLabel = null } = options;
  const map = new Map();

  // Signal 1: Career-house LORD planet (strongest signal — 35-pt scale)
  if (evidence.careerLord) {
    _applyPlanetDomains(map, evidence.careerLord, 35, `Career-house lord ${evidence.careerLord}`);
    const dMod = _applyDignityModifier(evidence.careerLord, evidence.careerLordDignity, evidence.careerLordShadbala);
    if (dMod !== 0) {
      // Apply the dignity adjustment to all candidates we just added
      for (const cand of map.values()) {
        if (cand.reasons.length && cand.reasons[cand.reasons.length - 1].includes(evidence.careerLord)) {
          cand.score += dMod;
        }
      }
    }
  }

  // Signal 2: Planets sitting IN the career house (25-pt each, capped at 2)
  if (Array.isArray(evidence.careerHousePlanets)) {
    let count = 0;
    for (const p of evidence.careerHousePlanets) {
      if (count >= 3) break;
      _applyPlanetDomains(map, p, 25, `Planet ${p} occupies career house`);
      count++;
    }
  }

  // Signal 3: Career-house sign colours (15-pt boost on matches)
  if (evidence.careerHouseSign) {
    const colours = SIGN_COLOURS[evidence.careerHouseSign];
    _applyKeywordBoost(map, colours, 15, `Career-house sign ${evidence.careerHouseSign}`);
  }

  // Signal 4: Career-lord's house (HOUSE_DOMAINS keyword boost)
  if (evidence.careerLordHouse && HOUSE_DOMAINS[evidence.careerLordHouse]) {
    const hd = HOUSE_DOMAINS[evidence.careerLordHouse];
    _applyKeywordBoost(
      map,
      hd.boost,
      10 * hd.weight,
      `Career lord placed in H${evidence.careerLordHouse}`
    );
  }

  // Signal 5: Parent karaka (Sun for father, Moon for mother) reinforces
  if (evidence.parentKaraka) {
    _applyPlanetDomains(map, evidence.parentKaraka, 15, `Parent karaka ${evidence.parentKaraka}`);
  }
  if (evidence.parentKarakaSign) {
    const colours = SIGN_COLOURS[evidence.parentKarakaSign];
    _applyKeywordBoost(map, colours, 8, `Parent karaka sign ${evidence.parentKarakaSign}`);
  }
  if (evidence.parentKarakaHouse && HOUSE_DOMAINS[evidence.parentKarakaHouse]) {
    const hd = HOUSE_DOMAINS[evidence.parentKarakaHouse];
    _applyKeywordBoost(map, hd.boost, 6 * hd.weight, `Karaka in H${evidence.parentKarakaHouse}`);
  }

  // Signal 6: D10 (Dasamsha) — career varga cross-check (15-pt)
  if (evidence.d10Lagna) {
    const colours = SIGN_COLOURS[evidence.d10Lagna];
    _applyKeywordBoost(map, colours, 12, `D10 lagna ${evidence.d10Lagna}`);
  }

  // Signal 7: Planet-pair amplifiers — Vedic SME profession patterns
  // ────────────────────────────────────────────────────────────────
  // When two planets are ACTUALLY CONJUNCT (share a house), the combination
  // points to a specific small-business category that neither planet alone
  // would surface. NOTE: the trigger is genuine conjunction, not "both planets
  // exist somewhere in the chart" — see the conjunction gate further down.
  //
  // Whole-parent-chart context: planets in the parent's body (1st),
  // wealth (2nd), effort/enterprise (3rd), and business/partnership (7th)
  // houses ALSO carry career signal in classical jyotish — they describe what
  // the parent USES, OWNS, EFFORTS WITH, and TRADES.
  const parentBodyPlanets = Array.isArray(evidence.parentBodyPlanets) ? evidence.parentBodyPlanets : [];
  const parentWealthPlanets = Array.isArray(evidence.parentWealthPlanets) ? evidence.parentWealthPlanets : [];
  const parentEffortPlanets = Array.isArray(evidence.parentEffortPlanets) ? evidence.parentEffortPlanets : [];
  const parentBusinessPlanets = Array.isArray(evidence.parentBusinessPlanets) ? evidence.parentBusinessPlanets : [];

  // Wealth-house planets specifically reinforce TRADE/RETAIL/COMMODITY
  // domains — that's literally what the 2nd house signifies (stored
  // wealth, accumulated goods, family business inventory).
  if (parentWealthPlanets.length > 0) {
    _applyKeywordBoost(
      map,
      ['retail', 'trade', 'shop', 'wholesale', 'business', 'family business', 'finance', 'food', 'banking'],
      8,
      `Planets in parent's 2nd house (${parentWealthPlanets.join(', ')}) — wealth/trade signature`,
    );
    // Each wealth-house planet also adds its own domains — kept as a
    // secondary tie-breaker weight (well below the 35-pt primary career-lord
    // signal) so a 2nd-house planet can nudge ranking but never dominate it.
    parentWealthPlanets.forEach(p =>
      _applyPlanetDomains(map, p, 6, `Planet ${p} in parent's 2nd house (wealth/inventory)`));
  }
  // 7th-house planets reinforce business/partnership/trade
  if (parentBusinessPlanets.length > 0) {
    parentBusinessPlanets.forEach(p =>
      _applyPlanetDomains(map, p, 5, `Planet ${p} in parent's 7th house (business/partnership)`));
    _applyKeywordBoost(
      map,
      ['business', 'trade', 'retail', 'partnership', 'shop', 'wholesale'],
      6,
      `Planets in parent's 7th house — business axis active`,
    );
  }
  // 3rd-house planets reinforce hands-on enterprise / effort-based work
  if (parentEffortPlanets.length > 0) {
    parentEffortPlanets.forEach(p =>
      _applyPlanetDomains(map, p, 4, `Planet ${p} in parent's 3rd house (effort/enterprise)`));
  }
  // 1st-house planets describe the parent's identity and primary mode of
  // work expression — Saturn here = labour-intensive trade, Venus = comfort
  // goods retail, Mars = mechanical/physical work, Mercury = trade/talk.
  if (parentBodyPlanets.length > 0) {
    parentBodyPlanets.forEach(p =>
      _applyPlanetDomains(map, p, 8, `Planet ${p} in parent's 1st house (identity/expression)`));
  }

  const PAIR_AMPLIFIERS = [
    // Saturn + Venus → durable comfort goods → furniture, timber, home retail
    { planets: ['Saturn', 'Venus'], boost: 18, occupation: 'Furniture / wood trade / home-furnishings retail',
      reason: 'Saturn (wood/durable) + Venus (comfort/home) co-occur — classic SL/IN furniture-business signature' },
    { planets: ['Saturn', 'Venus'], boost: 12, occupation: 'Timber / sawmill / carpentry / furniture-making',
      reason: 'Saturn + Venus pairing also signals timber/sawmill production' },
    // Mars + Saturn → hardware, tools, building materials retail
    { planets: ['Mars', 'Saturn'], boost: 14, occupation: 'Construction / metalwork / fire-related work',
      reason: 'Mars (tools/metal) + Saturn (long-term/heavy) — hardware & building materials trade' },
    // Mercury + Venus → textile / clothing / saree retail
    { planets: ['Mercury', 'Venus'], boost: 14, occupation: 'Textile / clothing / saree retail',
      reason: 'Mercury (commerce) + Venus (textiles/comfort) — fabric & garment retail signature' },
    // Mercury + Saturn → small SME / shopkeeper grind
    { planets: ['Mercury', 'Saturn'], boost: 12, occupation: 'Small business / shopkeeper / SME proprietor',
      reason: 'Mercury (trade) + Saturn (long-tenure) — own-shop owner / SME proprietor' },
    // Sun + Venus → jewellery, gold trade
    { planets: ['Sun', 'Venus'], boost: 12, occupation: 'Jewellery / gold / silver retail',
      reason: 'Sun (gold) + Venus (luxury) — goldsmith / jewellery business' },
    // Moon + Venus → hospitality, food, dairy retail
    { planets: ['Moon', 'Venus'], boost: 10, occupation: 'Hospitality / restaurant / catering',
      reason: 'Moon (food/public) + Venus (comfort) — restaurant/catering business' },
    // Jupiter + Mercury → publishing, education business
    { planets: ['Jupiter', 'Mercury'], boost: 10, occupation: 'Teaching (esp. mathematics, language)',
      reason: 'Jupiter (wisdom) + Mercury (communication) — teacher/tutor profession' },
  ];
  // Conjunction gate — a pair amplifier fires ONLY when its two planets are
  // ACTUALLY conjunct (share one house). Planets appearing together in any one
  // of the parent's per-house arrays are conjunct in that house. This replaces
  // the old test (`both planets exist anywhere in a 5–6-house net`), which was
  // true for the majority of charts and is exactly why "furniture / wood work"
  // surfaced for nearly everyone.
  const conjunctionGroups = [
    Array.isArray(evidence.careerHousePlanets) ? evidence.careerHousePlanets : [],
    parentBodyPlanets,
    parentWealthPlanets,
    parentEffortPlanets,
    parentBusinessPlanets,
  ].filter(g => Array.isArray(g) && g.length >= 2);
  const areConjunct = (a, b) =>
    conjunctionGroups.some(g => g.includes(a) && g.includes(b));

  // Total amplifier contribution is capped so a blend can re-order genuine
  // near-ties but can NEVER override the primary career-lord signal (≤35 pts).
  const AMPLIFIER_CAP = 15;
  let amplifierBudget = AMPLIFIER_CAP;
  for (const pa of PAIR_AMPLIFIERS) {
    if (amplifierBudget <= 0) break;
    if (areConjunct(pa.planets[0], pa.planets[1])) {
      const applied = Math.min(pa.boost, amplifierBudget);
      _addCandidate(map, pa.occupation, applied, `${pa.reason} (conjunct)`);
      amplifierBudget -= applied;
    }
  }

  // Signal 8: Homemaker detection (Vedic logic for non-employed parent)
  // ────────────────────────────────────────────────────────────────
  // In Sri Lankan / Indian charts, a sizeable fraction of parents (esp.
  // mothers of children born before ~2000, and many today) do not have
  // a formal occupation \u2014 they manage the household, raise children,
  // and provide community/extended-family support. The previous engine
  // could NEVER return this; it always invented a job. This branch
  // surfaces "Homemaker / household management" when the chart literally
  // says so:
  //
  //   (a) career-house lord is in 4th (home), 12th (seclusion/loss of
  //       outward action), OR retrograde+weak in dusthana \u2014 i.e. the
  //       \"public career\" axis is dim;
  //   (b) AND parent karaka (Moon for mother / Sun for father) is
  //       NOT prominently placed for outward expression;
  //   (c) AND domestic significators are STRONG: Venus in 4th, Moon in 4th,
  //       OR 4th-house lord well-placed.
  //
  // We add it as a high-scoring candidate when these gates fire so it can
  // legitimately compete for the top slot.
  const careerLordHouse = evidence.careerLordHouse;
  const careerLordDignity = evidence.careerLordDignity;
  const karakaHouse = evidence.parentKarakaHouse;
  const isCareerLordWeak = (
    [4, 12].includes(careerLordHouse) ||
    (['Debilitated', 'Combust'].includes(careerLordDignity) && [6, 8, 12].includes(careerLordHouse))
  );
  const isKarakaQuiet = !karakaHouse || [4, 8, 12].includes(karakaHouse);
  const careerHousePlanets = Array.isArray(evidence.careerHousePlanets) ? evidence.careerHousePlanets : [];
  const careerHouseEmpty = careerHousePlanets.length === 0;
  const lowShadbala = typeof evidence.careerLordShadbala === 'number' && evidence.careerLordShadbala < 45;
  // Parents of newborns (era of birth ~2020+) statistically have higher female
  // workforce participation, but the chart-level homemaker indicators still hold.
  // Default behaviour: only push homemaker for MOTHER unless father chart is
  // unusually strong on domestic signals (kept conservative).
  if (
    (evidence.parent === 'mother') &&
    (isCareerLordWeak || lowShadbala) &&
    (isKarakaQuiet || careerHouseEmpty)
  ) {
    let homemakerScore = 28;
    if (isCareerLordWeak && lowShadbala) homemakerScore += 10;
    if (careerHouseEmpty && isKarakaQuiet) homemakerScore += 8;
    // 4th house Venus or Moon = strong domestic anchor
    if (evidence.parentKarakaHouse === 4) homemakerScore += 12;
    _addCandidate(
      map,
      'Homemaker / household management / family caregiving',
      homemakerScore,
      `Career-house signals dim (lord H${careerLordHouse}, karaka H${karakaHouse}) — chart leans toward home-centred role`,
    );
  }
  // For the FATHER, only push homemaker if signals are extreme (very rare in
  // SL/IN context, but keep the branch open for retired/disabled fathers).
  if (
    (evidence.parent === 'father') &&
    isCareerLordWeak && lowShadbala && careerHouseEmpty &&
    careerLordDignity === 'Debilitated'
  ) {
    _addCandidate(
      map,
      'Retired / non-working / home-based',
      24,
      'All career-house signals collapsed — chart suggests retired or non-working state',
    );
  }

  const candidates = [...map.values()].sort((a, b) => b.score - a.score);
  const top = candidates.slice(0, topN);
  const maxPossible = 100; // rough upper bound for normalisation

  // Confidence tiering
  const topScore = top[0]?.score || 0;
  let confidence = 'low';
  if (topScore >= 70) confidence = 'high';
  else if (topScore >= 45) confidence = 'medium';

  // Multi-domain blend detection — if #1 and #2 are within 15% of each
  // other, the chart is genuinely ambiguous and we should present
  // BOTH as a blend ("a role that combines authority + analysis").
  const blended = top.length >= 2 && top[1].score >= top[0].score * 0.85;

  // Era-aware specific titles per top-3 domains.
  // Gate on confidence: expanding a 'low'-confidence domain into named titles
  // ("furniture-shop owner", "timber merchant") manufactures false precision on
  // charts that don't actually separate. For low confidence we hand back the
  // domain family only and let the report frame it softly.
  let specificCandidates = [];
  if (confidence !== 'low') {
    try {
      const { expandToSpecificTitles } = require('./occupationCatalog');
      specificCandidates = expandToSpecificTitles(
        top.map(c => ({ occupation: c.occupation, score: c.score })),
        { nativeBirthYear, region }
      );
    } catch (_) {
      // Catalog optional; absence shouldn't break the ranker
    }
  }

  // A natural-language summary so the prompt can echo it
  const summary = top.length
    ? blended
      ? `Ambiguous chart: top two domains tied (${top[0].occupation} ≈ ${top[1].occupation}). Most likely a hybrid role combining BOTH. Confidence: ${confidence}.`
      : `Most likely domain: ${top[0].occupation} (score ${Math.round(top[0].score)}, ${confidence} confidence). Backup: ${top.slice(1, 3).map(c => c.occupation).join(' · ')}`
    : 'Insufficient signal to classify profession.';

  return {
    candidates,
    top: top.map(c => ({
      occupation: c.occupation,
      score: Math.round(c.score),
      normalised: Math.min(100, Math.round((c.score / maxPossible) * 100)),
      reasons: c.reasons,
    })),
    confidence,
    blended,
    summary,
    specificCandidates,
    region,
    regionLabel,
    signals: {
      careerLord: evidence.careerLord,
      careerHousePlanets: evidence.careerHousePlanets,
      careerHouseSign: evidence.careerHouseSign,
      parentKaraka: evidence.parentKaraka,
      d10Lagna: evidence.d10Lagna,
    },
  };
}

module.exports = {
  rankParentProfessions,
  PLANET_DOMAINS,
  HOUSE_DOMAINS,
  SIGN_COLOURS,
};
