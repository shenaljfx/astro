import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, TouchableOpacity,
  StyleSheet, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import CosmicBackground from '../../components/CosmicBackground';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../services/api';

function toSLT(isoOrObj, t) {
  if (!isoOrObj) return '--:--';
  if (typeof isoOrObj === 'object' && isoOrObj.display) return isoOrObj.display;
  var d = new Date(isoOrObj);
  if (isNaN(d.getTime())) return '--:--';
  var slt = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  var h = slt.getUTCHours();
  var m = slt.getUTCMinutes();
  var ampm = h >= 12 ? 'pm' : 'am';
  var h12 = h % 12 || 12;
  return String(h12).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ' ' + (t ? t(ampm) : ampm.toUpperCase());
}

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

function MysticStatCard({ icon, label, value, color }) {
  return (
    <View style={s.statCard}>
      <LinearGradient
        colors={['rgba(60, 20, 90, 0.3)', 'rgba(10, 5, 20, 0.5)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      <Ionicons name={icon} size={24} color={color} style={{ marginBottom: 6 }} />
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  var { t, language } = useLanguage(); // Fixed destructuring
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);

  var fetchData = useCallback(async function() {
    try {
      setLoading(true);
      setError(null);
      var dateStr = new Date().toISOString().split('T')[0];
      var res = await api.getDailyNakath(dateStr);
      setData(res.data);
    } catch (err) {
      setError(err.message || t('failedToAlign'));
    } finally {
      setLoading(false);
    }
  }, [t]); // Added dependency

  useEffect(function() { fetchData(); }, [fetchData]); // Added dependency

  var getGreeting = function() {
    var h = new Date().getHours();
    var isSi = language === 'si';
    if (h < 12) return t('goodMorning');
    if (h < 17) return t('goodAfternoon');
    return t('goodEvening');
  };

  var rahuActive = false;
  if (data && data.rahuKalaya && data.rahuKalaya.start && data.rahuKalaya.end) {
    var now = Date.now();
    var rStart = new Date(data.rahuKalaya.start).getTime();
    var rEnd = new Date(data.rahuKalaya.end).getTime();
    rahuActive = now >= rStart && now <= rEnd;
  }

  var sunriseVal = data ? (data.sunriseFormatted ? data.sunriseFormatted.display : toSLT(data.sunrise, t)) : '--:--';
  var sunsetVal = data ? (data.sunsetFormatted ? data.sunsetFormatted.display : toSLT(data.sunset, t)) : '--:--';
  var nakshatraVal = data && data.panchanga && data.panchanga.nakshatra
    ? (data.panchanga.nakshatra.english || data.panchanga.nakshatra.name || '--')
    : '--';

  return (
    <CosmicBackground>
      <ScrollView
        style={s.flex}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={fetchData}
            tintColor="#fbbf24" colors={['#fbbf24']} />
        }
      >
        {loading && (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#fbbf24" />
            <Text style={s.loadingText}>{t('channelingEnergies')}</Text>
          </View>
        )}

        {error && !loading && (
          <View style={s.center}>
            <Ionicons name="planet" size={48} color="#ef4444" />
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={fetchData}>
              <Text style={s.retryText}>{t('realign')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {data && !loading && (
          <View>
            <Animated.View entering={FadeInDown.delay(100).duration(800)}>
              <Text style={s.greeting}>{getGreeting()}</Text>
              <Text style={s.dateText}>
                {new Date().toLocaleDateString(language === 'si' ? 'si-LK' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).duration(800)} style={s.statRow}>
              <MysticStatCard icon="sunny" label={t('sunrise')} value={sunriseVal} color="#FBBF24" />
              <MysticStatCard icon="moon" label={t('sunset')} value={sunsetVal} color="#A78BFA" />
              <MysticStatCard icon="star" label={t('nakshatra')} value={nakshatraVal} color="#34D399" />
            </Animated.View>

            {data.rahuKalaya && (
              <Animated.View entering={FadeInDown.delay(300).duration(800)}>
                <AuraBox style={rahuActive ? s.rahuActive : null}>
                  <View style={s.secHeader}>
                    <Ionicons name="flame" size={20} color={rahuActive ? '#ef4444' : '#fbbf24'} />
                    <Text style={s.secTitle}>{t('rahuKalaya')}</Text>
                    <View style={[s.badge, { backgroundColor: rahuActive ? '#ef4444' : 'rgba(251, 191, 36, 0.2)' }]}>
                      <Text style={[s.badgeText, { color: rahuActive ? '#fff' : '#fbbf24' }]}>
                        {rahuActive ? t('activeNow') : t('dormant')}
                      </Text>
                    </View>
                  </View>
                  <View style={s.rahuTimes}>
                    <View style={s.rahuBlock}>
                      <Text style={s.rahuLabel}>{t('commences')}</Text>
                      <Text style={s.rahuTime}>
                        {data.rahuKalaya.startFormatted ? data.rahuKalaya.startFormatted.display : toSLT(data.rahuKalaya.start, t)}
                      </Text>
                    </View>
                    <Text style={s.rahuDivider}>〰</Text>
                    <View style={s.rahuBlock}>
                      <Text style={s.rahuLabel}>{t('concludes')}</Text>
                      <Text style={s.rahuTime}>
                        {data.rahuKalaya.endFormatted ? data.rahuKalaya.endFormatted.display : toSLT(data.rahuKalaya.end, t)}
                      </Text>
                    </View>
                  </View>
                  {rahuActive && (
                    <Text style={s.rahuWarning}>{t('maintainPeace')}</Text>
                  )}
                </AuraBox>
              </Animated.View>
            )}

            {data.panchanga && (
              <Animated.View entering={FadeInDown.delay(400).duration(800)}>
                <AuraBox>
                  <View style={s.secHeader}>
                    <Text style={{ fontSize: 20 }}></Text>
                    <Text style={s.secTitle}>{t('sacredPanchanga')}</Text>
                  </View>
                  {[
                    [t('tithi'), data.panchanga.tithi],
                    [t('nakshatra'), data.panchanga.nakshatra],
                    [t('yoga'), data.panchanga.yoga],
                    [t('karana'), data.panchanga.karana],
                    [t('vaara'), data.panchanga.vaara],
                  ].map(function(item, i) {
                    var label = item[0];
                    var entry = item[1];
                    if (!entry) return null;
                    var displayName = typeof entry === 'string' ? entry
                      : (entry.english || entry.name || String(entry));
                    var sinhalaName = typeof entry === 'object' ? entry.sinhala : null;
                    return (
                      <View key={i} style={s.pRow}>
                        <Text style={s.pLabel}>  {label}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={s.pValue}>{displayName}</Text>
                          {sinhalaName ? <Text style={s.pSinhala}>{sinhalaName}</Text> : null}
                        </View>
                      </View>
                    );
                  })}
                </AuraBox>
              </Animated.View>
            )}

            {data.auspiciousPeriods && data.auspiciousPeriods.length > 0 && (
              <Animated.View entering={FadeInDown.delay(500).duration(800)}>
                <AuraBox>
                  <View style={s.secHeader}>
                    <Text style={{ fontSize: 20 }}></Text>
                    <Text style={s.secTitle}>{t('auspiciousAlignments')}</Text>
                  </View>
                  {data.auspiciousPeriods.map(function(p, i) {
                    var periodName = p.name || p.activity || t('blessedTime');
                    if (language === 'si' && p.sinhala) {
                        periodName = p.sinhala;
                    }

                    return (
                      <View key={i} style={s.auspRow}>
                        <View style={s.auspLine} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.auspName}>{periodName}</Text>
                          {(language !== 'si' && p.sinhala) ? <Text style={s.auspSinhala}>{p.sinhala}</Text> : null}
                        </View>
                        <Text style={s.auspTime}>
                          {p.startFormatted ? p.startFormatted.display : toSLT(p.start, t)}
                          {' - '}
                          {p.endFormatted ? p.endFormatted.display : toSLT(p.end, t)}
                        </Text>
                      </View>
                    );
                  })}
                </AuraBox>
              </Animated.View>
            )}

            <View style={{ height: 120 }} />
          </View>
        )}
      </ScrollView>
    </CosmicBackground>
  );
}

var s = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 110 : 90 },
  center: { alignItems: 'center', justifyContent: 'center', paddingTop: 120 },
  loadingText: { color: '#FBBF24', marginTop: 16, fontSize: 15, fontStyle: 'italic', letterSpacing: 1 },
  errorText: { color: '#ef4444', marginTop: 12, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    marginTop: 20, paddingHorizontal: 30, paddingVertical: 12,
    borderRadius: 999, backgroundColor: 'rgba(251, 191, 36, 0.2)', borderWidth: 1, borderColor: '#fbbf24'
  },
  retryText: { color: '#fbbf24', fontWeight: '700', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },
  greeting: { fontSize: 32, fontWeight: '800', color: '#FFF', marginBottom: 4, textShadowColor: 'rgba(251,191,36,0.5)', textShadowOffset:{width:0,height:2}, textShadowRadius: 8 },
  dateText: { fontSize: 15, color: '#fbbf24', marginBottom: 24, letterSpacing: 0.5, fontWeight: '500' },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1, borderRadius: 20, padding: 16, alignItems: 'center',
    overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  statValue: { fontSize: 16, fontWeight: '800', color: '#fff', marginTop: 8 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  rahuActive: { borderColor: 'rgba(239, 68, 68, 0.5)', shadowColor: '#ef4444' },
  secHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 10 },
  secTitle: { fontSize: 18, fontWeight: '700', color: '#fbbf24', flex: 1, letterSpacing: 0.5 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  rahuTimes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 },
  rahuBlock: { alignItems: 'center', flex: 1 },
  rahuLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  rahuTime: { fontSize: 24, fontWeight: '800', color: '#fff', textShadowColor: 'rgba(255,255,255,0.2)', textShadowOffset:{width:0,height:2}, textShadowRadius: 4 },
  rahuDivider: { fontSize: 16, color: 'rgba(255,255,255,0.3)' },
  rahuWarning: { fontSize: 13, color: '#ef4444', textAlign: 'center', marginTop: 12, fontStyle: 'italic', fontWeight: '500' },
  pRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(251, 191, 36, 0.1)',
  },
  pLabel: { fontSize: 14, color: '#a78bfa', fontWeight: '600' },
  pValue: { fontSize: 15, color: '#fff', fontWeight: '700' },
  pSinhala: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  auspRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  auspLine: { width: 3, height: 24, borderRadius: 2, backgroundColor: '#fbbf24' },
  auspName: { fontSize: 15, color: '#fff', fontWeight: '700' },
  auspSinhala: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  auspTime: { fontSize: 14, color: '#fbbf24', fontWeight: '800', letterSpacing: 0.5 },
});