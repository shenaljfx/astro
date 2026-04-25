import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Platform, ActivityIndicator, Share, Alert,
  LayoutAnimation, UIManager, Dimensions, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown, FadeIn, FadeOut, SlideInLeft, SlideInRight,
  ZoomIn, FadeInUp,
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
  withSequence, withRepeat, withDelay, Easing, interpolate,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import DesktopScreenWrapper, { useDesktopCtx } from '../../components/DesktopScreenWrapper';
import { DatePickerField, TimePickerField } from '../../components/CosmicDateTimePicker';
import SriLankanChart from '../../components/SriLankanChart';
import MarkdownText from '../../components/MarkdownText';
import SpringPressable from '../../components/effects/SpringPressable';
import CosmicLoader from '../../components/effects/CosmicLoader';
import CitySearchPicker from '../../components/CitySearchPicker';
import useScreenInsets from '../../hooks/useScreenInsets';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Colors, Typography } from '../../constants/theme';
import { boxShadow, textShadow } from '../../utils/shadow';
import PremiumBackground from '../../components/PremiumBackground';
import { generatePorondamHTML, loadLogoBase64 } from '../../utils/pdfReportGenerator';
import RadarChart from '../../components/RadarChart';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: W } = Dimensions.get('window');
const WIDE = W >= 700;
const MOBILE_CHART = Math.min(W - 64, 300);

// Default birth city (Colombo)
var DEFAULT_CITY = { name: 'Colombo', country: 'Sri Lanka', countryCode: 'LK', lat: 6.9271, lng: 79.8612 };

// Planet name translation helper
var PLANET_INFO = {
  Sun: { si: 'ඉර' }, Moon: { si: 'හඳ' }, Mars: { si: 'කුජ' },
  Mercury: { si: 'බුධ' }, Jupiter: { si: 'ගුරු' }, Venus: { si: 'සිකුරු' },
  Saturn: { si: 'ශනි' }, Rahu: { si: 'රාහු' }, Ketu: { si: 'කේතු' },
};

// Rashi name translation helper
var RASHI_SI = {
  Aries: 'මේෂ', Taurus: 'වෘෂභ', Gemini: 'මිථුන', Cancer: 'කටක',
  Leo: 'සිංහ', Virgo: 'කන්‍යා', Libra: 'තුලා', Scorpio: 'වෘශ්චික',
  Sagittarius: 'ධනු', Capricorn: 'මකර', Aquarius: 'කුම්භ', Pisces: 'මීන',
};

// Zodiac sign images by rashi ID (1=Aries...12=Pisces)
var ZODIAC_IMAGES = {
  1: require('../../assets/zodiac/aries.png'),
  2: require('../../assets/zodiac/taurus.png'),
  3: require('../../assets/zodiac/gemini.png'),
  4: require('../../assets/zodiac/cancer.png'),
  5: require('../../assets/zodiac/leo.png'),
  6: require('../../assets/zodiac/virgo.png'),
  7: require('../../assets/zodiac/libra.png'),
  8: require('../../assets/zodiac/scorpio.png'),
  9: require('../../assets/zodiac/sagittarius.png'),
  10: require('../../assets/zodiac/capricorn.png'),
  11: require('../../assets/zodiac/aquarius.png'),
  12: require('../../assets/zodiac/pisces.png'),
};
var RASHI_NAMES = ['', 'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

// Yoga category/strength Sinhala
var YOGA_CAT_SI = { 'Raja Yoga': 'රාජ යෝගය', 'Dhana Yoga': 'ධන යෝගය', 'Gnana Yoga': 'ඥාන යෝගය', 'Pancha Mahapurusha': 'පංච මහා පුරුෂ', 'Chandra Yoga': 'චන්ද්‍ර යෝගය', 'Special': 'විශේෂ', 'Arishta': 'අරිෂ්ට' };
var YOGA_STR_SI = { 'Strong': 'ප්‍රබල', 'Moderate': 'මධ්‍යම', 'Mild': 'සුළු', 'Very Strong': 'ඉතා ප්‍රබල', 'Exceptional': 'විශිෂ්ට' };

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

// ═══════════════════════════════════════════════════════════════
// CACHE CONSTANTS
// ═══════════════════════════════════════════════════════════════
var PORONDAM_CACHE_KEY = '@grahachara_saved_porondam';
var MAX_SAVED_PORONDAM = 10;

// ═══════════════════════════════════════════════════════════════
// SPECTACULAR LOADING SCREEN — Twin Star Convergence
// ═══════════════════════════════════════════════════════════════
var PORONDAM_LOADING_STAGES = {
  en: [
    { text: '🌌 Mapping the celestial connection...', sub: 'Tracing the invisible thread between two souls' },
    { text: '💫 Aligning your birth charts...', sub: 'The stars are revealing patterns of destiny' },
    { text: '🔮 Calculating the 7 sacred factors...', sub: 'Dina, Gana, Yoni, Rashi, Vasya, Nadi, Mahendra' },
    { text: '💎 Analyzing deep compatibility...', sub: 'Navamsha charts, Dashas, and planetary bonds' },
    { text: '💍 Your cosmic love story is ready...', sub: 'The universe has spoken about this union' },
  ],
  si: [
    { text: '🌌 දිව්‍ය සම්බන්ධය සිතියම් ගත කරමින්...', sub: 'ආත්ම දෙකක් අතර නොපෙනෙන නූල සොයමින්' },
    { text: '💫 උපන් කේන්දර ගැළපෙමින්...', sub: 'තරු ඉරණම ගැන රටා හෙළි කරයි' },
    { text: '🔮 පවිත්‍ර සාධක 7 ගණනය කරමින්...', sub: 'දින, ගණ, යෝනි, රාශි, වශ්‍ය, නාඩි, මහේන්ද්‍ර' },
    { text: '💎 ගැඹුරු ගැළපීම විශ්ලේෂණය කරමින්...', sub: 'නවාංශ, දශා, සහ ග්‍රහ බන්ධන' },
    { text: '💍 ඔබේ මහා ප්‍රේම කතාව සූදානමයි...', sub: 'විශ්වය මේ මිලනය ගැන කතා කළේය' },
  ],
};

// Floating Particle — tiny twinkling stars in loading screen
function LoadingParticle({ index, total }) {
  var angle = (index / total) * Math.PI * 2;
  var radius = 60 + Math.random() * 60;
  var x = Math.cos(angle) * radius;
  var y = Math.sin(angle) * radius;
  var size = 2 + Math.random() * 3;
  var delayMs = index * 80;

  var opacity = useSharedValue(0);
  useEffect(function () {
    opacity.value = withDelay(delayMs, withRepeat(withSequence(
      withTiming(0.8, { duration: 800 + Math.random() * 600 }),
      withTiming(0.1, { duration: 800 + Math.random() * 600 })
    ), -1, true));
  }, []);
  var style = useAnimatedStyle(function () { return { opacity: opacity.value }; });

  return (
    <Animated.View style={[{
      position: 'absolute', width: size, height: size, borderRadius: size / 2,
      backgroundColor: index % 3 === 0 ? '#F9A8D4' : index % 3 === 1 ? '#93C5FD' : '#FFB800',
      left: '50%', top: '50%', marginLeft: x - size / 2, marginTop: y - size / 2,
    }, style]} />
  );
}

// Twin-star convergence loader
function PorondamCosmicLoader({ brideName, groomName, language }) {
  var lang = language || 'en';
  var stages = PORONDAM_LOADING_STAGES[lang] || PORONDAM_LOADING_STAGES.en;
  var [stageIndex, setStageIndex] = useState(0);

  var brideOrbit = useSharedValue(0);
  var groomOrbit = useSharedValue(0);
  var centerPulse = useSharedValue(0.6);
  var ringRotation = useSharedValue(0);
  var heartScale = useSharedValue(0);
  var trailGlow = useSharedValue(0.2);
  var outerBreathe = useSharedValue(1);

  useEffect(function () {
    brideOrbit.value = withRepeat(withTiming(360, { duration: 4000, easing: Easing.linear }), -1, false);
    groomOrbit.value = withRepeat(withTiming(-360, { duration: 5200, easing: Easing.linear }), -1, false);
    centerPulse.value = withRepeat(withSequence(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      withTiming(0.6, { duration: 1400, easing: Easing.inOut(Easing.ease) })
    ), -1, true);
    ringRotation.value = withRepeat(withTiming(360, { duration: 12000, easing: Easing.linear }), -1, false);
    trailGlow.value = withRepeat(withSequence(
      withTiming(0.7, { duration: 2000 }), withTiming(0.2, { duration: 2000 })
    ), -1, true);
    outerBreathe.value = withRepeat(withSequence(
      withTiming(1.08, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      withTiming(0.95, { duration: 3000, easing: Easing.inOut(Easing.ease) })
    ), -1, true);
    heartScale.value = withDelay(2000, withSpring(1, { damping: 8, stiffness: 100 }));

    var interval = setInterval(function () {
      setStageIndex(function (prev) { return (prev + 1) % stages.length; });
    }, 4500);
    return function () { clearInterval(interval); };
  }, []);

  var brideStyle = useAnimatedStyle(function () {
    var rad = brideOrbit.value * Math.PI / 180;
    return { transform: [{ translateX: Math.cos(rad) * 65 }, { translateY: Math.sin(rad) * 30 }] };
  });
  var groomStyle = useAnimatedStyle(function () {
    var rad = groomOrbit.value * Math.PI / 180;
    return { transform: [{ translateX: Math.cos(rad) * 65 }, { translateY: Math.sin(rad) * 30 }] };
  });
  var centerStyle = useAnimatedStyle(function () {
    return { transform: [{ scale: centerPulse.value }], opacity: interpolate(centerPulse.value, [0.6, 1], [0.4, 1]) };
  });
  var ringStyle = useAnimatedStyle(function () {
    return { transform: [{ rotate: ringRotation.value + 'deg' }, { scale: outerBreathe.value }] };
  });
  var heartStyle = useAnimatedStyle(function () {
    return { transform: [{ scale: heartScale.value }], opacity: heartScale.value };
  });
  var glowStyle = useAnimatedStyle(function () { return { opacity: trailGlow.value }; });

  var stage = stages[stageIndex];
  var personalMsg = lang === 'si'
    ? ((brideName && groomName) ? brideName + ' & ' + groomName + ' — තරු ගැළපේදැයි බලමින්... 💫' : 'තරු අතර සම්බන්ධය සොයමින්... 💫')
    : ((brideName && groomName) ? brideName + ' & ' + groomName + ' — Reading your stars... 💫' : 'Reading the cosmic connection... 💫');

  return (
    <Animated.View entering={ZoomIn.springify().damping(14)} style={lsStyles.container}>
      <View style={lsStyles.orbitArena}>
        {Array.from({ length: 24 }).map(function (_, i) { return <LoadingParticle key={i} index={i} total={24} />; })}

        {/* Outer rotating ring */}
        <Animated.View style={[lsStyles.outerRing, ringStyle]}>
          <View style={lsStyles.outerRingBorder} />
        </Animated.View>
        <View style={lsStyles.midRing} />

        {/* Inner glow */}
        <Animated.View style={[lsStyles.innerGlow, glowStyle]}>
          <LinearGradient colors={['rgba(244,63,94,0.25)', 'rgba(147,197,253,0.20)', 'transparent']}
            style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        </Animated.View>

        {/* Center heart */}
        <Animated.View style={[lsStyles.centerHeart, heartStyle]}>
          <LinearGradient colors={['rgba(255,140,0,0.35)', 'rgba(192,38,211,0.25)', 'rgba(99,102,241,0.20)']}
            style={[StyleSheet.absoluteFill, { borderRadius: 28 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <Text style={{ fontSize: 28 }}>💍</Text>
        </Animated.View>

        {/* Bride star */}
        <Animated.View style={[lsStyles.star, lsStyles.brideStar, brideStyle]}>
          <LinearGradient colors={['#F9A8D4', '#EC4899', '#BE185D']} style={lsStyles.starInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <Text style={lsStyles.starEmoji}>👰</Text>
        </Animated.View>

        {/* Groom star */}
        <Animated.View style={[lsStyles.star, lsStyles.groomStar, groomStyle]}>
          <LinearGradient colors={['#93C5FD', '#3B82F6', '#1D4ED8']} style={lsStyles.starInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <Text style={lsStyles.starEmoji}>🤵</Text>
        </Animated.View>

        {/* Center pulse ring */}
        <Animated.View style={[lsStyles.pulseRing, centerStyle]} />
      </View>

      {/* Stage text */}
      <Animated.View entering={FadeIn.duration(500)} key={'s' + stageIndex} style={lsStyles.textWrap}>
        <Text style={lsStyles.stageText}>{stage.text}</Text>
        <Text style={lsStyles.stageSub}>{stage.sub}</Text>
      </Animated.View>

      <Text style={lsStyles.personalText}>{personalMsg}</Text>

      {/* Progress */}
      <View style={lsStyles.progressRow}>
        <View style={lsStyles.progressBar}>
          <LinearGradient colors={['#EC4899', '#FF8C00', '#3B82F6']}
            style={[lsStyles.progressFill, { width: ((stageIndex + 1) / stages.length * 100) + '%' }]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
        </View>
        <Text style={lsStyles.progressHint}>{lang === 'si' ? 'තත්පර කිහිපයක් ගතවේ...' : 'Just a few moments...'}</Text>
      </View>
    </Animated.View>
  );
}

var lsStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  orbitArena: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  outerRing: { position: 'absolute', width: 200, height: 200, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  outerRingBorder: { width: 200, height: 200, borderRadius: 100, borderWidth: 1.5, borderColor: 'rgba(255,140,0,0.18)', borderStyle: 'dashed' },
  midRing: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 1, borderColor: 'rgba(192,38,211,0.15)', borderStyle: 'dashed' },
  innerGlow: { position: 'absolute', width: 100, height: 100, borderRadius: 50, overflow: 'hidden' },
  centerHeart: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,140,0,0.35)', zIndex: 15 },
  star: { position: 'absolute', width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2 },
  brideStar: { borderColor: 'rgba(249,168,212,0.7)' },
  groomStar: { borderColor: 'rgba(147,197,253,0.7)' },
  starInner: { ...StyleSheet.absoluteFillObject, borderRadius: 21 },
  starEmoji: { fontSize: 20, zIndex: 10 },
  pulseRing: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: 'rgba(255,184,0,0.20)' },
  textWrap: { alignItems: 'center', marginBottom: 16, minHeight: 60 },
  stageText: { color: '#FFE8B0', fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 8, lineHeight: 24 },
  stageSub: { color: 'rgba(255,214,102,0.45)', fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 10 },
  personalText: { color: '#FF8C00', fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 20, fontStyle: 'italic' },
  progressRow: { width: '100%', alignItems: 'center' },
  progressBar: { width: '80%', height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 2 },
  progressHint: { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '600' },
});

function ScoreGauge({ score, maxScore, rating, ratingEmoji, ratingSinhala, language, onShare, T, brideName, groomName, factors, brideRashiId, groomRashiId }) {
  var pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  var color = pct >= 75 ? '#34D399' : pct >= 50 ? '#FFB800' : pct >= 30 ? '#F97316' : '#F87171';

  var cosmicLabel = pct >= 75
    ? (language === 'si' ? '✨ දිව්‍ය ගැළපීම' : '✨ Celestial Union')
    : pct >= 50
    ? (language === 'si' ? '💫 තාරකා ගැළපීම' : '💫 Star-Crossed Harmony')
    : pct >= 30
    ? (language === 'si' ? '🌅 බ්‍රහ්මාණ්ඩ ගාඡාව' : '🌅 Cosmic Journey')
    : (language === 'si' ? '⚔️ ජ්‍යෝතිෂ අභියෝගය' : '⚔️ Galactic Challenge');

  var label = language === 'si' && ratingSinhala ? ratingSinhala : rating;
  var brideZodiac = ZODIAC_IMAGES[brideRashiId] || ZODIAC_IMAGES[1];
  var groomZodiac = ZODIAC_IMAGES[groomRashiId] || ZODIAC_IMAGES[1];
  var brideRashiName = RASHI_NAMES[brideRashiId] || 'Aries';
  var groomRashiName = RASHI_NAMES[groomRashiId] || 'Aries';

  return (
    <View>
      {/* Avatar circles with zodiac signs */}
      <Glass accent style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, paddingVertical: 16 }}>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(249,168,212,0.10)', borderWidth: 2, borderColor: 'rgba(249,168,212,0.30)', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' }}>
              <Image source={brideZodiac} style={{ width: 52, height: 52 }} resizeMode="contain" />
            </View>
            <Text style={{ color: '#F9A8D4', fontSize: 13, fontWeight: '800' }}>{brideName || (language === 'si' ? 'මනාලිය' : 'Bride')}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '600', marginTop: 2 }}>{language === 'si' ? (RASHI_SI[brideRashiName] || brideRashiName) : brideRashiName}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 60, height: 60, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: color + '50', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: color }}>{pct}<Text style={{ fontSize: 12 }}>%</Text></Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '600', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {language === 'si' ? 'ගැළපීම' : 'Match'}
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(147,197,253,0.10)', borderWidth: 2, borderColor: 'rgba(147,197,253,0.30)', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' }}>
              <Image source={groomZodiac} style={{ width: 52, height: 52 }} resizeMode="contain" />
            </View>
            <Text style={{ color: '#93C5FD', fontSize: 13, fontWeight: '800' }}>{groomName || (language === 'si' ? 'මනාලයා' : 'Groom')}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '600', marginTop: 2 }}>{language === 'si' ? (RASHI_SI[groomRashiName] || groomRashiName) : groomRashiName}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'center', paddingBottom: 12 }}>
          <Text style={{ color: color, fontSize: 16, fontWeight: '800', marginBottom: 4 }}>
            {language === 'si' ? 'එකාබද්ධ ගැළපීම  ~ ' + pct + '%' : 'Overall compatibility  ~ ' + pct + '%'}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' }}>{cosmicLabel}</Text>
        </View>
      </Glass>

      {/* Radar Chart */}
      {factors && factors.length >= 3 && (
        <Glass style={{ marginBottom: 14, alignItems: 'center', paddingVertical: 20 }}>
          <RadarChart
            factors={factors}
            size={Math.min(W - 24, 420)}
            color1="#A78BFA"
            color2="#FFB800"
            animated={true}
            labels={factors.map(function (f) {
              var friendly = {
                Dina: language === 'si' ? 'දෛනික හැඟීම්' : 'Daily Vibes',
                Gana: language === 'si' ? 'ස්වභාවය' : 'Temperament',
                Yoni: language === 'si' ? 'සමීපතාව' : 'Intimacy',
                Rashi: language === 'si' ? 'මානසික ගැළපීම' : 'Mind Match',
                Vasya: language === 'si' ? 'ආකර්ෂණය' : 'Attraction',
                Nadi: language === 'si' ? 'සෞඛ්‍යය' : 'Health',
                Mahendra: language === 'si' ? 'සමෘද්ධිය' : 'Prosperity',
              };
              return friendly[f.name] || (language === 'si' && f.sinhala ? f.sinhala : f.name);
            })}
          />
        </Glass>
      )}

      {/* Rating + Actions */}
      <Glass>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={sty.gaugeRating}>{ratingEmoji || '💍'} {label}</Text>
            <Text style={sty.gaugeScoreText}>{score}/{maxScore} {T.overall}</Text>
          </View>
          <TouchableOpacity style={sty.shareChip} onPress={onShare} activeOpacity={0.7}>
            <Ionicons name="share-social-outline" size={14} color="#FF8C00" />
            <Text style={sty.shareChipText}>{T.shareBtn}</Text>
          </TouchableOpacity>
        </View>
      </Glass>
    </View>
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
          <Text style={sty.factorName}>{language === 'si' && f.sinhala ? f.sinhala : f.name}</Text>
          {language !== 'si' && f.sinhala ? <Text style={sty.factorSinhala}>{f.sinhala}</Text> : null}
          {language === 'si' ? <Text style={sty.factorSinhala}>{f.name}</Text> : null}
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
    title: 'Compatibility', subtitle: 'Marriage Compatibility Check',
    bride: '\uD83D\uDC70 Bride', groom: '\uD83E\uDD35 Groom',
    namePh: 'Name (optional)',
    yearPh: 'YYYY', monthPh: 'MM', dayPh: 'DD', hourPh: 'HH', minutePh: 'MM',
    date: 'Date of Birth', time: 'Time',
    birthPlace: 'Birth Place',
    timeHint: '* Check birth certificate for exact time',
    checkBtn: '\uD83D\uDC8D Check Compatibility',
    brideChart: "Bride's Chart", groomChart: "Groom's Chart",
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
  var { isLoggedIn, showPaywall } = useAuth();
  var T = L[language] || L.en;
  var isDesktop = useDesktopCtx();
  var insets = useScreenInsets();

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
  var [savedChecks, setSavedChecks] = useState([]);
  var [showHistory, setShowHistory] = useState(false);

  // ── Load saved porondam checks from AsyncStorage on mount ──
  useEffect(function() {
    (async function() {
      try {
        var stored = await AsyncStorage.getItem(PORONDAM_CACHE_KEY);
        if (stored) {
          setSavedChecks(JSON.parse(stored));
        }
      } catch (e) {
        console.warn('Failed to load saved porondam:', e);
      }
    })();
  }, []);

  // Save a porondam result to cache
  var savePorondamToCache = useCallback(async function(porondamData) {
    try {
      var entry = {
        id: Date.now().toString(),
        brideName: porondamData.brideName || '',
        groomName: porondamData.groomName || '',
        brideDate: porondamData.brideDate,
        brideTime: porondamData.brideTime,
        brideCity: porondamData.brideCity,
        groomDate: porondamData.groomDate,
        groomTime: porondamData.groomTime,
        groomCity: porondamData.groomCity,
        reportLang: porondamData.reportLang,
        data: porondamData.data,
        report: porondamData.report,
        porondamId: porondamData.porondamId,
        savedAt: new Date().toISOString(),
      };
      var updated = [entry].concat(savedChecks).slice(0, MAX_SAVED_PORONDAM);
      await AsyncStorage.setItem(PORONDAM_CACHE_KEY, JSON.stringify(updated));
      setSavedChecks(updated);
    } catch (e) {
      console.warn('Failed to save porondam:', e);
    }
  }, [savedChecks]);

  // Delete a saved check
  var deleteSavedCheck = useCallback(async function(checkId) {
    try {
      var updated = savedChecks.filter(function(c) { return c.id !== checkId; });
      await AsyncStorage.setItem(PORONDAM_CACHE_KEY, JSON.stringify(updated));
      setSavedChecks(updated);
    } catch (e) {
      console.warn('Failed to delete porondam:', e);
    }
  }, [savedChecks]);

  // Load a saved check
  var loadSavedCheck = useCallback(function(entry) {
    setBName(entry.brideName || '');
    setGName(entry.groomName || '');
    setBDate(entry.brideDate || '1998-01-15');
    setBTime(entry.brideTime || '08:30');
    setBCity(entry.brideCity || DEFAULT_CITY);
    setGDate(entry.groomDate || '1998-06-20');
    setGTime(entry.groomTime || '10:00');
    setGCity(entry.groomCity || DEFAULT_CITY);
    setReportLang(entry.reportLang || 'en');
    setData(entry.data);
    setReport(entry.report || null);
    setPorondamId(entry.porondamId || null);
    setCollapsed(true);
    setShowHistory(false);
    setError(null);
  }, []);

  // Sync report language when app language changes (only when no data yet)
  useEffect(function() {
    if (!data) setReportLang(language || 'en');
  }, [language]);

  function buildDateISO(dateStr, timeStr) {
    return dateStr + 'T' + (timeStr || '12:00') + ':00';
  }

  var check = useCallback(async function() {
    if (!bDate || !gDate) {
      Alert.alert('', T.missing); return;
    }

    // ── Check for pending entitlement (retry after failed generation) ──
    var isRetry = false;
    try {
      var entCheck = await api.checkEntitlement('porondam', {
        brideBirth: bDate,
        groomBirth: gDate,
        language: reportLang,
      });
      if (entCheck && entCheck.hasPending) {
        isRetry = true;
        console.log('[Porondam] ♻️ Resuming failed generation — no payment needed (' + entCheck.entitlement.retriesLeft + ' retries left)');
      }
    } catch (entErr) {
      // Non-critical — proceed with normal payment flow
      console.warn('[Porondam] Entitlement check failed (non-critical):', entErr.message);
    }

    // Show paywall only if NOT a retry (pending entitlement = free retry)
    if (!isRetry) {
      try {
        await showPaywall('porondam');
      } catch (e) {
        // User cancelled payment — do not proceed
        return;
      }
    }

    // Payment succeeded — now run the compatibility check
    try {
      setLoading(true); setError(null); setData(null); setReport(null); setPorondamId(null);

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

      // Save to cache
      savePorondamToCache({
        brideName: bName,
        groomName: gName,
        brideDate: bDate,
        brideTime: bTime,
        brideCity: bCity,
        groomDate: gDate,
        groomTime: gTime,
        groomCity: gCity,
        reportLang: reportLang,
        data: checkRes.data,
        report: reportRes?.report || null,
        porondamId: checkRes.porondamId || reportRes?.porondamId || null,
      });

      setTimeout(function() { if (scrollRef.current) scrollRef.current.scrollTo({ y: 0, animated: true }); }, 300);
    } catch (e) {
      var msg = e.message || 'Error';
      setError(msg);
    } finally {
      setLoading(false);
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
        // A4 dimensions in points (1 inch = 72pt). Explicit dimensions help
        // the Android renderer; without them some devices reject the print
        // when HTML is large or contains heavy SVG.
        var printOpts = { html: html, base64: false, width: 595, height: 842 };
        var result;
        try {
          result = await Print.printToFileAsync(printOpts);
        } catch (printErr) {
          // Fallback: retry once with a minimal HTML (text-only) so the user
          // still gets a PDF rather than losing their generated content.
          if (__DEV__) console.warn('[Porondam] printToFileAsync failed, retrying with minimal HTML:', printErr && printErr.message);
          var fallback = '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Porondam</title>'
            + '<style>body{font-family:sans-serif;padding:24px;color:#222;line-height:1.6;}h1{color:#7C3AED;}h2{margin-top:18px;}p{margin:6px 0;}</style>'
            + '</head><body>'
            + '<h1>' + (isSi ? '\u0DB4\u0DDC\u0DBB\u0DDC\u0DB1\u0DCA\u0DAF\u0DB8\u0DCA' : 'Porondam Report') + '</h1>'
            + '<p><b>' + (bName || 'Bride') + ' &amp; ' + (gName || 'Groom') + '</b></p>'
            + '<p>' + (isSi ? '\u0DBD\u0D9A\u0DD4\u0DAB\u0DD4' : 'Score') + ': ' + (data.totalScore || 0) + ' / ' + (data.maxPossibleScore || 20) + ' (' + (data.percentage || 0) + '%)</p>'
            + '<p>' + (data.ratingSinhala || data.rating || '') + '</p>'
            + (report && report.summary ? '<h2>' + (isSi ? '\u0DC3\u0DCF\u0DBB\u0DCF\u0D82\u0DC1\u0DBA' : 'Summary') + '</h2><p>' + String(report.summary).replace(/[<>]/g, '') + '</p>' : '')
            + '</body></html>';
          result = await Print.printToFileAsync({ html: fallback, base64: false, width: 595, height: 842 });
        }
        await Sharing.shareAsync(result.uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: fileName });
      }
    } catch (err) {
      var isSiErr = language === 'si';
      Alert.alert(
        isSiErr ? '\u0DAF\u0DDD\u0DC2\u0DBA\u0D9A\u0DD2' : 'Error',
        isSiErr ? 'PDF \u0DC3\u0DD0\u0D9A\u0DC3\u0DD3\u0DB8\u0DA7 \u0D85\u0DC3\u0DB8\u0DAD\u0DCA \u0DC0\u0DD2\u0DBA. \u0DB1\u0DD0\u0DC0\u0DAD \u0D8B\u0DAD\u0DCA\u0DC3\u0DC4 \u0D9A\u0DBB\u0DB1\u0DCA\u0DB1.' : 'Failed to generate PDF. Please try again.'
      );
    }
  };

  var shareResult = async function() {
    try {
      var msg = language === 'si'
        ? '\u0DB4\u0DDC\u0DBB\u0DDC\u0DB1\u0DCA\u0DAF\u0DB8\u0DCA: ' + data.totalScore + '/' + data.maxPossibleScore + ' (' + data.percentage + '%) \u2014 ' + (data.ratingSinhala || data.rating) + '\n\nGrahachara \uD83D\uDC8D'
        : 'Compatibility: ' + data.totalScore + '/' + data.maxPossibleScore + ' (' + data.percentage + '%) \u2014 ' + data.rating + '\n\nGrahachara \uD83D\uDC8D';
      await Share.share({ message: msg });
    } catch (e) {}
  };

  // ── FULL SCREEN LOADING ─────────────────────────────────
  if (loading) {
    return (
      <DesktopScreenWrapper routeName="porondam">
        <View style={{ flex: 1, backgroundColor: '#04030C', justifyContent: 'center', alignItems: 'center' }}>
          <PremiumBackground />
          <PorondamCosmicLoader brideName={bName} groomName={gName} language={language} />
        </View>
      </DesktopScreenWrapper>
    );
  }

  return (
    <DesktopScreenWrapper routeName="porondam">
    <View style={{ flex: 1, backgroundColor: '#04030C' }}>
      <PremiumBackground />
      <ScrollView ref={scrollRef} style={sty.flex} contentContainerStyle={[sty.scroll, isDesktop && sty.scrollDesktop, !isDesktop && { paddingTop: insets.contentTop, paddingBottom: insets.contentBottom }]} showsVerticalScrollIndicator={false}>
        <View style={[sty.scrollInner, isDesktop && sty.scrollInnerDesktop]}>

        <Animated.View entering={FadeInDown.duration(600)}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={sty.title}>{T.title}</Text>
              <Text style={sty.subtitle}>{T.subtitle}</Text>
            </View>
            {savedChecks.length > 0 && !collapsed && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,140,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,140,0,0.18)', marginTop: 4 }}
                onPress={function() { setShowHistory(!showHistory); }} activeOpacity={0.7}>
                <Ionicons name={showHistory ? 'close-outline' : 'time-outline'} size={14} color="#FF8C00" />
                <Text style={{ color: '#FF8C00', fontSize: 11, fontWeight: '700' }}>{savedChecks.length}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* ── SAVED HISTORY ── */}
        {showHistory && savedChecks.length > 0 && !collapsed && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <Glass style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="time-outline" size={16} color="#FF8C00" />
                  <Text style={{ color: '#FFE8B0', fontSize: 14, fontWeight: '800' }}>{T.history}</Text>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>{savedChecks.length} {language === 'si' ? 'සුරකින ලද' : 'saved'}</Text>
              </View>
              <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                {savedChecks.map(function(entry, idx) {
                  var pct = entry.data?.maxPossibleScore > 0 ? Math.round((entry.data?.totalScore || 0) / entry.data.maxPossibleScore * 100) : 0;
                  var pctColor = pct >= 75 ? '#34D399' : pct >= 50 ? '#FFB800' : pct >= 30 ? '#F97316' : '#F87171';
                  var dateLabel = entry.savedAt ? new Date(entry.savedAt).toLocaleDateString() : '';
                  return (
                    <Animated.View key={entry.id} entering={FadeInDown.delay(idx * 60).duration(300)}>
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: idx < savedChecks.length - 1 ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.04)' }}
                        onPress={function() { loadSavedCheck(entry); }} activeOpacity={0.7}>
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: pctColor + '15', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: pctColor + '30' }}>
                          <Text style={{ color: pctColor, fontSize: 14, fontWeight: '900' }}>{pct}%</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#FFE8B0', fontSize: 13, fontWeight: '700' }}>
                            {(entry.brideName || '👰') + '  ×  ' + (entry.groomName || '🤵')}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{entry.data?.totalScore || 0}/{entry.data?.maxPossibleScore || 20}</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.15)', fontSize: 9 }}>•</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>{dateLabel}</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={{ padding: 8 }}
                          onPress={function(e) { e.stopPropagation && e.stopPropagation(); deleteSavedCheck(entry.id); }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Ionicons name="trash-outline" size={14} color="rgba(248,113,113,0.5)" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </ScrollView>
            </Glass>
          </Animated.View>
        )}

        {!collapsed && !showHistory && (
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

        {error && <Glass><Text style={sty.errorText}>{error}</Text></Glass>}

        {data && !loading && (
          <View>
            <Animated.View entering={ZoomIn.springify().damping(12).delay(50)}>
              <ScoreGauge score={data.totalScore} maxScore={data.maxPossibleScore}
                rating={data.rating} ratingEmoji={data.ratingEmoji}
                ratingSinhala={data.ratingSinhala} language={language}
                onShare={shareResult} T={T}
                brideName={bName} groomName={gName} factors={data.factors}
                brideRashiId={data.brideChart && data.brideChart.lagnaRashiId}
                groomRashiId={data.groomChart && data.groomChart.lagnaRashiId} />
            </Animated.View>

            {/* Action buttons row */}
            <Animated.View entering={FadeIn.delay(200).duration(400)}>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <TouchableOpacity
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,140,0,0.25)', backgroundColor: 'rgba(255,140,0,0.06)' }}
                  activeOpacity={0.7}
                  onPress={function() {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setCollapsed(false); setData(null); setReport(null); setPorondamId(null); setError(null); setShowHistory(false);
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
              {data.brideChart && data.brideChart.rashiChart && (
                <Animated.View entering={FadeInUp.delay(200).duration(600).springify()} style={WIDE ? sty.chartCol : undefined}>
                  <Glass style={sty.chartCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F9A8D4' }} />
                      <Text style={sty.chartTitle}>{T.brideChart}</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <SriLankanChart rashiChart={data.brideChart.rashiChart} lagnaRashiId={data.brideChart.lagnaRashiId} language={language}
                        chartSize={WIDE ? Math.min(320, (W - 140) / 2) : MOBILE_CHART} />
                    </View>
                  </Glass>
                </Animated.View>
              )}
              {WIDE && (
                <Animated.View entering={ZoomIn.delay(500).duration(700)} style={[sty.heartBridge, sty.heartBridgeWide]}>
                  <Text style={{ fontSize: 24 }}>{'\uD83D\uDC95'}</Text>
                </Animated.View>
              )}
              {!WIDE && data.brideChart && data.groomChart && (
                <Animated.View entering={ZoomIn.delay(400).duration(500)} style={{ alignItems: 'center', paddingVertical: 6 }}>
                  <View style={{ width: 1, height: 20, backgroundColor: 'rgba(255,140,0,0.15)' }} />
                  <Text style={{ fontSize: 20, marginVertical: 2 }}>{'\uD83D\uDC95'}</Text>
                  <View style={{ width: 1, height: 20, backgroundColor: 'rgba(255,140,0,0.15)' }} />
                </Animated.View>
              )}
              {data.groomChart && data.groomChart.rashiChart && (
                <Animated.View entering={FadeInUp.delay(400).duration(600).springify()} style={WIDE ? sty.chartCol : undefined}>
                  <Glass style={sty.chartCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#93C5FD' }} />
                      <Text style={sty.chartTitle}>{T.groomChart}</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <SriLankanChart rashiChart={data.groomChart.rashiChart} lagnaRashiId={data.groomChart.lagnaRashiId} language={language}
                        chartSize={WIDE ? Math.min(320, (W - 140) / 2) : MOBILE_CHART} />
                    </View>
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
                          <Text style={sty.doshaName}>{language === 'si' && d.sinhala ? d.sinhala : d.name}{language !== 'si' && d.sinhala ? ' (' + d.sinhala + ')' : ''}</Text>
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
                                <Text style={[sty.doshaName, { fontSize: 13, marginBottom: 0 }, d.cancelled && { textDecorationLine: 'line-through', color: 'rgba(255,255,255,0.3)' }]}>{language === 'si' ? (d.sinhala || d.name) : d.name}</Text>
                                <View style={{ backgroundColor: col + '25', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                  <Text style={{ color: col, fontSize: 8, fontWeight: '800' }}>{d.cancelled ? (language === 'si' ? '\u0DB1\u0DD2\u0DC0\u0DCF\u0DBB\u0DAB\u0DBA' : 'CANCELLED') : (language === 'si' ? (d.severity === 'Severe' ? '\u0DAF\u0DBB\u0DD4\u0DAB\u0DD4' : d.severity === 'Moderate' ? '\u0DB8\u0DB0\u0DCA\u200D\u0DBA\u0DB8' : '\u0DC3\u0DD4\u0DC5\u0DD4') : d.severity)}</Text>
                                </View>
                              </View>
                              <Text style={sty.doshaDesc}>{language === 'si' ? (d.descriptionSi || d.description) : d.description}</Text>
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
                                <Text style={[sty.doshaName, { fontSize: 13, marginBottom: 0 }, d.cancelled && { textDecorationLine: 'line-through', color: 'rgba(255,255,255,0.3)' }]}>{language === 'si' ? (d.sinhala || d.name) : d.name}</Text>
                                <View style={{ backgroundColor: col + '25', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                  <Text style={{ color: col, fontSize: 8, fontWeight: '800' }}>{d.cancelled ? (language === 'si' ? '\u0DB1\u0DD2\u0DC0\u0DCF\u0DBB\u0DAB\u0DBA' : 'CANCELLED') : (language === 'si' ? (d.severity === 'Severe' ? '\u0DAF\u0DBB\u0DD4\u0DAB\u0DD4' : d.severity === 'Moderate' ? '\u0DB8\u0DB0\u0DCA\u200D\u0DBA\u0DB8' : '\u0DC3\u0DD4\u0DC5\u0DD4') : d.severity)}</Text>
                                </View>
                              </View>
                              <Text style={sty.doshaDesc}>{language === 'si' ? (d.descriptionSi || d.description) : d.description}</Text>
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
                                <Text style={{ color: '#FFE8B0', fontSize: 13, fontWeight: '700' }}>{language === 'si' ? (y.sinhala || y.name) : y.name}</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>{language === 'si' ? (YOGA_CAT_SI[y.category] || y.category) : y.category} • {language === 'si' ? (YOGA_STR_SI[y.strength] || y.strength) : y.strength}</Text>
                              </View>
                            </View>
                          );
                        })}
                        {person.yogas.length > 6 && (
                          <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontStyle: 'italic', paddingLeft: 20 }}>
                            + {person.yogas.length - 6} {language === 'si' ? 'තව යෝග' : 'more yogas'}
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
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 2 }}>{language === 'si' ? 'ආත්මකාරක' : 'Atmakaraka'}</Text>
                        <Text style={{ color: '#FFE8B0', fontSize: 14, fontWeight: '700', marginBottom: 6 }}>{language === 'si' ? (PLANET_INFO[data.brideAdvanced.tier1.jaimini.atmakaraka?.planet]?.si || data.brideAdvanced.tier1.jaimini.atmakaraka?.planet || 'N/A') : (data.brideAdvanced.tier1.jaimini.atmakaraka?.planet || 'N/A')}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 2 }}>{language === 'si' ? 'උපපද' : 'Upapada'}</Text>
                        <Text style={{ color: '#FFE8B0', fontSize: 14, fontWeight: '700' }}>{language === 'si' ? (RASHI_SI[data.brideAdvanced.tier1.jaimini.upapadaLagna?.rashi] || data.brideAdvanced.tier1.jaimini.upapadaLagna?.rashi || 'N/A') : (data.brideAdvanced.tier1.jaimini.upapadaLagna?.rashi || 'N/A')}</Text>
                      </View>
                    )}
                    {data.groomAdvanced?.tier1?.jaimini && (
                      <View style={{ flex: 1, backgroundColor: 'rgba(147,197,253,0.06)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(147,197,253,0.12)' }}>
                        <Text style={{ color: '#93c5fd', fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                          {'\uD83E\uDD35'} {gName || (language === 'si' ? '\u0DB8\u0DB1\u0DCF\u0DBD\u0DBA\u0DCF' : 'Groom')}
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 2 }}>{language === 'si' ? 'ආත්මකාරක' : 'Atmakaraka'}</Text>
                        <Text style={{ color: '#FFE8B0', fontSize: 14, fontWeight: '700', marginBottom: 6 }}>{language === 'si' ? (PLANET_INFO[data.groomAdvanced.tier1.jaimini.atmakaraka?.planet]?.si || data.groomAdvanced.tier1.jaimini.atmakaraka?.planet || 'N/A') : (data.groomAdvanced.tier1.jaimini.atmakaraka?.planet || 'N/A')}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 2 }}>{language === 'si' ? 'උපපද' : 'Upapada'}</Text>
                        <Text style={{ color: '#FFE8B0', fontSize: 14, fontWeight: '700' }}>{language === 'si' ? (RASHI_SI[data.groomAdvanced.tier1.jaimini.upapadaLagna?.rashi] || data.groomAdvanced.tier1.jaimini.upapadaLagna?.rashi || 'N/A') : (data.groomAdvanced.tier1.jaimini.upapadaLagna?.rashi || 'N/A')}</Text>
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
                      {data.advancedPorondam.combined.ratingEmoji} {language === 'si' ? (data.advancedPorondam.combined.ratingSi || data.advancedPorondam.combined.rating) : data.advancedPorondam.combined.rating}
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
                          <Text style={{ color: '#FFE8B0', fontSize: 16, fontWeight: '800', marginBottom: 4 }}>{language === 'si' ? (PLANET_INFO[p.dasha.currentDasha]?.si || p.dasha.currentDasha) : p.dasha.currentDasha}</Text>
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
                    {language === 'si' ? (data.advancedPorondam.advanced.dashaCompatibility.descriptionSi || data.advancedPorondam.advanced.dashaCompatibility.description) : data.advancedPorondam.advanced.dashaCompatibility.description}
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
                      <Text style={{ color: '#FFE8B0', fontSize: 15, fontWeight: '800', marginTop: 4 }}>{language === 'si' ? (data.advancedPorondam.advanced.navamshaCompatibility.brideD9LagnaSi || RASHI_SI[data.advancedPorondam.advanced.navamshaCompatibility.brideD9Lagna] || data.advancedPorondam.advanced.navamshaCompatibility.brideD9Lagna) : data.advancedPorondam.advanced.navamshaCompatibility.brideD9Lagna}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center', padding: 10, backgroundColor: 'rgba(147,197,253,0.06)', borderRadius: 12 }}>
                      <Text style={{ color: '#93c5fd', fontSize: 10, fontWeight: '700' }}>{'\uD83E\uDD35'} D9 {language === 'si' ? '\u0DBD\u0D9C\u0DCA\u0DB1\u0DBA' : 'Rising'}</Text>
                      <Text style={{ color: '#FFE8B0', fontSize: 15, fontWeight: '800', marginTop: 4 }}>{language === 'si' ? (data.advancedPorondam.advanced.navamshaCompatibility.groomD9LagnaSi || RASHI_SI[data.advancedPorondam.advanced.navamshaCompatibility.groomD9Lagna] || data.advancedPorondam.advanced.navamshaCompatibility.groomD9Lagna) : data.advancedPorondam.advanced.navamshaCompatibility.groomD9Lagna}</Text>
                    </View>
                  </View>
                  {(language === 'si' ? (data.advancedPorondam.advanced.navamshaCompatibility.insightsSi || data.advancedPorondam.advanced.navamshaCompatibility.insights || []) : (data.advancedPorondam.advanced.navamshaCompatibility.insights || [])).map(function(insight, i) {
                    return (
                      <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 6, paddingLeft: 4 }}>
                        <Text style={{ color: '#FF8C00', fontSize: 12 }}>{'\u2728'}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, flex: 1, lineHeight: 18 }}>{insight}</Text>
                      </View>
                    );
                  })}
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 6, fontStyle: 'italic' }}>
                    {language === 'si' ? (data.advancedPorondam.advanced.navamshaCompatibility.descriptionSi || data.advancedPorondam.advanced.navamshaCompatibility.description) : data.advancedPorondam.advanced.navamshaCompatibility.description}
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
                    {language === 'si' ? (data.advancedPorondam.advanced.mangalaDosha.descriptionSi || data.advancedPorondam.advanced.mangalaDosha.description) : data.advancedPorondam.advanced.mangalaDosha.description}
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
                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700' }}>{T.lord7} ({language === 'si' ? (PLANET_INFO[p.d.seventhLord]?.si || p.d.seventhLord) : p.d.seventhLord})</Text>
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
                    {language === 'si' ? (data.advancedPorondam.advanced.marriagePlanetStrength.assessmentSi || data.advancedPorondam.advanced.marriagePlanetStrength.assessment) : data.advancedPorondam.advanced.marriagePlanetStrength.assessment}
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
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{language === 'si' ? (w.startSi || T.noWindows) : T.noWindows}</Text>
                          )}
                          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 3, lineHeight: 16 }}>{language === 'si' ? (w.reasonSi || w.reason) : w.reason}</Text>
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
