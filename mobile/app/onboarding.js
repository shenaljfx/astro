/**
 * Onboarding — Cinematic Story Funnel (v3, drawn-elements edition)
 *
 * A conversion-first, story-driven flow built from ISOLATED DRAWN ART
 * ELEMENTS (transparent Diffui cutouts + the website's logo/zodiac/planets),
 * floated and faded over a clean near-black sky — no painted backgrounds.
 * All motion stays code-driven (reanimated); all text stays RN <Text> —
 * never baked into images (Sinhala-safe). Elements + prompts:
 * assets/onboarding/index.js + docs/onboarding-art/manifest.md.
 *
 * Chapters:
 *   language → name → story → date → time → place
 *   → casting (server computes real chart — no AI, instant)
 *   → identity (free reveal: lagna / nakshatra / current dasha)
 *   → chart → future (cliffhanger: locked windows with REAL dates)
 *   → signin ("save your reading") → complete    [no paywall in-funnel]
 *
 * Previous code-drawn version lives in git history (this file's own log).
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Platform,
  Dimensions, KeyboardAvoidingView, ScrollView, StatusBar, Image, Linking, Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn, FadeOut, FadeInDown, FadeInUp,
  useSharedValue, useAnimatedStyle, useAnimatedProps, withRepeat, withTiming,
  withSpring, withDelay, withSequence, interpolate, Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Rect, G, Defs, RadialGradient, Stop, Path, Line as SvgLine, Text as SvgText, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import useReducedMotion from '../hooks/useReducedMotion';
import SpringPressable from '../components/effects/SpringPressable';
import CosmicLoader from '../components/effects/CosmicLoader';
import CitySearchPicker from '../components/CitySearchPicker';
import SriLankanChart from '../components/SriLankanChart';
import { getOnboardingReveal } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import useResponsive from '../hooks/useResponsive';
import { boxShadow, textShadow } from '../utils/shadow';
import { ZODIAC_IMAGE_MAP } from '../components/ZodiacIcons';
import { ELEMENTS, DOMAIN_CARD_ART, COSMOS_ZODIAC, ZODIAC_ORDERED, SCENE_MYSTIC, BEAT_ART } from '../assets/onboarding';
import Glyph from '../components/GlyphIcon';

var { width: SW, height: SH } = Dimensions.get('window'); // mystic scene build
// a square big enough to cover the screen at any rotation
var SCREEN_DIAG = Math.ceil(Math.sqrt(SW * SW + SH * SH));

export var REVEAL_STORAGE_KEY = 'grahachara_onboarding_reveal';

// ═══════════════════════════════════════════════════════════════════════
//  COPY — every string in English + Sinhala
// ═══════════════════════════════════════════════════════════════════════

var COPY = {
  en: {
    // language chapter
    langTitle: 'Select Language',
    langSub: 'භාෂාව තෝරන්න',
    // story chapter — the sage speaks, addressed by name
    storyBeats: [
      { big: '{name} — right now, nine planets are moving above you.', small: 'They were moving the night you were born too, arranged in a pattern that has never repeated since. The old astrologer has watched that sky his whole life.' },
      { big: 'His books have carried your pattern for centuries.', small: 'Astrologers wrote down what each arrangement means — who you are, what is coming, and when. He is finding your page.' },
      { big: 'He has cut a fresh leaf. It carries your name.', small: 'And above it — your own star pattern, rising off the ink. No other soul carries it. Your chart has just been started.' },
      { big: 'Tonight, {name}, your sky gets read.', small: 'Three questions. Then he begins.' },
    ],
    tapToContinue: 'Tap to continue',
    begin: 'Read my sky',
    // reward moments — instant payoffs after each input
    rewardDateKicker: 'NIGHTS UNDER THIS SKY',
    rewardDateLine: 'nights the sky has turned above you — and it remembers every single one.',
    rewardDateWeekday: 'You arrived on a {weekday}.',
    rewardTimeKicker: 'THE HOUR IS SEALED',
    rewardTimeLine: 'Your rising sign can now be found.',
    rewardTimeUnknownLine: 'Veiled hours are read from midday, as astrologers always have. Your reading holds.',
    weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    // inputs
    nameKicker: 'The beginning',
    nameTitle: 'Before anything — your name.',
    nameSub: 'A reading is never opened nameless. Every word that follows will be addressed to you.',
    namePlaceholder: 'Your first name',
    nameError: 'Please enter at least 2 letters',
    dateTitle: 'The day your sky arranged itself',
    dateSub: 'Your date of birth fixes the planets in place.',
    yearLabel: 'YEAR', dayLabel: 'DAY', monthLabel: 'MONTH',
    yearError: 'Enter a valid year (1900–2026)',
    monthError: 'Select the month',
    dayError: 'Enter a valid day',
    timeTitle: 'The hour you arrived',
    timeSub: 'The exact time sets your Lagna — the sign rising on the horizon.',
    timeError: 'Enter a valid time',
    timeUnknown: 'The hour is veiled — I don’t know it',
    timeUnknownNote: 'The stars still speak when the hour is unknown. We read from midday, as the old astrologers did.',
    placeTitle: 'Under which skies were you born?',
    placeSub: 'Latitude and longitude tilt the whole chart.',
    placeSearch: 'Search your birth city…',
    cityError: 'Select your birth place',
    continueBtn: 'Continue',
    back: 'Back',
    // casting
    castingLines: [
      'Locating the sky over {place}…',
      'Turning back to {date}…',
      'Placing the nine grahas…',
      'Finding your rising sign…',
      'Reading your Vimshottari timeline…',
    ],
    castingDone: 'The reading is complete.',
    castError: 'We couldn’t reach the sky just now — check your connection and try again.',
    // identity
    identityKicker: 'YOUR READING',
    lagnaLabel: 'LAGNA — RISING SIGN',
    nakshatraLabel: 'BIRTH STAR',
    dashaSince: 'This chapter began in {year} and runs until {until}.',
    identityCta: 'Show me my Lagna chart',
    // lagna chart (lagna patha)
    chartKicker: 'YOUR LAGNA PATHA',
    chartTitle: 'The sky, exactly as it stood',
    chartSub: 'Drawn for {place} — {date}. Twelve houses, nine grahas, one moment that will never repeat.',
    chartCta: 'What comes next for me?',
    chartNote: 'This chart is yours to keep — free, forever.',
    // future
    futureKicker: 'YOUR TIMELINE',
    futureTitle: '{name}, your next windows are already dated',
    futureSub: 'These are not horoscopes. They are the actual periods of your Vimshottari timeline, computed from your birth moment.',
    lockedLabel: 'LOCKED',
    freeLabel: 'FREE',
    freeGuidanceKicker: 'THIS WINDOW’S GUIDANCE — FREE',
    futureCta: 'Unlock my full timeline',
    futureFootnote: 'First — sign in so your reading is never lost.',
    // signin
    signinTitle: 'Your reading is ready to be saved',
    signinSub: 'It exists only on this screen. Sign in once and your chart is kept forever.',
    signinBtn: 'Continue with Google',
    signinCard1Title: 'Disappearing soon', signinCard1Desc: 'Unsaved readings are permanently deleted',
    signinCard2Title: 'Save permanently', signinCard2Desc: 'One tap keeps your chart forever',
    trustVerified: 'Google Verified', trustEncrypted: 'Encrypted', trustPrivate: 'Private',
    signinReturningTitle: 'Welcome back',
    signinReturningSub: 'Sign in to access your birth chart & daily predictions',
    // complete
    completeTitle: 'Your sky is saved',
    completeSub: 'Preparing your daily readings…',
  },
  si: {
    langTitle: 'Select Language',
    langSub: 'ඔබට පහසු භාෂාවක් තෝරාගන්න',
    storyBeats: [
      { 
        big: '{name} — මේ මොහොතේත්, විශ්වයේ ග්‍රහලෝක ඔබට ඉහළින් නිහඬව ගමන් කරමින් සිටිනවා.', 
        small: 'ඔබ මෙලොවට බිහිවූ ඒ සුවිශේෂී මොහොතේදීත් අහසේ තරු පෙළගැසුණේ නැවත කිසිදා සිදුනොවන අද්විතීය අයුරින්. දශක ගණනාවක් තිස්සේ අහසේ රහස් කියවූ ප්‍රාඥයෙකු දැන් ඔබ එනතුරු මඟබලා සිටිනවා.' 
      },
      { 
        big: 'සියවස් ගණනාවක සිට, විශ්වයේ ලියැවුණු ඔබේ ඉරණම මේ ඉපැරණි පිටු අතර සැඟව පවතිනවා.', 
        small: 'ඔබ කවුද, ඔබේ ඉදිරි ගමන කුමක්ද යන්න හෙළි කරමින්, අතීත සෘෂිවරුන් සෑම ග්‍රහ පිහිටීමකම සැඟවුණු අරුත සටහන් කර තිබෙනවා. ඔබේ ඉරණම ලියැවුණු ඒ රහස් පිටුවයි දැන් දිගහැරෙන්නේ.' 
      },
      { 
        big: 'ඔබ වෙනුවෙන්ම වෙන්වූ අලුත්ම පුස්කොළ පතක් දැන් සූදානම්... එහි ඉහළින්ම ලියැවෙන්නේ ඔබේ නමයි.', 
        small: 'මෙයින් මතුවන්නේ මුළු විශ්වයේම වෙන කිසිවෙකුටත් හිමි නොවන ඔබේම අනන්‍ය වූ කේන්දර සටහනයි. ඔබේ ජීවන ගමනේ මහා අභිරහස මෙතැන් සිට ආරම්භ වනවා.' 
      },
      { 
        big: '{name}, ඔබේ ඉරණම රැගත් මහා අහස එහි රහස් ඔබට පවසන්නට සූදානම්.', 
        small: 'ඔබ ඉදිරියේ ඇති ප්‍රශ්න තුනකට පමණක් පිළිතුරු ලබාදෙන්න. ඉන්පසු, අහසේ සැඟවුණු ඔබේ ජීවන රහස් කියවීම ආරම්භ වනු ඇත.' 
      },
    ],
    tapToContinue: 'ඉදිරියට යාමට මෙහි ඔබන්න',
    begin: 'මගේ ඉරණම කියවන්න',
    rewardDateKicker: 'මේ අහස යට ගෙවුණු දින ගණන',
    rewardDateLine: 'වරක් ඔබට ඉහළින් අහස භ්‍රමණය වී තිබෙනවා — අහසට ඒ සියල්ල මතකයි.',
    rewardDateWeekday: 'ඔබ උපන්නේ {weekday} දවසකයි.',
    rewardTimeKicker: 'උපන් වේලාව සටහන් විය',
    rewardTimeLine: 'දැන් ඔබේ ලග්නය නිවැරදිව ගණනය කළ හැකියි.',
    rewardTimeUnknownLine: 'උපන් වේලාව නොදන්නා විට, පැරණි ජ්‍යෝතිෂවේදීන් මෙන් අපිත් මධ්‍යාහ්නය යොදාගෙන කේන්දරය සකස් කරනවා.',
    weekdays: ['ඉරිදා', 'සඳුදා', 'අඟහරුවාදා', 'බදාදා', 'බ්‍රහස්පතින්දා', 'සිකුරාදා', 'සෙනසුරාදා'],
    nameKicker: 'ආරම්භය',
    nameTitle: 'මුලින්ම — ඔබේ නම කුමක්ද?',
    nameSub: 'නමක් නොමැතිව පලාපල කියවීම ආරම්භ කළ නොහැක. මෙතැන් සිට ලියැවෙන සෑම වචනයක්ම ඔබ වෙනුවෙන්මයි.',
    namePlaceholder: 'ඔබේ මුල් නම',
    nameError: 'කරුණාකර අවම වශයෙන් අකුරු දෙකක්වත් ඇතුළත් කරන්න',
    dateTitle: 'ඔබ මෙලොවට බිහිවූ දිනය',
    dateSub: 'ඔබ උපන් දිනය මත ග්‍රහ පිහිටීම් සම්පූර්ණයෙන්ම වෙනස් වෙනවා.',
    yearLabel: 'වර්ෂය', 
    dayLabel: 'දිනය', 
    monthLabel: 'මාසය',
    yearError: 'කරුණාකර නිවැරදි වර්ෂයක් ඇතුළත් කරන්න (1900–2026)',
    monthError: 'මාසය තෝරන්න',
    dayError: 'කරුණාකර නිවැරදි දිනයක් ඇතුළත් කරන්න',
    timeTitle: 'ඔබ උපන් වේලාව',
    timeSub: 'ඔබේ ලග්නය තීරණය වන්නේ ඔබ උපන් නිශ්චිත වේලාව අනුවයි.',
    timeError: 'කරුණාකර නිවැරදි වේලාවක් ඇතුළත් කරන්න',
    timeUnknown: 'උපන් වේලාව හරියටම දන්නේ නැහැ',
    timeUnknownNote: 'වේලාව දන්නේ නැති වුණත් කමක් නැහැ. අතීත ජ්‍යෝතිෂවේදීන් මෙන් අපි මධ්‍යාහ්නය පදනම් කරගෙන ඔබේ පලාපල කියවනවා.',
    placeTitle: 'ඔබ උපන් නගරය කුමක්ද?',
    placeSub: 'උපන් ස්ථානය අනුව ඔබේ කේන්දර සටහන සම්පූර්ණයෙන්ම වෙනස් වෙනවා.',
    placeSearch: 'උපන් නගරය සොයන්න…',
    cityError: 'කරුණාකර උපන් නගරය තෝරන්න',
    continueBtn: 'ඉදිරියට',
    back: 'ආපසු',
    castingLines: [
      '{place} ට ඉහළින් එදා පැවති අහස ගණනය කරමින්…',
      '{date} වෙත කාලය ආපසු ගෙන යමින්…',
      'නවග්‍රහයින් ඔවුන්ගේ නිවැරදි ස්ථානවල පිහිටුවමින්…',
      'ඔබේ ලග්නය ගණනය කරමින්…',
      'ඔබේ ජීවන කාලරේඛාව සකසමින්…',
    ],
    castingDone: 'කේන්දරය සෑදීම සම්පූර්ණයි.',
    castError: 'මෙම අවස්ථාවේ අන්තර්ජාලයට සම්බන්ධ වීමට නොහැකි විය — කරුණාකර නැවත උත්සාහ කරන්න.',
    identityKicker: 'ඔබේ ජ්‍යෝතිෂ සටහන',
    lagnaLabel: 'ලග්නය',
    nakshatraLabel: 'උපන් නැකත',
    dashaSince: 'මෙම මහ දශාව ආරම්භ වූයේ {year} දීයි — එය {until} දක්වා පවතිනවා.',
    identityCta: 'මගේ කේන්දර සටහන බලන්න',
    chartKicker: 'ඔබේ කේන්දර සටහන',
    chartTitle: 'ඔබ උපන් මොහොතේ අහස',
    chartSub: '{date} දින {place} දී. නැවත කිසිදා උදා නොවන, ඔබටම ආවේණික වූ ඒ සුවිශේෂී ග්‍රහ පිහිටීමයි.',
    chartCta: 'මගේ අනාගතය කෙබඳුද?',
    chartNote: 'මෙම කේන්දර සටහන සදහටම ඔබට නොමිලේ හිමිවේ.',
    futureKicker: 'ඔබේ අනාගත කාලරේඛාව',
    futureTitle: '{name}, ඔබේ ජීවිතයේ ඉදිරි සුවිශේෂී කාල පරිච්ඡේදයන් දැනටමත් තීරණය වී අවසන්.',
    futureSub: 'මේවා පුවත්පත්වල පළවන සාමාන්‍ය ලග්න පලාපල නොවේ. ඔබ උපන් මොහොත පදනම් කරගෙන සකස් කළ, ඔබේම ජීවිතයේ සැබෑ කාල පරිච්ඡේදයන්‍ ය.',
    lockedLabel: 'අගුළු දමා ඇත',
    freeLabel: 'නොමිලේ',
    freeGuidanceKicker: 'මෙම කාලය සඳහා මඟපෙන්වීම — නොමිලේ',
    futureCta: 'මගේ සම්පූර්ණ කාලරේඛාව විවෘත කරන්න',
    futureFootnote: 'ඔබේ දත්ත සුරක්ෂිත කර ගැනීමට ප්‍රථමයෙන් මෙතැනින් පිවිසෙන්න.',
    signinTitle: 'ඔබේ කේන්දරය සුරක්ෂිත කිරීමට සූදානම්',
    signinSub: 'මෙම තොරතුරු එක් වරක් සුරක්ෂිත කළ පසු, ඔබේ කේන්දරය සදහටම ඔබගේ ගිණුමේ සුරැකෙනවා.',
    signinBtn: 'Google හරහා පිවිසෙන්න',
    signinCard1Title: 'ඉක්මනින් මැකී යයි', 
    signinCard1Desc: 'සුරක්ෂිත නොකළ කේන්දර සටහන් ස්ථිරවම මැකී යනු ඇත',
    signinCard2Title: 'ස්ථිරව සුරක්ෂිත කරන්න', 
    signinCard2Desc: 'එක් වරක් පිවිසීමෙන් කේන්දරය සදහටම සුරකින්න',
    trustVerified: 'Google විසින් තහවුරු කර ඇත', 
    trustEncrypted: 'සම්පූර්ණයෙන් සුරක්ෂිතයි', 
    trustPrivate: 'පෞද්ගලිකත්වය ආරක්ෂිතයි',
    signinReturningTitle: 'නැවතත් සාදරයෙන් පිළිගනිමු',
    signinReturningSub: 'ඔබේ කේන්දරය සහ පලාපල බැලීමට මෙතැනින් පිවිසෙන්න',
    completeTitle: 'ඔබේ කේන්දරය සාර්ථකව සුරැකුණා',
    completeSub: 'ඔබේ දෛනික පලාපල සූදානම් වෙමින් පවතී…',
  }
};

var MONTHS_SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var MONTHS_SHORT_SI = ['ජන', 'පෙබ', 'මාර්', 'අප්‍රේ', 'මැයි', 'ජූනි', 'ජූලි', 'අගෝ', 'සැප්', 'ඔක්', 'නොවැ', 'දෙසැ'];

// ═══════════════════════════════════════════════════════════════════════
//  BACKDROP — persistent starfield + fade curtain
// ═══════════════════════════════════════════════════════════════════════

var STARS = (function () {
  var arr = [];
  for (var i = 0; i < 200; i++) {
    // real skies: overwhelmingly faint pinpricks, a handful of bright stars
    var mag = Math.pow(Math.random(), 2.2); // skewed toward faint
    var tint = i % 9 === 0 ? '#F6E3B0' : (i % 7 === 0 ? '#EFD9A8' : '#FFF2D6');
    arr.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 0.35 + mag * 1.9,
      opacity: 0.16 + mag * 0.78,
      twinkle: mag > 0.45 || i % 4 === 0,
      bloom: mag > 0.6, // the bright ones glow softly
      color: tint,
      layer: i % 3, // parallax depth
    });
  }
  return arr;
})();

// bright 4-point sparkle stars scattered across the sky
var SPARKLES = (function () {
  var arr = [];
  for (var i = 0; i < 9; i++) {
    arr.push({
      x: 4 + Math.random() * 92,
      y: 3 + Math.random() * 72,
      size: 10 + Math.random() * 12,
      delay: Math.random() * 4000,
      period: 2600 + Math.random() * 2600,
      color: i % 3 === 0 ? '#F2D48E' : (i % 3 === 1 ? '#FFEFC2' : '#FFF6DC'),
    });
  }
  return arr;
})();

// dense micro-stars for the Milky Way band
var MILKY_STARS = (function () {
  var arr = [];
  for (var i = 0; i < 90; i++) {
    arr.push({ x: Math.random() * 100, y: Math.random() * 100, s: Math.random() * 1.2 + 0.3, o: Math.random() * 0.45 + 0.1 });
  }
  return arr;
})();

// cosmic dust — cool indigo/violet nebula clouds drifting behind the stars
var COSMIC_DUST = [
  { color: '#4C5FD6', x: -0.22, y: 0.02, size: 0.95, drift: 30, dy: 20, period: 15000, op: 0.2 },
  { color: '#2C6BB8', x: 0.55, y: 0.1, size: 0.8, drift: -26, dy: 16, period: 18000, op: 0.16 },
  { color: '#6D3FA8', x: 0.28, y: 0.32, size: 0.7, drift: 22, dy: -18, period: 21000, op: 0.14 },
  { color: '#2E4C9E', x: 0.6, y: 0.5, size: 0.85, drift: -20, dy: -14, period: 17000, op: 0.15 },
  { color: '#4338CA', x: -0.1, y: 0.46, size: 0.75, drift: 18, dy: 22, period: 23000, op: 0.15 },
];

// Real constellations — coordinates traced from actual star charts.
// Ursa Major (Big Dipper), Cassiopeia's W, Orion with his belt.
var CONSTELLATIONS = [
  {
    name: 'Ursa Major', x: 0.04, y: 0.045, w: 0.44, vb: '0 0 170 110', period: 9000, labelAt: [85, 104],
    stars: [[10, 52, 2.6], [38, 40, 2.4], [62, 36, 2.8], [86, 38, 2.2], [142, 22, 2.8], [148, 58, 2.4], [104, 66, 2.4]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]],
  },
  {
    name: 'Cassiopeia', x: 0.62, y: 0.2, w: 0.34, vb: '0 0 130 88', period: 12000, labelAt: [65, 82],
    stars: [[8, 26, 2.2], [36, 52, 2.6], [64, 22, 3.0], [94, 48, 3.0], [122, 18, 2.6]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  {
    name: 'Orion', x: 0.05, y: 0.3, w: 0.3, vb: '0 0 120 150', period: 11000, labelAt: [60, 145],
    stars: [[86, 18, 3.4], [30, 26, 2.8], [68, 64, 2.4], [58, 72, 2.6], [48, 80, 2.4], [84, 124, 2.6], [26, 116, 3.2]],
    links: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]],
  },
];

// ── Colorful cosmic dust — slow drifting nebula clouds ──
function CosmicCloud({ c }) {
  var t = useSharedValue(0);
  var reduced = useReducedMotion();
  useEffect(function () {
    if (reduced) { t.value = 0.5; return; }
    t.value = withRepeat(withTiming(1, { duration: c.period, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduced]);
  var sz = SW * 1.15 * c.size;
  var style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(t.value, [0, 1], [c.op * 0.55, c.op * 1.35]),
      transform: [
        { translateX: interpolate(t.value, [0, 1], [0, c.drift]) },
        { translateY: interpolate(t.value, [0, 1], [0, c.dy]) },
        { scale: interpolate(t.value, [0, 1], [1, 1.16]) },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: SW * c.x, top: SH * c.y, width: sz, height: sz }, style]}>
      <GlowDisc color={c.color} size={sz} innerOpacity={0.6} />
    </Animated.View>
  );
}

function CosmicDust() {
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {COSMIC_DUST.map(function (c, i) { return <CosmicCloud key={i} c={c} />; })}
    </View>
  );
}

// ── 4-point sparkle star that breathes and slowly rotates ──
function SparkleStar({ s }) {
  var t = useSharedValue(0);
  var reduced = useReducedMotion();
  useEffect(function () {
    if (reduced) { t.value = 0.6; return; }
    t.value = withDelay(s.delay, withRepeat(withTiming(1, { duration: s.period, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduced]);
  var style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(t.value, [0, 1], [0.12, 0.95]),
      transform: [
        { scale: interpolate(t.value, [0, 1], [0.55, 1]) },
        { rotate: interpolate(t.value, [0, 1], [0, 30]) + 'deg' },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: s.x + '%', top: s.y + '%', width: s.size, height: s.size }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 24 24">
        <Path d="M12 0 L13.6 10.4 L24 12 L13.6 13.6 L12 24 L10.4 13.6 L0 12 L10.4 10.4 Z" fill={s.color} opacity="0.92" />
      </Svg>
    </Animated.View>
  );
}

// ── Constellation star: soft bloom halo + bright core — draws (pops) in,
//    then twinkles forever like a real point of light ──
var ATwinkleCircle = Animated.createAnimatedComponent(Circle);
function ConstStar({ cx, cy, r, delay, period, bloomId }) {
  var t = useSharedValue(0);
  var reduced = useReducedMotion();
  useEffect(function () {
    if (reduced) { t.value = 1; return; }
    t.value = withDelay(delay, withSequence(
      withTiming(1.5, { duration: 340, easing: EASE_EXPO }),
      withRepeat(withTiming(0.5, { duration: period || 2400, easing: Easing.inOut(Easing.sin) }), -1, true)
    ));
  }, [reduced]);
  var haloProps = useAnimatedProps(function () {
    return { opacity: Math.min(t.value, 1) };
  });
  var coreProps = useAnimatedProps(function () {
    return { opacity: Math.min(t.value + 0.15, 1), r: r * 0.72 * Math.min(Math.max(t.value, 0.001), 1.4) };
  });
  return (
    <>
      <ATwinkleCircle cx={cx} cy={cy} r={r * 3.8} fill={'url(#' + bloomId + ')'} animatedProps={haloProps} />
      <ATwinkleCircle cx={cx} cy={cy} fill="#FFE9B8" animatedProps={coreProps} />
    </>
  );
}

function ConstellationPattern({ c, ci }) {
  var w = SW * c.w;
  var bloomId = 'constBloom' + ci;
  return (
    <View style={{ position: 'absolute', left: SW * c.x, top: SH * c.y, width: w, aspectRatio: 1 }}>
      <Svg width="100%" height="100%" viewBox={c.vb}>
        <Defs>
          <RadialGradient id={bloomId} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#F5DFA8" stopOpacity="0.72" />
            <Stop offset="42%" stopColor="#E0C070" stopOpacity="0.22" />
            <Stop offset="100%" stopColor="#E0C070" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        {/* fine white chart lines — engraved star atlas */}
        {c.links.map(function (lk, i) {
          var a = c.stars[lk[0]], b = c.stars[lk[1]];
          var len = Math.hypot(b[0] - a[0], b[1] - a[1]) + 6;
          return (
            <DrawStroke
              key={'l' + i}
              d={'M' + a[0] + ',' + a[1] + ' L' + b[0] + ',' + b[1]}
              len={len} delay={800 + i * 260} duration={520}
              stroke="rgba(224,198,140,0.55)" strokeWidth={0.7}
            />
          );
        })}
        {c.stars.map(function (s, i) {
          return <ConstStar key={'s' + i} cx={s[0]} cy={s[1]} r={s[2]} delay={700 + i * 200} period={2200 + i * 300} bloomId={bloomId} />;
        })}
      </Svg>
    </View>
  );
}

// One brilliant star with diffraction spikes, breathing slowly
function FlareStar({ x, y, size }) {
  var pulse = useSharedValue(0);
  var reduced = useReducedMotion();
  useEffect(function () {
    if (reduced) { pulse.value = 0.6; return; }
    pulse.value = withRepeat(withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduced]);
  var style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(pulse.value, [0, 1], [0.5, 1]),
      transform: [{ scale: interpolate(pulse.value, [0, 1], [0.85, 1.15]) }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y, width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <View style={{ position: 'absolute', width: size, height: 1, backgroundColor: 'rgba(232,206,150,0.6)' }} />
      <View style={{ position: 'absolute', width: 1, height: size, backgroundColor: 'rgba(232,206,150,0.6)' }} />
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF6DC', ...boxShadow('#E8C97A', { width: 0, height: 0 }, 0.9, 8) }} />
    </Animated.View>
  );
}

// Parallax drift wrapper — a star layer that slowly breathes sideways
function DriftLayer({ children, range, period }) {
  var t = useSharedValue(0);
  var reduced = useReducedMotion();
  useEffect(function () {
    if (reduced) return;
    t.value = withRepeat(withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduced]);
  var style = useAnimatedStyle(function () {
    return { transform: [{ translateX: interpolate(t.value, [0, 1], [-range, range]) }] };
  });
  return <Animated.View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }, style]}>{children}</Animated.View>;
}

function TwinkleStar({ star, index }) {
  var pulse = useSharedValue(0);
  var reduced = useReducedMotion();
  useEffect(function () {
    if (reduced) return;
    pulse.value = withDelay((index % 14) * 320, withRepeat(withTiming(1, { duration: 1900 + (index % 9) * 340, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduced]);
  var style = useAnimatedStyle(function () {
    return { opacity: interpolate(pulse.value, [0, 1], [star.opacity * 0.3, Math.min(star.opacity * 2.1, 1)]) };
  });
  return (
    <Animated.View
      style={[{
        position: 'absolute', left: star.x + '%', top: star.y + '%',
        width: star.size * 2, height: star.size * 2, borderRadius: star.size,
        backgroundColor: star.color,
      }, star.bloom ? boxShadow(star.color, { width: 0, height: 0 }, 0.9, star.size * 5) : null, style]}
    />
  );
}

// CLEAN SKY — the drawn art elements are the whole show now, so the backdrop
// is stripped to a quiet near-black wash + a soft vignette + a faint drift of
// stars for depth. No painted backgrounds, no busy decoration.
function Starfield() {
  var layers = [[], [], []];
  STARS.forEach(function (s, i) {
    // keep only the faint pinpricks — no blooming/sparkle clutter
    layers[s.layer].push(
      <View
        key={i}
        style={{
          position: 'absolute', left: s.x + '%', top: s.y + '%',
          width: s.size * 1.6, height: s.size * 1.6, borderRadius: s.size,
          backgroundColor: s.color, opacity: s.opacity * 0.6,
        }}
      />
    );
  });

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <LinearGradient
        colors={['#050418', '#070511', '#020107']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }}
      />
      {/* faint drifting star depths — barely-there, just for life */}
      <DriftLayer range={5} period={30000}>{layers[0]}</DriftLayer>
      <DriftLayer range={10} period={22000}>{layers[1]}</DriftLayer>
      <DriftLayer range={16} period={16000}>{layers[2]}</DriftLayer>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  LIVING SKY ENGINE — aurora, embers, and the wandering navagraha
// ═══════════════════════════════════════════════════════════════════════

var EASE_EXPO = Easing.bezier(0.16, 1, 0.3, 1);

// ── Radial glow primitive (SVG radial gradient disc) ──
var GLOW_ID = 0;
function GlowDisc({ color, size, innerOpacity }) {
  var id = useMemo(function () { GLOW_ID += 1; return 'glow' + GLOW_ID; }, []);
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity={String(innerOpacity || 0.55)} />
          <Stop offset="55%" stopColor={color} stopOpacity={String((innerOpacity || 0.55) * 0.33)} />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={'url(#' + id + ')'} />
    </Svg>
  );
}

// ── Chamber glow — warm candle ambience breathing at the base of screens ──
function ChamberGlow() {
  var t = useSharedValue(0);
  var reduced = useReducedMotion();

  useEffect(function () {
    if (reduced) return;
    t.value = withRepeat(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduced]);

  var style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(t.value, [0, 1], [0.5, 0.85]),
      transform: [{ scale: interpolate(t.value, [0, 1], [1, 1.12]) }],
    };
  });

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <Animated.View style={[{ position: 'absolute', bottom: -SW * 0.55, left: -SW * 0.15, width: SW * 1.3, height: SW * 1.3 }, style]}>
        <GlowDisc color="#4A3480" size={SW * 1.3} innerOpacity={0.32} />
      </Animated.View>
      <View style={{ position: 'absolute', top: -SW * 0.4, right: -SW * 0.35, width: SW * 0.9, height: SW * 0.9 }}>
        <GlowDisc color="#4C1D95" size={SW * 0.9} innerOpacity={0.26} />
      </View>
    </View>
  );
}

// ── Embers — gold specks rising like incense sparks ──
var EMBERS = (function () {
  var arr = [];
  for (var i = 0; i < 9; i++) {
    arr.push({
      x: 8 + Math.random() * 84,
      size: 2 + Math.random() * 2.4,
      rise: 90 + Math.random() * 140,
      period: 7000 + Math.random() * 6000,
      delay: Math.random() * 6000,
      sway: 10 + Math.random() * 18,
    });
  }
  return arr;
})();

function Ember({ e }) {
  var t = useSharedValue(0);
  var reduced = useReducedMotion();

  useEffect(function () {
    if (reduced) return;
    t.value = withDelay(e.delay, withRepeat(withTiming(1, { duration: e.period, easing: Easing.linear }), -1, false));
  }, [reduced]);

  var style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(t.value, [0, 0.12, 0.7, 1], [0, 0.85, 0.4, 0]),
      transform: [
        { translateY: interpolate(t.value, [0, 1], [0, -e.rise]) },
        { translateX: interpolate(t.value, [0, 0.5, 1], [0, e.sway, -e.sway * 0.4]) },
      ],
    };
  });

  return (
    <Animated.View
      style={[{
        position: 'absolute', left: e.x + '%', bottom: '6%',
        width: e.size, height: e.size, borderRadius: e.size / 2,
        backgroundColor: '#F2D48E',
        ...boxShadow('#E0B45C', { width: 0, height: 0 }, 0.9, 6),
      }, style]}
    />
  );
}

function EmberField() {
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {EMBERS.map(function (e, i) { return <Ember key={i} e={e} />; })}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  CODEX PRIMITIVES — ink draw-in, the great wheel, the personal sigil
// ═══════════════════════════════════════════════════════════════════════

var AnimatedPath = Animated.createAnimatedComponent(Path);

// Ink stroke that draws itself in (codex style). len must be >= true length.
function DrawStroke({ d, len, delay, duration, stroke, strokeWidth, opacity }) {
  var t = useSharedValue(0);
  var reduced = useReducedMotion();
  useEffect(function () {
    if (reduced) { t.value = 1; return; }
    t.value = 0;
    t.value = withDelay(delay || 0, withTiming(1, { duration: duration || 1200, easing: Easing.bezier(0.45, 0.05, 0.35, 0.95) }));
  }, [d, reduced]);
  var animatedProps = useAnimatedProps(function () {
    return { strokeDashoffset: len * (1 - t.value) };
  });
  return (
    <AnimatedPath
      d={d} fill="none"
      stroke={stroke || '#C9A35A'} strokeWidth={strokeWidth || 1.4}
      strokeLinecap="round" strokeLinejoin="round"
      opacity={opacity || 0.9}
      strokeDasharray={[len, len]}
      animatedProps={animatedProps}
    />
  );
}


// Darkened edges — the candle-lit chamber closes around the screen
function Vignette() {
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="vign" cx="50%" cy="40%" r="75%">
            <Stop offset="0%" stopColor="#000" stopOpacity="0" />
            <Stop offset="62%" stopColor="#000" stopOpacity="0" />
            <Stop offset="100%" stopColor="#050301" stopOpacity="0.72" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#vign)" />
      </Svg>
    </View>
  );
}

// The Great Wheel — a faint codex chart with Roman-numeral houses,
// turning imperceptibly behind the story
var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function GreatWheel({ size, opacity }) {
  var spin = useSharedValue(0);
  var reduced = useReducedMotion();
  useEffect(function () {
    if (reduced) return;
    spin.value = withRepeat(withTiming(360, { duration: 240000, easing: Easing.linear }), -1, false);
  }, [reduced]);
  var style = useAnimatedStyle(function () {
    return { transform: [{ rotate: spin.value + 'deg' }] };
  });
  var C = 300;
  return (
    <Animated.View style={[{ width: size, height: size, opacity: opacity || 0.32 }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 600 600">
        <Circle cx="300" cy="300" r="288" stroke="#E0C992" strokeWidth="1.2" fill="none" opacity="0.7" />
        <Circle cx="300" cy="300" r="270" stroke="#B99F62" strokeWidth="1" fill="none" opacity="0.6" />
        <Circle cx="300" cy="300" r="205" stroke="#B99F62" strokeWidth="1" fill="none" opacity="0.45" />
        {ROMAN.map(function (n, i) {
          var a = (i * 30 - 90) * Math.PI / 180;
          var am = ((i + 0.5) * 30 - 90) * Math.PI / 180;
          return (
            <React.Fragment key={i}>
              <SvgLine
                x1={C + Math.cos(a) * 205} y1={C + Math.sin(a) * 205}
                x2={C + Math.cos(a) * 270} y2={C + Math.sin(a) * 270}
                stroke="#B99F62" strokeWidth="1" opacity="0.5"
              />
              <SvgText
                x={C + Math.cos(am) * 238} y={C + Math.sin(am) * 238 + 5}
                fontSize="15" fill="#B99F62" opacity="0.8" textAnchor="middle" fontWeight="600"
              >
                {n}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </Animated.View>
  );
}

// FNV-1a hash — the same name always casts the same fate
function hashName(str) {
  var h = 2166136261;
  var s = (str || '').toLowerCase();
  for (var i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// The personal sigil — a small constellation no other soul carries,
// generated deterministically from the name and drawn in like ink
function SigilConstellation({ name, width, height, delay, ink }) {
  var pts = useMemo(function () {
    var h = hashName(name || 'traveler');
    var rnd = function () {
      h = Math.imul(h ^ (h >>> 15), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
    var n = 5 + Math.floor(rnd() * 3);
    var arr = [];
    for (var i = 0; i < n; i++) {
      arr.push([12 + rnd() * (150 - 24), 10 + rnd() * (120 - 22), 1.8 + rnd() * 1.8]);
    }
    return arr;
  }, [name]);

  var base = delay || 300;
  return (
    <Svg width={width} height={height} viewBox="0 0 150 120">
      {pts.slice(0, -1).map(function (p, i) {
        var q = pts[i + 1];
        var len = Math.hypot(q[0] - p[0], q[1] - p[1]) + 6;
        return (
          <DrawStroke
            key={'l' + i}
            d={'M' + p[0] + ',' + p[1] + ' L' + q[0] + ',' + q[1]}
            len={len} delay={base + i * 300} duration={500}
            stroke={ink ? 'rgba(58,44,24,0.55)' : 'rgba(232,206,150,0.68)'} strokeWidth={1}
          />
        );
      })}
      {pts.map(function (p, i) {
        return <SigilStar key={'s' + i} cx={p[0]} cy={p[1]} r={p[2]} delay={base - 100 + i * 280} ink={ink} />;
      })}
    </Svg>
  );
}

function SigilStar({ cx, cy, r, delay, ink }) {
  var t = useSharedValue(0);
  var reduced = useReducedMotion();
  useEffect(function () {
    if (reduced) { t.value = 1; return; }
    t.value = withDelay(delay, withSequence(
      withTiming(1.6, { duration: 300, easing: EASE_EXPO }),
      withTiming(1, { duration: 200 })
    ));
  }, [reduced]);
  var animatedProps = useAnimatedProps(function () {
    return { opacity: Math.min(t.value, 1), r: r * Math.max(t.value, 0.001) };
  });
  var ACircle = useMemo(function () { return Animated.createAnimatedComponent(Circle); }, []);
  return <ACircle cx={cx} cy={cy} fill={ink ? '#3A2C18' : '#FFE9B8'} animatedProps={animatedProps} />;
}

// ═══════════════════════════════════════════════════════════════════════
//  PAINTED SCENES — Diffui-generated art (assets/onboarding) brought
//  alive in code: Ken Burns drift, candle flicker, breathing glow.
//  Motion stays 100% reanimated — the paint itself is static.
// ═══════════════════════════════════════════════════════════════════════

// Irregular candle-flicker driver — one shared value lights a whole scene
function useFlicker() {
  var f = useSharedValue(1);
  var reduced = useReducedMotion();
  useEffect(function () {
    if (reduced) { f.value = 0.9; return; }
    f.value = withRepeat(withSequence(
      withTiming(0.78, { duration: 160 }),
      withTiming(1, { duration: 240 }),
      withTiming(0.88, { duration: 110 }),
      withTiming(0.7, { duration: 300 }),
      withTiming(0.97, { duration: 150 }),
      withTiming(0.82, { duration: 210 })
    ), -1, true);
  }, [reduced]);
  return f;
}


// Scene lighting layer whose brightness follows the flicker value
function FlickerGlow({ flicker, size, color, base }) {
  var style = useAnimatedStyle(function () {
    return { opacity: (base || 0.7) * flicker.value };
  });
  return (
    <Animated.View style={style}>
      <GlowDisc color={color || '#F59E0B'} size={size} innerOpacity={0.6} />
    </Animated.View>
  );
}

// ── FloatElement — a single drawn art cutout (transparent PNG) shown as art:
//    fades up, breathes/floats gently, and rests on a soft radial glow that
//    both lights it and absorbs any cutout fringe. This is the whole visual
//    vocabulary now — isolated elements, composed and faded. ──
function FloatElement({
  source, size, w, h, delay, glow, glowColor, glowScale,
  floatRange, floatPeriod, rotate, rotatePeriod, opacity, style,
}) {
  var reduced = useReducedMotion();
  var appear = useSharedValue(0);
  var bob = useSharedValue(0);
  var spin = useSharedValue(0);
  useEffect(function () {
    appear.value = withDelay(delay || 0, withTiming(1, { duration: 1100, easing: EASE_EXPO }));
    if (reduced) { bob.value = 0.5; return; }
    bob.value = withDelay(delay || 0, withRepeat(withTiming(1, { duration: floatPeriod || 5200, easing: Easing.inOut(Easing.sin) }), -1, true));
    if (rotate) spin.value = withRepeat(withTiming(1, { duration: rotatePeriod || 60000, easing: Easing.linear }), -1, false);
  }, [reduced]);
  var fr = floatRange == null ? 9 : floatRange;
  var ew = w || size, eh = h || size;
  var elStyle = useAnimatedStyle(function () {
    return {
      opacity: appear.value * (opacity == null ? 1 : opacity),
      transform: [
        { translateY: interpolate(bob.value, [0, 1], [fr, -fr]) },
        { scale: interpolate(appear.value, [0, 1], [0.86, 1]) },
        { rotate: (rotate ? interpolate(spin.value, [0, 1], [0, 360]) : 0) + 'deg' },
      ],
    };
  });
  var glowStyle = useAnimatedStyle(function () {
    return {
      opacity: appear.value * 0.9,
      transform: [{ translateY: interpolate(bob.value, [0, 1], [fr, -fr]) }, { scale: interpolate(bob.value, [0, 1], [0.96, 1.05]) }],
    };
  });
  var gsz = (glowScale || 1.5) * Math.max(ew, eh);
  return (
    <View pointerEvents="none" style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      {glow !== false ? (
        <Animated.View style={[{ position: 'absolute', width: gsz, height: gsz }, glowStyle]}>
          <GlowDisc color={glowColor || '#E8C97A'} size={gsz} innerOpacity={0.32} />
        </Animated.View>
      ) : null}
      <Animated.View style={elStyle}>
        <Image source={source} style={{ width: ew, height: eh }} resizeMode="contain" fadeDuration={0} />
      </Animated.View>
    </View>
  );
}

// ── PuppetScene — a full layered scene built from separately-generated
//    papercut cutouts, each parallaxing / breathing on its own timeline for
//    an immersive "alive" diorama. Motion is 100% code; every layer is a
//    static painted cutout. ──
function useLoop(period, reduced, mid) {
  var v = useSharedValue(0);
  useEffect(function () {
    if (reduced) { v.value = mid == null ? 0.5 : mid; return; }
    v.value = withRepeat(withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduced]);
  return v;
}

function PuppetScene({ scene, showMystic }) {
  var reduced = useReducedMotion();
  var appear = useSharedValue(0);
  var bg = useLoop(30000, reduced);
  var cb = useLoop(24000, reduced);
  var moon = useLoop(6000, reduced);
  var ca = useLoop(17000, reduced);
  var flo = useLoop(6500, reduced);   // the mystic's slow levitation
  var orb = useLoop(3200, reduced);   // the orb's glow pulse
  var fg = useLoop(20000, reduced);
  useEffect(function () { appear.value = withTiming(1, { duration: 1400, easing: EASE_EXPO }); }, []);

  var bgStyle = useAnimatedStyle(function () {
    return { transform: [{ scale: interpolate(bg.value, [0, 1], [1.06, 1.12]) }, { translateX: interpolate(bg.value, [0, 1], [6, -6]) }, { translateY: interpolate(bg.value, [0, 1], [4, -4]) }] };
  });
  var cbStyle = useAnimatedStyle(function () { return { opacity: appear.value * 0.85, transform: [{ translateX: interpolate(cb.value, [0, 1], [-12, 16]) }, { translateY: interpolate(cb.value, [0, 1], [0, -4]) }] }; });
  var moonStyle = useAnimatedStyle(function () { return { opacity: appear.value, transform: [{ translateY: interpolate(moon.value, [0, 1], [5, -6]) }] }; });
  var moonGlow = useAnimatedStyle(function () { return { opacity: appear.value * interpolate(moon.value, [0, 1], [0.4, 0.8]) }; });
  var caStyle = useAnimatedStyle(function () { return { opacity: appear.value * 0.9, transform: [{ translateX: interpolate(ca.value, [0, 1], [14, -14]) }] }; });
  // the mystic floats — a long, weightless vertical drift (no feet to ground)
  var mysticStyle = useAnimatedStyle(function () { return { opacity: appear.value, transform: [{ translateY: interpolate(flo.value, [0, 1], [8, -8]) }, { scale: interpolate(appear.value, [0, 1], [0.9, 1]) }] }; });
  var haloStyle = useAnimatedStyle(function () { return { opacity: appear.value * interpolate(orb.value, [0, 1], [0.5, 0.95]), transform: [{ translateY: interpolate(flo.value, [0, 1], [8, -8]) }, { scale: interpolate(orb.value, [0, 1], [0.94, 1.08]) }] }; });
  var fgStyle = useAnimatedStyle(function () { return { opacity: appear.value, transform: [{ translateX: interpolate(fg.value, [0, 1], [-6, 6]) }] }; });
  var mW = SW * 0.66, mAr = 896 / 1088;

  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      {/* minimal deep-space sky, very slow drift */}
      <Animated.View style={[StyleSheet.absoluteFill, bgStyle]}>
        <Image source={scene.bg} style={{ width: '100%', height: '100%' }} resizeMode="cover" fadeDuration={0} />
      </Animated.View>
      {/* far cloud (slow) */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: '13%', left: '-10%', width: SW * 0.46 }, cbStyle]}>
        <Image source={scene.cloudB} style={{ width: '100%', height: undefined, aspectRatio: 896 / 512 }} resizeMode="contain" fadeDuration={0} />
      </Animated.View>
      {/* moon + breathing glow (upper right) */}
      <View pointerEvents="none" style={{ position: 'absolute', top: '6%', right: '12%', width: SW * 0.26, height: SW * 0.26, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[{ position: 'absolute', width: SW * 0.5, height: SW * 0.5 }, moonGlow]}>
          <GlowDisc color="#F0D89A" size={SW * 0.5} innerOpacity={0.3} />
        </Animated.View>
        <Animated.View style={[{ width: SW * 0.26, height: SW * 0.26 }, moonStyle]}>
          <Image source={scene.moon} style={{ width: '100%', height: '100%' }} resizeMode="contain" fadeDuration={0} />
        </Animated.View>
      </View>
      {/* near cloud (faster) */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: '26%', left: '-12%', width: SW * 0.4 }, caStyle]}>
        <Image source={scene.cloudA} style={{ width: '100%', height: undefined, aspectRatio: 896 / 512 }} resizeMode="contain" fadeDuration={0} />
      </Animated.View>
      {/* the floating mystic — hovering centre-screen over a pulsing gold halo.
          Shown only where it is the hero (story / casting); hidden on the
          centered branding chapters so nothing sits behind the logo. */}
      {showMystic !== false ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: '20%', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[{ position: 'absolute', width: SW * 0.9, height: SW * 0.9 }, haloStyle]}>
            <GlowDisc color="#E8B75A" size={SW * 0.9} innerOpacity={0.3} />
          </Animated.View>
          <Animated.View style={[{ width: mW, height: mW / mAr }, mysticStyle]}>
            <Image source={scene.mystic} style={{ width: '100%', height: '100%' }} resizeMode="contain" fadeDuration={0} />
          </Animated.View>
        </View>
      ) : null}
      {/* rising gold embers — a little living magic */}
      <EmberField />
      {/* melt into the funnel darkness at the very top */}
      <LinearGradient pointerEvents="none" colors={['rgba(3,1,12,0.55)', 'rgba(0,0,0,0)']} locations={[0, 0.2]} style={StyleSheet.absoluteFill} />
    </View>
  );
}

// A calm act backdrop — a full-frame shadow-box painting with a slow parallax
// drift + edge scrims, for the input and reveal acts (no mystic). Content
// chapters render their UI over this.
function SceneBg({ src, rotate }) {
  var reduced = useReducedMotion();
  var appear = useSharedValue(0);
  var d = useLoop(30000, reduced);
  var cb = useLoop(26000, reduced);
  var ca = useLoop(19000, reduced);
  useEffect(function () { appear.value = withTiming(1, { duration: 900, easing: EASE_EXPO }); }, []);
  // parallax: the box breathes slowly, the drifting cut clouds move faster in
  // front of it — the two speeds are what read as real depth on a flat screen.
  var bgStyle = useAnimatedStyle(function () {
    return { opacity: appear.value, transform: [{ scale: interpolate(d.value, [0, 1], [1.06, 1.12]) }, { translateX: interpolate(d.value, [0, 1], [4, -4]) }, { translateY: interpolate(d.value, [0, 1], [5, -5]) }] };
  });
  // Pages whose backdrop IS a wheel can turn it — very slowly, like the sky.
  var rot = useSharedValue(0);
  useEffect(function () {
    if (reduced || !rotate) return;
    rot.value = withRepeat(withTiming(1, { duration: 180000, easing: Easing.linear }), -1, false);
  }, [reduced, rotate]);
  var rotStyle = useAnimatedStyle(function () {
    return { transform: [{ rotate: interpolate(rot.value, [0, 1], [0, 360]) + 'deg' }] };
  });
  var cbStyle = useAnimatedStyle(function () { return { opacity: appear.value * 0.5, transform: [{ translateX: interpolate(cb.value, [0, 1], [-14, 14]) }, { translateY: interpolate(cb.value, [0, 1], [0, -5]) }] }; });
  var caStyle = useAnimatedStyle(function () { return { opacity: appear.value * 0.55, transform: [{ translateX: interpolate(ca.value, [0, 1], [16, -16]) }] }; });
  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, bgStyle]}>
        {rotate ? (
          // sized to the screen diagonal so no corner ever swings into view
          <Animated.View style={[{ width: SCREEN_DIAG, height: SCREEN_DIAG }, rotStyle]}>
            <Image source={src} style={{ width: '100%', height: '100%' }} resizeMode="cover" fadeDuration={0} />
          </Animated.View>
        ) : (
          <Image source={src} style={{ width: '100%', height: '100%' }} resizeMode="cover" fadeDuration={0} />
        )}
      </Animated.View>
      {/* drifting cut-paper clouds add a foreground parallax plane */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: '9%', left: '-16%', width: SW * 0.4 }, cbStyle]}>
        <Image source={SCENE_MYSTIC.cloudB} style={{ width: '100%', height: undefined, aspectRatio: 896 / 512 }} resizeMode="contain" fadeDuration={0} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: '17%', right: '-18%', width: SW * 0.36 }, caStyle]}>
        <Image source={SCENE_MYSTIC.cloudA} style={{ width: '100%', height: undefined, aspectRatio: 896 / 512 }} resizeMode="contain" fadeDuration={0} />
      </Animated.View>
      {/* rising gold embers — the same living magic as the story act */}
      <EmberField />
      <LinearGradient pointerEvents="none" colors={['rgba(4,2,14,0.5)', 'rgba(0,0,0,0)', 'rgba(3,1,10,0.5)', 'rgba(3,1,9,0.9)']} locations={[0, 0.28, 0.72, 1]} style={StyleSheet.absoluteFill} />
    </View>
  );
}

// Every story beat is a COMPOSITION of drawn elements over the clean sky —
// no baked text. All motion is code; art is static.
function StoryStage({ children }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{children}</View>;
}

// Casting — "your sky gets read": the crystal orb. (The story beats render
// their own scenes via StoryBeatFocus; this is the one standalone hero left.)
function StoryBeatOrb() {
  return (
    <StoryStage>
      <FloatElement source={ELEMENTS.orb} w={SW * 0.62} glowColor="#B39CE8" glowScale={1.35} delay={150} floatPeriod={5400} floatRange={6} />
    </StoryStage>
  );
}

// ── Per-beat story SCENE — each beat is its own composition, its hero matching
//    that beat's words, floating over the shared shadow-box sky. ──
var MYSTIC_AR = 896 / 1088; // hero_mystic aspect (w/h)
function StoryBeatFocus({ beat, displayName }) {
  // Beat 1 — "nine planets move above you / the mystic has watched that sky":
  //          the mystic gazes up amid drifting navagraha
  if (beat === 0) {
    var mW0 = SW * 0.58;
    return (
      <View key="b0" pointerEvents="none" style={StyleSheet.absoluteFill}>
        <FloatElement source={BEAT_ART.planetGold} size={SW * 0.16} glowColor="#E8B54D" delay={400} floatPeriod={6200} floatRange={7} style={{ position: 'absolute', left: '8%', top: '8%' }} />
        <FloatElement source={BEAT_ART.planetTeal} size={SW * 0.11} glowColor="#1E7F8E" delay={750} floatPeriod={7600} floatRange={5} style={{ position: 'absolute', right: '13%', top: '5%' }} />
        <FloatElement source={BEAT_ART.planetGold} size={SW * 0.12} glowColor="#C2477E" delay={1050} floatPeriod={5600} floatRange={8} style={{ position: 'absolute', right: '17%', top: '35%' }} />
        <View style={{ position: 'absolute', top: '18%', left: 0, right: 0, alignItems: 'center' }}>
          <FloatElement source={SCENE_MYSTIC.mystic} w={mW0} h={mW0 / MYSTIC_AR} glowColor="#E8B75A" glowScale={1.25} delay={200} floatPeriod={6600} floatRange={7} />
        </View>
      </View>
    );
  }
  // Beat 2 — "his books have carried your pattern for centuries": the almanac
  if (beat === 1) {
    var bkW = SW * 0.68;
    return (
      <View key="b1" pointerEvents="none" style={StyleSheet.absoluteFill}>
        <FloatElement source={BEAT_ART.planetGold} size={SW * 0.1} glowColor="#E8B54D" delay={700} floatPeriod={7200} floatRange={6} style={{ position: 'absolute', right: '14%', top: '10%' }} />
        <View style={{ position: 'absolute', top: '26%', left: 0, right: 0, alignItems: 'center' }}>
          <FloatElement source={BEAT_ART.books} w={bkW} h={bkW * (720 / 900)} glowColor="#E8A33D" glowScale={1.25} delay={200} floatPeriod={6000} floatRange={6} />
        </View>
      </View>
    );
  }
  // Beat 3 — "a fresh leaf, it carries your name": the named ola leaf + sigil
  if (beat === 2) {
    var leafW = SW * 0.74;
    return (
      <View key="b2" pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={{ position: 'absolute', top: '9%', left: 0, right: 0, alignItems: 'center' }}>
          <SigilConstellation name={displayName} width={SW * 0.32} height={SW * 0.24} delay={1400} />
        </View>
        <View style={{ position: 'absolute', top: '32%', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
          <FloatElement source={BEAT_ART.leaf} w={leafW} h={leafW * (560 / 1024)} glowColor="#F0C878" glowScale={1.1} delay={200} floatPeriod={6400} floatRange={4} />
          {/* name inscribed along the blank parchment strip */}
          <Animated.Text entering={FadeIn.delay(1000).duration(1400)} numberOfLines={1} adjustsFontSizeToFit style={{ position: 'absolute', maxWidth: leafW * 0.6, fontSize: 24, fontStyle: 'italic', fontWeight: '700', color: '#5A3A12', letterSpacing: 1.5, opacity: 0.92 }}>
            {displayName}
          </Animated.Text>
        </View>
      </View>
    );
  }
  // Beat 4 — "tonight your sky gets read": the mystic reads, the great wheel turns
  var mW3 = SW * 0.56;
  return (
    <View key="b3" pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={{ position: 'absolute', top: '12%', left: 0, right: 0, alignItems: 'center' }}>
        <GreatWheel size={SW * 0.88} opacity={0.26} />
      </View>
      <View style={{ position: 'absolute', top: '20%', left: 0, right: 0, alignItems: 'center' }}>
        <FloatElement source={SCENE_MYSTIC.mystic} w={mW3} h={mW3 / MYSTIC_AR} glowColor="#E8B75A" glowScale={1.3} delay={200} floatPeriod={6200} floatRange={6} />
      </View>
    </View>
  );
}

// ── Reward burst — 10 gold sparks exploding radially ──
function RewardBurst() {
  var t = useSharedValue(0);
  var reduced = useReducedMotion();

  useEffect(function () {
    if (reduced) { t.value = 1; return; }
    t.value = withDelay(250, withTiming(1, { duration: 900, easing: EASE_EXPO }));
  }, [reduced]);

  return (
    <View style={{ position: 'absolute', width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (i) {
        var ang = (i / 10) * Math.PI * 2;
        var dist = 64 + (i % 3) * 22;
        /* eslint-disable react-hooks/rules-of-hooks */
        var s = useAnimatedStyle(function () {
          return {
            opacity: interpolate(t.value, [0, 0.2, 1], [0, 1, 0]),
            transform: [
              { translateX: interpolate(t.value, [0, 1], [0, Math.cos(ang) * dist]) },
              { translateY: interpolate(t.value, [0, 1], [0, Math.sin(ang) * dist]) },
              { scale: interpolate(t.value, [0, 1], [1.1, 0.25]) },
            ],
          };
        });
        /* eslint-enable react-hooks/rules-of-hooks */
        return (
          <Animated.View key={i} style={[{ position: 'absolute', width: i % 2 ? 4 : 5.5, height: i % 2 ? 4 : 5.5, borderRadius: 3, backgroundColor: i % 3 === 2 ? '#F8E7B8' : '#FFD666' }, s]} />
        );
      })}
    </View>
  );
}

// ── Reward moment — full-screen instant payoff after an input ──
function RewardMoment({ reward, onDone }) {
  var seal = useSharedValue(0);

  useEffect(function () {
    seal.value = withSpring(1, { damping: 11, stiffness: 130 });
    var t = setTimeout(function () { if (onDone) onDone(); }, 2400);
    return function () { clearTimeout(t); };
  }, []);

  var sealStyle = useAnimatedStyle(function () {
    return { transform: [{ scale: seal.value }] };
  });

  return (
    <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(300)} style={[StyleSheet.absoluteFill, { zIndex: 40, backgroundColor: 'rgba(3,2,8,0.88)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }]}>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <RewardBurst />
        <Animated.View style={[{ alignItems: 'center' }, sealStyle]}>
          {reward.icon ? (
            <View style={{ width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,184,0,0.1)', borderWidth: 1.5, borderColor: 'rgba(255,184,0,0.4)', marginBottom: 18, ...boxShadow('#FFB800', { width: 0, height: 0 }, 0.6, 20) }}>
              <Glyph name={reward.icon} size={30} color="#FFD666" />
            </View>
          ) : null}
          {reward.big ? (
            <Text style={{ fontSize: reward.bigSize || 34, fontWeight: '900', color: '#FFD666', textAlign: 'center', letterSpacing: 0.5, ...textShadow('rgba(255,184,0,0.55)', { width: 0, height: 0 }, 22) }}>
              {reward.big}
            </Text>
          ) : null}
        </Animated.View>
        <Animated.Text entering={FadeInUp.delay(350).duration(500)} style={[p.kicker, { color: '#D9A441', marginTop: 18 }]}>
          {reward.kicker}
        </Animated.Text>
        <Animated.Text entering={FadeInUp.delay(550).duration(500)} style={{ color: 'rgba(248,231,184,0.75)', fontSize: 14.5, lineHeight: 22, textAlign: 'center', marginTop: 6 }}>
          {reward.line}
        </Animated.Text>
        {reward.sub ? (
          <Animated.Text entering={FadeInUp.delay(750).duration(500)} style={{ color: 'rgba(248,231,184,0.5)', fontSize: 13, textAlign: 'center', marginTop: 8 }}>
            {reward.sub}
          </Animated.Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

// ── Shooting star — a rare golden streak across the field ──
function ShootingStar({ topPct, delayMs, travel }) {
  var t = useSharedValue(0);
  var reduced = useReducedMotion();

  useEffect(function () {
    if (reduced) return;
    t.value = withDelay(delayMs, withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 8000 }) // long dormancy between streaks
      ), -1, false));
  }, [reduced]);

  var style = useAnimatedStyle(function () {
    var phase = t.value;
    return {
      opacity: phase <= 0.001 ? 0 : interpolate(phase, [0, 0.15, 0.75, 1], [0, 0.9, 0.4, 0]),
      transform: [
        { translateX: interpolate(phase, [0, 1], [0, travel]) },
        { translateY: interpolate(phase, [0, 1], [0, travel * 0.45]) },
        { rotate: '24deg' },
      ],
    };
  });

  return (
    <Animated.View style={[{ position: 'absolute', top: topPct + '%', left: '-12%', width: 74, height: 1.6, borderRadius: 1 }, style]}>
      <LinearGradient colors={['transparent', 'rgba(248,231,184,0.85)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, borderRadius: 1 }} />
    </Animated.View>
  );
}

function Curtain({ opacity }) {
  var style = useAnimatedStyle(function () {
    return { opacity: opacity.value * 0.6 };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', zIndex: 50, pointerEvents: 'none' }, style]} />
  );
}

// ── Distant temple & trees on the horizon — lamps burning in the dark ──
function TempleLamp({ x, y, size, delay }) {
  var t = useSharedValue(0);
  var reduced = useReducedMotion();
  useEffect(function () {
    if (reduced) { t.value = 0.7; return; }
    t.value = withDelay(delay || 0, withRepeat(withSequence(
      withTiming(1, { duration: 900 }),
      withTiming(0.55, { duration: 260 }),
      withTiming(0.9, { duration: 500 }),
      withTiming(0.65, { duration: 340 })
    ), -1, true));
  }, [reduced]);
  var style = useAnimatedStyle(function () {
    return { opacity: 0.4 + 0.6 * t.value };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: '#FFB74D', ...boxShadow('#FF9E3D', { width: 0, height: 0 }, 0.95, size * 3.2) }, style]} />
  );
}

function TempleSkyline() {
  var H = SW * (118 / 360); // proportional to width so the art never crops
  var LN = 'rgba(224,198,140,0.62)';
  var LNdim = 'rgba(216,190,134,0.4)';
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: H, pointerEvents: 'none' }}>
      <Svg width="100%" height="100%" viewBox="0 0 360 118" preserveAspectRatio="xMidYMax meet">
        {/* ground line */}
        <Path d="M0,110 L360,110" stroke={LN} strokeWidth="1" opacity="0.7" />
        {/* THE GREAT STUPA — tiered base, dome, harmika, spire (engraved) */}
        <Path d="M14,110 L14,102 L96,102 L96,110 M20,102 L20,95 L90,95 L90,102 M26,95 L26,89 L84,89 L84,95" stroke={LN} strokeWidth="1" fill="none" />
        <Path d="M30,89 C30,58 80,58 80,89" stroke={LN} strokeWidth="1.2" fill="none" />
        <Path d="M50,58 L60,58 L60,50 L50,50 Z" stroke={LN} strokeWidth="1" fill="none" />
        <Path d="M55,50 L55,26 M50,44 L60,44 M51.5,38 L58.5,38 M53,32 L57,32" stroke={LN} strokeWidth="1" fill="none" />
        <Circle cx="55" cy="23" r="1.6" fill="#FFE9B8" opacity="0.9" />
        {/* pagoda — three sweeping tiers */}
        <Path d="M118,110 L118,96 L150,96 L150,110 M114,96 L154,96 C150,90 146,88 145,86 L123,86 C122,88 118,90 114,96 Z M120,86 L148,86 C145,80 142,78 141,76 L127,76 C126,78 123,80 120,86 Z M126,76 L142,76 C140,71 137,70 136,68 L132,68 C131,70 128,71 126,76 Z M134,68 L134,60" stroke={LN} strokeWidth="1" fill="none" />
        <Circle cx="134" cy="58" r="1.3" fill="#FFE9B8" opacity="0.85" />
        {/* small dome shrine */}
        <Path d="M226,110 L226,102 L262,102 L262,110 M230,102 C230,86 258,86 258,102 M244,86 L244,79" stroke={LNdim} strokeWidth="1" fill="none" />
        <Circle cx="244" cy="77" r="1.2" fill="#FFE9B8" opacity="0.8" />
        {/* coconut palms — curved trunks, frond bursts */}
        <Path d="M186,110 C183,92 189,76 187,64 M187,64 C195,57 206,54 214,56 M187,64 C181,55 172,51 162,52 M187,64 C195,66 204,71 209,78 M187,64 C179,69 172,76 169,83 M187,64 C188,55 186,48 181,42" stroke={LN} strokeWidth="1.1" fill="none" strokeLinecap="round" />
        <Path d="M318,110 C316,96 320,84 318,76 M318,76 C324,71 332,69 338,70 M318,76 C313,69 306,66 299,67 M318,76 C324,78 330,82 333,88 M318,76 C312,80 307,85 305,90" stroke={LNdim} strokeWidth="1" fill="none" strokeLinecap="round" />
        {/* low foliage rounds */}
        <Path d="M96,110 C98,102 108,100 112,104 C116,98 126,100 127,106 C130,102 136,104 137,110" stroke={LNdim} strokeWidth="0.9" fill="none" />
        <Path d="M270,110 C272,103 281,101 285,105 C289,100 297,102 298,107 C301,104 306,106 307,110" stroke={LNdim} strokeWidth="0.9" fill="none" />
        {/* tiny spiral galaxy + compass star accents floating low */}
        <Path d="M160,30 C166,28 170,32 168,37 C166,41 160,41 158,37 C156,33 159,29 163,29 M163,29 C170,24 179,26 181,33 M158,37 C152,41 150,49 155,53" stroke={LNdim} strokeWidth="0.8" fill="none" />
        <Path d="M292,44 L294,50 L300,52 L294,54 L292,60 L290,54 L284,52 L290,50 Z" fill="#FFE9B8" opacity="0.6" />
      </Svg>
      {/* warm lamps at the stupa gate and pagoda door — the only warmth in the night */}
      <TempleLamp x={(55 / 360 * 100) + '%'} y={(94 / 118 * 100) + '%'} size={4} delay={0} />
      <TempleLamp x={(134 / 360 * 100) + '%'} y={(100 / 118 * 100) + '%'} size={3.5} delay={1600} />
      <TempleLamp x={(244 / 360 * 100) + '%'} y={(97 / 118 * 100) + '%'} size={3} delay={3000} />
    </View>
  );
}

// Golden stardust band that sweeps the screen on every chapter change
var SWEEP_DUST = (function () {
  var arr = [];
  for (var i = 0; i < 14; i++) {
    arr.push({ off: (i / 14) * SH * 1.1, lag: Math.random() * 0.22, size: 2 + Math.random() * 3.4, tint: i % 4 === 0 ? '#FFF2D0' : '#F2D48E' });
  }
  return arr;
})();

function StardustSweep({ progress }) {
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 51, pointerEvents: 'none' }]}>
      {SWEEP_DUST.map(function (d, i) {
        /* eslint-disable react-hooks/rules-of-hooks */
        var style = useAnimatedStyle(function () {
          var t = Math.min(Math.max(progress.value - d.lag, 0) / (1 - d.lag), 1);
          return {
            opacity: interpolate(t, [0, 0.2, 0.8, 1], [0, 0.95, 0.5, 0]),
            transform: [
              { translateX: interpolate(t, [0, 1], [-SW * 0.25, SW * 1.25]) },
              { translateY: d.off - SH * 0.05 + interpolate(t, [0, 1], [0, -SH * 0.12]) },
            ],
          };
        });
        /* eslint-enable react-hooks/rules-of-hooks */
        return (
          <Animated.View key={i} style={[{ position: 'absolute', left: 0, top: 0 }, style]}>
            <View style={{ width: d.size * 7, height: d.size * 0.5, borderRadius: d.size, backgroundColor: d.tint, opacity: 0.5 }} />
            <View style={{ position: 'absolute', right: -d.size * 0.4, top: -d.size * 0.25, width: d.size, height: d.size, borderRadius: d.size / 2, backgroundColor: d.tint, ...boxShadow(d.tint, { width: 0, height: 0 }, 0.9, 6) }} />
          </Animated.View>
        );
      })}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  SHARED PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════

function PrimaryButton({ label, onPress, loading, disabled, icon }) {
  var off = disabled || loading;
  return (
    <View style={p.btnShadow}>
      <SpringPressable onPress={onPress} disabled={off} haptic="heavy" scalePressed={0.96} style={{ borderRadius: 16, overflow: 'hidden', opacity: off ? 0.45 : 1 }}>
        <LinearGradient colors={off ? ['#2A261F', '#3A3328'] : ['#FFF0B8', '#D9A441', '#8A5A17']} style={p.btnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <LinearGradient
            colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.05)', 'transparent']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', pointerEvents: 'none' }}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
          />
          {loading ? <CosmicLoader size={24} color="#2A1707" /> : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {icon ? <Glyph name={icon} size={17} color="#2A1707" /> : null}
              <Text style={p.btnText}>{label}</Text>
            </View>
          )}
        </LinearGradient>
      </SpringPressable>
    </View>
  );
}

function GhostButton({ label, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: 13 }}>
      <Text style={{ color: 'rgba(248,231,184,0.45)', fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function Card({ children, style }) {
  return (
    <View style={[p.card, style]}>
      {/* gilt sheen — a warm gold highlight rakes the top edge of the panel */}
      <LinearGradient colors={['rgba(246,213,132,0.1)', 'rgba(246,213,132,0.02)', 'transparent']} locations={[0, 0.35, 1]} style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
      {children}
    </View>
  );
}

function ChapterHeading({ kicker, title, sub, color }) {
  return (
    <View style={{ alignItems: 'center', marginBottom: 18 }}>
      {kicker ? <Text style={[p.kicker, color ? { color: color } : null]}>{kicker}</Text> : null}
      <Text style={p.title}>{title}</Text>
      {sub ? <Text style={p.sub}>{sub}</Text> : null}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  CHAPTER: LANGUAGE
// ═══════════════════════════════════════════════════════════════════════

function LanguageChapter({ onSelect }) {
  var glow = useSharedValue(0);
  var ring = useSharedValue(0);
  var ringIn = useSharedValue(0);
  var reduced = useReducedMotion();
  useEffect(function () {
    if (reduced) return;
    glow.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, true);
    ring.value = withRepeat(withTiming(360, { duration: 64000, easing: Easing.linear }), -1, false);
    ringIn.value = withRepeat(withTiming(360, { duration: 44000, easing: Easing.linear }), -1, false);
  }, [reduced]);
  var glowStyle = useAnimatedStyle(function () {
    return { opacity: interpolate(glow.value, [0, 1], [0.4, 0.85]), transform: [{ scale: interpolate(glow.value, [0, 1], [0.94, 1.08]) }] };
  });
  var ringStyle = useAnimatedStyle(function () {
    return { transform: [{ rotate: ring.value + 'deg' }] };
  });
  var ringInStyle = useAnimatedStyle(function () {
    return { transform: [{ rotate: -ringIn.value + 'deg' }] };
  });

  var options = [
    { code: 'en', label: 'English', sub: 'International', icon: 'globe-outline', color: '#A78BFA' },
    { code: 'si', label: 'සිංහල', sub: 'Sinhala', icon: 'flower-outline', color: '#FFB800' },
  ];

  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 26 }}>
      <Animated.View entering={FadeInDown.duration(700)} style={{ alignItems: 'center', marginBottom: 40 }}>
        <View style={{ width: 184, height: 184, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          {/* drawn astrological wheel element, slowly turning behind the mark */}
          <Animated.View style={[{ position: 'absolute', width: SW * 0.62, height: SW * 0.62, opacity: 0.5 }, ringStyle]}>
            <Image source={ELEMENTS.wheel} style={{ width: '100%', height: '100%' }} resizeMode="contain" fadeDuration={0} />
          </Animated.View>
          {/* breathing golden halo */}
          <Animated.View style={[{ position: 'absolute', width: 184, height: 184 }, glowStyle]}>
            <GlowDisc color="#FFB800" size={184} innerOpacity={0.3} />
          </Animated.View>
          {/* rotating gilded ring — twelve houses marked in gold */}
          <Animated.View style={[{ position: 'absolute', width: 164, height: 164 }, ringStyle]}>
            <Svg width="100%" height="100%" viewBox="0 0 164 164">
              <Circle cx="82" cy="82" r="76" stroke="rgba(232,201,122,0.35)" strokeWidth="0.8" fill="none" />
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (i) {
                var a = (i / 12) * Math.PI * 2 - Math.PI / 2;
                var x = 82 + Math.cos(a) * 76, y = 82 + Math.sin(a) * 76;
                if (i % 3 === 0) {
                  // cardinal houses — little gold diamonds
                  return <Path key={i} d={'M' + x + ',' + (y - 4) + ' L' + (x + 3) + ',' + y + ' L' + x + ',' + (y + 4) + ' L' + (x - 3) + ',' + y + ' Z'} fill="#E8C97A" opacity="0.85" />;
                }
                return <Circle key={i} cx={x} cy={y} r="1.9" fill="#E8C97A" opacity="0.6" />;
              })}
            </Svg>
          </Animated.View>
          {/* counter-rotating dashed ring */}
          <Animated.View style={[{ position: 'absolute', width: 134, height: 134 }, ringInStyle]}>
            <Svg width="100%" height="100%" viewBox="0 0 134 134">
              <Circle cx="67" cy="67" r="64" stroke="rgba(167,139,250,0.28)" strokeWidth="1" strokeDasharray="2 7" fill="none" />
            </Svg>
          </Animated.View>
          {/* the website emblem, faded up */}
          <Animated.View entering={FadeIn.delay(200).duration(1000)}>
            <Image source={ELEMENTS.logo} style={{ width: 104, height: 104 }} resizeMode="contain" fadeDuration={0} />
          </Animated.View>
        </View>
        <Text style={{ fontSize: 30, fontWeight: '900', color: '#FFB800', letterSpacing: 0.5, ...textShadow('rgba(255,184,0,0.45)', { width: 0, height: 0 }, 14) }}>Grahachara</Text>
        <Text style={{ fontSize: 14, color: 'rgba(248,231,184,0.55)', marginTop: 6 }}>ග්‍රහචාර</Text>
        <Text style={{ fontSize: 12, color: 'rgba(248,231,184,0.4)', marginTop: 10, letterSpacing: 2, textTransform: 'uppercase' }}>Vedic Astrology & Horoscope</Text>
      </Animated.View>

      <Animated.Text entering={FadeIn.delay(300).duration(600)} style={{ textAlign: 'center', color: 'rgba(248,231,184,0.5)', fontSize: 13, fontWeight: '700', letterSpacing: 1, marginBottom: 16 }}>
        Select Language  ·  භාෂාව තෝරන්න
      </Animated.Text>

      {options.map(function (opt, i) {
        return (
          <Animated.View key={opt.code} entering={FadeInUp.delay(400 + i * 130).duration(500)}>
            <SpringPressable onPress={function () { onSelect(opt.code); }} haptic="medium" scalePressed={0.97} style={{ marginBottom: 12, borderRadius: 18, overflow: 'hidden' }}>
              <View style={[p.langRow, { borderColor: opt.color + '26' }]}>
                <View style={[p.langIcon, { backgroundColor: opt.color + '14', borderColor: opt.color + '35' }]}>
                  <Glyph name={opt.icon} size={22} color={opt.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 19, fontWeight: '800', color: '#FFF1D0' }}>{opt.label}</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>{opt.sub}</Text>
                </View>
                <Glyph name="chevron-forward-circle" size={26} color={opt.color + '90'} />
              </View>
            </SpringPressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  CHAPTER: STORY — cinematic beats, tap to advance
// ═══════════════════════════════════════════════════════════════════════

// Words surface one by one, like ink settling on a page
function WordFlow({ text, style, baseDelay, step }) {
  var words = (text || '').split(' ');
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
      {words.map(function (w, i) {
        return (
          <Animated.Text
            key={i}
            entering={FadeIn.delay((baseDelay || 0) + i * (step || 60)).duration(420)}
            style={style}
          >
            {w + (i < words.length - 1 ? ' ' : '')}
          </Animated.Text>
        );
      })}
    </View>
  );
}


function StoryChapter({ lang, displayName, onDone }) {
  var T = COPY[lang] || COPY.en;
  var [beat, setBeat] = useState(0);
  var beats = T.storyBeats;
  var isLast = beat === beats.length - 1;

  // Gentle horizontal nudge on the "tap to continue" chevron — invites the tap.
  var reduced = useReducedMotion();
  var nudge = useSharedValue(0);
  useEffect(function () {
    if (reduced) { nudge.value = 0; return; }
    nudge.value = withRepeat(withTiming(1, { duration: 950, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [reduced]);
  var chevronNudge = useAnimatedStyle(function () {
    return { transform: [{ translateX: interpolate(nudge.value, [0, 1], [0, 5]) }] };
  });

  var advance = function () {
    if (isLast) { onDone(); return; }
    setBeat(beat + 1);
  };

  var withName = function (s) { return (s || '').replace('{name}', displayName || ''); };

  var isSi = lang === 'si';

  // The scene now fills the whole screen (rendered as the funnel backdrop).
  // Here we only overlay the copy + controls, anchored to the bottom over a
  // legibility scrim so text always reads against the moving art.
  return (
    <TouchableOpacity activeOpacity={1} onPress={advance} style={{ flex: 1, justifyContent: 'flex-end' }}>
      {/* per-beat imagery over the mystic scene, matching the words */}
      <Animated.View key={'focus' + beat} entering={FadeIn.duration(700)} exiting={FadeOut.duration(250)} style={StyleSheet.absoluteFill} pointerEvents="none">
        <StoryBeatFocus beat={beat} displayName={displayName} />
      </Animated.View>
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(3,1,12,0.35)', 'rgba(2,1,9,0.86)', 'rgba(2,1,8,0.97)']}
        locations={[0, 0.32, 0.68, 1]}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: SH * 0.6 }}
      />
      <View style={{ paddingHorizontal: 28, paddingBottom: 26 }}>
        <Animated.View key={'text' + beat} entering={FadeIn.duration(420)} exiting={FadeOut.duration(200)}>
          <WordFlow text={withName(beats[beat].big)} style={[p.storyBig, isSi && p.storyBigSi]} baseDelay={250} step={70} />
          <View style={{ height: 12 }} />
          <WordFlow text={withName(beats[beat].small)} style={[p.storySmallWord, isSi && p.storySmallWordSi]} baseDelay={900} step={40} />
        </Animated.View>

        <View style={{ alignItems: 'center', marginTop: 22 }}>
          <View style={{ flexDirection: 'row', gap: 7, marginBottom: 16 }}>
            {beats.map(function (_, i) {
              var on = i === beat;
              var dotColor = on ? '#E8C97A' : 'rgba(232,201,122,0.3)';
              return <View key={i} style={{ width: on ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: dotColor }} />;
            })}
          </View>
          {isLast ? (
            <Animated.View entering={FadeInUp.delay(2600).duration(600)} style={{ width: '78%' }}>
              <PrimaryButton label={T.begin} onPress={onDone} icon="sparkles" />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInUp.delay(1600).duration(700)}>
              <View style={p.tapPill}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.012)']}
                  style={[StyleSheet.absoluteFill, { borderRadius: 999, pointerEvents: 'none' }]}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                />
                <Text style={p.tapPillText}>{T.tapToContinue}</Text>
                <Animated.View style={chevronNudge}>
                  <Glyph name="chevron-forward" size={15} color="#E8C97A" />
                </Animated.View>
              </View>
            </Animated.View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  INPUT CHAPTERS — one question per screen
// ═══════════════════════════════════════════════════════════════════════

// Android runs softwareKeyboardLayoutMode:"pan" (project convention — KAV is
// iOS-only), so the window slides up and the number-pad has no Done key. The
// generous bottom padding keeps the CTA reachable after the pan, and dragging
// the sheet dismisses the keyboard.
function InputChapterFrame({ children, onBack, T }) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 26, paddingTop: 24, paddingBottom: Platform.OS === 'android' ? 96 : 32 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {children}
      {onBack ? <GhostButton label={T.back} onPress={onBack} /> : null}
    </ScrollView>
  );
}

function NameChapter({ lang, initial, onNext, onBack }) {
  var T = COPY[lang] || COPY.en;
  var [name, setName] = useState(initial || '');
  var [error, setError] = useState('');
  var [focused, setFocused] = useState(false);

  var submit = function () {
    if (name.trim().length < 2) { setError(T.nameError); return; }
    onNext(name.trim());
  };

  return (
    <InputChapterFrame onBack={onBack} T={T}>
      <Animated.View entering={FadeInDown.duration(500)}>
        {/* Ornamental overline — flanked gold hairlines echo the constellations above */}
        <View style={p.ornamentRow}>
          <LinearGradient colors={['transparent', 'rgba(232,201,122,0.55)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={p.ornamentLine} />
          <Glyph name="star" size={8} color="#E8C97A" style={{ marginHorizontal: 9 }} />
          <Text style={[p.kickerOrn, lang === 'si' ? { letterSpacing: 0.5 } : null]}>{T.nameKicker}</Text>
          <Glyph name="star" size={8} color="#E8C97A" style={{ marginHorizontal: 9 }} />
          <LinearGradient colors={['rgba(232,201,122,0.55)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={p.ornamentLine} />
        </View>
        <ChapterHeading title={T.nameTitle} sub={T.nameSub} />
        {/* Cosmic-glass field — tinted to the starfield, gold border ignites on focus */}
        <View style={[p.nameField, focused && p.nameFieldFocus, error ? p.nameFieldError : null]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.012)']}
            style={[StyleSheet.absoluteFill, { borderRadius: 16, pointerEvents: 'none' }]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
          <Glyph name="sparkles" size={17} color={focused ? '#F0D488' : 'rgba(217,164,65,0.55)'} style={{ marginRight: 12 }} />
          <TextInput
            style={p.nameInput}
            placeholder={T.namePlaceholder}
            placeholderTextColor="rgba(248,231,184,0.3)"
            value={name}
            onChangeText={function (t) { setName(t); setError(''); }}
            onFocus={function () { setFocused(true); }}
            onBlur={function () { setFocused(false); }}
            maxLength={25}
            selectionColor="#D9A441"
            autoFocus={Platform.OS !== 'web'}
            onSubmitEditing={submit}
            returnKeyType="done"
          />
        </View>
        {error ? (
          <View style={p.errorRow}>
            <Glyph name="alert-circle" size={14} color="#FCA5A5" />
            <Text style={p.errorInline}>{error}</Text>
          </View>
        ) : null}
        <View style={{ marginTop: 24 }}>
          <PrimaryButton label={T.continueBtn} onPress={submit} icon="arrow-forward" />
        </View>
      </Animated.View>
    </InputChapterFrame>
  );
}

function DateChapter({ lang, initial, onNext, onBack }) {
  var T = COPY[lang] || COPY.en;
  var months = lang === 'si' ? MONTHS_SHORT_SI : MONTHS_SHORT_EN;
  var [year, setYear] = useState(initial ? initial.year : '');
  var [month, setMonth] = useState(initial ? initial.month : null);
  var [day, setDay] = useState(initial ? initial.day : '');
  var [error, setError] = useState('');
  var yearRef = useRef(null);

  var daysInMonth = function (m, y) {
    if (m === null || !y) return 31;
    return new Date(parseInt(y), m + 1, 0).getDate();
  };

  var submit = function () {
    var maxYear = new Date().getFullYear();
    var y = parseInt(year);
    if (!year || isNaN(y) || y < 1900 || y > maxYear) { setError(T.yearError.replace('2026', String(maxYear))); return; }
    if (month === null) { setError(T.monthError); return; }
    var d = parseInt(day);
    if (!day || isNaN(d) || d < 1 || d > daysInMonth(month, year)) { setError(T.dayError); return; }
    // a birth date can't be in the future
    if (new Date(y, month, d).getTime() > Date.now()) { setError(T.dayError); return; }
    onNext({ year: year, month: month, day: day });
  };

  var complete = !!day && month !== null && year.length === 4;

  return (
    <InputChapterFrame onBack={onBack} T={T}>
      <Animated.View entering={FadeInDown.duration(500)}>
        <ChapterHeading title={T.dateTitle} sub={T.dateSub} />

        {/* the signature: an engraved gold plaque that fills in live */}
        <DatePlaque day={day} month={month} year={year} months={months} complete={complete} />

        {/* month — twelve raised gilt tiles */}
        <Animated.View entering={FadeInUp.delay(120).duration(500)}>
          <Text style={p.fieldLabel}>{T.monthLabel}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {months.map(function (m, i) {
              var sel = month === i;
              return (
                <SpringPressable
                  key={i}
                  onPress={function () { setMonth(i); setError(''); }}
                  haptic="light" scalePressed={0.93}
                  style={{ width: '22.5%', borderRadius: 13, overflow: 'hidden' }}
                >
                  <View style={[p.monthTile, sel && p.monthTileSel]}>
                    <LinearGradient
                      colors={sel ? ['rgba(246,213,132,0.34)', 'rgba(232,181,77,0.12)'] : ['rgba(246,213,132,0.07)', 'transparent']}
                      style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
                      start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
                    />
                    <Text style={[p.monthTileText, sel && p.monthTileTextSel]}>{m}</Text>
                  </View>
                </SpringPressable>
              );
            })}
          </View>
        </Animated.View>

        {/* day + year — big engraved numerals. On Android the number-pad has no
            Done key, so we hop day→year at 2 digits and drop the keyboard once
            the year is complete: the CTA is never left trapped behind it. */}
        <Animated.View entering={FadeInUp.delay(220).duration(500)} style={{ flexDirection: 'row', gap: 12 }}>
          <GiltField
            label={T.dayLabel} placeholder="14" maxLength={2} flex={1}
            value={day}
            onChangeText={function (t) {
              var v = t.replace(/[^0-9]/g, '');
              setDay(v); setError('');
              if (v.length === 2 && yearRef.current) yearRef.current.focus();
            }}
          />
          <GiltField
            inputRef={yearRef}
            label={T.yearLabel} placeholder="1995" maxLength={4} flex={1.5}
            value={year}
            onChangeText={function (t) {
              var v = t.replace(/[^0-9]/g, '');
              setYear(v); setError('');
              if (v.length === 4) Keyboard.dismiss();
            }}
          />
        </Animated.View>

        {error ? (
          <Animated.View entering={FadeIn.duration(250)} style={p.errorRow}>
            <Glyph name="alert-circle" size={14} color="#FCA5A5" />
            <Text style={p.errorInline}>{error}</Text>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInUp.delay(320).duration(500)} style={{ marginTop: 24 }}>
          <PrimaryButton label={T.continueBtn} onPress={submit} icon="arrow-forward" disabled={!complete} />
        </Animated.View>
      </Animated.View>
    </InputChapterFrame>
  );
}

// ── The date plaque — a raised gilt panel that engraves the chosen date as it
//    is assembled, so the answer is always visible and the page feels alive. ──
function DatePlaque({ day, month, year, months, complete }) {
  var reduced = useReducedMotion();
  var t = useLoop(5200, reduced);
  var lit = useSharedValue(0);
  useEffect(function () {
    lit.value = withTiming(complete ? 1 : 0, { duration: 600, easing: EASE_EXPO });
  }, [complete]);
  var floatStyle = useAnimatedStyle(function () {
    return { transform: [{ translateY: interpolate(t.value, [0, 1], [2.5, -2.5]) }] };
  });
  var glowStyle = useAnimatedStyle(function () {
    return { opacity: lit.value * interpolate(t.value, [0, 1], [0.45, 0.8]) };
  });
  return (
    <Animated.View style={[{ alignItems: 'center', marginBottom: 22 }, floatStyle]}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: SW * 0.78, height: SW * 0.78, top: -SW * 0.24 }, glowStyle]}>
        <GlowDisc color="#E8B54D" size={SW * 0.78} innerOpacity={0.26} />
      </Animated.View>
      <View style={p.plaque}>
        <LinearGradient
          colors={['rgba(246,213,132,0.16)', 'rgba(246,213,132,0.04)', 'transparent']}
          locations={[0, 0.42, 1]}
          style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Text style={[p.plaqueNum, !day && p.plaqueDim]}>{day || '––'}</Text>
          <Text style={p.plaqueSep}>·</Text>
          <Text style={[p.plaqueMon, month === null && p.plaqueDim]}>{month === null ? '–––' : months[month]}</Text>
          <Text style={p.plaqueSep}>·</Text>
          <Text style={[p.plaqueNum, !year && p.plaqueDim]}>{year || '––––'}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ── A premium numeric field: gilt glass, gold hairline that ignites on focus,
//    big centred engraved numerals. ──
function GiltField({ label, value, onChangeText, placeholder, maxLength, flex, inputRef }) {
  var [focused, setFocused] = useState(false);
  return (
    <View style={{ flex: flex || 1 }}>
      <Text style={p.fieldLabel}>{label}</Text>
      <View style={[p.giltField, focused && p.giltFieldFocus]}>
        <LinearGradient
          colors={['rgba(246,213,132,0.1)', 'transparent']}
          style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        />
        <TextInput
          ref={inputRef}
          style={p.giltInput}
          placeholder={placeholder}
          placeholderTextColor="rgba(242,231,201,0.22)"
          keyboardType="number-pad"
          maxLength={maxLength}
          value={value}
          onChangeText={onChangeText}
          onFocus={function () { setFocused(true); }}
          onBlur={function () { setFocused(false); }}
          returnKeyType="done"
          onSubmitEditing={function () { Keyboard.dismiss(); }}
          selectionColor="#E8B54D"
        />
      </View>
    </View>
  );
}

function TimeChapter({ lang, initial, onNext, onBack }) {
  var T = COPY[lang] || COPY.en;
  var [hour, setHour] = useState(initial ? initial.hour : '');
  var [minute, setMinute] = useState(initial ? initial.minute : '');
  var [ampm, setAmpm] = useState(initial ? initial.ampm : 'AM');
  var [error, setError] = useState('');
  var minuteRef = useRef(null);

  var submit = function () {
    var h = parseInt(hour);
    var m = parseInt(minute);
    // an empty hour must not silently become 12:00 — it's either a real
    // time or the explicit "hour is veiled" path below
    if (hour === '' || isNaN(h) || h < 1 || h > 12) { setError(T.timeError); return; }
    if (minute !== '' && (isNaN(m) || m < 0 || m > 59)) { setError(T.timeError); return; }
    onNext({ hour: hour, minute: minute, ampm: ampm, unknown: false });
  };

  var skipUnknown = function () {
    onNext({ hour: '', minute: '', ampm: 'PM', unknown: true });
  };

  var hv = parseInt(hour);
  var complete = hour !== '' && !isNaN(hv) && hv >= 1 && hv <= 12;

  return (
    <InputChapterFrame onBack={onBack} T={T}>
      <Animated.View entering={FadeInDown.duration(500)}>
        <ChapterHeading title={T.timeTitle} sub={T.timeSub} />

        {/* the hour, engraved live on its own gold plaque */}
        <TimePlaque hour={hour} minute={minute} ampm={ampm} complete={complete} />

        {/* hour : minute — big engraved numerals, keyboard-aware */}
        <Animated.View entering={FadeInUp.delay(120).duration(500)} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
          <GiltField
            label={lang === 'si' ? 'පැය' : 'HOUR'} placeholder="08" maxLength={2} flex={1}
            value={hour}
            onChangeText={function (t) {
              var v = t.replace(/[^0-9]/g, '');
              setHour(v); setError('');
              if (v.length === 2 && minuteRef.current) minuteRef.current.focus();
            }}
          />
          <Text style={p.timeColon}>:</Text>
          <GiltField
            inputRef={minuteRef}
            label={lang === 'si' ? 'මිනිත්තු' : 'MINUTE'} placeholder="30" maxLength={2} flex={1}
            value={minute}
            onChangeText={function (t) {
              var v = t.replace(/[^0-9]/g, '');
              setMinute(v); setError('');
              if (v.length === 2) Keyboard.dismiss();
            }}
          />
        </Animated.View>

        {/* AM / PM — sun and moon tiles */}
        <Animated.View entering={FadeInUp.delay(220).duration(500)} style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
          {['AM', 'PM'].map(function (v) {
            var sel = ampm === v;
            return (
              <SpringPressable
                key={v}
                onPress={function () { setAmpm(v); Keyboard.dismiss(); }}
                haptic="light" scalePressed={0.95}
                style={{ flex: 1, borderRadius: 14, overflow: 'hidden' }}
              >
                <View style={[p.ampmTile, sel && p.ampmTileSel]}>
                  <LinearGradient
                    colors={sel ? ['rgba(246,213,132,0.32)', 'rgba(232,181,77,0.1)'] : ['rgba(246,213,132,0.06)', 'transparent']}
                    style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
                    start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
                  />
                  <Glyph name={v === 'AM' ? 'sunny-outline' : 'moon-outline'} size={18} color={sel ? '#F9E6B4' : 'rgba(242,231,201,0.45)'} />
                  <Text style={[p.ampmTileText, sel && p.ampmTileTextSel]}>{v}</Text>
                </View>
              </SpringPressable>
            );
          })}
        </Animated.View>

        {error ? (
          <Animated.View entering={FadeIn.duration(250)} style={p.errorRow}>
            <Glyph name="alert-circle" size={14} color="#FCA5A5" />
            <Text style={p.errorInline}>{error}</Text>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInUp.delay(320).duration(500)} style={{ marginTop: 24 }}>
          <PrimaryButton label={T.continueBtn} onPress={submit} icon="arrow-forward" disabled={!complete} />
        </Animated.View>
        <GhostButton label={T.timeUnknown} onPress={skipUnknown} />
        <Text style={p.hint}>{T.timeUnknownNote}</Text>
      </Animated.View>
    </InputChapterFrame>
  );
}

// ── The hour plaque — the chosen time engraved in gold, filling in live. ──
function TimePlaque({ hour, minute, ampm, complete }) {
  var reduced = useReducedMotion();
  var t = useLoop(5200, reduced);
  var lit = useSharedValue(0);
  useEffect(function () {
    lit.value = withTiming(complete ? 1 : 0, { duration: 600, easing: EASE_EXPO });
  }, [complete]);
  var floatStyle = useAnimatedStyle(function () {
    return { transform: [{ translateY: interpolate(t.value, [0, 1], [2.5, -2.5]) }] };
  });
  var glowStyle = useAnimatedStyle(function () {
    return { opacity: lit.value * interpolate(t.value, [0, 1], [0.45, 0.8]) };
  });
  var hh = hour ? (hour.length === 1 ? '0' + hour : hour) : '––';
  var mm = minute ? (minute.length === 1 ? '0' + minute : minute) : '00';
  return (
    <Animated.View style={[{ alignItems: 'center', marginBottom: 22 }, floatStyle]}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: SW * 0.78, height: SW * 0.78, top: -SW * 0.24 }, glowStyle]}>
        <GlowDisc color="#E8B54D" size={SW * 0.78} innerOpacity={0.26} />
      </Animated.View>
      <View style={p.plaque}>
        <LinearGradient
          colors={['rgba(246,213,132,0.16)', 'rgba(246,213,132,0.04)', 'transparent']}
          locations={[0, 0.42, 1]}
          style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Text style={[p.plaqueNum, !hour && p.plaqueDim]}>{hh}</Text>
          <Text style={p.plaqueSep}>:</Text>
          <Text style={[p.plaqueNum, !minute && p.plaqueDim]}>{mm}</Text>
          <Text style={[p.plaqueMon, { fontSize: 19, marginLeft: 4 }]}>{ampm}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

function PlaceChapter({ lang, initial, errorNote, onNext, onBack }) {
  var T = COPY[lang] || COPY.en;
  var [city, setCity] = useState(initial || null);
  var [error, setError] = useState('');

  var submit = function () {
    if (!city) { setError(T.cityError); return; }
    onNext(city);
  };

  return (
    <InputChapterFrame onBack={onBack} T={T}>
      <Animated.View entering={FadeInDown.duration(500)}>
        <ChapterHeading title={T.placeTitle} sub={T.placeSub} />
        {errorNote ? (
          <Animated.View entering={FadeInDown.duration(300)} style={[p.errorWrap, { marginBottom: 14 }]}>
            <Glyph name="cloud-offline-outline" size={15} color="#FCA5A5" />
            <Text style={p.errorWrapText}>{errorNote}</Text>
          </Animated.View>
        ) : null}
        <View>
          <CitySearchPicker
            selectedCity={city}
            onSelect={function (c) { setCity(c); setError(''); }}
            lang={lang}
            accentColor="#FFB800"
            maxHeight={200}
            placeholder={T.placeSearch}
          />
        </View>
        {city ? (
          <Animated.View entering={FadeInDown.duration(300)} style={p.cityBadge}>
            <Glyph name="location" size={16} color="#34D399" />
            <Text style={p.cityBadgeText}>{city.name}{city.country ? ', ' + city.country : ''}</Text>
            <Text style={p.cityBadgeCoords}>{city.lat.toFixed(2)}°, {city.lng.toFixed(2)}°</Text>
          </Animated.View>
        ) : null}
        {error ? <Text style={p.error}>{error}</Text> : null}
        <View style={{ marginTop: 22 }}>
          <PrimaryButton label={T.continueBtn} onPress={submit} icon="telescope-outline" />
        </View>
      </Animated.View>
    </InputChapterFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  CHAPTER: CASTING — theatrical computation while fetching the reveal
// ═══════════════════════════════════════════════════════════════════════

function CastingChapter({ lang, birthData, displayName, onDone, onError }) {
  var T = COPY[lang] || COPY.en;
  var [lineIdx, setLineIdx] = useState(0);
  var revealRef = useRef(null);
  var doneRef = useRef(false);
  var corePulse = useSharedValue(0);
  var reduced = useReducedMotion();

  var lines = useMemo(function () {
    var d = new Date(birthData.dateTime);
    var months = lang === 'si' ? MONTHS_SHORT_SI : MONTHS_SHORT_EN;
    var dateLabel = d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    var placeLabel = (birthData.locationName || '').split(',')[0] || 'your city';
    return T.castingLines.map(function (l) {
      return l.replace('{place}', placeLabel).replace('{date}', dateLabel);
    });
  }, [lang, birthData]);

  var wheelSpin = useSharedValue(0);
  useEffect(function () {
    if (reduced) return;
    corePulse.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true);
    wheelSpin.value = withRepeat(withTiming(360, { duration: 26000, easing: Easing.linear }), -1, false);
  }, [reduced]);
  var coreStyle = useAnimatedStyle(function () {
    return {
      opacity: interpolate(corePulse.value, [0, 1], [0.5, 0.95]),
      transform: [{ scale: interpolate(corePulse.value, [0, 1], [0.92, 1.15]) }],
    };
  });
  var wheelStyle = useAnimatedStyle(function () {
    return { transform: [{ rotate: wheelSpin.value + 'deg' }] };
  });

  useEffect(function () {
    var cancelled = false;
    var startMs = Date.now();

    // fetch the real reveal in parallel with the theatre
    getOnboardingReveal(birthData.dateTime, birthData.lat, birthData.lng, displayName, lang)
      .then(function (res) {
        if (cancelled) return;
        if (res && res.success && res.data) {
          revealRef.current = res.data;
          // persist immediately so the reveal survives app restarts pre-signin
          AsyncStorage.setItem(REVEAL_STORAGE_KEY, JSON.stringify({
            savedAt: Date.now(), language: lang, birthData: birthData, displayName: displayName, reveal: res.data,
          })).catch(function () {});
        } else {
          throw new Error('empty reveal');
        }
      })
      .catch(function (e) {
        if (cancelled) return;
        if (__DEV__) console.warn('reveal fetch failed:', e);
        revealRef.current = { __failed: true };
      });

    // advance the status lines on a fixed rhythm
    var idx = 0;
    var interval = setInterval(function () {
      idx += 1;
      if (idx < lines.length) {
        setLineIdx(idx);
        return;
      }
      // theatre finished but no data yet — don't sit here forever while the
      // API layer grinds through its retry backoff (worst case ~90s): give
      // up at 25s and surface the failure on the place screen
      if (!revealRef.current && Date.now() - startMs > 25000) {
        revealRef.current = { __failed: true };
      }
      // theatre finished — wait for data if it isn't in yet
      if (revealRef.current && !doneRef.current) {
        doneRef.current = true;
        clearInterval(interval);
        var r = revealRef.current;
        setTimeout(function () {
          if (cancelled) return;
          if (r.__failed) onError(); else onDone(r);
        }, 700);
      }
    }, 950);

    return function () { cancelled = true; clearInterval(interval); };
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 0 }}>
      {/* the great wheel behind the reading */}
      <View style={{ position: 'absolute', top: SH * 0.02, left: SW / 2 - SW * 0.7, pointerEvents: 'none' }}>
        <GreatWheel size={SW * 1.4} opacity={0.14} />
      </View>
      {/* the crystal orb reads THEIR sky — drawn element with a breathing core */}
      <View style={{ height: SH * 0.44, marginBottom: 18, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: 0, height: 0, alignItems: 'center', justifyContent: 'center' }, coreStyle]}>
          <GlowDisc color="#B39CE8" size={SW * 0.7} innerOpacity={0.4} />
        </Animated.View>
        <StoryBeatOrb />
      </View>
      <View style={{ paddingHorizontal: 34, alignItems: 'center' }}>
        <Animated.Text key={lineIdx} entering={FadeInUp.duration(420)} style={{ color: 'rgba(248,231,184,0.85)', fontSize: 16, fontWeight: '600', textAlign: 'center', lineHeight: 24 }}>
          {lines[Math.min(lineIdx, lines.length - 1)]}
        </Animated.Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 26 }}>
          {lines.map(function (_, i) {
            return <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i <= lineIdx ? '#E8C97A' : 'rgba(232,201,122,0.25)' }} />;
          })}
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  CHAPTER: IDENTITY REVEAL — the free, real reading
// ═══════════════════════════════════════════════════════════════════════

var RASHI_TO_ZODIAC_INDEX = { Mesha: 0, Vrishabha: 1, Mithuna: 2, Kataka: 3, Simha: 4, Kanya: 5, Tula: 6, Vrischika: 7, Dhanus: 8, Makara: 9, Kumbha: 10, Meena: 11 };

function IdentityChapter({ lang, reveal, onNext }) {
  var T = COPY[lang] || COPY.en;
  var zodiacImg = COSMOS_ZODIAC[reveal.lagna.english] || (ZODIAC_IMAGE_MAP ? ZODIAC_IMAGE_MAP[reveal.lagna.english] : null);
  var CARD_COLORS = { lagna: '#FFB800', nakshatra: '#A78BFA', moon: '#67E8F9', dasha: '#34D399' };
  var CARD_ICONS = { lagna: 'sunny-outline', nakshatra: 'star-outline', moon: 'moon-outline', dasha: 'hourglass-outline' };

  // THE LOCK — the wheel has landed on their sign: flash ring + scale punch
  var lockScale = useSharedValue(0.4);
  var flash = useSharedValue(0);
  useEffect(function () {
    lockScale.value = withDelay(350, withSpring(1, { damping: 9, stiffness: 150 }));
    flash.value = withDelay(350, withTiming(1, { duration: 1100, easing: EASE_EXPO }));
  }, []);
  var lockStyle = useAnimatedStyle(function () {
    return { transform: [{ scale: lockScale.value }] };
  });
  var flashStyle = useAnimatedStyle(function () {
    return {
      opacity: interpolate(flash.value, [0, 0.25, 1], [0, 0.85, 0]),
      transform: [{ scale: interpolate(flash.value, [0, 1], [0.6, 2.4]) }],
    };
  });

  var dashaLine = reveal.dasha && reveal.dasha.sinceYear
    ? T.dashaSince.replace('{year}', reveal.dasha.sinceYear).replace('{until}', reveal.dasha.until || '')
    : null;


  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.duration(600)} style={{ alignItems: 'center', marginBottom: 6 }}>
        <Text style={[p.kicker, { color: '#D9A441' }]}>{T.identityKicker}</Text>
        <Text style={[p.sub, { marginTop: 2, fontSize: 14.5, color: 'rgba(248,231,184,0.8)' }]}>{reveal.greeting}</Text>
      </Animated.View>

      {/* Lagna hero — the sign medallion alone, seated inside the great zodiac
          ring painted into this page's backdrop. No spinning wheel, no frame:
          the medallion is its own gold-ringed hero. */}
      <View style={{ alignItems: 'center', marginTop: SH * 0.07, marginBottom: 22 }}>
        <View style={{ width: 132, height: 132, alignItems: 'center', justifyContent: 'center' }}>
          {/* landing flash */}
          <Animated.View style={[{ position: 'absolute', width: 118, height: 118, borderRadius: 59, borderWidth: 2, borderColor: '#FFD666', backgroundColor: 'rgba(255,214,102,0.12)' }, flashStyle]} />
          <Animated.View style={[p.lagnaOrb, lockStyle]}>
            {zodiacImg
              ? <Image source={zodiacImg} style={{ width: 112, height: 112 }} resizeMode="contain" />
              : <Glyph name="planet" size={48} color="#FFD666" />}
          </Animated.View>
        </View>
        <Text style={{ marginTop: 14, fontSize: 11, fontWeight: '900', color: 'rgba(248,231,184,0.45)', letterSpacing: 2.2 }}>{T.lagnaLabel}</Text>
        <Text style={{ fontSize: 34, fontWeight: '900', color: '#FFD666', marginTop: 4, ...textShadow('rgba(255,184,0,0.5)', { width: 0, height: 0 }, 18) }}>
          {lang === 'si' ? reveal.lagna.sinhala : reveal.lagna.english}
        </Text>
        <Text style={{ fontSize: 13, color: 'rgba(248,231,184,0.5)', marginTop: 3 }}>
          {lang === 'si' ? reveal.lagna.english : reveal.lagna.sinhala} · {reveal.lagna.degree}°
        </Text>
        <View style={p.nakBadge}>
          <Glyph name="star" size={12} color="#C4B5FD" />
          <Text style={{ color: '#C4B5FD', fontSize: 12.5, fontWeight: '700' }}>
            {T.nakshatraLabel}: {lang === 'si' ? reveal.nakshatra.sinhala : reveal.nakshatra.name} · {lang === 'si' ? 'පාද ' : 'Pada '}{reveal.nakshatra.pada}
          </Text>
        </View>
      </View>

      {/* Identity read cards */}
      {(reveal.identity || []).map(function (item, i) {
        var color = CARD_COLORS[item.kind] || '#FFB800';
        return (
          <Animated.View key={item.kind} entering={FadeInUp.delay(900 + i * 420).duration(650)}>
            <Card style={{ marginBottom: 12, borderColor: color + '22' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: color + '16', borderWidth: 1, borderColor: color + '38', alignItems: 'center', justifyContent: 'center' }}>
                  <Glyph name={CARD_ICONS[item.kind] || 'sparkles-outline'} size={15} color={color} />
                </View>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '800', color: '#FFF1D0' }}>{item.title}</Text>
              </View>
              <Text style={{ fontSize: 13.5, lineHeight: 21, color: 'rgba(255,244,214,0.78)' }}>{item.text}</Text>
              {item.kind === 'dasha' && dashaLine ? (
                <Text style={{ marginTop: 8, fontSize: 12, fontWeight: '700', color: color }}>{dashaLine}</Text>
              ) : null}
            </Card>
          </Animated.View>
        );
      })}

      <Animated.View entering={FadeInUp.delay(2300).duration(600)} style={{ marginTop: 12 }}>
        <PrimaryButton label={T.identityCta} onPress={onNext} icon="telescope-outline" />
      </Animated.View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  CHAPTER: LAGNA PATHA — the actual birth chart, free to keep
// ═══════════════════════════════════════════════════════════════════════

function ChartChapter({ lang, reveal, birthData, onNext }) {
  var T = COPY[lang] || COPY.en;
  var resp = useResponsive();

  var subline = useMemo(function () {
    var d = new Date(birthData.dateTime);
    var months = lang === 'si' ? MONTHS_SHORT_SI : MONTHS_SHORT_EN;
    var dateLabel = d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    var placeLabel = (birthData.locationName || '').split(',')[0];
    return T.chartSub.replace('{place}', placeLabel).replace('{date}', dateLabel);
  }, [lang, birthData]);

  var chartSize = Math.min(SW - 48, resp.isSmall ? 320 : 380);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 14, paddingBottom: 28, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.duration(600)} style={{ alignItems: 'center', marginBottom: 14 }}>
        <Text style={[p.kicker, { color: '#FFB800' }]}>{T.chartKicker}</Text>
        <Text style={[p.title, { fontSize: 22 }]}>{T.chartTitle}</Text>
        <Text style={p.sub}>{subline}</Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(400).duration(900)} style={{ alignItems: 'center' }}>
        <SriLankanChart
          rashiChart={reveal.rashiChart}
          lagnaRashiId={reveal.lagnaRashiId}
          language={lang}
          chartSize={chartSize}
        />
      </Animated.View>

      <Animated.View entering={FadeIn.delay(1100).duration(700)} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14, backgroundColor: 'rgba(52,211,153,0.07)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.2)' }}>
        <Glyph name="gift-outline" size={14} color="#34D399" />
        <Text style={{ color: '#6EE7B7', fontSize: 12, fontWeight: '700' }}>{T.chartNote}</Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(1500).duration(600)} style={{ marginTop: 20, width: '100%' }}>
        <PrimaryButton label={T.chartCta} onPress={onNext} icon="telescope-outline" />
      </Animated.View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  CHAPTER: FUTURE — the cliffhanger. Real dates, locked content.
// ═══════════════════════════════════════════════════════════════════════

function LockedTeaseLines({ color }) {
  // three shimmering "blurred" bars standing in for the locked guidance
  var widths = ['92%', '78%', '55%'];
  return (
    <View style={{ marginTop: 10, gap: 7 }}>
      {widths.map(function (w, i) {
        return (
          <View key={i} style={{ width: w, height: 9, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <LinearGradient colors={['transparent', color + '20', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} />
          </View>
        );
      })}
    </View>
  );
}

function FutureChapter({ lang, reveal, displayName, onNext }) {
  var T = COPY[lang] || COPY.en;
  var title = T.futureTitle.replace('{name}', displayName || (lang === 'si' ? 'මිත්‍රයා' : 'Friend'));
  var cards = reveal.futureCards || [];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 14, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.duration(600)} style={{ alignItems: 'center', marginBottom: 16 }}>
        <Text style={[p.kicker, { color: '#A78BFA' }]}>{T.futureKicker}</Text>
        <Text style={[p.title, { fontSize: 22 }]}>{title}</Text>
        <Text style={p.sub}>{T.futureSub}</Text>
      </Animated.View>

      {cards.map(function (card, i) {
        var isFree = card.locked === false;
        return (
          <Animated.View key={card.id} entering={FadeInUp.delay(350 + i * 240).duration(600)}>
            <View style={[p.futureCard, { borderColor: card.color + (isFree ? '55' : '30') }]}>
              <LinearGradient colors={[card.color + (isFree ? '16' : '0E'), 'rgba(255,255,255,0.01)']} style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {DOMAIN_CARD_ART[card.id] ? (
                  <View style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }}>
                    <Image source={DOMAIN_CARD_ART[card.id]} style={{ width: 46, height: 46, opacity: isFree ? 1 : 0.55 }} resizeMode="contain" />
                  </View>
                ) : (
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: card.color + '16', borderWidth: 1, borderColor: card.color + '40', alignItems: 'center', justifyContent: 'center' }}>
                    <Glyph name={card.icon || 'sparkles-outline'} size={18} color={card.color} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '900', color: card.color, letterSpacing: 1.4, textTransform: 'uppercase' }}>{card.domain}</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFF1D0', marginTop: 2 }}>{card.title}</Text>
                </View>
                {isFree ? (
                  <View style={[p.lockPill, { backgroundColor: 'rgba(52,211,153,0.10)', borderColor: 'rgba(52,211,153,0.35)' }]}>
                    <Glyph name="lock-open" size={10} color="#6EE7B7" />
                    <Text style={{ fontSize: 8.5, fontWeight: '900', color: '#6EE7B7', letterSpacing: 1 }}>{T.freeLabel}</Text>
                  </View>
                ) : (
                  <View style={p.lockPill}>
                    <Glyph name="lock-closed" size={10} color="rgba(255,214,102,0.9)" />
                    <Text style={{ fontSize: 8.5, fontWeight: '900', color: 'rgba(255,214,102,0.9)', letterSpacing: 1 }}>{T.lockedLabel}</Text>
                  </View>
                )}
              </View>
              {/* THE REAL DATE — the hook stays visible */}
              <View style={[p.windowPill, { borderColor: card.color + '45', backgroundColor: card.color + '10' }]}>
                <Glyph name="calendar-outline" size={13} color={card.color} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFF6DC' }}>{card.window}</Text>
              </View>
              {isFree ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={{ fontSize: 13, lineHeight: 20, color: 'rgba(255,244,214,0.8)' }}>{card.tease}</Text>
                  {card.guidance ? (
                    <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: card.color + '22' }}>
                      <Text style={{ fontSize: 9, fontWeight: '900', color: '#6EE7B7', letterSpacing: 1.4, marginBottom: 5 }}>{T.freeGuidanceKicker}</Text>
                      <Text style={{ fontSize: 13, lineHeight: 20, color: 'rgba(255,244,214,0.8)' }}>{card.guidance}</Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <LockedTeaseLines color={card.color} />
              )}
            </View>
          </Animated.View>
        );
      })}

      <Animated.View entering={FadeInUp.delay(350 + cards.length * 240 + 300).duration(600)} style={{ marginTop: 14 }}>
        <PrimaryButton label={T.futureCta} onPress={onNext} icon="lock-open-outline" />
        <Text style={[p.hint, { marginTop: 12 }]}>{T.futureFootnote}</Text>
      </Animated.View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  CHAPTER: SIGN-IN — save the reading
// ═══════════════════════════════════════════════════════════════════════

function SignInChapter({ lang, isReturningUser, onDone, onBack }) {
  var T = COPY[lang] || COPY.en;
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState('');
  var { signInWithGoogle } = useAuth();

  var title = isReturningUser ? T.signinReturningTitle : T.signinTitle;
  var subtitle = isReturningUser ? T.signinReturningSub : T.signinSub;

  var handleSignIn = async function () {
    setLoading(true); setError('');
    try {
      var result = await signInWithGoogle();
      if (result && result.cancelled) { setLoading(false); return; }
      onDone();
    } catch (e) {
      if (__DEV__) console.error('Google sign-in error:', e);
      setError((e && e.message) || 'Sign-in failed. Please try again.');
    } finally { setLoading(false); }
  };

  var cards = isReturningUser ? [
    { icon: 'reload-outline', color: '#A78BFA', title: lang === 'si' ? 'ඔබේ සටහන ලබා ගන්න' : 'Restore Your Chart', desc: lang === 'si' ? 'කේන්දරය සහ පලාපල ආයෙත්' : 'Birth chart & predictions await' },
    { icon: 'sync-outline', color: '#34D399', title: lang === 'si' ? 'සියලුම උපාංග' : 'All Devices', desc: lang === 'si' ? 'ඕනෑම තැනකින් ප්‍රවේශ වන්න' : 'Access from anywhere securely' },
  ] : [
    { icon: 'timer-outline', color: '#FF6B9D', title: T.signinCard1Title, desc: T.signinCard1Desc },
    { icon: 'shield-checkmark-outline', color: '#34D399', title: T.signinCard2Title, desc: T.signinCard2Desc },
  ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 26, paddingVertical: 24 }} showsVerticalScrollIndicator={false} bounces={false}>
      <Animated.View entering={FadeInDown.duration(600)} style={{ alignItems: 'center', marginBottom: 22 }}>
        {/* the golden gateway — drawn element, faded up behind the mark */}
        {/* this page's backdrop IS the gateway, so no second arch behind the
            emblem — it just doubled up and crowded the logo */}
        <View style={p.signinOrb}>
          <Image source={ELEMENTS.logo} style={{ width: 76, height: 76 }} resizeMode="contain" fadeDuration={0} />
        </View>
        <Text style={[p.title, { marginTop: 16 }]}>{title}</Text>
        <Text style={p.sub}>{subtitle}</Text>
      </Animated.View>

      <View style={{ gap: 9, marginBottom: 22 }}>
        {cards.map(function (card, i) {
          return (
            <Animated.View key={i} entering={FadeInUp.delay(300 + i * 120).duration(450)}>
              <View style={p.valueCard}>
                <LinearGradient colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)']} style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <View style={[p.valueCardIcon, { backgroundColor: card.color + '14', borderColor: card.color + '30' }]}>
                  <Glyph name={card.icon} size={18} color={card.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF1D0' }}>{card.title}</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{card.desc}</Text>
                </View>
              </View>
            </Animated.View>
          );
        })}
      </View>

      {error ? (
        <Animated.View entering={FadeInDown.duration(300)} style={p.errorWrap}>
          <Glyph name="alert-circle" size={15} color="#FF6B6B" />
          <Text style={p.errorWrapText}>{error}</Text>
        </Animated.View>
      ) : null}

      <SpringPressable onPress={handleSignIn} disabled={loading} haptic="heavy" scalePressed={0.97} style={{ borderRadius: 18, overflow: 'hidden', opacity: loading ? 0.5 : 1 }}>
        <View style={p.googleBtn}>
          <LinearGradient colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', pointerEvents: 'none' }} />
          {loading ? <CosmicLoader size={22} color="#FFF" /> : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={p.googleLogoWrap}><Text style={{ fontSize: 14, fontWeight: '900', color: '#4285F4' }}>G</Text></View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3, flex: 1 }}>{T.signinBtn}</Text>
              <Glyph name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
            </View>
          )}
        </View>
      </SpringPressable>

      <View style={p.trustRow}>
        <View style={p.trustItem}><Glyph name="shield-checkmark" size={13} color="#34D399" /><Text style={p.trustText}>{T.trustVerified}</Text></View>
        <View style={p.trustDot} />
        <View style={p.trustItem}><Glyph name="lock-closed" size={12} color="#A78BFA" /><Text style={p.trustText}>{T.trustEncrypted}</Text></View>
        <View style={p.trustDot} />
        <View style={p.trustItem}><Glyph name="eye-off" size={12} color="#FFB800" /><Text style={p.trustText}>{T.trustPrivate}</Text></View>
      </View>

      {onBack ? <GhostButton label={T.back} onPress={onBack} /> : null}
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  CHAPTER: COMPLETE
// ═══════════════════════════════════════════════════════════════════════

function CompleteChapter({ lang, onDone }) {
  var T = COPY[lang] || COPY.en;
  var scale = useSharedValue(0.7);

  useEffect(function () {
    scale.value = withSpring(1, { damping: 12, stiffness: 120 });
    var t = setTimeout(function () { if (onDone) onDone(); }, 2200);
    return function () { clearTimeout(t); };
  }, []);

  var sealStyle = useAnimatedStyle(function () {
    return { transform: [{ scale: scale.value }] };
  });

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 }}>
      {/* radiant drawn seal blooming behind the sparkle */}
      <View pointerEvents="none" style={{ position: 'absolute', width: SW * 0.95, height: SW * 0.95, alignItems: 'center', justifyContent: 'center' }}>
        <FloatElement source={ELEMENTS.seal} w={SW * 0.9} glow={false} delay={0} floatRange={3} floatPeriod={6000} opacity={0.92} />
      </View>
      <Animated.View style={[{ width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(217,164,65,0.10)', borderWidth: 1, borderColor: 'rgba(217,164,65,0.32)' }, sealStyle]}>
        <Glyph name="sparkles" size={40} color="#FFD666" />
      </Animated.View>
      <Animated.Text entering={FadeInUp.delay(250).duration(500)} style={{ fontSize: 26, fontWeight: '900', color: '#FFB800', marginTop: 20, textAlign: 'center', ...textShadow('rgba(255,184,0,0.5)', { width: 0, height: 0 }, 16) }}>
        {T.completeTitle}
      </Animated.Text>
      <Animated.View entering={FadeIn.delay(600).duration(500)} style={{ marginTop: 26, alignItems: 'center' }}>
        <CosmicLoader size={48} color="#FFB800" text={T.completeSub} textColor="#FFD666" />
      </Animated.View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN — chapter state machine
// ═══════════════════════════════════════════════════════════════════════

var CHAPTERS = ['language', 'name', 'story', 'date', 'time', 'place', 'casting', 'identity', 'chart', 'future', 'signin', 'complete'];

export default function OnboardingScreen({ onComplete, isReturningUser }) {
  var { language: ctxLang, switchLanguage } = useLanguage();
  var { colors } = useTheme();
  var { completeOnboarding } = useAuth();
  var insets = useSafeAreaInsets();

  var [chapter, setChapter] = useState(isReturningUser ? 'signin' : 'language');
  var [lang, setLang] = useState(ctxLang || 'si');
  var [displayName, setDisplayName] = useState('');
  var [dateParts, setDateParts] = useState(null);
  var [timeParts, setTimeParts] = useState(null);
  var [birthCity, setBirthCity] = useState(null);
  var [birthData, setBirthData] = useState(null);
  var [reveal, setReveal] = useState(null);
  var [rewardData, setRewardData] = useState(null);
  var [castError, setCastError] = useState(false);
  // returning users start at signin — no resume check needed for them
  var [resumeChecked, setResumeChecked] = useState(!!isReturningUser);
  // ref (not state) so `go` closures captured in child effects never go stale
  var transitioningRef = useRef(false);
  var curtain = useSharedValue(0);
  var sweep = useSharedValue(0);
  var T = COPY[lang] || COPY.en;

  // RESUME — the reveal (with name + birth data) is persisted the moment
  // casting succeeds. If the app was killed mid-funnel (sign-in / paywall
  // step), fast-forward past the typing instead of restarting at "Select
  // Language" with everything lost. 48h freshness cap keeps the sign-in
  // screen's "unsaved readings disappear" promise honest.
  useEffect(function () {
    if (isReturningUser) return;
    var cancelled = false;
    AsyncStorage.getItem(REVEAL_STORAGE_KEY)
      .then(function (raw) {
        if (cancelled || !raw) return;
        var saved = JSON.parse(raw);
        var fresh = saved && saved.savedAt && (Date.now() - saved.savedAt) < 48 * 3600 * 1000;
        if (fresh && saved.reveal && saved.birthData && saved.birthData.dateTime) {
          var savedLang = saved.language === 'en' ? 'en' : 'si';
          setLang(savedLang);
          switchLanguage(savedLang);
          setDisplayName(saved.displayName || '');
          setBirthData(saved.birthData);
          setReveal(saved.reveal);
          setChapter('identity');
        }
      })
      .catch(function () { /* corrupt cache — start fresh */ })
      .finally(function () { if (!cancelled) setResumeChecked(true); });
    return function () { cancelled = true; };
  }, []);

  var go = function (next) {
    if (transitioningRef.current) return;
    transitioningRef.current = true;
    // stardust rides ahead of the scene change
    sweep.value = 0;
    sweep.value = withTiming(1, { duration: 950, easing: Easing.inOut(Easing.cubic) });
    curtain.value = withTiming(1, { duration: 320, easing: Easing.inOut(Easing.cubic) });
    setTimeout(function () {
      setChapter(next);
      curtain.value = withDelay(90, withTiming(0, { duration: 480, easing: Easing.out(Easing.cubic) }));
      setTimeout(function () { transitioningRef.current = false; }, 560);
    }, 360);
  };

  var buildBirthData = function (city, tp) {
    var h = parseInt(tp.hour) || 12;
    if (tp.ampm === 'PM' && h < 12) h += 12;
    if (tp.ampm === 'AM' && h === 12) h = 0;
    if (tp.unknown) h = 12;
    var m = tp.unknown ? 0 : (parseInt(tp.minute) || 0);
    var pad = function (n) { return n.toString().padStart(2, '0'); };
    var dateTime = parseInt(dateParts.year) + '-' + pad(dateParts.month + 1) + '-' + pad(parseInt(dateParts.day)) + 'T' + pad(h) + ':' + pad(m) + ':00';
    return {
      dateTime: dateTime,
      lat: city.lat,
      lng: city.lng,
      locationName: city.name + (city.country ? ', ' + city.country : ''),
      countryCode: city.countryCode || 'LK',
      // no timezone here — the server resolves the real IANA zone from the
      // coordinates (a hardcoded Asia/Colombo mis-timed international pushes)
      timeUnknown: !!tp.unknown,
    };
  };

  var finishedRef = useRef(false);
  var finishOnboarding = async function () {
    if (finishedRef.current) return;
    finishedRef.current = true;
    try {
      await completeOnboarding(displayName, birthData, lang);
    } catch (e) {
      if (__DEV__) console.warn('completeOnboarding failed:', e);
    }
    go('complete');
  };

  var renderChapter = function () {
    // hold the first paint for the (fast) resume check — prevents a flash
    // of the language chapter before a resumed session jumps to identity
    if (!resumeChecked) return null;
    switch (chapter) {
      case 'language':
        return (
          <LanguageChapter onSelect={function (code) {
            setLang(code);
            switchLanguage(code);
            go('name');
          }} />
        );
      case 'name':
        // the sage's first question — everything after this carries their name
        return (
          <NameChapter lang={lang} initial={displayName} onNext={function (n) {
            setDisplayName(n);
            go('story');
          }} onBack={function () { go('language'); }} />
        );
      case 'story':
        return <StoryChapter lang={lang} displayName={displayName} onDone={function () { go('date'); }} />;
      case 'date':
        return (
          <DateChapter lang={lang} initial={dateParts} onNext={function (d) {
            setDateParts(d);
            // instant payoff: nights lived under this sky + the weekday they arrived
            var bd = new Date(parseInt(d.year), d.month, parseInt(d.day));
            var days = Math.max(1, Math.floor((Date.now() - bd.getTime()) / 86400000));
            setRewardData({
              next: 'time',
              big: days.toLocaleString(),
              kicker: T.rewardDateKicker,
              line: T.rewardDateLine,
              sub: T.rewardDateWeekday.replace('{weekday}', T.weekdays[bd.getDay()]),
            });
          }} onBack={function () { go('name'); }} />
        );
      case 'time':
        return (
          <TimeChapter lang={lang} initial={timeParts} onNext={function (t) {
            setTimeParts(t);
            // instant payoff: the hour is sealed — the lagna can be found
            setRewardData({
              next: 'place',
              icon: t.unknown ? 'moon-outline' : 'medal-outline',
              kicker: T.rewardTimeKicker,
              line: t.unknown ? T.rewardTimeUnknownLine : T.rewardTimeLine,
            });
          }} onBack={function () { go('date'); }} />
        );
      case 'place':
        return (
          <PlaceChapter lang={lang} initial={birthCity} errorNote={castError ? T.castError : null} onNext={function (city) {
            setCastError(false);
            setBirthCity(city);
            var bd = buildBirthData(city, timeParts || { hour: '', minute: '', ampm: 'PM', unknown: true });
            setBirthData(bd);
            go('casting');
          }} onBack={function () { go('time'); }} />
        );
      case 'casting':
        return (
          <CastingChapter
            lang={lang} birthData={birthData} displayName={displayName}
            onDone={function (r) { setReveal(r); go('identity'); }}
            onError={function () { setCastError(true); go('place'); }}
          />
        );
      case 'identity':
        return <IdentityChapter lang={lang} reveal={reveal} onNext={function () { go('chart'); }} />;
      case 'chart':
        return <ChartChapter lang={lang} reveal={reveal} birthData={birthData} onNext={function () { go('future'); }} />;
      case 'future':
        return <FutureChapter lang={lang} reveal={reveal} displayName={displayName} onNext={function () { go('signin'); }} />;
      case 'signin':
        return (
          <SignInChapter
            lang={lang} isReturningUser={isReturningUser}
            onDone={function () {
              if (isReturningUser) { if (onComplete) onComplete(); return; }
              // No paywall inside onboarding — sign-in completes the funnel
              // and the user lands in the app. Monetization happens through
              // the global once-a-day wall and contextual paywalls, which
              // also sidesteps the "already subscribed" trap that blocked
              // subscribed re-installers here.
              finishOnboarding();
            }}
            onBack={isReturningUser ? null : function () { go('future'); }}
          />
        );
      case 'complete':
        return <CompleteChapter lang={lang} onDone={onComplete} />;
      default:
        return <LanguageChapter onSelect={function (code) { setLang(code); switchLanguage(code); go('name'); }} />;
    }
  };

  // thin narrative progress — only during the input→signin stretch
  // (story=~11% … signin=100%)
  var chapterIdx = CHAPTERS.indexOf(chapter);
  var showProgress = !isReturningUser && chapterIdx >= 2 && chapterIdx <= 10;
  var progress = showProgress ? (chapterIdx - 1) / 9 : 0;

  // Three painted acts, each its own shadow-box backdrop:
  //   I  the mystic shrine (language → story), II the arch (date → casting),
  //   III the zodiac ring (identity → complete). Story runs the live parallax
  //   scene; the rest sit on a calmer parallax backdrop so content stays legible.
  var ACT_OF = {
    language: 1, name: 1, story: 1,
    date: 2, time: 2, place: 2, casting: 2,
    identity: 3, chart: 3, future: 3, signin: 3, complete: 3,
  };
  // Every chapter has its own dedicated backdrop; only the story runs the live
  // parallax scene (its per-beat heroes need the animated sky).
  var CHAPTER_BG = {
    language: SCENE_MYSTIC.bgLanguage,
    name: SCENE_MYSTIC.bgName,
    date: SCENE_MYSTIC.bgDate,
    time: SCENE_MYSTIC.bgTime,
    place: SCENE_MYSTIC.bgPlace,
    casting: SCENE_MYSTIC.bgCasting,
    identity: SCENE_MYSTIC.bgReveal,
    chart: SCENE_MYSTIC.bgChart,
    future: SCENE_MYSTIC.bgFuture,
    signin: SCENE_MYSTIC.bgSignin,
    complete: SCENE_MYSTIC.bgComplete,
  };
  var act = ACT_OF[chapter] || 1;
  var centeredContent = chapter !== 'story';

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <StatusBar barStyle={colors.statusBarStyle} translucent backgroundColor="transparent" />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {chapter === 'story' ? (
          <PuppetScene scene={SCENE_MYSTIC} showMystic={false} />
        ) : (
          <SceneBg
            src={CHAPTER_BG[chapter] || (act === 2 ? SCENE_MYSTIC.bgInput : SCENE_MYSTIC.bgReveal)}
            rotate={chapter === 'identity'}
          />
        )}
        {/* centered-content chapters dim the busy backdrop for legibility;
            the story overlays its own bottom scrim instead */}
        {centeredContent ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(4,2,14,0.52)' }]} />
        ) : null}
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: 'transparent', overflow: 'hidden' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
      >
        <View style={{ flex: 1, paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 12) }}>
          {showProgress ? (
            <Animated.View entering={FadeIn.duration(300)} style={{ paddingHorizontal: 26, paddingTop: 2, paddingBottom: 4 }}>
              <View style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                <View style={{ width: (progress * 100) + '%', height: '100%', borderRadius: 2, backgroundColor: '#E8C97A' }} />
              </View>
            </Animated.View>
          ) : null}
          <Animated.View style={{ flex: 1 }} key={chapter} entering={FadeIn.duration(520)}>
            {renderChapter()}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
      {/* candle-lit chamber closes at the edges */}
      <Vignette />
      {/* instant-payoff overlay between inputs */}
      {rewardData ? (
        <RewardMoment
          reward={rewardData}
          onDone={function () {
            var next = rewardData.next;
            setRewardData(null);
            go(next);
          }}
        />
      ) : null}
      <Curtain opacity={curtain} />
      <StardustSweep progress={sweep} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════════════

var p = StyleSheet.create({
  kicker: { fontSize: 11, fontWeight: '900', color: '#D9A441', letterSpacing: 2.6, textTransform: 'uppercase', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#F8E7B8', textAlign: 'center', lineHeight: 31, letterSpacing: 0.2 },
  sub: { fontSize: 13.5, color: 'rgba(248,231,184,0.55)', textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: 6 },
  hint: { fontSize: 11.5, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 17, paddingHorizontal: 14 },
  error: { color: '#FF6B6B', fontSize: 12, marginTop: 10, textAlign: 'center', fontWeight: '600' },
  errorWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.20)' },
  errorWrapText: { color: '#FCA5A5', fontSize: 12, fontWeight: '600', flex: 1 },

  // ── Gilt shadow-box language: deep-indigo glass panels rimmed with a gold
  //    hairline and lifted on a soft gold+black glow, so every card reads as a
  //    lit paper-cut layer floating over the backdrop. ──
  card: { backgroundColor: 'rgba(22,15,44,0.66)', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(232,181,77,0.32)', overflow: 'hidden', ...boxShadow('rgba(0,0,0,0.5)', { width: 0, height: 12 }, 0.9, 24) },
  input: { backgroundColor: 'rgba(16,11,34,0.6)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 15 : 13, color: '#F4EAD0', fontSize: 16, fontWeight: '700', borderWidth: 1.2, borderColor: 'rgba(232,181,77,0.34)', textAlign: 'center', letterSpacing: 1 },
  inputLabel: { color: 'rgba(240,214,150,0.62)', fontSize: 10.5, fontWeight: '800', marginBottom: 8, letterSpacing: 1.6, textTransform: 'uppercase', textAlign: 'center' },

  // Premium single-line name field — hero of the name chapter. Indigo glass
  // with a gold hairline that ignites on focus.
  nameField: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(22,15,44,0.6)', borderRadius: 16, paddingHorizontal: 18, paddingVertical: Platform.OS === 'ios' ? 18 : 16, borderWidth: 1.5, borderColor: 'rgba(232,181,77,0.3)', overflow: 'hidden', ...boxShadow('rgba(0,0,0,0.45)', { width: 0, height: 10 }, 0.7, 20) },
  nameFieldFocus: { backgroundColor: 'rgba(30,22,58,0.66)', borderColor: 'rgba(246,213,132,0.8)', ...boxShadow('rgba(232,181,77,0.5)', { width: 0, height: 0 }, 0.95, 24) },
  nameFieldError: { borderColor: 'rgba(239,68,68,0.55)' },
  nameInput: { flex: 1, color: '#F4EAD0', fontSize: 17, fontWeight: '700', letterSpacing: 0.3, padding: 0, margin: 0 },
  errorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  errorInline: { color: '#FCA5A5', fontSize: 12.5, fontWeight: '600' },
  // Flanked-hairline overline — premium editorial kicker
  ornamentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  ornamentLine: { width: 30, height: 1, borderRadius: 1 },
  kickerOrn: { fontSize: 10.5, fontWeight: '800', color: '#E8C97A', letterSpacing: 2.2, textTransform: 'uppercase' },

  // "Tap to continue" — a glowing cosmic-glass pill (replaces faint text)
  tapPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 22, borderRadius: 999, backgroundColor: 'rgba(26,24,56,0.55)', borderWidth: 1, borderColor: 'rgba(232,201,122,0.42)', overflow: 'hidden', ...boxShadow('rgba(217,164,65,0.3)', { width: 0, height: 0 }, 0.85, 16) },
  tapPillText: { color: '#F0E0B0', fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },

  btnShadow: { borderRadius: 16, ...boxShadow('rgba(217,164,65,0.55)', { width: 0, height: 4 }, 0.85, 20) },
  btnGrad: { paddingVertical: 15, minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingHorizontal: 18, borderWidth: 1, borderColor: 'rgba(255,240,184,0.36)' },
  btnText: { fontSize: 15.5, fontWeight: '900', color: '#2A1707', letterSpacing: 0.5, textAlign: 'center' },

  langRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 17, paddingHorizontal: 18, borderRadius: 18, borderWidth: 1, backgroundColor: 'rgba(22,15,44,0.62)', ...boxShadow('rgba(0,0,0,0.4)', { width: 0, height: 8 }, 0.7, 16) },
  langIcon: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  storyBig: { fontSize: 28, fontWeight: '900', color: '#EFD9A8', lineHeight: 38, letterSpacing: 0.4, textAlign: 'center', ...textShadow('rgba(232,201,122,0.5)', { width: 0, height: 0 }, 16) },
  storySmall: { fontSize: 15.5, fontWeight: '500', color: 'rgba(248,231,184,0.62)', lineHeight: 25, textAlign: 'center', marginTop: 18, paddingHorizontal: 4 },
  storySmallWord: { fontSize: 15.5, fontWeight: '500', fontStyle: 'italic', color: 'rgba(233,213,166,0.78)', lineHeight: 25 },
  // Sinhala story copy runs far longer than English AND stacks combining
  // marks — smaller size but a GENEROUS line-height ratio (never tighten
  // line-height on Sinhala: it clips the mark tops), and zero letter-spacing
  // (never letter-space Sinhala).
  storyBigSi: { fontSize: 22, lineHeight: 34, letterSpacing: 0 },
  storySmallWordSi: { fontSize: 14, lineHeight: 23 },
  storyBigInk: { fontSize: 28, fontWeight: '900', color: '#2E2312', lineHeight: 38, letterSpacing: 0.3, textAlign: 'center' },
  storySmallInk: { fontSize: 15.5, fontWeight: '600', fontStyle: 'italic', color: 'rgba(46,35,18,0.8)', lineHeight: 25 },

  // ── Date page: engraved plaque, raised month tiles, gilt numeral fields ──
  plaque: { minWidth: '82%', paddingVertical: 16, paddingHorizontal: 22, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(14,9,30,0.78)', borderWidth: 1.2, borderColor: 'rgba(232,181,77,0.45)', overflow: 'hidden', ...boxShadow('rgba(0,0,0,0.55)', { width: 0, height: 12 }, 0.9, 22) },
  plaqueNum: { fontSize: 30, fontWeight: '900', color: '#F6D584', letterSpacing: 1.5, ...textShadow('rgba(232,181,77,0.5)', { width: 0, height: 0 }, 16) },
  plaqueMon: { fontSize: 25, fontWeight: '800', color: '#F6D584', letterSpacing: 1.2, textTransform: 'uppercase', ...textShadow('rgba(232,181,77,0.45)', { width: 0, height: 0 }, 14) },
  plaqueSep: { fontSize: 22, fontWeight: '700', color: 'rgba(232,181,77,0.45)' },
  plaqueDim: { color: 'rgba(242,231,201,0.24)', textShadowColor: 'transparent' },

  fieldLabel: { color: 'rgba(240,214,150,0.66)', fontSize: 10.5, fontWeight: '800', marginBottom: 8, letterSpacing: 1.8, textTransform: 'uppercase', textAlign: 'center' },
  monthTile: { paddingVertical: 12, borderRadius: 13, backgroundColor: 'rgba(30,22,54,0.6)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(232,181,77,0.2)', overflow: 'hidden' },
  monthTileSel: { borderColor: '#F6D584', borderWidth: 1.4, backgroundColor: 'rgba(232,181,77,0.16)', ...boxShadow('rgba(232,181,77,0.55)', { width: 0, height: 0 }, 0.9, 14) },
  monthTileText: { color: 'rgba(242,231,201,0.62)', fontSize: 12.5, fontWeight: '700', letterSpacing: 0.3 },
  monthTileTextSel: { color: '#F9E6B4', fontWeight: '900' },
  giltField: { borderRadius: 14, backgroundColor: 'rgba(16,11,34,0.66)', borderWidth: 1.3, borderColor: 'rgba(232,181,77,0.3)', overflow: 'hidden', ...boxShadow('rgba(0,0,0,0.45)', { width: 0, height: 8 }, 0.7, 16) },
  giltFieldFocus: { borderColor: 'rgba(246,213,132,0.85)', backgroundColor: 'rgba(26,18,50,0.72)', ...boxShadow('rgba(232,181,77,0.5)', { width: 0, height: 0 }, 0.95, 20) },
  giltInput: { paddingVertical: Platform.OS === 'ios' ? 16 : 13, paddingHorizontal: 12, color: '#F6D584', fontSize: 24, fontWeight: '900', letterSpacing: 2.5, textAlign: 'center' },
  timeColon: { color: 'rgba(232,181,77,0.55)', fontSize: 26, fontWeight: '900', paddingBottom: 14 },
  ampmTile: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(30,22,54,0.6)', borderWidth: 1, borderColor: 'rgba(232,181,77,0.2)', overflow: 'hidden' },
  ampmTileSel: { borderColor: '#F6D584', borderWidth: 1.4, backgroundColor: 'rgba(232,181,77,0.16)', ...boxShadow('rgba(232,181,77,0.5)', { width: 0, height: 0 }, 0.9, 14) },
  ampmTileText: { color: 'rgba(242,231,201,0.6)', fontSize: 15, fontWeight: '800', letterSpacing: 1.5 },
  ampmTileTextSel: { color: '#F9E6B4', fontWeight: '900' },

  monthChip: { width: '22.6%', paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(30,22,54,0.55)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(232,181,77,0.18)' },
  monthChipSel: { backgroundColor: 'rgba(232,181,77,0.2)', borderColor: '#E8B54D', ...boxShadow('rgba(232,181,77,0.4)', { width: 0, height: 0 }, 0.8, 12) },
  monthText: { color: 'rgba(242,231,201,0.6)', fontSize: 12.5, fontWeight: '700' },
  monthTextSel: { color: '#F6D584', fontWeight: '800' },

  ampmBtn: { paddingHorizontal: 32, paddingVertical: 13, borderRadius: 14, backgroundColor: 'rgba(30,22,54,0.55)', borderWidth: 1, borderColor: 'rgba(232,181,77,0.18)' },
  ampmSel: { backgroundColor: 'rgba(30,127,142,0.24)', borderColor: '#3FB6C6', ...boxShadow('rgba(63,182,198,0.4)', { width: 0, height: 0 }, 0.8, 12) },
  ampmText: { color: 'rgba(242,231,201,0.6)', fontSize: 16, fontWeight: '700' },
  ampmTextSel: { color: '#8CE0EC' },

  cityBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginTop: 12, backgroundColor: 'rgba(30,127,142,0.14)', borderWidth: 1, borderColor: 'rgba(63,182,198,0.35)' },
  cityBadgeText: { color: '#8CE0EC', fontSize: 14, fontWeight: '700', flex: 1 },
  cityBadgeCoords: { color: 'rgba(242,231,201,0.4)', fontSize: 11 },

  lagnaOrb: { width: 148, height: 148, alignItems: 'center', justifyContent: 'center', ...boxShadow('rgba(232,181,77,0.5)', { width: 0, height: 0 }, 0.7, 30) },
  nakBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(167,139,250,0.09)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)' },

  futureCard: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 12, backgroundColor: 'rgba(20,13,40,0.72)', overflow: 'hidden', ...boxShadow('rgba(0,0,0,0.45)', { width: 0, height: 10 }, 0.8, 18) },
  lockPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: 'rgba(232,181,77,0.1)', borderWidth: 1, borderColor: 'rgba(232,181,77,0.28)' },
  windowPill: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', marginTop: 12, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1 },

  // no disc, no ring — just the emblem with a soft warm halo behind it
  signinOrb: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center', ...boxShadow('rgba(232,181,77,0.45)', { width: 0, height: 0 }, 0.55, 26) },
  valueCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(232,181,77,0.22)', backgroundColor: 'rgba(22,15,44,0.55)', overflow: 'hidden', ...boxShadow('rgba(0,0,0,0.4)', { width: 0, height: 8 }, 0.6, 14) },
  valueCardIcon: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  googleBtn: { backgroundColor: 'rgba(255,252,246,0.12)', paddingVertical: 17, paddingHorizontal: 22, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(246,213,132,0.45)', ...boxShadow('rgba(232,181,77,0.3)', { width: 0, height: 0 }, 0.6, 18) },
  googleLogoWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', ...boxShadow('rgba(0,0,0,0.2)', { width: 0, height: 1 }, 0.8, 4) },
  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trustDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.15)' },
  trustText: { fontSize: 11, color: 'rgba(255,220,180,0.4)', fontWeight: '600' },
});
