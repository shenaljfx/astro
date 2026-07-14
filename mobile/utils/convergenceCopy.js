/**
 * convergenceCopy — localizes the Next-12-Months (convergence calendar) driver
 * sentences and month labels into Sinhala on the client.
 *
 * The server emits each driver as { signal, text, pts } where `signal` is a
 * STABLE machine key (see server/src/engine/convergenceCalendar.js) and `text`
 * is English with the planet name interpolated. We key off `signal` for the
 * Sinhala template and pull the planet out of `text` where needed — so this
 * works on already-cached reports (which carry `signal`) with no redeploy.
 * Anything unmapped falls back to the original English text.
 */

var PLANET_SI = {
  Sun: 'රවි', Moon: 'චන්ද්‍ර', Mars: 'කුජ', Mercury: 'බුධ', Jupiter: 'ගුරු',
  Venus: 'සිකුරු', Saturn: 'ශනි', Rahu: 'රාහු', Ketu: 'කේතු',
};

// Short Sinhala month names — kept compact for the one-line window range.
var MONTH_SI = {
  Jan: 'ජන', Feb: 'පෙබ', Mar: 'මාර්', Apr: 'අප්‍රේ', May: 'මැයි', Jun: 'ජූනි',
  Jul: 'ජූලි', Aug: 'අගෝ', Sep: 'සැප්', Oct: 'ඔක්', Nov: 'නොවැ', Dec: 'දෙසැ',
};

function planetSi(word) { return PLANET_SI[word] || word; }

// signal → builder. `p` is the localized planet (from text's first word).
var DRIVER_SI = {
  ad_lord_house: function (p) { return p + ' දශා-උපදශාව මේ ජීවිත ක්ෂේත්‍රය අවදි කරනවා'; },
  ad_lord_karaka: function (p) { return p + ' ස්වභාවයෙන්ම මේ ක්ෂේත්‍රයට අධිපතියි'; },
  pd_lord_house: function (p) { return p + ' ක්ෂුද්‍ර-දශාව මේ මාසයේ මේ ක්ෂේත්‍රය ස්පර්ශ කරනවා'; },
  pd_lord_karaka: function (p) { return p + ' ක්ෂුද්‍ර-දශාව ස්වභාවික කාරකයෙක්'; },
  md_lord_house: function (p) { return p + ' මහ-දශාව පසුබිමින් සහාය දෙනවා'; },
  jupiter_transit: function () { return 'ගුරු මේ ජීවිත ක්ෂේත්‍රය ඔස්සේ ගමන් කරමින් දෘෂ්ටි කරනවා'; },
  saturn_discipline: function () { return 'ශනි බර, නමුත් ඵලදායී වැඩ බරක් ගෙනෙනවා'; },
  saturn_transit: function () { return 'ශනි මේ ක්ෂේත්‍රය මන්දගාමී කරනවා — ඉවසීම අවශ්‍යයි'; },
  saturn_aspect: function () { return 'ශනිගේ ප්‍රමාද කරවන දෘෂ්ටියක් මෙතැනට'; },
  rahu_travel: function () { return 'රාහු විදේශ / ස්ථාන-මාරු තේමා වැඩි කරනවා'; },
  yogi_period: function () { return 'දුර්ලභ වාසනා-වාහක දශා කාලයක් ක්‍රියාත්මකයි'; },
  avayogi_period: function () { return 'අස්ථිර දශා අධිපතියෙක් — ලොකු තීරණ අවසන් නොකරන්න'; },
  eclipse_trigger: function () { return 'ග්‍රහණයක් ප්‍රධාන ග්‍රහයෙකුට බලපානවා — හැරවුම් ලක්ෂ්‍යයක්'; },
  sade_sati: function () { return 'දිගු ශනි-චන්ද්‍ර පීඩන අවධිය (සාඩේ සති) ක්‍රියාත්මකයි'; },
};

/**
 * Localize a single driver object to a plain Sinhala sentence.
 * @param {{signal?:string, text?:string, planet?:string}} driver
 * @param {boolean} si
 */
export function driverToSi(driver, si) {
  if (!driver) return '';
  var text = driver.text || '';
  if (!si) return text;
  var build = driver.signal && DRIVER_SI[driver.signal];
  if (!build) return text; // unknown signal → keep English safely
  // Planet: prefer an explicit field (newer reports), else the first word of
  // the English text (older cached reports carry the planet only in `text`).
  var planetWord = driver.planet || (text.split(' ')[0] || '');
  return build(planetSi(planetWord));
}

var MONTH_NUM = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

/**
 * Month number (1–12) from a "Mon YYYY" label — for the 12-month strip,
 * where Sinhala month names don't fit under 1/12-width columns but the
 * number reads instantly ("7 මාසේ" = July).
 */
export function monthNumberFromLabel(label) {
  var mon = String(label || '').split(' ')[0];
  return MONTH_NUM[mon] || null;
}

/**
 * Localize a "Mon YYYY" label (e.g. "Jul 2026" → "ජූලි 2026").
 */
export function monthLabelSi(label, si) {
  if (!label || !si) return label || '';
  var parts = String(label).split(' ');
  var mon = MONTH_SI[parts[0]] || parts[0];
  return parts[1] ? mon + ' ' + parts[1] : mon;
}

/**
 * Localize a "start – end" range built from two month labels.
 */
export function monthRangeSi(startLabel, endLabel, si) {
  var a = monthLabelSi(startLabel, si);
  var b = monthLabelSi(endLabel, si);
  return a === b ? a : a + ' – ' + b;
}
