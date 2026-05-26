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
import { APP_LOGO_IMAGE } from '../assets/logo-inline';

var { width: SW, height: SH } = Dimensions.get('window');
var LOGO = APP_LOGO_IMAGE;


// ═══════════════════════════════════════════════════════════════════════
//  CINEMATIC COMPONENTS — Movie-quality onboarding experience
// ═══════════════════════════════════════════════════════════════════════

// ── Animated Starfield Background (matching website WebGL starfield) ──
// Persistent parallax starfield behind ALL onboarding steps
// Multiple layers with realistic brightness distribution, color temperatures, and flicker

var STAR_LAYERS = [];
(function () {
  // Layer 1: distant dim stars (many, small, slow flicker) — like website's depth=0-0.3
  var layer1 = [];
  for (var i = 0; i < 45; i++) {
    var colorTemp = ((i * 3137) % 100) / 100;
    var color = colorTemp < 0.33 ? 'rgba(180,200,255,' :
                colorTemp < 0.66 ? 'rgba(255,255,255,' :
                'rgba(255,220,150,';
    layer1.push({
      x: ((i * 7919 + 3571) % 1000) / 10,
      y: ((i * 6271 + 1433) % 1000) / 10,
      size: 0.8 + ((i * 3137) % 100) / 200,
      opacity: 0.4 + ((i * 4219) % 100) / 250,
      twinkleSpeed: 2500 + ((i * 2399) % 5000),
      twinkleDelay: ((i * 1847) % 4000),
      color: color,
    });
  }
  // Layer 2: mid-range stars — depth 0.3-0.7
  var layer2 = [];
  for (var i = 0; i < 20; i++) {
    var colorTemp = ((i * 2741) % 100) / 100;
    var color = colorTemp < 0.33 ? 'rgba(180,200,255,' :
                colorTemp < 0.66 ? 'rgba(255,255,255,' :
                'rgba(255,220,150,';
    layer2.push({
      x: ((i * 5431 + 2917) % 1000) / 10,
      y: ((i * 8513 + 4219) % 1000) / 10,
      size: 1.0 + ((i * 2741) % 100) / 120,
      opacity: 0.55 + ((i * 3719) % 100) / 300,
      twinkleSpeed: 1800 + ((i * 1913) % 3500),
      twinkleDelay: ((i * 2371) % 3000),
      color: color,
    });
  }
  // Layer 3: close bright stars (few, larger, faster scintillation) — depth 0.7-1.0
  var layer3 = [];
  for (var i = 0; i < 8; i++) {
    var colorTemp = ((i * 1847) % 100) / 100;
    var color = colorTemp < 0.4 ? 'rgba(200,220,255,' :
                colorTemp < 0.7 ? 'rgba(255,255,240,' :
                'rgba(255,210,130,';
    layer3.push({
      x: ((i * 9721 + 1571) % 1000) / 10,
      y: ((i * 4517 + 7919) % 1000) / 10,
      size: 1.5 + ((i * 1847) % 100) / 100,
      opacity: 0.7 + ((i * 6197) % 100) / 400,
      twinkleSpeed: 1200 + ((i * 3571) % 2500),
      twinkleDelay: ((i * 997) % 2000),
      color: color,
    });
  }
  STAR_LAYERS.push(layer1, layer2, layer3);
})();

function TwinklingStar({ star, layerSpeed, reduced }) {
  var twinkle = useSharedValue(0.5);
  useEffect(function () {
    if (reduced) {
      twinkle.value = 0.7;
      return;
    }
    twinkle.value = withDelay(star.twinkleDelay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: star.twinkleSpeed * 0.4, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: star.twinkleSpeed * 0.6, easing: Easing.inOut(Easing.sin) })
        ), -1, true
      )
    );
  }, [reduced]);
  var style = useAnimatedStyle(function () {
    var o = interpolate(twinkle.value, [0, 0.3, 1], [star.opacity * 0.5, star.opacity * 0.7, star.opacity]);
    var s = interpolate(twinkle.value, [0, 1], [0.8, 1.15]);
    return { opacity: o, transform: [{ scale: s }] };
  });

  // Spike length proportional to star size (brighter = longer spikes)
  var spikeLen = star.size * 1.2;
  var coreSize = star.size * 0.4;
  var glowSize = star.size * 1.1;
  var baseColor = (star.color || 'rgba(255,248,225,');

  return (
    <Animated.View style={[{
      position: 'absolute',
      left: star.x + '%',
      top: star.y + '%',
      width: spikeLen * 2,
      height: spikeLen * 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: -spikeLen,
      marginTop: -spikeLen,
    }, style]}>
      {/* Soft glow halo */}
      <View style={{
        position: 'absolute',
        width: glowSize,
        height: glowSize,
        borderRadius: glowSize / 2,
        backgroundColor: baseColor + '0.15)',
      }} />
      {/* Horizontal spike */}
      <View style={{
        position: 'absolute',
        width: spikeLen * 2,
        height: 1,
        borderRadius: 0.5,
        backgroundColor: baseColor + '0.4)',
      }} />
      {/* Vertical spike */}
      <View style={{
        position: 'absolute',
        width: 1,
        height: spikeLen * 2,
        borderRadius: 0.5,
        backgroundColor: baseColor + '0.4)',
      }} />
      {/* Diagonal spike (45°) — only for brighter stars */}
      {star.opacity > 0.5 ? (
        <>
          <View style={{
            position: 'absolute',
            width: spikeLen * 1.4,
            height: 0.5,
            borderRadius: 0.25,
            backgroundColor: baseColor + '0.2)',
            transform: [{ rotate: '45deg' }],
          }} />
          <View style={{
            position: 'absolute',
            width: spikeLen * 1.4,
            height: 0.5,
            borderRadius: 0.25,
            backgroundColor: baseColor + '0.2)',
            transform: [{ rotate: '-45deg' }],
          }} />
        </>
      ) : null}
      {/* Bright core */}
      <View style={{
        width: coreSize,
        height: coreSize,
        borderRadius: coreSize / 2,
        backgroundColor: baseColor + '1)',
      }} />
    </Animated.View>
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
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }]} pointerEvents="none">
      {/* Nebula clouds — warm amber/indigo palette */}
      <Animated.View style={[{ position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,140,0,0.05)', top: -50, right: -80 }, nebula1]} />
      <Animated.View style={[{ position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(147,51,234,0.04)', bottom: SH * 0.2, left: -60 }, nebula2]} />
      <Animated.View style={[{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,184,0,0.03)', top: SH * 0.4, right: -40 }, nebula1]} />
      <Animated.View style={[{ position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(99,102,241,0.03)', top: SH * 0.15, left: -30 }, nebula2]} />
      {/* Star layers — all 3 depths for rich sky (matching website starfield) */}
      {STAR_LAYERS[0].map(function (s, i) { return <TwinklingStar key={'s1_' + i} star={s} layerSpeed={0.3} reduced={reduced} />; })}
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
    welcomeSubtitle: "Step inside your private celestial observatory",
    welcomeDesc: "Your birth sky is a quiet map of timing, temperament, and direction.",
    welcomeBtn: "Begin My Reading",
    welcomeHint: "A personal reading begins with one exact sky",
    nasaBadge: "NASA JPL planetary data · precise astronomical calculations",
    googleTitle: "Save Your Celestial Map",
    googleSubtitle: "Sign in to securely save your birth chart & get personalized daily predictions",
    googleBtn: "Continue with Google",
    googleFail: "Sign in failed. Please try again.",
    subTitle: "Your Full Reading Is Ready to Open",
    subSubtitle: "Continue into the deeper houses, timings, remedies, and personal forecasts.",
    subFeature1: "Weekly guidance shaped by your rising sign",
    subFeature2: "Complete birth chart with house-by-house meaning",
    subFeature3: "Compatibility readings with clear relationship insight",
    subFeature4: "AI guidance for questions about timing and direction",
    subFeature5: "Supportive alerts for sensitive planetary periods",
    subFeature6: "Private readings saved only for you",
    subPerDay: "/day",
    subNote: "Billed via Google Play / App Store",
    subNetworks: "Google Play \u2022 App Store \u2022 All cards accepted",
    subBtn: "Open Full Reading",
    subPayFail: "Payment failed. Please try again or use a different card.",
    subFailed: "Subscription failed",
    nameTitle: "Name the Chart Keeper",
    nameSubtitle: "Your reading begins with the name that will hold this sky",
    nameLabel: "YOUR NAME",
    namePlaceholder: "Enter your name",
    nameError: "Please enter your name (min 2 chars)",
    dateTitle: "Set the Birth Date",
    dateSubtitle: "The day your first sky opened above the earth",
    yearLabel: "YEAR",
    yearPlaceholder: "1995",
    monthLabel: "MONTH",
    dayLabel: "DAY",
    dayPlaceholder: "15",
    dateError: "Please enter a valid birth date",
    yearError: "Enter a valid year (1900\u20132026)",
    monthError: "Please select a month",
    dayError: "Enter a valid day for this month",
    dateHint: "This anchors your planetary positions and sign sequence",
    timeTitle: "Set the Birth Moment",
    timeSubtitle: "A precise time brings your rising sign into focus",
    hourLabel: "HOUR",
    minuteLabel: "MINUTE",
    timeError: "Enter a valid time (hour 1\u201312, minute 0\u201359)",
    timeHint: "Exact time = precise birth chart.\nIf unknown, skip \u2014 we'll use 12:00 PM.",
    placeTitle: "Set the Birth Place",
    placeSubtitle: "The horizon of your birthplace completes the chart",
    placeSearch: "Search any city...",
    placeHint: "Different location = different planetary angles.\nThis makes your chart uniquely yours.",
    cityError: "Please select your birth city",
    subProgressName: "Name",
    subProgressDate: "Date",
    subProgressTime: "Time",
    subProgressPlace: "Place",
    back: "Back",
    continueBtn: "Continue the Reading",
    completeSetup: "Create My Chart",
    skipBirth: "Skip \u2014 add later in Profile",
    saveFailed: "Failed to save. Please try again.",
    completeTitle: "Your Observatory Is Ready",
    completeSubtitle: "Your personal sky has been prepared",
    completeLoading: "Opening your star map...",
    // Lagna Reveal
    revealLoading: "Aligning your birth sky...",
    revealLoadingSub: "Mapping the planets to your exact horizon",
    revealYourLagna: "Your Rising Sign",
    revealMoonSign: "Moon Sign",
    revealSunSign: "Sun Sign",
    revealNakshatra: "Birth Star",
    revealTraits: "Your Rising Pattern",
    revealLagnaTraits: "Rising Sign Traits",
    revealMoonTraits: "Moon Traits",
    revealGem: "Guiding Stone",
    revealColor: "Guiding Color",
    revealDay: "Supportive Day",
    revealCareer: "Natural Direction",
    revealContinue: "Open My Complete Reading",
    revealSkip: "Skip to Dashboard",
    months: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  },
  si: {
    welcomeSubtitle: "ඔයාගේ පෞද්ගලික තාරකා නිරීක්ෂණාගාරයට පිවිසෙන්න",
    welcomeDesc: "ඔයා උපන් මොහොතේ අහස, ජීවිතයේ රටාව සහ දිශාව නිහඬව සටහන් කර ඇත.",
    welcomeBtn: "මගේ කියවීම ආරම්භ කරන්න",
    welcomeHint: "එක් නිවැරදි උපන් අහසකින් පෞද්ගලික කියවීම ආරම්භ වේ",
    nasaBadge: "NASA JPL ග්‍රහ දත්ත · නිවැරදි තාරකා ගණනය කිරීම්",
    googleTitle: "ඔයාගේ තාරකා සිතියම සුරකින්න",
    googleSubtitle: "ඔයාගේ ග්‍රහ සටහන සහ දිනපතා පලාපල දැනගන්න ගිණුමක් හදන්න",
    googleBtn: "Google හරහා පිවිසෙන්න",
    googleFail: "\u0db4\u0dd2\u0dc0\u0dd2\u0dc3\u0dd3\u0db8 \u0d85\u0dc3\u0dcf\u0dbb\u0dca\u0dae\u0d9a\u0dba\u0dd2. \u0d9a\u0dbb\u0dd4\u0dab\u0dcf\u0d9a\u0dbb \u0db1\u0dd0\u0dc0\u0dad \u0d8b\u0dad\u0dca\u0dc3\u0dcf\u0dc4 \u0d9a\u0dbb\u0db1\u0dca\u0db1.",
    subTitle: "ඔයාගේ සම්පූර්ණ කියවීම විවෘත කිරීමට සූදානම්",
    subSubtitle: "ගැඹුරු භාව, කාල රටා, උපදෙස් සහ පෞද්ගලික පලාපල වෙත ඉදිරියට යන්න.",
    subFeature1: "ඔයාගේ ලග්නයට ගැලපෙන සතිපතා මඟපෙන්වීම",
    subFeature2: "භාවයෙන් භාවයට පැහැදිලි කළ සම්පූර්ණ කේන්දරය",
    subFeature3: "සම්බන්ධතා ගැන පැහැදිලි පොරොන්දම් කියවීම",
    subFeature4: "කාලය සහ දිශාව ගැන AI මඟපෙන්වීම",
    subFeature5: "සංවේදී ග්‍රහ කාල සඳහා සහය දෙන මතක් කිරීම්",
    subFeature6: "ඔයාට පමණක් සුරැකෙන පෞද්ගලික කියවීම්",
    subPerDay: "/\u0daf\u0dc0\u0dc3\u0da7",
    subNote: "Google Play / App Store \u0d94\u0dc3\u0dca\u0dc3\u0dda \u0d9c\u0dd9\u0dc0\u0db1\u0dca\u0db1 \u26A1",
    subNetworks: "Google Play \u2022 App Store \u2022 \u0dc3\u0dd2\u0dba\u0dbd\u0dd4\u0db8 \u0d9a\u0dcf\u0da9\u0dca\u0db4\u0dad\u0dca",
    subBtn: "සම්පූර්ණ කියවීම විවෘත කරන්න",
    subPayFail: "\u0d9c\u0dd9\u0dc0\u0dd3\u0db8 \u0d85\u0dc3\u0dcf\u0dbb\u0dca\u0dae\u0d9a\u0dba\u0dd2. \u0d86\u0dba\u0dd2 \u0db6\u0dbd\u0db1\u0dca\u0db1.",
    subFailed: "\u0d87\u0d9a\u0dca\u0da7\u0dd2\u0dc0\u0dca \u0dc0\u0dd4\u0db1\u0dda \u0db1\u0dd1",
    nameTitle: "කේන්දරයේ නම සටහන් කරන්න",
    nameSubtitle: "මේ උපන් අහස තබාගන්නා නමෙන් කියවීම ආරම්භ වේ",
    nameLabel: "නම",
    namePlaceholder: "ඔයාගේ නම ලියන්න",
    nameError: "නම දාලා ඉන්නකෝ",
    dateTitle: "උපන් දිනය සටහන් කරන්න",
    dateSubtitle: "ඔයාගේ පළමු අහස විවෘත වූ දිනය",
    yearLabel: "\u0d85\u0dc0\u0dd4\u0dbb\u0dd4\u0daf\u0dca\u0daf",
    yearPlaceholder: "1995",
    monthLabel: "\u0db8\u0dcf\u0dc3\u0dba",
    dayLabel: "\u0daf\u0dd2\u0db1\u0dba",
    dayPlaceholder: "15",
    dateError: "උපදින දිනය හරියට දාන්න",
    yearError: "වලංගු අවුරුද්දක් ඇතුළත් කරන්න (1900\u20132026)",
    monthError: "කරුණාකර මාසයක් තෝරන්න",
    dayError: "මේ මාසයට වලංගු දිනයක් ඇතුළත් කරන්න",
    dateHint: "මෙය ඔයාගේ ග්‍රහ පිහිටීම් සහ රාශි රටාව සවි කරයි",
    timeTitle: "උපන් මොහොත සටහන් කරන්න",
    timeSubtitle: "නිවැරදි වේලාවකින් ඔයාගේ ලග්නය පැහැදිලි වේ",
    hourLabel: "\u0db4\u0dd0\u0dba",
    minuteLabel: "\u0db8\u0dd2\u0db1\u0dd2\u0dad\u0dca\u0dad\u0dd4",
    timeError: "වලංගු වේලාවක් ඇතුළත් කරන්න (පැය 1\u201312, මිනි. 0\u201359)",
    timeHint: "නිවැරදි වේලාව = නිරවද්‍ය කේන්දරය.\nදන්නේ නැත්නම් මඟ හරින්න.",
    placeTitle: "උපන් ස්ථානය සටහන් කරන්න",
    placeSubtitle: "ඔයා උපන් තැන හොරයිසනය කේන්දරය සම්පූර්ණ කරයි",
    placeSearch: "නගරය සොයන්න...",
    placeHint: "වෙනස් ස්ථානයක් = වෙනස් ග්‍රහ කෝණ.\nමෙය ඔයාගේ කේන්දරය අද්විතීය කරයි.",
    cityError: "කරුණාකර ඔයාගේ උපන් නගරය තෝරන්න",
    subProgressName: "නම",
    subProgressDate: "දිනය",
    subProgressTime: "වේලාව",
    subProgressPlace: "ස්ථානය",
    back: "පසුපසට",
    continueBtn: "කියවීම ඉදිරියට ගන්න",
    completeSetup: "මගේ කේන්දරය සකස් කරන්න",
    skipBirth: "පසුව Profile එකෙන් දාන්නම්",
    saveFailed: "සේව් වුනේ නැත. ආයි බලන්න.",
    completeTitle: "ඔයාගේ නිරීක්ෂණාගාරය සූදානම්",
    completeSubtitle: "ඔයාගේ පෞද්ගලික උපන් අහස සකස් කර ඇත",
    completeLoading: "ඔයාගේ තරු සිතියම විවෘත කරමින්...",
    // Lagna Reveal
    revealLoading: "ඔයාගේ උපන් අහස සකසමින්...",
    revealLoadingSub: "ඔයාගේ නිවැරදි හොරයිසනයට ග්‍රහ පිහිටීම් සකසමින්",
    revealYourLagna: "ඔයාගේ ලග්නය",
    revealMoonSign: "චන්ද්‍ර රාශිය",
    revealSunSign: "සූර්ය රාශිය",
    revealNakshatra: "උපන් නැකත",
    revealTraits: "ඔයාගේ ලග්න රටාව",
    revealLagnaTraits: "ලග්න ලක්ෂණ",
    revealMoonTraits: "චන්ද්‍ර ලක්ෂණ",
    revealGem: "මඟපෙන්වන මැණික",
    revealColor: "මඟපෙන්වන වර්ණය",
    revealDay: "සහය දෙන දිනය",
    revealCareer: "ස්වභාවික දිශාව",
    revealContinue: "මගේ සම්පූර්ණ කියවීම විවෘත කරන්න",
    revealSkip: "මගහැර ඉදිරියට යන්න",
    months: ["\u0da2\u0db1","\u0db4\u0dd9\u0db6","\u0db8\u0dcf\u0dbb\u0dca","\u0d85\u0db4\u0dca\u200d","\u0db8\u0dd0","\u0da2\u0dd6","\u0da2\u0dd6\u0dbd\u0dd2","\u0d85\u0d9c\u0ddd","\u0dc3\u0dd0\u0db4\u0dca","\u0d94\u0d9a\u0dca","\u0db1\u0ddc","\u0daf\u0dd9"],
  },
};


// ═══════════════════════════════════════════════════════════════════════
//  SHARED UI ATOMS — with micro-animations + vibrant gradients
// ═══════════════════════════════════════════════════════════════════════


/* Primary action button — polished observatory gold */
function PrimaryButton({ label, onPress, loading, disabled, icon }) {
  var isOff = disabled || loading;

  return (
    <Animated.View style={g.primaryBtn}>
      <SpringPressable
        onPress={onPress} disabled={isOff} haptic="heavy" scalePressed={0.96}
        style={{ borderRadius: 16, overflow: 'hidden', opacity: isOff ? 0.4 : 1 }}
      >
        <LinearGradient
          colors={isOff ? ['#2A261F', '#3A3328'] : ['#FFF0B8', '#D9A441', '#8A5A17']}
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
              <CosmicLoader size={26} color="#2A1707" />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} key="content" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {icon ? <Ionicons name={icon} size={18} color="#2A1707" /> : null}
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

function RitualNote({ icon, color, children, style }) {
  var noteColor = color || '#D9A441';
  return (
    <View style={[g.ritualNote, style]}>
      <View style={[g.ritualNoteIcon, { borderColor: noteColor + '44', backgroundColor: noteColor + '12' }]}>
        <Ionicons name={icon || 'sparkles-outline'} size={13} color={noteColor} />
      </View>
      <Text style={g.ritualNoteText}>{children}</Text>
    </View>
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
          <Ionicons name={icon} size={21} color={iconColor || '#FFB800'} />
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
var STEP_LABELS_SI = ['සාදරයෙන්', 'උපන් දත්ත', 'ඔයාගේ තරු', 'සුරකින්න', 'ප්‍රිමියම්', 'සම්පූර්ණ'];

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
//  STEP -1: LANGUAGE SELECTION — Premium editorial, minimal & focused
//  Logo → app name → language buttons. No clutter, no broken overlays.
// ═══════════════════════════════════════════════════════════════════════

function LanguageStep({ onSelect }) {
  var reduced = useReducedMotion();
  var logoGlow = useSharedValue(0);
  var btnShimmer = useSharedValue(0);
  var [selectedLang, setSelectedLang] = useState(null);

  useEffect(function () {
    if (reduced) return;
    logoGlow.value = withRepeat(withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }), -1, true);
    btnShimmer.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduced]);

  var logoStyle = useAnimatedStyle(function () {
    return {
      opacity: interpolate(logoGlow.value, [0, 1], [0.9, 1]),
      transform: [{ scale: interpolate(logoGlow.value, [0, 1], [1, 1.04]) }],
    };
  });
  var shimmerStyle = useAnimatedStyle(function () {
    return { opacity: interpolate(btnShimmer.value, [0, 0.5, 1], [0.6, 1, 0.6]) };
  });

  var handleSelect = function (lang) {
    setSelectedLang(lang);
    setTimeout(function () { onSelect(lang); }, 200);
  };

  var logoSize = 72;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, paddingVertical: 24 }} showsVerticalScrollIndicator={false} bounces={false}>

        {/* ═══ HERO: Logo + App Name ═══ */}
        <Animated.View entering={FadeInDown.duration(900)} style={{ alignItems: 'center', marginBottom: 32 }}>
          {/* Logo with gold ring */}
          <Animated.View style={[{ width: logoSize + 20, height: logoSize + 20, borderRadius: (logoSize + 20) / 2, borderWidth: 2, borderColor: 'rgba(255,184,0,0.35)', alignItems: 'center', justifyContent: 'center', marginBottom: 20, ...boxShadow('rgba(255,184,0,0.3)', { width: 0, height: 0 }, 0.5, 20) }, logoStyle]}>
            <LinearGradient
              colors={['rgba(255,184,0,0.15)', 'rgba(255,140,0,0.08)', 'rgba(13,11,46,0.9)']}
              style={{ width: logoSize + 8, height: logoSize + 8, borderRadius: (logoSize + 8) / 2, alignItems: 'center', justifyContent: 'center' }}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Image source={LOGO} style={{ width: logoSize, height: logoSize, borderRadius: logoSize / 2 }} resizeMode="contain" />
            </LinearGradient>
          </Animated.View>

          {/* App name */}
          <Text style={ls.mainTitleEn}>Grahachara</Text>
          <Text style={ls.mainTitleSi}>{'\u0D9C\u0DCA\u200D\u0DBB\u0DC4\u0DA0\u0DCF\u0DBB'}</Text>
          <Text style={ls.tagline}>Vedic Astrology & Horoscope</Text>
        </Animated.View>

        {/* ═══ LANGUAGE PROMPT ═══ */}
        <Animated.View entering={FadeIn.delay(400).duration(500)} style={ls.promptWrap}>
          <View style={ls.promptDividerLeft}>
            <LinearGradient colors={['transparent', 'rgba(255,184,0,0.3)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
          </View>
          <Text style={ls.promptText}>Select Language  {'\u2022'}  {'\u0DB7\u0DCF\u0DC2\u0DCF\u0DC0 \u0DAD\u0DDD\u0DBB\u0DB1\u0DCA\u0DB1'}</Text>
          <View style={ls.promptDividerRight}>
            <LinearGradient colors={['rgba(255,184,0,0.3)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
          </View>
        </Animated.View>

        {/* ═══ LANGUAGE BUTTONS ═══ */}
        <Animated.View entering={FadeInUp.delay(300).duration(700)} style={{ width: '100%', gap: 14, marginTop: 24 }}>

          {/* English */}
          <SpringPressable
            style={[ls.langCard, selectedLang === 'en' && ls.langCardSelectedEn]}
            onPress={function () { handleSelect('en'); }}
            haptic="medium"
            scalePressed={0.96}
          >
            <LinearGradient
              colors={selectedLang === 'en' ? ['#6366F1', '#4338CA'] : ['rgba(99,102,241,0.10)', 'rgba(99,102,241,0.03)']}
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

          {/* Sinhala */}
          <SpringPressable
            style={[ls.langCard, selectedLang === 'si' && ls.langCardSelectedSi]}
            onPress={function () { handleSelect('si'); }}
            haptic="medium"
            scalePressed={0.96}
          >
            <LinearGradient
              colors={selectedLang === 'si' ? ['#FF8C00', '#E65100'] : ['rgba(255,140,0,0.10)', 'rgba(255,140,0,0.03)']}
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

        {/* ═══ FOOTER ═══ */}
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
  // Titles
  mainTitleEn: { fontSize: 32, fontWeight: '900', color: '#FFB800', letterSpacing: 1.2, ...textShadow('rgba(255,184,0,0.5)', { width: 0, height: 0 }, 16), textAlign: 'center' },
  mainTitleSi: { fontSize: 15, fontWeight: '600', color: 'rgba(255,220,140,0.4)', letterSpacing: 2, marginTop: 4, textAlign: 'center' },
  tagline:     { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.35)', marginTop: 8, textAlign: 'center', letterSpacing: 0.5 },

  // Bilingual prompt
  promptWrap:         { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 4 },
  promptDividerLeft:  { flex: 1, height: 1, overflow: 'hidden' },
  promptDividerRight: { flex: 1, height: 1, overflow: 'hidden' },
  promptText:         { fontSize: 13, fontWeight: '600', color: 'rgba(255,220,140,0.6)', paddingHorizontal: 12 },

  // Language cards
  langCard:           { borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)' },
  langCardSelectedEn: { borderColor: 'rgba(99,102,241,0.5)', ...boxShadow('rgba(99,102,241,0.35)', { width: 0, height: 4 }, 0.8, 20) },
  langCardSelectedSi: { borderColor: 'rgba(255,140,0,0.5)', ...boxShadow('rgba(255,140,0,0.3)', { width: 0, height: 4 }, 0.8, 20) },
  langCardGrad:       { paddingVertical: 22, paddingHorizontal: 20, borderRadius: 20 },
  langCardRow:        { flexDirection: 'row', alignItems: 'center', gap: 14 },

  // Icon circle
  langIconCircle:         { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  langIconCircleActiveEn: { backgroundColor: 'rgba(99,102,241,0.25)', borderColor: 'rgba(165,180,252,0.4)' },
  langIconCircleActiveSi: { backgroundColor: 'rgba(255,140,0,0.2)', borderColor: 'rgba(255,184,0,0.4)' },

  // Text
  langPrimary:       { fontSize: 22, fontWeight: '800', color: '#FFF1D0' },
  langPrimaryActive: { color: '#FFFFFF' },
  langSecondary:       { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  langSecondaryActive: { color: 'rgba(255,255,255,0.7)' },

  // Arrow circle
  arrowCircle:         { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  arrowCircleActiveEn: { backgroundColor: 'rgba(99,102,241,0.4)', borderColor: 'rgba(165,180,252,0.5)' },
  arrowCircleActiveSi: { backgroundColor: 'rgba(255,140,0,0.4)', borderColor: 'rgba(255,184,0,0.5)' },

  // Footer
  footer:        { marginTop: 32, alignItems: 'center' },
  footerDivider: { width: 140, height: 1, borderRadius: 1, overflow: 'hidden', marginBottom: 12 },
  trustRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustItem:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trustText:     { fontSize: 11, color: 'rgba(255,255,255,0.40)', fontWeight: '500' },
  trustDot:      { fontSize: 8, color: 'rgba(255,255,255,0.25)' },
});


// ═══════════════════════════════════════════════════════════════════════
//  STEP 0: WELCOME — Luxury editorial feel, immersive & cinematic
//  Full-screen atmosphere → short impactful copy → glass feature cards → CTA
// ═══════════════════════════════════════════════════════════════════════

function WelcomeStep({ onContinue, onBack, lang }) {
  var T = OB[lang] || OB.en;
  var reduced = useReducedMotion();
  var ctaGlow = useSharedValue(0);
  var heroFloat = useSharedValue(0);
  var glowPulse = useSharedValue(0);

  useEffect(function () {
    if (reduced) return;
    ctaGlow.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true);
    heroFloat.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }), -1, true);
    glowPulse.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduced]);

  var ctaGlowStyle = useAnimatedStyle(function () {
    if (Platform.OS === 'web') return {};
    return {
      shadowColor: '#FFB800',
      shadowOpacity: interpolate(ctaGlow.value, [0, 1], [0.3, 0.7]),
      shadowRadius: interpolate(ctaGlow.value, [0, 1], [8, 20]),
      shadowOffset: { width: 0, height: 4 },
    };
  });

  var floatStyle = useAnimatedStyle(function () {
    return { transform: [{ translateY: interpolate(heroFloat.value, [0, 1], [-3, 3]) }] };
  });

  var glowStyle = useAnimatedStyle(function () {
    return {
      opacity: interpolate(glowPulse.value, [0, 1], [0.4, 0.8]),
      transform: [{ scale: interpolate(glowPulse.value, [0, 1], [0.95, 1.05]) }],
    };
  });

  // Feature items — healing & life transformation (premium icons)
  var FEATURES = lang === 'si' ? [
    { icon: 'compass', color: '#FFB800', title: 'ඔබේ දවස ජයගන්න', desc: 'සෑම උදෑසනකම ඔබව සවිබල ගන්වන පුද්ගලික මගපෙන්වීම්' },
    { icon: 'water', color: '#A78BFA', title: 'සිතට මනසට සැනසිල්ල', desc: 'ඕනෑම අභියෝගයකදී නිවැරදි තීරණ ගැනීමට අවශ්‍ය පැහැදිලි බව' },
    { icon: 'trending-up', color: '#4ADE80', title: 'ජීවිතය අර්ථවත් කරගන්න', desc: 'විශ්වීය ශක්තීන් හඳුනාගෙන ඔබේ අනාගතය සාර්ථකව සැලසුම් කරන්න' },
    { icon: 'time', color: '#60A5FA', title: 'රාත්‍රී මාර්ගෝපදේශ', desc: 'සෑම රාත්‍රියකම සුබ අසුබ කාල හඳුනාගන්න' },
  ] : [
    { icon: 'compass', color: '#FFB800', title: 'Plan Your Day', desc: 'Know what\'s good and what to avoid each morning' },
    { icon: 'water', color: '#A78BFA', title: 'Feel Calm & Clear', desc: 'Stop worrying — see what the stars say about your path' },
    { icon: 'trending-up', color: '#4ADE80', title: 'Live a Better Life', desc: 'Simple daily tips based on your birth chart' },
    { icon: 'time', color: '#60A5FA', title: 'Good & Bad Times', desc: 'Know the best times to start anything important' },
  ];

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: 0, paddingTop: 0, paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >

      {/* ═══ HERO SECTION — full-width atmospheric ═══ */}
      <View style={{ alignItems: 'center', paddingTop: 16, paddingBottom: 20 }}>
        {/* Ambient glow behind hero */}
        <Animated.View style={[{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,184,0,0.08)', top: 20 }, glowStyle]} />
        <Animated.View style={[{ position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(147,51,234,0.06)', top: 60, left: 40 }, glowStyle]} />

        {/* 3 Featured zodiac images in a premium row */}
        <Animated.View entering={FadeInDown.duration(900)} style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 24 }, floatStyle]}>
          <View style={ws.zodiacShowcase}>
            <Image source={ZODIAC_IMAGES[4]} style={ws.zodiacShowcaseImg} resizeMode="contain" />
          </View>
          <View style={[ws.zodiacShowcase, ws.zodiacShowcaseCenter]}>
            <Image source={ZODIAC_IMAGES[0]} style={ws.zodiacShowcaseImgLg} resizeMode="contain" />
          </View>
          <View style={ws.zodiacShowcase}>
            <Image source={ZODIAC_IMAGES[7]} style={ws.zodiacShowcaseImg} resizeMode="contain" />
          </View>
        </Animated.View>

        {/* Headline — emotional, healing-focused */}
        <Animated.View entering={FadeInUp.delay(200).duration(700)} style={{ alignItems: 'center', paddingHorizontal: 28 }}>
          <Text style={ws.heroTitle}>
            {lang === 'si' ? 'යහපත් හෙට දවසකට\nඅදම මුලපුරන්න' : 'Your Stars,\nYour Guide'}
          </Text>
          <Text style={ws.heroDesc}>
            {lang === 'si'
              ? 'විශ්වීය තරු රටා අතරින් ඔබේ ජීවිතයේ සැඟවුණු රහස් හඳුනාගෙන, සෑම දිනකම සතුටින් සහ විශ්වාසයෙන් යුතුව සැලසුම් කරන්න.'
              : 'Get simple daily advice based on your birth time. Know what days are good, what to watch out for, and how to make better choices.'}
          </Text>
        </Animated.View>
      </View>

      {/* ═══ FEATURE CARDS — glass morphism ═══ */}
      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        {FEATURES.map(function (f, i) {
          return (
            <Animated.View key={i} entering={FadeInUp.delay(400 + i * 100).duration(500)}>
              <View style={ws.featureCard}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                />
                <View style={[ws.featureCardIcon, { backgroundColor: f.color + '18', borderColor: f.color + '35' }]}>
                  <Ionicons name={f.icon} size={20} color={f.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ws.featureCardTitle}>{f.title}</Text>
                  <Text style={ws.featureCardDesc}>{f.desc}</Text>
                </View>
              </View>
            </Animated.View>
          );
        })}
      </View>

      {/* ═══ CTA SECTION ═══ */}
      <Animated.View entering={FadeInUp.delay(800).duration(600)} style={{ paddingHorizontal: 24, marginTop: 20 }}>
        {/* Trust signal */}
        <View style={ws.precisionBadge}>
          <Ionicons name="rocket-outline" size={14} color="rgba(255,184,0,0.9)" />
          <Text style={ws.precisionText}>{lang === 'si' ? 'NASA JPL ග්‍රහ දත්ත · නිවැරදි ගණනය' : 'NASA JPL planetary data · precision calculations'}</Text>
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
  // Hero
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#FFB800', textAlign: 'center', lineHeight: 36, letterSpacing: 0.3, ...textShadow('rgba(255,184,0,0.3)', { width: 0, height: 2 }, 8) },
  heroDesc: { fontSize: 14, fontWeight: '500', color: 'rgba(255,220,180,0.6)', textAlign: 'center', marginTop: 10, lineHeight: 21, paddingHorizontal: 12 },

  // Zodiac showcase row
  zodiacShowcase: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,184,0,0.06)', borderWidth: 1.5, borderColor: 'rgba(255,184,0,0.15)', alignItems: 'center', justifyContent: 'center' },
  zodiacShowcaseCenter: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: 'rgba(255,184,0,0.3)', backgroundColor: 'rgba(255,184,0,0.08)', ...boxShadow('rgba(255,184,0,0.25)', { width: 0, height: 0 }, 0.6, 16) },
  zodiacShowcaseImg: { width: 38, height: 38, borderRadius: 19 },
  zodiacShowcaseImgLg: { width: 50, height: 50, borderRadius: 25 },

  // Feature cards
  featureCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  featureCardIcon: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  featureCardTitle: { fontSize: 15, fontWeight: '700', color: '#FFD666', letterSpacing: 0.2 },
  featureCardDesc: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.45)', marginTop: 2, lineHeight: 16 },

  // Precision badge
  precisionBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,184,0,0.06)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,184,0,0.12)' },
  precisionText: { color: 'rgba(255,220,180,0.65)', fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 15 },
});


// ═══════════════════════════════════════════════════════════════════════
//  STEP 1: GOOGLE SIGN-IN — Immersive, atmospheric, luxury
//  Full sensory experience: depth layers, zodiac imagery, emotional copy
// ═══════════════════════════════════════════════════════════════════════

function GoogleSignInStep({ onContinue, onBack, lang, isReturningUser }) {
  var T = OB[lang] || OB.en;
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState('');
  var { signInWithGoogle } = useAuth();
  var reduced = useReducedMotion();

  // Animations
  var ringRotate = useSharedValue(0);
  var innerRingRotate = useSharedValue(0);
  var heroScale = useSharedValue(0.85);
  var heroOpacity = useSharedValue(0);
  var glowBreath = useSharedValue(0);
  var btnPulse = useSharedValue(0);
  var particleFloat = useSharedValue(0);

  var title = isReturningUser
    ? (lang === 'si' ? 'නැවත සාදරයෙන්' : 'Welcome Back')
    : T.googleTitle;
  var subtitle = isReturningUser
    ? (lang === 'si' ? 'ඔයාගේ ග්‍රහ සටහන සහ පලාපල බලන්න පිවිසෙන්න' : 'Sign in to access your birth chart & daily predictions')
    : T.googleSubtitle;

  useEffect(function () {
    // Hero entrance
    heroScale.value = withSpring(1, { damping: 15, stiffness: 100 });
    heroOpacity.value = withTiming(1, { duration: 800 });

    if (reduced) return;
    ringRotate.value = withRepeat(withTiming(360, { duration: 30000, easing: Easing.linear }), -1, false);
    innerRingRotate.value = withRepeat(withTiming(-360, { duration: 20000, easing: Easing.linear }), -1, false);
    glowBreath.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, true);
    btnPulse.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
    particleFloat.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduced]);

  var ringStyle = useAnimatedStyle(function () {
    return { transform: [{ rotate: ringRotate.value + 'deg' }] };
  });
  var innerRingStyle = useAnimatedStyle(function () {
    return { transform: [{ rotate: innerRingRotate.value + 'deg' }] };
  });
  var heroEntranceStyle = useAnimatedStyle(function () {
    return { transform: [{ scale: heroScale.value }], opacity: heroOpacity.value };
  });
  var glowStyle = useAnimatedStyle(function () {
    return {
      opacity: interpolate(glowBreath.value, [0, 1], [0.15, 0.4]),
      transform: [{ scale: interpolate(glowBreath.value, [0, 1], [0.9, 1.1]) }],
    };
  });
  var btnGlowStyle = useAnimatedStyle(function () {
    if (Platform.OS === 'web') return {};
    return {
      shadowColor: '#FFFFFF',
      shadowOpacity: interpolate(btnPulse.value, [0, 1], [0.15, 0.35]),
      shadowRadius: interpolate(btnPulse.value, [0, 1], [6, 16]),
      shadowOffset: { width: 0, height: 4 },
    };
  });
  var particle1Style = useAnimatedStyle(function () {
    return { transform: [{ translateY: interpolate(particleFloat.value, [0, 1], [-8, 8]) }, { translateX: interpolate(particleFloat.value, [0, 1], [3, -3]) }] };
  });
  var particle2Style = useAnimatedStyle(function () {
    return { transform: [{ translateY: interpolate(particleFloat.value, [0, 1], [5, -5]) }, { translateX: interpolate(particleFloat.value, [0, 1], [-4, 4]) }] };
  });

  var handleSignIn = async function () {
    setLoading(true); setError('');
    try {
      var result = await signInWithGoogle();
      if (result && result.cancelled) {
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

  // Zodiac ring positions (6 images, semi-circle above logo)
  var RING_SIGNS = [0, 2, 4, 7, 9, 11]; // Aries, Gemini, Leo, Scorpio, Sag, Pisces
  var ringRadius = 85;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: 0, paddingTop: 0, paddingBottom: 20 }} showsVerticalScrollIndicator={false} bounces={false}>

      {/* ═══ IMMERSIVE HERO — Zodiac constellation + Logo ═══ */}
      <Animated.View style={[{ alignItems: 'center', paddingTop: 20, paddingBottom: 10 }, heroEntranceStyle]}>

        {/* Ambient glow layers */}
        <Animated.View style={[{ position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(147,51,234,0.08)', top: 0 }, glowStyle]} />
        <Animated.View style={[{ position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,184,0,0.06)', top: 20 }, glowStyle]} />

        {/* Outer zodiac ring — slowly rotating */}
        <View style={{ width: 220, height: 220, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[{ position: 'absolute', width: 220, height: 220, alignItems: 'center', justifyContent: 'center' }, ringStyle]}>
            {RING_SIGNS.map(function (signIdx, i) {
              var angle = (2 * Math.PI / 6) * i - Math.PI / 2;
              var x = Math.cos(angle) * ringRadius;
              var y = Math.sin(angle) * ringRadius;
              return (
                <View key={i} style={{ position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,184,0,0.06)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.18)', alignItems: 'center', justifyContent: 'center', transform: [{ translateX: x }, { translateY: y }] }}>
                  <Image source={ZODIAC_IMAGES[signIdx]} style={{ width: 24, height: 24, borderRadius: 12 }} resizeMode="contain" />
                </View>
              );
            })}
          </Animated.View>

          {/* Inner decorative ring — counter-rotating */}
          <Animated.View style={[{ position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 1, borderColor: 'rgba(167,139,250,0.12)', borderStyle: 'dashed' }, innerRingStyle]} />

          {/* Central logo orb */}
          <View style={gs.centralOrb}>
            <LinearGradient
              colors={['rgba(147,51,234,0.12)', 'rgba(255,184,0,0.08)', 'rgba(13,11,46,0.9)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
            <Image source={LOGO} style={{ width: 52, height: 52 }} resizeMode="contain" />
          </View>
        </View>

        {/* Floating particles */}
        <Animated.View style={[{ position: 'absolute', top: 30, left: 50 }, particle1Style]}>
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,184,0,0.5)' }} />
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', top: 80, right: 40 }, particle2Style]}>
          <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(167,139,250,0.5)' }} />
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', bottom: 40, left: 70 }, particle2Style]}>
          <View style={{ width: 2.5, height: 2.5, borderRadius: 1.25, backgroundColor: 'rgba(52,211,153,0.4)' }} />
        </Animated.View>
      </Animated.View>

      {/* ═══ HEADLINE — Impactful, emotional ═══ */}
      <Animated.View entering={FadeInUp.delay(300).duration(700)} style={{ alignItems: 'center', paddingHorizontal: 28 }}>
        <Text style={gs.heroTitle}>{title}</Text>
        <Text style={gs.heroSub}>{subtitle}</Text>
      </Animated.View>

      {/* ═══ VALUE PROPOSITION — Glass cards ═══ */}
      <View style={{ paddingHorizontal: 20, gap: 8, marginTop: 16 }}>
        {(isReturningUser ? (lang === 'si' ? [
          { icon: 'reload-outline', color: '#A78BFA', title: 'ඔබේ සටහන ලබා ගන්න', desc: 'කේන්දරය සහ පලාපල ආයෙත්' },
          { icon: 'sync-outline', color: '#34D399', title: 'සියලුම උපාංග', desc: 'ඕනෑම තැනකින් ප්‍රවේශ වන්න' },
        ] : [
          { icon: 'reload-outline', color: '#A78BFA', title: 'Restore Your Chart', desc: 'Birth chart & predictions await' },
          { icon: 'sync-outline', color: '#34D399', title: 'All Devices', desc: 'Access from anywhere securely' },
        ]) : (lang === 'si' ? [
          { icon: 'star-outline', color: '#FFB800', title: 'පෞද්ගලික සටහන', desc: 'ඔබේ උපන් ග්‍රහ සටහන සුරකින්න' },
          { icon: 'sparkles-outline', color: '#A78BFA', title: 'AI මඟපෙන්වීම', desc: 'පෞද්ගලික ජ්‍යොතිෂ උපදෙස්' },
        ] : [
          { icon: 'star-outline', color: '#FFB800', title: 'Personal Chart', desc: 'Save your unique birth sky forever' },
          { icon: 'sparkles-outline', color: '#A78BFA', title: 'AI Guidance', desc: 'Personalized astrological insights' },
        ])).map(function (card, i) {
          return (
            <Animated.View key={i} entering={FadeInUp.delay(500 + i * 100).duration(450)}>
              <View style={gs.valueCard}>
                <LinearGradient colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <View style={[gs.valueCardIcon, { backgroundColor: card.color + '14', borderColor: card.color + '30' }]}>
                  <Ionicons name={card.icon} size={18} color={card.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={gs.valueCardTitle}>{card.title}</Text>
                  <Text style={gs.valueCardDesc}>{card.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.15)" />
              </View>
            </Animated.View>
          );
        })}
      </View>

      {/* ═══ CTA SECTION ═══ */}
      <Animated.View entering={FadeInUp.delay(750).duration(500)} style={{ paddingHorizontal: 24, marginTop: 20 }}>

        {error ? (
          <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOut.duration(200)} style={gs.errorWrap}>
            <Ionicons name="alert-circle" size={15} color="#FF6B6B" />
            <Text style={gs.errorText}>{error}</Text>
          </Animated.View>
        ) : null}

        {/* ── Premium Google Sign-In Button ── */}
        <Animated.View style={btnGlowStyle}>
          <SpringPressable
            onPress={handleSignIn}
            disabled={loading}
            haptic="heavy"
            scalePressed={0.97}
            style={{ borderRadius: 18, overflow: 'hidden', opacity: loading ? 0.5 : 1 }}
          >
            <View style={gs.googleBtn}>
              <LinearGradient
                colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)']}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', borderTopLeftRadius: 18, borderTopRightRadius: 18 }}
              />
              {loading ? (
                <CosmicLoader size={22} color="#FFF" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  {/* Google logo — 4 color dots */}
                  <View style={gs.googleLogoWrap}>
                    <View style={[gs.gDot, { backgroundColor: '#4285F4', top: 0, left: 4 }]} />
                    <View style={[gs.gDot, { backgroundColor: '#EA4335', top: 0, right: 4 }]} />
                    <View style={[gs.gDot, { backgroundColor: '#FBBC05', bottom: 0, left: 4 }]} />
                    <View style={[gs.gDot, { backgroundColor: '#34A853', bottom: 0, right: 4 }]} />
                    <Text style={gs.googleG}>G</Text>
                  </View>
                  <Text style={gs.googleBtnLabel}>{T.googleBtn}</Text>
                  <View style={gs.btnArrow}>
                    <Ionicons name="arrow-forward" size={15} color="rgba(255,255,255,0.8)" />
                  </View>
                </View>
              )}
            </View>
          </SpringPressable>
        </Animated.View>

        {/* ── Trust signals ── */}
        <View style={gs.trustRow}>
          <View style={gs.trustItem}>
            <Ionicons name="shield-checkmark" size={13} color="#34D399" />
            <Text style={gs.trustText}>{lang === 'si' ? 'Google තහවුරු කළා' : 'Google Verified'}</Text>
          </View>
          <View style={gs.trustDot} />
          <View style={gs.trustItem}>
            <Ionicons name="lock-closed" size={12} color="#A78BFA" />
            <Text style={gs.trustText}>{lang === 'si' ? 'සංකේතනය කළ' : 'Encrypted'}</Text>
          </View>
          <View style={gs.trustDot} />
          <View style={gs.trustItem}>
            <Ionicons name="eye-off" size={12} color="#FFB800" />
            <Text style={gs.trustText}>{lang === 'si' ? 'පෞද්ගලික' : 'Private'}</Text>
          </View>
        </View>

        {onBack ? <GhostButton label={T.back || 'Back'} onPress={onBack} /> : null}
      </Animated.View>

    </ScrollView>
  );
}

var gs = StyleSheet.create({
  /* Central orb */
  centralOrb: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,184,0,0.2)', overflow: 'hidden', ...boxShadow('rgba(147,51,234,0.3)', { width: 0, height: 0 }, 0.6, 24) },

  /* Hero text */
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#FFB800', textAlign: 'center', letterSpacing: 0.3, lineHeight: 34, ...textShadow('rgba(255,184,0,0.4)', { width: 0, height: 2 }, 10) },
  heroSub: { fontSize: 14, fontWeight: '500', color: 'rgba(255,220,180,0.55)', textAlign: 'center', marginTop: 10, lineHeight: 21, paddingHorizontal: 8 },

  /* Value cards */
  valueCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  valueCardIcon: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  valueCardTitle: { fontSize: 14, fontWeight: '700', color: '#FFF1D0', letterSpacing: 0.2 },
  valueCardDesc: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.4)', marginTop: 2, lineHeight: 16 },

  /* Error */
  errorWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.20)', width: '100%' },
  errorText: { color: '#FCA5A5', fontSize: 12, fontWeight: '600', flex: 1 },

  /* Google button — dark premium glass */
  googleBtn: { backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 17, paddingHorizontal: 22, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)' },
  googleLogoWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', position: 'relative', ...boxShadow('rgba(0,0,0,0.2)', { width: 0, height: 1 }, 0.8, 4) },
  gDot: { position: 'absolute', width: 4, height: 4, borderRadius: 2 },
  googleG: { fontSize: 14, fontWeight: '900', color: '#4285F4' },
  googleBtnLabel: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3, flex: 1 },
  btnArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },

  /* Trust */
  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, marginBottom: 10 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trustDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.15)' },
  trustText: { fontSize: 11, color: 'rgba(255,220,180,0.4)', fontWeight: '600' },
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
  var [agreementError, setAgreementError] = useState('');
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

  var agreementMessage = lang === 'si'
    ? 'කරුණාකර නියමයන් සහ කොන්දේසි පිළිගෙන ඉදිරියට යන්න.'
    : 'Please accept the Terms & Conditions to continue.';

  var toggleAgreement = function () {
    var nextAgreed = !agreed;
    setAgreed(nextAgreed);
    if (nextAgreed) setAgreementError('');
  };

  var ensureAgreement = function () {
    if (agreed) return true;
    setPayError('');
    setAgreementError(agreementMessage);
    return false;
  };

  var handleSub = async function () {
    if (!ensureAgreement()) return;
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
    if (!ensureAgreement()) return;
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
  var checkboxBorderColor = agreed ? '#FF8C00' : agreementError ? '#FCA5A5' : 'rgba(255,255,255,0.3)';
  var checkboxBgColor = agreed ? '#FF8C00' : agreementError ? 'rgba(127,29,29,0.18)' : 'rgba(0,0,0,0.2)';

  // ── Compact, scrollable paywall ───────────────────────────────
  // Removed (caused overlap on real devices):
  //  • Countdown timer banner
  //  • Live-users counter
  //  • Locked-previews 4-tile grid
  //  • Rotating testimonial
  // Kept: headline → price → 4 features → terms → CTA → footer.
  var headline = displayName
    ? (lang === 'si' ? displayName + ', ඔයාගේ සම්පූර්ණ ග්‍රහ සටහන විවෘත කරන්න' : displayName + ', open your full chart')
    : (lang === 'si' ? 'ඔයාගේ සම්පූර්ණ ග්‍රහ සටහන විවෘත කරන්න' : 'Open your full chart');

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
        <TouchableOpacity onPress={toggleAgreement} activeOpacity={0.7} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
          <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: checkboxBorderColor, backgroundColor: checkboxBgColor, alignItems: 'center', justifyContent: 'center' }}>
            {agreed ? <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)}><Ionicons name="checkmark" size={16} color="#FFF" /></Animated.View> : null}
          </View>
        </TouchableOpacity>
        <Text
          style={{ color: agreementError ? '#FECACA' : 'rgba(255,255,255,0.75)', fontSize: 12, lineHeight: 18, flexShrink: 1 }}
          onPress={toggleAgreement}
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
      {agreementError ? (
        <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut.duration(150)} style={ss.agreementErrorWrap}>
          <Ionicons name="alert-circle-outline" size={14} color="#FCA5A5" />
          <Text style={ss.agreementErrorText}>{agreementError}</Text>
        </Animated.View>
      ) : null}

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
          label={lang === 'si' ? 'සම්පූර්ණ ග්‍රහ සටහන විවෘත කරන්න' : 'Open Full Chart'}
          onPress={handleSub}
          loading={loading}
          icon="sparkles"
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
  agreementErrorWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: -4, marginBottom: 10, backgroundColor: 'rgba(127,29,29,0.14)', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(248,113,113,0.22)' },
  agreementErrorText: { color: '#FCA5A5', fontSize: 12.5, lineHeight: 17, fontWeight: '700', flex: 1 },
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
    var nameTeaser = lang === 'si' ? 'නම සටහන් කළ මොහොතේ, මේ කේන්දරය ඔයාගේ පෞද්ගලික තාරකා ගොනුවක් වේ.' : 'Once your name is set, this chart becomes your private celestial record.';
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
              maxLength={25}
            />
            {error && page === 0 ? <Animated.Text entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={g.error}>{error}</Animated.Text> : null}
          </GlowCard>
          <RitualNote icon="finger-print-outline" color="#C4B5FD">{nameTeaser}</RitualNote>
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
    var dateTeaser = lang === 'si' ? 'මෙම දිනයෙන් ග්‍රහ මණ්ඩලයේ මුල් පිහිටීම සවි කරයි.' : 'This date fixes the first position of your planetary pattern.';
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
          <RitualNote icon="calendar-clear-outline" color="#FFD666">{dateTeaser}</RitualNote>

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
    var timeTeaser = lang === 'si' ? 'මෙම වේලාවෙන් නැගෙනහිර හොරයිසනය සහ ලග්නය පැහැදිලි වේ.' : 'This moment clarifies the eastern horizon and your rising sign.';
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
          <RitualNote icon="time-outline" color="#67E8F9" style={{ marginTop: 10 }}>{T.timeHint}</RitualNote>
          <RitualNote icon="moon-outline" color="#67E8F9" style={{ marginTop: 8 }}>{timeTeaser}</RitualNote>

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
    var placeTeaser = lang === 'si' ? 'අවසාන සලකුණෙන් උපන් අහසේ හොරයිසනය සම්පූර්ණ වේ.' : 'The final mark completes the horizon of your birth sky.';
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
          <RitualNote icon="earth-outline" color="#6EE7B7" style={{ marginTop: 8 }}>{T.placeHint}</RitualNote>
          <RitualNote icon="navigate-circle-outline" color="#6EE7B7" style={{ marginTop: 8 }}>{placeTeaser}</RitualNote>

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
  var symbolScale = useSharedValue(0.82);
  var symbolRotate = useSharedValue(-10);
  var detailsOpacity = useSharedValue(0);
  var heroImageOpacity = useSharedValue(1);
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
      symbolScale.value = 0.82;
      symbolRotate.value = -10;
      heroImageOpacity.value = 1;
      bigBang.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 1000, easing: Easing.out(Easing.cubic) })
      );
      symbolScale.value = withSequence(
        withDelay(80, withSpring(1.08, { damping: 8, stiffness: 150 })),
        withSpring(1, { damping: 12, stiffness: 110 })
      );
      symbolRotate.value = withDelay(80, withSpring(0, { damping: 14, stiffness: 70 }));
      heroImageOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
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
  var mainChakraStyle = useAnimatedStyle(function () {
    if (reduced) {
      return { transform: [{ rotate: '0deg' }, { scale: 1 }] };
    }
    return {
      transform: [
        { rotate: (orbRotate.value * 0.12) + 'deg' },
        { scale: interpolate(orbGlow.value, [0, 1], [0.988, 1.012]) },
      ],
    };
  });
  var mainChakraGlowStyle = useAnimatedStyle(function () {
    return {
      opacity: reduced ? 0.58 : interpolate(orbGlow.value, [0, 1], [0.42, 0.74]),
      transform: [{ scale: reduced ? 1 : interpolate(orbGlow.value, [0, 1], [0.95, 1.04]) }],
    };
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
          <AwesomeRashiChakra size={Math.min(SW * 0.95, 380)} showSolarOrbit={false} />
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
    var zodiacSymbol = ZODIAC_SYMBOLS[lagna.name] || ZODIAC_SYMBOLS[lagna.english] || null;
    var zodiacImage = ZODIAC_IMAGE_MAP[lagna.name] || ZODIAC_IMAGE_MAP[lagna.english] || (lagna.rashiId ? ZODIAC_IMAGES[lagna.rashiId - 1] : null);
    var lagnaName = lang === 'si' ? (lagna.sinhala || lagna.english) : (lagna.english || lagna.name);
    var lagnaSubname = lang === 'si' ? (lagnaDetails.english || lagna.english) : '';
    var moonName = lang === 'si' ? (moonSign.sinhala || moonSign.english) : (moonSign.english || moonSign.name);
    var sunName = lang === 'si' ? (sunSign.sinhala || sunSign.english) : (sunSign.english || sunSign.name);
    var nakshatraName = nakshatra.name || '';
    var nakshatraSinhala = nakshatra.sinhala || '';
    var traits = lang === 'si' ? (lagnaDetails.traitsSi || lagnaDetails.traits || []) : (lagnaDetails.traits || []);

    var isSmallScreen = resp.isSmall;
    var HERO_SIZE = isSmallScreen ? 154 : 184;
    var focusChakraSize = Math.min(SW * 0.86, isSmallScreen ? 286 : 336);
    var lagnaIndex = lagna.rashiId ? lagna.rashiId - 1 : 0;
    var heroZodiacImage = zodiacImage || ZODIAC_IMAGES[lagnaIndex] || null;

    return (
      <View style={lr.revealRoot}>
        <LinearGradient
          colors={['#020106', '#08050D', '#15101E', '#050308']}
          locations={[0, 0.34, 0.72, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Big Bang flash overlay */}
        <Animated.View style={[{
          position: 'absolute', top: -100, left: -100, right: -100, bottom: -100,
          backgroundColor: '#F4E4BC', zIndex: 100, pointerEvents: 'none',
        }, bigBangStyle]} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[lr.revealScroll, { paddingTop: isSmallScreen ? 22 : 38 }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >

        <Animated.View style={[lr.revealHeader, nameRevealStyle]}>
          <Text style={lr.revealKicker}>{lang === 'si' ? 'උපන් අහසේ මුද්‍රාව' : 'BIRTH SKY SEAL'}</Text>
          <Text style={lr.revealWelcome} numberOfLines={1}>{displayName || (lang === 'si' ? 'ඔබේ කියවීම' : 'Your reading')}</Text>
        </Animated.View>

        <View style={lr.heroStage}>
          <View style={[lr.heroChakraStage, { width: focusChakraSize, height: focusChakraSize }]}>
            <Animated.View style={[lr.heroChakraGlow, {
              width: focusChakraSize * 0.88,
              height: focusChakraSize * 0.88,
              borderRadius: (focusChakraSize * 0.88) / 2,
            }, mainChakraGlowStyle]} />
            <Animated.View style={[lr.heroChakraSpin, mainChakraStyle]}>
              <AwesomeRashiChakra size={focusChakraSize} activeSignIndex={lagnaIndex} variant="astrolabe" showSolarOrbit={false} />
            </Animated.View>
            <Animated.View style={[lr.heroSeal, {
              position: 'absolute',
              top: (focusChakraSize - HERO_SIZE) / 2,
              left: (focusChakraSize - HERO_SIZE) / 2,
              width: HERO_SIZE,
              height: HERO_SIZE,
              borderRadius: HERO_SIZE / 2,
            }, symbolStyle]}>
              <LinearGradient
                colors={['rgba(255,244,215,0.18)', 'rgba(214,181,109,0.11)', 'rgba(123,73,207,0.10)', 'rgba(0,0,0,0.18)']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }}
              />
              <View style={[lr.heroSealRing, { borderRadius: HERO_SIZE / 2 }]} />
              <View style={[lr.heroImagePlate, { width: HERO_SIZE * 0.74, height: HERO_SIZE * 0.74, borderRadius: HERO_SIZE * 0.37 }]}>
                <LinearGradient
                  colors={['rgba(255,248,231,0.34)', 'rgba(255,214,102,0.16)', 'rgba(48,24,64,0.10)']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0.18, y: 0 }} end={{ x: 0.82, y: 1 }}
                />
              </View>
              <Animated.View style={[lr.heroImage, heroImageStyle]}>
                {heroZodiacImage ? (
                  <Image source={heroZodiacImage} resizeMode="contain" style={[lr.heroZodiacImage, {
                    width: isSmallScreen ? 122 : 146, height: isSmallScreen ? 122 : 146,
                  }]} />
                ) : (
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    {zodiacSymbol ? (
                      <Text style={{
                        fontSize: 56, color: '#FFF1D0',
                        ...textShadow('rgba(0,0,0,0.5)', { width: 0, height: 2 }, 10),
                      }}>{zodiacSymbol}</Text>
                    ) : (
                      <Ionicons name="planet-outline" size={52} color="#FFF1D0" />
                    )}
                  </View>
                )}
              </Animated.View>
            </Animated.View>
          </View>

          <Animated.View style={[lr.lagnaTitleBlock, nameRevealStyle]}>
            <Text style={lr.lagnaEyebrow}>{T.revealYourLagna}</Text>
            <Text style={[lr.lagnaTitle, isSmallScreen && lr.lagnaTitleSmall]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{lagnaName}</Text>
            {lagnaSubname ? (
              <Text style={lr.lagnaSubtitle}>{lagnaSubname}</Text>
            ) : null}
          </Animated.View>
        </View>

        <View style={lr.signGrid}>
          {[
            { icon: 'moon-outline', image: ZODIAC_IMAGE_MAP[moonSign.name] || ZODIAC_IMAGE_MAP[moonSign.english] || null, label: T.revealMoonSign, value: moonName, color: '#A78BFA', delay: 1200 },
            { icon: 'sparkles-outline', image: null, label: T.revealNakshatra, value: lang === 'si' ? (nakshatraSinhala || nakshatraName) : nakshatraName, color: '#FFB800', delay: 1400 },
            { icon: 'sunny-outline', image: ZODIAC_IMAGE_MAP[sunSign.name] || ZODIAC_IMAGE_MAP[sunSign.english] || null, label: T.revealSunSign, value: sunName, color: '#FF6B9D', delay: 1600 },
          ].map(function (card, i) {
            return (
              <Animated.View key={i} entering={FadeInDown.delay(card.delay).duration(500).springify().damping(14)} style={{ flex: 1 }}>
                <View style={[lr.signCard, { borderColor: card.color + '24' }]}>
                  <LinearGradient
                    colors={[card.color + '10', 'rgba(255,244,215,0.035)', 'rgba(5,3,9,0.82)']}
                    style={StyleSheet.absoluteFill}
                  >
                  </LinearGradient>
                  {card.image ? (
                    <Image source={card.image} resizeMode="contain" style={lr.signImage} />
                  ) : (
                    <View style={[lr.signIcon, { backgroundColor: card.color + '14', borderColor: card.color + '30' }]}>
                      <Ionicons name={card.icon} size={18} color={card.color} />
                    </View>
                  )}
                  <Text style={lr.signLabel}>{card.label}</Text>
                  <Text style={[lr.signValue, { color: card.color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{card.value}</Text>
                </View>
              </Animated.View>
            );
          })}
        </View>

        {/* ── TRAITS — glowing pills ── */}
        {traits.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(1800).duration(500)} style={lr.traitPanel}>
            <Text style={lr.panelKicker}>{T.revealTraits}</Text>
            <View style={lr.traitWrap}>
              {traits.slice(0, 4).map(function (trait, i) {
                return (
                  <Animated.View key={i} entering={FadeIn.delay(1900 + i * 120).duration(400)}>
                    <View style={lr.traitChip}>
                      <Text style={lr.traitText}>{trait}</Text>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>
        ) : null}

        {/* ── LUCKY DETAILS — elegant row ── */}
        {lagnaDetails.gem || lagnaDetails.luckyColor || lagnaDetails.luckyDay ? (
          <Animated.View entering={FadeInDown.delay(2100).duration(500)} style={lr.luckyRow}>
            {(function () {
              var cleanVal = function (v) {
                if (!v) return v;
                if (lang === 'si') return v;
                return v.replace(/\s*\([\u0D80-\u0DFF\s,]+\)/g, '').trim();
              };
              return [
                lagnaDetails.gem ? { icon: 'diamond-outline', label: T.revealGem, value: cleanVal(lagnaDetails.gem) } : null,
                lagnaDetails.luckyColor ? { icon: 'color-palette-outline', label: T.revealColor, value: cleanVal(lagnaDetails.luckyColor) } : null,
                lagnaDetails.luckyDay ? { icon: 'calendar-clear-outline', label: T.revealDay, value: cleanVal(lagnaDetails.luckyDay) } : null,
              ].filter(Boolean).map(function (item, i) {
                return (
                  <View key={i} style={{
                    flex: 1, backgroundColor: 'rgba(255,255,255,0.035)', borderRadius: 14,
                    paddingVertical: 10, paddingHorizontal: 7, alignItems: 'center', minHeight: 84,
                    borderWidth: 1, borderColor: 'rgba(214,181,109,0.11)',
                  }}>
                    <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 3, backgroundColor: 'rgba(255,184,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.16)' }}>
                      <Ionicons name={item.icon} size={13} color="#FFD666" />
                    </View>
                    <Text style={lr.luckyLabel}>{item.label}</Text>
                    <Text style={lr.luckyValue} numberOfLines={2}>{item.value}</Text>
                  </View>
                );
              });
            })()}
          </Animated.View>
        ) : null}

        {/* ── Spacer ── */}
        <Animated.View entering={FadeInUp.delay(2400).duration(600)}>
          <View style={lr.premiumPanel}>
            <LinearGradient
              colors={['rgba(244,228,188,0.10)', 'rgba(214,181,109,0.055)', 'rgba(5,3,9,0.94)']}
              style={StyleSheet.absoluteFill}
            >
            </LinearGradient>
              <View style={lr.premiumHeader}>
                <View style={lr.premiumIcon}>
                  <Ionicons name="telescope-outline" size={13} color="#FFD666" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={lr.premiumTitle}>
                    {lang === 'si' ? 'සම්පූර්ණ කියවීමේ ඊළඟ දොරටුව' : 'The next chamber of your reading'}
                  </Text>
                  <Text style={lr.premiumSub}>
                    {lang === 'si' ? 'භාව, කාල රටා සහ ගැඹුරු මඟපෙන්වීම් මෙහිදී විවෘත වේ' : 'Houses, timing patterns, and deeper guidance open here'}
                  </Text>
                </View>
              </View>

              <View style={lr.lockGrid}>
                {[
                  { icon: 'heart-outline', label: lang === 'si' ? 'සම්බන්ධතා කාලය' : 'Relationship Timing', value: '20██', color: '#FF6B9D' },
                  { icon: 'wallet-outline', label: lang === 'si' ? 'ධන රටා' : 'Wealth Pattern', value: '████', color: '#34D399' },
                  { icon: 'briefcase-outline', label: lang === 'si' ? 'වෘත්තීය දිශාව' : 'Career Direction', value: '████', color: '#60A5FA' },
                  { icon: 'shield-checkmark-outline', label: lang === 'si' ? 'සංවේදී කාල' : 'Sensitive Periods', value: '██/██', color: '#FBBF24' },
                ].map(function (item, i) {
                  return (
                    <View key={i} style={{
                      flexDirection: 'row', alignItems: 'center', gap: 5,
                      width: '48%', paddingVertical: 7, paddingHorizontal: 8,
                      backgroundColor: 'rgba(0,0,0,0.22)', borderRadius: 10,
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.055)',
                    }}>
                      <View style={{ width: 21, height: 21, borderRadius: 10.5, alignItems: 'center', justifyContent: 'center', backgroundColor: item.color + '14', borderWidth: 1, borderColor: item.color + '2A' }}>
                        <Ionicons name={item.icon} size={11} color={item.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 8, fontWeight: '700', color: item.color }} numberOfLines={1}>{item.label}</Text>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.18)', letterSpacing: 1, marginTop: 1 }}>{item.value}</Text>
                      </View>
                      <Ionicons name="lock-closed" size={9} color="rgba(255,184,0,0.25)" />
                    </View>
                  );
                })}
              </View>
          </View>

          <PrimaryButton label={lang === 'si' ? 'මගේ සම්පූර්ණ කියවීම විවෘත කරන්න' : 'Open My Complete Reading'} onPress={onContinue} icon="sparkles" />
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
  revealRoot: { flex: 1, overflow: 'hidden', backgroundColor: '#020106' },
  revealScroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 20 },
  revealHeader: { alignItems: 'center', marginBottom: 10 },
  revealKicker: { color: 'rgba(255,184,0,0.7)', fontSize: 10, lineHeight: 14, fontWeight: '900', letterSpacing: 2.2, textTransform: 'uppercase' },
  revealWelcome: { color: '#FFB800', fontSize: 15, lineHeight: 21, fontWeight: '800', marginTop: 4, maxWidth: '92%' },
  heroStage: { alignItems: 'center', justifyContent: 'center', paddingTop: 4, paddingBottom: 8 },
  heroChakraStage: { position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'visible', marginTop: -4 },
  heroChakraGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(214,181,109,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(244,228,188,0.18)',
    ...boxShadow('rgba(214,181,109,0.58)', { width: 0, height: 0 }, 0.85, 30),
  },
  heroChakraSpin: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSeal: {
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden', zIndex: 4, elevation: 4,
    borderWidth: 1.4, borderColor: 'rgba(244,228,188,0.58)',
    backgroundColor: 'rgba(8,5,13,0.88)',
    ...boxShadow('rgba(214,181,109,0.38)', { width: 0, height: 8 }, 0.9, 34),
  },
  heroSealRing: { position: 'absolute', top: 8, left: 8, right: 8, bottom: 8, borderWidth: 1, borderColor: 'rgba(214,181,109,0.24)' },
  heroImagePlate: { position: 'absolute', overflow: 'hidden', backgroundColor: 'rgba(255,244,215,0.10)', borderWidth: 1, borderColor: 'rgba(244,228,188,0.22)', ...boxShadow('rgba(255,214,102,0.30)', { width: 0, height: 0 }, 0.8, 24) },
  heroImage: { alignItems: 'center', justifyContent: 'center', zIndex: 3, elevation: 5 },
  heroZodiacImage: { opacity: 1, ...boxShadow('rgba(255,214,102,0.28)', { width: 0, height: 0 }, 0.7, 16) },
  lagnaTitleBlock: { alignItems: 'center', marginTop: 14, width: '100%' },
  lagnaEyebrow: { color: 'rgba(255,184,0,0.75)', fontSize: 10, lineHeight: 14, fontWeight: '900', letterSpacing: 2.8, textTransform: 'uppercase' },
  lagnaTitle: { color: '#FFD666', fontSize: 38, lineHeight: 46, fontWeight: '900', letterSpacing: 0, marginTop: 2, ...textShadow('rgba(255,184,0,0.4)', { width: 0, height: 2 }, 16) },
  lagnaTitleSmall: { fontSize: 33, lineHeight: 40 },
  lagnaSubtitle: { color: 'rgba(244,228,188,0.48)', fontSize: 13, lineHeight: 18, fontWeight: '700', marginTop: 2 },
  signGrid: { flexDirection: 'row', gap: 8, marginTop: 18 },
  signCard: {
    minHeight: 108, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6, paddingVertical: 11, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  signImage: { width: 38, height: 38, marginBottom: 7 },
  signIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 7, borderWidth: 1 },
  signLabel: { color: 'rgba(244,228,188,0.40)', fontSize: 8, lineHeight: 12, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3, textAlign: 'center' },
  signValue: { fontSize: 13, lineHeight: 17, fontWeight: '900', textAlign: 'center', paddingHorizontal: 2, width: '100%' },
  traitPanel: { marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(214,181,109,0.10)', backgroundColor: 'rgba(255,255,255,0.028)', padding: 12 },
  panelKicker: { color: 'rgba(214,181,109,0.52)', fontSize: 9, lineHeight: 13, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center', marginBottom: 9 },
  traitWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center' },
  traitChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(214,181,109,0.18)', backgroundColor: 'rgba(214,181,109,0.06)' },
  traitText: { color: '#F4E4BC', fontSize: 11, lineHeight: 15, fontWeight: '800' },
  luckyRow: { flexDirection: 'row', gap: 7, marginTop: 10 },
  luckyLabel: { color: 'rgba(244,228,188,0.36)', fontSize: 7, lineHeight: 11, fontWeight: '900', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 3, textAlign: 'center' },
  luckyValue: { color: 'rgba(255,244,215,0.68)', fontSize: 11, lineHeight: 15, fontWeight: '800', textAlign: 'center' },
  premiumPanel: { position: 'relative', borderRadius: 17, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(214,181,109,0.19)', marginTop: 14, marginBottom: 10, padding: 13 },
  premiumHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  premiumIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(214,181,109,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(214,181,109,0.24)' },
  premiumTitle: { color: '#FFB800', fontSize: 13, lineHeight: 17, fontWeight: '900', letterSpacing: 0.2 },
  premiumSub: { color: 'rgba(244,228,188,0.42)', fontSize: 9, lineHeight: 13, fontWeight: '700', marginTop: 2 },
  lockGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
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
          {/* Celestial particles */}
          <Animated.View style={[{ position: 'absolute' }, c1]}><Ionicons name="sparkles" size={14} color="#FFD666" /></Animated.View>
          <Animated.View style={[{ position: 'absolute' }, c2]}><Ionicons name="star" size={12} color="#F8E7B8" /></Animated.View>
          <Animated.View style={[{ position: 'absolute' }, c3]}><Ionicons name="ellipse" size={10} color="#D9A441" /></Animated.View>
          {/* Main seal */}
          <Animated.View style={[{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(217,164,65,0.10)', borderWidth: 1, borderColor: 'rgba(217,164,65,0.30)' }, starStyle]}>
            <Ionicons name="sparkles" size={38} color="#FFD666" />
          </Animated.View>
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
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <StatusBar barStyle={colors.statusBarStyle} translucent backgroundColor="transparent" />

      {/* ── Persistent Cinematic Starfield ── */}
      <CinematicStarfield />

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: 'transparent', overflow: 'hidden' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
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
  headerIconBg: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(217,164,65,0.07)', alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1, ...boxShadow('rgba(217,164,65,0.20)', { width: 0, height: 0 }, 0.8, 18) },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#F8E7B8', textAlign: 'center', lineHeight: 30, letterSpacing: 0.2 },
  headerSub: { fontSize: 14, color: 'rgba(248,231,184,0.58)', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  card: { backgroundColor: 'rgba(18,12,7,0.66)', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: 'rgba(217,164,65,0.13)', ...boxShadow('rgba(0,0,0,0.45)', { width: 0, height: 10 }, 0.9, 18) },
  inputLabel: { color: 'rgba(248,231,184,0.48)', fontSize: 11, fontWeight: '800', marginBottom: 8, letterSpacing: 1.4, textTransform: 'uppercase' },
  textInput: { backgroundColor: 'rgba(7,5,3,0.58)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 15 : 13, color: '#F8E7B8', fontSize: 16, fontWeight: '600', borderWidth: 1, borderColor: 'rgba(217,164,65,0.16)' },
  primaryBtn: { borderRadius: 16, overflow: 'hidden', ...boxShadow('rgba(217,164,65,0.62)', { width: 0, height: 4 }, 0.85, 22) },
  primaryGrad: { paddingVertical: 14, minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,240,184,0.36)' },
  primaryText: { fontSize: 16, fontWeight: '900', color: '#2A1707', letterSpacing: 0.5, textAlign: 'center', flexShrink: 1 },
  ghostBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  ghostText: { color: 'rgba(248,231,184,0.46)', fontSize: 13, fontWeight: '600' },
  error: { color: '#FF6B6B', fontSize: 12, marginTop: 8, textAlign: 'center', fontWeight: '500' },
  hint: { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 12, lineHeight: 17 },
  ritualNote: { flexDirection: 'row', alignItems: 'center', gap: 9, alignSelf: 'center', marginTop: 12, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 14, backgroundColor: 'rgba(217,164,65,0.055)', borderWidth: 1, borderColor: 'rgba(217,164,65,0.11)' },
  ritualNoteIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  ritualNoteText: { flex: 1, color: 'rgba(248,231,184,0.68)', fontSize: 12, lineHeight: 18, fontWeight: '600', textAlign: 'left' },
});
