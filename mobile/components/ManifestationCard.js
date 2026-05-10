import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

var SCORE_COLORS = {
  high: { bar: '#10B981', glow: 'rgba(16,185,129,0.30)', text: '#34D399' },
  medium: { bar: '#FFB800', glow: 'rgba(255,184,0,0.30)', text: '#FFD666' },
  low: { bar: '#EF4444', glow: 'rgba(239,68,68,0.30)', text: '#FCA5A5' },
};

var FOCUS_ICONS = {
  career: 'briefcase-outline',
  love: 'heart-outline',
  emotional: 'water-outline',
  courage: 'flame-outline',
  communication: 'chatbubbles-outline',
  wealth: 'diamond-outline',
  discipline: 'shield-outline',
};

export default function ManifestationCard({ manifestation, language }) {
  if (!manifestation) return null;

  var lang = language || 'en';
  var score = manifestation.score || 0;
  var rating = manifestation.rating || {};
  var phase = manifestation.phase || {};
  var focus = manifestation.focus || {};
  var breakdown = manifestation.breakdown || {};
  var tips = manifestation.tips || {};

  var scoreLevel = score >= 65 ? 'high' : score >= 40 ? 'medium' : 'low';
  var colors = SCORE_COLORS[scoreLevel];

  var primaryFocus = focus.primary || {};
  var secondaryFocus = focus.secondary || null;
  var primaryIcon = FOCUS_ICONS[primaryFocus.area] || 'star-outline';

  return (
    <Animated.View entering={FadeInDown.delay(400).springify()}>
      <View style={st.card}>
        <LinearGradient
          colors={['rgba(16,185,129,0.06)', '#0E0A12', 'rgba(0,255,179,0.03)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />

        {/* Header */}
        <View style={st.headerRow}>
          <View style={st.iconCircle}>
            <Ionicons name="prism-outline" size={14} color="#00FFB3" />
          </View>
          <Text style={st.headerLabel}>{lang === 'si' ? 'ප්‍රකාශන බලය' : 'MANIFESTATION POWER'}</Text>
        </View>

        {/* Score circle + rating */}
        <View style={st.scoreRow}>
          <View style={st.scoreCircle}>
            <View style={[st.scoreRing, { borderColor: colors.bar }]}>
              <Text style={[st.scoreNum, { color: colors.text }]}>{score}</Text>
              <Text style={st.scoreMax}>/100</Text>
            </View>
          </View>
          <View style={st.ratingBlock}>
            <Text style={[st.ratingText, { color: colors.text }]}>{lang === 'si' ? rating.si : rating.en}</Text>
            <Text style={st.phaseText}>{lang === 'si' ? phase.si : phase.en}</Text>
          </View>
        </View>

        {/* Breakdown bars */}
        <View style={st.breakdownSection}>
          {Object.keys(breakdown).map(function (key) {
            var item = breakdown[key];
            var pct = Math.round((item.score / item.max) * 100);
            return (
              <View key={key} style={st.barRow}>
                <Text style={st.barLabel}>{item.label}</Text>
                <View style={st.barTrack}>
                  <View style={[st.barFill, { width: pct + '%', backgroundColor: colors.bar }]} />
                </View>
                <Text style={[st.barValue, { color: colors.text }]}>{item.score}</Text>
              </View>
            );
          })}
        </View>

        {/* Focus recommendation */}
        <View style={st.focusRow}>
          <View style={st.focusBadge}>
            <Ionicons name={primaryIcon} size={14} color="#00FFB3" />
            <Text style={st.focusLabel}>
              {lang === 'si' ? 'අද අවධානය: ' : 'Today\'s Focus: '}
              <Text style={st.focusValue}>{lang === 'si' ? primaryFocus.si : primaryFocus.en}</Text>
            </Text>
          </View>
          {secondaryFocus && (
            <View style={[st.focusBadge, st.focusBadgeSecondary]}>
              <Ionicons name={FOCUS_ICONS[secondaryFocus.area] || 'star-outline'} size={12} color="rgba(244,228,188,0.50)" />
              <Text style={st.focusLabelSecondary}>{lang === 'si' ? secondaryFocus.si : secondaryFocus.en}</Text>
            </View>
          )}
        </View>

        {/* Tip */}
        <View style={st.tipBox}>
          <Ionicons name="bulb-outline" size={13} color="rgba(255,184,0,0.45)" />
          <Text style={st.tipText}>{lang === 'si' ? tips.si : tips.en}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

var st = StyleSheet.create({
  card: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(0,255,179,0.12)',
    padding: 20, paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16,
  },
  iconCircle: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,255,179,0.08)',
    borderWidth: 1, borderColor: 'rgba(0,255,179,0.20)',
  },
  headerLabel: {
    color: 'rgba(0,255,179,0.55)', fontSize: 11, fontWeight: '800',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  scoreRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 18,
  },
  scoreCircle: {
    alignItems: 'center', justifyContent: 'center',
  },
  scoreRing: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.30)',
  },
  scoreNum: {
    fontSize: 26, fontWeight: '900', letterSpacing: -0.5,
  },
  scoreMax: {
    fontSize: 10, color: 'rgba(244,228,188,0.30)', fontWeight: '600', marginTop: -2,
  },
  ratingBlock: {
    flex: 1,
  },
  ratingText: {
    fontSize: 18, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4,
  },
  phaseText: {
    color: 'rgba(244,228,188,0.50)', fontSize: 12, fontWeight: '500', lineHeight: 18,
  },
  breakdownSection: {
    gap: 8, marginBottom: 16,
  },
  barRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  barLabel: {
    color: 'rgba(244,228,188,0.40)', fontSize: 10, fontWeight: '600',
    width: 70, letterSpacing: 0.3,
  },
  barTrack: {
    flex: 1, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%', borderRadius: 3,
  },
  barValue: {
    fontSize: 10, fontWeight: '700', width: 20, textAlign: 'right',
  },
  focusRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12,
  },
  focusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
    backgroundColor: 'rgba(0,255,179,0.06)',
    borderWidth: 1, borderColor: 'rgba(0,255,179,0.15)',
  },
  focusBadgeSecondary: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  focusLabel: {
    color: 'rgba(244,228,188,0.50)', fontSize: 11, fontWeight: '600',
  },
  focusValue: {
    color: '#00FFB3', fontWeight: '800',
  },
  focusLabelSecondary: {
    color: 'rgba(244,228,188,0.40)', fontSize: 11, fontWeight: '500',
  },
  tipBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,184,0,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.10)',
  },
  tipText: {
    flex: 1, color: 'rgba(244,228,188,0.45)', fontSize: 12, fontWeight: '500',
    lineHeight: 18,
  },
});
