/**
 * Onboarding Flow - Fully Personalised by Language
 * Step -1: Language Selection (Sinhala or English)
 * Step 0: Welcome
 * Step 1: Phone Number
 * Step 2: OTP Verification
 * Step 3: Subscription
 * Step 4: Name & Birth Data (multi-page wizard)
 * Step 5: Complete
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Platform,
  Dimensions, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import CosmicBackground from '../components/CosmicBackground';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { BASE } from '../services/api';

var { width } = Dimensions.get('window');

var OB = {
  en: {
    welcomeSubtitle: "Sri Lanka's #1 Astrology App",
    welcomeDesc: "Your personal Vedic astrologer.\nDaily, Weekly & Monthly Palapala\nKendara Balima \u2022 Porondam Galapima\nFull Life Report \u2022 Rahu Kalaya",
    welcomeBtn: "\u2728 Begin Your Cosmic Journey",
    welcomeHint: "Only LKR 8/day from your mobile credit",
    phoneTitle: "Enter Your Phone Number",
    phoneSubtitle: "We'll send you a verification code via SMS",
    phonePlaceholder: "7X XXX XXXX",
    phoneError: "Please enter a valid phone number",
    phoneNetwork: "Works with Dialog, Mobitel, Hutch & Airtel",
    phoneSendOtp: "Send OTP \u2192",
    phoneFailedOtp: "Failed to send OTP",
    otpTitle: "Enter Verification Code",
    otpSubtitle: "We sent a code to",
    otpPlaceholder: "Enter 6-digit code",
    otpError: "Please enter the OTP code",
    otpResend: "\ud83d\udce9 Resend OTP",
    otpHint: "Code valid for 60 minutes \u2022 Max 3 attempts",
    otpVerify: "\u2713 Verify & Continue",
    otpFailed: "Verification failed. Try resending the code.",
    otpResendFailed: "Failed to resend OTP",
    otpDevLabel: "\ud83e\uddea Dev Mode OTP:",
    subTitle: "Activate Your Cosmic Access",
    subSubtitle: "Full access to all features",
    subFeature1: "Daily, Weekly & Monthly Palapala",
    subFeature2: "Full Vedic Birth Chart (Kendara Balima)",
    subFeature3: "Marriage Compatibility (Porondam Galapima)",
    subFeature4: "Complete Life Report with AI Analysis",
    subFeature5: "Daily Nakath & Rahu Kalaya Alerts",
    subFeature6: "Personalised Horoscope Predictions",
    subPerDay: "per day",
    subNote: "Charged from your mobile credit",
    subNetworks: "Dialog \u2022 Mobitel \u2022 Hutch \u2022 Airtel",
    subBtn: "\ud83d\udcb3 Subscribe \u2014 LKR 8/day",
    subSkip: "Maybe later \u2014 Continue with free features",
    subPayFail: "Payment failed. Please ensure you have enough mobile credit.",
    subFailed: "Subscription failed",
    nameTitle: "What's Your Name?",
    nameSubtitle: "We'll personalise everything for you",
    nameLabel: "YOUR NAME *",
    namePlaceholder: "Enter your name here",
    nameError: "Please enter your name (minimum 2 characters)",
    dateTitle: "When Were You Born?",
    dateSubtitle: "Optional but recommended for accurate readings",
    yearLabel: "YEAR",
    yearPlaceholder: "e.g. 1995",
    monthLabel: "MONTH",
    dayLabel: "DAY",
    dayPlaceholder: "e.g. 15",
    dateError: "Please enter a valid birth date",
    dateHint: "\ud83d\udca1 Birth date helps us calculate your Lagna chart",
    timeTitle: "What Time Were You Born?",
    timeSubtitle: "Check your birth certificate",
    hourLabel: "HOUR",
    minuteLabel: "MINUTE",
    timeHint: "\ud83d\udca1 Exact birth time makes your Lagna chart precise.\nIf unknown, skip \u2014 we'll use 12:00 PM.",
    placeTitle: "Where Were You Born?",
    placeSubtitle: "Select your birth city",
    placeSearch: "\ud83d\udd0d Search city...",
    placeHint: "\ud83d\udca1 Birth location affects your Lagna (Ascendant).\nDefault: Colombo if not selected.",
    subProgressName: "Name",
    subProgressDate: "Date",
    subProgressTime: "Time",
    subProgressPlace: "Place",
    back: "\u2190 Back",
    continueBtn: "Continue \u2192",
    completeSetup: "\u2728 Complete Setup",
    skipBirth: "Skip birth details \u2014 add later in Profile",
    saveFailed: "Failed to save. Please try again.",
    completeTitle: "Welcome to the Cosmos!",
    completeSubtitle: "Your cosmic journey begins now",
    completeLoading: "Loading your stars...",
    months: ["January","February","March","April","May","June","July","August","September","October","November","December"],
  },
  si: {
    welcomeSubtitle: "ලංකාවේ අංක 1 ජ්‍යෝතිෂ App එක \uD83C\uDDF1\uD83C\uDDF0",
    welcomeDesc: "ඔයාගේම පෞද්ගලික ජ්‍යෝතිෂවේදියා. \uD83D\uDD2E\nදවසෙ පලාපල, කේන්දරේ, පොරොන්දම් ඔක්කොම එකම තැනකින්.",
    welcomeBtn: "\u2728 වැඩේ පටන් ගන්න \u2014 මෙතන ඔබන්න",
    welcomeHint: "දවසට රු. 8යි යන්නේ (ගාණ අඩු කළා)",
    phoneTitle: "ඔයාගේ ෆෝන් නම්බර් එක?",
    phoneSubtitle: "අපිට නම්බර් එක දෙන්නකෝ",
    phonePlaceholder: "07X XXX XXXX",
    phoneError: "නම්බර් එක පොඩ්ඩක් වැරදියි වගේ",
    phoneNetwork: "Dialog, Mobitel, Hutch & Airtel ඕන එකක් වැඩ \uD83D\uDCF6",
    phoneSendOtp: "OTP කෝඩ් එක එවන්න \u2192",
    phoneFailedOtp: "OTP එක ආවේ නෑ. ආයි බලමු.",
    otpTitle: "කෝඩ් එක ගහන්න",
    otpSubtitle: "අපි SMS එකක් දැම්මා. පොඩ්ඩක් බලන්න:",
    otpPlaceholder: "ඉලක්කම් 6 කෝඩ් එක",
    otpError: "කෝඩ් එක වැරදියි වගේ",
    otpResend: "\uD83D\uDCE9 කෝඩ් එක ආවේ නැද්ද? ආයි එවන්න",
    otpHint: "විනාඩියක් ඇතුලත ගහන්න ඕන",
    otpVerify: "\u2713 හරි, ඉස්සරහට යමු",
    otpFailed: "වැඩේ හරිගියේ නෑ. කෝඩ් එක ආයි බලන්න.",
    otpResendFailed: "කෝඩ් එක එවන්න බැරි වුනා",
    otpDevLabel: "\uD83E\uDDEA ටෙස්ට් කෝඩ් එක:",
    subTitle: "Nakath AI Premium දාගන්න \uD83D\uDC51",
    subSubtitle: "ඔයාගේ අනාගතේ ගැන ඔක්කොම දැනගන්න පුලුවන්",
    subFeature1: "හැමදාම උදේට එන පලාපල",
    subFeature2: "ඔයාගේ කේන්දරේ සම්පූර්ණ විස්තරේ",
    subFeature3: "පොරොන්දම් ගැලපීම් (Love Match)",
    subFeature4: "AI එකෙන් අහලා දැනගන්න",
    subFeature5: "නැකැත් සහ රාහු කාලේ දැනුම්දීම්",
    subFeature6: "ඔයාටම හරියන අනාවැකි",
    subPerDay: "දවසට",
    subNote: "ෆෝන් බිලට තමයි එකතු වෙන්නේ \u26A1",
    subNetworks: "Dialog \u2022 Mobitel \u2022 Hutch \u2022 Airtel",
    subBtn: "\uD83D\uDCB3 දැන්ම ඇක්ටිව් කරගන්න \u2014 දවසට රු. 8යි",
    subSkip: "දැනට එපා \u2014 නිකන් තියෙන ටික ඇති",
    subPayFail: "සල්ලි කැපුනේ නෑ. ක්‍රෙඩිට් ඉවරද බලන්න.",
    subFailed: "ඇක්ටිව් වුනේ නෑ",
    nameTitle: "ඔයාගේ නම මොකක්ද?",
    nameSubtitle: "කේන්දරේ හදන්න නම ඕන වෙනවා",
    nameLabel: "නම *",
    namePlaceholder: "නම මෙතන ගහන්න",
    nameError: "නම දාලා ඉන්නකෝ",
    dateTitle: "උපන් දිනය කවදද?",
    dateSubtitle: "අනාවැකි හරියටම කියන්න මේක ඕන",
    yearLabel: "අවුරුද්ද",
    yearPlaceholder: "උදා: 1995",
    monthLabel: "මාසය",
    dayLabel: "දිනය",
    dayPlaceholder: "උදා: 15",
    dateError: "උපන් දිනය හරියට දාන්න",
    dateHint: "\uD83D\uDCA1 නැකැත්, ලග්න බලන්න මේක ඕනමයි",
    timeTitle: "ඉපදුන වෙලාව?",
    timeSubtitle: "උප්පැන්නෙ තියෙන වෙලාව තමයි හොඳම",
    hourLabel: "පැය",
    minuteLabel: "මිනිත්තු",
    timeHint: "\uD83D\uDCA1 වෙලාව වැරදුනොත් පලාපල වෙනස් වෙන්න පුලුවන්.\nදන්නේ නැත්නම් හිස්ව තියන්න. (අපි 12:00 PM කියලා ගන්නම්)",
    placeTitle: "ඉපදුන ගම?",
    placeSubtitle: "රෝහල තිබුන නගරය දුන්නනම් හරි",
    placeSearch: "\uD83D\uDD0D ටවුමේ නම ගහන්න...",
    placeHint: "\uD83D\uDCA1 ඉපදුන තැන අනුවත් කේන්දරේ වෙනස් වෙනවා.\nහරියට දන්නේ නැත්නම් 'Colombo' කියලා දාන්න.",
    subProgressName: "නම",
    subProgressDate: "උපන් දිනය",
    subProgressTime: "වෙලාව",
    subProgressPlace: "ගම",
    back: "\u2190 පස්සට",
    continueBtn: "ඉස්සරහට \u2192",
    completeSetup: "\u2728 ඔක්කොම හරි",
    skipBirth: "විස්තර පස්සේ දාන්නම්",
    saveFailed: "සේව් වුනේ නෑ. ආයි බලන්න.",
    completeTitle: "ඔයාගේ ගමන පටන් ගමු!",
    completeSubtitle: "ඔයාගේ ජ්‍යෝතිෂ ගමන ආරම්භයි",
    completeLoading: "තරු රටා ගණනය කරමින්...",
    months: ["ජනවාරි","පෙබරවාරි","මාර්තු"," අප්‍රේල්","මැයි","ජූනි","ජූලි","අගෝස්තු"," සැප්තැම්බර්","ඔක්තෝබර්","නොවැම්බර්","දෙසැම්බර්"],
  },
};

var SL_CITIES = [
  { name: 'Colombo', sinhala: '\u0d9a\u0ddc\u0dc5\u0db9', lat: 6.9271, lng: 79.8612 },
  { name: 'Kandy', sinhala: '\u0db8\u0dc4\u0db1\u0dd4\u0dc0\u0dbb', lat: 7.2906, lng: 80.6337 },
  { name: 'Galle', sinhala: '\u0d9c\u0dcf\u0dbd\u0dca\u0dbd', lat: 6.0535, lng: 80.2210 },
  { name: 'Jaffna', sinhala: '\u0dba\u0dcf\u0db4\u0db1\u0dba', lat: 9.6615, lng: 80.0255 },
  { name: 'Matara', sinhala: '\u0db8\u0dcf\u0dad\u0dbb', lat: 5.9549, lng: 80.5350 },
  { name: 'Negombo', sinhala: '\u0db8\u0dd3\u0d9c\u0db8\u0dd4\u0dc0', lat: 7.2089, lng: 79.8400 },
  { name: 'Anuradhapura', sinhala: '\u0d85\u0db1\u0dd4\u0dbb\u0dcf\u0db0\u0db4\u0dd4\u0dbb', lat: 8.3114, lng: 80.4037 },
  { name: 'Kurunegala', sinhala: '\u0d9a\u0dd4\u0dbb\u0dd4\u0dab\u0dd1\u0d9c\u0dbd', lat: 7.4863, lng: 80.3647 },
  { name: 'Ratnapura', sinhala: '\u0dbb\u0dad\u0dca\u0db1\u0db4\u0dd4\u0dbb', lat: 6.6828, lng: 80.3992 },
  { name: 'Badulla', sinhala: '\u0db6\u0daf\u0dd4\u0dbd\u0dca\u0dbd', lat: 6.9934, lng: 81.0550 },
  { name: 'Trincomalee', sinhala: '\u0dad\u0dca\u200d\u0dbb\u0dd2\u0d9a\u0dd4\u0dab\u0dcf\u0db8\u0dbd\u0dba', lat: 8.5874, lng: 81.2152 },
  { name: 'Batticaloa', sinhala: '\u0db8\u0da9\u0d9a\u0dbd\u0db4\u0dd4\u0dc0', lat: 7.7310, lng: 81.6934 },
  { name: 'Nuwara Eliya', sinhala: '\u0db1\u0dd4\u0dc0\u0dbb\u0d91\u0dc5\u0dd2\u0dba', lat: 6.9497, lng: 80.7891 },
  { name: 'Hambantota', sinhala: '\u0dc4\u0db8\u0dca\u0db6\u0db1\u0dca\u0dad\u0ddc\u0da7', lat: 6.1429, lng: 81.1212 },
  { name: 'Polonnaruwa', sinhala: '\u0db4\u0ddc\u0dc5\u0ddc\u0db1\u0dca\u0db1\u0dbb\u0dd4\u0dc0', lat: 7.9403, lng: 81.0188 },
  { name: 'Kegalle', sinhala: '\u0d9a\u0dd1\u0d9c\u0dbd\u0dca\u0dbd', lat: 7.2524, lng: 80.3467 },
  { name: 'Ampara', sinhala: '\u0d85\u0db8\u0dca\u0db4\u0dcf\u0dbb', lat: 7.2976, lng: 81.6720 },
  { name: 'Matale', sinhala: '\u0db8\u0dcf\u0dad\u0dbd\u0dda', lat: 7.4675, lng: 80.6234 },
  { name: 'Kalutara', sinhala: '\u0d9a\u0dc5\u0dd4\u0dad\u0dbb', lat: 6.5854, lng: 79.9607 },
  { name: 'Gampaha', sinhala: '\u0d9c\u0db8\u0dca\u0db4\u0dc4', lat: 7.0840, lng: 80.0098 },
  { name: 'Puttalam', sinhala: '\u0db4\u0dd4\u0dad\u0dca\u0dad\u0dbd\u0db8', lat: 8.0362, lng: 79.8283 },
  { name: 'Chilaw', sinhala: '\u0dc4\u0dbd\u0dcf\u0dc0\u0dad', lat: 7.5758, lng: 79.7953 },
  { name: 'Dambulla', sinhala: '\u0daf\u0db9\u0dd4\u0dbd\u0dca\u0dbd', lat: 7.8600, lng: 80.6517 },
  { name: 'Panadura', sinhala: '\u0db4\u0dcf\u0db1\u0daf\u0dd4\u0dbb', lat: 6.7133, lng: 79.9046 },
  { name: 'Moratuwa', sinhala: '\u0db8\u0ddc\u0dbb\u0da7\u0dd4\u0dc0', lat: 6.7731, lng: 79.8824 },
];


/* ──────────── STEP -1: LANGUAGE SELECTION ──────────── */
function LanguageStep({ onSelect }) {
  return (
    <View style={styles.stepContainer}>
      <Animated.View entering={FadeInDown.duration(800)} style={styles.languageContainer}>
        <Text style={styles.languageTitle}>{'\u0db7\u0dcf\u0dc2\u0dcf\u0dc0 \u0dad\u0ddd\u0dbb\u0db1\u0dca\u0db1'}</Text>
        <Text style={styles.languageTitleEn}>Select Your Language</Text>
        <View style={{ height: 30 }} />

        <TouchableOpacity
          style={styles.languageBtn}
          onPress={function() { onSelect('si'); }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FF6B00', '#FF8C33']}
            style={styles.languageBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.languageBtnText}>{'\u0dc3\u0dd2\u0d82\u0dc4\u0dbd'}</Text>
            <Text style={styles.languageBtnSub}>Sinhala</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 20 }} />

        <TouchableOpacity
          style={styles.languageBtn}
          onPress={function() { onSelect('en'); }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#6C63FF', '#8B85FF']}
            style={styles.languageBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.languageBtnText}>English</Text>
            <Text style={styles.languageBtnSub}>{'\u0d89\u0d82\u0d9c\u0dca\u200d\u0dbb\u0dd3\u0dc3\u0dd2'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

/* ──────────── STEP 0: WELCOME ──────────── */
function WelcomeStep({ onContinue, lang }) {
  var T = OB[lang] || OB.en;
  return (
    <View style={styles.stepContainer}>
      <Animated.View entering={FadeInDown.duration(800)}>
        <Text style={styles.welcomeEmoji}>{'\u2728\ud83c\udf1f\u2728'}</Text>
        <Text style={styles.welcomeTitle}>Nakath AI</Text>
        <Text style={styles.welcomeSubtitle}>{T.welcomeSubtitle}</Text>
        <Text style={styles.welcomeDesc}>{T.welcomeDesc}</Text>
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(400).duration(800)} style={styles.bottomSection}>
        <TouchableOpacity style={styles.primaryBtn} onPress={onContinue} activeOpacity={0.8}>
          <LinearGradient
            colors={['#FF6B00', '#FF8C33']}
            style={styles.btnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.btnText}>{T.welcomeBtn}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.hintText}>{T.welcomeHint}</Text>
      </Animated.View>
    </View>
  );
}

/* ──────────── STEP 1: PHONE ──────────── */
function PhoneStep({ onContinue, lang }) {
  var T = OB[lang] || OB.en;
  var [phone, setPhone] = useState('');
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState('');
  var { sendOtp } = useAuth();

  var handleSend = async function() {
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
    <View style={styles.stepContainer}>
      <Animated.View entering={FadeInDown.duration(600)}>
        <Ionicons name="phone-portrait-outline" size={48} color="#FF6B00" style={{ alignSelf: 'center', marginBottom: 16 }} />
        <Text style={styles.stepTitle}>{T.phoneTitle}</Text>
        <Text style={styles.stepSubtitle}>{T.phoneSubtitle}</Text>
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(200).duration(600)} style={{ marginTop: 30 }}>
        <View style={styles.phoneRow}>
          <View style={styles.prefixBox}><Text style={styles.prefixText}>+94</Text></View>
          <TextInput
            style={styles.phoneInput}
            placeholder={T.phonePlaceholder}
            placeholderTextColor="#666"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={function(t) { setPhone(t); setError(''); }}
            maxLength={12}
          />
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Text style={styles.networkText}>{T.phoneNetwork}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleSend} disabled={loading} activeOpacity={0.8}>
          <LinearGradient colors={['#FF6B00', '#FF8C33']} style={styles.btnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>{T.phoneSendOtp}</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

/* ──────────── STEP 2: OTP ──────────── */
function OtpStep({ phone, referenceNo, onContinue, lang }) {
  var T = OB[lang] || OB.en;
  var [otp, setOtp] = useState('');
  var [currentRef, setCurrentRef] = useState(referenceNo);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState('');
  var [devOtp, setDevOtp] = useState(null);
  var { verifyAndLogin, sendOtp: resendOtp } = useAuth();
  
  // Update ref if prop changes (rare case but good practice)
  useEffect(function() { setCurrentRef(referenceNo); }, [referenceNo]);

  useEffect(function() {
    if (__DEV__ && phone) {
      fetch(BASE + '/api/auth/dev-otp/' + encodeURIComponent(phone))
        .then(function(r) { return r.json(); })
        .then(function(d) { if (d.otp) setDevOtp(d.otp); })
        .catch(function() {});
    }
  }, [phone]);

  var handleVerify = async function() {
    if (!otp || otp.length < 4) { setError(T.otpError); return; }
    setLoading(true); setError('');
    try {
      if (!currentRef) throw new Error('Missing reference number');
      await verifyAndLogin(phone, otp, currentRef);
      onContinue();
    } catch (e) { console.error(e); setError(T.otpFailed); }
    finally { setLoading(false); }
  };

  var handleResend = async function() {
    try { 
      var res = await resendOtp(phone);
      if (res && res.referenceNo) setCurrentRef(res.referenceNo);
      Alert.alert('', T.otpResend); 
    }
    catch (e) { Alert.alert('', T.otpResendFailed); }
  };

  return (
    <View style={styles.stepContainer}>
      <Animated.View entering={FadeInDown.duration(600)}>
        <Ionicons name="shield-checkmark-outline" size={48} color="#FF6B00" style={{ alignSelf: 'center', marginBottom: 16 }} />
        <Text style={styles.stepTitle}>{T.otpTitle}</Text>
        <Text style={styles.stepSubtitle}>{T.otpSubtitle} {phone}</Text>
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(200).duration(600)} style={{ marginTop: 30 }}>
        {devOtp ? (
          <View style={styles.devOtpBox}>
            <Text style={styles.devOtpLabel}>{T.otpDevLabel}</Text>
            <Text style={styles.devOtpCode}>{devOtp}</Text>
          </View>
        ) : null}
        <TextInput
          style={styles.otpInput}
          placeholder={T.otpPlaceholder}
          placeholderTextColor="#666"
          keyboardType="number-pad"
          value={otp}
          onChangeText={function(t) { setOtp(t); setError(''); }}
          maxLength={6}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity onPress={handleResend}><Text style={styles.resendText}>{T.otpResend}</Text></TouchableOpacity>
        <Text style={styles.hintText}>{T.otpHint}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleVerify} disabled={loading} activeOpacity={0.8}>
          <LinearGradient colors={['#FF6B00', '#FF8C33']} style={styles.btnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>{T.otpVerify}</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

/* ──────────── STEP 3: SUBSCRIPTION ──────────── */
function SubscriptionStep({ onContinue, lang }) {
  var T = OB[lang] || OB.en;
  var [loading, setLoading] = useState(false);
  var { activateSubscription } = useAuth();

  var features = [
    { icon: 'calendar', text: T.subFeature1 },
    { icon: 'planet', text: T.subFeature2 },
    { icon: 'heart', text: T.subFeature3 },
    { icon: 'document-text', text: T.subFeature4 },
    { icon: 'time', text: T.subFeature5 },
    { icon: 'star', text: T.subFeature6 },
  ];

  var handleSub = async function() {
    setLoading(true);
    try {
      await activateSubscription();
      onContinue();
    } catch (e) {
      Alert.alert(T.subFailed, T.subPayFail);
    } finally { setLoading(false); }
  };

  return (
    <ScrollView contentContainerStyle={styles.stepContainer}>
      <Animated.View entering={FadeInDown.duration(600)}>
        <Ionicons name="diamond" size={48} color="#FFD700" style={{ alignSelf: 'center', marginBottom: 16 }} />
        <Text style={styles.stepTitle}>{T.subTitle}</Text>
        <Text style={styles.stepSubtitle}>{T.subSubtitle}</Text>
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(200).duration(600)} style={{ marginTop: 20 }}>
        {features.map(function(f, i) {
          return (
            <View key={i} style={styles.featureRow}>
              <Ionicons name={f.icon} size={22} color="#FF6B00" />
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          );
        })}
        <View style={styles.priceBox}>
          <Text style={styles.priceAmount}>LKR 8</Text>
          <Text style={styles.priceLabel}>{T.subPerDay}</Text>
        </View>
        <Text style={styles.priceNote}>{T.subNote}</Text>
        <Text style={styles.networkText}>{T.subNetworks}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleSub} disabled={loading} activeOpacity={0.8}>
          <LinearGradient colors={['#FF6B00', '#FF8C33']} style={styles.btnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>{T.subBtn}</Text>}
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={onContinue}>
          <Text style={styles.skipText}>{T.subSkip}</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}


/* ──────────── STEP 4: BIRTH DATA (multi-page wizard) ──────────── */
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

  var filteredCities = SL_CITIES.filter(function(c) {
    if (!citySearch) return true;
    var q = citySearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.sinhala.includes(citySearch);
  });

  var progressLabels = [T.subProgressName, T.subProgressDate, T.subProgressTime, T.subProgressPlace];

  var handleSubmit = async function() {
    if (displayName.trim().length < 2) { setError(T.nameError); setPage(0); return; }
    setLoading(true); setError('');
    try {
      var birthData = {};
      if (year && month !== null && day) {
        var h = parseInt(hour) || 12;
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        var m = parseInt(minute) || 0;
        
        // Store as naive SL time string (no UTC conversion)
        // Format: "YYYY-MM-DDThh:mm:00" — always interpreted as Asia/Colombo
        var pad = function(n) { return n.toString().padStart(2, '0'); };
        var dateTime = parseInt(year) + '-' + pad(month + 1) + '-' + pad(parseInt(day)) + 'T' + pad(h) + ':' + pad(m) + ':00';
        
        birthData = {
          dateTime: dateTime,
          lat: selectedCity ? selectedCity.lat : 6.9271,
          lng: selectedCity ? selectedCity.lng : 79.8612,
          locationName: selectedCity ? selectedCity.name : 'Colombo',
          timezone: 'Asia/Colombo', // Default to SL
        };
      }
      await completeOnboarding(displayName.trim(), Object.keys(birthData).length > 0 ? birthData : null);
      onComplete();
    } catch (e) { setError(T.saveFailed); }
    finally { setLoading(false); }
  };

  /* Sub-page: Name */
  var renderNamePage = function() {
    return (
      <Animated.View key="name" entering={FadeIn.duration(400)}>
        <Ionicons name="person-circle-outline" size={48} color="#FF6B00" style={{ alignSelf: 'center', marginBottom: 16 }} />
        <Text style={styles.stepTitle}>{T.nameTitle}</Text>
        <Text style={styles.stepSubtitle}>{T.nameSubtitle}</Text>
        <View style={{ marginTop: 30 }}>
          <Text style={styles.inputLabel}>{T.nameLabel}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={T.namePlaceholder}
            placeholderTextColor="#666"
            value={displayName}
            onChangeText={function(t) { setDisplayName(t); setError(''); }}
            autoFocus
          />
          {error && page === 0 ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
        <TouchableOpacity
          style={[styles.primaryBtn, displayName.trim().length < 2 && styles.disabledBtn]}
          onPress={function() { if (displayName.trim().length >= 2) setPage(1); else setError(T.nameError); }}
          disabled={displayName.trim().length < 2}
          activeOpacity={0.8}
        >
          <LinearGradient colors={displayName.trim().length >= 2 ? ['#FF6B00', '#FF8C33'] : ['#444', '#555']} style={styles.btnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.btnText}>{T.continueBtn}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  /* Sub-page: Date */
  var renderDatePage = function() {
    return (
      <Animated.View key="date" entering={FadeIn.duration(400)}>
        <Text style={styles.stepTitle}>{T.dateTitle}</Text>
        <Text style={styles.stepSubtitle}>{T.dateSubtitle}</Text>
        <View style={{ marginTop: 20 }}>
          <Text style={styles.inputLabel}>{T.yearLabel}</Text>
          <TextInput style={styles.textInput} placeholder={T.yearPlaceholder} placeholderTextColor="#666" keyboardType="number-pad" value={year} onChangeText={setYear} maxLength={4} />
          <Text style={[styles.inputLabel, { marginTop: 16 }]}>{T.monthLabel}</Text>
          <View style={styles.monthGrid}>
            {T.months.map(function(m, i) {
              return (
                <TouchableOpacity key={i} style={[styles.monthChip, month === i && styles.monthChipActive]} onPress={function() { setMonth(i); }}>
                  <Text style={[styles.monthChipText, month === i && styles.monthChipTextActive]}>{m.slice(0, 3)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.inputLabel, { marginTop: 16 }]}>{T.dayLabel}</Text>
          <TextInput style={styles.textInput} placeholder={T.dayPlaceholder} placeholderTextColor="#666" keyboardType="number-pad" value={day} onChangeText={setDay} maxLength={2} />
          <Text style={styles.hintText}>{T.dateHint}</Text>
        </View>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={function() { setPage(0); }}><Text style={styles.backText}>{T.back}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtnSmall} onPress={function() { setPage(2); }} activeOpacity={0.8}>
            <LinearGradient colors={['#FF6B00', '#FF8C33']} style={styles.btnGradientSmall} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.btnTextSmall}>{T.continueBtn}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  /* Sub-page: Time */
  var renderTimePage = function() {
    return (
      <Animated.View key="time" entering={FadeIn.duration(400)}>
        <Text style={styles.stepTitle}>{T.timeTitle}</Text>
        <Text style={styles.stepSubtitle}>{T.timeSubtitle}</Text>
        <View style={{ marginTop: 20 }}>
          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>{T.hourLabel}</Text>
              <TextInput style={styles.textInput} placeholder="12" placeholderTextColor="#666" keyboardType="number-pad" value={hour} onChangeText={setHour} maxLength={2} />
            </View>
            <Text style={styles.timeSeparator}>:</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>{T.minuteLabel}</Text>
              <TextInput style={styles.textInput} placeholder="00" placeholderTextColor="#666" keyboardType="number-pad" value={minute} onChangeText={setMinute} maxLength={2} />
            </View>
          </View>
          <View style={styles.ampmRow}>
            <TouchableOpacity style={[styles.ampmBtn, ampm === 'AM' && styles.ampmActive]} onPress={function() { setAmpm('AM'); }}>
              <Text style={[styles.ampmText, ampm === 'AM' && styles.ampmActiveText]}>AM</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ampmBtn, ampm === 'PM' && styles.ampmActive]} onPress={function() { setAmpm('PM'); }}>
              <Text style={[styles.ampmText, ampm === 'PM' && styles.ampmActiveText]}>PM</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hintText}>{T.timeHint}</Text>
        </View>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={function() { setPage(1); }}><Text style={styles.backText}>{T.back}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtnSmall} onPress={function() { setPage(3); }} activeOpacity={0.8}>
            <LinearGradient colors={['#FF6B00', '#FF8C33']} style={styles.btnGradientSmall} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.btnTextSmall}>{T.continueBtn}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  /* Sub-page: Place */
  var renderPlacePage = function() {
    return (
      <Animated.View key="place" entering={FadeIn.duration(400)}>
        <Text style={styles.stepTitle}>{T.placeTitle}</Text>
        <Text style={styles.stepSubtitle}>{T.placeSubtitle}</Text>
        <View style={{ marginTop: 20 }}>
          <TextInput
            style={styles.textInput}
            placeholder={T.placeSearch}
            placeholderTextColor="#666"
            value={citySearch}
            onChangeText={setCitySearch}
          />
          <ScrollView style={styles.cityList} nestedScrollEnabled>
            {filteredCities.map(function(city, i) {
              var isSelected = selectedCity && selectedCity.name === city.name;
              return (
                <TouchableOpacity key={i} style={[styles.cityItem, isSelected && styles.cityItemActive]} onPress={function() { setSelectedCity(city); }}>
                  <Text style={[styles.cityName, isSelected && styles.cityNameActive]}>
                    {lang === 'si' ? city.sinhala : city.name}
                  </Text>
                  <Text style={styles.citySub}>
                    {lang === 'si' ? city.name : city.sinhala}
                  </Text>
                  {isSelected ? <Ionicons name="checkmark-circle" size={20} color="#FF6B00" /> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={styles.hintText}>{T.placeHint}</Text>
        </View>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={function() { setPage(2); }}><Text style={styles.backText}>{T.back}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtnSmall} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
            <LinearGradient colors={['#FF6B00', '#FF8C33']} style={styles.btnGradientSmall} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.btnTextSmall}>{T.completeSetup}</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          <Text style={styles.skipText}>{T.skipBirth}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.stepContainer} keyboardShouldPersistTaps="handled">
      {/* Progress bar */}
      <View style={styles.progressRow}>
        {progressLabels.map(function(label, i) {
          return (
            <View key={i} style={styles.progressItem}>
              <View style={[styles.progressDot, i <= page && styles.progressDotActive]} />
              <Text style={[styles.progressLabel, i <= page && styles.progressLabelActive]}>{label}</Text>
            </View>
          );
        })}
      </View>
      {page === 0 ? renderNamePage()
        : page === 1 ? renderDatePage()
        : page === 2 ? renderTimePage()
        : renderPlacePage()}
    </ScrollView>
  );
}

/* ──────────── STEP 5: COMPLETE ──────────── */
function CompleteStep({ lang }) {
  var T = OB[lang] || OB.en;
  return (
    <View style={[styles.stepContainer, { justifyContent: 'center', alignItems: 'center' }]}>
      <Animated.View entering={FadeInDown.duration(800)} style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 60, marginBottom: 20 }}>{'\ud83c\udf1f'}</Text>
        <Text style={styles.stepTitle}>{T.completeTitle}</Text>
        <Text style={styles.stepSubtitle}>{T.completeSubtitle}</Text>
        <ActivityIndicator size="large" color="#FF6B00" style={{ marginTop: 30 }} />
        <Text style={[styles.hintText, { marginTop: 16 }]}>{T.completeLoading}</Text>
      </Animated.View>
    </View>
  );
}


/* ──────────── MAIN ONBOARDING SCREEN ──────────── */
export default function OnboardingScreen() {
  var [step, setStep] = useState(-1);
  var [phone, setPhone] = useState('');
  var [referenceNo, setReferenceNo] = useState(null);
  var [lang, setLang] = useState('en');
  var { switchLanguage } = useLanguage();

  var handleLanguageSelect = function(selectedLang) {
    setLang(selectedLang);
    switchLanguage(selectedLang);
    setStep(0);
  };

  var renderStep = function() {
    switch (step) {
      case -1: return <LanguageStep onSelect={handleLanguageSelect} />;
      case 0: return <WelcomeStep onContinue={function() { setStep(1); }} lang={lang} />;
      case 1: return <PhoneStep onContinue={function(ph, ref) { setPhone(ph); setReferenceNo(ref); setStep(2); }} lang={lang} />;
      case 2: return <OtpStep phone={phone} referenceNo={referenceNo} onContinue={function() { setStep(3); }} lang={lang} />;
      case 3: return <SubscriptionStep onContinue={function() { setStep(4); }} lang={lang} />;
      case 4: return <BirthDataStep onComplete={function() { setStep(5); }} lang={lang} />;
      case 5: return <CompleteStep lang={lang} />;
      default: return <LanguageStep onSelect={handleLanguageSelect} />;
    }
  };

  return (
    <CosmicBackground>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {renderStep()}
      </KeyboardAvoidingView>
    </CosmicBackground>
  );
}

/* ──────────── STYLES ──────────── */
var styles = StyleSheet.create({
  stepContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  languageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 4,
  },
  languageTitleEn: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 10,
  },
  languageBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  languageBtnGradient: {
    paddingVertical: 24,
    alignItems: 'center',
    borderRadius: 16,
  },
  languageBtnText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
  },
  languageBtnSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  welcomeEmoji: {
    fontSize: 40,
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFD700',
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#FF6B00',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  welcomeDesc: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 24,
  },
  bottomSection: {
    marginTop: 40,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 8,
  },
  primaryBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 24,
  },
  btnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
  },
  btnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  hintText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  prefixBox: {
    backgroundColor: 'rgba(255,107,0,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
    marginRight: 10,
  },
  prefixText: {
    color: '#FF6B00',
    fontSize: 17,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFF',
    fontSize: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  networkText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  otpInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFF',
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  resendText: {
    color: '#FF6B00',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  devOtpBox: {
    backgroundColor: 'rgba(0,255,0,0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,255,0,0.3)',
  },
  devOtpLabel: {
    color: '#00FF00',
    fontSize: 12,
    marginBottom: 4,
  },
  devOtpCode: {
    color: '#00FF00',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 6,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    marginBottom: 8,
  },
  featureText: {
    color: '#FFF',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: 20,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFD700',
  },
  priceLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginLeft: 8,
  },
  priceNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 4,
  },
  skipText: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 13,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 1,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  monthChipActive: {
    backgroundColor: 'rgba(255,107,0,0.2)',
    borderColor: '#FF6B00',
  },
  monthChipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
  },
  monthChipTextActive: {
    color: '#FF6B00',
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeSeparator: {
    color: '#FF6B00',
    fontSize: 28,
    fontWeight: '700',
    marginHorizontal: 12,
    marginTop: 20,
  },
  ampmRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 12,
  },
  ampmBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  ampmActive: {
    backgroundColor: 'rgba(255,107,0,0.2)',
    borderColor: '#FF6B00',
  },
  ampmText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '600',
  },
  ampmActiveText: {
    color: '#FF6B00',
  },
  cityList: {
    maxHeight: 220,
    marginTop: 12,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cityItemActive: {
    backgroundColor: 'rgba(255,107,0,0.15)',
    borderColor: 'rgba(255,107,0,0.4)',
  },
  cityName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  cityNameActive: {
    color: '#FF6B00',
    fontWeight: '700',
  },
  citySub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginRight: 8,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
  },
  backText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
  },
  primaryBtnSmall: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  btnGradientSmall: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  btnTextSmall: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    gap: 20,
  },
  progressItem: {
    alignItems: 'center',
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 4,
  },
  progressDotActive: {
    backgroundColor: '#FF6B00',
  },
  progressLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
  },
  progressLabelActive: {
    color: '#FF6B00',
    fontWeight: '600',
  },
});
