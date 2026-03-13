import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, TouchableOpacity,
  StyleSheet, Platform, ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import CosmicBackground from '../../components/CosmicBackground';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

import SriLankanChart from '../../components/SriLankanChart';

var { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  var { t, language } = useLanguage();
  var { user } = useAuth();
  var [data, setData] = useState(null);
  var [chartData, setChartData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [chartLoading, setChartLoading] = useState(false);
  var [error, setError] = useState(null);

  // Extract stable primitive values to avoid re-fetching on every user object change
  var birthDateTime = user?.birthData?.dateTime || null;
  var birthLat = user?.birthData?.lat || 6.9271;
  var birthLng = user?.birthData?.lng || 79.8612;
  var hasBirthData = !!birthDateTime;
  var displayName = user?.displayName || 'Cosmic Seeker';

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
  }, [t]);

  var fetchBirthChart = useCallback(async function(cancelled) {
    if (!hasBirthData) return;
    try {
      setChartLoading(true);
      var res = await api.getBirthChartBasic(birthDateTime, birthLat, birthLng, language);
      if (!cancelled.current && res.success) {
        setChartData(res.data);
      }
    } catch (err) {
      if (cancelled.current) return;
      if (err && (err.name === 'AbortError' || (err.message && err.message.indexOf('abort') !== -1))) return;
      console.warn('Birth chart fetch failed:', err.message);
    } finally {
      if (!cancelled.current) {
        setChartLoading(false);
      }
    }
  }, [hasBirthData, birthDateTime, birthLat, birthLng, language]);

  useEffect(function() { fetchData(); }, [fetchData]);
  useEffect(function() {
    var cancelled = { current: false };
    fetchBirthChart(cancelled);
    return function() { cancelled.current = true; };
  }, [fetchBirthChart]);

  var getGreeting = function() {
    var h = new Date().getHours();
    return h < 12 ? t('goodMorning') : h < 17 ? t('goodAfternoon') : t('goodEvening');
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

  // ─── Lagna Chart Mini (Sri Lankan Style) ────────────
  function renderLagnaChart() {
    if (!chartData || !chartData.rashiChart) return null;
    var lagnaRashiId = chartData.lagna ? (chartData.lagna.rashiId || chartData.lagna.id || 1) : 1;
    var miniSize = Math.min(SCREEN_WIDTH - 80, 260);
    return (
      <View style={{ alignItems: 'center' }}>
        <SriLankanChart
          rashiChart={chartData.rashiChart}
          lagnaRashiId={lagnaRashiId}
          language={language}
          chartSize={miniSize}
        />
      </View>
    );
  }

  // ─── Personalised Birth Summary Card ───────────────────────
  function renderBirthSummary() {
    if (!chartData) return null;
    var lagna = chartData.lagna;
    var moonSign = chartData.moonSign;
    var sunSign = chartData.sunSign;
    var nakshatra = chartData.nakshatra;
    var lagnaDetails = chartData.lagnaDetails;

    return (
      <Animated.View entering={FadeInDown.delay(200).duration(800)}>
        <AuraBox>
          <View style={s.secHeader}>
            <Text style={{ fontSize: 20 }}>🌟</Text>
            <Text style={s.secTitle}>
              {language === 'si' ? 'ඔබේ විශ්වීය අනන්‍යතාවය' : 'Your Cosmic Identity'}
            </Text>
          </View>

          {/* Key astro details */}
          <View style={s.identityGrid}>
            <View style={s.identityItem}>
              <Text style={s.identityIcon}>⬆️</Text>
              <Text style={s.identityLabel}>{language === 'si' ? 'ලග්නය' : 'Lagna'}</Text>
              <Text style={s.identityValue}>{language === 'si' && lagna?.sinhala ? lagna.sinhala : lagna?.english || '--'}</Text>
              <Text style={s.identitySinhala}>{language !== 'si' && lagna?.sinhala ? lagna?.sinhala : ''}</Text>
            </View>
            <View style={s.identityItem}>
              <Text style={s.identityIcon}>🌙</Text>
              <Text style={s.identityLabel}>{language === 'si' ? 'චන්ද්‍ර' : 'Moon Sign'}</Text>
              <Text style={s.identityValue}>{language === 'si' && moonSign?.sinhala ? moonSign.sinhala : moonSign?.english || '--'}</Text>
              <Text style={s.identitySinhala}>{language !== 'si' && moonSign?.sinhala ? moonSign?.sinhala : ''}</Text>
            </View>
            <View style={s.identityItem}>
              <Text style={s.identityIcon}>☀️</Text>
              <Text style={s.identityLabel}>{language === 'si' ? 'සූර්ය' : 'Sun Sign'}</Text>
              <Text style={s.identityValue}>{language === 'si' && sunSign?.sinhala ? sunSign.sinhala : sunSign?.english || '--'}</Text>
              <Text style={s.identitySinhala}>{language !== 'si' && sunSign?.sinhala ? sunSign?.sinhala : ''}</Text>
            </View>
            <View style={s.identityItem}>
              <Text style={s.identityIcon}>⭐</Text>
              <Text style={s.identityLabel}>{language === 'si' ? 'නක්ෂත්‍ර' : 'Nakshatra'}</Text>
              <Text style={s.identityValue}>{language === 'si' && nakshatra?.sinhala ? nakshatra.sinhala : nakshatra?.name || '--'}</Text>
              <Text style={s.identitySinhala}>{language !== 'si' && nakshatra?.sinhala ? nakshatra?.sinhala : ''}</Text>
            </View>
          </View>

          {/* Lagna Lord */}
          {lagna?.lord && (
            <View style={s.lordRow}>
              <Ionicons name="planet" size={16} color="#c084fc" />
              <Text style={s.lordText}>
                {language === 'si' ? 'ලග්නාධිපති: ' : 'Lagna Lord: '}
                {lagna.lord} ({lagnaDetails?.luckyDay || ''})
              </Text>
            </View>
          )}
        </AuraBox>
      </Animated.View>
    );
  }

  // ─── Lagna Palapala Card ──────────────────────────────────
  function renderLagnaPalapala() {
    if (!chartData || !chartData.lagnaDetails) return null;
    var ld = chartData.lagnaDetails;
    if (!ld.description) return null;

    return (
      <Animated.View entering={FadeInDown.delay(300).duration(800)}>
        <AuraBox>
          <View style={s.secHeader}>
            <Text style={{ fontSize: 20 }}>🔮</Text>
            <Text style={s.secTitle}>
              {language === 'si' ? (ld.sinhala || ld.english || 'ලග්න පලාපල') : (ld.english || ld.sinhala || 'Lagna Palapala')}
            </Text>
          </View>
          <Text style={s.palapalaText}>
            {language === 'si' && ld.descriptionSi ? ld.descriptionSi : ld.description}
          </Text>

          {/* Traits */}
          {ld.traits && ld.traits.length > 0 && (
            <View style={s.traitsRow}>
              {(language === 'si' && ld.traitsSi ? ld.traitsSi : ld.traits).map(function(trait, i) {
                return (
                  <View key={i} style={s.traitChip}>
                    <Text style={s.traitText}>{trait}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Lucky info */}
          <View style={s.luckyRow}>
            {ld.gem && (
              <View style={s.luckyItem}>
                <Text style={s.luckyIcon}>💎</Text>
                <Text style={s.luckyLabel}>{ld.gem}</Text>
              </View>
            )}
            {ld.luckyColor && (
              <View style={s.luckyItem}>
                <Text style={s.luckyIcon}>🎨</Text>
                <Text style={s.luckyLabel}>{ld.luckyColor}</Text>
              </View>
            )}
          </View>
        </AuraBox>
      </Animated.View>
    );
  }

  // ─── Personality Traits Card ──────────────────────────────
  function renderPersonality() {
    if (!chartData || !chartData.personality) return null;
    var p = chartData.personality;
    // Prefer Sinhala traits if available and language is si
    var traitsSource = (language === 'si' && p.mainTraitsSi) ? p.mainTraitsSi : 
                       (p.lagnaTraits || p.sunTraits || []); 
    
    // If no specific traits list found, concat existing ones as fallback
    if (!traitsSource || traitsSource.length === 0) {
        traitsSource = [].concat(p.lagnaTraits || [], p.moonTraits || [], p.sunTraits || []);
    }

    var uniqueTraits = traitsSource.filter(function(t, i) { return traitsSource.indexOf(t) === i; }).slice(0, 8);
    if (uniqueTraits.length === 0) return null;

    return (
      <Animated.View entering={FadeInDown.delay(400).duration(800)}>
        <AuraBox>
          <View style={s.secHeader}>
            <Text style={{ fontSize: 20 }}>✨</Text>
            <Text style={s.secTitle}>
              {language === 'si' ? 'ඔබේ පෞරුෂය' : 'Your Personality'}
            </Text>
          </View>
          <View style={s.personalityGrid}>
            {uniqueTraits.map(function(trait, i) {
              var icons = ['🌟', '💫', '⚡', '🔥', '🌊', '🍃', '💎', '🌙'];
              return (
                <View key={i} style={s.personalityItem}>
                  <Text style={{ fontSize: 16 }}>{icons[i % icons.length]}</Text>
                  <Text style={s.personalityText}>{trait}</Text>
                </View>
              );
            })}
          </View>
        </AuraBox>
      </Animated.View>
    );
  }

  // ─── Lagna Chart Card ─────────────────────────────────────
  function renderChartCard() {
    if (!chartData) return null;
    return (
      <Animated.View entering={FadeInDown.delay(250).duration(800)}>
        <AuraBox>
          <View style={s.secHeader}>
            <Text style={{ fontSize: 20 }}>🪐</Text>
            <Text style={s.secTitle}>
               {language === 'si' ? 'ලග්න සටහන' : 'Your Lagna Chart'}
            </Text>
          </View>
          {renderLagnaChart()}
        </AuraBox>
      </Animated.View>
    );
  }

  // ─── No Birth Data Prompt ─────────────────────────────────
  function renderNoBirthDataPrompt() {
    return (
      <Animated.View entering={FadeInDown.delay(200).duration(800)}>
        <AuraBox>
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <Text style={{ fontSize: 50, marginBottom: 12 }}>🌌</Text>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
              {language === 'si' ? 'ඔබේ කේන්දරය සකසා ගන්න' : 'Unlock Your Cosmic Blueprint'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 16 }}>
              {language === 'si' 
                ? 'ඔබගේ උපන් විස්තර ඇතුලත් කර ඔබගේ ලග්න පලාපල, නක්ෂත්‍ර සහ දෛනික පලාපල බලාගන්න.'
                : 'Add your birth details in Profile to see your\npersonalised Lagna chart, Nakshatra, and\ndaily readings based on YOUR stars.'}
            </Text>
            <Text style={{ color: '#fbbf24', fontSize: 13, fontWeight: '600' }}>
              {language === 'si' ? 'Profile පිටුවට යන්න' : 'Go to Profile → Update Birth Data'}
            </Text>
          </View>
        </AuraBox>
      </Animated.View>
    );
  }

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
              <Text style={s.nameText}>{displayName} 🌟</Text>
              <Text style={s.dateText}>
                {new Date().toLocaleDateString(language === 'si' ? 'si-LK' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            </Animated.View>

            {/* ── Personalised Birth Chart Section ────── */}
            {hasBirthData && chartData && renderBirthSummary()}
            {hasBirthData && chartData && renderChartCard()}
            {hasBirthData && chartData && renderLagnaPalapala()}
            {hasBirthData && chartData && renderPersonality()}
            {hasBirthData && chartLoading && (
              <AuraBox>
                <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                  <ActivityIndicator size="large" color="#fbbf24" />
                  <Text style={{ color: '#fbbf24', marginTop: 12, fontStyle: 'italic' }}>
                    {language === 'si' ? 'කේන්දරය සකසමින් පවතී...' : 'Calculating your birth chart...'}
                  </Text>
                </View>
              </AuraBox>
            )}
            {!hasBirthData && renderNoBirthDataPrompt()}

            {/* ── Daily Cosmic Data Section ────── */}
            <Animated.View entering={FadeInDown.delay(hasBirthData && chartData ? 500 : 200).duration(800)} style={s.statRow}>
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
                    var englishName = typeof entry === 'string' ? entry
                      : (entry.english || entry.name || String(entry));
                    var sinhalaName = typeof entry === 'object' ? entry.sinhala : null;
                    var displayName = (language === 'si' && sinhalaName) ? sinhalaName : englishName;
                    var subName = (language === 'si') ? null : sinhalaName;
                    return (
                      <View key={i} style={s.pRow}>
                        <Text style={s.pLabel}>  {label}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={s.pValue}>{displayName}</Text>
                          {subName ? <Text style={s.pSinhala}>{subName}</Text> : null}
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

var chartCellSize = (SCREEN_WIDTH - 72) / 4;

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
  greeting: { fontSize: 28, fontWeight: '700', color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  nameText: { fontSize: 34, fontWeight: '900', color: '#FFF', marginBottom: 4, textShadowColor: 'rgba(251,191,36,0.5)', textShadowOffset:{width:0,height:2}, textShadowRadius: 8 },
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

  // ── Lagna Chart Grid ────────────────────────
  chartGrid: {
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)', borderRadius: 12,
    overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.2)',
  },
  chartRow: {
    flexDirection: 'row',
  },
  chartCell: {
    width: chartCellSize, height: chartCellSize * 0.85,
    borderWidth: 0.5, borderColor: 'rgba(251,191,36,0.15)',
    padding: 4, alignItems: 'center', justifyContent: 'center',
  },
  chartCellLagna: {
    backgroundColor: 'rgba(251,191,36,0.08)',
  },
  chartCellCenter: {
    height: chartCellSize * 0.85 * 2,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: 'rgba(251,191,36,0.1)',
  },
  chartCenterEmoji: { fontSize: 28, marginBottom: 4 },
  chartCenterTitle: { color: '#fbbf24', fontSize: 13, fontWeight: '800' },
  chartCenterSinhala: { color: 'rgba(251,191,36,0.6)', fontSize: 11 },
  chartRashiLabel: {
    color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700',
    position: 'absolute', top: 3, left: 4,
  },
  chartPlanet: {
    color: '#fff', fontSize: 10, fontWeight: '700',
  },
  chartPlanetLagna: {
    color: '#fbbf24', fontWeight: '900',
  },

  // ── Identity Grid ──────────────────────────
  identityGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16,
  },
  identityItem: {
    width: '47%', backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  identityIcon: { fontSize: 20, marginBottom: 4 },
  identityLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  identityValue: { fontSize: 16, color: '#fff', fontWeight: '800', marginTop: 4 },
  identitySinhala: { fontSize: 12, color: '#c084fc', marginTop: 2 },
  lordRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(192,132,252,0.1)', borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: 'rgba(192,132,252,0.2)',
  },
  lordText: { color: '#c084fc', fontSize: 13, fontWeight: '600' },

  // ── Lagna Palapala ─────────────────────────
  palapalaText: {
    color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 22, marginBottom: 16,
  },
  traitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  traitChip: {
    backgroundColor: 'rgba(124,58,237,0.15)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)',
  },
  traitText: { color: '#c084fc', fontSize: 12, fontWeight: '600' },
  luckyRow: { flexDirection: 'row', gap: 12 },
  luckyItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(251,191,36,0.08)', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.15)',
  },
  luckyIcon: { fontSize: 16 },
  luckyLabel: { color: '#fbbf24', fontSize: 12, fontWeight: '600', flex: 1 },

  // ── Personality ────────────────────────────
  personalityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  personalityItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  personalityText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});