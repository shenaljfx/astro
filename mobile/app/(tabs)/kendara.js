import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, RefreshControl, TouchableOpacity,
  StyleSheet, ActivityIndicator, Dimensions, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing, interpolate } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import DesktopScreenWrapper, { useDesktopCtx } from '../../components/DesktopScreenWrapper';
import SriLankanChart from '../../components/SriLankanChart';
import SpringPressable from '../../components/effects/SpringPressable';
import CosmicLoader from '../../components/effects/CosmicLoader';
import PinchableView from '../../components/effects/PinchableView';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Colors, Typography, Spacing } from '../../constants/theme';
import CosmicCard from '../../components/ui/CosmicCard';
import BlueAuroraNebula from '../../components/effects/BlueAuroraNebula';
import BlueNebulaBg from '../../components/effects/BlueNebulaBg';
import SectionHeader from '../../components/ui/SectionHeader';

const CHART_CACHE_KEY = '@grahachara_chart_cache';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const RASHI_SI = {
  1: 'මේෂ', 2: 'වෘෂභ', 3: 'මිථුන', 4: 'කටක',
  5: 'සිංහ', 6: 'කන්‍යා', 7: 'තුලා', 8: 'වෘශ්චික',
  9: 'ධනු', 10: 'මකර', 11: 'කුම්භ', 12: 'මීන'
};

const RASHI_EN = {
  1: 'Aries', 2: 'Taurus', 3: 'Gemini', 4: 'Cancer',
  5: 'Leo', 6: 'Virgo', 7: 'Libra', 8: 'Scorpio',
  9: 'Sagittarius', 10: 'Capricorn', 11: 'Aquarius', 12: 'Pisces'
};

const TITHI_SI = {
  'Pratipada': 'ප්‍රතිපදා', 'Dwitiya': 'ද්විතීයා', 'Tritiya': 'තෘතීයා',
  'Chaturthi': 'චතුර්ථී', 'Panchami': 'පංචමී', 'Shashthi': 'ෂෂ්ඨී',
  'Saptami': 'සප්තමී', 'Ashtami': 'අෂ්ටමී', 'Navami': 'නවමී',
  'Dashami': 'දශමී', 'Ekadashi': 'ඒකාදශී', 'Dwadashi': 'ද්වාදශී',
  'Trayodashi': 'ත්‍රයෝදශී', 'Chaturdashi': 'චතුර්දශී', 'Purnima/Amavasya': 'පුර්ණිමා/අමාවාසි'
};

const PLANET_INFO = {
  'Sun':     { si: 'රවි', en: 'Su', color: '#FFB800' },
  'Moon':    { si: 'චන්ද්‍ර', en: 'Mo', color: '#c7d2fe' },
  'Mars':    { si: 'කුජ', en: 'Ma', color: '#f87171' },
  'Mercury': { si: 'බුධ', en: 'Me', color: '#6ee7b7' },
  'Jupiter': { si: 'ගුරු', en: 'Ju', color: '#FFB800' },
  'Venus':   { si: 'සිකුරු', en: 'Ve', color: '#f9a8d4' },
  'Saturn':  { si: 'ශනි', en: 'Sa', color: '#a5b4fc' },
  'Rahu':    { si: 'රාහු', en: 'Ra', color: '#94a3b8' },
  'Ketu':    { si: 'කේතු', en: 'Ke', color: '#c4b5fd' },
  'Lagna':   { si: 'ලග්න', en: 'Lg', color: '#eab308' },
  'Ascendant':{ si: 'ලග්න', en: 'Lg', color: '#eab308' },
  'Surya':   { si: 'රවි', en: 'Su', color: '#FFB800' },
  'Chandra': { si: 'චන්ද්‍ර', en: 'Mo', color: '#c7d2fe' },
  'Mangala': { si: 'කුජ', en: 'Ma', color: '#f87171' },
  'Budha':   { si: 'බුධ', en: 'Me', color: '#6ee7b7' },
  'Guru':    { si: 'ගුරු', en: 'Ju', color: '#FFB800' },
  'Shukra':  { si: 'සිකුරු', en: 'Ve', color: '#f9a8d4' },
  'Shani':   { si: 'ශනි', en: 'Sa', color: '#a5b4fc' },
};

function formatDegree(deg) {
  if (deg == null || isNaN(deg)) return '';
  const d = Math.floor(deg);
  const m = Math.round((deg - d) * 60);
  return String(d).padStart(2, '0') + '\u00B0' + String(m).padStart(2, '0');
}

function toSLT(isoOrObj) {
  if (!isoOrObj) return '--:--';
  if (typeof isoOrObj === 'object' && isoOrObj.display) return isoOrObj.display;
  const d = new Date(isoOrObj);
  if (isNaN(d.getTime())) return '--:--';
  const slt = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  const h = slt.getUTCHours();
  const m = slt.getUTCMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return String(h12).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ' ' + ampm;
}

// ── Chart Glow Aura wrapper ──────────────────────────────────────────
function ChartGlowAura({ lagnaColor, children }) {
  var glow = useSharedValue(0.5);
  useEffect(function () {
    glow.value = withRepeat(withSequence(withTiming(1, { duration: 3200 }), withTiming(0.5, { duration: 3200 })), -1);
  }, []);
  var glowStyle = useAnimatedStyle(function () { return { opacity: glow.value }; });
  var color = lagnaColor || '#9333EA';
  return (
    <View style={{ alignItems: 'center', marginBottom: 20 }}>
      <Animated.View style={[StyleSheet.absoluteFill, glowStyle, { alignItems: 'center', justifyContent: 'center' }]}>
        <View style={{
          width: SCREEN_WIDTH * 0.82, height: SCREEN_WIDTH * 0.82, borderRadius: SCREEN_WIDTH * 0.41,
          backgroundColor: color + '18',
          shadowColor: color, shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6, shadowRadius: 40, elevation: 0,
        }} />
      </Animated.View>
      <View style={{
        borderRadius: 16, overflow: 'hidden', padding: 3,
        borderWidth: 1, borderColor: color + '40',
        shadowColor: color, shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3, shadowRadius: 18, elevation: 8,
      }}>
        <LinearGradient
          colors={[color + '22', 'rgba(10,5,25,0.9)', color + '10']}
          style={{ padding: 2, borderRadius: 14 }}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          {children}
        </LinearGradient>
      </View>
    </View>
  );
}

// ── Yoga Badge pill ──────────────────────────────────────────────────
function YogaBadge({ name, category }) {
  var catColor = category === 'Raja Yoga' ? '#FF8C00' : category === 'Dhana Yoga' ? '#FFB800' : category?.includes('Dosha') ? '#F87171' : '#60A5FA';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: catColor + '50', backgroundColor: catColor + '12', marginRight: 6, marginBottom: 6 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: catColor, marginRight: 5 }} />
      <Text style={{ color: catColor, fontSize: 11, fontWeight: '700' }}>{name}</Text>
    </View>
  );
}

// ============================================================
// Main Kendara Screen
// ============================================================

export default function KendaraScreen() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  var isDesktop = useDesktopCtx();

  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [marakaData, setMarakaData] = useState(null);
  const [marakaLoading, setMarakaLoading] = useState(false);
  const [expandedApala, setExpandedApala] = useState(null);
  
  const stepTimers = useRef([]);
  const lastFetchedBirth = useRef(null);
  const chartDataRef = useRef(null);
  const fetchingRef = useRef(false);
  const langRef = useRef(language);
  langRef.current = language;

  const birthDateTime = user?.birthData?.dateTime || null;
  const birthLat = user?.birthData?.lat || 6.9271;
  const birthLng = user?.birthData?.lng || 79.8612;
  const hasBirthData = !!birthDateTime;

  const clearStepTimers = useCallback(() => {
    stepTimers.current.forEach(t => clearTimeout(t));
    stepTimers.current = [];
  }, []);

  useEffect(() => {
    if (!hasBirthData) { setChartData(null); chartDataRef.current = null; return; }

    // Already have data for this birth time — skip
    if (chartDataRef.current && lastFetchedBirth.current === birthDateTime) return;

    var cancelled = false;

    (async () => {
      // Try local cache first (instant, no network)
      try {
        var raw = await AsyncStorage.getItem(CHART_CACHE_KEY);
        if (raw) {
          var cached = JSON.parse(raw);
          if (cached && cached.birthDateTime === birthDateTime && cached.data) {
            if (!cancelled) {
              setChartData(cached.data);
              chartDataRef.current = cached.data;
              lastFetchedBirth.current = birthDateTime;
            }
            return;
          }
        }
      } catch (_) { /* ignore cache miss */ }

      // Guard against concurrent fetches
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      try {
        if (!cancelled) {
          setLoading(true);
          setError(null);
          setLoadingStep(1);
        }
        clearStepTimers();

        stepTimers.current.push(setTimeout(() => { if (!cancelled) setLoadingStep(2); }, 150));
        stepTimers.current.push(setTimeout(() => { if (!cancelled) setLoadingStep(3); }, 350));
        stepTimers.current.push(setTimeout(() => { if (!cancelled) setLoadingStep(4); }, 550));

        var res = await api.getBirthChart(birthDateTime, birthLat, birthLng, langRef.current);
        if (cancelled) return;

        clearStepTimers();
        setLoadingStep(5);

        if (res.success) {
          await new Promise(r => setTimeout(r, 400));
          if (cancelled) return;
          setChartData(res.data);
          chartDataRef.current = res.data;
          lastFetchedBirth.current = birthDateTime;
          try {
            await AsyncStorage.setItem(CHART_CACHE_KEY, JSON.stringify({ birthDateTime: birthDateTime, data: res.data, savedAt: Date.now() }));
          } catch (_) { /* ignore */ }
        } else {
          throw new Error(res.error || 'Failed to calculate chart');
        }
      } catch (err) {
        if (cancelled) return;
        if (err && (err.name === 'AbortError' || (err.message && err.message.indexOf('abort') !== -1))) return;
        setError(err.message || 'Failed to load chart');
      } finally {
        fetchingRef.current = false;
        if (!cancelled) {
          setLoading(false);
          setLoadingStep(0);
        }
      }
    })();

    return () => { cancelled = true; clearStepTimers(); };
  }, [hasBirthData, birthDateTime, birthLat, birthLng, clearStepTimers, refreshKey]);

  // Fetch Maraka Apala data when birth data is available
  useEffect(() => {
    if (!hasBirthData || !birthDateTime) { setMarakaData(null); return; }
    var cancelled = false;
    (async () => {
      try {
        setMarakaLoading(true);
        var res = await api.getMarakaApalaFull(birthDateTime, birthLat, birthLng, 5);
        if (cancelled) return;
        if (res.success) {
          setMarakaData(res.data);
        }
      } catch (err) {
        if (!cancelled) console.warn('Maraka Apala fetch error:', err.message);
      } finally {
        if (!cancelled) setMarakaLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [hasBirthData, birthDateTime, birthLat, birthLng, refreshKey]);

  // Pull-to-refresh: clear caches and force the effect to re-run
  const onRefresh = useCallback(() => {
    if (fetchingRef.current) return;
    lastFetchedBirth.current = null;
    chartDataRef.current = null;
    AsyncStorage.removeItem(CHART_CACHE_KEY).catch(() => {});
    setChartData(null);
    setMarakaData(null);
    setExpandedApala(null);
    setError(null);
    setRefreshKey(function (k) { return k + 1; });
  }, []);

  const renderContent = () => {
    if (!hasBirthData) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="planet-outline" size={64} color="rgba(251,191,36,0.5)" />
          <Text style={styles.emptyTitle}>{t('kpBirthNeeded') || 'Birth Details Needed'}</Text>
          <Text style={styles.emptyText}>{t('setBirthDataPrompt') || 'Please set your birth date and time in your profile to see your chart.'}</Text>
          <SpringPressable style={styles.actionButton} onPress={() => router.push('/(tabs)/profile')} haptic="medium">
            <Text style={styles.actionButtonText}>{t('goToProfile') || 'Go to Profile'}</Text>
          </SpringPressable>
        </View>
      );
    }

    if (loading && !chartData) {
      const STEPS = language === 'si' ? [
        { icon: 'globe-outline', text: 'සේවාදායකයට සම්බන්ධ වෙමින්...', key: 1 },
        { icon: 'planet-outline', text: 'ග්‍රහ ස්ථාන ගණනය කරමින්...', key: 2 },
        { icon: 'language-outline', text: 'සිංහලට පරිවර්තනය කරමින්...', key: 3 },
        { icon: 'sparkles-outline', text: 'ජ්‍යෝතිෂ විශ්ලේෂණය සකසමින්...', key: 4 },
        { icon: 'checkmark-circle-outline', text: 'සූදානම්!', key: 5 },
      ] : [
        { icon: 'globe-outline', text: 'Connecting to server...', key: 1 },
        { icon: 'planet-outline', text: 'Calculating planet positions...', key: 2 },
        { icon: 'telescope-outline', text: 'Analyzing yogas & doshas...', key: 3 },
        { icon: 'sparkles-outline', text: 'Building your chart...', key: 4 },
        { icon: 'checkmark-circle-outline', text: 'Ready!', key: 5 },
      ];
      return (
        <View style={styles.loadingContainer}>
          <Animated.View entering={FadeIn.duration(400)} style={styles.loadingCard}>
            <LinearGradient
              colors={['rgba(50,20,80,0.6)', 'rgba(20,10,40,0.8)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
            <Text style={styles.loadingTitle}>
              {'✦ ' + (t('kpPreparingChart') || 'Preparing Your Chart') + ' ✦'}
            </Text>
            <View style={styles.stepsContainer}>
              {STEPS.map((step) => {
                const isActive = loadingStep === step.key;
                const isDone = loadingStep > step.key;
                const isPending = loadingStep < step.key;
                return (
                  <Animated.View
                    key={step.key}
                    entering={FadeInDown.delay(step.key * 100).duration(300)}
                    style={[styles.stepRow, isActive && styles.stepRowActive]}
                  >
                    <View style={[styles.stepIconWrap, isDone && styles.stepIconDone, isActive && styles.stepIconActive]}>
                      {isDone ? (
                        <Ionicons name="checkmark" size={16} color="#10b981" />
                      ) : isActive ? (
                        <CosmicLoader size={20} color="#FFB800" />
                      ) : (
                        <Ionicons name={step.icon} size={16} color="rgba(255,255,255,0.3)" />
                      )}
                    </View>
                    <Text style={[
                      styles.stepText,
                      isDone && styles.stepTextDone,
                      isActive && styles.stepTextActive,
                      isPending && styles.stepTextPending,
                    ]}>
                      {step.text}
                    </Text>
                  </Animated.View>
                );
              })}
            </View>
            <View style={styles.loadingBarTrack}>
              <Animated.View style={[styles.loadingBarFill, { width: (loadingStep / 5 * 100) + '%' }]} />
            </View>
          </Animated.View>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <SpringPressable onPress={onRefresh} haptic="light">
            <Text style={{ color: '#FFB800', marginTop: 10 }}>{t('kpRetry') || 'Try Again'}</Text>
          </SpringPressable>
        </View>
      );
    }

    if (!chartData) return null;

    const lagnaRashiId = chartData.lagna ? (chartData.lagna.rashiId || chartData.lagna.id || 1) : 1;

    // Pick a lagna color for glow
    var lagnaColors = ['#9333EA','#EC4899','#F59E0B','#34D399','#60A5FA','#F87171','#A78BFA','#FFB800','#4CC9F0','#34D399','#818CF8','#F472B6'];
    var lagnaGlowColor = lagnaColors[(lagnaRashiId - 1) % lagnaColors.length];

    // Collect top yogas for badges
    var topYogas = (chartData.advancedAnalysis?.tier1?.advancedYogas?.items || []).filter(function(y) {
      return y.strength === 'Very Strong' || y.strength === 'Strong';
    }).slice(0, 5);

    return (
      <View style={styles.chartContainer}>
        <View style={styles.headerRow}>
          <Ionicons name="grid-outline" size={20} color="#FFB800" />
          <Text style={styles.sectionTitle}>
            {t('kpBirthChart') || 'Birth Chart'}
          </Text>
        </View>

        {/* Yoga badges strip */}
        {topYogas.length > 0 && (
          <Animated.View entering={FadeIn.duration(600)} style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
            {topYogas.map(function (y, i) { return <YogaBadge key={i} name={language === 'si' ? (y.sinhala || y.name) : y.name} category={y.category} />; })}
          </Animated.View>
        )}

        <PinchableView minScale={1} maxScale={2.5}>
          <ChartGlowAura lagnaColor={lagnaGlowColor}>
            <SriLankanChart
              rashiChart={chartData.rashiChart}
              lagnaRashiId={lagnaRashiId}
              language={language}
            />
          </ChartGlowAura>
        </PinchableView>

        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>{t('kpChartDetails') || 'Chart Summary'}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('kpRisingStar') || 'Rising Star'}:</Text>
            <Text style={styles.infoValue}>
              {language === 'si'
                ? (chartData.lagna && (chartData.lagna.sinhala || chartData.lagna.name))
                : (chartData.lagna && (chartData.lagna.english || chartData.lagna.name))}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('kpBirthStar') || 'Birth Star'}:</Text>
            <Text style={styles.infoValue}>
              {(() => {
                var nak = (chartData.panchanga && chartData.panchanga.nakshatra) || chartData.nakshatra;
                if (!nak) return '--';
                return language === 'si' ? (nak.sinhala || nak.name || '--') : (nak.name || '--');
              })()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('kpMoonPhase') || 'Moon Phase'}:</Text>
            <Text style={styles.infoValue}>
              {(() => {
                var tithiName = (chartData.panchanga && chartData.panchanga.tithi && chartData.panchanga.tithi.name) || '--';
                if (tithiName === '--') return '--';
                return language === 'si' ? (TITHI_SI[tithiName] || tithiName) : tithiName;
              })()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('kpMoonSign') || 'Moon Sign'}:</Text>
            <Text style={styles.infoValue}>
              {language === 'si'
                ? (chartData.moonSign && (chartData.moonSign.sinhala || chartData.moonSign.name))
                : (chartData.moonSign && (chartData.moonSign.english || chartData.moonSign.name))}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('kpSunSign') || 'Sun Sign'}:</Text>
            <Text style={styles.infoValue}>
              {language === 'si'
                ? (chartData.sunSign && (chartData.sunSign.sinhala || chartData.sunSign.name))
                : (chartData.sunSign && (chartData.sunSign.english || chartData.sunSign.name))}
            </Text>
          </View>
        </View>

        <View style={[styles.detailsCard, { marginTop: 12 }]}>
          <Text style={styles.cardTitle}>
            {t('kpPlanetPositions') || 'Where Your Planets Are'}
          </Text>
          {chartData.rashiChart && chartData.rashiChart.map(function(entry) {
            if (!entry.planets || entry.planets.length === 0) return null;
            return entry.planets
              .filter(function(p) { return p.name !== 'Lagna' && p.name !== 'Ascendant'; })
              .map(function(p, idx) {
                var info = PLANET_INFO[p.name];
                var pLabel = info ? (language === 'si' ? info.si : p.name) : p.name;
                var pColor = info ? info.color : '#fff';
                var rashiLabel = language === 'si'
                  ? (RASHI_SI[entry.rashiId] || entry.rashi)
                  : (entry.rashiEnglish || entry.rashi);
                return (
                  <View key={entry.rashiId + '-' + idx} style={styles.planetRow}>
                    <View style={[styles.planetDot, { backgroundColor: pColor }]} />
                    <Text style={[styles.planetName, { color: pColor }]}>{pLabel}</Text>
                    <View style={styles.planetBarTrack}>
                      <View style={[styles.planetBarFill, { backgroundColor: pColor, width: (30 + Math.random() * 60) + '%' }]} />
                    </View>
                    <Text style={styles.planetRashi}>
                      {rashiLabel} {p.degree != null ? formatDegree(p.degree) : ''}
                    </Text>
                  </View>
                );
              });
          })}
        </View>

        {(chartData.navamsaChart || chartData.navamshaChart) ? (
          <View style={{ marginTop: 20 }}>
            <View style={styles.headerRow}>
              <Ionicons name="apps-outline" size={20} color="#FFB800" />
              <Text style={styles.sectionTitle}>
                {t('kpNavamsaChart') || 'Marriage & Soul Chart'}
              </Text>
            </View>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <PinchableView minScale={1} maxScale={2.5}>
                <ChartGlowAura lagnaColor="#A78BFA">
                  <SriLankanChart
                    rashiChart={chartData.navamsaChart || chartData.navamshaChart}
                    lagnaRashiId={(chartData.navamshaLagna && chartData.navamshaLagna.rashi && chartData.navamshaLagna.rashi.id) || (chartData.navamsaLagna && chartData.navamsaLagna.rashi && chartData.navamsaLagna.rashi.id) || lagnaRashiId}
                    language={language}
                  />
                </ChartGlowAura>
              </PinchableView>
            </View>
          </View>
        ) : null}

        {/* ═══ ADVANCED ANALYSIS ═══ */}
        {chartData.advancedAnalysis && (
          <View style={{ marginTop: 8 }}>

            {/* ── AI OVERALL SUMMARY ── */}
            {chartData.chartExplanations?.overall && (
              <Animated.View entering={FadeInDown.delay(150).duration(600)}>
                <View style={[styles.advCard, { borderColor: 'rgba(255,140,0,0.25)', marginBottom: 12 }]}>
                  <LinearGradient colors={['rgba(255,140,0,0.12)', 'rgba(255,184,0,0.06)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                    <Ionicons name="sparkles" size={20} color="#FF8C00" />
                    <Text style={{ color: '#FF8C00', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 }}>
                      {'✨ ' + (t('kpChartAtGlance') || 'Your Chart at a Glance')}
                    </Text>
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 22, fontStyle: 'italic' }}>
                    {chartData.chartExplanations.overall}
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* ── DOSHAS ── */}
            {chartData.advancedAnalysis.tier1?.doshas?.items?.length > 0 && (
              <Animated.View entering={FadeInDown.delay(200).duration(600)}>
                <View style={styles.headerRow}>
                  <Ionicons name="alert-circle-outline" size={20} color="#f87171" />
                  <Text style={styles.sectionTitle}>
                    {t('kpDoshaTitle') || 'Challenges to Watch Out For'}
                  </Text>
                </View>
                <View style={styles.advCard}>
                  {chartData.advancedAnalysis.tier1.doshas.items.map(function(d, i) {
                    var sevColor = d.severity === 'Severe' ? '#ef4444' : d.severity === 'Moderate' ? '#f59e0b' : '#10b981';
                    var sevLabel = d.severity === 'Severe' ? t('kpSevere') : d.severity === 'Moderate' ? t('kpModerate') : t('kpMild');
                    return (
                      <View key={i} style={styles.doshaRow}>
                        <View style={[styles.doshaDot, { backgroundColor: d.cancelled ? '#6b7280' : sevColor }]} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                            <Text style={[styles.doshaName, d.cancelled && { textDecorationLine: 'line-through', color: 'rgba(255,255,255,0.3)' }]}>{language === 'si' ? (d.sinhala || d.name) : d.name}</Text>
                            {d.cancelled ? (
                              <View style={styles.cancelBadge}>
                                <Text style={styles.cancelText}>{t('kpCancelled') || 'CANCELLED'}</Text>
                              </View>
                            ) : (
                              <View style={[styles.sevBadge, { backgroundColor: sevColor + '20', borderColor: sevColor + '50' }]}>
                                <Text style={[styles.sevText, { color: sevColor }]}>{sevLabel || d.severity}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.doshaDesc}>{language === 'si' ? (d.descriptionSi || d.description) : d.description}</Text>
                          {(d.cancellationReason || d.details?.cancellationReason) && <Text style={styles.cancelReason}>↳ {language === 'si' ? (d.cancellationReasonSi || d.cancellationReason || d.details?.cancellationReason) : (d.cancellationReason || d.details?.cancellationReason)}</Text>}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Animated.View>
            )}

            {/* Dosha AI explanation */}
            {chartData.chartExplanations?.doshas && chartData.chartExplanations.doshas !== 'N/A' && (
              <View style={styles.aiExplainBox}>
                <Ionicons name="bulb-outline" size={14} color="#FFB800" />
                <Text style={styles.aiExplainText}>{chartData.chartExplanations.doshas}</Text>
              </View>
            )}

            {/* ── ADVANCED YOGAS ── */}
            {chartData.advancedAnalysis.tier1?.advancedYogas?.items?.length > 0 && (
              <Animated.View entering={FadeInDown.delay(300).duration(600)}>
                <View style={styles.headerRow}>
                  <Ionicons name="star-outline" size={20} color="#FFB800" />
                  <Text style={styles.sectionTitle}>
                    {t('kpYogaTitle') || 'Your Special Gifts & Blessings'}
                  </Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{chartData.advancedAnalysis.tier1.advancedYogas.found}</Text>
                  </View>
                </View>
                <View style={styles.advCard}>
                  {chartData.advancedAnalysis.tier1.advancedYogas.items.map(function(y, i) {
                    var catColor = y.category === 'Raja Yoga' ? '#FF8C00' : y.category === 'Dhana Yoga' ? '#FFB800' : y.category?.includes('Dosha') ? '#f87171' : '#60a5fa';
                    var strColor = y.strength === 'Very Strong' ? '#10b981' : y.strength === 'Strong' ? '#34d399' : '#6b7280';
                    var strLabel = y.strength === 'Very Strong' ? t('kpVeryStrong') : y.strength === 'Strong' ? t('kpStrong') : t('kpModerate');
                    var catLabel = language === 'si'
                      ? (y.category === 'Raja Yoga' ? 'රාජ යෝගය' : y.category === 'Dhana Yoga' ? 'ධන යෝගය' : y.category?.includes('Dosha') ? 'දෝෂ යෝගය' : 'විශේෂ යෝගය')
                      : y.category;
                    return (
                      <View key={i} style={styles.yogaItem}>
                        <View style={styles.yogaTop}>
                          <View style={[styles.catDot, { backgroundColor: catColor }]} />
                          <Text style={styles.yogaName}>{language === 'si' ? (y.sinhala || y.name) : y.name}</Text>
                          <View style={[styles.strBadge, { borderColor: strColor + '60' }]}>
                            <Text style={[styles.strText, { color: strColor }]}>{strLabel || y.strength}</Text>
                          </View>
                        </View>
                        <Text style={styles.yogaCat}>{catLabel}</Text>
                        <Text style={styles.yogaDesc}>{language === 'si' ? (y.descriptionSi || y.description) : y.description}</Text>
                        {y.planets && <Text style={styles.yogaPlanets}>🪐 {y.planets.map(function(p) { var pi = PLANET_INFO[p]; return language === 'si' && pi ? pi.si : p; }).join(', ')}</Text>}
                      </View>
                    );
                  })}
                </View>
              </Animated.View>
            )}

            {/* Yoga AI explanation */}
            {chartData.chartExplanations?.yogas && chartData.chartExplanations.yogas !== 'N/A' && (
              <View style={styles.aiExplainBox}>
                <Ionicons name="bulb-outline" size={14} color="#FFB800" />
                <Text style={styles.aiExplainText}>{chartData.chartExplanations.yogas}</Text>
              </View>
            )}

            {/* ── JAIMINI KARAKAS ── */}
            {chartData.advancedAnalysis.tier1?.jaimini && (
              <Animated.View entering={FadeInDown.delay(400).duration(600)}>
                <View style={styles.headerRow}>
                  <Ionicons name="compass-outline" size={20} color="#FF8C00" />
                  <Text style={styles.sectionTitle}>
                    {t('kpJaiminiTitle') || 'Your Soul\'s Purpose'}
                  </Text>
                </View>
                <View style={styles.advCard}>
                  {chartData.advancedAnalysis.tier1.jaimini.atmakaraka && (
                    <View style={styles.jaiminiHighlight}>
                      <LinearGradient colors={['rgba(255,140,0,0.12)', 'rgba(255,140,0,0.03)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                      <Text style={styles.jaiminiLabel}>{t('kpSoulPlanet') || 'Your Soul Planet'}</Text>
                      <Text style={styles.jaiminiValue}>{(() => { var p = chartData.advancedAnalysis.tier1.jaimini.atmakaraka.planet || ''; var pi = PLANET_INFO[p]; return language === 'si' && pi ? pi.si : p; })()}</Text>
                      {chartData.advancedAnalysis.tier1.jaimini.karakas && (
                        <Text style={styles.jaiminiSub}>
                          {Object.values(chartData.advancedAnalysis.tier1.jaimini.karakas).map(function(k) { var pi = PLANET_INFO[k.planet]; var pName = language === 'si' && pi ? pi.si : k.planet; var rName = language === 'si' ? (k.roleSinhala || k.role) : k.role; return pName + ' → ' + rName; }).join('  •  ')}
                        </Text>
                      )}
                    </View>
                  )}
                  <View style={styles.jaiminiGrid}>
                    {chartData.advancedAnalysis.tier1.jaimini.karakamsha && (
                      <View style={styles.jaiminiMini}>
                        <Text style={styles.jmLabel}>{t('kpKarakamshaLabel') || 'Soul\'s Destination'}</Text>
                        <Text style={styles.jmValue}>{language === 'si' ? (chartData.advancedAnalysis.tier1.jaimini.karakamsha.sinhala || chartData.advancedAnalysis.tier1.jaimini.karakamsha.rashi || 'N/A') : (chartData.advancedAnalysis.tier1.jaimini.karakamsha.rashi || 'N/A')}</Text>
                        {chartData.advancedAnalysis.tier1.jaimini.karakamsha.interpretation && (
                          <Text style={styles.jmDesc}>{language === 'si' ? (chartData.advancedAnalysis.tier1.jaimini.karakamsha.interpretationSi || chartData.advancedAnalysis.tier1.jaimini.karakamsha.interpretation) : chartData.advancedAnalysis.tier1.jaimini.karakamsha.interpretation}</Text>
                        )}
                      </View>
                    )}
                    {chartData.advancedAnalysis.tier1.jaimini.arudhaLagna && (
                      <View style={styles.jaiminiMini}>
                        <Text style={styles.jmLabel}>{t('kpArudhaLabel') || 'How Others See You'}</Text>
                        <Text style={styles.jmValue}>{language === 'si' ? (chartData.advancedAnalysis.tier1.jaimini.arudhaLagna.sinhala || chartData.advancedAnalysis.tier1.jaimini.arudhaLagna.rashi || 'N/A') : (chartData.advancedAnalysis.tier1.jaimini.arudhaLagna.rashi || 'N/A')}</Text>
                      </View>
                    )}
                    {chartData.advancedAnalysis.tier1.jaimini.upapadaLagna && (
                      <View style={styles.jaiminiMini}>
                        <Text style={styles.jmLabel}>{t('kpUpapadaLabel') || 'Marriage Indicator'}</Text>
                        <Text style={styles.jmValue}>{language === 'si' ? (chartData.advancedAnalysis.tier1.jaimini.upapadaLagna.sinhala || chartData.advancedAnalysis.tier1.jaimini.upapadaLagna.rashi || 'N/A') : (chartData.advancedAnalysis.tier1.jaimini.upapadaLagna.rashi || 'N/A')}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Soul Purpose AI explanation */}
            {chartData.chartExplanations?.soulPurpose && chartData.chartExplanations.soulPurpose !== 'N/A' && (
              <View style={styles.aiExplainBox}>
                <Ionicons name="bulb-outline" size={14} color="#FFB800" />
                <Text style={styles.aiExplainText}>{chartData.chartExplanations.soulPurpose}</Text>
              </View>
            )}

            {/* ── SHADBALA ── */}
            {chartData.advancedAnalysis.tier2?.shadbala && typeof chartData.advancedAnalysis.tier2.shadbala === 'object' && (
              <Animated.View entering={FadeInDown.delay(500).duration(600)}>
                <View style={styles.headerRow}>
                  <Ionicons name="bar-chart-outline" size={20} color="#60a5fa" />
                  <Text style={styles.sectionTitle}>
                    {t('kpShadbalaTitle') || 'Your Planet Power Levels'}
                  </Text>
                </View>
                <View style={styles.advCard}>
                  {Object.values(chartData.advancedAnalysis.tier2.shadbala).map(function(sb, i) {
                    var pInfo = PLANET_INFO[sb.name] || {};
                    var pct = Math.min((sb.totalRupas || 0) / 300, 1);
                    var barColor = sb.isAdequate ? '#10b981' : '#f59e0b';
                    var strengthLabel = sb.isAdequate ? (t('kpStrong') || 'Strong') : (t('kpWeak') || 'Needs Attention');
                    return (
                      <View key={i} style={styles.sbRow}>
                        <View style={styles.sbTop}>
                          <Text style={[styles.sbPlanet, { color: pInfo.color || '#fff' }]}>
                            {language === 'si' ? (sb.sinhala || pInfo.si || sb.name) : sb.name}
                          </Text>
                          <Text style={styles.sbRupas}>{(sb.percentage || 0)}%</Text>
                          <View style={[styles.sbBadge, { backgroundColor: sb.isAdequate ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', borderColor: sb.isAdequate ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)' }]}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: sb.isAdequate ? '#10b981' : '#f59e0b' }}>
                              {strengthLabel}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.sbBarTrack}>
                          <View style={[styles.sbBarFill, { width: (pct * 100) + '%', backgroundColor: barColor }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Animated.View>
            )}

            {/* Planet Power AI explanation */}
            {chartData.chartExplanations?.planetPower && chartData.chartExplanations.planetPower !== 'N/A' && (
              <View style={styles.aiExplainBox}>
                <Ionicons name="bulb-outline" size={14} color="#FFB800" />
                <Text style={styles.aiExplainText}>{chartData.chartExplanations.planetPower}</Text>
              </View>
            )}

            {/* ── BHRIGU BINDU ── */}
            {chartData.advancedAnalysis.tier2?.bhriguBindu && (
              <Animated.View entering={FadeInDown.delay(600).duration(600)}>
                <View style={styles.headerRow}>
                  <Ionicons name="locate-outline" size={20} color="#FFB800" />
                  <Text style={styles.sectionTitle}>
                    {t('kpBhriguTitle') || 'Your Destiny Point'}
                  </Text>
                </View>
                <View style={[styles.advCard, { borderColor: 'rgba(255,184,0,0.15)' }]}>
                  <LinearGradient colors={['rgba(255,184,0,0.08)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <View style={styles.bbCircle}>
                      <Text style={styles.bbDeg}>{Number(chartData.advancedAnalysis.tier2.bhriguBindu.degree || 0).toFixed(1)}°</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bbRashi}>{language === 'si' ? (chartData.advancedAnalysis.tier2.bhriguBindu.sinhala || chartData.advancedAnalysis.tier2.bhriguBindu.rashi || '') : (chartData.advancedAnalysis.tier2.bhriguBindu.rashi || '')}</Text>
                      <Text style={styles.bbNak}>{language === 'si' ? (chartData.advancedAnalysis.tier2.bhriguBindu.nakshatraSinhala || chartData.advancedAnalysis.tier2.bhriguBindu.nakshatra || '') : (chartData.advancedAnalysis.tier2.bhriguBindu.nakshatra || '')}</Text>
                    </View>
                  </View>
                  {chartData.advancedAnalysis.tier2.bhriguBindu.interpretation && (
                    <Text style={styles.bbInterp}>{language === 'si' ? (chartData.advancedAnalysis.tier2.bhriguBindu.interpretationSi || chartData.advancedAnalysis.tier2.bhriguBindu.interpretation) : chartData.advancedAnalysis.tier2.bhriguBindu.interpretation}</Text>
                  )}
                </View>
              </Animated.View>
            )}

            {/* Destiny Point AI explanation */}
            {chartData.chartExplanations?.destinyPoint && chartData.chartExplanations.destinyPoint !== 'N/A' && (
              <View style={styles.aiExplainBox}>
                <Ionicons name="bulb-outline" size={14} color="#FFB800" />
                <Text style={styles.aiExplainText}>{chartData.chartExplanations.destinyPoint}</Text>
              </View>
            )}

            {/* ── PAST LIFE ── */}
            {chartData.advancedAnalysis.tier3?.pastLife && (
              <Animated.View entering={FadeInDown.delay(700).duration(600)}>
                <View style={styles.headerRow}>
                  <Ionicons name="time-outline" size={20} color="#a78bfa" />
                  <Text style={styles.sectionTitle}>
                    {t('kpPastLifeTitle') || 'Your Past Life Story'}
                  </Text>
                </View>
                <View style={[styles.advCard, { borderColor: 'rgba(167,139,250,0.15)' }]}>
                  <LinearGradient colors={['rgba(167,139,250,0.08)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
                  {chartData.advancedAnalysis.tier3.pastLife.pastLife?.pastLifeStory && (
                    <View style={styles.plRow}>
                      <Text style={styles.plLabel}>{t('kpPastLifeStory') || 'Past Life Story'}</Text>
                      <Text style={styles.plValue}>{language === 'si' ? (chartData.advancedAnalysis.tier3.pastLife.pastLife.pastLifeStorySi || chartData.advancedAnalysis.tier3.pastLife.pastLife.pastLifeStory) : chartData.advancedAnalysis.tier3.pastLife.pastLife.pastLifeStory}</Text>
                    </View>
                  )}
                  {chartData.advancedAnalysis.tier3.pastLife.currentLifeDirection?.direction && (
                    <View style={styles.plRow}>
                      <Text style={styles.plLabel}>{t('kpLifeDirection') || 'This Life\'s Purpose'}</Text>
                      <Text style={styles.plValue}>{language === 'si' ? (chartData.advancedAnalysis.tier3.pastLife.currentLifeDirection.directionSi || chartData.advancedAnalysis.tier3.pastLife.currentLifeDirection.direction) : chartData.advancedAnalysis.tier3.pastLife.currentLifeDirection.direction}</Text>
                    </View>
                  )}
                  {chartData.advancedAnalysis.tier3.pastLife.karmaBalance && (
                    <View style={styles.plRow}>
                      <Text style={styles.plLabel}>{t('kpKarmaBalance') || 'Karma Balance'}</Text>
                      <Text style={styles.plValue}>
                        {t('kpGood') || 'Good'}: {chartData.advancedAnalysis.tier3.pastLife.karmaBalance.good || 0}
                        {'  •  '}
                        {t('kpChallenging') || 'Challenging'}: {chartData.advancedAnalysis.tier3.pastLife.karmaBalance.challenging || 0}
                      </Text>
                    </View>
                  )}
                  {chartData.advancedAnalysis.tier3.pastLife.pastLifeMerit?.assessment && (
                    <View style={styles.plRow}>
                      <Text style={styles.plLabel}>{t('kpPastLifeMerit') || 'Past Life Merit'}</Text>
                      <Text style={styles.plValue}>{language === 'si' ? (chartData.advancedAnalysis.tier3.pastLife.pastLifeMerit.assessmentSi || chartData.advancedAnalysis.tier3.pastLife.pastLifeMerit.assessment) : chartData.advancedAnalysis.tier3.pastLife.pastLifeMerit.assessment}</Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            )}

            {/* Past Life AI explanation */}
            {chartData.chartExplanations?.pastLife && chartData.chartExplanations.pastLife !== 'N/A' && (
              <View style={styles.aiExplainBox}>
                <Ionicons name="bulb-outline" size={14} color="#FFB800" />
                <Text style={styles.aiExplainText}>{chartData.chartExplanations.pastLife}</Text>
              </View>
            )}

            {/* ═══ MARAKA APALA (Dangerous Periods) ═══ */}
            {(marakaData || marakaLoading) && (
              <Animated.View entering={FadeInDown.delay(750).duration(600)}>
                <View style={styles.headerRow}>
                  <Ionicons name="shield-outline" size={20} color="#f87171" />
                  <Text style={styles.sectionTitle}>
                    {language === 'si' ? 'මාරක අපල — භයානක කාල' : 'Maraka Apala — Dangerous Periods'}
                  </Text>
                </View>

                {marakaLoading && !marakaData ? (
                  <View style={[styles.advCard, { alignItems: 'center', paddingVertical: 24 }]}>
                    <CosmicLoader size={28} color="#f87171" />
                    <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 10, fontSize: 13 }}>
                      {language === 'si' ? 'මාරක අපල ගණනය කරමින්...' : 'Calculating dangerous periods...'}
                    </Text>
                  </View>
                ) : marakaData ? (
                  <View>
                    {/* Overall Status Card */}
                    <View style={[styles.advCard, {
                      borderColor: marakaData.status === 'CRITICAL' ? 'rgba(239,68,68,0.4)'
                        : marakaData.status === 'HIGH' ? 'rgba(239,68,68,0.25)'
                        : marakaData.status === 'MODERATE' ? 'rgba(245,158,11,0.25)'
                        : 'rgba(16,185,129,0.25)',
                      overflow: 'hidden',
                    }]}>
                      <LinearGradient
                        colors={
                          marakaData.status === 'CRITICAL' ? ['rgba(239,68,68,0.15)', 'rgba(239,68,68,0.03)']
                          : marakaData.status === 'HIGH' ? ['rgba(239,68,68,0.1)', 'rgba(239,68,68,0.02)']
                          : marakaData.status === 'MODERATE' ? ['rgba(245,158,11,0.1)', 'rgba(245,158,11,0.02)']
                          : ['rgba(16,185,129,0.1)', 'rgba(16,185,129,0.02)']
                        }
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      />
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={[styles.marakaStatusOrb, {
                          backgroundColor: marakaData.status === 'CRITICAL' ? 'rgba(239,68,68,0.2)'
                            : marakaData.status === 'HIGH' ? 'rgba(239,68,68,0.15)'
                            : marakaData.status === 'MODERATE' ? 'rgba(245,158,11,0.15)'
                            : 'rgba(16,185,129,0.15)',
                          borderColor: marakaData.status === 'CRITICAL' ? 'rgba(239,68,68,0.5)'
                            : marakaData.status === 'HIGH' ? 'rgba(239,68,68,0.35)'
                            : marakaData.status === 'MODERATE' ? 'rgba(245,158,11,0.35)'
                            : 'rgba(16,185,129,0.35)',
                        }]}>
                          <Ionicons
                            name={marakaData.status === 'SAFE' ? 'shield-checkmark' : 'warning'}
                            size={24}
                            color={marakaData.status === 'CRITICAL' ? '#ef4444'
                              : marakaData.status === 'HIGH' ? '#f87171'
                              : marakaData.status === 'MODERATE' ? '#f59e0b'
                              : '#10b981'}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.marakaStatusTitle, {
                            color: marakaData.status === 'CRITICAL' ? '#ef4444'
                              : marakaData.status === 'HIGH' ? '#f87171'
                              : marakaData.status === 'MODERATE' ? '#f59e0b'
                              : '#10b981',
                          }]}>
                            {language === 'si'
                              ? (marakaData.status === 'CRITICAL' ? '⛔ අතිශය භයානක' : marakaData.status === 'HIGH' ? '🔴 භයානක' : marakaData.status === 'MODERATE' ? '🟡 සැලකිලිමත් වන්න' : '🟢 ආරක්ෂිතයි')
                              : (marakaData.status === 'CRITICAL' ? '⛔ Critical Danger' : marakaData.status === 'HIGH' ? '🔴 High Danger' : marakaData.status === 'MODERATE' ? '🟡 Caution' : '🟢 Safe')}
                          </Text>
                          <Text style={styles.marakaStatusDesc}>
                            {language === 'si' ? marakaData.statusSi : marakaData.statusEn}
                          </Text>
                        </View>
                      </View>
                      {marakaData.activeCount > 0 && (
                        <View style={styles.marakaCountRow}>
                          <View style={styles.marakaCountBadge}>
                            <Text style={styles.marakaCountNum}>{marakaData.activeCount}</Text>
                            <Text style={styles.marakaCountLabel}>
                              {language === 'si' ? 'ක්‍රියාත්මක' : 'Active'}
                            </Text>
                          </View>
                          <View style={[styles.marakaCountBadge, { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.25)' }]}>
                            <Text style={[styles.marakaCountNum, { color: '#f59e0b' }]}>{(marakaData.upcomingApala || []).length}</Text>
                            <Text style={[styles.marakaCountLabel, { color: 'rgba(245,158,11,0.7)' }]}>
                              {language === 'si' ? 'ඉදිරි' : 'Upcoming'}
                            </Text>
                          </View>
                          <View style={[styles.marakaCountBadge, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }]}>
                            <Text style={[styles.marakaCountNum, { color: 'rgba(255,255,255,0.6)' }]}>{marakaData.totalCount}</Text>
                            <Text style={[styles.marakaCountLabel, { color: 'rgba(255,255,255,0.35)' }]}>
                              {language === 'si' ? 'මුළු' : 'Total'}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Active Apala List */}
                    {marakaData.activeApala && marakaData.activeApala.length > 0 && (
                      <View style={{ marginTop: 4 }}>
                        <Text style={styles.marakaSubHeader}>
                          <Ionicons name="radio-button-on" size={12} color="#ef4444" />
                          {'  ' + (language === 'si' ? 'දැන් ක්‍රියාත්මක අපල' : 'Currently Active Periods')}
                        </Text>
                        {marakaData.activeApala.map(function(apala, i) {
                          var sevColor = apala.severity === 'CRITICAL' ? '#ef4444' : apala.severity === 'HIGH' ? '#f87171' : apala.severity === 'MODERATE' ? '#f59e0b' : '#60a5fa';
                          var isExpanded = expandedApala === 'active-' + i;
                          var startDate = new Date(apala.start);
                          var endDate = new Date(apala.end);
                          var daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
                          return (
                            <TouchableOpacity key={'active-' + i} activeOpacity={0.7} onPress={function() { setExpandedApala(isExpanded ? null : 'active-' + i); }}>
                              <Animated.View entering={FadeInDown.delay(i * 100).duration(400)} style={[styles.marakaApalaCard, { borderLeftColor: sevColor }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                                  <View style={[styles.marakaSevDot, { backgroundColor: sevColor }]} />
                                  <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                      <Text style={styles.marakaApalaTitle}>
                                        {language === 'si' ? apala.title : apala.titleEn}
                                      </Text>
                                      <View style={[styles.marakaSevBadge, { backgroundColor: sevColor + '18', borderColor: sevColor + '40' }]}>
                                        <Text style={[styles.marakaSevText, { color: sevColor }]}>{apala.severity}</Text>
                                      </View>
                                    </View>
                                    <Text style={styles.marakaApalaDesc}>
                                      {language === 'si' ? apala.description : apala.descriptionEn}
                                    </Text>
                                    <View style={styles.marakaPeriodRow}>
                                      <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.35)" />
                                      <Text style={styles.marakaPeriodText}>
                                        {startDate.toLocaleDateString()} — {endDate.toLocaleDateString()}
                                      </Text>
                                      <View style={styles.marakaDaysLeftBadge}>
                                        <Text style={styles.marakaDaysLeftText}>
                                          {daysLeft > 0
                                            ? (language === 'si' ? 'දින ' + daysLeft + ' ක් ඉතිරියි' : daysLeft + ' days left')
                                            : (language === 'si' ? 'අද අවසන් වේ' : 'Ends today')}
                                        </Text>
                                      </View>
                                    </View>
                                    {/* Expandable remedies */}
                                    {isExpanded && apala.remedies && apala.remedies.length > 0 && (
                                      <Animated.View entering={FadeIn.duration(300)} style={styles.marakaRemediesBox}>
                                        <Text style={styles.marakaRemediesTitle}>
                                          {language === 'si' ? '🙏 පරිහාර' : '🙏 Remedies'}
                                        </Text>
                                        {apala.remedies.map(function(r, ri) {
                                          return (
                                            <View key={ri} style={styles.marakaRemedyRow}>
                                              <Text style={styles.marakaRemedyBullet}>•</Text>
                                              <Text style={styles.marakaRemedyText}>
                                                {language === 'si' ? r.si : r.en}
                                              </Text>
                                            </View>
                                          );
                                        })}
                                      </Animated.View>
                                    )}
                                    {!isExpanded && apala.remedies && apala.remedies.length > 0 && (
                                      <Text style={styles.marakaTapHint}>
                                        {language === 'si' ? '↓ පරිහාර බැලීමට ඔබන්න' : '↓ Tap for remedies'}
                                      </Text>
                                    )}
                                  </View>
                                </View>
                              </Animated.View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {/* Upcoming Apala List */}
                    {marakaData.upcomingApala && marakaData.upcomingApala.length > 0 && (
                      <View style={{ marginTop: 12 }}>
                        <Text style={styles.marakaSubHeader}>
                          <Ionicons name="time-outline" size={12} color="#f59e0b" />
                          {'  ' + (language === 'si' ? 'ඉදිරි අපල කාල' : 'Upcoming Periods')}
                        </Text>
                        {marakaData.upcomingApala.slice(0, 5).map(function(apala, i) {
                          var sevColor = apala.severity === 'CRITICAL' ? '#ef4444' : apala.severity === 'HIGH' ? '#f87171' : apala.severity === 'MODERATE' ? '#f59e0b' : '#60a5fa';
                          var isExpanded = expandedApala === 'upcoming-' + i;
                          var startDate = new Date(apala.start);
                          var endDate = new Date(apala.end);
                          var daysUntil = Math.ceil((startDate - new Date()) / (1000 * 60 * 60 * 24));
                          return (
                            <TouchableOpacity key={'upcoming-' + i} activeOpacity={0.7} onPress={function() { setExpandedApala(isExpanded ? null : 'upcoming-' + i); }}>
                              <Animated.View entering={FadeInDown.delay(i * 80).duration(400)} style={[styles.marakaApalaCard, { borderLeftColor: sevColor, opacity: 0.8 }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                                  <View style={[styles.marakaSevDot, { backgroundColor: sevColor, opacity: 0.6 }]} />
                                  <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                      <Text style={[styles.marakaApalaTitle, { color: 'rgba(224,231,255,0.7)' }]}>
                                        {language === 'si' ? apala.title : apala.titleEn}
                                      </Text>
                                      <View style={[styles.marakaSevBadge, { backgroundColor: sevColor + '12', borderColor: sevColor + '30' }]}>
                                        <Text style={[styles.marakaSevText, { color: sevColor, opacity: 0.8 }]}>{apala.severity}</Text>
                                      </View>
                                    </View>
                                    <View style={styles.marakaPeriodRow}>
                                      <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.25)" />
                                      <Text style={[styles.marakaPeriodText, { color: 'rgba(255,255,255,0.35)' }]}>
                                        {startDate.toLocaleDateString()} — {endDate.toLocaleDateString()}
                                      </Text>
                                      <View style={[styles.marakaDaysLeftBadge, { backgroundColor: 'rgba(245,158,11,0.08)' }]}>
                                        <Text style={[styles.marakaDaysLeftText, { color: 'rgba(245,158,11,0.7)' }]}>
                                          {language === 'si' ? 'දින ' + daysUntil + ' කින්' : 'in ' + daysUntil + ' days'}
                                        </Text>
                                      </View>
                                    </View>
                                    {/* Expandable remedies */}
                                    {isExpanded && (
                                      <Animated.View entering={FadeIn.duration(300)}>
                                        <Text style={[styles.marakaApalaDesc, { marginTop: 6 }]}>
                                          {language === 'si' ? apala.description : apala.descriptionEn}
                                        </Text>
                                        {apala.remedies && apala.remedies.length > 0 && (
                                          <View style={styles.marakaRemediesBox}>
                                            <Text style={styles.marakaRemediesTitle}>
                                              {language === 'si' ? '🙏 පරිහාර' : '🙏 Remedies'}
                                            </Text>
                                            {apala.remedies.map(function(r, ri) {
                                              return (
                                                <View key={ri} style={styles.marakaRemedyRow}>
                                                  <Text style={styles.marakaRemedyBullet}>•</Text>
                                                  <Text style={styles.marakaRemedyText}>
                                                    {language === 'si' ? r.si : r.en}
                                                  </Text>
                                                </View>
                                              );
                                            })}
                                          </View>
                                        )}
                                      </Animated.View>
                                    )}
                                    {!isExpanded && (
                                      <Text style={styles.marakaTapHint}>
                                        {language === 'si' ? '↓ විස්තර බැලීමට ඔබන්න' : '↓ Tap for details'}
                                      </Text>
                                    )}
                                  </View>
                                </View>
                              </Animated.View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {/* Safe message when no active or upcoming */}
                    {marakaData.status === 'SAFE' && (!marakaData.upcomingApala || marakaData.upcomingApala.length === 0) && (
                      <View style={[styles.advCard, { alignItems: 'center', paddingVertical: 20 }]}>
                        <Ionicons name="shield-checkmark" size={32} color="#10b981" />
                        <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 15, marginTop: 8 }}>
                          {language === 'si' ? 'ආරක්ෂිත කාලයයි' : 'You\'re in a Safe Period'}
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                          {language === 'si' ? 'ළඟදී මාරක අපල කාලයක් නැත' : 'No dangerous periods detected in the near future'}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : null}
              </Animated.View>
            )}

            {/* ── ENGINE FOOTER ── */}
            <Animated.View entering={FadeIn.delay(800).duration(400)}>
              <Text style={styles.engineFooter}>
                {chartData.advancedAnalysis.engineVersion} • {chartData.advancedAnalysis.computeTimeMs}ms
              </Text>
            </Animated.View>

          </View>
        )}
      </View>
    );
  };

  return (
    <DesktopScreenWrapper routeName="kendara">
    <View style={{ flex: 1, backgroundColor: '#020412' }}>
      <BlueAuroraNebula />
      <BlueNebulaBg />
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#60A5FA" />}>
        <View style={[styles.content, isDesktop && styles.contentDesktop]}>
          <Animated.View entering={FadeIn.duration(700)} style={styles.pageTitleRow}>
            <View>
              <Text style={styles.pageTitle}>
                {t('kpYourHoroscope') || 'Your Horoscope'}
              </Text>
              <Text style={styles.pageSubtitle}>
                {user && user.birthData && user.birthData.dateTime
                  ? new Date(user.birthData.dateTime).toLocaleDateString() + '  ' + toSLT(user.birthData.dateTime)
                  : ''}
              </Text>
            </View>
            {user?.birthData && (
              <View style={styles.lagnaOrb}>
                <LinearGradient colors={['#FF8C00', '#E65100']} style={StyleSheet.absoluteFill} />
                <Ionicons name="planet" size={22} color="#FFB800" />
              </View>
            )}
          </Animated.View>
          {renderContent()}
        </View>
        <View style={{ height: isDesktop ? 32 : 110 }} />
      </ScrollView>
    </View>
    </DesktopScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 100 : 80 },
  contentDesktop: { paddingTop: 20, paddingHorizontal: 28, maxWidth: 900, alignSelf: 'center', width: '100%' },
  pageTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  pageTitle: { fontSize: 30, fontWeight: '800', color: '#FFB800', marginBottom: 3, textShadowColor: 'rgba(255,184,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  pageSubtitle: { fontSize: 13, color: 'rgba(255,214,102,0.50)', fontWeight: '500' },
  lagnaOrb: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,184,0,0.35)', shadowColor: '#FF8C00', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 0 },
  center: { alignItems: 'center', justifyContent: 'center', height: 300 },
  emptyState: { alignItems: 'center', padding: 40, backgroundColor: 'rgba(255,140,0,0.07)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,140,0,0.2)' },
  emptyTitle: { color: '#FFB800', fontSize: 18, marginVertical: 16, fontWeight: '700' },
  emptyText: { color: 'rgba(255,214,102,0.45)', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  actionButton: { backgroundColor: '#FFB800', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  actionButtonText: { fontWeight: '800', color: '#1A1040' },
  errorText: { color: '#F87171', fontSize: 14 },
  chartContainer: { marginBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: '#FFE8B0', fontSize: 17, marginLeft: 10, fontWeight: '700', flex: 1, textShadowColor: 'rgba(255,184,0,0.20)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  detailsCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', padding: 16, borderRadius: 18, marginTop: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    shadowColor: '#FF8C00', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 0,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  infoLabel: { color: 'rgba(255,214,102,0.50)', fontSize: 13 },
  infoValue: { color: '#FFE8B0', fontWeight: '600', fontSize: 13 },
  cardTitle: { color: '#FFB800', marginBottom: 14, fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },

  // Planet Positions — bar style
  planetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)', gap: 8 },
  planetDot: { width: 8, height: 8, borderRadius: 4 },
  planetName: { fontSize: 13, fontWeight: '700', width: 52 },
  planetBarTrack: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  planetBarFill: { height: 4, borderRadius: 2, opacity: 0.7 },
  planetRashi: { color: 'rgba(255,214,102,0.50)', fontSize: 11, fontWeight: '500', width: 90, textAlign: 'right' },

  // Advanced Analysis styles
  advCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 16, overflow: 'hidden',
  },
  countBadge: {
    backgroundColor: 'rgba(255,184,0,0.15)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.3)',
  },
  countText: { color: '#FFB800', fontSize: 12, fontWeight: '800' },

  // Dosha styles
  doshaRow: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  doshaDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  doshaName: { color: '#FFE8B0', fontSize: 14, fontWeight: '700' },
  doshaDesc: { color: 'rgba(255,214,102,0.40)', fontSize: 12, lineHeight: 18, marginTop: 3 },
  cancelBadge: { backgroundColor: 'rgba(52,211,153,0.15)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)' },
  cancelText: { color: '#34D399', fontSize: 9, fontWeight: '800' },
  cancelReason: { color: 'rgba(52,211,153,0.6)', fontSize: 11, fontStyle: 'italic', marginTop: 3 },
  sevBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  sevText: { fontSize: 9, fontWeight: '800' },

  // Yoga styles
  yogaItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  yogaTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  yogaName: { color: '#FFE8B0', fontSize: 14, fontWeight: '700', flex: 1 },
  yogaCat: { color: 'rgba(255,140,0,0.6)', fontSize: 11, fontWeight: '600', marginTop: 3 },
  yogaDesc: { color: 'rgba(255,214,102,0.40)', fontSize: 12, lineHeight: 18, marginTop: 3 },
  yogaPlanets: { color: 'rgba(255,184,0,0.6)', fontSize: 11, marginTop: 4 },
  strBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  strText: { fontSize: 10, fontWeight: '700' },

  // Jaimini styles
  jaiminiHighlight: { borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,140,0,0.15)', overflow: 'hidden' },
  jaiminiLabel: { color: 'rgba(255,140,0,0.7)', fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  jaiminiValue: { color: '#FF8C00', fontSize: 22, fontWeight: '900' },
  jaiminiSub: { color: 'rgba(255,214,102,0.35)', fontSize: 11, marginTop: 8, lineHeight: 18 },
  jaiminiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  jaiminiMini: { flex: 1, minWidth: 90, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 10, alignItems: 'center' },
  jmLabel: { color: 'rgba(255,214,102,0.35)', fontSize: 10, fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  jmValue: { color: '#FFE8B0', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  jmDesc: { color: 'rgba(255,214,102,0.30)', fontSize: 10, textAlign: 'center', marginTop: 4 },

  // Shadbala styles
  sbRow: { marginBottom: 14 },
  sbTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sbPlanet: { fontSize: 14, fontWeight: '700', width: 70 },
  sbRupas: { color: 'rgba(255,214,102,0.50)', fontSize: 12, fontWeight: '600', flex: 1 },
  sbBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  sbBarTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  sbBarFill: { height: 6, borderRadius: 3 },

  // Bhrigu Bindu styles
  bbCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: 'rgba(255,184,0,0.35)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,184,0,0.06)' },
  bbDeg: { color: '#FFB800', fontSize: 16, fontWeight: '800' },
  bbRashi: { color: '#FFE8B0', fontSize: 16, fontWeight: '700' },
  bbNak: { color: 'rgba(255,214,102,0.40)', fontSize: 12, marginTop: 2 },
  bbInterp: { color: 'rgba(255,214,102,0.40)', fontSize: 12, lineHeight: 18, marginTop: 12 },

  // Past Life styles
  plRow: { marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  plLabel: { color: 'rgba(167,139,250,0.7)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  plValue: { color: '#FFE8B0', fontSize: 13, lineHeight: 20 },
  plIndicator: { color: 'rgba(255,214,102,0.35)', fontSize: 12, lineHeight: 20, paddingLeft: 4 },

  // Engine footer
  engineFooter: { color: 'rgba(255,255,255,0.12)', fontSize: 10, textAlign: 'center', marginTop: 4, marginBottom: 10 },

  // AI explanation inline box
  aiExplainBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(255,184,0,0.05)',
    borderLeftWidth: 3, borderLeftColor: 'rgba(255,184,0,0.4)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    marginHorizontal: 2, marginBottom: 10, marginTop: -4,
  },
  aiExplainText: { flex: 1, color: 'rgba(255,214,102,0.65)', fontSize: 13, lineHeight: 20, fontStyle: 'italic' },

  // Loading screen styles
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingCard: { width: '100%', borderRadius: 24, padding: 28, borderWidth: 1, borderColor: 'rgba(255,184,0,0.15)', overflow: 'hidden' },
  loadingTitle: { color: '#FFB800', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 24, letterSpacing: 1 },
  stepsContainer: { gap: 6, marginBottom: 24 },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, gap: 12 },
  stepRowActive: { backgroundColor: 'rgba(255,184,0,0.06)' },
  stepIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  stepIconDone: { backgroundColor: 'rgba(52,211,153,0.12)', borderColor: 'rgba(52,211,153,0.3)' },
  stepIconActive: { backgroundColor: 'rgba(255,184,0,0.1)', borderColor: 'rgba(255,184,0,0.3)' },
  stepText: { fontSize: 14, fontWeight: '500', flex: 1 },
  stepTextDone: { color: 'rgba(52,211,153,0.7)' },
  stepTextActive: { color: '#FFB800', fontWeight: '700' },
  stepTextPending: { color: 'rgba(255,255,255,0.22)' },
  loadingBarTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  loadingBarFill: { height: 4, backgroundColor: '#FFB800', borderRadius: 2 },

  // ── Maraka Apala styles ──
  marakaStatusOrb: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  marakaStatusTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  marakaStatusDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 18 },
  marakaCountRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  marakaCountBadge: {
    flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  marakaCountNum: { color: '#f87171', fontSize: 20, fontWeight: '900' },
  marakaCountLabel: { color: 'rgba(248,113,113,0.7)', fontSize: 10, fontWeight: '600', marginTop: 2 },
  marakaSubHeader: {
    color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700',
    marginBottom: 8, marginTop: 4, letterSpacing: 0.3,
  },
  marakaApalaCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderLeftWidth: 3, marginBottom: 8,
  },
  marakaSevDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  marakaApalaTitle: { color: '#FFE8B0', fontSize: 14, fontWeight: '700', flexShrink: 1 },
  marakaSevBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  marakaSevText: { fontSize: 9, fontWeight: '800' },
  marakaApalaDesc: { color: 'rgba(255,214,102,0.40)', fontSize: 12, lineHeight: 18, marginTop: 4 },
  marakaPeriodRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  marakaPeriodText: { color: 'rgba(255,214,102,0.40)', fontSize: 11, fontWeight: '500' },
  marakaDaysLeftBadge: { backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  marakaDaysLeftText: { color: 'rgba(248,113,113,0.8)', fontSize: 10, fontWeight: '700' },
  marakaRemediesBox: {
    backgroundColor: 'rgba(16,185,129,0.05)', borderRadius: 10, padding: 12,
    marginTop: 10, borderWidth: 1, borderColor: 'rgba(16,185,129,0.15)',
  },
  marakaRemediesTitle: { color: '#10b981', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  marakaRemedyRow: { flexDirection: 'row', gap: 6, marginBottom: 4, paddingLeft: 2 },
  marakaRemedyBullet: { color: 'rgba(16,185,129,0.6)', fontSize: 12, fontWeight: '700' },
  marakaRemedyText: { color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 18, flex: 1 },
  marakaTapHint: { color: 'rgba(255,255,255,0.2)', fontSize: 10, marginTop: 6, fontStyle: 'italic' },
  
});
