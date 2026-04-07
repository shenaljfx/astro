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

import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Platform,
  Dimensions, ActivityIndicator, KeyboardAvoidingView, ScrollView,
  StatusBar, Image, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown, FadeInUp, FadeIn,
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withSpring, withSequence, withDelay, interpolate, Easing,
} from 'react-native-reanimated';
import SpringPressable from '../components/effects/SpringPressable';
import CosmicLoader from '../components/effects/CosmicLoader';
import CitySearchPicker from '../components/CitySearchPicker';
import { getBirthChartBasic } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { usePricing } from '../contexts/PricingContext';
import { useLanguage } from '../contexts/LanguageContext';
import AwesomeRashiChakra from '../components/AwesomeRashiChakra';
import Svg, { Defs, LinearGradient as SvgGrad, Stop, Path, Circle, Rect, G, Ellipse } from 'react-native-svg';
import { boxShadow, textShadow } from '../utils/shadow';

var { width: SW, height: SH } = Dimensions.get('window');
var LOGO = require('../assets/logo.png');

// ═══════════════════════════════════════════════════════════════════════
//  GOLDEN 3D SVG ICONS
// ═══════════════════════════════════════════════════════════════════════

function GoldenIcon({ name, size }) {
  var s = size || 28;
  var goldDefs = (
    <Defs>
      <SvgGrad id="gold3d" x1="0" y1="0" x2="0.3" y2="1">
        <Stop offset="0" stopColor="#FFF0B8" />
        <Stop offset="0.3" stopColor="#FFD54F" />
        <Stop offset="0.6" stopColor="#FFB800" />
        <Stop offset="1" stopColor="#CC8800" />
      </SvgGrad>
      <SvgGrad id="goldHi" x1="0.5" y1="0" x2="0.5" y2="0.5">
        <Stop offset="0" stopColor="#FFFDE7" stopOpacity="0.9" />
        <Stop offset="1" stopColor="#FFD54F" stopOpacity="0" />
      </SvgGrad>
      <SvgGrad id="goldShade" x1="0.5" y1="0.5" x2="0.5" y2="1">
        <Stop offset="0" stopColor="#FFB800" stopOpacity="0" />
        <Stop offset="1" stopColor="#996600" stopOpacity="0.5" />
      </SvgGrad>
    </Defs>
  );

  if (name === 'diamond') {
    return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        {goldDefs}
        <Path d="M6 3h12l4 6-10 12L2 9z" fill="url(#gold3d)" />
        <Path d="M6 3h12l4 6-10 12L2 9z" fill="url(#goldHi)" />
        <Path d="M2 9h20M6 3l4 6m4 0l4-6M12 9l-2-6m4 6l-2 12" stroke="#CC8800" strokeWidth="0.5" strokeOpacity="0.5" fill="none" />
        <Path d="M6 3h12l4 6H2z" fill="url(#goldHi)" opacity="0.3" />
      </Svg>
    );
  }
  if (name === 'person') {
    return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        {goldDefs}
        <Circle cx="12" cy="8" r="4.5" fill="url(#gold3d)" />
        <Circle cx="12" cy="8" r="4.5" fill="url(#goldHi)" />
        <Ellipse cx="12" cy="21" rx="8" ry="5" fill="url(#gold3d)" />
        <Ellipse cx="12" cy="21" rx="8" ry="5" fill="url(#goldShade)" />
        <Circle cx="10.5" cy="7" r="1" fill="#FFFDE7" opacity="0.5" />
      </Svg>
    );
  }
  if (name === 'calendar') {
    return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        {goldDefs}
        <Rect x="3" y="5" width="18" height="16" rx="3" fill="url(#gold3d)" />
        <Rect x="3" y="5" width="18" height="6" rx="3" fill="url(#goldHi)" opacity="0.5" />
        <Rect x="3" y="5" width="18" height="16" rx="3" fill="url(#goldShade)" />
        <Rect x="7" y="2" width="2" height="5" rx="1" fill="url(#gold3d)" />
        <Rect x="15" y="2" width="2" height="5" rx="1" fill="url(#gold3d)" />
        <Circle cx="8" cy="14" r="1.2" fill="#FFFDE7" />
        <Circle cx="12" cy="14" r="1.2" fill="#FFD54F" />
        <Circle cx="16" cy="14" r="1.2" fill="#FFD54F" />
        <Circle cx="8" cy="18" r="1.2" fill="#FFD54F" />
        <Circle cx="12" cy="18" r="1.2" fill="#FFFDE7" />
      </Svg>
    );
  }
  if (name === 'time') {
    return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        {goldDefs}
        <Circle cx="12" cy="12" r="10" fill="url(#gold3d)" />
        <Circle cx="12" cy="12" r="10" fill="url(#goldHi)" />
        <Circle cx="12" cy="12" r="10" fill="url(#goldShade)" />
        <Circle cx="12" cy="12" r="8.5" fill="none" stroke="#CC8800" strokeWidth="0.3" strokeOpacity="0.4" />
        <Path d="M12 6v6.5l4 2.5" stroke="#7A5200" strokeWidth="2" strokeLinecap="round" fill="none" />
        <Path d="M12 6v6.5l4 2.5" stroke="#FFFDE7" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />
        <Circle cx="12" cy="12" r="1.5" fill="#CC8800" />
        <Circle cx="12" cy="12" r="0.8" fill="#FFFDE7" />
      </Svg>
    );
  }
  if (name === 'location') {
    return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        {goldDefs}
        <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="url(#gold3d)" />
        <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="url(#goldHi)" />
        <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="url(#goldShade)" />
        <Circle cx="12" cy="9" r="3" fill="#7A5200" opacity="0.3" />
        <Circle cx="12" cy="9" r="2.2" fill="#FFFDE7" opacity="0.7" />
      </Svg>
    );
  }
  if (name === 'lock') {
    return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        {goldDefs}
        <Rect x="5" y="11" width="14" height="10" rx="3" fill="url(#gold3d)" />
        <Rect x="5" y="11" width="14" height="5" rx="3" fill="url(#goldHi)" opacity="0.4" />
        <Rect x="5" y="11" width="14" height="10" rx="3" fill="url(#goldShade)" />
        <Path d="M8 11V8a4 4 0 018 0v3" stroke="url(#gold3d)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <Circle cx="12" cy="16" r="1.5" fill="#7A5200" />
        <Rect x="11.5" y="16.5" width="1" height="2.5" rx="0.5" fill="#7A5200" />
      </Svg>
    );
  }
  if (name === 'shield') {
    return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        {goldDefs}
        <Path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7z" fill="url(#gold3d)" />
        <Path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7z" fill="url(#goldHi)" />
        <Path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7z" fill="url(#goldShade)" />
        <Path d="M9 12l2.5 2.5L15.5 10" stroke="#7A5200" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M9 12l2.5 2.5L15.5 10" stroke="#FFFDE7" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      </Svg>
    );
  }
  if (name === 'lk') {
    return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        {goldDefs}
        {/* Shield shape — Sri Lanka */}
        <Path d="M4 3h16a1 1 0 011 1v10c0 4-4.5 7.5-9 9-4.5-1.5-9-5-9-9V4a1 1 0 011-1z" fill="url(#gold3d)" />
        <Path d="M4 3h16a1 1 0 011 1v10c0 4-4.5 7.5-9 9-4.5-1.5-9-5-9-9V4a1 1 0 011-1z" fill="url(#goldHi)" />
        <Path d="M4 3h16a1 1 0 011 1v10c0 4-4.5 7.5-9 9-4.5-1.5-9-5-9-9V4a1 1 0 011-1z" fill="url(#goldShade)" />
        {/* Lion silhouette — simplified */}
        <Path d="M12 7c-1 0-1.8.5-2.2 1.2-.3.6-.3 1.2 0 1.8l1 1.5c.3.5.2 1-.2 1.3L9 13.5v2h1.5l.5 1h2l.5-1H15v-2l-1.6-.7c-.4-.3-.5-.8-.2-1.3l1-1.5c.3-.6.3-1.2 0-1.8C13.8 7.5 13 7 12 7z" fill="#7A5200" opacity="0.6" />
        <Path d="M12 7c-1 0-1.8.5-2.2 1.2-.3.6-.3 1.2 0 1.8l1 1.5c.3.5.2 1-.2 1.3L9 13.5v2h1.5l.5 1h2l.5-1H15v-2l-1.6-.7c-.4-.3-.5-.8-.2-1.3l1-1.5c.3-.6.3-1.2 0-1.8C13.8 7.5 13 7 12 7z" fill="#FFFDE7" opacity="0.25" />
        {/* Decorative top — lion sword */}
        <Rect x="11.3" y="5.5" width="1.4" height="3" rx="0.7" fill="#CC8800" opacity="0.5" />
        <Path d="M10.5 5.5h3l-.5-1.5h-2z" fill="#FFD54F" opacity="0.5" />
      </Svg>
    );
  }
  if (name === 'globe') {
    return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        {goldDefs}
        <Circle cx="12" cy="12" r="10" fill="url(#gold3d)" />
        <Circle cx="12" cy="12" r="10" fill="url(#goldHi)" />
        <Circle cx="12" cy="12" r="10" fill="url(#goldShade)" />
        {/* Globe lines */}
        <Ellipse cx="12" cy="12" rx="4.5" ry="10" fill="none" stroke="#CC8800" strokeWidth="0.6" strokeOpacity="0.4" />
        <Ellipse cx="12" cy="12" rx="8" ry="10" fill="none" stroke="#CC8800" strokeWidth="0.4" strokeOpacity="0.3" />
        <Path d="M2 12h20" stroke="#CC8800" strokeWidth="0.6" strokeOpacity="0.4" />
        <Path d="M3.5 8h17" stroke="#CC8800" strokeWidth="0.4" strokeOpacity="0.3" />
        <Path d="M3.5 16h17" stroke="#CC8800" strokeWidth="0.4" strokeOpacity="0.3" />
        {/* Shine */}
        <Circle cx="8.5" cy="8" r="3" fill="#FFFDE7" opacity="0.15" />
      </Svg>
    );
  }
  // fallback — star/sparkle
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      {goldDefs}
      <Path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.4 4.8 2.4-7.2-6-4.8h7.6z" fill="url(#gold3d)" />
      <Path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.4 4.8 2.4-7.2-6-4.8h7.6z" fill="url(#goldHi)" />
      <Path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.4 4.8 2.4-7.2-6-4.8h7.6z" fill="url(#goldShade)" />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════

var OB = {
  en: {
    welcomeSubtitle: "Your Personal Vedic Astrology App",
    welcomeDesc: "Your personal Vedic astrologer\nWeekly Palapala & Kendara Balima\nPorondam Galapima & Full Life Report",
    welcomeBtn: "Begin Your Cosmic Journey",
    welcomeHint: "Only LKR 280/month via in-app purchase \u2014 required for access",
    googleTitle: "Sign In",
    googleSubtitle: "Sign in with your Google account to continue",
    googleBtn: "Continue with Google",
    googleFail: "Sign in failed. Please try again.",
    subTitle: "Unlock Premium",
    subSubtitle: "Full access to all cosmic features",
    subFeature1: "Weekly Lagna Palapala",
    subFeature2: "Full Vedic Birth Chart (Kendara)",
    subFeature3: "Marriage Compatibility (Porondam)",
    subFeature4: "Complete Life Report with AI",
    subFeature5: "Weekly Nakath & Rahu Alerts",
    subFeature6: "Personalised Predictions",
    subPerDay: "/day",
    subNote: "Billed via Google Play / App Store",
    subNetworks: "Google Play \u2022 App Store \u2022 All cards accepted",
    subBtn: "Activate Premium",
    subPayFail: "Payment failed. Please try again or use a different card.",
    subFailed: "Subscription failed",
    nameTitle: "What's Your Name?",
    nameSubtitle: "We'll personalise everything for you",
    nameLabel: "YOUR NAME",
    namePlaceholder: "Enter your name",
    nameError: "Please enter your name (min 2 chars)",
    dateTitle: "Birth Date",
    dateSubtitle: "For accurate Vedic readings",
    yearLabel: "YEAR",
    yearPlaceholder: "1995",
    monthLabel: "MONTH",
    dayLabel: "DAY",
    dayPlaceholder: "15",
    dateError: "Please enter a valid birth date",
    dateHint: "Birth date helps us calculate your Lagna chart",
    timeTitle: "Birth Time",
    timeSubtitle: "Check your birth certificate",
    hourLabel: "HOUR",
    minuteLabel: "MINUTE",
    timeHint: "Exact time = precise Lagna chart.\nIf unknown, skip \u2014 we'll use 12:00 PM.",
    placeTitle: "Birth Place",
    placeSubtitle: "Search any city worldwide",
    placeSearch: "Search any city...",
    placeHint: "Search any city in the world for accurate coordinates.\nDefault: Colombo, Sri Lanka",
    subProgressName: "Name",
    subProgressDate: "Date",
    subProgressTime: "Time",
    subProgressPlace: "Place",
    back: "Back",
    continueBtn: "Continue",
    completeSetup: "Complete Setup",
    skipBirth: "Skip \u2014 add later in Profile",
    saveFailed: "Failed to save. Please try again.",
    completeTitle: "You're All Set!",
    completeSubtitle: "Your cosmic journey begins now",
    completeLoading: "Calculating your stars...",
    // Lagna Reveal
    revealLoading: "Reading the celestial map...",
    revealLoadingSub: "Aligning planets to your birth moment",
    revealYourLagna: "Your Ascendant",
    revealMoonSign: "Moon Sign",
    revealSunSign: "Sun Sign",
    revealNakshatra: "Birth Star",
    revealTraits: "Your Cosmic Personality",
    revealLagnaTraits: "Lagna Traits",
    revealMoonTraits: "Moon Traits",
    revealGem: "Lucky Gem",
    revealColor: "Lucky Color",
    revealDay: "Lucky Day",
    revealCareer: "Career Path",
    revealContinue: "Enter the Cosmos",
    revealSkip: "Skip to Dashboard",
    months: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  },
  si: {
    welcomeSubtitle: "\u0dbd\u0d82\u0d9a\u0dcf\u0dc0\u0dda \u0d85\u0d82\u0d9a 1 \u0da2\u0dca\u200d\u0dba\u0ddd\u0dad\u0dd2\u0dc2 App \u0d91\u0d9a \uD83C\uDDF1\uD83C\uDDF0",
    welcomeDesc: "ඔයාගේම පෞද්ගලික ජ්‍යෝතිෂවේදියා\nපලාපල \u2022 කේන්දරේ \u2022 පොරොන්දම්",
    welcomeBtn: "\u0dc0\u0dd0\u0da9\u0dda \u0db4\u0da7\u0db1\u0dca \u0d9c\u0db1\u0dca\u0db1",
    welcomeHint: "\u0db8\u0dcf\u0dc3\u0dba\u0da7 \u0dbb\u0dd4. 280\u0dba\u0dd2 (Google Play \u0d94\u0dc3\u0dca\u0dc3\u0dda)",
    googleTitle: "\u0d87\u0dad\u0dd4\u0dbd\u0dca \u0dc0\u0db1\u0dca\u0db1",
    googleSubtitle: "\u0d89\u0daf\u0dd2\u0dbb\u0dd2\u0dba\u0da7 \u0dba\u0dcf\u0db8 \u0dc3\u0db3\u0dc4\u0dcf Google \u0d9c\u0dd2\u0dab\u0dd4\u0db8\u0dd9\u0db1\u0dca \u0d87\u0dad\u0dd4\u0dbd\u0dca \u0dc0\u0db1\u0dca\u0db1",
    googleBtn: "Google \u0dc4\u0dbb\u0dc4\u0dcf \u0db4\u0dd2\u0dc0\u0dd2\u0dc3\u0dd9\u0db1\u0dca\u0db1",
    googleFail: "\u0db4\u0dd2\u0dc0\u0dd2\u0dc3\u0dd3\u0db8 \u0d85\u0dc3\u0dcf\u0dbb\u0dca\u0dae\u0d9a\u0dba\u0dd2. \u0d9a\u0dbb\u0dd4\u0dab\u0dcf\u0d9a\u0dbb \u0db1\u0dd0\u0dc0\u0dad \u0d8b\u0dad\u0dca\u0dc3\u0dcf\u0dc4 \u0d9a\u0dbb\u0db1\u0dca\u0db1.",
    subTitle: "Premium \u0daf\u0dcf\u0d9c\u0db1\u0dca\u0db1 \uD83D\uDC51",
    subSubtitle: "\u0d85\u0db1\u0dcf\u0d9c\u0dad\u0dda \u0d9c\u0dd0\u0db1 \u0d94\u0d9a\u0dca\u0d9a\u0ddc\u0db8 \u0daf\u0dd0\u0db1\u0d9c\u0db1\u0dca\u0db1",
    subFeature1: "\u0dc3\u0dad\u0dd2\u0db4\u0dad\u0dcf \u0dbd\u0d9c\u0dca\u0db1 \u0db4\u0dbd\u0dcf\u0db4\u0dbd",
    subFeature2: "\u0dc3\u0db8\u0dca\u0db4\u0dd6\u0dbb\u0dca\u0dab \u0d9a\u0dda\u0db1\u0dca\u0daf\u0dbb\u0dda",
    subFeature3: "\u0db4\u0ddc\u0dbb\u0ddc\u0db1\u0dca\u0daf\u0db8\u0dca \u0d9c\u0dd0\u0dbd\u0db4\u0dd3\u0db8",
    subFeature4: "AI \u0d91\u0d9a\u0dd9\u0db1\u0dca \u0d85\u0dc4\u0dbd\u0dcf \u0daf\u0dd0\u0db1\u0d9c\u0db1\u0dca\u0db1",
    subFeature5: "\u0db1\u0dd0\u0d9a\u0dd0\u0dad\u0dca \u0dc3\u0dc4 \u0dbb\u0dcf\u0dc4\u0dd4 \u0d9a\u0dcf\u0dbd\u0dda",
    subFeature6: "\u0d94\u0dba\u0dcf\u0da7\u0db8 \u0dc4\u0dbb\u0dd2\u0dba\u0db1 \u0d85\u0db1\u0dcf\u0dc0\u0dd0\u0d9a\u0dd2",
    subPerDay: "/\u0daf\u0dc0\u0dc3\u0da7",
    subNote: "Google Play / App Store \u0d94\u0dc3\u0dca\u0dc3\u0dda \u0d9c\u0dd9\u0dc0\u0db1\u0dca\u0db1 \u26A1",
    subNetworks: "Google Play \u2022 App Store \u2022 \u0dc3\u0dd2\u0dba\u0dbd\u0dd4\u0db8 \u0d9a\u0dcf\u0da9\u0dca\u0db4\u0dad\u0dca",
    subBtn: "Activate Premium",
    subPayFail: "\u0d9c\u0dd9\u0dc0\u0dd3\u0db8 \u0d85\u0dc3\u0dcf\u0dbb\u0dca\u0dae\u0d9a\u0dba\u0dd2. \u0d86\u0dba\u0dd2 \u0db6\u0dbd\u0db1\u0dca\u0db1.",
    subFailed: "\u0d87\u0d9a\u0dca\u0da7\u0dd2\u0dc0\u0dca \u0dc0\u0dd4\u0db1\u0dda \u0db1\u0dd1",
    nameTitle: "\u0d94\u0dba\u0dcf\u0d9c\u0dda \u0db1\u0db8?",
    nameSubtitle: "\u0d9a\u0dda\u0db1\u0dca\u0daf\u0dbb\u0dda \u0dc4\u0daf\u0db1\u0dca\u0db1 \u0db1\u0db8 \u0d95\u0db1",
    nameLabel: "\u0db1\u0db8",
    namePlaceholder: "\u0db1\u0db8 \u0db8\u0dd9\u0dad\u0db1 \u0d9c\u0dc4\u0db1\u0dca\u0db1",
    nameError: "\u0db1\u0db8 \u0daf\u0dcf\u0dbd\u0dcf \u0d89\u0db1\u0dca\u0db1\u0d9a\u0ddd",
    dateTitle: "\u0d89\u0db4\u0daf\u0dd4\u0db1 \u0daf\u0dd2\u0db1\u0dba",
    dateSubtitle: "\u0d85\u0db1\u0dcf\u0dc0\u0dd0\u0d9a\u0dd2 \u0dc4\u0dbb\u0dd2\u0dba\u0da7\u0db8 \u0d9a\u0dd2\u0dba\u0db1\u0dca\u0db1 \u0db8\u0dda\u0d9a \u0d95\u0db1",
    yearLabel: "\u0d85\u0dc0\u0dd4\u0dbb\u0dd4\u0daf\u0dca\u0daf",
    yearPlaceholder: "1995",
    monthLabel: "\u0db8\u0dcf\u0dc3\u0dba",
    dayLabel: "\u0daf\u0dd2\u0db1\u0dba",
    dayPlaceholder: "15",
    dateError: "\u0d89\u0db4\u0daf\u0dd4\u0db1 \u0daf\u0dd2\u0db1\u0dba \u0dc4\u0dbb\u0dd2\u0dba\u0da7 \u0daf\u0dcf\u0db1\u0dca\u0db1",
    dateHint: "\u0db1\u0dd0\u0d9a\u0dd0\u0dad\u0dca, \u0dbd\u0d9c\u0dca\u0db1 \u0db6\u0dbd\u0db1\u0dca\u0db1 \u0db8\u0dda\u0d9a \u0d95\u0db1\u0db8\u0dba\u0dd2",
    timeTitle: "\u0d89\u0db4\u0daf\u0dd4\u0db1 \u0dc0\u0dd9\u0dbd\u0dcf\u0dc0",
    timeSubtitle: "\u0d89\u0db4\u0dca\u0db4\u0dd0\u0db1\u0dca\u0db1\u0dd9 \u0dad\u0dd2\u0dba\u0dd9\u0db1 \u0dc0\u0dd9\u0dbd\u0dcf\u0dc0",
    hourLabel: "\u0db4\u0dd0\u0dba",
    minuteLabel: "\u0db8\u0dd2\u0db1\u0dd2\u0dad\u0dca\u0dad\u0dd4",
    timeHint: "\u0dc0\u0dd9\u0dbd\u0dcf\u0dc0 \u0dc4\u0dbb\u0dd2\u0dba\u0da7 \u0daf\u0db1\u0dca\u0db1\u0dc0\u0db1\u0db8\u0dca \u0d9c\u0dc4\u0db1\u0dca\u0db1.\n\u0daf\u0db1\u0dca\u0db1\u0dda \u0db1\u0dd0\u0dad\u0dca\u0db1\u0db8\u0dca \u0dc4\u0dd2\u0dc3\u0dca\u0dc0 \u0dad\u0dd2\u0dba\u0db1\u0dca\u0db1.",
    placeTitle: "\u0d89\u0db4\u0daf\u0dd4\u0db1 \u0d9c\u0db8?",
    placeSubtitle: "\u0dc0\u0dd2\u0dc1\u0dca\u0dc0\u0dba\u0dda \u0d94\u0db1\u0dd1\u0db8 \u0db1\u0d9c\u0dbb\u0dba\u0d9a\u0dca \u0dc3\u0ddc\u0dba\u0db1\u0dca\u0db1",
    placeSearch: "\u0db1\u0d9c\u0dbb\u0dba \u0dc3\u0ddc\u0dba\u0db1\u0dca\u0db1...",
    placeHint: "\u0dc0\u0dd2\u0dc1\u0dca\u0dc0\u0dba\u0dda \u0d94\u0db1\u0dd1\u0db8 \u0db1\u0d9c\u0dbb\u0dba\u0d9a\u0dca \u0dc3\u0ddc\u0dba\u0db1\u0dca\u0db1.\n\u0dc3\u0dca\u0dc0\u0dba\u0d82\u0d9a\u0dca\u200d\u0dbb\u0dd3\u0dba: \u0d9a\u0ddc\u0dc5\u0db9, \u0dc1\u0dca\u200d\u0dbb\u0dd3 \u0dbd\u0d82\u0d9a\u0dcf\u0dc0",
    subProgressName: "\u0db1\u0db8",
    subProgressDate: "\u0daf\u0dd2\u0db1\u0dba",
    subProgressTime: "\u0dc0\u0dd9\u0dbd\u0dcf\u0dc0",
    subProgressPlace: "\u0d9c\u0db8",
    back: "\u0db4\u0dc3\u0dca\u0dc3\u0da7",
    continueBtn: "\u0d89\u0dc3\u0dca\u0dc3\u0dbb\u0dc4\u0da7",
    completeSetup: "\u0d94\u0d9a\u0dca\u0d9a\u0ddc\u0db8 \u0dc4\u0dbb\u0dd2",
    skipBirth: "\u0dc0\u0dd2\u0dc3\u0dca\u0dad\u0dbb \u0db4\u0dc3\u0dca\u0dc3\u0dda \u0daf\u0dcf\u0db1\u0dca\u0db1\u0db8\u0dca",
    saveFailed: "\u0dc3\u0dda\u0dc0\u0dca \u0dc0\u0dd4\u0db1\u0dda \u0db1\u0dd1. \u0d86\u0dba\u0dd2 \u0db6\u0dbd\u0db1\u0dca\u0db1.",
    completeTitle: "\u0d9c\u0db8\u0db1 \u0db4\u0da7\u0db1\u0dca \u0d9c\u0db8\u0dd4! \uD83C\uDF1F",
    completeSubtitle: "\u0d94\u0dba\u0dcf\u0d9c\u0dda \u0da2\u0dca\u200d\u0dba\u0ddd\u0dad\u0dd2\u0dc2 \u0d9c\u0db8\u0db1 \u0d86\u0dbb\u0db8\u0dca\u0db7\u0dba\u0dd2",
    completeLoading: "\u0dad\u0dbb\u0dd4 \u0dbb\u0da7\u0dcf \u0d9c\u0dab\u0db1\u0dba \u0d9a\u0dbb\u0db8\u0dd2\u0db1\u0dca...",
    // Lagna Reveal
    revealLoading: "පෙරදිග ජ්‍යොතිෂයට අනුව කේන්දරය සකසමින්...",
    revealLoadingSub: "උපන් මොහොතේ තරු රටා සහ ග්‍රහ පිහිටීම් ගණනය කරමින් පවතී",
    revealYourLagna: "ඔබගේ උපන් ලග්නය",
    revealMoonSign: "චන්ද්‍ර රාශිය",
    revealSunSign: "සූර්ය රාශිය",
    revealNakshatra: "උපන් නැකත",
    revealTraits: "ඔබටම ආවේණික ගතිලක්ෂණ",
    revealLagnaTraits: "ලග්න ලක්ෂණ",
    revealMoonTraits: "චන්ද්‍ර ලක්ෂණ",
    revealGem: "සුබ මැණික් වර්ගය",
    revealColor: "වඩාත් සුබ වර්ණය",
    revealDay: "සියලු කටයුතු වලට සුබ දිනය",
    revealCareer: "සාර්ථක වෘත්තීය ක්ෂේත්‍ර",
    revealContinue: "ග්‍රහ ලොවට පිවිසෙන්න",
    revealSkip: "මගහැර ඉදිරියට යන්න",
    months: ["\u0da2\u0db1","\u0db4\u0dd9\u0db6","\u0db8\u0dcf\u0dbb\u0dca","\u0d85\u0db4\u0dca\u200d","\u0db8\u0dd0","\u0da2\u0dd6","\u0da2\u0dd6\u0dbd\u0dd2","\u0d85\u0d9c\u0ddd","\u0dc3\u0dd0\u0db4\u0dca","\u0d94\u0d9a\u0dca","\u0db1\u0ddc","\u0daf\u0dd9"],
  },
};


// ═══════════════════════════════════════════════════════════════════════
//  SHARED UI ATOMS — with micro-animations + vibrant gradients
// ═══════════════════════════════════════════════════════════════════════

/* Shimmer animated border for focused inputs */
function AnimatedBorderCard({ children, style, focused }) {
  var shimmer = useSharedValue(0);
  useEffect(function () {
    shimmer.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.linear }), -1, false);
  }, []);
  var borderStyle = useAnimatedStyle(function () {
    var c = interpolate(shimmer.value, [0, 0.33, 0.66, 1], [0, 1, 2, 3]);
    return {
      borderColor: focused
        ? (c < 1 ? 'rgba(255,184,0,0.5)' : c < 2 ? 'rgba(255,140,0,0.5)' : 'rgba(255,184,0,0.5)')
        : 'rgba(255,255,255,0.06)',
    };
  });
  return (
    <Animated.View style={[g.card, style, borderStyle]}>
      {children}
    </Animated.View>
  );
}

/* Primary action button — hot gradient with bounce */
function PrimaryButton({ label, onPress, loading, disabled, icon }) {
  var isOff = disabled || loading;
  var glow = useSharedValue(0);

  useEffect(function () {
    glow.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  var glowStyle = useAnimatedStyle(function () {
    if (Platform.OS === 'web') return {};
    return {
      shadowOpacity: isOff ? 0 : interpolate(glow.value, [0, 1], [0.4, 0.9]),
      shadowRadius: interpolate(glow.value, [0, 1], [10, 28]),
    };
  });

  return (
    <Animated.View style={[g.primaryBtn, glowStyle]}>
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
            <CosmicLoader size={26} color="#FFF" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {icon ? <Ionicons name={icon} size={18} color="#FFF" /> : null}
              <Text style={g.primaryText}>{label}</Text>
            </View>
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
  var iconBounce = useSharedValue(0);
  var iconGlow = useSharedValue(0);
  useEffect(function () {
    iconBounce.value = withSequence(
      withDelay(300, withSpring(1, { damping: 8, stiffness: 200 }))
    );
    iconGlow.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);
  var iconAnim = useAnimatedStyle(function () {
    return {
      transform: [{ scale: interpolate(iconBounce.value, [0, 1], [0.3, 1]) }],
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
        <Animated.View style={[g.headerIconBg, { borderColor: '#FFB80050', ...(Platform.OS !== 'web' ? { shadowColor: '#FFB800' } : {}) }, iconAnim, glowAnim]}>
          <GoldenIcon name={icon} size={28} />
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

var STEP_LABELS_EN = ['Welcome', 'Sign In', 'Subscribe', 'Birth Info', 'Your Stars', 'Done'];
var STEP_LABELS_SI = ['සාදරයෙන්', 'සාදරයෙන්', 'දායකත්ව', 'උපන් දත්ත', 'ලග්නය', 'සම්පූර්ණ'];

function StepProgressBar({ current, total, lang }) {
  var labels = lang === 'si' ? STEP_LABELS_SI : STEP_LABELS_EN;
  var progress = total > 1 ? current / (total - 1) : 0;
  return (
    <View style={g.progressWrap}>
      <View style={g.progressTrack}>
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[g.progressFill, { width: (progress * 100) + '%' }]}
        >
          <LinearGradient
            colors={['#FF8C00', '#FFB800']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          />
        </Animated.View>
      </View>
      <Text style={g.progressLabel}>
        {(current + 1) + ' / ' + total + (labels[current] ? ' — ' + labels[current] : '')}
      </Text>
    </View>
  );
}


// ═══════════════════════════════════════════════════════════════════════
//  STEP -1: LANGUAGE SELECTION
// ═══════════════════════════════════════════════════════════════════════

function LanguageStep({ onSelect }) {
  var glow = useSharedValue(0);
  var float = useSharedValue(0);
  var titleScale = useSharedValue(0);
  useEffect(function () {
    glow.value = withRepeat(withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }), -1, true);
    float.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }), -1, true);
    titleScale.value = withDelay(400, withSpring(1, { damping: 12, stiffness: 120 }));
  }, []);
  var glowStyle = useAnimatedStyle(function () {
    return {
      opacity: interpolate(glow.value, [0, 1], [0.5, 1]),
      transform: [{ scale: interpolate(glow.value, [0, 1], [0.95, 1.05]) }],
    };
  });
  var floatStyle = useAnimatedStyle(function () {
    return { transform: [{ translateY: interpolate(float.value, [0, 1], [-8, 8]) }] };
  });
  var titleAnim = useAnimatedStyle(function () {
    return { transform: [{ scale: titleScale.value }], opacity: titleScale.value };
  });

  return (
    <View style={g.center}>
      <Animated.View entering={FadeInDown.duration(800)} style={{ alignItems: 'center', marginBottom: 40 }}>
        <Animated.View style={floatStyle}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <AwesomeRashiChakra size={380} />
            <Animated.View style={[ls.logoWrap, glowStyle]}>
              <Image source={LOGO} style={ls.logoImg} resizeMode="contain" />
            </Animated.View>
          </View>
        </Animated.View>
        <Animated.View style={titleAnim}>
          <Text style={ls.mainTitleSi}>{'\u0D9C\u0DCA\u200D\u0DBB\u0DC4\u0DA0\u0DCF\u0DBB'}</Text>
          <Text style={ls.mainTitleEn}>Grahachara</Text>
        </Animated.View>
        <View style={ls.divider}>
          <LinearGradient colors={['transparent', '#FF8C00', '#FFB800', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
        </View>
        <Text style={ls.siTitle}>{'\u0db7\u0dcf\u0dc2\u0dcf\u0dc0 \u0dad\u0ddd\u0dbb\u0db1\u0dca\u0db1'}</Text>
        <Text style={ls.enTitle}>Select Your Language</Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300).duration(600)} style={{ width: '100%' }}>
        <SpringPressable style={ls.langBtn} onPress={function () { onSelect('si'); }} haptic="medium" scalePressed={0.95}>
          <LinearGradient colors={['#FF8C00', '#FF6D00']} style={ls.langGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={ls.langInner}>
              <View style={ls.langIconWrap}>
                <GoldenIcon name="lk" size={32} />
              </View>
              <View>
                <Text style={ls.langLabel}>{'\u0dc3\u0dd2\u0d82\u0dc4\u0dbd'}</Text>
                <Text style={ls.langSub}>Sinhala</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </SpringPressable>

        <View style={{ height: 14 }} />

        <SpringPressable style={ls.langBtn} onPress={function () { onSelect('en'); }} haptic="medium" scalePressed={0.95}>
          <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']} style={ls.langGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={ls.langInner}>
              <View style={ls.langIconWrap}>
                <GoldenIcon name="globe" size={32} />
              </View>
              <View>
                <Text style={ls.langLabel}>English</Text>
                <Text style={ls.langSub}>{'\u0d89\u0d82\u0d9c\u0dca\u200d\u0dbb\u0dd3\u0dc3\u0dd2'}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.4)" />
          </LinearGradient>
        </SpringPressable>
      </Animated.View>
    </View>
  );
}

var ls = StyleSheet.create({
  logoWrap: { width: 90, height: 90, borderRadius: 24, overflow: 'hidden', marginBottom: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,12,50,0.6)', borderWidth: 1.5, borderColor: 'rgba(255,184,0,0.25)' },
  logoImg:  { width: 80, height: 80, borderRadius: 20 },
  mainTitleSi: { fontSize: 44, fontWeight: '900', color: '#FFB800', letterSpacing: 2, ...textShadow('rgba(255,184,0,0.6)', { width: 0, height: 0 }, 20), textAlign: 'center' },
  mainTitleEn: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.35)', letterSpacing: 4, marginTop: 2, textAlign: 'center' },
  divider: { width: 60, height: 3, borderRadius: 2, marginVertical: 16, overflow: 'hidden' },
  siTitle: { fontSize: 22, fontWeight: '700', color: '#FFD666', marginBottom: 4 },
  enTitle: { fontSize: 15, color: 'rgba(255,255,255,0.5)' },
  langBtn: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  langGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 22, paddingHorizontal: 22, borderRadius: 18 },
  langInner: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  langIconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,184,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  langLabel: { fontSize: 24, fontWeight: '700', color: '#FFF1D0' },
  langSub: { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
});


// ═══════════════════════════════════════════════════════════════════════
//  STEP 0: WELCOME
// ═══════════════════════════════════════════════════════════════════════

function WelcomeStep({ onContinue, onBack, lang }) {
  var T = OB[lang] || OB.en;
  var { priceLabel, isInternational } = usePricing();
  var pulse = useSharedValue(0);
  var haloRotate = useSharedValue(0);
  useEffect(function () {
    pulse.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, true);
    haloRotate.value = withRepeat(withTiming(360, { duration: 15000, easing: Easing.linear }), -1, false);
  }, []);
  var pulseStyle = useAnimatedStyle(function () {
    return {
      transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.1]) }],
      opacity: interpolate(pulse.value, [0, 1], [0.85, 1]),
    };
  });
  var haloStyle = useAnimatedStyle(function () {
    return { transform: [{ rotate: haloRotate.value + 'deg' }] };
  });

  return (
    <View style={g.center}>
      <Animated.View entering={FadeInDown.duration(800)} style={{ alignItems: 'center' }}>
        {/* Rotating halo ring */}
        <Animated.View style={[ws.haloRing, haloStyle]}>
          <LinearGradient
            colors={['#FF8C00', '#FFB800', '#FF6D00', '#FF8C00']}
            style={ws.haloGrad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
        </Animated.View>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <AwesomeRashiChakra size={400} />
          <Animated.View style={[ws.logoRing, pulseStyle]}>
            <LinearGradient
              colors={['rgba(255,184,0,0.25)', 'rgba(255,140,0,0.15)', 'rgba(255,184,0,0.1)']}
              style={ws.logoInner}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Image source={LOGO} style={ws.logoImg} resizeMode="contain" />
            </LinearGradient>
          </Animated.View>
        </View>

        <Text style={ws.titleSi}>{'\u0D9C\u0DCA\u200D\u0DBB\u0DC4\u0DA0\u0DCF\u0DBB'}</Text>
        <Text style={ws.titleEn}>Grahachara</Text>
        <Text style={ws.subtitle}>{T.welcomeSubtitle}</Text>

        <View style={ws.featureList}>
          {T.welcomeDesc.split('\n').map(function (line, i) {
            return (
              <Animated.View key={i} entering={FadeInDown.delay(500 + i * 150).duration(400)} style={ws.featureLine}>
                <LinearGradient colors={['#FF8C00', '#FFB800']} style={ws.featureDot} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <Text style={ws.featureText}>{line.replace(/[•&]/g, '').trim()}</Text>
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(900).duration(600)} style={{ width: '100%', marginTop: 40 }}>
        <PrimaryButton label={T.welcomeBtn} onPress={onContinue} icon="sparkles" />
        <Text style={g.hint}>{isInternational ? ('Only ' + priceLabel('subscription') + ' via card — required for access') : T.welcomeHint}</Text>
        <GhostButton label={lang === 'si' ? 'භාෂාව වෙනස් කරන්න' : 'Change Language'} onPress={onBack} icon={<GoldenIcon name="globe" size={16} />} />
      </Animated.View>
    </View>
  );
}

var ws = StyleSheet.create({
  haloRing: { position: 'absolute', top: -12, width: 124, height: 124, borderRadius: 62, overflow: 'hidden' },
  haloGrad: { width: '100%', height: '100%', borderRadius: 62, opacity: 0.25 },
  logoRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: 'rgba(255,184,0,0.4)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  logoInner: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  logoImg:  { width: 72, height: 72, borderRadius: 36 },
  titleSi: { fontSize: 40, fontWeight: '900', color: '#FFB800', letterSpacing: 2, ...textShadow('rgba(255,184,0,0.6)', { width: 0, height: 0 }, 16), marginBottom: 2, textAlign: 'center' },
  titleEn: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.3)', letterSpacing: 4, marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 15, fontWeight: '600', color: '#FFD666', marginBottom: 4 },
  featureList: { marginTop: 28, alignSelf: 'stretch', gap: 12 },
  featureLine: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 8 },
  featureDot: { width: 8, height: 8, borderRadius: 4 },
  featureText: { fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 22 },
});


// ═══════════════════════════════════════════════════════════════════════
//  STEP 1: GOOGLE SIGN-IN
// ═══════════════════════════════════════════════════════════════════════

function GoogleSignInStep({ onContinue, onBack, lang }) {
  var T = OB[lang] || OB.en;
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState('');
  var { signInWithGoogle } = useAuth();
  var googlePulse = useSharedValue(0);
  var logoFloat = useSharedValue(0);
  var iconBounce = useSharedValue(0);
  var iconGlow = useSharedValue(0);

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
      transform: [{ scale: interpolate(iconBounce.value, [0, 1], [0.3, 1]) }],
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
      console.error('Google sign-in error:', e);
      setError(T.googleFail);
    } finally { setLoading(false); }
  };

  return (
    <View style={[g.stepWrap, { flex: 1, justifyContent: 'space-between' }]}>

      {/* ── Top Section ── */}
      <View style={{ alignItems: 'center' }}>

        {/* ── Premium Header ── */}
        <Animated.View entering={FadeInDown.duration(600)} style={{ alignItems: 'center', marginBottom: 6 }}>
          <Animated.View style={[gs.headerIconBg, Platform.OS !== 'web' ? { shadowColor: '#FFB800' } : {}, iconAnim, glowAnim]}>
            <GoldenIcon name="lock" size={22} />
          </Animated.View>
          <Text style={gs.headerTitle}>{T.googleTitle}</Text>
          <Text style={gs.headerSub}>{T.googleSubtitle}</Text>
        </Animated.View>

        {/* ── Platform Logo ── */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={[{ marginBottom: 14, alignItems: 'center' }, floatStyle]}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <AwesomeRashiChakra size={360} />
            <Animated.View style={[gs.platformLogoOuter, pulseStyle]}>
              <View style={gs.platformLogoInner}>
                <LinearGradient
                  colors={['rgba(255,140,0,0.06)', 'rgba(255,255,255,0.02)']}
                  style={StyleSheet.absoluteFill}
                />
                <Image source={LOGO} style={gs.platformLogoImg} resizeMode="contain" />
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
            {[
              { icon: 'shield-checkmark', color: '#34D399', text: lang === 'si' ? 'ඉතා ආරක්ෂිත සහ පහසු පිවිසුම' : 'Secure & easy sign-in' },
              { icon: 'key-outline', color: '#FFB800', text: lang === 'si' ? 'මුරපද (Passwords) අවශ්‍ය නැත' : 'No passwords to remember' },
              { icon: 'cloud-done-outline', color: '#4CC9F0', text: lang === 'si' ? 'ඔබගේ පුද්ගලික දත්ත 100% ආරක්ෂිතයි' : 'Your data stays private' },
              { icon: 'sync-outline', color: '#FF8C00', text: lang === 'si' ? 'ඕනෑම උපාංගයකින් පිවිසීමේ හැකියාව' : 'Sync across all your devices' },
            ].map(function (b, i) {
              return (
                <Animated.View key={i} entering={FadeInDown.delay(400 + i * 60).duration(250)} style={gs.benefitRow}>
                  <View style={[gs.benefitIconWrap, { backgroundColor: b.color + '15', borderColor: b.color + '30' }]}>
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
          <Animated.View entering={FadeInDown.duration(300)} style={gs.errorWrap}>
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

        <GhostButton label={T.back || 'Back'} onPress={onBack} />
      </View>

    </View>
  );
}

var gs = StyleSheet.create({
  /* Header */
  headerIconBg: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,184,0,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,184,0,0.25)' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#FBBF24', textAlign: 'center', letterSpacing: 0.3 },
  headerSub: { fontSize: 13, color: 'rgba(255,200,80,0.6)', textAlign: 'center', marginTop: 4, lineHeight: 18 },

  /* Platform Logo */
  platformLogoOuter: { width: 80, height: 80, borderRadius: 40, borderWidth: 1.5, borderColor: 'rgba(255,140,0,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 10, ...boxShadow('#FF8C00', { width: 0, height: 0 }, 0.25, 16), elevation: 0 },
  platformLogoInner: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  platformLogoImg: { width: 52, height: 52 },

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
  googleBtnShadow: { borderRadius: 16, ...boxShadow('#FF8C00', { width: 0, height: 4 }, 0.7, 16), elevation: 0 },
  googleBtnGrad: { paddingVertical: 15, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  googleBtnIcon: { width: 34, height: 34, borderRadius: 10, backgroundcolor: '#FFF1D0', alignItems: 'center', justifyContent: 'center', ...boxShadow('#000', { width: 0, height: 1 }, 0.15, 4), elevation: 0 },
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
//  STEP 3: SUBSCRIPTION
// ═══════════════════════════════════════════════════════════════════════

function SubscriptionStep({ onContinue, lang }) {
  var T = OB[lang] || OB.en;
  var [loading, setLoading] = useState(false);
  var [restoring, setRestoring] = useState(false);
  var [payError, setPayError] = useState('');
  var [agreed, setAgreed] = useState(false);
  var { activateSubscription, restorePurchases } = useAuth();
  var { priceLabel, priceAmount, currency, currencySymbol, isInternational } = usePricing();
  var priceGlow = useSharedValue(0);
  var shieldPulse = useSharedValue(0);

  useEffect(function () {
    priceGlow.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
    shieldPulse.value = withRepeat(withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  var priceStyle = useAnimatedStyle(function () {
    return { transform: [{ scale: interpolate(priceGlow.value, [0, 1], [1, 1.05]) }] };
  });

  var shieldGlow = useAnimatedStyle(function () {
    return { opacity: interpolate(shieldPulse.value, [0, 1], [0.6, 1]) };
  });

  var features = [
    { icon: 'calendar-outline', text: T.subFeature1, color: '#FFB800' },
    { icon: 'planet-outline', text: T.subFeature2, color: '#FF8C00' },
    { icon: 'notifications-outline', text: T.subFeature5, color: '#06D6A0' },
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
        // User dismissed payment — don't show error
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

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, justifyContent: 'space-between' }} showsVerticalScrollIndicator={false} bounces={false}>
      <View>
        <StepHeader icon="diamond" title={T.subTitle} subtitle={T.subSubtitle} />

        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={{ marginTop: 12 }}>
          {/* Premium Features List */}
          <GlowCard style={{ paddingVertical: 10, paddingHorizontal: 16 }}>
            {features.map(function (f, i) {
              return (
                <Animated.View key={i} entering={FadeInDown.delay(200 + i * 50).duration(250)} style={ss.featureRow}>
                  <Ionicons name="checkmark-circle" size={17} color="#34D399" />
                  <Ionicons name={f.icon} size={15} color={f.color} style={{ marginLeft: 8 }} />
                  <Text style={ss.featureText}>{f.text}</Text>
                </Animated.View>
              );
            })}
          </GlowCard>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(550).duration(500)} style={[ss.priceBadge, priceStyle]}>
          <LinearGradient
            colors={['rgba(255,184,0,0.2)', 'rgba(255,140,0,0.12)', 'rgba(255,184,0,0.1)']}
            style={ss.priceGrad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Text style={ss.priceLabel}>{isInternational ? '$' : 'LKR'}</Text>
            <Text style={ss.priceAmount}>{priceAmount('subscription')}</Text>
            <Text style={ss.pricePer}>/month</Text>
          </LinearGradient>
        </Animated.View>

        {/* Secure Payment Badge */}
        <Animated.View entering={FadeInUp.delay(650).duration(400)} style={ss.payBadgeRow}>
          <Animated.View style={[ss.paySecureIcon, shieldGlow]}>
            <Ionicons name="shield-checkmark" size={16} color="#34D399" />
          </Animated.View>
          <Text style={ss.paySecureText}>
            {lang === 'si' ? 'ආරක්ෂිත ගෙවීම' : 'Secure In-App Purchase'}
          </Text>
        </Animated.View>

        <Text style={[g.hint, { marginTop: 4 }]}>{T.subNote}</Text>
        <Text style={[g.hint, { marginTop: 2, opacity: 0.5 }]}>{T.subNetworks}</Text>
      </View>

      <View style={{ marginTop: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12, marginTop: 4 }}>
          <TouchableOpacity 
            onPress={() => setAgreed(!agreed)} 
            activeOpacity={0.7}
          >
            <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: agreed ? '#FF8C00' : 'rgba(255,255,255,0.3)', backgroundColor: agreed ? '#FF8C00' : 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              {agreed && <Ionicons name="checkmark" size={16} color="#FFF" />}
            </View>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }} onPress={() => setAgreed(!agreed)}>
              {lang === 'si' ? 'මම ' : 'I agree to the '}
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://grahachara.com/legal/terms.html')} activeOpacity={0.6}>
              <Text style={{ color: '#FF8C00', fontSize: 13, textDecorationLine: 'underline', fontWeight: '500' }}>
                {lang === 'si' ? 'නියමයන් සහ කොන්දේසිවලට' : 'Terms and Conditions'}
              </Text>
            </TouchableOpacity>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }} onPress={() => setAgreed(!agreed)}>
              {lang === 'si' ? ' එකඟ වෙමි' : ''}
            </Text>
          </View>
        </View>

        {payError ? (
          <Animated.View entering={FadeInDown.duration(300)} style={ss.payErrorWrap}>
            <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
            <Text style={ss.payErrorText}>{payError}</Text>
          </Animated.View>
        ) : null}

        <View style={{ marginTop: 8 }}>
          <PrimaryButton 
            label={T.subBtn} 
            onPress={handleSub} 
            loading={loading} 
            icon="card-outline" 
            disabled={!agreed} 
          />
        </View>

        <Text style={[g.hint, { marginTop: 6, marginBottom: 12 }]}>
          {lang === 'si'
            ? 'මාසිකව ස්වයංක්‍රීයව අලුත් වේ. ඕනෑම වේලාවක අවලංගු කළ හැක.'
            : 'Auto-renews monthly. Cancel anytime from Profile.'}
        </Text>

        {/* Restore Purchases — required by App Store / Google Play */}
        <TouchableOpacity
          onPress={handleRestore}
          disabled={restoring}
          style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16 }}
          activeOpacity={0.7}
        >
          <Text style={{ color: 'rgba(255,184,0,0.7)', fontSize: 13, textDecorationLine: 'underline' }}>
            {restoring
              ? (lang === 'si' ? 'ප්‍රතිස්ථාපනය වෙමින්...' : 'Restoring...')
              : (lang === 'si' ? 'මිලදී ගැනීම් ප්‍රතිස්ථාපනය කරන්න' : 'Restore Purchases')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

var ss = StyleSheet.create({
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  featureText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, flex: 1, lineHeight: 18, marginLeft: 8 },
  priceBadge: { marginTop: 14, borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,184,0,0.25)', alignSelf: 'center' },
  priceGrad: { flexDirection: 'row', alignItems: 'baseline', paddingVertical: 12, paddingHorizontal: 28, gap: 4 },
  priceLabel: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  priceAmount: { fontSize: 38, fontWeight: '900', color: '#FFB800', ...textShadow('rgba(255,184,0,0.5)', { width: 0, height: 0 }, 12) },
  pricePer: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginLeft: 2 },
  payBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  paySecureIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(52,211,153,0.10)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(52,211,153,0.20)' },
  paySecureText: { color: 'rgba(52,211,153,0.85)', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  payErrorWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.20)' },
  payErrorText: { color: '#FCA5A5', fontSize: 13, fontWeight: '600', flex: 1 },
});


// ═══════════════════════════════════════════════════════════════════════
//  ✨ "WRITTEN IN THE STARS" — Name & birth data as constellations
//  Name letters → star-dot constellation patterns in background
//  Date/time digits → orbiting number-stars around the constellation
// ═══════════════════════════════════════════════════════════════════════

var STAR_GOLD = ['#FBBF24', '#FFD666', '#FFE8A0', '#FF8C00', '#FFA940', '#FFD98E'];

// Simple pixel-font map: each letter → array of [x,y] star points on a 5×7 grid
var LETTER_STARS = {
  A: [[1,6],[2,4],[2.5,2],[3,0],[3.5,2],[4,4],[5,6],[2,5],[4,5]],
  B: [[1,0],[1,2],[1,4],[1,6],[2,0],[3,0],[4,1],[3,2],[2,3],[3,4],[4,5],[3,6],[2,6],[1,3]],
  C: [[4,1],[3,0],[2,0],[1,1],[1,2],[1,3],[1,4],[1,5],[2,6],[3,6],[4,5]],
  D: [[1,0],[1,2],[1,4],[1,6],[2,0],[3,0],[4,1],[4,2],[4,3],[4,4],[4,5],[3,6],[2,6]],
  E: [[1,0],[1,2],[1,3],[1,4],[1,6],[2,0],[3,0],[4,0],[2,3],[3,3],[2,6],[3,6],[4,6]],
  F: [[1,0],[1,2],[1,3],[1,4],[1,6],[2,0],[3,0],[4,0],[2,3],[3,3]],
  G: [[4,1],[3,0],[2,0],[1,1],[1,2],[1,3],[1,4],[1,5],[2,6],[3,6],[4,5],[4,4],[3,4]],
  H: [[1,0],[1,2],[1,3],[1,4],[1,6],[5,0],[5,2],[5,3],[5,4],[5,6],[2,3],[3,3],[4,3]],
  I: [[2,0],[3,0],[4,0],[3,1],[3,2],[3,3],[3,4],[3,5],[2,6],[3,6],[4,6]],
  J: [[4,0],[4,1],[4,2],[4,3],[4,4],[4,5],[3,6],[2,6],[1,5]],
  K: [[1,0],[1,2],[1,3],[1,4],[1,6],[4,0],[3,1],[2,3],[3,4],[3,5],[4,6]],
  L: [[1,0],[1,2],[1,3],[1,4],[1,6],[2,6],[3,6],[4,6]],
  M: [[1,0],[1,2],[1,4],[1,6],[2,1],[3,2],[4,1],[5,0],[5,2],[5,4],[5,6]],
  N: [[1,0],[1,2],[1,4],[1,6],[2,1],[3,3],[4,5],[5,0],[5,2],[5,4],[5,6]],
  O: [[2,0],[3,0],[4,0],[1,1],[1,2],[1,3],[1,4],[1,5],[5,1],[5,2],[5,3],[5,4],[5,5],[2,6],[3,6],[4,6]],
  P: [[1,0],[1,2],[1,3],[1,4],[1,6],[2,0],[3,0],[4,1],[4,2],[3,3],[2,3]],
  Q: [[2,0],[3,0],[1,1],[1,2],[1,3],[1,4],[5,1],[5,2],[5,3],[5,4],[2,6],[3,6],[4,5],[5,6]],
  R: [[1,0],[1,2],[1,3],[1,4],[1,6],[2,0],[3,0],[4,1],[4,2],[3,3],[2,3],[3,4],[4,6]],
  S: [[4,1],[3,0],[2,0],[1,1],[1,2],[2,3],[3,3],[4,4],[4,5],[3,6],[2,6],[1,5]],
  T: [[1,0],[2,0],[3,0],[4,0],[5,0],[3,1],[3,2],[3,3],[3,4],[3,5],[3,6]],
  U: [[1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[5,0],[5,1],[5,2],[5,3],[5,4],[5,5],[2,6],[3,6],[4,6]],
  V: [[1,0],[1,1],[1,2],[2,3],[2,4],[3,6],[4,3],[4,4],[5,0],[5,1],[5,2]],
  W: [[1,0],[1,2],[1,4],[1,6],[2,5],[3,4],[4,5],[5,0],[5,2],[5,4],[5,6]],
  X: [[1,0],[1,1],[5,0],[5,1],[2,2],[4,2],[3,3],[2,4],[4,4],[1,5],[1,6],[5,5],[5,6]],
  Y: [[1,0],[1,1],[2,2],[5,0],[5,1],[4,2],[3,3],[3,4],[3,5],[3,6]],
  Z: [[1,0],[2,0],[3,0],[4,0],[5,0],[4,1],[3,2],[3,3],[2,4],[1,5],[1,6],[2,6],[3,6],[4,6],[5,6]],
  ' ': [],
  '0': [[2,0],[3,0],[1,1],[1,2],[1,3],[1,4],[1,5],[4,1],[4,2],[4,3],[4,4],[4,5],[2,6],[3,6]],
  '1': [[2,1],[3,0],[3,1],[3,2],[3,3],[3,4],[3,5],[3,6],[2,6],[4,6]],
  '2': [[1,1],[2,0],[3,0],[4,1],[4,2],[3,3],[2,4],[1,5],[1,6],[2,6],[3,6],[4,6]],
  '3': [[1,0],[2,0],[3,0],[4,1],[4,2],[3,3],[4,4],[4,5],[3,6],[2,6],[1,6]],
  '4': [[1,0],[1,1],[1,2],[1,3],[2,3],[3,3],[4,0],[4,1],[4,2],[4,3],[4,4],[4,5],[4,6]],
  '5': [[1,0],[2,0],[3,0],[4,0],[1,1],[1,2],[1,3],[2,3],[3,3],[4,4],[4,5],[3,6],[2,6],[1,6]],
  '6': [[3,0],[2,0],[1,1],[1,2],[1,3],[2,3],[3,3],[4,4],[4,5],[3,6],[2,6],[1,5],[1,4]],
  '7': [[1,0],[2,0],[3,0],[4,0],[4,1],[3,2],[3,3],[2,4],[2,5],[2,6]],
  '8': [[2,0],[3,0],[1,1],[1,2],[4,1],[4,2],[2,3],[3,3],[1,4],[1,5],[4,4],[4,5],[2,6],[3,6]],
  '9': [[2,0],[3,0],[1,1],[1,2],[4,1],[4,2],[2,3],[3,3],[4,3],[4,4],[4,5],[3,6],[2,6]],
  ':': [[3,2],[3,4]],
};

function buildConstellationPoints(text, centerX, centerY, letterSize) {
  var points = [];
  if (!text) return points;
  var upper = text.toUpperCase();
  var totalW = upper.length * (letterSize * 1.1);
  var startX = centerX - totalW / 2;
  for (var c = 0; c < upper.length; c++) {
    var ch = upper[c];
    var starMap = LETTER_STARS[ch];
    if (!starMap) continue;
    var offX = startX + c * letterSize * 1.1;
    for (var s = 0; s < starMap.length; s++) {
      var sx = offX + (starMap[s][0] / 5) * letterSize;
      var sy = centerY + (starMap[s][1] / 7) * letterSize * 1.2;
      points.push({ x: sx, y: sy, char: ch, idx: points.length });
    }
  }
  return points;
}

/* Single animated star particle — uses Reanimated (works on mobile + web) */
function ConstellationStar({ x, y, delay, outerR, innerR, coreR, outerColor, coreColor, outerOpacity, coreOpacity }) {
  var anim = useSharedValue(0);
  var twinkle = useSharedValue(0);
  useEffect(function () {
    anim.value = withDelay(delay, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    twinkle.value = withDelay(delay + 700,
      withRepeat(withSequence(
        withTiming(1, { duration: 1500 + Math.random() * 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.5, { duration: 1500 + Math.random() * 1000, easing: Easing.inOut(Easing.sin) })
      ), -1, true)
    );
  }, []);
  var style = useAnimatedStyle(function () {
    var s = interpolate(anim.value, [0, 1], [0, 1]);
    var tw = twinkle.value || 0.5;
    var totalOpacity = anim.value * (0.5 + tw * 0.5);
    return {
      position: 'absolute',
      left: x - outerR,
      top: y - outerR,
      width: outerR * 2,
      height: outerR * 2,
      opacity: totalOpacity,
      transform: [{ scale: s }],
    };
  });
  return (
    <Animated.View style={style}>
      <View style={{ width: outerR * 2, height: outerR * 2, borderRadius: outerR, backgroundColor: outerColor, opacity: outerOpacity, position: 'absolute' }} />
      <View style={{ width: innerR * 2, height: innerR * 2, borderRadius: innerR, backgroundColor: outerColor, opacity: outerOpacity * 2.5, position: 'absolute', left: outerR - innerR, top: outerR - innerR }} />
      <View style={{ width: coreR * 2, height: coreR * 2, borderRadius: coreR, backgroundColor: coreColor, opacity: coreOpacity, position: 'absolute', left: outerR - coreR, top: outerR - coreR }} />
    </Animated.View>
  );
}

/* Single animated line between two constellation stars */
function ConstellationLine({ x1, y1, x2, y2, delay }) {
  var anim = useSharedValue(0);
  useEffect(function () {
    anim.value = withDelay(delay, withTiming(0.5, { duration: 800, easing: Easing.out(Easing.cubic) }));
  }, []);
  var len = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
  var angle = Math.atan2(y2 - y1, x2 - x1);
  // Pre-compute the midpoint and use that as the position with centering
  var midX = (x1 + x2) / 2;
  var midY = (y1 + y2) / 2;
  var angleDeg = angle * 180 / Math.PI;
  var style = useAnimatedStyle(function () {
    return {
      position: 'absolute',
      left: midX - len / 2,
      top: midY - 0.5,
      width: len,
      height: 1,
      opacity: anim.value,
      transform: [{ rotate: angleDeg + 'deg' }],
    };
  });
  return (
    <Animated.View style={style}>
      <LinearGradient
        colors={['rgba(251,191,36,0.04)', 'rgba(255,214,102,0.25)', 'rgba(251,191,36,0.04)']}
        style={{ flex: 1, borderRadius: 1 }}
        start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
      />
    </Animated.View>
  );
}

function WrittenInTheStars({ name, dateStr, timeStr, page }) {
  // Name constellation centered in the top zone, date/time below it
  var constellationH = SH * 0.16;
  var namePoints = useMemo(function () {
    var nameToShow = (name || '').substring(0, 10);
    if (!nameToShow) return [];
    return buildConstellationPoints(nameToShow, SW / 2, constellationH * 0.28, Math.min(32, (SW - 48) / Math.max(nameToShow.length, 1) / 1.1));
  }, [name]);

  var digitPoints = useMemo(function () {
    var digits = (dateStr || '') + ' ' + (timeStr || '');
    if (!digits.trim()) return [];
    return buildConstellationPoints(digits.substring(0, 16), SW / 2, constellationH * 0.72, 13);
  }, [dateStr, timeStr]);

  if (namePoints.length === 0 && digitPoints.length === 0) return null;

  // Build line connections between nearby name stars
  var nameLines = [];
  for (var i = 1; i < namePoints.length; i++) {
    var prev = namePoints[i - 1];
    var cur = namePoints[i];
    var dist = Math.sqrt((cur.x - prev.x) * (cur.x - prev.x) + (cur.y - prev.y) * (cur.y - prev.y));
    if (dist <= 35) {
      nameLines.push({ x1: prev.x, y1: prev.y, x2: cur.x, y2: cur.y, delay: 600 + i * 60 });
    }
  }

  return (
    <View style={{ position: 'absolute', top: 8, left: 0, right: 0, height: constellationH, pointerEvents: 'none', zIndex: 2, overflow: 'visible' }}>
      {/* Constellation lines connecting nearby name stars */}
      {nameLines.map(function (line, i) {
        return <ConstellationLine key={'cl' + i} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} delay={line.delay} />;
      })}
      {/* Name star dots — staggered star-born animation */}
      {namePoints.map(function (p, i) {
        return (
          <ConstellationStar
            key={'ns' + i}
            x={p.x} y={p.y}
            delay={500 + i * 50}
            outerR={7} innerR={3} coreR={1.6}
            outerColor="#FBBF24" coreColor="#FFE8A0"
            outerOpacity={0.06} coreOpacity={0.85}
          />
        );
      })}
      {/* Date/time star dots — smaller, dimmer, after name stars */}
      {digitPoints.map(function (p, i) {
        return (
          <ConstellationStar
            key={'ds' + i}
            x={p.x} y={p.y}
            delay={800 + i * 40}
            outerR={4.5} innerR={2} coreR={0.9}
            outerColor="#FFD98E" coreColor="#FFE8A0"
            outerOpacity={0.05} coreOpacity={0.55}
          />
        );
      })}
    </View>
  );
}

// ── Vortex effect: star data spirals into the Lagna orb center ──
function StarVortex({ name, dateStr, timeStr }) {
  var allText = (name || '') + ' ' + (dateStr || '') + ' ' + (timeStr || '');
  var points = useMemo(function () {
    var pts = [];
    var upper = allText.toUpperCase().replace(/[^A-Z0-9: ]/g, '');
    var count = Math.min(upper.length * 3, 80);
    for (var i = 0; i < count; i++) {
      var angle = (i / count) * Math.PI * 8;  // More spiral revolutions
      var radius = 50 + (i / count) * 130;
      var STAR_COLORS = ['#FBBF24', '#FFD666', '#FF8C00', '#FFE8A0', '#FFA940', '#FFD98E'];
      pts.push({
        id: i,
        startX: SW / 2 + Math.cos(angle) * radius,
        startY: SH * 0.28 + Math.sin(angle) * radius * 0.55,
        char: i < upper.length ? upper[i] : '✦',
        delay: i * 30,
        color: STAR_COLORS[i % STAR_COLORS.length],
        size: i < upper.length ? (12 + Math.random() * 4) : (6 + Math.random() * 6),
      });
    }
    return pts;
  }, [allText]);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 998 }}>
      {points.map(function (p) {
        return <VortexParticle key={p.id} particle={p} />;
      })}
    </View>
  );
}

function VortexParticle({ particle }) {
  var opacity = useSharedValue(0);
  var posX = useSharedValue(particle.startX);
  var posY = useSharedValue(particle.startY);
  var scale = useSharedValue(0.3);
  var rotation = useSharedValue(0);

  useEffect(function () {
    // Pop in first
    opacity.value = withDelay(particle.delay,
      withTiming(0.9, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
    scale.value = withDelay(particle.delay,
      withSequence(
        withSpring(1.3, { damping: 6, stiffness: 200 }),
        withSpring(1, { damping: 10, stiffness: 150 })
      )
    );
    // Spiral inward with slight overshoot
    posX.value = withDelay(particle.delay + 200,
      withTiming(SW / 2, { duration: 2000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    );
    posY.value = withDelay(particle.delay + 200,
      withTiming(SH * 0.28, { duration: 2000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    );
    rotation.value = withDelay(particle.delay,
      withTiming(360, { duration: 2200, easing: Easing.inOut(Easing.cubic) })
    );
    // Shrink and fade at end
    scale.value = withDelay(particle.delay + 1200,
      withTiming(0, { duration: 1000, easing: Easing.in(Easing.cubic) })
    );
    opacity.value = withDelay(particle.delay + 1600,
      withTiming(0, { duration: 600 })
    );
  }, []);

  var style = useAnimatedStyle(function () {
    return {
      position: 'absolute',
      left: posX.value - particle.size / 2,
      top: posY.value - particle.size / 2,
      opacity: opacity.value,
      transform: [
        { scale: scale.value },
        { rotate: rotation.value + 'deg' },
      ],
    };
  });

  var isChar = particle.char !== '✦';
  return (
    <Animated.View style={style}>
      <Text style={{
        fontSize: particle.size,
        color: particle.color,
        fontWeight: '800',
        textAlign: 'center',
        ...textShadow(particle.color, { width: 0, height: 0 }, 12),
      }}>{particle.char}</Text>
    </Animated.View>
  );
}


// ═══════════════════════════════════════════════════════════════════════
//  STEP 4: BIRTH DATA — 4-page wizard
// ═══════════════════════════════════════════════════════════════════════

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

  var handleSubmit = async function () {
    if (displayName.trim().length < 2) { setError(T.nameError); setPage(0); return; }
    setLoading(true); setError('');
    try {
      var birthInfo = {};
      if (year && month !== null && day) {
        var h = parseInt(hour) || 12;
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        var m = parseInt(minute) || 0;
        var pad = function (n) { return n.toString().padStart(2, '0'); };
        var dateTime = parseInt(year) + '-' + pad(month + 1) + '-' + pad(parseInt(day)) + 'T' + pad(h) + ':' + pad(m) + ':00';
        birthInfo = {
          dateTime: dateTime,
          lat: selectedCity ? selectedCity.lat : 6.9271,
          lng: selectedCity ? selectedCity.lng : 79.8612,
          locationName: selectedCity ? (selectedCity.name + (selectedCity.country ? ', ' + selectedCity.country : '')) : 'Colombo',
          timezone: 'Asia/Colombo',
        };
      }
      var hasBirthData = Object.keys(birthInfo).length > 0;
      onComplete(displayName.trim(), hasBirthData ? birthInfo : null);
    } catch (e) { setError(T.saveFailed); }
    finally { setLoading(false); }
  };

  /* Progress bar */
  var renderProgress = function () {
    return (
      <View style={bd.progressRow}>
        {progressLabels.map(function (label, i) {
          var active = i <= page;
          var current = i === page;
          return (
            <TouchableOpacity
              key={i} style={bd.progressItem}
              onPress={function () { if (i < page) setPage(i); }}
              disabled={i >= page} activeOpacity={0.7}
            >
              <View style={[bd.progressLine, active && bd.progressLineActive, current && bd.progressLineCurrent]} />
              <Text style={[bd.progressLabel, active && bd.progressLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  /* PAGE 0: Name */
  var renderNamePage = function () {
    return (
      <Animated.View key="name" entering={FadeIn.duration(300)} style={{ flex: 1, justifyContent: 'space-between' }}>
        <View>
          <StepHeader title={T.nameTitle} subtitle={T.nameSubtitle} />
          <GlowCard style={{ marginTop: 12 }}>
            <Text style={g.inputLabel}>{T.nameLabel}</Text>
            <TextInput
              style={g.textInput}
              placeholder={T.namePlaceholder}
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={displayName}
              onChangeText={function (t) { setDisplayName(t); setError(''); }}
              autoFocus
              selectionColor="#FFB800"
            />
            {error && page === 0 ? <Text style={g.error}>{error}</Text> : null}
          </GlowCard>
        </View>
        <View style={{ marginBottom: 8 }}>
          <PrimaryButton
            label={T.continueBtn}
            onPress={function () { if (displayName.trim().length >= 2) setPage(1); else setError(T.nameError); }}
            disabled={displayName.trim().length < 2}
            icon="arrow-forward"
          />
        </View>
      </Animated.View>
    );
  };

  /* PAGE 1: Date */
  var renderDatePage = function () {
    return (
      <Animated.View key="date" entering={FadeIn.duration(300)} style={{ flex: 1, justifyContent: 'space-between' }}>
        <View>
          <StepHeader title={T.dateTitle} subtitle={T.dateSubtitle} />

          <GlowCard style={{ marginTop: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={g.inputLabel}>{T.yearLabel}</Text>
                <TextInput style={g.textInput} placeholder={T.yearPlaceholder} placeholderTextColor="rgba(255,255,255,0.2)" keyboardType="number-pad" value={year} onChangeText={setYear} maxLength={4} selectionColor="#FFB800" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={g.inputLabel}>{T.dayLabel}</Text>
                <TextInput style={g.textInput} placeholder={T.dayPlaceholder} placeholderTextColor="rgba(255,255,255,0.2)" keyboardType="number-pad" value={day} onChangeText={setDay} maxLength={2} selectionColor="#FFB800" />
              </View>
            </View>

            <Text style={[g.inputLabel, { marginTop: 12 }]}>{T.monthLabel}</Text>
            <View style={bd.monthGrid}>
              {T.months.map(function (m, i) {
                var sel = month === i;
                return (
                  <TouchableOpacity key={i} style={[bd.monthChip, sel && bd.monthChipSel]} onPress={function () { setMonth(i); }} activeOpacity={0.7}>
                    <Text style={[bd.monthText, sel && bd.monthTextSel]}>{m}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </GlowCard>
        </View>

        <View>
          <View style={bd.navRow}>
            <TouchableOpacity onPress={function () { setPage(0); }} style={bd.backBtn}>
              <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.5)" />
              <Text style={bd.backText}>{T.back}</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <PrimaryButton label={T.continueBtn} onPress={function () { setPage(2); }} icon="arrow-forward" />
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  /* PAGE 2: Time */
  var renderTimePage = function () {
    return (
      <Animated.View key="time" entering={FadeIn.duration(300)} style={{ flex: 1, justifyContent: 'space-between' }}>
        <View>
          <StepHeader title={T.timeTitle} subtitle={T.timeSubtitle} />

          <GlowCard style={{ marginTop: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={g.inputLabel}>{T.hourLabel}</Text>
                <TextInput style={[g.textInput, { textAlign: 'center', fontSize: 24, fontWeight: '700' }]} placeholder="12" placeholderTextColor="rgba(255,255,255,0.2)" keyboardType="number-pad" value={hour} onChangeText={setHour} maxLength={2} selectionColor="#06B6D4" />
              </View>
              <Text style={{ color: '#FFB800', fontSize: 32, fontWeight: '800', marginTop: 16 }}>:</Text>
              <View style={{ flex: 1 }}>
                <Text style={g.inputLabel}>{T.minuteLabel}</Text>
                <TextInput style={[g.textInput, { textAlign: 'center', fontSize: 24, fontWeight: '700' }]} placeholder="00" placeholderTextColor="rgba(255,255,255,0.2)" keyboardType="number-pad" value={minute} onChangeText={setMinute} maxLength={2} selectionColor="#06B6D4" />
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

          <Text style={[g.hint, { marginTop: 8 }]}>{'\uD83D\uDCA1'} {T.timeHint}</Text>
        </View>

        <View>
          <View style={bd.navRow}>
            <TouchableOpacity onPress={function () { setPage(1); }} style={bd.backBtn}>
              <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.5)" />
              <Text style={bd.backText}>{T.back}</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <PrimaryButton label={T.continueBtn} onPress={function () { setPage(3); }} icon="arrow-forward" />
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  /* PAGE 3: Place */
  var renderPlacePage = function () {
    return (
      <Animated.View key="place" entering={FadeIn.duration(300)} style={{ flex: 1, justifyContent: 'space-between' }}>
        <View>
          <StepHeader title={T.placeTitle} subtitle={T.placeSubtitle} />

          <View style={{ marginTop: 16 }}>
            <CitySearchPicker
              selectedCity={selectedCity}
              onSelect={function (city) { setSelectedCity(city); }}
              lang={lang}
              accentColor="#FFB800"
              maxHeight={180}
              placeholder={T.placeSearch}
            />
          </View>

          {selectedCity ? (
            <Animated.View entering={FadeInDown.duration(300)} style={bd.selectedCityBadge}>
              <Ionicons name="location" size={16} color="#FFB800" />
              <Text style={bd.selectedCityText}>
                {selectedCity.name}{selectedCity.country ? ', ' + selectedCity.country : ''}
              </Text>
              <Text style={bd.selectedCityCoords}>
                {selectedCity.lat.toFixed(4)}°, {selectedCity.lng.toFixed(4)}°
              </Text>
            </Animated.View>
          ) : null}

          <Text style={[g.hint, { marginTop: 6 }]}>{'\uD83C\uDF0D'} {T.placeHint}</Text>
        </View>

        <View>
          <View style={bd.navRow}>
            <TouchableOpacity onPress={function () { setPage(2); }} style={bd.backBtn}>
              <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.5)" />
              <Text style={bd.backText}>{T.back}</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <PrimaryButton label={T.completeSetup} onPress={handleSubmit} loading={loading} icon="checkmark-done" />
            </View>
          </View>
          <GhostButton label={T.skipBirth} onPress={handleSubmit} />
        </View>
      </Animated.View>
    );
  };

  // Build display strings for constellation
  var dateDisplay = (year || '') + (month !== null ? '-' + (month + 1) : '') + (day ? '-' + day : '');
  var timeDisplay = (hour || '') + (minute ? ':' + minute : '') + (hour ? ' ' + ampm : '');

  return (
    <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 0, paddingBottom: 8, position: 'relative' }}>
      {/* ✨ "Written in the Stars" — name & birth data as constellation */}
      <WrittenInTheStars name={displayName} dateStr={dateDisplay} timeStr={timeDisplay} page={page} />
      {/* Spacer to push form content below the constellation zone */}
      <View style={{ height: SH * 0.16 }} />
      {renderProgress()}
      {page === 0 ? renderNamePage()
        : page === 1 ? renderDatePage()
        : page === 2 ? renderTimePage()
        : renderPlacePage()}
    </View>
  );
}

var bd = StyleSheet.create({
  progressRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
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
  ampmSel: { backgroundColor: 'rgba(255,184,0,0.15)', borderColor: '#FFB800' },
  ampmText: { color: 'rgba(255,255,255,0.5)', fontSize: 17, fontWeight: '700' },
  ampmTextSel: { color: '#FFD666' },
  selectedCityBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginTop: 12, backgroundColor: 'rgba(255,184,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.2)' },
  selectedCityText: { color: '#FFD666', fontSize: 14, fontWeight: '600', flex: 1 },
  selectedCityCoords: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '500' },
  chartPreview: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, marginTop: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,140,0,0.15)' },
  chartPreviewIcon: { fontSize: 24 },
  chartPreviewText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500', fontStyle: 'italic', flex: 1 },
  navRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 },
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
};

var ZODIAC_ELEMENTS = {
  'Mesha': 'fire', 'Vrishabha': 'earth', 'Mithuna': 'air', 'Kataka': 'water',
  'Simha': 'fire', 'Kanya': 'earth', 'Tula': 'air', 'Vrischika': 'water',
  'Dhanus': 'fire', 'Makara': 'earth', 'Kumbha': 'air', 'Meena': 'water',
};

var ELEMENT_COLORS = {
  fire: ['#FF4500', '#FF8C00', '#FFD700'],
  earth: ['#8B6914', '#B8860B', '#DAA520'],
  air: ['#4A90D9', '#87CEEB', '#B0E0E6'],
  water: ['#1E90FF', '#00CED1', '#48D1CC'],
};

function LagnaRevealStep({ birthData, displayName, onContinue, lang }) {
  var T = OB[lang] || OB.en;
  var [phase, setPhase] = useState('loading');
  var [chartData, setChartData] = useState(null);
  var [error, setError] = useState('');

  // Animations
  var orbGlow = useSharedValue(0);
  var orbScale = useSharedValue(0.2);
  var orbRotate = useSharedValue(0);
  var ringScale1 = useSharedValue(0);
  var ringScale2 = useSharedValue(0);
  var ringScale3 = useSharedValue(0);
  var symbolScale = useSharedValue(0);
  var symbolRotate = useSharedValue(-180);
  var detailsOpacity = useSharedValue(0);
  var shimmerX = useSharedValue(-1);
  var particleAngle = useSharedValue(0);

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
          // Start reveal animation after a dramatic pause
          setTimeout(function () { setPhase('reveal'); }, 2200);
        } else {
          setPhase('skip');
        }
      } catch (e) {
        console.warn('Lagna fetch failed:', e);
        setPhase('skip');
      }
    };
    fetchChart();
  }, []);

  // Loading phase animations
  useEffect(function () {
    orbGlow.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true);
    orbScale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }),
        withTiming(0.85, { duration: 1000, easing: Easing.inOut(Easing.sin) })
      ), -1, true
    );
    orbRotate.value = withRepeat(withTiming(360, { duration: 20000, easing: Easing.linear }), -1, false);
    ringScale1.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 2500, easing: Easing.out(Easing.cubic) }),
        withTiming(0.8, { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ), -1, true
    );
    ringScale2.value = withDelay(500, withRepeat(
      withSequence(
        withTiming(1.4, { duration: 3000, easing: Easing.out(Easing.cubic) }),
        withTiming(0.7, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ), -1, true
    ));
    ringScale3.value = withDelay(1000, withRepeat(
      withSequence(
        withTiming(1.5, { duration: 3500, easing: Easing.out(Easing.cubic) }),
        withTiming(0.6, { duration: 3500, easing: Easing.inOut(Easing.sin) })
      ), -1, true
    ));
    particleAngle.value = withRepeat(withTiming(360, { duration: 8000, easing: Easing.linear }), -1, false);
    shimmerX.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.linear }), -1, false);
  }, []);

  // Reveal phase animations
  useEffect(function () {
    if (phase === 'reveal') {
      symbolScale.value = withSequence(
        withDelay(200, withSpring(1.4, { damping: 6, stiffness: 150 })),
        withSpring(1, { damping: 10, stiffness: 120 })
      );
      symbolRotate.value = withDelay(200, withSpring(0, { damping: 12, stiffness: 80 }));
      detailsOpacity.value = withDelay(1200, withTiming(1, { duration: 800 }));
    }
  }, [phase]);

  var orbStyle = useAnimatedStyle(function () {
    return {
      transform: [{ scale: orbScale.value }],
      opacity: interpolate(orbGlow.value, [0, 1], [0.6, 1]),
    };
  });
  var ring1Style = useAnimatedStyle(function () {
    return {
      transform: [{ scale: ringScale1.value }, { rotate: orbRotate.value + 'deg' }],
      opacity: interpolate(ringScale1.value, [0.8, 1.3], [0.4, 0.1]),
    };
  });
  var ring2Style = useAnimatedStyle(function () {
    return {
      transform: [{ scale: ringScale2.value }, { rotate: -orbRotate.value * 0.7 + 'deg' }],
      opacity: interpolate(ringScale2.value, [0.7, 1.4], [0.3, 0.05]),
    };
  });
  var ring3Style = useAnimatedStyle(function () {
    return {
      transform: [{ scale: ringScale3.value }, { rotate: orbRotate.value * 0.4 + 'deg' }],
      opacity: interpolate(ringScale3.value, [0.6, 1.5], [0.2, 0.02]),
    };
  });
  var symbolStyle = useAnimatedStyle(function () {
    return {
      transform: [{ scale: symbolScale.value }, { rotate: symbolRotate.value + 'deg' }],
    };
  });
  var detailStyle = useAnimatedStyle(function () {
    return { opacity: detailsOpacity.value };
  });

  var makeParticle = function (idx, count) {
    var angle = (360 / count) * idx;
    return useAnimatedStyle(function () {
      var a = ((particleAngle.value + angle) * Math.PI) / 180;
      var r = 70;
      return {
        position: 'absolute',
        left: Math.cos(a) * r,
        top: Math.sin(a) * r,
        opacity: interpolate(orbGlow.value, [0, 1], [0.2, 0.8]),
      };
    });
  };

  var p0 = makeParticle(0, 8);
  var p1 = makeParticle(1, 8);
  var p2 = makeParticle(2, 8);
  var p3 = makeParticle(3, 8);
  var p4 = makeParticle(4, 8);
  var p5 = makeParticle(5, 8);
  var p6 = makeParticle(6, 8);
  var p7 = makeParticle(7, 8);
  var particles = [p0, p1, p2, p3, p4, p5, p6, p7];

  // Auto-skip if no birth data
  useEffect(function () {
    if (phase === 'skip') {
      var t = setTimeout(function () { onContinue(); }, 500);
      return function () { clearTimeout(t); };
    }
  }, [phase]);

  // Skip directly if no birth data
  if (phase === 'skip') {
    return (
      <View style={g.center}>
        <CosmicLoader size={56} color="#FFB800" text={T.completeLoading} textColor="#FFD666" />
      </View>
    );
  }

  // Build date/time strings for vortex
  var vortexDate = birthData ? (birthData.dateTime || '').split('T')[0] : '';
  var vortexTime = birthData ? (birthData.dateTime || '').split('T')[1] || '' : '';

  // Loading phase
  if (phase === 'loading') {
    return (
      <View style={g.center}>
        {/* ✨ Star vortex — name & birth data spiral into the center */}
        <StarVortex name={displayName || ''} dateStr={vortexDate} timeStr={vortexTime} />
        <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}>
          {/* Pulsing orbital rings */}
          <Animated.View style={[lr.ring, { width: 200, height: 200, borderRadius: 100, borderColor: '#FFB800' }, ring1Style]} />
          <Animated.View style={[lr.ring, { width: 170, height: 170, borderRadius: 85, borderColor: '#FF8C00' }, ring2Style]} />
          <Animated.View style={[lr.ring, { width: 140, height: 140, borderRadius: 70, borderColor: '#FFD54F' }, ring3Style]} />

          {/* Orbiting particles */}
          {particles.map(function (pStyle, i) {
            return (
              <Animated.View key={i} style={pStyle}>
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFB800' }} />
              </Animated.View>
            );
          })}

          {/* Central orb */}
          <Animated.View style={[lr.centerOrb, orbStyle]}>
            <LinearGradient
              colors={['#FFD54F', '#FFB800', '#FF8C00', '#E65100']}
              style={lr.centerOrbGrad}
              start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
            >
              <Text style={lr.centerOrbEmoji}>{'\u2728'}</Text>
            </LinearGradient>
          </Animated.View>
        </View>

        <Animated.Text entering={FadeIn.delay(300).duration(600)} style={lr.loadingTitle}>{T.revealLoading}</Animated.Text>
        <Animated.Text entering={FadeIn.delay(700).duration(600)} style={lr.loadingSub}>{T.revealLoadingSub}</Animated.Text>

        {/* Animated dots */}
        <View style={lr.dotsRow}>
          {[0, 1, 2].map(function (i) {
            return (
              <Animated.View key={i} entering={FadeIn.delay(1000 + i * 200).duration(400)} style={lr.dot}>
                <LinearGradient colors={['#FFB800', '#FF8C00']} style={lr.dotGrad} />
              </Animated.View>
            );
          })}
        </View>
      </View>
    );
  }

  // Reveal phase
  if (phase === 'reveal' && chartData) {
    var lagna = chartData.lagna || {};
    var lagnaDetails = chartData.lagnaDetails || {};
    var moonSign = chartData.moonSign || {};
    var sunSign = chartData.sunSign || {};
    var nakshatra = chartData.nakshatra || {};
    var personality = chartData.personality || {};
    var element = ZODIAC_ELEMENTS[lagna.name] || 'fire';
    var elemColors = ELEMENT_COLORS[element];
    var zodiacSymbol = ZODIAC_SYMBOLS[lagna.name] || '⭐';
    var lagnaName = lang === 'si' ? (lagna.sinhala || lagna.english) : (lagna.english || lagna.name);
    var lagnaSubname = lang === 'si' ? (lagnaDetails.english || lagna.english) : (lagnaDetails.sinhala || lagna.sinhala);
    var moonName = lang === 'si' ? (moonSign.sinhala || moonSign.english) : (moonSign.english || moonSign.name);
    var sunName = lang === 'si' ? (sunSign.sinhala || sunSign.english) : (sunSign.english || sunSign.name);
    var nakshatraName = nakshatra.name || '';
    var nakshatraSinhala = nakshatra.sinhala || '';
    var lagnaDesc = lang === 'si' ? (lagnaDetails.descriptionSi || lagnaDetails.description || '') : (lagnaDetails.description || '');
    var traits = lang === 'si' ? (lagnaDetails.traitsSi || lagnaDetails.traits || []) : (lagnaDetails.traits || []);

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 4, paddingBottom: 60, justifyContent: 'space-between' }} showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never">
        {/* Top: Lagna reveal orb + name */}
        <View>
          <View style={lr.revealCenter}>
            <View style={{ width: 140, height: 140, alignItems: 'center', justifyContent: 'center' }}>
              {/* Ambient rings */}
              <Animated.View style={[lr.ring, { width: 140, height: 140, borderRadius: 70, borderColor: elemColors[0] }, ring1Style]} />
              <Animated.View style={[lr.ring, { width: 120, height: 120, borderRadius: 60, borderColor: elemColors[1] }, ring2Style]} />

              {/* Orbiting particles */}
              {particles.map(function (pStyle, i) {
                return (
                  <Animated.View key={i} style={pStyle}>
                    <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: elemColors[2] }} />
                  </Animated.View>
                );
              })}

              {/* Zodiac symbol */}
              <Animated.View style={[lr.symbolOrb, symbolStyle]}>
                <LinearGradient
                  colors={[elemColors[2], elemColors[1], elemColors[0]]}
                  style={lr.symbolOrbGrad}
                  start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0.30)', 'rgba(255,255,255,0.05)', 'transparent']}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', borderTopLeftRadius: 50, borderTopRightRadius: 50 }}
                    start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
                  />
                  <Text style={lr.zodiacSymbol}>{zodiacSymbol}</Text>
                </LinearGradient>
              </Animated.View>
            </View>

            {/* Lagna name */}
            <Animated.View entering={FadeInDown.delay(600).duration(500)} style={lr.lagnaNameWrap}>
              <Text style={lr.revealLabel}>{T.revealYourLagna}</Text>
              <Text style={[lr.lagnaName, { color: elemColors[1] }]}>{lagnaName}</Text>
              {lagnaSubname ? <Text style={lr.lagnaSubname}>{lagnaSubname}</Text> : null}
            </Animated.View>
          </View>

          {/* Three sign cards — Moon, Nakshatra, Sun */}
          <Animated.View entering={FadeInDown.delay(900).duration(500)} style={lr.tripleRow}>
            <View style={lr.tripleCard}>
              <Text style={lr.tripleEmoji}>{ZODIAC_SYMBOLS[moonSign.name] || '🌙'}</Text>
              <Text style={lr.tripleLabel}>{T.revealMoonSign}</Text>
              <Text style={lr.tripleValue}>{moonName}</Text>
            </View>
            <View style={[lr.tripleCard, lr.tripleCardCenter]}>
              <Text style={lr.tripleEmoji}>{'\u2B50'}</Text>
              <Text style={lr.tripleLabel}>{T.revealNakshatra}</Text>
              <Text style={lr.tripleValue}>{lang === 'si' ? (nakshatraSinhala || nakshatraName) : nakshatraName}</Text>
            </View>
            <View style={lr.tripleCard}>
              <Text style={lr.tripleEmoji}>{ZODIAC_SYMBOLS[sunSign.name] || '☀️'}</Text>
              <Text style={lr.tripleLabel}>{T.revealSunSign}</Text>
              <Text style={lr.tripleValue}>{sunName}</Text>
            </View>
          </Animated.View>

          {/* Traits chips */}
          {traits.length > 0 ? (
            <Animated.View entering={FadeInDown.delay(1200).duration(500)} style={{ marginTop: 14 }}>
              <Text style={lr.sectionTitle}>{T.revealTraits}</Text>
              <View style={lr.traitsWrap}>
                {traits.slice(0, 6).map(function (trait, i) {
                  return (
                    <Animated.View key={i} entering={FadeInDown.delay(1300 + i * 80).duration(250)} style={lr.traitChip}>
                      <LinearGradient
                        colors={['rgba(255,184,0,0.12)', 'rgba(255,140,0,0.06)']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      />
                      <Text style={lr.traitText}>{trait}</Text>
                    </Animated.View>
                  );
                })}
              </View>
            </Animated.View>
          ) : null}

          {/* Lucky details row */}
          {lagnaDetails.gem || lagnaDetails.luckyColor || lagnaDetails.luckyDay ? (
            <Animated.View entering={FadeInDown.delay(1500).duration(500)} style={lr.luckyRow}>
              {lagnaDetails.gem ? (
                <View style={lr.luckyItem}>
                  <Text style={lr.luckyEmoji}>{'\uD83D\uDC8E'}</Text>
                  <Text style={lr.luckyLabel}>{T.revealGem}</Text>
                  <Text style={lr.luckyValue}>{lagnaDetails.gem}</Text>
                </View>
              ) : null}
              {lagnaDetails.luckyColor ? (
                <View style={lr.luckyItem}>
                  <Text style={lr.luckyEmoji}>{'\uD83C\uDFA8'}</Text>
                  <Text style={lr.luckyLabel}>{T.revealColor}</Text>
                  <Text style={lr.luckyValue}>{lagnaDetails.luckyColor}</Text>
                </View>
              ) : null}
              {lagnaDetails.luckyDay ? (
                <View style={lr.luckyItem}>
                  <Text style={lr.luckyEmoji}>{'\uD83D\uDCC5'}</Text>
                  <Text style={lr.luckyLabel}>{T.revealDay}</Text>
                  <Text style={lr.luckyValue}>{lagnaDetails.luckyDay}</Text>
                </View>
              ) : null}
            </Animated.View>
          ) : null}
        </View>

        {/* Bottom: Continue button */}
        <Animated.View entering={FadeInUp.delay(1800).duration(600)} style={{ marginTop: 8 }}>
          <PrimaryButton label={T.revealContinue} onPress={onContinue} icon="rocket" />
          <GhostButton label={T.revealSkip} onPress={onContinue} />
        </Animated.View>
      </ScrollView>
    );
  }

  // Fallback
  return (
    <View style={g.center}>
      <CosmicLoader size={56} color="#FFB800" />
    </View>
  );
}

var lr = StyleSheet.create({
  ring: { position: 'absolute', borderWidth: 1.5, borderStyle: 'dashed' },
  centerOrb: { width: 80, height: 80, borderRadius: 40, overflow: 'hidden', ...boxShadow('#FFB800', { width: 0, height: 0 }, 0.8, 30), elevation: 0 },
  centerOrbGrad: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 40 },
  centerOrbEmoji: { fontSize: 36 },
  loadingTitle: { fontSize: 22, fontWeight: '800', color: '#FFD666', textAlign: 'center', marginTop: 32, ...textShadow('rgba(255,184,0,0.4)', { width: 0, height: 0 }, 12) },
  loadingSub: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 8 },
  dotsRow: { flexDirection: 'row', gap: 8, marginTop: 24, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, overflow: 'hidden' },
  dotGrad: { width: '100%', height: '100%' },
  revealCenter: { alignItems: 'center', marginBottom: 4 },
  symbolOrb: { width: 90, height: 90, borderRadius: 45, overflow: 'hidden', ...boxShadow('#FFB800', { width: 0, height: 0 }, 0.9, 35), elevation: 0 },
  symbolOrbGrad: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 45 },
  zodiacSymbol: { fontSize: 42, color: '#FFF1D0', ...textShadow('rgba(0,0,0,0.5)', { width: 0, height: 2 }, 8) },
  lagnaNameWrap: { alignItems: 'center', marginTop: 10 },
  revealLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 },
  lagnaName: { fontSize: 28, fontWeight: '900', letterSpacing: 1, ...textShadow('rgba(255,184,0,0.5)', { width: 0, height: 0 }, 16) },
  lagnaSubname: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.35)', marginTop: 1 },
  tripleRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  tripleCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  tripleCardCenter: { borderColor: 'rgba(255,184,0,0.15)', backgroundColor: 'rgba(255,184,0,0.04)' },
  tripleEmoji: { fontSize: 20, marginBottom: 4 },
  tripleLabel: { fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  tripleValue: { fontSize: 12, fontWeight: '700', color: '#FFD666', textAlign: 'center' },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' },
  traitsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  traitChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,184,0,0.15)', overflow: 'hidden' },
  traitText: { fontSize: 11, fontWeight: '600', color: '#FFD666' },
  luckyRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  luckyItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  luckyEmoji: { fontSize: 18, marginBottom: 3 },
  luckyLabel: { fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2, textAlign: 'center' },
  luckyValue: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.65)', textAlign: 'center' },
});


// ═══════════════════════════════════════════════════════════════════════
//  STEP 5: COMPLETE
// ═══════════════════════════════════════════════════════════════════════

function CompleteStep({ lang, onDone }) {
  var T = OB[lang] || OB.en;
  var scale = useSharedValue(0.3);
  var rotate = useSharedValue(0);
  var ringPulse = useSharedValue(0);
  var confetti1 = useSharedValue(0);
  var confetti2 = useSharedValue(0);
  var confetti3 = useSharedValue(0);

  useEffect(function () {
    scale.value = withSequence(
      withSpring(1.3, { damping: 8, stiffness: 180 }),
      withSpring(1, { damping: 12, stiffness: 120 })
    );
    rotate.value = withRepeat(withTiming(360, { duration: 12000, easing: Easing.linear }), -1, false);
    ringPulse.value = withRepeat(withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }), -1, true);
    confetti1.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.linear }), -1, false);
    confetti2.value = withDelay(500, withRepeat(withTiming(1, { duration: 3500, easing: Easing.linear }), -1, false));
    confetti3.value = withDelay(1000, withRepeat(withTiming(1, { duration: 2800, easing: Easing.linear }), -1, false));

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

export default function OnboardingScreen({ onComplete }) {
  var [step, setStep] = useState(-1);
  var { language: ctxLang, switchLanguage } = useLanguage();
  var { completeOnboarding } = useAuth();
  var [lang, setLang] = useState(ctxLang || 'si');
  var [birthData, setBirthData] = useState(null);
  var [displayName, setDisplayName] = useState('');
  var insets = useSafeAreaInsets();

  var handleLanguageSelect = function (selectedLang) {
    setLang(selectedLang);
    switchLanguage(selectedLang);
    setStep(0);
  };

  var handleBirthDataComplete = function (name, data) {
    setDisplayName(name);
    setBirthData(data);
    setStep(4);
  };

  var handleLagnaRevealDone = async function () {
    try {
      await completeOnboarding(displayName, birthData, lang);
    } catch (e) {
      console.warn('completeOnboarding failed:', e);
    }
    setStep(5);
  };

  var TOTAL_MAIN_STEPS = 6;

  var renderStep = function () {
    switch (step) {
      case -1: return <LanguageStep onSelect={handleLanguageSelect} />;
      case 0: return <WelcomeStep onContinue={function () { setStep(1); }} onBack={function () { setStep(-1); }} lang={lang} />;
      case 1: return <GoogleSignInStep onContinue={function () { setStep(2); }} onBack={function () { setStep(0); }} lang={lang} />;
      case 2: return <SubscriptionStep onContinue={function () { setStep(3); }} lang={lang} />;
      case 3: return <BirthDataStep onComplete={handleBirthDataComplete} lang={lang} />;
      case 4: return <LagnaRevealStep birthData={birthData} displayName={displayName} onContinue={handleLagnaRevealDone} lang={lang} />;
      case 5: return <CompleteStep lang={lang} onDone={onComplete} />;
      default: return <LanguageStep onSelect={handleLanguageSelect} />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: 'transparent', overflow: 'hidden' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={{ flex: 1, paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 12), overflow: 'hidden' }}>
          {step >= 0 ? (
            <View style={{ paddingHorizontal: 24, paddingTop: 4 }}>
              <StepProgressBar current={step} total={TOTAL_MAIN_STEPS} lang={lang} />
            </View>
          ) : null}
          {renderStep()}
        </View>
      </KeyboardAvoidingView>
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
  primaryBtn: { borderRadius: 16, overflow: 'hidden', ...boxShadow('#FF8C00', { width: 0, height: 4 }, 1, 20), elevation: 0 },
  primaryGrad: { paddingVertical: 14, minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingHorizontal: 16 },
  primaryText: { fontSize: 16, fontWeight: '800', color: '#FFF1D0', letterSpacing: 0.8, textAlign: 'center', flexShrink: 1, ...textShadow('rgba(0,0,0,0.3)', { width: 0, height: 1 }, 4) },
  ghostBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  ghostText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '500' },
  error: { color: '#FF6B6B', fontSize: 12, marginTop: 8, textAlign: 'center', fontWeight: '500' },
  hint: { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 12, lineHeight: 17 },
});
