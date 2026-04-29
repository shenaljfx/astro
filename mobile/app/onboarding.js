/**
 * Onboarding Flow — Mobile-First Cosmic Design
 * Step -1: Language Selection (Sinhala / English)
 * Step 0:  Welcome
 * Step 1:  Google Sign-In
 * Step 2:  Subscription
 * Step 3:  Birth Data (multi-page wizard: Name → Date → Time → Place)
 * Step 4:  Lagna Reveal (spectacular birth chart reveal with animations)
 * Step 5:  Complete
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Platform,
  Dimensions, KeyboardAvoidingView, ScrollView,
  StatusBar, Image, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown, FadeInUp, FadeIn, FadeOut,
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withSpring, withSequence, withDelay, interpolate, Easing,
} from 'react-native-reanimated';
import useReducedMotion from '../hooks/useReducedMotion';
import SpringPressable from '../components/effects/SpringPressable';
import CosmicLoader from '../components/effects/CosmicLoader';
import CitySearchPicker from '../components/CitySearchPicker';
import { getBirthChartBasic } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import useResponsive from '../hooks/useResponsive';
import usePricingForBirth from '../hooks/usePricingForBirth';
import AwesomeRashiChakra from '../components/AwesomeRashiChakra';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { boxShadow, textShadow } from '../utils/shadow';
import { ZODIAC_IMAGES, ZODIAC_IMAGE_MAP as ZODIAC_IMG_MAP } from '../components/ZodiacIcons';

var { width: SW, height: SH } = Dimensions.get('window');
var LOGO = require('../assets/logo.png');


// ═══════════════════════════════════════════════════════════════════════
//  CINEMATIC COMPONENTS — Movie-quality onboarding experience
// ═══════════════════════════════════════════════════════════════════════

// ── Animated Starfield Background ──────────────────────────────────
// Persistent parallax starfield that runs behind ALL onboarding steps
// Multiple layers for depth: distant dim stars, mid-range, and close bright ones

var STAR_LAYERS = [];
// Generate 3 layers of stars (seeded positions so they don't regenerate)
(function () {
  // Layer 1: distant dim stars (many, small, slow)
  var layer1 = [];
  for (var i = 0; i < 18; i++) {
    layer1.push({
      x: ((i * 7919 + 3571) % 1000) / 10,   // pseudo-random 0-100%
      y: ((i * 6271 + 1433) % 1000) / 10,
      size: 1 + ((i * 3137) % 100) / 100,    // 1-2px
      opacity: 0.15 + ((i * 4219) % 100) / 250,  // 0.15-0.55
      twinkleSpeed: 3000 + ((i * 2399) % 4000),
      twinkleDelay: ((i * 1847) % 3000),
    });
  }
  // Layer 2: mid-range stars
  var layer2 = [];
  for (var i = 0; i < 8; i++) {
    layer2.push({
      x: ((i * 5431 + 2917) % 1000) / 10,
      y: ((i * 8513 + 4219) % 1000) / 10,
      size: 1.5 + ((i * 2741) % 100) / 60,   // 1.5-3.2px
      opacity: 0.3 + ((i * 3719) % 100) / 200,
      twinkleSpeed: 2000 + ((i * 1913) % 3000),
      twinkleDelay: ((i * 2371) % 2500),
    });
  }
  // Layer 3: close bright stars (few, larger, faster twinkle)
  var layer3 = [];
  for (var i = 0; i < 4; i++) {
    layer3.push({
      x: ((i * 9721 + 1571) % 1000) / 10,
      y: ((i * 4517 + 7919) % 1000) / 10,
      size: 2.5 + ((i * 1847) % 100) / 50,   // 2.5-4.5px
      opacity: 0.5 + ((i * 6197) % 100) / 300,
      twinkleSpeed: 1500 + ((i * 3571) % 2000),
      twinkleDelay: ((i * 997) % 2000),
    });
  }
  STAR_LAYERS.push(layer1, layer2, layer3);
})();

function TwinklingStar({ star, layerSpeed, reduced }) {
  var twinkle = useSharedValue(0);
  useEffect(function () {
    if (reduced) return;
    twinkle.value = withDelay(star.twinkleDelay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: star.twinkleSpeed * 0.4, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: star.twinkleSpeed * 0.6, easing: Easing.inOut(Easing.sin) })
        ), -1, false
      )
    );
  }, [reduced]);
  var style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(twinkle.value, [0, 1], [star.opacity * 0.3, star.opacity]),
      transform: [{ scale: interpolate(twinkle.value, [0, 1], [0.6, 1.2]) }],
    };
  });
  return (
    <Animated.View style={[{
      position: 'absolute',
      left: star.x + '%',
      top: star.y + '%',
      width: star.size,
      height: star.size,
      borderRadius: star.size / 2,
      backgroundColor: '#FFF8E1',
    }, style]} />
  );
}

function CinematicStarfield() {
  var reduced = useReducedMotion();
  var nebulaShift = useSharedValue(0);
  useEffect(function () {
    if (reduced) return;
    nebulaShift.value = withRepeat(
      withTiming(1, { duration: 20000, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );
  }, [reduced]);
  var nebula1 = useAnimatedStyle(function () {
    return {
      opacity: interpolate(nebulaShift.value, [0, 1], [0.03, 0.08]),
      transform: [
        { translateX: interpolate(nebulaShift.value, [0, 1], [-20, 20]) },
        { translateY: interpolate(nebulaShift.value, [0, 1], [10, -15]) },
      ],
    };
  });
  var nebula2 = useAnimatedStyle(function () {
    return {
      opacity: interpolate(nebulaShift.value, [0, 1], [0.05, 0.02]),
      transform: [
        { translateX: interpolate(nebulaShift.value, [0, 1], [15, -25]) },
        { translateY: interpolate(nebulaShift.value, [0, 1], [-10, 20]) },
      ],
    };
  });
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Nebula clouds */}
      <Animated.View style={[{ position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(147,51,234,0.12)', top: -50, right: -80 }, nebula1]} />
      <Animated.View style={[{ position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(255,140,0,0.08)', bottom: SH * 0.2, left: -60 }, nebula2]} />
      <Animated.View style={[{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(59,130,246,0.06)', top: SH * 0.4, right: -40 }, nebula1]} />
      {/* Star layers — skip dim layer for performance, keep mid + bright */}
      {STAR_LAYERS[1].map(function (s, i) { return <TwinklingStar key={'s2_' + i} star={s} layerSpeed={0.6} reduced={reduced} />; })}
      {STAR_LAYERS[2].map(function (s, i) { return <TwinklingStar key={'s3_' + i} star={s} layerSpeed={1} reduced={reduced} />; })}
    </View>
  );
}


// ── Cinematic Scene Transition ─────────────────────────────────────
// Fade to black → hold → fade in next scene (like movie scene changes)
function SceneTransition({ children, sceneKey }) {
  var opacity = useSharedValue(0);
  useEffect(function () {
    // Fade in
    opacity.value = 0;
    opacity.value = withDelay(100, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [sceneKey]);
  var animStyle = useAnimatedStyle(function () {
    return { opacity: opacity.value };
  });
  return (
    <Animated.View style={[{ flex: 1 }, animStyle]}>
      {children}
    </Animated.View>
  );
}

// ── Scene Black Curtain ────────────────────────────────────────────
// Full-screen black overlay that fades in/out during step transitions
function SceneBlackCurtain({ opacity }) {
  var style = useAnimatedStyle(function () {
    return {
      opacity: opacity.value,
      pointerEvents: opacity.value > 0.01 ? 'auto' : 'none',
    };
  });
  return <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, style]} />;
}

// ═══════════════════════════════════════════════════════════════════════
//  TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════

var OB = {
  en: {
    welcomeSubtitle: "The Universe Has a Message for You",
    welcomeDesc: "Your rising sign holds secrets you've never heard\nThe planets are whispering — are you listening?\nYour cosmic destiny is waiting to be decoded",
    welcomeBtn: "Reveal My Destiny Now",
    welcomeHint: "Thousands are discovering what their stars hide",
    nasaBadge: "🛰️ Powered by NASA JPL planetary data — 100× more accurate than traditional almanacs",
    googleTitle: "Your Stars Await ✨",
    googleSubtitle: "Sign in to securely save your birth chart & get personalized daily predictions",
    googleBtn: "Continue with Google",
    googleFail: "Sign in failed. Please try again.",
    subTitle: "90% Of Your Destiny Is Still Hidden! 🌟",
    subSubtitle: "Your ultimate power and wealth secrets are locked \u2014 unlock them now",
    subFeature1: "Weekly destiny forecast based on your rising sign",
    subFeature2: "Your complete birth chart — fully decoded",
    subFeature3: "Find your true soulmate match score",
    subFeature4: "AI reads your past, present & future",
    subFeature5: "Get warned before bad planetary periods hit",
    subFeature6: "Secret predictions visible only to you",
    subPerDay: "/day",
    subNote: "Billed via Google Play / App Store",
    subNetworks: "Google Play \u2022 App Store \u2022 All cards accepted",
    subBtn: "Show Me Everything",
    subPayFail: "Payment failed. Please try again or use a different card.",
    subFailed: "Subscription failed",
    nameTitle: "Your Stars Are Calling You",
    nameSubtitle: "Type your name — the cosmos is already reading it",
    nameLabel: "YOUR NAME",
    namePlaceholder: "Enter your name",
    nameError: "Please enter your name (min 2 chars)",
    dateTitle: "This Date Changed Everything",
    dateSubtitle: "The exact day the universe wrote your fate",
    yearLabel: "YEAR",
    yearPlaceholder: "1995",
    monthLabel: "MONTH",
    dayLabel: "DAY",
    dayPlaceholder: "15",
    dateError: "Please enter a valid birth date",
    yearError: "Enter a valid year (1900\u20132026)",
    monthError: "Please select a month",
    dayError: "Enter a valid day for this month",
    dateHint: "This unlocks your ruling planet and zodiac lord",
    timeTitle: "The Exact Moment That Defines You",
    timeSubtitle: "One minute difference = completely different destiny",
    hourLabel: "HOUR",
    minuteLabel: "MINUTE",
    timeError: "Enter a valid time (hour 1\u201312, minute 0\u201359)",
    timeHint: "Exact time = precise birth chart.\nIf unknown, skip \u2014 we'll use 12:00 PM.",
    placeTitle: "Where Your Destiny Was Written",
    placeSubtitle: "The sky above your birthplace holds the answer",
    placeSearch: "Search any city...",
    placeHint: "Different location = different planetary angles.\nThis makes your chart uniquely yours.",
    cityError: "Please select your birth city",
    subProgressName: "Name",
    subProgressDate: "Date",
    subProgressTime: "Time",
    subProgressPlace: "Place",
    back: "Back",
    continueBtn: "Reveal Next",
    completeSetup: "Decode My Stars",
    skipBirth: "Skip \u2014 add later in Profile",
    saveFailed: "Failed to save. Please try again.",
    completeTitle: "The Stars Have Spoken!",
    completeSubtitle: "Your personal cosmic universe is ready",
    completeLoading: "Activating your star map...",
    // Lagna Reveal
    revealLoading: "Decoding your celestial DNA...",
    revealLoadingSub: "Mapping 9 planets to your exact birth second",
    revealYourLagna: "Your Rising Sign",
    revealMoonSign: "Moon Sign",
    revealSunSign: "Sun Sign",
    revealNakshatra: "Birth Star",
    revealTraits: "Your Hidden Cosmic Superpowers",
    revealLagnaTraits: "Rising Sign Traits",
    revealMoonTraits: "Moon Traits",
    revealGem: "Your Power Stone",
    revealColor: "Your Power Color",
    revealDay: "Your Luckiest Day",
    revealCareer: "Your Destined Path",
    revealContinue: "Unlock My Complete Destiny 🔓",
    revealSkip: "Skip to Dashboard",
    months: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  },
  si: {
    welcomeSubtitle: "විශ්වය ඔබට පණිවිඩයක් එවා ඇත",
    welcomeDesc: "ඔබේ ලග්නයේ ඔබ කවදාවත් නොඇසූ රහස් තිබේ\nග්‍රහයන් ඔබ ගැන මොනවද කියන්නේ?\nඔබේ ඉරණම විකේතනය වීමට බලා සිටී",
    welcomeBtn: "මගේ ඉරණම දැන් හෙළි කරන්න",
    welcomeHint: "දහස් ගණනක් තම තරු රහස් සොයාගනිමින් සිටී",
    nasaBadge: "🛰️ NASA JPL ග්‍රහ දත්ත භාවිතයෙන් — සාම්ප්‍රදායික පංචාංගයට වඩා 100 ගුණයක් නිවැරදියි",
    googleTitle: "ග්‍රහචාර වෙත සාදරයෙන් පිළිගනිමු ✨",
    googleSubtitle: "ඔබේ ග්‍රහ සටහන සහ දිනපතා අකුරටම පලාපල දැනගන්න ගිණුමක් සාදන්න",
    googleBtn: "Google හරහා පිවිසෙන්න",
    googleFail: "\u0db4\u0dd2\u0dc0\u0dd2\u0dc3\u0dd3\u0db8 \u0d85\u0dc3\u0dcf\u0dbb\u0dca\u0dae\u0d9a\u0dba\u0dd2. \u0d9a\u0dbb\u0dd4\u0dab\u0dcf\u0d9a\u0dbb \u0db1\u0dd0\u0dc0\u0dad \u0d8b\u0dad\u0dca\u0dc3\u0dcf\u0dc4 \u0d9a\u0dbb\u0db1\u0dca\u0db1.",
    subTitle: "ඔබේ ඉරණමෙන් 90%ක්ම සැඟවිලා! 🌟",
    subSubtitle: "ඔබේ සැබෑ ධනය, දියුණුව සහ අනාගත රහස් අගුළු වැටී ඇත \u2014 දැන්ම අරින්න",
    subFeature1: "ඔබේ ලග්නයට පමණක් සතිපතා ඉරණම් අනාවැකි",
    subFeature2: "ඔබේ සම්පූර්ණ උපන් කේන්දරය — සියල්ල විකේතනය",
    subFeature3: "ඔබේ සැබෑ ආත්ම සහකරු ගැළපීම් ලකුණු",
    subFeature4: "AI ඔබේ අතීතය, වර්තමානය සහ අනාගතය කියවයි",
    subFeature5: "නරක ග්‍රහ කාල පැමිණෙන්නට පෙර අනතුරු ඇඟවීම්",
    subFeature6: "ඔබට පමණක් පෙනෙන රහස් අනාවැකි",
    subPerDay: "/\u0daf\u0dc0\u0dc3\u0da7",
    subNote: "Google Play / App Store \u0d94\u0dc3\u0dca\u0dc3\u0dda \u0d9c\u0dd9\u0dc0\u0db1\u0dca\u0db1 \u26A1",
    subNetworks: "Google Play \u2022 App Store \u2022 \u0dc3\u0dd2\u0dba\u0dbd\u0dd4\u0db8 \u0d9a\u0dcf\u0da9\u0dca\u0db4\u0dad\u0dca",
    subBtn: "සියල්ල මට පෙන්වන්න",
    subPayFail: "\u0d9c\u0dd9\u0dc0\u0dd3\u0db8 \u0d85\u0dc3\u0dcf\u0dbb\u0dca\u0dae\u0d9a\u0dba\u0dd2. \u0d86\u0dba\u0dd2 \u0db6\u0dbd\u0db1\u0dca\u0db1.",
    subFailed: "\u0d87\u0d9a\u0dca\u0da7\u0dd2\u0dc0\u0dca \u0dc0\u0dd4\u0db1\u0dda \u0db1\u0dd1",
    nameTitle: "තරු ඔබව කැඳවනවා",
    nameSubtitle: "ඔබේ නම ලියන්න — විශ්වය දැනටමත් එය කියවමින් සිටී",
    nameLabel: "නම",
    namePlaceholder: "ඔබේ නම ලියන්න",
    nameError: "නම දාලා ඉන්නකෝ",
    dateTitle: "මේ දිනය සියල්ල වෙනස් කළා",
    dateSubtitle: "විශ්වය ඔබේ ඉරණම ලියූ නිශ්චිත දිනය",
    yearLabel: "\u0d85\u0dc0\u0dd4\u0dbb\u0dd4\u0daf\u0dca\u0daf",
    yearPlaceholder: "1995",
    monthLabel: "\u0db8\u0dcf\u0dc3\u0dba",
    dayLabel: "\u0daf\u0dd2\u0db1\u0dba",
    dayPlaceholder: "15",
    dateError: "උපදින දිනය හරියට දාන්න",
    yearError: "වලංගු අවුරුද්දක් ඇතුළත් කරන්න (1900\u20132026)",
    monthError: "කරුණාකර මාසයක් තෝරන්න",
    dayError: "මේ මාසයට වලංගු දිනයක් ඇතුළත් කරන්න",
    dateHint: "මෙය ඔබේ ලග්නාධිපති ග්‍රහයා සහ රාශි පාලකයා හෙළි කරයි",
    timeTitle: "ඔබව නිර්වචනය කරන නිශ්චිත මොහොත",
    timeSubtitle: "එක මිනිත්තුවක වෙනසක් = සම්පූර්ණයෙන්ම වෙනස් ඉරණමක්",
    hourLabel: "\u0db4\u0dd0\u0dba",
    minuteLabel: "\u0db8\u0dd2\u0db1\u0dd2\u0dad\u0dca\u0dad\u0dd4",
    timeError: "වලංගු වේලාවක් ඇතුළත් කරන්න (පැය 1\u201312, මිනි. 0\u201359)",
    timeHint: "හරියටම වේලාව = නිරවද්‍ය කේන්දරය.\nදන්නේ නැත්නම් මඟ හරින්න.",
    placeTitle: "ඔබේ ඉරණම ලියැවුණු ස්ථානය",
    placeSubtitle: "ඔබ උපන් ස්ථානයේ අහස පිළිතුර රඳවා ඇත",
    placeSearch: "නගරය සොයන්න...",
    placeHint: "වෙනස් ස්ථානයක් = වෙනස් ග්‍රහ කෝණ.\nමෙය ඔබේ කේන්දරය අද්විතීය කරයි.",
    cityError: "කරුණාකර ඔබේ උපන් නගරය තෝරන්න",
    subProgressName: "නම",
    subProgressDate: "දිනය",
    subProgressTime: "වේලාව",
    subProgressPlace: "ස්ථානය",
    back: "පසුපසට",
    continueBtn: "ඊළඟ රහස",
    completeSetup: "මගේ තරු විකේතනය කරන්න",
    skipBirth: "පසුව Profile එකෙන් දාන්නම්",
    saveFailed: "සේව් වුනේ නැත. ආයි බලන්න.",
    completeTitle: "තරු කතා කළා!",
    completeSubtitle: "ඔබේම පෞද්ගලික තාරකා විශ්වය සූදානම්",
    completeLoading: "ඔබේ තරු සිතියම සක්‍රීය කරමින්...",
    // Lagna Reveal
    revealLoading: "ඔබේ තාරකා DNA විකේතනය කරමින්...",
    revealLoadingSub: "ඔබ උපන් නිශ්චිත තත්පරයට ග්‍රහ 9 සිතියම්ගත කරමින්",
    revealYourLagna: "ඔබේ ලග්නය",
    revealMoonSign: "චන්ද්‍ර රාශිය",
    revealSunSign: "සූර්ය රාශිය",
    revealNakshatra: "උපන් නැකත",
    revealTraits: "ඔබේ සැඟවුණු විශ්ව ශක්තීන්",
    revealLagnaTraits: "ලග්න ලක්ෂණ",
    revealMoonTraits: "චන්ද්‍ර ලක්ෂණ",
    revealGem: "ඔබේ ශක්ති මැණික",
    revealColor: "ඔබේ ශක්ති වර්ණය",
    revealDay: "ඔබේ වාසනාවන්තම දිනය",
    revealCareer: "ඔබේ නියමිත මාවත",
    revealContinue: "මගේ සම්පූර්ණ අනාගත රහස් අගුළු අරින්න 🔓",
    revealSkip: "මගහැර ඉදිරියට යන්න",
    months: ["\u0da2\u0db1","\u0db4\u0dd9\u0db6","\u0db8\u0dcf\u0dbb\u0dca","\u0d85\u0db4\u0dca\u200d","\u0db8\u0dd0","\u0da2\u0dd6","\u0da2\u0dd6\u0dbd\u0dd2","\u0d85\u0d9c\u0ddd","\u0dc3\u0dd0\u0db4\u0dca","\u0d94\u0d9a\u0dca","\u0db1\u0ddc","\u0daf\u0dd9"],
  },
};


// ═══════════════════════════════════════════════════════════════════════
//  SHARED UI ATOMS — with micro-animations + vibrant gradients
// ═══════════════════════════════════════════════════════════════════════


/* Primary action button — hot gradient with bounce */
function PrimaryButton({ label, onPress, loading, disabled, icon }) {
  var isOff = disabled || loading;

  return (
    <Animated.View style={g.primaryBtn}>
      <SpringPressable
        onPress={onPress} disabled={isOff} haptic="heavy" scalePressed={0.96}
        style={{ borderRadius: 16, overflow: 'hidden', opacity: isOff ? 0.4 : 1 }}
      >
        <LinearGradient
          colors={isOff ? ['#333', '#444'] : ['#FF8C00', '#FF6D00', '#E65100']}
          style={g.primaryGrad}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          {/* Top shine overlay for premium glass effect */}
          <LinearGradient
            colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.05)', 'transparent']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
          />
          {loading ? (
            <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} key="loader">
              <CosmicLoader size={26} color="#FFF" />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} key="content" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {icon ? <Ionicons name={icon} size={18} color="#FFF" /> : null}
              <Text style={g.primaryText}>{label}</Text>
            </Animated.View>
          )}
        </LinearGradient>
      </SpringPressable>
    </Animated.View>
  );
}

function GhostButton({ label, onPress, icon }) {
  return (
    <SpringPressable onPress={onPress} style={g.ghostBtn} haptic="light" scalePressed={0.96}>
      {icon ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {icon}
          <Text style={g.ghostText}>{label}</Text>
        </View>
      ) : (
        <Text style={g.ghostText}>{label}</Text>
      )}
    </SpringPressable>
  );
}

function StepHeader({ icon, iconColor, title, subtitle }) {
  var reduced = useReducedMotion();
  var iconBounce = useSharedValue(0);
  var iconGlow = useSharedValue(0);
  useEffect(function () {
    iconBounce.value = withSequence(
      withDelay(300, withSpring(1, { damping: 8, stiffness: 200 }))
    );
    if (!reduced) {
      iconGlow.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
    }
  }, [reduced]);
  var iconAnim = useAnimatedStyle(function () {
    return {
      transform: [{ scale: interpolate(iconBounce.value, [0, 1], [0.85, 1]) }],
      opacity: iconBounce.value,
    };
  });
  var glowAnim = useAnimatedStyle(function () {
    if (Platform.OS === 'web') return {};
    return {
      shadowOpacity: interpolate(iconGlow.value, [0, 1], [0.2, 0.6]),
      shadowRadius: interpolate(iconGlow.value, [0, 1], [8, 20]),
    };
  });

  return (
    <Animated.View entering={FadeInDown.duration(500)} style={g.headerWrap}>
      {icon ? (
        <Animated.View style={[g.headerIconBg, { borderColor: (iconColor || '#FFB800') + '50', ...(Platform.OS !== 'web' ? { shadowColor: iconColor || '#FFB800' } : {}) }, iconAnim, glowAnim]}>
          <Ionicons name={icon} size={24} color={iconColor || '#FFB800'} />
        </Animated.View>
      ) : null}
      <Text style={g.headerTitle}>{title}</Text>
      {subtitle ? <Text style={g.headerSub}>{subtitle}</Text> : null}
    </Animated.View>
  );
}

function GlowCard({ children, style }) {
  return <View style={[g.card, style]}>{children}</View>;
}

var STEP_LABELS_EN = ['Welcome', 'Birth Info', 'Your Stars', 'Save', 'Premium', 'Done'];
var STEP_LABELS_SI = ['සාදරයෙන්', 'උපන් දත්ත', 'ඔබේ තරු', 'සුරකින්න', 'ප්‍රිමියම්', 'සම්පූර්ණ'];

function StepProgressBar({ current, total, lang }) {
  var labels = lang === 'si' ? STEP_LABELS_SI : STEP_LABELS_EN;
  return (
    <View style={{ height: 36, marginBottom: 4, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {Array.from({ length: total }).map(function (_, i) {
          var isActive = i === current;
          var isComplete = i < current;
          var dotSize = isActive ? 10 : 6;
          return (
            <View key={i} style={{
              width: dotSize, height: dotSize, borderRadius: dotSize / 2,
              backgroundColor: isComplete ? '#FFB800' : isActive ? '#FFB800' : 'rgba(255,255,255,0.15)',
              ...(isActive ? { ...boxShadow('#FFB800', { width: 0, height: 0 }, 0.8, 8) } : {}),
            }} />
          );
        })}
      </View>
      <Text style={{ fontSize: 10, color: 'rgba(255,214,102,0.4)', fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>
        {lang === 'si' ? ('පියවර ' + (current + 1) + ' / ' + total) : ('Chapter ' + (current + 1) + ' of ' + total)}
        {labels[current] ? '  ·  ' + labels[current] : ''}
      </Text>
    </View>
  );
}


// ═══════════════════════════════════════════════════════════════════════
//  STEP -1: LANGUAGE SELECTION — Global-First, Button-Focused Layout
//  Compact hero → big prominent language buttons → users tap within 2s
//  Content is universal/global — no country-specific branding
// ═══════════════════════════════════════════════════════════════════════

function LanguageStep({ onSelect }) {
  var reduced = useReducedMotion();
  var titleScale = useSharedValue(0);
  var ringRotate = useSharedValue(0);
  var orbPulse = useSharedValue(0);
  var logoGlow = useSharedValue(0);
  var btnShimmer = useSharedValue(0);
  var [selectedLang, setSelectedLang] = useState(null);

  useEffect(function () {
    titleScale.value = withDelay(300, withSpring(1, { damping: 14, stiffness: 100 }));
    if (reduced) return;
    ringRotate.value = withRepeat(withTiming(360, { duration: 25000, easing: Easing.linear }), -1, false);
    orbPulse.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, true);
    logoGlow.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true);
    btnShimmer.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduced]);

  var titleAnim = useAnimatedStyle(function () {
    return { transform: [{ scale: titleScale.value }], opacity: titleScale.value };
  });
  var ringStyle = useAnimatedStyle(function () {
    return { transform: [{ rotate: ringRotate.value + 'deg' }] };
  });
  var orbGlowStyle = useAnimatedStyle(function () {
    return {
      opacity: interpolate(orbPulse.value, [0, 1], [0.12, 0.3]),
      transform: [{ scale: interpolate(orbPulse.value, [0, 1], [0.9, 1.1]) }],
    };
  });
  var logoStyle = useAnimatedStyle(function () {
    return {
      opacity: interpolate(logoGlow.value, [0, 1], [0.88, 1]),
      transform: [{ scale: interpolate(logoGlow.value, [0, 1], [1, 1.06]) }],
    };
  });
  var shimmerStyle = useAnimatedStyle(function () {
    return {
      opacity: interpolate(btnShimmer.value, [0, 0.5, 1], [0.6, 1, 0.6]),
    };
  });

  var handleSelect = function (lang) {
    setSelectedLang(lang);
    // Brief delay lets the selected-state style render before transition
    setTimeout(function () { onSelect(lang); }, 200);
  };

  // Hero — big chakra with prominent logo
  var chakraSize = Math.min(SH * 0.34, 300);
  var logoSize = Math.min(chakraSize * 0.3, 80);

  return (
    <View style={{ flex: 1 }}>
      {/* Ambient background glow orbs */}
      <Animated.View style={[ls.ambientOrb, ls.ambientOrb1, orbGlowStyle]} />
      <Animated.View style={[ls.ambientOrb, ls.ambientOrb2, orbGlowStyle]} />
      <Animated.View style={[ls.ambientOrb, ls.ambientOrb3, orbGlowStyle]} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 }} showsVerticalScrollIndicator={false} bounces={false}>

        {/* ═══ COMPACT HERO: Chakra + Logo + Title ═══ */}
        <Animated.View entering={FadeInDown.duration(800)} style={{ alignItems: 'center', marginBottom: 20 }}>

          {/* Rotating cosmic ring */}
          <Animated.View style={[ls.cosmicRing, { width: chakraSize + 32, height: chakraSize + 32, borderRadius: (chakraSize + 32) / 2 }, ringStyle]}>
            <View style={[ls.cosmicRingInner, { width: chakraSize + 28, height: chakraSize + 28, borderRadius: (chakraSize + 28) / 2 }]} />
          </Animated.View>

          {/* Chakra + Logo centered inside */}
          <View style={{ alignItems: 'center', justifyContent: 'center', width: chakraSize, height: chakraSize }}>
            <AwesomeRashiChakra size={chakraSize} />
            <Animated.View style={[ls.logoOrb, { width: logoSize + 24, height: logoSize + 24, borderRadius: (logoSize + 24) / 2 }, logoStyle]}>
              <LinearGradient
                colors={['rgba(255,184,0,0.25)', 'rgba(255,140,0,0.15)', 'rgba(255,184,0,0.08)']}
                style={[ls.logoOrbInner, { width: logoSize + 12, height: logoSize + 12, borderRadius: (logoSize + 12) / 2 }]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Image source={LOGO} style={{ width: logoSize, height: logoSize, borderRadius: logoSize / 2 }} resizeMode="contain" />
              </LinearGradient>
            </Animated.View>
          </View>

          {/* App name — English-first for global appeal */}
          <Animated.View style={[titleAnim, { alignItems: 'center', marginTop: 6 }]}>
            <Text style={ls.mainTitleEn}>Grahachara</Text>
            <Text style={ls.mainTitleSi}>{'\u0D9C\u0DCA\u200D\u0DBB\u0DC4\u0DA0\u0DCF\u0DBB'}</Text>
            <Text style={ls.tagline}>Vedic Astrology & Horoscope</Text>
          </Animated.View>
        </Animated.View>

        {/* ═══ LANGUAGE PROMPT — bilingual, globally neutral ═══ */}
        <Animated.View entering={FadeIn.delay(400).duration(500)} style={ls.promptWrap}>
          <View style={ls.promptDividerLeft}>
            <LinearGradient colors={['transparent', 'rgba(255,184,0,0.3)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
          </View>
          <Text style={ls.promptText}>Select Language  {'\u2022'}  {'\u0DB7\u0DCF\u0DC2\u0DCF\u0DC0 \u0DAD\u0DDD\u0DBB\u0DB1\u0DCA\u0DB1'}</Text>
          <View style={ls.promptDividerRight}>
            <LinearGradient colors={['rgba(255,184,0,0.3)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
          </View>
        </Animated.View>

        {/* ═══ LANGUAGE BUTTONS — Big, bold, impossible to miss ═══ */}
        <Animated.View entering={FadeInUp.delay(300).duration(700)} style={{ width: '100%', gap: 14, marginTop: 20 }}>

          {/* ── ENGLISH BUTTON (global-first — top position) ── */}
          <SpringPressable
            style={[ls.langCard, selectedLang === 'en' && ls.langCardSelectedEn]}
            onPress={function () { handleSelect('en'); }}
            haptic="medium"
            scalePressed={0.96}
          >
            <LinearGradient
              colors={selectedLang === 'en' ? ['#6366F1', '#4338CA'] : ['rgba(99,102,241,0.12)', 'rgba(99,102,241,0.04)']}
              style={ls.langCardGrad}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <View style={ls.langCardRow}>
                <View style={[ls.langIconCircle, selectedLang === 'en' && ls.langIconCircleActiveEn]}>
                  <Ionicons name="globe-outline" size={26} color={selectedLang === 'en' ? '#E0E7FF' : '#A5B4FC'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[ls.langPrimary, selectedLang === 'en' && ls.langPrimaryActive]}>English</Text>
                  <Text style={[ls.langSecondary, selectedLang === 'en' && ls.langSecondaryActive]}>International</Text>
                </View>
                <Animated.View style={selectedLang !== 'en' ? shimmerStyle : undefined}>
                  <View style={[ls.arrowCircle, selectedLang === 'en' && ls.arrowCircleActiveEn]}>
                    <Ionicons name="chevron-forward" size={18} color={selectedLang === 'en' ? '#FFFFFF' : 'rgba(255,255,255,0.4)'} />
                  </View>
                </Animated.View>
              </View>
            </LinearGradient>
          </SpringPressable>

          {/* ── SINHALA BUTTON ── */}
          <SpringPressable
            style={[ls.langCard, selectedLang === 'si' && ls.langCardSelectedSi]}
            onPress={function () { handleSelect('si'); }}
            haptic="medium"
            scalePressed={0.96}
          >
            <LinearGradient
              colors={selectedLang === 'si' ? ['#FF8C00', '#E65100'] : ['rgba(255,140,0,0.12)', 'rgba(255,140,0,0.04)']}
              style={ls.langCardGrad}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <View style={ls.langCardRow}>
                <View style={[ls.langIconCircle, selectedLang === 'si' && ls.langIconCircleActiveSi]}>
                  <Text style={{ fontSize: 24 }}>{'\u0DC3\u0DD2'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[ls.langPrimary, selectedLang === 'si' && ls.langPrimaryActive]}>{'\u0DC3\u0DD2\u0D82\u0DC4\u0DBD'}</Text>
                  <Text style={[ls.langSecondary, selectedLang === 'si' && ls.langSecondaryActive]}>Sinhala</Text>
                </View>
                <Animated.View style={selectedLang !== 'si' ? shimmerStyle : undefined}>
                  <View style={[ls.arrowCircle, selectedLang === 'si' && ls.arrowCircleActiveSi]}>
                    <Ionicons name="chevron-forward" size={18} color={selectedLang === 'si' ? '#FFFFFF' : 'rgba(255,255,255,0.4)'} />
                  </View>
                </Animated.View>
              </View>
            </LinearGradient>
          </SpringPressable>
        </Animated.View>

        {/* ═══ FOOTER — global-first trust signals ═══ */}
        <Animated.View entering={FadeIn.delay(700).duration(500)} style={ls.footer}>
          <View style={ls.footerDivider}>
            <LinearGradient colors={['transparent', 'rgba(255,184,0,0.15)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
          </View>
          <View style={ls.trustRow}>
            <View style={ls.trustItem}>
              <Ionicons name="star" size={12} color="rgba(255,184,0,0.7)" />
              <Text style={ls.trustText}>50K+ Users</Text>
            </View>
            <Text style={ls.trustDot}>{'\u2022'}</Text>
            <View style={ls.trustItem}>
              <Ionicons name="shield-checkmark" size={12} color="rgba(16,185,129,0.7)" />
              <Text style={ls.trustText}>Vedic Accuracy</Text>
            </View>
            <Text style={ls.trustDot}>{'\u2022'}</Text>
            <View style={ls.trustItem}>
              <Ionicons name="earth" size={12} color="rgba(99,102,241,0.7)" />
              <Text style={ls.trustText}>Worldwide</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

var ls = StyleSheet.create({
  // Ambient background orbs
  ambientOrb:  { position: 'absolute', borderRadius: 999 },
  ambientOrb1: { width: 280, height: 280, backgroundColor: 'rgba(147,51,234,0.07)', top: -60, right: -80 },
  ambientOrb2: { width: 220, height: 220, backgroundColor: 'rgba(255,140,0,0.05)', bottom: -30, left: -50 },
  ambientOrb3: { width: 180, height: 180, backgroundColor: 'rgba(99,102,241,0.05)', top: '40%', left: -40 },

  // Rotating cosmic ring
  cosmicRing:      { position: 'absolute', borderWidth: 1, borderColor: 'rgba(255,184,0,0.1)', alignItems: 'center', justifyContent: 'center' },
  cosmicRingInner: { borderWidth: 1, borderColor: 'rgba(147,51,234,0.08)', borderStyle: 'dashed' },

  // Logo orb
  logoOrb:      { borderWidth: 2, borderColor: 'rgba(255,184,0,0.4)', alignItems: 'center', justifyContent: 'center', ...boxShadow('rgba(255,184,0,0.4)', { width: 0, height: 0 }, 0.6, 24) },
  logoOrbInner: { alignItems: 'center', justifyContent: 'center' },

  // Titles — English-first, Sinhala subtle
  mainTitleEn: { fontSize: 30, fontWeight: '900', color: '#FFB800', letterSpacing: 1, ...textShadow('rgba(255,184,0,0.5)', { width: 0, height: 0 }, 16), textAlign: 'center' },
  mainTitleSi: { fontSize: 14, fontWeight: '600', color: 'rgba(255,220,140,0.4)', letterSpacing: 2, marginTop: 2, textAlign: 'center' },
  tagline:     { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.35)', marginTop: 6, textAlign: 'center', letterSpacing: 0.5 },

  // Bilingual prompt — centered divider style
  promptWrap:         { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 4 },
  promptDividerLeft:  { flex: 1, height: 1, overflow: 'hidden' },
  promptDividerRight: { flex: 1, height: 1, overflow: 'hidden' },
  promptText:         { fontSize: 13, fontWeight: '600', color: 'rgba(255,220,140,0.6)', paddingHorizontal: 12 },

  // Language cards — big and prominent
  langCard:           { borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)' },
  langCardSelectedEn: { borderColor: 'rgba(99,102,241,0.5)', ...boxShadow('rgba(99,102,241,0.35)', { width: 0, height: 4 }, 0.8, 20) },
  langCardSelectedSi: { borderColor: 'rgba(255,140,0,0.5)', ...boxShadow('rgba(255,140,0,0.3)', { width: 0, height: 4 }, 0.8, 20) },
  langCardGrad:       { paddingVertical: 22, paddingHorizontal: 20, borderRadius: 20 },
  langCardRow:        { flexDirection: 'row', alignItems: 'center', gap: 14 },

  // Icon circle (replaces flag)
  langIconCircle:         { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  langIconCircleActiveEn: { backgroundColor: 'rgba(99,102,241,0.25)', borderColor: 'rgba(165,180,252,0.4)' },
  langIconCircleActiveSi: { backgroundColor: 'rgba(255,140,0,0.2)', borderColor: 'rgba(255,184,0,0.4)' },

  // Text
  langPrimary:       { fontSize: 22, fontWeight: '800', color: '#FFF1D0' },
  langPrimaryActive: { color: '#FFFFFF' },
  langSecondary:       { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  langSecondaryActive: { color: 'rgba(255,255,255,0.7)' },

  // Arrow circle (CTA indicator — replaces radio)
  arrowCircle:         { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  arrowCircleActiveEn: { backgroundColor: 'rgba(99,102,241,0.4)', borderColor: 'rgba(165,180,252,0.5)' },
  arrowCircleActiveSi: { backgroundColor: 'rgba(255,140,0,0.4)', borderColor: 'rgba(255,184,0,0.5)' },

  // Footer — trust signals
  footer:        { marginTop: 24, alignItems: 'center' },
  footerDivider: { width: 140, height: 1, borderRadius: 1, overflow: 'hidden', marginBottom: 12 },
  trustRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustItem:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trustText:     { fontSize: 11, color: 'rgba(255,255,255,0.40)', fontWeight: '500' },
  trustDot:      { fontSize: 8, color: 'rgba(255,255,255,0.25)' },
});


// ═══════════════════════════════════════════════════════════════════════
//  STEP 0: WELCOME — Single-screen, no-scroll, no fake numbers
//  Everything fits in one viewport: hero + features + CTA
// ═══════════════════════════════════════════════════════════════════════

function WelcomeStep({ onContinue, onBack, lang }) {
  var T = OB[lang] || OB.en;
  var reduced = useReducedMotion();
  var pulse = useSharedValue(0);
  var haloRotate = useSharedValue(0);
  var ctaGlow = useSharedValue(0);

  // Hero — big chakra with prominent logo
  var chakraSize = Math.min(SH * 0.3, 260);
  var logoSize = Math.min(chakraSize * 0.3, 72);

  useEffect(function () {
    if (reduced) return;
    pulse.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, true);
    haloRotate.value = withRepeat(withTiming(360, { duration: 15000, easing: Easing.linear }), -1, false);
    ctaGlow.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduced]);

  var pulseStyle = useAnimatedStyle(function () {
    return {
      transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.06]) }],
      opacity: interpolate(pulse.value, [0, 1], [0.9, 1]),
    };
  });
  var haloStyle = useAnimatedStyle(function () {
    return { transform: [{ rotate: haloRotate.value + 'deg' }] };
  });
  var ctaGlowStyle = useAnimatedStyle(function () {
    if (Platform.OS === 'web') return {};
    return {
      shadowColor: '#FF8C00',
      shadowOpacity: interpolate(ctaGlow.value, [0, 1], [0.4, 0.9]),
      shadowRadius: interpolate(ctaGlow.value, [0, 1], [10, 26]),
      shadowOffset: { width: 0, height: 4 },
    };
  });

  // Feature items — compact horizontal rows
  var FEATURES = lang === 'si' ? [
    { icon: 'compass-outline', color: '#A78BFA', text: 'ඔබ ගැන ඔබම නොදන්නා ලග්න රහස්' },
    { icon: 'planet-outline', color: '#FFB800', text: 'ග්‍රහයන් ඔබේ ජීවිතය පාලනය කරන හැටි' },
    { icon: 'heart-outline', color: '#FF6B9D', text: 'ඔබේ ආත්ම සහකරු කවුද? පොරොන්දම බලන්න' },
    { icon: 'sparkles-outline', color: '#4CC9F0', text: 'AI ඔබේ අනාගතය කියවයි — ඔබට පමණයි' },
  ] : [
    { icon: 'compass-outline', color: '#A78BFA', text: 'Rising sign secrets you don\'t know about yourself' },
    { icon: 'planet-outline', color: '#FFB800', text: 'See how planets are shaping your life' },
    { icon: 'heart-outline', color: '#FF6B9D', text: 'Who is your soulmate? Check compatibility' },
    { icon: 'sparkles-outline', color: '#4CC9F0', text: 'AI reads your future — for your eyes only' },
  ];

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 0, paddingBottom: 16 }}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >

      {/* ═══ HERO — Compact chakra + title ═══ */}
      <Animated.View entering={FadeInDown.duration(700)} style={{ alignItems: 'center' }}>
        {/* Rotating halo */}
        <Animated.View style={[ws.haloRing, { width: chakraSize + 20, height: chakraSize + 20, borderRadius: (chakraSize + 20) / 2 }, haloStyle]}>
          <LinearGradient colors={['#FF8C00', '#FFB800', '#FF6D00', '#FF8C00']} style={[ws.haloGrad, { borderRadius: (chakraSize + 20) / 2 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        </Animated.View>

        {/* Chakra + Logo */}
        <View style={{ alignItems: 'center', justifyContent: 'center', width: chakraSize, height: chakraSize }}>
          <AwesomeRashiChakra size={chakraSize} />
          <Animated.View style={[ws.logoRing, { width: logoSize + 20, height: logoSize + 20, borderRadius: (logoSize + 20) / 2 }, pulseStyle]}>
            <LinearGradient
              colors={['rgba(255,184,0,0.25)', 'rgba(255,140,0,0.15)', 'rgba(255,184,0,0.1)']}
              style={[ws.logoInner, { width: logoSize + 10, height: logoSize + 10, borderRadius: (logoSize + 10) / 2 }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Image source={LOGO} style={{ width: logoSize, height: logoSize, borderRadius: logoSize / 2 }} resizeMode="contain" />
            </LinearGradient>
          </Animated.View>
        </View>

        <Text style={ws.titleEn}>Grahachara</Text>
        <Text style={ws.titleSi}>{'\u0D9C\u0DCA\u200D\u0DBB\u0DC4\u0DA0\u0DCF\u0DBB'}</Text>
        <Text style={ws.subtitle}>{T.welcomeSubtitle}</Text>
      </Animated.View>

      {/* ═══ FEATURE LIST — compact icon rows ═══ */}
      <View style={ws.featureList}>
        {FEATURES.map(function (f, i) {
          return (
            <Animated.View key={i} entering={FadeInUp.delay(250 + i * 80).duration(400)} style={ws.featureRow}>
              <View style={[ws.featureIcon, { backgroundColor: f.color + '1A', borderColor: f.color + '40' }]}>
                <Ionicons name={f.icon} size={18} color={f.color} />
              </View>
              <Text style={ws.featureText}>{f.text}</Text>
            </Animated.View>
          );
        })}
      </View>

      {/* ═══ CTA — teaser + button + change language ═══ */}
      <Animated.View entering={FadeInUp.delay(600).duration(500)} style={{ width: '100%' }}>
        {/* NASA accuracy badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(167,139,250,0.08)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(167,139,250,0.15)' }}>
          <Text style={{ color: 'rgba(255,220,180,0.7)', fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 17 }}>
            {T.nasaBadge}
          </Text>
        </View>

        {/* Curiosity hook */}
        <View style={ws.teaserRow}>
          <Ionicons name="time-outline" size={15} color="#FFB800" />
          <Text style={ws.teaserText}>
            {lang === 'si' ? 'ඔබේ ඉරණම තීරණය කරන ග්‍රහ රහස දැන්ම සොයාගන්න' : 'The planets already know your future — do you?'}
          </Text>
        </View>

        <Animated.View style={ctaGlowStyle}>
          <PrimaryButton label={T.welcomeBtn} onPress={onContinue} icon="sparkles" />
        </Animated.View>

        <GhostButton label={lang === 'si' ? '\u0DB7\u0DCF\u0DC2\u0DCF\u0DC0 \u0DC0\u0DD9\u0DB1\u0DC3\u0DCA \u0D9A\u0DBB\u0DB1\u0DCA\u0DB1' : 'Change Language'} onPress={onBack} icon={<Ionicons name="globe-outline" size={14} color="rgba(255,255,255,0.4)" />} />
      </Animated.View>
    </ScrollView>
  );
}

var ws = StyleSheet.create({
  haloRing: { position: 'absolute', top: -6, overflow: 'hidden' },
  haloGrad: { width: '100%', height: '100%', opacity: 0.18 },
  logoRing: { borderWidth: 2, borderColor: 'rgba(255,184,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  logoInner: { alignItems: 'center', justifyContent: 'center' },
  titleEn: { fontSize: 26, fontWeight: '900', color: '#FFB800', letterSpacing: 1, ...textShadow('rgba(255,184,0,0.5)', { width: 0, height: 0 }, 12), marginTop: 4, textAlign: 'center' },
  titleSi: { fontSize: 13, fontWeight: '600', color: 'rgba(255,220,140,0.35)', letterSpacing: 2, marginBottom: 1, textAlign: 'center' },
  subtitle: { fontSize: 13, fontWeight: '600', color: 'rgba(255,220,140,0.65)', textAlign: 'center' },

  // Feature list — horizontal icon + text rows
  featureList: { gap: 10, marginTop: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  featureText: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.7)', flex: 1, lineHeight: 19 },

  // Teaser row
  teaserRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 12, backgroundColor: 'rgba(255,184,0,0.05)', paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,184,0,0.08)' },
  teaserText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,220,140,0.75)' },
});


// ═══════════════════════════════════════════════════════════════════════
//  STEP 1: GOOGLE SIGN-IN
// ═══════════════════════════════════════════════════════════════════════

function GoogleSignInStep({ onContinue, onBack, lang, isReturningUser }) {
  var T = OB[lang] || OB.en;
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState('');
  var { signInWithGoogle } = useAuth();
  var googlePulse = useSharedValue(0);
  var logoFloat = useSharedValue(0);
  var iconBounce = useSharedValue(0);
  var iconGlow = useSharedValue(0);
  // Responsive sizing
  var chakraSize = Math.min(SH * 0.32, 280);
  var logoImgSize = Math.min(chakraSize * 0.18, 48);

  // Override title/subtitle for returning users
  var title = isReturningUser 
    ? (lang === 'si' ? 'නැවත සාදරයෙන් 🙏' : 'Welcome Back 🙏')
    : T.googleTitle;
  var subtitle = isReturningUser
    ? (lang === 'si' ? 'ඔයාගේ ග්‍රහ සටහන සහ පලාපල බලන්න පිවිසෙන්න' : 'Sign in to access your birth chart & daily predictions')
    : T.googleSubtitle;

  useEffect(function () {
    googlePulse.value = withRepeat(withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }), -1, true);
    logoFloat.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, true);
    iconBounce.value = withSequence(withDelay(300, withSpring(1, { damping: 8, stiffness: 200 })));
    iconGlow.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  var pulseStyle = useAnimatedStyle(function () {
    return {
      transform: [{ scale: interpolate(googlePulse.value, [0, 1], [1, 1.05]) }],
      opacity: interpolate(googlePulse.value, [0, 1], [0.7, 1]),
    };
  });

  var floatStyle = useAnimatedStyle(function () {
    return { transform: [{ translateY: interpolate(logoFloat.value, [0, 1], [-4, 4]) }] };
  });

  var iconAnim = useAnimatedStyle(function () {
    return {
      transform: [{ scale: interpolate(iconBounce.value, [0, 1], [0.85, 1]) }],
      opacity: iconBounce.value,
    };
  });

  var glowAnim = useAnimatedStyle(function () {
    if (Platform.OS === 'web') return {};
    return {
      shadowOpacity: interpolate(iconGlow.value, [0, 1], [0.3, 0.8]),
      shadowRadius: interpolate(iconGlow.value, [0, 1], [10, 22]),
    };
  });

  var handleSignIn = async function () {
    setLoading(true); setError('');
    try {
      var result = await signInWithGoogle();
      if (result && result.cancelled) {
        // User cancelled — no error
        setLoading(false);
        return;
      }
      onContinue();
    } catch (e) {
      if (__DEV__) console.error('Google sign-in error:', e);
      var errorDetail = (e?.message || 'Sign-in failed. Please try again.');
      setError(errorDetail);
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 }} showsVerticalScrollIndicator={false} bounces={false}>

      {/* ── Top Section ── */}
      <View style={{ alignItems: 'center' }}>

        {/* ── Premium Header ── */}
        <Animated.View entering={FadeInDown.duration(600)} style={{ alignItems: 'center', marginBottom: 6, zIndex: 10 }}>
          <Animated.View style={[gs.headerIconBg, Platform.OS !== 'web' ? { shadowColor: '#FFB800' } : {}, iconAnim, glowAnim]}>
            <Ionicons name="lock-closed" size={20} color="#FFB800" />
          </Animated.View>
          <Text style={gs.headerTitle}>{title}</Text>
          <Text style={gs.headerSub}>{subtitle}</Text>
        </Animated.View>

        {/* ── Platform Logo ── */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={[{ marginBottom: 10, alignItems: 'center' }, floatStyle]}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <AwesomeRashiChakra size={chakraSize} />
            <Animated.View style={[gs.platformLogoOuter, { width: logoImgSize + 28, height: logoImgSize + 28, borderRadius: (logoImgSize + 28) / 2 }, pulseStyle]}>
              <View style={[gs.platformLogoInner, { width: logoImgSize + 18, height: logoImgSize + 18, borderRadius: (logoImgSize + 18) / 2 }]}>
                <LinearGradient
                  colors={['rgba(255,140,0,0.06)', 'rgba(255,255,255,0.02)']}
                  style={StyleSheet.absoluteFill}
                />
                <Image source={LOGO} style={{ width: logoImgSize, height: logoImgSize }} resizeMode="contain" />
              </View>
            </Animated.View>
          </View>
          <View style={gs.secureRow}>
            <Ionicons name="shield-checkmark" size={12} color="#34D399" />
            <Text style={gs.secureText}>
              {lang === 'si' ? '100% ආරක්ෂිත Google පිවිසුම' : 'Secure Google Authentication'}
            </Text>
          </View>
        </Animated.View>

      </View>

      {/* ── Middle Section ── */}
      <View style={{ alignItems: 'center' }}>

        {/* ── Benefits Card — Glass Effect ── */}
        <View style={gs.benefitsCard}>
          <LinearGradient
            colors={['rgba(15,12,35,0.85)', 'rgba(8,6,22,0.95)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
          <LinearGradient
            colors={['rgba(255,140,0,0.08)', 'transparent']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
          />
          <View style={gs.benefitList}>
            {(isReturningUser ? [
              { icon: 'reload-outline', color: '#4CC9F0', text: lang === 'si' ? 'ඔබගේ කේන්දරය යළි ලබාගන්න' : 'Restore your saved Birth Chart' },
              { icon: 'calendar-outline', color: '#FFB800', text: lang === 'si' ? 'ඔබගේ දිනපතා ග්‍රහ පලාපල' : 'Continue your daily predictions' },
              { icon: 'people-outline', color: '#FF8C00', text: lang === 'si' ? 'ඔබේ පවුලේ අයගේ කේන්දර' : 'Access your saved profiles' },
              { icon: 'sync-outline', color: '#34D399', text: lang === 'si' ? 'ඕනෑම උපාංගයකින් පිවිසෙන්න' : 'Securely sync your data' },
            ] : [
              { icon: 'star-outline', color: '#FFB800', text: lang === 'si' ? 'ඔබේ උපන් ග්‍රහ සටහන සුරකින්න' : 'Save your unique Birth Chart' },
              { icon: 'calendar-outline', color: '#4CC9F0', text: lang === 'si' ? 'දිනපතා පෞද්ගලික පලාපල' : 'Get daily personalized predictions' },
              { icon: 'heart-outline', color: '#FF8C00', text: lang === 'si' ? 'පොරොන්දම් ගැලපීම පරීක්ෂා කරන්න' : 'Check compatibility with anyone' },
              { icon: 'cloud-done-outline', color: '#34D399', text: lang === 'si' ? 'ඔබේ දත්ත 100% සුරක්ෂිතයි' : 'Secure backup in the cloud' },
            ]).map(function (b, i) {
              return (
                <Animated.View key={i} entering={FadeInDown.delay(400 + i * 100).duration(250)} style={gs.benefitRow}>
                  <View style={[gs.benefitIconWrap, { backgroundColor: b.color + '1A', borderColor: b.color + '40' }]}>
                    <Ionicons name={b.icon} size={14} color={b.color} />
                  </View>
                  <Text style={gs.benefitText}>{b.text}</Text>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* ── Platform Badges ── */}
        <Animated.View entering={FadeInUp.delay(700).duration(400)} style={gs.platformRow}>
          {[
            { label: 'iOS', icon: 'logo-apple' },
            { label: 'Android', icon: 'logo-android' },
            { label: 'Web', icon: 'globe-outline' },
          ].map(function (p, i) {
            return (
              <View key={i} style={gs.platformBadge}>
                <Ionicons name={p.icon} size={13} color="rgba(255,190,60,0.5)" />
                <Text style={gs.platformText}>{p.label}</Text>
              </View>
            );
          })}
        </Animated.View>

      </View>

      {/* ── Bottom Section ── */}
      <View style={{ alignItems: 'center' }}>

        {error ? (
          <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOut.duration(200)} style={gs.errorWrap}>
            <Ionicons name="alert-circle" size={15} color="#FF6B6B" />
            <Text style={gs.errorText}>{error}</Text>
          </Animated.View>
        ) : null}

        {/* ── Premium Google Sign-In Button ── */}
        <View style={{ width: '100%' }}>
          <Animated.View style={[gs.googleBtnShadow, glowAnim]}>
            <SpringPressable
              onPress={handleSignIn}
              disabled={loading}
              haptic="heavy"
              scalePressed={0.96}
              style={{ borderRadius: 16, overflow: 'hidden', opacity: loading ? 0.5 : 1 }}
            >
              <LinearGradient
                colors={loading ? ['#333', '#444'] : ['#FF8C00', '#FF6D00', '#E65100']}
                style={gs.googleBtnGrad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.20)', 'rgba(255,255,255,0.05)', 'transparent']}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
                />
                {loading ? (
                  <CosmicLoader size={24} color="#FFF" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={gs.googleBtnIcon}>
                      <View style={gs.googleBtnGWrap}>
                        <View style={[gs.gBtnSeg, gs.gBtnBlue]} />
                        <View style={[gs.gBtnSeg, gs.gBtnRed]} />
                        <View style={[gs.gBtnSeg, gs.gBtnYellow]} />
                        <View style={[gs.gBtnSeg, gs.gBtnGreen]} />
                        <Text style={gs.googleBtnGLetter}>G</Text>
                      </View>
                    </View>
                    <Text style={gs.googleBtnText}>{T.googleBtn}</Text>
                    <Ionicons name="arrow-forward" size={17} color="rgba(255,220,120,0.7)" />
                  </View>
                )}
              </LinearGradient>
            </SpringPressable>
          </Animated.View>
        </View>

        {/* ── Trust footer ── */}
        <Animated.View entering={FadeInUp.delay(900).duration(400)} style={gs.trustRow}>
          <Ionicons name="lock-closed-outline" size={10} color="rgba(255,255,255,0.25)" />
          <Text style={gs.trustText}>
            {lang === 'si' ? '256-bit SSL මගින් ආරක්ෂිතයි · Google හරහා තහවුරු කර ඇත' : '256-bit SSL · Verified by Google'}
          </Text>
        </Animated.View>

        {onBack ? <GhostButton label={T.back || 'Back'} onPress={onBack} /> : null}
      </View>

    </ScrollView>
  );
}

var gs = StyleSheet.create({
  /* Header */
  headerIconBg: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,184,0,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,184,0,0.25)' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#FBBF24', textAlign: 'center', letterSpacing: 0.3 },
  headerSub: { fontSize: 13, color: 'rgba(255,200,80,0.6)', textAlign: 'center', marginTop: 4, lineHeight: 18 },

  /* Platform Logo */
  platformLogoOuter: { borderWidth: 1.5, borderColor: 'rgba(255,140,0,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 10, ...boxShadow('#FF8C00', { width: 0, height: 0 }, 0.25, 16) },
  platformLogoInner: { backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },

  /* Secure badge */
  secureRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  secureText: { fontSize: 10, color: 'rgba(255,190,60,0.5)', fontWeight: '600', letterSpacing: 0.5 },

  /* Benefits card */
  benefitsCard: { width: '100%', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 10 },
  benefitList: { padding: 14, gap: 10 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitIconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  benefitText: { color: 'rgba(255,220,120,0.85)', fontSize: 13, fontWeight: '500', flex: 1 },

  /* Platform badges */
  platformRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, marginTop: 2 },
  platformBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  platformText: { fontSize: 10, color: 'rgba(255,190,60,0.5)', fontWeight: '600' },

  /* Error */
  errorWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.20)', width: '100%' },
  errorText: { color: '#FCA5A5', fontSize: 12, fontWeight: '600', flex: 1 },

  /* Google button */
  googleBtnShadow: { borderRadius: 16, ...boxShadow('#FF8C00', { width: 0, height: 4 }, 0.7, 16) },
  googleBtnGrad: { paddingVertical: 15, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  googleBtnIcon: { width: 34, height: 34, borderRadius: 10, backgroundcolor: '#FFF1D0', alignItems: 'center', justifyContent: 'center', ...boxShadow('#000', { width: 0, height: 1 }, 0.15, 4) },
  googleBtnGWrap: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  gBtnSeg: { position: 'absolute', width: 24, height: 24, borderRadius: 12 },
  gBtnBlue: { borderWidth: 2.5, borderColor: 'transparent', borderTopColor: '#4285F4', borderRightColor: '#4285F4' },
  gBtnRed: { borderWidth: 2.5, borderColor: 'transparent', borderTopColor: '#EA4335', borderLeftColor: '#EA4335' },
  gBtnYellow: { borderWidth: 2.5, borderColor: 'transparent', borderBottomColor: '#FBBC05', borderLeftColor: '#FBBC05' },
  gBtnGreen: { borderWidth: 2.5, borderColor: 'transparent', borderBottomColor: '#34A853', borderRightColor: '#34A853' },
  googleBtnGLetter: { fontSize: 14, fontWeight: '900', color: '#4285F4', zIndex: 10 },
  googleBtnText: { fontSize: 15, fontWeight: '800', color: '#FFE8A0', letterSpacing: 0.5, ...textShadow('rgba(0,0,0,0.2)', { width: 0, height: 1 }, 4) },

  /* Trust */
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  trustText: { fontSize: 10, color: 'rgba(255,190,60,0.35)', fontWeight: '500', letterSpacing: 0.3 },
});


// ═══════════════════════════════════════════════════════════════════════
//  STEP 3: SUBSCRIPTION — Maximum Dopamine Paywall
// ═══════════════════════════════════════════════════════════════════════


function SubscriptionStep({ onContinue, lang, displayName, birthData }) {
  var T = OB[lang] || OB.en;
  var [loading, setLoading] = useState(false);
  var [restoring, setRestoring] = useState(false);
  var [payError, setPayError] = useState('');
  var [agreed, setAgreed] = useState(false);
  var { activateSubscription, restorePurchases } = useAuth();
  // usePricingForBirth syncs the global pricing context to the user's
  // birth-city country. Birth city always wins over device locale.
  var { priceLabel, priceAmount, currency, currencySymbol, isInternational } = usePricingForBirth(birthData);

  // ── Animations (kept: only what's used in the rebuilt paywall) ──
  var reduced = useReducedMotion();
  var priceGlow = useSharedValue(0);
  var ctaScale = useSharedValue(0);

  useEffect(function () {
    if (reduced) return;
    priceGlow.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
    ctaScale.value = withRepeat(withSequence(
      withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 1200, easing: Easing.in(Easing.quad) }),
      withTiming(0, { duration: 800 })
    ), -1, false);
  }, [reduced]);

  var priceStyle = useAnimatedStyle(function () {
    return { transform: [{ scale: interpolate(priceGlow.value, [0, 1], [1, 1.06]) }] };
  });

  var ctaPulseStyle = useAnimatedStyle(function () {
    return { transform: [{ scale: interpolate(ctaScale.value, [0, 1], [1, 1.04]) }] };
  });

  var features = [
    { icon: 'calendar-outline', text: T.subFeature1, color: '#FFB800' },
    { icon: 'planet-outline', text: T.subFeature2, color: '#FF8C00' },
    { icon: 'notifications-outline', text: T.subFeature5, color: '#06D6A0' },
    { icon: 'chatbubbles-outline', text: T.subFeature4, color: '#A78BFA' },
    { icon: 'star-outline', text: T.subFeature6, color: '#FFD666' },
  ];

  var handleSub = async function () {
    setLoading(true);
    setPayError('');
    try {
      await activateSubscription();
      onContinue();
    } catch (e) {
      var msg = e && e.message ? e.message : '';
      if (msg.indexOf('cancelled') !== -1 || msg.indexOf('dismiss') !== -1) {
        setPayError('');
      } else {
        setPayError(T.subPayFail);
      }
    } finally { setLoading(false); }
  };

  var handleRestore = async function () {
    setRestoring(true);
    setPayError('');
    try {
      var result = await restorePurchases();
      if (result && result.isProActive) {
        onContinue();
      } else {
        setPayError(lang === 'si' ? 'ක්‍රියාකාරී දායකත්වයක් හමු නොවීය' : 'No active subscription found');
      }
    } catch (e) {
      setPayError(lang === 'si' ? 'ප්‍රතිස්ථාපනය අසාර්ථකයි' : 'Restore failed. Please try again.');
    } finally { setRestoring(false); }
  };

  var resp = useResponsive();
  var isSmall = resp.isSmall;

  // ── Compact, scrollable paywall ───────────────────────────────
  // Removed (caused overlap on real devices):
  //  • Countdown timer banner
  //  • Live-users counter
  //  • Locked-previews 4-tile grid
  //  • Rotating testimonial
  // Kept: headline → price → 4 features → terms → CTA → footer.
  var headline = displayName
    ? (lang === 'si' ? displayName + ', ඔබේ සම්පූර්ණ ග්‍රහ සටහන අගුළු අරින්න' : displayName + ', unlock your full chart')
    : (lang === 'si' ? 'ඔබේ සම්පූර්ණ ග්‍රහ සටහන අගුළු අරින්න' : 'Unlock your full chart');

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 22, paddingTop: 4, paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
      bounces={false}
      keyboardShouldPersistTaps="handled"
    >

      {/* ═══ HEADER ═══ */}
      <Animated.View entering={FadeInDown.duration(450)} style={{ alignItems: 'center', marginBottom: 14 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', marginBottom: 10, ...boxShadow('#FFB800', { width: 0, height: 0 }, 0.7, 14) }}>
          <LinearGradient colors={['#FFD700', '#FF8C00']} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="diamond" size={22} color="#FFF1D0" />
          </LinearGradient>
        </View>
        <Text
          numberOfLines={2}
          style={{ fontSize: isSmall ? 19 : 22, fontWeight: '800', color: '#FFF8E0', textAlign: 'center', letterSpacing: 0.2, lineHeight: isSmall ? 24 : 28, paddingHorizontal: 4 }}
        >
          {headline}
        </Text>
        <Text style={{ fontSize: 12, fontWeight: '500', color: 'rgba(255,220,150,0.6)', textAlign: 'center', marginTop: 6, lineHeight: 16, paddingHorizontal: 8 }}>
          {T.subSubtitle}
        </Text>
      </Animated.View>

      {/* ═══ PRICE ═══ */}
      <Animated.View entering={FadeInUp.delay(100).duration(400)} style={[ss.priceBadge, { alignSelf: 'center', marginBottom: 8 }, priceStyle]}>
        <LinearGradient
          colors={['rgba(255,184,0,0.22)', 'rgba(255,140,0,0.10)']}
          style={{ flexDirection: 'row', alignItems: 'baseline', paddingVertical: 12, paddingHorizontal: 22, gap: 4 }}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Text style={ss.priceLabel}>{isInternational ? '$' : 'LKR'}</Text>
          <Text style={{ fontSize: isSmall ? 36 : 42, fontWeight: '900', color: '#FFB800', ...textShadow('rgba(255,184,0,0.5)', { width: 0, height: 0 }, 12) }}>
            {priceAmount('subscription')}
          </Text>
          <Text style={ss.pricePer}>/{lang === 'si' ? 'මාසයට' : 'month'}</Text>
        </LinearGradient>
      </Animated.View>
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 11, color: 'rgba(52,211,153,0.85)', fontWeight: '600' }}>
          {lang === 'si'
            ? 'ඕනෑම වෙලාවක නවතන්න — දින 7ක් නිදහස්'
            : (isInternational ? 'Cancel anytime · ~$0.17/day' : 'Cancel anytime · ~LKR 9/day')}
        </Text>
      </View>

      {/* ═══ FEATURES ═══ */}
      <Animated.View entering={FadeInUp.delay(180).duration(400)} style={{ marginBottom: 16 }}>
        <GlowCard style={{ paddingVertical: 6, paddingHorizontal: 14 }}>
          {features.map(function (f, i) {
            return (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 8,
                  borderBottomWidth: i === features.length - 1 ? 0 : 1,
                  borderBottomColor: 'rgba(255,255,255,0.04)',
                  gap: 10,
                }}
              >
                <Ionicons name="checkmark-circle" size={16} color="#34D399" />
                <View style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: f.color + '18', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={f.icon} size={14} color={f.color} />
                </View>
                <Text
                  style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12.5, flex: 1, lineHeight: 17 }}
                  numberOfLines={2}
                >
                  {f.text}
                </Text>
              </View>
            );
          })}
        </GlowCard>
      </Animated.View>

      {/* ═══ TERMS ═══ */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap', paddingHorizontal: 8 }}>
        <TouchableOpacity onPress={function () { setAgreed(!agreed); }} activeOpacity={0.7} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
          <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: agreed ? '#FF8C00' : 'rgba(255,255,255,0.3)', backgroundColor: agreed ? '#FF8C00' : 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            {agreed ? <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)}><Ionicons name="checkmark" size={16} color="#FFF" /></Animated.View> : null}
          </View>
        </TouchableOpacity>
        <Text
          style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, lineHeight: 18, flexShrink: 1 }}
          onPress={function () { setAgreed(!agreed); }}
        >
          {lang === 'si' ? 'මම ' : 'I agree to the '}
          <Text
            style={{ color: '#FF8C00', textDecorationLine: 'underline', fontWeight: '600' }}
            onPress={function () { Linking.openURL('https://grahachara.com/legal/terms.html'); }}
          >
            {lang === 'si' ? 'නියමයන් සහ කොන්දේසිවලට' : 'Terms & Conditions'}
          </Text>
          {lang === 'si' ? ' එකඟ වෙමි' : ''}
        </Text>
      </View>

      {/* ═══ ERROR ═══ */}
      {payError ? (
        <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOut.duration(200)} style={ss.payErrorWrap}>
          <Ionicons name="alert-circle" size={14} color="#FF6B6B" />
          <Text style={ss.payErrorText}>{payError}</Text>
        </Animated.View>
      ) : null}

      {/* ═══ CTA ═══ */}
      <Animated.View entering={FadeInUp.delay(260).duration(400)} style={ctaPulseStyle}>
        <PrimaryButton
          label={lang === 'si' ? 'සම්පූර්ණ ග්‍රහ සටහන අගුළු අරින්න' : 'Unlock Full Chart'}
          onPress={handleSub}
          loading={loading}
          icon="sparkles"
          disabled={!agreed}
        />
      </Animated.View>

      {/* ═══ FOOTER — trust + restore ═══ */}
      <View style={{ alignItems: 'center', marginTop: 14, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="shield-checkmark-outline" size={11} color="rgba(52,211,153,0.85)" />
            <Text style={{ fontSize: 10, fontWeight: '600', color: 'rgba(52,211,153,0.85)' }}>
              {lang === 'si' ? 'Google Play' : 'Google Play'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="lock-closed-outline" size={11} color="rgba(52,211,153,0.85)" />
            <Text style={{ fontSize: 10, fontWeight: '600', color: 'rgba(52,211,153,0.85)' }}>
              {lang === 'si' ? 'ආරක්ෂිතයි' : 'Secure'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleRestore} disabled={restoring} activeOpacity={0.7} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
          <Text style={{ color: 'rgba(255,184,0,0.6)', fontSize: 11, textDecorationLine: 'underline' }}>
            {restoring
              ? (lang === 'si' ? 'ප්‍රතිස්ථාපනය වෙමින්...' : 'Restoring...')
              : (lang === 'si' ? 'මිලදී ගැනීම් ප්‍රතිස්ථාපනය' : 'Restore Purchases')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

var ss = StyleSheet.create({
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  featureText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, flex: 1, lineHeight: 17, marginLeft: 7 },
  priceBadge: { marginTop: 6, borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,184,0,0.25)', alignSelf: 'center' },
  priceGrad: { flexDirection: 'row', alignItems: 'baseline', paddingVertical: 10, paddingHorizontal: 24, gap: 4 },
  priceLabel: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  priceAmount: { fontSize: 38, fontWeight: '900', color: '#FFB800', ...textShadow('rgba(255,184,0,0.5)', { width: 0, height: 0 }, 12) },
  pricePer: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginLeft: 2 },
  payErrorWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.20)' },
  payErrorText: { color: '#FCA5A5', fontSize: 13, fontWeight: '600', flex: 1 },
});


// ═══════════════════════════════════════════════════════════════════════
//  STEP 4: BIRTH DATA — 4-page wizard
// ═══════════════════════════════════════════════════════════════════════

var BIRTH_STEP_COLORS = ['#A78BFA', '#FFB800', '#06B6D4', '#34D399'];

function BirthDataStep({ onComplete, lang }) {
  var T = OB[lang] || OB.en;
  var [page, setPage] = useState(0);
  var [displayName, setDisplayName] = useState('');
  var [year, setYear] = useState('');
  var [month, setMonth] = useState(null);
  var [day, setDay] = useState('');
  var [hour, setHour] = useState('');
  var [minute, setMinute] = useState('');
  var [ampm, setAmpm] = useState('AM');
  var [selectedCity, setSelectedCity] = useState(null);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState('');

  var progressLabels = [T.subProgressName, T.subProgressDate, T.subProgressTime, T.subProgressPlace];

  var daysInMonth = function (m, y) {
    if (m === null || !y) return 31;
    return new Date(parseInt(y), m + 1, 0).getDate();
  };

  var validateDate = function () {
    var y = parseInt(year);
    if (!year || isNaN(y) || y < 1900 || y > 2026) return T.yearError;
    if (month === null) return T.monthError;
    var d = parseInt(day);
    if (!day || isNaN(d) || d < 1 || d > daysInMonth(month, year)) return T.dayError;
    return '';
  };

  var validateTime = function () {
    var h = parseInt(hour);
    var m = parseInt(minute);
    if (hour !== '' && (isNaN(h) || h < 1 || h > 12)) return T.timeError;
    if (minute !== '' && (isNaN(m) || m < 0 || m > 59)) return T.timeError;
    return '';
  };

  var handleSubmit = async function () {
    if (displayName.trim().length < 2) { setError(T.nameError); setPage(0); return; }
    var dateErr = validateDate();
    if (dateErr) { setError(dateErr); setPage(1); return; }
    var timeErr = validateTime();
    if (timeErr) { setError(timeErr); setPage(2); return; }
    if (!selectedCity) { setError(T.cityError); setPage(3); return; }
    setLoading(true); setError('');
    try {
      var h = parseInt(hour) || 12;
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      var m = parseInt(minute) || 0;
      var pad = function (n) { return n.toString().padStart(2, '0'); };
      var dateTime = parseInt(year) + '-' + pad(month + 1) + '-' + pad(parseInt(day)) + 'T' + pad(h) + ':' + pad(m) + ':00';
      var birthInfo = {
        dateTime: dateTime,
        lat: selectedCity.lat,
        lng: selectedCity.lng,
        locationName: selectedCity.name + (selectedCity.country ? ', ' + selectedCity.country : ''),
        countryCode: selectedCity.countryCode || 'LK',
        timezone: 'Asia/Colombo',
      };
      onComplete(displayName.trim(), birthInfo);
    } catch (e) { setError(T.saveFailed); }
    finally { setLoading(false); }
  };

  var handleSkip = null;

  /* Progress bar */
  var renderProgress = function () {
    return (
      <View style={bd.progressRow}>
        {progressLabels.map(function (label, i) {
          var active = i <= page;
          var current = i === page;
          var stepColor = BIRTH_STEP_COLORS[i];
          return (
            <TouchableOpacity
              key={i} style={bd.progressItem}
              onPress={function () { if (i < page) setPage(i); }}
              disabled={i >= page} activeOpacity={0.7}
            >
              <View style={[bd.progressLine, active && { backgroundColor: stepColor + '80' }, current && { backgroundColor: stepColor }]} />
              <Text style={[bd.progressLabel, active && { color: stepColor }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  var dateDisplay = (year || '') + (month !== null ? '-' + (month + 1) : '') + (day ? '-' + day : '');
  var timeDisplay = (hour || '') + (minute ? ':' + minute : '') + (hour ? ' ' + ampm : '');

  /* PAGE 0: Name */
  var renderNamePage = function () {
    var nameTeaser = lang === 'si' ? '🔮 ඔබේ නම ඇතුළත් කළ පසු, තරු ඔබ ගැන කුමක් සැඟවූවාද යන්න හෙළි වේ' : '🔮 The moment you type your name, the stars begin revealing what they\'ve been hiding about you';
    return (
      <Animated.View key="name" entering={FadeIn.duration(300)} exiting={FadeOut.duration(150)} style={{ flex: 1, justifyContent: 'center' }}>
        <View>
          <StepHeader icon="person-outline" iconColor="#A78BFA" title={T.nameTitle} subtitle={T.nameSubtitle} />
          <GlowCard style={{ marginTop: 12 }}>
            <Text style={g.inputLabel}>{T.nameLabel}</Text>
            <TextInput
              style={g.textInput}
              placeholder={T.namePlaceholder}
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={displayName}
              onChangeText={function (t) { setDisplayName(t); setError(''); }}
              autoFocus
              selectionColor="#A78BFA"
            />
            {error && page === 0 ? <Animated.Text entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={g.error}>{error}</Animated.Text> : null}
          </GlowCard>
          <Text style={[g.hint, { marginTop: 14, color: '#C4B5FD', fontSize: 12, lineHeight: 18 }]}>{nameTeaser}</Text>
          <View style={{ marginTop: 24 }}>
            <PrimaryButton
              label={T.continueBtn}
              onPress={function () { if (displayName.trim().length >= 2) setPage(1); else setError(T.nameError); }}
              disabled={displayName.trim().length < 2}
              icon="arrow-forward"
            />
          </View>
        </View>
      </Animated.View>
    );
  };

  /* PAGE 1: Date */
  var renderDatePage = function () {
    var dateTeaser = lang === 'si' ? '⭐ ඔබ උපන් මොහොතේ ග්‍රහ 9 හරියටම කොතනද තිබුණේ? ඊළඟ පියවරේදී ඔබම බලන්න' : '⭐ Where exactly were the 9 planets the second you were born? You\'re about to find out';
    return (
      <Animated.View key="date" entering={FadeIn.duration(300)} exiting={FadeOut.duration(150)} style={{ flex: 1, justifyContent: 'center' }}>
        <View>
          <StepHeader icon="calendar-outline" iconColor="#FFB800" title={T.dateTitle} subtitle={T.dateSubtitle} />

          <GlowCard style={{ marginTop: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={g.inputLabel}>{T.yearLabel}</Text>
                <TextInput style={g.textInput} placeholder={T.yearPlaceholder} placeholderTextColor="rgba(255,255,255,0.2)" keyboardType="number-pad" value={year} onChangeText={function (t) { setYear(t); setError(''); }} maxLength={4} selectionColor="#FFB800" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={g.inputLabel}>{T.dayLabel}</Text>
                <TextInput style={g.textInput} placeholder={T.dayPlaceholder} placeholderTextColor="rgba(255,255,255,0.2)" keyboardType="number-pad" value={day} onChangeText={function (t) { setDay(t); setError(''); }} maxLength={2} selectionColor="#FFB800" />
              </View>
            </View>

            <Text style={[g.inputLabel, { marginTop: 12 }]}>{T.monthLabel}</Text>
            <View style={bd.monthGrid}>
              {T.months.map(function (m, i) {
                var sel = month === i;
                return (
                  <TouchableOpacity key={i} style={[bd.monthChip, sel && bd.monthChipSel]} onPress={function () { setMonth(i); setError(''); }} activeOpacity={0.7}>
                    <Text style={[bd.monthText, sel && bd.monthTextSel]}>{m}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </GlowCard>
          {error && page === 1 ? <Animated.Text entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={g.error}>{error}</Animated.Text> : null}
          <Text style={[g.hint, { marginTop: 10, color: '#FFD666', fontSize: 12, lineHeight: 18 }]}>{dateTeaser}</Text>

          <View style={bd.navRow}>
            <TouchableOpacity onPress={function () { setPage(0); setError(''); }} style={bd.backBtn}>
              <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.5)" />
              <Text style={bd.backText}>{T.back}</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <PrimaryButton label={T.continueBtn} onPress={function () { var err = validateDate(); if (err) { setError(err); } else { setError(''); setPage(2); } }} icon="arrow-forward" />
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  /* PAGE 2: Time */
  var renderTimePage = function () {
    var timeTeaser = lang === 'si' ? '🌙 උපන් වේලාව ඔබේ ලග්නය තීරණය කරයි — ඔබේ මුළු ජීවිතයේම සැඟවුණු සැලැස්ම එයයි' : '🌙 This is the single most important detail — it determines your entire rising sign and life path';
    return (
      <Animated.View key="time" entering={FadeIn.duration(300)} exiting={FadeOut.duration(150)} style={{ flex: 1, justifyContent: 'center' }}>
        <View>
          <StepHeader icon="time-outline" iconColor="#06B6D4" title={T.timeTitle} subtitle={T.timeSubtitle} />

          <GlowCard style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={g.inputLabel}>{T.hourLabel}</Text>
                <TextInput style={[g.textInput, { textAlign: 'center', fontSize: 24, fontWeight: '700' }]} placeholder="12" placeholderTextColor="rgba(255,255,255,0.2)" keyboardType="number-pad" value={hour} onChangeText={function (t) { setHour(t); setError(''); }} maxLength={2} selectionColor="#06B6D4" />
              </View>
              <Text style={{ color: '#06B6D4', fontSize: 32, fontWeight: '800', marginTop: 16 }}>:</Text>
              <View style={{ flex: 1 }}>
                <Text style={g.inputLabel}>{T.minuteLabel}</Text>
                <TextInput style={[g.textInput, { textAlign: 'center', fontSize: 24, fontWeight: '700' }]} placeholder="00" placeholderTextColor="rgba(255,255,255,0.2)" keyboardType="number-pad" value={minute} onChangeText={function (t) { setMinute(t); setError(''); }} maxLength={2} selectionColor="#06B6D4" />
              </View>
            </View>

            <View style={bd.ampmRow}>
              {['AM', 'PM'].map(function (v) {
                var sel = ampm === v;
                return (
                  <TouchableOpacity key={v} style={[bd.ampmBtn, sel && bd.ampmSel]} onPress={function () { setAmpm(v); }} activeOpacity={0.7}>
                    <Text style={[bd.ampmText, sel && bd.ampmTextSel]}>{v}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </GlowCard>

          {error && page === 2 ? <Animated.Text entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={g.error}>{error}</Animated.Text> : null}
          <Text style={[g.hint, { marginTop: 8 }]}>{'\uD83D\uDCA1'} {T.timeHint}</Text>
          <Text style={[g.hint, { marginTop: 6, color: '#67E8F9', fontSize: 12, lineHeight: 18 }]}>{timeTeaser}</Text>

          <View style={bd.navRow}>
            <TouchableOpacity onPress={function () { setPage(1); setError(''); }} style={bd.backBtn}>
              <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.5)" />
              <Text style={bd.backText}>{T.back}</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <PrimaryButton label={T.continueBtn} onPress={function () { var err = validateTime(); if (err) { setError(err); } else { setError(''); setPage(3); } }} icon="arrow-forward" />
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  /* PAGE 3: Place */
  var renderPlacePage = function () {
    var placeTeaser = lang === 'si' ? '✨ අවසාන පියවර! තත්පර කිහිපයකින් ඔබේ සම්පූර්ණ ඉරණම සහ සැඟවුණු කේන්දරය හෙළි වේ' : '✨ Final step! In seconds you\'ll see your complete birth chart and hidden destiny revealed';
    return (
      <Animated.View key="place" entering={FadeIn.duration(300)} exiting={FadeOut.duration(150)} style={{ flex: 1, justifyContent: 'center' }}>
        <View>
          <StepHeader icon="earth-outline" iconColor="#34D399" title={T.placeTitle} subtitle={T.placeSubtitle} />

          <View style={{ marginTop: 12 }}>
            <CitySearchPicker
              selectedCity={selectedCity}
              onSelect={function (city) { setSelectedCity(city); setError(''); }}
              lang={lang}
              accentColor="#FFB800"
              maxHeight={180}
              placeholder={T.placeSearch}
            />
          </View>

          {selectedCity ? (
            <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOut.duration(200)} style={bd.selectedCityBadge}>
              <Ionicons name="location" size={16} color="#34D399" />
              <Text style={bd.selectedCityText}>
                {selectedCity.name}{selectedCity.country ? ', ' + selectedCity.country : ''}
              </Text>
              <Text style={bd.selectedCityCoords}>
                {selectedCity.lat.toFixed(4)}°, {selectedCity.lng.toFixed(4)}°
              </Text>
            </Animated.View>
          ) : null}

          {error && page === 3 ? <Animated.Text entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={g.error}>{error}</Animated.Text> : null}
          <Text style={[g.hint, { marginTop: 6 }]}>{'\uD83C\uDF0D'} {T.placeHint}</Text>
          <Text style={[g.hint, { marginTop: 6, color: '#6EE7B7', fontSize: 12, lineHeight: 18 }]}>{placeTeaser}</Text>

          <View style={bd.navRow}>
            <TouchableOpacity onPress={function () { setPage(2); setError(''); }} style={bd.backBtn}>
              <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.5)" />
              <Text style={bd.backText}>{T.back}</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <PrimaryButton label={T.completeSetup} onPress={handleSubmit} loading={loading} icon="checkmark-done" />
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 0, paddingBottom: 8 }}>
      {renderProgress()}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
      {page === 0 ? renderNamePage()
        : page === 1 ? renderDatePage()
        : page === 2 ? renderTimePage()
        : renderPlacePage()}
      </ScrollView>
    </View>
  );
}

var bd = StyleSheet.create({
  progressRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  progressItem: { flex: 1, alignItems: 'center' },
  progressLine: { width: '100%', height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 6 },
  progressLineActive: { backgroundColor: 'rgba(255,184,0,0.5)' },
  progressLineCurrent: { backgroundColor: '#FFB800' },
  progressLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  progressLabelActive: { color: '#FFD666' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6, justifyContent: 'space-between' },
  monthChip: { width: '31%', paddingVertical: 9, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  monthChipSel: { backgroundColor: 'rgba(255,184,0,0.15)', borderColor: '#FFB800' },
  monthText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
  monthTextSel: { color: '#FFD666', fontWeight: '700' },
  ampmRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18, gap: 14 },
  ampmBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  ampmSel: { backgroundColor: 'rgba(6,182,212,0.15)', borderColor: '#06B6D4' },
  ampmText: { color: 'rgba(255,255,255,0.5)', fontSize: 17, fontWeight: '700' },
  ampmTextSel: { color: '#67E8F9' },
  selectedCityBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginTop: 12, backgroundColor: 'rgba(52,211,153,0.08)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.2)' },
  selectedCityText: { color: '#6EE7B7', fontSize: 14, fontWeight: '600', flex: 1 },
  selectedCityCoords: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '500' },
  chartPreview: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, marginTop: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,140,0,0.15)' },
  chartPreviewIcon: { fontSize: 24 },
  chartPreviewText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500', fontStyle: 'italic', flex: 1 },
  navRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 14, paddingHorizontal: 6 },
  backText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '500' },
});


// ═══════════════════════════════════════════════════════════════════════
//  STEP 4.5: LAGNA REVEAL — Spectacular birth chart reveal
// ═══════════════════════════════════════════════════════════════════════

var ZODIAC_SYMBOLS = {
  'Mesha': '♈', 'Vrishabha': '♉', 'Mithuna': '♊', 'Kataka': '♋',
  'Simha': '♌', 'Kanya': '♍', 'Tula': '♎', 'Vrischika': '♏',
  'Dhanus': '♐', 'Makara': '♑', 'Kumbha': '♒', 'Meena': '♓',
  'Aries': '♈', 'Taurus': '♉', 'Gemini': '♊', 'Cancer': '♋',
  'Leo': '♌', 'Virgo': '♍', 'Libra': '♎', 'Scorpio': '♏',
  'Sagittarius': '♐', 'Capricorn': '♑', 'Aquarius': '♒', 'Pisces': '♓',
};

var ZODIAC_IMAGE_MAP = ZODIAC_IMG_MAP;

var ZODIAC_ELEMENTS = {
  'Mesha': 'fire', 'Vrishabha': 'earth', 'Mithuna': 'air', 'Kataka': 'water',
  'Simha': 'fire', 'Kanya': 'earth', 'Tula': 'air', 'Vrischika': 'water',
  'Dhanus': 'fire', 'Makara': 'earth', 'Kumbha': 'air', 'Meena': 'water',
  'Aries': 'fire', 'Taurus': 'earth', 'Gemini': 'air', 'Cancer': 'water',
  'Leo': 'fire', 'Virgo': 'earth', 'Libra': 'air', 'Scorpio': 'water',
  'Sagittarius': 'fire', 'Capricorn': 'earth', 'Aquarius': 'air', 'Pisces': 'water',
};

var ELEMENT_COLORS = {
  fire: ['#FF6B35', '#FF4500', 'rgba(255,107,53,0.12)'],
  earth: ['#4CAF50', '#2E7D32', 'rgba(76,175,80,0.12)'],
  air: ['#42A5F5', '#1565C0', 'rgba(66,165,245,0.12)'],
  water: ['#26C6DA', '#00838F', 'rgba(38,198,218,0.12)'],
};


function LagnaRevealStep({ birthData, displayName, onContinue, lang }) {
  var T = OB[lang] || OB.en;
  var resp = useResponsive();
  var [phase, setPhase] = useState('loading');
  var [chartData, setChartData] = useState(null);
  var [error, setError] = useState('');
  var [cycleIdx, setCycleIdx] = useState(0);
  var [loadPhase, setLoadPhase] = useState(0); // 0=vortex, 1=cycling, 2=decelerate

  // Zodiac sign cycling animation during loading
  useEffect(function () {
    if (phase !== 'loading' || loadPhase < 1) return;
    var speed = 250;
    var interval = setInterval(function () {
      setCycleIdx(function (prev) { return (prev + 1) % 12; });
    }, speed);
    return function () { clearInterval(interval); };
  }, [phase, loadPhase]);

  // Kick off cycling after vortex settles
  useEffect(function () {
    if (phase !== 'loading') return;
    var t = setTimeout(function () { setLoadPhase(1); }, 2200);
    return function () { clearTimeout(t); };
  }, [phase]);

  // Animations
  var orbGlow = useSharedValue(0);
  var orbScale = useSharedValue(0.4);
  var orbRotate = useSharedValue(0);
  var ringScale1 = useSharedValue(0);
  var ringScale2 = useSharedValue(0);
  var ringScale3 = useSharedValue(0);
  var symbolScale = useSharedValue(0.01);
  var symbolRotate = useSharedValue(-180);
  var detailsOpacity = useSharedValue(0);
  var heroImageOpacity = useSharedValue(0);
  var particleAngle = useSharedValue(0);
  var loadTextGlow = useSharedValue(0);
  var bigBang = useSharedValue(0);
  var bgPulse = useSharedValue(0);
  var nameReveal = useSharedValue(0);

  // Fetch chart data
  useEffect(function () {
    if (!birthData || !birthData.dateTime) {
      setPhase('skip');
      return;
    }
    var fetchChart = async function () {
      try {
        var result = await getBirthChartBasic(birthData.dateTime, birthData.lat, birthData.lng, lang);
        if (result && result.data) {
          setChartData(result.data);
          var targetIdx = result.data.lagna && result.data.lagna.rashiId ? result.data.lagna.rashiId - 1 : 0;
          // Decelerate and land on correct sign
          setLoadPhase(2);
          var slowSteps = [200, 260, 340, 440, 560, 700, 880, 1100, 1400];
          var currentStep = 0;
          var slowInterval;
          function doSlowStep() {
            if (currentStep < slowSteps.length) {
              setCycleIdx(function (prev) { return (prev + 1) % 12; });
              currentStep++;
              slowInterval = setTimeout(doSlowStep, slowSteps[currentStep - 1]);
            } else {
              setCycleIdx(targetIdx);
              setTimeout(function () { setPhase('reveal'); }, 1000);
            }
          }
          setTimeout(function () { doSlowStep(); }, 400);
        } else {
          setPhase('skip');
        }
      } catch (e) {
        if (__DEV__) console.warn('Lagna fetch failed:', e);
        setPhase('skip');
      }
    };
    fetchChart();
  }, []);

  // Loading phase animations
  var reduced = useReducedMotion();
  useEffect(function () {
    orbScale.value = withSequence(
      withTiming(0.6, { duration: 800, easing: Easing.out(Easing.cubic) }),
      withRepeat(withSequence(
        withTiming(1.08, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.88, { duration: 1800, easing: Easing.inOut(Easing.sin) })
      ), -1, true)
    );
    if (reduced) return;
    orbGlow.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true);
    orbRotate.value = withRepeat(withTiming(360, { duration: 30000, easing: Easing.linear }), -1, false);
    ringScale1.value = withRepeat(withSequence(
      withTiming(1.5, { duration: 3000, easing: Easing.out(Easing.cubic) }),
      withTiming(0.5, { duration: 3000, easing: Easing.inOut(Easing.sin) })
    ), -1, true);
    ringScale2.value = withDelay(500, withRepeat(withSequence(
      withTiming(1.8, { duration: 3500, easing: Easing.out(Easing.cubic) }),
      withTiming(0.4, { duration: 3500, easing: Easing.inOut(Easing.sin) })
    ), -1, true));
    ringScale3.value = withDelay(1000, withRepeat(withSequence(
      withTiming(2.1, { duration: 4000, easing: Easing.out(Easing.cubic) }),
      withTiming(0.3, { duration: 4000, easing: Easing.inOut(Easing.sin) })
    ), -1, true));
    particleAngle.value = withRepeat(withTiming(360, { duration: 6000, easing: Easing.linear }), -1, false);
    loadTextGlow.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }), -1, true);
    bgPulse.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduced]);

  // Reveal phase — dramatic staged entrance
  useEffect(function () {
    if (phase === 'reveal') {
      bigBang.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 1000, easing: Easing.out(Easing.cubic) })
      );
      symbolScale.value = withSequence(
        withDelay(200, withSpring(1.5, { damping: 5, stiffness: 180 })),
        withSpring(1, { damping: 10, stiffness: 100 })
      );
      symbolRotate.value = withDelay(200, withSpring(0, { damping: 12, stiffness: 50 }));
      heroImageOpacity.value = withDelay(200, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
      nameReveal.value = withDelay(800, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
      detailsOpacity.value = withDelay(1600, withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }));
    }
  }, [phase]);

  var orbStyle = useAnimatedStyle(function () {
    return {
      transform: [{ scale: orbScale.value }],
      opacity: interpolate(orbGlow.value, [0, 1], [0.7, 1]),
    };
  });
  var makeRingStyle = function (scaleVal, reverse) {
    return useAnimatedStyle(function () {
      var rot = reverse ? -orbRotate.value * 0.6 : orbRotate.value;
      return {
        transform: [{ scale: scaleVal.value }, { rotate: rot + 'deg' }],
        opacity: interpolate(scaleVal.value, [0.3, 2.1], [0.5, 0.02]),
      };
    });
  };
  var ring1Style = makeRingStyle(ringScale1, false);
  var ring2Style = makeRingStyle(ringScale2, true);
  var ring3Style = makeRingStyle(ringScale3, false);
  var symbolStyle = useAnimatedStyle(function () {
    return { transform: [{ scale: symbolScale.value }, { rotate: symbolRotate.value + 'deg' }] };
  });
  var heroImageStyle = useAnimatedStyle(function () {
    return { opacity: heroImageOpacity.value };
  });
  var nameRevealStyle = useAnimatedStyle(function () {
    return {
      opacity: nameReveal.value,
      transform: [{ translateY: interpolate(nameReveal.value, [0, 1], [20, 0]) }],
    };
  });
  var detailStyle = useAnimatedStyle(function () {
    return { opacity: detailsOpacity.value };
  });
  var bigBangStyle = useAnimatedStyle(function () {
    return {
      opacity: bigBang.value,
      transform: [{ scale: interpolate(bigBang.value, [0, 1], [3, 1]) }],
    };
  });
  var loadGlowStyle = useAnimatedStyle(function () {
    if (Platform.OS === 'web') return {};
    return {
      shadowColor: '#FFB800',
      shadowOpacity: interpolate(loadTextGlow.value, [0, 1], [0.3, 0.9]),
      shadowRadius: interpolate(loadTextGlow.value, [0, 1], [4, 20]),
      shadowOffset: { width: 0, height: 0 },
    };
  });
  var bgPulseStyle = useAnimatedStyle(function () {
    return { opacity: interpolate(bgPulse.value, [0, 1], [0, 0.12]) };
  });
  var progressBarStyle = useAnimatedStyle(function () {
    return {
      backgroundColor: 'rgba(255,184,0,0.6)',
      transform: [{ scaleX: interpolate(loadTextGlow.value, [0, 1], [0.3, 1]) }],
    };
  });

  // Orbiting particles — fixed count, each hook called unconditionally
  var ip0 = useAnimatedStyle(function () { var a = ((particleAngle.value + 0) * Math.PI) / 180; return { position: 'absolute', left: Math.cos(a) * 60, top: Math.sin(a) * 60, opacity: interpolate(orbGlow.value, [0, 1], [0.12, 0.8]) }; });
  var ip1 = useAnimatedStyle(function () { var a = ((particleAngle.value + 60) * Math.PI) / 180; return { position: 'absolute', left: Math.cos(a) * 60, top: Math.sin(a) * 60, opacity: interpolate(orbGlow.value, [0, 1], [0.12, 0.8]) }; });
  var ip2 = useAnimatedStyle(function () { var a = ((particleAngle.value + 120) * Math.PI) / 180; return { position: 'absolute', left: Math.cos(a) * 60, top: Math.sin(a) * 60, opacity: interpolate(orbGlow.value, [0, 1], [0.12, 0.8]) }; });
  var ip3 = useAnimatedStyle(function () { var a = ((particleAngle.value + 180) * Math.PI) / 180; return { position: 'absolute', left: Math.cos(a) * 60, top: Math.sin(a) * 60, opacity: interpolate(orbGlow.value, [0, 1], [0.12, 0.8]) }; });
  var ip4 = useAnimatedStyle(function () { var a = ((particleAngle.value + 240) * Math.PI) / 180; return { position: 'absolute', left: Math.cos(a) * 60, top: Math.sin(a) * 60, opacity: interpolate(orbGlow.value, [0, 1], [0.12, 0.8]) }; });
  var ip5 = useAnimatedStyle(function () { var a = ((particleAngle.value + 300) * Math.PI) / 180; return { position: 'absolute', left: Math.cos(a) * 60, top: Math.sin(a) * 60, opacity: interpolate(orbGlow.value, [0, 1], [0.12, 0.8]) }; });
  var innerParticles = [ip0, ip1, ip2, ip3, ip4, ip5];
  var op0 = useAnimatedStyle(function () { var a = ((particleAngle.value + 0) * Math.PI) / 180; return { position: 'absolute', left: Math.cos(a) * 95, top: Math.sin(a) * 95, opacity: interpolate(orbGlow.value, [0, 1], [0.12, 0.8]) }; });
  var op1 = useAnimatedStyle(function () { var a = ((particleAngle.value + 45) * Math.PI) / 180; return { position: 'absolute', left: Math.cos(a) * 95, top: Math.sin(a) * 95, opacity: interpolate(orbGlow.value, [0, 1], [0.12, 0.8]) }; });
  var op2 = useAnimatedStyle(function () { var a = ((particleAngle.value + 90) * Math.PI) / 180; return { position: 'absolute', left: Math.cos(a) * 95, top: Math.sin(a) * 95, opacity: interpolate(orbGlow.value, [0, 1], [0.12, 0.8]) }; });
  var op3 = useAnimatedStyle(function () { var a = ((particleAngle.value + 135) * Math.PI) / 180; return { position: 'absolute', left: Math.cos(a) * 95, top: Math.sin(a) * 95, opacity: interpolate(orbGlow.value, [0, 1], [0.12, 0.8]) }; });
  var op4 = useAnimatedStyle(function () { var a = ((particleAngle.value + 180) * Math.PI) / 180; return { position: 'absolute', left: Math.cos(a) * 95, top: Math.sin(a) * 95, opacity: interpolate(orbGlow.value, [0, 1], [0.12, 0.8]) }; });
  var op5 = useAnimatedStyle(function () { var a = ((particleAngle.value + 225) * Math.PI) / 180; return { position: 'absolute', left: Math.cos(a) * 95, top: Math.sin(a) * 95, opacity: interpolate(orbGlow.value, [0, 1], [0.12, 0.8]) }; });
  var op6 = useAnimatedStyle(function () { var a = ((particleAngle.value + 270) * Math.PI) / 180; return { position: 'absolute', left: Math.cos(a) * 95, top: Math.sin(a) * 95, opacity: interpolate(orbGlow.value, [0, 1], [0.12, 0.8]) }; });
  var op7 = useAnimatedStyle(function () { var a = ((particleAngle.value + 315) * Math.PI) / 180; return { position: 'absolute', left: Math.cos(a) * 95, top: Math.sin(a) * 95, opacity: interpolate(orbGlow.value, [0, 1], [0.12, 0.8]) }; });
  var outerParticles = [op0, op1, op2, op3, op4, op5, op6, op7];

  // Auto-skip if no birth data
  useEffect(function () {
    if (phase === 'skip') {
      var t = setTimeout(function () { onContinue(); }, 500);
      return function () { clearTimeout(t); };
    }
  }, [phase]);

  if (phase === 'skip') {
    return (
      <View style={g.center}>
        <CosmicLoader size={56} color="#FFB800" text={T.completeLoading} textColor="#FFD666" />
      </View>
    );
  }


  var CYCLE_SIGN_NAMES_EN = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  var CYCLE_SIGN_NAMES_SI = ['මේෂ','වෘෂභ','මිථුන','කටක','සිංහ','කන්‍යා','තුලා','වෘශ්චික','ධනු','මකර','කුම්භ','මීන'];
  var CYCLE_SIGN_NAMES = lang === 'si' ? CYCLE_SIGN_NAMES_SI : CYCLE_SIGN_NAMES_EN;

  // ═══════════════════════════════════════════════════════════
  //  LOADING PHASE — Celestial Observatory
  // ═══════════════════════════════════════════════════════════
  if (phase === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        {/* Background Rashi Chakra — decorative */}
        <View style={{ position: 'absolute', opacity: 0.08, pointerEvents: 'none' }}>
          <AwesomeRashiChakra size={Math.min(SW * 0.95, 380)} />
        </View>

        {/* Warm radial pulse */}
        <Animated.View style={[{
          position: 'absolute', width: SH * 0.65, height: SH * 0.65,
          borderRadius: SH * 0.325, backgroundColor: 'rgba(255,140,0,0.03)',
        }, bgPulseStyle]} />



        {/* Central cycling orb */}
        <View style={{ width: 240, height: 240, alignItems: 'center', justifyContent: 'center' }}>
          {/* Expanding ring waves */}
          {[ringScale1, ringScale2, ringScale3].map(function (sv, i) {
            var styles = [ring1Style, ring2Style, ring3Style];
            return (
              <Animated.View key={'ring' + i} style={[{
                position: 'absolute', width: 160, height: 160, borderRadius: 80,
                borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,184,0,0.25)',
              }, styles[i]]} />
            );
          })}

          {/* Orbiting gold particles — inner ring */}
          <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
            {innerParticles.map(function (pStyle, i) {
              return (
                <Animated.View key={'ip' + i} style={[pStyle, { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFD666' }]} />
              );
            })}
          </View>
          {/* Orbiting particles — outer ring */}
          <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
            {outerParticles.map(function (pStyle, i) {
              return (
                <Animated.View key={'op' + i} style={[pStyle, { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#A78BFA' }]} />
              );
            })}
          </View>

          {/* Zodiac image orb */}
          <Animated.View style={[{ width: 150, height: 150, alignItems: 'center', justifyContent: 'center' }, orbStyle]}>
            {/* Circle background */}
            <View style={{
              position: 'absolute', width: 150, height: 150, borderRadius: 75,
              overflow: 'hidden', ...boxShadow('#FFB800', { width: 0, height: 0 }, 1, 50),
            }}>
              <LinearGradient
                colors={['rgba(255,241,118,0.22)', 'rgba(255,184,0,0.12)', 'rgba(255,140,0,0.06)']}
                style={{ width: 150, height: 150 }}
                start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
              />
            </View>
            {/* Gold border */}
            <View style={{
              position: 'absolute', width: 150, height: 150, borderRadius: 75,
              borderWidth: 2, borderColor: 'rgba(255,184,0,0.45)',
            }} />
            {/* Zodiac image */}
            <Image source={ZODIAC_IMAGES[cycleIdx]} resizeMode="contain" style={{ width: 105, height: 105 }} />
          </Animated.View>

          {/* Cycling sign name */}
          <View style={{ position: 'absolute', bottom: 10 }}>
            <Text style={{
              fontSize: 14, fontWeight: '900', color: 'rgba(255,214,102,0.75)',
              textAlign: 'center', letterSpacing: 1.5,
              ...textShadow('rgba(255,184,0,0.4)', { width: 0, height: 0 }, 10),
            }}>
              {CYCLE_SIGN_NAMES[cycleIdx]}
            </Text>
          </View>
        </View>

        {/* Loading text */}
        <Animated.View style={[{ marginTop: 32, alignItems: 'center' }, loadGlowStyle]}>
          <Animated.Text entering={FadeIn.delay(200).duration(500)} style={{
            fontSize: 22, fontWeight: '900', color: '#FFD666',
            textAlign: 'center', letterSpacing: 0.3,
            ...textShadow('rgba(255,184,0,0.6)', { width: 0, height: 0 }, 18),
          }}>
            {T.revealLoading}
          </Animated.Text>
          <Animated.Text entering={FadeIn.delay(600).duration(500)} style={{
            fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.40)',
            textAlign: 'center', marginTop: 10, lineHeight: 18,
          }}>
            {T.revealLoadingSub}
          </Animated.Text>
        </Animated.View>

        {/* Pulsing line — minimal progress indicator */}
        <View style={{ marginTop: 32, width: 60, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,184,0,0.12)', overflow: 'hidden' }}>
          <Animated.View style={[{
            width: '100%', height: '100%', borderRadius: 1.5,
          }, progressBarStyle]} />
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  REVEAL PHASE — Cinematic Birth Chart Reveal
  // ═══════════════════════════════════════════════════════════
  if (phase === 'reveal' && chartData) {
    var lagna = chartData.lagna || {};
    var lagnaDetails = chartData.lagnaDetails || {};
    var moonSign = chartData.moonSign || {};
    var sunSign = chartData.sunSign || {};
    var nakshatra = chartData.nakshatra || {};
    var personality = chartData.personality || {};
    var element = ZODIAC_ELEMENTS[lagna.name] || 'fire';
    var elemColors = ELEMENT_COLORS[element];
    var zodiacSymbol = ZODIAC_SYMBOLS[lagna.name] || ZODIAC_SYMBOLS[lagna.english] || '⭐';
    var zodiacImage = ZODIAC_IMAGE_MAP[lagna.name] || ZODIAC_IMAGE_MAP[lagna.english] || (lagna.rashiId ? ZODIAC_IMAGES[lagna.rashiId - 1] : null);
    var lagnaName = lang === 'si' ? (lagna.sinhala || lagna.english) : (lagna.english || lagna.name);
    var lagnaSubname = lang === 'si' ? (lagnaDetails.english || lagna.english) : '';
    var moonName = lang === 'si' ? (moonSign.sinhala || moonSign.english) : (moonSign.english || moonSign.name);
    var sunName = lang === 'si' ? (sunSign.sinhala || sunSign.english) : (sunSign.english || sunSign.name);
    var nakshatraName = nakshatra.name || '';
    var nakshatraSinhala = nakshatra.sinhala || '';
    var traits = lang === 'si' ? (lagnaDetails.traitsSi || lagnaDetails.traits || []) : (lagnaDetails.traits || []);

    var isSmallScreen = resp.isSmall;
    var HERO_SIZE = isSmallScreen ? 150 : 180;

    return (
      <View style={{ flex: 1 }}>

        {/* Big Bang flash overlay */}
        <Animated.View style={[{
          position: 'absolute', top: -100, left: -100, right: -100, bottom: -100,
          backgroundColor: elemColors[2], zIndex: 100, pointerEvents: 'none',
        }, bigBangStyle]} />

        {/* Background Rashi Chakra */}
        <View style={{
          position: 'absolute', top: SH * 0.06,
          left: (SW - Math.min(SW * 0.85, 320)) / 2 - 20,
          opacity: 0.08, pointerEvents: 'none',
        }}>
          <AwesomeRashiChakra size={Math.min(SW * 0.85, 320)} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >

        {/* ── HERO: Cosmic Portal + Zodiac Image ── */}
        <View style={{ alignItems: 'center', marginTop: isSmallScreen ? 6 : 14 }}>
          <View style={{ width: HERO_SIZE, height: HERO_SIZE, alignItems: 'center', justifyContent: 'center' }}>
            {/* Background gradient circle — animated */}
            <Animated.View style={[{
              position: 'absolute', width: HERO_SIZE, height: HERO_SIZE,
              alignItems: 'center', justifyContent: 'center',
            }, symbolStyle]}>
              <View style={{
                width: HERO_SIZE, height: HERO_SIZE, borderRadius: HERO_SIZE / 2,
                overflow: 'hidden', ...boxShadow(elemColors[0], { width: 0, height: 0 }, 1, 70),
              }}>
                <LinearGradient
                  colors={[elemColors[2] + '35', elemColors[1] + '20', elemColors[0] + '10']}
                  style={{ width: HERO_SIZE, height: HERO_SIZE }}
                  start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
                />
              </View>
            </Animated.View>
            {/* Border ring */}
            <Animated.View style={[{
              position: 'absolute', width: HERO_SIZE, height: HERO_SIZE,
              borderRadius: HERO_SIZE / 2, borderWidth: 2.5,
              borderColor: elemColors[1] + '45',
            }, symbolStyle]} />
            {/* Zodiac image — fade-in only */}
            <Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, heroImageStyle]}>
              {zodiacImage ? (
                <Image source={zodiacImage} resizeMode="contain" style={{
                  width: isSmallScreen ? 105 : 125, height: isSmallScreen ? 105 : 125,
                }} />
              ) : (
                <Text style={{
                  fontSize: 56, color: '#FFF1D0',
                  ...textShadow('rgba(0,0,0,0.5)', { width: 0, height: 2 }, 10),
                }}>{zodiacSymbol}</Text>
              )}
            </Animated.View>
          </View>

          {/* ── Lagna Name — staged reveal ── */}
          <Animated.View style={[{ alignItems: 'center', marginTop: 10 }, nameRevealStyle]}>
            <Text style={{
              fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.40)',
              letterSpacing: 4, textTransform: 'uppercase',
            }}>{T.revealYourLagna}</Text>
            <Text style={{
              fontSize: isSmallScreen ? 30 : 34, fontWeight: '900', color: elemColors[1],
              letterSpacing: 1.5, marginTop: 4,
              ...textShadow(elemColors[0] + '80', { width: 0, height: 0 }, 22),
            }}>{lagnaName}</Text>
            {lagnaSubname ? (
              <Text style={{
                fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.35)', marginTop: 2,
              }}>{lagnaSubname}</Text>
            ) : null}
          </Animated.View>
        </View>

        {/* ── THREE SIGN CARDS — cascade in individually ── */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          {[
            { emoji: ZODIAC_SYMBOLS[moonSign.name] || ZODIAC_SYMBOLS[moonSign.english] || '🌙', image: ZODIAC_IMAGE_MAP[moonSign.name] || ZODIAC_IMAGE_MAP[moonSign.english] || null, label: T.revealMoonSign, value: moonName, color: '#A78BFA', delay: 1200 },
            { emoji: '\u2B50', image: null, label: T.revealNakshatra, value: lang === 'si' ? (nakshatraSinhala || nakshatraName) : nakshatraName, color: '#FFB800', delay: 1400 },
            { emoji: ZODIAC_SYMBOLS[sunSign.name] || ZODIAC_SYMBOLS[sunSign.english] || '☀️', image: ZODIAC_IMAGE_MAP[sunSign.name] || ZODIAC_IMAGE_MAP[sunSign.english] || null, label: T.revealSunSign, value: sunName, color: '#FF6B9D', delay: 1600 },
          ].map(function (card, i) {
            return (
              <Animated.View key={i} entering={FadeInDown.delay(card.delay).duration(500).springify().damping(14)} style={{ flex: 1 }}>
                <View style={{
                  borderRadius: 14, overflow: 'hidden',
                  borderWidth: 1.5, borderColor: card.color + '20',
                  ...boxShadow(card.color, { width: 0, height: 4 }, 0.15, 12),
                }}>
                  <LinearGradient
                    colors={[card.color + '12', 'rgba(12,8,24,0.6)']}
                    style={{ paddingVertical: 14, alignItems: 'center' }}
                  >
                    {card.image ? (
                      <Image source={card.image} resizeMode="contain" style={{ width: 40, height: 40, marginBottom: 6 }} />
                    ) : (
                      <Text style={{ fontSize: 28, marginBottom: 6 }}>{card.emoji}</Text>
                    )}
                    <Text style={{
                      fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.35)',
                      letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3,
                    }}>{card.label}</Text>
                    <Text style={{
                      fontSize: 13, fontWeight: '800', color: card.color,
                      textAlign: 'center', paddingHorizontal: 4,
                    }} numberOfLines={1}>{card.value}</Text>
                  </LinearGradient>
                </View>
              </Animated.View>
            );
          })}
        </View>

        {/* ── TRAITS — glowing pills ── */}
        {traits.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(1800).duration(500)} style={{ marginTop: 12 }}>
            <Text style={{
              fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.30)',
              letterSpacing: 2.5, textTransform: 'uppercase', textAlign: 'center', marginBottom: 6,
            }}>{T.revealTraits}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {traits.slice(0, 4).map(function (trait, i) {
                return (
                  <Animated.View key={i} entering={FadeIn.delay(1900 + i * 120).duration(400)}>
                    <View style={{
                      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
                      borderWidth: 1, borderColor: 'rgba(255,184,0,0.18)',
                      backgroundColor: 'rgba(255,184,0,0.05)',
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFD666' }}>{trait}</Text>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>
        ) : null}

        {/* ── LUCKY DETAILS — elegant row ── */}
        {lagnaDetails.gem || lagnaDetails.luckyColor || lagnaDetails.luckyDay ? (
          <Animated.View entering={FadeInDown.delay(2100).duration(500)} style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
            {(function () {
              var cleanVal = function (v) {
                if (!v) return v;
                if (lang === 'si') return v;
                return v.replace(/\s*\([\u0D80-\u0DFF\s,]+\)/g, '').trim();
              };
              return [
                lagnaDetails.gem ? { emoji: '\uD83D\uDC8E', label: T.revealGem, value: cleanVal(lagnaDetails.gem) } : null,
                lagnaDetails.luckyColor ? { emoji: '\uD83C\uDFA8', label: T.revealColor, value: cleanVal(lagnaDetails.luckyColor) } : null,
                lagnaDetails.luckyDay ? { emoji: '\uD83D\uDCC5', label: T.revealDay, value: cleanVal(lagnaDetails.luckyDay) } : null,
              ].filter(Boolean).map(function (item, i) {
                return (
                  <View key={i} style={{
                    flex: 1, backgroundColor: 'rgba(255,255,255,0.025)', borderRadius: 10,
                    paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center',
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
                  }}>
                    <Text style={{ fontSize: 16, marginBottom: 2 }}>{item.emoji}</Text>
                    <Text style={{
                      fontSize: 7, fontWeight: '700', color: 'rgba(255,255,255,0.28)',
                      letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2, textAlign: 'center',
                    }}>{item.label}</Text>
                    <Text style={{
                      fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', textAlign: 'center',
                    }} numberOfLines={1}>{item.value}</Text>
                  </View>
                );
              });
            })()}
          </Animated.View>
        ) : null}

        {/* ── Spacer ── */}
        <View style={{ height: 16 }} />

        {/* ── PREMIUM NUDGE ── */}
        <Animated.View entering={FadeInUp.delay(2400).duration(600)}>
          <View style={{
            borderRadius: 14, overflow: 'hidden',
            borderWidth: 1.5, borderColor: 'rgba(255,60,60,0.18)', marginBottom: 8,
          }}>
            <LinearGradient
              colors={['rgba(255,60,60,0.05)', 'rgba(255,184,0,0.04)', 'rgba(12,8,24,0.95)']}
              style={{ paddingVertical: 12, paddingHorizontal: 14 }}
            >
              {/* Warning header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <View style={{
                  width: 26, height: 26, borderRadius: 13,
                  backgroundColor: 'rgba(255,60,60,0.10)',
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1, borderColor: 'rgba(255,60,60,0.20)',
                }}>
                  <Ionicons name="warning" size={13} color="#FF6B6B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#FF6B6B', letterSpacing: 0.3 }}>
                    {lang === 'si' ? '⚠️ මෙම කියවීම මකා දැමෙයි!' : '⚠️ THIS READING WILL BE DELETED!'}
                  </Text>
                  <Text style={{ fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.30)', marginTop: 2 }}>
                    {lang === 'si' ? 'ඔබේ ග්‍රහ විශ්ලේෂණයෙන් 90%ක් සැඟවිලා' : '90% of your destiny is still hidden'}
                  </Text>
                </View>
              </View>

              {/* Locked items 2x2 */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                {[
                  { emoji: '💍', label: lang === 'si' ? 'ආත්ම සහකරු එන කාලය' : 'Best Marriage Year', value: '20██', color: '#FF6B9D' },
                  { emoji: '💰', label: lang === 'si' ? 'ධනය ලැබෙන කාලය' : 'Wealth Peak Period', value: '████', color: '#34D399' },
                  { emoji: '💼', label: lang === 'si' ? 'දියුණුවන මාර්ගය' : 'Career Breakthrough', value: '████', color: '#60A5FA' },
                  { emoji: '⚠️', label: lang === 'si' ? 'ඊළඟ අවදානම් කාලය' : 'Next Danger Period', value: '██/██', color: '#FBBF24' },
                ].map(function (item, i) {
                  return (
                    <View key={i} style={{
                      flexDirection: 'row', alignItems: 'center', gap: 5,
                      width: '48%', paddingVertical: 5, paddingHorizontal: 7,
                      backgroundColor: 'rgba(0,0,0,0.20)', borderRadius: 8,
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
                    }}>
                      <Text style={{ fontSize: 13 }}>{item.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 8, fontWeight: '700', color: item.color }} numberOfLines={1}>{item.label}</Text>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.18)', letterSpacing: 1, marginTop: 1 }}>{item.value}</Text>
                      </View>
                      <Ionicons name="lock-closed" size={9} color="rgba(255,184,0,0.25)" />
                    </View>
                  );
                })}
              </View>
            </LinearGradient>
          </View>

          <PrimaryButton label={lang === 'si' ? '🔓 මගේ සම්පූර්ණ ඉරණම අගුළු අරින්න' : '🔓 Unlock My Complete Destiny Now'} onPress={onContinue} icon="sparkles" />
        </Animated.View>

        </ScrollView>
      </View>
    );
  }

  return (
    <View style={g.center}>
      <CosmicLoader size={56} color="#FFB800" />
    </View>
  );
}

var lr = StyleSheet.create({
  ring: { position: 'absolute', borderWidth: 1.5, borderStyle: 'dashed' },
});


// ═══════════════════════════════════════════════════════════════════════
//  STEP 5: COMPLETE
// ═══════════════════════════════════════════════════════════════════════

function CompleteStep({ lang, onDone }) {
  var T = OB[lang] || OB.en;
  var reduced = useReducedMotion();
  var scale = useSharedValue(0.7);
  var rotate = useSharedValue(0);
  var ringPulse = useSharedValue(0);
  var confetti1 = useSharedValue(0);
  var confetti2 = useSharedValue(0);
  var confetti3 = useSharedValue(0);

  useEffect(function () {
    scale.value = withSequence(
      withSpring(1.15, { damping: 8, stiffness: 180 }),
      withSpring(1, { damping: 12, stiffness: 120 })
    );
    if (!reduced) {
      rotate.value = withRepeat(withTiming(360, { duration: 12000, easing: Easing.linear }), -1, false);
      ringPulse.value = withRepeat(withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }), -1, true);
      confetti1.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.linear }), -1, false);
      confetti2.value = withDelay(500, withRepeat(withTiming(1, { duration: 3500, easing: Easing.linear }), -1, false));
      confetti3.value = withDelay(1000, withRepeat(withTiming(1, { duration: 2800, easing: Easing.linear }), -1, false));
    }

    // Auto-navigate to today page after a short celebration
    var timer = setTimeout(function () {
      if (onDone) onDone();
    }, 2500);
    return function () { clearTimeout(timer); };
  }, []);

  var starStyle = useAnimatedStyle(function () {
    return { transform: [{ scale: scale.value }, { rotate: rotate.value + 'deg' }] };
  });
  var ringStyle = useAnimatedStyle(function () {
    return {
      transform: [{ scale: interpolate(ringPulse.value, [0, 1], [1, 1.2]) }],
      opacity: interpolate(ringPulse.value, [0, 1], [0.5, 0.15]),
    };
  });
  var c1 = useAnimatedStyle(function () { return { transform: [{ translateY: interpolate(confetti1.value, [0, 1], [0, -180]) }, { translateX: interpolate(confetti1.value, [0, 0.5, 1], [0, 30, -10]) }], opacity: interpolate(confetti1.value, [0, 0.3, 1], [0, 1, 0]) }; });
  var c2 = useAnimatedStyle(function () { return { transform: [{ translateY: interpolate(confetti2.value, [0, 1], [0, -200]) }, { translateX: interpolate(confetti2.value, [0, 0.5, 1], [0, -40, 15]) }], opacity: interpolate(confetti2.value, [0, 0.3, 1], [0, 1, 0]) }; });
  var c3 = useAnimatedStyle(function () { return { transform: [{ translateY: interpolate(confetti3.value, [0, 1], [0, -160]) }, { translateX: interpolate(confetti3.value, [0, 0.5, 1], [0, 50, -20]) }], opacity: interpolate(confetti3.value, [0, 0.3, 1], [0, 1, 0]) }; });

  return (
    <View style={g.center}>
      <Animated.View entering={FadeInDown.duration(800)} style={{ alignItems: 'center' }}>
        <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
          {/* Pulsing rings */}
          <Animated.View style={[{ position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: '#FFB800' }, ringStyle]} />
          <Animated.View style={[{ position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 1.5, borderColor: '#FF8C00' }, ringStyle]} />
          {/* Confetti particles */}
          <Animated.Text style={[{ position: 'absolute', fontSize: 14 }, c1]}>{'\u2728'}</Animated.Text>
          <Animated.Text style={[{ position: 'absolute', fontSize: 12 }, c2]}>{'\uD83C\uDF1F'}</Animated.Text>
          <Animated.Text style={[{ position: 'absolute', fontSize: 10 }, c3]}>{'\u2B50'}</Animated.Text>
          {/* Main star */}
          <Animated.Text style={[{ fontSize: 56 }, starStyle]}>{'\uD83C\uDF1F'}</Animated.Text>
        </View>

        <Text style={[g.headerTitle, { fontSize: 28, marginTop: 16, color: '#FFB800', ...textShadow('rgba(255,184,0,0.5)', { width: 0, height: 0 }, 16) }]}>{T.completeTitle}</Text>
        <Text style={[g.headerSub, { color: '#FFD666' }]}>{T.completeSubtitle}</Text>

        <View style={{ marginTop: 32, alignItems: 'center' }}>
          <CosmicLoader size={56} color="#FFB800" text={T.completeLoading} textColor="#FFD666" />
        </View>
      </Animated.View>
    </View>
  );
}


// ═══════════════════════════════════════════════════════════════════════
//  MAIN ONBOARDING SCREEN
// ═══════════════════════════════════════════════════════════════════════

export default function OnboardingScreen({ onComplete, isReturningUser }) {
  // If returning user (logged out and back), skip directly to Google Sign-In
  var [step, setStep] = useState(isReturningUser ? 3 : -1);
  var { language: ctxLang, switchLanguage } = useLanguage();
  var { colors, resolved } = useTheme();
  var { completeOnboarding } = useAuth();
  var [lang, setLang] = useState(ctxLang || 'si');
  var [birthData, setBirthData] = useState(null);
  var [displayName, setDisplayName] = useState('');
  var insets = useSafeAreaInsets();

  var [transitioning, setTransitioning] = useState(false);
  var sceneBlack = useSharedValue(0);

  // Cinematic step change — fade to black, switch, fade in
  var cinematicSetStep = function (nextStep) {
    if (transitioning) return;
    setTransitioning(true);
    sceneBlack.value = withTiming(1, { duration: 350, easing: Easing.inOut(Easing.cubic) });
    setTimeout(function () {
      setStep(nextStep);
      sceneBlack.value = withDelay(100, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
      setTimeout(function () { setTransitioning(false); }, 600);
    }, 400);
  };

  var handleLanguageSelect = function (selectedLang) {
    setLang(selectedLang);
    switchLanguage(selectedLang);
    cinematicSetStep(0);
  };

  // NEW FLOW: Birth data → Lagna Reveal (no auth needed) → Sign-In → Subscription
  var handleBirthDataComplete = function (name, data) {
    setDisplayName(name);
    setBirthData(data);
    cinematicSetStep(2); // → Lagna Reveal
  };

  // After Lagna reveal teaser → Google Sign-In ("save your chart")
  var handleLagnaRevealDone = function () {
    cinematicSetStep(3); // → Google Sign-In
  };

  // After Google Sign-In → subscription paywall (at emotional peak)
  var handleGoogleSignInDone = function () {
    if (isReturningUser) {
      if (onComplete) onComplete();
      return;
    }
    cinematicSetStep(4); // → Subscription
  };

  // After subscription → complete onboarding and go to app
  var handleSubscriptionDone = async function () {
    try {
      await completeOnboarding(displayName, birthData, lang);
    } catch (e) {
      if (__DEV__) console.warn('completeOnboarding failed:', e);
    }
    cinematicSetStep(5); // → Complete
  };

  var TOTAL_MAIN_STEPS = 6;

  // ═══════════════════════════════════════════════════════════════
  // REFLOW: Value-First Psychology-Driven Onboarding
  //
  // Step -1: Language Selection
  // Step 0:  Welcome (curiosity hook)
  // Step 1:  Birth Data (commitment — user invests 2-3 min)
  // Step 2:  Lagna Reveal TEASER (dopamine peak — optionalAuth, works pre-login)
  // Step 3:  Google Sign-In ("save your chart data" — emotional investment)
  // Step 4:  Subscription (paywall at emotional peak, loss aversion)
  // Step 5:  Complete
  // ═══════════════════════════════════════════════════════════════
  var renderStep = function () {
    switch (step) {
      case -1: return <LanguageStep onSelect={handleLanguageSelect} />;
      case 0: return <WelcomeStep onContinue={function () { cinematicSetStep(1); }} onBack={function () { cinematicSetStep(-1); }} lang={lang} />;
      case 1: return <BirthDataStep onComplete={handleBirthDataComplete} lang={lang} />;
      case 2: return <LagnaRevealStep birthData={birthData} displayName={displayName} onContinue={handleLagnaRevealDone} lang={lang} />;
      case 3: return <GoogleSignInStep onContinue={handleGoogleSignInDone} onBack={isReturningUser ? null : function () { cinematicSetStep(2); }} lang={lang} isReturningUser={isReturningUser} />;
      case 4: return <SubscriptionStep onContinue={handleSubscriptionDone} lang={lang} displayName={displayName} birthData={birthData} />;
      case 5: return <CompleteStep lang={lang} onDone={onComplete} />;
      default: return <LanguageStep onSelect={handleLanguageSelect} />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={colors.statusBarStyle} translucent backgroundColor="transparent" />

      {/* ── Persistent Cinematic Starfield ── */}
      <CinematicStarfield />

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: 'transparent', overflow: 'hidden' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={{ flex: 1, paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 12) }}>
          {step >= 0 && !isReturningUser ? (
            <Animated.View entering={FadeIn.duration(300)} style={{ paddingHorizontal: 24, paddingTop: 4 }}>
              <StepProgressBar current={step} total={TOTAL_MAIN_STEPS} lang={lang} />
            </Animated.View>
          ) : null}
          <SceneTransition sceneKey={step}>
            {renderStep()}
          </SceneTransition>
        </View>
      </KeyboardAvoidingView>

      {/* ── Cinematic Vignette Overlay ── */}


      {/* ── Fade-to-Black Transition Curtain ── */}
      <SceneBlackCurtain opacity={sceneBlack} />
    </View>
  );
}


// ═══════════════════════════════════════════════════════════════════════
//  GLOBAL STYLES
// ═══════════════════════════════════════════════════════════════════════

var g = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20 },
  stepWrap: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20 },
  progressWrap: { marginBottom: 8 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '600', textAlign: 'center', marginTop: 6, letterSpacing: 0.5 },
  headerWrap: { alignItems: 'center', marginBottom: 4 },
  headerIconBg: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,184,0,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFF1D0', textAlign: 'center', lineHeight: 30 },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  card: { backgroundColor: 'rgba(15,10,30,0.55)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  inputLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700', marginBottom: 8, letterSpacing: 1.2, textTransform: 'uppercase' },
  textInput: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 15 : 13, color: '#FFF1D0', fontSize: 16, fontWeight: '500', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  primaryBtn: { borderRadius: 16, overflow: 'hidden', ...boxShadow('#FF8C00', { width: 0, height: 4 }, 1, 20) },
  primaryGrad: { paddingVertical: 14, minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingHorizontal: 16 },
  primaryText: { fontSize: 16, fontWeight: '800', color: '#FFF1D0', letterSpacing: 0.8, textAlign: 'center', flexShrink: 1, ...textShadow('rgba(0,0,0,0.3)', { width: 0, height: 1 }, 4) },
  ghostBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  ghostText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '500' },
  error: { color: '#FF6B6B', fontSize: 12, marginTop: 8, textAlign: 'center', fontWeight: '500' },
  hint: { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 12, lineHeight: 17 },
});
