/**
 * Full Jyotish Report Screen
 * 
 * Premium 14-section comprehensive astrology report with
 * collapsible cards, color-coded indicators, timeline view,
 * and cosmic design language.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Platform, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, useAnimatedScrollHandler, withRepeat, withTiming, withSequence, interpolate } from 'react-native-reanimated';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import CosmicBackground from '../../components/CosmicBackground';
import DesktopScreenWrapper, { useDesktopCtx } from '../../components/DesktopScreenWrapper';
import MarkdownText from '../../components/MarkdownText';
import SriLankanChart from '../../components/SriLankanChart';
import SpringPressable from '../../components/effects/SpringPressable';
import CosmicSpinner from '../../components/effects/CosmicLoader';
import { DatePickerField, TimePickerField } from '../../components/CosmicDateTimePicker';
import { generateReportHTML } from '../../utils/pdfReportGenerator';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

// ──────────────────────────────────────────
// Section icons & gradient colors
// ──────────────────────────────────────────
var SECTION_META = {
  personality:      { colors: ['#3B82F6', '#1E3A8A'], emoji: '✨', gradient: ['#818CF8', '#3B82F6'] },
  yogaAnalysis:     { colors: ['#9333EA', '#581C87'], emoji: '⚡', gradient: ['#B47AFF', '#9333EA'] },
  lifePredictions:  { colors: ['#8B5CF6', '#4C1D95'], emoji: '🔮', gradient: ['#A78BFA', '#8B5CF6'] },
  career:           { colors: ['#F59E0B', '#92400E'], emoji: '💼', gradient: ['#FFB800', '#F59E0B'] },
  marriage:         { colors: ['#EC4899', '#831843'], emoji: '💍', gradient: ['#F9A8D4', '#EC4899'] },
  marriedLife:      { colors: ['#E11D48', '#881337'], emoji: '🏠', gradient: ['#FDA4AF', '#E11D48'] },
  financial:        { colors: ['#22C55E', '#14532D'], emoji: '💰', gradient: ['#4ADE80', '#22C55E'] },
  children:         { colors: ['#10B981', '#064E3B'], emoji: '👶', gradient: ['#34D399', '#10B981'] },
  familyPortrait:   { colors: ['#0EA5E9', '#0C4A6E'], emoji: '👨‍👩‍👧‍👦', gradient: ['#38BDF8', '#0EA5E9'] },
  health:           { colors: ['#EF4444', '#7F1D1D'], emoji: '🏥', gradient: ['#FCA5A5', '#EF4444'] },
  mentalHealth:     { colors: ['#06B6D4', '#0E7490'], emoji: '🧠', gradient: ['#67E8F9', '#06B6D4'] },
  foreignTravel:    { colors: ['#6366F1', '#312E81'], emoji: '✈️', gradient: ['#A5B4FC', '#6366F1'] },
  education:        { colors: ['#7C3AED', '#4C1D95'], emoji: '🎓', gradient: ['#A78BFA', '#7C3AED'] },
  luck:             { colors: ['#FFB800', '#78350F'], emoji: '🎰', gradient: ['#FDE68A', '#FFB800'] },
  legal:            { colors: ['#64748B', '#1E293B'], emoji: '⚖️', gradient: ['#94A3B8', '#64748B'] },
  spiritual:        { colors: ['#A855F7', '#581C87'], emoji: '🙏', gradient: ['#D8B4FE', '#A855F7'] },
  realEstate:       { colors: ['#84CC16', '#365314'], emoji: '🏡', gradient: ['#BEF264', '#84CC16'] },
  transits:         { colors: ['#14B8A6', '#134E4A'], emoji: '🌍', gradient: ['#5EEAD4', '#14B8A6'] },
  surpriseInsights: { colors: ['#F97316', '#9A3412'], emoji: '🤯', gradient: ['#FDBA74', '#F97316'] },
  timeline25:       { colors: ['#6366F1', '#312E81'], emoji: '📅', gradient: ['#A5B4FC', '#6366F1'] },
  remedies:         { colors: ['#FFB800', '#78350F'], emoji: '💎', gradient: ['#FDE68A', '#FFB800'] },
};

var SECTION_KEYS = [
  'personality', 'yogaAnalysis', 'lifePredictions', 'career', 'marriage', 'marriedLife', 'financial',
  'children', 'familyPortrait', 'health', 'mentalHealth', 'foreignTravel', 'education', 'luck',
  'legal', 'spiritual', 'realEstate', 'transits', 'surpriseInsights', 'timeline25', 'remedies',
];

var SECTION_TITLES = {
  personality: 'reportPersonality',
  yogaAnalysis: 'reportYogas',
  lifePredictions: 'reportLifePredictions',
  career: 'reportCareer',
  marriage: 'reportMarriage',
  marriedLife: 'reportMarriedLife',
  financial: 'reportFinancial',
  children: 'reportChildren',
  familyPortrait: 'reportFamilyPortrait',
  health: 'reportHealth',
  mentalHealth: 'reportMentalHealth',
  foreignTravel: 'reportForeignTravel',
  education: 'reportEducation',
  luck: 'reportLuck',
  legal: 'reportLegal',
  spiritual: 'reportSpiritual',
  realEstate: 'reportRealEstate',
  transits: 'reportTransits',
  surpriseInsights: 'reportSurpriseInsights',
  timeline25: 'reportTimeline',
  remedies: 'reportRemedies',
};

// ──────────────────────────────────────────
// Glass box wrapper
// ──────────────────────────────────────────
function AuraBox({ children, style }) {
  return (
    <View style={[gs.box, style]}>
      <LinearGradient
        colors={['rgba(20, 12, 50, 0.55)', 'rgba(10, 6, 28, 0.65)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        pointerEvents="none"
      />
      <View style={gs.innerGlow} pointerEvents="none" />
      {children}
    </View>
  );
}
var gs = StyleSheet.create({
  box: {
    borderRadius: 20, overflow: 'hidden', borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.10)', padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', borderRadius: 20,
  },
});

// ══════════════════════════════════════════
// COLLAPSIBLE SECTION CARD
// ══════════════════════════════════════════
function SectionCard({ sectionKey, data, index, t, aiNarrative, reportLang }) {
  var [expanded, setExpanded] = useState(index < 3); // First 3 open by default
  var meta = SECTION_META[sectionKey] || {};
  var isSi = reportLang === 'si';
  // When Sinhala, always use i18n title; otherwise prefer AI title, fallback to i18n
  var i18nTitle = t(SECTION_TITLES[sectionKey]);
  var title = isSi ? (i18nTitle || aiNarrative?.title || sectionKey) : (aiNarrative?.title || i18nTitle || sectionKey);

  // If no AI narrative available, skip this section entirely
  if (!aiNarrative?.narrative) return null;

  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 60).duration(600)}>
      <SpringPressable haptic="light" scalePressed={0.97} onPress={function() { setExpanded(!expanded); }}>
        <AuraBox style={{ padding: 0 }}>
          {/* Header */}
          <View style={sc.header}>
            <LinearGradient
              colors={meta.gradient || meta.colors || ['#333', '#111']}
              style={sc.iconBg}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Text style={sc.emoji}>{meta.emoji || '📋'}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={sc.title} numberOfLines={2}>{title}</Text>
            </View>
            <View style={[sc.chevronBg, expanded && sc.chevronBgActive]}>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={expanded ? '#B47AFF' : 'rgba(255,255,255,0.4)'} />
            </View>
          </View>
          {/* Content — AI Narrative Only */}
          {expanded && (
            <View style={sc.content}>
              <View style={sc.divider} />
              <View style={sc.narrativeWrap}>
                <MarkdownText>{aiNarrative.narrative}</MarkdownText>
              </View>
            </View>
          )}
        </AuraBox>
      </SpringPressable>
    </Animated.View>
  );
}

var sc = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  iconBg: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  emoji: { fontSize: 22 },
  title: { color: '#F1F5F9', fontSize: 15, fontWeight: '700', lineHeight: 21 },
  chevronBg: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  chevronBgActive: { backgroundColor: 'rgba(180,122,255,0.15)' },
  content: { paddingHorizontal: 16, paddingBottom: 16 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 12 },
  narrativeWrap: {
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)',
  },
});

// ══════════════════════════════════════════
// COSMIC LOADING ANIMATION
// ══════════════════════════════════════════
var LOADING_STAGES = {
  en: [
    { text: '🌌 Looking into your birth moment...', sub: 'The sky tells a story about the second you arrived' },
    { text: '🪐 Discovering your hidden patterns...', sub: 'Finding the invisible threads that shape your life' },
    { text: '✨ Your life story is taking shape...', sub: 'Weaving together your past, present, and future' },
    { text: '🔮 Uncovering what the future holds...', sub: 'Reading the chapters of your life not yet written' },
    { text: '📜 Writing your personal story...', sub: 'Almost there — every word is written just for you' },
  ],
  si: [
    { text: '🌌 ඔයා ඉපදුන මොහොත බලමින්...', sub: 'ඔයා ලෝකෙට ආපු තත්පරයේ අහස මොකද කියන්නේ' },
    { text: '🪐 ඔයාගේ සැඟවුණු රටා සොයමින්...', sub: 'ඔයාගේ ජීවිතය හැඩගස්වන නොපෙනෙන නූල් සොයමින්' },
    { text: '✨ ඔයාගේ ජීවිත කතාව හැදෙමින්...', sub: 'ඔයාගේ අතීතය, වර්තමානය, අනාගතය එක් කරමින්' },
    { text: '🔮 අනාගතයේ මොකද තියෙන්නේ කියා සොයමින්...', sub: 'තවම ලියැවෙන්නට ඇති පරිච්ඡේද කියවමින්' },
    { text: '📜 ඔයාගේ කතාව ලියමින්...', sub: 'ඉවරවෙන්න ආසන්නයි — හැම වචනයක්ම ඔයාට විතරක්' },
  ],
};

function CosmicLoader({ progress, userName, language }) {
  var lang = language || 'en';
  var stages = LOADING_STAGES[lang] || LOADING_STAGES.en;
  var rotation = useSharedValue(0);
  var pulse = useSharedValue(1);
  var orbit1 = useSharedValue(0);
  var orbit2 = useSharedValue(0);
  var orbit3 = useSharedValue(0);
  var glow = useSharedValue(0.3);
  var [stageIndex, setStageIndex] = useState(0);

  useEffect(function() {
    // Main rotation
    rotation.value = withRepeat(withTiming(360, { duration: 8000 }), -1, false);
    // Pulse
    pulse.value = withRepeat(withSequence(
      withTiming(1.15, { duration: 1200 }),
      withTiming(0.95, { duration: 1200 })
    ), -1, true);
    // Orbits at different speeds
    orbit1.value = withRepeat(withTiming(360, { duration: 3000 }), -1, false);
    orbit2.value = withRepeat(withTiming(360, { duration: 5000 }), -1, false);
    orbit3.value = withRepeat(withTiming(360, { duration: 7000 }), -1, false);
    // Glow pulse
    glow.value = withRepeat(withSequence(
      withTiming(0.8, { duration: 2000 }),
      withTiming(0.3, { duration: 2000 })
    ), -1, true);

    // Cycle through stages
    var interval = setInterval(function() {
      setStageIndex(function(prev) { return (prev + 1) % stages.length; });
    }, 5000);
    return function() { clearInterval(interval); };
  }, []);

  var spinStyle = useAnimatedStyle(function() {
    return { transform: [{ rotate: rotation.value + 'deg' }] };
  });
  var pulseStyle = useAnimatedStyle(function() {
    return { transform: [{ scale: pulse.value }], opacity: glow.value };
  });
  var orbit1Style = useAnimatedStyle(function() {
    return { transform: [{ rotate: orbit1.value + 'deg' }, { translateX: 50 }, { rotate: -orbit1.value + 'deg' }] };
  });
  var orbit2Style = useAnimatedStyle(function() {
    return { transform: [{ rotate: orbit2.value + 'deg' }, { translateX: 70 }, { rotate: -orbit2.value + 'deg' }] };
  });
  var orbit3Style = useAnimatedStyle(function() {
    return { transform: [{ rotate: orbit3.value + 'deg' }, { translateX: 90 }, { rotate: -orbit3.value + 'deg' }] };
  });

  var stage = stages[stageIndex];

  var personalMsg = lang === 'si'
    ? (userName ? 'පොඩ්ඩක් ඉන්න ' + userName + '! ඔයාගේ ජීවිත කතාව ලියමින්... ✨' : 'ඔයාගේ ජීවිත කතාව ලියමින්... ✨')
    : (userName ? 'Hold tight, ' + userName + '! Your life story is being written... ✨' : 'Your life story is being written... ✨');

  var timeMsg = lang === 'si' ? 'තත්පර 20-40ක් ගතවේ' : 'This takes 20-40 seconds';

  return (
    <View style={cl.container}>
      {/* Orbiting system */}
      <View style={cl.orbitContainer}>
        {/* Glow behind */}
        <Animated.View style={[cl.glowCircle, pulseStyle]} />
        
        {/* Center sun */}
        <Animated.View style={[cl.centerOrb, spinStyle]}>
          <LinearGradient
            colors={['#FFB800', '#F59E0B', '#D97706']}
            style={cl.centerGrad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
        </Animated.View>

        {/* Orbit rings (decorative) */}
        <View style={[cl.orbitRing, { width: 100, height: 100 }]} />
        <View style={[cl.orbitRing, { width: 140, height: 140 }]} />
        <View style={[cl.orbitRing, { width: 180, height: 180 }]} />

        {/* Orbiting planets */}
        <Animated.View style={[cl.planet, cl.planet1, orbit1Style]}>
          <Text style={{ fontSize: 16 }}>🪐</Text>
        </Animated.View>
        <Animated.View style={[cl.planet, cl.planet2, orbit2Style]}>
          <Text style={{ fontSize: 14 }}>🌙</Text>
        </Animated.View>
        <Animated.View style={[cl.planet, cl.planet3, orbit3Style]}>
          <Text style={{ fontSize: 12 }}>⭐</Text>
        </Animated.View>
      </View>

      {/* Stage text */}
      <Animated.View entering={FadeIn.duration(600)} key={stageIndex} style={cl.textWrap}>
        <Text style={cl.stageText}>{stage.text}</Text>
        <Text style={cl.stageSub}>{stage.sub}</Text>
      </Animated.View>

      {/* Personal touch */}
      <Text style={cl.personalText}>
        {personalMsg}
      </Text>

      {/* Progress hint */}
      <View style={cl.progressRow}>
        <View style={cl.progressBar}>
          <LinearGradient
            colors={['#9333EA', '#FFB800']}
            style={[cl.progressFill, { width: ((stageIndex + 1) / stages.length * 100) + '%' }]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          />
        </View>
        <Text style={cl.progressText}>{timeMsg}</Text>
      </View>
    </View>
  );
}

var cl = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  orbitContainer: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  glowCircle: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,184,0,0.15)' },
  centerOrb: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', zIndex: 10 },
  centerGrad: { flex: 1, borderRadius: 20 },
  orbitRing: { position: 'absolute', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(180,122,255,0.15)', borderStyle: 'dashed' },
  planet: { position: 'absolute', zIndex: 5 },
  planet1: {},
  planet2: {},
  planet3: {},
  textWrap: { alignItems: 'center', marginBottom: 20 },
  stageText: { color: '#F1F5F9', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  stageSub: { color: '#94A3B8', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  personalText: { color: '#B47AFF', fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 24, fontStyle: 'italic' },
  progressRow: { width: '100%', alignItems: 'center' },
  progressBar: { width: '80%', height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: { color: '#475569', fontSize: 11, fontWeight: '600' },
});

// ══════════════════════════════════════════
// BIRTH LOCATION DATA
// ══════════════════════════════════════════
var BIRTH_LOCATIONS = [
  { name: 'Colombo', lat: 6.9271, lng: 79.8612 },
  { name: 'Kandy', lat: 7.2906, lng: 80.6337 },
  { name: 'Galle', lat: 6.0535, lng: 80.2210 },
  { name: 'Jaffna', lat: 9.6615, lng: 80.0255 },
  { name: 'Matara', lat: 5.9549, lng: 80.5550 },
  { name: 'Negombo', lat: 7.2008, lng: 79.8737 },
  { name: 'Anuradhapura', lat: 8.3114, lng: 80.4037 },
  { name: 'Trincomalee', lat: 8.5874, lng: 81.2152 },
  { name: 'Batticaloa', lat: 7.7310, lng: 81.6747 },
  { name: 'Kurunegala', lat: 7.4863, lng: 80.3647 },
  { name: 'Ratnapura', lat: 6.6828, lng: 80.3992 },
  { name: 'Badulla', lat: 6.9934, lng: 81.0550 },
  { name: 'Nuwara Eliya', lat: 6.9497, lng: 80.7891 },
  { name: 'Gampaha', lat: 7.0840, lng: 80.0098 },
  { name: 'Kalutara', lat: 6.5854, lng: 79.9607 },
  { name: 'Matale', lat: 7.4675, lng: 80.6234 },
  { name: 'Hambantota', lat: 6.1429, lng: 81.1212 },
  { name: 'Polonnaruwa', lat: 7.9403, lng: 81.0188 },
  { name: 'Kegalle', lat: 7.2513, lng: 80.3464 },
  { name: 'Ampara', lat: 7.2975, lng: 81.6820 },
  { name: 'Puttalam', lat: 8.0362, lng: 79.8283 },
  { name: 'Chilaw', lat: 7.5758, lng: 79.7953 },
  { name: 'Vavuniya', lat: 8.7514, lng: 80.4971 },
  { name: 'Dambulla', lat: 7.8675, lng: 80.6519 },
  { name: 'Monaragala', lat: 6.8728, lng: 81.3507 },
  { name: 'Kalmunai', lat: 7.4167, lng: 81.8167 },
];

// ══════════════════════════════════════════
// TOP-UP MODAL
// ══════════════════════════════════════════
var TOP_UP_PACKAGES = [100, 250, 500];

function TopUpModal({ visible, onClose, onTopUp, loading, language }) {
  var isSi = language === 'si';
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <LinearGradient
          colors={['rgba(13,7,32,0.99)', 'rgba(4,3,12,1)']}
          style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, borderTopWidth: 1, borderColor: 'rgba(180,122,255,0.3)' }}
        >
          <Text style={{ color: '#FFB800', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 6 }}>
            {isSi ? '💳 ශේෂය රිචාජ්' : '💳 Top Up Balance'}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
            {isSi ? 'PayHere ඔස්සේ ගෙවන්න (Visa/MasterCard)' : 'Pay securely via PayHere (Visa/MasterCard)'}
          </Text>

          {TOP_UP_PACKAGES.map(function(amt) {
            return (
              <TouchableOpacity
                key={amt}
                onPress={function() { onTopUp(amt); }}
                disabled={loading}
                activeOpacity={0.8}
                style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}
              >
                <LinearGradient
                  colors={amt === 15 ? ['#4C1D95', '#7C3AED'] : amt === 30 ? ['#1E3A5F', '#3B82F6'] : ['#065F46', '#10B981']}
                  style={{ paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
                    {isSi ? 'රු ' + amt + ' රිචාජ්' : 'Add LKR ' + amt}
                  </Text>
                  {loading ? (
                    <CosmicSpinner size={22} color="#FFF" />
                  ) : (
                    <Ionicons name="add-circle" size={22} color="rgba(255,255,255,0.8)" />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity onPress={onClose} style={{ paddingVertical: 14, alignItems: 'center', marginTop: 4 }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
              {isSi ? 'වසන්න' : 'Close'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );
}

// ══════════════════════════════════════════

// ══════════════════════════════════════════
// MAIN REPORT SCREEN
// ══════════════════════════════════════════
export default function ReportScreen() {
  var { t, language } = useLanguage();
  var { user } = useAuth();
  var isDesktop = useDesktopCtx();
  var [birthDate, setBirthDate] = useState('1998-10-09');
  var [birthTime, setBirthTime] = useState('09:16');
  var [birthLocation, setBirthLocation] = useState('Colombo');
  var [birthLat, setBirthLat] = useState(6.9271);
  var [birthLng, setBirthLng] = useState(79.8612);
  var [reportLang, setReportLang] = useState(language || 'en');
  var [userName, setUserName] = useState('');
  var [userGender, setUserGender] = useState(null);
  var [userReligion, setUserReligion] = useState(null);
  var [report, setReport] = useState(null);
  var [aiReport, setAiReport] = useState(null);
  var [chartData, setChartData] = useState(null);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState(null);
  // Flow states: 'form' -> 'confirm-charge' -> 'loading' -> 'report'
  var [screenState, setScreenState] = useState('form');
  // Token balance
  var [tokenBalance, setTokenBalance] = useState(null);
  var [showTopUp, setShowTopUp] = useState(false);
  var [topUpLoading, setTopUpLoading] = useState(false);

  // Fetch token balance when on form
  var fetchBalance = useCallback(async function() {
    try {
      var res = await api.getTokenBalance();
      if (res && res.balance !== undefined) {
        setTokenBalance(res.balance);
      }
    } catch (e) {
      // Not logged in or dev mode — ignore
    }
  }, []);

  useEffect(function() {
    if (screenState === 'form') fetchBalance();
  }, [screenState, fetchBalance]);

  // Sync report language when app language changes (only on form screen)
  useEffect(function() {
    if (screenState === 'form') {
      setReportLang(language || 'en');
    }
  }, [language, screenState]);

  // ── Core generation function (defined first to avoid stale closures) ──
  var startFullGeneration = async function(dateStr, gender) {
    try {
      setScreenState('loading');
      setLoading(true);

      // Fire raw report + AI in parallel (chart already fetched)
      var [rawRes, aiRes] = await Promise.all([
        api.getFullReport(dateStr, birthLat, birthLng, reportLang),
        api.getAIReport(dateStr, birthLat, birthLng, reportLang, birthLocation, userName || null, gender, userReligion || null),
      ]);

      if (!rawRes.data) {
        setError('No report data returned');
        setScreenState('form');
        setLoading(false);
        return;
      }

      setReport(rawRes.data);
      if (aiRes.data) {
        setAiReport(aiRes.data);
        // Update balance if server returned new balance
        if (aiRes.balance !== undefined) setTokenBalance(aiRes.balance);
      }
      setScreenState('report');
    } catch (err) {
      var msg = err.message || '';
      if (err.status === 402 || msg.includes('Insufficient') || msg.includes('balance')) {
        setTokenBalance(err.balance || 0);
        setShowTopUp(true);
        setScreenState('form');
      } else {
        setError(msg || 'Failed to generate report');
        setScreenState('form');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 1: User taps Generate → validate → show charge confirmation
  var handleGenerate = async function() {
    if (!userName || !userName.trim()) {
      setError(reportLang === 'si' ? 'කරුණාකර ඔයාගේ නම ඇතුලත් කරන්න' : 'Please enter your name');
      return;
    }
    if (!userGender) {
      setError(reportLang === 'si' ? 'කරුණාකර ස්ත්‍රී/පුරුෂ භාවය තෝරන්න' : 'Please select your gender');
      return;
    }
    try {
      setError(null);
      setReport(null);
      setAiReport(null);
      setChartData(null);
      var dateStr = birthDate + 'T' + birthTime + ':00';

      var chartRes = await api.getBirthChart(dateStr, birthLat, birthLng, reportLang);
      if (chartRes.data) {
        setChartData(chartRes.data);
        setScreenState('confirm-charge');
      } else {
        setError('Failed to read birth chart');
      }
    } catch (err) {
      setError(err.message || 'Failed to read birth chart');
    }
  };

  // Step 3: User confirms charge → fire full generation
  var handleChargeConfirm = function() {
    var dateStr = birthDate + 'T' + birthTime + ':00';
    startFullGeneration(dateStr, userGender);
  };

  // ── DOWNLOAD REPORT AS PDF ─────────────────────────────────
  var handleDownloadPDF = async function() {
    if (!aiReport || !aiReport.narrativeSections) return;
    try {
      var isSi = reportLang === 'si';
      var bd = (report && report.birthData) || {};

      var lagnaLabel = isSi ? (bd.lagna?.sinhala || bd.lagna?.english || '') : (bd.lagna?.english || bd.lagna?.name || '');
      var nakLabel = isSi ? (bd.nakshatra?.sinhala || bd.nakshatra?.name || '') : (bd.nakshatra?.name || '');

      var resolvedTitles = SECTION_KEYS.map(function(key) {
        var titleKey = SECTION_TITLES[key];
        var narrative = aiReport.narrativeSections[key];
        return isSi ? (t(titleKey) || (narrative && narrative.title) || key) : ((narrative && narrative.title) || t(titleKey) || key);
      });

      var html = generateReportHTML({
        lang: reportLang,
        userName: userName,
        birthLocation: birthLocation,
        birthDate: birthDate,
        birthTime: birthTime,
        lagnaLabel: lagnaLabel,
        nakshatraLabel: nakLabel,
        birthData: bd,
        aiReport: aiReport,
        sectionKeys: SECTION_KEYS,
        sectionTitles: resolvedTitles,
        t: t,
        logoBase64: null,
      });

      var fileName = 'NekathAI_Report_' + (userName || 'Report').replace(/\s+/g, '_') + '_' + birthDate + '.pdf';

      if (Platform.OS === 'web') {
        var printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.print();
        }
      } else {
        var result = await Print.printToFileAsync({ html: html, base64: false });
        await Sharing.shareAsync(result.uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: fileName });
      }
    } catch (err) {
      Alert.alert('❌', err.message || (isSi ? 'PDF සැකසීමට අසමත් විය' : 'Failed to generate PDF'));
    }
  };

  var handleNewReport = function() {
    setReport(null);
    setAiReport(null);
    setChartData(null);
    setError(null);
    setLoading(false);
    setUserGender(null);
    setUserReligion(null);
    setScreenState('form');
  };

  // ── TOP-UP MODAL ────────────────────────────────────────
  var handleTopUp = async function(amount) {
    try {
      setTopUpLoading(true);
      var res = await api.topUpTokens(amount);
      if (res && res.success) {
        setTokenBalance(res.newBalance);
        setShowTopUp(false);
        Alert.alert('✅', t('tokenTopUpSuccess') + ' LKR ' + amount + ' added. Balance: LKR ' + res.newBalance);
      } else {
        Alert.alert('❌', t('tokenTopUpFail'));
      }
    } catch (e) {
      Alert.alert('❌', e.message || t('tokenTopUpFail'));
    } finally {
      setTopUpLoading(false);
    }
  };

  // ── CONFIRM CHARGE SCREEN ─────────────────────────────────
  if (screenState === 'confirm-charge') {
    var bal = tokenBalance !== null ? tokenBalance : '—';
    var afterBal = tokenBalance !== null ? parseFloat((tokenBalance - 15).toFixed(2)) : '—';
    var hasEnough = tokenBalance !== null && tokenBalance >= 15;
    return (
      <CosmicBackground>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 }}>
          <Animated.View entering={FadeInDown.duration(500)} style={{ width: '100%', maxWidth: 380 }}>
            <LinearGradient
              colors={['rgba(180,122,255,0.18)', 'rgba(4,3,12,0.96)']}
              style={{ borderRadius: 24, padding: 28, borderWidth: 1, borderColor: 'rgba(180,122,255,0.3)' }}
            >
              <Text style={{ fontSize: 38, textAlign: 'center', marginBottom: 12 }}>📜</Text>
              <Text style={{ color: '#FFB800', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 6, letterSpacing: 1 }}>
                {reportLang === 'si' ? 'ජීවිත කතාව' : 'Full Life Report'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
                {reportLang === 'si' ? 'AI ලියන ලද, ඔබ ගැන පමණයි' : 'AI-written, personalised just for you'}
              </Text>

              {/* Cost row */}
              <View style={{ backgroundColor: 'rgba(255,184,0,0.08)', borderRadius: 14, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                  {reportLang === 'si' ? 'ගෙවීම' : 'Charge'}
                </Text>
                <Text style={{ color: '#FFB800', fontSize: 20, fontWeight: '800' }}>LKR 15</Text>
              </View>

              {/* Balance row */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 4 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                  {reportLang === 'si' ? 'වත්මන් ශේෂය' : 'Current balance'}
                </Text>
                <Text style={{ color: hasEnough ? '#4ADE80' : '#F87171', fontSize: 12, fontWeight: '700' }}>
                  LKR {bal}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 24 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                  {reportLang === 'si' ? 'ඉතිරි ශේෂය' : 'Balance after'}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' }}>
                  LKR {afterBal}
                </Text>
              </View>

              {hasEnough ? (
                <TouchableOpacity
                  onPress={handleChargeConfirm}
                  activeOpacity={0.85}
                  style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}
                >
                  <LinearGradient
                    colors={['#FFB800', '#F59E0B', '#9333EA']}
                    style={{ paddingVertical: 15, alignItems: 'center', borderRadius: 14 }}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 }}>
                      {reportLang === 'si' ? '✨ LKR 15 ගෙවා ලියන්න' : '✨ Confirm & Generate — LKR 15'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <>
                  <View style={{ backgroundColor: 'rgba(248,113,113,0.12)', borderRadius: 12, padding: 12, marginBottom: 14 }}>
                    <Text style={{ color: '#F87171', fontSize: 13, textAlign: 'center' }}>
                      {reportLang === 'si' ? '⚠️ ශේෂය මදිි. රිචාජ් කරන්න.' : '⚠️ Insufficient balance. Please top up.'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={function() { setShowTopUp(true); }}
                    activeOpacity={0.85}
                    style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}
                  >
                    <LinearGradient
                      colors={['#7C3AED', '#6366F1']}
                      style={{ paddingVertical: 15, alignItems: 'center', borderRadius: 14 }}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    >
                      <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>
                        {reportLang === 'si' ? '💳 ශේෂය රිචාජ් කරන්න' : '💳 Top Up Balance'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity onPress={handleNewReport} style={{ paddingVertical: 10, alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                  {reportLang === 'si' ? 'අවලංගු' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Top-up modal */}
        <TopUpModal
          visible={showTopUp}
          onClose={function() { setShowTopUp(false); }}
          onTopUp={handleTopUp}
          loading={topUpLoading}
          language={reportLang}
        />
      </CosmicBackground>
    );
  }

  // ── FULL SCREEN LOADING ──────────────────────────────────
  if (screenState === 'loading') {
    return (
      <CosmicBackground>
        <View style={s.loadingFull}>
          <CosmicLoader userName={userName} language={reportLang} />
        </View>
      </CosmicBackground>
    );
  }

  // ── REPORT VIEW (only after AI is done) ──────────────────
  if (screenState === 'report' && report) {
    return (
      <DesktopScreenWrapper routeName="report">
      <CosmicBackground>
        <ScrollView style={s.flex} contentContainerStyle={[s.content, isDesktop && s.contentDesktop]} showsVerticalScrollIndicator={false}>
          <View style={[s.contentInner, isDesktop && s.contentInnerDesktop]}>
          {/* Title */}
          <Animated.View entering={FadeInDown.delay(50).duration(600)}>
            <Text style={s.title}>{
              reportLang === 'si'
                ? (userName ? userName + 'ගේ ජීවිත කතාව ✨' : '✨ ඔයාගේ ජීවිත කතාව')
                : (userName ? userName + '\'s Life Story' : '✨ Your Life Story')
            }</Text>
            <Text style={s.subtitle}>{birthLocation} • {birthDate} • {birthTime}</Text>
          </Animated.View>

          {/* New Report Button + Download PDF */}
          <Animated.View entering={FadeIn.delay(100).duration(400)}>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <SpringPressable style={[s.newReportBtn, { flex: 1, marginBottom: 0 }]} onPress={handleNewReport} haptic="medium">
                <Ionicons name="refresh" size={16} color="#B47AFF" style={{ marginRight: 6 }} />
                <Text style={s.newReportText}>{reportLang === 'si' ? 'අලුත් කතාවක්' : 'New Report'}</Text>
              </SpringPressable>
              <SpringPressable style={[s.newReportBtn, { flex: 1, marginBottom: 0, borderColor: 'rgba(255,184,0,0.35)', backgroundColor: 'rgba(255,184,0,0.08)' }]} onPress={handleDownloadPDF} haptic="medium">
                <Ionicons name="download-outline" size={16} color="#FFB800" style={{ marginRight: 6 }} />
                <Text style={[s.newReportText, { color: '#FFB800' }]}>{reportLang === 'si' ? 'PDF බාගන්න' : 'Download PDF'}</Text>
              </SpringPressable>
            </View>
          </Animated.View>

          {/* Birth Summary Header */}
          {report.birthData && (
            <Animated.View entering={FadeInDown.delay(150).duration(600)}>
              <AuraBox style={{ borderColor: 'rgba(255,184,0,0.2)' }}>
                <LinearGradient
                  colors={['rgba(255,184,0,0.08)', 'transparent']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                />
                <View style={s.birthHeader}>
                  <View style={s.birthIconBg}>
                    <Text style={{ fontSize: 28 }}>🪐</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.birthLagna}>{userName || '✨'}</Text>
                    <Text style={s.birthSinhala}>{
                      reportLang === 'si'
                        ? (report.birthData.lagna?.sinhala ? report.birthData.lagna.sinhala + ' බලය යටතේ උපන්නා' : '')
                        : (report.birthData.lagna?.english ? 'Born under the power of ' + report.birthData.lagna.english : '')
                    }</Text>
                    <Text style={s.birthSub}>
                      {reportLang === 'si' ? 'උපන් ස්ථානය: ' : 'Born: '}{birthLocation} • {birthDate} • {birthTime}
                    </Text>
                    {report.birthData.currentAge != null && (
                      <Text style={s.birthSub}>
                        {reportLang === 'si' ? '🎂 වයස: ' + report.birthData.currentAge + ' වසර' : '🎂 Age: ' + report.birthData.currentAge + ' years'}
                        {report.birthData.birthDayOfWeek ? (reportLang === 'si' ? ' • ' + report.birthData.birthDayOfWeek + ' දිනයේ උපන්නා' : ' • Born on a ' + report.birthData.birthDayOfWeek) : ''}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={s.panchangaRow}>
                  <View style={s.panchangaItem}>
                    <Text style={s.panchangaLabel}>{reportLang === 'si' ? '🌙 චන්ද්‍ර ශක්තිය' : '🌙 Moon Energy'}</Text>
                    <Text style={s.panchangaValue}>{reportLang === 'si' ? (report.birthData.moonSign?.sinhala || report.birthData.moonSign?.english || '') : (report.birthData.moonSign?.english || '')}</Text>
                  </View>
                  <View style={s.panchangaItem}>
                    <Text style={s.panchangaLabel}>{reportLang === 'si' ? '☀️ සූර්ය ශක්තිය' : '☀️ Sun Energy'}</Text>
                    <Text style={s.panchangaValue}>{reportLang === 'si' ? (report.birthData.sunSign?.sinhala || report.birthData.sunSign?.english || '') : (report.birthData.sunSign?.english || '')}</Text>
                  </View>
                  <View style={s.panchangaItem}>
                    <Text style={s.panchangaLabel}>{reportLang === 'si' ? '⭐ උපන් තරුව' : '⭐ Birth Star'}</Text>
                    <Text style={s.panchangaValue}>{reportLang === 'si' ? (report.birthData.nakshatra?.sinhala || report.birthData.nakshatra?.name || '') : (report.birthData.nakshatra?.name || '')}</Text>
                  </View>
                </View>
                {/* Second row — personal qualities */}
                <View style={[s.panchangaRow, { marginTop: 4 }]}>
                  {report.birthData.gana && (
                    <View style={s.panchangaItem}>
                      <Text style={s.panchangaLabel}>{reportLang === 'si' ? '🔥 ගුණාංගය' : '🔥 Temperament'}</Text>
                      <Text style={s.panchangaValue}>{report.birthData.gana.type}</Text>
                    </View>
                  )}
                  {report.birthData.nadi && (
                    <View style={s.panchangaItem}>
                      <Text style={s.panchangaLabel}>{reportLang === 'si' ? '💨 ශක්ති ප්‍රවාහය' : '💨 Energy Type'}</Text>
                      <Text style={s.panchangaValue}>{report.birthData.nadi.type}</Text>
                    </View>
                  )}
                  {report.birthData.panchanga?.panchangaQuality && (
                    <View style={s.panchangaItem}>
                      <Text style={s.panchangaLabel}>{reportLang === 'si' ? '✨ උපන් ගුණය' : '✨ Birth Quality'}</Text>
                      <Text style={[s.panchangaValue, { color: report.birthData.panchanga.panchangaQuality.score >= 2 ? '#4ADE80' : report.birthData.panchanga.panchangaQuality.score >= 0 ? '#FBBF24' : '#F87171' }]}>
                        {report.birthData.panchanga.panchangaQuality.quality} ({report.birthData.panchanga.panchangaQuality.score}/5)
                      </Text>
                    </View>
                  )}
                </View>
              </AuraBox>
            </Animated.View>
          )}

          {/* Birth Chart (Sri Lankan Kendara) */}
          {chartData && chartData.rashiChart && (
            <Animated.View entering={FadeInDown.delay(250).duration(700)}>
              <AuraBox style={{ borderColor: 'rgba(180,122,255,0.2)' }}>
                <View style={s.chartHeader}>
                  <Text style={s.chartTitle}>{reportLang === 'si' ? '🏛️ ඔයාගේ උපන් සිතියම' : '🏛️ Your Birth Map'}</Text>
                  <Text style={s.chartSub}>{reportLang === 'si' ? 'ඔයා ඉපදුන මොහොතේ අහස පෙනුන හැටි' : 'How the sky looked the moment you were born'}</Text>
                </View>
                <SriLankanChart
                  rashiChart={chartData.rashiChart}
                  lagnaRashiId={chartData.lagna?.rashiId || chartData.rashiChart?.[0]?.rashiId || 1}
                  language={language}
                />
              </AuraBox>
            </Animated.View>
          )}

          {/* AI Narrative Sections — No technical data shown */}
          {aiReport && aiReport.narrativeSections && (
            SECTION_KEYS.map(function(key, index) {
              var aiNarrative = aiReport.narrativeSections[key] || null;
              if (!aiNarrative || !aiNarrative.narrative) return null;
              return <SectionCard key={key} sectionKey={key} data={null} index={index} t={t} aiNarrative={aiNarrative} reportLang={reportLang} />;
            })
          )}

          {/* Bottom spacer */}
          <View style={{ height: isDesktop ? 32 : 120 }} />
          </View>
        </ScrollView>
      </CosmicBackground>
      </DesktopScreenWrapper>
    );
  }

  // ── INPUT FORM (default view) ────────────────────────────
  return (
    <DesktopScreenWrapper routeName="report">
    <CosmicBackground>
      <ScrollView style={s.flex} contentContainerStyle={[s.content, isDesktop && s.contentDesktop]} showsVerticalScrollIndicator={false}>
        <View style={[s.contentInner, isDesktop && s.contentInnerDesktop]}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(800)}>
          <Text style={s.title}>{t('reportTitle')}</Text>
          <Text style={s.subtitle}>{t('reportSubtitle')}</Text>
        </Animated.View>

        {/* Input Form */}
        <Animated.View entering={FadeInDown.delay(200).duration(800)}>
          <AuraBox>
            <Text style={s.inputLabel}>{t('reportEnterBirth')}</Text>

            {/* Name Input */}
            <Text style={s.inputHint}>{reportLang === 'si' ? 'ඔයාගේ නම *' : 'YOUR NAME *'}</Text>
            <TextInput
              style={[s.input, { marginBottom: 16 }, error && (!userName || !userName.trim()) ? s.inputError : {}]}
              value={userName}
              onChangeText={function(val) { setUserName(val); if (error && val.trim()) { setError(null); } }}
              placeholder={reportLang === 'si' ? 'ඔයාගේ නම ඇතුලත් කරන්න' : 'Enter your name'}
              placeholderTextColor="#475569"
              autoCorrect={false}
              returnKeyType="next"
            />

            {/* Gender Selector */}
            <Text style={s.inputHint}>{reportLang === 'si' ? 'ස්ත්‍රී / පුරුෂ භාවය *' : 'GENDER *'}</Text>
            <View style={s.genderRow}>
              <TouchableOpacity
                style={[s.genderBtn, userGender === 'male' && s.genderBtnMaleActive]}
                onPress={function() { setUserGender('male'); if (error) setError(null); }}
                activeOpacity={0.8}
              >
                <Text style={s.genderIcon}>♂️</Text>
                <Text style={[s.genderText, userGender === 'male' && s.genderTextActive]}>
                  {reportLang === 'si' ? 'පුරුෂ' : 'Male'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.genderBtn, userGender === 'female' && s.genderBtnFemaleActive]}
                onPress={function() { setUserGender('female'); if (error) setError(null); }}
                activeOpacity={0.8}
              >
                <Text style={s.genderIcon}>♀️</Text>
                <Text style={[s.genderText, userGender === 'female' && s.genderTextActive]}>
                  {reportLang === 'si' ? 'ස්ත්‍රී' : 'Female'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Religion Selector (Optional) */}
            <Text style={s.inputHint}>{reportLang === 'si' ? 'ආගම (අත්‍යවශ්‍ය නොවේ)' : 'RELIGION (OPTIONAL)'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 16, marginTop: 6 }}>
              {[
                { key: 'buddhist', label: reportLang === 'si' ? 'බෞද්ධ' : 'Buddhist', icon: '☸️' },
                { key: 'hindu', label: reportLang === 'si' ? 'හින්දු' : 'Hindu', icon: '🕉️' },
                { key: 'muslim', label: reportLang === 'si' ? 'ඉස්ලාම්' : 'Muslim', icon: '☪️' },
                { key: 'christian', label: reportLang === 'si' ? 'ක්‍රිස්තියානි' : 'Christian', icon: '✝️' },
                { key: 'catholic', label: reportLang === 'si' ? 'කතෝලික' : 'Catholic', icon: '⛪' },
              ].map(function(r) {
                var isActive = userReligion === r.key;
                return (
                  <TouchableOpacity
                    key={r.key}
                    style={[s.locationChip, isActive && s.locationChipActive]}
                    onPress={function() { setUserReligion(isActive ? null : r.key); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.locationChipText, isActive && s.locationChipTextActive]}>
                      {r.icon + ' ' + r.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={s.inputRow}>
              <View style={s.inputGroup}>
                <Text style={s.inputHint}>{reportLang === 'si' ? 'උපන් දිනය' : 'BIRTH DATE'}</Text>
                <DatePickerField value={birthDate} onChange={setBirthDate} lang={reportLang} />
              </View>
              <View style={[s.inputGroup, { flex: 0.6 }]}>
                <Text style={s.inputHint}>{reportLang === 'si' ? 'වේලාව' : 'TIME'}</Text>
                <TimePickerField value={birthTime} onChange={setBirthTime} lang={reportLang} />
              </View>
            </View>

            {/* Birth Location */}
            <Text style={s.inputHint}>{reportLang === 'si' ? 'උපන් ස්ථානය' : 'BIRTH LOCATION'}</Text>
            <View style={s.locationRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.locationScroll}>
                {BIRTH_LOCATIONS.map(function(loc) {
                  var isActive = birthLocation === loc.name;
                  return (
                    <TouchableOpacity
                      key={loc.name}
                      style={[s.locationChip, isActive && s.locationChipActive]}
                      onPress={function() { setBirthLocation(loc.name); setBirthLat(loc.lat); setBirthLng(loc.lng); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.locationChipText, isActive && s.locationChipTextActive]}>{loc.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Language Selector */}
            <Text style={s.inputHint}>{reportLang === 'si' ? 'භාෂාව' : 'REPORT LANGUAGE'}</Text>
            <View style={s.langRow}>
              <TouchableOpacity
                style={[s.langBtn, reportLang === 'en' && s.langBtnActive]}
                onPress={function() { setReportLang('en'); }}
                activeOpacity={0.8}
              >
                <Text style={s.langFlag}>🇬🇧</Text>
                <Text style={[s.langText, reportLang === 'en' && s.langTextActive]}>English</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.langBtn, reportLang === 'si' && s.langBtnActive]}
                onPress={function() { setReportLang('si'); }}
                activeOpacity={0.8}
              >
                <Text style={s.langFlag}>🇱🇰</Text>
                <Text style={[s.langText, reportLang === 'si' && s.langTextActive]}>සිංහල</Text>
              </TouchableOpacity>
            </View>

            <SpringPressable style={s.generateBtn} onPress={handleGenerate} haptic="heavy" scalePressed={0.93}>
              <LinearGradient
                colors={['#9333EA', '#6D28D9']}
                style={s.generateGrad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Ionicons name="sparkles" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={s.generateText}>{t('reportGenerate')}</Text>
              </LinearGradient>
            </SpringPressable>

            {/* Token balance row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingHorizontal: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="wallet-outline" size={13} color="rgba(251,191,36,0.7)" />
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
                  {reportLang === 'si' ? 'ශේෂය' : 'Balance'}{': '}
                  <Text style={{ color: tokenBalance !== null && tokenBalance >= 15 ? '#4ADE80' : '#F87171', fontWeight: '700' }}>
                    {tokenBalance !== null ? 'LKR ' + tokenBalance : '—'}
                  </Text>
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="pricetag-outline" size={12} color="rgba(251,191,36,0.6)" />
                <Text style={{ color: '#FFB800', fontSize: 12, fontWeight: '700' }}>LKR 15</Text>
                <TouchableOpacity onPress={function() { setShowTopUp(true); }} style={{ marginLeft: 8, backgroundColor: 'rgba(180,122,255,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                  <Text style={{ color: '#B47AFF', fontSize: 11, fontWeight: '700' }}>
                    {reportLang === 'si' ? 'රිචාජ්' : 'Top Up'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </AuraBox>
        </Animated.View>

        {/* Top-up modal */}
        <TopUpModal
          visible={showTopUp}
          onClose={function() { setShowTopUp(false); }}
          onTopUp={handleTopUp}
          loading={topUpLoading}
          language={reportLang}
        />

        {/* Error */}
        {error && (
          <Animated.View entering={FadeIn.duration(400)}>
            <AuraBox style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="alert-circle" size={24} color="#EF4444" style={{ marginRight: 10 }} />
                <Text style={s.errorText}>{error}</Text>
              </View>
              <TouchableOpacity style={[s.newReportBtn, { marginTop: 12 }]} onPress={function() { setError(null); }} activeOpacity={0.8}>
                <Text style={s.newReportText}>{reportLang === 'si' ? 'ආයි බලන්න' : 'Try Again'}</Text>
              </TouchableOpacity>
            </AuraBox>
          </Animated.View>
        )}

        <View style={{ height: isDesktop ? 32 : 120 }} />
        </View>
      </ScrollView>
    </CosmicBackground>
    </DesktopScreenWrapper>
  );
}

// ══════════════════════════════════════════
var s = StyleSheet.create({
  flex: { flex: 1 },
  loadingFull: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingTop: Platform.OS === 'ios' ? 110 : 90, paddingHorizontal: 16, paddingBottom: 40 },
  contentDesktop: { paddingTop: 24, paddingHorizontal: 0, paddingBottom: 40 },
  contentInner: { width: '100%' },
  contentInnerDesktop: { maxWidth: 900, alignSelf: 'center', paddingHorizontal: 32 },
  title: { fontSize: 26, fontWeight: '900', color: '#F1F5F9', textAlign: 'center', letterSpacing: 0.5 },
  subtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 6, marginBottom: 20 },
  inputLabel: { color: '#CBD5E1', fontSize: 14, fontWeight: '700', marginBottom: 12 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  inputGroup: { flex: 1 },
  inputHint: { color: '#64748B', fontSize: 10, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    backgroundColor: 'rgba(24,30,72,0.65)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: '#F1F5F9', fontSize: 15, fontWeight: '600', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  inputError: { borderColor: 'rgba(239,68,68,0.5)' },
  generateBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  generateGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  generateText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  errorText: { color: '#F87171', fontSize: 13, flex: 1 },
  aiProgressText: { color: '#B47AFF', fontSize: 14, fontWeight: '700' },
  aiProgressSub: { color: '#64748B', fontSize: 11, marginTop: 4 },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 16, marginTop: 6 },
  genderBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(24,30,72,0.4)' },
  genderBtnMaleActive: { borderColor: 'rgba(96,165,250,0.6)', backgroundColor: 'rgba(96,165,250,0.12)' },
  genderBtnFemaleActive: { borderColor: 'rgba(244,114,182,0.6)', backgroundColor: 'rgba(244,114,182,0.12)' },
  genderIcon: { fontSize: 22 },
  genderText: { color: '#64748B', fontSize: 15, fontWeight: '700' },
  genderTextActive: { color: '#FFF' },
  langRow: { flexDirection: 'row', gap: 10, marginBottom: 16, marginTop: 6 },
  langBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(24,30,72,0.4)' },
  langBtnActive: { borderColor: 'rgba(180,122,255,0.6)', backgroundColor: 'rgba(180,122,255,0.15)' },
  langFlag: { fontSize: 20 },
  langText: { color: '#64748B', fontSize: 14, fontWeight: '700' },
  langTextActive: { color: '#B47AFF' },
  locationRow: { marginBottom: 16, marginTop: 4 },
  locationScroll: { flexGrow: 0 },
  locationChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(24,30,72,0.4)', marginRight: 8 },
  locationChipActive: { borderColor: 'rgba(180,122,255,0.6)', backgroundColor: 'rgba(180,122,255,0.15)' },
  locationChipText: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  locationChipTextActive: { color: '#B47AFF' },
  newReportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginBottom: 12, backgroundColor: 'rgba(180,122,255,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(180,122,255,0.25)' },
  newReportText: { color: '#B47AFF', fontSize: 13, fontWeight: '700' },
  birthHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  birthIconBg: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,184,0,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  birthLagna: { color: '#FFB800', fontSize: 20, fontWeight: '900' },
  birthSinhala: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  birthSub: { color: '#64748B', fontSize: 11, marginTop: 2 },
  panchangaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  panchangaItem: { alignItems: 'center', flex: 1 },
  panchangaLabel: { color: '#475569', fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  panchangaValue: { color: '#CBD5E1', fontSize: 12, fontWeight: '700', marginTop: 2 },
  chartHeader: { alignItems: 'center', marginBottom: 12 },
  chartTitle: { color: '#F1F5F9', fontSize: 16, fontWeight: '800' },
  chartSub: { color: '#64748B', fontSize: 11, marginTop: 4 },
});
