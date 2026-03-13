import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Platform, ActivityIndicator, Share, Alert,
  LayoutAnimation, UIManager, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown, FadeIn, FadeOut, SlideInLeft, SlideInRight,
  ZoomIn, FadeInUp,
  useSharedValue, useAnimatedStyle, withTiming,
  withSequence, withRepeat, Easing,
} from 'react-native-reanimated';
import CosmicBackground from '../../components/CosmicBackground';
import SriLankanChart from '../../components/SriLankanChart';
import MarkdownText from '../../components/MarkdownText';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: W } = Dimensions.get('window');
const WIDE = W >= 700;
const MOBILE_CHART = Math.min(W - 64, 300);

// Glass Card
function Glass({ children, style, accent }) {
  return (
    <View style={[sty.glass, style]}>
      <LinearGradient
        pointerEvents="none"
        colors={accent
          ? ['rgba(244,63,94,0.12)', 'rgba(139,92,246,0.08)', 'rgba(15,5,25,0.6)']
          : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)', 'rgba(15,5,25,0.4)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      {children}
    </View>
  );
}

// Compact number input
function NumField({ value, onChangeText, placeholder, maxLength, flex, style }) {
  return (
    <TextInput
      style={[sty.numInput, flex && { flex }, style]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,0.25)"
      keyboardType="number-pad"
      maxLength={maxLength}
    />
  );
}

// Score Gauge
function ScoreGauge({ score, maxScore, rating, ratingEmoji, ratingSinhala, language, onShare, T }) {
  var pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  var color = pct >= 75 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171';
  var label = language === 'si' && ratingSinhala ? ratingSinhala : rating;
  return (
    <Glass accent>
      <View style={sty.gaugeRow}>
        <View style={sty.gaugeCircle}>
          <LinearGradient colors={[color + '30', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
          <Text style={[sty.gaugePct, { color: color }]}>{pct}<Text style={sty.gaugePctSign}>%</Text></Text>
          <Text style={sty.gaugeOf}>{score}/{maxScore}</Text>
        </View>
        <View style={sty.gaugeInfo}>
          <Text style={sty.gaugeRating}>{ratingEmoji || '\uD83D\uDC8D'} {label}</Text>
          <Text style={sty.gaugeHint}>{T.overall}</Text>
          <TouchableOpacity style={sty.shareChip} onPress={onShare} activeOpacity={0.7}>
            <Ionicons name="share-social-outline" size={14} color="#c084fc" />
            <Text style={sty.shareChipText}>{T.shareBtn}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Glass>
  );
}

// Factor Bar
function FactorBar({ f, index, language }) {
  var pct = f.maxScore > 0 ? f.score / f.maxScore : 0;
  var color = pct >= 0.75 ? '#34d399' : pct >= 0.5 ? '#fbbf24' : '#f87171';
  var desc = language === 'si' && f.descriptionSinhala ? f.descriptionSinhala : f.description;
  return (
    <Animated.View entering={FadeInUp.delay(100 * index).duration(500)} style={sty.factorItem}>
      <View style={sty.factorTop}>
        <View style={sty.factorNameRow}>
          <View style={[sty.factorDot, { backgroundColor: color }]} />
          <Text style={sty.factorName}>{f.name}</Text>
          {f.sinhala ? <Text style={sty.factorSinhala}>{f.sinhala}</Text> : null}
        </View>
        <View style={[sty.factorBadge, { backgroundColor: color + '25', borderColor: color + '40' }]}>
          <Text style={[sty.factorBadgeText, { color: color }]}>{f.score}/{f.maxScore}</Text>
        </View>
      </View>
      <View style={sty.barTrack}>
        <Animated.View entering={FadeIn.delay(200 + 100 * index).duration(800)} style={[sty.barFill, { width: (pct * 100) + '%', backgroundColor: color }]} />
      </View>
      {desc ? <Text style={sty.factorDesc}>{desc}</Text> : null}
    </Animated.View>
  );
}

// Labels
var L = {
  en: {
    title: 'Porondam', subtitle: 'Marriage Compatibility Check',
    bride: '\uD83D\uDC70 Bride', groom: '\uD83E\uDD35 Groom',
    namePh: 'Name (optional)',
    yearPh: 'YYYY', monthPh: 'MM', dayPh: 'DD', hourPh: 'HH', minutePh: 'MM',
    date: 'Date of Birth', time: 'Time',
    timeHint: '* Check birth certificate for exact time',
    checkBtn: '\uD83D\uDC8D Check Compatibility',
    brideChart: "Bride's Kendara", groomChart: "Groom's Kendara",
    factors: 'Compatibility Factors', factorsSub: '7 Factors \u00B7 20 Points',
    doshas: 'Doshas', report: 'AI Astrologer Report',
    reportQ: 'Get detailed analysis in:',
    si: '\u0DC3\u0DD2\u0D82\u0DC4\u0DBD', en: 'English',
    generating: 'Writing your report...', shareBtn: 'Share',
    overall: 'Compatibility Score',
    missing: 'Please enter birth dates for both bride and groom',
    edit: 'Change Details', calculating: 'Reading the stars...',
    history: 'Previous Checks', historyEmpty: 'No saved checks yet',
    historyLoading: 'Loading saved checks...', viewReport: 'View Report',
    newCheck: '+ New Check',
    // Porondam+ Advanced
    advancedTitle: '\uD83D\uDD2E Deep Compatibility',
    advancedSub: 'Beyond the 7 factors',
    combinedScore: 'Combined Score',
    dashaTitle: '\uD83C\uDF00 Life Phase Match',
    currentPhase: 'Current Phase',
    benefic: 'Favorable',
    malefic: 'Challenging',
    navamshaTitle: '\uD83D\uDC9E Marriage Chart (D9)',
    mangalaTitle: '\u2694\uFE0F Mars Energy Check',
    marriageStrTitle: '\uD83D\uDC8E Marriage Planet Strength',
    venus: 'Venus',
    lord7: '7th Lord',
    weddingTitle: '\uD83D\uDCC5 Best Wedding Windows',
    noWindows: 'No overlapping favorable window found',
  },
  si: {
    title: '\u0DB4\u0DCA\u200D\u0DBB\u0DDD\u0DBB\u0DDD\u0DB1\u0DCA\u0DAF\u0DB8\u0DCA', subtitle: '\u0DC0\u0DD2\u0DC0\u0DCF\u0DC4 \u0D9C\u0DD0\u0DBD\u0DB4\u0DD3\u0DB8\u0DCA \u0DB4\u0DBB\u0DD3\u0D9A\u0DCA\u0DC2\u0DCF\u0DC0',
    bride: '\uD83D\uDC70 \u0DB8\u0DB1\u0DCF\u0DBD\u0DD2\u0DBA', groom: '\uD83E\uDD35 \u0DB8\u0DB1\u0DCF\u0DBD\u0DBA\u0DCF',
    namePh: '\u0DB1\u0DB8 (\u0D85\u0DC0\u0DC1\u0DCA\u200D\u0DBA \u0DB1\u0DB8\u0DCA)',
    yearPh: 'YYYY', monthPh: 'MM', dayPh: 'DD', hourPh: 'HH', minutePh: 'MM',
    date: '\u0D89\u0DB4\u0DB1\u0DCA \u0DAF\u0DD2\u0DB1\u0DBA', time: '\u0DC0\u0DDA\u0DBD\u0DCF\u0DC0',
    timeHint: '* \u0D89\u0DB4\u0DCA\u0DB4\u0DD0\u0DB1\u0DCA\u0DB1 \u0DB4\u0DAD\u0DCA\u200D\u0DBB\u0DBA\u0DDA \u0DC0\u0DDA\u0DBD\u0DCF\u0DC0 \u0DB6\u0DBD\u0DB1\u0DCA\u0DB1',
    checkBtn: '\uD83D\uDC8D \u0DB4\u0DCA\u200D\u0DBB\u0DDD\u0DBB\u0DDD\u0DB1\u0DCA\u0DAF\u0DB8\u0DCA \u0DB6\u0DBD\u0DB1\u0DCA\u0DB1',
    brideChart: '\u0DB8\u0DB1\u0DCF\u0DBD\u0DD2\u0DBA\u0D9C\u0DDA \u0D9A\u0DDA\u0DB1\u0DCA\u0DAF\u0DCA\u200D\u0DBB\u0DBA', groomChart: '\u0DB8\u0DB1\u0DCF\u0DBD\u0DBA\u0DCF\u0D9C\u0DDA \u0D9A\u0DDA\u0DB1\u0DCA\u0DAF\u0DCA\u200D\u0DBB\u0DBA',
    factors: '\u0DB4\u0DCA\u200D\u0DBB\u0DDD\u0DBB\u0DDD\u0DB1\u0DCA\u0DAF\u0DB8\u0DCA \u0DC3\u0DCF\u0DB0\u0D9A', factorsSub: '\u0DC3\u0DCF\u0DB0\u0D9A 7 \u00B7 \u0DBD\u0D9A\u0DD4\u0DAB\u0DD4 20',
    doshas: '\u0DAF\u0DDD\u0DC2', report: 'AI \u0DA2\u0DCA\u200D\u0DBA\u0DDD\u0DAD\u0DD2\u0DC2 \u0DC0\u0DCF\u0DBB\u0DCA\u0DAD\u0DCF\u0DC0',
    reportQ: '\u0DC3\u0DC0\u0DD2\u0DC3\u0DCA\u0DAD\u0DBB \u0DC0\u0DD2\u0DC1\u0DCA\u0DBD\u0DDA\u0DC2\u0DAB\u0DBA:',
    si: '\u0DC3\u0DD2\u0D82\u0DC4\u0DBD', en: 'English',
    generating: '\u0DC0\u0DCF\u0DBB\u0DCA\u0DAD\u0DCF\u0DC0 \u0DBD\u0DD2\u0DBA\u0DB8\u0DD2\u0DB1\u0DCA...', shareBtn: '\u0DBA\u0DC0\u0DB1\u0DCA\u0DB1',
    overall: '\u0D9C\u0DD0\u0DBD\u0DB4\u0DD3\u0DB8\u0DCA \u0DBD\u0D9A\u0DD4\u0DAB\u0DD4',
    missing: '\u0DAF\u0DD9\u0DAF\u0DD9\u0DB1\u0DCF\u0D9C\u0DDA\u0DB8 \u0D89\u0DB4\u0DB1\u0DCA \u0DAF\u0DD2\u0DB1\u0DBA \u0DAF\u0DCF\u0DB1\u0DCA\u0DB1',
    edit: '\u0DC0\u0DD2\u0DC3\u0DCA\u0DAD\u0DBB \u0DC0\u0DD9\u0DB1\u0DC3\u0DCA \u0D9A\u0DBB\u0DB1\u0DCA\u0DB1', calculating: '\u0DB1\u0DD0\u0D9A\u0DAD\u0DCA \u0DB6\u0DBD\u0DB8\u0DD2\u0DB1\u0DCA...',
    history: '\u0DB4\u0DD9\u0DBB \u0DB4\u0DBB\u0DD3\u0D9A\u0DCA\u0DC2\u0DCF', historyEmpty: '\u0DC3\u0DD4\u0DBB\u0D9A\u0DD2\u0DB1 \u0DB4\u0DBB\u0DD3\u0D9A\u0DCA\u0DC2\u0DCF \u0DB1\u0DD0\u0DAD',
    historyLoading: '\u0DC3\u0DD4\u0DBB\u0D9A\u0DD2\u0DB1 \u0DB4\u0DBB\u0DD3\u0D9A\u0DCA\u0DC2\u0DCF \u0DB6\u0DBD\u0DB8\u0DD2\u0DB1\u0DCA...', viewReport: '\u0DC0\u0DCF\u0DBB\u0DCA\u0DAD\u0DCF\u0DC0 \u0DB6\u0DBD\u0DB1\u0DCA\u0DB1',
    newCheck: '+ \u0DB1\u0DC0 \u0DB4\u0DBB\u0DD3\u0D9A\u0DCA\u0DC2\u0DCF\u0DC0',
    // Porondam+ Advanced
    advancedTitle: '\uD83D\uDD2E ගැඹුරු ගැලපීම',
    advancedSub: 'සාධක 7 ඔබ්බට',
    combinedScore: 'ඒකාබද්ධ ලකුණු',
    dashaTitle: '\uD83C\uDF00 ජීවිත අදියර ගැලපීම',
    currentPhase: 'දැන් ඉන්න අදියර',
    benefic: 'සුභයි',
    malefic: 'අභියෝගාත්මක',
    navamshaTitle: '\uD83D\uDC9E විවාහ කේන්දරය (D9)',
    mangalaTitle: '\u2694\uFE0F කුජ ශක්ති පරීක්ෂාව',
    marriageStrTitle: '\uD83D\uDC8E විවාහ ග්‍රහ ශක්තිය',
    venus: 'සිකුරු',
    lord7: '7 වන අධිපති',
    weddingTitle: '\uD83D\uDCC5 හොඳම විවාහ කාල',
    noWindows: 'ගැලපෙන සුභ කාලයක් හමු නොවීය',
  },
};

// Person Input Card
function PersonCard({ label, name, setName, year, month, day, hour, minute, setYear, setMonth, setDay, setHour, setMinute, T }) {
  return (
    <Glass style={sty.personCard}>
      <Text style={sty.personLabel}>{label}</Text>
      <TextInput style={sty.nameInput} value={name} onChangeText={setName} placeholder={T.namePh} placeholderTextColor="rgba(255,255,255,0.2)" />
      <Text style={sty.fieldTag}>{T.date}</Text>
      <View style={sty.fieldRow}>
        <NumField value={year} onChangeText={setYear} placeholder={T.yearPh} maxLength={4} flex={1.6} />
        <Text style={sty.sep}>/</Text>
        <NumField value={month} onChangeText={setMonth} placeholder={T.monthPh} maxLength={2} flex={1} />
        <Text style={sty.sep}>/</Text>
        <NumField value={day} onChangeText={setDay} placeholder={T.dayPh} maxLength={2} flex={1} />
      </View>
      <Text style={sty.fieldTag}>{T.time}</Text>
      <View style={sty.fieldRow}>
        <NumField value={hour} onChangeText={setHour} placeholder={T.hourPh} maxLength={2} flex={1} />
        <Text style={sty.timeSep}>:</Text>
        <NumField value={minute} onChangeText={setMinute} placeholder={T.minutePh} maxLength={2} flex={1} />
      </View>
    </Glass>
  );
}

// ======= MAIN SCREEN =======
export default function PorondamScreen() {
  var { language } = useLanguage();
  var { isLoggedIn } = useAuth();
  var T = L[language] || L.en;

  var [bYear, setBYear] = useState('');
  var [bMonth, setBMonth] = useState('');
  var [bDay, setBDay] = useState('');
  var [bHour, setBHour] = useState('');
  var [bMinute, setBMinute] = useState('');
  var [bName, setBName] = useState('');

  var [gYear, setGYear] = useState('');
  var [gMonth, setGMonth] = useState('');
  var [gDay, setGDay] = useState('');
  var [gHour, setGHour] = useState('');
  var [gMinute, setGMinute] = useState('');
  var [gName, setGName] = useState('');

  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState(null);
  var [collapsed, setCollapsed] = useState(false);
  var scrollRef = useRef(null);
  var [report, setReport] = useState(null);
  var [reportLoading, setReportLoading] = useState(false);
  var [reportLang, setReportLang] = useState(null);
  var [porondamId, setPorondamId] = useState(null);
  var [history, setHistory] = useState([]);
  var [historyLoading, setHistoryLoading] = useState(false);

  // Load saved porondam history on mount (if logged in)
  useEffect(function() {
    if (!isLoggedIn) { setHistory([]); return; }
    setHistoryLoading(true);
    api.getUserPorondamHistory(20)
      .then(function(res) { setHistory(res.results || []); })
      .catch(function() { setHistory([]); })
      .finally(function() { setHistoryLoading(false); });
  }, [isLoggedIn]);

  var pulse = useSharedValue(1);
  var spin = useSharedValue(0);

  useEffect(function() {
    if (loading) {
      pulse.value = withRepeat(withSequence(
        withTiming(1.12, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.92, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ), -1, true);
      spin.value = withRepeat(withTiming(360, { duration: 2500, easing: Easing.linear }), -1, false);
    } else {
      pulse.value = withTiming(1, { duration: 200 });
      spin.value = 0;
    }
  }, [loading]);

  var pulseStyle = useAnimatedStyle(function() { return { transform: [{ scale: pulse.value }] }; });
  var spinStyle = useAnimatedStyle(function() { return { transform: [{ rotate: spin.value + 'deg' }] }; });

  function buildDate(y, m, d, h, min) {
    return new Date(parseInt(y) || 1990, (parseInt(m) || 1) - 1, parseInt(d) || 1, parseInt(h) || 12, parseInt(min) || 0).toISOString();
  }

  var check = useCallback(async function() {
    if (!bYear || !bMonth || !bDay || !gYear || !gMonth || !gDay) {
      Alert.alert('', T.missing); return;
    }
    try {
      setLoading(true); setError(null); setData(null); setReport(null); setReportLang(null); setPorondamId(null);
      var res = await api.checkPorondam(
        { birthDate: buildDate(bYear, bMonth, bDay, bHour, bMinute), lat: 6.9271, lng: 79.8612, name: bName || undefined },
        { birthDate: buildDate(gYear, gMonth, gDay, gHour, gMinute), lat: 6.9271, lng: 79.8612, name: gName || undefined }
      );
      setData(res.data);
      if (res.porondamId) setPorondamId(res.porondamId);
      // Refresh history after saving
      if (isLoggedIn) {
        api.getUserPorondamHistory(20).then(function(h) { setHistory(h.results || []); }).catch(function() {});
      }
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCollapsed(true);
      setTimeout(function() { if (scrollRef.current) scrollRef.current.scrollTo({ y: 0, animated: true }); }, 300);
    } catch (e) { setError(e.message || 'Error'); }
    finally { setLoading(false); }
  }, [bYear, bMonth, bDay, bHour, bMinute, gYear, gMonth, gDay, gHour, gMinute, T, isLoggedIn]);

  var genReport = useCallback(async function(lang) {
    if (!data) return;
    try {
      setReportLang(lang); setReportLoading(true);
      var res = await api.getPorondamReport(data, lang, bName || undefined, gName || undefined, porondamId || undefined);
      setReport(res.report);
      if (res.porondamId) setPorondamId(res.porondamId);
      // Refresh history after report saved
      if (isLoggedIn) {
        api.getUserPorondamHistory(20).then(function(h) { setHistory(h.results || []); }).catch(function() {});
      }
    } catch (e) { setReport(lang === 'si' ? '\u0DC0\u0DCF\u0DBB\u0DCA\u0DAD\u0DCF\u0DC0 \u0DC4\u0DAF\u0DB1\u0DCA\u0DB1 \u0DB6\u0DD0\u0DBB\u0DD2 \u0DC0\u0DD4\u0DB1\u0DCF.' : 'Failed to generate report.'); }
    finally { setReportLoading(false); }
  }, [data, bName, gName, porondamId, isLoggedIn]);

  var loadSaved = useCallback(function(item) {
    // Reconstruct the data shape that the UI expects from a saved DB record
    var restoredData = {
      totalScore: item.score || 0,
      maxPossibleScore: item.maxScore || 20,
      percentage: item.percentage || 0,
      rating: item.rating || '',
      ratingEmoji: item.ratingEmoji || '',
      ratingSinhala: item.ratingSinhala || '',
      bride: item.bride || {},
      groom: item.groom || {},
      factors: item.factors || [],
      doshas: item.doshas || [],
      brideChart: item.brideChart || null,
      groomChart: item.groomChart || null,
      brideAdvanced: item.brideAdvanced || null,
      groomAdvanced: item.groomAdvanced || null,
      advancedPorondam: item.advancedPorondam || null,
    };
    setData(restoredData);
    setPorondamId(item.id);
    setReport(item.report || null);
    setReportLang(item.reportLanguage || null);
    setError(null);
    setBName(item.bride?.name || '');
    setGName(item.groom?.name || '');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsed(true);
    setTimeout(function() { if (scrollRef.current) scrollRef.current.scrollTo({ y: 0, animated: true }); }, 300);
  }, []);

  var shareResult = async function() {
    if (!data) return;
    try {
      var msg = language === 'si'
        ? '\u0DB4\u0DCA\u200D\u0DBB\u0DDD\u0DBB\u0DDD\u0DB1\u0DCA\u0DAF\u0DB8\u0DCA: ' + data.totalScore + '/' + data.maxPossibleScore + ' (' + data.percentage + '%) \u2014 ' + (data.ratingSinhala || data.rating) + '\n\nNakath AI \uD83D\uDC8D'
        : 'Porondam: ' + data.totalScore + '/' + data.maxPossibleScore + ' (' + data.percentage + '%) \u2014 ' + data.rating + '\n\nNakath AI \uD83D\uDC8D';
      await Share.share({ message: msg });
    } catch (e) {}
  };

  return (
    <CosmicBackground>
      <ScrollView ref={scrollRef} style={sty.flex} contentContainerStyle={sty.scroll} showsVerticalScrollIndicator={false}>

        <Animated.View entering={FadeInDown.duration(600)}>
          <Text style={sty.title}>{T.title}</Text>
          <Text style={sty.subtitle}>{T.subtitle}</Text>
        </Animated.View>

        {!collapsed && (
          <View>
            <View style={WIDE ? sty.formRow : undefined}>
              <Animated.View entering={FadeInDown.delay(100).duration(600)} exiting={FadeOut.duration(300)} style={WIDE ? sty.formCol : undefined}>
                <PersonCard label={T.bride} name={bName} setName={setBName}
                  year={bYear} month={bMonth} day={bDay} hour={bHour} minute={bMinute}
                  setYear={setBYear} setMonth={setBMonth} setDay={setBDay} setHour={setBHour} setMinute={setBMinute} T={T} />
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(180).duration(600)} exiting={FadeOut.duration(300)} style={WIDE ? sty.formCol : undefined}>
                <PersonCard label={T.groom} name={gName} setName={setGName}
                  year={gYear} month={gMonth} day={gDay} hour={gHour} minute={gMinute}
                  setYear={setGYear} setMonth={setGMonth} setDay={setGDay} setHour={setGHour} setMinute={setGMinute} T={T} />
              </Animated.View>
            </View>
            <Text style={sty.timeHint}>{T.timeHint}</Text>
            <Animated.View entering={FadeInDown.delay(250).duration(600)}>
              <TouchableOpacity style={sty.cta} onPress={check} disabled={loading} activeOpacity={0.8}>
                <LinearGradient colors={['#c026d3', '#db2777', '#f43f5e']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={sty.ctaText}>{T.checkBtn}</Text>}
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}

        {collapsed && !loading && (
          <Animated.View entering={FadeIn.delay(200).duration(400)}>
            <TouchableOpacity style={sty.editBtn} activeOpacity={0.7}
              onPress={function() { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setCollapsed(false); }}>
              <Ionicons name="pencil" size={14} color="#c084fc" />
              <Text style={sty.editText}>{T.edit}</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {loading && (
          <Animated.View entering={ZoomIn.duration(500)} style={sty.loadCenter}>
            <Glass accent style={sty.loadCard}>
              <Animated.View style={[sty.loadRing, spinStyle]}>
                <LinearGradient colors={['#c026d3', '#f43f5e', '#6366f1', '#c026d3']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              </Animated.View>
              <Animated.View style={[sty.loadInner, pulseStyle]}>
                <Text style={{ fontSize: 30 }}>{'\uD83D\uDC8D'}</Text>
              </Animated.View>
              <Text style={sty.loadText}>{T.calculating}</Text>
            </Glass>
          </Animated.View>
        )}

        {error && <Glass><Text style={sty.errorText}>{error}</Text></Glass>}

        {data && !loading && (
          <View>
            <Animated.View entering={ZoomIn.springify().damping(12).delay(50)}>
              <ScoreGauge score={data.totalScore} maxScore={data.maxPossibleScore}
                rating={data.rating} ratingEmoji={data.ratingEmoji}
                ratingSinhala={data.ratingSinhala} language={language}
                onShare={shareResult} T={T} />
            </Animated.View>

            <View style={[sty.charts, WIDE && sty.chartsWide]}>
              {data.brideChart && (
                <Animated.View entering={SlideInLeft.springify().damping(14).stiffness(80).delay(200)} style={WIDE ? sty.chartCol : undefined}>
                  <Glass style={sty.chartCard}>
                    <Text style={sty.chartTitle}>{T.brideChart}</Text>
                    <SriLankanChart rashiChart={data.brideChart.rashiChart} lagnaRashiId={data.brideChart.lagnaRashiId} language={language}
                      chartSize={WIDE ? Math.min(320, (W - 140) / 2) : MOBILE_CHART} />
                  </Glass>
                </Animated.View>
              )}
              <Animated.View entering={ZoomIn.delay(500).duration(700)} style={[sty.heartBridge, WIDE && sty.heartBridgeWide]}>
                <Text style={{ fontSize: 24 }}>{'\uD83D\uDC95'}</Text>
              </Animated.View>
              {data.groomChart && (
                <Animated.View entering={SlideInRight.springify().damping(14).stiffness(80).delay(350)} style={WIDE ? sty.chartCol : undefined}>
                  <Glass style={sty.chartCard}>
                    <Text style={sty.chartTitle}>{T.groomChart}</Text>
                    <SriLankanChart rashiChart={data.groomChart.rashiChart} lagnaRashiId={data.groomChart.lagnaRashiId} language={language}
                      chartSize={WIDE ? Math.min(320, (W - 140) / 2) : MOBILE_CHART} />
                  </Glass>
                </Animated.View>
              )}
            </View>

            {data.factors && data.factors.length > 0 && (
              <Animated.View entering={FadeInUp.delay(600).duration(700)}>
                <Glass style={sty.section}>
                  <View style={sty.secHeader}>
                    <View>
                      <Text style={sty.secTitle}>{T.factors}</Text>
                      <Text style={sty.secSub}>{T.factorsSub}</Text>
                    </View>
                  </View>
                  {data.factors.map(function(f, i) { return <FactorBar key={i} f={f} index={i} language={language} />; })}
                </Glass>
              </Animated.View>
            )}

            {data.doshas && data.doshas.length > 0 && (
              <Animated.View entering={FadeInUp.delay(800).duration(700)}>
                <Glass style={sty.section}>
                  <Text style={[sty.secTitle, { color: '#f87171' }]}>{'\u26A0\uFE0F'} {T.doshas}</Text>
                  {data.doshas.map(function(d, i) {
                    return (
                      <View key={i} style={sty.doshaItem}>
                        <View style={sty.doshaIcon}><Ionicons name="alert-circle" size={18} color="#f87171" /></View>
                        <View style={{ flex: 1 }}>
                          <Text style={sty.doshaName}>{d.name} {d.sinhala ? '(' + d.sinhala + ')' : ''}</Text>
                          <Text style={sty.doshaDesc}>{language === 'si' && d.descriptionSinhala ? d.descriptionSinhala : d.description}</Text>
                        </View>
                      </View>
                    );
                  })}
                </Glass>
              </Animated.View>
            )}

            {/* ═══ ADVANCED DOSHA COMPARISON ═══ */}
            {(data.brideAdvanced || data.groomAdvanced) && (
              <Animated.View entering={FadeInUp.delay(900).duration(700)}>
                <Glass style={sty.section}>
                  <View style={sty.secHeader}>
                    <View>
                      <Text style={sty.secTitle}>{'\uD83D\uDD2E'} {language === 'si' ? 'උසස් දෝෂ විශ්ලේෂණය' : 'Advanced Dosha Analysis'}</Text>
                      <Text style={sty.secSub}>{language === 'si' ? 'දෙදෙනාගේම ග්‍රහ දෝෂ සංසන්දනය' : 'Comparing planetary doshas for both parties'}</Text>
                    </View>
                  </View>

                  {/* Bride Doshas */}
                  {data.brideAdvanced?.tier1?.doshas?.items?.length > 0 && (
                    <View style={{ marginBottom: 14 }}>
                      <Text style={[sty.doshaName, { color: '#f9a8d4', marginBottom: 8 }]}>
                        {'\uD83D\uDC70'} {bName || (language === 'si' ? 'මනාලිය' : 'Bride')}
                      </Text>
                      {data.brideAdvanced.tier1.doshas.items.map(function(d, i) {
                        var col = d.cancelled ? '#10b981' : d.severity === 'Severe' ? '#ef4444' : d.severity === 'Moderate' ? '#f59e0b' : '#6b7280';
                        return (
                          <View key={i} style={sty.doshaItem}>
                            <View style={[sty.doshaIcon, { backgroundColor: col + '15' }]}>
                              <Ionicons name={d.cancelled ? 'checkmark-circle' : 'alert-circle'} size={16} color={col} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <Text style={[sty.doshaName, { fontSize: 13, marginBottom: 0 }, d.cancelled && { textDecorationLine: 'line-through', color: 'rgba(255,255,255,0.3)' }]}>{d.name}</Text>
                                <View style={{ backgroundColor: col + '25', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                  <Text style={{ color: col, fontSize: 8, fontWeight: '800' }}>{d.cancelled ? 'CANCELLED' : d.severity}</Text>
                                </View>
                              </View>
                              <Text style={sty.doshaDesc}>{d.description}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                  {data.brideAdvanced?.tier1?.doshas?.items?.length === 0 && (
                    <View style={{ marginBottom: 14 }}>
                      <Text style={[sty.doshaName, { color: '#f9a8d4', marginBottom: 6 }]}>
                        {'\uD83D\uDC70'} {bName || (language === 'si' ? 'මනාලිය' : 'Bride')}
                      </Text>
                      <Text style={[sty.doshaDesc, { color: '#10b981' }]}>{language === 'si' ? 'දෝෂ හමු නොවීය ✅' : 'No doshas detected ✅'}</Text>
                    </View>
                  )}

                  {/* Groom Doshas */}
                  {data.groomAdvanced?.tier1?.doshas?.items?.length > 0 && (
                    <View style={{ marginBottom: 8 }}>
                      <Text style={[sty.doshaName, { color: '#93c5fd', marginBottom: 8 }]}>
                        {'\uD83E\uDD35'} {gName || (language === 'si' ? 'මනාලයා' : 'Groom')}
                      </Text>
                      {data.groomAdvanced.tier1.doshas.items.map(function(d, i) {
                        var col = d.cancelled ? '#10b981' : d.severity === 'Severe' ? '#ef4444' : d.severity === 'Moderate' ? '#f59e0b' : '#6b7280';
                        return (
                          <View key={i} style={sty.doshaItem}>
                            <View style={[sty.doshaIcon, { backgroundColor: col + '15' }]}>
                              <Ionicons name={d.cancelled ? 'checkmark-circle' : 'alert-circle'} size={16} color={col} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <Text style={[sty.doshaName, { fontSize: 13, marginBottom: 0 }, d.cancelled && { textDecorationLine: 'line-through', color: 'rgba(255,255,255,0.3)' }]}>{d.name}</Text>
                                <View style={{ backgroundColor: col + '25', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                  <Text style={{ color: col, fontSize: 8, fontWeight: '800' }}>{d.cancelled ? 'CANCELLED' : d.severity}</Text>
                                </View>
                              </View>
                              <Text style={sty.doshaDesc}>{d.description}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                  {data.groomAdvanced?.tier1?.doshas?.items?.length === 0 && (
                    <View style={{ marginBottom: 8 }}>
                      <Text style={[sty.doshaName, { color: '#93c5fd', marginBottom: 6 }]}>
                        {'\uD83E\uDD35'} {gName || (language === 'si' ? 'මනාලයා' : 'Groom')}
                      </Text>
                      <Text style={[sty.doshaDesc, { color: '#10b981' }]}>{language === 'si' ? 'දෝෂ හමු නොවීය ✅' : 'No doshas detected ✅'}</Text>
                    </View>
                  )}
                </Glass>
              </Animated.View>
            )}

            {/* ═══ YOGA COMPARISON ═══ */}
            {(data.brideAdvanced?.tier1?.advancedYogas?.items?.length > 0 || data.groomAdvanced?.tier1?.advancedYogas?.items?.length > 0) && (
              <Animated.View entering={FadeInUp.delay(950).duration(700)}>
                <Glass style={sty.section}>
                  <View style={sty.secHeader}>
                    <View>
                      <Text style={sty.secTitle}>{'\u2728'} {language === 'si' ? 'යෝග සංසන්දනය' : 'Yoga Comparison'}</Text>
                      <Text style={sty.secSub}>{language === 'si' ? 'ප්‍රබල යෝග දෙදෙනාගේම' : 'Key yogas in both charts'}</Text>
                    </View>
                  </View>
                  {[
                    { label: bName || (language === 'si' ? 'මනාලිය' : 'Bride'), emoji: '\uD83D\uDC70', color: '#f9a8d4', yogas: data.brideAdvanced?.tier1?.advancedYogas?.items },
                    { label: gName || (language === 'si' ? 'මනාලයා' : 'Groom'), emoji: '\uD83E\uDD35', color: '#93c5fd', yogas: data.groomAdvanced?.tier1?.advancedYogas?.items },
                  ].map(function(person, pi) {
                    if (!person.yogas || person.yogas.length === 0) return null;
                    return (
                      <View key={pi} style={{ marginBottom: 14 }}>
                        <Text style={[sty.doshaName, { color: person.color, marginBottom: 8 }]}>{person.emoji} {person.label}</Text>
                        {person.yogas.slice(0, 6).map(function(y, yi) {
                          var catColor = y.category === 'Raja Yoga' ? '#c084fc' : y.category === 'Dhana Yoga' ? '#fbbf24' : '#60a5fa';
                          return (
                            <View key={yi} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8, paddingLeft: 4 }}>
                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: catColor, marginTop: 5 }} />
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: '#e0e7ff', fontSize: 13, fontWeight: '700' }}>{y.name}</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>{y.category} • {y.strength}</Text>
                              </View>
                            </View>
                          );
                        })}
                        {person.yogas.length > 6 && (
                          <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontStyle: 'italic', paddingLeft: 20 }}>
                            + {person.yogas.length - 6} more yogas
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </Glass>
              </Animated.View>
            )}

            {/* ═══ JAIMINI UPAPADA (Marriage Indicator) ═══ */}
            {(data.brideAdvanced?.tier1?.jaimini?.upapadaLagna || data.groomAdvanced?.tier1?.jaimini?.upapadaLagna) && (
              <Animated.View entering={FadeInUp.delay(980).duration(700)}>
                <Glass style={sty.section}>
                  <View style={sty.secHeader}>
                    <View>
                      <Text style={sty.secTitle}>{'\uD83E\uDDED'} {language === 'si' ? 'ජෛමිනි විවාහ විශ්ලේෂණය' : 'Jaimini Marriage Analysis'}</Text>
                      <Text style={sty.secSub}>{language === 'si' ? 'උපපද ලග්නය මගින් විවාහ ස්වභාවය' : 'Upapada Lagna reveals marriage nature'}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {data.brideAdvanced?.tier1?.jaimini && (
                      <View style={{ flex: 1, backgroundColor: 'rgba(249,168,212,0.06)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(249,168,212,0.12)' }}>
                        <Text style={{ color: '#f9a8d4', fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                          {'\uD83D\uDC70'} {bName || (language === 'si' ? 'මනාලිය' : 'Bride')}
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 2 }}>Atmakaraka</Text>
                        <Text style={{ color: '#e0e7ff', fontSize: 14, fontWeight: '700', marginBottom: 6 }}>{data.brideAdvanced.tier1.jaimini.atmakaraka?.planet || 'N/A'}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 2 }}>Upapada</Text>
                        <Text style={{ color: '#e0e7ff', fontSize: 14, fontWeight: '700' }}>{data.brideAdvanced.tier1.jaimini.upapadaLagna?.rashi || 'N/A'}</Text>
                      </View>
                    )}
                    {data.groomAdvanced?.tier1?.jaimini && (
                      <View style={{ flex: 1, backgroundColor: 'rgba(147,197,253,0.06)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(147,197,253,0.12)' }}>
                        <Text style={{ color: '#93c5fd', fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                          {'\uD83E\uDD35'} {gName || (language === 'si' ? 'මනාලයා' : 'Groom')}
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 2 }}>Atmakaraka</Text>
                        <Text style={{ color: '#e0e7ff', fontSize: 14, fontWeight: '700', marginBottom: 6 }}>{data.groomAdvanced.tier1.jaimini.atmakaraka?.planet || 'N/A'}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 2 }}>Upapada</Text>
                        <Text style={{ color: '#e0e7ff', fontSize: 14, fontWeight: '700' }}>{data.groomAdvanced.tier1.jaimini.upapadaLagna?.rashi || 'N/A'}</Text>
                      </View>
                    )}
                  </View>
                </Glass>
              </Animated.View>
            )}

            {/* ═══ PORONDAM+ COMBINED SCORE ═══ */}
            {data.advancedPorondam?.combined && (
              <Animated.View entering={ZoomIn.springify().damping(12).delay(1000)}>
                <Glass accent>
                  <View style={sty.secHeader}>
                    <View>
                      <Text style={sty.secTitle}>{T.advancedTitle}</Text>
                      <Text style={sty.secSub}>{T.advancedSub}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                      <Text style={{ fontSize: 42, fontWeight: '900', color: data.advancedPorondam.combined.percentage >= 65 ? '#34d399' : data.advancedPorondam.combined.percentage >= 45 ? '#fbbf24' : '#f87171' }}>
                        {data.advancedPorondam.combined.percentage}<Text style={{ fontSize: 20 }}>%</Text>
                      </Text>
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                      {data.advancedPorondam.combined.score}/{data.advancedPorondam.combined.maxScore} {T.combinedScore}
                    </Text>
                    <Text style={{ color: '#e0e7ff', fontSize: 16, fontWeight: '800', marginTop: 8 }}>
                      {data.advancedPorondam.combined.ratingEmoji} {data.advancedPorondam.combined.rating}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 20, marginTop: 14 }}>
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: '#c084fc', fontSize: 18, fontWeight: '800' }}>{data.totalScore}/{data.maxPossibleScore}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{language === 'si' ? 'සාම්ප්‍රදායික' : 'Traditional'}</Text>
                      </View>
                      <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: '#60a5fa', fontSize: 18, fontWeight: '800' }}>{data.advancedPorondam.advanced.advancedScore}/{data.advancedPorondam.advanced.advancedMaxScore}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{language === 'si' ? 'උසස්' : 'Advanced'}</Text>
                      </View>
                    </View>
                  </View>
                </Glass>
              </Animated.View>
            )}

            {/* ═══ DASHA COMPATIBILITY ═══ */}
            {data.advancedPorondam?.advanced?.dashaCompatibility && data.advancedPorondam.advanced.dashaCompatibility.harmony !== 'unknown' && (
              <Animated.View entering={FadeInUp.delay(1050).duration(700)}>
                <Glass style={sty.section}>
                  <View style={sty.secHeader}>
                    <View>
                      <Text style={sty.secTitle}>{T.dashaTitle}</Text>
                    </View>
                    <View style={{ backgroundColor: (data.advancedPorondam.advanced.dashaCompatibility.harmony === 'harmonious' ? '#34d399' : data.advancedPorondam.advanced.dashaCompatibility.harmony === 'conflicting' ? '#f87171' : '#fbbf24') + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ color: data.advancedPorondam.advanced.dashaCompatibility.harmony === 'harmonious' ? '#34d399' : data.advancedPorondam.advanced.dashaCompatibility.harmony === 'conflicting' ? '#f87171' : '#fbbf24', fontSize: 11, fontWeight: '800' }}>
                        {data.advancedPorondam.advanced.dashaCompatibility.score}/{data.advancedPorondam.advanced.dashaCompatibility.maxScore}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                    {[
                      { label: bName || (language === 'si' ? 'මනාලිය' : 'Bride'), emoji: '\uD83D\uDC70', color: '#f9a8d4', dasha: data.advancedPorondam.advanced.dashaCompatibility.bride },
                      { label: gName || (language === 'si' ? 'මනාලයා' : 'Groom'), emoji: '\uD83E\uDD35', color: '#93c5fd', dasha: data.advancedPorondam.advanced.dashaCompatibility.groom },
                    ].map(function(p, i) {
                      if (!p.dasha) return null;
                      return (
                        <View key={i} style={{ flex: 1, backgroundColor: p.color + '08', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: p.color + '15' }}>
                          <Text style={{ color: p.color, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>{p.emoji} {p.label}</Text>
                          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{T.currentPhase}</Text>
                          <Text style={{ color: '#e0e7ff', fontSize: 16, fontWeight: '800', marginBottom: 4 }}>{p.dasha.currentDasha}</Text>
                          <View style={{ backgroundColor: (p.dasha.isBeneficPeriod ? '#34d399' : '#f59e0b') + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' }}>
                            <Text style={{ color: p.dasha.isBeneficPeriod ? '#34d399' : '#f59e0b', fontSize: 9, fontWeight: '800' }}>
                              {p.dasha.isBeneficPeriod ? T.benefic : T.malefic}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 18 }}>
                    {data.advancedPorondam.advanced.dashaCompatibility.description}
                  </Text>
                </Glass>
              </Animated.View>
            )}

            {/* ═══ NAVAMSHA D9 COMPATIBILITY ═══ */}
            {data.advancedPorondam?.advanced?.navamshaCompatibility && (
              <Animated.View entering={FadeInUp.delay(1100).duration(700)}>
                <Glass style={sty.section}>
                  <View style={sty.secHeader}>
                    <View>
                      <Text style={sty.secTitle}>{T.navamshaTitle}</Text>
                    </View>
                    <View style={{ backgroundColor: (data.advancedPorondam.advanced.navamshaCompatibility.score >= 5 ? '#34d399' : data.advancedPorondam.advanced.navamshaCompatibility.score >= 3 ? '#fbbf24' : '#f87171') + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ color: data.advancedPorondam.advanced.navamshaCompatibility.score >= 5 ? '#34d399' : data.advancedPorondam.advanced.navamshaCompatibility.score >= 3 ? '#fbbf24' : '#f87171', fontSize: 11, fontWeight: '800' }}>
                        {data.advancedPorondam.advanced.navamshaCompatibility.score}/{data.advancedPorondam.advanced.navamshaCompatibility.maxScore}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                    <View style={{ flex: 1, alignItems: 'center', padding: 10, backgroundColor: 'rgba(249,168,212,0.06)', borderRadius: 12 }}>
                      <Text style={{ color: '#f9a8d4', fontSize: 10, fontWeight: '700' }}>{'\uD83D\uDC70'} D9 {language === 'si' ? 'ලග්නය' : 'Rising'}</Text>
                      <Text style={{ color: '#e0e7ff', fontSize: 15, fontWeight: '800', marginTop: 4 }}>{data.advancedPorondam.advanced.navamshaCompatibility.brideD9Lagna}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center', padding: 10, backgroundColor: 'rgba(147,197,253,0.06)', borderRadius: 12 }}>
                      <Text style={{ color: '#93c5fd', fontSize: 10, fontWeight: '700' }}>{'\uD83E\uDD35'} D9 {language === 'si' ? 'ලග්නය' : 'Rising'}</Text>
                      <Text style={{ color: '#e0e7ff', fontSize: 15, fontWeight: '800', marginTop: 4 }}>{data.advancedPorondam.advanced.navamshaCompatibility.groomD9Lagna}</Text>
                    </View>
                  </View>
                  {(data.advancedPorondam.advanced.navamshaCompatibility.insights || []).map(function(insight, i) {
                    return (
                      <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 6, paddingLeft: 4 }}>
                        <Text style={{ color: '#c084fc', fontSize: 12 }}>{'\u2728'}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, flex: 1, lineHeight: 18 }}>{insight}</Text>
                      </View>
                    );
                  })}
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 6, fontStyle: 'italic' }}>
                    {data.advancedPorondam.advanced.navamshaCompatibility.description}
                  </Text>
                </Glass>
              </Animated.View>
            )}

            {/* ═══ MANGALA DOSHA CROSS-CHECK ═══ */}
            {data.advancedPorondam?.advanced?.mangalaDosha && data.advancedPorondam.advanced.mangalaDosha.severity !== 'unknown' && (
              <Animated.View entering={FadeInUp.delay(1150).duration(700)}>
                <Glass style={sty.section}>
                  <View style={sty.secHeader}>
                    <View>
                      <Text style={sty.secTitle}>{T.mangalaTitle}</Text>
                    </View>
                    <View style={{ backgroundColor: (data.advancedPorondam.advanced.mangalaDosha.severity === 'none' || data.advancedPorondam.advanced.mangalaDosha.severity === 'cancelled' ? '#34d399' : data.advancedPorondam.advanced.mangalaDosha.severity === 'mild' ? '#fbbf24' : '#f87171') + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ color: data.advancedPorondam.advanced.mangalaDosha.severity === 'none' || data.advancedPorondam.advanced.mangalaDosha.severity === 'cancelled' ? '#34d399' : data.advancedPorondam.advanced.mangalaDosha.severity === 'mild' ? '#fbbf24' : '#f87171', fontSize: 11, fontWeight: '800' }}>
                        {data.advancedPorondam.advanced.mangalaDosha.score}/{data.advancedPorondam.advanced.mangalaDosha.maxScore}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                    {[
                      { label: bName || (language === 'si' ? 'මනාලිය' : 'Bride'), emoji: '\uD83D\uDC70', color: '#f9a8d4', mars: data.advancedPorondam.advanced.mangalaDosha.bride },
                      { label: gName || (language === 'si' ? 'මනාලයා' : 'Groom'), emoji: '\uD83E\uDD35', color: '#93c5fd', mars: data.advancedPorondam.advanced.mangalaDosha.groom },
                    ].map(function(p, i) {
                      if (!p.mars) return null;
                      var hasDosha = p.mars.hasDosha;
                      var icon = hasDosha ? (p.mars.cancelled ? 'checkmark-circle' : 'flame') : 'shield-checkmark';
                      var iconColor = hasDosha ? (p.mars.cancelled ? '#34d399' : '#f87171') : '#34d399';
                      return (
                        <View key={i} style={{ flex: 1, backgroundColor: p.color + '08', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: p.color + '15' }}>
                          <Text style={{ color: p.color, fontSize: 11, fontWeight: '700', marginBottom: 8 }}>{p.emoji} {p.label}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name={icon} size={16} color={iconColor} />
                            <Text style={{ color: '#e0e7ff', fontSize: 12, fontWeight: '600', flex: 1 }}>
                              {hasDosha
                                ? (language === 'si' ? 'කුජ දෝෂය — භාවය ' + p.mars.marsHouse : 'Mars Dosha — House ' + p.mars.marsHouse)
                                : (language === 'si' ? 'කුජ දෝෂ නැත' : 'No Mars Dosha')}
                            </Text>
                          </View>
                          {hasDosha && p.mars.cancelled && (
                            <Text style={{ color: '#34d399', fontSize: 10, fontWeight: '700', marginTop: 4, marginLeft: 22 }}>
                              {language === 'si' ? 'නිවිලා ✅' : 'Cancelled ✅'}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 18 }}>
                    {data.advancedPorondam.advanced.mangalaDosha.description}
                  </Text>
                </Glass>
              </Animated.View>
            )}

            {/* ═══ MARRIAGE PLANET STRENGTH ═══ */}
            {data.advancedPorondam?.advanced?.marriagePlanetStrength && (
              <Animated.View entering={FadeInUp.delay(1200).duration(700)}>
                <Glass style={sty.section}>
                  <View style={sty.secHeader}>
                    <View>
                      <Text style={sty.secTitle}>{T.marriageStrTitle}</Text>
                    </View>
                    <View style={{ backgroundColor: (data.advancedPorondam.advanced.marriagePlanetStrength.score >= 3 ? '#34d399' : data.advancedPorondam.advanced.marriagePlanetStrength.score >= 2 ? '#fbbf24' : '#f87171') + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ color: data.advancedPorondam.advanced.marriagePlanetStrength.score >= 3 ? '#34d399' : data.advancedPorondam.advanced.marriagePlanetStrength.score >= 2 ? '#fbbf24' : '#f87171', fontSize: 11, fontWeight: '800' }}>
                        {data.advancedPorondam.advanced.marriagePlanetStrength.score}/{data.advancedPorondam.advanced.marriagePlanetStrength.maxScore}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                    {[
                      { label: bName || (language === 'si' ? 'මනාලිය' : 'Bride'), emoji: '\uD83D\uDC70', color: '#f9a8d4', d: data.advancedPorondam.advanced.marriagePlanetStrength.bride },
                      { label: gName || (language === 'si' ? 'මනාලයා' : 'Groom'), emoji: '\uD83E\uDD35', color: '#93c5fd', d: data.advancedPorondam.advanced.marriagePlanetStrength.groom },
                    ].map(function(p, i) {
                      if (!p.d) return null;
                      var venusColor = p.d.venusAssessment === 'Strong' ? '#34d399' : p.d.venusAssessment === 'Moderate' ? '#fbbf24' : '#f87171';
                      var lordColor = p.d.seventhLordAssessment === 'Strong' ? '#34d399' : p.d.seventhLordAssessment === 'Moderate' ? '#fbbf24' : '#f87171';
                      return (
                        <View key={i} style={{ flex: 1, backgroundColor: p.color + '08', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: p.color + '15' }}>
                          <Text style={{ color: p.color, fontSize: 11, fontWeight: '700', marginBottom: 8 }}>{p.emoji} {p.label}</Text>
                          <View style={{ marginBottom: 8 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700' }}>{T.venus}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <View style={{ flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                                <View style={{ width: p.d.venusStrength + '%', height: 4, backgroundColor: venusColor, borderRadius: 2 }} />
                              </View>
                              <Text style={{ color: venusColor, fontSize: 10, fontWeight: '800' }}>{p.d.venusStrength}%</Text>
                            </View>
                          </View>
                          <View>
                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700' }}>{T.lord7} ({p.d.seventhLord})</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <View style={{ flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                                <View style={{ width: p.d.seventhLordStrength + '%', height: 4, backgroundColor: lordColor, borderRadius: 2 }} />
                              </View>
                              <Text style={{ color: lordColor, fontSize: 10, fontWeight: '800' }}>{p.d.seventhLordStrength}%</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 18 }}>
                    {data.advancedPorondam.advanced.marriagePlanetStrength.assessment}
                  </Text>
                </Glass>
              </Animated.View>
            )}

            {/* ═══ BEST WEDDING WINDOWS ═══ */}
            {data.advancedPorondam?.advanced?.weddingWindows?.favorableWindows?.length > 0 && (
              <Animated.View entering={FadeInUp.delay(1250).duration(700)}>
                <Glass style={sty.section}>
                  <Text style={sty.secTitle}>{T.weddingTitle}</Text>
                  {data.advancedPorondam.advanced.weddingWindows.favorableWindows.map(function(w, i) {
                    var hasDate = w.end && w.end.length > 0;
                    return (
                      <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: i < data.advancedPorondam.advanced.weddingWindows.favorableWindows.length - 1 ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(52,211,153,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="calendar" size={16} color="#34d399" />
                        </View>
                        <View style={{ flex: 1 }}>
                          {hasDate ? (
                            <Text style={{ color: '#e0e7ff', fontSize: 13, fontWeight: '700' }}>
                              {w.start} → {w.end}
                            </Text>
                          ) : (
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{T.noWindows}</Text>
                          )}
                          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 3, lineHeight: 16 }}>{w.reason}</Text>
                        </View>
                      </View>
                    );
                  })}
                </Glass>
              </Animated.View>
            )}

            <Animated.View entering={FadeInUp.delay(1300).duration(700)}>
              <Glass style={sty.section}>
                <View style={sty.secHeader}>
                  <View>
                    <Text style={sty.secTitle}>{'\uD83D\uDD2E'} {T.report}</Text>
                    <Text style={sty.secSub}>{T.reportQ}</Text>
                  </View>
                </View>
                <View style={sty.langRow}>
                  <TouchableOpacity style={[sty.langChip, reportLang === 'si' && sty.langChipActive]} onPress={function() { genReport('si'); }} disabled={reportLoading} activeOpacity={0.7}>
                    <Text style={[sty.langChipText, reportLang === 'si' && sty.langChipTextActive]}>{T.si}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[sty.langChip, reportLang === 'en' && sty.langChipActive]} onPress={function() { genReport('en'); }} disabled={reportLoading} activeOpacity={0.7}>
                    <Text style={[sty.langChipText, reportLang === 'en' && sty.langChipTextActive]}>{T.en}</Text>
                  </TouchableOpacity>
                </View>
                {reportLoading && (
                  <View style={sty.reportLoadRow}>
                    <ActivityIndicator color="#c084fc" size="small" />
                    <Text style={sty.reportLoadText}>{T.generating}</Text>
                  </View>
                )}
                {report && !reportLoading && (
                  <Animated.View entering={FadeIn.duration(500)}>
                    <View style={sty.reportBody}>
                      <MarkdownText>{report}</MarkdownText>
                    </View>
                  </Animated.View>
                )}
              </Glass>
            </Animated.View>
          </View>
        )}

        {/* ─── SAVED HISTORY ─── */}
        {isLoggedIn && !loading && (
          <Animated.View entering={FadeInUp.delay(data ? 1200 : 400).duration(700)}>
            <Glass style={sty.section}>
              <View style={sty.secHeader}>
                <View>
                  <Text style={sty.secTitle}>{'\uD83D\uDCCB'} {T.history}</Text>
                </View>
                {data && (
                  <TouchableOpacity style={sty.newCheckChip} activeOpacity={0.7}
                    onPress={function() {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setCollapsed(false); setData(null); setReport(null); setReportLang(null); setPorondamId(null); setError(null);
                    }}>
                    <Text style={sty.newCheckText}>{T.newCheck}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {historyLoading && (
                <View style={sty.historyLoadRow}>
                  <ActivityIndicator color="#c084fc" size="small" />
                  <Text style={sty.historyLoadText}>{T.historyLoading}</Text>
                </View>
              )}
              {!historyLoading && history.length === 0 && (
                <Text style={sty.historyEmpty}>{T.historyEmpty}</Text>
              )}
              {!historyLoading && history.map(function(item, idx) {
                var pct = item.maxScore > 0 ? Math.round((item.score / item.maxScore) * 100) : 0;
                var color = pct >= 75 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171';
                var isActive = porondamId === item.id;
                var dateStr = '';
                try {
                  var d = new Date(item.createdAt);
                  dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                } catch(e) {}
                return (
                  <TouchableOpacity key={item.id || idx} style={[sty.historyItem, isActive && sty.historyItemActive]}
                    activeOpacity={0.7} onPress={function() { loadSaved(item); }}>
                    <View style={[sty.historyPctCircle, { borderColor: color + '60' }]}>
                      <Text style={[sty.historyPctText, { color: color }]}>{pct}%</Text>
                    </View>
                    <View style={sty.historyInfo}>
                      <Text style={sty.historyNames} numberOfLines={1}>
                        {item.bride?.name || 'Bride'} & {item.groom?.name || 'Groom'}
                      </Text>
                      <Text style={sty.historyMeta}>
                        {item.score}/{item.maxScore} {'\u2022'} {item.ratingEmoji || ''} {language === 'si' && item.ratingSinhala ? item.ratingSinhala : (item.rating || '')}
                      </Text>
                      {dateStr ? <Text style={sty.historyDate}>{dateStr}</Text> : null}
                    </View>
                    <View style={sty.historyRight}>
                      {item.report ? (
                        <View style={sty.historyReportBadge}>
                          <Ionicons name="document-text" size={12} color="#34d399" />
                        </View>
                      ) : null}
                      <Ionicons name="chevron-forward" size={16} color="rgba(192,132,252,0.5)" />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Glass>
          </Animated.View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </CosmicBackground>
  );
}

// ======= STYLES =======
var sty = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: WIDE ? 32 : 16,
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    maxWidth: WIDE ? 960 : undefined,
    alignSelf: WIDE ? 'center' : undefined,
    width: WIDE ? '100%' : undefined,
  },
  title: { fontSize: WIDE ? 36 : 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: 'rgba(192,132,252,0.8)', marginBottom: 24, fontWeight: '500', letterSpacing: 0.3 },

  glass: {
    borderRadius: 20, overflow: 'hidden', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: WIDE ? 24 : 16, marginBottom: 14,
  },

  formRow: { flexDirection: 'row', gap: 14 },
  formCol: { flex: 1 },
  personCard: { paddingBottom: WIDE ? 20 : 14 },
  personLabel: { fontSize: 16, fontWeight: '800', color: '#e0e7ff', marginBottom: 14, letterSpacing: 0.3 },
  nameInput: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    color: '#fff', fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 12,
  },
  fieldTag: { fontSize: 10, fontWeight: '700', color: 'rgba(192,132,252,0.7)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6, marginTop: 4 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  numInput: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 11 : 8,
    color: '#fff', fontSize: 14, fontWeight: '600',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', textAlign: 'center', minWidth: 0,
  },
  sep: { color: 'rgba(255,255,255,0.2)', fontSize: 16, fontWeight: '300' },
  timeSep: { color: 'rgba(192,132,252,0.6)', fontSize: 20, fontWeight: '700' },
  timeHint: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 16, fontStyle: 'italic', textAlign: 'center' },

  cta: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', overflow: 'hidden', marginBottom: 8 },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },

  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, marginBottom: 14, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(192,132,252,0.15)', backgroundColor: 'rgba(192,132,252,0.06)',
  },
  editText: { color: '#c084fc', fontWeight: '600', fontSize: 13 },

  loadCenter: { alignItems: 'center', marginVertical: 30 },
  loadCard: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 40, borderColor: 'rgba(192,132,252,0.15)' },
  loadRing: { width: 90, height: 90, borderRadius: 45, opacity: 0.25, position: 'absolute', top: 34 },
  loadInner: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(15,5,25,0.9)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(192,132,252,0.3)',
  },
  loadText: { color: '#c084fc', fontSize: 15, fontWeight: '700', marginTop: 22, letterSpacing: 0.5 },
  errorText: { color: '#f87171', fontSize: 14, textAlign: 'center' },

  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  gaugeCircle: {
    width: 110, height: 110, borderRadius: 55, borderWidth: 2,
    borderColor: 'rgba(192,132,252,0.3)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  gaugePct: { fontSize: 36, fontWeight: '900' },
  gaugePctSign: { fontSize: 18, fontWeight: '700' },
  gaugeOf: { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '700', marginTop: 2 },
  gaugeInfo: { flex: 1 },
  gaugeRating: { fontSize: 18, fontWeight: '800', color: '#e0e7ff', marginBottom: 4 },
  gaugeHint: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '500', marginBottom: 12 },
  shareChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: 'rgba(192,132,252,0.1)', borderWidth: 1, borderColor: 'rgba(192,132,252,0.2)',
  },
  shareChipText: { color: '#c084fc', fontSize: 12, fontWeight: '700' },

  charts: { marginBottom: 6 },
  chartsWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  chartCol: { flex: 1, maxWidth: 440 },
  chartCard: { alignItems: 'center', paddingVertical: WIDE ? 20 : 16 },
  chartTitle: { fontSize: 14, fontWeight: '700', color: '#c084fc', marginBottom: 12, letterSpacing: 0.3 },
  heartBridge: { alignItems: 'center', marginVertical: -6, zIndex: 10 },
  heartBridgeWide: { marginVertical: 0, marginHorizontal: -10 },

  section: { marginBottom: 14 },
  secHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  secTitle: { fontSize: 17, fontWeight: '800', color: '#e0e7ff', letterSpacing: 0.2 },
  secSub: { fontSize: 12, color: 'rgba(192,132,252,0.6)', fontWeight: '500', marginTop: 2 },

  factorItem: { marginBottom: 16 },
  factorTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  factorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  factorDot: { width: 8, height: 8, borderRadius: 4 },
  factorName: { fontSize: 14, color: '#e0e7ff', fontWeight: '700' },
  factorSinhala: { fontSize: 12, color: 'rgba(192,132,252,0.5)', fontWeight: '500' },
  factorBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  factorBadgeText: { fontSize: 12, fontWeight: '800' },
  barTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  factorDesc: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 6, lineHeight: 18 },

  doshaItem: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  doshaIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(248,113,113,0.1)', alignItems: 'center', justifyContent: 'center' },
  doshaName: { fontSize: 14, color: '#fca5a5', fontWeight: '700', marginBottom: 3 },
  doshaDesc: { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 18 },

  langRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  langChip: {
    flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)',
  },
  langChipActive: { borderColor: '#c026d3', backgroundColor: 'rgba(192,38,211,0.15)' },
  langChipText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '700' },
  langChipTextActive: { color: '#e879f9' },
  reportLoadRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', paddingVertical: 20 },
  reportLoadText: { color: '#c084fc', fontSize: 13 },
  reportBody: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },

  // History styles
  newCheckChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(192,38,211,0.12)', borderWidth: 1, borderColor: 'rgba(192,38,211,0.25)',
  },
  newCheckText: { color: '#e879f9', fontSize: 12, fontWeight: '700' },
  historyLoadRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', paddingVertical: 20 },
  historyLoadText: { color: 'rgba(192,132,252,0.6)', fontSize: 13 },
  historyEmpty: { color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  historyItemActive: {
    backgroundColor: 'rgba(192,132,252,0.08)', borderRadius: 12,
    paddingHorizontal: 10, marginHorizontal: -6,
  },
  historyPctCircle: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  historyPctText: { fontSize: 13, fontWeight: '800' },
  historyInfo: { flex: 1 },
  historyNames: { fontSize: 14, fontWeight: '700', color: '#e0e7ff', marginBottom: 2 },
  historyMeta: { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
  historyDate: { fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 },
  historyRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyReportBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(52,211,153,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  reportText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 24 },
});
