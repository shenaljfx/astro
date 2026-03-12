/**
 * Full Jyotish Report Screen
 * 
 * Premium 14-section comprehensive astrology report with
 * collapsible cards, color-coded indicators, timeline view,
 * and cosmic design language.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Platform, Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import CosmicBackground from '../../components/CosmicBackground';
import MarkdownText from '../../components/MarkdownText';
import SriLankanChart from '../../components/SriLankanChart';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../services/api';

var { width: SCREEN_W } = Dimensions.get('window');

// ──────────────────────────────────────────
// Section icons & gradient colors
// ──────────────────────────────────────────
var SECTION_META = {
  yogaAnalysis:     { icon: 'planet-outline',       iconLib: 'ion', colors: ['#9333EA', '#581C87'], emoji: '🪐' },
  personality:      { icon: 'person-outline',        iconLib: 'ion', colors: ['#3B82F6', '#1E3A8A'], emoji: '✨' },
  marriage:         { icon: 'heart-outline',         iconLib: 'ion', colors: ['#EC4899', '#831843'], emoji: '💍' },
  career:           { icon: 'briefcase-outline',     iconLib: 'ion', colors: ['#F59E0B', '#92400E'], emoji: '💼' },
  children:         { icon: 'people-outline',        iconLib: 'ion', colors: ['#10B981', '#064E3B'], emoji: '👶' },
  lifePredictions:  { icon: 'telescope-outline',     iconLib: 'ion', colors: ['#8B5CF6', '#4C1D95'], emoji: '🔮' },
  mentalHealth:     { icon: 'bulb-outline',          iconLib: 'ion', colors: ['#06B6D4', '#0E7490'], emoji: '🧠' },
  business:         { icon: 'trending-up-outline',   iconLib: 'ion', colors: ['#F97316', '#9A3412'], emoji: '📈' },
  transits:         { icon: 'navigate-outline',      iconLib: 'ion', colors: ['#14B8A6', '#134E4A'], emoji: '🌍' },
  realEstate:       { icon: 'home-outline',          iconLib: 'ion', colors: ['#84CC16', '#365314'], emoji: '🏠' },
  employment:       { icon: 'ribbon-outline',        iconLib: 'ion', colors: ['#EAB308', '#713F12'], emoji: '🏅' },
  financial:        { icon: 'wallet-outline',        iconLib: 'ion', colors: ['#22C55E', '#14532D'], emoji: '💰' },
  timeline25:       { icon: 'time-outline',          iconLib: 'ion', colors: ['#6366F1', '#312E81'], emoji: '📅' },
  remedies:         { icon: 'diamond-outline',       iconLib: 'ion', colors: ['#FBBF24', '#78350F'], emoji: '💎' },
};

var SECTION_KEYS = [
  'yogaAnalysis', 'personality', 'marriage', 'career', 'children',
  'lifePredictions', 'mentalHealth', 'business', 'transits',
  'realEstate', 'employment', 'financial', 'timeline25', 'remedies',
];

var SECTION_TITLES = {
  yogaAnalysis: 'reportYogas',
  personality: 'reportPersonality',
  marriage: 'reportMarriage',
  career: 'reportCareer',
  children: 'reportChildren',
  lifePredictions: 'reportLifePredictions',
  mentalHealth: 'reportMentalHealth',
  business: 'reportBusiness',
  transits: 'reportTransits',
  realEstate: 'reportRealEstate',
  employment: 'reportEmployment',
  financial: 'reportFinancial',
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

// ──────────────────────────────────────────
// Strength badge
// ──────────────────────────────────────────
function StrengthBadge({ strength }) {
  var colors = {
    'very strong': { bg: 'rgba(16,185,129,0.2)', text: '#10B981', label: 'Very Strong' },
    'strong':      { bg: 'rgba(59,130,246,0.2)', text: '#3B82F6', label: 'Strong' },
    'moderate':    { bg: 'rgba(251,191,36,0.2)', text: '#FBBF24', label: 'Moderate' },
    'weak':        { bg: 'rgba(239,68,68,0.15)', text: '#EF4444', label: 'Weak' },
    'challenged':  { bg: 'rgba(249,115,22,0.15)', text: '#F97316', label: 'Challenged' },
  };
  var c = colors[strength] || colors.moderate;
  return (
    <View style={[bs.badge, { backgroundColor: c.bg }]}>
      <Text style={[bs.badgeText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}
var bs = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
});

// ──────────────────────────────────────────
// Key-value info row
// ──────────────────────────────────────────
function InfoRow({ label, value, color, icon }) {
  return (
    <View style={ir.row}>
      {icon && <Ionicons name={icon} size={14} color={color || '#94A3B8'} style={{ marginRight: 6 }} />}
      <Text style={ir.label}>{label}</Text>
      <Text style={[ir.value, color && { color }]} numberOfLines={2}>{value || '—'}</Text>
    </View>
  );
}
var ir = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)' },
  label: { color: '#94A3B8', fontSize: 12, fontWeight: '500', width: 110 },
  value: { color: '#F1F5F9', fontSize: 12, fontWeight: '600', flex: 1, textAlign: 'right' },
});

// ──────────────────────────────────────────
// Tag pill
// ──────────────────────────────────────────
function TagPill({ text, color }) {
  return (
    <View style={[tp.pill, { backgroundColor: (color || 'rgba(147,51,234,0.2)') }]}>
      <Text style={tp.text}>{text}</Text>
    </View>
  );
}
var tp = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 6, marginBottom: 6 },
  text: { color: '#E2E8F0', fontSize: 11, fontWeight: '600' },
});

// ──────────────────────────────────────────
// Dasha timeline bar
// ──────────────────────────────────────────
function DashaBar({ lord, period, nature, isCurrent }) {
  var barColor = nature === 'benefic' ? '#10B981' : nature === 'malefic' ? '#EF4444' : nature === 'yogaKaraka' ? '#FBBF24' : '#6366F1';
  return (
    <View style={[db.bar, isCurrent && db.currentBar]}>
      <LinearGradient
        colors={[barColor + '30', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      />
      <View style={db.row}>
        <View style={[db.dot, { backgroundColor: barColor }]} />
        <Text style={db.lord}>{lord}</Text>
        {isCurrent && <Text style={db.current}>● NOW</Text>}
      </View>
      <Text style={db.period}>{period}</Text>
    </View>
  );
}
var db = StyleSheet.create({
  bar: { padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  currentBar: { borderColor: 'rgba(251,191,36,0.3)', backgroundColor: 'rgba(251,191,36,0.05)' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  lord: { color: '#F1F5F9', fontSize: 14, fontWeight: '700', flex: 1 },
  current: { color: '#FBBF24', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  period: { color: '#94A3B8', fontSize: 11, marginLeft: 16 },
});

// ══════════════════════════════════════════
// SECTION RENDERERS
// ══════════════════════════════════════════

function renderYogas(data) {
  if (!data) return null;
  return (
    <View>
      <Text style={cs.summary}>{data.summary}</Text>
      {data.yogaKaraka && data.yogaKaraka !== 'None' && (
        <View style={cs.highlight}>
          <Text style={cs.highlightLabel}>⭐ Yoga Karaka</Text>
          <Text style={cs.highlightValue}>{data.yogaKaraka}</Text>
        </View>
      )}
      {(data.yogas || []).map(function(y, i) {
        return (
          <View key={i} style={cs.yogaCard}>
            <View style={cs.yogaHeader}>
              <Text style={cs.yogaName}>{y.name}</Text>
              <StrengthBadge strength={y.strength === 'Very Strong' ? 'very strong' : y.strength === 'Strong' ? 'strong' : 'moderate'} />
            </View>
            <Text style={cs.yogaDesc}>{y.description}</Text>
          </View>
        );
      })}
      {data.functionalBenefics && data.functionalBenefics.length > 0 && (
        <View style={cs.tagRow}>
          <Text style={cs.tagLabel}>Benefics: </Text>
          {data.functionalBenefics.map(function(p, i) { return <TagPill key={i} text={p} color="rgba(16,185,129,0.2)" />; })}
        </View>
      )}
      {data.functionalMalefics && data.functionalMalefics.length > 0 && (
        <View style={cs.tagRow}>
          <Text style={cs.tagLabel}>Malefics: </Text>
          {data.functionalMalefics.map(function(p, i) { return <TagPill key={i} text={p} color="rgba(239,68,68,0.15)" />; })}
        </View>
      )}
    </View>
  );
}

function renderPersonality(data) {
  if (!data) return null;
  return (
    <View>
      <View style={cs.row3}>
        <View style={cs.miniCard}>
          <Text style={cs.miniLabel}>Lagna</Text>
          <Text style={cs.miniValue}>{data.lagna?.english}</Text>
          <Text style={cs.miniSub}>{data.lagna?.sinhala}</Text>
        </View>
        <View style={cs.miniCard}>
          <Text style={cs.miniLabel}>Moon</Text>
          <Text style={cs.miniValue}>{data.moonSign?.english}</Text>
          <Text style={cs.miniSub}>{data.moonSign?.sinhala}</Text>
        </View>
        <View style={cs.miniCard}>
          <Text style={cs.miniLabel}>Sun</Text>
          <Text style={cs.miniValue}>{data.sunSign?.english}</Text>
          <Text style={cs.miniSub}>{data.sunSign?.sinhala}</Text>
        </View>
      </View>
      <InfoRow label="Nakshatra" value={data.nakshatra?.name + ' (Pada ' + data.nakshatra?.pada + ')'} icon="star-outline" />
      <InfoRow label="Nak. Lord" value={data.nakshatra?.lord} icon="flash-outline" color="#FBBF24" />
      <InfoRow label="Lagna Element" value={(data.lagnaElement?.element || '').toUpperCase()} icon="flame-outline" />
      <InfoRow label="Traits" value={data.lagnaElement?.traits?.en || ''} icon="sparkles-outline" />
      <InfoRow label="Lagna Lord" value={data.lagnaLordPosition?.interpretation || ''} icon="locate-outline" color="#C084FC" />
      {data.overallStrength && (
        <View style={[cs.tagRow, { marginTop: 8 }]}>
          <Text style={cs.tagLabel}>1st House: </Text>
          <StrengthBadge strength={data.overallStrength} />
        </View>
      )}
    </View>
  );
}

function renderMarriage(data) {
  if (!data) return null;
  var h7 = data.seventhHouse;
  return (
    <View>
      <InfoRow label="7th House" value={(h7?.rashiEnglish || '') + ' (' + (h7?.rashi || '') + ')'} icon="heart-outline" color="#EC4899" />
      <InfoRow label="7th Lord" value={data.seventhLord?.name + ' in H' + data.seventhLord?.house} icon="locate-outline" />
      <InfoRow label="Venus" value={'House ' + (data.venus?.house || '?') + ' — ' + (data.venus?.rashi || '')} icon="rose-outline" color="#F9A8D4" />
      {h7 && <InfoRow label="Strength" value={h7.strength} icon="shield-checkmark-outline" />}
      <View style={[cs.alertBox, data.kujaDosha?.present ? cs.alertDanger : cs.alertSuccess]}>
        <Ionicons name={data.kujaDosha?.present ? 'warning-outline' : 'checkmark-circle-outline'} size={18} color={data.kujaDosha?.present ? '#EF4444' : '#10B981'} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={cs.alertTitle}>{data.kujaDosha?.present ? 'Kuja Dosha Detected' : 'No Kuja Dosha'}</Text>
          <Text style={cs.alertText}>{data.kujaDosha?.note}</Text>
        </View>
      </View>
      <Text style={cs.sectionLabel}>Spouse Qualities</Text>
      <Text style={cs.bodyText}>{data.spouseQualities}</Text>
      {data.marriageTimingIndicators && data.marriageTimingIndicators.length > 0 && (
        <View style={{ marginTop: 10 }}>
          <Text style={cs.sectionLabel}>Marriage Timing Indicators</Text>
          {data.marriageTimingIndicators.map(function(t, i) { return <Text key={i} style={cs.listItem}>• {t}</Text>; })}
        </View>
      )}
    </View>
  );
}

function renderCareer(data) {
  if (!data) return null;
  return (
    <View>
      <InfoRow label="10th Lord" value={data.tenthLord?.name + ' in H' + data.tenthLord?.house} icon="briefcase-outline" color="#F59E0B" />
      <InfoRow label="2nd Lord" value={(data.secondHouse?.rashiLord || '') + ' (wealth)'} icon="cash-outline" />
      <InfoRow label="11th Lord" value={(data.eleventhHouse?.rashiLord || '') + ' (gains)'} icon="trending-up-outline" color="#22C55E" />
      {data.businessVsService && <Text style={[cs.bodyText, { marginTop: 8 }]}>📋 {data.businessVsService}</Text>}
      {data.suggestedCareers && data.suggestedCareers.length > 0 && (
        <View style={{ marginTop: 10 }}>
          <Text style={cs.sectionLabel}>Suggested Career Paths</Text>
          <View style={cs.tagWrap}>
            {data.suggestedCareers.slice(0, 8).map(function(c, i) { return <TagPill key={i} text={c} color="rgba(245,158,11,0.15)" />; })}
          </View>
        </View>
      )}
      {data.dhanaYogas && data.dhanaYogas.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={cs.sectionLabel}>💰 Dhana Yogas (Wealth)</Text>
          {data.dhanaYogas.map(function(d, i) { return <Text key={i} style={cs.listItem}>• {d}</Text>; })}
        </View>
      )}
    </View>
  );
}

function renderChildren(data) {
  if (!data) return null;
  return (
    <View>
      <InfoRow label="5th Lord" value={data.fifthLord?.name + ' in H' + data.fifthLord?.house} icon="people-outline" color="#10B981" />
      <InfoRow label="Jupiter" value={'House ' + (data.jupiter?.house || '?')} icon="star-outline" color="#FBBF24" />
      <Text style={[cs.bodyText, { marginTop: 8 }]}>{data.assessment}</Text>
      {data.childrenTimingDasas && data.childrenTimingDasas.length > 0 && (
        <View style={{ marginTop: 10 }}>
          <Text style={cs.sectionLabel}>Timing Indicators</Text>
          {data.childrenTimingDasas.map(function(d, i) { return <Text key={i} style={cs.listItem}>• {d}</Text>; })}
        </View>
      )}
    </View>
  );
}

function renderLifePredictions(data) {
  if (!data) return null;
  return (
    <View>
      {data.currentDasha && (
        <View style={cs.highlight}>
          <Text style={cs.highlightLabel}>🔮 Current Mahadasha</Text>
          <Text style={cs.highlightValue}>{data.currentDasha.lord}</Text>
          <Text style={cs.highlightSub}>{data.currentDasha.period}</Text>
        </View>
      )}
      {data.currentDasha?.effects?.general && <Text style={cs.bodyText}>{data.currentDasha.effects.general}</Text>}
      {data.currentDasha?.effects?.career && <InfoRow label="Career" value={data.currentDasha.effects.career} icon="briefcase-outline" color="#F59E0B" />}
      {data.currentDasha?.effects?.health && <InfoRow label="Health" value={data.currentDasha.effects.health} icon="fitness-outline" color="#EF4444" />}
      {data.currentDasha?.effects?.relationship && <InfoRow label="Relations" value={data.currentDasha.effects.relationship} icon="heart-outline" color="#EC4899" />}
      {data.currentAntardasha && (
        <View style={[cs.highlight, { marginTop: 10, backgroundColor: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.2)' }]}>
          <Text style={cs.highlightLabel}>⏱ Current Antardasha (Sub-Period)</Text>
          <Text style={cs.highlightValue}>{data.currentAntardasha.lord}</Text>
          <Text style={cs.highlightSub}>{data.currentAntardasha.period}</Text>
        </View>
      )}
      {data.lifePhaseSummary && data.lifePhaseSummary.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={cs.sectionLabel}>Life Phases</Text>
          {data.lifePhaseSummary.map(function(p, i) {
            return <DashaBar key={i} lord={p.lord + ' (' + p.years + ' yrs)'} period={p.period} nature={p.isCurrent ? 'yogaKaraka' : 'neutral'} isCurrent={p.isCurrent} />;
          })}
        </View>
      )}
    </View>
  );
}

function renderMentalHealth(data) {
  if (!data) return null;
  return (
    <View>
      <InfoRow label="Mercury" value={'H' + (data.mercury?.house || '?') + ' — Score: ' + (data.mercury?.score || '?') + '/100'} icon="bulb-outline" color="#06B6D4" />
      <InfoRow label="Moon" value={'H' + (data.moon?.house || '?') + ' — Score: ' + (data.moon?.score || '?') + '/100'} icon="moon-outline" color="#C7D2FE" />
      <InfoRow label="4th Lord" value={data.education?.fourthLord + ' in H' + data.education?.fourthLordHouse} icon="school-outline" />
      <Text style={[cs.bodyText, { marginTop: 8 }]}>📚 {data.education?.assessment}</Text>
      <Text style={[cs.bodyText, { marginTop: 6 }]}>🧘 {data.mentalStability}</Text>
    </View>
  );
}

function renderBusiness(data) {
  if (!data) return null;
  return (
    <View>
      {data.tenthHouseStrength && <InfoRow label="10th H Bindus" value={data.tenthHouseStrength.bindus + ' — ' + data.tenthHouseStrength.assessment} icon="analytics-outline" color="#F97316" />}
      <Text style={[cs.bodyText, { marginTop: 6 }]}>{data.businessVsPartnership}</Text>
      {data.bestBusinessTypes && data.bestBusinessTypes.length > 0 && (
        <View style={{ marginTop: 10 }}>
          <Text style={cs.sectionLabel}>Best Business Types</Text>
          <View style={cs.tagWrap}>
            {data.bestBusinessTypes.map(function(b, i) { return <TagPill key={i} text={b} color="rgba(249,115,22,0.15)" />; })}
          </View>
        </View>
      )}
      {data.bestPeriods && data.bestPeriods.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={cs.sectionLabel}>Best Periods</Text>
          {data.bestPeriods.map(function(p, i) { return <Text key={i} style={cs.listItem}>• {p.lord}: {p.period} — {p.reason}</Text>; })}
        </View>
      )}
    </View>
  );
}

function renderTransits(data) {
  if (!data) return null;
  return (
    <View>
      <Text style={cs.dateBadge}>As of {data.date}</Text>
      {data.sun && (
        <View style={cs.transitRow}>
          <Text style={[cs.transitPlanet, { color: '#FBBF24' }]}>☉ Sun</Text>
          <Text style={cs.transitSign}>{data.sun.currentSign} → H{data.sun.houseFromLagna}</Text>
          <Text style={cs.transitEffect}>{data.sun.effect}</Text>
        </View>
      )}
      {data.jupiter && (
        <View style={cs.transitRow}>
          <Text style={[cs.transitPlanet, { color: '#FDE047' }]}>♃ Jupiter</Text>
          <Text style={cs.transitSign}>{data.jupiter.currentSign} → H{data.jupiter.houseFromLagna}</Text>
          <Text style={cs.transitEffect}>{data.jupiter.effect}</Text>
        </View>
      )}
      {data.saturn && (
        <View style={cs.transitRow}>
          <Text style={[cs.transitPlanet, { color: '#A5B4FC' }]}>♄ Saturn</Text>
          <Text style={cs.transitSign}>{data.saturn.currentSign} → H{data.saturn.houseFromLagna}</Text>
          <Text style={cs.transitEffect}>{data.saturn.effect}</Text>
        </View>
      )}
      {data.saturn?.sadheSati && (
        <View style={[cs.alertBox, data.saturn.sadheSati.active ? cs.alertDanger : cs.alertSuccess]}>
          <Ionicons name={data.saturn.sadheSati.active ? 'alert-circle-outline' : 'shield-checkmark-outline'} size={18} color={data.saturn.sadheSati.active ? '#EF4444' : '#10B981'} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={cs.alertTitle}>Sade Sati: {data.saturn.sadheSati.phase}</Text>
            <Text style={cs.alertText}>{data.saturn.sadheSati.note}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function renderRealEstate(data) {
  if (!data) return null;
  return (
    <View>
      <InfoRow label="4th Lord" value={data.fourthLord?.name + ' in H' + data.fourthLord?.house} icon="home-outline" color="#84CC16" />
      <InfoRow label="Mars" value={'House ' + (data.mars?.house || '?')} icon="hammer-outline" color="#F87171" />
      <InfoRow label="Saturn" value={'House ' + (data.saturn?.house || '?')} icon="construct-outline" color="#A5B4FC" />
      {data.propertyYoga && data.propertyYoga.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={cs.sectionLabel}>🏗 Property Indicators</Text>
          {data.propertyYoga.map(function(p, i) { return <Text key={i} style={cs.listItem}>• {p}</Text>; })}
        </View>
      )}
      {data.bestPeriodsForProperty && data.bestPeriodsForProperty.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={cs.sectionLabel}>Best Periods for Property</Text>
          {data.bestPeriodsForProperty.map(function(p, i) { return <Text key={i} style={cs.listItem}>• {p.lord}: {p.period}</Text>; })}
        </View>
      )}
    </View>
  );
}

function renderEmployment(data) {
  if (!data) return null;
  return (
    <View>
      <InfoRow label="10th Lord" value={data.tenthLord?.name + ' in H' + data.tenthLord?.house} icon="ribbon-outline" color="#EAB308" />
      <Text style={[cs.bodyText, { marginTop: 8 }]}>{data.serviceVsAuthority}</Text>
      {data.careerPaths && data.careerPaths.length > 0 && (
        <View style={{ marginTop: 10 }}>
          <Text style={cs.sectionLabel}>Career Paths</Text>
          <View style={cs.tagWrap}>
            {data.careerPaths.slice(0, 6).map(function(c, i) { return <TagPill key={i} text={c} color="rgba(234,179,8,0.15)" />; })}
          </View>
        </View>
      )}
      {data.promotionPeriods && data.promotionPeriods.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={cs.sectionLabel}>🚀 Promotion Periods</Text>
          {data.promotionPeriods.map(function(p, i) { return <Text key={i} style={cs.listItem}>• {p.lord}: {p.period} — {p.reason}</Text>; })}
        </View>
      )}
    </View>
  );
}

function renderFinancial(data) {
  if (!data) return null;
  return (
    <View>
      <InfoRow label="Income (2nd)" value={data.income?.secondLord?.name + ' in H' + data.income?.secondLord?.house} icon="cash-outline" color="#22C55E" />
      <InfoRow label="Gains (11th)" value={data.income?.eleventhLord?.name + ' in H' + data.income?.eleventhLord?.house} icon="trending-up-outline" color="#10B981" />
      <InfoRow label="Expenses (12th)" value={data.expenses?.twelfthLord?.name} icon="arrow-down-outline" color="#F97316" />
      {data.expenses?.note && <Text style={[cs.bodyText, { marginTop: 6 }]}>💸 {data.expenses.note}</Text>}
      {data.investmentAdvice && data.investmentAdvice.length > 0 && (
        <View style={{ marginTop: 10 }}>
          <Text style={cs.sectionLabel}>💡 Investment Advice</Text>
          {data.investmentAdvice.map(function(a, i) { return <Text key={i} style={cs.listItem}>• {a}</Text>; })}
        </View>
      )}
      {data.losses?.riskPeriods && data.losses.riskPeriods.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={cs.sectionLabel}>⚠️ Risk Periods</Text>
          {data.losses.riskPeriods.map(function(p, i) { return <Text key={i} style={cs.listItem}>• {p.lord}: {p.period} — {p.reason}</Text>; })}
        </View>
      )}
    </View>
  );
}

function renderTimeline(data) {
  if (!data) return null;
  return (
    <View>
      <Text style={cs.dateBadge}>{data.from} → {data.to}</Text>
      {(data.periods || []).map(function(p, i) {
        return (
          <View key={i} style={{ marginBottom: 12 }}>
            <DashaBar lord={p.mahadasha + ' Mahadasha'} period={p.period} nature={p.nature} isCurrent={i === 0} />
            <Text style={[cs.bodyText, { marginLeft: 16, marginBottom: 4 }]}>{p.overallTone}</Text>
            {(p.antardashas || []).slice(0, 4).map(function(ad, j) {
              return (
                <View key={j} style={cs.adRow}>
                  <View style={[cs.adDot, { backgroundColor: ad.nature === 'benefic' ? '#10B981' : ad.nature === 'malefic' ? '#EF4444' : '#6366F1' }]} />
                  <Text style={cs.adLord}>{ad.lord}</Text>
                  <Text style={cs.adPeriod}>{ad.period}</Text>
                </View>
              );
            })}
            {(p.antardashas || []).length > 4 && <Text style={cs.moreText}>+ {p.antardashas.length - 4} more sub-periods</Text>}
          </View>
        );
      })}
    </View>
  );
}

function renderRemedies(data) {
  if (!data) return null;
  return (
    <View>
      <View style={cs.highlight}>
        <Text style={cs.highlightLabel}>💎 Lagna Gemstone</Text>
        <Text style={cs.highlightValue}>{data.lagnaGem}</Text>
      </View>
      <InfoRow label="Lucky Color" value={data.lagnaColor} icon="color-palette-outline" color="#FBBF24" />
      <InfoRow label="Lucky Day" value={data.lagnaDay} icon="calendar-outline" color="#C084FC" />
      {data.yogaKaraka && (
        <View style={[cs.alertBox, cs.alertSuccess, { marginTop: 10 }]}>
          <Ionicons name="star-outline" size={18} color="#FBBF24" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={cs.alertTitle}>Yoga Karaka: {data.yogaKaraka.planet}</Text>
            <Text style={cs.alertText}>{data.yogaKaraka.note}</Text>
          </View>
        </View>
      )}
      {data.weakPlanetRemedies && data.weakPlanetRemedies.length > 0 && (
        <View style={{ marginTop: 10 }}>
          <Text style={cs.sectionLabel}>🔧 Weak Planet Remedies</Text>
          {data.weakPlanetRemedies.map(function(r, i) {
            return (
              <View key={i} style={cs.remedyCard}>
                <Text style={cs.remedyPlanet}>{r.planet} (Score: {r.score}/100)</Text>
                <InfoRow label="Gem" value={r.gem} icon="diamond-outline" />
                <InfoRow label="Color" value={r.color} icon="color-palette-outline" />
                <InfoRow label="Day" value={r.day} icon="calendar-outline" />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

var RENDERERS = {
  yogaAnalysis: renderYogas,
  personality: renderPersonality,
  marriage: renderMarriage,
  career: renderCareer,
  children: renderChildren,
  lifePredictions: renderLifePredictions,
  mentalHealth: renderMentalHealth,
  business: renderBusiness,
  transits: renderTransits,
  realEstate: renderRealEstate,
  employment: renderEmployment,
  financial: renderFinancial,
  timeline25: renderTimeline,
  remedies: renderRemedies,
};

// ══════════════════════════════════════════
// COLLAPSIBLE SECTION CARD
// ══════════════════════════════════════════
function SectionCard({ sectionKey, data, index, t, aiNarrative, viewMode }) {
  var [expanded, setExpanded] = useState(index < 3); // First 3 open by default
  var meta = SECTION_META[sectionKey] || {};
  var title = aiNarrative?.title || t(SECTION_TITLES[sectionKey]) || sectionKey;
  var renderer = RENDERERS[sectionKey];

  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 60).duration(600)}>
      <TouchableOpacity activeOpacity={0.85} onPress={function() { setExpanded(!expanded); }}>
        <AuraBox style={{ padding: 0 }}>
          {/* Header */}
          <View style={sc.header}>
            <LinearGradient
              colors={meta.colors || ['#333', '#111']}
              style={sc.iconBg}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Text style={sc.emoji}>{meta.emoji || '📋'}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={sc.title}>{title}</Text>
              {data?.sinhala && <Text style={sc.sinhala}>{data.sinhala}</Text>}
            </View>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="rgba(255,255,255,0.5)" />
          </View>
          {/* Content */}
          {expanded && (
            <View style={sc.content}>
              <View style={sc.divider} />
              {/* AI Narrative Mode */}
              {viewMode === 'ai' && aiNarrative?.narrative ? (
                <View style={sc.narrativeWrap}>
                  <MarkdownText>{aiNarrative.narrative}</MarkdownText>
                </View>
              ) : (
                /* Technical Mode - original renderers */
                renderer ? renderer(data) : null
              )}
            </View>
          )}
        </AuraBox>
      </TouchableOpacity>
    </Animated.View>
  );
}

var sc = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  iconBg: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  emoji: { fontSize: 20 },
  title: { color: '#F1F5F9', fontSize: 15, fontWeight: '700' },
  sinhala: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  content: { paddingHorizontal: 16, paddingBottom: 16 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 12 },
  narrative: { color: '#CBD5E1', fontSize: 14, lineHeight: 24, letterSpacing: 0.2 },
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
    { text: '🌌 Reading the celestial map...', sub: 'Mapping planetary positions at your birth moment' },
    { text: '🪐 Analyzing planetary alignments...', sub: 'Calculating aspects, yogas & dasha periods' },
    { text: '✨ The stars are revealing secrets...', sub: 'AI is weaving your personal narrative' },
    { text: '🔮 Channeling ancient wisdom...', sub: 'Blending Vedic knowledge with your unique chart' },
    { text: '📜 Writing your cosmic story...', sub: 'Almost there — crafting each chapter of your life' },
  ],
  si: [
    { text: '🌌 ග්‍රහ මණ්ඩලය කියවමින්...', sub: 'ඔයාගේ උපන් මොහොතේ ග්‍රහ පිහිටීම් සොයමින්' },
    { text: '🪐 ග්‍රහ පිහිටීම් විශ්ලේෂණය කරමින්...', sub: 'යෝග, දශා සහ දෘෂ්ටි ගණනය කරමින්' },
    { text: '✨ තරු රහස් හෙළිදරව් කරමින්...', sub: 'AI එකෙන් ඔයාගේ කතාව ලියමින්' },
    { text: '🔮 පුරාණ ඥානය නාලිකා ගත කරමින්...', sub: 'වෛදික ඥානය ඔයාගේ කේන්දරේ එක්ක මිශ්‍ර කරමින්' },
    { text: '📜 ඔයාගේ තාරකා කතාව ලියමින්...', sub: 'ඉවරවෙන්න ආසන්නයි — ජීවිතේ සෑම පරිච්ඡේදයක්ම ලියමින්' },
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
    ? (userName ? 'පොඩ්ඩක් ඉන්න ' + userName + '! ඔයාගේ කේන්දර කතාව ලියමින්... ✨' : 'ඔයාගේ කේන්දර කතාව ලියමින්... ✨')
    : (userName ? 'Hold tight, ' + userName + '! Your cosmic blueprint is being written... ✨' : 'Your cosmic blueprint is being written... ✨');

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
  var { t, language: appLanguage } = useLanguage();
  var [birthDate, setBirthDate] = useState('1998-10-09');
  var [birthTime, setBirthTime] = useState('09:16');
  var [birthLocation, setBirthLocation] = useState('Colombo');
  var [birthLat, setBirthLat] = useState(6.9271);
  var [birthLng, setBirthLng] = useState(79.8612);
  var [reportLang, setReportLang] = useState('en');
  var [userName, setUserName] = useState('');
  var [userGender, setUserGender] = useState(null);
  var [report, setReport] = useState(null);
  var [aiReport, setAiReport] = useState(null);
  var [chartData, setChartData] = useState(null);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState(null);
  var [viewMode, setViewMode] = useState('ai');
  // Flow states: 'form' -> 'gender-guess' -> 'loading' -> 'report'
  var [screenState, setScreenState] = useState('form');
  var [genderPrediction, setGenderPrediction] = useState(null);

  // ── Core generation function (defined first to avoid stale closures) ──
  var startFullGeneration = async function(dateStr, gender) {
    try {
      setScreenState('loading');
      setLoading(true);

      // Fire raw report + AI in parallel (chart already fetched)
      var [rawRes, aiRes] = await Promise.all([
        api.getFullReport(dateStr, birthLat, birthLng),
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
        setViewMode('ai');
      } else {
        setViewMode('technical');
      }
      setScreenState('report');
    } catch (err) {
      setError(err.message || 'Failed to generate report');
      setScreenState('form');
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
      var chartRes = await api.getBirthChart(dateStr, birthLat, birthLng);
      if (chartRes.data) {
        setChartData(chartRes.data);
        if (chartRes.data.genderPrediction) {
          setGenderPrediction(chartRes.data.genderPrediction);
          setScreenState('gender-guess');
        } else {
          // No prediction available, skip to loading
          startFullGeneration(dateStr, null);
        }
      } else {
        setError('Failed to read birth chart');
      }
    } catch (err) {
      setError(err.message || 'Failed to read birth chart');
    }
  };

  // Step 2: Gender confirmed → fire full AI generation
  var handleGenderConfirm = function(confirmedGender) {
    setUserGender(confirmedGender);
    var dateStr = birthDate + 'T' + birthTime + ':00';
    startFullGeneration(dateStr, confirmedGender);
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
                ? (userName ? userName + 'ගේ කේන්දර වාර්තාව ✨' : '✨ ඔයාගේ කේන්දර වාර්තාව')
                : (userName ? userName + '\'s Cosmic Report' : '✨ Your Cosmic Report')
            }</Text>
            <Text style={s.subtitle}>{birthLocation} • {birthDate} • {birthTime}</Text>
          </Animated.View>

          {/* New Report Button */}
          <Animated.View entering={FadeIn.delay(100).duration(400)}>
            <TouchableOpacity style={s.newReportBtn} onPress={handleNewReport} activeOpacity={0.8}>
              <Ionicons name="refresh" size={16} color="#C084FC" style={{ marginRight: 6 }} />
              <Text style={s.newReportText}>{reportLang === 'si' ? 'අලුත් රිපෝට් එකක්' : 'Generate New Report'}</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* View Mode Toggle */}
          {aiReport && (
            <Animated.View entering={FadeIn.delay(150).duration(400)}>
              <View style={s.toggleRow}>
                <TouchableOpacity
                  style={[s.toggleBtn, viewMode === 'ai' && s.toggleActive]}
                  onPress={function() { setViewMode('ai'); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="sparkles" size={16} color={viewMode === 'ai' ? '#fff' : '#94A3B8'} />
                  <Text style={[s.toggleText, viewMode === 'ai' && s.toggleTextActive]}>{reportLang === 'si' ? 'ඔයාගේ කතාව' : 'Your Story'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.toggleBtn, viewMode === 'technical' && s.toggleActive]}
                  onPress={function() { setViewMode('technical'); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="analytics" size={16} color={viewMode === 'technical' ? '#fff' : '#94A3B8'} />
                  <Text style={[s.toggleText, viewMode === 'technical' && s.toggleTextActive]}>{reportLang === 'si' ? 'තාක්ෂණික' : 'Technical'}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* Birth Summary Header */}
          {report.birthData && (
            <Animated.View entering={FadeInDown.delay(200).duration(600)}>
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
                    <Text style={s.birthLagna}>{userName ? userName + ' — ' : ''}{report.birthData.lagna?.english} Lagna</Text>
                    <Text style={s.birthSinhala}>{report.birthData.lagna?.sinhala} ලග්නය</Text>
                    <Text style={s.birthSub}>
                      Moon: {report.birthData.moonSign?.english} • Sun: {report.birthData.sunSign?.english}
                    </Text>
                    <Text style={s.birthSub}>
                      {report.birthData.nakshatra?.name} Nakshatra (Pada {report.birthData.nakshatra?.pada})
                    </Text>
                  </View>
                </View>
                {report.birthData.panchanga && (
                  <View style={s.panchangaRow}>
                    <View style={s.panchangaItem}>
                      <Text style={s.panchangaLabel}>Tithi</Text>
                      <Text style={s.panchangaValue}>{report.birthData.panchanga.tithi}</Text>
                    </View>
                    <View style={s.panchangaItem}>
                      <Text style={s.panchangaLabel}>Yoga</Text>
                      <Text style={s.panchangaValue}>{report.birthData.panchanga.yoga}</Text>
                    </View>
                    <View style={s.panchangaItem}>
                      <Text style={s.panchangaLabel}>Karana</Text>
                      <Text style={s.panchangaValue}>{report.birthData.panchanga.karana}</Text>
                    </View>
                    <View style={s.panchangaItem}>
                      <Text style={s.panchangaLabel}>Vaara</Text>
                      <Text style={s.panchangaValue}>{report.birthData.panchanga.vaara}</Text>
                    </View>
                  </View>
                )}
              </AuraBox>
            </Animated.View>
          )}

          {/* Birth Chart (Sri Lankan Kendara) */}
          {chartData && chartData.rashiChart && (
            <Animated.View entering={FadeInDown.delay(300).duration(700)}>
              <AuraBox style={{ borderColor: 'rgba(147,51,234,0.2)' }}>
                <View style={s.chartHeader}>
                  <Text style={s.chartTitle}>🏛️ Rashi Kendara Chart</Text>
                  <Text style={s.chartSub}>Traditional Sri Lankan birth chart</Text>
                </View>
                <SriLankanChart
                  rashiChart={chartData.rashiChart}
                  lagnaRashiId={chartData.lagna?.rashiId || chartData.rashiChart?.[0]?.rashiId || 1}
                  language={appLanguage}
                />
              </AuraBox>
            </Animated.View>
          )}

          {/* Report Sections */}
          {report.sections && (
            SECTION_KEYS.map(function(key, index) {
              var sectionData = report.sections[key];
              if (!sectionData) return null;
              var aiNarrative = aiReport?.narrativeSections?.[key] || null;
              return <SectionCard key={key} sectionKey={key} data={sectionData} index={index} t={t} aiNarrative={aiNarrative} viewMode={aiReport ? viewMode : 'technical'} />;
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
          </AuraBox>
        </Animated.View>

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

        <View style={{ height: 120 }} />
      </ScrollView>
    </CosmicBackground>
  );
}

// ══════════════════════════════════════════
// CONTENT STYLES (shared across renderers)
// ══════════════════════════════════════════
var cs = StyleSheet.create({
  summary: { color: '#CBD5E1', fontSize: 13, lineHeight: 20, marginBottom: 10 },
  highlight: { backgroundColor: 'rgba(251,191,36,0.08)', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(251,191,36,0.15)' },
  highlightLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  highlightValue: { color: '#FBBF24', fontSize: 20, fontWeight: '800' },
  highlightSub: { color: '#94A3B8', fontSize: 11, marginTop: 4 },
  yogaCard: { backgroundColor: 'rgba(147,51,234,0.08)', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(147,51,234,0.12)' },
  yogaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  yogaName: { color: '#C084FC', fontSize: 14, fontWeight: '700' },
  yogaDesc: { color: '#94A3B8', fontSize: 12, lineHeight: 18 },
  tagRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 4 },
  tagLabel: { color: '#64748B', fontSize: 11, fontWeight: '600', marginRight: 6 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  sectionLabel: { color: '#CBD5E1', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  bodyText: { color: '#94A3B8', fontSize: 12, lineHeight: 19 },
  listItem: { color: '#94A3B8', fontSize: 12, lineHeight: 20, paddingLeft: 4, marginBottom: 4 },
  row3: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  miniCard: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 10, marginHorizontal: 3 },
  miniLabel: { color: '#64748B', fontSize: 10, fontWeight: '600', marginBottom: 4 },
  miniValue: { color: '#F1F5F9', fontSize: 14, fontWeight: '700' },
  miniSub: { color: '#94A3B8', fontSize: 10, marginTop: 2 },
  alertBox: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: 14, marginTop: 10, borderWidth: 1 },
  alertDanger: { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' },
  alertSuccess: { backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)' },
  alertTitle: { color: '#F1F5F9', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  alertText: { color: '#94A3B8', fontSize: 11, lineHeight: 17 },
  dateBadge: { color: '#64748B', fontSize: 11, fontWeight: '600', backgroundColor: 'rgba(255,255,255,0.04)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 10 },
  transitRow: { marginBottom: 10 },
  transitPlanet: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  transitSign: { color: '#CBD5E1', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  transitEffect: { color: '#94A3B8', fontSize: 11 },
  adRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingLeft: 24 },
  adDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  adLord: { color: '#CBD5E1', fontSize: 12, fontWeight: '600', width: 70 },
  adPeriod: { color: '#64748B', fontSize: 11, flex: 1 },
  moreText: { color: '#475569', fontSize: 11, fontStyle: 'italic', paddingLeft: 38, marginTop: 2 },
  remedyCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  remedyPlanet: { color: '#F1F5F9', fontSize: 13, fontWeight: '700', marginBottom: 6 },
});

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
  toggleRow: { flexDirection: 'row', marginBottom: 16, backgroundColor: 'rgba(15,10,35,0.6)', borderRadius: 14, padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 11, gap: 6 },
  toggleActive: { backgroundColor: 'rgba(147,51,234,0.3)', borderWidth: 1, borderColor: 'rgba(147,51,234,0.4)' },
  toggleText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
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
