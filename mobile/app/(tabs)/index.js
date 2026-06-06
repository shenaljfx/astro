import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import {
  View, Text, ScrollView, RefreshControl, TouchableOpacity,
  StyleSheet, Platform, Dimensions, Image, InteractionManager, Alert,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as htmlToImage from 'html-to-image';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line, G, Defs, RadialGradient, Stop, Ellipse, Path, Image as SvgImage } from 'react-native-svg';
import Animated, {
  FadeIn, FadeInDown, FadeInUp,
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming,
  interpolate, Easing,
} from 'react-native-reanimated';
import DesktopScreenWrapper, { useDesktopCtx } from '../../components/DesktopScreenWrapper';
import SpringPressable from '../../components/effects/SpringPressable';
import CosmicLoader from '../../components/effects/CosmicLoader';
import PinchableView from '../../components/effects/PinchableView';
import CosmicCard from '../../components/ui/CosmicCard';
import SectionHeader from '../../components/ui/SectionHeader';
import AwesomeRashiChakra from '../../components/AwesomeRashiChakra';
import CelestialZodiacWheel from '../../components/CelestialZodiacWheel';
import useScreenInsets from '../../hooks/useScreenInsets';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Colors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import SriLankanChart from '../../components/SriLankanChart';
import useReducedMotion from '../../hooks/useReducedMotion';
import useLowEndDevice from '../../hooks/useLowEndDevice';
import { CosmicBackground } from '../../components/CosmicBackground';
import { boxShadow, textShadow } from '../../utils/shadow';
import { ZODIAC_IMAGES } from '../../components/ZodiacIcons';
import WeeklyShareCard from '../../components/WeeklyShareCard';
import AffirmationCard from '../../components/AffirmationCard';
import IntentionCard from '../../components/IntentionCard';
import ManifestationCard from '../../components/ManifestationCard';

// Lazy-load heavy THREE.js moon component — saves ~600KB parse on startup
var RealisticMoonLazy = lazy(function () { return import('../../components/RealisticMoon'); });
var RealisticMoon = React.memo(function RealisticMoonWrap(props) {
  return (
    <Suspense fallback={<View style={{ width: props.size, height: props.size, borderRadius: props.size / 2, backgroundColor: '#12101E' }} />}>
      <RealisticMoonLazy {...props} />
    </Suspense>
  );
});

var { width: SCREEN_WIDTH } = Dimensions.get('window');
var CHAKRA_HERO_SIZE = Math.min(SCREEN_WIDTH * 0.88, 400);

// Memoized moon timeline item — prevents re-rendering all 15 moons when selection changes
var MoonTimelineItem = React.memo(function MoonTimelineItem({ dt, isSelected, isKeyPhase, offset, onSelect, mpStyles }) {
  var handlePress = useCallback(function () { onSelect(offset); }, [offset, onSelect]);
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={handlePress}
      style={[mpStyles.tlItem, isSelected && mpStyles.tlItemSelected]}
    >
      <Text style={[mpStyles.tlDayName, isSelected && mpStyles.tlDayNameActive, dt.isToday && mpStyles.tlDayNameToday]}>{dt.dayName}</Text>
      <View style={[mpStyles.tlMoonWrap, isSelected && mpStyles.tlMoonWrapActive]}>
        {isSelected && <View style={mpStyles.tlMoonGlow} />}
        <RealisticMoon size={isSelected ? 30 : 22} tithiNum={dt.tithi} animate={false} />
      </View>
      <Text style={[mpStyles.tlDateNum, isSelected && mpStyles.tlDateNumActive]}>{dt.dayNum}</Text>
      {dt.isToday && <View style={mpStyles.tlTodayDot} />}
      {isKeyPhase && !dt.isToday && <View style={mpStyles.tlKeyPhaseDot} />}
    </TouchableOpacity>
  );
});

/* ── Ivory & Gold Luxe — Home Page Theme (derived from active palette) ── */
function getHT(colors) {
  return {
    // Backgrounds
    bg: colors.bg,
    bgCard: colors.bgCard,
    bgSurface: colors.surfaceMuted,
    bgWarm: colors.bgWarm,
    bgInput: colors.backgroundInput,

    // Gold palette
    gold: colors.gold,
    goldLight: colors.goldLight,
    goldDark: colors.goldDark,
    goldShimmer: colors.goldShimmer,
    goldMuted: colors.goldMuted,
    goldGlow: colors.goldGlow,
    goldBorder: colors.goldBorder,
    goldSubtle: colors.goldSubtle,

    // Text
    text: colors.text,
    textSec: colors.textSecondary,
    textMuted: colors.textMuted,
    textGold: colors.textGold,
    textLight: colors.textLight,

    // Status
    success: colors.success,
    successBg: colors.successBg,
    danger: colors.danger,
    dangerBg: colors.dangerBg,
    warning: colors.warning,
    warningBg: colors.warningBg,

    // Accents
    purple: colors.purple,
    purpleBg: colors.purpleBg,
    blue: colors.blue,
    blueBg: colors.blueBg,
    rose: colors.rose,
    roseBg: colors.roseBg,
    teal: colors.teal,
    tealBg: colors.tealBg,

    // Shadows & Borders
    shadow: colors.shadow,
    border: colors.border,
    borderLight: colors.borderLight,
    divider: colors.divider,
  };
}

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
var RASHI_LOOKUP = {
  Mesha: 'Mesha', mesha: 'Mesha', Aries: 'Mesha', aries: 'Mesha', 'මේෂ': 'Mesha',
  Vrishabha: 'Vrishabha', vrishabha: 'Vrishabha', Taurus: 'Vrishabha', taurus: 'Vrishabha', 'වෘෂභ': 'Vrishabha',
  Mithuna: 'Mithuna', mithuna: 'Mithuna', Gemini: 'Mithuna', gemini: 'Mithuna', 'මිථුන': 'Mithuna',
  Kataka: 'Kataka', kataka: 'Kataka', Cancer: 'Kataka', cancer: 'Kataka', 'කටක': 'Kataka',
  Simha: 'Simha', simha: 'Simha', Leo: 'Simha', leo: 'Simha', 'සිංහ': 'Simha',
  Kanya: 'Kanya', kanya: 'Kanya', Virgo: 'Kanya', virgo: 'Kanya', 'කන්‍යා': 'Kanya',
  Tula: 'Tula', tula: 'Tula', Libra: 'Tula', libra: 'Tula', 'තුලා': 'Tula',
  Vrischika: 'Vrischika', vrischika: 'Vrischika', Scorpio: 'Vrischika', scorpio: 'Vrischika', 'වෘශ්චික': 'Vrischika',
  Dhanus: 'Dhanus', dhanus: 'Dhanus', Sagittarius: 'Dhanus', sagittarius: 'Dhanus', 'ධනු': 'Dhanus',
  Makara: 'Makara', makara: 'Makara', Capricorn: 'Makara', capricorn: 'Makara', 'මකර': 'Makara',
  Kumbha: 'Kumbha', kumbha: 'Kumbha', Aquarius: 'Kumbha', aquarius: 'Kumbha', 'කුම්භ': 'Kumbha',
  Meena: 'Meena', meena: 'Meena', Pisces: 'Meena', pisces: 'Meena', 'මීන': 'Meena',
};
var LAGNA_UI_COPY = {
  Mesha: {
    readingEn: 'Aries Rising gives you a direct, brave, action-first nature. You usually move before others are ready, and your chart shows strength when you take the lead with discipline instead of impatience.',
    readingSi: 'මේෂ ලග්නයෙන් ඉපදුණු ඔයාට තියෙන්නේ නිර්භීත, ක්‍රියාශීලී, නායකත්ව ලක්ෂණ පිරුණු ස්වභාවයක්. අනිත් අයට කලින් ඉස්සරහට යන්න ඔයාට පුළුවන්. හැබැයි ඉක්මන් වෙන එක පොඩ්ඩක් පාලනය කරලා වැඩ කළොත්, ජීවිතේ ලොකු ජයග්‍රහණ ගන්න එක ඔයාට ගේමක් නැහැ.',
    personalityEn: 'Your strongest pattern is courage in motion, you learn by doing and win when your energy has a clear direction.',
    personalitySi: 'ඔයාගේ ලොකුම ප්ලස් පොයින්ට් එක තමයි වැඩක් කරන්න බය නැතුව ඉස්සරහට යන එක. ඔයාගේ සහජ හැකියාවෙන් පැහැදිලි අරමුණක් තියාගෙන වැඩ කළොත්, ඉක්මනින් සාර්ථක ප්‍රතිඵල ගන්න ඔයාට පුළුවන්.',
    traitsEn: ['Brave', 'Fast starter', 'Independent', 'Protective'],
    traitsSi: ['නිර්භීතයි', 'ඉක්මන් ආරම්භය', 'ස්වාධීනයි', 'ආරක්ෂාකාරීයි'],
    gem: { en: 'Red Coral', si: 'රතු පබළු' },
    color: { en: 'Red, Orange', si: 'රතු, තැඹිලි' },
  },
  Vrishabha: {
    readingEn: 'Taurus Rising gives you a steady, tasteful, and dependable personality. You build life patiently, value comfort and loyalty, and do best when your plans are practical and financially grounded.',
    readingSi: 'වෘෂභ ලග්නයෙන් ඉපදුණු ඔයා කැමති ස්ථාවර, කලබල නැති, නිදහස් ජීවිතේකට. වැඩක් පටන් ගත්තොත් බොහොම ඉවසීමෙන් ඒක ගොඩනගනවා. සල්ලි ගැනත්, ජීවිතේ ගැනත් ප්‍රායෝගිකව හිතලා වැඩ කරන නිසා ඔයාට ලොකු සාර්ථකත්වයකට යන්න පුළුවන්.',
    personalityEn: 'Your strength is consistency, you move slowly when needed but rarely give up on something that truly matters.',
    personalitySi: 'ඔයාගේ ලොකුම ශක්තිය තමයි මේ නොසැලෙන ස්ථාවරත්වය. වෙලාවකට වැඩ ටිකක් හිමින් කළත්, අත්‍යවශ්‍ය දේවල් කොහොම හරි අත්නාරින එක තමයි ඔයාගේ විශේෂත්වය.',
    traitsEn: ['Steady', 'Loyal', 'Tasteful', 'Determined'],
    traitsSi: ['ස්ථාවරයි', 'විශ්වාසවන්තයි', 'රසකාමීයි', 'අධිෂ්ඨානශීලීයි'],
    gem: { en: 'Diamond', si: 'දියමන්ති' },
    color: { en: 'White, Cream, Pink', si: 'සුදු, ක්‍රීම්, රෝස' },
  },
  Mithuna: {
    readingEn: 'Gemini Rising gives you a quick mind, flexible thinking, and a natural gift for words. You understand people through conversation and often succeed where ideas, learning, trade, or communication are important.',
    readingSi: 'මිථුන ලග්නයෙන් ඉපදුණු ඔයාට තියෙන්නේ මාර තියුණු මොළයක්. ඕනෙම තත්ත්වෙකට හැඩගැහෙන්න ඔයාට පුළුවන්. අලුත් අදහස් හොයන්න, කතාබහ කරන්න ඔයාට තියෙන්නේ උපන් දක්ෂතාවයක්. මේ නිසා ඔයාට ඉක්මනින් ඉස්සරහට යන්න පුළුවන්.',
    personalityEn: 'Your chart shows a mind that connects patterns quickly, but your best results come when you finish one clear path before chasing the next idea.',
    personalitySi: 'ඔයාගේ මනස මාර ස්පීඩ් එකට දේවල් ග්‍රහණය කරගන්නවා. හැබැයි අලුත් දෙයක් පස්සේ යන්න කලින්, පටන් ගත්ත දේ ඉවරයක් කරනවා නම් ඔයාට මාරම රිසල්ට් එකක් ගන්න පුළුවන්.',
    traitsEn: ['Quick-minded', 'Communicative', 'Adaptable', 'Curious'],
    traitsSi: ['බුද්ධිමත්', 'කතාබහට දක්ෂයි', 'හැඩගැසෙනසුළුයි', 'කුතුහලයෙන් පිරිලා'],
    gem: { en: 'Emerald', si: 'මරකත' },
    color: { en: 'Green, Light Yellow', si: 'කොළ, ලා කහ' },
  },
  Kataka: {
    readingEn: 'Cancer Rising gives you emotional depth, intuition, and a protective heart. Home, family, memory, and belonging shape many of your choices, and you often sensitive to what others feel before they say it.',
    readingSi: 'කටක ලග්නයෙන් ඉපදුණු ඔයා හරිම සංවේදී, හැඟීම්බර කෙනෙක්. අනිත් අයව ආදරෙන් බලාගන්න ඔයාට තියෙන්නේ මාර හදවතක්. පවුලේ අය, නිවස ගැන ඔයා හුඟක් හිතනවා. අනිත් අයගේ හැඟීම් කල්තියා තේරුම් ගන්න එක ඔයාට සහජයෙන්ම පිහිටලා තියෙනවා.',
    personalityEn: 'Your sensitivity is not weakness, it is your way of reading the room and protecting what matters.',
    personalitySi: 'ඔයාගේ සංවේදීකම තියෙන්නේ දුර්වලකමකට නෙවෙයි, අනිත් අයව තේරුම් අරන් ඔයාට වටින දේවල් ආරක්ෂා කරගන්න තමයි ඒක පිහිටලා තියෙන්නේ.',
    traitsEn: ['Intuitive', 'Caring', 'Protective', 'Family-minded'],
    traitsSi: ['සංවේදී', 'කරුණාවන්තයි', 'පවුලට ලැදියි', 'ආරක්ෂාකාරීයි'],
    gem: { en: 'Pearl', si: 'මුතු' },
    color: { en: 'White, Silver', si: 'සුදු, රිදී' },
  },
  Simha: {
    readingEn: 'Leo Rising gives you presence, pride, and a natural wish to create something meaningful. You are noticed easily, and your life opens when confidence is guided by generosity and responsibility.',
    readingSi: 'සිංහ ලග්නයෙන් ඉපදුණු ඔයා පෙනුමෙන් වගේම වැඩෙනුත් කැපී පේන කෙනෙක්. සහජ නායකයෙක් විදිහට ඉස්සරහට යන්න ඔයාට පුළුවන්. ආත්ම විශ්වාසය, කරුණාව එකතු කරලා වගකීමෙන් වැඩ කළොත්, හැමෝම ආදරය කරන ජනප්‍රිය චරිතයක් වෙන්න ඔයාට අමාරු නැහැ.',
    personalityEn: 'Your personality carries warmth and authority, people respond when you lead with heart rather than ego.',
    personalitySi: 'ඔයා ළඟ තියෙන උණුසුම් හදවත සහ අන් අයට උදව් කරන්න තියෙන උනන්දුව නිසා ඔයාට ලොකු පිළිගැනීමක් ලැබෙනවා. හැබැයි පොඩියට තියෙන ආඩම්බරකම පාලනය කරගන්න එක වැදගත්.',
    traitsEn: ['Confident', 'Warm-hearted', 'Commanding', 'Creative'],
    traitsSi: ['නායකත්වය', 'කැපී පෙනෙනවා', 'ආකර්ෂණීයයි', 'නිර්භීතයි'],
    gem: { en: 'Ruby', si: 'මාණික්‍ය' },
    color: { en: 'Gold, Orange, Red', si: 'රන්, තැඹිලි, රතු' },
  },
  Kanya: {
    readingEn: 'Virgo Rising gives you a careful mind, practical judgement, and a strong eye for detail. You improve whatever you touch, but your peace grows when perfection becomes a guide rather than pressure.',
    readingSi: 'කන්‍යා ලග්නයෙන් ඉපදුණු ඔයා හරිම ප්‍රායෝගිකව, පිළිවෙළට වැඩ කරන කෙනෙක්. පුංචි පුංචි දේවල් ගැන පවා ඔයා ගොඩක් හිතනවා. සේවය කිරීම, සෞඛ්‍යය වගේ දේවල් ගැන ඔයා දක්වන උනන්දුව නිසා අනිත් අයට ඔයාව ලොකු සහනයක් වෙනවා.',
    personalityEn: 'Your chart shows a refined problem-solver, someone who notices what others miss and turns small corrections into real progress.',
    personalitySi: 'ඕනෙම ප්‍රශ්නයක් ලේසියෙන් විසඳගන්න හැකියාව ඔයාට තියෙනවා. හැමදේම පර්ෆෙක්ට් වෙන්න ඕනේ කියලා හිතලා ඔයා නිකන් ස්ට්‍රෙස් වෙන්න එපා.',
    traitsEn: ['Analytical', 'Practical', 'Organized', 'Helpful'],
    traitsSi: ['විශ්ලේෂණාත්මකයි', 'පිළිවෙළයි', 'සේවාකාමීයී', 'ප්‍රායෝගිකයි'],
    gem: { en: 'Emerald', si: 'මරකත' },
    color: { en: 'Green, Earth tones', si: 'කොළ, පස් වර්ණ' },
  },
  Tula: {
    readingEn: 'Libra Rising gives you charm, balance, and a strong sense of fairness. Relationships, beauty, negotiation, and social harmony become important life themes, and you succeed by choosing peace without losing your own voice.',
    readingSi: 'තුලා ලග්නයෙන් ඉපදුණු ඔයා සාමයට, සමානාත්මතාවයට මාරම ලැදියි. ප්‍රශ්නයක් වුණාම පැති දෙකම බලලා සාධාරණව තීරණ ගන්න ඔයාට පුළුවන්. ලස්සන, කලාව වගේ දේවල් වලටත් ඔයා සහජයෙන් කැමතියි.',
    personalityEn: 'Your gift is reading both sides of a situation, but your growth comes from making clear choices when balance becomes delay.',
    personalitySi: 'වෙන අයත් එක්ක එකතුවෙලා වැඩ කරන්න තියෙන හැකියාව (Partnerships) තමයි ඔයාගේ ලොකුම ශක්තිය. තීරණ ගන්න ටිකක් පමා වුණත්, ගන්න තීරණය ගොඩක් වෙලාවට හරිම එක වෙනවා.',
    traitsEn: ['Diplomatic', 'Charming', 'Fair-minded', 'Artistic'],
    traitsSi: ['සාමකාමීයි', 'සාධාරණයි', 'කලාකාමීයි', 'සමබරයි'],
    gem: { en: 'Diamond', si: 'දියමන්ති' },
    color: { en: 'White, Pastel shades', si: 'සුදු, ලා වර්ණ' },
  },
  Vrischika: {
    readingEn: 'Scorpio Rising gives you an intense, private, and deeply observant nature. Mars adds courage under pressure, so you often transform through difficult moments and notice hidden motives before others do.',
    readingSi: 'වෘශ්චික ලග්නයෙන් ඉපදුණු ඔයාට තියෙන්නේ ගැඹුරුම හැඟීම් දාමයක්. යමක් කරන්න හිතුවොත් ඒකෙ අගමුල හොයනකම්ම අතාරින්නේ නැහැ. ඔයාගේ මානසික ශක්තිය මාරම ප්‍රබලයි.',
    personalityEn: 'Your power is emotional depth with control, you are strongest when you use intensity for healing, research, and focused action.',
    personalitySi: 'අභියෝග වලට මුහුණ දීලා, අළු ගසලා නැගිටින එක ඔයාට සහජයෙන්ම පිහිටලා තියෙනවා. අනිත් අයගේ හිතේ තියෙන දේ ඉක්මනින්ම තේරුම් ගන්න පුළුවන් එකත් ඔයාගේ විශේෂත්වයක්.',
    traitsEn: ['Intense willpower', 'Magnetic', 'Deep thinker', 'Resilient'],
    traitsSi: ['රහස්‍යයි', 'අධිෂ්ඨානශීලීයි', 'ගැඹුරුයි', 'මානසික ශක්තිය'],
    gem: { en: 'Red Coral', si: 'රතු පබළු' },
    color: { en: 'Deep Red, Maroon', si: 'තද රතු, මෙරූන්' },
  },
  Dhanus: {
    readingEn: 'Sagittarius Rising gives you optimism, faith, and a love of truth. You grow through learning, travel, teaching, and big ideas, especially when freedom is balanced with responsibility.',
    readingSi: 'ධනු ලග්නයෙන් ඉපදුණු ඔයා පට්ට නිදහස් කාමියෙක්. හැමදෙයක් දිහාම සුබවාදීව බලන ඔයා, සංචාරය කරන්න, අලුත් දේවල් ඉගෙනගන්න හරිම කැමතියි. ජීවිතේ යථාර්තය හොයන එක ඔයාගේ හැඩයක්.',
    personalityEn: 'Your chart points to a seeker, someone who needs meaning, movement, and a horizon to aim toward.',
    personalitySi: 'ඔයාගේ අවංකකම, කෙළින් කතා කරන ගතිය සමහර වෙලාවට අනිත් අයට රිදෙන්නත් පුළුවන්. හැබැයි ඔයා අනාගතය ගැන ගොඩක් දුර හිතලා තීරණ ගන්න කෙනෙක්.',
    traitsEn: ['Optimistic', 'Wise', 'Adventurous', 'Straightforward'],
    traitsSi: ['නිදහස්කාමීයි', 'සුබවාදීයි', 'අවංකයි', 'දර්ශනිකයි'],
    gem: { en: 'Yellow Sapphire', si: 'පුෂ්පරාග' },
    color: { en: 'Yellow, Gold', si: 'කහ, රන්' },
  },
  Makara: {
    readingEn: 'Capricorn Rising gives you patience, discipline, and a serious approach to achievement. Your success usually comes step by step, through structure, endurance, and practical decisions.',
    readingSi: 'මකර ලග්නයෙන් ඉපදුණු ඔයා කියන්නේ මාරම විනයක්, කැපවීමක් තියෙන කෙනෙක්. ජීවිතේ ලොකු ඉලක්ක තියාගෙන, ඒවාට හිමින් සැරේ, ස්ථාවරව ගමන් කරන එක තමයි ඔයාගේ ක්‍රමය. මහන්සි වෙලා වැඩ කරන්න ඔයාට තියෙන්නේ ලොකු ශක්තියක්.',
    personalityEn: 'Your strength is long-term focus, you may start quietly but you can outlast people who move faster at the beginning.',
    personalitySi: 'වගකීම් අරගන්න බය නැති ඔයා, අමාරු කාලවලදීත් වැටෙන්නේ නැතුව ඉස්සරහට යනවා. පවුලේ අය වෙනුවෙනුත් ඔයා ලොකු වගකීමක් දරන කෙනෙක්.',
    traitsEn: ['Disciplined', 'Responsible', 'Patient', 'Strategic'],
    traitsSi: ['විනයගරුකයි', 'අරමුණු සහගතයි', 'වගකීම් දරනවා', 'කැපවෙනවා'],
    gem: { en: 'Blue Sapphire', si: 'නිල් මැණික්' },
    color: { en: 'Dark Blue, Black', si: 'තද නිල්, කළු' },
  },
  Kumbha: {
    readingEn: 'Aquarius Rising gives you originality, independence, and a mind that looks beyond the usual path. You are drawn to systems, communities, technology, and ideas that can improve life for many people.',
    readingSi: 'කුම්භ ලග්නයෙන් ඉපදුණු ඔයා හැමතිස්සෙම අලුත් විදිහට හිතන, අනාගතය දකින කෙනෙක්. සමාජයට, යහළුවන්ට ගොඩක් ළැදියි. සම්ප්‍රදායික රාමු වලින් පිටතට ගිහින් අලුත් දේවල් හොයන්න ඔයා හරිම දක්ෂයි.',
    personalityEn: 'Your personality carries distance and vision, you often understand where things are going before others are ready to accept it.',
    personalitySi: 'ඔයා අනිත් හැමෝටම සමානව සලකනවා. හැඟීම් වලට වඩා බුද්ධියට තැන දීලා වැඩ කරන නිසා, සමහර වෙලාවට ඔයා ටිකක් හුදෙකලා වෙලා ඉන්න හැදුවත්, ඇතුළින් ඔයා ගොඩක් මානුෂීයයි.',
    traitsEn: ['Original', 'Independent', 'Humanitarian', 'Forward-looking'],
    traitsSi: ['අලුත් විදිහට හිතනවා', 'මිත්‍රශීලීයි', 'මානුෂීයයි', 'ස්වාධීනයි'],
    gem: { en: 'Blue Sapphire', si: 'නිල් මැණික්' },
    color: { en: 'Electric Blue, Violet', si: 'දීප්තිමත් නිල්, දම්' },
  },
  Meena: {
    readingEn: 'Pisces Rising gives you compassion, imagination, and a deeply receptive heart. You absorb moods easily and do best when creativity, faith, and service have healthy boundaries.',
    readingSi: 'මීන ලග්නයෙන් ඉපදුණු ඔයා මාරම සංවේදී, අනිත් අය ගැන ගොඩක් දුක් වෙන කෙනෙක්. කලාත්මක හැකියාවන් සහ ගැඹුරු ආධ්‍යාත්මික ගතිගුණ ඔයාට ජන්මයෙන්ම පිහිටලා තියෙනවා.',
    personalityEn: 'Your gift is emotional imagination, you can comfort, create, and understand what cannot always be explained in words.',
    personalitySi: 'අනිත් අයගේ ප්‍රශ්න වලදිත් ඔයාට ගොඩක් දුක හිතෙනවා. හිතින් ලෝක මවන්න ඔයා දක්ෂයි වගේම, හැම වෙලේම අනිත් අයට උදව් කරන්න තමයි ඔයාගේ හිත කියන්නේ.',
    traitsEn: ['Compassionate', 'Imaginative', 'Intuitive', 'Gentle'],
    traitsSi: ['සංවේදීයි', 'පරිකල්පනය', 'ආධ්‍යාත්මිකයි', 'ත්‍යාගශීලීයි'],
    gem: { en: 'Yellow Sapphire', si: 'පුෂ්පරාග' },
    color: { en: 'Yellow, Sea Green', si: 'කහ, මුහුදු කොළ' },
  },
};

function getRashiKey(value) {
  if (!value) return null;
  var text = String(value).replace(/\s+Rising$/i, '').trim();
  return RASHI_LOOKUP[text] || RASHI_LOOKUP[text.toLowerCase()] || null;
}

function getLagnaUiCopy(chartData) {
  var lagna = chartData && chartData.lagna;
  var details = chartData && chartData.lagnaDetails;
  var candidates = [
    lagna && lagna.name,
    lagna && lagna.rashi,
    lagna && lagna.english,
    lagna && lagna.sinhala,
    details && details.english,
    details && details.sinhala,
  ];
  for (var i = 0; i < candidates.length; i += 1) {
    var key = getRashiKey(candidates[i]);
    if (key && LAGNA_UI_COPY[key]) return LAGNA_UI_COPY[key];
  }
  return null;
}

function stripSinhalaParenthetical(value) {
  if (!value) return '';
  return String(value).replace(/\s*\([^)]*[\u0D80-\u0DFF][^)]*\)/g, '').trim();
}

function extractSinhalaParenthetical(value) {
  if (!value) return '';
  var match = String(value).match(/\(([^)]*[\u0D80-\u0DFF][^)]*)\)/);
  return match ? match[1].trim() : '';
}

function localizedLagnaValue(copy, field, rawValue, language) {
  var local = copy && copy[field];
  if (language === 'si') return (local && local.si) || extractSinhalaParenthetical(rawValue) || rawValue || '';
  return (local && local.en) || stripSinhalaParenthetical(rawValue);
}
var ZODIAC_COLORS = [
  '#FF6B6B','#34D399','#FFD666','#7DD3FC','#FFB800','#6EE7B7',
  '#F9A8D4','#D4A5FF','#FF9F43','#94A3B8','#67E8F9','#C4B5FD',
];

function CosmicOrrery({ size, activeIndex, tithiNum, skipDecorations }) {
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

      {/* Dust particles — skip on low-end devices */}
      {!skipDecorations && Array.from({ length: 24 }).map(function (_, i) {
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

/* ── Stat Mini ── */
function StatMini({ icon, label, value, color }) {
  var { colors: _c } = useTheme();
  return (
    <View style={s.statMini}>
      <View style={[s.statMiniIcon, { borderColor: color + '30', backgroundColor: color + '08' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[s.statMiniValue, { color: _c.text }]}>{value}</Text>
      <Text style={[s.statMiniLabel, { color: _c.textMuted }]}>{label}</Text>
    </View>
  );
}

function chooseText(language, en, si) {
  return language === 'si' ? si : en;
}

function getAstroEntryName(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  return entry.english || entry.name || entry.day || String(entry);
}

var PRACTICAL_TONES = {
  start: {
    effectEn: 'The universe is handing you a fresh spark today. Even the smallest first step will magically click into place.',
    effectSi: 'විශ්වයෙන් අද ඔයාට අලුත් ආරම්භයක රහස් ගිනිපුපුරක් දෙනවා. පුංචිම පියවරක් තිබ්බත් ඒක හරි ලස්සනට ගැලපෙයි.',
    dosEn: ['Start that one tiny thing', 'Trust your morning instinct'], dosSi: ['ඔයාගේ හිතේ තිබ්බ ඒ පුංචි දේ අද පටන්ගන්න', 'උදේම හිතට දැනෙන අදහස විශ්වාස කරන්න'],
    dontsEn: ['Overpromise everything', 'Scatter this precious energy'], dontsSi: ['ඔක්කොම කරන්නම් කියලා පොරොන්දු වෙන්න එපා', 'අද ලැබෙන විශේෂ ශක්තිය නිකරුණේ නාස්ති කරන්න එපා'],
  },
  build: {
    effectEn: 'Today holds a steady, grounding energy. Whatever you build or continue today is getting a secret protective blessing.',
    effectSi: 'හරිම ස්ථාවර, ආරක්ෂිත ශක්තියක් අද දවසේ හැංගිලා තියෙනවා. අද ඔයා එකතු කරන හෝ ගොඩනගන හැමදේකටම රහස් ආශිර්වාදයක් ලැබෙනවා.',
    dosEn: ['Continue what you love', 'Add a simple brick to your goals'], dosSi: ['ඔයා ආදරය කරන වැඩේ දිගටම කරගෙන යන්න', 'ඔයාගේ අරමුණ වෙනුවෙන් පුංචි හරි දෙයක් අදත් එකතු කරන්න'],
    dontsEn: ['Rush for magic results', 'Skip the little loving details'], dontsSi: ['ඉක්මනින් මැජික් ප්‍රතිඵල බලාපොරොත්තු වෙන්න එපා', 'ඔයාගේ ආදරණීය පුංචි විස්තර මඟහරින්න එපා'],
  },
  relationship: {
    effectEn: 'People matter more today. Kind words and cooperation can open doors.',
    effectSi: 'අද දවසේ සබඳතා වලට ලොකු බලයක් තියෙනවා. ආදරණීය වචන වලින් ගොඩක් දේවල් දිනාගන්න පුළුවන් දවසක්.',
    dosEn: ['Repair a conversation', 'Ask for support'], dosSi: ['තරහ වෙච්ච අය එක්ක කතා කරන්න', 'අවශ්‍ය වෙලාවට උදව් ඉල්ලන්න'],
    dontsEn: ['Win arguments', 'Take silence personally'], dontsSi: ['වාද කරලා දිනන එකට වැඩිය අනිත් අයව තේරුම් ගන්න', 'අනිත් අයගෙ නිශ්ශබ්දතාවය වරදවා වටහාගන්න එපා'],
  },
  learn: {
    effectEn: 'Curiosity is stronger. This is useful for study, planning, messages, and decisions that need facts.',
    effectSi: 'අලුත් දේවල් හොයන්න, ඉගෙනගන්න හිතෙන තියුණු ශක්තියක් අද තියෙනවා. වැදගත් තීරණ ගන්න කලින් කරුණු හොයලා බලන්න හොඳම දවසක්.',
    dosEn: ['Research before acting', 'Write things down'], dosSi: ['වැඩක් පටන් ගන්න කලින් ටිකක් හොයලා බලන්න', 'මතක තියාගන්න ඕන දේවල් ලියාගන්න'],
    dontsEn: ['Assume too quickly', 'Skip verification'], dontsSi: ['නොදැන උපකල්පනය කරන්න යන්න එපා', 'හරිද කියලා බලන එක මඟහරින්න එපා'],
  },
  clear: {
    effectEn: 'Small blockers may show up so you can remove them. Patience turns friction into progress.',
    effectSi: 'පොඩි පොඩි බාධා මතු වෙන්න පුළුවන්, හැබැයි ඒ ඉස්සරහට යන්න පාර හදාගන්නයි. ඉවසීමෙන් හිටියොත් ඒ බාධාම ජයග්‍රහණයක් වෙයි.',
    dosEn: ['Fix one problem first', 'Double-check plans'], dosSi: ['කලබල වෙන්නේ නැතුව එක ප්‍රශ්නයක් ඉස්සෙල්ලා විසඳගන්න', 'ඔයාගේ සැලසුම් දෙපාරක් චෙක් කරන්න'],
    dontsEn: ['Rush launches', 'React emotionally'], dontsSi: ['අලුත් දේවල් කලබලෙන් පටන්ගන්න එපා', 'ප්‍රශ්න ආවම හැඟීම් වලට වහල් වෙන්න එපා'],
  },
  heal: {
    effectEn: 'Recovery and care are highlighted. Choose actions that restore your body, home, or peace of mind.',
    effectSi: 'අද දවස වෙන් වෙලා තියෙන්නේ සැනසීම හා සුවය වෙනුවෙන්. හිත් වේදනා, ඇඟේ අමාරුකම් මඟඇරගන්න හිතට සැනසිල්ලක් දෙන දේවල් කරන්න.',
    dosEn: ['Rest without guilt', 'Handle health basics'], dosSi: ['කිසිම පසුතැවීමක් නැතුව හොඳින් විවේක ගන්න', 'සෞඛ්‍යය ගැන විශේෂයෙන් හිතන්න'],
    dontsEn: ['Push through exhaustion', 'Ignore discomfort'], dontsSi: ['අමාරුයි කියලා දැනෙනකොටත් බලෙන් වැඩ කරන්න යන්න එපා', 'ඇඟෙන් දෙන සංඥා නොසලකා හරින්න එපා'],
  },
  discipline: {
    effectEn: 'Responsibility is the winning path. Slow, clean work is stronger than dramatic moves.',
    effectSi: 'අද ජයග්‍රහණය තියෙන්නේ වගකීම සහ විනය ඇතුලේ. කලබලෙන් ලොකු දේවල් කරනවට වඩා හිමින්, පිළිවෙලට කරන වැඩ වලින් සාර්ථක වෙන්න පුළුවන්.',
    dosEn: ['Keep promises', 'Finish a duty'], dosSi: ['දුන්නු පොරොන්දු අනිවාර්යයෙන්ම ඉටු කරන්න', 'බාරගත්ත වැඩක් අනිවාර්යයෙන්ම ඉවර කරන්න'],
    dontsEn: ['Cut corners', 'Delay important chores'], dontsSi: ['ලේසි ක්‍රම හොයන්න ගිහින් වැඩේ අවුල් කරගන්න එපා', 'අත්‍යවශ්‍ය වැඩ කල්දාන්න එපා'],
  },
  action: {
    effectEn: 'Courage and movement are supported. Use the energy for useful action, not conflict.',
    effectSi: 'ඔයාගේ නිර්භීතකමට විශ්වයෙන් අද ලොකු ශක්තියක් ලැබෙනවා. ඒ ගැම්ම රණ්ඩු ඇතිකරගන්න නෙවෙයි, ජීවිතේ ඉස්සරහට යන්න පාවිච්චි කරන්න.',
    dosEn: ['Take a measured step', 'Use physical energy well'], dosSi: ['හොඳින් හිතලා ධෛර්යවන්ත පියවරක් ගන්න', 'මහන්සි වෙලා කරන වැඩක් අදම ඉවර කරන්න'],
    dontsEn: ['Pick fights', 'Make impulsive promises'], dontsSi: ['නොවැදගත් දේවලට ගැටුම් ඇතිකරගන්න එපා', 'ගැම්මට අවාසිදායක පොරොන්දු දෙන්න යන්න එපා'],
  },
  focus: {
    effectEn: 'Deep work is favored. You may feel intense, so give that intensity a useful target.',
    effectSi: 'එක අරමුණකට හිත එකලස් කරගන්න අද මාරම ලේසියි. ඒ හින්දා හිතේ තියෙන ඒ තදබල ශක්තිය එක වැදගත් අරමුණක් වෙනුවෙන් විතරක් පාවිච්චි කරන්න.',
    dosEn: ['Protect quiet time', 'Work on one priority'], dosSi: ['පාඩුවේ ඉන්න පුළුවන් වෙලාවක් වෙන්කරගන්න', 'වැදගත්ම එක වැඩක් තෝරගෙන ඒක විතරක් කරන්න'],
    dontsEn: ['Multitask heavily', 'Overthink every signal'], dontsSi: ['එකපාර වැඩ ගොඩක් කරන්න ගිහින් හිත අවුල් කරගන්න එපා', 'හැම පොඩි දේම ගැන ඕනාවට වඩා හිතන්න එපා'],
  },
  social: {
    effectEn: 'Teamwork and shared plans are easier. A helpful person may make the day lighter.',
    effectSi: 'අනිත් අයත් එක්ක එකතු වෙලා වැඩ කරන්න අද හරිම ලේසි දවසක්. ඔයාට උදව් කරන කෙනෙක් නිසා අද දවස ගොඩක් සැහැල්ලු වෙයි.',
    dosEn: ['Coordinate early', 'Share credit'], dosSi: ['කලින්ම කතා කරගෙන වැඩ ටික ප්ලෑන් කරගන්න', 'ලැබෙන ගෞරවය අනිත් අයත් එක්ක බෙදාගන්න'],
    dontsEn: ['Carry everything alone', 'Create mixed messages'], dontsSi: ['ඔක්කොම බර තනියම කරගහගන්න යන්න එපා', 'අනිත් අයට තේරුම්ගන්න අමාරු විදිහට කතා කරන්න එපා'],
  },
  creative: {
    effectEn: 'Design, beauty, and problem-solving get a lift. Make something cleaner or more useful.',
    effectSi: 'නිර්මාණශීලී අදහස් ගලාගෙන එන දවසක්. ප්‍රශ්නයක් ලස්සනට විසඳගන්න හරි, අඩාල වෙලා තිබ්බ වැඩක් ලස්සනට ඉවර කරන්න හරි අද පුළුවන්.',
    dosEn: ['Polish your work', 'Try a tasteful idea'], dosSi: ['කරන වැඩේට ලස්සන සහ නිර්මාණශීලී බවක් එකතු කරන්න', 'හිතට එන අලුත් අදහසක් අත්හදා බලන්න'],
    dontsEn: ['Chase perfection', 'Spend for show'], dontsSi: ['සියයට සීයක්ම සම්පූර්ණ වෙන්න ඕන කියලා හිරවෙන්න එපා', 'අනිත් අයට පේන්න අනවශ්‍ය විදිහට වියදම් කරන්න එපා'],
  },
  review: {
    effectEn: 'Hidden issues can become clearer. This is good for honest review and fixing root causes.',
    effectSi: 'මෙච්චර කල් හැංගිලා තිබුණ ප්‍රශ්න සහ ඇත්ත තත්ත්වයන් අද එළියට ඒවි. වැරදි හදාගෙන අලුත් තීරණ වලට යන්න මේක හොඳම වෙලාවක්.',
    dosEn: ['Look beneath the surface', 'Clean up old mistakes'], dosSi: ['මතුපිටින් පේන දේට වඩා ගැඹුරට හිතලා බලන්න', 'පරණ වැරදි පිළිගන්න, ඒවා හදාගන්න'],
    dontsEn: ['Blame quickly', 'Start sensitive talks late'], dontsSi: ['විස්තර දැනගන්න කලින් අනිත් අයට බනින්න එපා', 'සංවේදී දේවල් කතාකරන එක කල්දාන්න එපා'],
  },
  rest: {
    effectEn: 'The day supports softer pacing. Reflection can be more valuable than pressure.',
    effectSi: 'අද දවස ඉල්ලන්නේම සැහැල්ලුව. බලෙන් වැඩක් ඉවර කරනවට වඩා, නිදහසේ හිතන්න දෙන කාලය අද ඔයාට ගොඩක් වටිනවා.',
    dosEn: ['Pause before choosing', 'Make space for quiet'], dosSi: ['ඕනම දෙයක් තෝරගන්න කලින් පොඩ්ඩක් ඉන්න', 'නිදහසේ හුස්මගන්න පුළුවන් නිහඬ වෙලාවක් හදාගන්න'],
    dontsEn: ['Overload the schedule', 'Ignore emotional tiredness'], dontsSi: ['කරන්න බැරි තරම් වැඩ ගොඩක් දාගෙන හිරවෙන්න එපා', 'හිතේ තියෙන මහන්සිය ගණන් ගන්නේ නැතුව ඉන්න එපා'],
  },
  complete: {
    effectEn: 'Finishing energy is strong. Close loops, confirm details, and make the next step clean.',
    effectSi: 'අවසන් කිරීමේ ශක්තිය අද හරිම ප්‍රබලයි. බාගෙට කරපු දේවල් ඉවර කරලා, ඊළඟ පියවරට ලෑස්ති වෙන්න අද පාවිච්චි කරන්න.',
    dosEn: ['Complete pending work', 'Confirm agreements'], dosSi: ['ගොඩගැහිලා තියෙන වැඩ ටික හිමීට ඉවරයක් කරන්න', 'අනිත් අයත් එක්ක කරගත්ත එකඟවීම් ස්ථිර කරගන්න'],
    dontsEn: ['Leave loose ends', 'Celebrate before checking'], dontsSi: ['කිසිම වැඩක් බාගෙට කරලා දාලා යන්න එපා', 'ඇත්තටම වැඩේ ඉවරද කියලා බලන්නේ නැතුව සතුටු වෙන්න එපා'],
  },
  caution: {
    effectEn: 'Timing may feel uneven. Treat it as a signal to slow down and protect important choices.',
    effectSi: 'කාලය ටිකක් අමුතු විදිහට, හිරවෙලා වගේ දැනෙන්න පුළුවන්. ඒක විශ්වයෙන් දෙන සිග්නල් එකක්, ටිකක් හිමින් ගිහින් වැදගත් තීරණ දිහා ආයේ බලන්න කියලා.',
    dosEn: ['Delay risky starts', 'Check messages twice'], dosSi: ['අවදානම් වැඩ අලුතෙන් පටන් ගන්න එපා කල් දාන්න', 'ඕනම පණිවිඩයක් යවන්න කලින් දෙපාරක් කියවලා බලන්න'],
    dontsEn: ['Sign under pressure', 'Travel without planning'], dontsSi: ['කවුරුහරි බල කරනවා කියලා ගිවිසුම් වලට අත්සන් කරන්න එපා', 'හරි සැලසුමක් නැතුව හදිසි ගමන් යන්න එපා'],
  },
  money: {
    effectEn: 'Trade, budgets, and practical exchanges need attention. Clear value matters.',
    effectSi: 'සල්ලි ගණුදෙනු, වියදම් සහ අයවැය ගැන අද ටිකක් කල්පනාවෙන් ඉන්න ඕන දවසක්. හුවමාරු වෙන දේ වටිනාකම පැහැදිලිද කියලා බලන්න.',
    dosEn: ['Review costs', 'Make fair deals'], dosSi: ['වියදම් වෙන විදිහ පොඩ්ඩක් කල්පනාවෙන් බලන්න', 'දෙපැත්තටම සාධාරණ වෙන ගණුදෙනු විතරක් කරන්න'],
    dontsEn: ['Buy from pressure', 'Hide money details'], dontsSi: ['ආසාවට යටවෙලා අනවශ්‍ය විදිහට සල්ලි විසි කරන්න එපා', 'මුදල් සම්බන්ධ විස්තර අනිත් අයගෙන් හංගන්න එපා'],
  },
  travel: {
    effectEn: 'Movement and flexibility are supported. Keep plans light enough to adjust.',
    effectSi: 'ගමන් බිමන් වලට සහ වෙනස්වීම් වලට අද විශ්වයෙන් ලොකු සහායක් ලැබෙනවා. වෙනස් කරන්න පුළුවන් වෙන විදිහට සැලසුම් හදාගන්න එක තමයි වටින්නේ.',
    dosEn: ['Leave extra time', 'Keep options open'], dosSi: ['ගමන් යද්දි අමතර කාලයක් අරගෙනම යන්න', 'හැමදේකටම වෙනත් විකල්පයක් හිතේ තියාගන්න'],
    dontsEn: ['Depend on one plan', 'Ignore weather or traffic'], dontsSi: ['එකම සැලසුමකට විතරක් හිරවෙලා ඉන්න එපා', 'කාලගුණය ගැන හිතන්නේ නැතුව එළියට බහින්න එපා'],
  },
  confidence: {
    effectEn: 'Visibility is supported. Lead with warmth and confidence, not pride.',
    effectSi: 'අද ඔයාව අනිත් අයට හොඳට කැපිලා පේනවා. අහංකාරකමෙන් නැතුව, ආදරෙන් සහ විශ්වාසයෙන් යුතුව නායකත්වය ගන්න හොඳම දවසක්.',
    dosEn: ['Present your idea', 'Act generously'], dosSi: ['ඔයාගේ හිතේ තියෙන අදහස බය නැතුව ඉදිරිපත් කරන්න', 'අනිත් අය වෙනුවෙන් හොඳ හිතින් මැදිහත් වෙන්න'],
    dontsEn: ['Dominate others', 'Make it all about you'], dontsSi: ['බලෙන් අනිත් අයව පාලනය කරන්න යන්න එපා', 'හැමදේටම ඔයාම විතරයි කියන තැන ඉඳලා කතා කරන්න එපා'],
  },
  listen: {
    effectEn: 'Listening brings better answers than speaking first. Details arrive through patience.',
    effectSi: 'අද කතා කරනවට වඩා අහගෙන ඉන්න එකෙන් ඔයාට ලොකු රහස් පිළිතුරු ටිකක් හොයාගන්න පුළුවන්. ඉවසීමෙන් හිටියොත් ඔක්කොම විස්තර ඔයා ගාවටම එයි.',
    dosEn: ['Listen fully', 'Ask one good question'], dosSi: ['අනිත් අය කියන දේ සම්පූර්ණයෙන්ම අහගන්න', 'වැදගත්ම එක හොඳ ප්‍රශ්නයක් අහන්න'],
    dontsEn: ['Interrupt too soon', 'Miss quiet signals'], dontsSi: ['අනිත් අයට කතා කරන්න නොදී පනින්න එපා', 'වචන නැතුව දෙන සිග්නල් මඟහැරගන්න එපා'],
  },
  patience: {
    effectEn: 'Results may be slow but stable. The day rewards maturity and restraint.',
    effectSi: 'ප්‍රතිඵල ලැබෙන්න ටිකක් පරක්කු වෙයි, හැබැයි ලැබෙන දේ ස්ථිරයි. අද දවසේ ජයග්‍රහණය තියෙන්නේ ඉවසීම සහ පරිණතකම ඇතුළේ.',
    dosEn: ['Choose the long view', 'Stay consistent'], dosSi: ['කෙටි වාසි වලට වඩා දිගුකාලීන වාසි ගැන හිතන්න', 'කරන දේ අතරමඟ නවත්තන්නේ නැතුව දිගටම කරන්න'],
    dontsEn: ['Force answers', 'Give up too early'], dontsSi: ['උත්තර දෙන්න කියලා කාටවත් බල කරන්න යන්න එපා', 'ප්‍රතිඵල නෑ කියලා ඉක්මනින් අතහැරලා දාන්න එපා'],
  },
  steady: {
    effectEn: 'This is a grounded day for normal duties. Simple, reliable action works best.',
    effectSi: 'දෛනික වැඩ ටික කරගෙන යන්න නියම, නිදහස් දවසක්. හරිම සරල විදිහට, විශ්වාසයෙන් වැඩ කරන එක අදට ගොඩක් හොඳයි.',
    dosEn: ['Keep the basics strong', 'Work steadily'], dosSi: ['ඔයාගේ මූලික දේවල් හරියටම තියාගන්න', 'කලබලයක් නැතුව පාඩුවේ වැඩ ටික කරන්න'],
    dontsEn: ['Create drama', 'Change plans without reason'], dontsSi: ['නැති ප්‍රශ්න මවලා ලොකු කරගන්න යන්න එපා', 'හේතුවක් නැතුව එකපාරට සැලසුම් වෙනස් කරන්න එපා'],
  },
  release: {
    effectEn: 'Letting go is supported. Remove clutter, old tension, or a habit that drains you.',
    effectSi: 'අත්හැරීම තමයි අද දවසේ තේමාව. ඔයාගේ හිතට වද දෙන, ඔයාව වෙහෙස කරන දේවල් හරි පුද්ගලයින්ව හරි අතහැරලා දාන්න.',
    dosEn: ['Clear a space', 'End a stale loop'], dosSi: ['ඔයාගේ වටපිටාවයි හිතයි පිරිසිදු කරගන්න', 'කිසිම තේරුමක් නැති පුරුද්දකට තිත තියන්න'],
    dontsEn: ['Hold grudges', 'Restart old conflict'], dontsSi: ['තරහවල් හිතේ තියාගෙන තැවෙන්න එපා', 'ඉවර වෙච්ච පරණ ප්‍රශ්න ආයේ අදින්න යන්න එපා'],
  },
};

var PRACTICAL_GUIDES = {
  tithi: {
    'Pratipada': ['Fresh Cosmic Spark', 'අලුත් ආරම්භයකට සූදානම් වීම', 'start'], 'Dwitiya': ['Magnetic Bonding', 'බැඳීම් දුරදිග යන දිනයක්', 'relationship'],
    'Tritiya': ['Absorb the Mystery', 'අලුත් දේවල් ඉගෙනගැනීමට සුබයි', 'learn'], 'Chaturthi': ['Shatter the Block', 'බාධක ඉවත් කරගැනීමට හොඳම දවසක්', 'clear'],
    'Panchami': ['Soulful Recovery', 'සැනසිලිදායක සහ සහනශීලී දවසක්', 'heal'], 'Shashthi': ['Silent Discipline', 'විනයගරුකව වැඩකටයුතු කිරීම', 'discipline'],
    'Saptami': ['Courageous Leap', 'නිර්භීත තීරණ ගැනීමට සුබයි', 'action'], 'Ashtami': ['Hypnotic Focus', 'දැඩි අවධානයකින් වැඩ කිරීම', 'focus'],
    'Navami': ['Warrior Energy', 'අභියෝග ජයගැනීමේ ශක්තිය', 'action'], 'Dashami': ['The Final Click', 'සාර්ථකත්වයේ නිමාව සනිටුහන් වීම', 'complete'],
    'Ekadashi': ['Total Detox', 'ශරීරය සහ මනස පිරිසිදු කරගැනීම', 'review'], 'Dwadashi': ['Deep Recharge', 'ගැඹුරු සැනසීම හා විවේකය', 'heal'],
    'Trayodashi': ['Mending Threads', 'සම්බන්ධතා වර්ධනය කරගැනීම', 'relationship'], 'Chaturdashi': ['Let It Burn Out', 'පවතින රාමුවෙන් නිදහස් වීම', 'release'],
    'Purnima/Amavasya': ['The Greatest Threshold', 'ජීවිතයේ විශේෂ හැරවුම් ලක්ෂයක්', 'complete'],
  },
  nakshatra: {
    Ashwini: ['Lightning Start', 'වේගවත් සහ සාර්ථක ආරම්භයක්', 'start'], Bharani: ['Heavy Endurance', 'ඉවසීම සහ විඳදරාගැනීම', 'patience'],
    Krittika: ['Laser Cutting', 'තියුණු හා පැහැදිලි තීරණ', 'clear'], Rohini: ['Sensual Growth', 'ආකර්ෂණීය සහ සෞභාග්‍යමත් දිනයක්', 'build'],
    Mrigashira: ['Seek the Clue', 'නොපෙනෙන කරුණු ගවේෂණය කිරීම', 'learn'], Ardra: ['Stormy Release', 'හැඟීම් නිදහස් කිරීම සහ අලුත් වීම', 'release'],
    Punarvasu: ['Return of Light', 'යළි පිබිදීම සහ සැනසීම', 'heal'], Pushya: ['Divine Nourishment', 'අධ්‍යාත්මික පෝෂණය සහ වර්ධනය', 'build'],
    Ashlesha: ['Mystic Boundaries', 'ගැඹුරු අවබෝධය සහ ආරක්ෂාව', 'review'], Magha: ['Royal Presence', 'රාජකීය අභිමානය සහ ගෞරවය', 'confidence'],
    'Purva Phalguni': ['Intoxicating Charm', 'ආදරය සහ විවේකය විඳීම', 'relationship'], 'Uttara Phalguni': ['Unshakeable Vow', 'ස්ථීර සහ වගකීම් සහගත බව', 'discipline'],
    Hasta: ['Magic in the Hands', 'නිර්මාණශීලී කුසලතා වර්ධනය', 'creative'], Chitra: ['The Shiny Illusion', 'අලංකාරය සහ කලාත්මක බව', 'creative'],
    Swati: ['Bending with the Wind', 'නම්‍යශීලී බව සහ වෙනස්වීම්', 'travel'], Vishakha: ['Relentless Drive', 'අරමුණක් වෙනුවෙන් කැපවීම', 'action'],
    Anuradha: ['Silent Fellowship', 'මිත්‍රත්වය සහ සහයෝගීතාවය', 'social'], Jyeshtha: ['The Elder Wisdom', 'පරිණත දැනුම සහ නායකත්වය', 'discipline'],
    Mula: ['Pulling at the Roots', 'ගැඹුරු සත්‍යය සෙවීම', 'review'], 'Purva Ashadha': ['Fearless Surge', 'බාධා මැඩගෙන ඉදිරියට යෑම', 'confidence'],
    'Uttara Ashadha': ['The Unbreakable', 'නොසැලෙන අධිෂ්ඨානය', 'discipline'], Shravana: ['Listening to the Void', 'අවධානයෙන් යුතුව සවන් දීම', 'listen'],
    Dhanishtha: ['Drumbeat of Destiny', 'සාර්ථකත්වයේ රිද්මය', 'social'], Shatabhisha: ['100 Healing Veils', 'සුවය සහ සහනය ළඟා වීම', 'heal'],
    'Purva Bhadrapada': ['Walking Through Fire', 'ආධ්‍යාත්මික පිබිදීමක්', 'focus'], 'Uttara Bhadrapada': ['Still Waters', 'නිහඬ සහ සාමකාමී බව', 'patience'],
    Revati: ['The Final Release', 'වැඩ නිම කිරීම සහ විවේකය', 'complete'],
  },
  yoga: {
    Vishkambha: ['Clear the Fog', 'අපැහැදිලි තත්ත්වයන් පැහැදිලි වීම', 'clear'], Priti: ['The Velvet Vibe', 'ආදරය සහ කරුණාව වර්ධනය වීම', 'relationship'],
    Ayushman: ['Deep Life-Force', 'කායික හා මානසික නීරෝගීභාවය', 'heal'], Saubhagya: ['A Touch of Magic', 'වාසනාව සහ සෞභාග්‍යය උදාවීම', 'confidence'],
    Shobhana: ['Artistic Spark', 'කලාත්මක හැකියාවන් කැපී පෙනීම', 'creative'], Atiganda: ['Walk extremely softly', 'කල්පනාකාරීව සහ ප්‍රවේශමෙන් සිටීම', 'caution'],
    Sukarma: ['Golden Flow', 'යහපත් ක්‍රියාවන් සාර්ථක වීම', 'build'], Dhriti: ['Iron Will', 'දැඩි අධිෂ්ඨානයෙන් ජයගැනීම', 'discipline'],
    Shula: ['Hold Your Fire', 'ඉවසීමෙන් කටයුතු කළ යුතු දවසක්', 'caution'], Ganda: ['Untangling the Web', 'ගැටලු සහගත තත්ත්වයන් නිරාකරණය', 'clear'],
    Vriddhi: ['Invisible Expansion', 'දියුණුව සහ ප්‍රගතිය ළඟාවීම', 'build'], Dhruva: ['The Anchor', 'ස්ථාවර සහ නොසැලෙන ප්‍රතිඵල', 'discipline'],
    Vyaghata: ['Guard the Vault', 'බාධක මඟහැර ප්‍රවේශම් වීම', 'caution'], Harshana: ['Euphoric Lift', 'සිතට දැනෙන විශේෂ සතුටක්', 'confidence'],
    Vajra: ['Laser Focus', 'තියුණු හා ශක්තිමත් තීරණ ගැනීම', 'focus'], Siddhi: ['The Manifestation', 'බලාපොරොත්තු ඉටු වී සාර්ථක වීම', 'complete'],
    Vyatipata: ['A Sudden Shift', 'අනපේක්ෂිත වෙනස්කම් වලට සූදානම් වීම', 'caution'], Variyan: ['Silken Pace', 'සැහැල්ලු සහ විවේකී කාලයක්', 'rest'],
    Parigha: ['Bashing the Wall', 'අභියෝග මැඩගෙන ඉදිරියට යෑම', 'clear'], Shiva: ['Whisper of Peace', 'සැනසිලිදායක සහ සාමකාමී බව', 'heal'],
    Siddha: ['Fated Success', 'දෛවෝපගත ජයග්‍රහණ අත්විඳීම', 'complete'], Sadhya: ['The Secret Recipe', 'අරමුණු සාර්ථක කරගැනීමේ හැකියාව', 'build'],
    Shubha: ['The Open Door', 'යහපත් ප්‍රතිඵල සඳහා විවෘත වීම', 'confidence'], Shukla: ['Blank Canvas', 'අලුතින් යමක් ඇරඹීමට සුබයි', 'clear'],
    Brahma: ['The Architect', 'නව දැනුම හා සැලසුම් නිර්මාණය', 'learn'], Indra: ['The Crown Jewel', 'ප්‍රබල නායකත්වය සහ අභිමානය', 'confidence'],
    Vaidhriti: ['Suspended Animation', 'කල්පනාකාරී වියයුතු කාර්යබහුල දිනයක්', 'caution'],
  },
  karana: {
    Bava: ['The Seed Sprouts', 'අලුත් දේවල් ගොඩනැගීම', 'build'], Balava: ['A Hidden Current', 'ස්ථාවරව කටයුතු කරගෙන යාම', 'steady'],
    Kaulava: ['The Crowd’s Secret', 'සමාජශීලීව කාලය ගතකිරීම', 'social'], Taitila: ['The Master Craftsman', 'නිර්මාණශීලීව සහ අලංකාරව වැඩකිරීම', 'creative'],
    Garaja: ['The Quiet Worker', 'නිහඬව වගකීම් ඉටුකිරීම', 'discipline'], Vanija: ['The Golden Trade', 'ගණුදෙනු වලට සුබදායක වීම', 'money'],
    Vishti: ['The Suspended Step', 'තීරණ ගැනීමේදී ප්‍රවේශම් වීම', 'caution'], Shakuni: ['The Chess Player', 'උපායශීලීව සොයාබැලීම', 'review'],
    Chatushpada: ['The Familiar Rhythm', 'හුරුපුරුදු සුපුරුදු ක්‍රියාවල නිරතවීම', 'steady'], Naga: ['The Sleeping Snake', 'ඉවසීමෙන් සහ කල්පනාවෙන් සිටීම', 'patience'],
    Kimstughna: ['Clean Slate', 'අලුත් ආරම්භයක් ලබාගැනීම', 'release'], Kinstughna: ['Clean Slate', 'අලුත් ආරම්භයක් ලබාගැනීම', 'release'],
  },
  vaara: {
    Sunday: ['The Warm Spotlight', 'නායකත්වය සහ ආත්ම විශ්වාසය', 'confidence'], Monday: ['The Empath’s Day', 'හැඟීම්බර සහ සංවේදී බව', 'rest'],
    Tuesday: ['The Bold Warrior', 'ධෛර්යය සහ උද්‍යෝගය', 'action'], Wednesday: ['The Trickster’s Wit', 'බුද්ධිමත්බව සහ නිවැරදි සන්නිවේදනය', 'learn'],
    Thursday: ['The Wise Guide', 'යහපත් මඟපෙන්වීම සහ ප්‍රඥාව', 'learn'], Friday: ['The Beautiful Dance', 'කලාත්මක බව සහ සෞන්දර්යය', 'relationship'],
    Saturday: ['The Old Master', 'විනය, ඉවසීම සහ වගකීම', 'discipline'],
  },
};

var PRACTICAL_LABELS = {
  tithi: ['Today\'s Tithi', 'අද දවසේ තිථිය', 'Your mood and flow today'],
  nakshatra: ['Today\'s Nakshatra', 'අද දවසේ නැකත', 'Your emotional focus'],
  yoga: ['Today\'s Yoga', 'අද දවසේ යෝගය', 'The underlying vibe'],
  karana: ['Today\'s Karana', 'අද දවසේ කරණය', 'How to act today'],
  vaara: ['Today\'s Vaara', 'අද දවසේ බලපෑම', 'The main theme'],
};

function getPanchangaGuidance(kind, entry, language) {
  var name = getAstroEntryName(entry);
  var guide = PRACTICAL_GUIDES[kind] && PRACTICAL_GUIDES[kind][name];
  if (!guide) guide = ['Move With Awareness', 'සැලකිල්ලෙන් ක්‍රියා කරන්න', 'steady'];
  var tone = PRACTICAL_TONES[guide[2]] || PRACTICAL_TONES.steady;
  var labels = PRACTICAL_LABELS[kind] || ['Today Guide', 'අද මාර්ගෝපදේශය', 'Practical advice'];
  var title = chooseText(language, guide[0], guide[1]);
  var label = chooseText(language, labels[0], labels[1]);
  var hint = chooseText(language, labels[2], labels[1]);
  var meaning = language === 'si'
    ? label + ': ' + title + '. මේ දේවල් අද දවස සාර්ථක කරගන්න ඔයාට ගොඩක් උදව් වෙයි.'
    : label + ': ' + String(title).toLowerCase() + '. This is the practical signal for how to use today well.';
  return {
    label: label,
    hint: hint,
    title: title,
    meaning: meaning,
    effect: chooseText(language, tone.effectEn, tone.effectSi),
    dos: language === 'si' ? tone.dosSi : tone.dosEn,
    donts: language === 'si' ? tone.dontsSi : tone.dontsEn,
  };
}

var ORACLE_LAGNA_ARCHETYPES = {
  Mesha: {
    titleEn: 'Clear Direction',
    titleSi: 'පැහැදිලි ගමන',
    traitEn: 'Your energy is powerful, but rushing can make you tired. Take a deep breath today, pick one important goal, and put all your beautiful fire into just that one thing.',
    traitSi: 'ඔබට විශාල ශක්තියක් ඇතත්, කලබල වීමෙන් ඔබ වෙහෙසට පත් විය හැකියි. අද දවසේ ගැඹුරු හුස්මක් ගෙන, වැදගත්ම එක ඉලක්කයක් පමණක් තෝරාගෙන ඔබේ සම්පූර්ණ ශක්තිය ඒ වෙනුවෙන් යොදවන්න.',
  },
  Vrishabha: {
    titleEn: 'Steady Growth',
    titleSi: 'ස්ථාවර වර්ධනය',
    traitEn: 'You do not need to change everything all at once to see progress. Trust your slow, steady steps, because a tree takes time to grow its deepest roots.',
    traitSi: 'දියුණුවක් දැකීමට ඔබ සියල්ල එකවර වෙනස් කළ යුතු නැහැ. ඔබේ සෙමින්, ස්ථාවරව තබන පියවර ගැන විශ්වාස කරන්න, මන්ද ගසකට එහි ගැඹුරුම මුල් ඇදීමට කාලයක් අවශ්‍ය වන බැවිනි.',
  },
  Mithuna: {
    titleEn: 'Quiet Focus',
    titleSi: 'නිහඬ අවධානය',
    traitEn: 'Your brilliant mind constantly seeks new ideas, but today it needs a little rest. Let go of the things that do not matter, and give your full attention to what truly brings you joy.',
    traitSi: 'ඔබේ බුද්ධිමත් මනස නිතරම නව අදහස් සොයනවා, නමුත් අද එයට සුළු විවේකයක් අවශ්‍යයි. වැදගත් නොවන දේවල් අතහැර දමා, ඔබට සැබවින්ම සතුට ගෙන දෙන දේ කෙරෙහි ඔබේ සම්පූර්ණ අවධානය යොමු කරන්න.',
  },
  Kataka: {
    titleEn: 'Gentle Strength',
    titleSi: 'මෘදු ශක්තිය',
    traitEn: 'Caring deeply for others is your greatest gift, but you must also care for yourself. It is completely okay to say no sometimes and protect your own peace of mind.',
    traitSi: 'අන් අය ගැන ගැඹුරින් සැලකිලිමත් වීම ඔබේ වටිනාම තෑග්ගයි, නමුත් ඔබ ගැනත් සැලකිලිමත් විය යුතුමයි. සමහර විටෙක "නැහැ" යැයි පවසා ඔබේම මනසේ සාමය ආරක්ෂා කර ගැනීම කිසිසේත්ම වරදක් නොවේ.',
  },
  Simha: {
    titleEn: 'Quiet Confidence',
    titleSi: 'නිහඬ ආත්ම විශ්වාසය',
    traitEn: 'You shine so brightly that you do not need anyone\'s applause to prove your worth. True leadership today means staying warm and kind, even when nobody is watching.',
    traitSi: 'ඔබේ වටිනාකම ඔප්පු කිරීමට ඔබට කාගේවත් අත්පොළසන් අවශ්‍ය නැහැ, මන්ද ඔබ දැනටමත් දීප්තිමත්ව බබළන නිසයි. අද දවසේ සැබෑ නායකත්වය යනු කිසිවෙකු නොබලන විට පවා ඉතා කාරුණිකව හා උණුසුම්ව සිටීමයි.',
  },
  Kanya: {
    titleEn: 'Mindful Grace',
    titleSi: 'සිහියෙන් යුතු කරුණාව',
    traitEn: 'You always try to make things perfect, but remember that mistakes are just how we learn. Be gentle with yourself today, and celebrate the small things you do so beautifully.',
    traitSi: 'ඔබ නිතරම සෑම දෙයක්ම පරිපූර්ණ කිරීමට උත්සාහ කරනවා, නමුත් අත්වැරදීම් යනු අප ඉගෙන ගන්නා ආකාරය බව මතක තබා ගන්න. අද ඔබටම කරුණාවන්ත වන්න, ඔබ කොතරම් ලස්සනට කරන කුඩා දේවල් ගැන පවා සතුටු වන්න.',
  },
  Tula: {
    titleEn: 'Inner Harmony',
    titleSi: 'ආධ්‍යාත්මික සමතුලිතතාවය',
    traitEn: 'Keeping everyone else happy is a heavy burden to carry every day. Take a moment to ask what your own heart wants, and allow yourself to enjoy your own company.',
    traitSi: 'අන් සියලු දෙනාවම සතුටින් තැබීම දිනපතා ගෙන යාමට අපහසු බරකි. සුළු මොහොතක් ගෙන ඔබේම හදවතට අවශ්‍ය කුමක්දැයි විමසන්න, ඔබ සමඟම කාලය ගත කරමින් සතුටු වන්න.',
  },
  Vrischika: {
    titleEn: 'Peaceful Trust',
    titleSi: 'සාමකාමී විශ්වාසය',
    traitEn: 'Your feelings run very deep, and sometimes that makes it hard to trust the flow of life. Let go of the need to control everything today, and trust that beautiful things are coming to you.',
    traitSi: 'ඔබේ හැඟීම් ඉතා ගැඹුරුයි, සමහර විට එය ජීවිතයේ ගමන් මඟ විශ්වාස කිරීම අපහසු කරවනවා. අද දින සියල්ල පාලනය කිරීමේ අවශ්‍යතාවය අත්හරින්න, අලංකාර දේවල් ඔබ වෙත පැමිණෙන බව විශ්වාස කරන්න.',
  },
  Dhanus: {
    titleEn: 'Joyful Journey',
    titleSi: 'සතුටුදායක ගමන',
    traitEn: 'You are always looking for the next big adventure far away in the future. Remember to smile at the simple beauty of exactly where you are standing right now.',
    traitSi: 'ඔබ නිතරම අනාගතයේ ඈත ඇති මීළඟ විශාල ගමන ගැන සොයනවා. නමුත් මේ මොහොතේ ඔබ ඉන්නා තැන ඇති සරල සුන්දරත්වය දැක සිනාසෙන්නට අමතක කරන්න එපා.',
  },
  Makara: {
    titleEn: 'Gentle Patience',
    titleSi: 'මෘදු ඉවසීම',
    traitEn: 'You work incredibly hard and carry heavy responsibilities without complaining. Please remember that resting is not wasting time; it is gathering strength for your wonderful future.',
    traitSi: 'ඔබ කිසිවිටෙක පැමිණිලි නොකර ඉතා වෙහෙස මහන්සි වී බරපතල වගකීම් දරන කෙනෙක්. විවේක ගැනීම යනු කාලය නාස්ති කිරීමක් නොවන බවත්, එය ඔබේ සුන්දර අනාගතය සඳහා ශක්තිය එක්රැස් කිරීමක් බවත් කරුණාකර මතක තබා ගන්න.',
  },
  Kumbha: {
    titleEn: 'Open Heart',
    titleSi: 'විවෘත හදවත',
    traitEn: 'Your mind is busy dreaming of ways to change the world for the better. Today, bring that beautiful vision closer to home and share a simple, warm smile with someone nearby.',
    traitSi: 'ඔබේ මනස ලෝකය යහපත් අතට වෙනස් කරන අයුරු ගැන සිහින දකිමින් කාර්යබහුල වී සිටිනවා. අද දවසේ ඒ ලස්සන දැක්ම ඔබේ නිවසට වඩාත් සමීප කර, ළඟ සිටින කෙනෙකුට සුහද සිනහවක් තෑගි කරන්න.',
  },
  Meena: {
    titleEn: 'Clear Water',
    titleSi: 'පැහැදිලි ජලය',
    traitEn: 'Your heart automatically feels the pain and joy of everyone around you. Build a soft wall today so you can protect your own magic, and let your mind float in peaceful waters.',
    traitSi: 'ඔබ වටා සිටින සෑම දෙනාගේම දුක සහ සතුට ඔබේ හදවතට ගැඹුරින්ම දැනෙනවා. අද දවසේ මෘදු සීමාවක් ගොඩනඟා ගන්න, එවිට ඔබට ඔබේම ආශ්චර්යය ආරක්ෂා කර ගත හැකි අතර මනසට සාමකාමී දියඹක පාවීමට ඉඩ දිය හැකියි.',
  },
};

var DEFAULT_ORACLE_ARCHETYPE = {
  titleEn: 'A Beautiful Morning',
  titleSi: 'සුන්දර උදෑසනක්',
  traitEn: 'Every sunrise gives you a blank page to start your story all over again. Take a deep breath, smile at the morning light, and walk into this day with a peaceful heart.',
  traitSi: 'සෑම හිරු උදාවක්ම ඔබේ කතාව අලුතින්ම පටන් ගැනීමට හිස් පිටුවක් ලබා දෙනවා. ගැඹුරු හුස්මක් ගෙන, උදෑසන ආලෝකයට සිනාසී, සාමකාමී හදවතකින් මේ අලුත් දවසට පියනඟන්න.',
};

function getLagnaOracleKey(chartData) {
  var lagna = chartData && chartData.lagna;
  var details = chartData && chartData.lagnaDetails;
  var raw = (lagna && (lagna.english || lagna.name || lagna.sanskrit || lagna.sinhala))
    || (details && (details.english || details.name || details.sinhala))
    || '';
  return RASHI_LOOKUP[raw] || RASHI_LOOKUP[stripSinhalaParenthetical(raw)] || null;
}

function getFirstName(displayName) {
  var cleaned = String(displayName || '').trim();
  if (!cleaned) return 'Cosmic Seeker';
  return cleaned.split(/\s+/)[0];
}

function lowerFirstWord(value) {
  if (!value) return '';
  return String(value).charAt(0).toLowerCase() + String(value).slice(1);
}

function getActiveNakshatraSignIndex(data) {
  if (data && data.panchanga && data.panchanga.nakshatra) {
    var nakshatraName = data.panchanga.nakshatra.english || data.panchanga.nakshatra.name || '';
    var nakshatraToZodiac = { Ashwini: 0, Bharani: 0, Krittika: 1, Rohini: 1, Mrigashira: 2, Ardra: 2, Punarvasu: 3, Pushya: 3, Ashlesha: 3, Magha: 4, 'Purva Phalguni': 4, 'Uttara Phalguni': 5, Hasta: 5, Chitra: 6, Swati: 6, Vishakha: 7, Anuradha: 7, Jyeshtha: 7, Mula: 8, 'Purva Ashadha': 8, 'Uttara Ashadha': 9, Shravana: 9, Dhanishta: 10, Dhanishtha: 10, Shatabhisha: 10, 'Purva Bhadrapada': 11, 'Uttara Bhadrapada': 11, Revati: 11 };
    if (nakshatraToZodiac[nakshatraName] !== undefined) return nakshatraToZodiac[nakshatraName];
  }
  return 0;
}

function buildTodayOracle(options) {
  var language = options.language;
  var data = options.data;
  var chartData = options.chartData;
  var hasBirthData = options.hasBirthData;
  var displayName = options.displayName;
  var rahuActive = options.rahuActive;
  var firstName = getFirstName(displayName);
  var lagnaKey = getLagnaOracleKey(chartData);
  var archetype = (lagnaKey && ORACLE_LAGNA_ARCHETYPES[lagnaKey]) || DEFAULT_ORACLE_ARCHETYPE;
  var nakGuide = data && data.panchanga && data.panchanga.nakshatra ? getPanchangaGuidance('nakshatra', data.panchanga.nakshatra, language) : null;
  var tithiGuide = data && data.panchanga && data.panchanga.tithi ? getPanchangaGuidance('tithi', data.panchanga.tithi, language) : null;
  var yogaGuide = data && data.panchanga && data.panchanga.yoga ? getPanchangaGuidance('yoga', data.panchanga.yoga, language) : null;
  var primaryGuide = nakGuide || tithiGuide || yogaGuide;
  var secondaryGuide = tithiGuide || yogaGuide || nakGuide;
  var lagna = chartData && chartData.lagna;
  var lagnaName = language === 'si' && lagna && lagna.sinhala ? lagna.sinhala : lagna && lagna.english ? lagna.english : '';
  var title = chooseText(language, archetype.titleEn, archetype.titleSi);
  var bestMove = primaryGuide && primaryGuide.dos && primaryGuide.dos[0]
    ? primaryGuide.dos[0]
    : chooseText(language, 'Protect one meaningful priority', 'එක වැදගත් අරමුණක් ආරක්ෂා කරන්න');
  var cautionMove = rahuActive
    ? chooseText(language, 'Avoid launching important work while Rahu Kalaya is active', 'රාහු කාලය සක්‍රිය වෙද්දී වැදගත් වැඩ ආරම්භ කරන්න එපා')
    : secondaryGuide && secondaryGuide.donts && secondaryGuide.donts[0]
      ? secondaryGuide.donts[0]
      : chooseText(language, 'Do not rush the first answer', 'පළමු උත්තරය ඉක්මනින් තීරණය කරන්න එපා');
  var mood = primaryGuide ? primaryGuide.title : chooseText(language, 'Quiet Clarity', 'නිහඬ පැහැදිලිතාව');
  var proof = primaryGuide ? primaryGuide.hint : chooseText(language, 'Today signal', 'අද සංඥාව');
  var body;
  if (chartData && lagnaName) {
    body = language === 'si'
      ? firstName + ', ' + archetype.traitSi + '\n\n' + mood + ' ශක්තියෙන් කියන්නේ අද දවසේ ' + bestMove + ' කියලයි.'
      : firstName + ', ' + archetype.traitEn + '\n\nToday\'s ' + mood + ' energy suggests: ' + lowerFirstWord(bestMove) + '.';
  } else if (hasBirthData) {
    body = chooseText(
      language,
      firstName + ', your chart is still coming into focus. Use the daily timing below while we tune the personal layer.',
      firstName + ', ඔයාගේ කේන්දරය තවම සකස් වෙමින් තියෙනවා. ඒ අතරතුර අද කාල බලය පහළින් බලන්න.'
    );
  } else {
    body = chooseText(
      language,
      firstName + ', the sky can guide your timing. Add birth details to make this page speak directly to your chart.',
      firstName + ', අද අහසෙන් කාලය ගැන මඟපෙන්වීමක් ලැබෙනවා. උපන් විස්තර දුන්නොත් මේ පිටුව ඔයාගේම කේන්දරයට ගැලපෙයි.'
    );
  }
  return {
    title: title,
    body: body,
    mood: mood,
    proof: proof,
    bestMove: bestMove,
    cautionMove: cautionMove,
    lagnaName: lagnaName,
    lagnaKey: lagnaKey,
    primaryGuide: primaryGuide,
    secondaryGuide: secondaryGuide,
  };
}

export default function HomeScreen() {
  var { t, language } = useLanguage();
  var { user } = useAuth();
  var { colors, gradients, resolved } = useTheme();
  var HT = getHT(colors);
  var isDesktop = useDesktopCtx();
  var insets = useScreenInsets();
  var router = useRouter();
  var reduced = useReducedMotion();
  var lowEnd = useLowEndDevice();
  var skipHeavy = reduced || lowEnd;
  var [data, setData] = useState(null);
  var [chartData, setChartData] = useState(null);
  var [weeklyLagna, setWeeklyLagna] = useState(null);
  var [weeklyLagnaExpanded, setWeeklyLagnaExpanded] = useState(null);
  var [shareReport, setShareReport] = useState(null);
  var [sharePageNum, setSharePageNum] = useState(1);
  var [sharingBusy, setSharingBusy] = useState(false);
  var shareCardRef = useRef(null);
  var [jyotishToday, setJyotishToday] = useState(null);
  var [expandedPanchanga, setExpandedPanchanga] = useState(null);
  var [loading, setLoading] = useState(true);
  var [chartLoading, setChartLoading] = useState(false);
  var [error, setError] = useState(null);

  var scrollRef = useRef(null);
  var weeklyLagnaY = useRef(0);



  var wheelSpin = useSharedValue(0);
  var coronaPulse = useSharedValue(0);
  useEffect(function () {
    if (skipHeavy) {
      wheelSpin.value = 0;
      coronaPulse.value = 0.5;
      return;
    }
    wheelSpin.value = withRepeat(
      withTiming(360, { duration: 150000, easing: Easing.linear }),
    -1);
    coronaPulse.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
    -1, true);
  }, [skipHeavy]);
  var wheelStyle = useAnimatedStyle(function () {
    return { transform: [{ rotate: wheelSpin.value + 'deg' }] };
  });
  var coronaPulseStyle = useAnimatedStyle(function () {
    return {
      transform: [{ scale: interpolate(coronaPulse.value, [0, 1], [0.95, 1.20]) }],
      opacity: interpolate(coronaPulse.value, [0, 1], [0.5, 1]),
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
  var MOON_ITEM_W = 48;
  var MOON_DAYS_RANGE = 7;
  useEffect(function () {
    setTimeout(function () {
      if (moonScrollRef.current) {
        var scrollTo = MOON_DAYS_RANGE * MOON_ITEM_W - (SCREEN_WIDTH / 2) + MOON_ITEM_W / 2;
        moonScrollRef.current.scrollTo({ x: Math.max(0, scrollTo), animated: false });
      }
    }, 300);
    setSelectedDayOffset(0);
  }, [data]);

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
    // Defer secondary API calls until after first paint + interactions settle
    var cancelled = { current: false };
    var handle = InteractionManager.runAfterInteractions(function () {
      fetchBirthChart(cancelled);
    });
    return function () { cancelled.current = true; handle.cancel(); };
  }, [fetchBirthChart]);

  // Fetch weekly lagna palapala — deferred
  useEffect(function () {
    var handle = InteractionManager.runAfterInteractions(function () {
      api.getWeeklyLagna()
        .then(function (res) {
          if (res && res.success && res.reports && res.reports.length > 0) {
            setWeeklyLagna(res);
          }
        })
        .catch(function () { /* silent */ });
    });
    return function () { handle.cancel(); };
  }, []);

  // Fetch personalized jyotish data — deferred
  useEffect(function () {
    if (!hasBirthData || !birthDateTime) return;
    var handle = InteractionManager.runAfterInteractions(function () {
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
    });
    return function () { handle.cancel(); };
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
    var miniSize = Math.min(SCREEN_WIDTH - 32, isDesktop ? 380 : 340);
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
      <Animated.View entering={FadeInDown.delay(0).springify()} style={s.greetWrap}>
        <View style={{ flex: 1 }}>
          <Text style={[s.greetText, { color: HT.textMuted }]}>{getGreeting()}</Text>
          <Text style={[s.greetName, { color: HT.text }]}>{displayName}</Text>
        </View>
        <View style={[s.dateBadge, { backgroundColor: HT.purpleBg, borderColor: 'rgba(183,166,240,0.18)' }]}>
          <Text style={[s.dateText, { color: HT.purple }]}>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </Animated.View>
    );
  }

  function renderOracleHero() {
    var activeNakIndex = getActiveNakshatraSignIndex(data);
    var oracle = buildTodayOracle({
      language: language,
      data: data,
      chartData: chartData,
      hasBirthData: hasBirthData,
      displayName: displayName,
      rahuActive: rahuActive,
    });
    var todayLabel = new Date().toLocaleDateString(language === 'si' ? 'si-LK' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    var lagnaRashiId = chartData && chartData.lagna ? (chartData.lagna.rashiId || chartData.lagna.id || 1) : activeNakIndex + 1;
    var lagnaImageIndex = Math.max(0, Math.min(11, lagnaRashiId - 1));
    var oracleWheelSize = Math.min(SCREEN_WIDTH * 0.72, isDesktop ? 308 : 284);
    var hasPersonalChart = !!(hasBirthData && chartData);
    var chartBadge = hasPersonalChart && oracle.lagnaName
      ? (language === 'si' ? oracle.lagnaName + ' ලග්නය' : oracle.lagnaName + ' Rising')
      : hasBirthData
        ? (language === 'si' ? 'කේන්දරය සකස් වෙමින්' : 'Chart tuning')
        : (language === 'si' ? 'උපන් විස්තර අවශ්‍යයි' : 'Birth profile needed');
    var rahuWindow = data && data.rahuKalaya
      ? ((data.rahuKalaya.startFormatted ? data.rahuKalaya.startFormatted.display : toSLT(data.rahuKalaya.start, t)) + ' - ' + (data.rahuKalaya.endFormatted ? data.rahuKalaya.endFormatted.display : toSLT(data.rahuKalaya.end, t)))
      : '--';
    var auspiciousWindow = data && data.auspiciousPeriods && data.auspiciousPeriods[0]
      ? ((data.auspiciousPeriods[0].startFormatted ? data.auspiciousPeriods[0].startFormatted.display : toSLT(data.auspiciousPeriods[0].start, t)) + ' - ' + (data.auspiciousPeriods[0].endFormatted ? data.auspiciousPeriods[0].endFormatted.display : toSLT(data.auspiciousPeriods[0].end, t)))
      : sunriseVal + ' / ' + sunsetVal;
    var oracleSignals = [
      {
        icon: 'pulse-outline',
        label: language === 'si' ? 'අද මනෝභාවය' : 'Mood',
        value: oracle.mood,
        detail: oracle.proof,
        color: '#E8C56A',
      },
      {
        icon: 'navigate-outline',
        label: language === 'si' ? 'හොඳම පියවර' : 'Best Move',
        value: oracle.bestMove,
        detail: auspiciousWindow,
        color: '#7DD3FC',
      },
      {
        icon: rahuActive ? 'warning-outline' : 'shield-checkmark-outline',
        label: language === 'si' ? 'අවධානය' : 'Caution',
        value: oracle.cautionMove,
        detail: rahuActive ? (language === 'si' ? 'රාහු කාලය දැන් සක්‍රියයි' : 'Rahu Kalaya is active now') : rahuWindow,
        color: rahuActive ? '#FCA5A5' : '#86EFAC',
      },
    ];

    return (
      <Animated.View entering={FadeInDown.delay(40).springify()} style={s.oracleHeroShell}>
        <LinearGradient
          colors={[Colors.luxuryObsidian, Colors.luxuryObsidianMid, Colors.luxuryObsidianLift, '#0D0713', Colors.luxuryObsidian]}
          locations={[0, 0.22, 0.52, 0.78, 1]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        <LinearGradient
          colors={['rgba(214,181,109,0.15)', 'transparent', 'rgba(123,73,207,0.12)', 'rgba(244,228,188,0.05)']}
          locations={[0, 0.35, 0.7, 1]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
        />
        <Svg style={s.oracleStarMap} viewBox="0 0 360 640" preserveAspectRatio="none">
          <Defs>
            <RadialGradient id="oracleGlow" cx="50%" cy="42%" r="55%">
              <Stop offset="0%" stopColor="#F4E4BC" stopOpacity="0.26" />
              <Stop offset="45%" stopColor="#7B49CF" stopOpacity="0.11" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="220" cy="192" rx="170" ry="145" fill="url(#oracleGlow)" />
          <Path d="M18 208 C94 148 152 280 240 192 C296 136 330 176 356 116" stroke="rgba(214,181,109,0.24)" strokeWidth="0.8" fill="none" />
          <Path d="M10 360 C92 332 132 412 210 370 C274 335 318 370 352 322" stroke="rgba(123,73,207,0.14)" strokeWidth="0.8" fill="none" />
          <Line x1="68" y1="92" x2="112" y2="148" stroke="rgba(214,181,109,0.18)" strokeWidth="0.7" />
          <Line x1="112" y1="148" x2="170" y2="116" stroke="rgba(244,228,188,0.11)" strokeWidth="0.7" />
          <Line x1="242" y1="72" x2="292" y2="128" stroke="rgba(214,181,109,0.15)" strokeWidth="0.7" />
          {[42, 88, 132, 186, 228, 292, 318].map(function (point, pointIndex) {
            return <Circle key={'oc' + pointIndex} cx={point} cy={70 + ((pointIndex * 43) % 250)} r={pointIndex % 2 === 0 ? 1.7 : 1.1} fill="rgba(255,232,163,0.58)" />;
          })}
        </Svg>

        <View style={s.oracleTopRow}>
          <View style={s.oracleGreetingBlock}>
            <View style={s.oracleGreetingLine}>
              <View style={s.oracleGreetingDot} />
              <Text style={s.oracleGreeting} numberOfLines={1}>{getGreeting()}</Text>
            </View>
            <Text style={s.oracleName} numberOfLines={1}>{displayName}</Text>
          </View>
          <View style={s.oracleDatePill}>
            <Ionicons name="calendar-clear-outline" size={12} color="#F5D57A" />
            <Text style={s.oracleDateText}>{todayLabel}</Text>
          </View>
        </View>

        <View style={s.oracleVisualStage}>
          <View style={s.oracleWheelFrame}>
            <CelestialZodiacWheel size={oracleWheelSize} signIndex={lagnaImageIndex} accentIndex={activeNakIndex} rahuActive={rahuActive} />
          </View>
        </View>

        <View style={s.oracleCopyBlock}>
          <View style={s.oracleKickerRow}>
            <View style={s.oracleKickerLine} />
            <Text style={s.oracleKicker}>{language === 'si' ? 'අද දවසේ පෞද්ගලික කියවීම' : 'PERSONAL DAILY ORACLE'}</Text>
            <View style={s.oracleKickerLine} />
          </View>
          <Text style={[s.oracleTitle, language === 'si' && s.oracleTitleSinhala]}>{oracle.title}</Text>
          <Text style={[s.oracleBody, language === 'si' && s.sinhalaTextFlow]}>{oracle.body}</Text>
          <View style={s.oracleProofRow}>
            <View style={s.oracleProofPill}>
              <Ionicons name="person-circle-outline" size={13} color="#FFE8A3" />
              <Text style={s.oracleProofText}>{chartBadge}</Text>
            </View>
            <View style={s.oracleProofPill}>
              <Ionicons name="star-outline" size={13} color="#B7A6F0" />
              <Text style={s.oracleProofText}>{nakshatraVal}</Text>
            </View>
          </View>
        </View>

        <View style={s.oracleSignalGrid}>
          {oracleSignals.map(function (signal, signalIndex) {
            return (
              <Animated.View key={signal.label} entering={FadeInUp.delay(220 + signalIndex * 70).springify()} style={s.oracleSignalPanel}>
                <View style={[s.oracleSignalIcon, { borderColor: signal.color + '40', backgroundColor: signal.color + '12' }]}>
                  <Ionicons name={signal.icon} size={16} color={signal.color} />
                </View>
                <View style={s.oracleSignalCopy}>
                  <Text style={s.oracleSignalLabel}>{signal.label}</Text>
                  <Text style={s.oracleSignalValue} numberOfLines={2}>{signal.value}</Text>
                  <Text style={[s.oracleSignalDetail, { color: signal.color }]} numberOfLines={1}>{signal.detail}</Text>
                </View>
              </Animated.View>
            );
          })}
        </View>

        {!hasBirthData ? (
          <TouchableOpacity activeOpacity={0.86} onPress={function () { router.push('/profile'); }} style={s.oracleProfileCta}>
            <LinearGradient colors={['#F5B84B', '#A66A19']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <Ionicons name="sparkles" size={15} color="#140B04" />
            <Text style={s.oracleProfileCtaText}>{language === 'si' ? 'ඔයාගේ උපන් විස්තර එකතු කරන්න' : 'Make Today Personal'}</Text>
          </TouchableOpacity>
        ) : null}
      </Animated.View>
    );
  }

  function renderRahuKalayaCard() {
    if (!data || !data.rahuKalaya) return null;
    var startText = data.rahuKalaya.startFormatted ? data.rahuKalaya.startFormatted.display : toSLT(data.rahuKalaya.start, t);
    var endText = data.rahuKalaya.endFormatted ? data.rahuKalaya.endFormatted.display : toSLT(data.rahuKalaya.end, t);
    var countdownText = getRahuCountdown();

    return (
      <View style={[s.rahuCard, s.rahuCardToday, rahuActive && s.rahuCardActive]}>
        <LinearGradient
          colors={rahuActive
            ? ['rgba(26,21,10,0.90)', 'rgba(80,20,20,0.25)', 'rgba(26,21,10,0.90)']
            : ['rgba(26,21,10,0.90)', 'rgba(10,40,25,0.20)', 'rgba(26,21,10,0.90)']
          }
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {rahuActive && (
          <Animated.View style={[s.rahuEdgeGlow, coronaPulseStyle]} />
        )}

        <View style={s.rahuCardTop}>
          <View style={s.rahuTitleRow}>
            <View style={[s.rahuIconCircle, rahuActive ? s.rahuIconCircleActive : s.rahuIconCircleSafe]}>
              <Animated.View style={rahuActive ? coronaPulseStyle : undefined}>
                <Ionicons
                  name={rahuActive ? 'warning' : 'shield-checkmark'}
                  size={20}
                  color={rahuActive ? '#FCA5A5' : '#6EE7B7'}
                />
              </Animated.View>
            </View>
            <Text
              style={[s.rahuCardTitle, rahuActive && s.rahuCardTitleActive, language === 'si' && s.sinhalaTextFlow]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              {rahuActive
                ? (language === 'si' ? 'දැඩි රාහු කාලය උදාවෙලා' : 'Caution Window')
                : (language === 'si' ? 'අද දවසේ රාහු කාලය' : 'Caution Window')
              }
            </Text>
          </View>
          <View style={s.rahuStatusBadge}>
            <Animated.View style={[s.rahuStatusDot, { backgroundColor: rahuActive ? '#EF4444' : '#34D399' }, rahuActive && coronaPulseStyle]} />
            <Text
              style={[s.rahuStatusText, { color: rahuActive ? '#FCA5A5' : '#6EE7B7' }, language === 'si' && s.sinhalaTextFlow]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
            >
              {rahuActive
                ? (language === 'si' ? 'මේ වෙලාවේ බලපවත්වයි' : 'ACTIVE')
                : (language === 'si' ? 'රාහු කාලයෙන් නිදහස්' : 'SAFE')
              }
            </Text>
          </View>
        </View>

        <View style={[s.rahuTimeRow, { backgroundColor: rahuActive ? 'rgba(239,68,68,0.06)' : 'rgba(0,0,0,0.15)' }]}>
          <View style={s.rahuTimeBlock}>
            <Text style={[s.rahuTimeLabel, language === 'si' && s.sinhalaTextFlow]}>{language === 'si' ? 'ඇරඹෙන වෙලාව' : 'Starts'}</Text>
            <Text style={[s.rahuTimeValue, rahuActive && s.rahuTimeValueActive]}>{startText}</Text>
          </View>
          <View style={[s.rahuTimeDivider, { backgroundColor: rahuActive ? 'rgba(239,68,68,0.3)' : 'rgba(52,211,153,0.2)' }]} />
          <View style={s.rahuTimeBlock}>
            <Text style={[s.rahuTimeLabel, language === 'si' && s.sinhalaTextFlow]}>{language === 'si' ? 'අවසන් වන වෙලාව' : 'Ends'}</Text>
            <Text style={[s.rahuTimeValue, rahuActive && s.rahuTimeValueActive]}>{endText}</Text>
          </View>
        </View>

        {countdownText ? (
          <View style={[s.rahuCountdownBar, { backgroundColor: rahuActive ? 'rgba(239,68,68,0.12)' : 'rgba(52,211,153,0.08)' }]}>
            <Ionicons name="time-outline" size={13} color={rahuActive ? '#FCA5A5' : '#6EE7B7'} />
            <Text style={[s.rahuCountdownText, { color: rahuActive ? '#FCA5A5' : '#6EE7B7' }, language === 'si' && s.sinhalaTextFlow]}>
              {rahuActive
                ? (language === 'si' ? 'තව ' + countdownText + ' කින් අවසන් වේ' : 'Ends in ' + countdownText)
                : (language === 'si' ? 'තව ' + countdownText + ' කින් ඇරඹේ' : 'Starts in ' + countdownText)
              }
            </Text>
          </View>
        ) : null}

        <View style={s.rahuExplanationContainer}>
          <Text style={[s.rahuExplanationText, language === 'si' && s.sinhalaTextFlow]}>
            {language === 'si'
              ? 'රාහු කාලය යනු සුබ වැඩ පටන් ගැනීමට නුසුදුසු බව පිළිගැනෙන කෙටි කාල සීමාවකි.'
              : 'Rahu Kalaya is an inauspicious time window during which starting important new work is generally avoided.'}
          </Text>
        </View>

        <View style={[s.rahuCardBorder, { borderColor: rahuActive ? 'rgba(239,68,68,0.25)' : 'rgba(52,211,153,0.15)' }]} />
      </View>
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

    var nakGuide = data && data.panchanga && data.panchanga.nakshatra ? getPanchangaGuidance('nakshatra', data.panchanga.nakshatra, language) : null;
    var tithiGuide = data && data.panchanga && data.panchanga.tithi ? getPanchangaGuidance('tithi', data.panchanga.tithi, language) : null;
    var yogaGuide = data && data.panchanga && data.panchanga.yoga ? getPanchangaGuidance('yoga', data.panchanga.yoga, language) : null;

    // Get tithi number for moon phase (1-30)
    var currentTithiNum = data && data.panchanga && data.panchanga.tithi && data.panchanga.tithi.number
      ? data.panchanga.tithi.number
      : getMoonPhaseFromDate();

    var orrerySize = Math.min(SCREEN_WIDTH * 0.38, 160);
    var chakraSize = CHAKRA_HERO_SIZE;

    return (
      <View>
        <View style={s.dashHero}>
          {/* ── Ancient parchment base ── */}
          <LinearGradient
            colors={['#1A150A', '#15100A', '#0F0B06', '#12100B', '#1A150C', '#0E0A05']}
            locations={[0, 0.2, 0.4, 0.6, 0.8, 1]}
            style={s.dashHeroBg}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
          {/* ── Warm golden veil ── */}
          <LinearGradient
            colors={['rgba(180,140,60,0.08)', 'transparent', 'rgba(160,120,40,0.06)', 'transparent', 'rgba(180,140,60,0.08)']}
            locations={[0, 0.25, 0.5, 0.75, 1]}
            style={s.dashHeroBg}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
          {/* ── Top ornamental gold line ── */}
          <LinearGradient
            colors={['transparent', 'rgba(218,165,32,0.50)', 'rgba(255,184,0,0.70)', 'rgba(218,165,32,0.50)', 'transparent']}
            locations={[0, 0.2, 0.5, 0.8, 1]}
            style={s.dashGlassShine}
            start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          />
          {/* ── Bottom ornamental gold line ── */}
          <LinearGradient
            colors={['transparent', 'rgba(218,165,32,0.35)', 'rgba(255,184,0,0.50)', 'rgba(218,165,32,0.35)', 'transparent']}
            locations={[0, 0.2, 0.5, 0.8, 1]}
            style={s.dashBottomShine}
            start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          />
          {/* ── Mystic corner glow — top-right ── */}
          <View style={s.dashMysticGlowTR} />
          {/* ── Mystic corner glow — bottom-left ── */}
          <View style={s.dashMysticGlowBL} />
          {/* ── Breathing nebula accent ── */}
          <Animated.View style={[s.dashNebulaBlob, coronaPulseStyle]} />
          {/* ── Inner border frame ── */}
          <View style={s.dashInnerFrame} />

          {/* ═══ RASHI CHAKRA — Center piece ═══ */}
          <View style={s.chakraHeroWrap}>
            <View style={s.chakraContainer}>
              <AwesomeRashiChakra size={chakraSize} activeSignIndex={activeNakIndex} />
            </View>
            {/* Sign name below chakra */}
            <View style={s.chakraOverlayInfo}>
              <View style={s.chakraSignTextRow}>
                <View style={s.chakraSignTextWrap}>
                  <Text style={s.dashHeroLabel}>{language === 'si' ? 'අද සූර්ය රාශිය' : "TODAY'S SIGN"}</Text>
                  <Text style={s.dashSignNameLarge}>{language === 'si' ? (ZODIAC_NAMES_SI[activeNakIndex] || ZODIAC_NAMES_EN[activeNakIndex]) : ZODIAC_NAMES_EN[activeNakIndex]}</Text>
                </View>
                <View style={s.chakraSignSubBadge}>
                  <Text style={s.dashSignNameSub}>{language === 'si' ? ZODIAC_NAMES_EN[activeNakIndex] : (ZODIAC_NAMES_SI[activeNakIndex] || '')}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ═══ NAKSHATRA PILL ═══ */}
          {nakGuide ? (
            <View style={s.nakPill}>
              <View style={s.nakPillRow}>
                <Ionicons name="star" size={12} color="#DAA520" />
                <Text style={s.nakPillLabel}>{language === 'si' ? 'අද දවසේ නැකත' : 'Today Nakshatra'}</Text>
              </View>
              <Text style={s.nakPillValue} numberOfLines={2}>{nakGuide.title}</Text>
            </View>
          ) : null}

          {/* ═══ DIVIDER ═══ */}
          <View style={s.dashDivider}>
            <LinearGradient colors={['transparent', 'rgba(218,165,32,0.30)', 'rgba(218,165,32,0.30)', 'transparent']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} />
          </View>

          {/* ═══ PANCHANGA GRID ═══ */}
          <Text style={s.dashGridTitle}>{language === 'si' ? 'අද දවසේ ග්‍රහ චාරය' : "Today's Timing Guide"}</Text>
          <View style={s.dashGrid}>
            <View style={s.dashCell}>
              <View style={[s.dashCellIcon, { backgroundColor: 'rgba(218,165,32,0.12)' }]}>
                <Ionicons name="sunny-outline" size={18} color="#DAA520" />
              </View>
              <Text style={s.dashCellValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{sunriseVal}</Text>
              <Text style={s.dashCellLabel}>{language === 'si' ? 'සූර්යෝදාව' : t('sunrise')}</Text>
            </View>
            <View style={s.dashCell}>
              <View style={[s.dashCellIcon, { backgroundColor: 'rgba(100,120,180,0.12)' }]}>
                <Ionicons name="moon-outline" size={18} color="#8B9DC3" />
              </View>
              <Text style={s.dashCellValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{sunsetVal}</Text>
              <Text style={s.dashCellLabel}>{language === 'si' ? 'සූර්ය අස්තමය' : t('sunset')}</Text>
            </View>
            <View style={s.dashCell}>
              <View style={[s.dashCellIcon, { backgroundColor: 'rgba(160,140,60,0.12)' }]}>
                <Ionicons name="sparkles-outline" size={18} color="#C8A960" />
              </View>
              <Text style={s.dashCellValue} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.7}>{tithiGuide ? tithiGuide.title : '--'}</Text>
              <Text style={s.dashCellLabel}>{tithiGuide ? tithiGuide.label : (language === 'si' ? 'තිථිය' : 'Tithi')}</Text>
            </View>
            <View style={s.dashCell}>
              <View style={[s.dashCellIcon, { backgroundColor: 'rgba(140,100,60,0.12)' }]}>
                <Ionicons name="infinite-outline" size={18} color="#B8860B" />
              </View>
              <Text style={s.dashCellValue} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.7}>{yogaGuide ? yogaGuide.title : '--'}</Text>
              <Text style={s.dashCellLabel}>{yogaGuide ? yogaGuide.label : (language === 'si' ? 'යෝගය' : 'Yoga')}</Text>
            </View>
          </View>
        </View>

        {/* ═══ RAHU KALAYA — Separate card, no scroll animation ═══ */}
        {data && data.rahuKalaya && (
          <View style={[s.rahuCard, rahuActive && s.rahuCardActive]}>
            <LinearGradient
              colors={rahuActive
                ? ['rgba(26,21,10,0.90)', 'rgba(80,20,20,0.25)', 'rgba(26,21,10,0.90)']
                : ['rgba(26,21,10,0.90)', 'rgba(10,40,25,0.20)', 'rgba(26,21,10,0.90)']
              }
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {rahuActive && (
              <Animated.View style={[s.rahuEdgeGlow, coronaPulseStyle]} />
            )}

            <View style={s.rahuCardTop}>
              <View style={s.rahuTitleRow}>
                <View style={[s.rahuIconCircle, rahuActive ? s.rahuIconCircleActive : s.rahuIconCircleSafe]}>
                  <Animated.View style={rahuActive ? coronaPulseStyle : undefined}>
                    <Ionicons
                      name={rahuActive ? 'warning' : 'shield-checkmark'}
                      size={20}
                      color={rahuActive ? '#FCA5A5' : '#6EE7B7'}
                    />
                  </Animated.View>
                </View>
                <Text
                  style={[s.rahuCardTitle, rahuActive && s.rahuCardTitleActive, language === 'si' && s.sinhalaTextFlow]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                >
                  {rahuActive
                    ? (language === 'si' ? 'දැඩි රාහු කාලය උදාවෙලා' : 'Caution Window')
                    : (language === 'si' ? 'අද දවසේ රාහු කාලය' : 'Caution Window')
                  }
                </Text>
              </View>
              <View style={s.rahuStatusBadge}>
                <Animated.View style={[s.rahuStatusDot, { backgroundColor: rahuActive ? '#EF4444' : '#34D399' }, rahuActive && coronaPulseStyle]} />
                <Text
                  style={[s.rahuStatusText, { color: rahuActive ? '#FCA5A5' : '#6EE7B7' }, language === 'si' && s.sinhalaTextFlow]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                >
                  {rahuActive
                    ? (language === 'si' ? 'මේ වෙලාවේ බලපවත්වයි' : 'ACTIVE')
                    : (language === 'si' ? 'රාහු කාලයෙන් නිදහස්' : 'SAFE')
                  }
                </Text>
              </View>
            </View>

            <View style={[s.rahuTimeRow, { backgroundColor: rahuActive ? 'rgba(239,68,68,0.06)' : 'rgba(0,0,0,0.15)' }]}>
              <View style={s.rahuTimeBlock}>
                <Text style={[s.rahuTimeLabel, language === 'si' && s.sinhalaTextFlow]}>{language === 'si' ? 'ඇරඹෙන වෙලාව' : 'Starts'}</Text>
                <Text style={[s.rahuTimeValue, rahuActive && s.rahuTimeValueActive]}>
                  {data.rahuKalaya.startFormatted ? data.rahuKalaya.startFormatted.display : toSLT(data.rahuKalaya.start, t)}
                </Text>
              </View>
              <View style={[s.rahuTimeDivider, { backgroundColor: rahuActive ? 'rgba(239,68,68,0.3)' : 'rgba(52,211,153,0.2)' }]} />
              <View style={s.rahuTimeBlock}>
                <Text style={[s.rahuTimeLabel, language === 'si' && s.sinhalaTextFlow]}>{language === 'si' ? 'අවසන් වන වෙලාව' : 'Ends'}</Text>
                <Text style={[s.rahuTimeValue, rahuActive && s.rahuTimeValueActive]}>
                  {data.rahuKalaya.endFormatted ? data.rahuKalaya.endFormatted.display : toSLT(data.rahuKalaya.end, t)}
                </Text>
              </View>
            </View>

            {getRahuCountdown() ? (
              <View style={[s.rahuCountdownBar, { backgroundColor: rahuActive ? 'rgba(239,68,68,0.12)' : 'rgba(52,211,153,0.08)' }]}>
                <Ionicons name="time-outline" size={13} color={rahuActive ? '#FCA5A5' : '#6EE7B7'} />
                <Text style={[s.rahuCountdownText, { color: rahuActive ? '#FCA5A5' : '#6EE7B7' }, language === 'si' && s.sinhalaTextFlow]}>
                  {rahuActive
                    ? (language === 'si' ? 'තව ' + getRahuCountdown() + ' කින් අවසන් වේ' : 'Ends in ' + getRahuCountdown())
                    : (language === 'si' ? 'තව ' + getRahuCountdown() + ' කින් ඇරඹේ' : 'Starts in ' + getRahuCountdown())
                  }
                </Text>
              </View>
            ) : null}

            <View style={s.rahuExplanationContainer}>
              <Text style={[s.rahuExplanationText, language === 'si' && s.sinhalaTextFlow]}>
                {language === 'si' 
                  ? 'රාහු කාලය යනු සුබ වැඩ පටන් ගැනීමට නුසුදුසු බව පිළිගැනෙන කෙටි කාල සීමාවකි.' 
                  : 'Rahu Kalaya is an inauspicious time window during which starting important new work is generally avoided.'}
              </Text>
            </View>

            <View style={[s.rahuCardBorder, { borderColor: rahuActive ? 'rgba(239,68,68,0.25)' : 'rgba(52,211,153,0.15)' }]} />
          </View>
        )}
      </View>
    );
  }

  /* Today's Sky info is now integrated into the dashboard hero */

  function scrollToWeeklyLagna() {
    try {
      if (scrollRef.current && weeklyLagnaY.current > 0) {
        scrollRef.current.scrollTo({ x: 0, y: weeklyLagnaY.current - 20, animated: true });
      } else if (scrollRef.current) {
        // Fallback: scroll to bottom area where weekly lagna usually is
        scrollRef.current.scrollToEnd({ animated: true });
      }
    } catch (e) {
      // silently ignore scroll errors
    }
  }

  /* ── Moon Phase Showcase — 15-day Lunar Timeline ── */
  // Memoize dates array + tithiNum so timeline items get stable dt objects
  var tithiNumForMoon = data && data.panchanga && data.panchanga.tithi && data.panchanga.tithi.number
    ? data.panchanga.tithi.number : getMoonPhaseFromDate();
  var moonDates = useMemo(function () {
    var today = new Date();
    var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var dayNamesSi = ['\u0d89\u0dbb\u0dd2','\u0dc3\u0dba\u0dd4','\u0d85\u0d9f','\u0db6\u0daf\u0dcf','\u0db6\u0dca\u200d\u0dbb','\u0dc3\u0dd2\u0d9a\u0dd4','\u0dc3\u0dd9\u0db1'];
    var arr = [];
    for (var di = -MOON_DAYS_RANGE; di <= MOON_DAYS_RANGE; di++) {
      var dd = new Date(today); dd.setDate(dd.getDate() + di);
      var neighborTithi = ((tithiNumForMoon + di - 1 + 300) % 30) + 1;
      var dayOfWeek = dd.getDay();
      arr.push({
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
    return arr;
  }, [tithiNumForMoon, language]);

  function renderMoonPhaseCard() {
    var tithiNum = tithiNumForMoon;
    var illum = tithiNum <= 15 ? (tithiNum - 1) / 14 : (30 - tithiNum) / 14;
    illum = Math.max(0, Math.min(1, illum));
    var illumPct = Math.round(illum * 100);

    var phaseNamesEn = ['New Moon','Waxing Crescent','First Quarter','Waxing Gibbous','Full Moon','Waning Gibbous','Last Quarter','Waning Crescent'];
    var phaseNamesSi = ['අමාවක','පුර පක්ෂයේ සිහින් සඳ','පුර අටවක','පිරීගෙන එන සඳ','පසළොස්වක පෝය','අඩුවීගෙන යන සඳ','අව අටවක','අව පක්ෂයේ සිහින් සඳ'];
    var phaseIdx = tithiNum <= 1 ? 0 : tithiNum <= 4 ? 1 : tithiNum <= 8 ? 2 : tithiNum <= 14 ? 3 : tithiNum === 15 ? 4 : tithiNum <= 19 ? 5 : tithiNum <= 23 ? 6 : 7;
    var phaseName = language === 'si' ? phaseNamesSi[phaseIdx] : phaseNamesEn[phaseIdx];

    var moonDisplaySize = Math.min(SCREEN_WIDTH * 0.68, 280);

    var dates = moonDates;

    var selectedTithi = ((tithiNum + selectedDayOffset - 1 + 300) % 30) + 1;
    var selIllum = selectedTithi <= 15 ? (selectedTithi - 1) / 14 : (30 - selectedTithi) / 14;
    selIllum = Math.max(0, Math.min(1, selIllum));
    var selIllumPct = Math.round(selIllum * 100);
    var selPhaseIdx = selectedTithi <= 1 ? 0 : selectedTithi <= 4 ? 1 : selectedTithi <= 8 ? 2 : selectedTithi <= 14 ? 3 : selectedTithi === 15 ? 4 : selectedTithi <= 19 ? 5 : selectedTithi <= 23 ? 6 : 7;
    var selPhaseName = language === 'si' ? phaseNamesSi[selPhaseIdx] : phaseNamesEn[selPhaseIdx];

    // Label for selected date
    var selDate = new Date(); selDate.setDate(selDate.getDate() + selectedDayOffset);
    var selDateLabel = selectedDayOffset === 0
      ? (language === 'si' ? 'අද' : 'Today')
      : selDate.toLocaleDateString('en', { month: 'short', day: 'numeric' });

    var lunarDust = [
      [18, 56, 1.2, 0.34], [42, 132, 0.9, 0.22], [64, 254, 1.1, 0.28], [92, 82, 0.7, 0.22],
      [118, 182, 1.4, 0.32], [138, 338, 0.8, 0.24], [166, 42, 1.0, 0.28], [192, 136, 0.7, 0.20],
      [214, 280, 1.2, 0.30], [242, 70, 0.8, 0.22], [268, 198, 1.5, 0.34], [296, 318, 0.9, 0.24],
      [324, 112, 1.0, 0.28], [342, 248, 0.7, 0.20], [30, 382, 0.8, 0.22], [78, 430, 1.1, 0.28],
      [128, 492, 0.7, 0.20], [204, 434, 1.0, 0.26], [276, 480, 0.9, 0.24], [334, 406, 1.2, 0.30],
    ];

    return (
      <Animated.View entering={FadeInDown.delay(550).springify()}>
        <View style={mp.pureSpaceContainer}>
          <LinearGradient
            colors={['#120B02', '#050301', '#000000', '#1A1003']}
            locations={[0, 0.36, 0.72, 1]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['rgba(218,165,32,0.24)', 'rgba(218,165,32,0.06)', 'transparent']}
            locations={[0, 0.42, 1]}
            style={mp.lunarGoldVeil}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
            pointerEvents="none"
          />
          <Svg width="100%" height="100%" viewBox="0 0 360 560" preserveAspectRatio="none" style={mp.lunarDustField} pointerEvents="none">
            {lunarDust.map(function (dot, i) {
              return <Circle key={'ld' + i} cx={dot[0]} cy={dot[1]} r={dot[2]} fill="#F4E4BC" opacity={dot[3]} />;
            })}
            <Line x1="38" y1="96" x2="112" y2="72" stroke="rgba(218,165,32,0.12)" strokeWidth="0.5" />
            <Line x1="226" y1="92" x2="320" y2="124" stroke="rgba(218,165,32,0.10)" strokeWidth="0.5" />
            <Line x1="52" y1="462" x2="146" y2="438" stroke="rgba(218,165,32,0.09)" strokeWidth="0.5" />
          </Svg>

           {/* Subtle Date Marker (Top) */}
          <Animated.View entering={FadeIn.delay(200).duration(500)} style={mp.subtleDateContainer}>
             <Text style={mp.lunarKicker}>{language === 'si' ? 'චන්ද්‍ර ගමන' : 'LUNAR CYCLE'}</Text>
             <Text style={mp.subtleDateText}>{selDateLabel.toUpperCase()}</Text>
          </Animated.View>

          {/* Central Moon with Ring Tracker */}
          <View style={mp.moonRingWrapper}>
            <Svg width={moonDisplaySize + 24} height={moonDisplaySize + 24} viewBox={`0 0 ${moonDisplaySize + 24} ${moonDisplaySize + 24}`} style={{ position: 'absolute' }}>
              <Circle
                cx={(moonDisplaySize + 24)/2} cy={(moonDisplaySize + 24)/2} r={(moonDisplaySize + 20)/2}
                stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" fill="none"
              />
              <Circle
                cx={(moonDisplaySize + 24)/2} cy={(moonDisplaySize + 24)/2} r={(moonDisplaySize + 20)/2}
                stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" fill="none"
                strokeDasharray={((moonDisplaySize + 20)/2) * 2 * Math.PI}
                strokeDashoffset={(((moonDisplaySize + 20)/2) * 2 * Math.PI) * (1 - selIllum)}
                strokeLinecap="round"
                rotation="-90" origin={`${(moonDisplaySize + 24)/2}, ${(moonDisplaySize + 24)/2}`}
              />
            </Svg>
            <RealisticMoon size={moonDisplaySize} tithiNum={selectedTithi} animate={!skipHeavy} showStars={!skipHeavy} />
          </View>

          {/* Elegant Typography */}
          <View style={mp.typographyWrapper}>
             <Text style={mp.elegantPhaseName}>{selPhaseName}</Text>
             <Text style={mp.illuminationPercentage}>{selIllumPct}% ILLUMINATION</Text>

             <Text style={mp.crispDescription}>
              {language === 'si'
                ? (selPhaseIdx <= 3 ? 'මෙම චන්ද්‍ර අවධිය අලුත් බලාපොරොත්තු සහ වර්ධනයේ කාලයකි. නව අරමුණු සහ ආරම්භයන් සඳහා ඉතා සුබය.' : selPhaseIdx === 4 ? 'චන්ද්‍රයාගේ උච්චතම ශක්තිය මේ මොහොතේ මුදාහැරේ. ඔබේ ඉලක්ක වෙනුවෙන් ක්‍රියා කිරීමට මෙම පැහැදිලි ශක්තිය භාවිතා කරන්න.' : 'මනස නිදහස් කරගෙන ආවර්ජනය කිරීමට සුදුසු කාලයකි. අනවශ්‍ය දේවල් අතහැර අලුත් ආරම්භයකට සූදානම් වන්න.')
                : 'This ' + selPhaseName + ' moon phase signifies ' + (selPhaseIdx <= 3 ? 'new beginnings and natural growth. An ideal time to start fresh projects and set meaningful intentions.' : selPhaseIdx === 4 ? 'peak lunar energy and clarity. Harness this powerful phase to take action on your goals.' : 'a time for deep reflection and rest. Release what no longer serves you and prepare for renewal.')}
            </Text>
          </View>

          {/* Horizontal Timeline (Moved Below Text) */}
          <ScrollView
            ref={moonScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={mp.timelineScrollPadded}
            decelerationRate="fast"
            snapToInterval={MOON_ITEM_W}
          >
            {dates.map(function (dt, i) {
              var isSelected = dt.offset === selectedDayOffset;
              var isKeyPhase = dt.tithi === 1 || dt.tithi === 15;
              return (
                <MoonTimelineItem
                  key={dt.offset}
                  dt={dt}
                  isSelected={isSelected}
                  isKeyPhase={isKeyPhase}
                  offset={dt.offset}
                  onSelect={setSelectedDayOffset}
                  mpStyles={mp}
                />
              );
            })}
          </ScrollView>
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
      { label: language === 'si' ? 'සෞඛ්‍යය හා කය' : 'Health', icon: 'fitness-outline', score: genScore(1), color: '#E07A7A' },
      { label: language === 'si' ? 'ගමන් බිමන් හා වෙනස්වීම්' : 'Travel', icon: 'navigate-outline', score: genScore(2), color: '#8AA8E0' },
      { label: language === 'si' ? 'මුදල් හා වාසි' : 'Money', icon: 'wallet-outline', score: genScore(3), color: '#E8C07A' },
      { label: language === 'si' ? 'රැකියාව හා ඉලක්ක' : 'Work', icon: 'briefcase-outline', score: genScore(4), color: '#B7A6F0' },
      { label: language === 'si' ? 'පවුල හා බැඳීම්' : 'Family', icon: 'people-outline', score: genScore(5), color: '#E07A9A' },
      { label: language === 'si' ? 'සතුට හා සුවය' : 'Beauty', icon: 'sparkles-outline', score: genScore(6), color: '#6FBFA0' },
    ];

    return (
      <Animated.View entering={FadeInDown.delay(680).springify()}>
        <View style={dr.card}>
          <LinearGradient colors={['#1A150A', '#15100A', '#0F0B06']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <Text style={dr.title}>{language === 'si' ? 'ඔයාගෙ කේන්දරේට අනුව අද දවස හැඩගැසෙන හැටි' : 'Daily horoscope ratings'}</Text>
          <View style={dr.grid}>
            {ratings.map(function (r, i) {
              return (
                <View key={i} style={dr.item}>
                  <View style={dr.labelRow}>
                    <View style={[dr.ratingIcon, { backgroundColor: r.color + '14', borderColor: r.color + '35' }]}>
                      <Ionicons name={r.icon} size={12} color={r.color} />
                    </View>
                    <Text style={dr.label}>{r.label}</Text>
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
    var numColors = [HT.gold, HT.purple, HT.success, HT.blue];

    return (
      <Animated.View entering={FadeInDown.delay(780).springify()}>
        <View style={ln.card}>
          <LinearGradient colors={['#1A150A', '#15100A', '#0F0B06']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
          <SectionHeader title={language === 'si' ? 'අද දවසේ ඔයාගේ ජය අංක' : "Today's lucky numbers"} iconName="trophy-outline" iconColor={HT.gold} delay={320} />
          <View style={ln.row}>
            {nums.map(function (n, i) {
              return (
                <Animated.View key={i} entering={FadeInUp.delay(400 + i * 80).springify()} style={[ln.circle, { borderColor: numColors[i] + '35' }]}>
                  <LinearGradient colors={[numColors[i] + '08', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
                  <Text style={[ln.num, { color: numColors[i] }]}>{n}</Text>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </Animated.View>
    );
  }

  /* ── Daily Intention ── */
  function renderDailyMantra() {
    var mantrasEn = [
      'My potential is limitless, and today I take one step closer to my goals.',
      'I am open to opportunities and ready to make the most of this day.',
      'I attract growth, peace, and meaningful progress into my life.',
      'My intuition is a powerful compass guiding me toward my highest purpose.',
      'I release fear and doubt, making space for clarity and confidence.',
      'I am in tune with my natural rhythm and ready for what today brings.',
      'Today, I choose calm over chaos and trust my journey completely.',
      'I trust the timing of my life, knowing great things are building.',
      'I am open to meaningful connections and life-changing opportunities.',
      'My energy is a positive force that inspires everyone I meet.',
      'I embrace every change with grace, courage, and an open heart.',
      'Every challenge I face is preparing me for something greater.',
      'I radiate confidence, self-respect, and inner balance.',
      'My path is clear, and I step forward with purpose and certainty.',
      'I am connected to my inner wisdom and the boundless possibilities ahead.',
    ];
    var mantrasSi = [
      'මගේ හැකියාවන්ට කිසිම සීමාවක් නෑ. අදත් මම මගේ අරමුණු වෙනුවෙන් එක පියවරක් හරි ඉස්සරහට තියනවා.',
      'අද දවස මා වෙනුවෙන් අලුත් අවස්ථා ගොඩක් අරගෙන එනවා; මම ඒකට ලෑස්තියි.',
      'මගේ ජීවිතේට වර්ධනය, සාමය සහ අර්ථවත් ජයග්‍රහණ විතරක් මම ළං කරගන්නවා.',
      'මගේ හිත කියන දේ මාව හරි පාරේ අරගෙන යන ලොකුම මාලිමාව කියලා මම දන්නවා.',
      'බය, සැක ඔක්කොම අත්හැරලා, හිතේ පැහැදිලි බව සහ විශ්වාසය එක්ක මම ඉස්සරහට යනවා.',
      'විශ්වයේ රිද්මයයි මගේ රිද්මයයි දැන් එකයි. අද දවසේ මොනවා ආවත් මම ඒකට ලෑස්තියි.',
      'කලබලකාරී දේවල් අයින් කරලා මම අද දවස නිදහසේම පදවගෙන යනවා.',
      'මගේ ජීවිතේ හොඳම දේවල් හැදීගෙන එනවා කියලා දන්න නිසා, මම හරිම විශ්වාසෙන් ඉන්නවා.',
      'ජීවිතේ වෙනස් කරන අවස්ථා සහ අලුත්, වැදගත් සම්බන්ධකම් වලට මම ගොඩක් විවෘතයි.',
      'මගේ හිනාවයි ධනාත්මක බවයි මට හමුවෙන හැමෝටම ලොකු හයියක් වෙනවා.',
      'ජීවිතේට එන වෙනස්වීම්, කරුණාවෙන් සහ ධෛර්යයෙන් පිළිගන්න මට පුළුවන්.',
      'මම මුහුණදෙන හැම අභියෝගයක්ම මාව ඊට වඩා ලොකු ජයග්‍රහණයකට ලෑස්ති කරනවා.',
      'ආත්ම විශ්වාසය, ගෞරවය සහ හිතේ නිදහස අද මගෙන් ලෝකෙටම විහිදෙනවා.',
      'මම යන්න ඕන පාර මට පැහැදිලියි, කිසිම බයක් නැතුව මම ඒ පාරේ අඩිය තියනවා.',
      'මගේ ඇතුළෙම තියෙන ශක්තියයි දැනුමයි එක්ක ඉදිරියට හැදෙන අවස්ථා ඔක්කොම මගේ කරගන්නවා.',
    ];
    var dayIdx = Math.floor(Date.now() / (24 * 60 * 60 * 1000)) % mantrasEn.length;

    return (
      <Animated.View entering={FadeInDown.delay(850).springify()}>
        <View style={mn.card}>
          <LinearGradient colors={['#1A150A', '#12100B', 'rgba(218,165,32,0.04)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <LinearGradient colors={['rgba(218,165,32,0.06)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', borderTopLeftRadius: 18, borderTopRightRadius: 18 }} />
          <View style={mn.starRow}>
            <View style={mn.starMark}>
              <Ionicons name="sparkles-outline" size={14} color={HT.gold} />
            </View>
            <Text style={mn.headerLabel}>{language === 'si' ? 'අද දවසට සාර්ථක සිතිවිල්ලක්' : 'INTENTION OF THE DAY'}</Text>
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

    var OUTLOOK_VISUAL = {
      favorable: { icon: 'trending-up-outline', color: '#34D399' },
      mixed: { icon: 'swap-horizontal-outline', color: '#FFB800' },
      challenging: { icon: 'alert-circle-outline', color: '#EF4444' },
    };

    return (
      <Animated.View entering={FadeInDown.delay(280).springify()}>
        <TouchableOpacity activeOpacity={0.7} onPress={scrollToWeeklyLagna}>
          <View style={s.wbCard}>
            <LinearGradient
              colors={['#1A150A', '#15100A', '#0F0B06']}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
            {/* Subtle top shimmer */}
            <LinearGradient
              colors={['rgba(218,165,32,0.06)', 'transparent']}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
            />
            {/* Decorative star dots */}
            {[[8, 15], [85, 20], [92, 70], [15, 75]].map(function (pos, i) {
              return <View key={i} style={{ position: 'absolute', left: pos[0] + '%', top: pos[1] + '%', width: 2, height: 2, borderRadius: 1, backgroundColor: 'rgba(218,165,32,' + (0.10 + i * 0.04) + ')' }} />;
            })}

            <View style={s.wbContent}>
              {/* Left: Icon + Text */}
              <View style={s.wbLeft}>
                <View style={s.wbIconWrap}>
                  <LinearGradient colors={['rgba(218,165,32,0.08)', 'rgba(218,165,32,0.03)']} style={StyleSheet.absoluteFill} />
                  <Ionicons name="telescope-outline" size={22} color="#DAA520" />
                </View>
                <View style={s.wbTextCol}>
                  <Text style={s.wbTitle}>{language === 'si' ? 'මේ සතියේ ඔයාගේ ලග්න පලාපල' : 'Weekly Forecast'}</Text>
                  {weekLabel ? <Text style={s.wbWeek}>{weekLabel}</Text> : null}
                  {userReport ? (
                    <View style={s.wbTeaser}>
                      <Ionicons
                        name={(OUTLOOK_VISUAL[userReport.outlook] || OUTLOOK_VISUAL.mixed).icon}
                        size={12}
                        color={(OUTLOOK_VISUAL[userReport.outlook] || OUTLOOK_VISUAL.mixed).color}
                      />
                      <Text style={s.wbTeaserText}>
                        {language === 'si'
                          ? 'ඔයාගේ ' + userReport.nameSi + ' ලග්නය — ' + (userReport.outlook === 'favorable' ? 'මේ සතිය ගොඩක් හොඳයි' : userReport.outlook === 'challenging' ? 'මේ සතියේ පරිස්සම් වෙන්න' : 'මේ සතිය මිශ්‍රයි')
                          : 'Your ' + userReport.nameEn + ' — ' + (userReport.outlook || 'mixed')
                        }
                      </Text>
                    </View>
                  ) : (
                    <Text style={s.wbSub}>
                      {language === 'si' ? 'අලුත් සතියට ග්‍රහ කිරණ බලපාන හැටි' : 'Weekly forecasts for all 12 lagnas'}
                    </Text>
                  )}
                </View>
              </View>

              {/* Right: Arrow */}
              <View style={s.wbArrow}>
                <Ionicons name="chevron-down" size={16} color="#DAA520" />
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
    var birthFocusGuide = nakshatra ? getPanchangaGuidance('nakshatra', nakshatra, language) : null;
    var nakName = birthFocusGuide ? birthFocusGuide.title : '--';
    var lagnaIdx = lagna?.rashiId ? lagna.rashiId - 1 : 0;

    return (
      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <View style={s.glassIdentity}>
          <LinearGradient colors={['#1A150A', '#15100A', '#0F0B06', '#12100B']} locations={[0, 0.3, 0.65, 1]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <LinearGradient colors={['rgba(218,165,32,0.06)', 'transparent', 'rgba(218,165,32,0.04)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <LinearGradient colors={['rgba(218,165,32,0.08)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', borderTopLeftRadius: 22, borderTopRightRadius: 22 }} />
          {/* Inner frame */}
          <View style={{ position: 'absolute', top: 5, left: 5, right: 5, bottom: 5, borderRadius: 18, borderWidth: 0.5, borderColor: 'rgba(218,165,32,0.12)' }} />

          {/* Title */}
          <View style={s.glassIdHeader}>
            <View style={s.glassIdMark}>
              <Ionicons name="finger-print-outline" size={15} color={HT.gold} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.glassIdKicker}>{language === 'si' ? 'ඔබේ උපන් ග්‍රහ මුද්‍රාව' : 'BIRTH SIGNATURE'}</Text>
              <Text style={s.glassIdTitle}>{language === 'si' ? 'ඔබේ ග්‍රහ අනන්‍යතාව' : 'Your Cosmic Identity'}</Text>
            </View>
          </View>

          {/* ═══ LAGNA HERO — Big featured card ═══ */}
          <View style={s.lagnaHero}>
            <LinearGradient colors={['rgba(218,165,32,0.10)', 'rgba(147,51,234,0.04)', 'rgba(0,0,0,0)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={s.lagnaHeroLeft}>
              <View style={s.lagnaSignBig}>
                <LinearGradient colors={['rgba(244,228,188,0.13)', 'rgba(218,165,32,0.04)', 'rgba(0,0,0,0.20)']} style={StyleSheet.absoluteFillObject} />
                <View style={s.lagnaSignHalo} />
                <Image source={ZODIAC_IMAGES[lagnaIdx]} style={s.lagnaSignImage} />
              </View>
            </View>
            <View style={s.lagnaHeroRight}>
              <Text style={[s.lagnaHeroLabel, { color: HT.textMuted }]}>{language === 'si' ? 'ලග්නය' : 'RISING SIGN'}</Text>
              <Text style={[s.lagnaHeroName, { color: HT.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{lagnaName}</Text>
              {lagnaEn && language === 'si' ? <Text style={[s.lagnaHeroSub, { color: HT.textGold }]}>{lagnaEn}</Text> : null}
              {lagna?.lord ? (
                <View style={s.lagnaLordPill}>
                  <Ionicons name="planet" size={11} color={HT.gold} />
                  <Text style={s.lagnaLordText}>{language === 'si' ? 'පාලක ග්‍රහයා: ' : 'Ruling Energy: '}{language === 'si' && PLANET_NAMES_SI[lagna.lord] ? PLANET_NAMES_SI[lagna.lord] : lagna.lord}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* ═══ 3 MINI GLASS CARDS — Moon / Sun / Nakshatra ═══ */}
          <View style={s.glassTrioRow}>
            <Animated.View entering={FadeInDown.delay(400).springify()} style={[s.glassTrioCard, { borderColor: HT.blueBg }]}>
              <LinearGradient colors={[HT.blueBg, 'transparent']} style={StyleSheet.absoluteFill} />
              <View style={[s.glassTrioIcon, { borderColor: HT.blue + '35', backgroundColor: HT.blue + '12' }]}>
                <Ionicons name="moon" size={14} color={HT.blue} />
              </View>
              <Text style={[s.glassTrioLabel, { color: HT.textMuted }]}>{language === 'si' ? 'චන්ද්‍ර රාශිය' : 'Moon Energy'}</Text>
              <Text style={[s.glassTrioValue, { color: HT.blue }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72}>{moonName}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(460).springify()} style={[s.glassTrioCard, { borderColor: HT.goldBorder }]}>
              <LinearGradient colors={[HT.goldSubtle, 'transparent']} style={StyleSheet.absoluteFill} />
              <View style={[s.glassTrioIcon, { borderColor: HT.gold + '35', backgroundColor: HT.gold + '12' }]}>
                <Ionicons name="sunny" size={14} color={HT.gold} />
              </View>
              <Text style={[s.glassTrioLabel, { color: HT.textMuted }]}>{language === 'si' ? 'සූර්ය රාශිය' : 'Sun Energy'}</Text>
              <Text style={[s.glassTrioValue, { color: HT.gold }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72}>{sunName}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(520).springify()} style={[s.glassTrioCard, { borderColor: HT.tealBg }]}>
              <LinearGradient colors={[HT.tealBg, 'transparent']} style={StyleSheet.absoluteFill} />
              <View style={[s.glassTrioIcon, { borderColor: HT.teal + '35', backgroundColor: HT.teal + '12' }]}>
                <Ionicons name="sparkles" size={14} color={HT.teal} />
              </View>
              <Text style={[s.glassTrioLabel, { color: HT.textMuted }]}>{language === 'si' ? 'උපන් නැකත' : 'Birth Focus'}</Text>
              <Text style={[s.glassTrioValue, { color: HT.teal }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.68}>{nakName}</Text>
            </Animated.View>
          </View>

          {/* ═══ 3 MINI GLASS CARDS — Row 2: Nakshatra Pada / Lord / Lagna Nature ═══ */}
          <View style={[s.glassTrioRow, { paddingTop: 0 }]}>
            <Animated.View entering={FadeInDown.delay(560).springify()} style={[s.glassTrioCard, { borderColor: 'rgba(168,85,247,0.12)' }]}>
              <LinearGradient colors={['rgba(168,85,247,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
              <View style={[s.glassTrioIcon, { borderColor: 'rgba(168,85,247,0.35)', backgroundColor: 'rgba(168,85,247,0.12)' }]}>
                <Ionicons name="leaf" size={14} color="#A855F7" />
              </View>
              <Text style={[s.glassTrioLabel, { color: HT.textMuted }]}>{language === 'si' ? 'ස්වභාව රටාව' : 'Nature Style'}</Text>
              <Text style={[s.glassTrioValue, { color: '#A855F7' }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.68}>{nakshatra?.lord ? (language === 'si' ? nakshatra.lord + ' බලය' : nakshatra.lord + ' Ruled') : '--'}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(620).springify()} style={[s.glassTrioCard, { borderColor: 'rgba(34,211,153,0.12)' }]}>
              <LinearGradient colors={['rgba(34,211,153,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
              <View style={[s.glassTrioIcon, { borderColor: 'rgba(34,211,153,0.35)', backgroundColor: 'rgba(34,211,153,0.12)' }]}>
                <Ionicons name="sync" size={14} color="#22D399" />
              </View>
              <Text style={[s.glassTrioLabel, { color: HT.textMuted }]}>{language === 'si' ? 'ජීවන රිද්මය' : 'Life Rhythm'}</Text>
              <Text style={[s.glassTrioValue, { color: '#22D399' }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.68}>{nakshatra?.pada ? (language === 'si' ? 'පාද ' + nakshatra.pada : 'Pada ' + nakshatra.pada + '/4') : '--'}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(680).springify()} style={[s.glassTrioCard, { borderColor: 'rgba(251,191,36,0.12)' }]}>
              <LinearGradient colors={['rgba(251,191,36,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
              <View style={[s.glassTrioIcon, { borderColor: 'rgba(251,191,36,0.35)', backgroundColor: 'rgba(251,191,36,0.12)' }]}>
                <Ionicons name="star" size={14} color="#FBBF24" />
              </View>
              <Text style={[s.glassTrioLabel, { color: HT.textMuted }]}>{language === 'si' ? 'උපන් ගුණය' : 'Birth Quality'}</Text>
              <Text style={[s.glassTrioValue, { color: '#FBBF24' }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.68}>{lagna?.lord ? (language === 'si' ? lagna.lord + ' ශක්තිය' : lagna.lord + ' Power') : '--'}</Text>
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
        <SectionHeader title={language === 'si' ? 'ඔයාගේ කේන්දර සටහන' : 'Your Birth Chart'} iconName="planet-outline" iconColor={HT.gold} delay={350} />
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
    var lagnaCopy = getLagnaUiCopy(chartData);
    var palapalaTitle = language === 'si' ? (ld.sinhala || 'ලග්න පලාපල') : stripSinhalaParenthetical(ld.english || 'Your Rising Sign Reading');
    var palapalaDescription = language === 'si'
      ? ((lagnaCopy && lagnaCopy.readingSi) || ld.descriptionSi || ld.description)
      : ((lagnaCopy && lagnaCopy.readingEn) || stripSinhalaParenthetical(ld.description));
    var palapalaTraits = language === 'si'
      ? ((lagnaCopy && lagnaCopy.traitsSi) || ld.traitsSi || [])
      : ((lagnaCopy && lagnaCopy.traitsEn) || ld.traits || []);
    var gemValue = localizedLagnaValue(lagnaCopy, 'gem', ld.gem, language);
    var colorValue = localizedLagnaValue(lagnaCopy, 'color', ld.luckyColor, language);
    return (
      <CosmicCard variant="content" delay={400}>
        <SectionHeader title={palapalaTitle} iconName="sparkles-outline" iconColor={HT.gold} delay={400} />
        <Text style={s.palapalaText}>
          {palapalaDescription}
        </Text>
        {palapalaTraits && palapalaTraits.length > 0 && (
          <View style={s.traitsRow}>
            {palapalaTraits.map(function (trait, i) {
              return (
                <View key={i} style={s.traitChip}>
                  <Text style={s.traitText}>{trait}</Text>
                </View>
              );
            })}
          </View>
        )}
        <View style={s.luckyRow}>
          {gemValue ? (
            <View style={s.luckyItem}>
              <View style={s.luckyItemIcon}><Ionicons name="diamond-outline" size={14} color={HT.gold} /></View>
              <Text style={s.luckyLabel}>{gemValue}</Text>
            </View>
          ) : null}
          {colorValue ? (
            <View style={s.luckyItem}>
              <View style={s.luckyItemIcon}><Ionicons name="color-palette-outline" size={14} color={HT.gold} /></View>
              <Text style={s.luckyLabel}>{colorValue}</Text>
            </View>
          ) : null}
        </View>
      </CosmicCard>
    );
  }

  /* ── Personality Traits ── */
  function renderPersonality() {
    if (!chartData || !chartData.personality) return null;
    var p = chartData.personality;
    var lagnaCopy = getLagnaUiCopy(chartData);
    var personalitySummary = lagnaCopy ? (language === 'si' ? lagnaCopy.personalitySi : lagnaCopy.personalityEn) : null;
    var traitsSource = language === 'si'
      ? ((lagnaCopy && lagnaCopy.traitsSi) || p.mainTraitsSi || [])
      : ((lagnaCopy && lagnaCopy.traitsEn) || p.lagnaTraits || p.sunTraits || []);
    if ((!traitsSource || traitsSource.length === 0) && language !== 'si') {
      traitsSource = [].concat(p.lagnaTraits || [], p.moonTraits || [], p.sunTraits || []);
    }
    var uniqueTraits = traitsSource.filter(function (tr, i) { return traitsSource.indexOf(tr) === i; }).slice(0, 8);
    if (uniqueTraits.length === 0 && !personalitySummary) return null;
    var traitColors = ['#FF8C00', '#93C5FD', '#FFB800', '#F87171', '#34D399', '#6EE7B7', '#FFD666', '#A78BFA'];

    return (
      <CosmicCard variant="content" delay={450}>
        <SectionHeader title={language === 'si' ? 'ලග්නයෙන් පෙනෙන ඔයාගේ ගති ලක්ෂණ' : 'Your Personality Pattern'} iconName="person-outline" iconColor={HT.gold} delay={450} />
        {personalitySummary ? <Text style={s.personalityIntro}>{personalitySummary}</Text> : null}
        {uniqueTraits.length > 0 ? (
          <View style={s.personalityWrap}>
            {uniqueTraits.map(function (trait, i) {
              return (
                <Animated.View key={i} entering={FadeInUp.delay(500 + i * 40).springify()} style={[s.personalityPill, { borderColor: traitColors[i % traitColors.length] + '28' }]}>
                  <Text style={[s.personalityText, { color: traitColors[i % traitColors.length] }]}>{trait}</Text>
                </Animated.View>
              );
            })}
          </View>
        ) : null}
      </CosmicCard>
    );
  }

  /* ── Cosmic Shield — Jyotish Daily Intelligence ── */
  function renderCosmicShield() {
    if (!jyotishToday) return null;
    var ds = jyotishToday.dishaShoola;
    var ch = jyotishToday.chandrashtama;
    var tb = jyotishToday.taraBalam;

    var DIRECTION_ICONS = { North: 'arrow-up-outline', South: 'arrow-down-outline', East: 'arrow-forward-outline', West: 'arrow-back-outline', NE: 'navigate-outline', NW: 'navigate-outline', SE: 'navigate-outline', SW: 'navigate-outline' };
    var DIR_LABELS = {
      North: language === 'si' ? 'උතුර' : 'North',
      South: language === 'si' ? 'දකුණ' : 'South',
      East: language === 'si' ? 'නැගෙනහිර' : 'East',
      West: language === 'si' ? 'බටහිර' : 'West',
      NE: language === 'si' ? 'ඊසාන' : 'North-East',
      NW: language === 'si' ? 'වයඹ' : 'North-West',
      SE: language === 'si' ? 'ගිනිකොන' : 'South-East',
      SW: language === 'si' ? 'නිරිත' : 'South-West',
    };

    var chActive = ch && ch.isActive;
    var taraScore = tb && typeof tb.score === 'number' ? tb.score : null;
    var taraColor = taraScore != null ? (taraScore >= 70 ? HT.success : taraScore >= 40 ? HT.gold : HT.danger) : HT.gold;
    var taraLabel = taraScore != null
      ? (taraScore >= 70 ? (language === 'si' ? 'ඉතාමත් සුබයි' : 'Strong Support') : taraScore >= 40 ? (language === 'si' ? 'සාමාන්‍යයි' : 'Mixed Support') : (language === 'si' ? 'සැලකිලිමත් වන්න' : 'Extra Care'))
      : (language === 'si' ? 'සාමාන්‍යයි' : 'Use Care');

    return (
      <Animated.View entering={FadeInDown.delay(320).springify()}>
        <CosmicCard variant="content" delay={320}>
          <SectionHeader title={language === 'si' ? 'අද දවසට ග්‍රහ බලපෑම' : 'Cosmic Shield'} iconName="shield-checkmark-outline" iconColor={HT.gold} delay={320} />

          {/* ── Chandrashtama Alert Strip ── */}
          <View style={[cs.alertStrip, chActive ? cs.alertDanger : cs.alertSafe]}>
            {chActive && <LinearGradient colors={[HT.dangerBg, 'transparent']} style={StyleSheet.absoluteFill} />}
            {!chActive && <LinearGradient colors={[HT.successBg, 'transparent']} style={StyleSheet.absoluteFill} />}
            <View style={[cs.alertIconWrap, chActive ? cs.alertIconDanger : cs.alertIconSafe]}>
              <Ionicons name={chActive ? 'moon' : 'shield-checkmark'} size={18} color={chActive ? HT.danger : HT.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[cs.alertTitle, chActive && cs.alertTitleDanger]}>
                {chActive
                  ? (language === 'si' ? 'තීරණ ගැනීමේදී දෙවරක් සිතන්න' : 'Extra Care Today')
                  : (language === 'si' ? 'අද දවස ඔයාට සාමකාමීයි' : 'Support Looks Good')}
              </Text>
              <Text style={[cs.alertDesc, chActive && cs.alertDescDanger]}>
                {chActive
                  ? (language === 'si' ? 'චන්ද්‍රාෂ්ඨම දිනයක් බැවින් අද දවසේ අලුත් වැඩ ආරම්භයට සහ වැදගත් තීරණ වලට එතරම් සුබ නැත.' : 'Avoid major decisions today')
                  : (language === 'si' ? 'ග්‍රහලෝක වල ගමන්මග ඔයාට හිතකර නිසා අද දවස කරදර නැතුව ගෙවිලා යයි.' : 'Moon transit is favorable today')}
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
                <View style={[cs.shieldIcon, { borderColor: taraColor + '30', backgroundColor: taraColor + '12' }]}>
                  <Ionicons name="star-outline" size={16} color={taraColor} />
                </View>
                <Text style={cs.shieldLabel}>{language === 'si' ? 'අද දවසේ තාරකා බලය' : 'Personal Support'}</Text>
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
              <View style={[cs.shieldCard, { borderColor: 'rgba(139,126,200,0.15)' }]}>
                <LinearGradient colors={[HT.purpleBg, 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <View style={[cs.shieldIcon, { borderColor: HT.purple + '30', backgroundColor: HT.purple + '12' }]}>
                  <Ionicons name="compass-outline" size={16} color={HT.purple} />
                </View>
                <Text style={cs.shieldLabel}>{language === 'si' ? 'ගමන් බිමන් වලට අසුබ දිශාවන්' : 'Travel Compass'}</Text>
                {/* Compass mini display */}
                <View style={cs.compassGrid}>
                  {['North', 'South', 'East', 'West'].map(function (dir) {
                    var isBad = ds.avoidDirection === dir || (ds.avoidDirections && ds.avoidDirections.indexOf(dir) !== -1);
                    return (
                      <View key={dir} style={[cs.compassDir, isBad && cs.compassDirBad]}>
                        <Ionicons name={DIRECTION_ICONS[dir] || 'ellipse'} size={10} color={isBad ? HT.danger : HT.success} />
                        <Text style={[cs.compassDirText, isBad && cs.compassDirTextBad]}>{DIR_LABELS[dir] || dir}</Text>
                      </View>
                    );
                  })}
                </View>
                {ds.avoidDirection && (
                  <View style={cs.avoidPill}>
                    <Ionicons name="close-circle" size={10} color={HT.danger} />
                    <Text style={cs.avoidPillText}>{language === 'si' ? 'අද අවාසිදායකයි: ' : 'Avoid: '}{DIR_LABELS[ds.avoidDirection] || ds.avoidDirection}</Text>
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
    var yogaColors = [HT.gold, HT.purple, HT.success, HT.rose, HT.blue, HT.goldDark];
    return (
      <Animated.View entering={FadeInDown.delay(340).springify()}>
        <CosmicCard variant="surface" delay={340}>
          <SectionHeader title={language === 'si' ? 'අද දවසේ විශේෂ ග්‍රහ බලපෑම්' : "Today's Cosmic Patterns"} iconName="git-network-outline" iconColor={HT.gold} delay={340} />
          <View style={cs.yogaWrap}>
            {jyotishToday.specialYogas.slice(0, 6).map(function (yoga, i) {
              var yColor = yogaColors[i % yogaColors.length];
              var rawName = typeof yoga === 'string' ? yoga : (yoga.name || yoga.yoga || '');
              var rawDesc = typeof yoga === 'object' ? (yoga.description || yoga.result || '') : '';
              var isCautionPattern = (typeof yoga === 'object' && yoga.isAuspicious === false) || /avoid|challenging|inauspicious|difficult|bad|obstacle/i.test(rawName + ' ' + rawDesc);
              var yName = isCautionPattern
                ? (language === 'si' ? 'කල්පනාකාරී වියයුතු කාලයක්' : 'Careful Timing Pattern')
                : (language === 'si' ? 'ඉතාම හොඳ කාලයක්' : 'Supportive Timing Pattern');
              var yDesc = isCautionPattern
                ? (language === 'si' ? 'හදිසි තීරණ ගැනීමේදී ටිකක් පරිස්සම් වෙන්න. මොනදේ කලත් දෙවරක් හිතලා බලන්න.' : 'Double-check important work and avoid rushed decisions.')
                : (language === 'si' ? 'දිගුකාලීන සැලසුම් වලට, අලුත් තීරණ වලට මේ වෙලාව ගොඩක් හොඳයි.' : 'Use it for steady progress, planning, and well-considered choices.');
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

    var rows = [
      { kind: 'tithi', entry: data.panchanga.tithi, color: HT.gold, icon: 'sparkles-outline' },
      { kind: 'nakshatra', entry: data.panchanga.nakshatra, color: HT.blue, icon: 'star-outline' },
      { kind: 'yoga', entry: data.panchanga.yoga, color: HT.success, icon: 'infinite-outline' },
      { kind: 'karana', entry: data.panchanga.karana, color: HT.goldDark, icon: 'time-outline' },
      { kind: 'vaara', entry: data.panchanga.vaara, color: HT.rose, icon: 'planet-outline' },
    ];

    return (
      <CosmicCard variant="surface" delay={500}>
        <SectionHeader title={language === 'si' ? 'අද දවසේ පංචාංගය' : t('sacredPanchanga')} subtitle={language === 'si' ? 'අද දවසට අදාළ නැකැත්, තිථි සහ යෝග විස්තර' : t('sacredPanchangaHint')} iconName="sparkles-outline" iconColor={HT.gold} delay={500} />
        {/* Tap hint */}
        <View style={s.pTapHintRow}>
          <Ionicons name="hand-left-outline" size={12} color={HT.textMuted} />
          <Text style={s.pTapHint}>{t('tapToLearn')}</Text>
        </View>
        {rows.map(function (row, i) {
          var entry = row.entry, color = row.color, icon = row.icon;
          if (!entry) return null;
          var guide = getPanchangaGuidance(row.kind, entry, language);
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
                    <Text style={[s.pLabel, { color }]}>{guide.label}</Text>
                    <Text style={s.pHintText}>{guide.hint}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={s.pValue}>{guide.title}</Text>
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
                    <Text style={s.pGuideTitle}>{guide.meaning}</Text>
                    <View style={s.pGuideBlock}>
                      <Text style={s.pGuideKicker}>{language === 'si' ? 'ඔයාට බලපාන විදිහ' : 'How it affects you'}</Text>
                      <Text style={s.pExplainText}>{guide.effect}</Text>
                    </View>
                    <View style={s.pGuideColumns}>
                      <View style={s.pGuideColumn}>
                        <Text style={[s.pGuideKicker, { color: HT.success }]}>{language === 'si' ? 'කරන්න' : 'Do'}</Text>
                        {guide.dos.map(function (item, gi) {
                          return <Text key={'d' + gi} style={s.pGuideItem}>• {item}</Text>;
                        })}
                      </View>
                      <View style={s.pGuideColumn}>
                        <Text style={[s.pGuideKicker, { color: HT.danger }]}>{language === 'si' ? 'නොකරන්න' : "Don't"}</Text>
                        {guide.donts.map(function (item, gi) {
                          return <Text key={'x' + gi} style={s.pGuideItem}>• {item}</Text>;
                        })}
                      </View>
                    </View>
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
  function getAuspiciousAdvice(period) {
    var name = (period && period.name) || '';
    var ruler = (period && period.ruler) || '';
    var type = (period && period.type) || '';
    var key = ruler || name;

    if (type === 'spiritual' || /Brahma/i.test(name)) {
      return language === 'si'
        ? { title: 'භාවනාව සහ අධ්‍යාපනයට', detail: 'දවසේ වැඩ සැලසුම් කරන්න, අලුත් දේවල් ඉගෙනගන්න සහ මතක තබාගන්න ඉතාමත් සුබ වෙලාවක්.' }
        : { title: 'Prayer, meditation, study', detail: 'Set intentions, read, reflect, and plan the day calmly.' };
    }
    if (/Abhijit/i.test(name)) {
      return language === 'si'
        ? { title: 'මූලික හා වැදගත් වැඩ අරඹන්න', detail: 'ඔප්පු අත්සන් කිරීම්, රැකියා ඉල්ලීම්, සම්මුඛ පරීක්ෂණ සහ අලුත් තීරණ ගැනීමට ඉතා සුබ වෙලාවක්.' }
        : { title: 'Start important work', detail: 'Good for signatures, applications, meetings, and key decisions.' };
    }

    var advice = {
      Mercury: {
        en: ['Learning and communication', 'Good for writing, calls, messages, calculations, and business tasks.'],
        si: ['අධ්‍යාපනයට සහ ගනුදෙනු වලට', 'ඉගෙනීම් වැඩ, ලියකියවිලි, සාකච්ඡා සහ ව්‍යාපාරික ගනුදෙනු වලින් සාර්ථක ප්‍රතිඵල ලැබෙන වෙලාවක්.'],
      },
      Moon: {
        en: ['Home and family tasks', 'Good for family talks, calm tasks, food, and household work.'],
        si: ['ගෘහස්ථ හා පවුලේ කටයුතු වලට', 'පවුලේ අය සමඟ සාකච්ඡා, නිවසේ වැඩකටයුතු සහ ආහාර වලට සම්බන්ධ දේවල් ආරම්භයට හොඳයි.'],
      },
      Jupiter: {
        en: ['Advice, money, education', 'Good for guidance, learning, money planning, and religious work.'],
        si: ['මුදල්, උපදෙස් සහ අධ්‍යාපනයට', 'වැදගත් උපදෙස් ලබාගැනීම, මුදල් ආයෝජන, මූල්‍ය සැලසුම් සහ ආගමික කටයුතු වලට වඩාත් සුබයි.'],
      },
      Venus: {
        en: ['Love and beauty work', 'Good for shopping, clothing, art, and relationship conversations.'],
        si: ['අලංකරණ හා කලා කටයුතු වලට', 'අලුත් ඇඳුම් පැළඳුම් මිලදීගන්න, රූපලාවන්‍ය වැඩ, කලා නිර්මාණ සහ විවාහ කතාබහ වලට සුබ වෙලාවක්.'],
      },
      Sun: {
        en: ['Leadership and official work', 'Good for presentations, authority meetings, and clarifying decisions.'],
        si: ['රජයේ හා පරිපාලන කටයුතු වලට', 'රජයේ ආයතන, ප්‍රධානීන් හමුවීම්, සම්මුඛ පරීක්ෂණ සහ වගකීම් භාරගැනීමට සුබ වෙලාවක්.'],
      },
      Mars: {
        en: ['High-energy tasks', 'Good for quick action, physical effort, sport, and challenges.'],
        si: ['ක්‍රියාශීලී හා දැඩි කටයුතු වලට', 'ඉක්මනින් කළ යුතු වැඩ, ක්‍රීඩා කටයුතු, තරඟකාරී වැඩ සහ අභියෝගාත්මක තීරණ වලට හොඳයි.'],
      },
      Saturn: {
        en: ['Responsibility and order', 'Good for finishing old work, cleaning, and organizing files.'],
        si: ['පැරණි හා ව්‍යූහාත්මක වැඩ වලට', 'අධික වෙහෙසක් අවශ්‍ය වැඩ, කල්ගිය වැඩ නිම කිරීම, පිරිසිදු කිරීම සහ ගොවිපළ කටයුතු වලට සුබයි.'],
      },
    };

    if (advice[key]) {
      var selected = language === 'si' ? advice[key].si : advice[key].en;
      return { title: selected[0], detail: selected[1] };
    }

    return language === 'si'
      ? { title: 'වැදගත් ලිපිපිලේ වැඩ වලට', detail: 'සියලුම සාමාන්‍ය වැදගත් කටයුතු සැලසුම් සහගතව වගකීමෙන් යුතුව ආරම්භ කරන්න සුබ වෙලාවක්.' }
      : { title: 'General important work', detail: 'A good time to begin with calm planning and focus.' };
  }

  function renderAuspicious() {
    if (!data || !data.auspiciousPeriods || data.auspiciousPeriods.length === 0) return null;
    return (
      <CosmicCard variant="surface" delay={550}>
        <SectionHeader
          title={language === 'si' ? 'අද දවසේ සුබ මුහුර්ත' : t('auspiciousAlignments')}
          subtitle={language === 'si' ? 'ඔයාගේ එදිනෙදා වැඩකටයුතු සාර්ථක කරගන්න කියාපු වෙලාවන්' : t('auspiciousAlignmentsHint')}
          iconName="leaf-outline"
          iconColor={HT.success}
          delay={550}
        />
        {data.auspiciousPeriods.map(function (p, i) {
          var advice = getAuspiciousAdvice(p);
          return (
            <View key={i} style={s.auspRow}>
              <LinearGradient colors={['#34D399', '#059669']} style={s.auspBar} />
              <View style={{ flex: 1 }}>
                <Text style={s.auspName}>{advice.title}</Text>
                <Text style={s.auspSinhala}>{advice.detail}</Text>
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
  function weeklyShareLabel() {
    if (!weeklyLagna) return '';
    var ws = weeklyLagna.weekStart ? new Date(weeklyLagna.weekStart).toLocaleDateString(language === 'si' ? 'si-LK' : 'en-US', { month: 'short', day: 'numeric' }) : '';
    var we = weeklyLagna.weekEnd ? new Date(weeklyLagna.weekEnd).toLocaleDateString(language === 'si' ? 'si-LK' : 'en-US', { month: 'short', day: 'numeric' }) : '';
    return ws && we ? ws + ' – ' + we : '';
  }

  async function handleShareWeekly(report) {
    if (sharingBusy) return;
    console.log('[ShareWeekly] start', report.nameEn, Platform.OS);
    try {
      setSharingBusy(true);
      setShareReport(report);

      var baseName = String(report.nameEn || 'forecast').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      var pages = [1, 2, 3];
      var uris = [];

      for (var i = 0; i < pages.length; i++) {
        setSharePageNum(pages[i]);
        // Wait for re-render + paint
        await new Promise(function (r) { setTimeout(r, Platform.OS === 'web' ? 600 : 350); });
        console.log('[ShareWeekly] capturing page', pages[i], 'ref:', !!shareCardRef.current);
        if (!shareCardRef.current) throw new Error('card-not-ready-page-' + pages[i]);

        if (Platform.OS === 'web') {
          var node = shareCardRef.current;
          var dataUri = await htmlToImage.toPng(node, {
            width: 360,
            height: 640,
            pixelRatio: 3,
            backgroundColor: '#04030C',
          });
          uris.push(dataUri);
        } else {
          var uri = await captureRef(shareCardRef, {
            format: 'png',
            quality: 1,
            result: 'tmpfile',
            width: 1080,
            height: 1920,
          });
          uris.push(uri);
        }
      }

      console.log('[ShareWeekly] captured all 3 pages');

      if (Platform.OS === 'web') {
        // Download all 3 images with a slight delay between
        for (var j = 0; j < uris.length; j++) {
          var fileName = 'grahachara-' + baseName + '-' + (j + 1) + '.png';
          var link = document.createElement('a');
          link.href = uris[j];
          link.download = fileName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          if (j < uris.length - 1) {
            await new Promise(function (r) { setTimeout(r, 400); });
          }
        }
        console.log('[ShareWeekly] all 3 downloads triggered');
      } else {
        // Native: save to gallery + share first image
        var savedToGallery = false;
        try {
          // writeOnly: true -> only requests save/write access, never the
          // READ_MEDIA_IMAGES / READ_MEDIA_VIDEO permissions (Android 13+).
          var perm = await MediaLibrary.requestPermissionsAsync(true);
          if (perm && (perm.granted || perm.accessPrivileges === 'limited')) {
            for (var k = 0; k < uris.length; k++) {
              await MediaLibrary.saveToLibraryAsync(uris[k]);
            }
            savedToGallery = true;
          }
        } catch (e) { /* optional */ }

        var canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uris[0], {
            mimeType: 'image/png',
            UTI: 'public.png',
            dialogTitle: language === 'si' ? '\u0D94\u0DBA\u0DCF\u0D9C\u0DD9 \u0DC3\u0DAD\u0DD2\u0DBA\u0DD9 \u0DB4\u0DBD\u0DCF\u0DB4\u0DBD \u0DB6\u0DD9\u0DAF\u0DCF\u0D9C\u0DB1\u0DCA\u0DB1' : 'Share your weekly forecast',
          });
        } else if (savedToGallery) {
          Alert.alert(
            language === 'si' ? '\u0DC3\u0DD4\u0DBB\u0DD0\u0D9A\u0DD4\u0DAB\u0DCF' : 'Saved',
            language === 'si' ? '\u0DB4\u0DD2\u0DB1\u0DCA\u0DAD\u0DD6\u0DBB 3\u0D9A\u0DCA \u0D94\u0DBA\u0DCF\u0D9C\u0DD9 \u0D9C\u0DD0\u0DBD\u0DBB\u0DD2\u0DBA\u0DA7 \u0DC3\u0DD4\u0DBB\u0DD0\u0D9A\u0DD4\u0DAB\u0DCF.' : 'All 3 images saved to your gallery.'
          );
        }
      }
    } catch (e) {
      console.error('[ShareWeekly] ERROR:', e);
      if (Platform.OS === 'web') {
        window.alert('Could not create the image: ' + (e && e.message ? e.message : String(e)));
      } else {
        Alert.alert(
          language === 'si' ? '\u0D85\u0DB4\u0DDC\u0DBA\u0DD2' : 'Oops',
          language === 'si' ? '\u0DB4\u0DD2\u0DB1\u0DCA\u0DAD\u0DD6\u0DBB\u0DBA \u0DC4\u0DAF\u0DB1\u0DCA\u0DB1 \u0DB6\u0DD0\u0DBB\u0DD2 \u0DC0\u0DD4\u0DAB\u0DCF. \u0DB1\u0DD0\u0DC0\u0DAD \u0D89\u0DAD\u0DCA\u0DC3\u0DCF\u0DC4 \u0D9A\u0DBB\u0DB1\u0DCA\u0DB1.' : "Couldn't create the images. Please try again."
        );
      }
    } finally {
      setSharingBusy(false);
      setShareReport(null);
    }
  }

  function renderWeeklyLagna() {
    if (!weeklyLagna || !weeklyLagna.reports || weeklyLagna.reports.length === 0) return null;

    var reports = weeklyLagna.reports;
    var weekStart = weeklyLagna.weekStart ? new Date(weeklyLagna.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    var weekEnd = weeklyLagna.weekEnd ? new Date(weeklyLagna.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    var weekLabel = weekStart && weekEnd ? weekStart + ' – ' + weekEnd : '';

    // User's lagna (if birth data available)
    var userLagnaId = chartData && chartData.lagna ? (chartData.lagna.rashiId || chartData.lagna.id || null) : null;

    var OUTLOOK_CONFIG = {
      favorable: { bg: 'rgba(52,211,153,0.10)', border: 'rgba(52,211,153,0.25)', color: '#34D399', icon: 'trending-up', label: language === 'si' ? 'ගොඩක් හොඳයි' : 'Favorable' },
      mixed: { bg: 'rgba(255,184,0,0.10)', border: 'rgba(255,184,0,0.25)', color: '#FFB800', icon: 'swap-horizontal', label: language === 'si' ? 'මිශ්‍රයි' : 'Mixed' },
      challenging: { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.25)', color: '#EF4444', icon: 'alert-circle', label: language === 'si' ? 'පරිස්සම් වෙන්න' : 'Challenging' },
    };

    return (
      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <CosmicCard variant="surface" delay={300}>
          {/* Header */}
          <View style={s.wlHeader}>
            <View style={s.wlHeaderLeft}>
              <View style={s.wlHeaderIcon}>
                <Ionicons name="telescope-outline" size={18} color={HT.gold} />
              </View>
              <View>
                <Text style={s.wlTitle}>{language === 'si' ? 'මේ සතියේ ඔයාගේ ලග්න පලාපල' : 'Weekly Forecast'}</Text>
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
                                <Text style={s.wlYouText}>{language === 'si' ? 'ඔයා' : 'YOU'}</Text>
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
                          <Text numberOfLines={1} style={s.wlLordLabel}>{language === 'si' ? 'පාලක ශක්තිය' : 'Ruling Energy'}</Text>
                          <Text numberOfLines={1} style={s.wlLordValue}>{language === 'si' ? report.lordSi : report.lord}</Text>
                        </View>
                        <View style={s.wlLordChip}>
                          <Text numberOfLines={1} style={s.wlLordLabel}>{language === 'si' ? 'සතියේ අවධානය' : 'Week Focus'}</Text>
                          <Text numberOfLines={1} style={s.wlLordValue}>{(OUTLOOK_CONFIG[report.outlook] || OUTLOOK_CONFIG.mixed).label}</Text>
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
                            <View style={s.wlLuckyIcon}><Ionicons name="calendar-clear-outline" size={12} color="#D4C7FF" /></View>
                            <View style={{ flex: 1 }}>
                              <Text numberOfLines={1} style={s.wlLuckyMeta}>{language === 'si' ? 'දිනය' : 'Day'}</Text>
                              <Text numberOfLines={1} style={s.wlLuckyLabel}>{language === 'si' ? report.luckyDay.si : report.luckyDay.en}</Text>
                            </View>
                          </View>
                        ) : null}
                        {report.luckyColor ? (
                          <View style={s.wlLuckyItem}>
                            <View style={s.wlLuckyIcon}><Ionicons name="color-palette-outline" size={12} color="#D4C7FF" /></View>
                            <View style={{ flex: 1 }}>
                              <Text numberOfLines={1} style={s.wlLuckyMeta}>{language === 'si' ? 'වර්ණය' : 'Color'}</Text>
                              <Text numberOfLines={1} style={s.wlLuckyLabel}>{language === 'si' ? report.luckyColor.si : report.luckyColor.en}</Text>
                            </View>
                          </View>
                        ) : null}
                        {report.luckyNumber ? (
                          <View style={s.wlLuckyItem}>
                            <View style={s.wlLuckyIcon}><Ionicons name="keypad-outline" size={12} color="#D4C7FF" /></View>
                            <View style={{ flex: 1 }}>
                              <Text numberOfLines={1} style={s.wlLuckyMeta}>{language === 'si' ? 'අංකය' : 'Number'}</Text>
                              <Text numberOfLines={1} style={s.wlLuckyLabel}>{report.luckyNumber}</Text>
                            </View>
                          </View>
                        ) : null}
                      </View>

                      {/* Download & Share branded image */}
                      <TouchableOpacity
                        activeOpacity={0.85}
                        disabled={sharingBusy}
                        onPress={function () { handleShareWeekly(report); }}
                        style={[s.wlShareBtn, sharingBusy && { opacity: 0.6 }]}
                      >
                        <LinearGradient
                          colors={['#FBBF24', '#F59E0B']}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFill}
                        />
                        <Ionicons name={sharingBusy ? 'hourglass-outline' : 'share-social'} size={16} color="#1A1206" />
                        <Text style={s.wlShareBtnText}>
                          {sharingBusy
                            ? (language === 'si' ? 'හදනවා…' : 'Creating…')
                            : (language === 'si' ? 'පින්තූර 3ක් බාගන්න' : 'Download 3 story images')}
                        </Text>
                      </TouchableOpacity>
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
          <Animated.View style={[s.noBirthIconWrap, noBirthGlowStyle]}>
            <LinearGradient colors={['rgba(218,165,32,0.30)', 'rgba(147,51,234,0.12)']} style={StyleSheet.absoluteFill} />
            <Ionicons name="planet-outline" size={32} color="#FFF4D7" />
          </Animated.View>
          <Text style={s.noBirthTitle}>
            {language === 'si' ? 'ඔයාගෙම කේන්දරේ පැටිකිරිය' : 'Unlock Your Cosmic Blueprint'}
          </Text>
          <Text style={s.noBirthBody}>
            {language === 'si'
              ? 'ඔයාගේ උපන් විස්තර ටික දීලා කේන්දරේ, අද දවසට ගැලපෙන උපදෙස් සහ සතිපතා පලාපල ටික බලාගන්න.'
              : 'Add your birth details in Profile to unlock your personalised chart, daily guidance, and weekly readings.'}
          </Text>
          <TouchableOpacity onPress={function () { router.push('/profile'); }} style={s.noBirthCta}>
            <LinearGradient colors={['#FF8C00', '#FF6D00', '#E65100']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <LinearGradient colors={['rgba(255,255,255,0.20)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', borderTopLeftRadius: 999, borderTopRightRadius: 999 }} />
            <Ionicons name="sparkles" size={14} color="#fff" />
            <Text style={s.noBirthCtaText}>{language === 'si' ? 'Profile එකෙන් ලබාදෙන්න  →' : 'Go to Profile → Birth Data'}</Text>
          </TouchableOpacity>
        </View>
      </CosmicCard>
    );
  }

  return (
    <DesktopScreenWrapper routeName="index">
      <View style={{ flex: 1, backgroundColor: HT.bg }}>
        <CosmicBackground reduced={reduced} lowEnd={lowEnd} variant="royalObsidian" />
        <Animated.ScrollView
          ref={scrollRef}
          style={[s.flex, { backgroundColor: 'transparent' }]}
          contentContainerStyle={[s.content, isDesktop && s.contentDesktop, !isDesktop && { paddingTop: insets.contentTop, paddingBottom: insets.contentBottom }]}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"

          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchData}
              tintColor={HT.gold}
              colors={[HT.gold, HT.goldDark]}
            />
          }
        >
          {loading && (
            <View style={s.center}>
              <CosmicLoader size={56} color={HT.gold} />
              <Text style={s.loadingText}>{t('channelingEnergies')}</Text>
            </View>
          )}

          {error && !loading && (
            <View style={s.center}>
              <Ionicons name="planet" size={44} color={HT.danger} style={{ marginBottom: 12 }} />
              <Text style={s.errorText}>{error}</Text>
              <TouchableOpacity style={s.retryBtn} onPress={fetchData}>
                <Ionicons name="refresh" size={16} color={HT.gold} />
                <Text style={s.retryText}>{t('realign')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {data && !loading && (
            <View style={[s.todayStack, isDesktop && s.todayStackDesktop]}>
              {/* Personal Oracle Hero */}
              {renderOracleHero()}

              {/* Daily Affirmations */}
              {hasBirthData && (
                <AffirmationCard
                  language={language}
                  birthDate={birthDateTime}
                  birthLat={birthLat}
                  birthLng={birthLng}
                  getAffirmations={api.getAffirmations}
                />
              )}

              {/* Intention of the Day */}
              <IntentionCard language={language} />

              {/* Manifestation Power */}
              {data?.jyotish?.manifestation && (
                <ManifestationCard
                  manifestation={data.jyotish.manifestation}
                  language={language}
                />
              )}

              {/* Rahu Kalaya */}
              {renderRahuKalayaCard()}

              {/* Your Cosmic Identity */}
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

              {/* Moon Phase Showcase */}
              {renderMoonPhaseCard()}

              {/* Daily Mantra */}
              {renderDailyMantra()}

              {/* Daily Cosmic Ratings */}
              {renderDailyRatings()}

              {/* Auspicious Timings */}
              {renderAuspicious()}

              {/* Lucky Numbers */}
              {renderLuckyNumbers()}

              {/* Personalization Prompt */}
              {!hasBirthData && renderNoBirthDataPrompt()}

              {/* Cosmic Shield — Jyotish Intelligence */}
              {hasBirthData && renderCosmicShield()}
              {hasBirthData && renderTodayYogas()}

              {/* Panchanga */}
              {renderPanchanga()}

              {/* Weekly Palapala Banner */}
              {renderWeeklyBanner()}

              {/* Weekly Lagna Palapala */}
              <View onLayout={function (e) { weeklyLagnaY.current = e.nativeEvent.layout.y; }}>
                {renderWeeklyLagna()}
              </View>

              <View style={{ height: isDesktop ? 32 : 140 }} />
            </View>
          )}
        </Animated.ScrollView>

        {/* Off-screen branded card used only for capturing a shareable image */}
        {shareReport ? (
          <View style={s.shareCapture} pointerEvents="none">
            <View style={{ width: 360, height: 640 }}>
              <WeeklyShareCard
                ref={shareCardRef}
                report={shareReport}
                weekLabel={weeklyShareLabel()}
                language={language}
                page={sharePageNum}
              />
            </View>
          </View>
        ) : null}
      </View>
    </DesktopScreenWrapper>
  );
}

var s = StyleSheet.create({
  flex: { flex: 1 },
  shareCapture: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0.99,
    zIndex: -9999,
  },
  content: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 108 : 88 },
  contentDesktop: { paddingTop: 24, paddingHorizontal: 28, maxWidth: 680, alignSelf: 'center', width: '100%' },
  todayStack: { gap: 10 },
  todayStackDesktop: { gap: 12 },
  center: { alignItems: 'center', justifyContent: 'center', paddingTop: 120 },

  loadingText: { color: '#FFB800', fontSize: 14, fontStyle: 'italic', letterSpacing: 1, marginTop: 16 },
  errorText: { color: '#EF4444', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.30)',
    backgroundColor: 'rgba(255,184,0,0.08)',
  },
  retryText: { color: '#FFB800', fontWeight: '700', fontSize: 14, letterSpacing: 1 },
  sinhalaTextFlow: { letterSpacing: 0, textTransform: 'none' },

  // Personal Oracle Hero
  oracleHeroShell: {
    position: 'relative', overflow: 'hidden',
    marginHorizontal: -16, marginTop: -10, marginBottom: 18,
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 22,
    borderBottomWidth: 1, borderTopWidth: 1,
    borderColor: 'rgba(214,181,109,0.22)',
    ...boxShadow('rgba(214,181,109,0.18)', { width: 0, height: 12 }, 0.28, 34), elevation: 16,
  },
  oracleStarMap: { ...StyleSheet.absoluteFillObject, opacity: 0.90 },
  oracleTopRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: 12, zIndex: 2,
  },
  oracleGreetingBlock: { flex: 1, minWidth: 0 },
  oracleGreetingLine: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  oracleGreetingDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: '#FFE8A3', opacity: 0.74, flexShrink: 0,
  },
  oracleGreeting: {
    color: 'rgba(255,232,163,0.62)', fontSize: 10, lineHeight: 14,
    fontWeight: '800', letterSpacing: 0,
  },
  oracleName: {
    color: '#FFF4D7', fontSize: 25, lineHeight: 30,
    fontWeight: '900', letterSpacing: 0,
    ...textShadow('rgba(255,184,0,0.34)', { width: 0, height: 1 }, 9),
  },
  oracleDatePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    minHeight: 32, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,232,163,0.18)',
    backgroundColor: 'rgba(255,232,163,0.045)', maxWidth: 128, flexShrink: 0,
  },
  oracleDateText: { color: '#F5D57A', fontSize: 10, fontWeight: '800', letterSpacing: 0 },
  oracleVisualStage: {
    height: 294, alignItems: 'center', justifyContent: 'center',
    marginTop: 10, marginBottom: 4, zIndex: 2,
  },
  oracleWheelFrame: {
    alignItems: 'center', justifyContent: 'center', zIndex: 2,
    width: '100%', minHeight: 286,
  },
  oracleCopyBlock: { zIndex: 2, alignItems: 'center', paddingHorizontal: 2 },
  oracleKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, width: '100%' },
  oracleKickerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,232,163,0.14)' },
  oracleKicker: {
    color: 'rgba(255,232,163,0.62)', fontSize: 10, lineHeight: 14,
    fontWeight: '900', letterSpacing: 1.6, textTransform: 'uppercase', textAlign: 'center',
  },
  oracleTitle: {
    color: '#FFF4D7', fontSize: 29, lineHeight: 35,
    fontWeight: '900', textAlign: 'center', letterSpacing: 0,
    ...textShadow('rgba(255,184,0,0.40)', { width: 0, height: 2 }, 14),
  },
  oracleTitleSinhala: { fontSize: 24, lineHeight: 34, letterSpacing: 0 },
  oracleBody: {
    color: 'rgba(255,244,215,0.72)', fontSize: 15, lineHeight: 24,
    fontWeight: '500', textAlign: 'center', marginTop: 12, paddingHorizontal: 4,
  },
  oracleProofRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    flexWrap: 'wrap', gap: 8, marginTop: 16, width: '100%', paddingHorizontal: 6,
  },
  oracleProofPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    maxWidth: '100%', minHeight: 30, flexShrink: 1,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,232,163,0.16)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  oracleProofText: { color: 'rgba(255,244,215,0.78)', fontSize: 11, lineHeight: 16, fontWeight: '800', flexShrink: 1, flexWrap: 'wrap' },
  oracleSignalGrid: { gap: 9, marginTop: 18, zIndex: 2 },
  oracleSignalPanel: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    minHeight: 76, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,232,163,0.12)',
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  oracleSignalIcon: {
    width: 36, height: 36, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  oracleSignalCopy: { flex: 1, minWidth: 0 },
  oracleSignalLabel: {
    color: 'rgba(255,232,163,0.45)', fontSize: 10, lineHeight: 14,
    fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase',
  },
  oracleSignalValue: {
    color: '#FFF4D7', fontSize: 14, lineHeight: 19,
    fontWeight: '800', marginTop: 2,
  },
  oracleSignalDetail: { fontSize: 11, lineHeight: 15, fontWeight: '800', marginTop: 3 },
  oracleProfileCta: {
    alignSelf: 'center', marginTop: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: 46, paddingHorizontal: 18, borderRadius: 999,
    overflow: 'hidden', zIndex: 2,
    ...boxShadow('rgba(255,184,0,0.34)', { width: 0, height: 8 }, 0.6, 20),
  },
  oracleProfileCtaText: { color: '#140B04', fontSize: 13, fontWeight: '900', letterSpacing: 0 },

  // Greeting
  greetWrap: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 32 },
  greetText: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  greetName: {
    fontSize: 32, fontWeight: '900', color: '#FFF1D0', letterSpacing: -0.3,
    ...textShadow('rgba(255,140,0,0.5)', { width: 0, height: 2 }, 14),
  },
  dateBadge: {
    backgroundColor: 'rgba(255,184,0,0.12)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.22)',
  },
  dateText: { color: '#FFD666', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  // Dashboard Hero — Ancient Mystery
  dashHero: {
    borderRadius: 24, overflow: 'hidden', marginBottom: 12,
    borderWidth: 1.5, borderColor: 'rgba(218,165,32,0.35)',
    ...boxShadow('rgba(180,140,40,0.40)', { width: 0, height: 6 }, 0.35, 24), elevation: 14,
  },
  dashHeroBg: { ...StyleSheet.absoluteFillObject, borderRadius: 24 },
  dashGlassShine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1.5,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  dashBottomShine: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  dashMysticGlowTR: {
    position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(218,165,32,0.06)',
  },
  dashMysticGlowBL: {
    position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(180,140,40,0.05)',
  },
  dashNebulaBlob: {
    position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(180,140,40,0.08)',
  },
  dashInnerFrame: {
    position: 'absolute', top: 6, left: 6, right: 6, bottom: 6,
    borderRadius: 18, borderWidth: 0.5, borderColor: 'rgba(218,165,32,0.15)',
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
    overflow: 'visible',
  },
  chakraOverlayInfo: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chakraSignBadge: {
    width: 82, height: 82, borderRadius: 41, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: 'rgba(255,184,0,0.60)',
    backgroundColor: 'rgba(10,7,4,0.70)',
    ...boxShadow('rgba(255,184,0,0.30)', { width: 0, height: 0 }, 0.9, 24),
  },
  chakraSignSymbol: {
    fontSize: 40, color: '#FFD666',
    ...textShadow('rgba(255,214,102,0.9)', { width: 0, height: 0 }, 22),
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
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(218,165,32,0.08)',
    borderWidth: 1, borderColor: 'rgba(218,165,32,0.18)',
  },

  dashHeroLabel: { color: 'rgba(218,165,32,0.50)', fontSize: 10, fontWeight: '800', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 },
  dashSignNameLarge: { color: '#F4E4BC', fontSize: 32, fontWeight: '900', letterSpacing: -0.3, lineHeight: 38, ...textShadow('rgba(218,165,32,0.45)', { width: 0, height: 1 }, 14) },
  dashSignNameSub: { color: 'rgba(218,165,32,0.60)', fontSize: 12, fontWeight: '700' },
  nakPill: {
    alignItems: 'center', alignSelf: 'center',
    marginBottom: 12, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(218,165,32,0.22)',
    backgroundColor: 'rgba(218,165,32,0.04)', gap: 4,
  },
  nakPillRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nakPillLabel: { color: 'rgba(218,165,32,0.55)', fontSize: 11, fontWeight: '700' },
  nakPillDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(218,165,32,0.45)' },
  nakPillValue: { color: '#DAA520', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  dashDivider: { height: 1, marginHorizontal: 16, overflow: 'hidden' },
  dashGridTitle: { color: 'rgba(218,165,32,0.45)', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center', marginTop: 12, marginBottom: -4 },
  dashGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingTop: 16, paddingBottom: 18, gap: 8,
  },
  dashCell: {
    width: '48%', minHeight: 122, alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 10, paddingHorizontal: 8,
    borderRadius: 14, backgroundColor: 'rgba(218,165,32,0.03)',
    borderWidth: 0.5, borderColor: 'rgba(218,165,32,0.08)',
  },
  dashCellIcon: {
    width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  dashCellValue: { color: '#F4E4BC', fontSize: 11, lineHeight: 16, fontWeight: '800', textAlign: 'center', paddingHorizontal: 2 },
  dashCellLabel: { color: 'rgba(218,165,32,0.40)', fontSize: 10, lineHeight: 14, fontWeight: '700', textAlign: 'center' },

  // ═══ Rahu Kalaya Card ═══
  rahuCard: {
    marginTop: 12, borderRadius: 20, overflow: 'hidden',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16,
    borderWidth: 1.5, borderColor: 'rgba(218,165,32,0.18)',
  },
  rahuCardToday: { marginTop: 0 },
  rahuCardActive: {
    ...boxShadow('#EF4444', { width: 0, height: 4 }, 0.35, 20), elevation: 8,
  },
  rahuEdgeGlow: {
    position: 'absolute', top: -2, left: -2, right: -2, bottom: -2,
    borderRadius: 22, borderWidth: 2, borderColor: 'rgba(239,68,68,0.30)',
  },
  rahuCardBorder: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 20, borderWidth: 1,
  },
  rahuCardTop: {
    alignItems: 'flex-start', justifyContent: 'flex-start',
    marginBottom: 12, gap: 8,
  },
  rahuTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    width: '100%', minWidth: 0,
  },
  rahuIconCircle: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  rahuIconCircleSafe: {
    backgroundColor: 'rgba(52,211,153,0.10)',
    borderColor: 'rgba(52,211,153,0.25)',
  },
  rahuIconCircleActive: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.35)',
  },
  rahuStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: 'rgba(218,165,32,0.06)',
    borderWidth: 1, borderColor: 'rgba(218,165,32,0.15)',
    alignSelf: 'flex-start', marginLeft: 48, maxWidth: '84%',
  },
  rahuStatusDot: { width: 7, height: 7, borderRadius: 4 },
  rahuStatusText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  rahuCardTitle: {
    fontSize: 15, fontWeight: '900', color: '#A7F3D0',
    letterSpacing: 0.3, lineHeight: 21, flex: 1, minWidth: 0,
  },
  rahuCardTitleActive: { color: '#FCA5A5' },
  rahuTimeRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, overflow: 'hidden',
    marginTop: 10, marginBottom: 8,
  },
  rahuTimeBlock: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  rahuTimeLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3, color: 'rgba(218,165,32,0.45)' },
  rahuTimeValue: { fontSize: 16, fontWeight: '900', letterSpacing: 0.5, color: '#F4E4BC' },
  rahuTimeValueActive: { color: '#FCA5A5' },
  rahuTimeDivider: { width: 1, height: 32, borderRadius: 1 },
  rahuCountdownBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: 10,
  },
  rahuExplanationContainer: {
    marginTop: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rahuExplanationText: {
    fontSize: 11,
    lineHeight: 18,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    letterSpacing: 0,
  },
  rahuCountdownText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, color: '#F4E4BC', flexShrink: 1, textAlign: 'center' },

  // Sky Grid
  skyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statMini: { width: '47%', alignItems: 'center', paddingVertical: 8 },
  statMiniIcon: {
    width: 36, height: 36, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 8,
    backgroundColor: 'rgba(218,165,32,0.03)',
  },
  statMiniValue: { fontSize: 16, fontWeight: '800', color: '#F4E4BC' },
  statMiniLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600', marginTop: 2 },

  // Glass Cosmic Identity
  glassIdentity: {
    borderRadius: 22, overflow: 'hidden', marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(218,165,32,0.24)',
    ...boxShadow('rgba(180,140,40,0.22)', { width: 0, height: 5 }, 0.16, 18), elevation: 8,
  },
  glassIdHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
  },
  glassIdIcon: { fontSize: 18 },
  glassIdMark: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(218,165,32,0.08)',
    borderWidth: 1, borderColor: 'rgba(218,165,32,0.22)',
  },
  glassIdKicker: { color: 'rgba(218,165,32,0.52)', fontSize: 9, fontWeight: '900', letterSpacing: 1.8, marginBottom: 1 },
  glassIdTitle: { color: '#F4E4BC', fontSize: 17, lineHeight: 22, fontWeight: '900', letterSpacing: 0.2, ...textShadow('rgba(218,165,32,0.22)', { width: 0, height: 1 }, 6) },

  // Lagna Hero
  lagnaHero: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginBottom: 10,
    borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(218,165,32,0.18)',
    padding: 12, gap: 12,
  },
  lagnaHeroLeft: { alignItems: 'center' },
  lagnaSignBig: {
    width: 86, height: 86, borderRadius: 43, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(218,165,32,0.44)',
    backgroundColor: 'rgba(26,21,10,0.60)',
    ...boxShadow('rgba(218,165,32,0.18)', { width: 0, height: 0 }, 0.75, 20),
  },
  lagnaSignHalo: {
    position: 'absolute', width: 70, height: 70, borderRadius: 35,
    borderWidth: 1, borderColor: 'rgba(244,228,188,0.12)',
  },
  lagnaSignImage: {
    width: 58, height: 58, resizeMode: 'contain',
  },
  lagnaHeroRight: { flex: 1 },
  lagnaHeroLabel: {
    color: 'rgba(218,165,32,0.50)', fontSize: 11, fontWeight: '700',
    letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 2,
  },
  lagnaHeroName: { color: '#DAA520', fontSize: 28, lineHeight: 34, fontWeight: '900', letterSpacing: 0, ...textShadow('rgba(218,165,32,0.34)', { width: 0, height: 1 }, 10) },
  lagnaHeroSub: { color: 'rgba(218,165,32,0.55)', fontSize: 14, fontWeight: '600', marginTop: 2 },
  lagnaLordPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7,
    alignSelf: 'flex-start', backgroundColor: 'rgba(218,165,32,0.06)',
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(218,165,32,0.15)',
  },
  lagnaLordText: { color: '#DAA520', fontSize: 11, fontWeight: '700' },

  // Glass Trio Row
  glassTrioRow: { flexDirection: 'row', gap: 7, paddingHorizontal: 14, paddingBottom: 14 },
  glassTrioCard: {
    flex: 1, minHeight: 88, borderRadius: 15, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, gap: 3,
    backgroundColor: 'rgba(218,165,32,0.03)', borderColor: 'rgba(218,165,32,0.10)',
  },
  glassTrioIcon: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 2,
  },
  glassTrioLabel: {
    color: 'rgba(218,165,32,0.50)', fontSize: 9, fontWeight: '800',
    letterSpacing: 0.8, textTransform: 'uppercase', textAlign: 'center',
  },
  glassTrioValue: { fontSize: 12.5, lineHeight: 16, fontWeight: '900', textAlign: 'center', width: '100%', minHeight: 32 },

  // Palapala
  palapalaText: { color: 'rgba(244,228,188,0.65)', fontSize: 14, lineHeight: 24, marginBottom: 16 },
  traitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  traitChip: {
    backgroundColor: 'rgba(218,165,32,0.08)', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(218,165,32,0.18)',
  },
  traitText: { color: '#DAA520', fontSize: 12, fontWeight: '600' },
  luckyRow: { flexDirection: 'row', gap: 8 },
  luckyItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(218,165,32,0.05)', borderRadius: 12, padding: 8,
    borderWidth: 1, borderColor: 'rgba(218,165,32,0.12)',
  },
  luckyItemIcon: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(218,165,32,0.08)',
    borderWidth: 1, borderColor: 'rgba(218,165,32,0.18)',
  },
  luckyLabel: { color: '#F4E4BC', fontSize: 12, fontWeight: '600', flex: 1 },

  // Personality
  personalityIntro: { color: 'rgba(244,228,188,0.66)', fontSize: 14, lineHeight: 23, marginBottom: 14 },
  personalityWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  personalityPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(218,165,32,0.04)', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1,
  },
  personalityText: { fontSize: 12, fontWeight: '700' },

  // Panchanga (expandable with explanations)
  pTapHintRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 6, paddingHorizontal: 2,
  },
  pTapHint: { color: 'rgba(218,165,32,0.30)', fontSize: 11, fontWeight: '500', fontStyle: 'italic' },
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
  pLabel: { fontSize: 14, fontWeight: '700' },
  pHintText: { fontSize: 10, color: 'rgba(218,165,32,0.30)', fontWeight: '500', marginTop: 1 },
  pValue: { fontSize: 14, color: '#F4E4BC', fontWeight: '700' },
  pSinhala: { fontSize: 14, color: Colors.textMuted, marginTop: 2 },
  pExplainBox: {
    borderRadius: 12, padding: 16, marginBottom: 8,
    backgroundColor: 'rgba(218,165,32,0.03)',
    borderWidth: 1, borderColor: 'rgba(218,165,32,0.08)',
    overflow: 'hidden', position: 'relative',
  },
  pExplainAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },
  pGuideTitle: {
    color: '#F4E4BC', fontSize: 14, lineHeight: 21, fontWeight: '800',
    paddingLeft: 8, marginBottom: 12,
  },
  pGuideBlock: {
    paddingLeft: 8, marginBottom: 12,
  },
  pGuideKicker: {
    color: 'rgba(218,165,32,0.62)', fontSize: 10, fontWeight: '900',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5,
  },
  pGuideColumns: {
    flexDirection: 'row', gap: 10, paddingLeft: 8,
  },
  pGuideColumn: {
    flex: 1, borderRadius: 10, padding: 10,
    backgroundColor: 'rgba(0,0,0,0.16)', borderWidth: 1,
    borderColor: 'rgba(218,165,32,0.08)',
  },
  pGuideItem: {
    color: 'rgba(244,228,188,0.64)', fontSize: 12, lineHeight: 18, fontWeight: '600',
  },
  pExplainText: {
    color: 'rgba(244,228,188,0.55)', fontSize: 14, lineHeight: 22, fontWeight: '500',
    paddingLeft: 8,
  },

  // Auspicious
  auspRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 13, gap: 12 },
  auspBar: { width: 3, alignSelf: 'stretch', minHeight: 42, borderRadius: 2 },
  auspName: { fontSize: 14, lineHeight: 19, color: '#F4E4BC', fontWeight: '800' },
  auspSinhala: { fontSize: 12, lineHeight: 18, color: 'rgba(244,228,188,0.58)', marginTop: 3, paddingRight: 4 },
  auspTime: { flexDirection: 'row', minWidth: 108, justifyContent: 'flex-end', paddingTop: 2 },
  auspTimeText: { fontSize: 12, color: '#34D399', fontWeight: '800', letterSpacing: 0.2, textAlign: 'right' },

  // No Birth Data
  noBirthTitle: { color: '#F4E4BC', fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 10, ...textShadow('rgba(218,165,32,0.30)', { width: 0, height: 1 }, 10) },
  noBirthBody: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 16, paddingHorizontal: 8 },
  noBirthIconWrap: {
    width: 62, height: 62, borderRadius: 31,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', marginBottom: 14,
    borderWidth: 1.5, borderColor: 'rgba(218,165,32,0.32)',
  },
  noBirthCta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 16, borderRadius: 999, overflow: 'hidden',
    ...boxShadow('#FF8C00', { width: 0, height: 4 }, 0.7, 16),
  },
  noBirthCtaText: { color: '#FFF1D0', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },

  // Weekly Palapala Banner
  wbCard: {
    borderRadius: 20, overflow: 'hidden', marginBottom: 16,
    borderWidth: 1.5, borderColor: 'rgba(218,165,32,0.22)',
    paddingVertical: 16, paddingHorizontal: 16,
  },
  wbContent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  wbLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  wbIconWrap: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(218,165,32,0.25)',
  },
  wbTextCol: { flex: 1 },
  wbTitle: { color: '#F4E4BC', fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
  wbWeek: { color: 'rgba(218,165,32,0.50)', fontSize: 10, fontWeight: '600', marginTop: 2 },
  wbSub: { color: 'rgba(218,165,32,0.40)', fontSize: 11, fontWeight: '500', marginTop: 3 },
  wbTeaser: { marginTop: 3 },
  wbTeaserText: { color: 'rgba(218,165,32,0.55)', fontSize: 11, fontWeight: '600' },
  wbArrow: {
    width: 32, height: 32, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(218,165,32,0.08)',
    borderWidth: 1, borderColor: 'rgba(218,165,32,0.18)',
  },

  // Weekly Lagna Palapala
  wlHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
  },
  wlHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wlHeaderIcon: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(218,165,32,0.08)',
    borderWidth: 1, borderColor: 'rgba(218,165,32,0.20)',
  },
  wlTitle: { color: '#F4E4BC', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  wlWeekLabel: { color: 'rgba(218,165,32,0.45)', fontSize: 11, fontWeight: '600', marginTop: 1 },
  wlGrid: { gap: 8 },
  wlCard: {
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(218,165,32,0.08)',
    backgroundColor: 'rgba(218,165,32,0.02)',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  wlCardUser: {
    borderColor: 'rgba(218,165,32,0.30)',
    ...boxShadow('#DAA520', { width: 0, height: 2 }, 0.15, 8), elevation: 4,
  },
  wlCardExpanded: {
    borderColor: 'rgba(218,165,32,0.20)',
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
  wlSignImage: { width: 42, height: 42, resizeMode: 'contain' },
  wlCardInfo: { flex: 1 },
  wlNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wlSignName: { color: '#F4E4BC', fontSize: 16, fontWeight: '800' },
  wlSignNameSub: { color: 'rgba(218,165,32,0.40)', fontSize: 12, fontWeight: '600', marginTop: 1 },
  wlYouBadge: {
    backgroundColor: 'rgba(218,165,32,0.15)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(218,165,32,0.30)',
  },
  wlYouText: { color: '#DAA520', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  wlOutlookPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1,
  },
  wlOutlookText: { fontSize: 10, fontWeight: '700' },
  wlDetail: {
    overflow: 'hidden', borderRadius: 16,
    borderTopLeftRadius: 0, borderTopRightRadius: 0,
    borderWidth: 1, borderTopWidth: 0,
    borderColor: 'rgba(218,165,32,0.12)',
    padding: 16, gap: 12,
    marginBottom: 4,
  },
  wlLordRow: {
    flexDirection: 'row', gap: 8, marginBottom: 4,
  },
  wlLordChip: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(218,165,32,0.03)', borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 8, minHeight: 48,
    borderWidth: 1, borderColor: 'rgba(218,165,32,0.10)',
  },
  wlLordLabel: { color: 'rgba(218,165,32,0.40)', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' },
  wlLordValue: { color: '#F4E4BC', fontSize: 11, fontWeight: '800', marginTop: 2, textAlign: 'center', numberOfLines: 1 },
  wlOverallBox: {
    backgroundColor: 'rgba(218,165,32,0.04)', borderRadius: 12,
    padding: 12, gap: 6,
    borderWidth: 1, borderColor: 'rgba(218,165,32,0.10)',
  },
  wlTransitBox: {
    backgroundColor: 'rgba(160,120,40,0.05)', borderRadius: 12,
    padding: 12, gap: 6,
    borderWidth: 1, borderColor: 'rgba(160,120,40,0.10)',
  },
  wlRemedyBox: {
    backgroundColor: 'rgba(140,160,80,0.05)', borderRadius: 12,
    padding: 12, gap: 6,
    borderWidth: 1, borderColor: 'rgba(140,160,80,0.10)',
  },
  wlDetailText: { color: 'rgba(244,228,188,0.65)', fontSize: 14, lineHeight: 22 },
  wlSection: { gap: 4 },
  wlSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  wlSectionTitle: { color: 'rgba(218,165,32,0.55)', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  wlSectionBody: { color: 'rgba(244,228,188,0.55)', fontSize: 14, lineHeight: 22 },
  wlAdvice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(255,184,0,0.06)', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: 'rgba(255,184,0,0.12)',
  },
  wlAdviceText: { color: '#FFD666', fontSize: 12, fontWeight: '600', lineHeight: 18, flex: 1 },
  wlShareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 14, paddingVertical: 13, borderRadius: 14, overflow: 'hidden',
  },
  wlShareBtnText: { color: '#1A1206', fontSize: 13.5, fontWeight: '800', letterSpacing: 0.3 },
  wlLuckyRow: { flexDirection: 'row', gap: 8 },
  wlLuckyItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  wlLuckyIcon: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(212,199,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(212,199,255,0.12)',
  },
  wlLuckyMeta: { color: 'rgba(196,181,253,0.35)', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  wlLuckyLabel: { color: '#D4C7FF', fontSize: 11, fontWeight: '700' },
});

// ── Moon Phase Styles ──
var mp = StyleSheet.create({
  card: {
    borderRadius: 24, overflow: 'hidden', marginBottom: 16,
    paddingBottom: 24, position: 'relative',
    borderWidth: 1.5, borderColor: 'rgba(218,165,32,0.25)',
  },
  cardBorder: {
    position: 'absolute', top: 5, left: 5, right: 5, bottom: 5, borderRadius: 18,
    borderWidth: 0.5, borderColor: 'rgba(218,165,32,0.12)',
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4,
  },
  headerRowSinhala: {
    rowGap: 8,
  },
  sectionTitle: {
    color: '#F4E4BC', fontSize: 20, lineHeight: 27, fontWeight: '900', letterSpacing: 0.3,
    flex: 1, minWidth: 0,
  },
  sectionTitleSinhala: {
    flexBasis: '100%', letterSpacing: 0,
  },
  timelineBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
    backgroundColor: 'rgba(218,165,32,0.08)', borderWidth: 1, borderColor: 'rgba(218,165,32,0.18)',
    alignSelf: 'flex-start', maxWidth: '100%',
  },
  timelineBadgeSinhala: { marginLeft: 30 },
  timelineBadgeText: { color: 'rgba(218,165,32,0.55)', fontSize: 10, fontWeight: '700' },
  timelineBadgeTextSinhala: { letterSpacing: 0 },

  // ── Timeline scroll ──
  timelineScroll: { paddingHorizontal: 12, paddingVertical: 12, gap: 0 },
  tlItem: {
    width: 48, alignItems: 'center', paddingVertical: 6, borderRadius: 14,
  },
  tlItemSelected: {
    backgroundColor: 'rgba(218,165,32,0.08)',
    borderWidth: 1, borderColor: 'rgba(218,165,32,0.22)',
  },
  tlDayName: { color: 'rgba(218,165,32,0.26)', fontSize: 9, fontWeight: '600', marginBottom: 6 },
  tlDayNameActive: { color: 'rgba(218,165,32,0.80)', fontWeight: '800' },
  tlDayNameToday: { color: '#DAA520' },
  tlMoonWrap: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  tlMoonWrapActive: {
    width: 36, height: 36, borderRadius: 18,
  },
  tlMoonGlow: {
    ...StyleSheet.absoluteFillObject, borderRadius: 22,
    backgroundColor: 'rgba(218,165,32,0.12)',
    shadowColor: '#DAA520', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 12, elevation: 0,
  },
  tlDateNum: { color: 'rgba(218,165,32,0.32)', fontSize: 10, fontWeight: '700', marginTop: 4 },
  tlDateNumActive: { color: '#F4E4BC', fontWeight: '900', fontSize: 12 },
  tlTodayDot: {
    width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#DAA520',
    marginTop: 3,
    shadowColor: '#DAA520', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 4, elevation: 0,
  },
  tlKeyPhaseDot: {
    width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(218,165,32,0.5)',
    marginTop: 3,
  },

  // ── Divider ──
  divider: {
    height: 1, backgroundColor: 'rgba(218,165,32,0.10)',
    marginHorizontal: 20, marginVertical: 4,
  },

  // ── Central section ──
  centralSection: { alignItems: 'center', paddingTop: 8 },
  selectedDateLabel: {
    color: 'rgba(218,165,32,0.50)', fontSize: 11, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4,
  },
  moonWrap: { alignItems: 'center', marginVertical: 8 },
  moonAura: {
    position: 'absolute', top: -30, left: -30, right: -30, bottom: -30,
    borderRadius: 999, transform: [{ scale: 1.1 }], zIndex: -1,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 30, elevation: 10,
  },
  phaseName: {
    color: '#F4E4BC', fontSize: 24, fontWeight: '900', textAlign: 'center',
    letterSpacing: 0.5, marginTop: 4,
    ...textShadow('rgba(218,165,32,0.40)', { width: 0, height: 2 }, 12),
  },
  phaseDesc: {
    color: 'rgba(218,165,32,0.50)', fontSize: 12, fontWeight: '500', textAlign: 'center',
    lineHeight: 20, marginTop: 8, marginHorizontal: 28,
  },

  // ── Illumination bar ──
  illumBarWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    alignSelf: 'center', marginTop: 14, width: '70%',
  },
  illumBarTrack: {
    flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(218,165,32,0.10)',
    overflow: 'hidden',
  },
  illumBarFill: { height: '100%', borderRadius: 2, overflow: 'hidden' },
  illumBarLabel: { color: 'rgba(218,165,32,0.65)', fontSize: 12, fontWeight: '800', minWidth: 36, textAlign: 'right' },

  // ── Pure Space Lunar Exts ──
  pureSpaceContainer: { alignItems: 'center', backgroundColor: '#000000', marginHorizontal: -16, paddingVertical: 36, marginBottom: 16, overflow: 'hidden' },
  lunarGoldVeil: { position: 'absolute', top: 0, left: 0, right: 0, height: '64%' },
  lunarDustField: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  subtleDateContainer: { alignItems: 'center', marginBottom: 22 },
  lunarKicker: { color: 'rgba(218,165,32,0.62)', fontSize: 10, fontWeight: '800', letterSpacing: 3, marginBottom: 8 },
  subtleDateText: { color: 'rgba(255,255,255,0.38)', fontSize: 11, fontWeight: '600', letterSpacing: 3 },
  moonRingWrapper: { alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 26 },
  typographyWrapper: { alignItems: 'center', paddingHorizontal: 32, marginBottom: 32 },
  elegantPhaseName: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', color: '#F4E4BC', fontSize: 28, fontWeight: '400', letterSpacing: 1, textAlign: 'center', marginBottom: 8 },
  illuminationPercentage: { color: 'rgba(218,165,32,0.6)', fontSize: 10, fontWeight: '800', letterSpacing: 3, marginBottom: 16 },
  crispDescription: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '400', lineHeight: 22, textAlign: 'center' },
  timelineScrollPadded: { paddingHorizontal: 16, paddingVertical: 12, gap: 0 },
});

// ── Daily Ratings Styles ──
var dr = StyleSheet.create({
  card: {
    borderRadius: 24, overflow: 'hidden', marginBottom: 16,
    borderWidth: 1.5, borderColor: 'rgba(218,165,32,0.22)',
    padding: 24,
    ...boxShadow('rgba(180,140,40,0.20)', { width: 0, height: 6 }, 0.12, 20), elevation: 8,
  },
  title: {
    color: '#F4E4BC', fontSize: 20, fontWeight: '900', textAlign: 'center',
    marginBottom: 20, letterSpacing: 0.3,
    ...textShadow('rgba(218,165,32,0.25)', { width: 0, height: 1 }, 6),
  },
  grid: { gap: 14 },
  item: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingIcon: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  label: { color: 'rgba(244,228,188,0.70)', fontSize: 14, fontWeight: '700' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreBadge: {
    width: 34, height: 22, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  scoreNum: { fontSize: 11, fontWeight: '900' },
  barTrack: {
    flex: 1, height: 6, backgroundColor: 'rgba(218,165,32,0.06)',
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
    borderRadius: 24, overflow: 'hidden', marginBottom: 16,
    borderWidth: 1.5, borderColor: 'rgba(218,165,32,0.18)',
    padding: 24,
  },
  row: {
    flexDirection: 'row', justifyContent: 'center', gap: 16,
    marginTop: 4,
  },
  circle: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, overflow: 'hidden',
    backgroundColor: 'rgba(218,165,32,0.03)',
  },
  num: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
});

// ── Daily Mantra Styles ──
var mn = StyleSheet.create({
  card: {
    borderRadius: 20, overflow: 'hidden', marginBottom: 16,
    borderWidth: 1.5, borderColor: 'rgba(218,165,32,0.20)',
    padding: 24,
  },
  starRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
  },
  starMark: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(218,165,32,0.08)',
    borderWidth: 1, borderColor: 'rgba(218,165,32,0.20)',
  },
  headerLabel: {
    color: 'rgba(218,165,32,0.60)', fontSize: 11, fontWeight: '800',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  mantraText: {
    color: '#F4E4BC', fontSize: 16, fontWeight: '600', lineHeight: 26,
    fontStyle: 'italic', letterSpacing: 0.2,
  },
});

// ── Cosmic Shield Styles ──
var cs = StyleSheet.create({
  alertStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, overflow: 'hidden',
    paddingHorizontal: 16, paddingVertical: 12,
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
  alertTitle: { color: 'rgba(52,211,153,0.80)', fontSize: 14, fontWeight: '800' },
  alertTitleDanger: { color: '#FCA5A5' },
  alertDesc: { color: 'rgba(52,211,153,0.55)', fontSize: 11, fontWeight: '500', marginTop: 1 },
  alertDescDanger: { color: 'rgba(248,113,113,0.65)' },
  alertDot: { width: 8, height: 8, borderRadius: 4 },

  shieldRow: { flexDirection: 'row', gap: 8 },
  shieldCard: {
    flex: 1, borderRadius: 16, overflow: 'hidden', padding: 16,
    alignItems: 'center', borderWidth: 1,
    backgroundColor: 'rgba(218,165,32,0.03)', gap: 8,
  },
  shieldIcon: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  shieldLabel: { color: 'rgba(218,165,32,0.50)', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  shieldValue: { fontSize: 16, fontWeight: '900', textAlign: 'center' },
  shieldBarTrack: { width: '100%', height: 4, backgroundColor: 'rgba(218,165,32,0.06)', borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  shieldBarFill: { height: 4, borderRadius: 2 },

  compassGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginTop: 4 },
  compassDir: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 8, backgroundColor: 'rgba(52,211,153,0.08)',
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.15)',
  },
  compassDirBad: { backgroundColor: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.25)' },
  compassDirText: { color: 'rgba(52,211,153,0.70)', fontSize: 10, fontWeight: '700' },
  compassDirTextBad: { color: '#F87171' },
  avoidPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.20)',
  },
  avoidPillText: { color: '#F87171', fontSize: 10, fontWeight: '700' },

  yogaWrap: { gap: 8 },
  yogaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, overflow: 'hidden', padding: 12,
    borderWidth: 1, backgroundColor: 'rgba(218,165,32,0.03)',
  },
  yogaDot: { width: 8, height: 8, borderRadius: 4 },
  yogaName: { fontSize: 14, fontWeight: '800' },
  yogaDesc: { color: 'rgba(218,165,32,0.40)', fontSize: 11, lineHeight: 16, marginTop: 2 },
});
