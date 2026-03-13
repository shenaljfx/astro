/**
 * Date utility for parsing Sri Lankan birth times.
 * 
 * Birth times are stored as naive strings like "1995-05-15T10:30:00"
 * representing Sri Lanka local time (UTC+5:30).
 * 
 * The astrology engine expects UTC Date objects, so we must
 * convert naive SL times to UTC by subtracting 5h30m.
 */

/**
 * Parse a birth date/time string as Sri Lanka time (UTC+5:30).
 * Handles both ISO UTC strings (ending in Z) and naive local strings.
 * The engine expects UTC — so naive SL times are shifted back by 5:30.
 * 
 * @param {string} dateStr - Date string to parse
 * @returns {Date|null} - UTC Date object, or null if invalid
 */
function parseSLT(dateStr) {
  if (!dateStr) return null;
  // If the string already has timezone info (Z or +/-offset), parse as-is
  if (/Z$|[+-]\d{2}:\d{2}$/.test(dateStr)) {
    var d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  // Naive string (no Z, no offset) — interpret as Sri Lanka time (UTC+5:30)
  // Append +05:30 so parsing is unambiguous regardless of server timezone
  var d = new Date(dateStr + '+05:30');
  return isNaN(d.getTime()) ? null : d;
}

module.exports = { parseSLT };
