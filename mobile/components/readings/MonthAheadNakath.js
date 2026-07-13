/**
 * MonthAheadNakath — the next 30 days at a glance.
 *
 * One compact row per day: the day's Rahu Kalaya (to avoid), its best time
 * (Abhijit Muhurtha), and the real moonrise. Generic date+location math served
 * free from /api/nakath/month-ahead — the chart-tuned activity finder in
 * NakathPlanner stays the Pro upsell.
 *
 * Location follows the user's birth place when available (falls back to
 * Colombo). No emoji — Ionicons only.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

var WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var WEEKDAYS_SI = ['ඉරිදා', 'සඳුදා', 'අඟහ', 'බදාදා', 'බ්‍රහස්', 'සිකු', 'සෙන'];
var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function timeStr(formatted) {
  return formatted && formatted.display ? formatted.display : '--:--';
}
function dayNumMon(civilDate) {
  // civilDate is 'YYYY-MM-DD'
  try {
    var parts = civilDate.split('-');
    return { d: parseInt(parts[2], 10), m: MONTHS[parseInt(parts[1], 10) - 1] };
  } catch (e) { return { d: '', m: '' }; }
}

function DayRow({ day, si, isToday, index, onUnlock }) {
  var wk = si ? WEEKDAYS_SI[day.weekday] : WEEKDAYS_EN[day.weekday];
  var dm = dayNumMon(day.civilDate);
  var rahu = day.rahuKalaya;
  var best = day.bestTime;

  // beyond the free 10-day window — a named lock, not a hidden row
  if (day.locked) {
    var tithiName = day.tithi ? (si ? (day.tithi.sinhala || day.tithi.name) : day.tithi.name) : null;
    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 12) * 30).duration(320)}>
        <TouchableOpacity activeOpacity={0.85} onPress={onUnlock} style={[mn.row, mn.rowLocked]}>
          <View style={mn.dateCol}>
            <Text style={mn.weekday}>{wk}</Text>
            <Text style={[mn.dayNum, { color: 'rgba(255,241,208,0.45)' }]}>{dm.d}</Text>
            <Text style={mn.monTxt}>{dm.m}</Text>
          </View>
          <View style={mn.winCol}>
            <View style={mn.lockPill}>
              <Ionicons name="lock-closed" size={12} color="rgba(255,217,131,0.75)" />
              <Text style={mn.lockText} numberOfLines={2}>
                {si ? 'හොඳම වේලාව සහ රාහු කාලය' : 'Best time & Rahu Kalaya'}
              </Text>
              <View style={mn.proBadge}><Text style={mn.proBadgeText}>PRO</Text></View>
            </View>
            {tithiName ? (
              <View style={mn.moonRow}>
                <Ionicons name="sparkles-outline" size={11} color="rgba(200,210,235,0.6)" />
                <Text style={mn.moonTxt}>{(si ? 'තිථිය · ' : 'Tithi · ') + tithiName}</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 12) * 30).duration(320)} style={[mn.row, isToday ? mn.rowToday : null]}>
      {/* date column */}
      <View style={mn.dateCol}>
        <Text style={mn.weekday}>{wk}</Text>
        <Text style={mn.dayNum}>{dm.d}</Text>
        <Text style={mn.monTxt}>{dm.m}</Text>
        {isToday ? <View style={mn.todayPill}><Text style={mn.todayTxt}>{si ? 'අද' : 'TODAY'}</Text></View> : null}
      </View>

      {/* windows column */}
      <View style={mn.winCol}>
        {/* best time */}
        <View style={[mn.winPill, mn.bestPill]}>
          <Ionicons name="sparkles" size={12} color="#FFD97A" />
          <Text style={mn.winLabel}>{si ? 'සුබ' : 'Best'}</Text>
          <Text style={mn.winTime} numberOfLines={1}>
            {best ? (timeStr(best.startFormatted) + ' – ' + timeStr(best.endFormatted)) : (si ? 'නැත' : '—')}
          </Text>
        </View>
        {/* rahu kalaya */}
        <View style={[mn.winPill, mn.rahuPill]}>
          <Ionicons name="warning" size={12} color="#FCA5A5" />
          <Text style={[mn.winLabel, { color: 'rgba(252,165,165,0.9)' }]}>{si ? 'රාහු' : 'Rahu'}</Text>
          <Text style={[mn.winTime, { color: 'rgba(252,165,165,0.95)' }]} numberOfLines={1}>
            {rahu ? (timeStr(rahu.startFormatted) + ' – ' + timeStr(rahu.endFormatted)) : (si ? 'නැත' : '—')}
          </Text>
        </View>
        {/* moonrise — the honest lunar time */}
        {day.moonriseFormatted ? (
          <View style={mn.moonRow}>
            <Ionicons name="moon-outline" size={11} color="rgba(200,210,235,0.75)" />
            <Text style={mn.moonTxt}>{(si ? 'සඳ උදාව ' : 'Moonrise ') + timeStr(day.moonriseFormatted)}</Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

export default function MonthAheadNakath() {
  var { language } = useLanguage();
  var { user, showPaywall } = useAuth();
  var si = language === 'si';

  var birth = user && user.birthData ? user.birthData : null;
  var bLat = birth && birth.lat ? birth.lat : 6.9271;
  var bLng = birth && birth.lng ? birth.lng : 79.8612;

  var [days, setDays] = useState(null);
  var [lockedDays, setLockedDays] = useState(0);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);
  var [expanded, setExpanded] = useState(false);

  var load = useCallback(function () {
    setLoading(true); setError(null);
    api.getMonthAheadNakath(30, bLat, bLng)
      .then(function (res) {
        if (res && res.success && res.data && Array.isArray(res.data.days)) {
          setDays(res.data.days);
          setLockedDays(res.data.lockedDays || 0);
        } else {
          setError(si ? 'දත්ත ලබා ගත නොහැක' : 'Could not load the month ahead');
        }
      })
      .catch(function (e) { setError((e && e.message) || (si ? 'දෝෂයක් සිදු විය' : 'Something went wrong')); })
      .finally(function () { setLoading(false); });
  }, [bLat, bLng, si]);

  useEffect(function () { load(); }, [load]);

  var unlock = useCallback(function () {
    Promise.resolve(showPaywall && showPaywall('nakath')).catch(function () {});
  }, [showPaywall]);

  var visible = days ? (expanded ? days : days.slice(0, 10)) : [];
  // today on the Sri Lanka clock (matches the server's civilDate)
  var todayISO = new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);

  return (
    <View style={mn.wrap}>
      <View style={mn.head}>
        <View style={mn.headOrb}><Ionicons name="calendar" size={16} color="#FFD97A" /></View>
        <View style={{ flex: 1 }}>
          <Text style={mn.title}>{si ? 'ඉදිරි මාසය' : 'Month ahead'}</Text>
          <Text style={mn.sub}>{si ? 'දිනපතා රාහු කාලය සහ හොඳම වේලාව' : 'Each day\'s Rahu Kalaya & best time'}</Text>
        </View>
      </View>

      {loading ? (
        <View style={mn.center}><ActivityIndicator color="#FFD97A" /></View>
      ) : error ? (
        <View style={mn.center}>
          <Text style={mn.err}>{error}</Text>
          <TouchableOpacity onPress={load} style={mn.retry}><Text style={mn.retryTxt}>{si ? 'නැවත උත්සාහ කරන්න' : 'Retry'}</Text></TouchableOpacity>
        </View>
      ) : (
        <View>
          {visible.map(function (d, i) {
            return <DayRow key={d.civilDate || i} day={d} si={si} isToday={d.civilDate === todayISO} index={i} onUnlock={unlock} />;
          })}
          {days && days.length > 10 ? (
            <TouchableOpacity activeOpacity={0.85} onPress={function () { setExpanded(!expanded); }} style={mn.moreBtn}>
              <Text style={mn.moreTxt}>
                {expanded ? (si ? 'අඩුවෙන් පෙන්වන්න' : 'Show less') : (si ? 'මුළු දින 30ම බලන්න' : 'Show all 30 days')}
              </Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="#FFD97A" />
            </TouchableOpacity>
          ) : null}
          {expanded && lockedDays > 0 ? (
            <TouchableOpacity activeOpacity={0.88} onPress={unlock} style={mn.unlockBtn}>
              <Ionicons name="lock-open-outline" size={14} color="#2A1707" />
              <Text style={mn.unlockBtnText}>
                {si ? 'ඉතිරි දින ' + lockedDays + ' විවෘත කරන්න' : 'Unlock the remaining ' + lockedDays + ' days'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}

var mn = StyleSheet.create({
  wrap: { borderRadius: 16, padding: 14, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.14)' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  headOrb: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,184,0,0.10)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.28)' },
  title: { fontSize: 16, fontWeight: '900', color: '#F5E6C8' },
  sub: { fontSize: 11.5, color: 'rgba(245,230,200,0.55)', marginTop: 1 },

  center: { paddingVertical: 26, alignItems: 'center', gap: 12 },
  err: { color: '#FCA5A5', fontSize: 13, textAlign: 'center' },
  retry: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,184,0,0.35)' },
  retryTxt: { color: '#FFD97A', fontSize: 12.5, fontWeight: '800' },

  row: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  rowToday: { backgroundColor: 'rgba(255,184,0,0.05)', borderRadius: 10, paddingHorizontal: 8, marginHorizontal: -8, borderTopColor: 'transparent' },
  dateCol: { width: 46, alignItems: 'center' },
  weekday: { fontSize: 10.5, fontWeight: '800', color: 'rgba(245,230,200,0.6)', letterSpacing: 0.3 },
  dayNum: { fontSize: 20, fontWeight: '900', color: '#FFF1D0', lineHeight: 23 },
  monTxt: { fontSize: 9.5, fontWeight: '700', color: 'rgba(245,230,200,0.4)' },
  todayPill: { marginTop: 3, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: 'rgba(255,184,0,0.16)' },
  todayTxt: { fontSize: 8, fontWeight: '900', color: '#FFD97A', letterSpacing: 0.4 },

  winCol: { flex: 1, gap: 6, justifyContent: 'center' },
  winPill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, borderWidth: 1 },
  bestPill: { backgroundColor: 'rgba(255,214,102,0.07)', borderColor: 'rgba(255,214,102,0.22)' },
  rahuPill: { backgroundColor: 'rgba(252,120,120,0.06)', borderColor: 'rgba(252,120,120,0.22)' },
  winLabel: { fontSize: 10.5, fontWeight: '800', color: 'rgba(255,214,102,0.9)', width: 30 },
  winTime: { flex: 1, fontSize: 12.5, fontWeight: '800', color: '#FFF1D0', fontVariant: ['tabular-nums'] },
  moonRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 3, marginTop: 1 },
  moonTxt: { fontSize: 10.5, fontWeight: '700', color: 'rgba(200,210,235,0.7)', fontVariant: ['tabular-nums'] },

  moreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 11, borderRadius: 11, backgroundColor: 'rgba(255,184,0,0.07)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.2)' },
  moreTxt: { fontSize: 12.5, fontWeight: '800', color: '#FFD97A' },

  // locked rows (beyond the free 10-day window)
  rowLocked: { opacity: 0.92 },
  lockPill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9, borderWidth: 1, backgroundColor: 'rgba(255,217,131,0.045)', borderColor: 'rgba(255,217,131,0.18)', borderStyle: 'dashed' },
  lockText: { flex: 1, fontSize: 11.5, fontWeight: '700', color: 'rgba(244,238,223,0.55)' },
  proBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(255,184,0,0.16)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.35)' },
  proBadgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.6, color: '#FFD97A' },
  unlockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, paddingVertical: 12, borderRadius: 12, backgroundColor: '#FFB800' },
  unlockBtnText: { fontSize: 13, fontWeight: '800', color: '#2A1707' },
});
