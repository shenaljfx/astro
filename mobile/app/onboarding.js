/**
 * Onboarding — Cinematic Story Funnel (v2)
 *
 * A conversion-first, story-driven flow. Every tap advances a narrative
 * that ends at a personalized paywall built from the user's REAL chart.
 *
 * Chapters:
 *   language → story → name → date → time → place
 *   → casting (server computes real chart — no AI, instant)
 *   → identity (free reveal: lagna / nakshatra / current dasha)
 *   → future  (cliffhanger: locked windows with REAL dates)
 *   → signin  ("save your reading")
 *   → paywall (personalized; soft decline → free tier)
 *   → complete
 *
 * Previous flow preserved at onboarding.backup.js for rollback.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Platform,
  Dimensions, KeyboardAvoidingView, ScrollView, StatusBar, Image, Linking,
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
import AwesomeRashiChakra from '../components/AwesomeRashiChakra';
import useReducedMotion from '../hooks/useReducedMotion';
import SpringPressable from '../components/effects/SpringPressable';
import CosmicLoader from '../components/effects/CosmicLoader';
import CitySearchPicker from '../components/CitySearchPicker';
import SriLankanChart from '../components/SriLankanChart';
import { getOnboardingReveal, logPaywallEvent } from '../services/api';
import { getOfferings, purchasePackage, purchaseOneTimeProduct, PRODUCT_IDS } from '../services/revenuecat';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import useResponsive from '../hooks/useResponsive';
import usePricingForBirth from '../hooks/usePricingForBirth';
import { boxShadow, textShadow } from '../utils/shadow';
import { ZODIAC_IMAGE_MAP } from '../components/ZodiacIcons';
import { APP_LOGO_IMAGE } from '../assets/logo-inline';

var { width: SW, height: SH } = Dimensions.get('window');

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
    // paywall
    paywallHeadline: '{name}, your {dasha} chapter needs a guide',
    paywallHeadlineNoName: 'Your {dasha} chapter needs a guide',
    paywallSub: 'Unlock every window in your timeline — with dates, guidance and daily readings built from your chart.',
    yourWindows: 'YOUR LOCKED WINDOWS',
    perMonth: '/month',
    cancelAnytime: 'Cancel anytime',
    feature1: 'Every timeline window — dated & explained',
    feature2: 'Daily guidance from your own chart',
    feature3: 'Maraka & Rahu Kalaya alerts',
    feature4: 'Ask the astrologer — unlimited chat',
    feature5: 'Full Porondam matching',
    agreePrefix: 'I agree to the ',
    agreeTerms: 'Terms & Conditions',
    agreeSuffix: '',
    agreeError: 'Please accept the Terms & Conditions to continue.',
    payFail: 'Payment could not be completed. Please try again.',
    payCta: 'Unlock My Timeline',
    riskReversal: 'If your reading doesn’t describe you accurately — cancel instantly, no questions',
    restore: 'Restore Purchases',
    restoring: 'Restoring…',
    restoreNone: 'No active subscription found',
    restoreFail: 'Restore failed. Please try again.',
    softDecline: 'Continue with limited access',
    // complete
    completeTitle: 'Your sky is saved',
    completeSub: 'Preparing your daily readings…',
  },
  si: {
    langTitle: 'Select Language',
    langSub: 'භාෂාව තෝරන්න',
    storyBeats: [
      { big: '{name} — මේ මොහොතේත්, විශ්වයේ මහා නවග්‍රහයින් ඔබට ඉහළින් නිහඬව සැරිසරනවා.', small: 'ඔබ මෙලොව උපන් ඒ උත්කෘෂ්ට රාත්‍රියේදීත් ඔවුන් පෙළගැසුණේ නැවත කිසිදා සිදුනොවන අද්විතීය තරු රටාවකටයි. ඒ මහා අහසේ අභිරහස් දශක ගණනාවක් තිස්සේ කියවූ ප්‍රාඥයෙක්, දැන් ඔබ එනතුරු බලා සිටිනවා.' },
      { big: 'සියවස් ගණනාවක අතීතයක සිටම, විශ්වයේ ලියවුණු ඔබේ ජීවන රටාව මේ ඉපැරණි පිටු අතර සැඟව පවතිනවා.', small: 'අතීත මහා සෘෂිවරුන් විසින් සෑම තරු පෙළගැස්මකම සැඟවුණු අර්ථයන් මෙහි සටහන් කර තැබුවා — ඔබ කවුද, ඔබේ ඉදිරි ගමන කුමක්ද කියා හෙළි කරමින්. ඔහු දැන් දිගහරින්නේ ඔබේ ඉරණම ලියැවුණු ඒ රහස් පිටුවයි.' },
      { big: 'ඔබ වෙනුවෙන්ම වෙන්වූ අලුත්ම පුස්කොළ පතක් දැන් සූදානම්... එහි ඉහළින්ම සටහන් වන්නේ ඔබේ නාමයයි.', small: 'සාම්ප්‍රදායික රේඛා අතරින් මතුවන්නේ මුළු විශ්වයේම වෙන කිසිදු මිනිසෙකුට හිමි නොවන ඔබේම අනන්‍ය තරු සිතියමයි. ඔබේ ජීවන ජන්ම පත්‍රයේ මහා අභිරහස් පරිච්ඡේදය මෙතැන් සිට ආරම්භ වනවා.' },
      { big: '{name}, අද රාත්‍රියේදී ඔබේ ඉරණම රැගත් මහා අහස ඔබට රහස් පවසන්නට සැරසෙනවා.', small: 'ඔබ ඉදිරියේ ඇති ප්‍රශ්න තුනකට පමණක් පිළිතුරු සපයන්න. ඉන්පසු, ඔහු ඔබේ අහසේ සැඟවුණු රහස් කියවීම ආරම්භ කරනු ඇති.' },
    ],
    tapToContinue: 'තට්ටු කරලා ඉදිරියට',
    begin: 'මගේ විශ්වීය ඉරණම කියවන්න',
    rewardDateKicker: 'මේ අහස යට ගෙවුණු රෑවල්',
    rewardDateLine: 'පාරක් ඔබට උඩින් අහස කැරකිලා — ඒ හැම එකක්ම අහසට මතකයි.',
    rewardDateWeekday: 'ඔබ ආවේ {weekday} දවසක.',
    rewardTimeKicker: 'වෙලාව මුද්‍රා වුණා',
    rewardTimeLine: 'දැන් ඔබේ ලග්නය හොයන්න පුළුවන්.',
    rewardTimeUnknownLine: 'වෙලාව නොදන්නා කේන්දර පරණ නැකැත්කරුවෝ බැලුවේ මධ්‍යාහ්නෙන්. අපිත් ඒ විදිහමයි.',
    weekdays: ['ඉරිදා', 'සඳුදා', 'අඟහරුවාදා', 'බදාදා', 'බ්‍රහස්පතින්දා', 'සිකුරාදා', 'සෙනසුරාදා'],
    nameKicker: 'ආරම්භය',
    nameTitle: 'මුලින්ම — ඔබේ නම.',
    nameSub: 'නමක් නොමැතිව කියවීමක් ආරම්භ කළ නොහැක. මෙතැන් සිට ලියවෙන සෑම වචනයක්ම ඔබ වෙනුවෙන්මයි.',
    namePlaceholder: 'ඔබේ මුල් නම',
    nameError: 'අවම වශයෙන් අකුරු දෙකක් ඇතුළත් කරන්න',
    dateTitle: 'ඔබේ අහස හැදුණු දවස',
    dateSub: 'උපන් දිනේ තමයි ග්‍රහයෝ තැන්වලට දාන්නේ.',
    yearLabel: 'වර්ෂය', dayLabel: 'දිනය', monthLabel: 'මාසය',
    yearError: 'නිවැරදි වර්ෂයක් (1900–2026)',
    monthError: 'මාසය තෝරන්න',
    dayError: 'නිවැරදි දිනයක් ඇතුළත් කරන්න',
    timeTitle: 'ඔබ ආපු වෙලාව',
    timeSub: 'නියම වෙලාවෙන් තමයි ලග්නය හැදෙන්නේ — ඒ මොහොතේ නැගෙනහිරෙන් උදාවුණු රාශිය.',
    timeError: 'හරි වෙලාවක් දාන්න',
    timeUnknown: 'වෙලාව මට මතක නෑ',
    timeUnknownNote: 'වෙලාව දන්නේ නැත්නම් කමක් නෑ — තරු ඒත් කතා කරනවා. පරණ නැකැත්කරුවෝ වගේ අපි මධ්‍යාහ්නෙන් කියවනවා.',
    placeTitle: 'ඔබ ඉපදුණේ මොන අහසක් යටද?',
    placeSub: 'ඉපදුණු තැන අනුව මුළු කේන්දරයම හැරෙනවා.',
    placeSearch: 'උපන් නගරය හොයන්න…',
    cityError: 'උපන් තැන තෝරන්න',
    continueBtn: 'ඉදිරියට',
    back: 'ආපසු',
    castingLines: [
      '{place}ට ඉහළින් විහිදුණු අහස සොයමින්…',
      '{date} වෙත කාලය ආපසු ගෙන යමින්…',
      'මහා නවග්‍රහයින් ඔවුන්ගේ ස්ථානවල පිහිටුවමින්…',
      'ඔබේ ලග්නය නිර්ණය කරමින්…',
      'ඔබේ ජීවන කාලරේඛාව කියවමින්…',
    ],
    castingDone: 'කියවීම සම්පූර්ණයි.',
    identityKicker: 'ඔබේ කියවීම',
    lagnaLabel: 'ලග්නය',
    nakshatraLabel: 'උපන් නැකත',
    dashaSince: 'මෙම දශා පරිච්ඡේදය ආරම්භ වූයේ {year} දීයි — එය {until} දක්වා පවතිනවා.',
    identityCta: 'මගේ ලග්න පත හෙළිදරව් කරන්න',
    chartKicker: 'ඔබේ ලග්න පත',
    chartTitle: 'අහස, එදා පැවති අයුරින්ම',
    chartSub: '{place} සඳහා — {date}. භාව දොළහක්, මහා නවග්‍රහයින්, නැවත කිසිදා නොඑන එකම මොහොතක්.',
    chartCta: 'ඊළඟට මා හමුවේ ඇත්තේ කුමක්ද?',
    chartNote: 'මෙම කේන්දරය ඔබේමයි — නොමිලේ, සදහටම.',
    futureKicker: 'ඔබේ කාලරේඛාව',
    futureTitle: '{name}, ඔබේ ඊළඟ ජීවන කවුළු සඳහා දිනයන් දැනටමත් නියම වී ඇත.',
    futureSub: 'මේවා පුවත්පත්වල පළවන සාමාන්‍ය ලග්න පලාපල නොවේ. ඔබ මෙලොව උපන් මොහොතේ සිටම ගණනය කරන ලද, ඔබේම ජීවන කාලරේඛාවේ සැබෑ පරිච්ඡේද වේ.',
    lockedLabel: 'අගුළු දමා ඇත',
    freeLabel: 'නොමිලේ',
    freeGuidanceKicker: 'මෙම කවුළුවේ මඟපෙන්වීම — නොමිලේ',
    futureCta: 'මගේ සම්පූර්ණ කාලරේඛාව විවෘත කරන්න',
    futureFootnote: 'පළමුව — ඔබේ කියවීම නැති නොවන පරිදි පිවිසෙන්න.',
    signinTitle: 'ඔබේ කියවීම සුරැකීමට සූදානම්ය',
    signinSub: 'මෙය දැනට ඇත්තේ මෙම තිරයේ පමණි. එක් වරක් පිවිසුණු පසු, ඔබේ කේන්දරය සදහටම සුරැකෙනවා.',
    signinBtn: 'Google සමඟ ඉදිරියට',
    signinCard1Title: 'ඉක්මනින් මැකී යයි', signinCard1Desc: 'නොසුරැකූ කියවීම් ස්ථිරවම මකා දැමේ',
    signinCard2Title: 'ස්ථිරව සුරකින්න', signinCard2Desc: 'එක් තට්ටුවකින් කේන්දරය සදහටම',
    trustVerified: 'Google තහවුරුයි', trustEncrypted: 'සංකේතිතයි', trustPrivate: 'පෞද්ගලිකයි',
    signinReturningTitle: 'නැවත සාදරයෙන්',
    signinReturningSub: 'ඔබේ කේන්දරය සහ පලාපල බැලීමට පිවිසෙන්න',
    paywallHeadline: '{name}, ඔබේ {dasha} පරිච්ඡේදයට මඟපෙන්වන්නෙක් අවශ්‍යයි',
    paywallHeadlineNoName: 'ඔබේ {dasha} පරිච්ඡේදයට මඟපෙන්වන්නෙක් අවශ්‍යයි',
    paywallSub: 'ඔබේ කාලරේඛාවේ සෑම කවුළුවක්ම විවෘත කරන්න — නියම දින, මඟපෙන්වීම් සහ ඔබේ කේන්දරයෙන්ම සැකසෙන දෛනික කියවීම් සමඟ.',
    yourWindows: 'ඔබේ අගුළු දැමූ කවුළු',
    perMonth: '/මාසයට',
    cancelAnytime: 'ඕනෑම විටෙක අවලංගු කරන්න',
    feature1: 'සෑම කාලරේඛා කවුළුවක්ම — නියම දින සහිතව පැහැදිලි කර',
    feature2: 'ඔබේම කේන්දරයෙන් දෛනික මඟපෙන්වීම',
    feature3: 'මාරක සහ රාහු කාල දැනුම්දීම්',
    feature4: 'නැකැත්කරුගෙන් විමසන්න — අසීමිත සංවාද',
    feature5: 'සම්පූර්ණ පොරොන්දම් ගැලපීම',
    agreePrefix: 'මම ',
    agreeTerms: 'නියමයන් සහ කොන්දේසිවලට',
    agreeSuffix: ' එකඟ වෙමි',
    agreeError: 'කරුණාකර නියමයන් සහ කොන්දේසි පිළිගෙන ඉදිරියට යන්න.',
    payFail: 'ගෙවීම සම්පූර්ණ කළ නොහැකි විය. නැවත උත්සාහ කරන්න.',
    payCta: 'මගේ කාලරේඛාව විවෘත කරන්න',
    riskReversal: 'ඔබේ කියවීම ඔබව නිවැරදිව විස්තර නොකරන්නේ නම් — ක්ෂණිකව අවලංගු කරන්න',
    restore: 'මිලදී ගැනීම් ප්‍රතිස්ථාපනය',
    restoring: 'ප්‍රතිස්ථාපනය වෙමින්…',
    restoreNone: 'ක්‍රියාකාරී දායකත්වයක් හමු නොවීය',
    restoreFail: 'ප්‍රතිස්ථාපනය අසාර්ථකයි. නැවත උත්සාහ කරන්න.',
    softDecline: 'සීමිත ප්‍රවේශයෙන් ඉදිරියට යන්න',
    completeTitle: 'ඔබේ අහස සුරැකුණා',
    completeSub: 'දෛනික කියවීම් සූදානම් වෙමින්…',
  },
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

function Starfield() {
  var layers = [[], [], []];
  STARS.forEach(function (s, i) {
    layers[s.layer].push(
      s.twinkle
        ? <TwinkleStar key={i} star={s} index={i} />
        : (
          <View
            key={i}
            style={[{
              position: 'absolute', left: s.x + '%', top: s.y + '%',
              width: s.size * 2, height: s.size * 2, borderRadius: s.size,
              backgroundColor: s.color, opacity: s.opacity,
            }, s.bloom ? boxShadow(s.color, { width: 0, height: 0 }, 0.85, s.size * 5) : null]}
          />
        )
    );
  });

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <LinearGradient
        colors={['#0B0A20', '#171335', '#0D0A24']}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
        start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
      />
      {/* colorful cosmic dust drifting behind the stars */}
      <CosmicDust />
      {/* the Milky Way — a tilted river of faint light */}
      <View style={{ position: 'absolute', top: SH * 0.02, left: -SW * 0.35, width: SW * 1.8, height: 230, transform: [{ rotate: '-24deg' }] }}>
        <LinearGradient
          colors={['transparent', 'transparent', 'rgba(196,181,253,0.03)', 'rgba(255,240,220,0.055)', 'rgba(196,181,253,0.03)', 'transparent', 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        />
        {MILKY_STARS.map(function (m, i) {
          return <View key={i} style={{ position: 'absolute', left: m.x + '%', top: (18 + m.y * 0.64) + '%', width: m.s * 2, height: m.s * 2, borderRadius: m.s, backgroundColor: '#F6E8C4', opacity: m.o * 0.8 }} />;
        })}
      </View>
      {/* three parallax star depths, each drifting at its own pace */}
      <DriftLayer range={6} period={26000}>{layers[0]}</DriftLayer>
      <DriftLayer range={13} period={19000}>{layers[1]}</DriftLayer>
      <DriftLayer range={22} period={13000}>{layers[2]}</DriftLayer>
      {/* real star patterns — draw in and sparkle (no labels) */}
      {CONSTELLATIONS.map(function (c, i) { return <ConstellationPattern key={i} c={c} ci={i} />; })}
      {/* bright 4-point sparkle stars */}
      {SPARKLES.map(function (s, i) { return <SparkleStar key={i} s={s} />; })}
      {/* one brilliant named-star with diffraction spikes */}
      <FlareStar x={SW * 0.78} y={SH * 0.12} size={26} />
      {/* distant temple & trees on the horizon, lamps burning */}
      <TempleSkyline />
      {/* candle-lit chamber ambience */}
      <ChamberGlow />
      {/* rising gold embers */}
      <EmberField />
      {/* golden streaks */}
      <ShootingStar topPct={14} delayMs={2500} travel={SW * 1.3} />
      <ShootingStar topPct={38} delayMs={12000} travel={SW * 1.2} />
      <ShootingStar topPct={58} delayMs={7000} travel={SW * 1.15} />
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

// An SVG fill path that "washes in" (fillOpacity ramps) after its stroke draws
var AInkFill = Animated.createAnimatedComponent(Path);
function InkFill({ d, fill, delay, to, duration }) {
  var t = useSharedValue(0);
  var reduced = useReducedMotion();
  useEffect(function () {
    if (reduced) { t.value = 1; return; }
    t.value = withDelay(delay || 0, withTiming(1, { duration: duration || 1100, easing: Easing.ease }));
  }, [reduced]);
  var animatedProps = useAnimatedProps(function () {
    return { fillOpacity: (to == null ? 1 : to) * t.value };
  });
  return <AInkFill d={d} fill={fill} animatedProps={animatedProps} />;
}

// A fill that "washes in" after the ink strokes have drawn
function InkWash({ delay, duration, to, children }) {
  var t = useSharedValue(0);
  var reduced = useReducedMotion();
  useEffect(function () {
    if (reduced) { t.value = 1; return; }
    t.value = withDelay(delay || 0, withTiming(1, { duration: duration || 1600, easing: Easing.ease }));
  }, [reduced]);
  var style = useAnimatedStyle(function () {
    return { opacity: (to || 1) * t.value };
  });
  return <Animated.View style={[StyleSheet.absoluteFill, style]}>{children}</Animated.View>;
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
//  THE SAGE — illustrated astrologer scenes, drawn and lit entirely in code
//  Filled layered silhouettes + gold rim light + living candle/moon glow.
// ═══════════════════════════════════════════════════════════════════════

var SAGE = {
  robeDark: '#0B1428',
  robeMid: '#16264A',
  robeLit: '#2A4076',
  sash: '#C9A35A',
  skin: '#D9BC85',
  beard: '#E5C88F',
  rim: '#E5C88F',
};

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

// Pins children centered on a point in the 360×400 scene space (percent-based,
// so overlays stay glued to the SVG drawing at any frame size)
function ScenePin({ x, y, children }) {
  return (
    <View style={{ position: 'absolute', left: vx(x), top: vy(y), width: 0, height: 0, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
      {children}
    </View>
  );
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

// Candle flame — teardrop core + halo, dancing with the flicker
function CandleFlame({ flicker, scale }) {
  var s = scale || 1;
  var style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(flicker.value, [0.7, 1], [0.75, 1]),
      transform: [
        { scaleY: interpolate(flicker.value, [0.7, 1], [0.82, 1.12]) },
        { scaleX: interpolate(flicker.value, [0.7, 1], [1.06, 0.94]) },
        { rotate: interpolate(flicker.value, [0.7, 1], [-4, 3]) + 'deg' },
      ],
    };
  });
  return (
    <Animated.View style={[{ alignItems: 'center', justifyContent: 'flex-end' }, style]}>
      <View style={{ width: 12 * s, height: 20 * s, borderRadius: 8 * s, backgroundColor: '#F59E0B', opacity: 0.92 }} />
      <View style={{ position: 'absolute', bottom: 2 * s, width: 6 * s, height: 11 * s, borderRadius: 4 * s, backgroundColor: '#FFF3C4' }} />
    </Animated.View>
  );
}

// Tiny gold glyph-sparks rising out of a glowing manuscript
function RisingGlyph({ x, y, delay, drift }) {
  var t = useSharedValue(0);
  var reduced = useReducedMotion();
  useEffect(function () {
    if (reduced) return;
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 4200, easing: Easing.out(Easing.quad) }), -1, false));
  }, [reduced]);
  var style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(t.value, [0, 0.15, 0.8, 1], [0, 0.9, 0.35, 0]),
      transform: [
        { translateY: interpolate(t.value, [0, 1], [0, -74]) },
        { translateX: interpolate(t.value, [0, 1], [0, drift]) },
        { scale: interpolate(t.value, [0, 1], [1, 0.5]) },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y, width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#FFD666', ...boxShadow('#FFB800', { width: 0, height: 0 }, 0.9, 6) }, style]} />
  );
}

// Shared scene frame: fixed 360×400 design space, measured so the overlay
// box EXACTLY matches the drawn SVG (percent pins stay glued to the art)
function SceneFrame({ children, svg }) {
  var [box, setBox] = useState(null);
  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}
      onLayout={function (e) {
        var l = e.nativeEvent.layout;
        var bw = Math.min(l.width, l.height * 360 / 400);
        setBox({ w: bw, h: bw * 400 / 360 });
      }}
    >
      {box ? (
        <View style={{ width: box.w, height: box.h }}>
          <Svg width="100%" height="100%" viewBox="0 0 360 400">{svg}</Svg>
          {children}
        </View>
      ) : null}
    </View>
  );
}

// px→% helpers for overlaying RN views onto the 360×400 viewBox
function vx(n) { return (n / 360 * 100) + '%'; }
function vy(n) { return (n / 400 * 100) + '%'; }

// Drifting cloud wisp — thin, slow, moonlit
function CloudWisp({ y, w, period, delay, opacity }) {
  var t = useSharedValue(0);
  var reduced = useReducedMotion();
  useEffect(function () {
    if (reduced) return;
    t.value = withDelay(delay || 0, withRepeat(withTiming(1, { duration: period, easing: Easing.linear }), -1, false));
  }, [reduced]);
  var style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(t.value, [0, 0.1, 0.9, 1], [0, opacity, opacity, 0]),
      transform: [{ translateX: interpolate(t.value, [0, 1], [-w, SW + w]) }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', top: y, left: 0, width: w, height: 14, borderRadius: 8 }, style]}>
      <LinearGradient colors={['transparent', 'rgba(200,195,220,0.5)', 'rgba(200,195,220,0.28)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, borderRadius: 8 }} />
    </Animated.View>
  );
}

// Firefly — tiny warm spark wandering near the ground
function Firefly({ x, y, delay }) {
  var t = useSharedValue(0);
  var reduced = useReducedMotion();
  useEffect(function () {
    if (reduced) return;
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduced]);
  var style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(t.value, [0, 0.3, 0.5, 0.8, 1], [0, 0.9, 0.2, 0.85, 0]),
      transform: [
        { translateX: interpolate(t.value, [0, 1], [0, 26]) },
        { translateY: interpolate(t.value, [0, 0.5, 1], [0, -16, -6]) },
      ],
    };
  });
  return (
    <ScenePin x={x} y={y}>
      <Animated.View style={[{ width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: '#D9F99D', ...boxShadow('#BEF264', { width: 0, height: 0 }, 0.9, 6) }, style]} />
    </ScenePin>
  );
}

// ── The crescent moon — smooth ivory crescent bathed in a wide soft
//    halo, like moonlight diffusing into the night (reference-matched) ──
function RealisticMoon({ size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        {/* layered halo — wide and gentle */}
        <RadialGradient id="cmHaloOuter" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#E9E2C8" stopOpacity="0.34" />
          <Stop offset="38%" stopColor="#D8D2BC" stopOpacity="0.14" />
          <Stop offset="72%" stopColor="#C9C4B4" stopOpacity="0.05" />
          <Stop offset="100%" stopColor="#C9C4B4" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="cmHaloInner" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#F3EDD6" stopOpacity="0.5" />
          <Stop offset="60%" stopColor="#EDE6CC" stopOpacity="0.12" />
          <Stop offset="100%" stopColor="#EDE6CC" stopOpacity="0" />
        </RadialGradient>
        {/* near-flat ivory body with the faintest breathing of tone */}
        <RadialGradient id="cmBody" cx="38%" cy="36%" r="80%">
          <Stop offset="0%" stopColor="#FAF5DE" />
          <Stop offset="55%" stopColor="#F3ECD0" />
          <Stop offset="100%" stopColor="#E4DAB4" />
        </RadialGradient>
      </Defs>
      {/* the wide moonlight halo */}
      <Circle cx="60" cy="60" r="60" fill="url(#cmHaloOuter)" />
      <Circle cx="60" cy="60" r="38" fill="url(#cmHaloInner)" />
      {/* the crescent — fat ivory arc opening to the right, gently tilted */}
      <G rotation="16" origin="60,60">
        <Path
          d="M 66 26 A 36 36 0 1 0 66 94 A 42 42 0 0 1 66 26 Z"
          fill="url(#cmBody)"
        />
        {/* whisper of surface tone, barely there */}
        <Ellipse cx="40" cy="52" rx="8" ry="6" fill="#D9CFA8" opacity="0.16" />
        <Ellipse cx="38" cy="72" rx="5.5" ry="4.5" fill="#D9CFA8" opacity="0.12" />
      </G>
    </Svg>
  );
}

// ── Scene 1: THE WATCHER — engraved astrologer with the armillary staff ──
//    White monoline on navy: mask face, faceted cloak, medallion chain;
//    the staff crowned by a LIVING armillary sphere (rings turn, planets
//    orbit a sun); observatory & temple horizon; astrolabe + hourglass desk.

var INKW = 'rgba(232,206,150,0.95)';
var INKM = 'rgba(224,198,140,0.65)';
var INKD = 'rgba(216,190,134,0.42)';

// A slowly rotating monoline spiral galaxy
function MonoGalaxy({ x, y, size, period }) {
  var spin = useSharedValue(0);
  var reduced = useReducedMotion();
  useEffect(function () {
    if (reduced) return;
    spin.value = withRepeat(withTiming(360, { duration: period, easing: Easing.linear }), -1, false);
  }, [reduced]);
  var style = useAnimatedStyle(function () {
    return { transform: [{ rotate: spin.value + 'deg' }] };
  });
  return (
    <ScenePin x={x} y={y}>
      <Animated.View style={[{ width: size, height: size, flexShrink: 0 }, style]}>
        <Svg width="100%" height="100%" viewBox="0 0 40 40">
          <Path d="M20,20 C24,17 28,19 28,23 C28,27 23,29 19,27 C14,25 13,18 17,14 C22,9 31,11 34,18" stroke={INKM} strokeWidth="1" fill="none" strokeLinecap="round" />
          <Path d="M20,20 C16,23 12,21 12,17 C12,13 17,11 21,13 C26,15 27,22 23,26 C18,31 9,29 6,22" stroke={INKM} strokeWidth="1" fill="none" strokeLinecap="round" />
          <Circle cx="20" cy="20" r="2" fill="#FFE9B8" opacity="0.9" />
        </Svg>
      </Animated.View>
    </ScenePin>
  );
}

// The armillary sphere — rings turning, planets circling the sun
function ArmillarySphere({ size }) {
  var ringA = useSharedValue(0);
  var ringB = useSharedValue(0);
  var reduced = useReducedMotion();
  useEffect(function () {
    if (reduced) return;
    ringA.value = withRepeat(withTiming(360, { duration: 14000, easing: Easing.linear }), -1, false);
    ringB.value = withRepeat(withTiming(-360, { duration: 21000, easing: Easing.linear }), -1, false);
  }, [reduced]);
  var styleA = useAnimatedStyle(function () {
    return { transform: [{ rotate: ringA.value + 'deg' }] };
  });
  var styleB = useAnimatedStyle(function () {
    return { transform: [{ rotate: ringB.value + 'deg' }] };
  });
  var S = size;
  return (
    <View style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {/* stationary meridian + horizon rings */}
      <Svg width="100%" height="100%" viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
        <Circle cx="50" cy="50" r="46" stroke={INKW} strokeWidth="1.4" fill="none" />
        <Ellipse cx="50" cy="50" rx="46" ry="15" stroke={INKM} strokeWidth="1" fill="none" />
        {/* the sun — rayed core */}
        <Circle cx="50" cy="50" r="6.5" stroke={INKW} strokeWidth="1.2" fill="none" />
        <Path d="M50,39 L50,34 M50,66 L50,61 M39,50 L34,50 M66,50 L61,50 M42,42 L38.5,38.5 M58,58 L61.5,61.5 M58,42 L61.5,38.5 M42,58 L38.5,61.5" stroke={INKW} strokeWidth="1" />
      </Svg>
      {/* turning rings */}
      <Animated.View style={[StyleSheet.absoluteFill, styleA]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Ellipse cx="50" cy="50" rx="46" ry="24" stroke={INKM} strokeWidth="1" fill="none" transform="rotate(28 50 50)" />
          <Circle cx="8.9" cy="66" r="3" stroke={INKW} strokeWidth="1" fill="none" />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styleB]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Ellipse cx="50" cy="50" rx="46" ry="30" stroke={INKD} strokeWidth="1" fill="none" transform="rotate(-38 50 50)" />
          <Circle cx="85" cy="30" r="2.2" fill="#FFE9B8" opacity="0.9" />
        </Svg>
      </Animated.View>
      {/* planets riding invisible orbits around the sun */}
      <OrbitingSpark color="#FFE9B8" size={4.5} delay={0} cx="50%" cy="50%" rx={S * 0.33} ry={S * 0.12} period={8000} />
      <OrbitingSpark color="#F2D48E" size={3.5} delay={2200} cx="50%" cy="50%" rx={S * 0.44} ry={S * 0.17} period={12500} />
    </View>
  );
}

// The hourglass — sand trickling grain by grain
function HourglassSand({ h }) {
  var t = useSharedValue(0);
  var reduced = useReducedMotion();
  useEffect(function () {
    if (reduced) return;
    t.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.in(Easing.quad) }), -1, false);
  }, [reduced]);
  var style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(t.value, [0, 0.1, 0.9, 1], [0, 0.9, 0.9, 0]),
      transform: [{ translateY: interpolate(t.value, [0, 1], [0, h]) }],
    };
  });
  return <Animated.View style={[{ width: 1.6, height: 3.4, borderRadius: 1, backgroundColor: '#FFE9B8' }, style]} />;
}

function SceneWatcher() {
  var breathe = useSharedValue(0);
  var eyes = useSharedValue(0);
  var reduced = useReducedMotion();

  useEffect(function () {
    if (reduced) { eyes.value = 0.8; return; }
    breathe.value = withRepeat(withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }), -1, true);
    eyes.value = withDelay(2800, withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduced]);

  var sageStyle = useAnimatedStyle(function () {
    return { transform: [{ rotate: interpolate(breathe.value, [0, 1], [-0.35, 0.35]) + 'deg' }] };
  });
  var eyeStyle = useAnimatedStyle(function () {
    return { opacity: interpolate(eyes.value, [0, 1], [0.55, 1]) };
  });

  return (
    <SceneFrame
      svg={
        <>
          {/* dashed celestial arcs sweeping the heavens */}
          <Path d="M-20,118 Q180,26 380,108" stroke={INKD} strokeWidth="0.9" strokeDasharray="5 7" fill="none" />
          <Path d="M-20,58 Q150,-14 380,44" stroke={INKD} strokeWidth="0.8" strokeDasharray="4 8" fill="none" />

          {/* monoline crescent moon with craters */}
          <Path d="M74,38 A 26 26 0 1 0 74,86 A 20 20 0 1 1 74,38 Z" stroke={INKW} strokeWidth="1.3" fill="rgba(244,232,204,0.12)" />
          <Circle cx="52" cy="56" r="2.6" stroke={INKM} strokeWidth="0.8" fill="none" />
          <Circle cx="56" cy="70" r="1.7" stroke={INKM} strokeWidth="0.7" fill="none" />

          {/* observatory on its hill, dome slit open to the night */}
          <Path d="M6,306 Q42,286 88,300 L88,330 L6,330 Z" stroke={INKM} strokeWidth="1" fill="none" />
          <Path d="M28,296 L28,288 L64,288 L64,296 M30,288 C30,268 62,268 62,288 M44,268 L50,262" stroke={INKW} strokeWidth="1.1" fill="none" />
          {/* temple spires on the far right ridge */}
          <Path d="M300,330 L300,322 L336,322 L336,330 M304,322 C304,306 332,306 332,322 M318,306 L318,296 M314,301 L322,301" stroke={INKM} strokeWidth="1" fill="none" />
          <Path d="M344,330 L344,318 M340,318 L348,318 L344,308 Z" stroke={INKD} strokeWidth="1" fill="none" />
          <Circle cx="318" cy="293" r="1.3" fill="#FFE9B8" opacity="0.85" />

          {/* in-scene constellation, engraved */}
          <Path d="M262,166 L282,150 L306,158 L322,142" stroke={INKD} strokeWidth="0.8" fill="none" />
          <Circle cx="262" cy="166" r="1.8" fill="#FFE9B8" opacity="0.9" />
          <Circle cx="282" cy="150" r="2.2" fill="#FFE9B8" opacity="0.95" />
          <Circle cx="306" cy="158" r="1.6" fill="#FFE9B8" opacity="0.85" />
          <Circle cx="322" cy="142" r="2" fill="#FFE9B8" opacity="0.9" />

          {/* THE STONE PARAPET he stands upon */}
          <Path d="M16,336 L344,336" stroke={INKW} strokeWidth="1.3" fill="none" />
          <Path d="M20,336 L20,394 M344,336 L340,394" stroke={INKD} strokeWidth="1" fill="none" />
          <Path d="M20,354 L342,354 M20,374 L341,374" stroke={INKD} strokeWidth="0.9" fill="none" />
          <Path d="M78,336 L78,354 M140,336 L140,354 M202,336 L202,354 M264,336 L264,354 M326,336 L326,354" stroke={INKD} strokeWidth="0.9" />
          <Path d="M48,354 L48,374 M110,354 L110,374 M172,354 L172,374 M234,354 L234,374 M296,354 L296,374" stroke={INKD} strokeWidth="0.9" />
          <Path d="M78,374 L78,394 M140,374 L140,394 M202,374 L202,394 M264,374 L264,394" stroke={INKD} strokeWidth="0.9" />

          {/* HIS DESK — astrolabe and hourglass upon it */}
          <Path d="M262,282 L350,274 L350,282 L262,290 Z M268,290 L268,336 M344,282 L344,330 M268,312 L344,306" stroke={INKM} strokeWidth="1.1" fill="none" />
          {/* astrolabe disc on a stand */}
          <Circle cx="290" cy="252" r="19" stroke={INKW} strokeWidth="1.2" fill="none" />
          <Circle cx="290" cy="252" r="12" stroke={INKM} strokeWidth="0.9" fill="none" />
          <Path d="M290,233 L290,271 M271,252 L309,252 M290,252 L301,241" stroke={INKM} strokeWidth="0.8" />
          <Circle cx="290" cy="252" r="2" fill="#FFE9B8" opacity="0.9" />
          <Path d="M282,271 L280,283 M298,271 L300,283" stroke={INKM} strokeWidth="1" />
          {/* hourglass frame */}
          <Path d="M322,240 L342,240 M322,276 L342,276 M324,240 C324,252 330,256 332,258 C334,256 340,252 340,240 M324,276 C324,264 330,260 332,258 C334,260 340,264 340,276" stroke={INKW} strokeWidth="1.1" fill="none" />
          <Path d="M327,272 L337,272 L332,264 Z" fill="rgba(255,255,255,0.5)" />
          <Path d="M328,243 L336,243 L332,248 Z" fill="rgba(255,255,255,0.35)" />
        </>
      }
    >
      {/* spiral galaxies wheeling slowly */}
      <MonoGalaxy x={318} y={64} size={SW * 0.11} period={40000} />
      <MonoGalaxy x={36} y={166} size={SW * 0.085} period={52000} />

      {/* THE ASTROLOGER — engraved, breathing, holding the heavens */}
      <Animated.View style={[StyleSheet.absoluteFill, sageStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 360 400">
          {/* cloak silhouette — grand sweep to the parapet */}
          <InkFill d="M170,178 C142,186 124,206 116,236 C106,272 96,306 88,336 L252,336 C246,306 238,272 230,236 C222,206 200,186 170,178 Z" fill="#101F3E" delay={900} to={0.55} />
          <DrawStroke d="M170,178 C142,186 124,206 116,236 C106,272 96,306 88,336" len={230} delay={800} duration={1300} stroke={INKW} strokeWidth={1.4} />
          <DrawStroke d="M170,178 C200,186 222,206 230,236 C238,272 246,306 252,336" len={230} delay={800} duration={1300} stroke={INKW} strokeWidth={1.4} />
          <DrawStroke d="M88,336 L252,336" len={170} delay={2000} duration={600} stroke={INKM} strokeWidth={1} />
          {/* faceted fold lines of the cloak */}
          <DrawStroke d="M140,214 L158,248 L142,286 L160,322" len={150} delay={2300} duration={900} stroke={INKD} strokeWidth={0.9} />
          <DrawStroke d="M200,214 L184,250 L198,288 L182,322" len={150} delay={2450} duration={900} stroke={INKD} strokeWidth={0.9} />
          <DrawStroke d="M170,190 L170,224 M162,238 L178,238" len={60} delay={2600} duration={500} stroke={INKD} strokeWidth={0.8} />
          {/* the hood — peaked, framing the mask */}
          <DrawStroke d="M170,118 C152,122 142,138 143,158 C144,172 152,182 162,186" len={110} delay={300} duration={900} stroke={INKW} strokeWidth={1.3} />
          <DrawStroke d="M170,118 C188,122 198,138 197,158 C196,172 188,182 178,186" len={110} delay={300} duration={900} stroke={INKW} strokeWidth={1.3} />
          <DrawStroke d="M162,186 C165,190 175,190 178,186" len={22} delay={1100} duration={400} stroke={INKW} strokeWidth={1.1} />
          {/* the mask face within */}
          <DrawStroke d="M170,142 C178,142 183,151 182,163 C181,173 176,179 170,179 C164,179 159,173 158,163 C157,151 162,142 170,142 Z" len={120} delay={1300} duration={900} stroke={INKW} strokeWidth={1.1} />
          <Path d="M161,159 C163,156 167,156 168,159 C167,161 163,161 161,159 Z" fill="#F5A83D" opacity="0.95" />
          <Path d="M172,159 C174,156 178,156 179,159 C178,161 174,161 172,159 Z" fill="#F5A83D" opacity="0.95" />
          {/* medallion chain at the collar */}
          <DrawStroke d="M156,196 C162,203 178,203 184,196" len={38} delay={2100} duration={500} stroke={INKM} strokeWidth={1} />
          <Circle cx="163" cy="205" r="2.6" stroke={INKW} strokeWidth="1" fill="none" />
          <Circle cx="170" cy="208" r="3.2" stroke={INKW} strokeWidth="1" fill="none" />
          <Circle cx="177" cy="205" r="2.6" stroke={INKW} strokeWidth="1" fill="none" />
          {/* raised arm gripping the staff */}
          <DrawStroke d="M196,206 C210,196 222,180 228,160" len={72} delay={1600} duration={800} stroke={INKW} strokeWidth={1.3} />
          <DrawStroke d="M202,220 C216,208 228,190 236,168" len={80} delay={1700} duration={800} stroke={INKM} strokeWidth={1} />
          <Circle cx="231" cy="156" r="5" stroke={INKW} strokeWidth="1.2" fill="none" />
          {/* the staff — from the sphere down to the stones */}
          <DrawStroke d="M234,118 L226,336" len={225} delay={1900} duration={1100} stroke={INKW} strokeWidth={1.6} />
          <DrawStroke d="M229,170 C232,169 235,169 237,171" len={12} delay={2700} duration={300} stroke={INKM} strokeWidth={0.9} />
        </Svg>

        {/* glowing mask eyes */}
        <ScenePin x={164.5} y={159}>
          <Animated.View style={[{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#F5A83D', ...boxShadow('#E8842D', { width: 0, height: 0 }, 1, 7) }, eyeStyle]} />
        </ScenePin>
        <ScenePin x={175.5} y={159}>
          <Animated.View style={[{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#F5A83D', ...boxShadow('#E8842D', { width: 0, height: 0 }, 1, 7) }, eyeStyle]} />
        </ScenePin>
      </Animated.View>

      {/* THE ARMILLARY SPHERE crowning the staff — the living heavens */}
      <ScenePin x={234} y={80}>
        <GlowDisc color="#E0C992" size={SW * 0.3} innerOpacity={0.22} />
      </ScenePin>
      <ScenePin x={234} y={80}>
        <ArmillarySphere size={SW * 0.24} />
      </ScenePin>
      {/* pennant at the sphere's crown */}
      <ScenePin x={236} y={26}>
        <Svg width={22} height={20} viewBox="0 0 22 20" style={{ flexShrink: 0 }}>
          <Path d="M4,20 L4,2 M4,2 L18,6 L4,10" stroke="rgba(232,240,255,0.9)" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
        </Svg>
      </ScenePin>

      {/* hourglass sand, falling grain by grain */}
      <ScenePin x={332} y={252}>
        <HourglassSand h={SW * 0.028} />
      </ScenePin>

      {/* thin night clouds */}
      <CloudWisp y={44} w={150} period={30000} delay={0} opacity={0.35} />
      <CloudWisp y={100} w={110} period={40000} delay={11000} opacity={0.25} />
    </SceneFrame>
  );
}

// ── Scene 2: THE SHRINE OF THE GLOBE — seen from behind, inside the arch,
//    he studies the turning heavens. Gold line work under a full moon.

var GLD = 'rgba(224,201,146,0.92)';
var GLDm = 'rgba(218,196,146,0.6)';
var GLDd = 'rgba(210,190,146,0.38)';

function SceneReader() {
  var flicker = useFlicker();
  var breathe = useSharedValue(0);
  var moonPulse = useSharedValue(0);
  var reduced = useReducedMotion();

  useEffect(function () {
    if (reduced) { moonPulse.value = 0.6; return; }
    breathe.value = withRepeat(withTiming(1, { duration: 4600, easing: Easing.inOut(Easing.sin) }), -1, true);
    moonPulse.value = withRepeat(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduced]);

  var figStyle = useAnimatedStyle(function () {
    return { transform: [{ scale: interpolate(breathe.value, [0, 1], [1, 1.006]) }] };
  });
  var moonStyle = useAnimatedStyle(function () {
    return { opacity: interpolate(moonPulse.value, [0, 1], [0.7, 1]) };
  });

  return (
    <SceneFrame
      svg={
        <>
          {/* flowing flourish swirls in the night */}
          <Path d="M18,60 C48,44 60,74 40,86 C24,95 10,82 20,68 M40,86 C64,104 58,138 34,146" stroke={GLDd} strokeWidth="0.9" fill="none" />
          <Path d="M342,150 C316,140 312,112 334,104 C350,98 360,112 350,124 M334,104 C316,88 322,58 344,52" stroke={GLDd} strokeWidth="0.9" fill="none" />

          {/* THE ARCH — pillars, arc, finial */}
          <Path d="M96,336 L96,180 C96,120 264,120 264,180 L264,336" stroke={GLD} strokeWidth="1.6" fill="none" />
          <Path d="M106,336 L106,184 C106,130 254,130 254,184 L254,336" stroke={GLDm} strokeWidth="0.9" fill="none" />
          <Path d="M92,336 L92,172 M100,336 L100,176 M260,336 L260,176 M268,336 L268,172" stroke={GLDd} strokeWidth="0.8" fill="none" />
          {/* capital details on the pillars */}
          <Path d="M88,208 L112,208 M88,214 L112,214 M248,208 L272,208 M248,214 L272,214" stroke={GLDm} strokeWidth="0.9" />
          {/* finial crown */}
          <Path d="M180,130 L180,104 M172,116 L188,116 M176,110 L184,110" stroke={GLD} strokeWidth="1.1" />
          <Circle cx="180" cy="100" r="2.4" stroke={GLD} strokeWidth="1" fill="none" />
          <Circle cx="180" cy="94" r="1.2" fill="#F4E8CC" opacity="0.95" />

          {/* THE PEDESTAL — ornate base the arch rests upon */}
          <Path d="M64,336 L296,336 M58,346 L302,346 M64,358 L296,358 M72,372 L288,372" stroke={GLD} strokeWidth="1.2" fill="none" />
          <Path d="M64,336 L58,346 M296,336 L302,346 M58,346 L64,358 M302,346 L296,358 M64,358 L72,372 M296,358 L288,372" stroke={GLDm} strokeWidth="0.9" />
          {/* diamond frieze along the base */}
          <Path d="M110,352 L116,348 L122,352 L116,356 Z M150,352 L156,348 L162,352 L156,356 Z M190,352 L196,348 L202,352 L196,356 Z M230,352 L236,348 L242,352 L236,356 Z" stroke={GLDm} strokeWidth="0.8" fill="none" />

          {/* THE ASTROLOGER — from behind, studying the globe */}
          <InkFill d="M180,214 C160,218 148,236 144,262 C140,288 142,312 146,330 L214,330 C218,312 220,288 216,262 C212,236 200,218 180,214 Z" fill="#101F3E" delay={900} to={0.5} />
          <DrawStroke d="M180,214 C160,218 148,236 144,262 C140,288 142,312 146,330" len={140} delay={800} duration={1100} stroke={GLD} strokeWidth={1.3} />
          <DrawStroke d="M180,214 C200,218 212,236 216,262 C220,288 218,312 214,330" len={140} delay={800} duration={1100} stroke={GLD} strokeWidth={1.3} />
          <DrawStroke d="M146,330 L214,330" len={72} delay={1800} duration={500} stroke={GLDm} strokeWidth={1} />
          {/* back fold lines of the robe */}
          <DrawStroke d="M166,232 C164,262 164,296 168,326" len={100} delay={2000} duration={800} stroke={GLDd} strokeWidth={0.8} />
          <DrawStroke d="M194,232 C196,262 196,296 192,326" len={100} delay={2150} duration={800} stroke={GLDd} strokeWidth={0.8} />
          {/* head from behind + hair bun */}
          <Circle cx="180" cy="196" r="15" stroke={GLD} strokeWidth="1.2" fill="rgba(16,31,62,0.7)" />
          <Circle cx="180" cy="180" r="6" stroke={GLD} strokeWidth="1.1" fill="none" />
          <Path d="M170,188 C174,184 186,184 190,188" stroke={GLDm} strokeWidth="0.8" fill="none" />
          {/* shoulders line */}
          <DrawStroke d="M158,222 C168,216 192,216 202,222" len={50} delay={1500} duration={500} stroke={GLDm} strokeWidth={1} />

          {/* the globe's stand — column + tripod feet */}
          <Path d="M180,300 L180,318 M168,330 L180,318 L192,330 M172,318 L188,318" stroke={GLD} strokeWidth="1.1" fill="none" />

          {/* SHELVES on the right wall — scroll rings */}
          <Path d="M292,150 L348,150 M292,196 L348,196" stroke={GLDm} strokeWidth="1.1" />
          <Circle cx="304" cy="142" r="6.5" stroke={GLDm} strokeWidth="1" fill="none" />
          <Circle cx="322" cy="142" r="6.5" stroke={GLD} strokeWidth="1" fill="none" />
          <Circle cx="340" cy="142" r="6.5" stroke={GLDm} strokeWidth="1" fill="none" />
          <Circle cx="310" cy="188" r="6.5" stroke={GLD} strokeWidth="1" fill="none" />
          <Circle cx="330" cy="188" r="6.5" stroke={GLDm} strokeWidth="1" fill="none" />
          <Circle cx="304" cy="142" r="2" stroke={GLDd} strokeWidth="0.7" fill="none" />
          <Circle cx="322" cy="142" r="2" stroke={GLDd} strokeWidth="0.7" fill="none" />
          <Circle cx="340" cy="142" r="2" stroke={GLDd} strokeWidth="0.7" fill="none" />
          <Circle cx="310" cy="188" r="2" stroke={GLDd} strokeWidth="0.7" fill="none" />
          <Circle cx="330" cy="188" r="2" stroke={GLDd} strokeWidth="0.7" fill="none" />

          {/* book stack + candle stand on the right */}
          <Path d="M296,318 L344,314 L344,322 L296,326 Z M300,310 L340,307 L340,314 L300,318 Z M304,303 L336,300 L336,307 L304,310 Z" stroke={GLDm} strokeWidth="0.9" fill="rgba(16,31,62,0.5)" />
          <Path d="M318,258 L326,258 L324,300 L320,300 Z M312,300 L332,300 L330,306 L314,306 Z" stroke={GLD} strokeWidth="1" fill="none" />

          {/* small shrine tree at the left of the pedestal */}
          <Path d="M52,336 C51,322 55,310 53,300 M53,300 C58,295 66,293 72,295 M53,300 C48,293 41,291 34,292 M53,300 C57,303 62,307 64,313" stroke={GLDd} strokeWidth="1" fill="none" strokeLinecap="round" />
        </>
      }
    >
      {/* THE FULL MOON — luminous over the shrine */}
      <ScenePin x={180} y={44}>
        <GlowDisc color="#EEE6C8" size={SW * 0.3} innerOpacity={0.3} />
      </ScenePin>
      <ScenePin x={180} y={44}>
        <Animated.View style={[{ width: SW * 0.15, height: SW * 0.15, flexShrink: 0 }, moonStyle]}>
          <Svg width="100%" height="100%" viewBox="0 0 60 60">
            <Circle cx="30" cy="30" r="26" stroke="#F1E8CC" strokeWidth="1.3" fill="rgba(241,232,204,0.16)" />
            <Circle cx="22" cy="24" r="4.5" stroke="rgba(241,232,204,0.6)" strokeWidth="0.8" fill="none" />
            <Circle cx="38" cy="34" r="3" stroke="rgba(241,232,204,0.55)" strokeWidth="0.7" fill="none" />
            <Circle cx="27" cy="40" r="2.2" stroke="rgba(241,232,204,0.5)" strokeWidth="0.7" fill="none" />
            <Path d="M12,18 C18,10 30,6 40,10" stroke="rgba(241,232,204,0.45)" strokeWidth="0.7" fill="none" />
          </Svg>
        </Animated.View>
      </ScenePin>

      {/* spiral galaxies drifting by */}
      <MonoGalaxy x={40} y={210} size={SW * 0.1} period={46000} />
      <MonoGalaxy x={330} y={64} size={SW * 0.085} period={58000} />

      {/* the celestial globe — the heavens turning before him */}
      <ScenePin x={180} y={268}>
        <GlowDisc color="#E0C992" size={SW * 0.22} innerOpacity={0.24} />
      </ScenePin>
      <Animated.View style={[StyleSheet.absoluteFill, figStyle, { pointerEvents: 'none' }]}>
        <ScenePin x={180} y={268}>
          <ArmillarySphere size={SW * 0.17} />
        </ScenePin>
      </Animated.View>

      {/* candlelight breathing at the right */}
      <ScenePin x={322} y={278}>
        <FlickerGlow flicker={flicker} size={SW * 0.3} color="#F59E0B" base={0.4} />
      </ScenePin>
      <ScenePin x={322} y={248}>
        <CandleFlame flicker={flicker} scale={0.9} />
      </ScenePin>

      {/* sparks rising off the globe */}
      <RisingGlyph x={vx(170)} y={vy(252)} delay={1800} drift={-8} />
      <RisingGlyph x={vx(192)} y={vy(256)} delay={3300} drift={10} />
    </SceneFrame>
  );
}

// ── Scene 4: THE KEEPER OF THE SPHERE — flowing gold-line mystic cradling
//    a golden ringed planet; constellations bound to him on either side.
//    `reading` = casting mode: the orb quickens, the chart forms around it.
function SceneOrb({ reading, progress }) {
  var orbPulse = useSharedValue(0);
  var eyes = useSharedValue(0);
  var sway = useSharedValue(0);
  var reduced = useReducedMotion();
  var p = progress || 0;

  useEffect(function () {
    if (reduced) { orbPulse.value = 0.5; eyes.value = 0.85; return; }
    orbPulse.value = withRepeat(
      withTiming(1, { duration: reading ? 620 : 3200, easing: Easing.inOut(Easing.sin) }), -1, true);
    eyes.value = withDelay(2200, withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true));
    sway.value = withRepeat(withTiming(1, { duration: 7800, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduced, reading]);

  var orbGlowStyle = useAnimatedStyle(function () {
    return {
      opacity: interpolate(orbPulse.value, [0, 1], reading ? [0.6, 1] : [0.4, 0.85]),
      transform: [{ scale: interpolate(orbPulse.value, [0, 1], reading ? [0.95, 1.28] : [0.95, 1.1]) }],
    };
  });
  var eyeStyle = useAnimatedStyle(function () {
    return { opacity: interpolate(eyes.value, [0, 1], [0.6, 1]) };
  });
  var swayStyle = useAnimatedStyle(function () {
    return { transform: [{ rotate: interpolate(sway.value, [0, 1], [-0.5, 0.5]) + 'deg' }] };
  });

  return (
    <SceneFrame
      svg={
        <>
          {/* the great orbit — a dashed ellipse sweeping behind him */}
          <Ellipse cx="180" cy="216" rx="168" ry="118" stroke={INKD} strokeWidth="0.9" strokeDasharray="5 8" fill="none" transform="rotate(-14 180 216)" />
          <Ellipse cx="180" cy="230" rx="150" ry="96" stroke={INKD} strokeWidth="0.7" strokeDasharray="3 9" fill="none" transform="rotate(9 180 230)" opacity="0.7" />

          {/* constellations bound to his left */}
          <Path d="M28,150 L58,128 L92,142 L112,116 M92,142 L86,180 L58,204 M58,204 L84,232" stroke={INKD} strokeWidth="0.9" fill="none" />
          <Circle cx="28" cy="150" r="2.4" fill="#FFE9B8" opacity="0.95" />
          <Circle cx="58" cy="128" r="3" fill="#FFE9B8" opacity="1" />
          <Circle cx="92" cy="142" r="2.2" fill="#FFE9B8" opacity="0.9" />
          <Circle cx="112" cy="116" r="2.6" fill="#FFE9B8" opacity="0.95" />
          <Circle cx="86" cy="180" r="2" fill="#FFE9B8" opacity="0.85" />
          <Circle cx="58" cy="204" r="2.6" fill="#FFE9B8" opacity="0.95" />
          <Circle cx="84" cy="232" r="2" fill="#FFE9B8" opacity="0.85" />

          {/* and to his right */}
          <Path d="M330,132 L302,150 L316,184 M302,150 L272,140 M316,184 L296,216 L318,244" stroke={INKD} strokeWidth="0.9" fill="none" />
          <Circle cx="330" cy="132" r="2.8" fill="#FFE9B8" opacity="1" />
          <Circle cx="302" cy="150" r="2.2" fill="#FFE9B8" opacity="0.9" />
          <Circle cx="272" cy="140" r="2" fill="#FFE9B8" opacity="0.85" />
          <Circle cx="316" cy="184" r="2.6" fill="#FFE9B8" opacity="0.95" />
          <Circle cx="296" cy="216" r="2" fill="#FFE9B8" opacity="0.85" />
          <Circle cx="318" cy="244" r="2.4" fill="#FFE9B8" opacity="0.9" />

          {/* four-point sparks */}
          <Path d="M126,84 L127.6,90 L134,92 L127.6,94 L126,100 L124.4,94 L118,92 L124.4,90 Z" fill="#FFE9B8" opacity="0.7" />
          <Path d="M258,86 L259.4,91 L264,92.4 L259.4,94 L258,99 L256.6,94 L252,92.4 L256.6,91 Z" fill="#FFE9B8" opacity="0.6" />
        </>
      }
    >
      {/* gentle sway wraps him */}
      <Animated.View style={[StyleSheet.absoluteFill, swayStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 360 400">
          {/* the hood — tall, peaked, draped */}
          <InkFill d="M180,96 C158,104 146,126 148,152 C149,170 158,184 170,190 L190,190 C202,184 211,170 212,152 C214,126 202,104 180,96 Z" fill="#171335" delay={800} to={0.5} />
          <DrawStroke d="M180,96 C158,104 146,126 148,152 C149,170 158,184 170,190" len={140} delay={300} duration={1000} stroke={INKW} strokeWidth={1.4} />
          <DrawStroke d="M180,96 C202,104 214,126 212,152 C211,170 202,184 190,190" len={140} delay={300} duration={1000} stroke={INKW} strokeWidth={1.4} />
          {/* inner hood edge framing the void */}
          <Path d="M165,152 C165,130 172,118 180,116 C188,118 195,130 195,152 C195,166 189,175 180,177 C171,175 165,166 165,152 Z" fill="#0A0718" opacity="0.95" />
          <DrawStroke d="M165,152 C165,130 172,118 180,116 C188,118 195,130 195,152 C195,166 189,175 180,177 C171,175 165,166 165,152 Z" len={170} delay={900} duration={900} stroke={INKM} strokeWidth={1} />

          {/* THE FLOWING ROBE — strands streaming to the night */}
          <DrawStroke d="M166,188 C140,226 118,282 100,352 C94,374 88,388 82,396" len={250} delay={1300} duration={1400} stroke={INKW} strokeWidth={1.3} />
          <DrawStroke d="M194,188 C220,226 242,282 260,352 C266,374 272,388 278,396" len={250} delay={1300} duration={1400} stroke={INKW} strokeWidth={1.3} />
          <DrawStroke d="M170,194 C152,240 138,300 130,368 C127,384 123,394 118,400" len={220} delay={1500} duration={1300} stroke={INKM} strokeWidth={1} />
          <DrawStroke d="M190,194 C208,240 222,300 230,368 C233,384 237,394 242,400" len={220} delay={1500} duration={1300} stroke={INKM} strokeWidth={1} />
          <DrawStroke d="M175,200 C165,256 158,320 156,384" len={190} delay={1700} duration={1200} stroke={INKD} strokeWidth={0.9} />
          <DrawStroke d="M185,200 C195,256 202,320 204,384" len={190} delay={1700} duration={1200} stroke={INKD} strokeWidth={0.9} />
          {/* wind-caught wisps at the hem */}
          <DrawStroke d="M100,352 C84,368 62,378 40,380" len={70} delay={2600} duration={700} stroke={INKD} strokeWidth={0.8} />
          <DrawStroke d="M260,352 C276,368 298,378 320,380" len={70} delay={2700} duration={700} stroke={INKD} strokeWidth={0.8} />
          <DrawStroke d="M130,368 C118,380 102,388 86,390" len={52} delay={2800} duration={600} stroke={INKD} strokeWidth={0.7} />
          <DrawStroke d="M230,368 C242,380 258,388 274,390" len={52} delay={2900} duration={600} stroke={INKD} strokeWidth={0.7} />

          {/* shoulders + arms cradling the sphere */}
          <DrawStroke d="M166,188 C158,208 152,232 152,252 C152,274 162,290 172,296" len={130} delay={1900} duration={900} stroke={INKW} strokeWidth={1.2} />
          <DrawStroke d="M194,188 C202,208 208,232 208,252 C208,274 198,290 188,296" len={130} delay={1900} duration={900} stroke={INKW} strokeWidth={1.2} />
          {/* cupped hands beneath */}
          <DrawStroke d="M162,308 C168,318 192,318 198,308" len={48} delay={2400} duration={500} stroke={INKW} strokeWidth={1.2} />
          <DrawStroke d="M166,312 C171,318 189,318 194,312" len={36} delay={2550} duration={450} stroke={INKM} strokeWidth={0.9} />
        </Svg>

        {/* amber eyes within the void */}
        <ScenePin x={172.5} y={148}>
          <Animated.View style={[{ width: 7, height: 4.5, borderRadius: 2.5, backgroundColor: '#F5A83D', ...boxShadow('#E8842D', { width: 0, height: 0 }, 1, 8) }, eyeStyle]} />
        </ScenePin>
        <ScenePin x={187.5} y={148}>
          <Animated.View style={[{ width: 7, height: 4.5, borderRadius: 2.5, backgroundColor: '#F5A83D', ...boxShadow('#E8842D', { width: 0, height: 0 }, 1, 8) }, eyeStyle]} />
        </ScenePin>
      </Animated.View>

      {/* THE GOLDEN SPHERE — a ringed world resting in his hands */}
      <ScenePin x={180} y={290}>
        <Animated.View style={orbGlowStyle}>
          <GlowDisc color="#E8C060" size={SW * 0.36} innerOpacity={0.5} />
        </Animated.View>
      </ScenePin>
      <ScenePin x={180} y={290}>
        <View style={{ width: SW * 0.24, height: SW * 0.24, flexShrink: 0 }}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id="planetG" cx="38%" cy="32%" r="75%">
                <Stop offset="0%" stopColor="#FFF2CE" />
                <Stop offset="45%" stopColor="#F0CE86" />
                <Stop offset="100%" stopColor="#B98A3A" />
              </RadialGradient>
            </Defs>
            <Circle cx="50" cy="50" r="27" fill="url(#planetG)" />
            <Circle cx="50" cy="50" r="27" stroke={INKW} strokeWidth="1" fill="none" opacity="0.8" />
            {/* craters */}
            <Circle cx="42" cy="42" r="4.5" fill="rgba(150,110,50,0.35)" />
            <Circle cx="58" cy="56" r="3.2" fill="rgba(150,110,50,0.3)" />
            <Circle cx="46" cy="62" r="2.2" fill="rgba(150,110,50,0.28)" />
            {/* the ring */}
            <Ellipse cx="50" cy="50" rx="42" ry="11" stroke={INKW} strokeWidth="1.2" fill="none" transform="rotate(-16 50 50)" opacity="0.9" />
            <Ellipse cx="50" cy="50" rx="36" ry="8.5" stroke={INKM} strokeWidth="0.8" fill="none" transform="rotate(-16 50 50)" opacity="0.7" />
            {/* chart forms around the sphere while he reads */}
            {reading ? (
              <>
                {p >= 1 ? <Circle cx="50" cy="50" r="34" stroke={INKM} strokeWidth="0.9" fill="none" /> : null}
                {p >= 2 ? <Circle cx="50" cy="50" r="42" stroke={INKD} strokeWidth="0.8" fill="none" /> : null}
                {p >= 3 ? <Path d="M50,8 L50,16 M50,84 L50,92 M8,50 L16,50 M84,50 L92,50" stroke={INKM} strokeWidth="1" /> : null}
                {p >= 4 ? (
                  <>
                    <Circle cx="50" cy="9" r="2" fill="#F5A83D" />
                    <Circle cx="91" cy="50" r="2" fill="#F5A83D" />
                    <Circle cx="50" cy="91" r="2" fill="#F5A83D" />
                    <Circle cx="9" cy="50" r="2" fill="#F5A83D" />
                  </>
                ) : null}
              </>
            ) : null}
          </Svg>
        </View>
      </ScenePin>
      {/* small moons riding the ring */}
      <OrbitingSpark color="#FFE9B8" size={5} delay={0} cx={vx(180)} cy={vy(290)} rx={SW * 0.115} ry={SW * 0.028} period={7000} />
      <OrbitingSpark color="#F2D48E" size={3.5} delay={2600} cx={vx(180)} cy={vy(290)} rx={SW * 0.14} ry={SW * 0.04} period={11000} />

      {/* while reading: ripples of insight */}
      {reading ? (
        <ScenePin x={180} y={290}>
          <PulseRing size={SW * 0.26} delay={0} period={2100} color="rgba(232,201,122,0.7)" />
          <PulseRing size={SW * 0.26} delay={1050} period={2100} color="rgba(245,168,61,0.55)" />
        </ScenePin>
      ) : (
        <ScenePin x={180} y={290}>
          <PulseRing size={SW * 0.26} delay={1400} period={3600} color="rgba(232,201,122,0.5)" />
        </ScenePin>
      )}
      {/* sparks rising off the sphere */}
      <RisingGlyph x={vx(170)} y={vy(276)} delay={2400} drift={-10} />
      <RisingGlyph x={vx(192)} y={vy(280)} delay={3800} drift={12} />
    </SceneFrame>
  );
}

// Elliptical orbiting spark used above the casting desk
function OrbitingSpark({ color, size, delay, cx, cy, rx, ry, period }) {
  var t = useSharedValue(0);
  var reduced = useReducedMotion();
  useEffect(function () {
    if (reduced) return;
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: period, easing: Easing.linear }), -1, false));
  }, [reduced]);
  var style = useAnimatedStyle(function () {
    var a = t.value * Math.PI * 2;
    return {
      opacity: 0.45 + 0.45 * Math.abs(Math.sin(a)),
      transform: [
        { translateX: Math.cos(a) * rx },
        { translateY: Math.sin(a) * ry },
      ],
    };
  });
  return (
    <View style={{ position: 'absolute', left: cx, top: cy }}>
      <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, ...boxShadow(color, { width: 0, height: 0 }, 0.85, 8) }, style]} />
    </View>
  );
}

// Expanding pulse ring — energy rippling out of a point
function PulseRing({ size, delay, period, color }) {
  var t = useSharedValue(0);
  var reduced = useReducedMotion();
  useEffect(function () {
    if (reduced) return;
    t.value = withDelay(delay || 0, withRepeat(withTiming(1, { duration: period || 2600, easing: Easing.out(Easing.quad) }), -1, false));
  }, [reduced]);
  var style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(t.value, [0, 0.15, 1], [0, 0.55, 0]),
      transform: [{ scale: interpolate(t.value, [0, 1], [0.35, 1.6]) }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 1.2, borderColor: color || 'rgba(255,214,102,0.8)' }, style]} />
  );
}

// ── Scene 3: THE LEAF — the codex page itself. The whole world turns to
//    parchment: dark-ink etching of the bound ola manuscript, the user's
//    name engraved upon it, candle burning, quill resting.

var PINK = 'rgba(224,201,146,0.92)'; // gold ink on the night
var PINKm = 'rgba(218,196,146,0.6)';
var PINKd = 'rgba(210,190,146,0.38)';

function SceneLeaf({ displayName }) {
  var flicker = useFlicker();
  var write = useSharedValue(0);
  var nameIn = useSharedValue(0);
  var reduced = useReducedMotion();

  useEffect(function () {
    if (reduced) { write.value = 1; nameIn.value = 1; return; }
    write.value = withDelay(700, withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) }));
    nameIn.value = withDelay(800, withTiming(1, { duration: 2100, easing: Easing.inOut(Easing.quad) }));
  }, [reduced]);

  var sparkStyle = useAnimatedStyle(function () {
    return {
      opacity: interpolate(write.value, [0, 0.05, 0.92, 1], [0, 1, 1, 0]),
      transform: [{ translateX: interpolate(write.value, [0, 1], [-58, 58]) }],
    };
  });
  var nameStyle = useAnimatedStyle(function () {
    return { opacity: interpolate(nameIn.value, [0, 0.15, 1], [0, 0.25, 1]) };
  });

  return (
    <SceneFrame
      svg={
        <>
          {/* constellation inked at the top of the page */}
          <Path d="M52,52 L86,38 L120,50 L148,34 M120,50 L134,74" stroke={PINKd} strokeWidth="0.9" fill="none" />
          <Circle cx="52" cy="52" r="2" fill={PINK} opacity="0.7" />
          <Circle cx="86" cy="38" r="2.6" fill={PINK} opacity="0.8" />
          <Circle cx="120" cy="50" r="2.2" fill={PINK} opacity="0.75" />
          <Circle cx="148" cy="34" r="2.4" fill={PINK} opacity="0.8" />
          <Circle cx="134" cy="74" r="1.8" fill={PINK} opacity="0.65" />
          {/* scattered ink stars + a four-point spark */}
          <Circle cx="250" cy="44" r="1.6" fill={PINK} opacity="0.6" />
          <Circle cx="292" cy="66" r="1.3" fill={PINK} opacity="0.5" />
          <Circle cx="216" cy="30" r="1.4" fill={PINK} opacity="0.55" />
          <Path d="M312,36 L313.6,42 L320,44 L313.6,46 L312,52 L310.4,46 L304,44 L310.4,42 Z" fill={PINK} opacity="0.55" />

          {/* THE DESK — surface line + carved frieze border */}
          <Path d="M18,300 L342,300" stroke={PINK} strokeWidth="1.6" />
          <Path d="M18,308 L342,308 M18,330 L342,330" stroke={PINKm} strokeWidth="1" />
          {/* S-scroll frieze between the lines */}
          <Path d="M34,319 C40,312 48,312 52,319 C56,326 64,326 70,319 M70,319 C76,312 84,312 88,319 C92,326 100,326 106,319 M106,319 C112,312 120,312 124,319 C128,326 136,326 142,319 M142,319 C148,312 156,312 160,319 C164,326 172,326 178,319 M178,319 C184,312 192,312 196,319 C200,326 208,326 214,319 M214,319 C220,312 228,312 232,319 C236,326 244,326 250,319 M250,319 C256,312 264,312 268,319 C272,326 280,326 286,319 M286,319 C292,312 300,312 304,319 C308,326 316,326 322,319" stroke={PINKd} strokeWidth="0.9" fill="none" />

          {/* THE BOUND MANUSCRIPT — stacked ola leaves, tied with cord */}
          <Path d="M96,262 C150,250 226,248 276,258 L278,272 C226,262 150,264 98,276 Z" stroke={PINK} strokeWidth="1.2" fill="rgba(16,31,62,0.6)" />
          <Path d="M100,252 C152,241 224,239 272,248 L276,258 C226,248 150,250 96,262 Z" stroke={PINK} strokeWidth="1.2" fill="rgba(16,31,62,0.55)" />
          <Path d="M106,243 C154,233 220,231 266,239 L272,248 C224,239 152,241 100,252 Z" stroke={PINK} strokeWidth="1.2" fill="rgba(16,31,62,0.5)" />
          <Path d="M112,234 C156,225 216,224 260,231 L266,239 C220,231 154,233 106,243 Z" stroke={PINK} strokeWidth="1.3" fill="rgba(16,31,62,0.45)" />
          {/* leaf edge ticks */}
          <Path d="M104,258 L104,270 M270,252 L272,266" stroke={PINKd} strokeWidth="0.8" />
          {/* binding cords + knots */}
          <Path d="M140,224 L136,278 M232,222 L238,272" stroke={PINK} strokeWidth="1.4" />
          <Circle cx="138" cy="250" r="3.4" stroke={PINK} strokeWidth="1.1" fill="none" />
          <Circle cx="235" cy="246" r="3.4" stroke={PINK} strokeWidth="1.1" fill="none" />

          {/* the quill — feather curve + nib, resting beside the book */}
          <Path d="M292,286 C304,272 320,262 336,258 C326,270 314,282 300,290 Z" stroke={PINK} strokeWidth="1.1" fill="rgba(16,31,62,0.6)" />
          <Path d="M300,284 C310,274 320,267 330,262" stroke={PINKd} strokeWidth="0.7" fill="none" />
          <Path d="M292,286 L284,294" stroke={PINK} strokeWidth="1.4" strokeLinecap="round" />
          {/* inkpot */}
          <Path d="M330,286 C330,280 346,280 346,286 L344,298 L332,298 Z M334,280 L342,280" stroke={PINK} strokeWidth="1.1" fill="rgba(16,31,62,0.6)" />

          {/* candle on its holder, left */}
          <Path d="M56,246 L66,246 L64,292 L58,292 Z" stroke={PINK} strokeWidth="1.1" fill="rgba(16,31,62,0.55)" />
          <Path d="M46,292 L76,292 L72,300 L50,300 Z M40,296 C40,290 48,290 48,296" stroke={PINK} strokeWidth="1.1" fill="none" />
          <Path d="M61,246 L61,240" stroke={PINK} strokeWidth="1" />
        </>
      }
    >
      {/* candle flame — the one living color on the page */}
      <ScenePin x={61} y={232}>
        <CandleFlame flicker={flicker} scale={0.85} />
      </ScenePin>
      <ScenePin x={61} y={250}>
        <FlickerGlow flicker={flicker} size={SW * 0.2} color="#E8A33D" base={0.3} />
      </ScenePin>

      {/* THEIR NAME — engraved across the top leaf */}
      <ScenePin x={186} y={237}>
        <Animated.View style={[{ width: SW * 0.44, height: 40, flexShrink: 0, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-3deg' }] }, nameStyle]}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 21, fontWeight: '800', color: '#E8C97A',
              letterSpacing: 5, textAlign: 'center', textTransform: 'uppercase',
              ...textShadow('rgba(255,214,102,0.55)', { width: 0, height: 0 }, 10),
            }}
          >
            {displayName || '—'}
          </Text>
        </Animated.View>
      </ScenePin>
      {/* the inscribing spark — a burning point of ink */}
      <ScenePin x={186} y={237}>
        <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFD666', ...boxShadow('#FFB800', { width: 0, height: 0 }, 0.9, 8) }, sparkStyle]} />
      </ScenePin>

      {/* their personal sigil — inked in the page's upper corner */}
      <ScenePin x={286} y={116}>
        <View style={{ width: SW * 0.3, height: SW * 0.24, flexShrink: 0 }}>
          <SigilConstellation name={displayName} width="100%" height="100%" delay={1500} />
        </View>
      </ScenePin>
    </SceneFrame>
  );
}

var STORY_SCENES = [SceneWatcher, SceneReader, SceneLeaf, SceneOrb];

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
              <Ionicons name={reward.icon} size={30} color="#FFD666" />
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
              {icon ? <Ionicons name={icon} size={17} color="#2A1707" /> : null}
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
      <LinearGradient colors={['rgba(255,255,255,0.035)', 'rgba(255,255,255,0.008)']} style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
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
          {/* breathing golden halo */}
          <Animated.View style={[{ position: 'absolute', width: 184, height: 184 }, glowStyle]}>
            <GlowDisc color="#FFB800" size={184} innerOpacity={0.42} />
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
          {/* the logo */}
          <Image source={APP_LOGO_IMAGE} style={{ width: 90, height: 90, borderRadius: 45 }} resizeMode="contain" />
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
                  <Ionicons name={opt.icon} size={22} color={opt.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 19, fontWeight: '800', color: '#FFF1D0' }}>{opt.label}</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>{opt.sub}</Text>
                </View>
                <Ionicons name="chevron-forward-circle" size={26} color={opt.color + '90'} />
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
  var Scene = STORY_SCENES[beat] || SceneWatcher;

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

  return (
    <TouchableOpacity activeOpacity={1} onPress={advance} style={{ flex: 1 }}>
      {/* the sage — illustrated, candle-lit, alive */}
      <Animated.View key={'scene' + beat} entering={FadeIn.duration(900)} exiting={FadeOut.duration(250)} style={{ height: SH * 0.42, marginTop: SH * 0.015 }}>
        <Scene displayName={displayName} />
      </Animated.View>

      <Animated.View key={'text' + beat} entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={{ paddingHorizontal: 30, marginTop: 14 }}>
        <WordFlow text={withName(beats[beat].big)} style={p.storyBig} baseDelay={250} step={70} />
        <View style={{ height: 14 }} />
        <WordFlow text={withName(beats[beat].small)} style={p.storySmallWord} baseDelay={900} step={40} />
      </Animated.View>

      <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' }}>
        {/* beat dots */}
        <View style={{ flexDirection: 'row', gap: 7, marginBottom: 18 }}>
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
                <Ionicons name="chevron-forward" size={15} color="#E8C97A" />
              </Animated.View>
            </View>
          </Animated.View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  INPUT CHAPTERS — one question per screen
// ═══════════════════════════════════════════════════════════════════════

function InputChapterFrame({ children, onBack, T }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 26, paddingVertical: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
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
          <Ionicons name="star" size={8} color="#E8C97A" style={{ marginHorizontal: 9 }} />
          <Text style={[p.kickerOrn, lang === 'si' ? { letterSpacing: 0.5 } : null]}>{T.nameKicker}</Text>
          <Ionicons name="star" size={8} color="#E8C97A" style={{ marginHorizontal: 9 }} />
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
          <Ionicons name="sparkles" size={17} color={focused ? '#F0D488' : 'rgba(217,164,65,0.55)'} style={{ marginRight: 12 }} />
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
            <Ionicons name="alert-circle" size={14} color="#FCA5A5" />
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

  return (
    <InputChapterFrame onBack={onBack} T={T}>
      <Animated.View entering={FadeInDown.duration(500)}>
        <ChapterHeading title={T.dateTitle} sub={T.dateSub} />
        <Card>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1.4 }}>
              <Text style={p.inputLabel}>{T.yearLabel}</Text>
              <TextInput style={p.input} placeholder="1995" placeholderTextColor="rgba(255,255,255,0.2)" keyboardType="number-pad" maxLength={4} value={year} onChangeText={function (t) { setYear(t.replace(/[^0-9]/g, '')); setError(''); }} selectionColor="#D9A441" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={p.inputLabel}>{T.dayLabel}</Text>
              <TextInput style={p.input} placeholder="14" placeholderTextColor="rgba(255,255,255,0.2)" keyboardType="number-pad" maxLength={2} value={day} onChangeText={function (t) { setDay(t.replace(/[^0-9]/g, '')); setError(''); }} selectionColor="#D9A441" />
            </View>
          </View>
          <Text style={[p.inputLabel, { marginTop: 16 }]}>{T.monthLabel}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {months.map(function (m, i) {
              var sel = month === i;
              return (
                <TouchableOpacity key={i} onPress={function () { setMonth(i); setError(''); }} activeOpacity={0.75} style={[p.monthChip, sel && p.monthChipSel]}>
                  <Text style={[p.monthText, sel && p.monthTextSel]}>{m}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {error ? <Text style={p.error}>{error}</Text> : null}
        </Card>
        <View style={{ marginTop: 22 }}>
          <PrimaryButton label={T.continueBtn} onPress={submit} icon="arrow-forward" />
        </View>
      </Animated.View>
    </InputChapterFrame>
  );
}

function TimeChapter({ lang, initial, onNext, onBack }) {
  var T = COPY[lang] || COPY.en;
  var [hour, setHour] = useState(initial ? initial.hour : '');
  var [minute, setMinute] = useState(initial ? initial.minute : '');
  var [ampm, setAmpm] = useState(initial ? initial.ampm : 'AM');
  var [error, setError] = useState('');

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

  return (
    <InputChapterFrame onBack={onBack} T={T}>
      <Animated.View entering={FadeInDown.duration(500)}>
        <ChapterHeading title={T.timeTitle} sub={T.timeSub} />
        <Card>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Text style={p.inputLabel}>{lang === 'si' ? 'පැය' : 'HOUR'}</Text>
              <TextInput style={p.input} placeholder="8" placeholderTextColor="rgba(255,255,255,0.2)" keyboardType="number-pad" maxLength={2} value={hour} onChangeText={function (t) { setHour(t.replace(/[^0-9]/g, '')); setError(''); }} selectionColor="#D9A441" />
            </View>
            <Text style={{ color: 'rgba(248,231,184,0.5)', fontSize: 26, fontWeight: '800', paddingBottom: 10 }}>:</Text>
            <View style={{ flex: 1 }}>
              <Text style={p.inputLabel}>{lang === 'si' ? 'මිනිත්තු' : 'MINUTE'}</Text>
              <TextInput style={p.input} placeholder="30" placeholderTextColor="rgba(255,255,255,0.2)" keyboardType="number-pad" maxLength={2} value={minute} onChangeText={function (t) { setMinute(t.replace(/[^0-9]/g, '')); setError(''); }} selectionColor="#D9A441" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 18 }}>
            {['AM', 'PM'].map(function (v) {
              var sel = ampm === v;
              return (
                <TouchableOpacity key={v} onPress={function () { setAmpm(v); }} activeOpacity={0.8} style={[p.ampmBtn, sel && p.ampmSel]}>
                  <Text style={[p.ampmText, sel && p.ampmTextSel]}>{v}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {error ? <Text style={p.error}>{error}</Text> : null}
        </Card>
        <View style={{ marginTop: 22 }}>
          <PrimaryButton label={T.continueBtn} onPress={submit} icon="arrow-forward" />
        </View>
        <GhostButton label={T.timeUnknown} onPress={skipUnknown} />
        <Text style={p.hint}>{T.timeUnknownNote}</Text>
      </Animated.View>
    </InputChapterFrame>
  );
}

function PlaceChapter({ lang, initial, onNext, onBack }) {
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
            <Ionicons name="location" size={16} color="#34D399" />
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
      {/* the orb-keeper reads THEIR sky — the chart forms around the orb */}
      <View style={{ height: SH * 0.44, marginBottom: 18 }}>
        <SceneOrb reading progress={lineIdx} />
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
  var zodiacImg = ZODIAC_IMAGE_MAP ? ZODIAC_IMAGE_MAP[reveal.lagna.english] : null;
  var lagnaIndex = RASHI_TO_ZODIAC_INDEX[reveal.lagna.name] || 0;
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

  var wheelSize = Math.min(SW * 0.78, 300);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.duration(600)} style={{ alignItems: 'center', marginBottom: 6 }}>
        <Text style={[p.kicker, { color: '#D9A441' }]}>{T.identityKicker}</Text>
        <Text style={[p.sub, { marginTop: 2, fontSize: 14.5, color: 'rgba(248,231,184,0.8)' }]}>{reveal.greeting}</Text>
      </Animated.View>

      {/* Lagna hero — the wheel locked on their sign */}
      <View style={{ alignItems: 'center', marginTop: 14, marginBottom: 20 }}>
        <View style={{ width: wheelSize, height: wheelSize, alignItems: 'center', justifyContent: 'center' }}>
          {/* the astrolabe behind, their sign lit */}
          <Animated.View entering={FadeIn.delay(150).duration(900)} style={{ position: 'absolute', opacity: 0.85 }}>
            <AwesomeRashiChakra size={wheelSize} activeSignIndex={lagnaIndex} variant="astrolabe" showSolarOrbit={false} />
          </Animated.View>
          {/* landing flash */}
          <Animated.View style={[{ position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 2, borderColor: '#FFD666', backgroundColor: 'rgba(255,214,102,0.12)' }, flashStyle]} />
          {/* their sign, punched in */}
          <Animated.View style={[p.lagnaOrb, lockStyle]}>
            <LinearGradient colors={['rgba(255,184,0,0.16)', 'rgba(147,51,234,0.10)', 'rgba(6,4,9,0.92)']} style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            {zodiacImg
              ? <Image source={zodiacImg} style={{ width: 74, height: 74, borderRadius: 37 }} resizeMode="contain" />
              : <Ionicons name="planet" size={54} color="#FFD666" />}
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
          <Ionicons name="star" size={12} color="#C4B5FD" />
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
                  <Ionicons name={CARD_ICONS[item.kind] || 'sparkles-outline'} size={15} color={color} />
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
        <Ionicons name="gift-outline" size={14} color="#34D399" />
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
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: card.color + '16', borderWidth: 1, borderColor: card.color + '40', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={card.icon || 'sparkles-outline'} size={18} color={card.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '900', color: card.color, letterSpacing: 1.4, textTransform: 'uppercase' }}>{card.domain}</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFF1D0', marginTop: 2 }}>{card.title}</Text>
                </View>
                {isFree ? (
                  <View style={[p.lockPill, { backgroundColor: 'rgba(52,211,153,0.10)', borderColor: 'rgba(52,211,153,0.35)' }]}>
                    <Ionicons name="lock-open" size={10} color="#6EE7B7" />
                    <Text style={{ fontSize: 8.5, fontWeight: '900', color: '#6EE7B7', letterSpacing: 1 }}>{T.freeLabel}</Text>
                  </View>
                ) : (
                  <View style={p.lockPill}>
                    <Ionicons name="lock-closed" size={10} color="rgba(255,214,102,0.9)" />
                    <Text style={{ fontSize: 8.5, fontWeight: '900', color: 'rgba(255,214,102,0.9)', letterSpacing: 1 }}>{T.lockedLabel}</Text>
                  </View>
                )}
              </View>
              {/* THE REAL DATE — the hook stays visible */}
              <View style={[p.windowPill, { borderColor: card.color + '45', backgroundColor: card.color + '10' }]}>
                <Ionicons name="calendar-outline" size={13} color={card.color} />
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
        <View style={p.signinOrb}>
          <LinearGradient colors={['rgba(147,51,234,0.12)', 'rgba(255,184,0,0.08)', 'rgba(13,11,46,0.9)']} style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <Image source={APP_LOGO_IMAGE} style={{ width: 52, height: 52 }} resizeMode="contain" />
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
                  <Ionicons name={card.icon} size={18} color={card.color} />
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
          <Ionicons name="alert-circle" size={15} color="#FF6B6B" />
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
              <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
            </View>
          )}
        </View>
      </SpringPressable>

      <View style={p.trustRow}>
        <View style={p.trustItem}><Ionicons name="shield-checkmark" size={13} color="#34D399" /><Text style={p.trustText}>{T.trustVerified}</Text></View>
        <View style={p.trustDot} />
        <View style={p.trustItem}><Ionicons name="lock-closed" size={12} color="#A78BFA" /><Text style={p.trustText}>{T.trustEncrypted}</Text></View>
        <View style={p.trustDot} />
        <View style={p.trustItem}><Ionicons name="eye-off" size={12} color="#FFB800" /><Text style={p.trustText}>{T.trustPrivate}</Text></View>
      </View>

      {onBack ? <GhostButton label={T.back} onPress={onBack} /> : null}
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  CHAPTER: PAYWALL — personalized; purchases DIRECTLY (no second wall);
//  soft decline appears after a beat
// ═══════════════════════════════════════════════════════════════════════

// Find the monthly subscription package across all configured offerings.
// Mirrors PaywallScreen's matcher so both purchase surfaces stay in sync.
function findMonthlyPackage(offerings) {
  if (!offerings) return null;
  var pools = [];
  if (offerings.current && offerings.current.availablePackages) {
    pools.push(offerings.current.availablePackages);
  }
  if (offerings.all) {
    Object.keys(offerings.all).forEach(function (k) {
      var off = offerings.all[k];
      if (off && off.availablePackages) pools.push(off.availablePackages);
    });
  }
  var matcher = function (p) {
    return p.packageType === 'MONTHLY' || p.identifier === '$rc_monthly' ||
      (p.product && p.product.identifier && p.product.identifier.indexOf('monthly') !== -1);
  };
  for (var i = 0; i < pools.length; i++) {
    var hit = pools[i].find(matcher);
    if (hit) return hit;
  }
  return null;
}

function PaywallChapter({ lang, displayName, birthData, reveal, onPaid, onDecline }) {
  var T = COPY[lang] || COPY.en;
  var [loading, setLoading] = useState(false);
  var [restoring, setRestoring] = useState(false);
  var [payError, setPayError] = useState('');
  var [agreed, setAgreed] = useState(false);
  var [agreementError, setAgreementError] = useState('');
  var [showDecline, setShowDecline] = useState(false);
  var [offerings, setOfferings] = useState(null);
  var [storePriceString, setStorePriceString] = useState(null);
  var { restorePurchases, isSubscribed, applyPurchasedSubscription } = useAuth();
  var pricingCtx = usePricingForBirth(birthData);
  var priceAmount = pricingCtx.priceAmount;
  var isInternational = pricingCtx.isInternational;
  var currency = pricingCtx.currency;
  var syncFromStoreCurrency = pricingCtx.syncFromStoreCurrency;
  var resp = useResponsive();
  var isSmall = resp.isSmall;

  useEffect(function () {
    // soft-wall escape appears only after the offer has had its moment
    var t = setTimeout(function () { setShowDecline(true); }, 2500);
    return function () { clearTimeout(t); };
  }, []);

  // This chapter IS the paywall now (it used to open the global PaywallScreen
  // on top of itself — a second wall). Log the funnel 'shown' event here.
  useEffect(function () {
    logPaywallEvent('shown', { source: 'onboarding', plan: 'monthly', currency: currency });
  }, []);

  // Pre-load offerings so the tap purchases instantly; sync the store's real
  // currency, and for international users show the exact store price they
  // will be charged (LKR users always keep our own LKR pricing).
  useEffect(function () {
    var cancelled = false;
    getOfferings()
      .then(function (off) {
        if (cancelled || !off) return;
        setOfferings(off);
        var pkg = findMonthlyPackage(off);
        var prod = pkg && pkg.product;
        if (prod && prod.priceString) setStorePriceString(prod.priceString);
        var rcCurrency = prod && (prod.currencyCode || prod.priceCurrencyCode);
        if (rcCurrency && syncFromStoreCurrency) syncFromStoreCurrency(rcCurrency);
      })
      .catch(function () { /* purchase falls back to a fresh fetch */ });
    return function () { cancelled = true; };
  }, []);

  // Never pitch a subscription to an account that already has one — covers
  // re-installs whose entitlement arrives via the RevenueCat listener after
  // sign-in, and restores that update auth state out-of-band.
  useEffect(function () {
    if (isSubscribed) onPaid();
  }, [isSubscribed]);

  var dashaLabel = reveal && reveal.dasha ? reveal.dasha.lordLabel : '';
  var headline = displayName
    ? T.paywallHeadline.replace('{name}', displayName).replace('{dasha}', dashaLabel)
    : T.paywallHeadlineNoName.replace('{dasha}', dashaLabel);

  var features = [
    { icon: 'calendar-outline', text: T.feature1, color: '#FFB800' },
    { icon: 'planet-outline', text: T.feature2, color: '#FF8C00' },
    { icon: 'notifications-outline', text: T.feature3, color: '#06D6A0' },
    { icon: 'chatbubbles-outline', text: T.feature4, color: '#A78BFA' },
    { icon: 'heart-outline', text: T.feature5, color: '#FF6B9D' },
  ];

  var ensureAgreement = function () {
    if (agreed) return true;
    setPayError('');
    setAgreementError(T.agreeError);
    return false;
  };

  // Purchase RIGHT HERE — the store's own payment sheet is the only thing
  // that opens on top of this chapter. (Previously this button opened the
  // global PaywallScreen: a second, different-looking wall the user had to
  // buy through again.)
  var handleSub = async function () {
    if (!ensureAgreement()) return;
    setLoading(true); setPayError('');
    try {
      var off = offerings;
      if (!off) {
        try { off = await getOfferings(); } catch (offErr) { off = null; }
      }
      var pkg = findMonthlyPackage(off);
      var result = pkg
        ? await purchasePackage(pkg)
        : await purchaseOneTimeProduct(PRODUCT_IDS.monthly);
      if (result && (result.isProActive || result.purchased)) {
        logPaywallEvent('purchased', { source: 'onboarding', plan: 'monthly', currency: currency });
        await applyPurchasedSubscription(result);
        onPaid();
      } else {
        setPayError(T.payFail);
      }
    } catch (e) {
      var msg = (e && e.message) || '';
      if (msg.indexOf('cancelled') === -1 && msg.indexOf('cancel') === -1 && msg.indexOf('dismiss') === -1) setPayError(T.payFail);
    } finally { setLoading(false); }
  };

  var handleRestore = async function () {
    if (!ensureAgreement()) return;
    setRestoring(true); setPayError('');
    try {
      var result = await restorePurchases();
      if (result && result.isProActive) {
        logPaywallEvent('purchased', { source: 'onboarding', plan: 'restore', currency: currency });
        await applyPurchasedSubscription(result);
        onPaid();
      } else setPayError(T.restoreNone);
    } catch (e) {
      setPayError(T.restoreFail);
    } finally { setRestoring(false); }
  };

  var handleDecline = function () {
    logPaywallEvent('dismissed', { source: 'onboarding', plan: 'monthly', currency: currency });
    onDecline();
  };

  var checkboxBorder = agreed ? '#FF8C00' : agreementError ? '#FCA5A5' : 'rgba(255,255,255,0.3)';
  var checkboxBg = agreed ? '#FF8C00' : 'rgba(0,0,0,0.2)';
  // only the still-locked windows belong in the loss-framing list
  var futureCards = ((reveal && reveal.futureCards) || []).filter(function (c) { return c.locked !== false; });

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 22, paddingTop: 6, paddingBottom: 22 }} showsVerticalScrollIndicator={false} bounces={false} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(450)} style={{ alignItems: 'center', marginBottom: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', marginBottom: 10, ...boxShadow('#FFB800', { width: 0, height: 0 }, 0.7, 14) }}>
          <LinearGradient colors={['#FFD700', '#FF8C00']} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="diamond" size={22} color="#FFF1D0" />
          </LinearGradient>
        </View>
        <Text numberOfLines={3} style={{ fontSize: isSmall ? 19 : 22, fontWeight: '800', color: '#FFF8E0', textAlign: 'center', lineHeight: isSmall ? 25 : 29, paddingHorizontal: 2 }}>
          {headline}
        </Text>
        <Text style={{ fontSize: 12, color: 'rgba(255,220,150,0.6)', textAlign: 'center', marginTop: 6, lineHeight: 17, paddingHorizontal: 8 }}>{T.paywallSub}</Text>
      </Animated.View>

      {/* THEIR real locked windows — the personalized loss-framing */}
      {futureCards.length ? (
        <Animated.View entering={FadeInDown.delay(110).duration(400)} style={{ marginBottom: 13, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,184,0,0.16)', backgroundColor: 'rgba(255,184,0,0.04)' }}>
          <View style={{ paddingVertical: 11, paddingHorizontal: 14 }}>
            <Text style={{ fontSize: 9, fontWeight: '900', color: '#FFB800', letterSpacing: 1.5, marginBottom: 8 }}>{T.yourWindows}</Text>
            {futureCards.slice(0, 4).map(function (card) {
              return (
                <View key={card.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 }}>
                  <Ionicons name={card.icon || 'sparkles-outline'} size={14} color={card.color} />
                  <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.72)', flex: 1 }}>
                    {card.title} — <Text style={{ color: card.color }}>{card.window}</Text>
                  </Text>
                  <Ionicons name="lock-closed" size={10} color="rgba(255,184,0,0.45)" />
                </View>
              );
            })}
          </View>
        </Animated.View>
      ) : null}

      {/* Price */}
      <Animated.View entering={FadeInUp.delay(150).duration(400)} style={{ alignSelf: 'center', marginBottom: 6, borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,184,0,0.25)' }}>
        <LinearGradient colors={['rgba(255,184,0,0.22)', 'rgba(255,140,0,0.10)']} style={{ flexDirection: 'row', alignItems: 'baseline', paddingVertical: 12, paddingHorizontal: 22, gap: 4 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          {isInternational && storePriceString ? (
            // international: the store's exact charge price (currency included)
            <Text style={{ fontSize: isSmall ? 30 : 36, fontWeight: '900', color: '#FFB800', ...textShadow('rgba(255,184,0,0.5)', { width: 0, height: 0 }, 12) }}>{storePriceString}</Text>
          ) : (
            <>
              <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}>{isInternational ? '$' : 'LKR'}</Text>
              <Text style={{ fontSize: isSmall ? 34 : 40, fontWeight: '900', color: '#FFB800', ...textShadow('rgba(255,184,0,0.5)', { width: 0, height: 0 }, 12) }}>{priceAmount('subscription')}</Text>
            </>
          )}
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginLeft: 2 }}>{T.perMonth}</Text>
        </LinearGradient>
      </Animated.View>
      <Text style={{ textAlign: 'center', fontSize: 11, color: 'rgba(52,211,153,0.85)', fontWeight: '600', marginBottom: 14 }}>{T.cancelAnytime}</Text>

      {/* Features */}
      <Animated.View entering={FadeInUp.delay(210).duration(400)} style={{ marginBottom: 14 }}>
        <Card style={{ paddingVertical: 6, paddingHorizontal: 14 }}>
          {features.map(function (f, i) {
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10, borderBottomWidth: i === features.length - 1 ? 0 : 1, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
                <Ionicons name="checkmark-circle" size={16} color="#34D399" />
                <View style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: f.color + '18', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={f.icon} size={14} color={f.color} />
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12.5, flex: 1, lineHeight: 17 }} numberOfLines={2}>{f.text}</Text>
              </View>
            );
          })}
        </Card>
      </Animated.View>

      {/* Terms */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap', paddingHorizontal: 8 }}>
        <TouchableOpacity onPress={function () { setAgreed(!agreed); if (!agreed) setAgreementError(''); }} activeOpacity={0.7} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
          <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: checkboxBorder, backgroundColor: checkboxBg, alignItems: 'center', justifyContent: 'center' }}>
            {agreed ? <Ionicons name="checkmark" size={16} color="#FFF" /> : null}
          </View>
        </TouchableOpacity>
        <Text style={{ color: agreementError ? '#FECACA' : 'rgba(255,255,255,0.75)', fontSize: 12, lineHeight: 18, flexShrink: 1 }} onPress={function () { setAgreed(!agreed); if (!agreed) setAgreementError(''); }}>
          {T.agreePrefix}
          <Text style={{ color: '#FF8C00', textDecorationLine: 'underline', fontWeight: '600' }} onPress={function () { Linking.openURL('https://grahachara.com/legal/terms.html'); }}>{T.agreeTerms}</Text>
          {T.agreeSuffix}
        </Text>
      </View>
      {agreementError ? (
        <Animated.View entering={FadeInDown.duration(220)} style={p.errorWrap}>
          <Ionicons name="alert-circle-outline" size={14} color="#FCA5A5" />
          <Text style={p.errorWrapText}>{agreementError}</Text>
        </Animated.View>
      ) : null}
      {payError ? (
        <Animated.View entering={FadeInDown.duration(300)} style={p.errorWrap}>
          <Ionicons name="alert-circle" size={14} color="#FF6B6B" />
          <Text style={p.errorWrapText}>{payError}</Text>
        </Animated.View>
      ) : null}

      {/* Risk reversal */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12, paddingHorizontal: 12 }}>
        <Ionicons name="shield-checkmark" size={13} color="#34D399" />
        <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(52,211,153,0.85)', textAlign: 'center', lineHeight: 16 }}>{T.riskReversal}</Text>
      </View>

      {/* CTA */}
      <PrimaryButton label={T.payCta} onPress={handleSub} loading={loading} icon="sparkles" />

      {/* Footer: restore + soft decline */}
      <View style={{ alignItems: 'center', marginTop: 14, gap: 10 }}>
        <TouchableOpacity onPress={handleRestore} disabled={restoring} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 14, right: 14 }}>
          <Text style={{ color: 'rgba(255,184,0,0.6)', fontSize: 11, textDecorationLine: 'underline' }}>
            {restoring ? T.restoring : T.restore}
          </Text>
        </TouchableOpacity>
        {showDecline ? (
          <Animated.View entering={FadeIn.duration(800)}>
            <TouchableOpacity onPress={handleDecline} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 14, right: 14 }}>
              <Text style={{ color: 'rgba(248,231,184,0.6)', fontSize: 13, fontWeight: '600' }}>{T.softDecline}</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}
      </View>
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
      <Animated.View style={[{ width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(217,164,65,0.10)', borderWidth: 1, borderColor: 'rgba(217,164,65,0.32)' }, sealStyle]}>
        <Ionicons name="sparkles" size={40} color="#FFD666" />
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

var CHAPTERS = ['language', 'name', 'story', 'date', 'time', 'place', 'casting', 'identity', 'chart', 'future', 'signin', 'paywall', 'complete'];

export default function OnboardingScreen({ onComplete, isReturningUser }) {
  var { language: ctxLang, switchLanguage } = useLanguage();
  var { colors } = useTheme();
  var { completeOnboarding, isSubscribed } = useAuth();
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
  // ref (not state) so `go` closures captured in child effects never go stale
  var transitioningRef = useRef(false);
  var curtain = useSharedValue(0);
  var sweep = useSharedValue(0);
  var T = COPY[lang] || COPY.en;

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
      timezone: 'Asia/Colombo',
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
          <PlaceChapter lang={lang} initial={birthCity} onNext={function (city) {
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
            onError={function () { go('place'); }}
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
              // Already-subscribed accounts (re-installs, restores) must never
              // be walked into the paywall chapter — close out directly.
              if (isSubscribed) { finishOnboarding(); return; }
              go('paywall');
            }}
            onBack={isReturningUser ? null : function () { go('future'); }}
          />
        );
      case 'paywall':
        return (
          <PaywallChapter
            lang={lang} displayName={displayName} birthData={birthData} reveal={reveal}
            onPaid={finishOnboarding}
            onDecline={finishOnboarding}
          />
        );
      case 'complete':
        return <CompleteChapter lang={lang} onDone={onComplete} />;
      default:
        return <LanguageChapter onSelect={function (code) { setLang(code); switchLanguage(code); go('name'); }} />;
    }
  };

  // thin narrative progress — only during the input→paywall stretch
  var chapterIdx = CHAPTERS.indexOf(chapter);
  var showProgress = !isReturningUser && chapterIdx >= 2 && chapterIdx <= 11;
  var progress = showProgress ? (chapterIdx - 1) / 11 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <StatusBar barStyle={colors.statusBarStyle} translucent backgroundColor="transparent" />
      <Starfield />
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

  card: { backgroundColor: 'rgba(16,11,7,0.72)', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: 'rgba(217,164,65,0.14)', overflow: 'hidden', ...boxShadow('rgba(0,0,0,0.45)', { width: 0, height: 10 }, 0.9, 18) },
  input: { backgroundColor: 'rgba(7,5,3,0.58)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 15 : 13, color: '#F8E7B8', fontSize: 16, fontWeight: '600', borderWidth: 1, borderColor: 'rgba(217,164,65,0.16)' },
  inputLabel: { color: 'rgba(248,231,184,0.45)', fontSize: 10.5, fontWeight: '800', marginBottom: 8, letterSpacing: 1.4, textTransform: 'uppercase' },

  // Premium single-line name field — hero of the name chapter.
  // Cosmic-glass tint (cool indigo, translucent) so it reads as part of the
  // starfield rather than a warm brown box; gold hairline that ignites on focus.
  nameField: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(18,17,42,0.55)', borderRadius: 16, paddingHorizontal: 18, paddingVertical: Platform.OS === 'ios' ? 18 : 16, borderWidth: 1.5, borderColor: 'rgba(217,164,65,0.22)', overflow: 'hidden', ...boxShadow('rgba(0,0,0,0.45)', { width: 0, height: 10 }, 0.7, 18) },
  nameFieldFocus: { backgroundColor: 'rgba(26,24,56,0.62)', borderColor: 'rgba(232,201,122,0.75)', ...boxShadow('rgba(217,164,65,0.5)', { width: 0, height: 0 }, 0.95, 22) },
  nameFieldError: { borderColor: 'rgba(239,68,68,0.55)' },
  nameInput: { flex: 1, color: '#F8E7B8', fontSize: 17, fontWeight: '600', letterSpacing: 0.3, padding: 0, margin: 0 },
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

  langRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 17, paddingHorizontal: 18, borderRadius: 18, borderWidth: 1, backgroundColor: 'rgba(14,10,22,0.66)' },
  langIcon: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  storyBig: { fontSize: 28, fontWeight: '900', color: '#EFD9A8', lineHeight: 38, letterSpacing: 0.4, textAlign: 'center', ...textShadow('rgba(232,201,122,0.5)', { width: 0, height: 0 }, 16) },
  storySmall: { fontSize: 15.5, fontWeight: '500', color: 'rgba(248,231,184,0.62)', lineHeight: 25, textAlign: 'center', marginTop: 18, paddingHorizontal: 4 },
  storySmallWord: { fontSize: 15.5, fontWeight: '500', fontStyle: 'italic', color: 'rgba(233,213,166,0.78)', lineHeight: 25 },
  storyBigInk: { fontSize: 28, fontWeight: '900', color: '#2E2312', lineHeight: 38, letterSpacing: 0.3, textAlign: 'center' },
  storySmallInk: { fontSize: 15.5, fontWeight: '600', fontStyle: 'italic', color: 'rgba(46,35,18,0.8)', lineHeight: 25 },

  monthChip: { width: '22.6%', paddingVertical: 9, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  monthChipSel: { backgroundColor: 'rgba(255,184,0,0.15)', borderColor: '#FFB800' },
  monthText: { color: 'rgba(255,255,255,0.5)', fontSize: 12.5, fontWeight: '600' },
  monthTextSel: { color: '#FFD666', fontWeight: '800' },

  ampmBtn: { paddingHorizontal: 32, paddingVertical: 13, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  ampmSel: { backgroundColor: 'rgba(6,182,212,0.15)', borderColor: '#06B6D4' },
  ampmText: { color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: '700' },
  ampmTextSel: { color: '#67E8F9' },

  cityBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginTop: 12, backgroundColor: 'rgba(52,211,153,0.08)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.2)' },
  cityBadgeText: { color: '#6EE7B7', fontSize: 14, fontWeight: '600', flex: 1 },
  cityBadgeCoords: { color: 'rgba(255,255,255,0.35)', fontSize: 11 },

  lagnaOrb: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,184,0,0.28)', ...boxShadow('rgba(255,184,0,0.35)', { width: 0, height: 0 }, 0.7, 26) },
  nakBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(167,139,250,0.09)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)' },

  futureCard: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 12, backgroundColor: 'rgba(13,9,18,0.68)', overflow: 'hidden' },
  lockPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: 'rgba(255,184,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.22)' },
  windowPill: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', marginTop: 12, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1 },

  signinOrb: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,184,0,0.2)', overflow: 'hidden', ...boxShadow('rgba(147,51,234,0.3)', { width: 0, height: 0 }, 0.6, 24) },
  valueCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  valueCardIcon: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  googleBtn: { backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 17, paddingHorizontal: 22, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)' },
  googleLogoWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', ...boxShadow('rgba(0,0,0,0.2)', { width: 0, height: 1 }, 0.8, 4) },
  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trustDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.15)' },
  trustText: { fontSize: 11, color: 'rgba(255,220,180,0.4)', fontWeight: '600' },
});
