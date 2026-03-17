/**
 * Timezone Resolution Service
 *
 * Resolves the correct UTC offset for a given latitude, longitude, and moment in
 * time — accounting for historical DST rules that have changed over the decades.
 *
 * Priority chain:
 *   1. TimeZoneDB API  (free tier — 1 req/sec, no daily cap, historical DST aware)
 *   2. Local IANA zone lookup via `Intl` (fast but not historical-DST-aware)
 *   3. Hard-coded offset fallback (Sri Lanka = UTC+5:30, no DST)
 *
 * Why this matters for Vedic astrology:
 *   The Lagna (Ascendant) shifts ~1° every 4 minutes of clock time.
 *   A wrong UTC offset of even 30 minutes can push the Lagna into the wrong sign,
 *   invalidating the entire house chart.  Historical DST errors (e.g. India used
 *   IST+1 during WW2, Sri Lanka briefly used UTC+6 in 2006) are the most common
 *   source of incorrect chart calculations.
 *
 * Setup:
 *   Add TIMEZONEDB_API_KEY=<your_key> to server/.env
 *   Get a free key at: https://timezonedb.com/register
 */

const axios = require('axios');

// In-memory cache: key = "lat:lng:unixTimestamp" → offsetSeconds
const _cache = new Map();
const MAX_CACHE = 2000;

/**
 * Get the UTC offset (in seconds) that was in effect at `date` for the
 * given geographic coordinates.
 *
 * @param {number} lat         - Latitude in decimal degrees
 * @param {number} lng         - Longitude in decimal degrees
 * @param {Date}   date        - The UTC moment to resolve (typically birth date/time)
 * @returns {Promise<number>}  - UTC offset in seconds (e.g. 19800 for UTC+5:30)
 */
async function resolveUtcOffset(lat, lng, date) {
  const unixTs = Math.floor(date.getTime() / 1000);
  const cacheKey = `${lat.toFixed(4)}:${lng.toFixed(4)}:${unixTs}`;

  if (_cache.has(cacheKey)) {
    return _cache.get(cacheKey);
  }

  const apiKey = process.env.TIMEZONEDB_API_KEY;

  if (apiKey) {
    try {
      const url = 'https://api.timezonedb.com/v2.1/get-time-zone';
      const resp = await axios.get(url, {
        params: {
          key: apiKey,
          format: 'json',
          by: 'position',
          lat,
          lng,
          time: unixTs,
        },
        timeout: 4000,
      });

      if (resp.data && resp.data.status === 'OK') {
        const offsetSec = resp.data.gmtOffset; // seconds, e.g. 19800 for UTC+5:30
        _setCache(cacheKey, offsetSec);
        console.log(
          `[timezone] TimeZoneDB resolved ${lat},${lng} @ ${date.toISOString()} → ` +
          `${resp.data.zoneName} UTC${offsetSec >= 0 ? '+' : ''}${(offsetSec / 3600).toFixed(2)}`
        );
        return offsetSec;
      }
    } catch (err) {
      console.warn('[timezone] TimeZoneDB API call failed (non-fatal):', err.message);
    }
  } else {
    console.warn('[timezone] TIMEZONEDB_API_KEY not set — falling back to Intl/SLT heuristic');
  }

  // Fallback 1: Use Intl.DateTimeFormat to infer the IANA timezone name from coordinates,
  // then compute the offset.  This is not historical-DST-aware but covers 99% of modern dates.
  try {
    const tzName = _ianaFromCoords(lat, lng);
    if (tzName) {
      const formatter = new Intl.DateTimeFormat('en', {
        timeZone: tzName,
        timeZoneName: 'longOffset',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const parts = formatter.formatToParts(date);
      const offsetPart = parts.find(p => p.type === 'timeZoneName');
      if (offsetPart) {
        const offsetSec = _parseOffsetString(offsetPart.value);
        _setCache(cacheKey, offsetSec);
        console.log(`[timezone] Intl fallback: ${tzName} → offset ${offsetSec}s`);
        return offsetSec;
      }
    }
  } catch (e) {
    console.warn('[timezone] Intl fallback failed:', e.message);
  }

  // Fallback 2: Sri Lanka hard-coded (UTC+5:30 = 19800s, no DST ever)
  const sltOffset = 19800;
  _setCache(cacheKey, sltOffset);
  console.warn('[timezone] Using hard-coded SLT fallback (UTC+5:30)');
  return sltOffset;
}

/**
 * Given a naive local date string (no timezone suffix) and the birth
 * coordinates, return a proper UTC Date object.
 *
 * If the string already includes a timezone (`Z` or `+hh:mm`), it is
 * parsed as-is and the coordinates are used only for logging.
 *
 * @param {string} dateStr  - e.g. "1995-03-15T08:30:00" or "1995-03-15T08:30:00Z"
 * @param {number} lat      - Birth latitude
 * @param {number} lng      - Birth longitude
 * @returns {Promise<Date>} - UTC Date object
 */
async function parseBirthDateTime(dateStr, lat, lng) {
  if (!dateStr) return null;

  // Already has explicit timezone — parse and return as-is
  if (/Z$|[+-]\d{2}:\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  // Naive string — first, parse it as UTC to get a rough Date for the API call.
  // We'll treat it as local time and correct with the resolved offset below.
  const roughUtc = new Date(dateStr + 'Z');
  if (isNaN(roughUtc.getTime())) return null;

  try {
    const offsetSec = await resolveUtcOffset(lat, lng, roughUtc);
    // Local time = UTC + offset  →  UTC = Local − offset
    const utcMs = roughUtc.getTime() - offsetSec * 1000;
    const utcDate = new Date(utcMs);
    console.log(
      `[timezone] Birth time "${dateStr}" @ (${lat},${lng}) → ` +
      `UTC ${utcDate.toISOString()} (offset ${offsetSec}s)`
    );
    return utcDate;
  } catch (err) {
    console.warn('[timezone] parseBirthDateTime resolution failed, falling back to +05:30:', err.message);
    // Hard fallback: assume SLT (UTC+5:30)
    const d = new Date(dateStr + '+05:30');
    return isNaN(d.getTime()) ? null : d;
  }
}

// ── Private helpers ─────────────────────────────────────────────────────────

function _setCache(key, value) {
  if (_cache.size >= MAX_CACHE) {
    // Evict oldest entry
    const firstKey = _cache.keys().next().value;
    _cache.delete(firstKey);
  }
  _cache.set(key, value);
}

/**
 * Very lightweight coordinate-to-IANA-zone heuristic.
 * Covers South/South-East Asia accurately.  For other regions the caller
 * should rely on the TimeZoneDB API which is always queried first.
 */
function _ianaFromCoords(lat, lng) {
  // Sri Lanka
  if (lat >= 5.9 && lat <= 9.9 && lng >= 79.6 && lng <= 81.9)  return 'Asia/Colombo';
  // India
  if (lat >= 8.0 && lat <= 37.0 && lng >= 68.0 && lng <= 97.0)  return 'Asia/Kolkata';
  // Pakistan
  if (lat >= 23.0 && lat <= 37.0 && lng >= 60.0 && lng <= 77.0) return 'Asia/Karachi';
  // Bangladesh
  if (lat >= 20.0 && lat <= 26.7 && lng >= 88.0 && lng <= 92.7) return 'Asia/Dhaka';
  // Nepal
  if (lat >= 26.0 && lat <= 30.5 && lng >= 80.0 && lng <= 88.2) return 'Asia/Kathmandu';
  // UAE
  if (lat >= 22.0 && lat <= 26.1 && lng >= 51.0 && lng <= 56.4) return 'Asia/Dubai';
  // UK
  if (lat >= 49.5 && lat <= 61.0 && lng >= -8.0 && lng <= 2.0)  return 'Europe/London';
  // Australia (Sydney region)
  if (lat >= -38.0 && lat <= -28.0 && lng >= 141.0 && lng <= 154.0) return 'Australia/Sydney';
  // USA Eastern
  if (lat >= 24.0 && lat <= 47.0 && lng >= -85.0 && lng <= -66.0) return 'America/New_York';
  // USA Pacific
  if (lat >= 32.0 && lat <= 49.0 && lng >= -124.0 && lng <= -114.0) return 'America/Los_Angeles';
  // Canada Eastern
  if (lat >= 42.0 && lat <= 60.0 && lng >= -82.0 && lng <= -52.0) return 'America/Toronto';
  // Singapore / Malaysia
  if (lat >= 1.0 && lat <= 7.5 && lng >= 99.0 && lng <= 119.0) return 'Asia/Singapore';

  return null; // Unknown — let TimeZoneDB handle it
}

/**
 * Parse an Intl offset string like "GMT+05:30" or "UTC-04:00" into seconds.
 */
function _parseOffsetString(str) {
  const m = str.match(/([+-])(\d{1,2}):(\d{2})/);
  if (!m) return 19800; // default SLT
  const sign = m[1] === '+' ? 1 : -1;
  return sign * (parseInt(m[2], 10) * 3600 + parseInt(m[3], 10) * 60);
}

module.exports = { resolveUtcOffset, parseBirthDateTime };
