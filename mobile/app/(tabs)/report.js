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
  StyleSheet, Platform, Alert, Dimensions, AppState, KeyboardAvoidingView,
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
import useReducedMotion from '../../hooks/useReducedMotion';
import { CosmicBackground } from '../../components/CosmicBackground';
import ReportLoadingScreen from '../../components/ReportLoadingScreen';
import { checkServerReachable } from '../../services/api';
var REPORTS_CACHE_KEY = '@grahachara_saved_reports';
var MAX_SAVED_REPORTS = 20;

function sanitizeSavedReportEntry(entry) {
  if (!entry) return null;
  return {
    id: entry.id || entry.serverReportId || Date.now().toString(),
    serverReportId: entry.serverReportId || (entry.isServerReport ? entry.id : null),
    userName: entry.userName || '',
    birthDate: entry.birthDate || '',
    birthTime: entry.birthTime || '',
    birthLocation: entry.birthLocation || '',
    birthLat: entry.birthLat || null,
    birthLng: entry.birthLng || null,
    reportLang: entry.reportLang || 'en',
    userGender: entry.userGender || null,
    userReligion: entry.userReligion || null,
    sectionCount: entry.sectionCount || 0,
    savedAt: entry.savedAt || new Date().toISOString(),
    isServerReport: !!entry.isServerReport || !!entry.serverReportId,
    contentCached: false,
  };
}

function sanitizeSavedReportList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(sanitizeSavedReportEntry).filter(Boolean).slice(0, MAX_SAVED_REPORTS);
}

function mapServerReportToSavedEntry(r) {
  return {
    id: r.id,
    userName: r.userName || '',
    birthDate: extractDateOnly(r.birthDate) || '',
    birthTime: extractTimeFromISO(r.birthDate) || '',
    birthLocation: r.birthLocation || '',
    birthLat: r.lat || null,
    birthLng: r.lng || null,
    reportLang: r.language || 'en',
    userGender: null,
    userReligion: null,
    sectionCount: r.sectionCount || 0,
    savedAt: r.createdAt || '',
    contentCached: false,
    isServerReport: true,
  };
}

function mapServerReportsToSavedEntries(reports) {
  if (!Array.isArray(reports)) return [];
  return reports.map(mapServerReportToSavedEntry);
}

function reportMatchesGenerationInput(r, dateStr, lat, lng, reportLang) {
  if (!r || !dateStr) return false;
  var reportDate = String(r.birthDate || '');
  var requestedDate = String(dateStr || '');
  var sameDateTime = reportDate === requestedDate || (
    extractDateOnly(reportDate) === extractDateOnly(requestedDate) &&
    extractTimeFromISO(reportDate) === extractTimeFromISO(requestedDate)
  );
  if (!sameDateTime) return false;
  if (reportLang && r.language && r.language !== reportLang) return false;
  var reportLat = Number(r.lat);
  var reportLng = Number(r.lng);
  var targetLat = Number(lat);
  var targetLng = Number(lng);
  if (Number.isFinite(reportLat) && Number.isFinite(targetLat) && Math.abs(reportLat - targetLat) > 0.01) return false;
  if (Number.isFinite(reportLng) && Number.isFinite(targetLng) && Math.abs(reportLng - targetLng) > 0.01) return false;
  return true;
}

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
// Date/time formatting helpers
// ──────────────────────────────────────────
var MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var MONTH_NAMES_SI = ['ජන','පෙබ','මාර්','අප්‍රේ','මැයි','ජූනි','ජූලි','අගෝ','සැප්','ඔක්','නොවැ','දෙසැ'];

// ── Safe date/time extraction from ISO or mixed formats ──
// Extracts just the YYYY-MM-DD portion from an ISO datetime or date string
function extractDateOnly(str) {
  if (!str) return '';
  var s = String(str);
  var m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s;
}

// Extracts just the HH:MM portion from an ISO datetime string like "1998-10-09T09:16:00"
function extractTimeFromISO(str) {
  if (!str) return '';
  var s = String(str);
  var m = s.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : '';
}

// Format a birthDate string (ISO or YYYY-MM-DD) to human-friendly "09 Oct 1998"
function formatBirthDateDisplay(dateStr, lang) {
  if (!dateStr) return '';
  var str = String(dateStr);
  var m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return str;
  var year = m[1];
  var month = parseInt(m[2], 10);
  var day = m[3];
  var monthName = lang === 'si' ? (MONTH_NAMES_SI[month - 1] || m[2]) : (MONTH_NAMES[month - 1] || m[2]);
  return day + ' ' + monthName + ' ' + year;
}

// Format a birthTime string (HH:MM or from ISO) to "9:16 AM"
function formatBirthTimeDisplay(timeStr) {
  if (!timeStr) return '';
  var str = String(timeStr);
  // Extract HH:MM from ISO like "1998-10-09T09:16:00" or plain "09:16"
  var tm = str.match(/T?(\d{2}):(\d{2})/);
  if (!tm) return str;
  var h = parseInt(tm[1], 10);
  var mm = tm[2];
  var ampm = h >= 12 ? 'PM' : 'AM';
  var h12 = h % 12 || 12;
  return h12 + ':' + mm + ' ' + ampm;
}

// ──────────────────────────────────────────
// Glass box wrapper
// ──────────────────────────────────────────
function AuraBox({ children, style, variant }) {
  var isReading = variant === 'reading';
  var boxColors = isReading
    ? ['rgba(8, 10, 18, 0.96)', 'rgba(18, 12, 20, 0.98)', 'rgba(7, 6, 13, 0.98)']
    : ['rgba(20, 12, 50, 0.55)', 'rgba(10, 6, 28, 0.65)'];
  return (
    <View style={[gs.box, style]}>
      <LinearGradient
        colors={boxColors}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      <View style={[gs.innerGlow, isReading && gs.readingGlow, { pointerEvents: 'none' }]} />
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
  readingGlow: {
    borderColor: 'rgba(255,236,190,0.08)',
    backgroundColor: 'rgba(255,248,234,0.015)',
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

function getBirthFocusValue(nakshatra, reportLang) {
  var name = '';
  if (typeof nakshatra === 'string') name = nakshatra;
  else if (nakshatra) name = nakshatra.english || nakshatra.name || '';
  var focusMap = {
    Ashwini: ['Quick Recovery', 'ඉක්මන් යථා තත්ත්වය'], Bharani: ['Patient Responsibility', 'ඉවසීමෙන් වගකීම'],
    Krittika: ['Clear Decisions', 'පැහැදිලි තීරණ'], Rohini: ['Comfort & Growth', 'සැනසීම හා වර්ධනය'],
    Mrigashira: ['Curious Search', 'සොයාබැලීමේ අවධානය'], Ardra: ['Emotional Reset', 'හැඟීම් නැවත සැකසුම'],
    Punarvasu: ['Renewed Hope', 'නව බලාපොරොත්තුව'], Pushya: ['Nurture & Support', 'පෝෂණය හා සහාය'],
    Ashlesha: ['Careful Boundaries', 'සැලකිලිමත් සීමා'], Magha: ['Dignified Leadership', 'ගෞරවවත් නායකත්වය'],
    'Purva Phalguni': ['Warm Connection', 'උණුසුම් සබඳතා'], 'Uttara Phalguni': ['Keep Commitments', 'කැපවීම් රකින්න'],
    Hasta: ['Hands-On Progress', 'ප්‍රායෝගික ප්‍රගතිය'], Chitra: ['Refine & Create', 'ඔපදමා නිර්මාණය'],
    Swati: ['Flexible Movement', 'නම්‍යශීලී ගමන'], Vishakha: ['Focused Ambition', 'අරමුණු සහිත උත්සාහය'],
    Anuradha: ['Loyal Teamwork', 'විශ්වාසවන්ත සහයෝගය'], Jyeshtha: ['Mature Responsibility', 'පරිණත වගකීම'],
    Mula: ['Root-Cause Clarity', 'මූල හේතු පැහැදිලි කිරීම'], 'Purva Ashadha': ['Confident Push', 'විශ්වාසයෙන් ඉදිරියට'],
    'Uttara Ashadha': ['Long-Term Strength', 'දිගුකාලීන ශක්තිය'], Shravana: ['Listen & Learn', 'අසා ඉගෙනගන්න'],
    Dhanishtha: ['Shared Rhythm', 'එකට රටාව'], Shatabhisha: ['Healing Space', 'සුවය ලබන ඉඩ'],
    'Purva Bhadrapada': ['Serious Reflection', 'ගැඹුරු සිතා බැලීම'], 'Uttara Bhadrapada': ['Calm Endurance', 'සන්සුන් ඉවසීම'],
    Revati: ['Complete With Care', 'සැලකිල්ලෙන් අවසන් කිරීම'],
  };
  var fallback = reportLang === 'si' ? 'පුද්ගලික අවධානය' : 'Personal Focus';
  var selected = focusMap[name];
  return selected ? (reportLang === 'si' ? selected[1] : selected[0]) : fallback;
}

function getFriendlyTemperamentValue(type, reportLang) {
  var key = String(type || '').toLowerCase();
  if (key.indexOf('deva') !== -1) return reportLang === 'si' ? 'මෘදු සහ සහායක' : 'Gentle & Supportive';
  if (key.indexOf('manush') !== -1 || key.indexOf('human') !== -1) return reportLang === 'si' ? 'ප්‍රායෝගික සහ සමාජීය' : 'Practical & Social';
  if (key.indexOf('rak') !== -1) return reportLang === 'si' ? 'තීව්‍ර සහ ස්වාධීන' : 'Intense & Independent';
  return reportLang === 'si' ? 'පුද්ගලික ස්වභාවය' : 'Personal Style';
}

function getFriendlyEnergyValue(type, reportLang) {
  var key = String(type || '').toLowerCase();
  if (key.indexOf('adi') !== -1 || key.indexOf('aadi') !== -1 || key.indexOf('vata') !== -1) return reportLang === 'si' ? 'වේගවත් ජීව රටාව' : 'Active Life Rhythm';
  if (key.indexOf('madh') !== -1 || key.indexOf('pitta') !== -1) return reportLang === 'si' ? 'සමතුලිත ජීව රටාව' : 'Balanced Life Rhythm';
  if (key.indexOf('ant') !== -1 || key.indexOf('kapha') !== -1) return reportLang === 'si' ? 'ස්ථිර ජීව රටාව' : 'Steady Life Rhythm';
  return reportLang === 'si' ? 'පුද්ගලික ජීව රටාව' : 'Personal Life Rhythm';
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
      if (rawData.nadiChildren?.strength) stats.push({ label: isSi ? 'පවුල් ගලායෑම' : 'Family Flow', value: rawData.nadiChildren.strength, icon: '🔮' });
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

        <AuraBox variant={expanded ? 'reading' : 'default'} style={[sc.cardBox, expanded && sc.cardBoxExpanded]}>
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
                <MarkdownText variant="report">{aiNarrative.narrative}</MarkdownText>
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

function formatReportTimeAgo(savedAt, reportLang) {
  if (!savedAt) return '';
  var savedDate = new Date(savedAt);
  var savedMs = savedDate.getTime();
  if (!Number.isFinite(savedMs)) return '';
  var diffMs = Date.now() - savedMs;
  var diffMin = Math.max(0, Math.floor(diffMs / 60000));
  var diffHr = Math.floor(diffMin / 60);
  var diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return reportLang === 'si' ? 'දැන්' : 'just now';
  if (diffMin < 60) return diffMin + (reportLang === 'si' ? ' මිනි. පෙර' : 'm ago');
  if (diffHr < 24) return diffHr + (reportLang === 'si' ? ' පැ. පෙර' : 'h ago');
  return diffDay + (reportLang === 'si' ? ' දින පෙර' : 'd ago');
}

function GeneratedReportsPanel({ displayReports, reportsLoading, reportsLoadError, reportLang, loadSavedReport, deleteSavedReport, loadingReport }) {
  var isSi = reportLang === 'si';
  var hasReports = Array.isArray(displayReports) && displayReports.length > 0;

  return (
    <Animated.View entering={FadeInDown.delay(180).duration(700)}>
      <AuraBox style={s.generatedPanel}>
        <View style={s.generatedHeader}>
          <View style={s.generatedIconBox}>
            <Ionicons name="library-outline" size={18} color="#F6C66F" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.generatedTitle}>{isSi ? 'සාදන ලද වාර්තා' : 'Generated Reports'}</Text>
            <Text style={s.generatedSubtitle}>
              {hasReports
                ? (isSi ? 'ඕනෑම පැරණි වාර්තාවක් මෙතනින් විවෘත කරන්න' : 'Open any report you already generated')
                : (isSi ? 'ඔයාගේ වාර්තා මෙතන පෙන්වනු ලැබේ' : 'Your generated reports will appear here')}
            </Text>
          </View>
          <View style={s.generatedCountPill}>
            <Text style={s.generatedCountText}>{reportsLoading ? '...' : String(displayReports.length)}</Text>
          </View>
        </View>

        {reportsLoading && !hasReports && (
          <View style={s.generatedStateBox}>
            <Ionicons name="sync-outline" size={20} color="rgba(246,198,111,0.75)" />
            <Text style={s.generatedStateText}>{isSi ? 'වාර්තා ලැයිස්තුව පූරණය වෙමින්...' : 'Loading your report list...'}</Text>
          </View>
        )}

        {!reportsLoading && !hasReports && (
          <View style={s.generatedStateBox}>
            <Text style={s.generatedEmptyIcon}>📜</Text>
            <Text style={s.generatedEmptyTitle}>{isSi ? 'තවම වාර්තා නැහැ' : 'No generated reports yet'}</Text>
            <Text style={s.generatedEmptyText}>{isSi ? 'පළමු වාර්තාව සාදන්න. ඉන්පසු එය මෙතන ලැයිස්තුවේ පෙනේ.' : 'Generate your first report. After it finishes, it will stay visible in this list.'}</Text>
          </View>
        )}

        {reportsLoadError && !reportsLoading && (
          <View style={s.generatedWarningBox}>
            <Ionicons name="cloud-offline-outline" size={15} color="#FCA5A5" />
            <Text style={s.generatedWarningText}>{reportsLoadError}</Text>
          </View>
        )}

        {hasReports && (
          <ScrollView
            style={displayReports.length > 3 ? s.generatedListScroll : null}
            contentContainerStyle={s.generatedList}
            nestedScrollEnabled
            showsVerticalScrollIndicator={displayReports.length > 3}
            keyboardShouldPersistTaps="handled"
          >
            {displayReports.map(function(entry) {
              var timeAgo = formatReportTimeAgo(entry.savedAt, reportLang);
              return (
                <TouchableOpacity
                  key={entry.id}
                  onPress={function() { if (!loadingReport) loadSavedReport(entry); }}
                  activeOpacity={0.75}
                  style={s.generatedRow}
                  disabled={loadingReport}
                >
                  <View style={s.generatedScrollIcon}>
                    <Text style={{ fontSize: 18 }}>📜</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.generatedName} numberOfLines={1}>
                      {entry.userName || (isSi ? 'නම නැත' : 'No Name')}
                    </Text>
                    <Text style={s.generatedMeta} numberOfLines={1}>
                      {(formatBirthDateDisplay(entry.birthDate, reportLang) || entry.birthDate || '')}
                      {entry.birthTime ? ' • ' + formatBirthTimeDisplay(entry.birthTime) : ''}
                      {entry.birthLocation ? ' • ' + entry.birthLocation : ''}
                    </Text>
                    <View style={s.generatedMiniRow}>
                      <Text style={s.generatedLang}>{entry.reportLang === 'si' ? 'සිංහල' : 'English'}</Text>
                      {entry.sectionCount ? <Text style={s.generatedDot}>•</Text> : null}
                      {entry.sectionCount ? <Text style={s.generatedLang}>{entry.sectionCount} {isSi ? 'කොටස්' : 'chapters'}</Text> : null}
                    </View>
                  </View>
                  <View style={s.generatedRightCol}>
                    <Text style={s.generatedTime}>{timeAgo}</Text>
                    <TouchableOpacity
                      onPress={function(e) {
                        e.stopPropagation && e.stopPropagation();
                        if (Platform.OS === 'web') {
                          if (confirm(isSi ? 'මෙම වාර්තාව මකන්නද?' : 'Delete this report?')) {
                            deleteSavedReport(entry.id);
                          }
                        } else {
                          Alert.alert(
                            isSi ? 'මකන්න' : 'Delete',
                            isSi ? 'මෙම වාර්තාව මකන්නද?' : 'Delete this report?',
                            [
                              { text: isSi ? 'නැහැ' : 'Cancel', style: 'cancel' },
                              { text: isSi ? 'ඔව්' : 'Delete', style: 'destructive', onPress: function() { deleteSavedReport(entry.id); } },
                            ]
                          );
                        }
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={s.generatedDeleteBtn}
                    >
                      <Ionicons name="trash-outline" size={14} color="rgba(252,165,165,0.70)" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </AuraBox>
    </Animated.View>
  );
}

var sc = StyleSheet.create({
  outerWrap: { position: 'relative', marginBottom: 4 },
  sectionNumBadge: {
    position: 'absolute', left: -4, top: 14, zIndex: 10, width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(12,10,18,0.92)', borderWidth: 1, borderColor: 'rgba(218,165,86,0.42)',
    alignItems: 'center', justifyContent: 'center',
  },
  sectionNumText: { fontSize: 9, fontWeight: '900', color: '#F6C66F' },
  cardBox: { padding: 0, marginLeft: 12, borderColor: 'rgba(255,236,190,0.09)' },
  cardBoxExpanded: { borderColor: 'rgba(218,165,86,0.28)' },
  topGlow: { height: 3, borderTopLeftRadius: 20, borderTopRightRadius: 20, opacity: 0.75 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, paddingBottom: 10 },
  iconBg: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  emoji: { fontSize: 20 },
  title: { color: '#FFF3D4', fontSize: 14.5, fontWeight: '800', lineHeight: 21, letterSpacing: 0 },
  hookLine: { color: 'rgba(248,238,216,0.72)', fontSize: 12.5, lineHeight: 18, marginTop: 4, fontStyle: 'italic' },
  rightCol: { alignItems: 'center', gap: 4 },
  chevronBg: { width: 25, height: 25, borderRadius: 12.5, backgroundColor: 'rgba(255,248,234,0.06)', alignItems: 'center', justifyContent: 'center' },
  chevronBgActive: { backgroundColor: 'rgba(218,165,86,0.18)' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, paddingBottom: 9 },
  statsRowExpanded: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
  readMoreBtn: { marginHorizontal: 14, marginBottom: 12, borderRadius: 10, overflow: 'hidden' },
  readMoreGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(218,165,86,0.18)' },
  readMoreText: { fontSize: 11.5, color: '#F6C66F', fontWeight: '800' },
  content: { paddingHorizontal: 15, paddingBottom: 16 },
  divider: { height: 1, backgroundColor: 'rgba(255,236,190,0.10)', marginBottom: 14 },
  scoreBarWrap: { marginBottom: 14 },
  narrativeWrap: {
    backgroundColor: 'rgba(5,8,15,0.72)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 17,
    borderWidth: 1, borderColor: 'rgba(255,236,190,0.12)',
    ...boxShadow('rgba(0,0,0,0.55)', { width: 0, height: 8 }, 0.8, 18), elevation: 8,
  },
  collapseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 13, paddingVertical: 9, borderRadius: 9, backgroundColor: 'rgba(218,165,86,0.08)', borderWidth: 1, borderColor: 'rgba(218,165,86,0.14)' },
  collapseText: { fontSize: 11.5, color: 'rgba(246,198,111,0.78)', fontWeight: '700' },
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
    starting: { text: '🌌 Reading Your Birth Moment...', sub: 'Your exact birth minute helps reveal your natural personality, timing, and life direction.' },
    engine: { text: '🪐 Checking Current Sky Movement...', sub: 'We are turning the technical calculations into practical guidance for your life.' },
    charts: { text: '✨ Building Your Life Map...', sub: 'Connecting your birth details to love, work, family, money, health, and growth patterns.' },
    coherence: { text: '🔮 Finding Your Strength Patterns...', sub: 'Looking for hidden talents, support areas, and places where extra care is useful.' },
    sections: { text: '📜 Writing Your Personal Story...', sub: 'Preparing clear explanations for love, career, timing, family, and choices.' },
    retrying: { text: '🔄 Refining the Reading...', sub: 'Taking an extra moment to make the guidance clearer and more useful.' },
    complete: { text: '🎉 Your Cosmic Blueprint is Ready!', sub: 'Unveiling your personalized path to success and true happiness.' },
    failed: { text: '⚠️ A Ripple in the Continuum...', sub: 'The stars paused. Please try again (You won\'t be charged again for this).' },
  },
  si: {
    starting: { text: '🌌 උපන් මොහොත කියවමින්...', sub: 'ඔයා උපන් නිවැරදි මොහොතෙන් ඔයාගේ ස්වභාවය, කාලය, සහ ජීවිත දිශාව පැහැදිලි වෙනවා.' },
    engine: { text: '🪐 අද අහසේ ගමන පරීක්ෂා කරමින්...', sub: 'තාක්ෂණික ගණනය කිරීම් ඔයාට තේරෙන ප්‍රායෝගික මගපෙන්වීමක් බවට පත් කරමින්.' },
    charts: { text: '✨ ඔයාගේ ජීවිත සිතියම සකසමින්...', sub: 'ආදරය, රැකියාව, පවුල, මුදල්, සෞඛ්‍යය, සහ වර්ධනය ගැන රටා සම්බන්ධ කරමින්.' },
    coherence: { text: '🔮 ඔයාගේ ශක්ති රටා සොයමින්...', sub: 'සැඟවුණු හැකියාවන්, සහාය ලැබෙන ප්‍රදේශ, සහ පරිස්සම් වෙන්න ඕනේ තැන් සොයමින්.' },
    sections: { text: '📜 ඔයාගේ පුද්ගලික කතාව ලියමින්...', sub: 'ආදරය, රැකියාව, කාලය, පවුල, සහ තේරීම් ගැන පැහැදිලි විස්තර සකසමින්.' },
    retrying: { text: '🔄 කියවීම තවත් පැහැදිලි කරමින්...', sub: 'උපදෙස් වඩාත් තේරුම් ගත හැකි සහ ප්‍රයෝජනවත් කිරීමට තව සුළු මොහොතක්.' },
    complete: { text: '🎉 ඔයාගේ කේන්දර වාර්තාව සූදානම්!', sub: 'සාර්ථකත්වය හා සතුට කරා යන ඔයාගේ ගමන පෙන්වන විශ්ව රහස් දැන් විවෘතයි.' },
    failed: { text: '⚠️ ග්‍රහ ශක්තීන්ගේ බාධාවක්', sub: 'තරු නැවතුණාක් වගේ. කරුණාකර නැවත උත්සාහ කරන්න (ඔයාට නැවත මුදල් ගෙවන්න ඕනේ නැහැ).' },
  },
};

var SECTION_LABELS = {
  en: {
    personality: 'Personality', yogaAnalysis: 'Strength Analysis', lifePredictions: 'Life Predictions',
    career: 'Career', marriage: 'Marriage', marriedLife: 'Married Life', financial: 'Financial',
    children: 'Children', familyPortrait: 'Family', health: 'Health', physicalProfile: 'Physical Profile',
    attractionProfile: 'Attraction', mentalHealth: 'Mental Health', foreignTravel: 'Foreign Travel',
    education: 'Education', luck: 'Luck & Fortune', legal: 'Legal Matters', spiritual: 'Spiritual Path',
    realEstate: 'Real Estate', transits: 'Current Transits', surpriseInsights: 'Surprise Insights',
    timeline25: 'Year Timeline', remedies: 'Remedies',
  },
  si: {
    personality: 'පෞද්ගලිකත්වය', yogaAnalysis: 'ශක්ති විශ්ලේෂණය', lifePredictions: 'ජීවිත අනාවැකි',
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

  // Calculate real progress percentage (monotonic — never decreases)
  var rawPct = 0;
  if (stage === 'engine') rawPct = 5;
  else if (stage === 'charts') rawPct = 10;
  else if (stage === 'coherence') rawPct = 15;
  else if (stage === 'sections') rawPct = 15 + (sectionsDone / Math.max(sectionsTotal, 1)) * 75;
  else if (stage === 'retrying') rawPct = 90 + (sectionsDone / Math.max(sectionsTotal, 1)) * 8;
  else if (stage === 'complete') rawPct = 100;

  // Use a ref to track the highest progress seen — never go backwards
  var progressHighRef = useRef(0);
  if (rawPct > progressHighRef.current) progressHighRef.current = rawPct;
  if (stage === 'starting' && sectionsDone === 0) progressHighRef.current = 0; // Reset only on fresh generation
  var progressPct = progressHighRef.current;

  var elapsedSec = Math.floor(elapsedMs / 1000);
  var elapsedMin = Math.floor(elapsedSec / 60);
  var elapsedStr = elapsedMin > 0 ? (elapsedMin + 'm ' + (elapsedSec % 60) + 's') : (elapsedSec + 's');

  // Estimate remaining time based on section throughput
  var etaStr = '';
  if ((stage === 'sections' || stage === 'retrying') && sectionsDone > 0 && sectionsDone < sectionsTotal && elapsedSec > 5) {
    // Calculate from when sections stage started (~15% of total time for engine/charts/coherence)
    var sectionElapsed = elapsedMs * 0.85; // approximate time spent in sections phase
    var avgPerSection = sectionElapsed / sectionsDone;
    var remaining = Math.max(0, sectionsTotal - sectionsDone);
    var etaSec = Math.ceil((avgPerSection * remaining) / 1000);
    if (etaSec > 60) {
      etaStr = '~' + Math.ceil(etaSec / 60) + 'm ' + (lang === 'si' ? 'ඉතිරි' : 'left');
    } else if (etaSec > 10) {
      etaStr = '~' + etaSec + 's ' + (lang === 'si' ? 'ඉතිරි' : 'left');
    } else {
      etaStr = lang === 'si' ? 'පාහේ සූදානම්!' : 'Almost done!';
    }
  } else if (stage === 'coherence' || stage === 'engine' || stage === 'charts') {
    etaStr = lang === 'si' ? '~3-5 මිනි.' : '~3-5 min';
  }

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
      {(stage === 'sections' || stage === 'retrying') && currentSectionLabel ? (
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
          {stage === 'sections' || stage === 'retrying' ? (
            <Text style={[cl.progressText, { color: tc.textMuted || '#475569' }]}>{sectionsDone}/{sectionsTotal} {lang === 'si' ? 'කොටස්' : 'sections'}</Text>
          ) : (
            <Text style={[cl.progressText, { color: tc.textMuted || '#475569' }]}>{Math.round(progressPct)}%</Text>
          )}
          {etaStr ? <Text style={[cl.progressText, { color: tc.textMuted || '#475569' }]}>{etaStr}</Text>
           : elapsedSec > 5 ? <Text style={[cl.progressText, { color: tc.textMuted || '#475569' }]}>{elapsedStr}</Text> : null}
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
// Normalize chart data for SriLankanChart component
// Handles both the direct /birth-chart response format (array)
// and the AI report saved format (object with houses/lagna)
// ══════════════════════════════════════════
var RASHI_NAME_TO_ID = {
  'Mesha': 1, 'Aries': 1,
  'Vrishabha': 2, 'Taurus': 2,
  'Mithuna': 3, 'Gemini': 3,
  'Kataka': 4, 'Cancer': 4,
  'Simha': 5, 'Leo': 5,
  'Kanya': 6, 'Virgo': 6,
  'Tula': 7, 'Libra': 7,
  'Vrischika': 8, 'Scorpio': 8,
  'Dhanus': 9, 'Sagittarius': 9,
  'Makara': 10, 'Capricorn': 10,
  'Kumbha': 11, 'Aquarius': 11,
  'Meena': 12, 'Pisces': 12,
};

function normalizeChartForDisplay(chartData) {
  if (!chartData) return null;

  var rashiChart = null;
  var lagnaRashiId = 1;

  // Extract rashiChart array
  var rawChart = chartData.rashiChart;
  if (Array.isArray(rawChart)) {
    // Direct /birth-chart response — already an array of {rashiId, planets}
    rashiChart = rawChart;
  } else if (rawChart && typeof rawChart === 'object' && Array.isArray(rawChart.houses)) {
    // AI report format — object with houses array
    rashiChart = rawChart.houses;
  }

  // Extract lagnaRashiId
  // 1. From chartData.lagna.rashiId (direct API)
  if (chartData.lagna && chartData.lagna.rashiId) {
    lagnaRashiId = chartData.lagna.rashiId;
  }
  // 2. From chartData.lagna.id (getRashi returns this)
  else if (chartData.lagna && chartData.lagna.id) {
    lagnaRashiId = chartData.lagna.id;
  }
  // 3. From rashiChart object's nested lagna (AI report format)
  else if (rawChart && typeof rawChart === 'object' && rawChart.lagna) {
    var nestedLagna = rawChart.lagna;
    if (nestedLagna.rashi && nestedLagna.rashi.id) {
      lagnaRashiId = nestedLagna.rashi.id;
    } else if (nestedLagna.rashiId) {
      lagnaRashiId = nestedLagna.rashiId;
    } else if (nestedLagna.id) {
      lagnaRashiId = nestedLagna.id;
    }
  }
  // 4. From chartData.lagna.name (saved report birthData.lagna)
  else if (chartData.lagna && chartData.lagna.name) {
    lagnaRashiId = RASHI_NAME_TO_ID[chartData.lagna.name] || 1;
  }
  // 5. From chartData.lagna.english
  else if (chartData.lagna && chartData.lagna.english) {
    lagnaRashiId = RASHI_NAME_TO_ID[chartData.lagna.english] || 1;
  }
  // 6. Fallback: infer from houses[0] (house 1 = lagna sign)
  else if (rashiChart && rashiChart[0] && rashiChart[0].houseNumber === 1 && rashiChart[0].rashiId) {
    lagnaRashiId = rashiChart[0].rashiId;
  }

  if (!rashiChart) return null;

  return { rashiChart: rashiChart, lagnaRashiId: lagnaRashiId };
}

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
  var reduced = useReducedMotion();
  var insets = useScreenInsets();
  var todayStr = new Date().toISOString().slice(0, 10);
  var [birthDate, setBirthDate] = useState(todayStr);
  var [birthTime, setBirthTime] = useState('12:00');
  var [birthLocation, setBirthLocation] = useState('');
  var [birthLat, setBirthLat] = useState(null);
  var [birthLng, setBirthLng] = useState(null);
  var [selectedCity, setSelectedCity] = useState(null);
  var handleCitySelect = useCallback(function(city) {
    setSelectedCity(city);
    setBirthLocation(city.name);
    setBirthLat(city.lat);
    setBirthLng(city.lng);
    setFieldErrors(function(prev) {
      if (!prev || !prev.birthLocation) return prev;
      var next = { ...prev };
      delete next.birthLocation;
      return next;
    });
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
  var [fieldErrors, setFieldErrors] = useState({});
  // Flow states: 'form' -> 'loading' -> 'report'
  var [screenState, setScreenState] = useState('form');
  var [savedReports, setSavedReports] = useState([]);
  var [reportsLoading, setReportsLoading] = useState(true);
  var [reportsLoadError, setReportsLoadError] = useState(null);

  // De-duplicate saved reports by (userName + birthDate + birthLocation).
  // Server + AsyncStorage can both retain entries for the same person
  // (e.g. user regenerated the report or fell back during a network blip),
  // so we collapse to the most recent entry per identity for display.
  var displayReports = useMemo(function() {
    if (!Array.isArray(savedReports) || savedReports.length === 0) return [];
    var seen = new Map();
    for (var i = 0; i < savedReports.length; i++) {
      var r = savedReports[i];
      var key = (r.userName || '') + '|' + (r.birthDate || '') + '|' + (r.birthLocation || '') + '|' + (r.birthLat || '') + '|' + (r.birthLng || '');
      var existing = seen.get(key);
      if (!existing) {
        seen.set(key, r);
        continue;
      }
      var existingTs = existing.savedAt ? new Date(existing.savedAt).getTime() : 0;
      var rTs = r.savedAt ? new Date(r.savedAt).getTime() : 0;
      if (rTs > existingTs) seen.set(key, r);
    }
    return Array.from(seen.values()).sort(function(a, b) {
      var ta = a.savedAt ? new Date(a.savedAt).getTime() : 0;
      var tb = b.savedAt ? new Date(b.savedAt).getTime() : 0;
      return tb - ta;
    });
  }, [savedReports]);
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
    var active = true;
    (async function() {
      setReportsLoading(true);
      setReportsLoadError(null);
      var localList = [];

      // Load local cache first so the generated list is never hidden while the server warms up.
      try {
        var stored = await AsyncStorage.getItem(REPORTS_CACHE_KEY);
        if (stored) {
          var parsedLocal = JSON.parse(stored) || [];
          localList = sanitizeSavedReportList(parsedLocal);
          if (JSON.stringify(parsedLocal) !== JSON.stringify(localList)) {
            await AsyncStorage.setItem(REPORTS_CACHE_KEY, JSON.stringify(localList));
          }
          if (active && Array.isArray(localList) && localList.length > 0) {
            setSavedReports(localList);
          }
        }
      } catch (e) {
        if (__DEV__) console.warn('Failed to load saved reports:', e);
      }

      // Try server next (source of truth when available).
      if (user && !user.isAnonymous) {
        try {
          var serverRes = await api.getMyHoroscopeReports();
          if (serverRes && serverRes.data && Array.isArray(serverRes.data.reports)) {
            var serverList = serverRes.data.reports.map(function(r) {
              return {
                id: r.id,
                userName: r.userName || '',
                birthDate: extractDateOnly(r.birthDate) || '',
                birthTime: extractTimeFromISO(r.birthDate) || '',
                birthLocation: r.birthLocation || '',
                birthLat: r.lat || null,
                birthLng: r.lng || null,
                reportLang: r.language || 'en',
                userGender: null,
                userReligion: null,
                sectionCount: r.sectionCount || 0,
                savedAt: r.createdAt || '',
                contentCached: false,
                isServerReport: true,
              };
            });
            if (!active) return;
            setSavedReports(serverList.length > 0 ? serverList : localList);
            setServerReportsLoaded(true);
            // Cache server report metadata locally; full report bodies stay server-side.
            if (serverList.length > 0) {
              try { await AsyncStorage.setItem(REPORTS_CACHE_KEY, JSON.stringify(serverList)); } catch (_) {}
            }
            if (__DEV__) console.log('[Report] Loaded ' + serverList.length + ' reports from server');
            return;
          }
        } catch (e) {
          if (__DEV__) console.warn('[Report] Server reports failed, falling back to local:', e.message);
          if (active) setReportsLoadError(reportLang === 'si' ? 'සේවාදායක වාර්තා පූරණය කළ නොහැකි විය. දේශීය ලැයිස්තුව පෙන්වයි.' : 'Could not refresh server reports. Showing local list.');
        }
      }

      if (active && (!Array.isArray(localList) || localList.length === 0)) {
        setSavedReports([]);
      }
    })().finally(function() {
      if (active) setReportsLoading(false);
    });
    return function() { active = false; };
  }, [user, reportLang]);

  // Save a report to cache
  var saveReportToCache = useCallback(async function(reportData) {
    try {
      var entry = {
        id: reportData.serverReportId || Date.now().toString(),
        serverReportId: reportData.serverReportId || null,
        userName: reportData.userName,
        birthDate: reportData.birthDate,
        birthTime: reportData.birthTime,
        birthLocation: reportData.birthLocation,
        birthLat: reportData.birthLat,
        birthLng: reportData.birthLng,
        reportLang: reportData.reportLang,
        userGender: reportData.userGender,
        userReligion: reportData.userReligion,
        sectionCount: reportData.sectionCount || 0,
        contentCached: false,
        isServerReport: !!reportData.serverReportId,
        savedAt: new Date().toISOString(),
      };
      var updated = sanitizeSavedReportList([entry].concat(savedReports)).slice(0, MAX_SAVED_REPORTS);
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
      if (entry && (entry.isServerReport || entry.serverReportId)) {
        try { await api.deleteSavedReport(entry.serverReportId || reportId); } catch (e) {
          if (__DEV__) console.warn('Server delete failed:', e.message);
        }
      }
      var updated = savedReports.filter(function(r) { return r.id !== reportId && r.serverReportId !== reportId; });
      await AsyncStorage.setItem(REPORTS_CACHE_KEY, JSON.stringify(updated));
      setSavedReports(updated);
    } catch (e) {
      if (__DEV__) console.warn('Failed to delete report:', e);
    }
  }, [savedReports]);

  // Load a saved report (fetch full content from server if needed)
  var [loadingReport, setLoadingReport] = useState(false);
  var loadSavedReport = useCallback(async function(entry) {
    if (entry.isServerReport || entry.serverReportId) {
      // Fetch full report from server
      setLoadingReport(true);
      setError(null);
      try {
        var reportIdToLoad = entry.serverReportId || entry.id;
        var res = await api.getSavedReport(reportIdToLoad);
        if (__DEV__) {
          console.log('[DBG-8fb141] loadSavedReport', JSON.stringify({ hasRes: !!res, hasData: !!(res && res.data), hyp: 'C,D' }));
        }
        if (res && res.data) {
          var d = res.data;
          setUserName(d.userName || entry.userName || '');
          // Server stores birthDate as full ISO (e.g. "1973-02-10T09:16:00") — extract parts
          var serverBirthDate = d.birthDate || entry.birthDate || '';
          setBirthDate(extractDateOnly(serverBirthDate) || '');
          // Extract time from ISO, then from entry, then from birthData
          var resolvedTime = entry.birthTime || extractTimeFromISO(serverBirthDate) || (d.birthData && d.birthData.birthTime) || '';
          setBirthTime(resolvedTime || '00:00');
          setBirthLocation(d.birthLocation || entry.birthLocation || '');
          setBirthLat(d.lat || entry.birthLat || null);
          setBirthLng(d.lng || entry.birthLng || null);
          var loadedCity = (d.birthLocation || entry.birthLocation) ? {
            name: d.birthLocation || entry.birthLocation,
            country: '',
            countryCode: '',
            lat: d.lat || entry.birthLat || 0,
            lng: d.lng || entry.birthLng || 0,
          } : null;
          setSelectedCity(loadedCity);
          setReportLang(d.language || entry.reportLang || 'en');
          setUserGender(d.userGender || null);
          setUserReligion(null);
          setReport(null);
          var aiReportData = {
            narrativeSections: d.narrativeSections || {},
            rashiChart: d.rashiChart || null,
            birthData: d.birthData || null,
          };
          setAiReport(aiReportData);
          // Use rashiChart from server-saved report so the chart renders
          setChartData(d.rashiChart && typeof d.rashiChart === 'object' ? { rashiChart: d.rashiChart, lagna: d.birthData?.lagna || null } : null);
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
      return;
    }
    setError(reportLang === 'si' ? 'මෙම වාර්තාවේ සම්පූර්ණ අන්තර්ගතය මේ උපාංගයේ ගබඩා කර නැත. කරුණාකර අන්තර්ජාලය සමඟ සේවාදායකයෙන් නැවත පූරණය කරන්න.' : 'This report content is not stored on this device. Connect to the server and reload the report.');
  }, [t, reportLang]);

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

  // ── Failed generation state — allows direct retry without re-payment ──
  var [failedGenData, setFailedGenData] = useState(null);

  // ── Core generation function (defined first to avoid stale closures) ──
  var [genProgress, setGenProgress] = useState({ stage: 'starting', sectionsDone: 0, sectionsTotal: 19, currentSection: null, completedSections: [] });
  var progressPollRef = useRef(null);
  var lastReportIdRef = useRef(null);
  var highWaterMarkRef = useRef({ sectionsDone: 0, stage: 'starting' });

  useEffect(function () {
    return function () {
      if (progressPollRef.current && progressPollRef.current.stop) {
        progressPollRef.current.stop();
        progressPollRef.current = null;
      }
    };
  }, []);

  // chartSnapshot: birth chart object from API — passed explicitly because React state
  // from setChartData is still stale in the same tick (fixes empty chartData in local cache on Android).
  var startFullGeneration = async function(dateStr, gender, chartSnapshot, generationOptions) {
    if (!generationOptions) generationOptions = {};
    if (__DEV__) {
      console.log('[DBG-8fb141] startFullGeneration:entry', JSON.stringify({ dateStr: dateStr, gender: gender, hasChartSnap: !!chartSnapshot, hyp: 'A' }));
    }
    var tryRecoverFromSavedReports = async function(reason) {
      if (!user || user.isAnonymous) return false;
      try {
        var reportsRes = await api.getMyHoroscopeReports();
        if (!reportsRes || !reportsRes.data || !Array.isArray(reportsRes.data.reports)) return false;
        var recent = reportsRes.data.reports.find(function(r) {
          var createdMs = new Date(r.createdAt || 0).getTime();
          var isRecent = Number.isFinite(createdMs) && (Date.now() - createdMs) < 30 * 60 * 1000;
          return isRecent && reportMatchesGenerationInput(r, dateStr, birthLat, birthLng, reportLang);
        });
        if (!recent) return false;
        if (__DEV__) console.log('[Report] ✅ Recovered saved report after ' + reason + ': ' + recent.id);
        var recoveredRes = await api.getSavedReport(recent.id);
        if (!recoveredRes || !recoveredRes.data) return false;
        var rd = recoveredRes.data;
        setAiReport({
          narrativeSections: rd.narrativeSections || {},
          rashiChart: rd.rashiChart || null,
          birthData: rd.birthData || null,
        });
        if (rd.rashiChart) {
          setChartData({ rashiChart: rd.rashiChart, lagna: rd.birthData?.lagna || null });
        } else {
          setChartData(chartSnapshot);
        }
        setSavedReports(mapServerReportsToSavedEntries(reportsRes.data.reports));
        setFailedGenData(null);
        setError(null);
        setScreenState('report');
        return true;
      } catch (recoverErr) {
        if (__DEV__) console.warn('[Report] Saved report recovery failed after ' + reason + ':', recoverErr.message);
        return false;
      }
    };
    try {
      // Loading state is already set by handleGenerate/handleRetryGeneration
      // Only set if not already loading (safety net)
      if (screenState !== 'loading') {
        setScreenState('loading');
        setLoading(true);
      }
      var initialStage = generationOptions.recoveryRetry ? 'recovering' : 'starting';
      var initialDone = generationOptions.recoveryRetry ? 19 : 0;
      setGenProgress({ stage: initialStage, sectionsDone: initialDone, sectionsTotal: 19, currentSection: generationOptions.recoveryRetry ? 'checking_saved_report' : null, completedSections: [] });
      highWaterMarkRef.current = { sectionsDone: initialDone, stage: initialStage };
      wasBackgroundedDuringGen.current = false;

      // Generate a reportId for progress tracking
      var reportId = generationOptions.previousReportId || generationOptions.reportId || 'rpt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      lastReportIdRef.current = reportId;

      // Stage ordering for monotonic progress (never go backwards)
      var STAGE_ORDER = { starting: 0, recovering: 1, engine: 2, charts: 3, coherence: 4, sections: 5, retrying: 6, complete: 7, failed: 8 };

      // ── FIRE-AND-FORGET: launch API calls but DON'T await them ──
      // The progress polling loop below is the primary completion mechanism.
      // This way the UI never "times out" — it keeps polling as long as the server is working.
      var rawReportPromise = api.getFullReport(dateStr, birthLat, birthLng, reportLang).catch(function(e) {
        if (__DEV__) console.warn('[Report] Raw report request failed (non-blocking):', e.message);
        return null;
      });
      var aiReportPromise = api.getAIReport(dateStr, birthLat, birthLng, reportLang, birthLocation, userName || null, gender, userReligion || null, reportId, {
        previousReportId: generationOptions.previousReportId || null,
        retryReportId: generationOptions.retryReportId || null,
        recoveryRetry: !!generationOptions.recoveryRetry,
      }).catch(function(e) {
        if (__DEV__) console.warn('[Report] AI report request failed (non-blocking):', e.message);
        return null;
      });

      // Track whether the HTTP responses arrived (they may or may not before polling completes)
      var httpRawResult = null;
      var httpAiResult = null;
      var httpDone = false;
      Promise.allSettled([rawReportPromise, aiReportPromise]).then(function(results) {
        httpRawResult = results[0];
        httpAiResult = results[1];
        httpDone = true;
      }).catch(function(e) {
        if (__DEV__) console.warn('[Report] Promise.allSettled wrapper error:', e && e.message);
        httpDone = true;
      });

      // ── POLLING LOOP: primary mechanism to track completion ──
      // Polls every 3s. Finishes when: server reports complete/failed, OR HTTP responses arrive, OR 15min hard cap.
      var MAX_POLL_MS = 15 * 60 * 1000; // 15 min absolute max
      var pollStart = Date.now();
      var consecutiveUnknowns = 0;
      var MAX_UNKNOWNS = 20; // ~60s of no progress data = server lost the reportId

      while (Date.now() - pollStart < MAX_POLL_MS) {
        // ── Check 1: Did progress polling find completion? ──
        try {
          var prog = await api.getReportProgress(reportId);
          if (prog && prog.stage && prog.stage !== 'unknown') {
            consecutiveUnknowns = 0;
            var stageRank = STAGE_ORDER[prog.stage] != null ? STAGE_ORDER[prog.stage] : -1;
            var hwStageRank = STAGE_ORDER[highWaterMarkRef.current.stage] != null ? STAGE_ORDER[highWaterMarkRef.current.stage] : -1;
            var isForward = stageRank > hwStageRank ||
              (stageRank === hwStageRank && (prog.sectionsDone || 0) >= highWaterMarkRef.current.sectionsDone);
            if (isForward) {
              highWaterMarkRef.current = { sectionsDone: prog.sectionsDone || 0, stage: prog.stage };
              setGenProgress(prog);
            }

            // Server reports COMPLETE with a saved report — fetch and display it
            if (prog.stage === 'complete' && prog.savedReportId) {
              if (__DEV__) console.log('[Report] ✅ Server completed! Fetching saved report: ' + prog.savedReportId);
              try {
                var savedRes = await api.getSavedReport(prog.savedReportId);
                if (savedRes && savedRes.data) {
                  var d = savedRes.data;
                  setAiReport({
                    narrativeSections: d.narrativeSections || {},
                    rashiChart: d.rashiChart || null,
                    birthData: d.birthData || null,
                  });
                  setChartData(d.rashiChart ? { rashiChart: d.rashiChart, lagna: d.birthData?.lagna || null } : chartSnapshot);
                  // Also try to get raw report for extra data
                  if (httpRawResult && httpRawResult.status === 'fulfilled' && httpRawResult.value && httpRawResult.value.data) {
                    setReport(httpRawResult.value.data);
                  }
                  setScreenState('report');
                  // Refresh saved reports list
                  try {
                    var srvRes = await api.getMyHoroscopeReports();
                    if (srvRes && srvRes.data && srvRes.data.reports) {
                      setSavedReports(srvRes.data.reports.map(function(r) {
                        return {
                          id: r.id, userName: r.userName || '', birthDate: extractDateOnly(r.birthDate) || '',
                          birthTime: extractTimeFromISO(r.birthDate) || '', birthLocation: r.birthLocation || '',
                          birthLat: r.lat || null, birthLng: r.lng || null,
                          reportLang: r.language || 'en', userGender: null, userReligion: null,
                          sectionCount: r.sectionCount || 0, savedAt: r.createdAt || '', contentCached: false,
                          isServerReport: true,
                        };
                      }));
                    }
                  } catch (_) {}
                  return; // Done!
                }
              } catch (fetchErr) {
                if (__DEV__) console.warn('[Report] Failed to fetch completed report:', fetchErr.message);
              }
            }

            // Server confirmed FAILED
            if (prog.stage === 'failed') {
              if (__DEV__) console.log('[Report] Server confirmed generation failed');
              if (await tryRecoverFromSavedReports('failed-progress')) return;
              setFailedGenData({ dateStr: dateStr, gender: gender, reportId: reportId });
              setError(prog.error || (reportLang === 'si'
                ? 'වාර්තාව සෑදීමට අසමත් විය. කරුණාකර නැවත උත්සාහ කරන්න.'
                : 'Report generation failed. Please try again.'));
              setScreenState('failed');
              return;
            }
          } else {
            consecutiveUnknowns++;
          }
        } catch (pollErr) {
          consecutiveUnknowns++;
        }

        // ── Check 2: Did the HTTP response arrive with a successful result? ──
        // This is the fast path — if the HTTP didn't time out, we use the response directly.
        if (httpDone && httpAiResult && httpAiResult.status === 'fulfilled' && httpAiResult.value && httpAiResult.value.data) {
          var aiData = httpAiResult.value.data;
          // Validate it has real content
          var narrativeSections = aiData.narrativeSections || {};
          var nsKeys = Object.keys(narrativeSections);
          var validCount = nsKeys.filter(function(k) {
            var nar = narrativeSections[k]?.narrative;
            if (!nar || typeof nar !== 'string') return false;
            var lower = nar.toLowerCase().trim();
            if (lower.startsWith('unable to generate')) return false;
            return nar.split(/\s+/).length >= 50;
          }).length;

          if (validCount >= 5) {
            if (__DEV__) console.log('[Report] ✅ HTTP response arrived with valid report (' + validCount + ' sections)');
            setAiReport(aiData);
            if (httpRawResult && httpRawResult.status === 'fulfilled' && httpRawResult.value && httpRawResult.value.data) {
              setReport(httpRawResult.value.data);
            }
            setChartData(chartSnapshot);
            setScreenState('report');
            // Refresh saved reports
            var serverSavedId = httpAiResult.value?.savedReportId || aiData?.savedReportId || null;
            if (serverSavedId && user && !user.isAnonymous) {
              try {
                var srvRes2 = await api.getMyHoroscopeReports();
                if (srvRes2 && srvRes2.data && srvRes2.data.reports) {
                  setSavedReports(srvRes2.data.reports.map(function(r) {
                    return {
                      id: r.id, userName: r.userName || '', birthDate: extractDateOnly(r.birthDate) || '',
                      birthTime: extractTimeFromISO(r.birthDate) || '', birthLocation: r.birthLocation || '',
                      birthLat: r.lat || null, birthLng: r.lng || null,
                      reportLang: r.language || 'en', userGender: null, userReligion: null,
                      sectionCount: r.sectionCount || 0, savedAt: r.createdAt || '', contentCached: false,
                      isServerReport: true,
                    };
                  }));
                }
              } catch (_) {}
            } else {
              await saveReportToCache({
                userName: userName || '',
                birthDate: birthDate,
                birthTime: birthTime,
                birthLocation: birthLocation,
                birthLat: birthLat,
                birthLng: birthLng,
                reportLang: reportLang,
                userGender: gender,
                userReligion: userReligion || null,
                report: httpRawResult && httpRawResult.status === 'fulfilled' && httpRawResult.value ? httpRawResult.value.data : null,
                aiReport: aiData,
                chartData: chartSnapshot,
              });
            }
            return; // Done!
          }
        }

        // ── Check 3: Server lost track of our reportId for too long ──
        if (consecutiveUnknowns >= MAX_UNKNOWNS) {
          // Server doesn't know about our report anymore — check my-reports as last resort
          if (__DEV__) console.log('[Report] Server lost reportId, checking my-reports...');
          if (await tryRecoverFromSavedReports('unknown-progress')) return;
          // Truly lost — fail
          setFailedGenData({ dateStr: dateStr, gender: gender, reportId: reportId });
          setError(reportLang === 'si'
            ? 'Server එකෙන් ප්‍රතිචාරයක් නැහැ. කරුණාකර නැවත උත්සාහ කරන්න.'
            : 'Lost connection to server. Please try again.');
          setScreenState('failed');
          return;
        }

        // Wait before next poll
        await new Promise(function(r) { setTimeout(r, 3000); });
      }

      // ── Hard timeout (15 min) — should never happen but just in case ──
      if (await tryRecoverFromSavedReports('hard-timeout')) return;
      setFailedGenData({ dateStr: dateStr, gender: gender, reportId: reportId });
      setError(reportLang === 'si'
        ? 'වාර්තාව සෑදීමට බොහෝ කාලයක් ගත විය. කරුණාකර නැවත උත්සාහ කරන්න.'
        : 'Report generation took too long. Please try again.');
      setScreenState('failed');
    } catch (err) {
      if (__DEV__) console.error('[Report] startFullGeneration error:', err);
      if (await tryRecoverFromSavedReports('generation-exception')) return;
      setFailedGenData({ dateStr: dateStr, gender: gender, reportId: lastReportIdRef.current });
      setError(err.message || 'Failed to generate report');
      setScreenState('failed');
    } finally {
      setLoading(false);
      isGeneratingRef.current = false;
    }
  };

  // Guard: prevent multiple simultaneous generations (double-tap, etc.)
  var isGeneratingRef = useRef(false);

  function clearFieldError(fieldName) {
    setFieldErrors(function(prev) {
      if (!prev || !prev[fieldName]) return prev;
      var next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }

  function validateReportForm() {
    var nextErrors = {};
    if (!userName || typeof userName !== 'string' || !userName.trim()) {
      nextErrors.userName = reportLang === 'si' ? 'ඔයාගේ නම ඇතුළත් කරන්න.' : 'Enter your name.';
    }
    if (!userGender) {
      nextErrors.userGender = reportLang === 'si' ? 'ස්ත්‍රී / පුරුෂ භාවය තෝරන්න.' : 'Select your gender.';
    }
    if (!selectedCity || birthLat === null || birthLat === undefined || birthLng === null || birthLng === undefined) {
      nextErrors.birthLocation = reportLang === 'si' ? 'උපන් ස්ථානය තෝරන්න.' : 'Select your birth location.';
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  // User taps Generate → validate → show paywall → pay → generate
  var handleGenerate = async function() {
    if (isGeneratingRef.current || loading) return;
    if (!validateReportForm()) {
      setError(null);
      return;
    }
    setFieldErrors({});

    // ── Check for pending entitlement (retry after failed generation) ──
    var isRetry = false;
    try {
      var entCheck = await api.checkEntitlement('report', {
        birthDate: extractDateOnly(birthDate) + 'T' + birthTime + ':00',
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

    // Payment succeeded — show loading screen IMMEDIATELY (before any API calls)
    isGeneratingRef.current = true;
    setError(null);
    setReport(null);
    setAiReport(null);
    setChartData(null);
    setScreenState('loading');
    setLoading(true);
    setGenProgress({ stage: 'starting', sectionsDone: 0, sectionsTotal: 19, currentSection: null, completedSections: [] });

    try {
      var dateStr = extractDateOnly(birthDate) + 'T' + birthTime + ':00';

      var chartRes = null;
      try {
        chartRes = await api.getBirthChart(dateStr, birthLat, birthLng, reportLang);
      } catch (chartErr) {
        if (__DEV__) console.warn('[Report] getBirthChart threw:', chartErr.message);
      }
      if (!chartRes || !chartRes.data || (typeof chartRes.data === 'object' && Object.keys(chartRes.data).length === 0)) {
        setError(reportLang === 'si'
          ? 'උපත් සිතියම කියවීමට අසමත් විය. කරුණාකර නැවත උත්සාහ කරන්න.'
          : 'Failed to read birth chart. Please try again.');
        setScreenState('failed');
        setLoading(false);
        setFailedGenData({ dateStr: dateStr, gender: userGender });
        isGeneratingRef.current = false;
        return;
      }
      setChartData(chartRes.data);

      await startFullGeneration(dateStr, userGender, chartRes.data);
    } catch (err) {
      if (__DEV__) {
        console.log('[DBG-8fb141] handleGenerate:catch', JSON.stringify({ error: err.message, hyp: 'E' }));
      }
      var msg = err.message || 'Error';
      setError(msg);
      setScreenState('failed');
      setLoading(false);
      setFailedGenData({ dateStr: extractDateOnly(birthDate) + 'T' + birthTime + ':00', gender: userGender });
      isGeneratingRef.current = false;
    }
  };

  // ── DOWNLOAD REPORT AS PDF ─────────────────────────────────
  var handleDownloadPDF = async function() {
    if (!aiReport || !aiReport.narrativeSections) return;
    try {
      var isSi = reportLang === 'si';
      var bd = (report && report.birthData) || (aiReport && aiReport.birthData) || {};

      var lagnaObj = (bd.lagna && typeof bd.lagna === 'object') ? bd.lagna : {};
      var lagnaLabel = isSi ? (lagnaObj.sinhala || lagnaObj.english || (typeof bd.lagna === 'string' ? bd.lagna : '')) : (lagnaObj.english || lagnaObj.name || (typeof bd.lagna === 'string' ? bd.lagna : ''));
      var nakLabel = getBirthFocusValue(bd.nakshatra, reportLang);

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
        var shareOk = await Sharing.isAvailableAsync();
        if (shareOk) {
          await Sharing.shareAsync(result.uri, {
            mimeType: 'application/pdf',
            dialogTitle: fileName,
            ...(Platform.OS === 'ios' ? { UTI: 'com.adobe.pdf' } : {}),
          });
        } else {
          Alert.alert(
            isSi ? 'PDF සුරැකිණි' : 'PDF ready',
            isSi
              ? 'PDF ගොනුව සෑදුනා. මෙම උපාංගයේ Share මෙනුව නොමැත — ගොනු යෙදුමෙන් PDF සොයාගන්න.'
              : 'Your PDF was created, but the system share sheet is not available on this device. You can find the file in your app storage or Downloads.'
          );
        }
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
    setFailedGenData(null);
    setVisibleSections(isLowEnd ? 8 : 999);
    setExpandedKey(null);
    setScreenState('form');
  };

  // Retry failed generation directly — skips paywall, reuses same birth data
  var handleRetryGeneration = async function() {
    if (__DEV__) {
      console.log('[DBG-8fb141] handleRetryGeneration called', JSON.stringify({ hasFailedGenData: !!failedGenData, hyp: 'A' }));
    }
    if (isGeneratingRef.current || loading) return;
    if (!failedGenData) {
      setScreenState('form');
      return;
    }

    // ── BEFORE retrying: check if the previous attempt actually completed server-side ──
    // This prevents double-charges when the HTTP request timed out but server succeeded
    if (failedGenData.reportId) {
      try {
        setScreenState('loading');
        setLoading(true);
        setGenProgress({ stage: 'recovering', sectionsDone: 19, sectionsTotal: 19, currentSection: 'checking_saved_report', completedSections: [] });
        var prog = await api.getReportProgress(failedGenData.reportId);
        if (prog && prog.stage === 'complete' && prog.savedReportId) {
          if (__DEV__) console.log('[Report] ✅ Previous generation completed! Fetching saved report: ' + prog.savedReportId);
          var savedRes = await api.getSavedReport(prog.savedReportId);
          if (savedRes && savedRes.data) {
            var d = savedRes.data;
            var recoveredAiReport = {
              narrativeSections: d.narrativeSections || {},
              rashiChart: d.rashiChart || null,
              birthData: d.birthData || null,
            };
            setAiReport(recoveredAiReport);
            setChartData(d.rashiChart ? { rashiChart: d.rashiChart, lagna: d.birthData?.lagna || null } : chartData);
            setFailedGenData(null);
            setError(null);
            setScreenState('report');
            setLoading(false);
            // Refresh saved reports list
            try {
              var srvRes = await api.getMyHoroscopeReports();
              if (srvRes && srvRes.data && srvRes.data.reports) {
                setSavedReports(srvRes.data.reports.map(function(r) {
                  return {
                    id: r.id, userName: r.userName || '', birthDate: extractDateOnly(r.birthDate) || '',
                    birthTime: extractTimeFromISO(r.birthDate) || '', birthLocation: r.birthLocation || '',
                    birthLat: r.lat || null, birthLng: r.lng || null,
                    reportLang: r.language || 'en', userGender: null, userReligion: null,
                    sectionCount: r.sectionCount || 0, savedAt: r.createdAt || '', contentCached: false,
                    isServerReport: true,
                  };
                }));
              }
            } catch (_) {}
            return; // No need to regenerate — we recovered the previous attempt
          }
        }
        // Also check my-reports for a recently saved report matching these birth details
        if (user && !user.isAnonymous) {
          try {
            var reportsRes = await api.getMyHoroscopeReports();
            if (reportsRes && reportsRes.data && reportsRes.data.reports) {
              var recent = reportsRes.data.reports.find(function(r) {
                return r.birthDate === failedGenData.dateStr && (Date.now() - new Date(r.createdAt).getTime()) < 600000;
              });
              if (recent) {
                if (__DEV__) console.log('[Report] ✅ Found recently saved report matching birth data: ' + recent.id);
                var recentRes = await api.getSavedReport(recent.id);
                if (recentRes && recentRes.data) {
                  var rd = recentRes.data;
                  setAiReport({ narrativeSections: rd.narrativeSections || {}, rashiChart: rd.rashiChart || null, birthData: rd.birthData || null });
                  setChartData(rd.rashiChart ? { rashiChart: rd.rashiChart, lagna: rd.birthData?.lagna || null } : chartData);
                  setFailedGenData(null);
                  setError(null);
                  setScreenState('report');
                  setLoading(false);
                  setSavedReports(reportsRes.data.reports.map(function(r) {
                    return {
                      id: r.id, userName: r.userName || '', birthDate: extractDateOnly(r.birthDate) || '',
                      birthTime: extractTimeFromISO(r.birthDate) || '', birthLocation: r.birthLocation || '',
                      birthLat: r.lat || null, birthLng: r.lng || null,
                      reportLang: r.language || 'en', userGender: null, userReligion: null,
                      sectionCount: r.sectionCount || 0, savedAt: r.createdAt || '', contentCached: false,
                      isServerReport: true,
                    };
                  }));
                  return;
                }
              }
            }
          } catch (_) {}
        }
        setScreenState('failed');
        setLoading(false);
      } catch (checkErr) {
        if (__DEV__) console.warn('[Report] Recovery check failed:', checkErr.message);
        setScreenState('failed');
        setLoading(false);
      }
    }

    var retryDateStr = failedGenData.dateStr;
    var retryGender = failedGenData.gender;
    isGeneratingRef.current = true;
    setError(null);
    setReport(null);
    setAiReport(null);
    setFailedGenData(null);

    try {
      var chartSnap = chartData;
      if (!chartSnap) {
        var chartRes = await api.getBirthChart(retryDateStr, birthLat, birthLng, reportLang);
        if (chartRes.data) {
          chartSnap = chartRes.data;
          setChartData(chartRes.data);
        }
      }
      await startFullGeneration(retryDateStr, retryGender, chartSnap || null, {
        previousReportId: failedGenData.reportId || null,
        recoveryRetry: true,
      });
    } catch (err) {
      setFailedGenData({ dateStr: retryDateStr, gender: retryGender });
      setError(err.message || 'Retry failed');
      setScreenState('failed');
      isGeneratingRef.current = false;
    }
  };

  // ── FAILED GENERATION — retry without re-payment ────────
  if (screenState === 'failed') {
    return (
      <DesktopScreenWrapper routeName="report">
      <View style={{ flex: 1, backgroundColor: colors.bg || '#04030C' }}>
        <CosmicBackground reduced={reduced} lowEnd={isLowEnd} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <AuraBox style={{ borderColor: 'rgba(239,68,68,0.3)', alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, width: '100%', maxWidth: 400 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>😔</Text>
            <Text style={{ color: '#FCA5A5', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
              {reportLang === 'si' ? 'වාර්තාව සෑදීම අසාර්ථක විය' : 'Report Generation Failed'}
            </Text>
            <Text style={{ color: 'rgba(255,214,102,0.6)', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
              {error || (reportLang === 'si' ? 'කරුණාකර නැවත උත්සාහ කරන්න' : 'Please try again')}
            </Text>
            <Text style={{ color: 'rgba(255,214,102,0.35)', fontSize: 11, textAlign: 'center', marginBottom: 20 }}>
              {reportLang === 'si'
                ? '🔒 ඔයාට නැවත මුදල් ගෙවන්න ඕනේ නැහැ'
                : '🔒 You will not be charged again'}
            </Text>

            <SpringPressable
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14, backgroundColor: 'rgba(255,140,0,0.15)', borderWidth: 1, borderColor: 'rgba(255,140,0,0.4)', marginBottom: 12, width: '100%' }}
              onPress={handleRetryGeneration}
              haptic="heavy"
              scalePressed={0.95}
              disabled={loading}
            >
              <Ionicons name="refresh" size={18} color="#FF8C00" style={{ marginRight: 8 }} />
              <Text style={{ color: '#FF8C00', fontSize: 15, fontWeight: '800' }}>
                {reportLang === 'si' ? 'නොමිලේ නැවත උත්සාහ කරන්න' : 'Retry Free'}
              </Text>
            </SpringPressable>

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 20 }}
              onPress={handleNewReport}
              activeOpacity={0.7}
            >
              <Text style={{ color: 'rgba(255,214,102,0.4)', fontSize: 12 }}>
                {reportLang === 'si' ? 'ආපසු යන්න' : 'Back to form'}
              </Text>
            </TouchableOpacity>
          </AuraBox>
        </View>
      </View>
      </DesktopScreenWrapper>
    );
  }

  // ── FULL SCREEN LOADING ──────────────────────────────────
  if (screenState === 'loading') {
    return (
      <DesktopScreenWrapper routeName="report">
      <View style={{ flex: 1, backgroundColor: colors.bg || '#04030C' }}>
        <CosmicBackground reduced={reduced} lowEnd={isLowEnd} />
        <ReportLoadingScreen
          progress={genProgress}
          userName={userName}
          language={reportLang}
          reduced={reduced}
          isLowEnd={isLowEnd}
        />
      </View>
      </DesktopScreenWrapper>
    );
  }

  // ── REPORT VIEW (only after AI is done) ──────────────────
  if (screenState === 'report' && (report || aiReport)) {

    // Resolve birthData from raw report or aiReport fallback (server-saved reports lack raw report)
    var birthDataResolved = (report && report.birthData) || (aiReport && aiReport.birthData) || {};

    // Count total sections with content
    var sectionCount = SECTION_KEYS.filter(function(k) {
      return aiReport?.narrativeSections?.[k]?.narrative;
    }).length;

    if (__DEV__) {
      console.log('[DBG-8fb141] reportView:render', JSON.stringify({ hasReport: !!report, hasAiReport: !!aiReport, sectionCount: sectionCount, hyp: 'C,D' }));
    }

    // Total word count
    var totalWords = SECTION_KEYS.reduce(function(total, k) {
      var nar = aiReport?.narrativeSections?.[k]?.narrative;
      return total + (nar ? nar.split(/\s+/).length : 0);
    }, 0);
    var totalReadTime = Math.max(1, Math.ceil(totalWords / 200));

    return (
      <DesktopScreenWrapper routeName="report">
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <CosmicBackground reduced={reduced} lowEnd={isLowEnd} />
        <ReadingProgressBar scrollProgress={scrollProgress} sectionCount={SECTION_KEYS.length} currentChapter={currentChapter} reportLang={reportLang} />
        <Animated.ScrollView style={s.flex} contentContainerStyle={[s.content, isDesktop && s.contentDesktop, !isDesktop && { paddingTop: insets.contentTop, paddingBottom: insets.contentBottom }]} showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
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
              <Text style={s.subtitle}>{birthLocation} • {formatBirthDateDisplay(birthDate, reportLang)} • {formatBirthTimeDisplay(birthTime)}</Text>
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
          {birthDataResolved && Object.keys(birthDataResolved).length > 0 && (
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
                        ? (birthDataResolved.lagna?.sinhala ? birthDataResolved.lagna.sinhala + ' බලය යටතේ උපන්නා' : '')
                        : (birthDataResolved.lagna?.english ? 'Born under the power of ' + birthDataResolved.lagna.english : '')
                    }</Text>
                    <Text style={s.birthSub}>
                      {reportLang === 'si' ? 'උපන් ස්ථානය: ' : 'Born: '}{birthLocation} • {birthDate} • {birthTime}
                    </Text>
                    {birthDataResolved.currentAge != null && (
                      <Text style={s.birthSub}>
                        {reportLang === 'si' ? '🎂 වයස: ' + birthDataResolved.currentAge + ' වසර' : '🎂 Age: ' + birthDataResolved.currentAge + ' years'}
                        {birthDataResolved.birthDayOfWeek ? (reportLang === 'si' ? ' • ' + birthDataResolved.birthDayOfWeek + ' දිනයේ උපන්නා' : ' • Born on a ' + birthDataResolved.birthDayOfWeek) : ''}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={s.panchangaRow}>
                  <View style={s.panchangaItem}>
                    <Text style={s.panchangaLabel}>{reportLang === 'si' ? '🌙 චන්ද්‍ර ශක්තිය' : '🌙 Moon Energy'}</Text>
                    <Text style={s.panchangaValue}>{reportLang === 'si' ? (birthDataResolved.moonSign?.sinhala || birthDataResolved.moonSign?.english || '') : (birthDataResolved.moonSign?.english || '')}</Text>
                  </View>
                  <View style={s.panchangaItem}>
                    <Text style={s.panchangaLabel}>{reportLang === 'si' ? '☀️ සූර්ය ශක්තිය' : '☀️ Sun Energy'}</Text>
                    <Text style={s.panchangaValue}>{reportLang === 'si' ? (birthDataResolved.sunSign?.sinhala || birthDataResolved.sunSign?.english || '') : (birthDataResolved.sunSign?.english || '')}</Text>
                  </View>
                  <View style={s.panchangaItem}>
                    <Text style={s.panchangaLabel}>{reportLang === 'si' ? '⭐ උපන් අවධානය' : '⭐ Birth Focus'}</Text>
                    <Text style={s.panchangaValue}>{getBirthFocusValue(birthDataResolved.nakshatra, reportLang)}</Text>
                  </View>
                </View>
                <View style={[s.panchangaRow, { marginTop: 4 }]}>
                  {birthDataResolved.gana && (
                    <View style={s.panchangaItem}>
                      <Text style={s.panchangaLabel}>{reportLang === 'si' ? '🔥 ස්වභාව රටාව' : '🔥 Nature Style'}</Text>
                      <Text style={s.panchangaValue}>{getFriendlyTemperamentValue(birthDataResolved.gana.type, reportLang)}</Text>
                    </View>
                  )}
                  {birthDataResolved.nadi && (
                    <View style={s.panchangaItem}>
                      <Text style={s.panchangaLabel}>{reportLang === 'si' ? '💨 ජීව රටාව' : '💨 Life Rhythm'}</Text>
                      <Text style={s.panchangaValue}>{getFriendlyEnergyValue(birthDataResolved.nadi.type, reportLang)}</Text>
                    </View>
                  )}
                  {birthDataResolved.panchanga?.panchangaQuality && (
                    <View style={s.panchangaItem}>
                      <Text style={s.panchangaLabel}>{reportLang === 'si' ? '✨ උපන් ගුණය' : '✨ Birth Quality'}</Text>
                      <Text style={[s.panchangaValue, { color: birthDataResolved.panchanga.panchangaQuality.score >= 2 ? '#4ADE80' : birthDataResolved.panchanga.panchangaQuality.score >= 0 ? '#FBBF24' : '#F87171' }]}>
                        {birthDataResolved.panchanga.panchangaQuality.quality} ({birthDataResolved.panchanga.panchangaQuality.score}/5)
                      </Text>
                    </View>
                  )}
                </View>
              </AuraBox>
            </Animated.View>
          )}

          {/* ═══ BIRTH CHART ═══ */}
          {chartData && (function() {
            var normalized = normalizeChartForDisplay(chartData);
            if (!normalized) return null;
            return (
              <Animated.View entering={FadeInDown.delay(250).duration(700)}>
                <AuraBox style={{ borderColor: 'rgba(255,140,0,0.2)' }}>
                  <View style={s.chartHeader}>
                    <Text style={s.chartTitle}>{reportLang === 'si' ? '🏛️ ඔයාගේ උපන් සිතියම' : '🏛️ Your Birth Map'}</Text>
                    <Text style={s.chartSub}>{reportLang === 'si' ? 'ඔයා ඉපදුන මොහොතේ අහස පෙනුන හැටි' : 'How the sky looked the moment you were born'}</Text>
                  </View>
                  <SriLankanChart
                    rashiChart={normalized.rashiChart}
                    lagnaRashiId={normalized.lagnaRashiId}
                    language={reportLang === 'si' ? 'si' : 'en'}
                  />
                </AuraBox>
              </Animated.View>
            );
          })()}

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
              var rawData = (report && report.sections ? report.sections : {})[rawDataKey] || (aiReport.rawSections || {})[rawDataKey] || null;
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
                    ? 'කරුණාකර නැවත උත්සාහ කරන්න. ඔයාට නැවත මුදල් ගෙවන්න ඕනේ නැහැ.'
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
  var validationItems = Object.keys(fieldErrors || {}).map(function(key) { return fieldErrors[key]; });

  return (
    <DesktopScreenWrapper routeName="report">
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} enabled={Platform.OS === 'ios'}>
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <CosmicBackground reduced={reduced} lowEnd={isLowEnd} />
      {loadingReport ? (
        <View
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 2000, elevation: 50,
            justifyContent: 'center', alignItems: 'center',
            backgroundColor: 'rgba(4,3,12,0.75)',
          }}
          pointerEvents="auto"
        >
          <ReportLoadingScreen
            progress={{ stage: 'starting', sectionsDone: 0, sectionsTotal: 19 }}
            userName={userName}
            language={reportLang}
            reduced={reduced}
            isLowEnd={isLowEnd}
          />
        </View>
      ) : null}
      <ScrollView
        style={s.flex}
        contentContainerStyle={[s.content, isDesktop && s.contentDesktop, !isDesktop && { paddingTop: insets.contentTop, paddingBottom: insets.contentBottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
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
            {validationItems.length > 0 ? (
              <View style={s.validationSummary}>
                <Ionicons name="alert-circle-outline" size={17} color="#FCA5A5" />
                <View style={{ flex: 1 }}>
                  <Text style={s.validationTitle}>{reportLang === 'si' ? 'කරුණාකර මේ විස්තර සම්පූර්ණ කරන්න' : 'Complete these details'}</Text>
                  <Text style={s.validationText}>{validationItems.join(' ')}</Text>
                </View>
              </View>
            ) : null}

            {/* Name Input */}
            <Text style={s.inputHint}>{reportLang === 'si' ? 'ඔයාගේ නම *' : 'YOUR NAME *'}</Text>
            <TextInput
              style={[s.input, fieldErrors.userName ? s.inputError : {}, { marginBottom: fieldErrors.userName ? 6 : 16 }]}
              value={userName}
              onChangeText={function(val) { setUserName(val); if (val.trim()) clearFieldError('userName'); if (error) setError(null); }}
              placeholder={reportLang === 'si' ? 'ඔයාගේ නම ඇතුලත් කරන්න' : 'Enter your name'}
              placeholderTextColor="#475569"
              autoCorrect={false}
              returnKeyType="next"
            />
            {fieldErrors.userName ? <Text style={s.inlineError}>{fieldErrors.userName}</Text> : null}

            {/* Gender Selector */}
            <Text style={s.inputHint}>{reportLang === 'si' ? 'ස්ත්‍රී / පුරුෂ භාවය *' : 'GENDER *'}</Text>
            <View style={[s.genderRow, fieldErrors.userGender ? s.choiceRowError : {}]}>
              <TouchableOpacity
                style={[s.genderBtn, userGender === 'male' && s.genderBtnMaleActive]}
                onPress={function() { setUserGender('male'); clearFieldError('userGender'); if (error) setError(null); }}
                activeOpacity={0.8}
              >
                <Text style={s.genderIcon}>♂️</Text>
                <Text style={[s.genderText, userGender === 'male' && s.genderTextActive]}>
                  {reportLang === 'si' ? 'පුරුෂ' : 'Male'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.genderBtn, userGender === 'female' && s.genderBtnFemaleActive]}
                onPress={function() { setUserGender('female'); clearFieldError('userGender'); if (error) setError(null); }}
                activeOpacity={0.8}
              >
                <Text style={s.genderIcon}>♀️</Text>
                <Text style={[s.genderText, userGender === 'female' && s.genderTextActive]}>
                  {reportLang === 'si' ? 'ස්ත්‍රී' : 'Female'}
                </Text>
              </TouchableOpacity>
            </View>
            {fieldErrors.userGender ? <Text style={s.inlineError}>{fieldErrors.userGender}</Text> : null}

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
              <View style={[s.inputGroup, { flex: 0.75 }]}>
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
            {fieldErrors.birthLocation ? <Text style={[s.inlineError, { marginTop: 6 }]}>{fieldErrors.birthLocation}</Text> : null}

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

            <SpringPressable style={[s.generateBtn, loading && { opacity: 0.5 }]} onPress={handleGenerate} haptic="heavy" scalePressed={0.93} disabled={loading}>
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

        <GeneratedReportsPanel
          displayReports={displayReports}
          reportsLoading={reportsLoading}
          reportsLoadError={reportsLoadError}
          reportLang={reportLang}
          loadSavedReport={loadSavedReport}
          deleteSavedReport={deleteSavedReport}
          loadingReport={loadingReport}
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
    </View>
    </KeyboardAvoidingView>
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

  // Generated reports list
  generatedPanel: { marginBottom: 12, borderColor: 'rgba(218,165,86,0.18)' },
  generatedHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  generatedIconBox: {
    width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(218,165,86,0.12)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
    borderWidth: 1, borderColor: 'rgba(218,165,86,0.22)',
  },
  generatedTitle: { color: '#FFF3D4', fontSize: 15.5, fontWeight: '900', lineHeight: 20 },
  generatedSubtitle: { color: 'rgba(248,238,216,0.58)', fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  generatedCountPill: {
    minWidth: 34, height: 28, borderRadius: 14, paddingHorizontal: 10,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(246,198,111,0.10)',
    borderWidth: 1, borderColor: 'rgba(246,198,111,0.22)', marginLeft: 10,
  },
  generatedCountText: { color: '#F6C66F', fontSize: 12, fontWeight: '900' },
  generatedStateBox: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 20, paddingHorizontal: 12,
    borderRadius: 14, backgroundColor: 'rgba(5,8,15,0.46)', borderWidth: 1, borderColor: 'rgba(255,236,190,0.08)',
  },
  generatedStateText: { color: 'rgba(248,238,216,0.68)', fontSize: 12.5, fontWeight: '700', marginTop: 8, textAlign: 'center' },
  generatedEmptyIcon: { fontSize: 30, marginBottom: 8 },
  generatedEmptyTitle: { color: '#FFF3D4', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  generatedEmptyText: { color: 'rgba(248,238,216,0.56)', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5, maxWidth: 280 },
  generatedWarningBox: {
    flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.16)', marginBottom: 10,
  },
  generatedWarningText: { flex: 1, color: 'rgba(252,165,165,0.86)', fontSize: 11.5, lineHeight: 16 },
  generatedList: { gap: 8 },
  generatedListScroll: { maxHeight: 256 },
  generatedRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12,
    backgroundColor: 'rgba(5,8,15,0.58)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,236,190,0.10)',
  },
  generatedScrollIcon: {
    width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(246,198,111,0.12)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
    borderWidth: 1, borderColor: 'rgba(246,198,111,0.18)',
  },
  generatedName: { color: '#FFF3D4', fontSize: 14.5, fontWeight: '800', lineHeight: 19 },
  generatedMeta: { color: 'rgba(248,238,216,0.62)', fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  generatedMiniRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  generatedLang: { color: 'rgba(246,198,111,0.64)', fontSize: 10.5, fontWeight: '700' },
  generatedDot: { color: 'rgba(246,198,111,0.30)', fontSize: 10 },
  generatedRightCol: { alignItems: 'flex-end', marginLeft: 10, alignSelf: 'stretch', justifyContent: 'space-between' },
  generatedTime: { color: 'rgba(248,238,216,0.38)', fontSize: 10.5, fontWeight: '700' },
  generatedDeleteBtn: { padding: 5, borderRadius: 9, backgroundColor: 'rgba(239,68,68,0.08)' },

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
  inputError: { borderColor: 'rgba(248,113,113,0.75)', backgroundColor: 'rgba(127,29,29,0.14)' },
  validationSummary: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(248,113,113,0.24)', backgroundColor: 'rgba(127,29,29,0.14)', paddingVertical: 10, paddingHorizontal: 11, marginBottom: 14 },
  validationTitle: { color: '#FECACA', fontSize: 12, lineHeight: 16, fontWeight: '900', marginBottom: 2 },
  validationText: { color: 'rgba(254,202,202,0.78)', fontSize: 11.5, lineHeight: 17, fontWeight: '600' },
  inlineError: { color: '#FCA5A5', fontSize: 11.5, lineHeight: 16, fontWeight: '700', marginBottom: 12 },
  choiceRowError: { borderWidth: 1, borderColor: 'rgba(248,113,113,0.35)', borderRadius: 16, padding: 4, backgroundColor: 'rgba(127,29,29,0.08)' },
  generateBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4, ...boxShadow('#FF8C00', { width: 0, height: 4 }, 0.7, 18) },
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
