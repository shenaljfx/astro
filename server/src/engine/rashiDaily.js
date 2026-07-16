/**
 * rashiDaily — REAL, deterministic daily content per moon sign (rashi), for the
 * marketing studio's daily posts. NO AI/LLM: every sign's message is derived
 * from the day's actual ephemeris — the classic Chandra-gochara (transiting
 * Moon's house from the sign) plus Saturn/Jupiter transit modifiers. Same date
 * → same output, always.
 */
const { getAllPlanetPositions } = require('./astrology');

const RASHIS = [
  { index: 0, english: 'Aries', sinhala: 'මේෂ', tamil: 'மேஷம்', symbol: '♈' },
  { index: 1, english: 'Taurus', sinhala: 'වෘෂභ', tamil: 'ரிஷபம்', symbol: '♉' },
  { index: 2, english: 'Gemini', sinhala: 'මිථුන', tamil: 'மிதுனம்', symbol: '♊' },
  { index: 3, english: 'Cancer', sinhala: 'කටක', tamil: 'கடகம்', symbol: '♋' },
  { index: 4, english: 'Leo', sinhala: 'සිංහ', tamil: 'சிம்மம்', symbol: '♌' },
  { index: 5, english: 'Virgo', sinhala: 'කන්‍යා', tamil: 'கன்னி', symbol: '♍' },
  { index: 6, english: 'Libra', sinhala: 'තුලා', tamil: 'துலாம்', symbol: '♎' },
  { index: 7, english: 'Scorpio', sinhala: 'වෘශ්චික', tamil: 'விருச்சிகம்', symbol: '♏' },
  { index: 8, english: 'Sagittarius', sinhala: 'ධනු', tamil: 'தனுசு', symbol: '♐' },
  { index: 9, english: 'Capricorn', sinhala: 'මකර', tamil: 'மகரம்', symbol: '♑' },
  { index: 10, english: 'Aquarius', sinhala: 'කුම්භ', tamil: 'கும்பம்', symbol: '♒' },
  { index: 11, english: 'Pisces', sinhala: 'මීන', tamil: 'மீனம்', symbol: '♓' },
];

// Chandra gochara — the transiting Moon's house from a sign is the classic
// driver of daily rashi-phalam. 12 real outcomes, en + si.
const MOON_HOUSE = {
  1: { q: 'good', en: 'The Moon moves through your sign today — feelings run clear and your presence lands well. Trust your instincts.', si: 'අද හඳ ඔබේ ලග්නයෙන් ගමන් කරයි — හැඟීම් පැහැදිලියි, ඔබේ පැවැත්ම කැපී පෙනේ. හදවතට සවන් දෙන්න.' },
  2: { q: 'good', en: 'A day that favours money, food and family — expect small gains and warm words at home.', si: 'ධනය, ආහාර හා පවුලට හිතකර දිනයක් — කුඩා ලාභ හා නිවසේ මිහිරි වදන් අපේක්ෂා කරන්න.' },
  3: { q: 'good', en: 'Courage and communication are blessed — reach out, ask, take the short bold step.', si: 'ධෛර්යය හා සන්නිවේදනයට සුබයි — ඉදිරිපත් වන්න, අසන්න, කුඩා නමුත් නිර්භීත පියවරක් ගන්න.' },
  4: { q: 'mixed', en: 'Home comforts call, but restlessness lurks beneath — slow down before you decide.', si: 'නිවසේ සුවය අද ඇද ගනී, නමුත් නොසන්සුන්තාවක් යටින් සැඟවී ඇත — තීරණයට පෙර සන්සුන් වන්න.' },
  5: { q: 'mixed', en: 'Romance and creativity stir, yet focus wavers — enjoy, but don\'t rush a big choice.', si: 'ආදරය හා නිර්මාණශීලිත්වය අවුස්සයි, එහෙත් අවධානය සැලෙයි — රස විඳින්න, ලොකු තීරණ ඉක්මන් නොකරන්න.' },
  6: { q: 'good', en: 'You rise over rivals and obstacles today — a strong day to face what you\'ve been avoiding.', si: 'අද ඔබ තරඟකරුවන් හා බාධක ජය ගනී — මඟ හැර සිටි දේට මුහුණ දීමට ශක්තිමත් දිනයක්.' },
  7: { q: 'good', en: 'Partnerships and deals flow — meet, talk, and agreements made now hold well.', si: 'හවුල්කම් හා ගනුදෙනු සුමට වේ — හමුවන්න, කතා කරන්න; අද කරන එකඟතා හොඳින් පවතී.' },
  8: { q: 'caution', en: 'Chandrashtama — guard your energy. Rest, avoid big moves and heated words. This too passes.', si: 'චන්ද්‍රාෂ්ටම — ඔබේ ශක්තිය රැක ගන්න. විවේක ගන්න, ලොකු තීරණ හා උණුසුම් වදන් වළක්වන්න. මෙයද පහ වේ.' },
  9: { q: 'mixed', en: 'Luck and learning beckon, but energy scatters — pick one path and the day rewards you.', si: 'වාසනාව හා ඉගෙනීම ඇරයුම් කරයි, නමුත් ශක්තිය විසිර යයි — එක් මඟක් තෝරන්න, දිනය ඔබට ත්‍යාග දේ.' },
  10: { q: 'good', en: 'Work and reputation shine — step forward, be seen, and deliver what you promised.', si: 'රැකියාව හා කීර්තිය බැබළේ — ඉදිරියට එන්න, පෙනී සිටින්න, පොරොන්දුව ඉටු කරන්න.' },
  11: { q: 'good', en: 'Wishes are fulfilled and gains arrive — one of your luckiest days. Ask boldly.', si: 'ප්‍රාර්ථනා ඉටු වේ, ලාභ ලැබේ — ඔබේ වාසනාවන්තම දිනවලින් එකකි. නිර්භීතව ඉල්ලන්න.' },
  12: { q: 'caution', en: 'Expenses and tiredness rise — invest in rest, not risk. Protect your peace today.', si: 'වියදම් හා වෙහෙස වැඩි වේ — අවදානමට නොව විවේකයට යොදවන්න. අද ඔබේ සාමය රැක ගන්න.' },
};

const norm360 = (x) => (((x % 360) + 360) % 360);
const rashiIndexOf = (sidereal) => Math.floor(norm360(sidereal) / 30);
const houseFrom = (planetIdx, signIdx) => ((planetIdx - signIdx + 12) % 12) + 1;

// Deterministic "lucky" touches derived from date+sign (stable per day, not random).
const COLORS = ['Gold', 'Crimson', 'Emerald', 'Sapphire', 'Amber', 'Ivory', 'Rose', 'Teal'];
function luckyFor(dateKey, signIdx) {
  let h = 0; const s = `${dateKey}#${signIdx}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return { number: (h % 9) + 1, color: COLORS[h % COLORS.length] };
}

/**
 * Full 12-sign daily package for `date`. Every field is computed from the
 * ephemeris — no AI. `signs[].quote` / `.quoteSi` are the ready-to-post lines.
 */
function getRashiDaily(date = new Date()) {
  const d = date ? new Date(date) : new Date();
  const p = getAllPlanetPositions(d);
  const moonIdx = rashiIndexOf(p.moon.sidereal);
  const satIdx = rashiIndexOf(p.saturn.sidereal);
  const jupIdx = rashiIndexOf(p.jupiter.sidereal);
  const dateKey = d.toISOString().slice(0, 10);

  const signs = RASHIS.map((r) => {
    const s = r.index;
    const moonHouse = houseFrom(moonIdx, s);
    const satHouse = houseFrom(satIdx, s);
    const jupHouse = houseFrom(jupIdx, s);
    const base = MOON_HOUSE[moonHouse];

    const sadeSati = [12, 1, 2].includes(satHouse);
    const jupBenefic = [2, 5, 7, 9, 11].includes(jupHouse);
    const shaniKantakaAshtama = [4, 7, 8, 10].includes(satHouse);

    let score = base.q === 'good' ? 72 : base.q === 'mixed' ? 54 : 36;
    if (jupBenefic) score += 8;
    if (sadeSati) score -= 8;
    else if (shaniKantakaAshtama) score -= 5;
    score = Math.max(20, Math.min(96, score));
    const rating = score >= 70 ? 'Favorable' : score >= 48 ? 'Balanced' : 'Take care';

    let quote = base.en;
    let quoteSi = base.si;
    if (jupBenefic) { quote += ' Jupiter\'s grace quietly supports you.'; quoteSi += ' ගුරු බලය නිහඬව ඔබට රුකුල් දේ.'; }
    if (sadeSati) { quote += ' Saturn tests your patience — steady steps win.'; quoteSi += ' සෙනසුරු ඉවසීම පරීක්ෂා කරයි — ස්ථිර පියවර ජය ගනී.'; }

    return {
      ...r,
      moonHouse,
      chandrashtama: moonHouse === 8,
      sadeSati,
      jupiterFavorable: jupBenefic,
      score,
      rating,
      quote,
      quoteSi,
      lucky: luckyFor(dateKey, s),
    };
  });

  return {
    date: dateKey,
    computedFrom: 'ephemeris (Chandra gochara + Saturn/Jupiter transits) — deterministic, no AI',
    moonSign: RASHIS[moonIdx].english,
    moonSignSi: RASHIS[moonIdx].sinhala,
    signs,
  };
}

module.exports = { getRashiDaily, RASHIS, luckyFor };
