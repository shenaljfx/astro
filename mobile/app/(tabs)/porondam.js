import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Platform, Share, Alert,
  LayoutAnimation, UIManager, Dimensions, Image, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown, FadeIn, FadeOut,
  ZoomIn, FadeInUp,
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
  withSequence, withRepeat, withDelay, Easing, interpolate, cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
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
import { screenColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { boxShadow, textShadow } from '../../utils/shadow';
import useReducedMotion from '../../hooks/useReducedMotion';
import useLowEndDevice from '../../hooks/useLowEndDevice';
import { CosmicBackground } from '../../components/CosmicBackground';
import { generatePorondamHTML, loadLogoBase64 } from '../../utils/pdfReportGenerator';
import RadarChart from '../../components/RadarChart';
import { ZODIAC_IMAGES as ZODIAC_IMAGE_LIST } from '../../components/ZodiacIcons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

var { width: W, height: H } = Dimensions.get('window');
var WIDE = W >= 700;
var MOBILE_CHART = Math.min(W - 64, 300);

// Default birth city (Colombo)
var DEFAULT_CITY = { name: 'Colombo', country: 'Sri Lanka', countryCode: 'LK', lat: 6.9271, lng: 79.8612 };

// Planet name translation helper
var PLANET_INFO = {
  Sun: { si: 'à¶‰à¶»' }, Moon: { si: 'à·„à¶³' }, Mars: { si: 'à¶šà·”à¶¢' },
  Mercury: { si: 'à¶¶à·”à¶°' }, Jupiter: { si: 'à¶œà·”à¶»à·”' }, Venus: { si: 'à·ƒà·’à¶šà·”à¶»à·”' },
  Saturn: { si: 'à·à¶±à·’' }, Rahu: { si: 'à¶»à·à·„à·”' }, Ketu: { si: 'à¶šà·šà¶­à·”' },
};

// Rashi name translation helper
var RASHI_SI = {
  Aries: 'à¶¸à·šà·‚', Taurus: 'à·€à·˜à·‚à¶·', Gemini: 'à¶¸à·’à¶®à·”à¶±', Cancer: 'à¶šà¶§à¶š',
  Leo: 'à·ƒà·’à¶‚à·„', Virgo: 'à¶šà¶±à·Šâ€à¶ºà·', Libra: 'à¶­à·”à¶½à·', Scorpio: 'à·€à·˜à·à·Šà¶ à·’à¶š',
  Sagittarius: 'à¶°à¶±à·”', Capricorn: 'à¶¸à¶šà¶»', Aquarius: 'à¶šà·”à¶¸à·Šà¶·', Pisces: 'à¶¸à·“à¶±',
};

// Zodiac sign images by rashi ID (1=Aries...12=Pisces)
var ZODIAC_IMAGES = {
  1: ZODIAC_IMAGE_LIST[0],
  2: ZODIAC_IMAGE_LIST[1],
  3: ZODIAC_IMAGE_LIST[2],
  4: ZODIAC_IMAGE_LIST[3],
  5: ZODIAC_IMAGE_LIST[4],
  6: ZODIAC_IMAGE_LIST[5],
  7: ZODIAC_IMAGE_LIST[6],
  8: ZODIAC_IMAGE_LIST[7],
  9: ZODIAC_IMAGE_LIST[8],
  10: ZODIAC_IMAGE_LIST[9],
  11: ZODIAC_IMAGE_LIST[10],
  12: ZODIAC_IMAGE_LIST[11],
};
var RASHI_NAMES = ['', 'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

// Yoga category/strength Sinhala
var YOGA_CAT_SI = { 'Raja Yoga': 'à¶»à·à¶¢ à¶ºà·à¶œà¶º', 'Dhana Yoga': 'à¶°à¶± à¶ºà·à¶œà¶º', 'Gnana Yoga': 'à¶¥à·à¶± à¶ºà·à¶œà¶º', 'Pancha Mahapurusha': 'à¶´à¶‚à¶  à¶¸à·„à· à¶´à·”à¶»à·”à·‚', 'Chandra Yoga': 'à¶ à¶±à·Šà¶¯à·Šâ€à¶» à¶ºà·à¶œà¶º', 'Special': 'à·€à·’à·à·šà·‚', 'Arishta': 'à¶…à¶»à·’à·‚à·Šà¶§' };
var YOGA_STR_SI = { 'Strong': 'à¶´à·Šâ€à¶»à¶¶à¶½', 'Moderate': 'à¶¸à¶°à·Šâ€à¶ºà¶¸', 'Mild': 'à·ƒà·”à·…à·”', 'Very Strong': 'à¶‰à¶­à· à¶´à·Šâ€à¶»à¶¶à¶½', 'Exceptional': 'à·€à·’à·à·’à·‚à·Šà¶§' };

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

// Binary Star Orbit Animation Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CACHE CONSTANTS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
var PORONDAM_CACHE_KEY = '@grahachara_saved_porondam';
var MAX_SAVED_PORONDAM = 10;

// Porondam loading screen - Twin Horoscope Convergence
var PORONDAM_LOADING_STAGES = {
  en: [
    { title: 'Mapping your cosmic fingerprints', sub: 'Aligning both birth skies to find where your stars overlap.', icon: 'planet-outline' },
    { title: 'Scanning 7 chemistry signals', sub: 'Passion, conflict style, daily vibe, emotions, influence, health, and prosperity.', icon: 'analytics-outline' },
    { title: 'Measuring your emotional rhythm', sub: 'How you fight, flirt, and feel safe together — patterns are emerging.', icon: 'pulse-outline' },
    { title: 'Testing the deeper soul bond', sub: 'Long-term staying power, life phase sync, and hidden magnetism.', icon: 'diamond-outline' },
    { title: 'Writing your love story', sub: 'Weaving everything into your personalised compatibility report.', icon: 'sparkles' },
  ],
  si: [
    { title: 'à¶‹à¶´à¶­à·Š à·ƒà·’à¶­à·’à¶ºà¶¸à·Š à¶¯à·™à¶š à·ƒà¶šà·ƒà¶¸à·’à¶±à·Š', sub: 'à¶½à¶œà·Šà¶±à¶º, à¶ à¶±à·Šà¶¯à·Šâ€à¶» à¶»à·à·à·’à¶º, à·ƒà·„ à¶±à·à¶šà¶­ à¶‘à¶šà¶§ à¶´à·™à·…à¶œà·ƒà·Šà·€à¶¸à·’à¶±à·Š.', icon: 'planet-outline' },
    { title: 'à¶´à·œà¶»à·œà¶±à·Šà¶¯à¶¸à·Š à¶½à¶šà·”à¶«à·” à·„à¶­ à¶šà·’à¶ºà·€à¶¸à·’à¶±à·Š', sub: 'à¶¯à·’à¶±, à¶œà¶«, à¶ºà·à¶±à·’, à¶»à·à·à·’, à·€à·à·Šâ€à¶º, à¶±à·à¶©à·’, à·ƒà·„ à¶¸à·„à·šà¶±à·Šà¶¯à·Šâ€à¶» à¶œà·à·…à¶´à·“à¶¸ à·ƒà·ƒà¶³à¶¸à·’à¶±à·Š.', icon: 'analytics-outline' },
    { title: 'à·„à·à¶Ÿà·“à¶¸à·Š à¶»à·’à¶¯à·Šà¶¸à¶º à¶¸à·à¶± à¶¶à¶½à¶¸à·’à¶±à·Š', sub: 'à¶¯à·›à¶±à·’à¶š à¶´à·„à·ƒà·”à·€, à¶†à¶šà¶»à·Šà·‚à¶«à¶º, à¶´à·€à·”à¶½à·Š à¶œà¶½à·à¶ºà·‘à¶¸, à·ƒà·„ à¶šà·à¶´à·€à·“à¶¸ à·ƒà¶šà·ƒà¶¸à·’à¶±à·Š.', icon: 'pulse-outline' },
    { title: 'à¶œà·à¶¹à·”à¶»à·” à¶¶à·à¶³à·“à¶¸ à·€à·’à·à·Šà¶½à·šà·‚à¶«à¶º à¶šà¶»à¶¸à·’à¶±à·Š', sub: 'à¶±à·€à·à¶‚à·à¶š, à¶¢à·“à·€à·’à¶­ à¶…à¶¯à·’à¶ºà¶», à·ƒà·„ à¶¯à·’à¶œà·”à¶šà·à¶½à·“à¶± à·ƒà·„à·à¶º à¶´à·’à¶»à·’à¶´à·„à¶¯à·” à¶šà¶»à¶¸à·’à¶±à·Š.', icon: 'diamond-outline' },
    { title: 'à¶œà·à·…à¶´à·“à¶¸à·Š à¶šà¶­à·à·€ à·ƒà·–à¶¯à·à¶±à¶¸à·Š à¶šà¶»à¶¸à·’à¶±à·Š', sub: 'à¶…à·€à·ƒà·à¶± à·ƒà¶¶à¶³à¶­à· à¶šà·’à¶ºà·€à·“à¶¸ à¶´à·’à¶»à·’à·ƒà·’à¶¯à·” à¶šà¶»à¶¸à·’à¶±à·Š.', icon: 'sparkles' },
  ],
};

var PORONDAM_SIGNAL_TRACK = [
  { en: 'Dina', si: 'à¶¯à·’à¶±', icon: 'sunny-outline', color: '#FBBF24' },
  { en: 'Gana', si: 'à¶œà¶«', icon: 'people-outline', color: '#A78BFA' },
  { en: 'Yoni', si: 'à¶ºà·à¶±à·’', icon: 'heart-outline', color: '#F472B6' },
  { en: 'Rashi', si: 'à¶»à·à·à·’', icon: 'moon-outline', color: '#60A5FA' },
  { en: 'Vasya', si: 'à·€à·à·Šâ€à¶º', icon: 'magnet-outline', color: '#FB923C' },
  { en: 'Nadi', si: 'à¶±à·à¶©à·’', icon: 'pulse-outline', color: '#34D399' },
  { en: 'Mahendra', si: 'à¶¸à·„à·šà¶±à·Šà¶¯à·Šâ€à¶»', icon: 'leaf-outline', color: '#22D3EE' },
];

function buildPorondamParticles(count) {
  var items = [];
  for (var i = 0; i < count; i++) {
    var seed = i + 1;
    items.push({
      x: ((seed * 37 + 11) % 100),
      y: ((seed * 61 + 19) % 100),
      size: 1.5 + ((seed * 17) % 18) / 10,
      delay: (seed * 173) % 2400,
      speed: 1600 + ((seed * 263) % 1800),
      drift: 5 + ((seed * 29) % 15),
      color: seed % 4 === 0 ? '#FBBF24' : seed % 4 === 1 ? '#F9A8D4' : seed % 4 === 2 ? '#93C5FD' : '#C084FC',
      baseOpacity: 0.18 + ((seed * 13) % 32) / 100,
    });
  }
  return items;
}

var PORONDAM_LOADING_PARTICLES = buildPorondamParticles(34);

function getCompatibilityFactorCopy(name, language, score, maxScore) {
  var pct = maxScore > 0 ? score / maxScore : 0;
  var tier = pct >= 0.75 ? 'good' : pct >= 0.25 ? 'mixed' : 'poor';

  var factors = {
    Dina: {
      plainName: { en: 'Daily Life Together', si: '\u0DAF\u0DD2\u0DB1\u0DB4\u0DAD\u0DCF \u0D91\u0D9A\u0DAD\u0DD4\u0DC0' },
      techName: { en: 'Dina Porondam', si: '\u0DAF\u0DD2\u0DB1 \u0DB4\u0DDC\u0DBB\u0DDC\u0DB1\u0DCA\u0DAF\u0DB8' },
      good: { en: 'Your everyday rhythms sync naturally \u2014 mornings, meals, and moods will feel easy together.', si: '\u0D94\u0DB6\u0DBD\u0DCF\u0D9C\u0DDA \u0DAF\u0DD2\u0DB1\u0DB4\u0DAD\u0DCF \u0DBB\u0DA7\u0DCF \u0DC3\u0DCA\u0DC0\u0DCF\u0DB7\u0DCF\u0DC0\u0DD2\u0D9A\u0DC0 \u0D9C\u0DD0\u0DBD\u0DB4\u0DDA \u2014 \u0D8B\u0DAF\u0DDA, \u0D86\u0DC4\u0DCF\u0DBB, \u0DB8\u0DB1\u0DD0\u0DC3\u0DCA\u0DAE\u0DD2\u0DAD\u0DD2 \u0DB4\u0DC4\u0DC3\u0DD4\u0DC0\u0DD9\u0DB1\u0DCA \u0DBA\u0DB1\u0DD4.' },
      mixed: { en: 'Some daily habits may differ \u2014 small compromises around routines will keep things smooth.', si: '\u0DC3\u0DB8\u0DC4\u0DBB \u0DAF\u0DD2\u0DB1\u0DB4\u0DAD\u0DCF \u0DB4\u0DD4\u0DBB\u0DD4\u0DAF\u0DD4 \u0DC0\u0DD9\u0DB1\u0DC3\u0DCA \u0DC0\u0DD2\u0DBA \u0DC4\u0DD0\u0D9A \u2014 \u0D9A\u0DD4\u0DA9\u0DCF \u0D86\u0DAF\u0DDA\u0DC1\u0DBA\u0DB1\u0DCA \u0DC3\u0DB8\u0D9F \u0DC3\u0DD4\u0D9C\u0DB8\u0DBA\u0DD2.' },
      poor: { en: 'Very different daily rhythms \u2014 one of you may feel drained. Talk about expectations early.', si: '\u0DAF\u0DD2\u0DB1\u0DB4\u0DAD\u0DCF \u0DBB\u0DA7\u0DCF \u0DC0\u0DD9\u0DB1\u0DC3\u0DCA \u2014 \u0D91\u0D9A\u0DCA \u0D85\u0DBA\u0D9A\u0DD4\u0DA7 \u0DB8\u0DAF\u0DD2 \u0DC0\u0DD2\u0DBA \u0DC4\u0DD0\u0D9A. \u0D89\u0D9A\u0DCA\u0DB8\u0DB1\u0DD2\u0DB1\u0DCA \u0D85\u0DB4\u0DDA\u0D9A\u0DCA\u0DC2\u0DCF \u0D9A\u0DAD\u0DCF \u0D9A\u0DBB\u0DB1\u0DCA\u0DB1.' },
    },
    Gana: {
      plainName: { en: 'How You Handle Conflict', si: '\u0D9C\u0DD0\u0DA7\u0DD4\u0DB8\u0DCA \u0DC4\u0DD0\u0DB1\u0DCA\u0DAF\u0DBD\u0DB1 \u0D86\u0D9A\u0DCF\u0DBB\u0DBA' },
      techName: { en: 'Gana Porondam', si: '\u0D9C\u0DAB \u0DB4\u0DDC\u0DBB\u0DDC\u0DB1\u0DCA\u0DAF\u0DB8' },
      good: { en: 'You handle stress and disagreements the same way \u2014 fights resolve quickly.', si: '\u0D94\u0DB6 \u0DAF\u0DD9\u0DAF\u0DD9\u0DB1\u0DCF \u0DB4\u0DD3\u0DA9\u0DB1\u0DBA \u0DC3\u0DB8\u0DCF\u0DB1 \u0D86\u0D9A\u0DCF\u0DBB\u0DBA\u0D9A\u0DD2\u0DB1\u0DCA \u0DC4\u0DD0\u0DC3\u0DD2\u0DBB\u0DDA \u2014 \u0D9C\u0DD0\u0DA7\u0DD4\u0DB8\u0DCA \u0D89\u0D9A\u0DCA\u0DB8\u0DB1\u0DD2\u0DB1\u0DCA \u0DB1\u0DD2\u0DB8\u0DCF\u0DC0\u0DDA.' },
      mixed: { en: 'You react differently under stress \u2014 understanding each other\u2019s triggers helps.', si: '\u0DB4\u0DD3\u0DA9\u0DB1\u0DBA\u0DA7 \u0DC0\u0DD9\u0DB1\u0DC3\u0DCA \u0DB4\u0DCA\u200D\u0DBB\u0DAD\u0DD2\u0D9A\u0DCA\u200D\u0DBB\u0DD2\u0DBA\u0DCF \u0D9A\u0DBB\u0DBA\u0DD2 \u2014 \u0D91\u0D9A\u0DD2\u0DB1\u0DD9\u0D9A\u0DCF\u0D9C\u0DDA \u0DAD\u0DD3\u0DBB\u0DAB \u0DAD\u0DD9\u0DBB\u0DD4\u0DB8\u0DCA\u0D9C\u0DD0\u0DB1\u0DD3\u0DB8 \u0DC0\u0DD0\u0DAF\u0D9C\u0DAD\u0DCA.' },
      poor: { en: 'Very different temperaments \u2014 one stays calm while the other reacts strongly. Patience is essential.', si: '\u0DC3\u0DCA\u0DC0\u0DB7\u0DCF\u0DC0\u0DBA\u0DB1\u0DCA \u0DC0\u0DD9\u0DB1\u0DC3\u0DCA \u2014 \u0D91\u0D9A\u0DCA \u0D85\u0DBA \u0DC3\u0DD2\u0DC4\u0DD2\u0DBA\u0DD9\u0DB1\u0DCA \u0D85\u0DB1\u0DD9\u0D9A\u0DCF \u0DAD\u0DD3\u0DC0\u0DCA\u200D\u0DBB \u0DB4\u0DCA\u200D\u0DBB\u0DAD\u0DD2\u0D9A\u0DCA\u200D\u0DBB\u0DD2\u0DBA\u0DCF \u0D9A\u0DBB\u0DBA\u0DD2. \u0D89\u0DC0\u0DC3\u0DD3\u0DB8 \u0D85\u0DAD\u0DCA\u200D\u0DBA\u0DC0\u0DC1\u0DCA\u200D\u0DBA\u0DBA\u0DD2.' },
    },
    Yoni: {
      plainName: { en: 'Physical & Emotional Chemistry', si: '\u0DC1\u0DCF\u0DBB\u0DD3\u0DBB\u0DD2\u0D9A \u0DC4\u0DCF \u0DC4\u0DD0\u0D9F\u0DD3\u0DB8\u0DCA \u0D9C\u0DD0\u0DBD\u0DB4\u0DD3\u0DB8' },
      techName: { en: 'Yoni Porondam', si: '\u0DBA\u0DDD\u0DB1\u0DD2 \u0DB4\u0DDC\u0DBB\u0DDC\u0DB1\u0DCA\u0DAF\u0DB8' },
      good: { en: 'Strong natural attraction \u2014 physical connection and emotional closeness come easily.', si: '\u0DC3\u0DCA\u0DC0\u0DCF\u0DB7\u0DCF\u0DC0\u0DD2\u0D9A \u0D86\u0D9A\u0DBB\u0DCA\u0DC2\u0DAB\u0DBA \u0DB4\u0DCA\u200D\u0DBB\u0DB6\u0DBD \u2014 \u0DC1\u0DCF\u0DBB\u0DD3\u0DBB\u0DD2\u0D9A \u0DC3\u0DB8\u0DD3\u0DB4\u0DAD\u0DCF\u0DC0 \u0DC4\u0DCF \u0DC4\u0DD0\u0D9F\u0DD3\u0DB8\u0DCA \u0DB4\u0DC4\u0DC3\u0DD4\u0DC0\u0DD9\u0DB1\u0DCA \u0DBA\u0DB1\u0DD4.' },
      mixed: { en: 'Moderate chemistry \u2014 attraction is there but needs effort to keep the spark alive over time.', si: '\u0DB8\u0DB0\u0DCA\u200D\u0DBA\u0DB8 \u0D86\u0D9A\u0DBB\u0DCA\u0DC2\u0DAB\u0DBA \u2014 \u0D9A\u0DCF\u0DBD\u0DBA\u0DCF \u0DC3\u0DB8\u0D9F \u0DB4\u0DD0\u0DC0\u0DAD\u0DD3\u0DB8\u0DA7 \u0D8B\u0DAD\u0DCA\u0DC3\u0DCF\u0DC4\u0DBA \u0D95\u0DB1\u0DBA.' },
      poor: { en: 'Low natural chemistry \u2014 intimacy may need open conversations about needs.', si: '\u0DC3\u0DCA\u0DC0\u0DCF\u0DB7\u0DCF\u0DC0\u0DD2\u0D9A \u0D86\u0D9A\u0DBB\u0DCA\u0DC2\u0DAB\u0DBA \u0D85\u0DA9\u0DD4 \u2014 \u0D85\u0DC0\u0DC1\u0DCA\u200D\u0DBA\u0DAD\u0DCF \u0D9C\u0DD0\u0DB1 \u0DC0\u0DD2\u0DC0\u0DD8\u0DAD \u0DC3\u0DB1\u0DCA\u0DB1\u0DD2\u0DC0\u0DDA\u0DAF\u0DB1\u0DBA \u0DC0\u0DD0\u0DAF\u0D9C\u0DAD\u0DCA.' },
    },
    Rashi: {
      plainName: { en: 'Emotional Understanding', si: '\u0DC4\u0DD0\u0D9F\u0DD3\u0DB8\u0DCA \u0DAD\u0DD9\u0DBB\u0DD4\u0DB8\u0DCA \u0D9C\u0DD0\u0DB1\u0DD3\u0DB8' },
      techName: { en: 'Rashi Porondam', si: '\u0DBB\u0DCF\u0DC1\u0DD2 \u0DB4\u0DDC\u0DBB\u0DDC\u0DB1\u0DCA\u0DAF\u0DB8' },
      good: { en: 'You understand each other\u2019s emotions intuitively \u2014 home life will feel harmonious.', si: '\u0D94\u0DB6 \u0D91\u0D9A\u0DD2\u0DB1\u0DD9\u0D9A\u0DCF\u0D9C\u0DDA \u0DC4\u0DD0\u0D9F\u0DD3\u0DB8\u0DCA \u0DC3\u0DCA\u0DC0\u0DCF\u0DB7\u0DCF\u0DC0\u0DD2\u0D9A\u0DC0 \u0DAD\u0DD9\u0DBB\u0DD4\u0DB8\u0DCA \u0D9C\u0DB1\u0DD3 \u2014 \u0D9C\u0DD8\u0DC4 \u0DA2\u0DD3\u0DC0\u0DD2\u0DAD\u0DBA \u0DC3\u0DB8\u0D9C\u0DD2\u0DBA\u0DD2.' },
      mixed: { en: 'You feel things differently \u2014 give each other space to process emotions their own way.', si: '\u0D94\u0DB6 \u0DC4\u0DD0\u0D9F\u0DD3\u0DB8\u0DCA \u0DC0\u0DD9\u0DB1\u0DC3\u0DCA \u0D85\u0DB1\u0DD4\u0DB7\u0DC0 \u0D9A\u0DBB\u0DBA\u0DD2 \u2014 \u0D91\u0D9A\u0DD2\u0DB1\u0DD9\u0D9A\u0DCF\u0DA7 \u0D89\u0DA9\u0DB8\u0DCA \u0DAF\u0DD9\u0DB1\u0DCA\u0DB1.' },
      poor: { en: 'Emotional wavelengths are quite different \u2014 misunderstandings likely without effort.', si: '\u0DC4\u0DD0\u0D9F\u0DD3\u0DB8\u0DCA \u0DAD\u0DBB\u0D82\u0D9C \u0DC0\u0DD9\u0DB1\u0DC3\u0DCA \u2014 \u0D8B\u0DAD\u0DCA\u0DC3\u0DCF\u0DC4\u0DBA\u0D9A\u0DD2\u0DB1\u0DCA \u0DAD\u0DDC\u0DBB\u0DC0 \u0DC0\u0DD0\u0DBB\u0DAF\u0DD3 \u0DAD\u0DD3\u0DBB\u0DD4\u0DB8\u0DCA \u0DC0\u0DD2\u0DBA \u0DC4\u0DD0\u0D9A.' },
    },
    Vasya: {
      plainName: { en: 'Natural Pull & Influence', si: '\u0DC3\u0DCA\u0DC0\u0DCF\u0DB7\u0DCF\u0DC0\u0DD2\u0D9A \u0D86\u0D9A\u0DBB\u0DCA\u0DC2\u0DAB\u0DBA' },
      techName: { en: 'Vasya Porondam', si: '\u0DC0\u0DCF\u0DC1\u0DCA\u200D\u0DBA \u0DB4\u0DDC\u0DBB\u0DDC\u0DB1\u0DCA\u0DAF\u0DB8' },
      good: { en: 'Strong mutual pull \u2014 you naturally respond to and influence each other positively.', si: '\u0DB4\u0DCA\u200D\u0DBB\u0DB6\u0DBD \u0D86\u0D9A\u0DBB\u0DCA\u0DC2\u0DAB\u0DBA \u2014 \u0D94\u0DB6 \u0DC3\u0DCA\u0DC0\u0DCF\u0DB7\u0DCF\u0DC0\u0DD2\u0D9A\u0DC0 \u0D91\u0D9A\u0DD2\u0DB1\u0DD9\u0D9A\u0DCF\u0DA7 \u0DB7\u0DCF\u0DC0\u0DCF\u0DAD\u0DCA\u0DB8\u0D9A\u0DC0 \u0DB4\u0DCA\u200D\u0DBB\u0DAD\u0DD2\u0D9A\u0DCA\u200D\u0DBB\u0DD2\u0DBA\u0DCF \u0D9A\u0DBB\u0DBA\u0DD2.' },
      mixed: { en: 'The pull exists but isn\u2019t overwhelming \u2014 neither dominates the other.', si: '\u0D86\u0D9A\u0DBB\u0DCA\u0DC2\u0DAB\u0DBA \u0DAD\u0DD2\u0DB6\u0DD4\u0DAB\u0DAD\u0DCA \u0DB4\u0DCA\u200D\u0DBB\u0DB6\u0DBD \u0DB1\u0DD0\u0DAD \u2014 \u0D9A\u0DD9\u0DB1\u0DD9\u0D9A\u0DD4\u0DAD\u0DCA \u0D85\u0DB1\u0DD9\u0D9A\u0DCF\u0DA7 \u0D86\u0DB0\u0DD2\u0DB4\u0DAD\u0DCA\u200D\u0DBA \u0DB1\u0DDC\u0D9A\u0DBB\u0DBA\u0DD2.' },
      poor: { en: 'Low natural magnetism \u2014 the bond needs conscious nurturing to stay connected.', si: '\u0DC3\u0DCA\u0DC0\u0DCF\u0DB7\u0DCF\u0DC0\u0DD2\u0D9A \u0D86\u0D9A\u0DBB\u0DCA\u0DC2\u0DAB\u0DBA \u0D85\u0DA9\u0DD4 \u2014 \u0DC3\u0DB6\u0DB3\u0DAD\u0DCF\u0DC0 \u0DB4\u0DD0\u0DC0\u0DAD\u0DD3\u0DB8\u0DA7 \u0DC3\u0DD0\u0DBD\u0D9A\u0DD2\u0DBD\u0DCA\u0DBD\u0DC0\u0DAD\u0DCA \u0DB4\u0DDC\u0DC2\u0DAB\u0DBA \u0D95\u0DB1\u0DBA.' },
    },
    Nadi: {
      plainName: { en: 'Long-term Family Health', si: '\u0DAF\u0DD3\u0DBB\u0DCA\u0D9C\u0D9A\u0DCF\u0DBD\u0DD3\u0DB1 \u0DB4\u0DC0\u0DD4\u0DBD\u0DCA \u0DC3\u0DD4\u0DC0\u0DBA' },
      techName: { en: 'Nadi Porondam', si: '\u0DB1\u0DCF\u0DA9\u0DD2 \u0DB4\u0DDC\u0DBB\u0DDC\u0DB1\u0DCA\u0DAF\u0DB8' },
      good: { en: 'Excellent health alignment \u2014 your family will thrive with natural vitality.', si: '\u0DC3\u0DD4\u0DC0\u0DBA \u0D9C\u0DD0\u0DBD\u0DB4\u0DD3\u0DB8 \u0D89\u0DAD\u0DCF \u0DC4\u0DDC\u0DB3\u0DBA\u0DD2 \u2014 \u0D94\u0DB6\u0D9C\u0DDA \u0DB4\u0DC0\u0DD4\u0DBD \u0DC3\u0DCA\u0DC0\u0DCF\u0DB7\u0DCF\u0DC0\u0DD2\u0D9A \u0DC3\u0DD4\u0DC0\u0DBA\u0DD9\u0DB1\u0DCA \u0DC0\u0DD0\u0DA9\u0DD2\u0DC0\u0DDA.' },
      mixed: { en: 'Moderate health alignment \u2014 some care needed around family wellness habits.', si: '\u0DB8\u0DB0\u0DCA\u200D\u0DBA\u0DB8 \u0DC3\u0DD4\u0DC0\u0DBA \u0D9C\u0DD0\u0DBD\u0DB4\u0DD3\u0DB8 \u2014 \u0DB4\u0DC0\u0DD4\u0DBD\u0DDA \u0DC3\u0DD4\u0DC0\u0DBA \u0DB4\u0DD4\u0DBB\u0DD4\u0DAF\u0DD4 \u0D9C\u0DD0\u0DB1 \u0DC3\u0DD0\u0DBD\u0D9A\u0DD2\u0DBD\u0DCA\u0DBD \u0DC0\u0DD3\u0DB8 \u0DC4\u0DDC\u0DB3\u0DBA\u0DD2.' },
      poor: { en: 'Health patterns don\u2019t align well \u2014 prioritize regular check-ups and discuss family health history.', si: '\u0DC3\u0DD4\u0DC0\u0DBA \u0DBB\u0DA7\u0DCF \u0D9C\u0DD0\u0DBD\u0DB4\u0DD3\u0DB8 \u0D85\u0DA9\u0DD4 \u2014 \u0DB1\u0DD2\u0DBA\u0DB8\u0DD2\u0DAD \u0DC3\u0DD4\u0DC0\u0DBA \u0DB4\u0DBB\u0DD3\u0D9A\u0DCA\u0DC2\u0DCF \u0D9A\u0DBB\u0DB1\u0DCA\u0DB1. \u0DB4\u0DC0\u0DD4\u0DBD\u0DDA \u0DC3\u0DD4\u0DC0\u0DBA \u0D89\u0DAD\u0DD2\u0DC4\u0DCF\u0DC3\u0DBA \u0DC3\u0DCF\u0D9A\u0DA0\u0DCA\u0DA1\u0DCF \u0D9A\u0DBB\u0DB1\u0DCA\u0DB1.' },
    },
    Mahendra: {
      plainName: { en: 'Growth & Prosperity Together', si: '\u0D91\u0D9A\u0DA7 \u0DC0\u0DD0\u0DA9\u0DD3\u0DB8 \u0DC4\u0DCF \u0DC3\u0DB8\u0DD8\u0DAF\u0DCA\u0DB0\u0DD2\u0DBA' },
      techName: { en: 'Mahendra Porondam', si: '\u0DB8\u0DC4\u0DDA\u0DB1\u0DCA\u0DAF\u0DCA\u200D\u0DBB \u0DB4\u0DDC\u0DBB\u0DDC\u0DB1\u0DCA\u0DAF\u0DB8' },
      good: { en: 'This relationship naturally supports prosperity \u2014 you\u2019ll grow together.', si: '\u0DB8\u0DDA \u0DC3\u0DB6\u0DB3\u0DAD\u0DCF\u0DC0 \u0DC3\u0DB8\u0DD8\u0DAF\u0DCA\u0DB0\u0DD2\u0DBA\u0DA7 \u0DC3\u0DCA\u0DC0\u0DCF\u0DB7\u0DCF\u0DC0\u0DD2\u0D9A\u0DC0 \u0DC3\u0DC4\u0DCF\u0DBA \u0DC0\u0DDA \u2014 \u0D94\u0DB6 \u0D91\u0D9A\u0DA7 \u0DC0\u0DD0\u0DA9\u0DD3.' },
      mixed: { en: 'Growth support is neutral \u2014 success will come from combined effort.', si: '\u0DC0\u0DD0\u0DA9\u0DD3\u0DB8\u0DDA \u0DC3\u0DC4\u0DCF\u0DBA \u0DB8\u0DB0\u0DCA\u200D\u0DBA\u0DB8 \u2014 \u0DAD\u0DB1\u0DD2 \u0DAD\u0DB1\u0DD2\u0DC0 \u0D8B\u0DAD\u0DCA\u0DC3\u0DCF\u0DC4\u0DBA\u0DD9\u0DB1\u0DCA \u0DC3\u0DCF\u0DBB\u0DCA\u0DAE\u0D9A\u0DAD\u0DCA\u0DC0\u0DBA \u0DBD\u0DD0\u0DB6\u0DDA.' },
      poor: { en: 'Growth energy doesn\u2019t naturally combine \u2014 actively support each other\u2019s goals.', si: '\u0DC0\u0DD0\u0DA9\u0DD3\u0DB8\u0DDA \u0DC1\u0D9A\u0DCA\u0DAD\u0DD2\u0DBA \u0DC3\u0DCA\u0DC0\u0DCF\u0DB7\u0DCF\u0DC0\u0DD2\u0D9A\u0DC0 \u0D91\u0D9A\u0DAD\u0DD4 \u0DB1\u0DDC\u0DC0\u0DDA \u2014 \u0D91\u0D9A\u0DD2\u0DB1\u0DD9\u0D9A\u0DCF\u0D9C\u0DDA \u0D89\u0DBD\u0D9A\u0DCA\u0D9A \u0DC3\u0D9A\u0DCA\u200D\u0DBB\u0DD2\u0DBA\u0DC0 \u0DC3\u0DC4\u0DCF\u0DBA \u0D9A\u0DBB\u0DB1\u0DCA\u0DB1.' },
    },
  };


  // Short labels for radar chart
  var shortNames = {
    Dina: { en: 'Daily Life', si: '\u0DAF\u0DD2\u0DB1\u0DB4\u0DAD\u0DCF' },
    Gana: { en: 'Conflict', si: '\u0D9C\u0DD0\u0DA7\u0DD4\u0DB8\u0DCA' },
    Yoni: { en: 'Attraction', si: '\u0D86\u0D9A\u0DBB\u0DCA\u0DC2\u0DAB\u0DBA' },
    Rashi: { en: 'Emotions', si: '\u0DC4\u0DD0\u0D9F\u0DD3\u0DB8\u0DCA' },
    Vasya: { en: 'Influence', si: '\u0DC0\u0DC1\u0DCA\u200D\u0DBA' },
    Nadi: { en: 'Family Health', si: '\u0DB1\u0DCF\u0DA9\u0DD2' },
    Mahendra: { en: 'Prosperity', si: '\u0DC3\u0DB8\u0DD8\u0DAF\u0DCA\u0DB0\u0DD2' },
  };
  var sn = shortNames[name];

  var fc = factors[name];
  if (!fc) {
    return { plainName: name, techName: name + ' Porondam', insight: '', tier: tier };
  }
  var lang = language === 'si' ? 'si' : 'en';
  return {
    plainName: fc.plainName[lang],
    shortName: sn ? sn[lang] : (fc ? fc.plainName[lang] : name),
    techName: fc.techName[lang],
    insight: fc[tier][lang],
    tier: tier,
  };
}

function getRelationshipChallengeCopy(item, language) {
  var severity = item && item.severity ? String(item.severity).toLowerCase() : '';
  var name = item && item.name ? String(item.name).toLowerCase() : '';

  // Map dosha names to plain-language relationship labels + descriptions
  var challengeMap = {
    mangal: {
      si: { label: 'à¶ à¶»à·Šà¶ºà·à·€ à·„à· à¶šà·à¶´à¶º à¶´à·à¶½à¶±à¶º', desc: 'à¶‘à¶šà·Š à¶…à¶ºà¶šà·”à¶œà·š à¶­à·“à·€à·Šâ€à¶» à·à¶šà·Šà¶­à·’à¶º à¶±à·’à·ƒà· à¶‰à¶šà·Šà¶¸à¶±à·’à¶±à·Š à¶šà·šà¶±à·Šà¶­à·’ à¶œà·à¶±à·“à¶¸ à·„à· à¶†à¶°à·’à¶´à¶­à·Šâ€à¶º à¶´à·à·€à¶»à·“à¶¸ à·€à·’à¶º à·„à·à¶š. à¶‰à·€à·ƒà·“à¶¸à·™à¶±à·Š à¶šà¶­à· à¶šà·’à¶»à·“à¶¸ à·€à·à¶¯à¶œà¶­à·Š.' },
      en: { label: 'Temperament & Anger Control', desc: 'One partner may have intense energy leading to quick reactions or dominance. Patient communication is key.' },
    },
    kaal: {
      si: { label: 'à¶¢à·“à·€à·’à¶­à¶ºà·š à·„à¶¯à·’à·ƒà·’ à¶¸à·à¶»à·”', desc: 'à¶¢à·“à·€à·’à¶­à¶ºà·š à¶…à¶±à¶´à·šà¶šà·Šà·‚à·’à¶­ à·€à·™à¶±à·ƒà·Šà¶šà¶¸à·Š à¶‘à¶šà·’à¶±à·Š à¶‘à¶š à¶´à·à¶¸à·’à¶«à·’à¶º à·„à·à¶š. à¶‘à¶šà·’à¶±à·™à¶šà· à·ƒà·€à·’à¶¸à¶­à·Šà·€ à¶»à·à¶³à·“ à·ƒà·’à¶§à·“à¶¸ à·€à·à¶¯à¶œà¶­à·Š.' },
      en: { label: 'Sudden Life Shifts', desc: 'Life may bring unexpected changes one after another. Staying resilient together is important.' },
    },
    sade: {
      si: { label: 'à¶¢à·“à·€à·’à¶­à¶ºà·š à¶…à¶·à·’à¶ºà·à¶œà¶šà·à¶»à·“ à¶šà·à¶½ à¶´à¶»à·’à¶ à·Šà¶¡à·šà¶¯à¶º', desc: 'à¶¯à·à¶±à¶§ à¶…à¶·à·’à¶ºà·à¶œà¶šà·à¶»à·“ à¶šà·à¶½à¶ºà¶š à¶œà¶¸à¶±à·Š à¶šà¶»à¶¸à·’à¶±à·Š à·ƒà·’à¶§à·“. à¶…à¶±à·Šâ€à¶ºà·à¶±à·Šâ€à¶º à¶‹à¶¯à·€à·Š à·„à· à¶‰à·€à·ƒà·“à¶¸ à¶‰à¶­à· à·€à·à¶¯à¶œà¶­à·Š.' },
      en: { label: 'Challenging Life Phase', desc: 'Currently going through a demanding period. Mutual support and patience are crucial.' },
    },
    pitru: {
      si: { label: 'à¶´à·€à·”à¶½à·Š à¶»à¶§à· à·„à· à¶‹à¶»à·”à¶¸à¶º', desc: 'à¶´à·€à·”à¶½à·š à¶´à¶»à¶¸à·Šà¶´à¶»à·à·€à·™à¶±à·Š à¶† à·ƒà¶¶à¶³à¶­à· à¶»à¶§à· à¶¶à¶½à¶´à·‘à¶¸à·Š à¶šà·… à·„à·à¶š. à¶…à¶½à·”à¶­à·Š à¶´à·”à¶»à·”à¶¯à·” à¶œà·œà¶©à¶±à¶œà· à¶œà·à¶±à·“à¶¸ à·„à·œà¶³à¶ºà·’.' },
      en: { label: 'Family Patterns & Legacy', desc: 'Inherited family relationship patterns may influence the bond. Building new habits together helps.' },
    },
    grahan: {
      si: { label: 'à¶¸à·à¶±à·ƒà·’à¶š à¶´à·“à¶©à¶±à¶º à·„à· à¶…à·€à·’à¶±à·’à·à·Šà¶ à·’à¶­à¶·à·à·€à¶º', desc: 'à·ƒà·’à¶­à·š à·€à·Šâ€à¶ºà·à¶šà·–à¶½à¶­à·Šà·€à¶º à·„à· à¶­à·“à¶»à¶« à¶œà·à¶±à·“à¶¸à·š à¶¯à·”à·‚à·Šà¶šà¶»à¶­à· à¶‡à¶­à·’ à·€à·’à¶º à·„à·à¶š. à¶´à·à·„à·à¶¯à·’à¶½à·’ à·ƒà¶±à·Šà¶±à·’à·€à·šà¶¯à¶±à¶º à¶…à¶­à·Šâ€à¶ºà·€à·à·Šâ€à¶ºà¶ºà·’.' },
      en: { label: 'Mental Pressure & Confusion', desc: 'There may be confusion or difficulty making decisions together. Clear communication is essential.' },
    },
    shrapit: {
      si: { label: 'à¶´à·à¶»à¶«à·’ à·„à·à¶Ÿà·“à¶¸à·Šà¶¸à¶º à¶¶à·à¶¸à·’', desc: 'à¶…à¶­à·“à¶­ à·ƒà¶¶à¶³à¶­à· à¶…à¶­à·Šà¶¯à·à¶šà·“à¶¸à·Š à¶±à·’à·ƒà· à¶´à·à·€à¶»à·™à¶± à¶¶à·’à¶º à·„à· à·€à·’à·à·Šà·€à·à·ƒ à¶œà·à¶§à¶½à·” à·€à·’à¶º à·„à·à¶š. à¶…à¶½à·”à¶­à·Š à¶†à¶»à¶¸à·Šà¶·à¶ºà¶šà·Š à¶œà·œà¶©à¶±à¶œà¶±à·Šà¶±.' },
      en: { label: 'Emotional Baggage from the Past', desc: 'Past relationship experiences may carry fear or trust issues. Focus on building a fresh start.' },
    },
    guru: {
      si: { label: 'à·€à·’à·€à·šà¶šà¶º à·„à· à¶±à·”à·€à¶« à¶ºà·œà¶¯à· à¶œà·à¶±à·“à¶¸', desc: 'à·ƒà¶¸à·„à¶»à·€à·’à¶§ à¶±à·œà¶¸à·šà¶»à·– à¶­à·“à¶»à¶« à¶œà·à¶±à·“à¶¸à¶§ à¶±à·à¶¹à·”à¶»à·”à·€à¶šà·Š à¶‡à¶­. à·€à·à¶¯à¶œà¶­à·Š à¶šà¶»à·”à¶«à·” à¶œà·à¶± à·„à·’à¶­à·à¶¸à¶­à· à·ƒà·à¶šà¶ à·Šà¶¡à· à¶šà¶»à¶±à·Šà¶±.' },
      en: { label: 'Wisdom & Judgement', desc: 'There may be a tendency toward impulsive decisions. Important matters need deliberate discussion.' },
    },
    kemdrum: {
      si: { label: 'à¶­à¶±à·’à¶šà¶¸ à·„à· à·„à·à¶Ÿà·“à¶¸à·Šà¶¸à¶º à·„à·”à¶¯à·™à¶šà¶½à·à·€', desc: 'à¶‘à¶šà·Š à¶´à·à¶»à·Šà·à·€à¶ºà¶šà¶§ à·„à·à¶Ÿà·“à¶¸à·Šà¶¸à¶º à·€à·à¶ºà·™à¶±à·Š à·„à·”à¶¯à·™à¶šà¶½à· à·€à·– à·„à·à¶Ÿà·“à¶¸à¶šà·Š à¶‡à¶­à·’ à·€à·’à¶º à·„à·à¶š. à·ƒà·à¶½à¶šà·’à¶½à·Šà¶½ à¶´à·Šâ€à¶»à¶šà·à· à¶šà·’à¶»à·“à¶¸ à¶…à¶¸à¶­à¶š à¶±à·œà¶šà¶»à¶±à·Šà¶±.' },
      en: { label: 'Emotional Isolation', desc: 'One partner may sometimes feel emotionally alone. Regularly expressing care is vital.' },
    },
  };

  // Find matching challenge by key
  var matchedKey = Object.keys(challengeMap).find(function(k) { return name.indexOf(k) !== -1; });
  var mapped = matchedKey ? challengeMap[matchedKey] : null;

  if (item && item.cancelled) {
    if (language === 'si') {
      return {
        label: mapped ? mapped.si.label + ' â€” à¶±à·’à·€à·à¶»à¶«à¶º à·€à·“ à¶‡à¶­' : 'à·ƒà·à¶½à¶šà·’à¶½à·Šà¶½ à¶…à¶©à·” à·€à·– à¶šà¶»à·”à¶«',
        desc: 'à¶¸à·š à¶¶à¶½à¶´à·‘à¶¸ à·ƒà·à¶½à¶šà·’à¶º à¶ºà·”à¶­à·” à¶½à·™à·ƒ à¶…à¶©à·” à·€à·“ à¶‡à¶­. à·ƒà·à¶¸à·à¶±à·Šâ€à¶º à·ƒà·à¶½à¶šà·’à¶½à·Šà¶½à·™à¶±à·Š à¶´à·Šâ€à¶»à¶¸à·à¶«à·€à¶­à·Š.',
      };
    }
    return {
      label: mapped ? mapped.en.label + ' â€” Resolved' : 'Reduced Care Point',
      desc: 'This influence has been significantly reduced. Normal care is sufficient.',
    };
  }

  if (mapped) {
    return language === 'si' ? mapped.si : mapped.en;
  }

  // Fallback for unmapped dosha types
  if (language === 'si') {
    return {
      label: severity.indexOf('severe') !== -1 ? 'à·€à·à¶©à·’ à·ƒà·à¶½à¶šà·’à¶½à·Šà¶½à¶šà·Š à¶…à·€à·à·Šâ€à¶º à¶šà¶»à·”à¶«' : 'à·ƒà¶¶à¶³à¶­à·à·€à·š à·ƒà·à¶½à¶šà·’à¶½à·’à¶¸à¶­à·Š à¶šà¶»à·”à¶«',
      desc: 'à¶¸à·šà¶š à·ƒà¶¶à¶³à¶­à·à·€à·š à¶‰à·€à·ƒà·“à¶¸, à·€à·’à·à·Šà·€à·à·ƒà¶º, à·ƒà·„ à¶­à·“à¶»à¶« à¶œà·à¶±à·“à¶¸à·šà¶¯à·“ à·€à·à¶©à·’ à·ƒà·à¶½à¶šà·’à¶½à·Šà¶½à¶šà·Š à¶•à¶±à·š à¶šà·’à¶ºà¶½à· à¶´à·™à¶±à·Šà·€à¶±à·€à·.',
    };
  }
  return {
    label: severity.indexOf('severe') !== -1 ? 'High-Care Relationship Point' : 'Relationship Care Point',
    desc: 'This suggests an area where patience, trust, and careful decisions are important for the relationship.',
  };
}

function getRelationshipStrengthCopy(item, language) {
  var strength = item && item.strength ? String(item.strength) : '';
  var name = item && item.name ? String(item.name).toLowerCase() : '';
  var category = item && item.category ? String(item.category).toLowerCase() : '';

  // Map yoga names/categories to plain-language relationship strengths
  var strengthMap = {
    'raja': {
      si: { label: 'à¶±à·à¶ºà¶šà¶­à·Šà·€ à·à¶šà·Šà¶­à·’à¶º à·„à· à¶¢à·“à·€à·’à¶­ à·ƒà·à¶»à·Šà¶®à¶šà¶­à·Šà·€à¶º', meta: 'à¶¶à¶½à¶´à·‘à¶¸: ' + (strength || 'à·ƒà·à¶¸à·à¶±à·Šâ€à¶º') },
      en: { label: 'Leadership & Life Success', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'dhana': {
      si: { label: 'à¶¸à·–à¶½à·Šâ€à¶º à·ƒà·Šà¶®à·à·€à¶»à¶­à·Šà·€à¶º à·„à· à·ƒà¶¸à·˜à¶¯à·Šà¶°à·’à¶º', meta: 'à¶¶à¶½à¶´à·‘à¶¸: ' + (strength || 'à·ƒà·à¶¸à·à¶±à·Šâ€à¶º') },
      en: { label: 'Financial Stability & Prosperity', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'gaja kesari': {
      si: { label: 'à¶¶à·”à¶¯à·Šà¶°à·’à¶º, à¶šà·“à¶»à·Šà¶­à·’à¶º à·„à· à·ƒà¶¸à·Šà¶¸à·à¶±à¶º', meta: 'à¶¶à¶½à¶´à·‘à¶¸: ' + (strength || 'à·ƒà·à¶¸à·à¶±à·Šâ€à¶º') },
      en: { label: 'Wisdom, Fame & Respect', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'neechabhanga': {
      si: { label: 'à¶…à¶·à·’à¶ºà·à¶œ à¶¶à·€à¶§ à¶´à¶­à·Š à¶šà¶» à¶œà¶­à·Š à·à¶šà·Šà¶­à·’à¶º', meta: 'à¶¶à¶½à¶´à·‘à¶¸: ' + (strength || 'à·ƒà·à¶¸à·à¶±à·Šâ€à¶º') },
      en: { label: 'Strength Forged from Challenges', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'chandra': {
      si: { label: 'à·„à·à¶Ÿà·“à¶¸à·Šà¶¸à¶º à·à¶šà·Šà¶­à·’à¶º à·„à· à¶¯à·à¶©à·’ à¶…à¶°à·’à·‚à·Šà¶¨à·à¶±à¶º', meta: 'à¶¶à¶½à¶´à·‘à¶¸: ' + (strength || 'à·ƒà·à¶¸à·à¶±à·Šâ€à¶º') },
      en: { label: 'Emotional Strength & Determination', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'saraswati': {
      si: { label: 'à¶¥à·à¶«à¶º, à¶šà¶½à· à¶šà·”à·ƒà¶½à¶­à· à·„à· à¶‰à¶œà·™à¶±à·“à¶¸à·š à·„à·à¶šà·’à¶ºà·à·€', meta: 'à¶¶à¶½à¶´à·‘à¶¸: ' + (strength || 'à·ƒà·à¶¸à·à¶±à·Šâ€à¶º') },
      en: { label: 'Knowledge, Creativity & Learning', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'lakshmi': {
      si: { label: 'à¶·à·žà¶­à·’à¶š à·ƒà¶¸à·˜à¶¯à·Šà¶°à·’à¶º à·„à· à·ƒà·à¶´à·€à¶­à·Š à¶¢à·“à·€à·’à¶­à¶º', meta: 'à¶¶à¶½à¶´à·‘à¶¸: ' + (strength || 'à·ƒà·à¶¸à·à¶±à·Šâ€à¶º') },
      en: { label: 'Material Abundance & Comfortable Life', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'viparita': {
      si: { label: 'à¶…à¶´à·„à·ƒà·”à¶­à· à¶¸à·à¶¯ à¶¢à¶ºà¶œà·Šâ€à¶»à·„à¶«à¶º', meta: 'à¶¶à¶½à¶´à·‘à¶¸: ' + (strength || 'à·ƒà·à¶¸à·à¶±à·Šâ€à¶º') },
      en: { label: 'Victory Through Adversity', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'sunapha': {
      si: { label: 'à·ƒà·Šà·€à·à¶°à·“à¶±à¶­à·Šà·€à¶º à·„à· à¶¯à¶šà·Šà·‚à¶­à·à·€', meta: 'à¶¶à¶½à¶´à·‘à¶¸: ' + (strength || 'à·ƒà·à¶¸à·à¶±à·Šâ€à¶º') },
      en: { label: 'Self-Reliance & Skill', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'anapha': {
      si: { label: 'à¶†à¶­à·Šà¶¸ à·€à·’à·à·Šà·€à·à·ƒà¶º à·„à· à·ƒà¶¸à·à¶¢ à¶¶à¶½à¶º', meta: 'à¶¶à¶½à¶´à·‘à¶¸: ' + (strength || 'à·ƒà·à¶¸à·à¶±à·Šâ€à¶º') },
      en: { label: 'Self-Confidence & Social Influence', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'durudhura': {
      si: { label: 'à·ƒà·‘à¶¸ à¶šà·Šà·‚à·šà¶­à·Šâ€à¶»à¶ºà¶šà¶¸ à·ƒà¶¸à¶¶à¶» à·ƒà·à¶»à·Šà¶®à¶šà¶­à·Šà·€à¶º', meta: 'à¶¶à¶½à¶´à·‘à¶¸: ' + (strength || 'à·ƒà·à¶¸à·à¶±à·Šâ€à¶º') },
      en: { label: 'Balanced Success in All Areas', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'adhi': {
      si: { label: 'à·ƒà·Šà·€à¶·à·à·€à·’à¶š à¶±à·à¶ºà¶šà¶­à·Šà·€à¶º à·„à· à¶¶à¶½à¶°à·à¶»à·’à¶­à·Šà·€à¶º', meta: 'à¶¶à¶½à¶´à·‘à¶¸: ' + (strength || 'à·ƒà·à¶¸à·à¶±à·Šâ€à¶º') },
      en: { label: 'Natural Leadership & Authority', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'amala': {
      si: { label: 'à¶´à·’à¶»à·’à·ƒà·’à¶¯à·” à¶šà·“à¶»à·Šà¶­à·’à¶º à·„à· à·„à·œà¶³ à¶±à¶¸à¶šà·Š', meta: 'à¶¶à¶½à¶´à·‘à¶¸: ' + (strength || 'à·ƒà·à¶¸à·à¶±à·Šâ€à¶º') },
      en: { label: 'Clean Reputation & Good Name', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'chamara': {
      si: { label: 'à·€à·’à¶¯à·Šâ€à¶ºà·à·€ à·„à· à·ƒà¶¸à·à¶¢ à¶œà·žà¶»à·€à¶º', meta: 'à¶¶à¶½à¶´à·‘à¶¸: ' + (strength || 'à·ƒà·à¶¸à·à¶±à·Šâ€à¶º') },
      en: { label: 'Education & Social Respect', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'parvata': {
      si: { label: 'à¶¯à·’à¶œà·”à¶šà·à¶½à·“à¶± à·ƒà·Šà¶®à·à·€à¶»à¶­à·Šà·€à¶º à·„à· à¶†à¶»à¶šà·Šà·‚à·à·€', meta: 'à¶¶à¶½à¶´à·‘à¶¸: ' + (strength || 'à·ƒà·à¶¸à·à¶±à·Šâ€à¶º') },
      en: { label: 'Long-term Stability & Security', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'malavya': {
      si: { label: 'à¶†à¶¯à¶» à·„à·à¶šà·’à¶ºà·à·€ à·„à· à¶šà¶½à·à¶­à·Šà¶¸à¶š à·ƒà¶‚à·€à·šà¶¯à·“à¶­à·à·€', meta: 'à¶¶à¶½à¶´à·‘à¶¸: ' + (strength || 'à·ƒà·à¶¸à·à¶±à·Šâ€à¶º') },
      en: { label: 'Capacity for Love & Artistic Sensitivity', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'kahala': {
      si: { label: 'à¶°à·›à¶»à·Šà¶ºà¶º à·„à· à¶¶à·à¶°à¶š à¶¢à¶º à¶œà·à¶±à·“à¶¸', meta: 'à¶¶à¶½à¶´à·‘à¶¸: ' + (strength || 'à·ƒà·à¶¸à·à¶±à·Šâ€à¶º') },
      en: { label: 'Courage & Overcoming Obstacles', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'dharma': {
      si: { label: 'à¶ºà·„à¶´à¶­à·Š à¶¢à·“à·€à¶± à¶¸à·à¶»à·Šà¶œà¶º à·„à· à·€à·˜à¶­à·Šà¶­à·“à¶º à·ƒà·à¶»à·Šà¶®à¶šà¶­à·Šà·€à¶º', meta: 'à¶¶à¶½à¶´à·‘à¶¸: ' + (strength || 'à·ƒà·à¶¸à·à¶±à·Šâ€à¶º') },
      en: { label: 'Righteous Path & Career Success', meta: 'Influence: ' + (strength || 'Moderate') },
    },
  };

  // Find matching strength by key (check name first, then category)
  var searchStr = name + ' ' + category;
  var matchedKey = Object.keys(strengthMap).find(function(k) { return searchStr.indexOf(k) !== -1; });
  var mapped = matchedKey ? strengthMap[matchedKey] : null;

  if (mapped) {
    return language === 'si' ? mapped.si : mapped.en;
  }

  // Fallback with category-based differentiation
  if (category.indexOf('raja') !== -1) {
    return language === 'si'
      ? { label: 'à¶±à·à¶ºà¶šà¶­à·Šà·€ à·„à· à¶¶à¶½ à·à¶šà·Šà¶­à·’à¶º', meta: 'à¶¶à¶½à¶´à·‘à¶¸: ' + (strength || 'à·ƒà·à¶¸à·à¶±à·Šâ€à¶º') }
      : { label: 'Leadership & Power Strength', meta: 'Influence: ' + (strength || 'Moderate') };
  }
  if (category.indexOf('dhana') !== -1 || category.indexOf('wealth') !== -1) {
    return language === 'si'
      ? { label: 'à¶¸à·–à¶½à·Šâ€à¶º à·„à· à·ƒà¶¸à·Šà¶´à¶­à·Š à·à¶šà·Šà¶­à·’à¶º', meta: 'à¶¶à¶½à¶´à·‘à¶¸: ' + (strength || 'à·ƒà·à¶¸à·à¶±à·Šâ€à¶º') }
      : { label: 'Financial & Resource Strength', meta: 'Influence: ' + (strength || 'Moderate') };
  }
  if (category.indexOf('lunar') !== -1 || category.indexOf('moon') !== -1) {
    return language === 'si'
      ? { label: 'à·„à·à¶Ÿà·“à¶¸à·Šà¶¸à¶º à·à¶šà·Šà¶­à·’à¶º à·„à· à¶…à¶±à·”à·€à¶»à·Šà¶­à¶±à¶º', meta: 'à¶¶à¶½à¶´à·‘à¶¸: ' + (strength || 'à·ƒà·à¶¸à·à¶±à·Šâ€à¶º') }
      : { label: 'Emotional Strength & Adaptability', meta: 'Influence: ' + (strength || 'Moderate') };
  }

  // Generic fallback
  if (language === 'si') {
    return { label: 'à·ƒà¶¶à¶³à¶­à·à·€à¶§ à·ƒà·„à·à¶º à¶¯à·™à¶± à·à¶šà·Šà¶­à·’à¶º', meta: 'à¶¶à¶½à¶´à·‘à¶¸: ' + (strength || 'à·ƒà·à¶¸à·à¶±à·Šâ€à¶º') };
  }
  return { label: 'Relationship Support Strength', meta: 'Influence: ' + (strength || 'Moderate') };
}

function getPlainSupportLevel(score, maxScore, language) {
  var max = maxScore || 1;
  var ratio = score / max;
  if (language === 'si') {
    if (ratio >= 0.7) return 'à·à¶šà·Šà¶­à·’à¶¸à¶­à·Š à·ƒà·„à·à¶º';
    if (ratio >= 0.45) return 'à¶¸à·’à·à·Šâ€à¶» à·ƒà·„à·à¶º';
    return 'à·€à·à¶©à·’ à·ƒà·à¶½à¶šà·’à¶½à·Šà¶½à¶šà·Š à¶…à·€à·à·Šâ€à¶ºà¶ºà·’';
  }
  if (ratio >= 0.7) return 'Strong Support';
  if (ratio >= 0.45) return 'Mixed Support';
  return 'Needs Extra Care';
}

function getCoreDriveCopy(planet, language) {
  var key = String(planet || '').toLowerCase();
  var map = {
    sun: ['Confident Direction', 'à·€à·’à·à·Šà·€à·à·ƒà¶¸à¶­à·Š à¶¯à·’à·à·à·€'], moon: ['Care & Emotional Safety', 'à·ƒà·à¶½à¶šà·’à¶½à·Šà¶½ à·ƒà·„ à·„à·à¶Ÿà·“à¶¸à·Š à¶†à¶»à¶šà·Šà·‚à·à·€'],
    mars: ['Action & Courage', 'à¶šà·Šâ€à¶»à·’à¶ºà·à·à·“à¶½à·“à¶­à·Šà·€à¶º à·ƒà·„ à°§à·›à¶»à·Šà¶ºà¶º'], mercury: ['Communication & Learning', 'à¶šà¶­à·à¶¶à·„ à·ƒà·„ à¶‰à¶œà·™à¶±à·“à¶¸'],
    jupiter: ['Growth & Wisdom', 'à·€à¶»à·Šà¶°à¶±à¶º à·ƒà·„ à¶¶à·”à¶¯à·Šà¶°à·’à¶º'], venus: ['Harmony & Affection', 'à·ƒà¶¸à¶œà·’à¶º à·ƒà·„ à¶†à¶¯à¶» à·„à·à¶Ÿà·“à¶¸'],
    saturn: ['Patience & Commitment', 'à¶‰à·€à·ƒà·“à¶¸ à·ƒà·„ à¶šà·à¶´à·€à·“à¶¸'], rahu: ['New Growth Lessons', 'à¶±à·€ à·€à¶»à·Šà¶°à¶± à¶´à·à¶©à¶¸à·Š'], ketu: ['Inner Freedom', 'à¶…à¶·à·Šâ€à¶ºà¶±à·Šà¶­à¶» à¶±à·’à¶¯à·„à·ƒ'],
  };
  var selected = map[key];
  if (!selected) return language === 'si' ? 'à¶´à·”à¶¯à·Šà¶œà¶½à·’à¶š à¶°à·à·€à¶šà¶º' : 'Personal Drive';
  return language === 'si' ? selected[1] : selected[0];
}

function getRelationshipStyleCopy(sign, language) {
  var key = String(sign || '').toLowerCase();
  var fire = /aries|leo|sagittarius/.test(key);
  var earth = /taurus|virgo|capricorn/.test(key);
  var air = /gemini|libra|aquarius/.test(key);
  var water = /cancer|scorpio|pisces/.test(key);
  if (language === 'si') {
    if (fire) return 'à¶±à·’à¶»à·Šà¶·à·“à¶­ à·ƒà·„ à·ƒà·˜à¶¢à·” à¶»à¶§à·à·€';
    if (earth) return 'à·ƒà·Šà¶®à·’à¶» à·ƒà·„ à¶´à·Šâ€à¶»à·à¶ºà·à¶œà·’à¶š à¶»à¶§à·à·€';
    if (air) return 'à¶šà¶­à·à¶¶à·„à¶§ à·ƒà·„ à¶…à¶¯à·„à·ƒà·Šà·€à¶½à¶§ à¶œà·à·…à¶´à·™à¶± à¶»à¶§à·à·€';
    if (water) return 'à·„à·à¶Ÿà·“à¶¸à·Š à·ƒà·„ à·ƒà·à¶½à¶šà·’à¶½à·Šà¶½ à¶´à¶¯à¶±à¶¸à·Š à·€à·– à¶»à¶§à·à·€';
    return 'à¶´à·”à¶¯à·Šà¶œà¶½à·’à¶š à¶šà·à¶´à·€à·“à¶¸à·Š à¶»à¶§à·à·€';
  }
  if (fire) return 'Bold & Direct Style';
  if (earth) return 'Steady & Practical Style';
  if (air) return 'Communicative Style';
  if (water) return 'Emotional & Caring Style';
  return 'Personal Commitment Style';
}

function getLifePeriodCopy(period, language) {
  if (language === 'si') return period && period.isBeneficPeriod ? 'à·ƒà·„à·à¶º à¶¯à·™à¶± à¶¢à·“à·€à·’à¶­ à¶…à¶¯à·’à¶ºà¶»' : 'à·€à·à¶©à·’ à·ƒà·à¶½à¶šà·’à¶½à·Šà¶½à¶šà·Š à¶…à·€à·à·Šâ€à¶º à¶…à¶¯à·’à¶ºà¶»';
  return period && period.isBeneficPeriod ? 'Supportive Life Period' : 'Careful Life Period';
}

function getAdvancedSectionDescription(kind, data, language) {
  var isSi = language === 'si';
  if (kind === 'lifePhase') {
    var harmony = String(data && data.harmony || '').toLowerCase();
    if (harmony === 'harmonious') return isSi ? 'à¶¯à·™à¶¯à·™à¶±à·à¶œà·š à·€à¶»à·Šà¶­à¶¸à·à¶± à¶¢à·“à·€à·’à¶­ à¶…à¶¯à·’à¶ºà¶» à¶‘à¶šà·’à¶±à·™à¶šà·à¶§ à·ƒà·„à·à¶º à¶¯à·™à¶± à¶¶à·€ à¶´à·™à¶±à·Šà·€à¶±à·€à·. à¶­à·“à¶»à¶« à·ƒà·„ à·ƒà·à¶½à·ƒà·”à¶¸à·Š à¶‘à¶šà¶§ à¶šà¶»à¶±à·Šà¶± à·„à·œà¶³à¶ºà·’.' : 'Both current life periods look supportive together. Shared plans and steady decisions are favored.';
    if (harmony === 'conflicting') return isSi ? 'à·€à¶»à·Šà¶­à¶¸à·à¶± à¶¢à·“à·€à·’à¶­ à¶»à¶§à· à¶§à·’à¶šà¶šà·Š à·€à·™à¶±à·ƒà·Š à·€à·’à¶º à·„à·à¶š. à¶‰à¶šà·Šà¶¸à¶±à·Š à¶­à·“à¶»à¶« à·€à¶½à¶§ à¶´à·™à¶» à¶šà¶­à·à¶¶à·„ à·ƒà·„ à¶‰à·€à·ƒà·“à¶¸ à·€à·à¶¯à¶œà¶­à·Š.' : 'The current life rhythms may feel different. Use patience and clear conversations before major decisions.';
    return isSi ? 'à¶¸à·š à¶…à¶¯à·’à¶ºà¶» à¶¸à·’à·à·Šâ€à¶» à·ƒà·„à·à¶ºà¶šà·Š à¶´à·™à¶±à·Šà·€à¶±à·€à·. à¶šà·à¶½à¶º, à·€à·à¶© à¶¶à¶», à·ƒà·„ à¶´à·€à·”à¶½à·Š à¶­à·“à¶»à¶« à¶´à·à·„à·à¶¯à·’à¶½à·’à·€ à·ƒà¶šà·ƒà¶±à·Šà¶±.' : 'This period shows mixed support. Keep timing, workload, and family decisions clear.';
  }
  if (kind === 'deepBond') {
    return isSi ? 'à¶¸à·šà¶š à¶¯à·’à¶œà·”à¶šà·à¶½à·“à¶± à¶¶à·à¶³à·“à¶¸, à¶‡à¶­à·”à·…à¶­ à¶´à·„à·ƒà·”à·€, à·ƒà·„ à¶‘à¶šà¶§ à¶¢à·“à·€à¶­à·Š à·€à·“à¶¸à·š à¶»à¶§à·à·€ à¶œà·à¶± à¶´à·Šâ€à¶»à·à¶ºà·à¶œà·’à¶š à¶šà·’à¶ºà·€à·“à¶¸à¶šà·’.' : 'This reads long-term bond, inner comfort, and how the couple may settle into shared life.';
  }
  if (kind === 'carePoint') {
    var severity = String(data && data.severity || '').toLowerCase();
    if (severity === 'none' || severity === 'cancelled') return isSi ? 'à¶¸à·š à¶šà·œà¶§à·ƒà·’à¶±à·Š à¶¯à·à¶©à·’ à¶´à·“à¶©à¶±à¶ºà¶šà·Š à¶±à·œà¶´à·™à¶±à·š. à·ƒà·à¶¸à·à¶±à·Šâ€à¶º à·ƒà·à¶½à¶šà·’à¶½à·Šà¶½ à·ƒà·„ à·„à·œà¶³ à¶šà¶­à·à¶¶à·„ à¶­à¶¶à·à¶œà¶±à·Šà¶±.' : 'This area does not show strong pressure. Keep normal care and healthy communication.';
    if (severity === 'mild') return isSi ? 'à¶šà·”à¶©à· à¶œà·à¶§à·”à¶¸à·Š à¶‡à¶­à·’ à·€à·’à¶º à·„à·à¶šà·’ à¶±à·’à·ƒà·, à¶­à·“à¶»à¶« à¶œà·à¶±à·“à¶¸à·šà¶¯à·“ à¶‰à·€à·ƒà·“à¶¸ à·ƒà·„ à¶šà¶­à·à¶¶à·„ à·€à·à¶¯à¶œà¶­à·Š.' : 'Small friction is possible, so patient decisions and open conversations matter.';
    return isSi ? 'à¶¸à·š à¶šà·œà¶§à·ƒ à·€à·à¶©à·’ à·ƒà·à¶½à¶šà·’à¶½à·Šà¶½à¶šà·Š à¶‰à¶½à·Šà¶½à¶ºà·’. à¶‰à¶šà·Šà¶¸à¶±à·Š à¶­à·“à¶»à¶«, à¶šà·à¶´à¶ºà·™à¶±à·Š à¶šà¶­à· à¶šà·’à¶»à·“à¶¸, à·ƒà·„ à¶¶à¶½à·„à¶­à·Šà¶šà·à¶»à¶ºà·™à¶±à·Š à·€à·™à¶±à·ƒà·Š à¶šà·’à¶»à·“à¶¸à·Š à·€à¶½à·’à¶±à·Š à·€à·à·…à¶šà·™à¶±à·Šà¶±.' : 'This area asks for extra care. Avoid rushed decisions, angry conversations, and forcing change.';
  }
  return isSi ? 'à¶¸à·š à¶šà·œà¶§à·ƒ à·ƒà¶¶à¶³à¶­à·à·€à¶ºà·š à¶¯à·’à¶œà·”à¶šà·à¶½à·“à¶± à·ƒà·„à·à¶º à·ƒà·„ à·€à·à¶©à·’ à·ƒà·à¶½à¶šà·’à¶½à·Šà¶½ à¶…à·€à·à·Šâ€à¶º à¶´à·Šâ€à¶»à¶¯à·šà· à¶´à·™à¶±à·Šà·€à¶±à·€à·.' : 'This section shows long-term relationship support and areas that need care.';
}

function LoadingParticle({ particle, skipAnim }) {
  var opacity = useSharedValue(particle.baseOpacity);
  var drift = useSharedValue(0);

  useEffect(function () {
    if (skipAnim) {
      cancelAnimation(opacity); cancelAnimation(drift);
      opacity.value = particle.baseOpacity;
      drift.value = 0;
      return;
    }
    opacity.value = withDelay(particle.delay, withRepeat(withSequence(
      withTiming(Math.min(0.9, particle.baseOpacity + 0.35), { duration: particle.speed * 0.45, easing: Easing.inOut(Easing.sin) }),
      withTiming(0.08, { duration: particle.speed * 0.55, easing: Easing.inOut(Easing.sin) })
    ), -1, true));
    drift.value = withDelay(particle.delay / 2, withRepeat(withSequence(
      withTiming(1, { duration: particle.speed, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: particle.speed, easing: Easing.inOut(Easing.sin) })
    ), -1, true));
    return function () { cancelAnimation(opacity); cancelAnimation(drift); };
  }, [skipAnim]);

  var style = useAnimatedStyle(function () {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: interpolate(drift.value, [0, 1], [0, -particle.drift]) },
        { scale: interpolate(opacity.value, [0.08, 0.9], [0.75, 1.35]) },
      ],
    };
  });

  return (
    <Animated.View style={[{
      position: 'absolute', left: particle.x + '%', top: particle.y + '%',
      width: particle.size, height: particle.size, borderRadius: particle.size / 2,
      backgroundColor: particle.color,
      shadowColor: particle.color, shadowOpacity: 0.8, shadowRadius: particle.size * 2,
      shadowOffset: { width: 0, height: 0 },
    }, style]} />
  );
}

function ZodiacOrbitNode({ source, index, total, radius, rotation, size }) {
  var baseAngle = (Math.PI * 2 / total) * index - Math.PI / 2;
  var style = useAnimatedStyle(function () {
    var angle = baseAngle + rotation.value;
    return {
      transform: [
        { translateX: Math.cos(angle) * radius },
        { translateY: Math.sin(angle) * radius },
        { rotate: (-rotation.value) + 'rad' },
      ],
      opacity: interpolate(Math.sin(angle), [-1, 1], [0.5, 1]),
    };
  });

  return (
    <Animated.View style={[lsStyles.zodiacNode, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <Image source={source} style={{ width: size * 0.78, height: size * 0.78 }} resizeMode="contain" />
    </Animated.View>
  );
}

function PartnerStar({ name, fallback, color, accent, orbit, side, radiusX, radiusY }) {
  var label = name && String(name).trim() ? String(name).trim() : fallback;
  var initial = label ? label.charAt(0).toUpperCase() : '?';
  var style = useAnimatedStyle(function () {
    var angle = orbit.value + side;
    return {
      transform: [
        { translateX: Math.cos(angle) * radiusX },
        { translateY: Math.sin(angle) * radiusY },
        { scale: interpolate(Math.sin(angle), [-1, 1], [0.92, 1.08]) },
      ],
    };
  });

  return (
    <Animated.View style={[lsStyles.partnerStar, { borderColor: color + 'AA', shadowColor: color }, style]}>
      <LinearGradient colors={[color + 'EE', accent + 'CC', 'rgba(12,6,20,0.92)']} style={lsStyles.partnerStarFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <Text style={lsStyles.partnerInitial}>{initial}</Text>
    </Animated.View>
  );
}

function PorondamSignalChip({ signal, index, activeIndex, language }) {
  var isActive = index === activeIndex;
  var isDone = index < activeIndex;
  var label = language === 'si' ? signal.si : signal.en;
  var color = isActive || isDone ? signal.color : 'rgba(255,232,176,0.34)';
  return (
    <View style={[
      lsStyles.signalChip,
      isActive && { borderColor: signal.color + 'AA', backgroundColor: signal.color + '1F' },
      isDone && { borderColor: signal.color + '55', backgroundColor: signal.color + '10' },
    ]}>
      <Ionicons name={isDone ? 'checkmark-circle' : signal.icon} size={13} color={color} />
      <Text style={[lsStyles.signalText, { color: color }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function PorondamCosmicLoader({ brideName, groomName, language, reduced, lowEnd }) {
  var lang = language || 'en';
  var stages = PORONDAM_LOADING_STAGES[lang] || PORONDAM_LOADING_STAGES.en;
  var skipAnim = !!(reduced || lowEnd);
  var [stageIndex, setStageIndex] = useState(0);

  var wheelRotation = useSharedValue(0);
  var reverseRotation = useSharedValue(0);
  var partnerOrbit = useSharedValue(-Math.PI / 2);
  var corePulse = useSharedValue(1);
  var auraPulse = useSharedValue(0.35);
  var sweep = useSharedValue(0);
  var entrance = useSharedValue(0);

  useEffect(function () {
    entrance.value = withTiming(1, { duration: skipAnim ? 1 : 700, easing: Easing.out(Easing.cubic) });
    if (skipAnim) {
      cancelAnimation(wheelRotation); cancelAnimation(reverseRotation); cancelAnimation(partnerOrbit);
      cancelAnimation(corePulse); cancelAnimation(auraPulse); cancelAnimation(sweep);
      wheelRotation.value = 0; reverseRotation.value = 0; partnerOrbit.value = -Math.PI / 2;
      corePulse.value = 1; auraPulse.value = 0.42; sweep.value = 0.2;
    } else {
      wheelRotation.value = withRepeat(withTiming(Math.PI * 2, { duration: 26000, easing: Easing.linear }), -1, false);
      reverseRotation.value = withRepeat(withTiming(-Math.PI * 2, { duration: 18000, easing: Easing.linear }), -1, false);
      partnerOrbit.value = withRepeat(withTiming(Math.PI * 1.5, { duration: 6200, easing: Easing.linear }), -1, false);
      corePulse.value = withRepeat(withSequence(
        withTiming(1.08, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.94, { duration: 1500, easing: Easing.inOut(Easing.sin) })
      ), -1, true);
      auraPulse.value = withRepeat(withSequence(
        withTiming(0.75, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.28, { duration: 1800, easing: Easing.inOut(Easing.sin) })
      ), -1, true);
      sweep.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.cubic) }), -1, false);
    }

    var interval = setInterval(function () {
      setStageIndex(function (prev) { return (prev + 1) % stages.length; });
    }, 3300);
    return function () {
      clearInterval(interval);
      cancelAnimation(wheelRotation); cancelAnimation(reverseRotation); cancelAnimation(partnerOrbit);
      cancelAnimation(corePulse); cancelAnimation(auraPulse); cancelAnimation(sweep); cancelAnimation(entrance);
    };
  }, [skipAnim, stages.length]);

  var sealSize = Math.min(W - (WIDE ? 116 : 44), WIDE ? 340 : Math.min(280, H * 0.32));
  var zodiacSize = Math.max(23, sealSize * 0.085);
  var zodiacRadius = sealSize * 0.41;
  var partnerRadiusX = sealSize * 0.255;
  var partnerRadiusY = sealSize * 0.12;
  var activeSignal = Math.min(PORONDAM_SIGNAL_TRACK.length - 1, Math.floor((stageIndex / Math.max(1, stages.length - 1)) * PORONDAM_SIGNAL_TRACK.length));
  var progressPct = ((stageIndex + 1) / stages.length) * 100;
  var stage = stages[stageIndex];
  var brideLabel = brideName && String(brideName).trim() ? String(brideName).trim() : (lang === 'si' ? 'à¶¸à¶±à·à¶½à·’à¶º' : 'Bride');
  var groomLabel = groomName && String(groomName).trim() ? String(groomName).trim() : (lang === 'si' ? 'à¶¸à¶±à·à¶½à¶ºà·' : 'Groom');
  var particleSet = skipAnim ? PORONDAM_LOADING_PARTICLES.slice(0, 12) : PORONDAM_LOADING_PARTICLES;
  var mandalaLines = [];
  var center = sealSize / 2;
  for (var i = 0; i < 24; i++) {
    var angle = (Math.PI * 2 / 24) * i;
    mandalaLines.push(
      <Line
        key={'line' + i}
        x1={center + Math.cos(angle) * sealSize * 0.18}
        y1={center + Math.sin(angle) * sealSize * 0.18}
        x2={center + Math.cos(angle) * sealSize * 0.43}
        y2={center + Math.sin(angle) * sealSize * 0.43}
        stroke={i % 2 === 0 ? '#FBBF24' : '#C084FC'}
        strokeOpacity={i % 3 === 0 ? 0.34 : 0.18}
        strokeWidth={i % 2 === 0 ? 1.2 : 0.7}
      />
    );
  }

  var entranceStyle = useAnimatedStyle(function () {
    return {
      opacity: entrance.value,
      transform: [{ translateY: interpolate(entrance.value, [0, 1], [18, 0]) }],
    };
  });
  var wheelStyle = useAnimatedStyle(function () { return { transform: [{ rotate: wheelRotation.value + 'rad' }] }; });
  var reverseWheelStyle = useAnimatedStyle(function () { return { transform: [{ rotate: reverseRotation.value + 'rad' }] }; });
  var coreStyle = useAnimatedStyle(function () { return { transform: [{ scale: corePulse.value }] }; });
  var auraStyle = useAnimatedStyle(function () {
    return {
      opacity: auraPulse.value,
      transform: [{ scale: interpolate(auraPulse.value, [0.28, 0.75], [0.9, 1.12]) }],
    };
  });
  var sweepStyle = useAnimatedStyle(function () {
    return {
      opacity: skipAnim ? 0.18 : interpolate(sweep.value, [0, 0.25, 0.75, 1], [0, 0.7, 0.7, 0]),
      transform: [{ translateX: interpolate(sweep.value, [0, 1], [-sealSize * 0.55, sealSize * 0.55]) }, { rotate: '-18deg' }],
    };
  });

  return (
    <Animated.View entering={skipAnim ? undefined : FadeIn.duration(500)} style={[lsStyles.container, entranceStyle]}>
      <View style={lsStyles.particleField} pointerEvents="none">
        {particleSet.map(function (particle, i) { return <LoadingParticle key={'lp' + i} particle={particle} skipAnim={skipAnim} />; })}
      </View>

      <View style={lsStyles.kickerPill}>
        <Ionicons name="sparkles" size={13} color="#FBBF24" />
        <Text style={lsStyles.kickerText}>{lang === 'si' ? 'à¶´à·œà¶»à·œà¶±à·Šà¶¯à¶¸à·Š à¶šà·’à¶ºà·€à·“à¶¸' : 'Love Compatibility'}</Text>
      </View>

      <Text style={lsStyles.loadingTitle}>{lang === 'si' ? 'à¶œà·à·…à¶´à·“à¶¸ à·ƒà¶šà·ƒà¶¸à·’à¶±à·Š' : 'Reading Your Stars'}</Text>

      <View style={lsStyles.nameRail}>
        <View style={[lsStyles.nameCard, { borderColor: 'rgba(249,168,212,0.28)', backgroundColor: 'rgba(249,168,212,0.08)' }]}>
          <Text style={[lsStyles.nameRole, { color: '#F9A8D4' }]}>{lang === 'si' ? 'à¶¸à¶±à·à¶½à·’à¶º' : 'Bride'}</Text>
          <Text style={lsStyles.nameText} numberOfLines={1}>{brideLabel}</Text>
        </View>
        <View style={lsStyles.nameBridge}>
          <Ionicons name="heart" size={16} color="#FFB800" />
        </View>
        <View style={[lsStyles.nameCard, { borderColor: 'rgba(147,197,253,0.28)', backgroundColor: 'rgba(147,197,253,0.08)' }]}>
          <Text style={[lsStyles.nameRole, { color: '#93C5FD' }]}>{lang === 'si' ? 'à¶¸à¶±à·à¶½à¶ºà·' : 'Groom'}</Text>
          <Text style={lsStyles.nameText} numberOfLines={1}>{groomLabel}</Text>
        </View>
      </View>

      <View style={[lsStyles.seal, { width: sealSize, height: sealSize, borderRadius: sealSize / 2 }]}>
        <Animated.View style={[lsStyles.sealAura, { width: sealSize * 0.86, height: sealSize * 0.86, borderRadius: sealSize * 0.43 }, auraStyle]}>
          <LinearGradient colors={['rgba(255,184,0,0.24)', 'rgba(244,114,182,0.16)', 'rgba(96,165,250,0.10)']} style={StyleSheet.absoluteFill} />
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFillObject, wheelStyle]}>
          <Svg width={sealSize} height={sealSize}>
            <Defs>
              <SvgLinearGradient id="porondamGold" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#FBBF24" stopOpacity="0.95" />
                <Stop offset="0.52" stopColor="#F472B6" stopOpacity="0.7" />
                <Stop offset="1" stopColor="#60A5FA" stopOpacity="0.8" />
              </SvgLinearGradient>
            </Defs>
            <G>
              <Circle cx={center} cy={center} r={sealSize * 0.45} stroke="url(#porondamGold)" strokeWidth="1.5" strokeDasharray="5 11" fill="none" opacity="0.9" />
              <Circle cx={center} cy={center} r={sealSize * 0.34} stroke="#FBBF24" strokeWidth="0.8" strokeDasharray="2 7" fill="none" opacity="0.32" />
              <Circle cx={center} cy={center} r={sealSize * 0.22} stroke="#C084FC" strokeWidth="0.9" fill="none" opacity="0.34" />
              {mandalaLines}
            </G>
          </Svg>
        </Animated.View>

        <Animated.View style={[lsStyles.innerGeometry, reverseWheelStyle]}>
          <View style={lsStyles.geometryLine} />
          <View style={[lsStyles.geometryLine, { transform: [{ rotate: '60deg' }] }]} />
          <View style={[lsStyles.geometryLine, { transform: [{ rotate: '120deg' }] }]} />
        </Animated.View>

        {ZODIAC_IMAGE_LIST.map(function (source, i) {
          return <ZodiacOrbitNode key={'z' + i} source={source} index={i} total={ZODIAC_IMAGE_LIST.length} radius={zodiacRadius} rotation={wheelRotation} size={zodiacSize} />;
        })}

        <View style={[lsStyles.partnerTrack, { width: sealSize * 0.58, height: sealSize * 0.28, borderRadius: sealSize * 0.14 }]} />
        <PartnerStar name={brideName} fallback={lang === 'si' ? 'à¶¸à¶±à·à¶½à·’à¶º' : 'Bride'} color="#F9A8D4" accent="#EC4899" orbit={partnerOrbit} side={0} radiusX={partnerRadiusX} radiusY={partnerRadiusY} />
        <PartnerStar name={groomName} fallback={lang === 'si' ? 'à¶¸à¶±à·à¶½à¶ºà·' : 'Groom'} color="#93C5FD" accent="#3B82F6" orbit={partnerOrbit} side={Math.PI} radiusX={partnerRadiusX} radiusY={partnerRadiusY} />

        <Animated.View style={[lsStyles.coreSeal, coreStyle]}>
          <LinearGradient colors={['rgba(255,184,0,0.95)', 'rgba(255,140,0,0.82)', 'rgba(124,58,237,0.86)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <View style={lsStyles.coreInner}>
            <Ionicons name="heart" size={30} color="#FFF7D6" />
          </View>
          <Animated.View style={[lsStyles.coreSweep, sweepStyle]} />
        </Animated.View>
      </View>

      <Animated.View key={'stage' + stageIndex} entering={skipAnim ? undefined : FadeInUp.duration(420)} style={lsStyles.textWrap}>
        <View style={lsStyles.stageIcon}>
          <Ionicons name={stage.icon} size={18} color="#FFB800" />
        </View>
        <Text style={lsStyles.stageText}>{stage.title}</Text>
        <Text style={lsStyles.stageSub}>{stage.sub}</Text>
      </Animated.View>

      <View style={lsStyles.signalGrid}>
        {PORONDAM_SIGNAL_TRACK.map(function (signal, i) {
          return <PorondamSignalChip key={signal.en} signal={signal} index={i} activeIndex={activeSignal} language={lang} />;
        })}
      </View>

      <View style={lsStyles.progressRow}>
        <View style={lsStyles.progressHeader}>
          <Text style={lsStyles.progressLabel}>{lang === 'si' ? 'à¶œà¶«à¶±à¶º à·€à·™à¶¸à·’à¶±à·Š' : 'Analysing'}</Text>
          <Text style={lsStyles.progressCount}>{stageIndex + 1}/{stages.length}</Text>
        </View>
        <View style={lsStyles.progressBar}>
          <LinearGradient colors={['#F9A8D4', '#FFB800', '#60A5FA']}
            style={[lsStyles.progressFill, { width: progressPct + '%' }]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
        </View>
        <Text style={lsStyles.progressHint}>{lang === 'si' ? 'à¶­à¶­à·Šà¶´à¶» à¶šà·’à·„à·’à¶´à¶ºà¶šà·Š à¶œà¶­ à·€à·š' : 'Good things take a moment'}</Text>
      </View>
    </Animated.View>
  );
}

var lsStyles = StyleSheet.create({
  loadingScreen: { flexGrow: 1, minHeight: H * 0.9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: WIDE ? 38 : 12 },
  container: { width: '100%', maxWidth: 520, alignItems: 'center', paddingHorizontal: 18, paddingVertical: WIDE ? 24 : 14 },
  particleField: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  kickerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(251,191,36,0.28)',
    backgroundColor: 'rgba(255,184,0,0.08)', marginBottom: 12,
  },
  kickerText: { color: 'rgba(255,232,176,0.72)', fontSize: 11, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  loadingTitle: {
    color: '#FFF1D0', fontSize: WIDE ? 28 : 23, fontWeight: '900', textAlign: 'center', marginBottom: 14,
    letterSpacing: 0, ...textShadow('rgba(255,184,0,0.36)', { width: 0, height: 2 }, 12),
  },
  nameRail: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: WIDE ? 16 : 10 },
  nameCard: {
    flex: 1, minHeight: 58, maxWidth: 190, borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center', overflow: 'hidden',
  },
  nameRole: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
  nameText: { color: '#FFE8B0', fontSize: 14, fontWeight: '800' },
  nameBridge: {
    width: 38, height: 38, borderRadius: 19, marginHorizontal: 7, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,184,0,0.10)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.30)',
    ...boxShadow('#FFB800', { width: 0, height: 0 }, 0.55, 9), elevation: 7,
  },
  seal: { alignItems: 'center', justifyContent: 'center', marginVertical: WIDE ? 8 : 4 },
  sealAura: { position: 'absolute', overflow: 'hidden' },
  zodiacNode: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1, borderColor: 'rgba(255,232,176,0.12)', ...boxShadow('rgba(251,191,36,0.38)', { width: 0, height: 0 }, 0.45, 6), elevation: 4,
  },
  innerGeometry: { position: 'absolute', width: '45%', height: '45%', alignItems: 'center', justifyContent: 'center', opacity: 0.36 },
  geometryLine: { position: 'absolute', width: '100%', height: 1, backgroundColor: 'rgba(255,232,176,0.35)' },
  partnerTrack: { position: 'absolute', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,232,176,0.18)', transform: [{ rotate: '-10deg' }] },
  partnerStar: {
    position: 'absolute', width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 2, shadowOpacity: 0.82, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 12,
  },
  partnerStarFill: { ...StyleSheet.absoluteFillObject, borderRadius: 26 },
  partnerInitial: { color: '#FFF7D6', fontSize: 20, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 5, textShadowOffset: { width: 0, height: 1 } },
  coreSeal: {
    width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(255,247,214,0.45)', ...boxShadow('#FFB800', { width: 0, height: 0 }, 0.9, 24), elevation: 16,
  },
  coreInner: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,8,30,0.36)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  coreSweep: { position: 'absolute', width: 34, height: 120, backgroundColor: 'rgba(255,255,255,0.24)' },
  textWrap: { width: '100%', minHeight: 90, alignItems: 'center', justifyContent: 'flex-start', marginTop: WIDE ? 10 : 4, marginBottom: 8 },
  stageIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 8, backgroundColor: 'rgba(255,184,0,0.10)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.22)' },
  stageText: { color: '#FFE8B0', fontSize: 17, fontWeight: '900', textAlign: 'center', marginBottom: 7, lineHeight: 23, letterSpacing: 0 },
  stageSub: { color: 'rgba(255,232,176,0.58)', fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: WIDE ? 36 : 10, maxWidth: 430 },
  signalGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7, marginBottom: 16 },
  signalChip: {
    height: 30, minWidth: 78, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.035)', paddingHorizontal: 9,
  },
  signalText: { fontSize: 11, fontWeight: '800' },
  progressRow: { width: '100%', maxWidth: 390, alignItems: 'stretch' },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  progressLabel: { color: 'rgba(255,232,176,0.42)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  progressCount: { color: '#FFB800', fontSize: 11, fontWeight: '900' },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressHint: { color: 'rgba(255,255,255,0.28)', fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 9 },
});

function ScoreGauge({ score, maxScore, rating, ratingEmoji, ratingSinhala, language, onShare, T, brideName, groomName, factors, brideRashiId, groomRashiId }) {
  var pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  var color = pct >= 75 ? '#34D399' : pct >= 50 ? '#FFB800' : pct >= 30 ? '#F97316' : '#F87171';

  var cosmicLabel = pct >= 75
    ? (language === 'si' ? '\u0DAF\u0DD2\u0DC0\u0DCA\u200D\u0DBA \u0D9C\u0DD0\u0DBD\u0DB4\u0DD3\u0DB8' : 'Celestial Union')
    : pct >= 50
    ? (language === 'si' ? '\u0DAD\u0DCF\u0DBB\u0D9A\u0DCF \u0D9C\u0DD0\u0DBD\u0DB4\u0DD3\u0DB8' : 'Star-Crossed Harmony')
    : pct >= 30
    ? (language === 'si' ? '\u0DB6\u0DCA\u200D\u0DBB\u0DC4\u0DCA\u0DB8\u0DCF\u0DAB\u0DCA\u0DA9 \u0D9C\u0DB8\u0DB1\u0DCF\u0DC0' : 'Cosmic Journey')
    : (language === 'si' ? '\u0DA2\u0DCA\u200D\u0DBA\u0DDD\u0DAD\u0DD2\u0DC2 \u0D85\u0DB7\u0DD2\u0DBA\u0DDD\u0D9C\u0DBA' : 'Galactic Challenge');

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
            <Text style={{ color: '#F9A8D4', fontSize: 13, fontWeight: '800' }}>{brideName || (language === 'si' ? 'à¶¸à¶±à·à¶½à·’à¶º' : 'Bride')}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '600', marginTop: 2 }}>{language === 'si' ? (RASHI_SI[brideRashiName] || brideRashiName) : brideRashiName}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 60, height: 60, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: color + '50', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: color }}>{pct}<Text style={{ fontSize: 12 }}>%</Text></Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '600', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {language === 'si' ? 'à¶œà·à·…à¶´à·“à¶¸' : 'Match'}
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(147,197,253,0.10)', borderWidth: 2, borderColor: 'rgba(147,197,253,0.30)', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' }}>
              <Image source={groomZodiac} style={{ width: 52, height: 52 }} resizeMode="contain" />
            </View>
            <Text style={{ color: '#93C5FD', fontSize: 13, fontWeight: '800' }}>{groomName || (language === 'si' ? 'à¶¸à¶±à·à¶½à¶ºà·' : 'Groom')}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '600', marginTop: 2 }}>{language === 'si' ? (RASHI_SI[groomRashiName] || groomRashiName) : groomRashiName}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'center', paddingBottom: 12 }}>
          <Text style={{ color: color, fontSize: 16, fontWeight: '800', marginBottom: 4 }}>
            {language === 'si' ? 'à¶‘à¶šà·à¶¶à¶¯à·Šà¶° à¶œà·à·…à¶´à·“à¶¸  ~ ' + pct + '%' : 'Overall compatibility  ~ ' + pct + '%'}
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
              return getCompatibilityFactorCopy(f.name, language, f.score, f.maxScore).shortName;
            })}
          />
        </Glass>
      )}

      {/* Rating + Actions */}
      <Glass accent style={{ overflow: 'hidden' }}>
        <LinearGradient
          colors={[color + '08', 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16 }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: color + '14', borderWidth: 1.5, borderColor: color + '30', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={pct >= 75 ? 'sparkles' : pct >= 50 ? 'star' : pct >= 30 ? 'star-half' : 'cloudy-night'} size={20} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: color }}>{label}</Text>
                <View style={{ backgroundColor: color + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: color }}>{score}/{maxScore}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginTop: 3 }}>{T.overall}</Text>
            </View>
          </View>
          <TouchableOpacity style={sty.shareChip} onPress={onShare} activeOpacity={0.7}>
            <Ionicons name="share-social" size={15} color="#FF8C00" />
            <Text style={sty.shareChipText}>{T.shareBtn}</Text>
          </TouchableOpacity>
        </View>
      </Glass>
    </View>
  );
}

// Factor Bar Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function FactorBar({ f, index, language }) {
  var pct = f.maxScore > 0 ? f.score / f.maxScore : 0;
  var copy = getCompatibilityFactorCopy(f.name, language, f.score, f.maxScore);
  var tier = copy.tier;
  var iconName = tier === 'good' ? 'checkmark-circle' : tier === 'mixed' ? 'alert-circle' : 'close-circle';
  var iconColor = tier === 'good' ? '#34D399' : tier === 'mixed' ? '#FFB800' : '#F87171';
  var barColor = tier === 'good' ? ['#34D399', '#10B981'] : tier === 'mixed' ? ['#FFB800', '#F59E0B'] : ['#F87171', '#EF4444'];
  return (
    <Animated.View entering={FadeInUp.delay(80 * index).duration(500)} style={sty.factorItem}>
      <View style={sty.factorTop}>
        <View style={sty.factorNameRow}>
          <View style={[sty.factorIconWrap, { backgroundColor: iconColor + '18', borderColor: iconColor + '30' }]}>
            <Ionicons name={iconName} size={16} color={iconColor} />
          </View>
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={sty.factorName}>{copy.plainName}</Text>
            {language === 'si' && <Text style={sty.factorTech}>{copy.techName}</Text>}
          </View>
          <View style={[sty.factorScorePill, { backgroundColor: iconColor + '12', borderColor: iconColor + '28' }]}>
            <Text style={[sty.factorScoreText, { color: iconColor }]}>{f.score}/{f.maxScore}</Text>
          </View>
        </View>
      </View>
      <View style={sty.barTrack}>
        <Animated.View entering={FadeIn.delay(200 + 80 * index).duration(800)} style={[sty.barFill, { width: (pct * 100) + '%' }]}>
          <LinearGradient colors={barColor} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </View>
      {copy.insight ? <Text style={sty.factorInsight}>{copy.insight}</Text> : null}
    </Animated.View>
  );
}
// Labels
var L = {
  en: {
    title: 'Compatibility', subtitle: 'Marriage Compatibility Check',
    bride: 'Bride', groom: 'Groom',
    namePh: 'Full name',
    yearPh: 'YYYY', monthPh: 'MM', dayPh: 'DD', hourPh: 'HH', minutePh: 'MM',
    date: 'Date of Birth', time: 'Time',
    birthPlace: 'Birth Place',
    timeHint: '* Check birth certificate for exact time',
    checkBtn: 'Check Compatibility',
    brideChart: "Bride's Birth Details", groomChart: "Groom's Birth Details",
    factors: 'Relationship Signals', factorsSub: '7 Signals \u00B7 20 Points',
    doshas: 'Challenges', report: 'Detailed Report',
    reportQ: 'Get detailed analysis in:',
    si: '\u0DC3\u0DD2\u0D82\u0DC4\u0DBD', en: 'English',
    generating: 'Writing your report...', shareBtn: 'Share',
    reportBusy: 'Report service is busy right now. Your retry is saved, so try again in a few minutes without paying again.',
    reportFailed: 'Failed to generate report. Please try again.',
    overall: 'Compatibility Score',
    missing: 'Please enter birth dates for both bride and groom',
    edit: 'Change Details', calculating: 'Reading relationship signals...',
    history: 'Previous Checks', historyEmpty: 'No saved checks yet',
    historyLoading: 'Loading saved checks...', viewReport: 'View Report',
    newCheck: '+ New Check',
    // Porondam+ Advanced
    advancedTitle: 'Deep Compatibility',
    advancedSub: 'Beyond the 7 signals',
    combinedScore: 'Combined Score',
    dashaTitle: 'Life Phase Match',
    currentPhase: 'Current Life Period',
    benefic: 'Supportive',
    malefic: 'Needs Care',
    navamshaTitle: 'Deep Relationship Match',
    mangalaTitle: 'Conflict Care Check',
    marriageStrTitle: 'Relationship Support Strength',
    venus: 'Affection Support',
    lord7: 'Commitment Support',
    weddingTitle: 'Best Wedding Windows',
    noWindows: 'No overlapping favorable window found',
  },
  si: {
    title: '\u0DC3\u0DB6\u0DB3\u0DAD\u0DCF \u0D9C\u0DD0\u0DBD\u0DB4\u0DD3\u0DB8', subtitle: '\u0DC0\u0DD2\u0DC0\u0DCF\u0DC4 \u0D9C\u0DD0\u0DBD\u0DB4\u0DD3\u0DB8\u0DCA \u0DB4\u0DBB\u0DD3\u0D9A\u0DCA\u0DC2\u0DCF\u0DC0',
    bride: '\u0DB8\u0DB1\u0DCF\u0DBD\u0DD2\u0DBA', groom: '\u0DB8\u0DB1\u0DCF\u0DBD\u0DBA\u0DCF',
    namePh: '\u0DC3\u0DB8\u0DCA\u0DB4\u0DD6\u0DBB\u0DCA\u0DAB \u0DB1\u0DB8',
    yearPh: 'YYYY', monthPh: 'MM', dayPh: 'DD', hourPh: 'HH', minutePh: 'MM',
    date: '\u0D89\u0DB4\u0DB1\u0DCA \u0DAF\u0DD2\u0DB1\u0DBA', time: '\u0DC0\u0DDA\u0DBD\u0DCF\u0DC0',
    birthPlace: '\u0D8B\u0DB4\u0DB1\u0DCA \u0DC3\u0DCA\u0DAE\u0DCF\u0DB1\u0DBA',
    timeHint: '* \u0D89\u0DB4\u0DCA\u0DB4\u0DD0\u0DB1\u0DCA\u0DB1 \u0DB4\u0DAD\u0DCA\u200D\u0DBB\u0DBA\u0DDA \u0DC0\u0DDA\u0DBD\u0DCF\u0DC0 \u0DB6\u0DBD\u0DB1\u0DCA\u0DB1',
    checkBtn: '\u0DB4\u0DDC\u0DBB\u0DDC\u0DB1\u0DCA\u0DAF\u0DB8\u0DCA \u0DB6\u0DBD\u0DB1\u0DCA\u0DB1',
    brideChart: '\u0DB8\u0DB1\u0DCF\u0DBD\u0DD2\u0DBA\u0D9C\u0DDA \u0D8B\u0DB4\u0DB1\u0DCA \u0DC0\u0DD2\u0DC3\u0DCA\u0DAD\u0DBB', groomChart: '\u0DB8\u0DB1\u0DCF\u0DBD\u0DBA\u0DCF\u0D9C\u0DDA \u0D8B\u0DB4\u0DB1\u0DCA \u0DC0\u0DD2\u0DC3\u0DCA\u0DAD\u0DBB',
    factors: '\u0DC3\u0DB6\u0DB3\u0DAD\u0DCF \u0DBD\u0D9A\u0DD4\u0DAB\u0DD4', factorsSub: '\u0DBD\u0D9A\u0DD4\u0DAB\u0DD4 7 \u00B7 \u0DBD\u0D9A\u0DD4\u0DAB\u0DD4 20',
    doshas: '\u0D85\u0DB7\u0DD2\u0DBA\u0DDD\u0D9C', report: '\u0DC3\u0DC0\u0DD2\u0DC3\u0DCA\u0DAD\u0DBB \u0DC0\u0DCF\u0DBB\u0DCA\u0DAD\u0DCF\u0DC0',
    reportQ: '\u0DC3\u0DC0\u0DD2\u0DC3\u0DCA\u0DAD\u0DBB \u0DC0\u0DD2\u0DC1\u0DCA\u0DBD\u0DDA\u0DC2\u0DAB\u0DBA:',
    si: '\u0DC3\u0DD2\u0D82\u0DC4\u0DBD', en: 'English',
    generating: '\u0DC0\u0DCF\u0DBB\u0DCA\u0DAD\u0DCF\u0DC0 \u0DBD\u0DD2\u0DBA\u0DB8\u0DD2\u0DB1\u0DCA...', shareBtn: '\u0DBA\u0DC0\u0DB1\u0DCA\u0DB1',
    reportBusy: '\u0DC0\u0DCF\u0DBB\u0DCA\u0DAD\u0DCF\u0DC0 \u0DBD\u0DD2\u0DBA\u0DB1 \u0DC3\u0DDA\u0DC0\u0DCF\u0DC0 \u0DB8\u0DDA \u0DB8\u0DDC\u0DC4\u0DDC\u0DAD\u0DDA \u0D9A\u0DCF\u0DBB\u0DCA\u0DBA\u0DB6\u0DC4\u0DD4\u0DBD\u0DBA\u0DD2. \u0D94\u0DB6\u0DDA \u0DB1\u0DD0\u0DC0\u0DAD \u0D8B\u0DAD\u0DCA\u0DC3\u0DCF\u0DC4\u0DBA \u0DC3\u0DD4\u0DBB\u0D9A\u0DCA\u0DC2\u0DD2\u0DAD\u0DBA\u0DD2. \u0DB8\u0DD2\u0DB1\u0DD2\u0DAD\u0DCA\u0DAD\u0DD4 \u0D9A\u0DD2\u0DC4\u0DD2\u0DB4\u0DBA\u0D9A\u0DD2\u0DB1\u0DCA \u0DB1\u0DD0\u0DC0\u0DAD \u0D8B\u0DAD\u0DCA\u0DC3\u0DCF\u0DC4 \u0D9A\u0DBB\u0DB1\u0DCA\u0DB1.',
    reportFailed: '\u0DC0\u0DCF\u0DBB\u0DCA\u0DAD\u0DCF\u0DC0 \u0DC4\u0DAF\u0DB1\u0DCA\u0DB1 \u0DB6\u0DD0\u0DBB\u0DD2 \u0DC0\u0DD4\u0DAB\u0DCF. \u0D9A\u0DBB\u0DD4\u0DAB\u0DCF\u0D9A\u0DBB \u0DB1\u0DD0\u0DC0\u0DAD \u0D8B\u0DAD\u0DCA\u0DC3\u0DCF\u0DC4 \u0D9A\u0DBB\u0DB1\u0DCA\u0DB1.',
    overall: '\u0D9C\u0DD0\u0DBD\u0DB4\u0DD3\u0DB8\u0DCA \u0DBD\u0D9A\u0DD4\u0DAB\u0DD4',
    missing: '\u0DAF\u0DD9\u0DAF\u0DD9\u0DB1\u0DCF\u0D9C\u0DDA\u0DB8 \u0D89\u0DB4\u0DB1\u0DCA \u0DAF\u0DD2\u0DB1\u0DBA \u0DAF\u0DCF\u0DB1\u0DCA\u0DB1',
    edit: '\u0DC0\u0DD2\u0DC3\u0DCA\u0DAD\u0DBB \u0DC0\u0DD9\u0DB1\u0DC3\u0DCA \u0D9A\u0DBB\u0DB1\u0DCA\u0DB1', calculating: '\u0DC3\u0DB6\u0DB3\u0DAD\u0DCF \u0DBB\u0DA7\u0DCF \u0D9A\u0DD2\u0DBA\u0DC0\u0DB8\u0DD2\u0DB1\u0DCA...',
    history: '\u0DB4\u0DD9\u0DBB \u0DB4\u0DBB\u0DD3\u0D9A\u0DCA\u0DC2\u0DCF', historyEmpty: '\u0DC3\u0DD4\u0DBB\u0D9A\u0DD2\u0DB1 \u0DB4\u0DBB\u0DD3\u0D9A\u0DCA\u0DC2\u0DCF \u0DB1\u0DD0\u0DAD',
    historyLoading: '\u0DC3\u0DD4\u0DBB\u0D9A\u0DD2\u0DB1 \u0DB4\u0DBB\u0DD3\u0D9A\u0DCA\u0DC2\u0DCF \u0DB6\u0DBD\u0DB8\u0DD2\u0DB1\u0DCA...', viewReport: '\u0DC0\u0DCF\u0DBB\u0DCA\u0DAD\u0DCF\u0DC0 \u0DB6\u0DBD\u0DB1\u0DCA\u0DB1',
    newCheck: '+ \u0DB1\u0DC0 \u0DB4\u0DBB\u0DD3\u0D9A\u0DCA\u0DC2\u0DCF\u0DC0',
    // Porondam+ Advanced
    advancedTitle: '\u0D9C\u0DD0\u0DB9\u0DD4\u0DBB\u0DD4 \u0D9C\u0DD0\u0DBD\u0DB4\u0DD4\u0DB8',
    advancedSub: '\u0DC3\u0DB6\u0DB3\u0DAD\u0DCF \u0DBB\u0DA7\u0DCF 7 \u0D94\u0DB6\u0DCA\u0DB6\u0DA7',
    combinedScore: '\u0D91\u0D9A\u0DCF\u0DB6\u0DAF\u0DCA\u0DB0 \u0DBD\u0D9A\u0DD4\u0DAB\u0DD4',
    dashaTitle: '\u0DA2\u0DD3\u0DC0\u0DD2\u0DAD \u0D85\u0DAF\u0DD2\u0DBA\u0DBB \u0D9C\u0DD0\u0DBD\u0DB4\u0DD4\u0DB8',
    currentPhase: '\u0DAF\u0DD0\u0DB1\u0DCA \u0D89\u0DB1\u0DCA\u0DB1 \u0DA2\u0DD3\u0DC0\u0DD2\u0DAD \u0D85\u0DAF\u0DD2\u0DBA\u0DBB',
    benefic: '\u0DC3\u0DC4\u0DCF\u0DBA \u0DAF\u0DD9\u0DBA\u0DD2',
    malefic: '\u0DC0\u0DD0\u0DA9\u0DD2 \u0DC3\u0DD0\u0DBD\u0D9A\u0DD2\u0DBD\u0DCA\u0DBD\u0D9A\u0DCA \u0D95\u0DB1',
    navamshaTitle: '\u0D9C\u0DD0\u0DB9\u0DD4\u0DBB\u0DD4 \u0DC3\u0DB6\u0DB3\u0DAD\u0DCF \u0D9C\u0DD0\u0DBD\u0DB4\u0DD3\u0DB8',
    mangalaTitle: '\u0D9C\u0DD0\u0DA7\u0DD4\u0DB8\u0DCA \u0DC3\u0DD0\u0DBD\u0D9A\u0DD2\u0DBD\u0DCA\u0DBD \u0DB4\u0DBB\u0DD3\u0D9A\u0DCA\u0DC2\u0DCF\u0DC0',
    marriageStrTitle: '\u0DC3\u0DB6\u0DB3\u0DAD\u0DCF \u0DC3\u0DC4\u0DCF\u0DBA \u0DC1\u0D9A\u0DCA\u0DAD\u0DD2\u0DBA',
    venus: '\u0D86\u0DAF\u0DBB \u0DC3\u0DC4\u0DCF\u0DBA',
    lord7: '\u0D9A\u0DD0\u0DB4\u0DC0\u0DD3\u0DB8\u0DCA \u0DC3\u0DC4\u0DCF\u0DBA',
    weddingTitle: '\u0DC4\u0DDC\u0DB3\u0DB8 \u0DC0\u0DD2\u0DC0\u0DCF\u0DC4 \u0D9A\u0DCF\u0DBD',
    noWindows: '\u0D9C\u0DD0\u0DBD\u0DB4\u0DD9\u0DB1 \u0DC3\u0DD4\u0DB7 \u0D9A\u0DCF\u0DBD\u0DBA\u0D9A\u0DCA \u0DC4\u0DB8\u0DD4 \u0DB1\u0DDC\u0DC0\u0DD4\u0DBA',
  },
};

// ======= STRENGTHS SUMMARY CARD =======

// ======= STAR PROFILES CARD =======
function StarProfilesCard({ data, language, bName, gName }) {
  if (!data.bride || !data.groom) return null;
  var bride = data.bride;
  var groom = data.groom;
  var T = language === 'si';
  return (
    <Animated.View entering={FadeInUp.delay(300).duration(600)}>
      <Glass style={sty.section}>
        <View style={sty.secHeader}>
          <View>
            <Text style={sty.secTitle}><Ionicons name="star" size={15} color="#FFE8B0" /> {T ? '\u0DB1\u0DD0\u0D9A\u0DAD\u0DCA \u0DB4\u0DBB\u0DD2\u0DA0\u0DCA\u0DA1\u0DDA\u0DAF' : 'Star Profiles'}</Text>
            <Text style={sty.secSub}>{T ? '\u0D94\u0DB6\u0D9C\u0DDA \u0DA2\u0DCA\u200D\u0DBA\u0DDD\u0DAD\u0DD2\u0DC2 \u0DC4\u0DD0\u0DB3\u0DD4\u0DB1\u0DD4\u0DB8' : 'Your cosmic identity'}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={sty.profilePill}>
            <View style={[sty.profileDot, { backgroundColor: '#F9A8D4' }]} />
            <Text style={sty.profileName}>{bName || (T ? '\u0DB8\u0DB1\u0DBD\u0DD2' : 'Her')}</Text>
            <Text style={sty.profileSign}>{bride.rashi ? (T ? bride.rashi.sinhala : bride.rashi.name) : ''}</Text>
            <Text style={sty.profileStar}>{bride.nakshatra ? (T ? bride.nakshatra.sinhala : bride.nakshatra.name) : ''}{bride.nakshatra && bride.nakshatra.pada ? ' \u00B7 Q' + bride.nakshatra.pada : ''}</Text>
            <Text style={sty.profileLord}>{T ? '\u0D85\u0DB0\u0DD2\u0DB4\u0DAD\u0DD2: ' : 'Ruled by: '}{bride.nakshatra ? bride.nakshatra.lord : ''}</Text>
          </View>
          <View style={sty.profilePill}>
            <View style={[sty.profileDot, { backgroundColor: '#93C5FD' }]} />
            <Text style={sty.profileName}>{gName || (T ? '\u0DB8\u0DD4\u0DC4\u0DD4\u0DAB' : 'Him')}</Text>
            <Text style={sty.profileSign}>{groom.rashi ? (T ? groom.rashi.sinhala : groom.rashi.name) : ''}</Text>
            <Text style={sty.profileStar}>{groom.nakshatra ? (T ? groom.nakshatra.sinhala : groom.nakshatra.name) : ''}{groom.nakshatra && groom.nakshatra.pada ? ' \u00B7 Q' + groom.nakshatra.pada : ''}</Text>
            <Text style={sty.profileLord}>{T ? '\u0D85\u0DB0\u0DD2\u0DB4\u0DAD\u0DD2: ' : 'Ruled by: '}{groom.nakshatra ? groom.nakshatra.lord : ''}</Text>
          </View>
        </View>
      </Glass>
    </Animated.View>
  );
}

// ======= ATTRACTION & CHEMISTRY CARD =======
function AttractionCard({ data, language }) {
  var mag = data.magnetism;
  if (!mag || !mag.totalScore) return null;
  var T = language === 'si';
  var score = mag.totalScore;
  var max = mag.maxScore || 10;
  var pct = max > 0 ? score / max : 0;

  var getTier = function(val) {
    if (!val) return { label: T ? '\u0DB8\u0DB0\u0DCA\u200D\u0DBA\u0DB8' : 'Moderate', color: '#FFB800' };
    var v = String(val).toLowerCase();
    if (v.indexOf('strong') !== -1 || v.indexOf('excellent') !== -1 || v.indexOf('high') !== -1) return { label: T ? '\u0DB4\u0DCA\u200D\u0DBB\u0DB6\u0DBD' : 'Strong', color: '#34D399' };
    if (v.indexOf('weak') !== -1 || v.indexOf('low') !== -1 || v.indexOf('none') !== -1) return { label: T ? '\u0D85\u0DA9\u0DD4' : 'Mild', color: '#F87171' };
    return { label: T ? '\u0DB8\u0DB0\u0DCA\u200D\u0DBA\u0DB8' : 'Moderate', color: '#FFB800' };
  };

  var passion = getTier(mag.marsVenusConnection);
  var love = getTier(mag.venusVenusAspect);
  var emotional = getTier(mag.moonConnection);

  return (
    <Animated.View entering={FadeInUp.delay(1000).duration(700)}>
      <Glass style={sty.section}>
        <View style={sty.secHeader}>
          <View style={{ flex: 1 }}>
            <Text style={sty.secTitle}><Ionicons name="magnet" size={15} color="#F472B6" /> {T ? '\u0D86\u0D9A\u0DBB\u0DCA\u0DC2\u0DAB\u0DBA \u0DC4\u0DCF \u0DBB\u0DC3\u0DC0\u0DD2\u0DAF\u0DCA\u200D\u0DBA\u0DCF\u0DC0' : 'Attraction & Chemistry'}</Text>
            <Text style={sty.secSub}>{T ? '\u0D94\u0DB6 \u0DAF\u0DD9\u0DAF\u0DD9\u0DB1\u0DCF \u0D85\u0DAD\u0DBB \u0D86\u0D9A\u0DBB\u0DCA\u0DC2\u0DAB\u0DBA' : 'How strongly you\'re drawn together'}</Text>
          </View>
          <View style={[sty.factorScorePill, { backgroundColor: 'rgba(244,114,182,0.12)', borderColor: 'rgba(244,114,182,0.28)' }]}>
            <Text style={[sty.factorScoreText, { color: '#F472B6' }]}>{score}/{max}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
          <View style={sty.chemPill}>
            <View style={[sty.chemIcon, { backgroundColor: passion.color + '15', borderColor: passion.color + '30' }]}>
              <Ionicons name="flame" size={16} color={passion.color} />
            </View>
            <Text style={sty.chemLabel}>{T ? '\u0D86\u0DC0\u0DDA\u0D9C\u0DBA' : 'Passion'}</Text>
            <Text style={[sty.chemTier, { color: passion.color }]}>{passion.label}</Text>
          </View>
          <View style={sty.chemPill}>
            <View style={[sty.chemIcon, { backgroundColor: love.color + '15', borderColor: love.color + '30' }]}>
              <Ionicons name="heart" size={16} color={love.color} />
            </View>
            <Text style={sty.chemLabel}>{T ? '\u0D86\u0DAF\u0DBB\u0DBA' : 'Love'}</Text>
            <Text style={[sty.chemTier, { color: love.color }]}>{love.label}</Text>
          </View>
          <View style={sty.chemPill}>
            <View style={[sty.chemIcon, { backgroundColor: emotional.color + '15', borderColor: emotional.color + '30' }]}>
              <Ionicons name="moon" size={16} color={emotional.color} />
            </View>
            <Text style={sty.chemLabel}>{T ? '\u0DC4\u0DD0\u0D9F\u0DD3\u0DB8\u0DCA' : 'Emotional'}</Text>
            <Text style={[sty.chemTier, { color: emotional.color }]}>{emotional.label}</Text>
          </View>
        </View>
        {mag.category && (
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 12, textAlign: 'center', fontStyle: 'italic' }}>
            {T ? mag.description || mag.category : mag.description || mag.category}
          </Text>
        )}
      </Glass>
    </Animated.View>
  );
}

// ======= DEEPER CONNECTION CARD =======
function DeeperConnectionCard({ data, language }) {
  var adv = data.advancedPorondam && data.advancedPorondam.advanced;
  if (!adv) return null;
  var T = language === 'si';

  var rows = [];

  // Life Phase Sync (Dasha)
  if (adv.dashaCompatibility) {
    var dc = adv.dashaCompatibility;
    var harmony = dc.harmony || 'mixed';
    var hColor = harmony === 'harmonious' ? '#34D399' : harmony === 'conflicting' ? '#F87171' : '#FFB800';
    var hLabel = harmony === 'harmonious' ? (T ? '\u0D9C\u0DD0\u0DBD\u0DB4\u0DDA' : 'Aligned') : harmony === 'conflicting' ? (T ? '\u0D9C\u0DD0\u0DA7\u0DD4\u0DB8\u0DCA' : 'Conflicting') : (T ? '\u0DB8\u0DB0\u0DCA\u200D\u0DBA\u0DB8' : 'Mixed');
    var hDesc = dc.description || (harmony === 'harmonious' ? (T ? '\u0DAF\u0DD9\u0DAF\u0DD9\u0DB1\u0DCF\u0DB8 \u0DC3\u0DC4\u0DCF\u0DBA\u0D9A \u0DA2\u0DD3\u0DC0\u0DD2\u0DAD \u0D85\u0DAF\u0DD2\u0DBA\u0DBB\u0DC0\u0DBD' : 'Both in supportive life phases right now') : harmony === 'conflicting' ? (T ? '\u0DC0\u0DD9\u0DB1\u0DC3\u0DCA \u0DA2\u0DD3\u0DC0\u0DD2\u0DAD \u0D85\u0DAF\u0DD2\u0DBA\u0DBB \u2014 \u0D9A\u0DCF\u0DBD\u0DBA\u0DB8 \u0DC3\u0DD4\u0D9C\u0DB8 \u0DC0\u0DDA' : 'Different life phases — timing will improve gradually') : (T ? '\u0DC3\u0DB8\u0DC4\u0DBB \u0DC0\u0DD9\u0DB1\u0DC3\u0DCA \u0DB1\u0DB8\u0DD4\u0DAD\u0DCA \u0DC3\u0DC4\u0DCF\u0DBA\u0D9A' : 'Partly different but workable'));
    rows.push({ icon: 'time', title: T ? '\u0DA2\u0DD3\u0DC0\u0DD2\u0DAD \u0D85\u0DAF\u0DD2\u0DBA\u0DBB' : 'Life Phase Sync', badge: hLabel, badgeColor: hColor, desc: hDesc });
  }

  // Soul Bond (Navamsha)
  if (adv.navamshaCompatibility) {
    var nc = adv.navamshaCompatibility;
    var nScore = nc.score || 0;
    var nMax = nc.maxScore || 8;
    var nPct = nMax > 0 ? nScore / nMax : 0;
    var nColor = nPct >= 0.7 ? '#34D399' : nPct >= 0.4 ? '#FFB800' : '#F87171';
    var nDesc = nc.description || (nc.insights && nc.insights.length > 0 ? nc.insights[0] : (T ? '\u0D9C\u0DD0\u0DB9\u0DD4\u0DBB\u0DD4 \u0DC4\u0DD0\u0D9F\u0DD3\u0DB8\u0DCA \u0DB6\u0DB3\u0DB1\u0DBA' : 'Deep emotional bond level'));
    rows.push({ icon: 'heart-circle', title: T ? '\u0D86\u0DAD\u0DCA\u0DB8 \u0DB6\u0DB3\u0DB1\u0DBA' : 'Soul Bond', badge: nScore + '/' + nMax, badgeColor: nColor, desc: nDesc });
  }

  // Marriage Support (Marriage Planet Strength)
  if (adv.marriagePlanetStrength) {
    var mp = adv.marriagePlanetStrength;
    var mScore = mp.score || 0;
    var mMax = mp.maxScore || 5;
    var mPct = mMax > 0 ? mScore / mMax : 0;
    var mColor = mPct >= 0.7 ? '#34D399' : mPct >= 0.4 ? '#FFB800' : '#F87171';
    var mLabel = mPct >= 0.7 ? (T ? '\u0DB4\u0DCA\u200D\u0DBB\u0DB6\u0DBD' : 'Strong') : mPct >= 0.4 ? (T ? '\u0DB8\u0DB0\u0DCA\u200D\u0DBA\u0DB8' : 'Moderate') : (T ? '\u0D85\u0DA9\u0DD4' : 'Weak');
    var mDesc = mp.assessment || (T ? '\u0DC0\u0DD2\u0DC0\u0DCF\u0DC4\u0DBA\u0DA7 \u0DC3\u0DC4\u0DCF\u0DBA \u0DC0\u0DB1 \u0D9C\u0DCA\u200D\u0DBB\u0DC4 \u0DB6\u0DBD\u0DBA' : 'How strong love planets are for both');
    rows.push({ icon: 'shield-checkmark', title: T ? '\u0DC0\u0DD2\u0DC0\u0DCF\u0DC4 \u0DC3\u0DC4\u0DCF\u0DBA' : 'Marriage Support', badge: mLabel, badgeColor: mColor, desc: mDesc });
  }

  if (rows.length === 0) return null;

  return (
    <Animated.View entering={FadeInUp.delay(1100).duration(700)}>
      <Glass style={sty.section}>
        <View style={sty.secHeader}>
          <View>
            <Text style={sty.secTitle}><Ionicons name="layers" size={15} color="#A78BFA" /> {T ? '\u0D9C\u0DD0\u0DB9\u0DD4\u0DBB\u0DD4 \u0DC3\u0DB6\u0DB3\u0DAD\u0DCF\u0DC0' : 'Deeper Connection'}</Text>
            <Text style={sty.secSub}>{T ? '\u0DB4\u0DD0\u0DBD\u0DB8\u0DD4\u0DB1\u0DD2\u0DA7\u0DB8 \u0DB4\u0DD2\u0DA7\u0DD4\u0DB4\u0DC3\u0DD9\u0DB1\u0DCA' : 'Beyond the surface match'}</Text>
          </View>
        </View>
        {rows.map(function(r, i) {
          return (
            <View key={i} style={sty.deepRow}>
              <View style={sty.deepLeft}>
                <View style={[sty.deepIcon, { backgroundColor: r.badgeColor + '12', borderColor: r.badgeColor + '25' }]}>
                  <Ionicons name={r.icon} size={16} color={r.badgeColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={sty.deepTitle}>{r.title}</Text>
                  <Text style={sty.deepDesc} numberOfLines={2}>{r.desc}</Text>
                </View>
              </View>
              <View style={[sty.deepBadge, { backgroundColor: r.badgeColor + '12', borderColor: r.badgeColor + '28' }]}>
                <Text style={[sty.deepBadgeText, { color: r.badgeColor }]}>{r.badge}</Text>
              </View>
            </View>
          );
        })}
      </Glass>
    </Animated.View>
  );
}

// ======= YOUR ELEMENTS CARD =======
function ElementsCard({ data, language }) {
  var be = data.brideEnhanced && data.brideEnhanced.tattvaBalance;
  var ge = data.groomEnhanced && data.groomEnhanced.tattvaBalance;
  if (!be || !ge) return null;
  var T = language === 'si';

  var ELEM = {
    Fire: { icon: 'flame', color: '#F97316', si: '\u0D85\u0D9C\u0DCA\u0DB1\u0DD2' },
    Earth: { icon: 'globe', color: '#A3E635', si: '\u0DB4\u0DD8\u0DAD\u0DD2\u0DC0\u0DD2' },
    Air: { icon: 'cloudy', color: '#60A5FA', si: '\u0DC0\u0DCF\u0DBA\u0DD4' },
    Water: { icon: 'water', color: '#22D3EE', si: '\u0DA2\u0DBD' },
    Ether: { icon: 'sparkles', color: '#C084FC', si: '\u0D86\u0D9A\u0DCF\u0DC1' },
  };

  var brideEl = ELEM[be.dominant] || ELEM.Fire;
  var groomEl = ELEM[ge.dominant] || ELEM.Fire;

  // Generate interaction metaphor
  var getMetaphor = function(b, g) {
    var pair = b + '+' + g;
    var metaphors = {
      'Fire+Water': T ? '\u0DC4\u0DB8\u0DD4\u0DC0\u0DB1 \u0DC0\u0DD2\u0DA7 \u0DB4\u0DCA\u200D\u0DBB\u0DB6\u0DBD' : 'Steam when you meet \u2014 intense and transformative',
      'Fire+Fire': T ? '\u0DAF\u0DD9\u0DAF\u0DD9\u0DB1\u0DCF\u0DB8 \u0D85\u0D9C\u0DCA\u0DB1\u0DD2' : 'Double fire \u2014 passionate but watch for burnout',
      'Fire+Earth': T ? '\u0DB4\u0DD8\u0DAD\u0DD2\u0DC0\u0DD2\u0DBA \u0D8B\u0DC2\u0DCA\u0DAB \u0D9A\u0DBB\u0DBA\u0DD2' : 'Fire warms earth \u2014 you bring each other to life',
      'Fire+Air': T ? '\u0DC0\u0DCF\u0DBA\u0DD4\u0DC0 \u0D85\u0D9C\u0DCA\u0DB1\u0DD2\u0DBA \u0DAF\u0DD2\u0DBB\u0DD2 \u0D9A\u0DBB\u0DBA\u0DD2' : 'Air fans the flames \u2014 exciting and ever-growing',
      'Water+Water': T ? '\u0D9C\u0DD0\u0DB9\u0DD4\u0DBB\u0DD4 \u0DC4\u0DD0\u0D9F\u0DD3\u0DB8\u0DCA' : 'Deep ocean together \u2014 emotionally boundless',
      'Water+Earth': T ? '\u0DB4\u0DD8\u0DAD\u0DD2\u0DC0\u0DD2\u0DBA \u0DC3\u0DB8\u0DD8\u0DAF\u0DCA\u0DB0' : 'Water nourishes earth \u2014 naturally fertile bond',
      'Water+Air': T ? '\u0DC0\u0DD0\u0DC3\u0DCA\u0DC3 \u0DC4\u0DCF \u0DC0\u0DCF\u0DBA\u0DD4' : 'Mist and breeze \u2014 dreamy but needs grounding',
      'Earth+Earth': T ? '\u0DC3\u0DCA\u0DAD\u0DD2\u0DBB \u0DB6\u0DD2\u0DB8' : 'Solid bedrock \u2014 stable and unshakeable',
      'Earth+Air': T ? '\u0DB4\u0DD8\u0DAD\u0DD2\u0DC0\u0DD2 \u0DC4\u0DCF \u0DC0\u0DCF\u0DBA\u0DD4' : 'Mountains meet wind \u2014 steady yet free',
      'Air+Air': T ? '\u0DC0\u0DCF\u0DBA\u0DD4 \u0DAF\u0DD9\u0D9A\u0D9A\u0DCA' : 'Two winds \u2014 intellectual spark, needs anchoring',
    };
    return metaphors[pair] || metaphors[g + '+' + b] || (T ? '\u0DC0\u0DD2\u0DC1\u0DD2\u0DC2\u0DCA\u0DA7 \u0DB8\u0DD2\u0DC1\u0DCA\u200D\u0DBB\u0DAB\u0DBA\u0D9A\u0DCA' : 'A unique elemental mix \u2014 intriguing chemistry');
  };

  var metaphor = getMetaphor(be.dominant, ge.dominant);

  return (
    <Animated.View entering={FadeInUp.delay(350).duration(600)}>
      <Glass style={sty.section}>
        <View style={sty.secHeader}>
          <View>
            <Text style={sty.secTitle}><Ionicons name="prism" size={15} color="#A3E635" /> {T ? '\u0DB8\u0DD6\u0DBD\u0DB0\u0DCF\u0DAD\u0DD4' : 'Your Elements'}</Text>
            <Text style={sty.secSub}>{T ? '\u0D94\u0DB6\u0D9C\u0DDA \u0DB8\u0DD6\u0DBD\u0DB0\u0DCF\u0DAD\u0DD4 \u0DC4\u0DB8\u0DD4\u0DC0\u0DB1 \u0DC0\u0DD2\u0DA7' : 'When your elements collide'}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          <View style={sty.elemCard}>
            <View style={[sty.elemCircle, { backgroundColor: brideEl.color + '18', borderColor: brideEl.color + '40' }]}>
              <Ionicons name={brideEl.icon} size={24} color={brideEl.color} />
            </View>
            <Text style={[sty.elemName, { color: brideEl.color }]}>{T ? brideEl.si : be.dominant}</Text>
            <Text style={sty.elemWho}>{T ? '\u0D94\u0DB6' : 'Her'}</Text>
          </View>
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 8 }}>
            <Ionicons name="flash" size={20} color="rgba(255,184,0,0.6)" />
          </View>
          <View style={sty.elemCard}>
            <View style={[sty.elemCircle, { backgroundColor: groomEl.color + '18', borderColor: groomEl.color + '40' }]}>
              <Ionicons name={groomEl.icon} size={24} color={groomEl.color} />
            </View>
            <Text style={[sty.elemName, { color: groomEl.color }]}>{T ? groomEl.si : ge.dominant}</Text>
            <Text style={sty.elemWho}>{T ? '\u0D94\u0DC4\u0DD4' : 'Him'}</Text>
          </View>
        </View>
        <Text style={sty.elemMetaphor}>{metaphor}</Text>
      </Glass>
    </Animated.View>
  );
}

// ======= MAGNETISM 5-FACTOR CARD =======
function MagnetismCard({ data, language }) {
  var mag = data.magnetism;
  if (!mag || !mag.totalScore) return null;
  var T = language === 'si';
  var score = mag.totalScore;
  var max = mag.maxScore || 10;

  var FACTOR_META = {
    'Venus-Mars Spark': { icon: 'flame', color: '#F97316', label: T ? '\u0DC0\u0DD2\u0DC2\u0DBA \u0D86\u0DC0\u0DDA\u0D9C\u0DBA' : 'Physical Spark' },
    '7th House Resonance': { icon: 'home', color: '#A78BFA', label: T ? '\u0DC4\u0DCF\u0DAD\u0DCA\u0DB4\u0DAD\u0DD2 \u0DC4\u0DD0\u0D9F\u0DD3\u0DB8' : 'Partnership Fit' },
    'Nakshatra Lord Affinity': { icon: 'star', color: '#FBBF24', label: T ? '\u0DB1\u0DD0\u0D9A\u0DAD\u0DCA \u0D9C\u0DD0\u0DBD\u0DB4\u0DD3\u0DB8' : 'Star Alignment' },
    'Rahu-Ketu Karmic Axis': { icon: 'infinite', color: '#C084FC', label: T ? '\u0D9A\u0DBB\u0DCA\u0DB8 \u0DB6\u0DB3\u0DB1\u0DBA' : 'Fated Connection' },
    'Moon Emotional Sync': { icon: 'moon', color: '#22D3EE', label: T ? '\u0DC4\u0DD0\u0D9F\u0DD3\u0DB8\u0DCA \u0DC3\u0DB8\u0DB1\u0DCA\u0DC0\u0DBA' : 'Emotional Sync' },
  };

  var factors = mag.factors || [];

  return (
    <Animated.View entering={FadeInUp.delay(800).duration(700)}>
      <Glass style={sty.section}>
        <View style={sty.secHeader}>
          <View style={{ flex: 1 }}>
            <Text style={sty.secTitle}><Ionicons name="magnet" size={15} color="#F472B6" /> {T ? '\u0D86\u0D9A\u0DBB\u0DCA\u0DC2\u0DAB\u0DBA' : 'Magnetism'}</Text>
            <Text style={sty.secSub}>{T ? '\u0D94\u0DB6 \u0DAF\u0DD9\u0DAF\u0DD9\u0DB1\u0DCF \u0D85\u0DAD\u0DBB \u0DC0\u0DD2\u0DAF\u0DCA\u0DBA\u0DD4\u0DAD\u0DCA \u0D86\u0D9A\u0DBB\u0DCA\u0DC2\u0DAB\u0DBA' : '5 forces pulling you together'}</Text>
          </View>
          <View style={[sty.factorScorePill, { backgroundColor: 'rgba(244,114,182,0.12)', borderColor: 'rgba(244,114,182,0.28)' }]}>
            <Text style={[sty.factorScoreText, { color: '#F472B6' }]}>{score}/{max}</Text>
          </View>
        </View>
        {factors.length > 0 ? factors.map(function(fac, i) {
          var meta = FACTOR_META[fac.nameEn] || { icon: 'ellipse', color: '#FFB800', label: fac.nameEn || fac.nameSi || 'Factor' };
          var pct = fac.maxScore > 0 ? fac.score / fac.maxScore : 0;
          var barColor = pct >= 0.7 ? '#34D399' : pct >= 0.4 ? '#FFB800' : '#F87171';
          return (
            <View key={i} style={sty.magRow}>
              <View style={[sty.magIcon, { backgroundColor: meta.color + '14', borderColor: meta.color + '30' }]}>
                <Ionicons name={meta.icon} size={15} color={meta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={sty.magLabel}>{T ? (fac.nameSi || meta.label) : meta.label}</Text>
                <View style={sty.magBarBg}>
                  <View style={[sty.magBarFill, { width: (pct * 100) + '%', backgroundColor: barColor }]} />
                </View>
              </View>
              <Text style={[sty.magScore, { color: barColor }]}>{fac.score}/{fac.maxScore}</Text>
            </View>
          );
        }) : (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
            <View style={sty.chemPill}>
              <Ionicons name="flame" size={16} color="#F97316" />
              <Text style={sty.chemLabel}>{T ? '\u0D86\u0DC0\u0DDA\u0D9C\u0DBA' : 'Passion'}</Text>
            </View>
            <View style={sty.chemPill}>
              <Ionicons name="heart" size={16} color="#34D399" />
              <Text style={sty.chemLabel}>{T ? '\u0D86\u0DAF\u0DBB\u0DBA' : 'Love'}</Text>
            </View>
            <View style={sty.chemPill}>
              <Ionicons name="moon" size={16} color="#60A5FA" />
              <Text style={sty.chemLabel}>{T ? '\u0DC4\u0DD0\u0D9F\u0DD3\u0DB8\u0DCA' : 'Emotional'}</Text>
            </View>
          </View>
        )}
        {mag.summary && (
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 10, textAlign: 'center', fontStyle: 'italic', lineHeight: 16 }}>
            {T ? (mag.summary.si || mag.summary.en) : mag.summary.en}
          </Text>
        )}
      </Glass>
    </Animated.View>
  );
}

// ======= SOUL BLUEPRINT CARD =======
function SoulBlueprintCard({ data, language, bName, gName }) {
  var bj = data.brideAdvanced && data.brideAdvanced.tier1 && data.brideAdvanced.tier1.jaimini;
  var gj = data.groomAdvanced && data.groomAdvanced.tier1 && data.groomAdvanced.tier1.jaimini;
  if (!bj || !gj || !bj.atmakaraka || !gj.atmakaraka) return null;
  var T = language === 'si';

  var PLANET_DRIVE = {
    Sun: { drive: T ? '\u0DB1\u0DCF\u0DBA\u0D9A\u0DAD\u0DCA\u0DC0\u0DBA' : 'Leadership & recognition', icon: 'sunny', color: '#F97316' },
    Moon: { drive: T ? '\u0DC4\u0DD0\u0D9F\u0DD3\u0DB8\u0DCA \u0DC3\u0DD4\u0DBB\u0D9A\u0DCA\u0DC2\u0DD2\u0DAD\u0DAD\u0DCF\u0DC0' : 'Emotional security & nurturing', icon: 'moon', color: '#93C5FD' },
    Mars: { drive: T ? '\u0DC0\u0DD3\u0DBB\u0DAD\u0DCA\u0DC0\u0DBA \u0DC4\u0DCF \u0DA2\u0DBA\u0D9C\u0DCA\u200D\u0DBB\u0DC4\u0DAB\u0DBA' : 'Courage & conquest', icon: 'flame', color: '#EF4444' },
    Mercury: { drive: T ? '\u0DB6\u0DD4\u0DAF\u0DCA\u0DB0\u0DD2\u0DBA \u0DC4\u0DCF \u0DC3\u0DB1\u0DCA\u0DB1\u0DD2\u0DC0\u0DDA\u0DAF\u0DB1\u0DBA' : 'Intellect & communication', icon: 'chatbubbles', color: '#34D399' },
    Jupiter: { drive: T ? '\u0DB1\u0DD2\u0DAF\u0DC4\u0DC3 \u0DC4\u0DCF \u0DC0\u0DD2\u0DC3\u0DCA\u0DAD\u0DBB\u0DAB\u0DBA' : 'Freedom & expansion', icon: 'globe', color: '#FBBF24' },
    Venus: { drive: T ? '\u0D86\u0DAF\u0DBB\u0DBA \u0DC4\u0DCF \u0DC3\u0DD4\u0DB1\u0DCA\u0DAF\u0DBB\u0DBA' : 'Love & beauty', icon: 'heart', color: '#F472B6' },
    Saturn: { drive: T ? '\u0DC3\u0DCA\u0DAD\u0DD2\u0DBB\u0DAD\u0DCF\u0DC0 \u0DC4\u0DCF \u0DC0\u0DD2\u0DB1\u0DBA' : 'Stability & discipline', icon: 'shield', color: '#A78BFA' },
    Rahu: { drive: T ? '\u0DB4\u0DBB\u0DD2\u0DC0\u0DBB\u0DCA\u0DAD\u0DB1\u0DBA \u0DC4\u0DCF \u0D85\u0DB1\u0DCF\u0D9C\u0DAD\u0DBA' : 'Transformation & ambition', icon: 'rocket', color: '#FB923C' },
    Ketu: { drive: T ? '\u0D86\u0DB0\u0DCA\u200D\u0DBA\u0DCF\u0DAD\u0DCA\u0DB8\u0DD2\u0D9A \u0DB8\u0DD4\u0D9A\u0DCA\u0DAD\u0DD2\u0DBA' : 'Spiritual liberation', icon: 'eye', color: '#22D3EE' },
  };

  var bKey = typeof bj.atmakaraka === 'string' ? bj.atmakaraka : (bj.atmakaraka && bj.atmakaraka.planet) || 'Sun';
  var gKey = typeof gj.atmakaraka === 'string' ? gj.atmakaraka : (gj.atmakaraka && gj.atmakaraka.planet) || 'Sun';
  var bp = PLANET_DRIVE[bKey] || { drive: bKey, icon: 'star', color: '#FFB800' };
  var gp = PLANET_DRIVE[gKey] || { drive: gKey, icon: 'star', color: '#FFB800' };

  return (
    <Animated.View entering={FadeInUp.delay(950).duration(700)}>
      <Glass style={sty.section}>
        <View style={sty.secHeader}>
          <View>
            <Text style={sty.secTitle}><Ionicons name="finger-print" size={15} color="#C084FC" /> {T ? '\u0D86\u0DAD\u0DCA\u0DB8 \u0DB1\u0DD2\u0DBB\u0DD4\u0DB4\u0DAB\u0DBA' : 'Soul Blueprint'}</Text>
            <Text style={sty.secSub}>{T ? '\u0D94\u0DB6\u0D9C\u0DDA \u0D86\u0DAD\u0DCA\u0DB8\u0DBA\u0DB1\u0DCA \u0D9A\u0DD2\u0DBA \u0DC3\u0DD0\u0DB6\u0DD0\u0DC0\u0DD2\u0DB1\u0DCA \u0D9A\u0DD0\u0DB8\u0DAD\u0DD2\u0DBA\u0DD2' : 'What each soul truly craves'}</Text>
          </View>
        </View>
        <View style={{ gap: 12, marginTop: 4 }}>
          <View style={sty.soulRow}>
            <View style={[sty.soulIcon, { backgroundColor: bp.color + '15', borderColor: bp.color + '35' }]}>
              <Ionicons name={bp.icon} size={18} color={bp.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={sty.soulWho}>{bName || (T ? '\u0D94\u0DB6' : 'Her')}</Text>
              <Text style={sty.soulDrive}>{bp.drive}</Text>
            </View>
            <Text style={[sty.soulPlanet, { color: bp.color }]}>{bKey}</Text>
          </View>
          <View style={sty.soulRow}>
            <View style={[sty.soulIcon, { backgroundColor: gp.color + '15', borderColor: gp.color + '35' }]}>
              <Ionicons name={gp.icon} size={18} color={gp.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={sty.soulWho}>{gName || (T ? '\u0D94\u0DC4\u0DD4' : 'Him')}</Text>
              <Text style={sty.soulDrive}>{gp.drive}</Text>
            </View>
            <Text style={[sty.soulPlanet, { color: gp.color }]}>{gKey}</Text>
          </View>
        </View>
        {bj.atmakaraka !== gj.atmakaraka && (
          <View style={sty.soulSynth}>
            <Ionicons name="git-merge" size={14} color="rgba(255,184,0,0.7)" />
            <Text style={sty.soulSynthText}>
              {T ? '\u0D94\u0DB6\u0D9C\u0DDA \u0D86\u0DAD\u0DCA\u0DB8\u0DBA\u0DB1\u0DCA \u0D91\u0D9A\u0DB8\u0DD9\u0D9A\u0DA7 \u0DC3\u0DB8\u0DAD\u0DD4\u0DBD\u0DD2\u0DAD \u0D9A\u0DBB\u0DBA\u0DD2' 
                : (typeof bp.drive === 'string' ? bp.drive.split(' & ')[0] : 'One drive') + ' meets ' + (typeof gp.drive === 'string' ? gp.drive.split(' & ')[0].toLowerCase() : 'another') + ' \u2014 you balance what the other lacks'}
            </Text>
          </View>
        )}
      </Glass>
    </Animated.View>
  );
}

// ======= PAST LIVES CARD =======
function PastLivesCard({ data, language, bName, gName }) {
  var bpl = data.brideAdvanced && data.brideAdvanced.tier3 && data.brideAdvanced.tier3.pastLife;
  var gpl = data.groomAdvanced && data.groomAdvanced.tier3 && data.groomAdvanced.tier3.pastLife;
  if (!bpl || !gpl) return null;
  var T = language === 'si';

  var ARCHETYPE_META = {
    healer: { icon: 'medkit', color: '#34D399', en: 'Healer', si: '\u0DC4\u0DD3\u0DBD\u0DBB\u0DCA' },
    warrior: { icon: 'shield', color: '#EF4444', en: 'Warrior', si: '\u0DBA\u0DD4\u0DAF\u0DCA\u0DB0\u0DBA\u0DCF' },
    teacher: { icon: 'book', color: '#FBBF24', en: 'Teacher', si: '\u0D9C\u0DD4\u0DBB\u0DD4' },
    artist: { icon: 'color-palette', color: '#F472B6', en: 'Artist', si: '\u0D9A\u0DBD\u0DCF\u0D9A\u0DBB\u0DD4' },
    leader: { icon: 'flag', color: '#F97316', en: 'Leader', si: '\u0DB1\u0DCF\u0DBA\u0D9A' },
    mystic: { icon: 'eye', color: '#C084FC', en: 'Mystic', si: '\u0DB8\u0DCA\u0DBA\u0DC3\u0DCA\u0DA7\u0DD2\u0D9A\u0DCA' },
    merchant: { icon: 'cash', color: '#A3E635', en: 'Merchant', si: '\u0DC0\u0DCA\u200D\u0DBA\u0DCF\u0DB4\u0DCF\u0DBB\u0DD2' },
    scholar: { icon: 'library', color: '#60A5FA', en: 'Scholar', si: '\u0DC0\u0DD2\u0DAF\u0DCA\u0DC0\u0DAD\u0DCF' },
    caretaker: { icon: 'heart', color: '#FB923C', en: 'Caretaker', si: '\u0DBB\u0D9A\u0DCA\u0DC2\u0D9A' },
    explorer: { icon: 'compass', color: '#22D3EE', en: 'Explorer', si: '\u0D9C\u0DC0\u0DDA\u0DC2\u0D9A' },
    pioneer: { icon: 'rocket', color: '#F97316', en: 'Pioneer', si: '\u0DB4\u0DD4\u0DBB\u0DDD\u0D9C\u0DCF\u0DB8\u0DD3' },
    king: { icon: 'trophy', color: '#FBBF24', en: 'Ruler', si: '\u0DBB\u0DA2' },
    administrator: { icon: 'briefcase', color: '#64748B', en: 'Administrator', si: '\u0DB4\u0DBB\u0DD2\u0DB4\u0DCF\u0DBD\u0D9A' },
    monk: { icon: 'moon', color: '#C084FC', en: 'Monk', si: '\u0DC3\u0DB1\u0DCA\u0DB1\u0DCF\u0DC3\u0DD3' },
    hermit: { icon: 'moon', color: '#A78BFA', en: 'Hermit', si: '\u0DAD\u0DCF\u0DB4\u0DC3' },
    seeker: { icon: 'search', color: '#22D3EE', en: 'Seeker', si: '\u0DC3\u0DD9\u0DC0\u0DD4\u0DB8\u0DCA\u0D9A\u0DBB\u0DD4' },
    philosopher: { icon: 'bulb', color: '#FBBF24', en: 'Philosopher', si: '\u0DAF\u0DCF\u0DBB\u0DCA\u0DC1\u0DB1\u0DD2\u0D9A' },
    pilgrim: { icon: 'walk', color: '#34D399', en: 'Pilgrim', si: '\u0DC0\u0DB1\u0DCA\u0DAF\u0DB1\u0DCF' },
    writer: { icon: 'create', color: '#60A5FA', en: 'Writer', si: '\u0DBD\u0DDA\u0D9B\u0D9A' },
    messenger: { icon: 'chatbubble', color: '#22D3EE', en: 'Messenger', si: '\u0DB4\u0DAB\u0DD2\u0DC0\u0DD2\u0DA9\u0D9A\u0DBB\u0DD4' },
    soldier: { icon: 'shield', color: '#EF4444', en: 'Soldier', si: '\u0DC3\u0DD9\u0DB6\u0DBD\u0DCF' },
    farmer: { icon: 'leaf', color: '#A3E635', en: 'Farmer', si: '\u0D9C\u0DD9\u0DC0\u0DD2\u0DBA\u0DCF' },
    landowner: { icon: 'home', color: '#FB923C', en: 'Landowner', si: '\u0D89\u0DA9\u0DB8\u0DCA \u0DC4\u0DD2\u0DB8\u0DD2' },
    priest: { icon: 'star', color: '#FBBF24', en: 'Priest', si: '\u0DB4\u0DD6\u0DA2\u0D9A' },
    performer: { icon: 'musical-notes', color: '#F472B6', en: 'Performer', si: '\u0DBB\u0D82\u0D9C\u0DB1 \u0DC1\u0DD2\u0DBD\u0DCA\u0DB4\u0DD3' },
    servant: { icon: 'hand-left', color: '#64748B', en: 'Servant', si: '\u0DC3\u0DDA\u0DC0\u0D9A' },
    partner: { icon: 'people', color: '#F472B6', en: 'Partner', si: '\u0DC4\u0DC0\u0DD4\u0DBD\u0DCA\u0D9A\u0DBB\u0DD4' },
    diplomat: { icon: 'globe', color: '#60A5FA', en: 'Diplomat', si: '\u0DBB\u0DCF\u0DA2\u0DCA\u200D\u0DBA \u0DAD\u0DCF\u0DB1\u0DCA\u0DAD\u0DCA\u200D\u0DBB\u0DD2\u0D9A' },
    researcher: { icon: 'flask', color: '#C084FC', en: 'Researcher', si: '\u0DB4\u0DBB\u0DCA\u0DBA\u0DDA\u0DC2\u0D9A' },
    alchemist: { icon: 'flask', color: '#A78BFA', en: 'Alchemist', si: '\u0DBB\u0DC3\u0DC0\u0DD2\u0DAF\u0DCA\u200D\u0DBA\u0DCF\u0DC0\u0DDA\u0DAF\u0DD3' },
    trader: { icon: 'swap-horizontal', color: '#A3E635', en: 'Trader', si: '\u0DC0\u0DCA\u200D\u0DBA\u0DCF\u0DB4\u0DCF\u0DBB\u0DD2' },
    banker: { icon: 'wallet', color: '#FBBF24', en: 'Banker', si: '\u0DB6\u0DD0\u0D82\u0D9A\u0DD4\u0D9A\u0DBB\u0DD4' },
    networker: { icon: 'git-network', color: '#22D3EE', en: 'Networker', si: '\u0DA2\u0DCF\u0DBD\u0D9A\u0DBB\u0DD4' },
    elder: { icon: 'person', color: '#FB923C', en: 'Elder', si: '\u0DC0\u0DD0\u0DA9\u0DD2\u0DC4\u0DD2\u0DA7\u0DD2\u0DBA\u0DCF' },
    mediator: { icon: 'git-merge', color: '#34D399', en: 'Mediator', si: '\u0DB8\u0DB0\u0DCA\u200D\u0DBA\u0DC3\u0DCA\u0DAD' },
  };

  var getArch = function(pl) {
    if (!pl || !pl.ketuThemes) return { icon: 'help-circle', color: '#FFB800', en: 'Unknown', si: '\u0D85\u0DB1\u0DAD\u0DD2\u0DAD' };
    var raw = (pl.ketuThemes.archetype || '').toLowerCase();
    // Server returns compound archetypes like 'leader/warrior/pioneer' — match any part
    var parts = raw.split('/');
    for (var p = 0; p < parts.length; p++) {
      var trimmed = parts[p].trim();
      if (ARCHETYPE_META[trimmed]) return ARCHETYPE_META[trimmed];
    }
    // Fallback: use first part as display name
    var displayName = parts[0] ? parts[0].trim() : 'Seeker';
    displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    return { icon: 'star', color: '#FFB800', en: displayName, si: pl.ketuThemes.archetypeSi ? pl.ketuThemes.archetypeSi.split('/')[0].trim() : displayName };
  };

  var ba = getArch(bpl);
  var ga = getArch(gpl);

  // Generate narrative
  var narrative = T
    ? ba.si + ' \u0DC4\u0DCF ' + ga.si + ' \u0DB1\u0DD0\u0DC0\u0DAD \u0DC4\u0DB8\u0DD4\u0DC0\u0DD3\u0DB8'
    : 'A ' + ba.en.toLowerCase() + ' and a ' + ga.en.toLowerCase() + ' reunited \u2014 picking up where past lives left off';

  var karmaNote = '';
  if (bpl.karmaBalance && gpl.karmaBalance) {
    var bk = String(bpl.karmaBalance).toLowerCase();
    var gk = String(gpl.karmaBalance).toLowerCase();
    if (bk.indexOf('positive') !== -1 && gk.indexOf('positive') !== -1) {
      karmaNote = T ? '\u0DAF\u0DD9\u0DAF\u0DD9\u0DB1\u0DCF\u0DB8 \u0DC1\u0DD4\u0DB7 \u0D9A\u0DBB\u0DCA\u0DB8' : 'Both carry positive karma into this connection';
    } else if (bk.indexOf('negative') !== -1 || gk.indexOf('negative') !== -1) {
      karmaNote = T ? '\u0DB4\u0DD2\u0DBB\u0DD2\u0DC3\u0DD2\u0DAF\u0DD4 \u0D9A\u0DBB\u0DB1\u0DD4 \u0DBD\u0DB6\u0DB1 \u0D9A\u0DBB\u0DCA\u0DB8' : 'Unresolved karma to work through \u2014 growth awaits';
    } else {
      karmaNote = T ? '\u0DB8\u0DD2\u0DC1\u0DCA\u200D\u0DBB \u0D9A\u0DBB\u0DCA\u0DB8' : 'Mixed karma \u2014 some lessons, some gifts';
    }
  }

  return (
    <Animated.View entering={FadeInUp.delay(1050).duration(700)}>
      <Glass style={sty.section}>
        <View style={sty.secHeader}>
          <View>
            <Text style={sty.secTitle}><Ionicons name="time" size={15} color="#C084FC" /> {T ? '\u0DB4\u0DD6\u0DBB\u0DCA\u0DC0 \u0DA2\u0DD3\u0DC0\u0DD2\u0DAD' : 'Past Lives'}</Text>
            <Text style={sty.secSub}>{T ? '\u0D94\u0DB6\u0D9C\u0DDA \u0D86\u0DAD\u0DCA\u0DB8\u0DBA\u0DB1\u0DCA \u0DB4\u0DD6\u0DBB\u0DCA\u0DC0\u0DBA\u0DD9\u0DB1\u0DCA \u0DAF\u0DB1\u0DD3' : 'Your souls have met before'}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          <View style={sty.pastCard}>
            <View style={[sty.pastIcon, { backgroundColor: ba.color + '15', borderColor: ba.color + '35' }]}>
              <Ionicons name={ba.icon} size={20} color={ba.color} />
            </View>
            <Text style={sty.pastWho}>{bName || (T ? '\u0D94\u0DB6' : 'Her')}</Text>
            <Text style={[sty.pastArch, { color: ba.color }]}>{T ? ba.si : ba.en}</Text>
          </View>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="infinite" size={22} color="rgba(192,132,252,0.6)" />
          </View>
          <View style={sty.pastCard}>
            <View style={[sty.pastIcon, { backgroundColor: ga.color + '15', borderColor: ga.color + '35' }]}>
              <Ionicons name={ga.icon} size={20} color={ga.color} />
            </View>
            <Text style={sty.pastWho}>{gName || (T ? '\u0D94\u0DC4\u0DD4' : 'Him')}</Text>
            <Text style={[sty.pastArch, { color: ga.color }]}>{T ? ga.si : ga.en}</Text>
          </View>
        </View>
        <Text style={sty.pastNarrative}>{narrative}</Text>
        {karmaNote.length > 0 && (
          <View style={sty.pastKarma}>
            <Ionicons name="leaf" size={12} color="rgba(255,184,0,0.6)" />
            <Text style={sty.pastKarmaText}>{karmaNote}</Text>
          </View>
        )}
      </Glass>
    </Animated.View>
  );
}

// ======= RED FLAG CHECK CARD =======
function RedFlagCard({ data, language, bName, gName }) {
  var jm = data.jyotishMatching;
  if (!jm) return null;
  var bMangal = jm.brideMangalDosha;
  var gMangal = jm.groomMangalDosha;
  if (!bMangal && !gMangal) return null;
  var T = language === 'si';

  var getFlag = function(dosha) {
    if (!dosha || !dosha.hasDosha) return { status: 'clear', icon: 'checkmark-circle', color: '#34D399', label: T ? '\u0DB4\u0DD2\u0DBB\u0DD2\u0DC3\u0DD2\u0DAF\u0DD4\u0DBA\u0DD2' : 'Clear' };
    if (dosha.isHigh) return { status: 'high', icon: 'alert-circle', color: '#F87171', label: T ? '\u0DB4\u0DCA\u200D\u0DBB\u0DB6\u0DBD' : 'Present' };
    return { status: 'mild', icon: 'alert-circle', color: '#FFB800', label: T ? '\u0DC3\u0DD4\u0DBD\u0DD4' : 'Mild' };
  };

  var bf = getFlag(bMangal);
  var gf = getFlag(gMangal);
  var bothClear = bf.status === 'clear' && gf.status === 'clear';
  var bothHave = bf.status !== 'clear' && gf.status !== 'clear';

  var verdict = bothClear
    ? (T ? '\u0D9A\u0DD2\u0DC3\u0DD2\u0DAF\u0DD4 \u0DBB\u0DAD\u0DD4 \u0D9A\u0DAB\u0DCA\u0DA9\u0DD4\u0DC0\u0D9A\u0DCA \u0DB1\u0DD0\u0DAD' : 'No red flags detected \u2014 smooth sailing')
    : bothHave
    ? (T ? '\u0DAF\u0DD9\u0DAF\u0DD9\u0DB1\u0DCF\u0DB8 \u0D85\u0DB7\u0DD2\u0DBA\u0DDD\u0D9C \u0DAD\u0DD2\u0DB6\u0DD9 \u2014 \u0DC3\u0DB8\u0DAD\u0DD4\u0DBD\u0DD2\u0DAD \u0DC0\u0DDA' : 'Both carry the same tension marker \u2014 these cancel each other out')
    : (T ? '\u0D91\u0D9A\u0DCA \u0D9A\u0DD9\u0DB1\u0D9A\u0DD4\u0DA7 \u0D85\u0DB7\u0DD2\u0DBA\u0DDD\u0D9C \u0DAD\u0DD2\u0DB6\u0DD9' : 'One person carries a tension marker \u2014 awareness is key');

  return (
    <Animated.View entering={FadeInUp.delay(1150).duration(700)}>
      <Glass style={sty.section}>
        <View style={sty.secHeader}>
          <View>
            <Text style={sty.secTitle}><Ionicons name="flag" size={15} color={bothClear ? '#34D399' : '#F87171'} /> {T ? '\u0DBB\u0DAD\u0DD4 \u0D9A\u0DAB\u0DCA\u0DA9\u0DD4 \u0DB4\u0DBB\u0DD3\u0D9A\u0DCA\u0DC2\u0DCF\u0DC0' : 'Red Flag Check'}</Text>
            <Text style={sty.secSub}>{T ? '\u0DC3\u0DB8\u0DCA\u0DB4\u0DCA\u200D\u0DBB\u0DAF\u0DCF\u0DBA\u0DD2\u0D9A \u0DC0\u0DD2\u0DC0\u0DCF\u0DC4 \u0D85\u0DB7\u0DD2\u0DBA\u0DDD\u0D9C' : 'Traditional marriage tension markers'}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
          <View style={sty.flagPerson}>
            <Ionicons name={bf.icon} size={22} color={bf.color} />
            <Text style={sty.flagName}>{bName || (T ? '\u0D94\u0DB6' : 'Her')}</Text>
            <Text style={[sty.flagLabel, { color: bf.color }]}>{bf.label}</Text>
          </View>
          <View style={sty.flagPerson}>
            <Ionicons name={gf.icon} size={22} color={gf.color} />
            <Text style={sty.flagName}>{gName || (T ? '\u0D94\u0DC4\u0DD4' : 'Him')}</Text>
            <Text style={[sty.flagLabel, { color: gf.color }]}>{gf.label}</Text>
          </View>
        </View>
        <Text style={sty.flagVerdict}>{verdict}</Text>
      </Glass>
    </Animated.View>
  );
}

// ======= TIMING & PRESSURE CARD =======
function TimingCard({ data, language, bName, gName }) {
  var jm = data.jyotishMatching;
  if (!jm) return null;
  var bss = jm.brideSadeSati;
  var gss = jm.groomSadeSati;
  if (!bss && !gss) return null;
  var T = language === 'si';

  var getStatus = function(ss) {
    if (!ss || !ss.status) return null;
    var s = String(ss.status).toLowerCase();
    if (s.indexOf('active') !== -1 || s.indexOf('yes') !== -1 || s === 'true') return { active: true, icon: 'thunderstorm', color: '#F97316', label: T ? '\u0DC3\u0D9A\u0DCA\u200D\u0DBB\u0DD2\u0DBA' : 'In Pressure Phase' };
    return { active: false, icon: 'sunny', color: '#34D399', label: T ? '\u0DB4\u0DD2\u0DBB\u0DD2\u0DC3\u0DD2\u0DAF\u0DD4\u0DBA\u0DD2' : 'Clear Skies' };
  };

  var bs = getStatus(bss);
  var gs = getStatus(gss);
  if (!bs && !gs) return null;

  var bothClear = bs && gs && !bs.active && !gs.active;
  var anyPressure = (bs && bs.active) || (gs && gs.active);

  var advice = bothClear
    ? (T ? '\u0DAF\u0DD9\u0DAF\u0DD9\u0DB1\u0DCF\u0DB8 \u0DC4\u0DCF\u0DB1\u0DD2 \u0D9A\u0DCF\u0DBD\u0DBA\u0D9A' : 'Both in a clear period \u2014 great timing for big decisions')
    : anyPressure
    ? (T ? '\u0DB4\u0DD3\u0DA9\u0DB1\u0DBA \u0DAD\u0DCF\u0DC0\u0D9A\u0DCF\u0DBD\u0DD2\u0D9A\u0DBA\u0DD2 \u2014 \u0D89\u0DC0\u0DC3\u0DD3\u0DB8 \u0DC0\u0DD0\u0DA9\u0DD2\u0DBA' : 'Pressure is temporary \u2014 extra patience and support make all the difference')
    : '';

  return (
    <Animated.View entering={FadeInUp.delay(1200).duration(700)}>
      <Glass style={sty.section}>
        <View style={sty.secHeader}>
          <View>
            <Text style={sty.secTitle}><Ionicons name="hourglass" size={15} color="#FB923C" /> {T ? '\u0D9A\u0DCF\u0DBD\u0DBA \u0DC4\u0DCF \u0DB4\u0DD3\u0DA9\u0DB1\u0DBA' : 'Timing & Pressure'}</Text>
            <Text style={sty.secSub}>{T ? '\u0DAD\u0DCF\u0DC0\u0D9A\u0DCF\u0DBD\u0DD2\u0D9A \u0DA2\u0DD3\u0DC0\u0DD2\u0DAD \u0DB4\u0DD3\u0DA9\u0DB1' : 'Life pressure that affects relationships'}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
          {bs && (
            <View style={sty.timingPerson}>
              <View style={[sty.timingBadge, { backgroundColor: bs.color + '12', borderColor: bs.color + '30' }]}>
                <Ionicons name={bs.icon} size={20} color={bs.color} />
              </View>
              <Text style={sty.timingName}>{bName || (T ? '\u0D94\u0DB6' : 'Her')}</Text>
              <Text style={[sty.timingLabel, { color: bs.color }]}>{bs.label}</Text>
            </View>
          )}
          {gs && (
            <View style={sty.timingPerson}>
              <View style={[sty.timingBadge, { backgroundColor: gs.color + '12', borderColor: gs.color + '30' }]}>
                <Ionicons name={gs.icon} size={20} color={gs.color} />
              </View>
              <Text style={sty.timingName}>{gName || (T ? '\u0D94\u0DC4\u0DD4' : 'Him')}</Text>
              <Text style={[sty.timingLabel, { color: gs.color }]}>{gs.label}</Text>
            </View>
          )}
        </View>
        {advice.length > 0 && (
          <Text style={sty.timingAdvice}>{advice}</Text>
        )}
      </Glass>
    </Animated.View>
  );
}


// ======= INTIMATE CHEMISTRY CARD =======
function IntimateChemistryCard({ data, language, bName, gName }) {
  var T = language === 'si';
  
  // Get Yoni data from factors
  var yoniFactor = data.factors && data.factors.find(function(fac) { return fac.name === 'Yoni'; });
  var brideYoni = yoniFactor && yoniFactor.brideYoni;
  var groomYoni = yoniFactor && yoniFactor.groomYoni;
  var yoniScore = yoniFactor ? yoniFactor.score : 0;
  var yoniMax = yoniFactor ? yoniFactor.maxScore : 3;

  // Venus strength from marriage planet data
  var mp = data.advancedPorondam && data.advancedPorondam.advanced && data.advancedPorondam.advanced.marriagePlanetStrength;
  var brideVenus = mp && mp.bride ? mp.bride.venusStrength : null;
  var groomVenus = mp && mp.groom ? mp.groom.venusStrength : null;

  // Venus-Mars spark from magnetism factors
  var mag = data.magnetism;
  var sparkFactor = mag && mag.factors && mag.factors.find(function(fac) { return fac.nameEn === 'Venus-Mars Spark'; });
  var sparkScore = sparkFactor ? sparkFactor.score : 0;
  var sparkMax = sparkFactor ? sparkFactor.maxScore : 25;
  var sparkDetails = sparkFactor && sparkFactor.details ? sparkFactor.details : [];

  if (!brideYoni && !groomYoni && !sparkFactor) return null;

  // Animal icon mapping
  var YONI_META = {
    Horse: { icon: 'flash', color: '#F97316', trait: T ? '\u0DC0\u0DDA\u0D9C\u0DC0\u0DAD\u0DCA \u0DC4\u0DCF \u0DC3\u0DCA\u0DC0\u0DAD\u0DB1\u0DCA\u0DAD\u0DCA\u0DBB' : 'Free-spirited & adventurous' },
    Elephant: { icon: 'shield', color: '#A78BFA', trait: T ? '\u0DB6\u0DBD\u0DC0\u0DAD\u0DCA \u0DC4\u0DCF \u0DC3\u0DCA\u0DAD\u0DD2\u0DBB' : 'Powerful & protective' },
    Goat: { icon: 'leaf', color: '#34D399', trait: T ? '\u0DB8\u0DD8\u0DAF\u0DD4 \u0DC4\u0DCF \u0DC3\u0DD0\u0DBD\u0D9A\u0DD2\u0DBD\u0DD2' : 'Tender & affectionate' },
    Serpent: { icon: 'eye', color: '#C084FC', trait: T ? '\u0DAD\u0DD3\u0DC0\u0DCA\u200D\u0DBB \u0DC4\u0DCF \u0DBB\u0DC4\u0DC3\u0DCA\u0DB8\u0DBA' : 'Intense & magnetic' },
    Dog: { icon: 'heart', color: '#FB923C', trait: T ? '\u0DB4\u0DCF\u0DBB\u0DCA\u0DC1\u0DCA\u0DC0\u0DD2\u0D9A \u0DC4\u0DCF \u0DC0\u0DD2\u0DC1\u0DCA\u0DC0\u0DCF\u0DC3\u0DBA' : 'Devoted & faithful' },
    Cat: { icon: 'moon', color: '#F472B6', trait: T ? '\u0DC3\u0DD2\u0DBD\u0DD4\u0DB8\u0DD2\u0DB1\u0DD2 \u0DC4\u0DCF \u0DC3\u0DCA\u0DC0\u0DAD\u0DB1\u0DCA\u0DAD\u0DCA\u0DBB' : 'Sensual & independent' },
    Rat: { icon: 'sparkles', color: '#FBBF24', trait: T ? '\u0DA0\u0DAD\u0DD4\u0DBB \u0DC4\u0DCF \u0D85\u0DB1\u0DD4\u0D9A\u0DD6\u0DBD' : 'Quick & adaptable' },
    Cow: { icon: 'sunny', color: '#A3E635', trait: T ? '\u0DC3\u0DCF\u0DB8\u0DBA \u0DC4\u0DCF \u0DB4\u0DD2\u0DBB\u0DD2\u0DB1\u0DB8\u0DCA' : 'Warm & nurturing' },
    Buffalo: { icon: 'barbell', color: '#64748B', trait: T ? '\u0DB6\u0DBD\u0DC0\u0DAD\u0DCA \u0DC4\u0DCF \u0D89\u0DC0\u0DC3\u0DD3\u0DB8' : 'Strong & enduring' },
    Tiger: { icon: 'flame', color: '#EF4444', trait: T ? '\u0DAD\u0DD3\u0DC0\u0DCA\u200D\u0DBB \u0DC4\u0DCF \u0DB4\u0DCA\u200D\u0DBB\u0DB7\u0DCF\u0DC0\u0DC1\u0DCF\u0DBD\u0DD3' : 'Fierce & passionate' },
    Deer: { icon: 'flower', color: '#22D3EE', trait: T ? '\u0DB8\u0DD8\u0DAF\u0DD4 \u0DC4\u0DCF \u0DBB\u0DD4\u0DC0\u0D9A\u0DCA' : 'Romantic & sensitive' },
    Monkey: { icon: 'happy', color: '#FB923C', trait: T ? '\u0D9A\u0DCA\u200D\u0DBB\u0DD3\u0DA9\u0DCF\u0DC1\u0DD3\u0DBD\u0DD3 \u0DC4\u0DCF \u0DC3\u0DD0\u0DBD\u0D9A\u0DD2' : 'Playful & experimental' },
    Mongoose: { icon: 'rocket', color: '#F59E0B', trait: T ? '\u0D89\u0DC4\u0DBD \u0DC0\u0DDA\u0D9C\u0DC0\u0DAD\u0DCA \u0DC4\u0DCF \u0DB1\u0DD2\u0DBB\u0DCA\u0DB7\u0DD3\u0DAD' : 'Bold & fearless' },
    Lion: { icon: 'star', color: '#F97316', trait: T ? '\u0DB4\u0DCA\u200D\u0DBB\u0DB7\u0DCF\u0DC0\u0DC1\u0DCF\u0DBD\u0DD3 \u0DC4\u0DCF \u0D86\u0DAB\u0DCA\u0DA9\u0DD4\u0D9A\u0DBB' : 'Commanding & generous' },
  };

  var bm = YONI_META[brideYoni] || { icon: 'help-circle', color: '#FFB800', trait: '' };
  var gm = YONI_META[groomYoni] || { icon: 'help-circle', color: '#FFB800', trait: '' };

  // Yoni chemistry narrative
  var yoniNarrative = yoniScore >= 3 
    ? (T ? '\u0D91\u0D9A\u0DB8 \u0DBA\u0DDD\u0DB1\u0DD2 \u2014 \u0DC3\u0DCA\u0DC0\u0DCF\u0DB7\u0DCF\u0DC0\u0DD2\u0D9A \u0DC4\u0DCF \u0DAD\u0DD3\u0DC0\u0DCA\u200D\u0DBB' : 'Perfect match \u2014 effortlessly in sync')
    : yoniScore >= 2
    ? (T ? '\u0D9C\u0DD0\u0DBD\u0DB4\u0DDA\u0DB1 \u0DBA\u0DDD\u0DB1\u0DD2 \u2014 \u0DC3\u0DCA\u0DC0\u0DCF\u0DB7\u0DCF\u0DC0\u0DD2\u0D9A \u0D86\u0D9A\u0DBB\u0DCA\u0DC2\u0DAB\u0DBA' : 'Natural attraction \u2014 you just click')
    : (T ? '\u0DC0\u0DD9\u0DB1\u0DC3\u0DCA \u0DBA\u0DDD\u0DB1\u0DD2 \u2014 \u0D86\u0D9A\u0DBB\u0DCA\u0DC2\u0DAB\u0DBA\u0DA7 \u0DB4\u0DCA\u200D\u0DBB\u0DBA\u0DAD\u0DCA\u0DB1\u0DBA \u0D85\u0DC0\u0DC1\u0DCA\u200D\u0DBA\u0DBA\u0DD2' : 'Electric tension \u2014 opposites that attract');

  // Venus strength tier
  var getVenusTier = function(score) {
    if (!score && score !== 0) return null;
    if (score >= 70) return { label: T ? '\u0DB4\u0DCA\u200D\u0DBB\u0DB6\u0DBD' : 'Radiant', color: '#F472B6', emoji: 'High' };
    if (score >= 40) return { label: T ? '\u0DB8\u0DB0\u0DCA\u200D\u0DBA\u0DB8' : 'Warm', color: '#FFB800', emoji: 'Med' };
    return { label: T ? '\u0DC3\u0DD4\u0DBD\u0DD4' : 'Reserved', color: '#93C5FD', emoji: 'Low' };
  };

  var bvt = getVenusTier(brideVenus);
  var gvt = getVenusTier(groomVenus);

  // Spark intensity
  var sparkPct = sparkMax > 0 ? sparkScore / sparkMax : 0;
  var sparkColor = sparkPct >= 0.7 ? '#EF4444' : sparkPct >= 0.4 ? '#FB923C' : '#FFB800';
  var sparkLabel = sparkPct >= 0.7 ? (T ? '\u0DAD\u0DD3\u0DC0\u0DCA\u200D\u0DBB' : 'On Fire') : sparkPct >= 0.4 ? (T ? '\u0D8B\u0DC2\u0DCA\u0DAB' : 'Heating Up') : (T ? '\u0DB8\u0DD8\u0DAF\u0DD4' : 'Slow Burn');

  return (
    <Animated.View entering={FadeInUp.delay(850).duration(700)}>
      <Glass style={sty.section}>
        {/* Header with heat meter */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <View style={[sty.intimHeatBadge, { backgroundColor: sparkColor + '12', borderColor: sparkColor + '30' }]}>
            <Ionicons name="flame" size={18} color={sparkColor} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#fff' }}>{T ? '\u0D86\u0DAD\u0DCA\u0DB8\u0DD3\u0DBA \u0DBB\u0DC3\u0DC0\u0DD2\u0DAF\u0DCA\u200D\u0DBA\u0DCF\u0DC0' : 'Intimate Chemistry'}</Text>
            <View style={sty.intimHeatBar}>
              <View style={[sty.intimHeatFill, { width: (sparkPct * 100) + '%', backgroundColor: sparkColor }]} />
            </View>
          </View>
          <View style={[sty.intimHeatLabel, { backgroundColor: sparkColor + '18', borderColor: sparkColor + '35' }]}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: sparkColor }}>{sparkLabel}</Text>
          </View>
        </View>

        {/* Spirit Animals — the fun part */}
        {brideYoni && groomYoni && (
          <View style={sty.intimAnimalsSection}>
            <View style={sty.intimAnimalCardNew}>
              <LinearGradient colors={[bm.color + '12', 'transparent']} style={sty.intimAnimalGrad} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
              <View style={[sty.intimAnimalBubble, { borderColor: bm.color + '50', backgroundColor: bm.color + '10' }]}>
                <Ionicons name={bm.icon} size={22} color={bm.color} />
              </View>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginTop: 8 }}>{bName || (T ? '\u0D94\u0DB6' : 'Her')}</Text>
              <Text style={[sty.intimAnimalLabel, { color: bm.color }]}>{brideYoni}</Text>
              <Text style={sty.intimAnimalDesc}>{bm.trait}</Text>
            </View>

            <View style={sty.intimMatchCenter}>
              <View style={[sty.intimMatchRing, { borderColor: yoniScore >= 2 ? '#34D399' + '60' : yoniScore >= 1 ? '#FFB800' + '60' : '#F87171' + '50' }]}>
                <Ionicons name={yoniScore >= 2 ? 'heart' : yoniScore >= 1 ? 'heart-half' : 'heart-dislike'} size={16} color={yoniScore >= 2 ? '#34D399' : yoniScore >= 1 ? '#FFB800' : '#F87171'} />
              </View>
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 4, fontWeight: '700' }}>{yoniScore}/{yoniMax}</Text>
            </View>

            <View style={sty.intimAnimalCardNew}>
              <LinearGradient colors={[gm.color + '12', 'transparent']} style={sty.intimAnimalGrad} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
              <View style={[sty.intimAnimalBubble, { borderColor: gm.color + '50', backgroundColor: gm.color + '10' }]}>
                <Ionicons name={gm.icon} size={22} color={gm.color} />
              </View>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginTop: 8 }}>{gName || (T ? '\u0D94\u0DC4\u0DD4' : 'Him')}</Text>
              <Text style={[sty.intimAnimalLabel, { color: gm.color }]}>{groomYoni}</Text>
              <Text style={sty.intimAnimalDesc}>{gm.trait}</Text>
            </View>
          </View>
        )}

        {/* Narrative */}
        {brideYoni && groomYoni && (
          <View style={sty.intimNarrativeBox}>
            <Ionicons name="sparkles" size={12} color="rgba(255,184,0,0.5)" />
            <Text style={sty.intimNarrativeText}>{yoniNarrative}</Text>
          </View>
        )}

        {/* Venus Desire Meters */}
        {(bvt || gvt) && (
          <View style={sty.intimDesireSection}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>{T ? '\u0D86\u0DC3\u0DCF \u0DB4\u0DCA\u200D\u0DBB\u0D9A\u0DCF\u0DC1\u0DB1\u0DBA' : 'How You Express Desire'}</Text>
            {bvt && (
              <View style={sty.intimDesireRow}>
                <Text style={sty.intimDesireName}>{bName || (T ? '\u0D94\u0DB6' : 'Her')}</Text>
                <View style={sty.intimDesireTrack}>
                  <LinearGradient colors={[bvt.color + '60', bvt.color]} style={[sty.intimDesireFill, { width: Math.max(brideVenus || 0, 8) + '%' }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                </View>
                <View style={[sty.intimDesireBadge, { backgroundColor: bvt.color + '15', borderColor: bvt.color + '30' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: bvt.color }}>{bvt.label}</Text>
                </View>
              </View>
            )}
            {gvt && (
              <View style={sty.intimDesireRow}>
                <Text style={sty.intimDesireName}>{gName || (T ? '\u0D94\u0DC4\u0DD4' : 'Him')}</Text>
                <View style={sty.intimDesireTrack}>
                  <LinearGradient colors={[gvt.color + '60', gvt.color]} style={[sty.intimDesireFill, { width: Math.max(groomVenus || 0, 8) + '%' }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                </View>
                <View style={[sty.intimDesireBadge, { backgroundColor: gvt.color + '15', borderColor: gvt.color + '30' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: gvt.color }}>{gvt.label}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Spark Triggers — what ignites them */}
        {sparkDetails.length > 0 && (
          <View style={sty.intimSparkSection}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{T ? '\u0D86\u0DC0\u0DDA\u0D9C \u0DC3\u0D82\u0D9A\u0DDA\u0DAD' : 'What Ignites You'}</Text>
            {sparkDetails.slice(0, 3).map(function(d, i) {
              return (
                <View key={i} style={sty.intimSparkItem}>
                  <View style={sty.intimSparkIcon}>
                    <Ionicons name={i === 0 ? 'flame' : i === 1 ? 'heart' : 'flash'} size={12} color={i === 0 ? '#EF4444' : i === 1 ? '#F472B6' : '#FFB800'} />
                  </View>
                  <Text style={sty.intimSparkItemText}>{T ? (d.si || d.en) : d.en}</Text>
                </View>
              );
            })}
          </View>
        )}
      </Glass>
    </Animated.View>
  );
}

function StrengthsCard({ data, language, bName, gName }) {
  var strengths = [];
  // Collect good factors
  if (data.factors) {
    data.factors.forEach(function(fac) {
      var pct = fac.maxScore > 0 ? fac.score / fac.maxScore : 0;
      if (pct >= 0.75) {
        var copy = getCompatibilityFactorCopy(fac.name, language, fac.score, fac.maxScore);
        strengths.push({ icon: 'checkmark-circle', color: '#34D399', text: copy.plainName + ' \u2014 ' + copy.insight });
      }
    });
  }
  // Yoga highlights
  var brideYogas = data.brideAdvanced?.tier1?.advancedYogas?.items || [];
  var groomYogas = data.groomAdvanced?.tier1?.advancedYogas?.items || [];
  var topYogas = brideYogas.concat(groomYogas).filter(function(y) { return y.strength === 'Very Strong' || y.strength === 'Strong'; }).slice(0, 3);
  var seenLabels = strengths.map(function(s) { return s.text; });
  topYogas.forEach(function(y) {
    var yCopy = getRelationshipStrengthCopy(y, language);
    if (seenLabels.indexOf(yCopy.label) === -1) {
      seenLabels.push(yCopy.label);
      strengths.push({ icon: 'flash', color: '#FFB800', text: yCopy.label + (yCopy.meta ? ' \u2014 ' + yCopy.meta : '') });
    }
  });
  // Good dasha harmony
  if (data.advancedPorondam?.advanced?.dashaCompatibility?.harmony === 'harmonious') {
    strengths.push({ icon: 'time', color: '#60a5fa', text: language === 'si' ? '\u0DAF\u0DD9\u0DAF\u0DD9\u0DB1\u0DCF\u0D9C\u0DDA\u0DB8 \u0DA2\u0DD3\u0DC0\u0DD2\u0DAD \u0D85\u0DAF\u0DD2\u0DBA\u0DBB \u0D9C\u0DD0\u0DBD\u0DB4\u0DDA' : 'Both in supportive life phases right now' });
  }
  // Strong navamsha
  if (data.advancedPorondam?.advanced?.navamshaCompatibility?.score >= 5) {
    strengths.push({ icon: 'heart', color: '#f9a8d4', text: language === 'si' ? '\u0D9C\u0DD0\u0DB9\u0DD4\u0DBB\u0DD4 \u0DC3\u0DB6\u0DB3\u0DAD\u0DCF \u0D9C\u0DD0\u0DBD\u0DB4\u0DD3\u0DB8 \u0DB4\u0DCA\u200D\u0DBB\u0DB6\u0DBD' : 'Deep emotional bond is naturally strong' });
  }
  // Good magnetism
  if (data.magnetism && data.magnetism.score >= 7) {
    strengths.push({ icon: 'magnet', color: '#a78bfa', text: language === 'si' ? '\u0D86\u0D9A\u0DBB\u0DCA\u0DC2\u0DAB\u0DBA \u0DB4\u0DCA\u200D\u0DBB\u0DB6\u0DBD' : 'Strong natural attraction between you' });
  }
  // Marriage planet strength
  if (data.advancedPorondam?.advanced?.marriagePlanetStrength?.score >= 3) {
    strengths.push({ icon: 'shield-checkmark', color: '#34d399', text: language === 'si' ? '\u0DC3\u0DB6\u0DB3\u0DAD\u0DCF \u0DC3\u0DC4\u0DCF\u0DBA \u0D9C\u0DCA\u200D\u0DBB\u0DC4 \u0DB4\u0DCA\u200D\u0DBB\u0DB6\u0DBD' : 'Planets strongly support this relationship' });
  }

  if (strengths.length === 0) return null;
  return (
    <Animated.View entering={FadeInUp.delay(850).duration(700)}>
      <Glass style={sty.section}>
        <View style={sty.secHeader}>
          <View>
            <Text style={sty.secTitle}><Ionicons name="sunny" size={16} color="#34D399" /> {language === 'si' ? '\u0D94\u0DB6\u0D9C\u0DDA \u0DC1\u0D9A\u0DCA\u0DAD\u0DD2' : 'Your Strengths'}</Text>
            <Text style={sty.secSub}>{language === 'si' ? '\u0DB8\u0DDA \u0DC3\u0DB6\u0DB3\u0DAD\u0DCF\u0DC0\u0DDA \u0DC4\u0DDC\u0DB3\u0DB8 \u0D9A\u0DDC\u0DA7\u0DC3\u0DCA' : 'The best parts of your connection'}</Text>
          </View>
        </View>
        {strengths.slice(0, 6).map(function(s, i) {
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 14, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(52,211,153,0.03)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.06)' }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: s.color + '12', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: s.color + '25' }}>
                <Ionicons name={s.icon} size={15} color={s.color} />
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, flex: 1, lineHeight: 20, alignSelf: 'center', fontWeight: '500' }}>{s.text}</Text>
            </View>
          );
        })}
      </Glass>
    </Animated.View>
  );
}

// ======= CHALLENGES SUMMARY CARD =======
function ChallengesCard({ data, language, bName, gName }) {
  var challenges = [];
  // Collect poor factors
  if (data.factors) {
    data.factors.forEach(function(fac) {
      var pct = fac.maxScore > 0 ? fac.score / fac.maxScore : 0;
      if (pct < 0.25) {
        var copy = getCompatibilityFactorCopy(fac.name, language, fac.score, fac.maxScore);
        challenges.push({ icon: 'alert-circle', color: '#F87171', text: copy.plainName + ' \u2014 ' + copy.insight });
      }
    });
  }
  // Doshas
  if (data.doshas && data.doshas.length > 0) {
    data.doshas.forEach(function(d) {
      var challengeCopy = getRelationshipChallengeCopy(d, language);
      challenges.push({ icon: 'warning', color: '#f59e0b', text: challengeCopy.label + (challengeCopy.desc ? ' \u2014 ' + challengeCopy.desc : '') });
    });
  }
  // Mangala dosha (if severe/moderate)
  if (data.advancedPorondam?.advanced?.mangalaDosha?.severity === 'severe' || data.advancedPorondam?.advanced?.mangalaDosha?.severity === 'moderate') {
    var cancelled = data.advancedPorondam.advanced.mangalaDosha.bride?.cancelled && data.advancedPorondam.advanced.mangalaDosha.groom?.cancelled;
    if (!cancelled) {
      challenges.push({
        icon: 'flame',
        color: '#f87171',
        text: language === 'si' ? '\u0D9C\u0DD0\u0DA7\u0DD4\u0DB8\u0DCA \u0DC3\u0DD0\u0DBD\u0D9A\u0DD2\u0DBD\u0DCA\u0DBD \u0D9A\u0DBB\u0DD4\u0DAB\u0DD4 \u2014 \u0D89\u0DC0\u0DC3\u0DD3\u0DB8 \u0DC4\u0DCF \u0DC3\u0DB1\u0DCA\u0DB1\u0DD2\u0DC0\u0DDA\u0DAF\u0DB1\u0DBA \u0DC0\u0DD0\u0DAF\u0D9C\u0DAD\u0DCA' : 'Conflict care point present \u2014 patience and communication are essential',
      });
    }
  }
  // Conflicting dasha
  if (data.advancedPorondam?.advanced?.dashaCompatibility?.harmony === 'conflicting') {
    challenges.push({
      icon: 'time',
      color: '#f59e0b',
      text: language === 'si' ? '\u0DA2\u0DD3\u0DC0\u0DD2\u0DAD \u0D85\u0DAF\u0DD2\u0DBA\u0DBB \u0DC0\u0DD9\u0DB1\u0DC3\u0DCA \u2014 \u0DAD\u0DD0\u0DB1\u0DCA \u0D9A\u0DCF\u0DBD\u0DBA \u0D9A\u0DCA\u200D\u0DBB\u0DB8\u0DBA\u0DD9\u0DB1\u0DCA \u0DC3\u0DD4\u0D9C\u0DB8 \u0DC0\u0DDA' : 'Different life phases right now \u2014 timing will improve gradually',
    });
  }

  if (challenges.length === 0) return null;
  return (
    <Animated.View entering={FadeInUp.delay(900).duration(700)}>
      <Glass style={sty.section}>
        <View style={sty.secHeader}>
          <View>
            <Text style={sty.secTitle}><Ionicons name="eye" size={16} color="#f59e0b" /> {language === 'si' ? '\u0DC3\u0DD0\u0DBD\u0D9A\u0DD2\u0DBD\u0DCA\u0DBD \u0DC0\u0DD3\u0DB8' : 'Watch Out For'}</Text>
            <Text style={sty.secSub}>{language === 'si' ? '\u0DB8\u0DDA\u0DC0\u0DCF\u0DA7 \u0DC3\u0DD0\u0DBD\u0D9A\u0DD2\u0DBD\u0DCA\u0DBD \u0DC0\u0DD3\u0DB8 \u0DC4\u0DDC\u0DB3\u0DBA\u0DD2' : 'Areas that need a little more care'}</Text>
          </View>
        </View>
        {challenges.slice(0, 6).map(function(c, i) {
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 14, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(248,113,113,0.02)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.06)' }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.color + '12', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.color + '25' }}>
                <Ionicons name={c.icon} size={15} color={c.color} />
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, flex: 1, lineHeight: 20, alignSelf: 'center', fontWeight: '500' }}>{c.text}</Text>
            </View>
          );
        })}
      </Glass>
    </Animated.View>
  );
}

// Person Input Card (with cosmic date/time pickers + CitySearchPicker)
function PersonCard({ label, name, setName, dateStr, setDateStr, timeStr, setTimeStr, city, setCity, T, lang, fieldPrefix, errors, clearFieldError }) {
  var nameField = fieldPrefix + 'Name';
  var dateField = fieldPrefix + 'Date';
  var cityField = fieldPrefix + 'City';
  var nameError = errors && errors[nameField];
  var dateError = errors && errors[dateField];
  var cityError = errors && errors[cityField];
  return (
    <Glass style={sty.personCard}>
      <Text style={sty.personLabel}>{label}</Text>
      <Text style={sty.fieldTag}>{lang === 'si' ? 'à¶±à¶¸ *' : 'Name *'}</Text>
      <TextInput
        style={[sty.nameInput, nameError ? sty.inputError : {}, { marginBottom: nameError ? 6 : 12 }]}
        value={name}
        onChangeText={function(value) { setName(value); if (String(value || '').trim().length >= 2) clearFieldError(nameField); }}
        placeholder={T.namePh}
        placeholderTextColor="rgba(255,255,255,0.2)"
        autoCorrect={false}
        returnKeyType="next"
        maxLength={25}
      />
      {nameError ? <Text style={sty.inlineError}>{nameError}</Text> : null}
      <Text style={sty.fieldTag}>{T.date}</Text>
      <DatePickerField value={dateStr} onChange={function(value) { setDateStr(value); if (value) clearFieldError(dateField); }} lang={lang} />
      {dateError ? <Text style={[sty.inlineError, { marginTop: 6 }]}>{dateError}</Text> : null}
      <Text style={[sty.fieldTag, { marginTop: 12 }]}>{T.time}</Text>
      <TimePickerField value={timeStr} onChange={setTimeStr} lang={lang} />
      <Text style={[sty.fieldTag, { marginTop: 12 }]}>{T.birthPlace}</Text>
      <CitySearchPicker
        selectedCity={city}
        onSelect={function(value) { setCity(value); if (value && value.lat !== null && value.lat !== undefined && value.lng !== null && value.lng !== undefined) clearFieldError(cityField); }}
        lang={lang}
        accentColor="#FF8C00"
        maxHeight={160}
        compact
      />
      {cityError ? <Text style={[sty.inlineError, { marginTop: 6, marginBottom: 0 }]}>{cityError}</Text> : null}
    </Glass>
  );
}

// ======= MAIN SCREEN =======
export default function PorondamScreen() {
  var { language } = useLanguage();
  var { isLoggedIn, showPaywall, user } = useAuth();
  var { colors, gradients, resolved } = useTheme();
  var sc = screenColors(colors);
  var T = L[language] || L.en;
  var isDesktop = useDesktopCtx();
  var insets = useScreenInsets();
  var reduced = useReducedMotion();
  var lowEnd = useLowEndDevice();

  var [bDate, setBDate] = useState('1998-01-15');
  var [bTime, setBTime] = useState('08:30');
  var [bName, setBName] = useState('');
  var [bCity, setBCity] = useState(null);

  var [gDate, setGDate] = useState('1998-06-20');
  var [gTime, setGTime] = useState('10:00');
  var [gName, setGName] = useState('');
  var [gCity, setGCity] = useState(null);

  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState(null);
  var [fieldErrors, setFieldErrors] = useState({});
  var [collapsed, setCollapsed] = useState(false);
  var scrollRef = useRef(null);
  var [report, setReport] = useState(null);
  var [reportLoading, setReportLoading] = useState(false);
  var [reportLang, setReportLang] = useState(language || 'en');
  var [porondamId, setPorondamId] = useState(null);
  var [savedChecks, setSavedChecks] = useState([]);
  var [showHistory, setShowHistory] = useState(false);
  var [chartsExpanded, setChartsExpanded] = useState(false);

  // â”€â”€ Load saved porondam: server-first, AsyncStorage fallback â”€â”€
  useEffect(function() {
    (async function() {
      // Try server first
      if (user && !user.isAnonymous) {
        try {
          var serverRes = await api.getMyPorondamHistory(10);
          if (serverRes && serverRes.data && serverRes.data.results && serverRes.data.results.length > 0) {
            var serverList = serverRes.data.results.map(function(r) {
              return {
                id: r.id,
                brideName: r.bride?.name || '',
                groomName: r.groom?.name || '',
                brideDate: r.bride?.birthDate || '',
                brideTime: '',
                brideCity: null,
                groomDate: r.groom?.birthDate || '',
                groomTime: '',
                groomCity: null,
                reportLang: r.reportLanguage || 'en',
                percentage: r.percentage || 0,
                score: r.score || 0,
                maxScore: r.maxScore || 20,
                ratingEmoji: r.ratingEmoji || null,
                hasReport: r.hasReport || false,
                savedAt: r.createdAt || '',
                isServerRecord: true,
              };
            });
            setSavedChecks(serverList);
            if (__DEV__) console.log('[Porondam] Loaded ' + serverList.length + ' results from server');
            return;
          }
        } catch (e) {
          if (__DEV__) console.warn('[Porondam] Server history failed, falling back to local:', e.message);
        }
      }
      // Fallback to AsyncStorage
      try {
        var stored = await AsyncStorage.getItem(PORONDAM_CACHE_KEY);
        if (stored) {
          setSavedChecks(JSON.parse(stored));
        }
      } catch (e) {
        if (__DEV__) console.warn('Failed to load saved porondam:', e);
      }
    })();
  }, [user]);

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
      if (__DEV__) console.warn('Failed to save porondam:', e);
    }
  }, [savedChecks]);

  // Delete a saved check (server + local)
  var deleteSavedCheck = useCallback(async function(checkId) {
    try {
      var entry = savedChecks.find(function(c) { return c.id === checkId; });
      if (entry && entry.isServerRecord) {
        try { await api.deletePorondamRecord(checkId); } catch (e) {
          if (__DEV__) console.warn('Server delete failed:', e.message);
        }
      }
      var updated = savedChecks.filter(function(c) { return c.id !== checkId; });
      await AsyncStorage.setItem(PORONDAM_CACHE_KEY, JSON.stringify(updated));
      setSavedChecks(updated);
    } catch (e) {
      if (__DEV__) console.warn('Failed to delete porondam:', e);
    }
  }, [savedChecks]);

  // Load a saved check (fetch full content from server if needed)
  var [loadingCheck, setLoadingCheck] = useState(false);
  var loadSavedCheck = useCallback(async function(entry) {
    if (entry.isServerRecord) {
      setLoadingCheck(true);
      setError(null);
      try {
        var res = await api.getSavedPorondam(entry.id);
        if (res && res.data) {
          var d = res.data;
          // Normalize field names (Firestore uses score/maxScore, UI expects totalScore/maxPossibleScore)
          if (d.totalScore === undefined && d.score !== undefined) d.totalScore = d.score;
          if (d.maxPossibleScore === undefined && d.maxScore !== undefined) d.maxPossibleScore = d.maxScore;
          setBName(d.bride?.name || entry.brideName || '');
          setGName(d.groom?.name || entry.groomName || '');
          setBDate(d.bride?.birthDate || entry.brideDate || '1998-01-15');
          setBTime(entry.brideTime || '08:30');
          setBCity(entry.brideCity || null);
          setGDate(d.groom?.birthDate || entry.groomDate || '1998-06-20');
          setGTime(entry.groomTime || '10:00');
          setGCity(entry.groomCity || null);
          setReportLang(d.reportLanguage || entry.reportLang || 'en');
          setData(d);
          setReport(d.report || null);
          setPorondamId(d.id || entry.id);
          setCollapsed(true);
          setShowHistory(false);
        } else {
          setError('Failed to load saved result');
        }
      } catch (e) {
        if (__DEV__) console.warn('Failed to load server porondam:', e.message);
        setError('Failed to load saved result');
      } finally {
        setLoadingCheck(false);
      }
    } else {
      // Local cached â€” load directly
      setBName(entry.brideName || 'Bride');
      setGName(entry.groomName || 'Groom');
      setBDate(entry.brideDate || '1998-01-15');
      setBTime(entry.brideTime || '08:30');
      setBCity(entry.brideCity || null);
      setGDate(entry.groomDate || '1998-06-20');
      setGTime(entry.groomTime || '10:00');
      setGCity(entry.groomCity || null);
      setReportLang(entry.reportLang || 'en');
      setData(entry.data);
      setReport(entry.report || null);
      setPorondamId(entry.porondamId || null);
      setCollapsed(true);
      setShowHistory(false);
      setError(null);
    }
  }, []);

  // Sync report language when app language changes (only when no data yet)
  useEffect(function() {
    if (!data) setReportLang(language || 'en');
  }, [language]);

  function buildDateISO(dateStr, timeStr) {
    return dateStr + 'T' + (timeStr || '12:00') + ':00';
  }

  function clearFieldError(fieldName) {
    setFieldErrors(function(prev) {
      if (!prev || !prev[fieldName]) return prev;
      var next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }

  function validatePorondamForm() {
    var nextErrors = {};
    var brideName = String(bName || '').trim();
    var groomName = String(gName || '').trim();
    if (brideName.length < 2) {
      nextErrors.brideName = language === 'si' ? 'à¶¸à¶±à·à¶½à·’à¶ºà¶œà·š à¶±à¶¸ à¶…à¶šà·”à¶»à·” 2à¶šà¶§ à·€à¶©à· à¶‡à¶­à·”à·…à¶­à·Š à¶šà¶»à¶±à·Šà¶±.' : 'Enter the bride name, at least 2 characters.';
    }
    if (groomName.length < 2) {
      nextErrors.groomName = language === 'si' ? 'à¶¸à¶±à·à¶½à¶ºà·à¶œà·š à¶±à¶¸ à¶…à¶šà·”à¶»à·” 2à¶šà¶§ à·€à¶©à· à¶‡à¶­à·”à·…à¶­à·Š à¶šà¶»à¶±à·Šà¶±.' : 'Enter the groom name, at least 2 characters.';
    }
    if (!bDate) {
      nextErrors.brideDate = language === 'si' ? 'à¶¸à¶±à·à¶½à·’à¶ºà¶œà·š à¶‹à¶´à¶±à·Š à¶¯à·’à¶±à¶º à¶­à·à¶»à¶±à·Šà¶±.' : 'Select the bride birth date.';
    }
    if (!gDate) {
      nextErrors.groomDate = language === 'si' ? 'à¶¸à¶±à·à¶½à¶ºà·à¶œà·š à¶‹à¶´à¶±à·Š à¶¯à·’à¶±à¶º à¶­à·à¶»à¶±à·Šà¶±.' : 'Select the groom birth date.';
    }
    if (!bCity || bCity.lat === null || bCity.lat === undefined || bCity.lng === null || bCity.lng === undefined) {
      nextErrors.brideCity = language === 'si' ? 'à¶¸à¶±à·à¶½à·’à¶ºà¶œà·š à¶‹à¶´à¶±à·Š à·ƒà·Šà¶®à·à¶±à¶º à¶­à·à¶»à¶±à·Šà¶±.' : 'Select the bride birth place.';
    }
    if (!gCity || gCity.lat === null || gCity.lat === undefined || gCity.lng === null || gCity.lng === undefined) {
      nextErrors.groomCity = language === 'si' ? 'à¶¸à¶±à·à¶½à¶ºà·à¶œà·š à¶‹à¶´à¶±à·Š à·ƒà·Šà¶®à·à¶±à¶º à¶­à·à¶»à¶±à·Šà¶±.' : 'Select the groom birth place.';
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  var check = useCallback(async function() {
    if (!validatePorondamForm()) {
      setError(null);
      if (scrollRef.current) scrollRef.current.scrollTo({ y: 0, animated: true });
      return;
    }
    setFieldErrors({});

    var brideData = { birthDate: buildDateISO(bDate, bTime), lat: bCity.lat, lng: bCity.lng, name: String(bName || '').trim() };
    var groomData = { birthDate: buildDateISO(gDate, gTime), lat: gCity.lat, lng: gCity.lng, name: String(gName || '').trim() };
    var entitlementInput = {
      brideBirthDate: brideData.birthDate,
      brideLat: brideData.lat,
      brideLng: brideData.lng,
      groomBirthDate: groomData.birthDate,
      groomLat: groomData.lat,
      groomLng: groomData.lng,
      language: reportLang,
    };

    // â”€â”€ Check for pending entitlement (retry after failed generation) â”€â”€
    var isRetry = false;
    try {
      var entCheck = await api.checkEntitlement('porondam', entitlementInput);
      if (entCheck && entCheck.hasPending) {
        isRetry = true;
        if (__DEV__) console.log('[Porondam] â™»ï¸ Resuming failed generation â€” no payment needed (' + entCheck.entitlement.retriesLeft + ' retries left)');
      }
    } catch (entErr) {
      // Non-critical â€” proceed with normal payment flow
      if (__DEV__) console.warn('[Porondam] Entitlement check failed (non-critical):', entErr.message);
    }

    // Show paywall only if NOT a retry (pending entitlement = free retry)
    if (!isRetry) {
      try {
        await showPaywall('porondam');
      } catch (e) {
        // User cancelled payment â€” do not proceed
        return;
      }
    }

    // Payment succeeded â€” now run the compatibility check
    try {
      setLoading(true); setError(null); setData(null); setReport(null); setPorondamId(null);

      var checkRes = await api.checkPorondam(brideData, groomData);
      setData(checkRes.data);
      if (checkRes.porondamId) setPorondamId(checkRes.porondamId);

      // Fire AI report generation (with 1 automatic retry on failure)
      setReportLoading(true);
      var reportRes = null;
      try {
        reportRes = await api.getPorondamReport(checkRes.data, reportLang, brideData.name, groomData.name, checkRes.porondamId || undefined, entitlementInput);
        setReport(reportRes.report);
        if (reportRes.porondamId) setPorondamId(reportRes.porondamId);
      } catch (rErr) {
        var providerBusy = rErr.code === 'AI_PROVIDER_RATE_LIMIT' || rErr.code === 'AI_PROVIDER_UNAVAILABLE' || rErr.statusCode === 429 || rErr.statusCode === 503;
        if (providerBusy) {
          if (__DEV__) console.warn('[Porondam] AI provider busy; retry is preserved:', rErr.message);
          setReport(T.reportBusy);
          reportRes = null;
        } else {
          if (__DEV__) console.warn('[Porondam] AI report failed, retrying in 3s:', rErr.message);
          try {
            await new Promise(function(r) { setTimeout(r, 3000); });
            reportRes = await api.getPorondamReport(checkRes.data, reportLang, brideData.name, groomData.name, checkRes.porondamId || undefined, entitlementInput);
            setReport(reportRes.report);
            if (reportRes.porondamId) setPorondamId(reportRes.porondamId);
          } catch (rErr2) {
            setReport(T.reportFailed);
          }
        }
      } finally {
        setReportLoading(false);
      }

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCollapsed(true);

      // Save to cache
      savePorondamToCache({
        brideName: brideData.name,
        groomName: groomData.name,
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
  }, [bDate, bTime, gDate, gTime, bCity, gCity, bName, gName, T, language, reportLang]);

  
  // Ã¢â€â‚¬Ã¢â€â‚¬ DOWNLOAD PORONDAM AS PDF Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
            + '<h1>' + (isSi ? '\u0DC3\u0DB6\u0DB3\u0DAD\u0DCF \u0D9C\u0DD0\u0DBD\u0DB4\u0DD3\u0DB8\u0DCA \u0DC0\u0DCF\u0DBB\u0DCA\u0DAD\u0DCF\u0DC0' : 'Relationship Match Report') + '</h1>'
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
        ? '\u0DB4\u0DDC\u0DBB\u0DDC\u0DB1\u0DCA\u0DAF\u0DB8\u0DCA: ' + data.totalScore + '/' + data.maxPossibleScore + ' (' + data.percentage + '%) \u2014 ' + (data.ratingSinhala || data.rating) + '\n\nGrahachara'
        : 'Compatibility: ' + data.totalScore + '/' + data.maxPossibleScore + ' (' + data.percentage + '%) \u2014 ' + data.rating + '\n\nGrahachara';
      await Share.share({ message: msg });
    } catch (e) {}
  };

  // â”€â”€ FULL SCREEN LOADING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (loading) {
    return (
      <DesktopScreenWrapper routeName="porondam">
        <View style={{ flex: 1, backgroundColor: colors.bg, overflow: 'hidden' }}>
          <CosmicBackground reduced={reduced} lowEnd={lowEnd} variant="golden" />
          <LinearGradient
            colors={['rgba(4,3,12,0.20)', 'rgba(4,3,12,0.05)', 'rgba(4,3,12,0.42)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <ScrollView contentContainerStyle={[lsStyles.loadingScreen, !isDesktop && { paddingTop: insets.contentTop, paddingBottom: insets.contentBottom }]} showsVerticalScrollIndicator={false} bounces={false}>
            <PorondamCosmicLoader brideName={bName} groomName={gName} language={language} reduced={reduced} lowEnd={lowEnd} />
          </ScrollView>
        </View>
      </DesktopScreenWrapper>
    );
  }

  var validationItems = Object.keys(fieldErrors || {}).map(function(key) { return fieldErrors[key]; });

  return (
    <DesktopScreenWrapper routeName="porondam">
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} enabled={Platform.OS === 'ios'}>
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <CosmicBackground reduced={reduced} lowEnd={lowEnd} />
      <ScrollView ref={scrollRef} style={sty.flex} contentContainerStyle={[sty.scroll, isDesktop && sty.scrollDesktop, !isDesktop && { paddingTop: insets.contentTop, paddingBottom: insets.contentBottom }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
        <View style={[sty.scrollInner, isDesktop && sty.scrollInnerDesktop]}>

        <Animated.View entering={FadeInDown.duration(600)}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={[sty.title, { color: sc.sectionTitle }]}>{T.title}</Text>
              <Text style={[sty.subtitle, { color: sc.labelColor }]}>{T.subtitle}</Text>
            </View>
            {savedChecks.length > 0 && !collapsed && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.accentMuted, borderWidth: 1, borderColor: colors.borderAccent, marginTop: 4 }}
                onPress={function() { setShowHistory(!showHistory); }} activeOpacity={0.7}>
                <Ionicons name={showHistory ? 'close-outline' : 'time-outline'} size={14} color={sc.iconAccent} />
                <Text style={{ color: sc.iconAccent, fontSize: 11, fontWeight: '700' }}>{savedChecks.length}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* â”€â”€ SAVED HISTORY â”€â”€ */}
        {showHistory && savedChecks.length > 0 && !collapsed && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <Glass style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="time-outline" size={16} color="#FF8C00" />
                  <Text style={{ color: '#FFE8B0', fontSize: 14, fontWeight: '800' }}>{T.history}</Text>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>{savedChecks.length} {language === 'si' ? 'à·ƒà·”à¶»à¶šà·’à¶± à¶½à¶¯' : 'saved'}</Text>
              </View>
              <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                {savedChecks.map(function(entry, idx) {
                  var pct = entry.isServerRecord
                    ? (entry.percentage || (entry.maxScore > 0 ? Math.round((entry.score || 0) / entry.maxScore * 100) : 0))
                    : (entry.data?.maxPossibleScore > 0 ? Math.round((entry.data?.totalScore || 0) / entry.data.maxPossibleScore * 100) : 0);
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
                            {(entry.brideName || 'Bride') + '  \u00D7  ' + (entry.groomName || 'Groom')}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{entry.isServerRecord ? (entry.score || 0) : (entry.data?.totalScore || 0)}/{entry.isServerRecord ? (entry.maxScore || 20) : (entry.data?.maxPossibleScore || 20)}</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.15)', fontSize: 9 }}>â€¢</Text>
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
            {validationItems.length > 0 ? (
              <Animated.View entering={FadeInDown.duration(250)}>
                <Glass style={sty.validationSummary}>
                  <Ionicons name="alert-circle-outline" size={18} color="#FCA5A5" />
                  <View style={{ flex: 1 }}>
                    <Text style={sty.validationTitle}>{language === 'si' ? 'à¶šà¶»à·”à¶«à·à¶šà¶» à¶¸à·š à·€à·’à·ƒà·Šà¶­à¶» à·ƒà¶¸à·Šà¶´à·–à¶»à·Šà¶« à¶šà¶»à¶±à·Šà¶±' : 'Complete these details'}</Text>
                    <Text style={sty.validationText}>{validationItems.join(' ')}</Text>
                  </View>
                </Glass>
              </Animated.View>
            ) : null}
            <View style={WIDE ? sty.formRow : undefined}>
              <Animated.View entering={FadeInDown.delay(100).duration(600)} exiting={FadeOut.duration(300)} style={WIDE ? sty.formCol : undefined}>
                <PersonCard label={T.bride} name={bName} setName={setBName}
                  dateStr={bDate} setDateStr={setBDate} timeStr={bTime} setTimeStr={setBTime}
                  city={bCity} setCity={setBCity}
                  T={T} lang={language} fieldPrefix="bride" errors={fieldErrors} clearFieldError={clearFieldError} />
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(180).duration(600)} exiting={FadeOut.duration(300)} style={WIDE ? sty.formCol : undefined}>
                <PersonCard label={T.groom} name={gName} setName={setGName}
                  dateStr={gDate} setDateStr={setGDate} timeStr={gTime} setTimeStr={setGTime}
                  city={gCity} setCity={setGCity}
                  T={T} lang={language} fieldPrefix="groom" errors={fieldErrors} clearFieldError={clearFieldError} />
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
                    <Ionicons name="globe" size={16} color="#FF8C00" style={{ marginRight: 6 }} />
                    <Text style={[sty.langChipText, reportLang === 'si' && sty.langChipTextActive]}>{T.si}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[sty.langChip, reportLang === 'en' && sty.langChipActive]} onPress={function() { setReportLang('en'); }} activeOpacity={0.7}>
                    <Ionicons name="globe-outline" size={16} color="#60A5FA" style={{ marginRight: 6 }} />
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
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <TouchableOpacity
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,140,0,0.20)', backgroundColor: 'rgba(255,140,0,0.05)' }}
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

            {/* Premium Section Divider */}
            <View style={sty.premiumDivider}>
              <View style={sty.dividerLine} />
              <View style={sty.dividerGem}><Ionicons name="diamond" size={10} color="rgba(255,184,0,0.5)" /></View>
              <View style={sty.dividerLine} />
            </View>

            {/* Star Profiles */}
            <StarProfilesCard data={data} language={language} bName={bName} gName={gName} />

            {/* Your Elements */}
            <ElementsCard data={data} language={language} />

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


            
            {/* Magnetism */}
            <MagnetismCard data={data} language={language} />

            {/* Intimate Chemistry */}
            <IntimateChemistryCard data={data} language={language} bName={bName} gName={gName} />

            {/* Your Strengths */}
            <StrengthsCard data={data} language={language} bName={bName} gName={gName} />

            {/* Soul Blueprint */}
            <SoulBlueprintCard data={data} language={language} bName={bName} gName={gName} />

            {/* Past Lives */}
            <PastLivesCard data={data} language={language} bName={bName} gName={gName} />

            {/* Watch Out For */}
            <ChallengesCard data={data} language={language} bName={bName} gName={gName} />


            {/* Red Flag Check */}
            <RedFlagCard data={data} language={language} bName={bName} gName={gName} />

            {/* Timing & Pressure */}
            <TimingCard data={data} language={language} bName={bName} gName={gName} />

            {/* Deeper Connection */}
            <DeeperConnectionCard data={data} language={language} />
            {/* Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â BEST WEDDING WINDOWS Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â */}
            <View style={sty.premiumDivider}>
              <View style={sty.dividerLine} />
              <View style={sty.dividerGem}><Ionicons name="diamond" size={10} color="rgba(255,184,0,0.5)" /></View>
              <View style={sty.dividerLine} />
            </View>

            {data.advancedPorondam?.advanced?.weddingWindows?.favorableWindows?.length > 0 && (
              <Animated.View entering={FadeInUp.delay(1250).duration(700)}>
                <Glass style={sty.section}>
                  <View style={sty.secHeader}>
                    <View>
                      <Text style={sty.secTitle}><Ionicons name="calendar" size={15} color="#34D399" /> {T.weddingTitle}</Text>
                      <Text style={sty.secSub}>{language === 'si' ? '\u0d89\u0daf\u0dd2\u0dbb\u0dd2 \u0dc0\u0dc3\u0dbb 3 \u0dad\u0dd4\u0dc5 \u0dc4\u0ddc\u0daf\u0db8 \u0d9a\u0dcf\u0dbd\u0dba' : 'Best windows in the next 3 years'}</Text>
                    </View>
                  </View>
                  {data.advancedPorondam.advanced.weddingWindows.favorableWindows.map(function(w, i) {
                    var hasDate = w.end && w.end.length > 0;
                    var isBest = w.best === true;
                    return (
                      <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 12, borderBottomWidth: i < data.advancedPorondam.advanced.weddingWindows.favorableWindows.length - 1 ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
                        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: isBest ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: isBest ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name={isBest ? 'star' : 'calendar-outline'} size={16} color={isBest ? '#34D399' : 'rgba(255,255,255,0.4)'} />
                        </View>
                        <View style={{ flex: 1 }}>
                          {hasDate ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={{ color: isBest ? '#34D399' : '#FFE8B0', fontSize: 13, fontWeight: '800' }}>
                                {w.start} \u2192 {w.end}
                              </Text>
                              {isBest && <View style={{ backgroundColor: 'rgba(52,211,153,0.12)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)' }}><Text style={{ fontSize: 9, fontWeight: '900', color: '#34D399' }}>{language === 'si' ? '\u0dc4\u0ddc\u0daf\u0db8' : 'BEST'}</Text></View>}
                            </View>
                          ) : (
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{language === 'si' ? (w.startSi || T.noWindows) : T.noWindows}</Text>
                          )}
                          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 3, lineHeight: 16 }}>{language === 'si' ? (w.reasonSi || w.reason) : w.reason}</Text>
                          {w.durationDays > 0 && <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, marginTop: 2 }}>{w.durationDays} {language === 'si' ? '\u0daf\u0dd2\u0db1' : 'days'}</Text>}
                        </View>
                      </View>
                    );
                  })}
                </Glass>
              </Animated.View>
            )}


            <TouchableOpacity onPress={function() { setChartsExpanded(!chartsExpanded); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); }} activeOpacity={0.7} style={sty.chartsToggle}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={sty.chartsToggleIcon}><Ionicons name="grid" size={13} color="#FF8C00" /></View><Text style={sty.chartsToggleText}>{language === 'si' ? '\u0DA2\u0DCF\u0DAD\u0D9A \u0DA0\u0D9A\u0DCA\u200D\u0DBB' : 'Birth Charts'}</Text></View>
              <Ionicons name={chartsExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
            {chartsExpanded && <View style={[sty.charts, WIDE && sty.chartsWide]}>
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
                  <Ionicons name="heart" size={22} color="#F472B6" />
                </Animated.View>
              )}
              {!WIDE && data.brideChart && data.groomChart && (
                <Animated.View entering={ZoomIn.delay(400).duration(500)} style={{ alignItems: 'center', paddingVertical: 6 }}>
                  <View style={{ width: 1, height: 20, backgroundColor: 'rgba(255,140,0,0.15)' }} />
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(244,114,182,0.12)', alignItems: 'center', justifyContent: 'center', marginVertical: 4, borderWidth: 1, borderColor: 'rgba(244,114,182,0.25)' }}>
                    <Ionicons name="heart" size={16} color="#F472B6" />
                  </View>
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
            </View>}
            <Animated.View entering={FadeInUp.delay(1300).duration(700)}>
              <Glass style={sty.section}>
                <View style={sty.secHeader}>
                  <View>
                    <Text style={sty.secTitle}><Ionicons name="eye" size={16} color="#FFE8B0" /> {T.report}</Text>
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
                {!report && !reportLoading && (
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontStyle: 'italic' }}>
                    {language === 'si' ? 'à·€à·à¶»à·Šà¶­à·à·€ à¶½à¶¶à· à¶œà¶­ à¶±à·œà·„à·à¶šà·’ à·€à·’à¶º.' : 'Report not available.'}
                  </Text>
                )}
              </Glass>
            </Animated.View>
          </View>
        )}

        <View style={{ height: isDesktop ? 32 : 120 }} />
        </View>
      </ScrollView>


    </View>
    </KeyboardAvoidingView>
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
  // Inner centring wrapper â€” applied on desktop inside the scroll
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
  inputError: { borderColor: 'rgba(248,113,113,0.75)', backgroundColor: 'rgba(127,29,29,0.14)' },
  inlineError: { color: '#FCA5A5', fontSize: 11.5, lineHeight: 16, fontWeight: '700', marginBottom: 12 },
  validationSummary: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderColor: 'rgba(248,113,113,0.24)', backgroundColor: 'rgba(127,29,29,0.10)', marginBottom: 14 },
  validationTitle: { color: '#FECACA', fontSize: 12.5, lineHeight: 17, fontWeight: '900', marginBottom: 2 },
  validationText: { color: 'rgba(254,202,202,0.78)', fontSize: 11.5, lineHeight: 17, fontWeight: '600' },
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

  cta: { borderRadius: 16, paddingVertical: 17, alignItems: 'center', overflow: 'hidden', marginBottom: 8, ...boxShadow('#FF8C00', { width: 0, height: 4 }, 0.7, 18) },
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

  // Score Gauge â€” binary star orbit
  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  gaugeInfo: { flex: 1 },
  gaugeCosmicLabel: { fontSize: 14, fontWeight: '800', marginBottom: 3, letterSpacing: 0.3 },
  gaugeRating: { fontSize: 16, fontWeight: '700', color: '#FFE8B0', marginBottom: 3 },
  gaugeScoreText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginBottom: 12 },
  shareChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12,
    backgroundColor: 'rgba(255,140,0,0.08)', borderWidth: 1.5, borderColor: 'rgba(255,140,0,0.35)',
  },
  shareChipText: { color: '#FF8C00', fontSize: 12, fontWeight: '800' },

  charts: { marginBottom: 6 },
  chartsWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  chartCol: { flex: 1, maxWidth: 440 },
  chartCard: { alignItems: 'center', paddingVertical: WIDE ? 20 : 16 },
  chartTitle: { fontSize: 14, fontWeight: '700', color: '#FF8C00', marginBottom: 12, letterSpacing: 0.3 },
  heartBridge: { alignItems: 'center', marginVertical: -6, zIndex: 10 },
  heartBridgeWide: { marginVertical: 0, marginHorizontal: -10 },

  section: { marginBottom: 16, borderColor: 'rgba(255,184,0,0.06)' },
  secHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  secTitle: { fontSize: 16, fontWeight: '800', color: '#FFE8B0', letterSpacing: 0.2, ...textShadow('rgba(255,184,0,0.18)', { width: 0, height: 1 }, 5) },
  secSub: { fontSize: 12, color: 'rgba(255,140,0,0.6)', fontWeight: '500', marginTop: 2 },

  factorItem: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  factorTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  factorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  factorDot: { width: 8, height: 8, borderRadius: 4 },
  factorName: { fontSize: 14, color: '#FFE8B0', fontWeight: '700' },
  factorSinhala: { fontSize: 12, color: 'rgba(255,140,0,0.5)', fontWeight: '500' },
  factorBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  factorBadgeText: { fontSize: 12, fontWeight: '800' },
  barTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  barFill: { height: '100%', borderRadius: 6, overflow: 'hidden' },
  factorDesc: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6, lineHeight: 18 },
  factorTech: { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 },
  factorInsight: { color: 'rgba(255,232,176,0.75)', fontSize: 12, lineHeight: 18, marginTop: 8, paddingLeft: 44, fontStyle: 'italic' },

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

  // ─── Premium UI Styles ───────────────────────────────────────────
  premiumDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, paddingHorizontal: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,184,0,0.12)' },
  dividerGem: { marginHorizontal: 12, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,184,0,0.06)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.15)', alignItems: 'center', justifyContent: 'center' },

  factorIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  factorScorePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  factorScoreText: { fontSize: 12, fontWeight: '900' },

  chartsToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, marginVertical: 8,
    borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.12)', backgroundColor: 'rgba(255,140,0,0.04)',
  },
  chartsToggleIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,140,0,0.10)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,140,0,0.18)' },
  chartsToggleText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700' },

  // ─── Star Profiles ───
  profilePill: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 14, alignItems: 'center', gap: 4 },
  profileDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  profileName: { fontSize: 12, fontWeight: '800', color: '#FFE8B0', marginBottom: 2 },
  profileSign: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  profileStar: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  profileLord: { fontSize: 10, color: 'rgba(255,140,0,0.6)', marginTop: 4 },

  // ─── Attraction Chemistry pills ───
  chemPill: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 12, alignItems: 'center', gap: 6 },
  chemIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  chemLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  chemTier: { fontSize: 13, fontWeight: '900' },

  // ─── Deeper Connection rows ───
  deepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  deepLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  deepIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  deepTitle: { fontSize: 13, fontWeight: '700', color: '#FFE8B0' },
  deepDesc: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2, lineHeight: 15 },
  deepBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, marginLeft: 8 },
  deepBadgeText: { fontSize: 11, fontWeight: '900' },

  // ─── Elements card ───
  elemCard: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  elemCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  elemName: { fontSize: 15, fontWeight: '900' },
  elemWho: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  elemMetaphor: { fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 14, fontStyle: 'italic', lineHeight: 18, paddingHorizontal: 8 },

  // ─── Magnetism 5-factor ───
  magRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  magIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  magLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  magBarBg: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  magBarFill: { height: 5, borderRadius: 3 },
  magScore: { fontSize: 11, fontWeight: '900', minWidth: 28, textAlign: 'right' },

  // ─── Soul Blueprint ───
  soulRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  soulIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  soulWho: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '700' },
  soulDrive: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 2 },
  soulPlanet: { fontSize: 10, fontWeight: '900', opacity: 0.7 },
  soulSynth: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,184,0,0.12)' },
  soulSynthText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', lineHeight: 17 },

  // ─── Past Lives ───
  pastCard: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: 'rgba(192,132,252,0.04)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(192,132,252,0.12)' },
  pastIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  pastWho: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '700' },
  pastArch: { fontSize: 14, fontWeight: '900' },
  pastNarrative: { fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 14, fontStyle: 'italic', lineHeight: 18 },
  pastKarma: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,184,0,0.08)' },
  pastKarmaText: { flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 15 },

  // ─── Red Flag ───
  flagPerson: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  flagName: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '700' },
  flagLabel: { fontSize: 13, fontWeight: '900' },
  flagVerdict: { fontSize: 12, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginTop: 12, fontStyle: 'italic', lineHeight: 17 },

  // ─── Timing & Pressure ───
  timingPerson: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  timingBadge: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  timingName: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '700' },
  timingLabel: { fontSize: 12, fontWeight: '800' },
  timingAdvice: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 12, fontStyle: 'italic', lineHeight: 17 },

  // ─── Intimate Chemistry ───
  // ─── Intimate Chemistry (redesigned) ───
  intimHeatBadge: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  intimHeatBar: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 6, overflow: 'hidden' },
  intimHeatFill: { height: 4, borderRadius: 2 },
  intimHeatLabel: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  intimAnimalsSection: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  intimAnimalCardNew: { flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden', position: 'relative' },
  intimAnimalGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 50, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  intimAnimalBubble: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  intimAnimalLabel: { fontSize: 14, fontWeight: '900', marginTop: 4 },
  intimAnimalDesc: { fontSize: 9, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: 3, lineHeight: 13 },
  intimMatchCenter: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  intimMatchRing: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)' },
  intimNarrativeBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: 'rgba(255,184,0,0.04)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.10)' },
  intimNarrativeText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', lineHeight: 17 },
  intimDesireSection: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  intimDesireRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  intimDesireName: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '700', width: 44 },
  intimDesireTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  intimDesireFill: { height: 8, borderRadius: 4 },
  intimDesireBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  intimSparkSection: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  intimSparkItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 8 },
  intimSparkIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' },
  intimSparkItemText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 17 },
});
