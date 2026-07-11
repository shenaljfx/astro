/**
 * Baby Kendara Pack (බිලිඳු කේන්දරය) — the newborn keepsake.
 *
 * Enter the baby's birth details →
 *   Free : lagna + nakshatra reveal, count of naming letters, "Ganda Moola
 *          checked" — results locked.
 *   Pro / one-time : naming letters, Ganda Moola result + guidance, and
 *          auspicious naming-ceremony dates.
 *
 * Reachable via router.push('/baby') from Home.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { DatePickerField, TimePickerField } from '../../components/CosmicDateTimePicker';
import CitySearchPicker from '../../components/CitySearchPicker';
import { CosmicBackground } from '../../components/CosmicBackground';
import useScreenInsets from '../../hooks/useScreenInsets';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

function fmtDayList(full, si) {
  var r = full && full.results ? full.results : [];
  return r.map(function (x) {
    try {
      var d = new Date(x.dateTime.slice(0, 10) + 'T00:00:00');
      var mons = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return d.getDate() + ' ' + mons[d.getMonth()] + ' ' + d.getFullYear();
    } catch (e) { return x.dateTime; }
  });
}

export default function BabyScreen() {
  var { language } = useLanguage();
  var { user, showPaywall } = useAuth();
  var insets = useScreenInsets();
  var router = useRouter();
  var si = language === 'si';
  var isPro = !!(user && user.isSubscribed === true);

  var [bDate, setBDate] = useState(new Date().toISOString().slice(0, 10));
  var [bTime, setBTime] = useState('10:00');
  var [city, setCity] = useState(null);
  var [loading, setLoading] = useState(false);
  var [tease, setTease] = useState(null);
  var [pack, setPack] = useState(null);
  var [error, setError] = useState(null);

  var lat = city && city.lat != null ? city.lat : 6.9271;
  var lng = city && city.lng != null ? city.lng : 79.8612;
  var birthISO = bDate + 'T' + bTime + ':00';

  var reveal = useCallback(async function () {
    setLoading(true); setError(null); setPack(null); setTease(null);
    try {
      var res = await api.getBabyPreview(birthISO, lat, lng);
      setTease(res.data);
    } catch (e) {
      setError((e && e.message) || (si ? 'දෝෂයක් සිදු විය' : 'Something went wrong'));
    } finally { setLoading(false); }
  }, [birthISO, lat, lng, si]);

  var unlock = useCallback(async function () {
    // Subscribers + one-time buyers reach the full pack. Free → paywall first.
    if (!isPro) {
      try { await showPaywall('baby'); } catch (e) { return; }
    }
    setLoading(true); setError(null);
    try {
      var res = await api.composeBabyKendara(birthISO, lat, lng);
      setPack(res.data);
    } catch (e) {
      setError((e && e.message) || (si ? 'දෝෂයක් සිදු විය' : 'Something went wrong'));
    } finally { setLoading(false); }
  }, [isPro, showPaywall, birthISO, lat, lng, si]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0710' }}>
      <CosmicBackground />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120, paddingHorizontal: 18 }} showsVerticalScrollIndicator={false}>
        <View style={st.header}>
          <TouchableOpacity onPress={function () { router.back(); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={24} color="#F9C6D6" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={st.title}>{si ? 'බිලිඳු කේන්දරය' : 'Baby Kendara'}</Text>
            <Text style={st.sub}>{si ? 'ඔබේ බිලිඳාට සුබ නමක් සහ කේන්දරයක්' : "Your newborn's chart, name & rites"}</Text>
          </View>
          <Text style={{ fontSize: 26 }}>👶</Text>
        </View>

        {/* Birth inputs */}
        <Animated.View entering={FadeInDown.duration(400)} style={st.card}>
          <Text style={st.label}>{si ? 'බිලිඳාගේ උපන් විස්තර' : "Baby's birth details"}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1.3 }}><Text style={st.miniLabel}>{si ? 'දිනය' : 'Date'}</Text><DatePickerField value={bDate} onChange={setBDate} /></View>
            <View style={{ flex: 1 }}><Text style={st.miniLabel}>{si ? 'වේලාව' : 'Time'}</Text><TimePickerField value={bTime} onChange={setBTime} /></View>
          </View>
          <Text style={[st.miniLabel, { marginTop: 10 }]}>{si ? 'උපන් ස්ථානය' : 'Birth place'}</Text>
          <CitySearchPicker value={city} onSelect={setCity} placeholder={si ? 'නගරය තෝරන්න (පෙරනිමිය කොළඹ)' : 'Search city (default Colombo)'} />
        </Animated.View>

        <TouchableOpacity activeOpacity={0.88} onPress={reveal} disabled={loading} style={{ marginBottom: 10 }}>
          <LinearGradient colors={['#F9A8D4', '#F472B6', '#EC4899']} style={st.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {loading && !pack ? <ActivityIndicator color="#3A0A25" /> : (
              <>
                <Ionicons name="sparkles" size={16} color="#3A0A25" />
                <Text style={st.btnText}>{si ? 'බිලිඳාගේ කේන්දරය බලන්න' : "Reveal baby's chart"}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {error ? <Text style={st.err}>{error}</Text> : null}

        {/* Free tease */}
        {tease && !pack ? (
          <Animated.View entering={FadeInUp.duration(400)} style={st.resultCard}>
            <View style={st.idRow}>
              <View style={st.idCol}><Text style={st.idLabel}>{si ? 'ලග්නය' : 'Lagna'}</Text><Text style={st.idVal}>{si ? (tease.lagna && (tease.lagna.sinhala || tease.lagna.english)) : (tease.lagna && tease.lagna.english)}</Text></View>
              <View style={st.idCol}><Text style={st.idLabel}>{si ? 'නැකත' : 'Nakshatra'}</Text><Text style={st.idVal}>{tease.nakshatra && (tease.nakshatra.name || tease.nakshatra.english)}</Text></View>
            </View>
            <View style={st.teaseRow}>
              <Ionicons name="text-outline" size={15} color="#F9D77E" />
              <Text style={st.teaseText}>{(si ? 'සුබ නාම අකුරු ' : '') + (tease.namingLetterCount || 0) + (si ? 'ක් හමු විය' : ' auspicious naming sounds found')} 🔒</Text>
            </View>
            <View style={st.teaseRow}>
              <Ionicons name={tease.gandaMoolaChecked ? 'shield-checkmark-outline' : 'shield-outline'} size={15} color="#F472B6" />
              <Text style={st.teaseText}>{si ? 'ගණ්ඩ මූල දෝෂය පරීක්ෂා කළා' : 'Ganda Moola dosha — checked'} 🔒</Text>
            </View>
            <TouchableOpacity activeOpacity={0.88} onPress={unlock} style={st.unlockCta}>
              <Ionicons name="lock-open-outline" size={14} color="#3A0A25" />
              <Text style={st.unlockText}>{si ? 'සම්පූර්ණ පැකේජය විවෘත කරන්න' : 'Unlock the full pack'}</Text>
            </TouchableOpacity>
            <Text style={st.packNote}>{si ? 'නම් අකුරු · දෝෂ විග්‍රහය · නම් තැබීමේ නැකැත් · PDF' : 'Naming letters · dosha reading · ceremony dates · PDF'}</Text>
          </Animated.View>
        ) : null}

        {/* Full pack (Pro / bought) */}
        {pack ? (
          <Animated.View entering={FadeInUp.duration(400)} style={st.resultCard}>
            <View style={st.idRow}>
              <View style={st.idCol}><Text style={st.idLabel}>{si ? 'ලග්නය' : 'Lagna'}</Text><Text style={st.idVal}>{si ? (pack.identity && pack.identity.lagna && (pack.identity.lagna.sinhala || pack.identity.lagna.english)) : (pack.identity && pack.identity.lagna && pack.identity.lagna.english)}</Text></View>
              <View style={st.idCol}><Text style={st.idLabel}>{si ? 'නැකත' : 'Nakshatra'}</Text><Text style={st.idVal}>{pack.identity && pack.identity.nakshatra && (pack.identity.nakshatra.name || pack.identity.nakshatra.english)}</Text></View>
            </View>

            {/* Naming letters */}
            {pack.babyNames ? (
              <View style={st.section}>
                <Text style={st.sectionTitle}>{si ? 'සුබ නාම අකුරු' : 'Auspicious naming sounds'}</Text>
                <Text style={st.sectionBody}>{pack.babyNames.sinhalaNote || (pack.babyNames.nakshatra ? (pack.babyNames.nakshatra + ' — pada ' + pack.babyNames.pada) : '')}</Text>
                <Text style={st.letters}>{formatSuggestions(pack.babyNames.suggestions)}</Text>
              </View>
            ) : null}

            {/* Ganda moola */}
            {pack.gandaMoola ? (
              <View style={st.section}>
                <Text style={st.sectionTitle}>{si ? 'ගණ්ඩ මූල දෝෂය' : 'Ganda Moola dosha'}</Text>
                <Text style={[st.sectionBody, { color: pack.gandaMoola.hasGandaMoola ? '#FCA5A5' : '#86EFAC' }]}>
                  {pack.gandaMoola.hasGandaMoola
                    ? (si ? 'ඇත — පළපුරුදු ජ්‍යෝතිෂියෙකුගෙන් උපදෙස් ගැනීම හොඳයි.' : 'Present — worth consulting an experienced astrologer.')
                    : (si ? 'නැත — බිලිඳා මෙම දෝෂයෙන් නිදහස්.' : 'Not present — your baby is free of this dosha.')}
                </Text>
              </View>
            ) : null}

            {/* Naming ceremony dates */}
            {pack.namingDates && pack.namingDates.results && pack.namingDates.results.length ? (
              <View style={st.section}>
                <Text style={st.sectionTitle}>{si ? 'නම් තැබීමට සුබ දින' : 'Auspicious naming dates'}</Text>
                {fmtDayList(pack.namingDates, si).map(function (d, i) {
                  return <View key={i} style={st.dateRow}><Ionicons name="calendar-outline" size={13} color="#F9D77E" /><Text style={st.dateText}>{d}</Text></View>;
                })}
              </View>
            ) : null}
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function formatSuggestions(s) {
  if (!s) return '';
  if (Array.isArray(s)) return s.join('  ·  ');
  if (Array.isArray(s.letters)) return s.letters.join('  ·  ');
  if (Array.isArray(s.syllables)) return s.syllables.join('  ·  ');
  if (Array.isArray(s.sounds)) return s.sounds.join('  ·  ');
  if (typeof s === 'string') return s;
  try { return Object.values(s).flat().join('  ·  '); } catch (e) { return ''; }
}

var st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '900', color: '#F9C6D6' },
  sub: { fontSize: 12.5, color: 'rgba(249,198,214,0.55)', marginTop: 1 },
  card: { borderRadius: 16, padding: 14, marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(244,114,182,0.16)' },
  label: { fontSize: 13, fontWeight: '800', color: '#F9A8D4', letterSpacing: 0.3 },
  miniLabel: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 4 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14 },
  btnText: { fontSize: 15, fontWeight: '900', color: '#3A0A25', letterSpacing: 0.3 },
  err: { color: '#FCA5A5', fontSize: 13, textAlign: 'center', marginVertical: 8 },
  resultCard: { borderRadius: 18, padding: 16, marginTop: 4, backgroundColor: 'rgba(244,114,182,0.05)', borderWidth: 1, borderColor: 'rgba(244,114,182,0.2)' },
  idRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  idCol: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)' },
  idLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: 'rgba(255,255,255,0.45)' },
  idVal: { fontSize: 16, fontWeight: '900', color: '#FFF1F8', marginTop: 3 },
  teaseRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  teaseText: { flex: 1, fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.82)' },
  unlockCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, paddingVertical: 13, borderRadius: 12, backgroundColor: '#F472B6' },
  unlockText: { fontSize: 14, fontWeight: '800', color: '#3A0A25' },
  packNote: { fontSize: 11, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: 10 },
  section: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#F9A8D4', marginBottom: 4 },
  sectionBody: { fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 19 },
  letters: { fontSize: 15, fontWeight: '800', color: '#FFF1D0', marginTop: 6, letterSpacing: 0.5 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  dateText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
});
