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

// Porondam loading screen - Twin Horoscope Convergence
var PORONDAM_LOADING_STAGES = {
  en: [
    { title: 'Casting both birth maps', sub: 'Lagna, Moon sign, and Nakshatra are being aligned.', icon: 'planet-outline' },
    { title: 'Tracing the seven Porondam signals', sub: 'Dina, Gana, Yoni, Rashi, Vasya, Nadi, and Mahendra are being compared.', icon: 'analytics-outline' },
    { title: 'Measuring emotional rhythm', sub: 'Daily comfort, attraction, family flow, and commitment patterns are taking shape.', icon: 'pulse-outline' },
    { title: 'Reading the deeper bond', sub: 'Navamsha, life phase timing, and long-term support are being refined.', icon: 'diamond-outline' },
    { title: 'Preparing your compatibility story', sub: 'The final relationship reading is being polished.', icon: 'sparkles' },
  ],
  si: [
    { title: 'උපත් සිතියම් දෙක සකසමින්', sub: 'ලග්නය, චන්ද්‍ර රාශිය, සහ නැකත එකට පෙළගස්වමින්.', icon: 'planet-outline' },
    { title: 'පොරොන්දම් ලකුණු හත කියවමින්', sub: 'දින, ගණ, යෝනි, රාශි, වශ්‍ය, නාඩි, සහ මහේන්ද්‍ර ගැළපීම සසඳමින්.', icon: 'analytics-outline' },
    { title: 'හැඟීම් රිද්මය මැන බලමින්', sub: 'දෛනික පහසුව, ආකර්ෂණය, පවුල් ගලායෑම, සහ කැපවීම සකසමින්.', icon: 'pulse-outline' },
    { title: 'ගැඹුරු බැඳීම විශ්ලේෂණය කරමින්', sub: 'නවාංශක, ජීවිත අදියර, සහ දිගුකාලීන සහාය පිරිපහදු කරමින්.', icon: 'diamond-outline' },
    { title: 'ගැළපීම් කතාව සූදානම් කරමින්', sub: 'අවසාන සබඳතා කියවීම පිරිසිදු කරමින්.', icon: 'sparkles' },
  ],
};

var PORONDAM_SIGNAL_TRACK = [
  { en: 'Dina', si: 'දින', icon: 'sunny-outline', color: '#FBBF24' },
  { en: 'Gana', si: 'ගණ', icon: 'people-outline', color: '#A78BFA' },
  { en: 'Yoni', si: 'යෝනි', icon: 'heart-outline', color: '#F472B6' },
  { en: 'Rashi', si: 'රාශි', icon: 'moon-outline', color: '#60A5FA' },
  { en: 'Vasya', si: 'වශ්‍ය', icon: 'magnet-outline', color: '#FB923C' },
  { en: 'Nadi', si: 'නාඩි', icon: 'pulse-outline', color: '#34D399' },
  { en: 'Mahendra', si: 'මහේන්ද්‍ර', icon: 'leaf-outline', color: '#22D3EE' },
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

function getCompatibilityFactorCopy(name, language) {
  var copies = {
    Dina: {
      en: ['Dina Porondam (Daily Harmony)', 'Shows whether everyday routines, moods, and wellbeing feel comfortable together.'],
      si: ['දින පොරොන්දම (දෛනික සමගිය)', 'දිනපතා රටාව, මනෝභාවය, සහ සෞඛ්‍ය පහසුවෙන් ගැළපේදැයි පෙන්වනවා.'],
    },
    Gana: {
      en: ['Gana Porondam (Temperament Match)', 'Shows whether both personalities handle stress, habits, and reactions in a compatible way.'],
      si: ['ගණ පොරොන්දම (ස්වභාව ගැළපීම)', 'දෙදෙනාගේ ස්වභාවය, ආතතිය, පුරුදු, සහ ප්‍රතිචාර ගැළපෙන ආකාරය පෙන්වනවා.'],
    },
    Yoni: {
      en: ['Yoni Porondam (Intimacy & Chemistry)', 'Shows natural closeness, affection style, and private-life comfort.'],
      si: ['යෝනි පොරොන්දම (සමීපකාමීත්වය ගැලපීම)', 'සමීපතාව, ආදර පෙන්වන රටාව, සහ පුද්ගලික ජීවිතයේ පහසුව පෙන්වනවා.'],
    },
    Rashi: {
      en: ['Rashi Porondam (Mind & Home Fit)', 'Shows emotional understanding, home-life rhythm, and how easily both people adjust.'],
      si: ['රාශි පොරොන්දම (මනස සහ චින්තන ගැළපීම)', 'හැඟීම් තේරුම්ගැනීම, ගෘහ ජීවිත රටාව, සහ එකිනෙකාට හැඩගැසීම පෙන්වනවා.'],
    },
    Vasya: {
      en: ['Vasya Porondam (Mutual Attraction)', 'Shows pull, influence, and whether both people naturally respond to each other.'],
      si: ['වශ්‍ය පොරොන්දම (ආකර්ෂණ ගැළපීම)', 'එකිනෙකාට ඇති ආකර්ෂණය, බැඳීම සහ ස්වභාවික ප්‍රතිචාර පෙන්වනවා.'],
    },
    Nadi: {
      en: ['Nadi Porondam (Health & Genetics)', 'Shows long-term family harmony, health rhythm, and future household stability.'],
      si: ['නාඩි පොරොන්දම (සෞඛ්‍ය හා පවුල් පැවැත්ම)', 'දිගුකාලීන පවුල් සමගිය, සෞඛ්‍ය රටාව, සහ පරම්පරාවේ පැවැත්ම පෙන්වනවා.'],
    },
    Mahendra: {
      en: ['Mahendra Porondam (Growth Support)', 'Shows whether the relationship supports prosperity, care, and shared future growth.'],
      si: ['මහේන්ද්‍ර පොරොන්දම (දිගුකාලීන සමෘද්ධිය)', 'මේ සබඳතාව සමෘද්ධිය ගෙනදීම සහ එකට ඉදිරියට යෑමට සහාය දෙනවද කියලා පෙන්වනවා.'],
    },
  };
  var fallback = language === 'si' ? [name + ' පොරොන්දම', 'මේ කොටස සබඳතාවේ ප්‍රායෝගික ගැළපීම පෙන්වනවා.'] : [name + ' Porondam', 'This part shows a practical relationship compatibility signal.'];
  var selected = copies[name] ? copies[name][language === 'si' ? 'si' : 'en'] : fallback;
  return { label: selected[0], desc: selected[1] };
}

function getRelationshipChallengeCopy(item, language) {
  var severity = item && item.severity ? String(item.severity).toLowerCase() : '';
  var name = item && item.name ? String(item.name).toLowerCase() : '';

  // Map dosha names to plain-language relationship labels + descriptions
  var challengeMap = {
    mangal: {
      si: { label: 'චර්යාව හා කෝපය පාලනය', desc: 'එක් අයකුගේ තීව්‍ර ශක්තිය නිසා ඉක්මනින් කේන්ති ගැනීම හෝ ආධිපත්‍ය පැවරීම විය හැක. ඉවසීමෙන් කතා කිරීම වැදගත්.' },
      en: { label: 'Temperament & Anger Control', desc: 'One partner may have intense energy leading to quick reactions or dominance. Patient communication is key.' },
    },
    kaal: {
      si: { label: 'ජීවිතයේ හදිසි මාරු', desc: 'ජීවිතයේ අනපේක්ෂිත වෙනස්කම් එකින් එක පැමිණිය හැක. එකිනෙකා සවිමත්ව රැඳී සිටීම වැදගත්.' },
      en: { label: 'Sudden Life Shifts', desc: 'Life may bring unexpected changes one after another. Staying resilient together is important.' },
    },
    sade: {
      si: { label: 'ජීවිතයේ අභියෝගකාරී කාල පරිච්ඡේදය', desc: 'දැනට අභියෝගකාරී කාලයක ගමන් කරමින් සිටී. අන්‍යෝන්‍ය උදව් හා ඉවසීම ඉතා වැදගත්.' },
      en: { label: 'Challenging Life Phase', desc: 'Currently going through a demanding period. Mutual support and patience are crucial.' },
    },
    pitru: {
      si: { label: 'පවුල් රටා හා උරුමය', desc: 'පවුලේ පරම්පරාවෙන් ආ සබඳතා රටා බලපෑම් කළ හැක. අලුත් පුරුදු ගොඩනගා ගැනීම හොඳයි.' },
      en: { label: 'Family Patterns & Legacy', desc: 'Inherited family relationship patterns may influence the bond. Building new habits together helps.' },
    },
    grahan: {
      si: { label: 'මානසික පීඩනය හා අවිනිශ්චිතභාවය', desc: 'සිතේ ව්‍යාකූලත්වය හෝ තීරණ ගැනීමේ දුෂ්කරතා ඇති විය හැක. පැහැදිලි සන්නිවේදනය අත්‍යවශ්‍යයි.' },
      en: { label: 'Mental Pressure & Confusion', desc: 'There may be confusion or difficulty making decisions together. Clear communication is essential.' },
    },
    shrapit: {
      si: { label: 'පැරණි හැඟීම්මය බැමි', desc: 'අතීත සබඳතා අත්දැකීම් නිසා පැවරෙන බිය හෝ විශ්වාස ගැටලු විය හැක. අලුත් ආරම්භයක් ගොඩනගන්න.' },
      en: { label: 'Emotional Baggage from the Past', desc: 'Past relationship experiences may carry fear or trust issues. Focus on building a fresh start.' },
    },
    guru: {
      si: { label: 'විවේකය හා නුවණ යොදා ගැනීම', desc: 'සමහරවිට නොමේරූ තීරණ ගැනීමට නැඹුරුවක් ඇත. වැදගත් කරුණු ගැන හිතාමතා සාකච්ඡා කරන්න.' },
      en: { label: 'Wisdom & Judgement', desc: 'There may be a tendency toward impulsive decisions. Important matters need deliberate discussion.' },
    },
    kemdrum: {
      si: { label: 'තනිකම හා හැඟීම්මය හුදෙකලාව', desc: 'එක් පාර්ශවයකට හැඟීම්මය වශයෙන් හුදෙකලා වූ හැඟීමක් ඇති විය හැක. සැලකිල්ල ප්‍රකාශ කිරීම අමතක නොකරන්න.' },
      en: { label: 'Emotional Isolation', desc: 'One partner may sometimes feel emotionally alone. Regularly expressing care is vital.' },
    },
  };

  // Find matching challenge by key
  var matchedKey = Object.keys(challengeMap).find(function(k) { return name.indexOf(k) !== -1; });
  var mapped = matchedKey ? challengeMap[matchedKey] : null;

  if (item && item.cancelled) {
    if (language === 'si') {
      return {
        label: mapped ? mapped.si.label + ' — නිවාරණය වී ඇත' : 'සැලකිල්ල අඩු වූ කරුණ',
        desc: 'මේ බලපෑම සැලකිය යුතු ලෙස අඩු වී ඇත. සාමාන්‍ය සැලකිල්ලෙන් ප්‍රමාණවත්.',
      };
    }
    return {
      label: mapped ? mapped.en.label + ' — Resolved' : 'Reduced Care Point',
      desc: 'This influence has been significantly reduced. Normal care is sufficient.',
    };
  }

  if (mapped) {
    return language === 'si' ? mapped.si : mapped.en;
  }

  // Fallback for unmapped dosha types
  if (language === 'si') {
    return {
      label: severity.indexOf('severe') !== -1 ? 'වැඩි සැලකිල්ලක් අවශ්‍ය කරුණ' : 'සබඳතාවේ සැලකිලිමත් කරුණ',
      desc: 'මේක සබඳතාවේ ඉවසීම, විශ්වාසය, සහ තීරණ ගැනීමේදී වැඩි සැලකිල්ලක් ඕනේ කියලා පෙන්වනවා.',
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
      si: { label: 'නායකත්ව ශක්තිය හා ජීවිත සාර්ථකත්වය', meta: 'බලපෑම: ' + (strength || 'සාමාන්‍ය') },
      en: { label: 'Leadership & Life Success', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'dhana': {
      si: { label: 'මූල්‍ය ස්ථාවරත්වය හා සමෘද්ධිය', meta: 'බලපෑම: ' + (strength || 'සාමාන්‍ය') },
      en: { label: 'Financial Stability & Prosperity', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'gaja kesari': {
      si: { label: 'බුද්ධිය, කීර්තිය හා සම්මානය', meta: 'බලපෑම: ' + (strength || 'සාමාන්‍ය') },
      en: { label: 'Wisdom, Fame & Respect', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'neechabhanga': {
      si: { label: 'අභියෝග බවට පත් කර ගත් ශක්තිය', meta: 'බලපෑම: ' + (strength || 'සාමාන්‍ය') },
      en: { label: 'Strength Forged from Challenges', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'chandra': {
      si: { label: 'හැඟීම්මය ශක්තිය හා දැඩි අධිෂ්ඨානය', meta: 'බලපෑම: ' + (strength || 'සාමාන්‍ය') },
      en: { label: 'Emotional Strength & Determination', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'saraswati': {
      si: { label: 'ඥාණය, කලා කුසලතා හා ඉගෙනීමේ හැකියාව', meta: 'බලපෑම: ' + (strength || 'සාමාන්‍ය') },
      en: { label: 'Knowledge, Creativity & Learning', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'lakshmi': {
      si: { label: 'භෞතික සමෘද්ධිය හා සැපවත් ජීවිතය', meta: 'බලපෑම: ' + (strength || 'සාමාන්‍ය') },
      en: { label: 'Material Abundance & Comfortable Life', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'viparita': {
      si: { label: 'අපහසුතා මැද ජයග්‍රහණය', meta: 'බලපෑම: ' + (strength || 'සාමාන්‍ය') },
      en: { label: 'Victory Through Adversity', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'sunapha': {
      si: { label: 'ස්වාධීනත්වය හා දක්ෂතාව', meta: 'බලපෑම: ' + (strength || 'සාමාන්‍ය') },
      en: { label: 'Self-Reliance & Skill', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'anapha': {
      si: { label: 'ආත්ම විශ්වාසය හා සමාජ බලය', meta: 'බලපෑම: ' + (strength || 'සාමාන්‍ය') },
      en: { label: 'Self-Confidence & Social Influence', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'durudhura': {
      si: { label: 'සෑම ක්ෂේත්‍රයකම සමබර සාර්ථකත්වය', meta: 'බලපෑම: ' + (strength || 'සාමාන්‍ය') },
      en: { label: 'Balanced Success in All Areas', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'adhi': {
      si: { label: 'ස්වභාවික නායකත්වය හා බලධාරිත්වය', meta: 'බලපෑම: ' + (strength || 'සාමාන්‍ය') },
      en: { label: 'Natural Leadership & Authority', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'amala': {
      si: { label: 'පිරිසිදු කීර්තිය හා හොඳ නමක්', meta: 'බලපෑම: ' + (strength || 'සාමාන්‍ය') },
      en: { label: 'Clean Reputation & Good Name', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'chamara': {
      si: { label: 'විද්‍යාව හා සමාජ ගෞරවය', meta: 'බලපෑම: ' + (strength || 'සාමාන්‍ය') },
      en: { label: 'Education & Social Respect', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'parvata': {
      si: { label: 'දිගුකාලීන ස්ථාවරත්වය හා ආරක්ෂාව', meta: 'බලපෑම: ' + (strength || 'සාමාන්‍ය') },
      en: { label: 'Long-term Stability & Security', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'malavya': {
      si: { label: 'ආදර හැකියාව හා කලාත්මක සංවේදීතාව', meta: 'බලපෑම: ' + (strength || 'සාමාන්‍ය') },
      en: { label: 'Capacity for Love & Artistic Sensitivity', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'kahala': {
      si: { label: 'ධෛර්යය හා බාධක ජය ගැනීම', meta: 'බලපෑම: ' + (strength || 'සාමාන්‍ය') },
      en: { label: 'Courage & Overcoming Obstacles', meta: 'Influence: ' + (strength || 'Moderate') },
    },
    'dharma': {
      si: { label: 'යහපත් ජීවන මාර්ගය හා වෘත්තීය සාර්ථකත්වය', meta: 'බලපෑම: ' + (strength || 'සාමාන්‍ය') },
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
      ? { label: 'නායකත්ව හා බල ශක්තිය', meta: 'බලපෑම: ' + (strength || 'සාමාන්‍ය') }
      : { label: 'Leadership & Power Strength', meta: 'Influence: ' + (strength || 'Moderate') };
  }
  if (category.indexOf('dhana') !== -1 || category.indexOf('wealth') !== -1) {
    return language === 'si'
      ? { label: 'මූල්‍ය හා සම්පත් ශක්තිය', meta: 'බලපෑම: ' + (strength || 'සාමාන්‍ය') }
      : { label: 'Financial & Resource Strength', meta: 'Influence: ' + (strength || 'Moderate') };
  }
  if (category.indexOf('lunar') !== -1 || category.indexOf('moon') !== -1) {
    return language === 'si'
      ? { label: 'හැඟීම්මය ශක්තිය හා අනුවර්තනය', meta: 'බලපෑම: ' + (strength || 'සාමාන්‍ය') }
      : { label: 'Emotional Strength & Adaptability', meta: 'Influence: ' + (strength || 'Moderate') };
  }

  // Generic fallback
  if (language === 'si') {
    return { label: 'සබඳතාවට සහාය දෙන ශක්තිය', meta: 'බලපෑම: ' + (strength || 'සාමාන්‍ය') };
  }
  return { label: 'Relationship Support Strength', meta: 'Influence: ' + (strength || 'Moderate') };
}

function getPlainSupportLevel(score, maxScore, language) {
  var max = maxScore || 1;
  var ratio = score / max;
  if (language === 'si') {
    if (ratio >= 0.7) return 'ශක්තිමත් සහාය';
    if (ratio >= 0.45) return 'මිශ්‍ර සහාය';
    return 'වැඩි සැලකිල්ලක් අවශ්‍යයි';
  }
  if (ratio >= 0.7) return 'Strong Support';
  if (ratio >= 0.45) return 'Mixed Support';
  return 'Needs Extra Care';
}

function getCoreDriveCopy(planet, language) {
  var key = String(planet || '').toLowerCase();
  var map = {
    sun: ['Confident Direction', 'විශ්වාසමත් දිශාව'], moon: ['Care & Emotional Safety', 'සැලකිල්ල සහ හැඟීම් ආරක්ෂාව'],
    mars: ['Action & Courage', 'ක්‍රියාශීලීත්වය සහ ధෛර්යය'], mercury: ['Communication & Learning', 'කතාබහ සහ ඉගෙනීම'],
    jupiter: ['Growth & Wisdom', 'වර්ධනය සහ බුද්ධිය'], venus: ['Harmony & Affection', 'සමගිය සහ ආදර හැඟීම'],
    saturn: ['Patience & Commitment', 'ඉවසීම සහ කැපවීම'], rahu: ['New Growth Lessons', 'නව වර්ධන පාඩම්'], ketu: ['Inner Freedom', 'අභ්‍යන්තර නිදහස'],
  };
  var selected = map[key];
  if (!selected) return language === 'si' ? 'පුද්ගලික ධාවකය' : 'Personal Drive';
  return language === 'si' ? selected[1] : selected[0];
}

function getRelationshipStyleCopy(sign, language) {
  var key = String(sign || '').toLowerCase();
  var fire = /aries|leo|sagittarius/.test(key);
  var earth = /taurus|virgo|capricorn/.test(key);
  var air = /gemini|libra|aquarius/.test(key);
  var water = /cancer|scorpio|pisces/.test(key);
  if (language === 'si') {
    if (fire) return 'නිර්භීත සහ සෘජු රටාව';
    if (earth) return 'ස්ථිර සහ ප්‍රායෝගික රටාව';
    if (air) return 'කතාබහට සහ අදහස්වලට ගැළපෙන රටාව';
    if (water) return 'හැඟීම් සහ සැලකිල්ල පදනම් වූ රටාව';
    return 'පුද්ගලික කැපවීම් රටාව';
  }
  if (fire) return 'Bold & Direct Style';
  if (earth) return 'Steady & Practical Style';
  if (air) return 'Communicative Style';
  if (water) return 'Emotional & Caring Style';
  return 'Personal Commitment Style';
}

function getLifePeriodCopy(period, language) {
  if (language === 'si') return period && period.isBeneficPeriod ? 'සහාය දෙන ජීවිත අදියර' : 'වැඩි සැලකිල්ලක් අවශ්‍ය අදියර';
  return period && period.isBeneficPeriod ? 'Supportive Life Period' : 'Careful Life Period';
}

function getAdvancedSectionDescription(kind, data, language) {
  var isSi = language === 'si';
  if (kind === 'lifePhase') {
    var harmony = String(data && data.harmony || '').toLowerCase();
    if (harmony === 'harmonious') return isSi ? 'දෙදෙනාගේ වර්තමාන ජීවිත අදියර එකිනෙකාට සහාය දෙන බව පෙන්වනවා. තීරණ සහ සැලසුම් එකට කරන්න හොඳයි.' : 'Both current life periods look supportive together. Shared plans and steady decisions are favored.';
    if (harmony === 'conflicting') return isSi ? 'වර්තමාන ජීවිත රටා ටිකක් වෙනස් විය හැක. ඉක්මන් තීරණ වලට පෙර කතාබහ සහ ඉවසීම වැදගත්.' : 'The current life rhythms may feel different. Use patience and clear conversations before major decisions.';
    return isSi ? 'මේ අදියර මිශ්‍ර සහායක් පෙන්වනවා. කාලය, වැඩ බර, සහ පවුල් තීරණ පැහැදිලිව සකසන්න.' : 'This period shows mixed support. Keep timing, workload, and family decisions clear.';
  }
  if (kind === 'deepBond') {
    return isSi ? 'මේක දිගුකාලීන බැඳීම, ඇතුළත පහසුව, සහ එකට ජීවත් වීමේ රටාව ගැන ප්‍රායෝගික කියවීමකි.' : 'This reads long-term bond, inner comfort, and how the couple may settle into shared life.';
  }
  if (kind === 'carePoint') {
    var severity = String(data && data.severity || '').toLowerCase();
    if (severity === 'none' || severity === 'cancelled') return isSi ? 'මේ කොටසින් දැඩි පීඩනයක් නොපෙනේ. සාමාන්‍ය සැලකිල්ල සහ හොඳ කතාබහ තබාගන්න.' : 'This area does not show strong pressure. Keep normal care and healthy communication.';
    if (severity === 'mild') return isSi ? 'කුඩා ගැටුම් ඇති විය හැකි නිසා, තීරණ ගැනීමේදී ඉවසීම සහ කතාබහ වැදගත්.' : 'Small friction is possible, so patient decisions and open conversations matter.';
    return isSi ? 'මේ කොටස වැඩි සැලකිල්ලක් ඉල්ලයි. ඉක්මන් තීරණ, කෝපයෙන් කතා කිරීම, සහ බලහත්කාරයෙන් වෙනස් කිරීම් වලින් වැළකෙන්න.' : 'This area asks for extra care. Avoid rushed decisions, angry conversations, and forcing change.';
  }
  return isSi ? 'මේ කොටස සබඳතාවයේ දිගුකාලීන සහාය සහ වැඩි සැලකිල්ල අවශ්‍ය ප්‍රදේශ පෙන්වනවා.' : 'This section shows long-term relationship support and areas that need care.';
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

  var sealSize = Math.min(W - (WIDE ? 116 : 44), WIDE ? 340 : 300);
  var zodiacSize = Math.max(23, sealSize * 0.085);
  var zodiacRadius = sealSize * 0.41;
  var partnerRadiusX = sealSize * 0.255;
  var partnerRadiusY = sealSize * 0.12;
  var activeSignal = Math.min(PORONDAM_SIGNAL_TRACK.length - 1, Math.floor((stageIndex / Math.max(1, stages.length - 1)) * PORONDAM_SIGNAL_TRACK.length));
  var progressPct = ((stageIndex + 1) / stages.length) * 100;
  var stage = stages[stageIndex];
  var brideLabel = brideName && String(brideName).trim() ? String(brideName).trim() : (lang === 'si' ? 'මනාලිය' : 'Bride');
  var groomLabel = groomName && String(groomName).trim() ? String(groomName).trim() : (lang === 'si' ? 'මනාලයා' : 'Groom');
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
        <Text style={lsStyles.kickerText}>{lang === 'si' ? 'පොරොන්දම් කියවීම' : 'Porondam Reading'}</Text>
      </View>

      <Text style={lsStyles.loadingTitle}>{lang === 'si' ? 'ගැළපීම සකසමින්' : 'Preparing Compatibility'}</Text>

      <View style={lsStyles.nameRail}>
        <View style={[lsStyles.nameCard, { borderColor: 'rgba(249,168,212,0.28)', backgroundColor: 'rgba(249,168,212,0.08)' }]}>
          <Text style={[lsStyles.nameRole, { color: '#F9A8D4' }]}>{lang === 'si' ? 'මනාලිය' : 'Bride'}</Text>
          <Text style={lsStyles.nameText} numberOfLines={1}>{brideLabel}</Text>
        </View>
        <View style={lsStyles.nameBridge}>
          <Ionicons name="heart" size={16} color="#FFB800" />
        </View>
        <View style={[lsStyles.nameCard, { borderColor: 'rgba(147,197,253,0.28)', backgroundColor: 'rgba(147,197,253,0.08)' }]}>
          <Text style={[lsStyles.nameRole, { color: '#93C5FD' }]}>{lang === 'si' ? 'මනාලයා' : 'Groom'}</Text>
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
        <PartnerStar name={brideName} fallback={lang === 'si' ? 'මනාලිය' : 'Bride'} color="#F9A8D4" accent="#EC4899" orbit={partnerOrbit} side={0} radiusX={partnerRadiusX} radiusY={partnerRadiusY} />
        <PartnerStar name={groomName} fallback={lang === 'si' ? 'මනාලයා' : 'Groom'} color="#93C5FD" accent="#3B82F6" orbit={partnerOrbit} side={Math.PI} radiusX={partnerRadiusX} radiusY={partnerRadiusY} />

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
          <Text style={lsStyles.progressLabel}>{lang === 'si' ? 'ගණනය වෙමින්' : 'Calculating'}</Text>
          <Text style={lsStyles.progressCount}>{stageIndex + 1}/{stages.length}</Text>
        </View>
        <View style={lsStyles.progressBar}>
          <LinearGradient colors={['#F9A8D4', '#FFB800', '#60A5FA']}
            style={[lsStyles.progressFill, { width: progressPct + '%' }]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
        </View>
        <Text style={lsStyles.progressHint}>{lang === 'si' ? 'තත්පර කිහිපයක් ගත වේ' : 'This can take a few moments'}</Text>
      </View>
    </Animated.View>
  );
}

var lsStyles = StyleSheet.create({
  loadingScreen: { flex: 1, minHeight: H, alignItems: 'center', justifyContent: 'center', paddingHorizontal: WIDE ? 38 : 12 },
  container: { width: '100%', maxWidth: 520, alignItems: 'center', paddingHorizontal: 18, paddingVertical: WIDE ? 24 : 18 },
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
  textWrap: { width: '100%', minHeight: 108, alignItems: 'center', justifyContent: 'flex-start', marginTop: WIDE ? 10 : 6, marginBottom: 10 },
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
              return getCompatibilityFactorCopy(f.name, language).label;
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
  var copy = getCompatibilityFactorCopy(f.name, language);
  var desc = copy.desc;
  return (
    <Animated.View entering={FadeInUp.delay(100 * index).duration(500)} style={sty.factorItem}>
      <View style={sty.factorTop}>
        <View style={sty.factorNameRow}>
          <View style={[sty.factorDot, { backgroundColor: color, ...boxShadow(color, { width: 0, height: 0 }, 0.8, 4) }]} />
          <Text style={sty.factorName}>{copy.label}</Text>
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
    advancedTitle: '\uD83D\uDD2E Deep Compatibility',
    advancedSub: 'Beyond the 7 signals',
    combinedScore: 'Combined Score',
    dashaTitle: '\uD83C\uDF00 Life Phase Match',
    currentPhase: 'Current Life Period',
    benefic: 'Supportive',
    malefic: 'Needs Care',
    navamshaTitle: '\uD83D\uDC9E Deep Relationship Match',
    mangalaTitle: '\u2694\uFE0F Conflict Care Check',
    marriageStrTitle: '\uD83D\uDC8E Relationship Support Strength',
    venus: 'Affection Support',
    lord7: 'Commitment Support',
    weddingTitle: '\uD83D\uDCC5 Best Wedding Windows',
    noWindows: 'No overlapping favorable window found',
  },
  si: {
    title: '\u0DC3\u0DB6\u0DB3\u0DAD\u0DCF \u0D9C\u0DD0\u0DBD\u0DB4\u0DD3\u0DB8', subtitle: '\u0DC0\u0DD2\u0DC0\u0DCF\u0DC4 \u0D9C\u0DD0\u0DBD\u0DB4\u0DD3\u0DB8\u0DCA \u0DB4\u0DBB\u0DD3\u0D9A\u0DCA\u0DC2\u0DCF\u0DC0',
    bride: '\uD83D\uDC70 \u0DB8\u0DB1\u0DCF\u0DBD\u0DD2\u0DBA', groom: '\uD83E\uDD35 \u0DB8\u0DB1\u0DCF\u0DBD\u0DBA\u0DCF',
    namePh: '\u0DB1\u0DB8 (\u0D85\u0DC0\u0DC1\u0DCA\u200D\u0DBA \u0DB1\u0DB8\u0DCA)',
    yearPh: 'YYYY', monthPh: 'MM', dayPh: 'DD', hourPh: 'HH', minutePh: 'MM',
    date: '\u0D89\u0DB4\u0DB1\u0DCA \u0DAF\u0DD2\u0DB1\u0DBA', time: '\u0DC0\u0DDA\u0DBD\u0DCF\u0DC0',
    birthPlace: '\u0D8B\u0DB4\u0DB1\u0DCA \u0DC3\u0DCA\u0DAE\u0DCF\u0DB1\u0DBA',
    timeHint: '* \u0D89\u0DB4\u0DCA\u0DB4\u0DD0\u0DB1\u0DCA\u0DB1 \u0DB4\u0DAD\u0DCA\u200D\u0DBB\u0DBA\u0DDA \u0DC0\u0DDA\u0DBD\u0DCF\u0DC0 \u0DB6\u0DBD\u0DB1\u0DCA\u0DB1',
    checkBtn: '\uD83D\uDC8D \u0DB4\u0DDC\u0DBB\u0DDC\u0DB1\u0DCA\u0DAF\u0DB8\u0DCA \u0DB6\u0DBD\u0DB1\u0DCA\u0DB1',
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
    advancedTitle: '\uD83D\uDD2E \u0D9C\u0DD0\u0DB9\u0DD4\u0DBB\u0DD4 \u0D9C\u0DD0\u0DBD\u0DB4\u0DD4\u0DB8',
    advancedSub: '\u0DC3\u0DB6\u0DB3\u0DAD\u0DCF \u0DBB\u0DA7\u0DCF 7 \u0D94\u0DB6\u0DCA\u0DB6\u0DA7',
    combinedScore: '\u0D91\u0D9A\u0DCF\u0DB6\u0DAF\u0DCA\u0DB0 \u0DBD\u0D9A\u0DD4\u0DAB\u0DD4',
    dashaTitle: '\uD83C\uDF00 \u0DA2\u0DD3\u0DC0\u0DD2\u0DAD \u0D85\u0DAF\u0DD2\u0DBA\u0DBB \u0D9C\u0DD0\u0DBD\u0DB4\u0DD4\u0DB8',
    currentPhase: '\u0DAF\u0DD0\u0DB1\u0DCA \u0D89\u0DB1\u0DCA\u0DB1 \u0DA2\u0DD3\u0DC0\u0DD2\u0DAD \u0D85\u0DAF\u0DD2\u0DBA\u0DBB',
    benefic: '\u0DC3\u0DC4\u0DCF\u0DBA \u0DAF\u0DD9\u0DBA\u0DD2',
    malefic: '\u0DC0\u0DD0\u0DA9\u0DD2 \u0DC3\u0DD0\u0DBD\u0D9A\u0DD2\u0DBD\u0DCA\u0DBD\u0D9A\u0DCA \u0D95\u0DB1',
    navamshaTitle: '\uD83D\uDC9E \u0D9C\u0DD0\u0DB9\u0DD4\u0DBB\u0DD4 \u0DC3\u0DB6\u0DB3\u0DAD\u0DCF \u0D9C\u0DD0\u0DBD\u0DB4\u0DD3\u0DB8',
    mangalaTitle: '\u2694\uFE0F \u0D9C\u0DD0\u0DA7\u0DD4\u0DB8\u0DCA \u0DC3\u0DD0\u0DBD\u0D9A\u0DD2\u0DBD\u0DCA\u0DBD \u0DB4\u0DBB\u0DD3\u0D9A\u0DCA\u0DC2\u0DCF\u0DC0',
    marriageStrTitle: '\uD83D\uDC8E \u0DC3\u0DB6\u0DB3\u0DAD\u0DCF \u0DC3\u0DC4\u0DCF\u0DBA \u0DC1\u0D9A\u0DCA\u0DAD\u0DD2\u0DBA',
    venus: '\u0D86\u0DAF\u0DBB \u0DC3\u0DC4\u0DCF\u0DBA',
    lord7: '\u0D9A\u0DD0\u0DB4\u0DC0\u0DD3\u0DB8\u0DCA \u0DC3\u0DC4\u0DCF\u0DBA',
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

  // ── Load saved porondam: server-first, AsyncStorage fallback ──
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
                brideCity: DEFAULT_CITY,
                groomDate: r.groom?.birthDate || '',
                groomTime: '',
                groomCity: DEFAULT_CITY,
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
          setBCity(entry.brideCity || DEFAULT_CITY);
          setGDate(d.groom?.birthDate || entry.groomDate || '1998-06-20');
          setGTime(entry.groomTime || '10:00');
          setGCity(entry.groomCity || DEFAULT_CITY);
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
      // Local cached — load directly
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
    }
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

    var brideData = { birthDate: buildDateISO(bDate, bTime), lat: bCity.lat, lng: bCity.lng, name: bName || undefined };
    var groomData = { birthDate: buildDateISO(gDate, gTime), lat: gCity.lat, lng: gCity.lng, name: gName || undefined };
    var entitlementInput = {
      brideBirthDate: brideData.birthDate,
      brideLat: brideData.lat,
      brideLng: brideData.lng,
      groomBirthDate: groomData.birthDate,
      groomLat: groomData.lat,
      groomLng: groomData.lng,
      language: reportLang,
    };

    // ── Check for pending entitlement (retry after failed generation) ──
    var isRetry = false;
    try {
      var entCheck = await api.checkEntitlement('porondam', entitlementInput);
      if (entCheck && entCheck.hasPending) {
        isRetry = true;
        if (__DEV__) console.log('[Porondam] ♻️ Resuming failed generation — no payment needed (' + entCheck.entitlement.retriesLeft + ' retries left)');
      }
    } catch (entErr) {
      // Non-critical — proceed with normal payment flow
      if (__DEV__) console.warn('[Porondam] Entitlement check failed (non-critical):', entErr.message);
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

      var checkRes = await api.checkPorondam(brideData, groomData);
      setData(checkRes.data);
      if (checkRes.porondamId) setPorondamId(checkRes.porondamId);

      // Fire AI report generation (with 1 automatic retry on failure)
      setReportLoading(true);
      var reportRes = null;
      try {
        reportRes = await api.getPorondamReport(checkRes.data, reportLang, bName || undefined, gName || undefined, checkRes.porondamId || undefined, entitlementInput);
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
            reportRes = await api.getPorondamReport(checkRes.data, reportLang, bName || undefined, gName || undefined, checkRes.porondamId || undefined, entitlementInput);
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
        ? '\u0DB4\u0DDC\u0DBB\u0DDC\u0DB1\u0DCA\u0DAF\u0DB8\u0DCA: ' + data.totalScore + '/' + data.maxPossibleScore + ' (' + data.percentage + '%) \u2014 ' + (data.ratingSinhala || data.rating) + '\n\nGrahachara \uD83D\uDC8D'
        : 'Compatibility: ' + data.totalScore + '/' + data.maxPossibleScore + ' (' + data.percentage + '%) \u2014 ' + data.rating + '\n\nGrahachara \uD83D\uDC8D';
      await Share.share({ message: msg });
    } catch (e) {}
  };

  // ── FULL SCREEN LOADING ─────────────────────────────────
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
          <View style={[lsStyles.loadingScreen, !isDesktop && { paddingTop: insets.contentTop, paddingBottom: insets.contentBottom }]}>
            <PorondamCosmicLoader brideName={bName} groomName={gName} language={language} reduced={reduced} lowEnd={lowEnd} />
          </View>
        </View>
      </DesktopScreenWrapper>
    );
  }

  return (
    <DesktopScreenWrapper routeName="porondam">
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <CosmicBackground reduced={reduced} lowEnd={lowEnd} />
      <ScrollView ref={scrollRef} style={sty.flex} contentContainerStyle={[sty.scroll, isDesktop && sty.scrollDesktop, !isDesktop && { paddingTop: insets.contentTop, paddingBottom: insets.contentBottom }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                    var challengeCopy = getRelationshipChallengeCopy(d, language);
                    return (
                      <View key={i} style={sty.doshaItem}>
                        <View style={sty.doshaIcon}><Ionicons name="alert-circle" size={18} color="#f87171" /></View>
                        <View style={{ flex: 1 }}>
                          <Text style={sty.doshaName}>{challengeCopy.label}</Text>
                          <Text style={sty.doshaDesc}>{challengeCopy.desc}</Text>
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
                      <Text style={sty.secTitle}>{'\uD83D\uDD2E'} {language === 'si' ? 'උසස් සබඳතා සැලකිලි' : 'Advanced Challenge Review'}</Text>
                      <Text style={sty.secSub}>{language === 'si' ? 'දෙදෙනාටම වැඩි අවධානය අවශ්‍ය සබඳතා කරුණු' : 'Checking relationship care points for both people'}</Text>
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
                        var challengeCopy = getRelationshipChallengeCopy(d, language);
                        return (
                          <View key={i} style={sty.doshaItem}>
                            <View style={[sty.doshaIcon, { backgroundColor: col + '15' }]}>
                              <Ionicons name={d.cancelled ? 'checkmark-circle' : 'alert-circle'} size={16} color={col} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <Text style={[sty.doshaName, { fontSize: 13, marginBottom: 0 }, d.cancelled && { textDecorationLine: 'line-through', color: 'rgba(255,255,255,0.3)' }]}>{challengeCopy.label}</Text>
                                <View style={{ backgroundColor: col + '25', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                  <Text style={{ color: col, fontSize: 8, fontWeight: '800' }}>{d.cancelled ? (language === 'si' ? '\u0DB1\u0DD2\u0DC0\u0DCF\u0DBB\u0DAB\u0DBA' : 'CANCELLED') : (language === 'si' ? (d.severity === 'Severe' ? '\u0DAF\u0DBB\u0DD4\u0DAB\u0DD4' : d.severity === 'Moderate' ? '\u0DB8\u0DB0\u0DCA\u200D\u0DBA\u0DB8' : '\u0DC3\u0DD4\u0DC5\u0DD4') : d.severity)}</Text>
                                </View>
                              </View>
                              <Text style={sty.doshaDesc}>{challengeCopy.desc}</Text>
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
                      <Text style={[sty.doshaDesc, { color: '#10b981' }]}>{language === 'si' ? 'වැඩි සැලකිල්ලක් අවශ්‍ය කරුණු හමු නොවීය ✅' : 'No major care points found ✅'}</Text>
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
                        var challengeCopy = getRelationshipChallengeCopy(d, language);
                        return (
                          <View key={i} style={sty.doshaItem}>
                            <View style={[sty.doshaIcon, { backgroundColor: col + '15' }]}>
                              <Ionicons name={d.cancelled ? 'checkmark-circle' : 'alert-circle'} size={16} color={col} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <Text style={[sty.doshaName, { fontSize: 13, marginBottom: 0 }, d.cancelled && { textDecorationLine: 'line-through', color: 'rgba(255,255,255,0.3)' }]}>{challengeCopy.label}</Text>
                                <View style={{ backgroundColor: col + '25', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                  <Text style={{ color: col, fontSize: 8, fontWeight: '800' }}>{d.cancelled ? (language === 'si' ? '\u0DB1\u0DD2\u0DC0\u0DCF\u0DBB\u0DAB\u0DBA' : 'CANCELLED') : (language === 'si' ? (d.severity === 'Severe' ? '\u0DAF\u0DBB\u0DD4\u0DAB\u0DD4' : d.severity === 'Moderate' ? '\u0DB8\u0DB0\u0DCA\u200D\u0DBA\u0DB8' : '\u0DC3\u0DD4\u0DC5\u0DD4') : d.severity)}</Text>
                                </View>
                              </View>
                              <Text style={sty.doshaDesc}>{challengeCopy.desc}</Text>
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
                      <Text style={[sty.doshaDesc, { color: '#10b981' }]}>{language === 'si' ? 'වැඩි සැලකිල්ලක් අවශ්‍ය කරුණු හමු නොවීය ✅' : 'No major care points found ✅'}</Text>
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
                      <Text style={sty.secTitle}>{'\u2728'} {language === 'si' ? 'ශක්ති සංසන්දනය' : 'Strengths Comparison'}</Text>
                      <Text style={sty.secSub}>{language === 'si' ? 'දෙදෙනාගේම සබඳතාවට සහාය දෙන ශක්ති' : 'Helpful strengths in both charts'}</Text>
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
                          var strengthColor = y.strength === 'Very Strong' ? '#34d399' : y.strength === 'Strong' ? '#60a5fa' : '#a78bfa';
                          var strengthCopy = getRelationshipStrengthCopy(y, language);
                          return (
                            <View key={yi} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10, paddingLeft: 4, paddingVertical: 4, backgroundColor: catColor + '08', borderRadius: 8, paddingHorizontal: 8 }}>
                              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: catColor + '20', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: catColor }} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: '#FFE8B0', fontSize: 13, fontWeight: '700' }}>{strengthCopy.label}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                  <View style={{ backgroundColor: strengthColor + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                    <Text style={{ color: strengthColor, fontSize: 9, fontWeight: '800' }}>{y.strength || (language === 'si' ? 'සාමාන්‍ය' : 'Moderate')}</Text>
                                  </View>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                        {person.yogas.length > 6 && (
                          <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontStyle: 'italic', paddingLeft: 20 }}>
                            + {person.yogas.length - 6} {language === 'si' ? 'තවත් ශක්ති' : 'more strengths'}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </Glass>
              </Animated.View>
            )}

            {/* Deep relationship signal */}
            {(data.brideAdvanced?.tier1?.jaimini?.upapadaLagna || data.groomAdvanced?.tier1?.jaimini?.upapadaLagna) && (
              <Animated.View entering={FadeInUp.delay(980).duration(700)}>
                <Glass style={sty.section}>
                  <View style={sty.secHeader}>
                    <View>
                      <Text style={sty.secTitle}>{'\uD83E\uDDED'} {language === 'si' ? 'ගැඹුරු සබඳතා දිශාව' : 'Deep Relationship Direction'}</Text>
                      <Text style={sty.secSub}>{language === 'si' ? 'කැපවීම, අභ්‍යන්තර ධාවකය, සහ එකට ජීවත්වීමේ රටාව' : 'Commitment style, inner drive, and shared-life rhythm'}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {data.brideAdvanced?.tier1?.jaimini && (
                      <View style={{ flex: 1, backgroundColor: 'rgba(249,168,212,0.06)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(249,168,212,0.12)' }}>
                        <Text style={{ color: '#f9a8d4', fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                          {'\uD83D\uDC70'} {bName || (language === 'si' ? '\u0DB8\u0DB1\u0DCF\u0DBD\u0DD2\u0DBA' : 'Bride')}
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 2 }}>{language === 'si' ? 'අභ්‍යන්තර ධාවකය' : 'Core Drive'}</Text>
                        <Text style={{ color: '#FFE8B0', fontSize: 14, fontWeight: '700', marginBottom: 6 }}>{getCoreDriveCopy(data.brideAdvanced.tier1.jaimini.atmakaraka?.planet, language)}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 2 }}>{language === 'si' ? 'කැපවීම් රටාව' : 'Commitment Style'}</Text>
                        <Text style={{ color: '#FFE8B0', fontSize: 14, fontWeight: '700' }}>{getRelationshipStyleCopy(data.brideAdvanced.tier1.jaimini.upapadaLagna?.rashi, language)}</Text>
                      </View>
                    )}
                    {data.groomAdvanced?.tier1?.jaimini && (
                      <View style={{ flex: 1, backgroundColor: 'rgba(147,197,253,0.06)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(147,197,253,0.12)' }}>
                        <Text style={{ color: '#93c5fd', fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                          {'\uD83E\uDD35'} {gName || (language === 'si' ? '\u0DB8\u0DB1\u0DCF\u0DBD\u0DBA\u0DCF' : 'Groom')}
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 2 }}>{language === 'si' ? 'අභ්‍යන්තර ධාවකය' : 'Core Drive'}</Text>
                        <Text style={{ color: '#FFE8B0', fontSize: 14, fontWeight: '700', marginBottom: 6 }}>{getCoreDriveCopy(data.groomAdvanced.tier1.jaimini.atmakaraka?.planet, language)}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 2 }}>{language === 'si' ? 'කැපවීම් රටාව' : 'Commitment Style'}</Text>
                        <Text style={{ color: '#FFE8B0', fontSize: 14, fontWeight: '700' }}>{getRelationshipStyleCopy(data.groomAdvanced.tier1.jaimini.upapadaLagna?.rashi, language)}</Text>
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

            {/* Life phase compatibility */}
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
                          <Text style={{ color: '#FFE8B0', fontSize: 16, fontWeight: '800', marginBottom: 4 }}>{getLifePeriodCopy(p.dasha, language)}</Text>
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
                    {getAdvancedSectionDescription('lifePhase', data.advancedPorondam.advanced.dashaCompatibility, language)}
                  </Text>
                </Glass>
              </Animated.View>
            )}

            {/* Deep relationship compatibility */}
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
                      <Text style={{ color: '#f9a8d4', fontSize: 10, fontWeight: '700' }}>{'\uD83D\uDC70'} {language === 'si' ? 'ඇතුළත සබඳතා රටාව' : 'Inner Bond Pattern'}</Text>
                      <Text style={{ color: '#FFE8B0', fontSize: 15, fontWeight: '800', marginTop: 4 }}>{getPlainSupportLevel(data.advancedPorondam.advanced.navamshaCompatibility.score, data.advancedPorondam.advanced.navamshaCompatibility.maxScore, language)}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center', padding: 10, backgroundColor: 'rgba(147,197,253,0.06)', borderRadius: 12 }}>
                      <Text style={{ color: '#93c5fd', fontSize: 10, fontWeight: '700' }}>{'\uD83E\uDD35'} {language === 'si' ? 'ඇතුළත සබඳතා රටාව' : 'Inner Bond Pattern'}</Text>
                      <Text style={{ color: '#FFE8B0', fontSize: 15, fontWeight: '800', marginTop: 4 }}>{getPlainSupportLevel(data.advancedPorondam.advanced.navamshaCompatibility.score, data.advancedPorondam.advanced.navamshaCompatibility.maxScore, language)}</Text>
                    </View>
                  </View>
                  {[getAdvancedSectionDescription('deepBond', data.advancedPorondam.advanced.navamshaCompatibility, language)].map(function(insight, i) {
                    return (
                      <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 6, paddingLeft: 4 }}>
                        <Text style={{ color: '#FF8C00', fontSize: 12 }}>{'\u2728'}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, flex: 1, lineHeight: 18 }}>{insight}</Text>
                      </View>
                    );
                  })}
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 6, fontStyle: 'italic' }}>
                    {getAdvancedSectionDescription('deepBond', data.advancedPorondam.advanced.navamshaCompatibility, language)}
                  </Text>
                </Glass>
              </Animated.View>
            )}

            {/* Conflict care cross-check */}
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
                                ? (p.mars.cancelled ? (language === 'si' ? 'අඩු වූ සැලකිලිමත් කරුණ' : 'Reduced Care Point') : (language === 'si' ? 'වැඩි සැලකිලිමත් කරුණ' : 'High-Care Point'))
                                : (language === 'si' ? 'මේ කොටස හොඳින් සහාය දෙනවා' : 'This area looks supportive')}
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
                    {getAdvancedSectionDescription('carePoint', data.advancedPorondam.advanced.mangalaDosha, language)}
                  </Text>
                </Glass>
              </Animated.View>
            )}

            {/* Relationship support strength */}
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
                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700' }}>{T.lord7}</Text>
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
                    {language === 'si' ? 'ආදරය පෙන්වීම, කැපවීම, සහ දිගුකාලීන සම්බන්ධතා පවත්වා ගැනීමට ලැබෙන සහාය මෙතනින් පෙන්වනවා.' : 'This shows support for affection, commitment, and maintaining the relationship over time.'}
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
                {!report && !reportLoading && (
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontStyle: 'italic' }}>
                    {language === 'si' ? 'වාර්තාව ලබා ගත නොහැකි විය.' : 'Report not available.'}
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
