/**
 * Onboarding Flow — Mobile-First Cosmic Design
 * Step -1: Language Selection (Sinhala / English)
 * Step 0:  Welcome
 * Step 1:  Phone Number
 * Step 2:  OTP Verification
 * Step 3:  Subscription
 * Step 4:  Birth Data (multi-page wizard: Name → Date → Time → Place)
 * Step 5:  Complete
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Platform,
  Dimensions, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView,
  StatusBar, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown, FadeInUp, FadeIn,
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withSpring, withSequence, withDelay, interpolate, Easing,
} from 'react-native-reanimated';
import CosmicBackground from '../components/CosmicBackground';
import SpringPressable from '../components/effects/SpringPressable';
import CosmicLoader from '../components/effects/CosmicLoader';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { BASE } from '../services/api';

var { width: SW, height: SH } = Dimensions.get('window');
var LOGO = require('../assets/logo.png');

// ═══════════════════════════════════════════════════════════════════════
//  TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════

var OB = {
  en: {
    welcomeSubtitle: "Sri Lanka's #1 Astrology App",
    welcomeDesc: "Your personal Vedic astrologer\nDaily Palapala & Kendara Balima\nPorondam Galapima & Full Life Report",
    welcomeBtn: "Begin Your Cosmic Journey",
    welcomeHint: "Only LKR 8/day from your mobile credit \u2014 required for access",
    phoneTitle: "Your Phone Number",
    phoneSubtitle: "We'll send a verification code via SMS",
    phonePlaceholder: "7X XXX XXXX",
    phoneError: "Please enter a valid phone number",
    phoneNetwork: "Dialog \u2022 Mobitel \u2022 Hutch \u2022 Airtel",
    phoneSendOtp: "Send OTP",
    phoneFailedOtp: "Failed to send OTP",
    otpTitle: "Verification Code",
    otpSubtitle: "We sent a code to",
    otpError: "Please enter the OTP code",
    otpResend: "Resend Code",
    otpHint: "Code valid for 60 minutes",
    otpVerify: "Verify & Continue",
    otpFailed: "Verification failed. Try resending the code.",
    otpResendFailed: "Failed to resend OTP",
    otpDevLabel: "\uD83E\uDDEA Dev Mode OTP:",
    subTitle: "Unlock Premium",
    subSubtitle: "Full access to all cosmic features",
    subFeature1: "Daily, Weekly & Monthly Palapala",
    subFeature2: "Full Vedic Birth Chart (Kendara)",
    subFeature3: "Marriage Compatibility (Porondam)",
    subFeature4: "Complete Life Report with AI",
    subFeature5: "Daily Nakath & Rahu Alerts",
    subFeature6: "Personalised Predictions",
    subPerDay: "/day",
    subNote: "Charged from mobile credit",
    subNetworks: "Dialog \u2022 Mobitel \u2022 Hutch \u2022 Airtel",
    subBtn: "Subscribe \u2014 LKR 8/day",
    subPayFail: "Payment failed. Please ensure you have enough credit.",
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
    placeSubtitle: "Select your birth city",
    placeSearch: "Search city...",
    placeHint: "Birth location affects your Ascendant.\nDefault: Colombo",
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
    months: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  },
  si: {
    welcomeSubtitle: "\u0dbd\u0d82\u0d9a\u0dcf\u0dc0\u0dda \u0d85\u0d82\u0d9a 1 \u0da2\u0dca\u200d\u0dba\u0ddd\u0dad\u0dd2\u0dc2 App \u0d91\u0d9a \uD83C\uDDF1\uD83C\uDDF0",
    welcomeDesc: "ඔයාගේම පෞද්ගලික ජ්‍යෝතිෂවේදියා \uD83D\uDD2E\nපලාපල \u2022 කේන්දරේ \u2022 පොරොන්දම්",
    welcomeBtn: "\u0dc0\u0dd0\u0da9\u0dda \u0db4\u0da7\u0db1\u0dca \u0d9c\u0db1\u0dca\u0db1",
    welcomeHint: "\u0daf\u0dc0\u0dc3\u0da7 \u0dbb\u0dd4. 8\u0dba\u0dd2 (\u0d9c\u0dcf\u0dab \u0d85\u0da9\u0dd4 \u0d9a\u0dc5\u0dcf)",
    phoneTitle: "\u0d94\u0dba\u0dcf\u0d9c\u0dda \u0dc6\u0ddd\u0db1\u0dca \u0db1\u0db8\u0dca\u0db6\u0dbb\u0dca",
    phoneSubtitle: "SMS \u0d91\u0d9a\u0d9a\u0dd2\u0db1\u0dca \u0d9a\u0ddd\u0da9\u0dca \u0d91\u0d9a\u0d9a\u0dca \u0d91\u0dc0\u0db1\u0dc0\u0dcf",
    phonePlaceholder: "07X XXX XXXX",
    phoneError: "\u0db1\u0db8\u0dca\u0db6\u0dbb\u0dca \u0d91\u0d9a \u0db4\u0ddc\u0da9\u0dca\u0da9\u0d9a\u0dca \u0dc0\u0dd0\u0dbb\u0daf\u0dd2\u0dba\u0dd2 \u0dc0\u0d9c\u0dda",
    phoneNetwork: "Dialog \u2022 Mobitel \u2022 Hutch \u2022 Airtel \uD83D\uDCF6",
    phoneSendOtp: "OTP \u0d91\u0dc0\u0db1\u0dca\u0db1",
    phoneFailedOtp: "OTP \u0d86\u0dc0\u0dda \u0db1\u0dd1. \u0d86\u0dba\u0dd2 \u0db6\u0dbd\u0db8\u0dd4.",
    otpTitle: "\u0d9a\u0ddd\u0da9\u0dca \u0d91\u0d9a \u0d9c\u0dc4\u0db1\u0dca\u0db1",
    otpSubtitle: "SMS \u0d91\u0d9a\u0d9a\u0dca \u0daf\u0dd0\u0db8\u0dca\u0db8\u0dcf:",
    otpError: "\u0d9a\u0ddd\u0da9\u0dca \u0d91\u0d9a \u0dc0\u0dd0\u0dbb\u0daf\u0dd2\u0dba\u0dd2 \u0dc0\u0d9c\u0dda",
    otpResend: "\u0d86\u0dba\u0dd2 \u0d91\u0dc0\u0db1\u0dca\u0db1",
    otpHint: "\u0dc0\u0dd2\u0db1\u0dcf\u0da9\u0dd2\u0dba\u0d9a\u0dca \u0d87\u0dad\u0dd4\u0dbd\u0dad \u0d9c\u0dc4\u0db1\u0dca\u0db1",
    otpVerify: "\u0dc4\u0dbb\u0dd2, \u0d89\u0dc3\u0dca\u0dc3\u0dbb\u0dc4\u0da7 \u0dba\u0db8\u0dd4",
    otpFailed: "\u0dc0\u0dd0\u0da9\u0dda \u0dc4\u0dbb\u0dd2\u0d9c\u0dd2\u0dba\u0dda \u0db1\u0dd1. \u0d86\u0dba\u0dd2 \u0db6\u0dbd\u0db1\u0dca\u0db1.",
    otpResendFailed: "\u0d9a\u0ddd\u0da9\u0dca \u0d91\u0d9a \u0d91\u0dc0\u0db1\u0dca\u0db1 \u0db6\u0dd0\u0dbb\u0dd2 \u0dc0\u0dd4\u0db1\u0dcf",
    otpDevLabel: "\uD83E\uDDEA \u0da7\u0dd9\u0dc3\u0dca\u0da7\u0dca \u0d9a\u0ddd\u0da9\u0dca:",
    subTitle: "Premium \u0daf\u0dcf\u0d9c\u0db1\u0dca\u0db1 \uD83D\uDC51",
    subSubtitle: "\u0d85\u0db1\u0dcf\u0d9c\u0dad\u0dda \u0d9c\u0dd0\u0db1 \u0d94\u0d9a\u0dca\u0d9a\u0ddc\u0db8 \u0daf\u0dd0\u0db1\u0d9c\u0db1\u0dca\u0db1",
    subFeature1: "\u0dc4\u0dd0\u0db8\u0daf\u0dcf\u0db8 \u0d89\u0daf\u0dda\u0da7 \u0d91\u0db1 \u0db4\u0dbd\u0dcf\u0db4\u0dbd",
    subFeature2: "\u0dc3\u0db8\u0dca\u0db4\u0dd6\u0dbb\u0dca\u0dab \u0d9a\u0dda\u0db1\u0dca\u0daf\u0dbb\u0dda",
    subFeature3: "\u0db4\u0ddc\u0dbb\u0ddc\u0db1\u0dca\u0daf\u0db8\u0dca \u0d9c\u0dd0\u0dbd\u0db4\u0dd3\u0db8",
    subFeature4: "AI \u0d91\u0d9a\u0dd9\u0db1\u0dca \u0d85\u0dc4\u0dbd\u0dcf \u0daf\u0dd0\u0db1\u0d9c\u0db1\u0dca\u0db1",
    subFeature5: "\u0db1\u0dd0\u0d9a\u0dd0\u0dad\u0dca \u0dc3\u0dc4 \u0dbb\u0dcf\u0dc4\u0dd4 \u0d9a\u0dcf\u0dbd\u0dda",
    subFeature6: "\u0d94\u0dba\u0dcf\u0da7\u0db8 \u0dc4\u0dbb\u0dd2\u0dba\u0db1 \u0d85\u0db1\u0dcf\u0dc0\u0dd0\u0d9a\u0dd2",
    subPerDay: "/\u0daf\u0dc0\u0dc3\u0da7",
    subNote: "\u0dc6\u0ddd\u0db1\u0dca \u0db6\u0dd2\u0dbd\u0da7 \u0d91\u0d9a\u0dad\u0dd4 \u0dc0\u0dd9\u0db1\u0dc0\u0dcf \u26A1",
    subNetworks: "Dialog \u2022 Mobitel \u2022 Hutch \u2022 Airtel",
    subBtn: "\u0d87\u0d9a\u0dca\u0da7\u0dd2\u0dc0\u0dca \u0d9a\u0dbb\u0d9c\u0db1\u0dca\u0db1 \u2014 \u0daf\u0dc0\u0dc3\u0da7 \u0dbb\u0dd4. 8",
    subPayFail: "\u0dc3\u0dbd\u0dca\u0dbd\u0dd2 \u0d9a\u0dd0\u0db4\u0dd4\u0db1\u0dda \u0db1\u0dd1. \u0d9a\u0dca\u200d\u0dbb\u0dd9\u0da9\u0dd2\u0da7\u0dca \u0d89\u0dc0\u0dbb\u0daf \u0db6\u0dbd\u0db1\u0dca\u0db1.",
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
    placeSubtitle: "\u0dbb\u0ddd\u0dc4\u0dbd \u0dad\u0dd2\u0db6\u0dd4\u0db1 \u0db1\u0d9c\u0dbb\u0dba",
    placeSearch: "\u0da7\u0dc0\u0dd4\u0db8\u0dda \u0db1\u0db8 \u0d9c\u0dc4\u0db1\u0dca\u0db1...",
    placeHint: "\u0d89\u0db4\u0daf\u0dd4\u0db1 \u0dad\u0dd0\u0db1 \u0d85\u0db1\u0dd4\u0dc0\u0dad\u0dca \u0d9a\u0dda\u0db1\u0dca\u0daf\u0dbb\u0dda \u0dc0\u0dd9\u0db1\u0dc3\u0dca \u0dc0\u0dd9\u0db1\u0dc0\u0dcf.\n\u0daf\u0db1\u0dca\u0db1\u0dda \u0db1\u0dd0\u0dad\u0dca\u0db1\u0db8\u0dca Colombo \u0daf\u0dcf\u0db1\u0dca\u0db1.",
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
    months: ["\u0da2\u0db1","\u0db4\u0dd9\u0db6","\u0db8\u0dcf\u0dbb\u0dca","\u0d85\u0db4\u0dca\u200d","\u0db8\u0dd0","\u0da2\u0dd6","\u0da2\u0dd6\u0dbd\u0dd2","\u0d85\u0d9c\u0ddd","\u0dc3\u0dd0\u0db4\u0dca","\u0d94\u0d9a\u0dca","\u0db1\u0ddc","\u0daf\u0dd9"],
  },
};

var SL_CITIES = [
  { name: 'Colombo', si: '\u0d9a\u0ddc\u0dc5\u0db9', lat: 6.9271, lng: 79.8612 },
  { name: 'Kandy', si: '\u0db8\u0dc4\u0db1\u0dd4\u0dc0\u0dbb', lat: 7.2906, lng: 80.6337 },
  { name: 'Galle', si: '\u0d9c\u0dcf\u0dbd\u0dca\u0dbd', lat: 6.0535, lng: 80.2210 },
  { name: 'Jaffna', si: '\u0dba\u0dcf\u0db4\u0db1\u0dba', lat: 9.6615, lng: 80.0255 },
  { name: 'Matara', si: '\u0db8\u0dcf\u0dad\u0dbb', lat: 5.9549, lng: 80.5350 },
  { name: 'Negombo', si: '\u0db8\u0dd3\u0d9c\u0db8\u0dd4\u0dc0', lat: 7.2089, lng: 79.8400 },
  { name: 'Anuradhapura', si: '\u0d85\u0db1\u0dd4\u0dbb\u0dcf\u0db0\u0db4\u0dd4\u0dbb', lat: 8.3114, lng: 80.4037 },
  { name: 'Kurunegala', si: '\u0d9a\u0dd4\u0dbb\u0dd4\u0dab\u0dd1\u0d9c\u0dbd', lat: 7.4863, lng: 80.3647 },
  { name: 'Ratnapura', si: '\u0dbb\u0dad\u0dca\u0db1\u0db4\u0dd4\u0dbb', lat: 6.6828, lng: 80.3992 },
  { name: 'Badulla', si: '\u0db6\u0daf\u0dd4\u0dbd\u0dca\u0dbd', lat: 6.9934, lng: 81.0550 },
  { name: 'Trincomalee', si: '\u0dad\u0dca\u200d\u0dbb\u0dd2\u0d9a\u0dd4\u0dab\u0dcf\u0db8\u0dbd\u0dba', lat: 8.5874, lng: 81.2152 },
  { name: 'Batticaloa', si: '\u0db8\u0da9\u0d9a\u0dbd\u0db4\u0dd4\u0dc0', lat: 7.7310, lng: 81.6934 },
  { name: 'Nuwara Eliya', si: '\u0db1\u0dd4\u0dc0\u0dbb\u0d91\u0dc5\u0dd2\u0dba', lat: 6.9497, lng: 80.7891 },
  { name: 'Hambantota', si: '\u0dc4\u0db8\u0dca\u0db6\u0db1\u0dca\u0dad\u0ddc\u0da7', lat: 6.1429, lng: 81.1212 },
  { name: 'Polonnaruwa', si: '\u0db4\u0ddc\u0dc5\u0ddc\u0db1\u0dca\u0db1\u0dbb\u0dd4\u0dc0', lat: 7.9403, lng: 81.0188 },
  { name: 'Kegalle', si: '\u0d9a\u0dd1\u0d9c\u0dbd\u0dca\u0dbd', lat: 7.2524, lng: 80.3467 },
  { name: 'Ampara', si: '\u0d85\u0db8\u0dca\u0db4\u0dcf\u0dbb', lat: 7.2976, lng: 81.6720 },
  { name: 'Matale', si: '\u0db8\u0dcf\u0dad\u0dbd\u0dda', lat: 7.4675, lng: 80.6234 },
  { name: 'Kalutara', si: '\u0d9a\u0dc5\u0dd4\u0dad\u0dbb', lat: 6.5854, lng: 79.9607 },
  { name: 'Gampaha', si: '\u0d9c\u0db8\u0dca\u0db4\u0dc4', lat: 7.0840, lng: 80.0098 },
  { name: 'Puttalam', si: '\u0db4\u0dd4\u0dad\u0dca\u0dad\u0dbd\u0db8', lat: 8.0362, lng: 79.8283 },
  { name: 'Chilaw', si: '\u0dc4\u0dbd\u0dcf\u0dc0\u0dad', lat: 7.5758, lng: 79.7953 },
  { name: 'Dambulla', si: '\u0daf\u0db9\u0dd4\u0dbd\u0dca\u0dbd', lat: 7.8600, lng: 80.6517 },
  { name: 'Panadura', si: '\u0db4\u0dcf\u0db1\u0daf\u0dd4\u0dbb', lat: 6.7133, lng: 79.9046 },
  { name: 'Moratuwa', si: '\u0db8\u0ddc\u0dbb\u0da7\u0dd4\u0dc0', lat: 6.7731, lng: 79.8824 },
];


// ═══════════════════════════════════════════════════════════════════════
//  SHARED UI ATOMS — with micro-animations + vibrant gradients
// ═══════════════════════════════════════════════════════════════════════

/* Animated floating particles + cosmic sparkles behind steps */
function FloatingOrbs() {
  var orb1 = useSharedValue(0);
  var orb2 = useSharedValue(0);
  var orb3 = useSharedValue(0);
  var orb4 = useSharedValue(0);
  var orb5 = useSharedValue(0);
  var starTwinkle = useSharedValue(0);
  useEffect(function () {
    orb1.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }), -1, true);
    orb2.value = withRepeat(withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.sin) }), -1, true);
    orb3.value = withRepeat(withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.sin) }), -1, true);
    orb4.value = withRepeat(withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.sin) }), -1, true);
    orb5.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }), -1, true);
    starTwinkle.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);
  var s1 = useAnimatedStyle(function () {
    return { transform: [{ translateY: interpolate(orb1.value, [0, 1], [-20, 20]) }, { translateX: interpolate(orb1.value, [0, 1], [10, -10]) }], opacity: interpolate(orb1.value, [0, 0.5, 1], [0.15, 0.35, 0.15]) };
  });
  var s2 = useAnimatedStyle(function () {
    return { transform: [{ translateY: interpolate(orb2.value, [0, 1], [15, -25]) }, { translateX: interpolate(orb2.value, [0, 1], [-15, 20]) }], opacity: interpolate(orb2.value, [0, 0.5, 1], [0.1, 0.25, 0.1]) };
  });
  var s3 = useAnimatedStyle(function () {
    return { transform: [{ translateY: interpolate(orb3.value, [0, 1], [-12, 18]) }], opacity: interpolate(orb3.value, [0, 0.5, 1], [0.12, 0.3, 0.12]) };
  });
  var s4 = useAnimatedStyle(function () {
    return { transform: [{ translateY: interpolate(orb4.value, [0, 1], [-18, 14]) }, { translateX: interpolate(orb4.value, [0, 1], [8, -16]) }, { scale: interpolate(orb4.value, [0, 0.5, 1], [0.8, 1.1, 0.8]) }], opacity: interpolate(orb4.value, [0, 0.5, 1], [0.08, 0.2, 0.08]) };
  });
  var s5 = useAnimatedStyle(function () {
    return { transform: [{ translateY: interpolate(orb5.value, [0, 1], [10, -22]) }, { rotate: interpolate(orb5.value, [0, 1], [0, 180]) + 'deg' }], opacity: interpolate(orb5.value, [0, 0.5, 1], [0.06, 0.18, 0.06]) };
  });
  var starStyle = useAnimatedStyle(function () {
    return { opacity: interpolate(starTwinkle.value, [0, 0.5, 1], [0.2, 0.8, 0.2]) };
  });
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[{ position: 'absolute', top: '15%', left: '10%', width: 120, height: 120, borderRadius: 60, backgroundColor: '#FFB800' }, s1]} />
      <Animated.View style={[{ position: 'absolute', top: '55%', right: '5%', width: 90, height: 90, borderRadius: 45, backgroundColor: '#D186FF' }, s2]} />
      <Animated.View style={[{ position: 'absolute', bottom: '20%', left: '30%', width: 70, height: 70, borderRadius: 35, backgroundColor: '#FFB800' }, s3]} />
      <Animated.View style={[{ position: 'absolute', top: '35%', right: '20%', width: 50, height: 50, borderRadius: 25, backgroundColor: '#B47AFF' }, s4]} />
      <Animated.View style={[{ position: 'absolute', bottom: '35%', left: '8%', width: 40, height: 40, borderRadius: 20, backgroundColor: '#06B6D4' }, s5]} />
      {/* Twinkling star dots */}
      <Animated.View style={[{ position: 'absolute', top: '10%', right: '15%', width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#FFF' }, starStyle]} />
      <Animated.View style={[{ position: 'absolute', top: '25%', left: '25%', width: 2, height: 2, borderRadius: 1, backgroundColor: '#FFB800' }, starStyle]} />
      <Animated.View style={[{ position: 'absolute', top: '45%', left: '5%', width: 2.5, height: 2.5, borderRadius: 1.25, backgroundColor: '#FFF' }, starStyle]} />
      <Animated.View style={[{ position: 'absolute', bottom: '15%', right: '25%', width: 2, height: 2, borderRadius: 1, backgroundColor: '#D186FF' }, starStyle]} />
      <Animated.View style={[{ position: 'absolute', bottom: '40%', right: '10%', width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#FFF' }, starStyle]} />
      <Animated.View style={[{ position: 'absolute', top: '65%', left: '45%', width: 2, height: 2, borderRadius: 1, backgroundColor: '#FFB800' }, starStyle]} />
    </View>
  );
}

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
        ? (c < 1 ? 'rgba(255,184,0,0.5)' : c < 2 ? 'rgba(180,122,255,0.5)' : 'rgba(255,184,0,0.5)')
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
    return {
      shadowOpacity: isOff ? 0 : interpolate(glow.value, [0, 1], [0.3, 0.7]),
      shadowRadius: interpolate(glow.value, [0, 1], [8, 20]),
    };
  });

  return (
    <Animated.View style={[g.primaryBtn, glowStyle]}>
      <SpringPressable
        onPress={onPress} disabled={isOff} haptic="heavy" scalePressed={0.96}
        style={{ borderRadius: 16, overflow: 'hidden', opacity: isOff ? 0.4 : 1 }}
      >
        <LinearGradient
          colors={isOff ? ['#444', '#555'] : ['#FFB800', '#D186FF', '#B47AFF']}
          style={g.primaryGrad}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
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

function GhostButton({ label, onPress }) {
  return (
    <SpringPressable onPress={onPress} style={g.ghostBtn} haptic="light" scalePressed={0.96}>
      <Text style={g.ghostText}>{label}</Text>
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
    return {
      shadowOpacity: interpolate(iconGlow.value, [0, 1], [0.2, 0.6]),
      shadowRadius: interpolate(iconGlow.value, [0, 1], [8, 20]),
    };
  });

  return (
    <Animated.View entering={FadeInDown.duration(500)} style={g.headerWrap}>
      {icon ? (
        <Animated.View style={[g.headerIconBg, { borderColor: (iconColor || '#FFB800') + '50', shadowColor: iconColor || '#FFB800' }, iconAnim, glowAnim]}>
          <Ionicons name={icon} size={28} color={iconColor || '#FFB800'} />
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

var STEP_LABELS_EN = ['Welcome', 'Phone', 'Verify', 'Subscribe', 'Birth Info', 'Done'];
var STEP_LABELS_SI = ['සාදරයෙන්', 'දුරකතන', 'සත්‍යාපන', 'දායකත්ව', 'උපන් දත්ත', 'සම්පූර්ණ'];

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
            colors={['#FFB800', '#D186FF']}
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
      <FloatingOrbs />
      <Animated.View entering={FadeInDown.duration(800)} style={{ alignItems: 'center', marginBottom: 40 }}>
        <Animated.View style={floatStyle}>
          <Animated.View style={[ls.logoWrap, glowStyle]}>
            <Image source={LOGO} style={ls.logoImg} resizeMode="contain" />
          </Animated.View>
        </Animated.View>
        <Animated.View style={titleAnim}>
          <Text style={ls.mainTitleSi}>{'\u0db1\u0dd0\u0d9a\u0dad\u0dca AI'}</Text>
          <Text style={ls.mainTitleEn}>Nekath AI</Text>
        </Animated.View>
        <View style={ls.divider}>
          <LinearGradient colors={['transparent', '#FFB800', '#D186FF', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
        </View>
        <Text style={ls.siTitle}>{'\u0db7\u0dcf\u0dc2\u0dcf\u0dc0 \u0dad\u0ddd\u0dbb\u0db1\u0dca\u0db1'}</Text>
        <Text style={ls.enTitle}>Select Your Language</Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300).duration(600)} style={{ width: '100%' }}>
        <SpringPressable style={ls.langBtn} onPress={function () { onSelect('si'); }} haptic="medium" scalePressed={0.95}>
          <LinearGradient colors={['#FFB800', '#D186FF']} style={ls.langGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={ls.langInner}>
              <Text style={ls.langFlag}>{'\uD83C\uDDF1\uD83C\uDDF0'}</Text>
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
              <Text style={ls.langFlag}>{'\uD83C\uDF10'}</Text>
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
  mainTitleSi: { fontSize: 44, fontWeight: '900', color: '#FFB800', letterSpacing: 2, textShadowColor: 'rgba(255,184,0,0.6)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20, textAlign: 'center' },
  mainTitleEn: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.35)', letterSpacing: 4, marginTop: 2, textAlign: 'center' },
  divider: { width: 60, height: 3, borderRadius: 2, marginVertical: 16, overflow: 'hidden' },
  siTitle: { fontSize: 22, fontWeight: '700', color: '#FFD666', marginBottom: 4 },
  enTitle: { fontSize: 15, color: 'rgba(255,255,255,0.5)' },
  langBtn: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  langGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 22, paddingHorizontal: 22, borderRadius: 18 },
  langInner: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  langFlag: { fontSize: 34 },
  langLabel: { fontSize: 24, fontWeight: '700', color: '#FFF' },
  langSub: { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
});


// ═══════════════════════════════════════════════════════════════════════
//  STEP 0: WELCOME
// ═══════════════════════════════════════════════════════════════════════

function WelcomeStep({ onContinue, lang }) {
  var T = OB[lang] || OB.en;
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
      <FloatingOrbs />
      <Animated.View entering={FadeInDown.duration(800)} style={{ alignItems: 'center' }}>
        {/* Rotating halo ring */}
        <Animated.View style={[ws.haloRing, haloStyle]}>
          <LinearGradient
            colors={['#FFB800', '#D186FF', '#FFB800', '#FFB800']}
            style={ws.haloGrad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
        </Animated.View>
        <Animated.View style={[ws.logoRing, pulseStyle]}>
          <LinearGradient
            colors={['rgba(255,184,0,0.25)', 'rgba(180,122,255,0.15)', 'rgba(255,184,0,0.1)']}
            style={ws.logoInner}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Image source={LOGO} style={ws.logoImg} resizeMode="contain" />
          </LinearGradient>
        </Animated.View>

        <Text style={ws.titleSi}>{'\u0db1\u0dd0\u0d9a\u0dad\u0dca AI'}</Text>
        <Text style={ws.titleEn}>Nekath AI</Text>
        <Text style={ws.subtitle}>{T.welcomeSubtitle}</Text>

        <View style={ws.featureList}>
          {T.welcomeDesc.split('\n').map(function (line, i) {
            return (
              <Animated.View key={i} entering={FadeInDown.delay(500 + i * 150).duration(400)} style={ws.featureLine}>
                <LinearGradient colors={['#FFB800', '#D186FF']} style={ws.featureDot} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <Text style={ws.featureText}>{line.replace(/[•&]/g, '').trim()}</Text>
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(900).duration(600)} style={{ width: '100%', marginTop: 40 }}>
        <PrimaryButton label={T.welcomeBtn} onPress={onContinue} icon="sparkles" />
        <Text style={g.hint}>{T.welcomeHint}</Text>
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
  titleSi: { fontSize: 40, fontWeight: '900', color: '#FFB800', letterSpacing: 2, textShadowColor: 'rgba(255,184,0,0.6)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16, marginBottom: 2, textAlign: 'center' },
  titleEn: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.3)', letterSpacing: 4, marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 15, fontWeight: '600', color: '#FFD666', marginBottom: 4 },
  featureList: { marginTop: 28, alignSelf: 'stretch', gap: 12 },
  featureLine: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 8 },
  featureDot: { width: 8, height: 8, borderRadius: 4 },
  featureText: { fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 22 },
});


// ═══════════════════════════════════════════════════════════════════════
//  STEP 1: PHONE NUMBER
// ═══════════════════════════════════════════════════════════════════════

function PhoneStep({ onContinue, onBack, lang }) {
  var T = OB[lang] || OB.en;
  var [phone, setPhone] = useState('');
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState('');
  var { sendOtp } = useAuth();
  var inputRef = useRef(null);
  var borderShimmer = useSharedValue(0);

  useEffect(function () {
    var t = setTimeout(function () { if (inputRef.current) inputRef.current.focus(); }, 500);
    borderShimmer.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.linear }), -1, true);
    return function () { clearTimeout(t); };
  }, []);

  var shimmerBorder = useAnimatedStyle(function () {
    return { opacity: interpolate(borderShimmer.value, [0, 0.5, 1], [0.3, 0.7, 0.3]) };
  });

  var handleSend = async function () {
    var cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 9) { setError(T.phoneError); return; }
    setLoading(true); setError('');
    try {
      var fullPhone = cleaned.startsWith('0') ? '+94' + cleaned.slice(1)
        : cleaned.startsWith('94') ? '+' + cleaned
        : '+94' + cleaned;
      var res = await sendOtp(fullPhone);
      onContinue(fullPhone, res.referenceNo);
    } catch (e) { setError(T.phoneFailedOtp); }
    finally { setLoading(false); }
  };

  return (
    <View style={g.stepWrap}>
      <FloatingOrbs />
      <StepHeader icon="call-outline" iconColor="#FFB800" title={T.phoneTitle} subtitle={T.phoneSubtitle} />

      <Animated.View entering={FadeInUp.delay(200).duration(500)} style={{ marginTop: 32 }}>
        <AnimatedBorderCard>
          <Text style={g.inputLabel}>{lang === 'si' ? '\u0daf\u0dd4\u0dbb\u0d9a\u0dad\u0db1 \u0d85\u0d82\u0d9a\u0dba' : 'PHONE NUMBER'}</Text>

          {/* Country code label — separate row, no overlap */}
          <View style={ps.countryRow}>
            <LinearGradient colors={['rgba(255,184,0,0.15)', 'rgba(180,122,255,0.08)']} style={ps.countryBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={ps.flagText}>{'\uD83C\uDDF1\uD83C\uDDF0'}</Text>
              <Text style={ps.countryCode}>Sri Lanka  +94</Text>
            </LinearGradient>
          </View>

          {/* Phone input — full-width, no prefix competition */}
          <Animated.View style={shimmerBorder}>
            <LinearGradient
              colors={['#FFB800', '#D186FF', '#B47AFF', '#FFB800']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={ps.inputGlow}
            >
              <View style={ps.inputInner}>
                <TextInput
                  ref={inputRef}
                  style={ps.input}
                  placeholder={T.phonePlaceholder}
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={function (t) { setPhone(t); setError(''); }}
                  maxLength={12}
                  selectionColor="#FFB800"
                />
              </View>
            </LinearGradient>
          </Animated.View>

          {error ? <Text style={g.error}>{error}</Text> : null}
          <Text style={ps.networks}>{T.phoneNetwork}</Text>
        </AnimatedBorderCard>

        <View style={{ marginTop: 24 }}>
          <PrimaryButton label={T.phoneSendOtp} onPress={handleSend} loading={loading} icon="arrow-forward" />
        </View>
      </Animated.View>

      <GhostButton label={T.back || 'Back'} onPress={onBack} />
    </View>
  );
}

var ps = StyleSheet.create({
  countryRow: { marginTop: 4, marginBottom: 12, alignSelf: 'flex-start' },
  countryBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,184,0,0.2)' },
  flagText: { fontSize: 16 },
  countryCode: { color: '#FFD666', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  inputGlow: { borderRadius: 16, padding: 1.5 },
  inputInner: { backgroundColor: 'rgba(4,3,12,0.9)', borderRadius: 15 },
  input: { paddingHorizontal: 18, paddingVertical: 16, color: '#FFF', fontSize: 20, fontWeight: '700', letterSpacing: 2 },
  networks: { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 14 },
});


// ═══════════════════════════════════════════════════════════════════════
//  STEP 2: OTP VERIFICATION
// ═══════════════════════════════════════════════════════════════════════

function OtpStep({ phone, referenceNo, onContinue, onBack, lang }) {
  var T = OB[lang] || OB.en;
  var [otp, setOtp] = useState('');
  var [currentRef, setCurrentRef] = useState(referenceNo);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState('');
  var [devOtp, setDevOtp] = useState(null);
  var { verifyAndLogin, sendOtp: resendOtp } = useAuth();
  var inputRef = useRef(null);
  var shieldPulse = useSharedValue(0);

  useEffect(function () { setCurrentRef(referenceNo); }, [referenceNo]);

  useEffect(function () {
    shieldPulse.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  var shieldGlow = useAnimatedStyle(function () {
    return { opacity: interpolate(shieldPulse.value, [0, 1], [0.4, 1]) };
  });

  useEffect(function () {
    if (__DEV__ && phone) {
      fetch(BASE + '/api/auth/dev-otp/' + encodeURIComponent(phone))
        .then(function (r) { return r.json(); })
        .then(function (d) { if (d.otp) setDevOtp(d.otp); })
        .catch(function () {});
    }
  }, [phone]);

  useEffect(function () {
    var t = setTimeout(function () { if (inputRef.current) inputRef.current.focus(); }, 500);
    return function () { clearTimeout(t); };
  }, []);

  var handleVerify = async function () {
    if (!otp || otp.length < 4) { setError(T.otpError); return; }
    setLoading(true); setError('');
    try {
      if (!currentRef) throw new Error('Missing reference number');
      await verifyAndLogin(phone, otp, currentRef);
      onContinue();
    } catch (e) { console.error(e); setError(T.otpFailed); }
    finally { setLoading(false); }
  };

  var handleResend = async function () {
    try {
      var res = await resendOtp(phone);
      if (res && res.referenceNo) setCurrentRef(res.referenceNo);
      Alert.alert('', T.otpResend);
    } catch (e) { Alert.alert('', T.otpResendFailed); }
  };

  var maskedPhone = phone ? phone.slice(0, -3).replace(/./g, '\u2022') + phone.slice(-3) : '';

  return (
    <View style={g.stepWrap}>
      <FloatingOrbs />
      <StepHeader icon="shield-checkmark-outline" iconColor="#FFB800" title={T.otpTitle} subtitle={T.otpSubtitle + ' ' + maskedPhone} />

      <Animated.View entering={FadeInUp.delay(200).duration(500)} style={{ marginTop: 28 }}>
        {devOtp ? (
          <Animated.View entering={FadeInDown.duration(400)} style={os.devBox}>
            <Text style={os.devLabel}>{T.otpDevLabel}</Text>
            <Text style={os.devCode}>{devOtp}</Text>
          </Animated.View>
        ) : null}

        <AnimatedBorderCard>
          <Animated.View style={[{ alignItems: 'center', marginBottom: 8 }, shieldGlow]}>
            <Text style={{ fontSize: 28 }}>{'\uD83D\uDD12'}</Text>
          </Animated.View>
          <Text style={[g.inputLabel, { textAlign: 'center' }]}>
            {lang === 'si' ? '\u0dc3\u0dad\u0dca\u200d\u0dba\u0dcf\u0db0\u0db1 \u0d9a\u0dda\u0dad\u0dba' : 'VERIFICATION CODE'}
          </Text>
          <TextInput
            ref={inputRef}
            style={os.input}
            placeholder="0  0  0  0  0  0"
            placeholderTextColor="rgba(255,255,255,0.2)"
            keyboardType="number-pad"
            value={otp}
            onChangeText={function (t) { setOtp(t); setError(''); }}
            maxLength={6}
            selectionColor="#FFB800"
          />
          {error ? <Text style={g.error}>{error}</Text> : null}
        </AnimatedBorderCard>

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
          <TouchableOpacity onPress={handleResend} style={os.resendBtn}>
            <Ionicons name="refresh" size={15} color="#FFD666" />
            <Text style={os.resendText}>{T.otpResend}</Text>
          </TouchableOpacity>
        </View>
        <Text style={g.hint}>{T.otpHint}</Text>

        <View style={{ marginTop: 20 }}>
          <PrimaryButton label={T.otpVerify} onPress={handleVerify} loading={loading} icon="checkmark-circle" />
        </View>
      </Animated.View>

      <GhostButton label={T.back || 'Back'} onPress={onBack} />
    </View>
  );
}

var os = StyleSheet.create({
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18, color: '#FFB800', fontSize: 28, fontWeight: '800', textAlign: 'center', letterSpacing: 12, borderWidth: 1.5, borderColor: 'rgba(255,184,0,0.2)', marginTop: 12 },
  resendBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 16 },
  resendText: { color: '#FFD666', fontSize: 13, fontWeight: '600' },
  devBox: { backgroundColor: 'rgba(0,255,100,0.08)', borderRadius: 14, padding: 14, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,255,100,0.2)' },
  devLabel: { color: 'rgba(0,255,100,0.7)', fontSize: 11 },
  devCode: { color: '#00FF64', fontSize: 30, fontWeight: '800', letterSpacing: 8, marginTop: 4 },
});


// ═══════════════════════════════════════════════════════════════════════
//  STEP 3: SUBSCRIPTION
// ═══════════════════════════════════════════════════════════════════════

function SubscriptionStep({ onContinue, lang }) {
  var T = OB[lang] || OB.en;
  var [loading, setLoading] = useState(false);
  var { activateSubscription } = useAuth();
  var priceGlow = useSharedValue(0);

  useEffect(function () {
    priceGlow.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  var priceStyle = useAnimatedStyle(function () {
    return { transform: [{ scale: interpolate(priceGlow.value, [0, 1], [1, 1.05]) }] };
  });

  var features = [
    { icon: 'calendar-outline', text: T.subFeature1, color: '#FFB800' },
    { icon: 'planet-outline', text: T.subFeature2, color: '#D186FF' },
    { icon: 'heart-outline', text: T.subFeature3, color: '#FF4081' },
    { icon: 'sparkles-outline', text: T.subFeature4, color: '#FFB800' },
    { icon: 'notifications-outline', text: T.subFeature5, color: '#06D6A0' },
    { icon: 'star-outline', text: T.subFeature6, color: '#FFD666' },
  ];

  var handleSub = async function () {
    setLoading(true);
    try {
      await activateSubscription();
      onContinue();
    } catch (e) {
      Alert.alert(T.subFailed, T.subPayFail);
    } finally { setLoading(false); }
  };

  return (
    <ScrollView contentContainerStyle={g.stepWrap} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ backgroundColor: 'transparent' }} bounces={false} overScrollMode="never">
      <FloatingOrbs />
      <StepHeader icon="diamond-outline" iconColor="#FFB800" title={T.subTitle} subtitle={T.subSubtitle} />

      <Animated.View entering={FadeInUp.delay(200).duration(500)} style={{ marginTop: 20 }}>
        {/* Comparison Table: Free vs Premium */}
        <AnimatedBorderCard>
          <View style={ss.compareHeader}>
            <View style={{ flex: 2 }} />
            <Text style={ss.compareColLabel}>{lang === 'si' ? 'නොමිලේ' : 'Free'}</Text>
            <Text style={[ss.compareColLabel, { color: '#FFB800' }]}>Premium</Text>
          </View>
          {features.map(function (f, i) {
            return (
              <Animated.View key={i} entering={FadeInDown.delay(300 + i * 60).duration(300)} style={ss.compareRow}>
                <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name={f.icon} size={16} color={f.color} />
                  <Text style={ss.featureText}>{f.text}</Text>
                </View>
                <View style={ss.compareCell}>
                  <Ionicons name={i < 2 ? 'remove-outline' : 'close'} size={14} color="rgba(255,255,255,0.25)" />
                </View>
                <View style={ss.compareCell}>
                  <Ionicons name="checkmark" size={16} color="#34D399" />
                </View>
              </Animated.View>
            );
          })}
        </AnimatedBorderCard>

        <Animated.View entering={FadeInUp.delay(700).duration(500)} style={[ss.priceBadge, priceStyle]}>
          <LinearGradient
            colors={['rgba(255,184,0,0.2)', 'rgba(180,122,255,0.12)', 'rgba(255,184,0,0.1)']}
            style={ss.priceGrad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Text style={ss.priceLabel}>LKR</Text>
            <Text style={ss.priceAmount}>8</Text>
            <Text style={ss.pricePer}>{T.subPerDay}</Text>
          </LinearGradient>
        </Animated.View>

        <Text style={[g.hint, { marginTop: 8 }]}>{T.subNote}</Text>
        <Text style={[g.hint, { marginTop: 4, opacity: 0.4 }]}>{T.subNetworks}</Text>

        <View style={{ marginTop: 24 }}>
          <PrimaryButton label={T.subBtn} onPress={handleSub} loading={loading} icon="flash" />
        </View>
      </Animated.View>
    </ScrollView>
  );
}

var ss = StyleSheet.create({
  compareHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', marginBottom: 4 },
  compareColLabel: { width: 56, textAlign: 'center', fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 },
  compareRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  compareCell: { width: 56, alignItems: 'center' },
  featureText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, flex: 1, lineHeight: 18 },
  priceBadge: { marginTop: 20, borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,184,0,0.25)', alignSelf: 'center' },
  priceGrad: { flexDirection: 'row', alignItems: 'baseline', paddingVertical: 14, paddingHorizontal: 32, gap: 4 },
  priceLabel: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  priceAmount: { fontSize: 42, fontWeight: '900', color: '#FFB800', textShadowColor: 'rgba(255,184,0,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
  pricePer: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginLeft: 2 },
});


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
  var [citySearch, setCitySearch] = useState('');
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState('');
  var { completeOnboarding } = useAuth();

  var filteredCities = SL_CITIES.filter(function (c) {
    if (!citySearch) return true;
    var q = citySearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.si.includes(citySearch);
  });

  var progressLabels = [T.subProgressName, T.subProgressDate, T.subProgressTime, T.subProgressPlace];

  var handleSubmit = async function () {
    if (displayName.trim().length < 2) { setError(T.nameError); setPage(0); return; }
    setLoading(true); setError('');
    try {
      var birthData = {};
      if (year && month !== null && day) {
        var h = parseInt(hour) || 12;
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        var m = parseInt(minute) || 0;
        var pad = function (n) { return n.toString().padStart(2, '0'); };
        var dateTime = parseInt(year) + '-' + pad(month + 1) + '-' + pad(parseInt(day)) + 'T' + pad(h) + ':' + pad(m) + ':00';
        birthData = {
          dateTime: dateTime,
          lat: selectedCity ? selectedCity.lat : 6.9271,
          lng: selectedCity ? selectedCity.lng : 79.8612,
          locationName: selectedCity ? selectedCity.name : 'Colombo',
          timezone: 'Asia/Colombo',
        };
      }
      await completeOnboarding(displayName.trim(), Object.keys(birthData).length > 0 ? birthData : null, lang);
      onComplete();
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
      <Animated.View key="name" entering={FadeIn.duration(300)}>
        <StepHeader icon="person-circle-outline" iconColor="#FFB800" title={T.nameTitle} subtitle={T.nameSubtitle} />
        <GlowCard style={{ marginTop: 24 }}>
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
        <View style={{ marginTop: 24 }}>
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
      <Animated.View key="date" entering={FadeIn.duration(300)}>
        <StepHeader icon="calendar-outline" iconColor="#D186FF" title={T.dateTitle} subtitle={T.dateSubtitle} />

        <GlowCard style={{ marginTop: 20 }}>
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

          <Text style={[g.inputLabel, { marginTop: 18 }]}>{T.monthLabel}</Text>
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

        <Text style={[g.hint, { marginTop: 10 }]}>{'\uD83D\uDCA1'} {T.dateHint}</Text>

        {/* Chart preview teaser */}
        {year && month !== null && day ? (
          <Animated.View entering={FadeInDown.duration(400)} style={bd.chartPreview}>
            <LinearGradient colors={['rgba(180,122,255,0.12)', 'rgba(180,122,255,0.04)']} style={StyleSheet.absoluteFill} />
            <Text style={bd.chartPreviewIcon}>🪐</Text>
            <Text style={bd.chartPreviewText}>
              {lang === 'si' ? 'ඔබේ කේන්දරය ගණනය කිරීමට සූදානම්...' : 'Ready to calculate your chart...'}
            </Text>
          </Animated.View>
        ) : null}

        <View style={bd.navRow}>
          <TouchableOpacity onPress={function () { setPage(0); }} style={bd.backBtn}>
            <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.5)" />
            <Text style={bd.backText}>{T.back}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <PrimaryButton label={T.continueBtn} onPress={function () { setPage(2); }} icon="arrow-forward" />
          </View>
        </View>
      </Animated.View>
    );
  };

  /* PAGE 2: Time */
  var renderTimePage = function () {
    return (
      <Animated.View key="time" entering={FadeIn.duration(300)}>
        <StepHeader icon="time-outline" iconColor="#06B6D4" title={T.timeTitle} subtitle={T.timeSubtitle} />

        <GlowCard style={{ marginTop: 24 }}>
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

        <Text style={[g.hint, { marginTop: 10 }]}>{'\uD83D\uDCA1'} {T.timeHint}</Text>

        <View style={bd.navRow}>
          <TouchableOpacity onPress={function () { setPage(1); }} style={bd.backBtn}>
            <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.5)" />
            <Text style={bd.backText}>{T.back}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <PrimaryButton label={T.continueBtn} onPress={function () { setPage(3); }} icon="arrow-forward" />
          </View>
        </View>
      </Animated.View>
    );
  };

  /* PAGE 3: Place */
  var renderPlacePage = function () {
    return (
      <Animated.View key="place" entering={FadeIn.duration(300)}>
        <StepHeader icon="location-outline" iconColor="#F472B6" title={T.placeTitle} subtitle={T.placeSubtitle} />

        <GlowCard style={{ marginTop: 20 }}>
          <TextInput
            style={[g.textInput, { marginBottom: 12 }]}
            placeholder={T.placeSearch}
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={citySearch}
            onChangeText={setCitySearch}
            selectionColor="#F472B6"
          />
          <ScrollView style={bd.cityList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {filteredCities.map(function (city, i) {
              var isSel = selectedCity && selectedCity.name === city.name;
              return (
                <TouchableOpacity key={i} style={[bd.cityItem, isSel && bd.citySel]} onPress={function () { setSelectedCity(city); }} activeOpacity={0.7}>
                  <View style={{ flex: 1 }}>
                    <Text style={[bd.cityName, isSel && { color: '#FFB800' }]}>
                      {lang === 'si' ? city.si : city.name}
                    </Text>
                    <Text style={bd.citySub}>{lang === 'si' ? city.name : city.si}</Text>
                  </View>
                  {isSel ? <Ionicons name="checkmark-circle" size={22} color="#FFB800" /> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </GlowCard>

        <Text style={[g.hint, { marginTop: 8 }]}>{'\uD83D\uDCA1'} {T.placeHint}</Text>

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
        <Text style={[g.hint, { marginTop: 2 }]}>
          {lang === 'si' ? 'පසුව Profile තුළ එක් කළ හැක' : 'You can add this later in Profile'}
        </Text>
      </Animated.View>
    );
  };

  return (
    <ScrollView contentContainerStyle={g.stepWrap} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ backgroundColor: 'transparent' }} bounces={false} overScrollMode="never">
      {renderProgress()}
      {page === 0 ? renderNamePage()
        : page === 1 ? renderDatePage()
        : page === 2 ? renderTimePage()
        : renderPlacePage()}
    </ScrollView>
  );
}

var bd = StyleSheet.create({
  progressRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  progressItem: { flex: 1, alignItems: 'center' },
  progressLine: { width: '100%', height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 6 },
  progressLineActive: { backgroundColor: 'rgba(255,184,0,0.5)' },
  progressLineCurrent: { backgroundColor: '#FFB800' },
  progressLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  progressLabelActive: { color: '#FFD666' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  monthChip: { width: (SW - 24 * 2 - 40 - 8 * 3) / 4, paddingVertical: 11, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  monthChipSel: { backgroundColor: 'rgba(255,184,0,0.15)', borderColor: '#FFB800' },
  monthText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
  monthTextSel: { color: '#FFD666', fontWeight: '700' },
  ampmRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18, gap: 14 },
  ampmBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  ampmSel: { backgroundColor: 'rgba(255,184,0,0.15)', borderColor: '#FFB800' },
  ampmText: { color: 'rgba(255,255,255,0.5)', fontSize: 17, fontWeight: '700' },
  ampmTextSel: { color: '#FFD666' },
  cityList: { maxHeight: 200 },
  cityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 6, borderWidth: 1, borderColor: 'transparent' },
  citySel: { backgroundColor: 'rgba(255,184,0,0.1)', borderColor: 'rgba(255,184,0,0.3)' },
  cityName: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  citySub: { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 },
  chartPreview: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, marginTop: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(180,122,255,0.15)' },
  chartPreviewIcon: { fontSize: 24 },
  chartPreviewText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500', fontStyle: 'italic', flex: 1 },
  navRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 14, paddingHorizontal: 6 },
  backText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '500' },
});


// ═══════════════════════════════════════════════════════════════════════
//  STEP 5: COMPLETE
// ═══════════════════════════════════════════════════════════════════════

function CompleteStep({ lang }) {
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
      <FloatingOrbs />
      <Animated.View entering={FadeInDown.duration(800)} style={{ alignItems: 'center' }}>
        <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
          {/* Pulsing rings */}
          <Animated.View style={[{ position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: '#FFB800' }, ringStyle]} />
          <Animated.View style={[{ position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 1.5, borderColor: '#D186FF' }, ringStyle]} />
          {/* Confetti particles */}
          <Animated.Text style={[{ position: 'absolute', fontSize: 14 }, c1]}>{'\u2728'}</Animated.Text>
          <Animated.Text style={[{ position: 'absolute', fontSize: 12 }, c2]}>{'\uD83C\uDF1F'}</Animated.Text>
          <Animated.Text style={[{ position: 'absolute', fontSize: 10 }, c3]}>{'\u2B50'}</Animated.Text>
          {/* Main star */}
          <Animated.Text style={[{ fontSize: 56 }, starStyle]}>{'\uD83C\uDF1F'}</Animated.Text>
        </View>

        <Text style={[g.headerTitle, { fontSize: 28, marginTop: 16, color: '#FFB800', textShadowColor: 'rgba(255,184,0,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 }]}>{T.completeTitle}</Text>
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

export default function OnboardingScreen() {
  var [step, setStep] = useState(-1);
  var [phone, setPhone] = useState('');
  var [referenceNo, setReferenceNo] = useState(null);
  var { language: ctxLang, switchLanguage } = useLanguage();
  var [lang, setLang] = useState(ctxLang || 'si');
  var insets = useSafeAreaInsets();

  var handleLanguageSelect = function (selectedLang) {
    setLang(selectedLang);
    switchLanguage(selectedLang);
    setStep(0);
  };

  var TOTAL_MAIN_STEPS = 6;

  var renderStep = function () {
    switch (step) {
      case -1: return <LanguageStep onSelect={handleLanguageSelect} />;
      case 0: return <WelcomeStep onContinue={function () { setStep(1); }} lang={lang} />;
      case 1: return <PhoneStep onContinue={function (ph, ref) { setPhone(ph); setReferenceNo(ref); setStep(2); }} onBack={function () { setStep(0); }} lang={lang} />;
      case 2: return <OtpStep phone={phone} referenceNo={referenceNo} onContinue={function () { setStep(3); }} onBack={function () { setStep(1); }} lang={lang} />;
      case 3: return <SubscriptionStep onContinue={function () { setStep(4); }} lang={lang} />;
      case 4: return <BirthDataStep onComplete={function () { setStep(5); }} lang={lang} />;
      case 5: return <CompleteStep lang={lang} />;
      default: return <LanguageStep onSelect={handleLanguageSelect} />;
    }
  };

  return (
    <CosmicBackground>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#020010', overflow: 'hidden' }}
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
    </CosmicBackground>
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
  headerIconBg: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(180,122,255,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFF', textAlign: 'center', lineHeight: 30 },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  card: { backgroundColor: 'rgba(20,12,50,0.55)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  inputLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700', marginBottom: 8, letterSpacing: 1.2, textTransform: 'uppercase' },
  textInput: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 15 : 13, color: '#FFF', fontSize: 16, fontWeight: '500', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  primaryBtn: { borderRadius: 16, overflow: 'hidden', shadowColor: 'rgba(255,184,0,0.40)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 14, elevation: 10 },
  primaryGrad: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  primaryText: { fontSize: 16, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  ghostBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  ghostText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '500' },
  error: { color: '#FF6B6B', fontSize: 12, marginTop: 8, textAlign: 'center', fontWeight: '500' },
  hint: { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 12, lineHeight: 17 },
});
