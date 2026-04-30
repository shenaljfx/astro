/**
 * ReportLoadingScreen — Cinematic full-screen loading experience for report generation.
 * 
 * Features:
 * - Animated zodiac wheel slowly rotating in background
 * - Pulsing cosmic core with stage-aware icon
 * - Glowing progress ring that fills as sections complete
 * - Section names appearing with staggered fade-in as they finish
 * - Stage-aware messages with smooth transitions
 * - Particle shimmer effects
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence, withDelay, withSpring,
  interpolate, Easing, cancelAnimation, FadeIn, FadeInUp,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop, Path, G } from 'react-native-svg';
import { boxShadow } from '../utils/shadow';

var { width: SW } = Dimensions.get('window');

var ZODIAC_IMAGES = [
  require('../assets/zodiac/aries.png'),
  require('../assets/zodiac/taurus.png'),
  require('../assets/zodiac/gemini.png'),
  require('../assets/zodiac/cancer.png'),
  require('../assets/zodiac/leo.png'),
  require('../assets/zodiac/virgo.png'),
  require('../assets/zodiac/libra.png'),
  require('../assets/zodiac/scorpio.png'),
  require('../assets/zodiac/sagittarius.png'),
  require('../assets/zodiac/capricorn.png'),
  require('../assets/zodiac/aquarius.png'),
  require('../assets/zodiac/pisces.png'),
];

// Zodiac symbols for the rotating wheel
var ZODIAC_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
var ZODIAC_COLORS = [
  '#EF4444', '#22C55E', '#FBBF24', '#94A3B8', '#F97316', '#8B5CF6',
  '#EC4899', '#DC2626', '#6366F1', '#64748B', '#06B6D4', '#14B8A6',
];

// Section display names for completed section chips
var SECTION_LABELS_EN = {
  personality: 'Personality', yogaAnalysis: 'Yoga Analysis', lifePredictions: 'Life Predictions',
  career: 'Career', marriage: 'Marriage', marriedLife: 'Married Life', financial: 'Finance',
  children: 'Children', familyPortrait: 'Family', health: 'Health', physicalProfile: 'Physical',
  attractionProfile: 'Attraction', mentalHealth: 'Mental Health', foreignTravel: 'Travel',
  education: 'Education', luck: 'Luck', legal: 'Legal', spiritual: 'Spiritual',
  realEstate: 'Real Estate', transits: 'Transits', surpriseInsights: 'Insights',
  timeline25: 'Timeline', remedies: 'Remedies',
};
var SECTION_LABELS_SI = {
  personality: 'පෞද්ගලිකත්වය', yogaAnalysis: 'යෝග විශ්ලේෂණය', lifePredictions: 'ජීවිත අනාවැකි',
  career: 'වෘත්තිය', marriage: 'විවාහය', marriedLife: 'විවාහක ජීවිතය', financial: 'මුදල්',
  children: 'දරුවන්', familyPortrait: 'පවුල', health: 'සෞඛ්‍යය', physicalProfile: 'ශාරීරික',
  attractionProfile: 'ආකර්ෂණය', mentalHealth: 'මානසික', foreignTravel: 'විදේශ',
  education: 'අධ්‍යාපනය', luck: 'වාසනාව', legal: 'නීතිමය', spiritual: 'ආධ්‍යාත්මික',
  realEstate: 'නිවාස', transits: 'ග්‍රහ ගමන්', surpriseInsights: 'අනාවරණ',
  timeline25: 'කාල රේඛාව', remedies: 'පිළියම්',
};

var SECTION_ICONS = {
  personality: 'person', yogaAnalysis: 'flash', lifePredictions: 'telescope',
  career: 'briefcase', marriage: 'heart', marriedLife: 'home', financial: 'cash',
  children: 'happy', familyPortrait: 'people', health: 'fitness', physicalProfile: 'body',
  attractionProfile: 'flame', mentalHealth: 'bulb', foreignTravel: 'airplane',
  education: 'school', luck: 'diamond', legal: 'shield', spiritual: 'sparkles',
  realEstate: 'business', transits: 'planet', surpriseInsights: 'eye',
  timeline25: 'calendar', remedies: 'color-wand',
};

var SECTION_COLORS = {
  personality: '#3B82F6', yogaAnalysis: '#9333EA', lifePredictions: '#8B5CF6',
  career: '#F59E0B', marriage: '#EC4899', marriedLife: '#E11D48', financial: '#22C55E',
  children: '#10B981', familyPortrait: '#0EA5E9', health: '#EF4444', physicalProfile: '#D946EF',
  attractionProfile: '#F43F5E', mentalHealth: '#06B6D4', foreignTravel: '#6366F1',
  education: '#7C3AED', luck: '#FFB800', legal: '#64748B', spiritual: '#A855F7',
  realEstate: '#84CC16', transits: '#14B8A6', surpriseInsights: '#F97316',
  timeline25: '#6366F1', remedies: '#FFB800',
};

// Stage messages
function getStageMessage(stage, language) {
  var msgs = {
    starting: { en: 'Aligning the celestial spheres…', si: 'අහස් ගෝලයන් පෙළගස්වමින්…' },
    engine: { en: 'Computing planetary positions…', si: 'ග්‍රහ ස්ථාන ගණනය කරමින්…' },
    charts: { en: 'Drawing your birth charts…', si: 'උපත් සිතියම් අඳිමින්…' },
    coherence: { en: 'Weaving cosmic narratives…', si: 'කොස්මික් කතා බැඳෙමින්…' },
    sections: { en: 'Writing your destiny chapters…', si: 'ඔබේ ඉරණම ලියමින්…' },
    retrying: { en: 'Refining predictions…', si: 'අනාවැකි පිරිපහදු කරමින්…' },
    recovering: { en: 'Reconnecting to the cosmos…', si: 'විශ්වයට නැවත සම්බන්ධ වෙමින්…' },
  };
  var m = msgs[stage] || msgs.starting;
  return language === 'si' ? m.si : m.en;
}

// Inspirational quotes that rotate
var QUOTES_EN = [
  "Did you know? Your 10th House reveals your destined career and ultimate success.",
  "The 7th House holds deep secrets about your future life partner and marriage.",
  "Rahu and Ketu point to your karmic past and what you must master in this life.",
  "Jupiter represents sudden wealth, immense luck, and inner wisdom.",
  "Saturn's placement shows where you'll face life's greatest lessons and earn mastery.",
  "Analyzing your Navamsha (D-9) chart—the hidden blueprint of your destiny after age 30.",
  "Your Moon sign (Rashi) shapes your emotional world, instincts, and deep desires.",
  "Searching for powerful planetary 'Yogas' that manifest sudden wealth and fame.",
  "Each Nakshatra (birth star) is ruled by a deity. Decoding your star's unique cosmic power!"
];
var QUOTES_SI = [
  "ඔබ දන්නවාද? ඔබේ 10 වැනි භාවයෙන් ඔබේ වෘත්තිය සහ සමාජ තත්ත්වය තීරණය වේ.",
  "7 වැනි භාවය ඔබේ අනාගත සහකරු හෝ සහකාරිය පිළිබඳ රහස් හෙළි කරයි.",
  "පෙර භවයේ කර්ම සහ මේ භවයේ නිම කළ යුතු දෑ රාහු සහ කේතු පෙන්වා දෙයි.",
  "බ්‍රහස්පති ග්‍රහයා ධනය, වාසනාව සහ ප්‍රඥාව නියෝජනය කරයි. ඔබට හිමි වාසනාව සොයමින්...",
  "සෙනසුරු ග්‍රහයා අභියෝග හරහා ජීවිතය ජයගන්නා ආකාරය පෙන්වයි.",
  "වයස 30න් පසු ඔබේ සැබෑම දෛවය පෙන්වන නවාංශක සටහන විශ්ලේෂණය කරමින්...",
  "ඔබේ චන්ද්‍ර රාශිය ඔබේ හැඟීම් සහ අභ්‍යන්තර ආශාවන් හැඩගස්වයි.",
  "හදිසි ධනය සහ ජනප්‍රියත්වය ගෙන දෙන බලවත් ග්‍රහ ‘යෝග’ පිළිබඳව සොයමින්...",
  "සෑම නැකතකටම අධිපතියෙක් සිටී. ඔබේ නැකතේ සැඟවුණු බලය තේරුම් ගනිමින්!"
];

// ── Animated Zodiac Image on the wheel ──
function ZodiacImage({ source, color, index, total, radius, rotation, skipAnim }) {
  var baseAngle = (2 * Math.PI / total) * index;

  var style = useAnimatedStyle(function() {
    var angle = baseAngle + rotation.value;
    var x = Math.cos(angle) * radius;
    var y = Math.sin(angle) * radius;
    // Each glyph breathes individually — more alive, less mechanical.
    var breathe = interpolate(Math.sin(rotation.value * 1.4 + index * 0.7), [-1, 1], [0.85, 1.18]);
    var bright  = interpolate(Math.sin(rotation.value * 1.4 + index * 0.7), [-1, 1], [0.65, 1]);
    return {
      transform: [{ translateX: x }, { translateY: y }, { scale: breathe }],
      opacity: bright,
    };
  });

  return (
    <Animated.View style={[st.glyphWrap, style]}>
      {/* Soft colored halo behind the glyph */}
      <View style={[st.glyphHalo, { backgroundColor: color + '22', shadowColor: color }]} />
      <Image
        style={{
          width: 38,
          height: 38,
          tintColor: undefined,
        }}
        source={source}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

// ── Twinkling background star ──
function TwinkleStar({ x, y, size, delay, skipAnim }) {
  var op = useSharedValue(0.1);
  useEffect(function() {
    if (skipAnim) return;
    op.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.9, { duration: 900 + (delay % 700), easing: Easing.inOut(Easing.sin) }),
        withTiming(0.1, { duration: 900 + (delay % 500), easing: Easing.inOut(Easing.sin) }),
      ), -1, true,
    ));
    return function() { cancelAnimation(op); };
  }, [skipAnim]);
  var style = useAnimatedStyle(function() { return { opacity: op.value }; });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#FFFFFF',
          shadowColor: '#FBBF24',
          shadowOpacity: 0.9,
          shadowRadius: size * 1.8,
          shadowOffset: { width: 0, height: 0 },
        },
        style,
      ]}
    />
  );
}

// ── Radiating ray-burst behind the core logo ──
function RayBurst({ size, rotation }) {
  var rayCount = 14;
  var inner = size * 0.18;
  var outer = size * 0.46;
  var rays = [];
  for (var i = 0; i < rayCount; i++) {
    var a = (Math.PI * 2 / rayCount) * i;
    var x1 = size / 2 + Math.cos(a) * inner;
    var y1 = size / 2 + Math.sin(a) * inner;
    var x2 = size / 2 + Math.cos(a) * outer;
    var y2 = size / 2 + Math.sin(a) * outer;
    rays.push('M' + x1 + ',' + y1 + ' L' + x2 + ',' + y2);
  }
  var style = useAnimatedStyle(function() {
    return { transform: [{ rotate: (rotation.value) + 'rad' }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="rayfade" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FBBF24" stopOpacity="0.0" />
            <Stop offset="55%" stopColor="#FBBF24" stopOpacity="0.55" />
            <Stop offset="100%" stopColor="#9333EA" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <G>
          {rays.map(function(d, i) {
            return (
              <Path
                key={'ray' + i}
                d={d}
                stroke="url(#rayfade)"
                strokeWidth={i % 2 === 0 ? 2 : 1}
                strokeLinecap="round"
                opacity={i % 3 === 0 ? 0.9 : 0.55}
              />
            );
          })}
        </G>
      </Svg>
    </Animated.View>
  );
}

// ── Orbiting Particle ──
function OrbitParticle({ index, count, radius, duration, color, particleSize, skipAnim }) {
  var angle = useSharedValue(((2 * Math.PI) / count) * index);

  useEffect(function() {
    if (skipAnim) { cancelAnimation(angle); return; }
    angle.value = withRepeat(
      withTiming(angle.value + 2 * Math.PI, { duration: duration, easing: Easing.linear }),
      -1
    );
    return function() { cancelAnimation(angle); };
  }, [skipAnim]);

  var dotStyle = useAnimatedStyle(function() {
    var x = Math.cos(angle.value) * radius;
    var y = Math.sin(angle.value) * radius;
    var sc = interpolate(Math.sin(angle.value), [-1, 1], [0.4, 1.3]);
    return {
      transform: [{ translateX: x }, { translateY: y }, { scale: sc }],
      opacity: interpolate(Math.sin(angle.value), [-1, 1], [0.2, 0.9]),
    };
  });

  return (
    <Animated.View style={[{
      position: 'absolute', width: particleSize, height: particleSize,
      borderRadius: particleSize / 2, backgroundColor: color,
    }, dotStyle]} />
  );
}

// ── Progress Ring (SVG arc) ──
function ProgressRing({ progress, size, strokeWidth, color }) {
  var radius = (size - strokeWidth) / 2;
  var circumference = 2 * Math.PI * radius;
  var offset = circumference * (1 - progress);

  return (
    <Svg width={size} height={size} style={{ position: 'absolute' }}>
      {/* Track */}
      <Circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} fill="none"
      />
      {/* Progress */}
      <Circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke={color} strokeWidth={strokeWidth} fill="none"
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        rotation={-90}
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

// ── Completed Section Chip ──
function SectionChip({ sectionKey, language, delay }) {
  var labels = language === 'si' ? SECTION_LABELS_SI : SECTION_LABELS_EN;
  var label = labels[sectionKey] || sectionKey;
  var icon = SECTION_ICONS[sectionKey] || 'checkmark';
  var color = SECTION_COLORS[sectionKey] || '#FBBF24';

  return (
    <Animated.View entering={FadeIn.duration(300).delay(delay)} style={[st.chip, { borderColor: color + '40' }]}>
      <View style={[st.chipDot, { backgroundColor: color }]} />
      <Ionicons name={icon + '-outline'} size={11} color={color} />
      <Text style={[st.chipLabel, { color: 'rgba(255,255,255,0.75)' }]}>{label}</Text>
      <Ionicons name="checkmark" size={10} color="#34D399" style={{ marginLeft: 2 }} />
    </Animated.View>
  );
}

// ── Main Component ──
export default function ReportLoadingScreen({ progress, userName, language, reduced, isLowEnd }) {
  var stage = progress ? (progress.stage || 'starting') : 'starting';
  var sectionsDone = progress ? (progress.sectionsDone || 0) : 0;
  var sectionsTotal = progress ? (progress.sectionsTotal || 19) : 19;
  var currentSection = progress ? progress.currentSection : null;
  var completedSections = progress ? (progress.completedSections || []) : [];

  var progressFraction = sectionsTotal > 0 ? sectionsDone / sectionsTotal : 0;

  // ── Animations ──
  var wheelRotation = useSharedValue(0);
  var coreScale = useSharedValue(0.85);
  var corePulseGlow = useSharedValue(0);
  var shimmer = useSharedValue(0);
  var quoteIndex = useSharedValue(0);

  useEffect(function() {
    if (reduced || isLowEnd) return;
    wheelRotation.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 40000, easing: Easing.linear }), -1
    );
    coreScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.85, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      ), -1, true
    );
    corePulseGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ), -1, true
    );
    shimmer.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.linear }), -1
    );
    return function() {
      cancelAnimation(wheelRotation); cancelAnimation(coreScale);
      cancelAnimation(corePulseGlow); cancelAnimation(shimmer);
    };
  }, [reduced, isLowEnd]);

  var coreStyle = useAnimatedStyle(function() {
    return { transform: [{ scale: coreScale.value }] };
  });

  var outerGlowStyle = useAnimatedStyle(function() {
    var g = interpolate(corePulseGlow.value, [0, 1], [0.15, 0.5]);
    var s = interpolate(corePulseGlow.value, [0, 1], [1, 1.6]);
    return { opacity: g, transform: [{ scale: s }] };
  });

  var stageMsg = getStageMessage(stage, language);

  // Pick a quote based on section progress
  var quotes = language === 'si' ? QUOTES_SI : QUOTES_EN;
  var quoteText = quotes[sectionsDone % quotes.length];

  // Counter-rotating inner ring rotation (opposite direction)
  var innerRingStyle = useAnimatedStyle(function() {
    return { transform: [{ rotate: (-wheelRotation.value * 1.6) + 'rad' }] };
  });

  // Pre-computed twinkling starfield positions (stable across renders)
  var stars = React.useMemo(function() {
    var s = [];
    for (var i = 0; i < 28; i++) {
      // Pseudo-random but stable
      var seed = i * 37;
      var x = ((seed * 13) % 100) / 100;
      var y = ((seed * 29) % 100) / 100;
      var sz = 1 + ((seed * 7) % 3);
      var dl = (seed * 41) % 1800;
      s.push({ x: x * 280, y: y * 280, size: sz, delay: dl });
    }
    return s;
  }, []);

  // Stage icon
  var stageIcon = 'sparkles';
  if (stage === 'engine') stageIcon = 'planet';
  if (stage === 'charts') stageIcon = 'grid';
  if (stage === 'sections') stageIcon = 'document-text';
  if (stage === 'coherence') stageIcon = 'layers';
  if (stage === 'retrying') stageIcon = 'refresh';
  if (stage === 'recovering') stageIcon = 'wifi';

  // Progress percentage
  var pctText = Math.round(progressFraction * 100) + '%';
  var ringSize = 220;
  var wheelRadius = ringSize * 0.66;
  var innerWheelRadius = ringSize * 0.38;

  // Only show last 6 completed sections as chips (to avoid overflow)
  var visibleChips = completedSections.slice(-6);

  return (
    <View style={st.container}>
      {/* ── Central orb area ── */}
      <View style={st.orbArea}>

        {/* Twinkling starfield (background) */}
        {!isLowEnd && !reduced && stars.map(function(s, i) {
          return (
            <TwinkleStar
              key={'tw' + i}
              x={s.x}
              y={s.y}
              size={s.size}
              delay={s.delay}
              skipAnim={reduced}
            />
          );
        })}

        {/* Counter-rotating inner ring of small star sparks */}
        {!isLowEnd && (
          <Animated.View pointerEvents="none" style={[st.innerRingWrap, innerRingStyle]}>
            {ZODIAC_COLORS.map(function(c, i) {
              var ang = (2 * Math.PI / 12) * i;
              var x = Math.cos(ang) * innerWheelRadius;
              var y = Math.sin(ang) * innerWheelRadius;
              return (
                <View
                  key={'spark' + i}
                  style={[
                    st.spark,
                    {
                      backgroundColor: c,
                      transform: [{ translateX: x }, { translateY: y }],
                      shadowColor: c,
                    },
                  ]}
                />
              );
            })}
          </Animated.View>
        )}

        {/* Zodiac wheel — outer 12 signs with breathing colored halos */}
        {!isLowEnd && ZODIAC_IMAGES.map(function(imgSrc, i) {
          return (
            <ZodiacImage
              key={"zimage_"+i}
              source={imgSrc}
              color={ZODIAC_COLORS[i]}
              index={i}
              total={12}
              radius={wheelRadius}
              rotation={wheelRotation}
              skipAnim={reduced}
            />
          );
        })}

        {/* Orbiting particles (inner) */}
        {!isLowEnd && ['#C084FC', '#FBBF24', '#34D399', '#60A5FA', '#F472B6', '#FF8C00'].map(function(c, i) {
          return (
            <OrbitParticle
              key={'p' + i}
              index={i}
              count={6}
              radius={ringSize * 0.35}
              duration={3200 + i * 400}
              color={c}
              particleSize={4}
              skipAnim={reduced}
            />
          );
        })}

        {/* Progress ring */}
        <ProgressRing
          progress={progressFraction}
          size={ringSize}
          strokeWidth={3}
          color="#C084FC"
        />

        {/* Outer glow pulse */}
        <Animated.View style={[st.outerGlow, outerGlowStyle]} />

        {/* Radiating ray-burst behind the core */}
        {!isLowEnd && !reduced && (
          <RayBurst size={ringSize * 0.95} rotation={wheelRotation} />
        )}

        {/* Golden halo wreath around the core */}
        <Animated.View pointerEvents="none" style={[st.goldHalo, outerGlowStyle]} />

        {/* Core orb — larger, brighter, with logo at center */}
        <Animated.View style={[st.coreOrb, coreStyle]}>
          <LinearGradient
            colors={['#FBBF24', '#C084FC', '#6D28D9']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.1, y: 0.1 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={st.coreInnerRing} />
          <Image
            source={require('../assets/logo.png')}
            style={{ width: 58, height: 58, borderRadius: 29 }}
            resizeMode="cover"
          />
        </Animated.View>

        {/* Percentage text */}
        <View style={st.pctWrap}>
          <Text style={st.pctText}>{pctText}</Text>
        </View>
      </View>

      {/* ── Stage message ── */}
      <Animated.View entering={FadeIn.duration(400)} key={stage} style={st.stageRow}>
        <View style={st.stageDot} />
        <Text style={st.stageText}>{stageMsg}</Text>
      </Animated.View>

      {/* ── Section counter ── */}
      {sectionsDone > 0 && stage === 'sections' && (
        <Animated.View entering={FadeInUp.duration(300)} style={st.counterRow}>
          <Text style={st.counterBig}>{sectionsDone}</Text>
          <Text style={st.counterSlash}>/</Text>
          <Text style={st.counterTotal}>{sectionsTotal}</Text>
          <Text style={st.counterLabel}>
            {language === 'si' ? ' පරිච්ඡේද සූදානම්' : ' chapters written'}
          </Text>
        </Animated.View>
      )}

      {/* ── Currently writing indicator ── */}
      {currentSection && stage === 'sections' && (
        <Animated.View entering={FadeIn.duration(200)} key={currentSection} style={st.writingRow}>
          <View style={st.writingPulse} />
          <Text style={st.writingText}>
            {language === 'si' ? 'දැන් ලියමින්: ' : 'Now writing: '}
            <Text style={st.writingSection}>
              {(language === 'si' ? SECTION_LABELS_SI : SECTION_LABELS_EN)[currentSection] || currentSection}
            </Text>
          </Text>
        </Animated.View>
      )}

      {/* ── Completed section chips ── */}
      {visibleChips.length > 0 && (
        <View style={st.chipGrid}>
          {visibleChips.map(function(sec, i) {
            return <SectionChip key={sec} sectionKey={sec} language={language} delay={i * 80} />;
          })}
        </View>
      )}

      {/* ── Quote ── */}
      <Animated.Text
        entering={FadeIn.duration(600)}
        key={quoteText}
        style={st.quoteText}
      >
        {quoteText}
      </Animated.Text>

      {/* ── Keep screen open hint ── */}
      <View style={st.hintRow}>
        <Ionicons name="phone-portrait-outline" size={13} color="rgba(255,255,255,0.3)" />
        <Text style={st.hintText}>
          {language === 'si'
            ? 'Screen එක close කරන්න එපා'
            : 'Please keep this screen open'}
        </Text>
      </View>
    </View>
  );
}

// ── Styles ──
var st = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  // Orb area
  orbArea: {
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },

  outerGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(147, 51, 234, 0.18)',
  },

  goldHalo: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.45)',
    shadowColor: '#FBBF24',
    shadowOpacity: 0.9,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },

  coreOrb: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...boxShadow('#FBBF24', { width: 0, height: 0 }, 0.85, 38),
    elevation: 14,
  },

  coreInnerRing: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },

  innerRingWrap: {
    position: 'absolute',
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },

  spark: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    shadowOpacity: 0.95,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },

  glyphHalo: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    shadowOpacity: 0.85,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },

  pctWrap: {
    position: 'absolute',
    bottom: -8,
  },
  pctText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#C084FC',
    letterSpacing: 1,
    textAlign: 'center',
  },

  // Zodiac glyphs
  glyphWrap: {
    position: 'absolute',
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphText: {
    fontSize: 18,
    fontWeight: '600',
  },

  // Stage message
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  stageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C084FC',
  },
  stageText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },

  // Counter
  counterRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  counterBig: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FBBF24',
  },
  counterSlash: {
    fontSize: 20,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.3)',
    marginHorizontal: 2,
  },
  counterTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
  },
  counterLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    marginLeft: 4,
  },

  // Currently writing
  writingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.15)',
  },
  writingPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  writingText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  writingSection: {
    color: '#C084FC',
    fontWeight: '700',
  },

  // Section chips
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 16,
    maxWidth: SW * 0.9,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
  },
  chipDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Quote
  quoteText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 18,
  },

  // Hint
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    position: 'absolute',
    bottom: 40,
  },
  hintText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '500',
  },
});
