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
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
  withSequence, withRepeat, Easing, interpolate,
} from 'react-native-reanimated';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import DesktopScreenWrapper, { useDesktopCtx } from '../../components/DesktopScreenWrapper';
import { DatePickerField, TimePickerField } from '../../components/CosmicDateTimePicker';
import SriLankanChart from '../../components/SriLankanChart';
import MarkdownText from '../../components/MarkdownText';
import SpringPressable from '../../components/effects/SpringPressable';
import CosmicLoader from '../../components/effects/CosmicLoader';
import CitySearchPicker from '../../components/CitySearchPicker';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePricing } from '../../contexts/PricingContext';
import api from '../../services/api';
import { Colors, Typography } from '../../constants/theme';
import { boxShadow, textShadow } from '../../utils/shadow';
import { generatePorondamHTML, loadLogoBase64 } from '../../utils/pdfReportGenerator';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: W } = Dimensions.get('window');
const WIDE = W >= 700;
const MOBILE_CHART = Math.min(W - 64, 300);

// Default birth city (Colombo)
var DEFAULT_CITY = { name: 'Colombo', country: 'Sri Lanka', countryCode: 'LK', lat: 6.9271, lng: 79.8612 };

// Glass Card
function Glass({ children, style, accent }) {
  return (
    <View style={[sty.glass, style]}>
      <LinearGradient
        colors={accent
          ? ['rgba(244,63,94,0.10)', 'rgba(255,140,0,0.08)', 'rgba(18,6,12,0.6)']
          : ['rgba(18,6,12,0.55)', 'rgba(14,4,10,0.45)', 'rgba(12,4,8,0.55)']}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      {children}
    </View>
  );
}

// Binary Star Orbit Animation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function BinaryStarOrbit({ pct, color }) {
  var orbit = useSharedValue(0);
  var pulse = useSharedValue(0.7);
  useEffect(function () {
    orbit.value = withRepeat(withTiming(360, { duration: 6000, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 1800 }), withTiming(0.7, { duration: 1800 })), -1);
  }, []);
  var star1Style = useAnimatedStyle(function () {
    var rad = orbit.value * Math.PI / 180;
    return { transform: [{ translateX: Math.cos(rad) * 34 }, { translateY: Math.sin(rad) * 14 }] };
  });
  var star2Style = useAnimatedStyle(function () {
    var rad = (orbit.value + 180) * Math.PI / 180;
    return { transform: [{ translateX: Math.cos(rad) * 34 }, { translateY: Math.sin(rad) * 14 }] };
  });
  var glowStyle = useAnimatedStyle(function () { return { opacity: pulse.value }; });

  return (
    <View style={{ width: 110, height: 110, alignItems: 'center', justifyContent: 'center' }}>
      {/* Orbit ring */}
      <View style={{ position: 'absolute', width: 92, height: 38, borderRadius: 46, borderWidth: 1, borderColor: color + '30', borderStyle: 'dashed' }} />
      {/* Glow */}
      <Animated.View style={[{ position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: color + '18' }, glowStyle]} />
      {/* Center */}
      <View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, borderColor: color + '60' }}>
        <LinearGradient colors={[color + '40', 'rgba(18,6,12,0.9)']} style={StyleSheet.absoluteFill} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: color, fontSize: 13, fontWeight: '900' }}>{pct}<Text style={{ fontSize: 7 }}>%</Text></Text>
        </View>
      </View>
      {/* Bride star */}
      <Animated.View style={[{ position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: '#F9A8D4', ...boxShadow('#F9A8D4', { width: 0, height: 0 }, 1, 6), elevation: 4 }, star1Style]} />
      {/* Groom star */}
      <Animated.View style={[{ position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: '#93C5FD', ...boxShadow('#93C5FD', { width: 0, height: 0 }, 1, 6), elevation: 4 }, star2Style]} />
    </View>
  );
}

// Score Gauge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ScoreGauge({ score, maxScore, rating, ratingEmoji, ratingSinhala, language, onShare, T }) {
  var pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  var color = pct >= 75 ? '#34D399' : pct >= 50 ? '#FFB800' : pct >= 30 ? '#F97316' : '#F87171';

  // Enhanced color-coded compatibility labels
  var cosmicLabel = pct >= 75
    ? (language === 'si' ? '✨ \u0DAF\u0DD2\u0DC0\u0DCA\u200D\u0DBA \u0D9C\u0DD0\u0DC5\u0DB4\u0DD3\u0DB8' : '✨ Celestial Union')
    : pct >= 50
    ? (language === 'si' ? '💫 \u0DAD\u0DCF\u0DBB\u0D9A\u0DCF \u0D9C\u0DD0\u0DC5\u0DB4\u0DD3\u0DB8' : '💫 Star-Crossed Harmony')
    : pct >= 30
    ? (language === 'si' ? '🌅 \u0DB6\u0DCA\u200D\u0DBB\u0DC4\u0DCA\u0DB8\u0DCF\u0DAB\u0DCA\u0DA9 \u0D9C\u0DCF\u0DAE\u0DCF\u0DC0' : '🌅 Cosmic Journey')
    : (language === 'si' ? '⚔️ \u0DA2\u0DCA\u200D\u0DBA\u0DDD\u0DAD\u0DD2\u0DC2 \u0D85\u0DB7\u0DD2\u0DBA\u0DDD\u0D9C\u0DBA' : '⚔️ Galactic Challenge');

  var label = language === 'si' && ratingSinhala ? ratingSinhala : rating;
  return (
    <Glass accent>
      <View style={sty.gaugeRow}>
        <BinaryStarOrbit pct={pct} color={color} />
        <View style={sty.gaugeInfo}>
          <Text style={[sty.gaugeCosmicLabel, { color: color }]}>{cosmicLabel}</Text>
          <Text style={sty.gaugeRating}>{ratingEmoji || '💍'} {label}</Text>
          <Text style={sty.gaugeScoreText}>{score}/{maxScore} {T.overall}</Text>
          <TouchableOpacity style={sty.shareChip} onPress={onShare} activeOpacity={0.7}>
            <Ionicons name="share-social-outline" size={14} color="#FF8C00" />
            <Text style={sty.shareChipText}>{T.shareBtn}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Glass>
  );
}

// Factor Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FactorBar({ f, index, language }) {
  var pct = f.maxScore > 0 ? f.score / f.maxScore : 0;
  var color = pct >= 0.75 ? '#34D399' : pct >= 0.5 ? '#FFB800' : pct >= 0.25 ? '#F97316' : '#F87171';
  var desc = language === 'si' && f.descriptionSinhala ? f.descriptionSinhala : f.description;
  return (
    <Animated.View entering={FadeInUp.delay(100 * index).duration(500)} style={sty.factorItem}>
      <View style={sty.factorTop}>
        <View style={sty.factorNameRow}>
          <View style={[sty.factorDot, { backgroundColor: color, ...boxShadow(color, { width: 0, height: 0 }, 0.8, 4) }]} />
          <Text style={sty.factorName}>{f.name}</Text>
          {f.sinhala ? <Text style={sty.factorSinhala}>{f.sinhala}</Text> : null}
        </View>
        <View style={[sty.factorBadge, { backgroundColor: color + '22', borderColor: color + '45' }]}>
          <Text style={[sty.factorBadgeText, { color: color }]}>{f.score}/{f.maxScore}</Text>
        </View>
      </View>
      <View style={sty.barTrack}>
        <Animated.View entering={FadeIn.delay(200 + 100 * index).duration(800)} style={[sty.barFill, { width: (pct * 100) + '%' }]}>
          <LinearGradient colors={[color, color + 'AA']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
        </Animated.View>
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
    birthPlace: 'Birth Place',
    timeHint: '* Check birth certificate for exact time',
    checkBtn: '\uD83D\uDC8D Check Compatibility',
    brideChart: "Bride's Kendara", groomChart: "Groom's Kendara",
    factors: 'Compatibility Factors', factorsSub: '7 Factors \u00B7 20 Points',
    doshas: 'Doshas', report: 'Astrology Report',
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
    title: '\u0DB4\u0DDC\u0DBB\u0DDC\u0DB1\u0DCA\u0DAF\u0DB8\u0DCA', subtitle: '\u0DC0\u0DD2\u0DC0\u0DCF\u0DC4 \u0D9C\u0DD0\u0DBD\u0DB4\u0DD3\u0DB8\u0DCA \u0DB4\u0DBB\u0DD3\u0D9A\u0DCA\u0DC2\u0DCF\u0DC0',
    bride: '\uD83D\uDC70 \u0DB8\u0DB1\u0DCF\u0DBD\u0DD2\u0DBA', groom: '\uD83E\uDD35 \u0DB8\u0DB1\u0DCF\u0DBD\u0DBA\u0DCF',
    namePh: '\u0DB1\u0DB8 (\u0D85\u0DC0\u0DC1\u0DCA\u200D\u0DBA \u0DB1\u0DB8\u0DCA)',
    yearPh: 'YYYY', monthPh: 'MM', dayPh: 'DD', hourPh: 'HH', minutePh: 'MM',
    date: '\u0D89\u0DB4\u0DB1\u0DCA \u0DAF\u0DD2\u0DB1\u0DBA', time: '\u0DC0\u0DDA\u0DBD\u0DCF\u0DC0',
    birthPlace: '\u0D8B\u0DB4\u0DB1\u0DCA \u0DC3\u0DCA\u0DAE\u0DCF\u0DB1\u0DBA',
    timeHint: '* \u0D89\u0DB4\u0DCA\u0DB4\u0DD0\u0DB1\u0DCA\u0DB1 \u0DB4\u0DAD\u0DCA\u200D\u0DBB\u0DBA\u0DDA \u0DC0\u0DDA\u0DBD\u0DCF\u0DC0 \u0DB6\u0DBD\u0DB1\u0DCA\u0DB1',
    checkBtn: '\uD83D\uDC8D \u0DB4\u0DDC\u0DBB\u0DDC\u0DB1\u0DCA\u0DAF\u0DB8\u0DCA \u0DB6\u0DBD\u0DB1\u0DCA\u0DB1',
    brideChart: '\u0DB8\u0DB1\u0DCF\u0DBD\u0DD2\u0DBA\u0D9C\u0DDA \u0D9A\u0DDA\u0DB1\u0DCA\u0DAF\u0DCA\u200D\u0DBB\u0DBA', groomChart: '\u0DB8\u0DB1\u0DCF\u0DBD\u0DBA\u0DCF\u0D9C\u0DDA \u0D9A\u0DDA\u0DB1\u0DCA\u0DAF\u0DCA\u200D\u0DBB\u0DBA',
    factors: '\u0DB4\u0DDC\u0DBB\u0DDC\u0DB1\u0DCA\u0DAF\u0DB8\u0DCA \u0DC3\u0DCF\u0DB0\u0D9A', factorsSub: '\u0DC3\u0DCF\u0DB0\u0D9A 7 \u00B7 \u0DBD\u0D9A\u0DD4\u0DAB\u0DD4 20',
    doshas: '\u0DAF\u0DDD\u0DC2', report: '\u0DA2\u0DCA\u200D\u0DBA\u0DDD\u0DAD\u0DD2\u0DC2 \u0DC0\u0DCF\u0DBB\u0DCA\u0DAD\u0DCF\u0DC0',
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
    advancedTitle: '\uD83D\uDD2E \u0D9C\u0DD0\u0DB9\u0DD4\u0DBB\u0DD4 \u0D9C\u0DD0\u0DBD\u0DB4\u0DD4\u0DB8',
    advancedSub: '\u0DC3\u0DCF\u0DB0\u0D9A 7 \u0D94\u0DB6\u0DCA\u0DB6\u0DA7',
    combinedScore: '\u0D91\u0D9A\u0DCF\u0DB6\u0DAF\u0DCA\u0DB0 \u0DBD\u0D9A\u0DD4\u0DAB\u0DD4',
    dashaTitle: '\uD83C\uDF00 \u0DA2\u0DD3\u0DC0\u0DD2\u0DAD \u0D85\u0DAF\u0DD2\u0DBA\u0DBB \u0D9C\u0DD0\u0DBD\u0DB4\u0DD4\u0DB8',
    currentPhase: '\u0DAF\u0DD0\u0DB1\u0DCA \u0D89\u0DB1\u0DCA\u0DB1 \u0D85\u0DAF\u0DD2\u0DBA\u0DBB',
    benefic: '\u0DC3\u0DD4\u0DB7\u0DBA\u0DD2',
    malefic: '\u0D85\u0DB7\u0DD2\u0DBA\u0DDC\u0D9C\u0DCF\u0DAD\u0DCA\u0DB8\u0D9A',
    navamshaTitle: '\uD83D\uDC9E \u0DC0\u0DD2\u0DC0\u0DCF\u0DC4 \u0D9A\u0DDA\u0DB1\u0DCA\u0DAF\u0DBB\u0DBA (D9)',
    mangalaTitle: '\u2694\uFE0F \u0D9A\u0DD4\u0DA2 \u0DC1\u0D9A\u0DCA\u0DAD\u0DD2 \u0DB4\u0DBB\u0DD3\u0D9A\u0DCA\u0DC2\u0DCF\u0DC0',
    marriageStrTitle: '\uD83D\uDC8E \u0DC0\u0DD2\u0DC0\u0DCF\u0DC4 \u0D9C\u0DCA\u200D\u0DBB\u0DC4 \u0DC1\u0D9A\u0DCA\u0DAD\u0DD2\u0DBA',
    venus: '\u0DC3\u0DD2\u0D9A\u0DD4\u0DBB\u0DD4',
    lord7: '7 \u0DC0\u0DB1 \u0D85\u0DB0\u0DD2\u0DB4\u0DAD\u0DD2',
    weddingTitle: '\uD83D\uDCC5 \u0DC4\u0DDC\u0DB3\u0DB8 \u0DC0\u0DD2\u0DC0\u0DCF\u0DC4 \u0D9A\u0DCF\u0DBD',
    noWindows: '\u0D9C\u0DD0\u0DBD\u0DB4\u0DD9\u0DB1 \u0DC3\u0DD4\u0DB7 \u0D9A\u0DCF\u0DBD\u0DBA\u0D9A\u0DCA \u0DC4\u0DB8\u0DD4 \u0DB1\u0DDC\u0DC0\u0DD4\u0DBA',
  },
};

// Person Input Card (with cosmic date/time pickers + CitySearchPicker)
function PersonCard({ label, name, setName, dateStr, setDateStr, timeStr, setTimeStr, city, setCity, T, lang }) {
  return (
    <Glass style={sty.personCard}>
      <Text style={sty.personLabel}>{label}</Text>
      <TextInput style={sty.nameInput} value={name} onChangeText={setName} placeholder={T.namePh} placeholderTextColor="rgba(255,255,255,0.2)" />
      <Text style={sty.fieldTag}>{T.date}</Text>
      <DatePickerField value={dateStr} onChange={setDateStr} lang={lang} />
      <Text style={[sty.fieldTag, { marginTop: 12 }]}>{T.time}</Text>
      <TimePickerField value={timeStr} onChange={setTimeStr} lang={lang} />
      <Text style={[sty.fieldTag, { marginTop: 12 }]}>{T.birthPlace}</Text>
      <CitySearchPicker
        selectedCity={city}
        onSelect={setCity}
        lang={lang}
        accentColor="#FF8C00"
        maxHeight={160}
        compact
      />
    </Glass>
  );
}

// ======= MAIN SCREEN =======
export default function PorondamScreen() {
  var { language } = useLanguage();
  var { isLoggedIn } = useAuth();
  var { priceLabel, priceAmount, currency } = usePricing();
  var T = L[language] || L.en;
  var isDesktop = useDesktopCtx();

  var [bDate, setBDate] = useState('1998-01-15');
  var [bTime, setBTime] = useState('08:30');
  var [bName, setBName] = useState('');
  var [bCity, setBCity] = useState(DEFAULT_CITY);

  var [gDate, setGDate] = useState('1998-06-20');
  var [gTime, setGTime] = useState('10:00');
  var [gName, setGName] = useState('');
  var [gCity, setGCity] = useState(DEFAULT_CITY);

  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState(null);
  var [collapsed, setCollapsed] = useState(false);
  var scrollRef = useRef(null);
  var [report, setReport] = useState(null);
  var [reportLoading, setReportLoading] = useState(false);
  var [reportLang, setReportLang] = useState(language || 'en');
  var [porondamId, setPorondamId] = useState(null);
  var [paymentLoading, setPaymentLoading] = useState(false);

  // Sync report language when app language changes (only when no data yet)
  useEffect(function() {
    if (!data) setReportLang(language || 'en');
  }, [language]);

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

  function buildDateISO(dateStr, timeStr) {
    return dateStr + 'T' + (timeStr || '12:00') + ':00';
  }

  var check = useCallback(async function() {
    if (!bDate || !gDate) {
      Alert.alert('', T.missing); return;
    }
    try {
      setLoading(true); setError(null); setData(null); setReport(null); setPorondamId(null);

      // Step 1: Initiate PayHere one-time payment
      setPaymentLoading(true);
      var initRes = await api.initiateTopUp(priceAmount('porondam'), currency);
      if (!initRes || !initRes.success) {
        throw new Error(initRes?.error || 'Failed to initiate payment');
      }
      var paymentObject = initRes.paymentObject;
      var orderId = initRes.orderId;

      // Step 2: Launch PayHere SDK / web checkout
      var PayHere = null;
      var useWebCheckout = false;
      try {
        PayHere = require('@payhere/payhere-mobilesdk-reactnative').default;
      } catch (e) {
        useWebCheckout = true;
      }

      var paymentId = null;

      if (useWebCheckout) {
        // Web fallback: open PayHere checkout in new tab
        var checkoutUrl = initRes.checkout_url || 'https://sandbox.payhere.lk/pay/checkout';
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
          var form = document.createElement('form');
          form.method = 'POST';
          form.action = checkoutUrl;
          form.target = '_blank';
          Object.keys(paymentObject).forEach(function(key) {
            if (paymentObject[key] !== undefined && paymentObject[key] !== null) {
              var input = document.createElement('input');
              input.type = 'hidden';
              input.name = key;
              input.value = String(paymentObject[key]);
              form.appendChild(input);
            }
          });
          document.body.appendChild(form);
          form.submit();
          document.body.removeChild(form);
          // For web, proceed optimistically (webhook confirms)
          paymentId = 'web_' + Date.now();
        } else {
          throw new Error('Payment not available on this platform');
        }
      } else {
        // Native SDK payment
        paymentId = await new Promise(function(resolve, reject) {
          PayHere.startPayment(
            paymentObject,
            function(pid) { resolve(pid); },
            function(errData) { reject(new Error(errData || 'Payment failed')); },
            function() { reject(new Error('Payment cancelled')); }
          );
        });
      }

      setPaymentLoading(false);

      // Step 3: Confirm payment with server
      try {
        await api.confirmPayment(paymentId, orderId, 'topup');
      } catch (e) {
        // Webhook will handle it — continue
      }

      // Step 4: Generate porondam check + AI report in parallel
      var brideData = { birthDate: buildDateISO(bDate, bTime), lat: bCity.lat, lng: bCity.lng, name: bName || undefined };
      var groomData = { birthDate: buildDateISO(gDate, gTime), lat: gCity.lat, lng: gCity.lng, name: gName || undefined };

      var checkRes = await api.checkPorondam(brideData, groomData);
      setData(checkRes.data);
      if (checkRes.porondamId) setPorondamId(checkRes.porondamId);

      // Fire AI report generation
      setReportLoading(true);
      try {
        var reportRes = await api.getPorondamReport(checkRes.data, reportLang, bName || undefined, gName || undefined, checkRes.porondamId || undefined);
        setReport(reportRes.report);
        if (reportRes.porondamId) setPorondamId(reportRes.porondamId);
      } catch (rErr) {
        setReport(reportLang === 'si' ? '\u0DC0\u0DCF\u0DBB\u0DCA\u0DAD\u0DCF\u0DC0 \u0DC4\u0DAF\u0DB1\u0DCA\u0DB1 \u0DB6\u0DD0\u0DBB\u0DD2 \u0DC0\u0DD4\u0DB1\u0DCF.' : 'Failed to generate report.');
      } finally {
        setReportLoading(false);
      }

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCollapsed(true);
      setTimeout(function() { if (scrollRef.current) scrollRef.current.scrollTo({ y: 0, animated: true }); }, 300);
    } catch (e) {
      var msg = e.message || 'Error';
      if (msg === 'Payment cancelled') {
        // User cancelled — just stop loading
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
      setPaymentLoading(false);
    }
  }, [bDate, bTime, gDate, gTime, bCity, gCity, bName, gName, T, isLoggedIn, reportLang]);

  
  // â”€â”€ DOWNLOAD PORONDAM AS PDF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  var handleDownloadPDF = async function() {
    if (!data) return;
    try {
      var isSi = language === 'si';

      var logoB64 = await loadLogoBase64();

      var html = generatePorondamHTML({
        lang: language,
        data: data,
        brideName: bName || (isSi ? '\u0DB8\u0DB1\u0DCF\u0DBD\u0DD2\u0DBA' : 'Bride'),
        groomName: gName || (isSi ? '\u0DB8\u0DB1\u0DCF\u0DBD\u0DBA\u0DCF' : 'Groom'),
        report: report,
        logoBase64: logoB64,
      });

      var fileName = 'NekathAI_Porondam_' + (bName || 'Bride').replace(/\s+/g, '_') + '_' + (gName || 'Groom').replace(/\s+/g, '_') + '.pdf';

      if (Platform.OS === 'web') {
        var printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.print();
        }
      } else {
        var result = await Print.printToFileAsync({ html: html, base64: false });
        await Sharing.shareAsync(result.uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: fileName });
      }
    } catch (err) {
      Alert.alert('❌', err.message || (isSi ? 'PDF \u0DC3\u0DD0\u0D9A\u0DC3\u0DD3\u0DB8\u0DA7 \u0D85\u0DC3\u0DB8\u0DAD\u0DCA \u0DC0\u0DD2\u0DBA' : 'Failed to generate PDF'));
    }
  };

  var shareResult = async function() {
    try {
      var msg = language === 'si'
        ? '\u0DB4\u0DDC\u0DBB\u0DDC\u0DB1\u0DCA\u0DAF\u0DB8\u0DCA: ' + data.totalScore + '/' + data.maxPossibleScore + ' (' + data.percentage + '%) \u2014 ' + (data.ratingSinhala || data.rating) + '\n\nGrahachara \uD83D\uDC8D'
        : 'Porondam: ' + data.totalScore + '/' + data.maxPossibleScore + ' (' + data.percentage + '%) \u2014 ' + data.rating + '\n\nGrahachara \uD83D\uDC8D';
      await Share.share({ message: msg });
    } catch (e) {}
  };

  return (
    <DesktopScreenWrapper routeName="porondam">
    <View style={{ flex: 1, backgroundColor: '#0C0208' }}>
      <ScrollView ref={scrollRef} style={sty.flex} contentContainerStyle={[sty.scroll, isDesktop && sty.scrollDesktop]} showsVerticalScrollIndicator={false}>
        <View style={[sty.scrollInner, isDesktop && sty.scrollInnerDesktop]}>

        <Animated.View entering={FadeInDown.duration(600)}>
          <Text style={sty.title}>{T.title}</Text>
          <Text style={sty.subtitle}>{T.subtitle}</Text>
        </Animated.View>
        {!collapsed && (
          <View>
            <View style={WIDE ? sty.formRow : undefined}>
              <Animated.View entering={FadeInDown.delay(100).duration(600)} exiting={FadeOut.duration(300)} style={WIDE ? sty.formCol : undefined}>
                <PersonCard label={T.bride} name={bName} setName={setBName}
                  dateStr={bDate} setDateStr={setBDate} timeStr={bTime} setTimeStr={setBTime}
                  city={bCity} setCity={setBCity}
                  T={T} lang={language} />
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(180).duration(600)} exiting={FadeOut.duration(300)} style={WIDE ? sty.formCol : undefined}>
                <PersonCard label={T.groom} name={gName} setName={setGName}
                  dateStr={gDate} setDateStr={setGDate} timeStr={gTime} setTimeStr={setGTime}
                  city={gCity} setCity={setGCity}
                  T={T} lang={language} />
              </Animated.View>
            </View>
            <Text style={sty.timeHint}>{T.timeHint}</Text>

            {/* Language Selector */}
            <Animated.View entering={FadeInDown.delay(220).duration(600)}>
              <Glass style={{ marginBottom: 14 }}>
                <Text style={{ color: 'rgba(255,140,0,0.7)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
                  {language === 'si' ? '\u0DC0\u0DCF\u0DBB\u0DCA\u0DAD\u0DCF\u0DC0\u0DDA \u0DB7\u0DCF\u0DC2\u0DCF\u0DC0' : 'REPORT LANGUAGE'}
                </Text>
                <View style={sty.langRow}>
                  <TouchableOpacity style={[sty.langChip, reportLang === 'si' && sty.langChipActive]} onPress={function() { setReportLang('si'); }} activeOpacity={0.7}>
                    <Text style={{ fontSize: 18, marginRight: 6 }}>{'\uD83C\uDDF1\uD83C\uDDF0'}</Text>
                    <Text style={[sty.langChipText, reportLang === 'si' && sty.langChipTextActive]}>{T.si}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[sty.langChip, reportLang === 'en' && sty.langChipActive]} onPress={function() { setReportLang('en'); }} activeOpacity={0.7}>
                    <Text style={{ fontSize: 18, marginRight: 6 }}>{'\uD83C\uDDEC\uD83C\uDDE7'}</Text>
                    <Text style={[sty.langChipText, reportLang === 'en' && sty.langChipTextActive]}>{T.en}</Text>
                  </TouchableOpacity>
                </View>
                {/* Payment info */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <Ionicons name="card-outline" size={13} color="rgba(251,191,36,0.6)" />
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                    {language === 'si' ? 'PayHere ඔස්සේ ' + priceLabel('porondam') + ' ගෙවන්න (Visa/MasterCard)' : priceLabel('porondam') + ' via PayHere (Visa/MasterCard)'}
                  </Text>
                </View>
              </Glass>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(250).duration(600)}>
              <SpringPressable style={sty.cta} onPress={check} disabled={loading} haptic="heavy" scalePressed={0.93}>
                <LinearGradient colors={['#FF8C00', '#FF6D00', '#E65100']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                <LinearGradient colors={['rgba(255,255,255,0.20)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', borderTopLeftRadius: 16, borderTopRightRadius: 16 }} />
                {loading ? <CosmicLoader size={28} color="#fff" /> : <Text style={sty.ctaText}>{T.checkBtn}</Text>}
              </SpringPressable>
            </Animated.View>
          </View>
        )}

        {collapsed && !loading && (
          <Animated.View entering={FadeIn.delay(200).duration(400)}>
            <SpringPressable style={sty.editBtn} haptic="light"
              onPress={function() { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setCollapsed(false); }}>
              <Ionicons name="pencil" size={14} color="#FF8C00" />
              <Text style={sty.editText}>{T.edit}</Text>
            </SpringPressable>
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

            {/* Action buttons row */}
            <Animated.View entering={FadeIn.delay(200).duration(400)}>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <TouchableOpacity
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,140,0,0.25)', backgroundColor: 'rgba(255,140,0,0.06)' }}
                  activeOpacity={0.7}
                  onPress={function() {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setCollapsed(false); setData(null); setReport(null); setPorondamId(null); setError(null);
                  }}>
                  <Ionicons name="refresh" size={15} color="#FF8C00" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#FF8C00', fontSize: 13, fontWeight: '700' }}>{language === 'si' ? '\u0D85\u0DBD\u0DD4\u0DAD\u0DCA \u0DB4\u0DBB\u0DD3\u0D9A\u0DCA\u0DC2\u0DCF\u0DC0' : 'New Check'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,184,0,0.35)', backgroundColor: 'rgba(255,184,0,0.08)' }}
                  activeOpacity={0.7}
                  onPress={handleDownloadPDF}>
                  <Ionicons name="download-outline" size={15} color="#FFB800" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#FFB800', fontSize: 13, fontWeight: '700' }}>{language === 'si' ? 'PDF \u0DB6\u0DCF\u0D9C\u0DB1\u0DCA\u0DB1' : 'Download PDF'}</Text>
                </TouchableOpacity>
              </View>
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

            {/* â•â•â• ADVANCED DOSHA COMPARISON â•â•â• */}
            {(data.brideAdvanced || data.groomAdvanced) && (
              <Animated.View entering={FadeInUp.delay(900).duration(700)}>
                <Glass style={sty.section}>
                  <View style={sty.secHeader}>
                    <View>
                      <Text style={sty.secTitle}>{'\uD83D\uDD2E'} {language === 'si' ? '\u0D8B\u0DC3\u0DC3\u0DCA \u0DAF\u0DDD\u0DC2 \u0DC0\u0DD2\u0DC1\u0DCA\u0DBD\u0DDA\u0DC2\u0DAB\u0DBA' : 'Advanced Dosha Analysis'}</Text>
                      <Text style={sty.secSub}>{language === 'si' ? '\u0DAF\u0DD9\u0DAF\u0DD9\u0DB1\u0DCF\u0D9C\u0DDA\u0DB8 \u0D9C\u0DCA\u200D\u0DBB\u0DC4 \u0DAF\u0DDD\u0DC2 \u0DC3\u0D82\u0DC3\u0DB1\u0DCA\u0DAF\u0DB1\u0DBA' : 'Comparing planetary doshas for both parties'}</Text>
                    </View>
                  </View>

                  {/* Bride Doshas */}
                  {data.brideAdvanced?.tier1?.doshas?.items?.length > 0 && (
                    <View style={{ marginBottom: 14 }}>
                      <Text style={[sty.doshaName, { color: '#f9a8d4', marginBottom: 8 }]}>
                        {'\uD83D\uDC70'} {bName || (language === 'si' ? '\u0DB8\u0DB1\u0DCF\u0DBD\u0DD2\u0DBA' : 'Bride')}
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
                                  <Text style={{ color: col, fontSize: 8, fontWeight: '800' }}>{d.cancelled ? (language === 'si' ? '\u0DB1\u0DD2\u0DC0\u0DCF\u0DBB\u0DAB\u0DBA' : 'CANCELLED') : (language === 'si' ? (d.severity === 'Severe' ? '\u0DAF\u0DBB\u0DD4\u0DAB\u0DD4' : d.severity === 'Moderate' ? '\u0DB8\u0DB0\u0DCA\u200D\u0DBA\u0DB8' : '\u0DC3\u0DD4\u0DC5\u0DD4') : d.severity)}</Text>
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
                        {'\uD83D\uDC70'} {bName || (language === 'si' ? '\u0DB8\u0DB1\u0DCF\u0DBD\u0DD2\u0DBA' : 'Bride')}
                      </Text>
                      <Text style={[sty.doshaDesc, { color: '#10b981' }]}>{language === 'si' ? '\u0DAF\u0DDD\u0DC2 \u0DC4\u0DB8\u0DD4 \u0DB1\u0DDC\u0DC0\u0DD3\u0DBA ✅' : 'No doshas detected ✅'}</Text>
                    </View>
                  )}

                  {/* Groom Doshas */}
                  {data.groomAdvanced?.tier1?.doshas?.items?.length > 0 && (
                    <View style={{ marginBottom: 8 }}>
                      <Text style={[sty.doshaName, { color: '#93c5fd', marginBottom: 8 }]}>
                        {'\uD83E\uDD35'} {gName || (language === 'si' ? '\u0DB8\u0DB1\u0DCF\u0DBD\u0DBA\u0DCF' : 'Groom')}
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
                                  <Text style={{ color: col, fontSize: 8, fontWeight: '800' }}>{d.cancelled ? (language === 'si' ? '\u0DB1\u0DD2\u0DC0\u0DCF\u0DBB\u0DAB\u0DBA' : 'CANCELLED') : (language === 'si' ? (d.severity === 'Severe' ? '\u0DAF\u0DBB\u0DD4\u0DAB\u0DD4' : d.severity === 'Moderate' ? '\u0DB8\u0DB0\u0DCA\u200D\u0DBA\u0DB8' : '\u0DC3\u0DD4\u0DC5\u0DD4') : d.severity)}</Text>
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
                        {'\uD83E\uDD35'} {gName || (language === 'si' ? '\u0DB8\u0DB1\u0DCF\u0DBD\u0DBA\u0DCF' : 'Groom')}
                      </Text>
                      <Text style={[sty.doshaDesc, { color: '#10b981' }]}>{language === 'si' ? '\u0DAF\u0DDD\u0DC2 \u0DC4\u0DB8\u0DD4 \u0DB1\u0DDC\u0DC0\u0DD3\u0DBA ✅' : 'No doshas detected ✅'}</Text>
                    </View>
                  )}
                </Glass>
              </Animated.View>
            )}

            {/* â•â•â• YOGA COMPARISON â•â•â• */}
            {(data.brideAdvanced?.tier1?.advancedYogas?.items?.length > 0 || data.groomAdvanced?.tier1?.advancedYogas?.items?.length > 0) && (
              <Animated.View entering={FadeInUp.delay(950).duration(700)}>
                <Glass style={sty.section}>
                  <View style={sty.secHeader}>
                    <View>
                      <Text style={sty.secTitle}>{'\u2728'} {language === 'si' ? '\u0DBA\u0DDD\u0D9C \u0DC3\u0D82\u0DC3\u0DB1\u0DCA\u0DAF\u0DB1\u0DBA' : 'Yoga Comparison'}</Text>
                      <Text style={sty.secSub}>{language === 'si' ? '\u0DB4\u0DCA\u200D\u0DBB\u0DB6\u0DBD \u0DBA\u0DDD\u0D9C \u0DAF\u0DD9\u0DAF\u0DD9\u0DB1\u0DCF\u0D9C\u0DDA\u0DB8' : 'Key yogas in both charts'}</Text>
                    </View>
                  </View>
                  {[
                    { label: bName || (language === 'si' ? '\u0DB8\u0DB1\u0DCF\u0DBD\u0DD2\u0DBA' : 'Bride'), emoji: '\uD83D\uDC70', color: '#f9a8d4', yogas: data.brideAdvanced?.tier1?.advancedYogas?.items },
                    { label: gName || (language === 'si' ? '\u0DB8\u0DB1\u0DCF\u0DBD\u0DBA\u0DCF' : 'Groom'), emoji: '\uD83E\uDD35', color: '#93c5fd', yogas: data.groomAdvanced?.tier1?.advancedYogas?.items },
                  ].map(function(person, pi) {
                    if (!person.yogas || person.yogas.length === 0) return null;
                    return (
                      <View key={pi} style={{ marginBottom: 14 }}>
                        <Text style={[sty.doshaName, { color: person.color, marginBottom: 8 }]}>{person.emoji} {person.label}</Text>
                        {person.yogas.slice(0, 6).map(function(y, yi) {
                          var catColor = y.category === 'Raja Yoga' ? '#FF8C00' : y.category === 'Dhana Yoga' ? '#FFB800' : '#60a5fa';
                          return (
                            <View key={yi} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8, paddingLeft: 4 }}>
                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: catColor, marginTop: 5 }} />
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: '#FFE8B0', fontSize: 13, fontWeight: '700' }}>{y.name}</Text>
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

            {/* â•â•â• JAIMINI UPAPADA (Marriage Indicator) â•â•â• */}
            {(data.brideAdvanced?.tier1?.jaimini?.upapadaLagna || data.groomAdvanced?.tier1?.jaimini?.upapadaLagna) && (
              <Animated.View entering={FadeInUp.delay(980).duration(700)}>
                <Glass style={sty.section}>
                  <View style={sty.secHeader}>
                    <View>
                      <Text style={sty.secTitle}>{'\uD83E\uDDED'} {language === 'si' ? '\u0DA2\u0DDB\u0DB8\u0DD2\u0DB1\u0DD2 \u0DC0\u0DD2\u0DC0\u0DCF\u0DC4 \u0DC0\u0DD2\u0DC1\u0DCA\u0DBD\u0DDA\u0DC2\u0DAB\u0DBA' : 'Jaimini Marriage Analysis'}</Text>
                      <Text style={sty.secSub}>{language === 'si' ? '\u0D8B\u0DB4\u0DB4\u0DAF \u0DBD\u0D9C\u0DCA\u0DB1\u0DBA \u0DB8\u0D9C\u0DD2\u0DB1\u0DCA \u0DC0\u0DD2\u0DC0\u0DCF\u0DC4 \u0DC3\u0DCA\u0DC0\u0DB7\u0DCF\u0DC0\u0DBA' : 'Upapada Lagna reveals marriage nature'}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {data.brideAdvanced?.tier1?.jaimini && (
                      <View style={{ flex: 1, backgroundColor: 'rgba(249,168,212,0.06)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(249,168,212,0.12)' }}>
                        <Text style={{ color: '#f9a8d4', fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                          {'\uD83D\uDC70'} {bName || (language === 'si' ? '\u0DB8\u0DB1\u0DCF\u0DBD\u0DD2\u0DBA' : 'Bride')}
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 2 }}>Atmakaraka</Text>
                        <Text style={{ color: '#FFE8B0', fontSize: 14, fontWeight: '700', marginBottom: 6 }}>{data.brideAdvanced.tier1.jaimini.atmakaraka?.planet || 'N/A'}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 2 }}>Upapada</Text>
                        <Text style={{ color: '#FFE8B0', fontSize: 14, fontWeight: '700' }}>{data.brideAdvanced.tier1.jaimini.upapadaLagna?.rashi || 'N/A'}</Text>
                      </View>
                    )}
                    {data.groomAdvanced?.tier1?.jaimini && (
                      <View style={{ flex: 1, backgroundColor: 'rgba(147,197,253,0.06)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(147,197,253,0.12)' }}>
                        <Text style={{ color: '#93c5fd', fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                          {'\uD83E\uDD35'} {gName || (language === 'si' ? '\u0DB8\u0DB1\u0DCF\u0DBD\u0DBA\u0DCF' : 'Groom')}
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 2 }}>Atmakaraka</Text>
                        <Text style={{ color: '#FFE8B0', fontSize: 14, fontWeight: '700', marginBottom: 6 }}>{data.groomAdvanced.tier1.jaimini.atmakaraka?.planet || 'N/A'}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 2 }}>Upapada</Text>
                        <Text style={{ color: '#FFE8B0', fontSize: 14, fontWeight: '700' }}>{data.groomAdvanced.tier1.jaimini.upapadaLagna?.rashi || 'N/A'}</Text>
                      </View>
                    )}
                  </View>
                </Glass>
              </Animated.View>
            )}

            {/* â•â•â• PORONDAM+ COMBINED SCORE â•â•â• */}
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
                      <Text style={{ fontSize: 42, fontWeight: '900', color: data.advancedPorondam.combined.percentage >= 65 ? '#34d399' : data.advancedPorondam.combined.percentage >= 45 ? '#FFB800' : '#f87171' }}>
                        {data.advancedPorondam.combined.percentage}<Text style={{ fontSize: 20 }}>%</Text>
                      </Text>
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                      {data.advancedPorondam.combined.score}/{data.advancedPorondam.combined.maxScore} {T.combinedScore}
                    </Text>
                    <Text style={{ color: '#FFE8B0', fontSize: 16, fontWeight: '800', marginTop: 8 }}>
                      {data.advancedPorondam.combined.ratingEmoji} {data.advancedPorondam.combined.rating}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 20, marginTop: 14 }}>
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: '#FF8C00', fontSize: 18, fontWeight: '800' }}>{data.totalScore}/{data.maxPossibleScore}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{language === 'si' ? '\u0DC3\u0DCF\u0DB8\u0DCA\u0DB4\u0DCA\u200D\u0DBB\u0DAF\u0DCF\u0DBA\u0DD2\u0D9A' : 'Traditional'}</Text>
                      </View>
                      <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: '#60a5fa', fontSize: 18, fontWeight: '800' }}>{data.advancedPorondam.advanced.advancedScore}/{data.advancedPorondam.advanced.advancedMaxScore}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{language === 'si' ? '\u0D8B\u0DC3\u0DC3\u0DCA' : 'Advanced'}</Text>
                      </View>
                    </View>
                  </View>
                </Glass>
              </Animated.View>
            )}

            {/* â•â•â• DASHA COMPATIBILITY â•â•â• */}
            {data.advancedPorondam?.advanced?.dashaCompatibility && data.advancedPorondam.advanced.dashaCompatibility.harmony !== 'unknown' && (
              <Animated.View entering={FadeInUp.delay(1050).duration(700)}>
                <Glass style={sty.section}>
                  <View style={sty.secHeader}>
                    <View>
                      <Text style={sty.secTitle}>{T.dashaTitle}</Text>
                    </View>
                    <View style={{ backgroundColor: (data.advancedPorondam.advanced.dashaCompatibility.harmony === 'harmonious' ? '#34d399' : data.advancedPorondam.advanced.dashaCompatibility.harmony === 'conflicting' ? '#f87171' : '#FFB800') + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ color: data.advancedPorondam.advanced.dashaCompatibility.harmony === 'harmonious' ? '#34d399' : data.advancedPorondam.advanced.dashaCompatibility.harmony === 'conflicting' ? '#f87171' : '#FFB800', fontSize: 11, fontWeight: '800' }}>
                        {data.advancedPorondam.advanced.dashaCompatibility.score}/{data.advancedPorondam.advanced.dashaCompatibility.maxScore}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                    {[
                      { label: bName || (language === 'si' ? '\u0DB8\u0DB1\u0DCF\u0DBD\u0DD2\u0DBA' : 'Bride'), emoji: '\uD83D\uDC70', color: '#f9a8d4', dasha: data.advancedPorondam.advanced.dashaCompatibility.bride },
                      { label: gName || (language === 'si' ? '\u0DB8\u0DB1\u0DCF\u0DBD\u0DBA\u0DCF' : 'Groom'), emoji: '\uD83E\uDD35', color: '#93c5fd', dasha: data.advancedPorondam.advanced.dashaCompatibility.groom },
                    ].map(function(p, i) {
                      if (!p.dasha) return null;
                      return (
                        <View key={i} style={{ flex: 1, backgroundColor: p.color + '08', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: p.color + '15' }}>
                          <Text style={{ color: p.color, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>{p.emoji} {p.label}</Text>
                          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{T.currentPhase}</Text>
                          <Text style={{ color: '#FFE8B0', fontSize: 16, fontWeight: '800', marginBottom: 4 }}>{p.dasha.currentDasha}</Text>
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

            {/* â•â•â• NAVAMSHA D9 COMPATIBILITY â•â•â• */}
            {data.advancedPorondam?.advanced?.navamshaCompatibility && (
              <Animated.View entering={FadeInUp.delay(1100).duration(700)}>
                <Glass style={sty.section}>
                  <View style={sty.secHeader}>
                    <View>
                      <Text style={sty.secTitle}>{T.navamshaTitle}</Text>
                    </View>
                    <View style={{ backgroundColor: (data.advancedPorondam.advanced.navamshaCompatibility.score >= 5 ? '#34d399' : data.advancedPorondam.advanced.navamshaCompatibility.score >= 3 ? '#FFB800' : '#f87171') + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ color: data.advancedPorondam.advanced.navamshaCompatibility.score >= 5 ? '#34d399' : data.advancedPorondam.advanced.navamshaCompatibility.score >= 3 ? '#FFB800' : '#f87171', fontSize: 11, fontWeight: '800' }}>
                        {data.advancedPorondam.advanced.navamshaCompatibility.score}/{data.advancedPorondam.advanced.navamshaCompatibility.maxScore}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                    <View style={{ flex: 1, alignItems: 'center', padding: 10, backgroundColor: 'rgba(249,168,212,0.06)', borderRadius: 12 }}>
                      <Text style={{ color: '#f9a8d4', fontSize: 10, fontWeight: '700' }}>{'\uD83D\uDC70'} D9 {language === 'si' ? '\u0DBD\u0D9C\u0DCA\u0DB1\u0DBA' : 'Rising'}</Text>
                      <Text style={{ color: '#FFE8B0', fontSize: 15, fontWeight: '800', marginTop: 4 }}>{data.advancedPorondam.advanced.navamshaCompatibility.brideD9Lagna}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center', padding: 10, backgroundColor: 'rgba(147,197,253,0.06)', borderRadius: 12 }}>
                      <Text style={{ color: '#93c5fd', fontSize: 10, fontWeight: '700' }}>{'\uD83E\uDD35'} D9 {language === 'si' ? '\u0DBD\u0D9C\u0DCA\u0DB1\u0DBA' : 'Rising'}</Text>
                      <Text style={{ color: '#FFE8B0', fontSize: 15, fontWeight: '800', marginTop: 4 }}>{data.advancedPorondam.advanced.navamshaCompatibility.groomD9Lagna}</Text>
                    </View>
                  </View>
                  {(data.advancedPorondam.advanced.navamshaCompatibility.insights || []).map(function(insight, i) {
                    return (
                      <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 6, paddingLeft: 4 }}>
                        <Text style={{ color: '#FF8C00', fontSize: 12 }}>{'\u2728'}</Text>
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

            {/* â•â•â• MANGALA DOSHA CROSS-CHECK â•â•â• */}
            {data.advancedPorondam?.advanced?.mangalaDosha && data.advancedPorondam.advanced.mangalaDosha.severity !== 'unknown' && (
              <Animated.View entering={FadeInUp.delay(1150).duration(700)}>
                <Glass style={sty.section}>
                  <View style={sty.secHeader}>
                    <View>
                      <Text style={sty.secTitle}>{T.mangalaTitle}</Text>
                    </View>
                    <View style={{ backgroundColor: (data.advancedPorondam.advanced.mangalaDosha.severity === 'none' || data.advancedPorondam.advanced.mangalaDosha.severity === 'cancelled' ? '#34d399' : data.advancedPorondam.advanced.mangalaDosha.severity === 'mild' ? '#FFB800' : '#f87171') + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ color: data.advancedPorondam.advanced.mangalaDosha.severity === 'none' || data.advancedPorondam.advanced.mangalaDosha.severity === 'cancelled' ? '#34d399' : data.advancedPorondam.advanced.mangalaDosha.severity === 'mild' ? '#FFB800' : '#f87171', fontSize: 11, fontWeight: '800' }}>
                        {data.advancedPorondam.advanced.mangalaDosha.score}/{data.advancedPorondam.advanced.mangalaDosha.maxScore}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                    {[
                      { label: bName || (language === 'si' ? '\u0DB8\u0DB1\u0DCF\u0DBD\u0DD2\u0DBA' : 'Bride'), emoji: '\uD83D\uDC70', color: '#f9a8d4', mars: data.advancedPorondam.advanced.mangalaDosha.bride },
                      { label: gName || (language === 'si' ? '\u0DB8\u0DB1\u0DCF\u0DBD\u0DBA\u0DCF' : 'Groom'), emoji: '\uD83E\uDD35', color: '#93c5fd', mars: data.advancedPorondam.advanced.mangalaDosha.groom },
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
                            <Text style={{ color: '#FFE8B0', fontSize: 12, fontWeight: '600', flex: 1 }}>
                              {hasDosha
                                ? (language === 'si' ? '\u0D9A\u0DD4\u0DA2 \u0DAF\u0DDD\u0DC2\u0DBA — \u0DB7\u0DCF\u0DC0\u0DBA ' + p.mars.marsHouse : 'Mars Dosha — House ' + p.mars.marsHouse)
                                : (language === 'si' ? '\u0D9A\u0DD4\u0DA2 \u0DAF\u0DDD\u0DC2 \u0DB1\u0DD0\u0DAD' : 'No Mars Dosha')}
                            </Text>
                          </View>
                          {hasDosha && p.mars.cancelled && (
                            <Text style={{ color: '#34d399', fontSize: 10, fontWeight: '700', marginTop: 4, marginLeft: 22 }}>
                              {language === 'si' ? '\u0DB1\u0DD2\u0DC0\u0DCF\u0DBB\u0DAB\u0DBA \u0DC0\u0DD3 \u0D87\u0DAD ✅' : 'Cancelled ✅'}
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

            {/* â•â•â• MARRIAGE PLANET STRENGTH â•â•â• */}
            {data.advancedPorondam?.advanced?.marriagePlanetStrength && (
              <Animated.View entering={FadeInUp.delay(1200).duration(700)}>
                <Glass style={sty.section}>
                  <View style={sty.secHeader}>
                    <View>
                      <Text style={sty.secTitle}>{T.marriageStrTitle}</Text>
                    </View>
                    <View style={{ backgroundColor: (data.advancedPorondam.advanced.marriagePlanetStrength.score >= 3 ? '#34d399' : data.advancedPorondam.advanced.marriagePlanetStrength.score >= 2 ? '#FFB800' : '#f87171') + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ color: data.advancedPorondam.advanced.marriagePlanetStrength.score >= 3 ? '#34d399' : data.advancedPorondam.advanced.marriagePlanetStrength.score >= 2 ? '#FFB800' : '#f87171', fontSize: 11, fontWeight: '800' }}>
                        {data.advancedPorondam.advanced.marriagePlanetStrength.score}/{data.advancedPorondam.advanced.marriagePlanetStrength.maxScore}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                    {[
                      { label: bName || (language === 'si' ? '\u0DB8\u0DB1\u0DCF\u0DBD\u0DD2\u0DBA' : 'Bride'), emoji: '\uD83D\uDC70', color: '#f9a8d4', d: data.advancedPorondam.advanced.marriagePlanetStrength.bride },
                      { label: gName || (language === 'si' ? '\u0DB8\u0DB1\u0DCF\u0DBD\u0DBA\u0DCF' : 'Groom'), emoji: '\uD83E\uDD35', color: '#93c5fd', d: data.advancedPorondam.advanced.marriagePlanetStrength.groom },
                    ].map(function(p, i) {
                      if (!p.d) return null;
                      var venusColor = p.d.venusAssessment === 'Strong' ? '#34d399' : p.d.venusAssessment === 'Moderate' ? '#FFB800' : '#f87171';
                      var lordColor = p.d.seventhLordAssessment === 'Strong' ? '#34d399' : p.d.seventhLordAssessment === 'Moderate' ? '#FFB800' : '#f87171';
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

            {/* â•â•â• BEST WEDDING WINDOWS â•â•â• */}
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
                            <Text style={{ color: '#FFE8B0', fontSize: 13, fontWeight: '700' }}>
                              {w.start} â†’ {w.end}
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
                  </View>
                </View>
                {reportLoading && (
                  <View style={sty.reportLoadRow}>
                    <CosmicLoader size={24} color="#FF8C00" />
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

        <View style={{ height: isDesktop ? 32 : 120 }} />
        </View>
      </ScrollView>


    </View>
    </DesktopScreenWrapper>
  );
}

// ======= STYLES =======
var sty = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: WIDE ? 32 : 16,
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
  },
  scrollDesktop: { paddingTop: 24, paddingHorizontal: 0 },
  // Inner centring wrapper — applied on desktop inside the scroll
  scrollInner: { width: '100%' },
  scrollInnerDesktop: { maxWidth: 960, alignSelf: 'center', paddingHorizontal: 32 },
  title: {
    fontSize: WIDE ? 36 : 30, fontWeight: '900', color: '#FFF1D0', letterSpacing: -0.5,
    ...textShadow('rgba(255,184,0,0.35)', { width: 0, height: 2 }, 10),
  },
  subtitle: { fontSize: 14, color: 'rgba(255,184,0,0.65)', marginBottom: 24, fontWeight: '500', letterSpacing: 0.3 },

  glass: {
    borderRadius: 20, overflow: 'hidden', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: WIDE ? 24 : 16, marginBottom: 14,
  },

  formRow: { flexDirection: 'row', gap: 14 },
  formCol: { flex: 1 },
  personCard: { paddingBottom: WIDE ? 20 : 14 },
  personLabel: { fontSize: 16, fontWeight: '800', color: '#FFE8B0', marginBottom: 14, letterSpacing: 0.3 },
  nameInput: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    color: '#FFF1D0', fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,140,0,0.2)', marginBottom: 12,
  },
  fieldTag: { fontSize: 10, fontWeight: '700', color: 'rgba(255,140,0,0.7)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6, marginTop: 4 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  numInput: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 11 : 8,
    color: '#FFF1D0', fontSize: 14, fontWeight: '600',
    borderWidth: 1, borderColor: 'rgba(255,140,0,0.18)', textAlign: 'center', minWidth: 0,
  },
  sep: { color: 'rgba(255,255,255,0.2)', fontSize: 16, fontWeight: '300' },
  timeSep: { color: 'rgba(255,140,0,0.6)', fontSize: 20, fontWeight: '700' },
  timeHint: { fontSize: 11, color: 'rgba(255,255,255,0.28)', marginBottom: 16, fontStyle: 'italic', textAlign: 'center' },

  cta: { borderRadius: 16, paddingVertical: 17, alignItems: 'center', overflow: 'hidden', marginBottom: 8, ...boxShadow('#FF8C00', { width: 0, height: 4 }, 0.7, 18), elevation: 0 },
  ctaText: { color: '#FFF1D0', fontWeight: '800', fontSize: 16, letterSpacing: 0.8 },

  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, marginBottom: 14, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,140,0,0.18)', backgroundColor: 'rgba(255,140,0,0.06)',
  },
  editText: { color: '#FF8C00', fontWeight: '600', fontSize: 13 },

  loadCenter: { alignItems: 'center', marginVertical: 30 },
  loadCard: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 40, borderColor: 'rgba(255,140,0,0.2)' },
  loadRing: { width: 90, height: 90, borderRadius: 45, opacity: 0.22, position: 'absolute', top: 34 },
  loadInner: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(18,6,12,0.9)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,140,0,0.3)',
  },
  loadText: { color: '#FF8C00', fontSize: 15, fontWeight: '700', marginTop: 22, letterSpacing: 0.5 },
  errorText: { color: '#F87171', fontSize: 14, textAlign: 'center' },

  // Score Gauge — binary star orbit
  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  gaugeInfo: { flex: 1 },
  gaugeCosmicLabel: { fontSize: 14, fontWeight: '800', marginBottom: 3, letterSpacing: 0.3 },
  gaugeRating: { fontSize: 16, fontWeight: '700', color: '#FFE8B0', marginBottom: 3 },
  gaugeScoreText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginBottom: 12 },
  shareChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: 'rgba(255,140,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,140,0,0.25)',
  },
  shareChipText: { color: '#FF8C00', fontSize: 12, fontWeight: '700' },

  charts: { marginBottom: 6 },
  chartsWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  chartCol: { flex: 1, maxWidth: 440 },
  chartCard: { alignItems: 'center', paddingVertical: WIDE ? 20 : 16 },
  chartTitle: { fontSize: 14, fontWeight: '700', color: '#FF8C00', marginBottom: 12, letterSpacing: 0.3 },
  heartBridge: { alignItems: 'center', marginVertical: -6, zIndex: 10 },
  heartBridgeWide: { marginVertical: 0, marginHorizontal: -10 },

  section: { marginBottom: 14 },
  secHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  secTitle: { fontSize: 16, fontWeight: '800', color: '#FFE8B0', letterSpacing: 0.2, ...textShadow('rgba(255,184,0,0.18)', { width: 0, height: 1 }, 5) },
  secSub: { fontSize: 12, color: 'rgba(255,140,0,0.6)', fontWeight: '500', marginTop: 2 },

  factorItem: { marginBottom: 16 },
  factorTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  factorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  factorDot: { width: 8, height: 8, borderRadius: 4 },
  factorName: { fontSize: 14, color: '#FFE8B0', fontWeight: '700' },
  factorSinhala: { fontSize: 12, color: 'rgba(255,140,0,0.5)', fontWeight: '500' },
  factorBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  factorBadgeText: { fontSize: 12, fontWeight: '800' },
  barTrack: { height: 7, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 7, borderRadius: 4, overflow: 'hidden' },
  factorDesc: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6, lineHeight: 18 },

  doshaItem: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  doshaIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(248,113,113,0.1)', alignItems: 'center', justifyContent: 'center' },
  doshaName: { fontSize: 14, color: '#FCA5A5', fontWeight: '700', marginBottom: 3 },
  doshaDesc: { fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 18 },

  langRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  langChip: {
    flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)',
  },
  langChipActive: { borderColor: '#C026D3', backgroundColor: 'rgba(192,38,211,0.15)' },
  langChipText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '700' },
  langChipTextActive: { color: '#E879F9' },
  reportLoadRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', paddingVertical: 20 },
  reportLoadText: { color: '#FF8C00', fontSize: 13 },
  reportBody: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  reportText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 24 },
});
