import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  StyleSheet, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import CosmicBackground from '../../components/CosmicBackground';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../services/api';

var SIGNS = [
  { id: 'mesha', name: 'Mesha', sym: '\u2648', en: 'Aries' },
  { id: 'vrishabha', name: 'Vrishabha', sym: '\u2649', en: 'Taurus' },
  { id: 'mithuna', name: 'Mithuna', sym: '\u264A', en: 'Gemini' },
  { id: 'kataka', name: 'Kataka', sym: '\u264B', en: 'Cancer' },
  { id: 'simha', name: 'Simha', sym: '\u264C', en: 'Leo' },
  { id: 'kanya', name: 'Kanya', sym: '\u264D', en: 'Virgo' },
  { id: 'thula', name: 'Thula', sym: '\u264E', en: 'Libra' },
  { id: 'vrischika', name: 'Vrischika', sym: '\u264F', en: 'Scorpio' },
  { id: 'dhanu', name: 'Dhanu', sym: '\u2650', en: 'Sagittarius' },
  { id: 'makara', name: 'Makara', sym: '\u2651', en: 'Capricorn' },
  { id: 'kumbha', name: 'Kumbha', sym: '\u2652', en: 'Aquarius' },
  { id: 'meena', name: 'Meena', sym: '\u2653', en: 'Pisces' },
];

function AuraBox({ children, style }) {
  return (
    <View style={[gs.box, style]}>
      <LinearGradient
        colors={['rgba(50, 20, 80, 0.4)', 'rgba(20, 10, 40, 0.6)']}
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
    borderColor: 'rgba(251, 191, 36, 0.15)', padding: 20, marginBottom: 16,
    shadowColor: '#fbbf24', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 24,
  }
});

export default function HoroscopeScreen() {
  var { t, language } = useLanguage();
  var [selectedSign, setSelectedSign] = useState(SIGNS[0]);
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState(null);

  var fetchHoroscope = useCallback(async function(sign) {
    try {
      setLoading(true);
      setError(null);
      var res = await api.getDailyHoroscope(sign.id);
      setData(res.data);
    } catch (err) {
      setError(err.message || t('starsCurrentlyClouded'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(function() { fetchHoroscope(selectedSign); }, [selectedSign, fetchHoroscope]);

  var selectSign = function(sign) {
    setSelectedSign(sign);
  };

  return (
    <CosmicBackground>
      <ScrollView
        style={s.flex}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={function() { fetchHoroscope(selectedSign); }}
            tintColor="#fbbf24" colors={['#fbbf24']} />
        }
      >
        <Animated.View entering={FadeInDown.delay(100).duration(800)}>
          <Text style={s.title}>{t('dailyOracle')}</Text>
          <Text style={s.subtitle}>{t('vedicGuidance')}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(800)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.signScroll}>
            {SIGNS.map(function(sign) {
              var active = sign.id === selectedSign.id;
              var signName = t(sign.id) || sign.name;
              return (
                <TouchableOpacity
                  key={sign.id}
                  style={[s.signChip, active && s.signChipActive]}
                  onPress={function() { selectSign(sign); }}
                >
                  {active && (
                    <LinearGradient
                      colors={['rgba(251, 191, 36, 0.3)', 'rgba(251, 191, 36, 0.1)']}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <Text style={[s.signSym, active && s.signSymActive]}>{sign.sym}</Text>
                  <Text style={[s.signName, active && s.signNameActive]}>{signName}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {loading && (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#fbbf24" />
          </View>
        )}

        {error && !loading && (
          <AuraBox style={{ alignItems: 'center' }}>
            <Ionicons name="cloud-offline" size={32} color="#ef4444" style={{ marginBottom: 12 }} />
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={function() { fetchHoroscope(selectedSign); }}>
              <Text style={s.retryText}>{t('realign')}</Text>
            </TouchableOpacity>
          </AuraBox>
        )}

        {data && !loading && (
          <Animated.View entering={FadeInDown.delay(300).duration(800)}>
            <AuraBox>
              <View style={s.signHeader}>
                <View style={s.signIconBg}>
                  <Text style={s.signBig}>{selectedSign.sym}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.signTitle}>{t(selectedSign.id)}</Text>
                  <Text style={s.signEn}> {selectedSign.en} </Text>
                </View>
              </View>

              {data.overall && (
                <Text style={s.forecast}>{data.overall}</Text>
              )}

              <View style={s.detailsGrid}>
                {data.luckyNumbers && (
                  <View style={s.detailItem}>
                    <Text style={s.detailLabel}>{t('divineNumbers')}</Text>
                    <Text style={s.detailValue}>
                      {Array.isArray(data.luckyNumbers) ? data.luckyNumbers.join(', ') : data.luckyNumbers}
                    </Text>
                  </View>
                )}
                {data.luckyColor && (
                  <View style={s.detailItem}>
                    <Text style={s.detailLabel}>{t('auraColor')}</Text>
                    <Text style={s.detailValueColor}>{data.luckyColor}</Text>
                  </View>
                )}
              </View>

              {data.focus && (
                <View style={s.focusBox}>
                  {data.focus.moonArea && (
                    <View style={s.focusRow}>
                      <Ionicons name="moon" size={18} color="#c084fc" />
                      <Text style={s.focusLabel}>{t('mindEmotion')}:</Text>
                      <Text style={s.focusVal}>{data.focus.moonArea}</Text>
                    </View>
                  )}
                  {data.focus.sunArea && (
                    <View style={s.focusRow}>
                      <Ionicons name="sunny" size={18} color="#fbbf24" />
                      <Text style={s.focusLabel}>{t('soulAction')}:</Text>
                      <Text style={s.focusVal}>{data.focus.sunArea}</Text>
                    </View>
                  )}
                </View>
              )}

              {data.currentTransits && (
                <View style={s.transitBox}>
                  <Text style={s.transitTitle}>{t('cosmicTransits')}</Text>
                  {data.currentTransits.moonIn && (
                    <Text style={s.transitText}> {t('moonJourneying')} {data.currentTransits.moonIn}</Text>
                  )}
                  {data.currentTransits.sunIn && (
                    <Text style={s.transitText}> {t('sunIlluminating')} {data.currentTransits.sunIn}</Text>
                  )}
                </View>
              )}
            </AuraBox>
          </Animated.View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </CosmicBackground>
  );
}

var s = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 110 : 90 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 4, textShadowColor: 'rgba(251,191,36,0.5)', textShadowOffset:{width:0,height:2}, textShadowRadius: 8 },
  subtitle: { fontSize: 15, color: '#fbbf24', marginBottom: 20, letterSpacing: 0.5, fontWeight: '500' },
  center: { alignItems: 'center', paddingTop: 60 },
  errorText: { color: '#ef4444', fontSize: 14, textAlign: 'center' },
  retryBtn: { alignSelf: 'center', marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(251, 191, 36, 0.2)', borderWidth: 1, borderColor: '#fbbf24' },
  retryText: { color: '#fbbf24', fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  signScroll: { marginBottom: 20, paddingBottom: 10 },
  signChip: {
    alignItems: 'center', justifyContent: 'center', width: 64, height: 74,
    borderRadius: 20, marginRight: 12, backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden'
  },
  signChipActive: { borderColor: '#fbbf24', transform: [{ scale: 1.05 }] },
  signSym: { fontSize: 28, color: 'rgba(255,255,255,0.4)' },
  signSymActive: { color: '#fbbf24', textShadowColor: 'rgba(251,191,36,0.5)', textShadowOffset:{width:0,height:2}, textShadowRadius: 8 },
  signName: { fontSize: 10,  color: 'rgba(255,255,255,0.4)', marginTop: 4, fontWeight: '700', textTransform: 'uppercase' },
  signNameActive: { color: '#fff' },
  signHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  signIconBg: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(251,191,36,0.1)', borderWidth: 1, borderColor: '#fbbf24', alignItems: 'center', justifyContent: 'center' },
  signBig: { fontSize: 40, color: '#fbbf24' },
  signTitle: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  signEn: { fontSize: 14, color: '#a78bfa', fontWeight: '600', letterSpacing: 2, marginTop: 4, textTransform: 'uppercase' },
  forecast: { fontSize: 16, color: 'rgba(255,255,255,0.9)', lineHeight: 26, marginBottom: 20 },
  detailsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  detailItem: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(251,191,36,0.1)',
    padding: 16, alignItems: 'center',
  },
  detailLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  detailValue: { fontSize: 16, fontWeight: '800', color: '#fff', marginTop: 8 },
  detailValueColor: { fontSize: 16, fontWeight: '800', color: '#34d399', marginTop: 8 },
  focusBox: { marginBottom: 20, gap: 12 },
  focusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  focusLabel: { fontSize: 14, color: '#fbbf24', fontWeight: '700' },
  focusVal: { fontSize: 14, color: 'rgba(255,255,255,0.8)', flex: 1, lineHeight: 20 },
  transitBox: {
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)'
  },
  transitTitle: { fontSize: 14, fontWeight: '800', color: '#c084fc', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  transitText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 8, fontWeight: '500' },
});