/**
 * Full Jyotish Report Screen — "Cosmic Reveal" Edition
 * 
 * Dopamine-inducing progressive reveal design with:
 * - Dramatic hero score card with animated rings
 * - Hook-line teasers that pull users into each section
 * - Animated strength meters and rare-trait badges
 * - Visual timeline milestones with golden dots
 * - Key prediction spotlight callouts
 * - Progressive unlock animations on scroll
 * - Score badges on every section header
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Platform, Alert, Dimensions, AppState,
} from 'react-native';
import { useKeepAwake, activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown, FadeIn, FadeInUp, FadeInRight, ZoomIn,
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence, withDelay, withSpring,
  interpolate, Easing,
} from 'react-native-reanimated';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import DesktopScreenWrapper, { useDesktopCtx } from '../../components/DesktopScreenWrapper';
import MarkdownText from '../../components/MarkdownText';
import SriLankanChart from '../../components/SriLankanChart';
import SpringPressable from '../../components/effects/SpringPressable';
import { DatePickerField, TimePickerField } from '../../components/CosmicDateTimePicker';
import CitySearchPicker from '../../components/CitySearchPicker';
import { generateReportHTML, loadLogoBase64 } from '../../utils/pdfReportGenerator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { boxShadow, textShadow } from '../../utils/shadow';
import useScreenInsets from '../../hooks/useScreenInsets';
import { useTheme } from '../../contexts/ThemeContext';
import { screenColors } from '../../constants/theme';
import useNetworkStatus from '../../hooks/useNetworkStatus';
import useLowEndDevice from '../../hooks/useLowEndDevice';
import { checkServerReachable } from '../../services/api';
var REPORTS_CACHE_KEY = '@grahachara_saved_reports';
var MAX_SAVED_REPORTS = 20;

var { width: SCREEN_WIDTH } = Dimensions.get('window');

// ──────────────────────────────────────────
// Section icons, gradients & dopamine config
// ──────────────────────────────────────────
var SECTION_META = {
  personality:      { colors: ['#3B82F6', '#1E3A8A'], emoji: '✨', gradient: ['#818CF8', '#3B82F6'], icon: 'person-outline', scoreKey: 'personality' },
  yogaAnalysis:     { colors: ['#9333EA', '#581C87'], emoji: '⚡', gradient: ['#FF8C00', '#9333EA'], icon: 'flash-outline', scoreKey: 'yogas' },
  lifePredictions:  { colors: ['#8B5CF6', '#4C1D95'], emoji: '🔮', gradient: ['#A78BFA', '#8B5CF6'], icon: 'telescope-outline', scoreKey: 'destiny' },
  career:           { colors: ['#F59E0B', '#92400E'], emoji: '💼', gradient: ['#FFB800', '#F59E0B'], icon: 'briefcase-outline', scoreKey: 'career' },
  marriage:         { colors: ['#EC4899', '#831843'], emoji: '💍', gradient: ['#F9A8D4', '#EC4899'], icon: 'heart-outline', scoreKey: 'love' },
  marriedLife:      { colors: ['#E11D48', '#881337'], emoji: '🏠', gradient: ['#FDA4AF', '#E11D48'], icon: 'home-outline', scoreKey: 'marriage' },
  financial:        { colors: ['#22C55E', '#14532D'], emoji: '💰', gradient: ['#4ADE80', '#22C55E'], icon: 'cash-outline', scoreKey: 'wealth' },
  children:         { colors: ['#10B981', '#064E3B'], emoji: '👶', gradient: ['#34D399', '#10B981'], icon: 'happy-outline', scoreKey: 'children' },
  familyPortrait:   { colors: ['#0EA5E9', '#0C4A6E'], emoji: '👨‍👩‍👧‍👦', gradient: ['#38BDF8', '#0EA5E9'], icon: 'people-outline', scoreKey: 'family' },
  health:           { colors: ['#EF4444', '#7F1D1D'], emoji: '🏥', gradient: ['#FCA5A5', '#EF4444'], icon: 'fitness-outline', scoreKey: 'health' },
  physicalProfile:  { colors: ['#D946EF', '#86198F'], emoji: '🪞', gradient: ['#F0ABFC', '#D946EF'], icon: 'body-outline', scoreKey: 'physical' },
  attractionProfile:{ colors: ['#F43F5E', '#9F1239'], emoji: '💘', gradient: ['#FDA4AF', '#F43F5E'], icon: 'flame-outline', scoreKey: 'attraction' },
  mentalHealth:     { colors: ['#06B6D4', '#0E7490'], emoji: '🧠', gradient: ['#67E8F9', '#06B6D4'], icon: 'bulb-outline', scoreKey: 'mind' },
  foreignTravel:    { colors: ['#6366F1', '#312E81'], emoji: '✈️', gradient: ['#A5B4FC', '#6366F1'], icon: 'airplane-outline', scoreKey: 'travel' },
  education:        { colors: ['#7C3AED', '#4C1D95'], emoji: '🎓', gradient: ['#A78BFA', '#7C3AED'], icon: 'school-outline', scoreKey: 'education' },
  luck:             { colors: ['#FFB800', '#78350F'], emoji: '🎰', gradient: ['#FDE68A', '#FFB800'], icon: 'diamond-outline', scoreKey: 'luck' },
  legal:            { colors: ['#64748B', '#1E293B'], emoji: '⚖️', gradient: ['#94A3B8', '#64748B'], icon: 'shield-outline', scoreKey: 'protection' },
  spiritual:        { colors: ['#A855F7', '#581C87'], emoji: '🙏', gradient: ['#D8B4FE', '#A855F7'], icon: 'sparkles-outline', scoreKey: 'spiritual' },
  realEstate:       { colors: ['#84CC16', '#365314'], emoji: '🏡', gradient: ['#BEF264', '#84CC16'], icon: 'business-outline', scoreKey: 'property' },
  transits:         { colors: ['#14B8A6', '#134E4A'], emoji: '🌍', gradient: ['#5EEAD4', '#14B8A6'], icon: 'planet-outline', scoreKey: 'transits' },
  surpriseInsights: { colors: ['#F97316', '#9A3412'], emoji: '🤯', gradient: ['#FDBA74', '#F97316'], icon: 'eye-outline', scoreKey: 'surprise' },
  timeline25:       { colors: ['#6366F1', '#312E81'], emoji: '📅', gradient: ['#A5B4FC', '#6366F1'], icon: 'calendar-outline', scoreKey: 'timeline' },
  remedies:         { colors: ['#FFB800', '#78350F'], emoji: '💎', gradient: ['#FDE68A', '#FFB800'], icon: 'color-wand-outline', scoreKey: 'remedies' },
};

var SECTION_KEYS = [
  'personality', 'yogaAnalysis', 'lifePredictions', 'career', 'marriage', 'marriedLife', 'financial',
  'children', 'familyPortrait', 'health', 'physicalProfile', 'attractionProfile', 'mentalHealth', 'foreignTravel', 'education', 'luck',
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
  physicalProfile: 'reportPhysicalProfile',
  attractionProfile: 'reportAttractionProfile',
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
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      <View style={[gs.innerGlow, { pointerEvents: 'none' }]} />
      {children}
    </View>
  );
}
var gs = StyleSheet.create({
  box: {
    borderRadius: 20, overflow: 'hidden', borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.10)', padding: 16, marginBottom: 12,
    ...boxShadow('#000', { width: 0, height: 4 }, 0.3, 10), elevation: 5,
  },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', borderRadius: 20,
  },
});

// ══════════════════════════════════════════
// EXTRACT HOOK LINE — grabs first compelling sentence from narrative
// ══════════════════════════════════════════
function extractHookLine(narrative, sectionKey) {
  if (!narrative) return null;
  // Strip markdown formatting for hook
  var clean = narrative.replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#+\s*/gm, '').replace(/^>\s*/gm, '').replace(/^[-•]\s*/gm, '');
  var sentences = clean.split(/[.!?]\s+/).filter(function(s) { return s.trim().length > 20 && s.trim().length < 200; });
  // Find the most hook-worthy sentence (contains specific dates, numbers, or strong language)
  var hookPatterns = /\d{4}|\d+%|\d+ years|powerful|extraordinary|rare|unique|exceptional|remarkable|unusual|hidden|secret|surprising|shocking|incredible/i;
  for (var i = 0; i < Math.min(sentences.length, 8); i++) {
    if (hookPatterns.test(sentences[i])) {
      var hook = sentences[i].trim();
      if (!hook.endsWith('.') && !hook.endsWith('!') && !hook.endsWith('?')) hook += '...';
      return hook;
    }
  }
  // Fallback: use first sentence if it's substantial
  if (sentences.length > 0) {
    var hook = sentences[0].trim();
    if (!hook.endsWith('.') && !hook.endsWith('!') && !hook.endsWith('?')) hook += '...';
    return hook;
  }
  return null;
}

// ══════════════════════════════════════════
// EXTRACT SCORE from raw section data
// ══════════════════════════════════════════
function extractSectionScore(sectionKey, rawData) {
  if (!rawData) return null;
  var score = null;
  // Try to extract meaningful scores from different section types
  switch (sectionKey) {
    case 'marriage':
    case 'marriedLife':
      score = rawData.seventhHouse?.strengthScore;
      if (!score && rawData.marriageAfflictions) {
        score = 100 - (rawData.marriageAfflictions.severityScore || 0);
      }
      break;
    case 'career':
      score = rawData.tenthHouse?.strengthScore;
      break;
    case 'health':
      score = rawData.sixthHouse?.strengthScore || rawData.eighthHouse?.strengthScore || rawData.firstHouse?.strengthScore;
      break;
    case 'financial':
      score = rawData.income?.secondHouse?.strengthScore || rawData.income?.eleventhHouse?.strengthScore || rawData.secondHouse?.strengthScore;
      break;
    case 'education':
      score = rawData.fourthHouse?.strengthScore || rawData.fifthHouse?.strengthScore;
      break;
    case 'children':
      score = rawData.fifthHouse?.strengthScore;
      break;
    case 'foreignTravel':
      score = rawData.ninthHouse?.strengthScore || rawData.twelfthHouse?.strengthScore;
      break;
    case 'luck':
      score = rawData.ninthHouse?.strengthScore;
      break;
    case 'spiritual':
      score = rawData.twelfthHouse?.strengthScore;
      break;
    default:
      break;
  }
  if (score != null) return Math.min(100, Math.max(0, Math.round(score)));
  return null;
}

// ══════════════════════════════════════════
// EXTRACT KEY STATS from section data
// ══════════════════════════════════════════
function extractKeyStats(sectionKey, rawData, reportLang) {
  if (!rawData) return [];
  var stats = [];
  var isSi = reportLang === 'si';
  switch (sectionKey) {
    case 'marriage':
      if (rawData.marriageTimingPrediction?.bestWindow?.dateRange) stats.push({ label: isSi ? 'හොඳම කාලය' : 'Best Window', value: rawData.marriageTimingPrediction.bestWindow.dateRange, icon: '💫' });
      if (rawData.marriageAfflictions?.likelihood) stats.push({ label: isSi ? 'සම්භාවිතාව' : 'Likelihood', value: rawData.marriageAfflictions.likelihood, icon: '📊' });
      if (rawData.secondMarriage?.divorceRisk) stats.push({ label: isSi ? 'දික්කසාද අවදානම' : 'Divorce Risk', value: rawData.secondMarriage.divorceRisk.split('—')[0].trim(), icon: '⚠️' });
      break;
    case 'marriedLife':
      if (rawData.navamshaAnalysis?.marriageStrength) stats.push({ label: isSi ? 'විවාහ ශක්තිය' : 'Marriage Quality', value: rawData.navamshaAnalysis.marriageStrength, icon: '💍' });
      if (rawData.secondMarriage?.probability) stats.push({ label: isSi ? 'දෙවන විවාහය' : '2nd Marriage', value: rawData.secondMarriage.probability.split('—')[0].trim(), icon: '💔' });
      if (rawData.secondMarriage?.divorceRisk) stats.push({ label: isSi ? 'දික්කසාද අවදානම' : 'Divorce Risk', value: rawData.secondMarriage.divorceRisk.split('—')[0].trim(), icon: '⚠️' });
      break;
    case 'career':
      if (rawData.careerPlanetRanking?.length) {
        var topPlanet = typeof rawData.careerPlanetRanking[0] === 'object' ? rawData.careerPlanetRanking[0].planet : rawData.careerPlanetRanking[0];
        stats.push({ label: isSi ? 'ප්‍රධාන ග්‍රහයා' : 'Top Planet', value: topPlanet, icon: '🎯' });
      }
      if (rawData.nadiCareer?.careerType) {
        var careerType = typeof rawData.nadiCareer.careerType === 'object' ? rawData.nadiCareer.careerType.type : rawData.nadiCareer.careerType;
        stats.push({ label: isSi ? 'වර්ගය' : 'Type', value: careerType, icon: '💼' });
      }
      if (rawData.nadiCareer?.serviceStrength || rawData.nadiCareer?.businessStrength) {
        var svc = rawData.nadiCareer.serviceStrength || '';
        var biz = rawData.nadiCareer.businessStrength || '';
        stats.push({ label: isSi ? 'ව්‍යාපාර/සේවය' : 'Biz/Service', value: biz + '/' + svc, icon: '📈' });
      }
      break;
    case 'health':
      if (rawData.nadiHealth?.longevityEstimate?.estimatedYears) stats.push({ label: isSi ? 'ආයුෂ' : 'Longevity', value: rawData.nadiHealth.longevityEstimate.estimatedYears + (isSi ? ' වසර' : ' yrs'), icon: '❤️' });
      if (rawData.nadiHealth?.longevityStrength) stats.push({ label: isSi ? 'ශක්තිය' : 'Vitality', value: rawData.nadiHealth.longevityStrength, icon: '💪' });
      break;
    case 'children':
      if (rawData.estimatedChildren?.count != null) stats.push({ label: isSi ? 'දරු සංඛ්‍යාව' : 'Children', value: String(rawData.estimatedChildren.count), icon: '👶' });
      if (rawData.nadiChildren?.strength) stats.push({ label: isSi ? 'නාඩි' : 'Nadi', value: rawData.nadiChildren.strength, icon: '🔮' });
      break;
    case 'education':
      if (rawData.nadiEducation?.overallGrade) stats.push({ label: isSi ? 'ශ්‍රේණිය' : 'Grade', value: rawData.nadiEducation.overallGrade, icon: '📚' });
      if (rawData.eduPlanetPool?.length) {
        var topEduPlanet = rawData.eduPlanetPool[0].planet;
        stats.push({ label: isSi ? 'ප්‍රධාන ග්‍රහයා' : 'Top Planet', value: topEduPlanet, icon: '🎯' });
      }
      break;
    case 'foreignTravel':
      if (rawData.nadiForeignTravel?.strength) stats.push({ label: isSi ? 'සම්භාවිතාව' : 'Chance', value: rawData.nadiForeignTravel.strength, icon: '✈️' });
      break;
    case 'luck':
      if (rawData.nadiLuck?.windfallStrength) stats.push({ label: isSi ? 'වාසනාව' : 'Windfall', value: rawData.nadiLuck.windfallStrength, icon: '🍀' });
      if (rawData.nadiLuck?.wealthStrength) stats.push({ label: isSi ? 'සම්පත' : 'Wealth', value: rawData.nadiLuck.wealthStrength, icon: '💎' });
      break;
    case 'surpriseInsights':
      if (rawData.secondMarriage?.probability) stats.push({ label: isSi ? 'දෙවන විවාහය' : '2nd Marriage', value: rawData.secondMarriage.probability.split('—')[0].trim(), icon: '💔' });
      if (rawData.secondMarriage?.divorceRisk) stats.push({ label: isSi ? 'දික්කසාද' : 'Divorce', value: rawData.secondMarriage.divorceRisk.split('—')[0].trim(), icon: '⚠️' });
      if (rawData.famePotential?.level) stats.push({ label: isSi ? 'ප්‍රසිද්ධිය' : 'Fame', value: rawData.famePotential.level, icon: '⭐' });
      break;
    default:
      break;
  }
  return stats.slice(0, 3); // Max 3 stats per section
}

// ══════════════════════════════════════════
// ANIMATED SCORE RING
// ══════════════════════════════════════════
function ScoreRing({ score, size, color, delay: delayMs }) {
  var animVal = useSharedValue(0);
  useEffect(function() {
    animVal.value = withDelay(delayMs || 300, withTiming(score / 100, { duration: 1200, easing: Easing.bezierFn(0.25, 0.1, 0.25, 1) }));
  }, [score]);

  var circumference = 2 * Math.PI * ((size - 6) / 2);
  var ringStyle = useAnimatedStyle(function() {
    return { opacity: interpolate(animVal.value, [0, 0.1], [0, 1]) };
  });

  var getColor = function(s) {
    if (s >= 75) return '#10B981';
    if (s >= 55) return '#3B82F6';
    if (s >= 35) return '#FBBF24';
    return '#EF4444';
  };
  var scoreColor = color || getColor(score);
  var label = score >= 80 ? '🔥' : score >= 60 ? '✨' : score >= 40 ? '💫' : '⚡';

  return (
    <Animated.View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, ringStyle]}>
      {/* Background ring */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: 3, borderColor: 'rgba(255,255,255,0.06)',
      }} />
      {/* Score ring — using a simple progress bar visual instead of SVG */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: 3, borderColor: scoreColor,
        opacity: 0.8,
      }} />
      <Text style={{ fontSize: size * 0.28, fontWeight: '900', color: scoreColor }}>{score}</Text>
      <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', marginTop: -2 }}>{label}</Text>
    </Animated.View>
  );
}

// ══════════════════════════════════════════
// STAT BADGE — small key metric chip
// ══════════════════════════════════════════
function StatBadge({ stat, index }) {
  return (
    <Animated.View entering={FadeInRight.delay(200 + index * 100).duration(400)} style={stb.wrap}>
      <LinearGradient
        colors={['rgba(255,184,0,0.10)', 'rgba(255,184,0,0.04)']}
        style={stb.inner}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <Text style={stb.icon}>{stat.icon}</Text>
        <View style={stb.textWrap}>
          <Text style={stb.label} numberOfLines={1}>{stat.label}</Text>
          <Text style={stb.value} numberOfLines={1}>{stat.value}</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
var stb = StyleSheet.create({
  wrap: { marginRight: 8, marginBottom: 6 },
  inner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,184,0,0.12)' },
  icon: { fontSize: 14, marginRight: 6 },
  textWrap: { flexShrink: 1 },
  label: { fontSize: 9, color: 'rgba(255,214,102,0.45)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 12, color: '#FFE8B0', fontWeight: '700', marginTop: 1 },
});

// ══════════════════════════════════════════
// STRENGTH BAR — animated horizontal meter
// ══════════════════════════════════════════
function StrengthBar({ label, value, color, delay: delayMs }) {
  var animWidth = useSharedValue(0);
  useEffect(function() {
    animWidth.value = withDelay(delayMs || 200, withSpring(value, { damping: 15, stiffness: 80 }));
  }, [value]);

  var barStyle = useAnimatedStyle(function() {
    return { width: animWidth.value + '%' };
  });

  return (
    <View style={sbr.wrap}>
      <View style={sbr.labelRow}>
        <Text style={sbr.label}>{label}</Text>
        <Text style={[sbr.score, { color: color || '#FFB800' }]}>{value}%</Text>
      </View>
      <View style={sbr.track}>
        <Animated.View style={[sbr.fill, barStyle]}>
          <LinearGradient
            colors={[color || '#FFB800', (color || '#FFB800') + '80']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          />
        </Animated.View>
      </View>
    </View>
  );
}
var sbr = StyleSheet.create({
  wrap: { marginBottom: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 11, color: 'rgba(255,214,102,0.55)', fontWeight: '600' },
  score: { fontSize: 11, fontWeight: '800' },
  track: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2, overflow: 'hidden' },
});

// ══════════════════════════════════════════
// COLLAPSIBLE SECTION CARD — Dopamine Edition
// ══════════════════════════════════════════
function SectionCard({ sectionKey, data, index, t, aiNarrative, reportLang, rawData, isLowEnd, expandedKey, setExpandedKey }) {
  var isControlled = isLowEnd && expandedKey !== undefined;
  var [localExpanded, setLocalExpanded] = useState(false);
  var expanded = isControlled ? (expandedKey === sectionKey) : localExpanded;
  var [revealed, setRevealed] = useState(false);
  var meta = SECTION_META[sectionKey] || {};
  var isSi = reportLang === 'si';
  var i18nTitle = t(SECTION_TITLES[sectionKey]);
  var title = isSi ? (i18nTitle || aiNarrative?.title || sectionKey) : (aiNarrative?.title || i18nTitle || sectionKey);

  if (!aiNarrative?.narrative) return null;

  // Extract dopamine elements
  var hookLine = useMemo(function() { return extractHookLine(aiNarrative.narrative, sectionKey); }, [aiNarrative.narrative, sectionKey]);
  var score = useMemo(function() { return extractSectionScore(sectionKey, rawData); }, [sectionKey, rawData]);
  var keyStats = useMemo(function() { return extractKeyStats(sectionKey, rawData, reportLang); }, [sectionKey, rawData, reportLang]);

  // Word count for reading time
  var wordCount = aiNarrative.narrative ? aiNarrative.narrative.split(/\s+/).length : 0;
  var readTime = Math.max(1, Math.ceil(wordCount / 200));

  var handleExpand = function() {
    if (!expanded) {
      if (isControlled) {
        setExpandedKey(sectionKey);
      } else {
        setLocalExpanded(true);
      }
      setTimeout(function() { setRevealed(true); }, 100);
    } else {
      if (isControlled) {
        setExpandedKey(null);
      } else {
        setLocalExpanded(!localExpanded);
      }
    }
  };

  var sectionNumber = String(index + 1).padStart(2, '0');

  var WrapView = isLowEnd ? View : Animated.View;
  var wrapProps = isLowEnd ? {} : { entering: FadeInDown.delay(100 + index * 80).duration(600).springify() };
  var BadgeView = isLowEnd ? View : Animated.View;
  var badgeProps = isLowEnd ? {} : { entering: ZoomIn.delay(200 + index * 80).duration(400) };

  return (
    <WrapView {...wrapProps}>
      <View style={sc.outerWrap}>
        {/* Section number badge — floating left */}
        <BadgeView {...badgeProps} style={sc.sectionNumBadge}>
          <Text style={sc.sectionNumText}>{sectionNumber}</Text>
        </BadgeView>

        <AuraBox style={[sc.cardBox, expanded && sc.cardBoxExpanded]}>
          {/* Accent top border glow */}
          <LinearGradient
            colors={[...(meta.gradient || meta.colors || ['#333', '#111']), 'transparent']}
            style={sc.topGlow}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          />

          {/* ─── Header ─── */}
          <SpringPressable haptic="light" scalePressed={0.98} onPress={handleExpand}>
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
                {!expanded && hookLine && (
                  <Animated.Text entering={FadeIn.duration(600)} style={sc.hookLine} numberOfLines={2}>
                    {hookLine}
                  </Animated.Text>
                )}
              </View>
              <View style={sc.rightCol}>
                {/* Score ring */}
                {score != null && (
                  <ScoreRing score={score} size={36} delay={300 + index * 80} />
                )}
                <View style={[sc.chevronBg, expanded && sc.chevronBgActive]}>
                  <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={expanded ? '#FF8C00' : 'rgba(255,255,255,0.3)'} />
                </View>
              </View>
            </View>
          </SpringPressable>

          {/* ─── Preview Stats (always visible) ─── */}
          {!expanded && keyStats.length > 0 && (
            <View style={sc.statsRow}>
              {keyStats.map(function(stat, i) {
                return <StatBadge key={i} stat={stat} index={i} />;
              })}
            </View>
          )}

          {/* ─── Tap to read prompt ─── */}
          {!expanded && (
            <SpringPressable haptic="light" onPress={handleExpand} style={sc.readMoreBtn}>
              <LinearGradient
                colors={['rgba(255,140,0,0.08)', 'rgba(255,140,0,0.02)']}
                style={sc.readMoreGrad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Ionicons name="book-outline" size={12} color="#FF8C00" />
                <Text style={sc.readMoreText}>
                  {isSi ? 'කියවන්න · විනාඩි ' + readTime : 'Read · ' + readTime + ' min'}
                </Text>
                <Ionicons name="chevron-forward" size={12} color="rgba(255,140,0,0.5)" />
              </LinearGradient>
            </SpringPressable>
          )}

          {/* ─── Expanded Content ─── */}
          {expanded && (
            <Animated.View entering={FadeInDown.duration(500)} style={sc.content}>
              <View style={sc.divider} />

              {/* Key stats bar at top of content */}
              {keyStats.length > 0 && (
                <View style={sc.statsRowExpanded}>
                  {keyStats.map(function(stat, i) {
                    return <StatBadge key={i} stat={stat} index={i} />;
                  })}
                </View>
              )}

              {/* Score bar if available */}
              {score != null && (
                <Animated.View entering={FadeInDown.delay(200).duration(400)} style={sc.scoreBarWrap}>
                  <StrengthBar
                    label={isSi ? 'මෙම ක්ෂේත්‍රයේ ශක්තිය' : 'Strength in this area'}
                    value={score}
                    color={(meta.gradient || meta.colors || ['#FFB800'])[0]}
                    delay={300}
                  />
                </Animated.View>
              )}

              {/* Main narrative */}
              <View style={sc.narrativeWrap}>
                <MarkdownText>{aiNarrative.narrative}</MarkdownText>
              </View>

              {/* Collapse button at bottom */}
              <SpringPressable haptic="light" onPress={function() { if (isControlled) { setExpandedKey(null); } else { setLocalExpanded(false); } }} style={sc.collapseBtn}>
                <Ionicons name="chevron-up" size={14} color="rgba(255,140,0,0.6)" />
                <Text style={sc.collapseText}>{isSi ? 'හකුලන්න' : 'Collapse'}</Text>
              </SpringPressable>
            </Animated.View>
          )}
        </AuraBox>
      </View>
    </WrapView>
  );
}

var sc = StyleSheet.create({
  outerWrap: { position: 'relative', marginBottom: 4 },
  sectionNumBadge: {
    position: 'absolute', left: -4, top: 14, zIndex: 10, width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(255,140,0,0.15)', borderWidth: 1, borderColor: 'rgba(255,140,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  sectionNumText: { fontSize: 9, fontWeight: '900', color: '#FF8C00' },
  cardBox: { padding: 0, marginLeft: 12, borderColor: 'rgba(255,184,0,0.08)' },
  cardBoxExpanded: { borderColor: 'rgba(255,140,0,0.20)' },
  topGlow: { height: 2, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 8 },
  iconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  emoji: { fontSize: 20 },
  title: { color: '#FFE8B0', fontSize: 14, fontWeight: '800', lineHeight: 20 },
  hookLine: { color: 'rgba(255,214,102,0.50)', fontSize: 12, lineHeight: 17, marginTop: 3, fontStyle: 'italic' },
  rightCol: { alignItems: 'center', gap: 4 },
  chevronBg: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  chevronBgActive: { backgroundColor: 'rgba(255,140,0,0.15)' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, paddingBottom: 8 },
  statsRowExpanded: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  readMoreBtn: { marginHorizontal: 14, marginBottom: 12, borderRadius: 10, overflow: 'hidden' },
  readMoreGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,140,0,0.12)' },
  readMoreText: { fontSize: 11, color: '#FF8C00', fontWeight: '700' },
  content: { paddingHorizontal: 14, paddingBottom: 14 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 12 },
  scoreBarWrap: { marginBottom: 12 },
  narrativeWrap: {
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)',
  },
  collapseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,140,0,0.06)', borderWidth: 1, borderColor: 'rgba(255,140,0,0.10)' },
  collapseText: { fontSize: 11, color: 'rgba(255,140,0,0.6)', fontWeight: '600' },
});

// ══════════════════════════════════════════
// COSMIC DNA STRIP — Quick-nav score orbs
// Horizontal scrollable row of glowing orbs
// Tap an orb → scrolls to that section
// ══════════════════════════════════════════
var DNA_ITEMS = [
  { key: 'career', emoji: '💼', label: 'Career', labelSi: 'රැකියාව' },
  { key: 'marriage', emoji: '💍', label: 'Love', labelSi: 'ආදරය' },
  { key: 'health', emoji: '❤️', label: 'Health', labelSi: 'සෞඛ්‍යය' },
  { key: 'financial', emoji: '💰', label: 'Wealth', labelSi: 'මුදල්' },
  { key: 'luck', emoji: '🍀', label: 'Luck', labelSi: 'වාසනාව' },
  { key: 'education', emoji: '🎓', label: 'Study', labelSi: 'අධ්‍යාපන' },
  { key: 'children', emoji: '👶', label: 'Children', labelSi: 'දරු' },
  { key: 'foreignTravel', emoji: '✈️', label: 'Travel', labelSi: 'විදේශ' },
  { key: 'spiritual', emoji: '🙏', label: 'Spirit', labelSi: 'ආත්ම' },
];

function DnaOrb({ item, score, isSi, index, onPress }) {
  var orbScale = useSharedValue(0);
  useEffect(function () {
    orbScale.value = withDelay(index * 80, withSpring(1, { damping: 12, stiffness: 120 }));
  }, []);
  var orbAnim = useAnimatedStyle(function () {
    return { transform: [{ scale: orbScale.value }], opacity: interpolate(orbScale.value, [0, 0.5, 1], [0, 0.5, 1]) };
  });
  var getColor = function (s) {
    if (s >= 75) return '#10B981';
    if (s >= 55) return '#3B82F6';
    if (s >= 35) return '#FBBF24';
    return '#EF4444';
  };
  var color = score != null ? getColor(score) : 'rgba(255,255,255,0.15)';
  var hasScore = score != null;

  return (
    <Animated.View style={orbAnim}>
      <SpringPressable haptic="light" onPress={function () { onPress(item.key); }} style={dna.orbWrap}>
        <View style={[dna.orbRing, { borderColor: hasScore ? color + '50' : 'rgba(255,255,255,0.08)', shadowColor: hasScore ? color : 'transparent' }]}>
          <LinearGradient
            colors={hasScore ? [color + '20', color + '08'] : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)']}
            style={dna.orbInner}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            {hasScore ? (
              <Text style={[dna.orbScore, { color: color }]}>{score}</Text>
            ) : (
              <Text style={dna.orbEmoji}>{item.emoji}</Text>
            )}
          </LinearGradient>
        </View>
        <Text style={dna.orbLabel} numberOfLines={1}>{isSi ? item.labelSi : item.label}</Text>
      </SpringPressable>
    </Animated.View>
  );
}

function CosmicDnaStrip({ scoreMap, isSi, onOrbPress }) {
  return (
    <Animated.View entering={FadeInDown.delay(200).duration(700)}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={dna.scroll}>
        {DNA_ITEMS.map(function (item, idx) {
          return <DnaOrb key={item.key} item={item} score={scoreMap[item.key] || null} isSi={isSi} index={idx} onPress={onOrbPress} />;
        })}
      </ScrollView>
    </Animated.View>
  );
}

var dna = StyleSheet.create({
  scroll: { paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  orbWrap: { alignItems: 'center', width: 62, marginHorizontal: 2 },
  orbRing: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10, elevation: 0,
  },
  orbInner: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  orbScore: { fontSize: 16, fontWeight: '900' },
  orbEmoji: { fontSize: 18 },
  orbLabel: { fontSize: 9, color: 'rgba(255,214,102,0.50)', fontWeight: '600', marginTop: 4, textAlign: 'center' },
});

// ══════════════════════════════════════════
// READING PROGRESS BAR — fills as you scroll
// ══════════════════════════════════════════
function ReadingProgressBar({ scrollProgress, sectionCount, currentChapter, reportLang }) {
  var barWidth = useAnimatedStyle(function () {
    return { width: (scrollProgress.value * 100) + '%' };
  });
  var labelOpacity = useAnimatedStyle(function () {
    return { opacity: scrollProgress.value > 0.02 ? 1 : 0 };
  });
  var isSi = reportLang === 'si';

  return (
    <View style={rpb.wrap}>
      <View style={rpb.track}>
        <Animated.View style={[rpb.fill, barWidth]}>
          <LinearGradient
            colors={['#FF8C00', '#FFB800', '#FFD700']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          />
        </Animated.View>
      </View>
      <Animated.View style={[rpb.labelWrap, labelOpacity]}>
        <Text style={rpb.labelText}>
          {isSi ? 'පරිච්ඡේදය ' + currentChapter + '/' + sectionCount : 'Ch. ' + currentChapter + '/' + sectionCount}
        </Text>
      </Animated.View>
    </View>
  );
}

var rpb = StyleSheet.create({
  wrap: { position: 'absolute', top: Platform.OS === 'ios' ? 96 : 76, left: 0, right: 0, zIndex: 100, paddingHorizontal: 16 },
  track: { height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 1.5, overflow: 'hidden' },
  labelWrap: { alignSelf: 'flex-end', marginTop: 3 },
  labelText: { fontSize: 9, color: 'rgba(255,184,0,0.55)', fontWeight: '700' },
});

// ══════════════════════════════════════════
// CONSTELLATION DIVIDER — animated dots + lines between sections
// ══════════════════════════════════════════
function ConstellationDivider({ index }) {
  var twinkle = useSharedValue(0.3);
  useEffect(function () {
    twinkle.value = withRepeat(withSequence(
      withTiming(0.8, { duration: 1500 + index * 200, easing: Easing.inOut(Easing.sin) }),
      withTiming(0.2, { duration: 1200 + index * 150, easing: Easing.inOut(Easing.sin) })
    ), -1, true);
  }, []);
  var starStyle = useAnimatedStyle(function () { return { opacity: twinkle.value }; });

  // Random constellation pattern per index
  var patternSeed = (index * 7 + 3) % 5;
  var starPositions = [
    [0.12, 0.25, 0.42, 0.58, 0.75, 0.88], // even spread
    [0.08, 0.22, 0.38, 0.62, 0.78, 0.92], // offset
    [0.15, 0.30, 0.45, 0.55, 0.70, 0.85], // centered
    [0.10, 0.28, 0.40, 0.60, 0.72, 0.90], // wider
    [0.18, 0.32, 0.48, 0.52, 0.68, 0.82], // tight center
  ][patternSeed];

  return (
    <View style={cdv.wrap}>
      <View style={cdv.line} />
      {starPositions.map(function (pos, i) {
        var sz = (i % 3 === 0) ? 3 : 2;
        return (
          <Animated.View key={i} style={[cdv.star, {
            left: (pos * 100) + '%', width: sz, height: sz, borderRadius: sz / 2,
            marginLeft: -sz / 2,
          }, starStyle]} />
        );
      })}
      <View style={cdv.line} />
    </View>
  );
}

var cdv = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', marginVertical: 6, height: 12, position: 'relative' },
  line: { flex: 1, height: 0.5, backgroundColor: 'rgba(255,184,0,0.06)' },
  star: { position: 'absolute', backgroundColor: 'rgba(255,200,80,0.5)', shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4, elevation: 0 },
});

// ══════════════════════════════════════════
// COSMIC LOADING ANIMATION
// ══════════════════════════════════════════
var LOADING_STAGES = {
  en: {
    starting: { text: '🌌 Connecting to the stars...', sub: 'Preparing your birth chart analysis' },
    engine: { text: '🪐 Calculating planetary positions...', sub: 'Mapping the sky at your exact birth moment' },
    charts: { text: '✨ Building your celestial charts...', sub: 'Rashi, Navamsha, and house systems coming together' },
    coherence: { text: '🔮 Creating your personal narrative...', sub: 'Understanding the story behind the numbers' },
    sections: { text: '📜 Writing your life story...', sub: 'Each chapter crafted just for you' },
    complete: { text: '🎉 Your report is ready!', sub: 'Opening your personalized life reading' },
    failed: { text: '⚠️ Generation hit a snag', sub: 'Don\'t worry — you can try again for free' },
  },
  si: {
    starting: { text: '🌌 තරු වලට සම්බන්ධ වෙමින්...', sub: 'ඔබේ ජන්ම පත්‍රය විශ්ලේෂණයට සූදානම් වෙමින්' },
    engine: { text: '🪐 ග්‍රහ පිහිටීම් ගණනය කරමින්...', sub: 'ඔබ ඉපදුන මොහොතේ අහස සිතියම්ගත කරමින්' },
    charts: { text: '✨ දිව්‍ය සටහන් ගොඩනගමින්...', sub: 'රාශි, නවාංශ, භාව පද්ධති එකට එමින්' },
    coherence: { text: '🔮 ඔබේ පෞද්ගලික කථාව නිර්මාණය කරමින්...', sub: 'සංඛ්‍යා පිටුපස ඇති කතාව තේරුම් ගනිමින්' },
    sections: { text: '📜 ඔබේ ජීවිත කතාව ලියමින්...', sub: 'සෑම පරිච්ඡේදයක්ම ඔබට පමණක් ලියැවේ' },
    complete: { text: '🎉 ඔබේ වාර්තාව සූදානම්!', sub: 'ඔබේ පෞද්ගලික ජීවිත කියවීම විවෘත කරමින්' },
    failed: { text: '⚠️ ජනනයේ ගැටලුවක්', sub: 'කරදර වෙන්න එපා — නොමිලේ නැවත උත්සාහ කරන්න' },
  },
};

var SECTION_LABELS = {
  en: {
    personality: 'Personality', yogaAnalysis: 'Yoga Analysis', lifePredictions: 'Life Predictions',
    career: 'Career', marriage: 'Marriage', marriedLife: 'Married Life', financial: 'Financial',
    children: 'Children', familyPortrait: 'Family', health: 'Health', physicalProfile: 'Physical Profile',
    attractionProfile: 'Attraction', mentalHealth: 'Mental Health', foreignTravel: 'Foreign Travel',
    education: 'Education', luck: 'Luck & Fortune', legal: 'Legal Matters', spiritual: 'Spiritual Path',
    realEstate: 'Real Estate', transits: 'Current Transits', surpriseInsights: 'Surprise Insights',
    timeline25: 'Year Timeline', remedies: 'Remedies',
  },
  si: {
    personality: 'පෞද්ගලිකත්වය', yogaAnalysis: 'යෝග විශ්ලේෂණය', lifePredictions: 'ජීවිත අනාවැකි',
    career: 'වෘත්තිය', marriage: 'විවාහය', marriedLife: 'විවාහ ජීවිතය', financial: 'මූල්‍ය',
    children: 'දරුවන්', familyPortrait: 'පවුල', health: 'සෞඛ්‍ය', physicalProfile: 'ශාරීරික',
    attractionProfile: 'ආකර්ෂණය', mentalHealth: 'මානසික සෞඛ්‍ය', foreignTravel: 'විදේශ ගමන්',
    education: 'අධ්‍යාපනය', luck: 'වාසනාව', legal: 'නීතිමය', spiritual: 'අධ්‍යාත්මික',
    realEstate: 'ඉඩම් දේපළ', transits: 'වත්මන් ගෝචර', surpriseInsights: 'විස්මිත අවබෝධ',
    timeline25: 'වාර්ෂික කාලරේඛාව', remedies: 'පිළියම්',
  },
};

function CosmicLoader({ progress, userName, language, colors: themeColors }) {
  var lang = language || 'en';
  var stageMap = LOADING_STAGES[lang] || LOADING_STAGES.en;
  var sectionLabels = SECTION_LABELS[lang] || SECTION_LABELS.en;
  var tc = themeColors || {};
  var rotation = useSharedValue(0);
  var pulse = useSharedValue(1);
  var orbit1 = useSharedValue(0);
  var orbit2 = useSharedValue(0);
  var orbit3 = useSharedValue(0);
  var glow = useSharedValue(0.3);

  useEffect(function() {
    rotation.value = withRepeat(withTiming(360, { duration: 8000 }), -1, false);
    pulse.value = withRepeat(withSequence(
      withTiming(1.15, { duration: 1200 }),
      withTiming(0.95, { duration: 1200 })
    ), -1, true);
    orbit1.value = withRepeat(withTiming(360, { duration: 3000 }), -1, false);
    orbit2.value = withRepeat(withTiming(360, { duration: 5000 }), -1, false);
    orbit3.value = withRepeat(withTiming(360, { duration: 7000 }), -1, false);
    glow.value = withRepeat(withSequence(
      withTiming(0.8, { duration: 2000 }),
      withTiming(0.3, { duration: 2000 })
    ), -1, true);
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

  // Real progress data
  var stage = progress?.stage || 'starting';
  var stageInfo = stageMap[stage] || stageMap.starting;
  var sectionsDone = progress?.sectionsDone || 0;
  var sectionsTotal = progress?.sectionsTotal || 19;
  var currentSection = progress?.currentSection;
  var elapsedMs = progress?.elapsedMs || 0;

  // Calculate real progress percentage
  var progressPct = 0;
  if (stage === 'engine') progressPct = 5;
  else if (stage === 'charts') progressPct = 10;
  else if (stage === 'coherence') progressPct = 15;
  else if (stage === 'sections') progressPct = 15 + (sectionsDone / Math.max(sectionsTotal, 1)) * 80;
  else if (stage === 'complete') progressPct = 100;
  else if (stage === 'failed') progressPct = progressPct; // keep last value

  var elapsedSec = Math.floor(elapsedMs / 1000);
  var elapsedMin = Math.floor(elapsedSec / 60);
  var elapsedStr = elapsedMin > 0 ? (elapsedMin + 'm ' + (elapsedSec % 60) + 's') : (elapsedSec + 's');

  var personalMsg = lang === 'si'
    ? (userName ? 'පොඩ්ඩක් ඉන්න ' + userName + '! ✨' : 'ඔයාගේ ජීවිත කතාව ලියමින්... ✨')
    : (userName ? 'Hold tight, ' + userName + '! ✨' : 'Your life story is being written... ✨');

  var currentSectionLabel = currentSection ? (sectionLabels[currentSection] || currentSection) : null;

  return (
    <View style={[cl.container, { backgroundColor: tc.bg || tc.background || '#04030C' }]}>
      {/* Orbiting system */}
      <View style={cl.orbitContainer}>
        <Animated.View style={[cl.glowCircle, pulseStyle]} />
        <Animated.View style={[cl.centerOrb, spinStyle]}>
          <LinearGradient
            colors={[tc.accent || '#FFB800', tc.accentLight || '#F59E0B', tc.accentDark || '#D97706']}
            style={cl.centerGrad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
        </Animated.View>
        <View style={[cl.orbitRing, { width: 100, height: 100 }]} />
        <View style={[cl.orbitRing, { width: 140, height: 140 }]} />
        <View style={[cl.orbitRing, { width: 180, height: 180 }]} />
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
      <Animated.View entering={FadeIn.duration(600)} key={stage} style={cl.textWrap}>
        <Text style={[cl.stageText, { color: tc.textPrimary || '#FFE8B0' }]}>{stageInfo.text}</Text>
        <Text style={[cl.stageSub, { color: tc.textMuted || 'rgba(255,214,102,0.50)' }]}>{stageInfo.sub}</Text>
      </Animated.View>

      {/* Current section being written */}
      {stage === 'sections' && currentSectionLabel ? (
        <Animated.View entering={FadeIn.duration(400)} key={currentSection} style={{ marginBottom: 12 }}>
          <Text style={[cl.sectionNow, { color: tc.accentLight || '#FBBF24' }]}>
            {lang === 'si' ? '✍️ ' + currentSectionLabel + ' ලියමින්...' : '✍️ Writing ' + currentSectionLabel + '...'}
          </Text>
        </Animated.View>
      ) : null}

      {/* Personal touch */}
      <Text style={[cl.personalText, { color: tc.solarAmber || '#FF8C00' }]}>{personalMsg}</Text>

      {/* Real progress bar */}
      <View style={cl.progressRow}>
        <View style={[cl.progressBar, { backgroundColor: tc.glassBorder || 'rgba(255,255,255,0.08)' }]}>
          <LinearGradient
            colors={[tc.solarAmber || '#FF8C00', tc.accent || '#FFB800']}
            style={[cl.progressFill, { width: Math.min(progressPct, 100) + '%' }]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          />
        </View>
        <View style={cl.progressMeta}>
          {stage === 'sections' ? (
            <Text style={[cl.progressText, { color: tc.textMuted || '#475569' }]}>{sectionsDone}/{sectionsTotal} {lang === 'si' ? 'කොටස්' : 'sections'}</Text>
          ) : (
            <Text style={[cl.progressText, { color: tc.textMuted || '#475569' }]}>{Math.round(progressPct)}%</Text>
          )}
          {elapsedSec > 5 ? <Text style={[cl.progressText, { color: tc.textMuted || '#475569' }]}>{elapsedStr}</Text> : null}
        </View>
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
  orbitRing: { position: 'absolute', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,140,0,0.15)', borderStyle: 'dashed' },
  planet: { position: 'absolute', zIndex: 5 },
  planet1: {},
  planet2: {},
  planet3: {},
  textWrap: { alignItems: 'center', marginBottom: 20 },
  stageText: { color: '#FFE8B0', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  stageSub: { color: 'rgba(255,214,102,0.50)', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  sectionNow: { color: '#FBBF24', fontSize: 13, fontWeight: '600', textAlign: 'center', fontStyle: 'italic' },
  personalText: { color: '#FF8C00', fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 24, fontStyle: 'italic' },
  progressRow: { width: '100%', alignItems: 'center' },
  progressBar: { width: '80%', height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', width: '80%' },
  progressText: { color: '#475569', fontSize: 11, fontWeight: '600' },
});

// ══════════════════════════════════════════
// MAIN REPORT SCREEN
// ══════════════════════════════════════════
export default function ReportScreen() {
  var { t, language } = useLanguage();
  var { user, showPaywall } = useAuth();
  var { colors, gradients, resolved } = useTheme();
  var sc = screenColors(colors);
  var isDesktop = useDesktopCtx();
  var isLowEnd = useLowEndDevice();
  var insets = useScreenInsets();
  var [birthDate, setBirthDate] = useState('1998-10-09');
  var [birthTime, setBirthTime] = useState('09:16');
  var [birthLocation, setBirthLocation] = useState('Colombo');
  var [birthLat, setBirthLat] = useState(6.9271);
  var [birthLng, setBirthLng] = useState(79.8612);
  var [selectedCity, setSelectedCity] = useState({ name: 'Colombo', country: 'Sri Lanka', countryCode: 'LK', lat: 6.9271, lng: 79.8612 });
  var handleCitySelect = useCallback(function(city) {
    setSelectedCity(city);
    setBirthLocation(city.name);
    setBirthLat(city.lat);
    setBirthLng(city.lng);
  }, []);
  var [reportLang, setReportLang] = useState(language || 'en');
  var [userName, setUserName] = useState('');
  var [userGender, setUserGender] = useState(null);
  var [userReligion, setUserReligion] = useState(null);
  var [report, setReport] = useState(null);
  var [aiReport, setAiReport] = useState(null);
  var [chartData, setChartData] = useState(null);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState(null);
  // Flow states: 'form' -> 'loading' -> 'report'
  var [screenState, setScreenState] = useState('form');
  var [savedReports, setSavedReports] = useState([]);
  var scrollProgress = useSharedValue(0);
  var [currentChapter, setCurrentChapter] = useState(1);
  var { isConnected } = useNetworkStatus();
  var [visibleSections, setVisibleSections] = useState(isLowEnd ? 8 : 999);
  var [expandedKey, setExpandedKey] = useState(null);

  // Keep screen awake during report generation (prevents OS from killing the fetch)
  var keepAwakeActiveRef = useRef(false);
  useEffect(function() {
    if (screenState === 'loading') {
      activateKeepAwakeAsync('report-generation').then(function() {
        keepAwakeActiveRef.current = true;
      }).catch(function() {});
    } else if (keepAwakeActiveRef.current) {
      try { deactivateKeepAwake('report-generation'); } catch (e) {}
      keepAwakeActiveRef.current = false;
    }
    return function() {
      if (keepAwakeActiveRef.current) {
        try { deactivateKeepAwake('report-generation'); } catch (e) {}
        keepAwakeActiveRef.current = false;
      }
    };
  }, [screenState]);

  // Track AppState to detect if app was backgrounded during generation
  var appStateRef = useRef(AppState.currentState);
  var wasBackgroundedDuringGen = useRef(false);
  useEffect(function() {
    var sub = AppState.addEventListener('change', function(nextState) {
      if (screenState === 'loading' && appStateRef.current === 'active' && nextState.match(/inactive|background/)) {
        wasBackgroundedDuringGen.current = true;
        if (__DEV__) console.log('[Report] App went to background during generation');
      }
      appStateRef.current = nextState;
    });
    return function() { sub.remove(); };
  }, [screenState]);

  // ── Load saved reports: server-first, AsyncStorage fallback ──
  var [serverReportsLoaded, setServerReportsLoaded] = useState(false);
  useEffect(function() {
    (async function() {
      // Try server first (source of truth)
      if (user && !user.isAnonymous) {
        try {
          var serverRes = await api.getMyHoroscopeReports();
          if (serverRes && serverRes.data && serverRes.data.reports && serverRes.data.reports.length > 0) {
            var serverList = serverRes.data.reports.map(function(r) {
              return {
                id: r.id,
                userName: r.userName || '',
                birthDate: r.birthDate || '',
                birthTime: '',
                birthLocation: r.birthLocation || '',
                birthLat: r.lat || null,
                birthLng: r.lng || null,
                reportLang: r.language || 'en',
                userGender: null,
                userReligion: null,
                sectionCount: r.sectionCount || 0,
                savedAt: r.createdAt || '',
                isServerReport: true,
              };
            });
            setSavedReports(serverList);
            setServerReportsLoaded(true);
            if (__DEV__) console.log('[Report] Loaded ' + serverList.length + ' reports from server');
            return;
          }
        } catch (e) {
          if (__DEV__) console.warn('[Report] Server reports failed, falling back to local:', e.message);
        }
      }
      // Fallback to AsyncStorage
      try {
        var stored = await AsyncStorage.getItem(REPORTS_CACHE_KEY);
        if (stored) {
          setSavedReports(JSON.parse(stored));
        }
      } catch (e) {
        if (__DEV__) console.warn('Failed to load saved reports:', e);
      }
    })();
  }, [user]);

  // Save a report to cache
  var saveReportToCache = useCallback(async function(reportData) {
    try {
      var entry = {
        id: Date.now().toString(),
        userName: reportData.userName,
        birthDate: reportData.birthDate,
        birthTime: reportData.birthTime,
        birthLocation: reportData.birthLocation,
        birthLat: reportData.birthLat,
        birthLng: reportData.birthLng,
        reportLang: reportData.reportLang,
        userGender: reportData.userGender,
        userReligion: reportData.userReligion,
        report: reportData.report,
        aiReport: reportData.aiReport,
        chartData: reportData.chartData,
        savedAt: new Date().toISOString(),
      };
      var updated = [entry].concat(savedReports).slice(0, MAX_SAVED_REPORTS);
      await AsyncStorage.setItem(REPORTS_CACHE_KEY, JSON.stringify(updated));
      setSavedReports(updated);
    } catch (e) {
      if (__DEV__) console.warn('Failed to save report:', e);
    }
  }, [savedReports]);

  // Delete a saved report (server + local)
  var deleteSavedReport = useCallback(async function(reportId) {
    try {
      // Find entry to check if it's server-side
      var entry = savedReports.find(function(r) { return r.id === reportId; });
      if (entry && entry.isServerReport) {
        try { await api.deleteSavedReport(reportId); } catch (e) {
          if (__DEV__) console.warn('Server delete failed:', e.message);
        }
      }
      var updated = savedReports.filter(function(r) { return r.id !== reportId; });
      await AsyncStorage.setItem(REPORTS_CACHE_KEY, JSON.stringify(updated));
      setSavedReports(updated);
    } catch (e) {
      if (__DEV__) console.warn('Failed to delete report:', e);
    }
  }, [savedReports]);

  // Load a saved report (fetch full content from server if needed)
  var [loadingReport, setLoadingReport] = useState(false);
  var loadSavedReport = useCallback(async function(entry) {
    if (entry.isServerReport) {
      // Fetch full report from server
      setLoadingReport(true);
      setError(null);
      try {
        var res = await api.getSavedReport(entry.id);
        if (res && res.data) {
          var d = res.data;
          setUserName(d.userName || entry.userName || '');
          setBirthDate(d.birthDate || entry.birthDate || '1998-10-09');
          setBirthTime(entry.birthTime || '09:16');
          setBirthLocation(d.birthLocation || entry.birthLocation || 'Colombo');
          setBirthLat(d.lat || entry.birthLat || 6.9271);
          setBirthLng(d.lng || entry.birthLng || 79.8612);
          setReportLang(d.language || entry.reportLang || 'en');
          setUserGender(d.userGender || null);
          setUserReligion(null);
          setReport(null);
          setAiReport({
            narrativeSections: d.narrativeSections || {},
            rashiChart: d.rashiChart || null,
            birthData: d.birthData || null,
          });
          setChartData(null);
          setScreenState('report');
        } else {
          setError(t('failedLoadReport') || 'Failed to load report from server');
        }
      } catch (e) {
        if (__DEV__) console.warn('Failed to load server report:', e.message);
        setError(t('failedLoadReport') || 'Failed to load report');
      } finally {
        setLoadingReport(false);
      }
    } else {
      // Local cached report — load directly
      setUserName(entry.userName || '');
      setBirthDate(entry.birthDate || '1998-10-09');
      setBirthTime(entry.birthTime || '09:16');
      setBirthLocation(entry.birthLocation || 'Colombo');
      setBirthLat(entry.birthLat || 6.9271);
      setBirthLng(entry.birthLng || 79.8612);
      setReportLang(entry.reportLang || 'en');
      setUserGender(entry.userGender || null);
      setUserReligion(entry.userReligion || null);
      setReport(entry.report);
      setAiReport(entry.aiReport);
      setChartData(entry.chartData);
      setError(null);
      setScreenState('report');
    }
  }, [t]);

  // Calculate overview scores for Hero Card (must be at top level, not conditional)
  var overviewScores = useMemo(function() {
    if (!report) return { average: null, map: {}, count: 0 };
    var sections = report.sections || {};
    var scores = [];
    var scoreMap = {};
    SECTION_KEYS.forEach(function(key) {
      var s = extractSectionScore(key, sections[key] || (aiReport?.rawSections || {})[key]);
      if (s != null) {
        scores.push(s);
        scoreMap[key] = s;
      }
    });
    var avg = scores.length > 0 ? Math.round(scores.reduce(function(a, b) { return a + b; }, 0) / scores.length) : null;
    return { average: avg, map: scoreMap, count: scores.length };
  }, [report, aiReport]);

  // Sync report language when app language changes (only on form screen)
  useEffect(function() {
    if (screenState === 'form') {
      setReportLang(language || 'en');
    }
  }, [language, screenState]);

  // ── Core generation function (defined first to avoid stale closures) ──
  var [genProgress, setGenProgress] = useState({ stage: 'starting', sectionsDone: 0, sectionsTotal: 19, currentSection: null, completedSections: [] });
  var progressPollRef = useRef(null);

  var startFullGeneration = async function(dateStr, gender) {
    try {
      setScreenState('loading');
      setLoading(true);
      setGenProgress({ stage: 'starting', sectionsDone: 0, sectionsTotal: 19, currentSection: null, completedSections: [] });
      wasBackgroundedDuringGen.current = false;

      // Generate a reportId for progress tracking
      var reportId = 'rpt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

      // Start polling progress every 2 seconds
      progressPollRef.current = setInterval(async function() {
        try {
          var prog = await api.getReportProgress(reportId);
          if (prog && prog.stage) {
            setGenProgress(prog);
          }
        } catch (e) {
          // Polling failure is non-critical — just skip
        }
      }, 2000);

      // Fire raw report + AI in parallel using allSettled so partial results survive
      var results = await Promise.allSettled([
        api.getFullReport(dateStr, birthLat, birthLng, reportLang),
        api.getAIReport(dateStr, birthLat, birthLng, reportLang, birthLocation, userName || null, gender, userReligion || null, reportId),
      ]);

      // Stop polling
      if (progressPollRef.current) { clearInterval(progressPollRef.current); progressPollRef.current = null; }

      var rawResult = results[0];
      var aiResult = results[1];

      // Check if app was backgrounded — warn user the result may be incomplete
      if (wasBackgroundedDuringGen.current && rawResult.status === 'rejected') {
        setError(reportLang === 'si'
          ? 'ඔබගේ දුරකථනය sleep වුණා. කරුණාකර නැවත උත්සාහ කරන්න.'
          : 'Your phone went to sleep during generation. Please try again.');
        setScreenState('form');
        setLoading(false);
        return;
      }

      // Raw report is essential — if it failed, show error
      if (rawResult.status === 'rejected') {
        var rawErr = rawResult.reason;
        setError((rawErr && rawErr.message) || 'Failed to generate report');
        setScreenState('form');
        setLoading(false);
        return;
      }

      var rawRes = rawResult.value;
      if (!rawRes.data) {
        setError('No report data returned');
        setScreenState('form');
        setLoading(false);
        return;
      }

      setReport(rawRes.data);

      // AI report — this is the actual content users pay for
      var aiData = null;
      if (aiResult.status === 'fulfilled' && aiResult.value && aiResult.value.data) {
        aiData = aiResult.value.data;

        // ── FAIL-SAFE: Validate AI report has actual readable content ──
        // Users pay for this — never show an empty report
        var narrativeSections = aiData.narrativeSections || {};
        var sectionKeys = Object.keys(narrativeSections);
        var sectionsWithContent = sectionKeys.filter(function(k) {
          var nar = narrativeSections[k]?.narrative;
          if (!nar || typeof nar !== 'string') return false;
          // Detect sentinel/placeholder text
          var lower = nar.toLowerCase().trim();
          if (lower === 'unable to generate response' || lower === 'unable to generate' || lower.startsWith('unable to generate')) return false;
          // Must have at least 50 words to be a real section
          return nar.split(/\s+/).length >= 50;
        });

        if (sectionsWithContent.length < 5) {
          // Report is effectively empty — show error so user can retry
          if (__DEV__) console.warn('[Report] AI report has insufficient content: ' + sectionsWithContent.length + ' valid sections out of ' + sectionKeys.length);
          setError(reportLang === 'si'
            ? 'AI වාර්තාව නිසි ලෙස සෑදුනේ නැහැ. කරුණාකර නැවත උත්සාහ කරන්න — ඔබට නැවත ගෙවීමක් අවශ්‍ය නැත.'
            : 'The report did not generate properly. Please try again — you will not be charged again.');
          setAiReport(null);
          setScreenState('form');
          setLoading(false);
          return;
        }

        setAiReport(aiData);
      } else {
        // AI report failed entirely — this is a critical failure for a paid feature
        var aiErrorMsg = aiResult.reason?.message || 'AI generation failed';
        var canRetry = aiResult.reason?.response?.canRetry || false;
        if (__DEV__) console.warn('[Report] AI report failed:', aiErrorMsg);
        setError(reportLang === 'si'
          ? 'AI වාර්තාව සෑදීමට අසමත් විය. කරුණාකර නැවත උත්සාහ කරන්න — ඔබට නැවත ගෙවීමක් අවශ්‍ය නැත.'
          : 'Failed to generate your report. Please try again — you will not be charged again.');
        setAiReport(null);
        setScreenState('form');
        setLoading(false);
        return;
      }
      setScreenState('report');

      // Save to cache
      saveReportToCache({
        userName: userName,
        birthDate: dateStr,
        birthTime: birthTime,
        birthLocation: birthLocation,
        birthLat: birthLat,
        birthLng: birthLng,
        reportLang: reportLang,
        userGender: gender,
        userReligion: userReligion,
        report: rawRes.data,
        aiReport: aiData,
        chartData: chartData,
      });
    } catch (err) {
      if (progressPollRef.current) { clearInterval(progressPollRef.current); progressPollRef.current = null; }
      var msg = err.message || '';
      setError(msg || 'Failed to generate report');
      setScreenState('form');
    } finally {
      if (progressPollRef.current) { clearInterval(progressPollRef.current); progressPollRef.current = null; }
      setLoading(false);
    }
  };

  // User taps Generate → validate → show paywall → pay → generate
  var handleGenerate = async function() {
    if (!userName || !userName.trim()) {
      setError(reportLang === 'si' ? '\u0D9A\u0DBB\u0DD4\u0DAB\u0DCF\u0D9A\u0DBB \u0D94\u0DBA\u0DCF\u0D9C\u0DDA \u0DB1\u0DB8 \u0D87\u0DAD\u0DD4\u0DBD\u0DAD\u0DCA \u0D9A\u0DBB\u0DB1\u0DCA\u0DB1' : 'Please enter your name');
      return;
    }
    if (!userGender) {
      setError(reportLang === 'si' ? '\u0D9A\u0DBB\u0DD4\u0DAB\u0DCF\u0D9A\u0DBB \u0DC3\u0DCA\u0DAD\u0DCA\u200D\u0DBB\u0DD3/\u0DB4\u0DD4\u0DBB\u0DD4\u0DC2 \u0DB7\u0DCF\u0DC0\u0DBA \u0DAD\u0DDD\u0DBB\u0DB1\u0DCA\u0DB1' : 'Please select your gender');
      return;
    }

    // ── Check for pending entitlement (retry after failed generation) ──
    var isRetry = false;
    try {
      var entCheck = await api.checkEntitlement('report', {
        birthDate: birthDate + 'T' + birthTime + ':00',
        lat: birthLat,
        lng: birthLng,
        language: reportLang,
      });
      if (entCheck && entCheck.hasPending) {
        isRetry = true;
        if (__DEV__) console.log('[Report] ♻️ Resuming failed generation — no payment needed (' + entCheck.entitlement.retriesLeft + ' retries left)');
      }
    } catch (entErr) {
      // Non-critical — proceed with normal payment flow
      if (__DEV__) console.warn('[Report] Entitlement check failed (non-critical):', entErr.message);
    }

    // Show paywall only if NOT a retry (pending entitlement = free retry)
    if (!isRetry) {
      // ── Check network connectivity BEFORE showing paywall ──
      if (!isConnected) {
        setError(reportLang === 'si'
          ? 'ඉන්ටනෙට් එක නැහැ. කරුණාකර WiFi හෝ Data එක check කරන්න.'
          : 'No internet connection. Please check your WiFi or mobile data.');
        return;
      }
      var serverOk = await checkServerReachable();
      if (!serverOk) {
        setError(reportLang === 'si'
          ? 'Server එකට connect වෙන්න බැහැ. ටිකක් පස්සේ try කරන්න.'
          : 'Cannot reach the server. Please try again in a moment.');
        return;
      }

      try {
        await showPaywall('report');
      } catch (e) {
        // User cancelled payment — do not generate
        return;
      }
    }

    // Payment succeeded — now generate the report
    try {
      setError(null);
      setReport(null);
      setAiReport(null);
      setChartData(null);

      var dateStr = birthDate + 'T' + birthTime + ':00';

      var chartRes = await api.getBirthChart(dateStr, birthLat, birthLng, reportLang);
      if (chartRes.data) {
        setChartData(chartRes.data);
      } else {
        setError('Failed to read birth chart');
        return;
      }

      startFullGeneration(dateStr, userGender);
    } catch (err) {
      var msg = err.message || 'Error';
      setError(msg);
    }
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

      var logoB64 = await loadLogoBase64();

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
        report: report,
        chartData: chartData,
        sectionKeys: SECTION_KEYS,
        sectionTitles: resolvedTitles,
        t: t,
        logoBase64: logoB64,
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
        // A4 dimensions in points. Explicit dimensions reduce
        // ExpoPrint.printToFileAsync rejections on Android with large HTML.
        var printOpts = { html: html, base64: false, width: 595, height: 842 };
        var result;
        try {
          result = await Print.printToFileAsync(printOpts);
        } catch (printErr) {
          // Fallback: minimal HTML so the user still gets a usable PDF
          if (__DEV__) console.warn('[Report] printToFileAsync failed, retrying with minimal HTML:', printErr && printErr.message);
          var sectionsHtml = '';
          try {
            SECTION_KEYS.forEach(function(k, i) {
              var n = aiReport && aiReport.narrativeSections && aiReport.narrativeSections[k];
              if (!n || !n.narrative) return;
              var title = (resolvedTitles && resolvedTitles[i]) || k;
              var content = String(n.narrative || '').replace(/[<>]/g, '');
              sectionsHtml += '<h2>' + title + '</h2><p>' + content + '</p>';
            });
          } catch (e) { /* ignore — best effort */ }
          var fallback = '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Report</title>'
            + '<style>body{font-family:sans-serif;padding:24px;color:#222;line-height:1.6;}h1{color:#7C3AED;}h2{margin-top:18px;color:#5B21B6;}p{margin:6px 0;}</style>'
            + '</head><body>'
            + '<h1>' + (isSi ? '\u0D9C\u0DCA\u200D\u0DBB\u0DC4\u0DA0\u0DCF\u0DBB \u0DC0\u0DCF\u0DBB\u0DCA\u0DAD\u0DCF\u0DC0' : 'Grahachara Report') + '</h1>'
            + '<p><b>' + (userName || '') + '</b></p>'
            + '<p>' + (birthDate || '') + ' ' + (birthTime || '') + '</p>'
            + sectionsHtml
            + '</body></html>';
          result = await Print.printToFileAsync({ html: fallback, base64: false, width: 595, height: 842 });
        }
        await Sharing.shareAsync(result.uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: fileName });
      }
    } catch (err) {
      Alert.alert(
        isSi ? '\u0DAF\u0DDD\u0DC2\u0DBA\u0D9A\u0DD2' : 'Error',
        isSi ? 'PDF \u0DC3\u0DD0\u0D9A\u0DC3\u0DD3\u0DB8\u0DA7 \u0D85\u0DC3\u0DB8\u0DAD\u0DCA \u0DC0\u0DD2\u0DBA. \u0DB1\u0DD0\u0DC0\u0DAD \u0D8B\u0DAD\u0DCA\u0DC3\u0DC4 \u0D9A\u0DBB\u0DB1\u0DCA\u0DB1.' : 'Failed to generate PDF. Please try again.'
      );
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
    setVisibleSections(isLowEnd ? 8 : 999);
    setExpandedKey(null);
    setScreenState('form');
  };

  // ── FULL SCREEN LOADING ──────────────────────────────────
  if (screenState === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg || '#04030C' }}>
        <View style={s.loadingFull}>
          <CosmicLoader progress={genProgress} userName={userName} language={reportLang} colors={colors} />
        </View>
      </View>
    );
  }

  // ── REPORT VIEW (only after AI is done) ──────────────────
  if (screenState === 'report' && report) {

    // Count total sections with content
    var sectionCount = SECTION_KEYS.filter(function(k) {
      return aiReport?.narrativeSections?.[k]?.narrative;
    }).length;

    // Total word count
    var totalWords = SECTION_KEYS.reduce(function(total, k) {
      var nar = aiReport?.narrativeSections?.[k]?.narrative;
      return total + (nar ? nar.split(/\s+/).length : 0);
    }, 0);
    var totalReadTime = Math.max(1, Math.ceil(totalWords / 200));

    return (
      <DesktopScreenWrapper routeName="report">
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ReadingProgressBar scrollProgress={scrollProgress} sectionCount={SECTION_KEYS.length} currentChapter={currentChapter} reportLang={reportLang} />
        <Animated.ScrollView style={s.flex} contentContainerStyle={[s.content, isDesktop && s.contentDesktop, !isDesktop && { paddingTop: insets.contentTop, paddingBottom: insets.contentBottom }]} showsVerticalScrollIndicator={false}
          removeClippedSubviews={isLowEnd}
          onScroll={function(e) {
            var y = e.nativeEvent.contentOffset.y;
            var h = e.nativeEvent.contentSize.height - e.nativeEvent.layoutMeasurement.height;
            if (h > 0) { scrollProgress.value = Math.min(1, Math.max(0, y / h)); }
            var sectionIdx = Math.floor((y / (h || 1)) * SECTION_KEYS.length) + 1;
            setCurrentChapter(Math.min(SECTION_KEYS.length, Math.max(1, sectionIdx)));
          }}
          scrollEventThrottle={isLowEnd ? 32 : 16}
        >
          <View style={[s.contentInner, isDesktop && s.contentInnerDesktop]}>

          {/* ═══ HERO TITLE ═══ */}
          <Animated.View entering={FadeInDown.delay(50).duration(800)}>
            <View style={s.heroTitleWrap}>
              <Text style={s.heroEmoji}>🌟</Text>
              <Text style={s.title}>{
                reportLang === 'si'
                  ? (userName ? userName + 'ගේ ජීවිත කතාව' : 'ඔයාගේ ජීවිත කතාව')
                  : (userName ? userName + '\'s Life Story' : 'Your Life Story')
              }</Text>
              <Text style={s.subtitle}>{birthLocation} • {birthDate} • {birthTime}</Text>
              <View style={s.heroStatsRow}>
                <View style={s.heroStatChip}>
                  <Ionicons name="document-text-outline" size={12} color="#FF8C00" />
                  <Text style={s.heroStatText}>{sectionCount} {reportLang === 'si' ? 'කොටස්' : 'chapters'}</Text>
                </View>
                <View style={s.heroStatChip}>
                  <Ionicons name="time-outline" size={12} color="#FF8C00" />
                  <Text style={s.heroStatText}>{totalReadTime} {reportLang === 'si' ? 'විනාඩි' : 'min read'}</Text>
                </View>
                <View style={s.heroStatChip}>
                  <Ionicons name="text-outline" size={12} color="#FF8C00" />
                  <Text style={s.heroStatText}>{totalWords.toLocaleString()} {reportLang === 'si' ? 'වචන' : 'words'}</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* ═══ ACTION BUTTONS ═══ */}
          <Animated.View entering={FadeIn.delay(100).duration(400)}>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <SpringPressable style={[s.newReportBtn, { flex: 1, marginBottom: 0 }]} onPress={handleNewReport} haptic="medium">
                <Ionicons name="refresh" size={16} color="#FF8C00" style={{ marginRight: 6 }} />
                <Text style={s.newReportText}>{reportLang === 'si' ? 'අලුත් කතාවක්' : 'New Report'}</Text>
              </SpringPressable>
              <SpringPressable style={[s.newReportBtn, { flex: 1, marginBottom: 0, borderColor: 'rgba(255,184,0,0.35)', backgroundColor: 'rgba(255,184,0,0.08)' }]} onPress={handleDownloadPDF} haptic="medium">
                <Ionicons name="download-outline" size={16} color="#FFB800" style={{ marginRight: 6 }} />
                <Text style={[s.newReportText, { color: '#FFB800' }]}>{reportLang === 'si' ? 'PDF බාගන්න' : 'Download PDF'}</Text>
              </SpringPressable>
            </View>
          </Animated.View>

          {/* ═══ HERO LIFE SCORE CARD ═══ */}
          {overviewScores.average != null && (
            <Animated.View entering={FadeInDown.delay(150).duration(800).springify()}>
              <AuraBox style={{ borderColor: 'rgba(255,184,0,0.25)', padding: 0 }}>
                <LinearGradient
                  colors={['rgba(255,184,0,0.12)', 'rgba(255,140,0,0.04)', 'transparent']}
                  style={{ padding: 20 }}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                >
                  {/* Main score */}
                  <View style={s.heroScoreCenter}>
                    <View style={s.heroScoreRingOuter}>
                      <LinearGradient
                        colors={['rgba(255,184,0,0.20)', 'rgba(255,140,0,0.08)']}
                        style={s.heroScoreRingInner}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      >
                        <Animated.Text entering={ZoomIn.delay(400).duration(600)} style={s.heroScoreNum}>
                          {overviewScores.average}
                        </Animated.Text>
                        <Text style={s.heroScoreLabel}>{reportLang === 'si' ? 'සමස්ත ලකුණු' : 'LIFE SCORE'}</Text>
                      </LinearGradient>
                    </View>
                    <Text style={s.heroScoreDesc}>
                      {overviewScores.average >= 75
                        ? (reportLang === 'si' ? '🔥 ඔයාගේ උපන් සිතියම අතිශයින්ම ශක්තිමත්!' : '🔥 Your birth chart is exceptionally powerful!')
                        : overviewScores.average >= 55
                        ? (reportLang === 'si' ? '✨ ඔයාගේ ජන්ම පත්‍රයේ හොඳ ශක්තියක් තිබෙනවා' : '✨ Your chart carries strong positive energy')
                        : overviewScores.average >= 35
                        ? (reportLang === 'si' ? '💫 ඔයාගේ ජීවිතයේ විශේෂ මිශ්‍ර ශක්තියක්' : '💫 Your life has a unique mix of energies')
                        : (reportLang === 'si' ? '⚡ ඔයාගේ සිතියමේ තීව්‍ර ශක්තින් තිබෙනවා' : '⚡ Your chart has intense transformative energy')
                      }
                    </Text>
                  </View>

                  {/* Quick score bars */}
                  <View style={s.heroScoreBars}>
                    {[
                      { key: 'career', label: reportLang === 'si' ? 'රැකියාව' : 'Career', icon: '💼' },
                      { key: 'marriage', label: reportLang === 'si' ? 'ආදරය' : 'Love', icon: '💍' },
                      { key: 'health', label: reportLang === 'si' ? 'සෞඛ්‍යය' : 'Health', icon: '❤️' },
                      { key: 'financial', label: reportLang === 'si' ? 'මුදල්' : 'Wealth', icon: '💰' },
                      { key: 'luck', label: reportLang === 'si' ? 'වාසනාව' : 'Luck', icon: '🍀' },
                    ].map(function(item, i) {
                      var val = overviewScores.map[item.key];
                      if (val == null) return null;
                      return (
                        <View key={item.key} style={s.heroBarItem}>
                          <Text style={s.heroBarIcon}>{item.icon}</Text>
                          <View style={s.heroBarTrack}>
                            <Animated.View entering={FadeInRight.delay(600 + i * 150).duration(800)} style={[s.heroBarFill, { width: val + '%', backgroundColor: val >= 70 ? '#10B981' : val >= 45 ? '#FBBF24' : '#EF4444' }]} />
                          </View>
                          <Text style={[s.heroBarVal, { color: val >= 70 ? '#10B981' : val >= 45 ? '#FBBF24' : '#EF4444' }]}>{val}</Text>
                        </View>
                      );
                    })}
                  </View>
                </LinearGradient>
              </AuraBox>
            </Animated.View>
          )}

          {/* ═══ BIRTH SUMMARY ═══ */}
          {report.birthData && (
            <Animated.View entering={FadeInDown.delay(200).duration(600)}>
              <AuraBox style={{ borderColor: 'rgba(255,184,0,0.15)' }}>
                <LinearGradient
                  colors={['rgba(255,184,0,0.06)', 'transparent']}
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

          {/* ═══ BIRTH CHART ═══ */}
          {chartData && chartData.rashiChart && (
            <Animated.View entering={FadeInDown.delay(250).duration(700)}>
              <AuraBox style={{ borderColor: 'rgba(255,140,0,0.2)' }}>
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

          {/* ═══ COSMIC DNA STRIP ═══ */}
          <CosmicDnaStrip scoreMap={overviewScores.map} isSi={reportLang === 'si'} onOrbPress={function() {}} />

          {/* ═══ SECTION DIVIDER ═══ */}
          <Animated.View entering={FadeInDown.delay(300).duration(600)}>
            <View style={s.sectionDivider}>
              <View style={s.sectionDividerLine} />
              <Text style={s.sectionDividerText}>{reportLang === 'si' ? '📖 විස්තරාත්මක විශ්ලේෂණය' : '📖 Detailed Analysis'}</Text>
              <View style={s.sectionDividerLine} />
            </View>
          </Animated.View>

          {/* ═══ AI NARRATIVE SECTIONS — Dopamine Edition ═══ */}
          {aiReport && aiReport.narrativeSections && (
            SECTION_KEYS.slice(0, visibleSections).map(function(key, index) {
              var aiNarrative = aiReport.narrativeSections[key] || null;
              if (!aiNarrative || !aiNarrative.narrative) return null;
              var rawDataKey = key === 'marriedLife' ? 'marriage' : key;
              var rawData = (report.sections || {})[rawDataKey] || (aiReport.rawSections || {})[rawDataKey] || null;
              var EntryAnim = isLowEnd ? View : Animated.View;
              var entryProps = isLowEnd ? {} : { entering: FadeInDown.delay(100 + index * 80).duration(600).springify() };
              return <React.Fragment key={key}>
                {index > 0 && <ConstellationDivider index={index} />}
                <SectionCard sectionKey={key} data={null} index={index} t={t} aiNarrative={aiNarrative} reportLang={reportLang} rawData={rawData} isLowEnd={isLowEnd} expandedKey={expandedKey} setExpandedKey={setExpandedKey} />
              </React.Fragment>;
            })
          )}

          {/* ═══ LOAD MORE SECTIONS (low-end lazy load) ═══ */}
          {isLowEnd && aiReport && aiReport.narrativeSections && visibleSections < SECTION_KEYS.length && (
            <SpringPressable
              style={{ marginTop: 16, marginBottom: 8, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,140,0,0.3)', backgroundColor: 'rgba(255,140,0,0.06)', alignItems: 'center' }}
              onPress={function() { setVisibleSections(function(prev) { return Math.min(prev + 6, SECTION_KEYS.length); }); }}
              haptic="light"
            >
              <Text style={{ color: '#FF8C00', fontSize: 14, fontWeight: '700' }}>
                {reportLang === 'si' ? 'තවත් කොටස් පූරණය කරන්න (' + (SECTION_KEYS.length - visibleSections) + ')' : 'Load More Sections (' + (SECTION_KEYS.length - visibleSections) + ')'}
              </Text>
            </SpringPressable>
          )}

          {/* ═══ FALLBACK: No AI content rendered — defensive check ═══ */}
          {(!aiReport || !aiReport.narrativeSections || sectionCount === 0) && (
            <Animated.View entering={FadeInDown.delay(300).duration(600)}>
              <AuraBox style={{ borderColor: 'rgba(239,68,68,0.3)', alignItems: 'center', paddingVertical: 24 }}>
                <Text style={{ fontSize: 32 }}>⚠️</Text>
                <Text style={{ color: '#FCA5A5', fontSize: 16, fontWeight: '700', marginTop: 8, textAlign: 'center' }}>
                  {reportLang === 'si' ? 'වාර්තා අන්තර්ගතය නිසි ලෙස පූරණය වුණේ නැහැ' : 'Report content did not load properly'}
                </Text>
                <Text style={{ color: 'rgba(252,165,165,0.6)', fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 16 }}>
                  {reportLang === 'si'
                    ? 'කරුණාකර නැවත උත්සාහ කරන්න. ඔබට නැවත ගෙවීමක් අවශ්‍ය නැත.'
                    : 'Please try again. You will not be charged again.'}
                </Text>
                <SpringPressable style={[s.newReportBtn, { marginTop: 16, borderColor: 'rgba(239,68,68,0.4)' }]} onPress={handleNewReport} haptic="medium">
                  <Ionicons name="refresh" size={16} color="#FCA5A5" style={{ marginRight: 6 }} />
                  <Text style={[s.newReportText, { color: '#FCA5A5' }]}>
                    {reportLang === 'si' ? 'නැවත උත්සාහ කරන්න' : 'Try Again'}
                  </Text>
                </SpringPressable>
              </AuraBox>
            </Animated.View>
          )}

          {/* ═══ END CARD ═══ */}
          <Animated.View entering={FadeInDown.delay(400).duration(600)}>
            <AuraBox style={{ borderColor: 'rgba(255,184,0,0.15)', alignItems: 'center', paddingVertical: 24 }}>
              <Text style={{ fontSize: 32 }}>✨</Text>
              <Text style={{ color: '#FFE8B0', fontSize: 16, fontWeight: '800', marginTop: 8, textAlign: 'center' }}>
                {reportLang === 'si' ? 'ඔයාගේ ජීවිත කතාව සම්පූර්ණයි' : 'Your Life Story is Complete'}
              </Text>
              <Text style={{ color: 'rgba(255,214,102,0.45)', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                {reportLang === 'si' ? 'වෙනත් අයෙකුගේ කතාවක් අනාවරණය කරන්න' : 'Unlock another person\'s story'}
              </Text>
              <SpringPressable style={[s.newReportBtn, { marginTop: 16, paddingHorizontal: 24 }]} onPress={handleNewReport} haptic="heavy">
                <Ionicons name="sparkles" size={16} color="#FF8C00" style={{ marginRight: 6 }} />
                <Text style={s.newReportText}>{reportLang === 'si' ? 'අලුත් වාර්තාවක් සාදන්න' : 'Generate Another Report'}</Text>
              </SpringPressable>
            </AuraBox>
          </Animated.View>

          <View style={{ height: isDesktop ? 32 : 120 }} />
          </View>
        </Animated.ScrollView>
      </View>
      </DesktopScreenWrapper>
    );
  }

  // ── INPUT FORM (default view) ────────────────────────────
  return (
    <DesktopScreenWrapper routeName="report">
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView style={s.flex} contentContainerStyle={[s.content, isDesktop && s.contentDesktop, !isDesktop && { paddingTop: insets.contentTop, paddingBottom: insets.contentBottom }]} showsVerticalScrollIndicator={false}>
        <View style={[s.contentInner, isDesktop && s.contentInnerDesktop]}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(800)}>
          <Text style={[s.title, { color: sc.sectionTitle }]}>{t('reportTitle')}</Text>
          <Text style={[s.subtitle, { color: sc.labelColor }]}>{t('reportSubtitle')}</Text>
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

            {/* Birth Date and Time */}
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
            <CitySearchPicker
              selectedCity={selectedCity}
              onSelect={handleCitySelect}
              lang={reportLang}
              accentColor="#FF8C00"
              maxHeight={160}
              compact
            />

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
                colors={['#FF8C00', '#FF6D00', '#E65100']}
                style={s.generateGrad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <LinearGradient colors={['rgba(255,255,255,0.18)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', borderTopLeftRadius: 14, borderTopRightRadius: 14 }} />
                <Ionicons name="sparkles" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={s.generateText}>{t('reportGenerate')}</Text>
              </LinearGradient>
            </SpringPressable>
          </AuraBox>
        </Animated.View>

        {/* Saved Reports */}
        {savedReports.length > 0 && (
          <Animated.View entering={FadeInDown.delay(250).duration(800)}>
            <AuraBox style={{ marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="document-text-outline" size={18} color="#FF8C00" style={{ marginRight: 8 }} />
                <Text style={{ color: '#D4B06A', fontSize: 14, fontWeight: '700', flex: 1 }}>
                  {reportLang === 'si' ? 'සුරකින ලද වාර්තා' : 'Saved Reports'}
                </Text>
                <Text style={{ color: 'rgba(255,214,102,0.35)', fontSize: 11 }}>
                  {savedReports.length + '/' + MAX_SAVED_REPORTS}
                </Text>
              </View>
              {savedReports.map(function(entry, idx) {
                var savedDate = entry.savedAt ? new Date(entry.savedAt) : null;
                var timeAgo = '';
                if (savedDate) {
                  var diffMs = Date.now() - savedDate.getTime();
                  var diffMin = Math.floor(diffMs / 60000);
                  var diffHr = Math.floor(diffMin / 60);
                  var diffDay = Math.floor(diffHr / 24);
                  if (diffMin < 1) timeAgo = reportLang === 'si' ? 'දැන්' : 'just now';
                  else if (diffMin < 60) timeAgo = diffMin + (reportLang === 'si' ? ' මිනි. පෙර' : 'm ago');
                  else if (diffHr < 24) timeAgo = diffHr + (reportLang === 'si' ? ' පැ. පෙර' : 'h ago');
                  else timeAgo = diffDay + (reportLang === 'si' ? ' දින පෙර' : 'd ago');
                }
                return (
                  <TouchableOpacity
                    key={entry.id}
                    onPress={function() { loadSavedReport(entry); }}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12,
                      backgroundColor: 'rgba(255,140,0,0.04)', borderRadius: 12, marginBottom: 8,
                      borderWidth: 1, borderColor: 'rgba(255,140,0,0.1)',
                    }}
                  >
                    <View style={{
                      width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,140,0,0.1)',
                      alignItems: 'center', justifyContent: 'center', marginRight: 12,
                    }}>
                      <Text style={{ fontSize: 18 }}>📜</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#FFE8B0', fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
                        {entry.userName || (reportLang === 'si' ? 'නම නැත' : 'No Name')}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <Text style={{ color: 'rgba(255,214,102,0.45)', fontSize: 11 }}>
                          {entry.birthDate || ''}
                        </Text>
                        <Text style={{ color: 'rgba(255,214,102,0.2)', fontSize: 11 }}>•</Text>
                        <Text style={{ color: 'rgba(255,214,102,0.45)', fontSize: 11 }}>
                          {entry.birthLocation || ''}
                        </Text>
                        <Text style={{ color: 'rgba(255,214,102,0.2)', fontSize: 11 }}>•</Text>
                        <Text style={{ color: 'rgba(255,214,102,0.35)', fontSize: 10 }}>
                          {entry.reportLang === 'si' ? '🇱🇰' : '🇬🇧'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                      <Text style={{ color: 'rgba(255,214,102,0.3)', fontSize: 10 }}>{timeAgo}</Text>
                      <TouchableOpacity
                        onPress={function(e) {
                          e.stopPropagation && e.stopPropagation();
                          if (Platform.OS === 'web') {
                            if (confirm(reportLang === 'si' ? 'මෙම වාර්තාව මකන්නද?' : 'Delete this report?')) {
                              deleteSavedReport(entry.id);
                            }
                          } else {
                            Alert.alert(
                              reportLang === 'si' ? 'මකන්න' : 'Delete',
                              reportLang === 'si' ? 'මෙම වාර්තාව මකන්නද?' : 'Delete this report?',
                              [
                                { text: reportLang === 'si' ? 'නැහැ' : 'Cancel', style: 'cancel' },
                                { text: reportLang === 'si' ? 'ඔව්' : 'Delete', style: 'destructive', onPress: function() { deleteSavedReport(entry.id); } },
                              ]
                            );
                          }
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={{ marginTop: 4, padding: 4 }}
                      >
                        <Ionicons name="trash-outline" size={14} color="rgba(239,68,68,0.5)" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </AuraBox>
          </Animated.View>
        )}

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
    </View>
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

  // Hero title area
  heroTitleWrap: { alignItems: 'center', marginBottom: 16 },
  heroEmoji: { fontSize: 36, marginBottom: 6 },
  title: { fontSize: 24, fontWeight: '900', color: '#FFE8B0', textAlign: 'center', letterSpacing: 0.3, ...textShadow('rgba(255,184,0,0.25)', { width: 0, height: 2 }, 8) },
  subtitle: { fontSize: 12, color: 'rgba(255,214,102,0.45)', textAlign: 'center', marginTop: 4, marginBottom: 8 },
  heroStatsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  heroStatChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(255,140,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,140,0,0.15)' },
  heroStatText: { fontSize: 10, color: 'rgba(255,214,102,0.55)', fontWeight: '600' },

  // Hero Score Card
  heroScoreCenter: { alignItems: 'center', marginBottom: 16 },
  heroScoreRingOuter: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: 'rgba(255,184,0,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 10, ...boxShadow('#FFB800', { width: 0, height: 0 }, 0.3, 20) },
  heroScoreRingInner: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  heroScoreNum: { fontSize: 32, fontWeight: '900', color: '#FFB800', ...textShadow('rgba(255,184,0,0.4)', { width: 0, height: 2 }, 10) },
  heroScoreLabel: { fontSize: 8, fontWeight: '800', color: 'rgba(255,214,102,0.45)', letterSpacing: 1.5, marginTop: -2 },
  heroScoreDesc: { color: 'rgba(255,214,102,0.65)', fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 18 },
  heroScoreBars: { marginTop: 4 },
  heroBarItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  heroBarIcon: { fontSize: 14, width: 22, textAlign: 'center' },
  heroBarTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  heroBarFill: { height: '100%', borderRadius: 3 },
  heroBarVal: { fontSize: 12, fontWeight: '800', width: 28, textAlign: 'right' },

  // Section divider
  sectionDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 12 },
  sectionDividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,184,0,0.12)' },
  sectionDividerText: { fontSize: 12, color: 'rgba(255,214,102,0.45)', fontWeight: '700' },

  // Form styles
  inputLabel: { color: '#D4B06A', fontSize: 14, fontWeight: '700', marginBottom: 12 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  inputGroup: { flex: 1 },
  inputHint: { color: 'rgba(255,184,0,0.45)', fontSize: 10, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    backgroundColor: 'rgba(8,20,12,0.65)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: '#FFE8B0', fontSize: 15, fontWeight: '600', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  inputError: { borderColor: 'rgba(239,68,68,0.5)' },
  generateBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4, ...boxShadow('#FF8C00', { width: 0, height: 4 }, 0.7, 18), elevation: 0 },
  generateGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15 },
  generateText: { color: '#FFF1D0', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  errorText: { color: '#F87171', fontSize: 13, flex: 1 },
  aiProgressText: { color: '#FF8C00', fontSize: 14, fontWeight: '700' },
  aiProgressSub: { color: 'rgba(255,214,102,0.40)', fontSize: 11, marginTop: 4 },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 16, marginTop: 6 },
  genderBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(8,20,12,0.4)' },
  genderBtnMaleActive: { borderColor: 'rgba(96,165,250,0.6)', backgroundColor: 'rgba(96,165,250,0.12)' },
  genderBtnFemaleActive: { borderColor: 'rgba(244,114,182,0.6)', backgroundColor: 'rgba(244,114,182,0.12)' },
  genderIcon: { fontSize: 22 },
  genderText: { color: 'rgba(255,214,102,0.40)', fontSize: 15, fontWeight: '700' },
  genderTextActive: { color: '#FFF1D0' },
  langRow: { flexDirection: 'row', gap: 10, marginBottom: 16, marginTop: 6 },
  langBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(8,20,12,0.4)' },
  langBtnActive: { borderColor: 'rgba(255,140,0,0.6)', backgroundColor: 'rgba(255,140,0,0.15)' },
  langFlag: { fontSize: 20 },
  langText: { color: 'rgba(255,214,102,0.40)', fontSize: 14, fontWeight: '700' },
  langTextActive: { color: '#FF8C00' },
  locationRow: { marginBottom: 16, marginTop: 4 },
  locationScroll: { flexGrow: 0 },
  locationChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(8,20,12,0.4)', marginRight: 8 },
  locationChipActive: { borderColor: 'rgba(255,140,0,0.6)', backgroundColor: 'rgba(255,140,0,0.15)' },
  locationChipText: { color: 'rgba(255,214,102,0.40)', fontSize: 12, fontWeight: '700' },
  locationChipTextActive: { color: '#FF8C00' },
  newReportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginBottom: 12, backgroundColor: 'rgba(255,140,0,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,140,0,0.25)' },
  newReportText: { color: '#FF8C00', fontSize: 13, fontWeight: '700' },
  birthHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  birthIconBg: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,184,0,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  birthLagna: { color: '#FFB800', fontSize: 20, fontWeight: '900' },
  birthSinhala: { color: 'rgba(255,214,102,0.50)', fontSize: 12, marginTop: 2 },
  birthSub: { color: '#64748B', fontSize: 11, marginTop: 2 },
  panchangaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  panchangaItem: { alignItems: 'center', flex: 1 },
  panchangaLabel: { color: '#475569', fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  panchangaValue: { color: '#D4B06A', fontSize: 12, fontWeight: '700', marginTop: 2 },
  chartHeader: { alignItems: 'center', marginBottom: 12 },
  chartTitle: { color: '#FFE8B0', fontSize: 16, fontWeight: '800' },
  chartSub: { color: '#64748B', fontSize: 11, marginTop: 4 },
});
