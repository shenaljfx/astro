import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

var FACTOR_ICONS = {
  'Venus-Mars Spark': 'flame',
  '7th House Resonance': 'people',
  'Nakshatra Lord Affinity': 'pulse',
  'Rahu-Ketu Karmic Axis': 'infinite',
  'Moon Emotional Sync': 'moon',
};

var FACTOR_COLORS = {
  'Venus-Mars Spark': '#FF6B9D',
  '7th House Resonance': '#FFB800',
  'Nakshatra Lord Affinity': '#4CC9F0',
  'Rahu-Ketu Karmic Axis': '#B47AFF',
  'Moon Emotional Sync': '#00FFB3',
};

export default function MagnetismCard({ magnetism, language }) {
  if (!magnetism) return null;

  var lang = language || 'en';
  var percentage = magnetism.percentage || 0;
  var rating = magnetism.rating || {};
  var factors = magnetism.factors || [];
  var summary = magnetism.summary || {};
  var strongest = magnetism.strongestFactor || {};

  return (
    <Animated.View entering={FadeInDown.delay(200).springify()}>
      <View style={st.card}>
        <LinearGradient
          colors={['rgba(255,107,157,0.08)', '#0E0A12', 'rgba(180,122,255,0.05)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />

        {/* Header */}
        <View style={st.headerRow}>
          <View style={st.iconCircle}>
            <Ionicons name="magnet-outline" size={15} color="#FF6B9D" />
          </View>
          <View style={st.headerTextBlock}>
            <Text style={st.headerLabel}>{lang === 'si' ? 'ආකර්ෂණ චුම්බකත්වය' : 'ATTRACTION MAGNETISM'}</Text>
            <Text style={st.headerSub}>{lang === 'si' ? 'ආකර්ෂණ නීතිය මත පදනම්ව' : 'Based on Law of Attraction'}</Text>
          </View>
        </View>

        {/* Big score */}
        <View style={st.scoreSection}>
          <View style={st.scoreBig}>
            <Text style={st.scoreEmoji}>{rating.emoji || '✨'}</Text>
            <Text style={st.scorePercent}>{percentage}%</Text>
            <Text style={st.scoreLabel}>{lang === 'si' ? 'චුම්බක ඇදීම' : 'Magnetic Pull'}</Text>
          </View>
          <Text style={st.ratingText}>{lang === 'si' ? rating.si : rating.en}</Text>
        </View>

        {/* Factors */}
        <View style={st.factorsSection}>
          {factors.map(function (factor, i) {
            var pct = Math.round((factor.score / factor.maxScore) * 100);
            var color = FACTOR_COLORS[factor.name] || '#FFB800';
            var icon = FACTOR_ICONS[factor.name] || 'star';
            var detail = factor.details && factor.details[0];

            return (
              <Animated.View key={factor.name} entering={FadeInDown.delay(300 + i * 80).springify()}>
                <View style={st.factorRow}>
                  <View style={st.factorHeader}>
                    <View style={[st.factorIcon, { borderColor: color + '30' }]}>
                      <Ionicons name={icon} size={14} color={color} />
                    </View>
                    <View style={st.factorInfo}>
                      <Text style={st.factorName}>{lang === 'si' ? factor.nameSi : factor.nameEn}</Text>
                      <View style={st.factorBarTrack}>
                        <View style={[st.factorBarFill, { width: pct + '%', backgroundColor: color }]} />
                      </View>
                    </View>
                    <Text style={[st.factorScore, { color: color }]}>{factor.score}/{factor.maxScore}</Text>
                  </View>
                  {detail && (
                    <Text style={st.factorDetail}>{lang === 'si' ? detail.si : detail.en}</Text>
                  )}
                </View>
              </Animated.View>
            );
          })}
        </View>

        {/* Summary */}
        <View style={st.summaryBox}>
          <Ionicons name="sparkles" size={14} color="rgba(255,184,0,0.50)" />
          <Text style={st.summaryText}>{lang === 'si' ? summary.si : summary.en}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

var st = StyleSheet.create({
  card: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(255,107,157,0.15)',
    padding: 20, paddingBottom: 16, marginTop: 16,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18,
  },
  iconCircle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,107,157,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,107,157,0.25)',
  },
  headerTextBlock: { flex: 1 },
  headerLabel: {
    color: 'rgba(255,107,157,0.70)', fontSize: 12, fontWeight: '800',
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  headerSub: {
    color: 'rgba(244,228,188,0.30)', fontSize: 10, fontWeight: '500', marginTop: 2,
  },
  scoreSection: {
    alignItems: 'center', marginBottom: 20,
  },
  scoreBig: {
    alignItems: 'center', marginBottom: 6,
  },
  scoreEmoji: {
    fontSize: 28, marginBottom: 4,
  },
  scorePercent: {
    fontSize: 42, fontWeight: '900', color: '#F4E4BC', letterSpacing: -1,
  },
  scoreLabel: {
    fontSize: 11, fontWeight: '600', color: 'rgba(244,228,188,0.40)',
    letterSpacing: 1, textTransform: 'uppercase', marginTop: -2,
  },
  ratingText: {
    fontSize: 16, fontWeight: '800', color: '#FF6B9D', letterSpacing: 0.5,
  },
  factorsSection: {
    gap: 12, marginBottom: 16,
  },
  factorRow: {
    gap: 6,
  },
  factorHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  factorIcon: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
  },
  factorInfo: {
    flex: 1, gap: 4,
  },
  factorName: {
    color: 'rgba(244,228,188,0.60)', fontSize: 11, fontWeight: '700', letterSpacing: 0.3,
  },
  factorBarTrack: {
    height: 5, borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  factorBarFill: {
    height: '100%', borderRadius: 2.5,
  },
  factorScore: {
    fontSize: 12, fontWeight: '800', minWidth: 34, textAlign: 'right',
  },
  factorDetail: {
    color: 'rgba(244,228,188,0.35)', fontSize: 11, fontWeight: '500',
    lineHeight: 16, marginLeft: 38,
    fontStyle: 'italic',
  },
  summaryBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,184,0,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.10)',
  },
  summaryText: {
    flex: 1, color: 'rgba(244,228,188,0.50)', fontSize: 12, fontWeight: '600',
    lineHeight: 18,
  },
});
