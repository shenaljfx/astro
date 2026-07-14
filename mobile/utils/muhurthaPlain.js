/**
 * muhurthaPlain — turns the muhurtha engine's technical breakdown into
 * plain-language sentences a non-astrologer understands.
 *
 * The product rule (same as the porondam v2 rewrite): explain WHAT IT MEANS
 * in simple spoken-warm ඔබ Sinhala first; keep the technical term only as a
 * bracketed reference. The engine's raw names (Saptami, Vipat, Brahma…) stay
 * visible in a small "technical" row, never as the primary explanation.
 *
 * Everything here is derived from the structured breakdown the server sends —
 * no string parsing of English sentences except mapWarning(), which maps the
 * engine's known warning strings (enumerated in server/src/engine/muhurtha.js)
 * to Sinhala.
 */

// ── Localized names ────────────────────────────────────────────────────────

var DAY_SI = {
  Sunday: 'ඉරිදා', Monday: 'සඳුදා', Tuesday: 'අඟහරුවාදා', Wednesday: 'බදාදා',
  Thursday: 'බ්‍රහස්පතින්දා', Friday: 'සිකුරාදා', Saturday: 'සෙනසුරාදා',
};

// Sinhala tithi names by position inside the paksha (1–15).
var TITHI_SI = [
  'පෑළවිය', 'දියවක', 'තියවක', 'ජලවක', 'විසේනිය', 'සැටවක', 'සතවක',
  'අටවක', 'නවවක', 'දසවක', 'එකොළොස්වක', 'දොළොස්වක', 'තෙළෙස්වක', 'තුදුස්වක', 'පසළොස්වක',
];

// Fallback rashi map — server now sends lagnaSinhala, this covers older responses.
var RASHI_SI = {
  Aries: 'මේෂ', Taurus: 'වෘෂභ', Gemini: 'මිථුන', Cancer: 'කටක', Leo: 'සිංහ',
  Virgo: 'කන්‍යා', Libra: 'තුලා', Scorpio: 'වෘශ්චික', Sagittarius: 'ධනු',
  Capricorn: 'මකර', Aquarius: 'කුම්භ', Pisces: 'මීන',
};

// The nine Taras: what each actually MEANS for the person, in plain words.
var TARA_MEANING = {
  'Janma': { si: 'ඔබේම නැකත් දවසයි — මිශ්‍ර ඵල', en: 'your own star day — mixed results' },
  'Sampat': { si: 'සමෘද්ධියට හිතකරයි', en: 'favours prosperity' },
  'Vipat': { si: 'බාධා එන්න පුළුවන් දවසක්', en: 'obstacles are possible' },
  'Kshema': { si: 'ආරක්ෂාවයි සුබසෙතයි ගෙනෙනවා', en: 'brings safety and wellbeing' },
  'Pratyari': { si: 'විරුද්ධතා මතුවිය හැකි දවසක්', en: 'resistance can surface' },
  'Sadhaka': { si: 'වැඩ සාර්ථක වීමට හිතකරයි', en: 'favours getting things done' },
  'Vadha': { si: 'අශුභයි — හැකි නම් වළකින්න', en: 'inauspicious — avoid if you can' },
  'Mitra': { si: 'හිතවත් දවසක්', en: 'a friendly day' },
  'Ati-Mitra': { si: 'ඉතාම හිතවත් දවසක්', en: 'a most supportive day' },
};

export function tithiNameSi(number) {
  if (!number) return '';
  if (number === 30) return 'අමාවක';
  var idx = ((number - 1) % 15);
  var base = TITHI_SI[idx] || '';
  if (number === 15) return 'පසළොස්වක (පොහොය)';
  return (number <= 15 ? 'පුර ' : 'අව ') + base;
}

export function dayNameSi(en) { return DAY_SI[en] || en; }
export function rashiNameSi(en) { return RASHI_SI[en] || en; }

// Engine quality words → user language.
export function qualityWord(q, si) {
  if (!si) return q;
  var map = {
    'Excellent': 'ඉතා ශුභයි', 'Good': 'හොඳයි', 'Average': 'මධ්‍යමයි',
    'Below Average': 'දුර්වල පැත්තට', 'Poor': 'දුර්වලයි',
  };
  return map[q] || q;
}

// ── Plain-language factor sentences ────────────────────────────────────────
// Each line: { tone: 'good' | 'ok' | 'bad', text }.
// Tone from the factor's score ratio, same thresholds as the chip colors.

function tone(score, max) {
  var r = max ? (score || 0) / max : 1;
  if (r >= 0.8) return 'good';
  if (r >= 0.45) return 'ok';
  return 'bad';
}

export function plainLines(bd, si) {
  if (!bd) return [];
  var out = [];

  if (bd.tithi) {
    var tT = tone(bd.tithi.score, bd.tithi.max);
    var tName = si ? (tithiNameSi(bd.tithi.number) || bd.tithi.name) : bd.tithi.name;
    out.push({
      tone: tT,
      text: si
        ? 'සඳේ දවස (' + tName + ') ' + (tT === 'good' ? 'මේ වැඩේට හොඳයි' : tT === 'ok' ? 'සාමාන්‍යයි' : 'මේ වැඩේට දුර්වලයි')
        : 'The lunar day (' + tName + ') is ' + (tT === 'good' ? 'good for this' : tT === 'ok' ? 'neutral' : 'weak for this'),
    });
  }

  if (bd.nakshatra) {
    var tN = tone(bd.nakshatra.score, bd.nakshatra.max);
    var nName = si ? (bd.nakshatra.sinhala || bd.nakshatra.name) : bd.nakshatra.name;
    out.push({
      tone: tN,
      text: si
        ? 'දවසේ නැකත (' + nName + ') ' + (tN === 'good' ? 'මේ වැඩේට ගැළපෙනවා' : tN === 'ok' ? 'සාමාන්‍යයි' : 'මේ වැඩේට ගැළපෙන්නේ නැහැ')
        : 'The day’s star (' + nName + ') ' + (tN === 'good' ? 'suits this well' : tN === 'ok' ? 'is neutral' : 'doesn’t suit this'),
    });
  }

  if (bd.weekday) {
    var tW = tone(bd.weekday.score, bd.weekday.max);
    var dName = si ? dayNameSi(bd.weekday.day) : bd.weekday.day;
    out.push({
      tone: tW,
      text: si
        ? dName + ' ' + (tW === 'good' ? 'මේ වැඩේට හොඳ දවසක්' : tW === 'ok' ? 'සාමාන්‍ය දවසක්' : 'මේ වැඩේට සුදුසුම දවස නෙමෙයි')
        : dName + ' is ' + (tW === 'good' ? 'a good day for this' : tW === 'ok' ? 'an ordinary day' : 'not ideal for this'),
    });
  }

  if (bd.yoga) {
    var tY = tone(bd.yoga.score, bd.yoga.max);
    out.push({
      tone: tY,
      text: si
        ? 'දවසේ යෝගය (' + bd.yoga.name + ') ' + (tY === 'good' ? 'ශුභයි' : tY === 'ok' ? 'සාමාන්‍යයි' : 'අශුභයි')
        : 'The day’s yoga (' + bd.yoga.name + ') is ' + (tY === 'good' ? 'auspicious' : tY === 'ok' ? 'neutral' : 'inauspicious'),
    });
  }

  // Personalized: Tarabala — the user's own star vs the day.
  if (bd.tarabala) {
    var tb = bd.tarabala;
    if (tb.dual) {
      // Dual factors only exist for weddings (both charts weighed) — speak of
      // the groom (මනාලයා) and bride (මනාලිය), not "first/second partner".
      var mA = TARA_MEANING[tb.name] || {};
      var mB = TARA_MEANING[tb.partnerName] || {};
      var tD = tone(tb.combined, tb.max);
      out.push({
        tone: tD,
        text: si
          ? 'මනාලයාට ' + (mA.si || tb.name) + '; මනාලියට ' + (mB.si || tb.partnerName) + ' (තාරා බලය)'
          : 'For the groom: ' + (mA.en || tb.name) + '; for the bride: ' + (mB.en || tb.partnerName) + ' (Tara balam)',
      });
    } else {
      var m = TARA_MEANING[tb.name] || {};
      var tS = tone(tb.score, tb.max);
      out.push({
        tone: tS,
        text: si
          ? 'ඔබේ උපන් නැකතට මේ දවස — ' + (m.si || tb.name) + ' (' + tb.name + ' තාරාව)'
          : 'Against your birth star this day ' + (m.en || 'is ' + tb.name) + ' (' + tb.name + ' Tara)',
      });
    }
  }

  // Personalized: Chandrabala — where today's Moon sits from the natal Moon.
  if (bd.chandrabala) {
    var cb = bd.chandrabala;
    if (cb.dual) {
      var tCD = tone(cb.combined, cb.max);
      out.push({
        tone: tCD,
        text: si
          ? 'සඳේ පිහිටීම: මනාලයාට ' + (cb.quality === 'good' ? 'හිතකරයි' : 'දුර්වලයි') + ', මනාලියට ' + (cb.partnerQuality === 'good' ? 'හිතකරයි' : 'දුර්වලයි') + ' (චන්ද්‍ර බලය)'
          : 'Moon position: ' + (cb.quality === 'good' ? 'supportive' : 'weak') + ' for the groom, ' + (cb.partnerQuality === 'good' ? 'supportive' : 'weak') + ' for the bride (Chandra balam)',
      });
    } else {
      var tC = tone(cb.score, cb.max);
      out.push({
        tone: tC,
        text: si
          ? 'එදා සඳ ඔබට ' + (tC === 'good' ? 'හිතකර තැනක' : 'දුර්වල තැනක') + ' (ඔබේ උපන් සඳෙන් ' + cb.house + ' වන තැන)'
          : 'That day’s Moon sits in a ' + (tC === 'good' ? 'supportive' : 'weak') + ' place for you (house ' + cb.house + ' from your natal Moon)',
      });
    }
  }

  if (bd.lagnaStrength && bd.lagnaStrength.lagna) {
    var tL = tone(bd.lagnaStrength.score, bd.lagnaStrength.max);
    var lName = si ? (bd.lagnaStrength.lagnaSinhala || rashiNameSi(bd.lagnaStrength.lagna)) : bd.lagnaStrength.lagna;
    out.push({
      tone: tL,
      text: si
        ? 'ඒ වේලාවේ උදාවන ලග්නය (' + lName + ') ' + (tL === 'good' ? 'ශක්තිමත්' : tL === 'ok' ? 'සාමාන්‍යයි' : 'දුර්වලයි')
        : 'The rising sign at that time (' + lName + ') is ' + (tL === 'good' ? 'strong' : tL === 'ok' ? 'average' : 'weak'),
    });
  }

  return out;
}

// One-sentence overall verdict, from the factor tones.
export function summaryLine(lines, si) {
  if (!lines || !lines.length) return '';
  var good = lines.filter(function (l) { return l.tone === 'good'; }).length;
  var bad = lines.filter(function (l) { return l.tone === 'bad'; }).length;
  if (si) {
    if (bad === 0) return 'සාධක ' + lines.length + 'න් ' + good + 'ක්ම හිතකරයි — ඒකයි මේ වේලාව තෝරුණේ.';
    return 'බොහෝ සාධක හොඳයි, ඒත් දුර්වල සාධක ' + bad + 'ක් තියෙනවා — පහළ රතු ඒවා බලන්න.';
  }
  if (bad === 0) return good + ' of ' + lines.length + ' factors align — that’s why this time was chosen.';
  return 'Most factors are good, but ' + bad + ' run weak — check the red items below.';
}

// ── Engine warning strings → Sinhala ───────────────────────────────────────
// The engine's warnings are a fixed set (see server muhurtha.js). Map by
// pattern; anything unrecognized falls through in English.

export function mapWarning(w, si) {
  if (!w) return w;
  var m;
  if (!si) {
    // English pass-through, except the paired (wedding-only) warnings where
    // "first/second partner" reads clinical — say groom/bride instead.
    if ((m = w.match(/^(.+?) Tara — weak for the first partner's birth star/))) return m[1] + " Tara — weak for the groom's birth star";
    if ((m = w.match(/^(.+?) Tara — weak for the second partner's birth star/))) return m[1] + " Tara — weak for the bride's birth star";
    if ((m = w.match(/Weak Chandrabala for the first partner \(Moon in house (\d+)\)/))) return 'Weak Chandrabala for the groom (Moon in house ' + m[1] + ')';
    if ((m = w.match(/Weak Chandrabala for the second partner \(Moon in house (\d+)\)/))) return 'Weak Chandrabala for the bride (Moon in house ' + m[1] + ')';
    return w;
  }
  if (/Falls within Rahu Kala/i.test(w)) return 'රාහු කාලයට වැටෙනවා — මේ වේලාව වළකින්න';
  if (/Falls within Gulika/i.test(w)) return 'ගුලික කාලයට වැටෙනවා — අශුභ කාල සීමාවක්';
  if (/Falls within Yamaghanta/i.test(w)) return 'යමඝණ්ට කාලයට වැටෙනවා — වළකින්න';
  if ((m = w.match(/^(.+?) Tara — weak for the first partner/))) return m[1] + ' තාරාව — මනාලයාගේ උපන් නැකතට දුර්වලයි';
  if ((m = w.match(/^(.+?) Tara — weak for the second partner/))) return m[1] + ' තාරාව — මනාලියගේ උපන් නැකතට දුර්වලයි';
  if ((m = w.match(/^(.+?) Tara — not ideal/))) return m[1] + ' තාරාව — ඔබේ උපන් නැකතට එතරම් හිතකර නැහැ';
  if ((m = w.match(/Weak Chandrabala for the first partner \(Moon in house (\d+)\)/))) return 'මනාලයාට චන්ද්‍ර බලය දුර්වලයි (සඳ ' + m[1] + ' වන තැනේ)';
  if ((m = w.match(/Weak Chandrabala for the second partner \(Moon in house (\d+)\)/))) return 'මනාලියට චන්ද්‍ර බලය දුර්වලයි (සඳ ' + m[1] + ' වන තැනේ)';
  if ((m = w.match(/Moon in house (\d+) from your natal Moon/))) return 'සඳ ඔබේ උපන් සඳෙන් ' + m[1] + ' වන තැනේ — චන්ද්‍ර බලය දුර්වලයි';
  if ((m = w.match(/^Tithi (.+?) is inauspicious/))) return 'සඳේ දවස (' + m[1] + ') මේ වැඩේට අශුභයි';
  if (/Rikta Tithi/i.test(w)) return 'රික්තා තිථියක් — ශක්තිය අඩු දවසක්';
  if ((m = w.match(/^(.+?) Nakshatra is not suitable/))) return m[1] + ' නැකත මේ වැඩේට සුදුසු නැහැ';
  if ((m = w.match(/^(.+?) Yoga is inauspicious/))) return m[1] + ' යෝගය අශුභයි';
  if (/Vishti/i.test(w)) return 'විෂ්ටි (භද්‍රා) කරණය — තදින්ම අශුභයි';
  if ((m = w.match(/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday) is not ideal/))) return dayNameSi(m[1]) + ' මේ වැඩේට සුදුසුම දවස නෙමෙයි';
  if (/Malefic planet in Lagna/i.test(w)) return 'ඒ වේලාවේ ලග්නයේ පාප ග්‍රහයෙක් ඉන්නවා — එතරම් හොඳ නැහැ';
  return w;
}

// ── Direction of the day (Disha Shoola) ────────────────────────────────────
// Server sends { best: {en,si}, avoid: {en,si} } per result. Three plain
// lines: setting out, the blocked direction, and entering/receiving.

export function directionLines(direction, si) {
  if (!direction || !direction.best || !direction.avoid) return [];
  var best = si ? direction.best.si : direction.best.en;
  var avoid = si ? direction.avoid.si : direction.avoid.en;
  return [
    {
      tone: 'good',
      text: si
        ? 'ගමනක් යනවා නම් ' + best + ' දිශාව බලා පිටත්වෙන්න'
        : 'Heading out? Set off facing ' + best + '.',
    },
    {
      tone: 'bad',
      text: si
        ? avoid + ' දිශාවට ගමන් අරඹන්න එපා (දිශා ශූලය)'
        : 'Avoid starting a journey toward the ' + avoid + ' (Disha Shoola).',
    },
    {
      tone: 'good',
      text: si
        ? 'ඇතුළු වෙද්දීත් ' + best + ' දිශාව බලා ඇතුළු වීම සුබයි'
        : 'When entering, come in facing ' + best + '.',
    },
  ];
}

// ── Free-tier "why this day" ───────────────────────────────────────────────
// The preview sends {key, name, sinhala?, number?, good} — build one warm
// sentence naming the aligned factors, so the free result explains itself.

export function freeWhyLine(why, si) {
  if (!Array.isArray(why) || !why.length) return '';
  var goods = why.filter(function (w) { return w.good; });
  var names = goods.map(function (w) {
    if (w.key === 'weekday') return si ? dayNameSi(w.name) : w.name;
    if (w.key === 'tithi') return si ? ('සඳේ දවස (' + (tithiNameSi(w.number) || w.name) + ')') : ('the lunar day (' + w.name + ')');
    if (w.key === 'nakshatra') return si ? ((w.sinhala || w.name) + ' නැකත') : ('the ' + w.name + ' star');
    if (w.key === 'yoga') return si ? (w.name + ' යෝගය') : ('the ' + w.name + ' yoga');
    return w.name;
  });
  if (!names.length) {
    return si
      ? 'මේ පරාසයේ තිබූ හොඳම සමතුලිත දවස මෙයයි.'
      : 'This is the most balanced day in your range.';
  }
  return si
    ? names.join(', ') + ' — මේ ඔක්කොම මේ දවසේ එකට ගැළපෙනවා. ඒකයි මේ දවස තෝරුණේ.'
    : names.join(', ') + ' all align on this day — that’s why it was chosen.';
}
