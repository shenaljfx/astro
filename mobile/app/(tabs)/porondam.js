import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Platform, ActivityIndicator, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import CosmicBackground from '../../components/CosmicBackground';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../services/api';

function AuraBox({ children, style }) {
  return (
    <View style={[gs.box, style]}>
      <LinearGradient
        colors={['rgba(80, 20, 50, 0.4)', 'rgba(30, 10, 30, 0.6)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      <View style={gs.innerGlow} />
      {children}
    </View>
  );
}
var gs = StyleSheet.create({
  box: {
    borderRadius: 24, overflow: 'hidden', borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.15)', padding: 20, marginBottom: 16,
    shadowColor: '#f43f5e', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 24,
  }
});

function ScoreRing({ score, maxScore }) {
  var pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  var color = pct >= 75 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#ef4444';
  return (
    <View style={s.scoreRing}>
      <View style={s.ringCircle}>
        <LinearGradient colors={['rgba(244, 63, 94, 0.2)', 'transparent']} style={StyleSheet.absoluteFill} />
        <Text style={[s.scoreNum, { color: color }]}>{pct}%</Text>
        <Text style={s.scoreLabel}>{score}/{maxScore} PRANA</Text>
      </View>
    </View>
  );
}

export default function PorondamScreen() {
  var { t } = useLanguage();
  var [brideBirth, setBrideBirth] = useState('1995-06-15');
  var [groomBirth, setGroomBirth] = useState('1993-03-20');
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState(null);

  var check = useCallback(async function() {
    try {
      setLoading(true);
      setError(null);
      var res = await api.checkPorondam(brideBirth, groomBirth);
      setData(res.data);
    } catch (err) {
      setError(err.message || t('cosmicConnectionFailed'));
    } finally {
      setLoading(false);
    }
  }, [brideBirth, groomBirth, t]);

  var shareResult = async function() {
    if (!data) return;
    try {
      await Share.share({
        message: 'Cosmic Harmony Score: ' + data.totalScore + '/' + data.maxPossibleScore +
          ' (' + data.percentage + '%) - ' + data.rating + ' ' + (data.ratingEmoji || ''),
      });
    } catch (e) {}
  };

  return (
    <CosmicBackground>
      <ScrollView
        style={s.flex}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(800)}>
          <Text style={s.title}>{t('cosmicHarmony')}</Text>
          <Text style={s.subtitle}>{t('deepSoulConnection')}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(800)}>
          <AuraBox>
            <View style={s.inputRow}>
              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>{t('feminineEnergy')}</Text>
                <TextInput
                  style={s.input}
                  value={brideBirth}
                  onChangeText={setBrideBirth}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
              </View>
              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>{t('masculineEnergy')}</Text>
                <TextInput
                  style={s.input}
                  value={groomBirth}
                  onChangeText={setGroomBirth}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
              </View>
            </View>
            <TouchableOpacity style={s.btn} onPress={check} disabled={loading}>
              <LinearGradient
                colors={['#f43f5e', '#be123c']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              />
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.btnText}>{t('revealDestinies')}</Text>
              )}
            </TouchableOpacity>
          </AuraBox>
        </Animated.View>

        {error && (
          <AuraBox>
            <Text style={s.errorText}>{error}</Text>
          </AuraBox>
        )}

        {data && !loading && (
          <View>
            <Animated.View entering={FadeInDown.delay(300).duration(800)}>
              <AuraBox>
                <ScoreRing score={data.totalScore} maxScore={data.maxPossibleScore} />
                <Text style={s.ratingText}>
                  {data.ratingEmoji || ''} {t(data.rating) || data.rating || t('unionResult')}
                </Text>
                {data.ratingSinhala && (
                  <Text style={s.ratingSinhala}>{data.ratingSinhala}</Text>
                )}
                {data.recommendation && (
                  <Text style={s.recommendation}>{data.recommendation}</Text>
                )}
                <TouchableOpacity style={s.shareBtn} onPress={shareResult}>
                  <Ionicons name="sparkles" size={16} color="#fda4af" />
                  <Text style={s.shareBtnText}>{t('shareAlignment')}</Text>
                </TouchableOpacity>
              </AuraBox>
            </Animated.View>

            {data.factors && data.factors.length > 0 && (
              <Animated.View entering={FadeInDown.delay(400).duration(800)}>
                <AuraBox>
                  <Text style={s.secTitle}>{t('sacredBindings')}</Text>
                  {data.factors.map(function(f, i) {
                    var pct = f.maxScore > 0 ? (f.score / f.maxScore) : 0;
                    var barColor = pct >= 0.75 ? '#34d399' : pct >= 0.5 ? '#fbbf24' : '#ef4444';
                    return (
                      <View key={i} style={s.factorRow}>
                        <View style={s.factorHeader}>
                          <Text style={s.factorName}> {f.name}</Text>
                          <Text style={s.factorScore}>{f.score}/{f.maxScore}</Text>
                        </View>
                        <View style={s.barBg}>
                          <View style={[s.barFill, { width: (pct * 100) + '%', backgroundColor: barColor }]} />
                        </View>
                        {f.description && (
                          <Text style={s.factorDesc}>{f.description}</Text>
                        )}
                      </View>
                    );
                  })}
                </AuraBox>
              </Animated.View>
            )}

            {data.doshas && data.doshas.length > 0 && (
              <Animated.View entering={FadeInDown.delay(500).duration(800)}>
                <AuraBox>
                  <Text style={s.secTitle}>{t('karmicShadows')}</Text>
                  {data.doshas.map(function(d, i) {
                    return (
                      <View key={i} style={s.doshaRow}>
                        <Ionicons name="flame" size={18} color="#ef4444" style={{ marginTop: 2 }} />
                        <Text style={s.doshaText}>{typeof d === 'string' ? d : (d.name || d.description || JSON.stringify(d))}</Text>
                      </View>
                    );
                  })}
                </AuraBox>
              </Animated.View>
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </CosmicBackground>
  );
}

var s = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 110 : 90 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 4, textShadowColor: 'rgba(244,63,94,0.5)', textShadowOffset:{width:0,height:2}, textShadowRadius: 8 },
  subtitle: { fontSize: 15, color: '#fda4af', marginBottom: 24, letterSpacing: 0.5, fontWeight: '500' },
  secTitle: { fontSize: 18, fontWeight: '700', color: '#fda4af', marginBottom: 16, letterSpacing: 0.5 },
  inputRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 8, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 16, padding: 14,
    color: '#fff', fontSize: 15, borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.2)',
  },
  btn: { borderRadius: 999, padding: 16, alignItems: 'center', overflow: 'hidden', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 1 },
  errorText: { color: '#ef4444', fontSize: 14, textAlign: 'center' },
  scoreRing: { alignItems: 'center', marginBottom: 20 },
  ringCircle: {
    width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: 'rgba(244,63,94,0.3)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
  },
  scoreNum: { fontSize: 42, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset:{width:0,height:2}, textShadowRadius: 4 },
  scoreLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontWeight: '700', letterSpacing: 1 },
  ratingText: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 6 },
  ratingSinhala: { fontSize: 18, color: '#fda4af', textAlign: 'center', marginBottom: 12 },
  recommendation: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 24, marginBottom: 24, paddingHorizontal: 10, fontStyle: 'italic' },
  shareBtn: {
    flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.2)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.4)',
  },
  shareBtnText: { color: '#fda4af', fontWeight: '800', fontSize: 14, letterSpacing: 0.5, textTransform: 'uppercase' },
  factorRow: { marginBottom: 18 },
  factorHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  factorName: { fontSize: 14, color: '#fff', fontWeight: '700' },
  factorScore: { fontSize: 14, color: '#fda4af', fontWeight: '800' },
  barBg: { height: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  factorDesc: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 6, lineHeight: 20 },
  doshaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(244,63,94,0.1)' },
  doshaText: { fontSize: 14, color: 'rgba(255,255,255,0.85)', flex: 1, lineHeight: 22 },
});