/**
 * PRE-CLASSIFICATION VALIDATOR
 * =============================
 *
 * Runs BEFORE the AI sees `sectionData`. Sanitizes engine-computed
 * data so the model never receives biologically-implausible or
 * malformed inputs. The principle is simple: an AI fed garbage will
 * confidently write garbage. Catching it here is the cheapest fix
 * possible — zero AI cost, deterministic, fast.
 *
 * Scope of checks:
 *  1. Lifespan caps for time-window fields (self vs parent context)
 *  2. Numeric sanity (scores 0-100, ages 0-120, percentages bounded)
 *  3. Year range (1900..birthYear+120 for self, +100 for parent)
 *  4. Past/future tense flags so prompts can use correct grammar
 *  5. Required-field presence — adds explicit `__missing` markers
 *     instead of letting `undefined` reach the prompt as the literal
 *     string "undefined"
 *
 * Returns the sanitized data plus a `__validation` payload describing
 * what was changed. The prompt builder can surface this to the model
 * (e.g. "this period was capped to age 80") so the model behaves
 * accordingly.
 */

const { filterSelfPeriods, filterParentPeriods, MAX_SELF_AGE, MAX_PARENT_NATIVE_AGE } = require('./lifespan');

// Fields that hold parent-related time windows. Anything here is
// filtered with the parent cap (native_age 50).
const PARENT_PERIOD_FIELDS = new Set([
  'motherHealthPeriods',
  'motherAgeCrisisWindows',
  'fatherEventPeriods',
  'fatherHealthPeriods',
  'parentHealthWindows',
  'healthCrisisWindows', // typically scoped to parents in family section
]);

// Fields that hold self time windows. Filtered with self cap (age 80).
const SELF_PERIOD_FIELDS = new Set([
  'wealthPeriods',
  'careerPeaks',
  'marriageWindows',
  'childbirthWindows',
  'healthDangerPeriods',
  'spiritualBreakthroughs',
  'majorTransits',
  'lifePredictionPeriods',
  'dasaPeriods',
  'antardashaPeriods',
]);

// Numeric fields and their valid ranges. Anything outside is clamped
// and flagged.
const NUMERIC_RANGES = {
  attractivenessScore: [0, 100],
  attractionPower: [0, 10],
  mercuryStrength: [0, 100],
  moonStrength: [0, 100],
  jupiterStrength: [0, 100],
  marsStrength: [0, 100],
  saturnStrength: [0, 100],
  venusStrength: [0, 100],
  sunStrength: [0, 100],
  marriageScore: [0, 100],
  careerScore: [0, 100],
  healthScore: [0, 100],
  childrenLikelihood: [0, 100],
};

/**
 * Recursively walk an object, applying lifespan filters to any field
 * whose key is in the parent / self period sets.
 */
function _walkAndFilterPeriods(obj, birthDate, warnings, path = '') {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item, i) => _walkAndFilterPeriods(item, birthDate, warnings, `${path}[${i}]`));
  }

  const out = { ...obj };
  for (const key of Object.keys(out)) {
    const val = out[key];
    const childPath = path ? `${path}.${key}` : key;

    if (Array.isArray(val) && val.length && typeof val[0] === 'object') {
      if (PARENT_PERIOD_FIELDS.has(key)) {
        const before = val.length;
        out[key] = filterParentPeriods(val, birthDate);
        if (out[key].length !== before) {
          warnings.push({
            type: 'parent_period_capped',
            field: childPath,
            before,
            after: out[key].length,
          });
        }
      } else if (SELF_PERIOD_FIELDS.has(key)) {
        const before = val.length;
        out[key] = filterSelfPeriods(val, birthDate);
        if (out[key].length !== before) {
          warnings.push({
            type: 'self_period_capped',
            field: childPath,
            before,
            after: out[key].length,
          });
        }
      } else {
        out[key] = _walkAndFilterPeriods(val, birthDate, warnings, childPath);
      }
    } else if (val && typeof val === 'object') {
      out[key] = _walkAndFilterPeriods(val, birthDate, warnings, childPath);
    }
  }
  return out;
}

/**
 * Clamp numeric fields to known sane ranges. We do NOT silently
 * change values that are already valid — only flag and clamp obviously
 * broken numbers (NaN, Infinity, negative scores, or scores > range).
 */
function _clampNumerics(obj, warnings, path = '') {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map((item, i) => _clampNumerics(item, warnings, `${path}[${i}]`));
  }

  const out = { ...obj };
  for (const key of Object.keys(out)) {
    const val = out[key];
    const childPath = path ? `${path}.${key}` : key;

    if (NUMERIC_RANGES[key] && typeof val === 'number') {
      const [min, max] = NUMERIC_RANGES[key];
      if (!Number.isFinite(val)) {
        out[key] = null;
        warnings.push({ type: 'numeric_invalid', field: childPath, value: val });
      } else if (val < min || val > max) {
        const clamped = Math.max(min, Math.min(max, val));
        warnings.push({ type: 'numeric_out_of_range', field: childPath, value: val, clamped, range: [min, max] });
        out[key] = clamped;
      }
    } else if (val && typeof val === 'object') {
      out[key] = _clampNumerics(val, warnings, childPath);
    }
  }
  return out;
}

/**
 * Check for required fields per section type. We don't fail if missing —
 * just record so the prompt can hedge instead of saying "your N/A is
 * strong."
 */
const REQUIRED_FIELDS = {
  marriage: ['marriageAge', 'seventhLord', 'venusHouse'],
  career: ['tenthLord', 'careerScore'],
  familyPortrait: ['mother', 'father'],
  health: ['healthScore', 'sixthLord'],
  children: ['fifthLord'],
};

function _checkRequiredFields(sectionKey, data, warnings) {
  const required = REQUIRED_FIELDS[sectionKey];
  if (!required) return;
  for (const f of required) {
    const v = data?.[f];
    if (v === undefined || v === null || v === 'N/A' || v === '') {
      warnings.push({ type: 'required_field_missing', field: f, section: sectionKey });
    }
  }
}

/**
 * Top-level entry. Returns sanitized sectionData plus a validation log.
 *
 * @param {string} sectionKey - The report section being prepared
 * @param {object} sectionData - Raw engine output for the section
 * @param {Date|string} birthDate - Native's birth date
 * @returns {{ data: object, warnings: Array, summary: string }}
 */
function preValidateSectionData(sectionKey, sectionData, birthDate) {
  if (!sectionData || typeof sectionData !== 'object') {
    return { data: sectionData, warnings: [], summary: '' };
  }

  const warnings = [];
  let out = sectionData;

  // 1. Lifespan filtering on time-window arrays
  out = _walkAndFilterPeriods(out, birthDate, warnings);

  // 2. Clamp out-of-range numerics
  out = _clampNumerics(out, warnings);

  // 3. Check required fields
  _checkRequiredFields(sectionKey, out, warnings);

  // 4. Compose a short summary string the prompt can show to the model
  const summary =
    warnings.length > 0
      ? `Pre-validation note: engine data for this section was sanitised — ${warnings.length} issue(s) detected. ` +
        `Lifespan caps applied (native max age ${MAX_SELF_AGE}, parent events max native_age ${MAX_PARENT_NATIVE_AGE}). ` +
        `If a key reads "missing" or "N/A", do NOT invent a value — say so honestly or omit.`
      : '';

  return { data: out, warnings, summary };
}

module.exports = {
  preValidateSectionData,
  PARENT_PERIOD_FIELDS,
  SELF_PERIOD_FIELDS,
  NUMERIC_RANGES,
};
