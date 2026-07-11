/**
 * Subha Nakath Planner (සුබ නැකැත්) — the timing utility.
 *
 * Pick an activity + a date range → the best auspicious day/time.
 *   Free : the best DAY (date + quality) is shown; the exact time is locked.
 *   Pro  : exact time windows, tuned to the user's chart.
 * Plus a "When will it happen?" life-event section (locked for free).
 *
 * Reachable via router.push('/nakath') from Home.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { DatePickerField } from '../../components/CosmicDateTimePicker';
import { CosmicBackground } from '../../components/CosmicBackground';
import useScreenInsets from '../../hooks/useScreenInsets';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

// Fallback activity list (in engine-key order) if the API list can't load.
var FALLBACK_ACTIVITIES = [
  { type: 'wedding', name: 'Wedding', sinhala: 'විවාහය', icon: '💒' },
  { type: 'business', name: 'Business Start', sinhala: 'ව්‍යාපාරය', icon: '🏢' },
  { type: 'education', name: 'Exam / Study', sinhala: 'විභාගය', icon: '📚' },
  { type: 'travel', name: 'Journey', sinhala: 'ගමන', icon: '✈️' },
  { type: 'vehicle', name: 'New Vehicle', sinhala: 'වාහනය', icon: '🚗' },
  { type: 'movingIn', name: 'Moving In', sinhala: 'නිවස', icon: '🏡' },
  { type: 'construction', name: 'Construction', sinhala: 'ඉදිකිරීම', icon: '🏗️' },
  { type: 'nameCeremony', name: 'Naming', sinhala: 'නම තැබීම', icon: '👶' },
  { type: 'financialTransaction', name: 'Money Deal', sinhala: 'මුදල් ගනුදෙනු', icon: '💰' },
  { type: 'surgery', name: 'Surgery', sinhala: 'සැත්කම', icon: '🏥' },
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

function todayISO() { return new Date().toISOString().slice(0, 10); }
function plusDaysISO(n) { return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10); }
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

export default function NakathScreen() {
  var { language } = useLanguage();
  var { user, showPaywall } = useAuth();
  var insets = useScreenInsets();
  var router = useRouter();
  var si = language === 'si';
  var isPro = !!(user && user.isSubscribed === true);

  var birth = user && user.birthData ? user.birthData : null;
  var bLat = birth && birth.lat ? birth.lat : 6.9271;
  var bLng = birth && birth.lng ? birth.lng : 79.8612;

  var [activities, setActivities] = useState(FALLBACK_ACTIVITIES);
  var [activity, setActivity] = useState('wedding');
  var [startDate, setStartDate] = useState(todayISO());
  var [endDate, setEndDate] = useState(plusDaysISO(60));
  var [loading, setLoading] = useState(false);
  var [result, setResult] = useState(null);
  var [error, setError] = useState(null);

  useEffect(function () {
    api.getMuhurthaActivities()
      .then(function (res) {
        if (res && res.success && Array.isArray(res.data) && res.data.length) {
          setActivities(res.data.map(function (a) {
            return { type: a.type, name: a.name, sinhala: a.sinhala, icon: a.icon };
          }));
        }
      })
      .catch(function () { /* keep fallback */ });
  }, []);

  var find = useCallback(async function () {
    setLoading(true); setError(null); setResult(null);
    try {
      if (isPro) {
        var res = await api.findMuhurtha(activity, startDate, endDate, birth && birth.dateTime, bLat, bLng);
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
  }, [isPro, activity, startDate, endDate, birth, bLat, bLng, si]);

  var unlock = function () { Promise.resolve(showPaywall('nakath')).catch(function () {}); };

  var activeMeta = activities.find(function (a) { return a.type === activity; }) || activities[0];

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0710' }}>
      <CosmicBackground />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120, paddingHorizontal: 18 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={st.header}>
          <TouchableOpacity onPress={function () { router.back(); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={24} color="#F5E6C8" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={st.title}>{si ? 'සුබ නැකැත්' : 'Subha Nakath'}</Text>
            <Text style={st.sub}>{si ? 'ඕනෑම දෙයකට හොඳම වේලාව' : 'The best time for anything'}</Text>
          </View>
        </View>

        {/* Activity grid */}
        <Animated.View entering={FadeInDown.duration(400)} style={st.card}>
          <Text style={st.label}>{si ? '1. කුමක් සඳහාද?' : '1. For what?'}</Text>
          <View style={st.grid}>
            {activities.map(function (a) {
              var on = a.type === activity;
              return (
                <TouchableOpacity key={a.type} activeOpacity={0.85} onPress={function () { setActivity(a.type); setResult(null); }}
                  style={[st.actChip, on ? st.actChipOn : null]}>
                  <Text style={st.actIcon}>{a.icon}</Text>
                  <Text style={[st.actName, on ? { color: '#FFD97A' } : null]} numberOfLines={1}>{si ? a.sinhala : a.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Date range */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={st.card}>
          <Text style={st.label}>{si ? '2. කවදා සිට කවදා දක්වා?' : '2. Which date range?'}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={st.miniLabel}>{si ? 'සිට' : 'From'}</Text>
              <DatePickerField value={startDate} onChange={setStartDate} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.miniLabel}>{si ? 'දක්වා' : 'To'}</Text>
              <DatePickerField value={endDate} onChange={setEndDate} />
            </View>
          </View>
        </Animated.View>

        {/* Find button */}
        <TouchableOpacity activeOpacity={0.88} onPress={find} disabled={loading} style={{ marginTop: 6, marginBottom: 8 }}>
          <LinearGradient colors={['#FFD97A', '#FFB800', '#FF8C00']} style={st.findBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {loading ? <ActivityIndicator color="#2A1707" /> : (
              <>
                <Ionicons name="sparkles" size={16} color="#2A1707" />
                <Text style={st.findBtnText}>{si ? 'හොඳම නැකැත සොයන්න' : 'Find the best time'}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {error ? <Text style={st.err}>{error}</Text> : null}

        {/* Results */}
        {result ? (
          <Animated.View entering={FadeInUp.duration(400)} style={st.resultCard}>
            <View style={st.resultHead}>
              <Text style={st.actIcon}>{activeMeta.icon}</Text>
              <Text style={st.resultTitle}>{si ? activeMeta.sinhala : activeMeta.name}</Text>
            </View>

            {result.pro ? <ProResults data={result.data} si={si} /> : <FreeResult data={result.data} si={si} onUnlock={unlock} />}
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
                  <Text style={st.eventName}>{si ? e.si : e.en}</Text>
                  <Ionicons name="lock-closed" size={11} color="rgba(167,139,250,0.6)" />
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
            <ProLifeEvents birth={birth} bLat={bLat} bLng={bLng} si={si} />
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function FreeResult({ data, si, onUnlock }) {
  if (!data || data.noGoodDate || !data.bestDay) {
    return <Text style={st.noGood}>{si ? 'මෙම කාලය තුළ හොඳ නැකැතක් හමු නොවීය. පරාසය පුළුල් කරන්න.' : 'No strong day found in this range — try a wider range.'}</Text>;
  }
  return (
    <View>
      <Text style={st.bestLabel}>{si ? 'හොඳම දවස' : 'Best day'}</Text>
      <Text style={st.bestDate}>{fmtDay(data.bestDay.date, si)}</Text>
      <View style={st.qualityRow}>
        <View style={st.qualityPill}><Text style={st.qualityText}>{data.bestDay.quality}</Text></View>
        <Text style={st.candidates}>{(si ? 'තවත් හොඳ දින ' : '') + (data.lockedWindowCount || 0) + (si ? 'ක්' : ' good days')}</Text>
      </View>
      {/* Locked exact time */}
      <TouchableOpacity activeOpacity={0.85} onPress={onUnlock} style={st.lockedTime}>
        <Ionicons name="time-outline" size={15} color="#FFD666" />
        <Text style={st.lockedTimeText}>{si ? 'හරියටම වේලාව 🔒' : 'Exact auspicious time 🔒'}</Text>
        <Ionicons name="lock-closed" size={12} color="rgba(255,214,102,0.7)" />
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.85} onPress={onUnlock} style={st.unlockCta}>
        <Text style={st.unlockCtaText}>{si ? 'වේලාව සහ දිශාව විවෘත කරන්න' : 'Unlock exact times & directions'}</Text>
        <Ionicons name="arrow-forward" size={14} color="#2A1707" />
      </TouchableOpacity>
    </View>
  );
}

function ProResults({ data, si }) {
  if (!data || data.noGoodDate || !(data.results && data.results.length)) {
    return <Text style={st.noGood}>{si ? 'මෙම කාලය තුළ හොඳ නැකැතක් හමු නොවීය.' : 'No strong window found in this range.'}</Text>;
  }
  return (
    <View>
      <Text style={st.bestLabel}>{si ? 'හොඳම වේලාවන්' : 'Best time windows'}</Text>
      {data.results.map(function (r, i) {
        return (
          <View key={i} style={st.window}>
            <View style={[st.winScore, { backgroundColor: r.score >= 80 ? '#86EFAC22' : '#E8C56A22', borderColor: r.score >= 80 ? '#86EFAC55' : '#E8C56A55' }]}>
              <Text style={[st.winScoreText, { color: r.score >= 80 ? '#86EFAC' : '#E8C56A' }]}>{r.score}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.winDate}>{fmtDay(r.dateTime.slice(0, 10), si)}</Text>
              <Text style={st.winTime}>{fmtTime(r.dateTime)} · {r.quality}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function ProLifeEvents({ birth, bLat, bLng, si }) {
  var [state, setState] = useState({ loading: false, data: null, err: null });
  useEffect(function () {
    if (!birth || !birth.dateTime) { setState({ loading: false, data: null, err: 'nobirth' }); return; }
    var cancelled = false;
    setState({ loading: true, data: null, err: null });
    api.getLifeEventTiming(birth.dateTime, null, bLat, bLng)
      .then(function (res) { if (!cancelled) setState({ loading: false, data: res.data, err: null }); })
      .catch(function (e) { if (!cancelled) setState({ loading: false, data: null, err: (e && e.message) || 'err' }); });
    return function () { cancelled = true; };
  }, [birth, bLat, bLng]);

  if (state.err === 'nobirth') return <Text style={[st.miniLabel, { marginTop: 10 }]}>{si ? 'ජීවිත කාලය සඳහා පැතිකඩෙහි උපන් විස්තර එක් කරන්න.' : 'Add birth details in your profile for life-event timing.'}</Text>;
  if (state.loading) return <ActivityIndicator color="#A78BFA" style={{ marginTop: 12 }} />;
  if (!state.data) return null;

  var events = state.data.events || state.data.timeline || state.data.predictions || [];
  if (!Array.isArray(events) || !events.length) {
    return <Text style={[st.miniLabel, { marginTop: 10 }]}>{si ? 'ජීවිත කාල දත්ත ලබා ගත නොහැක.' : 'Life-event timing unavailable right now.'}</Text>;
  }
  return (
    <View style={{ marginTop: 10 }}>
      {events.slice(0, 6).map(function (ev, i) {
        var label = ev.name || ev.event || ev.type || '';
        var when = ev.window || ev.timing || ev.period || ev.ageRange || ev.year || '';
        return (
          <View key={i} style={st.evRow}>
            <Ionicons name="ellipse" size={7} color="#A78BFA" />
            <Text style={st.evLabel}>{label}</Text>
            <Text style={st.evWhen}>{typeof when === 'object' ? (when.start || when.from || '') : String(when)}</Text>
          </View>
        );
      })}
    </View>
  );
}

var st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '900', color: '#F5E6C8' },
  sub: { fontSize: 12.5, color: 'rgba(245,230,200,0.55)', marginTop: 1 },
  card: { borderRadius: 16, padding: 14, marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.14)' },
  label: { fontSize: 13, fontWeight: '800', color: '#FFD97A', letterSpacing: 0.3 },
  label2: { fontSize: 14, fontWeight: '800', color: '#C4B5FD' },
  miniLabel: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2, marginBottom: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  actChip: { width: '31%', alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  actChipOn: { borderColor: '#FFB800', backgroundColor: 'rgba(255,184,0,0.12)' },
  actIcon: { fontSize: 22 },
  actName: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  findBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14 },
  findBtnText: { fontSize: 15, fontWeight: '900', color: '#2A1707', letterSpacing: 0.3 },
  err: { color: '#FCA5A5', fontSize: 13, textAlign: 'center', marginVertical: 8 },
  resultCard: { borderRadius: 18, padding: 16, marginTop: 4, backgroundColor: 'rgba(255,184,0,0.05)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.2)' },
  resultHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  resultTitle: { fontSize: 16, fontWeight: '800', color: '#FFF1D0' },
  bestLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: 'rgba(255,214,102,0.7)', marginBottom: 4 },
  bestDate: { fontSize: 20, fontWeight: '900', color: '#FFF8E0' },
  qualityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  qualityPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(134,239,172,0.14)', borderWidth: 1, borderColor: 'rgba(134,239,172,0.4)' },
  qualityText: { fontSize: 12, fontWeight: '800', color: '#86EFAC' },
  candidates: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  lockedTime: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingVertical: 11, paddingHorizontal: 13, borderRadius: 12, backgroundColor: 'rgba(255,214,102,0.08)', borderWidth: 1, borderColor: 'rgba(255,214,102,0.25)' },
  lockedTimeText: { flex: 1, fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  unlockCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: '#FFB800' },
  unlockCtaText: { fontSize: 13, fontWeight: '800', color: '#2A1707' },
  noGood: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 19 },
  window: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  winScore: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  winScoreText: { fontSize: 15, fontWeight: '900' },
  winDate: { fontSize: 14, fontWeight: '800', color: '#FFF1D0' },
  winTime: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  eventChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 11, backgroundColor: 'rgba(167,139,250,0.08)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.22)' },
  eventName: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.82)' },
  eventCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, paddingVertical: 11, borderRadius: 12, backgroundColor: '#A78BFA' },
  eventCtaText: { fontSize: 12.5, fontWeight: '800', color: '#160E28' },
  evRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  evLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  evWhen: { fontSize: 12, fontWeight: '700', color: '#C4B5FD' },
});
