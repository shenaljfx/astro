import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, RefreshControl, TouchableOpacity,
  StyleSheet, Platform, Dimensions, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line, G, Text as SvgText, Defs, RadialGradient, Stop, Ellipse, Path, Image as SvgImage } from 'react-native-svg';
import Animated, {
  FadeIn, FadeInDown, FadeInUp,
  useSharedValue, useAnimatedStyle, useAnimatedScrollHandler,
  withRepeat, withSequence, withTiming, withSpring,
  interpolate, Easing,
} from 'react-native-reanimated';
import DesktopScreenWrapper, { useDesktopCtx } from '../../components/DesktopScreenWrapper';
import SpringPressable from '../../components/effects/SpringPressable';
import CosmicLoader from '../../components/effects/CosmicLoader';
import PinchableView from '../../components/effects/PinchableView';
import CosmicCard from '../../components/ui/CosmicCard';
import SectionHeader from '../../components/ui/SectionHeader';
import AwesomeRashiChakra from '../../components/AwesomeRashiChakra';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Colors, Typography, Gradients, Spacing } from '../../constants/theme';
import SriLankanChart from '../../components/SriLankanChart';
import RealisticMoon from '../../components/RealisticMoon';
import PremiumBackground from '../../components/PremiumBackground';
import { boxShadow, textShadow } from '../../utils/shadow';
import { ZODIAC_IMAGES } from '../../components/ZodiacIcons';

var { width: SCREEN_WIDTH } = Dimensions.get('window');
var CHAKRA_HERO_SIZE = Math.min(SCREEN_WIDTH * 0.88, 380);

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
var ZODIAC_NAMES_SI = ['මේෂ','වෘෂභ','මිථුන','කටක','සිංහ','කන්‍යා','තුලා','වෘශ්චික','ධනු','මකර','කුම්භ','මීන'];
var PLANET_NAMES_SI = { Sun: 'සූර්යා', Moon: 'චන්ද්‍රා', Mars: 'කුජ', Mercury: 'බුධ', Jupiter: 'ගුරු', Venus: 'සිකුරු', Saturn: 'ශනි', Rahu: 'රාහු', Ketu: 'කේතු' };
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

  var nodeR = Math.max(u * 10, 6);
  var activeNodeR = Math.max(u * 16, 10);
  var activeGlowR = Math.max(u * 22, 14);
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
          <Stop offset="70%" stopColor="#FF8C00" stopOpacity={0.05} />
          <Stop offset="100%" stopColor="#FF8C00" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="oNebulaViolet" cx="30%" cy="25%" r="55%">
          <Stop offset="0%" stopColor="#FF8C00" stopOpacity={0.10} />
          <Stop offset="60%" stopColor="#B8860B" stopOpacity={0.04} />
          <Stop offset="100%" stopColor="#04030C" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="oNebulaTeal" cx="75%" cy="70%" r="50%">
          <Stop offset="0%" stopColor="#FFB800" stopOpacity={0.08} />
          <Stop offset="60%" stopColor="#8B6914" stopOpacity={0.03} />
          <Stop offset="100%" stopColor="#04030C" stopOpacity={0} />
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
      <Circle cx={cx} cy={cy} r={orbit2} stroke="rgba(255,140,0,0.07)" strokeWidth={0.5} fill="none" />
      <Circle cx={cx} cy={cy} r={orbit2} stroke="rgba(255,140,0,0.03)" strokeWidth={3 * u} fill="none" />
      <Circle cx={cx} cy={cy} r={zodiacR} stroke="rgba(255,140,0,0.10)" strokeWidth={0.7} fill="none" strokeDasharray="2,8" />
      <Circle cx={cx} cy={cy} r={zodiacR} stroke="rgba(255,140,0,0.03)" strokeWidth={4 * u} fill="none" />

      {/* Dodecagon edges */}
      {ZODIAC_SIGNS.map(function (_, i) {
        var a1 = (i * 30 - 90) * Math.PI / 180;
        var a2 = ((i + 1) * 30 - 90) * Math.PI / 180;
        var isAdj = i === activeIndex || (i + 1) % 12 === activeIndex;
        return (
          <Line key={'edge' + i}
            x1={cx + zodiacR * Math.cos(a1)} y1={cy + zodiacR * Math.sin(a1)}
            x2={cx + zodiacR * Math.cos(a2)} y2={cy + zodiacR * Math.sin(a2)}
            stroke={isAdj ? 'rgba(255,214,102,0.18)' : 'rgba(255,140,0,0.06)'}
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
            stroke={isAct ? 'rgba(255,214,102,0.15)' : 'rgba(255,140,0,0.025)'}
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
        var imgSize = isActive ? activeNodeR * 2.2 : nodeR * 2.4;

        if (isActive) {
          return (
            <G key={'z' + i}>
              <Circle cx={x} cy={y} r={activeGlowR} fill="url(#oActiveNode)" />
              <Circle cx={x} cy={y} r={activeNodeR} fill="rgba(255,184,0,0.10)" stroke="rgba(255,214,102,0.50)" strokeWidth={1.2} />
              <SvgImage
                x={x - imgSize / 2} y={y - imgSize / 2}
                width={imgSize} height={imgSize}
                href={ZODIAC_IMAGES[i].uri}
                opacity={1}
              />
            </G>
          );
        }

        return (
          <G key={'z' + i}>
            <Circle cx={x} cy={y} r={nodeR + 2 * u} fill={col} opacity={0.06} />
            <Circle cx={x} cy={y} r={nodeR} fill="rgba(10,7,4,0.75)" stroke={col + '40'} strokeWidth={0.7} />
            <SvgImage
              x={x - imgSize / 2} y={y - imgSize / 2}
              width={imgSize} height={imgSize}
              href={ZODIAC_IMAGES[i].uri}
              opacity={0.88}
            />
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
  var [weeklyLagna, setWeeklyLagna] = useState(null);
  var [weeklyLagnaExpanded, setWeeklyLagnaExpanded] = useState(null);
  var [jyotishToday, setJyotishToday] = useState(null);
  var [expandedPanchanga, setExpandedPanchanga] = useState(null);
  var [loading, setLoading] = useState(true);
  var [chartLoading, setChartLoading] = useState(false);
  var [error, setError] = useState(null);

  var scrollRef = useRef(null);
  var weeklyLagnaY = useRef(0);

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

  // ── Moon timeline hooks (must be at top level) ──
  var moonScrollRef = useRef(null);
  var [selectedDayOffset, setSelectedDayOffset] = useState(0);
  var MOON_ITEM_W = 58;
  var MOON_DAYS_RANGE = 7;
  useEffect(function () {
    setTimeout(function () {
      if (moonScrollRef.current) {
        var scrollTo = MOON_DAYS_RANGE * MOON_ITEM_W - (SCREEN_WIDTH / 2) + MOON_ITEM_W / 2;
        moonScrollRef.current.scrollTo({ x: Math.max(0, scrollTo), animated: false });
      }
    }, 100);
  }, []);

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

  // Fetch weekly lagna palapala
  useEffect(function () {
    api.getWeeklyLagna()
      .then(function (res) {
        if (res && res.success && res.reports && res.reports.length > 0) {
          setWeeklyLagna(res);
        }
      })
      .catch(function () { /* silent */ });
  }, []);

  // Fetch personalized jyotish data (Disha Shoola, Chandrashtama, Tara Balam, Special Yogas)
  useEffect(function () {
    if (!hasBirthData || !birthDateTime) return;
    api.getJyotishPersonalized({
      birthDate: birthDateTime,
      lat: birthLat,
      lng: birthLng,
    })
      .then(function (res) {
        if (res && res.success && res.data) {
          setJyotishToday(res.data);
        }
      })
      .catch(function () { /* silent */ });
  }, [hasBirthData, birthDateTime, birthLat, birthLng]);

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
    var chakraSize = CHAKRA_HERO_SIZE;

    return (
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <View style={s.dashHero}>
          {/* ── Glass background layers ── */}
          <LinearGradient
            colors={['rgba(14,10,4,0.92)', 'rgba(10,7,3,0.88)', 'rgba(14,10,4,0.92)']}
            style={s.dashHeroBg}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
          <LinearGradient
            colors={['rgba(255,184,0,0.10)', 'transparent', 'rgba(255,140,0,0.06)']}
            style={s.dashHeroBg}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
          {/* Glass shine line at top */}
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.06)', 'transparent']}
            style={s.dashGlassShine}
            start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          />
          <Animated.View style={[s.dashNebulaBlob, coronaPulseStyle]} />
          <LinearGradient
            colors={['rgba(255,140,0,0.14)', 'transparent']}
            style={s.dashEdgeTop}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
          />

          {/* ═══ RASHI CHAKRA — Center piece ═══ */}
          <View style={s.chakraHeroWrap}>
            <View style={s.chakraContainer}>
              <AwesomeRashiChakra size={chakraSize} activeSignIndex={activeNakIndex} />
            </View>
            {/* Sign name below chakra */}
            <View style={s.chakraOverlayInfo}>
              <View style={s.chakraSignTextRow}>
                <View style={s.chakraSignTextWrap}>
                  <Text style={s.dashHeroLabel}>{language === 'si' ? 'අද රාශිය' : "TODAY'S SIGN"}</Text>
                  <Text style={s.dashSignNameLarge}>{language === 'si' ? (ZODIAC_NAMES_SI[activeNakIndex] || ZODIAC_NAMES_EN[activeNakIndex]) : ZODIAC_NAMES_EN[activeNakIndex]}</Text>
                </View>
                <View style={s.chakraSignSubBadge}>
                  <Text style={s.dashSignNameSub}>{language === 'si' ? ZODIAC_NAMES_EN[activeNakIndex] : (ZODIAC_NAMES_SI[activeNakIndex] || '')}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ═══ NAKSHATRA PILL ═══ */}
          {todayNakshatra ? (
            <View style={s.nakPill}>
              <LinearGradient colors={['rgba(255,214,102,0.10)', 'rgba(255,140,0,0.06)']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <Ionicons name="star" size={12} color="#FFD666" />
              <Text style={s.nakPillLabel}>{language === 'si' ? 'නක්ෂත්‍රය' : 'Lunar Mansion'}</Text>
              <View style={s.nakPillDot} />
              <Text style={s.nakPillValue}>{todayNakshatra}</Text>
            </View>
          ) : null}

          {/* ═══ DIVIDER ═══ */}
          <View style={s.dashDivider}>
            <LinearGradient colors={['transparent', 'rgba(255,184,0,0.22)', 'rgba(255,140,0,0.18)', 'transparent']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} />
          </View>

          {/* ═══ PANCHANGA GRID ═══ */}
          <Text style={s.dashGridTitle}>{language === 'si' ? 'අද දිනයේ පංචාංගය' : "Today's Panchanga"}</Text>
          <View style={s.dashGrid}>
            <View style={s.dashCell}>
              <View style={[s.dashCellIcon, { backgroundColor: 'rgba(255,184,0,0.10)' }]}>
                <Ionicons name="sunny-outline" size={16} color="#FFB800" />
              </View>
              <Text style={s.dashCellValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{sunriseVal}</Text>
              <Text style={s.dashCellLabel}>{language === 'si' ? 'උදාව' : t('sunrise')}</Text>
            </View>
            <View style={s.dashCell}>
              <View style={[s.dashCellIcon, { backgroundColor: 'rgba(255,140,0,0.10)' }]}>
                <Ionicons name="moon-outline" size={16} color="#FF8C00" />
              </View>
              <Text style={s.dashCellValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{sunsetVal}</Text>
              <Text style={s.dashCellLabel}>{language === 'si' ? 'බැසීම' : t('sunset')}</Text>
            </View>
            <View style={s.dashCell}>
              <View style={[s.dashCellIcon, { backgroundColor: 'rgba(52,211,153,0.10)' }]}>
                <Ionicons name="sparkles-outline" size={16} color="#34D399" />
              </View>
              <Text style={s.dashCellValue} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.65}>{tithiVal}</Text>
              <Text style={s.dashCellLabel}>{language === 'si' ? 'තිථි' : 'Lunar Day'}</Text>
            </View>
            <View style={s.dashCell}>
              <View style={[s.dashCellIcon, { backgroundColor: 'rgba(103,232,249,0.10)' }]}>
                <Ionicons name="infinite-outline" size={16} color="#67E8F9" />
              </View>
              <Text style={s.dashCellValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{yogaVal}</Text>
              <Text style={s.dashCellLabel}>{language === 'si' ? 'යෝගය' : 'Yoga'}</Text>
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
                    ? (language === 'si' ? '⚠ රාහු කාලය සක්‍රීයයි' : '⚠ Inauspicious Period Active')
                    : (language === 'si' ? 'රාහු කාල' : 'Inauspicious Window')
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
  function scrollToWeeklyLagna() {
    try {
      if (scrollRef.current && weeklyLagnaY.current > 0) {
        scrollRef.current.scrollTo({ x: 0, y: weeklyLagnaY.current - 20, animated: true });
      } else if (scrollRef.current) {
        // Fallback: scroll to bottom area where weekly lagna usually is
        scrollRef.current.scrollToEnd({ animated: true });
      }
    } catch (e) {
      console.warn('scrollToWeeklyLagna error:', e);
    }
  }

  function renderQuickActions() {
    var actions = language === 'si'
      ? [
          { icon: '🔮', label: 'ජ්‍යොතිෂ', gradient: ['rgba(255,140,0,0.5)', 'rgba(230,81,0,0.3)'], route: '/chat' },
          { icon: '📅', label: 'කේන්දරය', gradient: ['rgba(6,182,212,0.4)', 'rgba(59,130,246,0.3)'], route: '/kendara' },
          { icon: '💑', label: 'ගැලපීම', gradient: ['rgba(244,63,94,0.4)', 'rgba(139,92,246,0.3)'], route: '/porondam' },
          { icon: '📊', label: 'වාර්තාව', gradient: ['rgba(52,211,153,0.4)', 'rgba(16,185,129,0.3)'], route: '/report' },
        ]
      : [
          { icon: '🔮', label: 'Ask Jyotishi', gradient: ['rgba(255,140,0,0.5)', 'rgba(230,81,0,0.3)'], route: '/chat' },
          { icon: '📅', label: 'Birth Chart', gradient: ['rgba(6,182,212,0.4)', 'rgba(59,130,246,0.3)'], route: '/kendara' },
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

  /* ── Moon Phase Showcase — 15-day Lunar Timeline ── */
  function renderMoonPhaseCard() {
    var tithiNum = data && data.panchanga && data.panchanga.tithi && data.panchanga.tithi.number
      ? data.panchanga.tithi.number : getMoonPhaseFromDate();
    var illum = tithiNum <= 15 ? (tithiNum - 1) / 14 : (30 - tithiNum) / 14;
    illum = Math.max(0, Math.min(1, illum));
    var illumPct = Math.round(illum * 100);

    var phaseNamesEn = ['New Moon','Waxing Crescent','First Quarter','Waxing Gibbous','Full Moon','Waning Gibbous','Last Quarter','Waning Crescent'];
    var phaseNamesSi = ['අමාවක','පිරවෙන හඳපෑ','පළමු කාර්තුව','පිරවෙන ගිබස්','පුර පෝය','හැකිලෙන ගිබස්','අන්තිම කාර්තුව','හැකිලෙන හඳපෑ'];
    var phaseIdx = tithiNum <= 1 ? 0 : tithiNum <= 4 ? 1 : tithiNum <= 8 ? 2 : tithiNum <= 14 ? 3 : tithiNum === 15 ? 4 : tithiNum <= 19 ? 5 : tithiNum <= 23 ? 6 : 7;
    var phaseName = language === 'si' ? phaseNamesSi[phaseIdx] : phaseNamesEn[phaseIdx];

    var moonDisplaySize = Math.min(SCREEN_WIDTH * 0.42, 180);

    // 15-day timeline: 7 before + today + 7 after
    var today = new Date();
    var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var dayNamesSi = ['ඉරි','සඳු','අඟ','බදා','බ්‍ර','සිකු','සෙන'];
    var dates = [];
    for (var di = -MOON_DAYS_RANGE; di <= MOON_DAYS_RANGE; di++) {
      var dd = new Date(today); dd.setDate(dd.getDate() + di);
      var neighborTithi = ((tithiNum + di - 1 + 300) % 30) + 1;
      var dayOfWeek = dd.getDay();
      dates.push({
        dayNum: dd.getDate(),
        dayName: language === 'si' ? dayNamesSi[dayOfWeek] : dayNames[dayOfWeek],
        monthShort: dd.toLocaleString('en', { month: 'short' }),
        isToday: di === 0,
        isFuture: di > 0,
        isPast: di < 0,
        tithi: neighborTithi,
        offset: di,
      });
    }

    var selectedTithi = ((tithiNum + selectedDayOffset - 1 + 300) % 30) + 1;
    var selIllum = selectedTithi <= 15 ? (selectedTithi - 1) / 14 : (30 - selectedTithi) / 14;
    selIllum = Math.max(0, Math.min(1, selIllum));
    var selIllumPct = Math.round(selIllum * 100);
    var selPhaseIdx = selectedTithi <= 1 ? 0 : selectedTithi <= 4 ? 1 : selectedTithi <= 8 ? 2 : selectedTithi <= 14 ? 3 : selectedTithi === 15 ? 4 : selectedTithi <= 19 ? 5 : selectedTithi <= 23 ? 6 : 7;
    var selPhaseName = language === 'si' ? phaseNamesSi[selPhaseIdx] : phaseNamesEn[selPhaseIdx];

    // Label for selected date
    var selDate = new Date(today); selDate.setDate(selDate.getDate() + selectedDayOffset);
    var selDateLabel = selectedDayOffset === 0
      ? (language === 'si' ? 'අද' : 'Today')
      : selDate.toLocaleDateString('en', { month: 'short', day: 'numeric' });

    return (
      <Animated.View entering={FadeInDown.delay(260).springify()}>
        <View style={mp.card}>
          {/* Glass card background */}
          <LinearGradient
            colors={['rgba(20,12,40,0.85)', 'rgba(10,6,24,0.92)']}
            style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
          {/* Subtle border glow */}
          <View style={mp.cardBorder} />

          {/* Section title */}
          <View style={mp.headerRow}>
            <Text style={mp.sectionTitle}>{language === 'si' ? '🌙 චන්ද්‍ර චක්‍රය' : '🌙 Lunar Cycle'}</Text>
            <View style={mp.timelineBadge}>
              <Text style={mp.timelineBadgeText}>{language === 'si' ? '15 දින' : '15 Days'}</Text>
            </View>
          </View>

          {/* ── Scrollable 15-day Timeline ── */}
          <ScrollView
            ref={moonScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={mp.timelineScroll}
            decelerationRate="fast"
            snapToInterval={MOON_ITEM_W}
          >
            {dates.map(function (dt, i) {
              var isSelected = dt.offset === selectedDayOffset;
              var isKeyPhase = dt.tithi === 1 || dt.tithi === 15; // new/full moon
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.6}
                  onPress={function () { setSelectedDayOffset(dt.offset); }}
                  style={[mp.tlItem, isSelected && mp.tlItemSelected]}
                >
                  {/* Day name */}
                  <Text style={[mp.tlDayName, isSelected && mp.tlDayNameActive, dt.isToday && mp.tlDayNameToday]}>{dt.dayName}</Text>

                  {/* Moon orb */}
                  <View style={[mp.tlMoonWrap, isSelected && mp.tlMoonWrapActive]}>
                    {isSelected && <View style={mp.tlMoonGlow} />}
                    <RealisticMoon size={isSelected ? 36 : 28} tithiNum={dt.tithi} animate={false} />
                  </View>

                  {/* Date number */}
                  <Text style={[mp.tlDateNum, isSelected && mp.tlDateNumActive]}>{dt.dayNum}</Text>

                  {/* Today dot / Key phase dot */}
                  {dt.isToday && <View style={mp.tlTodayDot} />}
                  {isKeyPhase && !dt.isToday && <View style={mp.tlKeyPhaseDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Divider line */}
          <View style={mp.divider} />

          {/* ── Central Moon Display ── */}
          <View style={mp.centralSection}>
            {/* Date label above moon */}
            <Animated.View entering={FadeIn.delay(200).duration(500)}>
              <Text style={mp.selectedDateLabel}>{selDateLabel}</Text>
            </Animated.View>

            <View style={[mp.moonWrap, { position: 'relative' }]}>
              {/* Glowing moon aura */}
              <View style={[mp.moonAura, {
                backgroundColor: selIllumPct > 60 ? 'rgba(255,255,255,0.12)' : 'rgba(147,51,234,0.12)',
                shadowColor: selIllumPct > 60 ? '#fff' : '#9333EA',
              }]} />
              <RealisticMoon size={moonDisplaySize} tithiNum={selectedTithi} animate={true} showStars={true} />
            </View>

            {/* Phase name */}
            <Text style={mp.phaseName}>{selPhaseName}</Text>

            {/* Illumination bar */}
            <View style={mp.illumBarWrap}>
              <View style={mp.illumBarTrack}>
                <View style={[mp.illumBarFill, { width: selIllumPct + '%' }]}>
                  <LinearGradient
                    colors={['#7C3AED', '#A78BFA', '#C4B5FD']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                  />
                </View>
              </View>
              <Text style={mp.illumBarLabel}>{selIllumPct + '%'}</Text>
            </View>

            {/* Description */}
            <Text style={mp.phaseDesc}>
              {language === 'si'
                ? (selPhaseIdx <= 3 ? 'මෙම චන්ද්‍ර අවධිය නව බලාපොරොත්තු සහ වර්ධනය සංකේතවත් කරයි. අලුත් වැඩක් ආරම්භ කිරීමට සහ අනාගතය සැලසුම් කිරීමට මෙය ඉතා සුබ කාලයකි.' : selPhaseIdx === 4 ? 'චන්ද්‍රයාගේ උපරිම ශක්තිය විහිදෙන කාලයයි. ඔබගේ අරමුණු ජයගැනීමට මෙම ප්‍රබල ශක්තිය යොදාගන්න.' : 'මෙය සිත නිදහස් කරගැනීමට සහ විවේක ගැනීමට කාලයයි. ඔබට අනවශ්‍ය දේ අත්හැර අලුත් ආරම්භයකට සූදානම් වන්න.')
                : 'This ' + selPhaseName + ' moon phase signifies ' + (selPhaseIdx <= 3 ? 'new beginnings and cosmic growth. An ideal time to plant seeds for your future and set golden intentions.' : selPhaseIdx === 4 ? 'peak universal energy and radiant manifestation. Harness this powerful lunar glow to achieve your dreams.' : 'a time for deep reflection and cosmic healing. Release what no longer serves your soul and prepare for renewal.')}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  /* ── Daily Cosmic Ratings ── */
  function renderDailyRatings() {
    var seed = new Date().getDate() * 7 + new Date().getMonth() * 13;
    var tNum = data && data.panchanga && data.panchanga.tithi && data.panchanga.tithi.number ? data.panchanga.tithi.number : 8;
    var nNum = data && data.panchanga && data.panchanga.nakshatra && data.panchanga.nakshatra.number ? data.panchanga.nakshatra.number : 5;
    function genScore(off) { return Math.min(98, Math.max(30, ((seed + off * 17 + tNum * 3 + nNum * 5) % 65) + 30)); }

    var ratings = [
      { label: language === 'si' ? 'සෞඛ්‍ය' : 'Health',  emoji: '💪', score: genScore(1), color: '#EF4444' },
      { label: language === 'si' ? 'ගමන්' : 'Travel',    emoji: '✈️', score: genScore(2), color: '#60A5FA' },
      { label: language === 'si' ? 'මුදල්' : 'Money',    emoji: '💰', score: genScore(3), color: '#FBBF24' },
      { label: language === 'si' ? 'රැකියාව' : 'Work',   emoji: '💼', score: genScore(4), color: '#FBBF24' },
      { label: language === 'si' ? 'පවුල' : 'Family',    emoji: '👪', score: genScore(5), color: '#A78BFA' },
      { label: language === 'si' ? 'සෞන්දර්' : 'Beauty', emoji: '🎵', score: genScore(6), color: '#60A5FA' },
    ];

    return (
      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <View style={dr.card}>
          <LinearGradient colors={['rgba(14,10,4,0.92)', 'rgba(10,7,3,0.88)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <Text style={dr.title}>{language === 'si' ? 'දෛනික කේන්දර ශ්‍රේණිගත කිරීම්' : 'Daily horoscope ratings'}</Text>
          <View style={dr.grid}>
            {ratings.map(function (r, i) {
              return (
                <View key={i} style={dr.item}>
                  <View style={dr.labelRow}>
                    <Text style={dr.label}>{r.label} {r.emoji}</Text>
                  </View>
                  <View style={dr.barRow}>
                    <View style={[dr.scoreBadge, { backgroundColor: r.color + '22', borderColor: r.color + '44' }]}>
                      <Text style={[dr.scoreNum, { color: r.color }]}>{r.score}</Text>
                    </View>
                    <View style={dr.barTrack}>
                      <Animated.View entering={FadeInDown.delay(380 + i * 50).springify()} style={[dr.barFill, { width: r.score + '%', backgroundColor: r.color }]} />
                      <View style={[dr.barDot, { left: r.score + '%', backgroundColor: r.color }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </Animated.View>
    );
  }

  /* ── Lucky Numbers ── */
  function renderLuckyNumbers() {
    var seed2 = new Date().getDate() * 11 + new Date().getMonth() * 7 + new Date().getFullYear();
    var tNum2 = data && data.panchanga && data.panchanga.tithi && data.panchanga.tithi.number ? data.panchanga.tithi.number : 5;
    var nums = [];
    for (var ni = 0; ni < 4; ni++) { nums.push(((seed2 + ni * 13 + tNum2 * 3) % 36) + 1); }
    nums = nums.filter(function (n, i) { return nums.indexOf(n) === i; });
    while (nums.length < 4) nums.push(((seed2 + nums.length * 23) % 36) + 1);
    var numColors = ['#FFB800', '#A78BFA', '#34D399', '#60A5FA'];

    return (
      <Animated.View entering={FadeInDown.delay(320).springify()}>
        <View style={ln.card}>
          <LinearGradient colors={['rgba(14,10,4,0.90)', 'rgba(10,7,3,0.86)']} style={StyleSheet.absoluteFill} />
          <SectionHeader title={language === 'si' ? 'අද වාසනාවන්ත අංක' : "Today's lucky numbers"} icon="🎯" delay={320} />
          <View style={ln.row}>
            {nums.map(function (n, i) {
              return (
                <Animated.View key={i} entering={FadeInUp.delay(400 + i * 80).springify()} style={[ln.circle, { borderColor: numColors[i] + '55' }]}>
                  <LinearGradient colors={[numColors[i] + '12', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
                  <Text style={[ln.num, { color: numColors[i] }]}>{n}</Text>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </Animated.View>
    );
  }

  /* ── Daily Mantra ── */
  function renderDailyMantra() {
    var mantrasEn = [
      'My potential is limitless, and my path is written in the stars.',
      'The universe is aligning in my favor today; I am ready to receive its gifts.',
      'I attract unstoppable abundance, unbreakable peace, and endless joy.',
      'My intuition is a powerful compass guiding me toward my highest purpose.',
      'I boldly release fear and doubt, making space for cosmic miracles.',
      'I am perfectly in sync with the divine rhythm of the universe.',
      'Today, I choose unwavering peace over chaos and trust my journey completely.',
      'I surrender to the perfect timing of my destiny, knowing great things are coming.',
      'I am a magnet for extraordinary blessings and life-changing opportunities.',
      'My energy is a radiant light that inspires everyone I meet.',
      'I embrace every cosmic shift with grace, courage, and an open heart.',
      'Every challenge I face is simply the universe preparing me for greatness.',
      'I radiate unshakeable confidence, deep self-respect, and unbreakable inner harmony.',
      'The stars illuminate my path, and I step forward with absolute certainty.',
      'I am deeply connected to the infinite wisdom and boundless power of all creation.',
    ];
    var mantrasSi = [
      'මගේ හැකියාවන්ට සීමාවක් නැත. මගේ සාර්ථකත්වය ග්‍රහ තාරකාවල ලියවී ඇත.',
      'අද මුළු විශ්වයම මා වෙනුවෙන් පෙළගැසී ඇත; මම ඉමහත් ආශිර්වාදයන් ලබාගැනීමට සූදානම්.',
      'මම නිමක් නැති සමෘද්ධිය, කඩ කළ නොහැකි සාමය සහ අපරිමිත සතුට මා වෙත ආකර්ෂණය කරමි.',
      'මගේ බුද්ධිය මාව මගේ ඉහළම අරමුණ වෙත ගෙනයන ප්‍රබල මාලිමාවකි.',
      'බිය සහ සැකය අත්හැර, විශ්වයේ ආශ්චර්යයන් මා වෙත පැමිණීමට මම ඉඩ හරිමි.',
      'මම විශ්වයේ දිව්‍යමය රිද්මය සමඟ මනාව බැඳී සිටිමි.',
      'අද දින, මම අනවශ්‍ය කරදර පසෙකලා නොසැලෙන සාමය සහ මාගේ ගමන පිළිබඳව පුර්ණ විශ්වාසය තබමි.',
      'ශ්‍රේෂ්ඨ දේවල් මා වෙත පැමිණෙන බව දැන, මම මගේ දෛවයේ නිවැරදි කාලයට ඉඩදෙමි.',
      'මම අසාමාන්‍ය ආශිර්වාද සහ ජීවිතය වෙනස් කරන අවස්ථාවන් සඳහා ප්‍රබල චුම්බකයකි.',
      'මගේ ජීව ශක්තිය, මට හමුවන සැමට ආශ්වාදයක් ගෙන දෙන දීප්තිමත් ආලෝකයකි.',
      'සෑම වෙනසක්ම මම කරුණාවෙන්, ධෛර්යයෙන් සහ විවෘත හදවතකින් පිළිගනිමි.',
      'මා මුහුණ දෙන සෑම අභියෝගයක්ම, විශ්වය මාව ශ්‍රේෂ්ඨත්වය සඳහා සූදානම් කිරීමකි.',
      'මම නොසැලෙන විශ්වාසය, ගැඹුරු ආත්ම ගෞරවය සහ අභ්‍යන්තර සාමය විහිදුවමි.',
      'තාරකා මගේ මාර්ගය ආලෝකමත් කරයි, මම ඉතා නිවැරදි ඉලක්කයක් කරා පියවර තබමි.',
      'මම මුළු විශ්වයේම අනන්ත ප්‍රඥාවට සහ අසීමිත බලයට මනාව සම්බන්ධ වී සිටිමි.',
    ];
    var dayIdx = Math.floor(Date.now() / (24 * 60 * 60 * 1000)) % mantrasEn.length;

    return (
      <Animated.View entering={FadeInDown.delay(340).springify()}>
        <View style={mn.card}>
          <LinearGradient colors={['rgba(255,184,0,0.08)', 'rgba(255,140,0,0.03)', 'rgba(255,184,0,0.06)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <LinearGradient colors={['rgba(255,255,255,0.04)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', borderTopLeftRadius: 18, borderTopRightRadius: 18 }} />
          <View style={mn.starRow}>
            <Text style={{ fontSize: 16 }}>⭐</Text>
            <Text style={mn.headerLabel}>{language === 'si' ? 'දිනයේ මන්ත්‍රය' : 'MANTRA OF THE DAY'}</Text>
          </View>
          <Text style={mn.mantraText}>{language === 'si' ? mantrasSi[dayIdx] : mantrasEn[dayIdx]}</Text>
        </View>
      </Animated.View>
    );
  }

  /* ── Weekly Palapala Banner ── */
  function renderWeeklyBanner() {
    if (!weeklyLagna || !weeklyLagna.reports || weeklyLagna.reports.length === 0) return null;

    var weekStart = weeklyLagna.weekStart ? new Date(weeklyLagna.weekStart).toLocaleDateString(language === 'si' ? 'si-LK' : 'en-US', { month: 'short', day: 'numeric' }) : '';
    var weekEnd = weeklyLagna.weekEnd ? new Date(weeklyLagna.weekEnd).toLocaleDateString(language === 'si' ? 'si-LK' : 'en-US', { month: 'short', day: 'numeric' }) : '';
    var weekLabel = weekStart && weekEnd ? weekStart + ' – ' + weekEnd : '';

    // Find user's lagna report for a personalized teaser
    var userLagnaId = chartData && chartData.lagna ? (chartData.lagna.rashiId || chartData.lagna.id || null) : null;
    var userReport = userLagnaId ? weeklyLagna.reports.find(function (r) { return r.lagnaId === userLagnaId; }) : null;

    var OUTLOOK_EMOJI = { favorable: '🟢', mixed: '🟡', challenging: '🔴' };

    return (
      <Animated.View entering={FadeInDown.delay(280).springify()}>
        <TouchableOpacity activeOpacity={0.7} onPress={scrollToWeeklyLagna}>
          <View style={s.wbCard}>
            <LinearGradient
              colors={['rgba(147,51,234,0.25)', 'rgba(124,58,237,0.12)', 'rgba(168,85,247,0.06)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
            {/* Subtle top shimmer */}
            <LinearGradient
              colors={['rgba(255,214,102,0.12)', 'transparent']}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
            />
            {/* Decorative star dots */}
            {[[8, 15], [85, 20], [92, 70], [15, 75]].map(function (pos, i) {
              return <View key={i} style={{ position: 'absolute', left: pos[0] + '%', top: pos[1] + '%', width: 2, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,214,102,' + (0.2 + i * 0.08) + ')' }} />;
            })}

            <View style={s.wbContent}>
              {/* Left: Icon + Text */}
              <View style={s.wbLeft}>
                <View style={s.wbIconWrap}>
                  <LinearGradient colors={['rgba(168,85,247,0.35)', 'rgba(124,58,237,0.20)']} style={StyleSheet.absoluteFill} />
                  <Text style={{ fontSize: 22 }}>🔮</Text>
                </View>
                <View style={s.wbTextCol}>
                  <Text style={s.wbTitle}>{language === 'si' ? 'සතිපතා ලග්න පලාපල' : 'Weekly Forecast'}</Text>
                  {weekLabel ? <Text style={s.wbWeek}>{weekLabel}</Text> : null}
                  {userReport ? (
                    <View style={s.wbTeaser}>
                      <Text style={s.wbTeaserText}>
                        {OUTLOOK_EMOJI[userReport.outlook] || '🟡'}{' '}
                        {language === 'si'
                          ? 'ඔබේ ' + userReport.nameSi + ' ලග්නය — ' + (userReport.outlook === 'favorable' ? 'හිතකර' : userReport.outlook === 'challenging' ? 'අභියෝගාත්මක' : 'මිශ්‍ර')
                          : 'Your ' + userReport.nameEn + ' — ' + (userReport.outlook || 'mixed')
                        }
                      </Text>
                    </View>
                  ) : (
                    <Text style={s.wbSub}>
                      {language === 'si' ? 'ලග්න 12ම සඳහා සතිපතා අනාවැකි' : 'Weekly forecasts for all 12 lagnas'}
                    </Text>
                  )}
                </View>
              </View>

              {/* Right: Arrow */}
              <View style={s.wbArrow}>
                <Ionicons name="chevron-down" size={16} color="rgba(168,85,247,0.7)" />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  /* ── Birth Summary — Glass Cosmic Identity ── */
  function renderBirthSummary() {
    if (!chartData) return null;
    var lagna = chartData.lagna;
    var moonSign = chartData.moonSign;
    var sunSign = chartData.sunSign;
    var nakshatra = chartData.nakshatra;

    var lagnaName = language === 'si' && lagna?.sinhala ? lagna.sinhala : lagna?.english || '--';
    var lagnaEn = lagna?.english || '';
    var moonName = language === 'si' && moonSign?.sinhala ? moonSign.sinhala : moonSign?.english || '--';
    var sunName = language === 'si' && sunSign?.sinhala ? sunSign.sinhala : sunSign?.english || '--';
    var nakName = language === 'si' && nakshatra?.sinhala ? nakshatra.sinhala : nakshatra?.name || '--';
    var lagnaIdx = lagna?.rashiId ? lagna.rashiId - 1 : 0;

    return (
      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <View style={s.glassIdentity}>
          <LinearGradient colors={['rgba(14,10,4,0.90)', 'rgba(10,7,3,0.85)', 'rgba(14,10,4,0.90)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <LinearGradient colors={['rgba(255,184,0,0.08)', 'transparent', 'rgba(255,140,0,0.04)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <LinearGradient colors={['rgba(255,255,255,0.05)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', borderTopLeftRadius: 22, borderTopRightRadius: 22 }} />

          {/* Title */}
          <View style={s.glassIdHeader}>
            <Text style={s.glassIdIcon}>🌟</Text>
            <Text style={s.glassIdTitle}>{language === 'si' ? 'ඔබේ ග්‍රහ තත්ත්වය' : 'Your Cosmic Identity'}</Text>
          </View>

          {/* ═══ LAGNA HERO — Big featured card ═══ */}
          <View style={s.lagnaHero}>
            <LinearGradient colors={['rgba(255,140,0,0.12)', 'rgba(255,184,0,0.05)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={s.lagnaHeroLeft}>
              <View style={s.lagnaSignBig}>
                <LinearGradient colors={['rgba(255,184,0,0.28)', 'rgba(255,140,0,0.12)']} style={StyleSheet.absoluteFillObject} />
                <Image source={ZODIAC_IMAGES[lagnaIdx]} style={s.lagnaSignImage} />
              </View>
            </View>
            <View style={s.lagnaHeroRight}>
              <Text style={s.lagnaHeroLabel}>{language === 'si' ? 'ලග්නය' : 'RISING SIGN'}</Text>
              <Text style={s.lagnaHeroName}>{lagnaName}</Text>
              {lagnaEn && language === 'si' ? <Text style={s.lagnaHeroSub}>{lagnaEn}</Text> : null}
              {lagna?.lord ? (
                <View style={s.lagnaLordPill}>
                  <Ionicons name="planet" size={11} color="#FFB800" />
                  <Text style={s.lagnaLordText}>{language === 'si' ? 'අධිපති: ' : 'Lord: '}{language === 'si' && PLANET_NAMES_SI[lagna.lord] ? PLANET_NAMES_SI[lagna.lord] : lagna.lord}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* ═══ 3 MINI GLASS CARDS — Moon / Sun / Nakshatra ═══ */}
          <View style={s.glassTrioRow}>
            <Animated.View entering={FadeInDown.delay(400).springify()} style={[s.glassTrioCard, { borderColor: 'rgba(147,197,253,0.18)' }]}>
              <LinearGradient colors={['rgba(147,197,253,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
              <Text style={s.glassTrioEmoji}>🌙</Text>
              <Text style={s.glassTrioLabel}>{language === 'si' ? 'චන්ද්‍ර' : 'Moon'}</Text>
              <Text style={[s.glassTrioValue, { color: '#93C5FD' }]}>{moonName}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(460).springify()} style={[s.glassTrioCard, { borderColor: 'rgba(255,214,102,0.18)' }]}>
              <LinearGradient colors={['rgba(255,214,102,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
              <Text style={s.glassTrioEmoji}>☀️</Text>
              <Text style={s.glassTrioLabel}>{language === 'si' ? 'සූර්ය' : 'Sun'}</Text>
              <Text style={[s.glassTrioValue, { color: '#FFD666' }]}>{sunName}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(520).springify()} style={[s.glassTrioCard, { borderColor: 'rgba(52,211,153,0.18)' }]}>
              <LinearGradient colors={['rgba(52,211,153,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
              <Text style={s.glassTrioEmoji}>✦</Text>
              <Text style={s.glassTrioLabel}>{language === 'si' ? 'නක්ෂත්‍ර' : 'Birth Star'}</Text>
              <Text style={[s.glassTrioValue, { color: '#34D399' }]}>{nakName}</Text>
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    );
  }

  /* ── Lagna Chart Card ── */
  function renderChartCard() {
    if (!chartData) return null;
    return (
      <CosmicCard variant="content" delay={350}>
        <SectionHeader title={language === 'si' ? 'ලග්න සටහන' : 'Your Birth Chart'} icon="🪐" delay={350} />
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
        <SectionHeader title={language === 'si' ? (ld.sinhala || 'ලග්න පලාපල') : (ld.english || 'Your Rising Sign Reading')} icon="🔮" delay={400} />
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
    var traitColors = ['#FF8C00', '#93C5FD', '#FFB800', '#F87171', '#34D399', '#6EE7B7', '#FFD666', '#A78BFA'];

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

  /* ── Cosmic Shield — Jyotish Daily Intelligence ── */
  function renderCosmicShield() {
    if (!jyotishToday) return null;
    var ds = jyotishToday.dishaShoola;
    var ch = jyotishToday.chandrashtama;
    var tb = jyotishToday.taraBalam;

    var DIRECTION_EMOJI = { North: '⬆️', South: '⬇️', East: '➡️', West: '⬅️', NE: '↗️', NW: '↖️', SE: '↘️', SW: '↙️' };
    var DIR_LABELS = {
      North: language === 'si' ? 'උතුර' : 'North',
      South: language === 'si' ? 'දකුණ' : 'South',
      East: language === 'si' ? 'නැ‍ග' : 'East',
      West: language === 'si' ? 'බට' : 'West',
    };

    var chActive = ch && ch.isActive;
    var taraLabel = tb ? (tb.tara || tb.bpiCategory || '--') : '--';
    var taraScore = tb && typeof tb.score === 'number' ? tb.score : null;
    var taraColor = taraScore != null ? (taraScore >= 70 ? '#34D399' : taraScore >= 40 ? '#FFB800' : '#EF4444') : '#FFB800';

    return (
      <Animated.View entering={FadeInDown.delay(320).springify()}>
        <CosmicCard variant="content" delay={320}>
          <SectionHeader title={language === 'si' ? '🛡️ තාරකා ආරක්ෂාව' : '🛡️ Cosmic Shield'} icon="" delay={320} />

          {/* ── Chandrashtama Alert Strip ── */}
          <View style={[cs.alertStrip, chActive ? cs.alertDanger : cs.alertSafe]}>
            {chActive && <LinearGradient colors={['rgba(239,68,68,0.12)', 'rgba(239,68,68,0.03)']} style={StyleSheet.absoluteFill} />}
            {!chActive && <LinearGradient colors={['rgba(52,211,153,0.10)', 'rgba(52,211,153,0.02)']} style={StyleSheet.absoluteFill} />}
            <View style={[cs.alertIconWrap, chActive ? cs.alertIconDanger : cs.alertIconSafe]}>
              <Ionicons name={chActive ? 'moon' : 'shield-checkmark'} size={18} color={chActive ? '#FF6B6B' : '#34D399'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[cs.alertTitle, chActive && cs.alertTitleDanger]}>
                {chActive
                  ? (language === 'si' ? '⚠ චන්ද්‍රාෂ්ටම' : '⚠ Unfavorable Moon Transit')
                  : (language === 'si' ? '✓ සඳු ආරක්ෂිතයි' : '✓ Moon Transit Safe')}
              </Text>
              <Text style={[cs.alertDesc, chActive && cs.alertDescDanger]}>
                {chActive
                  ? (language === 'si' ? 'ප්‍රධාන තීරණ ගැනීමෙන් වළකින්න' : 'Avoid major decisions today')
                  : (language === 'si' ? 'අද සඳු ගමන හිතකරයි' : 'Moon transit is favorable today')}
              </Text>
            </View>
            <View style={[cs.alertDot, { backgroundColor: chActive ? '#EF4444' : '#34D399' }]} />
          </View>

          {/* ── Tara Balam + Disha Shoola Row ── */}
          <View style={cs.shieldRow}>
            {/* Tara Balam Card */}
            {tb && (
              <View style={[cs.shieldCard, { borderColor: taraColor + '25' }]}>
                <LinearGradient colors={[taraColor + '10', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <Text style={cs.shieldEmoji}>⭐</Text>
                <Text style={cs.shieldLabel}>{language === 'si' ? 'තාරා බලය' : 'Star Strength'}</Text>
                <Text style={[cs.shieldValue, { color: taraColor }]}>{taraLabel}</Text>
                {taraScore != null && (
                  <View style={cs.shieldBarTrack}>
                    <View style={[cs.shieldBarFill, { width: taraScore + '%', backgroundColor: taraColor }]} />
                  </View>
                )}
              </View>
            )}

            {/* Disha Shoola Compass */}
            {ds && (
              <View style={[cs.shieldCard, { borderColor: 'rgba(139,92,246,0.20)' }]}>
                <LinearGradient colors={['rgba(139,92,246,0.10)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <Text style={cs.shieldEmoji}>🧭</Text>
                <Text style={cs.shieldLabel}>{language === 'si' ? 'ගමන් දිශාව' : 'Travel Compass'}</Text>
                {/* Compass mini display */}
                <View style={cs.compassGrid}>
                  {['North', 'South', 'East', 'West'].map(function (dir) {
                    var isBad = ds.avoidDirection === dir || (ds.avoidDirections && ds.avoidDirections.indexOf(dir) !== -1);
                    return (
                      <View key={dir} style={[cs.compassDir, isBad && cs.compassDirBad]}>
                        <Text style={{ fontSize: 10 }}>{DIRECTION_EMOJI[dir] || '•'}</Text>
                        <Text style={[cs.compassDirText, isBad && cs.compassDirTextBad]}>{DIR_LABELS[dir] || dir}</Text>
                      </View>
                    );
                  })}
                </View>
                {ds.avoidDirection && (
                  <View style={cs.avoidPill}>
                    <Ionicons name="close-circle" size={10} color="#F87171" />
                    <Text style={cs.avoidPillText}>{language === 'si' ? 'වළක්වන්න: ' : 'Avoid: '}{ds.avoidDirection}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </CosmicCard>
      </Animated.View>
    );
  }

  /* ── Today's Special Yogas ── */
  function renderTodayYogas() {
    if (!jyotishToday || !jyotishToday.specialYogas || jyotishToday.specialYogas.length === 0) return null;
    var yogaColors = ['#FF8C00', '#A78BFA', '#34D399', '#F472B6', '#60A5FA', '#FFB800'];
    return (
      <Animated.View entering={FadeInDown.delay(340).springify()}>
        <CosmicCard variant="surface" delay={340}>
          <SectionHeader title={language === 'si' ? '✨ අද දිනයේ විශේෂ තත්ත්ව' : "✨ Today's Cosmic Patterns"} icon="" delay={340} />
          <View style={cs.yogaWrap}>
            {jyotishToday.specialYogas.slice(0, 6).map(function (yoga, i) {
              var yColor = yogaColors[i % yogaColors.length];
              var yName = typeof yoga === 'string' ? yoga : (yoga.name || yoga.yoga || '--');
              var yDesc = typeof yoga === 'object' ? (yoga.description || yoga.result || null) : null;
              return (
                <Animated.View key={i} entering={FadeInUp.delay(380 + i * 50).springify()}>
                  <View style={[cs.yogaPill, { borderColor: yColor + '30' }]}>
                    <LinearGradient colors={[yColor + '12', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                    <View style={[cs.yogaDot, { backgroundColor: yColor }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[cs.yogaName, { color: yColor }]}>{yName}</Text>
                      {yDesc && <Text style={cs.yogaDesc} numberOfLines={2}>{yDesc}</Text>}
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </CosmicCard>
      </Animated.View>
    );
  }

  /* ── Panchanga Card ── */
  function renderPanchanga() {
    if (!data || !data.panchanga) return null;

    var TITHI_SI = { 'Pratipada': 'ප්‍රතිපදා', 'Dwitiya': 'ද්විතීයා', 'Tritiya': 'තෘතීයා', 'Chaturthi': 'චතුර්ථී', 'Panchami': 'පංචමී', 'Shashthi': 'ෂෂ්ඨී', 'Saptami': 'සප්තමී', 'Ashtami': 'අෂ්ටමී', 'Navami': 'නවමී', 'Dashami': 'දශමී', 'Ekadashi': 'ඒකාදශී', 'Dwadashi': 'ද්වාදශී', 'Trayodashi': 'ත්‍රයෝදශී', 'Chaturdashi': 'චතුර්දශී', 'Purnima/Amavasya': 'පුර්ණිමා/අමාවාසි' };
    var YOGA_SI = { 'Vishkambha': 'විෂ්කම්භ', 'Priti': 'ප්‍රීති', 'Ayushman': 'ආයුෂ්මාන්', 'Saubhagya': 'සෞභාග්‍ය', 'Shobhana': 'ශෝභන', 'Atiganda': 'අතිගණ්ඩ', 'Sukarma': 'සුකර්ම', 'Dhriti': 'ධෘතී', 'Shula': 'ශූල', 'Ganda': 'ගණ්ඩ', 'Vriddhi': 'වෘද්ධී', 'Dhruva': 'ධ්‍රැව', 'Vyaghata': 'ව්‍යාඝාත', 'Harshana': 'හර්ෂණ', 'Vajra': 'වජ්‍ර', 'Siddhi': 'සිද්ධී', 'Vyatipata': 'ව්‍යතීපාත', 'Variyan': 'වරියන්', 'Parigha': 'පරිඝ', 'Shiva': 'ශිව', 'Siddha': 'සිද්ධ', 'Sadhya': 'සාධ්‍ය', 'Shubha': 'ශුභ', 'Shukla': 'ශුක්ල', 'Brahma': 'බ්‍රහ්ම', 'Indra': 'ඉන්ද්‍ර', 'Vaidhriti': 'වෛධෘතී' };
    var KARANA_SI = { 'Bava': 'බව', 'Balava': 'බාලව', 'Kaulava': 'කෞලව', 'Taitila': 'තෛතිල', 'Garaja': 'ගරජ', 'Vanija': 'වණිජ', 'Vishti': 'විෂ්ටි', 'Kinstughna': 'කිංස්තුඝ්න', 'Shakuni': 'ශකුණි', 'Chatushpada': 'චතුෂ්පාද', 'Naga': 'නාග' };
    var VAARA_SI = { 'Sunday': 'ඉරිදා', 'Monday': 'සඳුදා', 'Tuesday': 'අඟහරුවාදා', 'Wednesday': 'බදාදා', 'Thursday': 'බ්‍රහස්පතින්දා', 'Friday': 'සිකුරාදා', 'Saturday': 'සෙනසුරාදා' };
    var ALL_SI = Object.assign({}, TITHI_SI, YOGA_SI, KARANA_SI, VAARA_SI);

    // Each row: [label, data, color, explanationKey, icon, hintKey]
    var rows = [
      [t('tithi'), data.panchanga.tithi, '#FF8C00', 'tithiExplain', 'sparkles-outline', t('tithiHint')],
      [t('nakshatra'), data.panchanga.nakshatra, '#93C5FD', 'nakshatraExplain', 'star-outline', t('nakshatraHint')],
      [t('yoga'), data.panchanga.yoga, '#34D399', 'yogaExplain', 'infinite-outline', t('yogaHint')],
      [t('karana'), data.panchanga.karana, '#FFD666', 'karanaExplain', 'time-outline', t('karanaHint')],
      [t('vaara'), data.panchanga.vaara, '#F472B6', 'vaaraExplain', 'planet-outline', t('vaaraHint')],
    ];

    return (
      <CosmicCard variant="surface" delay={500}>
        <SectionHeader title={t('sacredPanchanga')} subtitle={t('sacredPanchangaHint')} icon="🕉" delay={500} />
        {/* Tap hint */}
        <View style={s.pTapHintRow}>
          <Ionicons name="hand-left-outline" size={12} color="rgba(255,214,102,0.35)" />
          <Text style={s.pTapHint}>{t('tapToLearn')}</Text>
        </View>
        {rows.map(function (row, i) {
          var label = row[0], entry = row[1], color = row[2], explainKey = row[3], icon = row[4], hint = row[5];
          if (!entry) return null;
          var englishName = typeof entry === 'string' ? entry : (entry.english || entry.name || String(entry));
          var sinhalaName = typeof entry === 'object' ? entry.sinhala : ALL_SI[englishName];
          var dispName = (language === 'si' && sinhalaName) ? sinhalaName : englishName;
          var subName = language === 'si' ? null : sinhalaName;
          var isOpen = expandedPanchanga === i;
          return (
            <View key={i}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={function () { setExpandedPanchanga(isOpen ? null : i); }}
              >
                <View style={[s.pRow, i === rows.length - 1 && !isOpen && { borderBottomWidth: 0 }]}>
                  <View style={[s.pIconWrap, { backgroundColor: color + '18' }]}>
                    <Ionicons name={icon} size={14} color={color} />
                  </View>
                  <View style={s.pLabelWrap}>
                    <Text style={[s.pLabel, { color }]}>{label}</Text>
                    <Text style={s.pHintText}>{hint}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={s.pValue}>{dispName}</Text>
                    {subName ? <Text style={s.pSinhala}>{subName}</Text> : null}
                  </View>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color="rgba(255,214,102,0.30)"
                    style={{ marginLeft: 6 }}
                  />
                </View>
              </TouchableOpacity>
              {isOpen && (
                <Animated.View entering={FadeInDown.duration(250)}>
                  <View style={s.pExplainBox}>
                    <LinearGradient
                      colors={[color + '12', 'transparent']}
                      style={StyleSheet.absoluteFillObject}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    />
                    <View style={[s.pExplainAccent, { backgroundColor: color }]} />
                    <Text style={s.pExplainText}>{t(explainKey)}</Text>
                  </View>
                </Animated.View>
              )}
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

  /* ── Weekly Lagna Palapala ── */
  function renderWeeklyLagna() {
    if (!weeklyLagna || !weeklyLagna.reports || weeklyLagna.reports.length === 0) return null;

    var reports = weeklyLagna.reports;
    var weekStart = weeklyLagna.weekStart ? new Date(weeklyLagna.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    var weekEnd = weeklyLagna.weekEnd ? new Date(weeklyLagna.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    var weekLabel = weekStart && weekEnd ? weekStart + ' – ' + weekEnd : '';

    // User's lagna (if birth data available)
    var userLagnaId = chartData && chartData.lagna ? (chartData.lagna.rashiId || chartData.lagna.id || null) : null;

    var OUTLOOK_CONFIG = {
      favorable: { bg: 'rgba(52,211,153,0.10)', border: 'rgba(52,211,153,0.25)', color: '#34D399', icon: 'trending-up', label: language === 'si' ? 'හිතකර' : 'Favorable' },
      mixed: { bg: 'rgba(255,184,0,0.10)', border: 'rgba(255,184,0,0.25)', color: '#FFB800', icon: 'swap-horizontal', label: language === 'si' ? 'මිශ්‍ර' : 'Mixed' },
      challenging: { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.25)', color: '#EF4444', icon: 'alert-circle', label: language === 'si' ? 'අභියෝගාත්මක' : 'Challenging' },
    };

    return (
      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <CosmicCard variant="surface" delay={300}>
          {/* Header */}
          <View style={s.wlHeader}>
            <View style={s.wlHeaderLeft}>
              <Text style={{ fontSize: 22 }}>🔮</Text>
              <View>
                <Text style={s.wlTitle}>{language === 'si' ? 'සතිපතා ලග්න පලාපල' : 'Weekly Forecast'}</Text>
                {weekLabel ? <Text style={s.wlWeekLabel}>{weekLabel}</Text> : null}
              </View>
            </View>
          </View>

          {/* Lagna Grid */}
          <View style={s.wlGrid}>
            {reports.map(function (report) {
              var isExpanded = weeklyLagnaExpanded === report.lagnaId;
              var isUserLagna = userLagnaId === report.lagnaId;
              var outlookCfg = OUTLOOK_CONFIG[report.outlook] || OUTLOOK_CONFIG.mixed;

              return (
                <View key={report.lagnaId}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={function () { setWeeklyLagnaExpanded(isExpanded ? null : report.lagnaId); }}
                  >
                    <View style={[
                      s.wlCard,
                      isUserLagna && s.wlCardUser,
                      isExpanded && s.wlCardExpanded,
                    ]}>
                      {isUserLagna && (
                        <LinearGradient
                          colors={['rgba(255,184,0,0.12)', 'rgba(255,140,0,0.04)']}
                          style={StyleSheet.absoluteFill}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        />
                      )}
                      <View style={s.wlCardRow}>
                        <View style={[s.wlSignBadge, { borderColor: outlookCfg.border, backgroundColor: outlookCfg.bg }]}>
                          <Image source={ZODIAC_IMAGES[(report.lagnaId || 1) - 1]} style={s.wlSignImage} />
                        </View>
                        <View style={s.wlCardInfo}>
                          <View style={s.wlNameRow}>
                            <Text style={s.wlSignName}>
                              {language === 'si' ? report.nameSi : report.nameEn}
                            </Text>
                            {isUserLagna && (
                              <View style={s.wlYouBadge}>
                                <Text style={s.wlYouText}>{language === 'si' ? 'ඔබ' : 'YOU'}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={s.wlSignNameSub}>
                            {language === 'si' ? report.nameEn : report.nameSi}
                          </Text>
                        </View>
                        <View style={[s.wlOutlookPill, { backgroundColor: outlookCfg.bg, borderColor: outlookCfg.border }]}>
                          <Ionicons name={outlookCfg.icon} size={12} color={outlookCfg.color} />
                          <Text style={[s.wlOutlookText, { color: outlookCfg.color }]}>{outlookCfg.label}</Text>
                        </View>
                        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="rgba(255,214,102,0.40)" />
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <Animated.View entering={FadeInDown.duration(250)} style={s.wlDetail}>
                      <LinearGradient
                        colors={['rgba(14,10,4,0.95)', 'rgba(10,7,3,0.90)']}
                        style={StyleSheet.absoluteFill}
                      />

                      {/* Lagna Lord & Ruling Planet */}
                      <View style={s.wlLordRow}>
                        <View style={s.wlLordChip}>
                          <Text numberOfLines={1} style={s.wlLordLabel}>{language === 'si' ? 'අධිපති' : 'Lord'}</Text>
                          <Text numberOfLines={1} style={s.wlLordValue}>{language === 'si' ? report.lordSi : report.lord}</Text>
                        </View>
                        <View style={s.wlLordChip}>
                          <Text numberOfLines={1} style={s.wlLordLabel}>{language === 'si' ? 'සංස්කෘත' : 'Sanskrit'}</Text>
                          <Text numberOfLines={1} style={s.wlLordValue}>{report.sanskrit}</Text>
                        </View>
                        <View style={[s.wlLordChip, { borderColor: (OUTLOOK_CONFIG[report.outlook] || OUTLOOK_CONFIG.mixed).border }]}>
                          <Text numberOfLines={1} style={s.wlLordLabel}>{language === 'si' ? 'තත්ත්වය' : 'Status'}</Text>
                          <Text numberOfLines={1} style={[s.wlLordValue, { color: (OUTLOOK_CONFIG[report.outlook] || OUTLOOK_CONFIG.mixed).color }]}>
                            {(OUTLOOK_CONFIG[report.outlook] || OUTLOOK_CONFIG.mixed).label}
                          </Text>
                        </View>
                      </View>

                      {/* Overall Outlook */}
                      <View style={s.wlOverallBox}>
                        <View style={s.wlSectionHeader}>
                          <Ionicons name="telescope-outline" size={14} color="#A78BFA" />
                          <Text style={s.wlSectionTitle}>{language === 'si' ? 'සමස්ත දැක්ම' : 'Overall Outlook'}</Text>
                        </View>
                        <Text style={s.wlDetailText}>
                          {language === 'si' ? report.overallSi : report.overallEn}
                        </Text>
                      </View>

                      {/* Planetary Transit Note */}
                      {(report.transitEn || report.transitSi) ? (
                        <View style={s.wlTransitBox}>
                          <View style={s.wlSectionHeader}>
                            <Ionicons name="planet-outline" size={14} color="#818CF8" />
                            <Text style={s.wlSectionTitle}>{language === 'si' ? 'ග්‍රහ ගමන්' : 'Planetary Transits'}</Text>
                          </View>
                          <Text style={s.wlSectionBody}>
                            {language === 'si' ? report.transitSi : report.transitEn}
                          </Text>
                        </View>
                      ) : null}

                      {/* Career & Finance */}
                      {(report.careerEn || report.careerSi) ? (
                        <View style={s.wlSection}>
                          <View style={s.wlSectionHeader}>
                            <Ionicons name="briefcase-outline" size={14} color="#FFB800" />
                            <Text style={s.wlSectionTitle}>{language === 'si' ? 'රැකියාව සහ මුදල්' : 'Career & Finance'}</Text>
                          </View>
                          <Text style={s.wlSectionBody}>
                            {language === 'si' ? report.careerSi : report.careerEn}
                          </Text>
                        </View>
                      ) : null}

                      {/* Education & Learning */}
                      {(report.educationEn || report.educationSi) ? (
                        <View style={s.wlSection}>
                          <View style={s.wlSectionHeader}>
                            <Ionicons name="school-outline" size={14} color="#60A5FA" />
                            <Text style={s.wlSectionTitle}>{language === 'si' ? 'අධ්‍යාපනය' : 'Education & Learning'}</Text>
                          </View>
                          <Text style={s.wlSectionBody}>
                            {language === 'si' ? report.educationSi : report.educationEn}
                          </Text>
                        </View>
                      ) : null}

                      {/* Health & Wellbeing */}
                      {(report.healthEn || report.healthSi) ? (
                        <View style={s.wlSection}>
                          <View style={s.wlSectionHeader}>
                            <Ionicons name="fitness-outline" size={14} color="#34D399" />
                            <Text style={s.wlSectionTitle}>{language === 'si' ? 'සෞඛ්‍ය' : 'Health & Wellbeing'}</Text>
                          </View>
                          <Text style={s.wlSectionBody}>
                            {language === 'si' ? report.healthSi : report.healthEn}
                          </Text>
                        </View>
                      ) : null}

                      {/* Relationships */}
                      {(report.relationshipEn || report.relationshipSi) ? (
                        <View style={s.wlSection}>
                          <View style={s.wlSectionHeader}>
                            <Ionicons name="heart-outline" size={14} color="#F472B6" />
                            <Text style={s.wlSectionTitle}>{language === 'si' ? 'සබඳතා' : 'Relationships'}</Text>
                          </View>
                          <Text style={s.wlSectionBody}>
                            {language === 'si' ? report.relationshipSi : report.relationshipEn}
                          </Text>
                        </View>
                      ) : null}

                      {/* Family */}
                      {(report.familyEn || report.familySi) ? (
                        <View style={s.wlSection}>
                          <View style={s.wlSectionHeader}>
                            <Ionicons name="people-outline" size={14} color="#FB923C" />
                            <Text style={s.wlSectionTitle}>{language === 'si' ? 'පවුල සහ ගෘහස්ථ' : 'Family & Home'}</Text>
                          </View>
                          <Text style={s.wlSectionBody}>
                            {language === 'si' ? report.familySi : report.familyEn}
                          </Text>
                        </View>
                      ) : null}

                      {/* Spiritual & Religious */}
                      {(report.spiritualEn || report.spiritualSi) ? (
                        <View style={s.wlSection}>
                          <View style={s.wlSectionHeader}>
                            <Ionicons name="flower-outline" size={14} color="#C084FC" />
                            <Text style={s.wlSectionTitle}>{language === 'si' ? 'ආධ්‍යාත්මික' : 'Spiritual & Religious'}</Text>
                          </View>
                          <Text style={s.wlSectionBody}>
                            {language === 'si' ? report.spiritualSi : report.spiritualEn}
                          </Text>
                        </View>
                      ) : null}

                      {/* Remedy / Precaution */}
                      {(report.remedyEn || report.remedySi) ? (
                        <View style={s.wlRemedyBox}>
                          <View style={s.wlSectionHeader}>
                            <Ionicons name="shield-checkmark-outline" size={14} color="#2DD4BF" />
                            <Text style={s.wlSectionTitle}>{language === 'si' ? 'ප්‍රතිකාර / පිළියම්' : 'Remedies & Precautions'}</Text>
                          </View>
                          <Text style={s.wlSectionBody}>
                            {language === 'si' ? report.remedySi : report.remedyEn}
                          </Text>
                        </View>
                      ) : null}

                      {/* Key Advice */}
                      {(report.adviceEn || report.adviceSi) ? (
                        <View style={s.wlAdvice}>
                          <Ionicons name="bulb-outline" size={14} color="#FFD666" />
                          <Text style={s.wlAdviceText}>
                            {language === 'si' ? report.adviceSi : report.adviceEn}
                          </Text>
                        </View>
                      ) : null}

                      {/* Lucky Row */}
                      <View style={s.wlLuckyRow}>
                        {report.luckyDay ? (
                          <View style={s.wlLuckyItem}>
                            <Text style={s.wlLuckyIcon}>📅</Text>
                            <View style={{ flex: 1 }}>
                              <Text numberOfLines={1} style={s.wlLuckyMeta}>{language === 'si' ? 'දිනය' : 'Day'}</Text>
                              <Text numberOfLines={1} style={s.wlLuckyLabel}>{language === 'si' ? report.luckyDay.si : report.luckyDay.en}</Text>
                            </View>
                          </View>
                        ) : null}
                        {report.luckyColor ? (
                          <View style={s.wlLuckyItem}>
                            <Text style={s.wlLuckyIcon}>🎨</Text>
                            <View style={{ flex: 1 }}>
                              <Text numberOfLines={1} style={s.wlLuckyMeta}>{language === 'si' ? 'වර්ණය' : 'Color'}</Text>
                              <Text numberOfLines={1} style={s.wlLuckyLabel}>{language === 'si' ? report.luckyColor.si : report.luckyColor.en}</Text>
                            </View>
                          </View>
                        ) : null}
                        {report.luckyNumber ? (
                          <View style={s.wlLuckyItem}>
                            <Text style={s.wlLuckyIcon}>🔢</Text>
                            <View style={{ flex: 1 }}>
                              <Text numberOfLines={1} style={s.wlLuckyMeta}>{language === 'si' ? 'අංකය' : 'Number'}</Text>
                              <Text numberOfLines={1} style={s.wlLuckyLabel}>{report.luckyNumber}</Text>
                            </View>
                          </View>
                        ) : null}
                      </View>
                    </Animated.View>
                  )}
                </View>
              );
            })}
          </View>
        </CosmicCard>
      </Animated.View>
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
              ? 'ඔබගේ උපන් විස්තර ඇතුලත් කර ඔබගේ ලග්න පලාපල, නක්ෂත්‍ර සහ සතිපතා පලාපල බලාගන්න.'
              : 'Add your birth details in Profile to unlock your personalised Lagna chart, Nakshatra & weekly readings.'}
          </Text>
          <TouchableOpacity onPress={function () { router.push('/profile'); }} style={s.noBirthCta}>
            <LinearGradient colors={['#FF8C00', '#FF6D00', '#E65100']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <LinearGradient colors={['rgba(255,255,255,0.20)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', borderTopLeftRadius: 999, borderTopRightRadius: 999 }} />
            <Ionicons name="sparkles" size={14} color="#fff" />
            <Text style={s.noBirthCtaText}>{language === 'si' ? 'Profile → Birth Data' : 'Go to Profile → Birth Data'}</Text>
          </TouchableOpacity>
        </View>
      </CosmicCard>
    );
  }

  return (
    <DesktopScreenWrapper routeName="index">
      <View style={{ flex: 1, backgroundColor: '#020508' }}>
        <PremiumBackground />
        <Animated.ScrollView
          ref={scrollRef}
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
              colors={['#FF8C00', '#FF6D00']}
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

              {/* Moon Phase Showcase */}
              {renderMoonPhaseCard()}

              {/* Daily Cosmic Ratings */}
              {renderDailyRatings()}

              {/* Lucky Numbers */}
              {renderLuckyNumbers()}

              {/* Daily Mantra */}
              {renderDailyMantra()}

              {/* Weekly Palapala Banner */}
              {renderWeeklyBanner()}

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

              {/* Cosmic Shield — Jyotish Intelligence */}
              {hasBirthData && renderCosmicShield()}
              {hasBirthData && renderTodayYogas()}

              {/* Panchanga */}
              {renderPanchanga()}

              {/* Weekly Lagna Palapala */}
              <View onLayout={function (e) { weeklyLagnaY.current = e.nativeEvent.layout.y; }}>
                {renderWeeklyLagna()}
              </View>

              {/* Auspicious */}
              {renderAuspicious()}

              <View style={{ height: isDesktop ? 32 : 140 }} />
            </View>
          )}
        </Animated.ScrollView>
      </View>
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
    fontSize: 28, fontWeight: '900', color: '#FFF1D0', letterSpacing: 0.3,
    ...textShadow('rgba(255,140,0,0.5)', { width: 0, height: 2 }, 10),
  },
  dateBadge: {
    backgroundColor: 'rgba(255,184,0,0.12)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.22)',
  },
  dateText: { color: '#FFD666', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  // Dashboard Hero
  dashHero: {
    borderRadius: 24, overflow: 'hidden', marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,140,0,0.15)',
    ...boxShadow('#FF8C00', { width: 0, height: 4 }, 0.20, 20), elevation: 10,
  },
  dashHeroBg: { ...StyleSheet.absoluteFillObject, borderRadius: 24 },
  dashGlassShine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1.5,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  dashNebulaBlob: {
    position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,140,0,0.08)',
  },
  dashEdgeTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },

  // Rashi Chakra Hero
  chakraHeroWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 2,
  },
  chakraContainer: {
    width: CHAKRA_HERO_SIZE,
    height: CHAKRA_HERO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 8,
  },
  chakraOverlayInfo: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  chakraSignBadge: {
    width: 72, height: 72, borderRadius: 36, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,184,0,0.55)',
    backgroundColor: 'rgba(10,7,4,0.70)',
    ...boxShadow('rgba(255,184,0,0.25)', { width: 0, height: 0 }, 0.8, 20),
  },
  chakraSignSymbol: {
    fontSize: 34, color: '#FFD666',
    ...textShadow('rgba(255,214,102,0.9)', { width: 0, height: 0 }, 18),
  },
  chakraSignImage: {
    width: 52, height: 52, resizeMode: 'contain',
  },
  chakraSignTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chakraSignTextWrap: {
    flex: 1,
  },
  chakraSignSubBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,184,0,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.12)',
  },

  dashHeroLabel: { color: 'rgba(255,214,102,0.55)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  dashSignNameLarge: { color: '#FFF1D0', fontSize: 22, fontWeight: '900', letterSpacing: 0.3, lineHeight: 28, ...textShadow('rgba(255,184,0,0.35)', { width: 0, height: 1 }, 10) },
  dashSignNameSub: { color: 'rgba(255,214,102,0.65)', fontSize: 12, fontWeight: '700' },
  nakPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center',
    marginBottom: 12, paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,214,102,0.15)',
    overflow: 'hidden',
  },
  nakPillLabel: { color: 'rgba(255,214,102,0.65)', fontSize: 11, fontWeight: '700' },
  nakPillDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,214,102,0.40)' },
  nakPillValue: { color: '#FFD666', fontSize: 13, fontWeight: '800' },
  dashDivider: { height: 1, marginHorizontal: 18, overflow: 'hidden' },
  dashGridTitle: { color: 'rgba(255,214,102,0.50)', fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', textAlign: 'center', marginTop: 12, marginBottom: -4 },
  dashGrid: {
    flexDirection: 'row', paddingHorizontal: 6, paddingTop: 14, paddingBottom: 16, gap: 4,
  },
  dashCell: {
    flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 2,
    borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.02)',
    overflow: 'hidden',
  },
  dashCellIcon: {
    width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  dashCellValue: { color: '#FFF1D0', fontSize: 11, fontWeight: '800', textAlign: 'center', paddingHorizontal: 2 },
  dashCellLabel: { color: 'rgba(255,214,102,0.40)', fontSize: 8, fontWeight: '700', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 },

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
    ...boxShadow('#EF4444', { width: 0, height: 2 }, 0.30, 12), elevation: 6,
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
  rahuTitle: { color: 'rgba(255,214,102,0.55)', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  rahuTitleActive: { color: '#FCA5A5', fontWeight: '800', fontSize: 13 },
  rahuTime: { color: 'rgba(255,214,102,0.45)', fontSize: 13, fontWeight: '600', marginTop: 2 },
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
  statMiniValue: { fontSize: 15, fontWeight: '800', color: '#FFF1D0' },
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
  quickPillLabel: { color: '#FFF1D0', fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },

  // Glass Cosmic Identity
  glassIdentity: {
    borderRadius: 22, overflow: 'hidden', marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.12)',
    ...boxShadow('#FF8C00', { width: 0, height: 4 }, 0.15, 16), elevation: 8,
  },
  glassIdHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 10,
  },
  glassIdIcon: { fontSize: 18 },
  glassIdTitle: { color: '#FFE8B0', fontSize: 16, fontWeight: '800', letterSpacing: 0.5, ...textShadow('rgba(255,184,0,0.20)', { width: 0, height: 1 }, 6) },

  // Lagna Hero
  lagnaHero: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginBottom: 14,
    borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,140,0,0.22)',
    padding: 16, gap: 16,
  },
  lagnaHeroLeft: { alignItems: 'center' },
  lagnaSignBig: {
    width: 96, height: 96, borderRadius: 28, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,184,0,0.55)',
    ...boxShadow('rgba(255,184,0,0.20)', { width: 0, height: 0 }, 0.8, 18),
  },
  lagnaSignEmoji: {
    fontSize: 46, ...textShadow('rgba(255,214,102,0.9)', { width: 0, height: 0 }, 20),
  },
  lagnaSignImage: {
    width: 72, height: 72, resizeMode: 'contain',
  },
  lagnaHeroRight: { flex: 1 },
  lagnaHeroLabel: {
    color: 'rgba(255,214,102,0.55)', fontSize: 11, fontWeight: '700',
    letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 4,
  },
  lagnaHeroName: { color: '#FFB800', fontSize: 26, fontWeight: '900', letterSpacing: 0.3, ...textShadow('rgba(255,184,0,0.40)', { width: 0, height: 1 }, 10) },
  lagnaHeroSub: { color: 'rgba(255,214,102,0.60)', fontSize: 13, fontWeight: '600', marginTop: 2 },
  lagnaLordPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8,
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,184,0,0.08)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.15)',
  },
  lagnaLordText: { color: '#FFB800', fontSize: 11, fontWeight: '700' },

  // Glass Trio Row
  glassTrioRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 16 },
  glassTrioCard: {
    flex: 1, borderRadius: 14, overflow: 'hidden', padding: 12,
    alignItems: 'center', borderWidth: 1, gap: 4,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  glassTrioEmoji: { fontSize: 18, marginBottom: 2 },
  glassTrioLabel: {
    color: 'rgba(255,214,102,0.45)', fontSize: 9, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase',
  },
  glassTrioValue: { fontSize: 14, fontWeight: '800', textAlign: 'center' },

  // Palapala
  palapalaText: { color: 'rgba(255,214,102,0.65)', fontSize: 14, lineHeight: 23, marginBottom: 14 },
  traitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  traitChip: {
    backgroundColor: 'rgba(124,58,237,0.10)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(124,58,237,0.20)',
  },
  traitText: { color: '#FF8C00', fontSize: 12, fontWeight: '600' },
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

  // Panchanga (expandable with explanations)
  pTapHintRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 6, paddingHorizontal: 2,
  },
  pTapHint: { color: 'rgba(255,214,102,0.30)', fontSize: 11, fontWeight: '500', fontStyle: 'italic' },
  pRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10,
  },
  pIconWrap: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  pLabelWrap: { width: 85 },
  pDot: { width: 6, height: 6, borderRadius: 3 },
  pLabel: { fontSize: 13, fontWeight: '700' },
  pHintText: { fontSize: 10, color: 'rgba(255,214,102,0.30)', fontWeight: '500', marginTop: 1 },
  pValue: { fontSize: 14, color: '#FFE8B0', fontWeight: '700' },
  pSinhala: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  pExplainBox: {
    borderRadius: 10, padding: 14, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden', position: 'relative',
  },
  pExplainAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },
  pExplainText: {
    color: 'rgba(255,214,102,0.60)', fontSize: 13, lineHeight: 21, fontWeight: '500',
    paddingLeft: 6,
  },

  // Auspicious
  auspRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 12 },
  auspBar: { width: 3, height: 24, borderRadius: 2 },
  auspName: { fontSize: 14, color: '#FFE8B0', fontWeight: '700' },
  auspSinhala: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  auspTime: { flexDirection: 'row' },
  auspTimeText: { fontSize: 13, color: '#34D399', fontWeight: '700', letterSpacing: 0.3 },

  // No Birth Data
  noBirthTitle: { color: '#FFE8B0', fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 8, ...textShadow('rgba(255,184,0,0.30)', { width: 0, height: 1 }, 8) },
  noBirthBody: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 18, paddingHorizontal: 8 },
  noBirthCta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 22, paddingVertical: 14, borderRadius: 999, overflow: 'hidden',
    ...boxShadow('#FF8C00', { width: 0, height: 4 }, 0.7, 16), elevation: 0,
  },
  noBirthCtaText: { color: '#FFF1D0', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },

  // Weekly Palapala Banner
  wbCard: {
    borderRadius: 20, overflow: 'hidden', marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.25)',
    paddingVertical: 16, paddingHorizontal: 16,
  },
  wbContent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  wbLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  wbIconWrap: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.30)',
  },
  wbTextCol: { flex: 1 },
  wbTitle: { color: '#E0CFFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
  wbWeek: { color: 'rgba(168,85,247,0.55)', fontSize: 10, fontWeight: '600', marginTop: 2 },
  wbSub: { color: 'rgba(255,214,102,0.40)', fontSize: 11, fontWeight: '500', marginTop: 3 },
  wbTeaser: { marginTop: 3 },
  wbTeaserText: { color: 'rgba(255,214,102,0.60)', fontSize: 11, fontWeight: '600' },
  wbArrow: {
    width: 30, height: 30, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(168,85,247,0.10)',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.18)',
  },

  // Weekly Lagna Palapala
  wlHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  wlHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wlTitle: { color: '#FFE8B0', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  wlWeekLabel: { color: 'rgba(255,214,102,0.45)', fontSize: 11, fontWeight: '600', marginTop: 1 },
  wlGrid: { gap: 6 },
  wlCard: {
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  wlCardUser: {
    borderColor: 'rgba(255,184,0,0.30)',
    ...boxShadow('#FFB800', { width: 0, height: 2 }, 0.15, 8), elevation: 4,
  },
  wlCardExpanded: {
    borderColor: 'rgba(255,214,102,0.20)',
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
  },
  wlCardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  wlSignBadge: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  wlSignEmoji: { fontSize: 26 },
  wlSignImage: { width: 42, height: 42, resizeMode: 'contain' },
  wlCardInfo: { flex: 1 },
  wlNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wlSignName: { color: '#FFF1D0', fontSize: 15, fontWeight: '800' },
  wlSignNameSub: { color: 'rgba(255,214,102,0.40)', fontSize: 12, fontWeight: '600', marginTop: 1 },
  wlYouBadge: {
    backgroundColor: 'rgba(255,184,0,0.20)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.35)',
  },
  wlYouText: { color: '#FFB800', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  wlOutlookPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1,
  },
  wlOutlookText: { fontSize: 10, fontWeight: '700' },
  wlDetail: {
    overflow: 'hidden', borderRadius: 14,
    borderTopLeftRadius: 0, borderTopRightRadius: 0,
    borderWidth: 1, borderTopWidth: 0,
    borderColor: 'rgba(255,214,102,0.12)',
    padding: 14, gap: 12,
    marginBottom: 4,
  },
  wlLordRow: {
    flexDirection: 'row', gap: 6, marginBottom: 4,
  },
  wlLordChip: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 8, minHeight: 48,
    borderWidth: 1, borderColor: 'rgba(255,214,102,0.10)',
  },
  wlLordLabel: { color: 'rgba(255,214,102,0.40)', fontSize: 8, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' },
  wlLordValue: { color: '#FFE8B0', fontSize: 11, fontWeight: '800', marginTop: 2, textAlign: 'center', numberOfLines: 1 },
  wlOverallBox: {
    backgroundColor: 'rgba(167,139,250,0.06)', borderRadius: 12,
    padding: 12, gap: 6,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.12)',
  },
  wlTransitBox: {
    backgroundColor: 'rgba(129,140,248,0.06)', borderRadius: 12,
    padding: 12, gap: 6,
    borderWidth: 1, borderColor: 'rgba(129,140,248,0.10)',
  },
  wlRemedyBox: {
    backgroundColor: 'rgba(45,212,191,0.06)', borderRadius: 12,
    padding: 12, gap: 6,
    borderWidth: 1, borderColor: 'rgba(45,212,191,0.10)',
  },
  wlDetailText: { color: 'rgba(255,214,102,0.70)', fontSize: 13, lineHeight: 21 },
  wlSection: { gap: 4 },
  wlSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  wlSectionTitle: { color: 'rgba(255,214,102,0.55)', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  wlSectionBody: { color: 'rgba(255,214,102,0.60)', fontSize: 13, lineHeight: 20 },
  wlAdvice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(255,184,0,0.06)', borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: 'rgba(255,184,0,0.12)',
  },
  wlAdviceText: { color: '#FFD666', fontSize: 12, fontWeight: '600', lineHeight: 18, flex: 1 },
  wlLuckyRow: { flexDirection: 'row', gap: 6 },
  wlLuckyItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  wlLuckyIcon: { fontSize: 14 },
  wlLuckyMeta: { color: 'rgba(255,214,102,0.35)', fontSize: 7, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  wlLuckyLabel: { color: '#FFD666', fontSize: 11, fontWeight: '700' },
});

// ── Moon Phase Styles ──
var mp = StyleSheet.create({
  card: {
    borderRadius: 22, overflow: 'hidden', marginBottom: 14,
    paddingBottom: 20, position: 'relative',
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject, borderRadius: 22,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.12)',
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 4,
  },
  sectionTitle: {
    color: '#E8E0FF', fontSize: 17, fontWeight: '900', letterSpacing: 0.3,
  },
  timelineBadge: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
    backgroundColor: 'rgba(167,139,250,0.10)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.18)',
  },
  timelineBadgeText: { color: 'rgba(196,181,253,0.60)', fontSize: 10, fontWeight: '700' },

  // ── Timeline scroll ──
  timelineScroll: { paddingHorizontal: 12, paddingVertical: 12, gap: 0 },
  tlItem: {
    width: 58, alignItems: 'center', paddingVertical: 8, borderRadius: 16,
  },
  tlItemSelected: {
    backgroundColor: 'rgba(167,139,250,0.10)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)',
  },
  tlDayName: { color: 'rgba(196,181,253,0.30)', fontSize: 9, fontWeight: '600', marginBottom: 6 },
  tlDayNameActive: { color: 'rgba(196,181,253,0.80)', fontWeight: '800' },
  tlDayNameToday: { color: '#A78BFA' },
  tlMoonWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  tlMoonWrapActive: {
    width: 44, height: 44, borderRadius: 22,
  },
  tlMoonGlow: {
    ...StyleSheet.absoluteFillObject, borderRadius: 22,
    backgroundColor: 'rgba(167,139,250,0.15)',
    shadowColor: '#A78BFA', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 12, elevation: 0,
  },
  tlDateNum: { color: 'rgba(196,181,253,0.35)', fontSize: 11, fontWeight: '700', marginTop: 4 },
  tlDateNumActive: { color: '#C4B5FD', fontWeight: '900', fontSize: 13 },
  tlTodayDot: {
    width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#A78BFA',
    marginTop: 3,
    shadowColor: '#A78BFA', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 4, elevation: 0,
  },
  tlKeyPhaseDot: {
    width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(251,191,36,0.6)',
    marginTop: 3,
  },

  // ── Divider ──
  divider: {
    height: 1, backgroundColor: 'rgba(167,139,250,0.08)',
    marginHorizontal: 20, marginVertical: 4,
  },

  // ── Central section ──
  centralSection: { alignItems: 'center', paddingTop: 8 },
  selectedDateLabel: {
    color: 'rgba(196,181,253,0.50)', fontSize: 11, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4,
  },
  moonWrap: { alignItems: 'center', marginVertical: 8 },
  moonAura: {
    position: 'absolute', top: -30, left: -30, right: -30, bottom: -30,
    borderRadius: 999, transform: [{ scale: 1.1 }], zIndex: -1,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 30, elevation: 10,
  },
  phaseName: {
    color: '#E8E0FF', fontSize: 22, fontWeight: '900', textAlign: 'center',
    letterSpacing: 0.5, marginTop: 4,
    ...textShadow('rgba(167,139,250,0.40)', { width: 0, height: 2 }, 12),
  },
  phaseDesc: {
    color: 'rgba(196,181,253,0.55)', fontSize: 12.5, fontWeight: '500', textAlign: 'center',
    lineHeight: 19, marginTop: 8, marginHorizontal: 28,
  },

  // ── Illumination bar ──
  illumBarWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    alignSelf: 'center', marginTop: 14, width: '70%',
  },
  illumBarTrack: {
    flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(167,139,250,0.08)',
    overflow: 'hidden',
  },
  illumBarFill: { height: '100%', borderRadius: 2, overflow: 'hidden' },
  illumBarLabel: { color: 'rgba(196,181,253,0.70)', fontSize: 12, fontWeight: '800', minWidth: 36, textAlign: 'right' },
});

// ── Daily Ratings Styles ──
var dr = StyleSheet.create({
  card: {
    borderRadius: 22, overflow: 'hidden', marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,140,0,0.12)',
    padding: 18,
    ...boxShadow('#FF8C00', { width: 0, height: 4 }, 0.12, 16), elevation: 8,
  },
  title: {
    color: '#FFE8B0', fontSize: 17, fontWeight: '900', textAlign: 'center',
    marginBottom: 16, letterSpacing: 0.3,
    ...textShadow('rgba(255,184,0,0.20)', { width: 0, height: 1 }, 6),
  },
  grid: { gap: 14 },
  item: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  label: { color: 'rgba(255,214,102,0.70)', fontSize: 13, fontWeight: '700' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreBadge: {
    width: 34, height: 22, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  scoreNum: { fontSize: 11, fontWeight: '900' },
  barTrack: {
    flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3, overflow: 'visible', position: 'relative',
  },
  barFill: { height: 6, borderRadius: 3 },
  barDot: {
    position: 'absolute', top: -3, width: 12, height: 12, borderRadius: 6,
    marginLeft: -6, borderWidth: 2, borderColor: 'rgba(14,10,4,0.95)',
  },
});

// ── Lucky Numbers Styles ──
var ln = StyleSheet.create({
  card: {
    borderRadius: 22, overflow: 'hidden', marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.10)',
    padding: 18,
  },
  row: {
    flexDirection: 'row', justifyContent: 'center', gap: 16,
    marginTop: 4,
  },
  circle: {
    width: 62, height: 62, borderRadius: 31,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  num: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
});

// ── Daily Mantra Styles ──
var mn = StyleSheet.create({
  card: {
    borderRadius: 18, overflow: 'hidden', marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.12)',
    padding: 18,
  },
  starRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
  },
  headerLabel: {
    color: 'rgba(255,214,102,0.55)', fontSize: 11, fontWeight: '800',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  mantraText: {
    color: '#FFE8B0', fontSize: 15, fontWeight: '600', lineHeight: 24,
    fontStyle: 'italic', letterSpacing: 0.2,
  },
});

// ── Cosmic Shield Styles ──
var cs = StyleSheet.create({
  alertStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, overflow: 'hidden',
    paddingHorizontal: 14, paddingVertical: 11,
    marginBottom: 12,
    borderWidth: 1,
  },
  alertSafe: { backgroundColor: 'rgba(52,211,153,0.05)', borderColor: 'rgba(52,211,153,0.15)' },
  alertDanger: { backgroundColor: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.25)' },
  alertIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  alertIconSafe: { backgroundColor: 'rgba(52,211,153,0.10)', borderColor: 'rgba(52,211,153,0.20)' },
  alertIconDanger: { backgroundColor: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.25)' },
  alertTitle: { color: 'rgba(52,211,153,0.80)', fontSize: 13, fontWeight: '800' },
  alertTitleDanger: { color: '#FCA5A5' },
  alertDesc: { color: 'rgba(52,211,153,0.55)', fontSize: 11, fontWeight: '500', marginTop: 1 },
  alertDescDanger: { color: 'rgba(248,113,113,0.65)' },
  alertDot: { width: 8, height: 8, borderRadius: 4 },

  shieldRow: { flexDirection: 'row', gap: 10 },
  shieldCard: {
    flex: 1, borderRadius: 16, overflow: 'hidden', padding: 14,
    alignItems: 'center', borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.02)', gap: 6,
  },
  shieldEmoji: { fontSize: 22, marginBottom: 2 },
  shieldLabel: { color: 'rgba(255,214,102,0.45)', fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  shieldValue: { fontSize: 16, fontWeight: '900', textAlign: 'center' },
  shieldBarTrack: { width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  shieldBarFill: { height: 4, borderRadius: 2 },

  compassGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginTop: 4 },
  compassDir: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 8, backgroundColor: 'rgba(52,211,153,0.08)',
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.15)',
  },
  compassDirBad: { backgroundColor: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.25)' },
  compassDirText: { color: 'rgba(52,211,153,0.70)', fontSize: 9, fontWeight: '700' },
  compassDirTextBad: { color: '#F87171' },
  avoidPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.20)',
  },
  avoidPillText: { color: '#F87171', fontSize: 9, fontWeight: '700' },

  yogaWrap: { gap: 8 },
  yogaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, overflow: 'hidden', padding: 12,
    borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.02)',
  },
  yogaDot: { width: 8, height: 8, borderRadius: 4 },
  yogaName: { fontSize: 13, fontWeight: '800' },
  yogaDesc: { color: 'rgba(255,214,102,0.40)', fontSize: 11, lineHeight: 16, marginTop: 2 },
});
