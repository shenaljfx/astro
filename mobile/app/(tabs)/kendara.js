import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, RefreshControl, TouchableOpacity,
  StyleSheet, Dimensions, Platform, Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, interpolate } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import DesktopScreenWrapper, { useDesktopCtx } from '../../components/DesktopScreenWrapper';
import SriLankanChart from '../../components/SriLankanChart';
import SpringPressable from '../../components/effects/SpringPressable';
import CosmicLoader from '../../components/effects/CosmicLoader';
import PinchableView from '../../components/effects/PinchableView';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { screenColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { boxShadow, textShadow } from '../../utils/shadow';
import useScreenInsets from '../../hooks/useScreenInsets';
import useReducedMotion from '../../hooks/useReducedMotion';
import useLowEndDevice from '../../hooks/useLowEndDevice';
import { CosmicBackground } from '../../components/CosmicBackground';
import { ZODIAC_IMAGES, ZODIAC_IMAGE_MAP } from '../../components/ZodiacIcons';

const CHART_CACHE_KEY = '@grahachara_chart_cache';
const KENDARA_RITUAL_KEY = '@grahachara_kendara_ritual_state';

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

function formatBirthTime(isoOrObj) {
  if (!isoOrObj) return '--:--';
  if (typeof isoOrObj === 'object' && isoOrObj.display) return isoOrObj.display;
  // Extract time directly from ISO string to avoid timezone conversion issues
  var str = String(isoOrObj);
  var tMatch = str.match(/T(\d{2}):(\d{2})/);
  if (tMatch) {
    var h = parseInt(tMatch[1], 10);
    var m = tMatch[2];
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 || 12;
    return String(h12).padStart(2, '0') + ':' + m + ' ' + ampm;
  }
  // Fallback: try parsing as Date but extract UTC values (birth times are stored without TZ offset)
  var d = new Date(isoOrObj);
  if (isNaN(d.getTime())) return '--:--';
  var hh = d.getUTCHours();
  var mm = d.getUTCMinutes();
  var ap = hh >= 12 ? 'PM' : 'AM';
  var h12f = hh % 12 || 12;
  return String(h12f).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + ' ' + ap;
}

// ── Chart Glow Aura wrapper ──────────────────────────────────────────
function ChartGlowAura({ lagnaColor, children, reduced, lowEnd }) {
  var glow = useSharedValue(0.5);
  var orbit = useSharedValue(0);
  useEffect(function () {
    if (reduced || lowEnd) return;
    glow.value = withRepeat(withSequence(withTiming(1, { duration: 3200 }), withTiming(0.5, { duration: 3200 })), -1);
    orbit.value = withRepeat(withTiming(1, { duration: 26000 }), -1, false);
  }, [reduced, lowEnd]);
  var glowStyle = useAnimatedStyle(function () { return { opacity: glow.value }; });
  var orbitStyle = useAnimatedStyle(function () {
    return { transform: [{ rotate: (orbit.value * 360) + 'deg' }] };
  });
  var color = lagnaColor || '#9333EA';
  return (
    <View style={styles.chartAuraWrap}>
      <Animated.View style={[StyleSheet.absoluteFill, glowStyle, { alignItems: 'center', justifyContent: 'center' }]}>
        <View style={{
          width: SCREEN_WIDTH * 0.82, height: SCREEN_WIDTH * 0.82, borderRadius: SCREEN_WIDTH * 0.41,
          backgroundColor: color + '18',
          ...boxShadow(color, { width: 0, height: 0 }, 0.6, 40),
        }} />
      </Animated.View>
      {!lowEnd && (
        <Animated.View style={[styles.chartOrbitRing, orbitStyle, { borderColor: color + '30' }]}> 
          <View style={[styles.chartOrbitSpark, { backgroundColor: color }]} />
          <View style={[styles.chartOrbitSparkAlt, { backgroundColor: '#FFB800' }]} />
        </Animated.View>
      )}
      <View style={[styles.chartPremiumFrame, { borderColor: color + '45', ...boxShadow(color, { width: 0, height: 0 }, 0.34, 22) }]}>
        <LinearGradient
          colors={[color + '26', 'rgba(18,10,8,0.96)', 'rgba(255,184,0,0.08)', color + '12']}
          style={styles.chartFrameGradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={styles.chartFrameInnerLine} />
          {children}
        </LinearGradient>
      </View>
    </View>
  );
}

function getKendaraBirthLine(user, language) {
  if (!user || !user.birthData || !user.birthData.dateTime) return language === 'si' ? 'උපන් විස්තර එක් කළාම සිතියම සම්පූර්ණයි' : 'Add birth details to complete your map';
  var dt = String(user.birthData.dateTime);
  var dateMatch = dt.match(/^(\d{4})-(\d{2})-(\d{2})/);
  var dateStr = dateMatch ? dateMatch[3] + '/' + dateMatch[2] + '/' + dateMatch[1] : dt.slice(0, 10);
  return dateStr + '  ' + formatBirthTime(dt);
}

function getKendaraStrongestShadbala(shadbala) {
  if (!shadbala) return null;
  var items = Object.values(shadbala).filter(Boolean);
  if (items.length === 0) return null;
  items.sort(function (a, b) { return Number(b.percentage || 0) - Number(a.percentage || 0); });
  return items[0];
}

function trimKendaraCopy(text, maxLength) {
  var source = String(text || '').replace(/\s+/g, ' ').trim();
  if (!source || source.length <= maxLength) return source;
  return source.slice(0, maxLength - 1).trim() + '...';
}

function fullKendaraCopy(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function getKendaraSLTDayKey(date) {
  var source = date instanceof Date ? date.getTime() : Date.now();
  return new Date(source + (5.5 * 60 * 60 * 1000)).toISOString().slice(0, 10);
}

function getKendaraDailyIndex(dayKey, total) {
  if (!total || total <= 0) return 0;
  var key = String(dayKey || getKendaraSLTDayKey());
  var sum = 0;
  for (var i = 0; i < key.length; i += 1) sum += key.charCodeAt(i);
  return sum % total;
}

function getKendaraRashiImage(rashi) {
  if (!rashi) return null;
  if (typeof rashi === 'number') return ZODIAC_IMAGES[rashi - 1] || null;
  if (typeof rashi === 'string') return ZODIAC_IMAGE_MAP[rashi] || null;
  return ZODIAC_IMAGE_MAP[rashi.name] || ZODIAC_IMAGE_MAP[rashi.english] || ZODIAC_IMAGE_MAP[rashi.sanskrit] || (rashi.rashiId ? ZODIAC_IMAGES[rashi.rashiId - 1] : null);
}

function buildKendaraInsightCards(chartData, jyotishData, topYogas, language) {
  var cards = [];
  var shadbala = chartData && chartData.advancedAnalysis && chartData.advancedAnalysis.tier2 ? chartData.advancedAnalysis.tier2.shadbala : null;
  var strongest = getKendaraStrongestShadbala(shadbala);
  var dasha = jyotishData && jyotishData.dasha;
  var mainDasha = dasha && dasha.currentMahadasha;
  var mainPlanet = getKendaraDashaPlanet(mainDasha);
  var activeYoga = topYogas && topYogas.length > 0 ? topYogas[0] : null;
  var bhrigu = chartData && chartData.advancedAnalysis && chartData.advancedAnalysis.tier2 ? chartData.advancedAnalysis.tier2.bhriguBindu : null;

  if (mainPlanet) {
    cards.push({
      icon: 'git-branch-outline',
      color: '#A78BFA',
      eyebrow: language === 'si' ? 'දැන් ක්‍රියාත්මක කාලය' : 'Current Chapter',
      title: getKendaraPlanetName(mainPlanet, language),
      body: fullKendaraCopy(getKendaraDashaPersonalNote(dasha, language, shadbala)),
    });
  }

  if (strongest) {
    cards.push({
      icon: 'bar-chart-outline',
      color: PLANET_INFO[strongest.name] ? PLANET_INFO[strongest.name].color : '#FFB800',
      eyebrow: language === 'si' ? 'වැඩියෙන්ම සහාය දෙන ග්‍රහයා' : 'Strongest Support',
      title: getKendaraPlanetName(strongest.name, language) + ' ' + (strongest.percentage || 0) + '%',
      body: fullKendaraCopy(getKendaraShadbalaPersonalDetail(strongest, language)),
    });
  }

  if (activeYoga) {
    var yogaCopy = getKendaraStrengthCopy(activeYoga, language);
    cards.push({
      icon: 'sparkles-outline',
      color: '#FFB800',
      eyebrow: language === 'si' ? 'සඟවුණු සහජ ශක්තිය' : 'Hidden Strength',
      title: yogaCopy.label,
      body: fullKendaraCopy(yogaCopy.desc),
    });
  }

  if (bhrigu) {
    cards.push({
      icon: 'locate-outline',
      color: '#06B6D4',
      eyebrow: language === 'si' ? 'දෛව ලක්ෂ්‍යය' : 'Destiny Point',
      title: getKendaraRashiName(bhrigu.rashi || bhrigu.rashiName || bhrigu.sinhala, language),
      body: fullKendaraCopy(getKendaraBhriguPersonalDetail(bhrigu, language)),
    });
  }

  if (cards.length === 0 && chartData) {
    var lagna = chartData.lagna && (chartData.lagna.english || chartData.lagna.name || chartData.lagna.rashiId);
    cards.push({
      icon: 'compass-outline',
      color: '#FFB800',
      eyebrow: language === 'si' ? 'ජීවිත දිශාව' : 'Life Direction',
      title: getKendaraRashiName(lagna, language),
      body: fullKendaraCopy(getKendaraLifeStyle(lagna, language)),
    });
  }

  return cards;
}

function trimKendaraBhriguPersonalDetail(point, language) {
  return trimKendaraCopy(getKendaraBhriguPersonalDetail(point, language), 190);
}

function buildKendaraMasteryItems(chartData, jyotishData, marakaData, selectedVarga, language, isPreview) {
  // For free users (isPreview) only the chart is genuinely open; the rest are
  // locked, so we never mark them "done" — the strip stays honest ("1 of 5").
  return [
    { done: !!(chartData && chartData.rashiChart), label: language === 'si' ? 'මූලික සිතියම' : 'Chart' },
    { done: !isPreview && !!(chartData && chartData.advancedAnalysis && chartData.advancedAnalysis.tier1 && chartData.advancedAnalysis.tier1.advancedYogas), label: language === 'si' ? 'ශක්තීන්' : 'Strengths' },
    { done: !isPreview && !!(jyotishData && jyotishData.dasha), label: language === 'si' ? 'කාලය' : 'Timeline' },
    { done: !isPreview && !!selectedVarga, label: language === 'si' ? 'ජීවිත කොටස්' : 'Life Areas' },
    { done: !isPreview && !!marakaData, label: language === 'si' ? 'ආරක්ෂාව' : 'Care' },
  ];
}

function buildKendaraDailyRitual(insightCards, chartData, jyotishData, marakaData, visitState, language) {
  if (!chartData) return null;
  var dayKey = visitState && visitState.dayKey ? visitState.dayKey : getKendaraSLTDayKey();
  var focus = insightCards && insightCards.length > 0 ? insightCards[getKendaraDailyIndex(dayKey, insightCards.length)] : null;
  var dashaPlanet = jyotishData && jyotishData.dasha && jyotishData.dasha.currentMahadasha ? getKendaraDashaPlanet(jyotishData.dasha.currentMahadasha) : null;
  var isCareActive = !!(marakaData && marakaData.status && marakaData.status !== 'SAFE');
  var lagna = chartData.lagna && (chartData.lagna.english || chartData.lagna.name || chartData.lagna.rashiId);
  var defaultFocus = {
    icon: isCareActive ? 'shield-outline' : dashaPlanet ? 'git-branch-outline' : 'compass-outline',
    color: isCareActive ? '#F87171' : dashaPlanet ? '#A78BFA' : '#FFB800',
    eyebrow: language === 'si' ? 'අද දවසේ කේන්දර චාරිත්‍රය' : 'Today\'s Chart Ritual',
    title: dashaPlanet ? getKendaraPlanetName(dashaPlanet, language) : getKendaraRashiName(lagna, language),
    body: dashaPlanet ? getKendaraDashaPersonalNote(jyotishData.dasha, language, chartData.advancedAnalysis?.tier2?.shadbala) : getKendaraLifeStyle(lagna, language),
  };
  var focusCard = focus || defaultFocus;
  var tasks = [
    {
      icon: focusCard.icon || 'sparkles-outline',
      color: focusCard.color || '#FFB800',
      label: language === 'si' ? 'අද ප්‍රධාන ඉඟිය' : 'Daily Key',
      value: focusCard.title || defaultFocus.title,
      detail: fullKendaraCopy(focusCard.body || defaultFocus.body),
    },
    {
      icon: 'git-branch-outline',
      color: '#A78BFA',
      label: language === 'si' ? 'කාල පරිච්ඡේදය' : 'Chapter',
      value: dashaPlanet ? getKendaraPlanetName(dashaPlanet, language) : (language === 'si' ? 'ලෑස්ති වෙමින්' : 'Preparing'),
      detail: dashaPlanet ? fullKendaraCopy(getKendaraDashaPersonalNote(jyotishData.dasha, language, chartData.advancedAnalysis?.tier2?.shadbala)) : (language === 'si' ? 'දශා දත්ත ලැබුනාම මේ කොටස විවෘත වෙනවා.' : 'This opens once timeline data is available.'),
    },
    {
      icon: isCareActive ? 'warning-outline' : 'shield-checkmark-outline',
      color: isCareActive ? '#F87171' : '#34D399',
      label: language === 'si' ? 'ආරක්ෂිත තත්ත්වය' : 'Care Signal',
      value: isCareActive ? (language === 'si' ? 'අද සැලකිල්ලෙන්' : 'Review Today') : (language === 'si' ? 'සන්සුන්' : 'Clear'),
      detail: marakaData ? fullKendaraCopy(language === 'si' ? (marakaData.statusSi || '') : (marakaData.statusEn || '')) : (language === 'si' ? 'සංවේදී කාල දත්ත ලැබෙන තුරු සාමාන්‍ය කියවීමක් පෙන්වයි.' : 'Care timing appears here once available.'),
    },
  ];

  return {
    icon: focusCard.icon || defaultFocus.icon,
    color: focusCard.color || defaultFocus.color,
    eyebrow: language === 'si' ? 'අද නැවත විවෘත කරන්න' : 'Return Ritual',
    title: language === 'si' ? 'අද කේන්දර යතුර' : 'Today\'s Chart Key',
    body: fullKendaraCopy(focusCard.body || defaultFocus.body),
    focusTitle: focusCard.title || defaultFocus.title,
    tasks: tasks,
  };
}

function PremiumHeroMetric({ icon, label, value, color }) {
  return (
    <View style={[styles.heroMetric, { borderColor: color + '28', backgroundColor: color + '0D' }]}>
      <Ionicons name={icon} size={14} color={color} />
      <View style={styles.heroMetricTextWrap}>
        <Text style={styles.heroMetricLabel} numberOfLines={1}>{label}</Text>
        <Text style={[styles.heroMetricValue, { color: color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>{value || '--'}</Text>
      </View>
    </View>
  );
}

function PremiumKendaraHero({ chartData, jyotishData, user, language, gradients, reduced, lowEnd }) {
  var hasChart = !!chartData;
  var lagna = hasChart && chartData.lagna ? (chartData.lagna.english || chartData.lagna.name || chartData.lagna.rashiId) : null;
  var moon = hasChart && chartData.moonSign ? (chartData.moonSign.english || chartData.moonSign.name || chartData.moonSign.rashiId) : null;
  var nakshatra = hasChart ? ((chartData.panchanga && chartData.panchanga.nakshatra) || chartData.nakshatra) : null;
  var dashaPlanet = jyotishData && jyotishData.dasha && jyotishData.dasha.currentMahadasha ? getKendaraDashaPlanet(jyotishData.dasha.currentMahadasha) : null;
  var lagnaName = lagna ? getKendaraRashiName(lagna, language) : '--';
  var lagnaImage = hasChart ? getKendaraRashiImage(chartData.lagna) : null;
  var moonName = moon ? getKendaraRashiName(moon, language) : '--';
  var nakName = nakshatra ? getKendaraEntryName(nakshatra) : '--';
  var chapterName = dashaPlanet ? getKendaraPlanetName(dashaPlanet, language) : (language === 'si' ? 'සකස් වෙමින්' : 'Preparing');
  var birthLine = getKendaraBirthLine(user, language);
  var heroCopy = hasChart
    ? getKendaraLifeStyle(lagna, language)
    : (language === 'si' ? 'ඔබේ උපන් විස්තර එක් කළාම, කේන්දරේ ප්‍රධාන සිතියම මෙතනින් විවෘත වෙනවා.' : 'Your premium chart vault opens here once your birth details are ready.');
  var sealBreath = useSharedValue(0);
  var sealOrbit = useSharedValue(0);
  useEffect(function () {
    if (reduced || lowEnd) return;
    sealBreath.value = withRepeat(withSequence(withTiming(1, { duration: 2400 }), withTiming(0, { duration: 2400 })), -1);
    sealOrbit.value = withRepeat(withTiming(1, { duration: 18000 }), -1, false);
  }, [reduced, lowEnd]);
  var sealMotionStyle = useAnimatedStyle(function () {
    return {
      transform: [
        { translateY: interpolate(sealBreath.value, [0, 1], [0, -5]) },
        { scale: interpolate(sealBreath.value, [0, 1], [1, 1.025]) },
      ],
    };
  });
  var sealGlowStyle = useAnimatedStyle(function () {
    return { opacity: reduced || lowEnd ? 0.38 : interpolate(sealBreath.value, [0, 1], [0.34, 0.76]) };
  });
  var sealOrbitStyle = useAnimatedStyle(function () {
    return { transform: [{ rotate: (sealOrbit.value * 360) + 'deg' }] };
  });
  var sealCounterOrbitStyle = useAnimatedStyle(function () {
    return { transform: [{ rotate: (-sealOrbit.value * 360) + 'deg' }] };
  });
  var sealImageStyle = useAnimatedStyle(function () {
    return {
      transform: [
        { scale: reduced || lowEnd ? 1 : interpolate(sealBreath.value, [0, 1], [1, 1.045]) },
        { rotate: reduced || lowEnd ? '0deg' : interpolate(sealBreath.value, [0, 1], [-1.5, 1.5]) + 'deg' },
      ],
    };
  });
  var sealShimmerStyle = useAnimatedStyle(function () {
    return {
      opacity: reduced || lowEnd ? 0.18 : interpolate(sealBreath.value, [0, 1], [0.12, 0.42]),
      transform: [{ translateX: interpolate(sealBreath.value, [0, 1], [-70, 70]) }, { rotate: '-18deg' }],
    };
  });

  return (
    <Animated.View entering={FadeInDown.duration(650)} style={styles.premiumHeroWrap}>
      <LinearGradient colors={['rgba(255,184,0,0.22)', 'rgba(67,24,120,0.18)', 'rgba(6,182,212,0.08)', 'rgba(6,4,2,0.92)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <LinearGradient colors={['rgba(255,255,255,0.16)', 'transparent']} style={styles.heroTopSheen} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.8 }} />
      <Animated.View style={[styles.heroPortalGlow, sealGlowStyle]} />
      <View style={styles.heroConstellationLine} />

      <View style={styles.heroPortalStage}>
        <Animated.View style={[styles.heroPortalOrbitOuter, sealOrbitStyle]}>
          <View style={styles.heroOrbitNodeGold} />
          <View style={styles.heroOrbitNodeCyan} />
        </Animated.View>
        <Animated.View style={[styles.heroPortalOrbitInner, sealCounterOrbitStyle]}>
          <View style={styles.heroOrbitNodePurple} />
        </Animated.View>
        <Animated.View style={[styles.heroPortalCard, sealMotionStyle]}>
          <LinearGradient colors={['rgba(255,232,176,0.94)', 'rgba(255,184,0,0.88)', 'rgba(180,83,9,0.86)']} style={StyleSheet.absoluteFill} start={{ x: 0.1, y: 0 }} end={{ x: 0.95, y: 1 }} />
          <Animated.View style={[styles.heroPortalShimmer, sealShimmerStyle]} />
          <Animated.View style={[styles.heroPortalImageOrb, sealImageStyle]}>
            {lagnaImage ? (
              <Image source={lagnaImage} style={styles.heroPortalImage} resizeMode="contain" />
            ) : (
              <Ionicons name="planet" size={74} color="#1A1040" />
            )}
          </Animated.View>
          <Text style={styles.heroPortalName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.62}>{lagnaName}</Text>
          <Text style={styles.heroPortalSub}>{language === 'si' ? 'ඔබේ ලග්න බලය' : 'Ascendant Power'}</Text>
        </Animated.View>
        <View style={styles.heroFloatingChipLeft}>
          <Ionicons name="moon-outline" size={12} color="#C7D2FE" />
          <Text style={styles.heroFloatingChipText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{moonName}</Text>
        </View>
        <View style={styles.heroFloatingChipRight}>
          <Ionicons name="sparkles-outline" size={12} color="#FFB800" />
          <Text style={styles.heroFloatingChipText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{chapterName}</Text>
        </View>
      </View>

      <View style={styles.heroCopyPanel}>
        <View style={styles.heroKickerRowPremium}>
          <Ionicons name="diamond-outline" size={13} color="#FFB800" />
          <Text style={styles.heroKicker}>{language === 'si' ? 'පුද්ගලික කේන්දර භණ්ඩාගාරය' : 'Personal Chart Vault'}</Text>
        </View>
        <Text style={[styles.heroTitlePremium, language === 'si' && styles.sinhalaTextFlow]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.82}>
          {language === 'si' ? 'මගේ ජීවිත සිතියම' : 'My Life Map'}
        </Text>
        <Text style={[styles.heroSubtitlePremium, language === 'si' && styles.sinhalaTextFlow]}>
          {fullKendaraCopy(heroCopy)}
        </Text>
      </View>

      <View style={styles.heroBirthRow}>
        <Ionicons name="time-outline" size={13} color="rgba(255,214,102,0.64)" />
        <Text style={styles.heroBirthText} numberOfLines={1}>{birthLine}</Text>
      </View>
      <View style={styles.heroMetricGrid}>
        <PremiumHeroMetric icon="compass-outline" label={language === 'si' ? 'ලග්නය' : 'Lagna'} value={lagnaName} color="#FFB800" />
        <PremiumHeroMetric icon="moon-outline" label={language === 'si' ? 'සඳ රාශිය' : 'Moon'} value={moonName} color="#C7D2FE" />
        <PremiumHeroMetric icon="star-outline" label={language === 'si' ? 'නැකත' : 'Nakshatra'} value={nakName} color="#60A5FA" />
        <PremiumHeroMetric icon="git-branch-outline" label={language === 'si' ? 'දැන් කාලය' : 'Chapter'} value={chapterName} color="#A78BFA" />
      </View>
    </Animated.View>
  );
}

function PremiumInsightRail({ insights, language }) {
  var [active, setActive] = useState(0);
  if (!insights || insights.length === 0) return null;
  return (
    <Animated.View entering={FadeInDown.delay(90).duration(520)} style={styles.insightRailWrap}>
      <View style={styles.insightHeaderRow}>
        <View style={styles.insightHeaderTextBlock}>
          <Text style={styles.insightHeaderKicker}>{language === 'si' ? 'අද බලන්න වටින තැන' : 'Worth Checking First'}</Text>
          <Text style={[styles.insightHeaderTitle, language === 'si' && styles.sinhalaTextFlow]}>{language === 'si' ? 'ඔබේ ප්‍රධාන ඉඟි' : 'Your Chart Keys'}</Text>
        </View>
        <View style={styles.insightCountPill}>
          <Text style={styles.insightCountText}>{active + 1}/{insights.length}</Text>
        </View>
      </View>
      <View style={styles.insightStack}>
        {insights.map(function (item, index) {
          var isActive = active === index;
          return (
            <SpringPressable key={index} haptic="light" scalePressed={0.97} onPress={function () { setActive(index); }} style={[styles.insightCard, isActive && styles.insightCardActive, { borderColor: isActive ? item.color + '55' : 'rgba(255,255,255,0.07)' }]}>
              <LinearGradient colors={isActive ? [item.color + '18', 'rgba(255,255,255,0.035)', 'rgba(8,5,3,0.72)'] : ['rgba(255,255,255,0.04)', 'rgba(8,5,3,0.64)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <View style={[styles.insightIcon, { backgroundColor: item.color + '14', borderColor: item.color + '35' }]}>
                <Ionicons name={item.icon} size={16} color={item.color} />
              </View>
              <Text style={[styles.insightEyebrow, { color: item.color }]} numberOfLines={1}>{item.eyebrow}</Text>
              <Text style={[styles.insightTitle, language === 'si' && styles.sinhalaTextFlow]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.78}>{item.title}</Text>
              <Text style={[styles.insightBody, language === 'si' && styles.sinhalaTextFlow]}>{item.body}</Text>
            </SpringPressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

function KendaraMasteryStrip({ items, language, isPreview, onUnlock }) {
  if (!items || items.length === 0) return null;
  var doneCount = items.filter(function (item) { return item.done; }).length;
  var progress = Math.round((doneCount / items.length) * 100);
  var si = language === 'si';
  // Honest sub copy: for free users the locked layers open with Pro, not "as
  // data loads" (they never will without a subscription).
  var subText = isPreview
    ? (si ? doneCount + ' / ' + items.length + ' ස්ථර විවෘතයි — ඉතිරිය Pro වලින්' : doneCount + ' of ' + items.length + ' layers open — Pro unlocks the rest')
    : (si ? 'ඉහළ විස්තර ටික එකින් එක විවෘත වෙනවා' : 'Your deeper layers open as data loads');
  var Wrapper = isPreview ? SpringPressable : View;
  var wrapperProps = isPreview ? { haptic: 'light', onPress: onUnlock } : {};
  return (
    <Wrapper {...wrapperProps}>
    <Animated.View entering={FadeInDown.delay(140).duration(520)} style={styles.masteryWrap}>
      <View style={styles.masteryTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.masteryLabel}>{si ? 'කේන්දර අධ්‍යයන මට්ටම' : 'Chart Mastery'}</Text>
          <Text style={styles.masterySub}>{subText}</Text>
        </View>
        {isPreview ? <Ionicons name="lock-closed" size={13} color="rgba(255,184,0,0.7)" style={{ marginRight: 6 }} /> : null}
        <Text style={styles.masteryPercent}>{progress}%</Text>
      </View>
      <View style={styles.masteryTrack}>
        <View style={[styles.masteryFill, { width: progress + '%' }]} />
      </View>
      <View style={styles.masteryMilestones}>
        {items.map(function (item, index) {
          return (
            <View key={index} style={styles.masteryMilestone}>
              <View style={[styles.masteryDot, item.done && styles.masteryDotDone]}>
                {item.done && <Ionicons name="checkmark" size={9} color="#1A1040" />}
              </View>
              <Text style={[styles.masteryMilestoneText, item.done && styles.masteryMilestoneTextDone]} numberOfLines={1}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
    </Wrapper>
  );
}

function PremiumDailyRitual({ ritual, visitState, language, reduced }) {
  var [activeTask, setActiveTask] = useState(0);
  var pulse = useSharedValue(0.32);
  useEffect(function () {
    if (reduced) return;
    pulse.value = withRepeat(withSequence(withTiming(0.72, { duration: 2400 }), withTiming(0.32, { duration: 2400 })), -1);
  }, [reduced]);
  var pulseStyle = useAnimatedStyle(function () { return { opacity: pulse.value }; });
  if (!ritual) return null;
  var tasks = ritual.tasks || [];
  var currentTask = tasks[activeTask] || tasks[0];
  var streak = visitState && visitState.streak ? visitState.streak : 1;
  var totalViews = visitState && visitState.totalViews ? visitState.totalViews : 1;

  return (
    <Animated.View entering={FadeInDown.delay(40).duration(560)} style={styles.ritualWrap}>
      <LinearGradient colors={[ritual.color + '18', 'rgba(255,184,0,0.055)', 'rgba(8,5,3,0.76)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <Animated.View style={[styles.ritualPulse, pulseStyle, { backgroundColor: ritual.color + '22' }]} />
      <View style={styles.ritualTopRow}>
        <View style={[styles.ritualIconWrap, { borderColor: ritual.color + '38', backgroundColor: ritual.color + '12' }]}>
          <Ionicons name={ritual.icon} size={19} color={ritual.color} />
        </View>
        <View style={styles.ritualTitleBlock}>
          <Text style={[styles.ritualEyebrow, { color: ritual.color }]} numberOfLines={1}>{ritual.eyebrow}</Text>
          <Text style={[styles.ritualTitle, language === 'si' && styles.sinhalaTextFlow]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.82}>{ritual.title}</Text>
        </View>
        <View style={styles.ritualStreakBadge}>
          <Text style={styles.ritualStreakValue}>{streak}</Text>
          <Text style={styles.ritualStreakLabel}>{language === 'si' ? 'දින' : 'day'}</Text>
        </View>
      </View>

      <Text style={[styles.ritualBody, language === 'si' && styles.sinhalaTextFlow]}>{ritual.body}</Text>

      <View style={styles.ritualTaskRow}>
        {tasks.map(function (task, index) {
          var isActive = activeTask === index;
          return (
            <SpringPressable key={index} haptic="light" scalePressed={0.97} onPress={function () { setActiveTask(index); }} style={[styles.ritualTaskPill, isActive && { borderColor: task.color + '46', backgroundColor: task.color + '10' }]}>
              <Ionicons name={task.icon} size={13} color={isActive ? task.color : 'rgba(255,214,102,0.44)'} />
              <Text style={[styles.ritualTaskText, isActive && { color: task.color }, language === 'si' && styles.sinhalaTextFlow]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.78}>{task.label}</Text>
            </SpringPressable>
          );
        })}
      </View>

      {currentTask ? (
        <View style={[styles.ritualDetailBox, { borderColor: currentTask.color + '20' }]}>
          <View style={styles.ritualDetailHeader}>
            <Text style={[styles.ritualDetailLabel, { color: currentTask.color }]} numberOfLines={1}>{currentTask.label}</Text>
            <Text style={styles.ritualTotalViews}>{language === 'si' ? 'විවෘත කිරීම් ' : 'opens '}{totalViews}</Text>
          </View>
          <Text style={[styles.ritualDetailValue, language === 'si' && styles.sinhalaTextFlow]}>{currentTask.value}</Text>
          <Text style={[styles.ritualDetailText, language === 'si' && styles.sinhalaTextFlow]}>{currentTask.detail}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

function PremiumVaultSection({ icon, title, eyebrow, summary, color, count, defaultOpen, delay, children, language }) {
  var [open, setOpen] = useState(defaultOpen !== false);
  var accent = color || '#FFB800';
  return (
    <Animated.View entering={FadeInDown.delay(delay || 0).duration(520)} style={styles.vaultSectionWrap}>
      <SpringPressable
        haptic="light"
        scalePressed={0.985}
        onPress={function () { setOpen(!open); }}
        style={[styles.vaultHeader, { borderColor: open ? accent + '42' : 'rgba(255,255,255,0.08)' }]}
      >
        <LinearGradient
          colors={open ? [accent + '18', 'rgba(255,255,255,0.035)', 'rgba(8,5,3,0.70)'] : ['rgba(255,255,255,0.035)', 'rgba(8,5,3,0.62)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        <View style={[styles.vaultIconWrap, { backgroundColor: accent + '14', borderColor: accent + '36' }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
        <View style={styles.vaultHeaderText}>
          <Text style={[styles.vaultEyebrow, { color: accent }]} numberOfLines={1}>{eyebrow}</Text>
          <Text style={[styles.vaultTitle, language === 'si' && styles.sinhalaTextFlow]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.82}>{title}</Text>
          <Text style={[styles.vaultSummary, language === 'si' && styles.sinhalaTextFlow]} numberOfLines={open ? undefined : 2}>{summary}</Text>
        </View>
        <View style={styles.vaultActionStack}>
          {count != null ? (
            <View style={[styles.vaultCountPill, { borderColor: accent + '28', backgroundColor: accent + '10' }]}>
              <Text style={[styles.vaultCountText, { color: accent }]}>{count}</Text>
            </View>
          ) : null}
          <View style={[styles.vaultChevron, open && { backgroundColor: accent + '18' }]}>
            <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={open ? accent : 'rgba(255,214,102,0.48)'} />
          </View>
        </View>
      </SpringPressable>
      {open ? (
        <Animated.View entering={FadeIn.duration(220)} style={styles.vaultBody}>
          {children}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function PremiumAiNote({ text, language }) {
  var [open, setOpen] = useState(false);
  var cleaned = cleanKendaraExplanation(text, language);
  if (!cleaned) return null;
  return (
    <SpringPressable haptic="light" scalePressed={0.985} onPress={function () { setOpen(!open); }} style={styles.aiExplainBox}>
      <Ionicons name="bulb-outline" size={14} color="#FFB800" />
      <View style={styles.aiExplainBody}>
        <Text style={styles.aiExplainLabel}>{language === 'si' ? 'විශේෂ සටහන' : 'Insight Note'}</Text>
        <Text style={styles.aiExplainText} numberOfLines={open ? undefined : 2}>{cleaned}</Text>
      </View>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={13} color="rgba(255,184,0,0.52)" />
    </SpringPressable>
  );
}

// ── Yoga Badge pill ──────────────────────────────────────────────────
function YogaBadge({ name, category, language }) {
  var catColor = category === 'Raja Yoga' ? '#FF8C00' : category === 'Dhana Yoga' ? '#FFB800' : category?.includes('Dosha') ? '#F87171' : '#60A5FA';
  var copy = getKendaraStrengthCopy({ name: name, category: category }, language);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: catColor + '50', backgroundColor: catColor + '12', marginRight: 6, marginBottom: 6 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: catColor, marginRight: 5 }} />
      <Text style={{ color: catColor, fontSize: 11, fontWeight: '700' }}>{copy.label}</Text>
    </View>
  );
}

function getKendaraEntryName(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  return entry.english || entry.name || entry.type || '';
}

function getKendaraBirthFocus(entry, language) {
  var name = getKendaraEntryName(entry);
  var map = {
    Ashwini: ['fast-moving, spontaneous energy to start new chapters quickly', 'බැරි දේවල් ඉක්මනින් පටන් අරන්, අලුත් තැනකින් ජීවිතේ ඉස්සරහට යන්න තියෙන ලොකු ශක්තියක්'],
    Bharani: ['powerful, patient drive that helps you endure and build steadily', 'ලොකු ඉවසීමකින් ජීවිතේ අභියෝග දරාගෙන වෙනස්කම් එක්ක හැඩගැහෙන්න තියෙන හැකියාව'],
    Krittika: ['sharp, protective instinct to cut through confusion and see the truth', 'වටේ තියෙන අවුල් අතරින් හරියටම නිවැරදි දේ තේරුම් අරගෙන කෙළින් වැඩ කරන්න තියෙන ගුණයක්'],
    Rohini: ['deep love for growth, beauty, and creating comforting environments', 'හැමවෙලේම දියුණුවට සහ ලස්සනට ආදරය කරමින්, හිතට සැනසිල්ලක් දෙන තැන් වල ඉන්න තියෙන කැමැත්ත'],
    Mrigashira: ['limitless curiosity that keeps you searching for deeper meaning', 'හැමදෙයක් ගැනම හොයලා බලලා, අලුත් දේවල් ඉගෙනගන්න තියෙන නොනවතින කුතුහලයක්'],
    Ardra: ['resilient spirit that can completely rebuild itself after any storm', 'මොන ප්‍රශ්න ආවත් ඒවට මුහුණ දීලා අලුත් කෙනෙක් විදිහට ආයේ නැගිටින්න තියෙන හයියක්'],
    Punarvasu: ['hopeful, nurturing energy that always finds a way to return and recover', 'කොහොම වැටුණත් ආයෙත් බලාපොරොත්තු ඇතිකරගෙන සම්පූර්ණයෙන්ම සුවපත් වෙන්න තියෙන ධෛර්යය'],
    Pushya: ['deeply supportive and caring nature that helps both you and others bloom', 'තමන් වගේම අනිත් අය ගැනත් ආදරයෙන් හොයලා බලලා සහාය දෙන්න තියෙන ගුණයක්'],
    Ashlesha: ['profound intuitive radar that senses hidden motives and protects your space', 'හැඟීම් ගැඹුරින් දැනෙන නිසාම, අනිත් අයගේ ඇතුලාන්තය තේරුම් අරන් පරිස්සම් වෙන්න තියෙන ඉවක්'],
    Magha: ['strong sense of heritage, leadership, and natural pride in who you are', 'තමන්ගේ මුල් වලට, පවුලට ගරු කරමින් ආත්ම අභිමානයෙන් නායකත්වය ගන්න තියෙන හැකියාව'],
    'Purva Phalguni': ['warm, restful vibe that draws in healthy connections and life’s pleasures', 'ආදරය, නිදහස වගේම සතුටින් ජීවිතේ විඳින්න තියෙන ලොකු කැමැත්තක් සහ ආකර්ෂණයක්'],
    'Uttara Phalguni': ['dependable, committed nature that makes you a solid rock for your loved ones', 'ඕනෑම වගකීමක් පවරන්න පුළුවන් තරම් විශ්වාසවන්ත, ස්ථාවරව ඉලක්ක වලට යන ගුණයක්'],
    Hasta: ['skilled, practical mindset that lets you manifest your ideas with your own hands', 'හිතන දේවල් තමන්ගේ අත්දැකීමෙන් සහ උත්සාහයෙන් ඇත්තටම කරලා පෙන්වන්න තියෙන හැකියාව'],
    Chitra: ['bright, creative spark to design completely unique and beautiful outcomes', 'හැමදේම ලස්සනට, පිළිවෙළට සහ කලාත්මක විදිහට අලුතෙන් නිර්මාණය කරන්න තියෙන දක්ෂකමක්'],
    Swati: ['gentle independence that helps you adapt completely to your own unique rhythm', 'කිසිම කෙනෙකුට යටත් නොවී තමන්ගේම නිදහස් විලාසයකට ජීවිතේ හැඩගස්වාගන්න තියෙන ගුණයක්'],
    Vishakha: ['laser-focused drive that pushes you relentlessly toward your personal goals', 'ලොකු අරමුණක් තියාගෙන ඒක දිනනකම්ම එකදිගට උත්සාහ කරන්න තියෙන ශක්තිමත් කැපවීමක්'],
    Anuradha: ['deeply devoted heart that stays loyal to the people and causes you love', 'අමාරු වෙලාවලදී වුණත් අත්හරින්නේ නැතුව විශ්වාසවන්තව ආදරය සහ බැඳීම් රකින හිතක්'],
    Jyeshtha: ['protective, wise authority earned through deep and transformational experiences', 'ලොකු වගකීමක් දරාගෙන, අත්දැකීම් වලින් මුහුකුරා ගිය නායකත්වයක් ගන්න තියෙන හැකියාව'],
    Mula: ['courageous urge to dig down to the absolute roots of any situation or truth', 'පිටින් පේන දේට වඩා හැමදෙයකම ඇත්තම මුල හොයාගෙන ගැඹුරින් හිතන්න තියෙන ආශාවක්'],
    'Purva Ashadha': ['bold, undefeated emotional conviction that stands by what you feel is right', 'තමා විශ්වාස කරන දේ වෙනුවෙන් කිසිම දේකට නොබියව පෙනී සිටින්න පුළුවන් ආත්ම ශක්තියක්'],
    'Uttara Ashadha': ['patient, enduring stamina capable of seeing even the longest journeys through', 'කොච්චර කල් ගියත් ඉලක්කයක් අත්හරින්නේ නැතුව ඉවසීමෙන් සාර්ථකත්වය වෙනකම්ම යන ගුණයක්'],
    Shravana: ['quiet, receptive wisdom that learns powerfully by truly listening to the world', 'හොඳින් අහන් ඉඳලා, ඒ දේවල් තේරුම් අරගෙන බුද්ධිමත්ව ජීවිතේට එකතු කරගන්න අගනා හැකියාව'],
    Dhanishtha: ['natural rhythm for community building and gathering resources successfully', 'අනිත් අයත් එක්ක එකතු වෙලා හොඳ රිද්මයකින් සාර්ථකත්වයට යන්න පුළුවන් හැකියාවක්'],
    Shatabhisha: ['mystical, problem-solving intelligence that quietly heals what is broken', 'සාමාන්‍ය අයට පේන්නැති ප්‍රශ්න දැකලා ඒවා විසඳගෙන අනිත් අයවත් සුවපත් කරන්න තියෙන දක්ෂකමක්'],
    'Purva Bhadrapada': ['highly serious, philosophical mind focused on transforming reality', 'හැමදේම දිහා ගැඹුරින් බලලා, හදිසි තීරණ ගන්නේ නැතුව බරපතල විදිහට හිතන්න පුළුවන් ගුණයක්'],
    'Uttara Bhadrapada': ['peaceful, compassionate depth that intuitively shelters what matters most', 'හිත ඇතුලෙන් ලොකු සන්සුන් බවක් තියාගෙන අනිත් අය ගැනත් කරුණාවෙන් බලන්න තියෙන හැකියාව'],
    Revati: ['gentle, spiritual closure that helps you perfectly wrap up old chapters for the new', 'පරණ දේවල් හරිම මෘදු විදිහට අත්හැරලා දාලා අලුත් පියවරවල් වලට යන්න පුළුවන් සුන්දර හිතක්'],
  };
  var selected = map[name];
  if (!selected) return language === 'si' ? 'මේ නැකතේ ඉපදුණු නිසා, තමන්ගේ හිත කියන දේ අහලා, ඒකට අනුව වැඩ කරන එක තමයි ඔබේ සාර්ථකත්වයේ ලක්ෂණය.' : 'Being born under this star gives you emotional strength. Trusting your intuition guides your true path.';
  if (language === 'si') {
    return selected[1] + ' කියන එක තමයි ' + name + ' නැකතේ ඉපදුණු ඔබේ සාර්ථකත්වයේ ලක්ෂණය.';
  } else {
    return 'Your birth star ' + name + ' gives you a ' + selected[0].toLowerCase() + ' which constantly guides your true path.';
  }
}

function getKendaraMoonRhythm(name, language) {
  var map = {
    Pratipada: ['Fresh start rhythm', 'අලුත් වැඩක් පටන්ගන්න හොඳම වෙලාවක්'], Dvitiya: ['Slow building rhythm', 'දේවල් හිමින් හිමින් ගොඩනගන්න හොඳම වෙලාවක්'], Tritiya: ['Learning by action', 'කරලා බලලා ඉගෙනගන්න හොඳම රිද්මයක්'], Chaturthi: ['Clear the pressure', 'හිතේ බර අඩු කරගෙන අලුත් වැඩක් සැලසුම් කරන්න හොඳ කාලයක්'],
    Panchami: ['Growth and creativity', 'නිර්මාණශීලී වැඩ වලට සහ ඉදිරියට යන්න හොඳම වෙලාවක්'], Shashthi: ['Service and discipline', 'වගකීමෙන් වැඩ කරලා හොඳ ප්‍රතිඵල ගන්න ලේසි කාලයක්'], Saptami: ['Visible progress', 'හොඳ දියුණුවක් ලබන්න ලේසි වෙන චන්ද්‍ර රිද්මයක්'], Ashtami: ['Move carefully', 'කලබල නොවී පරිස්සමෙන් පියවර තබන්න කියන රිද්මයක්'],
    Navami: ['Focused effort', 'එක ඉලක්කයකට විතරක් හිත යොමු කරන්න හොඳම වෙලාවක්'], Dashami: ['Public results', 'ඔබ කරපු වැඩ වල ප්‍රතිඵල අනිත් අයට පෙන්වන්න හොඳම කාලයක්'], Ekadashi: ['Clear focus', 'හිත සන්සුන් කරගෙන අවධානය එක තැනක තියාගන්න හොඳම රිද්මයක්'], Dwadashi: ['Balance and recovery', 'වෙහෙස නිවාගෙන නැවතත් ශක්තිය ලබාගන්න හොඳම වෙලාවක්'],
    Trayodashi: ['Finish gently', 'ඉවර කරන්න තියෙන වැඩ සන්සුන්ව නිම කරන්න හොඳම වෙලාවක්'], Chaturdashi: ['Let go and reset', 'අනවශ්‍ය බර අතහැරලා අලුත් වෙන්න කියන රිද්මයක්'], Purnima: ['Full moon clarity', 'හිතට හොඳ පැහැදිලි බවක් සහ ශක්තියක් දැනෙන රිද්මයක්'], Amavasya: ['Quiet reset', 'නිහඬව විවේක අරගෙන හිත නැවත හැඩගස්වාගන්න හොඳම කාලයක්'],
  };
  var selected = map[name];
  if (!selected) return language === 'si' ? 'ඔබ ඉපදෙනකොට සඳුගේ ශක්තිය තිබ්බ විදිහ අනුව තමයි ඔබගෙ හිතේ නිදහස සහ සතුට රැඳිලා තියෙන්නේ.' : 'The lunar phase at your birth reveals what brings you emotional freedom and real fulfillment.';
  if (language === 'si') {
    return name + ' තිථියේ උපන් ඔබට සඳුගේ බලපෑම ලොකුයි. ඒ නිසා ' + selected[1] + ' කියන එක හැමතිස්සෙම වටිනවා.';
  } else {
    return 'Born on ' + name + ', the Moon\'s rhythm strongly influences you. Finding a balance for ' + selected[0].toLowerCase() + ' is essential.';
  }
}

function getKendaraRashiKey(sign) {
  if (!sign) return '';
  if (typeof sign === 'object') {
    if (sign.rashiId || sign.id || sign.rashi) return getKendaraRashiKey(sign.rashiId || sign.id || sign.rashi);
    return getKendaraRashiKey(sign.english || sign.name || sign.rashiName || sign.sinhala);
  }
  var raw = String(sign).trim();
  var num = parseInt(raw, 10);
  if (!isNaN(num) && RASHI_EN[num]) return RASHI_EN[num].toLowerCase();
  var key = raw.toLowerCase();
  var siMap = {
    'මේෂ': 'aries', 'වෘෂභ': 'taurus', 'මිථුන': 'gemini', 'කටක': 'cancer',
    'සිංහ': 'leo', 'කන්‍යා': 'virgo', 'තුලා': 'libra', 'වෘශ්චික': 'scorpio',
    'ධනු': 'sagittarius', 'මකර': 'capricorn', 'කුම්භ': 'aquarius', 'මීන': 'pisces',
  };
  if (siMap[raw]) return siMap[raw];
  var enNames = Object.values(RASHI_EN);
  for (var i = 0; i < enNames.length; i++) {
    if (key.indexOf(enNames[i].toLowerCase()) !== -1) return enNames[i].toLowerCase();
  }
  return key;
}

function getKendaraRashiName(sign, language) {
  var key = getKendaraRashiKey(sign);
  var names = {
    aries: ['Aries', 'මේෂ'], taurus: ['Taurus', 'වෘෂභ'], gemini: ['Gemini', 'මිථුන'], cancer: ['Cancer', 'කටක'],
    leo: ['Leo', 'සිංහ'], virgo: ['Virgo', 'කන්‍යා'], libra: ['Libra', 'තුලා'], scorpio: ['Scorpio', 'වෘශ්චික'],
    sagittarius: ['Sagittarius', 'ධනු'], capricorn: ['Capricorn', 'මකර'], aquarius: ['Aquarius', 'කුම්භ'], pisces: ['Pisces', 'මීන'],
  };
  var selected = names[key];
  if (!selected) return sign ? String(sign) : '--';
  return language === 'si' ? selected[1] : selected[0];
}

function getKendaraLifeStyle(sign, language) {
  var key = getKendaraRashiKey(sign);
  var signName = getKendaraRashiName(sign, language);
  var meanings = {
    aries: ['You are a natural trailblazer, defined by your unyielding courage and rapid decision-making. Your inherent drive is to initiate, conquer, and lead from the front.', 'ඔබ සහජයෙන්ම පෙරමුණ ගන්නා, නොසැලෙන ධෛර්යයෙන් සහ වේගවත් තීරණ ගැනීමේ හැකියාවෙන් යුතු අයෙකි. යමක් ආරම්භ කිරීම සහ අභියෝග ජය ගැනීම ඔබගේ ප්‍රධාන ස්වභාවයයි.'],
    taurus: ['You are grounded in profound stability and deeply value life’s tangible comforts. Your practical resilience creates a secure, unshakable foundation in both wealth and relationships.', 'ජීවිතයේ ස්ථාවරත්වයට සහ සුරක්ෂිතභාවයට ඔබ ඉමහත් වටිනාකමක් දෙයි. ඔබගේ ප්‍රායෝගික හා නොසැලෙන ස්වභාවය, ආර්ථිකයේ මෙන්ම සබඳතාවලද ශක්තිමත් පදනමක් ගොඩනගයි.'],
    gemini: ['Your mind is a brilliant, restless kaleidoscope of ideas. You process the world through exceptional adaptability, effortless communication, and a profound intellectual curiosity.', 'ඔබගේ මනස අතිශය තියුණු මෙන්ම නිරන්තරයෙන් අවදිව පවතින එකකි. විශිෂ්ට සන්නිවේදනය, බුද්ධිමය කුතුහලය සහ ඕනෑම තත්වයකට අනුවර්තනය වීමේ දුර්ලභ හැකියාවක් ඔබට හිමිය.'],
    cancer: ['You navigate life through a deep, intuitive emotional current. Your highest calling is to nurture, fiercely protect your sanctuary, and foster profound emotional bonds.', 'හැඟීම් සහ සහජ ඉව මූලික කරගනිමින් ඔබ ජීවිතය දෙස බලයි. ආදරණීයයන් සුරැකීම, පවුලේ සෙනෙහස සහ මානසික සැනසිල්ල ඔබගේ ලෝකයේ වටිනාම සම්පත් වේ.'],
    leo: ['You radiate an undeniable regal warmth and magnetic charisma. Your soul thrives on creative self-expression, natural authority, and a destiny meant to shine.', 'ඔබ සතුව ප්‍රතික්ෂේප කළ නොහැකි නායකත්ව පෞරුෂයක් සහ ආකර්ෂණීය තේජසක් ඇත. නිර්මාණශීලීව අදහස් දැක්වීමටත්, අන් අය මධ්‍යයේ කැපී පෙනෙමින් ආලෝකමත්ව වැජඹීමටත් ඔබ උපන් හැකියාවක් දරයි.'],
    virgo: ['You possess a beautifully analytical mind driven by the perfection of structure. Your profound purpose is refined service, meticulous logic, and elevating the world around you.', 'අතිශය තර්කානුකූල හා ක්‍රමානුකූල මනසකින් ඔබ හෙබිය. යම් දෙයක හරි වැරැද්ද මැනවින් විනිශ්චය කරමින්, පරිපූර්ණත්වය ඔස්සේ ලෝකයට සේවය කිරීම ඔබගේ උතුම් අරමුණයි.'],
    libra: ['You are the masterful architect of human harmony and aesthetic balance. Your finest strengths are diplomacy, partnership, and an innate pursuit of grace and fairness.', 'ඔබ මානව සබඳතාවල සමබරතාව මනාව රකින, සාධාරණත්වයේ සංකේතයකි. සහයෝගීතාවය, රාජ්‍යතාන්ත්‍රික බව සහ සෞන්දර්යය කෙරෙහි ඔබට සහජ නැඹුරුවක් ඇත.'],
    scorpio: ['You experience existence through a lens of transformational depth and unmatched psychological power. Like a phoenix, you contain the ultimate resilience to conquer and rise.', 'ජීවිතයේ ඉතා ගැබුරු මානයන් ස්පර්ශ කරන, අද්භූත පරිවර්තනීය ශක්තියකින් ඔබ යුක්තය. ඕනෑම බිඳවැටීමකින් පසු අළු අස්සෙන් නැගී සිටින ෆීනික්ස් පක්ෂියෙකු වන් බලයක් ඔබේ ආත්මගතව ඇත.'],
    sagittarius: ['You are a restless philosophical wanderer, fueled by expansion, higher truth, and eternal optimism. Your spirit is liberated only when exploring the limitless boundaries of life.', 'නිදහසට හා උදාර සත්‍යයට පෙම් බඳින තීක්ෂණ ගවේෂකයෙකු ලෙස ඔබ හැඳින්විය හැක. අනාගතය පිළිබඳ ගැඹුරු විශ්වාසයත්, නව ලෝකයන් සොයා යාමේ නොනිම් ආශාවත් ඔබව මෙහෙයවයි.'],
    capricorn: ['Your spirit is defined by absolute sovereignty, discipline, and an architectural approach to success. You command the patience and fortitude required to build an enduring legacy.', 'අතිමහත් විනය, ඉවසීම සහ දැඩි වගකීම්බර බව ඔබගේ සාර්ථකත්වයේ අඩිතාලමයි. කාලාන්තරයක් පුරා නොසැලී ශක්තිමත් කීර්තියක් සහ අධිරාජ්‍යයක් ගොඩනැගීමට ඔබ සමත් වේ.'],
    aquarius: ['You are a brilliant, unpredictable visionary operating constantly ahead of your time. Your destiny aligns with radical innovation, complete independence, and shaping the collective future.', 'සම්ප්‍රදායික සීමාවන්ගෙන් ඔබ්බට සිතන, අනාගතවාදී පෙරළිකාරයෙකු ලෙස ඔබ කැපී පෙනේ. පූර්ණ ස්වාධීනත්වය සහ සමාජයීය වෙනසක් ඇති කිරීමේ දැක්ම ඔබ තුළ ගැබ්ව තිබේ.'],
    pisces: ['You are an incredibly empathic soul, tuned deeply into the unseen spiritual realms. You flow through life guided by dreams, boundless compassion, and mystical intuition.', 'කෙලවරක් නැති අනුකම්පාවෙන් සහ ගැඹුරු දාර්ශනික ඉවකින් පිරි සංවේදී ආත්මයක් ඔබට හිමිය. ලෝකය තේරුම් ගැනීමේදී භෞතික තර්කයට වඩා අධ්‍යාත්මික හැඟීම් මත ඔබ විශ්වාසය තබයි.'],
  };
  var selected = meanings[key];
  if (!selected) return language === 'si' ? 'සාමාන්‍ය, සමබර ජීවිත රටාවක්.' : 'A very balanced energy.';
  if (language === 'si') {
    return selected[1];
  }
  return selected[0];
}

function getKendaraCoreEnergy(planet, language) {
  var key = String(planet || '').toLowerCase();
  var alias = { surya: 'sun', chandra: 'moon', mangala: 'mars', budha: 'mercury', guru: 'jupiter', shukra: 'venus', shani: 'saturn', ascendant: 'lagna' };
  key = alias[key] || key;
  var map = {
    sun: ['Sun - your confidence & true self', 'රවි - ඔබේ ආත්ම විශ්වාසය සහ පෞරුෂය'], 
    moon: ['Moon - your feelings & peace of mind', 'සඳු - ඔබේ හැඟීම් සහ හිතේ සැනසිල්ල'], 
    mars: ['Mars - your courage & drive', 'කුජ - ඔබේ ධෛර්යය සහ උත්සාහය'], 
    mercury: ['Mercury - your mind & communication', 'බුධ - ඔබ හිතන විදිහ සහ කතාබහ'],
    jupiter: ['Jupiter - your wisdom & luck', 'ගුරු - ඔබේ නුවණ සහ ලැබෙන වාසනාව'], 
    venus: ['Venus - your love & tastes', 'සිකුරු - ඔබේ ආදරය සහ රසවින්දනය'], 
    saturn: ['Saturn - your patience & responsibilities', 'ශනි - ඔබේ ඉවසීම සහ වගකීම්'], 
    rahu: ['Rahu - your ambitions & growth', 'රාහු - ඔබේ ලොකු ආශාවන් සහ දියුණුව'], 
    ketu: ['Ketu - your intuition & letting go', 'කේතු - ඔබේ ඉව සහ අත්හරින දේවල්'], 
    lagna: ['Ascendant - your life path', 'ලග්නය - ඔබේ ජීවිතේ යන දිශාව'],
  };
  var selected = map[key];
  if (!selected) return language === 'si' ? 'මේ ග්‍රහ ශක්තිය' : 'Your planetary energy';
  return language === 'si' ? selected[1] : selected[0];
}

function getKendaraPlanetKey(planet) {
  var key = String(planet || '').toLowerCase();
  var alias = { surya: 'sun', chandra: 'moon', mangala: 'mars', budha: 'mercury', guru: 'jupiter', shukra: 'venus', shani: 'saturn', ascendant: 'lagna' };
  return alias[key] || key;
}

function getKendaraPlanetName(planet, language) {
  var key = getKendaraPlanetKey(planet);
  var names = {
    sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury', jupiter: 'Jupiter', venus: 'Venus', saturn: 'Saturn', rahu: 'Rahu', ketu: 'Ketu', lagna: 'Lagna'
  };
  var canonical = names[key] || planet;
  if (language === 'si') {
    var info = PLANET_INFO[canonical];
    return info ? info.si : canonical;
  }
  return canonical;
}

function getKendaraPlanetFocus(planet, language) {
  var key = getKendaraPlanetKey(planet);
  var map = {
    sun: ['It bestows vital life force, undeniable royal confidence, and illuminates your highest path of self-realization.', 'මෙම හැසිරවීම ඔබගේ ආත්මීය තේජස ඉස්මතු කරමින්, ප්‍රබල පෞරුෂයක් සහ නොසැලෙන ආත්ම විශ්වාසයක් ඔබට උරුම කර දෙයි.'],
    moon: ['It governs the deep oceans of your subconscious, bringing serene emotional intelligence, maternal comfort, and inner peace.', 'මෙය ඔබගේ අභ්‍යන්තර හැඟීම් සහ මානසික සංහිඳියාව සුරකිමින්, ජීවිතයට මෘදු, දයාබර සහ චිත්තවේගීය ගැඹුරක් එක් කරයි.'],
    mars: ['It ignites your warrior spirit, tactical courage, and the pure kinetic drive needed to conquer formidable life obstacles.', 'ඔබ අභ්‍යන්තරයේ සිටින රණශූරයා අවදි කරමින්, අභියෝග හමුවේ නොබියව ක්‍රියා කිරීමේ පූර්ණ ධෛර්යය හා ප්‍රබල ශක්තිය මෙයින් ලඟා කරයි.'],
    mercury: ['It refines your intellectual brilliance, analytical agility, and masters the art of profound communication and learning.', 'මෙමගින් ඔබගේ බුද්ධිමය තීක්ෂණ බව සහ විශ්ලේෂණ හැකියාවන් මුවහත් කර, විශිෂ්ට සන්නිවේදන කුසලතා ඔබට ලබා දෙයි.'],
    jupiter: ['It serves as the grand benefactor of luck, expanding your philosophical wisdom, spiritual wealth, and manifesting divine grace.', 'ජීවිතයට අප්‍රමාණ වාසනාව සහ ආත්මීය දියුණුව කැඳවන මෙය, ඔබේ ප්‍රඥාව පුළුල් කර උදාර අවස්ථා රැසක් උදා කරනු ලබයි.'],
    venus: ['It orchestrates the essence of earthly luxury, magnetic attraction, and the profound appreciation of romantic & aesthetic harmony.', 'ආදරයේ සහ සෞන්දර්යයේ ශක්තිය මූර්තිමත් කරන මෙය, ජීවිතයේ සැපපහසුකම් සහ ආකර්ෂණීය සබඳතා ඔබ වෙත නිතැතින්ම ගෙන එයි.'],
    saturn: ['It acts as the ultimate cosmic teacher, demanding rigorous discipline, immense patience, and forging indestructible, long-term success.', 'විනය සහ අප්‍රමාණ ඉවසීම පුහුණු කරමින්, කාලයේ පරීක්ෂණයෙන් ජයගත හැකි ස්ථිරසාර, යෝධ සාර්ථකත්වයක් මෙය ඔබට ගොඩනගා දෙයි.'],
    rahu: ['It fuels an insatiable magnetic ambition, breaking established boundaries to propel you toward unprecedented materialistic expansion.', 'ඔබේ ප්‍රබලම අරමුණු සහ ලෞකික ආශාවන් අවුළුවා, සමාජ සීමාවන් බිඳ දමමින් වේගවත් අතිවිශාල ජයග්‍රහණ කරා ඔබව මෙහෙයවයි.'],
    ketu: ['It strips away the unnecessary, guiding you toward ultimate cosmic detachment, mystical intuition, and profound spiritual enlightenment.', 'ලෞකික බැඳීම්වලින් ඔබව මුදා හරිමින්, අතීත ජන්ම පුරුදු ඔස්සේ ගැඹුරු ආධ්‍යාත්මික සැනසිල්ල සහ සහජ ඉව අවදි කිරීමට මෙය ක්‍රියා කරයි.'],
    lagna: ['It initiates your very existence, shaping the architectural blueprint of your destiny, physical vitality, and your primary persona.', 'ඔබගේ මුළුමහත් පැවැත්ම, ශරීර සෞඛ්‍යය සහ ලෝකයට ඔබව දර්ශනය වන ප්‍රධානම ආකාරය මින් තීරණය කරමින් ජීවිතයේ දිශානතිය පෙන්වයි.'],
  };
  var selected = map[key];
  if (!selected) return language === 'si' ? 'මේ ග්‍රහ ශක්තිය' : 'this planet energy';
  return language === 'si' ? selected[1] : selected[0];
}

function getKendaraHouseNumber(rashiId, lagnaRashiId) {
  var rashiNum = parseInt(rashiId, 10);
  var lagnaNum = parseInt(lagnaRashiId, 10);
  if (!rashiNum || !lagnaNum) return null;
  return ((rashiNum - lagnaNum + 12) % 12) + 1;
}

function getKendaraOrdinal(num) {
  var n = parseInt(num, 10);
  var suffix = 'th';
  if (n % 100 < 11 || n % 100 > 13) {
    if (n % 10 === 1) suffix = 'st';
    else if (n % 10 === 2) suffix = 'nd';
    else if (n % 10 === 3) suffix = 'rd';
  }
  return n + suffix;
}

function getKendaraHouseLabel(houseNum, language) {
  if (!houseNum) return '';
  return language === 'si' ? houseNum + 'වැනි භාවය' : 'your ' + getKendaraOrdinal(houseNum) + ' house';
}

function getKendaraHouseArea(houseNum, language) {
  var map = {
    1: ['the essence of your existence, raw physical vitality, core identity, and how the world uniquely perceives you', 'ඔබගේ මූලික පැවැත්ම, පෞරුෂයේ දැවැන්ත බව, සෞඛ්‍යය සහ අන් අය ඔබව දකින සුවිශේෂී ආකාරය'],
    2: ['accumulated wealth, ancestral roots, the power of your speech, and everything you hold as a deep personal value', 'ධනය ගොඩනැගීම, පවුලේ මූලයන්, වචනයේ බලපෑම සහ ඔබ ඉමහත් සේ අගය කරන වටිනාකම්'],
    3: ['your instinctual courage, masterful communication, bond with younger siblings, and relentless driving momentum', 'ඔබගේ සහජ ධෛර්යය, අතිවිශිෂ්ට සන්නිවේදනය, සහෝදර සබඳතා සහ ඕනෑම දෙයක් වෙනුවෙන් ගන්නා වූ දැඩි උත්සාහය'],
    4: ['the profound emotional sanctuary of your heart, maternal connections, foundational real estate, and ultimate inner peace', 'හදවතේ ගැඹුරුම සැනසිල්ල, මව් සෙනෙහස, දේපළ වාහන සහ ජීවිතයේ මූලික සුරක්ෂිතභාවය'],
    5: ['your supreme intellectual creations, karmic blessings, romance, the lineage of children, and intuitive gambling of the mind', 'බුද්ධිමය නිර්මාණශීලීත්වය, පුණ්‍ය ශක්තිය, ආදරය, දරු සම්පත් සහ ජීවිතයේ ගන්නා නිවැරදි ඉහළ තීරණ'],
    6: ['the arena where you conquer obstacles, dominate competition, refine daily health, and perfect the act of service', 'ජීවිතයේ අභියෝග සහ සතුරන් ජයගන්නා ආකාරය, එදිනෙදා සෞඛ්‍ය පුරුදු සහ ලෝකයට ඔබගෙන් ඉටුවන සේවය'],
    7: ['the mirror of your soul through sacred partnerships, serious business alliances, and your grand interaction with the public', 'විවාහය නම් වූ උතුම් බැඳීම, ප්‍රබල ව්‍යාපාරික හවුල්කාරිත්වයන් සහ සමාජය සමග පවත්වන ශක්තිමත් ගනුදෙනු'],
    8: ['the hidden realm of total transformation, mystical secrets, sudden windfalls, and the profound capacity for rebirth', 'ජීවිතයේ අතිශය ගැඹුරු පරිවර්තනයන්, රහසිගත ආධ්‍යාත්මික ශක්තීන්, හවුල් ධනය සහ බිඳවැටීමකින් පසු නැගීසිටීමේ බලය'],
    9: ['your connection to divine luck, higher philosophical truth, ancestral gurus, spiritual faith, and expansive distant journeys', 'පෙර පින් බලය, උසස් දාර්ශනික ප්‍රඥාව, ගුරුවරුන්ගේ ආශිර්වාදය, විශ්වාසයන් සහ දුර බැහැර ගමන්'],
    10: ['the absolute zenith of your worldly ambitions, commanding career legacy, immense public authority, and societal reputation', 'ඔබගේ වෘත්තීය ජීවිතයේ කූටප්‍රාප්තිය, සමාජයේ අතිමහත් කීර්තිය, වගකීම් දැරීමේ බලය සහ සාර්ථකත්වයේ සලකුණ'],
    11: ['the ultimate fulfillment of your most massive desires, vast social networks, significant gains, and elite influential allies', 'ජීවිතයේ දැවැන්තම බලාපොරොත්තු ඉටුවීම, ලාභ ලැබීම්, ප්‍රබල සමාජ ජාල සහ ඔබට සහාය වන වැදගත් පුද්ගලයන්'],
    12: ['your sacred withdrawal from the material world, foreign lands, enlightened spiritual release, and subconscious dream states', 'ලෞකික බැඳීම්වලින් කරන ආධ්‍යාත්මික මිදීම, විදේශීය සබඳතා, ගැඹුරු භාවනාත්මක විවේකය සහ අත්හැරීමේ කලාව'],
  };
  var selected = map[houseNum];
  if (!selected) return language === 'si' ? 'ජීවිතයේ ඒ පැත්ත' : 'that area of life';
  return language === 'si' ? selected[1] : selected[0];
}

function getKendaraDegreeStage(degree, language) {
  if (degree == null || isNaN(degree)) return '';
  var degreeNum = Number(degree);
  if (degreeNum < 10) {
    return language === 'si'
      ? 'ග්‍රහයා රාශියේ ආරම්භක කලාපයේ පිහිටා ඇති බැවින්, මෙම ශක්තිය ඉතා තරුණ, වේගවත් හා සෘජුවම ජීවිතයට බලපෑම් කිරීමට සමත්ය.'
      : 'Residing in the early degrees of the sign, this planetary energy is distinctly raw, dynamic, and manifests with immediate, youthful intensity.';
  }
  if (degreeNum < 20) {
    return language === 'si'
      ? 'ග්‍රහයා රාශියේ මධ්‍යයේ බලවත්ව සිටින හෙයින්, මෙයින් ලැබෙන ප්‍රතිඵල අතිශය ස්ථාවර, පූර්ණ සහ ජීවිතයට දැඩි සමබරතාවයක් ගෙන එනු ලබයි.'
      : 'Anchored firmly in the center of the sign, this energy operates at peak maturity, delivering incredibly stable, balanced, and fully-realized results.';
  }
  return language === 'si'
    ? 'ග්‍රහයා රාශියේ අවසාන භාගයේ ගත කිරීම නිසා, මෙම ශක්තිය කාලයත් සමඟ පරිණත වී තරමක් ප්‍රමාද වී අතිවිශිෂ්ට හා ගැඹුරු ප්‍රතිඵල ලබා දෙනු ඇත.'
    : 'Positioned in the late degrees, this energy is deeply seasoned and wise; it yields its most profound and rewarding manifestations as life experience accumulates.';
}

function getKendaraShadbalaForPlanet(shadbala, planet) {
  if (!shadbala) return null;
  var key = getKendaraPlanetKey(planet);
  if (shadbala[key]) return shadbala[key];
  var values = Object.values(shadbala);
  for (var index = 0; index < values.length; index++) {
    if (getKendaraPlanetKey(values[index] && values[index].name) === key) return values[index];
  }
  return null;
}

function getKendaraStrengthSentence(strength, language) {
  if (!strength) return '';
  var percent = Number(strength.percentage || 0);
  if (language === 'si') {
    if (percent >= 75) return 'ඔබගේ කේන්දරය තුළ මෙම ග්‍රහයා අතිප්‍රබල ලෙස ස්ථානගත වී ඇත. එමනිසා නියෝජනය වන කටයුතුවලදී ඔබට සුවිශේෂී හා බාධා කළ නොහැකි වාසනාවක් උරුම වේ.';
    if (percent >= 60) return 'මෙම ග්‍රහයාගෙන් ඔබට ඉතා ශක්තිමත් පදනමක් හිමිවෙයි. එබැවින් මෙම දිශානතිය යටතේ ඇති කටයුතු සාර්ථක කරගැනීම ඔබට බෙහෙවින් පහසු වනු ඇත.';
    if (percent >= 45) return 'මෙම ග්‍රහයා මධ්‍යස්ථ බලයකින් යුක්තය. මෙහි නියම ප්‍රතිඵල ලබාගැනීමට නම්, ඔබගේම උත්සාහය සහ ක්‍රමානුකූල සැලසුම් අනිවාර්ය සාධකයන් වේ.';
    return 'මෙම ග්‍රහයා යම්තාක් දුරකට අභියෝගාත්මක තත්වයක පවතී. එබැවින් කටයුතුවලදී හැඟීම්බර නොවී, ඉමහත් ඉවසීමෙන් හා උපක්‍රමශීලීව කටයුතු කිරීම අත්‍යවශ්‍ය වේ.';
  }
  if (percent >= 75) return 'This planet is astronomically powerful in your chart, commanding exceptional dominion and guaranteeing nearly unshakeable success in its domains.';
  if (percent >= 60) return 'Operating with highly solid fortitude, this planet acts as an excellent, reliable anchor, making it naturally easier to manifest your goals here.';
  if (percent >= 45) return 'Possessing a moderate cosmic velocity, this planet requires that your own strategic planning and persistent human effort act as the primary drivers of your success.';
  return 'Facing cosmic friction, this energy teaches you severe patience. It is highly advisable to avoid impulsiveness and navigate these waters with calm, calculated precision.';
}

function getKendaraStrongestShadbalaPart(components, language) {
  if (!components) return language === 'si'
    ? { label: 'සමස්ත බලය', meaning: 'මේ ග්‍රහයා සම්පූර්ණයෙන්ම කොච්චර සහාය දෙනවද කියන එක' }
    : { label: 'overall strength', meaning: 'how strongly this planet can support you overall' };
  var labels = language === 'si'
    ? {
      sthanaBala: { label: 'පිහිටීමේ බලය (ඉන්න තැනින් ලැබෙන ශක්තිය)', meaning: 'ඉන්න තැන නිසා ලැබෙන සහාය' },
      digBala: { label: 'දිශා බලය (නිවැරදි දිශාවට යන්න දෙන සහාය)', meaning: 'ජීවිතයේ නිවැරදි දිශාවට යන්න දෙන සහාය' },
      kalaBala: { label: 'කාල බලය (උපන් වෙලාවේ රිද්මය)', meaning: 'උපන් වෙලාවේ රිද්මයෙන් ලැබෙන සහාය' },
      cheshtaBala: { label: 'ක්‍රියා බලය (මහන්සි වෙන තරමට ලැබෙන ප්‍රතිඵල)', meaning: 'උත්සාහයෙන් ප්‍රතිඵල ගන්න දෙන සහාය' },
      naisargikaBala: { label: 'ස්වභාවික බලය (ග්‍රහයාගේම තියෙන ශක්තිය)', meaning: 'ග්‍රහයාගේ ස්වභාවික ශක්තියෙන් ලැබෙන සහාය' },
      drigBala: { label: 'සම්බන්ධ බලය (අනිත් ග්‍රහයන්ගෙන් ලැබෙන සහයෝගය)', meaning: 'අනිත් ග්‍රහ සම්බන්ධතා වලින් ලැබෙන සහාය' },
    }
    : {
      sthanaBala: { label: 'positional strength', meaning: 'support from where the planet sits' },
      digBala: { label: 'directional strength', meaning: 'support for moving in the right direction' },
      kalaBala: { label: 'rhythmic timing strength', meaning: 'support from the birth-time rhythm' },
      cheshtaBala: { label: 'effort-based strength', meaning: 'support for turning effort into results' },
      naisargikaBala: { label: 'natural intrinsic strength', meaning: 'support from the planet’s own natural power' },
      drigBala: { label: 'connection strength', meaning: 'support from other planetary links' },
    };
  var bestKey = '';
  var bestValue = -999;
  Object.keys(components).forEach(function(componentKey) {
    var value = Number(components[componentKey] || 0);
    if (value > bestValue) {
      bestValue = value;
      bestKey = componentKey;
    }
  });
  return labels[bestKey] || (language === 'si'
    ? { label: 'සමස්ත බලය', meaning: 'මේ ග්‍රහයා සමස්තයෙන් කොච්චර සහාය දෙනවද කියන එක' }
    : { label: 'overall strength', meaning: 'how strongly this planet can support you overall' });
}

function getKendaraPlanetPlacementDetail(planet, rashiLabel, houseNumber, language, shadbala) {
  var planetName = getKendaraPlanetName(planet && planet.name, language);
  var signName = getKendaraRashiName(rashiLabel, language);
  var houseLabel = getKendaraHouseLabel(houseNumber, language);
  var houseArea = getKendaraHouseArea(houseNumber, language);
  var focus = getKendaraPlanetFocus(planet && planet.name, language);
  var degreeNote = getKendaraDegreeStage(planet && planet.degree, language);
  var strengthNote = getKendaraStrengthSentence(getKendaraShadbalaForPlanet(shadbala, planet && planet.name), language);
  if (language === 'si') {
    var siPlace = houseLabel ? signName + ' රාශියේ ' + houseLabel : signName + ' රාශියේ';
    return planetName + ' ' + siPlace + ' තැන්පත් වෙමින් කේන්දරයේ ප්‍රබල සලකුණක් තබයි. ' + focus + ' මෙමඟින් ' + houseArea + ' කෙරෙහි සෘජුවම බලපෑම් එල්ල කරනු ඇත. ' + degreeNote + (strengthNote ? ' ' + strengthNote : '');
  }
  var enPlace = houseLabel ? signName + ' in ' + houseLabel : signName;
  return planetName + ' is strategically placed in ' + enPlace + '. This powerful cosmic alignment dictates that your ' + focus + ' will naturally dominate the realm of ' + houseArea + '. ' + degreeNote + (strengthNote ? ' ' + strengthNote : '');
}

function getKendaraShadbalaPersonalDetail(strength, language) {
  var planetName = getKendaraPlanetName(strength && strength.name, language);
  var percent = Number(strength && strength.percentage || 0);
  var focus = getKendaraPlanetFocus(strength && strength.name, language);
  var bestPart = getKendaraStrongestShadbalaPart(strength && strength.components, language);

  if (language === 'si') {
    if (percent >= 60) return planetName + ' ග්‍රහයා ඔබගේ කේන්දරය තුළ ' + percent + '% ක ඉහළ සහ ප්‍රතික්ෂේප කළ නොහැකි බලයක් උසුලයි. මෙයින් ' + focus + ' ආශ්‍රිත කටයුතුවලදී ඔබට සුවිශේෂී ජයග්‍රහණ ගෙනෙන අතර මෙය ' + bestPart.label + ' හරහා ප්‍රශස්ත ලෙස ක්‍රියාත්මක වේ.';
    if (percent >= 45) return planetName + ' ග්‍රහයා ' + percent + '% ක මධ්‍යස්ථ ශක්තියකින් ක්‍රියා කරයි. මෙහිදී අන්ධ වාසනාවට වඩා ඔබගේ බුද්ධිමත් තීරණ මත ' + focus + ' හි සාර්ථකත්වය තීරණය වේ. තවද ' + bestPart.label + ' ඔබගේ ගමනට අමතර පිටුබලයක් සපයයි.';
    return planetName + ' ග්‍රහයා දරන්නේ කුඩා ස්වභාවික ශක්තියකි (' + percent + '%). එබැවින් ' + focus + ' හා සබැඳි කරුණුවලදී ක්ෂණික තීරණවලින් වැළකී, ගැඹුරින් සිතා බලා කටයුතු කිරීම ඔබට අතිශයින් වැදගත් වේ.';
  }

  if (percent >= 60) return planetName + ' commands an undeniable ' + percent + '% energetic influence in your chart. It acts as an elite cosmic architect for your ' + focus + ', channeling its ultimate power specifically through its ' + bestPart.label + '.';
  if (percent >= 45) return planetName + ' operates at a highly tactical ' + percent + '% capacity. Achieving mastery over your ' + focus + ' will depend on sheer execution and deliberate planning rather than passive luck, though its ' + bestPart.label + ' provides an excellent foundational support.';
  return planetName + ' maintains a subtler baseline vibration (' + percent + '%). It is a profound cosmic directive to exercise extreme patience and seek experienced counsel regarding your ' + focus + ', steering clear of rushed impulses.';
}

function getKendaraBhriguPersonalDetail(point, language) {
  if (!point) return '';
  var rashiName = getKendaraRashiName(point.rashi || point.rashiName || point.sinhala, language);
  var degreeValue = point.degreeInSign != null ? Number(point.degreeInSign) : (Number(point.degree || 0) % 30);
  var degreeText = isNaN(degreeValue) ? '' : degreeValue.toFixed(1) + '°';
  var lifeStyle = getKendaraLifeStyle(point.rashi || point.rashiName || point.sinhala, language);
  var birthFocus = getKendaraBirthFocus({ english: point.nakshatra, name: point.nakshatra }, language);
  var activations = point.currentActivations || [];

  if (language === 'si') {
    var activeText = activations.length > 0
      ? 'මේ දිනවල ' + activations.map(function(item) { return getKendaraPlanetName(item.planet, language); }).join(', ') + ' යන ග්‍රහ දෘෂ්ටීන් මෙම ලක්ෂ්‍යය අවදි කරන බැවින්, ඔබගේ ජීවිතයේ ඉතා වේගවත් හා සුවිශේෂී අවස්ථාවන් උදා වීමට නියමිතය.'
      : 'මෙය ක්ෂණික වාසනාවට වඩා, ඔබගේ ජීවිත කාලය පුරා විහිදෙන ගැඹුරු, සදාකාලික දියුණුවේ එකම දිශානතිය ලෙස සැලකිය යුතුය.';
    return 'ඔබේ දෛවයේ කේන්ද්‍රීය ලක්ෂ්‍යය ' + rashiName + ' රාශියේ ප්‍රබල ලෙස පිහිටා තිබේ. ' + lifeStyle + ' තවද, ඔබ උපන් නැකතේ ඉහළම ගුණය වන ' + birthFocus + ' මේ සඳහා ආත්මීයව සම්බන්ධ වේ. ' + activeText;
  }
  var enActiveText = activations.length > 0
    ? 'Currently, ' + activations.map(function(item) { return getKendaraPlanetName(item.planet, language); }).join(', ') + ' is powerfully activating this coordinate, precipitating rapid, high-impact opportunities on your timeline.'
    : 'View this not as a fleeting daily horoscope, but as your absolute North Star—a profound geometric compass indicating your highest lifetime evolution.';
  return 'The apex of your cosmic destiny is charted precisely in ' + rashiName + ' at ' + degreeText + '. ' + lifeStyle + ' This alignment flawlessly integrates the primal essence of ' + birthFocus + ' from your stellar birth coordinates. ' + enActiveText;
}

function getKendaraPlanetList(planets, language) {
  if (!planets || planets.length === 0) return language === 'si' ? 'ග්‍රහයන් නැහැ' : 'no planets';
  return planets.map(function(planet) { return getKendaraPlanetName(planet, language); }).join(', ');
}

function getKendaraKetuPatternDetail(pastLife, language) {
  var data = pastLife && pastLife.pastLife;
  if (!data) return '';
  var theme = data.ketuThemes || {};
  var rashiName = data.ketuRashi ? getKendaraRashiName(data.ketuRashi, language) : '';
  var domain = language === 'si' ? (theme.domainSi || theme.domain || '') : (theme.domain || '');
  if (language === 'si') {
    return 'කේතු ග්‍රහයා ' + (rashiName ? rashiName + ' රාශියෙහි ' : '') + 'නිදන්ගත වී ඇති බැවින්, ' + domain + ' සම්බන්ධ කාරණා ඔබට පෙර භවයක සිට සහජයෙන්ම හුරුපුරුදුය. එහෙත් එම සුවපහසු කලාපය තුළම සිරනොවී, එම සහජ ප්‍රඥාව ඔබගේ වර්තමාන අධ්‍යාත්මික ගමනට ශක්තිමත් පඩිපෙළක් කරගත යුතුව ඇත.';
  }
  return 'With Ketu stationed deeply in ' + (rashiName || 'this realm') + ', matters surrounding ' + domain + ' will feel intensely, almost unnervingly familiar due to past-life mastery. The cosmic challenge is to utilize this innate wisdom as a stepping stone rather than remaining stagnant in what is effortless.';
}

function getKendaraRahuDirectionDetail(pastLife, language) {
  var data = pastLife && pastLife.currentLifeDirection;
  if (!data) return '';
  var theme = data.rahuThemes || {};
  var rashiName = data.rahuRashi ? getKendaraRashiName(data.rahuRashi, language) : '';
  var growth = language === 'si' ? (theme.growthSi || theme.growth || '') : (theme.growth || '');
  if (language === 'si') {
    return 'රාහු, ' + (rashiName ? rashiName + ' රාශියේ ' : '') + 'බලපවත්වන බැවින්, මෙම ජීවිතයේ ඔබගේ උත්තරීතර පරිණාමය සහ දියුණුව සෘජුවම ' + growth + ' වෙත යොමුව තිබේ. ආරම්භයේදී මෙය අතිශය නුහුරු අභියෝගයක් සේ දැනුනද, කේන්දරයට අනුව ඔබගේ විශ්වීය ජයග්‍රහණය සැඟව ඇත්තේ එතැනය.';
  }
  return 'As Rahu casts its powerful shadow in ' + (rashiName || 'this sector') + ', your soul’s ultimate evolutionary mandate in this lifetime demands expansion into ' + growth + '. While initially foreign and intimidating, stepping boldly into this exact arena is what guarantees your highest destined rewards.';
}

function getKendaraKarmaBalanceDetail(pastLife, language) {
  var balance = pastLife && pastLife.karmaBalance;
  if (!balance) return '';
  var good = Number(balance.good || 0);
  var challenging = Number(balance.challenging || 0);
  if (language === 'si') {
    if (good > challenging) return 'මෙම කලාපය තුළ ශුභ කර්ම බලපෑම් ඉහළය. ඒ අනුව අතීත පුරුදු ඔබට බාධාවක් නොවී, ඔබගේ ඉදිරි අනාගතයට අතිමහත් ආශීර්වාදයක් මෙන්ම නොසෙල්වෙන පදනමක් වනු ඇත.';
    if (challenging > good) return 'මෙහිදී අභියෝගාත්මක කර්ම රටාවන් තරමක් ප්‍රබලය. එබැවින් හුරුපුරුදු සුලභ මාර්ගයෙන් මිදී, දැඩි සිහියෙන් යුතුව අලුත් තීරණ ගැනීම තුළින්ම පමණක් ඔබට මෙම අභියෝග විනිවිද යා හැක.';
    return 'ශුභ මෙන්ම අභියෝගාත්මක තත්වයන් මෙහි අතිශය සමබරව පවතී. එබැවින් විචාර බුද්ධිය පවත්වාගෙන, ඔබ ගන්නා වූ සෑම තීරණයක් මතම ඔබගේ දෛවයේ අවසන් ප්‍රතිඵලය දැඩිව තීරණය වනු ඇත.';
  }
  if (good > challenging) return 'Supportive karmic patterns overwhelmingly dominate this alignment. Your past-life instincts will naturally seamlessly assemble an invincible foundation rather than creating modern roadblocks.';
  if (challenging > good) return 'The karmic density here is heavily challenging. Profound evolution can only be unlocked by consciously severing old habits and forging radically different decisions in the present.';
  return 'The cosmic scales of support and karmic debt sit in absolute equilibrium here. Because of this exact balance, living with razor-sharp mindfulness and making deliberate, profound choices will exclusively forge your ultimate reality.';
}

function getKendaraMeritDetail(pastLife, language) {
  var merit = pastLife && pastLife.pastLifeMerit;
  if (!merit) return '';
  var benefics = getKendaraPlanetList(merit.benefics || [], language);
  var malefics = getKendaraPlanetList(merit.malefics || [], language);
  var lordText = merit.lord5 && merit.lord5.name ? getKendaraPlanetName(merit.lord5.name, language) : '';
  if (language === 'si') {
    if (merit.assessment === 'highly_meritorious') return 'පෙර භවයන්හි කළ උදාර පින් මහිමය හේතුවෙන් ' + benefics + ' වැනි සුබ ග්‍රහයන්ගෙන් ඔබට ප්‍රබල ආශීර්වාදයක් ලැබේ. නුවණ, ඉහළ නිර්මාණශීලීත්වය හා සහජ දක්ෂතා කිසිදු ආයාසයකින් තොරව ඔබ වෙත ගලා එයි.';
    if (merit.assessment === 'karmic_debts') return 'මෙහිදී ' + malefics + ' ග්‍රහයන් ගේ කර්ම බලපෑම් ඇති බැවින්, දේවල් සඳහා දැඩි ඉවසීමක් අත්‍යවශ්‍ය වේ. ක්ෂණික ප්‍රතිඵල පසුපස නොගොස් පියවරෙන් පියවර අත්දැකීම් ලබමින් ඉදිරියට යාමෙන් මෙම ග්‍රහ දෝෂය යටපත් කළ හැක.';
    return 'ඔබේ සහජ කුසලතා සහ ජීවිත පාඩම් එකිනෙකට සමබරව සම්මිශ්‍රණය වී තිබේ. ' + (lordText ? lordText + ' ග්‍රහයාගේ ගමන විසින් කාලයත් සමඟ මෙහි කූටප්‍රාප්තිය ඔබට පසක් කරනු ඇත.' : 'එබැවින් අන්තගාමී තීරණ නොගෙන, ගැඹුරු මානසික සමබරතාවයක් පවත්වා ගැනීම ඉතා වටී.');
  }
  if (merit.assessment === 'highly_meritorious') return 'Blessed by powerful ancient merit, ' + benefics + ' continuously bestow immense cosmic favor upon you. Elite level intellect, creative genius, and instinctual wisdom simply flow to you without agonizing effort.';
  if (merit.assessment === 'karmic_debts') return 'Due to the presence of ' + malefics + ' carrying karmic tension, this domain absolutely demands profound patience. True mastery here is unlocked not through force, but by undertaking slow, meticulous, and humbling life lessons.';
  return 'Your divine gifts and necessary karmic lessons exist in a beautifully orchestrated equilibrium. ' + (lordText ? 'The sovereign planet ' + lordText + ' will systematically unveil how this destiny resolves as you age.' : 'Success here is purely defined by your ability to maintain stoic balance under varying life pressures.');
}

function getKendaraDashaPlanet(part) {
  if (!part) return '';
  if (typeof part === 'string') return part;
  return part.planet || part.lord || part.name || '';
}

function getKendaraCurrentDashaWindow(dasha) {
  if (!dasha) return null;
  var current = dasha.currentMahadasha;
  if (current && typeof current === 'object' && (current.startTime || current.start || current.endTime || current.end)) return current;
  var currentPlanet = getKendaraDashaPlanet(current);
  var now = new Date();
  var periods = dasha.mahadashas || [];
  for (var periodIndex = 0; periodIndex < periods.length; periodIndex++) {
    var period = periods[periodIndex];
    var start = new Date(period.startTime || period.start);
    var end = new Date(period.endTime || period.end);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && now >= start && now <= end) return period;
  }
  for (var matchIndex = 0; matchIndex < periods.length; matchIndex++) {
    if (getKendaraPlanetKey(periods[matchIndex].planet) === getKendaraPlanetKey(currentPlanet)) return periods[matchIndex];
  }
  return current && typeof current === 'object' ? current : null;
}

function getKendaraDashaRemainingText(period, language) {
  if (!period) return '';
  var end = new Date(period.endTime || period.end);
  if (isNaN(end.getTime())) return '';
  var diffMs = end - new Date();
  if (diffMs <= 0) return language === 'si' ? 'මෙම දශා කාල පරිච්ඡේදය මේ වන විට සම්පූර්ණයෙන්ම අවසානයට පැමිණ ඇත.' : 'This astrological epoch is currently in its absolute final stages of resolution.';
  var months = Math.round(diffMs / (30.44 * 24 * 60 * 60 * 1000));
  if (language === 'si') {
    if (months >= 18) return 'තව වසර ' + (months / 12).toFixed(1) + ' ක පමණ ප්‍රබල කාලසීමාවක් මෙම දශාව යටතේ පවතී. ඔබගේ ජීවිතයේ දැවැන්තම සහ දිගුකාලීන සැලසුම් දියත් කිරීමට මෙය පදනම වේ.';
    return 'මෙම දශාවේ අවසන් මාස ' + months + ' ක පමණ කාලය දැන් උදා වී ඇත. එබැවින් විශාල පරිවර්තනයන් ඔබේ ජීවිතයට ඉතා ආසන්නව සිදුවෙමින් පවතී.';
  }
  if (months >= 18) return 'You maintain a vast window of approximately ' + (months / 12).toFixed(1) + ' years under this phase, making it the definitive bedrock for architecting your grand, long-term visions.';
  return 'With barely ' + months + ' months remaining in this cycle, the cosmic window is closing, condensing its themes into highly tangible, immediate life shifts.';
}

function getKendaraDashaPersonalNote(dasha, language, shadbala) {
  if (!dasha || !dasha.currentMahadasha) return '';
  var currentWindow = getKendaraCurrentDashaWindow(dasha);
  var mainPlanet = getKendaraDashaPlanet(currentWindow) || getKendaraDashaPlanet(dasha.currentMahadasha);
  var subPlanet = getKendaraDashaPlanet(dasha.currentAntardasha);
  var mainName = getKendaraPlanetName(mainPlanet, language);
  var subName = subPlanet ? getKendaraPlanetName(subPlanet, language) : '';
  var mainFocus = getKendaraPlanetFocus(mainPlanet, language);
  var subFocus = subPlanet ? getKendaraPlanetFocus(subPlanet, language) : '';
  var strength = getKendaraShadbalaForPlanet(shadbala, mainPlanet);
  var remaining = getKendaraDashaRemainingText(currentWindow, language);
  if (language === 'si') {
    var siStrength = strength ? 'මෙම ග්‍රහයා ඔබගේ කේන්දරයේ ' + (strength.percentage || 0) + '% ක විසල් බලයක් උසුලන බැවින්, ඉහත කී තත්වයන් ඔබගේ ඉරණම තුළ තීරණාත්මක ලෙස සටහන් වනු ඇත.' : '';
    var siSub = subPlanet ? ' ඊට අමතරව ' + subName + ' ගේ අතුරු දශාව ද ක්‍රියාත්මක වන හෙයින්, ' + subFocus + ' දිනපතාම අත්විඳීමට ඔබට සිදු වේ.' : '';
    return 'වර්තමානයේ ඔබ ගත කරන්නේ ' + mainName + ' ග්‍රහයාගේ ප්‍රධාන මහා දශාවයි. ඒ අනුව ඔබගේ සමස්ත ජීවන රටාවම ' + mainFocus + ' වටා කේන්ද්‍රගත වී ඇත.' + siSub + ' ' + siStrength + ' ' + remaining;
  }
  var enStrength = strength ? 'Fortified by an immense ' + (strength.percentage || 0) + '% power rating in your chart, this planetary lord absolutely commands how forcefully these themes materialize.' : '';
  var enSub = subPlanet ? ' Synchronously, the faster ' + subName + ' sub-period is intricately weaving ' + subFocus + ' into your microscopic daily reality.' : '';
  return 'You are currently enveloped by the sovereign ' + mainName + ' major period, establishing unquestionable dominance wherein ' + mainFocus + ' dictates the overarching narrative of your existence.' + enSub + ' ' + enStrength + ' ' + remaining;
}

function getKendaraStrengthCopy(item, language) {
  var category = String(item && item.category || '').toLowerCase();
  
  if (language === 'si') {
    if (category.indexOf('viparita') !== -1) return { label: 'පරීවර්තනීය ජයග්‍රහණය', desc: 'අතිශය අභියෝගාත්මක බිඳවැටීමකින් පසුවද, ලැබූ පන්නරය තුළින් කිසිවෙකුට සමකළ නොහැකි ප්‍රබලත්වයකින් යළි නැගී සිටීමේ අපූරු හැකියාව.' };
    if (category.indexOf('raja') !== -1) return { label: 'රාජකීය නායකත්වය', desc: 'ප්‍රතික්ෂේප කළ නොහැකි රාජ්‍යතාන්ත්‍රික පෞරුෂයක් මඟින්, ඕනෑම වගකීමක් නොපිරිහෙලා ඉටුකරමින් අන් අයව සාර්ථකව මෙහෙයවීමේ බලය.' };
    if (category.indexOf('dhana') !== -1) return { label: 'අප්‍රමාණ ආර්ථික බලය', desc: 'නිසි කාලයේදී දරන අවංක උත්සාහය මඟින්, දැවැන්ත සහ ස්ථාවර ආර්ථික ව්‍යාප්තියක් කරා ශීඝ්‍රයෙන් ඔබව ගෙනයන උත්තරීතර වාසනාව.' };
    if (category.indexOf('dosha') !== -1 || category.indexOf('challenge') !== -1) return { label: 'ඉහළ වූ අවබෝධය', desc: 'මෙය භීතියට කරුණක් නොව, ජීවිතයේ ඉතා වැදගත් තීරණ ගැනීමේදී මින් පෙරට වඩා ගැඹුරින් සහ තියුණු කල්පනාවකින් යුතු වීමට දෙන විශ්වීය කමා ප්‍රවේශයි.' };
    if (category.indexOf('moon') !== -1) return { label: 'මානසික සහ සමාජීය සංහිඳියාව', desc: 'බාහිර ලෝකයෙන් විශ්වාසය හා ජනප්‍රියත්වය දිනාගන්නා අතරම, ඔබගේ අපිරිසිදු ආධ්‍යාත්මික සහ මානසික සැනසිල්ල අඛණ්ඩව සුරක්ෂිත කරන පිහිටීමකි.' };
    if (category.indexOf('education') !== -1) return { label: 'බුද්ධිමය හා නෛසර්ගික ප්‍රතිභාව', desc: 'අතිශය නිර්මාණශීලී ගුණයෙන් සහ මනා සන්නිවේදනයෙන් හෙබි, ඕනෑම දෙයක් ක්ෂණිකව ග්‍රහණය කරගත හැකි අසමසම ප්‍රඥාවන්ත පිහිටීමකි.' };
    if (category.indexOf('character') !== -1) return { label: 'උදාර සදාචාරය', desc: 'කෙතරම් ඉහළට ගියද, නොසැලෙන සදාචාරාත්මක පදනමක් මත පිහිටමින් සමාජයේ උත්තරීතර ගෞරවය සහ විශ්වාසය තහවුරු කරන බලයක්.' };
    if (category.indexOf('personality') !== -1 || category.indexOf('panch') !== -1) return { label: 'චුම්භක ආකර්ෂණය', desc: 'මහා පිරිසක් මැද වුවද රාජකීය තේජසින් යුක්තව කැපී පෙනීමටත්, ඔබගේ අසමසම පෞරුෂයෙන් මනුෂ්‍ය සිත් වසඟ කිරීමටත් ඇති විශ්මිත බලය.' };
    if (category.indexOf('protection') !== -1 || category.indexOf('benefic') !== -1) return { label: 'දිව්‍යමය ආරක්ෂාව', desc: 'ව්‍යසනයක් සිදු වීමට පෙර නිසි මොහොතේදී ලඟාවන දේව ආශීර්වාදයක් මෙන්, ඔබව ආරක්ෂා කර ගනිමින් බාධක ජයගැනීමට මඟ පෙන්වන ශක්තිය.' };
    if (category.indexOf('sun') !== -1) return { label: 'ආධිපත්‍යමය සන්නිවේදනය', desc: 'ඔබගේ සෑම වචනයකටම දැවැන්ත බරක් හා රාජකීය බලයක් ලබා දෙමින්, කිසිදු ආයාසයකින් තොරව අන් අයව ආකර්ෂණය කර මෙහෙයවීමේ ශක්තිය.' };
    if (category.indexOf('neechabhanga') !== -1) return { label: 'දුබලතාවය ශක්තියක් වීම', desc: 'ආරම්භයේදී ඔබව දුර්වල කළ යම් ලක්ෂණයක්ම, කාලයත් සමඟ පරිණත වී මුළු ජීවිතයම ඔසවා තබන ප්‍රබලතම ශක්තිය බවට පත්වන මහා යෝගයක්.' };
    return { label: 'විශ්වීය සමතුලිත බලය', desc: 'ඔබගේ කේන්දරය තුළ ක්‍රියාත්මක වන ස්වභාවික යහපත් ශක්ති ප්‍රවාහයක් මඟින්, නිවැරදි ඉලක්ක කරා යාමට අඛණ්ඩව උදව් වන පිහිටීමකි.' };
  }
  
  if (category.indexOf('viparita') !== -1) return { label: 'Triumph Through Ruin', desc: 'A staggeringly resilient astrological configuration that mandates you crush devastating obstacles and rebuild an unconquerable empire from the ashes.' };
  if (category.indexOf('raja') !== -1) return { label: 'Sovereign Leadership Matrix', desc: 'An elite cosmic signature that guarantees supreme authority, allowing you to effortlessly command respect and magnetize public influence out of nothing.' };
  if (category.indexOf('dhana') !== -1) return { label: 'Uncapped Wealth Architecture', desc: 'A deeply rare prosperity grid within your chart that relentlessly attracts elite financial expansion when properly aligned with your supreme labor.' };
  if (category.indexOf('dosha') !== -1 || category.indexOf('challenge') !== -1) return { label: 'Strategic Cosmic Buffer', desc: 'Do not fear this alignment—it merely functions as a high-level cosmic fail-safe, demanding rigorous double-verification of all extreme life strategies.' };
  if (category.indexOf('moon') !== -1) return { label: 'Magnetic Public Serenity', desc: 'A psychological fortress that eternally safeguards your inner tranquility while simultaneously rendering you wildly magnetic and universally trusted.' };
  if (category.indexOf('education') !== -1) return { label: 'Hyper-Intellectual Genesis', desc: 'An absolutely beautiful constellation that violently accelerates your mental processing speed, creative divinity, and eloquent mass communication.' };
  if (category.indexOf('character') !== -1) return { label: 'Indestructible Moral Reputation', desc: 'A framework that ensures regardless of your titanic success, your foundational integrity and societal honor remain forever untarnished.' };
  if (category.indexOf('personality') !== -1 || category.indexOf('panch') !== -1) return { label: 'Hypnotic Persona Aura', desc: 'A devastatingly charming planetary stance that exponentially amplifies your sheer physical magnetism and charismatic gravity in any room.' };
  if (category.indexOf('protection') !== -1 || category.indexOf('benefic') !== -1) return { label: 'Divine Intervention Protocol', desc: 'A guardian placement acting as ultimate cosmic armor; deflecting severe trauma and orchestrating miraculous rescue pathways exactly at the 11th hour.' };
  if (category.indexOf('sun') !== -1) return { label: 'Dictatorial Vocal Power', desc: 'A configuration that infuses your pure speech with blinding solar radiation; allowing you to persuade, alter, and completely dominate human consciousness.' };
  if (category.indexOf('neechabhanga') !== -1) return { label: 'Alchemy of the Weakened', desc: 'An exceptionally rare cosmic phenomenon where your initial, profound vulnerability ultimately mutates into your single most lethal existential weapon.' };
  return { label: 'Fundamental Harmonic Strength', desc: 'A universally positive mathematical hum in your chart that continually steers your subconscious toward flawless, evolutionary decisions.' };
}

function getKendaraStrengthCategoryLabel(category, language) {
  var rawCategory = String(category || '');
  var normalized = rawCategory.toLowerCase();
  if (language === 'si') {
    if (normalized.indexOf('viparita') !== -1) return 'විපරීත රාජ යෝගය';
    if (normalized.indexOf('raja') !== -1) return 'රාජ යෝගය';
    if (normalized.indexOf('dhana') !== -1) return 'ධන යෝගය';
    if (normalized.indexOf('dosha') !== -1 || normalized.indexOf('challenge') !== -1) return 'අවධානය දෙන්න ඕන පිහිටීමක්';
    if (normalized.indexOf('moon') !== -1) return 'චන්ද්‍ර යෝගය';
    if (normalized.indexOf('education') !== -1) return 'ඉගෙනීම් යෝගය';
    if (normalized.indexOf('character') !== -1) return 'චරිත සහාය';
    if (normalized.indexOf('personality') !== -1) return 'පෞරුෂ යෝගය';
    if (normalized.indexOf('panch') !== -1) return 'පංච මහාපුරුෂ යෝගය';
    if (normalized.indexOf('protection') !== -1) return 'ආරක්ෂක යෝගය';
    if (normalized.indexOf('benefic') !== -1) return 'ශුභ යෝගය';
    if (normalized.indexOf('sun') !== -1) return 'සූර්ය යෝගය';
    if (normalized.indexOf('neechabhanga') !== -1) return 'නීචභංග යෝගය';
    return 'ස්වභාවික ශක්ති පිහිටීමක්';
  }
  return rawCategory || 'Natural Strength';
}

function getKendaraChallengeCopy(item, language) {
  var severity = item && item.severity ? String(item.severity).toLowerCase() : '';
  if (language === 'si') {
    if (item && item.cancelled) {
      return {
        label: 'මේකෙන් ලොකු බලපෑමක් නෑ',
        desc: 'ඔබේ කේන්දරේ තියෙන අනිත් ශක්තිමත් පිහිටීම් නිසා මේකෙන් එන අභියෝග මගහැරිලා ගිහින්. ඒ නිසා මේ ගැන බයවෙන්න දෙයක් නැහැ.',
      };
    }
    if (severity.indexOf('severe') !== -1) {
      return {
        label: 'ලොකු තීරණ ගනිද්දී පරිස්සම් වෙන්න',
        desc: 'හදිස්සි වෙලා ගන්න තීරණ සහ කේන්තියෙන් වැඩ කරන එකෙන් මේ කාලේ ප්‍රශ්න වැඩිවෙන්න පුළුවන්. හැම ආරවුලක්ම ඉවසීමෙන් සහ කතාබහ කරලා විසඳගන්න එක තමයි හොඳම දේ.',
      };
    }
    if (severity.indexOf('moderate') !== -1) {
      return {
        label: 'කලබල නැතුව ඉස්සරහට යන්න',
        desc: 'මේ පිහිටීම නිසා සමහර වැඩ පරක්කු වෙන්න හරි, අමතර වගකීම් පැවරෙන්න හරි පුළුවන්. ඒ නිසා හැමදේකටම කලින් සූදානම් වෙලා ඉන්න එක ගොඩක් වැදගත්.',
      };
    }
    return {
      label: 'සාමාන්‍ය විදිහට කල්පනාවෙන් ඉන්න',
      desc: 'මේක එච්චර බයවෙන්න ඕන දෙයක් නෙමෙයි. දෛනික වැඩ වලදී ඉවසීමෙන් කටයුතු කරලා, අනවශ්‍ය අවදානම් නොගෙන හිටියා නම් හොඳටම ඇති.',
    };
  }
  if (item && item.cancelled) {
    return {
      label: 'Impact is Naturally Softened',
      desc: 'Other strong placements in your chart have naturally neutralized this challenge. You don\'t need to worry about this area.',
    };
  }
  if (severity.indexOf('severe') !== -1) {
    return {
      label: 'Take Extra Time on Major Decisions',
      desc: 'Rushing into things or reacting with anger will likely backfire right now. The best way forward is extreme patience and talking things out calmly.',
    };
  }
  if (severity.indexOf('moderate') !== -1) {
    return {
      label: 'Plan Steadily, Avoid Rushing',
      desc: 'You might face a few delays or added responsibilities because of this. Preparing in advance and staying out of sudden drama will protect your peace.',
    };
  }
  return {
    label: 'Maintain Gentle Awareness',
    desc: 'There\'s nothing to be afraid of here. Just handle your day-to-day matters patiently and avoid taking completely unnecessary risks.',
  };
}

function getKendaraIssueCopy(item, language) {
  var rawName = String((language === 'si' && item && item.sinhala) || (item && item.name) || '');
  var rawText = [item && item.name, item && item.sinhala, item && item.description, item && item.descriptionSi, item && item.type].filter(Boolean).join(' ').toLowerCase();
  var isSi = language === 'si';
  var issue = isSi
    ? { name: 'සැලකිලිමත් වෙන්න ඕන තැනක්', meaning: 'මේකෙන් පෙන්වන්නේ ඔබේ ජීවිතේ වැඩිපුර හිතලා, පරිස්සමෙන් තීරණ ගන්න ඕන පැත්තක්.' }
    : { name: 'Chart Focus Area', meaning: 'This highlights a specific part of your life where being extra mindful will help you avoid unnecessary stress.' };

  if (/mars|mangal|kuja|අංගහරු|කුජ/.test(rawText)) {
    issue = isSi
      ? { name: 'කුජ බලපෑම - සබඳතා වල තීව්‍රතාව', meaning: 'ආදරය, සහකාරයා වගේ කිට්ටු බැඳීම් වලදී ඉක්මනට කේන්ති යන්න, හිතුවක්කාර තීරණ ගන්න මේකෙන් බලපෑමක් වෙන්න පුළුවන්. ඒ ගැන පරිස්සම් වෙන්න.' }
      : { name: 'Mars Influence - Relationship Intensity', meaning: 'Watch out for sudden impatience or taking things too aggressively in your close relationships and marriage.' };
  } else if (/kaal|sarp|කාල සර්ප/.test(rawText)) {
    issue = isSi
      ? { name: 'රාහු-කේතු බලපෑම - හදිසි වෙනස්වීම්', meaning: 'ජීවිතේ හදිසි වෙනස්කම්, බලාපොරොත්තු නොවුණු ප්‍රමාදයන් ගේන්න මේකෙන් පුළුවන්. කලබල නොවී ඉවසීමෙන් ඉන්න එක තමයි හොඳම දේ.' }
      : { name: 'Rahu-Ketu Shift - Sudden Changes', meaning: 'This indicates periods where life brings unexpected ups and downs. The best approach is to stay calm and not rush major decisions.' };
  } else if (/saturn.*7\.5|sade|ශනි පැමිණීම/.test(rawText)) {
    issue = isSi
      ? { name: 'සෙනසුරු කාලය - වගකීම් සහ ප්‍රමාද', meaning: 'මේ කාලේදී වැඩියෙන් වගකීම්, මනසට වෙහෙස සහ කරන වැඩ වල ප්‍රමාදයන් දැනෙන්න පුළුවන්. පිළිවෙළකට මහන්සි වෙලා වැඩ කරන එක තමයි එකම විසඳුම.' }
      : { name: 'Saturn Transit - Responsibility & Delay', meaning: 'You might feel extra heavy responsibilities, delays, or mental pressure right now. Staying disciplined and patient is your key to getting through it.' };
  } else if (/family heritage|pitru|පිතෘ|පරම්පරා/.test(rawText)) {
    issue = isSi
      ? { name: 'පවුල් රටාව - මුල් පවුලෙන් එන බලපෑම', meaning: 'පවුලෙන් එන පරණ පුරුදු, තාත්තා සම්බන්ධ දේවල් සහ වැඩිහිටියන්ගේ වගකීම් ඔබේ ජීවිතේ ඉස්සරහට යන්න බලපෑම් කරනවා.' }
      : { name: 'Family Pattern - Ancestral Influence', meaning: 'Old family dynamics, father-related matters, or generational expectations are actively playing a role in your life choices right now.' };
  } else if (/solar|සූර්ය/.test(rawText)) {
    issue = isSi
      ? { name: 'රවි සංවේදිතාව - ආත්ම විශ්වාසය සහ තීරණ', meaning: 'තමන් ගැන තියෙන විශ්වාසය, රැකියාවේ ලොකු අය එක්ක තියෙන සම්බන්ධය සහ ලොකු තීරණ ගන්නකොට දෙපාරක් හිතන්න වෙනවා.' }
      : { name: 'Sun Sensitivity - Confidence & Authority', meaning: 'Take extra care when dealing with authority figures, making leadership decisions, or handling matters that affect your self-esteem.' };
  } else if (/lunar|moon|චන්ද්‍ර/.test(rawText) && !/saturn|ශනි/.test(rawText)) {
    issue = isSi
      ? { name: 'සඳු සංවේදිතාව - මනස සහ හැඟීම්', meaning: 'හිතට දැනෙන සැනසිල්ල අඩුවෙන්න, නින්දට බාධා වෙන්න, අම්මා සම්බන්ධ දේවල් ගැන වැඩිපුර හිතන්න මේකෙන් සිද්ධ වෙනවා.' }
      : { name: 'Moon Sensitivity - Emotional Balance', meaning: 'Your mind and emotional peace need extra protection right now. Prioritize your mental health, good sleep, and inner comfort.' };
  } else if (/moon-saturn|චන්ද්‍ර-ශනි/.test(rawText)) {
    issue = isSi
      ? { name: 'සඳු-ශනි පීඩනය - හැඟීම් දරාගැනීම', meaning: 'ප්‍රශ්න ආවාම කොතරම් දුක හිතුණත් තනියම ඒවා දරාගෙන ඉන්න ඔබ පුරුදු වෙලා. මේකෙන් හිතට ලොකු බරක් දැනෙනවා.' }
      : { name: 'Moon-Saturn Weight - Emotional Heavy Lifting', meaning: 'You tend to carry your emotional burdens silently and alone. It’s important to release this mental heaviness and not isolate yourself.' };
  } else if (/saturn-rahu|ශනි-රාහු/.test(rawText)) {
    issue = isSi
      ? { name: 'ශනි-රාහු බලපෑම - අනපේක්ෂිත බාධා', meaning: 'ඉස්සරහට යනකොට නොපෙනෙන දේවල් වලින් බාධා, ප්‍රමාදයන් එන්න පුළුවන්. ඒ නිසා හැමදේකටම කල්තියා සූදානම් වෙලා ඉන්න.' }
      : { name: 'Saturn-Rahu Tension - Unseen Obstacles', meaning: 'Watch out for confusing delays or complicated obstacles. Pushing forward requires careful planning and immense patience.' };
  } else if (/jupiter|guru|ගුරු/.test(rawText)) {
    issue = isSi
      ? { name: 'ගුරු බලපෑම - උපදෙස් සහ තීරණ', meaning: 'අධ්‍යාපනයට, ජීවිතේට ගන්න උපදෙස් සහ විශ්වාස කරන දේවල් ගැන ලොකු වගකීමකින් තීරණ ගන්න ඕන කාලයක්.' }
      : { name: 'Jupiter Caution - Advice & Growth', meaning: 'Be very mindful about whom you take advice from, your educational choices, and the larger beliefs guiding your life right now.' };
  } else if (/financial|daridra|මූල්‍ය/.test(rawText)) {
    issue = isSi
      ? { name: 'මූල්‍ය කළමනාකරණය', meaning: 'වියදම් වැඩිවෙන්න, ඉතුරුම් නැතිවෙන්න පුළුවන් නිසා සල්ලි සම්බන්ධ තීරණ ගැනීමේදී ගොඩක් සැලකිලිමත් වෙන්න ඕන.' }
      : { name: 'Financial Caution - Money Management', meaning: 'You need strict discipline with your finances right now. Avoid unnecessary spending and carefully monitor your savings and investments.' };
  }

  issue.technical = rawName || (isSi ? 'නම නොමැති ගණනයක්' : 'Unnamed calculation');
  return issue;
}

function getKendaraCancellationCopy(item, language) {
  var reason = String((item && item.cancellationReason) || (item && item.details && item.details.cancellationReason) || '');
  var rawText = [item && item.name, item && item.sinhala, item && item.description, item && item.descriptionSi, reason].filter(Boolean).join(' ').toLowerCase();
  
  if (language === 'si') {
    if (/mars|mangal|kuja|අංගහරු|කුජ/.test(rawText)) return 'ඔබේ කේන්දරේ කුජ බලවත්ව ඉන්න නිසා හරි, ගුරුගේ ආශිර්වාදය තියෙන නිසා හරි සබඳතා වලට එන ප්‍රශ්න ගොඩක් දුරට මගහැරිලා යනවා.';
    if (/moon-saturn|චන්ද්‍ර-ශනි/.test(rawText)) return 'ගුරුගේ බලපෑම නිසා මේ දෙන්නගේ එකතුවෙන් එන මානසික පීඩනය මෘදු කරලා තියෙනවා. ඒ නිසා ප්‍රශ්න ආවත් ඒවා දරාගන්න තරම් හිතේ හයියක් ඔබට තියෙනවා.';
    return reason ? cleanKendaraExplanation(reason, language) : 'කේන්දරේ තියෙන අනිත් ශක්තිමත් පිහිටීම් නිසා මේකෙන් ලොකු බලපෑමක් වෙන්නේ නැහැ. මේ ගැන බයවෙන්න දෙයක් නැහැ.';
  }
  
  if (/mars|mangal|kuja/.test(rawText)) return 'Because Mars is placed in a strong position or receives Jupiter\'s steadying energy, the typical relationship tension it normally brings is smoothed out.';
  if (/moon-saturn/.test(rawText)) return 'Jupiter\'s positive energy acts like a shield, softening the emotional heaviness here. You have the natural resilience to handle stress without letting it drag you down.';
  return reason ? cleanKendaraExplanation(reason, language) : 'Other very strong and positive placements in your chart naturally protect you, heavily reducing the impact of this particular area.';
}

function cleanKendaraExplanation(text, language) {
  if (!text) return text;
  var out = String(text);
  var replacements = language === 'si'
    ? [
        [/Nakshatra|නක්ෂත්‍ර/g, 'උපන් නැකතේ ශක්තිය'], [/Tithi|තිථි/g, 'සඳුගේ රිද්මය'], [/Yoga|Yogas|යෝග/g, 'විශේෂ ශක්තීන්'],
        [/Dosha|Doshas|දෝෂ/g, 'පරිස්සම් වෙන්න ඕන පැති'], [/Navamsha|D9|D-9/g, 'ජීවිතේ ගැඹුරු බැඳීම්'], [/Rashi|රාශි/g, 'මූලික ජීවන රටාව'],
        [/Lagna|ලග්න/g, 'ජීවිතේ යන පාර'], [/Dasha|දශා/g, 'මේ ගතකරන කාලය'], [/Atmakaraka/g, 'ආත්මයේ ඇත්තම ආශාව'], [/Upapada/g, 'ආදරය සහ බැඳීම'],
        [/Rahu|රාහු/g, 'අලුත් දේවල් හොයන ආශාව'], [/Ketu|කේතු/g, 'අත්හැරීමේ සහජ ඉව'], [/planetary positions|planet positions/gi, 'උපන් වෙලාවේ ග්‍රහ ශක්තීන්'],
      ]
    : [
        [/Nakshatra/g, 'Inner Mindset'], [/Tithi/g, 'Emotional Rhythm'], [/Yoga|Yogas/g, 'Hidden Strengths'], [/Dosha|Doshas/g, 'Areas to Watch'],
        [/Navamsha|D9|D-9/g, 'Deep Connection View'], [/Rashi/g, 'Life Energy'], [/Lagna/g, 'Life Path'], [/Dasha/g, 'Current Life Focus'],
        [/Atmakaraka/g, 'Soul Purpose'], [/Upapada/g, 'Relationship Style'], [/Rahu/g, 'Eager Ambitions'], [/Ketu/g, 'Spiritual Instincts'],
        [/planetary positions|planet positions/gi, 'natural energy patterns'], [/Vedic astrology/gi, 'this life reading'],
      ];
  replacements.forEach(function(pair) { out = out.replace(pair[0], pair[1]); });
  return out;
}

// ── Varga Chart Async Loader ──────────────────────────────────
function VargaChartDisplay({ division, birthDateTime, lat, lng, language }) {
  var [vargaData, setVargaData] = useState(null);
  var [vargaLoading, setVargaLoading] = useState(false);
  var [vargaError, setVargaError] = useState(null);

  useEffect(function () {
    if (!birthDateTime || !division) return;
    var cancelled = false;
    setVargaLoading(true);
    setVargaError(null);
    api.getJyotishVarga(division, { birthDate: birthDateTime, lat: lat, lng: lng })
      .then(function (res) {
        if (cancelled) return;
        if (res && res.success && res.data) {
          setVargaData(res.data);
        } else {
          setVargaError('No data');
        }
      })
      .catch(function (err) {
        if (!cancelled) setVargaError(err.message || 'Failed');
      })
      .finally(function () {
        if (!cancelled) setVargaLoading(false);
      });
    return function () { cancelled = true; };
  }, [division, birthDateTime, lat, lng]);

  if (vargaLoading) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
        <CosmicLoader size={28} color="#06B6D4" />
      </View>
    );
  }
  if (vargaError || !vargaData) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 16 }}>
        <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>
          {language === 'si' ? 'විස්තර නැහැ' : 'No data available'}
        </Text>
      </View>
    );
  }

  // Render varga planet table
  var planets = vargaData.planets || {};
  var ascRashiId = vargaData.ascendant?.rashi;
  var ascRashi = language === 'si' && ascRashiId ? RASHI_SI[ascRashiId] : (vargaData.ascendant?.rashiName || '--');

  // Planet meaning in each divisional chart context
  var PLANET_MEANING = {
    d9: {
      Sun:     { si: 'විවාහයේ අධිකාරිය/තත්ත්වය', en: 'Authority & status in marriage' },
      Moon:    { si: 'විවාහයේ හැඟීම්/සහායකත්වය', en: 'Emotional bond in marriage' },
      Mars:    { si: 'විවාහයේ ශක්තිය/ගැටුම්', en: 'Passion & conflicts in marriage' },
      Mercury: { si: 'සන්නිවේදනය/බුද්ධිමත් සම්බන්ධතා', en: 'Communication in relationships' },
      Jupiter: { si: 'විවාහයේ ආශීර්වාදය/සෞභාග්‍යය', en: 'Blessings & fortune in marriage' },
      Venus:   { si: 'ආදරය/ලිංගික සම්බන්ධතා', en: 'Love, romance & attraction' },
      Saturn:  { si: 'විවාහයේ පරීක්ෂණ/කැපවීම', en: 'Tests & commitment in marriage' },
      Rahu:    { si: 'අසාමාන්‍ය සම්බන්ධතා/විදේශීය', en: 'Unconventional or foreign partner' },
      Ketu:    { si: 'අධ්‍යාත්මික බැඳීම්/පසුගිය ජීවිත', en: 'Spiritual bond, past-life karma' },
      Uranus:  { si: 'අනපේක්ෂිත වෙනස්කම්', en: 'Sudden changes in relationships' },
      Neptune: { si: 'පරමාදර්ශී ආදරය', en: 'Idealistic or spiritual love' },
      Pluto:   { si: 'ගැඹුරු පරිවර්තනය', en: 'Deep transformation in bonds' },
    },
    d10: {
      Sun:     { si: 'වෘත්තීය නායකත්වය/අධිකාරිය', en: 'Career leadership & authority' },
      Moon:    { si: 'රැකියාවේ ජනප්‍රියත්වය/මහජනතාව', en: 'Public image & popularity at work' },
      Mars:    { si: 'වෘත්තීය තරඟකාරිත්වය/ශක්තිය', en: 'Career drive & competitiveness' },
      Mercury: { si: 'ව්‍යාපාර/සන්නිවේදන කුසලතා', en: 'Business skills & communication' },
      Jupiter: { si: 'වෘත්තීය සෞභාග්‍යය/උසස්වීම්', en: 'Career growth & promotions' },
      Venus:   { si: 'නිර්මාණාත්මක වෘත්තිය/සුඛෝපභෝගී', en: 'Creative career & luxury fields' },
      Saturn:  { si: 'දිගු කාලීන වෘත්තීය/වෙහෙස', en: 'Long-term career & hard work pays' },
      Rahu:    { si: 'තාක්ෂණය/විදේශ රැකියා', en: 'Technology or foreign career' },
      Ketu:    { si: 'අධ්‍යාත්මික/පර්යේෂණ වෘත්තිය', en: 'Research, spiritual or healing career' },
      Uranus:  { si: 'නවෝත්පාදන/නිදහස් වෘත්තිය', en: 'Innovation & freelance career' },
      Neptune: { si: 'කලා/සිනමා/සේවා වෘත්තිය', en: 'Arts, film or service career' },
      Pluto:   { si: 'බලාධිකාරී/පරිවර්තන වෘත්තිය', en: 'Powerful or transformative career' },
    },
    d7: {
      Sun:     { si: 'දරුවන්ගේ නායක ගුණය', en: 'Children\'s leadership qualities' },
      Moon:    { si: 'දරුවන් සමඟ හැඟීම් බැඳීම', en: 'Emotional bond with children' },
      Mars:    { si: 'දරුවන්ගේ ශක්තිය/ක්‍රීඩා', en: 'Children\'s energy & sports talent' },
      Mercury: { si: 'දරුවන්ගේ බුද්ධිය/ඉගෙනීම', en: 'Children\'s intelligence & learning' },
      Jupiter: { si: 'දරුවන්ගේ ආශීර්වාදය/සංඛ්‍යාව', en: 'Blessings of children & fertility' },
      Venus:   { si: 'දරුවන්ගේ නිර්මාණාත්මකත්වය', en: 'Children\'s creative talents' },
      Saturn:  { si: 'දරු ප්‍රමාදය/වගකීම්', en: 'Delayed children or responsibility' },
      Rahu:    { si: 'අසාමාන්‍ය දරුපලය', en: 'Unusual path to parenthood' },
      Ketu:    { si: 'අධ්‍යාත්මික දරු සම්බන්ධය', en: 'Spiritual bond or fewer children' },
      Uranus:  { si: 'දරුවන්ගේ නිදහස්කාමී ගුණ', en: 'Children\'s independent spirit' },
      Neptune: { si: 'දරුවන්ගේ නිර්මාණ හැකියා', en: 'Children\'s artistic abilities' },
      Pluto:   { si: 'දරුවන් හරහා පරිවර්තනය', en: 'Transformation through children' },
    },
    d4: {
      Sun:     { si: 'දේපළ හරහා තත්ත්වය', en: 'Status through property' },
      Moon:    { si: 'නිවසේ සැනසීම/සුවය', en: 'Comfort & happiness at home' },
      Mars:    { si: 'ඉඩම්/ගොඩනැගිලි', en: 'Land, buildings & real estate' },
      Mercury: { si: 'බහු දේපළ/ව්‍යාපාර', en: 'Multiple properties & business assets' },
      Jupiter: { si: 'දේපළ වාසනාව/උරුමය', en: 'Property fortune & inheritance' },
      Venus:   { si: 'සුඛෝපභෝගී නිවස/වාහන', en: 'Luxury home & vehicles' },
      Saturn:  { si: 'පැරණි දේපළ/ප්‍රමාද ලැබීම', en: 'Old property or delayed acquisition' },
      Rahu:    { si: 'විදේශ දේපළ/අසාමාන්‍ය ආයෝජන', en: 'Foreign property or unusual investments' },
      Ketu:    { si: 'දේපළ අලාභය/විරාගය', en: 'Property detachment or loss' },
    },
    d24: {
      Sun:     { si: 'අධ්‍යාපනයේ නායකත්වය', en: 'Academic leadership & recognition' },
      Moon:    { si: 'ඉගෙනීමේ ආශාව/මතකය', en: 'Learning desire & memory power' },
      Mars:    { si: 'තාක්ෂණික/ඉංජිනේරු අධ්‍යාපනය', en: 'Technical or engineering education' },
      Mercury: { si: 'බහු විෂය දැනුම/භාෂා', en: 'Multi-subject knowledge & languages' },
      Jupiter: { si: 'උසස් අධ්‍යාපනය/ශාස්ත්‍රීය', en: 'Higher education & academic success' },
      Venus:   { si: 'කලා/සංගීත අධ්‍යාපනය', en: 'Arts, music & creative education' },
      Saturn:  { si: 'ප්‍රමාද නමුත් ගැඹුරු ඉගෙනීම', en: 'Delayed but deep, thorough learning' },
      Rahu:    { si: 'විදේශ/නවීන අධ්‍යාපනය', en: 'Foreign or modern/tech education' },
      Ketu:    { si: 'ආධ්‍යාත්මික/පාරම්පරික දැනුම', en: 'Spiritual or traditional knowledge' },
    },
    d20: {
      Sun:     { si: 'ආධ්‍යාත්මික නායකත්වය', en: 'Spiritual leadership' },
      Moon:    { si: 'භක්තිය/භාවනා ශක්තිය', en: 'Devotion & meditation ability' },
      Mars:    { si: 'ක්‍රියාශීලී ආධ්‍යාත්මික පුහුණුව', en: 'Active spiritual practice (yoga, etc.)' },
      Mercury: { si: 'ආගමික ග්‍රන්ථ අධ්‍යයනය', en: 'Study of spiritual texts & philosophy' },
      Jupiter: { si: 'ගුරු ආශීර්වාදය/ප්‍රඥාව', en: 'Guru blessings & wisdom' },
      Venus:   { si: 'භක්ති සංගීතය/ආගමික කලාව', en: 'Devotional music & sacred arts' },
      Saturn:  { si: 'වෙහෙසකර ආධ්‍යාත්මික ගමන', en: 'Difficult but rewarding spiritual path' },
      Rahu:    { si: 'අසාමාන්‍ය ආධ්‍යාත්මික මාර්ග', en: 'Unconventional spiritual paths' },
      Ketu:    { si: 'ස්වාභාවික මෝක්ෂ සම්බන්ධය', en: 'Natural inclination to liberation' },
    },
  };

  var meanings = PLANET_MEANING[division] || {};

  return (
    <View style={{ marginTop: 12 }}>
      <View style={kj.vargaAscRow}>
        <Text style={kj.vargaAscLabel}>{language === 'si' ? 'මේ කොටසේ මූලික දිශාව' : 'Main focus in this chart'}</Text>
        <Text style={kj.vargaAscValue}>{getKendaraLifeStyle(ascRashi, language)}</Text>
      </View>
      {Object.entries(planets).map(function (entry, i) {
        var name = entry[0];
        var p = entry[1];
        if (!p) return null;
        var pInfo = PLANET_INFO[name] || {};
        var pColor = pInfo.color || '#818CF8';
        var rashiStr = language === 'si' && p.rashi ? RASHI_SI[p.rashi] : (p.rashiName || p.rashi || '--');
        var hint = meanings[name];
        var hintText = hint ? cleanKendaraExplanation(language === 'si' ? hint.si : hint.en, language) : null;
        var placementText = getKendaraLifeStyle(rashiStr, language);
        return (
          <View key={i} style={kj.vargaPlanetRow}>
            <View style={kj.vargaPlanetTop}>
              <View style={[kj.chalitDot, { backgroundColor: pColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={[kj.vargaPlanetName, { color: pColor }]}>
                  {getKendaraCoreEnergy(name, language)}
                </Text>
              </View>
              <Text style={kj.vargaPlanetRashi}>{getKendaraRashiName(rashiStr, language)}</Text>
            </View>
            <Text style={kj.vargaPlanetPlacement}>{placementText}</Text>
            {hintText ? (
              <Text style={kj.vargaPlanetHint} numberOfLines={2}>{hintText}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

// ============================================================
// Main Kendara Screen
// ============================================================

// ── Contextual next-step CTA (turns a passive read into a next action) ──
function KendaraCTA({ icon, title, sub, color, onPress }) {
  return (
    <SpringPressable onPress={onPress} haptic="light" style={{ marginBottom: 10 }}>
      <View style={[styles.ctaCard, { borderColor: color + '40' }]}>
        <LinearGradient colors={[color + '1C', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <View style={[styles.ctaIcon, { backgroundColor: color + '18', borderColor: color + '45' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ctaTitle}>{title}</Text>
          <Text style={styles.ctaSub}>{sub}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={color} />
      </View>
    </SpringPressable>
  );
}

// Inline "Ask the astrologer about this" link — turns a Pro section into a
// conversation starter (deep-links to chat with a prefilled question). Ties the
// two biggest Pro features together and makes each section feel less like a dead end.
function KendaraAskLink({ router, language, prefill, label }) {
  var si = language === 'si';
  return (
    <SpringPressable haptic="light" onPress={function () { router.push({ pathname: '/(tabs)/chat', params: { prefill: prefill } }); }} style={styles.askLinkRow}>
      <Ionicons name="chatbubble-ellipses-outline" size={13} color="#60A5FA" />
      <Text style={styles.askLinkText}>{label || (si ? 'මේ ගැන නැකැත්කරුගෙන් අහන්න' : 'Ask the astrologer about this')}</Text>
      <Ionicons name="arrow-forward" size={12} color="#60A5FA" />
    </SpringPressable>
  );
}

function KendaraNextSteps({ router, language }) {
  var si = language === 'si';
  return (
    <View style={{ marginTop: 26 }}>
      <View style={styles.headerRow}>
        <Ionicons name="arrow-forward-circle-outline" size={20} color="#FFB800" />
        <Text style={styles.sectionTitle}>{si ? 'ඊළඟට' : 'Where to next'}</Text>
      </View>
      <KendaraCTA
        icon="document-text-outline" color="#FF8C00"
        title={si ? 'ඔබේ සම්පූර්ණ ජීවිත වාර්තාව' : 'Your full life report'}
        sub={si ? 'රැකියාව, විවාහය, සෞඛ්‍යය සහ තවත් — ගැඹුරු කියවීමක්' : 'Career, marriage, health & more — the deep reading'}
        onPress={function () { router.push('/(tabs)/report'); }}
      />
      <KendaraCTA
        icon="heart-outline" color="#F472B6"
        title={si ? 'විවාහ පැකේජය' : 'Marriage Pack'}
        sub={si ? 'දෙදෙනෙකුගේ කේන්දර ගළපා, ඔබේ ගැළපීම බලන්න' : 'Match two charts — full porondam compatibility'}
        onPress={function () { router.push('/(tabs)/porondam'); }}
      />
      <KendaraCTA
        icon="chatbubbles-outline" color="#60A5FA"
        title={si ? 'නැකැත්කරුගෙන් අහන්න' : 'Ask the astrologer'}
        sub={si ? 'ඔබේ කේන්දරය ගැන ඕනෑම දෙයක් අහන්න' : 'Ask anything about your own chart'}
        onPress={function () { router.push({ pathname: '/(tabs)/chat', params: { prefill: si ? 'මගේ කේන්දරය ගැන වැඩිදුර කියන්න.' : 'Tell me more about my birth chart.' } }); }}
      />
    </View>
  );
}

// "What's moving today" — the daily-return hook (real, changes every ~2 days).
// For free users (locked) it renders masked, so the lock itself refreshes every
// couple of days — a self-renewing tease that pulls them back to the paywall.
function TransitTodayStrip({ transit, language, locked, onUnlock }) {
  var si = language === 'si';
  if (locked && (!transit || !transit.moon)) {
    return (
      <SpringPressable haptic="light" onPress={onUnlock} style={styles.transitStrip}>
        <LinearGradient colors={['rgba(199,210,254,0.14)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <View style={styles.transitIcon}><Ionicons name="planet-outline" size={16} color="#C7D2FE" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.transitEyebrow}>{si ? 'අද අහසේ' : 'TODAY’S SKY'}</Text>
          <Text style={styles.transitLine}>{si ? 'අද — සඳ ඔබේ ▓▓▓▓▓ කලාපය ඔස්සේ ගමන් කරනවා.' : 'Today — the Moon is moving through your ▓▓▓▓▓.'}</Text>
          <Text style={styles.transitSub}>{si ? 'අද ඔබට වැඩිපුරම බලපාන ග්‍රහ ගමන විවෘත කරන්න' : 'Unlock what’s moving in your sky today'}</Text>
        </View>
        <Ionicons name="lock-closed" size={13} color="rgba(199,210,254,0.7)" />
      </SpringPressable>
    );
  }
  if (!transit || !transit.moon) return null;
  var moonArea = getKendaraHouseArea(transit.moon.house, language);
  var line = si
    ? 'අද — සඳ ඔබේ ' + moonArea + ' කලාපය ඔස්සේ ගමන් කරනවා.'
    : 'Today — the Moon is moving through your ' + moonArea + '.';
  var notable = (transit.notable && transit.notable[0]) || null;
  var sub = null;
  if (notable) {
    var pArea = getKendaraHouseArea(notable.house, language);
    var pName = getKendaraPlanetName(notable.planet, language);
    sub = si ? (pName + ' දැනට ඔබේ ' + pArea + ' ශක්තිමත් කරමින්.') : (pName + ' is currently activating your ' + pArea + '.');
  }
  return (
    <View style={styles.transitStrip}>
      <LinearGradient colors={['rgba(199,210,254,0.14)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View style={styles.transitIcon}><Ionicons name="planet-outline" size={16} color="#C7D2FE" /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.transitEyebrow}>{si ? 'අද අහසේ' : 'TODAY’S SKY'}</Text>
        <Text style={styles.transitLine}>{line}</Text>
        {sub ? <Text style={styles.transitSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

// Shown to non-subscribers under the free chart teaser — converts curiosity.
// vaultCounts (from /api/preview/kendara) turns the generic list into named
// discoveries with real numbers: "3 yogas found — 1 is rare 🔒". Counts are
// free; the meanings and remedies behind them are Pro.
function KendaraUpgradeCard({ showPaywall, language, onUpgraded, vaultCounts }) {
  var si = language === 'si';

  // Count-driven headline rows — only what was actually found in THIS chart.
  var countRows = [];
  if (vaultCounts) {
    if (vaultCounts.yogas > 0) {
      var rare = vaultCounts.rareYogas || 0;
      countRows.push({
        n: vaultCounts.yogas,
        text: si
          ? 'යෝග හමු විය' + (rare > 0 ? ' — ' + rare + 'ක් දුර්ලභයි' : '')
          : (vaultCounts.yogas === 1 ? 'yoga found' : 'yogas found') + (rare > 0 ? ' — ' + rare + ' rare' : ''),
      });
    }
    if (vaultCounts.doshas > 0) {
      countRows.push({
        n: vaultCounts.doshas,
        text: si
          ? 'දෝෂ හමු විය — පිළියම් සමඟ'
          : (vaultCounts.doshas === 1 ? 'dosha found' : 'doshas found') + ' — with remedies',
      });
    }
  }

  var locked = si
    ? ['සම්පූර්ණ ජීවිත වාර්තාව', 'දශා කාල රේඛාව', 'අංශක සිතියම් (D9, D10…)', 'අද අහසේ දෛනික මාරු', 'නැකැත්කරුගෙන් අසන්න']
    : ['Your full life report', 'Your dasha timeline', 'Divisional charts (D9, D10…)', 'Daily “what changed today”', 'Ask the astrologer'];
  return (
    <View style={styles.upgradeCard}>
      <LinearGradient colors={['rgba(255,140,0,0.16)', 'rgba(147,51,234,0.08)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View style={styles.upgradeLockRow}>
        <Ionicons name="lock-closed" size={15} color="#FFB800" />
        <Text style={styles.upgradeEyebrow}>{si ? 'ඔබේ කේන්දරයේ හමු වූ දේ' : 'FOUND IN YOUR CHART'}</Text>
      </View>
      <Text style={styles.upgradeTitle}>{si ? 'ඔබේ සම්පූර්ණ ජීවිත සිතියම විවෘත කරන්න' : 'Unlock your full life map'}</Text>
      <View style={{ marginTop: 12, marginBottom: 16 }}>
        {countRows.map(function (row, i) {
          return (
            <View key={'c' + i} style={styles.upgradeItem}>
              <View style={styles.upgradeCountPill}>
                <Text style={styles.upgradeCountNum}>{row.n}</Text>
              </View>
              <Text style={styles.upgradeItemText}>{row.text}</Text>
              <Ionicons name="lock-closed" size={12} color="rgba(255,184,0,0.6)" />
            </View>
          );
        })}
        {locked.map(function (item, i) {
          return (
            <View key={i} style={styles.upgradeItem}>
              <Ionicons name="checkmark-circle" size={15} color="#34D399" />
              <Text style={styles.upgradeItemText}>{item}</Text>
            </View>
          );
        })}
      </View>
      <SpringPressable onPress={async function () { try { if (showPaywall) await showPaywall('kendara'); } catch (_) {} if (onUpgraded) onUpgraded(); }} haptic="medium">
        <LinearGradient colors={['#FFD97A', '#FFB800', '#FF8C00']} style={styles.upgradeBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Text style={styles.upgradeBtnText}>{si ? 'දැන් විවෘත කරන්න' : 'Unlock now'}</Text>
          <Ionicons name="arrow-forward" size={16} color="#2A1707" />
        </LinearGradient>
      </SpringPressable>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  LOCKED (free-user) TEASERS — the conversion wall
//  Rendered in place of the Pro vaults for non-subscribers. Each one carries
//  a REAL number from the user's own chart (yoga count, current dasha planet,
//  strongest planet %…) so the lock names what's inside instead of hiding it.
//  Every tap logs a distinct paywall source so we can learn which section sells.
// ══════════════════════════════════════════════════════════════════════

// A single locked Pro-section header. Looks like PremiumVaultSection so the wall
// feels native, but the body is a one-line tease + a lock chip → paywall.
function LockedVaultTeaser({ icon, color, eyebrow, title, tease, count, countSuffix, source, showPaywall, onUnlocked, language, delay, children }) {
  var accent = color || '#FFB800';
  var si = language === 'si';
  var onPress = async function () {
    try { if (showPaywall) await showPaywall(source || 'kendara'); } catch (_) {}
    if (onUnlocked) onUnlocked();
  };
  return (
    <Animated.View entering={FadeInDown.delay(delay || 0).duration(480)} style={styles.vaultSectionWrap}>
      <SpringPressable haptic="light" scalePressed={0.985} onPress={onPress} style={[styles.lockVaultHeader, { borderColor: accent + '33' }]}>
        <LinearGradient colors={[accent + '16', 'rgba(255,255,255,0.03)', 'rgba(8,5,3,0.66)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <View style={[styles.vaultIconWrap, { backgroundColor: accent + '14', borderColor: accent + '36' }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
        <View style={styles.vaultHeaderText}>
          <Text style={[styles.vaultEyebrow, { color: accent }]} numberOfLines={1}>{eyebrow}</Text>
          <Text style={[styles.vaultTitle, si && styles.sinhalaTextFlow]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.82}>{title}</Text>
          <Text style={[styles.lockTease, si && styles.sinhalaTextFlow]} numberOfLines={3}>{tease}</Text>
          {children}
        </View>
        <View style={styles.vaultActionStack}>
          {count != null ? (
            <View style={[styles.lockCountPill, { borderColor: accent + '55', backgroundColor: accent + '18' }]}>
              <Text style={[styles.lockCountNum, { color: accent }]}>{count}{countSuffix || ''}</Text>
            </View>
          ) : null}
          <View style={[styles.lockChip, { backgroundColor: accent + '18', borderColor: accent + '44' }]}>
            <Ionicons name="lock-closed" size={12} color={accent} />
          </View>
        </View>
      </SpringPressable>
    </Animated.View>
  );
}

// Locked chart placeholder (used for the D9 marriage chart). Draws an obscured
// frosted lattice — NEVER the real grid, which isn't even sent to free clients —
// with a lock overlay and CTA. The highest-desire tease on the page.
function LockedChartPanel({ title, tease, source, showPaywall, onUnlocked, language, accent, icon }) {
  var si = language === 'si';
  var col = accent || '#A78BFA';
  var onPress = async function () {
    try { if (showPaywall) await showPaywall(source || 'kendara'); } catch (_) {}
    if (onUnlocked) onUnlocked();
  };
  return (
    <View style={{ marginTop: 20 }}>
      <View style={styles.headerRow}>
        <Ionicons name={icon || 'apps-outline'} size={20} color="#FFB800" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <SpringPressable haptic="medium" onPress={onPress} style={[styles.lockChartWrap, { borderColor: col + '44' }]}>
        <LinearGradient colors={[col + '1C', 'rgba(8,5,3,0.72)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <View style={styles.lockChartGrid} pointerEvents="none">
          {Array.from({ length: 16 }).map(function (_, i) {
            return <View key={i} style={[styles.lockChartCell, { borderColor: col + '22' }]} />;
          })}
        </View>
        <View style={styles.lockChartOverlay}>
          <View style={[styles.lockChartOrb, { borderColor: col + '55', backgroundColor: col + '1F' }]}>
            <Ionicons name="lock-closed" size={22} color={col} />
          </View>
          <Text style={[styles.lockChartTease, si && styles.sinhalaTextFlow]}>{tease}</Text>
          <View style={[styles.lockChartCta, { backgroundColor: col + '24', borderColor: col + '55' }]}>
            <Text style={[styles.lockChartCtaText, { color: col }]}>{si ? 'විවෘත කරන්න' : 'Unlock'}</Text>
            <Ionicons name="arrow-forward" size={13} color={col} />
          </View>
        </View>
      </SpringPressable>
    </View>
  );
}

// Inline "value is locked" chip — replaces a single reading value (a plain-
// language row, a planet's personal note) while keeping its label visible.
function LockedValueChip({ language, onPress, label }) {
  var si = language === 'si';
  return (
    <SpringPressable haptic="light" onPress={onPress} style={styles.lockValueChip}>
      <Ionicons name="lock-closed" size={11} color="#FFB800" />
      <Text style={styles.lockValueChipText}>{label || (si ? 'විවෘත කර කියවන්න' : 'Unlock to read')}</Text>
    </SpringPressable>
  );
}

// Free-user dasha ladder: planet names + year spans (looks like a life map),
// current chapter highlighted with a progress bar. The reading, sub-periods and
// dates behind it stay Pro — the whole card taps through to the paywall.
function LockedDashaSkeleton({ ladder, current, source, showPaywall, onUnlocked, language, delay }) {
  var si = language === 'si';
  var rows = Array.isArray(ladder) ? ladder : [];
  var onPress = async function () {
    try { if (showPaywall) await showPaywall(source || 'kendara_dasha'); } catch (_) {}
    if (onUnlocked) onUnlocked();
  };
  var curPlanet = current ? getKendaraPlanetName(current.planet, language) : null;
  return (
    <Animated.View entering={FadeInDown.delay(delay || 0).duration(480)} style={styles.vaultSectionWrap}>
      <SpringPressable haptic="light" scalePressed={0.99} onPress={onPress} style={[styles.lockVaultHeader, { borderColor: 'rgba(167,139,250,0.33)', flexDirection: 'column', alignItems: 'stretch' }]}>
        <LinearGradient colors={['rgba(167,139,250,0.16)', 'rgba(255,255,255,0.03)', 'rgba(8,5,3,0.66)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.vaultIconWrap, { backgroundColor: 'rgba(167,139,250,0.14)', borderColor: 'rgba(167,139,250,0.36)' }]}>
            <Ionicons name="git-branch-outline" size={18} color="#A78BFA" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.vaultEyebrow, { color: '#A78BFA' }]} numberOfLines={1}>{si ? 'ජීවිත කාල රේඛාව' : 'Your Life Timeline'}</Text>
            <Text style={[styles.vaultTitle, si && styles.sinhalaTextFlow]} numberOfLines={2}>{si ? 'ඔබ දැන් ඉන්න ජීවිත කාලය' : 'The chapter you\'re living now'}</Text>
          </View>
          <View style={[styles.lockChip, { backgroundColor: 'rgba(167,139,250,0.18)', borderColor: 'rgba(167,139,250,0.44)' }]}>
            <Ionicons name="lock-closed" size={12} color="#A78BFA" />
          </View>
        </View>

        <View style={styles.lockDashaLadder}>
          {rows.map(function (p, i) {
            var barColor = p.isCurrent ? '#FFB800' : p.isPast ? 'rgba(255,255,255,0.14)' : 'rgba(167,139,250,0.45)';
            var op = p.isPast ? 0.4 : 1;
            return (
              <View key={i} style={[styles.lockDashaRow, p.isCurrent && styles.lockDashaRowCurrent]}>
                <Text style={[styles.lockDashaPlanet, { opacity: op, color: p.isCurrent ? '#FFB800' : '#E8DCC0' }]} numberOfLines={1}>{getKendaraPlanetName(p.planet, language)}</Text>
                <View style={styles.lockDashaBarTrack}>
                  <View style={[styles.lockDashaBarFill, { width: (p.isCurrent ? p.progress : p.isPast ? 100 : 0) + '%', backgroundColor: barColor }]} />
                </View>
                <Text style={[styles.lockDashaYears, { opacity: op }]}>{p.startYear}–{p.endYear}</Text>
              </View>
            );
          })}
        </View>

        <Text style={[styles.lockTease, si && styles.sinhalaTextFlow, { marginTop: 10 }]}>
          {current
            ? (si
              ? 'ඔබ දැන් ' + curPlanet + ' කාලයේ ' + (current.progress || 0) + '%ක් ගෙවලා. මේ කාලය ඔබෙන් ඉල්ලන දේ සහ ඉදිරි අතුරු කාල විවෘත කරන්න.'
              : 'You\'re ' + (current.progress || 0) + '% through your ' + curPlanet + ' chapter. Unlock what it asks of you — and the sub-periods ahead.')
            : (si ? 'ඔබේ දශා කාල රේඛාවේ සම්පූර්ණ කියවීම විවෘත කරන්න.' : 'Unlock the full reading of your dasha timeline.')}
        </Text>
      </SpringPressable>
    </Animated.View>
  );
}

export default function KendaraScreen() {
  const { t, language } = useLanguage();
  const { user, showPaywall, isSubscribed } = useAuth();
  const { colors, gradients, resolved } = useTheme();
  const sc = screenColors(colors);
  const router = useRouter();
  var isDesktop = useDesktopCtx();
  var insets = useScreenInsets();
  var reduced = useReducedMotion();
  var lowEnd = useLowEndDevice();

  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [marakaData, setMarakaData] = useState(null);
  const [marakaLoading, setMarakaLoading] = useState(false);
  const [expandedApala, setExpandedApala] = useState(null);
  const [jyotishData, setJyotishData] = useState(null);
  const [jyotishLoading, setJyotishLoading] = useState(false);
  const [selectedVarga, setSelectedVarga] = useState('d9');
  const [transit, setTransit] = useState(null);
  const [ritualState, setRitualState] = useState({ dayKey: getKendaraSLTDayKey(), streak: 1, totalViews: 1, viewedToday: false });
  
  const stepTimers = useRef([]);
  const lastFetchedBirth = useRef(null);
  const chartDataRef = useRef(null);
  const fetchingRef = useRef(false);
  const chartShareRef = useRef(null);
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
          // Lapsed-subscriber guard: the cache only ever holds the FULL chart
          // (previews are never cached). If it has full analysis but the user is
          // no longer subscribed, drop it and fall through to the fetch — which
          // 402s → preview, so the paywall reappears instead of the old full read.
          var cachedIsFull = !!(cached && cached.data && cached.data.advancedAnalysis);
          if (cachedIsFull && !isSubscribed) {
            await AsyncStorage.removeItem(CHART_CACHE_KEY).catch(function () {});
          } else if (cached && cached.birthDateTime === birthDateTime && cached.data) {
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
        // Not subscribed → show the free teaser (real chart + hero + one insight,
        // premium vaults locked). Never cache the preview, so a later upgrade
        // fetches the full chart cleanly.
        if (err && (err.statusCode === 402 || (err.message && /subscri/i.test(err.message)))) {
          try {
            clearStepTimers();
            setLoadingStep(5);
            var prev = await api.getKendaraPreview(birthDateTime, birthLat, birthLng, langRef.current);
            if (cancelled) return;
            if (prev && prev.success && prev.data) {
              setChartData(prev.data);
              chartDataRef.current = prev.data;
              lastFetchedBirth.current = birthDateTime;
              return;
            }
          } catch (_) { /* fall through to the error state */ }
        }
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
  }, [hasBirthData, birthDateTime, birthLat, birthLng, clearStepTimers, refreshKey, isSubscribed]);

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
        if (!cancelled && __DEV__) console.warn('Maraka Apala fetch error:', err.message);
      } finally {
        if (!cancelled) setMarakaLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [hasBirthData, birthDateTime, birthLat, birthLng, refreshKey]);

  // Fetch Jyotish advanced data (Dasha, Mangal Dosha, Sade Sati, Kundli)
  useEffect(() => {
    if (!hasBirthData || !birthDateTime) { setJyotishData(null); return; }
    var cancelled = false;
    (async () => {
      try {
        setJyotishLoading(true);
        var body = { birthDate: birthDateTime, lat: birthLat, lng: birthLng };
        var [dashaRes, mangalRes, sadeRes, chalitRes] = await Promise.all([
          api.getJyotishDasha(body).catch(function() { return null; }),
          api.getJyotishMangalDosha(body).catch(function() { return null; }),
          api.getJyotishSadeSati(body).catch(function() { return null; }),
          api.getJyotishChalit(body).catch(function() { return null; }),
        ]);
        if (cancelled) return;
        setJyotishData({
          dasha: dashaRes && dashaRes.success ? dashaRes.data : null,
          mangalDosha: mangalRes && mangalRes.success ? mangalRes.data : null,
          sadeSati: sadeRes && sadeRes.success ? sadeRes.data : null,
          chalit: chalitRes && chalitRes.success ? chalitRes.data : null,
        });
      } catch (err) {
        if (!cancelled && __DEV__) console.warn('Jyotish fetch error:', err.message);
      } finally {
        if (!cancelled) setJyotishLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [hasBirthData, birthDateTime, birthLat, birthLng, refreshKey]);

  useEffect(() => {
    if (!hasBirthData || !birthDateTime || !chartData) return;
    var cancelled = false;
    (async () => {
      var today = getKendaraSLTDayKey();
      var yesterday = getKendaraSLTDayKey(new Date(Date.now() - (24 * 60 * 60 * 1000)));
      var nextState = { dayKey: today, streak: 1, totalViews: 1, viewedToday: true, birthDateTime: birthDateTime };
      try {
        var raw = await AsyncStorage.getItem(KENDARA_RITUAL_KEY);
        var saved = raw ? JSON.parse(raw) : null;
        var sameChart = !!(saved && saved.birthDateTime === birthDateTime);
        var savedStreak = sameChart ? Number(saved.streak || 0) : 0;
        var savedViews = sameChart ? Number(saved.totalViews || 0) : 0;
        var savedDay = sameChart ? saved.dayKey : null;

        if (savedDay === today) {
          nextState = { dayKey: today, streak: Math.max(1, savedStreak), totalViews: Math.max(1, savedViews), viewedToday: true, birthDateTime: birthDateTime };
        } else {
          var nextStreak = savedDay === yesterday ? Math.max(1, savedStreak + 1) : 1;
          nextState = { dayKey: today, streak: nextStreak, totalViews: savedViews + 1, viewedToday: true, birthDateTime: birthDateTime };
          await AsyncStorage.setItem(KENDARA_RITUAL_KEY, JSON.stringify({ ...nextState, savedAt: Date.now() }));
        }
      } catch (_) {
        try { await AsyncStorage.setItem(KENDARA_RITUAL_KEY, JSON.stringify({ ...nextState, savedAt: Date.now() })); } catch (__) {}
      }
      if (!cancelled) setRitualState(nextState);
    })();
    return () => { cancelled = true; };
  }, [hasBirthData, birthDateTime, chartData]);

  // Capture the birth chart (with brand watermark) and share it as an image —
  // the viral loop: a shared kendara pulls new users into the funnel.
  const shareChart = useCallback(async () => {
    try {
      if (!chartShareRef.current) return;
      const uri = await captureRef(chartShareRef, { format: 'png', quality: 0.95 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: langRef.current === 'si' ? 'මගේ කේන්දරය' : 'My birth chart',
        });
      }
    } catch (_) { /* user cancelled or capture unsupported */ }
  }, []);

  // Daily transit ("what's moving today") — subscribers only; skip for the teaser.
  useEffect(() => {
    if (!hasBirthData || !birthDateTime || !chartData || chartData._preview) { setTransit(null); return; }
    var cancelled = false;
    api.getTransitToday(birthDateTime, birthLat, birthLng)
      .then(function (res) { if (!cancelled && res && res.success) setTransit(res.transit); })
      .catch(function () { /* transit is a bonus — never block the page */ });
    return () => { cancelled = true; };
  }, [hasBirthData, birthDateTime, birthLat, birthLng, chartData]);

  // Pull-to-refresh: clear caches and force the effect to re-run
  const onRefresh = useCallback(() => {
    if (fetchingRef.current) return;
    lastFetchedBirth.current = null;
    chartDataRef.current = null;
    AsyncStorage.removeItem(CHART_CACHE_KEY).catch(() => {});
    setChartData(null);
    setMarakaData(null);
    setJyotishData(null);
    setExpandedApala(null);
    setError(null);
    setRefreshKey(function (k) { return k + 1; });
  }, []);

  // Non-subscribers get the preview payload (chartData._preview === true), where
  // jyotishData is gated (null). Synthesize a minimal dasha from the preview's
  // vaultCounts so the hero + daily ritual can still name the current chapter
  // ("you're in your Moon period") — the deep timeline/reading stays Pro and is
  // shown as a locked teaser further down.
  const isPreview = !!(chartData && chartData._preview);
  var effectiveJyotish = jyotishData;
  if (isPreview && !jyotishData && chartData.vaultCounts && chartData.vaultCounts.currentDasha) {
    var _vc = chartData.vaultCounts;
    effectiveJyotish = {
      dasha: {
        currentMahadasha: { planet: _vc.currentDasha.planet },
        mahadashas: (_vc.dashaLadder || []).map(function (p) {
          return { planet: p.planet, start: p.startYear + '-01-01', endTime: p.endYear + '-01-01', durationYears: p.years };
        }),
      },
    };
  }

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
        { icon: 'globe-outline', text: 'සර්වර් එකට සම්බන්ධ වෙනවා...', key: 1 },
        { icon: 'planet-outline', text: 'ඔබේ ග්‍රහ පිහිටීම් කියවනවා...', key: 2 },
        { icon: 'language-outline', text: 'සිංහලට හරවනවා...', key: 3 },
        { icon: 'sparkles-outline', text: 'ජීවිත සිතියම ලෑස්ති කරනවා...', key: 4 },
        { icon: 'checkmark-circle-outline', text: 'ඔක්කොම ලෑස්තියි!', key: 5 },
      ] : [
        { icon: 'globe-outline', text: 'Connecting to server...', key: 1 },
        { icon: 'planet-outline', text: 'Reading birth energies...', key: 2 },
        { icon: 'telescope-outline', text: 'Finding life patterns...', key: 3 },
        { icon: 'sparkles-outline', text: 'Building your life map...', key: 4 },
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
              {'✦ ' + (t('kpPreparingChart') || 'Preparing Your Life Map') + ' ✦'}
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
    var seenYogaBadges = {};
    var topYogas = (chartData.advancedAnalysis?.tier1?.advancedYogas?.items || []).filter(function(y) {
      if (!(y.strength === 'Very Strong' || y.strength === 'Strong')) return false;
      var copy = getKendaraStrengthCopy(y, language);
      var badgeKey = (copy.label || y.category || y.name || '').toLowerCase();
      if (seenYogaBadges[badgeKey]) return false;
      seenYogaBadges[badgeKey] = true;
      return true;
    }).slice(0, 5);

    var summaryNakshatra = (chartData.panchanga && chartData.panchanga.nakshatra) || chartData.nakshatra;
    var summaryTithiName = (chartData.panchanga && chartData.panchanga.tithi && chartData.panchanga.tithi.name) || null;
    var chartSummaryItems = [
      {
        icon: 'compass-outline', color: '#FFB800',
        label: language === 'si' ? 'ලග්නයෙන් කියන දේ' : 'Your rising sign shows',
        value: getKendaraLifeStyle(chartData.lagna && (chartData.lagna.english || chartData.lagna.name || chartData.lagna.rashiId), language),
      },
      {
        icon: 'star-outline', color: '#60A5FA',
        label: language === 'si' ? 'නැකතෙන් කියන දේ' : 'Your birth star suggests',
        value: summaryNakshatra ? getKendaraBirthFocus(summaryNakshatra, language) : '--',
      },
      {
        icon: 'moon-outline', color: '#C7D2FE',
        label: language === 'si' ? 'සඳුගේ හිතේ රිද්මය' : 'Your Moon rhythm feels like',
        value: summaryTithiName ? getKendaraMoonRhythm(summaryTithiName, language) : '--',
      },
      {
        icon: 'heart-outline', color: '#F9A8D4',
        label: language === 'si' ? 'හිතයි හැඟීමුයි වැඩ කරන විදිහ' : 'Your emotional side leans toward',
        value: getKendaraLifeStyle(chartData.moonSign && (chartData.moonSign.english || chartData.moonSign.name || chartData.moonSign.rashiId), language),
      },
      {
        icon: 'sunny-outline', color: '#F59E0B',
        label: language === 'si' ? 'විශ්වාසය පෙන්වන විදිහ' : 'Your confidence expresses through',
        value: getKendaraLifeStyle(chartData.sunSign && (chartData.sunSign.english || chartData.sunSign.name || chartData.sunSign.rashiId), language),
      },
    ];
    var insightCards = buildKendaraInsightCards(chartData, jyotishData, topYogas, language);
    var masteryItems = buildKendaraMasteryItems(chartData, jyotishData, marakaData, selectedVarga, language, isPreview);
    // Ritual uses effectiveJyotish so free users see their real current chapter.
    var dailyRitual = buildKendaraDailyRitual(insightCards, chartData, effectiveJyotish, marakaData, ritualState, language);
    // Free-user yoga tease: one named badge + "+N locked" (real counts).
    var previewTopYoga = isPreview && chartData.vaultCounts ? chartData.vaultCounts.topYoga : null;
    var previewYogaTotal = isPreview && chartData.vaultCounts ? (chartData.vaultCounts.yogas || 0) : 0;

    return (
      <View style={styles.chartContainer}>
        {/* Daily hook stays on top (retention); the rest moves below the chart */}
        <PremiumDailyRitual ritual={dailyRitual} visitState={ritualState} language={language} reduced={reduced || lowEnd} />
        <TransitTodayStrip transit={transit} language={language} locked={isPreview} onUnlock={async function () { try { if (showPaywall) await showPaywall('kendara_transit'); } catch (_) {} onRefresh(); }} />

        <View style={styles.headerRow}>
          <Ionicons name="grid-outline" size={20} color="#FFB800" />
          <Text style={styles.sectionTitle}>
            {language === 'si' ? 'ඔබේ කේන්දර සිතියම' : 'Your Birth Life Map'}
          </Text>
          <SpringPressable onPress={shareChart} haptic="light">
            <View style={styles.sharePill}>
              <Ionicons name="share-social-outline" size={14} color="#FFB800" />
              <Text style={styles.sharePillText}>{language === 'si' ? 'බෙදාගන්න' : 'Share'}</Text>
            </View>
          </SpringPressable>
        </View>

        {/* Yoga badges — Pro shows all; free shows ONE named badge + "+N locked". */}
        {topYogas.length > 0 ? (
          <Animated.View entering={FadeIn.duration(600)} style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
            {topYogas.map(function (y, i) { return <YogaBadge key={i} name={y.name} category={y.category} language={language} />; })}
          </Animated.View>
        ) : (isPreview && previewTopYoga) ? (
          <Animated.View entering={FadeIn.duration(600)} style={styles.lockYogaRow}>
            <YogaBadge name={previewTopYoga.name} category={previewTopYoga.category} language={language} />
            {previewYogaTotal > 1 ? (
              <SpringPressable haptic="light" onPress={async function () { try { if (showPaywall) await showPaywall('kendara_yogas'); } catch (_) {} onRefresh(); }} style={styles.lockYogaMore}>
                <Ionicons name="lock-closed" size={11} color="#FFD666" />
                <Text style={styles.lockYogaMoreText}>{language === 'si' ? '+' + (previewYogaTotal - 1) + ' තව යෝග' : '+' + (previewYogaTotal - 1) + ' more'}</Text>
              </SpringPressable>
            ) : null}
          </Animated.View>
        ) : null}

        {/* Wrapped for image capture — the shared card carries the brand */}
        <ViewShot ref={chartShareRef} options={{ format: 'png', quality: 0.95 }} style={styles.chartShotWrap}>
          <PinchableView minScale={1} maxScale={2.5}>
            <ChartGlowAura lagnaColor={lagnaGlowColor} reduced={reduced} lowEnd={lowEnd}>
              <SriLankanChart
                rashiChart={chartData.rashiChart}
                lagnaRashiId={lagnaRashiId}
                language={language}
              />
            </ChartGlowAura>
          </PinchableView>
          <Text style={styles.shareWatermark}>✦ Grahachara · grahachara.com</Text>
        </ViewShot>

        <PremiumInsightRail insights={insightCards} language={language} />
        <KendaraMasteryStrip items={masteryItems} language={language} isPreview={isPreview} onUnlock={async function () { try { if (showPaywall) await showPaywall('kendara_mastery'); } catch (_) {} onRefresh(); }} />

        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>{language === 'si' ? 'කේන්දරේ සරලව' : 'Your Chart in Plain Language'}</Text>
          <Text style={styles.cardIntro}>
            {language === 'si'
              ? 'අමාරු වචන නැතුව, මේ ග්‍රහ පිහිටීම් ඔබේ ජීවිතයට බලපාන විදිහ මෙතනින් සරලව තේරුම් ගන්න පුළුවන්.'
              : 'A simple read of what the main chart points mean in everyday life.'}
          </Text>
          {chartSummaryItems.map(function (item, i) {
            return (
              <View key={i} style={styles.summaryItem}>
                <View style={[styles.summaryIcon, { borderColor: item.color + '35', backgroundColor: item.color + '10' }]}>
                  <Ionicons name={item.icon} size={15} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                  {isPreview && i > 0
                    ? <LockedValueChip language={language} onPress={async function () { try { if (showPaywall) await showPaywall('kendara_reading'); } catch (_) {} onRefresh(); }} />
                    : <Text style={styles.summaryValue}>{item.value}</Text>}
                </View>
              </View>
            );
          })}
          {isPreview ? (
            <Text style={styles.lockReadingHint}>
              {language === 'si' ? '🔒 මුල් පේළිය නොමිලේ — ඉතිරි කියවීම් Pro වලින් විවෘත වේ' : '🔒 First line is free — unlock the rest with Pro'}
            </Text>
          ) : null}
        </View>

        <View style={[styles.detailsCard, { marginTop: 14 }]}>
          <Text style={styles.cardTitle}>
            {language === 'si' ? 'උපන් වෙලාවේ ග්‍රහ පිහිටීම්' : 'Birth Planet Placements'}
          </Text>
          <Text style={styles.cardIntro}>
            {language === 'si'
              ? 'ග්‍රහයන්ගෙන් පෙන්වන්නේ ඔබේ ජීවිතේ එක එක කොටස්. ඔවුන් ඉන්න තැන් අනුව ඒ දේවල් ඔබේ ජීවිතේට බලපාන විදිහ මෙතනින් බලාගන්න පුළුවන්.'
              : 'Each planet represents a different part of your personality. Its sign and house show how that energy plays out in your daily life.'}
          </Text>
          {chartData.rashiChart && chartData.rashiChart.map(function(entry) {
            if (!entry.planets || entry.planets.length === 0) return null;
            return entry.planets
              .filter(function(p) { return p.name !== 'Lagna' && p.name !== 'Ascendant'; })
              .map(function(p, idx) {
                var info = PLANET_INFO[p.name];
                var pLabel = getKendaraCoreEnergy(p.name, language);
                var pColor = info ? info.color : '#fff';
                var rashiLabel = language === 'si'
                  ? (RASHI_SI[entry.rashiId] || entry.rashi)
                  : (entry.rashiEnglish || entry.rashi);
                var placement = getKendaraLifeStyle(rashiLabel, language);
                var placementHouse = getKendaraHouseNumber(entry.rashiId, lagnaRashiId);
                var placementDetail = getKendaraPlanetPlacementDetail(p, rashiLabel, placementHouse, language, chartData.advancedAnalysis?.tier2?.shadbala);
                return (
                  <View key={entry.rashiId + '-' + idx} style={styles.planetRow}>
                    <View style={[styles.planetDot, { backgroundColor: pColor }]} />
                    <View style={styles.planetTextWrap}>
                      <View style={styles.planetTopLine}>
                        <Text style={[styles.planetName, { color: pColor }]}>{pLabel}</Text>
                        <Text style={styles.planetDegree}>{formatDegree(p.degree)}</Text>
                      </View>
                      <Text style={styles.planetRashi}>{placement}</Text>
                      {isPreview && p.name !== 'Sun' && p.name !== 'Moon' && p.name !== 'Surya' && p.name !== 'Chandra'
                        ? <LockedValueChip language={language} label={language === 'si' ? 'මේ ග්‍රහයා ඔබට කියන දේ' : 'What this means for you'} onPress={async function () { try { if (showPaywall) await showPaywall('kendara_placements'); } catch (_) {} onRefresh(); }} />
                        : <Text style={styles.planetPersonalNote}>{placementDetail}</Text>}
                      <View style={styles.planetBarTrack}>
                        <View style={[styles.planetBarFill, { backgroundColor: pColor, width: (30 + ((p.degree != null ? p.degree : 15) / 30) * 60) + '%' }]} />
                      </View>
                    </View>
                  </View>
                );
              });
          })}
        </View>

        {isPreview ? (
          <LockedChartPanel
            title={t('kpNavamsaChart') || 'Relationship & Inner Self Chart'}
            icon="heart-outline"
            accent="#F472B6"
            tease={language === 'si'
              ? 'ඔබේ විවාහ කේන්දරය (නවාංශකය) සූදානම් — සිකුරු ඉන්න තැන සහ බැඳීම් හැඩගැහෙන විදිහ ඇතුළත.'
              : 'Your marriage chart (navamsa) is ready — see where Venus sits and how your bonds are shaped.'}
            source="kendara_d9"
            showPaywall={showPaywall}
            onUnlocked={onRefresh}
            language={language}
          />
        ) : (chartData.navamsaChart || chartData.navamshaChart) ? (
          <View style={{ marginTop: 20 }}>
            <View style={styles.headerRow}>
              <Ionicons name="apps-outline" size={20} color="#FFB800" />
              <Text style={styles.sectionTitle}>
                {t('kpNavamsaChart') || 'Relationship & Inner Self Chart'}
              </Text>
            </View>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <PinchableView minScale={1} maxScale={2.5}>
                <ChartGlowAura lagnaColor="#A78BFA" reduced={reduced} lowEnd={lowEnd}>
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
              <PremiumVaultSection
                icon="sparkles-outline"
                color="#FF8C00"
                eyebrow={language === 'si' ? 'ප්‍රධාන කියවීම' : 'Primary Reading'}
                title={t('kpChartAtGlance') || 'Your Chart Summary'}
                summary={fullKendaraCopy(cleanKendaraExplanation(chartData.chartExplanations.overall, language))}
                defaultOpen={true}
                delay={150}
                language={language}
              >
                <View style={[styles.advCard, { borderColor: 'rgba(255,140,0,0.25)', marginBottom: 12 }]}>
                  <LinearGradient colors={['rgba(255,140,0,0.12)', 'rgba(255,184,0,0.06)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                    <Ionicons name="sparkles" size={20} color="#FF8C00" />
                    <Text style={{ color: '#FF8C00', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 }}>
                      {'✨ ' + (t('kpChartAtGlance') || 'Your Chart Summary')}
                    </Text>
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 22, fontStyle: 'italic' }}>
                    {cleanKendaraExplanation(chartData.chartExplanations.overall, language)}
                  </Text>
                </View>
              </PremiumVaultSection>
            )}

            {/* ── DOSHAS ── */}
            {chartData.advancedAnalysis.tier1?.doshas?.items?.length > 0 && (
              <PremiumVaultSection
                icon="alert-circle-outline"
                color="#F87171"
                eyebrow={language === 'si' ? 'ආරක්ෂිත කියවීම' : 'Care Reading'}
                title={language === 'si' ? 'අවධානය දෙන්න ඕන තැන්' : 'Care Points to Review'}
                summary={language === 'si' ? 'සම්බන්ධතා, තීරණ, සහ ඉවසීම ගැන වැඩි අවධානයක් දිය යුතු තැන් එකතු කරලා.' : 'Relationship, patience, and decision areas that deserve a closer look.'}
                count={chartData.advancedAnalysis.tier1.doshas.items.length}
                defaultOpen={chartData.advancedAnalysis.tier1.doshas.items.some(function (d) { return d.severity === 'Severe'; })}
                delay={200}
                language={language}
              >
                <View style={styles.advCard}>
                  {chartData.advancedAnalysis.tier1.doshas.items.map(function(d, i) {
                    var sevColor = d.severity === 'Severe' ? '#ef4444' : d.severity === 'Moderate' ? '#f59e0b' : '#10b981';
                    var sevLabel = language === 'si'
                      ? (d.severity === 'Severe' ? 'ගොඩක් කල්පනාවෙන් ඉන්න' : d.severity === 'Moderate' ? 'ටිකක් අවධානය දෙන්න' : 'සාමාන්‍ය විදිහට ඉන්න')
                      : (d.severity === 'Severe' ? 'Extra Care' : d.severity === 'Moderate' ? 'Moderate Care' : 'Light Care');
                    var challenge = getKendaraChallengeCopy(d, language);
                    var issue = getKendaraIssueCopy(d, language);
                    var cancelCopy = d.cancelled ? getKendaraCancellationCopy(d, language) : null;
                    return (
                      <View key={i} style={styles.doshaRow}>
                        <View style={[styles.doshaDot, { backgroundColor: d.cancelled ? '#6b7280' : sevColor }]} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                            <Text style={styles.doshaName}>{issue.name}</Text>
                            {d.cancelled ? (
                              <View style={styles.cancelBadge}>
                                <Text style={styles.cancelText}>{language === 'si' ? 'බලපෑම අඩුයි' : 'SOFTENED'}</Text>
                              </View>
                            ) : (
                              <View style={[styles.sevBadge, { backgroundColor: sevColor + '20', borderColor: sevColor + '50' }]}>
                                <Text style={[styles.sevText, { color: sevColor }]}>{sevLabel}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.doshaMeta}>{language === 'si' ? 'කරුණ: ' : 'Calculated issue: '}{issue.technical}</Text>
                          <Text style={styles.doshaIssueMeaning}>{issue.meaning}</Text>
                          <Text style={styles.doshaGuidanceTitle}>{challenge.label}</Text>
                          <Text style={styles.doshaDesc}>{challenge.desc}</Text>
                          {cancelCopy ? (
                            <View style={styles.cancelInfoBox}>
                              <Text style={styles.cancelInfoLabel}>{language === 'si' ? 'බලපෑම අඩු වුණේ ඇයි?' : 'Why it is softened'}</Text>
                              <Text style={styles.cancelInfoText}>{cancelCopy}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </PremiumVaultSection>
            )}

            {/* Dosha AI explanation */}
            {chartData.chartExplanations?.doshas && chartData.chartExplanations.doshas !== 'N/A' && (
              <PremiumAiNote text={chartData.chartExplanations.doshas} language={language} />
            )}

            {/* ── ADVANCED YOGAS ── */}
            {chartData.advancedAnalysis.tier1?.advancedYogas?.items?.length > 0 && (
              <PremiumVaultSection
                icon="star-outline"
                color="#FFB800"
                eyebrow={language === 'si' ? 'ශක්ති භණ්ඩාගාරය' : 'Strength Vault'}
                title={t('kpYogaTitle') || 'Your Natural Strengths & Talents'}
                summary={language === 'si' ? 'ඔබේ කේන්දරේ වැඩිපුරම දීප්තිමත් වෙන සහජ හැකියා මෙතනින් බලන්න.' : 'The strongest talent patterns and fortunate combinations in your chart.'}
                count={chartData.advancedAnalysis.tier1.advancedYogas.found}
                defaultOpen={true}
                delay={300}
                language={language}
              >
                <View style={styles.advCard}>
                  {chartData.advancedAnalysis.tier1.advancedYogas.items.map(function(y, i) {
                    var catColor = y.category === 'Raja Yoga' ? '#FF8C00' : y.category === 'Dhana Yoga' ? '#FFB800' : y.category?.includes('Dosha') ? '#f87171' : '#60a5fa';
                    var strColor = y.strength === 'Very Strong' ? '#10b981' : y.strength === 'Strong' ? '#34d399' : '#6b7280';
                    var strLabel = y.strength === 'Very Strong' ? t('kpVeryStrong') : y.strength === 'Strong' ? t('kpStrong') : t('kpModerate');
                    var copy = getKendaraStrengthCopy(y, language);
                    var catLabel = getKendaraStrengthCategoryLabel(y.category, language);
                    return (
                      <View key={i} style={styles.yogaItem}>
                        <View style={styles.yogaTop}>
                          <View style={[styles.catDot, { backgroundColor: catColor }]} />
                          <Text style={styles.yogaName}>{copy.label}</Text>
                          <View style={[styles.strBadge, { borderColor: strColor + '60' }]}>
                            <Text style={[styles.strText, { color: strColor }]}>{strLabel || y.strength}</Text>
                          </View>
                        </View>
                        {catLabel !== copy.label && <Text style={styles.yogaCat}>{catLabel}</Text>}
                        <Text style={styles.yogaDesc}>{copy.desc}</Text>
                      </View>
                    );
                  })}
                </View>
              </PremiumVaultSection>
            )}

            {/* Yoga AI explanation */}
            {chartData.chartExplanations?.yogas && chartData.chartExplanations.yogas !== 'N/A' && (
              <PremiumAiNote text={chartData.chartExplanations.yogas} language={language} />
            )}

            {/* ── JAIMINI KARAKAS ── */}
            {chartData.advancedAnalysis.tier1?.jaimini && (
              <PremiumVaultSection
                icon="compass-outline"
                color="#FF8C00"
                eyebrow={language === 'si' ? 'අරමුණු කියවීම' : 'Purpose Reading'}
                title={t('kpJaiminiTitle') || 'Your Life Direction'}
                summary={language === 'si' ? 'අභ්‍යන්තර අරමුණ, අන් අයට පෙනෙන විදිහ, සහ බැඳීම් රටාව සරලව.' : 'Your inner purpose, public image, and commitment pattern in one focused read.'}
                defaultOpen={false}
                delay={400}
                language={language}
              >
                <View style={styles.advCard}>
                  {chartData.advancedAnalysis.tier1.jaimini.atmakaraka && (
                    <View style={styles.jaiminiHighlight}>
                      <LinearGradient colors={['rgba(255,140,0,0.12)', 'rgba(255,140,0,0.03)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                      <Text style={styles.jaiminiLabel}>{t('kpSoulPlanet') || 'Your Core Energy'}</Text>
                      <Text style={styles.jaiminiValue}>{(() => { var p = chartData.advancedAnalysis.tier1.jaimini.atmakaraka.planet || ''; return getKendaraCoreEnergy(p, language); })()}</Text>
                      {chartData.advancedAnalysis.tier1.jaimini.karakas && (
                        <Text style={styles.jaiminiSub}>
                          {language === 'si' ? 'ඔබේ අභ්‍යන්තර අරමුණ, වගකීම්, සහ වැඩ කරන රටාව මේකෙන් සරලව තේරුම් ගන්න පුළුවන්.' : 'This summarizes your inner purpose, responsibilities, and expression style.'}
                        </Text>
                      )}
                    </View>
                  )}
                  <View style={styles.jaiminiGrid}>
                    {chartData.advancedAnalysis.tier1.jaimini.karakamsha && (
                      <View style={styles.jaiminiMini}>
                        <Text style={styles.jmLabel}>{t('kpKarakamshaLabel') || 'Life\'s Calling'}</Text>
                        <Text style={styles.jmValue}>{getKendaraLifeStyle(chartData.advancedAnalysis.tier1.jaimini.karakamsha.rashi, language)}</Text>
                        {chartData.advancedAnalysis.tier1.jaimini.karakamsha.themes && (
                          <Text style={styles.jmDesc}>{language === 'si' ? ((chartData.advancedAnalysis.tier1.jaimini.karakamsha.themes.desireSi || chartData.advancedAnalysis.tier1.jaimini.karakamsha.themes.desire) + ' — ' + (chartData.advancedAnalysis.tier1.jaimini.karakamsha.themes.archetypeSi || chartData.advancedAnalysis.tier1.jaimini.karakamsha.themes.archetype)) : (chartData.advancedAnalysis.tier1.jaimini.karakamsha.themes.desire + ' — ' + chartData.advancedAnalysis.tier1.jaimini.karakamsha.themes.archetype)}</Text>
                        )}
                      </View>
                    )}
                    {chartData.advancedAnalysis.tier1.jaimini.arudhaLagna && (
                      <View style={styles.jaiminiMini}>
                        <Text style={styles.jmLabel}>{t('kpArudhaLabel') || 'How Others See You'}</Text>
                        <Text style={styles.jmValue}>{getKendaraLifeStyle(chartData.advancedAnalysis.tier1.jaimini.arudhaLagna.rashi, language)}</Text>
                      </View>
                    )}
                    {chartData.advancedAnalysis.tier1.jaimini.upapadaLagna && (
                      <View style={styles.jaiminiMini}>
                        <Text style={styles.jmLabel}>{t('kpUpapadaLabel') || 'Commitment Style'}</Text>
                        <Text style={styles.jmValue}>{getKendaraLifeStyle(chartData.advancedAnalysis.tier1.jaimini.upapadaLagna.rashi, language)}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </PremiumVaultSection>
            )}

            {/* Soul Purpose AI explanation */}
            {chartData.chartExplanations?.soulPurpose && chartData.chartExplanations.soulPurpose !== 'N/A' && (
              <PremiumAiNote text={chartData.chartExplanations.soulPurpose} language={language} />
            )}

            {/* ── SHADBALA ── */}
            {chartData.advancedAnalysis.tier2?.shadbala && typeof chartData.advancedAnalysis.tier2.shadbala === 'object' && (
              <PremiumVaultSection
                icon="bar-chart-outline"
                color="#60A5FA"
                eyebrow={language === 'si' ? 'ග්‍රහ බල මීටරය' : 'Planet Power'}
                title={t('kpShadbalaTitle') || 'Your Energy Support Levels'}
                summary={language === 'si' ? 'කොච්චර ශක්තිමත් ලෙස එක් එක් ග්‍රහ ශක්තිය ඔබට සහාය දෙනවද කියන මැනීම.' : 'A clean strength meter for how each planet supports real-life progress.'}
                count={Object.values(chartData.advancedAnalysis.tier2.shadbala).length}
                defaultOpen={false}
                delay={500}
                language={language}
              >
                <Text style={{ color: 'rgba(255,214,102,0.6)', fontSize: 13, marginBottom: 12, lineHeight: 20 }}>
                  {language === 'si' ? 'ඔබේ ජීවිතේ විවිධ පැති වලට මේ ශක්තීන් කොච්චර උදව් වෙනවද කියලා මෙතනින් පෙන්වනවා.' : 'Shows how strongly each part of your birth pattern supports real-life progress.'}
                </Text>
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
                            {getKendaraPlanetName(sb.name, language)}
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
                        <Text style={styles.sbNote}>{getKendaraShadbalaPersonalDetail(sb, language)}</Text>
                      </View>
                    );
                  })}
                </View>
              </PremiumVaultSection>
            )}

            {/* Planet Power AI explanation */}
            {chartData.chartExplanations?.planetPower && chartData.chartExplanations.planetPower !== 'N/A' && (
              <PremiumAiNote text={chartData.chartExplanations.planetPower} language={language} />
            )}

            {/* ── BHRIGU BINDU ── */}
            {chartData.advancedAnalysis.tier2?.bhriguBindu && (
              <PremiumVaultSection
                icon="locate-outline"
                color="#06B6D4"
                eyebrow={language === 'si' ? 'දෛව ලක්ෂ්‍යය' : 'Destiny Marker'}
                title={t('kpBhriguTitle') || 'Your Destiny Point'}
                summary={trimKendaraBhriguPersonalDetail(chartData.advancedAnalysis.tier2.bhriguBindu, language)}
                defaultOpen={false}
                delay={600}
                language={language}
              >
                <Text style={{ color: 'rgba(255,214,102,0.6)', fontSize: 13, marginBottom: 12, lineHeight: 20 }}>
                  {language === 'si' ? 'ඔබේ වර්ධනයට අවශ්‍ය අවස්ථා සහ ජීවිත අරමුණු වැඩිපුරම ක්‍රියාත්මක වෙන තැන මෙතනින් බලන්න පුළුවන්.' : 'Shows the life area where growth, opportunity, and purpose tend to activate strongly.'}
                </Text>
                <View style={[styles.advCard, { borderColor: 'rgba(255,184,0,0.15)' }]}>
                  <LinearGradient colors={['rgba(255,184,0,0.08)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <View style={styles.bbCircle}>
                      <Text style={styles.bbDeg}>{Number(chartData.advancedAnalysis.tier2.bhriguBindu.degree || 0).toFixed(1)}°</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bbRashi}>{getKendaraLifeStyle(chartData.advancedAnalysis.tier2.bhriguBindu.rashi, language)}</Text>
                      <Text style={styles.bbNak}>{getKendaraBirthFocus(chartData.advancedAnalysis.tier2.bhriguBindu.nakshatra, language)}</Text>
                    </View>
                  </View>
                  {chartData.advancedAnalysis.tier2.bhriguBindu.interpretation && (
                    <Text style={styles.bbInterp}>{cleanKendaraExplanation(language === 'si' ? (chartData.advancedAnalysis.tier2.bhriguBindu.interpretationSi || chartData.advancedAnalysis.tier2.bhriguBindu.interpretation) : chartData.advancedAnalysis.tier2.bhriguBindu.interpretation, language)}</Text>
                  )}
                  <Text style={styles.bbPersonalNote}>{getKendaraBhriguPersonalDetail(chartData.advancedAnalysis.tier2.bhriguBindu, language)}</Text>
                </View>
              </PremiumVaultSection>
            )}

            {/* Destiny Point AI explanation */}
            {chartData.chartExplanations?.destinyPoint && chartData.chartExplanations.destinyPoint !== 'N/A' && (
              <PremiumAiNote text={chartData.chartExplanations.destinyPoint} language={language} />
            )}

            {/* ── PAST LIFE ── */}
            {chartData.advancedAnalysis.tier3?.pastLife && (
              <PremiumVaultSection
                icon="time-outline"
                color="#A78BFA"
                eyebrow={language === 'si' ? 'ගැඹුරු රටා' : 'Deep Patterns'}
                title={t('kpPastLifeTitle') || 'Your Deeper Patterns'}
                summary={language === 'si' ? 'පුරුදු රටා, වර්ධන දිශාව, සහ ස්වාභාවික ශක්ති එක තැනකට.' : 'Old tendencies, growth direction, and natural strengths gathered into one layer.'}
                defaultOpen={false}
                delay={700}
                language={language}
              >
                <Text style={{ color: 'rgba(255,214,102,0.6)', fontSize: 13, marginBottom: 12, lineHeight: 20 }}>
                  {language === 'si' ? 'ඔබට පුරුදු දේවල් සහ දැන් දියුණු වෙන්න හොඳම දිශාව මෙතනින් පෙන්වනවා.' : 'Shows familiar old patterns and the healthier direction for growth now.'}
                </Text>
                <View style={[styles.advCard, { borderColor: 'rgba(167,139,250,0.15)' }]}>
                  <LinearGradient colors={['rgba(167,139,250,0.08)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
                  {chartData.advancedAnalysis.tier3.pastLife.pastLife?.ketuThemes && (
                    <View style={styles.plRow}>
                      <Text style={styles.plLabel}>{t('kpPastLifeStory') || 'Core Tendencies'}</Text>
                      <Text style={styles.plValue}>
                        {language === 'si' ? (chartData.advancedAnalysis.tier3.pastLife.pastLife.ketuThemes.domainSi || chartData.advancedAnalysis.tier3.pastLife.pastLife.ketuThemes.domain) : `${chartData.advancedAnalysis.tier3.pastLife.pastLife.ketuThemes.archetype} — ${chartData.advancedAnalysis.tier3.pastLife.pastLife.ketuThemes.domain}`}
                      </Text>
                      <Text style={styles.plIndicator}>{getKendaraKetuPatternDetail(chartData.advancedAnalysis.tier3.pastLife, language)}</Text>
                    </View>
                  )}
                  {chartData.advancedAnalysis.tier3.pastLife.currentLifeDirection?.rahuThemes && (
                    <View style={styles.plRow}>
                      <Text style={styles.plLabel}>{t('kpLifeDirection') || 'Growth Direction'}</Text>
                      <Text style={styles.plValue}>
                        {language === 'si' ? (chartData.advancedAnalysis.tier3.pastLife.currentLifeDirection.rahuThemes.growthSi || chartData.advancedAnalysis.tier3.pastLife.currentLifeDirection.rahuThemes.growth) : chartData.advancedAnalysis.tier3.pastLife.currentLifeDirection.rahuThemes.growth}
                      </Text>
                      <Text style={styles.plIndicator}>{getKendaraRahuDirectionDetail(chartData.advancedAnalysis.tier3.pastLife, language)}</Text>
                    </View>
                  )}
                  {chartData.advancedAnalysis.tier3.pastLife.karmaBalance && (
                    <View style={styles.plRow}>
                      <Text style={styles.plLabel}>{t('kpKarmaBalance') || 'Life Balance'}</Text>
                      <Text style={styles.plValue}>
                        {t('kpGood') || 'Good'}: {chartData.advancedAnalysis.tier3.pastLife.karmaBalance.good || 0}
                        {'  •  '}
                        {t('kpChallenging') || 'Challenging'}: {chartData.advancedAnalysis.tier3.pastLife.karmaBalance.challenging || 0}
                      </Text>
                      <Text style={styles.plIndicator}>{getKendaraKarmaBalanceDetail(chartData.advancedAnalysis.tier3.pastLife, language)}</Text>
                    </View>
                  )}
                  {chartData.advancedAnalysis.tier3.pastLife.pastLifeMerit?.assessment && (
                    <View style={styles.plRow}>
                      <Text style={styles.plLabel}>{t('kpPastLifeMerit') || 'Inherent Strengths'}</Text>
                      <Text style={styles.plValue}>{language === 'si' ? ({ 'highly_meritorious': 'ඉහළ ස්වභාවික ශක්ති', 'karmic_debts': 'වර්ධනය කළ යුතු ක්ෂේත්‍ර', 'mixed': 'සමබර' }[chartData.advancedAnalysis.tier3.pastLife.pastLifeMerit.assessment] || chartData.advancedAnalysis.tier3.pastLife.pastLifeMerit.assessment) : ({ 'highly_meritorious': 'Strong Natural Abilities', 'karmic_debts': 'Areas for Growth', 'mixed': 'Balanced' }[chartData.advancedAnalysis.tier3.pastLife.pastLifeMerit.assessment] || chartData.advancedAnalysis.tier3.pastLife.pastLifeMerit.assessment)}</Text>
                      <Text style={styles.plIndicator}>{getKendaraMeritDetail(chartData.advancedAnalysis.tier3.pastLife, language)}</Text>
                    </View>
                  )}
                </View>
              </PremiumVaultSection>
            )}

            {/* Past Life AI explanation */}
            {chartData.chartExplanations?.pastLife && chartData.chartExplanations.pastLife !== 'N/A' && (
              <PremiumAiNote text={chartData.chartExplanations.pastLife} language={language} />
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* ═══ JYOTISH ADVANCED ANALYSIS SECTIONS ═══     */}
            {/* ═══════════════════════════════════════════════ */}

            {/* ── DASHA TIMELINE ── */}
            {jyotishData?.dasha && (
              <PremiumVaultSection
                icon="git-branch-outline"
                color="#A78BFA"
                eyebrow={language === 'si' ? 'දැනට ක්‍රියාත්මක කාලය' : 'Active Chapter'}
                title={language === 'si' ? 'ජීවිතයේ මේ කාලේ බලපාන ශක්තිය' : 'Your Current Life Timeline'}
                summary={fullKendaraCopy(getKendaraDashaPersonalNote(jyotishData.dasha, language, chartData.advancedAnalysis?.tier2?.shadbala))}
                count={(jyotishData.dasha.mahadashas || []).length}
                defaultOpen={true}
                delay={820}
                language={language}
              >
                <Text style={{ color: 'rgba(255,214,102,0.6)', fontSize: 13, marginBottom: 12, lineHeight: 20 }}>
                  {language === 'si' ? 'ඔබේ ජීවිතේ එක් එක් කාලයට වැඩිපුරම බලපාන ග්‍රහ ශක්තිය මෙතනින් බලන්න පුළුවන්.' : 'Shows which planet energy is most active in each chapter of your life.'}
                </Text>
                <View style={[styles.advCard, { borderColor: 'rgba(167,139,250,0.18)' }]}>
                  <LinearGradient colors={['rgba(167,139,250,0.08)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

                  {/* Current Period Highlight */}
                  {jyotishData.dasha.currentMahadasha && (
                    <View style={kj.currentDashaBox}>
                      <LinearGradient colors={['rgba(255,140,0,0.12)', 'rgba(255,184,0,0.04)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                      <View style={kj.currentDashaHeader}>
                        <View style={kj.currentDashaDot} />
                        <Text style={kj.currentDashaLabel}>{language === 'si' ? 'දැනට ක්‍රියාත්මක වෙන කාල ශක්තිය' : 'Current Active Period'}</Text>
                      </View>
                      <Text style={kj.currentDashaPlanet}>
                        {language === 'si' ? (PLANET_INFO[jyotishData.dasha.currentMahadasha.planet]?.si || jyotishData.dasha.currentMahadasha.planet || '--') : (jyotishData.dasha.currentMahadasha.planet || '--')}
                        {jyotishData.dasha.currentAntardasha ? ' → ' + (language === 'si' ? (PLANET_INFO[jyotishData.dasha.currentAntardasha.planet]?.si || jyotishData.dasha.currentAntardasha.planet) : jyotishData.dasha.currentAntardasha.planet) : ''}
                      </Text>
                      {jyotishData.dasha.currentPratyantar && (
                        <Text style={kj.currentDashaSub}>
                          {language === 'si' ? 'අතුරු කාලය නම්: ' : 'Sub: '}{language === 'si' ? (PLANET_INFO[jyotishData.dasha.currentPratyantar.planet]?.si || jyotishData.dasha.currentPratyantar.planet) : jyotishData.dasha.currentPratyantar.planet}
                        </Text>
                      )}
                      <Text style={kj.currentDashaNote}>{getKendaraDashaPersonalNote(jyotishData.dasha, language, chartData.advancedAnalysis?.tier2?.shadbala)}</Text>
                    </View>
                  )}

                  {/* Timeline bars */}
                  {(jyotishData.dasha.mahadashas || []).map(function (md, i) {
                    var now = new Date();
                    var start = new Date(md.startTime || md.start);
                    var end = new Date(md.endTime || md.end);
                    var totalMs = end - start;
                    var elapsedMs = Math.max(0, Math.min(now - start, totalMs));
                    var progress = totalMs > 0 ? Math.round((elapsedMs / totalMs) * 100) : 0;
                    var isCurrent = now >= start && now <= end;
                    var isPast = now > end;
                    var barColor = isCurrent ? '#FFB800' : isPast ? 'rgba(255,255,255,0.15)' : 'rgba(167,139,250,0.50)';
                    var textOp = isPast ? 0.35 : 1;
                    var years = md.durationYears ? parseFloat(md.durationYears).toFixed(0) : Math.round((end - start) / (365.25 * 24 * 60 * 60 * 1000));
                    return (
                      <View key={i} style={[kj.dashaRow, isCurrent && kj.dashaRowCurrent]}>
                        <View style={kj.dashaLeft}>
                          <Text style={[kj.dashaPlanet, { opacity: textOp, color: isCurrent ? '#FFB800' : '#FFE8B0' }]}>{language === 'si' ? (PLANET_INFO[md.planet]?.si || md.planet) : md.planet}</Text>
                          <Text style={[kj.dashaYears, { opacity: textOp }]}>{years}{language === 'si' ? ' අවු' : 'y'}</Text>
                        </View>
                        <View style={kj.dashaBarWrap}>
                          <View style={kj.dashaBarTrack}>
                            <View style={[kj.dashaBarFill, { width: (isCurrent ? progress : isPast ? 100 : 0) + '%', backgroundColor: barColor }]} />
                          </View>
                          <Text style={[kj.dashaDate, { opacity: textOp }]}>
                            {start.getFullYear()} — {end.getFullYear()}
                          </Text>
                        </View>
                        {isCurrent && <View style={kj.dashaLive} />}
                      </View>
                    );
                  })}
                </View>
                <KendaraAskLink router={router} language={language}
                  label={language === 'si' ? 'මේ දශා කාලය ගැන අහන්න' : 'Ask about this period'}
                  prefill={language === 'si'
                    ? ('මම දැන් ' + (jyotishData.dasha.currentMahadasha ? (PLANET_INFO[jyotishData.dasha.currentMahadasha.planet]?.si || jyotishData.dasha.currentMahadasha.planet) : '') + ' දශාවේ ඉන්නවා. මේ කාලය මට කියන්නේ මොකක්ද?')
                    : ('I\'m in my ' + (jyotishData.dasha.currentMahadasha ? jyotishData.dasha.currentMahadasha.planet : '') + ' dasha period now. What does this chapter mean for me?')} />
              </PremiumVaultSection>
            )}

            {/* ── MANGAL DOSHA ── */}
            {jyotishData?.mangalDosha && (
              <PremiumVaultSection
                icon="flame-outline"
                color={jyotishData.mangalDosha.hasDosha ? '#F87171' : '#34D399'}
                eyebrow={language === 'si' ? 'සබඳතා පරීක්ෂාව' : 'Relationship Check'}
                title={language === 'si' ? 'සබඳතා වලට කුජගෙන් එන බලපෑම' : 'Mars Influence in Relationships'}
                summary={jyotishData.mangalDosha.hasDosha ? (language === 'si' ? 'කුජ ශක්තිය සබඳතා වලදී වැඩි ඉවසීමක් ඉල්ලන තැනක් පෙන්වනවා.' : 'Mars asks for extra patience and maturity in long-term relationships.') : (language === 'si' ? 'කුජගෙන් විශේෂ පීඩනයක් පෙනෙන්නේ නැහැ.' : 'Mars is not showing a major relationship pressure signal.')}
                defaultOpen={false}
                delay={860}
                language={language}
              >
                <Text style={{ color: 'rgba(255,214,102,0.6)', fontSize: 13, marginBottom: 12, lineHeight: 20 }}>
                  {language === 'si' ? 'සබඳතා සහ විවාහය ගැන කුජ ග්‍රහයාගෙන් පෙන්වන විස්තර මෙතනින් බලන්න.' : 'Shows whether Mars asks for extra patience in marriage and long-term relationships.'}
                </Text>
                <View style={[styles.advCard, {
                  borderColor: jyotishData.mangalDosha.hasDosha
                    ? (jyotishData.mangalDosha.isHigh ? 'rgba(239,68,68,0.30)' : 'rgba(245,158,11,0.25)')
                    : 'rgba(52,211,153,0.20)',
                  overflow: 'hidden',
                }]}>
                  <LinearGradient
                    colors={jyotishData.mangalDosha.hasDosha
                      ? ['rgba(239,68,68,0.08)', 'transparent']
                      : ['rgba(52,211,153,0.08)', 'transparent']}
                    style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={[kj.doshaOrb, {
                      backgroundColor: jyotishData.mangalDosha.hasDosha ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.15)',
                      borderColor: jyotishData.mangalDosha.hasDosha ? 'rgba(239,68,68,0.35)' : 'rgba(52,211,153,0.35)',
                    }]}>
                      <Ionicons
                        name={jyotishData.mangalDosha.hasDosha ? 'flame' : 'shield-checkmark'}
                        size={26}
                        color={jyotishData.mangalDosha.hasDosha ? '#EF4444' : '#34D399'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[kj.doshaStatus, {
                        color: jyotishData.mangalDosha.hasDosha ? '#F87171' : '#34D399',
                      }]}>
                        {jyotishData.mangalDosha.hasDosha
                          ? (jyotishData.mangalDosha.isHigh
                            ? (language === 'si' ? '🔴 සබඳතා වලදී වැඩි ඉවසීමක් අවශ්‍යයි' : '🔴 Strong Mars Influence')
                            : (language === 'si' ? '🟡 සබඳතා වලදී ටිකක් කල්පනාවෙන් ඉන්න' : '🟡 Moderate Mars Influence'))
                          : (language === 'si' ? '🟢 කුජගෙන් විශේෂ පීඩනයක් දැනෙන්නේ නැහැ' : '🟢 No Significant Mars Influence')}
                      </Text>
                      {jyotishData.mangalDosha.description && (
                        <Text style={kj.doshaDesc}>{language === 'si' ? (jyotishData.mangalDosha.descriptionSi || jyotishData.mangalDosha.description) : jyotishData.mangalDosha.description}</Text>
                      )}
                    </View>
                  </View>
                </View>
              </PremiumVaultSection>
            )}

            {/* ── SADE SATI STATUS ── */}
            {jyotishData?.sadeSati && (
              <PremiumVaultSection
                icon="planet-outline"
                color={jyotishData.sadeSati.status ? '#F59E0B' : '#34D399'}
                eyebrow={language === 'si' ? 'සෙනසුරු තත්ත්වය' : 'Saturn Weather'}
                title={language === 'si' ? 'සෙනසුරු ගමනේ දැනට පවතින බලපෑම' : 'Current Saturn Pressure'}
                summary={jyotishData.sadeSati.status ? (language === 'si' ? 'වගකීම්, ප්‍රමාද, සහ ඉවසීම වැඩි වෙන්න පුළුවන් කාලයක්.' : 'A heavier responsibility cycle may be active, asking for patience and structure.') : (language === 'si' ? 'දැනට සෙනසුරු පීඩනය අඩුයි.' : 'Saturn pressure is not showing as active right now.')}
                defaultOpen={false}
                delay={900}
                language={language}
              >
                <Text style={{ color: 'rgba(255,214,102,0.6)', fontSize: 13, marginBottom: 12, lineHeight: 20 }}>
                  {language === 'si' ? 'දැනට සෙනසුරු ගමන නිසා වගකීම් සහ ඉවසීම ඕන කාලයක්ද කියලා මෙතනින් බලන්න.' : 'Shows whether Saturn is currently bringing more responsibility, delay, or pressure.'}
                </Text>
                <View style={[styles.advCard, {
                  borderColor: jyotishData.sadeSati.status ? 'rgba(245,158,11,0.25)' : 'rgba(52,211,153,0.20)',
                  overflow: 'hidden',
                }]}>
                  <LinearGradient
                    colors={jyotishData.sadeSati.status
                      ? ['rgba(245,158,11,0.08)', 'transparent']
                      : ['rgba(52,211,153,0.08)', 'transparent']}
                    style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={[kj.doshaOrb, {
                      backgroundColor: jyotishData.sadeSati.status ? 'rgba(245,158,11,0.15)' : 'rgba(52,211,153,0.15)',
                      borderColor: jyotishData.sadeSati.status ? 'rgba(245,158,11,0.35)' : 'rgba(52,211,153,0.35)',
                    }]}>
                      <Text style={{ fontSize: 22 }}>{jyotishData.sadeSati.status ? '🪐' : '🛡️'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[kj.doshaStatus, {
                        color: jyotishData.sadeSati.status ? '#F59E0B' : '#34D399',
                      }]}>
                        {jyotishData.sadeSati.status
                          ? (language === 'si' ? '⚠ මේ කාලේ සෙනසුරු පීඩනය වැඩියි' : '⚠ Saturn Transit is Active')
                          : (language === 'si' ? '✓ දැන් සෙනසුරු බලපෑම අඩුයි' : '✓ Saturn Transit Not Active')}
                      </Text>
                      {jyotishData.sadeSati.phase && (
                        <Text style={kj.doshaDesc}>
                          {language === 'si' ? 'අවස්ථාව: ' : 'Phase: '}{language === 'si' ? ({ 'Rising': 'ආරම්භක අදියර', 'Peak': 'උච්චතම අවස්ථාව', 'Setting': 'අවසන් අදියර' }[jyotishData.sadeSati.phase] || jyotishData.sadeSati.phase) : jyotishData.sadeSati.phase}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </PremiumVaultSection>
            )}

            {/* ── CHALIT CHART (Planet Shifts) ── */}
            {jyotishData?.chalit && jyotishData.chalit.planets && (
              <PremiumVaultSection
                icon="swap-horizontal-outline"
                color="#818CF8"
                eyebrow={language === 'si' ? 'ප්‍රතිඵල පෙන්වන තැන' : 'Result Zones'}
                title={language === 'si' ? 'ග්‍රහයින් ක්‍රියාත්මක වන ප්‍රදේශ' : 'Where Planets Work in Real Life'}
                summary={language === 'si' ? 'භාව චලිත අනුව ග්‍රහ ප්‍රතිඵල වැඩිපුර ක්‍රියාත්මක වන ජීවිත ප්‍රදේශ.' : 'Bhava Chalit shows the life areas where planet results actually land.'}
                count={(Array.isArray(jyotishData.chalit.planets) ? jyotishData.chalit.planets : []).filter(function (p) { return p.d1House !== p.house && p.d1House && p.house; }).length}
                defaultOpen={false}
                delay={940}
                language={language}
              >
                <Text style={{ color: 'rgba(255,214,102,0.6)', fontSize: 13, marginBottom: 12, lineHeight: 20 }}>
                  {language === 'si' ? 'උපන් වෙලාව අනුව සමහර ග්‍රහයින් කේන්දරේ පෙන්වන තැන්වලට වඩා වෙනස් තැන්වල ප්‍රතිඵල දෙන්න පුළුවන්.' : 'Sometimes planets give results for a different house than where they initially appear due to the Earth\'s real-time rotation (Bhava Chalit).'}
                </Text>
                <View style={[styles.advCard, { borderColor: 'rgba(129,140,248,0.15)' }]}>
                  <LinearGradient colors={['rgba(129,140,248,0.06)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  {(Array.isArray(jyotishData.chalit.planets) ? jyotishData.chalit.planets : []).map(function (p, i) {
                    var shifted = p.d1House !== p.house && p.d1House && p.house;
                    if (!shifted) return null;
                    var pInfo = PLANET_INFO[p.name] || {};
                    var pColor = pInfo.color || '#818CF8';
                    return (
                      <View key={i} style={kj.chalitRow}>
                        <View style={[kj.chalitDot, { backgroundColor: pColor }]} />
                        <Text style={[kj.chalitPlanet, { color: pColor }]}>
                          {language === 'si' ? (pInfo.si || p.name) : p.name}
                        </Text>
                        <View style={kj.chalitShiftBadge}>
                          <Text style={kj.chalitShiftFrom}>H{p.d1House}</Text>
                          <Ionicons name="arrow-forward" size={10} color="#818CF8" />
                          <Text style={kj.chalitShiftTo}>H{p.house}</Text>
                        </View>
                        <Text style={kj.chalitLabel}>{language === 'si' ? 'මාරු විය' : 'Shifted'}</Text>
                      </View>
                    );
                  })}
                  {(Array.isArray(jyotishData.chalit.planets) ? jyotishData.chalit.planets : []).filter(function (p) { return p.d1House !== p.house && p.d1House && p.house; }).length === 0 && (
                    <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                      <Ionicons name="checkmark-circle" size={24} color="#34D399" />
                      <Text style={{ color: 'rgba(52,211,153,0.70)', fontSize: 12, fontWeight: '600', marginTop: 6 }}>
                        {language === 'si' ? 'සියලු ග්‍රහයින් තමන්ගේ තැන්වලම ඉන්නවා' : 'All planets remain in their sign houses'}
                      </Text>
                    </View>
                  )}
                </View>
              </PremiumVaultSection>
            )}

            {/* ── VARGA CHART PICKER ── */}
            {hasBirthData && (
              <PremiumVaultSection
                icon="layers-outline"
                color="#06B6D4"
                eyebrow={language === 'si' ? 'විශේෂ කොටස්' : 'Life Area Charts'}
                title={language === 'si' ? 'ජීවිතේ විවිධ කොටස් ගැන විස්තර' : 'Detailed Life Area Charts'}
                summary={language === 'si' ? 'විවාහය, රැකියාව, දරුවන්, දේපළ, ඉගෙනීම වගේ කොටස් වෙන වෙනම කියවන්න.' : 'Separate focused charts for relationships, career, children, assets, learning, and inner growth.'}
                count={6}
                defaultOpen={false}
                delay={980}
                language={language}
              >
                <Text style={{ color: 'rgba(255,214,102,0.6)', fontSize: 13, marginBottom: 12, lineHeight: 20 }}>
                  {language === 'si' ? 'විවාහය, රැකියාව, දරුවන්, සහ දේපළ වගේ දේවල් වෙන වෙනම තේරුම් ගන්න මේ ටැබ් පාවිච්චි කරන්න.' : 'Use these tabs to understand one life area at a time, such as marriage, career, children, property, and learning.'}
                </Text>
                <View style={[styles.advCard, { borderColor: 'rgba(6,182,212,0.15)' }]}>
                  <LinearGradient colors={['rgba(6,182,212,0.06)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={kj.vargaPickerRow}>
                    {[
                      { key: 'd9', label: 'D9', name: language === 'si' ? 'විවාහය' : 'Relationships', sub: language === 'si' ? 'විවාහය ගැන' : 'Relationships' },
                      { key: 'd10', label: 'D10', name: language === 'si' ? 'රැකියාව' : 'Career', sub: language === 'si' ? 'රැකියාව ගැන' : 'Career' },
                      { key: 'd7', label: 'D7', name: language === 'si' ? 'දරුවන්' : 'Children', sub: language === 'si' ? 'දරුවන් ගැන' : 'Children' },
                      { key: 'd4', label: 'D4', name: language === 'si' ? 'දේපළ' : 'Property & Assets', sub: language === 'si' ? 'දේපළ ගැන' : 'Assets' },
                      { key: 'd24', label: 'D24', name: language === 'si' ? 'ඉගෙනීම' : 'Education & Learning', sub: language === 'si' ? 'ඉගෙනීම ගැන' : 'Learning' },
                      { key: 'd20', label: 'D20', name: language === 'si' ? 'ඇතුළත වර්ධනය' : 'Inner Growth', sub: language === 'si' ? 'හිත/ආගම ගැන' : 'Growth' },
                    ].map(function (v) {
                      var isActive = selectedVarga === v.key;
                      return (
                        <TouchableOpacity key={v.key} activeOpacity={0.7} onPress={function () { setSelectedVarga(v.key); }}>
                          <View style={[kj.vargaPill, isActive && kj.vargaPillActive]}>
                            {isActive && <LinearGradient colors={['rgba(6,182,212,0.20)', 'rgba(6,182,212,0.05)']} style={StyleSheet.absoluteFill} />}
                            <Text style={[kj.vargaPillLabel, isActive && kj.vargaPillLabelActive]}>{v.label}</Text>
                            <Text style={[kj.vargaPillName, isActive && kj.vargaPillNameActive]}>{v.sub}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  <VargaChartDisplay division={selectedVarga} birthDateTime={birthDateTime} lat={birthLat} lng={birthLng} language={language} />
                </View>
              </PremiumVaultSection>
            )}

            {/* ═══ MARAKA APALA (Dangerous Periods) ═══ */}
            {(marakaData || marakaLoading) && (
              <PremiumVaultSection
                icon="shield-outline"
                color={marakaData && marakaData.status === 'SAFE' ? '#34D399' : '#F87171'}
                eyebrow={language === 'si' ? 'ආරක්ෂිත දිනදර්ශනය' : 'Care Calendar'}
                title={language === 'si' ? 'පරිස්සම් වෙන්න ඕන කාල' : 'Sensitive Periods'}
                summary={marakaLoading && !marakaData ? (language === 'si' ? 'සංවේදී කාල විශ්ලේෂණය තවම ක්‍රියාත්මකයි.' : 'Sensitive period analysis is still loading.') : (marakaData ? (language === 'si' ? (marakaData.statusSi || 'ආරක්ෂාව ගැන කෙටි කියවීමක්.') : (marakaData.statusEn || 'A focused read on timing and caution.')) : '')}
                count={marakaData ? ((marakaData.activeCount || 0) + ((marakaData.upcomingApala || []).length)) : null}
                defaultOpen={false}
                delay={750}
                language={language}
              >
                <Text style={{ color: 'rgba(255,214,102,0.6)', fontSize: 13, marginBottom: 12, lineHeight: 20 }}>
                  {language === 'si' ? 'ග්‍රහ ගමනට අනුව සෞඛ්‍යය සහ ආරක්ෂාව ගැන ටිකක් වැඩියෙන් හිතන්න ඕන කාල සීමාවන් මෙතනින් බලන්න පුළුවන්.' : 'High-friction periods based on your current astrological cycle where taking caution with health and decisions is advised. Avoid starting big new things.'}
                </Text>

                {marakaLoading && !marakaData ? (
                  <View style={[styles.advCard, { alignItems: 'center', paddingVertical: 24 }]}>
                    <CosmicLoader size={28} color="#f87171" />
                    <Text style={{ color: 'rgba(255,255,255,0.62)', marginTop: 10, fontSize: 13 }}>
                      {language === 'si' ? 'සංවේදී කාල විශ්ලේෂණය කරනවා...' : 'Analyzing sensitive periods...'}
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
                              ? (marakaData.status === 'CRITICAL' ? '⚠️ ඉහළ සංවේදිතාව' : marakaData.status === 'HIGH' ? '🔶 සංවේදී කාලය' : marakaData.status === 'MODERATE' ? '🟡 කල්පනාවෙන් ඉන්න' : '🟢 හොඳින් ඉදිරියටම යතැහැකි')
                              : (marakaData.status === 'CRITICAL' ? '⚠️ High Sensitivity' : marakaData.status === 'HIGH' ? '🔶 Elevated Sensitivity' : marakaData.status === 'MODERATE' ? '🟡 Be Mindful' : '🟢 Clear Ahead')}
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
                            <Text style={[styles.marakaCountLabel, { color: 'rgba(255,255,255,0.55)' }]}>
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
                          {'  ' + (language === 'si' ? 'දැනට ක්‍රියාත්මක වන අපල' : 'Currently Active Periods')}
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
                                            : (language === 'si' ? 'අද ඉවර වෙනවා' : 'Ends today')}
                                        </Text>
                                      </View>
                                    </View>
                                    {/* Expandable remedies */}
                                    {isExpanded && apala.remedies && apala.remedies.length > 0 && (
                                      <Animated.View entering={FadeIn.duration(300)} style={styles.marakaRemediesBox}>
                                        <Text style={styles.marakaRemediesTitle}>
                                          {language === 'si' ? '💡 මඟ පෙන්වීම්' : '💡 Guidance'}
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
                                        {language === 'si' ? '↓ මඟ පෙන්වීම් බලන්න මෙතන ඔබන්න' : '↓ Tap for practical guidance'}
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
                          {'  ' + (language === 'si' ? 'ඉදිරියට එන අපල කාල' : 'Upcoming Periods')}
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
                                      <Text style={[styles.marakaPeriodText, { color: 'rgba(255,255,255,0.55)' }]}>
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
                                              {language === 'si' ? '💡 මඟ පෙන්වීම්' : '💡 Guidance'}
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
                                        {language === 'si' ? '↓ විස්තර බලන්න මෙතන ඔබන්න' : '↓ Tap for details'}
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
                          {language === 'si' ? 'හොඳ කාලයයි' : 'You\'re in a Clear Period'}
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.62)', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                          {language === 'si' ? 'ඉදිරියේදී දැනට සංවේදී කාලයක් නැහැ' : 'No sensitive periods ahead — a favorable time'}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : null}
              </PremiumVaultSection>
            )}

          </View>
        )}

        {/* ═══ LOCKED DEPTH (free users) — the conversion wall ═══
            Every Pro vault is rendered as a named, counted lock instead of being
            hidden. Each taps to the paywall with its own analytics source so we
            can learn which section actually sells the subscription. */}
        {isPreview && chartData.vaultCounts && (() => {
          var vc = chartData.vaultCounts;
          var si = language === 'si';
          return (
            <View style={{ marginTop: 10 }}>
              <View style={styles.lockSectionIntro}>
                <Ionicons name="lock-closed" size={14} color="#FFB800" />
                <Text style={styles.lockSectionIntroText}>
                  {si ? 'ඔබේ කේන්දරයේ ගැඹුරු විශ්ලේෂණය — Pro වලින් විවෘත වේ' : 'The deep analysis of your chart — unlock with Pro'}
                </Text>
              </View>

              <LockedVaultTeaser icon="sparkles-outline" color="#FF8C00"
                eyebrow={si ? 'ප්‍රධාන කියවීම' : 'Primary Reading'}
                title={si ? 'ඔබේ පෞද්ගලික කේන්දර කියවීම' : 'Your personal chart reading'}
                tease={si ? 'ඔබේ නිශ්චිත උපන් වේලාවට ලියූ සම්පූර්ණ කේන්දර සාරාංශය.' : 'A full chart summary written for your exact birth time.'}
                source="kendara_summary" showPaywall={showPaywall} onUnlocked={onRefresh} language={language} delay={120} />

              {vc.yogas > 0 && (
                <LockedVaultTeaser icon="star-outline" color="#FFB800"
                  eyebrow={si ? 'ශක්ති භණ්ඩාගාරය' : 'Strength Vault'}
                  title={si ? 'ඔබේ සහජ ශක්ති සහ දක්ෂතා' : 'Your natural strengths & talents'}
                  tease={vc.rareYogas > 0
                    ? (si ? vc.yogas + ' යෝග හමු විය — ' + vc.rareYogas + 'ක් දුර්ලභයි. සම්පූර්ණ කියවීම විවෘත කරන්න.' : vc.yogas + ' yogas found — ' + vc.rareYogas + ' rare. Unlock the full reading.')
                    : (si ? vc.yogas + ' යෝග හමු විය. ඒවායේ අර්ථය විවෘත කරන්න.' : vc.yogas + ' yogas found. Unlock what they mean.')}
                  count={vc.yogas} source="kendara_yogas" showPaywall={showPaywall} onUnlocked={onRefresh} language={language} delay={160} />
              )}

              {vc.doshas > 0 && (
                <LockedVaultTeaser icon="alert-circle-outline" color="#F87171"
                  eyebrow={si ? 'ආරක්ෂිත කියවීම' : 'Care Reading'}
                  title={si ? 'අවධානය දෙන්න ඕන තැන් — පිළියම් සමඟ' : 'Care points to review — with remedies'}
                  tease={si ? vc.doshas + ' තැනක් හමු විය. ඒවා මොනවද, බලපෑම අඩුද, පිළියම් මොනවද කියා විවෘත කරන්න.' : vc.doshas + ' care points found. Unlock what they are, whether they\'re softened, and the remedies.'}
                  count={vc.doshas} source="kendara_doshas" showPaywall={showPaywall} onUnlocked={onRefresh} language={language} delay={200} />
              )}

              {Array.isArray(vc.dashaLadder) && vc.dashaLadder.length > 0 && (
                <LockedDashaSkeleton ladder={vc.dashaLadder} current={vc.currentDasha}
                  source="kendara_dasha" showPaywall={showPaywall} onUnlocked={onRefresh} language={language} delay={240} />
              )}

              {vc.strongest && (
                <LockedVaultTeaser icon="bar-chart-outline" color="#60A5FA"
                  eyebrow={si ? 'ග්‍රහ බල මීටරය' : 'Planet Power'}
                  title={(si ? 'ශක්තිමත්ම සහාය: ' : 'Strongest support: ') + getKendaraPlanetName(vc.strongest.planet, language) + ' ' + vc.strongest.percentage + '%'}
                  tease={si ? 'ඔබේ ශක්තිමත්ම ග්‍රහයා නොමිලේ. ඉතිරි ග්‍රහයන්ගේ බල මට්ටම් විවෘත කරන්න.' : 'Your strongest planet is free. Unlock the power levels of the other ' + Math.max(1, (vc.shadbala || 7) - 1) + '.'}
                  count={vc.strongest.percentage} countSuffix="%" source="kendara_shadbala" showPaywall={showPaywall} onUnlocked={onRefresh} language={language} delay={280} />
              )}

              {vc.mangalChecked && (
                <LockedVaultTeaser icon="flame-outline" color="#F472B6"
                  eyebrow={si ? 'සබඳතා පරීක්ෂාව' : 'Relationship Check'}
                  title={si ? 'කුජ දෝෂය පරීක්ෂා කළා — ප්‍රතිඵලය අගුළු දමා' : 'Mars (Mangal) checked — result locked'}
                  tease={si ? 'විවාහයට කුජගෙන් එන බලපෑම ගණනය කළා. ප්‍රතිඵලය සහ අර්ථය විවෘත කරන්න.' : 'We calculated Mars’ influence on marriage. Unlock the verdict and what it means.'}
                  source="kendara_mangal" showPaywall={showPaywall} onUnlocked={onRefresh} language={language} delay={320} />
              )}

              {vc.sadeSatiChecked && (
                <LockedVaultTeaser icon="planet-outline" color="#F59E0B"
                  eyebrow={si ? 'සෙනසුරු තත්ත්වය' : 'Saturn Weather'}
                  title={si ? 'සෙනසුරු පීඩනය පරීක්ෂා කළා — ප්‍රතිඵලය අගුළු දමා' : 'Sade Sati checked — result locked'}
                  tease={si ? 'දැනට සෙනසුරු ගමනේ බලපෑම ක්‍රියාත්මකද කියා ගණනය කළා. ප්‍රතිඵලය විවෘත කරන්න.' : 'We checked whether Saturn’s pressure cycle is active for you now. Unlock the result.'}
                  source="kendara_sadesati" showPaywall={showPaywall} onUnlocked={onRefresh} language={language} delay={360} />
              )}

              <LockedVaultTeaser icon="compass-outline" color="#FF8C00"
                eyebrow={si ? 'අරමුණු කියවීම' : 'Purpose Reading'}
                title={si ? 'ඔබේ ජීවිත දිශාව' : 'Your life direction'}
                tease={si ? 'අභ්‍යන්තර අරමුණ, අන් අයට පෙනෙන විදිහ සහ බැඳීම් රටාව.' : 'Your inner purpose, public image, and commitment pattern.'}
                source="kendara_jaimini" showPaywall={showPaywall} onUnlocked={onRefresh} language={language} delay={400} />

              <LockedVaultTeaser icon="locate-outline" color="#06B6D4"
                eyebrow={si ? 'දෛව ලක්ෂ්‍යය' : 'Destiny Marker'}
                title={si ? 'ඔබේ දෛව ලක්ෂ්‍යය' : 'Your destiny point'}
                tease={si ? 'වර්ධනය සහ අවස්ථා වැඩිපුරම ක්‍රියාත්මක වන ජීවිත ක්ෂේත්‍රය.' : 'The life area where growth and opportunity activate most strongly.'}
                source="kendara_bhrigu" showPaywall={showPaywall} onUnlocked={onRefresh} language={language} delay={440} />

              <LockedVaultTeaser icon="time-outline" color="#A78BFA"
                eyebrow={si ? 'ගැඹුරු රටා' : 'Deep Patterns'}
                title={si ? 'ඔබේ ගැඹුරු රටා' : 'Your deeper patterns'}
                tease={si ? 'පුරුදු රටා, වර්ධන දිශාව සහ ස්වාභාවික ශක්ති.' : 'Old tendencies, growth direction, and natural strengths.'}
                source="kendara_pastlife" showPaywall={showPaywall} onUnlocked={onRefresh} language={language} delay={480} />

              <LockedVaultTeaser icon="layers-outline" color="#06B6D4"
                eyebrow={si ? 'ජීවිත අංශ සිතියම්' : 'Life Area Charts'}
                title={si ? 'ජීවිතේ කොටස් 6ක් වෙන වෙනම' : '6 focused life-area charts'}
                tease={si ? 'විවාහය, රැකියාව, දරුවන්, දේපළ, ඉගෙනීම සහ ඇතුළත වර්ධනය — වෙන වෙනම කියවන්න.' : 'Marriage, career, children, property, learning and inner growth — read each one on its own.'}
                count={vc.varga || 6} source="kendara_varga" showPaywall={showPaywall} onUnlocked={onRefresh} language={language} delay={520}>
                <View style={styles.lockVargaChips}>
                  {['D9', 'D10', 'D7', 'D4', 'D24', 'D20'].map(function (d) {
                    return (
                      <View key={d} style={styles.lockVargaChip}>
                        <Text style={styles.lockVargaChipText}>{d}</Text>
                        <Ionicons name="lock-closed" size={9} color="rgba(6,182,212,0.7)" />
                      </View>
                    );
                  })}
                </View>
              </LockedVaultTeaser>

              <LockedVaultTeaser icon="shield-outline" color="#F87171"
                eyebrow={si ? 'ආරක්ෂිත දිනදර්ශනය' : 'Care Calendar'}
                title={si ? 'පරිස්සම් වෙන්න ඕන කාල' : 'Your sensitive periods'}
                tease={si ? 'ඉදිරි මාස 12 තුළ සෞඛ්‍යය සහ තීරණ ගැන පරිස්සම් විය යුතු කාල — දින සහ මඟපෙන්වීම් සමඟ.' : 'The months ahead to take extra care with health and decisions — with dates and guidance.'}
                source="kendara_maraka" showPaywall={showPaywall} onUnlocked={onRefresh} language={language} delay={560} />
            </View>
          );
        })()}

        {/* ── Where to next — contextual actions at the end of the read ── */}
        {chartData._preview
          ? <KendaraUpgradeCard showPaywall={showPaywall} language={language} onUpgraded={onRefresh} vaultCounts={chartData.vaultCounts} />
          : <KendaraNextSteps router={router} language={language} />}
      </View>
    );
  };

  return (
    <DesktopScreenWrapper routeName="kendara">
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <CosmicBackground reduced={reduced} lowEnd={lowEnd} variant="golden" />
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={sc.iconAccent} />}>
        <View style={[styles.content, isDesktop && styles.contentDesktop, !isDesktop && { paddingTop: insets.contentTop }]}>
          <PremiumKendaraHero chartData={chartData} jyotishData={effectiveJyotish} user={user} language={language} gradients={gradients} reduced={reduced} lowEnd={lowEnd} />
          {renderContent()}
        </View>
        <View style={{ height: isDesktop ? 32 : insets.contentBottom }} />
      </ScrollView>
    </View>
    </DesktopScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 100 : 80 },
  contentDesktop: { paddingTop: 20, paddingHorizontal: 28, maxWidth: 900, alignSelf: 'center', width: '100%' },
  pageTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  pageTitle: { fontSize: 30, fontWeight: '800', color: '#FFB800', marginBottom: 3, ...textShadow('rgba(255,184,0,0.3)', { width: 0, height: 2 }, 8) },
  pageSubtitle: { fontSize: 13, color: 'rgba(255,214,102,0.68)', fontWeight: '500' },
  lagnaOrb: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,184,0,0.35)', ...boxShadow('#FF8C00', { width: 0, height: 0 }, 0.5, 10) },
  sinhalaTextFlow: { letterSpacing: 0, textTransform: 'none' },
  premiumHeroWrap: {
    borderRadius: 30, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 17, marginBottom: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.24)',
    backgroundColor: 'rgba(9,6,3,0.86)',
    ...boxShadow('rgba(255,140,0,0.52)', { width: 0, height: 14 }, 0.38, 30),
  },
  heroTopSheen: {
    position: 'absolute', left: 0, right: 0, top: 0, height: 112,
  },
  heroPortalGlow: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130, top: 4, alignSelf: 'center',
    backgroundColor: 'rgba(255,184,0,0.24)',
    ...boxShadow('rgba(255,184,0,0.72)', { width: 0, height: 0 }, 0.48, 38),
  },
  heroConstellationLine: {
    position: 'absolute', left: -18, right: -18, top: 112, height: 1,
    backgroundColor: 'rgba(255,184,0,0.16)', transform: [{ rotate: '-7deg' }],
  },
  heroPortalStage: {
    height: 248, alignItems: 'center', justifyContent: 'center', marginTop: 2, marginBottom: 10,
  },
  heroPortalOrbitOuter: {
    position: 'absolute', width: 226, height: 226, borderRadius: 113,
    borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,214,102,0.28)',
  },
  heroPortalOrbitInner: {
    position: 'absolute', width: 178, height: 178, borderRadius: 89,
    borderWidth: 1, borderColor: 'rgba(6,182,212,0.22)',
  },
  heroOrbitNodeGold: {
    position: 'absolute', width: 10, height: 10, borderRadius: 5, top: 9, left: 104,
    backgroundColor: '#FFB800', ...boxShadow('#FFB800', { width: 0, height: 0 }, 0.7, 10),
  },
  heroOrbitNodeCyan: {
    position: 'absolute', width: 7, height: 7, borderRadius: 4, bottom: 26, right: 31,
    backgroundColor: '#4CC9F0', ...boxShadow('#4CC9F0', { width: 0, height: 0 }, 0.6, 8),
  },
  heroOrbitNodePurple: {
    position: 'absolute', width: 8, height: 8, borderRadius: 4, top: 34, right: 16,
    backgroundColor: '#A78BFA', ...boxShadow('#A78BFA', { width: 0, height: 0 }, 0.58, 8),
  },
  heroPortalCard: {
    width: 164, height: 192, borderRadius: 42, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.38)',
    ...boxShadow('rgba(255,184,0,0.68)', { width: 0, height: 0 }, 0.55, 30),
  },
  heroPortalShimmer: {
    position: 'absolute', width: 74, height: 240, top: -24,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  heroPortalImageOrb: {
    width: 134, height: 134, borderRadius: 67, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    backgroundColor: 'rgba(26,16,64,0.16)', borderWidth: 1, borderColor: 'rgba(26,16,64,0.18)',
  },
  heroPortalImage: { width: 128, height: 128 },
  heroPortalName: { color: '#1A1040', fontSize: 18, lineHeight: 22, fontWeight: '900', marginTop: 8, textAlign: 'center', maxWidth: 132 },
  heroPortalSub: { color: 'rgba(26,16,64,0.72)', fontSize: 10, lineHeight: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  heroFloatingChipLeft: {
    position: 'absolute', left: 8, bottom: 32, maxWidth: 112, minHeight: 34, borderRadius: 999,
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10,
    backgroundColor: 'rgba(12,8,28,0.70)', borderWidth: 1, borderColor: 'rgba(199,210,254,0.20)',
  },
  heroFloatingChipRight: {
    position: 'absolute', right: 8, top: 30, maxWidth: 116, minHeight: 34, borderRadius: 999,
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10,
    backgroundColor: 'rgba(36,20,4,0.72)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.22)',
  },
  heroFloatingChipText: { color: 'rgba(255,244,214,0.78)', fontSize: 10, lineHeight: 13, fontWeight: '900', flexShrink: 1 },
  heroCopyPanel: {
    alignItems: 'center', paddingHorizontal: 6, marginTop: -2,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 },
  heroTextBlock: { flex: 1, minWidth: 0 },
  heroKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  heroKickerRowPremium: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 7 },
  heroKicker: { color: 'rgba(255,214,102,0.64)', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  heroTitlePremium: { color: '#FFE8B0', fontSize: 32, lineHeight: 38, fontWeight: '900', letterSpacing: 0, textAlign: 'center', ...textShadow('rgba(255,184,0,0.30)', { width: 0, height: 2 }, 11) },
  heroSubtitlePremium: { color: 'rgba(255,244,214,0.68)', fontSize: 13, lineHeight: 21, fontWeight: '600', marginTop: 8, maxWidth: 520, textAlign: 'center' },
  heroSealMotion: { width: 104, height: 124, alignItems: 'center', justifyContent: 'center', marginTop: -1 },
  heroSealHalo: {
    position: 'absolute', width: 112, height: 112, borderRadius: 56,
    backgroundColor: 'rgba(255,184,0,0.24)',
    ...boxShadow('rgba(255,184,0,0.70)', { width: 0, height: 0 }, 0.58, 26),
  },
  heroSealOrbit: {
    position: 'absolute', width: 108, height: 108, borderRadius: 54,
    borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(26,16,64,0.24)',
  },
  heroSealSpark: { position: 'absolute', width: 7, height: 7, borderRadius: 4, top: -2, left: 49, backgroundColor: '#1A1040' },
  heroSealSparkAlt: { position: 'absolute', width: 5, height: 5, borderRadius: 3, bottom: 4, right: 18, backgroundColor: 'rgba(26,16,64,0.72)' },
  heroSealWrap: {
    width: 94, height: 110, borderRadius: 24, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
    ...boxShadow('#FF8C00', { width: 0, height: 0 }, 0.42, 22),
  },
  heroSealInner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 9, backgroundColor: 'rgba(255,255,255,0.12)' },
  heroSealImageOrb: {
    width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    backgroundColor: 'rgba(26,16,64,0.16)', borderWidth: 1, borderColor: 'rgba(26,16,64,0.18)',
  },
  heroSealImage: { width: 58, height: 58 },
  heroSealText: { color: '#1A1040', fontSize: 14, lineHeight: 17, fontWeight: '900', marginTop: 4, textAlign: 'center' },
  heroSealSub: { color: 'rgba(26,16,64,0.72)', fontSize: 10, fontWeight: '900', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.7 },
  heroBirthRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'center', maxWidth: '100%',
    marginTop: 14, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(255,184,0,0.07)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.14)',
  },
  heroBirthText: { color: 'rgba(255,214,102,0.66)', fontSize: 11, fontWeight: '800', maxWidth: 260 },
  heroMetricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 15 },
  heroMetric: {
    flexGrow: 1, flexBasis: '47%', minHeight: 56, borderRadius: 15, paddingHorizontal: 11, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1,
  },
  heroMetricTextWrap: { flex: 1, minWidth: 0 },
  heroMetricLabel: { color: 'rgba(255,214,102,0.62)', fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  heroMetricValue: { fontSize: 13, lineHeight: 17, fontWeight: '900' },

  chartAuraWrap: { alignItems: 'center', marginBottom: 20, paddingVertical: 8, minHeight: Math.min(SCREEN_WIDTH - 40, 380) + 26 },
  chartOrbitRing: {
    position: 'absolute', width: Math.min(SCREEN_WIDTH - 12, 390), height: Math.min(SCREEN_WIDTH - 12, 390),
    borderRadius: Math.min(SCREEN_WIDTH - 12, 390) / 2, borderWidth: 1, borderStyle: 'dashed',
    top: 0, alignSelf: 'center', opacity: 0.88,
  },
  chartOrbitSpark: { position: 'absolute', width: 8, height: 8, borderRadius: 4, top: 18, left: '50%' },
  chartOrbitSparkAlt: { position: 'absolute', width: 5, height: 5, borderRadius: 3, bottom: 26, right: 64, opacity: 0.82 },
  chartPremiumFrame: {
    borderRadius: 22, overflow: 'hidden', padding: 4,
    borderWidth: 1, backgroundColor: 'rgba(14,8,4,0.88)', elevation: 10,
  },
  chartFrameGradient: { padding: 4, borderRadius: 18, overflow: 'hidden' },
  chartFrameInnerLine: {
    position: 'absolute', left: 7, right: 7, top: 7, bottom: 7,
    borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,184,0,0.10)',
  },

  ritualWrap: {
    borderRadius: 22, padding: 15, marginBottom: 14, overflow: 'hidden',
    backgroundColor: 'rgba(10,7,3,0.82)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.16)',
    ...boxShadow('rgba(255,140,0,0.26)', { width: 0, height: 9 }, 0.28, 18),
  },
  ritualPulse: {
    position: 'absolute', width: 170, height: 170, borderRadius: 85, right: -68, top: -70,
  },
  ritualTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  ritualIconWrap: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  ritualTitleBlock: { flex: 1, minWidth: 0, paddingTop: 1 },
  ritualEyebrow: { fontSize: 10, lineHeight: 13, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 },
  ritualTitle: { color: '#FFE8B0', fontSize: 18, lineHeight: 23, fontWeight: '900' },
  ritualStreakBadge: {
    minWidth: 52, minHeight: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
    backgroundColor: 'rgba(255,184,0,0.10)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.18)',
  },
  ritualStreakValue: { color: '#FFB800', fontSize: 19, lineHeight: 21, fontWeight: '900' },
  ritualStreakLabel: { color: 'rgba(255,214,102,0.68)', fontSize: 10, lineHeight: 12, fontWeight: '900', textTransform: 'uppercase' },
  ritualBody: { color: 'rgba(255,244,214,0.64)', fontSize: 12, lineHeight: 20, fontWeight: '600', marginBottom: 13 },
  ritualTaskRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  ritualTaskPill: {
    minHeight: 42, maxWidth: '48%', flexGrow: 1, flexBasis: '30%', borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.12)', backgroundColor: 'rgba(255,255,255,0.035)',
    paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  ritualTaskText: { color: 'rgba(255,214,102,0.68)', fontSize: 10, lineHeight: 14, fontWeight: '900', flexShrink: 1, textAlign: 'center' },
  ritualDetailBox: { borderRadius: 17, borderWidth: 1, padding: 12, backgroundColor: 'rgba(255,255,255,0.035)' },
  ritualDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 6 },
  ritualDetailLabel: { fontSize: 10, lineHeight: 13, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase', flexShrink: 1 },
  ritualTotalViews: { color: 'rgba(255,214,102,0.62)', fontSize: 10, lineHeight: 13, fontWeight: '800' },
  ritualDetailValue: { color: '#FFE8B0', fontSize: 15, lineHeight: 21, fontWeight: '900', marginBottom: 6 },
  ritualDetailText: { color: 'rgba(255,244,214,0.56)', fontSize: 11, lineHeight: 18, fontWeight: '600' },

  insightRailWrap: { marginBottom: 14 },
  insightHeaderRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10, gap: 12 },
  insightHeaderTextBlock: { flex: 1, minWidth: 0 },
  insightHeaderKicker: { color: 'rgba(255,184,0,0.68)', fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 2 },
  insightHeaderTitle: { color: '#FFE8B0', fontSize: 18, lineHeight: 23, fontWeight: '900' },
  insightCountPill: {
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: 'rgba(255,184,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.16)',
  },
  insightCountText: { color: '#FFB800', fontSize: 11, fontWeight: '900' },
  insightStack: { gap: 10 },
  insightCard: {
    width: '100%', minHeight: 0, borderRadius: 18, padding: 14, overflow: 'hidden',
    borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.035)',
  },
  insightCardActive: { ...boxShadow('rgba(255,184,0,0.28)', { width: 0, height: 6 }, 0.34, 18) },
  insightIcon: { width: 34, height: 34, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  insightEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 },
  insightTitle: { color: '#FFE8B0', fontSize: 15, lineHeight: 20, fontWeight: '900', marginBottom: 6 },
  insightBody: { color: 'rgba(255,244,214,0.58)', fontSize: 11, lineHeight: 18, fontWeight: '600' },

  masteryWrap: {
    borderRadius: 18, padding: 13, marginBottom: 18, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.035)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.12)',
  },
  masteryTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  masteryLabel: { color: '#FFE8B0', fontSize: 13, lineHeight: 18, fontWeight: '900' },
  masterySub: { color: 'rgba(255,214,102,0.62)', fontSize: 10, lineHeight: 15, fontWeight: '700', marginTop: 2 },
  masteryPercent: { color: '#FFB800', fontSize: 20, fontWeight: '900' },
  masteryTrack: { height: 7, borderRadius: 999, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 10 },
  masteryFill: { height: 7, borderRadius: 999, backgroundColor: '#FFB800' },
  masteryMilestones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  masteryMilestone: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '48%' },
  masteryDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  masteryDotDone: { backgroundColor: '#FFB800', borderColor: '#FFB800' },
  masteryMilestoneText: { color: 'rgba(255,214,102,0.62)', fontSize: 10, fontWeight: '800', flexShrink: 1 },
  masteryMilestoneTextDone: { color: 'rgba(255,232,176,0.82)' },
  vaultSectionWrap: { marginBottom: 12 },
  vaultHeader: {
    minHeight: 96, borderRadius: 18, padding: 13, overflow: 'hidden',
    borderWidth: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 11,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  vaultIconWrap: {
    width: 38, height: 38, borderRadius: 13, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  vaultHeaderText: { flex: 1, minWidth: 0 },
  vaultEyebrow: { fontSize: 10, lineHeight: 13, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 4 },
  vaultTitle: { color: '#FFE8B0', fontSize: 16, lineHeight: 21, fontWeight: '900', marginBottom: 5 },
  vaultSummary: { color: 'rgba(255,244,214,0.68)', fontSize: 11, lineHeight: 17, fontWeight: '600' },
  vaultActionStack: { alignItems: 'center', gap: 8, marginTop: 1 },
  vaultCountPill: { minWidth: 30, height: 25, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  vaultCountText: { fontSize: 11, fontWeight: '900' },
  vaultChevron: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  vaultBody: { paddingTop: 10 },
  center: { alignItems: 'center', justifyContent: 'center', height: 300 },
  emptyState: { alignItems: 'center', padding: 40, backgroundColor: 'rgba(255,140,0,0.07)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,140,0,0.2)' },
  emptyTitle: { color: '#FFB800', fontSize: 18, marginVertical: 16, fontWeight: '700' },
  emptyText: { color: 'rgba(255,214,102,0.62)', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  actionButton: { backgroundColor: '#FFB800', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  actionButtonText: { fontWeight: '800', color: '#1A1040' },
  errorText: { color: '#F87171', fontSize: 14 },
  chartContainer: { marginBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: '#FFE8B0', fontSize: 17, marginLeft: 10, fontWeight: '700', flex: 1, ...textShadow('rgba(255,184,0,0.20)', { width: 0, height: 1 }, 6) },
  detailsCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', padding: 16, borderRadius: 18, marginTop: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    ...boxShadow('#FF8C00', { width: 0, height: 2 }, 0.1, 8),
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  infoLabel: { color: 'rgba(255,214,102,0.68)', fontSize: 13 },
  infoValue: { color: '#FFE8B0', fontWeight: '600', fontSize: 13 },
  cardTitle: { color: '#FFB800', marginBottom: 14, fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardIntro: { color: 'rgba(255,214,102,0.68)', fontSize: 12, lineHeight: 19, marginBottom: 14 },
  summaryItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  summaryIcon: {
    width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  summaryLabel: { color: 'rgba(255,214,102,0.62)', fontSize: 11, fontWeight: '700', marginBottom: 3 },
  summaryValue: { color: '#FFE8B0', fontSize: 13, lineHeight: 20, fontWeight: '600' },

  // Planet Positions — bar style
  planetRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)', gap: 10 },
  planetDot: { width: 9, height: 9, borderRadius: 5, marginTop: 6 },
  planetTextWrap: { flex: 1, gap: 5 },
  planetTopLine: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  planetName: { fontSize: 13, fontWeight: '800', flex: 1, lineHeight: 19 },
  planetDegree: { color: 'rgba(255,214,102,0.62)', fontSize: 11, fontWeight: '700', marginTop: 2 },
  planetBarTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginTop: 2 },
  planetBarFill: { height: 4, borderRadius: 2, opacity: 0.7 },
  planetRashi: { color: 'rgba(255,214,102,0.58)', fontSize: 12, fontWeight: '600', lineHeight: 18 },
  planetPersonalNote: { color: 'rgba(255,255,255,0.56)', fontSize: 11, lineHeight: 17, fontWeight: '500' },

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
  doshaMeta: { color: 'rgba(255,214,102,0.62)', fontSize: 10, lineHeight: 15, fontWeight: '700', marginTop: 4 },
  doshaIssueMeaning: { color: 'rgba(255,255,255,0.58)', fontSize: 12, lineHeight: 18, marginTop: 5 },
  doshaGuidanceTitle: { color: '#FBBF24', fontSize: 12, lineHeight: 18, fontWeight: '800', marginTop: 8 },
  doshaDesc: { color: 'rgba(255,214,102,0.62)', fontSize: 12, lineHeight: 18, marginTop: 3 },
  cancelBadge: { backgroundColor: 'rgba(52,211,153,0.15)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)' },
  cancelText: { color: '#34D399', fontSize: 10, fontWeight: '800' },
  cancelReason: { color: 'rgba(52,211,153,0.6)', fontSize: 11, fontStyle: 'italic', marginTop: 3 },
  cancelInfoBox: { marginTop: 9, padding: 9, borderRadius: 10, backgroundColor: 'rgba(52,211,153,0.08)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.16)' },
  cancelInfoLabel: { color: '#34D399', fontSize: 10, fontWeight: '900', marginBottom: 4 },
  cancelInfoText: { color: 'rgba(209,250,229,0.72)', fontSize: 11, lineHeight: 17, fontWeight: '600' },
  sevBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  sevText: { fontSize: 10, fontWeight: '800' },

  // Yoga styles
  yogaItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  yogaTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  yogaName: { color: '#FFE8B0', fontSize: 14, fontWeight: '700', flex: 1 },
  yogaCat: { color: 'rgba(255,140,0,0.6)', fontSize: 11, fontWeight: '600', marginTop: 3 },
  yogaDesc: { color: 'rgba(255,214,102,0.62)', fontSize: 12, lineHeight: 18, marginTop: 3 },
  yogaPlanets: { color: 'rgba(255,184,0,0.6)', fontSize: 11, marginTop: 4 },
  strBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  strText: { fontSize: 10, fontWeight: '700' },

  // Jaimini styles
  jaiminiHighlight: { borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,140,0,0.15)', overflow: 'hidden' },
  jaiminiLabel: { color: 'rgba(255,140,0,0.7)', fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  jaiminiValue: { color: '#FF8C00', fontSize: 22, fontWeight: '900' },
  jaiminiSub: { color: 'rgba(255,214,102,0.55)', fontSize: 11, marginTop: 8, lineHeight: 18 },
  jaiminiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  jaiminiMini: { flex: 1, minWidth: 90, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 10, alignItems: 'center' },
  jmLabel: { color: 'rgba(255,214,102,0.55)', fontSize: 10, fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  jmValue: { color: '#FFE8B0', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  jmDesc: { color: 'rgba(255,214,102,0.55)', fontSize: 10, textAlign: 'center', marginTop: 4 },

  // Shadbala styles
  sbRow: { marginBottom: 14 },
  sbTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sbPlanet: { fontSize: 14, fontWeight: '800', flex: 1, lineHeight: 18 },
  sbRupas: { color: 'rgba(255,214,102,0.68)', fontSize: 12, fontWeight: '700', minWidth: 42, textAlign: 'right' },
  sbBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  sbBarTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  sbBarFill: { height: 6, borderRadius: 3 },
  sbNote: { color: 'rgba(255,255,255,0.68)', fontSize: 11, lineHeight: 17, marginTop: 7 },

  // Bhrigu Bindu styles
  bbCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: 'rgba(255,184,0,0.35)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,184,0,0.06)' },
  bbDeg: { color: '#FFB800', fontSize: 16, fontWeight: '800' },
  bbRashi: { color: '#FFE8B0', fontSize: 16, fontWeight: '700' },
  bbNak: { color: 'rgba(255,214,102,0.62)', fontSize: 12, marginTop: 2 },
  bbInterp: { color: 'rgba(255,214,102,0.62)', fontSize: 12, lineHeight: 18, marginTop: 12 },
  bbPersonalNote: { color: 'rgba(255,255,255,0.58)', fontSize: 12, lineHeight: 18, marginTop: 10, fontWeight: '500' },

  // Past Life styles
  plRow: { marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  plLabel: { color: 'rgba(167,139,250,0.7)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  plValue: { color: '#FFE8B0', fontSize: 13, lineHeight: 20 },
  plIndicator: { color: 'rgba(255,214,102,0.55)', fontSize: 12, lineHeight: 20, paddingLeft: 4 },

  // Engine footer
  engineFooter: { color: 'rgba(255,255,255,0.55)', fontSize: 10, textAlign: 'center', marginTop: 4, marginBottom: 10 },

  // Share pill (chart header) + captured-card watermark
  sharePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,184,0,0.3)', backgroundColor: 'rgba(255,184,0,0.08)' },
  sharePillText: { color: '#FFB800', fontSize: 12, fontWeight: '700' },
  chartShotWrap: { backgroundColor: '#0B0B14', borderRadius: 20, paddingTop: 6, paddingBottom: 10 },
  shareWatermark: { color: 'rgba(255,214,102,0.62)', fontSize: 11, fontWeight: '700', textAlign: 'center', letterSpacing: 0.5, marginTop: 4 },

  // Contextual next-step CTA cards
  ctaCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, backgroundColor: 'rgba(20,18,32,0.6)', overflow: 'hidden' },
  ctaIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  ctaTitle: { color: '#F8E7B8', fontSize: 14.5, fontWeight: '800' },
  ctaSub: { color: 'rgba(255,255,255,0.68)', fontSize: 12, lineHeight: 16, marginTop: 2 },

  // "Today's sky" transit strip (daily-return hook)
  transitStrip: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(199,210,254,0.22)', backgroundColor: 'rgba(20,22,40,0.55)', overflow: 'hidden', marginBottom: 14 },
  transitIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(199,210,254,0.12)', borderWidth: 1, borderColor: 'rgba(199,210,254,0.28)' },
  transitEyebrow: { color: 'rgba(199,210,254,0.75)', fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2 },
  transitLine: { color: '#EDEAF6', fontSize: 13.5, fontWeight: '700', marginTop: 2, lineHeight: 18 },
  transitSub: { color: 'rgba(255,255,255,0.68)', fontSize: 12, marginTop: 2, lineHeight: 16 },

  // Free-teaser upgrade card (non-subscribers)
  upgradeCard: { marginTop: 20, padding: 20, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,184,0,0.3)', backgroundColor: 'rgba(20,15,8,0.7)', overflow: 'hidden' },
  upgradeLockRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  upgradeEyebrow: { color: '#FFB800', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  upgradeTitle: { color: '#F8E7B8', fontSize: 19, fontWeight: '900', marginTop: 8, ...textShadow('rgba(255,184,0,0.25)', { width: 0, height: 1 }, 8) },
  upgradeItem: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 5 },
  upgradeItemText: { color: 'rgba(255,255,255,0.82)', fontSize: 13.5, fontWeight: '600', flex: 1 },
  upgradeCountPill: { minWidth: 20, height: 20, borderRadius: 6, paddingHorizontal: 5, backgroundColor: 'rgba(255,184,0,0.18)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  upgradeCountNum: { color: '#FFD666', fontSize: 12, fontWeight: '900' },
  upgradeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  upgradeBtnText: { color: '#2A1707', fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },

  // AI explanation inline box
  aiExplainBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(255,184,0,0.05)',
    borderLeftWidth: 3, borderLeftColor: 'rgba(255,184,0,0.4)',
    borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10,
    marginHorizontal: 2, marginBottom: 12, marginTop: -2,
    borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderTopColor: 'rgba(255,184,0,0.10)', borderRightColor: 'rgba(255,184,0,0.10)', borderBottomColor: 'rgba(255,184,0,0.10)',
  },
  aiExplainBody: { flex: 1, minWidth: 0 },
  aiExplainLabel: { color: 'rgba(255,184,0,0.68)', fontSize: 10, lineHeight: 12, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 },
  aiExplainText: { color: 'rgba(255,214,102,0.65)', fontSize: 12, lineHeight: 19, fontStyle: 'italic' },

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
  stepTextPending: { color: 'rgba(255,255,255,0.55)' },
  loadingBarTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  loadingBarFill: { height: 4, backgroundColor: '#FFB800', borderRadius: 2 },

  // ── Maraka Apala styles ──
  marakaStatusOrb: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  marakaStatusTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  marakaStatusDesc: { color: 'rgba(255,255,255,0.68)', fontSize: 12, lineHeight: 18 },
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
  marakaSevText: { fontSize: 10, fontWeight: '800' },
  marakaApalaDesc: { color: 'rgba(255,214,102,0.62)', fontSize: 12, lineHeight: 18, marginTop: 4 },
  marakaPeriodRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  marakaPeriodText: { color: 'rgba(255,214,102,0.62)', fontSize: 11, fontWeight: '500' },
  marakaDaysLeftBadge: { backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  marakaDaysLeftText: { color: 'rgba(248,113,113,0.8)', fontSize: 10, fontWeight: '700' },
  marakaRemediesBox: {
    backgroundColor: 'rgba(16,185,129,0.05)', borderRadius: 10, padding: 12,
    marginTop: 10, borderWidth: 1, borderColor: 'rgba(16,185,129,0.15)',
  },
  marakaRemediesTitle: { color: '#10b981', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  marakaRemedyRow: { flexDirection: 'row', gap: 6, marginBottom: 4, paddingLeft: 2 },
  marakaRemedyBullet: { color: 'rgba(16,185,129,0.6)', fontSize: 12, fontWeight: '700' },
  marakaRemedyText: { color: 'rgba(255,255,255,0.68)', fontSize: 12, lineHeight: 18, flex: 1 },
  marakaTapHint: { color: 'rgba(255,255,255,0.55)', fontSize: 10, marginTop: 6, fontStyle: 'italic' },

  // ── Locked (free-user) teaser styles ──
  lockVaultHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 18, padding: 15, overflow: 'hidden', borderWidth: 1,
  },
  lockTease: { color: 'rgba(255,214,102,0.62)', fontSize: 12.5, lineHeight: 18, marginTop: 4, fontWeight: '500' },
  lockCountPill: { minWidth: 30, height: 24, borderRadius: 8, paddingHorizontal: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  lockCountNum: { fontSize: 13, fontWeight: '900' },
  lockChip: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 6 },

  // Locked chart panel (D9)
  lockChartWrap: {
    height: 250, borderRadius: 20, overflow: 'hidden', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  lockChartGrid: {
    position: 'absolute', width: 200, height: 200, flexDirection: 'row', flexWrap: 'wrap',
    opacity: 0.5, transform: [{ rotate: '45deg' }],
  },
  lockChartCell: { width: 50, height: 50, borderWidth: 1 },
  lockChartOverlay: { alignItems: 'center', paddingHorizontal: 28, gap: 10 },
  lockChartOrb: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  lockChartTease: { color: '#F3E7C8', fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
  lockChartCta: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, marginTop: 2 },
  lockChartCtaText: { fontSize: 13, fontWeight: '800' },

  // Inline locked value chip
  lockValueChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,184,0,0.10)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.28)', marginTop: 3,
  },
  lockValueChipText: { color: '#FFD666', fontSize: 11.5, fontWeight: '700' },

  // Free dasha skeleton
  lockDashaLadder: { marginTop: 12, gap: 3 },
  lockDashaRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 4 },
  lockDashaRowCurrent: { backgroundColor: 'rgba(255,184,0,0.05)', borderRadius: 8, marginHorizontal: -4, paddingHorizontal: 4 },
  lockDashaPlanet: { width: 62, fontSize: 12, fontWeight: '800' },
  lockDashaBarTrack: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  lockDashaBarFill: { height: 6, borderRadius: 3 },
  lockDashaYears: { width: 74, textAlign: 'right', color: 'rgba(255,214,102,0.62)', fontSize: 10, fontWeight: '600', fontVariant: ['tabular-nums'] },

  // Free yoga badge row
  lockYogaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12 },
  lockYogaMore: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,184,0,0.10)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.30)',
  },
  lockYogaMoreText: { color: '#FFD666', fontSize: 12, fontWeight: '800' },

  // Locked-depth section
  lockSectionIntro: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 10, paddingHorizontal: 2 },
  lockSectionIntroText: { color: 'rgba(255,214,102,0.7)', fontSize: 12, fontWeight: '700', letterSpacing: 0.3, flex: 1 },
  lockReadingHint: { color: 'rgba(255,184,0,0.6)', fontSize: 11.5, fontWeight: '600', marginTop: 8, fontStyle: 'italic' },
  lockVargaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  lockVargaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(6,182,212,0.08)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(6,182,212,0.22)',
  },
  lockVargaChipText: { color: '#06B6D4', fontSize: 11, fontWeight: '800' },

  // Ask-the-astrologer deep-link (Pro sections)
  askLinkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 12,
    backgroundColor: 'rgba(96,165,250,0.10)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(96,165,250,0.28)',
  },
  askLinkText: { color: '#60A5FA', fontSize: 12.5, fontWeight: '700' },

});

// ── Kendara Jyotish Styles ──
var kj = StyleSheet.create({
  // Dasha Timeline
  currentDashaBox: {
    borderRadius: 14, overflow: 'hidden', padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,140,0,0.20)',
  },
  currentDashaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  currentDashaDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFB800' },
  currentDashaLabel: { color: 'rgba(255,184,0,0.60)', fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  currentDashaPlanet: { color: '#FFB800', fontSize: 22, fontWeight: '900' },
  currentDashaSub: { color: 'rgba(255,214,102,0.62)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  currentDashaNote: { color: 'rgba(255,255,255,0.58)', fontSize: 12, lineHeight: 18, marginTop: 8, fontWeight: '500' },

  dashaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  dashaRowCurrent: { backgroundColor: 'rgba(255,184,0,0.04)', borderRadius: 10, marginHorizontal: -6, paddingHorizontal: 6 },
  dashaLeft: { width: 56, alignItems: 'flex-end' },
  dashaPlanet: { fontSize: 13, fontWeight: '800' },
  dashaYears: { color: 'rgba(255,214,102,0.55)', fontSize: 10, fontWeight: '600' },
  dashaBarWrap: { flex: 1 },
  dashaBarTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 3 },
  dashaBarFill: { height: 6, borderRadius: 3 },
  dashaDate: { color: 'rgba(255,214,102,0.55)', fontSize: 10, fontWeight: '500' },
  dashaLive: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFB800' },

  // Dosha/Sade Sati
  doshaOrb: {
    width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  doshaStatus: { fontSize: 15, fontWeight: '800', marginBottom: 3 },
  doshaDesc: { color: 'rgba(255,214,102,0.62)', fontSize: 12, lineHeight: 18 },

  // Chalit shifts
  chalitDesc: { color: 'rgba(255,214,102,0.62)', fontSize: 12, lineHeight: 18, marginBottom: 10 },
  chalitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  chalitDot: { width: 8, height: 8, borderRadius: 4 },
  chalitPlanet: { fontSize: 13, fontWeight: '700', width: 60 },
  chalitShiftBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(129,140,248,0.10)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(129,140,248,0.20)',
  },
  chalitShiftFrom: { color: 'rgba(255,255,255,0.68)', fontSize: 12, fontWeight: '700' },
  chalitShiftTo: { color: '#818CF8', fontSize: 12, fontWeight: '800' },
  chalitLabel: { color: 'rgba(129,140,248,0.68)', fontSize: 10, fontWeight: '600', flex: 1, textAlign: 'right' },

  // Varga picker
  vargaPickerRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  vargaPill: {
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', overflow: 'hidden', minWidth: 70,
  },
  vargaPillActive: { borderColor: 'rgba(6,182,212,0.40)' },
  vargaPillLabel: { color: 'rgba(255,214,102,0.68)', fontSize: 14, fontWeight: '900' },
  vargaPillLabelActive: { color: '#06B6D4' },
  vargaPillName: { color: 'rgba(255,214,102,0.55)', fontSize: 10, fontWeight: '600', marginTop: 2 },
  vargaPillNameActive: { color: 'rgba(6,182,212,0.65)' },

  // Varga chart display
  vargaAscRow: {
    gap: 4,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(6,182,212,0.15)',
    marginBottom: 4,
  },
  vargaAscLabel: { color: 'rgba(6,182,212,0.60)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  vargaAscValue: { color: '#06B6D4', fontSize: 14, lineHeight: 20, fontWeight: '800' },
  vargaPlanetRow: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)', gap: 5 },
  vargaPlanetTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  vargaPlanetName: { fontSize: 13, fontWeight: '800', lineHeight: 19 },
  vargaPlanetHint: { color: 'rgba(255,255,255,0.62)', fontSize: 11, lineHeight: 16, marginLeft: 16 },
  vargaPlanetRashi: {
    color: '#06B6D4', fontSize: 11, fontWeight: '800', textAlign: 'right', marginLeft: 8,
    backgroundColor: 'rgba(6,182,212,0.08)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
    overflow: 'hidden', maxWidth: 90,
  },
  vargaPlanetPlacement: { color: 'rgba(255,214,102,0.58)', fontSize: 12, lineHeight: 18, fontWeight: '600', marginLeft: 16 },
});
