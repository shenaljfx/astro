/**
 * REGION DETECTOR
 * ===============
 * Maps a birth (lat, lng) to a coarse cultural / labour-market region
 * code used by occupationCatalog.js to pick era-and-region-appropriate
 * specific job titles.
 *
 * The app is global — we cannot assume Sri Lanka. This module decides
 * which region "bucket" a birth falls into so we can show specifics
 * that ring true for that culture (e.g. "Kachcheri clerk" for LK,
 * "DMV clerk" for US, "council officer" for UK, "Tehsildar" for IN).
 *
 * Supported regions (15 buckets):
 *   LK   Sri Lanka
 *   IN   India
 *   PK   Pakistan
 *   BD   Bangladesh
 *   NP   Nepal / Bhutan
 *   ME   Middle East (Gulf + Levant + Iran)
 *   SEA  Southeast Asia (Thai/Malay/Indo/Phil/Viet/etc.)
 *   EA   East Asia (China / HK / TW / JP / KR)
 *   EU   Continental Europe
 *   UK   UK + Ireland
 *   US   USA
 *   CA   Canada
 *   AU   Australia / NZ
 *   AF   Sub-Saharan Africa
 *   LATAM  Mexico / Central / South America
 *   default  fallback
 *
 * Bounding boxes are intentionally coarse — we only need cultural-
 * region accuracy, not country-precise borders. If a point falls
 * into multiple boxes, the FIRST match wins (priority order matters).
 */

// Bounding boxes ordered by priority (small / specific first, then large).
// Each box: [latMin, latMax, lngMin, lngMax, regionCode]
const REGION_BOXES = [
  // ── Small / specific countries first (so they don't get swallowed) ──
  [5.5, 10.0, 79.5, 82.0, 'LK'],          // Sri Lanka
  [27.0, 30.5, 80.0, 89.0, 'NP'],         // Nepal / Bhutan
  [20.5, 27.0, 88.0, 92.7, 'BD'],         // Bangladesh
  [23.5, 37.5, 60.5, 77.5, 'PK'],         // Pakistan (rough — overlaps IN; comes first)

  // ── India ── (after PK/BD/NP/LK so those win on overlap)
  [6.5, 36.0, 68.0, 97.5, 'IN'],

  // ── Middle East ──
  [12.0, 42.0, 25.0, 63.0, 'ME'],         // covers Gulf + Levant + Iran + Egypt-ish

  // ── Southeast Asia ──
  [-11.0, 23.0, 92.0, 141.0, 'SEA'],      // ID, MY, TH, VN, PH, MM, etc.

  // ── East Asia ──
  [18.0, 54.0, 100.0, 146.0, 'EA'],       // CN, HK, TW, JP, KR, MN

  // ── UK + Ireland ──
  [49.5, 61.0, -11.0, 2.0, 'UK'],

  // ── Europe (continent) ──
  [35.0, 71.0, -10.0, 40.0, 'EU'],

  // ── Canada — populated southern Ontario / Quebec (border with US) ──
  // Specific narrow box for Toronto / Ottawa / Montreal / Windsor before
  // the broader US lower-48 box claims them by latitude overlap.
  [41.5, 49.0, -84.0, -57.0, 'CA'],

  // ── USA (lower 48 + Alaska + Hawaii) ──
  [24.0, 49.0, -125.0, -66.5, 'US'],
  [51.0, 72.0, -170.0, -130.0, 'US'],     // Alaska
  [18.5, 23.5, -161.0, -154.5, 'US'],     // Hawaii

  // ── Canada — rest (mostly above 49°N) ──
  [49.0, 84.0, -141.0, -52.0, 'CA'],

  // ── Latin America ──
  [-56.0, 33.0, -118.0, -34.0, 'LATAM'],

  // ── Australia / NZ ──
  [-48.0, -10.0, 112.0, 180.0, 'AU'],

  // ── Sub-Saharan Africa ──
  [-35.0, 18.0, -18.0, 52.0, 'AF'],
];

/**
 * Detect region from (lat, lng).
 * @param {number} lat
 * @param {number} lng
 * @returns {string} region code — see list above.
 */
function detectRegion(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    return 'default';
  }
  for (const [latMin, latMax, lngMin, lngMax, code] of REGION_BOXES) {
    if (lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax) {
      return code;
    }
  }
  return 'default';
}

/** Human-readable name for prompt copy. */
const REGION_NAMES = {
  LK: 'Sri Lanka',
  IN: 'India',
  PK: 'Pakistan',
  BD: 'Bangladesh',
  NP: 'Nepal',
  ME: 'the Middle East',
  SEA: 'Southeast Asia',
  EA: 'East Asia',
  UK: 'the UK',
  EU: 'Europe',
  US: 'the United States',
  CA: 'Canada',
  AU: 'Australia / New Zealand',
  AF: 'Sub-Saharan Africa',
  LATAM: 'Latin America',
  default: 'their country',
};

function regionLabel(code) {
  return REGION_NAMES[code] || REGION_NAMES.default;
}

module.exports = { detectRegion, regionLabel, REGION_NAMES };
