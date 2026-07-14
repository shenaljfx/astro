/**
 * NakathPlanner — the Subha Nakath planner BODY (no screen chrome).
 *
 * Rendered in two places:
 *   1. Inline in the Reports tab (reading switcher — no navigation).
 *   2. Inside app/(tabs)/nakath.js as a standalone screen (Home entry).
 *
 * Pick an activity + a date range → the best auspicious day/time,
 * ALWAYS with the astrological justification ("why this day/time"):
 *   Free : best DAY + why-chips (weekday/tithi/nakshatra/yoga names);
 *          the exact hour + numeric scoring stay locked.
 *   Pro  : exact time windows, each expandable into its full score
 *          breakdown (tithi, nakshatra, weekday, tara balam, chandra
 *          balam) plus any warnings.
 *
 * No emoji icons — Ionicons only (server emoji `icon` field is ignored).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { DatePickerField, TimePickerField } from '../CosmicDateTimePicker';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { plainLines, summaryLine, mapWarning, freeWhyLine, qualityWord, dayNameSi, directionLines } from '../../utils/muhurthaPlain';

// Activity type → premium Ionicon (server sends emoji; we ignore it).
var ACTIVITY_ICONS = {
  wedding: 'heart',
  business: 'business',
  education: 'school',
  travel: 'airplane',
  vehicle: 'car-sport',
  movingIn: 'home',
  construction: 'construct',
  nameCeremony: 'happy',
  firstFeeding: 'restaurant',
  financialTransaction: 'cash',
  surgery: 'medkit',
};
function actIcon(type) { return ACTIVITY_ICONS[type] || 'sparkles'; }

// Each activity carries its own accent — idle chips show a soft tint of it,
// the selected chip glows fully in it (border, wash, icon, label, shadow).
var ACTIVITY_ACCENTS = {
  wedding: '#FB7185',              // rose — the heart
  business: '#7DD3FC',             // sky — corporate calm
  vehicle: '#67E8F9',              // cyan — motion
  construction: '#FDBA74',         // orange — earth & brick
  travel: '#A5B4FC',               // periwinkle — horizons
  education: '#86EFAC',            // green — growth
  nameCeremony: '#FDE68A',         // soft gold — celebration
  firstFeeding: '#F9A8D4',         // pink — the little one
  movingIn: '#C4B5FD',             // violet — new home under the stars
  financialTransaction: '#6EE7B7', // emerald — money
  surgery: '#FCA5A5',              // red — clinical care
};
function actAccent(type) { return ACTIVITY_ACCENTS[type] || '#FFD97A'; }

// Fallback activity list (in engine-key order) if the API list can't load.
var FALLBACK_ACTIVITIES = [
  { type: 'wedding', name: 'Wedding', sinhala: 'විවාහය' },
  { type: 'business', name: 'Business Start', sinhala: 'ව්‍යාපාරය' },
  { type: 'education', name: 'Exam / Study', sinhala: 'විභාගය' },
  { type: 'travel', name: 'Journey', sinhala: 'ගමන' },
  { type: 'vehicle', name: 'New Vehicle', sinhala: 'වාහනය' },
  { type: 'movingIn', name: 'Moving In', sinhala: 'නිවස' },
  { type: 'construction', name: 'Construction', sinhala: 'ඉදිකිරීම' },
  { type: 'nameCeremony', name: 'Naming', sinhala: 'නම තැබීම' },
  { type: 'financialTransaction', name: 'Money Deal', sinhala: 'මුදල් ගනුදෙනු' },
  { type: 'surgery', name: 'Surgery', sinhala: 'සැත්කම' },
];

// Life-event chips for "When will it happen?" (locked for free).
var LIFE_EVENTS = [
  { key: 'career', en: 'Career', si: 'රැකියාව', icon: 'briefcase-outline' },
  { key: 'wealth', en: 'Wealth', si: 'ධනය', icon: 'wallet-outline' },
  { key: 'marriage', en: 'Marriage', si: 'විවාහය', icon: 'heart-outline' },
  { key: 'children', en: 'Children', si: 'දරුවන්', icon: 'people-outline' },
  { key: 'property', en: 'Property', si: 'දේපළ', icon: 'home-outline' },
  { key: 'foreignTravel', en: 'Foreign Travel', si: 'විදේශ ගමන', icon: 'airplane-outline' },
];

// Bilingual labels for the why/breakdown factors.
var FACTOR_LABELS = {
  weekday: { en: 'Weekday', si: 'දවස' },
  tithi: { en: 'Tithi', si: 'තිථිය' },
  nakshatra: { en: 'Nakshatra', si: 'නැකත' },
  yoga: { en: 'Yoga', si: 'යෝගය' },
  tarabala: { en: 'Tara Balam', si: 'තාරා බලය' },
  chandrabala: { en: 'Chandra Balam', si: 'චන්ද්‍ර බලය' },
  lagna: { en: 'Lagna strength', si: 'ලග්න බලය' },
};

function todayISO() { return new Date().toISOString().slice(0, 10); }
function plusDaysISO(n) { return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10); }
// Shift a YYYY-MM-DD string by n days (UTC-safe).
function shiftISO(dateStr, n) {
  try {
    var d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  } catch (e) { return dateStr; }
}
// Split a stored ISO birth moment into the date + HH:MM the pickers expect.
function splitDateTime(iso) {
  if (!iso || typeof iso !== 'string') return { d: '', t: '' };
  var parts = iso.split('T');
  return { d: parts[0] || '', t: (parts[1] || '').slice(0, 5) };
}
// Recombine a date + HH:MM into an ISO string the muhurtha engine can read.
function joinDateTime(d, t) {
  if (!d) return null;
  return d + 'T' + (t && /^\d{2}:\d{2}$/.test(t) ? t : '08:00') + ':00';
}
function fmtDay(dateStr, si) {
  try {
    var d = new Date(dateStr + 'T00:00:00');
    var days = si ? ['ඉරිදා', 'සඳුදා', 'අඟහ', 'බදාදා', 'බ්‍රහස්', 'සිකු', 'සෙන'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var mons = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return days[d.getDay()] + ', ' + d.getDate() + ' ' + mons[d.getMonth()] + ' ' + d.getFullYear();
  } catch (e) { return dateStr; }
}
function fmtTime(iso) {
  try {
    var slt = new Date(new Date(iso).getTime() + 5.5 * 3600000);
    var h = slt.getUTCHours(), m = slt.getUTCMinutes();
    var ap = h >= 12 ? 'PM' : 'AM';
    return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + ap;
  } catch (e) { return ''; }
}

// Ratio → traffic-light color for breakdown chips.
function ratioColor(ratio) {
  if (ratio >= 0.8) return '#86EFAC';
  if (ratio >= 0.45) return '#E8C56A';
  return '#FCA5A5';
}

export default function NakathPlanner() {
  var { language } = useLanguage();
  var { user, showPaywall } = useAuth();
  var si = language === 'si';
  var isPro = !!(user && user.isSubscribed === true);

  var birth = user && user.birthData ? user.birthData : null;
  var bLat = birth && birth.lat ? birth.lat : 6.9271;
  var bLng = birth && birth.lng ? birth.lng : 79.8612;

  var [activities, setActivities] = useState(FALLBACK_ACTIVITIES);
  var [activity, setActivity] = useState('wedding');
  // 'range' = find the best day in a window; 'day' = the date is already
  // fixed (hall booked, poruwa set) — suggest 2–3 times on THAT day.
  var [mode, setMode] = useState('range');
  var [singleDate, setSingleDate] = useState(plusDaysISO(7));
  var [startDate, setStartDate] = useState(todayISO());
  var [endDate, setEndDate] = useState(plusDaysISO(60));
  var [loading, setLoading] = useState(false);
  var [result, setResult] = useState(null);
  var [error, setError] = useState(null);

  // ── Birth details (personalization). Prefilled from the saved profile but
  // editable per search, so a Pro user is never silently scored generic. ──
  var bInit = splitDateTime(birth && birth.dateTime);
  var [birthDate, setBirthDate] = useState(bInit.d);
  var [birthTime, setBirthTime] = useState(bInit.t || '08:00');
  // Second partner — only used for weddings (two charts must both clear).
  var [partnerDate, setPartnerDate] = useState('');
  var [partnerTime, setPartnerTime] = useState('08:00');
  var isWedding = activity === 'wedding';

  useEffect(function () {
    api.getMuhurthaActivities()
      .then(function (res) {
        if (res && res.success && Array.isArray(res.data) && res.data.length) {
          setActivities(res.data.map(function (a) {
            return { type: a.type, name: a.name, sinhala: a.sinhala };
          }));
        }
      })
      .catch(function () { /* keep fallback */ });
  }, []);

  var find = useCallback(async function () {
    // Guard the date range up front — an end-before-start range used to come
    // back as a misleading "no good date". Tell the user what to fix instead.
    if (mode === 'range' && endDate < startDate) {
      setError(si ? 'අවසන් දිනය ආරම්භක දිනයට පෙර විය නොහැක.' : 'The end date can’t be before the start date.');
      return;
    }
    setLoading(true); setError(null); setResult(null);
    try {
      // Personalize from the (editable) birth fields; weddings weigh both charts.
      var myBirth = joinDateTime(birthDate, birthTime);
      var partnerBirth = isWedding ? joinDateTime(partnerDate, partnerTime) : null;
      if (mode === 'day') {
        if (isPro) {
          // The date is fixed — fetch 2–3 auspicious windows on it (Rahu Kalaya dodged).
          var dw = await api.getMuhurthaDayWindows(activity, singleDate, myBirth, bLat, bLng, partnerBirth);
          setResult({ pro: true, day: true, data: dw.data });
        } else {
          // Free tease of the same day: preview scores just that one day.
          var pv1 = await api.getNakathPreview(activity, singleDate, shiftISO(singleDate, 1), bLat, bLng);
          setResult({ pro: false, day: true, data: pv1.data });
        }
      } else if (isPro) {
        var res = await api.findMuhurtha(activity, startDate, endDate, myBirth, bLat, bLng, partnerBirth);
        setResult({ pro: true, data: res.data });
      } else {
        var pv = await api.getNakathPreview(activity, startDate, endDate, bLat, bLng);
        setResult({ pro: false, data: pv.data });
      }
    } catch (e) {
      setError((e && e.message) || (si ? 'දෝෂයක් සිදු විය' : 'Something went wrong'));
    } finally {
      setLoading(false);
    }
  }, [isPro, mode, singleDate, activity, startDate, endDate, birthDate, birthTime, isWedding, partnerDate, partnerTime, bLat, bLng, si]);

  var unlock = function () { Promise.resolve(showPaywall('nakath')).catch(function () {}); };

  var activeMeta = activities.find(function (a) { return a.type === activity; }) || activities[0];

  return (
    <View>
      {/* Activity grid */}
      <Animated.View entering={FadeInDown.duration(400)} style={st.card}>
        <Text style={st.label}>{si ? '1. කුමක් සඳහාද?' : '1. For what?'}</Text>
        <View style={st.grid}>
          {activities.map(function (a) {
            var on = a.type === activity;
            var accent = actAccent(a.type);
            return (
              <TouchableOpacity key={a.type} activeOpacity={0.85} onPress={function () { setActivity(a.type); setResult(null); }}
                style={[
                  st.actChip,
                  // Idle: a whisper of the chip's own color. Selected: full glow.
                  on
                    ? [st.actChipGlow, { borderColor: accent, backgroundColor: accent + '1F', shadowColor: accent }]
                    : { borderColor: accent + '26' },
                ]}>
                <Ionicons name={actIcon(a.type)} size={19} color={on ? accent : accent + '99'} />
                <Text style={[st.actName, on ? { color: accent } : null]} numberOfLines={2}>{si ? a.sinhala : a.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      {/* When — find a day in a range, or the date is fixed and we pick times */}
      <Animated.View entering={FadeInDown.delay(80).duration(400)} style={st.card}>
        <Text style={st.label}>{si ? '2. කවදාද?' : '2. When?'}</Text>
        <View style={st.modeRow}>
          {[
            { key: 'range', icon: 'calendar-outline', si: 'හොඳම දවස සොයන්න', en: 'Find the best day' },
            { key: 'day', icon: 'time-outline', si: 'දිනය තියෙනවා — වේලාව', en: 'Date fixed — get times' },
          ].map(function (m) {
            var on = mode === m.key;
            return (
              <TouchableOpacity key={m.key} activeOpacity={0.85}
                onPress={function () { setMode(m.key); setResult(null); setError(null); }}
                style={[st.modeChip, on ? st.modeChipOn : null]}>
                <Ionicons name={m.icon} size={13} color={on ? '#FFD97A' : 'rgba(255,255,255,0.5)'} />
                <Text style={[st.modeText, on ? { color: '#FFD97A' } : null]} numberOfLines={2}>{si ? m.si : m.en}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {mode === 'range' ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={st.miniLabel}>{si ? 'සිට' : 'From'}</Text>
              <DatePickerField value={startDate} onChange={setStartDate} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.miniLabel}>{si ? 'දක්වා' : 'To'}</Text>
              <DatePickerField value={endDate} onChange={setEndDate} />
            </View>
          </View>
        ) : (
          <View style={{ marginTop: 10 }}>
            <Text style={st.miniLabel}>{si ? (isWedding ? 'උත්සවයේ දිනය' : 'දිනය') : (isWedding ? 'Ceremony date' : 'Date')}</Text>
            <DatePickerField value={singleDate} onChange={setSingleDate} />
            <Text style={st.helpLine}>{si
              ? 'මේ දවසේ සුබ වේලාවන් 2–3ක් සොයා දෙනවා — රාහු කාලය මග හැරලා.'
              : 'We suggest 2–3 auspicious windows on this day — Rahu Kalaya avoided.'}</Text>
          </View>
        )}
      </Animated.View>

      {/* Birth details — personalization (Pro) or an upgrade teaser (free). */}
      <Animated.View entering={FadeInDown.delay(120).duration(400)} style={st.card}>
        <View style={st.birthHead}>
          <Text style={st.label}>{si
            ? (isWedding ? '3. මනාල යුවළගේ උපන් විස්තර' : '3. ඔබේ උපන් විස්තර')
            : (isWedding ? '3. Groom & bride birth details' : '3. Your birth details')}</Text>
          {isPro && birthDate && (!isWedding || partnerDate) ? (
            <View style={st.tunedBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#86EFAC" />
              <Text style={st.tunedText}>{si ? 'කේන්දරයට ගැළපේ' : 'Chart-tuned'}</Text>
            </View>
          ) : null}
        </View>

        {isPro ? (
          <>
            {isWedding ? <Text style={[st.miniLabel, { marginTop: 8 }]}>{si ? 'මනාලයා — උපන් දිනය සහ වේලාව' : 'Groom — birth date & time'}</Text> : null}
            <View style={st.birthRow}>
              <View style={{ flex: 1.35 }}><DatePickerField value={birthDate} onChange={setBirthDate} lang={language} /></View>
              <View style={{ flex: 1 }}><TimePickerField value={birthTime} onChange={setBirthTime} lang={language} /></View>
            </View>
            {isWedding ? (
              <>
                <Text style={[st.miniLabel, { marginTop: 12 }]}>{si ? 'මනාලිය — උපන් දිනය සහ වේලාව' : 'Bride — birth date & time'}</Text>
                <View style={st.birthRow}>
                  <View style={{ flex: 1.35 }}><DatePickerField value={partnerDate} onChange={setPartnerDate} lang={language} /></View>
                  <View style={{ flex: 1 }}><TimePickerField value={partnerTime} onChange={setPartnerTime} lang={language} /></View>
                </View>
                <Text style={st.helpLine}>{si ? 'මනාලයා සහ මනාලිය දෙදෙනාගේම කේන්දරයට ගැළපෙන පොරු නැකත සොයා දෙනවා.' : 'We find the Poruwa time that suits both the groom’s and the bride’s charts.'}</Text>
              </>
            ) : (
              <Text style={st.helpLine}>{si ? 'ඔබේ උපන් නැකතට ගැළපෙන වේලාවන් ලැබේ.' : 'Times are tuned to your birth star.'}</Text>
            )}
          </>
        ) : (
          <TouchableOpacity activeOpacity={0.85} onPress={unlock} style={st.birthLock}>
            <Ionicons name="sparkles" size={15} color="#FFD97A" />
            <Text style={st.birthLockText}>{si
              ? (isWedding ? 'මනාල යුවළගේ නැකත් දෙකටම ගැළපූ පොරු නැකත් වේලාවන්' : 'ඔබේ උපන් නැකතට ගැළපූ පෞද්ගලික වේලාවන්')
              : (isWedding ? 'Poruwa times tuned to both the groom’s & bride’s charts' : 'Times tuned to your birth chart')}</Text>
            <Ionicons name="lock-closed" size={12} color="rgba(255,214,102,0.7)" />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Find button */}
      <TouchableOpacity activeOpacity={0.88} onPress={find} disabled={loading} style={{ marginTop: 6, marginBottom: 8 }}>
        <LinearGradient colors={['#FFD97A', '#FFB800', '#FF8C00']} style={st.findBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          {loading ? <ActivityIndicator color="#2A1707" /> : (
            <>
              <Ionicons name="sparkles" size={16} color="#2A1707" />
              <Text style={st.findBtnText}>{mode === 'day'
                ? (si ? 'සුබ වේලාවන් බලන්න' : 'Show auspicious times')
                : (si ? 'හොඳම නැකැත සොයන්න' : 'Find the best time')}</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {error ? <Text style={st.err}>{error}</Text> : null}

      {/* Results */}
      {result ? (
        <Animated.View entering={FadeInUp.duration(400)} style={st.resultCard}>
          <View style={st.resultHead}>
            <View style={st.resultOrb}>
              <Ionicons name={actIcon(activity)} size={17} color="#FFD97A" />
            </View>
            <Text style={st.resultTitle} numberOfLines={2}>{si ? activeMeta.sinhala : activeMeta.name}</Text>
          </View>

          {result.pro
            ? (result.day
              ? <DayWindowsResult data={result.data} si={si} isWedding={isWedding} />
              : <ProResults data={result.data} si={si} isWedding={isWedding} />)
            : <FreeResult data={result.data} si={si} onUnlock={unlock} dayMode={!!result.day} />}
        </Animated.View>
      ) : null}

      {/* When will it happen — life-event timing */}
      <Animated.View entering={FadeInDown.delay(140).duration(400)} style={[st.card, { marginTop: 18 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="hourglass-outline" size={16} color="#A78BFA" />
          <Text style={st.label2}>{si ? 'කවදා සිදුවේද?' : 'When will it happen?'}</Text>
        </View>
        <Text style={st.miniLabel}>{si ? 'ඔබේ කේන්දරයට අනුව ජීවිත සිදුවීම් වල කාලය' : 'Life-event timing from your chart'}</Text>
        <View style={[st.grid, { marginTop: 10 }]}>
          {LIFE_EVENTS.map(function (e) {
            return (
              <View key={e.key} style={st.eventChip}>
                <Ionicons name={e.icon} size={14} color="#B7A6F0" />
                <Text style={st.eventName} numberOfLines={1}>{si ? e.si : e.en}</Text>
                {/* Lock only for free users — Pro chips are unlocked. */}
                {!isPro ? <Ionicons name="lock-closed" size={11} color="rgba(167,139,250,0.6)" /> : null}
              </View>
            );
          })}
        </View>
        {!isPro ? (
          <TouchableOpacity activeOpacity={0.85} onPress={unlock} style={st.eventCta}>
            <Ionicons name="lock-open-outline" size={13} color="#160E28" />
            <Text style={st.eventCtaText}>{si ? 'ඔබේ ජීවිත කාල සටහන විවෘත කරන්න' : 'Unlock your life timeline'}</Text>
          </TouchableOpacity>
        ) : (
          <ProLifeEvents birthDateTime={joinDateTime(birthDate, birthTime) || (birth && birth.dateTime) || null} bLat={bLat} bLng={bLng} si={si} />
        )}
      </Animated.View>
    </View>
  );
}

/**
 * WhyChips — the justification row. Each factor is a small chip:
 * "Tithi · Dashami ✓". Good factors get a green check, neutral ones a
 * quiet dot — so the user sees WHY this date was chosen, not just that
 * it was.
 */
function WhyChips({ why, si }) {
  if (!Array.isArray(why) || !why.length) return null;
  return (
    <View style={st.whyWrap}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="help-circle-outline" size={13} color="rgba(255,214,102,0.75)" />
        <Text style={st.whyTitle}>{si ? 'ඇයි මේ දවස?' : 'Why this day?'}</Text>
      </View>
      {/* Plain-language first — the technical names are only the reference row. */}
      <Text style={st.whyLine}>{freeWhyLine(why, si)}</Text>
      <Text style={st.techLabel}>{si ? 'තාක්ෂණික සටහන' : 'Technical note'}</Text>
      <View style={st.whyRow}>
        {why.map(function (w, i) {
          var label = FACTOR_LABELS[w.key] ? (si ? FACTOR_LABELS[w.key].si : FACTOR_LABELS[w.key].en) : w.key;
          var value = si && w.key === 'nakshatra' && w.sinhala ? w.sinhala : si && w.key === 'weekday' ? dayNameSi(w.name) : w.name;
          return (
            <View key={i} style={[st.whyChip, w.good ? st.whyChipGood : null]}>
              <Ionicons name={w.good ? 'checkmark-circle' : 'ellipse-outline'} size={11} color={w.good ? '#86EFAC' : 'rgba(255,255,255,0.4)'} />
              <Text style={st.whyChipLabel} numberOfLines={1}>{label}</Text>
              <Text style={st.whyChipName} numberOfLines={1}>{value}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * BreakdownDetail — the Pro justification for ONE time window. Chips for
 * each scored factor (colored by how strongly it contributes) plus any
 * engine warnings. This is the "astrologer's working" behind the score.
 */
/**
 * WindowsList — the 2–3 suggested time windows of one day, chronological.
 * Each row: score badge, start–end, daypart · hora (· lagna). The best
 * window is tagged — "පොරුවට" for weddings (the Poruwa ascent time),
 * "හොඳම" otherwise.
 */
function WindowsList({ windows, si, isWedding }) {
  if (!Array.isArray(windows) || !windows.length) return null;
  var bestIdx = 0;
  windows.forEach(function (w, i) { if ((w.score || 0) > (windows[bestIdx].score || 0)) bestIdx = i; });
  return (
    <View style={{ marginTop: 6 }}>
      {windows.map(function (w, i) {
        var good = (w.score || 0) >= 80;
        var meta = (si ? w.daypart.si : w.daypart.en)
          + ' · ' + (si ? w.hora.sinhala + ' හෝරාව' : w.hora.ruler + ' hora')
          + (w.lagna ? ' · ' + (si ? ((w.lagna.sinhala || w.lagna.name) + ' ලග්නය') : (w.lagna.name + ' lagna')) : '');
        return (
          <View key={i} style={st.twRow}>
            <View style={[st.twBadge, { backgroundColor: good ? '#86EFAC22' : '#E8C56A22', borderColor: good ? '#86EFAC55' : '#E8C56A55' }]}>
              <Text style={[st.twBadgeText, { color: good ? '#86EFAC' : '#E8C56A' }]}>{w.score}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.twTime} numberOfLines={1}>{w.startDisplay + ' – ' + w.endDisplay}</Text>
              <Text style={st.twMeta} numberOfLines={1}>{meta}</Text>
            </View>
            {i === bestIdx ? (
              <View style={st.bestTag}>
                <Text style={st.bestTagText}>{isWedding ? (si ? 'පොරුවට' : 'Poruwa') : (si ? 'හොඳම' : 'Best')}</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/**
 * AvoidLines — the day's inauspicious periods (Rahu Kalaya first) as red
 * "don't book this slot" rows, so the suggested windows carry their proof.
 */
function AvoidLines({ avoid, si, highOnly }) {
  var list = Array.isArray(avoid) ? (highOnly ? avoid.filter(function (p) { return p.severity === 'High'; }) : avoid) : [];
  if (!list.length) return null;
  return (
    <View style={st.avoidWrap}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="warning-outline" size={13} color="#FCA5A5" />
        <Text style={st.avoidTitle}>{si ? 'මේ වේලාවන් වළකින්න' : 'Avoid these times'}</Text>
      </View>
      <View style={{ marginTop: 5, gap: 4 }}>
        {list.map(function (p, i) {
          var hi = p.severity === 'High';
          return (
            <View key={i} style={st.plainRow}>
              <Ionicons name={hi ? 'close-circle' : 'remove-circle-outline'} size={12}
                color={hi ? '#FCA5A5' : 'rgba(252,165,165,0.55)'} style={{ marginTop: 2.5 }} />
              <Text style={[st.plainText, hi ? { color: 'rgba(252,165,165,0.92)' } : null]}>
                {(si ? p.sinhala : p.name) + ': ' + p.startDisplay + ' – ' + p.endDisplay}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * DayWindowsResult — Pro "the date is fixed" answer: that day's quality,
 * 2–3 suggested windows (Rahu Kalaya always dodged), the avoid list, and
 * the expandable astrologer's working for the day.
 */
function DayWindowsResult({ data, si, isWedding }) {
  var [openWhy, setOpenWhy] = useState(false);
  if (!data) return null;
  var day = data.day;
  return (
    <View>
      <Text style={st.bestLabel}>{isWedding
        ? (si ? 'පොරු නැකත — සුබ වේලාවන්' : 'Poruwa — best time windows')
        : (si ? 'දවසේ සුබ වේලාවන්' : 'Best times this day')}</Text>
      <Text style={st.bestDate}>{fmtDay(data.date, si)}</Text>
      {day ? (
        <View style={st.qualityRow}>
          <View style={st.qualityPill}><Text style={st.qualityText}>{qualityWord(day.quality, si)}</Text></View>
          <Text style={st.candidates} numberOfLines={1}>{si ? ('ලකුණු ' + day.score + '/100') : ('Score ' + day.score + '/100')}</Text>
        </View>
      ) : null}
      {data.noWindows ? (
        <Text style={[st.noGood, { marginTop: 12 }]}>{si
          ? 'මේ දවසේ අශුභ කාල මග හැරලා පිරිසිදු වේලාවක් හොයාගන්න බැරි වුණා — වෙනත් දිනයක් බලන්න.'
          : 'No clean window clears this day’s inauspicious periods — try another date.'}</Text>
      ) : (
        <WindowsList windows={data.windows} si={si} isWedding={isWedding} />
      )}
      <AvoidLines avoid={data.avoid} si={si} />
      {day ? (
        <>
          <TouchableOpacity activeOpacity={0.8} style={st.whyToggle}
            onPress={function () {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setOpenWhy(!openWhy);
            }}>
            <Text style={st.whyTitle}>{si ? 'ඇයි මේ දවස මෙහෙමද?' : 'Why does this day score so?'}</Text>
            <Ionicons name={openWhy ? 'chevron-up' : 'chevron-down'} size={14} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
          {openWhy ? <BreakdownDetail bd={day.breakdown} warnings={day.warnings} si={si} direction={day.direction} flat /> : null}
        </>
      ) : null}
    </View>
  );
}

function BreakdownDetail({ bd, warnings, si, direction, flat }) {
  if (!bd) return null;
  var chips = [];
  var push = function (key, name, score, max) {
    if (!name && name !== 0) return;
    var label = FACTOR_LABELS[key] ? (si ? FACTOR_LABELS[key].si : FACTOR_LABELS[key].en) : key;
    chips.push({ label: label, name: String(name), ratio: max ? (score || 0) / max : 1 });
  };
  if (bd.tithi) push('tithi', bd.tithi.name, bd.tithi.score, bd.tithi.max);
  if (bd.nakshatra) push('nakshatra', (si && bd.nakshatra.sinhala) || bd.nakshatra.name, bd.nakshatra.score, bd.nakshatra.max);
  if (bd.weekday) push('weekday', si ? dayNameSi(bd.weekday.day) : bd.weekday.day, bd.weekday.score, bd.weekday.max);
  if (bd.yoga) push('yoga', bd.yoga.name, bd.yoga.score, bd.yoga.max);
  if (bd.tarabala) {
    // Dual = wedding (both partners). Show both stars, colored by the pair's
    // combined score; the warnings list names whichever side is weak.
    var tName = bd.tarabala.dual
      ? bd.tarabala.name + ' / ' + bd.tarabala.partnerName
      : bd.tarabala.name + (bd.tarabala.quality ? ' (' + bd.tarabala.quality + ')' : '');
    push('tarabala', tName, bd.tarabala.dual ? bd.tarabala.combined : bd.tarabala.score, bd.tarabala.max);
  }
  if (bd.chandrabala) {
    var cName = bd.chandrabala.dual
      ? (si ? bd.chandrabala.house + '/' + bd.chandrabala.partnerHouse + ' භාව' : 'houses ' + bd.chandrabala.house + '/' + bd.chandrabala.partnerHouse)
      : (si ? bd.chandrabala.house + ' වන භාවය' : 'house ' + bd.chandrabala.house) + (bd.chandrabala.quality ? ' (' + bd.chandrabala.quality + ')' : '');
    push('chandrabala', cName, bd.chandrabala.dual ? bd.chandrabala.combined : bd.chandrabala.score, bd.chandrabala.max);
  }
  if (bd.lagnaStrength && bd.lagnaStrength.lagna) push('lagna', (si && bd.lagnaStrength.lagnaSinhala) || bd.lagnaStrength.lagna, bd.lagnaStrength.score, bd.lagnaStrength.max);

  // Plain-language sentences derived from the same breakdown — these lead;
  // the raw technical chips become a quiet reference row underneath.
  var lines = plainLines(bd, si);
  var toneColor = { good: '#86EFAC', ok: '#E8C56A', bad: '#FCA5A5' };

  return (
    <View style={[st.bdWrap, flat ? st.bdWrapFlat : null]}>
      <Text style={st.whyTitle}>{si ? 'ඇයි මේ වේලාව?' : 'Why this time?'}</Text>
      {lines.length ? <Text style={st.plainSummary}>{summaryLine(lines, si)}</Text> : null}
      <View style={{ marginTop: 6, gap: 5 }}>
        {lines.map(function (l, i) {
          return (
            <View key={i} style={st.plainRow}>
              <View style={[st.bdDot, { backgroundColor: toneColor[l.tone] || '#E8C56A', marginTop: 5 }]} />
              <Text style={st.plainText}>{l.text}</Text>
            </View>
          );
        })}
      </View>
      {/* Direction of the day — going out & coming in (Disha Shoola). */}
      {direction && direction.best ? (
        <View style={st.dirWrap}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="compass-outline" size={13} color="#7DD3FC" />
            <Text style={st.dirTitle}>{si ? 'දවසේ සුබ දිශාව' : 'Direction of the day'}</Text>
          </View>
          <View style={{ marginTop: 5, gap: 4 }}>
            {directionLines(direction, si).map(function (l, i) {
              return (
                <View key={i} style={st.plainRow}>
                  <Ionicons
                    name={l.tone === 'bad' ? 'close-circle' : 'checkmark-circle'}
                    size={12}
                    color={l.tone === 'bad' ? '#FCA5A5' : '#86EFAC'}
                    style={{ marginTop: 2.5 }}
                  />
                  <Text style={st.plainText}>{l.text}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
      {Array.isArray(warnings) && warnings.length ? (
        <View style={{ marginTop: 8, gap: 4 }}>
          {warnings.slice(0, 3).map(function (w, i) {
            return (
              <View key={i} style={st.warnRow}>
                <Ionicons name="alert-circle-outline" size={12} color="#FCA5A5" />
                <Text style={st.warnText}>{mapWarning(w, si)}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
      <Text style={st.techLabel}>{si ? 'තාක්ෂණික සටහන' : 'Technical note'}</Text>
      <View style={st.whyRow}>
        {chips.map(function (c, i) {
          var col = ratioColor(c.ratio);
          return (
            <View key={i} style={[st.bdChip, { borderColor: col + '55' }]}>
              <View style={[st.bdDot, { backgroundColor: col }]} />
              <Text style={st.whyChipLabel} numberOfLines={1}>{c.label}</Text>
              <Text style={[st.whyChipName, { color: col }]} numberOfLines={1}>{c.name}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function FreeResult({ data, si, onUnlock, dayMode }) {
  if (!data || data.noGoodDate || !data.bestDay) {
    return <Text style={st.noGood}>{dayMode
      ? (si ? 'මේ දවස මේ කටයුත්තට එතරම් සුබ නැහැ — වෙනත් දිනයක් බලන්න, නැත්නම් "හොඳම දවස සොයන්න" මාදිලියෙන් අවට හොඳම දවස සොයන්න.' : 'This day isn’t strong for this — try another date, or switch to “Find the best day”.')
      : (si ? 'මෙම කාලය තුළ හොඳ නැකැතක් හමු නොවීය. පරාසය පුළුල් කරන්න.' : 'No strong day found in this range — try a wider range.')}</Text>;
  }
  return (
    <View>
      <Text style={st.bestLabel}>{dayMode ? (si ? 'තෝරාගත් දිනය' : 'Your chosen day') : (si ? 'හොඳම දවස' : 'Best day')}</Text>
      <Text style={st.bestDate}>{fmtDay(data.bestDay.date, si)}</Text>
      <View style={st.qualityRow}>
        <View style={st.qualityPill}><Text style={st.qualityText}>{qualityWord(data.bestDay.quality, si)}</Text></View>
        <Text style={st.candidates} numberOfLines={1}>{dayMode
          ? (si ? 'සුබ වේලාවන් 2–3ක් හමු විය' : '2–3 time windows found')
          : ((si ? 'තවත් හොඳ දින ' : '') + (data.lockedWindowCount || 0) + (si ? 'ක්' : ' good days'))}</Text>
      </View>

      {/* WHY this day — the justification */}
      <WhyChips why={data.bestDay.why} si={si} />

      {/* Locked exact time */}
      <TouchableOpacity activeOpacity={0.85} onPress={onUnlock} style={st.lockedTime}>
        <Ionicons name="time-outline" size={15} color="#FFD666" />
        <Text style={st.lockedTimeText}>{si ? 'සුබ වේලාවන් 2–3ක් + රාහු කාලයෙන් වැළකීම + සුබ දිශාව' : '2–3 exact windows + Rahu Kalaya avoided + best direction'}</Text>
        <Ionicons name="lock-closed" size={12} color="rgba(255,214,102,0.7)" />
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.85} onPress={onUnlock} style={st.unlockCta}>
        <Text style={st.unlockCtaText}>{si ? 'වේලාව සහ දිශාව විවෘත කරන්න' : 'Unlock exact times & directions'}</Text>
        <Ionicons name="arrow-forward" size={14} color="#2A1707" />
      </TouchableOpacity>
    </View>
  );
}

function ProResults({ data, si, isWedding }) {
  var [openIdx, setOpenIdx] = useState(0); // first window's working shown by default
  if (!data || data.noGoodDate || !(data.results && data.results.length)) {
    return <Text style={st.noGood}>{si ? 'මෙම කාලය තුළ හොඳ නැකැතක් හමු නොවීය.' : 'No strong window found in this range.'}</Text>;
  }
  return (
    <View>
      <Text style={st.bestLabel}>{si ? 'හොඳම දින සහ වේලාවන්' : 'Best days & times'}</Text>
      {data.results.map(function (r, i) {
        var open = openIdx === i;
        // Each result day now carries 2–3 concrete windows; the headline shows
        // the strongest one as a range, falling back to the legacy single time.
        var tws = Array.isArray(r.timeWindows) && r.timeWindows.length ? r.timeWindows : null;
        var bestW = tws ? tws.reduce(function (a, b) { return (b.score || 0) > (a.score || 0) ? b : a; }) : null;
        return (
          <View key={i}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={function () {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setOpenIdx(open ? -1 : i);
              }}
              style={st.window}
            >
              <View style={[st.winScore, { backgroundColor: r.score >= 80 ? '#86EFAC22' : '#E8C56A22', borderColor: r.score >= 80 ? '#86EFAC55' : '#E8C56A55' }]}>
                <Text style={[st.winScoreText, { color: r.score >= 80 ? '#86EFAC' : '#E8C56A' }]}>{r.score}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.winDate} numberOfLines={1}>{fmtDay(r.dateTime.slice(0, 10), si)}</Text>
                <Text style={st.winTime} numberOfLines={1}>{(bestW ? bestW.startDisplay + ' – ' + bestW.endDisplay : fmtTime(r.dateTime)) + ' · ' + qualityWord(r.quality, si)}</Text>
              </View>
              <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
            {open ? (
              <View>
                {tws ? (
                  <View style={st.twIndent}>
                    <Text style={st.twHead}>{si ? 'මේ දවසේ සුබ වේලාවන්' : 'Times on this day'}</Text>
                    <WindowsList windows={tws} si={si} isWedding={isWedding} />
                    <AvoidLines avoid={r.avoid} si={si} highOnly />
                  </View>
                ) : null}
                <BreakdownDetail bd={r.breakdown} warnings={r.warnings} si={si} direction={r.direction} />
              </View>
            ) : null}
          </View>
        );
      })}
      <Text style={st.tapHint}>{si ? 'හේතුව බලන්න වේලාවක් ඔබන්න' : 'Tap a day to see its times & why'}</Text>
    </View>
  );
}

function ProLifeEvents({ birthDateTime, bLat, bLng, si }) {
  var [state, setState] = useState({ loading: false, data: null, err: null });
  useEffect(function () {
    if (!birthDateTime) { setState({ loading: false, data: null, err: 'nobirth' }); return; }
    var cancelled = false;
    setState({ loading: true, data: null, err: null });
    api.getLifeEventTiming(birthDateTime, null, bLat, bLng)
      .then(function (res) { if (!cancelled) setState({ loading: false, data: res.data, err: null }); })
      .catch(function (e) { if (!cancelled) setState({ loading: false, data: null, err: (e && e.message) || 'err' }); });
    return function () { cancelled = true; };
  }, [birthDateTime, bLat, bLng]);

  if (state.err === 'nobirth') return <Text style={[st.miniLabel, { marginTop: 10 }]}>{si ? 'උඩ "උපන් විස්තර" කොටසේ ඔබේ උපන් දිනය පුරවන්න — එවිට ඔබේ ජීවිත සිදුවීම් කාල මෙතැන පෙනේවි.' : 'Fill your birth details above to see your life-event timing here.'}</Text>;
  if (state.loading) return <ActivityIndicator color="#A78BFA" style={{ marginTop: 12 }} />;
  if (!state.data) return null;

  // The server (predictAllEvents) sends { events: <object by type>,
  // timeline10Year: <array> } — the array is the renderable list, and it
  // lives under `timeline10Year` (NOT `timeline`: that field never existed,
  // which is why every Pro user saw "no windows found"). `events` is an
  // object keyed by type, so it can never satisfy Array.isArray; the other
  // names are kept only as defensive fallbacks.
  var events = Array.isArray(state.data.timeline10Year) ? state.data.timeline10Year
    : Array.isArray(state.data.timeline) ? state.data.timeline
    : Array.isArray(state.data.predictions) ? state.data.predictions : [];
  if (!events.length) {
    return <Text style={[st.miniLabel, { marginTop: 10 }]}>{si ? 'ඉදිරි වසර 10 තුළ ප්‍රබල කාල රාමු හමු නොවුණා.' : 'No strong windows found in the next 10 years.'}</Text>;
  }
  return (
    <View style={{ marginTop: 10 }}>
      {events.slice(0, 6).map(function (ev, i) {
        var label = (si ? (ev.eventSinhala || ev.eventName) : ev.eventName) || ev.name || ev.event || ev.type || '';
        // Year range reads plainly: "2027–2029" (single year stays single).
        var y1 = ev.start ? String(ev.start).slice(0, 4) : '';
        var y2 = ev.end ? String(ev.end).slice(0, 4) : '';
        var when = y1 ? (y2 && y2 !== y1 ? y1 + '–' + y2 : y1) : String(ev.window || ev.timing || ev.ageRange || '');
        return (
          <View key={i} style={st.evRow}>
            <Ionicons name="ellipse" size={7} color={ev.isDanger ? '#FCA5A5' : '#A78BFA'} />
            <Text style={st.evLabel} numberOfLines={2}>{label}</Text>
            <Text style={st.evWhen} numberOfLines={1}>{when}</Text>
          </View>
        );
      })}
    </View>
  );
}

var st = StyleSheet.create({
  card: { borderRadius: 16, padding: 14, marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.14)' },
  label: { fontSize: 13, fontWeight: '800', color: '#FFD97A', letterSpacing: 0.3 },
  label2: { fontSize: 14, fontWeight: '800', color: '#C4B5FD' },
  miniLabel: { fontSize: 11, color: 'rgba(255,255,255,0.62)', marginTop: 2, marginBottom: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  actChip: { width: '31%', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  // Selected-chip glow — the color itself comes from the activity's accent
  // (borderColor/backgroundColor/shadowColor are set inline per chip).
  actChipGlow: { shadowOpacity: 0.55, shadowRadius: 9, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  // Two centered lines with reserved height — server Sinhala names run long
  // ("ශල්‍ය කර්මය / වෛද්‍ය ක්‍රියාමාර්ග") and one line cropped them to "…".
  // Fixed height keeps every chip in the 3-col grid the same size.
  actName: { fontSize: 10.5, lineHeight: 14, height: 28, fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginTop: 6, maxWidth: '100%', textAlign: 'center', textAlignVertical: 'center' },
  // Mode toggle — find a day (range) vs date fixed (single day → times)
  modeRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  modeChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 8, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  modeChipOn: { borderColor: '#FFB800', backgroundColor: 'rgba(255,184,0,0.12)' },
  modeText: { fontSize: 10.5, lineHeight: 14, fontWeight: '800', color: 'rgba(255,255,255,0.6)', flexShrink: 1, textAlign: 'center' },
  // Birth-details card
  birthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  birthRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  tunedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9, backgroundColor: 'rgba(134,239,172,0.12)', borderWidth: 1, borderColor: 'rgba(134,239,172,0.35)' },
  tunedText: { fontSize: 10, fontWeight: '800', color: '#86EFAC', letterSpacing: 0.2 },
  helpLine: { fontSize: 11, color: 'rgba(255,255,255,0.62)', marginTop: 9, lineHeight: 16 },
  birthLock: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 10, paddingVertical: 12, paddingHorizontal: 13, borderRadius: 12, backgroundColor: 'rgba(255,214,102,0.07)', borderWidth: 1, borderColor: 'rgba(255,214,102,0.22)' },
  birthLockText: { flex: 1, fontSize: 12.5, fontWeight: '700', color: 'rgba(255,240,208,0.9)' },
  findBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14 },
  findBtnText: { fontSize: 15, fontWeight: '900', color: '#2A1707', letterSpacing: 0.3 },
  err: { color: '#FCA5A5', fontSize: 13, textAlign: 'center', marginVertical: 8 },
  resultCard: { borderRadius: 18, padding: 16, marginTop: 4, backgroundColor: 'rgba(255,184,0,0.05)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.2)' },
  resultHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  resultOrb: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,184,0,0.12)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.3)' },
  resultTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: '#FFF1D0' },
  bestLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: 'rgba(255,214,102,0.7)', marginBottom: 4 },
  bestDate: { fontSize: 20, fontWeight: '900', color: '#FFF8E0' },
  qualityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  qualityPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(134,239,172,0.14)', borderWidth: 1, borderColor: 'rgba(134,239,172,0.4)' },
  qualityText: { fontSize: 12, fontWeight: '800', color: '#86EFAC' },
  candidates: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.68)' },

  // Why-this-day (free justification)
  whyWrap: { marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,214,102,0.14)' },
  whyTitle: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.5, color: 'rgba(255,214,102,0.85)' },
  whyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  whyChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', maxWidth: '100%' },
  whyChipGood: { borderColor: 'rgba(134,239,172,0.35)', backgroundColor: 'rgba(134,239,172,0.06)' },
  whyChipLabel: { fontSize: 10.5, fontWeight: '700', color: 'rgba(255,255,255,0.62)', flexShrink: 1 },
  whyChipName: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.88)', flexShrink: 1 },
  whyLine: { fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 8, lineHeight: 18 },
  // Plain-language explanation rows (lead content; tech chips follow)
  plainSummary: { fontSize: 12, fontWeight: '700', color: 'rgba(255,240,208,0.9)', marginTop: 7, lineHeight: 17 },
  plainRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  plainText: { flex: 1, fontSize: 11.5, color: 'rgba(255,255,255,0.7)', lineHeight: 17 },
  techLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginTop: 11 },
  // Direction-of-the-day block (Disha Shoola)
  dirWrap: { marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: 'rgba(125,211,252,0.05)', borderWidth: 1, borderColor: 'rgba(125,211,252,0.18)' },
  dirTitle: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.3, color: 'rgba(125,211,252,0.9)' },

  // Suggested time-window rows (2–3 per day, Rahu Kalaya dodged)
  twRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  twBadge: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  twBadgeText: { fontSize: 13, fontWeight: '900' },
  twTime: { fontSize: 14.5, fontWeight: '800', color: '#FFF1D0' },
  twMeta: { fontSize: 11, color: 'rgba(255,255,255,0.68)', marginTop: 1 },
  bestTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,184,0,0.15)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.45)' },
  bestTagText: { fontSize: 10, fontWeight: '900', color: '#FFD97A', letterSpacing: 0.3 },
  twIndent: { marginLeft: 52, marginBottom: 8 },
  twHead: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: 'rgba(255,214,102,0.75)' },
  // Avoid-these-times block (Rahu / Gulika / Yamaghanta)
  avoidWrap: { marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: 'rgba(252,165,165,0.05)', borderWidth: 1, borderColor: 'rgba(252,165,165,0.18)' },
  avoidTitle: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.3, color: 'rgba(252,165,165,0.9)' },
  whyToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingVertical: 6 },

  // Pro per-window breakdown
  bdWrap: { marginLeft: 52, marginBottom: 8, padding: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.025)', borderWidth: 1, borderColor: 'rgba(255,214,102,0.1)' },
  bdWrapFlat: { marginLeft: 0, marginTop: 4 },
  bdChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, maxWidth: '100%' },
  bdDot: { width: 6, height: 6, borderRadius: 3 },
  warnRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  warnText: { flex: 1, fontSize: 10.5, color: 'rgba(252,165,165,0.85)', lineHeight: 15 },
  tapHint: { fontSize: 10.5, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginTop: 8 },

  lockedTime: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingVertical: 11, paddingHorizontal: 13, borderRadius: 12, backgroundColor: 'rgba(255,214,102,0.08)', borderWidth: 1, borderColor: 'rgba(255,214,102,0.25)' },
  lockedTimeText: { flex: 1, fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  unlockCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: '#FFB800' },
  unlockCtaText: { fontSize: 13, fontWeight: '800', color: '#2A1707', flexShrink: 1, textAlign: 'center' },
  noGood: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 19 },
  window: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  winScore: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  winScoreText: { fontSize: 15, fontWeight: '900' },
  winDate: { fontSize: 14, fontWeight: '800', color: '#FFF1D0' },
  winTime: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  eventChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 11, backgroundColor: 'rgba(167,139,250,0.08)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.22)', maxWidth: '100%' },
  eventName: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.82)', flexShrink: 1 },
  eventCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, paddingVertical: 11, borderRadius: 12, backgroundColor: '#A78BFA' },
  eventCtaText: { fontSize: 12.5, fontWeight: '800', color: '#160E28', flexShrink: 1, textAlign: 'center' },
  evRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  evLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  evWhen: { fontSize: 12, fontWeight: '700', color: '#C4B5FD', maxWidth: '45%' },
});
