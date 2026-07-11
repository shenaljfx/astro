/**
 * CONVERGENCE CALENDAR — deterministic 12-month dated forecast composer.
 * =====================================================================
 *
 * Turns signals the engine ALREADY computes into falsifiable, dated
 * windows — the "real predictions" layer:
 *
 *   • Vimshottari MD → AD → PD ladder (pratyantars give month resolution)
 *   • Jupiter / Saturn / Rahu gochara by natal house, with classical aspects
 *   • Eclipse hits on natal planets (from the accuracy engine)
 *   • Yogi / Avayogi period lords (luck vs fragile phases)
 *   • Varshaphal year verdict and Sade Sati overlay
 *
 * Pure arithmetic — NO LLM. The output feeds the `next12Months` report
 * section (the AI narrates it without inventing dates) and the mobile
 * timeline UI renders `windows` directly. Every window carries `drivers`
 * so each claim is traceable to a signal.
 *
 * Scoring is intentionally transparent: a small number of additive rules
 * around a base of 50, clamped to [5, 98]. Phase-3 outcome feedback is
 * designed to re-tune these constants — keep them named, not inlined.
 */

const DOMAINS = ['career', 'love', 'money', 'health', 'travel', 'family'];

// Natal houses that carry each life domain (whole-sign from lagna).
const DOMAIN_HOUSES = {
  career: [10, 6],
  love: [7, 5],
  money: [2, 11],
  health: [6, 8, 12],
  travel: [9, 12],
  family: [4, 2],
};

// Natural significators per domain.
const DOMAIN_KARAKAS = {
  career: ['Sun', 'Saturn', 'Mercury'],
  love: ['Venus'],
  money: ['Jupiter', 'Venus'],
  health: ['Saturn', 'Mars'],
  travel: ['Rahu', 'Ketu'],
  family: ['Moon', 'Jupiter'],
};

// Which natal planet an eclipse must hit to matter for a domain.
const ECLIPSE_DOMAIN_PLANETS = {
  career: ['Sun', 'Saturn', 'Mercury'],
  love: ['Venus'],
  money: ['Jupiter', 'Venus'],
  health: ['Moon', 'Mars', 'Saturn'],
  travel: ['Rahu', 'Ketu'],
  family: ['Moon'],
};

// Classical full aspects by planet (houses counted from the planet).
const TRANSIT_ASPECTS = {
  Jupiter: [5, 7, 9],
  Saturn: [3, 7, 10],
};

// ── Scoring weights (Phase-3 calibration targets — keep named) ───────
const W = {
  AD_LORD_HOUSE: 18,   // antardasha lord occupies/rules a domain house
  AD_LORD_KARAKA: 8,   // antardasha lord is a natural karaka of the domain
  PD_LORD_HOUSE: 10,   // pratyantar lord occupies/rules a domain house
  PD_LORD_KARAKA: 4,
  MD_LORD_HOUSE: 6,    // mahadasha backdrop
  JUP_TRANSIT_HOUSE: 12,
  JUP_ASPECT_HOUSE: 6,
  SAT_TRANSIT_HOUSE: -8,
  SAT_CAREER_DISCIPLINE: 3, // Saturn in 10th/6th = pressure but productive
  RAHU_TRAVEL_HOUSE: 8,     // Rahu transit of 9/12 amplifies foreign themes
  YOGI_PERIOD: 10,
  AVAYOGI_PERIOD: -8,
  ECLIPSE_TRIGGER: -6,      // eclipse month = turning point, advise caution
  VARSHAPHAL_STRONG: 4,
  VARSHAPHAL_WEAK: -4,
  SADE_SATI: -6,            // health/family overlay while active
};

const OPPORTUNITY_MIN = 66;
const CAUTION_MAX = 36;

function monthKey(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function monthLabel(d) {
  return `${MONTH_LABELS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Find the active MD/AD/PD lords at a moment from a detailed Vimshottari
 * result ([{lord, start, endDate, antardashas:[{lord, start, endDate,
 * pratyantars:[...]}]}]).
 */
function activeDashaChain(dasaPeriods, when) {
  const t = when.getTime();
  const inRange = (p) => p && new Date(p.start).getTime() <= t && new Date(p.endDate).getTime() > t;
  const md = (dasaPeriods || []).find(inRange) || null;
  const ad = md ? (md.antardashas || []).find(inRange) || null : null;
  const pd = ad ? (ad.pratyantars || []).find(inRange) || null : null;
  return {
    md: md ? md.lord : null,
    ad: ad ? ad.lord : null,
    pd: pd ? pd.lord : null,
    adEnds: ad ? ad.endDate : null,
    pdEnds: pd ? pd.endDate : null,
  };
}

/** Build natal maps: which houses a planet occupies and rules. */
function buildNatalMaps(houses) {
  const occupies = {}; // planet → houseNumber
  const rules = {};    // planet → [houseNumbers]
  for (const h of houses || []) {
    for (const p of h.planets || []) {
      occupies[p.name] = h.houseNumber;
    }
    const lord = h.rashiLord;
    if (lord) {
      (rules[lord] = rules[lord] || []).push(h.houseNumber);
    }
  }
  return { occupies, rules };
}

function planetTouchesHouses(planet, houseList, natal) {
  if (!planet) return false;
  const occ = natal.occupies[planet];
  if (occ && houseList.includes(occ)) return true;
  const ruled = natal.rules[planet] || [];
  return ruled.some((h) => houseList.includes(h));
}

/** House (1-12, whole sign) a transiting rashi falls in from the natal lagna. */
function houseFromLagna(transitRashiId, lagnaRashiId) {
  return ((transitRashiId - lagnaRashiId + 12) % 12) + 1;
}

/** All houses a transiting planet influences: its house + classical aspects. */
function transitInfluencedHouses(planetName, transitHouse) {
  const houses = [transitHouse];
  for (const asp of TRANSIT_ASPECTS[planetName] || []) {
    houses.push(((transitHouse - 1 + asp - 1) % 12) + 1);
  }
  return houses;
}

/**
 * Build the 12-month convergence calendar.
 *
 * @param {object} ctx
 * @param {Date}   ctx.birthDate
 * @param {number} ctx.lat
 * @param {number} ctx.lng
 * @param {object} ctx.settings        resolved calculation settings
 * @param {Array}  ctx.houses          D1 house chart (whole sign)
 * @param {object} ctx.lagna           { rashi: { id, ... } }
 * @param {Array}  ctx.dasaPeriods     calculateVimshottariDetailed output
 * @param {object} [ctx.accuracy]      accuracyEnhancements (yogi/eclipses/varshaphal/sadeSati)
 * @param {Date}   [ctx.asOfDate]
 * @param {number} [ctx.months=12]
 * @param {Function} [ctx.getPositions] override for getAllPlanetPositions (tests)
 */
function buildConvergenceCalendar(ctx) {
  const {
    birthDate, lat, lng, settings = {}, houses, lagna, dasaPeriods,
    accuracy = null, asOfDate = new Date(), months = 12,
  } = ctx;

  if (!houses || !houses.length || !dasaPeriods || !dasaPeriods.length) return null;

  const getPositions = ctx.getPositions || require('./astrology').getAllPlanetPositions;
  const lagnaRashiId = lagna?.rashi?.id || houses[0]?.rashiId || 1;
  const natal = buildNatalMaps(houses);

  const yogiPlanet = accuracy?.yogiAvayogi?.yogiPlanet || null;
  const avayogiPlanet = accuracy?.yogiAvayogi?.avayogiPlanet || null;
  const sadeSatiActive = Boolean(accuracy?.sadeSatiPhase?.active);
  const varshaphalVerdict = String(accuracy?.varshaphal?.yearVerdict || '').toLowerCase();
  const varshaphalYear = accuracy?.varshaphal?.year || null;
  const varshaphalBoost = /strong|favou?rable|excellent|good/.test(varshaphalVerdict)
    ? W.VARSHAPHAL_STRONG
    : /difficult|challenging|weak|caution/.test(varshaphalVerdict)
      ? W.VARSHAPHAL_WEAK
      : 0;

  // Eclipse triggers, keyed by month for quick lookup.
  const eclipsesByMonth = {};
  for (const t of accuracy?.eclipseTriggers?.naturalTriggers || []) {
    if (!t?.eclipseDate) continue;
    const k = String(t.eclipseDate).slice(0, 7);
    (eclipsesByMonth[k] = eclipsesByMonth[k] || []).push(t);
  }

  const start = new Date(Date.UTC(asOfDate.getUTCFullYear(), asOfDate.getUTCMonth(), 1));
  const monthRows = [];

  for (let i = 0; i < months; i++) {
    const monthStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const mid = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), 15, 12));
    const key = monthKey(monthStart);

    const chain = activeDashaChain(dasaPeriods, mid);

    // Transit positions at month midpoint (Jupiter/Saturn/Rahu are what matter
    // at monthly resolution — faster planets wash out inside a month).
    let jupHouses = [];
    let satHouse = null;
    let satHouses = [];
    let rahuHouse = null;
    try {
      const pos = getPositions(mid, lat, lng, settings);
      if (pos?.jupiter) jupHouses = transitInfluencedHouses('Jupiter', houseFromLagna(pos.jupiter.rashiId, lagnaRashiId));
      if (pos?.saturn) {
        satHouse = houseFromLagna(pos.saturn.rashiId, lagnaRashiId);
        satHouses = transitInfluencedHouses('Saturn', satHouse);
      }
      if (pos?.rahu) rahuHouse = houseFromLagna(pos.rahu.rashiId, lagnaRashiId);
    } catch (_) { /* transit unavailable → dasha-only scoring */ }

    const monthEclipses = eclipsesByMonth[key] || [];

    const scores = {};
    const drivers = {};

    for (const domain of DOMAINS) {
      const domainHouses = DOMAIN_HOUSES[domain];
      const karakas = DOMAIN_KARAKAS[domain];
      let score = 50;
      const why = [];

      // 1) Dasha ladder relevance
      if (chain.ad && planetTouchesHouses(chain.ad, domainHouses, natal)) {
        score += W.AD_LORD_HOUSE;
        why.push({ signal: 'ad_lord_house', text: `${chain.ad} sub-period activates this life area`, pts: W.AD_LORD_HOUSE });
      }
      if (chain.ad && karakas.includes(chain.ad)) {
        score += W.AD_LORD_KARAKA;
        why.push({ signal: 'ad_lord_karaka', text: `${chain.ad} naturally rules this domain`, pts: W.AD_LORD_KARAKA });
      }
      if (chain.pd && planetTouchesHouses(chain.pd, domainHouses, natal)) {
        score += W.PD_LORD_HOUSE;
        why.push({ signal: 'pd_lord_house', text: `${chain.pd} micro-period touches this life area this month`, pts: W.PD_LORD_HOUSE });
      }
      if (chain.pd && karakas.includes(chain.pd)) {
        score += W.PD_LORD_KARAKA;
        why.push({ signal: 'pd_lord_karaka', text: `${chain.pd} micro-period is a natural significator`, pts: W.PD_LORD_KARAKA });
      }
      if (chain.md && planetTouchesHouses(chain.md, domainHouses, natal)) {
        score += W.MD_LORD_HOUSE;
        why.push({ signal: 'md_lord_house', text: `${chain.md} major period backdrop supports it`, pts: W.MD_LORD_HOUSE });
      }

      // 2) Gochara
      if (jupHouses.some((h) => domainHouses.includes(h))) {
        score += W.JUP_TRANSIT_HOUSE;
        why.push({ signal: 'jupiter_transit', text: 'Jupiter is moving through/aspecting this life area', pts: W.JUP_TRANSIT_HOUSE });
      }
      if (satHouse && domainHouses.includes(satHouse)) {
        if (domain === 'career') {
          score += W.SAT_CAREER_DISCIPLINE;
          why.push({ signal: 'saturn_discipline', text: 'Saturn brings heavy but productive workload', pts: W.SAT_CAREER_DISCIPLINE });
        } else {
          score += W.SAT_TRANSIT_HOUSE;
          why.push({ signal: 'saturn_transit', text: 'Saturn slows this area — patience needed', pts: W.SAT_TRANSIT_HOUSE });
        }
      } else if (satHouses.some((h) => domainHouses.includes(h)) && domain !== 'career') {
        score += Math.ceil(W.SAT_TRANSIT_HOUSE / 2);
        why.push({ signal: 'saturn_aspect', text: 'Saturn casts a delaying aspect here', pts: Math.ceil(W.SAT_TRANSIT_HOUSE / 2) });
      }
      if (domain === 'travel' && rahuHouse && DOMAIN_HOUSES.travel.includes(rahuHouse)) {
        score += W.RAHU_TRAVEL_HOUSE;
        why.push({ signal: 'rahu_travel', text: 'Rahu amplifies foreign/relocation themes', pts: W.RAHU_TRAVEL_HOUSE });
      }

      // 3) Yogi / Avayogi period lords
      if (yogiPlanet && (chain.ad === yogiPlanet || chain.pd === yogiPlanet)) {
        score += W.YOGI_PERIOD;
        why.push({ signal: 'yogi_period', text: 'a rare luck-carrier period is running', pts: W.YOGI_PERIOD });
      }
      if (avayogiPlanet && (chain.ad === avayogiPlanet || chain.pd === avayogiPlanet)) {
        score += W.AVAYOGI_PERIOD;
        why.push({ signal: 'avayogi_period', text: 'a fragile period lord — avoid finalising big moves', pts: W.AVAYOGI_PERIOD });
      }

      // 4) Eclipses hitting domain planets this month
      const domainEclipse = monthEclipses.find((e) => (ECLIPSE_DOMAIN_PLANETS[domain] || []).includes(e.natalPlanet));
      if (domainEclipse) {
        score += W.ECLIPSE_TRIGGER;
        why.push({
          signal: 'eclipse_trigger',
          text: `${String(domainEclipse.eclipse || 'an eclipse')} on ${String(domainEclipse.eclipseDate).slice(0, 10)} hits a key planet — a turning point, not a normal month`,
          pts: W.ECLIPSE_TRIGGER,
        });
      }

      // 5) Year overlays
      if (varshaphalBoost && varshaphalYear === monthStart.getUTCFullYear()) {
        score += varshaphalBoost;
      }
      if (sadeSatiActive && (domain === 'health' || domain === 'family')) {
        score += W.SADE_SATI;
        why.push({ signal: 'sade_sati', text: 'the long Saturn-Moon pressure phase is active', pts: W.SADE_SATI });
      }

      scores[domain] = Math.max(5, Math.min(98, Math.round(score)));
      why.sort((a, b) => Math.abs(b.pts) - Math.abs(a.pts));
      drivers[domain] = why.slice(0, 3);
    }

    monthRows.push({
      month: key,
      label: monthLabel(monthStart),
      scores,
      drivers,
      active: { md: chain.md, ad: chain.ad, pd: chain.pd },
      eclipses: monthEclipses.map((e) => ({
        date: String(e.eclipseDate).slice(0, 10),
        type: e.eclipse || null,
        natalPlanet: e.natalPlanet || null,
      })),
    });
  }

  // ── Merge monthly runs into windows per domain ────────────────────
  const windows = [];
  for (const domain of DOMAINS) {
    let run = null;
    const flush = () => { if (run) { windows.push(run); run = null; } };
    for (const row of monthRows) {
      const s = row.scores[domain];
      const type = s >= OPPORTUNITY_MIN ? 'opportunity' : s <= CAUTION_MAX ? 'caution' : null;
      if (!type) { flush(); continue; }
      if (run && run.type === type) {
        run.end = row.month;
        run.endLabel = row.label;
        if ((type === 'opportunity' && s > run.score) || (type === 'caution' && s < run.score)) {
          run.score = s;
          run.peakMonth = row.month;
          run.peakLabel = row.label;
          run.drivers = row.drivers[domain];
          run.active = row.active;
        }
      } else {
        flush();
        run = {
          domain,
          type,
          start: row.month,
          startLabel: row.label,
          end: row.month,
          endLabel: row.label,
          peakMonth: row.month,
          peakLabel: row.label,
          score: s,
          drivers: row.drivers[domain],
          active: row.active,
        };
      }
    }
    flush();
  }

  for (const w of windows) {
    w.tier = w.type === 'opportunity'
      ? (w.score >= 85 ? '★★★' : w.score >= 75 ? '★★' : '★')
      : (w.score <= 20 ? '★★★' : w.score <= 28 ? '★★' : '★');
  }

  // Rank: strongest opportunities first, then deepest cautions. Cap output
  // so the section narrates the signal, not the noise.
  const opportunities = windows.filter((w) => w.type === 'opportunity').sort((a, b) => b.score - a.score).slice(0, 5);
  const cautions = windows.filter((w) => w.type === 'caution').sort((a, b) => a.score - b.score).slice(0, 3);

  let bestMonth = null;
  let toughestMonth = null;
  for (const row of monthRows) {
    for (const domain of DOMAINS) {
      const s = row.scores[domain];
      if (!bestMonth || s > bestMonth.score) bestMonth = { month: row.month, label: row.label, domain, score: s };
      if (!toughestMonth || s < toughestMonth.score) toughestMonth = { month: row.month, label: row.label, domain, score: s };
    }
  }

  return {
    title: 'Next 12 Months — Dated Windows',
    sinhala: 'ඉදිරි මාස 12 — දින සහිත කාල රාමු',
    generatedAt: new Date().toISOString(),
    asOf: asOfDate.toISOString().slice(0, 10),
    horizonMonths: months,
    months: monthRows,
    windows: [...opportunities, ...cautions],
    summary: { bestMonth, toughestMonth, opportunityCount: opportunities.length, cautionCount: cautions.length },
    basis: 'vimshottari MD/AD/PD × Jupiter-Saturn gochara × eclipse triggers × yogi/avayogi × varshaphal',
    weights: W, // exposed for Phase-3 calibration tooling
  };
}

/**
 * Convenience wrapper: assemble the chart context from birth data and build
 * the 12-month convergence calendar. Uses the dasha ladder + Jupiter/Saturn/
 * Rahu gochara (fast, no heavy accuracy pass) — the same core signal the full
 * report uses, so the in-app timeline is honest and quick. The full report
 * layers accuracy overlays (yogi/eclipse/varshaphal) on top for extra fidelity.
 *
 * @param {Date|string} birthDate
 * @param {number} lat
 * @param {number} lng
 * @param {{ asOfDate?: Date, months?: number, settings?: object }} [opts]
 * @returns {object|null} the calendar, or null if the chart can't be built
 */
function buildConvergenceForBirth(birthDate, lat, lng, opts = {}) {
  const A = require('./astrology');
  const date = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (isNaN(date.getTime())) return null;
  try {
    const { houses, lagna } = A.buildHouseChart(date, lat, lng, opts.settings || {});
    const moonSid = A.toSidereal(A.getMoonLongitude(date), date);
    const dasaPeriods = A.calculateVimshottariDetailed(moonSid, date);
    return buildConvergenceCalendar({
      birthDate: date,
      lat,
      lng,
      settings: opts.settings || {},
      houses,
      lagna,
      dasaPeriods,
      accuracy: null,
      asOfDate: opts.asOfDate || new Date(),
      months: opts.months || 12,
    });
  } catch (e) {
    console.warn('[convergence] buildConvergenceForBirth failed:', e.message);
    return null;
  }
}

/**
 * Free-tease slice of a full calendar. Returns the 12-month intensity strip
 * (dots) and the window HEADERS (life area + direction + date range + tier) —
 * but never the per-domain month scores, the driver explanations, or guidance.
 * "You have a money opportunity in Mar–Jul 2027 🔒" is the hook; the why is Pro.
 */
function previewSliceConvergence(cal) {
  if (!cal) return null;
  const strip = (cal.months || []).map((m) => {
    const vals = Object.values(m.scores || {});
    const overall = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 50;
    return { month: m.month, label: m.label, intensity: overall };
  });
  const lockedWindows = (cal.windows || []).map((w) => ({
    domain: w.domain,
    type: w.type,
    tier: w.tier,
    startLabel: w.startLabel,
    endLabel: w.endLabel,
  }));
  return {
    _preview: true,
    asOf: cal.asOf,
    horizonMonths: cal.horizonMonths,
    strip,
    lockedWindows,
    summary: {
      opportunityCount: cal.summary ? cal.summary.opportunityCount : 0,
      cautionCount: cal.summary ? cal.summary.cautionCount : 0,
      bestMonthLabel: cal.summary && cal.summary.bestMonth ? cal.summary.bestMonth.label : null,
    },
  };
}

module.exports = {
  buildConvergenceCalendar,
  buildConvergenceForBirth,
  previewSliceConvergence,
  DOMAINS,
  DOMAIN_HOUSES,
  WEIGHTS: W,
};
