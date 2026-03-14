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
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import CosmicBackground from '../../components/CosmicBackground';
import MarkdownText from '../../components/MarkdownText';
import SriLankanChart from '../../components/SriLankanChart';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

// ──────────────────────────────────────────
// Section icons & gradient colors
// ──────────────────────────────────────────
var SECTION_META = {
  personality:      { colors: ['#3B82F6', '#1E3A8A'], emoji: '🪞', gradient: ['#818CF8', '#3B82F6'] },
  yogaAnalysis:     { colors: ['#9333EA', '#581C87'], emoji: '⚡', gradient: ['#C084FC', '#9333EA'] },
  lifePredictions:  { colors: ['#8B5CF6', '#4C1D95'], emoji: '🔮', gradient: ['#A78BFA', '#8B5CF6'] },
  career:           { colors: ['#F59E0B', '#92400E'], emoji: '💼', gradient: ['#FBBF24', '#F59E0B'] },
  marriage:         { colors: ['#EC4899', '#831843'], emoji: '💍', gradient: ['#F9A8D4', '#EC4899'] },
  marriedLife:      { colors: ['#E11D48', '#881337'], emoji: '🏠', gradient: ['#FDA4AF', '#E11D48'] },
  financial:        { colors: ['#22C55E', '#14532D'], emoji: '💰', gradient: ['#4ADE80', '#22C55E'] },
  children:         { colors: ['#10B981', '#064E3B'], emoji: '👨‍👩‍👧', gradient: ['#34D399', '#10B981'] },
  health:           { colors: ['#EF4444', '#7F1D1D'], emoji: '🏥', gradient: ['#FCA5A5', '#EF4444'] },
  mentalHealth:     { colors: ['#06B6D4', '#0E7490'], emoji: '🧠', gradient: ['#67E8F9', '#06B6D4'] },
  foreignTravel:    { colors: ['#6366F1', '#312E81'], emoji: '✈️', gradient: ['#A5B4FC', '#6366F1'] },
  education:        { colors: ['#7C3AED', '#4C1D95'], emoji: '🎓', gradient: ['#A78BFA', '#7C3AED'] },
  luck:             { colors: ['#FBBF24', '#78350F'], emoji: '🎰', gradient: ['#FDE68A', '#FBBF24'] },
  legal:            { colors: ['#64748B', '#1E293B'], emoji: '⚖️', gradient: ['#94A3B8', '#64748B'] },
  spiritual:        { colors: ['#A855F7', '#581C87'], emoji: '🙏', gradient: ['#D8B4FE', '#A855F7'] },
  realEstate:       { colors: ['#84CC16', '#365314'], emoji: '🏠', gradient: ['#BEF264', '#84CC16'] },
  transits:         { colors: ['#14B8A6', '#134E4A'], emoji: '🌍', gradient: ['#5EEAD4', '#14B8A6'] },
  surpriseInsights: { colors: ['#F97316', '#9A3412'], emoji: '🤯', gradient: ['#FDBA74', '#F97316'] },
  timeline25:       { colors: ['#6366F1', '#312E81'], emoji: '📅', gradient: ['#A5B4FC', '#6366F1'] },
  remedies:         { colors: ['#FBBF24', '#78350F'], emoji: '💎', gradient: ['#FDE68A', '#FBBF24'] },
};


var SECTION_KEYS = [
  'personality', 'yogaAnalysis', 'lifePredictions', 'career', 'marriage', 'marriedLife', 'financial',
  'children', 'health', 'mentalHealth', 'foreignTravel', 'education', 'luck', 'legal',
  'spiritual', 'realEstate', 'transits', 'surpriseInsights', 'timeline25', 'remedies',
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
        colors={['rgba(30, 20, 60, 0.5)', 'rgba(15, 10, 35, 0.6)']}
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
    borderColor: 'rgba(251, 191, 36, 0.12)', padding: 16, marginBottom: 12,
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
      <TouchableOpacity activeOpacity={0.85} onPress={function() { setExpanded(!expanded); }}>
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
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={expanded ? '#C084FC' : 'rgba(255,255,255,0.4)'} />
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
      </TouchableOpacity>
    </Animated.View>
  );
}

var sc = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  iconBg: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  emoji: { fontSize: 22 },
  title: { color: '#F1F5F9', fontSize: 15, fontWeight: '700', lineHeight: 21 },
  chevronBg: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  chevronBgActive: { backgroundColor: 'rgba(147,51,234,0.15)' },
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
            colors={['#FBBF24', '#F59E0B', '#D97706']}
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
            colors={['#9333EA', '#FBBF24']}
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
  glowCircle: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(251,191,36,0.15)' },
  centerOrb: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', zIndex: 10 },
  centerGrad: { flex: 1, borderRadius: 20 },
  orbitRing: { position: 'absolute', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(147,51,234,0.15)', borderStyle: 'dashed' },
  planet: { position: 'absolute', zIndex: 5 },
  planet1: {},
  planet2: {},
  planet3: {},
  textWrap: { alignItems: 'center', marginBottom: 20 },
  stageText: { color: '#F1F5F9', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  stageSub: { color: '#94A3B8', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  personalText: { color: '#C084FC', fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 24, fontStyle: 'italic' },
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
var TOP_UP_PACKAGES = [15, 30, 50];

function TopUpModal({ visible, onClose, onTopUp, loading, language }) {
  var isSi = language === 'si';
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <LinearGradient
          colors={['rgba(13,7,32,0.99)', 'rgba(4,3,12,1)']}
          style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, borderTopWidth: 1, borderColor: 'rgba(147,51,234,0.3)' }}
        >
          <Text style={{ color: '#FBBF24', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 6 }}>
            {isSi ? '💳 ශේෂය රිචාජ්' : '💳 Top Up Balance'}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
            {isSi ? 'ඔබේ දුරකතන ක්‍රෙඩිට් එකෙන් ගෙවේ' : 'Charged to your mobile credit via Ideamart'}
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
                    <ActivityIndicator color="#FFF" size="small" />
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
// GENDER GUESS SCREEN (Magic!)
// ══════════════════════════════════════════
function GenderGuessScreen({ prediction, userName, onConfirm, language }) {
  var [revealed, setRevealed] = useState(false);
  var [gotItRight, setGotItRight] = useState(null);
  var predicted = prediction?.predicted || 'male';
  var confidence = prediction?.confidence || 50;
  var isMale = predicted === 'male';
  var isSi = language === 'si';

  var revealScale = useSharedValue(0.5);
  var revealOpacity = useSharedValue(0);

  useEffect(function() {
    // Dramatic reveal after 1.5s
    var timer = setTimeout(function() {
      setRevealed(true);
      revealScale.value = withSequence(
        withTiming(1.3, { duration: 400 }),
        withTiming(1, { duration: 300 })
      );
      revealOpacity.value = withTiming(1, { duration: 600 });
    }, 1500);
    return function() { clearTimeout(timer); };
  }, []);

  var revealStyle = useAnimatedStyle(function() {
    return {
      transform: [{ scale: revealScale.value }],
      opacity: revealOpacity.value,
    };
  });

  var handleYes = function() {
    setGotItRight(true);
    setTimeout(function() { onConfirm(predicted); }, 2000);
  };

  var handleNo = function() {
    setGotItRight(false);
    var actual = predicted === 'male' ? 'female' : 'male';
    setTimeout(function() { onConfirm(actual); }, 1500);
  };

  // Localized text
  var introText = isSi ? '🔮 තරු කියනවා...' : '🔮 The stars whisper...';
  var introSubText = isSi
    ? (userName ? 'ඔයාගේ කේන්දරේ කියවමින්, ' + userName + '...' : 'ඔයාගේ කේන්දරේ කියවමින්...')
    : (userName ? 'Let me read your birth chart, ' + userName + '...' : 'Let me read your birth chart...');
  var genderLabel = isSi
    ? (isMale ? 'ඔයා පිරිමි කෙනෙක්' : 'ඔයා ගැහැණු කෙනෙක්')
    : (isMale ? 'You are MALE' : 'You are FEMALE');
  var confidenceLabel = isSi ? 'විශ්වාසය: ' + confidence + '%' : 'Cosmic confidence: ' + confidence + '%';
  var questionLabel = isSi ? 'මම හරිද? 🤔' : 'Am I right? 🤔';
  var yesBtnText = isSi ? 'ඔව්! 🎯' : 'Yes! 🎯';
  var noBtnText = isSi ? 'නෑ 😄' : 'Nope 😄';

  return (
    <CosmicBackground>
      <View style={gg.container}>
        {/* Intro text */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)}>
          <Text style={gg.intro}>{introText}</Text>
          <Text style={gg.introSub}>{introSubText}</Text>
        </Animated.View>

        {/* Big reveal */}
        {revealed && (
          <Animated.View style={[gg.revealWrap, revealStyle]}>
            <LinearGradient
              colors={isMale ? ['rgba(59,130,246,0.2)', 'rgba(59,130,246,0.05)'] : ['rgba(236,72,153,0.2)', 'rgba(236,72,153,0.05)']}
              style={gg.revealGrad}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Text style={gg.genderEmoji}>{isMale ? '♂️' : '♀️'}</Text>
              <Text style={[gg.genderText, { color: isMale ? '#60A5FA' : '#F472B6' }]}>
                {genderLabel}
              </Text>
              <Text style={gg.confidenceText}>{confidenceLabel}</Text>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Question */}
        {revealed && gotItRight === null && (
          <Animated.View entering={FadeInDown.delay(400).duration(600)} style={gg.questionWrap}>
            <Text style={gg.questionText}>{questionLabel}</Text>
            <View style={gg.buttonRow}>
              <TouchableOpacity style={[gg.guessBtn, gg.yesBtn]} onPress={handleYes} activeOpacity={0.8}>
                <Text style={gg.guessBtnText}>{yesBtnText}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[gg.guessBtn, gg.noBtn]} onPress={handleNo} activeOpacity={0.8}>
                <Text style={gg.guessBtnText}>{noBtnText}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Reaction — Yes! */}
        {gotItRight === true && (
          <Animated.View entering={FadeInDown.duration(500)} style={gg.reactionWrap}>
            <Text style={gg.reactionEmoji}>🎯✨🪄</Text>
            <Text style={gg.reactionText}>
              {isSi
                ? (userName ? userName + ', තරු කවදාවත් බොරු කියන්නේ නෑ!' : 'තරු කවදාවත් බොරු කියන්නේ නෑ!')
                : (userName ? userName + ', the stars never lie!' : 'The stars never lie!')}
            </Text>
            <Text style={gg.reactionSub}>
              {isSi
                ? 'ඔයාගේ කේන්දරේ ' + (isMale ? 'පුරුෂ' : 'ස්ත්‍රී') + ' ශක්තිය විහිදුවනවා. තව දේවල් බලමු...'
                : 'Your birth chart radiates ' + (isMale ? 'masculine' : 'feminine') + ' energy. Let me reveal more...'}
            </Text>
          </Animated.View>
        )}

        {/* Reaction — Nope */}
        {gotItRight === false && (
          <Animated.View entering={FadeInDown.duration(500)} style={gg.reactionWrap}>
            <Text style={gg.reactionEmoji}>😄🌟</Text>
            <Text style={gg.reactionText}>
              {isSi
                ? 'හා! ඔයාගේ කේන්දරේ ' + (isMale ? 'පුරුෂ' : 'ස්ත්‍රී') + ' ශක්තිය තියෙනවා, ඒත් ආත්මය දන්නවා!'
                : 'Ha! Your chart has strong ' + (isMale ? 'masculine' : 'feminine') + ' energy, but the soul knows best!'}
            </Text>
            <Text style={gg.reactionSub}>
              {isSi
                ? 'හරි! ඔයාගේ සැබෑ ස්වභාවයට ගැලපෙන විදියට රිපෝට් එක ලියනවා ✨'
                : 'Noted! Let me write your report with the real you in mind ✨'}
            </Text>
          </Animated.View>
        )}
      </View>
    </CosmicBackground>
  );
}

var gg = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  intro: { color: '#FBBF24', fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  introSub: { color: '#94A3B8', fontSize: 15, textAlign: 'center', marginBottom: 40, fontStyle: 'italic' },
  revealWrap: { marginBottom: 32 },
  revealGrad: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 48, borderRadius: 24, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)' },
  genderEmoji: { fontSize: 60, marginBottom: 12 },
  genderText: { fontSize: 28, fontWeight: '900', marginBottom: 8 },
  confidenceText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  questionWrap: { alignItems: 'center' },
  questionText: { color: '#F1F5F9', fontSize: 20, fontWeight: '800', marginBottom: 20 },
  buttonRow: { flexDirection: 'row', gap: 16 },
  guessBtn: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 16, borderWidth: 1.5 },
  yesBtn: { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.4)' },
  noBtn: { backgroundColor: 'rgba(147,51,234,0.15)', borderColor: 'rgba(147,51,234,0.4)' },
  guessBtnText: { color: '#F1F5F9', fontSize: 16, fontWeight: '800' },
  reactionWrap: { alignItems: 'center', marginTop: 8 },
  reactionEmoji: { fontSize: 40, marginBottom: 12 },
  reactionText: { color: '#FBBF24', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  reactionSub: { color: '#94A3B8', fontSize: 14, textAlign: 'center', lineHeight: 22, fontStyle: 'italic' },
});

// ══════════════════════════════════════════
// MAIN REPORT SCREEN
// ══════════════════════════════════════════
export default function ReportScreen() {
  var { t, language } = useLanguage();
  var { user } = useAuth();
  var [birthDate, setBirthDate] = useState('1998-10-09');
  var [birthTime, setBirthTime] = useState('09:16');
  var [birthLocation, setBirthLocation] = useState('Colombo');
  var [birthLat, setBirthLat] = useState(6.9271);
  var [birthLng, setBirthLng] = useState(79.8612);
  var [reportLang, setReportLang] = useState(language || 'en');
  var [userName, setUserName] = useState('');
  var [userGender, setUserGender] = useState(null);
  var [report, setReport] = useState(null);
  var [aiReport, setAiReport] = useState(null);
  var [chartData, setChartData] = useState(null);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState(null);
  // Flow states: 'form' -> 'gender-guess' -> 'confirm-charge' -> 'loading' -> 'report'
  var [screenState, setScreenState] = useState('form');
  var [genderPrediction, setGenderPrediction] = useState(null);
  // Token balance
  var [tokenBalance, setTokenBalance] = useState(null);
  var [showTopUp, setShowTopUp] = useState(false);
  var [topUpLoading, setTopUpLoading] = useState(false);
  // Saved reports
  var [savedReports, setSavedReports] = useState([]);
  var [savedReportsLoading, setSavedReportsLoading] = useState(false);
  var [loadingReportId, setLoadingReportId] = useState(null);

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
        api.getAIReport(dateStr, birthLat, birthLng, reportLang, birthLocation, userName || null, gender),
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

  // Step 1: User taps Generate → quick chart API call → show gender guess
  var handleGenerate = async function() {
    // Name is mandatory
    if (!userName || !userName.trim()) {
      setError(reportLang === 'si' ? 'කරුණාකර ඔයාගේ නම ඇතුලත් කරන්න' : 'Please enter your name');
      return;
    }
    try {
      setError(null);
      setReport(null);
      setAiReport(null);
      setChartData(null);
      setUserGender(null);
      var dateStr = birthDate + 'T' + birthTime + ':00';

      // Quick call to get birth chart + gender prediction
      var chartRes = await api.getBirthChart(dateStr, birthLat, birthLng, reportLang);
      if (chartRes.data) {
        setChartData(chartRes.data);
        if (chartRes.data.genderPrediction) {
          setGenderPrediction(chartRes.data.genderPrediction);
          setScreenState('gender-guess');
        } else {
          // No prediction available, skip to confirm charge
          setScreenState('confirm-charge');
        }
      } else {
        setError('Failed to read birth chart');
      }
    } catch (err) {
      setError(err.message || 'Failed to read birth chart');
    }
  };

  // Step 2: Gender confirmed → show charge confirmation
  var handleGenderConfirm = function(confirmedGender) {
    setUserGender(confirmedGender);
    setScreenState('confirm-charge');
  };

  // Step 3: User confirms charge → fire full generation
  var handleChargeConfirm = function() {
    var dateStr = birthDate + 'T' + birthTime + ':00';
    startFullGeneration(dateStr, userGender);
  };

  var handleNewReport = function() {
    setReport(null);
    setAiReport(null);
    setChartData(null);
    setError(null);
    setLoading(false);
    setUserGender(null);
    setGenderPrediction(null);
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

  // ── SAVED REPORTS ──────────────────────────────────────
  var fetchSavedReports = useCallback(async function() {
    try {
      setSavedReportsLoading(true);
      var res = await api.getMyHoroscopeReports();
      if (res.data && res.data.reports) {
        setSavedReports(res.data.reports);
      }
    } catch (err) {
      // Silently fail — user may not be logged in
      console.log('Could not fetch saved reports:', err.message);
    } finally {
      setSavedReportsLoading(false);
    }
  }, []);

  useEffect(function() {
    if (screenState === 'form') {
      fetchSavedReports();
    }
  }, [screenState, fetchSavedReports]);

  var handleLoadSavedReport = async function(reportItem) {
    try {
      setLoadingReportId(reportItem.id);
      var res = await api.getSavedReport(reportItem.id);
      if (res.data) {
        var saved = res.data;
        // Restore birth date & time from saved report
        if (saved.birthDate) {
          var parts = saved.birthDate.split('T');
          if (parts[0]) setBirthDate(parts[0]);
          if (parts[1]) setBirthTime(parts[1].substring(0, 5));
        }
        if (saved.birthLocation) setBirthLocation(saved.birthLocation);
        if (saved.lat) setBirthLat(saved.lat);
        if (saved.lng) setBirthLng(saved.lng);
        if (saved.language) setReportLang(saved.language);
        if (saved.userName) setUserName(saved.userName);
        if (saved.userGender) setUserGender(saved.userGender);
        // Build report object from server response
        setReport({ birthData: saved.birthData || null });
        setAiReport({ narrativeSections: saved.narrativeSections || null });
        setChartData(saved.rashiChart ? { rashiChart: saved.rashiChart, lagna: saved.birthData?.lagna || null } : null);
        setScreenState('report');
      } else {
        setError(reportLang === 'si' ? 'වාර්තාව පූරණය කිරීමට නොහැක' : 'Could not load report');
      }
    } catch (err) {
      setError(err.message || 'Failed to load saved report');
    } finally {
      setLoadingReportId(null);
    }
  };

  var handleDeleteSavedReport = function(reportItem) {
    var title = reportLang === 'si' ? 'වාර්තාව මකන්නද?' : 'Delete Report?';
    var msg = reportLang === 'si'
      ? 'මෙම වාර්තාව ස්ථිරවම මකනු ලැබේ. ඔබට විශ්වාසද?'
      : 'This report will be permanently deleted. Are you sure?';
    var cancel = reportLang === 'si' ? 'අවලංගු' : 'Cancel';
    var del = reportLang === 'si' ? 'මකන්න' : 'Delete';

    Alert.alert(title, msg, [
      { text: cancel, style: 'cancel' },
      {
        text: del,
        style: 'destructive',
        onPress: async function() {
          try {
            await api.deleteSavedReport(reportItem.id);
            setSavedReports(function(prev) { return prev.filter(function(r) { return r.id !== reportItem.id; }); });
          } catch (err) {
            setError(err.message || 'Failed to delete report');
          }
        },
      },
    ]);
  };

  // ── GENDER GUESS SCREEN ───────────────────────────────────
  if (screenState === 'gender-guess' && genderPrediction) {
    return (
      <GenderGuessScreen
        prediction={genderPrediction}
        userName={userName}
        onConfirm={handleGenderConfirm}
        language={reportLang}
      />
    );
  }

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
              colors={['rgba(147,51,234,0.18)', 'rgba(4,3,12,0.96)']}
              style={{ borderRadius: 24, padding: 28, borderWidth: 1, borderColor: 'rgba(147,51,234,0.3)' }}
            >
              <Text style={{ fontSize: 38, textAlign: 'center', marginBottom: 12 }}>📜</Text>
              <Text style={{ color: '#FBBF24', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 6, letterSpacing: 1 }}>
                {reportLang === 'si' ? 'ජීවිත කතාව' : 'Full Life Report'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
                {reportLang === 'si' ? 'AI ලියන ලද, ඔබ ගැන පමණයි' : 'AI-written, personalised just for you'}
              </Text>

              {/* Cost row */}
              <View style={{ backgroundColor: 'rgba(251,191,36,0.08)', borderRadius: 14, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                  {reportLang === 'si' ? 'ගෙවීම' : 'Charge'}
                </Text>
                <Text style={{ color: '#FBBF24', fontSize: 20, fontWeight: '800' }}>LKR 15</Text>
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
                    colors={['#FBBF24', '#F59E0B', '#9333EA']}
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
      <CosmicBackground>
        <ScrollView style={s.flex} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* Title */}
          <Animated.View entering={FadeInDown.delay(50).duration(600)}>
            <Text style={s.title}>{
              reportLang === 'si'
                ? (userName ? userName + 'ගේ ජීවිත කතාව ✨' : '✨ ඔයාගේ ජීවිත කතාව')
                : (userName ? userName + '\'s Life Story' : '✨ Your Life Story')
            }</Text>
            <Text style={s.subtitle}>{birthLocation} • {birthDate} • {birthTime}</Text>
          </Animated.View>

          {/* New Report Button */}
          <Animated.View entering={FadeIn.delay(100).duration(400)}>
            <TouchableOpacity style={s.newReportBtn} onPress={handleNewReport} activeOpacity={0.8}>
              <Ionicons name="refresh" size={16} color="#C084FC" style={{ marginRight: 6 }} />
              <Text style={s.newReportText}>{reportLang === 'si' ? 'අලුත් කතාවක් ලියන්න' : 'Write a New Story'}</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Birth Summary Header */}
          {report.birthData && (
            <Animated.View entering={FadeInDown.delay(150).duration(600)}>
              <AuraBox style={{ borderColor: 'rgba(251,191,36,0.2)' }}>
                <LinearGradient
                  colors={['rgba(251,191,36,0.08)', 'transparent']}
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
              </AuraBox>
            </Animated.View>
          )}

          {/* Birth Chart (Sri Lankan Kendara) */}
          {chartData && chartData.rashiChart && (
            <Animated.View entering={FadeInDown.delay(250).duration(700)}>
              <AuraBox style={{ borderColor: 'rgba(147,51,234,0.2)' }}>
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
          <View style={{ height: 120 }} />
        </ScrollView>
      </CosmicBackground>
    );
  }

  // ── INPUT FORM (default view) ────────────────────────────
  return (
    <CosmicBackground>
      <ScrollView style={s.flex} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
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

            <View style={s.inputRow}>
              <View style={s.inputGroup}>
                <Text style={s.inputHint}>{reportLang === 'si' ? 'උපන් දිනය' : 'Date'}</Text>
                <TextInput
                  style={s.input}
                  value={birthDate}
                  onChangeText={setBirthDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#475569"
                />
              </View>
              <View style={[s.inputGroup, { flex: 0.6 }]}>
                <Text style={s.inputHint}>{reportLang === 'si' ? 'වේලාව' : 'Time'}</Text>
                <TextInput
                  style={s.input}
                  value={birthTime}
                  onChangeText={setBirthTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#475569"
                />
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

            <TouchableOpacity style={s.generateBtn} onPress={handleGenerate} activeOpacity={0.8}>
              <LinearGradient
                colors={['#9333EA', '#6D28D9']}
                style={s.generateGrad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Ionicons name="sparkles" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={s.generateText}>{t('reportGenerate')}</Text>
              </LinearGradient>
            </TouchableOpacity>

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
                <Text style={{ color: '#FBBF24', fontSize: 12, fontWeight: '700' }}>LKR 15</Text>
                <TouchableOpacity onPress={function() { setShowTopUp(true); }} style={{ marginLeft: 8, backgroundColor: 'rgba(147,51,234,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                  <Text style={{ color: '#C084FC', fontSize: 11, fontWeight: '700' }}>
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

        {/* ── SAVED REPORTS LIST ── */}
        {savedReports.length > 0 && (
          <Animated.View entering={FadeInDown.delay(300).duration(800)}>
            <AuraBox style={{ borderColor: 'rgba(251,191,36,0.15)' }}>
              <View style={sr.header}>
                <View style={sr.headerLeft}>
                  <Ionicons name="library" size={20} color="#FBBF24" style={{ marginRight: 8 }} />
                  <Text style={sr.headerTitle}>{reportLang === 'si' ? 'සුරකින ලද වාර්තා' : 'Saved Reports'}</Text>
                </View>
                <Text style={sr.headerCount}>{savedReports.length}</Text>
              </View>

              {savedReportsLoading ? (
                <ActivityIndicator color="#9333EA" style={{ paddingVertical: 20 }} />
              ) : (
                savedReports.map(function(item, idx) {
                  var dateLabel = '';
                  try {
                    var d = new Date(item.createdAt);
                    dateLabel = d.toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' });
                  } catch (e) { dateLabel = item.createdAt || ''; }
                  var birthLabel = item.birthDate ? item.birthDate.split('T')[0] : '';
                  var langEmoji = item.language === 'si' ? '🇱🇰' : '🇬🇧';
                  var isLoading = loadingReportId === item.id;
                  var displayName = item.userName || birthLabel;
                  var locationLabel = item.birthLocation ? (' • ' + item.birthLocation) : '';

                  return (
                    <View key={item.id || idx} style={sr.card}>
                      <TouchableOpacity
                        style={sr.cardMain}
                        onPress={function() { handleLoadSavedReport(item); }}
                        activeOpacity={0.7}
                        disabled={isLoading}
                      >
                        <View style={sr.cardIcon}>
                          {isLoading ? (
                            <ActivityIndicator color="#9333EA" size="small" />
                          ) : (
                            <Text style={{ fontSize: 24 }}>📜</Text>
                          )}
                        </View>
                        <View style={sr.cardInfo}>
                          <Text style={sr.cardName}>{displayName}</Text>
                          <Text style={sr.cardBirth}>{langEmoji} {birthLabel}{locationLabel}</Text>
                          <Text style={sr.cardDate}>{reportLang === 'si' ? 'සාදන ලද: ' : 'Created: '}{dateLabel}</Text>
                          {item.sectionCount ? (
                            <Text style={sr.cardSections}>{item.sectionCount} {reportLang === 'si' ? 'කොටස්' : 'sections'}</Text>
                          ) : null}
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={sr.deleteBtn}
                        onPress={function() { handleDeleteSavedReport(item); }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </AuraBox>
          </Animated.View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </CosmicBackground>
  );
}

// ══════════════════════════════════════════
// MAIN STYLES
// ══════════════════════════════════════════
var s = StyleSheet.create({
  flex: { flex: 1 },
  loadingFull: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingTop: Platform.OS === 'ios' ? 110 : 90, paddingHorizontal: 16, paddingBottom: 40 },
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
  aiProgressText: { color: '#C084FC', fontSize: 14, fontWeight: '700' },
  aiProgressSub: { color: '#64748B', fontSize: 11, marginTop: 4 },
  langRow: { flexDirection: 'row', gap: 10, marginBottom: 16, marginTop: 6 },
  langBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(24,30,72,0.4)' },
  langBtnActive: { borderColor: 'rgba(147,51,234,0.6)', backgroundColor: 'rgba(147,51,234,0.15)' },
  langFlag: { fontSize: 20 },
  langText: { color: '#64748B', fontSize: 14, fontWeight: '700' },
  langTextActive: { color: '#C084FC' },
  locationRow: { marginBottom: 16, marginTop: 4 },
  locationScroll: { flexGrow: 0 },
  locationChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(24,30,72,0.4)', marginRight: 8 },
  locationChipActive: { borderColor: 'rgba(147,51,234,0.6)', backgroundColor: 'rgba(147,51,234,0.15)' },
  locationChipText: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  locationChipTextActive: { color: '#C084FC' },
  newReportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginBottom: 12, backgroundColor: 'rgba(147,51,234,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(147,51,234,0.25)' },
  newReportText: { color: '#C084FC', fontSize: 13, fontWeight: '700' },
  birthHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  birthIconBg: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(251,191,36,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  birthLagna: { color: '#FBBF24', fontSize: 20, fontWeight: '900' },
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

// ──────────────────────────────────────────
// Saved Reports styles
// ──────────────────────────────────────────
var sr = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#FBBF24', fontSize: 15, fontWeight: '800' },
  headerCount: { color: '#64748B', fontSize: 12, fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(147,51,234,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardInfo: { flex: 1 },
  cardName: { color: '#FBBF24', fontSize: 15, fontWeight: '800' },
  cardBirth: { color: '#F1F5F9', fontSize: 12, fontWeight: '600', marginTop: 2 },
  cardDate: { color: '#64748B', fontSize: 11, marginTop: 2 },
  cardSections: { color: '#9333EA', fontSize: 10, fontWeight: '600', marginTop: 2 },
  deleteBtn: { paddingHorizontal: 14, paddingVertical: 16, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.05)' },
});
