/**
 * rashiPeriod — REAL, deterministic WEEKLY / MONTHLY content per moon sign for
 * the marketing studio's image posts. NO AI: every sign's message is aggregated
 * from day-by-day ephemeris results (Chandra gochara via getRashiDaily), so the
 * copy states only what was actually computed. Same period → same output.
 */
const { getRashiDaily, RASHIS, luckyFor } = require('./rashiDaily');

const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SI = ['ඉරිදා', 'සඳුදා', 'අඟහරුවාදා', 'බදාදා', 'බ්‍රහස්පතින්දා', 'සිකුරාදා', 'සෙනසුරාදා'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SI = ['ජනවාරි', 'පෙබරවාරි', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජූනි', 'ජූලි', 'අගෝස්තු', 'සැප්තැම්බර්', 'ඔක්තෝබර්', 'නොවැම්බර්', 'දෙසැම්බර්'];

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };

/** Highest-scoring run of `len` consecutive days → [startIdx, endIdx]. */
function bestWindow(scores, len) {
  if (scores.length <= len) return [0, scores.length - 1];
  let best = 0, bestSum = -1;
  for (let i = 0; i + len <= scores.length; i++) {
    const sum = scores.slice(i, i + len).reduce((a, b) => a + b, 0);
    if (sum > bestSum) { bestSum = sum; best = i; }
  }
  return [best, best + len - 1];
}

/**
 * Weekly (next 7 days from `date`) or monthly (calendar month of `date`)
 * per-sign package. Response signs are drop-in compatible with rashi-daily
 * (english/sinhala/symbol/score/rating/quote/quoteSi/lucky/chandrashtama).
 */
function getRashiPeriod(mode = 'weekly', date = new Date()) {
  const anchor = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  let start, days, label, labelSi, periodKey;

  if (mode === 'monthly') {
    start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
    days = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0)).getUTCDate();
    label = `${MONTHS_EN[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
    labelSi = `${MONTHS_SI[start.getUTCMonth()]} මාසය`;
    periodKey = `${start.getUTCFullYear()}-${start.getUTCMonth() + 1}`;
  } else {
    start = anchor;
    days = 7;
    const end = addDays(start, 6);
    const fmt = (d) => `${MONTHS_EN[d.getUTCMonth()].slice(0, 3)} ${d.getUTCDate()}`;
    label = `${fmt(start)} – ${fmt(end)}`;
    labelSi = `${MONTHS_SI[start.getUTCMonth()]} ${start.getUTCDate()} – ${MONTHS_SI[end.getUTCMonth()]} ${end.getUTCDate()}`;
    periodKey = `wk-${iso(start)}`;
  }

  // Day-by-day real computation (the same engine the daily post uses).
  const daily = Array.from({ length: days }, (_, k) => {
    const d = addDays(start, k);
    return { date: d, pack: getRashiDaily(d) };
  });

  // Bright days count by the Moon-house quality itself (houses 1,2,3,6,7,10,11
  // are the classic favourable gochara positions) — score modifiers (Sade Sati
  // etc.) shift the tone but shouldn't erase a good Moon day from the count.
  const GOOD_HOUSES = [1, 2, 3, 6, 7, 10, 11];

  const signs = RASHIS.map((r) => {
    const perDay = daily.map(({ date: d, pack }) => {
      const s = pack.signs[r.index];
      return {
        date: iso(d),
        dow: d.getUTCDay(),
        dayOfMonth: d.getUTCDate(),
        score: s.score,
        moonHouse: s.moonHouse,
        chandrashtama: s.chandrashtama,
        sadeSati: s.sadeSati,
        jupiterFavorable: s.jupiterFavorable,
      };
    });

    const scores = perDay.map((x) => x.score);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const goodDays = perDay.filter((x) => GOOD_HOUSES.includes(x.moonHouse)).length;
    const cautionDays = perDay.filter((x) => x.chandrashtama);
    const best = perDay.reduce((a, b) => (b.score > a.score ? b : a), perDay[0]);
    const sadeSati = perDay[Math.floor(perDay.length / 2)].sadeSati;
    const jupFav = perDay[Math.floor(perDay.length / 2)].jupiterFavorable;
    const rating = avg >= 70 ? 'Favorable' : avg >= 48 ? 'Balanced' : 'Take care';

    let quote, quoteSi;
    if (mode === 'monthly') {
      const [w1, w2] = bestWindow(scores, 3);
      const winTxt = `${perDay[w1].dayOfMonth}–${perDay[w2].dayOfMonth}`;
      const cautionList = cautionDays.map((x) => x.dayOfMonth).join(', ');
      quote =
        (goodDays > 0
          ? `${label}: ${goodDays} favourable days of ${days}. Your strongest window is the ${winTxt} — move the big things then.`
          : `${label} asks for patience — small steady steps beat big leaps. Your calmest window is the ${winTxt}.`) +
        (cautionList ? ` Keep the ${cautionList} light and restful (Chandrashtama).` : '');
      quoteSi =
        (goodDays > 0
          ? `${labelSi}ේ දින ${days}න් ${goodDays}ක් ඔබට සුබයි. වැදගත්ම වැඩ ${winTxt} අතර දිනවල කරන්න — ඒ ඔබේ වාසනාවන්තම කාලයයි.`
          : `${labelSi} ඉවසීම ඉල්ලන මාසයක් — ලොකු පිම්මට වඩා කුඩා ස්ථිර පියවර ජය ගනී. සන්සුන්ම කාලය ${winTxt} අතර දිනයි.`) +
        (cautionList ? ` ${cautionList} දිනවල විවේකීව ඉන්න — චන්ද්‍රාෂ්ටම දිනයි.` : '');
    } else {
      const bestName = WEEKDAYS_EN[best.dow];
      const bestNameSi = WEEKDAYS_SI[best.dow];
      const caution = cautionDays[0];
      quote =
        (goodDays > 0
          ? `Week of ${label}: ${goodDays} bright days of 7. ${bestName} is your peak — push what matters then.`
          : `Week of ${label}: a quiet, testing week — keep it simple. ${bestName} is your steadiest day.`) +
        (caution ? ` Go easy on ${WEEKDAYS_EN[caution.dow]} (Chandrashtama).` : '');
      quoteSi =
        (goodDays > 0
          ? `මේ සතියේ දින 7න් ${goodDays}ක් ඔබට සුබයි. වැදගත්ම දේ ${bestNameSi} කරන්න — ඒ ඔබේ වාසනාවන්තම දවසයි.`
          : `මේ සතිය සන්සුන්, ඉවසිලිවන්ත සතියක් — දේවල් සරලව තියාගන්න. ${bestNameSi} ඔබේ ස්ථිරම දවසයි.`) +
        (caution ? ` ${WEEKDAYS_SI[caution.dow]} පරිස්සමෙන් — චන්ද්‍රාෂ්ටම දිනයයි.` : '');
    }
    if (jupFav) { quote += ' Jupiter\'s grace quietly supports you.'; quoteSi += ' ගුරු බලය නිහඬව ඔබට රුකුල් දේ.'; }
    if (sadeSati) { quote += ' Saturn tests your patience — steady steps win.'; quoteSi += ' සෙනසුරු ඉවසීම පරීක්ෂා කරයි — ස්ථිර පියවර ජය ගනී.'; }

    return {
      ...r,
      score: avg,
      rating,
      goodDays,
      totalDays: days,
      bestDay: { date: best.date, weekday: WEEKDAYS_EN[best.dow], weekdaySi: WEEKDAYS_SI[best.dow], dayOfMonth: best.dayOfMonth },
      cautionDates: cautionDays.map((x) => x.date),
      chandrashtama: false, // period-level; per-day caution carried in cautionDates
      sadeSati,
      jupiterFavorable: jupFav,
      quote,
      quoteSi,
      lucky: luckyFor(periodKey, r.index),
      days: perDay,
    };
  });

  return {
    mode,
    start: iso(start),
    end: iso(addDays(start, days - 1)),
    label,
    labelSi,
    computedFrom: 'ephemeris day-by-day (Chandra gochara + Saturn/Jupiter) — deterministic, no AI',
    signs,
  };
}

module.exports = { getRashiPeriod };
