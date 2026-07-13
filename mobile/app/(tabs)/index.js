import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import {
  View, Text, ScrollView, RefreshControl, TouchableOpacity,
  StyleSheet, Platform, Dimensions, Image, InteractionManager, Alert,
  ActivityIndicator,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as htmlToImage from 'html-to-image';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line, G, Defs, RadialGradient, LinearGradient as SvgLinearGradient, Stop, Ellipse, Path, Image as SvgImage, ClipPath } from 'react-native-svg';
import Animated, {
  FadeIn, FadeInDown, FadeInUp,
  useSharedValue, useAnimatedStyle, useAnimatedProps,
  withRepeat, withSequence, withTiming, withDelay,
  interpolate, Easing,
} from 'react-native-reanimated';
import DesktopScreenWrapper, { useDesktopCtx } from '../../components/DesktopScreenWrapper';
import SpringPressable from '../../components/effects/SpringPressable';
import CosmicLoader from '../../components/effects/CosmicLoader';
import PinchableView from '../../components/effects/PinchableView';
import CosmicCard from '../../components/ui/CosmicCard';
import SectionHeader from '../../components/ui/SectionHeader';
import useScreenInsets from '../../hooks/useScreenInsets';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    readingSi: 'මේෂ ලග්නෙන් ඉපදුණු ඔයාට තියෙන්නේ බය නැති, මාරම ඇක්ටිව්, නායකත්ව ගතිගුණ තියන ස්වභාවයක්. අනිත් අයට කලින් ඉස්සරහට යන්න ඔයාට පුළුවන්. හැබැයි ඉක්මන් වෙන එක පොඩ්ඩක් පාලනය කරලා වැඩ කළොත්, ජීවිතේ ලොකු ජයග්‍රහණ ගන්න එක ඔයාට ගේමක්ම නැහැ.',
    personalityEn: 'Your strongest pattern is courage in motion, you learn by doing and win when your energy has a clear direction.',
    personalitySi: 'ඔයාගේ ලොකුම ප්ලස් පොයින්ට් එක තමයි වැඩක් කරන්න බය නැතුව ඉස්සරහට පනින එක. පැහැදිලි අරමුණක් තියාගෙන වැඩ කළොත්, මාරම ස්පීඩ් එකකින් සාර්ථක ප්‍රතිඵල ගන්න ඔයාට පුළුවන්.',
    traitsEn: ['Brave', 'Fast starter', 'Independent', 'Protective'],
    traitsSi: ['බය නැහැ', 'ඉක්මන් ආරම්භයක්', 'ස්වාධීනයි', 'රැකබලා ගන්නවා'],
    gem: { en: 'Red Coral', si: 'රතු පබළු' },
    color: { en: 'Red, Orange', si: 'රතු, තැඹිලි' },
  },
  Vrishabha: {
    readingEn: 'Taurus Rising gives you a steady, tasteful, and dependable personality. You build life patiently, value comfort and loyalty, and do best when your plans are practical and financially grounded.',
    readingSi: 'වෘෂභ ලග්නෙන් ඉපදුණු ඔයා කැමති ස්ථාවර, කලබල නැති, නිදහස් ජීවිතේකට. වැඩක් පටන් ගත්තොත් බොහොම ඉවසීමෙන් ඒක ගොඩනගනවා. සල්ලි ගැන වගේම ජීවිතේ ගැනත් ප්‍රායෝගිකව හිතන නිසා ඔයාට ලොකු ගමනක් යන්න පුළුවන්.',
    personalityEn: 'Your strength is consistency, you move slowly when needed but rarely give up on something that truly matters.',
    personalitySi: 'ඔයාගේ ලොකුම ශක්තිය තමයි මේ නොසැලෙන ස්ථාවරත්වය. වෙලාවකට වැඩ ටිකක් හිමින් කළත්, ඇත්තටම වටින දේවල් කොහොම හරි අත්නාරින එක තමයි ඔයාගේ විශේෂත්වය.',
    traitsEn: ['Steady', 'Loyal', 'Tasteful', 'Determined'],
    traitsSi: ['ස්ථාවරයි', 'විශ්වාසවන්තයි', 'රසකාමීයි', 'අධිෂ්ඨානශීලීයි'],
    gem: { en: 'Diamond', si: 'දියමන්ති' },
    color: { en: 'White, Cream, Pink', si: 'සුදු, ක්‍රීම්, රෝස' },
  },
  Mithuna: {
    readingEn: 'Gemini Rising gives you a quick mind, flexible thinking, and a natural gift for words. You understand people through conversation and often succeed where ideas, learning, trade, or communication are important.',
    readingSi: 'මිථුන ලග්නෙන් ඉපදුණු ඔයාට තියෙන්නේ මාරම තියුණු මොළයක්. ඕනෙම තත්ත්වෙකට හැඩගැහෙන්න ඔයාට පුළුවන්. අලුත් අදහස් හොයන්න වගේම කතාබහ කරන්න ඔයාට තියෙන්නේ උපන් දක්ෂතාවයක්. ඒ නිසා හැමෝම එක්ක ලේසියෙන් ෆිට් වෙන්න ඔයාට පුළුවන්.',
    personalityEn: 'Your chart shows a mind that connects patterns quickly, but your best results come when you finish one clear path before chasing the next idea.',
    personalitySi: 'ඔයාගේ මනස මාර ස්පීඩ් එකට දේවල් අල්ලගන්නවා. හැබැයි අලුත් දේවල් පස්සේ දුවන්න කලින්, පටන් ගත්ත වැඩේ ඉවරයක් කරලා දැම්මොත් ඔයාට මාරම සුපිරි රිසල්ට් එකක් ගන්න පුළුවන්.',
    traitsEn: ['Quick-minded', 'Communicative', 'Adaptable', 'Curious'],
    traitsSi: ['මොළකාරයෙක්', 'කතාවට දක්ෂයි', 'හැඩගැසෙනසුළුයි', 'කුතුහලයෙන් පිරිලා'],
    gem: { en: 'Emerald', si: 'මරකත' },
    color: { en: 'Green, Light Yellow', si: 'කොළ, ලා කහ' },
  },
  Kataka: {
    readingEn: 'Cancer Rising gives you emotional depth, intuition, and a protective heart. Home, family, memory, and belonging shape many of your choices, and you often sensitive to what others feel before they say it.',
    readingSi: 'කටක ලග්නෙන් ඉපදුණු ඔයා හරිම සංවේදී, හැඟීම්බර කෙනෙක්. අනිත් අයව ආදරෙන් බලාගන්න ඔයාට තියෙන්නේ මාර ලස්සන හදවතක්. පවුලේ අය, ගෙදර දොර ගැන ඔයා හුඟක් හිතනවා. අනිත් අයගේ හිතේ තියන දේ කට ඇරලා කියන්න කලින්ම අල්ලගන්න ඔයාට පුළුවන්.',
    personalityEn: 'Your sensitivity is not weakness, it is your way of reading the room and protecting what matters.',
    personalitySi: 'ඔයාගේ මේ සංවේදීකම දුර්වලකමක් නෙවෙයි. වටපිටාවේ වෙන දේවල් ඉක්මනට තේරුම් අරන්, ඔයාට වටින දේවල් ආරක්ෂා කරගන්න ලැබුණු අපූර්ව හැකියාවක්.',
    traitsEn: ['Intuitive', 'Caring', 'Protective', 'Family-minded'],
    traitsSi: ['ඉවක් තියනවා', 'කරුණාවන්තයි', 'පවුලට ලැදියි', 'රැකබලා ගන්නවා'],
    gem: { en: 'Pearl', si: 'මුතු' },
    color: { en: 'White, Silver', si: 'සුදු, රිදී' },
  },
  Simha: {
    readingEn: 'Leo Rising gives you presence, pride, and a natural wish to create something meaningful. You are noticed easily, and your life opens when confidence is guided by generosity and responsibility.',
    readingSi: 'සිංහ ලග්නෙන් ඉපදුණු ඔයා පෙනුමෙන් වගේම වැඩවලිනුත් හැමෝම අතරේ කැපී පේන කෙනෙක්. සහජ නායකයෙක් විදිහට ඉස්සරහට යන්න ඔයාට පුළුවන්. ආත්ම විශ්වාසයයි කරුණාවයි එකතු කරලා වැඩ කළොත්, හැමෝම ආදරේ කරන කැපී පෙනෙන චරිතයක් වෙන්න පුළුවන්.',
    personalityEn: 'Your personality carries warmth and authority, people respond when you lead with heart rather than ego.',
    personalitySi: 'ඔයා ළඟ තියෙන උණුසුම් හදවත සහ අන් අයට උදව් කරන්න තියන ලැදියාව නිසා ලොකු පිළිගැනීමක් ලැබෙනවා. හැබැයි පොඩ්ඩක් තියන ආඩම්බර ගතිය පාලනය කරගත්තොත් වැඩේ තවත් ලස්සන වෙයි.',
    traitsEn: ['Confident', 'Warm-hearted', 'Commanding', 'Creative'],
    traitsSi: ['විශ්වාසවන්තයි', 'කැපී පෙනෙනවා', 'ආකර්ෂණීයයි', 'නිර්භීතයි'],
    gem: { en: 'Ruby', si: 'මාණික්‍ය' },
    color: { en: 'Gold, Orange, Red', si: 'රන්, තැඹිලි, රතු' },
  },
  Kanya: {
    readingEn: 'Virgo Rising gives you a careful mind, practical judgement, and a strong eye for detail. You improve whatever you touch, but your peace grows when perfection becomes a guide rather than pressure.',
    readingSi: 'කන්‍යා ලග්නෙන් ඉපදුණු ඔයා හරිම ප්‍රායෝගිකව, පිළිවෙළට වැඩ කරන කෙනෙක්. පුංචි පුංචි දේවල් ගැන පවා ඔයා ගොඩක් හිතනවා. අනිත් අයට උදව් කරන්න වගේම හැමදේම ලස්සනට තියාගන්න ඔයා මාරම උනන්දුයි.',
    personalityEn: 'Your chart shows a refined problem-solver, someone who notices what others miss and turns small corrections into real progress.',
    personalitySi: 'ඕනෙම ප්‍රශ්නයක් ලේසියෙන් විසඳගන්න හැකියාව ඔයාට තියනවා. හැමදේම 100%ක්ම පර්ෆෙක්ට් වෙන්න ඕනේ කියලා හිතලා ඔයා නිකන් ස්ට්‍රෙස් වෙන්න එපා.',
    traitsEn: ['Analytical', 'Practical', 'Organized', 'Helpful'],
    traitsSi: ['විශ්ලේෂණාත්මකයි', 'පිළිවෙළයි', 'උදව් කරනවා', 'ප්‍රායෝගිකයි'],
    gem: { en: 'Emerald', si: 'මරකත' },
    color: { en: 'Green, Earth tones', si: 'කොළ, පස් වර්ණ' },
  },
  Tula: {
    readingEn: 'Libra Rising gives you charm, balance, and a strong sense of fairness. Relationships, beauty, negotiation, and social harmony become important life themes, and you succeed by choosing peace without losing your own voice.',
    readingSi: 'තුලා ලග්නෙන් ඉපදුණු ඔයා සාමයට, සාධාරණත්වයට මාරම ලැදියි. ප්‍රශ්නයක් වුණාම පැති දෙකම බලලා සාධාරණව තීරණ ගන්න ඔයාට පුළුවන්. ලස්සන දේවල්, කලාව වගේ දේවල් වලටත් ඔයා සහජයෙන්ම කැමතියි.',
    personalityEn: 'Your gift is reading both sides of a situation, but your growth comes from making clear choices when balance becomes delay.',
    personalitySi: 'වෙන අයත් එක්ක එකතුවෙලා වැඩ කරන්න තියන හැකියාව තමයි ඔයාගේ ලොකුම ශක්තිය. තීරණ ගන්න ටිකක් කල් ගියත්, ගන්න තීරණය ගොඩක් වෙලාවට හරිම එක වෙනවා.',
    traitsEn: ['Diplomatic', 'Charming', 'Fair-minded', 'Artistic'],
    traitsSi: ['සාමකාමීයි', 'සාධාරණයි', 'කලාකාමීයි', 'සමබරයි'],
    gem: { en: 'Diamond', si: 'දියමන්ති' },
    color: { en: 'White, Pastel shades', si: 'සුදු, ලා වර්ණ' },
  },
  Vrischika: {
    readingEn: 'Scorpio Rising gives you an intense, private, and deeply observant nature. Mars adds courage under pressure, so you often transform through difficult moments and notice hidden motives before others do.',
    readingSi: 'වෘශ්චික ලග්නෙන් ඉපදුණු ඔයාට තියෙන්නේ ගැඹුරු හැඟීම් දාමයක්. යමක් කරන්න හිතුවොත් ඒකෙ අගමුල හොයනකම්ම අතාරින්නේ නැහැ. ඔයාගේ මානසික ශක්තිය මාරම ප්‍රබලයි.',
    personalityEn: 'Your power is emotional depth with control, you are strongest when you use intensity for healing, research, and focused action.',
    personalitySi: 'ඕනෙම අභියෝගයකදී වැටෙන්නේ නැතුව, අළු ගසලා නැගිටින එක ඔයාට නිකන්ම පිහිටලා තියනවා. අනිත් අයගේ හිතේ තියන දේ ඉක්මනින්ම තේරුම් ගන්න එකත් ඔයාගේ විශේෂත්වයක්.',
    traitsEn: ['Intense willpower', 'Magnetic', 'Deep thinker', 'Resilient'],
    traitsSi: ['රහස්‍යයි', 'අධිෂ්ඨානශීලීයි', 'ගැඹුරුයි', 'මානසික ශක්තිය'],
    gem: { en: 'Red Coral', si: 'රතු පබළු' },
    color: { en: 'Deep Red, Maroon', si: 'තද රතු, මෙරූන්' },
  },
  Dhanus: {
    readingEn: 'Sagittarius Rising gives you optimism, faith, and a love of truth. You grow through learning, travel, teaching, and big ideas, especially when freedom is balanced with responsibility.',
    readingSi: 'ධනු ලග්නෙන් ඉපදුණු ඔයා පට්ට නිදහස් කාමියෙක්. හැමදෙයක් දිහාම සුබවාදීව බලන ඔයා, සංචාරය කරන්න, අලුත් දේවල් ඉගෙනගන්න හරිම කැමතියි. ජීවිතේ යථාර්ථය හොයන එක ඔයාගේ හැටියක්.',
    personalityEn: 'Your chart points to a seeker, someone who needs meaning, movement, and a horizon to aim toward.',
    personalitySi: 'ඔයාගේ අවංකකම, කෙළින් කතා කරන ගතිය නිසා සමහර වෙලාවට අනිත් අයට රිදෙන්නත් පුළුවන්. හැබැයි ඔයා අනාගතය ගැන ගොඩක් දුර හිතලා තීරණ ගන්න කෙනෙක්.',
    traitsEn: ['Optimistic', 'Wise', 'Adventurous', 'Straightforward'],
    traitsSi: ['නිදහස්කාමීයි', 'සුබවාදීයි', 'අවංකයි', 'දාර්ශනිකයි'],
    gem: { en: 'Yellow Sapphire', si: 'පුෂ්පරාග' },
    color: { en: 'Yellow, Gold', si: 'කහ, රන්' },
  },
  Makara: {
    readingEn: 'Capricorn Rising gives you patience, discipline, and a serious approach to achievement. Your success usually comes step by step, through structure, endurance, and practical decisions.',
    readingSi: 'මකර ලග්නෙන් ඉපදුණු ඔයා කියන්නේ මාරම විනයක්, කැපවීමක් තියන කෙනෙක්. ජීවිතේ ලොකු ඉලක්ක තියාගෙන, ඒවාට හිමින් සැරේ, ස්ථාවරව යන එක තමයි ඔයාගේ ක්‍රමය. මහන්සි වෙලා වැඩ කරන්න ඔයාට තියෙන්නේ ලොකු හයියක්.',
    personalityEn: 'Your strength is long-term focus, you may start quietly but you can outlast people who move faster at the beginning.',
    personalitySi: 'වගකීම් අරගන්න බය නැති ඔයා, අමාරු කාලවලදීත් වැටෙන්නේ නැතුව ඉස්සරහටම යනවා. පවුලේ අය වෙනුවෙනුත් ඔයා ලොකු වගකීමක් දරන කෙනෙක්.',
    traitsEn: ['Disciplined', 'Responsible', 'Patient', 'Strategic'],
    traitsSi: ['විනයගරුකයි', 'අරමුණු සහගතයි', 'වගකීම් දරනවා', 'කැපවෙනවා'],
    gem: { en: 'Blue Sapphire', si: 'නිල් මැණික්' },
    color: { en: 'Dark Blue, Black', si: 'තද නිල්, කළු' },
  },
  Kumbha: {
    readingEn: 'Aquarius Rising gives you originality, independence, and a mind that looks beyond the usual path. You are drawn to systems, communities, technology, and ideas that can improve life for many people.',
    readingSi: 'කුම්භ ලග්නෙන් ඉපදුණු ඔයා හැමතිස්සෙම අලුත් විදිහට හිතන, අනාගතය දකින කෙනෙක්. යාළුවන්ට, සමාජයට ගොඩක් ළැදියි. සම්ප්‍රදායික රාමුවලින් පිටතට ගිහින් අලුත් දේවල් හොයන්න ඔයා හරිම දක්ෂයි.',
    personalityEn: 'Your personality carries distance and vision, you often understand where things are going before others are ready to accept it.',
    personalitySi: 'ඔයා අනිත් හැමෝටම සමානව සලකන කෙනෙක්. හැඟීම්වලට වඩා බුද්ධියට තැන දීලා වැඩ කරන නිසා, සමහර වෙලාවට ඔයා ටිකක් තනියම ඉන්න හැදුවත්, ඇතුළින් ඔයා ගොඩක් මානුෂීයයි.',
    traitsEn: ['Original', 'Independent', 'Humanitarian', 'Forward-looking'],
    traitsSi: ['අලුත් විදිහට හිතනවා', 'මිත්‍රශීලීයි', 'මානුෂීයයි', 'ස්වාධීනයි'],
    gem: { en: 'Blue Sapphire', si: 'නිල් මැණික්' },
    color: { en: 'Electric Blue, Violet', si: 'දීප්තිමත් නිල්, දම්' },
  },
  Meena: {
    readingEn: 'Pisces Rising gives you compassion, imagination, and a deeply receptive heart. You absorb moods easily and do best when creativity, faith, and service have healthy boundaries.',
    readingSi: 'මීන ලග්නෙන් ඉපදුණු ඔයා මාරම සංවේදී, අනිත් අය වෙනුවෙන් හදවතින්ම හිතන කෙනෙක්. කලාත්මක හැකියාවන් සහ ගැඹුරු ආධ්‍යාත්මික ගතිගුණ ඔයාට උපතින්ම පිහිටලා තියනවා.',
    personalityEn: 'Your gift is emotional imagination, you can comfort, create, and understand what cannot always be explained in words.',
    personalitySi: 'අනිත් අයගේ ප්‍රශ්නවලදී ඔයාටත් ඒ දුක ඒ විදිහටම දැනෙනවා. හිතින් ලස්සන ලෝක මවන්න ඔයා දක්ෂයි වගේම, හැම වෙලාවටම අනිත් අයට උදව් කරන්න තමයි ඔයාගේ හිත කියන්නේ.',
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

// (removed in v3 viral redesign)
// (removed in v3 viral redesign)
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

// ═══════════════════════════════════════════════════════════════════════
//  FUTURE WINDOWS BAIT — free users' locked timeline cards from onboarding
//  (the second half of the onboarding soft-wall: their real, dated dasha
//   windows persist at the top of Home; tapping opens the paywall)
// ═══════════════════════════════════════════════════════════════════════

var REVEAL_STORAGE_KEY = 'grahachara_onboarding_reveal';

function FutureWindowsBait() {
  var { user, showPaywall } = useAuth();
  var { language } = useLanguage();
  var [cards, setCards] = useState(null);

  var isFree = user && user.isSubscribed !== true;

  useEffect(function () {
    if (!isFree) { setCards(null); return; }
    var mounted = true;
    AsyncStorage.getItem(REVEAL_STORAGE_KEY).then(function (raw) {
      if (!mounted || !raw) return;
      try {
        var payload = JSON.parse(raw);
        var fc = payload && payload.reveal && payload.reveal.futureCards;
        if (fc) fc = fc.filter(function (c) { return c.locked !== false; });
        if (fc && fc.length) setCards(fc.slice(0, 3));
      } catch (e) { /* corrupt cache — ignore */ }
    }).catch(function () {});
    return function () { mounted = false; };
  }, [isFree]);

  if (!isFree || !cards) return null;

  var heading = language === 'si' ? 'ඔයාගේ අගුළු දැමූ කවුළු' : 'YOUR LOCKED WINDOWS';
  var cta = language === 'si' ? 'කාලරේඛාව විවෘත කරන්න' : 'Unlock timeline';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={function () { Promise.resolve(showPaywall('home_future_windows')).catch(function () {}); }}
      style={{ marginBottom: 16, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,184,0,0.20)', backgroundColor: 'rgba(255,184,0,0.045)' }}
    >
      <View style={{ paddingVertical: 13, paddingHorizontal: 15 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
          <Text style={{ fontSize: 10, fontWeight: '900', color: '#FFB800', letterSpacing: 1.6 }}>{heading}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, backgroundColor: 'rgba(255,184,0,0.14)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.3)' }}>
            <Ionicons name="lock-open-outline" size={11} color="#FFD666" />
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#FFD666' }}>{cta}</Text>
          </View>
        </View>
        {cards.map(function (card) {
          return (
            <View key={card.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 6 }}>
              <Ionicons name={card.icon || 'sparkles-outline'} size={15} color={card.color || '#FFB800'} />
              <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '700', color: 'rgba(255,255,255,0.75)', flex: 1 }}>
                {card.title} — <Text style={{ color: card.color || '#FFB800' }}>{card.window}</Text>
              </Text>
              <Ionicons name="lock-closed" size={11} color="rgba(255,184,0,0.5)" />
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  CONVERGENCE TIMELINE — the 12-month dated-window forecast (retention).
//  Free: intensity strip (dots) + locked window headers → paywall.
//  Pro:  full windows with the driver reason behind each.
// ═══════════════════════════════════════════════════════════════════════
var CONV_DOMAINS = {
  career: { en: 'Career', si: 'රැකියාව',  icon: 'briefcase-outline', color: '#B7A6F0' },
  love:   { en: 'Love',   si: 'ආදරය',    icon: 'heart-outline',     color: '#F5A9C7' },
  money:  { en: 'Money',  si: 'මුදල්',   icon: 'wallet-outline',    color: '#E8C56A' },
  health: { en: 'Health', si: 'සෞඛ්‍යය', icon: 'fitness-outline',   color: '#F0968A' },
  travel: { en: 'Travel', si: 'ගමන්',    icon: 'navigate-outline',  color: '#8AB4F0' },
  family: { en: 'Family', si: 'පවුල',    icon: 'people-outline',    color: '#F0A9B8' },
};

function convIntensityColor(v) {
  if (v >= 70) return '#86EFAC';
  if (v >= 55) return '#E8C56A';
  if (v >= 40) return 'rgba(255,255,255,0.32)';
  return '#FCA5A5';
}

// Normalize either the free preview slice or the full Pro calendar into one
// shape the component renders: { locked, strip:[{label,intensity}],
// windows:[{domain,type,tier,range,driver?}] }.
function normalizeConvergence(raw, isFree) {
  if (!raw) return null;
  var range = function (a, b) { return a === b ? a : (a + ' – ' + b); };
  if (isFree) {
    return {
      locked: true,
      strip: (raw.strip || []).map(function (m) { return { label: m.label, intensity: m.intensity }; }),
      windows: (raw.lockedWindows || []).map(function (w) {
        return { domain: w.domain, type: w.type, tier: w.tier, range: range(w.startLabel, w.endLabel) };
      }),
    };
  }
  return {
    locked: false,
    strip: (raw.months || []).map(function (m) {
      var vals = Object.keys(m.scores || {}).map(function (k) { return m.scores[k]; });
      var avg = vals.length ? Math.round(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length) : 50;
      return { label: m.label, intensity: avg };
    }),
    windows: (raw.windows || []).map(function (w) {
      return {
        domain: w.domain, type: w.type, tier: w.tier, range: range(w.startLabel, w.endLabel),
        driver: (w.drivers && w.drivers[0] && w.drivers[0].text) || null,
      };
    }),
  };
}

var ConvergenceTimeline = React.memo(function ConvergenceTimeline({ data, language, onUnlock }) {
  if (!data || !data.strip || !data.strip.length) return null;
  var si = language === 'si';
  var locked = data.locked;
  var maxWin = locked ? 4 : 5;
  return (
    <Animated.View entering={FadeInDown.delay(280).springify()}>
      <View style={conv.card}>
        <LinearGradient colors={['#141019', '#0F0B15', '#0A0710']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <SectionHeader
          title={si ? 'ඔබේ ඉදිරි මාස 12' : 'Your Next 12 Months'}
          subtitle={si ? 'දශාව හා ග්‍රහ ගමන අනුව දින සහිත කාල' : "Dated windows from your dasha & transits"}
          iconName="calendar-outline" iconColor="#A78BFA" delay={280}
        />
        <View style={conv.strip}>
          {data.strip.map(function (m, i) {
            var clamped = Math.max(5, Math.min(98, m.intensity));
            var h = 10 + Math.round((clamped / 98) * 34);
            return (
              <View key={i} style={conv.stripCol}>
                <View style={conv.stripBarWrap}>
                  <View style={{ height: h, width: '78%', borderRadius: 3, backgroundColor: convIntensityColor(m.intensity), opacity: locked ? 0.72 : 1 }} />
                </View>
                <Text style={conv.stripLabel}>{String(m.label || '').slice(0, 1)}</Text>
              </View>
            );
          })}
        </View>
        <View style={conv.winList}>
          {data.windows.slice(0, maxWin).map(function (w, i) {
            var meta = CONV_DOMAINS[w.domain] || { en: w.domain, si: w.domain, icon: 'sparkles-outline', color: '#FFB800' };
            var isOpp = w.type === 'opportunity';
            return (
              <View key={i} style={conv.winRow}>
                <View style={[conv.winIcon, { backgroundColor: meta.color + '1e', borderColor: meta.color + '40' }]}>
                  <Ionicons name={meta.icon} size={13} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={conv.winTop}>
                    <Text style={conv.winArea}>{si ? meta.si : meta.en}</Text>
                    <Ionicons name={isOpp ? 'trending-up' : 'alert-circle-outline'} size={11} color={isOpp ? '#86EFAC' : '#FCA5A5'} />
                    <Text style={[conv.winRange, { color: meta.color }]} numberOfLines={1}>{w.range}</Text>
                  </View>
                  {(!locked && w.driver) ? <Text style={conv.winDriver} numberOfLines={1}>{w.driver}</Text> : null}
                </View>
                {locked
                  ? <Ionicons name="lock-closed" size={12} color="rgba(167,139,250,0.6)" />
                  : <Text style={conv.winTier}>{w.tier}</Text>}
              </View>
            );
          })}
        </View>
        {locked ? (
          <TouchableOpacity activeOpacity={0.85} onPress={onUnlock} style={conv.cta}>
            <Ionicons name="lock-open-outline" size={13} color="#160E28" />
            <Text style={conv.ctaText}>{si ? 'හේතුව සහ කළ යුතු දේ විවෘත කරන්න' : 'Unlock why & what to do'}</Text>
            <Ionicons name="arrow-forward" size={14} color="#160E28" />
          </TouchableOpacity>
        ) : null}
      </View>
    </Animated.View>
  );
});

var conv = StyleSheet.create({
  card: { borderRadius: 20, overflow: 'hidden', padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(167,139,250,0.18)' },
  strip: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12, paddingHorizontal: 2 },
  stripCol: { flex: 1, alignItems: 'center', gap: 4 },
  stripBarWrap: { height: 44, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  stripLabel: { fontSize: 8, color: 'rgba(255,255,255,0.35)', fontWeight: '700' },
  winList: { marginTop: 12 },
  winRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  winIcon: { width: 26, height: 26, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  winTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  winArea: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.9)' },
  winRange: { fontSize: 11.5, fontWeight: '700', flexShrink: 1 },
  winDriver: { fontSize: 10.5, color: 'rgba(255,255,255,0.45)', marginTop: 1 },
  winTier: { fontSize: 11, color: '#E8C56A', fontWeight: '800', letterSpacing: 1 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, paddingVertical: 11, borderRadius: 12, backgroundColor: '#A78BFA' },
  ctaText: { fontSize: 12.5, fontWeight: '800', color: '#160E28', letterSpacing: 0.2 },
});

/**
 * ToolsRow — two life-event entry cards on Home that route to the Subha Nakath
 * planner and the Baby Kendara pack. Acquisition surfaces: they open a free
 * tease, then paywall. Kept lightweight so they read like part of the flow.
 */
var TOOLS = [
  {
    key: 'nakath', route: '/nakath',
    icon: 'time', accent: '#E8C56A', bg: 'rgba(232,197,106,0.10)', border: 'rgba(232,197,106,0.22)',
    title: { en: 'Subha Nakath', si: 'සුබ නැකැත්' },
    sub: { en: 'Best time for exams, jobs, weddings', si: 'විභාග, රැකියා, විවාහ සඳහා සුබ මොහොත' },
  },
  {
    key: 'baby', route: '/baby',
    icon: 'happy', accent: '#F472B6', bg: 'rgba(244,114,182,0.10)', border: 'rgba(244,114,182,0.22)',
    title: { en: 'Baby Kendara', si: 'බිලිඳු කේන්දරය' },
    sub: { en: 'Naming letters, doshas, ceremony dates', si: 'නාම අකුරු, දෝෂ, නම් තැබීමේ නැකැත්' },
  },
];

var ToolsRow = React.memo(function ToolsRow({ router, language }) {
  var si = language === 'si';
  return (
    <View style={tools.wrap}>
      {TOOLS.map(function (tool) {
        return (
          <TouchableOpacity
            key={tool.key}
            activeOpacity={0.85}
            onPress={function () { router.push(tool.route); }}
            style={[tools.card, { backgroundColor: tool.bg, borderColor: tool.border }]}
          >
            <View style={[tools.iconWrap, { borderColor: tool.border }]}>
              <Ionicons name={tool.icon} size={18} color={tool.accent} />
            </View>
            <Text style={tools.title} numberOfLines={1}>{si ? tool.title.si : tool.title.en}</Text>
            <Text style={tools.sub} numberOfLines={2}>{si ? tool.sub.si : tool.sub.en}</Text>
            <View style={tools.footer}>
              <Text style={[tools.open, { color: tool.accent }]}>{si ? 'විවෘත කරන්න' : 'Open'}</Text>
              <Ionicons name="arrow-forward" size={12} color={tool.accent} />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

var tools = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  card: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 14 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  title: { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.95)' },
  sub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3, lineHeight: 15, minHeight: 30 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  open: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.2 },
});

/**
 * PredictionCheckins — asks "did our prediction come true?" for a dated window
 * that has opened/closed. One card at a time (least friction). Yes/Partly/No
 * posts an outcome and reveals the next due prediction. Retention + trust +
 * calibration data in one surface. Pro-only (free users have no ledger).
 */
var CK_DOMAIN = {
  love:      { en: 'Love & marriage', si: 'ආදරය සහ විවාහය', icon: 'heart', color: '#F472B6' },
  career:    { en: 'Career', si: 'රැකියාව', icon: 'briefcase', color: '#93C5FD' },
  wealth:    { en: 'Wealth', si: 'ධනය', icon: 'cash', color: '#34D399' },
  finance:   { en: 'Wealth', si: 'ධනය', icon: 'cash', color: '#34D399' },
  health:    { en: 'Health', si: 'සෞඛ්‍යය', icon: 'fitness', color: '#FCA5A5' },
  education: { en: 'Education', si: 'අධ්‍යාපනය', icon: 'school', color: '#C4B5FD' },
  family:    { en: 'Family', si: 'පවුල', icon: 'home', color: '#FBBF24' },
};
var CK_MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  si: ['ජන', 'පෙබ', 'මාර්', 'අප්‍රේ', 'මැයි', 'ජූනි', 'ජූලි', 'අගෝ', 'සැප්', 'ඔක්', 'නොවැ', 'දෙසැ'],
};
function ckMonth(iso, lang) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d)) return '';
  return CK_MONTHS[lang === 'si' ? 'si' : 'en'][d.getMonth()] + ' ' + d.getFullYear();
}

var PredictionCheckins = React.memo(function PredictionCheckins({ items, language, onAnswer }) {
  if (!items || !items.length) return null;
  var si = language === 'si';
  var item = items[0];
  var dom = CK_DOMAIN[item.domain] || { en: 'This', si: 'මෙය', icon: 'sparkles', color: '#E8C56A' };
  var win = ckMonth(item.windowStart, language);
  var winEnd = ckMonth(item.windowEnd, language);
  var range = win && winEnd && win !== winEnd ? (win + ' – ' + winEnd) : (win || winEnd);
  var opts = [
    { key: 'yes', label: si ? 'ඔව්' : 'Yes', icon: 'checkmark-circle', color: '#34D399' },
    { key: 'partial', label: si ? 'ටිකක්' : 'Partly', icon: 'remove-circle', color: '#FBBF24' },
    { key: 'no', label: si ? 'නැහැ' : 'No', icon: 'close-circle', color: '#FCA5A5' },
  ];
  return (
    <Animated.View entering={FadeIn.duration(400)} style={ck.card}>
      <LinearGradient colors={['rgba(232,197,106,0.10)', 'rgba(232,197,106,0.02)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View style={ck.head}>
        <View style={[ck.domChip, { borderColor: dom.color + '55', backgroundColor: dom.color + '18' }]}>
          <Ionicons name={dom.icon} size={12} color={dom.color} />
          <Text style={[ck.domText, { color: dom.color }]}>{si ? dom.si : dom.en}</Text>
        </View>
        {range ? <Text style={ck.range}>{range}</Text> : null}
      </View>
      <Text style={ck.q}>{si ? 'අපේ අනාවැකිය හරි උනාද?' : 'Did our prediction come true?'}</Text>
      {item.claim ? <Text style={ck.claim} numberOfLines={3}>{item.claim}</Text> : null}
      <View style={ck.opts}>
        {opts.map(function (o) {
          return (
            <TouchableOpacity key={o.key} activeOpacity={0.8} onPress={function () { onAnswer(item, o.key); }}
              style={[ck.opt, { borderColor: o.color + '44' }]}>
              <Ionicons name={o.icon} size={15} color={o.color} />
              <Text style={[ck.optText, { color: o.color }]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={ck.foot}>{si ? 'ඔබේ පිළිතුරු අපේ අනාවැකි වඩාත් නිවැරදි කරයි.' : 'Your answers make your future readings sharper.'}</Text>
    </Animated.View>
  );
});

var ck = StyleSheet.create({
  card: { borderRadius: 20, overflow: 'hidden', padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(232,197,106,0.22)' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  domChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  domText: { fontSize: 11, fontWeight: '800' },
  range: { fontSize: 11.5, fontWeight: '700', color: 'rgba(255,255,255,0.55)' },
  q: { fontSize: 15.5, fontWeight: '800', color: 'rgba(255,255,255,0.95)' },
  claim: { fontSize: 12.5, color: 'rgba(255,255,255,0.6)', marginTop: 5, lineHeight: 17 },
  opts: { flexDirection: 'row', gap: 8, marginTop: 14 },
  opt: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)' },
  optText: { fontSize: 12.5, fontWeight: '800' },
  foot: { fontSize: 10.5, color: 'rgba(255,255,255,0.4)', marginTop: 11, textAlign: 'center' },
});

/**
 * WinBackBanner — shown only to lapsed subscribers (was Pro, now free). Warm,
 * loss-framed reminder that their saved reports/calendar/chat are paused, not
 * gone. One tap opens the win-back paywall. Dismissable for the session.
 */
var WinBackBanner = React.memo(function WinBackBanner({ language, onReactivate, onDismiss }) {
  var si = language === 'si';
  return (
    <Animated.View entering={FadeIn.duration(400)} style={wb.card}>
      <LinearGradient colors={['rgba(255,184,0,0.14)', 'rgba(255,140,0,0.04)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <TouchableOpacity onPress={onDismiss} style={wb.close} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}>
        <Ionicons name="close" size={16} color="rgba(255,255,255,0.4)" />
      </TouchableOpacity>
      <View style={wb.row}>
        <View style={wb.icon}>
          <Ionicons name="sparkles" size={20} color="#FFB800" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={wb.title}>{si ? 'ආයුබෝවන්,' : 'Welcome back 🌙'}</Text>
          <Text style={wb.sub}>{si
            ? 'ඔයාගේ රිපෝට්, කැලැන්ඩර්, චැට්ස් නැති වෙලා නැහැ, පොඩ්ඩකට නවතිලා විතරයි'
            : 'Your reports, calendar and chat guide are paused — not gone.'}</Text>
        </View>
      </View>
      <TouchableOpacity activeOpacity={0.85} onPress={onReactivate} style={wb.cta}>
        <Ionicons name="lock-open-outline" size={14} color="#160E28" />
        <Text style={wb.ctaText}>{si ? 'මගේ ප්‍රවේශය නැවත සක්‍රිය කරන්න' : 'Reactivate my access'}</Text>
        <Ionicons name="arrow-forward" size={14} color="#160E28" />
      </TouchableOpacity>
    </Animated.View>
  );
});

var wb = StyleSheet.create({
  card: { borderRadius: 20, overflow: 'hidden', padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,184,0,0.28)' },
  close: { position: 'absolute', top: 10, right: 10, zIndex: 2, padding: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 20 },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,184,0,0.14)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.30)' },
  title: { fontSize: 15, fontWeight: '800', color: 'rgba(255,255,255,0.96)' },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 3, lineHeight: 16 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: '#FFB800' },
  ctaText: { fontSize: 13, fontWeight: '800', color: '#160E28', letterSpacing: 0.2 },
});

// ═══════════════════════════════════════════════════════════════════════
//  SLT day helpers — one true "today" boundary (Sri Lanka, UTC+5:30)
//  Fixes the old bug where ratings used device-local date, the mantra used
//  UTC (rolled at 05:30 SLT), and IntentionCard used ISO/UTC — three
//  different "todays" on one screen.
// ═══════════════════════════════════════════════════════════════════════
var SLT_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function sltDayIndex(nowMs) {
  // Whole days since epoch, measured on the Sri Lanka clock.
  return Math.floor(((nowMs != null ? nowMs : Date.now()) + SLT_OFFSET_MS) / 86400000);
}
function fmtHM(ms, t) {
  if (ms == null || isNaN(ms)) return '--:--';
  var slt = new Date(ms + SLT_OFFSET_MS);
  var h = slt.getUTCHours(), m = slt.getUTCMinutes();
  var ampm = h >= 12 ? 'pm' : 'am';
  var h12 = h % 12 || 12;
  return h12 + ':' + String(m).padStart(2, '0') + ' ' + (t ? t(ampm) : ampm.toUpperCase());
}
function parseMs(v) {
  if (!v) return NaN;
  if (typeof v === 'object' && v.iso) return new Date(v.iso).getTime();
  var d = new Date(v);
  return d.getTime();
}

// ═══════════════════════════════════════════════════════════════════════
//  REAL life-area scores — replaces the old fake genScore() that was
//  identical for every user. Derived from the user's lagna + today's real
//  jyotish signals (Tara Balam, Chandrashtama) + panchanga, so it genuinely
//  varies per user and per day. (A server-side transit engine is the ideal
//  upgrade; this is the honest on-device version.)
// ═══════════════════════════════════════════════════════════════════════
var LIFE_AREAS = [
  { key: 'love',   en: 'Love',    si: 'ආදරය',   icon: 'heart-outline',      color: '#F5A9C7', w: 11 },
  { key: 'work',   en: 'Work',    si: 'රැකියාව', icon: 'briefcase-outline',  color: '#B7A6F0', w: 29 },
  { key: 'family', en: 'Family',  si: 'පවුල',    icon: 'people-outline',     color: '#F0A9B8', w: 17 },
  { key: 'money',  en: 'Money',   si: 'මුදල්',   icon: 'wallet-outline',     color: '#E8C56A', w: 23 },
  { key: 'health', en: 'Health',  si: 'සෞඛ්‍යය', icon: 'fitness-outline',    color: '#F0968A', w: 7  },
  { key: 'travel', en: 'Travel',  si: 'ගමන්',    icon: 'navigate-outline',   color: '#8AB4F0', w: 13 },
];
// Words beat numbers: instant-read verdicts for scores (never negative — care, not doom)
function energyWord(pct, language) {
  if (pct >= 85) return language === 'si' ? 'ඉතා සුබයි' : 'Radiant';
  if (pct >= 70) return language === 'si' ? 'සුබයි' : 'Strong';
  if (pct >= 55) return language === 'si' ? 'සමබරයි' : 'Balanced';
  if (pct >= 40) return language === 'si' ? 'මධ්‍යමයි' : 'Gentle';
  return language === 'si' ? 'ප්‍රවේශමෙන්' : 'Careful';
}
function energyPhrase(pct, language) {
  if (pct >= 70) return language === 'si' ? 'ග්‍රහ බලය ඔබ පැත්තේ' : 'The planets lean your way';
  if (pct >= 50) return language === 'si' ? 'සමබර ශක්තියක් — හොඳින් යොදාගන්න' : 'Steady energy — use it well';
  return language === 'si' ? 'අද හෙමින්, සිහියෙන් යන්න' : 'Move gently today';
}
function areaWord(score, language) {
  if (score >= 75) return language === 'si' ? 'ඉහළයි' : 'High';
  if (score >= 60) return language === 'si' ? 'හොඳයි' : 'Good';
  if (score >= 45) return language === 'si' ? 'මධ්‍යමයි' : 'Fair';
  return language === 'si' ? 'ප්‍රවේශමෙන්' : 'Care';
}

function computeLifeScores(chartData, jyotishToday, data, language) {
  var lagnaId = chartData && chartData.lagna ? (chartData.lagna.rashiId || chartData.lagna.id || 1) : 1;
  var tb = jyotishToday && jyotishToday.taraBalam;
  var ch = jyotishToday && jyotishToday.chandrashtama;
  var personal = tb && typeof tb.score === 'number' ? tb.score : 62;
  var chPenalty = ch && ch.isActive ? 16 : 0;
  var tithi = data && data.panchanga && data.panchanga.tithi && data.panchanga.tithi.number ? data.panchanga.tithi.number : 8;
  var nak = data && data.panchanga && data.panchanga.nakshatra && data.panchanga.nakshatra.number ? data.panchanga.nakshatra.number : 5;
  var total = 0;
  var scores = LIFE_AREAS.map(function (a, i) {
    // real-derived, bounded per-area modulation (deterministic for the day)
    var swing = ((lagnaId * 7 + tithi * 3 + nak * 5 + a.w) % 34) - 15;
    var s = Math.round(personal + swing - chPenalty);
    s = Math.max(34, Math.min(95, s));
    total += s;
    return {
      key: a.key,
      label: language === 'si' ? a.si : a.en,
      score: s,
      color: a.color,
      icon: a.icon,
    };
  });
  return {
    scores: scores,
    overall: Math.round(total / LIFE_AREAS.length),
    personalized: !!(tb && typeof tb.score === 'number' && chartData && chartData.lagna),
  };
}

// ═══════════════════════════════════════════════════════════════════════
//  AURA — radial petal chart for the six life areas (signature visual)
// ═══════════════════════════════════════════════════════════════════════
function auraPetalPath(cx, cy, angle, inner, len, halfW) {
  var tipX = cx + Math.cos(angle) * len, tipY = cy + Math.sin(angle) * len;
  var b1X = cx + Math.cos(angle - halfW) * inner, b1Y = cy + Math.sin(angle - halfW) * inner;
  var b2X = cx + Math.cos(angle + halfW) * inner, b2Y = cy + Math.sin(angle + halfW) * inner;
  var c1X = cx + Math.cos(angle - halfW * 0.5) * len * 0.72, c1Y = cy + Math.sin(angle - halfW * 0.5) * len * 0.72;
  var c2X = cx + Math.cos(angle + halfW * 0.5) * len * 0.72, c2Y = cy + Math.sin(angle + halfW * 0.5) * len * 0.72;
  return 'M' + b1X.toFixed(1) + ' ' + b1Y.toFixed(1) +
    ' Q' + c1X.toFixed(1) + ' ' + c1Y.toFixed(1) + ' ' + tipX.toFixed(1) + ' ' + tipY.toFixed(1) +
    ' Q' + c2X.toFixed(1) + ' ' + c2Y.toFixed(1) + ' ' + b2X.toFixed(1) + ' ' + b2Y.toFixed(1) + ' Z';
}
var AuraScores = React.memo(function AuraScores({ result, language, locked, onUnlock }) {
  var realScores = result.scores;
  // When locked (free users), the petals render at a uniform teaser length so
  // the per-area breakdown — the actual answer — never leaks. The overall
  // number stays real: that's the hook ("your day is X — but where?").
  var scores = locked
    ? realScores.map(function (a) { return Object.assign({}, a, { score: 52 }); })
    : realScores;
  var C = 83, inner = 24, maxR = 72;
  var overallColor = result.overall >= 70 ? '#86EFAC' : result.overall >= 50 ? '#E8C56A' : '#FCA5A5';
  return (
    <Animated.View entering={FadeInDown.delay(300).springify()}>
      <View style={aur.card}>
        <LinearGradient colors={['#181022', '#120B1C', '#0C0714']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <LinearGradient colors={['rgba(232,197,106,0.09)', 'transparent']} style={aur.topVeil} pointerEvents="none" />
        <SectionHeader
          title={language === 'si' ? 'අද ඔබේ දවස' : 'Your Day, Scored'}
          subtitle={language === 'si' ? 'ඔබේ කේන්දරයට හා අද ග්‍රහ ගමනට අනුව' : "Tuned to your chart & today's transits"}
          iconName="sparkles-outline" iconColor="#E8C56A" delay={300}
        />
        <View style={aur.row}>
          <View style={aur.chartWrap}>
            <Svg width={130} height={130} viewBox="0 0 166 166">
              <Defs>
                <RadialGradient id="auraHalo" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#E8C56A" stopOpacity="0.15" />
                  <Stop offset="0.55" stopColor="#7B49CF" stopOpacity="0.10" />
                  <Stop offset="1" stopColor="#7B49CF" stopOpacity="0" />
                </RadialGradient>
                <RadialGradient id="auraCore" cx="44%" cy="38%" r="62%">
                  <Stop offset="0" stopColor="#2C2240" />
                  <Stop offset="1" stopColor="#110B1D" />
                </RadialGradient>
                {scores.map(function (a) {
                  return (
                    <RadialGradient key={'pg' + a.key} id={'petal' + a.key} cx="50%" cy="50%" r="50%">
                      <Stop offset="0.18" stopColor={a.color} stopOpacity="0.04" />
                      <Stop offset="0.72" stopColor={a.color} stopOpacity="0.48" />
                      <Stop offset="1" stopColor={a.color} stopOpacity="0.95" />
                    </RadialGradient>
                  );
                })}
              </Defs>
              <Circle cx={C} cy={C} r={82} fill="url(#auraHalo)" />
              <Circle cx={C} cy={C} r={76} stroke="rgba(232,197,106,0.15)" strokeWidth="1" strokeDasharray="2 5" fill="none" />
              {[1, 2, 3].map(function (r) {
                return <Circle key={'rg' + r} cx={C} cy={C} r={inner + (maxR - inner) * r / 3} stroke="rgba(255,255,255,0.045)" strokeWidth="1" fill="none" />;
              })}
              {scores.map(function (a, i) {
                var ang = (i / scores.length) * Math.PI * 2 - Math.PI / 2;
                return (
                  <Line key={'sp' + a.key}
                    x1={C + Math.cos(ang) * 76} y1={C + Math.sin(ang) * 76}
                    x2={C + Math.cos(ang) * 80} y2={C + Math.sin(ang) * 80}
                    stroke={a.color + '66'} strokeWidth="1.5" strokeLinecap="round" />
                );
              })}
              {scores.map(function (a, i) {
                var ang = (i / scores.length) * Math.PI * 2 - Math.PI / 2;
                var len = inner + (a.score / 100) * (maxR - inner);
                return <Path key={'pt' + a.key} d={auraPetalPath(C, C, ang, inner, len, 0.42)} fill={'url(#petal' + a.key + ')'} stroke={a.color + 'AA'} strokeWidth="1.2" />;
              })}
              {scores.map(function (a, i) {
                var ang = (i / scores.length) * Math.PI * 2 - Math.PI / 2;
                var len = inner + (a.score / 100) * (maxR - inner);
                var tx = C + Math.cos(ang) * len, ty = C + Math.sin(ang) * len;
                return (
                  <G key={'gl' + a.key}>
                    <Circle cx={tx} cy={ty} r={3.6} stroke={a.color + '77'} strokeWidth="1" fill="none" />
                    <Circle cx={tx} cy={ty} r={1.7} fill="#FFF8E7" opacity="0.95" />
                  </G>
                );
              })}
              <Circle cx={C} cy={C} r={inner - 2} fill="url(#auraCore)" stroke={overallColor + '66'} strokeWidth="1.2" />
            </Svg>
            <View style={aur.centerOverlay} pointerEvents="none">
              <Text style={[aur.overallWord, { color: overallColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{energyWord(result.overall, language)}</Text>
              <Text style={aur.overallLbl}>{language === 'si' ? 'සමස්ත' : 'OVERALL'}</Text>
            </View>
          </View>
          <View style={aur.legend}>
            {scores.map(function (a, i) {
              return (
                <Animated.View key={a.key} entering={FadeInUp.delay(360 + i * 45).springify()} style={aur.legRow}>
                  <View style={[aur.legIcon, { backgroundColor: a.color + '1c', borderColor: a.color + '40' }]}>
                    <Ionicons name={a.icon} size={12} color={a.color} />
                  </View>
                  <Text style={aur.legName} numberOfLines={1}>{a.label}</Text>
                  <View style={aur.legBarTrack}>
                    {locked
                      ? <View style={[aur.legBarFill, { width: '38%', backgroundColor: 'rgba(255,255,255,0.14)' }]} />
                      : <LinearGradient colors={[a.color + '55', a.color]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[aur.legBarFill, { width: a.score + '%' }]} />}
                  </View>
                  {locked
                    ? <View style={[aur.legScorePill, { backgroundColor: 'rgba(255,184,0,0.10)', borderColor: 'rgba(255,184,0,0.28)' }]}>
                        <Ionicons name="lock-closed" size={10} color="#E8C56A" />
                      </View>
                    : <View style={[aur.legScorePill, { backgroundColor: a.color + '14', borderColor: a.color + '30' }]}>
                        <Text style={[aur.legScore, { color: a.color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{areaWord(a.score, language)}</Text>
                      </View>}
                </Animated.View>
              );
            })}
          </View>
        </View>
        {locked
          ? (
            <TouchableOpacity activeOpacity={0.85} onPress={onUnlock} style={aur.unlockCta}>
              <Ionicons name="lock-open-outline" size={13} color="#2A1707" />
              <Text style={aur.unlockCtaText}>
                {language === 'si' ? 'ආදරය, මුදල්, රැකියාව — අංශ 6 විවෘත කරන්න' : 'Unlock all six — love, money, work & more'}
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#2A1707" />
            </TouchableOpacity>
          )
          : (
            <View style={aur.note}>
              <Ionicons name={result.personalized ? 'shield-checkmark-outline' : 'information-circle-outline'} size={12} color="rgba(244,238,223,0.4)" />
              <Text style={aur.noteText}>
                {result.personalized
                  ? (language === 'si'
                      ? 'ඔබේ තාරා බලය, චන්ද්‍රාෂ්ඨම හා චන්ද්‍ර ගමන අනුව ගණනය කර ඇත.'
                      : "Derived from your Tara Balam, Chandrashtama & Moon transit.")
                  : (language === 'si'
                      ? 'අද දවසේ පංචාංගය අනුව. පෞද්ගලික ලකුණු සඳහා උපන් විස්තර එක් කරන්න.'
                      : "Based on today's panchanga. Add birth details for scores tuned to you.")}
              </Text>
            </View>
          )}
        <View style={aur.innerFrame} pointerEvents="none" />
      </View>
    </Animated.View>
  );
});

// ═══════════════════════════════════════════════════════════════════════
//  DAY SKY CLOCK — the signature. A live sun-arc from sunrise to sunset
//  with an animated "now" marker, auspicious windows (gold) and Rahu
//  Kalaya (red) plotted as real time bands. Merges the old Rahu card +
//  Auspicious card + sunrise/sunset into one immersive graphic.
// ═══════════════════════════════════════════════════════════════════════
function skyArcPoint(f) {
  // viewBox 0..360 x 0..170; ellipse cx180 cy150 rx165 ry118, angle PI..0
  var a = Math.PI * (1 - Math.max(0, Math.min(1, f)));
  return { x: 180 + 165 * Math.cos(a), y: 150 - 118 * Math.sin(a) };
}
function skyBandPath(f0, f1) {
  var N = 20, d = '';
  for (var i = 0; i <= N; i++) {
    var p = skyArcPoint(f0 + (f1 - f0) * i / N);
    d += (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ' ';
  }
  return d.trim();
}
// Star dust for the sky scene (viewBox coords: x, y, radius, opacity)
var SKY_STARS = [
  [22, 18, 1.3, 0.55], [48, 44, 0.8, 0.35], [76, 12, 1.0, 0.45], [104, 38, 0.7, 0.30],
  [132, 16, 1.2, 0.50], [163, 40, 0.8, 0.32], [196, 14, 1.0, 0.42], [226, 42, 0.7, 0.30],
  [252, 20, 1.3, 0.55], [282, 46, 0.8, 0.34], [310, 16, 1.0, 0.45], [338, 36, 0.7, 0.30],
  [60, 66, 0.9, 0.26], [150, 62, 0.7, 0.22], [240, 64, 0.9, 0.26], [320, 60, 0.7, 0.22],
  [90, 90, 0.6, 0.18], [200, 84, 0.6, 0.18], [300, 92, 0.6, 0.18],
];
var SUN_RAY_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
// The 24 interior hour marks (midnight endpoints are drawn as horizon dots).
var CLOCK_HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
// Moon route — a lower, silver arc so the moon never collides with the sun.
function moonArcPoint(f) {
  var a = Math.PI * (1 - Math.max(0, Math.min(1, f)));
  return { x: 180 + 142 * Math.cos(a), y: 150 - 84 * Math.sin(a) };
}
function moonBandPath(f0, f1) {
  var N = 20, d = '';
  for (var i = 0; i <= N; i++) {
    var p = moonArcPoint(f0 + (f1 - f0) * i / N);
    d += (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ' ';
  }
  return d.trim();
}
// Phase-correct moon disc — the shadow slides off the lit limb with the tithi,
// so a waning crescent LOOKS like a waning crescent (and a daytime moon
// explains itself). Two-circle classic: lit disc + ink shadow clipped to it.
function PhaseMoon({ size, tithiNum }) {
  var ph = ((((tithiNum || 15) - 1) % 30) + 30) % 30 / 30;     // 0 new → 0.5 full → 1 new
  var illum = (1 - Math.cos(ph * 2 * Math.PI)) / 2;            // lit fraction 0..1
  var waxing = ph <= 0.5;
  var off = 18.8 * illum;                                      // shadow slide (2r + rim)
  var dx = waxing ? -off : off;                                // lit limb: right waxing, left waning
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30">
      <Defs>
        <RadialGradient id="pmCore" cx="40%" cy="36%" r="68%">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.55" stopColor="#E8EAF2" />
          <Stop offset="1" stopColor="#A9B1C6" />
        </RadialGradient>
        <ClipPath id="pmClip"><Circle cx="15" cy="15" r="9" /></ClipPath>
      </Defs>
      <Circle cx="15" cy="15" r="9" fill="url(#pmCore)" />
      <Circle cx="12" cy="12.5" r="1.9" fill="rgba(148,155,178,0.5)" />
      <Circle cx="17.5" cy="17" r="1.3" fill="rgba(148,155,178,0.4)" />
      <Circle cx="16" cy="11" r="0.9" fill="rgba(148,155,178,0.34)" />
      <G clipPath="url(#pmClip)">
        <Circle cx={15 + dx} cy="15" r="9.4" fill="rgba(9,6,20,0.93)" />
      </G>
      <Circle cx="15" cy="15" r="9" fill="none" stroke="rgba(201,210,232,0.35)" strokeWidth="0.6" />
    </Svg>
  );
}
// Calendar names for the sky clock's day navigation (SLT calendar).
var SKY_WD_SHORT_SI = ['ඉරි', 'සඳු', 'අඟ', 'බදා', 'බ්‍රහ', 'සිකු', 'සෙන'];
var SKY_WD_SHORT_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var SKY_WD_FULL_SI = ['ඉරිදා', 'සඳුදා', 'අඟහරුවාදා', 'බදාදා', 'බ්‍රහස්පතින්දා', 'සිකුරාදා', 'සෙනසුරාදා'];
var SKY_WD_FULL_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var SKY_MON_SI = ['ජන', 'පෙබ', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජූනි', 'ජූලි', 'අගෝ', 'සැප්', 'ඔක්', 'නොවැ', 'දෙසැ'];
var SKY_MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var DaySkyClock = React.memo(function DaySkyClock({ data, language, t, skipHeavy }) {
  var si = language === 'si';
  var router = useRouter();

  // minute heartbeat — keeps the sun, badge and countdown honest while open
  var [, setTick] = useState(0);
  useEffect(function () {
    var id = setInterval(function () { setTick(function (x) { return x + 1; }); }, 60000);
    return function () { clearInterval(id); };
  }, []);

  // ── day navigation: 0 = today (live dial); 1..6 = static day maps from the
  // free /month-ahead endpoint (lazy-fetched once, 7 days).
  var [dayIdx, setDayIdx] = useState(0);
  var [monthDays, setMonthDays] = useState(null);
  var [monthLoading, setMonthLoading] = useState(false);
  var loc = data && data.location;
  var selectDay = useCallback(function (i) {
    setDayIdx(i);
    if (i > 0 && !monthDays && !monthLoading) {
      setMonthLoading(true);
      api.getMonthAheadNakath(7, loc && loc.lat, loc && loc.lng)
        .then(function (res) {
          if (res && res.success && res.data && Array.isArray(res.data.days)) setMonthDays(res.data.days);
          else setDayIdx(0);
        })
        .catch(function () { setDayIdx(0); })
        .finally(function () { setMonthLoading(false); });
    }
  }, [monthDays, monthLoading, loc]);
  var isToday = dayIdx === 0;
  var future = !isToday && monthDays ? monthDays[dayIdx] : null;
  var selLoading = !isToday && !future;

  var nowMs = Date.now();
  var DAY_MS = 86400000;

  // ── 24-hour clock. The arc is one whole day: f = 0 at midnight (left tip),
  // 0.5 at noon (top), 1 at the next midnight (right tip). Every marker sits at
  // its true clock position on the app clock (Sri Lanka, +5:30). The model below
  // is normalized so today (live data) and future days (month-ahead) render
  // through the exact same geometry.
  var sunrise, sunset, dayStart, rkStart, rkEnd, apStart, apEnd, apNameSi, apNameEn, tithiNum, moonrise, moonset;
  apNameSi = null; apNameEn = null; tithiNum = null; moonrise = NaN; moonset = NaN;
  if (isToday) {
    sunrise = parseMs(data && data.sunrise);
    sunset = parseMs(data && data.sunset);
    if (isNaN(sunrise) || isNaN(sunset) || sunset <= sunrise) {
      var base = new Date(nowMs + SLT_OFFSET_MS); base.setUTCHours(0, 0, 0, 0);
      sunrise = base.getTime() + 6 * 3600000 - SLT_OFFSET_MS;
      sunset = base.getTime() + 18 * 3600000 - SLT_OFFSET_MS;
    }
    dayStart = Math.floor((nowMs + SLT_OFFSET_MS) / DAY_MS) * DAY_MS - SLT_OFFSET_MS; // SLT midnight, in UTC ms
    var rk = data && data.rahuKalaya;
    rkStart = rk ? parseMs(rk.start) : NaN;
    rkEnd = rk ? parseMs(rk.end) : NaN;
    // prefer the midday Abhijit window (the day's headline), else the first period
    var aps = (data && data.auspiciousPeriods) || [];
    var ap = null;
    for (var ai = 0; ai < aps.length; ai++) { if (aps[ai] && aps[ai].name === 'Abhijit Muhurtha') { ap = aps[ai]; break; } }
    if (!ap) ap = aps[0] || null;
    apStart = ap ? parseMs(ap.start) : NaN;
    apEnd = ap ? parseMs(ap.end) : NaN;
    apNameSi = ap ? ap.sinhala : null;
    apNameEn = ap ? ap.name : null;
    // Moon window: the engine's REAL moonrise/moonset (near full moon it rises
    // around sunset, near new moon around sunrise — that is the real sky);
    // tithi approximation only if the server didn't send them.
    var pj = data && data.panchanga;
    var realRise = pj ? parseMs(pj.moonrise) : NaN;
    var realSet = pj ? parseMs(pj.moonset) : NaN;
    tithiNum = (pj && pj.tithi && pj.tithi.number) || null;
    if (!isNaN(realRise) && !isNaN(realSet)) {
      moonrise = realRise; moonset = realSet;
      if (moonset <= moonrise) moonset += DAY_MS;                   // moon sets after midnight
    } else if (tithiNum) {
      moonrise = sunrise + ((tithiNum - 1) % 30) * 48 * 60000;
      moonrise += Math.floor((nowMs - moonrise) / DAY_MS) * DAY_MS; // most recent rise at/ before now
      moonset = moonrise + 12.4 * 3600000;
    }
  } else if (future) {
    var cp = (future.civilDate || '').split('-');
    dayStart = cp.length === 3 ? Date.UTC(+cp[0], +cp[1] - 1, +cp[2]) - SLT_OFFSET_MS : NaN;
    sunrise = parseMs(future.sunrise);
    sunset = parseMs(future.sunset);
    rkStart = future.rahuKalaya ? parseMs(future.rahuKalaya.start) : NaN;
    rkEnd = future.rahuKalaya ? parseMs(future.rahuKalaya.end) : NaN;
    apStart = future.bestTime ? parseMs(future.bestTime.start) : NaN;
    apEnd = future.bestTime ? parseMs(future.bestTime.end) : NaN;
    apNameSi = future.bestTime ? future.bestTime.sinhala : null;
    apNameEn = future.bestTime ? future.bestTime.name : null;
    tithiNum = (future.tithi && future.tithi.number) || null;
    moonrise = parseMs(future.moonrise);
    moonset = parseMs(future.moonset);
    if (!isNaN(moonrise) && !isNaN(moonset) && moonset <= moonrise) moonset += DAY_MS;
  } else {
    sunrise = NaN; sunset = NaN; dayStart = NaN; rkStart = NaN; rkEnd = NaN; apStart = NaN; apEnd = NaN;
  }
  var fr = function (ms) { return (ms - dayStart) / DAY_MS; };
  var frC = function (ms) { return Math.max(0, Math.min(1, fr(ms))); };
  var span = sunset - sunrise;
  var fSunrise = !isNaN(dayStart) ? frC(sunrise) : 0;
  var fSunset = !isNaN(dayStart) ? frC(sunset) : 0;

  var fNow = isToday ? frC(nowMs) : 0;
  var nowPt = skyArcPoint(fNow);
  var isNight = isToday && (nowMs < sunrise || nowMs > sunset);
  // progress bar tracks daylight elapsed (sunrise → sunset)
  var dayPct = span > 0 ? Math.round(Math.max(0, Math.min(1, (nowMs - sunrise) / span)) * 100) : 0;

  var moonUp = isToday && !isNaN(moonrise) && nowMs >= moonrise && nowMs <= moonset;
  var moonPt = moonUp ? moonArcPoint(fNow) : null;                // moon rides the clock at 'now'
  var fMoonRise = !isNaN(moonrise) && !isNaN(dayStart) ? frC(moonrise) : NaN;
  var fMoonSet = !isNaN(moonset) && !isNaN(dayStart) ? frC(moonset) : NaN;

  var rahuActive = isToday && !isNaN(rkStart) && !isNaN(rkEnd) && nowMs >= rkStart && nowMs <= rkEnd;

  // ── next sky event — the pill always counts toward SOMETHING (sunset, Rahu,
  // best time, moonrise…), so there is always a reason to come back.
  var nextEvt = null;
  if (isToday) {
    var fmtCd = function (diff) {
      var mins = Math.floor(diff / 60000), hrs = Math.floor(mins / 60), rm = mins % 60;
      return hrs > 0 ? hrs + 'h ' + rm + 'm' : rm + 'm';
    };
    if (rahuActive && rkEnd > nowMs) {
      nextEvt = { label: si ? 'රාහු අවසන්' : 'RAHU ENDS', kind: 'danger', cd: fmtCd(rkEnd - nowMs) };
    } else {
      var evts = [
        [apStart, si ? 'සුබ වේලාවට' : 'BEST TIME IN', 'gold'],
        [apEnd, si ? 'සුබ අවසන්' : 'BEST ENDS', 'gold'],
        [rkStart, si ? 'රාහු කාලයට' : 'RAHU IN', 'danger'],
        [rkEnd, si ? 'රාහු අවසන්' : 'RAHU ENDS', 'danger'],
        [sunrise, si ? 'හිරු උදාවට' : 'SUNRISE IN', 'gold'],
        [sunset, si ? 'හිරු අස්තයට' : 'SUNSET IN', 'gold'],
        [moonrise, si ? 'සඳ උදාවට' : 'MOONRISE IN', 'silver'],
        [moonset, si ? 'සඳ අස්තයට' : 'MOONSET IN', 'silver'],
      ];
      var bestAt = Infinity, bi = -1;
      for (var ei = 0; ei < evts.length; ei++) {
        if (!isNaN(evts[ei][0]) && evts[ei][0] > nowMs && evts[ei][0] < bestAt) { bestAt = evts[ei][0]; bi = ei; }
      }
      if (bi >= 0) nextEvt = { label: evts[bi][1], kind: evts[bi][2], cd: fmtCd(bestAt - nowMs) };
    }
  }

  // day pills (SLT calendar) + the selected future day's dial label
  var dayPills = [];
  for (var di = 0; di < 7; di++) {
    var pd = new Date(nowMs + SLT_OFFSET_MS + di * DAY_MS);
    dayPills.push({ wd: (si ? SKY_WD_SHORT_SI : SKY_WD_SHORT_EN)[pd.getUTCDay()], num: pd.getUTCDate() });
  }
  var dialWd = '', dialDate = '', dialTithi = null;
  if (future) {
    var fcp = (future.civilDate || '').split('-');
    if (fcp.length === 3) {
      var fd = new Date(Date.UTC(+fcp[0], +fcp[1] - 1, +fcp[2]));
      dialWd = dayIdx === 1 ? (si ? 'හෙට' : 'Tomorrow') : (si ? SKY_WD_FULL_SI : SKY_WD_FULL_EN)[fd.getUTCDay()];
      dialDate = (si ? SKY_MON_SI : SKY_MON_EN)[fd.getUTCMonth()] + ' ' + fd.getUTCDate();
    }
    if (future.tithi) dialTithi = (si ? (future.tithi.sinhala || future.tithi.name) : future.tithi.name) || null;
  }

  // ── living-sky animations (all quiet when skipHeavy / reduced motion) ──
  var pulse = useSharedValue(0);
  var twinkle = useSharedValue(0);
  var shoot = useSharedValue(0);
  var raySpin = useSharedValue(0);
  useEffect(function () {
    if (skipHeavy) { pulse.value = 0.5; twinkle.value = 0.5; shoot.value = 0; raySpin.value = 0; return; }
    pulse.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true);
    twinkle.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }), -1, true);
    shoot.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.linear }), -1, false);
    raySpin.value = withRepeat(withTiming(360, { duration: 60000, easing: Easing.linear }), -1, false);
  }, [skipHeavy]);
  var haloStyle = useAnimatedStyle(function () {
    return { transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.9]) }], opacity: interpolate(pulse.value, [0, 1], [0.45, 0.04]) };
  });
  var moonHaloStyle = useAnimatedStyle(function () {
    return { transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.6]) }], opacity: interpolate(pulse.value, [0, 1], [0.35, 0.05]) };
  });
  var tw1 = useAnimatedStyle(function () { return { opacity: interpolate(twinkle.value, [0, 1], [0.15, 0.85]) }; });
  var tw2 = useAnimatedStyle(function () { return { opacity: interpolate(twinkle.value, [0, 1], [0.8, 0.2]) }; });
  var tw3 = useAnimatedStyle(function () { return { opacity: interpolate(twinkle.value, [0, 0.5, 1], [0.25, 0.9, 0.25]) }; });
  var shootStyle = useAnimatedStyle(function () {
    var p = shoot.value;
    return {
      opacity: interpolate(p, [0, 0.015, 0.075, 0.105, 1], [0, 0.95, 0.75, 0, 0]),
      transform: [
        { translateX: interpolate(p, [0, 0.105, 1], [-40, 310, 310]) },
        { translateY: interpolate(p, [0, 0.105, 1], [18, 74, 74]) },
        { rotate: '11deg' },
      ],
    };
  });
  var rayStyle = useAnimatedStyle(function () { return { transform: [{ rotate: raySpin.value + 'deg' }] }; });

  var showAusp = !isNaN(apStart) && !isNaN(apEnd) && !isNaN(dayStart);
  var showRahu = !isNaN(rkStart) && !isNaN(rkEnd) && !isNaN(dayStart);
  // passed/active states only mean something on the live (today) dial
  var rahuOver = isToday && showRahu && nowMs > rkEnd;
  var auspOver = isToday && showAusp && nowMs > apEnd;
  var auspActive = isToday && showAusp && nowMs >= apStart && nowMs <= apEnd;
  var auspD = showAusp ? skyBandPath(frC(apStart), frC(apEnd)) : null;
  var rahuD = showRahu ? skyBandPath(frC(rkStart), frC(rkEnd)) : null;
  var apName = si ? (apNameSi || 'සුබ වේලාව') : ((apNameEn || 'Auspicious')).toUpperCase();

  // "Now" badge follows the moon at night, the sun by day — and is clamped
  // to the card so it can never clip at the edges (the marker stays exact).
  var badgePt = (isNight && moonPt) ? moonPt : nowPt;
  var badgeLeftPct = Math.max(16, Math.min(84, badgePt.x / 360 * 100));
  var badgeTopPct = Math.max(6, badgePt.y / 170 * 100 - 26);

  return (
    <Animated.View entering={FadeInDown.delay(120).springify()}>
      <View style={sky.card}>
        {/* deep space fading into a warm horizon */}
        <LinearGradient colors={['#06040E', '#110A24', '#221233', '#38203A']} locations={[0, 0.40, 0.72, 1]} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
        <LinearGradient colors={['transparent', 'rgba(240,140,74,0.18)']} style={sky.horizonVeil} pointerEvents="none" />

        <View style={sky.topRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <View style={sky.icBox}><Ionicons name={isToday ? (isNight ? 'moon' : 'sunny') : 'calendar-outline'} size={16} color="#FFD983" /></View>
            <View style={{ flex: 1 }}>
              <Text style={sky.kicker}>{si ? 'අහස් ඔරලෝසුව' : 'SKY CLOCK'}</Text>
              <Text style={sky.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                {isToday ? (si ? 'අද හිරු සහ සඳ ගමන' : "Today's Sun & Moon") : (si ? 'හිරු සහ සඳ ගමන' : 'Sun & Moon')}
              </Text>
              <Text style={sky.sub} numberOfLines={1}>{(si ? 'උදාව ' : 'Sunrise ') + fmtHM(sunrise, t) + '  ·  ' + (si ? 'අස්තය ' : 'Sunset ') + fmtHM(sunset, t)}</Text>
            </View>
          </View>
          {nextEvt ? (
            <View style={[
              sky.cdPill,
              skyx.cdPillClamp,
              nextEvt.kind === 'gold' && skyx.cdGold,
              nextEvt.kind === 'silver' && skyx.cdSilver,
              rahuActive && sky.cdPillActive,
            ]}>
              <Text style={[
                sky.cdLabel,
                nextEvt.kind === 'gold' && skyx.cdLabelGold,
                nextEvt.kind === 'silver' && skyx.cdLabelSilver,
              ]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{nextEvt.label}</Text>
              <Text style={[
                sky.cdValue,
                nextEvt.kind === 'gold' && skyx.cdValueGold,
                nextEvt.kind === 'silver' && skyx.cdValueSilver,
              ]}>{nextEvt.cd}</Text>
            </View>
          ) : null}
        </View>

        <View style={sky.arcWrap}>
          <Svg width="100%" height="100%" viewBox="0 0 360 170" preserveAspectRatio="none">
            <Defs>
              <SvgLinearGradient id="skyArcGrad" gradientUnits="userSpaceOnUse" x1="15" y1="0" x2="345" y2="0">
                <Stop offset="0" stopColor="#F5B45C" stopOpacity="0.95" />
                <Stop offset="0.5" stopColor="#FFE9A8" stopOpacity="1" />
                <Stop offset="1" stopColor="#E76F51" stopOpacity="0.9" />
              </SvgLinearGradient>
              <RadialGradient id="skyHorizonGlow" cx="50%" cy="100%" r="62%">
                <Stop offset="0" stopColor="#F5B45C" stopOpacity="0.32" />
                <Stop offset="0.6" stopColor="#E76F51" stopOpacity="0.10" />
                <Stop offset="1" stopColor="#E76F51" stopOpacity="0" />
              </RadialGradient>
              <SvgLinearGradient id="moonRouteGrad" gradientUnits="userSpaceOnUse" x1="30" y1="0" x2="330" y2="0">
                <Stop offset="0" stopColor="#8E97B8" stopOpacity="0.65" />
                <Stop offset="0.5" stopColor="#DDE4F5" stopOpacity="0.9" />
                <Stop offset="1" stopColor="#8E97B8" stopOpacity="0.65" />
              </SvgLinearGradient>
            </Defs>
            {SKY_STARS.map(function (st, si) {
              return <Circle key={'sk' + si} cx={st[0]} cy={st[1]} r={st[2]} fill="#F4E4BC" opacity={st[3]} />;
            })}
            <Ellipse cx="180" cy="152" rx="210" ry="58" fill="url(#skyHorizonGlow)" />
            {/* full 24-hour track — faint dashed base (midnight → midnight) */}
            <Path d={skyBandPath(0, 1)} fill="none" stroke="rgba(255,236,190,0.13)" strokeWidth="1.4" strokeDasharray="3 5" />
            {/* night zones — a cool indigo wash before sunrise and after sunset,
                so day vs night reads instantly on the dial */}
            {fSunrise > 0.02 ? <Path d={skyBandPath(0, fSunrise)} fill="none" stroke="rgba(147,165,220,0.09)" strokeWidth="8" strokeLinecap="round" /> : null}
            {fSunset > fSunrise && fSunset < 0.98 ? <Path d={skyBandPath(fSunset, 1)} fill="none" stroke="rgba(147,165,220,0.09)" strokeWidth="8" strokeLinecap="round" /> : null}
            {/* daylight hours — a soft golden band from sunrise to sunset */}
            {fSunset > fSunrise ? (
              <Path d={skyBandPath(fSunrise, fSunset)} fill="none" stroke="rgba(245,197,88,0.16)" strokeWidth="8" strokeLinecap="round" />
            ) : null}
            {/* daylight elapsed so far — glowing gradient core (live dial only) */}
            {isToday && nowMs > sunrise ? (
              <Path d={skyBandPath(fSunrise, Math.min(fNow, fSunset))} fill="none" stroke="url(#skyArcGrad)" strokeWidth="2.6" strokeLinecap="round" />
            ) : null}
            {/* the moon's road — silver, mapped to its clock rise → set on the inner arc */}
            {fMoonSet > fMoonRise ? (
              <G>
                <Path d={moonBandPath(fMoonRise, fMoonSet)} fill="none" stroke="rgba(200,210,235,0.14)" strokeWidth="1.4" strokeDasharray="2 6" />
                {isToday && moonUp ? <Path d={moonBandPath(fMoonRise, fNow)} fill="none" stroke="url(#moonRouteGrad)" strokeWidth="1.8" strokeLinecap="round" /> : null}
              </G>
            ) : null}
            {/* hour ticks — one per hour, taller at 6am / noon / 6pm */}
            {CLOCK_HOURS.map(function (h) {
              var a = Math.PI * (1 - h / 24);
              var cosA = Math.cos(a), sinA = Math.sin(a);
              var major = (h % 6 === 0);
              var ir = major ? 152 : 158, iry = major ? 106 : 111;
              var or = major ? 168 : 165, ory = major ? 120 : 118;
              return (
                <Line key={'hr' + h}
                  x1={180 + ir * cosA} y1={150 - iry * sinA}
                  x2={180 + or * cosA} y2={150 - ory * sinA}
                  stroke={major ? 'rgba(255,236,190,0.5)' : 'rgba(255,236,190,0.22)'} strokeWidth={major ? 1.4 : 1} />
              );
            })}
            {/* auspicious window — golden light (dims after it passes, glows while live) */}
            {auspD ? (
              auspOver ? (
                <Path d={auspD} fill="none" stroke="rgba(255,233,168,0.14)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 5" />
              ) : (
                <G>
                  <Path d={auspD} fill="none" stroke={auspActive ? 'rgba(255,225,150,0.40)' : 'rgba(255,217,131,0.26)'} strokeWidth={auspActive ? 14 : 12} strokeLinecap="round" />
                  <Path d={auspD} fill="none" stroke="#FFE9A8" strokeWidth={auspActive ? 5 : 4} strokeLinecap="round" />
                </G>
              )
            ) : null}
            {/* Rahu Kalaya — danger band (fades once over, burns while active) */}
            {rahuD ? (
              rahuOver ? (
                <Path d={rahuD} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 5" />
              ) : (
                <G>
                  <Path d={rahuD} fill="none" stroke={rahuActive ? 'rgba(255,110,110,0.42)' : 'rgba(252,120,120,0.22)'} strokeWidth={rahuActive ? 15 : 12} strokeLinecap="round" />
                  <Path d={rahuD} fill="none" stroke={rahuActive ? '#FF9A9A' : '#F87171'} strokeWidth={rahuActive ? 5 : 4} strokeLinecap="round" />
                </G>
              )
            ) : null}
            {/* horizon */}
            <Line x1="4" y1="150" x2="356" y2="150" stroke="rgba(244,180,86,0.36)" strokeWidth="1.2" />
            <Line x1="4" y1="151.6" x2="356" y2="151.6" stroke="rgba(0,0,0,0.45)" strokeWidth="1.4" />
            {/* both arc tips are midnight on the 24-hour clock */}
            <Circle cx="15" cy="150" r="3" fill="rgba(200,210,235,0.7)" />
            <Circle cx="345" cy="150" r="3" fill="rgba(200,210,235,0.7)" />
          </Svg>

          {/* hour labels — RN overlay, so the stretched SVG can't distort or clip them */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Text style={[skyx.hourLbl, { left: '14.6%', top: '29.5%' }]}>{si ? 'උදේ 6' : '6 AM'}</Text>
            <Text style={[skyx.hourLbl, { left: '50%', top: '6.5%' }]}>{si ? 'දවල් 12' : '12 PM'}</Text>
            <Text style={[skyx.hourLbl, { left: '85.4%', top: '29.5%' }]}>{si ? 'හවස 6' : '6 PM'}</Text>
          </View>

          {/* twinkling stars — three live points over the static field */}
          {!skipHeavy ? (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Animated.View style={[skyx.twinkle, { left: '18%', top: '11%' }, tw1]} />
              <Animated.View style={[skyx.twinkle, { left: '52%', top: '7%', width: 3, height: 3, borderRadius: 1.5 }, tw2]} />
              <Animated.View style={[skyx.twinkle, { left: '81%', top: '15%' }, tw3]} />
              {/* a shooting star crosses the upper sky every ~9s */}
              <Animated.View style={[skyx.shootWrap, shootStyle]}>
                <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,244,214,0.9)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={skyx.shootTail} />
                <View style={skyx.shootHead} />
              </Animated.View>
            </View>
          ) : null}

          {/* the sun — exact position on its arc, rays turning slowly (live dial) */}
          {isToday && !isNight ? (
            <View style={[sky.nowWrap, { marginTop: -19, left: (nowPt.x / 360 * 100) + '%', top: (nowPt.y / 170 * 100) + '%' }]} pointerEvents="none">
              <View style={sky.sunBox}>
                <Animated.View style={[sky.sunHalo, rahuActive && sky.sunHaloRahu, haloStyle]} />
                <Animated.View style={rayStyle}>
                  <Svg width={38} height={38} viewBox="0 0 38 38">
                    <Defs>
                      <RadialGradient id="sunCoreGrad" cx="42%" cy="38%" r="66%">
                        <Stop offset="0" stopColor="#FFFDF2" />
                        <Stop offset="0.55" stopColor="#FFE9A8" />
                        <Stop offset="1" stopColor="#F0A24A" />
                      </RadialGradient>
                    </Defs>
                    {SUN_RAY_ANGLES.map(function (deg) {
                      var rad = deg * Math.PI / 180;
                      return (
                        <Line key={'ray' + deg}
                          x1={19 + Math.cos(rad) * 12.5} y1={19 + Math.sin(rad) * 12.5}
                          x2={19 + Math.cos(rad) * 16.5} y2={19 + Math.sin(rad) * 16.5}
                          stroke="#FFD983" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
                      );
                    })}
                    <Circle cx="19" cy="19" r="9.5" fill="url(#sunCoreGrad)" />
                  </Svg>
                </Animated.View>
              </View>
            </View>
          ) : null}

          {/* the moon — phase-correct disc riding its silver route at 'now' */}
          {isToday && moonPt ? (
            <View style={[skyx.moonWrap, { left: (moonPt.x / 360 * 100) + '%', top: (moonPt.y / 170 * 100) + '%' }]} pointerEvents="none">
              <Animated.View style={[skyx.moonHalo, moonHaloStyle]} />
              <PhaseMoon size={isNight ? 30 : 22} tithiNum={tithiNum} />
            </View>
          ) : null}

          {/* "now" badge — follows the active body, clamped inside the card */}
          {isToday ? (
            <View style={[skyx.badgeWrap, { left: badgeLeftPct + '%', top: badgeTopPct + '%' }]} pointerEvents="none">
              <View style={[sky.nowBadge, rahuActive && sky.nowBadgeDanger]}>
                <Text style={[sky.nowBadgeText, rahuActive && sky.nowBadgeTextDanger]} numberOfLines={1}>
                  {(si ? 'දැන් ' : 'Now ') + fmtHM(nowMs, t) + (rahuActive ? (si ? ' · රාහු' : ' · Rahu') : '')}
                </Text>
              </View>
            </View>
          ) : null}

          {/* future day — the dial becomes that day's map, dated at its center */}
          {!isToday ? (
            selLoading ? (
              <View style={skyx.dialCenter} pointerEvents="none"><ActivityIndicator color="#FFD97A" /></View>
            ) : (
              <Animated.View key={'dial' + dayIdx} entering={FadeIn.duration(220)} style={skyx.dialCenter} pointerEvents="none">
                <Text style={skyx.dialWd} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{dialWd}</Text>
                <Text style={skyx.dialDate} numberOfLines={1}>{dialDate}</Text>
                {dialTithi ? <Text style={skyx.dialTithi} numberOfLines={1}>{dialTithi}</Text> : null}
              </Animated.View>
            )
          ) : null}
        </View>

        <View style={sky.footer}>
          {showAusp ? (
            <View style={[sky.legChip, auspOver && sky.legChipMuted, auspActive && sky.legChipGold]}>
              {auspOver
                ? <Ionicons name="checkmark-circle" size={13} color="rgba(255,233,168,0.55)" />
                : <View style={[sky.legDot, { backgroundColor: '#FFE9A8' }]} />}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={sky.legChipLabel} numberOfLines={1}>
                  {apName + (auspOver ? (si ? ' · ඉවරයි' : ' · PASSED') : auspActive ? (si ? ' · දැන්' : ' · NOW') : '')}
                </Text>
                <Text style={sky.legChipTime} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>{fmtHM(apStart, t) + ' – ' + fmtHM(apEnd, t)}</Text>
              </View>
            </View>
          ) : null}
          {showRahu ? (
            <View style={[sky.legChip, rahuOver && sky.legChipMuted, rahuActive && sky.legChipDanger]}>
              {rahuOver
                ? <Ionicons name="checkmark-circle" size={13} color="#86EFAC" />
                : <View style={[sky.legDot, { backgroundColor: rahuActive ? '#FF6B6B' : '#F87171' }]} />}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[sky.legChipLabel, rahuActive && { color: 'rgba(255,180,180,0.85)' }]} numberOfLines={1}>
                  {si
                    ? 'රාහු කාලය' + (rahuOver ? ' · ඉවරයි' : rahuActive ? ' · දැන් සක්‍රියයි' : '')
                    : 'RAHU KALAYA' + (rahuOver ? ' · PASSED' : rahuActive ? ' · ACTIVE NOW' : '')}
                </Text>
                <Text style={sky.legChipTime} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>{fmtHM(rkStart, t) + ' – ' + fmtHM(rkEnd, t)}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* the moon's window — rise → set as one honest span, so a pre-dawn
            moonrise reads as "the moon's hours", never as an error */}
        {!isNaN(moonrise) && !isNaN(moonset) && !selLoading ? (
          <View style={skyx.moonLeg}>
            <Ionicons name="moon-outline" size={12} color="#C9D2E8" />
            <Text style={skyx.moonLegLabel} numberOfLines={1}>{si ? 'සඳ අහසේ සිටින කාලය' : 'MOON IN SKY'}</Text>
            <Text style={skyx.moonLegTime} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {fmtHM(moonrise, t) + ' – ' + fmtHM(moonset, t) + (moonUp ? (si ? ' · දැන්' : ' · UP') : '')}
            </Text>
          </View>
        ) : null}

        {/* day navigation — this week at a tap, the month one tap further */}
        <View style={skyx.dayStripWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={skyx.dayStrip}>
            {dayPills.map(function (p, i) {
              var on = i === dayIdx;
              return (
                <TouchableOpacity key={'dp' + i} activeOpacity={0.8} onPress={function () { selectDay(i); }} style={[skyx.dayPill, on && skyx.dayPillOn]}>
                  <Text style={[skyx.dayPillWd, on && skyx.dayPillWdOn]} numberOfLines={1}>{i === 0 ? (si ? 'අද' : 'Today') : p.wd}</Text>
                  <Text style={[skyx.dayPillNum, on && skyx.dayPillNumOn]}>{p.num}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity activeOpacity={0.8} onPress={function () { router.push('/nakath'); }} style={[skyx.dayPill, skyx.monthPill]}>
              <Ionicons name="calendar" size={15} color="#FFD97A" />
              <Text style={[skyx.dayPillWd, { color: 'rgba(255,217,131,0.9)' }]} numberOfLines={1}>{si ? 'මාසය' : 'Month'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {isToday ? (
          <View style={sky.progressRow}>
            <View style={sky.progressTrack}>
              <LinearGradient colors={['#F5B45C', '#FFE9A8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[sky.progressFill, { width: Math.max(2, dayPct) + '%' }]} />
            </View>
            <Text style={sky.progressText} numberOfLines={1}>
              {isNight
                ? (moonUp
                    ? (si ? 'රාත්‍රී අහස · සඳ අහසේ' : 'Night sky · moon is up')
                    : (si ? 'රාත්‍රී අහස' : 'Night sky'))
                : dayPct + (si ? '% ක් ගෙවී ඇත' : '% of daylight')}
            </Text>
          </View>
        ) : (
          <View style={{ height: 15 }} />
        )}

        <View style={sky.innerFrame} pointerEvents="none" />
      </View>
    </Animated.View>
  );
});

// styles for the living-sky layer (moon route, badge, day pills, effects)
var skyx = StyleSheet.create({
  moonWrap: { position: 'absolute', width: 30, height: 30, marginLeft: -15, marginTop: -15, alignItems: 'center', justifyContent: 'center' },
  moonHalo: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: '#C9D2E8' },
  badgeWrap: { position: 'absolute', width: 140, marginLeft: -70, alignItems: 'center' },
  twinkle: { position: 'absolute', width: 2.4, height: 2.4, borderRadius: 1.2, backgroundColor: '#FFF6DC' },
  shootWrap: { position: 'absolute', left: 0, top: 0, flexDirection: 'row', alignItems: 'center' },
  shootTail: { width: 46, height: 1.6, borderRadius: 1 },
  shootHead: { width: 2.6, height: 2.6, borderRadius: 1.3, backgroundColor: '#FFFDF2', marginLeft: -1 },
  // hour labels — RN overlay over the dial (never stretched or clipped)
  hourLbl: { position: 'absolute', width: 64, marginLeft: -32, textAlign: 'center', fontSize: 8, fontWeight: '700', color: 'rgba(255,236,190,0.6)', letterSpacing: 0.3 },
  // next-event pill variants (danger styling lives in sky.cdPill*)
  cdPillClamp: { maxWidth: 138, flexShrink: 1 },
  cdGold: { backgroundColor: 'rgba(255,217,131,0.07)', borderColor: 'rgba(255,217,131,0.25)' },
  cdSilver: { backgroundColor: 'rgba(201,210,232,0.07)', borderColor: 'rgba(201,210,232,0.25)' },
  cdLabelGold: { color: 'rgba(255,217,131,0.75)' },
  cdValueGold: { color: '#FFE9A8' },
  cdLabelSilver: { color: 'rgba(201,210,232,0.75)' },
  cdValueSilver: { color: '#DDE4F5' },
  // future-day dial center label
  dialCenter: { position: 'absolute', left: 0, right: 0, top: '32%', alignItems: 'center', gap: 2 },
  dialWd: { fontSize: 17, fontWeight: '900', color: '#F8F1DD', letterSpacing: 0.4, ...textShadow('rgba(232,197,106,0.25)', { width: 0, height: 1 }, 8) },
  dialDate: { fontSize: 11, fontWeight: '800', color: 'rgba(255,217,131,0.8)', fontVariant: ['tabular-nums'] },
  dialTithi: { fontSize: 10, fontWeight: '700', color: 'rgba(201,210,232,0.75)', marginTop: 2 },
  // the moon's rise → set window (footer)
  moonLeg: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 8,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 11,
    backgroundColor: 'rgba(201,210,232,0.05)', borderWidth: 1, borderColor: 'rgba(201,210,232,0.16)',
  },
  moonLegLabel: { flexShrink: 1, fontSize: 8.5, fontWeight: '800', letterSpacing: 0.7, color: 'rgba(201,210,232,0.7)' },
  moonLegTime: { flex: 1, textAlign: 'right', fontSize: 11.5, fontWeight: '700', color: '#DDE4F5', fontVariant: ['tabular-nums'] },
  // day navigation strip
  dayStripWrap: { marginTop: 10 },
  dayStrip: { flexDirection: 'row', gap: 6, paddingHorizontal: 16 },
  dayPill: {
    minWidth: 44, minHeight: 46, alignItems: 'center', justifyContent: 'center', gap: 1,
    paddingVertical: 6, paddingHorizontal: 6, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.035)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  dayPillOn: { backgroundColor: 'rgba(255,217,131,0.10)', borderColor: 'rgba(255,217,131,0.5)' },
  dayPillWd: { fontSize: 8.5, fontWeight: '800', letterSpacing: 0.5, color: 'rgba(244,238,223,0.5)' },
  dayPillWdOn: { color: 'rgba(255,217,131,0.9)' },
  dayPillNum: { fontSize: 15, fontWeight: '900', color: '#F4EEDF', fontVariant: ['tabular-nums'] },
  dayPillNumOn: { color: '#FFE9A8' },
  monthPill: { backgroundColor: 'rgba(255,184,0,0.07)', borderColor: 'rgba(255,184,0,0.25)' },
});

// ═══════════════════════════════════════════════════════════════════════
//  VIRAL LAYER — v3 Today redesign (research: Co-Star one-liners, Do/Don't
//  lists, share cards 2-4x retention, streaks, compatibility loops)
// ═══════════════════════════════════════════════════════════════════════

// Merge real panchanga guidance into one Do / Don't pack for the day
function buildDoDontLists(data, language, rahuActive) {
  var kinds = ['nakshatra', 'tithi', 'yoga'];
  var dos = [], donts = [];
  kinds.forEach(function (kind) {
    var entry = data && data.panchanga && data.panchanga[kind];
    if (!entry) return;
    var guide = getPanchangaGuidance(kind, entry, language);
    if (!guide) return;
    (guide.dos || []).forEach(function (item) { if (dos.indexOf(item) === -1) dos.push(item); });
    (guide.donts || []).forEach(function (item) { if (donts.indexOf(item) === -1) donts.push(item); });
  });
  if (rahuActive) {
    donts.unshift(language === 'si' ? 'රාහු කාලය තුළ අලුත් වැඩ අරඹන්න එපා' : 'Do not start new ventures during Rahu Kalaya');
  }
  return { dos: dos.slice(0, 3), donts: donts.slice(0, 3) };
}

// Traditional favorable direction by weekday (vaara)
var VAARA_LUCKY_DIRECTION = {
  0: { en: 'East', si: 'නැගෙනහිර' },
  1: { en: 'North-West', si: 'වයඹ' },
  2: { en: 'South', si: 'දකුණ' },
  3: { en: 'North', si: 'උතුර' },
  4: { en: 'North-East', si: 'ඊසාන' },
  5: { en: 'South-East', si: 'ගිනිකොන' },
  6: { en: 'West', si: 'බටහිර' },
};

/* ── VIRAL HERO — energy score medallion + one-liner + streak + share ── */
// four-point star sparkle for the hero backdrop
function sparklePath(x, y, r) {
  return 'M' + x + ' ' + (y - r) +
    ' Q' + (x + r * 0.22) + ' ' + (y - r * 0.22) + ' ' + (x + r) + ' ' + y +
    ' Q' + (x + r * 0.22) + ' ' + (y + r * 0.22) + ' ' + x + ' ' + (y + r) +
    ' Q' + (x - r * 0.22) + ' ' + (y + r * 0.22) + ' ' + (x - r) + ' ' + y +
    ' Q' + (x - r * 0.22) + ' ' + (y - r * 0.22) + ' ' + x + ' ' + (y - r) + ' Z';
}
// ═══════════════════════════════════════════════════════════════════════
//  HERO LIVING SKY — the onboarding night follows the user home.
//  Lean port of onboarding.js's ambient systems (nebula dust, 4-point
//  sparkles, rising embers, shooting star, constellation that draws itself)
//  tuned for a card on a busy screen: ~12 animated views, transform/opacity
//  only, and the whole living layer is gated behind !skipHeavy.
// ═══════════════════════════════════════════════════════════════════════

var AHeroPath = Animated.createAnimatedComponent(Path);
var AHeroCircle = Animated.createAnimatedComponent(Circle);

// ink stroke that draws itself in (codex style, from onboarding)
function HeroDrawStroke({ d, len, delay, duration, stroke, strokeWidth, skipHeavy }) {
  var t = useSharedValue(skipHeavy ? 1 : 0);
  useEffect(function () {
    if (skipHeavy) { t.value = 1; return; }
    t.value = 0;
    t.value = withDelay(delay || 0, withTiming(1, { duration: duration || 900, easing: Easing.bezier(0.45, 0.05, 0.35, 0.95) }));
  }, [skipHeavy]);
  var props = useAnimatedProps(function () { return { strokeDashoffset: len * (1 - t.value) }; });
  return <AHeroPath d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth || 0.8} strokeLinecap="round" strokeDasharray={[len, len]} animatedProps={props} />;
}

// constellation star — bloom halo + core pops in, then twinkles forever
function HeroConstStar({ cx, cy, r, delay, period, skipHeavy }) {
  var t = useSharedValue(skipHeavy ? 1 : 0);
  useEffect(function () {
    if (skipHeavy) { t.value = 1; return; }
    t.value = 0;
    t.value = withDelay(delay, withSequence(
      withTiming(1.4, { duration: 320, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
      withRepeat(withTiming(0.55, { duration: period, easing: Easing.inOut(Easing.sin) }), -1, true)
    ));
  }, [skipHeavy]);
  var haloProps = useAnimatedProps(function () { return { opacity: Math.min(t.value, 1) * 0.9 }; });
  var coreProps = useAnimatedProps(function () { return { opacity: Math.min(t.value + 0.15, 1), r: r * Math.min(Math.max(t.value, 0.001), 1.3) }; });
  return (
    <>
      <AHeroCircle cx={cx} cy={cy} r={r * 3.6} fill="url(#heroBloom)" animatedProps={haloProps} />
      <AHeroCircle cx={cx} cy={cy} fill="#FFE9B8" animatedProps={coreProps} />
    </>
  );
}

// drifting nebula dust / chamber glow — a soft color cloud that breathes
function HeroGlowCloud({ pos, size, color, drift, period, op, gid }) {
  var t = useSharedValue(0);
  useEffect(function () {
    t.value = withRepeat(withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);
  var style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(t.value, [0, 1], [op * 0.6, op * 1.3]),
      transform: [
        { translateX: interpolate(t.value, [0, 1], [0, drift]) },
        { scale: interpolate(t.value, [0, 1], [1, 1.14]) },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', width: size, height: size }, pos, style]} pointerEvents="none">
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={gid} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.55" />
            <Stop offset="55%" stopColor={color} stopOpacity="0.18" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={'url(#' + gid + ')'} />
      </Svg>
    </Animated.View>
  );
}

// breathing 4-point sparkle star (onboarding SparkleStar)
function HeroSparkle({ x, y, size, delay, period, color }) {
  var t = useSharedValue(0);
  useEffect(function () {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, []);
  var style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(t.value, [0, 1], [0.12, 0.9]),
      transform: [
        { scale: interpolate(t.value, [0, 1], [0.55, 1]) },
        { rotate: interpolate(t.value, [0, 1], [0, 30]) + 'deg' },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x + '%', top: y + '%', width: size, height: size }, style]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 24 24">
        <Path d="M12 0 L13.6 10.4 L24 12 L13.6 13.6 L12 24 L10.4 13.6 L0 12 L10.4 10.4 Z" fill={color} opacity="0.92" />
      </Svg>
    </Animated.View>
  );
}

// gold specks rising like incense sparks (onboarding EmberField, lean)
var HERO_EMBERS = [
  { x: 14, size: 2.6, rise: 120, period: 8200, delay: 0, sway: 14 },
  { x: 30, size: 2.0, rise: 96, period: 10400, delay: 2600, sway: -12 },
  { x: 52, size: 2.8, rise: 140, period: 9000, delay: 5200, sway: 16 },
  { x: 71, size: 2.2, rise: 104, period: 11600, delay: 1400, sway: -10 },
  { x: 86, size: 2.5, rise: 128, period: 9800, delay: 3800, sway: 12 },
];
function HeroEmber({ e }) {
  var t = useSharedValue(0);
  useEffect(function () {
    t.value = withDelay(e.delay, withRepeat(withTiming(1, { duration: e.period, easing: Easing.linear }), -1, false));
  }, []);
  var style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(t.value, [0, 0.12, 0.7, 1], [0, 0.8, 0.35, 0]),
      transform: [
        { translateY: interpolate(t.value, [0, 1], [0, -e.rise]) },
        { translateX: interpolate(t.value, [0, 0.5, 1], [0, e.sway, -e.sway * 0.4]) },
      ],
    };
  });
  return (
    <Animated.View
      style={[{
        position: 'absolute', left: e.x + '%', bottom: '5%',
        width: e.size, height: e.size, borderRadius: e.size / 2,
        backgroundColor: '#F2D48E',
        ...boxShadow('#E0B45C', { width: 0, height: 0 }, 0.9, 6),
      }, style]}
      pointerEvents="none"
    />
  );
}

// one slow golden streak across the upper sky (onboarding ShootingStar)
function HeroShooting() {
  var t = useSharedValue(0);
  useEffect(function () {
    t.value = withDelay(4000, withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 9000 }) // long dormancy between streaks
      ), -1, false));
  }, []);
  var style = useAnimatedStyle(function () {
    var p = t.value;
    return {
      opacity: p <= 0.001 ? 0 : interpolate(p, [0, 0.15, 0.75, 1], [0, 0.9, 0.4, 0]),
      transform: [
        { translateX: interpolate(p, [0, 1], [0, 430]) },
        { translateY: interpolate(p, [0, 1], [0, 180]) },
        { rotate: '24deg' },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', top: '10%', left: '-16%', width: 70, height: 1.6, borderRadius: 1 }, style]} pointerEvents="none">
      <LinearGradient colors={['transparent', 'rgba(248,231,184,0.85)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, borderRadius: 1 }} />
    </Animated.View>
  );
}

// the composed layer: static base sky + the living systems above it
function HeroLivingSky({ skipHeavy }) {
  return (
    <View style={s.oracleStarMap} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 360 640" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="vhGlow" cx="50%" cy="30%" r="58%">
            <Stop offset="0%" stopColor="#F4E4BC" stopOpacity="0.30" />
            <Stop offset="42%" stopColor="#7B49CF" stopOpacity="0.14" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="vhAurora" cx="18%" cy="70%" r="50%">
            <Stop offset="0%" stopColor="#7B49CF" stopOpacity="0.16" />
            <Stop offset="100%" stopColor="#7B49CF" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="heroBloom" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#F5DFA8" stopOpacity="0.72" />
            <Stop offset="42%" stopColor="#E0C070" stopOpacity="0.22" />
            <Stop offset="100%" stopColor="#E0C070" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx="180" cy="196" rx="200" ry="178" fill="url(#vhGlow)" />
        <Ellipse cx="70" cy="460" rx="180" ry="150" fill="url(#vhAurora)" />
        {/* the codex arc writes itself across the sky */}
        <HeroDrawStroke d="M20 130 C90 78 150 190 236 118 C288 76 322 108 352 62" len={400} delay={500} duration={1400} stroke="rgba(214,181,109,0.26)" strokeWidth={0.8} skipHeavy={skipHeavy} />
        {/* the constellation draws in — then its stars twinkle forever */}
        <HeroDrawStroke d="M52 330 L96 372" len={62} delay={950} duration={420} stroke="rgba(183,166,240,0.30)" strokeWidth={0.7} skipHeavy={skipHeavy} />
        <HeroDrawStroke d="M96 372 L150 348" len={61} delay={1200} duration={420} stroke="rgba(183,166,240,0.22)" strokeWidth={0.7} skipHeavy={skipHeavy} />
        <HeroDrawStroke d="M252 352 L300 320" len={59} delay={1450} duration={420} stroke="rgba(214,181,109,0.24)" strokeWidth={0.7} skipHeavy={skipHeavy} />
        {[[52, 330], [96, 372], [150, 348], [252, 352], [300, 320]].map(function (pt, i) {
          return <HeroConstStar key={'cs' + i} cx={pt[0]} cy={pt[1]} r={1.8} delay={850 + i * 220} period={2200 + i * 260} skipHeavy={skipHeavy} />;
        })}
        {/* static micro star field */}
        {[[36, 84, 1.4], [120, 46, 1.0], [212, 70, 1.6], [318, 96, 1.1], [64, 210, 0.9], [306, 210, 1.3], [180, 40, 0.9], [280, 420, 1.0], [40, 520, 1.2], [320, 520, 0.9]].map(function (st, i) {
          return <Circle key={'hs' + i} cx={st[0]} cy={st[1]} r={st[2]} fill="rgba(255,232,163,0.55)" />;
        })}
        {/* quiet sky (low-end / reduced motion): static sparkles instead of live ones */}
        {skipHeavy ? (
          <>
            <Path d={sparklePath(58, 140, 7)} fill="rgba(255,236,190,0.55)" />
            <Path d={sparklePath(302, 150, 5.5)} fill="rgba(183,166,240,0.5)" />
            <Path d={sparklePath(260, 470, 4.5)} fill="rgba(255,236,190,0.38)" />
          </>
        ) : null}
      </Svg>
      {!skipHeavy ? (
        <>
          {/* nebula dust + the candle-lit chamber glow, drifting slowly */}
          <HeroGlowCloud pos={{ left: '-18%', top: '-8%' }} size={230} color="#7B49CF" drift={16} period={11000} op={0.34} gid="hgc1" />
          <HeroGlowCloud pos={{ right: '-20%', top: '30%' }} size={260} color="#D6B56D" drift={-14} period={14000} op={0.20} gid="hgc2" />
          <HeroGlowCloud pos={{ left: '-10%', bottom: '-16%' }} size={280} color="#4A3480" drift={10} period={9000} op={0.42} gid="hgc3" />
          {/* breathing 4-point sparkles */}
          <HeroSparkle x={13} y={18} size={13} delay={600} period={2600} color="#F5DFA8" />
          <HeroSparkle x={82} y={20} size={10} delay={1500} period={3200} color="#B7A6F0" />
          <HeroSparkle x={70} y={72} size={9} delay={2400} period={2900} color="#F5DFA8" />
          {/* incense embers rising off the bottom edge */}
          {HERO_EMBERS.map(function (e, i) { return <HeroEmber key={'em' + i} e={e} />; })}
          <HeroShooting />
        </>
      ) : null}
    </View>
  );
}

var ViralHero = React.memo(function ViralHero(props) {
  var language = props.language;
  var greeting = props.greeting;
  var displayName = props.displayName;
  var oracle = props.oracle;
  var overall = props.overall;
  var streak = props.streak;
  var chartBadge = props.chartBadge;
  var nakshatraVal = props.nakshatraVal;
  var bestWindow = props.bestWindow;
  var onShare = props.onShare;
  var sharing = props.sharing;
  var hasBirthData = props.hasBirthData;
  var onAddBirth = props.onAddBirth;
  var skipHeavy = props.skipHeavy;

  var todayLabel = new Date().toLocaleDateString(language === 'si' ? 'si-LK' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  var M = 86, ringR = 62;
  var ringC = 2 * Math.PI * ringR;
  var pct = Math.max(0, Math.min(100, overall));
  var scoreColor = pct >= 70 ? '#86EFAC' : pct >= 50 ? '#F5D57A' : '#FCA5A5';
  var statusWord = energyPhrase(pct, language);
  // slow ceremonial rotation of the decorative tick ring
  var ringSpin = useSharedValue(0);
  useEffect(function () {
    if (skipHeavy) { ringSpin.value = 0; return; }
    ringSpin.value = withRepeat(withTiming(360, { duration: 90000, easing: Easing.linear }), -1);
  }, [skipHeavy]);
  var ringSpinStyle = useAnimatedStyle(function () {
    return { transform: [{ rotate: ringSpin.value + 'deg' }] };
  });

  // ring fill sweep: 0 → score on load, with the tip star riding the arc
  var fillProg = useSharedValue(0);
  useEffect(function () {
    if (skipHeavy) { fillProg.value = pct; return; }
    fillProg.value = 0;
    fillProg.value = withDelay(320, withTiming(pct, { duration: 1500, easing: Easing.out(Easing.cubic) }));
  }, [pct, skipHeavy]);
  var ringFillProps = useAnimatedProps(function () {
    return { strokeDashoffset: ringC * (1 - fillProg.value / 100) };
  });
  var tipGlowProps = useAnimatedProps(function () {
    var a = (-90 + 3.6 * fillProg.value) * Math.PI / 180;
    return { cx: 86 + 62 * Math.cos(a), cy: 86 + 62 * Math.sin(a) };
  });
  var tipDotProps = useAnimatedProps(function () {
    var a = (-90 + 3.6 * fillProg.value) * Math.PI / 180;
    return { cx: 86 + 62 * Math.cos(a), cy: 86 + 62 * Math.sin(a) };
  });

  var insights = [
    { icon: 'person-circle-outline', color: '#FFE8A3', label: language === 'si' ? 'ලග්නය' : 'RISING', value: chartBadge },
    { icon: 'star-outline', color: '#B7A6F0', label: language === 'si' ? 'නැකත' : 'NAKSHATRA', value: nakshatraVal },
    { icon: 'time-outline', color: '#7DD3FC', label: language === 'si' ? 'සුබ වේලාව' : 'GOLDEN HOUR', value: bestWindow || '—' },
  ];

  return (
    <Animated.View entering={FadeInDown.delay(40).springify()} style={s.oracleHeroShell}>
      {/* the onboarding night — same indigo family the story funnel lives in */}
      <LinearGradient
        colors={['#0B0A20', '#14102E', '#1A1440', '#100C2A', '#0B0A20']}
        locations={[0, 0.22, 0.52, 0.78, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      <LinearGradient
        colors={['rgba(123,73,207,0.20)', 'transparent', 'rgba(214,181,109,0.12)', 'rgba(244,228,188,0.05)']}
        locations={[0, 0.38, 0.72, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
      />
      {/* living celestial backdrop — nebula dust, embers, sparkles, and a
          constellation that draws itself (see HeroLivingSky above) */}
      <HeroLivingSky skipHeavy={skipHeavy} />

      <View style={s.oracleTopRow}>
        <View style={s.oracleGreetingBlock}>
          <View style={s.oracleGreetingLine}>
            <View style={s.oracleGreetingDot} />
            <Text style={s.oracleGreeting} numberOfLines={1}>{greeting}</Text>
          </View>
          <Text style={s.oracleName} numberOfLines={1}>{displayName}</Text>
        </View>
        <View style={s.oracleDatePill}>
          <Ionicons name="calendar-clear-outline" size={12} color="#F5D57A" />
          <Text style={s.oracleDateText}>{todayLabel}</Text>
        </View>
      </View>

      {/* ── energy medallion: rotating zodiac ticks + glowing ring + tip star ── */}
      <View style={vr.medallionWrap}>
        <Animated.View style={[vr.medallionDecor, ringSpinStyle]}>
          <Svg width={172} height={172} viewBox="0 0 172 172">
            <Circle cx={M} cy={M} r={82} stroke="rgba(232,197,106,0.16)" strokeWidth="1" fill="none" strokeDasharray="2 6" />
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (i) {
              var a = (i * 30 - 90) * Math.PI / 180;
              return (
                <Line key={'zt' + i}
                  x1={M + 76 * Math.cos(a)} y1={M + 76 * Math.sin(a)}
                  x2={M + 82 * Math.cos(a)} y2={M + 82 * Math.sin(a)}
                  stroke={i % 3 === 0 ? 'rgba(245,213,122,0.55)' : 'rgba(232,197,106,0.28)'}
                  strokeWidth={i % 3 === 0 ? 1.8 : 1} strokeLinecap="round" />
              );
            })}
            {[45, 135, 225, 315].map(function (deg) {
              var a = deg * Math.PI / 180;
              return <Circle key={'zd' + deg} cx={M + 79 * Math.cos(a)} cy={M + 79 * Math.sin(a)} r="1.6" fill="rgba(245,213,122,0.5)" />;
            })}
          </Svg>
        </Animated.View>
        <Svg width={172} height={172} viewBox="0 0 172 172">
          <Defs>
            <SvgLinearGradient id="vhRing" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#F5D57A" />
              <Stop offset="1" stopColor="#9F6BFF" />
            </SvgLinearGradient>
            <RadialGradient id="vhCore" cx="42%" cy="34%" r="68%">
              <Stop offset="0" stopColor="#2B1D45" />
              <Stop offset="0.72" stopColor="#180F2A" />
              <Stop offset="1" stopColor="#0D0718" />
            </RadialGradient>
          </Defs>
          <Circle cx={M} cy={M} r={ringR} stroke="rgba(245,213,122,0.10)" strokeWidth="15" fill="none" />
          <Circle cx={M} cy={M} r={ringR} stroke="rgba(255,255,255,0.08)" strokeWidth="7" fill="none" />
          <ACircle
            cx={M} cy={M} r={ringR}
            stroke="url(#vhRing)" strokeWidth="7" fill="none" strokeLinecap="round"
            strokeDasharray={ringC}
            animatedProps={ringFillProps}
            rotation="-90" origin="86, 86"
          />
          <ACircle r="8" fill="rgba(255,248,231,0.30)" animatedProps={tipGlowProps} />
          <ACircle r="3.6" fill="#FFF8E7" animatedProps={tipDotProps} />
          <Circle cx={M} cy={M} r={54} fill="url(#vhCore)" stroke="rgba(232,197,106,0.30)" strokeWidth="1" />
          <Circle cx={M} cy={M} r={46} stroke="rgba(232,197,106,0.12)" strokeWidth="0.8" fill="none" />
        </Svg>
        <View style={vr.medallionCenter} pointerEvents="none">
          <Text style={[vr.medallionWord, { color: scoreColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{energyWord(pct, language)}</Text>
          <Text style={vr.medallionLabel}>{language === 'si' ? 'අද බලය' : "TODAY'S ENERGY"}</Text>
        </View>
      </View>

      {/* verdict chip — makes the number mean something at a glance */}
      <View style={vr.statusRow}>
        <View style={[vr.statusChip, { borderColor: scoreColor + '45', backgroundColor: scoreColor + '12' }]}>
          <View style={[vr.statusDot, { backgroundColor: scoreColor }]} />
          <Text style={[vr.statusText, { color: scoreColor }]}>{statusWord}</Text>
        </View>
      </View>

      <View style={s.oracleKickerRow}>
        <View style={s.oracleKickerLine} />
        <Text style={s.oracleKicker}>{language === 'si' ? 'අද දවසේ පණිවිඩය' : 'TODAY IN ONE LINE'}</Text>
        <View style={s.oracleKickerLine} />
      </View>
      <Text style={[s.oracleTitle, language === 'si' && s.oracleTitleSinhala]}>{oracle ? oracle.title : ''}</Text>
      <Text style={[vr.heroBody, language === 'si' && s.sinhalaTextFlow]}>{oracle ? oracle.body : ''}</Text>

      {/* insight chips — lagna · nakshatra · golden hour */}
      <View style={vr.insightRow}>
        {insights.map(function (chip, i) {
          return (
            <Animated.View key={chip.label} entering={FadeInUp.delay(200 + i * 60).springify()} style={[vr.insightChip, { borderColor: chip.color + '30' }]}>
              <LinearGradient colors={[chip.color + '0E', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
              <View style={[vr.insightIcon, { borderColor: chip.color + '40', backgroundColor: chip.color + '14' }]}>
                <Ionicons name={chip.icon} size={13} color={chip.color} />
              </View>
              <Text style={vr.insightLabel}>{chip.label}</Text>
              <Text style={[vr.insightValue, { color: chip.color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.62}>{chip.value}</Text>
            </Animated.View>
          );
        })}
      </View>

      {/* streak + share — the retention & viral loop */}
      <View style={vr.actionRow}>
        <View style={vr.streakPill}>
          <Ionicons name="flame" size={16} color="#FF9F43" />
          <View>
            <Text style={vr.streakText}>{language === 'si' ? 'දින ' + streak : streak + (streak === 1 ? ' day' : ' days')}</Text>
            <Text style={vr.streakSub}>{language === 'si' ? 'අඛණ්ඩ ගමන' : 'COSMIC STREAK'}</Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.85} onPress={onShare} disabled={sharing} style={vr.shareBtn}>
          <LinearGradient colors={['#F8C55E', '#D99A2B', '#A66A19']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <View style={vr.shareBtnHighlight} />
          <Ionicons name={sharing ? 'hourglass-outline' : 'share-social'} size={15} color="#140B04" />
          <Text style={vr.shareBtnText}>{language === 'si' ? 'අද කාඩ්පත බෙදාගන්න' : "Share today's card"}</Text>
        </TouchableOpacity>
      </View>

      {!hasBirthData ? (
        <TouchableOpacity activeOpacity={0.86} onPress={onAddBirth} style={s.oracleProfileCta}>
          <LinearGradient colors={['#F5B84B', '#A66A19']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
          <Ionicons name="sparkles" size={15} color="#140B04" />
          <Text style={s.oracleProfileCtaText}>{language === 'si' ? 'ඔබේ උපන් විස්තර එකතු කරන්න' : 'Make Today Personal'}</Text>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
});

/* ── DO & DON'T — the most screenshot-able daily guidance ── */
var DoDontCard = React.memo(function DoDontCard({ pack, language }) {
  if (!pack || (pack.dos.length === 0 && pack.donts.length === 0)) return null;
  return (
    <Animated.View entering={FadeInDown.delay(90).springify()}>
      <View style={vr.ddCard}>
        <LinearGradient colors={['#171024', '#120B1C', '#0C0714']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <LinearGradient colors={['rgba(232,197,106,0.08)', 'transparent']} style={vr.topVeil} pointerEvents="none" />
        <View style={vr.ddHeader}>
          <View style={vr.ddHeaderIcon}><Ionicons name="compass-outline" size={15} color="#E8C56A" /></View>
          <View style={{ flex: 1 }}>
            <Text style={vr.ddKicker}>{language === 'si' ? 'අද පංචාංගයට අනුව' : "FROM TODAY'S PANCHANGA"}</Text>
            <Text style={vr.ddTitle}>{language === 'si' ? 'අද කරන්න · නොකරන්න' : "Do & Don't Today"}</Text>
          </View>
        </View>
        <View style={vr.ddCols}>
          <View style={vr.ddCol}>
            <View style={vr.ddColHead}>
              <View style={[vr.ddColDot, { backgroundColor: '#86EFAC' }]} />
              <Text style={[vr.ddColTitle, { color: '#86EFAC' }]}>{language === 'si' ? 'කරන්න' : 'DO'}</Text>
            </View>
            {pack.dos.map(function (item, i) {
              return (
                <Animated.View key={'do' + i} entering={FadeInUp.delay(180 + i * 60).springify()} style={vr.ddItem}>
                  <Ionicons name="checkmark-circle" size={14} color="#86EFAC" style={{ marginTop: 2 }} />
                  <Text style={vr.ddItemText}>{item}</Text>
                </Animated.View>
              );
            })}
          </View>
          <View style={vr.ddDivider} />
          <View style={vr.ddCol}>
            <View style={vr.ddColHead}>
              <View style={[vr.ddColDot, { backgroundColor: '#FCA5A5' }]} />
              <Text style={[vr.ddColTitle, { color: '#FCA5A5' }]}>{language === 'si' ? 'නොකරන්න' : "DON'T"}</Text>
            </View>
            {pack.donts.map(function (item, i) {
              return (
                <Animated.View key={'dn' + i} entering={FadeInUp.delay(220 + i * 60).springify()} style={vr.ddItem}>
                  <Ionicons name="close-circle" size={14} color="#FCA5A5" style={{ marginTop: 2 }} />
                  <Text style={vr.ddItemText}>{item}</Text>
                </Animated.View>
              );
            })}
          </View>
        </View>
        <View style={vr.innerFrame} pointerEvents="none" />
      </View>
    </Animated.View>
  );
});

/* ── LUCKY TRIO — color / number / direction from real chart + panchanga ── */
var LuckyTrio = React.memo(function LuckyTrio({ chartData, data, language }) {
  var copy = getLagnaUiCopy(chartData);
  var colorVal = copy && copy.color ? (language === 'si' ? copy.color.si : copy.color.en) : (language === 'si' ? 'රන්වන්' : 'Gold');
  var tithiNum = data && data.panchanga && data.panchanga.tithi && data.panchanga.tithi.number ? data.panchanga.tithi.number : 5;
  var lagnaId = chartData && chartData.lagna ? (chartData.lagna.rashiId || chartData.lagna.id || 1) : 3;
  var luckyNum = ((tithiNum * 3 + lagnaId * 7 + sltDayIndex()) % 9) + 1;
  var dow = new Date(Date.now() + SLT_OFFSET_MS).getUTCDay();
  var dir = VAARA_LUCKY_DIRECTION[dow] || VAARA_LUCKY_DIRECTION[0];
  var tiles = [
    { icon: 'color-palette-outline', label: language === 'si' ? 'සුබ පාට' : 'LUCKY COLOR', value: colorVal, color: '#F5A9C7' },
    { icon: 'sparkles-outline', label: language === 'si' ? 'සුබ අංකය' : 'LUCKY NUMBER', value: String(luckyNum), color: '#F5D57A' },
    { icon: 'compass-outline', label: language === 'si' ? 'සුබ දිශාව' : 'LUCKY DIRECTION', value: language === 'si' ? dir.si : dir.en, color: '#7DD3FC' },
  ];
  return (
    <Animated.View entering={FadeInDown.delay(160).springify()}>
      <View style={vr.ltCard}>
        <LinearGradient colors={['#1A150A', '#15100A', '#0F0B06']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <View style={vr.ltRow}>
          {tiles.map(function (tile, i) {
            return (
              <Animated.View key={tile.label} entering={FadeInUp.delay(220 + i * 70).springify()} style={[vr.ltTile, { borderColor: tile.color + '30' }]}>
                <LinearGradient colors={[tile.color + '10', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
                <View style={[vr.ltIcon, { backgroundColor: tile.color + '14', borderColor: tile.color + '38' }]}>
                  <Ionicons name={tile.icon} size={15} color={tile.color} />
                </View>
                <Text style={vr.ltLabel}>{tile.label}</Text>
                <Text style={[vr.ltValue, { color: tile.color }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>{tile.value}</Text>
              </Animated.View>
            );
          })}
        </View>
        <Text style={vr.ltNote}>
          {language === 'si' ? 'ඔබේ ලග්නය සහ අද තිථිය අනුව' : 'From your lagna & today\'s tithi'}
        </Text>
      </View>
    </Animated.View>
  );
});

/* ── SHARE CARD — branded 9:16 daily card for WhatsApp / IG stories ── */
var ShareTodayCard = React.forwardRef(function ShareTodayCard(props, ref) {
  var language = props.language;
  var displayName = props.displayName;
  var oracle = props.oracle;
  var overall = props.overall;
  var pack = props.pack;
  var streak = props.streak;
  var todayLabel = new Date().toLocaleDateString(language === 'si' ? 'si-LK' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  var scoreColor = overall >= 70 ? '#86EFAC' : overall >= 50 ? '#F5D57A' : '#FCA5A5';
  return (
    <View ref={ref} collapsable={false} style={scd.card}>
      <LinearGradient colors={['#0B0713', '#171027', '#100A1E', '#0B0713']} locations={[0, 0.35, 0.7, 1]} style={StyleSheet.absoluteFill} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} />
      <LinearGradient colors={['rgba(232,197,106,0.12)', 'transparent']} style={scd.topVeil} />
      {[[24, 60], [320, 90], [50, 520], [300, 480], [180, 40], [90, 300], [280, 280]].map(function (pos, i) {
        return <View key={'st' + i} style={[scd.star, { left: pos[0], top: pos[1], opacity: 0.25 + (i % 3) * 0.15 }]} />;
      })}
      <View style={scd.frame} />

      <View style={scd.header}>
        <Text style={scd.brand}>✦ {language === 'si' ? 'ග්‍රහචාර' : 'GRAHACHARA'} ✦</Text>
        <Text style={scd.date}>{todayLabel}</Text>
      </View>

      <View style={[scd.scoreRing, { borderColor: scoreColor }]}>
        <View style={scd.scoreRingInner}>
          <Text style={[scd.scoreWord, { color: scoreColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{energyWord(overall, language)}</Text>
          <Text style={scd.scoreLbl}>{language === 'si' ? 'අද බලය' : "TODAY'S ENERGY"}</Text>
        </View>
      </View>

      <Text style={scd.name}>{displayName}</Text>
      <Text style={scd.title}>{oracle ? oracle.title : ''}</Text>

      <View style={scd.listBox}>
        {(pack ? pack.dos.slice(0, 2) : []).map(function (item, i) {
          return (
            <View key={'sd' + i} style={scd.listRow}>
              <Text style={[scd.listMark, { color: '#86EFAC' }]}>✓</Text>
              <Text style={scd.listText} numberOfLines={2}>{item}</Text>
            </View>
          );
        })}
        {(pack ? pack.donts.slice(0, 2) : []).map(function (item, i) {
          return (
            <View key={'sn' + i} style={scd.listRow}>
              <Text style={[scd.listMark, { color: '#FCA5A5' }]}>✕</Text>
              <Text style={scd.listText} numberOfLines={2}>{item}</Text>
            </View>
          );
        })}
      </View>

      <View style={scd.footer}>
        <View style={scd.footerStreak}>
          <Ionicons name="flame" size={14} color="#FF9F43" />
          <Text style={scd.footerStreakText}>{language === 'si' ? 'දින ' + streak + ' අඛණ්ඩව' : streak + '-day streak'}</Text>
        </View>
        <Text style={scd.footerBrand}>{language === 'si' ? 'ඔබේ දවසත් බලන්න · Grahachara' : 'See your day · Grahachara'}</Text>
      </View>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════
//  MOON v2 — constants + rich bilingual phase guidance
// ═══════════════════════════════════════════════════════════════════════
var ACircle = Animated.createAnimatedComponent(Circle);
var MOON_SIZE = Math.min(SCREEN_WIDTH * 0.62, 250);
var MOON_RING_SIZE = MOON_SIZE + 36;
var MOON_RING_R = (MOON_SIZE + 26) / 2;
var MOON_RING_C = 2 * Math.PI * MOON_RING_R;
var MOON_DUST = [
  [18, 56, 1.2, 0.34], [42, 132, 0.9, 0.22], [64, 254, 1.1, 0.28], [92, 82, 0.7, 0.22],
  [118, 182, 1.4, 0.32], [138, 338, 0.8, 0.24], [166, 42, 1.0, 0.28], [192, 136, 0.7, 0.20],
  [214, 280, 1.2, 0.30], [242, 70, 0.8, 0.22], [268, 198, 1.5, 0.34], [296, 318, 0.9, 0.24],
  [324, 112, 1.0, 0.28], [342, 248, 0.7, 0.20], [30, 382, 0.8, 0.22], [78, 430, 1.1, 0.28],
  [128, 492, 0.7, 0.20], [204, 434, 1.0, 0.26], [276, 480, 0.9, 0.24], [334, 406, 1.2, 0.30],
];
var MOON_PHASE_CONTENT = [
  {
    en: { name: 'New Moon', essence: "The sky's blank page", body: 'Tonight the Moon disappears to begin again. This is the quietest, most fertile moment of the cycle — set one clear intention and let it grow with the returning light.', dos: ['Set one intention', 'Plan quietly', 'Rest deeply'] },
    si: { name: 'අමාවක', essence: 'අහසේ හිස් පිටුව', body: 'අද සඳ නොපෙනී අලුත් චක්‍රයක් අරඹයි. මේ චක්‍රයේ නිහඬම, බීජ වපුරන මොහොතයි — පැහැදිලි අරමුණක් සිතේ තබාගන්න, සඳ එළිය සමඟ ඒක වැඩේවි.', dos: ['අරමුණක් සකසන්න', 'නිහඬව සැලසුම් කරන්න', 'හොඳින් විවේක ගන්න'] },
  },
  {
    en: { name: 'Waxing Crescent', essence: 'First light returns', body: 'A thin silver edge appears — momentum is being born. Take the first small step on what you intend; tiny beginnings made now carry the whole cycle forward.', dos: ['Take first steps', 'Start a habit', 'Learn something new'] },
    si: { name: 'පුර සිහින් සඳ', essence: 'පළමු එළිය නැවත එයි', body: 'සිහින් රිදී ඉරක් අහසේ මතුවෙයි — ගමන අලුතින් අරඹයි. ඔබේ අරමුණට පළමු පුංචි පියවර තියන්න; දැන් කරන පුංචි ආරම්භ මුළු චක්‍රයම ඉදිරියට ගෙනියයි.', dos: ['පළමු පියවර තියන්න', 'අලුත් පුරුද්දක් අරඹන්න', 'අලුත් දෙයක් ඉගෙනගන්න'] },
  },
  {
    en: { name: 'First Quarter', essence: 'The push-through point', body: 'Half-lit and climbing — this is where resistance shows up and resolve is tested. Face the obstacle directly and decide; effort spent now pays for the whole month.', dos: ['Make the decision', 'Push through blocks', 'Act with courage'] },
    si: { name: 'පුර අටවක', essence: 'බාධක ජයගන්නා මොහොත', body: 'සඳ භාගයක් එළිවී ඉහළට නගී — බාධක මතුවන, අධිෂ්ඨානය පරීක්ෂා වන කාලයයි. පසුබට නොවී තීරණය ගන්න; දැන් දරන උත්සාහය මුළු මාසෙටම ඵල දෙයි.', dos: ['තීරණය ගන්න', 'බාධක ජයගන්න', 'ධෛර්යයෙන් ක්‍රියා කරන්න'] },
  },
  {
    en: { name: 'Waxing Gibbous', essence: 'Almost there — refine', body: 'The Moon is nearly full and so is your work. Polish, adjust, correct course — patience in these final steps is what separates good from extraordinary.', dos: ['Refine your work', 'Adjust the plan', 'Stay patient'] },
    si: { name: 'පුර සඳ පිරෙමින්', essence: 'ඉලක්කය ළඟයි — ඔප දමන්න', body: 'සඳ පිරෙන්න ආසන්නයි, ඔබේ වැඩත් එහෙමයි. කළ දේ ඔප දමන්න, සියුම් වෙනස්කම් කරන්න — අවසාන පියවරවල ඉවසීම තමයි හොඳ දේ විශිෂ්ට කරන්නේ.', dos: ['වැඩ ඔප දමන්න', 'සැලසුම හදාගන්න', 'ඉවසීමෙන් ඉන්න'] },
  },
  {
    en: { name: 'Full Moon', essence: 'The sky at full power', body: 'The Moon pours its complete light on everything you have built. Honour what is finished, give thanks, and let strong emotions pass through you like moonlight — felt, but not held.', dos: ['Practice gratitude', 'Complete & celebrate', 'Meditate'] },
    si: { name: 'පසළොස්වක පෝය', essence: 'අහස පූර්ණ බලයෙන්', body: 'පිරුණු සඳේ ආලෝකය ඔබ ගොඩනැගූ හැම දෙයකටම වැටෙයි. නිම කළ දේ අගය කරන්න, ස්තුතිය පුදන්න — පෝය දිනයේ සිත නිවන දෙයකට කාලය දෙන්න.', dos: ['ස්තුතිවන්ත වන්න', 'කළ දේ සමරන්න', 'භාවනා කරන්න'] },
  },
  {
    en: { name: 'Waning Gibbous', essence: 'Share the light', body: 'The Moon begins its gentle descent. What you learned this cycle is ripest now — teach it, share it, give back. Generosity in this phase returns doubled.', dos: ['Share what you know', 'Help someone', 'Review progress'] },
    si: { name: 'අව සඳ බසිමින්', essence: 'එළිය බෙදාගන්න', body: 'පිරුණු සඳ හෙමින් බසින්න පටන් ගනී. මේ චක්‍රයේ ඔබ ඉගෙනගත් දේ දැන් හොඳටම මේරිලා — ඒක බෙදාගන්න, කාට හරි උදව් කරන්න. දැන් කරන ත්‍යාගශීලීකම දෙගුණයක් වී ආපසු එයි.', dos: ['දැනුම බෙදාගන්න', 'කෙනෙකුට උදව් කරන්න', 'ප්‍රගතිය බලන්න'] },
  },
  {
    en: { name: 'Last Quarter', essence: "Release what's heavy", body: 'Half the light remains — the cycle asks what you will carry forward and what you will finally put down. Old weight, old grudges: this is the week to let them go.', dos: ['Let go', 'Forgive', 'Declutter'] },
    si: { name: 'අව අටවක', essence: 'බර දේ අතහරින්න', body: 'එළියෙන් භාගයක් ඉතිරියි — ඉදිරියට ගෙනියන්නේ මොනවාද, අවසානයට බිම තියන්නේ මොනවාද කියා චක්‍රය අසයි. පැරණි බර, පැරණි තරහ — ඒවා අතහරින්න හොඳම සතිය මේකයි.', dos: ['අතහරින්න', 'සමාව දෙන්න', 'අවශ්‍ය නැති දේ ඉවත් කරන්න'] },
  },
  {
    en: { name: 'Waning Crescent', essence: 'The deep rest', body: 'The last sliver of light before the dark. Slow everything down — sleep well, reflect on the month, and prepare the ground. A brand-new Moon is only nights away.', dos: ['Rest well', 'Reflect', 'Prepare for the new'] },
    si: { name: 'අව සිහින් සඳ', essence: 'ගැඹුරු විවේකය', body: 'අඳුරට කලින් ඉතිරි වූ අවසාන එළි රේඛාවයි. හැමදේම හෙමින් කරන්න — හොඳින් නිදාගන්න, ගෙවුණු මාසය ගැන මෙනෙහි කරන්න. අලුත් අමාවකට ඉතිරිව ඇත්තේ රාත්‍රී කිහිපයයි.', dos: ['හොඳින් විවේක ගන්න', 'මෙනෙහි කරන්න', 'අලුත් ආරම්භයට සූදානම් වන්න'] },
  },
];

export default function HomeScreen() {
  var { t, language } = useLanguage();
  var { user, showPaywall } = useAuth();
  var isFreeUser = user && user.isSubscribed !== true;
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
  var [streak, setStreak] = useState(1);
  var [shareTodayVisible, setShareTodayVisible] = useState(false);
  var shareTodayRef = useRef(null);
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

  // ── Moon v2 animation hooks (top level: render fn is called conditionally) ──
  var tithiForMoonNow = data && data.panchanga && data.panchanga.tithi && data.panchanga.tithi.number
    ? data.panchanga.tithi.number : getMoonPhaseFromDate();
  var selectedTithiTop = ((tithiForMoonNow + selectedDayOffset - 1 + 300) % 30) + 1;
  var selIllumTop = selectedTithiTop <= 15 ? (selectedTithiTop - 1) / 14 : (30 - selectedTithiTop) / 14;
  selIllumTop = Math.max(0, Math.min(1, selIllumTop));
  var moonBob = useSharedValue(0.5);
  var moonFill = useSharedValue(0);
  useEffect(function () {
    if (skipHeavy) { moonBob.value = 0.5; return; }
    moonBob.value = withRepeat(withTiming(1, { duration: 6200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [skipHeavy]);
  useEffect(function () {
    moonFill.value = withTiming(selIllumTop * 100, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [selIllumTop]);
  var moonBobStyle = useAnimatedStyle(function () {
    return { transform: [{ translateY: interpolate(moonBob.value, [0, 1], [-5, 5]) }] };
  });
  var moonRingProps = useAnimatedProps(function () {
    return { strokeDashoffset: MOON_RING_C * (1 - moonFill.value / 100) };
  });
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
      var res;
      try {
        res = await api.getDailyNakath(dateStr);
      } catch (gatedErr) {
        // Non-subscribers are 402/401 on the gated daily route. Fall back to
        // the free preview (identical shape) so the daily habit surface —
        // Rahu Kalaya, panchanga, sunrise/sunset, moon — still renders instead
        // of empty dashes. Personalized cards tease separately.
        if (gatedErr && (gatedErr.statusCode === 402 || gatedErr.statusCode === 401 || (gatedErr.message && /subscri/i.test(gatedErr.message)))) {
          res = await api.getTodayPreview(dateStr, birthLat, birthLng);
        } else {
          throw gatedErr;
        }
      }
      setData(res.data);
    } catch (err) {
      setError(err.message || t('failedToAlign'));
    } finally {
      setLoading(false);
    }
  }, [t, birthLat, birthLng]);

  var fetchBirthChart = useCallback(async function (cancelled) {
    if (!hasBirthData) return;
    try {
      setChartLoading(true);
      var res;
      try {
        res = await api.getBirthChartBasic(birthDateTime, birthLat, birthLng, language);
      } catch (gatedErr) {
        // Non-subscribers 402 on the gated basic chart. Fall back to the free
        // identity preview (same shape) so the Home page shows the user's real
        // lagna/moon identity — the "mirror" — instead of feeling empty.
        if (gatedErr && (gatedErr.statusCode === 402 || gatedErr.statusCode === 401 || (gatedErr.message && /subscri/i.test(gatedErr.message)))) {
          res = await api.getBirthChartPreview(birthDateTime, birthLat, birthLng);
        } else {
          throw gatedErr;
        }
      }
      if (!cancelled.current && res && res.success) setChartData(res.data);
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

  // Convergence timeline — deferred, cached once per calendar month (per tier,
  // so an upgrade refetches the full version). Free → preview slice; Pro → full.
  var [convergence, setConvergence] = useState(null);
  useEffect(function () {
    if (!hasBirthData || !birthDateTime) { setConvergence(null); return; }
    var cancelled = false;
    var monthTag = new Date().toISOString().slice(0, 7);
    var cacheKey = 'grahachara_convergence_' + (user?.uid || 'anon') + '_' + monthTag + '_' + (isFreeUser ? 'free' : 'pro');
    var handle = InteractionManager.runAfterInteractions(function () {
      AsyncStorage.getItem(cacheKey).then(function (raw) {
        if (cancelled) return;
        if (raw) { try { setConvergence(JSON.parse(raw)); return; } catch (e) { /* refetch */ } }
        var p = isFreeUser
          ? api.getConvergencePreview(birthDateTime, birthLat, birthLng)
          : api.getConvergence(birthDateTime, birthLat, birthLng);
        p.then(function (res) {
          if (cancelled || !res || !res.success || !res.data) return;
          var norm = normalizeConvergence(res.data, isFreeUser);
          if (!norm) return;
          setConvergence(norm);
          AsyncStorage.setItem(cacheKey, JSON.stringify(norm)).catch(function () {});
        }).catch(function () { /* silent */ });
      }).catch(function () {});
    });
    return function () { cancelled = true; handle.cancel(); };
  }, [hasBirthData, birthDateTime, birthLat, birthLng, isFreeUser, user]);

  // ── Prediction check-ins (Phase 3 retention/trust loop) ──
  // Only Pro users who've generated reports have dated predictions to confirm.
  // Asking "did this happen?" builds trust, gives us calibration data, and is a
  // reason to reopen the app when a window closes.
  var [checkins, setCheckins] = useState([]);
  useEffect(function () {
    if (isFreeUser || !user || !user.uid) { setCheckins([]); return; }
    var cancelled = false;
    var handle = InteractionManager.runAfterInteractions(function () {
      api.getPredictionCheckins().then(function (res) {
        if (cancelled || !res || !res.success || !res.data) return;
        setCheckins(res.data.due || []);
      }).catch(function () { /* silent */ });
    });
    return function () { cancelled = true; handle.cancel(); };
  }, [isFreeUser, user]);

  var answerCheckin = useCallback(function (item, outcome) {
    // Optimistically drop the answered card; the next due one surfaces.
    setCheckins(function (list) {
      return list.filter(function (c) { return !(c.reportId === item.reportId && c.id === item.id); });
    });
    api.sendPredictionOutcome(item.reportId, item.id, outcome, {
      claim: item.claim, domain: item.domain, type: item.type,
    }).catch(function () { /* best-effort */ });
  }, []);

  // ── Win-back (Phase 3) ── Remember if this user was ever Pro. A lapsed
  // subscriber (was Pro, now free) sees a warm "welcome back" banner instead of
  // the generic discover surfaces — loss-framed, one tap to reactivate.
  var [wasPro, setWasPro] = useState(false);
  var [winbackDismissed, setWinbackDismissed] = useState(false);
  useEffect(function () {
    if (user && user.isSubscribed === true) {
      AsyncStorage.setItem('@grahachara_was_pro', '1').catch(function () {});
      setWasPro(false); // currently active — no win-back
    } else if (user && user.uid) {
      AsyncStorage.getItem('@grahachara_was_pro').then(function (v) { setWasPro(v === '1'); }).catch(function () {});
    } else {
      setWasPro(false);
    }
  }, [user]);

  var getGreeting = function () {
    var h = new Date().getHours();
    return h < 12 ? t('goodMorning') : h < 17 ? t('goodAfternoon') : t('goodEvening');
  };

  // Daily check-in streak (retention loop) — keyed to the SLT day boundary
  useEffect(function () {
    var today = sltDayIndex();
    AsyncStorage.getItem('grahachara_daily_streak').then(function (raw) {
      var st = { count: 1, last: today };
      try {
        var prev = raw ? JSON.parse(raw) : null;
        if (prev && prev.last === today) st = prev;
        else if (prev && prev.last === today - 1) st = { count: (prev.count || 1) + 1, last: today };
      } catch (e) { /* corrupt cache — reset streak */ }
      setStreak(st.count);
      AsyncStorage.setItem('grahachara_daily_streak', JSON.stringify(st)).catch(function () {});
    }).catch(function () {});
  }, []);

  // Capture + share today's branded card (WhatsApp / IG story viral loop)
  var shareToday = useCallback(function () {
    if (sharingBusy) return;
    setSharingBusy(true);
    setShareTodayVisible(true);
    setTimeout(async function () {
      try {
        var uri = await captureRef(shareTodayRef, { format: 'png', quality: 1 });
        if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png' });
        }
      } catch (e) { /* capture unavailable — fail silently */ }
      setShareTodayVisible(false);
      setSharingBusy(false);
    }, 420);
  }, [sharingBusy]);

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

  // ── v3 derived data: energy score, oracle, do/don't pack (once per render) ──
  var lifeResult = data ? computeLifeScores(chartData, jyotishToday, data, language) : null;
  var todayOracle = data ? buildTodayOracle({
    language: language, data: data, chartData: chartData,
    hasBirthData: hasBirthData, displayName: displayName, rahuActive: rahuActive,
  }) : null;
  var ddPack = data ? buildDoDontLists(data, language, rahuActive) : null;
  var bestWindow = data && data.auspiciousPeriods && data.auspiciousPeriods[0]
    ? (data.auspiciousPeriods[0].startFormatted ? data.auspiciousPeriods[0].startFormatted.display : toSLT(data.auspiciousPeriods[0].start, t))
    : null;
  var heroChartBadge = hasBirthData && chartData && todayOracle && todayOracle.lagnaName
    ? (language === 'si' ? todayOracle.lagnaName + ' ලග්නය' : todayOracle.lagnaName + ' Rising')
    : hasBirthData
      ? (language === 'si' ? 'කේන්දරය සකස් වෙමින්' : 'Chart tuning')
      : (language === 'si' ? 'උපන් විස්තර අවශ්‍යයි' : 'Birth profile needed');

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

  // (moved to components/CosmicIdentity.js — rendered on the Profile tab)
  // (removed in v3 viral redesign)
  // (removed in v3 viral redesign)
  // (removed in v3 viral redesign)
  // (removed in v3 viral redesign)
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
    var selectedTithi = selectedTithiTop;
    var selIllumPct = Math.round(selIllumTop * 100);
    var phaseIdx = selectedTithi <= 1 ? 0 : selectedTithi <= 4 ? 1 : selectedTithi <= 8 ? 2 : selectedTithi <= 14 ? 3 : selectedTithi === 15 ? 4 : selectedTithi <= 19 ? 5 : selectedTithi <= 23 ? 6 : 7;
    var pc = MOON_PHASE_CONTENT[phaseIdx];
    var content = language === 'si' ? pc.si : pc.en;
    var isPoya = selectedTithi === 15;
    var isNew = selectedTithi <= 1;
    var isWaxing = selectedTithi > 1 && selectedTithi < 15;
    var isDarkMoon = selectedTithi >= 29 || selectedTithi <= 2;
    var selDate = new Date(); selDate.setDate(selDate.getDate() + selectedDayOffset);
    var selDateLabel = selectedDayOffset === 0
      ? (language === 'si' ? 'අද' : 'Today')
      : selDate.toLocaleDateString(language === 'si' ? 'si-LK' : 'en', { month: 'short', day: 'numeric' });
    var trendChip = isPoya
      ? { icon: 'sunny-outline', text: language === 'si' ? 'පූර්ණ සඳ' : 'Full power', color: '#FFE9A8' }
      : isNew
        ? { icon: 'ellipse-outline', text: language === 'si' ? 'අලුත් චක්‍රය' : 'New cycle', color: '#B7A6F0' }
        : isWaxing
          ? { icon: 'trending-up-outline', text: language === 'si' ? 'වැඩෙන සඳ' : 'Waxing', color: '#86EFAC' }
          : { icon: 'trending-down-outline', text: language === 'si' ? 'බසින සඳ' : 'Waning', color: '#7DD3FC' };
    var ringCenter = MOON_RING_SIZE / 2;

    return (
      <Animated.View entering={FadeInDown.delay(550).springify()}>
        <View style={mp.card}>
          <LinearGradient colors={['#0B0714', '#070410', '#040208', '#120B03']} locations={[0, 0.4, 0.75, 1]} style={StyleSheet.absoluteFill} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} />
          <LinearGradient colors={['rgba(183,166,240,0.10)', 'transparent']} style={mp.violetVeil} pointerEvents="none" />
          <LinearGradient colors={['transparent', 'rgba(218,165,32,0.10)']} style={mp.goldFloor} pointerEvents="none" />
          <Svg width="100%" height="100%" viewBox="0 0 360 620" preserveAspectRatio="none" style={StyleSheet.absoluteFill} pointerEvents="none">
            {MOON_DUST.map(function (dot, i) {
              return <Circle key={'md' + i} cx={dot[0]} cy={dot[1]} r={dot[2]} fill="#F4E4BC" opacity={dot[3]} />;
            })}
            <Path d={sparklePath(46, 96, 6)} fill="rgba(244,228,188,0.40)" />
            <Path d={sparklePath(314, 130, 4.5)} fill="rgba(183,166,240,0.38)" />
            <Path d={sparklePath(290, 480, 5)} fill="rgba(244,228,188,0.30)" />
          </Svg>

          <View style={mp.header}>
            <View>
              <Text style={mp.kicker}>{language === 'si' ? 'චන්ද්‍ර චක්‍රය' : 'LUNAR CYCLE'}</Text>
              <Text style={mp.headerDate}>{selDateLabel.toUpperCase()}</Text>
            </View>
            {isPoya ? (
              <View style={mp.poyaBadge}>
                <Ionicons name="moon" size={12} color="#FFE9A8" />
                <Text style={mp.poyaText}>{language === 'si' ? 'පෝය දිනය' : 'POYA DAY'}</Text>
              </View>
            ) : null}
          </View>

          {/* floating moon inside an animated illumination ring */}
          <Animated.View style={[mp.moonStage, moonBobStyle]}>
            <View style={mp.moonHalo} />
            <Svg width={MOON_RING_SIZE} height={MOON_RING_SIZE} viewBox={'0 0 ' + MOON_RING_SIZE + ' ' + MOON_RING_SIZE} style={{ position: 'absolute' }}>
              <Defs>
                <SvgLinearGradient id="moonArcGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#FFF8E7" />
                  <Stop offset="1" stopColor="#DAA520" />
                </SvgLinearGradient>
              </Defs>
              {Array.from({ length: 24 }).map(function (_, i) {
                var a = (i * 15 - 90) * Math.PI / 180;
                var major = i % 6 === 0;
                return (
                  <Line key={'mt' + i}
                    x1={ringCenter + (MOON_RING_R - 9) * Math.cos(a)} y1={ringCenter + (MOON_RING_R - 9) * Math.sin(a)}
                    x2={ringCenter + (MOON_RING_R - (major ? 15 : 12)) * Math.cos(a)} y2={ringCenter + (MOON_RING_R - (major ? 15 : 12)) * Math.sin(a)}
                    stroke={major ? 'rgba(245,213,122,0.45)' : 'rgba(232,197,106,0.20)'}
                    strokeWidth={major ? 1.6 : 1} strokeLinecap="round" />
                );
              })}
              <Circle cx={ringCenter} cy={ringCenter} r={MOON_RING_R} stroke="rgba(255,255,255,0.07)" strokeWidth="3" fill="none" />
              <ACircle
                cx={ringCenter} cy={ringCenter} r={MOON_RING_R}
                stroke="url(#moonArcGrad)" strokeWidth="3" strokeLinecap="round" fill="none"
                strokeDasharray={MOON_RING_C}
                animatedProps={moonRingProps}
                rotation="-90" origin={ringCenter + ', ' + ringCenter}
              />
            </Svg>
            <RealisticMoon size={MOON_SIZE} tithiNum={selectedTithi} animate={!skipHeavy} showStars={false} />
            {isDarkMoon ? <View style={mp.darkMoonRim} pointerEvents="none" /> : null}
          </Animated.View>

          {/* phase story — crossfades when the selected day changes */}
          <Animated.View key={'ph' + selectedTithi} entering={FadeInDown.duration(320)} style={mp.infoBlock}>
            <Text style={mp.phaseName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{content.name}</Text>
            <Text style={mp.essence} numberOfLines={1}>{content.essence}</Text>
            <View style={mp.chipRow}>
              <View style={[mp.chip, { borderColor: 'rgba(255,233,168,0.30)' }]}>
                <Ionicons name="contrast-outline" size={11} color="#FFE9A8" />
                <Text style={[mp.chipText, { color: '#FFE9A8' }]} numberOfLines={1}>{selIllumPct}% {language === 'si' ? 'ආලෝකය' : 'LIT'}</Text>
              </View>
              <View style={[mp.chip, { borderColor: trendChip.color + '4D' }]}>
                <Ionicons name={trendChip.icon} size={11} color={trendChip.color} />
                <Text style={[mp.chipText, { color: trendChip.color }]} numberOfLines={1}>{trendChip.text}</Text>
              </View>
            </View>
            <Text style={mp.body}>{content.body}</Text>
            <View style={mp.dosRow}>
              {content.dos.map(function (d, i) {
                return (
                  <View key={'mdo' + i} style={mp.doChip}>
                    <Ionicons name="sparkles-outline" size={10} color="#DAA520" />
                    <Text style={mp.doChipText}>{d}</Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>

          <ScrollView
            ref={moonScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={mp.timeline}
            decelerationRate="fast"
            snapToInterval={MOON_ITEM_W}
          >
            {moonDates.map(function (dt) {
              return (
                <MoonTimelineItem
                  key={dt.offset}
                  dt={dt}
                  isSelected={dt.offset === selectedDayOffset}
                  isKeyPhase={dt.tithi === 1 || dt.tithi === 15}
                  offset={dt.offset}
                  onSelect={setSelectedDayOffset}
                  mpStyles={mp}
                />
              );
            })}
          </ScrollView>
          <View style={mp.innerFrame} pointerEvents="none" />
        </View>
      </Animated.View>
    );
  }

  // (removed in v3 viral redesign)
  // (removed in v3 viral redesign)
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
    var dayIdx = ((sltDayIndex() % mantrasEn.length) + mantrasEn.length) % mantrasEn.length;

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
    // Weekly lagna palapala is a Pro feature — free users get the locked teaser
    // in renderWeeklyLagna instead, so skip the "jump to forecast" banner.
    if (isFreeUser) return null;
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

  // (moved to components/CosmicIdentity.js — rendered on the Profile tab)
  // (moved to components/CosmicIdentity.js — rendered on the Profile tab)
  // (moved to components/CosmicIdentity.js — rendered on the Profile tab)
  // (moved to components/CosmicIdentity.js — rendered on the Profile tab)
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
              // Show the REAL yoga name the engine computed (with Sinhala variant if provided),
              // instead of collapsing every yoga into one of two generic templates.
              var localName = language === 'si' && typeof yoga === 'object' && (yoga.nameSi || yoga.sinhala)
                ? (yoga.nameSi || yoga.sinhala)
                : (rawName || (isCautionPattern
                    ? (language === 'si' ? 'කල්පනාකාරී කාලයක්' : 'Careful Timing Pattern')
                    : (language === 'si' ? 'සුබ කාලයක්' : 'Supportive Timing Pattern')));
              var yName = /yoga|yogaya/i.test(localName) || language === 'si' ? localName : localName + ' Yoga';
              var localDesc = language === 'si' && typeof yoga === 'object' && (yoga.descriptionSi || yoga.resultSi)
                ? (yoga.descriptionSi || yoga.resultSi)
                : rawDesc;
              var yDesc = localDesc || (isCautionPattern
                ? (language === 'si' ? 'හදිසි තීරණ ගැනීමේදී ටිකක් පරිස්සම් වෙන්න. මොනදේ කලත් දෙවරක් හිතලා බලන්න.' : 'Double-check important work and avoid rushed decisions.')
                : (language === 'si' ? 'දිගුකාලීන සැලසුම් වලට, අලුත් තීරණ වලට මේ වෙලාව ගොඩක් හොඳයි.' : 'Use it for steady progress, planning, and well-considered choices.'));
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

  // (removed in v3 viral redesign)
  // (removed in v3 viral redesign)
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
    // Weekly lagna palapala is a Pro feature (the subscription's "weekly
    // readings"). Free users get a locked teaser → paywall, never the actual
    // forecasts — defense-in-depth on top of the server's subscription gate,
    // so it stays locked even if the data somehow reaches the client.
    if (isFreeUser) {
      return (
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <CosmicCard variant="surface" delay={300}>
            <View style={s.wlHeader}>
              <View style={s.wlHeaderLeft}>
                <View style={s.wlHeaderIcon}>
                  <Ionicons name="telescope-outline" size={18} color={HT.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.wlTitle}>{language === 'si' ? 'මේ සතියේ ඔයාගේ ලග්න පලාපල' : 'Weekly Forecast'}</Text>
                  <Text style={s.wlWeekLabel}>{language === 'si' ? 'ලග්න 12ටම සතිපතා පලාපල' : 'Weekly readings for all 12 lagnas'}</Text>
                </View>
                <Ionicons name="lock-closed" size={16} color={HT.gold} />
              </View>
            </View>
            <Text style={s.wlLockTease}>
              {language === 'si'
                ? 'අලුත් සතියට ග්‍රහ කිරණ ඔයාගේ ලග්නයට බලපාන හැටි — හැම සතියෙම අලුත් කියවීමක්.'
                : 'How the week ahead plays out for your rising sign — a fresh reading every week.'}
            </Text>
            <TouchableOpacity activeOpacity={0.85} onPress={function () { Promise.resolve(showPaywall('weekly_lagna')).catch(function () {}); }} style={s.wlUnlockCta}>
              <Ionicons name="lock-open-outline" size={14} color="#2A1707" />
              <Text style={s.wlUnlockCtaText}>{language === 'si' ? 'සතිපතා පලාපල විවෘත කරන්න' : 'Unlock weekly forecasts'}</Text>
            </TouchableOpacity>
          </CosmicCard>
        </Animated.View>
      );
    }
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
              {/* ── 2. VIRAL HERO — energy score, one-liner, streak, share ── */}
              <ViralHero
                language={language}
                greeting={getGreeting()}
                displayName={displayName}
                oracle={todayOracle}
                overall={lifeResult ? lifeResult.overall : 60}
                streak={streak}
                chartBadge={heroChartBadge}
                nakshatraVal={nakshatraVal}
                bestWindow={bestWindow}
                onShare={shareToday}
                sharing={sharingBusy}
                hasBirthData={hasBirthData}
                onAddBirth={function () { router.push('/profile'); }}
                skipHeavy={skipHeavy}
              />

              {/* ── 3. Do & Don't — the most screenshot-able daily guidance ── */}
              <DoDontCard pack={ddPack} language={language} />

              {/* ── 4. SIGNATURE: live day sun-clock ── */}
              <DaySkyClock data={data} language={language} t={t} skipHeavy={skipHeavy} />

              {/* ── 5. Lucky Trio — color / number / direction ── */}
              <LuckyTrio chartData={chartData} data={data} language={language} />

              {/* ── 6. Your Day, Scored — personalized aura ── */}
              {lifeResult ? <AuraScores result={lifeResult} language={language} locked={isFreeUser} onUnlock={function () { Promise.resolve(showPaywall('home_aura')).catch(function () {}); }} /> : null}

              {/* ── 6·win-back. Lapsed subscriber — warm welcome-back (loss-framed) ── */}
              {isFreeUser && wasPro && !winbackDismissed ? (
                <WinBackBanner
                  language={language}
                  onReactivate={function () { Promise.resolve(showPaywall('winback')).catch(function () {}); }}
                  onDismiss={function () { setWinbackDismissed(true); }}
                />
              ) : null}

              {/* ── 6a. Prediction check-ins — "did this happen?" (trust + retention) ── */}
              <PredictionCheckins items={checkins} language={language} onAnswer={answerCheckin} />

              {/* ── 6b. Your Next 12 Months — convergence timeline (retention) ── */}
              {convergence ? <ConvergenceTimeline data={convergence} language={language} onUnlock={function () { Promise.resolve(showPaywall('convergence')).catch(function () {}); }} /> : null}

              {/* ── 6c. Nakath & Baby quick tools (life-event acquisition) ── */}
              <ToolsRow router={router} language={language} />

              {/* ── Locked future windows — conversion bait for free users ── */}
              <FutureWindowsBait />

              {/* ── 7. Cosmic Shield + real yogas ── */}
              {hasBirthData && renderCosmicShield()}
              {hasBirthData && renderTodayYogas()}

              {/* ── 8. Moon Phase Showcase ── */}
              {renderMoonPhaseCard()}

              {/* ── 9. Today's Focus — one merged inspiration surface ── */}
              {hasBirthData ? (
                <AffirmationCard
                  language={language}
                  birthDate={birthDateTime}
                  birthLat={birthLat}
                  birthLng={birthLng}
                  getAffirmations={api.getAffirmations}
                />
              ) : (
                renderDailyMantra()
              )}

              {/* ── 10. Compatibility teaser — viral loop into Porondam ── */}
              <TouchableOpacity activeOpacity={0.8} onPress={function () { router.push('/porondam'); }} style={[s.chartLinkCard, { borderColor: 'rgba(244,114,182,0.22)' }]}>
                <LinearGradient colors={['rgba(244,114,182,0.10)', 'rgba(123,73,207,0.05)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <View style={[s.chartLinkIcon, { backgroundColor: 'rgba(244,114,182,0.10)', borderColor: 'rgba(244,114,182,0.28)' }]}>
                  <Ionicons name="heart" size={18} color="#F472B6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.chartLinkTitle}>{language === 'si' ? 'ඔබ දෙදෙනා ගැලපෙනවාද?' : 'Are you two a match?'}</Text>
                  <Text style={s.chartLinkSub}>{language === 'si' ? 'පොරොන්දම් බලා ප්‍රතිඵලය යාළුවෙකුට යවන්න' : 'Check porondam & send the result to someone'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#F472B6" />
              </TouchableOpacity>

              {/* ── 11. Cosmic Detail (Panchanga accordion) ── */}
              {renderPanchanga()}

              {/* ── Your birth chart now lives on the Profile tab — quiet link ── */}
              {hasBirthData && (
                <TouchableOpacity activeOpacity={0.8} onPress={function () { router.push('/profile'); }} style={s.chartLinkCard}>
                  <LinearGradient colors={['rgba(232,197,106,0.08)', 'rgba(123,73,207,0.05)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  <View style={s.chartLinkIcon}>
                    <Ionicons name="finger-print-outline" size={18} color={HT.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.chartLinkTitle}>{language === 'si' ? 'ඔබේ සම්පූර්ණ කේන්දරය' : 'Your full birth chart'}</Text>
                    <Text style={s.chartLinkSub}>{language === 'si' ? 'ලග්නය, පුද්ගලත්වය සහ ග්‍රහ පිහිටීම් — පැතිකඩෙහි' : 'Lagna, personality & placements — in Profile'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={HT.textMuted} />
                </TouchableOpacity>
              )}

              {/* ── 9. Personalization prompt (no birth data) ── */}
              {!hasBirthData && renderNoBirthDataPrompt()}

              {/* ── 10. Weekly ── */}
              {renderWeeklyBanner()}
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

        {/* Off-screen daily share card (captured on demand) */}
        {shareTodayVisible ? (
          <View style={s.shareCapture} pointerEvents="none">
            <ShareTodayCard
              ref={shareTodayRef}
              language={language}
              displayName={displayName}
              oracle={todayOracle}
              overall={lifeResult ? lifeResult.overall : 60}
              pack={ddPack}
              streak={streak}
            />
          </View>
        ) : null}
      </View>
    </DesktopScreenWrapper>
  );
}

var vr = StyleSheet.create({
  topVeil: { position: 'absolute', top: 0, left: 0, right: 0, height: '45%' },
  innerFrame: { position: 'absolute', top: 5, left: 5, right: 5, bottom: 5, borderRadius: 19, borderWidth: 0.5, borderColor: 'rgba(232,197,106,0.12)' },
  medallionWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 10, height: 172 },
  medallionDecor: { position: 'absolute', width: 172, height: 172 },
  medallionCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  medallionWord: { fontSize: 22, fontWeight: '900', letterSpacing: 0.4, textAlign: 'center', width: '100%', ...textShadow('rgba(232,197,106,0.45)', { width: 0, height: 0 }, 16) },
  medallionLabel: { fontSize: 8.5, letterSpacing: 2, color: 'rgba(244,238,223,0.52)', fontWeight: '800', marginTop: 3 },
  statusRow: { alignItems: 'center', marginTop: 10, marginBottom: 2 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.4 },
  heroBody: {
    fontSize: 13, lineHeight: 20.5, color: 'rgba(232,222,200,0.68)', textAlign: 'center',
    marginTop: 9, paddingHorizontal: 10, fontWeight: '500',
  },
  insightRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  insightChip: {
    flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 6,
    borderRadius: 14, borderWidth: 1, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.025)',
  },
  insightIcon: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 1 },
  insightLabel: { fontSize: 7.5, fontWeight: '800', letterSpacing: 1.1, color: 'rgba(244,238,223,0.42)' },
  insightValue: { fontSize: 11.5, fontWeight: '800', textAlign: 'center', width: '100%' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  streakPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 14, backgroundColor: 'rgba(255,159,67,0.09)', borderWidth: 1, borderColor: 'rgba(255,159,67,0.28)',
  },
  streakText: { fontSize: 13, fontWeight: '900', color: '#FFB870', fontVariant: ['tabular-nums'] },
  streakSub: { fontSize: 7.5, letterSpacing: 1, color: 'rgba(255,184,112,0.6)', fontWeight: '800' },
  shareBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,236,190,0.45)',
    ...boxShadow('rgba(245,184,75,0.35)', { width: 0, height: 4 }, 0.4, 12), elevation: 6,
  },
  shareBtnHighlight: { position: 'absolute', top: 0, left: 0, right: 0, height: '46%', backgroundColor: 'rgba(255,255,255,0.14)', borderTopLeftRadius: 13, borderTopRightRadius: 13 },
  shareBtnText: { fontSize: 13.5, fontWeight: '900', color: '#140B04', flexShrink: 1 },
  ddCard: {
    borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(232,197,106,0.20)', padding: 18,
    ...boxShadow('rgba(120,80,200,0.18)', { width: 0, height: 6 }, 0.16, 18), elevation: 8,
  },
  ddHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  ddHeaderIcon: {
    width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(232,197,106,0.10)', borderWidth: 1, borderColor: 'rgba(232,197,106,0.25)',
  },
  ddKicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.6, color: 'rgba(232,197,106,0.52)' },
  ddTitle: { fontSize: 16.5, fontWeight: '800', color: '#F4EEDF', marginTop: 1 },
  ddCols: { flexDirection: 'row', gap: 12 },
  ddCol: { flex: 1, gap: 9 },
  ddDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  ddColHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  ddColDot: { width: 6, height: 6, borderRadius: 3 },
  ddColTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  ddItem: { flexDirection: 'row', gap: 7, alignItems: 'flex-start' },
  ddItemText: { flex: 1, fontSize: 12, lineHeight: 17.5, color: 'rgba(244,238,223,0.78)', fontWeight: '600' },
  ltCard: { borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(232,197,106,0.16)', padding: 14, paddingBottom: 11 },
  ltRow: { flexDirection: 'row', gap: 8 },
  ltTile: {
    flex: 1, alignItems: 'center', borderRadius: 15, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 6,
    gap: 5, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.02)',
  },
  ltIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  ltLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 1, color: 'rgba(244,238,223,0.45)' },
  ltValue: { fontSize: 13.5, fontWeight: '900', textAlign: 'center' },
  ltNote: { fontSize: 9.5, color: 'rgba(244,238,223,0.35)', textAlign: 'center', marginTop: 9 },
});

var scd = StyleSheet.create({
  card: { width: 360, height: 640, overflow: 'hidden', alignItems: 'center', paddingTop: 34, paddingHorizontal: 28 },
  topVeil: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
  star: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#F4E4BC' },
  frame: { position: 'absolute', top: 12, left: 12, right: 12, bottom: 12, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(232,197,106,0.30)' },
  header: { alignItems: 'center', marginBottom: 22 },
  brand: { fontSize: 13, fontWeight: '900', letterSpacing: 4, color: '#E8C56A' },
  date: { fontSize: 11, color: 'rgba(244,238,223,0.55)', marginTop: 5, fontWeight: '600' },
  scoreRing: { width: 140, height: 140, borderRadius: 70, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  scoreRingInner: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(20,12,30,0.75)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(232,197,106,0.22)',
  },
  scoreWord: { fontSize: 24, fontWeight: '900', letterSpacing: 0.4, textAlign: 'center', width: '100%' },
  scoreLbl: { fontSize: 8, letterSpacing: 1.6, color: 'rgba(244,238,223,0.5)', fontWeight: '800', marginTop: 2 },
  name: { fontSize: 13, fontWeight: '700', color: 'rgba(244,238,223,0.6)', marginBottom: 6 },
  title: { fontSize: 22, lineHeight: 30, fontWeight: '800', color: '#F8F1DD', textAlign: 'center', marginBottom: 20, paddingHorizontal: 4 },
  listBox: {
    alignSelf: 'stretch', gap: 10, backgroundColor: 'rgba(255,255,255,0.035)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 14,
  },
  listRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  listMark: { fontSize: 13, fontWeight: '900', marginTop: 1 },
  listText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: 'rgba(244,238,223,0.82)', fontWeight: '600' },
  footer: { position: 'absolute', bottom: 26, left: 28, right: 28, alignItems: 'center', gap: 7 },
  footerStreak: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerStreakText: { fontSize: 12, fontWeight: '800', color: '#FFB870' },
  footerBrand: { fontSize: 10.5, color: 'rgba(232,197,106,0.65)', fontWeight: '700', letterSpacing: 0.6 },
});

var aur = StyleSheet.create({
  card: {
    borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(232,197,106,0.20)', padding: 18,
    ...boxShadow('rgba(120,80,200,0.20)', { width: 0, height: 6 }, 0.18, 18), elevation: 8,
  },
  innerFrame: { position: 'absolute', top: 5, left: 5, right: 5, bottom: 5, borderRadius: 19, borderWidth: 0.5, borderColor: 'rgba(232,197,106,0.12)' },
  topVeil: { position: 'absolute', top: 0, left: 0, right: 0, height: '45%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  chartWrap: { width: 130, height: 130, position: 'relative' },
  centerOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  overallWord: { fontSize: 14, fontWeight: '900', letterSpacing: 0.3, textAlign: 'center', width: '100%', ...textShadow('rgba(232,197,106,0.35)', { width: 0, height: 0 }, 12) },
  overallLbl: { fontSize: 8, letterSpacing: 1.4, color: 'rgba(244,238,223,0.42)', fontWeight: '800', marginTop: 2 },
  legend: { flex: 1, gap: 9 },
  legRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legIcon: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  legName: { fontSize: 10.5, fontWeight: '600', color: 'rgba(244,238,223,0.72)', width: 44 },
  legBarTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  legBarFill: { height: '100%', borderRadius: 3 },
  legScorePill: { width: 54, borderRadius: 8, borderWidth: 1, paddingHorizontal: 4, paddingVertical: 2.5, alignItems: 'center', justifyContent: 'center' },
  legScore: { fontSize: 9, fontWeight: '800', letterSpacing: 0.2, textAlign: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  noteText: { fontSize: 10.5, color: 'rgba(244,238,223,0.4)', flex: 1, lineHeight: 15 },
  unlockCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#E8C56A' },
  unlockCtaText: { fontSize: 12.5, fontWeight: '800', color: '#2A1707', letterSpacing: 0.2 },
});

var sky = StyleSheet.create({
  card: {
    borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(232,197,106,0.22)',
    ...boxShadow('rgba(180,140,40,0.25)', { width: 0, height: 6 }, 0.2, 20), elevation: 9,
  },
  innerFrame: { position: 'absolute', top: 5, left: 5, right: 5, bottom: 5, borderRadius: 19, borderWidth: 0.5, borderColor: 'rgba(232,197,106,0.13)' },
  horizonVeil: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '46%' },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, paddingHorizontal: 18, paddingTop: 16 },
  icBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(232,197,106,0.12)', borderWidth: 1, borderColor: 'rgba(232,197,106,0.3)' },
  kicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.8, color: 'rgba(232,197,106,0.55)' },
  title: { fontSize: 16.5, fontWeight: '800', color: '#F8F1DD', letterSpacing: 0.2, ...textShadow('rgba(232,197,106,0.25)', { width: 0, height: 1 }, 8) },
  sub: { fontSize: 10.5, color: 'rgba(244,238,223,0.5)', marginTop: 2, fontVariant: ['tabular-nums'] },
  cdPill: {
    alignItems: 'flex-end', backgroundColor: 'rgba(252,165,165,0.07)',
    borderWidth: 1, borderColor: 'rgba(252,165,165,0.20)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  cdPillActive: { backgroundColor: 'rgba(252,165,165,0.14)', borderColor: 'rgba(252,165,165,0.4)' },
  cdLabel: { fontSize: 8.5, letterSpacing: 0.8, color: 'rgba(252,165,165,0.7)', fontWeight: '800' },
  cdValue: { fontSize: 17, fontWeight: '900', color: '#FCA5A5', marginTop: 1, fontVariant: ['tabular-nums'] },
  arcWrap: { height: 172, marginTop: 2, position: 'relative' },
  nowWrap: { position: 'absolute', width: 140, marginLeft: -70, marginTop: -46, alignItems: 'center' },
  nowBadge: {
    backgroundColor: 'rgba(20,12,4,0.72)', borderWidth: 1, borderColor: 'rgba(255,217,131,0.45)',
    borderRadius: 9, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6,
  },
  nowBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFE9A8', fontVariant: ['tabular-nums'] },
  nowBadgeDanger: { backgroundColor: 'rgba(52,12,12,0.82)', borderColor: 'rgba(255,138,138,0.60)' },
  nowBadgeTextDanger: { color: '#FFB4B4' },
  sunBox: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  sunHalo: { position: 'absolute', width: 30, height: 30, borderRadius: 15, backgroundColor: '#F5C558' },
  sunHaloNight: { backgroundColor: '#C9CCD6' },
  sunHaloRahu: { backgroundColor: '#F87171' },
  footer: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 10 },
  legChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 13, paddingHorizontal: 10, paddingVertical: 8,
  },
  legChipDanger: { backgroundColor: 'rgba(252,120,120,0.10)', borderColor: 'rgba(252,120,120,0.35)' },
  legChipGold: { backgroundColor: 'rgba(255,233,168,0.08)', borderColor: 'rgba(255,233,168,0.30)' },
  legChipMuted: { opacity: 0.62 },
  legDot: { width: 8, height: 8, borderRadius: 4 },
  legChipLabel: { fontSize: 8.5, fontWeight: '800', letterSpacing: 0.7, color: 'rgba(244,238,223,0.5)' },
  legChipTime: { fontSize: 11.5, fontWeight: '700', color: '#F4EEDF', marginTop: 1, fontVariant: ['tabular-nums'] },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 15 },
  progressTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 10, fontWeight: '700', color: 'rgba(244,238,223,0.55)', fontVariant: ['tabular-nums'] },
});

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
  chartLinkCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderRadius: 18,
    overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(232,197,106,0.16)',
  },
  chartLinkIcon: {
    width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(232,197,106,0.10)', borderWidth: 1, borderColor: 'rgba(232,197,106,0.22)',
  },
  chartLinkTitle: { fontSize: 14, fontWeight: '700', color: '#F4EEDF' },
  chartLinkSub: { fontSize: 11, color: 'rgba(244,238,223,0.5)', marginTop: 2 },
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
  // Sinhala glyphs stack vowel signs above and pillam/descenders below the
  // Latin line box, so a tight lineHeight clips them — especially the top of
  // line 1 and bottom of the last line when numberOfLines caps the height.
  // Give them extra vertical room and keep Android's font padding.
  sinhalaTextFlow: { letterSpacing: 0, textTransform: 'none', lineHeight: 24, includeFontPadding: true },

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
  oracleTitleSinhala: { fontSize: 24, lineHeight: 38, letterSpacing: 0, includeFontPadding: true, paddingVertical: 2 },
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
  wlLockTease: { color: 'rgba(244,228,188,0.62)', fontSize: 13, lineHeight: 19, fontWeight: '500', marginTop: 10 },
  wlUnlockCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#E8C56A' },
  wlUnlockCtaText: { fontSize: 12.5, fontWeight: '800', color: '#2A1707', letterSpacing: 0.2 },
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
    borderRadius: 26, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(232,197,106,0.22)',
    paddingBottom: 14,
    ...boxShadow('rgba(120,80,200,0.22)', { width: 0, height: 7 }, 0.2, 20), elevation: 9,
  },
  innerFrame: { position: 'absolute', top: 5, left: 5, right: 5, bottom: 5, borderRadius: 21, borderWidth: 0.5, borderColor: 'rgba(232,197,106,0.13)' },
  violetVeil: { position: 'absolute', top: 0, left: 0, right: 0, height: '40%' },
  goldFloor: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 16 },
  kicker: { fontSize: 9, fontWeight: '900', letterSpacing: 2, color: 'rgba(232,197,106,0.50)' },
  headerDate: { fontSize: 15, fontWeight: '800', color: '#F4EEDF', marginTop: 2, letterSpacing: 1 },
  poyaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 12, backgroundColor: 'rgba(255,233,168,0.10)', borderWidth: 1, borderColor: 'rgba(255,233,168,0.35)',
  },
  poyaText: { fontSize: 9.5, fontWeight: '900', letterSpacing: 1.2, color: '#FFE9A8' },
  moonStage: { alignItems: 'center', justifyContent: 'center', height: MOON_RING_SIZE + 10, marginTop: 10 },
  moonHalo: {
    position: 'absolute', width: MOON_SIZE + 84, height: MOON_SIZE + 84, borderRadius: (MOON_SIZE + 84) / 2,
    backgroundColor: 'rgba(218,165,32,0.05)', borderWidth: 1, borderColor: 'rgba(244,228,188,0.05)',
  },
  darkMoonRim: {
    position: 'absolute', width: MOON_SIZE + 6, height: MOON_SIZE + 6, borderRadius: (MOON_SIZE + 6) / 2,
    borderWidth: 1.2, borderColor: 'rgba(170,185,230,0.38)',
    ...boxShadow('rgba(150,170,220,0.45)', { width: 0, height: 0 }, 0.5, 18),
  },
  infoBlock: { alignItems: 'center', paddingHorizontal: 22, marginTop: 14 },
  phaseName: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.4, textAlign: 'center', ...textShadow('rgba(218,165,32,0.30)', { width: 0, height: 1 }, 10) },
  essence: { fontSize: 12, fontStyle: 'italic', fontWeight: '600', color: 'rgba(218,165,32,0.78)', marginTop: 4, textAlign: 'center' },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 11 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)',
  },
  chipText: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.8, fontVariant: ['tabular-nums'] },
  body: { fontSize: 12.5, lineHeight: 19.5, color: 'rgba(244,238,223,0.68)', textAlign: 'center', marginTop: 11 },
  dosRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7, marginTop: 12 },
  doChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6,
    borderRadius: 999, backgroundColor: 'rgba(218,165,32,0.07)', borderWidth: 1, borderColor: 'rgba(218,165,32,0.22)',
  },
  doChipText: { fontSize: 10.5, fontWeight: '700', color: '#E8C56A' },
  timeline: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  tlItem: { width: 48, alignItems: 'center', paddingVertical: 7, borderRadius: 14, borderWidth: 1, borderColor: 'transparent' },
  tlItemSelected: { backgroundColor: 'rgba(232,197,106,0.10)', borderColor: 'rgba(232,197,106,0.35)' },
  tlDayName: { fontSize: 9, fontWeight: '700', color: 'rgba(244,238,223,0.40)' },
  tlDayNameActive: { color: '#F5D57A' },
  tlDayNameToday: { color: '#FFE9A8' },
  tlMoonWrap: { marginVertical: 5, alignItems: 'center', justifyContent: 'center' },
  tlMoonWrapActive: {},
  tlMoonGlow: { position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(244,228,188,0.12)' },
  tlDateNum: { fontSize: 10.5, fontWeight: '700', color: 'rgba(244,238,223,0.50)', fontVariant: ['tabular-nums'] },
  tlDateNumActive: { color: '#FFE9A8' },
  tlTodayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#F5D57A', marginTop: 3 },
  tlKeyPhaseDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,233,168,0.65)', marginTop: 3 },
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
  compassDirText: { color: 'rgba(52,211,153,0.70)', fontSize: 10, fontWeight: '700', flexShrink: 1 },
  compassDirTextBad: { color: '#F87171' },
  avoidPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, alignSelf: 'stretch',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.20)',
  },
  avoidPillText: { color: '#F87171', fontSize: 10, fontWeight: '700', flex: 1 },

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
