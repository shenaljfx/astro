/**
 * Sri Lanka Daylight Saving Time (DST) Utility
 * 
 * Historical DST periods for Sri Lanka:
 * 
 * Period 1: 1996/05/24 00:00 → 1996/10/25 00:00
 *   Clocks turned FORWARD 60 minutes (+1 hour)
 *   Standard time offset: UTC+5:30, Observed: UTC+6:30
 *   
 * Period 2: 1996/10/25 00:00 → 2006/04/14 00:00  
 *   Clocks turned FORWARD 30 minutes
 *   Standard time offset: UTC+5:30, Observed: UTC+6:00
 *
 * IMPORTANT: If birth occurred during a DST period, the hospital clock time
 * is DST time. For accurate astrological calculations, we need TRUE solar time
 * (standard time). User must either:
 *   a) Enter hospital time and select DST from dropdown → we subtract DST offset
 *   b) Enter already-corrected time (manual subtraction) → select "No DST"
 */

// DST period definitions
const SRI_LANKA_DST_PERIODS = [
  {
    id: 'dst_60',
    start: new Date(1996, 4, 24, 0, 0, 0),  // 1996-05-24 midnight
    end: new Date(1996, 9, 25, 0, 0, 0),     // 1996-10-25 midnight
    offsetMinutes: 60,
    label: {
      en: '+60 min DST (1996 May 24 – Oct 25)',
      si: '+60 මිනිත්තු වෙනස් වූ කාලය (1996 මැයි 24 – ඔක් 25)',
      ta: '+60 நிமி பகல் சேமிப்பு நேரம் (1996 மே 24 – அக் 25)',
    },
    description: {
      en: 'Clocks were turned forward by 60 minutes during this period',
      si: 'මේ කාලේ වෙලාව පැයක් (මිනිත්තු 60ක්) ඉස්සරහට දාලා තිබුනේ',
      ta: 'இந்தக்காலத்தில் கடிகாரங்கள் 60 நிமிடங்கள் முன்னோக்கி நகர்த்தப்பட்டன',
    },
  },
  {
    id: 'dst_30',
    start: new Date(1996, 9, 25, 0, 0, 0),   // 1996-10-25 midnight
    end: new Date(2006, 3, 14, 0, 0, 0),      // 2006-04-14 midnight
    offsetMinutes: 30,
    label: {
      en: '+30 min DST (1996 Oct 25 – 2006 Apr 14)',
      si: '+30 මිනිත්තු වෙනස් වූ කාලය (1996 ඔක් 25 – 2006 අප්‍රේ 14)',
      ta: '+30 நிமி பகல் சேமிப்பு நேரம் (1996 அக் 25 – 2006 ஏப் 14)',
    },
    description: {
      en: 'Clocks were turned forward by 30 minutes during this period',
      si: 'මේ කාලේ වෙලාව පැය භාගයක් (මිනිත්තු 30ක්) ඉස්සරහට දාලා තිබුනේ',
      ta: 'இந்தக்காலத்தில் கடிகாரங்கள் 30 நிமிடங்கள் முன்னோக்கி நகர்த்தப்பட்டன',
    },
  },
];

/**
 * Detect which DST period (if any) a given date falls into
 * @param {Date} date - The date to check
 * @returns {object|null} DST period info or null if no DST
 */
export function detectDSTPeriod(date) {
  if (!(date instanceof Date)) date = new Date(date);
  for (const period of SRI_LANKA_DST_PERIODS) {
    if (date >= period.start && date < period.end) {
      return period;
    }
  }
  return null;
}

/**
 * Get the DST offset in minutes for a given date
 * @param {Date} date - The date to check
 * @returns {number} DST offset in minutes (0, 30, or 60)
 */
export function getDSTOffset(date) {
  const period = detectDSTPeriod(date);
  return period ? period.offsetMinutes : 0;
}

/**
 * Convert hospital clock time (DST) to true standard time
 * Subtracts the DST offset from the given time
 * @param {Date} hospitalTime - The time as shown on hospital clock
 * @param {number|null} manualDSTOffset - Manual DST offset in minutes, or null for auto-detect
 * @returns {Date} The corrected standard time
 */
export function toStandardTime(hospitalTime, manualDSTOffset = null) {
  if (!(hospitalTime instanceof Date)) hospitalTime = new Date(hospitalTime);
  
  const offset = manualDSTOffset !== null ? manualDSTOffset : getDSTOffset(hospitalTime);
  
  if (offset === 0) return new Date(hospitalTime);
  
  const corrected = new Date(hospitalTime.getTime() - offset * 60 * 1000);
  return corrected;
}

/**
 * Get all DST options for dropdown
 * @param {string} language - 'en' or 'si'
 * @returns {Array} DST options for picker
 */
export function getDSTOptions(language = 'en') {
  const lang = ['si', 'ta'].includes(language) ? language : 'en';
  return [
    {
      id: 'none',
      offsetMinutes: 0,
      label: {
        si: 'වෙනස් වෙලා නෑ (සාමාන්‍ය වෙලාව)',
        ta: 'பகல் சேமிப்பு நேரம் இல்லை (சாதாரண நேரம்)',
        en: 'No DST (Normal Sri Lanka Time UTC+5:30)',
      }[lang],
      shortLabel: {
        si: 'වෙනස් නෑ',
        ta: 'DST இல்லை',
        en: 'No DST',
      }[lang],
      description: {
        si: '2006 අප්‍රේල් 14න් පස්සේ හරි 1996 මැයි 24ට කලින් නම්',
        ta: '2006 ஏப்ரல் 14-க்குப் பிறகு அல்லது 1996 மே 24-க்கு முன் பிறந்தால்',
        en: 'Birth after Apr 14, 2006 or before May 24, 1996',
      }[lang],
    },
    {
      id: 'dst_30',
      offsetMinutes: 30,
      label: SRI_LANKA_DST_PERIODS[1].label[lang],
      shortLabel: '+30 min',
      description: SRI_LANKA_DST_PERIODS[1].description[lang],
      period: SRI_LANKA_DST_PERIODS[1],
    },
    {
      id: 'dst_60',
      offsetMinutes: 60,
      label: SRI_LANKA_DST_PERIODS[0].label[lang],
      shortLabel: '+60 min',
      description: SRI_LANKA_DST_PERIODS[0].description[lang],
      period: SRI_LANKA_DST_PERIODS[0],
    },
    {
      id: 'already_corrected',
      offsetMinutes: 0,
      label: {
        si: 'වෙලාව මම හරිගස්සලා දැම්මේ',
        ta: 'ஏற்கனவே DST கைமுறையாக கழிக்கப்பட்டது',
        en: 'Already subtracted DST manually',
      }[lang],
      shortLabel: {
        si: 'දැනටමත් හරි',
        ta: 'ஏற்கனவே சரி',
        en: 'Already corrected',
      }[lang],
      description: {
        si: 'ඔයා උපන් වෙලාවෙන් ඒ කාලේ වෙනස් වෙච්ච ගාන අඩු කරලා නම් මේක ඔබන්න',
        ta: 'உங்கள் பிறந்த நேரத்திலிருந்து DST நேரத்தை கழித்துவிட்டீர்கள்',
        en: 'You already subtracted the DST offset from your birth time',
      }[lang],
    },
  ];
}

/**
 * Check if a date falls within any DST period
 * @param {Date} date
 * @returns {boolean}
 */
export function isDSTDate(date) {
  return detectDSTPeriod(date) !== null;
}

/**
 * Get a human-readable explanation of DST for a given date
 * @param {Date} date
 * @param {string} language
 * @returns {string|null}
 */
export function getDSTExplanation(date, language = 'en') {
  const period = detectDSTPeriod(date);
  if (!period) return null;
  
  if (language === 'si') {
    return `⚠️ ඔයා උපන් කාලේ ලංකාවේ වෙලාව ${period.offsetMinutes}කින් වෙනස් කරලා තිබුනේ. ඔයා හොස්පිට්ල් කාඩ් එකේ තියෙන වෙලාවම ගැහුවා නම්, උඩ තියන "DST" තැනින් ${period.offsetMinutes}ක් තියෙන එක තෝරන්න.`;
  }
  if (language === 'ta') {
    return `⚠️ உங்கள் பிறந்த தேதி DST காலத்தில் உள்ளது. ${period.offsetMinutes} நிமிடங்களை கழிக்கவும் அல்லது மேலே உள்ள DST விருப்பத்தை தேர்வு செய்யவும்.`;
  }
  return `⚠️ Your birth date falls within a DST period. Subtract ${period.offsetMinutes} minutes from your hospital birth time, or select the DST option above.`;
}

/**
 * Alias: Check if a date falls within DST and return info object
 * Used by porondam.js and kendara.js
 */
export function getSriLankaDST(date) {
  const period = detectDSTPeriod(date);
  return {
    isDST: !!period,
    offsetMinutes: period ? period.offsetMinutes : 0,
    period: period || null,
  };
}

/**
 * Alias: Correct a date by subtracting DST offset
 * @param {Date} date - Hospital clock time
 * @param {object} dst - DST config with offsetMinutes
 * @returns {Date} Corrected date
 */
export function getCorrectedDate(date, dst) {
  if (!dst || !dst.offsetMinutes) return new Date(date);
  return new Date(date.getTime() - dst.offsetMinutes * 60 * 1000);
}

export default {
  detectDSTPeriod,
  getDSTOffset,
  toStandardTime,
  getDSTOptions,
  isDSTDate,
  isDSTDate,
  getDSTExplanation,
  getSriLankaDST,
  getCorrectedDate,
  SRI_LANKA_DST_PERIODS,
};
