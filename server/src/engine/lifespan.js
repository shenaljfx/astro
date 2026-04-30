/**
 * LIFESPAN PLAUSIBILITY FILTER
 * ============================
 *
 * Stops the engine from emitting predictions in years where the relevant
 * person is biologically unlikely to be alive. Two scenarios:
 *
 * 1. SELF (the native): A baby born in 2026 will (statistically) live to
 *    ~75-85. Predictions for year 2110+ are absurd ("you will gain wealth
 *    in 2099" when the person would be 73). We cap self events at age 80.
 *
 * 2. PARENTS: For a native born in 2026, the mother / father are typically
 *    25-35 years older. Predictions about parent health in year 2092 are
 *    absurd because the parent would be 90-100+. We cap parent-related
 *    events at native_age 50, which corresponds roughly to parent_age 75-85.
 *
 * Two helper exports:
 *   - filterSelfPeriods(periods, birthDate, opts)
 *   - filterParentPeriods(periods, birthDate, opts)
 *
 * Both accept arrays whose items have either:
 *   { period: 'YYYY-MM-DD to YYYY-MM-DD', ... }
 *   { start: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD', ... }
 *   { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD', ... }
 *   { period: 'YYYY-YYYY', ... }
 *
 * Items that fall ENTIRELY beyond the cap are removed.
 * Items that span the cap are truncated.
 */

const MAX_SELF_AGE = 80;            // self events cut off at age 80
const MAX_PARENT_NATIVE_AGE = 50;   // parent-related events cut off when native is 50
                                    // (parent then ~75-85, statistically realistic)

function _extractRange(item) {
  // Accept multiple shapes. Try start/end fields first because they are
  // unambiguous; fall back to parsing the `period` string.
  const start = item.start || item.startDate;
  const end = item.endDate || item.end;
  if (start && end) {
    return {
      startYear: parseInt(String(start).slice(0, 4), 10),
      endYear: parseInt(String(end).slice(0, 4), 10),
    };
  }
  if (typeof item.period === 'string') {
    // Match the FIRST and LAST 4-digit run anywhere in the string.
    const all = item.period.match(/\d{4}/g);
    if (all && all.length >= 2) {
      return { startYear: parseInt(all[0], 10), endYear: parseInt(all[all.length - 1], 10) };
    }
    if (all && all.length === 1) {
      const y = parseInt(all[0], 10);
      return { startYear: y, endYear: y };
    }
  }
  if (item.year) {
    const y = parseInt(item.year, 10);
    return { startYear: y, endYear: y };
  }
  return null;
}

function _capYear(item, capYear) {
  // Truncate the displayed range to capYear if the item has explicit fields
  const range = _extractRange(item);
  if (!range) return item;
  if (range.endYear <= capYear) return item;

  const capped = { ...item, _truncatedAt: capYear, _wasCapped: true };
  // Update `period` by rewriting the LAST 4-digit run only (preserves
  // 'YYYY-MM-DD to YYYY-MM-DD' form correctly).
  if (typeof item.period === 'string') {
    const matches = [...item.period.matchAll(/\d{4}/g)];
    if (matches.length >= 2) {
      const last = matches[matches.length - 1];
      const i = last.index;
      capped.period = item.period.slice(0, i) + String(capYear) + item.period.slice(i + 4);
    } else if (matches.length === 1) {
      capped.period = item.period.replace(/\d{4}/, String(capYear));
    }
  }
  if (item.endDate && /^\d{4}/.test(item.endDate)) {
    capped.endDate = `${capYear}${item.endDate.slice(4)}`;
  }
  if (item.end && /^\d{4}/.test(item.end)) {
    capped.end = `${capYear}${item.end.slice(4)}`;
  }
  return capped;
}

function _filterByCap(periods, birthDate, maxAge) {
  if (!Array.isArray(periods) || periods.length === 0) return periods || [];
  const birthYear = (birthDate instanceof Date ? birthDate : new Date(birthDate)).getUTCFullYear();
  const capYear = birthYear + maxAge;
  const out = [];
  for (const item of periods) {
    if (!item) continue;
    const r = _extractRange(item);
    if (!r) {
      // Unknown shape — keep verbatim
      out.push(item);
      continue;
    }
    if (r.startYear > capYear) {
      // Entirely beyond plausible lifespan → drop
      continue;
    }
    out.push(_capYear(item, capYear));
  }
  return out;
}

/**
 * Filter periods that refer to events about the NATIVE (self).
 * Drops items fully past age 80; truncates items spanning the cap.
 */
function filterSelfPeriods(periods, birthDate, opts = {}) {
  const cap = typeof opts.maxAge === 'number' ? opts.maxAge : MAX_SELF_AGE;
  return _filterByCap(periods, birthDate, cap);
}

/**
 * Filter periods that refer to events about a PARENT.
 * Drops items fully past native_age 50; truncates items spanning the cap.
 */
function filterParentPeriods(periods, birthDate, opts = {}) {
  const cap = typeof opts.maxNativeAge === 'number' ? opts.maxNativeAge : MAX_PARENT_NATIVE_AGE;
  return _filterByCap(periods, birthDate, cap);
}

/**
 * Pure helper: is a given calendar year plausible for the native (self) to experience?
 */
function isYearWithinSelfLifespan(year, birthDate, maxAge = MAX_SELF_AGE) {
  if (!Number.isFinite(year)) return false;
  const birthYear = (birthDate instanceof Date ? birthDate : new Date(birthDate)).getUTCFullYear();
  return year <= birthYear + maxAge;
}

/**
 * Pure helper: is a given calendar year plausible for a PARENT to be alive?
 */
function isYearWithinParentLifespan(year, birthDate, maxNativeAge = MAX_PARENT_NATIVE_AGE) {
  if (!Number.isFinite(year)) return false;
  const birthYear = (birthDate instanceof Date ? birthDate : new Date(birthDate)).getUTCFullYear();
  return year <= birthYear + maxNativeAge;
}

module.exports = {
  filterSelfPeriods,
  filterParentPeriods,
  isYearWithinSelfLifespan,
  isYearWithinParentLifespan,
  MAX_SELF_AGE,
  MAX_PARENT_NATIVE_AGE,
};
