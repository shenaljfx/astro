/**
 * RARITY ENGINE — measured base rates for chart features.
 *
 * The report prompt used to ask the LLM to guess which chart features are
 * "statistically unusual (fewer than 15% of charts)". The model has no base
 * rates, so it invents rarity. This module computes REAL prevalence by
 * sampling many charts once and tallying feature frequencies, then exposes a
 * lookup so the engine can attach *measured* rarity to each notable placement
 * ("Sun–Venus–Mercury together: 1.8% of charts"). That makes the "psychic
 * moments" factual and genuinely different for every user.
 *
 * The precomputed table lives in ./data/baseRates.json (built by
 * scripts/precomputeBaseRates.js). If it is missing, getRarity() degrades
 * gracefully to null and callers simply omit rarity annotations.
 */

const fs = require('fs');
const path = require('path');
const { getAllPlanetPositions, getLagna, getNakshatra } = require('./astrology');

const DATA_PATH = path.join(__dirname, 'data', 'baseRates.json');

const PLANET_KEYS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];

let _rates = null;
let _loaded = false;

function loadRates() {
  if (_loaded) return _rates;
  _loaded = true;
  try {
    _rates = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch (_) {
    _rates = null;
  }
  return _rates;
}

/**
 * Extract the set of distinctive feature keys from one chart. Deliberately
 * lightweight (no full report) so the base-rate sampler can run over tens of
 * thousands of charts quickly.
 */
function extractFeatures(date, lat, lng) {
  const feats = [];
  const planets = getAllPlanetPositions(date, lat, lng);
  const lagna = getLagna(date, lat, lng);
  const lagnaId = lagna.rashi.id;
  const houseOf = (rashiId) => ((rashiId - lagnaId + 12) % 12) + 1;

  feats.push(`lagna:${lagnaId}`);
  const moonNak = getNakshatra(planets.moon.sidereal);
  feats.push(`moonNak:${moonNak.id}`);

  const bySign = {};
  const byHouse = {};
  for (const k of PLANET_KEYS) {
    const p = planets[k];
    if (!p) continue;
    feats.push(`sign:${k}:${p.rashiId}`);
    const h = houseOf(p.rashiId);
    feats.push(`house:${k}:${h}`);
    if (p.isRetrograde && k !== 'rahu' && k !== 'ketu') feats.push(`retro:${k}`);
    (bySign[p.rashiId] = bySign[p.rashiId] || []).push(k);
    (byHouse[h] = byHouse[h] || []).push(k);
  }

  // Conjunctions (2+ planets in the same sign) and stelliums.
  for (const list of Object.values(bySign)) {
    if (list.length >= 2) {
      const sorted = [...list].sort();
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          feats.push(`conj:${sorted[i]}+${sorted[j]}`);
        }
      }
      if (list.length >= 3) feats.push(`stellium:${list.length}`);
    }
  }
  // Planets stacked in one house (house stellium).
  for (const [h, list] of Object.entries(byHouse)) {
    if (list.length >= 3) feats.push(`houseStellium:${h}:${list.length}`);
  }

  return feats;
}

/**
 * Sample `sampleSize` charts deterministically and return feature prevalences.
 * Uses a seeded LCG so results are reproducible.
 */
function computeBaseRates(sampleSize = 8000, seed = 20260709) {
  let s = seed >>> 0;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

  const START = Date.UTC(1950, 0, 1);
  const END = Date.UTC(2015, 0, 1);
  // Sri Lanka + common diaspora latitudes (rising-sign frequency is latitude-sensitive).
  const locs = [
    [6.9271, 79.8612], [7.2906, 80.6337], [9.6615, 80.0255], [8.5874, 81.2152],
    [6.0535, 80.2210], [51.5074, -0.1278], [1.3521, 103.8198], [25.2048, 55.2708],
    [-33.8688, 151.2093], [43.6532, -79.3832],
  ];

  const counts = Object.create(null);
  let ok = 0;
  for (let i = 0; i < sampleSize; i++) {
    const t = START + rand() * (END - START);
    const loc = locs[Math.floor(rand() * locs.length)];
    try {
      const feats = new Set(extractFeatures(new Date(t), loc[0], loc[1]));
      for (const f of feats) counts[f] = (counts[f] || 0) + 1;
      ok++;
    } catch (_) { /* skip unresolvable sample */ }
  }

  const rates = Object.create(null);
  for (const k of Object.keys(counts)) rates[k] = counts[k] / ok;
  return { sampleSize: ok, seed, generatedAt: new Date().toISOString(), rates };
}

function labelFor(pct) {
  if (pct < 2) return 'extremely rare';
  if (pct < 5) return 'very rare';
  if (pct < 12) return 'rare';
  if (pct < 30) return 'uncommon';
  return 'common';
}

/**
 * Look up the measured prevalence of one feature key.
 * Returns { featureKey, prevalence(%), label } or null if no table is loaded.
 */
function getRarity(featureKey) {
  const data = loadRates();
  if (!data || !data.rates) return null;
  const p = data.rates[featureKey];
  if (p == null) {
    // Absent from the sample → rarer than the sampling resolution.
    const floor = data.sampleSize ? 100 / data.sampleSize : 0.1;
    return { featureKey, prevalence: +floor.toFixed(2), label: 'extremely rare', belowResolution: true };
  }
  const pct = p * 100;
  return { featureKey, prevalence: +pct.toFixed(1), label: labelFor(pct) };
}

/**
 * Given a live chart, return its most statistically unusual features with
 * measured prevalence, most-rare first. This is what the report engine feeds
 * to the prompt in place of the LLM guessing rarity.
 */
function findRareFeatures(date, lat, lng, limit = 6) {
  const data = loadRates();
  if (!data || !data.rates) return [];
  const feats = extractFeatures(date, lat, lng);
  const scored = [];
  const seen = new Set();
  for (const f of feats) {
    if (seen.has(f)) continue;
    seen.add(f);
    const r = getRarity(f);
    if (r && r.prevalence != null && r.prevalence <= 15) {
      scored.push({ feature: f, ...r });
    }
  }
  scored.sort((a, b) => a.prevalence - b.prevalence);
  return scored.slice(0, limit);
}

// ── Human-readable rendering (for prompts / UI) ─────────────────────────────
const _RASHI = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const _NAK = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const _PLANET = { sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury', jupiter: 'Jupiter', venus: 'Venus', saturn: 'Saturn', rahu: 'Rahu', ketu: 'Ketu' };
const _ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

/**
 * Translate a feature key into a plain-English description of the placement.
 * Returns null for keys we don't want surfaced (e.g. ordinary conjunctions).
 */
function describeFeature(key) {
  const parts = key.split(':');
  switch (parts[0]) {
    case 'lagna': return `a ${_RASHI[+parts[1] - 1]} rising sign`;
    case 'moonNak': return `the Moon in ${_NAK[+parts[1] - 1]}`;
    case 'sign': return `${_PLANET[parts[1]]} in ${_RASHI[+parts[2] - 1]}`;
    case 'house': return `${_PLANET[parts[1]]} in the ${_ORD[+parts[2]]} house`;
    case 'retro': return `${_PLANET[parts[1]]} retrograde at birth`;
    case 'conj': { const [a, b] = parts[1].split('+'); return `${_PLANET[a]} and ${_PLANET[b]} together in one sign`; }
    case 'stellium': return `${parts[1]} planets gathered in a single sign`;
    case 'houseStellium': return `${parts[2]} planets stacked in the ${_ORD[+parts[1]]} house`;
    default: return null;
  }
}

/**
 * Build ready-to-inject rarity insights for a chart: the most statistically
 * unusual placements with measured prevalence and a plain-English label.
 */
function buildRarityInsights(date, lat, lng, limit = 6) {
  const rare = findRareFeatures(date, lat, lng, limit * 2);
  const out = [];
  for (const r of rare) {
    const text = describeFeature(r.feature);
    if (!text) continue;
    out.push({ text, prevalence: r.prevalence, label: r.label });
    if (out.length >= limit) break;
  }
  return out;
}

module.exports = {
  DATA_PATH,
  extractFeatures,
  computeBaseRates,
  getRarity,
  findRareFeatures,
  describeFeature,
  buildRarityInsights,
  loadRates,
};
