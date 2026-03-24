import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, RefreshControl, TouchableOpacity,
  StyleSheet, Platform, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line, G, Text as SvgText, Defs, RadialGradient, Stop, Ellipse, Path } from 'react-native-svg';
import Animated, {
  FadeInDown, FadeInUp,
  useSharedValue, useAnimatedStyle, useAnimatedScrollHandler,
  withRepeat, withSequence, withTiming, withSpring,
  interpolate, Easing,
} from 'react-native-reanimated';
import CosmicBackground from '../../components/CosmicBackground';
import DesktopScreenWrapper, { useDesktopCtx } from '../../components/DesktopScreenWrapper';
import SpringPressable from '../../components/effects/SpringPressable';
import CosmicLoader from '../../components/effects/CosmicLoader';
import PinchableView from '../../components/effects/PinchableView';
import CosmicCard from '../../components/ui/CosmicCard';
import SectionHeader from '../../components/ui/SectionHeader';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Colors, Typography, Gradients, Spacing } from '../../constants/theme';
import SriLankanChart from '../../components/SriLankanChart';

var { width: SCREEN_WIDTH } = Dimensions.get('window');

// Approximate moon phase from current date (fallback when server data not yet loaded)
// Returns 1-30 tithi number based on synodic month (~29.53 days)
function getMoonPhaseFromDate() {
  var now = new Date();
  // Known new moon: Jan 6, 2000 (epoch reference)
  var refNewMoon = new Date(2000, 0, 6, 18, 14, 0).getTime();
  var synodicMonth = 29.53058867;
  var daysSinceRef = (now.getTime() - refNewMoon) / (24 * 60 * 60 * 1000);
  var cyclePos = ((daysSinceRef % synodicMonth) + synodicMonth) % synodicMonth;
  return Math.floor(cyclePos / synodicMonth * 30) + 1;
}

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

/* ── Cosmic Orrery — Immersive Galaxy Hero ── */
var ZODIAC_SIGNS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
var ZODIAC_NAMES_EN = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
var ZODIAC_COLORS = [
  '#FF6B6B','#34D399','#FFD666','#7DD3FC','#FFB800','#6EE7B7',
  '#F9A8D4','#D4A5FF','#FF9F43','#94A3B8','#67E8F9','#C4B5FD',
];

function CosmicOrrery({ size, activeIndex, tithiNum }) {
  var pad = size * 0.10;
  var vb = size + pad * 2;
  var cx = vb / 2, cy = vb / 2;
  var zodiacR = vb * 0.36;
  var orbit2 = vb * 0.24;
  var orbit1 = vb * 0.15;
  var coreR = vb * 0.055;
  var u = vb / 300;

  var nodeR = Math.max(u * 8, 5);
  var activeNodeR = Math.max(u * 13, 8);
  var activeGlowR = Math.max(u * 18, 11);
  var activeBgR = Math.max(u * 11, 7);
  var fontSize = Math.max(u * 11, 7);
  var activeFontSize = Math.max(u * 14, 9);
  var planetScale = Math.max(u, 0.5);

  // Moon phase from tithiNum (1-30): 1=new crescent, 15=full, 16=waning start, 30=new moon
  // illumination: 0=new, 1=full
  var moonTithi = tithiNum || 1;
  var illumination = moonTithi <= 15 ? (moonTithi - 1) / 14 : (30 - moonTithi) / 14;
  illumination = Math.max(0, Math.min(1, illumination));
  // Moon position: place on the mid-orbit ring, opposite from where sun is (roughly)
  var moonAngle = ((moonTithi / 30) * 360 + 180) * Math.PI / 180;
  var moonX = cx + orbit2 * 0.95 * Math.cos(moonAngle);
  var moonY = cy + orbit2 * 0.95 * Math.sin(moonAngle);
  var moonR = Math.max(coreR * 1.1, 4.5);

  var STAR_FIELD = [
    [0.08,0.10,0.7,'#FFF'],[0.92,0.08,0.5,'#D4A5FF'],[0.05,0.55,0.6,'#67E8F9'],
    [0.95,0.50,0.4,'#FFF'],[0.15,0.90,0.5,'#FFD666'],[0.88,0.88,0.6,'#FFF'],
    [0.50,0.03,0.5,'#D4A5FF'],[0.30,0.07,0.3,'#FFF'],[0.72,0.05,0.4,'#67E8F9'],
    [0.03,0.35,0.4,'#FFF'],[0.97,0.30,0.3,'#FFD666'],[0.20,0.70,0.3,'#FFF'],
    [0.80,0.72,0.4,'#D4A5FF'],[0.42,0.95,0.5,'#FFF'],[0.65,0.96,0.3,'#67E8F9'],
    [0.12,0.45,0.3,'#FFF'],[0.55,0.12,0.4,'#FFF'],[0.75,0.40,0.3,'#FFD666'],
    [0.35,0.80,0.4,'#FFF'],[0.60,0.65,0.3,'#D4A5FF'],
  ];

  var INNER_PLANETS = [
    { angle: 45, r: orbit1, sz: 2.5 * planetScale, color: '#FFB800' },
    { angle: 165, r: orbit1, sz: 2 * planetScale, color: '#67E8F9' },
    { angle: 285, r: orbit1, sz: 1.8 * planetScale, color: '#D4A5FF' },
  ];

  var MID_PLANETS = [
    { angle: 20, r: orbit2, sz: 2 * planetScale, color: '#FF6B6B' },
    { angle: 110, r: orbit2, sz: 2.5 * planetScale, color: '#34D399' },
    { angle: 200, r: orbit2, sz: 1.5 * planetScale, color: '#FFD666' },
    { angle: 310, r: orbit2, sz: 2 * planetScale, color: '#F9A8D4' },
  ];

  return (
    <Svg width={size} height={size} viewBox={-pad + ' ' + -pad + ' ' + vb + ' ' + vb}>
      <Defs>
        <RadialGradient id="oSunCore" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FFFBE6" stopOpacity={1} />
          <Stop offset="25%" stopColor="#FFD666" stopOpacity={0.95} />
          <Stop offset="50%" stopColor="#FFB800" stopOpacity={0.7} />
          <Stop offset="100%" stopColor="#FF8C00" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="oSunCorona" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FFB800" stopOpacity={0.4} />
          <Stop offset="40%" stopColor="#FFB800" stopOpacity={0.12} />
          <Stop offset="70%" stopColor="#B47AFF" stopOpacity={0.05} />
          <Stop offset="100%" stopColor="#B47AFF" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="oNebulaViolet" cx="30%" cy="25%" r="55%">
          <Stop offset="0%" stopColor="#B47AFF" stopOpacity={0.10} />
          <Stop offset="60%" stopColor="#6C3FA0" stopOpacity={0.04} />
          <Stop offset="100%" stopColor="#020010" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="oNebulaTeal" cx="75%" cy="70%" r="50%">
          <Stop offset="0%" stopColor="#4CC9F0" stopOpacity={0.08} />
          <Stop offset="60%" stopColor="#0E7490" stopOpacity={0.03} />
          <Stop offset="100%" stopColor="#020010" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="oActiveNode" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FFD666" stopOpacity={0.8} />
          <Stop offset="40%" stopColor="#FFB800" stopOpacity={0.35} />
          <Stop offset="75%" stopColor="#FFB800" stopOpacity={0.10} />
          <Stop offset="100%" stopColor="#FFB800" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* Deep space nebula washes */}
      <Circle cx={vb * 0.3} cy={vb * 0.25} r={vb * 0.45} fill="url(#oNebulaViolet)" />
      <Circle cx={vb * 0.75} cy={vb * 0.7} r={vb * 0.40} fill="url(#oNebulaTeal)" />

      {/* Star field */}
      {STAR_FIELD.map(function (st, i) {
        var sr = Math.max(st[2] * u, 0.3);
        return (
          <G key={'sf' + i}>
            <Circle cx={st[0] * vb} cy={st[1] * vb} r={sr + 1} fill={st[3]} opacity={0.08} />
            <Circle cx={st[0] * vb} cy={st[1] * vb} r={sr} fill={st[3]} opacity={0.7} />
          </G>
        );
      })}

      {/* Orbital rings */}
      <Circle cx={cx} cy={cy} r={orbit1} stroke="rgba(255,184,0,0.08)" strokeWidth={0.6} fill="none" />
      <Circle cx={cx} cy={cy} r={orbit2} stroke="rgba(180,122,255,0.07)" strokeWidth={0.5} fill="none" />
      <Circle cx={cx} cy={cy} r={orbit2} stroke="rgba(180,122,255,0.03)" strokeWidth={3 * u} fill="none" />
      <Circle cx={cx} cy={cy} r={zodiacR} stroke="rgba(180,122,255,0.10)" strokeWidth={0.7} fill="none" strokeDasharray="2,8" />
      <Circle cx={cx} cy={cy} r={zodiacR} stroke="rgba(180,122,255,0.03)" strokeWidth={4 * u} fill="none" />

      {/* Dodecagon edges */}
      {ZODIAC_SIGNS.map(function (_, i) {
        var a1 = (i * 30 - 90) * Math.PI / 180;
        var a2 = ((i + 1) * 30 - 90) * Math.PI / 180;
        var isAdj = i === activeIndex || (i + 1) % 12 === activeIndex;
        return (
          <Line key={'edge' + i}
            x1={cx + zodiacR * Math.cos(a1)} y1={cy + zodiacR * Math.sin(a1)}
            x2={cx + zodiacR * Math.cos(a2)} y2={cy + zodiacR * Math.sin(a2)}
            stroke={isAdj ? 'rgba(255,214,102,0.18)' : 'rgba(180,122,255,0.06)'}
            strokeWidth={isAdj ? 0.8 : 0.4}
          />
        );
      })}

      {/* Spoke lines */}
      {ZODIAC_SIGNS.map(function (_, i) {
        var angle = (i * 30 - 90) * Math.PI / 180;
        var isAct = i === activeIndex;
        return (
          <Line key={'spoke' + i}
            x1={cx + orbit1 * 0.8 * Math.cos(angle)} y1={cy + orbit1 * 0.8 * Math.sin(angle)}
            x2={cx + zodiacR * Math.cos(angle)} y2={cy + zodiacR * Math.sin(angle)}
            stroke={isAct ? 'rgba(255,214,102,0.15)' : 'rgba(180,122,255,0.025)'}
            strokeWidth={isAct ? 0.6 : 0.3}
            strokeDasharray={isAct ? 'none' : '1,4'}
          />
        );
      })}

      {/* Inner planets */}
      {INNER_PLANETS.map(function (p, i) {
        var a = (p.angle - 90) * Math.PI / 180;
        var px = cx + p.r * Math.cos(a);
        var py = cy + p.r * Math.sin(a);
        return (
          <G key={'ip' + i}>
            <Circle cx={px} cy={py} r={p.sz + 2 * u} fill={p.color} opacity={0.10} />
            <Circle cx={px} cy={py} r={p.sz} fill={p.color} opacity={0.85} />
          </G>
        );
      })}

      {/* Mid planets */}
      {MID_PLANETS.map(function (p, i) {
        var a = (p.angle - 90) * Math.PI / 180;
        var px = cx + p.r * Math.cos(a);
        var py = cy + p.r * Math.sin(a);
        return (
          <G key={'mp' + i}>
            <Circle cx={px} cy={py} r={p.sz + 1.5 * u} fill={p.color} opacity={0.08} />
            <Circle cx={px} cy={py} r={p.sz} fill={p.color} opacity={0.70} />
          </G>
        );
      })}

      {/* Sun */}
      <Circle cx={cx} cy={cy} r={coreR * 3.5} fill="url(#oSunCorona)" />
      <Circle cx={cx} cy={cy} r={coreR * 1.6} fill="url(#oSunCore)" />
      <Circle cx={cx} cy={cy} r={coreR} fill="#FFD666" opacity={0.95} />
      <Circle cx={cx} cy={cy} r={coreR * 0.5} fill="#FFFBE6" opacity={0.8} />

      {/* Moon — phase based on current tithi */}
      {(() => {
        // Moon glow
        var elements = [
          <Circle key="mglow" cx={moonX} cy={moonY} r={moonR + 3 * u} fill="#93C5FD" opacity={0.12} />,
          <Circle key="mglow2" cx={moonX} cy={moonY} r={moonR + 6 * u} fill="#93C5FD" opacity={0.05} />,
        ];
        // Dark base (the "unlit" side)
        elements.push(<Circle key="mbase" cx={moonX} cy={moonY} r={moonR} fill="#1E1E3A" />);
        // Lit portion
        if (illumination > 0.02) {
          elements.push(<Circle key="mlit" cx={moonX} cy={moonY} r={moonR * 0.98} fill="#D4D4E8" opacity={Math.min(illumination * 1.1, 1)} />);
        }
        // Shadow overlay to create phase shape
        if (illumination < 0.97 && illumination > 0.03) {
          // For waxing (Shukla, tithi 1-15): shadow comes from left
          // For waning (Krishna, tithi 16-30): shadow comes from right
          var isWaxing = moonTithi <= 15;
          var shadowShift = isWaxing
            ? moonR * (1 - illumination * 2)
            : moonR * (illumination * 2 - 1);
          elements.push(
            <Ellipse key="mshadow"
              cx={moonX + shadowShift * 0.6}
              cy={moonY}
              rx={moonR * Math.abs(1 - illumination * 2) * 0.95 + 0.5}
              ry={moonR * 0.98}
              fill="#1E1E3A"
              opacity={0.92}
            />
          );
        }
        // Subtle crater texture dots
        if (illumination > 0.2) {
          elements.push(
            <Circle key="mc1" cx={moonX - moonR * 0.25} cy={moonY - moonR * 0.15} r={moonR * 0.12} fill="#B8B8D0" opacity={0.25} />,
            <Circle key="mc2" cx={moonX + moonR * 0.2} cy={moonY + moonR * 0.25} r={moonR * 0.09} fill="#B8B8D0" opacity={0.2} />,
          );
        }
        // Outer ring
        elements.push(<Circle key="mring" cx={moonX} cy={moonY} r={moonR} fill="none" stroke="#93C5FD" strokeWidth={0.6} opacity={0.4} />);
        return elements;
      })()}

      {/* Zodiac sign nodes — all sizes proportional */}
      {ZODIAC_SIGNS.map(function (sign, i) {
        var angle = (i * 30 - 90) * Math.PI / 180;
        var x = cx + zodiacR * Math.cos(angle);
        var y = cy + zodiacR * Math.sin(angle);
        var isActive = i === activeIndex;
        var col = ZODIAC_COLORS[i];

        if (isActive) {
          return (
            <G key={'z' + i}>
              <Circle cx={x} cy={y} r={activeGlowR} fill="url(#oActiveNode)" />
              <Circle cx={x} cy={y} r={activeNodeR} fill="rgba(255,184,0,0.10)" stroke="rgba(255,214,102,0.50)" strokeWidth={1.2} />
              <Circle cx={x} cy={y} r={activeBgR} fill="rgba(20,10,40,0.7)" />
              <SvgText x={x} y={y + activeFontSize * 0.38} fontSize={activeFontSize} fill="#FFD666" textAnchor="middle" fontWeight="bold">{sign}</SvgText>
            </G>
          );
        }

        return (
          <G key={'z' + i}>
            <Circle cx={x} cy={y} r={nodeR + 2 * u} fill={col} opacity={0.06} />
            <Circle cx={x} cy={y} r={nodeR} fill="rgba(12,6,32,0.75)" stroke={col + '40'} strokeWidth={0.7} />
            <SvgText x={x} y={y + fontSize * 0.38} fontSize={fontSize} fill={col} textAnchor="middle" opacity={0.75}>{sign}</SvgText>
          </G>
        );
      })}

      {/* Dust particles */}
      {Array.from({ length: 24 }).map(function (_, i) {
        var band = i < 8 ? orbit1 : i < 16 ? orbit2 : zodiacR;
        var jitter = (i % 5 - 2) * 2 * u;
        var angle = (i * 15 + i * 7) * Math.PI / 180;
        var dx = cx + (band + jitter) * Math.cos(angle);
        var dy = cy + (band + jitter) * Math.sin(angle);
        return <Circle key={'d' + i} cx={dx} cy={dy} r={0.4 * u + (i % 3) * 0.2 * u} fill="rgba(255,255,255,1)" opacity={0.15 + (i % 4) * 0.05} />;
      })}
    </Svg>
  );
}

/* ── Quick Action Pill ── */
function QuickActionPill({ icon, label, onPress, gradient }) {
  return (
    <SpringPressable onPress={onPress} haptic="light" scalePressed={0.95}>
      <View style={s.quickPill}>
        <LinearGradient colors={gradient} style={s.quickPillBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <Text style={{ fontSize: 20 }}>{icon}</Text>
        <Text style={s.quickPillLabel}>{label}</Text>
      </View>
    </SpringPressable>
  );
}

/* ── Stat Mini ── */
function StatMini({ icon, label, value, color }) {
  return (
    <View style={s.statMini}>
      <View style={[s.statMiniIcon, { borderColor: color + '30' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={s.statMiniValue}>{value}</Text>
      <Text style={s.statMiniLabel}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  var { t, language } = useLanguage();
  var { user } = useAuth();
  var isDesktop = useDesktopCtx();
  var router = useRouter();
  var [data, setData] = useState(null);
  var [chartData, setChartData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [chartLoading, setChartLoading] = useState(false);
  var [error, setError] = useState(null);

  var scrollY = useSharedValue(0);
  var scrollHandler = useAnimatedScrollHandler({
    onScroll: function (event) { scrollY.value = event.contentOffset.y; },
  });
  var heroParallax = useAnimatedStyle(function () {
    return {
      transform: [
        { translateY: interpolate(scrollY.value, [0, 200], [0, -25], 'clamp') },
        { scale: interpolate(scrollY.value, [0, 200], [1, 0.96], 'clamp') },
      ],
      opacity: interpolate(scrollY.value, [0, 300], [1, 0.7], 'clamp'),
    };
  });

  var wheelSpin = useSharedValue(0);
  var coronaPulse = useSharedValue(0);
  useEffect(function () {
    wheelSpin.value = withRepeat(
      withTiming(360, { duration: 150000, easing: Easing.linear }),
    -1);
    coronaPulse.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
    -1, true);
  }, []);
  var wheelStyle = useAnimatedStyle(function () {
    return { transform: [{ rotate: wheelSpin.value + 'deg' }] };
  });
  var coronaPulseStyle = useAnimatedStyle(function () {
    return {
      transform: [{ scale: interpolate(coronaPulse.value, [0, 1], [1, 1.15]) }],
      opacity: interpolate(coronaPulse.value, [0, 1], [0.6, 1]),
    };
  });

  var noBirthGlow = useSharedValue(0.6);
  useEffect(function () {
    noBirthGlow.value = withRepeat(
      withSequence(withTiming(1, { duration: 2000 }), withTiming(0.6, { duration: 2000 })), -1, true
    );
  }, []);
  var noBirthGlowStyle = useAnimatedStyle(function () { return { opacity: noBirthGlow.value }; });

  var birthDateTime = user?.birthData?.dateTime || null;
  var birthLat = user?.birthData?.lat || 6.9271;
  var birthLng = user?.birthData?.lng || 79.8612;
  var hasBirthData = !!birthDateTime;
  var displayName = user?.displayName || 'Cosmic Seeker';

  var fetchData = useCallback(async function () {
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

  var fetchBirthChart = useCallback(async function (cancelled) {
    if (!hasBirthData) return;
    try {
      setChartLoading(true);
      var res = await api.getBirthChartBasic(birthDateTime, birthLat, birthLng, language);
      if (!cancelled.current && res.success) setChartData(res.data);
    } catch (err) {
      if (cancelled.current) return;
      if (err && (err.name === 'AbortError' || (err.message && err.message.indexOf('abort') !== -1))) return;
    } finally {
      if (!cancelled.current) setChartLoading(false);
    }
  }, [hasBirthData, birthDateTime, birthLat, birthLng, language]);

  useEffect(function () { fetchData(); }, [fetchData]);
  useEffect(function () {
    var cancelled = { current: false };
    fetchBirthChart(cancelled);
    return function () { cancelled.current = true; };
  }, [fetchBirthChart]);

  var getGreeting = function () {
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

  function getRahuCountdown() {
    if (!data || !data.rahuKalaya || !data.rahuKalaya.start || !data.rahuKalaya.end) return '';
    var now2 = Date.now();
    var rs = new Date(data.rahuKalaya.start).getTime();
    var re = new Date(data.rahuKalaya.end).getTime();
    if (isNaN(rs) || isNaN(re)) return '';
    var diffMs;
    if (rahuActive) diffMs = re - now2;
    else if (now2 < rs) diffMs = rs - now2;
    else return '';
    if (diffMs <= 0) return '';
    var mins = Math.floor(diffMs / 60000);
    var hrs = Math.floor(mins / 60);
    var remMins = mins % 60;
    return hrs > 0 ? hrs + 'h ' + remMins + 'm' : remMins + 'm';
  }

  function renderLagnaChart() {
    if (!chartData || !chartData.rashiChart) return null;
    var lagnaRashiId = chartData.lagna ? (chartData.lagna.rashiId || chartData.lagna.id || 1) : 1;
    var miniSize = Math.min(SCREEN_WIDTH - 80, 260);
    return (
      <View style={{ alignItems: 'center' }}>
        <PinchableView minScale={1} maxScale={2}>
          <SriLankanChart
            rashiChart={chartData.rashiChart}
            lagnaRashiId={lagnaRashiId}
            language={language}
            chartSize={miniSize}
          />
        </PinchableView>
      </View>
    );
  }

  /* ── Greeting Header ── */
  function renderGreeting() {
    return (
      <Animated.View entering={FadeInDown.delay(50).springify()} style={s.greetWrap}>
        <View style={{ flex: 1 }}>
          <Text style={s.greetText}>{getGreeting()}</Text>
          <Text style={s.greetName}>{displayName}</Text>
        </View>
        <View style={s.dateBadge}>
          <Text style={s.dateText}>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </Animated.View>
    );
  }

  /* ── Cosmic Orrery Hero ── */
  function renderZodiacHero() {
    var activeNakIndex = 0;
    if (data && data.panchanga && data.panchanga.nakshatra) {
      var nakshatraName = data.panchanga.nakshatra.english || data.panchanga.nakshatra.name || '';
      var nakshatraToZodiac = { 'Ashwini': 0, 'Bharani': 0, 'Krittika': 1, 'Rohini': 1, 'Mrigashira': 2, 'Ardra': 2, 'Punarvasu': 3, 'Pushya': 3, 'Ashlesha': 3, 'Magha': 4, 'Purva Phalguni': 4, 'Uttara Phalguni': 5, 'Hasta': 5, 'Chitra': 6, 'Swati': 6, 'Vishakha': 7, 'Anuradha': 7, 'Jyeshtha': 7, 'Mula': 8, 'Purva Ashadha': 8, 'Uttara Ashadha': 9, 'Shravana': 9, 'Dhanishta': 10, 'Shatabhisha': 10, 'Purva Bhadrapada': 11, 'Uttara Bhadrapada': 11, 'Revati': 11 };
      if (nakshatraToZodiac[nakshatraName] !== undefined) activeNakIndex = nakshatraToZodiac[nakshatraName];
    }

    var todayNakshatra = data && data.panchanga && data.panchanga.nakshatra
      ? (language === 'si' && data.panchanga.nakshatra.sinhala ? data.panchanga.nakshatra.sinhala : (data.panchanga.nakshatra.english || data.panchanga.nakshatra.name || ''))
      : '';

    var activeSignName = language === 'si' ? todayNakshatra : ZODIAC_NAMES_EN[activeNakIndex];
    var tithiVal = data && data.panchanga && data.panchanga.tithi
      ? (language === 'si' && data.panchanga.tithi.sinhala ? data.panchanga.tithi.sinhala : (data.panchanga.tithi.english || data.panchanga.tithi.name || '--'))
      : '--';
    var yogaVal = data && data.panchanga && data.panchanga.yoga
      ? (language === 'si' && data.panchanga.yoga.sinhala ? data.panchanga.yoga.sinhala : (data.panchanga.yoga.english || data.panchanga.yoga.name || '--'))
      : '--';

    // Get tithi number for moon phase (1-30)
    var currentTithiNum = data && data.panchanga && data.panchanga.tithi && data.panchanga.tithi.number
      ? data.panchanga.tithi.number
      : getMoonPhaseFromDate();

    var orrerySize = Math.min(SCREEN_WIDTH * 0.38, 160);

    return (
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <View style={s.dashHero}>
          <LinearGradient
            colors={['#0A0520', '#0D0730', '#10093A', '#0D0730', '#0A0520']}
            style={s.dashHeroBg}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
          <LinearGradient
            colors={['rgba(180,122,255,0.06)', 'transparent', 'rgba(76,201,240,0.04)']}
            style={s.dashHeroBg}
            start={{ x: 0, y: 0.2 }} end={{ x: 1, y: 0.8 }}
          />
          <Animated.View style={[s.dashNebulaBlob, coronaPulseStyle]} />
          <LinearGradient
            colors={['rgba(180,122,255,0.12)', 'transparent']}
            style={s.dashEdgeTop}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
          />

          {/* Top row — zodiac badge + mini orrery */}
          <View style={s.dashTopRow}>
            <View style={s.dashSignArea}>
              <View style={s.dashSignOuter}>
                <Animated.View style={[s.dashSignGlow, coronaPulseStyle]} />
                <View style={s.dashSignCircle}>
                  <LinearGradient colors={['rgba(255,184,0,0.22)', 'rgba(180,122,255,0.14)']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  <Text style={s.dashSignSymbol}>{ZODIAC_SIGNS[activeNakIndex]}</Text>
                </View>
              </View>
              <View style={s.dashSignInfo}>
                <Text style={s.dashHeroLabel}>{language === 'si' ? 'අද ලග්නය' : "Today's Sign"}</Text>
                <Text style={s.dashSignName}>{ZODIAC_NAMES_EN[activeNakIndex]}</Text>
                {todayNakshatra ? (
                  <View style={s.dashNakRow}>
                    <Ionicons name="star" size={10} color="#FFD666" />
                    <Text style={s.dashNakText}>{language === 'si' ? 'නක්ෂත්‍ර: ' : 'Nakshatra: '}{todayNakshatra}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <Animated.View style={[wheelStyle, { opacity: 0.90 }]}>
              <CosmicOrrery size={orrerySize} activeIndex={activeNakIndex} tithiNum={currentTithiNum} />
            </Animated.View>
          </View>

          {/* Divider */}
          <View style={s.dashDivider}>
            <LinearGradient colors={['transparent', 'rgba(180,122,255,0.20)', 'rgba(255,184,0,0.15)', 'transparent']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} />
          </View>

          {/* Info grid — daily panchanga at a glance */}
          <Text style={s.dashGridTitle}>{language === 'si' ? 'අද දිනයේ පංචාංගය' : "Today's Panchanga"}</Text>
          <View style={s.dashGrid}>
            <View style={s.dashCell}>
              <Ionicons name="sunny-outline" size={16} color="#FFB800" />
              <Text style={s.dashCellValue}>{sunriseVal}</Text>
              <Text style={s.dashCellLabel}>{t('sunrise')}</Text>
            </View>
            <View style={s.dashCell}>
              <Ionicons name="moon-outline" size={16} color="#B47AFF" />
              <Text style={s.dashCellValue}>{sunsetVal}</Text>
              <Text style={s.dashCellLabel}>{t('sunset')}</Text>
            </View>
            <View style={s.dashCell}>
              <Ionicons name="sparkles-outline" size={16} color="#34D399" />
              <Text style={s.dashCellValue}>{tithiVal}</Text>
              <Text style={s.dashCellLabel}>{language === 'si' ? 'තිථි' : 'Tithi'}</Text>
            </View>
            <View style={s.dashCell}>
              <Ionicons name="infinite-outline" size={16} color="#67E8F9" />
              <Text style={s.dashCellValue}>{yogaVal}</Text>
              <Text style={s.dashCellLabel}>{language === 'si' ? 'යෝග' : 'Yoga'}</Text>
            </View>
          </View>
        </View>

        {/* Rahu Kalaya — full-width alert strip */}
        {data && data.rahuKalaya && (
          <Animated.View entering={FadeInDown.delay(250).duration(400)}>
            <View style={[s.rahuStrip, rahuActive && s.rahuStripActive]}>
              {rahuActive && <LinearGradient colors={['rgba(239,68,68,0.15)', 'rgba(239,68,68,0.05)', 'rgba(239,68,68,0.15)']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} />}
              <View style={[s.rahuIconWrap, rahuActive && s.rahuIconWrapActive]}>
                <Ionicons name={rahuActive ? 'alert-circle' : 'shield-checkmark'} size={18} color={rahuActive ? '#FF6B6B' : '#34D399'} />
              </View>
              <View style={s.rahuContent}>
                <Text style={[s.rahuTitle, rahuActive && s.rahuTitleActive]}>
                  {rahuActive
                    ? (language === 'si' ? '⚠ රාහු කාලය සක්‍රීයයි' : '⚠ Rahu Kalaya Active')
                    : (language === 'si' ? 'රාහු කාල' : 'Rahu Kalaya')
                  }
                </Text>
                <Text style={[s.rahuTime, rahuActive && s.rahuTimeActive]}>
                  {rahuActive
                    ? (getRahuCountdown()
                        ? (language === 'si' ? 'අවසන් වීමට ' + getRahuCountdown() : 'Ends in ' + getRahuCountdown())
                        : (language === 'si' ? 'දැන් සක්‍රීයයි' : t('activeNow'))
                      )
                    : (data.rahuKalaya.startFormatted ? data.rahuKalaya.startFormatted.display : toSLT(data.rahuKalaya.start, t)) + ' – ' + (data.rahuKalaya.endFormatted ? data.rahuKalaya.endFormatted.display : toSLT(data.rahuKalaya.end, t))
                  }
                </Text>
              </View>
              <Animated.View style={[s.rahuDotPulse, { backgroundColor: rahuActive ? '#EF4444' : '#34D399' }, rahuActive && coronaPulseStyle]} />
            </View>
          </Animated.View>
        )}
      </Animated.View>
    );
  }

  /* Today's Sky info is now integrated into the dashboard hero */

  /* ── Quick Actions ── */
  function renderQuickActions() {
    var actions = language === 'si'
      ? [
          { icon: '🔮', label: 'ජ්‍යොතිෂ', gradient: ['rgba(147,51,234,0.5)', 'rgba(99,102,241,0.3)'], route: '/chat' },
          { icon: '📅', label: 'කේන්දරය', gradient: ['rgba(6,182,212,0.4)', 'rgba(59,130,246,0.3)'], route: '/kendara' },
          { icon: '⚡', label: 'අනාවැකි', gradient: ['rgba(255,215,0,0.4)', 'rgba(245,158,11,0.3)'], route: '/predictions' },
          { icon: '💑', label: 'ගැලපීම', gradient: ['rgba(244,63,94,0.4)', 'rgba(139,92,246,0.3)'], route: '/porondam' },
          { icon: '📊', label: 'වාර්තාව', gradient: ['rgba(52,211,153,0.4)', 'rgba(16,185,129,0.3)'], route: '/report' },
        ]
      : [
          { icon: '🔮', label: 'Ask Jyotishi', gradient: ['rgba(147,51,234,0.5)', 'rgba(99,102,241,0.3)'], route: '/chat' },
          { icon: '📅', label: 'Birth Chart', gradient: ['rgba(6,182,212,0.4)', 'rgba(59,130,246,0.3)'], route: '/kendara' },
          { icon: '⚡', label: 'Predictions', gradient: ['rgba(255,215,0,0.4)', 'rgba(245,158,11,0.3)'], route: '/predictions' },
          { icon: '💑', label: 'Match', gradient: ['rgba(244,63,94,0.4)', 'rgba(139,92,246,0.3)'], route: '/porondam' },
          { icon: '📊', label: 'Report', gradient: ['rgba(52,211,153,0.4)', 'rgba(16,185,129,0.3)'], route: '/report' },
        ];
    return (
      <Animated.View entering={FadeInDown.delay(250).springify()}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickRow}>
          {actions.map(function (a, i) {
            return <QuickActionPill key={i} icon={a.icon} label={a.label} gradient={a.gradient} onPress={function () { router.push(a.route); }} />;
          })}
        </ScrollView>
      </Animated.View>
    );
  }

  /* ── Birth Summary ── */
  function renderBirthSummary() {
    if (!chartData) return null;
    var lagna = chartData.lagna;
    var moonSign = chartData.moonSign;
    var sunSign = chartData.sunSign;
    var nakshatra = chartData.nakshatra;

    var items = [
      { icon: '⬆', label: language === 'si' ? 'ලග්නය' : 'Lagna', value: (language === 'si' && lagna?.sinhala ? lagna.sinhala : lagna?.english || '--'), color: '#B47AFF' },
      { icon: '🌙', label: language === 'si' ? 'චන්ද්‍ර' : 'Moon', value: (language === 'si' && moonSign?.sinhala ? moonSign.sinhala : moonSign?.english || '--'), color: '#93C5FD' },
      { icon: '☀', label: language === 'si' ? 'සූර්ය' : 'Sun', value: (language === 'si' && sunSign?.sinhala ? sunSign.sinhala : sunSign?.english || '--'), color: '#FFD666' },
      { icon: '✦', label: language === 'si' ? 'නක්ෂත්‍ර' : 'Nakshatra', value: (language === 'si' && nakshatra?.sinhala ? nakshatra.sinhala : nakshatra?.name || '--'), color: '#34D399' },
    ];

    return (
      <CosmicCard variant="content" delay={300}>
        <SectionHeader title={language === 'si' ? 'ඔබේ විශ්වීය අනන්‍යතාවය' : 'Your Cosmic Identity'} icon="🌟" delay={300} />
        <View style={s.identityGrid}>
          {items.map(function (item, i) {
            return (
              <Animated.View key={i} entering={FadeInDown.delay(350 + i * 60).springify()} style={[s.identityItem, { borderColor: item.color + '22' }]}>
                <LinearGradient colors={[item.color + '12', 'transparent']} style={StyleSheet.absoluteFill} />
                <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                <Text style={s.identityLabel}>{item.label}</Text>
                <Text style={[s.identityValue, { color: item.color }]}>{item.value}</Text>
              </Animated.View>
            );
          })}
        </View>
        {lagna?.lord && (
          <View style={s.lordRow}>
            <Ionicons name="planet" size={14} color="#B47AFF" />
            <Text style={s.lordText}>{language === 'si' ? 'ලග්නාධිපති: ' : 'Lagna Lord: '}{lagna.lord}</Text>
          </View>
        )}
      </CosmicCard>
    );
  }

  /* ── Lagna Chart Card ── */
  function renderChartCard() {
    if (!chartData) return null;
    return (
      <CosmicCard variant="content" delay={350}>
        <SectionHeader title={language === 'si' ? 'ලග්න සටහන' : 'Your Lagna Chart'} icon="🪐" delay={350} />
        <View style={{ alignItems: 'center' }}>
          {renderLagnaChart()}
        </View>
      </CosmicCard>
    );
  }

  /* ── Lagna Palapala ── */
  function renderLagnaPalapala() {
    if (!chartData || !chartData.lagnaDetails) return null;
    var ld = chartData.lagnaDetails;
    if (!ld.description) return null;
    return (
      <CosmicCard variant="content" delay={400}>
        <SectionHeader title={language === 'si' ? (ld.sinhala || 'ලග්න පලාපල') : (ld.english || 'Lagna Palapala')} icon="🔮" delay={400} />
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
              <Text style={{ fontSize: 15 }}>💎</Text>
              <Text style={s.luckyLabel}>{ld.gem}</Text>
            </View>
          )}
          {ld.luckyColor && (
            <View style={s.luckyItem}>
              <Text style={{ fontSize: 15 }}>🎨</Text>
              <Text style={s.luckyLabel}>{ld.luckyColor}</Text>
            </View>
          )}
        </View>
      </CosmicCard>
    );
  }

  /* ── Personality Traits ── */
  function renderPersonality() {
    if (!chartData || !chartData.personality) return null;
    var p = chartData.personality;
    var traitsSource = (language === 'si' && p.mainTraitsSi) ? p.mainTraitsSi : (p.lagnaTraits || p.sunTraits || []);
    if (!traitsSource || traitsSource.length === 0) {
      traitsSource = [].concat(p.lagnaTraits || [], p.moonTraits || [], p.sunTraits || []);
    }
    var uniqueTraits = traitsSource.filter(function (tr, i) { return traitsSource.indexOf(tr) === i; }).slice(0, 8);
    if (uniqueTraits.length === 0) return null;
    var traitColors = ['#B47AFF', '#93C5FD', '#FFB800', '#F87171', '#34D399', '#6EE7B7', '#FFD666', '#A78BFA'];

    return (
      <CosmicCard variant="content" delay={450}>
        <SectionHeader title={language === 'si' ? 'ඔබේ පෞරුෂය' : 'Your Personality'} icon="✨" delay={450} />
        <View style={s.personalityWrap}>
          {uniqueTraits.map(function (trait, i) {
            return (
              <Animated.View key={i} entering={FadeInUp.delay(500 + i * 40).springify()} style={[s.personalityPill, { borderColor: traitColors[i % traitColors.length] + '28' }]}>
                <Text style={[s.personalityText, { color: traitColors[i % traitColors.length] }]}>{trait}</Text>
              </Animated.View>
            );
          })}
        </View>
      </CosmicCard>
    );
  }

  /* ── Panchanga Card ── */
  function renderPanchanga() {
    if (!data || !data.panchanga) return null;
    var rows = [
      [t('tithi'), data.panchanga.tithi, '#B47AFF'],
      [t('nakshatra'), data.panchanga.nakshatra, '#93C5FD'],
      [t('yoga'), data.panchanga.yoga, '#34D399'],
      [t('karana'), data.panchanga.karana, '#FFD666'],
      [t('vaara'), data.panchanga.vaara, '#F472B6'],
    ];
    return (
      <CosmicCard variant="surface" delay={500}>
        <SectionHeader title={t('sacredPanchanga')} subtitle={t('sacredPanchangaHint')} icon="🕉" delay={500} />
        {rows.map(function (row, i) {
          var label = row[0], entry = row[1], color = row[2];
          if (!entry) return null;
          var englishName = typeof entry === 'string' ? entry : (entry.english || entry.name || String(entry));
          var sinhalaName = typeof entry === 'object' ? entry.sinhala : null;
          var dispName = (language === 'si' && sinhalaName) ? sinhalaName : englishName;
          var subName = language === 'si' ? null : sinhalaName;
          return (
            <View key={i} style={[s.pRow, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[s.pDot, { backgroundColor: color }]} />
              <Text style={[s.pLabel, { color }]}>{label}</Text>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={s.pValue}>{dispName}</Text>
                {subName ? <Text style={s.pSinhala}>{subName}</Text> : null}
              </View>
            </View>
          );
        })}
      </CosmicCard>
    );
  }

  /* ── Auspicious Periods ── */
  function renderAuspicious() {
    if (!data || !data.auspiciousPeriods || data.auspiciousPeriods.length === 0) return null;
    return (
      <CosmicCard variant="surface" delay={550}>
        <SectionHeader title={t('auspiciousAlignments')} subtitle={t('auspiciousAlignmentsHint')} icon="🌿" delay={550} />
        {data.auspiciousPeriods.map(function (p, i) {
          var periodName = p.name || p.activity || t('blessedTime');
          if (language === 'si' && p.sinhala) periodName = p.sinhala;
          return (
            <View key={i} style={s.auspRow}>
              <LinearGradient colors={['#34D399', '#059669']} style={s.auspBar} />
              <View style={{ flex: 1 }}>
                <Text style={s.auspName}>{periodName}</Text>
                {language !== 'si' && p.sinhala ? <Text style={s.auspSinhala}>{p.sinhala}</Text> : null}
              </View>
              <View style={s.auspTime}>
                <Text style={s.auspTimeText}>
                  {p.startFormatted ? p.startFormatted.display : toSLT(p.start, t)} – {p.endFormatted ? p.endFormatted.display : toSLT(p.end, t)}
                </Text>
              </View>
            </View>
          );
        })}
      </CosmicCard>
    );
  }

  /* ── No Birth Data Prompt ── */
  function renderNoBirthDataPrompt() {
    return (
      <CosmicCard variant="hero" glow delay={300}>
        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
          <Animated.Text style={[{ fontSize: 52, marginBottom: 12 }, noBirthGlowStyle]}>🌌</Animated.Text>
          <Text style={s.noBirthTitle}>
            {language === 'si' ? 'ඔබේ කේන්දරය සකසා ගන්න' : 'Unlock Your Cosmic Blueprint'}
          </Text>
          <Text style={s.noBirthBody}>
            {language === 'si'
              ? 'ඔබගේ උපන් විස්තර ඇතුලත් කර ඔබගේ ලග්න පලාපල, නක්ෂත්‍ර සහ දෛනික පලාපල බලාගන්න.'
              : 'Add your birth details in Profile to unlock your personalised Lagna chart, Nakshatra & daily readings.'}
          </Text>
          <TouchableOpacity onPress={function () { router.push('/profile'); }} style={s.noBirthCta}>
            <LinearGradient colors={['#9333EA', '#6366F1']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <Ionicons name="sparkles" size={14} color="#fff" />
            <Text style={s.noBirthCtaText}>{language === 'si' ? 'Profile → Birth Data' : 'Go to Profile → Birth Data'}</Text>
          </TouchableOpacity>
        </View>
      </CosmicCard>
    );
  }

  return (
    <DesktopScreenWrapper routeName="index">
      <CosmicBackground>
        <Animated.ScrollView
          style={s.flex}
          contentContainerStyle={[s.content, isDesktop && s.contentDesktop]}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchData}
              tintColor="#FFB800"
              colors={['#FFB800', '#9333EA']}
            />
          }
        >
          {loading && (
            <View style={s.center}>
              <CosmicLoader size={56} color="#FFB800" />
              <Text style={s.loadingText}>{t('channelingEnergies')}</Text>
            </View>
          )}

          {error && !loading && (
            <View style={s.center}>
              <Ionicons name="planet" size={44} color="#EF4444" style={{ marginBottom: 12 }} />
              <Text style={s.errorText}>{error}</Text>
              <TouchableOpacity style={s.retryBtn} onPress={fetchData}>
                <Ionicons name="refresh" size={16} color="#FFB800" />
                <Text style={s.retryText}>{t('realign')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {data && !loading && (
            <View>
              {/* Greeting */}
              {renderGreeting()}

              {/* Zodiac Wheel Hero */}
              <Animated.View style={heroParallax}>
                {renderZodiacHero()}
              </Animated.View>

              {/* Today's Sky is now in the hero dashboard */}

              {/* Quick Actions */}
              {renderQuickActions()}

              {/* Birth Chart Section */}
              {hasBirthData && chartData && renderBirthSummary()}
              {hasBirthData && chartData && renderChartCard()}
              {hasBirthData && chartData && renderLagnaPalapala()}
              {hasBirthData && chartData && renderPersonality()}
              {hasBirthData && chartLoading && (
                <CosmicCard variant="content" delay={300}>
                  <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                    <CosmicLoader
                      size={48}
                      color="#FFB800"
                      text={language === 'si' ? 'කේන්දරය සකසමින්...' : 'Calculating chart...'}
                      textColor="#FFB800"
                    />
                  </View>
                </CosmicCard>
              )}
              {!hasBirthData && renderNoBirthDataPrompt()}

              {/* Panchanga */}
              {renderPanchanga()}

              {/* Auspicious */}
              {renderAuspicious()}

              <View style={{ height: isDesktop ? 32 : 140 }} />
            </View>
          )}
        </Animated.ScrollView>
      </CosmicBackground>
    </DesktopScreenWrapper>
  );
}

var s = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 108 : 88 },
  contentDesktop: { paddingTop: 20, paddingHorizontal: 28, maxWidth: 680, alignSelf: 'center', width: '100%' },
  center: { alignItems: 'center', justifyContent: 'center', paddingTop: 120 },

  loadingText: { color: '#FFB800', fontSize: 14, fontStyle: 'italic', letterSpacing: 1, marginTop: 16 },
  errorText: { color: '#EF4444', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.30)',
    backgroundColor: 'rgba(255,184,0,0.08)',
  },
  retryText: { color: '#FFB800', fontWeight: '700', fontSize: 13, letterSpacing: 1 },

  // Greeting
  greetWrap: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sectionGap },
  greetText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.5 },
  greetName: {
    fontSize: 28, fontWeight: '900', color: '#FFF', letterSpacing: 0.3,
    textShadowColor: 'rgba(180,122,255,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10,
  },
  dateBadge: {
    backgroundColor: 'rgba(255,184,0,0.12)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.22)',
  },
  dateText: { color: '#FFD666', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  // Dashboard Hero
  dashHero: {
    borderRadius: 24, overflow: 'hidden', marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(180,122,255,0.15)',
    shadowColor: '#B47AFF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20, shadowRadius: 20, elevation: 10,
  },
  dashHeroBg: { ...StyleSheet.absoluteFillObject, borderRadius: 24 },
  dashNebulaBlob: {
    position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(180,122,255,0.08)',
  },
  dashEdgeTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  dashTopRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12,
  },
  dashSignArea: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  dashSignOuter: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  dashSignGlow: {
    position: 'absolute', width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,184,0,0.12)',
  },
  dashSignCircle: {
    width: 50, height: 50, borderRadius: 25, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,184,0,0.35)',
    backgroundColor: 'rgba(12,6,32,0.60)',
  },
  dashSignSymbol: {
    fontSize: 26, color: '#FFD666',
    textShadowColor: 'rgba(255,214,102,0.8)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12,
  },
  dashSignInfo: { flex: 1 },
  dashHeroLabel: { color: 'rgba(255,255,255,0.40)', fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  dashSignName: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.3 },
  dashNakRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  dashNakText: { color: '#FFD666', fontSize: 12, fontWeight: '600', opacity: 0.85 },
  dashDivider: { height: 1, marginHorizontal: 18, overflow: 'hidden' },
  dashGridTitle: { color: 'rgba(255,255,255,0.50)', fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', textAlign: 'center', marginTop: 12, marginBottom: -4 },
  dashGrid: {
    flexDirection: 'row', paddingHorizontal: 8, paddingTop: 14, paddingBottom: 16, gap: 2,
  },
  dashCell: {
    flex: 1, alignItems: 'center', gap: 5, paddingVertical: 8,
    borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.02)',
  },
  dashCellValue: { color: '#FFF', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  dashCellLabel: { color: 'rgba(255,255,255,0.40)', fontSize: 9, fontWeight: '700', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.8 },

  rahuStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginTop: 10, borderRadius: 16, overflow: 'hidden',
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: 'rgba(52,211,153,0.06)',
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.15)',
  },
  rahuStripActive: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.30)',
    shadowColor: '#EF4444', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.30, shadowRadius: 12, elevation: 6,
  },
  rahuIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(52,211,153,0.10)',
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.20)',
  },
  rahuIconWrapActive: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.30)',
  },
  rahuContent: { flex: 1 },
  rahuTitle: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  rahuTitleActive: { color: '#FCA5A5', fontWeight: '800', fontSize: 13 },
  rahuTime: { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '600', marginTop: 2 },
  rahuTimeActive: { color: '#FF8A8A', fontWeight: '700', fontSize: 14 },
  rahuDotPulse: { width: 10, height: 10, borderRadius: 5 },

  // Sky Grid
  skyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statMini: { width: '47%', alignItems: 'center', paddingVertical: 10 },
  statMiniIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  statMiniValue: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  statMiniLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600', marginTop: 2 },

  // Quick Actions
  quickRow: { flexDirection: 'row', gap: 10, paddingVertical: 4, marginBottom: Spacing.sectionGap },
  quickPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  quickPillBg: { ...StyleSheet.absoluteFillObject, borderRadius: 999 },
  quickPillLabel: { color: '#FFF', fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },

  // Identity
  identityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  identityItem: {
    width: '47%', borderRadius: 16, padding: 12, alignItems: 'center',
    overflow: 'hidden', borderWidth: 1,
  },
  identityLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 },
  identityValue: { fontSize: 16, fontWeight: '800', marginTop: 4, textAlign: 'center' },
  lordRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(180,122,255,0.06)', borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: 'rgba(180,122,255,0.15)',
  },
  lordText: { color: '#B47AFF', fontSize: 13, fontWeight: '600' },

  // Palapala
  palapalaText: { color: 'rgba(255,255,255,0.70)', fontSize: 14, lineHeight: 23, marginBottom: 14 },
  traitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  traitChip: {
    backgroundColor: 'rgba(124,58,237,0.10)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(124,58,237,0.20)',
  },
  traitText: { color: '#B47AFF', fontSize: 12, fontWeight: '600' },
  luckyRow: { flexDirection: 'row', gap: 10 },
  luckyItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(255,184,0,0.06)', borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.12)',
  },
  luckyLabel: { color: '#FFD666', fontSize: 12, fontWeight: '600', flex: 1 },

  // Personality
  personalityWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  personalityPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1,
  },
  personalityText: { fontSize: 12, fontWeight: '700' },

  // Panchanga
  pRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10,
  },
  pDot: { width: 6, height: 6, borderRadius: 3 },
  pLabel: { fontSize: 13, fontWeight: '600', width: 80 },
  pValue: { fontSize: 14, color: '#FFF', fontWeight: '700' },
  pSinhala: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },

  // Auspicious
  auspRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 12 },
  auspBar: { width: 3, height: 24, borderRadius: 2 },
  auspName: { fontSize: 14, color: '#FFF', fontWeight: '700' },
  auspSinhala: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  auspTime: { flexDirection: 'row' },
  auspTimeText: { fontSize: 13, color: '#34D399', fontWeight: '700', letterSpacing: 0.3 },

  // No Birth Data
  noBirthTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  noBirthBody: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 18, paddingHorizontal: 8 },
  noBirthCta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999, overflow: 'hidden',
  },
  noBirthCtaText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
});
