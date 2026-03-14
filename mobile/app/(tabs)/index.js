import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, RefreshControl, TouchableOpacity,
  StyleSheet, Platform, ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown, FadeInUp, ZoomIn,
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withSpring,
  interpolate, Easing,
} from 'react-native-reanimated';
import CosmicBackground from '../../components/CosmicBackground';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Colors, Typography, Gradients } from '../../constants/theme';

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

// ── Chromatic Glass Card ────────────────────────────────────────────────
function AuraBox({ children, style, accentColor }) {
  var shimmerX = useSharedValue(-1);
  useEffect(function () {
    shimmerX.value = withRepeat(
      withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );
  }, []);
  var shimmerStyle = useAnimatedStyle(function () {
    return {
      transform: [{ translateX: interpolate(shimmerX.value, [-1, 1], [-SCREEN_WIDTH, SCREEN_WIDTH]) }],
      opacity: interpolate(shimmerX.value, [-1, -0.3, 0, 0.3, 1], [0, 0.04, 0.08, 0.04, 0]),
    };
  });
  var borderColor = accentColor || 'rgba(251,191,36,0.18)';
  return (
    <View style={[gs.box, { borderColor }, style]}>
      <LinearGradient
        colors={['rgba(50,20,90,0.45)', 'rgba(12,8,32,0.7)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      {/* Inner glass highlight */}
      <LinearGradient
        colors={['rgba(255,255,255,0.06)', 'transparent']}
        style={gs.innerHighlight}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.4 }}
      />
      {/* Shimmer sweep */}
      <Animated.View style={[gs.shimmerLine, shimmerStyle]} />
      <View style={gs.innerGlow} />
      {children}
    </View>
  );
}

var gs = StyleSheet.create({
  box: {
    borderRadius: 28, overflow: 'hidden', borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.18)', padding: 20, marginBottom: 16,
    shadowColor: '#9333EA', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 8,
  },
  innerHighlight: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 60, borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  shimmerLine: {
    position: 'absolute', top: 0, bottom: 0, width: 120,
    backgroundColor: 'rgba(255,255,255,0.05)',
    transform: [{ skewX: '-20deg' }],
  },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', borderRadius: 28,
  },
});

// ── Cosmic Stat Card ──────────────────────────────────────────────────
function MysticStatCard({ icon, label, value, color }) {
  var pulseOp = useSharedValue(0.7);
  useEffect(function () {
    pulseOp.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.7, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ), -1, true
    );
  }, []);
  var iconStyle = useAnimatedStyle(function () { return { opacity: pulseOp.value }; });

  return (
    <View style={s.statCard}>
      <LinearGradient
        colors={['rgba(40,18,70,0.6)', 'rgba(8,5,20,0.8)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.07)', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
      />
      <View style={[s.statIconWrap, { borderColor: color + '40', shadowColor: color }]}>
        <Animated.View style={iconStyle}>
          <Ionicons name={icon} size={22} color={color} />
        </Animated.View>
      </View>
      <Text style={[s.statValue, { textShadowColor: color + '80' }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ── Energy Score Ring ─────────────────────────────────────────────────
function EnergyRing({ score, label }) {
  var progress = useSharedValue(0);
  useEffect(function () {
    progress.value = withTiming(score / 100, { duration: 1400, easing: Easing.out(Easing.cubic) });
  }, [score]);
  var color = score >= 75 ? Colors.auroraGreen : score >= 50 ? Colors.accent : score >= 30 ? Colors.solarAmber : '#EF4444';
  var cx = 44, cy = 44, r = 36, circumference = 2 * Math.PI * r;
  var ringStyle = useAnimatedStyle(function () {
    return { strokeDashoffset: interpolate(progress.value, [0, 1], [circumference, 0]) };
  });
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={s.ringWrap}>
        <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 44, backgroundColor: color + '12' }]} />
        <Text style={[s.ringScore, { color }]}>{score}</Text>
        <Text style={s.ringUnit}>/ 100</Text>
      </View>
      <Text style={[s.ringLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ── Quick Action Tile ─────────────────────────────────────────────────
function QuickTile({ icon, label, colors: gc, onPress }) {
  var scale = useSharedValue(1);
  function onIn() { scale.value = withSpring(0.94, { damping: 12, stiffness: 300 }); }
  function onOut() { scale.value = withSpring(1, { damping: 10, stiffness: 200 }); }
  var scaleStyle = useAnimatedStyle(function () { return { transform: [{ scale: scale.value }] }; });
  return (
    <Animated.View style={[s.quickTile, scaleStyle]}>
      <TouchableOpacity onPress={onPress} onPressIn={onIn} onPressOut={onOut} activeOpacity={1} style={{ flex: 1 }}>
        <LinearGradient colors={gc} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <LinearGradient colors={['rgba(255,255,255,0.1)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%' }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 26, marginBottom: 6 }}>{icon}</Text>
          <Text style={s.quickTileLabel}>{label}</Text>
        </View>
        <View style={s.quickTileBorder} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Rahu Kalaya Active Pulse Ring ─────────────────────────────────────
function RahuPulseRing() {
  var ring1 = useSharedValue(0);
  var ring2 = useSharedValue(0);
  useEffect(function () {
    ring1.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1);
    ring2.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1);
    // Delayed second ring
    setTimeout(function () {
      ring2.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1);
    }, 600);
  }, []);
  var r1Style = useAnimatedStyle(function () {
    return {
      transform: [{ scale: interpolate(ring1.value, [0, 1], [0.8, 1.8]) }],
      opacity: interpolate(ring1.value, [0, 0.6, 1], [0.7, 0.3, 0]),
    };
  });
  var r2Style = useAnimatedStyle(function () {
    return {
      transform: [{ scale: interpolate(ring2.value, [0, 1], [0.8, 1.5]) }],
      opacity: interpolate(ring2.value, [0, 0.5, 1], [0.5, 0.2, 0]),
    };
  });
  return (
    <View style={s.rahuRingWrap} pointerEvents="none">
      <Animated.View style={[s.rahuRing, r1Style]} />
      <Animated.View style={[s.rahuRing, r2Style]} />
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

  // ─── All animation hooks must be declared at the top level ────
  // Sky Portal Hero breathe animation
  var breathe = useSharedValue(1);
  useEffect(function () {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.018, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1,     { duration: 4000, easing: Easing.inOut(Easing.sin) })
      ), -1, true
    );
  }, []);
  var breatheStyle = useAnimatedStyle(function () {
    return { transform: [{ scale: breathe.value }] };
  });

  // No-birth-data prompt glow animation
  var noBirthGlow = useSharedValue(0.6);
  useEffect(function () {
    noBirthGlow.value = withRepeat(
      withSequence(withTiming(1, { duration: 2000 }), withTiming(0.6, { duration: 2000 })), -1, true
    );
  }, []);
  var noBirthGlowStyle = useAnimatedStyle(function () { return { opacity: noBirthGlow.value }; });
  // ─── End of animation hooks ───────────────────────────────────

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

  // ─── Sky Portal Hero ──────────────────────────────────────
  function renderSkyPortalHero() {

    var todayNakshatra = data && data.panchanga && data.panchanga.nakshatra
      ? (language === 'si' && data.panchanga.nakshatra.sinhala ? data.panchanga.nakshatra.sinhala : (data.panchanga.nakshatra.english || data.panchanga.nakshatra.name || ''))
      : '';
    var todayTithi = data && data.panchanga && data.panchanga.tithi
      ? (language === 'si' && data.panchanga.tithi.sinhala ? data.panchanga.tithi.sinhala : (data.panchanga.tithi.english || data.panchanga.tithi.name || ''))
      : '';
    var vibeWords = language === 'si' ? ['ශුභ', 'ශක්තිය', 'සුදුසු'] : ['Auspicious', 'Aligned', 'Flowing'];

    return (
      <Animated.View entering={FadeInDown.delay(50).springify()} style={{ marginBottom: 18 }}>
        {/* Main Hero Card */}
        <View style={s.heroCard}>
          <LinearGradient
            colors={['rgba(80,20,160,0.6)', 'rgba(20,8,50,0.85)', 'rgba(4,3,12,0.95)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
          {/* Top shimmer */}
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'transparent']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, borderTopLeftRadius: 32, borderTopRightRadius: 32 }}
          />

          {/* Greeting row */}
          <View style={s.heroGreetRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.heroGreeting}>{getGreeting()}</Text>
              <Text style={s.heroName}>{displayName}</Text>
            </View>
            <View style={s.heroDateBadge}>
              <Text style={s.heroDateText}>
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </View>

          {/* Nakshatra glyph orb */}
          <Animated.View style={[s.heroGlyphWrap, breatheStyle]}>
            <LinearGradient
              colors={['rgba(147,51,234,0.4)', 'rgba(59,130,246,0.3)', 'rgba(251,191,36,0.2)']}
              style={StyleSheet.absoluteFill}
            />
            <Text style={s.heroGlyph}>✦</Text>
            {todayNakshatra ? <Text style={s.heroGlyphLabel}>{todayNakshatra}</Text> : null}
          </Animated.View>

          {/* Today's vibe words */}
          <View style={s.heroVibeRow}>
            {vibeWords.map(function (w, i) {
              return (
                <View key={i} style={s.heroVibePill}>
                  <Text style={s.heroVibePillText}>{w}</Text>
                </View>
              );
            })}
          </View>

          {/* Tithi row */}
          {todayTithi ? (
            <View style={s.heroTithiRow}>
              <Ionicons name="moon" size={12} color="rgba(255,255,255,0.5)" />
              <Text style={s.heroTithiText}>{todayTithi}</Text>
            </View>
          ) : null}

          {/* Border glow */}
          <View style={s.heroCardBorder} />
        </View>
      </Animated.View>
    );
  }

  // ─── Rahu Kalaya Banner ──────────────────────────────────
  function renderRahuBanner() {
    if (!data || !data.rahuKalaya) return null;
    var startStr = data.rahuKalaya.startFormatted ? data.rahuKalaya.startFormatted.display : toSLT(data.rahuKalaya.start, t);
    var endStr   = data.rahuKalaya.endFormatted   ? data.rahuKalaya.endFormatted.display   : toSLT(data.rahuKalaya.end, t);

    if (rahuActive) {
      return (
        <Animated.View entering={ZoomIn.duration(500)} style={{ marginBottom: 16, position: 'relative' }}>
          <RahuPulseRing />
          <View style={s.rahuBannerActive}>
            <LinearGradient colors={['rgba(220,38,38,0.35)', 'rgba(127,29,29,0.5)']} style={StyleSheet.absoluteFill} />
            <View style={s.rahuBannerInner}>
              <Ionicons name="warning" size={18} color="#FCA5A5" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.rahuBannerTitle}>{t('rahuKalaya')} — {t('activeNow')}</Text>
                <Text style={s.rahuBannerTime}>{startStr} — {endStr}</Text>
              </View>
              <View style={s.rahuDot} />
            </View>
            {rahuActive && <Text style={[s.rahuWarning, { marginTop: 6, marginHorizontal: 0 }]}>{t('maintainPeace')}</Text>}
            <View style={s.rahuBannerBorder} />
          </View>
        </Animated.View>
      );
    }
    return (
      <Animated.View entering={FadeInDown.delay(150).duration(600)} style={{ marginBottom: 16 }}>
        <View style={s.rahuBannerDormant}>
          <LinearGradient colors={['rgba(6,78,59,0.3)', 'rgba(4,47,36,0.4)']} style={StyleSheet.absoluteFill} />
          <Ionicons name="checkmark-circle" size={16} color="#34D399" />
          <Text style={s.rahuBannerDormantText}>
            {language === 'si' ? 'රාහු කාල: ' : 'Rahu Kalaya: '}{startStr} – {endStr}
          </Text>
          <View style={[s.rahuDot, { backgroundColor: '#34D399' }]} />
        </View>
      </Animated.View>
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

    var identityItems = [
      { icon: '⬆', label: language === 'si' ? 'ලග්නය' : 'Lagna',    value: (language === 'si' && lagna?.sinhala ? lagna.sinhala : lagna?.english || '--'),      sub: language !== 'si' ? lagna?.sinhala : '', color: '#C084FC' },
      { icon: '🌙', label: language === 'si' ? 'චන්ද්‍ර' : 'Moon',   value: (language === 'si' && moonSign?.sinhala ? moonSign.sinhala : moonSign?.english || '--'), sub: language !== 'si' ? moonSign?.sinhala : '', color: '#93C5FD' },
      { icon: '☀',  label: language === 'si' ? 'සූර්ය' : 'Sun',      value: (language === 'si' && sunSign?.sinhala ? sunSign.sinhala : sunSign?.english || '--'),    sub: language !== 'si' ? sunSign?.sinhala : '', color: '#FDE68A' },
      { icon: '✦',  label: language === 'si' ? 'නක්ෂත්‍ර' : 'Nakshatra', value: (language === 'si' && nakshatra?.sinhala ? nakshatra.sinhala : nakshatra?.name || '--'), sub: language !== 'si' ? nakshatra?.sinhala : '', color: '#6EE7B7' },
    ];

    return (
      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <AuraBox accentColor="rgba(192,132,252,0.25)">
          <View style={s.secHeader}>
            <LinearGradient colors={['#9333EA', '#6366F1']} style={s.secIconWrap}>
              <Text style={{ fontSize: 14 }}>🌟</Text>
            </LinearGradient>
            <Text style={s.secTitle}>
              {language === 'si' ? 'ඔබේ විශ්වීය අනන්‍යතාවය' : 'Your Cosmic Identity'}
            </Text>
          </View>

          <View style={s.identityGrid}>
            {identityItems.map(function (item, i) {
              return (
                <Animated.View key={i} entering={FadeInDown.delay(250 + i * 60).springify()} style={[s.identityItem, { borderColor: item.color + '25' }]}>
                  <LinearGradient colors={[item.color + '15', 'transparent']} style={StyleSheet.absoluteFill} />
                  <Text style={s.identityIcon}>{item.icon}</Text>
                  <Text style={s.identityLabel}>{item.label}</Text>
                  <Text style={[s.identityValue, { color: item.color }]}>{item.value}</Text>
                  {item.sub ? <Text style={s.identitySinhala}>{item.sub}</Text> : null}
                </Animated.View>
              );
            })}
          </View>

          {lagna?.lord && (
            <View style={s.lordRow}>
              <Ionicons name="planet" size={14} color="#C084FC" />
              <Text style={s.lordText}>
                {language === 'si' ? 'ලග්නාධිපති: ' : 'Lagna Lord: '}{lagna.lord}
                {lagnaDetails?.luckyDay ? ' · ' + lagnaDetails.luckyDay : ''}
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
      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <AuraBox accentColor="rgba(99,102,241,0.25)">
          <View style={s.secHeader}>
            <LinearGradient colors={['#6366F1', '#8B5CF6']} style={s.secIconWrap}>
              <Text style={{ fontSize: 14 }}>🔮</Text>
            </LinearGradient>
            <Text style={s.secTitle}>
              {language === 'si' ? (ld.sinhala || ld.english || 'ලග්න පලාපල') : (ld.english || ld.sinhala || 'Lagna Palapala')}
            </Text>
          </View>
          <Text style={s.palapalaText}>
            {language === 'si' && ld.descriptionSi ? ld.descriptionSi : ld.description}
          </Text>

          {ld.traits && ld.traits.length > 0 && (
            <View style={s.traitsRow}>
              {(language === 'si' && ld.traitsSi ? ld.traitsSi : ld.traits).map(function (trait, i) {
                return (
                  <View key={i} style={s.traitChip}>
                    <Text style={s.traitText}>{trait}</Text>
                  </View>
                );
              })}
            </View>
          )}

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
    var traitsSource = (language === 'si' && p.mainTraitsSi) ? p.mainTraitsSi :
                       (p.lagnaTraits || p.sunTraits || []);
    if (!traitsSource || traitsSource.length === 0) {
      traitsSource = [].concat(p.lagnaTraits || [], p.moonTraits || [], p.sunTraits || []);
    }
    var uniqueTraits = traitsSource.filter(function (tr, i) { return traitsSource.indexOf(tr) === i; }).slice(0, 8);
    if (uniqueTraits.length === 0) return null;

    var traitIcons = ['🌟', '💫', '⚡', '🔥', '🌊', '🍃', '💎', '🌙'];
    var traitColors = ['#C084FC', '#93C5FD', '#FBBF24', '#F87171', '#34D399', '#6EE7B7', '#FDE68A', '#A78BFA'];

    return (
      <Animated.View entering={FadeInDown.delay(400).springify()}>
        <AuraBox accentColor="rgba(251,191,36,0.2)">
          <View style={s.secHeader}>
            <LinearGradient colors={['#FBBF24', '#F59E0B']} style={s.secIconWrap}>
              <Text style={{ fontSize: 14 }}>✨</Text>
            </LinearGradient>
            <Text style={s.secTitle}>{language === 'si' ? 'ඔබේ පෞරුෂය' : 'Your Personality'}</Text>
          </View>
          <View style={s.personalityGrid}>
            {uniqueTraits.map(function (trait, i) {
              return (
                <Animated.View key={i} entering={FadeInUp.delay(450 + i * 50).springify()} style={[s.personalityItem, { borderColor: traitColors[i % traitColors.length] + '30' }]}>
                  <Text style={{ fontSize: 13 }}>{traitIcons[i % traitIcons.length]}</Text>
                  <Text style={[s.personalityText, { color: traitColors[i % traitColors.length] }]}>{trait}</Text>
                </Animated.View>
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
      <Animated.View entering={FadeInDown.delay(250).springify()}>
        <AuraBox accentColor="rgba(251,191,36,0.22)">
          <View style={s.secHeader}>
            <LinearGradient colors={['#FBBF24', '#9333EA']} style={s.secIconWrap}>
              <Text style={{ fontSize: 14 }}>🪐</Text>
            </LinearGradient>
            <Text style={s.secTitle}>{language === 'si' ? 'ලග්න සටහන' : 'Your Lagna Chart'}</Text>
          </View>
          {/* Chart glow aura */}
          <View style={s.chartAuraWrap}>
            <LinearGradient
              colors={['transparent', 'rgba(147,51,234,0.15)', 'transparent']}
              style={s.chartAuraGlow}
              start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
            />
            {renderLagnaChart()}
          </View>
        </AuraBox>
      </Animated.View>
    );
  }

  // ─── No Birth Data Prompt ─────────────────────────────────
  function renderNoBirthDataPrompt() {
    return (
      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <AuraBox accentColor="rgba(147,51,234,0.3)">
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Animated.Text style={[{ fontSize: 60, marginBottom: 16 }, noBirthGlowStyle]}>🌌</Animated.Text>
            <Text style={s.noBirthTitle}>
              {language === 'si' ? 'ඔබේ කේන්දරය සකසා ගන්න' : 'Unlock Your Cosmic Blueprint'}
            </Text>
            <Text style={s.noBirthBody}>
              {language === 'si'
                ? 'ඔබගේ උපන් විස්තර ඇතුලත් කර ඔබගේ ලග්න පලාපල, නක්ෂත්‍ර සහ දෛනික පලාපල බලාගන්න.'
                : 'Add your birth details in Profile to unlock your personalised Lagna chart, Nakshatra & daily cosmic readings.'}
            </Text>
            <View style={s.noBirthCta}>
              <LinearGradient colors={['#9333EA', '#6366F1']} style={StyleSheet.absoluteFill} />
              <Ionicons name="sparkles" size={14} color="#fff" />
              <Text style={s.noBirthCtaText}>
                {language === 'si' ? 'Profile → Birth Data' : 'Go to Profile → Birth Data'}
              </Text>
            </View>
          </View>
        </AuraBox>
      </Animated.View>
    );
  }

  // ─── Quick Actions Grid ───────────────────────────────────
  function renderQuickActions() {
    var actions = language === 'si'
      ? [
          { icon: '🔮', label: 'ජ්‍යොතිෂ',  colors: ['rgba(147,51,234,0.5)', 'rgba(99,102,241,0.4)'] },
          { icon: '⚡', label: 'ග්‍රහ',     colors: ['rgba(251,191,36,0.4)', 'rgba(245,158,11,0.3)'] },
          { icon: '📅', label: 'මුහූර්ත',   colors: ['rgba(6,182,212,0.4)',  'rgba(59,130,246,0.3)'] },
          { icon: '💑', label: 'ගැලපීම',    colors: ['rgba(244,63,94,0.4)',  'rgba(139,92,246,0.3)'] },
        ]
      : [
          { icon: '🔮', label: 'Ask Jyotishi', colors: ['rgba(147,51,234,0.5)', 'rgba(99,102,241,0.4)'] },
          { icon: '⚡', label: 'Transits',     colors: ['rgba(251,191,36,0.4)', 'rgba(245,158,11,0.3)'] },
          { icon: '📅', label: 'Muhurtha',     colors: ['rgba(6,182,212,0.4)',  'rgba(59,130,246,0.3)'] },
          { icon: '💑', label: 'Match',        colors: ['rgba(244,63,94,0.4)',  'rgba(139,92,246,0.3)'] },
        ];
    return (
      <Animated.View entering={FadeInDown.delay(350).springify()} style={{ marginBottom: 18 }}>
        <Text style={s.quickActionsTitle}>
          {language === 'si' ? '✦ ඉක්මන් ක්‍රියා' : '✦ Quick Actions'}
        </Text>
        <View style={s.quickGrid}>
          {actions.map(function (a, i) {
            return <QuickTile key={i} icon={a.icon} label={a.label} colors={a.colors} />;
          })}
        </View>
      </Animated.View>
    );
  }

  return (
    <CosmicBackground>
      <ScrollView
        style={[s.flex, { backgroundColor: 'transparent' }]}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchData}
            tintColor="#FBBF24"
            colors={['#FBBF24', '#9333EA']}
          />
        }
      >
        {/* ── Orrery Loading State ── */}
        {loading && (
          <View style={s.center}>
            <View style={s.orreryLoader}>
              <LinearGradient colors={['rgba(147,51,234,0.3)', 'transparent']} style={StyleSheet.absoluteFill} />
              <ActivityIndicator size="large" color="#FBBF24" />
            </View>
            <Text style={s.loadingText}>{t('channelingEnergies')}</Text>
          </View>
        )}

        {/* ── Error State ── */}
        {error && !loading && (
          <View style={s.center}>
            <View style={s.errorOrb}>
              <LinearGradient colors={['rgba(239,68,68,0.2)', 'transparent']} style={StyleSheet.absoluteFill} />
              <Ionicons name="planet" size={44} color="#EF4444" />
            </View>
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={fetchData}>
              <LinearGradient colors={['rgba(251,191,36,0.25)', 'rgba(245,158,11,0.15)']} style={StyleSheet.absoluteFill} />
              <Ionicons name="refresh" size={16} color="#FBBF24" />
              <Text style={s.retryText}>{t('realign')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {data && !loading && (
          <View>
            {/* ── Sky Portal Hero ── */}
            {renderSkyPortalHero()}

            {/* ── Rahu Kalaya Banner ── */}
            {renderRahuBanner()}

            {/* ── Tri-Panel Cosmic Stats ── */}
            <Animated.View entering={FadeInDown.delay(200).springify()} style={s.statRow}>
              <MysticStatCard icon="sunny"  label={t('sunrise')}   value={sunriseVal}   color="#FBBF24" />
              <MysticStatCard icon="moon"   label={t('sunset')}    value={sunsetVal}    color="#A78BFA" />
              <MysticStatCard icon="star"   label={t('nakshatra')} value={nakshatraVal} color="#34D399" />
            </Animated.View>

            {/* ── Quick Actions ── */}
            {renderQuickActions()}

            {/* ── Personalised Birth Chart Section ── */}
            {hasBirthData && chartData && renderBirthSummary()}
            {hasBirthData && chartData && renderChartCard()}
            {hasBirthData && chartData && renderLagnaPalapala()}
            {hasBirthData && chartData && renderPersonality()}
            {hasBirthData && chartLoading && (
              <AuraBox>
                <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                  <View style={s.orreryLoader}>
                    <LinearGradient colors={['rgba(251,191,36,0.2)', 'transparent']} style={StyleSheet.absoluteFill} />
                    <ActivityIndicator size="large" color="#FBBF24" />
                  </View>
                  <Text style={{ color: '#FBBF24', marginTop: 14, fontStyle: 'italic', fontSize: 14, letterSpacing: 0.5 }}>
                    {language === 'si' ? 'කේන්දරය සකසමින් පවතී...' : 'Calculating your birth chart...'}
                  </Text>
                </View>
              </AuraBox>
            )}
            {!hasBirthData && renderNoBirthDataPrompt()}

            {/* ── Panchanga Card ── */}
            {data.panchanga && (
              <Animated.View entering={FadeInDown.delay(400).springify()}>
                <AuraBox accentColor="rgba(99,102,241,0.2)">
                  <View style={s.secHeader}>
                    <LinearGradient colors={['#6366F1', '#3B82F6']} style={s.secIconWrap}>
                      <Text style={{ fontSize: 14 }}>🕉</Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={s.secTitle}>{t('sacredPanchanga')}</Text>
                      <Text style={s.secHint}>{t('sacredPanchangaHint')}</Text>
                    </View>
                  </View>
                  {[
                    [t('tithi'),     data.panchanga.tithi,     t('tithiHint')],
                    [t('nakshatra'), data.panchanga.nakshatra, t('nakshatraHint')],
                    [t('yoga'),      data.panchanga.yoga,      t('yogaHint')],
                    [t('karana'),    data.panchanga.karana,     t('karanaHint')],
                    [t('vaara'),     data.panchanga.vaara,     t('vaaraHint')],
                  ].map(function (item, i) {
                    var label = item[0];
                    var entry = item[1];
                    var hint  = item[2];
                    if (!entry) return null;
                    var englishName = typeof entry === 'string' ? entry : (entry.english || entry.name || String(entry));
                    var sinhalaName = typeof entry === 'object' ? entry.sinhala : null;
                    var dispName = (language === 'si' && sinhalaName) ? sinhalaName : englishName;
                    var subName  = language === 'si' ? null : sinhalaName;
                    var rowColors = ['#C084FC', '#93C5FD', '#34D399', '#FDE68A', '#F9A8D4'];
                    return (
                      <View key={i} style={[s.pRow, i === 4 && { borderBottomWidth: 0 }]}>
                        <View style={[s.pDot, { backgroundColor: rowColors[i] }]} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[s.pLabel, { color: rowColors[i] }]}>{label}</Text>
                            <Text style={s.pHint}>{hint}</Text>
                          </View>
                        </View>
                        <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                          <Text style={s.pValue}>{dispName}</Text>
                          {subName ? <Text style={s.pSinhala}>{subName}</Text> : null}
                        </View>
                      </View>
                    );
                  })}
                </AuraBox>
              </Animated.View>
            )}

            {/* ── Auspicious Periods ── */}
            {data.auspiciousPeriods && data.auspiciousPeriods.length > 0 && (
              <Animated.View entering={FadeInDown.delay(500).springify()}>
                <AuraBox accentColor="rgba(52,211,153,0.2)">
                  <View style={s.secHeader}>
                    <LinearGradient colors={['#34D399', '#059669']} style={s.secIconWrap}>
                      <Text style={{ fontSize: 14 }}>🌿</Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={s.secTitle}>{t('auspiciousAlignments')}</Text>
                      <Text style={s.secHint}>{t('auspiciousAlignmentsHint')}</Text>
                    </View>
                  </View>
                  {data.auspiciousPeriods.map(function (p, i) {
                    var periodName = p.name || p.activity || t('blessedTime');
                    if (language === 'si' && p.sinhala) periodName = p.sinhala;
                    return (
                      <View key={i} style={s.auspRow}>
                        <LinearGradient colors={['#34D399', '#059669']} style={s.auspAccentBar} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.auspName}>{periodName}</Text>
                          {language !== 'si' && p.sinhala ? <Text style={s.auspSinhala}>{p.sinhala}</Text> : null}
                        </View>
                        <View style={s.auspTimeBadge}>
                          <Text style={s.auspTime}>
                            {p.startFormatted ? p.startFormatted.display : toSLT(p.start, t)}
                          </Text>
                          <Text style={[s.auspTime, { opacity: 0.6 }]}> – </Text>
                          <Text style={s.auspTime}>
                            {p.endFormatted ? p.endFormatted.display : toSLT(p.end, t)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </AuraBox>
              </Animated.View>
            )}

            <View style={{ height: 140 }} />
          </View>
        )}
      </ScrollView>
    </CosmicBackground>
  );
}

var chartCellSize = (SCREEN_WIDTH - 72) / 4;

var s = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 108 : 88 },
  center: { alignItems: 'center', justifyContent: 'center', paddingTop: 120 },

  // ── Loading / Error ──────────────────────────────────────
  orreryLoader: {
    width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)',
    marginBottom: 16,
  },
  loadingText: { color: '#FBBF24', fontSize: 14, fontStyle: 'italic', letterSpacing: 1 },
  errorOrb: {
    width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', marginBottom: 16,
  },
  errorText: { color: '#EF4444', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 28, paddingVertical: 12, borderRadius: 999,
    overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(251,191,36,0.35)',
  },
  retryText: { color: '#FBBF24', fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.2 },

  // ── Sky Portal Hero ──────────────────────────────────────
  heroCard: {
    borderRadius: 32, overflow: 'hidden', padding: 22,
    position: 'relative',
    borderWidth: 1, borderColor: 'rgba(147,51,234,0.3)',
    shadowColor: '#9333EA', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4, shadowRadius: 28, elevation: 12,
    backgroundColor: 'rgba(20,8,50,0.85)',
  },
  heroCardBorder: {
    ...StyleSheet.absoluteFillObject, borderRadius: 32,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  heroGreetRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  heroGreeting: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.8, marginBottom: 2 },
  heroName: {
    fontSize: 30, fontWeight: '900', color: '#FFF', letterSpacing: 0.5,
    textShadowColor: 'rgba(192,132,252,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12,
  },
  heroDateBadge: {
    backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)',
  },
  heroDateText: { color: '#FDE68A', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  heroGlyphWrap: {
    alignSelf: 'center', width: 90, height: 90, borderRadius: 45,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(147,51,234,0.4)', overflow: 'hidden',
    shadowColor: '#9333EA', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 20,
  },
  heroGlyph: { fontSize: 28, color: '#E9D5FF' },
  heroGlyphLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '700', textAlign: 'center', marginTop: 2 },
  heroVibeRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 12 },
  heroVibePill: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  heroVibePillText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  heroTithiRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  heroTithiText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '500' },

  // ── Rahu Banner ──────────────────────────────────────────
  rahuBannerActive: {
    borderRadius: 20, overflow: 'hidden', padding: 16,
    borderWidth: 1.5, borderColor: 'rgba(220,38,38,0.5)',
    shadowColor: '#EF4444', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  rahuBannerBorder: {
    ...StyleSheet.absoluteFillObject, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  rahuBannerInner: { flexDirection: 'row', alignItems: 'center' },
  rahuBannerTitle: { color: '#FCA5A5', fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
  rahuBannerTime: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  rahuDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444',
    shadowColor: '#EF4444', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6,
  },
  rahuRingWrap: {
    position: 'absolute', top: '50%', left: '50%',
    marginLeft: -30, marginTop: -30, width: 60, height: 60,
    alignItems: 'center', justifyContent: 'center', zIndex: -1,
  },
  rahuRing: {
    position: 'absolute', width: 60, height: 60, borderRadius: 30,
    borderWidth: 2, borderColor: 'rgba(239,68,68,0.5)',
  },
  rahuBannerDormant: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 14, overflow: 'hidden', padding: 12,
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.2)',
  },
  rahuBannerDormantText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500', flex: 1 },
  rahuWarning: { fontSize: 12, color: '#FCA5A5', fontStyle: 'italic', fontWeight: '500' },

  // ── Stat Cards ───────────────────────────────────────────
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statCard: {
    flex: 1, borderRadius: 22, padding: 14, alignItems: 'center',
    overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 5,
  },
  statIconWrap: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10,
  },
  statValue: {
    fontSize: 15, fontWeight: '800', color: '#FFF', marginTop: 2,
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },
  statLabel: { fontSize: 9, color: 'rgba(255,255,255,0.45)', marginTop: 3, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },

  // ── Quick Actions ────────────────────────────────────────
  quickActionsTitle: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },
  quickGrid: { flexDirection: 'row', gap: 10 },
  quickTile: {
    flex: 1, height: 90, borderRadius: 22, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 4,
  },
  quickTileLabel: { color: '#FFF', fontSize: 10, fontWeight: '700', textAlign: 'center', letterSpacing: 0.5 },
  quickTileBorder: {
    ...StyleSheet.absoluteFillObject, borderRadius: 22,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },

  // ── Section Header ───────────────────────────────────────
  secHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 12 },
  secIconWrap: {
    width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  secTitle: { fontSize: 17, fontWeight: '800', color: '#FDE68A', letterSpacing: 0.3 },
  secHint: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2, lineHeight: 15 },

  // ── Identity Grid ────────────────────────────────────────
  identityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  identityItem: {
    width: '47%', borderRadius: 18, padding: 14, alignItems: 'center',
    overflow: 'hidden', borderWidth: 1,
  },
  identityIcon: { fontSize: 20, marginBottom: 4 },
  identityLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  identityValue: { fontSize: 17, fontWeight: '900', marginTop: 4, textAlign: 'center' },
  identitySinhala: { fontSize: 11, color: '#C084FC', marginTop: 2 },
  lordRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(192,132,252,0.08)', borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: 'rgba(192,132,252,0.18)',
  },
  lordText: { color: '#C084FC', fontSize: 13, fontWeight: '600' },

  // ── Chart Aura ───────────────────────────────────────────
  chartAuraWrap: { position: 'relative' },
  chartAuraGlow: {
    position: 'absolute', top: -20, left: -20, right: -20, bottom: -20,
    borderRadius: 20,
  },

  // ── Lagna Palapala ───────────────────────────────────────
  palapalaText: { color: 'rgba(255,255,255,0.72)', fontSize: 14, lineHeight: 23, marginBottom: 16 },
  traitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  traitChip: {
    backgroundColor: 'rgba(124,58,237,0.12)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)',
  },
  traitText: { color: '#C084FC', fontSize: 12, fontWeight: '600' },
  luckyRow: { flexDirection: 'row', gap: 12 },
  luckyItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(251,191,36,0.07)', borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.15)',
  },
  luckyIcon: { fontSize: 16 },
  luckyLabel: { color: '#FDE68A', fontSize: 12, fontWeight: '600', flex: 1 },

  // ── Personality ──────────────────────────────────────────
  personalityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  personalityItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1,
  },
  personalityText: { fontSize: 12, fontWeight: '700' },

  // ── Panchanga ────────────────────────────────────────────
  pRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', gap: 10,
  },
  pDot: { width: 6, height: 6, borderRadius: 3 },
  pLabel: { fontSize: 13, fontWeight: '600' },
  pHint: { fontSize: 9, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' },
  pValue: { fontSize: 14, color: '#FFF', fontWeight: '700' },
  pSinhala: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 },

  // ── Auspicious Periods ───────────────────────────────────
  auspRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  auspAccentBar: { width: 3, height: 28, borderRadius: 2 },
  auspName: { fontSize: 14, color: '#FFF', fontWeight: '700' },
  auspSinhala: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  auspTimeBadge: { flexDirection: 'row', alignItems: 'center' },
  auspTime: { fontSize: 13, color: '#34D399', fontWeight: '800', letterSpacing: 0.3 },

  // ── No Birth Data ────────────────────────────────────────
  noBirthTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 10, letterSpacing: 0.3 },
  noBirthBody: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20, paddingHorizontal: 10 },
  noBirthCta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999, overflow: 'hidden',
  },
  noBirthCtaText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  // ── Ring ──────────────────────────────────────────────────
  ringWrap: {
    width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(251,191,36,0.25)', marginBottom: 6, overflow: 'hidden',
  },
  ringScore: { fontSize: 26, fontWeight: '900' },
  ringUnit: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: '700' },
  ringLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },

  // ── Stat Icon ────────────────────────────────────────────
  statIconWrap: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10,
  },
});