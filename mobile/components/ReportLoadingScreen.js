/**
 * ReportLoadingScreen — premium astrolabe loading experience for report generation.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence, withDelay,
  interpolate, Easing, cancelAnimation, FadeIn, FadeInUp,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Path, G } from 'react-native-svg';
import { Colors } from '../constants/theme';
import { boxShadow } from '../utils/shadow';
import { APP_LOGO_IMAGE } from '../assets/logo-inline';

var { width: SW, height: SH } = Dimensions.get('window');

var STAGE_COPY = {
  en: {
    starting: {
      eyebrow: 'PREMIUM BIRTH REPORT',
      title: 'Reading Your Birth Moment',
      sub: 'Preparing a sidereal chart from your exact time, place, and sky movement.',
      action: 'Opening the observatory',
    },
    engine: {
      eyebrow: 'CELESTIAL ENGINE',
      title: 'Calculating The Planetary Field',
      sub: 'Resolving the graha positions, nakshatra details, lagna, and house strengths.',
      action: 'Mapping planetary positions',
    },
    charts: {
      eyebrow: 'CHART ATLAS',
      title: 'Drawing Your Life Map',
      sub: 'Building the rashi and divisional chart foundation for the full reading.',
      action: 'Rendering chart layers',
    },
    coherence: {
      eyebrow: 'SIGNATURE PATTERNS',
      title: 'Finding Your Strength Patterns',
      sub: 'Cross-checking the chart so the reading feels clear, grounded, and personal.',
      action: 'Refining interpretation logic',
    },
    sections: {
      eyebrow: 'PRIVATE MANUSCRIPT',
      title: 'Writing Your Personal Report',
      sub: 'Composing each chapter across personality, love, career, timing, family, and remedies.',
      action: 'Writing chapter by chapter',
    },
    retrying: {
      eyebrow: 'FINAL REFINEMENT',
      title: 'Polishing The Reading',
      sub: 'Taking an extra moment to make the guidance sharper and more useful.',
      action: 'Regenerating the current chapter',
    },
    recovering: {
      eyebrow: 'SAVED REPORT',
      title: 'Recovering Your Reading',
      sub: 'Checking the secure report archive before creating anything new.',
      action: 'Looking for your saved report',
    },
    complete: {
      eyebrow: 'REPORT READY',
      title: 'Your Cosmic Blueprint Is Ready',
      sub: 'The full report is prepared and ready to reveal.',
      action: 'Opening your report',
    },
    failed: {
      eyebrow: 'PAUSED',
      title: 'The Reading Paused',
      sub: 'Your payment is protected. You can retry without being charged again.',
      action: 'Waiting for retry',
    },
  },
  si: {
    starting: {
      eyebrow: 'ප්‍රීමියම් ජන්ම වාර්තාව',
      title: 'ඔබේ උපන් මොහොත කියවමින්',
      sub: 'නිවැරදි වේලාව, ස්ථානය, සහ අහසේ ගමන අනුව ජන්ම සටහන සකසමින්.',
      action: 'ගණනය කිරීම ආරම්භ කරමින්',
    },
    engine: {
      eyebrow: 'ග්‍රහ ගණනය',
      title: 'ග්‍රහ පිහිටීම් ගණනය කරමින්',
      sub: 'ග්‍රහ චාරය, නැකත, ලග්නය, සහ භාව බලයන් නිවැරදි කරමින්.',
      action: 'ග්‍රහ පිහිටීම් සිතියම්ගත කරමින්',
    },
    charts: {
      eyebrow: 'කේන්දර සිතියම',
      title: 'ඔබේ ජීවන සිතියම ඇඳමින්',
      sub: 'රාශි සහ අංශ සටහන් මත සම්පූර්ණ කියවීමේ පදනම සකසමින්.',
      action: 'කේන්දර ස්ථර සකසමින්',
    },
    coherence: {
      eyebrow: 'ශක්ති රටා',
      title: 'ඔබේ ශක්ති රටා සොයමින්',
      sub: 'කියවීම පැහැදිලි, විශ්වාසදායක, සහ පුද්ගලික වීම සඳහා නැවත පරීක්ෂා කරමින්.',
      action: 'අර්ථකථනය තහවුරු කරමින්',
    },
    sections: {
      eyebrow: 'පුද්ගලික වාර්තාව',
      title: 'ඔබේ පුද්ගලික වාර්තාව ලියමින්',
      sub: 'පෞරුෂය, ආදරය, රැකියාව, කාලය, පවුල, සහ පිළියම් ගැන කොටස් සකසමින්.',
      action: 'කොටසෙන් කොටස ලියමින්',
    },
    retrying: {
      eyebrow: 'අවසාන සංශෝධනය',
      title: 'කියවීම තවත් පැහැදිලි කරමින්',
      sub: 'උපදෙස් වඩාත් නිවැරදි සහ ප්‍රයෝජනවත් කිරීමට සුළු මොහොතක් ගනිමින්.',
      action: 'වත්මන් කොටස නැවත සකසමින්',
    },
    recovering: {
      eyebrow: 'සුරැකි වාර්තාව',
      title: 'ඔබේ කියවීම නැවත ලබාගනිමින්',
      sub: 'අලුත් දෙයක් සෑදීමට පෙර සුරක්ෂිත වාර්තා ගබඩාව පරීක්ෂා කරමින්.',
      action: 'සුරැකි වාර්තාව සොයමින්',
    },
    complete: {
      eyebrow: 'වාර්තාව සූදානම්',
      title: 'ඔබේ කේන්දර වාර්තාව සූදානම්',
      sub: 'සම්පූර්ණ වාර්තාව දැන් විවෘත කිරීමට සූදානම්.',
      action: 'වාර්තාව විවෘත කරමින්',
    },
    failed: {
      eyebrow: 'නැවතුණා',
      title: 'කියවීම තාවකාලිකව නැවතුණා',
      sub: 'ඔබේ ගෙවීම සුරක්ෂිතයි. නැවත ගාස්තු අය නොවී retry කළ හැක.',
      action: 'නැවත උත්සාහ කිරීමට සූදානම්',
    },
  },
};

var SECTION_LABELS_EN = {
  personality: 'Personality', yogaAnalysis: 'Strength Analysis', lifePredictions: 'Life Predictions',
  career: 'Career', marriage: 'Marriage', marriedLife: 'Married Life', financial: 'Finance',
  children: 'Children', familyPortrait: 'Family', health: 'Health', physicalProfile: 'Physical Profile',
  attractionProfile: 'Attraction', mentalHealth: 'Mental Health', foreignTravel: 'Foreign Travel',
  education: 'Education', luck: 'Luck & Fortune', legal: 'Legal Matters', spiritual: 'Spiritual Path',
  realEstate: 'Real Estate', transits: 'Current Transits', surpriseInsights: 'Surprise Insights',
  timeline25: 'Year Timeline', remedies: 'Remedies', checking_saved_report: 'Saved Report',
};

var SECTION_LABELS_SI = {
  personality: 'පෞද්ගලිකත්වය', yogaAnalysis: 'ශක්ති විශ්ලේෂණය', lifePredictions: 'ජීවිත අනාවැකි',
  career: 'වෘත්තිය', marriage: 'විවාහය', marriedLife: 'විවාහ ජීවිතය', financial: 'මූල්‍ය',
  children: 'දරුවන්', familyPortrait: 'පවුල', health: 'සෞඛ්‍ය', physicalProfile: 'ශාරීරික ස්වරූපය',
  attractionProfile: 'ආකර්ෂණය', mentalHealth: 'මානසික සෞඛ්‍ය', foreignTravel: 'විදේශ ගමන්',
  education: 'අධ්‍යාපනය', luck: 'වාසනාව', legal: 'නීතිමය', spiritual: 'අධ්‍යාත්මික',
  realEstate: 'ඉඩම් දේපළ', transits: 'වත්මන් ගෝචර', surpriseInsights: 'විශේෂ අවබෝධ',
  timeline25: 'වාර්ෂික කාලරේඛාව', remedies: 'පිළියම්', checking_saved_report: 'සුරැකි වාර්තාව',
};

var SECTION_ICONS = {
  personality: 'person', yogaAnalysis: 'flash', lifePredictions: 'telescope',
  career: 'briefcase', marriage: 'heart', marriedLife: 'home', financial: 'cash',
  children: 'happy', familyPortrait: 'people', health: 'fitness', physicalProfile: 'body',
  attractionProfile: 'flame', mentalHealth: 'bulb', foreignTravel: 'airplane',
  education: 'school', luck: 'diamond', legal: 'shield', spiritual: 'sparkles',
  realEstate: 'business', transits: 'planet', surpriseInsights: 'eye',
  timeline25: 'calendar', remedies: 'color-wand', checking_saved_report: 'archive',
};

var SECTION_COLORS = {
  personality: '#8AB4FF', yogaAnalysis: '#BFA4FF', lifePredictions: '#C4B5FD',
  career: '#E6B45A', marriage: '#F5A3C7', marriedLife: '#F08A9B', financial: '#8BE0B4',
  children: '#91D8C8', familyPortrait: '#8CD8FF', health: '#FCA5A5', physicalProfile: '#E9B7FF',
  attractionProfile: '#FF9AAE', mentalHealth: '#85E0F0', foreignTravel: '#A7B7FF',
  education: '#C6A7FF', luck: '#D6B56D', legal: '#B6C0D4', spiritual: '#D3B7FF',
  realEstate: '#B7D978', transits: '#8DE2CE', surpriseInsights: '#FFB071',
  timeline25: '#B3B7FF', remedies: '#D6B56D', checking_saved_report: '#F4E4BC',
};

var ZODIAC_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

var STAR_FIELD = [
  { x: 8, y: 12, size: 2, delay: 0 }, { x: 16, y: 68, size: 1.5, delay: 500 },
  { x: 25, y: 18, size: 2.5, delay: 900 }, { x: 32, y: 84, size: 1.4, delay: 1200 },
  { x: 42, y: 9, size: 1.8, delay: 700 }, { x: 48, y: 73, size: 2.2, delay: 1500 },
  { x: 59, y: 20, size: 1.4, delay: 300 }, { x: 66, y: 88, size: 2.5, delay: 1100 },
  { x: 73, y: 10, size: 1.6, delay: 1700 }, { x: 82, y: 62, size: 2.1, delay: 400 },
  { x: 90, y: 24, size: 1.7, delay: 1300 }, { x: 94, y: 78, size: 2.4, delay: 800 },
];

var STAGE_ORDER = ['engine', 'charts', 'coherence', 'sections'];

function getStageDetails(stage, language) {
  var lang = language === 'si' ? 'si' : 'en';
  var stageMap = STAGE_COPY[lang] || STAGE_COPY.en;
  return stageMap[stage] || stageMap.starting;
}

function getSectionLabel(sectionKey, language) {
  var labels = language === 'si' ? SECTION_LABELS_SI : SECTION_LABELS_EN;
  var label = labels[sectionKey];
  if (label) return label;
  if (!sectionKey) return '';
  return String(sectionKey).replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
}

function getProgressPercent(progress) {
  var stage = progress ? (progress.stage || 'starting') : 'starting';
  var sectionsDone = progress ? (progress.sectionsDone || 0) : 0;
  var sectionsTotal = progress ? (progress.sectionsTotal || 19) : 19;
  var sectionRatio = sectionsDone / Math.max(sectionsTotal, 1);

  if (typeof (progress && progress.percent) === 'number') return progress.percent;
  if (stage === 'starting') return 3;
  if (stage === 'engine') return 12;
  if (stage === 'charts') return 24;
  if (stage === 'coherence') return 34;
  if (stage === 'sections') return 38 + sectionRatio * 52;
  if (stage === 'retrying') return 90 + sectionRatio * 8;
  if (stage === 'recovering') return 92;
  if (stage === 'complete') return 100;
  if (stage === 'failed') return Math.max(8, 38 + sectionRatio * 52);
  return 3;
}

function getStageIndex(stage) {
  if (stage === 'starting') return -1;
  if (stage === 'retrying' || stage === 'recovering' || stage === 'complete') return STAGE_ORDER.length;
  var idx = STAGE_ORDER.indexOf(stage);
  return idx >= 0 ? idx : -1;
}

function PremiumStar({ star, skipAnim }) {
  var twinkle = useSharedValue(0.2);

  useEffect(function() {
    if (skipAnim) return;
    twinkle.value = withDelay(star.delay, withRepeat(
      withSequence(
        withTiming(1, { duration: 1200 + star.delay % 600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.18, { duration: 1600 + star.delay % 500, easing: Easing.inOut(Easing.sin) })
      ), -1, true
    ));
    return function() { cancelAnimation(twinkle); };
  }, [skipAnim]);

  var style = useAnimatedStyle(function() {
    return {
      opacity: interpolate(twinkle.value, [0, 1], [0.16, 0.82]),
      transform: [{ scale: interpolate(twinkle.value, [0, 1], [0.6, 1.35]) }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        st.star,
        {
          left: star.x + '%', top: star.y + '%',
          width: star.size, height: star.size, borderRadius: star.size / 2,
        },
        style,
      ]}
    />
  );
}

function ZodiacMark({ glyph, index, size, rotation }) {
  var baseAngle = -Math.PI / 2 + (Math.PI * 2 / ZODIAC_GLYPHS.length) * index;
  var radius = size * 0.405;
  var markSize = size < 250 ? 24 : 28;
  var style = useAnimatedStyle(function() {
    var angle = baseAngle + rotation.value * 0.16;
    return {
      transform: [
        { translateX: Math.cos(angle) * radius },
        { translateY: Math.sin(angle) * radius },
        { scale: interpolate(Math.sin(rotation.value + index), [-1, 1], [0.92, 1.08]) },
      ],
      opacity: interpolate(Math.sin(rotation.value + index * 0.7), [-1, 1], [0.48, 0.92]),
    };
  });

  return (
    <Animated.View style={[st.zodiacMark, { width: markSize, height: markSize, borderRadius: markSize / 2, left: size / 2 - markSize / 2, top: size / 2 - markSize / 2 }, style]}>
      <Text style={[st.zodiacText, { fontSize: size < 250 ? 12 : 13 }]}>{glyph}</Text>
    </Animated.View>
  );
}

function OrbitGem({ index, count, radius, color, size, orbit }) {
  var baseAngle = (Math.PI * 2 / count) * index;
  var style = useAnimatedStyle(function() {
    var angle = baseAngle + orbit.value;
    return {
      transform: [
        { translateX: Math.cos(angle) * radius },
        { translateY: Math.sin(angle) * radius },
        { scale: interpolate(Math.sin(angle), [-1, 1], [0.72, 1.18]) },
      ],
      opacity: interpolate(Math.sin(angle), [-1, 1], [0.38, 0.95]),
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        st.orbitGem,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color, shadowColor: color },
        style,
      ]}
    />
  );
}

function AstrolabeDial({ size, progressFraction, rotation }) {
  var strokeWidth = size < 250 ? 4 : 5;
  var radius = (size - strokeWidth * 4) / 2;
  var circumference = 2 * Math.PI * radius;
  var offset = circumference * (1 - progressFraction);
  var ticks = [];
  for (var i = 0; i < 60; i++) {
    var angle = -Math.PI / 2 + (Math.PI * 2 / 60) * i;
    var inner = i % 5 === 0 ? size * 0.438 : size * 0.458;
    var outer = size * 0.478;
    var x1 = size / 2 + Math.cos(angle) * inner;
    var y1 = size / 2 + Math.sin(angle) * inner;
    var x2 = size / 2 + Math.cos(angle) * outer;
    var y2 = size / 2 + Math.sin(angle) * outer;
    ticks.push('M' + x1 + ',' + y1 + ' L' + x2 + ',' + y2);
  }

  var tickStyle = useAnimatedStyle(function() {
    return { transform: [{ rotate: (rotation.value * 0.22) + 'rad' }] };
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, tickStyle]}>
        <Svg width={size} height={size}>
          <G>
            {ticks.map(function(d, i) {
              return (
                <Path
                  key={'tick' + i}
                  d={d}
                  stroke={i % 5 === 0 ? 'rgba(244,228,188,0.58)' : 'rgba(214,181,109,0.22)'}
                  strokeWidth={i % 5 === 0 ? 1.25 : 0.65}
                  strokeLinecap="round"
                />
              );
            })}
          </G>
        </Svg>
      </Animated.View>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLinearGradient id="reportProgressGold" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#F4E4BC" stopOpacity="1" />
            <Stop offset="48%" stopColor="#D6B56D" stopOpacity="1" />
            <Stop offset="100%" stopColor="#A987FF" stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="rgba(244,228,188,0.10)" strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="url(#reportProgressGold)" strokeWidth={strokeWidth}
          fill="none" strokeLinecap="round"
          strokeDasharray={circumference + ' ' + circumference}
          strokeDashoffset={offset}
          rotation={-90}
          origin={size / 2 + ', ' + size / 2}
        />
        <Circle
          cx={size / 2} cy={size / 2} r={size * 0.315}
          stroke="rgba(214,181,109,0.28)" strokeWidth="1"
          strokeDasharray="3 8" fill="none"
        />
        <Circle
          cx={size / 2} cy={size / 2} r={size * 0.208}
          stroke="rgba(191,164,255,0.20)" strokeWidth="1"
          fill="none"
        />
      </Svg>
    </View>
  );
}

function SectionChip({ sectionKey, language, delay }) {
  var label = getSectionLabel(sectionKey, language);
  var icon = SECTION_ICONS[sectionKey] || 'checkmark-circle';
  var color = SECTION_COLORS[sectionKey] || Colors.luxuryGold;

  return (
    <Animated.View entering={FadeIn.duration(260).delay(delay)} style={[st.chip, { borderColor: color + '3D' }]}>
      <Ionicons name={icon + '-outline'} size={11} color={color} />
      <Text numberOfLines={1} style={st.chipLabel}>{label}</Text>
    </Animated.View>
  );
}

function StageMarker({ done, active }) {
  return (
    <View style={st.stageMarkerWrap}>
      <View style={[st.stageLine, done && st.stageLineDone]} />
      <View style={[st.stageMarker, done && st.stageMarkerDone, active && st.stageMarkerActive]}>
        {done ? <Ionicons name="checkmark" size={10} color="#09070D" /> : null}
      </View>
    </View>
  );
}

export default function ReportLoadingScreen({ progress, userName, language, reduced, isLowEnd }) {
  var stage = progress ? (progress.stage || 'starting') : 'starting';
  var sectionsDone = progress ? (progress.sectionsDone || 0) : 0;
  var sectionsTotal = progress ? (progress.sectionsTotal || 19) : 19;
  var currentSection = progress ? progress.currentSection : null;
  var completedSections = progress ? (progress.completedSections || []) : [];
  var elapsedMs = progress ? (progress.elapsedMs || 0) : 0;

  var tiny = SH < 620 || SW < 340;
  var compact = tiny || SH < 720 || SW < 360;
  var dialSize = tiny ? Math.min(204, SW - 92) : compact ? Math.min(236, SW - 70) : Math.min(286, SW - 64);
  var panelWidth = Math.min(SW - 32, 430);
  var stageDetails = getStageDetails(stage, language);
  var currentSectionLabel = currentSection ? getSectionLabel(currentSection, language) : '';
  var rawProgressPct = Math.min(100, Math.max(0, getProgressPercent(progress)));
  var progressHighRef = useRef(0);
  if (stage === 'starting' && sectionsDone === 0 && rawProgressPct <= 3) progressHighRef.current = rawProgressPct;
  if (rawProgressPct > progressHighRef.current || stage === 'complete') progressHighRef.current = rawProgressPct;
  var progressPct = Math.min(100, Math.max(rawProgressPct, progressHighRef.current));
  var progressFraction = progressPct / 100;
  var visibleChips = completedSections.slice(-4);
  var elapsedSec = Math.floor(elapsedMs / 1000);
  var activeStageIndex = getStageIndex(stage);
  var reducedMotion = !!reduced || !!isLowEnd;

  var rotation = useSharedValue(0);
  var orbit = useSharedValue(0);
  var breathe = useSharedValue(0);
  var shimmer = useSharedValue(0);

  useEffect(function() {
    if (reducedMotion) return;
    rotation.value = withRepeat(withTiming(2 * Math.PI, { duration: 36000, easing: Easing.linear }), -1, false);
    orbit.value = withRepeat(withTiming(2 * Math.PI, { duration: 9200, easing: Easing.linear }), -1, false);
    breathe.value = withRepeat(withSequence(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) })
    ), -1, true);
    shimmer.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.linear }), -1, false);
    return function() {
      cancelAnimation(rotation);
      cancelAnimation(orbit);
      cancelAnimation(breathe);
      cancelAnimation(shimmer);
    };
  }, [reducedMotion]);

  var coreStyle = useAnimatedStyle(function() {
    return {
      transform: [{ scale: interpolate(breathe.value, [0, 1], [0.96, 1.06]) }],
      shadowOpacity: interpolate(breathe.value, [0, 1], [0.52, 0.95]),
    };
  });

  var haloStyle = useAnimatedStyle(function() {
    return {
      opacity: interpolate(breathe.value, [0, 1], [0.18, 0.42]),
      transform: [{ scale: interpolate(breathe.value, [0, 1], [0.92, 1.18]) }],
    };
  });

  var sweepStyle = useAnimatedStyle(function() {
    return { transform: [{ rotate: (rotation.value * 57.2958) + 'deg' }] };
  });

  var sheenStyle = useAnimatedStyle(function() {
    return {
      transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-panelWidth * 0.45, panelWidth * 0.8]) }],
      opacity: interpolate(shimmer.value, [0, 0.25, 0.7, 1], [0, 0.16, 0.08, 0]),
    };
  });

  var personalLine = language === 'si'
    ? (userName ? userName + ', ඔබේ වාර්තාව සකස් කරමින්.' : 'ඔබේ පුද්ගලික වාර්තාව සකස් කරමින්.')
    : (userName ? 'Preparing your private report, ' + userName + '.' : 'Preparing your private report.');
  var countLabel = language === 'si' ? 'කොටස්' : 'chapters';
  var elapsedLabel = elapsedSec > 4
    ? (language === 'si' ? elapsedSec + ' තත්.' : elapsedSec + 's')
    : (language === 'si' ? 'ආරම්භ වෙමින්' : 'Starting');

  return (
    <View style={st.container}>
      <LinearGradient
        colors={[Colors.luxuryObsidian, '#08050E', '#140A1D', '#09060D', Colors.deepVoid]}
        locations={[0, 0.2, 0.48, 0.76, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={st.vignetteTop} />
      <View pointerEvents="none" style={st.vignetteBottom} />
      {!reducedMotion && STAR_FIELD.map(function(star, i) {
        return <PremiumStar key={'premiumStar' + i} star={star} skipAnim={reducedMotion} />;
      })}

      <View style={[st.content, compact && st.contentCompact, tiny && st.contentTiny]}>
        <Animated.View entering={FadeIn.duration(420)} style={[st.eyebrowRow, { width: panelWidth }]}>
          <View style={st.eyebrowRule} />
          <Text numberOfLines={1} style={st.eyebrowText}>{stageDetails.eyebrow}</Text>
          <View style={st.eyebrowRule} />
        </Animated.View>

        <View style={[st.dialShell, { width: dialSize, height: dialSize, borderRadius: dialSize / 2, marginVertical: tiny ? 8 : compact ? 12 : 18 }]}>
          <LinearGradient
            colors={['rgba(244,228,188,0.16)', 'rgba(123,73,207,0.08)', 'rgba(5,4,9,0.08)']}
            style={[StyleSheet.absoluteFill, { borderRadius: dialSize / 2 }]}
          />
          <Animated.View pointerEvents="none" style={[st.dialHalo, { width: dialSize * 0.8, height: dialSize * 0.8, borderRadius: dialSize * 0.4 }, haloStyle]} />
          <AstrolabeDial size={dialSize} progressFraction={progressFraction} rotation={rotation} />
          {!isLowEnd && ZODIAC_GLYPHS.map(function(glyph, i) {
            return <ZodiacMark key={'zodiacMark' + glyph} glyph={glyph} index={i} size={dialSize} rotation={rotation} />;
          })}
          {!isLowEnd && [Colors.luxuryGoldSoft, '#BFA4FF', Colors.luxuryGold, '#8DE2CE'].map(function(color, i) {
            return <OrbitGem key={'gem' + i} index={i} count={4} radius={dialSize * 0.25} color={color} size={i === 0 ? 7 : 5} orbit={orbit} />;
          })}
          {!isLowEnd && (
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, sweepStyle]}>
              <View style={[st.sweepLine, { left: dialSize / 2, top: dialSize / 2, width: dialSize * 0.32 }]} />
              <View style={[st.sweepGem, { left: dialSize * 0.79, top: dialSize / 2 - 4 }]} />
            </Animated.View>
          )}
          <Animated.View style={[st.coreOrb, { width: dialSize * 0.28, height: dialSize * 0.28, borderRadius: dialSize * 0.14 }, coreStyle]}>
            <LinearGradient
              colors={[Colors.luxuryGoldSoft, Colors.luxuryGold, '#7A4DD6']}
              start={{ x: 0.12, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={[st.coreInset, { width: dialSize * 0.225, height: dialSize * 0.225, borderRadius: dialSize * 0.1125 }]}>
              <Image source={APP_LOGO_IMAGE} style={{ width: dialSize * 0.18, height: dialSize * 0.18, borderRadius: dialSize * 0.09 }} resizeMode="cover" />
            </View>
          </Animated.View>
          <View style={[st.percentBadge, { bottom: dialSize * 0.055 }]}>
            <Text style={st.percentBadgeText}>{Math.round(progressPct)}%</Text>
          </View>
        </View>

        <Animated.View entering={FadeInUp.duration(380)} key={stage} style={[st.copyBlock, tiny && st.copyBlockTiny, { width: panelWidth }]}>
          <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.82} style={[st.title, compact && st.titleCompact, tiny && st.titleTiny]}>{stageDetails.title}</Text>
          <Text numberOfLines={tiny ? 2 : 3} style={[st.subtitle, compact && st.subtitleCompact, tiny && st.subtitleTiny]}>{stageDetails.sub}</Text>
          <Text numberOfLines={1} style={st.personalText}>{personalLine}</Text>
        </Animated.View>

        <View style={[st.panel, tiny && st.panelTiny, { width: panelWidth }]}>
          <Animated.View pointerEvents="none" style={[st.panelSheen, sheenStyle]} />
          <View style={st.panelHeader}>
            <View style={st.actionWrap}>
              <View style={st.actionIconWrap}>
                <Ionicons name={stage === 'recovering' ? 'archive-outline' : stage === 'retrying' ? 'refresh-outline' : 'sparkles-outline'} size={14} color={Colors.luxuryGoldSoft} />
              </View>
              <View style={st.actionTextWrap}>
                <Text numberOfLines={1} style={st.actionTitle}>{stageDetails.action}</Text>
                <Text numberOfLines={1} style={st.actionSub}>{elapsedLabel}</Text>
              </View>
            </View>
            <Text style={st.panelPct}>{Math.round(progressPct)}%</Text>
          </View>

          <View style={st.progressRail}>
            <LinearGradient
              colors={[Colors.luxuryGoldSoft, Colors.luxuryGold, '#A987FF']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[st.progressFill, { width: Math.max(4, progressPct) + '%' }]}
            />
          </View>

          <View style={st.metaRow}>
            <Text style={st.metaText}>{sectionsDone}/{sectionsTotal} {countLabel}</Text>
            <Text style={st.metaText}>{currentSectionLabel || (language === 'si' ? 'චාර්ට් සකසමින්' : 'Chart preparation')}</Text>
          </View>

          {!tiny ? (
            <View style={st.stageTrack}>
              {STAGE_ORDER.map(function(step, i) {
                return <StageMarker key={step} done={activeStageIndex > i || stage === 'complete'} active={activeStageIndex === i} />;
              })}
            </View>
          ) : null}

          {currentSectionLabel ? (
            <Animated.View entering={FadeIn.duration(260)} key={currentSection} style={st.currentPill}>
              <Ionicons name={(SECTION_ICONS[currentSection] || 'create') + '-outline'} size={13} color={Colors.luxuryGoldSoft} />
              <Text numberOfLines={1} style={st.currentText}>{language === 'si' ? 'දැන්: ' : 'Now: '}{currentSectionLabel}</Text>
            </Animated.View>
          ) : null}

          {!tiny && visibleChips.length > 0 ? (
            <View style={st.chipGrid}>
              {visibleChips.map(function(sectionKey, i) {
                return <SectionChip key={sectionKey} sectionKey={sectionKey} language={language} delay={i * 70} />;
              })}
            </View>
          ) : null}
        </View>

        <View style={[st.keepOpenRow, { width: panelWidth }]}>
          <Ionicons name="phone-portrait-outline" size={13} color="rgba(244,228,188,0.38)" />
          <Text numberOfLines={1} style={st.keepOpenText}>{language === 'si' ? 'Screen එක close කරන්න එපා' : 'Please keep this screen open'}</Text>
        </View>
      </View>
    </View>
  );
}

var st = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  vignetteTop: {
    position: 'absolute',
    top: -90,
    left: -80,
    right: -80,
    height: 260,
    borderRadius: 140,
    backgroundColor: 'rgba(214,181,109,0.09)',
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: -150,
    left: -40,
    right: -40,
    height: 280,
    borderRadius: 150,
    backgroundColor: 'rgba(123,73,207,0.13)',
  },
  star: {
    position: 'absolute',
    backgroundColor: Colors.luxuryGoldSoft,
    shadowColor: Colors.luxuryGold,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
  },
  contentCompact: {
    paddingVertical: 14,
  },
  contentTiny: {
    paddingVertical: 6,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  eyebrowRule: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(214,181,109,0.20)',
  },
  eyebrowText: {
    maxWidth: '58%',
    color: Colors.luxuryGoldSoft,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  dialShell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(214,181,109,0.24)',
    overflow: 'hidden',
    backgroundColor: 'rgba(5,4,9,0.42)',
    ...boxShadow('rgba(214,181,109,0.42)', { width: 0, height: 0 }, 0.7, 30),
    elevation: 12,
  },
  dialHalo: {
    position: 'absolute',
    backgroundColor: 'rgba(214,181,109,0.18)',
  },
  zodiacMark: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244,228,188,0.18)',
    backgroundColor: 'rgba(11,8,17,0.68)',
  },
  zodiacText: {
    color: Colors.luxuryGoldSoft,
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
  orbitGem: {
    position: 'absolute',
    shadowOpacity: 0.95,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  sweepLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'rgba(244,228,188,0.42)',
    shadowColor: Colors.luxuryGoldSoft,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  sweepGem: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.luxuryGoldSoft,
    shadowColor: Colors.luxuryGoldSoft,
    shadowOpacity: 0.95,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  coreOrb: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: Colors.luxuryGoldSoft,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  coreInset: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5,4,9,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(244,228,188,0.42)',
  },
  percentBadge: {
    position: 'absolute',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(5,4,9,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(214,181,109,0.34)',
  },
  percentBadgeText: {
    color: Colors.luxuryGoldSoft,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  copyBlock: {
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 16,
  },
  copyBlockTiny: {
    marginBottom: 10,
  },
  title: {
    color: Colors.luxuryPearl,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0,
    textShadowColor: 'rgba(214,181,109,0.18)',
    textShadowRadius: 14,
    textShadowOffset: { width: 0, height: 0 },
  },
  titleCompact: {
    fontSize: 21,
    lineHeight: 27,
  },
  titleTiny: {
    fontSize: 19,
    lineHeight: 24,
  },
  subtitle: {
    color: 'rgba(247,238,211,0.64)',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  subtitleCompact: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  subtitleTiny: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  personalText: {
    color: Colors.luxuryGold,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 9,
  },
  panel: {
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(214,181,109,0.25)',
    backgroundColor: 'rgba(9,6,14,0.68)',
    padding: 14,
  },
  panelTiny: {
    borderRadius: 16,
    padding: 11,
  },
  panelSheen: {
    position: 'absolute',
    top: -30,
    bottom: -30,
    width: 80,
    backgroundColor: 'rgba(244,228,188,0.26)',
    transform: [{ rotate: '18deg' }],
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  actionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(214,181,109,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244,228,188,0.20)',
  },
  actionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  actionTitle: {
    color: Colors.luxuryPearl,
    fontSize: 13,
    fontWeight: '800',
  },
  actionSub: {
    color: 'rgba(247,238,211,0.42)',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  panelPct: {
    color: Colors.luxuryGoldSoft,
    fontSize: 18,
    fontWeight: '900',
    minWidth: 44,
    textAlign: 'right',
  },
  progressRail: {
    height: 7,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 13,
    backgroundColor: 'rgba(244,228,188,0.10)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 9,
  },
  metaText: {
    flexShrink: 1,
    color: 'rgba(247,238,211,0.46)',
    fontSize: 10,
    fontWeight: '800',
  },
  stageTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
    paddingHorizontal: 4,
  },
  stageMarkerWrap: {
    flex: 1,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(244,228,188,0.10)',
  },
  stageLineDone: {
    backgroundColor: 'rgba(214,181,109,0.55)',
  },
  stageMarker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(244,228,188,0.24)',
    backgroundColor: '#0B0711',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageMarkerDone: {
    backgroundColor: Colors.luxuryGoldSoft,
    borderColor: Colors.luxuryGoldSoft,
  },
  stageMarkerActive: {
    borderColor: Colors.luxuryGoldSoft,
    backgroundColor: 'rgba(214,181,109,0.22)',
    transform: [{ scale: 1.14 }],
  },
  currentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'stretch',
    marginTop: 13,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(214,181,109,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(214,181,109,0.18)',
  },
  currentText: {
    flex: 1,
    minWidth: 0,
    color: Colors.luxuryGoldSoft,
    fontSize: 11,
    fontWeight: '800',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 11,
  },
  chip: {
    maxWidth: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(247,238,211,0.045)',
    borderWidth: 1,
  },
  chipLabel: {
    flexShrink: 1,
    color: 'rgba(247,238,211,0.68)',
    fontSize: 9,
    fontWeight: '800',
  },
  keepOpenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  keepOpenText: {
    color: 'rgba(244,228,188,0.40)',
    fontSize: 11,
    fontWeight: '700',
  },
});